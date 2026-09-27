import { blankToNull, DraftResult, endDateFromDraft, nullToBlank, PeriodDraft, requiredError } from './draft';

/**
 * Contract § Projects. Only `name` is required; startDate is nullable here
 * alone. PO correction of the H1 "current" rule for projects (review round 1):
 * a project with neither date is *undated*, not current — both public sites
 * render it with no date line — so the explicit Current decision is only
 * demanded once a start date is given.
 */
export interface Project {
  id: string;
  name: string;
  description: string | null;
  repoUrl: string | null;
  startDate: string | null;
  endDate: string | null;
}

export type ProjectInput = Omit<Project, 'id'>;

export interface ProjectDraft extends PeriodDraft {
  name: string;
  description: string;
  repoUrl: string;
}

export function emptyProjectDraft(): ProjectDraft {
  return { name: '', description: '', repoUrl: '', startDate: '', endDate: '', current: false };
}

export function toProjectDraft(project: Project): ProjectDraft {
  return {
    name: project.name,
    description: nullToBlank(project.description),
    repoUrl: nullToBlank(project.repoUrl),
    startDate: nullToBlank(project.startDate),
    endDate: nullToBlank(project.endDate),
    // Undated (both null) is not "current": only a dated project pre-checks it.
    current: project.startDate !== null && project.endDate === null,
  };
}

export const CURRENT_NEEDS_START = 'A current project needs a start date.';

function projectEndDate(draft: ProjectDraft): { ok: true; endDate: string | null } | { ok: false; error: string } {
  const undated = blankToNull(draft.startDate) === null;
  if (undated && draft.current) {
    // Would be saved as both-null and read back as undated, silently losing "current".
    return { ok: false, error: CURRENT_NEEDS_START };
  }
  if (undated) {
    return { ok: true, endDate: blankToNull(draft.endDate) };
  }
  return endDateFromDraft(draft);
}

export function fromProjectDraft(draft: ProjectDraft): DraftResult<ProjectInput> {
  const end = projectEndDate(draft);
  const errors = [...requiredError('Name', draft.name), ...(end.ok ? [] : [end.error])];
  if (!end.ok || errors.length > 0) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    value: {
      name: draft.name,
      description: blankToNull(draft.description),
      repoUrl: blankToNull(draft.repoUrl),
      startDate: blankToNull(draft.startDate),
      endDate: end.endDate,
    },
  };
}
