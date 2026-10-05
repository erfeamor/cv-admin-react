import { CHANGED_ELSEWHERE } from '../errorMessages';
import styles from './SectionForm.module.css';

interface ConflictAlertProps {
  onReload: () => void;
  /** While a reload is in flight. */
  disabled?: boolean;
}

/**
 * Shown by a form whose PUT drew a stale-version 409 (contract rule 8). The
 * user's edits stay in the form; Reload is the only way forward and says
 * plainly that it discards them. Nothing is ever retried automatically.
 */
export default function ConflictAlert({ onReload, disabled = false }: ConflictAlertProps) {
  return (
    <div role="alert" className={styles.conflict}>
      <p>
        <strong>{CHANGED_ELSEWHERE}</strong> Your edits are still in the form, but they were not saved.
      </p>
      <p>Reloading loads the latest version and discards your unsaved edits.</p>
      <button type="button" onClick={onReload} disabled={disabled}>
        Reload and discard my edits
      </button>
    </div>
  );
}
