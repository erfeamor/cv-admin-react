import { Person, PersonInput } from '../domain/person';
import { PersonRepository } from '../domain/ports';
import { createPeopleStore } from './peopleStore';

const jane: Person = { id: '1', fullName: 'Jane Doe', email: 'jane@example.com' };
const john: Person = { id: '2', fullName: 'John Roe', email: 'john@example.com' };

function fakeRepository(overrides: Partial<PersonRepository> = {}): PersonRepository {
  return {
    list: jest.fn().mockResolvedValue([jane, john]),
    get: jest.fn().mockResolvedValue(jane),
    create: jest.fn().mockImplementation(async (input: PersonInput) => ({ id: '3', ...input })),
    update: jest.fn().mockImplementation(async (id: string, input: PersonInput) => ({ id, ...input })),
    remove: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('peopleStore', () => {
  it('loadPeople fills the list and clears loading', async () => {
    const store = createPeopleStore(fakeRepository());

    await store.getState().loadPeople();

    expect(store.getState().people).toEqual([jane, john]);
    expect(store.getState().loading).toBe(false);
    expect(store.getState().error).toBeNull();
  });

  it('loadPeople records repository failures as error state', async () => {
    const store = createPeopleStore(
      fakeRepository({ list: jest.fn().mockRejectedValue(new Error('boom')) }),
    );

    await store.getState().loadPeople();

    expect(store.getState().error).toBe('boom');
    expect(store.getState().loading).toBe(false);
  });

  it('selectPerson preloads the cached person before the fetch resolves', async () => {
    let resolveGet!: (person: Person) => void;
    const repository = fakeRepository({
      get: jest.fn().mockReturnValue(new Promise<Person>((resolve) => (resolveGet = resolve))),
    });
    const store = createPeopleStore(repository);
    await store.getState().loadPeople();

    const selecting = store.getState().selectPerson('1');

    // Cached copy is available synchronously — this is the preload.
    expect(store.getState().selectedPerson).toEqual(jane);
    expect(store.getState().loading).toBe(false);

    const fresh = { ...jane, headline: 'Fresh from API' };
    resolveGet(fresh);
    await selecting;
    expect(store.getState().selectedPerson).toEqual(fresh);
  });

  it('selectPerson with no cache sets loading until the fetch resolves', async () => {
    const store = createPeopleStore(fakeRepository());

    const selecting = store.getState().selectPerson('1');

    expect(store.getState().selectedPerson).toBeNull();
    expect(store.getState().loading).toBe(true);

    await selecting;
    expect(store.getState().selectedPerson).toEqual(jane);
    expect(store.getState().loading).toBe(false);
  });

  it('selectPerson records failures as error state', async () => {
    const store = createPeopleStore(
      fakeRepository({ get: jest.fn().mockRejectedValue(new Error('not found')) }),
    );

    await store.getState().selectPerson('999');

    expect(store.getState().error).toBe('not found');
  });

  it('savePerson without id creates and appends to the list', async () => {
    const repository = fakeRepository();
    const store = createPeopleStore(repository);
    await store.getState().loadPeople();

    const input: PersonInput = { fullName: 'New Person', email: 'new@example.com' };
    const saved = await store.getState().savePerson(input);

    expect(repository.create).toHaveBeenCalledWith(input);
    expect(saved.id).toBe('3');
    expect(store.getState().people).toHaveLength(3);
    expect(store.getState().selectedPerson).toEqual(saved);
  });

  it('savePerson with id updates in place', async () => {
    const repository = fakeRepository();
    const store = createPeopleStore(repository);
    await store.getState().loadPeople();

    const input: PersonInput = { fullName: 'Jane Smith', email: 'jane@example.com' };
    await store.getState().savePerson(input, '1');

    expect(repository.update).toHaveBeenCalledWith('1', input);
    expect(store.getState().people).toHaveLength(2);
    expect(store.getState().people[0].fullName).toBe('Jane Smith');
  });

  it('savePerson propagates repository failures to the caller', async () => {
    const store = createPeopleStore(
      fakeRepository({ create: jest.fn().mockRejectedValue(new Error('rejected')) }),
    );

    await expect(
      store.getState().savePerson({ fullName: 'X', email: 'x@example.com' }),
    ).rejects.toThrow('rejected');
  });

  it('removePerson drops the person from list and selection', async () => {
    const store = createPeopleStore(fakeRepository());
    await store.getState().loadPeople();
    await store.getState().selectPerson('1');

    await store.getState().removePerson('1');

    expect(store.getState().people).toEqual([john]);
    expect(store.getState().selectedPerson).toBeNull();
  });

  it('clearSelection resets the selected person', async () => {
    const store = createPeopleStore(fakeRepository());
    await store.getState().selectPerson('1');

    store.getState().clearSelection();

    expect(store.getState().selectedPerson).toBeNull();
  });
});
