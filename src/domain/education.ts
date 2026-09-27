import { blankToNull, DraftResult, endDateFromDraft, nullToBlank, PeriodDraft, requiredError } from './draft';

/** Contract § Education (path segment `educations`). */
export interface Education {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy: string | null;
  startDate: string;
  endDate: string | null;
}

export type EducationInput = Omit<Education, 'id'>;

export interface EducationDraft extends PeriodDraft {
  institution: string;
  degree: string;
  fieldOfStudy: string;
}

export function emptyEducationDraft(): EducationDraft {
  return { institution: '', degree: '', fieldOfStudy: '', startDate: '', endDate: '', current: false };
}

export function toEducationDraft(education: Education): EducationDraft {
  return {
    institution: education.institution,
    degree: education.degree,
    fieldOfStudy: nullToBlank(education.fieldOfStudy),
    startDate: education.startDate,
    endDate: nullToBlank(education.endDate),
    current: education.endDate === null,
  };
}

export function fromEducationDraft(draft: EducationDraft): DraftResult<EducationInput> {
  const end = endDateFromDraft(draft);
  const errors = [
    ...requiredError('Institution', draft.institution),
    ...requiredError('Degree', draft.degree),
    ...requiredError('Start date', draft.startDate),
    ...(end.ok ? [] : [end.error]),
  ];
  if (!end.ok || errors.length > 0) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    value: {
      institution: draft.institution,
      degree: draft.degree,
      fieldOfStudy: blankToNull(draft.fieldOfStudy),
      startDate: draft.startDate,
      endDate: end.endDate,
    },
  };
}
