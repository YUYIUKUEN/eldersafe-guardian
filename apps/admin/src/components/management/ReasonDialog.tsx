"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";

type Option = { id: string; label: string };

type ReasonDialogProps = {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  reasonLabel: string;
  reasonPlaceholder?: string;
  selectLabel?: string;
  selectOptions?: Option[];
  selectPlaceholder?: string;
  pending?: boolean;
  danger?: boolean;
  onConfirm: (input: { reason: string; selectedId?: string }) => void;
  onCancel: () => void;
};

export function ReasonDialog({
  open,
  title,
  body,
  confirmLabel,
  reasonLabel,
  reasonPlaceholder,
  selectLabel,
  selectOptions,
  selectPlaceholder,
  pending = false,
  danger = false,
  onConfirm,
  onCancel,
}: ReasonDialogProps) {
  const t = useTranslations("AdminManagement");
  const titleId = useId();
  const bodyId = useId();
  const [reason, setReason] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const reasonRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setReason("");
      setSelectedId("");
      setLocalError(null);
      reasonRef.current?.focus();
    });
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      cancelled = true;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, pending, onCancel]);

  if (!open) return null;

  function submit() {
    const trimmed = reason.trim();
    if (trimmed.length < 2) {
      setLocalError(t("reasonRequired"));
      return;
    }
    if (selectOptions && selectOptions.length > 0 && !selectedId) {
      setLocalError(t("selectRequired"));
      return;
    }
    onConfirm({ reason: trimmed, selectedId: selectedId || undefined });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
      >
        <h2 id={titleId} className="text-xl font-bold text-slate-900">
          {title}
        </h2>
        <p id={bodyId} className="mt-2 text-sm text-slate-700">
          {body}
        </p>

        {selectOptions && selectOptions.length > 0 ? (
          <label className="mt-4 block text-sm font-semibold text-slate-800">
            {selectLabel}
            <select
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none ring-brand focus:ring-2"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              disabled={pending}
            >
              <option value="">{selectPlaceholder ?? "—"}</option>
              {selectOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="mt-4 block text-sm font-semibold text-slate-800">
          {reasonLabel}
          <textarea
            ref={reasonRef}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none ring-brand focus:ring-2"
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={reasonPlaceholder}
            disabled={pending}
          />
        </label>

        {localError ? (
          <p className="mt-2 text-sm font-medium text-red-700" role="alert">
            {localError}
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className={`inline-flex min-h-10 items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-60 ${
              danger
                ? "bg-red-700 hover:bg-red-600"
                : "bg-brand hover:brightness-110"
            }`}
          >
            {pending ? t("working") : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
