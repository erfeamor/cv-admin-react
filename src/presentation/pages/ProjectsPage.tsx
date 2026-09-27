import { emptyProjectDraft, fromProjectDraft, toProjectDraft } from '../../domain/project';
import { useProjectsStore } from '../../store';
import ProjectForm from '../components/ProjectForm';
import SectionPage, { formatPeriod } from './SectionPage';

export default function ProjectsPage() {
  return (
    <SectionPage
      heading="Projects"
      noun="project"
      useStore={useProjectsStore}
      emptyDraft={emptyProjectDraft}
      toDraft={toProjectDraft}
      fromDraft={fromProjectDraft}
      name={(project) => project.name}
      details={(project) => formatPeriod(project.startDate, project.endDate)}
      Form={ProjectForm}
    />
  );
}
