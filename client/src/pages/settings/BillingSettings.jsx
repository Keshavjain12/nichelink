import { CreditCard, Crown, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { ConfirmDialog } from '../../components/common/Dialog';
import { ErrorState, InlineAlert, Skeleton } from '../../components/common/Feedback';
import {
  useCancelSubscriptionMutation,
  useGetSubscriptionQuery,
  useOpenBillingPortalMutation,
  useResumeSubscriptionMutation,
} from '../../features/subscriptions/subscriptionsApi';
import { formatDate } from '../../utils/format';
import { getErrorMessage } from '../../utils/errors';
import { redirectTo } from '../../utils/navigation';

const STATUS_BADGES = {
  active: { variant: 'success', label: 'Active' },
  trialing: { variant: 'brand', label: 'Trial' },
  past_due: { variant: 'warning', label: 'Payment issue' },
  canceled: { variant: 'neutral', label: 'Canceled' },
  unpaid: { variant: 'danger', label: 'Unpaid' },
  none: { variant: 'neutral', label: 'No subscription' },
};

export default function BillingSettings() {
  const { data: subscription, isLoading, error, refetch } = useGetSubscriptionQuery();
  const [openPortal, { isLoading: openingPortal }] = useOpenBillingPortalMutation();
  const [cancel, { isLoading: canceling }] = useCancelSubscriptionMutation();
  const [resume, { isLoading: resuming }] = useResumeSubscriptionMutation();
  const [confirmCancel, setConfirmCancel] = useState(false);

  if (isLoading) return <Skeleton className="h-56 rounded-2xl" />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const isPro = subscription.plan === 'pro';
  const isAdmin = subscription.role === 'Admin';
  const status = STATUS_BADGES[subscription.status] ?? { variant: 'neutral', label: subscription.status };
  const managedByStripe = subscription.provider === 'stripe';

  const run = async (action, successMessage) => {
    try {
      const result = await action().unwrap();
      if (result?.url) redirectTo(result.url);
      else if (successMessage) toast.success(successMessage);
    } catch (actionError) {
      toast.error(getErrorMessage(actionError));
    }
  };

  return (
    <div className="space-y-6">
      {subscription.status === 'past_due' && (
        <InlineAlert variant="warning" title="We couldn't process your last payment">
          Stripe will retry automatically. Update your payment method to keep Pro.
        </InlineAlert>
      )}

      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-fg-subtle">Current plan</p>
            <h2 className="mt-1 flex items-center gap-2 text-2xl font-bold tracking-tight">
              {isPro && <Crown className="size-6 text-amber-500" aria-hidden="true" />}
              {isAdmin ? 'Admin (all features)' : isPro ? 'NicheLink Pro' : 'Free'}
            </h2>
          </div>
          {subscription.status !== 'none' && <Badge variant={status.variant}>{status.label}</Badge>}
        </div>

        <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {subscription.currentPeriodEnd && (
            <div>
              <dt className="text-xs text-fg-subtle">{subscription.cancelAtPeriodEnd ? 'Access ends' : 'Renews on'}</dt>
              <dd className="mt-0.5 text-sm font-medium">{formatDate(subscription.currentPeriodEnd, { dateStyle: 'long' })}</dd>
            </div>
          )}
          {subscription.provider && (
            <div>
              <dt className="text-xs text-fg-subtle">Billing</dt>
              <dd className="mt-0.5 text-sm font-medium">{managedByStripe ? 'Stripe (test mode)' : 'Complimentary membership'}</dd>
            </div>
          )}
        </dl>

        {isPro && subscription.cancelAtPeriodEnd && (
          <InlineAlert variant="info" className="mt-5">
            Your membership is set to end on {formatDate(subscription.currentPeriodEnd)}. Resume to keep Pro features.
          </InlineAlert>
        )}

        <div className="mt-6 flex flex-wrap gap-2 border-t border-line pt-5">
          {!isPro && !isAdmin && (
            <Button as={Link} to="/pricing" variant="pro" leftIcon={Crown}>Upgrade to Pro</Button>
          )}
          {subscription.canManageBilling && (
            <Button variant="secondary" leftIcon={ExternalLink} loading={openingPortal} onClick={() => run(openPortal)}>
              Manage payment methods & invoices
            </Button>
          )}
          {isPro && managedByStripe && !subscription.cancelAtPeriodEnd && (
            <Button variant="danger-ghost" onClick={() => setConfirmCancel(true)}>Cancel subscription</Button>
          )}
          {isPro && managedByStripe && subscription.cancelAtPeriodEnd && (
            <Button leftIcon={CreditCard} loading={resuming} onClick={() => run(resume, 'Your Pro membership will renew')}>Resume subscription</Button>
          )}
        </div>
        {!subscription.paymentsEnabled && (
          <p className="mt-4 text-xs text-fg-subtle">Payments are not configured on this server, so billing actions are unavailable.</p>
        )}
      </Card>

      <ConfirmDialog
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        title="Cancel NicheLink Pro?"
        description={`You'll keep Pro until ${formatDate(subscription.currentPeriodEnd)}. After that, posting, commenting, Pro communities and unlimited messaging are turned off.`}
        confirmLabel="Cancel at period end"
        loading={canceling}
        onConfirm={async () => {
          await run(cancel, 'Your subscription will end at the close of this billing period');
          setConfirmCancel(false);
        }}
      />
    </div>
  );
}
