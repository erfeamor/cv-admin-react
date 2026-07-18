import { fireEvent, render, screen } from '@testing-library/react';
import { emptyPersonInput, PersonInput } from '../../domain/person';
import PersonForm from './PersonForm';

describe('PersonForm', () => {
  it('renders the title and all fields from the value', () => {
    const value: PersonInput = {
      fullName: 'Jane Doe',
      headline: 'Engineer',
      email: 'jane@example.com',
      location: 'Madrid',
      summary: 'Seed person',
    };

    render(<PersonForm title="Edit person" value={value} onChange={jest.fn()} onSubmit={jest.fn()} />);

    expect(screen.getByRole('heading', { name: 'Edit person' })).toBeInTheDocument();
    expect(screen.getByLabelText('Full name')).toHaveValue('Jane Doe');
    expect(screen.getByLabelText('Headline')).toHaveValue('Engineer');
    expect(screen.getByLabelText('Email')).toHaveValue('jane@example.com');
    expect(screen.getByLabelText('Location')).toHaveValue('Madrid');
    expect(screen.getByLabelText('Summary')).toHaveValue('Seed person');
  });

  it('reports field edits through onChange', () => {
    const onChange = jest.fn();

    render(
      <PersonForm title="New person" value={emptyPersonInput()} onChange={onChange} onSubmit={jest.fn()} />,
    );

    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Jane' } });

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ fullName: 'Jane' }));
  });

  it('submits through onSubmit', () => {
    const onSubmit = jest.fn();
    const value: PersonInput = { ...emptyPersonInput(), fullName: 'Jane', email: 'jane@example.com' };

    render(<PersonForm title="New person" value={value} onChange={jest.fn()} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
