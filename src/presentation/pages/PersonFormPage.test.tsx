import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { usePeopleStore } from '../../store';
import PersonFormPage from './PersonFormPage';

const jane = {
  id: '1',
  fullName: 'Jane Doe',
  headline: 'Engineer',
  email: 'jane@example.com',
  location: 'Madrid',
  summary: 'Seed person',
};

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/people/new" element={<PersonFormPage />} />
        <Route path="/people/:id" element={<PersonFormPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

function resetStore() {
  usePeopleStore.setState({ people: [], selectedPerson: null, loading: false, error: null });
}

describe('PersonFormPage', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    resetStore();
  });

  it('renders empty fields for a new person and does not fetch', () => {
    global.fetch = jest.fn();

    renderAt('/people/new');

    expect(screen.getByRole('heading', { name: 'New person' })).toBeInTheDocument();
    expect(screen.getByLabelText('Full name')).toHaveValue('');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('loads the person into the form when the API returns numeric ids', async () => {
    // Regression: the deployed Java service sends "id": 1 (number); the form
    // sync guard compares against the string URL param and must still match.
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ...jane, id: 1 }),
    });

    renderAt('/people/1');

    await waitFor(() => expect(screen.getByLabelText('Full name')).toHaveValue('Jane Doe'));
  });

  it('loads the existing person into the form when editing', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => jane });

    renderAt('/people/1');

    const nameInput = screen.getByLabelText('Full name');
    await waitFor(() => expect(nameInput).toHaveValue('Jane Doe'));
    expect(screen.getByLabelText('Headline')).toHaveValue('Engineer');
    expect(screen.getByLabelText('Email')).toHaveValue('jane@example.com');
    expect(screen.getByLabelText('Location')).toHaveValue('Madrid');
    expect(screen.getByLabelText('Summary')).toHaveValue('Seed person');

    const [url] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toMatch(/\/api\/v1\/people\/1$/);
  });

  it('preloads the form from the store cache before the fetch resolves', () => {
    usePeopleStore.setState({ people: [jane] });
    // A fetch that never resolves: only the cached preload can fill the form.
    global.fetch = jest.fn().mockReturnValue(new Promise(() => undefined));

    renderAt('/people/1');

    expect(screen.getByLabelText('Full name')).toHaveValue('Jane Doe');
  });

  it('shows an alert when the person fails to load', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404 });

    renderAt('/people/999');

    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to load person');
  });

  it('submits edits with PUT and shows a save error on failure', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => jane })
      .mockResolvedValueOnce({ ok: false, status: 400 });

    renderAt('/people/1');

    const nameInput = screen.getByLabelText('Full name');
    await waitFor(() => expect(nameInput).toHaveValue('Jane Doe'));
    fireEvent.change(nameInput, { target: { value: 'Jane Smith' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to save person');
    const [url, options] = (global.fetch as jest.Mock).mock.calls[1];
    expect(url).toMatch(/\/api\/v1\/people\/1$/);
    expect(options.method).toBe('PUT');
    expect(JSON.parse(options.body).fullName).toBe('Jane Smith');
  });
});
