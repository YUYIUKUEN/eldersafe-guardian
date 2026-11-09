"use client";

import { ApprovalStatusWatcher } from "./ApprovalStatusWatcher";

type ApprovedSessionGuardProps = {
  userId: string;
};

/** Watches approval realtime so disable/reject kicks approved users off app pages. */
export function ApprovedSessionGuard({ userId }: ApprovedSessionGuardProps) {
  return (
    <div className="sr-only" aria-hidden="true">
      <ApprovalStatusWatcher userId={userId} initialStatus="approved" />
    </div>
  );
}
