import { create } from 'zustand';
import { errorStatus } from '../domain/errors';
import { PersonSkillRepository, SkillCatalogRepository } from '../domain/ports';
import { PersonSkill, Proficiency, Skill, SkillInput } from '../domain/skill';
import { REFRESH_NOTICE, requirePersonId, upsertBy } from './collections';

/**
 * Application layer for skills: the global catalog plus one person's
 * assignments. Same error split as the other stores (`load` records, writes
 * throw). Both lists stay in server order — after a write that can move a
 * row, the list is re-read rather than sorted here; a failed re-read raises
 * the non-blocking `notice`, which any later successful write or read clears.
 * Same race rules as sectionStore: only the newest load settles `loading`,
 * only the newest read of each list lands, and writes settling after a
 * person change are ignored.
 */
export interface SkillsState {
  personId: string | null;
  catalog: Skill[];
  assignments: PersonSkill[];
  loading: boolean;
  error: string | null;
  notice: string | null;
  load: (personId: string) => Promise<void>;
  createSkill: (input: SkillInput) => Promise<Skill>;
  assign: (skillId: string, proficiency: Proficiency) => Promise<PersonSkill>;
  unassign: (skillId: string) => Promise<void>;
}

export function createSkillsStore(catalogRepository: SkillCatalogRepository, personSkillRepository: PersonSkillRepository) {
  return create<SkillsState>()((set, get) => {
    // As in sectionStore: `latestLoad` decides who settles `loading`/`error`;
    // `latestAssignmentsRead` / `latestCatalogRead` decide whose rows land, so
    // a write's re-read never strands an in-flight load (or vice versa).
    let latestLoad = 0;
    let latestAssignmentsRead = 0;
    let latestCatalogRead = 0;

    const isCurrent = (personId: string) => get().personId === personId;

    function drop(skillId: string) {
      set((state) => ({ assignments: state.assignments.filter((entry) => entry.skillId !== skillId) }));
    }

    return {
      personId: null,
      catalog: [],
      assignments: [],
      loading: false,
      error: null,
      notice: null,

      load: async (personId) => {
        const load = ++latestLoad;
        const assignmentsRead = ++latestAssignmentsRead;
        const catalogRead = ++latestCatalogRead;
        set({
          personId,
          assignments: isCurrent(personId) ? get().assignments : [],
          loading: true,
          error: null,
          notice: null,
        });
        try {
          const [catalog, assignments] = await Promise.all([
            catalogRepository.list(),
            personSkillRepository.list(personId),
          ]);
          if (load === latestLoad && isCurrent(personId)) {
            set({
              loading: false,
              ...(catalogRead === latestCatalogRead ? { catalog } : {}),
              ...(assignmentsRead === latestAssignmentsRead ? { assignments } : {}),
            });
          }
        } catch (err) {
          if (load === latestLoad && isCurrent(personId)) {
            set({ error: (err as Error).message, loading: false });
          }
        }
      },

      createSkill: async (input) => {
        const created = await catalogRepository.create(input);
        // Shown at once, and kept if the re-read in the server's name order fails.
        set((state) => ({ catalog: upsertBy(state.catalog, created, 'id') }));
        const read = ++latestCatalogRead;
        try {
          const catalog = await catalogRepository.list();
          if (read === latestCatalogRead) {
            set({ catalog, notice: null });
          }
        } catch {
          if (read === latestCatalogRead) {
            set({ notice: REFRESH_NOTICE });
          }
        }
        return created;
      },

      assign: async (skillId, proficiency) => {
        const personId = requirePersonId(get().personId);
        const assigned = await personSkillRepository.assign(personId, skillId, proficiency);
        if (!isCurrent(personId)) {
          return assigned;
        }
        const exists = get().assignments.some((entry) => entry.skillId === skillId);
        set((state) => ({ assignments: upsertBy(state.assignments, assigned, 'skillId') }));
        if (exists) {
          // PUT is an upsert: an existing assignment keeps its place, no re-read needed.
          set({ notice: null });
          return assigned;
        }
        const read = ++latestAssignmentsRead;
        try {
          const assignments = await personSkillRepository.list(personId);
          if (read === latestAssignmentsRead && isCurrent(personId)) {
            set({ assignments, notice: null });
          }
        } catch {
          if (read === latestAssignmentsRead && isCurrent(personId)) {
            set({ notice: REFRESH_NOTICE });
          }
        }
        return assigned;
      },

      unassign: async (skillId) => {
        const personId = requirePersonId(get().personId);
        try {
          await personSkillRepository.unassign(personId, skillId);
        } catch (err) {
          // 404: nothing assigned server-side, so the entry shown is stale.
          if (errorStatus(err) === 404 && isCurrent(personId)) {
            drop(skillId);
          }
          throw err;
        }
        if (isCurrent(personId)) {
          drop(skillId);
          set({ notice: null });
        }
      },
    };
  });
}

export type SkillsStore = ReturnType<typeof createSkillsStore>;
