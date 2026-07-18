import React from 'react';
import { PersonInput } from '../../domain/person';

interface PersonFormProps {
  title: string;
  value: PersonInput;
  onChange: (value: PersonInput) => void;
  onSubmit: () => void;
}

/**
 * Pure controlled form — no data fetching, no routing. Future section forms
 * (experience, education, …) follow this same shape: value/onChange/onSubmit
 * over their domain input type, with the page owning the store wiring.
 */
export default function PersonForm({ title, value, onChange, onSubmit }: PersonFormProps) {
  function handleChange(field: keyof PersonInput) {
    return (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange({ ...value, [field]: event.target.value });
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>{title}</h1>
      <label>
        Full name
        <input value={value.fullName} onChange={handleChange('fullName')} required />
      </label>
      <label>
        Headline
        <input value={value.headline} onChange={handleChange('headline')} />
      </label>
      <label>
        Email
        <input type="email" value={value.email} onChange={handleChange('email')} required />
      </label>
      <label>
        Location
        <input value={value.location} onChange={handleChange('location')} />
      </label>
      <label>
        Summary
        <textarea value={value.summary} onChange={handleChange('summary')} />
      </label>
      <button type="submit">Save</button>
    </form>
  );
}
