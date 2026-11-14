import type { Status } from "@/lib/types";

// A rating at or above this means "I feel good". demo parameter
export const FEEL_GOOD_MIN_RATING = 4;

// A rating at or below this means "I feel unwell". demo parameter
export const FEEL_BAD_MAX_RATING = 2;

export const FEEL_VS_DATA_MESSAGE =
  "Your readings don't match how you feel. Consider re-measuring or adding a symptom note.";

// Compares how the astronaut says they feel (1 to 5) with the statuses from
// this check-in. Returns the message when the two disagree, otherwise null.
export function checkFeelVsData(
  selfRating: number,
  statuses: Status[],
): string | null {
  // With no statuses there is nothing to compare against.
  if (statuses.length === 0) {
    return null;
  }

  const hasAlert = statuses.some(
    (status) => status === "amber" || status === "red",
  );
  // Unknown is not green, so a missing reading never counts as "all clear".
  const isAllGreen = statuses.every((status) => status === "green");

  if (selfRating >= FEEL_GOOD_MIN_RATING && hasAlert) {
    return FEEL_VS_DATA_MESSAGE;
  }
  if (selfRating <= FEEL_BAD_MAX_RATING && isAllGreen) {
    return FEEL_VS_DATA_MESSAGE;
  }
  return null;
}
