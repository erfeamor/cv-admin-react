import { blankToNull, DraftResult, requiredError } from './draft';

/** Contract § Skills. The catalog is global; assignments are person-scoped. */
export interface Skill {
  id: string;
  name: string;
  category: string | null;
}

export type SkillInput = Omit<Skill, 'id'>;

export const PROFICIENCIES = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'] as const;

export type Proficiency = (typeof PROFICIENCIES)[number];

/** One element of GET /people/{id}/skills — also the PUT response shape. */
export interface PersonSkill {
  skillId: string;
  name: string;
  category: string | null;
  proficiency: Proficiency;
}

/** Form draft for a new catalog skill; category is optional (blank → null). */
export interface SkillDraft {
  name: string;
  category: string;
}

export function emptySkillDraft(): SkillDraft {
  return { name: '', category: '' };
}

export function fromSkillDraft(draft: SkillDraft): DraftResult<SkillInput> {
  const errors = requiredError('Skill name', draft.name);
  return errors.length > 0
    ? { ok: false, errors }
    : { ok: true, value: { name: draft.name, category: blankToNull(draft.category) } };
}

/** Form draft for an assignment; skillId is '' until a catalog skill is picked. */
export interface SkillAssignmentDraft {
  skillId: string;
  proficiency: Proficiency;
}
