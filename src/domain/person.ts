export interface Person {
  id: string;
  fullName: string;
  headline?: string;
  email: string;
  location?: string;
  summary?: string;
}

export type PersonInput = Omit<Person, 'id'>;

export function emptyPersonInput(): PersonInput {
  return {
    fullName: '',
    headline: '',
    email: '',
    location: '',
    summary: '',
  };
}

export function toPersonInput(person: Person): PersonInput {
  return {
    fullName: person.fullName,
    headline: person.headline ?? '',
    email: person.email,
    location: person.location ?? '',
    summary: person.summary ?? '',
  };
}
