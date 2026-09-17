import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  apiError,
  apiSuccess,
  buildUser,
  guestState,
  mockApi,
  renderWithProviders,
} from '../../test/utils';
import LoginPage from './LoginPage';

describe('LoginPage', () => {
  beforeEach(() => {
    mockApi({});
  });

  it('validates the form before calling the API', async () => {
    const { user } = renderWithProviders(<LoginPage />, { preloadedState: guestState });

    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('stores the session after a successful sign-in', async () => {
    const { calls } = mockApi({
      'POST /api/v1/auth/login': apiSuccess({
        accessToken: 'access-123',
        user: buildUser({ role: 'ProMember' }),
      }),
    });
    const { user, store } = renderWithProviders(<LoginPage />, { preloadedState: guestState });

    await user.type(screen.getByLabelText('Email'), 'daniel@example.com');
    await user.type(screen.getByLabelText('Password'), 'Str0ngPassw0rd');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(store.getState().auth.status).toBe('authenticated'));
    expect(store.getState().auth.accessToken).toBe('access-123');
    expect(store.getState().auth.user.role).toBe('ProMember');

    const request = calls.find((call) => call.key === 'POST /api/v1/auth/login');
    expect(request.body).toEqual({ email: 'daniel@example.com', password: 'Str0ngPassw0rd' });
    expect(request.headers.get('X-Requested-With')).toBe('XMLHttpRequest');
  });

  it('shows the server error and stays signed out on bad credentials', async () => {
    mockApi({
      'POST /api/v1/auth/login': apiError(401, 'Invalid email or password', 'INVALID_CREDENTIALS'),
    });
    const { user, store } = renderWithProviders(<LoginPage />, { preloadedState: guestState });

    await user.type(screen.getByLabelText('Email'), 'daniel@example.com');
    await user.type(screen.getByLabelText('Password'), 'WrongPassw0rd');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument();
    expect(store.getState().auth.status).toBe('unauthenticated');
  });
});
