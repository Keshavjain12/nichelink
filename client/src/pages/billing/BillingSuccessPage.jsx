import { CircleCheck, Clock, TriangleAlert } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { Spinner } from '../../components/common/Feedback';
import { refreshCurrentUser } from '../../features/auth/sessionThunks';
import {
  useConfirmCheckoutSessionMutation,
  useGetSubscriptionQuery,
} from '../../features/subscriptions/subscriptionsApi';
import { useDocumentTitle } from '../../hooks/common';
import { getErrorMessage } from '../../utils/errors';

const POLL_INTERVAL_MS = 3000;
const MAX_WAIT_MS = 45_000;

/**
 * The redirect back from Stripe is not proof of payment. This page asks the server to verify the
 * session with Stripe, then waits for the verified subscription state to show Pro.
 */
export default function BillingSuccessPage() {
  useDocumentTitle('Confirming your upgrade');
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [confirm, { error: confirmError }] = useConfirmCheckoutSessionMutation();
  const [timedOut, setTimedOut] = useState(false);
  const startedRef = useRef(false);

  const { data: subscription } = useGetSubscriptionQuery(undefined, {
    pollingInterval: timedOut ? 0 : POLL_INTERVAL_MS,
  });
  const isPro = subscription?.plan === 'pro';

  useEffect(() => {
    if (startedRef.current || !sessionId) return;
    startedRef.current = true;
    confirm(sessionId);
  }, [sessionId, confirm]);

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), MAX_WAIT_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isPro) dispatch(refreshCurrentUser());
  }, [isPro, dispatch]);

  let content;
  if (isPro) {
    content = (
      <>
        <CircleCheck className="mx-auto size-12 text-emerald-500" aria-hidden="true" />
        <h1 className="mt-4 text-2xl font-bold tracking-tight">Welcome to NicheLink Pro</h1>
        <p className="mt-2 text-sm text-fg-muted">
          Payment verified. Posting, unlimited messaging, Pro communities and Project Match are unlocked.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button as={Link} to="/posts/new">Start a discussion</Button>
          <Button as={Link} to="/communities?access=pro" variant="secondary">Explore Pro communities</Button>
        </div>
      </>
    );
  } else if (confirmError && confirmError.status !== 'FETCH_ERROR') {
    content = (
      <>
        <TriangleAlert className="mx-auto size-12 text-rose-500" aria-hidden="true" />
        <h1 className="mt-4 text-2xl font-bold tracking-tight">We couldn't verify this checkout</h1>
        <p className="mt-2 text-sm text-fg-muted">{getErrorMessage(confirmError)}</p>
        <Button as={Link} to="/settings/billing" variant="secondary" className="mt-6">Go to billing</Button>
      </>
    );
  } else if (timedOut) {
    content = (
      <>
        <Clock className="mx-auto size-12 text-amber-500" aria-hidden="true" />
        <h1 className="mt-4 text-2xl font-bold tracking-tight">Your payment is still processing</h1>
        <p className="mt-2 text-sm text-fg-muted">
          Stripe hasn't confirmed the subscription yet. Pro unlocks automatically as soon as it does — you can keep using NicheLink.
        </p>
        <Button as={Link} to="/feed" variant="secondary" className="mt-6">Back to your feed</Button>
      </>
    );
  } else {
    content = (
      <>
        <Spinner className="size-10" label="Confirming payment" />
        <h1 className="mt-4 text-2xl font-bold tracking-tight">Confirming your upgrade…</h1>
        <p className="mt-2 text-sm text-fg-muted">We're verifying your payment with Stripe. This usually takes a few seconds.</p>
      </>
    );
  }

  return (
    <div className="mx-auto max-w-lg py-10">
      <Card className="p-10 text-center" aria-live="polite">{content}</Card>
    </div>
  );
}
