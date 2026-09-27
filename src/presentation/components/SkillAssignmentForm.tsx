import React from 'react';
import { PROFICIENCIES, Proficiency, Skill, SkillAssignmentDraft } from '../../domain/skill';
import { PROFICIENCY_LABELS } from '../proficiencyLabels';
import styles from './SectionForm.module.css';

interface SkillAssignmentFormProps {
  catalog: Skill[];
  value: SkillAssignmentDraft;
  onChange: (value: SkillAssignmentDraft) => void;
  onSubmit: () => void;
}

/**
 * Catalog picker + proficiency select. Assigning an already-assigned skill
 * is the contract's PUT upsert, so the same form re-assigns. The catalog is
 * rendered in the order served — no client sort.
 */
export default function SkillAssignmentForm({ catalog, value, onChange, onSubmit }: SkillAssignmentFormProps) {
  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <h2>Assign a skill</h2>
      <label className={styles.field}>
        Skill
        <select value={value.skillId} onChange={(event) => onChange({ ...value, skillId: event.target.value })}>
          <option value="">Choose a skill…</option>
          {catalog.map((skill) => (
            <option key={skill.id} value={skill.id}>
              {skill.category ? `${skill.name} (${skill.category})` : skill.name}
            </option>
          ))}
        </select>
      </label>
      <label className={styles.field}>
        Proficiency
        <select
          value={value.proficiency}
          onChange={(event) => onChange({ ...value, proficiency: event.target.value as Proficiency })}
        >
          {PROFICIENCIES.map((proficiency) => (
            <option key={proficiency} value={proficiency}>
              {PROFICIENCY_LABELS[proficiency]}
            </option>
          ))}
        </select>
      </label>
      <div className={styles.actions}>
        <button type="submit" className={styles.submit}>
          Assign
        </button>
      </div>
    </form>
  );
}
