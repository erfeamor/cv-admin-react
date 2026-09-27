import { Experience, ExperienceInput } from '../domain/experience';
import { ExperienceRepository } from '../domain/ports';
import { LoadInFlightError } from './collections';
import { createSectionStore } from './sectionStore';

const row = (id: string, startDate: string): Experience => ({
  id,
  company: `Company ${id}`,
  role: 'Engineer',
  location: null,
  startDate,
  endDate: null,
  description: null,
});

// Deliberately not in id order: the store must keep whatever order the server sends.
const newer = row('2', '2024-01-01');
const older = row('1', '2020-01-01');

const input: ExperienceInput = {
  company: 'New Co',
  role: 'Lead',
  location: null,
  startDate: '2025-01-01',
  endDate: null,
  description: null,
};

function notFound() {
  return Object.assign(new Error('Request failed with status 404'), { status: 404 });
}

function fakeRepository(overrides: Partial<ExperienceRepository> = {}): ExperienceRepository {
  return {
    list: jest.fn().mockResolvedValue([newer, older]),
    create: jest.fn().mockImplementation(async (_personId: string, value: ExperienceInput) => ({ id: '3', ...value })),
    update: jest
      .fn()
      .mockImplementation(async (_personId: string, id: string, value: ExperienceInput) => ({ id, ...value })),
    remove: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('sectionStore', () => {
  it('load fills the list for the person in server order', async () => {
    const repository = fakeRepository();
    const store = createSectionStore(repository);

    await store.getState().load('7');

    expect(repository.list).toHaveBeenCalledWith('7');
    expect(store.getState().items).toEqual([newer, older]);
    expect(store.getState().personId).toBe('7');
    expect(store.getState().loading).toBe(false);
    expect(store.getState().error).toBeNull();
  });

  it('load for a different person drops the previous person\'s rows first', async () => {
    let resolveList!: (rows: Experience[]) => void;
    const repository = fakeRepository();
    const store = createSectionStore(repository);
    await store.getState().load('7');
    (repository.list as jest.Mock).mockReturnValue(new Promise((resolve) => (resolveList = resolve)));

    const loading = store.getState().load('8');

    expect(store.getState().items).toEqual([]);
    resolveList([older]);
    await loading;
    expect(store.getState().items).toEqual([older]);
  });

  it('a load failure sets error and leaves the list unchanged', async () => {
    const repository = fakeRepository();
    const store = createSectionStore(repository);
    await store.getState().load('7');
    (repository.list as jest.Mock).mockRejectedValue(new Error('boom'));

    await store.getState().load('7');

    expect(store.getState().error).toBe('boom');
    expect(store.getState().items).toEqual([newer, older]);
    expect(store.getState().loading).toBe(false);
  });

  it('save without id creates under the person, then takes the server\'s order', async () => {
    const created = { id: '3', ...input };
    const repository = fakeRepository();
    const store = createSectionStore(repository);
    await store.getState().load('7');
    (repository.list as jest.Mock).mockResolvedValue([created, newer, older]);

    const saved = await store.getState().save(input);

    expect(repository.create).toHaveBeenCalledWith('7', input);
    expect(saved).toEqual(created);
    expect(store.getState().items).toEqual([created, newer, older]);
  });

  it('save with id updates the row in place', async () => {
    const repository = fakeRepository({ list: jest.fn().mockResolvedValue([newer, older]) });
    const store = createSectionStore(repository);
    await store.getState().load('7');
    const changed = { ...input, startDate: older.startDate };
    (repository.list as jest.Mock).mockResolvedValue([newer, { id: '1', ...changed }]);

    await store.getState().save(changed, '1');

    expect(repository.update).toHaveBeenCalledWith('7', '1', changed);
    expect(store.getState().items).toEqual([newer, { id: '1', ...changed }]);
  });

  it('a create failure throws to the caller and leaves the list unchanged', async () => {
    const store = createSectionStore(fakeRepository({ create: jest.fn().mockRejectedValue(new Error('rejected')) }));
    await store.getState().load('7');

    await expect(store.getState().save(input)).rejects.toThrow('rejected');
    expect(store.getState().items).toEqual([newer, older]);
  });

  it('an update failure other than 404 throws and leaves the list unchanged', async () => {
    const store = createSectionStore(
      fakeRepository({ update: jest.fn().mockRejectedValue(Object.assign(new Error('bad'), { status: 400 })) }),
    );
    await store.getState().load('7');

    await expect(store.getState().save(input, '1')).rejects.toThrow('bad');
    expect(store.getState().items).toEqual([newer, older]);
  });

  it('an update answered 404 (row deleted meanwhile) drops the stale row and still throws', async () => {
    const store = createSectionStore(fakeRepository({ update: jest.fn().mockRejectedValue(notFound()) }));
    await store.getState().load('7');

    await expect(store.getState().save(input, '1')).rejects.toMatchObject({ status: 404 });
    expect(store.getState().items).toEqual([newer]);
  });

  it('remove deletes under the person and drops the row', async () => {
    const repository = fakeRepository();
    const store = createSectionStore(repository);
    await store.getState().load('7');

    await store.getState().remove('2');

    expect(repository.remove).toHaveBeenCalledWith('7', '2');
    expect(store.getState().items).toEqual([older]);
  });

  it('a remove failure throws and leaves the list unchanged', async () => {
    const store = createSectionStore(fakeRepository({ remove: jest.fn().mockRejectedValue(new Error('down')) }));
    await store.getState().load('7');

    await expect(store.getState().remove('2')).rejects.toThrow('down');
    expect(store.getState().items).toEqual([newer, older]);
  });

  it('a remove answered 404 drops the stale row and still throws', async () => {
    const store = createSectionStore(fakeRepository({ remove: jest.fn().mockRejectedValue(notFound()) }));
    await store.getState().load('7');

    await expect(store.getState().remove('2')).rejects.toMatchObject({ status: 404 });
    expect(store.getState().items).toEqual([older]);
  });

  it('writes before any load are rejected rather than sent to an unknown person', async () => {
    const repository = fakeRepository();
    const store = createSectionStore(repository);

    await expect(store.getState().save(input)).rejects.toThrow('No person loaded');
    expect(repository.create).not.toHaveBeenCalled();
  });
});

describe('sectionStore races (review round 1, items 1, 7, 8)', () => {
  function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (reason: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  }

  it('a create that resolves after navigating to another person does not touch that person\'s list', async () => {
    const pendingCreate = deferred<Experience>();
    const repository = fakeRepository({ create: jest.fn().mockReturnValue(pendingCreate.promise) });
    const store = createSectionStore(repository);
    await store.getState().load('7');

    const saving = store.getState().save(input);
    (repository.list as jest.Mock).mockResolvedValue([older]);
    await store.getState().load('8');
    pendingCreate.resolve({ id: '3', ...input });
    await saving;

    expect(store.getState().personId).toBe('8');
    expect(store.getState().items).toEqual([older]);
    expect(repository.list).toHaveBeenLastCalledWith('8');
  });

  it('a remove/404 that settles after navigating away leaves the new person\'s list alone', async () => {
    const pendingRemove = deferred<void>();
    const repository = fakeRepository({ remove: jest.fn().mockReturnValue(pendingRemove.promise) });
    const store = createSectionStore(repository);
    await store.getState().load('7');

    const removing = store.getState().remove('2');
    (repository.list as jest.Mock).mockResolvedValue([newer]);
    await store.getState().load('8');
    pendingRemove.reject(notFound());
    await expect(removing).rejects.toMatchObject({ status: 404 });

    expect(store.getState().items).toEqual([newer]);
  });

  it('a stale list response for the same person is dropped — the latest request wins', async () => {
    const first = deferred<Experience[]>();
    const second = deferred<Experience[]>();
    const repository = fakeRepository({
      list: jest.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise),
    });
    const store = createSectionStore(repository);

    const a = store.getState().load('7');
    const b = store.getState().load('7');
    second.resolve([newer, older]);
    await b;
    first.resolve([older]);
    await a;

    expect(store.getState().items).toEqual([newer, older]);
  });

  it('a failed re-read after a successful write keeps the list and raises a notice, not the load error', async () => {
    const repository = fakeRepository();
    const store = createSectionStore(repository);
    await store.getState().load('7');
    (repository.list as jest.Mock).mockRejectedValue(new Error('flaky'));

    await store.getState().save(input);

    expect(store.getState().error).toBeNull();
    expect(store.getState().notice).toMatch(/Saved, but the list could not be refreshed/);
    expect(store.getState().items).toEqual([newer, older, { id: '3', ...input }]);

    (repository.list as jest.Mock).mockResolvedValue([newer, older]);
    await store.getState().load('7');
    expect(store.getState().notice).toBeNull();
  });
});

describe('sectionStore T-302: writes vs loads, notice lifetime', () => {
  function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (reason: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  }

  async function withNotice() {
    const repository = fakeRepository();
    const store = createSectionStore(repository);
    await store.getState().load('7');
    (repository.list as jest.Mock).mockRejectedValueOnce(new Error('flaky'));
    await store.getState().save(input);
    expect(store.getState().notice).not.toBeNull();
    return { repository, store };
  }

  it('rejects save and remove during an in-flight load without calling the repository', async () => {
    const pendingList = deferred<Experience[]>();
    const repository = fakeRepository();
    const store = createSectionStore(repository);
    await store.getState().load('7');
    (repository.list as jest.Mock).mockReturnValueOnce(pendingList.promise);
    const loading = store.getState().load('7');

    await expect(store.getState().save(input)).rejects.toBeInstanceOf(LoadInFlightError);
    await expect(store.getState().save(input, '1')).rejects.toBeInstanceOf(LoadInFlightError);
    await expect(store.getState().remove('1')).rejects.toBeInstanceOf(LoadInFlightError);

    expect(repository.create).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
    expect(repository.remove).not.toHaveBeenCalled();
    pendingList.resolve([newer, older]);
    await loading;
    expect(store.getState().items).toEqual([newer, older]);
  });

  it('a remove of another row does not clear the refresh notice', async () => {
    const { store } = await withNotice();

    await store.getState().remove('1');

    expect(store.getState().notice).not.toBeNull();
  });

  it('a later save whose re-read succeeds clears the notice and takes the server order', async () => {
    const created = { id: '3', ...input };
    const { repository, store } = await withNotice();
    (repository.list as jest.Mock).mockResolvedValueOnce([created, newer, older]);

    await store.getState().save(input, '3');

    expect(store.getState().notice).toBeNull();
    expect(store.getState().items).toEqual([created, newer, older]);
  });

  it('a load superseded by a write\'s newer re-read keeps that list and does not raise its failure', async () => {
    const created = { id: '3', ...input };
    const pendingCreate = deferred<Experience>();
    const pendingLoad = deferred<Experience[]>();
    const repository = fakeRepository({ create: jest.fn().mockReturnValue(pendingCreate.promise) });
    const store = createSectionStore(repository);
    await store.getState().load('7');

    // The write starts before the load (forms are enabled), and its re-read goes out after the load's read.
    const saving = store.getState().save(input);
    (repository.list as jest.Mock).mockReturnValueOnce(pendingLoad.promise).mockResolvedValueOnce([created, newer, older]);
    const loading = store.getState().load('7');
    pendingCreate.resolve(created);
    await saving;
    pendingLoad.reject(new Error('boom'));
    await loading;

    expect(store.getState().error).toBeNull();
    expect(store.getState().loading).toBe(false);
    expect(store.getState().items).toEqual([created, newer, older]);
  });

  it('a load superseded by a write\'s newer re-read settles loading and keeps the newer list', async () => {
    const created = { id: '3', ...input };
    const pendingCreate = deferred<Experience>();
    const pendingLoad = deferred<Experience[]>();
    const repository = fakeRepository({ create: jest.fn().mockReturnValue(pendingCreate.promise) });
    const store = createSectionStore(repository);
    await store.getState().load('7');

    const saving = store.getState().save(input);
    (repository.list as jest.Mock).mockReturnValueOnce(pendingLoad.promise).mockResolvedValueOnce([created, newer, older]);
    const loading = store.getState().load('7');
    pendingCreate.resolve(created);
    await saving;
    pendingLoad.resolve([newer, older]);
    await loading;

    expect(store.getState().loading).toBe(false);
    expect(store.getState().items).toEqual([created, newer, older]);
  });
});
