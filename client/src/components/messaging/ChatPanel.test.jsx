import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { apiError, apiList, apiSuccess, authenticatedState, mockApi, renderWithProviders } from '../../test/utils';
import ChatPanel from './ChatPanel';

// The socket is offline in tests, so the component must fall back to the REST endpoint.
vi.mock('../../services/socket', () => ({
  connectSocket: vi.fn(),
  getSocket: () => null,
  disconnectSocket: vi.fn(),
  emitWithAck: vi.fn(),
}));

const CONVERSATION_ID = '64b7f0f0f0f0f0f0f0f0f0c1';
const ME = '64b7f0f0f0f0f0f0f0f0f001';

const conversation = apiSuccess({
  id: CONVERSATION_ID,
  participant: { id: 'u2', name: 'Sofia Marquez', username: 'sofia_writes', avatarUrl: null, headline: 'Technical writer', isPro: false, isAdmin: false, isOnline: true },
  unreadCount: 0,
  lastReadAt: null,
  participantLastReadAt: null,
  lastMessage: null,
  lastMessageAt: '2026-09-16T09:00:00.000Z',
  createdAt: '2026-09-16T09:00:00.000Z',
});

const history = apiList(
  [
    { id: 'm1', conversationId: CONVERSATION_ID, senderId: 'u2', body: 'Do you take contract work?', clientId: null, createdAt: '2026-09-16T09:00:00.000Z' },
    { id: 'm2', conversationId: CONVERSATION_ID, senderId: ME, body: 'I do — sending samples over.', clientId: null, createdAt: '2026-09-16T09:05:00.000Z' },
  ],
  { limit: 30, hasMore: false, nextCursor: null },
);

const routes = (overrides = {}) => ({
  [`GET /api/v1/conversations/${CONVERSATION_ID}`]: conversation,
  [`GET /api/v1/conversations/${CONVERSATION_ID}/messages`]: history,
  'GET /api/v1/conversations/quota': apiSuccess({ unlimited: false, limit: 10, used: 2, remaining: 8 }),
  [`PATCH /api/v1/conversations/${CONVERSATION_ID}/read`]: apiSuccess({ conversationId: CONVERSATION_ID, unreadCount: 0 }),
  ...overrides,
});

describe('ChatPanel', () => {
  it('renders the thread with the participant header', async () => {
    mockApi(routes());
    renderWithProviders(<ChatPanel conversationId={CONVERSATION_ID} />, { preloadedState: authenticatedState({ role: 'ProMember' }) });

    expect(await screen.findByText('Do you take contract work?')).toBeInTheDocument();
    expect(screen.getByText('I do — sending samples over.')).toBeInTheDocument();
    expect(screen.getByText('Sofia Marquez')).toBeInTheDocument();
  });

  it('sends optimistically over REST when the socket is offline', async () => {
    const { calls } = mockApi(
      routes({
        // Echo the caller's clientId, exactly as the API does, so the optimistic
        // bubble is replaced rather than duplicated.
        [`POST /api/v1/conversations/${CONVERSATION_ID}/messages`]: ({ body }) =>
          apiSuccess({
            id: 'm3',
            conversationId: CONVERSATION_ID,
            senderId: ME,
            body: body.body,
            clientId: body.clientId,
            createdAt: '2026-09-16T09:10:00.000Z',
          }),
      }),
    );
    const { user } = renderWithProviders(<ChatPanel conversationId={CONVERSATION_ID} />, {
      preloadedState: authenticatedState({ role: 'ProMember' }),
    });

    await screen.findByText('Do you take contract work?');
    await user.type(screen.getByLabelText('Write a message'), 'Great — what is your availability?');
    await user.click(screen.getByRole('button', { name: 'Send message' }));

    // The optimistic bubble appears before the request resolves…
    expect(screen.getByText('Great — what is your availability?')).toBeInTheDocument();
    await waitFor(() => expect(calls.some((call) => call.key === `POST /api/v1/conversations/${CONVERSATION_ID}/messages`)).toBe(true));
    // …and is not duplicated once the server confirms it.
    await waitFor(() => expect(screen.getAllByText('Great — what is your availability?')).toHaveLength(1));
    expect(screen.getByLabelText('Write a message')).toHaveValue('');
  });

  it('marks a failed send for retry instead of losing the message', async () => {
    mockApi(
      routes({
        [`POST /api/v1/conversations/${CONVERSATION_ID}/messages`]: apiError(403, 'Free members can send 10 messages per day.', 'DM_LIMIT_REACHED'),
      }),
    );
    const { user } = renderWithProviders(<ChatPanel conversationId={CONVERSATION_ID} />, {
      preloadedState: authenticatedState({ role: 'FreeMember' }),
    });

    await screen.findByText('Do you take contract work?');
    await user.type(screen.getByLabelText('Write a message'), 'One more question');
    await user.click(screen.getByRole('button', { name: 'Send message' }));

    expect(await screen.findByRole('button', { name: /failed to send/i })).toBeInTheDocument();
    expect(screen.getByText('One more question')).toBeInTheDocument();
  });

  it('shows the Free-tier quota and blocks sending once it is used up', async () => {
    mockApi(routes({ 'GET /api/v1/conversations/quota': apiSuccess({ unlimited: false, limit: 10, used: 10, remaining: 0 }) }));
    renderWithProviders(<ChatPanel conversationId={CONVERSATION_ID} />, { preloadedState: authenticatedState({ role: 'FreeMember' }) });

    expect(await screen.findByText(/used all your free messages/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Write a message')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled();
  });
});
