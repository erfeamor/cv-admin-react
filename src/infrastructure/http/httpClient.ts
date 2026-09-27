export interface HttpClient {
  request<T>(path: string, options?: RequestInit): Promise<T>;
}

export class HttpError extends Error {
  readonly status: number;
  /** Parsed JSON when the body is JSON, the raw text otherwise, null when empty/unreadable. */
  readonly body: unknown;

  constructor(path: string, status: number, body: unknown = null) {
    super(`Request to ${path} failed with status ${status}`);
    this.name = 'HttpError';
    this.status = status;
    this.body = body;
  }
}

// The domain service answers 400 with Spring's JSON error body but 404/409
// with plain text, so try JSON and fall back to the text.
async function readErrorBody(response: Response): Promise<unknown> {
  try {
    const text = typeof response.text === 'function' ? await response.text() : '';
    if (!text) {
      return null;
    }
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  } catch {
    return null;
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
        throw new HttpError(path, response.status, await readErrorBody(response));
      }

      if (response.status === 204) {
        return null as T;
      }

      return response.json();
    },
  };
}
