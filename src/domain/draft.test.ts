import { blankToNull, endDateFromDraft } from './draft';

describe('draft helpers', () => {
  it('blankToNull maps empty and whitespace-only strings to null', () => {
    expect(blankToNull('')).toBeNull();
    expect(blankToNull('   ')).toBeNull();
    expect(blankToNull('Remote')).toBe('Remote');
  });

  it('endDateFromDraft sends null when "current" is checked, whatever the end date holds', () => {
    expect(endDateFromDraft({ startDate: '2022-01-01', endDate: '2023-01-01', current: true })).toEqual({
      ok: true,
      endDate: null,
    });
  });

  it('endDateFromDraft keeps the end date when "current" is unchecked', () => {
    expect(endDateFromDraft({ startDate: '2022-01-01', endDate: '2023-01-01', current: false })).toEqual({
      ok: true,
      endDate: '2023-01-01',
    });
  });

  it('endDateFromDraft rejects a blank end date without "current" — a forgotten field never means ongoing', () => {
    const result = endDateFromDraft({ startDate: '2022-01-01', endDate: '', current: false });

    expect(result.ok).toBe(false);
  });
});
