import { ConfirmDeleteDialog } from "../../ui/ConfirmDeleteDialog";
import { FormDialog } from "../../ui/FormDialog";
import { ActivityForm } from "./ActivityForm";
import { useDeleteActivity, useSaveActivity } from "./queries";
import type { Activity } from "./types";

export type ActivityOwner = { contact_id: number } | { deal_id: number };

export function ActivityFormDialog({
  open,
  onOpenChange,
  owner,
  activity,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  owner?: ActivityOwner;
  activity?: Activity | null;
}) {
  const save = useSaveActivity();
  const editable = activity && activity.type !== "stage_change" ? { ...activity, type: activity.type } : null;
  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={activity ? "Edit activity" : "Log activity"}>
      <ActivityForm
        initial={editable}
        pending={save.isPending}
        onCancel={() => onOpenChange(false)}
        onSubmit={(input) =>
          save.mutate(
            { id: activity?.id, input: activity ? input : { ...input, ...owner } },
            { onSuccess: () => onOpenChange(false) },
          )
        }
      />
    </FormDialog>
  );
}

const TYPE_NAMES = { note: "note", call: "call", email: "email", stage_change: "stage change" } as const;

export function DeleteActivityDialog({ target, onClose }: { target: Activity | null; onClose: () => void }) {
  const remove = useDeleteActivity();
  return (
    <ConfirmDeleteDialog
      open={target !== null}
      onOpenChange={(open) => !open && onClose()}
      recordName={target ? `this ${TYPE_NAMES[target.type]}` : ""}
      impact={[]}
      onConfirm={() => {
        const id = target!.id;
        onClose();
        remove.mutate(id);
      }}
    />
  );
}
