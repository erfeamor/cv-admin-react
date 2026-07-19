import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import { usePeopleStore } from './store';

describe('App', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    // Unmount before resetting the store: RTL's auto-cleanup runs after this
    // hook, so without an explicit cleanup() the setState re-renders the
    // still-mounted page outside act().
    cleanup();
    global.fetch = originalFetch;
    sessionStorage.clear();
    usePeopleStore.setState({ people: [], selectedPerson: null, loading: false, error: null });
  });

  it('shows the sign-in screen when unauthenticated', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Admin sign in' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('renders the people list page at / once authenticated', async () => {
    sessionStorage.setItem('cv-admin.token', 'test-token');
    sessionStorage.setItem('cv-admin.tokenExpiresAt', String(Date.now() + 60_000));
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [],
    });

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'People' })).toBeInTheDocument();
    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toMatch(/\/api\/v1\/people$/);
    expect(options.headers.Authorization).toBe('Bearer test-token');
  });
});
