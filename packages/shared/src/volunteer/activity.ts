export const VolunteerActivityAction = {
  register: "volunteer.register",
  login: "volunteer.login",
  logout: "volunteer.logout",
  passwordResetRequest: "volunteer.password_reset.request",
  passwordResetComplete: "volunteer.password_reset.complete",
  profileUpdate: "volunteer.profile.update",
  passwordChange: "volunteer.password.change",
  audioPlay: "volunteer.help_request.audio_play",
  accept: "volunteer.help_request.accept",
  release: "volunteer.help_request.release",
  complete: "volunteer.help_request.complete",
} as const;

export type VolunteerActivityActionName =
  (typeof VolunteerActivityAction)[keyof typeof VolunteerActivityAction];
