/**
 * Test-only fetch double for page tests: route each request by method and
 * path (origin stripped) to a status + body. Unrouted requests answer 500 so
 * a missing mock fails loudly instead of hanging.
 */
export interface FakeResponse {
  status: number;
  body?: unknown;
}

export type FetchRoute = (method: string, path: string) => FakeResponse | undefined;

export interface RecordedRequest {
  method: string;
  path: string;
  headers: Record<string, string>;
  body: unknown;
}

export function mockFetch(route: FetchRoute): jest.Mock {
  const mock = jest.fn(async (url: string, init: RequestInit = {}) => {
    const method = init.method ?? 'GET';
    const path = url.replace(/^https?:\/\/[^/]+/, '');
    const response = route(method, path) ?? { status: 500, body: `unmocked ${method} ${path}` };
    const text = response.body === undefined ? '' : typeof response.body === 'string' ? response.body : JSON.stringify(response.body);
    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      json: async () => response.body,
      text: async () => text,
    };
  });
  global.fetch = mock as unknown as typeof fetch;
  return mock;
}

export function recordedRequests(mock: jest.Mock, method?: string): RecordedRequest[] {
  return mock.mock.calls
    .map(([url, init = {}]: [string, RequestInit?]) => ({
      method: init.method ?? 'GET',
      path: url.replace(/^https?:\/\/[^/]+/, ''),
      headers: (init.headers ?? {}) as Record<string, string>,
      body: typeof init.body === 'string' ? JSON.parse(init.body) : undefined,
    }))
    .filter((request) => method === undefined || request.method === method);
}
