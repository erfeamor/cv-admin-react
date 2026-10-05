export interface Person {
  id: string;
  fullName: string;
  headline?: string;
  email: string;
  location?: string;
  summary?: string;
  /**
   * Optimistic-concurrency token (contract rule 8): 0 on create, bumped by every
   * successful PUT. Optional because a pre-T-113 server does not send it.
   */
  version?: number;
}

/** What a form edits and POST/PUT send. The version travels beside it, on update only. */
export type PersonInput = Omit<Person, 'id' | 'version'>;

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
