import type { Meta, StoryObj } from '@storybook/react-vite';
import { ComponentProps, useState } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';
import { emptyExperienceDraft, ExperienceDraft } from '../../domain/experience';
import ExperienceForm from './ExperienceForm';

/** Stateful harness (PersonForm.stories pattern) so typing works in the canvas. */
function ControlledExperienceForm(props: ComponentProps<typeof ExperienceForm>) {
  const [value, setValue] = useState<ExperienceDraft>(props.value);
  return (
    <ExperienceForm
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
  title: 'Components/ExperienceForm',
  component: ExperienceForm,
  render: (args) => <ControlledExperienceForm {...args} />,
  args: { onChange: fn(), onSubmit: fn() },
} satisfies Meta<typeof ExperienceForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NewExperience: Story = {
  args: { title: 'New experience', value: emptyExperienceDraft() },
};

export const EditCurrentExperience: Story = {
  args: {
    title: 'Edit experience',
    value: {
      company: 'ACME',
      role: 'Backend Engineer',
      location: 'Remote',
      startDate: '2022-01-01',
      endDate: '',
      current: true,
      description: 'APIs and data pipelines.',
    },
    onCancel: fn(),
  },
};

/** Checking "Current" disables the end date — the H1 "current" UX. */
export const MarkAsCurrent: Story = {
  args: { title: 'New experience', value: { ...emptyExperienceDraft(), endDate: '2024-01-31' } },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('checkbox', { name: 'Current' }));

    await expect(canvas.getByLabelText('End date')).toBeDisabled();
    await expect(args.onChange).toHaveBeenLastCalledWith(expect.objectContaining({ current: true, endDate: '' }));
  },
};
