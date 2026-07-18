import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { usePeopleStore } from '../../store';
import PeopleListPage from './PeopleListPage';

function resetStore() {
  usePeopleStore.setState({ people: [], selectedPerson: null, loading: false, error: null });
}

describe('PeopleListPage', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    resetStore();
  });

  it('loads and lists people as edit links', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [
        { id: '1', fullName: 'Jane Doe', email: 'jane@example.com' },
        { id: '2', fullName: 'John Roe', email: 'john@example.com' },
      ],
    });

    render(
      <MemoryRouter>
        <PeopleListPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('link', { name: 'Jane Doe' })).toHaveAttribute('href', '/people/1');
    expect(screen.getByRole('link', { name: 'John Roe' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'New person' })).toHaveAttribute('href', '/people/new');
  });

  it('shows an alert when loading fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 });

    render(
      <MemoryRouter>
        <PeopleListPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to load people');
  });
});
