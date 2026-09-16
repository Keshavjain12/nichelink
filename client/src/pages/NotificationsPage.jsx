import { Bell, CheckCheck } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { EmptyState, ErrorState, Skeleton } from '../components/common/Feedback';
import { LoadMore, PageHeader } from '../components/common/Misc';
import { Tabs } from '../components/common/Tabs';
import NotificationItem from '../components/notifications/NotificationItem';
import {
  useGetUnreadNotificationCountQuery,
  useListNotificationsInfiniteQuery,
  useMarkAllNotificationsReadMutation,
} from '../features/notifications/notificationsApi';
import { useDocumentTitle } from '../hooks/common';
import { getErrorMessage } from '../utils/errors';

export default function NotificationsPage() {
  useDocumentTitle('Notifications');
  const [filter, setFilter] = useState('all');
  const { data: unread = 0 } = useGetUnreadNotificationCountQuery();
  const { data, isLoading, error, refetch, hasNextPage, fetchNextPage, isFetchingNextPage } = useListNotificationsInfiniteQuery(
    filter === 'unread' ? { unread: true } : {},
  );
  const [markAllRead, { isLoading: marking }] = useMarkAllNotificationsReadMutation();
  const items = (data?.pages ?? []).flatMap((page) => page.items);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Notifications"
        description="Replies, reactions, messages and account updates."
        actions={
          <Button
            variant="secondary"
            size="sm"
            leftIcon={CheckCheck}
            loading={marking}
            disabled={!unread}
            onClick={() => markAllRead().unwrap().then(() => toast.success('All caught up')).catch((markError) => toast.error(getErrorMessage(markError)))}
          >
            Mark all as read
          </Button>
        }
      />
      <Tabs
        label="Notification filter"
        value={filter}
        onChange={setFilter}
        tabs={[
          { value: 'all', label: 'All' },
          { value: 'unread', label: 'Unread', count: unread },
        ]}
      />
      <Card className="p-2">
        {isLoading &&
          Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="flex gap-3 px-4 py-4">
              <Skeleton className="size-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        {error && <ErrorState error={error} onRetry={refetch} />}
        {!isLoading && !error && items.length === 0 && (
          <EmptyState icon={Bell} title={filter === 'unread' ? 'No unread notifications' : 'Nothing here yet'} description="When members interact with you, you'll hear about it here." />
        )}
        <div className="divide-y divide-line">
          {items.map((notification) => (
            <NotificationItem key={notification.id} notification={notification} />
          ))}
        </div>
        <LoadMore hasNextPage={hasNextPage} fetchNextPage={fetchNextPage} isFetchingNextPage={isFetchingNextPage} />
      </Card>
    </div>
  );
}
