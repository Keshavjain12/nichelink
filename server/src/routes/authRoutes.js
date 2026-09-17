import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireTrustedOrigin } from '../middleware/csrfProtection.js';
import { validate } from '../middleware/validate.js';
import { changePasswordBody, loginBody, registerBody } from '../validators/authValidators.js';

export function createAuthRouter({ limiters }) {
  const router = Router();

  router.post(
    '/register',
    limiters.register,
    validate({ body: registerBody }),
    authController.register,
  );
  router.post('/login', limiters.login, validate({ body: loginBody }), authController.login);
  router.post('/refresh', limiters.refresh, requireTrustedOrigin, authController.refresh);
  router.post('/logout', requireTrustedOrigin, authController.logout);
  router.get('/me', authenticate, authController.me);
  router.patch(
    '/password',
    authenticate,
    limiters.sensitive,
    validate({ body: changePasswordBody }),
    authController.changePassword,
  );

  return router;
}
