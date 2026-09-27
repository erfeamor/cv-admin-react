import { create } from 'zustand';
import { errorStatus } from '../domain/errors';
import { PersonSkillRepository, SkillCatalogRepository } from '../domain/ports';
import { PersonSkill, Proficiency, Skill, SkillInput } from '../domain/skill';

/**
 * Application layer for skills: the global catalog plus one person's
 * assignments. Same error split as the other stores (`load` records, writes
 * throw). Both lists stay in server order — after a write that can move a
 * row, the list is re-read rather than sorted here.
 */
export interface SkillsState {
  personId: string | null;
  catalog: Skill[];
  assignments: PersonSkill[];
  loading: boolean;
  error: string | null;
  load: (personId: string) => Promise<void>;
  createSkill: (input: SkillInput) => Promise<Skill>;
  assign: (skillId: string, proficiency: Proficiency) => Promise<PersonSkill>;
  unassign: (skillId: string) => Promise<void>;
}

export function createSkillsStore(catalogRepository: SkillCatalogRepository, personSkillRepository: PersonSkillRepository) {
  return create<SkillsState>()((set, get) => {
    function requirePerson(): string {
      const { personId } = get();
      if (personId === null) {
        throw new Error('No person loaded');
      }
      return personId;
    }

    function drop(skillId: string) {
      set((state) => ({ assignments: state.assignments.filter((entry) => entry.skillId !== skillId) }));
    }

    function recordError(personId: string, err: unknown) {
      if (get().personId === personId) {
        set({ error: (err as Error).message, loading: false });
      }
    }

    return {
      personId: null,
      catalog: [],
      assignments: [],
      loading: false,
      error: null,

      load: async (personId) => {
        const samePerson = get().personId === personId;
        set({ personId, assignments: samePerson ? get().assignments : [], loading: true, error: null });
        try {
          const [catalog, assignments] = await Promise.all([
            catalogRepository.list(),
            personSkillRepository.list(personId),
          ]);
          if (get().personId === personId) {
            set({ catalog, assignments, loading: false });
          }
        } catch (err) {
          recordError(personId, err);
        }
      },

      createSkill: async (input) => {
        const created = await catalogRepository.create(input);
        // Optimistic append, then the server's name order.
        set((state) => ({ catalog: [...state.catalog, created] }));
        try {
          set({ catalog: await catalogRepository.list() });
        } catch (err) {
          set({ error: (err as Error).message });
        }
        return created;
      },

      assign: async (skillId, proficiency) => {
        const personId = requirePerson();
        const assigned = await personSkillRepository.assign(personId, skillId, proficiency);
        const exists = get().assignments.some((entry) => entry.skillId === skillId);
        if (exists) {
          // PUT is an upsert: an existing assignment keeps its place.
          set((state) => ({
            assignments: state.assignments.map((entry) => (entry.skillId === skillId ? assigned : entry)),
          }));
          return assigned;
        }
        set((state) => ({ assignments: [...state.assignments, assigned] }));
        try {
          const assignments = await personSkillRepository.list(personId);
          if (get().personId === personId) {
            set({ assignments });
          }
        } catch (err) {
          recordError(personId, err);
        }
        return assigned;
      },

      unassign: async (skillId) => {
        const personId = requirePerson();
        try {
          await personSkillRepository.unassign(personId, skillId);
        } catch (err) {
          // 404: nothing assigned server-side, so the entry shown is stale.
          if (errorStatus(err) === 404) {
            drop(skillId);
          }
          throw err;
        }
        drop(skillId);
      },
    };
  });
}

export type SkillsStore = ReturnType<typeof createSkillsStore>;
