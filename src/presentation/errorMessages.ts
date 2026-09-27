import { errorDetail, errorStatus } from '../domain/errors';

/**
 * Readable messages for failed writes. Pages see errors only through the
 * domain's structural helpers — never the infrastructure's HttpError class.
 */
export type WriteAction = 'create' | 'update' | 'delete';

export function describeWriteFailure(err: unknown, noun: string, action: WriteAction = 'update'): string {
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
      return `This ${noun} no longer exists — it was probably deleted elsewhere, so it has been removed from the list.`;
    default:
      return `Could not ${action === 'delete' ? 'delete' : 'save'} the ${noun}: ${(err as Error).message}`;
  }
}
