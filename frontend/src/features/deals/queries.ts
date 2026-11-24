import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "../../api/client";
import { useToast } from "../../ui/Toast";
import type { Deal, DealDetail, DealImpact, DealInput, Stage } from "./types";

export function useStages() {
  return useQuery({ queryKey: ["stages"], queryFn: () => api<Stage[]>("/stages"), staleTime: Infinity });
}

export function useDeals() {
  return useQuery({ queryKey: ["deals"], queryFn: () => api<Deal[]>("/deals") });
}

/** One record. `enabled` goes false when the record is being deleted, so it isn't fetched again. */
export function useDeal(id: number, enabled = true) {
  return useQuery({ queryKey: ["deals", id], queryFn: () => api<DealDetail>(`/deals/${id}`), enabled });
}

export function useDealImpact(id: number | null) {
  return useQuery({
    queryKey: ["deals", id, "delete-impact"],
    queryFn: () => api<DealImpact>(`/deals/${id}/delete-impact`),
    enabled: id !== null,
    staleTime: 0,
    gcTime: 0,
  });
}

export function useSaveDeal() {
  const notify = useToast();
  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: DealInput }) =>
      id
        ? api<DealDetail>(`/deals/${id}`, { method: "PATCH", body: input })
        : api<DealDetail>("/deals", { method: "POST", body: input }),
    onSuccess: () => notify("Deal saved"),
    onError: (error) => notify(error.message, "error"),
  });
}

export function useDeleteDeal() {
  const notify = useToast();
  return useMutation({
    mutationFn: (id: number) => api<null>(`/deals/${id}`, { method: "DELETE" }),
    onSuccess: () => notify("Deal deleted"),
    onError: (error) => notify(error.message, "error"),
  });
}
