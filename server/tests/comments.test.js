import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { Comment, Notification, Post } from '../src/models/index.js';
import { createComment, createPost } from './fixtures.js';
import { bearer, buildApp, createCommunity, createFreeUser, createProUser, joinCommunity } from './helpers.js';

describe('comments API', () => {
  let app;
  let author;
  let post;

  beforeEach(async () => {
    app = buildApp();
    author = await createProUser();
    const community = await createCommunity();
    post = await createPost({ author, community });
  });

  const commentOn = (user, body) =>
    request(app).post(`/api/v1/posts/${post._id}/comments`).set(bearer(user)).send(body);

  it('rejects FreeMembers', async () => {
    const free = await createFreeUser();
    const res = await commentOn(free, { content: 'Can I comment?' }).expect(403);
    expect(res.body.code).toBe('PRO_REQUIRED');
  });

  it('creates nested replies, maintains counters and notifies participants', async () => {
    const commenter = await createProUser();
    const replier = await createProUser();

    const root = await commentOn(commenter, { content: 'Which cache backend did you use?' }).expect(201);
    const reply = await commentOn(author, { content: 'S3-backed remote cache.', parentId: root.body.data.id }).expect(201);
    await commentOn(replier, { content: 'Same here, works great.', parentId: reply.body.data.id }).expect(201);

    expect(reply.body.data).toMatchObject({ depth: 1, parentId: root.body.data.id, rootId: root.body.data.id });

    const thread = await request(app).get(`/api/v1/posts/${post._id}/comments`).set(bearer(commenter)).expect(200);
    expect(thread.body.data).toHaveLength(1);
    expect(thread.body.data[0].replies[0].replies[0].content).toBe('Same here, works great.');
    expect(thread.body.meta.total).toBe(3);

    expect((await Post.findById(post._id).lean()).commentCount).toBe(3);
    expect((await Comment.findById(root.body.data.id).lean()).replyCount).toBe(1);

    // The author's own reply never notifies themselves; the third reply targets the author's comment,
    // so it is delivered once as a reply rather than twice.
    expect(await Notification.countDocuments({ recipient: author._id, type: 'post_comment' })).toBe(1);
    expect(await Notification.countDocuments({ recipient: commenter._id, type: 'comment_reply' })).toBe(1);
    expect(await Notification.countDocuments({ recipient: author._id, type: 'comment_reply' })).toBe(1);
  });

  it('enforces the maximum thread depth', async () => {
    const pro = await createProUser();
    let parentId;
    for (let depth = 0; depth < 4; depth += 1) {
      const res = await commentOn(pro, { content: `Depth ${depth}`, parentId }).expect(201);
      parentId = res.body.data.id;
    }
    await commentOn(pro, { content: 'Too deep', parentId }).expect(400);
  });

  it('rejects replies to comments on a different post', async () => {
    const pro = await createProUser();
    const community = await createCommunity();
    const otherPost = await createPost({ author, community });
    const foreign = await createComment({ post: otherPost, author: pro });
    await commentOn(pro, { content: 'Cross-post reply', parentId: String(foreign._id) }).expect(404);
  });

  it('only lets authors edit, and authors or moderators delete', async () => {
    const commenter = await createProUser();
    const stranger = await createProUser();
    const comment = await commentOn(commenter, { content: 'Original text' }).expect(201);
    const id = comment.body.data.id;

    await request(app).patch(`/api/v1/comments/${id}`).set(bearer(stranger)).send({ content: 'Edited by stranger' }).expect(403);
    await request(app).delete(`/api/v1/comments/${id}`).set(bearer(stranger)).expect(403);

    const edited = await request(app).patch(`/api/v1/comments/${id}`).set(bearer(commenter)).send({ content: 'Edited text' }).expect(200);
    expect(edited.body.data.content).toBe('Edited text');

    const community = await Post.findById(post._id).select('community').lean();
    const moderator = await createFreeUser();
    await joinCommunity(moderator, { _id: community.community }, 'moderator');
    await request(app).delete(`/api/v1/comments/${id}`).set(bearer(moderator)).expect(200);
    expect((await Comment.findById(id).lean()).status).toBe('removed');
  });

  it('keeps deleted comments as placeholders only when they have replies', async () => {
    const commenter = await createProUser();
    const parent = await commentOn(commenter, { content: 'Parent' }).expect(201);
    await commentOn(author, { content: 'Child', parentId: parent.body.data.id }).expect(201);
    const lonely = await commentOn(commenter, { content: 'Lonely' }).expect(201);

    await request(app).delete(`/api/v1/comments/${parent.body.data.id}`).set(bearer(commenter)).expect(200);
    await request(app).delete(`/api/v1/comments/${lonely.body.data.id}`).set(bearer(commenter)).expect(200);

    const thread = await request(app).get(`/api/v1/posts/${post._id}/comments`).set(bearer(author)).expect(200);
    expect(thread.body.data).toHaveLength(1);
    expect(thread.body.data[0]).toMatchObject({ isDeleted: true, content: null, author: null });
    expect(thread.body.data[0].replies[0].content).toBe('Child');
    expect((await Post.findById(post._id).lean()).commentCount).toBe(1);
  });
});
