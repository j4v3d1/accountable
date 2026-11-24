import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "../../api/client";
import { useToast } from "../../ui/Toast";
import type { Contact, ContactDetail, ContactImpact, ContactInput } from "./types";

export function useContacts() {
  return useQuery({ queryKey: ["contacts"], queryFn: () => api<Contact[]>("/contacts") });
}

/** One record. `enabled` goes false when the record is being deleted, so it isn't fetched again. */
export function useContact(id: number, enabled = true) {
  return useQuery({ queryKey: ["contacts", id], queryFn: () => api<ContactDetail>(`/contacts/${id}`), enabled });
}

export function useContactImpact(id: number | null) {
  return useQuery({
    queryKey: ["contacts", id, "delete-impact"],
    queryFn: () => api<ContactImpact>(`/contacts/${id}/delete-impact`),
    enabled: id !== null,
    staleTime: 0,
    gcTime: 0,
  });
}

export function useSaveContact() {
  const notify = useToast();
  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: ContactInput }) =>
      id
        ? api<ContactDetail>(`/contacts/${id}`, { method: "PATCH", body: input })
        : api<ContactDetail>("/contacts", { method: "POST", body: input }),
    onSuccess: () => notify("Contact saved"),
    onError: (error) => notify(error.message, "error"),
  });
}

export function useDeleteContact() {
  const notify = useToast();
  return useMutation({
    mutationFn: (id: number) => api<null>(`/contacts/${id}`, { method: "DELETE" }),
    onSuccess: () => notify("Contact deleted"),
    onError: (error) => notify(error.message, "error"),
  });
}

export function contactOptions(contacts: Contact[] | undefined) {
  return (contacts ?? []).map((c) => ({ id: c.id, label: c.name, hint: c.organization_name }));
}
