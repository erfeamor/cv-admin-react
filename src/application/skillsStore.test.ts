import { PersonSkillRepository, SkillCatalogRepository } from '../domain/ports';
import { PersonSkill, Proficiency, Skill } from '../domain/skill';
import { LoadInFlightError } from './collections';
import { createSkillsStore, SkillsStore } from './skillsStore';

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
    expect(store.getState().assignmentsNotice).toMatch(/Saved, but the list could not be refreshed/);
    expect(store.getState().assignments.map((entry) => entry.skillId)).toEqual(['5', '1', '2']);
  });

  it('a failed catalog re-read after creating a skill raises a notice, not the load error', async () => {
    const { catalog, personSkills } = fakes();
    const store = createSkillsStore(catalog, personSkills);
    await store.getState().load('7');
    (catalog.list as jest.Mock).mockRejectedValue(new Error('flaky'));

    await store.getState().createSkill({ name: 'Rust', category: null });

    expect(store.getState().error).toBeNull();
    expect(store.getState().catalogNotice).toMatch(/could not be refreshed/);
    expect(store.getState().catalog.map((skill) => skill.id)).toEqual(['5', '2', '9']);
  });
});

describe('skillsStore T-302: writes vs loads, per-list notices', () => {
  function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (reason: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  }

  async function loaded() {
    const fakeRepos = fakes();
    const store = createSkillsStore(fakeRepos.catalog, fakeRepos.personSkills);
    await store.getState().load('7');
    return { ...fakeRepos, store };
  }

  async function raiseAssignmentsNotice(personSkills: PersonSkillRepository, store: SkillsStore) {
    (personSkills.list as jest.Mock).mockRejectedValueOnce(new Error('flaky'));
    await store.getState().assign('2', 'ADVANCED'); // new assignment → re-read fails
    expect(store.getState().assignmentsNotice).toMatch(/could not be refreshed/);
  }

  async function raiseCatalogNotice(catalog: SkillCatalogRepository, store: SkillsStore) {
    (catalog.list as jest.Mock).mockRejectedValueOnce(new Error('flaky'));
    await store.getState().createSkill({ name: 'Rust', category: null });
    expect(store.getState().catalogNotice).toMatch(/could not be refreshed/);
  }

  it('rejects createSkill, assign and unassign during an in-flight load without calling the repositories', async () => {
    const pendingCatalog = deferred<Skill[]>();
    const { catalog, personSkills, store } = await loaded();
    (catalog.list as jest.Mock).mockReturnValueOnce(pendingCatalog.promise);
    const loading = store.getState().load('7');

    await expect(store.getState().createSkill({ name: 'Rust', category: null })).rejects.toBeInstanceOf(LoadInFlightError);
    await expect(store.getState().assign('2', 'ADVANCED')).rejects.toBeInstanceOf(LoadInFlightError);
    await expect(store.getState().unassign('5')).rejects.toBeInstanceOf(LoadInFlightError);

    expect(catalog.create).not.toHaveBeenCalled();
    expect(personSkills.assign).not.toHaveBeenCalled();
    expect(personSkills.unassign).not.toHaveBeenCalled();
    pendingCatalog.resolve([zig, java]);
    await loading;
    expect(store.getState().loading).toBe(false);
  });

  it('unassign and an in-place re-assign leave the notices set', async () => {
    const { catalog, personSkills, store } = await loaded();
    await raiseAssignmentsNotice(personSkills, store);
    await raiseCatalogNotice(catalog, store);

    await store.getState().unassign('1');
    await store.getState().assign('5', 'EXPERT'); // in place, no re-read

    expect(store.getState().assignmentsNotice).toMatch(/could not be refreshed/);
    expect(store.getState().catalogNotice).toMatch(/could not be refreshed/);
  });

  it('a successful assignments re-read clears only the assignments notice', async () => {
    const { catalog, personSkills, store } = await loaded();
    await raiseCatalogNotice(catalog, store);
    await raiseAssignmentsNotice(personSkills, store);
    store.setState((state) => ({ assignments: state.assignments.filter((entry) => entry.skillId !== '2') }));

    await store.getState().assign('2', 'ADVANCED'); // new again → re-read succeeds

    expect(store.getState().assignmentsNotice).toBeNull();
    expect(store.getState().catalogNotice).toMatch(/could not be refreshed/);
  });

  it('a successful catalog re-read clears only the catalog notice', async () => {
    const { catalog, personSkills, store } = await loaded();
    await raiseAssignmentsNotice(personSkills, store);
    await raiseCatalogNotice(catalog, store);

    await store.getState().createSkill({ name: 'Go', category: null });

    expect(store.getState().catalogNotice).toBeNull();
    expect(store.getState().assignmentsNotice).toMatch(/could not be refreshed/);
  });

  it('a successful reload clears both notices', async () => {
    const { catalog, personSkills, store } = await loaded();
    await raiseAssignmentsNotice(personSkills, store);
    await raiseCatalogNotice(catalog, store);

    await store.getState().load('7');

    expect(store.getState().catalogNotice).toBeNull();
    expect(store.getState().assignmentsNotice).toBeNull();
  });

  it('a load superseded by an assign\'s newer re-read keeps that list and does not raise its failure', async () => {
    const assignedJava: PersonSkill = { skillId: '2', name: 'Java', category: 'Language', proficiency: 'ADVANCED' };
    const pendingAssign = deferred<PersonSkill>();
    const pendingLoadList = deferred<PersonSkill[]>();
    const { personSkills, store } = await loaded();
    (personSkills.assign as jest.Mock).mockReturnValueOnce(pendingAssign.promise);

    // The write starts before the load (forms are enabled), and its re-read goes out after the load's read.
    const assigning = store.getState().assign('2', 'ADVANCED');
    (personSkills.list as jest.Mock)
      .mockReturnValueOnce(pendingLoadList.promise)
      .mockResolvedValueOnce([assignedJava, assignedZig]);
    const loading = store.getState().load('7');
    pendingAssign.resolve(assignedJava);
    await assigning;
    pendingLoadList.reject(new Error('boom'));
    await loading;

    expect(store.getState().error).toBeNull();
    expect(store.getState().loading).toBe(false);
    expect(store.getState().assignments).toEqual([assignedJava, assignedZig]);
  });

  it('a load superseded by an assign\'s newer re-read settles loading and keeps both fresh lists', async () => {
    const rust: Skill = { id: '9', name: 'Rust', category: null };
    const assignedJava: PersonSkill = { skillId: '2', name: 'Java', category: 'Language', proficiency: 'ADVANCED' };
    const pendingAssign = deferred<PersonSkill>();
    const pendingLoadList = deferred<PersonSkill[]>();
    const { catalog, personSkills, store } = await loaded();
    (personSkills.assign as jest.Mock).mockReturnValueOnce(pendingAssign.promise);
    (catalog.list as jest.Mock).mockResolvedValue([zig, java, rust]);

    const assigning = store.getState().assign('2', 'ADVANCED');
    (personSkills.list as jest.Mock)
      .mockReturnValueOnce(pendingLoadList.promise)
      .mockResolvedValueOnce([assignedJava, assignedZig]);
    const loading = store.getState().load('7');
    pendingAssign.resolve(assignedJava);
    await assigning;
    pendingLoadList.resolve([assignedZig]);
    await loading;

    expect(store.getState().loading).toBe(false);
    expect(store.getState().catalog).toEqual([zig, java, rust]);
    expect(store.getState().assignments).toEqual([assignedJava, assignedZig]);
  });

  it('an unassign that settles after a load\'s read went out keeps the skill gone and settles loading', async () => {
    const pendingUnassign = deferred<void>();
    const pendingLoadList = deferred<PersonSkill[]>();
    const { personSkills, store } = await loaded();
    (personSkills.unassign as jest.Mock).mockReturnValueOnce(pendingUnassign.promise);

    const unassigning = store.getState().unassign('5');
    (personSkills.list as jest.Mock).mockReturnValueOnce(pendingLoadList.promise);
    const loading = store.getState().load('7');
    pendingUnassign.resolve();
    await unassigning;
    pendingLoadList.resolve([assignedZig, assignedGit]);
    await loading;

    expect(store.getState().assignments).toEqual([assignedGit]);
    expect(store.getState().loading).toBe(false);
  });

  it('an unassign answered 404 after a load\'s read went out keeps the stale entry dropped', async () => {
    const pendingUnassign = deferred<void>();
    const pendingLoadList = deferred<PersonSkill[]>();
    const { personSkills, store } = await loaded();
    (personSkills.unassign as jest.Mock).mockReturnValueOnce(pendingUnassign.promise);

    const unassigning = store.getState().unassign('5');
    (personSkills.list as jest.Mock).mockReturnValueOnce(pendingLoadList.promise);
    const loading = store.getState().load('7');
    pendingUnassign.reject(notFound());
    await expect(unassigning).rejects.toMatchObject({ status: 404 });
    pendingLoadList.resolve([assignedZig, assignedGit]);
    await loading;

    expect(store.getState().assignments).toEqual([assignedGit]);
    expect(store.getState().loading).toBe(false);
  });

  it('an in-place re-assign that settles after a load\'s read went out keeps the new proficiency', async () => {
    const pendingAssign = deferred<PersonSkill>();
    const pendingLoadList = deferred<PersonSkill[]>();
    const { personSkills, store } = await loaded();
    (personSkills.assign as jest.Mock).mockReturnValueOnce(pendingAssign.promise);

    const assigning = store.getState().assign('5', 'EXPERT');
    (personSkills.list as jest.Mock).mockReturnValueOnce(pendingLoadList.promise);
    const loading = store.getState().load('7');
    pendingAssign.resolve({ ...assignedZig, proficiency: 'EXPERT' });
    await assigning;
    pendingLoadList.resolve([assignedZig, assignedGit]);
    await loading;

    expect(store.getState().assignments).toEqual([{ ...assignedZig, proficiency: 'EXPERT' }, assignedGit]);
    expect(store.getState().loading).toBe(false);
  });

  it('a successful assignments re-read clears a load error caused by the assignments', async () => {
    const pendingLoadList = deferred<PersonSkill[]>();
    const pendingAssign = deferred<PersonSkill>();
    const { personSkills, store } = await loaded();
    (personSkills.assign as jest.Mock).mockReturnValueOnce(pendingAssign.promise);

    // The assign starts before the load; the load's assignments read fails, then the assign re-reads fine.
    const assigning = store.getState().assign('2', 'ADVANCED');
    (personSkills.list as jest.Mock).mockReturnValueOnce(pendingLoadList.promise);
    const loading = store.getState().load('7');
    pendingLoadList.reject(new Error('boom'));
    await loading;
    expect(store.getState().error).toBe('boom');
    pendingAssign.resolve({ skillId: '2', name: 'Java', category: 'Language', proficiency: 'ADVANCED' });
    await assigning;

    expect(store.getState().error).toBeNull();
  });

  it('a successful catalog re-read clears a load error caused by the catalog', async () => {
    const pendingCreate = deferred<Skill>();
    const { catalog, store } = await loaded();
    (catalog.create as jest.Mock).mockReturnValueOnce(pendingCreate.promise);

    const creating = store.getState().createSkill({ name: 'Rust', category: null });
    (catalog.list as jest.Mock).mockRejectedValueOnce(new Error('boom'));
    await store.getState().load('7');
    expect(store.getState().error).toBe('boom');
    pendingCreate.resolve({ id: '9', name: 'Rust', category: null });
    await creating;

    expect(store.getState().error).toBeNull();
  });

  it('a successful re-read of the other list keeps the load error', async () => {
    const pendingCreate = deferred<Skill>();
    const { catalog, personSkills, store } = await loaded();
    (catalog.create as jest.Mock).mockReturnValueOnce(pendingCreate.promise);

    const creating = store.getState().createSkill({ name: 'Rust', category: null });
    (personSkills.list as jest.Mock).mockRejectedValueOnce(new Error('boom'));
    await store.getState().load('7');
    pendingCreate.resolve({ id: '9', name: 'Rust', category: null });
    await creating;

    expect(store.getState().error).toBe('boom');
  });

  it('an unassign that settles after switching A → B → A keeps A\'s reloaded list, minus the skill', async () => {
    const pendingUnassign = deferred<void>();
    const pendingReload = deferred<PersonSkill[]>();
    const { personSkills, store } = await loaded();
    (personSkills.unassign as jest.Mock).mockReturnValueOnce(pendingUnassign.promise);

    const unassigning = store.getState().unassign('5');
    (personSkills.list as jest.Mock).mockResolvedValueOnce([]);
    await store.getState().load('8');
    (personSkills.list as jest.Mock).mockReturnValueOnce(pendingReload.promise);
    const loading = store.getState().load('7');
    pendingUnassign.resolve();
    await unassigning;
    pendingReload.resolve([assignedZig, assignedGit]);
    await loading;

    expect(store.getState().assignments).toEqual([assignedGit]);
    expect(store.getState().loading).toBe(false);
  });
});

