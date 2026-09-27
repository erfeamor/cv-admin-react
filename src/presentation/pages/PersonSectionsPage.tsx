import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { usePeopleStore } from '../../store';
import styles from './PeopleListPage.module.css';

const SECTIONS = [
  { segment: 'experiences', label: 'Experience' },
  { segment: 'educations', label: 'Education' },
  { segment: 'projects', label: 'Projects' },
  { segment: 'skills', label: 'Skills' },
] as const;

/** Person hub: links to the four CV section pages nested under the person. */
export default function PersonSectionsPage() {
  const { id = '' } = useParams();
  const { selectedPerson, error, selectPerson } = usePeopleStore();

  useEffect(() => {
    void selectPerson(id);
  }, [id, selectPerson]);

  if (error) {
    return <p role="alert">Failed to load person: {error}</p>;
  }

  const name = selectedPerson?.id === id ? selectedPerson.fullName : 'Person';

  return (
    <section className={styles.page}>
      <Link to="/people">Back to people</Link>
      <h1>{name} — CV sections</h1>
      <ul className={styles.list} aria-label="CV sections">
        {SECTIONS.map(({ segment, label }) => (
          <li key={segment}>
            <Link to={`/people/${id}/${segment}`}>{label}</Link>
          </li>
        ))}
      </ul>
      <Link to={`/people/${id}`}>Edit person details</Link>
    </section>
  );
}
