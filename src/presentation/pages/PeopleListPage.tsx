import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usePeopleStore } from '../../store';
import styles from './PeopleListPage.module.css';

export default function PeopleListPage() {
  const { people, error, loadPeople, selectPerson } = usePeopleStore();

  useEffect(() => {
    void loadPeople();
  }, [loadPeople]);

  if (error) {
    return <p role="alert">Failed to load people: {error}</p>;
  }

  return (
    <section className={styles.page}>
      <h1>People</h1>
      <ul className={styles.list}>
        {people.map((person) => (
          <li key={person.id}>
            {/* Preload the selection so the edit form renders populated
                before the fresh fetch lands. */}
            <Link to={`/people/${person.id}`} onClick={() => void selectPerson(person.id)}>
              {person.fullName}
            </Link>
          </li>
        ))}
      </ul>
      <Link to="/people/new" className={styles.newLink}>
        New person
      </Link>
    </section>
  );
}
