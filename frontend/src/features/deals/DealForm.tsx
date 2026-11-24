import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { blankToNull } from "../../lib/validation";
import { SelectField, TextAreaField, TextField } from "../../ui/fields";
import { FormActions } from "../../ui/FormDialog";
import { RecordPicker, type PickerOption } from "../../ui/RecordPicker";
import type { DealInput, Stage, StageKey } from "./types";

const schema = z.object({
  name: z.string().trim().min(1, "Enter a name"),
  contact_id: z.number().nullable(),
  organization_id: z.number().nullable(),
  stage: z.string().transform((v) => v as StageKey),
  value: z
    .string()
    .trim()
    .regex(/^\d+$/, "Enter a whole dollar amount, 0 or more")
    .transform(Number),
  probability: z
    .string()
    .trim()
    .regex(/^\d+$/, "Enter a whole number from 0 to 100")
    .transform(Number)
    .refine((v) => v <= 100, "Enter a whole number from 0 to 100"),
  close_date: z.string().min(1, "Choose a close date"),
  notes: z.string().transform(blankToNull),
});

interface Props {
  stages: Stage[];
  contacts: PickerOption[];
  organizations: PickerOption[];
  initial?: DealInput | null;
  /** The stage a new deal starts at, such as the column it was added in (R25). */
  defaultStage?: StageKey;
  onSubmit: (input: DealInput) => void;
  onCancel: () => void;
  pending?: boolean;
}

export function DealForm({ stages, contacts, organizations, initial, defaultStage, onSubmit, onCancel, pending }: Props) {
  const startStage = initial?.stage ?? defaultStage ?? "new_lead";
  const usual = (key: string) => stages.find((stage) => stage.key === key)?.probability ?? 0;
  const form = useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initial?.name ?? "",
      contact_id: initial?.contact_id ?? null,
      organization_id: initial?.organization_id ?? null,
      stage: startStage,
      value: initial ? String(initial.value) : "",
      probability: String(initial?.probability ?? usual(startStage)),
      close_date: initial?.close_date ?? "",
      notes: initial?.notes ?? "",
    },
  });
  const { errors } = form.formState;
  const stageField = form.register("stage", {
    // Choosing a stage fills in its usual probability (R14).
    onChange: (event) => form.setValue("probability", String(usual(event.target.value)), { shouldValidate: true }),
  });

  return (
    <form onSubmit={form.handleSubmit((values) => onSubmit(values))} noValidate>
      <div className="form-grid">
        <TextField label="Name" fieldClassName="span-2" placeholder="142 Maple Ave purchase" error={errors.name?.message} {...form.register("name")} />
        <Controller
          control={form.control}
          name="contact_id"
          render={({ field }) => (
            <RecordPicker label="Main contact" value={field.value} onChange={field.onChange} options={contacts} />
          )}
        />
        <Controller
          control={form.control}
          name="organization_id"
          render={({ field }) => (
            <RecordPicker label="Organization" value={field.value} onChange={field.onChange} options={organizations} />
          )}
        />
        <SelectField label="Stage" {...stageField}>
          {stages.map((stage) => (
            <option key={stage.key} value={stage.key}>
              {stage.label}
            </option>
          ))}
        </SelectField>
        <TextField label="Close date" type="date" error={errors.close_date?.message} {...form.register("close_date")} />
        <TextField
          label="Value (USD)"
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          className="mono"
          error={errors.value?.message}
          {...form.register("value")}
        />
        <TextField
          label="Probability (%)"
          type="number"
          inputMode="numeric"
          min={0}
          max={100}
          step={1}
          className="mono"
          error={errors.probability?.message}
          {...form.register("probability")}
        />
        <TextAreaField label="Notes" fieldClassName="span-2" {...form.register("notes")} />
      </div>
      <FormActions onCancel={onCancel} pending={pending} />
    </form>
  );
}
