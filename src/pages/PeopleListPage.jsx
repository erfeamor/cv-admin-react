import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { peopleApi } from '../api/client';
import { useAuth } from '../auth/CognitoContext';

export default function PeopleListPage() {
  const { token } = useAuth();
  const [people, setPeople] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    peopleApi
      .list(token)
      .then(setPeople)
      .catch((err) => setError(err.message));
  }, [token]);

  if (error) {
    return <p role="alert">Failed to load people: {error}</p>;
  }

  return (
    <section>
      <h1>People</h1>
      <ul>
        {people.map((person) => (
          <li key={person.id}>
            <Link to={`/people/${person.id}`}>{person.fullName}</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
