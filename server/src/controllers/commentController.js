import * as commentService from '../services/commentService.js';
import { sendSuccess } from '../utils/response.js';

export async function update(req, res) {
  const comment = await commentService.updateComment(req.params.id, req.user, req.body);
  sendSuccess(res, { data: comment, message: 'Comment updated' });
}

export async function remove(req, res) {
  const result = await commentService.deleteComment(req.params.id, req.user);
  sendSuccess(res, { data: result, message: 'Comment deleted' });
}
