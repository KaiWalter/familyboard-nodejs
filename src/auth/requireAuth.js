// Placeholder auth guard middleware. To be expanded when auth sessions are implemented.
import { audit } from '../util/log.js';
import { getTokenMetadata } from './msalToken.js';

// Middleware: ensures an application access token is present; attaches Authorization header.
export async function requireAuth(_req, res, next) {
  try {
    const meta = await getTokenMetadata();
    if (meta.status !== 'OK') {
      audit('auth.middleware.no_user_session');
      return res.status(401).json({ error: 'not_authenticated' });
    }
    next();
  } catch (e) {
    audit('auth.middleware.error', { message: e.message });
    return res.status(500).json({ error: 'auth_check_failed' });
  }
}
