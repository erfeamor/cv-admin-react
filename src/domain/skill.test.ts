import { emptySkillDraft, fromSkillDraft, PROFICIENCIES, SkillInput } from './skill';

describe('skill domain helpers', () => {
  it('the proficiency enum is exactly the four contract values', () => {
    expect(PROFICIENCIES).toEqual(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']);
  });

  it('the catalog input type carries no id', () => {
    // @ts-expect-error — the server assigns catalog ids
    const input: SkillInput = { name: 'Rust', category: null, id: '1' };
    expect(input.name).toBe('Rust');
  });

  it('fromSkillDraft sends a blank category as null', () => {
    expect(fromSkillDraft({ name: 'Rust', category: ' ' })).toEqual({
      ok: true,
      value: { name: 'Rust', category: null },
    });
  });

  it('fromSkillDraft requires a name', () => {
    expect(fromSkillDraft(emptySkillDraft())).toEqual({ ok: false, errors: ['Skill name is required.'] });
  });
});
