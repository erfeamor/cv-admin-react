import { createHttpClient, HttpError } from './httpClient';
import { createPersonHttpRepository } from './personHttpRepository';

describe('personHttpRepository', () => {
  const originalFetch = global.fetch;

  function repositoryWithToken(token: string | null = 'test-token') {
    return createPersonHttpRepository(createHttpClient('', () => token));
  }

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('lists people with the bearer token', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [{ id: '1', fullName: 'Jane Doe', email: 'jane@example.com' }],
    });

    const people = await repositoryWithToken().list();

    expect(people).toHaveLength(1);
    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('/api/v1/people');
    expect(options.headers.Authorization).toBe('Bearer test-token');
  });

  it('omits the Authorization header without a token', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => [] });

    await repositoryWithToken(null).list();

    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(options.headers.Authorization).toBeUndefined();
  });

  it('creates with POST and a JSON body', async () => {
    const input = { fullName: 'Jane Doe', headline: '', email: 'jane@example.com', location: '', summary: '' };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ id: '2', ...input }),
    });

    const created = await repositoryWithToken().create(input);

    expect(created.id).toBe('2');
    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('/api/v1/people');
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual(input);
  });

  it('updates with PUT to the person path', async () => {
    const input = { fullName: 'Jane Smith', headline: '', email: 'jane@example.com', location: '', summary: '' };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: '1', ...input }),
    });

    await repositoryWithToken().update('1', input);

    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('/api/v1/people/1');
    expect(options.method).toBe('PUT');
  });

  it('removes with DELETE and resolves on 204', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 204 });

    await expect(repositoryWithToken().remove('1')).resolves.toBeUndefined();

    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('/api/v1/people/1');
    expect(options.method).toBe('DELETE');
  });

  it('throws HttpError with the status on failure', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404 });

    await expect(repositoryWithToken().get('999')).rejects.toThrow(
      'Request to /api/v1/people/999 failed with status 404',
    );
    await expect(repositoryWithToken().get('999')).rejects.toBeInstanceOf(HttpError);
  });
});
