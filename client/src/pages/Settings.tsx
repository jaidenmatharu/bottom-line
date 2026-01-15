import { useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Palette, Calculator, Save } from "lucide-react";
import { z } from "zod";

const preferencesSchema = z.object({
  theme: z.string(),
  tableDensity: z.string(),
  defaultCurrency: z.string(),
  defaultGrowthRate: z.string(),
  defaultWacc: z.string(),
  defaultTaxRate: z.string(),
});

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  interface Preferences {
    theme?: string;
    tableDensity?: string;
    defaultCurrency?: string;
    defaultGrowthRate?: string;
    defaultWacc?: string;
    defaultTaxRate?: string;
  }

  const { data: preferences, isLoading } = useQuery<Preferences>({
    queryKey: [api.preferences.get.path],
  });
  
  const form = useForm({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      theme: "dark",
      tableDensity: "normal",
      defaultCurrency: "USD",
      defaultGrowthRate: "15",
      defaultWacc: "10",
      defaultTaxRate: "21",
    },
  });
  
  useEffect(() => {
    if (preferences) {
      const theme = preferences.theme || "dark";
      form.reset({
        theme,
        tableDensity: preferences.tableDensity || "normal",
        defaultCurrency: preferences.defaultCurrency || "USD",
        defaultGrowthRate: String(preferences.defaultGrowthRate || "15"),
        defaultWacc: String(preferences.defaultWacc || "10"),
        defaultTaxRate: String(preferences.defaultTaxRate || "21"),
      });
      if (theme === "dark") {
        document.documentElement.classList.add("dark");
        localStorage.setItem('bottomline-theme', 'dark');
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem('bottomline-theme', 'light');
      }
    }
  }, [preferences]);
  
  const { mutate: savePreferences, isPending } = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(api.preferences.update.path, {
        method: api.preferences.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to save preferences");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.preferences.get.path] });
      toast({ title: "Settings saved" });
    },
    onError: () => {
      toast({ title: "Failed to save settings", variant: "destructive" });
    },
  });
  
  const onSubmit = (data: any) => {
    if (data.theme === "dark") {
      document.documentElement.classList.add("dark");
      localStorage.setItem('bottomline-theme', 'dark');
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem('bottomline-theme', 'light');
    }
    savePreferences(data);
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-settings-title">Settings</h1>
          <p className="text-muted-foreground">Manage your preferences</p>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Display
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="theme"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Theme</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-theme">
                            <SelectValue placeholder="Select theme" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="light">Light</SelectItem>
                          <SelectItem value="dark">Dark</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tableDensity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Table Density</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-table-density">
                            <SelectValue placeholder="Select density" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="compact">Compact</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="expanded">Expanded</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Model Defaults
                </CardTitle>
                <CardDescription>Default values for new models</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="defaultCurrency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-currency">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="GBP">GBP</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="defaultGrowthRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Growth Rate (%)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.1" data-testid="input-growth-rate" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="defaultWacc"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>WACC (%)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.1" data-testid="input-wacc" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="defaultTaxRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tax Rate (%)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.1" data-testid="input-tax-rate" />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
            
            <Button type="submit" disabled={isPending} className="gap-2" data-testid="button-save-settings">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Settings
            </Button>
          </form>
        </Form>
      </div>
    </Layout>
  );
}
