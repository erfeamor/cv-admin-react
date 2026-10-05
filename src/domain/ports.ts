import { Education, EducationInput } from './education';
import { Experience, ExperienceInput } from './experience';
import { Person, PersonInput } from './person';
import { Project, ProjectInput } from './project';
import { PersonSkill, Proficiency, Skill, SkillInput } from './skill';

/** Port for the top-level people resource. */
export interface CrudRepository<TEntity, TInput> {
  list(): Promise<TEntity[]>;
  get(id: string): Promise<TEntity>;
  create(input: TInput): Promise<TEntity>;
  /** `version` is the one the edit was based on (contract rule 8); undefined → omitted from the request. */
  update(id: string, input: TInput, version: number | undefined): Promise<TEntity>;
  remove(id: string): Promise<void>;
}

export type PersonRepository = CrudRepository<Person, PersonInput>;

/**
 * Port every person-scoped section (experiences, educations, projects)
 * implements. It is not CrudRepository: the contract nests each section under
 * `/people/{personId}` and gives it no `GET /{id}`, so every verb takes the
 * person and there is no `get`. Rows come back in server order (contract
 * § Ordering) — callers must not re-sort.
 */
export interface SectionRepository<TEntity, TInput> {
  list(personId: string): Promise<TEntity[]>;
  create(personId: string, input: TInput): Promise<TEntity>;
  /** `version` is the one the edit was based on (contract rule 8); undefined → omitted from the request. */
  update(personId: string, id: string, input: TInput, version: number | undefined): Promise<TEntity>;
  remove(personId: string, id: string): Promise<void>;
}

export type ExperienceRepository = SectionRepository<Experience, ExperienceInput>;
export type EducationRepository = SectionRepository<Education, EducationInput>;
export type ProjectRepository = SectionRepository<Project, ProjectInput>;

/** Global skill catalog: list (name order) and create (duplicate name → 409). */
export interface SkillCatalogRepository {
  list(): Promise<Skill[]>;
  create(input: SkillInput): Promise<Skill>;
}

/** Person ↔ skill assignments: PUT is an upsert, DELETE of an unassigned skill → 404. */
export interface PersonSkillRepository {
  list(personId: string): Promise<PersonSkill[]>;
  assign(personId: string, skillId: string, proficiency: Proficiency): Promise<PersonSkill>;
  unassign(personId: string, skillId: string): Promise<void>;
}
