import { emptyExperienceDraft, fromExperienceDraft, toExperienceDraft } from '../../domain/experience';
import { useExperiencesStore } from '../../store';
import ExperienceForm from '../components/ExperienceForm';
import SectionPage, { formatPeriod } from './SectionPage';

export default function ExperiencesPage() {
  return (
    <SectionPage
      heading="Experience"
      noun="experience"
      useStore={useExperiencesStore}
      emptyDraft={emptyExperienceDraft}
      toDraft={toExperienceDraft}
      fromDraft={fromExperienceDraft}
      name={(experience) => `${experience.role} at ${experience.company}`}
      details={(experience) => formatPeriod(experience.startDate, experience.endDate)}
      Form={ExperienceForm}
    />
  );
}
