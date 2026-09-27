import { create } from 'zustand';
import { errorStatus } from '../domain/errors';
import { SectionRepository } from '../domain/ports';

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
 * re-read rather than sorted here.
 */
export interface SectionState<TEntity extends { id: string }, TInput> {
  personId: string | null;
  items: TEntity[];
  loading: boolean;
  error: string | null;
  load: (personId: string) => Promise<void>;
  save: (input: TInput, id?: string) => Promise<TEntity>;
  remove: (id: string) => Promise<void>;
}

function upsert<TEntity extends { id: string }>(items: TEntity[], item: TEntity): TEntity[] {
  return items.some((candidate) => candidate.id === item.id)
    ? items.map((candidate) => (candidate.id === item.id ? item : candidate))
    : [...items, item];
}

export function createSectionStore<TEntity extends { id: string }, TInput>(
  repository: SectionRepository<TEntity, TInput>,
) {
  return create<SectionState<TEntity, TInput>>()((set, get) => {
    function requirePerson(): string {
      const { personId } = get();
      if (personId === null) {
        throw new Error('No person loaded');
      }
      return personId;
    }

    async function refresh(personId: string) {
      try {
        const items = await repository.list(personId);
        if (get().personId === personId) {
          set({ items, loading: false });
        }
      } catch (err) {
        if (get().personId === personId) {
          set({ error: (err as Error).message, loading: false });
        }
      }
    }

    function dropIfGone(err: unknown, id: string) {
      if (errorStatus(err) === 404) {
        set((state) => ({ items: state.items.filter((item) => item.id !== id) }));
      }
    }

    return {
      personId: null,
      items: [],
      loading: false,
      error: null,

      load: async (personId) => {
        const samePerson = get().personId === personId;
        set({ personId, items: samePerson ? get().items : [], loading: true, error: null });
        await refresh(personId);
      },

      save: async (input, id) => {
        const personId = requirePerson();
        let saved: TEntity;
        try {
          saved = id ? await repository.update(personId, id, input) : await repository.create(personId, input);
        } catch (err) {
          if (id) {
            dropIfGone(err, id);
          }
          throw err;
        }
        // Show the saved row immediately, then take the server's order.
        set((state) => ({ items: upsert(state.items, saved), error: null }));
        await refresh(personId);
        return saved;
      },

      remove: async (id) => {
        const personId = requirePerson();
        try {
          await repository.remove(personId, id);
        } catch (err) {
          dropIfGone(err, id);
          throw err;
        }
        set((state) => ({ items: state.items.filter((item) => item.id !== id) }));
      },
    };
  });
}

export type SectionStore<TEntity extends { id: string }, TInput> = ReturnType<
  typeof createSectionStore<TEntity, TInput>
>;
