import { fireEvent, render, screen } from '@testing-library/react';
import { EducationDraft } from '../../domain/education';
import EducationForm from './EducationForm';

const draft: EducationDraft = {
  institution: 'UNED',
  degree: 'BSc',
  fieldOfStudy: 'Computer Science',
  startDate: '2015-09-01',
  endDate: '2019-06-30',
  current: false,
};

describe('EducationForm', () => {
  it('renders every field from the draft and reports edits', () => {
    const onChange = jest.fn();
    render(<EducationForm title="Edit education" value={draft} onChange={onChange} onSubmit={jest.fn()} />);

    expect(screen.getByRole('heading', { name: 'Edit education' })).toBeInTheDocument();
    expect(screen.getByLabelText('Institution')).toHaveValue('UNED');
    expect(screen.getByLabelText('Degree')).toHaveValue('BSc');
    expect(screen.getByLabelText('Field of study')).toHaveValue('Computer Science');
    expect(screen.getByLabelText('End date')).toHaveValue('2019-06-30');
    expect(screen.getByRole('checkbox', { name: 'Current' })).not.toBeChecked();

    fireEvent.change(screen.getByLabelText('Degree'), { target: { value: 'MSc' } });
    expect(onChange).toHaveBeenCalledWith({ ...draft, degree: 'MSc' });
  });

  it('submits through onSubmit', () => {
    const onSubmit = jest.fn();
    render(<EducationForm title="New education" value={draft} onChange={jest.fn()} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
