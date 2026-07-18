import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CognitoProvider } from '../../auth/CognitoContext';
import { redirectTo } from '../../auth/browser';
import AuthGate from './AuthGate';

jest.mock('../../auth/browser', () => ({ redirectTo: jest.fn() }));

describe('AuthGate', () => {
  afterEach(() => {
    sessionStorage.clear();
    jest.clearAllMocks();
  });

  it('shows the sign-in screen when unauthenticated and login redirects', async () => {
    render(
      <CognitoProvider>
        <AuthGate>
          <p>protected content</p>
        </AuthGate>
      </CognitoProvider>,
    );

    expect(screen.getByRole('heading', { name: 'Admin sign in' })).toBeInTheDocument();
    expect(screen.queryByText('protected content')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(redirectTo).toHaveBeenCalled());
  });

  it('renders children when authenticated', () => {
    sessionStorage.setItem('cv-admin.token', 'test-token');
    sessionStorage.setItem('cv-admin.tokenExpiresAt', String(Date.now() + 60_000));

    render(
      <CognitoProvider>
        <AuthGate>
          <p>protected content</p>
        </AuthGate>
      </CognitoProvider>,
    );

    expect(screen.getByText('protected content')).toBeInTheDocument();
  });
});
