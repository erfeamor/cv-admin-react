import { fireEvent, render, screen } from '@testing-library/react';
import FormActions from './FormActions';

describe('FormActions', () => {
  it('renders a submit Save button and no Cancel without onCancel', () => {
    render(<FormActions />);

    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('type', 'submit');
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
  });

  it('renders a non-submitting Cancel that calls onCancel', () => {
    const onCancel = jest.fn();
    render(<FormActions onCancel={onCancel} />);

    const cancel = screen.getByRole('button', { name: 'Cancel' });
    expect(cancel).toHaveAttribute('type', 'button');
    fireEvent.click(cancel);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
