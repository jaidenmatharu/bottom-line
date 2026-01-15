import { useState, useMemo } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/Layout";
import { useFinancialModels, useDeleteFinancialModel } from "@/hooks/use-financial-models";
import { CreateModelModal } from "@/components/CreateModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Search, 
  Database, 
  Trash2, 
  ExternalLink, 
  TrendingUp, 
  Calendar,
  SlidersHorizontal,
  ArrowUpDown,
  Download,
  Plus,
  Filter,
  Grid,
  List
} from "lucide-react";
import { api, buildUrl } from "@shared/routes";

type SortField = "name" | "startingRevenue" | "growthRate" | "createdAt";
type SortOrder = "asc" | "desc";
type ViewMode = "table" | "grid";

export default function Repository() {
  const { data: models, isLoading } = useFinancialModels();
  const { mutate: deleteModel, isPending: isDeleting } = useDeleteFinancialModel();
  
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [revenueFilter, setRevenueFilter] = useState<string>("all");

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1
  });

  const filteredAndSortedModels = useMemo(() => {
    if (!models) return [];
    
    let result = [...models];
    
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(m => 
        m.name.toLowerCase().includes(searchLower) ||
        (m.description?.toLowerCase() || "").includes(searchLower)
      );
    }
    
    if (revenueFilter !== "all") {
      result = result.filter(m => {
        const rev = Number(m.startingRevenue);
        switch (revenueFilter) {
          case "under1m": return rev < 1000000;
          case "1m-10m": return rev >= 1000000 && rev < 10000000;
          case "10m-100m": return rev >= 10000000 && rev < 100000000;
          case "over100m": return rev >= 100000000;
          default: return true;
        }
      });
    }
    
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "startingRevenue":
          comparison = Number(a.startingRevenue) - Number(b.startingRevenue);
          break;
        case "growthRate":
          comparison = Number(a.growthRate) - Number(b.growthRate);
          break;
        case "createdAt":
          comparison = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });
    
    return result;
  }, [models, search, sortField, sortOrder, revenueFilter]);

  const handleExport = (modelId: number) => {
    const url = buildUrl(api.models.export.path, { id: modelId });
    window.open(url, '_blank');
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  return (
    <Layout>
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 pb-6 border-b">
          <div className="space-y-1">
            <h1 className="text-4xl font-bold tracking-tight">Financial Models</h1>
            <p className="text-muted-foreground text-lg">
              {models?.length || 0} models in your collection
            </p>
          </div>
          
          <div className="flex gap-3">
            <CreateModelModal />
          </div>
        </div>

        <Card className="border-primary/5">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              <div className="flex flex-1 gap-4 flex-wrap w-full lg:w-auto">
                <div className="relative flex-1 min-w-[200px] max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search models..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 h-11 bg-muted/30 border-primary/10"
                    data-testid="input-search-models"
                  />
                </div>
                
                <Select value={revenueFilter} onValueChange={setRevenueFilter}>
                  <SelectTrigger className="w-[180px] h-11" data-testid="select-revenue-filter">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Revenue Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sizes</SelectItem>
                    <SelectItem value="under1m">Under $1M</SelectItem>
                    <SelectItem value="1m-10m">$1M - $10M</SelectItem>
                    <SelectItem value="10m-100m">$10M - $100M</SelectItem>
                    <SelectItem value="over100m">Over $100M</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
                  <SelectTrigger className="w-[160px] h-11" data-testid="select-sort-field">
                    <ArrowUpDown className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="createdAt">Date Created</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="startingRevenue">Revenue</SelectItem>
                    <SelectItem value="growthRate">Growth Rate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  variant={viewMode === "table" ? "default" : "outline"} 
                  size="icon"
                  className="h-11 w-11"
                  onClick={() => setViewMode("table")}
                  data-testid="button-view-table"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button 
                  variant={viewMode === "grid" ? "default" : "outline"} 
                  size="icon"
                  className="h-11 w-11"
                  onClick={() => setViewMode("grid")}
                  data-testid="button-view-grid"
                >
                  <Grid className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : filteredAndSortedModels.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <Database className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-bold mb-2">No Models Found</h3>
              <p className="text-muted-foreground mb-6">
                {search || revenueFilter !== "all" 
                  ? "Try adjusting your filters or search criteria."
                  : "Start building your first financial model."}
              </p>
              <CreateModelModal />
            </CardContent>
          </Card>
        ) : viewMode === "table" ? (
          <Card className="overflow-hidden border-primary/5">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead 
                    className="font-black text-xs uppercase cursor-pointer hover:text-primary transition-colors"
                    onClick={() => toggleSort("name")}
                  >
                    Model Name {sortField === "name" && (sortOrder === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead 
                    className="font-black text-xs uppercase cursor-pointer hover:text-primary transition-colors text-right"
                    onClick={() => toggleSort("startingRevenue")}
                  >
                    Base Revenue {sortField === "startingRevenue" && (sortOrder === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead 
                    className="font-black text-xs uppercase cursor-pointer hover:text-primary transition-colors text-right"
                    onClick={() => toggleSort("growthRate")}
                  >
                    Growth {sortField === "growthRate" && (sortOrder === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead className="font-black text-xs uppercase text-right">Exit Multiple</TableHead>
                  <TableHead 
                    className="font-black text-xs uppercase cursor-pointer hover:text-primary transition-colors"
                    onClick={() => toggleSort("createdAt")}
                  >
                    Created {sortField === "createdAt" && (sortOrder === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead className="font-black text-xs uppercase text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedModels.map((model) => (
                  <TableRow key={model.id} className="hover:bg-muted/20" data-testid={`row-model-${model.id}`}>
                    <TableCell>
                      <div>
                        <Link href={`/model/${model.id}`}>
                          <span className="font-bold hover:text-primary transition-colors cursor-pointer">
                            {model.name}
                          </span>
                        </Link>
                        {model.description && (
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {model.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatter.format(Number(model.startingRevenue))}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                        +{model.growthRate}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {Number(model.exitMultiple || 12).toFixed(1)}x
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(model.createdAt || 0).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2 justify-end">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => handleExport(model.id)}
                          data-testid={`button-export-${model.id}`}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Link href={`/model/${model.id}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-view-${model.id}`}>
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              data-testid={`button-delete-${model.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete "{model.name}"?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently remove the model and all associated valuation analysis. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => deleteModel(model.id)}
                                className="bg-destructive hover:bg-destructive/90"
                              >
                                {isDeleting ? "Deleting..." : "Delete Model"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedModels.map((model) => (
              <Card key={model.id} className="group hover:shadow-lg transition-all border-primary/5" data-testid={`card-model-${model.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors">
                        {model.name}
                      </CardTitle>
                      <CardDescription className="line-clamp-1 text-xs mt-1">
                        {model.description || "Financial projection model"}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                      +{model.growthRate}%
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-muted/30 p-3 rounded-lg">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Base Revenue</p>
                      <p className="font-mono font-bold text-sm">{formatter.format(Number(model.startingRevenue))}</p>
                    </div>
                    <div className="bg-muted/30 p-3 rounded-lg">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Exit Multiple</p>
                      <p className="font-mono font-bold text-sm">{Number(model.exitMultiple || 12).toFixed(1)}x</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3 mr-1" />
                      {new Date(model.createdAt || 0).toLocaleDateString()}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleExport(model.id)}>
                        <Download className="h-4 w-4" />
                      </Button>
                      <Link href={`/model/${model.id}`}>
                        <Button variant="outline" size="sm" className="h-8">
                          View <ExternalLink className="h-3 w-3 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
