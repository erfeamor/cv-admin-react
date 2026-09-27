import { emptyEducationDraft, fromEducationDraft, toEducationDraft } from '../../domain/education';
import { useEducationsStore } from '../../store';
import EducationForm from '../components/EducationForm';
import SectionPage, { formatPeriod } from './SectionPage';

export default function EducationsPage() {
  return (
    <SectionPage
      heading="Education"
      noun="education entry"
      useStore={useEducationsStore}
      emptyDraft={emptyEducationDraft}
      toDraft={toEducationDraft}
      fromDraft={fromEducationDraft}
      name={(education) => `${education.degree}, ${education.institution}`}
      details={(education) =>
        [education.fieldOfStudy, formatPeriod(education.startDate, education.endDate)].filter(Boolean).join(' · ')
      }
      Form={EducationForm}
    />
  );
}
