import { Education, EducationInput, emptyEducationDraft, fromEducationDraft, toEducationDraft } from './education';

const uned: Education = {
  id: '1',
  institution: 'UNED',
  degree: 'BSc',
  fieldOfStudy: null,
  startDate: '2015-09-01',
  endDate: null,
};

describe('education domain helpers', () => {
  it('the input type carries no id', () => {
    const input: EducationInput = {
      institution: 'UNED',
      degree: 'BSc',
      fieldOfStudy: null,
      startDate: '2015-09-01',
      endDate: null,
      // @ts-expect-error — ids come from the path, never the body
      id: '1',
    };
    expect(input.institution).toBe('UNED');
  });

  it('emptyEducationDraft is blank and not current', () => {
    expect(emptyEducationDraft()).toEqual({
      institution: '',
      degree: '',
      fieldOfStudy: '',
      startDate: '',
      endDate: '',
      current: false,
    });
  });

  it('round-trips a current row: pre-checked on edit, endDate null on submit, blank optional as null', () => {
    const draft = toEducationDraft(uned);
    expect(draft.current).toBe(true);
    expect(draft.fieldOfStudy).toBe('');

    expect(fromEducationDraft(draft)).toEqual({
      ok: true,
      value: { institution: 'UNED', degree: 'BSc', fieldOfStudy: null, startDate: '2015-09-01', endDate: null },
    });
  });

  it('fromEducationDraft reports missing required fields and a blank end date without "current"', () => {
    const result = fromEducationDraft(emptyEducationDraft());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual([
        'Institution is required.',
        'Degree is required.',
        'Start date is required.',
        'End date is required unless "Current" is checked.',
      ]);
    }
  });
});
