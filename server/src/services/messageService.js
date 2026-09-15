import mongoose from 'mongoose';
import { CONTENT_LIMITS, NOTIFICATION_TYPES } from '../constants/content.js';
import { ERROR_CODES } from '../constants/errorCodes.js';
import { PERMISSIONS } from '../constants/permissions.js';
import { PLAN_LIMITS } from '../constants/plans.js';
import { ACCOUNT_STATUS } from '../constants/roles.js';
import { SOCKET_EVENTS } from '../constants/socketEvents.js';
import { Conversation, Message, User, buildParticipantKey } from '../models/index.js';
import { toConversation, toMessage } from '../serializers/messageSerializer.js';
import { USER_SUMMARY_FIELDS } from '../serializers/userSerializer.js';
import { emitToUser, emitToUsers } from '../sockets/realtime.js';
import { ApiError } from '../utils/ApiError.js';
import { splitPage, toPageWindow } from '../utils/pagination.js';
import { truncate } from '../utils/text.js';
import { can } from './accessService.js';
import { markEntityRead, notify } from './notificationService.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const PREVIEW_LENGTH = 140;
const { ObjectId } = mongoose.Types;

const conversationNotFound = () => ApiError.notFound('Conversation not found');

/** Loads a conversation only if the viewer participates — non-members get a 404, not a 403. */
async function loadConversationForMember(conversationId, viewerId) {
  const conversation = await Conversation.findOne({ _id: conversationId, 'members.user': viewerId }).lean();
  if (!conversation) throw conversationNotFound();
  return conversation;
}

export async function assertConversationMember(conversationId, viewerId) {
  await loadConversationForMember(conversationId, viewerId);
}

export async function getMessagingQuota(viewer) {
  if (can(viewer, PERMISSIONS.MESSAGE_UNLIMITED)) return { unlimited: true, limit: null, used: null, remaining: null };
  const used = await Message.countDocuments({ sender: viewer.id, createdAt: { $gte: new Date(Date.now() - DAY_MS) } });
  const limit = PLAN_LIMITS.FREE_MESSAGES_PER_DAY;
  return { unlimited: false, limit, used, remaining: Math.max(0, limit - used) };
}

async function assertWithinQuota(viewer) {
  const quota = await getMessagingQuota(viewer);
  if (!quota.unlimited && quota.remaining === 0) {
    throw ApiError.forbidden(
      `Free members can send ${quota.limit} messages per day. Upgrade to Pro for unlimited messaging.`,
      { code: ERROR_CODES.DM_LIMIT_REACHED, details: quota },
    );
  }
}

async function populateConversation(conversationId) {
  return Conversation.findById(conversationId).populate('members.user', USER_SUMMARY_FIELDS).lean();
}

export async function startConversation(viewer, recipientId) {
  if (recipientId === viewer.id) throw ApiError.badRequest('You cannot message yourself');

  const recipient = await User.findById(recipientId).select('status').lean();
  if (!recipient || recipient.status === ACCOUNT_STATUS.SUSPENDED) throw ApiError.notFound('Member not found');

  const participantKey = buildParticipantKey(viewer.id, recipientId);
  let conversation;
  try {
    conversation = await Conversation.findOneAndUpdate(
      { participantKey },
      {
        $setOnInsert: {
          participantKey,
          members: [{ user: viewer.id }, { user: recipientId }],
          createdBy: viewer.id,
          lastMessageAt: new Date(),
        },
      },
      { upsert: true, returnDocument: 'after' },
    ).lean();
  } catch (error) {
    // Two simultaneous "start conversation" requests race on the unique participantKey.
    if (error?.code !== 11000) throw error;
    conversation = await Conversation.findOne({ participantKey }).lean();
  }

  return toConversation(await populateConversation(conversation._id), viewer.id);
}

export async function listConversations(viewer, { page, limit }) {
  const window = toPageWindow({ page, limit });
  const rows = await Conversation.find({
    'members.user': viewer.id,
    // Hide empty conversations someone else opened with the viewer.
    $or: [{ 'lastMessage.body': { $exists: true } }, { createdBy: viewer.id }],
  })
    .sort({ lastMessageAt: -1 })
    .skip(window.skip)
    .limit(window.fetchLimit)
    .populate('members.user', USER_SUMMARY_FIELDS)
    .lean();

  const { items, meta } = splitPage(rows, window);
  return { items: items.map((conversation) => toConversation(conversation, viewer.id)), meta };
}

export async function getConversation(viewer, conversationId) {
  await loadConversationForMember(conversationId, viewer.id);
  return toConversation(await populateConversation(conversationId), viewer.id);
}

export async function listMessages(viewer, conversationId, { before, limit }) {
  await loadConversationForMember(conversationId, viewer.id);

  const filter = { conversation: conversationId, ...(before && { _id: { $lt: before } }) };
  const rows = await Message.find(filter)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .lean();

  const hasMore = rows.length > limit;
  const page = (hasMore ? rows.slice(0, limit) : rows).reverse();
  return {
    items: page.map(toMessage),
    meta: { limit, hasMore, nextCursor: hasMore ? String(page[0]._id) : null },
  };
}

export async function getUnreadMessageTotal(viewerId) {
  const userId = new ObjectId(viewerId);
  const [result] = await Conversation.aggregate([
    { $match: { 'members.user': userId } },
    { $unwind: '$members' },
    { $match: { 'members.user': userId } },
    { $group: { _id: null, total: { $sum: '$members.unreadCount' } } },
  ]);
  return result?.total ?? 0;
}

/**
 * Persists a message first, then fans it out. Delivery targets user rooms (every open tab of both
 * participants), so an offline recipient simply finds the message in their history later.
 */
export async function sendMessage(viewer, { conversationId, body, clientId }) {
  const conversation = await loadConversationForMember(conversationId, viewer.id);
  const recipientId = String(conversation.members.find((member) => String(member.user) !== viewer.id).user);

  if (clientId) {
    const duplicate = await Message.findOne({ sender: viewer.id, clientId }).lean();
    if (duplicate) return { message: toMessage(duplicate), duplicate: true };
  }

  const recipient = await User.findById(recipientId).select('status').lean();
  if (!recipient || recipient.status === ACCOUNT_STATUS.SUSPENDED) {
    throw ApiError.forbidden('This member can no longer receive messages');
  }

  await assertWithinQuota(viewer);

  let message;
  try {
    message = await Message.create({ conversation: conversation._id, sender: viewer.id, body, clientId });
  } catch (error) {
    if (error?.code === 11000 && clientId) {
      return { message: toMessage(await Message.findOne({ sender: viewer.id, clientId }).lean()), duplicate: true };
    }
    throw error;
  }

  const preview = truncate(body, PREVIEW_LENGTH);
  const updated = await Conversation.findOneAndUpdate(
    { _id: conversation._id },
    {
      $set: {
        lastMessage: { body: preview, sender: viewer.id, createdAt: message.createdAt },
        lastMessageAt: message.createdAt,
        'members.$[sender].unreadCount': 0,
        'members.$[sender].lastReadAt': message.createdAt,
      },
      $inc: { 'members.$[recipient].unreadCount': 1 },
    },
    {
      returnDocument: 'after',
      arrayFilters: [{ 'sender.user': new ObjectId(viewer.id) }, { 'recipient.user': new ObjectId(recipientId) }],
    },
  ).lean();

  const payload = toMessage(message.toObject());
  const unreadFor = (userId) => updated.members.find((member) => String(member.user) === userId)?.unreadCount ?? 0;
  for (const userId of [viewer.id, recipientId]) {
    emitToUser(userId, SOCKET_EVENTS.RECEIVE_MESSAGE, {
      message: payload,
      conversation: {
        id: String(updated._id),
        lastMessage: { body: preview, senderId: viewer.id, createdAt: message.createdAt },
        lastMessageAt: message.createdAt,
        unreadCount: unreadFor(userId),
      },
    });
  }

  await notify({
    recipient: recipientId,
    actor: viewer.id,
    coalesce: true,
    type: NOTIFICATION_TYPES.MESSAGE,
    entityType: 'Conversation',
    entityId: conversation._id,
    title: 'sent you a message',
    body: truncate(body, 120),
    link: `/messages/${conversation._id}`,
  });

  return { message: payload, duplicate: false };
}

export async function sendDirectMessage(viewer, { recipientId, body, clientId }) {
  const conversation = await startConversation(viewer, recipientId);
  const result = await sendMessage(viewer, { conversationId: conversation.id, body, clientId });
  return { ...result, conversation: await getConversation(viewer, conversation.id) };
}

export async function markConversationRead(viewer, conversationId) {
  const readAt = new Date();
  const conversation = await Conversation.findOneAndUpdate(
    { _id: conversationId, 'members.user': viewer.id },
    { $set: { 'members.$.unreadCount': 0, 'members.$.lastReadAt': readAt } },
    { returnDocument: 'after' },
  ).lean();
  if (!conversation) throw conversationNotFound();

  await markEntityRead(viewer.id, conversation._id);
  emitToUsers(
    conversation.members.map((member) => member.user),
    SOCKET_EVENTS.CONVERSATION_READ,
    { conversationId: String(conversation._id), userId: viewer.id, lastReadAt: readAt },
  );
  return { conversationId: String(conversation._id), lastReadAt: readAt, unreadCount: 0 };
}

export async function conversationPartnerIds(userId) {
  const conversations = await Conversation.find({ 'members.user': userId }).select('members.user').limit(500).lean();
  return [
    ...new Set(
      conversations.flatMap((conversation) =>
        conversation.members.map((member) => String(member.user)).filter((id) => id !== String(userId)),
      ),
    ),
  ];
}

export const MESSAGE_MAX_LENGTH = CONTENT_LIMITS.MESSAGE_MAX;
