import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useSkillsStore } from '../../store';
import { FakeResponse, mockFetch, recordedRequests } from '../../testing/mockFetch';
import SkillsPage from './SkillsPage';

const CATALOG = '/api/v1/skills';
const ASSIGNED = '/api/v1/people/7/skills';

// Served orders, deliberately not alphabetical / id order.
const catalog = [
  { id: 5, name: 'Zig', category: null },
  { id: 2, name: 'Java', category: 'Language' },
];
const zig = { skillId: 5, name: 'Zig', category: null, proficiency: 'BEGINNER' };
const git = { skillId: 1, name: 'Git', category: 'Tool', proficiency: 'EXPERT' };

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/people/7/skills']}>
      <Routes>
        <Route path="/people/:id/skills" element={<SkillsPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

function assignedRows() {
  return within(screen.getByRole('list', { name: 'Assigned skills' }))
    .getAllByRole('listitem')
    .map((row) => row.textContent);
}

function serve(extra: (method: string, path: string) => FakeResponse | undefined = () => undefined, assigned: unknown[] = [zig, git]) {
  return mockFetch((method, path) => {
    const handled = extra(method, path);
    if (handled) return handled;
    if (method === 'GET' && path === CATALOG) return { status: 200, body: catalog };
    if (method === 'GET' && path === ASSIGNED) return { status: 200, body: assigned };
    return undefined;
  });
}

describe('SkillsPage', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    cleanup();
    global.fetch = originalFetch;
    jest.restoreAllMocks();
    useSkillsStore.setState({ personId: null, catalog: [], assignments: [], loading: false, error: null, notice: null });
  });

  it('renders the assigned skills and the catalog picker in the order served', async () => {
    serve();

    renderPage();

    await screen.findByRole('button', { name: 'Remove Zig' });
    expect(assignedRows()).toEqual([expect.stringMatching(/^Zig — Beginner/), expect.stringMatching(/^Git \(Tool\) — Expert/)]);
    const options = within(screen.getByLabelText('Skill')).getAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual(['Choose a skill…', 'Zig', 'Java (Language)']);
    expect(
      (within(screen.getByLabelText('Proficiency')).getAllByRole('option') as HTMLOptionElement[]).map((o) => o.value),
    ).toEqual(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']);
  });

  it('assigns a new skill with PUT {proficiency} and shows it in server order', async () => {
    const java = { skillId: 2, name: 'Java', category: 'Language', proficiency: 'ADVANCED' };
    let assigned: unknown[] = [zig, git];
    const fetchMock = mockFetch((method, path) => {
      if (method === 'GET' && path === CATALOG) return { status: 200, body: catalog };
      if (method === 'GET' && path === ASSIGNED) return { status: 200, body: assigned };
      if (method === 'PUT' && path === `${ASSIGNED}/2`) {
        assigned = [java, zig, git];
        return { status: 200, body: java };
      }
      return undefined;
    });

    renderPage();
    await screen.findByRole('button', { name: 'Remove Zig' });
    fireEvent.change(screen.getByLabelText('Skill'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Proficiency'), { target: { value: 'ADVANCED' } });
    fireEvent.click(screen.getByRole('button', { name: 'Assign' }));

    await waitFor(() => expect(assignedRows()[0]).toMatch(/^Java \(Language\) — Advanced/));
    expect(recordedRequests(fetchMock, 'PUT')[0].body).toEqual({ proficiency: 'ADVANCED' });
  });

  it('re-assigning updates the entry in place — one row per skill', async () => {
    serve((method, path) =>
      method === 'PUT' && path === `${ASSIGNED}/5` ? { status: 200, body: { ...zig, proficiency: 'EXPERT' } } : undefined,
    );

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Change Zig' }));
    expect(screen.getByLabelText('Skill')).toHaveValue('5');
    fireEvent.change(screen.getByLabelText('Proficiency'), { target: { value: 'EXPERT' } });
    fireEvent.click(screen.getByRole('button', { name: 'Assign' }));

    await waitFor(() => expect(assignedRows()[0]).toMatch(/^Zig — Expert/));
    expect(assignedRows()).toHaveLength(2);
  });

  it('asks for a skill before assigning', async () => {
    const fetchMock = serve();

    renderPage();
    await screen.findByRole('button', { name: 'Remove Zig' });
    fireEvent.click(screen.getByRole('button', { name: 'Assign' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Choose a skill to assign.');
    expect(recordedRequests(fetchMock, 'PUT')).toHaveLength(0);
  });

  it('unassigns with DELETE (204)', async () => {
    const fetchMock = serve((method, path) => (method === 'DELETE' && path === `${ASSIGNED}/5` ? { status: 204 } : undefined));

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Remove Zig' }));

    await waitFor(() => expect(assignedRows()).toEqual([expect.stringMatching(/^Git/)]));
    expect(recordedRequests(fetchMock, 'DELETE')).toHaveLength(1);
  });

  it('an unassign answered 404 shows an error and leaves no stale row', async () => {
    serve((method) => (method === 'DELETE' ? { status: 404, body: 'Not found' } : undefined));

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Remove Zig' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Zig is no longer assigned');
    expect(assignedRows()).toEqual([expect.stringMatching(/^Git/)]);
  });

  it('creates a catalog skill (blank category → null), re-reads the catalog and selects it', async () => {
    let served = catalog;
    const fetchMock = mockFetch((method, path) => {
      if (method === 'GET' && path === CATALOG) return { status: 200, body: served };
      if (method === 'GET' && path === ASSIGNED) return { status: 200, body: [zig] };
      if (method === 'POST' && path === CATALOG) {
        served = [catalog[1], { id: 9, name: 'Rust', category: null }, catalog[0]];
        return { status: 201, body: { id: 9, name: 'Rust', category: null } };
      }
      return undefined;
    });

    renderPage();
    await screen.findByRole('button', { name: 'Remove Zig' });
    fireEvent.change(screen.getByLabelText('Skill name'), { target: { value: 'Rust' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add to catalog' }));

    await waitFor(() => expect(screen.getByLabelText('Skill')).toHaveValue('9'));
    expect(recordedRequests(fetchMock, 'POST')[0].body).toEqual({ name: 'Rust', category: null });
    const options = within(screen.getByLabelText('Skill')).getAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual(['Choose a skill…', 'Java (Language)', 'Rust', 'Zig']);
    expect(screen.getByLabelText('Skill name')).toHaveValue('');
  });

  it('a duplicate catalog name (409) gets its own message', async () => {
    serve((method, path) => (method === 'POST' && path === CATALOG ? { status: 409, body: 'Duplicate' } : undefined));

    renderPage();
    await screen.findByRole('button', { name: 'Remove Zig' });
    fireEvent.change(screen.getByLabelText('Skill name'), { target: { value: 'Java' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add to catalog' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'A skill named "Java" already exists in the catalog — pick it from the list instead.',
    );
    expect(screen.getByLabelText('Skill name')).toHaveValue('Java');
  });

  it('shows an alert when loading fails', async () => {
    mockFetch(() => ({ status: 500 }));

    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to load skills');
  });
});
