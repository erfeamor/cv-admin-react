import { blankToNull, DraftResult, endDateFromDraft, nullToBlank, PeriodDraft, requiredError } from './draft';

/** Contract § Experience. Optional fields are always present, null when empty (rule 7). */
export interface Experience {
  id: string;
  company: string;
  role: string;
  location: string | null;
  startDate: string;
  endDate: string | null;
  description: string | null;
  /**
   * Optimistic-concurrency token (contract rule 8): 0 on create, bumped by every
   * successful PUT. Optional because a pre-T-113 server does not send it.
   */
  version?: number;
}

/** Form-owned fields: what POST and PUT send. The version travels beside it, on update only. */
export type ExperienceInput = Omit<Experience, 'id' | 'version'>;

export interface ExperienceDraft extends PeriodDraft {
  company: string;
  role: string;
  location: string;
  description: string;
}

export function emptyExperienceDraft(): ExperienceDraft {
  return { company: '', role: '', location: '', startDate: '', endDate: '', current: false, description: '' };
}

export function toExperienceDraft(experience: Experience): ExperienceDraft {
  return {
    company: experience.company,
    role: experience.role,
    location: nullToBlank(experience.location),
    startDate: experience.startDate,
    endDate: nullToBlank(experience.endDate),
    current: experience.endDate === null,
    description: nullToBlank(experience.description),
  };
}

export function fromExperienceDraft(draft: ExperienceDraft): DraftResult<ExperienceInput> {
  const end = endDateFromDraft(draft);
  const errors = [
    ...requiredError('Company', draft.company),
    ...requiredError('Role', draft.role),
    ...requiredError('Start date', draft.startDate),
    ...(end.ok ? [] : [end.error]),
  ];
  if (!end.ok || errors.length > 0) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    value: {
      company: draft.company,
      role: draft.role,
      location: blankToNull(draft.location),
      startDate: draft.startDate,
      endDate: end.endDate,
      description: blankToNull(draft.description),
    },
  };
}
