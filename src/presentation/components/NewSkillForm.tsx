import React from 'react';
import { SkillDraft } from '../../domain/skill';
import styles from './SectionForm.module.css';

interface NewSkillFormProps {
  value: SkillDraft;
  onChange: (value: SkillDraft) => void;
  onSubmit: () => void;
}

/** Adds a skill to the global catalog (name unique server-side → 409). */
export default function NewSkillForm({ value, onChange, onSubmit }: NewSkillFormProps) {
  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <h2>New catalog skill</h2>
      <label className={styles.field}>
        Skill name
        <input
          value={value.name}
          onChange={(event) => onChange({ ...value, name: event.target.value })}
          aria-required="true"
        />
      </label>
      <label className={styles.field}>
        Category
        <input value={value.category} onChange={(event) => onChange({ ...value, category: event.target.value })} />
      </label>
      <div className={styles.actions}>
        <button type="submit" className={styles.submit}>
          Add to catalog
        </button>
      </div>
    </form>
  );
}
