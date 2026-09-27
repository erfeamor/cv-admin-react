import styles from './SectionForm.module.css';

/** The one alert region a section page shows for validation and write failures. */
export default function ProblemsAlert({ problems }: { problems: string[] }) {
  if (problems.length === 0) {
    return null;
  }
  return (
    <div role="alert">
      <ul className={styles.problems}>
        {problems.map((problem) => (
          <li key={problem}>{problem}</li>
        ))}
      </ul>
    </div>
  );
}
