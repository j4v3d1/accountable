import { ConfirmDeleteDialog } from "../../ui/ConfirmDeleteDialog";
import { FormDialog } from "../../ui/FormDialog";
import { organizationOptions, useOrganizations } from "../organizations/queries";
import { ContactForm } from "./ContactForm";
import { useContactImpact, useDeleteContact, useSaveContact } from "./queries";
import type { Contact } from "./types";

export function ContactFormDialog({
  open,
  onOpenChange,
  contact,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: Contact | null;
}) {
  const save = useSaveContact();
  const organizations = useOrganizations();
  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={contact ? "Edit contact" : "New contact"}>
      <ContactForm
        initial={contact}
        organizations={organizationOptions(organizations.data)}
        pending={save.isPending}
        onCancel={() => onOpenChange(false)}
        onSubmit={(input) => save.mutate({ id: contact?.id, input }, { onSuccess: () => onOpenChange(false) })}
      />
    </FormDialog>
  );
}

export function DeleteContactDialog({
  target,
  onClose,
  onDeleting,
}: {
  target: { id: number; name: string } | null;
  onClose: () => void;
  onDeleting?: () => void;
}) {
  const impact = useContactImpact(target?.id ?? null);
  const remove = useDeleteContact();
  return (
    <ConfirmDeleteDialog
      open={target !== null}
      onOpenChange={(open) => !open && onClose()}
      recordName={target?.name ?? ""}
      impact={
        impact.data && [
          { count: impact.data.deals, noun: "deal", outcome: "unlinked" },
          { count: impact.data.activities, noun: "activity", plural: "activities", outcome: "deleted" },
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
