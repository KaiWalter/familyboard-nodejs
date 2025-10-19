#!/usr/bin/env node
/*
 * auditTail.mjs - Stream recent audit events.
 *
 * Usage:
 *   node scripts/auditTail.mjs                # tail all events
 *   node scripts/auditTail.mjs photos.*       # filter by glob (event prefix/suffix with *)
 *   node scripts/auditTail.mjs graph.retry.*  # specific patterns
 *   AUDIT_FILE=data/audit.log node scripts/auditTail.mjs
 *
 * Options:
 *   --since=10m   # only show events newer than now-10 minutes (supports s,m,h)
 *   --follow      # continue following (like tail -f)
 *   --json        # raw JSON lines (no formatting)
 */
import fs from 'fs';
import path from 'path';

const filePath = process.env.AUDIT_FILE || 'data/audit.log';
const args = process.argv.slice(2);
let follow = false;
let jsonMode = false;
let since = null;
const patterns = [];

for(const a of args){
  if(a === '--follow') follow = true;
  else if(a === '--json') jsonMode = true;
  else if(a.startsWith('--since=')) {
    const val = a.substring(8);
    const m = /(\d+)([smh])/.exec(val);
    if(m){
      const num = parseInt(m[1],10);
      const unit = m[2];
      const mult = unit === 's' ? 1000 : unit === 'm' ? 60000 : 3600000;
      since = Date.now() - num*mult;
    }
  } else if(!a.startsWith('--')) patterns.push(a);
}

if(!fs.existsSync(filePath)){
  console.error('Audit log file not found:', filePath);
  process.exit(2);
}

function matchEvent(ev){
  if(patterns.length === 0) return true;
  return patterns.some(p => globMatch(ev, p));
}

function globMatch(str, pattern){
  // simple * wildcard
  const esc = pattern.replace(/[-/\\^$+?.()|[\]{}]/g,'\\$&').replace(/\*/g,'.*');
  const re = new RegExp('^'+esc+'$');
  return re.test(str);
}

function format(entry){
  if(jsonMode) return JSON.stringify(entry);
  return `[${entry.ts}] ${entry.event} ${formatDetails(entry)}`;
}

function formatDetails(entry){
  const { ts, event, ...rest } = entry;
  if(Object.keys(rest).length === 0) return '';
  return JSON.stringify(rest);
}

function processLine(line){
  line = line.trim();
  if(!line) return;
  try {
    const entry = JSON.parse(line);
    if(since && Date.parse(entry.ts) < since) return;
    if(!matchEvent(entry.event)) return;
    console.log(format(entry));
  } catch (e){ /* ignore malformed lines */ }
}

function initialRead(){
  const content = fs.readFileSync(filePath,'utf8');
  content.split(/\n/).forEach(processLine);
}

function followFile(){
  let size = fs.statSync(filePath).size;
  fs.watch(filePath, (evt) => {
    if(evt !== 'change') return;
    const newSize = fs.statSync(filePath).size;
    if(newSize < size){
      // rotated
      size = newSize;
      return;
    }
    const fd = fs.openSync(filePath,'r');
    const buf = Buffer.alloc(newSize - size);
    fs.readSync(fd, buf, 0, buf.length, size);
    fs.closeSync(fd);
    size = newSize;
    buf.toString('utf8').split(/\n/).forEach(processLine);
  });
}

initialRead();
if(follow) followFile();
