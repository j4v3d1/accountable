import * as Dialog from "@radix-ui/react-dialog";
import type { ReactNode } from "react";
import "./ui.css";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
}

/** A dialog that holds a form. */
export function FormDialog({ open, onOpenChange, title, description, children }: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        {/* Without a description, aria-describedby is set to undefined on purpose: Radix then skips its missing-description warning. */}
        <Dialog.Content className="dialog" {...(description ? {} : { "aria-describedby": undefined })}>
          <Dialog.Title className="dialog-title">{title}</Dialog.Title>
          {description && <Dialog.Description className="dialog-text">{description}</Dialog.Description>}
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function FormActions({ onCancel, pending }: { onCancel: () => void; pending?: boolean }) {
  return (
    <div className="dialog-actions">
      <button type="button" className="btn btn-quiet" onClick={onCancel}>
        Cancel
      </button>
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Saving..." : "Save"}
      </button>
    </div>
  );
}
