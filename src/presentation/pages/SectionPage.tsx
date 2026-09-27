import { ComponentType, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { SectionState } from '../../application/sectionStore';
import { DraftResult } from '../../domain/draft';
import { errorStatus } from '../../domain/errors';
import { describeWriteFailure } from '../errorMessages';
import styles from './SectionPage.module.css';

export interface SectionFormProps<TDraft> {
  title: string;
  value: TDraft;
  onChange: (value: TDraft) => void;
  onSubmit: () => void;
  onCancel?: () => void;
}

interface SectionPageProps<TEntity extends { id: string }, TInput, TDraft> {
  /** Page heading, e.g. "Experience". */
  heading: string;
  /** Singular noun for titles and messages, e.g. "experience". */
  noun: string;
  useStore: () => SectionState<TEntity, TInput>;
  emptyDraft: () => TDraft;
  toDraft: (entity: TEntity) => TDraft;
  fromDraft: (draft: TDraft) => DraftResult<TInput>;
  /** Short name for a row — used in the list and in button labels. */
  name: (entity: TEntity) => string;
  /** Secondary line for a row (dates). */
  details: (entity: TEntity) => string;
  Form: ComponentType<SectionFormProps<TDraft>>;
}

/** "2022-01-01 – current" for a null end date (contract rule 3). */
export function formatPeriod(startDate: string | null, endDate: string | null): string {
  const end = endDate ?? 'current';
  return startDate ? `${startDate} – ${end}` : endDate ? `until ${endDate}` : 'current';
}

/**
 * Shared list + create/edit + delete page for a person-scoped section. The
 * thin route pages (ExperiencesPage, …) bind it to a store hook, the domain
 * draft helpers and their form. Rows render in store order, which is server
 * order — never sorted here.
 */
export default function SectionPage<TEntity extends { id: string }, TInput, TDraft>({
  heading,
  noun,
  useStore,
  emptyDraft,
  toDraft,
  fromDraft,
  name,
  details,
  Form,
}: SectionPageProps<TEntity, TInput, TDraft>) {
  const { id: personId = '' } = useParams();
  const { items, loading, error, load, save, remove } = useStore();
  const [draft, setDraft] = useState<TDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [problems, setProblems] = useState<string[]>([]);

  useEffect(() => {
    void load(personId);
  }, [personId, load]);

  function resetForm() {
    setEditingId(null);
    setDraft(emptyDraft());
  }

  function startEdit(entity: TEntity) {
    setEditingId(entity.id);
    setDraft(toDraft(entity));
    setProblems([]);
  }

  async function handleSubmit() {
    const result = fromDraft(draft);
    if (!result.ok) {
      setProblems(result.errors);
      return;
    }
    try {
      await save(result.value, editingId ?? undefined);
      setProblems([]);
      resetForm();
    } catch (err) {
      setProblems([describeWriteFailure(err, noun)]);
      if (errorStatus(err) === 404) {
        resetForm();
      }
    }
  }

  async function handleDelete(entity: TEntity) {
    if (!window.confirm(`Delete ${name(entity)}?`)) {
      return;
    }
    try {
      await remove(entity.id);
      setProblems([]);
    } catch (err) {
      setProblems([describeWriteFailure(err, noun, 'delete')]);
    }
    if (editingId === entity.id) {
      resetForm();
    }
  }

  return (
    <section className={styles.page}>
      <Link to={`/people/${personId}/sections`}>Back to CV sections</Link>
      <h1>{heading}</h1>
      {error && <p role="alert">Failed to load {noun} entries: {error}</p>}
      {loading && items.length === 0 && <p>Loading…</p>}
      {!loading && !error && items.length === 0 && <p>No {noun} entries yet.</p>}
      <ul className={styles.list} aria-label={`${heading} entries`}>
        {items.map((entity) => (
          <li key={entity.id}>
            <span className={styles.summary}>
              {name(entity)}
              <span className={styles.meta}>{details(entity)}</span>
            </span>
            <button type="button" className={styles.rowButton} aria-label={`Edit ${name(entity)}`} onClick={() => startEdit(entity)}>
              Edit
            </button>
            <button
              type="button"
              className={styles.rowButton}
              aria-label={`Delete ${name(entity)}`}
              onClick={() => void handleDelete(entity)}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
      {problems.length > 0 && (
        <div role="alert">
          <ul className={styles.problems}>
            {problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        </div>
      )}
      <Form
        title={editingId ? `Edit ${noun}` : `New ${noun}`}
        value={draft}
        onChange={setDraft}
        onSubmit={() => void handleSubmit()}
        onCancel={editingId ? () => { resetForm(); setProblems([]); } : undefined}
      />
    </section>
  );
}
