import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import ConflictAlert from './ConflictAlert';

const meta = {
  title: 'Components/ConflictAlert',
  component: ConflictAlert,
  args: { onReload: fn() },
} satisfies Meta<typeof ConflictAlert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ChangedElsewhere: Story = {
  play: async ({ args, canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Reload and discard my edits' }));
    await expect(args.onReload).toHaveBeenCalled();
  },
};

export const Reloading: Story = {
  args: { disabled: true },
};
