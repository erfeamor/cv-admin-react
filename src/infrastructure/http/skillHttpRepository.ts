import { PersonSkillRepository, SkillCatalogRepository } from '../../domain/ports';
import { PersonSkill, Skill } from '../../domain/skill';
import { HttpClient } from './httpClient';

type SkillDto = Omit<Skill, 'id'> & { id: number | string };
type PersonSkillDto = Omit<PersonSkill, 'skillId'> & { skillId: number | string };

const toSkill = (dto: SkillDto): Skill => ({ ...dto, id: String(dto.id) });
const toPersonSkill = (dto: PersonSkillDto): PersonSkill => ({ ...dto, skillId: String(dto.skillId) });

export function createSkillCatalogHttpRepository(client: HttpClient): SkillCatalogRepository {
  return {
    list: async () => (await client.request<SkillDto[]>('/api/v1/skills')).map(toSkill),
    create: async (input) =>
      toSkill(await client.request<SkillDto>('/api/v1/skills', { method: 'POST', body: JSON.stringify(input) })),
  };
}

export function createPersonSkillHttpRepository(client: HttpClient): PersonSkillRepository {
  const path = (personId: string) => `/api/v1/people/${personId}/skills`;
  return {
    list: async (personId) => (await client.request<PersonSkillDto[]>(path(personId))).map(toPersonSkill),
    // Contract (T-024): the request body is the proficiency alone; ids travel in the path.
    assign: async (personId, skillId, proficiency) =>
      toPersonSkill(
        await client.request<PersonSkillDto>(`${path(personId)}/${skillId}`, {
          method: 'PUT',
          body: JSON.stringify({ proficiency }),
        }),
      ),
    unassign: (personId, skillId) =>
      client.request<null>(`${path(personId)}/${skillId}`, { method: 'DELETE' }).then(() => undefined),
  };
}
