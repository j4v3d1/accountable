import { useMutation } from "@tanstack/react-query";
import { api } from "../../api/client";
import { useToast } from "../../ui/Toast";
import type { Activity, ActivityInput } from "./types";

export function useSaveActivity() {
  const notify = useToast();
  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: Partial<ActivityInput> }) =>
      id
        ? api<Activity>(`/activities/${id}`, { method: "PATCH", body: input })
        : api<Activity>("/activities", { method: "POST", body: input }),
    onSuccess: () => notify("Activity saved"),
    onError: (error) => notify(error.message, "error"),
  });
}

export function useDeleteActivity() {
  const notify = useToast();
  return useMutation({
    mutationFn: (id: number) => api<null>(`/activities/${id}`, { method: "DELETE" }),
    onSuccess: () => notify("Activity deleted"),
    onError: (error) => notify(error.message, "error"),
  });
}

/** Mark a follow-up done, which takes it off the dashboard (R36). */
export function useMarkDone() {
  const notify = useToast();
  return useMutation({
    mutationFn: (id: number) => api<Activity>(`/activities/${id}`, { method: "PATCH", body: { done: true } }),
    onSuccess: () => notify("Follow-up done"),
    onError: (error) => notify(error.message, "error"),
  });
}
