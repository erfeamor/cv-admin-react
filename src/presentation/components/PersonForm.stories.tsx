import type { Meta, StoryObj } from '@storybook/react-vite';
import { ComponentProps, useState } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';
import { emptyPersonInput, PersonInput } from '../../domain/person';
import PersonForm from './PersonForm';

/**
 * PersonForm is a pure controlled component; this harness owns the value
 * state so typing works in the canvas, while still reporting every change
 * to the onChange spy for the interactions panel.
 */
function ControlledPersonForm(props: ComponentProps<typeof PersonForm>) {
  const [value, setValue] = useState<PersonInput>(props.value);
  return (
    <PersonForm
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
  title: 'Components/PersonForm',
  component: PersonForm,
  render: (args) => <ControlledPersonForm {...args} />,
  args: {
    onChange: fn(),
    onSubmit: fn(),
  },
} satisfies Meta<typeof PersonForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NewPerson: Story = {
  args: {
    title: 'New person',
    value: emptyPersonInput(),
  },
};

export const EditPerson: Story = {
  args: {
    title: 'Edit person',
    value: {
      fullName: 'Jane Doe',
      headline: 'Software Engineer',
      email: 'jane@example.com',
      location: 'Madrid',
      summary: 'Full-stack engineer with a bias for boring technology.',
    },
  },
};

/** Fills the required fields and submits — the interaction test for the form. */
export const FillAndSubmit: Story = {
  args: {
    title: 'New person',
    value: emptyPersonInput(),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.type(canvas.getByLabelText('Full name'), 'Ada Lovelace');
    await userEvent.type(canvas.getByLabelText('Email'), 'ada@example.com');
    await userEvent.click(canvas.getByRole('button', { name: 'Save' }));

    await expect(args.onSubmit).toHaveBeenCalledTimes(1);
    await expect(args.onChange).toHaveBeenCalledWith(
      expect.objectContaining({ fullName: 'Ada Lovelace' }),
    );
  },
};
