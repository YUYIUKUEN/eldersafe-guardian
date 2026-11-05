/**
 * Volunteer points rules.
 * Points are awarded only after the elder confirms completion.
 */

export const POINTS_PER_COMPLETED_REQUEST = 10;

export function canAwardPoints(input: {
  requestStatus: "pending" | "accepted" | "completed";
  elderConfirmed: boolean;
}): boolean {
  return input.requestStatus === "completed" && input.elderConfirmed;
}

export function calculateAwardPoints(input: {
  requestStatus: "pending" | "accepted" | "completed";
  elderConfirmed: boolean;
}): number {
  return canAwardPoints(input) ? POINTS_PER_COMPLETED_REQUEST : 0;
}
