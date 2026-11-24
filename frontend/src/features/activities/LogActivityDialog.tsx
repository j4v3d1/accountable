import { useState } from "react";
import { FormDialog } from "../../ui/FormDialog";
import { RecordPicker } from "../../ui/RecordPicker";
import { contactOptions, useContacts } from "../contacts/queries";
import { useDeals } from "../deals/queries";
import { ActivityForm } from "./ActivityForm";
import { useSaveActivity } from "./queries";
import "./activities.css";

/** "Log activity" from the dashboard, where the activity's contact or deal is chosen first (R28). */
export function LogActivityDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const save = useSaveActivity();
  const contacts = useContacts();
  const deals = useDeals();
  const [kind, setKind] = useState<"contact" | "deal">("contact");
  const [ownerId, setOwnerId] = useState<number | null>(null);
  const [error, setError] = useState<string>();
  const options =
    kind === "contact"
      ? contactOptions(contacts.data)
      : (deals.data ?? []).map((deal) => ({ id: deal.id, label: deal.name, hint: deal.contact_name }));

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title="Log activity">
      <div className="form-grid owner-grid">
        <fieldset className="span-2 type-choice">
          <legend className="field-label">Log it on</legend>
          {(["contact", "deal"] as const).map((option) => (
            <label key={option} className="type-option">
              <input
                type="radio"
                name="owner-kind"
                checked={kind === option}
                onChange={() => {
                  setKind(option);
                  setOwnerId(null);
                }}
              />
              {option === "contact" ? "A contact" : "A deal"}
            </label>
          ))}
        </fieldset>
        <div className="span-2">
          <RecordPicker
            label={kind === "contact" ? "Contact" : "Deal"}
            value={ownerId}
            onChange={(id) => {
              setOwnerId(id);
              setError(undefined);
            }}
            options={options}
            error={error}
          />
        </div>
      </div>
      <ActivityForm
        pending={save.isPending}
        onCancel={() => onOpenChange(false)}
        onSubmit={(input) => {
          if (ownerId === null) {
            setError("Choose a contact or deal");
            return;
          }
          const owner = kind === "contact" ? { contact_id: ownerId } : { deal_id: ownerId };
          save.mutate({ input: { ...input, ...owner } }, { onSuccess: () => onOpenChange(false) });
        }}
      />
    </FormDialog>
  );
}
