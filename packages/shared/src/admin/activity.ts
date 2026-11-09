export const AdminActivityAction = {
  login: "admin.login",
  logout: "admin.logout",
} as const;

export type AdminActivityActionName =
  (typeof AdminActivityAction)[keyof typeof AdminActivityAction];
