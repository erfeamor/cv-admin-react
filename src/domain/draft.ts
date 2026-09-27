/**
 * Form drafts vs. inputs. Forms edit a *draft* (every field a string, plus
 * the explicit "current" flag); the API receives an *input* where optional
 * blanks are null (contract rule 7 — never '') and endDate null means
 * "current" (rule 3). The `from…Draft` helpers are the only bridge.
 */
export type DraftResult<T> = { ok: true; value: T } | { ok: false; errors: string[] };

export interface PeriodDraft {
  startDate: string;
  endDate: string;
  current: boolean;
}

export const END_DATE_REQUIRED = 'End date is required unless "Current" is checked.';

export function blankToNull(value: string): string | null {
  return value.trim() === '' ? null : value;
}

export function nullToBlank(value: string | null): string {
  return value ?? '';
}

/**
 * "Current" is an explicit decision (T-301 H1): checked → endDate null;
 * unchecked with a blank end date is a validation error, so a forgotten
 * field can never claim "ongoing".
 */
export function endDateFromDraft(
  draft: PeriodDraft,
): { ok: true; endDate: string | null } | { ok: false; error: string } {
  if (draft.current) {
    return { ok: true, endDate: null };
  }
  const endDate = blankToNull(draft.endDate);
  return endDate === null ? { ok: false, error: END_DATE_REQUIRED } : { ok: true, endDate };
}

export function requiredError(label: string, value: string): string[] {
  return value.trim() === '' ? [`${label} is required.`] : [];
}
