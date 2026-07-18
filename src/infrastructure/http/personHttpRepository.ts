import { Person, PersonInput } from '../../domain/person';
import { PersonRepository } from '../../domain/ports';
import { HttpClient } from './httpClient';

export function createPersonHttpRepository(client: HttpClient): PersonRepository {
  return {
    list: () => client.request<Person[]>('/api/v1/people'),
    get: (id) => client.request<Person>(`/api/v1/people/${id}`),
    create: (input: PersonInput) =>
      client.request<Person>('/api/v1/people', { method: 'POST', body: JSON.stringify(input) }),
    update: (id, input: PersonInput) =>
      client.request<Person>(`/api/v1/people/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
    remove: (id) => client.request<null>(`/api/v1/people/${id}`, { method: 'DELETE' }).then(() => undefined),
  };
}
