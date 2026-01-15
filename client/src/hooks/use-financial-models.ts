import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useAuth } from "./use-auth";
import type { CreateModelRequest, FinancialModelWithValuation, ModelsListResponse, InsertFinancialModel } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useFinancialModels() {
  const { isAuthenticated } = useAuth();
  
  return useQuery({
    queryKey: [api.models.list.path],
    queryFn: async () => {
      const res = await fetch(api.models.list.path, { credentials: "include" });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Failed to fetch models");
      return await res.json() as ModelsListResponse;
    },
    enabled: isAuthenticated,
  });
}

export function useFinancialModel(id: number) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: [api.models.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.models.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 401) return null;
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch model details");
      return await res.json() as FinancialModelWithValuation;
    },
    enabled: isAuthenticated && !isNaN(id),
  });
}

export function useCreateFinancialModel() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateModelRequest) => {
      const res = await fetch(api.models.create.path, {
        method: api.models.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to create model");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.models.list.path] });
      toast({
        title: "Success",
        description: "Financial model created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateFinancialModel() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertFinancialModel> }) => {
      const res = await fetch(api.models.update.path.replace(':id', String(id)), {
        method: api.models.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to update model");
      }
      return await res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.models.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.models.get.path, variables.id] });
      queryClient.setQueryData([api.models.get.path, variables.id], data);
      toast({
        title: "Model updated",
        description: "Changes saved successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteFinancialModel() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.models.delete.path, { id });
      const res = await fetch(url, {
        method: api.models.delete.method,
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to delete model");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.models.list.path] });
      toast({
        title: "Deleted",
        description: "Financial model has been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
