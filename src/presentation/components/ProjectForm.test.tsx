import { fireEvent, render, screen } from '@testing-library/react';
import { ProjectDraft } from '../../domain/project';
import ProjectForm from './ProjectForm';

const draft: ProjectDraft = {
  name: 'cv-project',
  description: 'Interactive CV',
  repoUrl: 'https://github.com/erfeamor/cv',
  startDate: '',
  endDate: '',
  current: true,
};

describe('ProjectForm', () => {
  it('renders every field from the draft and reports edits', () => {
    const onChange = jest.fn();
    render(<ProjectForm title="Edit project" value={draft} onChange={onChange} onSubmit={jest.fn()} />);

    expect(screen.getByRole('heading', { name: 'Edit project' })).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue('cv-project');
    expect(screen.getByLabelText('Description')).toHaveValue('Interactive CV');
    expect(screen.getByLabelText('Repository URL')).toHaveValue('https://github.com/erfeamor/cv');
    expect(screen.getByLabelText('Start date')).toHaveValue('');
    expect(screen.getByLabelText('End date')).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'cv' } });
    expect(onChange).toHaveBeenCalledWith({ ...draft, name: 'cv' });
  });

  it('submits through onSubmit', () => {
    const onSubmit = jest.fn();
    render(<ProjectForm title="New project" value={draft} onChange={jest.fn()} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
