import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { blankToNull, isWebsite } from "../../lib/validation";
import { SelectField, TextAreaField, TextField } from "../../ui/fields";
import { FormActions } from "../../ui/FormDialog";
import { INDUSTRIES, type Industry, type OrganizationInput } from "./types";

const schema = z.object({
  name: z.string().trim().min(1, "Enter a name"),
  website: z
    .string()
    .trim()
    .refine((v) => v === "" || isWebsite(v), "Enter a valid website, such as example.com")
    .transform(blankToNull),
  industry: z.string().transform((v) => (v === "" ? null : (v as Industry))),
  notes: z.string().transform(blankToNull),
});

interface Props {
  initial?: OrganizationInput | null;
  onSubmit: (input: OrganizationInput) => void;
  onCancel: () => void;
  pending?: boolean;
}

export function OrganizationForm({ initial, onSubmit, onCancel, pending }: Props) {
  const form = useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initial?.name ?? "",
      website: initial?.website ?? "",
      industry: initial?.industry ?? "",
      notes: initial?.notes ?? "",
    },
  });
  const { errors } = form.formState;

  return (
    <form onSubmit={form.handleSubmit((values) => onSubmit(values))} noValidate>
      <div className="form-grid">
        <TextField label="Name" fieldClassName="span-2" error={errors.name?.message} {...form.register("name")} />
        <TextField label="Website" placeholder="example.com" error={errors.website?.message} {...form.register("website")} />
        <SelectField label="Industry" {...form.register("industry")}>
          <option value="">Not set</option>
          {INDUSTRIES.map((industry) => (
            <option key={industry} value={industry}>
              {industry}
            </option>
          ))}
        </SelectField>
        <TextAreaField label="Notes" fieldClassName="span-2" {...form.register("notes")} />
      </div>
      <FormActions onCancel={onCancel} pending={pending} />
    </form>
  );
}
