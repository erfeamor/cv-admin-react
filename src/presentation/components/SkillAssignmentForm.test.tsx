import { fireEvent, render, screen, within } from '@testing-library/react';
import { Skill } from '../../domain/skill';
import SkillAssignmentForm from './SkillAssignmentForm';

// Served order (not alphabetical) — the picker must not re-sort.
const catalog: Skill[] = [
  { id: '5', name: 'Zig', category: null },
  { id: '2', name: 'Java', category: 'Language' },
];

describe('SkillAssignmentForm', () => {
  it('offers the catalog in the order served', () => {
    render(
      <SkillAssignmentForm
        catalog={catalog}
        value={{ skillId: '', proficiency: 'INTERMEDIATE' }}
        onChange={jest.fn()}
        onSubmit={jest.fn()}
      />,
    );

    const options = within(screen.getByLabelText('Skill')).getAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual(['Choose a skill…', 'Zig', 'Java (Language)']);
  });

  it('offers exactly the four proficiency enum values', () => {
    render(
      <SkillAssignmentForm
        catalog={catalog}
        value={{ skillId: '5', proficiency: 'INTERMEDIATE' }}
        onChange={jest.fn()}
        onSubmit={jest.fn()}
      />,
    );

    const options = within(screen.getByLabelText('Proficiency')).getAllByRole('option') as HTMLOptionElement[];
    expect(options.map((option) => option.value)).toEqual(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']);
  });

  it('reports picks through onChange and submits', () => {
    const onChange = jest.fn();
    const onSubmit = jest.fn();
    render(
      <SkillAssignmentForm
        catalog={catalog}
        value={{ skillId: '5', proficiency: 'INTERMEDIATE' }}
        onChange={onChange}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText('Proficiency'), { target: { value: 'EXPERT' } });
    expect(onChange).toHaveBeenCalledWith({ skillId: '5', proficiency: 'EXPERT' });

    fireEvent.click(screen.getByRole('button', { name: 'Assign' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
