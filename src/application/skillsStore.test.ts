import { PersonSkillRepository, SkillCatalogRepository } from '../domain/ports';
import { PersonSkill, Proficiency, Skill } from '../domain/skill';
import { createSkillsStore } from './skillsStore';

const zig: Skill = { id: '5', name: 'Zig', category: null };
const java: Skill = { id: '2', name: 'Java', category: 'Language' };
const assignedZig: PersonSkill = { skillId: '5', name: 'Zig', category: null, proficiency: 'BEGINNER' };
const assignedGit: PersonSkill = { skillId: '1', name: 'Git', category: 'Tool', proficiency: 'EXPERT' };

function notFound() {
  return Object.assign(new Error('Request failed with status 404'), { status: 404 });
}

function fakes(catalogOverrides: Partial<SkillCatalogRepository> = {}, skillOverrides: Partial<PersonSkillRepository> = {}) {
  const catalog: SkillCatalogRepository = {
    list: jest.fn().mockResolvedValue([zig, java]),
    create: jest.fn().mockImplementation(async (input) => ({ id: '9', ...input })),
    ...catalogOverrides,
  };
  const personSkills: PersonSkillRepository = {
    list: jest.fn().mockResolvedValue([assignedZig, assignedGit]),
    assign: jest
      .fn()
      .mockImplementation(async (_personId: string, skillId: string, proficiency: Proficiency) => ({
        skillId,
        name: skillId === '5' ? 'Zig' : 'Java',
        category: null,
        proficiency,
      })),
    unassign: jest.fn().mockResolvedValue(undefined),
    ...skillOverrides,
  };
  return { catalog, personSkills };
}

describe('skillsStore', () => {
  it('load fetches catalog and assignments, each in the order served', async () => {
    const { catalog, personSkills } = fakes();
    const store = createSkillsStore(catalog, personSkills);

    await store.getState().load('7');

    expect(personSkills.list).toHaveBeenCalledWith('7');
    expect(store.getState().catalog).toEqual([zig, java]);
    expect(store.getState().assignments).toEqual([assignedZig, assignedGit]);
    expect(store.getState().error).toBeNull();
    expect(store.getState().loading).toBe(false);
  });

  it('a load failure sets error and leaves the lists unchanged', async () => {
    const { catalog, personSkills } = fakes();
    const store = createSkillsStore(catalog, personSkills);
    await store.getState().load('7');
    (personSkills.list as jest.Mock).mockRejectedValue(new Error('boom'));

    await store.getState().load('7');

    expect(store.getState().error).toBe('boom');
    expect(store.getState().assignments).toEqual([assignedZig, assignedGit]);
  });

  it('createSkill posts to the catalog and re-reads it in server order', async () => {
    const rust: Skill = { id: '9', name: 'Rust', category: null };
    const { catalog, personSkills } = fakes();
    const store = createSkillsStore(catalog, personSkills);
    await store.getState().load('7');
    (catalog.list as jest.Mock).mockResolvedValue([java, rust, zig]);

    const created = await store.getState().createSkill({ name: 'Rust', category: null });

    expect(catalog.create).toHaveBeenCalledWith({ name: 'Rust', category: null });
    expect(created).toEqual(rust);
    expect(store.getState().catalog).toEqual([java, rust, zig]);
  });

  it('a createSkill failure (e.g. 409 duplicate) throws and leaves the catalog unchanged', async () => {
    const conflict = Object.assign(new Error('dup'), { status: 409 });
    const { catalog, personSkills } = fakes({ create: jest.fn().mockRejectedValue(conflict) });
    const store = createSkillsStore(catalog, personSkills);
    await store.getState().load('7');

    await expect(store.getState().createSkill({ name: 'Java', category: null })).rejects.toMatchObject({ status: 409 });
    expect(store.getState().catalog).toEqual([zig, java]);
  });

  it('re-assigning an assigned skill updates it in place — one entry per skillId', async () => {
    const { catalog, personSkills } = fakes();
    const store = createSkillsStore(catalog, personSkills);
    await store.getState().load('7');

    await store.getState().assign('5', 'EXPERT');

    expect(personSkills.assign).toHaveBeenCalledWith('7', '5', 'EXPERT');
    expect(store.getState().assignments).toEqual([{ ...assignedZig, proficiency: 'EXPERT' }, assignedGit]);
  });

  it('assigning a new skill re-reads the assignments in server order', async () => {
    const assignedJava: PersonSkill = { skillId: '2', name: 'Java', category: 'Language', proficiency: 'ADVANCED' };
    const { catalog, personSkills } = fakes();
    const store = createSkillsStore(catalog, personSkills);
    await store.getState().load('7');
    (personSkills.list as jest.Mock).mockResolvedValue([assignedJava, assignedZig, assignedGit]);

    await store.getState().assign('2', 'ADVANCED');

    expect(store.getState().assignments).toEqual([assignedJava, assignedZig, assignedGit]);
  });

  it('an assign failure throws and leaves the assignments unchanged', async () => {
    const { catalog, personSkills } = fakes({}, { assign: jest.fn().mockRejectedValue(new Error('nope')) });
    const store = createSkillsStore(catalog, personSkills);
    await store.getState().load('7');

    await expect(store.getState().assign('5', 'EXPERT')).rejects.toThrow('nope');
    expect(store.getState().assignments).toEqual([assignedZig, assignedGit]);
  });

  it('unassign deletes and drops the entry', async () => {
    const { catalog, personSkills } = fakes();
    const store = createSkillsStore(catalog, personSkills);
    await store.getState().load('7');

    await store.getState().unassign('5');

    expect(personSkills.unassign).toHaveBeenCalledWith('7', '5');
    expect(store.getState().assignments).toEqual([assignedGit]);
  });

  it('unassign answered 404 (already unassigned) drops the stale entry and still throws', async () => {
    const { catalog, personSkills } = fakes({}, { unassign: jest.fn().mockRejectedValue(notFound()) });
    const store = createSkillsStore(catalog, personSkills);
    await store.getState().load('7');

    await expect(store.getState().unassign('5')).rejects.toMatchObject({ status: 404 });
    expect(store.getState().assignments).toEqual([assignedGit]);
  });
});

describe('skillsStore races (review round 1, items 1, 7, 8)', () => {
  it('an assign that resolves after navigating to another person does not touch that person\'s list', async () => {
    let resolveAssign!: (entry: PersonSkill) => void;
    const { catalog, personSkills } = fakes(
      {},
      { assign: jest.fn().mockReturnValue(new Promise<PersonSkill>((resolve) => (resolveAssign = resolve))) },
    );
    const store = createSkillsStore(catalog, personSkills);
    await store.getState().load('7');

    const assigning = store.getState().assign('5', 'EXPERT');
    (personSkills.list as jest.Mock).mockResolvedValue([assignedGit]);
    await store.getState().load('8');
    resolveAssign({ ...assignedZig, proficiency: 'EXPERT' });
    await assigning;

    expect(store.getState().assignments).toEqual([assignedGit]);
  });

  it('a stale load response is dropped — the latest request wins', async () => {
    let resolveFirst!: (rows: PersonSkill[]) => void;
    const { catalog, personSkills } = fakes(
      {},
      {
        list: jest
          .fn()
          .mockReturnValueOnce(new Promise<PersonSkill[]>((resolve) => (resolveFirst = resolve)))
          .mockResolvedValueOnce([assignedGit]),
      },
    );
    const store = createSkillsStore(catalog, personSkills);

    const a = store.getState().load('7');
    await store.getState().load('7');
    resolveFirst([assignedZig]);
    await a;

    expect(store.getState().assignments).toEqual([assignedGit]);
  });

  it('a failed re-read after a successful assign keeps the list and raises a notice, not the load error', async () => {
    const { catalog, personSkills } = fakes();
    const store = createSkillsStore(catalog, personSkills);
    await store.getState().load('7');
    (personSkills.list as jest.Mock).mockRejectedValue(new Error('flaky'));

    await store.getState().assign('2', 'ADVANCED');

    expect(store.getState().error).toBeNull();
    expect(store.getState().notice).toMatch(/Saved, but the list could not be refreshed/);
    expect(store.getState().assignments.map((entry) => entry.skillId)).toEqual(['5', '1', '2']);
  });

  it('a failed catalog re-read after creating a skill raises a notice, not the load error', async () => {
    const { catalog, personSkills } = fakes();
    const store = createSkillsStore(catalog, personSkills);
    await store.getState().load('7');
    (catalog.list as jest.Mock).mockRejectedValue(new Error('flaky'));

    await store.getState().createSkill({ name: 'Rust', category: null });

    expect(store.getState().error).toBeNull();
    expect(store.getState().notice).toMatch(/could not be refreshed/);
    expect(store.getState().catalog.map((skill) => skill.id)).toEqual(['5', '2', '9']);
  });
});
