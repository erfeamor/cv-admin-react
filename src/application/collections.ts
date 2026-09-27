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

/**
 * A write attempted while the list is still loading. The pages disable their
 * forms and write buttons during a load, so this surfaces a UI bug rather than
 * racing the load: the write is never sent.
 */
export class LoadInFlightError extends Error {
  constructor() {
    super('The list is still loading — try again once it has loaded.');
    this.name = 'LoadInFlightError';
  }
}

/**
 * Writes that change a list without re-reading it (a delete, an in-place
 * update) record their effect here, stamped with the read counter at the
 * moment they settled. A read issued at or before that stamp may have been
 * answered before the write committed, so when it lands the effect is
 * re-applied to its rows. Effects older than a landed read are pruned.
 */
export function createPendingEffects<T>() {
  let effects: { settledAt: number; apply: (items: T[]) => T[] }[] = [];
  return {
    record(settledAt: number, apply: (items: T[]) => T[]) {
      effects.push({ settledAt, apply });
    },
    /** Rows of read `read` with every effect that settled after it went out. */
    land(read: number, items: T[]): T[] {
      effects = effects.filter((effect) => effect.settledAt >= read);
      return effects.reduce((rows, effect) => effect.apply(rows), items);
    },
    clear() {
      effects = [];
    },
  };
}
