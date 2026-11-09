export type HelpRequestStatus =
  | "pending"
  | "accepted"
  | "completed"
  | "cancelled";

export type HelpRequestListItem = {
  id: string;
  status: HelpRequestStatus;
  volunteerName: string | null;
  createdAt: string;
  acceptedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  elderConfirmedAt: string | null;
  awaitingElderConfirm: boolean;
  canCancel: boolean;
  canConfirm: boolean;
};
