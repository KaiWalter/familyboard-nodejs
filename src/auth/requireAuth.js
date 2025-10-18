// Placeholder auth guard middleware. To be expanded when auth sessions are implemented.
import { readTokens } from './tokenStore.js';

export function requireAuth(req, res, next) {
  const tokens = readTokens();
  if (!tokens || !tokens.accessToken) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  // Future: validate expiration, scopes, maybe decode id/access token if JWT.
  next();
}
