import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { createSectionStore } from '../../application/sectionStore';
import { emptyExperienceDraft, Experience, ExperienceInput, fromExperienceDraft, toExperienceDraft } from '../../domain/experience';
import { ExperienceRepository } from '../../domain/ports';
import ExperienceForm from '../components/ExperienceForm';
import SectionPage, { formatPeriod } from './SectionPage';

// The generic page is exercised through a real section store over a fake
// repository port — no fetch, no composition root.
const row = (id: string, company: string): Experience => ({
  id,
  company,
  role: 'Engineer',
  location: null,
  startDate: '2022-01-01',
  endDate: null,
  description: null,
});

function setup(overrides: Partial<ExperienceRepository> = {}) {
  const repository: ExperienceRepository = {
    list: jest.fn(async (personId: string) => (personId === '7' ? [row('1', 'ACME')] : [row('2', 'Initech')])),
    create: jest.fn(async (_personId: string, input: ExperienceInput) => ({ id: '9', ...input })),
    update: jest.fn(async (_personId: string, id: string, input: ExperienceInput) => ({ id, ...input })),
    remove: jest.fn(async () => undefined),
    ...overrides,
  };
  const useStore = createSectionStore(repository);
  function Page() {
    return (
      <SectionPage
        heading="Things"
        noun="thing"
        useStore={useStore}
        emptyDraft={emptyExperienceDraft}
        toDraft={toExperienceDraft}
        fromDraft={fromExperienceDraft}
        name={(entity) => entity.company}
        details={(entity) => formatPeriod(entity.startDate, entity.endDate)}
        Form={ExperienceForm}
      />
    );
  }
  render(
    <MemoryRouter initialEntries={['/people/7/things']}>
      <Routes>
        <Route
          path="/people/:id/things"
          element={
            <>
              <Link to="/people/8/things">Other person</Link>
              <Page />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
  return { repository, useStore };
}

describe('formatPeriod', () => {
  it('formats dated, current, end-only and undated periods', () => {
    expect(formatPeriod('2022-01-01', '2023-01-01')).toBe('2022-01-01 – 2023-01-01');
    expect(formatPeriod('2022-01-01', null)).toBe('2022-01-01 – current');
    expect(formatPeriod(null, '2025-01-01')).toBe('until 2025-01-01');
    expect(formatPeriod(null, null)).toBe('');
  });
});

describe('SectionPage', () => {
  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
  });

  it('loads for the route person, links back to the hub, and lists rows', async () => {
    const { repository } = setup();

    expect(await screen.findByText('ACME')).toBeInTheDocument();
    expect(repository.list).toHaveBeenCalledWith('7');
    expect(screen.getByRole('link', { name: 'Back to CV sections' })).toHaveAttribute('href', '/people/7/sections');
    expect(screen.getByRole('heading', { level: 1, name: 'Things' })).toBeInTheDocument();
  });

  it('resets the edit form when the route person changes', async () => {
    setup();
    fireEvent.click(await screen.findByRole('button', { name: 'Edit ACME' }));
    expect(screen.getByRole('heading', { name: 'Edit thing' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('link', { name: 'Other person' }));

    expect(await screen.findByText('Initech')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'New thing' })).toBeInTheDocument();
    expect(screen.getByLabelText('Company')).toHaveValue('');
  });

  it('Cancel leaves edit mode and clears the problems', async () => {
    setup();
    fireEvent.click(await screen.findByRole('button', { name: 'Edit ACME' }));
    fireEvent.change(screen.getByLabelText('Company'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Company is required.');

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'New thing' })).toBeInTheDocument();
  });

  it('shows a non-blocking notice, not the load alert, when the re-read after a save fails', async () => {
    const { repository } = setup();
    await screen.findByText('ACME');
    (repository.list as jest.Mock).mockRejectedValue(new Error('flaky'));

    fireEvent.change(screen.getByLabelText('Company'), { target: { value: 'Globex' } });
    fireEvent.change(screen.getByLabelText('Role'), { target: { value: 'CTO' } });
    fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2025-01-01' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Current' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('status')).toHaveTextContent('Saved, but the list could not be refreshed');
    await waitFor(() => expect(screen.getByText('Globex')).toBeInTheDocument());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('ACME')).toBeInTheDocument();
  });

  it('shows the empty state once loaded with no rows', async () => {
    setup({ list: jest.fn().mockResolvedValue([]) });

    expect(await screen.findByText('No thing entries yet.')).toBeInTheDocument();
  });
});
