import { emptyProjectDraft, fromProjectDraft, Project, ProjectInput, toProjectDraft } from './project';

const cvProject: Project = {
  id: '1',
  name: 'cv-project',
  description: null,
  repoUrl: null,
  startDate: null,
  endDate: null,
};

describe('project domain helpers', () => {
  it('the input type carries no id', () => {
    const input: ProjectInput = {
      name: 'cv-project',
      description: null,
      repoUrl: null,
      startDate: null,
      endDate: null,
      // @ts-expect-error — ids come from the path, never the body
      id: '1',
    };
    expect(input.name).toBe('cv-project');
  });

  it('emptyProjectDraft is blank and not current', () => {
    expect(emptyProjectDraft()).toEqual({
      name: '',
      description: '',
      repoUrl: '',
      startDate: '',
      endDate: '',
      current: false,
    });
  });

  it('round-trips a current, dated row: pre-checked on edit, endDate null on submit, blank optionals null', () => {
    const draft = toProjectDraft({ ...cvProject, startDate: '2026-07-01' });
    expect(draft.current).toBe(true);

    expect(fromProjectDraft(draft)).toEqual({
      ok: true,
      value: { name: 'cv-project', description: null, repoUrl: null, startDate: '2026-07-01', endDate: null },
    });
  });

  it('fromProjectDraft requires only the name when undated', () => {
    expect(fromProjectDraft(emptyProjectDraft())).toEqual({ ok: false, errors: ['Name is required.'] });
  });
});

describe('undated projects (review round 1, PO correction of H1 for projects)', () => {
  const undated: Project = { id: '2', name: 'side-quest', description: null, repoUrl: null, startDate: null, endDate: null };

  it('a project with neither date is undated, not current: Current is not pre-checked on edit', () => {
    expect(toProjectDraft(undated).current).toBe(false);
  });

  it('a dated project with a null endDate still pre-checks Current', () => {
    expect(toProjectDraft({ ...undated, startDate: '2026-07-01' }).current).toBe(true);
  });

  it('no start date and no end date saves as both null — no "current" decision required', () => {
    expect(fromProjectDraft({ ...emptyProjectDraft(), name: 'side-quest' })).toEqual({
      ok: true,
      value: { name: 'side-quest', description: null, repoUrl: null, startDate: null, endDate: null },
    });
  });

  it('with a start date, a blank end date without Current is still an error', () => {
    const result = fromProjectDraft({ ...emptyProjectDraft(), name: 'x', startDate: '2026-07-01' });
    expect(result).toEqual({ ok: false, errors: ['End date is required unless "Current" is checked.'] });
  });

  it('Current without a start date is rejected — it would read back as undated', () => {
    const result = fromProjectDraft({ ...emptyProjectDraft(), name: 'x', current: true });
    expect(result).toEqual({ ok: false, errors: ['A current project needs a start date.'] });
  });

  it('an end date without a start date is kept (renders as "until …")', () => {
    expect(fromProjectDraft({ ...emptyProjectDraft(), name: 'x', endDate: '2025-01-01' })).toMatchObject({
      ok: true,
      value: { startDate: null, endDate: '2025-01-01' },
    });
  });
});
