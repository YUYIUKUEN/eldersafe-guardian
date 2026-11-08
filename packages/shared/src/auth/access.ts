import type { AccessContext } from "./types";

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
