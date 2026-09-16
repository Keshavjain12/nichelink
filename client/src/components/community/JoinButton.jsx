import { Check, Crown, LogIn, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useJoinCommunityMutation, useLeaveCommunityMutation } from '../../features/communities/communitiesApi';
import { getErrorMessage } from '../../utils/errors';
import { Button } from '../common/Button';
import { ConfirmDialog } from '../common/Dialog';

export default function JoinButton({ community, size = 'sm', className }) {
  const [join, { isLoading: joining }] = useJoinCommunityMutation();
  const [leave, { isLoading: leaving }] = useLeaveCommunityMutation();
  const [confirmLeave, setConfirmLeave] = useState(false);
  const viewer = community.viewer ?? {};

  if (!viewer.isAuthenticated) {
    return (
      <Button as={Link} to={`/login?redirect=/communities/${community.slug}`} size={size} variant="secondary" leftIcon={LogIn} className={className}>
        Sign in to join
      </Button>
    );
  }

  if (viewer.isMember) {
    if (viewer.role === 'owner') {
      return (
        <Button size={size} variant="secondary" leftIcon={Check} disabled className={className}>
          Owner
        </Button>
      );
    }
    return (
      <>
        <Button
          size={size}
          variant="secondary"
          leftIcon={Check}
          onClick={() => setConfirmLeave(true)}
          className={className}
          aria-label={`Joined ${community.name}. Leave community`}
        >
          Joined
        </Button>
        <ConfirmDialog
          open={confirmLeave}
          onClose={() => setConfirmLeave(false)}
          title={`Leave ${community.name}?`}
          description="You can rejoin at any time. Your posts stay in the community."
          confirmLabel="Leave community"
          loading={leaving}
          onConfirm={async () => {
            try {
              await leave(community.slug).unwrap();
              toast.success(`You left ${community.name}`);
              setConfirmLeave(false);
            } catch (error) {
              toast.error(getErrorMessage(error));
            }
          }}
        />
      </>
    );
  }

  if (viewer.requiresPro) {
    return (
      <Button as={Link} to="/pricing" size={size} variant="pro" leftIcon={Crown} className={className}>
        Pro only
      </Button>
    );
  }

  if (viewer.isBanned) {
    return (
      <Button size={size} variant="secondary" disabled className={className}>
        Unavailable
      </Button>
    );
  }

  return (
    <Button
      size={size}
      leftIcon={UserPlus}
      loading={joining}
      className={className}
      onClick={async () => {
        try {
          await join(community.slug).unwrap();
          toast.success(`Welcome to ${community.name}!`);
        } catch (error) {
          toast.error(getErrorMessage(error));
        }
      }}
    >
      Join
    </Button>
  );
}
