import { render, screen } from '@testing-library/react';
import ProblemsAlert from './ProblemsAlert';

describe('ProblemsAlert', () => {
  it('renders nothing without problems', () => {
    render(<ProblemsAlert problems={[]} />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('lists every problem in one alert', () => {
    render(<ProblemsAlert problems={['Company is required.', 'Role is required.']} />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Company is required.');
    expect(alert).toHaveTextContent('Role is required.');
  });
});
