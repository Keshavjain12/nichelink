import * as commentService from '../services/commentService.js';
import * as postService from '../services/postService.js';
import { sendCreated, sendSuccess } from '../utils/response.js';

export async function list(req, res) {
  const { items, meta } = await postService.listPosts(req.query, req.user);
  sendSuccess(res, { data: items, meta });
}

export async function detail(req, res) {
  sendSuccess(res, { data: await postService.getPost(req.params.id, req.user) });
}

export async function create(req, res) {
  const post = await postService.createPost(req.user, req.body);
  sendCreated(res, { data: post, message: 'Post published' });
}

export async function update(req, res) {
  const post = await postService.updatePost(req.params.id, req.user, req.body);
  sendSuccess(res, { data: post, message: 'Post updated' });
}

export async function remove(req, res) {
  const result = await postService.deletePost(req.params.id, req.user, req.body);
  sendSuccess(res, { data: result, message: 'Post deleted' });
}

export async function like(req, res) {
  sendSuccess(res, { data: await postService.likePost(req.params.id, req.user) });
}

export async function unlike(req, res) {
  sendSuccess(res, { data: await postService.unlikePost(req.params.id, req.user) });
}

export async function listComments(req, res) {
  const { items, meta } = await commentService.listComments(req.params.id, req.user, req.query);
  sendSuccess(res, { data: items, meta });
}

export async function createComment(req, res) {
  const comment = await commentService.createComment(req.params.id, req.user, req.body);
  sendCreated(res, { data: comment, message: 'Comment added' });
}
