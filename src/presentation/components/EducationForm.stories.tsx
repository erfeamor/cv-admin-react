import type { Meta, StoryObj } from '@storybook/react-vite';
import { ComponentProps, useState } from 'react';
import { fn } from 'storybook/test';
import { EducationDraft, emptyEducationDraft } from '../../domain/education';
import EducationForm from './EducationForm';

function ControlledEducationForm(props: ComponentProps<typeof EducationForm>) {
  const [value, setValue] = useState<EducationDraft>(props.value);
  return (
    <EducationForm
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
  title: 'Components/EducationForm',
  component: EducationForm,
  render: (args) => <ControlledEducationForm {...args} />,
  args: { onChange: fn(), onSubmit: fn() },
} satisfies Meta<typeof EducationForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NewEducation: Story = {
  args: { title: 'New education entry', value: emptyEducationDraft() },
};

export const EditEducation: Story = {
  args: {
    title: 'Edit education entry',
    value: {
      institution: 'UNED',
      degree: 'BSc',
      fieldOfStudy: 'Computer Science',
      startDate: '2015-09-01',
      endDate: '2019-06-30',
      current: false,
    },
    onCancel: fn(),
  },
};
