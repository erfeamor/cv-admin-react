import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { emptyPersonInput, toPersonInput } from '../../domain/person';
import { usePeopleStore } from '../../store';
import PersonForm from '../components/PersonForm';

export default function PersonFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { selectedPerson, error, selectPerson, clearSelection, savePerson } = usePeopleStore();
  const [form, setForm] = useState(emptyPersonInput());
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      void selectPerson(id);
    } else {
      clearSelection();
      setForm(emptyPersonInput());
    }
  }, [id, selectPerson, clearSelection]);

  // Sync the form whenever the selection lands (cached preload first, then
  // the fresh copy from the API).
  useEffect(() => {
    if (id && selectedPerson?.id === id) {
      setForm(toPersonInput(selectedPerson));
    }
  }, [id, selectedPerson]);

  async function handleSubmit() {
    try {
      await savePerson(form, id);
      navigate('/people');
    } catch (err) {
      setSaveError((err as Error).message);
    }
  }

  if (error) {
    return <p role="alert">Failed to load person: {error}</p>;
  }

  return (
    <>
      {saveError && <p role="alert">Failed to save person: {saveError}</p>}
      <PersonForm
        title={id ? 'Edit person' : 'New person'}
        value={form}
        onChange={setForm}
        onSubmit={() => void handleSubmit()}
      />
    </>
  );
}
