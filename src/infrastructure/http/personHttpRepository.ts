import { Person, PersonInput } from '../../domain/person';
import { PersonRepository } from '../../domain/ports';
import { HttpClient } from './httpClient';

// The domain service serializes ids as JSON numbers (Java Long). The domain
// speaks string ids (they travel through URLs), so this adapter owns the
// translation — nothing above it may see a numeric id.
type PersonDto = Omit<Person, 'id'> & { id: number | string };

function toPerson(dto: PersonDto): Person {
  return { ...dto, id: String(dto.id) };
}

export function createPersonHttpRepository(client: HttpClient): PersonRepository {
  return {
    list: async () => (await client.request<PersonDto[]>('/api/v1/people')).map(toPerson),
    get: async (id) => toPerson(await client.request<PersonDto>(`/api/v1/people/${id}`)),
    create: async (input: PersonInput) =>
      toPerson(
        await client.request<PersonDto>('/api/v1/people', {
          method: 'POST',
          body: JSON.stringify(input),
        }),
      ),
    update: async (id, input: PersonInput) =>
      toPerson(
        await client.request<PersonDto>(`/api/v1/people/${id}`, {
          method: 'PUT',
          body: JSON.stringify(input),
        }),
      ),
    remove: (id) =>
      client.request<null>(`/api/v1/people/${id}`, { method: 'DELETE' }).then(() => undefined),
  };
}
