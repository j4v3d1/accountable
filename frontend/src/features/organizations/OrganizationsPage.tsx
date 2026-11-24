import { Plus } from "lucide-react";
import { useState } from "react";
import { DataTable, type TableColumn } from "../../ui/DataTable";
import { PageHeader } from "../../ui/PageHeader";
import { ErrorState, LoadingState } from "../../ui/States";
import { DeleteOrganizationDialog, OrganizationFormDialog } from "./OrganizationDialogs";
import { useOrganizations } from "./queries";
import type { Organization } from "./types";

export function displayWebsite(website: string) {
  return website.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

const columns: TableColumn<Organization>[] = [
  { id: "name", header: "Name", value: (o) => o.name, search: true },
  { id: "industry", header: "Industry", value: (o) => o.industry, search: true },
  { id: "website", header: "Website", value: (o) => o.website && displayWebsite(o.website), search: true },
  { id: "contacts", header: "Contacts", value: (o) => o.contact_count, align: "right", mono: true },
  { id: "open_deals", header: "Open deals", value: (o) => o.open_deal_count, align: "right", mono: true },
];

export function OrganizationsPage() {
  const organizations = useOrganizations();
  const [editing, setEditing] = useState<Organization | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<Organization | null>(null);

  return (
    <div className="page">
      <PageHeader
        eyebrow={organizations.data ? `${organizations.data.length} organizations` : " "}
        title="Organizations"
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setEditing(null)}>
            <Plus size={16} aria-hidden="true" />
            New organization
          </button>
        }
      />
      {organizations.isPending ? (
        <LoadingState label="Loading organizations..." />
      ) : organizations.isError ? (
        <ErrorState message={organizations.error.message} onRetry={() => organizations.refetch()} />
      ) : (
        <DataTable
          rows={organizations.data}
          columns={columns}
          searchLabel="Search organizations"
          rowHref={(o) => `/organizations/${o.id}`}
          rowLabel={(o) => o.name}
          emptyMessage="No organizations yet. Add one to start."
          emptyAction={
            <button type="button" className="btn btn-quiet" onClick={() => setEditing(null)}>
              New organization
            </button>
          }
          onEdit={setEditing}
          onDelete={setDeleting}
        />
      )}
      {editing !== undefined && (
        <OrganizationFormDialog open onOpenChange={() => setEditing(undefined)} organization={editing} />
      )}
      <DeleteOrganizationDialog target={deleting} onClose={() => setDeleting(null)} />
    </div>
  );
}
