import { env } from '../config/env.js';
import { PLAN_LIMITS } from '../constants/plans.js';
import * as pricingService from '../services/pricingService.js';
import { sendSuccess } from '../utils/response.js';

export async function getConfig(_req, res) {
  sendSuccess(res, {
    data: { features: env.features, plans: await pricingService.getPlanCatalog(), limits: PLAN_LIMITS },
  });
}
