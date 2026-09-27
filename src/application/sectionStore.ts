import { create } from 'zustand';
import { errorStatus } from '../domain/errors';
import { SectionRepository } from '../domain/ports';
import { REFRESH_NOTICE, requirePersonId, upsertBy } from './collections';

/**
 * Application layer for a person-scoped section (experiences, educations,
 * projects): one factory, typed per section by its repository port. Wired in
 * the composition root (src/store.ts); inject a fake repository in tests.
 *
 * Same error split as peopleStore: `load` records failures in `error`;
 * `save`/`remove` throw to the calling page. A 404 on a write means the row
 * is gone server-side (e.g. PUT racing a DELETE), so the stale row is dropped
 * before the error is rethrown.
 *
 * Order is the server's (contract § Ordering): after a write the list is
 * re-read rather than sorted here. The saved row is upserted first so it is
 * visible at once and survives a failed re-read (which raises `notice`, not
 * the blocking `error`).
 *
 * Races: every list read takes a sequence number and only the latest may
 * land; a write that settles after the page moved to another person leaves
 * that person's list alone.
 */
export interface SectionState<TEntity extends { id: string }, TInput> {
  personId: string | null;
  items: TEntity[];
  loading: boolean;
  error: string | null;
  /** Non-blocking: a write succeeded but the re-read failed. */
  notice: string | null;
  load: (personId: string) => Promise<void>;
  save: (input: TInput, id?: string) => Promise<TEntity>;
  remove: (id: string) => Promise<void>;
}

export function createSectionStore<TEntity extends { id: string }, TInput>(
  repository: SectionRepository<TEntity, TInput>,
) {
  return create<SectionState<TEntity, TInput>>()((set, get) => {
    let latestRead = 0;

    const isCurrent = (personId: string) => get().personId === personId;

    async function refresh(personId: string, afterWrite: boolean) {
      const read = ++latestRead;
      try {
        const items = await repository.list(personId);
        if (read === latestRead && isCurrent(personId)) {
          set({ items, loading: false, notice: null });
        }
      } catch (err) {
        if (read === latestRead && isCurrent(personId)) {
          set(afterWrite ? { notice: REFRESH_NOTICE, loading: false } : { error: (err as Error).message, loading: false });
        }
      }
    }

    function dropIfGone(err: unknown, personId: string, id: string) {
      if (errorStatus(err) === 404 && isCurrent(personId)) {
        set((state) => ({ items: state.items.filter((item) => item.id !== id) }));
      }
    }

    return {
      personId: null,
      items: [],
      loading: false,
      error: null,
      notice: null,

      load: async (personId) => {
        set({ personId, items: isCurrent(personId) ? get().items : [], loading: true, error: null, notice: null });
        await refresh(personId, false);
      },

      save: async (input, id) => {
        const personId = requirePersonId(get().personId);
        let saved: TEntity;
        try {
          saved = id ? await repository.update(personId, id, input) : await repository.create(personId, input);
        } catch (err) {
          if (id) {
            dropIfGone(err, personId, id);
          }
          throw err;
        }
        if (isCurrent(personId)) {
          set((state) => ({ items: upsertBy(state.items, saved, 'id'), error: null }));
          await refresh(personId, true);
        }
        return saved;
      },

      remove: async (id) => {
        const personId = requirePersonId(get().personId);
        try {
          await repository.remove(personId, id);
        } catch (err) {
          dropIfGone(err, personId, id);
          throw err;
        }
        if (isCurrent(personId)) {
          set((state) => ({ items: state.items.filter((item) => item.id !== id) }));
        }
      },
    };
  });
}

export type SectionStore<TEntity extends { id: string }, TInput> = ReturnType<
  typeof createSectionStore<TEntity, TInput>
>;
