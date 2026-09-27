import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import FormActions from './FormActions';

const meta = {
  title: 'Components/FormActions',
  component: FormActions,
  render: (args) => (
    <form onSubmit={(event) => event.preventDefault()}>
      <FormActions {...args} />
    </form>
  ),
} satisfies Meta<typeof FormActions>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SaveOnly: Story = {};

export const SaveAndCancel: Story = {
  args: { onCancel: fn() },
};
