import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { apiList, apiSuccess, authenticatedState, mockApi, renderWithProviders } from '../test/utils';
import FeedPage from './FeedPage';

const post = {
  id: '64b7f0f0f0f0f0f0f0f0f0a1',
  title: 'Lessons from migrating 40 services to OpenTelemetry',
  excerpt: 'We rolled out tracing incrementally and it paid off.',
  tags: ['observability'],
  images: [],
  reactionCount: 4,
  commentCount: 2,
  status: 'published',
  createdAt: '2026-09-15T10:00:00.000Z',
  editedAt: null,
  author: { id: 'u1', name: 'Mei Lin Zhang', username: 'meilin_ml', avatarUrl: null, headline: 'ML engineer', isPro: true, isAdmin: false },
  community: { id: 'c1', name: 'AI Engineers', slug: 'ai-engineers', icon: '🤖', accentColor: '#7c3aed', accessType: 'public' },
  viewerHasLiked: false,
};

function mockFeed(overrides = {}) {
  return mockApi({
    'GET /api/v1/posts': apiList([post]),
    'GET /api/v1/communities/trending': apiSuccess([]),
    'GET /api/v1/communities/recommended': apiSuccess([]),
    ...overrides,
  });
}

describe('FeedPage', () => {
  it('shows the composer to members who may post', async () => {
    mockFeed();
    renderWithProviders(<FeedPage />, { preloadedState: authenticatedState({ role: 'ProMember' }) });

    expect(await screen.findByText('Start a discussion…')).toBeInTheDocument();
    expect(screen.queryByText(/ready to join the conversation/i)).not.toBeInTheDocument();
  });

  it('offers an upgrade path instead of a composer for Free members', async () => {
    mockFeed();
    renderWithProviders(<FeedPage />, { preloadedState: authenticatedState({ role: 'FreeMember' }) });

    expect(await screen.findByText(/ready to join the conversation/i)).toBeInTheDocument();
    expect(screen.queryByText('Start a discussion…')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /see pro plans/i })).toHaveAttribute('href', '/pricing');
  });

  it('renders posts and requests the selected sort and scope', async () => {
    const { calls } = mockFeed();
    const { user } = renderWithProviders(<FeedPage />, { preloadedState: authenticatedState({ role: 'FreeMember' }) });

    expect(await screen.findByRole('heading', { name: post.title })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /AI Engineers/ })).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'Trending' }));
    await waitFor(() => expect(calls.some((call) => call.url.searchParams.get('sort') === 'trending')).toBe(true));

    await user.click(screen.getByRole('radio', { name: 'My communities' }));
    await waitFor(() => expect(calls.some((call) => call.url.searchParams.get('scope') === 'joined')).toBe(true));
  });

  it('optimistically updates the like count for Free members', async () => {
    const { calls } = mockFeed({
      'PUT /api/v1/posts/64b7f0f0f0f0f0f0f0f0f0a1/reactions': apiSuccess({ liked: true, reactionCount: 5 }),
    });
    const { user } = renderWithProviders(<FeedPage />, { preloadedState: authenticatedState({ role: 'FreeMember' }) });

    const article = await screen.findByRole('article');
    const likeButton = within(article).getByRole('button', { name: /^like\./i });
    expect(likeButton).toHaveAttribute('aria-pressed', 'false');

    await user.click(likeButton);

    await waitFor(() => expect(within(article).getByRole('button', { name: /^unlike/i })).toHaveTextContent('5'));
    expect(calls.some((call) => call.key === 'PUT /api/v1/posts/64b7f0f0f0f0f0f0f0f0f0a1/reactions')).toBe(true);
  });
});
