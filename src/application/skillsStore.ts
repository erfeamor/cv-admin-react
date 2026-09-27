import { create } from 'zustand';
import { errorStatus } from '../domain/errors';
import { PersonSkillRepository, SkillCatalogRepository } from '../domain/ports';
import { PersonSkill, Proficiency, Skill, SkillInput } from '../domain/skill';
import { LoadInFlightError, REFRESH_NOTICE, requirePersonId, upsertBy } from './collections';

/**
 * Application layer for skills: the global catalog plus one person's
 * assignments. Same error split as the other stores (`load` records, writes
 * throw). Both lists stay in server order — after a write that can move a
 * row, the list is re-read rather than sorted here; a failed re-read raises
 * that list's own non-blocking notice (`catalogNotice` / `assignmentsNotice`),
 * which only a later successful read of the same list clears.
 * Same race rules as sectionStore: writes are refused while `loading`
 * (`LoadInFlightError`), only the newest load settles `loading`, only the
 * newest read of each list sets its rows (or the load's `error`), and writes
 * settling after a person change are ignored.
 */
export interface SkillsState {
  personId: string | null;
  catalog: Skill[];
  assignments: PersonSkill[];
  loading: boolean;
  error: string | null;
  /** Non-blocking: a catalog write succeeded but the catalog re-read failed. */
  catalogNotice: string | null;
  /** Non-blocking: an assignment write succeeded but the assignments re-read failed. */
  assignmentsNotice: string | null;
  load: (personId: string) => Promise<void>;
  createSkill: (input: SkillInput) => Promise<Skill>;
  assign: (skillId: string, proficiency: Proficiency) => Promise<PersonSkill>;
  unassign: (skillId: string) => Promise<void>;
}

export function createSkillsStore(catalogRepository: SkillCatalogRepository, personSkillRepository: PersonSkillRepository) {
  return create<SkillsState>()((set, get) => {
    // As in sectionStore: `latestLoad` decides who settles `loading`;
    // `latestAssignmentsRead` / `latestCatalogRead` decide whose rows (and
    // whose failure) land, since a write started before a load can re-read
    // after it.
    let latestLoad = 0;
    let latestAssignmentsRead = 0;
    let latestCatalogRead = 0;

    const isCurrent = (personId: string) => get().personId === personId;

    // Lists whose read failed in the latest load; `error` clears once a later
    // successful read has covered every one of them.
    let failedLists = new Set<'catalog' | 'assignments'>();

    function readSucceeded(list: 'catalog' | 'assignments') {
      if (failedLists.delete(list) && failedLists.size === 0) {
        set({ error: null });
      }
    }

    /**
     * Assignment writes that do not re-read (unassign, 404 drop, in-place
     * re-assign) supersede any assignments read issued before they settled —
     * the server may have answered it before the write, so landing it would
     * undo the write on screen.
     */
    function supersedeAssignmentsReads() {
      latestAssignmentsRead++;
    }

    function drop(skillId: string) {
      supersedeAssignmentsReads();
      set((state) => ({ assignments: state.assignments.filter((entry) => entry.skillId !== skillId) }));
    }

    function refuseMidLoad() {
      if (get().loading) {
        throw new LoadInFlightError();
      }
    }

    /** The person for an assignment write — refused before any load, and while one is in flight. */
    function writablePersonId(): string {
      const personId = requirePersonId(get().personId);
      refuseMidLoad();
      return personId;
    }

    return {
      personId: null,
      catalog: [],
      assignments: [],
      loading: false,
      error: null,
      catalogNotice: null,
      assignmentsNotice: null,

      load: async (personId) => {
        const load = ++latestLoad;
        const assignmentsRead = ++latestAssignmentsRead;
        const catalogRead = ++latestCatalogRead;
        failedLists = new Set(); // this load clears `error`
        set(
          isCurrent(personId)
            ? { loading: true, error: null }
            : { personId, assignments: [], loading: true, error: null, assignmentsNotice: null },
        );
        const [catalog, assignments] = await Promise.allSettled([
          catalogRepository.list(),
          personSkillRepository.list(personId),
        ]);
        if (load !== latestLoad || !isCurrent(personId)) {
          return;
        }
        // Each list lands only if no newer read of it went out meanwhile; a
        // superseded read's failure is that newer read's business, not `error`.
        const next: Partial<SkillsState> = { loading: false };
        const failures: string[] = [];
        failedLists = new Set();
        if (catalogRead === latestCatalogRead) {
          if (catalog.status === 'fulfilled') {
            Object.assign(next, { catalog: catalog.value, catalogNotice: null });
          } else {
            failures.push((catalog.reason as Error).message);
            failedLists.add('catalog');
          }
        }
        if (assignmentsRead === latestAssignmentsRead) {
          if (assignments.status === 'fulfilled') {
            Object.assign(next, { assignments: assignments.value, assignmentsNotice: null });
          } else {
            failures.push((assignments.reason as Error).message);
            failedLists.add('assignments');
          }
        }
        set(failures.length > 0 ? { ...next, error: failures[0] } : next);
      },

      createSkill: async (input) => {
        refuseMidLoad();
        const created = await catalogRepository.create(input);
        // Shown at once, and kept if the re-read in the server's name order fails.
        set((state) => ({ catalog: upsertBy(state.catalog, created, 'id') }));
        const read = ++latestCatalogRead;
        try {
          const catalog = await catalogRepository.list();
          if (read === latestCatalogRead) {
            set({ catalog, catalogNotice: null });
            readSucceeded('catalog');
          }
        } catch {
          if (read === latestCatalogRead) {
            set({ catalogNotice: REFRESH_NOTICE });
          }
        }
        return created;
      },

      assign: async (skillId, proficiency) => {
        const personId = writablePersonId();
        const assigned = await personSkillRepository.assign(personId, skillId, proficiency);
        if (!isCurrent(personId)) {
          return assigned;
        }
        const exists = get().assignments.some((entry) => entry.skillId === skillId);
        set((state) => ({ assignments: upsertBy(state.assignments, assigned, 'skillId') }));
        if (exists) {
          // PUT is an upsert: an existing assignment keeps its place, no re-read needed.
          supersedeAssignmentsReads();
          return assigned;
        }
        const read = ++latestAssignmentsRead;
        try {
          const assignments = await personSkillRepository.list(personId);
          if (read === latestAssignmentsRead && isCurrent(personId)) {
            set({ assignments, assignmentsNotice: null });
            readSucceeded('assignments');
          }
        } catch {
          if (read === latestAssignmentsRead && isCurrent(personId)) {
            set({ assignmentsNotice: REFRESH_NOTICE });
          }
        }
        return assigned;
      },

      unassign: async (skillId) => {
        const personId = writablePersonId();
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
        }
      },
    };
  });
}

export type SkillsStore = ReturnType<typeof createSkillsStore>;
