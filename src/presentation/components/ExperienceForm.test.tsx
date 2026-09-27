import { fireEvent, render, screen } from '@testing-library/react';
import { emptyExperienceDraft, ExperienceDraft } from '../../domain/experience';
import ExperienceForm from './ExperienceForm';

const draft: ExperienceDraft = {
  company: 'ACME',
  role: 'Backend Engineer',
  location: 'Remote',
  startDate: '2022-01-01',
  endDate: '',
  current: true,
  description: 'APIs',
};

describe('ExperienceForm', () => {
  it('renders the title and every field from the draft', () => {
    render(<ExperienceForm title="Edit experience" value={draft} onChange={jest.fn()} onSubmit={jest.fn()} />);

    expect(screen.getByRole('heading', { name: 'Edit experience' })).toBeInTheDocument();
    expect(screen.getByLabelText('Company')).toHaveValue('ACME');
    expect(screen.getByLabelText('Role')).toHaveValue('Backend Engineer');
    expect(screen.getByLabelText('Location')).toHaveValue('Remote');
    expect(screen.getByLabelText('Start date')).toHaveValue('2022-01-01');
    expect(screen.getByRole('checkbox', { name: 'Current' })).toBeChecked();
    expect(screen.getByLabelText('End date')).toBeDisabled();
    expect(screen.getByLabelText('Description')).toHaveValue('APIs');
  });

  it('reports field edits through onChange', () => {
    const onChange = jest.fn();
    render(<ExperienceForm title="New experience" value={emptyExperienceDraft()} onChange={onChange} onSubmit={jest.fn()} />);

    fireEvent.change(screen.getByLabelText('Company'), { target: { value: 'Initech' } });

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ company: 'Initech' }));
  });

  it('submits through onSubmit and offers cancel only when given', () => {
    const onSubmit = jest.fn();
    const onCancel = jest.fn();
    const { rerender } = render(
      <ExperienceForm title="New experience" value={draft} onChange={jest.fn()} onSubmit={onSubmit} />,
    );
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);

    rerender(
      <ExperienceForm title="Edit experience" value={draft} onChange={jest.fn()} onSubmit={onSubmit} onCancel={onCancel} />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
