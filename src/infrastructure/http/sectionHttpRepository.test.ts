import { ExperienceInput } from '../../domain/experience';
import { createHttpClient, HttpError } from './httpClient';
import {
  createEducationHttpRepository,
  createExperienceHttpRepository,
  createProjectHttpRepository,
} from './sectionHttpRepository';

const client = (token: string | null = 'test-token') => createHttpClient('', () => token);

function respond(status: number, body?: unknown) {
  return jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => (body === undefined ? '' : typeof body === 'string' ? body : JSON.stringify(body)),
  });
}

function lastCall() {
  const calls = (global.fetch as jest.Mock).mock.calls;
  const [url, options] = calls[calls.length - 1];
  return { url: url as string, options: options as RequestInit & { headers: Record<string, string> } };
}

const experienceInput: ExperienceInput = {
  company: 'ACME',
  role: 'Engineer',
  location: null,
  startDate: '2022-01-01',
  endDate: null,
  description: null,
};

describe('section HTTP repositories', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe.each([
    ['experiences', createExperienceHttpRepository],
    ['educations', createEducationHttpRepository],
    ['projects', createProjectHttpRepository],
  ] as const)('%s', (segment, factory) => {
    const base = `/api/v1/people/7/${segment}`;

    it('lists with GET under the person, the bearer token, ids normalized, order untouched', async () => {
      global.fetch = respond(200, [{ id: 9 }, { id: 3 }]);

      const rows = await factory(client()).list('7');

      expect(rows.map((row) => row.id)).toEqual(['9', '3']);
      expect(lastCall().url).toBe(base);
      expect(lastCall().options.headers.Authorization).toBe('Bearer test-token');
    });

    it('creates with POST (201) and the token', async () => {
      global.fetch = respond(201, { id: 4 });

      // The body shape is section-specific; the verb mapping is what is shared.
      const created = await factory(client()).create('7', {} as never);

      expect(created.id).toBe('4');
      expect(lastCall().url).toBe(base);
      expect(lastCall().options.method).toBe('POST');
      expect(lastCall().options.headers.Authorization).toBe('Bearer test-token');
    });

    it('updates with PUT (200) to the row path and the token', async () => {
      global.fetch = respond(200, { id: 4 });

      await factory(client()).update('7', '4', {} as never);

      expect(lastCall().url).toBe(`${base}/4`);
      expect(lastCall().options.method).toBe('PUT');
      expect(lastCall().options.headers.Authorization).toBe('Bearer test-token');
    });

    it('removes with DELETE and resolves on 204', async () => {
      global.fetch = respond(204);

      await expect(factory(client()).remove('7', '4')).resolves.toBeUndefined();
      expect(lastCall().url).toBe(`${base}/4`);
      expect(lastCall().options.method).toBe('DELETE');
      expect(lastCall().options.headers.Authorization).toBe('Bearer test-token');
    });

    it('surfaces a 404 (PUT racing a DELETE) as HttpError with status and body', async () => {
      global.fetch = respond(404, 'Not found');

      const error = await factory(client()).update('7', '4', {} as never).catch((err: unknown) => err);

      expect(error).toBeInstanceOf(HttpError);
      expect(error).toMatchObject({ status: 404, body: 'Not found' });
    });

    it('surfaces a 400 (validation) as HttpError with status and body', async () => {
      global.fetch = respond(400, { status: 400, error: 'Bad Request' });

      const error = await factory(client()).create('7', {} as never).catch((err: unknown) => err);

      expect(error).toBeInstanceOf(HttpError);
      expect(error).toMatchObject({ status: 400, body: { status: 400, error: 'Bad Request' } });
    });
  });

  it('sends the input verbatim, blank optionals as null (never "")', async () => {
    global.fetch = respond(201, { id: 1, ...experienceInput });

    await createExperienceHttpRepository(client()).create('7', experienceInput);

    const body = JSON.parse(lastCall().options.body as string);
    expect(body).toEqual(experienceInput);
    expect(body.location).toBeNull();
    expect(body.endDate).toBeNull();
    expect(body).not.toHaveProperty('id');
  });
});
