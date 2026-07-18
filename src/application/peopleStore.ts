import { create } from 'zustand';
import { Person, PersonInput } from '../domain/person';
import { PersonRepository } from '../domain/ports';

/**
 * Application layer for the people resource. The store only speaks to the
 * PersonRepository port — inject a fake in tests, the HTTP adapter in the
 * composition root (src/store.ts). Future section stores (experiences,
 * educations, …) follow this same factory shape.
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
  savePerson: (input: PersonInput, id?: string) => Promise<Person>;
  removePerson: (id: string) => Promise<void>;
}

function upsert(people: Person[], person: Person): Person[] {
  const exists = people.some((candidate) => candidate.id === person.id);
  return exists
    ? people.map((candidate) => (candidate.id === person.id ? person : candidate))
    : [...people, person];
}

export function createPeopleStore(repository: PersonRepository) {
  return create<PeopleState>()((set, get) => ({
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

    savePerson: async (input, id) => {
      const saved = id ? await repository.update(id, input) : await repository.create(input);
      set({ people: upsert(get().people, saved), selectedPerson: saved });
      return saved;
    },

    removePerson: async (id) => {
      await repository.remove(id);
      set((state) => ({
        people: state.people.filter((person) => person.id !== id),
        selectedPerson: state.selectedPerson?.id === id ? null : state.selectedPerson,
      }));
    },
  }));
}

export type PeopleStore = ReturnType<typeof createPeopleStore>;
