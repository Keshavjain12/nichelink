# Database design

MongoDB with Mongoose. The deployment target is a standalone server (no transactions), so consistency
comes from unique indexes, atomic `$inc` counters and idempotent writes.

## ER diagram

```mermaid
erDiagram
    USER ||--o{ MEMBERSHIP : joins
    COMMUNITY ||--o{ MEMBERSHIP : has
    COMMUNITY ||--o{ POST : contains
    USER ||--o{ POST : authors
    POST ||--o{ COMMENT : has
    USER ||--o{ COMMENT : writes
    COMMENT ||--o{ COMMENT : "replies to"
    POST ||--o{ REACTION : receives
    USER ||--o{ REACTION : gives
    USER ||--o{ CONVERSATION : "participates in"
    CONVERSATION ||--o{ MESSAGE : contains
    USER ||--o{ MESSAGE : sends
    USER ||--o{ PROJECT : posts
    PROJECT ||--o{ PROJECT_INTEREST : receives
    USER ||--o{ PROJECT_INTEREST : expresses
    USER ||--o{ SUBSCRIPTION : owns
    USER ||--o{ NOTIFICATION : receives
    USER ||--o{ REPORT : files
    USER ||--o{ REFRESH_TOKEN : holds
    USER ||--o{ AUDIT_LOG : performs

    USER {
        ObjectId _id
        string name
        string username UK
        string email UK
        string password "select:false, bcrypt"
        object avatar
        string headline
        string bio
        string location
        string website
        string[] skills
        string[] interests
        string role "FreeMember|ProMember|Admin"
        string status "active|suspended"
        string stripeCustomerId "select:false, unique sparse"
        object subscription "plan,status,currentPeriodEnd,cancelAtPeriodEnd"
        date passwordChangedAt
        date lastActiveAt
    }
    COMMUNITY {
        ObjectId _id
        string name
        string slug UK
        string tagline
        string description
        string icon
        string accentColor
        string category
        string[] tags
        string accessType "public|pro"
        number memberCount
        number postCount
        object[] rules
        boolean isFeatured
        string status "active|archived"
        ObjectId createdBy FK
        date lastActivityAt
    }
    MEMBERSHIP {
        ObjectId user FK
        ObjectId community FK
        string role "member|moderator|owner"
        string status "active|banned"
        date joinedAt
    }
    POST {
        ObjectId _id
        ObjectId author FK
        ObjectId community FK
        string communityAccess "denormalized"
        string title
        string content "sanitized HTML"
        string contentText
        string excerpt
        object[] images
        string[] tags
        number reactionCount
        number commentCount
        string status "published|removed|deleted"
        object moderation
    }
    COMMENT {
        ObjectId _id
        ObjectId post FK
        ObjectId author FK
        ObjectId parent FK
        ObjectId root FK
        number depth "0-3"
        string content
        number replyCount
        string status
    }
    CONVERSATION {
        ObjectId _id
        object[] members "user, unreadCount, lastReadAt"
        string participantKey UK
        object lastMessage
        date lastMessageAt
    }
    MESSAGE {
        ObjectId _id
        ObjectId conversation FK
        ObjectId sender FK
        string body
        string clientId "unique per sender"
    }
    SUBSCRIPTION {
        ObjectId user FK
        string provider "stripe|complimentary"
        string stripeCustomerId
        string stripeSubscriptionId UK
        string status
        date currentPeriodEnd
        boolean cancelAtPeriodEnd
    }
    PROJECT {
        ObjectId _id
        ObjectId author FK
        string title
        string description
        string[] requiredSkills
        string[] skillKeys "lowercased"
        string projectType
        string commitment
        string compensation
        boolean remote
        string status "open|closed|deleted"
        number interestCount
    }
    REPORT {
        ObjectId _id
        ObjectId reporter FK
        string targetType "Post|Comment|User"
        ObjectId target FK
        ObjectId targetOwner FK
        string reason
        string status "open|resolved|dismissed"
        object resolution
    }
```

Supporting collections: `RefreshToken` (hashed, TTL), `Notification` (TTL 180 days),
`StripeEvent` (idempotency, TTL 30 days), `AuditLog`.

## Modelling decisions

**Membership is its own collection.** Member lists are unbounded, so embedding them in users or
communities would grow documents without limit. A unique `{ user, community }` index makes double joins
impossible even under concurrent requests, and `Community.memberCount` is maintained with atomic `$inc`.

**`Post.communityAccess` is denormalized.** The feed must exclude Pro-only content for Free members. Storing
the access type on the post turns that into an indexed filter instead of a join; changing a community's
access type runs one `updateMany`.

**Comments use an adjacency list plus a `root` pointer.** A post page loads one page of root comments,
then *all* their descendants in a single `root ∈ [...]` query, building the tree in memory — two queries,
no recursion, no `$graphLookup`. Depth is capped at 4.

**Reactions are documents, not an array on the post.** A unique `{ user, post }` index makes liking
idempotent under concurrency, and the same index answers "which of these posts did I like?" for a whole
feed page in one query.

**Conversations carry per-member state.** `members: [{ user, unreadCount, lastReadAt }]` keeps unread
counts O(1) via positional `arrayFilters` updates, and `participantKey` (the sorted id pair, unique)
guarantees exactly one conversation per pair.

**Soft deletion** on posts, comments and projects keeps threads, counters and moderation history coherent.

## Indexes

Indexes follow real query patterns rather than being added everywhere.

| Collection | Index | Serves |
| --- | --- | --- |
| User | `username` (u), `email` (u) | login, profiles, admin prefix search |
| | `stripeCustomerId` (u, sparse) | webhook → user resolution |
| | `role + status`, `createdAt` | admin filters and metrics |
| | text: name, username, headline, skills | member search |
| Community | `slug` (u) | routing |
| | `status + category + memberCount`, `status + isFeatured + memberCount` | directory |
| | text: name, tagline, description, tags | search |
| Membership | `user + community` (u) | duplicate prevention, membership checks |
| | `community + status + role + joinedAt` | member lists, moderators |
| | `user + status + joinedAt` | "my communities", joined feed |
| Post | `community + status + createdAt` | community board |
| | `status + communityAccess + createdAt` | global feed with Pro filtering |
| | `author + status + createdAt` | profile posts |
| | `tags`, text: title, contentText, tags | tag and text search |
| Comment | `post + parent + createdAt` | root comment pages |
| | `root + createdAt` | descendant fetch |
| Reaction | `user + post` (u) | toggle + viewer state |
| Conversation | `members.user + lastMessageAt` | inbox |
| | `participantKey` (u) | one conversation per pair |
| Message | `conversation + createdAt` | history pagination |
| | `sender + createdAt` | Free-tier quota |
| | `sender + clientId` (u, partial) | idempotent retries |
| Notification | `recipient + readAt + updatedAt` | unread list and badge |
| | `createdAt` TTL 180d | retention |
| Subscription | `stripeSubscriptionId` (u, sparse), `user + updatedAt` | webhook sync, entitlement |
| Project | `status + createdAt`, `status + skillKeys + createdAt` | board and skill filters |
| | text: title, summary, description, requiredSkills | search |
| ProjectInterest | `project + user` (u) | one interest per member |
| Report | `status + createdAt` | moderation queue |
| | `reporter + targetType + target` (u, partial on open) | one open report per reporter |
| RefreshToken | `tokenHash` (u), `family`, `expiresAt` TTL | rotation and reuse detection |
| StripeEvent | `eventId` (u), `createdAt` TTL 30d | webhook idempotency |

`syncIndexes()` runs in the seed script and the test bootstrap so text indexes always exist.
