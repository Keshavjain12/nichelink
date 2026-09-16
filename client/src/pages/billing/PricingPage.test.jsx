import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { apiSuccess, authenticatedState, mockApi, renderWithProviders } from '../../test/utils';
import { redirectTo } from '../../utils/navigation';
import PricingPage from './PricingPage';

vi.mock('../../utils/navigation', async (importOriginal) => ({
  ...(await importOriginal()),
  redirectTo: vi.fn(),
}));

const PLANS = [
  { id: 'free', name: 'Free', priceMonthly: 0, features: ['Browse every public community'] },
  { id: 'pro', name: 'Pro', priceMonthly: 12, features: ['Publish posts with rich text and images'] },
];

const config = (payments = true) => apiSuccess({ features: { payments, uploads: true }, plans: PLANS, limits: {} });

const subscription = (overrides) =>
  apiSuccess({
    plan: 'free',
    role: 'FreeMember',
    status: 'none',
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    provider: null,
    paymentsEnabled: true,
    canManageBilling: false,
    ...overrides,
  });

describe('PricingPage', () => {
  it('lets a Free member start Stripe checkout', async () => {
    const { calls } = mockApi({
      'GET /api/v1/config': config(),
      'GET /api/v1/subscriptions/me': subscription(),
      'POST /api/v1/subscriptions/checkout': apiSuccess({ url: 'https://checkout.stripe.com/c/pay/cs_test_123', sessionId: 'cs_test_123' }),
    });
    const { user } = renderWithProviders(<PricingPage />, { preloadedState: authenticatedState() });

    const upgrade = await screen.findByRole('button', { name: /upgrade with stripe/i });
    await user.click(upgrade);

    await waitFor(() => expect(redirectTo).toHaveBeenCalledWith('https://checkout.stripe.com/c/pay/cs_test_123'));
    expect(calls.some((call) => call.key === 'POST /api/v1/subscriptions/checkout')).toBe(true);
  });

  it('marks the current plan and disables upgrading for Pro members', async () => {
    mockApi({
      'GET /api/v1/config': config(),
      'GET /api/v1/subscriptions/me': subscription({ plan: 'pro', role: 'ProMember', status: 'active', currentPeriodEnd: '2026-10-16T00:00:00.000Z', provider: 'stripe', canManageBilling: true }),
    });

    renderWithProviders(<PricingPage />, { preloadedState: authenticatedState({ role: 'ProMember' }) });

    expect(await screen.findByText("You're on NicheLink Pro")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /you have pro/i })).toBeDisabled();
    expect(screen.getByText('Current plan')).toBeInTheDocument();
  });

  it('explains when payments are not configured instead of offering a dead button', async () => {
    mockApi({
      'GET /api/v1/config': config(false),
      'GET /api/v1/subscriptions/me': subscription({ paymentsEnabled: false }),
    });

    renderWithProviders(<PricingPage />, { preloadedState: authenticatedState() });

    expect(await screen.findByText(/payments are not configured on this server/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /upgrade with stripe/i })).toBeDisabled();
  });
});
