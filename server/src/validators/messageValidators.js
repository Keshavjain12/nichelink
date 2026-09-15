import { z } from 'zod';
import { CONTENT_LIMITS } from '../constants/content.js';
import { objectId, paginationQuery } from './common.js';

const body = z
  .string()
  .trim()
  .min(1, 'Message cannot be empty')
  .max(CONTENT_LIMITS.MESSAGE_MAX, `Messages are limited to ${CONTENT_LIMITS.MESSAGE_MAX} characters`);

const clientId = z
  .string()
  .regex(/^[\w-]{8,64}$/, 'Invalid client id')
  .optional();

export const startConversationBody = z.object({ recipientId: objectId });

export const sendMessageBody = z.object({ body, clientId });

export const directMessageBody = z.object({ recipientId: objectId, body, clientId });

export const listConversationsQuery = paginationQuery;

export const listMessagesQuery = z.object({
  before: objectId.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

/** Socket payloads are validated with the same rules as REST bodies. */
export const socketSendMessage = sendMessageBody.extend({ conversationId: objectId });
export const socketConversationRef = z.object({ conversationId: objectId });
export const socketPresenceQuery = z.object({ userIds: z.array(objectId).max(200) });
