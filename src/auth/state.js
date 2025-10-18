import crypto from 'crypto';

export function generateState(bytes = 16) { // 128-bit default
  return crypto.randomBytes(bytes).toString('base64url');
}
