import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { formatDate, money, percent } from "../../lib/format";
import { DataTable, type TableColumn } from "../../ui/DataTable";
import { PageHeader } from "../../ui/PageHeader";
import { ErrorState, LoadingState } from "../../ui/States";
import { DealFormDialog, DeleteDealDialog } from "./DealDialogs";
import { useDeals, useStages } from "./queries";
import { LateBadge, StageChip } from "./StageChip";
import type { Deal, Stage } from "./types";

export function CloseDate({ deal }: { deal: Deal }) {
  if (!deal.late) return <span className="mono">{formatDate(deal.close_date)}</span>;
  return (
    <span className="close-cell">
      <span className="mono late-date">{formatDate(deal.close_date)}</span>
      <LateBadge />
    </span>
  );
}

export function dealColumns(stages: Stage[]): TableColumn<Deal>[] {
  const order = (deal: Deal) => stages.findIndex((s) => s.key === deal.stage);
  const label = (deal: Deal) => stages.find((s) => s.key === deal.stage)?.label ?? "";
  return [
    { id: "name", header: "Name", value: (d) => d.name, search: true },
    // Sorted in pipeline order, searched by the stage's name.
    { id: "stage", header: "Stage", value: order, searchText: label, cell: (d) => <StageChip stage={d.stage} /> },
    {
      id: "value",
      header: "Value (USD)",
      value: (d) => d.value,
      cell: (d) => money(d.value),
      align: "right",
      mono: true,
    },
    {
      id: "probability",
      header: "Probability",
      value: (d) => d.probability,
      cell: (d) => percent(d.probability),
      align: "right",
      mono: true,
    },
    {
      id: "expected",
      header: "Expected (USD)",
      value: (d) => d.expected_value,
      cell: (d) => money(d.expected_value),
      align: "right",
      mono: true,
    },
    {
      id: "close_date",
      header: "Close date",
      value: (d) => d.close_date,
      cell: (d) => <CloseDate deal={d} />,
      mono: true,
    },
    { id: "contact", header: "Contact", value: (d) => d.contact_name, search: true },
    { id: "organization", header: "Organization", value: (d) => d.organization_name, search: true },
  ];
}

export function DealsPage() {
  const deals = useDeals();
  const stages = useStages();
  const [editing, setEditing] = useState<Deal | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<Deal | null>(null);
  const columns = useMemo(() => dealColumns(stages.data ?? []), [stages.data]);
  const open = deals.data?.filter((d) => stages.data?.find((s) => s.key === d.stage)?.open).length;

  return (
    <div className="page">
      <PageHeader
        eyebrow={deals.data && stages.data ? `${deals.data.length} deals, ${open} open` : " "}
        title="Deals"
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setEditing(null)}>
            <Plus size={16} aria-hidden="true" />
            New deal
          </button>
        }
      />
      {deals.isPending || stages.isPending ? (
        <LoadingState label="Loading deals..." />
      ) : deals.isError || stages.isError ? (
        <ErrorState message={(deals.error ?? stages.error)!.message} onRetry={() => deals.refetch()} />
      ) : (
        <DataTable
          rows={deals.data}
          columns={columns}
          searchLabel="Search deals"
          rowHref={(d) => `/deals/${d.id}`}
          rowLabel={(d) => d.name}
          emptyMessage="No deals yet. Add one to start the pipeline."
          emptyAction={
            <button type="button" className="btn btn-quiet" onClick={() => setEditing(null)}>
              New deal
            </button>
          }
          onEdit={setEditing}
          onDelete={setDeleting}
        />
      )}
      {editing !== undefined && <DealFormDialog open onOpenChange={() => setEditing(undefined)} deal={editing} />}
      <DeleteDealDialog target={deleting} onClose={() => setDeleting(null)} />
    </div>
  );
}
