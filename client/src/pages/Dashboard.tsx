import { Link } from "wouter";
import { Layout } from "@/components/Layout";
import { useFinancialModels, useDeleteFinancialModel } from "@/hooks/use-financial-models";
import { CreateModelModal } from "@/components/CreateModal";
import { Button } from "@/components/ui/button";
import { 
  Trash2, 
  TrendingUp, 
  ArrowRight,
  FileSpreadsheet,
  Search,
  Clock,
  PieChart,
  Calculator,
  Sparkles,
  Activity,
  Target,
  Zap
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";

function ModelCard({ model }: { model: any }) {
  const { mutate: deleteModel, isPending: isDeleting } = useDeleteFinancialModel();

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1
  });

  return (
    <div className="bg-card border border-border rounded-xl p-6 group hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300" data-testid={`model-card-${model.id}`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold truncate mb-1">{model.name}</h3>
          <p className="text-xs text-muted-foreground truncate">
            {model.description || "Financial model"}
          </p>
        </div>
        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center ml-4 group-hover:from-primary/30 group-hover:to-accent/30 transition-colors">
          <FileSpreadsheet className="h-6 w-6 text-primary" />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-muted/50 dark:bg-white/5 p-3 rounded-lg border border-border/50">
          <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider mb-1">Revenue</p>
          <p className="font-mono font-bold text-base text-foreground">{formatter.format(Number(model.startingRevenue))}</p>
        </div>
        <div className="bg-muted/50 dark:bg-white/5 p-3 rounded-lg border border-border/50">
          <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider mb-1">Growth</p>
          <p className="font-mono font-bold text-base text-emerald-600 dark:text-emerald-400">+{model.growthRate}%</p>
        </div>
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-border/50">
        <div className="flex items-center text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5 mr-1.5" />
          {new Date(model.createdAt).toLocaleDateString()}
        </div>
        
        <div className="flex gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                data-testid={`button-delete-model-${model.id}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-card border border-border">
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Financial Model?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove the model and all associated valuation analysis.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={() => deleteModel(model.id)}
                  className="bg-destructive hover:bg-destructive/90 text-white"
                >
                  {isDeleting ? "Deleting..." : "Confirm Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Link href={`/model/${model.id}`}>
            <Button 
              size="sm" 
              className="h-8 px-4 text-xs font-semibold btn-premium rounded-lg"
              data-testid={`button-view-model-${model.id}`}
            >
              View
              <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function calculatePortfolioStats(models: any[] | null | undefined) {
  if (!models || models.length === 0) {
    return { avgGrowth: 0, avgMultiple: 0, totalRevenue: 0 };
  }

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

  return { avgGrowth, avgMultiple, totalRevenue };
}

function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(value);
}

interface StatCardProps {
  icon: any;
  value: string;
  label: string;
  gradient: string;
  testId: string;
}

function StatCard({ icon: Icon, value, label, gradient, testId }: StatCardProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-6 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300" data-testid={testId}>
      <div className="flex items-start justify-between mb-4">
        <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
      <h3 className="text-3xl md:text-4xl font-bold font-mono text-foreground mb-1">{value}</h3>
      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{label}</p>
    </div>
  );
}

export default function Dashboard() {
  const { data: models, isLoading } = useFinancialModels();
  
  const stats = calculatePortfolioStats(models);

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pb-8">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Activity className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight" data-testid="text-dashboard-title">Command Center</h1>
                <p className="text-sm text-muted-foreground">Manage and analyze your financial models</p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-72 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search models..." 
                className="pl-10 h-11 bg-card border-border focus:border-primary/50 rounded-xl" 
                data-testid="input-search" 
              />
            </div>
            <CreateModelModal />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={PieChart}
            value={models?.length?.toString() || "0"}
            label="Active Models"
            gradient="from-blue-500 to-cyan-500"
            testId="card-model-count"
          />
          <StatCard
            icon={TrendingUp}
            value={models?.length ? `${stats.avgGrowth.toFixed(1)}%` : '--%'}
            label="Avg Growth Rate"
            gradient="from-emerald-500 to-teal-500"
            testId="card-avg-growth"
          />
          <StatCard
            icon={Target}
            value={models?.length ? `${stats.avgMultiple.toFixed(1)}x` : '--x'}
            label="Exit Multiple"
            gradient="from-violet-500 to-purple-500"
            testId="card-avg-multiple"
          />
          <StatCard
            icon={Calculator}
            value={models?.length ? formatCompactCurrency(stats.totalRevenue) : '$0'}
            label="Total Revenue"
            gradient="from-orange-500 to-amber-500"
            testId="card-total-revenue"
          />
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold tracking-tight">Your Models</h2>
              {models && models.length > 0 && (
                <span className="text-xs font-semibold text-muted-foreground bg-muted dark:bg-white/5 px-2 py-1 rounded-full">
                  {models.length} total
                </span>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-56 rounded-xl bg-muted dark:bg-white/5 animate-pulse shimmer" />
              ))}
            </div>
          ) : models?.length === 0 ? (
            <div className="text-center py-20 rounded-2xl bg-card border border-dashed border-border">
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mx-auto mb-6">
                <Sparkles className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Build Your First Model</h3>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Create institutional-grade financial models with 5-year projections and DCF valuations.
              </p>
              <CreateModelModal />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {models?.map((model) => (
                <ModelCard key={model.id} model={model} />
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
