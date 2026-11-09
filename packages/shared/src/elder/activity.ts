export type ActivityActorType = "elder" | "volunteer" | "admin" | "system";

export type ActivityLogInput = {
  actorType: ActivityActorType;
  actorId?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
};

export const ElderActivityAction = {
  register: "elder.register",
  sessionOk: "elder.session.ok",
  sessionFail: "elder.session.fail",
  profileView: "elder.profile.view",
  profileUpdate: "elder.profile.update",
} as const;
