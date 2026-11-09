import type { AccessContext } from "./types";

/** Signed-in volunteer waiting for admin approval. */
export function isPendingVolunteer(ctx: AccessContext): boolean {
  return (
    Boolean(ctx.userId) &&
    ctx.role === "volunteer" &&
    ctx.approvalStatus === "pending"
  );
}

/** Signed-in volunteer rejected or disabled by admin. */
export function isBlockedVolunteer(ctx: AccessContext): boolean {
  return (
    Boolean(ctx.userId) &&
    ctx.role === "volunteer" &&
    (ctx.approvalStatus === "rejected" || ctx.approvalStatus === "disabled")
  );
}

/** Volunteer portal: signed-in volunteer with approved status. */
export function canAccessVolunteerApp(ctx: AccessContext): boolean {
  return (
    Boolean(ctx.userId) &&
    ctx.role === "volunteer" &&
    ctx.approvalStatus === "approved"
  );
}

/** Admin portal: signed-in user with admin role. */
export function canAccessAdminApp(ctx: AccessContext): boolean {
  return Boolean(ctx.userId) && ctx.role === "admin";
}

/** Path destination after login based on approval status. */
export function volunteerDestinationForAccess(ctx: AccessContext): string {
  if (canAccessVolunteerApp(ctx)) return "/";
  if (isPendingVolunteer(ctx)) return "/pending";
  if (isBlockedVolunteer(ctx)) return "/account-status";
  return "/login";
}
