import type { Meta, StoryObj } from '@storybook/react-vite';
import { ComponentProps, useState } from 'react';
import { fn } from 'storybook/test';
import { emptyProjectDraft, ProjectDraft } from '../../domain/project';
import ProjectForm from './ProjectForm';

function ControlledProjectForm(props: ComponentProps<typeof ProjectForm>) {
  const [value, setValue] = useState<ProjectDraft>(props.value);
  return (
    <ProjectForm
      {...props}
      value={value}
      onChange={(next) => {
        setValue(next);
        props.onChange(next);
      }}
    />
  );
}

const meta = {
  title: 'Components/ProjectForm',
  component: ProjectForm,
  render: (args) => <ControlledProjectForm {...args} />,
  args: { onChange: fn(), onSubmit: fn() },
} satisfies Meta<typeof ProjectForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NewProject: Story = {
  args: { title: 'New project', value: emptyProjectDraft() },
};

export const EditUndatedCurrentProject: Story = {
  args: {
    title: 'Edit project',
    value: {
      name: 'cv-project',
      description: 'Interactive CV across seven repos.',
      repoUrl: 'https://github.com/erfeamor',
      startDate: '',
      endDate: '',
      current: true,
    },
    onCancel: fn(),
  },
};
