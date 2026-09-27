import React from 'react';
import { ExperienceDraft } from '../../domain/experience';
import FormActions from './FormActions';
import PeriodFields from './PeriodFields';
import styles from './SectionForm.module.css';

interface ExperienceFormProps {
  title: string;
  value: ExperienceDraft;
  onChange: (value: ExperienceDraft) => void;
  onSubmit: () => void;
  onCancel?: () => void;
}

/** Pure controlled form over an ExperienceDraft (PersonForm conventions). */
export default function ExperienceForm({ title, value, onChange, onSubmit, onCancel }: ExperienceFormProps) {
  function handleChange(field: 'company' | 'role' | 'location' | 'description') {
    return (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange({ ...value, [field]: event.target.value });
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <h2>{title}</h2>
      <label className={styles.field}>
        Company
        <input value={value.company} onChange={handleChange('company')} aria-required="true" />
      </label>
      <label className={styles.field}>
        Role
        <input value={value.role} onChange={handleChange('role')} aria-required="true" />
      </label>
      <label className={styles.field}>
        Location
        <input value={value.location} onChange={handleChange('location')} />
      </label>
      <PeriodFields value={value} onChange={(period) => onChange({ ...value, ...period })} startRequired />
      <label className={styles.field}>
        Description
        <textarea value={value.description} onChange={handleChange('description')} />
      </label>
      <FormActions onCancel={onCancel} />
    </form>
  );
}
