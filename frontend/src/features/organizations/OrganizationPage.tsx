import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { money } from "../../lib/format";
import { AddedBy } from "../../ui/AddedBy";
import { Avatar } from "../../ui/Avatar";
import { PageHeader } from "../../ui/PageHeader";
import { ErrorState, LoadingState } from "../../ui/States";
import { StatusChip } from "../contacts/StatusChip";
import { StageChip } from "../deals/StageChip";
import { DeleteOrganizationDialog, OrganizationFormDialog } from "./OrganizationDialogs";
import { useOrganization } from "./queries";
import { displayWebsite, websiteHref } from "./website";

export function OrganizationPage() {
  const id = Number(useParams().id);
  const navigate = useNavigate();
  const [leaving, setLeaving] = useState(false);
  const organization = useOrganization(id, !leaving);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (organization.isPending)
    return (
      <div className="page">
        <LoadingState label="Loading organization..." />
      </div>
    );
  if (organization.isError) {
    return (
      <div className="page">
        <ErrorState message={organization.error.message} onRetry={() => organization.refetch()} />
        <Link to="/organizations">Back to organizations</Link>
      </div>
    );
  }
  const org = organization.data;

  return (
    <div className="page">
      <PageHeader
        eyebrow={<Link to="/organizations">Organizations</Link>}
        title={org.name}
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
            <dt>Industry</dt>
            <dd>{org.industry ?? <span className="muted">Not set</span>}</dd>
            <dt>Website</dt>
            <dd>
              {org.website ? (
                <a href={websiteHref(org.website)} target="_blank" rel="noreferrer">
                  {displayWebsite(org.website)}
                </a>
              ) : (
                <span className="muted">Not set</span>
              )}
            </dd>
            <dt>Notes</dt>
            <dd className="notes">{org.notes ?? <span className="muted">No notes</span>}</dd>
          </dl>
          <AddedBy record={org} />
        </section>
        <div className="record-main">
          <section className="panel record-panel" aria-labelledby="org-contacts">
            <h2 className="section-title" id="org-contacts">
              Contacts <span className="count">{org.contacts.length}</span>
            </h2>
            {org.contacts.length === 0 ? (
              <p className="muted linked-empty">No contacts at this organization yet.</p>
            ) : (
              <ul className="linked-list">
                {org.contacts.map((contact) => (
                  <li key={contact.id}>
                    <Avatar contactName={contact.name} size={30} />
                    <div className="linked-main">
                      <Link to={`/contacts/${contact.id}`}>{contact.name}</Link>
                      <span className="muted">{contact.job_title ?? contact.email ?? ""}</span>
                    </div>
                    <StatusChip status={contact.status} />
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="panel record-panel" aria-labelledby="org-deals">
            <h2 className="section-title" id="org-deals">
              Deals <span className="count">{org.deals.length}</span>
            </h2>
            {org.deals.length === 0 ? (
              <p className="muted linked-empty">No deals with this organization yet.</p>
            ) : (
              <ul className="linked-list">
                {org.deals.map((deal) => (
                  <li key={deal.id}>
                    <div className="linked-main">
                      <Link to={`/deals/${deal.id}`}>{deal.name}</Link>
                      <span className="muted">{deal.contact_name ?? ""}</span>
                    </div>
                    <span className="mono">{money(deal.value)}</span>
                    <StageChip stage={deal.stage} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
      {editing && <OrganizationFormDialog open onOpenChange={setEditing} organization={org} />}
      <DeleteOrganizationDialog
        target={deleting ? org : null}
        onClose={() => setDeleting(false)}
        onDeleting={() => {
          setLeaving(true);
          navigate("/organizations");
        }}
      />
    </div>
  );
}
