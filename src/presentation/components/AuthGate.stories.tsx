import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';
import { CognitoProvider } from '../../auth/CognitoContext';
import AuthGate from './AuthGate';

/**
 * AuthGate reads auth state from CognitoProvider, which restores its token
 * from sessionStorage on mount — so each story seeds (or clears) the token
 * keys before mounting the real provider.
 */
function withAuthSession(signedIn: boolean): Decorator {
  return function AuthSessionDecorator(Story) {
    if (signedIn) {
      sessionStorage.setItem('cv-admin.token', 'storybook-token');
      sessionStorage.setItem('cv-admin.tokenExpiresAt', String(Date.now() + 3_600_000));
    } else {
      sessionStorage.removeItem('cv-admin.token');
      sessionStorage.removeItem('cv-admin.tokenExpiresAt');
    }
    return (
      <CognitoProvider>
        <Story />
      </CognitoProvider>
    );
  };
}

const meta = {
  title: 'Components/AuthGate',
  component: AuthGate,
  args: {
    children: <p>Protected admin content</p>,
  },
} satisfies Meta<typeof AuthGate>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Unauthenticated: the gate replaces its children with the sign-in screen. */
export const SignedOut: Story = {
  decorators: [withAuthSession(false)],
};

/** Authenticated: the gate is transparent and renders its children. */
export const SignedIn: Story = {
  decorators: [withAuthSession(true)],
};
