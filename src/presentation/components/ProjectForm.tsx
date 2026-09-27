import React from 'react';
import { ProjectDraft } from '../../domain/project';
import FormActions from './FormActions';
import PeriodFields from './PeriodFields';
import styles from './SectionForm.module.css';

interface ProjectFormProps {
  title: string;
  value: ProjectDraft;
  onChange: (value: ProjectDraft) => void;
  onSubmit: () => void;
  onCancel?: () => void;
}

/** Pure controlled form over a ProjectDraft (PersonForm conventions). */
export default function ProjectForm({ title, value, onChange, onSubmit, onCancel }: ProjectFormProps) {
  function handleChange(field: 'name' | 'description' | 'repoUrl') {
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
        Name
        <input value={value.name} onChange={handleChange('name')} aria-required="true" />
      </label>
      <label className={styles.field}>
        Description
        <textarea value={value.description} onChange={handleChange('description')} />
      </label>
      <label className={styles.field}>
        Repository URL
        <input type="url" value={value.repoUrl} onChange={handleChange('repoUrl')} />
      </label>
      <PeriodFields value={value} onChange={(period) => onChange({ ...value, ...period })} />
      <FormActions onCancel={onCancel} />
    </form>
  );
}
