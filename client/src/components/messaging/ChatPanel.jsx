import { ArrowLeft, CheckCheck, Crown, RefreshCw, SendHorizontal, WifiOff } from 'lucide-react';
import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '../../app/api';
import { ERROR_CODES, PERMISSIONS, SOCKET_EVENTS } from '../../constants/app';
import { LIMITS } from '../../constants/content';
import { applyIncomingMessage } from '../../features/realtime/useRealtimeBridge';
import { selectSocketConnected, selectTypingUser, typingChanged } from '../../features/realtime/realtimeSlice';
import {
  useGetConversationQuery,
  useGetMessagingQuotaQuery,
  useListMessagesInfiniteQuery,
  useMarkConversationReadMutation,
  useSendMessageMutation,
} from '../../features/messages/messagesApi';
import { useAuth } from '../../hooks/useAuth';
import { emitWithAck, getSocket } from '../../services/socket';
import { getErrorCode, getErrorMessage } from '../../utils/errors';
import { formatDayLabel, formatTime, isSameDay } from '../../utils/format';
import { cn, createClientId } from '../../utils/misc';
import { Avatar } from '../common/Avatar';
import { UserBadges } from '../common/Badge';
import { Button } from '../common/Button';
import { ErrorState, Skeleton, Spinner } from '../common/Feedback';

const TYPING_IDLE_MS = 2500;
const TYPING_STALE_MS = 6000;

function useMessageCache(conversationId) {
  const dispatch = useDispatch();
  return useCallback(
    (recipe) => dispatch(api.util.updateQueryData('listMessages', conversationId, (draft) => recipe(draft))),
    [dispatch, conversationId],
  );
}

function MessageBubble({ message, isOwn, showSeen, onRetry }) {
  return (
    <div className={cn('flex flex-col', isOwn ? 'items-end' : 'items-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-6 whitespace-pre-wrap break-words sm:max-w-[70%]',
          isOwn ? 'rounded-br-md bg-brand-600 text-white' : 'rounded-bl-md bg-surface-muted text-fg',
          message.pending && 'opacity-70',
          message.failed && 'bg-rose-600',
        )}
      >
        {message.body}
      </div>
      <div className="mt-0.5 flex items-center gap-1.5 px-1 text-[11px] text-fg-subtle">
        {message.failed ? (
          <button type="button" onClick={() => onRetry(message)} className="inline-flex items-center gap-1 font-medium text-rose-600 hover:underline dark:text-rose-400">
            <RefreshCw className="size-3" aria-hidden="true" /> Failed to send — retry
          </button>
        ) : message.pending ? (
          'Sending…'
        ) : (
          <time dateTime={message.createdAt}>{formatTime(message.createdAt)}</time>
        )}
        {showSeen && (
          <span className="inline-flex items-center gap-0.5 text-brand-600 dark:text-brand-400">
            <CheckCheck className="size-3.5" aria-hidden="true" /> Seen
          </span>
        )}
      </div>
    </div>
  );
}

export default function ChatPanel({ conversationId }) {
  const dispatch = useDispatch();
  const { user, can } = useAuth();
  const connected = useSelector(selectSocketConnected);
  const typingUserId = useSelector(selectTypingUser(conversationId));
  const updateMessages = useMessageCache(conversationId);

  const { data: conversation, error: conversationError, refetch } = useGetConversationQuery(conversationId);
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useListMessagesInfiniteQuery(conversationId);
  const isUnlimited = can(PERMISSIONS.MESSAGE_UNLIMITED);
  const { data: quota } = useGetMessagingQuotaQuery(undefined, { skip: isUnlimited });
  const [sendViaRest] = useSendMessageMutation();
  const [markReadViaRest] = useMarkConversationReadMutation();

  const [draft, setDraft] = useState('');
  const scrollRef = useRef(null);
  const textareaRef = useRef(null);
  const stickToBottom = useRef(true);
  const previousScrollHeight = useRef(null);
  const typingTimer = useRef(null);
  const isTyping = useRef(false);
  const lastReadMessageId = useRef(null);

  const messages = (data?.pages ?? []).slice().reverse().flatMap((page) => page.items);
  const lastMessage = messages.at(-1);
  const participant = conversation?.participant;
  const quotaExhausted = quota && !quota.unlimited && quota.remaining === 0;

  // Join the conversation room (typing indicators) whenever the socket (re)connects.
  useEffect(() => {
    if (!connected) return undefined;
    emitWithAck(SOCKET_EVENTS.JOIN_CONVERSATION, { conversationId }).catch((error) => {
      if (error.code !== 'SOCKET_DISCONNECTED') toast.error(getErrorMessage(error, 'Could not open live updates'));
    });
    return () => {
      getSocket()?.emit(SOCKET_EVENTS.LEAVE_CONVERSATION, { conversationId });
    };
  }, [connected, conversationId]);

  // Mark as read when a new message from the other participant is visible.
  useEffect(() => {
    if (!lastMessage || lastMessage.pending || lastReadMessageId.current === lastMessage.id) return;
    if (document.visibilityState !== 'visible') return;
    lastReadMessageId.current = lastMessage.id;
    if (lastMessage.senderId === user.id && !conversation?.unreadCount) return;

    const markRead = connected
      ? emitWithAck(SOCKET_EVENTS.MESSAGE_READ, { conversationId })
      : markReadViaRest(conversationId).unwrap();
    markRead
      .then(() => dispatch(api.util.invalidateTags(['UnreadMessages'])))
      .catch(() => {
        lastReadMessageId.current = null;
      });
  }, [lastMessage, conversationId, connected, user.id, conversation?.unreadCount, markReadViaRest, dispatch]);

  // Clear a stale typing indicator if the "stop" event was lost.
  useEffect(() => {
    if (!typingUserId) return undefined;
    const timer = setTimeout(() => dispatch(typingChanged({ conversationId, userId: typingUserId, isTyping: false })), TYPING_STALE_MS);
    return () => clearTimeout(timer);
  }, [typingUserId, conversationId, dispatch]);

  // Scroll management: stay pinned to the bottom for new messages, preserve position when loading history.
  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    if (previousScrollHeight.current !== null) {
      element.scrollTop += element.scrollHeight - previousScrollHeight.current;
      previousScrollHeight.current = null;
    } else if (stickToBottom.current) {
      element.scrollTop = element.scrollHeight;
    }
  }, [messages.length, typingUserId]);

  const loadOlder = () => {
    previousScrollHeight.current = scrollRef.current?.scrollHeight ?? null;
    fetchNextPage();
  };

  const stopTyping = () => {
    clearTimeout(typingTimer.current);
    if (isTyping.current) {
      isTyping.current = false;
      getSocket()?.emit(SOCKET_EVENTS.TYPING_STOP, { conversationId });
    }
  };

  const signalTyping = () => {
    if (!connected) return;
    if (!isTyping.current) {
      isTyping.current = true;
      getSocket()?.emit(SOCKET_EVENTS.TYPING_START, { conversationId });
    }
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(stopTyping, TYPING_IDLE_MS);
  };

  const deliver = async (clientId, body) => {
    updateMessages((draftCache) => {
      draftCache.pages.forEach((page) =>
        page.items.forEach((item) => {
          if (item.clientId === clientId) Object.assign(item, { pending: true, failed: false });
        }),
      );
    });

    try {
      const message = connected
        ? await emitWithAck(SOCKET_EVENTS.SEND_MESSAGE, { conversationId, body, clientId })
        : await sendViaRest({ conversationId, body, clientId }).unwrap();
      applyIncomingMessage(dispatch, {
        message,
        conversation: { id: conversationId, lastMessage: { body, senderId: user.id, createdAt: message.createdAt }, lastMessageAt: message.createdAt, unreadCount: 0 },
      });
    } catch (error) {
      updateMessages((draftCache) => {
        draftCache.pages.forEach((page) =>
          page.items.forEach((item) => {
            if (item.clientId === clientId) Object.assign(item, { pending: false, failed: true });
          }),
        );
      });
      if (getErrorCode(error) === ERROR_CODES.DM_LIMIT_REACHED) {
        dispatch(api.util.invalidateTags([{ type: 'Conversation', id: 'QUOTA' }]));
        toast.error('Daily message limit reached', {
          description: 'Upgrade to Pro for unlimited messaging.',
          action: { label: 'Upgrade', onClick: () => window.location.assign('/pricing') },
        });
      } else {
        toast.error(getErrorMessage(error, 'Message not sent'));
      }
    }
  };

  const send = (event) => {
    event?.preventDefault();
    const body = draft.trim();
    if (!body || quotaExhausted) return;

    const clientId = createClientId();
    stickToBottom.current = true;
    updateMessages((draftCache) => {
      draftCache.pages[0]?.items.push({
        id: `pending-${clientId}`,
        clientId,
        conversationId,
        senderId: user.id,
        body,
        createdAt: new Date().toISOString(),
        pending: true,
      });
    });
    setDraft('');
    stopTyping();
    textareaRef.current?.focus();
    deliver(clientId, body);
  };

  if (conversationError) {
    return <ErrorState error={conversationError} title={conversationError.status === 404 ? 'Conversation not found' : 'Could not open conversation'} onRetry={conversationError.status === 404 ? undefined : refetch} className="h-full justify-center" />;
  }

  const lastOwnSeenId = (() => {
    if (!conversation?.participantLastReadAt) return null;
    const readAt = new Date(conversation.participantLastReadAt).getTime();
    return [...messages].reverse().find((message) => message.senderId === user.id && !message.pending && new Date(message.createdAt).getTime() <= readAt)?.id ?? null;
  })();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-3 border-b border-line px-3 py-2.5 sm:px-4">
        <Button as={Link} to="/messages" variant="ghost" size="icon-sm" className="md:hidden" aria-label="Back to conversations">
          <ArrowLeft className="size-4" aria-hidden="true" />
        </Button>
        {participant ? (
          <Link to={`/profile/${participant.username}`} className="flex min-w-0 items-center gap-3">
            <Avatar user={participant} size="sm" showPresence />
            <span className="min-w-0">
              <span className="flex items-center gap-1.5 truncate text-sm font-semibold">{participant.name} <UserBadges user={participant} /></span>
              <span className="block truncate text-xs text-fg-subtle">{typingUserId ? 'typing…' : participant.headline || `@${participant.username}`}</span>
            </span>
          </Link>
        ) : (
          <Skeleton className="h-8 w-40" />
        )}
        {!connected && (
          <span className="ml-auto inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400" role="status">
            <WifiOff className="size-3.5" aria-hidden="true" /> Reconnecting…
          </span>
        )}
      </header>

      <div
        ref={scrollRef}
        onScroll={(event) => {
          const element = event.currentTarget;
          stickToBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 120;
        }}
        className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5"
        role="log"
        aria-live="polite"
        aria-label={participant ? `Conversation with ${participant.name}` : 'Conversation'}
      >
        {hasNextPage && (
          <div className="mb-4 flex justify-center">
            <Button variant="secondary" size="xs" onClick={loadOlder} loading={isFetchingNextPage}>
              Load earlier messages
            </Button>
          </div>
        )}
        {isLoading && (
          <div className="flex h-full items-center justify-center">
            <Spinner label="Loading messages" />
          </div>
        )}
        {!isLoading && messages.length === 0 && participant && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <Avatar user={participant} size="lg" />
            <p className="mt-3 text-sm font-semibold">{participant.name}</p>
            <p className="mt-1 max-w-xs text-sm text-fg-subtle">This is the start of your conversation. Say hello and mention what brought you here.</p>
          </div>
        )}
        <div className="space-y-2">
          {messages.map((message, index) => {
            const previous = messages[index - 1];
            const showDay = !previous || !isSameDay(previous.createdAt, message.createdAt);
            return (
              <Fragment key={message.id}>
                {showDay && (
                  <div className="my-4 flex items-center gap-3 text-[11px] font-medium text-fg-subtle" role="separator">
                    <span className="h-px flex-1 bg-line" />
                    {formatDayLabel(message.createdAt)}
                    <span className="h-px flex-1 bg-line" />
                  </div>
                )}
                <MessageBubble
                  message={message}
                  isOwn={message.senderId === user.id}
                  showSeen={message.id === lastOwnSeenId && message.id === [...messages].reverse().find((item) => item.senderId === user.id)?.id}
                  onRetry={(failed) => deliver(failed.clientId, failed.body)}
                />
              </Fragment>
            );
          })}
        </div>
        {typingUserId && participant && (
          <div className="mt-3 flex items-center gap-2 text-xs text-fg-subtle">
            <span className="inline-flex gap-1 rounded-full bg-surface-muted px-3 py-2" aria-hidden="true">
              {[0, 150, 300].map((delay) => (
                <span key={delay} className="size-1.5 animate-bounce rounded-full bg-fg-subtle" style={{ animationDelay: `${delay}ms` }} />
              ))}
            </span>
            {participant.name.split(' ')[0]} is typing…
          </div>
        )}
      </div>

      <form onSubmit={send} className="border-t border-line p-3">
        {quota && !quota.unlimited && (
          <p className={cn('mb-2 flex items-center justify-between gap-2 text-xs', quotaExhausted ? 'text-rose-600 dark:text-rose-400' : 'text-fg-subtle')}>
            <span>
              {quotaExhausted
                ? "You've used all your free messages for today."
                : `${quota.remaining} of ${quota.limit} free messages left today`}
            </span>
            <Link to="/pricing" className="inline-flex items-center gap-1 font-medium text-amber-600 hover:underline dark:text-amber-400">
              <Crown className="size-3.5" aria-hidden="true" /> Unlimited with Pro
            </Link>
          </p>
        )}
        <div className="flex items-end gap-2">
          <label htmlFor="message-input" className="sr-only">Write a message</label>
          <textarea
            id="message-input"
            ref={textareaRef}
            rows={1}
            value={draft}
            maxLength={LIMITS.MESSAGE_MAX}
            disabled={quotaExhausted}
            onChange={(event) => {
              setDraft(event.target.value);
              signalTyping();
              event.target.style.height = 'auto';
              event.target.style.height = `${Math.min(event.target.scrollHeight, 160)}px`;
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) send(event);
            }}
            onBlur={stopTyping}
            placeholder={quotaExhausted ? 'Daily limit reached' : 'Write a message…'}
            className="max-h-40 min-h-10 flex-1 resize-none rounded-xl border border-line bg-surface px-3.5 py-2 text-sm leading-6 text-fg placeholder:text-fg-subtle focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/20 disabled:opacity-60"
          />
          <Button type="submit" size="icon" disabled={!draft.trim() || quotaExhausted} aria-label="Send message">
            <SendHorizontal className="size-4" aria-hidden="true" />
          </Button>
        </div>
        <p className="mt-1.5 hidden text-[11px] text-fg-subtle sm:block">Enter to send · Shift + Enter for a new line</p>
      </form>
    </div>
  );
}
