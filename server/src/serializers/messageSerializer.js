import { isOnline } from '../sockets/presence.js';
import { toUserSummary } from './userSerializer.js';

export function toMessage(message) {
  return {
    id: String(message._id),
    conversationId: String(message.conversation),
    senderId: String(message.sender),
    body: message.body,
    clientId: message.clientId ?? null,
    createdAt: message.createdAt,
  };
}

export function toConversation(conversation, viewerId) {
  const self = conversation.members.find(
    (member) => String(member.user?._id ?? member.user) === viewerId,
  );
  const other = conversation.members.find(
    (member) => String(member.user?._id ?? member.user) !== viewerId,
  );
  const participant = toUserSummary(other?.user);

  return {
    id: String(conversation._id),
    participant: participant && { ...participant, isOnline: isOnline(participant.id) },
    unreadCount: self?.unreadCount ?? 0,
    lastReadAt: self?.lastReadAt ?? null,
    participantLastReadAt: other?.lastReadAt ?? null,
    lastMessage: conversation.lastMessage?.body
      ? {
          body: conversation.lastMessage.body,
          senderId: String(conversation.lastMessage.sender),
          createdAt: conversation.lastMessage.createdAt,
        }
      : null,
    lastMessageAt: conversation.lastMessageAt,
    createdAt: conversation.createdAt,
  };
}
