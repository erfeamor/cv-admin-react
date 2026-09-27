import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { errorStatus } from '../../domain/errors';
import { emptySkillDraft, fromSkillDraft, PersonSkill, SkillAssignmentDraft, SkillDraft } from '../../domain/skill';
import { useSkillsStore } from '../../store';
import NewSkillForm from '../components/NewSkillForm';
import ProblemsAlert from '../components/ProblemsAlert';
import SkillAssignmentForm from '../components/SkillAssignmentForm';
import { describeWriteFailure } from '../errorMessages';
import { PROFICIENCY_LABELS } from '../proficiencyLabels';
import styles from './SectionPage.module.css';

const EMPTY_ASSIGNMENT: SkillAssignmentDraft = { skillId: '', proficiency: 'INTERMEDIATE' };

/**
 * Skills differ from the other sections: pick from the global catalog (or
 * add to it), set a proficiency, and unassign. Assign is the contract's PUT
 * upsert, so re-assigning an assigned skill updates it in place.
 */
export default function SkillsPage() {
  const { id: personId = '' } = useParams();
  // Keyed by person so the pickers' local state resets when :id changes.
  return <SkillsPageBody key={personId} personId={personId} />;
}

function SkillsPageBody({ personId }: { personId: string }) {
  const { catalog, assignments, loading, error, notice, load, createSkill, assign, unassign } = useSkillsStore();
  const [assignment, setAssignment] = useState<SkillAssignmentDraft>(EMPTY_ASSIGNMENT);
  const [newSkill, setNewSkill] = useState<SkillDraft>(emptySkillDraft);
  const [problems, setProblems] = useState<string[]>([]);

  useEffect(() => {
    void load(personId);
  }, [personId, load]);

  async function handleAssign() {
    if (!assignment.skillId) {
      setProblems(['Choose a skill to assign.']);
      return;
    }
    try {
      await assign(assignment.skillId, assignment.proficiency);
      setProblems([]);
      setAssignment(EMPTY_ASSIGNMENT);
    } catch (err) {
      setProblems([
        errorStatus(err) === 404
          ? 'That skill or person no longer exists — reload the page to refresh the catalog.'
          : describeWriteFailure(err, 'skill assignment'),
      ]);
    }
  }

  async function handleUnassign(entry: PersonSkill) {
    if (!window.confirm(`Remove ${entry.name} from this person's skills?`)) {
      return;
    }
    try {
      await unassign(entry.skillId);
      setProblems([]);
    } catch (err) {
      setProblems([
        errorStatus(err) === 404
          ? `${entry.name} is no longer assigned — it was probably removed elsewhere, so it has been dropped from the list.`
          : describeWriteFailure(err, 'skill assignment', 'delete'),
      ]);
    }
  }

  async function handleCreateSkill() {
    const result = fromSkillDraft(newSkill);
    if (!result.ok) {
      setProblems(result.errors);
      return;
    }
    try {
      const created = await createSkill(result.value);
      setProblems([]);
      setNewSkill(emptySkillDraft());
      setAssignment((current) => ({ ...current, skillId: created.id }));
    } catch (err) {
      setProblems([
        errorStatus(err) === 409
          ? `A skill named "${result.value.name}" already exists in the catalog — pick it from the list instead.`
          : describeWriteFailure(err, 'skill'),
      ]);
    }
  }

  return (
    <section className={styles.page}>
      <Link to={`/people/${personId}/sections`}>Back to CV sections</Link>
      <h1>Skills</h1>
      {error && <p role="alert">Failed to load skills: {error}</p>}
      {notice && <p role="status">{notice}</p>}
      {loading && assignments.length === 0 && <p>Loading…</p>}
      {!loading && !error && assignments.length === 0 && <p>No skills assigned yet.</p>}
      <ul className={styles.list} aria-label="Assigned skills">
        {assignments.map((entry) => (
          <li key={entry.skillId}>
            <span className={styles.summary}>
              {entry.category ? `${entry.name} (${entry.category})` : entry.name} —{' '}
              {PROFICIENCY_LABELS[entry.proficiency]}
            </span>
            <button
              type="button"
              className={styles.rowButton}
              aria-label={`Change ${entry.name}`}
              onClick={() => setAssignment({ skillId: entry.skillId, proficiency: entry.proficiency })}
            >
              Change
            </button>
            <button
              type="button"
              className={styles.rowButton}
              aria-label={`Remove ${entry.name}`}
              onClick={() => void handleUnassign(entry)}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      <ProblemsAlert problems={problems} />
      <SkillAssignmentForm
        catalog={catalog}
        value={assignment}
        onChange={setAssignment}
        onSubmit={() => void handleAssign()}
      />
      <NewSkillForm value={newSkill} onChange={setNewSkill} onSubmit={() => void handleCreateSkill()} />
    </section>
  );
}
