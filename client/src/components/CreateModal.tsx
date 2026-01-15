import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertFinancialModelSchema } from "@shared/schema";
import { useCreateFinancialModel } from "@/hooks/use-financial-models";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Calculator, Settings2, BarChart3, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function CreateModelModal() {
  const [open, setOpen] = useState(false);
  const { mutate: createModel, isPending } = useCreateFinancialModel();
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(insertFinancialModelSchema),
    defaultValues: {
      name: "",
      description: "",
      currency: "USD",
      startingRevenue: "1000000",
      growthRate: "15",
      cogsMargin: "40",
      opexMargin: "30",
      daMargin: "5",
      interestRate: "5",
      debtBalance: "0",
      wacc: "10",
      terminalGrowthRate: "2",
      exitMultiple: "12",
      taxRate: "21",
      tradingComps: []
    }
  });

  const onSubmit = (data: any) => {
    createModel(data, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
        toast({
          title: "Model created successfully",
          description: "Your professional financial model is ready for analysis."
        });
      },
      onError: (err: any) => {
        toast({
          title: "Error creating model",
          description: err.message,
          variant: "destructive"
        });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 hover-elevate active-elevate-2">
          <Plus className="h-4 w-4" />
          Create New Model
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Calculator className="h-6 w-6 text-primary" />
            Create Model
          </DialogTitle>
          <DialogDescription>
            Enter your model assumptions
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="basic" className="gap-2"><Settings2 className="h-4 w-4" /> Basics</TabsTrigger>
                <TabsTrigger value="pnl" className="gap-2"><BarChart3 className="h-4 w-4" /> P&L Assumptions</TabsTrigger>
                <TabsTrigger value="valuation" className="gap-2"><Calculator className="h-4 w-4" /> Valuation</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          Model Name <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g. Acme Corp Series A Projections" 
                            className="h-11"
                            data-testid="input-model-name"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          A descriptive name to identify this financial model in your repository
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Brief overview of the scenario..." 
                            className="h-11"
                            data-testid="input-description"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Optional notes about assumptions or purpose of this projection
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="pnl" className="space-y-4">
                <div className="p-3 bg-muted/30 rounded-lg mb-4">
                  <p className="text-xs text-muted-foreground">
                    Enter your income statement assumptions. These will be applied consistently across all 5 projection years.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startingRevenue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          Year 1 Revenue ($) <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            className="h-11 font-mono"
                            placeholder="1000000"
                            data-testid="input-starting-revenue"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Base year revenue for projections
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="growthRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          Revenue Growth (%) <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.1" 
                            className="h-11 font-mono"
                            placeholder="15"
                            data-testid="input-growth-rate"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Annual revenue growth rate (CAGR)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="cogsMargin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          COGS Margin (%) <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            className="h-11 font-mono"
                            placeholder="40"
                            data-testid="input-cogs-margin"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Cost of goods sold as % of revenue
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="opexMargin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          OpEx Margin (%) <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            className="h-11 font-mono"
                            placeholder="30"
                            data-testid="input-opex-margin"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Operating expenses as % of revenue
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="daMargin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>D&A Margin (%)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            className="h-11 font-mono"
                            placeholder="5"
                            data-testid="input-da-margin"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Depreciation & amortization as % of revenue
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="taxRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                          Tax Rate (%) <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            className="h-11 font-mono"
                            placeholder="21"
                            data-testid="input-tax-rate"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Effective corporate tax rate
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="valuation" className="space-y-4">
                <div className="p-3 bg-muted/30 rounded-lg mb-4">
                  <p className="text-xs text-muted-foreground">
                    Configure DCF valuation parameters for enterprise and equity value calculations.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="wacc"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>WACC (%)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.1" 
                            className="h-11 font-mono"
                            placeholder="10"
                            data-testid="input-wacc"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Weighted average cost of capital (discount rate)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="terminalGrowthRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Terminal Growth (%)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.1" 
                            className="h-11 font-mono"
                            placeholder="2"
                            data-testid="input-terminal-growth"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Perpetual growth rate (Gordon growth model)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="debtBalance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Debt Balance ($)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            className="h-11 font-mono"
                            placeholder="0"
                            data-testid="input-debt-balance"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Net debt for equity value calculation
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="exitMultiple"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Exit Multiple (x)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.1" 
                            className="h-11 font-mono"
                            placeholder="12"
                            data-testid="input-exit-multiple"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Terminal EV/EBITDA multiple for exit valuation
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="pt-4 border-t">
              <Button 
                type="submit" 
                className="w-full h-12 text-lg font-bold" 
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Model"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
