import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { DatabaseSync } from 'node:sqlite';
test('public profiles isolate settings and restore through installation URL', async () => {
 const dir=mkdtempSync(join(tmpdir(),'subai-profiles-'));
 const base='http://127.0.0.1:17049';
 const child=spawn(process.execPath,['public.ts'],{env:{...process.env,DATA_DIR:dir,PORT:'17049',PUBLIC_URL:base,APP_KEY:'ab'.repeat(32),ADMIN_PASSWORD:'test-only'},stdio:'ignore'});
 const request=(path: string, cookie='', body?: unknown) => fetch(base+path,{method:body===undefined?'GET':'POST',headers:{origin:base,cookie,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
 try {
  for(let i=0;i<100;i++){try{await fetch(base);break;}catch{await new Promise(r=>setTimeout(r,50));}}
  const publicManifest = await request('/manifest.json');
  assert.equal(publicManifest.status, 200);
  assert.equal(publicManifest.headers.get('access-control-allow-origin'), '*');
  const listing = await publicManifest.json();
  assert.deepEqual(listing.behaviorHints, { configurable: true, configurationRequired: true });
  assert.equal(listing.logo, base + '/logo.png');
  const publicLogo = await fetch(listing.logo);
  assert.equal(publicLogo.status, 200);
  assert.match(publicLogo.headers.get('content-type'), /image\/png/);
  const first=await request('/profiles/create','',{}), second=await request('/profiles/create','',{});
  assert.equal(first.status,200);assert.equal(second.status,200);
  const a=first.headers.get('set-cookie').split(';')[0], b=second.headers.get('set-cookie').split(';')[0];
  const registry=new DatabaseSync(join(dir,'profiles.db'));
  const profiles=registry.prepare('SELECT * FROM profiles ORDER BY rowid').all();
  registry.close();
  const url=base+'/a/'+profiles[0].token+'/manifest.json';
  assert.equal((await fetch(url)).status,200);
  assert.equal((await (await fetch(url)).json()).behaviorHints.configurable,true);
  const manifest=await (await fetch(url)).json();
  assert.equal(manifest.id, listing.id);
  assert.equal(manifest.behaviorHints.configurationRequired, false);
  assert.deepEqual(await (await request('/manifest.json', a)).json(), listing);
  const logo=await fetch(manifest.logo);
  assert.equal(logo.status,200);assert.match(logo.headers.get('content-type'),/image\/png/);
  assert.deepEqual([...new Uint8Array(await logo.arrayBuffer()).slice(0,8)],[137,80,78,71,13,10,26,10]);

  const configurePath='/a/'+profiles[0].token+'/configure';
  const configure=await fetch(base+configurePath,{redirect:'manual',headers:{cookie:b}});
  assert.equal(configure.status,302);
  assert.match(configure.headers.get('set-cookie'),/SameSite=Lax/);
  assert.match(configure.headers.get('set-cookie'),/HttpOnly/);
  assert.equal(configure.headers.get('location'),'/configure');
  assert.equal(configure.headers.get('set-cookie').split(';')[0],a);
  assert.equal((await fetch(base+'/a/'+'0'.repeat(48)+'/configure',{redirect:'manual'})).status,404);

  assert.equal((await request('/configure',a)).status,200);
  const db=new DatabaseSync(join(dir,'profiles',String(profiles[0].id),'subai.db'));
  db.prepare('INSERT OR REPLACE INTO settings VALUES(?,?)').run('model','private-model-a');db.close();
  assert.match(await (await request('/configure',a)).text(),/private-model-a/);
  assert.doesNotMatch(await (await request('/configure',b)).text(),/private-model-a/);
  const restored=await request('/profiles/restore','',{url});assert.equal(restored.status,200);assert.equal(restored.headers.get('set-cookie').split(';')[0],a);
  assert.equal((await request('/admin/rotate',a,{})).status,200);
  assert.equal((await fetch(url)).status,404);
  assert.equal((await fetch(base+configurePath,{redirect:'manual'})).status,404);
  assert.equal((await request('/profiles/restore','',{url})).status,400);
  assert.equal((await request('/admin/jobs')).status,404);
  assert.equal((await request('/profiles/restore','',{url:'https://example.com/a/'+profiles[1].token+'/manifest.json'})).status,400);
 }finally{child.kill();await once(child,'exit');rmSync(dir,{recursive:true,force:true});}
});
