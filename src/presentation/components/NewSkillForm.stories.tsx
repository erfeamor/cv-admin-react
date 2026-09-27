import type { Meta, StoryObj } from '@storybook/react-vite';
import { ComponentProps, useState } from 'react';
import { fn } from 'storybook/test';
import { emptySkillDraft, SkillDraft } from '../../domain/skill';
import NewSkillForm from './NewSkillForm';

function ControlledNewSkillForm(props: ComponentProps<typeof NewSkillForm>) {
  const [value, setValue] = useState<SkillDraft>(props.value);
  return (
    <NewSkillForm
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
  title: 'Components/NewSkillForm',
  component: NewSkillForm,
  render: (args) => <ControlledNewSkillForm {...args} />,
  args: { onChange: fn(), onSubmit: fn(), value: emptySkillDraft() },
} satisfies Meta<typeof NewSkillForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};
