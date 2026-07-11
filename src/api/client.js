const DOMAIN_SERVICE_URL = import.meta.env.VITE_DOMAIN_SERVICE_URL || 'http://localhost:8080';

async function request(path, { token, ...options } = {}) {
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
    return null;
  }

  return response.json();
}

export const peopleApi = {
  list: (token) => request('/api/v1/people', { token }),
  get: (id, token) => request(`/api/v1/people/${id}`, { token }),
  create: (person, token) =>
    request('/api/v1/people', { method: 'POST', body: JSON.stringify(person), token }),
  update: (id, person, token) =>
    request(`/api/v1/people/${id}`, { method: 'PUT', body: JSON.stringify(person), token }),
  remove: (id, token) => request(`/api/v1/people/${id}`, { method: 'DELETE', token }),
};
