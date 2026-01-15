import { useState, useMemo } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/Layout";
import { useFinancialModels } from "@/hooks/use-financial-models";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TrendingUp,
  BarChart3,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Calculator,
  Layers,
  Activity,
  AlertTriangle
} from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area } from "recharts";
import type { FinancialModel } from "@shared/schema";

interface SensitivityResult {
  wacc: number;
  terminalGrowth: number;
  enterpriseValue: number;
}

function calculateProjections(model: FinancialModel) {
  const projections = [];
  let revenue = Number(model.startingRevenue);
  const growthRate = Number(model.growthRate) / 100;
  const cogsMargin = Number(model.cogsMargin) / 100;
  const opexMargin = Number(model.opexMargin) / 100;
  const daMargin = Number(model.daMargin || 5) / 100;
  const taxRate = Number(model.taxRate) / 100;
  const wacc = Number(model.wacc || 10) / 100;

  for (let year = 1; year <= 5; year++) {
    if (year > 1) revenue *= (1 + growthRate);
    const cogs = revenue * cogsMargin;
    const grossProfit = revenue - cogs;
    const opex = revenue * opexMargin;
    const ebitda = grossProfit - opex;
    const da = revenue * daMargin;
    const ebit = ebitda - da;
    const interest = Number(model.debtBalance || 0) * (Number(model.interestRate || 5) / 100);
    const ebt = ebit - interest;
    const tax = Math.max(0, ebt * taxRate);
    const netIncome = ebt - tax;
    const fcf = ebitda - tax - (revenue * 0.05);
    const discountFactor = Math.pow(1 + wacc, year);
    const pvOfFcf = fcf / discountFactor;

    projections.push({
      year,
      revenue,
      cogs,
      grossProfit,
      opex,
      ebitda,
      da,
      ebit,
      interest,
      ebt,
      tax,
      netIncome,
      fcf,
      discountFactor,
      pvOfFcf,
      ebitdaMargin: (ebitda / revenue) * 100,
      netMargin: (netIncome / revenue) * 100
    });
  }
  return projections;
}

function calculateDCFValue(model: FinancialModel, wacc: number, terminalGrowth: number) {
  const projections = calculateProjections(model);
  const terminalFcf = projections[4].fcf;
  const terminalValue = (terminalFcf * (1 + terminalGrowth)) / (wacc - terminalGrowth);
  const pvTerminal = terminalValue / Math.pow(1 + wacc, 5);
  const sumPvFcf = projections.reduce((sum, p) => sum + p.pvOfFcf, 0);
  return sumPvFcf + pvTerminal;
}

export default function Analysis() {
  const { data: models, isLoading } = useFinancialModels();
  const [selectedModelId, setSelectedModelId] = useState<string>("");
  
  const selectedModel = useMemo(() => {
    if (!models || !selectedModelId) return null;
    return models.find(m => m.id === Number(selectedModelId));
  }, [models, selectedModelId]);

  const projections = useMemo(() => {
    if (!selectedModel) return [];
    return calculateProjections(selectedModel);
  }, [selectedModel]);

  const sensitivityMatrix = useMemo((): SensitivityResult[][] => {
    if (!selectedModel) return [];
    const waccRange = [-0.02, -0.01, 0, 0.01, 0.02];
    const terminalRange = [-0.01, -0.005, 0, 0.005, 0.01];
    const baseWacc = Number(selectedModel.wacc || 10) / 100;
    const baseTerminal = Number(selectedModel.terminalGrowthRate || 2) / 100;
    
    return waccRange.map(waccDelta => 
      terminalRange.map(termDelta => ({
        wacc: baseWacc + waccDelta,
        terminalGrowth: baseTerminal + termDelta,
        enterpriseValue: calculateDCFValue(selectedModel, baseWacc + waccDelta, baseTerminal + termDelta)
      }))
    );
  }, [selectedModel]);

  const chartData = useMemo(() => {
    return projections.map(p => ({
      year: `Year ${p.year}`,
      revenue: p.revenue / 1000000,
      ebitda: p.ebitda / 1000000,
      netIncome: p.netIncome / 1000000,
      fcf: p.fcf / 1000000
    }));
  }, [projections]);

  const marginData = useMemo(() => {
    return projections.map(p => ({
      year: `Year ${p.year}`,
      ebitdaMargin: p.ebitdaMargin,
      netMargin: p.netMargin,
      grossMargin: (p.grossProfit / p.revenue) * 100
    }));
  }, [projections]);

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1
  });

  const percentFormatter = (value: number) => `${value.toFixed(1)}%`;

  if (isLoading) {
    return (
      <Layout>
        <div className="h-64 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 pb-6 border-b">
          <div className="space-y-1">
            <h1 className="text-4xl font-bold tracking-tight">Analysis</h1>
            <p className="text-muted-foreground text-lg">
              Run sensitivity analysis and compare valuation methodologies
            </p>
          </div>
          
          <Select value={selectedModelId} onValueChange={setSelectedModelId}>
            <SelectTrigger className="w-[280px] h-12" data-testid="select-model">
              <Layers className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Select a model to analyze" />
            </SelectTrigger>
            <SelectContent>
              {models?.map(model => (
                <SelectItem key={model.id} value={String(model.id)}>
                  {model.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!selectedModel ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <Calculator className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-bold mb-2">Select a Model</h3>
              <p className="text-muted-foreground mb-6">
                Choose a financial model from the dropdown to begin analysis
              </p>
              {!models?.length && (
                <Link href="/dashboard">
                  <Button variant="outline">Create Your First Model</Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
              <TabsTrigger value="overview" data-testid="tab-overview">
                <Activity className="h-4 w-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="projections" data-testid="tab-projections">
                <BarChart3 className="h-4 w-4 mr-2" />
                Projections
              </TabsTrigger>
              <TabsTrigger value="sensitivity" data-testid="tab-sensitivity">
                <Target className="h-4 w-4 mr-2" />
                Sensitivity
              </TabsTrigger>
              <TabsTrigger value="comparison" data-testid="tab-comparison">
                <Layers className="h-4 w-4 mr-2" />
                Compare
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="border-primary/5">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Year 5 Revenue</p>
                        <p className="text-2xl font-bold font-mono mt-1">
                          {formatter.format(projections[4]?.revenue || 0)}
                        </p>
                      </div>
                      <div className="h-12 w-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                        <ArrowUpRight className="h-6 w-6 text-green-600" />
                      </div>
                    </div>
                    <div className="mt-4 flex items-center text-sm">
                      <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                        +{selectedModel.growthRate}% CAGR
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-primary/5">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Year 5 EBITDA</p>
                        <p className="text-2xl font-bold font-mono mt-1">
                          {formatter.format(projections[4]?.ebitda || 0)}
                        </p>
                      </div>
                      <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                        <BarChart3 className="h-6 w-6 text-blue-600" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">EBITDA Margin</span>
                        <span className="font-bold">{projections[4]?.ebitdaMargin.toFixed(1)}%</span>
                      </div>
                      <Progress value={projections[4]?.ebitdaMargin || 0} className="h-2" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-primary/5">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Sum of FCF</p>
                        <p className="text-2xl font-bold font-mono mt-1">
                          {formatter.format(projections.reduce((s, p) => s + p.fcf, 0))}
                        </p>
                      </div>
                      <div className="h-12 w-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                        <TrendingUp className="h-6 w-6 text-purple-600" />
                      </div>
                    </div>
                    <div className="mt-4 flex items-center text-xs text-muted-foreground">
                      <span>5-Year Cumulative Free Cash Flow</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-primary/5">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">DCF Value</p>
                        <p className="text-2xl font-bold font-mono mt-1">
                          {formatter.format(calculateDCFValue(selectedModel, Number(selectedModel.wacc || 10) / 100, Number(selectedModel.terminalGrowthRate || 2) / 100))}
                        </p>
                      </div>
                      <div className="h-12 w-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
                        <Target className="h-6 w-6 text-amber-600" />
                      </div>
                    </div>
                    <div className="mt-4 flex items-center text-xs text-muted-foreground">
                      <span>WACC: {selectedModel.wacc}% | TGR: {selectedModel.terminalGrowthRate}%</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-primary/5">
                <CardHeader>
                  <CardTitle>Revenue & Profitability Trajectory</CardTitle>
                  <CardDescription>5-year projections in millions USD</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorEbitda" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="year" className="text-xs" />
                        <YAxis className="text-xs" tickFormatter={(v) => `$${v}M`} />
                        <Tooltip 
                          formatter={(value: number) => [`$${value.toFixed(1)}M`]}
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="revenue" 
                          stroke="hsl(var(--primary))" 
                          fill="url(#colorRevenue)"
                          strokeWidth={2}
                          name="Revenue"
                        />
                        <Area 
                          type="monotone" 
                          dataKey="ebitda" 
                          stroke="#22c55e" 
                          fill="url(#colorEbitda)"
                          strokeWidth={2}
                          name="EBITDA"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="projections" className="space-y-6">
              <Card className="overflow-hidden border-primary/5">
                <CardHeader>
                  <CardTitle>Detailed Financial Projections</CardTitle>
                  <CardDescription>Annual income statement breakdown</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="font-black text-xs uppercase">Metric</TableHead>
                          {projections.map(p => (
                            <TableHead key={p.year} className="font-black text-xs uppercase text-right">Year {p.year}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-bold">Revenue</TableCell>
                          {projections.map(p => (
                            <TableCell key={p.year} className="text-right font-mono">{formatter.format(p.revenue)}</TableCell>
                          ))}
                        </TableRow>
                        <TableRow className="bg-muted/10">
                          <TableCell className="pl-6 text-muted-foreground">COGS</TableCell>
                          {projections.map(p => (
                            <TableCell key={p.year} className="text-right font-mono text-muted-foreground">({formatter.format(p.cogs)})</TableCell>
                          ))}
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-bold">Gross Profit</TableCell>
                          {projections.map(p => (
                            <TableCell key={p.year} className="text-right font-mono">{formatter.format(p.grossProfit)}</TableCell>
                          ))}
                        </TableRow>
                        <TableRow className="bg-muted/10">
                          <TableCell className="pl-6 text-muted-foreground">Operating Expenses</TableCell>
                          {projections.map(p => (
                            <TableCell key={p.year} className="text-right font-mono text-muted-foreground">({formatter.format(p.opex)})</TableCell>
                          ))}
                        </TableRow>
                        <TableRow className="bg-blue-50 dark:bg-blue-900/20">
                          <TableCell className="font-bold text-blue-700 dark:text-blue-300">EBITDA</TableCell>
                          {projections.map(p => (
                            <TableCell key={p.year} className="text-right font-mono font-bold text-blue-700 dark:text-blue-300">{formatter.format(p.ebitda)}</TableCell>
                          ))}
                        </TableRow>
                        <TableRow>
                          <TableCell className="pl-6 text-muted-foreground">EBITDA Margin</TableCell>
                          {projections.map(p => (
                            <TableCell key={p.year} className="text-right">{p.ebitdaMargin.toFixed(1)}%</TableCell>
                          ))}
                        </TableRow>
                        <TableRow className="bg-muted/10">
                          <TableCell className="pl-6 text-muted-foreground">D&A</TableCell>
                          {projections.map(p => (
                            <TableCell key={p.year} className="text-right font-mono text-muted-foreground">({formatter.format(p.da)})</TableCell>
                          ))}
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-bold">EBIT</TableCell>
                          {projections.map(p => (
                            <TableCell key={p.year} className="text-right font-mono">{formatter.format(p.ebit)}</TableCell>
                          ))}
                        </TableRow>
                        <TableRow className="bg-muted/10">
                          <TableCell className="pl-6 text-muted-foreground">Interest</TableCell>
                          {projections.map(p => (
                            <TableCell key={p.year} className="text-right font-mono text-muted-foreground">({formatter.format(p.interest)})</TableCell>
                          ))}
                        </TableRow>
                        <TableRow className="bg-muted/10">
                          <TableCell className="pl-6 text-muted-foreground">Taxes</TableCell>
                          {projections.map(p => (
                            <TableCell key={p.year} className="text-right font-mono text-muted-foreground">({formatter.format(p.tax)})</TableCell>
                          ))}
                        </TableRow>
                        <TableRow className="bg-green-50 dark:bg-green-900/20">
                          <TableCell className="font-bold text-green-700 dark:text-green-300">Net Income</TableCell>
                          {projections.map(p => (
                            <TableCell key={p.year} className="text-right font-mono font-bold text-green-700 dark:text-green-300">{formatter.format(p.netIncome)}</TableCell>
                          ))}
                        </TableRow>
                        <TableRow>
                          <TableCell className="pl-6 text-muted-foreground">Net Margin</TableCell>
                          {projections.map(p => (
                            <TableCell key={p.year} className="text-right">{p.netMargin.toFixed(1)}%</TableCell>
                          ))}
                        </TableRow>
                        <TableRow className="border-t-2 bg-purple-50 dark:bg-purple-900/20">
                          <TableCell className="font-bold text-purple-700 dark:text-purple-300">Free Cash Flow</TableCell>
                          {projections.map(p => (
                            <TableCell key={p.year} className="text-right font-mono font-bold text-purple-700 dark:text-purple-300">{formatter.format(p.fcf)}</TableCell>
                          ))}
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-primary/5">
                <CardHeader>
                  <CardTitle>Margin Analysis</CardTitle>
                  <CardDescription>Profitability metrics over projection period</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={marginData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="year" className="text-xs" />
                        <YAxis className="text-xs" tickFormatter={percentFormatter} />
                        <Tooltip 
                          formatter={(value: number) => [`${value.toFixed(1)}%`]}
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Line type="monotone" dataKey="grossMargin" stroke="#6366f1" strokeWidth={2} dot={false} name="Gross Margin" />
                        <Line type="monotone" dataKey="ebitdaMargin" stroke="#22c55e" strokeWidth={2} dot={false} name="EBITDA Margin" />
                        <Line type="monotone" dataKey="netMargin" stroke="#f59e0b" strokeWidth={2} dot={false} name="Net Margin" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sensitivity" className="space-y-6">
              <Card className="border-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    DCF Sensitivity Matrix
                  </CardTitle>
                  <CardDescription>
                    Enterprise value sensitivity to WACC and Terminal Growth Rate changes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="font-black text-xs uppercase">
                            WACC \ TGR
                          </TableHead>
                          {sensitivityMatrix[0]?.map((_, colIdx) => {
                            const tgr = sensitivityMatrix[0][colIdx].terminalGrowth;
                            return (
                              <TableHead key={colIdx} className="font-black text-xs uppercase text-center">
                                {(tgr * 100).toFixed(1)}%
                              </TableHead>
                            );
                          })}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sensitivityMatrix.map((row, rowIdx) => {
                          const baseWacc = Number(selectedModel.wacc || 10) / 100;
                          const baseTerminal = Number(selectedModel.terminalGrowthRate || 2) / 100;
                          const isBaseRow = Math.abs(row[0].wacc - baseWacc) < 0.001;
                          
                          return (
                            <TableRow key={rowIdx} className={isBaseRow ? "bg-primary/5" : ""}>
                              <TableCell className="font-bold">
                                {(row[0].wacc * 100).toFixed(1)}%
                              </TableCell>
                              {row.map((cell, colIdx) => {
                                const isBaseCell = isBaseRow && Math.abs(cell.terminalGrowth - baseTerminal) < 0.001;
                                const baseValue = calculateDCFValue(selectedModel, baseWacc, baseTerminal);
                                const diff = ((cell.enterpriseValue - baseValue) / baseValue) * 100;
                                
                                return (
                                  <TableCell 
                                    key={colIdx} 
                                    className={`text-center font-mono ${isBaseCell ? "bg-primary/10 font-bold" : ""}`}
                                  >
                                    <div>{formatter.format(cell.enterpriseValue)}</div>
                                    {!isBaseCell && (
                                      <div className={`text-xs ${diff >= 0 ? "text-green-600" : "text-red-600"}`}>
                                        {diff >= 0 ? "+" : ""}{diff.toFixed(1)}%
                                      </div>
                                    )}
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="mt-4 p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      The highlighted cell represents the base case valuation using current model assumptions 
                      (WACC: {selectedModel.wacc}%, Terminal Growth: {selectedModel.terminalGrowthRate}%). 
                      Percentage changes show deviation from the base case.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="comparison" className="space-y-6">
              <Card className="border-primary/5">
                <CardHeader>
                  <CardTitle>Valuation Methodology Comparison</CardTitle>
                  <CardDescription>Compare different valuation approaches for {selectedModel.name}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="border-2 border-primary/20">
                      <CardHeader className="pb-2">
                        <Badge className="w-fit mb-2">DCF Analysis</Badge>
                        <CardTitle className="text-2xl font-mono">
                          {formatter.format(calculateDCFValue(selectedModel, Number(selectedModel.wacc || 10) / 100, Number(selectedModel.terminalGrowthRate || 2) / 100))}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                          <li className="flex justify-between">
                            <span>WACC</span>
                            <span className="font-mono">{selectedModel.wacc}%</span>
                          </li>
                          <li className="flex justify-between">
                            <span>Terminal Growth</span>
                            <span className="font-mono">{selectedModel.terminalGrowthRate}%</span>
                          </li>
                          <li className="flex justify-between">
                            <span>Exit Multiple</span>
                            <span className="font-mono">{selectedModel.exitMultiple}x</span>
                          </li>
                        </ul>
                      </CardContent>
                    </Card>

                    <Card className="border-2 border-blue-200 dark:border-blue-800">
                      <CardHeader className="pb-2">
                        <Badge variant="secondary" className="w-fit mb-2">Multiple-Based</Badge>
                        <CardTitle className="text-2xl font-mono">
                          {formatter.format(projections[4]?.ebitda * Number(selectedModel.exitMultiple || 12))}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                          <li className="flex justify-between">
                            <span>Year 5 EBITDA</span>
                            <span className="font-mono">{formatter.format(projections[4]?.ebitda)}</span>
                          </li>
                          <li className="flex justify-between">
                            <span>Exit Multiple</span>
                            <span className="font-mono">{selectedModel.exitMultiple}x</span>
                          </li>
                          <li className="flex justify-between">
                            <span>Method</span>
                            <span>EV/EBITDA</span>
                          </li>
                        </ul>
                      </CardContent>
                    </Card>

                    <Card className="border-2 border-purple-200 dark:border-purple-800">
                      <CardHeader className="pb-2">
                        <Badge variant="outline" className="w-fit mb-2">Revenue Multiple</Badge>
                        <CardTitle className="text-2xl font-mono">
                          {formatter.format(projections[4]?.revenue * 3)}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                          <li className="flex justify-between">
                            <span>Year 5 Revenue</span>
                            <span className="font-mono">{formatter.format(projections[4]?.revenue)}</span>
                          </li>
                          <li className="flex justify-between">
                            <span>Multiple</span>
                            <span className="font-mono">3.0x</span>
                          </li>
                          <li className="flex justify-between">
                            <span>Method</span>
                            <span>EV/Revenue</span>
                          </li>
                        </ul>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </Layout>
  );
}
