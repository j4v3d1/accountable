import * as Dialog from "@radix-ui/react-dialog";
import "./ui.css";

export interface ImpactItem {
  count: number;
  noun: string;
  plural?: string;
  outcome: "unlinked" | "deleted";
}

/** "3 contacts and 2 deals will be unlinked, 5 activities will be deleted." Zero counts are left out (R4). */
export function describeImpact(items: ImpactItem[]): string {
  const groups = new Map<string, string[]>();
  for (const item of items) {
    if (item.count <= 0) continue;
    const noun = item.count === 1 ? item.noun : (item.plural ?? `${item.noun}s`);
    groups.set(item.outcome, [...(groups.get(item.outcome) ?? []), `${item.count} ${noun}`]);
  }
  if (groups.size === 0) return "Nothing else will change.";
  const parts = [...groups].map(([outcome, nouns]) => `${nouns.join(" and ")} will be ${outcome}`);
  return `${parts.join(", ")}.`;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recordName: string;
  /** Undefined while the counts are loading, or when they couldn't be loaded. */
  impact: ImpactItem[] | undefined;
  /** Why the counts couldn't be loaded. Delete stays disabled until they are. */
  impactError?: string;
  onRetry?: () => void;
  onConfirm: () => void;
  pending?: boolean;
}

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  recordName,
  impact,
  impactError,
  onRetry,
  onConfirm,
  pending,
}: Props) {
  const failed = impact === undefined && impactError !== undefined;
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog dialog-small" role="alertdialog">
          <Dialog.Title className="dialog-title">Delete {recordName}?</Dialog.Title>
          <Dialog.Description className="dialog-text">
            {failed
              ? `Couldn't check linked records. ${impactError}`
              : impact === undefined
                ? "Checking linked records..."
                : describeImpact(impact)}
          </Dialog.Description>
          <div className="dialog-actions">
            {failed && onRetry && (
              <button type="button" className="btn btn-quiet" onClick={onRetry}>
                Try again
              </button>
            )}
            <Dialog.Close asChild>
              <button type="button" className="btn btn-quiet">
                Cancel
              </button>
            </Dialog.Close>
            <button
              type="button"
              className="btn btn-danger"
              disabled={impact === undefined || pending}
              onClick={onConfirm}
            >
              Delete
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
