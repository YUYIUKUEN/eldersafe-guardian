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
  helpRequestCreate: "elder.help_request.create",
  helpRequestView: "elder.help_request.view",
  helpRequestList: "elder.help_request.list",
  helpRequestCancel: "elder.help_request.cancel",
  helpRequestConfirm: "elder.help_request.confirm",
  locationShare: "elder.location.share",
  locationShareStop: "elder.location.share_stop",
} as const;
