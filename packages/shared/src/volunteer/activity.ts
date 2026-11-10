export const VolunteerActivityAction = {
  register: "volunteer.register",
  login: "volunteer.login",
  logout: "volunteer.logout",
  passwordResetRequest: "volunteer.password_reset.request",
  passwordResetComplete: "volunteer.password_reset.complete",
  profileUpdate: "volunteer.profile.update",
  passwordChange: "volunteer.password.change",
  leaderboardPrivacyUpdate: "volunteer.leaderboard.privacy_update",
  leaderboardView: "volunteer.leaderboard.view",
} as const;

export type VolunteerActivityActionName =
  (typeof VolunteerActivityAction)[keyof typeof VolunteerActivityAction];
