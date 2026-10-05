import { create } from 'zustand';
import { Person, PersonInput } from '../domain/person';
import { errorStatus } from '../domain/errors';
import { PersonRepository } from '../domain/ports';
import { upsertBy } from './collections';

/**
 * Application layer for the people resource. The store only speaks to the
 * PersonRepository port — inject a fake in tests, the HTTP adapter in the
 * composition root (src/store.ts). The person-scoped sections do not reuse
 * this shape: they go through createSectionStore (sectionStore.ts) over the
 * SectionRepository port, and skills through createSkillsStore.
 *
 * Error handling split: read paths (loadPeople/selectPerson) record failures
 * in `error` for the page to render; write paths (savePerson/removePerson)
 * throw so the calling form owns the failure.
 */
export interface PeopleState {
  people: Person[];
  selectedPerson: Person | null;
  loading: boolean;
  error: string | null;
  loadPeople: () => Promise<void>;
  selectPerson: (id: string) => Promise<void>;
  clearSelection: () => void;
  /**
   * Create (no id) or update. An update sends `version`, the one the form was
   * built from (contract rule 8): a 409 (stale) is rethrown untouched, never
   * retried; a 404 (deleted meanwhile) drops the person, then rethrows. The
   * saved person, with the server's new version, replaces the stored one.
   */
  savePerson: (input: PersonInput, id?: string, version?: number) => Promise<Person>;
  removePerson: (id: string) => Promise<void>;
}

export function createPeopleStore(repository: PersonRepository) {
  return create<PeopleState>()((set, get) => {
    function dropPerson(id: string) {
      set((state) => ({
        people: state.people.filter((person) => person.id !== id),
        selectedPerson: state.selectedPerson?.id === id ? null : state.selectedPerson,
      }));
    }

    return {
      people: [],
      selectedPerson: null,
      loading: false,
      error: null,

      loadPeople: async () => {
        set({ loading: true, error: null });
        try {
          set({ people: await repository.list(), loading: false });
        } catch (err) {
          set({ error: (err as Error).message, loading: false });
        }
      },

      // Preload: serve the already-listed person instantly so forms render
      // populated, then refresh from the repository as the source of truth.
      selectPerson: async (id) => {
        const cached = get().people.find((person) => person.id === id) ?? null;
        set({ selectedPerson: cached, loading: !cached, error: null });
        try {
          set({ selectedPerson: await repository.get(id), loading: false });
        } catch (err) {
          set({ error: (err as Error).message, loading: false });
        }
      },

      clearSelection: () => set({ selectedPerson: null, error: null }),

      savePerson: async (input, id, version) => {
        let saved: Person;
        try {
          saved = id ? await repository.update(id, input, version) : await repository.create(input);
        } catch (err) {
          if (id && errorStatus(err) === 404) {
            dropPerson(id);
          }
          throw err;
        }
        set({ people: upsertBy(get().people, saved, 'id'), selectedPerson: saved });
        return saved;
      },

      removePerson: async (id) => {
        await repository.remove(id);
        dropPerson(id);
      },
    };
  });
}

export type PeopleStore = ReturnType<typeof createPeopleStore>;
