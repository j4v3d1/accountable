import { ConfirmDeleteDialog } from "../../ui/ConfirmDeleteDialog";
import { FormDialog } from "../../ui/FormDialog";
import { LoadingState } from "../../ui/States";
import { contactOptions, useContacts } from "../contacts/queries";
import { organizationOptions, useOrganizations } from "../organizations/queries";
import { DealForm } from "./DealForm";
import { useDealImpact, useDeleteDeal, useSaveDeal, useStages } from "./queries";
import type { Deal, StageKey } from "./types";

export function DealFormDialog({
  open,
  onOpenChange,
  deal,
  defaultStage,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal?: Deal | null;
  defaultStage?: StageKey;
}) {
  const save = useSaveDeal();
  const stages = useStages();
  const contacts = useContacts();
  const organizations = useOrganizations();
  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={deal ? "Edit deal" : "New deal"}>
      {stages.data ? (
        <DealForm
          stages={stages.data}
          contacts={contactOptions(contacts.data)}
          organizations={organizationOptions(organizations.data)}
          initial={deal}
          defaultStage={defaultStage}
          pending={save.isPending}
          onCancel={() => onOpenChange(false)}
          onSubmit={(input) => save.mutate({ id: deal?.id, input }, { onSuccess: () => onOpenChange(false) })}
        />
      ) : (
        <LoadingState label="Loading stages..." />
      )}
    </FormDialog>
  );
}

export function DeleteDealDialog({
  target,
  onClose,
  onDeleting,
}: {
  target: { id: number; name: string } | null;
  onClose: () => void;
  onDeleting?: () => void;
}) {
  const impact = useDealImpact(target?.id ?? null);
  const remove = useDeleteDeal();
  return (
    <ConfirmDeleteDialog
      open={target !== null}
      onOpenChange={(open) => !open && onClose()}
      recordName={target?.name ?? ""}
      impactError={impact.error?.message}
      onRetry={() => impact.refetch()}
      impact={impact.data && [{ count: impact.data.activities, noun: "activity", plural: "activities", outcome: "deleted" }]}
      onConfirm={() => {
        const id = target!.id;
        onClose();
        onDeleting?.();
        remove.mutate(id);
      }}
    />
  );
}
