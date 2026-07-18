// ?? not ||: the deployed build sets this to the empty string on purpose, so
// requests go same-origin through CloudFront's /api/* behavior.
const DOMAIN_SERVICE_URL = import.meta.env.VITE_DOMAIN_SERVICE_URL ?? 'http://localhost:8080';

export interface Person {
  id: string;
  fullName: string;
  headline?: string;
  email: string;
  location?: string;
  summary?: string;
}

export type PersonInput = Omit<Person, 'id'>;

interface RequestOptions extends Omit<RequestInit, 'headers'> {
  token?: string | null;
  headers?: HeadersInit;
}

async function request<T>(path: string, { token, ...options }: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${DOMAIN_SERVICE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Request to ${path} failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json();
}

export const peopleApi = {
  list: (token?: string | null) => request<Person[]>('/api/v1/people', { token }),
  get: (id: string, token?: string | null) => request<Person>(`/api/v1/people/${id}`, { token }),
  create: (person: PersonInput, token?: string | null) =>
    request<Person>('/api/v1/people', { method: 'POST', body: JSON.stringify(person), token }),
  update: (id: string, person: PersonInput, token?: string | null) =>
    request<Person>(`/api/v1/people/${id}`, { method: 'PUT', body: JSON.stringify(person), token }),
  remove: (id: string, token?: string | null) =>
    request<null>(`/api/v1/people/${id}`, { method: 'DELETE', token }),
};
