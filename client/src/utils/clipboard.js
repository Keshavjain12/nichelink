import { toast } from 'sonner';

/** Copies a shareable post URL, reporting success or failure to the user. */
export function copyPostLink(postId) {
  const url = `${window.location.origin}/posts/${postId}`;
  if (!navigator.clipboard) {
    toast.error('Copying is not available in this browser');
    return;
  }
  navigator.clipboard
    .writeText(url)
    .then(() => toast.success('Link copied to clipboard'))
    .catch(() => toast.error('Could not copy the link'));
}
