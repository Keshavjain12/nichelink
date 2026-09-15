import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { env } from '../config/env.js';
import { COMMUNITY_ROLES, ROLES } from '../constants/roles.js';
import * as models from '../models/index.js';
import { refreshUserEntitlement } from '../services/subscriptionService.js';
import { htmlToPlainText, sanitizeRichText } from '../utils/sanitizeHtml.js';
import { buildParticipantKey } from '../models/Conversation.js';
import { truncate } from '../utils/text.js';
import {
  COMMENTS,
  COMMUNITIES,
  CONVERSATIONS,
  DEMO_ACCOUNTS,
  MEMBERSHIPS,
  POSTS,
  PROJECTS,
  REACTIONS,
  USERS,
} from './seedData.js';

const {
  Comment,
  Community,
  Conversation,
  Membership,
  Message,
  Notification,
  Post,
  Project,
  ProjectInterest,
  Reaction,
  Report,
  Subscription,
  User,
} = models;

const HOUR_MS = 60 * 60 * 1000;
const DEFAULT_DEMO_PASSWORD = 'NicheLink-Demo-2026!';

const hoursAgo = (hours) => new Date(Date.now() - hours * HOUR_MS);

function assertSafeToSeed() {
  if (env.isProduction && process.env.ALLOW_PRODUCTION_SEED !== 'true') {
    throw new Error('Refusing to seed a production database. Set ALLOW_PRODUCTION_SEED=true to override.');
  }
}

async function resetDatabase() {
  await Promise.all(Object.values(mongoose.connection.collections).map((collection) => collection.deleteMany({})));
  await Promise.all(
    Object.values(models)
      .filter((model) => typeof model?.syncIndexes === 'function')
      .map((model) => model.syncIndexes()),
  );
}

async function seedUsers(password) {
  const passwordHash = await bcrypt.hash(password, 12);
  const docs = USERS.map((user, index) => ({
    name: user.name,
    username: user.username,
    email: user.email ?? `${user.username}@nichelink.demo`,
    password: passwordHash,
    headline: user.headline,
    bio: user.bio,
    location: user.location,
    website: user.website ?? '',
    skills: user.skills,
    interests: user.interests,
    role: user.admin ? ROLES.ADMIN : ROLES.FREE,
    createdAt: hoursAgo(24 * (40 - index * 2)),
    updatedAt: new Date(),
    lastActiveAt: hoursAgo(index),
  }));

  const inserted = await User.insertMany(docs, { timestamps: false });
  const byKey = Object.fromEntries(USERS.map((user, index) => [user.key, inserted[index]]));

  const year = 365 * 24 * HOUR_MS;
  for (const user of USERS.filter((candidate) => candidate.plan === 'pro')) {
    await Subscription.create({
      user: byKey[user.key]._id,
      provider: 'complimentary',
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + year),
    });
    await refreshUserEntitlement(byKey[user.key]._id);
  }
  return byKey;
}

async function seedCommunities(users) {
  const owner = users.priya;
  const docs = COMMUNITIES.map(({ key: _key, ...community }, index) => ({
    ...community,
    createdBy: owner._id,
    createdAt: hoursAgo(24 * (60 - index)),
    updatedAt: new Date(),
  }));
  const inserted = await Community.insertMany(docs, { timestamps: false });
  const byKey = Object.fromEntries(COMMUNITIES.map((community, index) => [community.key, inserted[index]]));

  const memberships = [];
  for (const [communityKey, { moderators, members }] of Object.entries(MEMBERSHIPS)) {
    const community = byKey[communityKey];
    memberships.push({ user: owner._id, community: community._id, role: COMMUNITY_ROLES.OWNER, joinedAt: community.createdAt });
    moderators.forEach((userKey) =>
      memberships.push({ user: users[userKey]._id, community: community._id, role: COMMUNITY_ROLES.MODERATOR }),
    );
    members.forEach((userKey) => memberships.push({ user: users[userKey]._id, community: community._id }));
  }
  await Membership.insertMany(memberships);
  return byKey;
}

async function seedPosts(users, communities) {
  const docs = POSTS.map((post) => {
    const content = sanitizeRichText(post.content);
    const contentText = htmlToPlainText(content);
    const community = communities[post.community];
    const createdAt = hoursAgo(post.hoursAgo);
    return {
      author: users[post.author]._id,
      community: community._id,
      communityAccess: community.accessType,
      title: post.title,
      content,
      contentText,
      excerpt: truncate(contentText, 280),
      tags: post.tags,
      createdAt,
      updatedAt: createdAt,
    };
  });
  const inserted = await Post.insertMany(docs, { timestamps: false });
  return Object.fromEntries(POSTS.map((post, index) => [post.key, inserted[index]]));
}

async function insertCommentTree(post, nodes, users, { parent = null, root = null, depth = 0, baseHours }) {
  let offset = 0;
  for (const node of nodes) {
    offset += 1;
    const createdAt = new Date(post.createdAt.getTime() + (baseHours + offset) * 0.4 * HOUR_MS);
    const comment = await Comment.create({
      post: post._id,
      author: users[node.author]._id,
      parent: parent?._id ?? null,
      root: root?._id ?? null,
      depth,
      content: node.content,
      replyCount: node.replies?.length ?? 0,
      createdAt: createdAt > new Date() ? new Date() : createdAt,
    });
    if (node.replies?.length) {
      await insertCommentTree(post, node.replies, users, {
        parent: comment,
        root: root ?? comment,
        depth: depth + 1,
        baseHours: baseHours + offset,
      });
    }
  }
}

async function seedEngagement(users, posts) {
  for (const [postKey, threads] of Object.entries(COMMENTS)) {
    await insertCommentTree(posts[postKey], threads, users, { baseHours: 0 });
  }

  const reactions = Object.entries(REACTIONS).flatMap(([postKey, userKeys]) =>
    userKeys.map((userKey) => ({ user: users[userKey]._id, post: posts[postKey]._id })),
  );
  await Reaction.insertMany(reactions);
}

async function recomputeCounters() {
  const [memberCounts, postCounts, commentCounts, reactionCounts] = await Promise.all([
    Membership.aggregate([{ $match: { status: 'active' } }, { $group: { _id: '$community', count: { $sum: 1 } } }]),
    Post.aggregate([
      { $match: { status: 'published' } },
      { $group: { _id: '$community', count: { $sum: 1 }, last: { $max: '$createdAt' } } },
    ]),
    Comment.aggregate([{ $match: { status: 'published' } }, { $group: { _id: '$post', count: { $sum: 1 } } }]),
    Reaction.aggregate([{ $group: { _id: '$post', count: { $sum: 1 } } }]),
  ]);

  await Promise.all([
    ...memberCounts.map(({ _id, count }) => Community.updateOne({ _id }, { $set: { memberCount: count } })),
    ...postCounts.map(({ _id, count, last }) =>
      Community.updateOne({ _id }, { $set: { postCount: count, lastActivityAt: last } }),
    ),
    ...commentCounts.map(({ _id, count }) => Post.updateOne({ _id }, { $set: { commentCount: count } })),
    ...reactionCounts.map(({ _id, count }) => Post.updateOne({ _id }, { $set: { reactionCount: count } })),
  ]);
}

async function seedProjects(users) {
  const projects = [];
  for (const { author, daysAgo, ...project } of PROJECTS) {
    const created = await Project.create({
      ...project,
      author: users[author]._id,
      createdAt: hoursAgo(daysAgo * 24),
    });
    projects.push(created);
  }

  const interests = [
    { project: projects[0], user: 'sofia', message: 'I would love to help with the docs — I specialise in API documentation.' },
    { project: projects[0], user: 'ethan', message: 'I have built a lot of Stripe integrations for clients and can contribute TypeScript.' },
    { project: projects[1], user: 'hannah', message: 'Happy to help design the labelling guidelines.' },
    { project: projects[3], user: 'tomas', message: 'Designer here — accessible civic forms are close to my heart.' },
  ];
  for (const { project, user, message } of interests) {
    await ProjectInterest.create({ project: project._id, user: users[user]._id, message });
    await Project.updateOne({ _id: project._id }, { $inc: { interestCount: 1 } });
  }
}

async function seedConversations(users) {
  for (const { members, messages } of CONVERSATIONS) {
    const [a, b] = members.map((key) => users[key]);
    const last = messages.at(-1);
    const lastAt = hoursAgo(last.hoursAgo);
    // The recipient has not read the trailing run of messages from the last sender.
    const unreadForLastRecipient = messages.length - 1 - messages.findLastIndex((message) => message.from !== last.from);

    const conversation = await Conversation.create({
      participantKey: buildParticipantKey(a._id, b._id),
      members: members.map((key) => ({
        user: users[key]._id,
        unreadCount: key !== last.from ? unreadForLastRecipient : 0,
        lastReadAt: key === last.from ? lastAt : hoursAgo(last.hoursAgo + 1),
      })),
      createdBy: users[messages[0].from]._id,
      lastMessage: { body: truncate(last.body, 140), sender: users[last.from]._id, createdAt: lastAt },
      lastMessageAt: lastAt,
    });

    await Message.insertMany(
      messages.map((message) => ({
        conversation: conversation._id,
        sender: users[message.from]._id,
        body: message.body,
        createdAt: hoursAgo(message.hoursAgo),
      })),
      { timestamps: false },
    );
  }
}

async function seedModeration(users, posts) {
  await Report.create([
    {
      reporter: users.olivia._id,
      targetType: 'User',
      target: users.ethan._id,
      targetOwner: users.ethan._id,
      reason: 'spam',
      details: 'Sent me three unsolicited DMs promoting an MVP agency within an hour.',
    },
    {
      reporter: users.lukas._id,
      targetType: 'Post',
      target: posts['tenant-isolation']._id,
      targetOwner: users.amara._id,
      reason: 'off-topic',
      details: 'Feels more like a Backend Engineers discussion than SaaS-specific.',
    },
  ]);

  await Notification.create([
    {
      recipient: users.sofia._id,
      type: 'account',
      title: 'Welcome to NicheLink 👋',
      body: 'Join a few communities and complete your profile to get better recommendations.',
      link: '/communities',
    },
    {
      recipient: users.sofia._id,
      actor: users.daniel._id,
      type: 'message',
      entityType: 'Conversation',
      title: 'sent you a message',
      body: 'Perfect. Also check out my Stripe webhook toolkit project on Project Match…',
      link: '/messages',
    },
  ]);
}

async function main() {
  assertSafeToSeed();
  const password = env.SEED_DEMO_PASSWORD ?? DEFAULT_DEMO_PASSWORD;

  await connectDatabase(env.MONGODB_URI);
  console.log(`Seeding ${mongoose.connection.name}…`);

  await resetDatabase();
  const users = await seedUsers(password);
  const communities = await seedCommunities(users);
  const posts = await seedPosts(users, communities);
  await seedEngagement(users, posts);
  await recomputeCounters();
  await seedProjects(users);
  await seedConversations(users);
  await seedModeration(users, posts);

  console.log('\nSeed complete.');
  console.table([
    { account: 'Admin', email: DEMO_ACCOUNTS.admin },
    { account: 'Pro member', email: DEMO_ACCOUNTS.pro },
    { account: 'Free member', email: DEMO_ACCOUNTS.free },
  ]);
  console.log(
    env.SEED_DEMO_PASSWORD
      ? 'Password: the value of SEED_DEMO_PASSWORD'
      : `Password (development only): ${DEFAULT_DEMO_PASSWORD}`,
  );
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => disconnectDatabase());
