import { fireEvent, render, screen } from '@testing-library/react';
import NewSkillForm from './NewSkillForm';

describe('NewSkillForm', () => {
  it('renders name and category, reports edits and submits', () => {
    const onChange = jest.fn();
    const onSubmit = jest.fn();
    render(<NewSkillForm value={{ name: 'Rust', category: '' }} onChange={onChange} onSubmit={onSubmit} />);

    expect(screen.getByLabelText('Skill name')).toHaveValue('Rust');
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'Language' } });
    expect(onChange).toHaveBeenCalledWith({ name: 'Rust', category: 'Language' });

    fireEvent.click(screen.getByRole('button', { name: 'Add to catalog' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
