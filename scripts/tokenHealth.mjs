#!/usr/bin/env node
/*
 * tokenHealth.mjs - Inspect stored tokens and report health.
 *
 * Checks:
 *  - Presence of data/tokens.json
 *  - accessToken exists
 *  - JWT format (3 dot-separated parts)
 *  - Decodes payload (base64url) and extracts scopes from 'scp' or 'roles'
 *  - Reports missing required scopes: User.Read, Calendars.Read, Files.Read
 *
 * Exit codes:
 *   0 - Healthy (valid JWT format + required scopes present)
 *   2 - Invalid token format or unreadable file
 *   3 - Valid format but missing required scopes
 *
 * Options:
 *   --json : Output machine-readable JSON only
 *
 */
import fs from 'fs';
import path from 'path';

const requiredScopes = ['User.Read', 'Calendars.Read', 'Files.Read'];

function base64UrlDecode(segment){
  try {
    const padded = segment.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(segment.length/4)*4,'=');
    const decoded = Buffer.from(padded,'base64').toString('utf8');
    return decoded;
  } catch (e){
    return null;
  }
}

function analyze(){
  const report = {
    file: 'data/tokens.json',
    exists: false,
    accessTokenPresent: false,
    jwtFormatValid: false,
    scopes: [],
    missingScopes: [],
    error: null
  };
  const filePath = path.resolve('data','tokens.json');
  if(!fs.existsSync(filePath)){
    report.error = 'tokens.json not found';
    return {report, exitCode: 2};
  }
  report.exists = true;
  let raw;
  try {
    raw = fs.readFileSync(filePath,'utf8');
  } catch (e){
    report.error = 'cannot read tokens.json';
    return {report, exitCode: 2};
  }
  let json;
  try {
    json = JSON.parse(raw);
  } catch (e){
    report.error = 'tokens.json is not valid JSON';
    return {report, exitCode: 2};
  }
  const accessToken = json.accessToken;
  if(!accessToken){
    report.error = 'accessToken missing in tokens.json';
    return {report, exitCode: 2};
  }
  report.accessTokenPresent = true;
  const parts = accessToken.split('.');
  if(parts.length !== 3){
    // Distinguish opaque vs malformed: Azure AD sometimes can issue v1 tokens or security artifacts not JWT
    report.error = 'accessToken not a well-formed JWT (opaque token?)';
    report.opaque = true;
    return {report, exitCode: 2};
  }
  report.jwtFormatValid = true;
  const payloadDecoded = base64UrlDecode(parts[1]);
  if(!payloadDecoded){
    report.error = 'failed to decode JWT payload';
    return {report, exitCode: 2};
  }
  let payload;
  try { payload = JSON.parse(payloadDecoded); } catch (e){
    report.error = 'JWT payload not JSON';
    return {report, exitCode: 2};
  }
  const scopesStr = payload.scp || payload.roles || '';
  const scopes = Array.isArray(scopesStr) ? scopesStr : (typeof scopesStr === 'string' ? scopesStr.split(/\s+/).filter(Boolean) : []);
  report.scopes = scopes;
  report.missingScopes = requiredScopes.filter(s => !scopes.includes(s));
  if(report.missingScopes.length){
    return {report, exitCode: 3};
  }
  return {report, exitCode: 0};
}

function formatHuman(report){
  const lines = [];
  lines.push('Token Health Report');
  lines.push('-------------------');
  lines.push(`File: ${report.file} (${report.exists ? 'found' : 'missing'})`);
  lines.push(`Access Token Present: ${report.accessTokenPresent}`);
  lines.push(`JWT Format Valid: ${report.jwtFormatValid}`);
  if(report.error){
    lines.push(`Error: ${report.error}`);
  }
  lines.push(`Scopes: ${report.scopes.join(', ') || '(none)'}`);
  if(report.missingScopes.length){
    lines.push('Missing Required Scopes: ' + report.missingScopes.join(', '));
  } else if(report.jwtFormatValid && report.accessTokenPresent){
    lines.push('All required scopes present.');
  }
  return lines.join('\n');
}

(function main(){
  const {report, exitCode} = analyze();
  const jsonMode = process.argv.includes('--json');
  if(jsonMode){
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  } else {
    process.stdout.write(formatHuman(report) + '\n');
  }
  process.exit(exitCode);
})();
