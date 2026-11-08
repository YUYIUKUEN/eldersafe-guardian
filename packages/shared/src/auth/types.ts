export type ProfileRole = "volunteer" | "admin";

export type VolunteerApprovalStatus = "pending" | "approved" | "disabled";

export type AccessContext = {
  userId: string | null;
  role: ProfileRole | null;
  approvalStatus: VolunteerApprovalStatus | null;
};
