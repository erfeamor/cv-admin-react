import { fireEvent, render, screen } from '@testing-library/react';
import ConflictAlert from './ConflictAlert';

describe('ConflictAlert', () => {
  it('says the entry changed elsewhere, that the edits were kept but not saved, and what Reload discards', () => {
    render(<ConflictAlert onReload={jest.fn()} />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('This entry was changed elsewhere.');
    expect(alert).toHaveTextContent('Your edits are still in the form, but they were not saved.');
    expect(alert).toHaveTextContent('Reloading loads the latest version and discards your unsaved edits.');
  });

  it('calls onReload from the Reload button', () => {
    const onReload = jest.fn();
    render(<ConflictAlert onReload={onReload} />);

    fireEvent.click(screen.getByRole('button', { name: 'Reload and discard my edits' }));

    expect(onReload).toHaveBeenCalledTimes(1);
  });

  it('disables Reload while a reload is in flight', () => {
    render(<ConflictAlert onReload={jest.fn()} disabled />);

    expect(screen.getByRole('button', { name: 'Reload and discard my edits' })).toBeDisabled();
  });
});
