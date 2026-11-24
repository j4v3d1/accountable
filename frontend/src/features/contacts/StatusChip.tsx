import { STATUSES, type ContactStatus } from "./types";
import "./contacts.css";

export function statusLabel(status: ContactStatus) {
  return STATUSES.find((s) => s.key === status)?.label ?? status;
}

export function StatusChip({ status }: { status: ContactStatus }) {
  return <span className={`chip status-chip status-${status}`}>{statusLabel(status)}</span>;
}
