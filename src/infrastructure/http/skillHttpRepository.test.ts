import { createHttpClient, HttpError } from './httpClient';
import { createPersonSkillHttpRepository, createSkillCatalogHttpRepository } from './skillHttpRepository';

const client = () => createHttpClient('', () => 'test-token');

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

describe('skill catalog HTTP repository', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('lists the catalog in the order served, ids normalized, with the token', async () => {
    global.fetch = respond(200, [
      { id: 5, name: 'Zig', category: null },
      { id: 2, name: 'Java', category: 'Language' },
    ]);

    const skills = await createSkillCatalogHttpRepository(client()).list();

    expect(skills).toEqual([
      { id: '5', name: 'Zig', category: null },
      { id: '2', name: 'Java', category: 'Language' },
    ]);
    expect(lastCall().url).toBe('/api/v1/skills');
    expect(lastCall().options.headers.Authorization).toBe('Bearer test-token');
  });

  it('creates with POST and sends a blank category as null', async () => {
    global.fetch = respond(201, { id: 8, name: 'Rust', category: null });

    const created = await createSkillCatalogHttpRepository(client()).create({ name: 'Rust', category: null });

    expect(created.id).toBe('8');
    expect(lastCall().options.method).toBe('POST');
    expect(lastCall().options.headers.Authorization).toBe('Bearer test-token');
    expect(JSON.parse(lastCall().options.body as string)).toEqual({ name: 'Rust', category: null });
  });

  it('surfaces a duplicate name as HttpError 409', async () => {
    global.fetch = respond(409, 'Skill name already exists');

    const error = await createSkillCatalogHttpRepository(client())
      .create({ name: 'Java', category: null })
      .catch((err: unknown) => err);

    expect(error).toBeInstanceOf(HttpError);
    expect(error).toMatchObject({ status: 409 });
  });
});

describe('person skill HTTP repository', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('lists assignments in the order served with skillIds normalized', async () => {
    global.fetch = respond(200, [
      { skillId: 9, name: 'Zig', category: 'Language', proficiency: 'BEGINNER' },
      { skillId: 1, name: 'Git', category: null, proficiency: 'EXPERT' },
    ]);

    const rows = await createPersonSkillHttpRepository(client()).list('7');

    expect(rows.map((row) => row.skillId)).toEqual(['9', '1']);
    expect(lastCall().url).toBe('/api/v1/people/7/skills');
    expect(lastCall().options.headers.Authorization).toBe('Bearer test-token');
  });

  it('assigns with PUT to the skill path and a proficiency-only body', async () => {
    global.fetch = respond(200, { skillId: 2, name: 'Java', category: 'Language', proficiency: 'ADVANCED' });

    const assigned = await createPersonSkillHttpRepository(client()).assign('7', '2', 'ADVANCED');

    expect(assigned).toEqual({ skillId: '2', name: 'Java', category: 'Language', proficiency: 'ADVANCED' });
    expect(lastCall().url).toBe('/api/v1/people/7/skills/2');
    expect(lastCall().options.method).toBe('PUT');
    expect(lastCall().options.headers.Authorization).toBe('Bearer test-token');
    expect(JSON.parse(lastCall().options.body as string)).toEqual({ proficiency: 'ADVANCED' });
  });

  it('unassigns with DELETE (204)', async () => {
    global.fetch = respond(204);

    await expect(createPersonSkillHttpRepository(client()).unassign('7', '2')).resolves.toBeUndefined();
    expect(lastCall().url).toBe('/api/v1/people/7/skills/2');
    expect(lastCall().options.method).toBe('DELETE');
    expect(lastCall().options.headers.Authorization).toBe('Bearer test-token');
  });

  it('surfaces DELETE of an unassigned skill as HttpError 404', async () => {
    global.fetch = respond(404, 'Not found');

    const error = await createPersonSkillHttpRepository(client()).unassign('7', '2').catch((err: unknown) => err);

    expect(error).toBeInstanceOf(HttpError);
    expect(error).toMatchObject({ status: 404, body: 'Not found' });
  });
});
