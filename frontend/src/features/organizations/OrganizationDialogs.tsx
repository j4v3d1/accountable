import { ConfirmDeleteDialog } from "../../ui/ConfirmDeleteDialog";
import { FormDialog } from "../../ui/FormDialog";
import { OrganizationForm } from "./OrganizationForm";
import { useDeleteOrganization, useOrganizationImpact, useSaveOrganization } from "./queries";
import type { Organization } from "./types";

export function OrganizationFormDialog({
  open,
  onOpenChange,
  organization,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organization?: Organization | null;
}) {
  const save = useSaveOrganization();
  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={organization ? "Edit organization" : "New organization"}>
      <OrganizationForm
        initial={organization}
        pending={save.isPending}
        onCancel={() => onOpenChange(false)}
        onSubmit={(input) => save.mutate({ id: organization?.id, input }, { onSuccess: () => onOpenChange(false) })}
      />
    </FormDialog>
  );
}

/** Asks first, with counts of what happens to linked records (R4). */
export function DeleteOrganizationDialog({
  target,
  onClose,
  onDeleting,
}: {
  target: { id: number; name: string } | null;
  onClose: () => void;
  /** Runs as the delete starts, such as leaving the organization's page. */
  onDeleting?: () => void;
}) {
  const impact = useOrganizationImpact(target?.id ?? null);
  const remove = useDeleteOrganization();
  return (
    <ConfirmDeleteDialog
      open={target !== null}
      onOpenChange={(open) => !open && onClose()}
      recordName={target?.name ?? ""}
      impactError={impact.error?.message}
      onRetry={() => impact.refetch()}
      impact={
        impact.data && [
          { count: impact.data.contacts, noun: "contact", outcome: "unlinked" },
          { count: impact.data.deals, noun: "deal", outcome: "unlinked" },
        ]
      }
      onConfirm={() => {
        const id = target!.id;
        onClose();
        onDeleting?.();
        remove.mutate(id);
      }}
    />
  );
}
