import { useMutation } from "@tanstack/react-query";
import { api, queryClient } from "../../api/client";
import { useToast } from "../../ui/Toast";
import type { Deal, StageKey } from "../deals/types";

/** Move a deal to a place in a column. The server answers with the whole board, which replaces ours. */
export function useMoveDeal() {
  const notify = useToast();
  return useMutation({
    mutationFn: ({ id, stage, index }: { id: number; stage: StageKey; index: number }) =>
      api<Deal[]>(`/deals/${id}/move`, { method: "POST", body: { stage, index } }),
    onSuccess: (board) => queryClient.setQueryData(["deals"], board),
    onError: (error) => notify(error.message, "error"),
  });
}
