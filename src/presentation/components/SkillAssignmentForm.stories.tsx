import type { Meta, StoryObj } from '@storybook/react-vite';
import { ComponentProps, useState } from 'react';
import { fn } from 'storybook/test';
import { SkillAssignmentDraft } from '../../domain/skill';
import SkillAssignmentForm from './SkillAssignmentForm';

function ControlledSkillAssignmentForm(props: ComponentProps<typeof SkillAssignmentForm>) {
  const [value, setValue] = useState<SkillAssignmentDraft>(props.value);
  return (
    <SkillAssignmentForm
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
  title: 'Components/SkillAssignmentForm',
  component: SkillAssignmentForm,
  render: (args) => <ControlledSkillAssignmentForm {...args} />,
  args: {
    onChange: fn(),
    onSubmit: fn(),
    catalog: [
      { id: '2', name: 'Java', category: 'Language' },
      { id: '9', name: 'Rust', category: null },
      { id: '5', name: 'Zig', category: 'Language' },
    ],
  },
} satisfies Meta<typeof SkillAssignmentForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unpicked: Story = {
  args: { value: { skillId: '', proficiency: 'INTERMEDIATE' } },
};

export const Reassigning: Story = {
  args: { value: { skillId: '2', proficiency: 'EXPERT' } },
};
