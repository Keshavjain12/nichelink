import * as searchService from '../services/searchService.js';
import { sendSuccess } from '../utils/response.js';

export async function search(req, res) {
  sendSuccess(res, { data: await searchService.search(req.query, req.user) });
}

export async function suggestions(req, res) {
  sendSuccess(res, { data: await searchService.suggest(req.query.q, req.user) });
}
