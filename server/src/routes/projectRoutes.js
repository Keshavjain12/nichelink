import { Router } from 'express';
import * as projectController from '../controllers/projectController.js';
import { PERMISSIONS } from '../constants/permissions.js';
import { authenticate, requirePermission } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { idParams, paginationQuery } from '../validators/common.js';
import {
  createProjectBody,
  interestBody,
  interestParams,
  interestStatusBody,
  listProjectsQuery,
  updateProjectBody,
} from '../validators/projectValidators.js';

export function createProjectRouter({ limiters }) {
  const router = Router();
  router.use(authenticate, requirePermission(PERMISSIONS.CONTENT_READ));

  router.get('/', validate({ query: listProjectsQuery }), projectController.list);
  router.post(
    '/',
    requirePermission(PERMISSIONS.PROJECT_CREATE),
    limiters.write,
    validate({ body: createProjectBody }),
    projectController.create,
  );

  router.get('/:id', validate({ params: idParams }), projectController.detail);
  router.patch('/:id', limiters.write, validate({ params: idParams, body: updateProjectBody }), projectController.update);
  router.delete('/:id', validate({ params: idParams }), projectController.remove);

  router.post(
    '/:id/interests',
    requirePermission(PERMISSIONS.PROJECT_INTEREST),
    limiters.write,
    validate({ params: idParams, body: interestBody }),
    projectController.expressInterest,
  );
  router.delete('/:id/interests/me', validate({ params: idParams }), projectController.withdrawInterest);
  router.get('/:id/interests', validate({ params: idParams, query: paginationQuery }), projectController.listInterests);
  router.patch(
    '/:id/interests/:interestId',
    validate({ params: interestParams, body: interestStatusBody }),
    projectController.updateInterest,
  );

  return router;
}
