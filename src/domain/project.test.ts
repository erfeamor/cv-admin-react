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

  it('round-trips a current, undated row: startDate is optional and sent as null', () => {
    const draft = toProjectDraft(cvProject);
    expect(draft.current).toBe(true);

    expect(fromProjectDraft(draft)).toEqual({
      ok: true,
      value: { name: 'cv-project', description: null, repoUrl: null, startDate: null, endDate: null },
    });
  });

  it('fromProjectDraft requires only the name and a decided end date', () => {
    const result = fromProjectDraft(emptyProjectDraft());

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual(['Name is required.', 'End date is required unless "Current" is checked.']);
    }
  });
});
