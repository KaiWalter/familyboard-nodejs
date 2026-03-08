import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { test, after } from 'node:test';

const scriptPath = path.resolve('scripts','tokenHealth.mjs');

function run(args=[]) {
  const result = spawnSync('node', [scriptPath, ...args], { encoding: 'utf8' });
  return { stdout: result.stdout, status: result.status };
}

function writeTokens(obj){
  fs.writeFileSync(path.resolve('data','tokens.json'), JSON.stringify(obj, null, 2));
}

const original = fs.existsSync(path.resolve('data','tokens.json')) ? fs.readFileSync(path.resolve('data','tokens.json'),'utf8') : null;

after(() => {
  if(original){
    fs.writeFileSync(path.resolve('data','tokens.json'), original);
  }
});

test.skip('reports malformed JWT', () => {
  writeTokens({ accessToken: 'abc' });
  const { stdout, status } = run();
  assert.notStrictEqual(status, 0, 'should be non-zero for malformed JWT');
  assert.match(stdout, /not a well-formed JWT|Invalid|malformed/i);
});

test.skip('reports missing scopes when JWT format ok but scopes incomplete', () => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ scp: 'User.Read Calendars.Read' })).toString('base64url');
  const fake = `${header}.${payload}.signature`;
  writeTokens({ accessToken: fake });
  const { stdout, status } = run();
  assert.strictEqual(status, 3);
  assert.match(stdout, /Missing Required Scopes/i);
});

test.skip('returns healthy when all scopes present', () => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ scp: 'User.Read Calendars.Read Files.Read' })).toString('base64url');
  const fake = `${header}.${payload}.signature`;
  writeTokens({ accessToken: fake });
  const { stdout, status } = run();
  assert.strictEqual(status, 0);
  assert.match(stdout, /All required scopes present/i);
});

test.skip('--json outputs JSON object', () => {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ scp: 'User.Read Calendars.Read Files.Read' })).toString('base64url');
  const fake = `${header}.${payload}.signature`;
  writeTokens({ accessToken: fake });
  const { stdout, status } = run(['--json']);
  assert.strictEqual(status, 0);
  const parsed = JSON.parse(stdout);
  assert.ok(Array.isArray(parsed.scopes));
  assert.deepStrictEqual(parsed.missingScopes, []);
});
