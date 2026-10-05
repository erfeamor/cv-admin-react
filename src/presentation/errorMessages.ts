import { errorDetail, errorStatus } from '../domain/errors';

/**
 * Readable messages for failed writes. Pages see errors only through the
 * domain's structural helpers — never the infrastructure's HttpError class.
 */
export type WriteAction = 'create' | 'update' | 'delete';

/** The stale-version 409 (contract rule 8), shown by the form with a Reload action. */
export const CHANGED_ELSEWHERE = 'This entry was changed elsewhere.';

/**
 * Two different 409s reach the admin, told apart by the write that drew them:
 * a PUT of a versioned resource (person or section row) answers 409 only when
 * its `version` is stale; the skill catalog's duplicate-name 409 answers a
 * create (POST), which never carries a version — SkillsPage words that one
 * itself. So only an *update*'s 409 means "changed elsewhere".
 */
export function isChangedElsewhere(err: unknown, action: WriteAction): boolean {
  return action === 'update' && errorStatus(err) === 409;
}

/** An update or delete found its row gone (404), so the row leaves the list. */
export function describeDeleted(noun: string): string {
  return `This ${noun} no longer exists — it was probably deleted elsewhere, so it has been removed from the list.`;
}

export function describeWriteFailure(err: unknown, noun: string, action: WriteAction = 'update'): string {
  if (isChangedElsewhere(err, action)) {
    return CHANGED_ELSEWHERE;
  }
  switch (errorStatus(err)) {
    case 400: {
      const detail = errorDetail(err);
      return `The server rejected this ${noun} as invalid (400)${detail ? `: ${detail}` : ''}. Check the required fields and dates.`;
    }
    case 404:
      // A create has no row id: its 404 can only be the person in the path.
      if (action === 'create') {
        return `This person no longer exists — it was probably deleted elsewhere, so the ${noun} could not be saved.`;
      }
      return describeDeleted(noun);
    default:
      return `Could not ${action === 'delete' ? 'delete' : 'save'} the ${noun}: ${(err as Error).message}`;
  }
}
