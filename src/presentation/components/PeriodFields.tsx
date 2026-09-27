import React from 'react';
import { PeriodDraft } from '../../domain/draft';
import styles from './SectionForm.module.css';

interface PeriodFieldsProps {
  value: PeriodDraft;
  onChange: (value: PeriodDraft) => void;
}

/**
 * Start date, end date and the explicit "Current" checkbox (T-301 H1).
 * Checked: the end date is disabled and cleared, so the draft converts to
 * `endDate: null`. Unchecked with a blank end date is left for validation
 * to reject — it never silently means "current".
 */
export default function PeriodFields({ value, onChange }: PeriodFieldsProps) {
  function handleDate(field: 'startDate' | 'endDate') {
    return (event: React.ChangeEvent<HTMLInputElement>) => onChange({ ...value, [field]: event.target.value });
  }

  return (
    <>
      <label className={styles.field}>
        Start date
        <input type="date" value={value.startDate} onChange={handleDate('startDate')} />
      </label>
      <label className={styles.field}>
        End date
        <input type="date" value={value.endDate} onChange={handleDate('endDate')} disabled={value.current} />
      </label>
      <label className={styles.checkbox}>
        <input
          type="checkbox"
          checked={value.current}
          onChange={(event) =>
            onChange({ ...value, current: event.target.checked, endDate: event.target.checked ? '' : value.endDate })
          }
        />
        Current
      </label>
    </>
  );
}
