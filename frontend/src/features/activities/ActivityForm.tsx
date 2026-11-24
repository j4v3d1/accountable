import { zodResolver } from "@hookform/resolvers/zod";
import { format, parseISO } from "date-fns";
import { FileIcon, Mail, Phone } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { TextAreaField, TextField } from "../../ui/fields";
import { FormActions } from "../../ui/FormDialog";
import type { ActivityInput } from "./types";

const TYPES = [
  { key: "note", label: "Note", icon: FileIcon },
  { key: "call", label: "Call", icon: Phone },
  { key: "email", label: "Email", icon: Mail },
] as const;

const schema = z.object({
  type: z.enum(["note", "call", "email"]),
  description: z.string().trim().min(1, "Describe what happened"),
  // The browser gives local time; the API stores UTC.
  occurred_at: z
    .string()
    .min(1, "Choose when it happened")
    .transform((v) => new Date(v).toISOString()),
  follow_up_date: z.string().transform((v) => (v === "" ? null : v)),
  done: z.boolean(),
});

type Output = Omit<ActivityInput, "contact_id" | "deal_id">;

interface Props {
  initial?: Output | null;
  onSubmit: (input: Output) => void;
  onCancel: () => void;
  pending?: boolean;
}

function localInput(iso: string) {
  return format(parseISO(iso), "yyyy-MM-dd'T'HH:mm");
}

export function ActivityForm({ initial, onSubmit, onCancel, pending }: Props) {
  const form = useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: initial?.type ?? "note",
      description: initial?.description ?? "",
      occurred_at: localInput(initial?.occurred_at ?? new Date().toISOString()),
      follow_up_date: initial?.follow_up_date ?? "",
      done: initial?.done ?? false,
    },
  });
  const { errors } = form.formState;
  const hasFollowUp = Boolean(useWatch({ control: form.control, name: "follow_up_date" }));

  function submit(values: z.output<typeof schema>) {
    onSubmit({ ...values, done: values.follow_up_date ? values.done : false });
  }

  return (
    <form onSubmit={form.handleSubmit(submit)} noValidate>
      <div className="form-grid">
        <fieldset className="span-2 type-choice">
          <legend className="field-label">Type</legend>
          {TYPES.map(({ key, label, icon: Icon }) => (
            <label key={key} className="type-option">
              <input type="radio" value={key} {...form.register("type")} />
              <Icon size={15} aria-hidden="true" />
              {label}
            </label>
          ))}
        </fieldset>
        <TextAreaField
          label="Description"
          fieldClassName="span-2"
          error={errors.description?.message}
          {...form.register("description")}
        />
        <TextField
          label="When"
          type="datetime-local"
          error={errors.occurred_at?.message}
          {...form.register("occurred_at")}
        />
        <TextField label="Follow-up date" type="date" {...form.register("follow_up_date")} />
        {hasFollowUp && (
          <label className="checkbox span-2">
            <input type="checkbox" {...form.register("done")} />
            Done
          </label>
        )}
      </div>
      <FormActions onCancel={onCancel} pending={pending} />
    </form>
  );
}
