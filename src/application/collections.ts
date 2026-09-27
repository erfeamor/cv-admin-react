/** Shared, framework-free helpers for the store factories. */

/** Replace the element with the same key in place, or append it. */
export function upsertBy<T, K extends keyof T>(items: T[], item: T, key: K): T[] {
  return items.some((candidate) => candidate[key] === item[key])
    ? items.map((candidate) => (candidate[key] === item[key] ? item : candidate))
    : [...items, item];
}

/** Person-scoped writes must never go out before a person is loaded. */
export function requirePersonId(personId: string | null): string {
  if (personId === null) {
    throw new Error('No person loaded');
  }
  return personId;
}

/** Shown when a write succeeded but the follow-up re-read of the list failed. */
export const REFRESH_NOTICE = 'Saved, but the list could not be refreshed — reload the page to see the server order.';
