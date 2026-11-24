import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { blankToNull, isEmail } from "../../lib/validation";
import { SelectField, TextField } from "../../ui/fields";
import { FormActions } from "../../ui/FormDialog";
import { RecordPicker, type PickerOption } from "../../ui/RecordPicker";
import { STATUSES, type ContactInput, type ContactStatus } from "./types";

const schema = z.object({
  first_name: z.string().trim().min(1, "Enter a first name"),
  last_name: z.string().trim().min(1, "Enter a last name"),
  email: z
    .string()
    .trim()
    .refine((v) => v === "" || isEmail(v), "Enter a valid email address")
    .transform(blankToNull),
  phone: z.string().transform(blankToNull),
  job_title: z.string().transform(blankToNull),
  organization_id: z.number().nullable(),
  status: z.enum(["lead", "qualified", "customer"]),
});

interface Props {
  initial?: ContactInput | null;
  organizations: PickerOption[];
  onSubmit: (input: ContactInput) => void;
  onCancel: () => void;
  pending?: boolean;
}

export function ContactForm({ initial, organizations, onSubmit, onCancel, pending }: Props) {
  const form = useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      first_name: initial?.first_name ?? "",
      last_name: initial?.last_name ?? "",
      email: initial?.email ?? "",
      phone: initial?.phone ?? "",
      job_title: initial?.job_title ?? "",
      organization_id: initial?.organization_id ?? null,
      status: (initial?.status ?? "lead") as ContactStatus,
    },
  });
  const { errors } = form.formState;

  return (
    <form onSubmit={form.handleSubmit((values) => onSubmit(values))} noValidate>
      <div className="form-grid">
        <TextField label="First name" error={errors.first_name?.message} {...form.register("first_name")} />
        <TextField label="Last name" error={errors.last_name?.message} {...form.register("last_name")} />
        <TextField label="Email" type="email" error={errors.email?.message} {...form.register("email")} />
        <TextField label="Phone" type="tel" {...form.register("phone")} />
        <TextField label="Job title" {...form.register("job_title")} />
        <SelectField label="Status" {...form.register("status")}>
          {STATUSES.map((status) => (
            <option key={status.key} value={status.key}>
              {status.label}
            </option>
          ))}
        </SelectField>
        <div className="span-2">
          <Controller
            control={form.control}
            name="organization_id"
            render={({ field }) => (
              <RecordPicker label="Organization" value={field.value} onChange={field.onChange} options={organizations} />
            )}
          />
        </div>
      </div>
      <FormActions onCancel={onCancel} pending={pending} />
    </form>
  );
}
