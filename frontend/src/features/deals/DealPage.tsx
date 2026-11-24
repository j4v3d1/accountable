import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { money, percent } from "../../lib/format";
import { PageHeader } from "../../ui/PageHeader";
import { ErrorState, LoadingState } from "../../ui/States";
import { Timeline } from "../activities/Timeline";
import { DealFormDialog, DeleteDealDialog } from "./DealDialogs";
import { CloseDate } from "./DealsPage";
import { useDeal } from "./queries";
import { ProbabilityDots, StageChip } from "./StageChip";

export function DealPage() {
  const id = Number(useParams().id);
  const navigate = useNavigate();
  const [leaving, setLeaving] = useState(false);
  const query = useDeal(id, !leaving);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (query.isPending) return <div className="page"><LoadingState label="Loading deal..." /></div>;
  if (query.isError) {
    return (
      <div className="page">
        <ErrorState message={query.error.message} onRetry={() => query.refetch()} />
        <Link to="/deals">Back to deals</Link>
      </div>
    );
  }
  const deal = query.data;

  return (
    <div className="page">
      <PageHeader
        eyebrow={<Link to="/deals">Deals</Link>}
        title={deal.name}
        actions={
          <>
            <button type="button" className="btn btn-quiet" onClick={() => setEditing(true)}>
              <Pencil size={15} aria-hidden="true" />
              Edit
            </button>
            <button type="button" className="btn btn-quiet" onClick={() => setDeleting(true)}>
              <Trash2 size={15} aria-hidden="true" />
              Delete
            </button>
          </>
        }
      />
      <div className="record-layout">
        <section className="panel record-panel" aria-label="Details">
          <h2 className="section-title">Details</h2>
          <dl className="details">
            <dt>Stage</dt>
            <dd>
              <StageChip stage={deal.stage} />
            </dd>
            <dt>Value (USD)</dt>
            <dd className="mono">{money(deal.value)}</dd>
            <dt>Probability</dt>
            <dd className="prob-row">
              <ProbabilityDots probability={deal.probability} /> <span className="mono">{percent(deal.probability)}</span>
            </dd>
            <dt>Expected (USD)</dt>
            <dd className="mono">{money(deal.expected_value)}</dd>
            <dt>Close date</dt>
            <dd>
              <CloseDate deal={deal} />
            </dd>
            <dt>Main contact</dt>
            <dd>
              {deal.contact ? <Link to={`/contacts/${deal.contact.id}`}>{deal.contact.name}</Link> : <span className="muted">None</span>}
            </dd>
            <dt>Organization</dt>
            <dd>
              {deal.organization ? (
                <Link to={`/organizations/${deal.organization.id}`}>{deal.organization.name}</Link>
              ) : (
                <span className="muted">None</span>
              )}
            </dd>
            <dt>Notes</dt>
            <dd className="notes">{deal.notes ?? <span className="muted">No notes</span>}</dd>
          </dl>
        </section>
        <div className="record-main">
          <Timeline entries={deal.timeline} owner={{ deal_id: deal.id }} />
        </div>
      </div>
      {editing && <DealFormDialog open onOpenChange={setEditing} deal={deal} />}
      <DeleteDealDialog target={deleting ? deal : null} onClose={() => setDeleting(false)} onDeleting={() => {
          setLeaving(true);
          navigate("/deals");
        }} />
    </div>
  );
}
