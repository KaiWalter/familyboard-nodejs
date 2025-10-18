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

export function audit(event, details = {}) {
  log('AUDIT', event, details);
}