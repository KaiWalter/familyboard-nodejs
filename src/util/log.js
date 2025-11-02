export function log(level, msg, meta = {}) {
  const ts = new Date().toISOString();
  const base = `[${ts}] [${level}] ${msg}`;
  if (Object.keys(meta).length) {
    console.log(base, JSON.stringify(meta));
  } else {
    console.log(base);
  }
}

export const info = (msg, meta) => log('INFO', msg, meta);
export const warn = (msg, meta) => log('WARN', msg, meta);
export const error = (msg, meta) => log('ERROR', msg, meta);

import fs from 'fs';
let auditStream = null;

function getAuditStream() {
  if (process.env.NODE_ENV === 'test' && !process.env.AUDIT_FILE) return null;
  if (auditStream) return auditStream;
  try {
    const filePath = process.env.AUDIT_FILE || 'data/audit.log';
    auditStream = fs.createWriteStream(filePath, { flags: 'a' });
    auditStream.on('error', () => {});
  } catch (e) {
    auditStream = null;
  }
  return auditStream;
}

export function audit(event, details = {}) {
  log('AUDIT', event, details);
  try {
    const stream = getAuditStream();
    if (stream) {
      const entry = { ts: new Date().toISOString(), event, ...details };
      stream.write(JSON.stringify(entry) + '\n');
    }
  } catch (e) {
    // swallow file write errors
  }
}

export function __closeAuditStreamForTests() {
  if (auditStream) {
    try {
      auditStream.end();
    } catch {}
    auditStream = null;
  }
}