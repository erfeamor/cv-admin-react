export interface HttpClient {
  request<T>(path: string, options?: RequestInit): Promise<T>;
}

export class HttpError extends Error {
  readonly status: number;

  constructor(path: string, status: number) {
    super(`Request to ${path} failed with status ${status}`);
    this.name = 'HttpError';
    this.status = status;
  }
}

export function createHttpClient(baseUrl: string, getToken: () => string | null): HttpClient {
  return {
    async request<T>(path: string, options: RequestInit = {}): Promise<T> {
      const token = getToken();
      const response = await fetch(`${baseUrl}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new HttpError(path, response.status);
      }

      if (response.status === 204) {
        return null as T;
      }

      return response.json();
    },
  };
}
