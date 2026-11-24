import * as Popover from "@radix-ui/react-popover";
import { Command } from "cmdk";
import { Check, ChevronsUpDown } from "lucide-react";
import { useId, useState } from "react";
import { Field } from "./fields";
import "./ui.css";

export interface PickerOption {
  id: number;
  label: string;
  hint?: string | null;
}

interface Props {
  label: string;
  value: number | null;
  onChange: (id: number | null) => void;
  options: PickerOption[];
  error?: string;
}

/** Choose a contact or organization from a searchable list, or none (R10, R13). */
export function RecordPicker({ label, value, onChange, options, error }: Props) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.id === value);

  function choose(next: number | null) {
    onChange(next);
    setOpen(false);
  }

  return (
    <Field label={label} htmlFor={id} error={error}>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button id={id} type="button" className="input picker-trigger" aria-haspopup="listbox" aria-expanded={open}>
            {selected ? selected.label : <span className="muted">None</span>}
            <ChevronsUpDown size={15} aria-hidden="true" />
          </button>
        </Popover.Trigger>
        {/* Not portalled, so it works inside a dialog's focus trap. */}
        <Popover.Content className="picker" align="start" sideOffset={4}>
          <Command label={label}>
            <Command.Input className="picker-search" placeholder={`Search ${label.toLowerCase()}`} />
            <Command.List className="picker-list">
              <Command.Empty className="picker-empty">No matches.</Command.Empty>
              <Command.Item className="picker-item" value="none" onSelect={() => choose(null)}>
                <span className="muted">None</span>
                {value === null && <Check size={14} aria-hidden="true" />}
              </Command.Item>
              {options.map((option) => (
                <Command.Item
                  key={option.id}
                  className="picker-item"
                  value={`${option.label} ${option.hint ?? ""} ${option.id}`}
                  onSelect={() => choose(option.id)}
                >
                  <span>
                    {option.label}
                    {option.hint && <span className="muted"> · {option.hint}</span>}
                  </span>
                  {option.id === value && <Check size={14} aria-hidden="true" />}
                </Command.Item>
              ))}
            </Command.List>
          </Command>
        </Popover.Content>
      </Popover.Root>
    </Field>
  );
}
