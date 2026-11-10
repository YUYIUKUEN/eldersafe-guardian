type MedalIconProps = {
  place: 1 | 2 | 3;
  className?: string;
};

const medalFill: Record<1 | 2 | 3, { metal: string; ribbon: string }> = {
  1: { metal: "#eab308", ribbon: "#b45309" },
  2: { metal: "#94a3b8", ribbon: "#475569" },
  3: { metal: "#d97706", ribbon: "#9a3412" },
};

/** Inline gold / silver / bronze medal for top-3 leaderboard rows. */
export function MedalIcon({ place, className }: MedalIconProps) {
  const colors = medalFill[place];
  return (
    <svg
      viewBox="0 0 48 48"
      className={className ?? "h-10 w-10"}
      role="img"
      aria-hidden="true"
    >
      <path
        d="M16 4h6l2 12-5 3-5-3z"
        fill={colors.ribbon}
      />
      <path
        d="M26 4h6l2 12-5 3-5-3z"
        fill={colors.ribbon}
      />
      <circle cx="24" cy="30" r="14" fill={colors.metal} />
      <circle
        cx="24"
        cy="30"
        r="10"
        fill="none"
        stroke="#fff"
        strokeWidth="2"
        opacity="0.7"
      />
      <text
        x="24"
        y="35"
        textAnchor="middle"
        fontSize="14"
        fontWeight="700"
        fill="#1e293b"
      >
        {place}
      </text>
    </svg>
  );
}
