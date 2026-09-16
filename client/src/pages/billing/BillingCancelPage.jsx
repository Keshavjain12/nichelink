import { CircleX } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { useDocumentTitle } from '../../hooks/common';

export default function BillingCancelPage() {
  useDocumentTitle('Checkout cancelled');
  return (
    <div className="mx-auto max-w-lg py-10">
      <Card className="p-10 text-center">
        <CircleX className="mx-auto size-12 text-fg-subtle" aria-hidden="true" />
        <h1 className="mt-4 text-2xl font-bold tracking-tight">Checkout cancelled</h1>
        <p className="mt-2 text-sm text-fg-muted">No payment was taken and your plan hasn't changed.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button as={Link} to="/pricing">Review plans</Button>
          <Button as={Link} to="/feed" variant="secondary">Back to your feed</Button>
        </div>
      </Card>
    </div>
  );
}
