import type { InputHTMLAttributes, ReactNode, Ref, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { useId } from "react";
import "./ui.css";

interface FieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  children: ReactNode;
  className?: string;
}

/** A label, a control and its error message underneath (R3). */
export function Field({ label, htmlFor, error, children, className }: FieldProps) {
  return (
    <div className={className ? `field ${className}` : "field"}>
      <label className="field-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error && (
        <p className="field-error" id={`${htmlFor}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}

function errorProps(id: string, error?: string) {
  return error ? { "aria-invalid": true as const, "aria-describedby": `${id}-error` } : {};
}

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  ref?: Ref<HTMLInputElement>;
  fieldClassName?: string;
};

export function TextField({ label, error, id, fieldClassName, className, ...props }: TextFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <Field label={label} htmlFor={inputId} error={error} className={fieldClassName}>
      <input id={inputId} className={className ? `input ${className}` : "input"} {...errorProps(inputId, error)} {...props} />
    </Field>
  );
}

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
  ref?: Ref<HTMLSelectElement>;
  fieldClassName?: string;
};

export function SelectField({ label, error, id, children, fieldClassName, ...props }: SelectFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <Field label={label} htmlFor={inputId} error={error} className={fieldClassName}>
      <select id={inputId} className="input" {...errorProps(inputId, error)} {...props}>
        {children}
      </select>
    </Field>
  );
}

type TextAreaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string;
  ref?: Ref<HTMLTextAreaElement>;
  fieldClassName?: string;
};

export function TextAreaField({ label, error, id, fieldClassName, ...props }: TextAreaFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <Field label={label} htmlFor={inputId} error={error} className={fieldClassName}>
      <textarea id={inputId} className="input" rows={3} {...errorProps(inputId, error)} {...props} />
    </Field>
  );
}
