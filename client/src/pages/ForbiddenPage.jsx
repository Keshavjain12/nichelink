import { ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/Feedback';
import { useDocumentTitle } from '../hooks/common';

export default function ForbiddenPage() {
  useDocumentTitle('Access denied');
  return (
    <EmptyState
      icon={ShieldAlert}
      title="You don't have access to this area"
      description="This section is limited to administrators. If you think this is a mistake, contact the NicheLink team."
      className="py-24"
      action={
        <Button as={Link} to="/feed" variant="secondary">
          Back to your feed
        </Button>
      }
    />
  );
}
