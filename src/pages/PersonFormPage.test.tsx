import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { CognitoProvider } from '../auth/CognitoContext';
import PersonFormPage from './PersonFormPage';

function renderAt(path: string) {
  return render(
    <CognitoProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/people/new" element={<PersonFormPage />} />
          <Route path="/people/:id" element={<PersonFormPage />} />
        </Routes>
      </MemoryRouter>
    </CognitoProvider>,
  );
}

describe('PersonFormPage', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    sessionStorage.setItem('cv-admin.token', 'test-token');
    sessionStorage.setItem('cv-admin.tokenExpiresAt', String(Date.now() + 60_000));
  });

  afterEach(() => {
    global.fetch = originalFetch;
    sessionStorage.clear();
  });

  it('renders empty fields for a new person and does not fetch', () => {
    global.fetch = jest.fn();

    renderAt('/people/new');

    expect(screen.getByRole('heading', { name: 'New person' })).toBeInTheDocument();
    expect(screen.getByLabelText('Full name')).toHaveValue('');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('loads the existing person into the form when editing', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        id: '1',
        fullName: 'Jane Doe',
        headline: 'Engineer',
        email: 'jane@example.com',
        location: 'Madrid',
        summary: 'Seed person',
      }),
    });

    renderAt('/people/1');

    const nameInput = screen.getByLabelText('Full name');
    await waitFor(() => expect(nameInput).toHaveValue('Jane Doe'));
    expect(screen.getByLabelText('Headline')).toHaveValue('Engineer');
    expect(screen.getByLabelText('Email')).toHaveValue('jane@example.com');
    expect(screen.getByLabelText('Location')).toHaveValue('Madrid');
    expect(screen.getByLabelText('Summary')).toHaveValue('Seed person');

    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toMatch(/\/api\/v1\/people\/1$/);
    expect(options.headers.Authorization).toBe('Bearer test-token');
  });

  it('shows an alert when the person fails to load', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404 });

    renderAt('/people/999');

    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to load person');
  });

  it('submits edits with PUT to the person endpoint', async () => {
    const person = {
      id: '1',
      fullName: 'Jane Doe',
      headline: 'Engineer',
      email: 'jane@example.com',
      location: 'Madrid',
      summary: 'Seed person',
    };
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => person })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => person });

    renderAt('/people/1');

    const nameInput = screen.getByLabelText('Full name');
    await waitFor(() => expect(nameInput).toHaveValue('Jane Doe'));
    fireEvent.change(nameInput, { target: { value: 'Jane Smith' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
    const [url, options] = (global.fetch as jest.Mock).mock.calls[1];
    expect(url).toMatch(/\/api\/v1\/people\/1$/);
    expect(options.method).toBe('PUT');
    expect(JSON.parse(options.body).fullName).toBe('Jane Smith');
  });
});
