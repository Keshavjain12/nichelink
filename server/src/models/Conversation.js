import mongoose from 'mongoose';

const memberStateSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    unreadCount: { type: Number, default: 0, min: 0 },
    lastReadAt: { type: Date },
  },
  { _id: false },
);

const conversationSchema = new mongoose.Schema(
  {
    members: {
      type: [memberStateSchema],
      validate: [
        (members) => members.length === 2,
        'A direct conversation has exactly two members',
      ],
    },
    // Sorted "<idA>:<idB>" — guarantees a single conversation per pair of users.
    participantKey: { type: String, required: true, unique: true },
    lastMessage: {
      type: new mongoose.Schema(
        {
          body: String,
          sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          createdAt: Date,
        },
        { _id: false },
      ),
      default: undefined,
    },
    lastMessageAt: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

conversationSchema.index({ 'members.user': 1, lastMessageAt: -1 });

export function buildParticipantKey(userIdA, userIdB) {
  return [String(userIdA), String(userIdB)].sort().join(':');
}

export const Conversation = mongoose.model('Conversation', conversationSchema);
