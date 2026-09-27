import { emptyExperienceDraft, Experience, ExperienceInput, fromExperienceDraft, toExperienceDraft } from './experience';

const acme: Experience = {
  id: '1',
  company: 'ACME',
  role: 'Backend Engineer',
  location: null,
  startDate: '2022-01-01',
  endDate: null,
  description: null,
};

describe('experience domain helpers', () => {
  it('the input type carries no id', () => {
    const input: ExperienceInput = {
      company: 'ACME',
      role: 'Engineer',
      location: null,
      startDate: '2022-01-01',
      endDate: null,
      description: null,
      // @ts-expect-error — ids come from the path, never the body
      id: '1',
    };
    expect(input.company).toBe('ACME');
  });

  it('emptyExperienceDraft is blank and not current', () => {
    expect(emptyExperienceDraft()).toEqual({
      company: '',
      role: '',
      location: '',
      startDate: '',
      endDate: '',
      current: false,
      description: '',
    });
  });

  it('toExperienceDraft pre-checks "current" for a null endDate and blanks null optionals', () => {
    expect(toExperienceDraft(acme)).toEqual({
      company: 'ACME',
      role: 'Backend Engineer',
      location: '',
      startDate: '2022-01-01',
      endDate: '',
      current: true,
      description: '',
    });
  });

  it('toExperienceDraft leaves "current" unchecked for a dated row', () => {
    const draft = toExperienceDraft({ ...acme, endDate: '2023-06-30', location: 'Remote' });
    expect(draft.current).toBe(false);
    expect(draft.endDate).toBe('2023-06-30');
    expect(draft.location).toBe('Remote');
  });

  it('fromExperienceDraft sends blank optionals as null and "current" as endDate null, with no id', () => {
    const result = fromExperienceDraft({ ...toExperienceDraft(acme), location: '  ' });

    expect(result).toEqual({
      ok: true,
      value: {
        company: 'ACME',
        role: 'Backend Engineer',
        location: null,
        startDate: '2022-01-01',
        endDate: null,
        description: null,
      },
    });
  });

  it('fromExperienceDraft reports every missing required field and the blank end date', () => {
    const result = fromExperienceDraft(emptyExperienceDraft());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual([
        'Company is required.',
        'Role is required.',
        'Start date is required.',
        'End date is required unless "Current" is checked.',
      ]);
    }
  });
});
