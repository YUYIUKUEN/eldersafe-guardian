"use client";

import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

type SharedProps = {
  id: string;
  label: string;
  error?: string | null;
};

type BigFieldInputProps = SharedProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "className"> & {
    multiline?: false;
  };

type BigFieldTextareaProps = SharedProps &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id" | "className"> & {
    multiline: true;
  };

export type BigFieldProps = BigFieldInputProps | BigFieldTextareaProps;

const controlClassName = [
  "w-full rounded-2xl border-2 bg-surface px-4 py-4",
  "min-h-[72px] text-[24px] font-bold leading-tight text-foreground",
  "placeholder:font-medium placeholder:text-muted",
  "focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2",
  "focus-visible:outline-assist",
].join(" ");

export function BigField(props: BigFieldProps) {
  const describedBy = props.error ? `${props.id}-error` : undefined;
  const borderClass = props.error ? "border-emergency" : "border-border";

  return (
    <div className="flex flex-col gap-3">
      <label
        htmlFor={props.id}
        className="text-[28px] font-bold text-foreground"
      >
        {props.label}
      </label>
      {props.multiline ? (
        <textarea
          id={props.id}
          name={props.name}
          value={props.value}
          defaultValue={props.defaultValue}
          placeholder={props.placeholder}
          required={props.required}
          disabled={props.disabled}
          rows={props.rows}
          onChange={props.onChange}
          onBlur={props.onBlur}
          aria-invalid={Boolean(props.error)}
          aria-describedby={describedBy}
          className={`${controlClassName} ${borderClass} min-h-[160px] resize-y`}
        />
      ) : (
        <input
          id={props.id}
          name={props.name}
          type={props.type}
          value={props.value}
          defaultValue={props.defaultValue}
          placeholder={props.placeholder}
          required={props.required}
          disabled={props.disabled}
          inputMode={props.inputMode}
          autoComplete={props.autoComplete}
          onChange={props.onChange}
          onBlur={props.onBlur}
          aria-invalid={Boolean(props.error)}
          aria-describedby={describedBy}
          className={`${controlClassName} ${borderClass}`}
        />
      )}
      {props.error ? (
        <p
          id={describedBy}
          role="alert"
          className="text-[22px] font-bold leading-snug text-emergency"
        >
          {props.error}
        </p>
      ) : null}
    </div>
  );
}
