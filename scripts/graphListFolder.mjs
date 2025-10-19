#!/usr/bin/env node
/*
 * graphListFolder.mjs - Direct diagnostic listing of a OneDrive folder using path.
 * Usage:
 *   node scripts/graphListFolder.mjs FamilyCalendarImages
 *   node scripts/graphListFolder.mjs /FamilyCalendarImages
 * Prints raw item names and indicates if downloadUrl & photo metadata present.
 */
import { getGraphClient, classifyAccessToken } from '../src/services/graphClient.js';
import { readTokens } from '../src/auth/tokenStore.js';

async function main(){
  const folderArg = process.argv[2];
  if(!folderArg){
    console.error('Folder path arg required');
    process.exit(1);
  }
  const folderPath = folderArg.replace(/^\//,''); // normalize by removing leading slash for base path
  const pathVariant = `/me/drive/root:/${folderPath}:/children`;
  const tokens = readTokens();
  if(!tokens) { console.error('No tokens.json'); process.exit(2); }
  const { type } = classifyAccessToken(tokens.accessToken);
  console.log('[diag] access token type:', type);
  const client = getGraphClient();
  try {
    const resp = await client.api(pathVariant).select('id,name,@microsoft.graph.downloadUrl,photo,file,folder').top(50).get();
    console.log('[diag] raw keys:', Object.keys(resp));
    const value = resp.value || [];
    console.log('[diag] item count:', value.length);
    value.forEach(i => {
      console.log(`- ${i.name} type:${i.folder?'folder':'file'} hasPhoto:${!!i.photo} hasDl:${!!i['@microsoft.graph.downloadUrl']}`);
    });
    if(resp['@odata.nextLink']){
      console.log('[diag] nextLink present:', resp['@odata.nextLink']);
    }
  } catch (e){
    console.error('[diag] error', e.message, e.code, e.statusCode);
    process.exit(3);
  }
}

main();
