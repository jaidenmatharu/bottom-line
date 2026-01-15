import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useFinancialModel, useUpdateFinancialModel } from "@/hooks/use-financial-models";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  ArrowLeft, 
  Download, 
  Loader2,
  TrendingUp,
  DollarSign,
  PieChart,
  Percent,
  Calculator,
  Table as TableIcon,
  BarChart3,
  Users,
  Pencil,
  X,
  Save,
  Settings2,
  Plus,
  Trash2,
  Copy,
  FileText,
  List,
  Grid,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { useLocation } from "wouter";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  AreaChart,
  Area
} from "recharts";
import { api, buildUrl } from "@shared/routes";

interface FormData {
  name: string;
  startingRevenue: string;
  growthRate: string;
  wacc: string;
  cogsMargin: string;
  opexMargin: string;
  daMargin: string;
  taxRate: string;
}

interface FormErrors {
  name?: string;
  startingRevenue?: string;
  growthRate?: string;
  wacc?: string;
  cogsMargin?: string;
  opexMargin?: string;
  daMargin?: string;
  taxRate?: string;
}

const validateFormData = (data: FormData): { isValid: boolean; errors: FormErrors } => {
  const errors: FormErrors = {};
  
  if (!data.name.trim()) {
    errors.name = "Model name is required";
  }
  
  const startingRevenue = parseFloat(data.startingRevenue);
  if (!data.startingRevenue || isNaN(startingRevenue) || startingRevenue <= 0) {
    errors.startingRevenue = "Must be greater than 0";
  }
  
  const growthRate = parseFloat(data.growthRate);
  if (data.growthRate === "" || isNaN(growthRate)) {
    errors.growthRate = "Must be a valid number";
  }
  
  const wacc = parseFloat(data.wacc);
  if (!data.wacc || isNaN(wacc) || wacc <= 0 || wacc >= 100) {
    errors.wacc = "Must be between 0 and 100";
  }
  
  const cogsMargin = parseFloat(data.cogsMargin);
  if (data.cogsMargin === "" || isNaN(cogsMargin) || cogsMargin < 0 || cogsMargin >= 100) {
    errors.cogsMargin = "Must be between 0 and 100";
  }
  
  const opexMargin = parseFloat(data.opexMargin);
  if (data.opexMargin === "" || isNaN(opexMargin) || opexMargin < 0 || opexMargin >= 100) {
    errors.opexMargin = "Must be between 0 and 100";
  }
  
  const daMargin = parseFloat(data.daMargin);
  if (data.daMargin === "" || isNaN(daMargin) || daMargin < 0 || daMargin >= 100) {
    errors.daMargin = "Must be between 0 and 100";
  }
  
  const taxRate = parseFloat(data.taxRate);
  if (data.taxRate === "" || isNaN(taxRate) || taxRate < 0 || taxRate >= 100) {
    errors.taxRate = "Must be between 0 and 100";
  }
  
  return { isValid: Object.keys(errors).length === 0, errors };
};

interface TradingComp {
  companyName: string;
  ev: number;
  ebitda: number;
  marketCap: number;
  netIncome: number;
}

interface CompFormData {
  companyName: string;
  ev: string;
  ebitda: string;
  marketCap: string;
  netIncome: string;
}

const emptyCompForm: CompFormData = {
  companyName: "",
  ev: "",
  ebitda: "",
  marketCap: "",
  netIncome: "",
};

interface PrecedentTransaction {
  id: number;
  modelId: number;
  targetName: string;
  acquirerName: string | null;
  transactionDate: string | null;
  transactionValue: string | null;
  targetRevenue: string | null;
  targetEbitda: string | null;
  evRevenue: string | null;
  evEbitda: string | null;
}

interface PrecedentFormData {
  targetName: string;
  acquirerName: string;
  transactionDate: string;
  transactionValue: string;
  evRevenue: string;
  evEbitda: string;
}

const emptyPrecedentForm: PrecedentFormData = {
  targetName: "",
  acquirerName: "",
  transactionDate: "",
  transactionValue: "",
  evRevenue: "",
  evEbitda: "",
};

interface LboAssumptions {
  id: number;
  modelId: number;
  entryMultiple: string | null;
  exitMultiple: string | null;
  holdingPeriod: number | null;
  debtPercent: string | null;
  interestRate: string | null;
  annualDebtPaydown: string | null;
  targetIrr: string | null;
}

interface LboFormData {
  entryMultiple: string;
  exitMultiple: string;
  holdingPeriod: string;
  debtPercent: string;
  interestRate: string;
  annualDebtPaydown: string;
  targetIrr: string;
}

const defaultLboForm: LboFormData = {
  entryMultiple: "",
  exitMultiple: "12",
  holdingPeriod: "5",
  debtPercent: "60",
  interestRate: "8",
  annualDebtPaydown: "6",
  targetIrr: "25",
};

interface ModelNote {
  id: number;
  modelId: number;
  content: string;
  section: string | null;
  createdAt: string;
}

interface NoteFormData {
  title: string;
  content: string;
}

const emptyNoteForm: NoteFormData = {
  title: "",
  content: "",
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value);
};

const formatCompact = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    notation: "compact",
    compactDisplay: "short",
  }).format(value);
};

export default function ModelDetail() {
  const { id } = useParams();
  const modelId = parseInt(id || "0");
  const { data: model, isLoading, error } = useFinancialModel(modelId);
  const updateModel = useUpdateFinancialModel();
  
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    startingRevenue: "",
    growthRate: "",
    wacc: "",
    cogsMargin: "",
    opexMargin: "",
    daMargin: "",
    taxRate: "",
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // Trading Comps state
  const [localComps, setLocalComps] = useState<TradingComp[]>([]);
  const [compDialogOpen, setCompDialogOpen] = useState(false);
  const [compFormData, setCompFormData] = useState<CompFormData>(emptyCompForm);
  const [editingCompIndex, setEditingCompIndex] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteCompIndex, setDeleteCompIndex] = useState<number | null>(null);
  const [isSavingComps, setIsSavingComps] = useState(false);

  // Precedent Transactions state
  const [precedentDialogOpen, setPrecedentDialogOpen] = useState(false);
  const [precedentFormData, setPrecedentFormData] = useState<PrecedentFormData>(emptyPrecedentForm);
  const [editingPrecedentId, setEditingPrecedentId] = useState<number | null>(null);
  const [deletePrecedentDialogOpen, setDeletePrecedentDialogOpen] = useState(false);
  const [deletePrecedentId, setDeletePrecedentId] = useState<number | null>(null);

  // LBO Assumptions state
  const [lboDialogOpen, setLboDialogOpen] = useState(false);
  const [lboFormData, setLboFormData] = useState<LboFormData>(defaultLboForm);

  // Sensitivity Analysis state
  const [sensitivityDialogOpen, setSensitivityDialogOpen] = useState(false);
  const [sensitivityRowVar, setSensitivityRowVar] = useState<string>("wacc");
  const [sensitivityColVar, setSensitivityColVar] = useState<string>("exitMultiple");
  const [showEquityValue, setShowEquityValue] = useState(false);

  // Notes state
  const [noteFormData, setNoteFormData] = useState<NoteFormData>(emptyNoteForm);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [deleteNoteDialogOpen, setDeleteNoteDialogOpen] = useState(false);
  const [deleteNoteId, setDeleteNoteId] = useState<number | null>(null);

  // Breakdown tab state
  const [expandedMetrics, setExpandedMetrics] = useState<Set<string>>(new Set());
  const [selectedBreakdownYear, setSelectedBreakdownYear] = useState(1);
  const toggleMetric = (key: string) => {
    setExpandedMetrics(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Spreadsheet formatting state
  const [spreadsheetFormat, setSpreadsheetFormat] = useState<'currency' | 'number' | 'compact'>('currency');
  const [spreadsheetDecimals, setSpreadsheetDecimals] = useState(0);
  const [showFormulas, setShowFormulas] = useState(false);

  // Navigation and toast
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Fetch notes
  const { data: notes = [], isLoading: isNotesLoading } = useQuery<ModelNote[]>({
    queryKey: ['/api/models', modelId, 'notes'],
    queryFn: async () => {
      const res = await fetch(`/api/models/${modelId}/notes`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch notes');
      return res.json();
    },
    enabled: modelId > 0,
  });

  // Fetch breakdown data
  const { data: breakdownData } = useQuery({
    queryKey: ['/api/models', id, 'breakdown'],
    enabled: !!id,
  });

  // Fetch spreadsheet data
  const { data: spreadsheetData } = useQuery({
    queryKey: ['/api/models', id, 'spreadsheet'],
    enabled: !!id,
  });

  // Duplicate model mutation
  const duplicateModelMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/models/${modelId}/duplicate`);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/models'] });
      toast({
        title: "Model Duplicated",
        description: `Created "${data.name}" successfully.`,
      });
      setLocation(`/models/${data.id}`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to duplicate model.",
        variant: "destructive",
      });
    },
  });

  // Notes mutations
  const createNoteMutation = useMutation({
    mutationFn: async (data: { section: string; content: string }) => {
      return apiRequest('POST', `/api/models/${modelId}/notes`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/models', modelId, 'notes'] });
      setNoteFormData(emptyNoteForm);
      toast({ title: "Note Added", description: "Your note has been saved." });
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { section?: string; content?: string } }) => {
      return apiRequest('PUT', `/api/notes/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/models', modelId, 'notes'] });
      setNoteFormData(emptyNoteForm);
      setEditingNoteId(null);
      toast({ title: "Note Updated", description: "Your note has been updated." });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/notes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/models', modelId, 'notes'] });
      setDeleteNoteDialogOpen(false);
      setDeleteNoteId(null);
      toast({ title: "Note Deleted", description: "Your note has been removed." });
    },
  });

  // Fetch LBO assumptions
  const { data: lboAssumptions, isLoading: isLboLoading } = useQuery<LboAssumptions>({
    queryKey: ['/api/models', modelId, 'lbo'],
    queryFn: async () => {
      const res = await fetch(`/api/models/${modelId}/lbo`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch LBO assumptions');
      return res.json();
    },
    enabled: modelId > 0,
  });

  // LBO mutation
  const updateLboMutation = useMutation({
    mutationFn: async (data: Partial<LboFormData>) => {
      return apiRequest('PUT', `/api/models/${modelId}/lbo`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/models', modelId, 'lbo'] });
      setLboDialogOpen(false);
    },
  });

  // Fetch precedent transactions
  const { data: precedentTransactions = [], isLoading: isPrecedentsLoading } = useQuery<PrecedentTransaction[]>({
    queryKey: ['/api/models', modelId, 'precedents'],
    queryFn: async () => {
      const res = await fetch(`/api/models/${modelId}/precedents`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch precedent transactions');
      return res.json();
    },
    enabled: modelId > 0,
  });

  // Precedent mutations
  const createPrecedentMutation = useMutation({
    mutationFn: async (data: Omit<PrecedentFormData, 'id'>) => {
      return apiRequest('POST', `/api/models/${modelId}/precedents`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/models', modelId, 'precedents'] });
      setPrecedentDialogOpen(false);
      setPrecedentFormData(emptyPrecedentForm);
    },
  });

  const updatePrecedentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<PrecedentFormData> }) => {
      return apiRequest('PUT', `/api/precedents/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/models', modelId, 'precedents'] });
      setPrecedentDialogOpen(false);
      setPrecedentFormData(emptyPrecedentForm);
      setEditingPrecedentId(null);
    },
  });

  const deletePrecedentMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/precedents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/models', modelId, 'precedents'] });
      setDeletePrecedentDialogOpen(false);
      setDeletePrecedentId(null);
    },
  });

  const originalFormData = useMemo<FormData>(() => ({
    name: model?.name || "",
    startingRevenue: model?.startingRevenue?.toString() || "",
    growthRate: model?.growthRate?.toString() || "",
    wacc: model?.wacc?.toString() || "",
    cogsMargin: model?.cogsMargin?.toString() || "",
    opexMargin: model?.opexMargin?.toString() || "",
    daMargin: model?.daMargin?.toString() || "",
    taxRate: model?.taxRate?.toString() || "",
  }), [model]);

  useEffect(() => {
    if (model && !isEditing) {
      setFormData(originalFormData);
    }
  }, [model, isEditing, originalFormData]);

  // Sync local comps with model data
  useEffect(() => {
    if (model?.tradingComps) {
      setLocalComps(model.tradingComps as TradingComp[]);
    }
  }, [model?.tradingComps]);

  // Calculate comps metrics on the fly
  const calculatedCompsAnalysis = useMemo(() => {
    if (localComps.length === 0) {
      return { avgEvEbitda: 0, avgPe: 0, impliedEv: 0, impliedEquityValue: 0 };
    }
    
    const evEbitdaMultiples = localComps.map(c => c.ev / c.ebitda).filter(m => isFinite(m) && !isNaN(m));
    const peMultiples = localComps.map(c => c.marketCap / c.netIncome).filter(m => isFinite(m) && !isNaN(m));
    
    const avgEvEbitda = evEbitdaMultiples.length > 0 
      ? evEbitdaMultiples.reduce((a, b) => a + b, 0) / evEbitdaMultiples.length 
      : 0;
    const avgPe = peMultiples.length > 0 
      ? peMultiples.reduce((a, b) => a + b, 0) / peMultiples.length 
      : 0;
    
    // Use model's EBITDA and Net Income for implied values (from projections year 1)
    const modelEbitda = model?.projections?.[0]?.ebitda || 0;
    const modelNetIncome = model?.projections?.[0]?.netIncome || 0;
    
    return {
      avgEvEbitda,
      avgPe,
      impliedEv: avgEvEbitda * modelEbitda,
      impliedEquityValue: avgPe * modelNetIncome,
    };
  }, [localComps, model?.projections]);

  const hasChanges = useMemo(() => {
    return Object.keys(formData).some(
      (key) => formData[key as keyof FormData] !== originalFormData[key as keyof FormData]
    );
  }, [formData, originalFormData]);

  const validation = useMemo(() => validateFormData(formData), [formData]);

  const handleFieldChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleCancel = () => {
    setFormData(originalFormData);
    setFormErrors({});
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!hasChanges) return;
    
    const { isValid, errors } = validateFormData(formData);
    if (!isValid) {
      setFormErrors(errors);
      return;
    }
    
    updateModel.mutate(
      {
        id: modelId,
        data: {
          name: formData.name,
          startingRevenue: formData.startingRevenue,
          growthRate: formData.growthRate,
          wacc: formData.wacc,
          cogsMargin: formData.cogsMargin,
          opexMargin: formData.opexMargin,
          daMargin: formData.daMargin,
          taxRate: formData.taxRate,
        },
      },
      {
        onSuccess: () => {
          setIsEditing(false);
        },
      }
    );
  };

  // Trading Comps handlers
  const openAddCompDialog = () => {
    setCompFormData(emptyCompForm);
    setEditingCompIndex(null);
    setCompDialogOpen(true);
  };

  const openEditCompDialog = (index: number) => {
    const comp = localComps[index];
    setCompFormData({
      companyName: comp.companyName,
      ev: comp.ev.toString(),
      ebitda: comp.ebitda.toString(),
      marketCap: comp.marketCap.toString(),
      netIncome: comp.netIncome.toString(),
    });
    setEditingCompIndex(index);
    setCompDialogOpen(true);
  };

  const handleCompFormChange = (field: keyof CompFormData, value: string) => {
    setCompFormData(prev => ({ ...prev, [field]: value }));
  };

  const saveCompsToServer = async (newComps: TradingComp[]) => {
    setIsSavingComps(true);
    updateModel.mutate(
      {
        id: modelId,
        data: {
          tradingComps: newComps,
        },
      },
      {
        onSettled: () => {
          setIsSavingComps(false);
        },
      }
    );
  };

  const handleSaveComp = () => {
    const newComp: TradingComp = {
      companyName: compFormData.companyName,
      ev: parseFloat(compFormData.ev) || 0,
      ebitda: parseFloat(compFormData.ebitda) || 0,
      marketCap: parseFloat(compFormData.marketCap) || 0,
      netIncome: parseFloat(compFormData.netIncome) || 0,
    };

    let updatedComps: TradingComp[];
    if (editingCompIndex !== null) {
      updatedComps = localComps.map((c, i) => (i === editingCompIndex ? newComp : c));
    } else {
      updatedComps = [...localComps, newComp];
    }

    setLocalComps(updatedComps);
    saveCompsToServer(updatedComps);
    setCompDialogOpen(false);
    setCompFormData(emptyCompForm);
    setEditingCompIndex(null);
  };

  const openDeleteDialog = (index: number) => {
    setDeleteCompIndex(index);
    setDeleteDialogOpen(true);
  };

  const handleDeleteComp = () => {
    if (deleteCompIndex === null) return;
    const updatedComps = localComps.filter((_, i) => i !== deleteCompIndex);
    setLocalComps(updatedComps);
    saveCompsToServer(updatedComps);
    setDeleteDialogOpen(false);
    setDeleteCompIndex(null);
  };

  // Precedent Transactions handlers
  const openAddPrecedentDialog = () => {
    setPrecedentFormData(emptyPrecedentForm);
    setEditingPrecedentId(null);
    setPrecedentDialogOpen(true);
  };

  const openEditPrecedentDialog = (transaction: PrecedentTransaction) => {
    setPrecedentFormData({
      targetName: transaction.targetName,
      acquirerName: transaction.acquirerName || "",
      transactionDate: transaction.transactionDate || "",
      transactionValue: transaction.transactionValue || "",
      evRevenue: transaction.evRevenue || "",
      evEbitda: transaction.evEbitda || "",
    });
    setEditingPrecedentId(transaction.id);
    setPrecedentDialogOpen(true);
  };

  const handlePrecedentFormChange = (field: keyof PrecedentFormData, value: string) => {
    setPrecedentFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSavePrecedent = () => {
    if (editingPrecedentId !== null) {
      updatePrecedentMutation.mutate({ id: editingPrecedentId, data: precedentFormData });
    } else {
      createPrecedentMutation.mutate(precedentFormData);
    }
  };

  const openDeletePrecedentDialog = (id: number) => {
    setDeletePrecedentId(id);
    setDeletePrecedentDialogOpen(true);
  };

  const handleDeletePrecedent = () => {
    if (deletePrecedentId !== null) {
      deletePrecedentMutation.mutate(deletePrecedentId);
    }
  };

  // Calculate precedent analysis dynamically
  const precedentAnalysis = useMemo(() => {
    if (precedentTransactions.length === 0) {
      return { medianEvRevenue: 0, medianEvEbitda: 0, avgEvRevenue: 0, avgEvEbitda: 0 };
    }

    const evRevenueMultiples = precedentTransactions
      .map(t => parseFloat(t.evRevenue || "0"))
      .filter(m => m > 0);
    const evEbitdaMultiples = precedentTransactions
      .map(t => parseFloat(t.evEbitda || "0"))
      .filter(m => m > 0);

    const getMedian = (arr: number[]) => {
      if (arr.length === 0) return 0;
      const sorted = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    };

    const getAvg = (arr: number[]) => {
      if (arr.length === 0) return 0;
      return arr.reduce((a, b) => a + b, 0) / arr.length;
    };

    return {
      medianEvRevenue: getMedian(evRevenueMultiples),
      medianEvEbitda: getMedian(evEbitdaMultiples),
      avgEvRevenue: getAvg(evRevenueMultiples),
      avgEvEbitda: getAvg(evEbitdaMultiples),
    };
  }, [precedentTransactions]);

  const isSavingPrecedent = createPrecedentMutation.isPending || updatePrecedentMutation.isPending;

  // LBO Assumptions handlers
  const openLboDialog = () => {
    const impliedMultiple = model?.valuation?.impliedMultiple || 8;
    setLboFormData({
      entryMultiple: lboAssumptions?.entryMultiple || impliedMultiple.toFixed(2),
      exitMultiple: lboAssumptions?.exitMultiple || "12",
      holdingPeriod: lboAssumptions?.holdingPeriod?.toString() || "5",
      debtPercent: lboAssumptions?.debtPercent || "60",
      interestRate: lboAssumptions?.interestRate || "8",
      annualDebtPaydown: lboAssumptions?.annualDebtPaydown || "6",
      targetIrr: lboAssumptions?.targetIrr || "25",
    });
    setLboDialogOpen(true);
  };

  const handleLboFormChange = (field: keyof LboFormData, value: string) => {
    setLboFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveLbo = () => {
    updateLboMutation.mutate({
      entryMultiple: lboFormData.entryMultiple,
      exitMultiple: lboFormData.exitMultiple,
      holdingPeriod: lboFormData.holdingPeriod,
      debtPercent: lboFormData.debtPercent,
      interestRate: lboFormData.interestRate,
      annualDebtPaydown: lboFormData.annualDebtPaydown,
      targetIrr: lboFormData.targetIrr,
    });
  };

  // LBO calculations based on stored assumptions
  const lboMetrics = useMemo(() => {
    if (!model?.projections || model.projections.length === 0) {
      return null;
    }
    
    const projections = model.projections;
    const ev = model.valuation?.enterpriseValue || 0;
    
    // Use stored assumptions or defaults
    const debtPct = parseFloat(lboAssumptions?.debtPercent || "60") / 100;
    const equityPct = 1 - debtPct;
    const holdPeriod = lboAssumptions?.holdingPeriod || 5;
    const interestRate = parseFloat(lboAssumptions?.interestRate || "8") / 100;
    const annualPaydown = parseFloat(lboAssumptions?.annualDebtPaydown || "6") / 100;
    const targetIrr = parseFloat(lboAssumptions?.targetIrr || "25");
    const exitMultiple = parseFloat(lboAssumptions?.exitMultiple || "12");
    const entryMultiple = parseFloat(lboAssumptions?.entryMultiple || model.valuation?.impliedMultiple?.toString() || "8");
    
    // Entry calculations
    const entryDebt = ev * debtPct;
    const entryEquity = ev * equityPct;
    
    // Calculate cumulative debt paydown over hold period
    const totalPaydown = entryDebt * annualPaydown * holdPeriod;
    const debtAtExit = Math.max(0, entryDebt - totalPaydown);
    
    // Get year 5 EBITDA (or last available year)
    const exitYearIndex = Math.min(holdPeriod - 1, projections.length - 1);
    const exitYearEbitda = projections[exitYearIndex]?.ebitda || 0;
    
    // Exit EV based on exit multiple
    const exitEv = exitYearEbitda * exitMultiple;
    
    // Exit equity
    const exitEquity = exitEv - debtAtExit;
    
    // MOIC and IRR
    const moic = entryEquity > 0 ? exitEquity / entryEquity : 0;
    const irr = moic > 0 ? (Math.pow(moic, 1 / holdPeriod) - 1) * 100 : 0;
    
    // Generate exit scenario multiples (5 values centered around exit multiple)
    const exitMultiples = [
      Math.max(4, Math.floor(exitMultiple) - 2),
      Math.max(6, Math.floor(exitMultiple) - 1),
      Math.floor(exitMultiple),
      Math.floor(exitMultiple) + 1,
      Math.floor(exitMultiple) + 2,
    ];
    
    return {
      entryMultiple,
      exitMultiple,
      holdPeriod,
      debtPct,
      equityPct,
      interestRate,
      annualPaydown,
      targetIrr,
      entryDebt,
      entryEquity,
      debtAtExit,
      exitYearEbitda,
      exitEv,
      exitEquity,
      moic,
      irr,
      exitMultiples,
    };
  }, [model, lboAssumptions]);

  // Sensitivity Analysis calculations
  const sensitivityVariables = useMemo(() => ({
    wacc: { label: "WACC / Discount Rate", unit: "%", currentValue: Number(model?.wacc || 10), step: 1 },
    exitMultiple: { label: "Exit Multiple", unit: "x", currentValue: Number(model?.exitMultiple || 12), step: 1 },
    growthRate: { label: "Growth Rate", unit: "%", currentValue: Number(model?.growthRate || 15), step: 2 },
    ebitdaMargin: { 
      label: "EBITDA Margin", 
      unit: "%", 
      currentValue: 100 - Number(model?.cogsMargin || 40) - Number(model?.opexMargin || 25), 
      step: 2 
    },
  }), [model?.wacc, model?.exitMultiple, model?.growthRate, model?.cogsMargin, model?.opexMargin]);

  const sensitivityGrid = useMemo(() => {
    if (!model) return { rows: [], cols: [], grid: [], centerRowIndex: 2, centerColIndex: 2 };

    const rowConfig = sensitivityVariables[sensitivityRowVar as keyof typeof sensitivityVariables];
    const colConfig = sensitivityVariables[sensitivityColVar as keyof typeof sensitivityVariables];
    
    const generateValues = (center: number, step: number, count: number = 5) => {
      const values: number[] = [];
      const startOffset = -Math.floor(count / 2);
      for (let i = 0; i < count; i++) {
        values.push(center + (startOffset + i) * step);
      }
      return values;
    };

    const rows = generateValues(rowConfig.currentValue, rowConfig.step);
    const cols = generateValues(colConfig.currentValue, colConfig.step);

    const calculateEnterpriseValue = (overrides: { wacc?: number; exitMultiple?: number; growthRate?: number; ebitdaMargin?: number }) => {
      const waccValue = (overrides.wacc ?? Number(model.wacc || 10)) / 100;
      const terminalGrowth = Number(model.terminalGrowthRate || 2) / 100;
      const exitMult = overrides.exitMultiple ?? Number(model.exitMultiple || 12);
      const growthRateValue = overrides.growthRate ?? Number(model.growthRate || 15);
      const debt = Number(model.debtBalance || 0);
      
      let cogsMargin = Number(model.cogsMargin || 40);
      let opexMargin = Number(model.opexMargin || 25);
      
      if (overrides.ebitdaMargin !== undefined) {
        const currentEbitdaMargin = 100 - cogsMargin - opexMargin;
        const marginDiff = overrides.ebitdaMargin - currentEbitdaMargin;
        opexMargin = opexMargin - marginDiff;
      }
      
      const daMargin = Number(model.daMargin || 5);
      const interestRate = Number(model.interestRate || 5);
      const debtBalance = Number(model.debtBalance || 0);
      const taxRate = Number(model.taxRate || 21);
      const startingRevenue = Number(model.startingRevenue || 1000000);
      
      const projections = [];
      let revenue = startingRevenue;
      
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
        
        projections.push({ year, revenue, ebitda, da, netIncome, fcf: netIncome + da });
        revenue = Math.round(revenue * (1 + growthRateValue / 100));
      }
      
      let sumPvOfFcf = 0;
      projections.forEach((p, idx) => {
        const discountFactor = 1 / Math.pow(1 + waccValue, idx + 1);
        sumPvOfFcf += p.fcf * discountFactor;
      });
      
      const lastFcf = projections[projections.length - 1].fcf;
      const lastEbitda = projections[projections.length - 1].ebitda;
      
      let terminalValue: number;
      if (sensitivityColVar === 'exitMultiple' || sensitivityRowVar === 'exitMultiple') {
        terminalValue = lastEbitda * exitMult;
      } else {
        const denominator = waccValue - terminalGrowth;
        terminalValue = denominator > 0 ? (lastFcf * (1 + terminalGrowth)) / denominator : 0;
      }
      
      const pvOfTv = terminalValue / Math.pow(1 + waccValue, 5);
      const enterpriseValue = sumPvOfFcf + pvOfTv;
      const equityValue = enterpriseValue - debt;
      
      return showEquityValue ? equityValue : enterpriseValue;
    };

    const grid: number[][] = [];
    let minVal = Infinity;
    let maxVal = -Infinity;

    rows.forEach((rowVal) => {
      const row: number[] = [];
      cols.forEach((colVal) => {
        const overrides: any = {};
        overrides[sensitivityRowVar] = rowVal;
        overrides[sensitivityColVar] = colVal;
        const value = calculateEnterpriseValue(overrides);
        row.push(value);
        minVal = Math.min(minVal, value);
        maxVal = Math.max(maxVal, value);
      });
      grid.push(row);
    });

    const centerRowIndex = Math.floor(rows.length / 2);
    const centerColIndex = Math.floor(cols.length / 2);

    return { rows, cols, grid, centerRowIndex, centerColIndex, minVal, maxVal };
  }, [model, sensitivityRowVar, sensitivityColVar, sensitivityVariables, showEquityValue]);

  const getCellColor = (value: number, minVal: number, maxVal: number) => {
    if (maxVal === minVal) return "bg-muted";
    const normalized = (value - minVal) / (maxVal - minVal);
    if (normalized >= 0.75) return "bg-green-500/20 dark:bg-green-500/30";
    if (normalized >= 0.5) return "bg-green-500/10 dark:bg-green-500/15";
    if (normalized >= 0.25) return "bg-red-500/10 dark:bg-red-500/15";
    return "bg-red-500/20 dark:bg-red-500/30";
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="h-[60vh] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (error || !model) {
    return (
      <Layout>
        <div className="text-center py-20">
          <h2 className="text-2xl font-bold mb-4">Model Not Found</h2>
          <Link href="/dashboard">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const handleExport = () => {
    const url = buildUrl(api.models.export.path, { id: modelId });
    window.open(url, '_blank');
  };

  const projections = model.projections || [];
  const valuation = model.valuation || { enterpriseValue: 0, equityValue: 0, terminalValue: 0, impliedMultiple: 0 };
  const wacc = Number(model.wacc || 10);

  return (
    <Layout>
      <div className="space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 p-6 border border-border rounded-lg">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="outline" size="icon" className="h-10 w-10 rounded-md" data-testid="button-back">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">{model.name}</h1>
            </div>
          </div>
          <div className="flex gap-3 flex-wrap">
            {isEditing ? (
              <>
                <Button 
                  variant="outline" 
                  className="gap-2" 
                  onClick={handleCancel}
                  disabled={updateModel.isPending}
                  data-testid="button-cancel-edit"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
                <Button 
                  className="gap-2 hover-elevate active-elevate-2" 
                  onClick={handleSave}
                  disabled={!hasChanges || updateModel.isPending || !validation.isValid}
                  data-testid="button-save-model"
                >
                  {updateModel.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {updateModel.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  className="gap-2" 
                  onClick={() => setIsEditing(true)}
                  data-testid="button-edit-model"
                >
                  <Pencil className="h-4 w-4" />
                  Edit Model
                </Button>
                <Button 
                  variant="outline" 
                  className="gap-2"
                  onClick={() => setSensitivityDialogOpen(true)}
                  data-testid="button-sensitivity-analysis"
                >
                  <TrendingUp className="h-4 w-4" />
                  Sensitivity Analysis
                </Button>
                <Button onClick={handleExport} className="gap-2 hover-elevate active-elevate-2">
                  <Download className="h-4 w-4" />
                  Export Model
                </Button>
                <Button 
                  variant="outline"
                  className="gap-2"
                  onClick={() => duplicateModelMutation.mutate()}
                  disabled={duplicateModelMutation.isPending}
                  data-testid="button-duplicate-model"
                >
                  {duplicateModelMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  {duplicateModelMutation.isPending ? "Duplicating..." : "Duplicate"}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Edit Mode - Assumptions Card */}
        {isEditing && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-md">
                  <Settings2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Edit Financial Assumptions</CardTitle>
                  <CardDescription>Modify key inputs to recalculate projections and valuation</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">Model Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleFieldChange("name", e.target.value)}
                    placeholder="Enter model name"
                    required
                    className={formErrors.name ? "border-red-500 focus-visible:ring-red-500" : ""}
                    data-testid="input-model-name"
                  />
                  {formErrors.name && (
                    <p className="text-xs text-red-500">{formErrors.name}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="startingRevenue" className="text-sm font-medium">Starting Revenue ($)</Label>
                  <Input
                    id="startingRevenue"
                    type="number"
                    min="1"
                    value={formData.startingRevenue}
                    onChange={(e) => handleFieldChange("startingRevenue", e.target.value)}
                    placeholder="1000000"
                    required
                    className={formErrors.startingRevenue ? "border-red-500 focus-visible:ring-red-500" : ""}
                    data-testid="input-starting-revenue"
                  />
                  {formErrors.startingRevenue && (
                    <p className="text-xs text-red-500">{formErrors.startingRevenue}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="growthRate" className="text-sm font-medium">Growth Rate (%)</Label>
                  <Input
                    id="growthRate"
                    type="number"
                    step="0.1"
                    value={formData.growthRate}
                    onChange={(e) => handleFieldChange("growthRate", e.target.value)}
                    placeholder="15.0"
                    required
                    className={formErrors.growthRate ? "border-red-500 focus-visible:ring-red-500" : ""}
                    data-testid="input-growth-rate"
                  />
                  {formErrors.growthRate && (
                    <p className="text-xs text-red-500">{formErrors.growthRate}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="wacc" className="text-sm font-medium">WACC / Discount Rate (%)</Label>
                  <Input
                    id="wacc"
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="99.9"
                    value={formData.wacc}
                    onChange={(e) => handleFieldChange("wacc", e.target.value)}
                    placeholder="10.0"
                    required
                    className={formErrors.wacc ? "border-red-500 focus-visible:ring-red-500" : ""}
                    data-testid="input-wacc"
                  />
                  {formErrors.wacc && (
                    <p className="text-xs text-red-500">{formErrors.wacc}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="cogsMargin" className="text-sm font-medium">COGS Margin (%)</Label>
                  <Input
                    id="cogsMargin"
                    type="number"
                    step="0.1"
                    min="0"
                    max="99.9"
                    value={formData.cogsMargin}
                    onChange={(e) => handleFieldChange("cogsMargin", e.target.value)}
                    placeholder="40.0"
                    required
                    className={formErrors.cogsMargin ? "border-red-500 focus-visible:ring-red-500" : ""}
                    data-testid="input-cogs-margin"
                  />
                  {formErrors.cogsMargin && (
                    <p className="text-xs text-red-500">{formErrors.cogsMargin}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="opexMargin" className="text-sm font-medium">OpEx Margin (%)</Label>
                  <Input
                    id="opexMargin"
                    type="number"
                    step="0.1"
                    min="0"
                    max="99.9"
                    value={formData.opexMargin}
                    onChange={(e) => handleFieldChange("opexMargin", e.target.value)}
                    placeholder="25.0"
                    required
                    className={formErrors.opexMargin ? "border-red-500 focus-visible:ring-red-500" : ""}
                    data-testid="input-opex-margin"
                  />
                  {formErrors.opexMargin && (
                    <p className="text-xs text-red-500">{formErrors.opexMargin}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="daMargin" className="text-sm font-medium">D&A Rate (%)</Label>
                  <Input
                    id="daMargin"
                    type="number"
                    step="0.1"
                    min="0"
                    max="99.9"
                    value={formData.daMargin}
                    onChange={(e) => handleFieldChange("daMargin", e.target.value)}
                    placeholder="5.0"
                    required
                    className={formErrors.daMargin ? "border-red-500 focus-visible:ring-red-500" : ""}
                    data-testid="input-da-margin"
                  />
                  {formErrors.daMargin && (
                    <p className="text-xs text-red-500">{formErrors.daMargin}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="taxRate" className="text-sm font-medium">Tax Rate (%)</Label>
                  <Input
                    id="taxRate"
                    type="number"
                    step="0.1"
                    min="0"
                    max="99.9"
                    value={formData.taxRate}
                    onChange={(e) => handleFieldChange("taxRate", e.target.value)}
                    placeholder="21.0"
                    required
                    className={formErrors.taxRate ? "border-red-500 focus-visible:ring-red-500" : ""}
                    data-testid="input-tax-rate"
                  />
                  {formErrors.taxRate && (
                    <p className="text-xs text-red-500">{formErrors.taxRate}</p>
                  )}
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t border-border/50">
                <p className="text-sm text-muted-foreground">
                  EBITDA Margin = 100% - COGS Margin - OpEx Margin = <span className="font-mono font-medium text-foreground">{(100 - parseFloat(formData.cogsMargin || "0") - parseFloat(formData.opexMargin || "0")).toFixed(1)}%</span>
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="overview" className="space-y-6">
          <div className="flex items-center border-b overflow-x-auto">
            <TabsList className="bg-transparent h-12 gap-0 border-none">
              <TabsTrigger value="overview" className="gap-2 px-4 h-12 rounded-none border-b-2 border-b-transparent data-[state=active]:border-b-primary data-[state=active]:bg-transparent font-medium transition-all">
                <BarChart3 className="h-4 w-4" /> Overview
              </TabsTrigger>
              <TabsTrigger value="projections" className="gap-2 px-4 h-12 rounded-none border-b-2 border-b-transparent data-[state=active]:border-b-primary data-[state=active]:bg-transparent font-medium transition-all">
                <TableIcon className="h-4 w-4" /> Projections
              </TabsTrigger>
              <TabsTrigger value="dcf" className="gap-2 px-4 h-12 rounded-none border-b-2 border-b-transparent data-[state=active]:border-b-primary data-[state=active]:bg-transparent font-medium transition-all">
                <Calculator className="h-4 w-4" /> DCF
              </TabsTrigger>
              <TabsTrigger value="comps" className="gap-2 px-4 h-12 rounded-none border-b-2 border-b-transparent data-[state=active]:border-b-primary data-[state=active]:bg-transparent font-medium transition-all">
                <Users className="h-4 w-4" /> Comps
              </TabsTrigger>
              <TabsTrigger value="precedent" className="gap-2 px-4 h-12 rounded-none border-b-2 border-b-transparent data-[state=active]:border-b-primary data-[state=active]:bg-transparent font-medium transition-all" data-testid="tab-precedent">
                <TrendingUp className="h-4 w-4" /> Precedent
              </TabsTrigger>
              <TabsTrigger value="lbo" className="gap-2 px-4 h-12 rounded-none border-b-2 border-b-transparent data-[state=active]:border-b-primary data-[state=active]:bg-transparent font-medium transition-all" data-testid="tab-lbo">
                <PieChart className="h-4 w-4" /> LBO
              </TabsTrigger>
              <TabsTrigger value="notes" className="gap-2 px-4 h-12 rounded-none border-b-2 border-b-transparent data-[state=active]:border-b-primary data-[state=active]:bg-transparent font-medium transition-all" data-testid="tab-notes">
                <FileText className="h-4 w-4" /> Notes
              </TabsTrigger>
              <TabsTrigger value="breakdown" className="gap-2 px-4 h-12 rounded-none border-b-2 border-b-transparent data-[state=active]:border-b-primary data-[state=active]:bg-transparent font-medium transition-all" data-testid="tab-breakdown">
                <List className="h-4 w-4" /> Breakdown
              </TabsTrigger>
              <TabsTrigger value="spreadsheet" className="gap-2 px-4 h-12 rounded-none border-b-2 border-b-transparent data-[state=active]:border-b-primary data-[state=active]:bg-transparent font-medium transition-all" data-testid="tab-spreadsheet">
                <Grid className="h-4 w-4" /> Spreadsheet
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="hover-elevate transition-all">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-medium text-muted-foreground">Enterprise Value</p>
                    <div className="p-2 bg-muted rounded-md">
                      <DollarSign className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold font-mono">{formatCurrency(valuation.enterpriseValue)}</h3>
                </CardContent>
              </Card>
              <Card className="hover-elevate transition-all">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-medium text-muted-foreground">Exit Multiple</p>
                    <div className="p-2 bg-muted rounded-md">
                      <TrendingUp className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold font-mono">{valuation.impliedMultiple.toFixed(2)}x</h3>
                  <p className="text-xs text-muted-foreground mt-2">EV / EBITDA Multiple</p>
                </CardContent>
              </Card>
              <Card className="hover-elevate transition-all">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-medium text-muted-foreground">Operating Margin</p>
                    <div className="p-2 bg-muted rounded-md">
                      <Percent className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold font-mono">{projections[4]?.ebitdaMargin?.toFixed(1) || 0}%</h3>
                  <p className="text-xs text-muted-foreground mt-2">Year 5 Target</p>
                </CardContent>
              </Card>
              <Card className="hover-elevate transition-all">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs font-medium text-muted-foreground">Equity Value</p>
                    <div className="p-2 bg-muted rounded-md">
                      <PieChart className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold font-mono">{formatCurrency(valuation.equityValue)}</h3>
                  <p className="text-xs text-muted-foreground mt-2">Residual Value</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-lg font-semibold">Growth Trajectory</CardTitle>
                      <CardDescription className="text-xs mt-1">Revenue vs EBITDA</CardDescription>
                    </div>
                    <div className="h-10 w-10 bg-muted rounded-lg flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="h-[400px] pt-8">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={projections} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorEbit" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                      <XAxis 
                        dataKey="year" 
                        tickFormatter={(v) => `YEAR ${v}`} 
                        stroke="#64748b" 
                        fontSize={10} 
                        fontWeight="900"
                        axisLine={false} 
                        tickLine={false} 
                        dy={10}
                      />
                      <YAxis 
                        tickFormatter={formatCompact} 
                        stroke="#64748b" 
                        fontSize={10} 
                        fontWeight="900"
                        axisLine={false} 
                        tickLine={false} 
                      />
                      <Tooltip 
                        formatter={(value: number) => [formatCurrency(value), '']} 
                        contentStyle={{ 
                          borderRadius: '16px', 
                          border: 'none', 
                          boxShadow: '0 20px 50px rgba(0,0,0,0.1)',
                          background: 'rgba(15, 23, 42, 0.9)',
                          backdropFilter: 'blur(10px)',
                          color: '#fff'
                        }} 
                        itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                      />
                      <Legend verticalAlign="top" align="right" height={40} iconType="circle" />
                      <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" name="Revenue" />
                      <Area type="monotone" dataKey="ebitda" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorEbit)" name="EBITDA" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-lg font-semibold">Margin Performance</CardTitle>
                      <CardDescription className="text-xs mt-1">Operating Margin Trends</CardDescription>
                    </div>
                    <div className="h-10 w-10 bg-muted rounded-lg flex items-center justify-center">
                      <Percent className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="h-[400px] pt-8">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={projections} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                      <XAxis 
                        dataKey="year" 
                        tickFormatter={(v) => `Y${v}`} 
                        stroke="#64748b" 
                        fontSize={10} 
                        fontWeight="900"
                        axisLine={false} 
                        tickLine={false} 
                        dy={10}
                      />
                      <YAxis 
                        tickFormatter={(v) => `${v}%`} 
                        stroke="#64748b" 
                        fontSize={10} 
                        fontWeight="900"
                        axisLine={false} 
                        tickLine={false} 
                      />
                      <Tooltip 
                        formatter={(v: number) => [`${v.toFixed(2)}%`, '']} 
                        contentStyle={{ 
                          borderRadius: '16px', 
                          border: 'none', 
                          boxShadow: '0 20px 50px rgba(0,0,0,0.1)',
                          background: 'rgba(15, 23, 42, 0.9)',
                          backdropFilter: 'blur(10px)',
                          color: '#fff'
                        }} 
                      />
                      <Legend verticalAlign="top" align="right" height={40} iconType="circle" />
                      <Bar dataKey="ebitdaMargin" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} name="EBITDA %" barSize={40} />
                      <Bar dataKey="netMargin" fill="#10b981" radius={[6, 6, 0, 0]} name="Net %" barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="projections" className="space-y-6">
            <Card className="border-none shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white">
                      <th className="text-left py-4 px-6 font-bold w-[250px] border-b border-slate-700">INCOME STATEMENT</th>
                      {projections.map((p: any) => (
                        <th key={p.year} className="text-right py-4 px-6 font-bold border-b border-slate-700">Year {p.year}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <tr className="bg-slate-50/50 font-bold text-slate-900">
                      <td className="py-4 px-6">Revenue</td>
                      {projections.map((p: any) => (
                        <td key={p.year} className="text-right py-4 px-6 font-mono">{formatCurrency(p.revenue)}</td>
                      ))}
                    </tr>
                    <tr className="text-slate-500 italic">
                      <td className="py-2 px-6 pl-10">  % Growth</td>
                      {projections.map((p: any) => (
                        <td key={p.year} className="text-right py-2 px-6 font-mono">{p.revenueGrowth.toFixed(1)}%</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-3 px-6 pl-10 text-slate-600">Cost of Goods Sold (COGS)</td>
                      {projections.map((p: any) => (
                        <td key={p.year} className="text-right py-3 px-6 font-mono">({formatCurrency(p.cogs)})</td>
                      ))}
                    </tr>
                    <tr className="bg-slate-100 font-bold border-t border-b border-slate-200">
                      <td className="py-3 px-6">GROSS PROFIT</td>
                      {projections.map((p: any) => (
                        <td key={p.year} className="text-right py-3 px-6 font-mono">{formatCurrency(p.grossProfit)}</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-3 px-6 pl-10 text-slate-600">Operating Expenses</td>
                      {projections.map((p: any) => (
                        <td key={p.year} className="text-right py-3 px-6 font-mono">({formatCurrency(p.opex)})</td>
                      ))}
                    </tr>
                    <tr className="font-bold text-primary">
                      <td className="py-3 px-6">EBITDA</td>
                      {projections.map((p: any) => (
                        <td key={p.year} className="text-right py-3 px-6 font-mono">{formatCurrency(p.ebitda)}</td>
                      ))}
                    </tr>
                    <tr className="text-slate-500 italic">
                      <td className="py-2 px-6 pl-10">  % Margin</td>
                      {projections.map((p: any) => (
                        <td key={p.year} className="text-right py-2 px-6 font-mono">{p.ebitdaMargin.toFixed(1)}%</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-3 px-6 pl-10 text-slate-600">Depreciation & Amortization</td>
                      {projections.map((p: any) => (
                        <td key={p.year} className="text-right py-3 px-6 font-mono">({formatCurrency(p.da)})</td>
                      ))}
                    </tr>
                    <tr className="bg-slate-50 font-bold">
                      <td className="py-3 px-6">EBIT (Operating Income)</td>
                      {projections.map((p: any) => (
                        <td key={p.year} className="text-right py-3 px-6 font-mono">{formatCurrency(p.ebit)}</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-3 px-6 pl-10 text-slate-600">Interest Expense</td>
                      {projections.map((p: any) => (
                        <td key={p.year} className="text-right py-3 px-6 font-mono">({formatCurrency(p.interest)})</td>
                      ))}
                    </tr>
                    <tr className="bg-slate-900 text-white font-bold">
                      <td className="py-4 px-6">NET INCOME</td>
                      {projections.map((p: any) => (
                        <td key={p.year} className="text-right py-4 px-6 font-mono">{formatCurrency(p.netIncome)}</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="dcf" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Unlevered Free Cash Flow (UFCF) Build</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 font-medium text-muted-foreground">Line Item</th>
                          {projections.map((p: any) => (
                            <th key={p.year} className="text-right py-3 font-medium text-muted-foreground">Y{p.year}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        <tr>
                          <td className="py-3 text-slate-600">Net Income</td>
                          {projections.map((p: any) => (
                            <td key={p.year} className="text-right py-3 font-mono">{formatCurrency(p.netIncome)}</td>
                          ))}
                        </tr>
                        <tr>
                          <td className="py-3 text-slate-600">Plus: D&A</td>
                          {projections.map((p: any) => (
                            <td key={p.year} className="text-right py-3 font-mono text-green-600">{formatCurrency(p.da)}</td>
                          ))}
                        </tr>
                        <tr className="font-bold bg-slate-50">
                          <td className="py-3">Unlevered FCF</td>
                          {projections.map((p: any) => (
                            <td key={p.year} className="text-right py-3 font-mono">{formatCurrency(p.fcf)}</td>
                          ))}
                        </tr>
                        <tr>
                          <td className="py-3 text-slate-400 italic">Discount Factor (@{wacc}%)</td>
                          {projections.map((p: any) => (
                            <td key={p.year} className="text-right py-3 font-mono text-slate-400">{p.discountFactor.toFixed(3)}</td>
                          ))}
                        </tr>
                        <tr className="font-bold text-primary">
                          <td className="py-3">PV of FCF</td>
                          {projections.map((p: any) => (
                            <td key={p.year} className="text-right py-3 font-mono">{formatCurrency(p.pvOfFcf)}</td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-muted/50">
                <CardHeader>
                  <CardTitle>Enterprise Value Bridge</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">PV of Projections</span>
                    <span className="font-mono font-bold">{formatCurrency(valuation.enterpriseValue - (valuation.terminalValue / Math.pow(1 + wacc/100, 5)))}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">PV of Terminal Value</span>
                    <span className="font-mono font-bold">{formatCurrency(valuation.terminalValue / Math.pow(1 + wacc/100, 5))}</span>
                  </div>
                  <div className="flex justify-between items-center py-4 bg-primary/10 rounded-lg px-4 -mx-2">
                    <span className="font-bold">ENTERPRISE VALUE</span>
                    <span className="font-mono text-xl font-bold">{formatCurrency(valuation.enterpriseValue)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Less: Net Debt</span>
                    <span className="font-mono text-destructive">({formatCurrency(Number(model.debtBalance || 0))})</span>
                  </div>
                  <div className="flex justify-between items-center py-4 pt-6">
                    <span className="text-lg font-bold">EQUITY VALUE</span>
                    <span className="font-mono text-xl font-bold text-green-600">{formatCurrency(valuation.equityValue)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="comps" className="space-y-6">
             <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle>Trading Comparables</CardTitle>
                  <CardDescription>Peer analysis and implied valuation</CardDescription>
                </div>
                <Button 
                  size="sm" 
                  onClick={openAddCompDialog}
                  disabled={isSavingComps}
                  data-testid="button-add-comp"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Comp
                </Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-slate-50">
                        <th className="text-left py-4 px-6 font-bold">Company</th>
                        <th className="text-right py-4 px-6 font-bold">EV</th>
                        <th className="text-right py-4 px-6 font-bold">EBITDA</th>
                        <th className="text-right py-4 px-6 font-bold">EV/EBITDA</th>
                        <th className="text-right py-4 px-6 font-bold">P/E</th>
                        <th className="w-20"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {localComps.map((comp: TradingComp, i: number) => (
                        <tr key={i} className="hover:bg-slate-50/50 transition-colors" data-testid={`row-comp-${i}`}>
                          <td className="py-4 px-6 font-medium" data-testid={`text-comp-name-${i}`}>{comp.companyName}</td>
                          <td className="text-right py-4 px-6 font-mono" data-testid={`text-comp-ev-${i}`}>{formatCompact(comp.ev)}</td>
                          <td className="text-right py-4 px-6 font-mono" data-testid={`text-comp-ebitda-${i}`}>{formatCompact(comp.ebitda)}</td>
                          <td className="text-right py-4 px-6 font-mono">{(comp.ev / comp.ebitda).toFixed(1)}x</td>
                          <td className="text-right py-4 px-6 font-mono">{(comp.marketCap / comp.netIncome).toFixed(1)}x</td>
                          <td className="py-4 px-2">
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => openEditCompDialog(i)}
                                disabled={isSavingComps}
                                data-testid={`button-edit-comp-${i}`}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => openDeleteDialog(i)}
                                disabled={isSavingComps}
                                data-testid={`button-delete-comp-${i}`}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {localComps.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-muted-foreground italic">
                            No peer companies added to this model.
                          </td>
                        </tr>
                      )}
                    </tbody>
                    {localComps.length > 0 && (
                      <tfoot>
                        <tr className="bg-slate-900 text-white">
                          <td className="py-4 px-6 font-bold uppercase">Average Multiple</td>
                          <td colSpan={2}></td>
                          <td className="text-right py-4 px-6 font-bold font-mono">{calculatedCompsAnalysis.avgEvEbitda.toFixed(1)}x</td>
                          <td className="text-right py-4 px-6 font-bold font-mono">{calculatedCompsAnalysis.avgPe.toFixed(1)}x</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>

                {localComps.length > 0 && (
                  <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="bg-slate-50 border-none shadow-sm">
                      <CardHeader className="pb-2">
                        <CardDescription>Implied EV (EV/EBITDA)</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <h4 className="text-2xl font-bold font-mono">{formatCurrency(calculatedCompsAnalysis.impliedEv)}</h4>
                        <p className="text-xs text-muted-foreground mt-1">Based on peer avg {calculatedCompsAnalysis.avgEvEbitda.toFixed(1)}x</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-slate-50 border-none shadow-sm">
                      <CardHeader className="pb-2">
                        <CardDescription>Implied Equity Value (P/E)</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <h4 className="text-2xl font-bold font-mono text-green-600">{formatCurrency(calculatedCompsAnalysis.impliedEquityValue)}</h4>
                        <p className="text-xs text-muted-foreground mt-1">Based on peer avg {calculatedCompsAnalysis.avgPe.toFixed(1)}x</p>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="precedent" className="space-y-6">
            <Card className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-xl font-semibold">Precedent Transaction Analysis</CardTitle>
                  <CardDescription className="mt-2">
                    M&A transaction multiples from comparable deals in the industry
                  </CardDescription>
                </div>
                <Button 
                  size="sm" 
                  onClick={openAddPrecedentDialog}
                  disabled={isSavingPrecedent}
                  data-testid="button-add-precedent"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Transaction
                </Button>
              </CardHeader>
              <CardContent className="p-8">
                {isPrecedentsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto rounded-xl border">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-slate-50">
                            <th className="text-left py-4 px-6 font-bold">Transaction</th>
                            <th className="text-left py-4 px-6 font-bold">Date</th>
                            <th className="text-right py-4 px-6 font-bold">Deal Value</th>
                            <th className="text-right py-4 px-6 font-bold">EV/Revenue</th>
                            <th className="text-right py-4 px-6 font-bold">EV/EBITDA</th>
                            <th className="w-20"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {precedentTransactions.map((transaction: PrecedentTransaction) => (
                            <tr key={transaction.id} className="hover:bg-slate-50/50 transition-colors" data-testid={`row-precedent-${transaction.id}`}>
                              <td className="py-4 px-6">
                                <div className="font-medium" data-testid={`text-precedent-target-${transaction.id}`}>{transaction.targetName}</div>
                                {transaction.acquirerName && (
                                  <div className="text-xs text-muted-foreground">{transaction.acquirerName}</div>
                                )}
                              </td>
                              <td className="py-4 px-6 text-muted-foreground">{transaction.transactionDate || "-"}</td>
                              <td className="text-right py-4 px-6 font-mono">
                                {transaction.transactionValue ? formatCurrency(parseFloat(transaction.transactionValue)) : "-"}
                              </td>
                              <td className="text-right py-4 px-6 font-mono">
                                {transaction.evRevenue ? `${parseFloat(transaction.evRevenue).toFixed(1)}x` : "-"}
                              </td>
                              <td className="text-right py-4 px-6 font-mono">
                                {transaction.evEbitda ? `${parseFloat(transaction.evEbitda).toFixed(1)}x` : "-"}
                              </td>
                              <td className="py-4 px-2">
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => openEditPrecedentDialog(transaction)}
                                    disabled={isSavingPrecedent}
                                    data-testid={`button-edit-precedent-${transaction.id}`}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                    onClick={() => openDeletePrecedentDialog(transaction.id)}
                                    disabled={deletePrecedentMutation.isPending}
                                    data-testid={`button-delete-precedent-${transaction.id}`}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {precedentTransactions.length === 0 && (
                            <tr>
                              <td colSpan={6} className="py-12 text-center text-muted-foreground italic">
                                No precedent transactions added to this model.
                              </td>
                            </tr>
                          )}
                        </tbody>
                        {precedentTransactions.length > 0 && (
                          <tfoot>
                            <tr className="bg-slate-900 text-white">
                              <td className="py-4 px-6 font-bold uppercase" colSpan={3}>Median / Avg Multiple</td>
                              <td className="text-right py-4 px-6 font-bold font-mono">
                                {precedentAnalysis.medianEvRevenue.toFixed(1)}x / {precedentAnalysis.avgEvRevenue.toFixed(1)}x
                              </td>
                              <td className="text-right py-4 px-6 font-bold font-mono">
                                {precedentAnalysis.medianEvEbitda.toFixed(1)}x / {precedentAnalysis.avgEvEbitda.toFixed(1)}x
                              </td>
                              <td></td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>

                    {precedentTransactions.length > 0 && (
                      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="bg-muted/50">
                          <CardHeader className="pb-2">
                            <CardDescription className="font-medium">Implied EV (EV/Revenue)</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <h4 className="text-xl font-bold font-mono">
                              {formatCurrency((projections[0]?.revenue || 0) * precedentAnalysis.medianEvRevenue)}
                            </h4>
                            <p className="text-xs text-muted-foreground mt-1">Based on median {precedentAnalysis.medianEvRevenue.toFixed(1)}x</p>
                          </CardContent>
                        </Card>
                        <Card className="bg-muted/50">
                          <CardHeader className="pb-2">
                            <CardDescription className="font-medium">Implied EV (EV/EBITDA)</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <h4 className="text-xl font-bold font-mono">
                              {formatCurrency((projections[0]?.ebitda || 0) * precedentAnalysis.medianEvEbitda)}
                            </h4>
                            <p className="text-xs text-muted-foreground mt-1">Based on median {precedentAnalysis.medianEvEbitda.toFixed(1)}x</p>
                          </CardContent>
                        </Card>
                        <Card className="bg-muted/50">
                          <CardHeader className="pb-2">
                            <CardDescription className="font-medium">Avg Implied EV</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <h4 className="text-xl font-bold font-mono text-green-600">
                              {formatCurrency(
                                ((projections[0]?.revenue || 0) * precedentAnalysis.avgEvRevenue + 
                                 (projections[0]?.ebitda || 0) * precedentAnalysis.avgEvEbitda) / 2
                              )}
                            </h4>
                            <p className="text-xs text-muted-foreground mt-1">Average of both methods</p>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="lbo" className="space-y-6">
            <Card className="overflow-hidden">
              <CardHeader>
                <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                  <div>
                    <CardTitle className="text-xl font-semibold">Leveraged Buyout Analysis</CardTitle>
                    <CardDescription className="mt-2">
                      Target IRR analysis with different leverage and exit scenarios
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex gap-6">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground font-medium">Target IRR</p>
                        <p className="text-lg font-bold font-mono mt-1">{lboMetrics?.targetIrr || 25}%</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground font-medium">Hold Period</p>
                        <p className="text-lg font-bold font-mono mt-1">{lboMetrics?.holdPeriod || 5} Years</p>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={openLboDialog}
                      disabled={isLboLoading || updateLboMutation.isPending}
                      data-testid="button-edit-lbo-assumptions"
                    >
                      <Settings2 className="h-4 w-4 mr-1" />
                      Edit Assumptions
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8">
                {isLboLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <h4 className="text-lg font-bold flex items-center gap-2">
                      <Calculator className="h-5 w-5 text-primary" />
                      Transaction Structure
                    </h4>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                        <span className="font-medium">Entry Enterprise Value</span>
                        <span className="font-mono font-bold">{formatCurrency(valuation.enterpriseValue)}</span>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                        <span className="font-medium">Debt Financing ({((lboMetrics?.debtPct || 0.6) * 100).toFixed(0)}%)</span>
                        <span className="font-mono font-bold text-blue-600">{formatCurrency(lboMetrics?.entryDebt || valuation.enterpriseValue * 0.6)}</span>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                        <span className="font-medium">Equity Contribution ({((lboMetrics?.equityPct || 0.4) * 100).toFixed(0)}%)</span>
                        <span className="font-mono font-bold text-green-600">{formatCurrency(lboMetrics?.entryEquity || valuation.enterpriseValue * 0.4)}</span>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                        <span className="font-medium">Interest Rate</span>
                        <span className="font-mono font-bold">{((lboMetrics?.interestRate || 0.08) * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                        <span className="font-medium">Annual Debt Paydown</span>
                        <span className="font-mono font-bold">{((lboMetrics?.annualPaydown || 0.06) * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-slate-900 text-white rounded-xl">
                        <span className="font-bold">Entry EV/EBITDA Multiple</span>
                        <span className="font-mono font-bold">{(lboMetrics?.entryMultiple || valuation.impliedMultiple).toFixed(1)}x</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h4 className="text-lg font-bold flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      Exit Scenario Analysis
                    </h4>
                    <div className="overflow-x-auto rounded-xl border">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-slate-50 dark:bg-slate-800">
                            <th className="text-left py-3 px-4 font-bold">Exit Multiple</th>
                            <th className="text-right py-3 px-4 font-bold">Exit EV</th>
                            <th className="text-right py-3 px-4 font-bold">Equity Value</th>
                            <th className="text-right py-3 px-4 font-bold">MOIC</th>
                            <th className="text-right py-3 px-4 font-bold">IRR</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {(lboMetrics?.exitMultiples || [10, 12, 14, 16]).map((multiple) => {
                            const holdPeriod = lboMetrics?.holdPeriod || 5;
                            const exitYearEbitda = lboMetrics?.exitYearEbitda || projections[4]?.ebitda || 0;
                            const exitEv = exitYearEbitda * multiple;
                            const debtAtExit = lboMetrics?.debtAtExit || valuation.enterpriseValue * 0.6 * 0.7;
                            const exitEquity = exitEv - debtAtExit;
                            const entryEquity = lboMetrics?.entryEquity || valuation.enterpriseValue * 0.4;
                            const moic = entryEquity > 0 ? exitEquity / entryEquity : 0;
                            const irr = moic > 0 ? (Math.pow(moic, 1/holdPeriod) - 1) * 100 : 0;
                            const isBase = multiple === Math.floor(lboMetrics?.exitMultiple || 12);
                            const targetIrr = lboMetrics?.targetIrr || 25;
                            
                            return (
                              <tr key={multiple} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors ${isBase ? 'bg-green-50 dark:bg-green-900/20' : ''}`}>
                                <td className="py-3 px-4 font-medium">{multiple}x {isBase && <span className="text-xs bg-green-500 text-white px-1.5 py-0.5 rounded ml-2">Base</span>}</td>
                                <td className="text-right py-3 px-4 font-mono">{formatCurrency(exitEv)}</td>
                                <td className="text-right py-3 px-4 font-mono">{formatCurrency(exitEquity)}</td>
                                <td className="text-right py-3 px-4 font-mono font-bold">{moic.toFixed(2)}x</td>
                                <td className={`text-right py-3 px-4 font-mono font-bold ${irr >= targetIrr ? 'text-green-600' : irr >= targetIrr - 5 ? 'text-amber-600' : 'text-red-600'}`}>
                                  {irr.toFixed(1)}%
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="mt-8 p-6 bg-muted rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div>
                      <p className="text-xs text-muted-foreground font-medium mb-2">Year {lboMetrics?.holdPeriod || 5} EBITDA</p>
                      <p className="text-lg font-bold font-mono">{formatCurrency(lboMetrics?.exitYearEbitda || projections[4]?.ebitda || 0)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium mb-2">Exit EV @ {lboMetrics?.exitMultiple?.toFixed(1) || "12.0"}x</p>
                      <p className="text-lg font-bold font-mono text-primary">{formatCurrency(lboMetrics?.exitEv || 0)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium mb-2">Debt at Exit</p>
                      <p className="text-lg font-bold font-mono">{formatCurrency(lboMetrics?.debtAtExit || 0)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium mb-2">Sponsor Equity Return</p>
                      <p className="text-lg font-bold font-mono">
                        {(lboMetrics?.moic || 0).toFixed(2)}x MOIC / {(lboMetrics?.irr || 0).toFixed(1)}% IRR
                      </p>
                    </div>
                  </div>
                </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notes" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Model Notes
                </CardTitle>
                <CardDescription>
                  Keep track of assumptions, observations, and analysis notes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 border rounded-lg bg-muted/30">
                  <h4 className="font-medium mb-4">
                    {editingNoteId ? "Edit Note" : "Add New Note"}
                  </h4>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="noteTitle">Title</Label>
                      <Input
                        id="noteTitle"
                        value={noteFormData.title}
                        onChange={(e) => setNoteFormData(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Enter note title..."
                        data-testid="input-note-title"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="noteContent">Content</Label>
                      <Textarea
                        id="noteContent"
                        value={noteFormData.content}
                        onChange={(e) => setNoteFormData(prev => ({ ...prev, content: e.target.value }))}
                        placeholder="Enter your note content..."
                        className="min-h-[100px]"
                        data-testid="input-note-content"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          if (editingNoteId) {
                            updateNoteMutation.mutate({
                              id: editingNoteId,
                              data: { section: noteFormData.title, content: noteFormData.content }
                            });
                          } else {
                            createNoteMutation.mutate({
                              section: noteFormData.title,
                              content: noteFormData.content
                            });
                          }
                        }}
                        disabled={!noteFormData.content || createNoteMutation.isPending || updateNoteMutation.isPending}
                        data-testid="button-save-note"
                      >
                        {(createNoteMutation.isPending || updateNoteMutation.isPending) ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        {editingNoteId ? "Update Note" : "Add Note"}
                      </Button>
                      {editingNoteId && (
                        <Button
                          variant="outline"
                          onClick={() => {
                            setEditingNoteId(null);
                            setNoteFormData(emptyNoteForm);
                          }}
                          data-testid="button-cancel-note-edit"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">
                    All Notes ({notes.length})
                  </h4>
                  {isNotesLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : notes.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
                      <p>No notes yet. Add your first note above.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {[...notes]
                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                        .map((note) => (
                          <div
                            key={note.id}
                            className="p-4 border rounded-lg bg-background hover:bg-muted/30 transition-colors"
                            data-testid={`note-item-${note.id}`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                {note.section && (
                                  <h5 className="font-medium text-sm mb-1" data-testid={`note-title-${note.id}`}>
                                    {note.section}
                                  </h5>
                                )}
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap" data-testid={`note-content-${note.id}`}>
                                  {note.content}
                                </p>
                                <p className="text-xs text-muted-foreground mt-2">
                                  {new Date(note.createdAt).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setEditingNoteId(note.id);
                                    setNoteFormData({
                                      title: note.section || "",
                                      content: note.content
                                    });
                                  }}
                                  data-testid={`button-edit-note-${note.id}`}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setDeleteNoteId(note.id);
                                    setDeleteNoteDialogOpen(true);
                                  }}
                                  data-testid={`button-delete-note-${note.id}`}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="breakdown" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <List className="h-5 w-5" />
                  Calculation Breakdown
                </CardTitle>
                <CardDescription>
                  See how each metric is calculated step by step
                </CardDescription>
              </CardHeader>
              <CardContent>
                {breakdownData ? (
                  <div className="space-y-6">
                    <div className="flex gap-2 flex-wrap">
                      {(breakdownData as any).yearlyBreakdowns?.map((yb: any) => (
                        <Button
                          key={yb.year}
                          variant={selectedBreakdownYear === yb.year ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedBreakdownYear(yb.year)}
                        >
                          Year {yb.year}
                        </Button>
                      ))}
                      <Button
                        variant={selectedBreakdownYear === 0 ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedBreakdownYear(0)}
                      >
                        Valuation
                      </Button>
                    </div>
                    
                    {selectedBreakdownYear > 0 && (breakdownData as any).yearlyBreakdowns?.find((yb: any) => yb.year === selectedBreakdownYear) && (
                      <div className="space-y-4">
                        {['grossProfit', 'ebitda', 'ebit', 'netIncome', 'ufcf'].map(metricKey => {
                          const breakdown = (breakdownData as any).yearlyBreakdowns.find((yb: any) => yb.year === selectedBreakdownYear)?.[metricKey];
                          if (!breakdown) return null;
                          const isExpanded = expandedMetrics.has(`${selectedBreakdownYear}-${metricKey}`);
                          return (
                            <div key={metricKey} className="border rounded-lg overflow-hidden">
                              <button
                                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left"
                                onClick={() => toggleMetric(`${selectedBreakdownYear}-${metricKey}`)}
                              >
                                <div className="flex items-center gap-3">
                                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                  <span className="font-medium">{breakdown.metricLabel}</span>
                                </div>
                                <span className="font-mono font-bold">{formatCurrency(breakdown.finalValue)}</span>
                              </button>
                              {isExpanded && (
                                <div className="border-t bg-muted/20 p-4">
                                  <div className="space-y-2">
                                    {breakdown.steps.map((step: any, idx: number) => (
                                      <div key={idx} className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                          {step.operator && <span className="w-4 text-muted-foreground font-mono">{step.operator}</span>}
                                          <span>{step.label}</span>
                                          {step.formula && <span className="text-xs text-muted-foreground">({step.formula})</span>}
                                        </div>
                                        <span className="font-mono">{formatCurrency(step.value)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    {selectedBreakdownYear === 0 && (breakdownData as any).valuationBreakdown && (
                      <div className="space-y-4">
                        {['pvOfFcf', 'terminalValue', 'enterpriseValue', 'equityValue'].map(metricKey => {
                          const breakdown = (breakdownData as any).valuationBreakdown[metricKey];
                          if (!breakdown) return null;
                          const isExpanded = expandedMetrics.has(`valuation-${metricKey}`);
                          return (
                            <div key={metricKey} className="border rounded-lg overflow-hidden">
                              <button
                                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left"
                                onClick={() => toggleMetric(`valuation-${metricKey}`)}
                              >
                                <div className="flex items-center gap-3">
                                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                  <span className="font-medium">{breakdown.metricLabel}</span>
                                </div>
                                <span className="font-mono font-bold">{formatCurrency(breakdown.finalValue)}</span>
                              </button>
                              {isExpanded && (
                                <div className="border-t bg-muted/20 p-4">
                                  <div className="space-y-2">
                                    {breakdown.steps.map((step: any, idx: number) => (
                                      <div key={idx} className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                          {step.operator && <span className="w-4 text-muted-foreground font-mono">{step.operator}</span>}
                                          <span>{step.label}</span>
                                          {step.formula && <span className="text-xs text-muted-foreground">({step.formula})</span>}
                                        </div>
                                        <span className="font-mono">{typeof step.value === 'number' ? formatCurrency(step.value) : step.value}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="spreadsheet" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Grid className="h-5 w-5" />
                    Model Spreadsheet View
                  </CardTitle>
                  <CardDescription>
                    View the model in a spreadsheet format with formulas
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md text-sm">
                    <span className="text-muted-foreground">Format:</span>
                    <Select value={spreadsheetFormat} onValueChange={(v: any) => setSpreadsheetFormat(v)}>
                      <SelectTrigger className="w-[100px] h-8 border-0 bg-transparent">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="currency">Currency</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="compact">Compact</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md text-sm">
                    <span className="text-muted-foreground">Decimals:</span>
                    <Select value={String(spreadsheetDecimals)} onValueChange={(v) => setSpreadsheetDecimals(Number(v))}>
                      <SelectTrigger className="w-[60px] h-8 border-0 bg-transparent">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">0</SelectItem>
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md text-sm">
                    <Switch 
                      id="show-formulas" 
                      checked={showFormulas}
                      onCheckedChange={setShowFormulas}
                    />
                    <Label htmlFor="show-formulas" className="text-sm cursor-pointer">Formulas</Label>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {(spreadsheetData as any)?.sheets ? (
                  <Tabs defaultValue={(spreadsheetData as any).sheets[0]?.id} className="space-y-4">
                    <TabsList className="bg-muted">
                      {(spreadsheetData as any).sheets.map((sheet: any) => (
                        <TabsTrigger key={sheet.id} value={sheet.id} className="text-sm">
                          {sheet.title}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    {(spreadsheetData as any).sheets.map((sheet: any) => (
                      <TabsContent key={sheet.id} value={sheet.id} className="mt-0">
                        <div className="border rounded-lg overflow-x-auto" data-testid={`spreadsheet-table-${sheet.id}`}>
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-slate-900 text-white">
                                {sheet.columnHeaders.map((header: string, idx: number) => (
                                  <th 
                                    key={idx} 
                                    className={`py-3 px-4 font-semibold ${idx === 0 ? 'text-left sticky left-0 bg-slate-900 z-10' : 'text-right'}`}
                                  >
                                    {header}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {sheet.rows.map((row: any, rowIdx: number) => (
                                <tr 
                                  key={rowIdx} 
                                  className={`${row.isSummary ? 'bg-slate-50 font-semibold' : 'hover:bg-muted/50'} ${row.isHeader ? 'bg-muted font-medium' : ''}`}
                                  data-testid={`spreadsheet-row-${rowIdx}`}
                                >
                                  <td className="py-3 px-4 sticky left-0 bg-background border-r">{row.label}</td>
                                  {row.cells.map((cell: any, cellIdx: number) => {
                                    const formatValue = () => {
                                      if (showFormulas && cell.formula) {
                                        return cell.formula;
                                      }
                                      const val = Number(cell.value);
                                      if (isNaN(val)) return cell.value;
                                      
                                      if (cell.format?.numberFormat === 'percent') {
                                        return `${val.toFixed(spreadsheetDecimals)}%`;
                                      }
                                      
                                      if (spreadsheetFormat === 'compact') {
                                        if (Math.abs(val) >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(spreadsheetDecimals)}B`;
                                        if (Math.abs(val) >= 1_000_000) return `${(val / 1_000_000).toFixed(spreadsheetDecimals)}M`;
                                        if (Math.abs(val) >= 1_000) return `${(val / 1_000).toFixed(spreadsheetDecimals)}K`;
                                        return val.toFixed(spreadsheetDecimals);
                                      } else if (spreadsheetFormat === 'number') {
                                        return val.toLocaleString(undefined, { minimumFractionDigits: spreadsheetDecimals, maximumFractionDigits: spreadsheetDecimals });
                                      } else {
                                        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: spreadsheetDecimals, maximumFractionDigits: spreadsheetDecimals }).format(val);
                                      }
                                    };
                                    return (
                                      <td 
                                        key={cellIdx} 
                                        className={`py-3 px-4 font-mono ${cell.format?.align === 'left' ? 'text-left' : 'text-right'} ${showFormulas && cell.formula ? 'text-xs text-muted-foreground italic' : ''}`}
                                        title={cell.formula}
                                      >
                                        {formatValue()}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>
                ) : (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Note Confirmation Dialog */}
      <AlertDialog open={deleteNoteDialogOpen} onOpenChange={setDeleteNoteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this note? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-note">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteNoteId && deleteNoteMutation.mutate(deleteNoteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-note"
            >
              {deleteNoteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add/Edit Comp Dialog */}
      <Dialog open={compDialogOpen} onOpenChange={setCompDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCompIndex !== null ? "Edit Comparable" : "Add Comparable"}</DialogTitle>
            <DialogDescription>
              {editingCompIndex !== null 
                ? "Update the peer company information below."
                : "Enter the peer company details to add to your analysis."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={compFormData.companyName}
                onChange={(e) => handleCompFormChange("companyName", e.target.value)}
                placeholder="e.g., Apple Inc."
                data-testid="input-comp-company-name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ev">Enterprise Value ($)</Label>
              <Input
                id="ev"
                type="number"
                value={compFormData.ev}
                onChange={(e) => handleCompFormChange("ev", e.target.value)}
                placeholder="e.g., 2500000000"
                data-testid="input-comp-ev"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ebitda">EBITDA ($)</Label>
              <Input
                id="ebitda"
                type="number"
                value={compFormData.ebitda}
                onChange={(e) => handleCompFormChange("ebitda", e.target.value)}
                placeholder="e.g., 200000000"
                data-testid="input-comp-ebitda"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="marketCap">Market Cap ($)</Label>
              <Input
                id="marketCap"
                type="number"
                value={compFormData.marketCap}
                onChange={(e) => handleCompFormChange("marketCap", e.target.value)}
                placeholder="e.g., 2300000000"
                data-testid="input-comp-market-cap"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="netIncome">Net Income ($)</Label>
              <Input
                id="netIncome"
                type="number"
                value={compFormData.netIncome}
                onChange={(e) => handleCompFormChange("netIncome", e.target.value)}
                placeholder="e.g., 150000000"
                data-testid="input-comp-net-income"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setCompDialogOpen(false)}
              data-testid="button-comp-cancel"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveComp}
              disabled={!compFormData.companyName || isSavingComps}
              data-testid="button-comp-save"
            >
              {isSavingComps ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {editingCompIndex !== null ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Comparable?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "{deleteCompIndex !== null ? localComps[deleteCompIndex]?.companyName : ''}" from your comparables? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-delete-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteComp}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-delete-confirm"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add/Edit Precedent Transaction Dialog */}
      <Dialog open={precedentDialogOpen} onOpenChange={setPrecedentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPrecedentId !== null ? "Edit Transaction" : "Add Transaction"}</DialogTitle>
            <DialogDescription>
              {editingPrecedentId !== null 
                ? "Update the transaction details below."
                : "Enter the precedent transaction details to add to your analysis."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="targetName">Target Company</Label>
              <Input
                id="targetName"
                value={precedentFormData.targetName}
                onChange={(e) => handlePrecedentFormChange("targetName", e.target.value)}
                placeholder="e.g., Target Corp"
                data-testid="input-precedent-target-name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="acquirerName">Acquirer</Label>
              <Input
                id="acquirerName"
                value={precedentFormData.acquirerName}
                onChange={(e) => handlePrecedentFormChange("acquirerName", e.target.value)}
                placeholder="e.g., Buyer Inc."
                data-testid="input-precedent-acquirer-name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="transactionDate">Deal Date</Label>
              <Input
                id="transactionDate"
                value={precedentFormData.transactionDate}
                onChange={(e) => handlePrecedentFormChange("transactionDate", e.target.value)}
                placeholder="e.g., 2024 or Q1 2024"
                data-testid="input-precedent-date"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="transactionValue">Deal Value ($)</Label>
              <Input
                id="transactionValue"
                type="number"
                value={precedentFormData.transactionValue}
                onChange={(e) => handlePrecedentFormChange("transactionValue", e.target.value)}
                placeholder="e.g., 500000000"
                data-testid="input-precedent-value"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="evRevenue">EV/Revenue Multiple</Label>
                <Input
                  id="evRevenue"
                  type="number"
                  step="0.1"
                  value={precedentFormData.evRevenue}
                  onChange={(e) => handlePrecedentFormChange("evRevenue", e.target.value)}
                  placeholder="e.g., 3.5"
                  data-testid="input-precedent-ev-revenue"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="evEbitda">EV/EBITDA Multiple</Label>
                <Input
                  id="evEbitda"
                  type="number"
                  step="0.1"
                  value={precedentFormData.evEbitda}
                  onChange={(e) => handlePrecedentFormChange("evEbitda", e.target.value)}
                  placeholder="e.g., 12.0"
                  data-testid="input-precedent-ev-ebitda"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setPrecedentDialogOpen(false)}
              data-testid="button-precedent-cancel"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSavePrecedent}
              disabled={!precedentFormData.targetName || isSavingPrecedent}
              data-testid="button-precedent-save"
            >
              {isSavingPrecedent ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {editingPrecedentId !== null ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Precedent Transaction Confirmation Dialog */}
      <AlertDialog open={deletePrecedentDialogOpen} onOpenChange={setDeletePrecedentDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this precedent transaction from your analysis? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-delete-precedent-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeletePrecedent}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deletePrecedentMutation.isPending}
              data-testid="button-delete-precedent-confirm"
            >
              {deletePrecedentMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* LBO Assumptions Dialog */}
      <Dialog open={lboDialogOpen} onOpenChange={setLboDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit LBO Assumptions</DialogTitle>
            <DialogDescription>
              Configure the leveraged buyout parameters for this analysis.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="entryMultiple">Entry EV/EBITDA Multiple</Label>
                <Input
                  id="entryMultiple"
                  type="number"
                  step="0.1"
                  value={lboFormData.entryMultiple}
                  onChange={(e) => handleLboFormChange("entryMultiple", e.target.value)}
                  placeholder={valuation.impliedMultiple?.toFixed(1) || "8.0"}
                  data-testid="input-lbo-entry-multiple"
                />
                <p className="text-xs text-muted-foreground">Implied: {valuation.impliedMultiple?.toFixed(1)}x</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="exitMultiple">Exit EV/EBITDA Multiple</Label>
                <Input
                  id="exitMultiple"
                  type="number"
                  step="0.1"
                  value={lboFormData.exitMultiple}
                  onChange={(e) => handleLboFormChange("exitMultiple", e.target.value)}
                  placeholder="12.0"
                  data-testid="input-lbo-exit-multiple"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="debtPercent">Debt % (Leverage)</Label>
                <Input
                  id="debtPercent"
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  value={lboFormData.debtPercent}
                  onChange={(e) => handleLboFormChange("debtPercent", e.target.value)}
                  placeholder="60"
                  data-testid="input-lbo-debt-percent"
                />
                <p className="text-xs text-muted-foreground">Equity: {100 - parseFloat(lboFormData.debtPercent || "0")}%</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="holdingPeriod">Hold Period (Years)</Label>
                <Input
                  id="holdingPeriod"
                  type="number"
                  step="1"
                  min="1"
                  max="10"
                  value={lboFormData.holdingPeriod}
                  onChange={(e) => handleLboFormChange("holdingPeriod", e.target.value)}
                  placeholder="5"
                  data-testid="input-lbo-holding-period"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="interestRate">Interest Rate (%)</Label>
                <Input
                  id="interestRate"
                  type="number"
                  step="0.1"
                  value={lboFormData.interestRate}
                  onChange={(e) => handleLboFormChange("interestRate", e.target.value)}
                  placeholder="8.0"
                  data-testid="input-lbo-interest-rate"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="annualDebtPaydown">Annual Debt Paydown (%)</Label>
                <Input
                  id="annualDebtPaydown"
                  type="number"
                  step="0.1"
                  value={lboFormData.annualDebtPaydown}
                  onChange={(e) => handleLboFormChange("annualDebtPaydown", e.target.value)}
                  placeholder="6.0"
                  data-testid="input-lbo-debt-paydown"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="targetIrr">Target IRR (%)</Label>
              <Input
                id="targetIrr"
                type="number"
                step="0.1"
                value={lboFormData.targetIrr}
                onChange={(e) => handleLboFormChange("targetIrr", e.target.value)}
                placeholder="25.0"
                data-testid="input-lbo-target-irr"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setLboDialogOpen(false)}
              data-testid="button-lbo-cancel"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveLbo}
              disabled={updateLboMutation.isPending}
              data-testid="button-lbo-save"
            >
              {updateLboMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Save Assumptions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sensitivity Analysis Dialog */}
      <Dialog open={sensitivityDialogOpen} onOpenChange={setSensitivityDialogOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Sensitivity Analysis
            </DialogTitle>
            <DialogDescription>
              Analyze how changes in key assumptions affect the valuation output.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Variable Selection */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rowVariable" className="text-sm font-medium">Row Variable</Label>
                <Select 
                  value={sensitivityRowVar} 
                  onValueChange={(value) => {
                    if (value === sensitivityColVar) {
                      setSensitivityColVar(sensitivityRowVar);
                    }
                    setSensitivityRowVar(value);
                  }}
                >
                  <SelectTrigger id="rowVariable" data-testid="select-sensitivity-row">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wacc">WACC / Discount Rate</SelectItem>
                    <SelectItem value="exitMultiple">Exit Multiple</SelectItem>
                    <SelectItem value="growthRate">Growth Rate</SelectItem>
                    <SelectItem value="ebitdaMargin">EBITDA Margin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="colVariable" className="text-sm font-medium">Column Variable</Label>
                <Select 
                  value={sensitivityColVar} 
                  onValueChange={(value) => {
                    if (value === sensitivityRowVar) {
                      setSensitivityRowVar(sensitivityColVar);
                    }
                    setSensitivityColVar(value);
                  }}
                >
                  <SelectTrigger id="colVariable" data-testid="select-sensitivity-col">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wacc">WACC / Discount Rate</SelectItem>
                    <SelectItem value="exitMultiple">Exit Multiple</SelectItem>
                    <SelectItem value="growthRate">Growth Rate</SelectItem>
                    <SelectItem value="ebitdaMargin">EBITDA Margin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Output Value</Label>
                <div className="flex items-center justify-between border rounded-md px-3 h-9">
                  <span className={`text-sm ${!showEquityValue ? 'font-medium' : 'text-muted-foreground'}`}>
                    EV
                  </span>
                  <Switch
                    checked={showEquityValue}
                    onCheckedChange={setShowEquityValue}
                    data-testid="switch-equity-value"
                  />
                  <span className={`text-sm ${showEquityValue ? 'font-medium' : 'text-muted-foreground'}`}>
                    Equity
                  </span>
                </div>
              </div>
            </div>

            {/* Sensitivity Table */}
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-sm" data-testid="table-sensitivity">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="p-3 text-left font-semibold border-b border-r">
                      <div className="text-xs text-muted-foreground">
                        {sensitivityVariables[sensitivityRowVar as keyof typeof sensitivityVariables]?.label} ↓
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {sensitivityVariables[sensitivityColVar as keyof typeof sensitivityVariables]?.label} →
                      </div>
                    </th>
                    {sensitivityGrid.cols.map((col, colIdx) => {
                      const colConfig = sensitivityVariables[sensitivityColVar as keyof typeof sensitivityVariables];
                      const isCenter = colIdx === sensitivityGrid.centerColIndex;
                      return (
                        <th 
                          key={colIdx} 
                          className={`p-3 text-center font-mono font-semibold border-b ${isCenter ? 'bg-primary/10' : ''}`}
                        >
                          {col.toFixed(sensitivityColVar === 'exitMultiple' ? 1 : 1)}{colConfig?.unit}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {sensitivityGrid.rows.map((row, rowIdx) => {
                    const rowConfig = sensitivityVariables[sensitivityRowVar as keyof typeof sensitivityVariables];
                    const isRowCenter = rowIdx === sensitivityGrid.centerRowIndex;
                    return (
                      <tr key={rowIdx}>
                        <td 
                          className={`p-3 font-mono font-semibold border-r ${isRowCenter ? 'bg-primary/10' : 'bg-muted/30'}`}
                        >
                          {row.toFixed(sensitivityRowVar === 'exitMultiple' ? 1 : 1)}{rowConfig?.unit}
                        </td>
                        {sensitivityGrid.grid[rowIdx]?.map((value, colIdx) => {
                          const isCenter = rowIdx === sensitivityGrid.centerRowIndex && colIdx === sensitivityGrid.centerColIndex;
                          const cellColor = getCellColor(value, sensitivityGrid.minVal || 0, sensitivityGrid.maxVal || 1);
                          return (
                            <td 
                              key={colIdx}
                              className={`p-3 text-center font-mono ${cellColor} ${
                                isCenter ? 'ring-2 ring-primary ring-inset font-bold' : ''
                              }`}
                              data-testid={isCenter ? "cell-sensitivity-current" : undefined}
                            >
                              ${formatCompact(value)}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-between text-xs text-muted-foreground px-2">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-green-500/20 dark:bg-green-500/30" />
                  <span>Higher Value</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-red-500/20 dark:bg-red-500/30" />
                  <span>Lower Value</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded ring-2 ring-primary" />
                <span>Current Assumptions</span>
              </div>
            </div>

            {/* Current Values Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-muted/30 rounded-lg">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">WACC</p>
                <p className="font-mono font-semibold">{Number(model.wacc || 10).toFixed(1)}%</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Exit Multiple</p>
                <p className="font-mono font-semibold">{Number(model.exitMultiple || 12).toFixed(1)}x</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Growth Rate</p>
                <p className="font-mono font-semibold">{Number(model.growthRate || 15).toFixed(1)}%</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">EBITDA Margin</p>
                <p className="font-mono font-semibold">
                  {(100 - Number(model.cogsMargin || 40) - Number(model.opexMargin || 25)).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setSensitivityDialogOpen(false)}
              data-testid="button-sensitivity-close"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
