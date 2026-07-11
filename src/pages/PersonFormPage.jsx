import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { peopleApi } from '../api/client';
import { useAuth } from '../auth/CognitoContext';

export default function PersonFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [form, setForm] = useState({ fullName: '', headline: '', email: '', location: '', summary: '' });

  async function handleSubmit(event) {
    event.preventDefault();
    if (id) {
      await peopleApi.update(id, form, token);
    } else {
      await peopleApi.create(form, token);
    }
    navigate('/people');
  }

  function handleChange(field) {
    return (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));
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
