import { Check, CreditCard, Crown, Info, Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useGetConfigQuery } from '../../app/api';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { ErrorState, InlineAlert, Skeleton } from '../../components/common/Feedback';
import { PageHeader } from '../../components/common/Misc';
import {
  useCreateCheckoutSessionMutation,
  useGetSubscriptionQuery,
} from '../../features/subscriptions/subscriptionsApi';
import { useDocumentTitle } from '../../hooks/common';
import { useAuth } from '../../hooks/useAuth';
import { formatBillingInterval, formatCurrency, formatDate } from '../../utils/format';
import { getErrorMessage } from '../../utils/errors';
import { redirectTo } from '../../utils/navigation';

const STATIC_FAQ = [
  {
    question: 'Can I cancel anytime?',
    answer: 'Yes. Cancel from Settings → Billing and you keep Pro until the end of the period you already paid for.',
  },
  {
    question: 'What happens to my posts if I downgrade?',
    answer: 'Everything you published stays up. You can still read, like and message within the Free limits.',
  },
];

const TEST_MODE_HINT = 'This deployment runs in Stripe test mode, so use a test card such as 4242 4242 4242 4242.';

function buildFaq({ proPlan, paymentsMode }) {
  const cadence = proPlan
    ? `every ${formatBillingInterval(proPlan.interval, proPlan.intervalCount)}`
    : 'on a recurring basis';
  const billing = `Pro is billed ${cadence} through Stripe.`;
  return [
    {
      question: 'How does billing work?',
      answer: paymentsMode === 'test' ? `${billing} ${TEST_MODE_HINT}` : billing,
    },
    ...STATIC_FAQ,
  ];
}

function CurrentPlanBanner({ subscription }) {
  if (!subscription) return null;
  if (subscription.role === 'Admin') {
    return <InlineAlert variant="info" title="Admin account">Administrators have access to every Pro feature.</InlineAlert>;
  }
  if (subscription.plan !== 'pro') return null;
  return (
    <InlineAlert
      variant="success"
      title="You're on NicheLink Pro"
      action={
        <Button as={Link} to="/settings/billing" variant="secondary" size="sm">
          Manage billing
        </Button>
      }
    >
      {subscription.cancelAtPeriodEnd
        ? `Your membership ends on ${formatDate(subscription.currentPeriodEnd)}.`
        : subscription.currentPeriodEnd
          ? `Renews on ${formatDate(subscription.currentPeriodEnd)}.`
          : 'Your membership is active.'}
    </InlineAlert>
  );
}

export default function PricingPage() {
  useDocumentTitle('Pricing');
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { data: config, isLoading, error, refetch } = useGetConfigQuery();
  const { data: subscription } = useGetSubscriptionQuery(undefined, { skip: !isAuthenticated });
  const [createCheckout, { isLoading: redirecting }] = useCreateCheckoutSessionMutation();

  const paymentsEnabled = Boolean(config?.features.payments);
  const proPlan = config?.plans.find((plan) => plan.id === 'pro');
  const faq = buildFaq({ proPlan, paymentsMode: config?.features.paymentsMode });
  const isPro = subscription?.plan === 'pro' || subscription?.role === 'Admin';

  const upgrade = async () => {
    if (!isAuthenticated) {
      navigate('/register?redirect=/pricing');
      return;
    }
    try {
      const { url } = await createCheckout().unwrap();
      redirectTo(url);
    } catch (checkoutError) {
      toast.error(getErrorMessage(checkoutError, 'Could not start checkout.'));
    }
  };

  if (error) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <PageHeader
        eyebrow="Pricing"
        title="Grow faster with NicheLink Pro"
        description="Free gives you a window into every public community. Pro turns you into a contributor."
      />
      <CurrentPlanBanner subscription={subscription} />

      {!isLoading && !paymentsEnabled && (
        <InlineAlert variant="warning" title="Payments are not configured on this server">
          Stripe keys have not been set for this environment, so upgrades are unavailable. See the README to enable Stripe test mode.
        </InlineAlert>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {isLoading && [0, 1].map((index) => <Skeleton key={index} className="h-96 rounded-2xl" />)}
        {config?.plans.map((plan) => {
          const isProPlan = plan.id === 'pro';
          const isCurrent = isAuthenticated && (isProPlan ? isPro : !isPro);
          return (
            <Card
              key={plan.id}
              className={`relative flex flex-col p-7 ${isProPlan ? 'border-brand-300 ring-2 ring-brand-500/20 dark:border-brand-500/40' : ''}`}
            >
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  {isProPlan ? <Crown className="size-5 text-amber-500" aria-hidden="true" /> : <Sparkles className="size-5 text-brand-500" aria-hidden="true" />}
                  {plan.name}
                </h2>
                {isCurrent && <Badge variant="success">Current plan</Badge>}
              </div>
              <p className="mt-3">
                <span className="text-4xl font-bold tracking-tight">{formatCurrency(plan.price, plan.currency)}</span>
                <span className="text-sm text-fg-subtle"> / {formatBillingInterval(plan.interval, plan.intervalCount)}</span>
              </p>
              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2.5 text-sm text-fg-muted">
                    <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" aria-hidden="true" />
                    {feature}
                  </li>
                ))}
              </ul>
              {isProPlan ? (
                <Button
                  className="mt-8 w-full"
                  size="lg"
                  leftIcon={CreditCard}
                  onClick={upgrade}
                  loading={redirecting}
                  disabled={isPro || (isAuthenticated && !paymentsEnabled)}
                >
                  {isPro ? 'You have Pro' : isAuthenticated ? 'Upgrade with Stripe' : 'Create an account to upgrade'}
                </Button>
              ) : (
                <Button as={Link} to={isAuthenticated ? '/feed' : '/register'} variant="secondary" size="lg" className="mt-8 w-full">
                  {isAuthenticated ? 'Continue with Free' : 'Start for free'}
                </Button>
              )}
            </Card>
          );
        })}
      </div>

      <section aria-labelledby="faq-heading">
        <h2 id="faq-heading" className="text-lg font-semibold">Frequently asked questions</h2>
        <div className="mt-4 divide-y divide-line rounded-2xl border border-line bg-surface">
          {faq.map((item) => (
            <details key={item.question} className="group px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-fg">
                {item.question}
                <Info className="size-4 text-fg-subtle transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <p className="mt-2 text-sm text-fg-muted">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
