import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "../../api/client";
import { useToast } from "../../ui/Toast";
import type { Organization, OrganizationDetail, OrganizationImpact, OrganizationInput } from "./types";

export function useOrganizations() {
  return useQuery({ queryKey: ["organizations"], queryFn: () => api<Organization[]>("/organizations") });
}

/** One record. `enabled` goes false when the record is being deleted, so it isn't fetched again. */
export function useOrganization(id: number, enabled = true) {
  return useQuery({ queryKey: ["organizations", id], queryFn: () => api<OrganizationDetail>(`/organizations/${id}`), enabled });
}

export function useOrganizationImpact(id: number | null) {
  return useQuery({
    queryKey: ["organizations", id, "delete-impact"],
    queryFn: () => api<OrganizationImpact>(`/organizations/${id}/delete-impact`),
    enabled: id !== null,
    staleTime: 0,
    gcTime: 0,
  });
}

export function useSaveOrganization() {
  const notify = useToast();
  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: OrganizationInput }) =>
      id
        ? api<OrganizationDetail>(`/organizations/${id}`, { method: "PATCH", body: input })
        : api<OrganizationDetail>("/organizations", { method: "POST", body: input }),
    onSuccess: () => notify("Organization saved"),
    onError: (error) => notify(error.message, "error"),
  });
}

export function useDeleteOrganization() {
  const notify = useToast();
  return useMutation({
    mutationFn: (id: number) => api<null>(`/organizations/${id}`, { method: "DELETE" }),
    onSuccess: () => notify("Organization deleted"),
    onError: (error) => notify(error.message, "error"),
  });
}

export function organizationOptions(organizations: Organization[] | undefined) {
  return (organizations ?? []).map((o) => ({ id: o.id, label: o.name, hint: o.industry }));
}
