/**
 * Points are awarded only after the elder confirms a completed help request.
 * Full scoring rules land in phase 5 — this stub reserves the call site.
 */
export type AwardPointsInput = {
  helpRequestId: string;
  volunteerId: string;
  elderId: string;
};

export type AwardPointsResult = {
  awarded: boolean;
  deferred: true;
  reason: "phase5_pending";
};

export async function awardPointsForConfirmedHelpRequest(
  _input: AwardPointsInput,
): Promise<AwardPointsResult> {
  return {
    awarded: false,
    deferred: true,
    reason: "phase5_pending",
  };
}
