export const CERTIFICATES_BUCKET = "certificates";

export function certificateObjectPath(input: {
  yearMonth: string;
  rank: 1 | 2 | 3;
  volunteerId: string;
}): string {
  return `${input.yearMonth}/rank-${input.rank}-${input.volunteerId}.pdf`;
}
