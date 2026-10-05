import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { errorStatus } from '../../domain/errors';
import { emptyPersonInput, toPersonInput } from '../../domain/person';
import { usePeopleStore } from '../../store';
import ConflictAlert from '../components/ConflictAlert';
import PersonForm from '../components/PersonForm';
import { describeDeleted, isChangedElsewhere } from '../errorMessages';

export default function PersonFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { selectedPerson, error, selectPerson, clearSelection, savePerson } = usePeopleStore();
  const [form, setForm] = useState(emptyPersonInput());
  // The version the form was built from (contract rule 8), set with the form.
  const [formVersion, setFormVersion] = useState<number | undefined>(undefined);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [deleted, setDeleted] = useState(false);

  useEffect(() => {
    setConflict(false);
    setDeleted(false);
    if (id) {
      void selectPerson(id);
    } else {
      clearSelection();
      setForm(emptyPersonInput());
      setFormVersion(undefined);
    }
  }, [id, selectPerson, clearSelection]);

  // Sync the form whenever the selection lands (cached preload first, then
  // the fresh copy from the API).
  useEffect(() => {
    if (id && selectedPerson?.id === id) {
      setForm(toPersonInput(selectedPerson));
      setFormVersion(selectedPerson.version);
    }
  }, [id, selectedPerson]);

  async function handleSubmit() {
    try {
      await savePerson(form, id, id ? formVersion : undefined);
      navigate('/people');
    } catch (err) {
      if (id && isChangedElsewhere(err, 'update')) {
        // Keep the form as typed; never retry (a blind retry is the lost update).
        setSaveError(null);
        setConflict(true);
      } else if (id && errorStatus(err) === 404) {
        setDeleted(true);
      } else {
        setSaveError((err as Error).message);
      }
    }
  }

  // Refetch the person: the sync effect then replaces the form and its version.
  async function handleReload() {
    if (!id) {
      return;
    }
    setReloading(true);
    await selectPerson(id);
    setReloading(false);
    setConflict(false);
  }

  if (error) {
    return <p role="alert">Failed to load person: {error}</p>;
  }

  if (deleted) {
    return (
      <>
        <p role="alert">{describeDeleted('person')}</p>
        <Link to="/people">Back to people</Link>
      </>
    );
  }

  return (
    <>
      {saveError && <p role="alert">Failed to save person: {saveError}</p>}
      {conflict && <ConflictAlert onReload={() => void handleReload()} disabled={reloading} />}
      <PersonForm
        title={id ? 'Edit person' : 'New person'}
        value={form}
        onChange={setForm}
        onSubmit={() => void handleSubmit()}
      />
      {id && <Link to={`/people/${id}/sections`}>CV sections</Link>}
    </>
  );
}
