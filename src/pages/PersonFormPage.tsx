import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PersonInput, peopleApi } from '../api/client';
import { useAuth } from '../auth/CognitoContext';

export default function PersonFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<PersonInput>({
    fullName: '',
    headline: '',
    email: '',
    location: '',
    summary: '',
  });

  useEffect(() => {
    if (!id) {
      return;
    }
    peopleApi
      .get(id, token)
      .then((person) =>
        setForm({
          fullName: person.fullName,
          headline: person.headline ?? '',
          email: person.email,
          location: person.location ?? '',
          summary: person.summary ?? '',
        }),
      )
      .catch((err: Error) => setError(err.message));
  }, [id, token]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (id) {
      await peopleApi.update(id, form, token);
    } else {
      await peopleApi.create(form, token);
    }
    navigate('/people');
  }

  function handleChange(field: keyof PersonInput) {
    return (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
  }

  if (error) {
    return <p role="alert">Failed to load person: {error}</p>;
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>{id ? 'Edit person' : 'New person'}</h1>
      <label>
        Full name
        <input value={form.fullName} onChange={handleChange('fullName')} required />
      </label>
      <label>
        Headline
        <input value={form.headline} onChange={handleChange('headline')} />
      </label>
      <label>
        Email
        <input type="email" value={form.email} onChange={handleChange('email')} required />
      </label>
      <label>
        Location
        <input value={form.location} onChange={handleChange('location')} />
      </label>
      <label>
        Summary
        <textarea value={form.summary} onChange={handleChange('summary')} />
      </label>
      <button type="submit">Save</button>
    </form>
  );
}
