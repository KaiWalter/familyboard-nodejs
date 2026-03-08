import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import { loadConfig, saveConfig } from '../../src/config/store.js';

const CONFIG_PATH = 'data/config.json';

test.skip('loadConfig preserves configured scopes exactly (no implicit offline_access)', async () => {
  // Backup existing
  let backup;
  if (fs.existsSync(CONFIG_PATH)) backup = fs.readFileSync(CONFIG_PATH, 'utf-8');
  try {
  saveConfig({ calendarIds: [], auth: { clientId: 'x', clientSecret: 'y', redirectUri: 'http://localhost/cb', scopes: ['User.Read'] } });
    delete process.env.AUTH_SCOPES; // ensure env override not present
    const cfg = loadConfig();
    assert.deepStrictEqual(cfg.auth.scopes, ['User.Read']);
  } finally {
    if (backup) fs.writeFileSync(CONFIG_PATH, backup); else fs.unlinkSync(CONFIG_PATH);
  }
});

test.skip('loadConfig accepts env AUTH_SCOPES exactly', async () => {
  let backup;
  if (fs.existsSync(CONFIG_PATH)) backup = fs.readFileSync(CONFIG_PATH, 'utf-8');
  try {
  saveConfig({ calendarIds: [], auth: { clientId: 'x', clientSecret: 'y', redirectUri: 'http://localhost/cb', scopes: ['User.Read'] } });
    process.env.AUTH_SCOPES = 'User.Read,Calendars.Read';
    const cfg = loadConfig();
    assert.deepStrictEqual(cfg.auth.scopes, ['User.Read','Calendars.Read']);
  } finally {
    delete process.env.AUTH_SCOPES;
    if (backup) fs.writeFileSync(CONFIG_PATH, backup); else fs.unlinkSync(CONFIG_PATH);
  }
});