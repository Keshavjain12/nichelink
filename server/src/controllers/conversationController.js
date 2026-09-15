import * as messageService from '../services/messageService.js';
import { sendCreated, sendSuccess } from '../utils/response.js';

export async function list(req, res) {
  const { items, meta } = await messageService.listConversations(req.user, req.query);
  sendSuccess(res, { data: items, meta });
}

export async function start(req, res) {
  sendSuccess(res, { data: await messageService.startConversation(req.user, req.body.recipientId) });
}

export async function detail(req, res) {
  sendSuccess(res, { data: await messageService.getConversation(req.user, req.params.id) });
}

export async function messages(req, res) {
  const { items, meta } = await messageService.listMessages(req.user, req.params.id, req.query);
  sendSuccess(res, { data: items, meta });
}

export async function send(req, res) {
  const { message, duplicate } = await messageService.sendMessage(req.user, {
    ...req.body,
    conversationId: req.params.id,
  });
  sendSuccess(res, { status: duplicate ? 200 : 201, data: message });
}

export async function sendDirect(req, res) {
  const result = await messageService.sendDirectMessage(req.user, req.body);
  sendCreated(res, { data: { message: result.message, conversation: result.conversation } });
}

export async function markRead(req, res) {
  sendSuccess(res, { data: await messageService.markConversationRead(req.user, req.params.id) });
}

export async function unreadCount(req, res) {
  sendSuccess(res, { data: { unreadCount: await messageService.getUnreadMessageTotal(req.user.id) } });
}

export async function quota(req, res) {
  sendSuccess(res, { data: await messageService.getMessagingQuota(req.user) });
}
