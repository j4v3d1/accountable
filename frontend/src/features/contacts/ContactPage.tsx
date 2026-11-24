import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { money } from "../../lib/format";
import { PageHeader } from "../../ui/PageHeader";
import { ErrorState, LoadingState } from "../../ui/States";
import { Timeline } from "../activities/Timeline";
import { StageChip } from "../deals/StageChip";
import { ContactFormDialog, DeleteContactDialog } from "./ContactDialogs";
import { useContact } from "./queries";
import { StatusChip } from "./StatusChip";

export function ContactPage() {
  const id = Number(useParams().id);
  const navigate = useNavigate();
  const [leaving, setLeaving] = useState(false);
  const query = useContact(id, !leaving);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (query.isPending)
    return (
      <div className="page">
        <LoadingState label="Loading contact..." />
      </div>
    );
  if (query.isError) {
    return (
      <div className="page">
        <ErrorState message={query.error.message} onRetry={() => query.refetch()} />
        <Link to="/contacts">Back to contacts</Link>
      </div>
    );
  }
  const contact = query.data;

  return (
    <div className="page">
      <PageHeader
        eyebrow={<Link to="/contacts">Contacts</Link>}
        title={contact.name}
        lede={contact.job_title ?? undefined}
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
        <div className="record-side">
          <section className="panel record-panel" aria-label="Details">
            <h2 className="section-title">Details</h2>
            <dl className="details">
              <dt>Status</dt>
              <dd>
                <StatusChip status={contact.status} />
              </dd>
              <dt>Organization</dt>
              <dd>
                {contact.organization ? (
                  <Link to={`/organizations/${contact.organization.id}`}>{contact.organization.name}</Link>
                ) : (
                  <span className="muted">None</span>
                )}
              </dd>
              <dt>Email</dt>
              <dd>
                {contact.email ? (
                  <a href={`mailto:${contact.email}`}>{contact.email}</a>
                ) : (
                  <span className="muted">Not set</span>
                )}
              </dd>
              <dt>Phone</dt>
              <dd>{contact.phone ?? <span className="muted">Not set</span>}</dd>
              <dt>Job title</dt>
              <dd>{contact.job_title ?? <span className="muted">Not set</span>}</dd>
            </dl>
          </section>
          <section className="panel record-panel" aria-labelledby="contact-deals">
            <h2 className="section-title" id="contact-deals">
              Deals <span className="count">{contact.deals.length}</span>
            </h2>
            {contact.deals.length === 0 ? (
              <p className="muted linked-empty">No deals with this contact yet.</p>
            ) : (
              <ul className="linked-list">
                {contact.deals.map((deal) => (
                  <li key={deal.id}>
                    <div className="linked-main">
                      <Link to={`/deals/${deal.id}`}>{deal.name}</Link>
                      <span className="muted mono">{money(deal.value)}</span>
                    </div>
                    <StageChip stage={deal.stage} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
        <div className="record-main">
          <Timeline entries={contact.timeline} owner={{ contact_id: contact.id }} showDealNames />
        </div>
      </div>
      {editing && <ContactFormDialog open onOpenChange={setEditing} contact={contact} />}
      <DeleteContactDialog
        target={deleting ? contact : null}
        onClose={() => setDeleting(false)}
        onDeleting={() => {
          setLeaving(true);
          navigate("/contacts");
        }}
      />
    </div>
  );
}
