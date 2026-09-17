import { MessagesSquare, PenSquare, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Avatar } from '../components/common/Avatar';
import { UserBadges } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Dialog } from '../components/common/Dialog';
import { EmptyState, ErrorState, Skeleton } from '../components/common/Feedback';
import { Input } from '../components/common/Field';
import { RelativeTime } from '../components/common/Misc';
import ChatPanel from '../components/messaging/ChatPanel';
import { presenceSynced } from '../features/realtime/realtimeSlice';
import {
  useListConversationsQuery,
  useStartConversationMutation,
} from '../features/messages/messagesApi';
import { useGetSearchSuggestionsQuery } from '../features/users/usersApi';
import { useDebouncedValue, useDocumentTitle } from '../hooks/common';
import { useAuth } from '../hooks/useAuth';
import { getErrorMessage } from '../utils/errors';
import { cn } from '../utils/misc';

function NewConversationDialog({ open, onClose }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const debounced = useDebouncedValue(query.trim(), 250);
  const { data, isFetching } = useGetSearchSuggestionsQuery(debounced, {
    skip: debounced.length < 2,
  });
  const [startConversation, { isLoading }] = useStartConversationMutation();
  const people = (data?.users ?? []).filter((person) => person.id !== user.id);

  const start = async (person) => {
    try {
      const conversation = await startConversation(person.id).unwrap();
      onClose();
      navigate(`/messages/${conversation.id}`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="New message"
      description="Search members by username."
    >
      <label htmlFor="new-conversation-search" className="sr-only">
        Search members
      </label>
      <Input
        id="new-conversation-search"
        autoFocus
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Type a username, e.g. daniel"
      />
      <ul className="mt-3 max-h-72 space-y-1 overflow-y-auto" aria-busy={isFetching}>
        {debounced.length >= 2 && !isFetching && people.length === 0 && (
          <li className="px-3 py-6 text-center text-sm text-fg-subtle">
            No members found for “{debounced}”.
          </li>
        )}
        {people.map((person) => (
          <li key={person.id}>
            <button
              type="button"
              disabled={isLoading}
              onClick={() => start(person)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-surface-hover"
            >
              <Avatar user={person} size="sm" showPresence />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  {person.name} <UserBadges user={person} />
                </span>
                <span className="block truncate text-xs text-fg-subtle">
                  @{person.username}
                  {person.headline ? ` · ${person.headline}` : ''}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}

function ConversationList({ activeId, onCompose }) {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const [filter, setFilter] = useState('');
  const { data, isLoading, error, refetch } = useListConversationsQuery();

  useEffect(() => {
    if (!data) return;
    const participants = data.items.map((conversation) => conversation.participant).filter(Boolean);
    dispatch(
      presenceSynced({
        userIds: participants.map((participant) => participant.id),
        online: participants
          .filter((participant) => participant.isOnline)
          .map((participant) => participant.id),
      }),
    );
  }, [data, dispatch]);

  const conversations = useMemo(() => {
    const term = filter.trim().toLowerCase();
    return (data?.items ?? []).filter(
      (conversation) =>
        !term ||
        conversation.participant?.name.toLowerCase().includes(term) ||
        conversation.participant?.username.includes(term),
    );
  }, [data, filter]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
        <h1 className="text-lg font-semibold">Messages</h1>
        <Button size="icon-sm" variant="ghost" onClick={onCompose} aria-label="New message">
          <PenSquare className="size-4" aria-hidden="true" />
        </Button>
      </div>
      <div className="border-b border-line p-3">
        <div className="relative">
          <label htmlFor="conversation-filter" className="sr-only">
            Filter conversations
          </label>
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle"
            aria-hidden="true"
          />
          <Input
            id="conversation-filter"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Filter conversations"
            className="h-9 pl-9"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {isLoading &&
          Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="flex items-center gap-3 px-3 py-3">
              <Skeleton className="size-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            </div>
          ))}
        {error && <ErrorState error={error} onRetry={refetch} className="py-8" />}
        {data && conversations.length === 0 && (
          <EmptyState
            icon={MessagesSquare}
            title={filter ? 'No matches' : 'No conversations yet'}
            description={
              filter ? undefined : 'Say hello to someone whose post or project caught your eye.'
            }
            action={
              !filter && (
                <Button size="sm" onClick={onCompose}>
                  Start a conversation
                </Button>
              )
            }
            className="py-10"
          />
        )}
        <ul className="space-y-0.5">
          {conversations.map((conversation) => {
            const { participant, lastMessage, unreadCount } = conversation;
            const fromMe = lastMessage?.senderId === user.id;
            return (
              <li key={conversation.id}>
                <Link
                  to={`/messages/${conversation.id}`}
                  aria-current={conversation.id === activeId ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors',
                    conversation.id === activeId
                      ? 'bg-brand-50 dark:bg-brand-500/10'
                      : 'hover:bg-surface-hover',
                  )}
                >
                  <Avatar user={participant} showPresence />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span
                        className={cn(
                          'truncate text-sm',
                          unreadCount ? 'font-semibold text-fg' : 'font-medium text-fg',
                        )}
                      >
                        {participant?.name ?? 'Deleted member'}
                      </span>
                      {lastMessage && (
                        <RelativeTime
                          value={lastMessage.createdAt}
                          className="shrink-0 text-xs text-fg-subtle"
                        />
                      )}
                    </span>
                    <span className="flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          'truncate text-sm',
                          unreadCount ? 'text-fg' : 'text-fg-subtle',
                        )}
                      >
                        {lastMessage
                          ? `${fromMe ? 'You: ' : ''}${lastMessage.body}`
                          : 'No messages yet'}
                      </span>
                      {unreadCount > 0 && (
                        <span className="inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-brand-600 px-1.5 text-[11px] font-bold leading-5 text-white">
                          {unreadCount}
                          <span className="sr-only"> unread</span>
                        </span>
                      )}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  useDocumentTitle('Messages');
  const { conversationId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [composing, setComposing] = useState(false);
  const [startConversation] = useStartConversationMutation();
  const recipientId = searchParams.get('to');
  const startedFor = useRef(null);

  // Deep link from profiles and projects: /messages?to=<userId>
  useEffect(() => {
    if (!recipientId || startedFor.current === recipientId) return;
    startedFor.current = recipientId;
    startConversation(recipientId)
      .unwrap()
      .then((conversation) => navigate(`/messages/${conversation.id}`, { replace: true }))
      .catch((error) => {
        toast.error(getErrorMessage(error));
        navigate('/messages', { replace: true });
      });
  }, [recipientId, startConversation, navigate]);

  return (
    <div className="-mx-4 grid grid-cols-1 h-[calc(100dvh-7.25rem)] overflow-hidden border-line bg-surface sm:mx-0 sm:h-[calc(100dvh-8rem)] sm:rounded-2xl sm:border sm:shadow-card md:grid-cols-[320px_minmax(0,1fr)] lg:h-[calc(100dvh-6.5rem)]">
      <aside
        className={cn(
          'min-h-0 border-line md:border-r',
          conversationId ? 'hidden md:block' : 'block',
        )}
        aria-label="Conversations"
      >
        <ConversationList activeId={conversationId} onCompose={() => setComposing(true)} />
      </aside>
      <section
        className={cn('min-h-0', conversationId ? 'block' : 'hidden md:block')}
        aria-label="Conversation"
      >
        {conversationId ? (
          <ChatPanel key={conversationId} conversationId={conversationId} />
        ) : (
          <EmptyState
            icon={MessagesSquare}
            title="Your conversations"
            description="Pick a conversation or start a new one. Messages arrive in real time."
            action={
              <Button leftIcon={PenSquare} onClick={() => setComposing(true)}>
                New message
              </Button>
            }
            className="h-full justify-center"
          />
        )}
      </section>
      <NewConversationDialog open={composing} onClose={() => setComposing(false)} />
    </div>
  );
}
