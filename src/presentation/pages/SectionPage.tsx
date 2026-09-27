import { ComponentType, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { SectionState } from '../../application/sectionStore';
import { DraftResult } from '../../domain/draft';
import { errorStatus } from '../../domain/errors';
import ProblemsAlert from '../components/ProblemsAlert';
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
  /** Secondary line for a row (dates); an empty string renders no line. */
  details: (entity: TEntity) => string;
  Form: ComponentType<SectionFormProps<TDraft>>;
}

/**
 * "2022-01-01 – current" for a null end date (contract rule 3); an undated
 * project (both null) gets no period at all, as on the public sites.
 */
export function formatPeriod(startDate: string | null, endDate: string | null): string {
  if (startDate) {
    return `${startDate} – ${endDate ?? 'current'}`;
  }
  return endDate ? `until ${endDate}` : '';
}

/**
 * Shared list + create/edit + delete page for a person-scoped section. The
 * thin route pages (ExperiencesPage, …) bind it to a store hook, the domain
 * draft helpers and their form. Rows render in store order, which is server
 * order — never sorted here. Keyed by person so local form state resets when
 * `:id` changes. The form and Delete buttons are disabled while the list loads.
 */
export default function SectionPage<TEntity extends { id: string }, TInput, TDraft>(
  props: SectionPageProps<TEntity, TInput, TDraft>,
) {
  const { id: personId = '' } = useParams();
  return <SectionPageBody key={personId} personId={personId} {...props} />;
}

function SectionPageBody<TEntity extends { id: string }, TInput, TDraft>({
  personId,
  heading,
  noun,
  useStore,
  emptyDraft,
  toDraft,
  fromDraft,
  name,
  details,
  Form,
}: SectionPageProps<TEntity, TInput, TDraft> & { personId: string }) {
  const { items, loading, error, notice, load, save, remove } = useStore();
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
      setProblems([describeWriteFailure(err, noun, editingId ? 'update' : 'create')]);
      // An update's 404 means the row is gone: leave edit mode. A create's
      // 404 is the person — keep the draft so nothing typed is lost.
      if (editingId && errorStatus(err) === 404) {
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
      {notice && <p role="status">{notice}</p>}
      {loading && items.length === 0 && <p>Loading…</p>}
      {!loading && !error && items.length === 0 && <p>No {noun} entries yet.</p>}
      <ul className={styles.list} aria-label={`${heading} entries`}>
        {items.map((entity) => {
          const period = details(entity);
          return (
            <li key={entity.id}>
              <span className={styles.summary}>
                {name(entity)}
                {period && <span className={styles.meta}>{period}</span>}
              </span>
              <button
                type="button"
                className={styles.rowButton}
                aria-label={`Edit ${name(entity)}`}
                onClick={() => startEdit(entity)}
              >
                Edit
              </button>
              <button
                type="button"
                className={styles.rowButton}
                aria-label={`Delete ${name(entity)}`}
                disabled={loading}
                onClick={() => void handleDelete(entity)}
              >
                Delete
              </button>
            </li>
          );
        })}
      </ul>
      <ProblemsAlert problems={problems} />
      {/* Writes wait for the load: the store refuses them mid-load anyway. */}
      <fieldset className={styles.writes} disabled={loading}>
        <Form
          title={editingId ? `Edit ${noun}` : `New ${noun}`}
          value={draft}
          onChange={setDraft}
          onSubmit={() => void handleSubmit()}
          onCancel={
            editingId
              ? () => {
                  resetForm();
                  setProblems([]);
                }
              : undefined
          }
        />
      </fieldset>
    </section>
  );
}
