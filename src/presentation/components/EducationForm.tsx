import React from 'react';
import { EducationDraft } from '../../domain/education';
import FormActions from './FormActions';
import PeriodFields from './PeriodFields';
import styles from './SectionForm.module.css';

interface EducationFormProps {
  title: string;
  value: EducationDraft;
  onChange: (value: EducationDraft) => void;
  onSubmit: () => void;
  onCancel?: () => void;
}

/** Pure controlled form over an EducationDraft (PersonForm conventions). */
export default function EducationForm({ title, value, onChange, onSubmit, onCancel }: EducationFormProps) {
  function handleChange(field: 'institution' | 'degree' | 'fieldOfStudy') {
    return (event: React.ChangeEvent<HTMLInputElement>) => onChange({ ...value, [field]: event.target.value });
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <h2>{title}</h2>
      <label className={styles.field}>
        Institution
        <input value={value.institution} onChange={handleChange('institution')} aria-required="true" />
      </label>
      <label className={styles.field}>
        Degree
        <input value={value.degree} onChange={handleChange('degree')} aria-required="true" />
      </label>
      <label className={styles.field}>
        Field of study
        <input value={value.fieldOfStudy} onChange={handleChange('fieldOfStudy')} />
      </label>
      <PeriodFields value={value} onChange={(period) => onChange({ ...value, ...period })} startRequired />
      <FormActions onCancel={onCancel} />
    </form>
  );
}
