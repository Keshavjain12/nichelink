import { Compass } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/Feedback';
import { useDocumentTitle } from '../hooks/common';

export default function NotFoundPage() {
  useDocumentTitle('Page not found');
  return (
    <EmptyState
      icon={Compass}
      title="We couldn't find that page"
      description="The link may be broken, or the content may have been removed."
      className="py-24"
      action={
        <Button as={Link} to="/communities">
          Explore communities
        </Button>
      }
    />
  );
}
