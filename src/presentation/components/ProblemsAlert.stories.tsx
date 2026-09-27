import type { Meta, StoryObj } from '@storybook/react-vite';
import ProblemsAlert from './ProblemsAlert';

const meta = {
  title: 'Components/ProblemsAlert',
  component: ProblemsAlert,
} satisfies Meta<typeof ProblemsAlert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ValidationErrors: Story = {
  args: { problems: ['Company is required.', 'End date is required unless "Current" is checked.'] },
};

export const WriteFailure: Story = {
  args: {
    problems: ['This experience no longer exists — it was probably deleted elsewhere, so it has been removed from the list.'],
  },
};
