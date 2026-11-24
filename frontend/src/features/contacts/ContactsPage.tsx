import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { formatTimestampDate } from "../../lib/format";
import { DataTable, type TableColumn } from "../../ui/DataTable";
import { PageHeader } from "../../ui/PageHeader";
import { ErrorState, LoadingState } from "../../ui/States";
import { ContactFormDialog, DeleteContactDialog } from "./ContactDialogs";
import { useContacts } from "./queries";
import { StatusChip, statusLabel } from "./StatusChip";
import { STATUSES, type Contact, type ContactStatus } from "./types";
import "./contacts.css";

export const contactColumns: TableColumn<Contact>[] = [
  { id: "name", header: "Name", value: (c) => c.name, search: true },
  {
    id: "status",
    header: "Status",
    value: (c) => statusLabel(c.status),
    cell: (c) => <StatusChip status={c.status} />,
    search: true,
  },
  { id: "organization", header: "Organization", value: (c) => c.organization_name, search: true },
  { id: "email", header: "Email", value: (c) => c.email, search: true, nowrap: true },
  { id: "phone", header: "Phone", value: (c) => c.phone, search: true, nowrap: true },
  {
    id: "last_activity",
    header: "Last activity",
    value: (c) => c.last_activity_at,
    cell: (c) =>
      c.last_activity_at ? formatTimestampDate(c.last_activity_at) : <span className="muted">None yet</span>,
    mono: true,
  },
];

function StatusFilter({
  value,
  onChange,
}: {
  value: ContactStatus | "all";
  onChange: (v: ContactStatus | "all") => void;
}) {
  const options = [{ key: "all" as const, label: "All" }, ...STATUSES];
  return (
    <div className="segmented" role="radiogroup" aria-label="Status">
      {options.map((option) => (
        <label key={option.key}>
          <input
            type="radio"
            name="status-filter"
            value={option.key}
            checked={value === option.key}
            onChange={() => onChange(option.key)}
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}

export function ContactsPage() {
  const contacts = useContacts();
  const [status, setStatus] = useState<ContactStatus | "all">("all");
  const [editing, setEditing] = useState<Contact | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<Contact | null>(null);
  const rows = useMemo(
    () => (contacts.data ?? []).filter((c) => status === "all" || c.status === status),
    [contacts.data, status],
  );

  return (
    <div className="page">
      <PageHeader
        eyebrow={contacts.data ? `${contacts.data.length} contacts` : " "}
        title="Contacts"
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setEditing(null)}>
            <Plus size={16} aria-hidden="true" />
            New contact
          </button>
        }
      />
      {contacts.isPending ? (
        <LoadingState label="Loading contacts..." />
      ) : contacts.isError ? (
        <ErrorState message={contacts.error.message} onRetry={() => contacts.refetch()} />
      ) : (
        <DataTable
          rows={rows}
          columns={contactColumns}
          searchLabel="Search contacts"
          rowHref={(c) => `/contacts/${c.id}`}
          rowLabel={(c) => c.name}
          emptyMessage={
            status === "all"
              ? "No contacts yet. Add your first lead to start."
              : `No contacts with the ${statusLabel(status)} status.`
          }
          emptyAction={
            <button type="button" className="btn btn-quiet" onClick={() => setEditing(null)}>
              New contact
            </button>
          }
          filters={<StatusFilter value={status} onChange={setStatus} />}
          onEdit={setEditing}
          onDelete={setDeleting}
        />
      )}
      {editing !== undefined && <ContactFormDialog open onOpenChange={() => setEditing(undefined)} contact={editing} />}
      <DeleteContactDialog target={deleting} onClose={() => setDeleting(null)} />
    </div>
  );
}
