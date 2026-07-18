import { emptyPersonInput, Person, toPersonInput } from './person';

describe('person domain helpers', () => {
  it('emptyPersonInput returns all fields as empty strings', () => {
    expect(emptyPersonInput()).toEqual({
      fullName: '',
      headline: '',
      email: '',
      location: '',
      summary: '',
    });
  });

  it('toPersonInput strips the id and keeps field values', () => {
    const person: Person = {
      id: '1',
      fullName: 'Jane Doe',
      headline: 'Engineer',
      email: 'jane@example.com',
      location: 'Madrid',
      summary: 'Seed person',
    };

    expect(toPersonInput(person)).toEqual({
      fullName: 'Jane Doe',
      headline: 'Engineer',
      email: 'jane@example.com',
      location: 'Madrid',
      summary: 'Seed person',
    });
  });

  it('toPersonInput defaults absent optional fields to empty strings', () => {
    const person: Person = { id: '1', fullName: 'Jane Doe', email: 'jane@example.com' };

    expect(toPersonInput(person)).toEqual({
      fullName: 'Jane Doe',
      headline: '',
      email: 'jane@example.com',
      location: '',
      summary: '',
    });
  });
});
