"use client";

type BigCheckboxProps = {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  error?: string | null;
};

export function BigCheckbox({
  id,
  checked,
  onChange,
  label,
  error,
}: BigCheckboxProps) {
  const describedBy = error ? `${id}-error` : undefined;

  return (
    <div className="flex flex-col gap-3">
      <label
        htmlFor={id}
        className={[
          "flex cursor-pointer items-start gap-4 rounded-2xl border-2 p-4",
          error ? "border-emergency bg-emergency-soft" : "border-border bg-surface",
        ].join(" ")}
      >
        <input
          id={id}
          type="checkbox"
          checked={checked}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          onChange={(event) => onChange(event.target.checked)}
          className="mt-1 size-10 shrink-0 accent-assist"
        />
        <span className="text-[22px] font-bold leading-snug text-foreground">
          {label}
        </span>
      </label>
      {error ? (
        <p
          id={describedBy}
          role="alert"
          className="text-[22px] font-bold leading-snug text-emergency"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
