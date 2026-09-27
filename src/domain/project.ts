import { blankToNull, DraftResult, endDateFromDraft, nullToBlank, PeriodDraft, requiredError } from './draft';

/** Contract § Projects. Only `name` is required; startDate is nullable here alone. */
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
    current: project.endDate === null,
  };
}

export function fromProjectDraft(draft: ProjectDraft): DraftResult<ProjectInput> {
  const end = endDateFromDraft(draft);
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
