import styles from './SectionForm.module.css';

/** Save (+ optional Cancel) row shared by the section forms. */
export default function FormActions({ onCancel }: { onCancel?: () => void }) {
  return (
    <div className={styles.actions}>
      <button type="submit" className={styles.submit}>
        Save
      </button>
      {onCancel && (
        <button type="button" className={styles.secondary} onClick={onCancel}>
          Cancel
        </button>
      )}
    </div>
  );
}
