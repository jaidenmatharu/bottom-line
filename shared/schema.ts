import { pgTable, text, serial, integer, boolean, timestamp, jsonb, decimal } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
export * from "./models/auth";
import { users } from "./models/auth";

// === TABLE DEFINITIONS ===
export const financialModels = pgTable("financial_models", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  
  // Bulge Bracket Standard Inputs
  currency: text("currency").default("USD"),
  
  // Revenue Build
  startingRevenue: decimal("starting_revenue", { precision: 20, scale: 2 }).notNull(),
  growthRate: decimal("growth_rate", { precision: 5, scale: 2 }).notNull(), 
  
  // Margin Analysis
  cogsMargin: decimal("cogs_margin", { precision: 5, scale: 2 }).notNull(),
  opexMargin: decimal("opex_margin", { precision: 5, scale: 2 }).notNull(),
  daMargin: decimal("da_margin", { precision: 5, scale: 2 }).default("5.00"),
  
  // Working Capital (NWC) - Industry Standard
  arDays: decimal("ar_days", { precision: 5, scale: 2 }).default("45.00"),
  inventoryDays: decimal("inventory_days", { precision: 5, scale: 2 }).default("60.00"),
  apDays: decimal("ap_days", { precision: 5, scale: 2 }).default("30.00"),
  
  // CapEx Schedule
  capexPercent: decimal("capex_percent", { precision: 5, scale: 2 }).default("5.00"),
  maintenanceCapexPercent: decimal("maintenance_capex_percent", { precision: 5, scale: 2 }).default("2.00"),
  
  // Capital Structure
  interestRate: decimal("interest_rate", { precision: 5, scale: 2 }).default("5.00"),
  debtBalance: decimal("debt_balance", { precision: 20, scale: 2 }).default("0.00"),
  cashBalance: decimal("cash_balance", { precision: 20, scale: 2 }).default("0.00"),
  sharesOutstanding: decimal("shares_outstanding", { precision: 20, scale: 2 }).default("1000000.00"),
  
  // Valuation Inputs (DCF)
  wacc: decimal("wacc", { precision: 5, scale: 2 }).default("10.00"),
  terminalGrowthRate: decimal("terminal_growth_rate", { precision: 5, scale: 2 }).default("2.00"),
  exitMultiple: decimal("exit_multiple", { precision: 5, scale: 2 }).default("12.00"),
  useMidYearConvention: boolean("use_mid_year_convention").default(true),
  
  // Trading Comps Inputs (JSON array of {companyName, revenue, ebitda, netIncome, ev, marketCap})
  tradingComps: jsonb("trading_comps").default([]),
  
  // Tax
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).notNull(),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  theme: text("theme").default("light"),
  tableDensity: text("table_density").default("normal"),
  defaultCurrency: text("default_currency").default("USD"),
  defaultGrowthRate: decimal("default_growth_rate", { precision: 5, scale: 2 }).default("15.00"),
  defaultWacc: decimal("default_wacc", { precision: 5, scale: 2 }).default("10.00"),
  defaultTaxRate: decimal("default_tax_rate", { precision: 5, scale: 2 }).default("21.00"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const portfolios = pgTable("portfolios", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const portfolioModels = pgTable("portfolio_models", {
  id: serial("id").primaryKey(),
  portfolioId: integer("portfolio_id").notNull(),
  modelId: integer("model_id").notNull(),
});

export const precedentTransactions = pgTable("precedent_transactions", {
  id: serial("id").primaryKey(),
  modelId: integer("model_id").notNull(),
  targetName: text("target_name").notNull(),
  acquirerName: text("acquirer_name"),
  transactionDate: text("transaction_date"),
  transactionValue: decimal("transaction_value", { precision: 20, scale: 2 }),
  targetRevenue: decimal("target_revenue", { precision: 20, scale: 2 }),
  targetEbitda: decimal("target_ebitda", { precision: 20, scale: 2 }),
  evRevenue: decimal("ev_revenue", { precision: 5, scale: 2 }),
  evEbitda: decimal("ev_ebitda", { precision: 5, scale: 2 }),
});

export const lboAssumptions = pgTable("lbo_assumptions", {
  id: serial("id").primaryKey(),
  modelId: integer("model_id").notNull().unique(),
  entryMultiple: decimal("entry_multiple", { precision: 5, scale: 2 }).default("8.00"),
  exitMultiple: decimal("exit_multiple", { precision: 5, scale: 2 }).default("12.00"),
  holdingPeriod: integer("holding_period").default(5),
  debtPercent: decimal("debt_percent", { precision: 5, scale: 2 }).default("60.00"),
  interestRate: decimal("interest_rate", { precision: 5, scale: 2 }).default("8.00"),
  annualDebtPaydown: decimal("annual_debt_paydown", { precision: 5, scale: 2 }).default("6.00"),
  targetIrr: decimal("target_irr", { precision: 5, scale: 2 }).default("25.00"),
  seniorDebtMultiple: decimal("senior_debt_multiple", { precision: 5, scale: 2 }).default("4.00"),
  mezDebtMultiple: decimal("mez_debt_multiple", { precision: 5, scale: 2 }).default("1.00"),
  seniorDebtRate: decimal("senior_debt_rate", { precision: 5, scale: 2 }).default("6.00"),
  mezDebtRate: decimal("mez_debt_rate", { precision: 5, scale: 2 }).default("12.00"),
  managementRollover: decimal("management_rollover", { precision: 5, scale: 2 }).default("10.00"),
});

export const scenarios = pgTable("scenarios", {
  id: serial("id").primaryKey(),
  modelId: integer("model_id").notNull(),
  name: text("name").notNull(),
  growthRateOverride: decimal("growth_rate_override", { precision: 5, scale: 2 }),
  cogsMarginOverride: decimal("cogs_margin_override", { precision: 5, scale: 2 }),
  opexMarginOverride: decimal("opex_margin_override", { precision: 5, scale: 2 }),
  waccOverride: decimal("wacc_override", { precision: 5, scale: 2 }),
  exitMultipleOverride: decimal("exit_multiple_override", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const modelNotes = pgTable("model_notes", {
  id: serial("id").primaryKey(),
  modelId: integer("model_id").notNull(),
  content: text("content").notNull(),
  section: text("section"),
  createdAt: timestamp("created_at").defaultNow(),
});

// === RELATIONS ===
export const financialModelsRelations = relations(financialModels, ({ one, many }) => ({
  user: one(users, {
    fields: [financialModels.userId],
    references: [users.id],
  }),
  lboAssumptions: one(lboAssumptions, {
    fields: [financialModels.id],
    references: [lboAssumptions.modelId],
  }),
  precedentTransactions: many(precedentTransactions),
  scenarios: many(scenarios),
  notes: many(modelNotes),
  portfolioModels: many(portfolioModels),
}));

export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
  user: one(users, {
    fields: [userPreferences.userId],
    references: [users.id],
  }),
}));

export const portfoliosRelations = relations(portfolios, ({ one, many }) => ({
  user: one(users, {
    fields: [portfolios.userId],
    references: [users.id],
  }),
  portfolioModels: many(portfolioModels),
}));

export const portfolioModelsRelations = relations(portfolioModels, ({ one }) => ({
  portfolio: one(portfolios, {
    fields: [portfolioModels.portfolioId],
    references: [portfolios.id],
  }),
  model: one(financialModels, {
    fields: [portfolioModels.modelId],
    references: [financialModels.id],
  }),
}));

export const precedentTransactionsRelations = relations(precedentTransactions, ({ one }) => ({
  model: one(financialModels, {
    fields: [precedentTransactions.modelId],
    references: [financialModels.id],
  }),
}));

export const lboAssumptionsRelations = relations(lboAssumptions, ({ one }) => ({
  model: one(financialModels, {
    fields: [lboAssumptions.modelId],
    references: [financialModels.id],
  }),
}));

export const scenariosRelations = relations(scenarios, ({ one }) => ({
  model: one(financialModels, {
    fields: [scenarios.modelId],
    references: [financialModels.id],
  }),
}));

export const modelNotesRelations = relations(modelNotes, ({ one }) => ({
  model: one(financialModels, {
    fields: [modelNotes.modelId],
    references: [financialModels.id],
  }),
}));

// === BASE SCHEMAS ===
export const insertFinancialModelSchema = createInsertSchema(financialModels).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true,
  userId: true 
});

export const insertUserPreferencesSchema = createInsertSchema(userPreferences).omit({
  id: true,
  updatedAt: true,
});

export const insertPortfolioSchema = createInsertSchema(portfolios).omit({
  id: true,
  createdAt: true,
  userId: true,
});

export const insertPortfolioModelSchema = createInsertSchema(portfolioModels).omit({
  id: true,
});

export const insertPrecedentTransactionSchema = createInsertSchema(precedentTransactions).omit({
  id: true,
});

export const insertLboAssumptionsSchema = createInsertSchema(lboAssumptions).omit({
  id: true,
});

export const insertScenarioSchema = createInsertSchema(scenarios).omit({
  id: true,
  createdAt: true,
});

export const insertModelNoteSchema = createInsertSchema(modelNotes).omit({
  id: true,
  createdAt: true,
});

// === EXPLICIT API CONTRACT TYPES ===
export type FinancialModel = typeof financialModels.$inferSelect;
export type InsertFinancialModel = z.infer<typeof insertFinancialModelSchema>;

export type UserPreferences = typeof userPreferences.$inferSelect;
export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;

export type Portfolio = typeof portfolios.$inferSelect;
export type InsertPortfolio = z.infer<typeof insertPortfolioSchema>;

export type PortfolioModel = typeof portfolioModels.$inferSelect;
export type InsertPortfolioModel = z.infer<typeof insertPortfolioModelSchema>;

export type PrecedentTransaction = typeof precedentTransactions.$inferSelect;
export type InsertPrecedentTransaction = z.infer<typeof insertPrecedentTransactionSchema>;

export type LboAssumptions = typeof lboAssumptions.$inferSelect;
export type InsertLboAssumptions = z.infer<typeof insertLboAssumptionsSchema>;

export type Scenario = typeof scenarios.$inferSelect;
export type InsertScenario = z.infer<typeof insertScenarioSchema>;

export type ModelNote = typeof modelNotes.$inferSelect;
export type InsertModelNote = z.infer<typeof insertModelNoteSchema>;

export interface YearProjection {
  year: number;
  revenue: number;
  cogs: number;
  grossProfit: number;
  opex: number;
  ebitda: number;
  da: number;
  ebit: number;
  interest: number;
  ebt: number;
  tax: number;
  netIncome: number;
  revenueGrowth: number;
  ebitdaMargin: number;
  netMargin: number;
  
  // Working Capital Schedule (Industry Standard)
  accountsReceivable: number;
  inventory: number;
  accountsPayable: number;
  netWorkingCapital: number;
  changeInNwc: number;
  
  // CapEx Schedule
  capex: number;
  maintenanceCapex: number;
  growthCapex: number;
  
  // Unlevered Free Cash Flow (Proper DCF Build)
  nopat: number;         // EBIT * (1 - Tax Rate)
  ufcf: number;          // NOPAT + D&A - ΔNW - CapEx
  
  // Legacy FCF (for backward compatibility)
  fcf: number;
  discountFactor: number;
  pvOfFcf: number;
}

// Sensitivity Analysis Types
export interface SensitivityTable {
  title: string;
  rowLabel: string;
  colLabel: string;
  rowValues: number[];
  colValues: number[];
  data: number[][];
  highlightedRow?: number;
  highlightedCol?: number;
}

export interface SensitivityAnalysis {
  waccVsGrowth: SensitivityTable;
  entryVsExit: SensitivityTable;
  revenueGrowthVsMargin: SensitivityTable;
}

export interface ValuationOutput {
  enterpriseValue: number;
  equityValue: number;
  terminalValue: number;
  impliedMultiple: number;
  // Enhanced DCF fields (Industry Standard)
  terminalValueGordon: number;
  terminalValueExitMultiple: number;
  sumPvFcf: number;
  pvOfTerminalValue: number;
  netDebt: number;
  equityValuePerShare: number;
  sharesOutstanding: number;
}

export interface TradingCompEntry {
  companyName: string;
  revenue: number;
  ebitda: number;
  netIncome: number;
  ev: number;
  marketCap: number;
}

export interface TradingCompsOutput {
  avgEvEbitda: number;
  avgPe: number;
  impliedEv: number;
  impliedEquityValue: number;
}

export interface FinancialModelWithValuation extends FinancialModel {
  projections: YearProjection[];
  valuation: ValuationOutput;
  compsAnalysis: TradingCompsOutput;
}

export type CreateModelRequest = InsertFinancialModel;
export type UpdateModelRequest = Partial<InsertFinancialModel>;
export type ModelsListResponse = FinancialModel[];
export type ModelResponse = FinancialModelWithValuation;

// === CALCULATION BREAKDOWN TYPES ===
export interface BreakdownStep {
  label: string;
  value: number;
  formula?: string;
  operator?: '+' | '-' | '=' | 'x' | '/';
}

export interface MetricBreakdown {
  metricKey: string;
  metricLabel: string;
  finalValue: number;
  steps: BreakdownStep[];
}

export interface YearBreakdowns {
  year: number;
  grossProfit: MetricBreakdown;
  ebitda: MetricBreakdown;
  ebit: MetricBreakdown;
  netIncome: MetricBreakdown;
  ufcf: MetricBreakdown;
}

export interface ValuationBreakdown {
  pvOfFcf: MetricBreakdown;
  terminalValue: MetricBreakdown;
  enterpriseValue: MetricBreakdown;
  equityValue: MetricBreakdown;
}

export interface ModelBreakdowns {
  yearlyBreakdowns: YearBreakdowns[];
  valuationBreakdown: ValuationBreakdown;
}

// === SPREADSHEET VIEW TYPES ===
export interface SpreadsheetCell {
  value: string | number;
  formula?: string;
  format?: CellFormat;
  editable?: boolean;
  rowLabel?: string;
}

export interface CellFormat {
  numberFormat?: 'currency' | 'percent' | 'number' | 'text';
  decimals?: number;
  bold?: boolean;
  italic?: boolean;
  textColor?: string;
  bgColor?: string;
  align?: 'left' | 'center' | 'right';
}

export interface SpreadsheetRow {
  label: string;
  cells: SpreadsheetCell[];
  isHeader?: boolean;
  isSummary?: boolean;
}

export interface SpreadsheetSheet {
  id: string;
  title: string;
  rows: SpreadsheetRow[];
  columnHeaders: string[];
}
