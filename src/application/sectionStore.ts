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
 * Races: only the newest load settles `loading`/`error`, only the newest
 * read (load or post-write re-read) sets the rows, and a write that settles
 * after the page moved to another person leaves that person's list alone.
 * Any later successful write or read clears `notice`.
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
    // Two sequences: `latestLoad` decides who settles `loading`/`error` (only
    // the newest load), `latestRead` decides whose rows land (the newest read
    // of any kind — a write's re-read is newer than an in-flight load's).
    let latestLoad = 0;
    let latestRead = 0;

    const isCurrent = (personId: string) => get().personId === personId;

    async function readList(personId: string): Promise<{ read: number; items?: TEntity[]; err?: unknown }> {
      const read = ++latestRead;
      try {
        return { read, items: await repository.list(personId) };
      } catch (err) {
        return { read, err };
      }
    }

    async function refreshAfterWrite(personId: string) {
      const { read, items } = await readList(personId);
      if (read !== latestRead || !isCurrent(personId)) {
        return;
      }
      set(items ? { items, notice: null } : { notice: REFRESH_NOTICE });
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
        const load = ++latestLoad;
        set({ personId, items: isCurrent(personId) ? get().items : [], loading: true, error: null, notice: null });
        const { read, items, err } = await readList(personId);
        if (load !== latestLoad || !isCurrent(personId)) {
          return;
        }
        const rowsAreLatest = read === latestRead;
        if (items) {
          set({ loading: false, ...(rowsAreLatest ? { items } : {}) });
        } else {
          set({ loading: false, error: (err as Error).message });
        }
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
          await refreshAfterWrite(personId);
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
          set((state) => ({ items: state.items.filter((item) => item.id !== id), notice: null }));
        }
      },
    };
  });
}

export type SectionStore<TEntity extends { id: string }, TInput> = ReturnType<
  typeof createSectionStore<TEntity, TInput>
>;
