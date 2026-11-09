export const AdminActivityAction = {
  login: "admin.login",
  logout: "admin.logout",
  volunteerApprove: "admin.volunteer.approve",
  volunteerReject: "admin.volunteer.reject",
  volunteerDisable: "admin.volunteer.disable",
  volunteerReactivate: "admin.volunteer.reactivate",
  volunteerUpdate: "admin.volunteer.update",
  elderDisable: "admin.elder.disable",
  elderReactivate: "admin.elder.reactivate",
  elderUpdate: "admin.elder.update",
} as const;

export type AdminActivityActionName =
  (typeof AdminActivityAction)[keyof typeof AdminActivityAction];
