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
