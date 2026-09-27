import type { Meta, StoryObj } from '@storybook/react-vite';
import { ComponentProps, useState } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';
import { PeriodDraft } from '../../domain/draft';
import PeriodFields from './PeriodFields';

function ControlledPeriodFields(props: ComponentProps<typeof PeriodFields>) {
  const [value, setValue] = useState<PeriodDraft>(props.value);
  return (
    <PeriodFields
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
  title: 'Components/PeriodFields',
  component: PeriodFields,
  render: (args) => <ControlledPeriodFields {...args} />,
  args: { onChange: fn() },
} satisfies Meta<typeof PeriodFields>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Dated: Story = {
  args: { value: { startDate: '2022-01-01', endDate: '2023-06-30', current: false }, startRequired: true },
};

export const Current: Story = {
  args: { value: { startDate: '2022-01-01', endDate: '', current: true }, startRequired: true },
};

/** Unchecking Current re-enables the end date. */
export const UncheckCurrent: Story = {
  args: { value: { startDate: '2022-01-01', endDate: '', current: true } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('checkbox', { name: 'Current' }));

    await expect(canvas.getByLabelText('End date')).toBeEnabled();
  },
};
