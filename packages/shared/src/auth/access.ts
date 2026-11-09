import type { AccessContext } from "./types";

/** Signed-in volunteer waiting for admin approval. */
export function isPendingVolunteer(ctx: AccessContext): boolean {
  return (
    Boolean(ctx.userId) &&
    ctx.role === "volunteer" &&
    ctx.approvalStatus === "pending"
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
