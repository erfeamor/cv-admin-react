import { Person, PersonInput } from './person';

/**
 * Port every section resource repository implements. The API contract
 * (docs/api-contract.md in the meta repo) gives all person-scoped sections
 * (experiences, educations, projects) the same CRUD verb set, so new sections
 * add an entity type plus an adapter implementing this port — the application
 * and presentation layers stay unchanged.
 */
export interface CrudRepository<TEntity, TInput> {
  list(): Promise<TEntity[]>;
  get(id: string): Promise<TEntity>;
  create(input: TInput): Promise<TEntity>;
  update(id: string, input: TInput): Promise<TEntity>;
  remove(id: string): Promise<void>;
}

export type PersonRepository = CrudRepository<Person, PersonInput>;
