import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { queryClient } from "@/lib/queryClient";
import { 
  Lightbulb,
  RefreshCw,
  Download,
  TrendingUp,
  AlertTriangle,
  Target,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Filter,
  Briefcase
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

type InsightCategory = "performance" | "drivers" | "risk" | "scenario" | "portfolio";
type ConfidenceLevel = "high" | "medium" | "low";
type ViewDepth = "executive" | "detailed";

interface Insight {
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

interface PortfolioMetrics {
  totalRevenue: number;
  averageGrowth: number;
  averageMargin: number;
  modelCount: number;
  riskScore: string;
}

function formatCurrency(value: number): string {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

const categoryConfig: Record<InsightCategory, { label: string; icon: any; color: string }> = {
  performance: { label: "Performance", icon: BarChart3, color: "text-blue-600 dark:text-blue-400" },
  drivers: { label: "Value Drivers", icon: Target, color: "text-emerald-600 dark:text-emerald-400" },
  risk: { label: "Risk Signals", icon: AlertTriangle, color: "text-amber-600 dark:text-amber-400" },
  scenario: { label: "Scenarios", icon: TrendingUp, color: "text-violet-600 dark:text-violet-400" },
  portfolio: { label: "Portfolio", icon: Briefcase, color: "text-cyan-600 dark:text-cyan-400" }
};

const confidenceConfig: Record<ConfidenceLevel, { label: string; variant: "default" | "secondary" | "outline" }> = {
  high: { label: "High Confidence", variant: "default" },
  medium: { label: "Medium Confidence", variant: "secondary" },
  low: { label: "Low Confidence", variant: "outline" }
};

function InsightCard({ insight, viewDepth }: { insight: Insight; viewDepth: ViewDepth }) {
  const [isOpen, setIsOpen] = useState(false);
  const config = categoryConfig[insight.category];
  const Icon = config.icon;
  
  return (
    <Card className="bg-card border border-border" data-testid={`insight-card-${insight.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg bg-muted ${config.color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs">
                  {config.label}
                </Badge>
                <Badge variant={confidenceConfig[insight.confidence].variant} className="text-xs">
                  {confidenceConfig[insight.confidence].label}
                </Badge>
                {insight.modelName && (
                  <Badge variant="outline" className="text-xs bg-primary/5">
                    {insight.modelName}
                  </Badge>
                )}
              </div>
              <CardTitle className="text-base font-semibold leading-snug text-foreground">
                {insight.headline}
              </CardTitle>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground leading-relaxed mb-3">
          {insight.context}
        </p>
        
        {viewDepth === "detailed" && insight.detail && (
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground">
                {isOpen ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
                {isOpen ? "Hide Details" : "Show Details"}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-border/50">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {insight.detail}
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}

export default function ExecutiveInsights() {
  const { data: insights = [], isLoading, error, refetch } = useQuery<Insight[]>({
    queryKey: ['/api/insights'],
  });
  
  const { data: portfolioMetrics, refetch: refetchPortfolio } = useQuery<PortfolioMetrics>({
    queryKey: ['/api/insights/portfolio'],
  });
  
  const [viewDepth, setViewDepth] = useState<ViewDepth>("executive");
  const [categoryFilter, setCategoryFilter] = useState<InsightCategory | "all">("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const filteredInsights = categoryFilter === "all" 
    ? insights 
    : insights.filter(i => i.category === categoryFilter);
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['/api/insights'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/insights/portfolio'] })
    ]);
    await Promise.all([refetch(), refetchPortfolio()]);
    setTimeout(() => setIsRefreshing(false), 500);
  };
  
  const handleExport = () => {
    let portfolioSection = "";
    if (portfolioMetrics) {
      portfolioSection = `## Portfolio Overview\n\n` +
        `- **Total Revenue:** ${formatCurrency(portfolioMetrics.totalRevenue)}\n` +
        `- **Average Growth:** ${portfolioMetrics.averageGrowth.toFixed(1)}%\n` +
        `- **Average Margin:** ${portfolioMetrics.averageMargin.toFixed(1)}%\n` +
        `- **Model Count:** ${portfolioMetrics.modelCount}\n` +
        `- **Risk Assessment:** ${portfolioMetrics.riskScore}\n\n---\n\n`;
    }
    
    const insightsContent = insights.map(i => 
      `## ${categoryConfig[i.category].label}\n\n**${i.headline}**\n\n${i.context}\n\n${i.detail || ""}\n\n---\n`
    ).join("\n");
    
    const content = portfolioSection + insightsContent;
    
    const blob = new Blob([`# Executive Insights Report\n\nGenerated: ${new Date().toLocaleDateString()}\n\n${content}`], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `executive-insights-${new Date().toISOString().split("T")[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pb-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                <Lightbulb className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground" data-testid="text-insights-title">
                  Executive Insights
                </h1>
                <p className="text-sm text-muted-foreground">
                  Strategic intelligence derived from your financial models
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <Select value={viewDepth} onValueChange={(v) => setViewDepth(v as ViewDepth)}>
              <SelectTrigger className="w-[140px] h-10 bg-card border-border" data-testid="select-view-depth">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="executive">Executive View</SelectItem>
                <SelectItem value="detailed">Detailed View</SelectItem>
              </SelectContent>
            </Select>
            
            <Button 
              variant="outline" 
              size="default"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-10"
              data-testid="button-refresh-insights"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            
            <Button 
              variant="default" 
              size="default"
              onClick={handleExport}
              className="h-10"
              data-testid="button-export-insights"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Button
            variant={categoryFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setCategoryFilter("all")}
            className="h-8"
            data-testid="filter-all"
          >
            All Insights
          </Button>
          {(Object.entries(categoryConfig) as [InsightCategory, typeof categoryConfig[InsightCategory]][]).map(([key, config]) => (
            <Button
              key={key}
              variant={categoryFilter === key ? "default" : "outline"}
              size="sm"
              onClick={() => setCategoryFilter(key)}
              className="h-8"
              data-testid={`filter-${key}`}
            >
              <config.icon className="h-3.5 w-3.5 mr-1.5" />
              {config.label}
            </Button>
          ))}
        </div>

        {portfolioMetrics && portfolioMetrics.modelCount > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-card border border-border">
              <CardContent className="pt-4 pb-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Total Revenue</p>
                <p className="text-2xl font-bold text-foreground" data-testid="metric-total-revenue">
                  {formatCurrency(portfolioMetrics.totalRevenue)}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-card border border-border">
              <CardContent className="pt-4 pb-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Avg Growth</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400" data-testid="metric-avg-growth">
                  {portfolioMetrics.averageGrowth.toFixed(1)}%
                </p>
              </CardContent>
            </Card>
            <Card className="bg-card border border-border">
              <CardContent className="pt-4 pb-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Avg Margin</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400" data-testid="metric-avg-margin">
                  {portfolioMetrics.averageMargin.toFixed(1)}%
                </p>
              </CardContent>
            </Card>
            <Card className="bg-card border border-border">
              <CardContent className="pt-4 pb-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Risk Level</p>
                <p className={`text-2xl font-bold ${
                  portfolioMetrics.riskScore === "Low" ? "text-emerald-600 dark:text-emerald-400" :
                  portfolioMetrics.riskScore === "Moderate" ? "text-amber-600 dark:text-amber-400" :
                  "text-red-600 dark:text-red-400"
                }`} data-testid="metric-risk-level">
                  {portfolioMetrics.riskScore}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <Card className="bg-card border border-destructive/30">
            <CardContent className="py-16 text-center">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-destructive/20 to-destructive/10 flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-foreground">Unable to Load Insights</h3>
              <p className="text-muted-foreground max-w-md mx-auto mb-4">
                There was an issue generating your insights. Please try refreshing.
              </p>
              <Button variant="outline" onClick={handleRefresh} data-testid="button-retry">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : filteredInsights.length === 0 ? (
          <Card className="bg-card border border-dashed border-border">
            <CardContent className="py-16 text-center">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mx-auto mb-6">
                <Lightbulb className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-foreground">No Insights Available</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                {insights.length === 0 
                  ? "Create financial models to generate executive insights and strategic recommendations."
                  : "No insights match your current filter. Try selecting a different category."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredInsights.map((insight) => (
              <InsightCard key={insight.id} insight={insight} viewDepth={viewDepth} />
            ))}
          </div>
        )}

        {insights.length > 0 && (
          <div className="text-center pt-4">
            <p className="text-xs text-muted-foreground">
              {insights.length} insight{insights.length !== 1 ? "s" : ""} generated • 
              Last updated: {new Date().toLocaleTimeString()}
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
