// Basic validation for auth configuration loaded from config store.
// Export a function validateAuthConfig(cfg) that throws on invalid settings.

export function validateAuthConfig(authCfg) {
  if (!authCfg) throw new Error('auth config missing');
  const errors = [];
  if (!authCfg.clientId) errors.push('clientId required');
  if (!authCfg.clientSecret) errors.push('clientSecret required');
  if (!authCfg.redirectUri) errors.push('redirectUri required');
  if (!Array.isArray(authCfg.scopes) || authCfg.scopes.length === 0) {
    errors.push('at least one scope required');
  }
  if (typeof authCfg.rateLimitPerMinute !== 'number' || authCfg.rateLimitPerMinute <= 0) {
    errors.push('rateLimitPerMinute must be > 0');
  }
  if (errors.length) {
    const err = new Error('Invalid auth config: ' + errors.join('; '));
    err.details = errors;
    throw err;
  }
  return true;
}
