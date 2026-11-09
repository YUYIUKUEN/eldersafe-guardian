"use client";

import { useEffect, useRef, useState } from "react";
import { BigButton } from "@/components/ui/BigButton";

const HOLD_MS = 1000;

type HoldToActivateButtonProps = {
  href: string;
  children: React.ReactNode;
  className?: string;
  hint: string;
  holdingLabel: string;
};

export function HoldToActivateButton({
  href,
  children,
  className,
  hint,
  holdingLabel,
}: HoldToActivateButtonProps) {
  const [holding, setHolding] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const activatedRef = useRef(false);
  const holdingRef = useRef(false);

  useEffect(() => {
    return () => {
      clearHoldTimers();
    };
  }, []);

  function clearHoldTimers() {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (rafRef.current != null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }

  function resetVisual() {
    startedAtRef.current = null;
    holdingRef.current = false;
    setHolding(false);
    setProgress(0);
  }

  function tick() {
    if (startedAtRef.current == null) return;
    const elapsed = Date.now() - startedAtRef.current;
    setProgress(Math.min(1, elapsed / HOLD_MS));
    if (elapsed < HOLD_MS) {
      rafRef.current = window.requestAnimationFrame(tick);
    }
  }

  function startHold() {
    if (activatedRef.current || holdingRef.current) return;
    clearHoldTimers();
    activatedRef.current = false;
    holdingRef.current = true;
    startedAtRef.current = Date.now();
    setHolding(true);
    setProgress(0);
    rafRef.current = window.requestAnimationFrame(tick);
    timerRef.current = window.setTimeout(() => {
      activatedRef.current = true;
      clearHoldTimers();
      resetVisual();
      // Hard navigation is more reliable than client router after a long-press.
      window.location.assign(href);
    }, HOLD_MS);
  }

  function endHold() {
    if (activatedRef.current) return;
    clearHoldTimers();
    resetVisual();
  }

  return (
    <div className="flex flex-1 flex-col gap-2">
      <div className="relative flex-1">
        <BigButton
          variant="emergency"
          className={[className, "touch-none select-none"].filter(Boolean).join(" ")}
          aria-describedby="emergency-hold-hint"
          data-testid="emergency-hold-button"
          onPointerDown={(event) => {
            if (event.button !== 0 && event.pointerType === "mouse") return;
            event.preventDefault();
            try {
              (event.currentTarget as HTMLButtonElement).setPointerCapture(
                event.pointerId,
              );
            } catch {
              // Capture can fail in some automation environments.
            }
            startHold();
          }}
          onPointerUp={endHold}
          onPointerCancel={endHold}
          onLostPointerCapture={endHold}
          onMouseDown={(event) => {
            if (event.button !== 0) return;
            startHold();
          }}
          onMouseUp={endHold}
          onTouchStart={(event) => {
            event.preventDefault();
            startHold();
          }}
          onTouchEnd={endHold}
          onTouchCancel={endHold}
          onContextMenu={(event) => event.preventDefault()}
          onKeyDown={(event) => {
            if (event.key === " " || event.key === "Enter") {
              event.preventDefault();
              startHold();
            }
          }}
          onKeyUp={(event) => {
            if (event.key === " " || event.key === "Enter") {
              event.preventDefault();
              endHold();
            }
          }}
        >
          {holding ? holdingLabel : children}
        </BigButton>
        {holding ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-3 bottom-3 h-3 overflow-hidden rounded-full bg-white/30"
          >
            <div
              className="h-full rounded-full bg-white transition-[width] duration-75"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        ) : null}
      </div>
      <p
        id="emergency-hold-hint"
        className="text-center text-[20px] font-bold leading-snug text-emergency"
      >
        {hint}
      </p>
    </div>
  );
}
