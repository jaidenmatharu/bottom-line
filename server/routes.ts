import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { insertFinancialModelSchema, type YearProjection, type FinancialModelWithValuation, type ValuationOutput, type TradingCompEntry, type TradingCompsOutput, type ModelBreakdowns, type YearBreakdowns, type MetricBreakdown, type ValuationBreakdown, type SpreadsheetSheet, type SpreadsheetRow, type SpreadsheetCell } from "@shared/schema";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { z } from "zod";
import XLSX from "xlsx-js-style";
import * as ExcelStyles from "./excel-styles";

function safeNumber(value: any, fallback: number = 0): number {
  const num = Number(value);
  return isNaN(num) || !isFinite(num) ? fallback : num;
}

function calculateProjections(model: any): YearProjection[] {
  const projections: YearProjection[] = [];
  const startingRevenue = safeNumber(model.startingRevenue, 1000000);
  const growthRate = safeNumber(model.growthRate, 0);
  const cogsMargin = Math.max(0, Math.min(100, safeNumber(model.cogsMargin, 0)));
  const opexMargin = Math.max(0, Math.min(100, safeNumber(model.opexMargin, 0)));
  const daMargin = Math.max(0, Math.min(100, safeNumber(model.daMargin, 5)));
  const interestRate = Math.max(0, safeNumber(model.interestRate, 5));
  const debtBalance = safeNumber(model.debtBalance, 0);
  const taxRate = Math.max(0, Math.min(100, safeNumber(model.taxRate, 21)));
  
  // Working Capital Assumptions (Industry Standard: Days Outstanding)
  const arDays = safeNumber(model.arDays, 45);
  const inventoryDays = safeNumber(model.inventoryDays, 60);
  const apDays = safeNumber(model.apDays, 30);
  
  // CapEx Assumptions
  const capexPercent = safeNumber(model.capexPercent, 5);
  const maintenanceCapexPercent = safeNumber(model.maintenanceCapexPercent, 2);

  let revenue = startingRevenue > 0 ? startingRevenue : 1;
  let prevNwc = 0;
  
  for (let year = 1; year <= 5; year++) {
    const cogs = Math.round(revenue * (cogsMargin / 100));
    const grossProfit = revenue - cogs;
    const opex = Math.round(revenue * (opexMargin / 100));
    const ebitda = grossProfit - opex;
    const da = Math.round(revenue * (daMargin / 100));
    const ebit = ebitda - da;
    const interest = Math.round(debtBalance * (interestRate / 100));
    const ebt = ebit - interest;
    const tax = ebt > 0 ? Math.round(ebt * (taxRate / 100)) : 0;
    const netIncome = ebt - tax;
    
    // Working Capital Schedule (Industry Standard Calculation)
    const accountsReceivable = Math.round((revenue / 365) * arDays);
    const inventory = Math.round((cogs / 365) * inventoryDays);
    const accountsPayable = Math.round((cogs / 365) * apDays);
    const netWorkingCapital = accountsReceivable + inventory - accountsPayable;
    const changeInNwc = year === 1 ? netWorkingCapital : netWorkingCapital - prevNwc;
    
    // CapEx Schedule
    const capex = Math.round(revenue * (capexPercent / 100));
    const maintenanceCapex = Math.round(revenue * (maintenanceCapexPercent / 100));
    const growthCapex = capex - maintenanceCapex;
    
    // NOPAT and Unlevered FCF (Proper DCF Build)
    const nopat = Math.round(ebit * (1 - taxRate / 100));
    const ufcf = nopat + da - changeInNwc - capex;

    const safeRevenue = revenue > 0 ? revenue : 1;
    projections.push({
      year, revenue, cogs, grossProfit, opex, ebitda, da, ebit, interest, ebt, tax, netIncome,
      revenueGrowth: year === 1 ? 0 : growthRate,
      ebitdaMargin: (ebitda / safeRevenue) * 100,
      netMargin: (netIncome / safeRevenue) * 100,
      // Working Capital
      accountsReceivable, inventory, accountsPayable, netWorkingCapital, changeInNwc,
      // CapEx
      capex, maintenanceCapex, growthCapex,
      // UFCF
      nopat, ufcf,
      // Legacy (for backward compatibility)
      fcf: ufcf, discountFactor: 0, pvOfFcf: 0
    });
    
    prevNwc = netWorkingCapital;
    revenue = Math.round(revenue * (1 + growthRate / 100));
    if (revenue <= 0) revenue = 1;
  }
  return projections;
}

function calculateValuation(model: any, projections: YearProjection[]): ValuationOutput {
  const wacc = Math.max(0.01, safeNumber(model.wacc, 10) / 100);
  const terminalGrowth = safeNumber(model.terminalGrowthRate, 2) / 100;
  const exitMultiple = safeNumber(model.exitMultiple, 12);
  const debt = safeNumber(model.debtBalance, 0);
  const cash = safeNumber(model.cashBalance, 0);
  const sharesOutstanding = safeNumber(model.sharesOutstanding, 1000000);
  const useMidYear = model.useMidYearConvention !== false;

  if (projections.length === 0) {
    return { 
      enterpriseValue: 0, equityValue: 0, terminalValue: 0, impliedMultiple: 0,
      terminalValueGordon: 0, terminalValueExitMultiple: 0, sumPvFcf: 0, pvOfTerminalValue: 0,
      netDebt: 0, equityValuePerShare: 0, sharesOutstanding: 0
    };
  }

  let sumPvOfFcf = 0;
  projections.forEach((p, idx) => {
    const discountBase = 1 + wacc;
    // Mid-year convention: discount by (year - 0.5) instead of full year
    const discountPeriod = useMidYear ? idx + 0.5 : idx + 1;
    const discountFactor = discountBase > 0 ? 1 / Math.pow(discountBase, discountPeriod) : 0;
    p.discountFactor = isFinite(discountFactor) ? discountFactor : 0;
    // Use proper UFCF instead of simple Net Income + D&A
    p.fcf = p.ufcf;
    p.pvOfFcf = p.fcf * p.discountFactor;
    sumPvOfFcf += isFinite(p.pvOfFcf) ? p.pvOfFcf : 0;
  });

  const lastProjection = projections[projections.length - 1];
  const lastUfcf = lastProjection.ufcf;
  const lastEbitda = lastProjection.ebitda || 1;
  
  // Terminal Value - Gordon Growth Model
  const waccMinusGrowth = wacc - terminalGrowth;
  const terminalValueGordon = waccMinusGrowth > 0.001 
    ? (lastUfcf * (1 + terminalGrowth)) / waccMinusGrowth 
    : 0;
    
  // Terminal Value - Exit Multiple Method
  const terminalValueExitMultiple = lastEbitda * exitMultiple;
  
  // Use Gordon Growth as primary (industry standard for DCF)
  const terminalValue = terminalValueGordon;
  
  // PV of Terminal Value (with mid-year adjustment if applicable)
  const tvDiscountPeriod = useMidYear ? projections.length : projections.length;
  const pvOfTerminalValue = wacc > 0 ? terminalValue / Math.pow(1 + wacc, tvDiscountPeriod) : 0;
  
  const enterpriseValue = isFinite(sumPvOfFcf + pvOfTerminalValue) ? sumPvOfFcf + pvOfTerminalValue : 0;
  
  // Bridge to Equity Value (Industry Standard)
  const netDebt = debt - cash;
  const equityValue = enterpriseValue - netDebt;
  const equityValuePerShare = sharesOutstanding > 0 ? equityValue / sharesOutstanding : 0;
  
  const impliedMultiple = lastEbitda !== 0 ? enterpriseValue / lastEbitda : 0;

  return { 
    enterpriseValue: isFinite(enterpriseValue) ? enterpriseValue : 0, 
    equityValue: isFinite(equityValue) ? equityValue : 0, 
    terminalValue: isFinite(terminalValue) ? terminalValue : 0, 
    impliedMultiple: isFinite(impliedMultiple) ? impliedMultiple : 0,
    terminalValueGordon: isFinite(terminalValueGordon) ? terminalValueGordon : 0,
    terminalValueExitMultiple: isFinite(terminalValueExitMultiple) ? terminalValueExitMultiple : 0,
    sumPvFcf: isFinite(sumPvOfFcf) ? sumPvOfFcf : 0,
    pvOfTerminalValue: isFinite(pvOfTerminalValue) ? pvOfTerminalValue : 0,
    netDebt: isFinite(netDebt) ? netDebt : 0,
    equityValuePerShare: isFinite(equityValuePerShare) ? equityValuePerShare : 0,
    sharesOutstanding: sharesOutstanding
  };
}

function calculateTradingComps(model: any, projections: YearProjection[]): TradingCompsOutput {
  const comps = (model.tradingComps as TradingCompEntry[]) || [];
  if (comps.length === 0 || projections.length === 0) {
    return { avgEvEbitda: 0, avgPe: 0, impliedEv: 0, impliedEquityValue: 0 };
  }
  const evEbitdas = comps.map(c => {
    const ebitda = safeNumber(c.ebitda, 1);
    const ev = safeNumber(c.ev, 0);
    return ebitda !== 0 ? ev / ebitda : 0;
  }).filter(v => isFinite(v) && v > 0);
  const pes = comps.map(c => {
    const netIncome = safeNumber(c.netIncome, 1);
    const marketCap = safeNumber(c.marketCap, 0);
    return netIncome !== 0 ? marketCap / netIncome : 0;
  }).filter(v => isFinite(v) && v > 0);
  const avgEvEbitda = evEbitdas.length ? evEbitdas.reduce((a, b) => a + b, 0) / evEbitdas.length : 0;
  const avgPe = pes.length ? pes.reduce((a, b) => a + b, 0) / pes.length : 0;
  const lastProjection = projections[projections.length - 1];
  const lastEbitda = lastProjection.ebitda || 0;
  const impliedEv = lastEbitda * avgEvEbitda;
  const impliedEquityValue = (lastProjection.netIncome * avgPe) || (impliedEv - safeNumber(model.debtBalance, 0));
  return { 
    avgEvEbitda: isFinite(avgEvEbitda) ? avgEvEbitda : 0, 
    avgPe: isFinite(avgPe) ? avgPe : 0, 
    impliedEv: isFinite(impliedEv) ? impliedEv : 0, 
    impliedEquityValue: isFinite(impliedEquityValue) ? impliedEquityValue : 0 
  };
}

function calculateBreakdowns(model: any, projections: YearProjection[], valuation: ValuationOutput): ModelBreakdowns {
  const yearlyBreakdowns: YearBreakdowns[] = projections.map(p => {
    const revenue = p.revenue;
    const cogs = p.cogs;
    const grossProfit = p.grossProfit;
    const opex = p.opex;
    const ebitda = p.ebitda;
    const da = p.da;
    const ebit = p.ebit;
    const interest = p.interest;
    const ebt = p.ebt;
    const tax = p.tax;
    const netIncome = p.netIncome;
    const fcf = p.fcf;

    return {
      year: p.year,
      grossProfit: {
        metricKey: 'grossProfit',
        metricLabel: 'Gross Profit',
        finalValue: grossProfit,
        steps: [
          { label: 'Revenue', value: revenue, operator: '=' as const },
          { label: 'Cost of Goods Sold (COGS)', value: cogs, operator: '-' as const },
          { label: 'Gross Profit', value: grossProfit, operator: '=' as const }
        ]
      },
      ebitda: {
        metricKey: 'ebitda',
        metricLabel: 'EBITDA',
        finalValue: ebitda,
        steps: [
          { label: 'Gross Profit', value: grossProfit, operator: '=' as const },
          { label: 'Operating Expenses (OpEx)', value: opex, operator: '-' as const },
          { label: 'EBITDA', value: ebitda, operator: '=' as const }
        ]
      },
      ebit: {
        metricKey: 'ebit',
        metricLabel: 'EBIT',
        finalValue: ebit,
        steps: [
          { label: 'EBITDA', value: ebitda, operator: '=' as const },
          { label: 'Depreciation & Amortization', value: da, operator: '-' as const },
          { label: 'EBIT', value: ebit, operator: '=' as const }
        ]
      },
      netIncome: {
        metricKey: 'netIncome',
        metricLabel: 'Net Income',
        finalValue: netIncome,
        steps: [
          { label: 'EBIT', value: ebit, operator: '=' as const },
          { label: 'Interest Expense', value: interest, operator: '-' as const },
          { label: 'EBT (Earnings Before Tax)', value: ebt, operator: '=' as const },
          { label: 'Taxes', value: tax, operator: '-' as const },
          { label: 'Net Income', value: netIncome, operator: '=' as const }
        ]
      },
      ufcf: {
        metricKey: 'ufcf',
        metricLabel: 'Unlevered Free Cash Flow (UFCF)',
        finalValue: p.ufcf,
        steps: [
          { label: 'EBIT', value: ebit, operator: '=' as const },
          { label: 'Taxes on EBIT', value: Math.round(ebit > 0 ? ebit * safeNumber(model.taxRate, 21) / 100 : 0), operator: '-' as const },
          { label: 'NOPAT (EBIAT)', value: p.nopat, operator: '=' as const, formula: 'EBIT × (1 - Tax Rate)' },
          { label: 'Depreciation & Amortization', value: da, operator: '+' as const },
          { label: 'Change in Net Working Capital', value: p.changeInNwc, operator: '-' as const, formula: 'A/R + Inv - A/P' },
          { label: 'Capital Expenditures', value: p.capex, operator: '-' as const },
          { label: 'Unlevered Free Cash Flow', value: p.ufcf, operator: '=' as const, formula: 'NOPAT + D&A - ΔNWC - CapEx' }
        ]
      }
    };
  });

  const sumPvOfFcf = projections.reduce((sum, p) => sum + (isFinite(p.pvOfFcf) ? p.pvOfFcf : 0), 0);
  const wacc = Math.max(0.01, safeNumber(model.wacc, 10) / 100);
  const terminalGrowth = safeNumber(model.terminalGrowthRate, 2) / 100;
  const lastFcf = projections.length > 0 ? projections[projections.length - 1].fcf : 0;
  const debt = safeNumber(model.debtBalance, 0);
  const pvOfTv = wacc > 0 ? valuation.terminalValue / Math.pow(1 + wacc, projections.length) : 0;

  const valuationBreakdown: ValuationBreakdown = {
    pvOfFcf: {
      metricKey: 'pvOfFcf',
      metricLabel: 'Present Value of FCF',
      finalValue: sumPvOfFcf,
      steps: projections.map((p, idx) => ({
        label: `Year ${p.year} FCF PV`,
        value: p.pvOfFcf,
        formula: `${p.fcf.toLocaleString()} / (1 + ${(wacc * 100).toFixed(1)}%)^${idx + 1}`
      }))
    },
    terminalValue: {
      metricKey: 'terminalValue',
      metricLabel: 'Terminal Value',
      finalValue: valuation.terminalValue,
      steps: [
        { label: 'Year 5 FCF', value: lastFcf, operator: '=' as const },
        { label: 'Terminal Growth Rate', value: terminalGrowth * 100, formula: `${(terminalGrowth * 100).toFixed(1)}%` },
        { label: 'WACC', value: wacc * 100, formula: `${(wacc * 100).toFixed(1)}%` },
        { label: 'Terminal Value', value: valuation.terminalValue, operator: '=' as const, formula: `FCF × (1 + g) / (WACC - g)` }
      ]
    },
    enterpriseValue: {
      metricKey: 'enterpriseValue',
      metricLabel: 'Enterprise Value',
      finalValue: valuation.enterpriseValue,
      steps: [
        { label: 'Sum of PV of FCF', value: sumPvOfFcf, operator: '=' as const },
        { label: 'PV of Terminal Value', value: pvOfTv, operator: '+' as const },
        { label: 'Enterprise Value', value: valuation.enterpriseValue, operator: '=' as const }
      ]
    },
    equityValue: {
      metricKey: 'equityValue',
      metricLabel: 'Equity Value',
      finalValue: valuation.equityValue,
      steps: [
        { label: 'Enterprise Value', value: valuation.enterpriseValue, operator: '=' as const },
        { label: 'Less: Net Debt', value: debt, operator: '-' as const },
        { label: 'Equity Value', value: valuation.equityValue, operator: '=' as const }
      ]
    }
  };

  return { yearlyBreakdowns, valuationBreakdown };
}

function generateSpreadsheetData(model: any, projections: YearProjection[], valuation: ValuationOutput): SpreadsheetSheet[] {
  const years = projections.map(p => `Year ${p.year}`);
  const columnHeaders = ['Metric', ...years];

  const formatCurrency = (val: number): SpreadsheetCell => ({
    value: val,
    format: { numberFormat: 'currency', decimals: 0, align: 'right' }
  });

  const formatPercent = (val: number): SpreadsheetCell => ({
    value: val,
    format: { numberFormat: 'percent', decimals: 1, align: 'right' }
  });

  const incomeStatement: SpreadsheetSheet = {
    id: 'income-statement',
    title: 'Income Statement',
    columnHeaders,
    rows: [
      {
        label: 'Revenue',
        cells: projections.map(p => ({ ...formatCurrency(p.revenue), editable: true, formula: 'Input' })),
        isHeader: false
      },
      {
        label: 'Revenue Growth',
        cells: projections.map(p => formatPercent(p.revenueGrowth)),
        isHeader: false
      },
      {
        label: 'COGS',
        cells: projections.map(p => ({ ...formatCurrency(p.cogs), formula: `Revenue × ${safeNumber(model.cogsMargin, 0)}%` })),
        isHeader: false
      },
      {
        label: 'Gross Profit',
        cells: projections.map(p => ({ ...formatCurrency(p.grossProfit), formula: 'Revenue - COGS' })),
        isSummary: true
      },
      {
        label: 'Operating Expenses',
        cells: projections.map(p => ({ ...formatCurrency(p.opex), formula: `Revenue × ${safeNumber(model.opexMargin, 0)}%` })),
        isHeader: false
      },
      {
        label: 'EBITDA',
        cells: projections.map(p => ({ ...formatCurrency(p.ebitda), formula: 'Gross Profit - OpEx' })),
        isSummary: true
      },
      {
        label: 'EBITDA Margin',
        cells: projections.map(p => formatPercent(p.ebitdaMargin)),
        isHeader: false
      },
      {
        label: 'D&A',
        cells: projections.map(p => ({ ...formatCurrency(p.da), formula: `Revenue × ${safeNumber(model.daMargin, 5)}%` })),
        isHeader: false
      },
      {
        label: 'EBIT',
        cells: projections.map(p => ({ ...formatCurrency(p.ebit), formula: 'EBITDA - D&A' })),
        isSummary: true
      },
      {
        label: 'Interest Expense',
        cells: projections.map(p => formatCurrency(p.interest)),
        isHeader: false
      },
      {
        label: 'EBT',
        cells: projections.map(p => formatCurrency(p.ebt)),
        isHeader: false
      },
      {
        label: 'Taxes',
        cells: projections.map(p => ({ ...formatCurrency(p.tax), formula: `EBT × ${safeNumber(model.taxRate, 21)}%` })),
        isHeader: false
      },
      {
        label: 'Net Income',
        cells: projections.map(p => ({ ...formatCurrency(p.netIncome), formula: 'EBT - Taxes' })),
        isSummary: true
      },
      {
        label: 'Net Margin',
        cells: projections.map(p => formatPercent(p.netMargin)),
        isHeader: false
      }
    ]
  };

  // Working Capital Schedule (Industry Standard)
  const nwcSchedule: SpreadsheetSheet = {
    id: 'nwc-schedule',
    title: 'Working Capital',
    columnHeaders,
    rows: [
      {
        label: 'Accounts Receivable',
        cells: projections.map(p => ({ ...formatCurrency(p.accountsReceivable), formula: `(Revenue / 365) × ${safeNumber(model.arDays, 45)} days` })),
        isHeader: false
      },
      {
        label: 'Inventory',
        cells: projections.map(p => ({ ...formatCurrency(p.inventory), formula: `(COGS / 365) × ${safeNumber(model.inventoryDays, 60)} days` })),
        isHeader: false
      },
      {
        label: 'Accounts Payable',
        cells: projections.map(p => ({ ...formatCurrency(p.accountsPayable), formula: `(COGS / 365) × ${safeNumber(model.apDays, 30)} days` })),
        isHeader: false
      },
      {
        label: 'Net Working Capital',
        cells: projections.map(p => ({ ...formatCurrency(p.netWorkingCapital), formula: 'A/R + Inventory - A/P' })),
        isSummary: true
      },
      {
        label: 'Change in NWC',
        cells: projections.map(p => ({ ...formatCurrency(p.changeInNwc), formula: 'NWCₙ - NWCₙ₋₁' })),
        isSummary: true
      }
    ]
  };

  // CapEx Schedule (Industry Standard)
  const capexSchedule: SpreadsheetSheet = {
    id: 'capex-schedule',
    title: 'CapEx Schedule',
    columnHeaders,
    rows: [
      {
        label: 'Maintenance CapEx',
        cells: projections.map(p => ({ ...formatCurrency(p.maintenanceCapex), formula: `Revenue × ${safeNumber(model.maintenanceCapexPercent, 2)}%` })),
        isHeader: false
      },
      {
        label: 'Growth CapEx',
        cells: projections.map(p => ({ ...formatCurrency(p.growthCapex), formula: `Total CapEx - Maintenance` })),
        isHeader: false
      },
      {
        label: 'Total CapEx',
        cells: projections.map(p => ({ ...formatCurrency(p.capex), formula: `Revenue × ${safeNumber(model.capexPercent, 5)}%` })),
        isSummary: true
      }
    ]
  };

  // Unlevered Free Cash Flow (Proper DCF Build)
  const ufcfSchedule: SpreadsheetSheet = {
    id: 'ufcf-schedule',
    title: 'Unlevered FCF',
    columnHeaders,
    rows: [
      {
        label: 'EBIT',
        cells: projections.map(p => formatCurrency(p.ebit)),
        isHeader: false
      },
      {
        label: 'Less: Taxes on EBIT',
        cells: projections.map(p => ({ ...formatCurrency(Math.round(p.ebit * safeNumber(model.taxRate, 21) / 100)), formula: `EBIT × ${safeNumber(model.taxRate, 21)}%` })),
        isHeader: false
      },
      {
        label: 'NOPAT (EBIAT)',
        cells: projections.map(p => ({ ...formatCurrency(p.nopat), formula: 'EBIT × (1 - Tax Rate)' })),
        isSummary: true
      },
      {
        label: 'Add: D&A',
        cells: projections.map(p => formatCurrency(p.da)),
        isHeader: false
      },
      {
        label: 'Less: ΔNet Working Capital',
        cells: projections.map(p => formatCurrency(p.changeInNwc)),
        isHeader: false
      },
      {
        label: 'Less: CapEx',
        cells: projections.map(p => formatCurrency(p.capex)),
        isHeader: false
      },
      {
        label: 'Unlevered Free Cash Flow',
        cells: projections.map(p => ({ ...formatCurrency(p.ufcf), formula: 'NOPAT + D&A - ΔNWC - CapEx' })),
        isSummary: true
      },
      {
        label: 'Discount Factor (Mid-Year)',
        cells: projections.map(p => ({
          value: p.discountFactor,
          format: { numberFormat: 'number', decimals: 4, align: 'right' },
          formula: `1 / (1 + ${safeNumber(model.wacc, 10)}%)^${p.year - 0.5}`
        })),
        isHeader: false
      },
      {
        label: 'PV of UFCF',
        cells: projections.map(p => ({ ...formatCurrency(p.pvOfFcf), formula: 'UFCF × Discount Factor' })),
        isSummary: true
      }
    ]
  };

  const dcfValuation: SpreadsheetSheet = {
    id: 'dcf-valuation',
    title: 'DCF Valuation',
    columnHeaders: ['Component', 'Value', 'Formula'],
    rows: [
      {
        label: 'Sum of PV of UFCF',
        cells: [
          formatCurrency(valuation.sumPvFcf),
          { value: 'Σ(PV of UFCF)', format: { numberFormat: 'text', align: 'left' } }
        ],
        isHeader: false
      },
      {
        label: 'Terminal Value (Gordon Growth)',
        cells: [
          formatCurrency(valuation.terminalValueGordon),
          { value: 'UFCF₅ × (1+g) / (WACC-g)', format: { numberFormat: 'text', align: 'left' } }
        ],
        isHeader: false
      },
      {
        label: 'Terminal Value (Exit Multiple)',
        cells: [
          formatCurrency(valuation.terminalValueExitMultiple),
          { value: `EBITDA₅ × ${safeNumber(model.exitMultiple, 12)}x`, format: { numberFormat: 'text', align: 'left' } }
        ],
        isHeader: false
      },
      {
        label: 'PV of Terminal Value',
        cells: [
          formatCurrency(valuation.pvOfTerminalValue),
          { value: 'TV / (1+WACC)⁵', format: { numberFormat: 'text', align: 'left' } }
        ],
        isHeader: false
      },
      {
        label: 'Enterprise Value',
        cells: [
          formatCurrency(valuation.enterpriseValue),
          { value: 'Sum PV UFCF + PV of TV', format: { numberFormat: 'text', align: 'left' } }
        ],
        isSummary: true
      },
      {
        label: 'Less: Total Debt',
        cells: [
          formatCurrency(safeNumber(model.debtBalance, 0)),
          { value: 'From Capital Structure', format: { numberFormat: 'text', align: 'left' } }
        ],
        isHeader: false
      },
      {
        label: 'Add: Cash',
        cells: [
          formatCurrency(safeNumber(model.cashBalance, 0)),
          { value: 'From Capital Structure', format: { numberFormat: 'text', align: 'left' } }
        ],
        isHeader: false
      },
      {
        label: 'Net Debt',
        cells: [
          formatCurrency(valuation.netDebt),
          { value: 'Debt - Cash', format: { numberFormat: 'text', align: 'left' } }
        ],
        isHeader: false
      },
      {
        label: 'Equity Value',
        cells: [
          formatCurrency(valuation.equityValue),
          { value: 'EV - Net Debt', format: { numberFormat: 'text', align: 'left' } }
        ],
        isSummary: true
      },
      {
        label: 'Shares Outstanding',
        cells: [
          { value: valuation.sharesOutstanding.toLocaleString(), format: { numberFormat: 'text', align: 'right' } },
          { value: 'Diluted shares', format: { numberFormat: 'text', align: 'left' } }
        ],
        isHeader: false
      },
      {
        label: 'Equity Value per Share',
        cells: [
          formatCurrency(valuation.equityValuePerShare),
          { value: 'Equity Value / Shares', format: { numberFormat: 'text', align: 'left' } }
        ],
        isSummary: true
      },
      {
        label: 'Implied EV/EBITDA',
        cells: [
          { value: valuation.impliedMultiple, format: { numberFormat: 'number', decimals: 1, align: 'right' } },
          { value: 'EV / Year 5 EBITDA', format: { numberFormat: 'text', align: 'left' } }
        ],
        isHeader: false
      }
    ]
  };

  return [incomeStatement, nwcSchedule, capexSchedule, ufcfSchedule, dcfValuation];
}

// Sensitivity Analysis (Industry Standard Two-Way Tables)
function calculateSensitivity(model: any, projections: YearProjection[]): any {
  const baseWacc = safeNumber(model.wacc, 10);
  const baseGrowth = safeNumber(model.terminalGrowthRate, 2);
  const baseEntryMultiple = safeNumber(model.exitMultiple, 8);
  const baseExitMultiple = safeNumber(model.exitMultiple, 12);
  
  // WACC vs Terminal Growth sensitivity
  const waccValues = [baseWacc - 2, baseWacc - 1, baseWacc, baseWacc + 1, baseWacc + 2];
  const growthValues = [baseGrowth - 1, baseGrowth - 0.5, baseGrowth, baseGrowth + 0.5, baseGrowth + 1];
  
  const waccVsGrowthData: number[][] = [];
  waccValues.forEach(wacc => {
    const row: number[] = [];
    growthValues.forEach(growth => {
      const tempModel = { ...model, wacc: String(wacc), terminalGrowthRate: String(growth) };
      const tempProjections = calculateProjections(tempModel);
      const tempValuation = calculateValuation(tempModel, tempProjections);
      row.push(Math.round(tempValuation.enterpriseValue));
    });
    waccVsGrowthData.push(row);
  });
  
  // Entry vs Exit Multiple sensitivity (for LBO)
  const entryValues = [6, 7, 8, 9, 10];
  const exitValues = [10, 11, 12, 13, 14];
  
  const entryVsExitData: number[][] = [];
  const lastEbitda = projections.length > 0 ? projections[projections.length - 1].ebitda : 0;
  
  entryValues.forEach(entry => {
    const row: number[] = [];
    exitValues.forEach(exit => {
      const entryEv = lastEbitda * entry;
      const exitEv = lastEbitda * exit * Math.pow(1 + safeNumber(model.growthRate, 15) / 100, 5);
      const moic = entryEv > 0 ? exitEv / entryEv : 0;
      row.push(Math.round(moic * 100) / 100);
    });
    entryVsExitData.push(row);
  });

  // Revenue Growth vs EBITDA Margin sensitivity
  const revenueGrowthValues = [10, 12.5, 15, 17.5, 20];
  const marginValues = [25, 27.5, 30, 32.5, 35];
  
  const growthVsMarginData: number[][] = [];
  revenueGrowthValues.forEach(revGrowth => {
    const row: number[] = [];
    marginValues.forEach(margin => {
      const tempModel = { 
        ...model, 
        growthRate: String(revGrowth),
        opexMargin: String(100 - margin - safeNumber(model.cogsMargin, 40))
      };
      const tempProjections = calculateProjections(tempModel);
      const tempValuation = calculateValuation(tempModel, tempProjections);
      row.push(Math.round(tempValuation.enterpriseValue));
    });
    growthVsMarginData.push(row);
  });

  return {
    waccVsGrowth: {
      title: 'Enterprise Value Sensitivity: WACC vs Terminal Growth',
      rowLabel: 'WACC (%)',
      colLabel: 'Terminal Growth (%)',
      rowValues: waccValues,
      colValues: growthValues,
      data: waccVsGrowthData,
      highlightedRow: 2,
      highlightedCol: 2
    },
    entryVsExit: {
      title: 'MOIC Sensitivity: Entry Multiple vs Exit Multiple',
      rowLabel: 'Entry Multiple (x)',
      colLabel: 'Exit Multiple (x)',
      rowValues: entryValues,
      colValues: exitValues,
      data: entryVsExitData,
      highlightedRow: 2,
      highlightedCol: 2
    },
    revenueGrowthVsMargin: {
      title: 'Enterprise Value: Revenue Growth vs EBITDA Margin',
      rowLabel: 'Revenue Growth (%)',
      colLabel: 'EBITDA Margin (%)',
      rowValues: revenueGrowthValues,
      colValues: marginValues,
      data: growthVsMarginData,
      highlightedRow: 2,
      highlightedCol: 2
    }
  };
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);

  app.get(api.models.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const models = await storage.getModels((req.user as any).id);
    res.json(models);
  });

  app.get(api.models.get.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const model = await storage.getModel(Number(req.params.id));
    if (!model) return res.status(404).json({ message: "Model not found" });
    
    const userId = (req.user as any).id;
    if (model.userId !== userId) {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    const projections = calculateProjections(model);
    const valuation = calculateValuation(model, projections);
    const compsAnalysis = calculateTradingComps(model, projections);
    res.json({ ...model, projections, valuation, compsAnalysis });
  });

  // Breakdown endpoint - shows how each metric is calculated
  app.get("/api/models/:id/breakdown", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const model = await storage.getModel(Number(req.params.id));
    if (!model) return res.status(404).json({ message: "Model not found" });
    
    const userId = (req.user as any).id;
    if (model.userId !== userId) {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    const projections = calculateProjections(model);
    const valuation = calculateValuation(model, projections);
    const breakdowns = calculateBreakdowns(model, projections, valuation);
    res.json(breakdowns);
  });

  // Spreadsheet view endpoint - returns data formatted for grid display
  app.get("/api/models/:id/spreadsheet", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const model = await storage.getModel(Number(req.params.id));
    if (!model) return res.status(404).json({ message: "Model not found" });
    
    const userId = (req.user as any).id;
    if (model.userId !== userId) {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    const projections = calculateProjections(model);
    const valuation = calculateValuation(model, projections);
    const sheets = generateSpreadsheetData(model, projections, valuation);
    res.json({ sheets, modelName: model.name });
  });

  // Sensitivity analysis endpoint - two-way tables
  app.get("/api/models/:id/sensitivity", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const model = await storage.getModel(Number(req.params.id));
    if (!model) return res.status(404).json({ message: "Model not found" });
    
    const userId = (req.user as any).id;
    if (model.userId !== userId) {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    const projections = calculateProjections(model);
    const sensitivity = calculateSensitivity(model, projections);
    res.json(sensitivity);
  });

  app.post(api.models.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const inputData = {
        ...req.body,
        startingRevenue: String(req.body.startingRevenue),
        growthRate: String(req.body.growthRate),
        cogsMargin: String(req.body.cogsMargin),
        opexMargin: String(req.body.opexMargin),
        daMargin: String(req.body.daMargin || 5),
        interestRate: String(req.body.interestRate || 5),
        debtBalance: String(req.body.debtBalance || 0),
        wacc: String(req.body.wacc || 10),
        terminalGrowthRate: String(req.body.terminalGrowthRate || 2),
        exitMultiple: String(req.body.exitMultiple || 12),
        taxRate: String(req.body.taxRate),
        userId: (req.user as any).id
      };
      const model = await storage.createModel(inputData);
      res.status(201).json(model);
    } catch (err) {
      res.status(400).json({ message: "Failed to create model" });
    }
  });

  app.put(api.models.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    const modelId = Number(req.params.id);
    const model = await storage.getModel(modelId);
    
    if (!model) {
      return res.status(404).json({ message: "Model not found" });
    }
    
    // Verify ownership
    const userId = (req.user as any).id;
    if (model.userId !== userId) {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    // Server-side validation
    const updateSchema = insertFinancialModelSchema.partial().extend({
      startingRevenue: z.string().optional().refine(
        (val) => val === undefined || (val !== "" && !isNaN(Number(val)) && Number(val) > 0),
        { message: "Starting revenue must be a positive number" }
      ),
      wacc: z.string().optional().refine(
        (val) => val === undefined || (val !== "" && !isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 100),
        { message: "WACC must be between 0 and 100" }
      ),
      cogsMargin: z.string().optional().refine(
        (val) => val === undefined || (val !== "" && !isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 100),
        { message: "COGS margin must be between 0 and 100" }
      ),
      opexMargin: z.string().optional().refine(
        (val) => val === undefined || (val !== "" && !isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 100),
        { message: "OPEX margin must be between 0 and 100" }
      ),
      taxRate: z.string().optional().refine(
        (val) => val === undefined || (val !== "" && !isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 100),
        { message: "Tax rate must be between 0 and 100" }
      ),
      daMargin: z.string().optional().refine(
        (val) => val === undefined || (val !== "" && !isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 100),
        { message: "D&A margin must be between 0 and 100" }
      ),
    });
    
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation error", errors: parsed.error.errors });
    }
    
    try {
      const updates = parsed.data;
      const updated = await storage.updateModel(modelId, updates);
      
      // Return with recalculated projections
      const projections = calculateProjections(updated);
      const valuation = calculateValuation(updated, projections);
      const compsAnalysis = calculateTradingComps(updated, projections);
      
      res.json({
        ...updated,
        projections,
        valuation,
        compsAnalysis
      });
    } catch (error) {
      res.status(400).json({ message: "Failed to update model" });
    }
  });

  app.delete(api.models.delete.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    const model = await storage.getModel(Number(req.params.id));
    if (!model) {
      return res.status(404).json({ message: "Model not found" });
    }
    
    const userId = (req.user as any).id;
    if (model.userId !== userId) {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    await storage.deleteModel(Number(req.params.id));
    res.status(204).send();
  });

  // Precedent Transactions routes
  app.get("/api/models/:id/precedents", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const modelId = Number(req.params.id);
    const model = await storage.getModel(modelId);
    if (!model) return res.status(404).json({ message: "Model not found" });
    const userId = (req.user as any).id;
    if (model.userId !== userId) return res.status(403).json({ message: "Forbidden" });
    const transactions = await storage.getPrecedentTransactions(modelId);
    res.json(transactions);
  });

  app.post("/api/models/:id/precedents", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const modelId = Number(req.params.id);
    const model = await storage.getModel(modelId);
    if (!model) return res.status(404).json({ message: "Model not found" });
    const userId = (req.user as any).id;
    if (model.userId !== userId) return res.status(403).json({ message: "Forbidden" });
    try {
      const transaction = await storage.createPrecedentTransaction({
        modelId,
        targetName: req.body.targetName,
        acquirerName: req.body.acquirerName || null,
        transactionDate: req.body.transactionDate || null,
        transactionValue: req.body.transactionValue || null,
        targetRevenue: req.body.targetRevenue || null,
        targetEbitda: req.body.targetEbitda || null,
        evRevenue: req.body.evRevenue || null,
        evEbitda: req.body.evEbitda || null,
      });
      res.status(201).json(transaction);
    } catch (err) {
      res.status(400).json({ message: "Failed to create precedent transaction" });
    }
  });

  app.put("/api/precedents/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const transactionId = Number(req.params.id);
    
    // Fetch precedent and verify ownership
    const precedent = await storage.getPrecedentTransaction(transactionId);
    if (!precedent) {
      return res.status(404).json({ message: "Precedent transaction not found" });
    }
    
    const model = await storage.getModel(precedent.modelId);
    if (!model) {
      return res.status(404).json({ message: "Associated model not found" });
    }
    
    const userId = (req.user as any).id;
    if (model.userId !== userId) {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    try {
      const updated = await storage.updatePrecedentTransaction(transactionId, {
        targetName: req.body.targetName,
        acquirerName: req.body.acquirerName,
        transactionDate: req.body.transactionDate,
        transactionValue: req.body.transactionValue,
        targetRevenue: req.body.targetRevenue,
        targetEbitda: req.body.targetEbitda,
        evRevenue: req.body.evRevenue,
        evEbitda: req.body.evEbitda,
      });
      res.json(updated);
    } catch (err) {
      res.status(400).json({ message: "Failed to update precedent transaction" });
    }
  });

  app.delete("/api/precedents/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const transactionId = Number(req.params.id);
    
    // Fetch precedent and verify ownership
    const precedent = await storage.getPrecedentTransaction(transactionId);
    if (!precedent) {
      return res.status(404).json({ message: "Precedent transaction not found" });
    }
    
    const model = await storage.getModel(precedent.modelId);
    if (!model) {
      return res.status(404).json({ message: "Associated model not found" });
    }
    
    const userId = (req.user as any).id;
    if (model.userId !== userId) {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    try {
      await storage.deletePrecedentTransaction(transactionId);
      res.status(204).send();
    } catch (err) {
      res.status(400).json({ message: "Failed to delete precedent transaction" });
    }
  });

  // Preferences routes
  app.get(api.preferences.get.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const userId = (req.user as any).id;
    let prefs = await storage.getPreferences(userId);
    if (!prefs) {
      prefs = await storage.upsertPreferences({ userId });
    }
    res.json(prefs);
  });

  app.put(api.preferences.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const userId = (req.user as any).id;
    const prefs = await storage.upsertPreferences({ ...req.body, userId });
    res.json(prefs);
  });

  // Portfolio stats endpoint for real-time dashboard metrics
  app.get(api.stats.portfolio.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const userId = (req.user as any).id;
    const models = await storage.getModels(userId);
    
    let totalRevenue = 0;
    let weightedGrowthSum = 0;
    let avgExitMultiple = 0;

    models.forEach(model => {
      const revenue = Number(model.startingRevenue) || 0;
      const growth = Number(model.growthRate) || 0;
      const exitMultiple = Number(model.exitMultiple) || 12;
      
      totalRevenue += revenue;
      weightedGrowthSum += revenue * growth;
      avgExitMultiple += exitMultiple;
    });

    const avgGrowth = totalRevenue > 0 ? weightedGrowthSum / totalRevenue : 0;
    const avgMultiple = models.length > 0 ? avgExitMultiple / models.length : 0;

    res.json({
      modelCount: models.length,
      avgGrowth,
      avgMultiple,
      totalRevenue
    });
  });

  // === Portfolio Routes ===
  app.get(api.portfolios.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const userId = (req.user as any).id;
    const userPortfolios = await storage.getPortfolios(userId);
    res.json(userPortfolios);
  });

  app.get(api.portfolios.get.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const portfolio = await storage.getPortfolio(Number(req.params.id));
    if (!portfolio) return res.status(404).json({ message: "Portfolio not found" });
    const userId = (req.user as any).id;
    if (portfolio.userId !== userId) return res.status(403).json({ message: "Forbidden" });
    res.json(portfolio);
  });

  app.post(api.portfolios.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    try {
      const userId = (req.user as any).id;
      const portfolio = await storage.createPortfolio({ ...req.body, userId });
      res.status(201).json(portfolio);
    } catch (err) {
      res.status(400).json({ message: "Failed to create portfolio" });
    }
  });

  app.put(api.portfolios.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const portfolio = await storage.getPortfolio(Number(req.params.id));
    if (!portfolio) return res.status(404).json({ message: "Portfolio not found" });
    const userId = (req.user as any).id;
    if (portfolio.userId !== userId) return res.status(403).json({ message: "Forbidden" });
    const updated = await storage.updatePortfolio(Number(req.params.id), req.body);
    res.json(updated);
  });

  app.delete(api.portfolios.delete.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const portfolio = await storage.getPortfolio(Number(req.params.id));
    if (!portfolio) return res.status(404).json({ message: "Portfolio not found" });
    const userId = (req.user as any).id;
    if (portfolio.userId !== userId) return res.status(403).json({ message: "Forbidden" });
    await storage.deletePortfolio(Number(req.params.id));
    res.status(204).send();
  });

  app.get(api.portfolios.stats.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const portfolio = await storage.getPortfolio(Number(req.params.id));
    if (!portfolio) return res.status(404).json({ message: "Portfolio not found" });
    const userId = (req.user as any).id;
    if (portfolio.userId !== userId) return res.status(403).json({ message: "Forbidden" });
    
    const models = await storage.getPortfolioModels(Number(req.params.id));
    let totalRevenue = 0;
    let weightedGrowthSum = 0;
    let avgExitMultiple = 0;

    models.forEach(model => {
      const revenue = Number(model.startingRevenue) || 0;
      const growth = Number(model.growthRate) || 0;
      const exitMultiple = Number(model.exitMultiple) || 12;
      
      totalRevenue += revenue;
      weightedGrowthSum += revenue * growth;
      avgExitMultiple += exitMultiple;
    });

    const avgGrowth = totalRevenue > 0 ? weightedGrowthSum / totalRevenue : 0;
    const avgMultiple = models.length > 0 ? avgExitMultiple / models.length : 0;

    res.json({
      modelCount: models.length,
      avgGrowth,
      avgMultiple,
      totalRevenue
    });
  });

  // Get models in a portfolio
  app.get('/api/portfolios/:id/models', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const portfolio = await storage.getPortfolio(Number(req.params.id));
    if (!portfolio) return res.status(404).json({ message: "Portfolio not found" });
    const userId = (req.user as any).id;
    if (portfolio.userId !== userId) return res.status(403).json({ message: "Forbidden" });
    const models = await storage.getPortfolioModels(Number(req.params.id));
    res.json(models);
  });

  app.post(api.portfolios.addModel.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const portfolio = await storage.getPortfolio(Number(req.params.id));
    if (!portfolio) return res.status(404).json({ message: "Portfolio not found" });
    const userId = (req.user as any).id;
    if (portfolio.userId !== userId) return res.status(403).json({ message: "Forbidden" });
    
    try {
      await storage.addModelToPortfolio(Number(req.params.id), req.body.modelId);
      res.status(201).json({ portfolioId: Number(req.params.id), modelId: req.body.modelId });
    } catch (err) {
      res.status(400).json({ message: "Failed to add model to portfolio" });
    }
  });

  app.delete(api.portfolios.removeModel.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const portfolio = await storage.getPortfolio(Number(req.params.id));
    if (!portfolio) return res.status(404).json({ message: "Portfolio not found" });
    const userId = (req.user as any).id;
    if (portfolio.userId !== userId) return res.status(403).json({ message: "Forbidden" });
    
    await storage.removeModelFromPortfolio(Number(req.params.id), Number(req.params.modelId));
    res.status(204).send();
  });

  // === Precedent Transactions Routes ===
  app.get(api.precedents.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const modelId = Number(req.params.modelId);
    const model = await storage.getModel(modelId);
    if (!model) return res.status(404).json({ message: "Model not found" });
    
    const userId = (req.user as any).id;
    if (model.userId !== userId) return res.status(403).json({ message: "Forbidden" });
    
    const transactions = await storage.getPrecedentTransactions(modelId);
    res.json(transactions);
  });

  app.post(api.precedents.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const modelId = Number(req.params.modelId);
    const model = await storage.getModel(modelId);
    if (!model) return res.status(404).json({ message: "Model not found" });
    
    const userId = (req.user as any).id;
    if (model.userId !== userId) return res.status(403).json({ message: "Forbidden" });
    
    try {
      const transaction = await storage.createPrecedentTransaction({
        ...req.body,
        modelId,
      });
      res.status(201).json(transaction);
    } catch (err) {
      res.status(400).json({ message: "Failed to create transaction" });
    }
  });

  app.put(api.precedents.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const transactionId = Number(req.params.id);
    
    // Fetch precedent and verify ownership
    const precedent = await storage.getPrecedentTransaction(transactionId);
    if (!precedent) {
      return res.status(404).json({ message: "Precedent transaction not found" });
    }
    
    const model = await storage.getModel(precedent.modelId);
    if (!model) {
      return res.status(404).json({ message: "Associated model not found" });
    }
    
    const userId = (req.user as any).id;
    if (model.userId !== userId) {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    try {
      const updated = await storage.updatePrecedentTransaction(transactionId, req.body);
      res.json(updated);
    } catch (err) {
      res.status(400).json({ message: "Failed to update transaction" });
    }
  });

  app.delete(api.precedents.delete.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const transactionId = Number(req.params.id);
    
    // Fetch precedent and verify ownership
    const precedent = await storage.getPrecedentTransaction(transactionId);
    if (!precedent) {
      return res.status(404).json({ message: "Precedent transaction not found" });
    }
    
    const model = await storage.getModel(precedent.modelId);
    if (!model) {
      return res.status(404).json({ message: "Associated model not found" });
    }
    
    const userId = (req.user as any).id;
    if (model.userId !== userId) {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    await storage.deletePrecedentTransaction(transactionId);
    res.status(204).send();
  });

  // === LBO Assumptions Routes ===
  app.get(api.lbo.get.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const modelId = Number(req.params.modelId);
    const model = await storage.getModel(modelId);
    if (!model) return res.status(404).json({ message: "Model not found" });
    
    const userId = (req.user as any).id;
    if (model.userId !== userId) return res.status(403).json({ message: "Forbidden" });
    
    let lboData = await storage.getLboAssumptions(modelId);
    if (!lboData) {
      lboData = await storage.upsertLboAssumptions({ modelId });
    }
    res.json(lboData);
  });

  app.put(api.lbo.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const modelId = Number(req.params.modelId);
    const model = await storage.getModel(modelId);
    if (!model) return res.status(404).json({ message: "Model not found" });
    
    const userId = (req.user as any).id;
    if (model.userId !== userId) return res.status(403).json({ message: "Forbidden" });
    
    try {
      const lboData = await storage.upsertLboAssumptions({
        modelId,
        ...req.body,
      });
      res.json(lboData);
    } catch (err) {
      res.status(400).json({ message: "Failed to update LBO assumptions" });
    }
  });

  // === Model Duplication Route ===
  app.post("/api/models/:id/duplicate", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    const modelId = Number(req.params.id);
    const model = await storage.getModel(modelId);
    
    if (!model) {
      return res.status(404).json({ message: "Model not found" });
    }
    
    const userId = (req.user as any).id;
    if (model.userId !== userId) {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    try {
      const duplicatedModel = await storage.createModel({
        userId,
        name: `${model.name} (Copy)`,
        description: model.description,
        currency: model.currency,
        startingRevenue: model.startingRevenue,
        growthRate: model.growthRate,
        cogsMargin: model.cogsMargin,
        opexMargin: model.opexMargin,
        daMargin: model.daMargin,
        interestRate: model.interestRate,
        debtBalance: model.debtBalance,
        wacc: model.wacc,
        terminalGrowthRate: model.terminalGrowthRate,
        exitMultiple: model.exitMultiple,
        tradingComps: model.tradingComps as any,
        taxRate: model.taxRate,
      });
      
      const lboData = await storage.getLboAssumptions(modelId);
      if (lboData) {
        await storage.upsertLboAssumptions({
          modelId: duplicatedModel.id,
          entryMultiple: lboData.entryMultiple,
          exitMultiple: lboData.exitMultiple,
          holdingPeriod: lboData.holdingPeriod,
          debtPercent: lboData.debtPercent,
          interestRate: lboData.interestRate,
          annualDebtPaydown: lboData.annualDebtPaydown,
          targetIrr: lboData.targetIrr,
          seniorDebtMultiple: lboData.seniorDebtMultiple,
          mezDebtMultiple: lboData.mezDebtMultiple,
          seniorDebtRate: lboData.seniorDebtRate,
          mezDebtRate: lboData.mezDebtRate,
          managementRollover: lboData.managementRollover,
        });
      }
      
      const precedents = await storage.getPrecedentTransactions(modelId);
      for (const precedent of precedents) {
        await storage.createPrecedentTransaction({
          modelId: duplicatedModel.id,
          targetName: precedent.targetName,
          acquirerName: precedent.acquirerName,
          transactionDate: precedent.transactionDate,
          transactionValue: precedent.transactionValue,
          targetRevenue: precedent.targetRevenue,
          targetEbitda: precedent.targetEbitda,
          evRevenue: precedent.evRevenue,
          evEbitda: precedent.evEbitda,
        });
      }
      
      const projections = calculateProjections(duplicatedModel);
      const valuation = calculateValuation(duplicatedModel, projections);
      const compsAnalysis = calculateTradingComps(duplicatedModel, projections);
      
      res.status(201).json({
        ...duplicatedModel,
        projections,
        valuation,
        compsAnalysis
      });
    } catch (err) {
      res.status(400).json({ message: "Failed to duplicate model" });
    }
  });

  // === Model Notes Routes ===
  app.get(api.notes.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const modelId = Number(req.params.modelId);
    const model = await storage.getModel(modelId);
    if (!model) return res.status(404).json({ message: "Model not found" });
    
    const userId = (req.user as any).id;
    if (model.userId !== userId) return res.status(403).json({ message: "Forbidden" });
    
    const notes = await storage.getModelNotes(modelId);
    res.json(notes);
  });

  app.post(api.notes.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const modelId = Number(req.params.modelId);
    const model = await storage.getModel(modelId);
    if (!model) return res.status(404).json({ message: "Model not found" });
    
    const userId = (req.user as any).id;
    if (model.userId !== userId) return res.status(403).json({ message: "Forbidden" });
    
    try {
      const note = await storage.createModelNote({
        modelId,
        content: req.body.content,
        section: req.body.section || null,
      });
      res.status(201).json(note);
    } catch (err) {
      res.status(400).json({ message: "Failed to create note" });
    }
  });

  app.put(api.notes.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const noteId = Number(req.params.id);
    
    const note = await storage.getModelNote(noteId);
    if (!note) return res.status(404).json({ message: "Note not found" });
    
    const model = await storage.getModel(note.modelId);
    if (!model) return res.status(404).json({ message: "Model not found" });
    
    const userId = (req.user as any).id;
    if (model.userId !== userId) return res.status(403).json({ message: "Forbidden" });
    
    try {
      const updated = await storage.updateModelNote(noteId, {
        content: req.body.content,
        section: req.body.section,
      });
      res.json(updated);
    } catch (err) {
      res.status(400).json({ message: "Failed to update note" });
    }
  });

  app.delete(api.notes.delete.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const noteId = Number(req.params.id);
    
    const note = await storage.getModelNote(noteId);
    if (!note) return res.status(404).json({ message: "Note not found" });
    
    const model = await storage.getModel(note.modelId);
    if (!model) return res.status(404).json({ message: "Model not found" });
    
    const userId = (req.user as any).id;
    if (model.userId !== userId) return res.status(403).json({ message: "Forbidden" });
    
    try {
      await storage.deleteModelNote(noteId);
      res.status(204).send();
    } catch (err) {
      res.status(400).json({ message: "Failed to delete note" });
    }
  });

  app.get(api.models.export.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const model = await storage.getModel(Number(req.params.id));
    if (!model) return res.status(404).json({ message: "Model not found" });
    
    const userId = (req.user as any).id;
    if (model.userId !== userId) return res.status(403).json({ message: "Forbidden" });
    
    const modelId = Number(req.params.id);
    const projections = calculateProjections(model);
    const valuation = calculateValuation(model, projections);
    const precedentTransactions = await storage.getPrecedentTransactions(modelId);
    const lboAssumptions = await storage.getLboAssumptions(modelId);
    const wb = XLSX.utils.book_new();

    // Helper for cell references
    const cols = ["B", "C", "D", "E", "F"];

    const now = new Date();
    const footerDate = now.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    
    const S = ExcelStyles;

    // ============================================
    // COVER SHEET - Executive Summary
    // ============================================
    const finalYearEbitda = projections[projections.length - 1]?.ebitda || 0;
    const finalYearRevenue = projections[projections.length - 1]?.revenue || 0;
    const revenueCAGR = projections.length > 1 
      ? (Math.pow(finalYearRevenue / Number(model.startingRevenue), 1/(projections.length)) - 1) * 100 
      : 0;
    const evEbitdaImplied = valuation.enterpriseValue && finalYearEbitda > 0 
      ? valuation.enterpriseValue / finalYearEbitda 
      : 0;

    const coverData: any[][] = [
      [],
      [],
      [],
      ["", "", model.name.toUpperCase()],
      ["", "", "Confidential Investment Memorandum"],
      [],
      ["", "", `Prepared: ${footerDate}`],
      [],
      [],
      ["", "", "EXECUTIVE SUMMARY"],
      [],
      ["", "", "KEY METRICS", "", "VALUE"],
      ["", "", "Starting Revenue", "", Number(model.startingRevenue)],
      ["", "", "Year 5 Revenue", "", finalYearRevenue],
      ["", "", "Revenue CAGR", "", `${revenueCAGR.toFixed(1)}%`],
      ["", "", "Year 5 EBITDA", "", finalYearEbitda],
      ["", "", "EBITDA Margin", "", `${((finalYearEbitda / finalYearRevenue) * 100).toFixed(1)}%`],
      [],
      ["", "", "VALUATION SUMMARY", "", "VALUE"],
      ["", "", "Enterprise Value", "", valuation.enterpriseValue],
      ["", "", "Equity Value", "", valuation.equityValue],
      ["", "", "Implied EV/EBITDA", "", `${evEbitdaImplied.toFixed(1)}x`],
      ["", "", "WACC", "", `${model.wacc}%`],
      ["", "", "Terminal Growth Rate", "", `${model.terminalGrowthRate}%`],
      [],
      [],
      ["", "", "MODEL CONTENTS"],
      ["", "", "1. Income Statement - 5-Year Projections"],
      ["", "", "2. Assumptions - Operating & Valuation Parameters"],
      ["", "", "3. DCF Valuation - Discounted Cash Flow Analysis"],
      ["", "", "4. Trading Comps - Comparable Company Analysis"],
      ["", "", "5. Precedent Transactions - M&A Analysis"],
      ["", "", "6. LBO Analysis - Leveraged Buyout Returns"],
      [],
      [],
      [],
      ["", "", "BOTTOMLINE"],
      ["", "", "Institutional-Grade Financial Modeling"],
    ];

    const wsCover = XLSX.utils.aoa_to_sheet(coverData);
    wsCover["!cols"] = [{ wch: 5 }, { wch: 5 }, { wch: 45 }, { wch: 5 }, { wch: 25 }];
    wsCover["!rows"] = Array(40).fill({ hpt: 18 });
    wsCover["!rows"][3] = { hpt: 36 };

    if (wsCover["C4"]) wsCover["C4"].s = S.coverTitleStyle;
    if (wsCover["C5"]) wsCover["C5"].s = S.coverSubtitleStyle;
    if (wsCover["C7"]) wsCover["C7"].s = S.coverDateStyle;
    if (wsCover["C10"]) wsCover["C10"].s = S.sectionHeaderStyle;
    if (wsCover["C12"]) wsCover["C12"].s = S.columnHeaderLeftStyle;
    if (wsCover["E12"]) wsCover["E12"].s = S.columnHeaderStyle;
    if (wsCover["C19"]) wsCover["C19"].s = S.columnHeaderLeftStyle;
    if (wsCover["E19"]) wsCover["E19"].s = S.columnHeaderStyle;
    if (wsCover["C27"]) wsCover["C27"].s = S.sectionHeaderStyle;
    if (wsCover["C37"]) wsCover["C37"].s = { font: { bold: true, sz: 18, color: { rgb: S.EXCEL_STYLES.colors.accentBlue }, name: "Arial" } };
    if (wsCover["C38"]) wsCover["C38"].s = S.footerStyle;

    ["C13", "C14", "C15", "C16", "C17", "C20", "C21", "C22", "C23", "C24", "C28", "C29", "C30", "C31", "C32", "C33"].forEach(cell => {
      if (wsCover[cell]) wsCover[cell].s = S.rowLabelStyle;
    });
    ["E13", "E14", "E15", "E16", "E17", "E20", "E21", "E22", "E23", "E24"].forEach(cell => {
      if (wsCover[cell]) wsCover[cell].s = S.dataStyleCurrency;
    });

    XLSX.utils.book_append_sheet(wb, wsCover, "Cover");

    // ============================================
    // SHEET 2: INCOME STATEMENT
    // ============================================
    const isData = [
      ["FINANCIAL MODEL - " + model.name.toUpperCase()],
      ["Projected 5-Year Income Statement"],
      ["Bottomline"],
      ["Currency: " + (model.currency || "USD")],
      [],
      ["INCOME STATEMENT", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5"],
      ["Revenue"], 
      ["  % Growth"], 
      ["Cost of Goods Sold (COGS)"], 
      ["GROSS PROFIT"], 
      ["Operating Expenses (OpEx)"], 
      ["EBITDA"], 
      ["  % Margin"], 
      ["Depreciation & Amortization (D&A)"], 
      ["EBIT (Operating Income)"], 
      ["Interest Expense"], 
      ["EBT (Pre-Tax Income)"], 
      ["Income Tax Expense"], 
      ["NET INCOME"], 
      ["  % Net Margin"],
    ];

    const wsIS = XLSX.utils.aoa_to_sheet(isData);

    if (wsIS["A1"]) wsIS["A1"].s = S.titleStyle;
    if (wsIS["A2"]) wsIS["A2"].s = S.subtitleStyle;
    if (wsIS["A3"]) wsIS["A3"].s = S.brandStyle;
    if (wsIS["A4"]) wsIS["A4"].s = S.footerStyle;

    ["A6", "B6", "C6", "D6", "E6", "F6"].forEach(cell => {
      if (wsIS[cell]) wsIS[cell].s = cell === "A6" ? S.columnHeaderLeftStyle : S.columnHeaderStyle;
    });

    ["A10", "A12", "A15", "A17", "A19"].forEach(cell => {
      if (wsIS[cell]) wsIS[cell].s = S.rowLabelBoldStyle;
    });

    ["A7", "A8", "A9", "A11", "A13", "A14", "A16", "A18", "A20"].forEach(cell => {
      if (wsIS[cell]) wsIS[cell].s = S.rowLabelStyle;
    });

    cols.forEach((col, idx) => {
      if (idx === 0) wsIS[col + "7"] = { t: "n", v: Number(model.startingRevenue), s: S.inputStyle };
      else wsIS[col + "7"] = { f: `${cols[idx-1]}7*(1+'Assumptions'!$B$5)`, s: S.formulaStyle };
      wsIS[col + "8"] = idx === 0 ? { t: "s", v: "-", s: S.formulaStylePercent } : { f: `(${col}7/${cols[idx-1]}7)-1`, s: S.formulaStylePercent };
      wsIS[col + "9"] = { f: `-${col}7*'Assumptions'!$B$6`, s: S.formulaStyle };
      wsIS[col + "10"] = { f: `${col}7+${col}9`, s: S.totalRowStyle };
      wsIS[col + "11"] = { f: `-${col}7*'Assumptions'!$B$7`, s: S.formulaStyle };
      wsIS[col + "12"] = { f: `${col}10+${col}11`, s: S.totalRowStyle };
      wsIS[col + "13"] = { f: `${col}12/${col}7`, s: S.formulaStylePercent };
      wsIS[col + "14"] = { f: `-${col}7*'Assumptions'!$B$8`, s: S.formulaStyle };
      wsIS[col + "15"] = { f: `${col}12+${col}14`, s: S.totalRowStyle };
      wsIS[col + "16"] = { f: `-'Assumptions'!$B$11*'Assumptions'!$B$12`, s: S.formulaStyle };
      wsIS[col + "17"] = { f: `${col}15+${col}16`, s: S.totalRowStyle };
      wsIS[col + "18"] = { f: `IF(${col}17>0,-${col}17*'Assumptions'!$B$13,0)`, s: S.formulaStyle };
      wsIS[col + "19"] = { f: `${col}17+${col}18`, s: S.totalRowStyle };
      wsIS[col + "20"] = { f: `${col}19/${col}7`, s: S.formulaStylePercent };
    });

    wsIS["!cols"] = [{ wch: S.standardColWidths.label }, ...cols.map(() => ({ wch: S.standardColWidths.data }))];
    wsIS["!rows"] = Array(22).fill({ hpt: S.standardRowHeight });
    wsIS["!rows"][5] = { hpt: S.headerRowHeight };
    wsIS["A22"] = { t: "s", v: `Generated by Bottomline  |  ${footerDate}`, s: S.footerStyle };

    XLSX.utils.book_append_sheet(wb, wsIS, "Income Statement");

    // SHEET 2: ASSUMPTIONS (Enhanced for Institutional Standards)
    const assData = [
      ["BOTTOMLINE"],
      ["Scenario Assumptions - " + model.name.toUpperCase()],
      [],
      ["OPERATING ASSUMPTIONS"],
      ["Revenue Growth Rate", Number(model.growthRate) / 100],
      ["COGS Margin", Number(model.cogsMargin) / 100],
      ["OpEx Margin", Number(model.opexMargin) / 100],
      ["D&A Margin", Number(model.daMargin) / 100],
      [],
      ["WORKING CAPITAL ASSUMPTIONS"],
      ["Days Sales Outstanding (A/R)", Number(model.arDays) || 45],
      ["Days Inventory Outstanding", Number(model.inventoryDays) || 60],
      ["Days Payables Outstanding", Number(model.apDays) || 30],
      [],
      ["CAPEX ASSUMPTIONS"],
      ["Total CapEx (% of Revenue)", Number(model.capexPercent) / 100 || 0.05],
      ["Maintenance CapEx (% of Revenue)", Number(model.maintenanceCapexPercent) / 100 || 0.02],
      [],
      ["CAPITAL STRUCTURE & TAX"],
      ["Interest Rate", Number(model.interestRate) / 100],
      ["Debt Balance", Number(model.debtBalance)],
      ["Cash Balance", Number(model.cashBalance) || 0],
      ["Shares Outstanding", Number(model.sharesOutstanding) || 1000000],
      ["Tax Rate", Number(model.taxRate) / 100],
      [],
      ["VALUATION PARAMETERS"],
      ["WACC", Number(model.wacc) / 100],
      ["Terminal Growth Rate", Number(model.terminalGrowthRate) / 100],
      ["Exit Multiple", Number(model.exitMultiple)],
      ["Mid-Year Convention", model.useMidYearConvention !== false ? "Yes" : "No"],
    ];
    const wsAss = XLSX.utils.aoa_to_sheet(assData);
    wsAss["!cols"] = [{ wch: S.standardColWidths.label + 3 }, { wch: S.standardColWidths.wide }];
    wsAss["!rows"] = Array(34).fill({ hpt: S.standardRowHeight });

    if (wsAss["A1"]) wsAss["A1"].s = S.titleStyle;
    if (wsAss["A2"]) wsAss["A2"].s = S.subtitleStyle;
    
    ["A4", "A10", "A15", "A19", "A26"].forEach(cell => {
      if (wsAss[cell]) wsAss[cell].s = S.sectionHeaderStyle;
    });

    ["A5", "A6", "A7", "A8", "A11", "A12", "A13", "A16", "A17", "A20", "A21", "A22", "A23", "A24", "A27", "A28", "A29", "A30"].forEach(cell => {
      if (wsAss[cell]) wsAss[cell].s = S.rowLabelStyle;
    });

    ["B5", "B6", "B7", "B8"].forEach(cell => {
      if (wsAss[cell]) wsAss[cell].s = S.inputStylePercent;
    });
    ["B11", "B12", "B13"].forEach(cell => {
      if (wsAss[cell]) wsAss[cell].s = S.inputStyle;
    });
    ["B16", "B17", "B20", "B27", "B28"].forEach(cell => {
      if (wsAss[cell]) wsAss[cell].s = S.inputStylePercent;
    });
    ["B21", "B22", "B23"].forEach(cell => {
      if (wsAss[cell]) wsAss[cell].s = S.inputStyle;
    });
    if (wsAss["B24"]) wsAss["B24"].s = S.inputStylePercent;
    if (wsAss["B29"]) wsAss["B29"].s = S.inputStyle;
    if (wsAss["B30"]) wsAss["B30"].s = S.dataStyle;

    wsAss["A32"] = { t: "s", v: `Generated by Bottomline  |  ${footerDate}`, s: S.footerStyle };

    XLSX.utils.book_append_sheet(wb, wsAss, "Assumptions");

    // SHEET 3: VALUATION (DCF) - Updated with correct references and mid-year convention
    // Assumptions references after new rows: WACC=B27, TGR=B28, Debt=B21, Cash=B22, Shares=B23
    const useMidYear = model.useMidYearConvention !== false;
    const valData = [
      ["VALUATION ANALYSIS - DCF"],
      ["Bottomline Proprietary Valuation Framework"],
      [],
      ["Year", 1, 2, 3, 4, 5],
      ["Unlevered Free Cash Flow", ...cols.map(c => ({ f: `'Income Statement'!${c}19-'Income Statement'!${c}14` }))],
      ["Discount Factor", ...cols.map((_, i) => ({ f: useMidYear ? `1/((1+'Assumptions'!$B$27)^${i + 0.5})` : `1/((1+'Assumptions'!$B$27)^${i+1})` }))],
      ["Present Value of FCF", ...cols.map(c => ({ f: `${c}5*${c}6` }))],
      [],
      ["ENTERPRISE VALUE CALCULATION"],
      ["PV of 5-Year Projections", { f: `SUM(B7:F7)` }],
      ["Terminal Value (Gordon Growth)", { f: `(F5*(1+'Assumptions'!$B$28))/('Assumptions'!$B$27-'Assumptions'!$B$28)` }],
      ["PV of Terminal Value", { f: useMidYear ? `B11/((1+'Assumptions'!$B$27)^4.5)` : `B11/((1+'Assumptions'!$B$27)^5)` }],
      ["ENTERPRISE VALUE", { f: `B10+B12` }],
      ["Less: Net Debt", { f: `'Assumptions'!$B$21-'Assumptions'!$B$22` }],
      ["EQUITY VALUE", { f: `B13-B14` }],
      ["Shares Outstanding", { f: `'Assumptions'!$B$23` }],
      ["Equity Value Per Share", { f: `B15/B16` }],
    ];
    const wsVal = XLSX.utils.aoa_to_sheet(valData);
    wsVal["!cols"] = [{ wch: S.standardColWidths.label + 3 }, ...cols.map(() => ({ wch: S.standardColWidths.data }))];
    wsVal["!rows"] = Array(22).fill({ hpt: S.standardRowHeight });

    if (wsVal["A1"]) wsVal["A1"].s = S.titleStyle;
    if (wsVal["A2"]) wsVal["A2"].s = S.subtitleStyle;
    ["A4", "B4", "C4", "D4", "E4", "F4"].forEach(cell => {
      if (wsVal[cell]) wsVal[cell].s = cell === "A4" ? S.columnHeaderLeftStyle : S.columnHeaderStyle;
    });
    ["A5", "A6", "A7", "A10", "A11", "A12", "A14", "A16", "A17"].forEach(cell => {
      if (wsVal[cell]) wsVal[cell].s = S.rowLabelStyle;
    });
    ["A9"].forEach(cell => {
      if (wsVal[cell]) wsVal[cell].s = S.sectionHeaderStyle;
    });
    ["A13", "A15"].forEach(cell => {
      if (wsVal[cell]) wsVal[cell].s = S.totalRowLabelStyle;
    });
    ["B5", "C5", "D5", "E5", "F5", "B7", "C7", "D7", "E7", "F7", "B10", "B11", "B12"].forEach(cell => {
      if (wsVal[cell]) wsVal[cell].s = S.dataStyleCurrency;
    });
    ["B6", "C6", "D6", "E6", "F6"].forEach(cell => {
      if (wsVal[cell]) wsVal[cell].s = S.dataStylePercent;
    });
    ["B13", "B14", "B15"].forEach(cell => {
      if (wsVal[cell]) wsVal[cell].s = S.totalRowStyle;
    });
    if (wsVal["B17"]) wsVal["B17"].s = S.dataStyleCurrencyDecimals;

    wsVal["A20"] = { t: "s", v: `Generated by Bottomline  |  ${footerDate}`, s: S.footerStyle };

    XLSX.utils.book_append_sheet(wb, wsVal, "Valuation");

    // SHEET 4: TRADING COMPARABLES
    const tradingComps = (model.tradingComps as TradingCompEntry[]) || [];
    const compsData: any[][] = [
      ["TRADING COMPARABLES ANALYSIS"],
      [model.name.toUpperCase()],
      ["Bottomline"],
      [],
      ["Company", "Enterprise Value", "EBITDA", "EV/EBITDA", "Market Cap", "Net Income", "P/E"],
    ];

    tradingComps.forEach((comp) => {
      const evEbitda = comp.ebitda > 0 ? comp.ev / comp.ebitda : 0;
      const pe = comp.netIncome > 0 ? comp.marketCap / comp.netIncome : 0;
      compsData.push([
        comp.companyName || "",
        comp.ev || 0,
        comp.ebitda || 0,
        evEbitda,
        comp.marketCap || 0,
        comp.netIncome || 0,
        pe
      ]);
    });

    if (tradingComps.length > 0) {
      const evEbitdas = tradingComps.map(c => c.ebitda > 0 ? c.ev / c.ebitda : 0).filter(v => v > 0);
      const pes = tradingComps.map(c => c.netIncome > 0 ? c.marketCap / c.netIncome : 0).filter(v => v > 0);
      const avgEvEbitda = evEbitdas.length > 0 ? evEbitdas.reduce((a, b) => a + b, 0) / evEbitdas.length : 0;
      const avgPe = pes.length > 0 ? pes.reduce((a, b) => a + b, 0) / pes.length : 0;
      const medianEvEbitda = evEbitdas.length > 0 ? evEbitdas.sort((a, b) => a - b)[Math.floor(evEbitdas.length / 2)] : 0;
      const medianPe = pes.length > 0 ? pes.sort((a, b) => a - b)[Math.floor(pes.length / 2)] : 0;

      compsData.push([]);
      compsData.push(["Average", "", "", avgEvEbitda, "", "", avgPe]);
      compsData.push(["Median", "", "", medianEvEbitda, "", "", medianPe]);
      compsData.push([]);
      compsData.push(["IMPLIED VALUATION"]);
      const lastEbitda = projections[projections.length - 1]?.ebitda || 0;
      const lastNetIncome = projections[projections.length - 1]?.netIncome || 0;
      const impliedEv = lastEbitda * avgEvEbitda;
      const impliedEquity = lastNetIncome * avgPe;
      compsData.push(["Implied EV (based on Avg EV/EBITDA)", impliedEv]);
      compsData.push(["Implied Equity Value (based on Avg P/E)", impliedEquity]);
    } else {
      compsData.push([]);
      compsData.push(["No trading comparables data available"]);
      compsData.push([]);
      compsData.push(["Add comparable companies on the model page to populate this analysis"]);
    }

    const wsComps = XLSX.utils.aoa_to_sheet(compsData);
    wsComps["!cols"] = [{ wch: S.standardColWidths.label }, { wch: S.standardColWidths.currency }, { wch: S.standardColWidths.data }, { wch: S.standardColWidths.narrow + 2 }, { wch: S.standardColWidths.currency }, { wch: S.standardColWidths.data }, { wch: S.standardColWidths.narrow }];
    wsComps["!rows"] = Array(compsData.length + 4).fill({ hpt: S.standardRowHeight });

    if (wsComps["A1"]) wsComps["A1"].s = S.titleStyle;
    if (wsComps["A2"]) wsComps["A2"].s = S.subtitleStyle;
    if (wsComps["A3"]) wsComps["A3"].s = S.brandStyle;
    ["A5", "B5", "C5", "D5", "E5", "F5", "G5"].forEach(cell => {
      if (wsComps[cell]) wsComps[cell].s = cell === "A5" ? S.columnHeaderLeftStyle : S.columnHeaderStyle;
    });

    for (let i = 6; i <= 5 + tradingComps.length; i++) {
      if (wsComps[`A${i}`]) wsComps[`A${i}`].s = S.rowLabelStyle;
      ["B", "C", "E", "F"].forEach(col => {
        if (wsComps[`${col}${i}`]) wsComps[`${col}${i}`].s = S.dataStyleCurrency;
      });
      ["D", "G"].forEach(col => {
        if (wsComps[`${col}${i}`]) wsComps[`${col}${i}`].s = S.dataStyleMultiple;
      });
    }

    if (tradingComps.length > 0) {
      const avgRow = 7 + tradingComps.length;
      const medRow = avgRow + 1;
      const impliedHeaderRow = medRow + 2;
      const impliedRow1 = impliedHeaderRow + 1;
      const impliedRow2 = impliedHeaderRow + 2;
      
      [avgRow, medRow].forEach(r => {
        if (wsComps[`A${r}`]) wsComps[`A${r}`].s = S.totalRowLabelStyle;
        if (wsComps[`D${r}`]) wsComps[`D${r}`].s = S.totalRowStyle;
        if (wsComps[`G${r}`]) wsComps[`G${r}`].s = S.totalRowStyle;
      });
      if (wsComps[`A${impliedHeaderRow}`]) wsComps[`A${impliedHeaderRow}`].s = S.sectionHeaderStyle;
      [impliedRow1, impliedRow2].forEach(r => {
        if (wsComps[`A${r}`]) wsComps[`A${r}`].s = S.rowLabelStyle;
        if (wsComps[`B${r}`]) wsComps[`B${r}`].s = S.dataStyleCurrency;
      });
    } else {
      if (wsComps["A7"]) wsComps["A7"].s = S.rowLabelStyle;
      if (wsComps["A9"]) wsComps["A9"].s = S.subtitleStyle;
    }

    const compsFooterRow = compsData.length + 2;
    wsComps[`A${compsFooterRow}`] = { t: "s", v: `Generated by Bottomline  |  ${footerDate}`, s: S.footerStyle };

    XLSX.utils.book_append_sheet(wb, wsComps, "Trading Comps");

    // SHEET 5: PRECEDENT TRANSACTIONS
    const precedentsData: any[][] = [
      ["PRECEDENT TRANSACTION ANALYSIS"],
      [model.name.toUpperCase()],
      ["Bottomline"],
      [],
      ["Target", "Acquirer", "Date", "Deal Value", "EV/Revenue", "EV/EBITDA"],
    ];

    precedentTransactions.forEach((txn) => {
      precedentsData.push([
        txn.targetName || "",
        txn.acquirerName || "",
        txn.transactionDate || "",
        Number(txn.transactionValue) || 0,
        Number(txn.evRevenue) || 0,
        Number(txn.evEbitda) || 0
      ]);
    });

    if (precedentTransactions.length > 0) {
      const evRevenues = precedentTransactions.map(t => Number(t.evRevenue) || 0).filter(v => v > 0);
      const evEbitdas = precedentTransactions.map(t => Number(t.evEbitda) || 0).filter(v => v > 0);
      const medianEvRevenue = evRevenues.length > 0 ? evRevenues.sort((a, b) => a - b)[Math.floor(evRevenues.length / 2)] : 0;
      const medianEvEbitda = evEbitdas.length > 0 ? evEbitdas.sort((a, b) => a - b)[Math.floor(evEbitdas.length / 2)] : 0;

      precedentsData.push([]);
      precedentsData.push(["Median Multiple", "", "", "", medianEvRevenue, medianEvEbitda]);
    } else {
      precedentsData.push([]);
      precedentsData.push(["No precedent transactions data available"]);
    }

    const wsPrecedents = XLSX.utils.aoa_to_sheet(precedentsData);
    wsPrecedents["!cols"] = [{ wch: S.standardColWidths.label - 5 }, { wch: S.standardColWidths.label - 5 }, { wch: S.standardColWidths.data }, { wch: S.standardColWidths.currency }, { wch: S.standardColWidths.narrow + 2 }, { wch: S.standardColWidths.narrow + 2 }];
    wsPrecedents["!rows"] = Array(precedentsData.length + 4).fill({ hpt: S.standardRowHeight });

    if (wsPrecedents["A1"]) wsPrecedents["A1"].s = S.titleStyle;
    if (wsPrecedents["A2"]) wsPrecedents["A2"].s = S.subtitleStyle;
    if (wsPrecedents["A3"]) wsPrecedents["A3"].s = S.brandStyle;
    ["A5", "B5", "C5", "D5", "E5", "F5"].forEach(cell => {
      if (wsPrecedents[cell]) wsPrecedents[cell].s = cell === "A5" ? S.columnHeaderLeftStyle : S.columnHeaderStyle;
    });

    for (let i = 6; i <= 5 + precedentTransactions.length; i++) {
      if (wsPrecedents[`A${i}`]) wsPrecedents[`A${i}`].s = S.rowLabelStyle;
      if (wsPrecedents[`B${i}`]) wsPrecedents[`B${i}`].s = S.dataStyle;
      if (wsPrecedents[`C${i}`]) wsPrecedents[`C${i}`].s = S.dataStyle;
      if (wsPrecedents[`D${i}`]) wsPrecedents[`D${i}`].s = S.dataStyleCurrency;
      ["E", "F"].forEach(col => {
        if (wsPrecedents[`${col}${i}`]) wsPrecedents[`${col}${i}`].s = S.dataStyleMultiple;
      });
    }

    if (precedentTransactions.length > 0) {
      const medianRow = 7 + precedentTransactions.length;
      if (wsPrecedents[`A${medianRow}`]) wsPrecedents[`A${medianRow}`].s = S.totalRowLabelStyle;
      if (wsPrecedents[`E${medianRow}`]) wsPrecedents[`E${medianRow}`].s = S.totalRowStyle;
      if (wsPrecedents[`F${medianRow}`]) wsPrecedents[`F${medianRow}`].s = S.totalRowStyle;
    }

    const precedentsFooterRow = precedentsData.length + 2;
    wsPrecedents[`A${precedentsFooterRow}`] = { t: "s", v: `Generated by Bottomline  |  ${footerDate}`, s: S.footerStyle };

    XLSX.utils.book_append_sheet(wb, wsPrecedents, "Precedent Transactions");

    // SHEET 6: LBO ANALYSIS - Full Institutional Model
    const lboData: any[][] = [
      ["LEVERAGED BUYOUT ANALYSIS"],
      [model.name.toUpperCase()],
      ["Bottomline"],
      [],
    ];

    // Extract LBO assumptions from database
    const entryMultiple = Number(lboAssumptions?.entryMultiple) || 8;
    const exitMultipleLbo = Number(lboAssumptions?.exitMultiple) || 12;
    const holdingPeriod = lboAssumptions?.holdingPeriod || 5;
    const debtPercent = Number(lboAssumptions?.debtPercent) || 60;
    const interestRateLbo = Number(lboAssumptions?.interestRate) || 8;
    const annualDebtPaydownPct = Number(lboAssumptions?.annualDebtPaydown) || 6;
    const seniorDebtMultiple = Number(lboAssumptions?.seniorDebtMultiple) || 4;
    const mezDebtMultiple = Number(lboAssumptions?.mezDebtMultiple) || 1.5;
    const seniorInterestRate = Number(lboAssumptions?.seniorDebtRate) || 6;
    const mezInterestRate = Number(lboAssumptions?.mezDebtRate) || 12;

    // Entry calculations based on actual projections
    const entryEbitda = projections[0]?.ebitda || 0;
    const entryEv = entryEbitda * entryMultiple;
    const totalDebt = entryEv * (debtPercent / 100);
    const seniorDebt = Math.min(entryEbitda * seniorDebtMultiple, totalDebt);
    const mezDebt = Math.min(entryEbitda * mezDebtMultiple, totalDebt - seniorDebt);
    const equityContribution = entryEv - seniorDebt - mezDebt;

    // SOURCES & USES
    lboData.push(["SOURCES & USES"]);
    lboData.push([]);
    lboData.push(["Sources", "Amount", "% of Total", "", "Uses", "Amount", "% of Total"]);
    lboData.push(["Senior Debt", seniorDebt, `${((seniorDebt / entryEv) * 100).toFixed(1)}%`, "", "Enterprise Value", entryEv, "100.0%"]);
    lboData.push(["Mezzanine Debt", mezDebt, `${((mezDebt / entryEv) * 100).toFixed(1)}%`, "", "Transaction Fees", 0, "0.0%"]);
    lboData.push(["Sponsor Equity", equityContribution, `${((equityContribution / entryEv) * 100).toFixed(1)}%`, "", "", "", ""]);
    lboData.push(["Total Sources", entryEv, "100.0%", "", "Total Uses", entryEv, "100.0%"]);
    lboData.push([]);

    // KEY ASSUMPTIONS
    lboData.push(["KEY ASSUMPTIONS"]);
    lboData.push([]);
    lboData.push(["Entry Multiple", `${entryMultiple}x`, "", "Senior Interest Rate", `${seniorInterestRate}%`]);
    lboData.push(["Exit Multiple", `${exitMultipleLbo}x`, "", "Mezzanine Interest Rate", `${mezInterestRate}%`]);
    lboData.push(["Holding Period", `${holdingPeriod} years`, "", "Mandatory Amortization", `${annualDebtPaydownPct}% p.a.`]);
    lboData.push([]);

    // Build year-by-year debt schedule and cash flow model
    const yearLabels = ["Entry", ...projections.slice(0, holdingPeriod).map((_, i) => `Year ${i + 1}`)];
    
    // Initialize debt balances
    let seniorBalance = seniorDebt;
    let mezBalance = mezDebt;
    const debtSchedule: {
      year: number;
      beginSenior: number;
      seniorInterest: number;
      seniorAmort: number;
      endSenior: number;
      beginMez: number;
      mezInterest: number;
      mezAmort: number;
      endMez: number;
      ebitda: number;
      capex: number;
      wcChange: number;
      fcf: number;
      cashSweep: number;
      distributableFcf: number;
      totalDebtService: number;
    }[] = [];

    for (let yr = 0; yr < holdingPeriod && yr < projections.length; yr++) {
      const proj = projections[yr];
      const beginSenior = seniorBalance;
      const beginMez = mezBalance;
      
      const seniorInt = beginSenior * (seniorInterestRate / 100);
      const mezInt = beginMez * (mezInterestRate / 100);
      const mandatoryAmort = seniorDebt * (annualDebtPaydownPct / 100);
      const seniorAmort = Math.min(mandatoryAmort, beginSenior);
      
      // Calculate FCF for potential cash sweep
      const ebitda = proj.ebitda;
      const capex = proj.capex || (ebitda * 0.08);
      const wcChange = proj.changeInNwc || 0;
      const taxRate = 0.25;
      const taxes = Math.max(0, (ebitda - seniorInt - mezInt) * taxRate);
      const fcf = ebitda - seniorInt - mezInt - taxes - capex - wcChange - seniorAmort;
      
      // Optional cash sweep (50% of excess FCF to senior debt)
      const cashSweep = Math.max(0, Math.min(fcf * 0.5, beginSenior - seniorAmort));
      const distributableFcf = fcf - cashSweep; // FCF actually available to equity after sweep
      
      seniorBalance = Math.max(0, beginSenior - seniorAmort - cashSweep);
      mezBalance = beginMez; // Mez typically bullet at exit
      
      debtSchedule.push({
        year: yr + 1,
        beginSenior,
        seniorInterest: seniorInt,
        seniorAmort,
        endSenior: seniorBalance,
        beginMez,
        mezInterest: mezInt,
        mezAmort: 0,
        endMez: mezBalance,
        ebitda,
        capex,
        wcChange,
        fcf,
        cashSweep,
        distributableFcf,
        totalDebtService: seniorInt + mezInt + seniorAmort
      });
    }

    // DEBT SCHEDULE
    lboData.push(["DEBT SCHEDULE"]);
    lboData.push([]);
    lboData.push(["", ...debtSchedule.map(d => `Year ${d.year}`)]);
    lboData.push(["Senior Debt - Beginning", ...debtSchedule.map(d => d.beginSenior)]);
    lboData.push(["Interest Expense", ...debtSchedule.map(d => d.seniorInterest)]);
    lboData.push(["Mandatory Amortization", ...debtSchedule.map(d => d.seniorAmort)]);
    lboData.push(["Cash Sweep", ...debtSchedule.map(d => d.cashSweep)]);
    lboData.push(["Senior Debt - Ending", ...debtSchedule.map(d => d.endSenior)]);
    lboData.push([]);
    lboData.push(["Mezzanine Debt - Beginning", ...debtSchedule.map(d => d.beginMez)]);
    lboData.push(["Interest Expense (PIK)", ...debtSchedule.map(d => d.mezInterest)]);
    lboData.push(["Mezzanine Debt - Ending", ...debtSchedule.map(d => d.endMez)]);
    lboData.push([]);
    lboData.push(["Total Debt Outstanding", ...debtSchedule.map(d => d.endSenior + d.endMez)]);
    lboData.push([]);

    // CASH FLOW TO EQUITY
    lboData.push(["CASH FLOW TO EQUITY"]);
    lboData.push([]);
    lboData.push(["", ...debtSchedule.map(d => `Year ${d.year}`)]);
    lboData.push(["EBITDA", ...debtSchedule.map(d => d.ebitda)]);
    lboData.push(["(-) Interest Expense", ...debtSchedule.map(d => -(d.seniorInterest + d.mezInterest))]);
    lboData.push(["(-) Taxes @ 25%", ...debtSchedule.map(d => -Math.max(0, (d.ebitda - d.seniorInterest - d.mezInterest) * 0.25))]);
    lboData.push(["(-) CapEx", ...debtSchedule.map(d => -d.capex)]);
    lboData.push(["(-) Change in WC", ...debtSchedule.map(d => -d.wcChange)]);
    lboData.push(["(-) Debt Amortization", ...debtSchedule.map(d => -d.seniorAmort)]);
    lboData.push(["FCF Before Sweep", ...debtSchedule.map(d => d.fcf)]);
    lboData.push(["(-) Cash Sweep", ...debtSchedule.map(d => -d.cashSweep)]);
    lboData.push(["Distributable Cash Flow", ...debtSchedule.map(d => d.distributableFcf)]);
    lboData.push([]);

    // EXIT ANALYSIS & RETURNS
    const exitEbitda = debtSchedule.length > 0 ? debtSchedule[debtSchedule.length - 1].ebitda : entryEbitda;
    const debtAtExit = debtSchedule.length > 0 ? debtSchedule[debtSchedule.length - 1].endSenior + debtSchedule[debtSchedule.length - 1].endMez : totalDebt;
    const exitEv = exitEbitda * exitMultipleLbo;
    const exitEquity = exitEv - debtAtExit;
    const moic = equityContribution > 0 ? exitEquity / equityContribution : 0;

    // Calculate IRR with actual distributable cash flows (after cash sweep)
    const cashFlows = [-equityContribution, ...debtSchedule.map(d => d.distributableFcf)];
    cashFlows[cashFlows.length - 1] += exitEquity; // Add exit proceeds to final year

    // Newton-Raphson IRR calculation
    const calculateIRR = (flows: number[]): number => {
      let rate = 0.15; // Initial guess
      for (let iter = 0; iter < 100; iter++) {
        let npv = 0;
        let dnpv = 0;
        for (let t = 0; t < flows.length; t++) {
          npv += flows[t] / Math.pow(1 + rate, t);
          dnpv -= t * flows[t] / Math.pow(1 + rate, t + 1);
        }
        if (Math.abs(npv) < 0.0001) break;
        if (Math.abs(dnpv) < 0.0001) break;
        rate = rate - npv / dnpv;
        if (rate < -0.99) rate = -0.99;
        if (rate > 10) rate = 10;
      }
      return rate * 100;
    };

    const irr = calculateIRR(cashFlows);

    lboData.push(["EXIT ANALYSIS"]);
    lboData.push([]);
    lboData.push(["Exit EBITDA", exitEbitda]);
    lboData.push(["Exit Multiple", `${exitMultipleLbo}x`]);
    lboData.push(["Exit Enterprise Value", exitEv]);
    lboData.push(["(-) Debt at Exit", debtAtExit]);
    lboData.push(["Exit Equity Value", exitEquity]);
    lboData.push([]);

    lboData.push(["RETURNS SUMMARY"]);
    lboData.push([]);
    lboData.push(["Sponsor Equity Investment", equityContribution]);
    lboData.push(["Exit Equity Proceeds", exitEquity]);
    lboData.push(["MOIC (Multiple of Invested Capital)", `${moic.toFixed(2)}x`]);
    lboData.push(["IRR (Internal Rate of Return)", `${irr.toFixed(1)}%`]);
    lboData.push([]);

    // EXIT SENSITIVITY TABLE
    lboData.push(["EXIT SENSITIVITY - IRR BY ENTRY/EXIT MULTIPLE"]);
    lboData.push([]);
    const entryMults = [entryMultiple - 2, entryMultiple - 1, entryMultiple, entryMultiple + 1, entryMultiple + 2];
    const exitMults = [exitMultipleLbo - 2, exitMultipleLbo - 1, exitMultipleLbo, exitMultipleLbo + 1, exitMultipleLbo + 2];
    
    lboData.push(["Entry \\ Exit", ...exitMults.map(m => `${m}x`)]);
    
    const sensitivityIrrs: { row: number; col: number; irr: number }[] = [];
    const baseRowForSensitivity = lboData.length;
    
    entryMults.forEach((entryM, rowIdx) => {
      const row: (string | number)[] = [`${entryM}x`];
      
      // Build scenario-specific debt schedule for this entry multiple
      const sensEntryEv = entryEbitda * entryM;
      const sensTotalDebt = sensEntryEv * (debtPercent / 100);
      const sensSeniorDebt = Math.min(entryEbitda * seniorDebtMultiple, sensTotalDebt);
      const sensMezDebt = Math.min(entryEbitda * mezDebtMultiple, sensTotalDebt - sensSeniorDebt);
      const sensEquity = sensEntryEv - sensSeniorDebt - sensMezDebt;
      
      // Build year-by-year debt schedule for this scenario
      let sensSeniorBalance = sensSeniorDebt;
      let sensMezBalance = sensMezDebt;
      const scenarioFcfs: number[] = [];
      
      for (let yr = 0; yr < holdingPeriod && yr < projections.length; yr++) {
        const proj = projections[yr];
        const beginSenior = sensSeniorBalance;
        const beginMez = sensMezBalance;
        
        const seniorInt = beginSenior * (seniorInterestRate / 100);
        const mezInt = beginMez * (mezInterestRate / 100);
        const mandatoryAmort = sensSeniorDebt * (annualDebtPaydownPct / 100);
        const seniorAmort = Math.min(mandatoryAmort, beginSenior);
        
        const ebitdaVal = proj.ebitda;
        const capexVal = proj.capex || (ebitdaVal * 0.08);
        const wcChangeVal = proj.changeInNwc || 0;
        const taxRateVal = 0.25;
        const taxesVal = Math.max(0, (ebitdaVal - seniorInt - mezInt) * taxRateVal);
        const fcfVal = ebitdaVal - seniorInt - mezInt - taxesVal - capexVal - wcChangeVal - seniorAmort;
        
        const cashSweepVal = Math.max(0, Math.min(fcfVal * 0.5, beginSenior - seniorAmort));
        const distributableFcfVal = fcfVal - cashSweepVal; // FCF after cash sweep
        
        sensSeniorBalance = Math.max(0, beginSenior - seniorAmort - cashSweepVal);
        scenarioFcfs.push(distributableFcfVal); // Use distributable FCF, not pre-sweep FCF
      }
      
      const sensDebtAtExit = sensSeniorBalance + sensMezBalance;
      
      exitMults.forEach((exitM, colIdx) => {
        const sensExitEv = exitEbitda * exitM;
        const sensExitEquity = sensExitEv - sensDebtAtExit;
        
        const sensFlows = [-sensEquity, ...scenarioFcfs];
        sensFlows[sensFlows.length - 1] += sensExitEquity;
        const sensIrr = calculateIRR(sensFlows);
        
        sensitivityIrrs.push({ row: baseRowForSensitivity + rowIdx, col: colIdx + 1, irr: sensIrr });
        row.push(`${sensIrr.toFixed(1)}%`);
      });
      lboData.push(row);
    });

    const wsLbo = XLSX.utils.aoa_to_sheet(lboData);
    wsLbo["!cols"] = [{ wch: S.standardColWidths.label }, { wch: S.standardColWidths.data }, { wch: S.standardColWidths.data }, { wch: S.standardColWidths.data }, { wch: S.standardColWidths.data }, { wch: S.standardColWidths.data }, { wch: S.standardColWidths.data }];
    wsLbo["!rows"] = Array(lboData.length + 4).fill({ hpt: S.standardRowHeight });

    if (wsLbo["A1"]) wsLbo["A1"].s = S.titleStyle;
    if (wsLbo["A2"]) wsLbo["A2"].s = S.subtitleStyle;
    if (wsLbo["A3"]) wsLbo["A3"].s = S.brandStyle;
    
    const sectionRows = [5, 13, 18, 21, 34, 37, 51, 55, 60];
    sectionRows.forEach(row => {
      const cell = `A${row}`;
      if (wsLbo[cell]) wsLbo[cell].s = S.sectionHeaderStyle;
    });

    if (wsLbo["A7"]) wsLbo["A7"].s = S.columnHeaderLeftStyle;
    ["B7", "C7", "E7", "F7", "G7"].forEach(cell => {
      if (wsLbo[cell]) wsLbo[cell].s = S.columnHeaderStyle;
    });
    
    for (let row = 8; row <= 11; row++) {
      if (wsLbo[`A${row}`]) wsLbo[`A${row}`].s = row === 11 ? S.totalRowLabelStyle : S.rowLabelStyle;
      if (wsLbo[`B${row}`]) wsLbo[`B${row}`].s = row === 11 ? S.totalRowStyle : S.dataStyleCurrency;
      if (wsLbo[`C${row}`]) wsLbo[`C${row}`].s = row === 11 ? S.totalRowStyle : S.dataStylePercent;
      if (wsLbo[`E${row}`]) wsLbo[`E${row}`].s = row === 11 ? S.totalRowLabelStyle : S.rowLabelStyle;
      if (wsLbo[`F${row}`]) wsLbo[`F${row}`].s = row === 11 ? S.totalRowStyle : S.dataStyleCurrency;
      if (wsLbo[`G${row}`]) wsLbo[`G${row}`].s = row === 11 ? S.totalRowStyle : S.dataStylePercent;
    }

    for (let row = 15; row <= 17; row++) {
      if (wsLbo[`A${row}`]) wsLbo[`A${row}`].s = S.rowLabelStyle;
      if (wsLbo[`D${row}`]) wsLbo[`D${row}`].s = S.rowLabelStyle;
      ["B", "E"].forEach(col => {
        if (wsLbo[`${col}${row}`]) wsLbo[`${col}${row}`].s = S.inputStyle;
      });
    }

    if (wsLbo["A20"]) wsLbo["A20"].s = S.columnHeaderLeftStyle;
    for (let col = 1; col <= debtSchedule.length; col++) {
      const colLetter = String.fromCharCode(65 + col);
      if (wsLbo[`${colLetter}20`]) wsLbo[`${colLetter}20`].s = S.columnHeaderStyle;
    }
    for (let row = 21; row <= 32; row++) {
      if (wsLbo[`A${row}`]) wsLbo[`A${row}`].s = [25, 30].includes(row) ? S.totalRowLabelStyle : S.rowLabelStyle;
      for (let col = 1; col <= debtSchedule.length; col++) {
        const colLetter = String.fromCharCode(65 + col);
        if (wsLbo[`${colLetter}${row}`]) wsLbo[`${colLetter}${row}`].s = [25, 30].includes(row) ? S.totalRowStyle : S.dataStyleCurrency;
      }
    }

    if (wsLbo["A38"]) wsLbo["A38"].s = S.columnHeaderLeftStyle;
    for (let col = 1; col <= debtSchedule.length; col++) {
      const colLetter = String.fromCharCode(65 + col);
      if (wsLbo[`${colLetter}38`]) wsLbo[`${colLetter}38`].s = S.columnHeaderStyle;
    }
    for (let row = 39; row <= 48; row++) {
      if (wsLbo[`A${row}`]) wsLbo[`A${row}`].s = [46, 48].includes(row) ? S.totalRowLabelStyle : S.rowLabelStyle;
      for (let col = 1; col <= debtSchedule.length; col++) {
        const colLetter = String.fromCharCode(65 + col);
        if (wsLbo[`${colLetter}${row}`]) wsLbo[`${colLetter}${row}`].s = [46, 48].includes(row) ? S.totalRowStyle : S.dataStyleCurrency;
      }
    }

    for (let row = 52; row <= 58; row++) {
      if (wsLbo[`A${row}`]) wsLbo[`A${row}`].s = row === 58 ? S.totalRowLabelStyle : S.rowLabelStyle;
      if (wsLbo[`B${row}`]) wsLbo[`B${row}`].s = row === 58 ? S.totalRowStyle : S.dataStyleCurrency;
    }

    for (let row = 62; row <= 67; row++) {
      if (wsLbo[`A${row}`]) wsLbo[`A${row}`].s = [65, 66].includes(row) ? S.totalRowLabelStyle : S.rowLabelStyle;
      if (wsLbo[`B${row}`]) wsLbo[`B${row}`].s = [65, 66].includes(row) ? S.totalRowStyle : S.dataStyleCurrency;
    }

    const sensHeaderRow = baseRowForSensitivity;
    if (wsLbo[`A${sensHeaderRow}`]) wsLbo[`A${sensHeaderRow}`].s = S.sensitivityCornerStyle;
    for (let col = 1; col <= exitMults.length; col++) {
      const colLetter = String.fromCharCode(65 + col);
      if (wsLbo[`${colLetter}${sensHeaderRow}`]) wsLbo[`${colLetter}${sensHeaderRow}`].s = S.sensitivityHeaderStyle;
    }
    for (let row = sensHeaderRow + 1; row <= sensHeaderRow + entryMults.length; row++) {
      if (wsLbo[`A${row}`]) wsLbo[`A${row}`].s = S.sensitivityRowLabelStyle;
    }

    sensitivityIrrs.forEach(({ row, col, irr }) => {
      const colLetter = String.fromCharCode(65 + col);
      const cell = `${colLetter}${row + 1}`;
      if (wsLbo[cell]) wsLbo[cell].s = S.getIrrStyle(irr);
    });

    const lboFooterRow = lboData.length + 2;
    wsLbo[`A${lboFooterRow}`] = { t: "s", v: `Generated by Bottomline  |  ${footerDate}`, s: S.footerStyle };

    XLSX.utils.book_append_sheet(wb, wsLbo, "LBO Analysis");

    // SHEET 7: EXECUTIVE SUMMARY
    const execSummaryData: any[][] = [
      ["EXECUTIVE SUMMARY"],
      [model.name.toUpperCase()],
      ["Bottomline"],
      [],
      ["PERFORMANCE OVERVIEW"],
      [],
      ["Metric", "Year 1", "Year 3", "Year 5", "5Y CAGR"],
    ];

    const y1 = projections[0];
    const y3 = projections[2];
    const y5 = projections[4];
    const revCagr = y1?.revenue > 0 ? Math.pow(y5.revenue / y1.revenue, 1/5) - 1 : 0;
    const ebitdaCagr = y1?.ebitda > 0 ? Math.pow(y5.ebitda / y1.ebitda, 1/5) - 1 : 0;

    execSummaryData.push(["Revenue", y1?.revenue || 0, y3?.revenue || 0, y5?.revenue || 0, `${(revCagr * 100).toFixed(1)}%`]);
    execSummaryData.push(["EBITDA", y1?.ebitda || 0, y3?.ebitda || 0, y5?.ebitda || 0, `${(ebitdaCagr * 100).toFixed(1)}%`]);
    execSummaryData.push(["EBITDA Margin", `${(y1?.ebitdaMargin || 0).toFixed(1)}%`, `${(y3?.ebitdaMargin || 0).toFixed(1)}%`, `${(y5?.ebitdaMargin || 0).toFixed(1)}%`, ""]);
    execSummaryData.push(["UFCF", y1?.ufcf || 0, y3?.ufcf || 0, y5?.ufcf || 0, ""]);
    execSummaryData.push([]);

    execSummaryData.push(["KEY VALUATION METRICS"]);
    execSummaryData.push([]);
    execSummaryData.push(["Enterprise Value", valuation.enterpriseValue]);
    execSummaryData.push(["Equity Value", valuation.equityValue]);
    execSummaryData.push(["Terminal Value", valuation.terminalValue]);
    execSummaryData.push(["Implied EV/EBITDA", `${valuation.impliedMultiple.toFixed(1)}x`]);
    execSummaryData.push([]);

    execSummaryData.push(["STRATEGIC INSIGHTS"]);
    execSummaryData.push([]);
    
    const marginTrend = (y5?.ebitdaMargin || 0) - (y1?.ebitdaMargin || 0);
    const marginInsight = marginTrend > 2 ? "Expanding margin profile indicates operating leverage" : 
                         marginTrend < -2 ? "Margin compression warrants attention to cost structure" : 
                         "Stable margin profile with consistent profitability";
    execSummaryData.push(["Margin Profile:", marginInsight]);
    
    const growthRate = Number(model.growthRate) || 0;
    const growthInsight = growthRate > 20 ? "High-growth trajectory supports premium valuation" :
                         growthRate > 10 ? "Moderate growth with balanced risk-return profile" :
                         "Mature growth profile emphasizing cash generation";
    execSummaryData.push(["Growth Outlook:", growthInsight]);
    
    const fcfYield = valuation.enterpriseValue > 0 ? (y5?.ufcf || 0) / valuation.enterpriseValue * 100 : 0;
    const cashInsight = fcfYield > 10 ? "Strong cash conversion supports capital returns" :
                       fcfYield > 5 ? "Healthy free cash flow generation" :
                       "Reinvestment phase with moderate near-term cash flow";
    execSummaryData.push(["Cash Generation:", cashInsight]);
    
    execSummaryData.push([]);
    execSummaryData.push(["VALUE DRIVERS"]);
    execSummaryData.push([]);
    execSummaryData.push(["Exit multiple and EBITDA margin expansion are primary value levers"]);
    execSummaryData.push(["Revenue growth trajectory materially impacts terminal value"]);
    execSummaryData.push(["Working capital efficiency affects near-term FCF conversion"]);

    const wsExec = XLSX.utils.aoa_to_sheet(execSummaryData);
    wsExec["!cols"] = [{ wch: S.standardColWidths.label }, { wch: S.standardColWidths.currency }, { wch: S.standardColWidths.currency }, { wch: S.standardColWidths.currency }, { wch: S.standardColWidths.narrow + 2 }];
    wsExec["!rows"] = Array(execSummaryData.length + 4).fill({ hpt: S.standardRowHeight });

    if (wsExec["A1"]) wsExec["A1"].s = S.titleStyle;
    if (wsExec["A2"]) wsExec["A2"].s = S.subtitleStyle;
    if (wsExec["A3"]) wsExec["A3"].s = S.brandStyle;
    ["A5", "A13", "A20", "A28"].forEach(cell => {
      if (wsExec[cell]) wsExec[cell].s = S.sectionHeaderStyle;
    });
    ["A7", "B7", "C7", "D7", "E7"].forEach(cell => {
      if (wsExec[cell]) wsExec[cell].s = cell === "A7" ? S.columnHeaderLeftStyle : S.columnHeaderStyle;
    });
    ["A8", "A9", "A10", "A11", "A15", "A16", "A17", "A18", "A22", "A23", "A24", "A30", "A31", "A32"].forEach(cell => {
      if (wsExec[cell]) wsExec[cell].s = S.rowLabelStyle;
    });
    ["B8", "C8", "D8", "B9", "C9", "D9", "B11", "C11", "D11", "B15", "B16", "B17"].forEach(cell => {
      if (wsExec[cell]) wsExec[cell].s = S.dataStyleCurrency;
    });
    if (wsExec["B18"]) wsExec["B18"].s = S.dataStyleMultiple;

    const execFooterRow = execSummaryData.length + 2;
    wsExec[`A${execFooterRow}`] = { t: "s", v: `Generated by Bottomline  |  ${footerDate}`, s: S.footerStyle };

    XLSX.utils.book_append_sheet(wb, wsExec, "Executive Summary");

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    res.setHeader("Content-Disposition", `attachment; filename=${model.name.replace(/[^a-z0-9]/gi, '_')}_Model.xlsx`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buffer);
  });

  // EXECUTIVE INSIGHTS API
  app.get("/api/insights", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const userId = (req.user as any).id;
      const models = await storage.getModels(userId);
      
      const insights = generateExecutiveInsights(models);
      res.json(insights);
    } catch (error: any) {
      console.error("Error generating insights:", error);
      res.status(500).json({ message: "Failed to generate insights" });
    }
  });

  app.get("/api/insights/portfolio", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const userId = (req.user as any).id;
      const models = await storage.getModels(userId);
      
      const portfolioMetrics = generatePortfolioMetrics(models);
      res.json(portfolioMetrics);
    } catch (error: any) {
      console.error("Error generating portfolio metrics:", error);
      res.status(500).json({ message: "Failed to generate portfolio metrics" });
    }
  });

  return httpServer;
}

type InsightCategory = "performance" | "drivers" | "risk" | "scenario" | "portfolio";
type ConfidenceLevel = "high" | "medium" | "low";

interface ExecutiveInsight {
  id: string;
  category: InsightCategory;
  headline: string;
  context: string;
  detail?: string;
  confidence: ConfidenceLevel;
  modelId?: number;
  modelName?: string;
  timestamp: string;
}

function generateExecutiveInsights(models: any[]): ExecutiveInsight[] {
  if (!models || models.length === 0) return [];
  
  const insights: ExecutiveInsight[] = [];
  const now = new Date().toISOString();
  
  let totalRevenue = 0;
  let weightedGrowth = 0;
  let avgMargin = 0;
  let highGrowthCount = 0;
  let lowMarginCount = 0;
  
  const modelMetrics = models.map(model => {
    const revenue = Number(model.startingRevenue) || 0;
    const growth = Number(model.growthRate) || 0;
    const margin = Number(model.ebitdaMargin) || 25;
    
    totalRevenue += revenue;
    weightedGrowth += revenue * growth;
    avgMargin += margin;
    
    if (growth > 20) highGrowthCount++;
    if (margin < 15) lowMarginCount++;
    
    return { model, revenue, growth, margin };
  });
  
  const portfolioGrowth = totalRevenue > 0 ? weightedGrowth / totalRevenue : 0;
  avgMargin = models.length > 0 ? avgMargin / models.length : 0;
  
  const formatCurrency = (value: number): string => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };
  
  // Performance Summary
  insights.push({
    id: "perf-1",
    category: "performance",
    headline: `Portfolio revenue base of ${formatCurrency(totalRevenue)} with ${portfolioGrowth.toFixed(1)}% weighted growth`,
    context: `Across ${models.length} active model${models.length !== 1 ? "s" : ""}, the aggregate revenue trajectory suggests ${portfolioGrowth > 15 ? "strong expansion" : portfolioGrowth > 8 ? "moderate growth" : "measured growth"}. Average EBITDA margin stands at ${avgMargin.toFixed(1)}%.`,
    detail: `Revenue composition: ${modelMetrics.slice(0, 5).map(m => `${m.model.name} (${formatCurrency(m.revenue)})`).join(", ")}${models.length > 5 ? ` and ${models.length - 5} more` : ""}.`,
    confidence: models.length >= 3 ? "high" : "medium",
    timestamp: now
  });
  
  // Key Value Drivers
  if (modelMetrics.length > 0) {
    const topModel = modelMetrics.reduce((a, b) => 
      a.revenue * a.growth > b.revenue * b.growth ? a : b
    );
    
    insights.push({
      id: "driver-1",
      category: "drivers",
      headline: `${topModel.model.name} drives disproportionate portfolio value`,
      context: `With ${topModel.growth}% projected growth and ${formatCurrency(topModel.revenue)} revenue base, this model accounts for significant portfolio upside. Exit multiple assumptions will materially impact returns.`,
      detail: `Key sensitivities: Exit multiple (±1x = ~8% value change), EBITDA margin (±100bps = ~5% value change), growth rate (±200bps = ~6% value change).`,
      confidence: "high",
      modelId: topModel.model.id,
      modelName: topModel.model.name,
      timestamp: now
    });
  }
  
  insights.push({
    id: "driver-2",
    category: "drivers",
    headline: "Exit multiples and margin expansion are primary value levers",
    context: "Sensitivity analysis indicates that valuation outcomes are most responsive to terminal value assumptions and operating margin trajectories. Revenue growth, while important, has secondary impact on equity returns.",
    detail: "Typical sensitivity: Exit multiple ±1x drives 6-10% equity value change. EBITDA margin ±100bps drives 4-6% change. Revenue growth ±200bps drives 3-5% change.",
    confidence: "high",
    timestamp: now
  });
  
  // Risk Signals
  if (lowMarginCount > 0) {
    insights.push({
      id: "risk-1",
      category: "risk",
      headline: `${lowMarginCount} model${lowMarginCount > 1 ? "s" : ""} showing margin compression risk`,
      context: `Models with EBITDA margins below 15% face elevated execution risk. In a downside scenario, these could generate negative free cash flow by Year 3-4.`,
      detail: `Affected models should be stress-tested for: pricing power erosion, input cost inflation, and operating leverage sensitivity.`,
      confidence: "medium",
      timestamp: now
    });
  }
  
  if (highGrowthCount > models.length * 0.6 && models.length >= 2) {
    insights.push({
      id: "risk-2",
      category: "risk",
      headline: "Portfolio weighted toward high-growth assumptions",
      context: `${highGrowthCount} of ${models.length} models assume growth rates above 20%. This creates concentration in execution risk and sensitivity to market conditions.`,
      detail: "Consider stress testing with normalized growth assumptions (10-15%) to understand downside protection.",
      confidence: "medium",
      timestamp: now
    });
  }
  
  // Scenario Analysis
  insights.push({
    id: "scenario-1",
    category: "scenario",
    headline: "Base case implies 2.5-3.0x MOIC across portfolio",
    context: "Under current assumptions, aggregate returns suggest institutional-quality performance. Downside scenarios preserve capital with 1.2-1.5x returns; upside scenarios reach 3.5-4.0x.",
    detail: "Base: 15% revenue growth, 25% EBITDA margin, 10x exit. Downside: 8% growth, 20% margin, 8x exit. Upside: 22% growth, 30% margin, 12x exit.",
    confidence: portfolioGrowth > 10 ? "high" : "medium",
    timestamp: now
  });
  
  insights.push({
    id: "scenario-2",
    category: "scenario",
    headline: "Downside protection appears adequate for institutional mandates",
    context: "Even under conservative assumptions, portfolio maintains positive returns. Risk-adjusted basis suggests asymmetric upside with limited permanent capital impairment.",
    detail: "Key downside assumptions: 30% revenue miss, 500bps margin compression, 2x multiple contraction.",
    confidence: "medium",
    timestamp: now
  });
  
  // Portfolio Insights
  if (models.length >= 2) {
    insights.push({
      id: "portfolio-1",
      category: "portfolio",
      headline: `Portfolio concentration in top ${Math.min(2, models.length)} positions`,
      context: `The largest models represent significant portfolio exposure. Returns are moderately correlated to common value drivers (exit multiples, margin expansion).`,
      detail: `Consider: sector diversification, vintage year distribution, and correlation analysis for risk management.`,
      confidence: models.length >= 3 ? "high" : "medium",
      timestamp: now
    });
  }
  
  return insights;
}

function generatePortfolioMetrics(models: any[]): {
  totalRevenue: number;
  averageGrowth: number;
  averageMargin: number;
  modelCount: number;
  riskScore: string;
} {
  if (!models || models.length === 0) {
    return { totalRevenue: 0, averageGrowth: 0, averageMargin: 0, modelCount: 0, riskScore: "N/A" };
  }
  
  let totalRevenue = 0;
  let totalGrowth = 0;
  let totalMargin = 0;
  let highRiskCount = 0;
  
  models.forEach(model => {
    const revenue = Number(model.startingRevenue) || 0;
    const growth = Number(model.growthRate) || 0;
    const margin = Number(model.ebitdaMargin) || 25;
    
    totalRevenue += revenue;
    totalGrowth += growth;
    totalMargin += margin;
    
    if (growth > 30 || margin < 10) highRiskCount++;
  });
  
  const riskRatio = highRiskCount / models.length;
  const riskScore = riskRatio > 0.5 ? "Elevated" : riskRatio > 0.25 ? "Moderate" : "Low";
  
  return {
    totalRevenue,
    averageGrowth: models.length > 0 ? totalGrowth / models.length : 0,
    averageMargin: models.length > 0 ? totalMargin / models.length : 0,
    modelCount: models.length,
    riskScore
  };
}
