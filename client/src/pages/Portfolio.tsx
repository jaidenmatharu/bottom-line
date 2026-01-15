import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Portfolio, FinancialModel } from "@shared/schema";
import { 
  Plus, 
  PieChart, 
  TrendingUp, 
  DollarSign, 
  Database,
  Trash2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Briefcase,
  X
} from "lucide-react";

interface PortfolioStats {
  modelCount: number;
  avgGrowth: number;
  avgMultiple: number;
  totalRevenue: number;
}

interface PortfolioWithModels extends Portfolio {
  models?: FinancialModel[];
  stats?: PortfolioStats;
}

export default function PortfolioPage() {
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [addModelOpen, setAddModelOpen] = useState<number | null>(null);
  const [expandedPortfolios, setExpandedPortfolios] = useState<Set<number>>(new Set());
  const [newPortfolio, setNewPortfolio] = useState({ name: "", description: "" });
  const [selectedModelId, setSelectedModelId] = useState<string>("");

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1
  });

  const { data: portfolios, isLoading: portfoliosLoading } = useQuery<Portfolio[]>({
    queryKey: ['/api/portfolios'],
  });

  const { data: allModels } = useQuery<FinancialModel[]>({
    queryKey: ['/api/models'],
  });

  const createPortfolio = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const res = await apiRequest('POST', '/api/portfolios', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/portfolios'] });
      setCreateOpen(false);
      setNewPortfolio({ name: "", description: "" });
      toast({ title: "Portfolio created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create portfolio", variant: "destructive" });
    }
  });

  const deletePortfolio = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/portfolios/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/portfolios'] });
      toast({ title: "Portfolio deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete portfolio", variant: "destructive" });
    }
  });

  const addModelToPortfolio = useMutation({
    mutationFn: async ({ portfolioId, modelId }: { portfolioId: number; modelId: number }) => {
      const res = await apiRequest('POST', `/api/portfolios/${portfolioId}/models`, { modelId });
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/portfolios', variables.portfolioId, 'models'] });
      queryClient.invalidateQueries({ queryKey: ['/api/portfolios', variables.portfolioId, 'stats'] });
      setAddModelOpen(null);
      setSelectedModelId("");
      toast({ title: "Model added to portfolio" });
    },
    onError: () => {
      toast({ title: "Failed to add model", variant: "destructive" });
    }
  });

  const removeModelFromPortfolio = useMutation({
    mutationFn: async ({ portfolioId, modelId }: { portfolioId: number; modelId: number }) => {
      await apiRequest('DELETE', `/api/portfolios/${portfolioId}/models/${modelId}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/portfolios', variables.portfolioId, 'models'] });
      queryClient.invalidateQueries({ queryKey: ['/api/portfolios', variables.portfolioId, 'stats'] });
      toast({ title: "Model removed from portfolio" });
    },
    onError: () => {
      toast({ title: "Failed to remove model", variant: "destructive" });
    }
  });

  const toggleExpanded = (id: number) => {
    const newExpanded = new Set(expandedPortfolios);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedPortfolios(newExpanded);
  };

  const handleCreatePortfolio = () => {
    if (!newPortfolio.name.trim()) {
      toast({ title: "Please enter a portfolio name", variant: "destructive" });
      return;
    }
    createPortfolio.mutate({
      name: newPortfolio.name,
      description: newPortfolio.description || undefined
    });
  };

  const handleAddModel = (portfolioId: number) => {
    if (!selectedModelId) {
      toast({ title: "Please select a model", variant: "destructive" });
      return;
    }
    addModelToPortfolio.mutate({
      portfolioId,
      modelId: Number(selectedModelId)
    });
  };

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 pb-6 border-b">
          <div className="space-y-1">
            <h1 className="text-4xl font-bold tracking-tight" data-testid="text-page-title">Portfolio Management</h1>
            <p className="text-muted-foreground text-lg">
              Organize your financial models into portfolios
            </p>
          </div>
          
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-portfolio">
                <Plus className="h-4 w-4 mr-2" />
                Create Portfolio
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Portfolio</DialogTitle>
                <DialogDescription>
                  Create a new portfolio to organize your financial models.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Portfolio Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Q1 Investments"
                    value={newPortfolio.name}
                    onChange={(e) => setNewPortfolio({ ...newPortfolio, name: e.target.value })}
                    data-testid="input-portfolio-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description of this portfolio..."
                    value={newPortfolio.description}
                    onChange={(e) => setNewPortfolio({ ...newPortfolio, description: e.target.value })}
                    data-testid="input-portfolio-description"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreatePortfolio}
                  disabled={createPortfolio.isPending}
                  data-testid="button-confirm-create"
                >
                  {createPortfolio.isPending ? "Creating..." : "Create Portfolio"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {portfoliosLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : !portfolios || portfolios.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <Briefcase className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-bold mb-2" data-testid="text-empty-state">No Portfolios Yet</h3>
              <p className="text-muted-foreground mb-6">
                Create your first portfolio to start organizing your financial models.
              </p>
              <Button onClick={() => setCreateOpen(true)} data-testid="button-empty-create">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Portfolio
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {portfolios.map((portfolio) => (
              <PortfolioCard
                key={portfolio.id}
                portfolio={portfolio}
                allModels={allModels || []}
                isExpanded={expandedPortfolios.has(portfolio.id)}
                onToggleExpand={() => toggleExpanded(portfolio.id)}
                onDelete={() => deletePortfolio.mutate(portfolio.id)}
                onAddModel={(modelId) => addModelToPortfolio.mutate({ portfolioId: portfolio.id, modelId })}
                onRemoveModel={(modelId) => removeModelFromPortfolio.mutate({ portfolioId: portfolio.id, modelId })}
                isDeleting={deletePortfolio.isPending}
                addModelOpen={addModelOpen === portfolio.id}
                setAddModelOpen={(open) => setAddModelOpen(open ? portfolio.id : null)}
                selectedModelId={selectedModelId}
                setSelectedModelId={setSelectedModelId}
                handleAddModel={() => handleAddModel(portfolio.id)}
                isAddingModel={addModelToPortfolio.isPending}
                formatter={formatter}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

interface PortfolioCardProps {
  portfolio: Portfolio;
  allModels: FinancialModel[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onDelete: () => void;
  onAddModel: (modelId: number) => void;
  onRemoveModel: (modelId: number) => void;
  isDeleting: boolean;
  addModelOpen: boolean;
  setAddModelOpen: (open: boolean) => void;
  selectedModelId: string;
  setSelectedModelId: (id: string) => void;
  handleAddModel: () => void;
  isAddingModel: boolean;
  formatter: Intl.NumberFormat;
}

function PortfolioCard({
  portfolio,
  allModels,
  isExpanded,
  onToggleExpand,
  onDelete,
  onRemoveModel,
  isDeleting,
  addModelOpen,
  setAddModelOpen,
  selectedModelId,
  setSelectedModelId,
  handleAddModel,
  isAddingModel,
  formatter,
}: PortfolioCardProps) {
  const { data: stats } = useQuery<PortfolioStats>({
    queryKey: ['/api/portfolios', portfolio.id, 'stats'],
  });

  const { data: portfolioModels } = useQuery<FinancialModel[]>({
    queryKey: ['/api/portfolios', portfolio.id, 'models'],
    queryFn: async () => {
      const res = await fetch(`/api/portfolios/${portfolio.id}/models`, { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isExpanded,
  });

  const availableModels = allModels.filter(
    model => !portfolioModels?.some(pm => pm.id === model.id)
  );

  return (
    <Card className="border-primary/5" data-testid={`card-portfolio-${portfolio.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <PieChart className="h-5 w-5 text-primary" />
              {portfolio.name}
            </CardTitle>
            {portfolio.description && (
              <CardDescription className="mt-1">
                {portfolio.description}
              </CardDescription>
            )}
          </div>
          <div className="flex items-center gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  data-testid={`button-delete-portfolio-${portfolio.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete "{portfolio.name}"?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete this portfolio. Models within will not be deleted.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={onDelete}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    {isDeleting ? "Deleting..." : "Delete Portfolio"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-muted/30 p-3 rounded-lg">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Database className="h-3.5 w-3.5" />
              <span className="text-[10px] uppercase font-bold tracking-wider">Models</span>
            </div>
            <p className="font-mono font-bold text-lg" data-testid={`text-model-count-${portfolio.id}`}>
              {stats?.modelCount ?? 0}
            </p>
          </div>
          <div className="bg-muted/30 p-3 rounded-lg">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="h-3.5 w-3.5" />
              <span className="text-[10px] uppercase font-bold tracking-wider">Total Revenue</span>
            </div>
            <p className="font-mono font-bold text-lg" data-testid={`text-total-revenue-${portfolio.id}`}>
              {formatter.format(stats?.totalRevenue ?? 0)}
            </p>
          </div>
          <div className="bg-muted/30 p-3 rounded-lg">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="h-3.5 w-3.5" />
              <span className="text-[10px] uppercase font-bold tracking-wider">Avg Growth</span>
            </div>
            <p className="font-mono font-bold text-lg" data-testid={`text-avg-growth-${portfolio.id}`}>
              {(stats?.avgGrowth ?? 0).toFixed(1)}%
            </p>
          </div>
          <div className="bg-muted/30 p-3 rounded-lg">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <PieChart className="h-3.5 w-3.5" />
              <span className="text-[10px] uppercase font-bold tracking-wider">Avg Multiple</span>
            </div>
            <p className="font-mono font-bold text-lg" data-testid={`text-avg-multiple-${portfolio.id}`}>
              {(stats?.avgMultiple ?? 0).toFixed(1)}x
            </p>
          </div>
        </div>

        <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
          <div className="flex items-center justify-between pt-2 border-t">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2" data-testid={`button-expand-${portfolio.id}`}>
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    Hide Models
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    Show Models ({stats?.modelCount ?? 0})
                  </>
                )}
              </Button>
            </CollapsibleTrigger>

            <Dialog open={addModelOpen} onOpenChange={setAddModelOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" data-testid={`button-add-model-${portfolio.id}`}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Model
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Model to {portfolio.name}</DialogTitle>
                  <DialogDescription>
                    Select a financial model to add to this portfolio.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  {availableModels.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      No models available to add. All models are already in this portfolio or you haven't created any models yet.
                    </p>
                  ) : (
                    <Select value={selectedModelId} onValueChange={setSelectedModelId}>
                      <SelectTrigger data-testid="select-model">
                        <SelectValue placeholder="Select a model" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableModels.map((model) => (
                          <SelectItem key={model.id} value={String(model.id)}>
                            {model.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddModelOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddModel}
                    disabled={!selectedModelId || isAddingModel}
                    data-testid="button-confirm-add-model"
                  >
                    {isAddingModel ? "Adding..." : "Add Model"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <CollapsibleContent className="pt-4">
            {portfolioModels && portfolioModels.length > 0 ? (
              <div className="space-y-2">
                {portfolioModels.map((model) => (
                  <div
                    key={model.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors"
                    data-testid={`row-portfolio-model-${model.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <Database className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">{model.name}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{formatter.format(Number(model.startingRevenue))}</span>
                          <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 text-[10px]">
                            +{model.growthRate}%
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href={`/model/${model.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-view-model-${model.id}`}>
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => onRemoveModel(model.id)}
                        data-testid={`button-remove-model-${model.id}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No models in this portfolio yet</p>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
