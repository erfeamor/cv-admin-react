import { Education, EducationInput } from '../../domain/education';
import { Experience, ExperienceInput } from '../../domain/experience';
import { EducationRepository, ExperienceRepository, ProjectRepository, SectionRepository } from '../../domain/ports';
import { Project, ProjectInput } from '../../domain/project';
import { HttpClient } from './httpClient';

// Contract path segments — note `educations`, not `education`.
type SectionSegment = 'experiences' | 'educations' | 'projects';

// The domain service serializes ids as JSON numbers (Java Long); the domain
// speaks strings. Same translation as personHttpRepository.
type Dto<TEntity extends { id: string }> = Omit<TEntity, 'id'> & { id: number | string };

function createSectionHttpRepository<TEntity extends { id: string }, TInput>(
  client: HttpClient,
  segment: SectionSegment,
): SectionRepository<TEntity, TInput> {
  const collection = (personId: string) => `/api/v1/people/${personId}/${segment}`;
  const toEntity = (dto: Dto<TEntity>) => ({ ...dto, id: String(dto.id) }) as TEntity;

  return {
    // Server order is the contract (§ Ordering): map, never sort.
    list: async (personId) => (await client.request<Dto<TEntity>[]>(collection(personId))).map(toEntity),
    create: async (personId, input) =>
      toEntity(
        await client.request<Dto<TEntity>>(collection(personId), {
          method: 'POST',
          body: JSON.stringify(input),
        }),
      ),
    update: async (personId, id, input) =>
      toEntity(
        await client.request<Dto<TEntity>>(`${collection(personId)}/${id}`, {
          method: 'PUT',
          body: JSON.stringify(input),
        }),
      ),
    remove: (personId, id) =>
      client.request<null>(`${collection(personId)}/${id}`, { method: 'DELETE' }).then(() => undefined),
  };
}

export const createExperienceHttpRepository = (client: HttpClient): ExperienceRepository =>
  createSectionHttpRepository<Experience, ExperienceInput>(client, 'experiences');

export const createEducationHttpRepository = (client: HttpClient): EducationRepository =>
  createSectionHttpRepository<Education, EducationInput>(client, 'educations');

export const createProjectHttpRepository = (client: HttpClient): ProjectRepository =>
  createSectionHttpRepository<Project, ProjectInput>(client, 'projects');
