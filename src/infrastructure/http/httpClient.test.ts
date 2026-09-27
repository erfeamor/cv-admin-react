import { createHttpClient, HttpError } from './httpClient';

describe('httpClient errors', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  const client = createHttpClient('', () => 'test-token');

  it('carries a JSON error body parsed on the HttpError', async () => {
    const problem = { status: 400, error: 'Bad Request', path: '/api/v1/skills' };
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 400, text: async () => JSON.stringify(problem) });

    const error = await client.request('/api/v1/skills').catch((err: unknown) => err);

    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).status).toBe(400);
    expect((error as HttpError).body).toEqual(problem);
  });

  it('keeps a plain-text error body as a string (the domain answers 404 as text)', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404, text: async () => 'Not found' });

    const error = (await client.request('/x').catch((err: unknown) => err)) as HttpError;

    expect(error.status).toBe(404);
    expect(error.body).toBe('Not found');
    expect(error.message).toBe('Request to /x failed with status 404');
  });

  it('tolerates an unreadable or empty error body', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 });

    const error = (await client.request('/x').catch((err: unknown) => err)) as HttpError;

    expect(error.status).toBe(500);
    expect(error.body).toBeNull();
  });
});
