export type RankedVolunteer = {
  volunteerId: string;
  name: string;
  points: number;
  completedCount: number;
  /** Competition rank after points → completedCount ordering. */
  rank: number;
};

export type PodiumResolution =
  | {
      status: "clear";
      top3: RankedVolunteer[];
    }
  | {
      status: "needs_decision";
      /** Already uniquely ordered higher places (may be empty). */
      lockedPrefix: RankedVolunteer[];
      /** Next group that is tied and needs admin ordering / picking. */
      tieGroup: RankedVolunteer[];
      /** How many podium slots remain to fill (1–3). */
      slotsToFill: number;
      /** Full ordered list for display context. */
      ranking: RankedVolunteer[];
    };

function scoreKey(entry: Pick<RankedVolunteer, "points" | "completedCount">) {
  return `${entry.points}:${entry.completedCount}`;
}

/**
 * Resolve Top 3 for settlement.
 * Ordering: points desc, then completed services desc.
 * When a tie group would fill more than one remaining podium slot (or
 * compete for the last slots), admin must decide order / selection.
 */
export function resolvePodium(
  ranking: RankedVolunteer[],
): PodiumResolution {
  const lockedPrefix: RankedVolunteer[] = [];
  let index = 0;

  while (lockedPrefix.length < 3 && index < ranking.length) {
    const head = ranking[index]!;
    const key = scoreKey(head);
    const group: RankedVolunteer[] = [];
    while (index < ranking.length && scoreKey(ranking[index]!) === key) {
      group.push(ranking[index]!);
      index += 1;
    }

    const remaining = 3 - lockedPrefix.length;
    if (group.length === 1) {
      lockedPrefix.push(group[0]!);
      continue;
    }

    // Tied group — admin must pick / order for the remaining slots.
    return {
      status: "needs_decision",
      lockedPrefix,
      tieGroup: group,
      slotsToFill: Math.min(remaining, group.length),
      ranking,
    };
  }

  if (lockedPrefix.length < 3) {
    // Fewer than 3 volunteers with points this month.
    return {
      status: "clear",
      top3: lockedPrefix,
    };
  }

  return { status: "clear", top3: lockedPrefix.slice(0, 3) };
}

/**
 * Apply admin-selected volunteer IDs (ordered) onto a needs_decision result
 * until Top 3 is clear, or the next tie appears.
 */
export function applyPodiumDecision(
  resolution: Extract<PodiumResolution, { status: "needs_decision" }>,
  orderedVolunteerIds: string[],
): PodiumResolution {
  const unique = [...new Set(orderedVolunteerIds)];
  if (unique.length !== orderedVolunteerIds.length) {
    throw new Error("DUPLICATE_PODIUM_SELECTION");
  }
  if (unique.length !== resolution.slotsToFill) {
    throw new Error("INVALID_PODIUM_SELECTION_COUNT");
  }

  const byId = new Map(
    resolution.tieGroup.map((entry) => [entry.volunteerId, entry]),
  );
  const chosen: RankedVolunteer[] = [];
  for (const id of unique) {
    const entry = byId.get(id);
    if (!entry) throw new Error("INVALID_PODIUM_SELECTION");
    chosen.push(entry);
  }

  const merged = [...resolution.lockedPrefix, ...chosen];
  if (merged.length >= 3) {
    return { status: "clear", top3: merged.slice(0, 3) };
  }

  // Continue resolving only the remainder — keep the ordered prefix fixed
  // so previously decided ties are not regrouped.
  const used = new Set(merged.map((entry) => entry.volunteerId));
  const rest = resolution.ranking.filter(
    (entry) => !used.has(entry.volunteerId),
  );
  const restResolution = resolvePodium(rest);
  if (restResolution.status === "clear") {
    return {
      status: "clear",
      top3: [...merged, ...restResolution.top3].slice(0, 3),
    };
  }
  return {
    status: "needs_decision",
    lockedPrefix: [...merged, ...restResolution.lockedPrefix],
    tieGroup: restResolution.tieGroup,
    slotsToFill: restResolution.slotsToFill,
    ranking: resolution.ranking,
  };
}

export function mapMonthlyLeaderboardRows(
  rows: Array<{
    volunteer_id: string;
    full_name: string;
    points: number;
    completed_count: number;
    rank: number | string;
  }>,
): RankedVolunteer[] {
  return rows.map((row) => ({
    volunteerId: row.volunteer_id,
    name: row.full_name,
    points: Number(row.points) || 0,
    completedCount: Number(row.completed_count) || 0,
    rank: Number(row.rank) || 0,
  }));
}

export function isValidYearMonth(value: string): boolean {
  if (!/^\d{4}-\d{2}$/.test(value)) return false;
  const month = Number(value.slice(5, 7));
  return month >= 1 && month <= 12;
}

function isStrictlyBetter(a: RankedVolunteer, b: RankedVolunteer): boolean {
  if (a.points !== b.points) return a.points > b.points;
  return a.completedCount > b.completedCount;
}

/**
 * Validate an admin-ordered Top 3 selection against monthly ranking scores.
 * - 1–3 unique volunteers from the ranking
 * - Must not reverse a strict score ordering
 * - Must only include volunteers eligible for the podium
 *   (fewer than 3 people are strictly better)
 */
export function validatePodiumSelection(
  ranking: RankedVolunteer[],
  orderedVolunteerIds: string[],
): RankedVolunteer[] {
  if (orderedVolunteerIds.length < 1 || orderedVolunteerIds.length > 3) {
    throw new Error("INVALID_PODIUM_SELECTION_COUNT");
  }
  if (new Set(orderedVolunteerIds).size !== orderedVolunteerIds.length) {
    throw new Error("DUPLICATE_PODIUM_SELECTION");
  }

  const byId = new Map(ranking.map((entry) => [entry.volunteerId, entry]));
  const selected: RankedVolunteer[] = [];
  for (const id of orderedVolunteerIds) {
    const entry = byId.get(id);
    if (!entry) throw new Error("INVALID_PODIUM_SELECTION");
    selected.push(entry);
  }

  for (let i = 0; i < selected.length; i += 1) {
    for (let j = i + 1; j < selected.length; j += 1) {
      if (isStrictlyBetter(selected[j]!, selected[i]!)) {
        throw new Error("PODIUM_ORDER_VIOLATES_SCORES");
      }
    }
  }

  for (const pick of selected) {
    const betterCount = ranking.filter((entry) =>
      isStrictlyBetter(entry, pick),
    ).length;
    if (betterCount >= 3) {
      throw new Error("PODIUM_NOT_ELIGIBLE");
    }
  }

  return selected;
}
