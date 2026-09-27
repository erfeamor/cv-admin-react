import { fireEvent, render, screen } from '@testing-library/react';
import { PeriodDraft } from '../../domain/draft';
import PeriodFields from './PeriodFields';

const dated: PeriodDraft = { startDate: '2022-01-01', endDate: '2023-06-30', current: false };

describe('PeriodFields', () => {
  it('renders start and end dates with "Current" unchecked for a dated period', () => {
    render(<PeriodFields value={dated} onChange={jest.fn()} />);

    expect(screen.getByLabelText('Start date')).toHaveValue('2022-01-01');
    expect(screen.getByLabelText('End date')).toHaveValue('2023-06-30');
    expect(screen.getByLabelText('End date')).toBeEnabled();
    expect(screen.getByRole('checkbox', { name: 'Current' })).not.toBeChecked();
  });

  it('disables the end date while "Current" is checked', () => {
    render(<PeriodFields value={{ startDate: '2022-01-01', endDate: '', current: true }} onChange={jest.fn()} />);

    expect(screen.getByRole('checkbox', { name: 'Current' })).toBeChecked();
    expect(screen.getByLabelText('End date')).toBeDisabled();
  });

  it('checking "Current" clears the end date through onChange', () => {
    const onChange = jest.fn();
    render(<PeriodFields value={dated} onChange={onChange} />);

    fireEvent.click(screen.getByRole('checkbox', { name: 'Current' }));

    expect(onChange).toHaveBeenCalledWith({ startDate: '2022-01-01', endDate: '', current: true });
  });

  it('reports date edits through onChange', () => {
    const onChange = jest.fn();
    render(<PeriodFields value={dated} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('End date'), { target: { value: '2024-01-31' } });

    expect(onChange).toHaveBeenCalledWith({ ...dated, endDate: '2024-01-31' });
  });
});

describe('PeriodFields startRequired', () => {
  it('marks Start date aria-required only when asked', () => {
    const { rerender } = render(<PeriodFields value={dated} onChange={jest.fn()} startRequired />);
    expect(screen.getByLabelText('Start date')).toHaveAttribute('aria-required', 'true');

    rerender(<PeriodFields value={dated} onChange={jest.fn()} />);
    expect(screen.getByLabelText('Start date')).not.toHaveAttribute('aria-required');
  });
});
