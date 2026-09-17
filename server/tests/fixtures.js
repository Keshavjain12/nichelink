import { Comment, Post, Project } from '../src/models/index.js';

export async function createPost({ author, community, ...overrides }) {
  const post = await Post.create({
    author: author._id,
    community: community._id,
    communityAccess: community.accessType,
    title: 'How we cut our CI pipeline from 20 to 6 minutes',
    content: '<p>Caching dependencies and splitting test shards made the biggest difference.</p>',
    contentText: 'Caching dependencies and splitting test shards made the biggest difference.',
    excerpt: 'Caching dependencies and splitting test shards made the biggest difference.',
    ...overrides,
  });
  return post;
}

export function createComment({ post, author, ...overrides }) {
  return Comment.create({
    post: post._id,
    author: author._id,
    content: 'Great write-up, thanks!',
    ...overrides,
  });
}

export function createProject({ author, ...overrides }) {
  return Project.create({
    author: author._id,
    title: 'Open-source changelog generator',
    summary: 'Looking for a TypeScript contributor',
    description:
      'We are building a CLI that turns conventional commits into polished release notes for teams.',
    requiredSkills: ['TypeScript', 'Node.js'],
    projectType: 'open-source',
    commitment: 'few-hours-week',
    compensation: 'volunteer',
    ...overrides,
  });
}
