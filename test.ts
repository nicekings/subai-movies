import { preferences } from "./preferences.ts";
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { parse, merge, render } from "./subs.ts";
test("cue identity and timestamps", () => {
  const c = parse(
    "WEBVTT\n\n00:01.250 --> 00:03.125\nHi\n\n00:04.000 --> 00:05.000\nBye",
  );
  assert.throws(() => merge(c, []));
  assert.throws(() =>
    merge(c, [
      { id: 1, text: "A" },
      { id: 1, text: "B" },
    ]),
  );
  assert.equal(
    parse(
      render(
        merge(c, [
          { id: 2, text: "B" },
          { id: 1, text: "A" },
        ]),
      ),
    )[0].start,
    "00:00:01,250",
  );
});
test("player and admin lifecycle", async () => {
  const dir = await mkdtemp(join(tmpdir(), "subai-")),
    portFinder = createServer();
  portFinder.listen(0, "127.0.0.1");
  await once(portFinder, "listening");
  const port = (portFinder.address() as any).port;
  await new Promise<void>((r) => portFinder.close(() => r()));
  const base = "http://127.0.0.1:" + port,
    auth = {
      Authorization: "Basic " + Buffer.from("admin:test").toString("base64"),
      Origin: base,
    };
  const child = spawn(process.execPath, ["server.ts"], {
    env: {
      ...process.env,
      DATA_DIR: dir,
      DEMO_MODE: "1",
      PORT: String(port),
      PUBLIC_URL: base,
      ADMIN_PASSWORD: "test",
      APP_KEY: "ab".repeat(32),
    },
    stdio: ["ignore", "ignore", "pipe"],
  });
  let err = "";
  child.stderr.on("data", (b) => (err += b));
  const exited = once(child, "exit");
  try {
    let html = "";
    for (let i = 0; i < 100 && !html; i++) {
      if (child.exitCode !== null) throw Error(err);
      try {
        html = await (
          await fetch(base + "/configure", { headers: auth })
        ).text();
      } catch {
        await new Promise((r) => setTimeout(r, 50));
      }
    }
    const root = html.match(/http:\/\/127\.0\.0\.1:\d+\/a\/[a-f0-9]+/)![0];
    assert.equal((await fetch(base + "/configure")).status, 401);
    assert.deepEqual(
      (await (await fetch(root + "/manifest.json")).json()).resources,
      ["subtitles"],
    );
    const list = async (path: string) =>
      (await (await fetch(root + "/subtitles/" + path + ".json")).json())
        .subtitles;
    const jobs = async () =>
      await (await fetch(base + "/admin/jobs", { headers: auth })).json();
    const option = (await list("movie/tt0133093")).find((t) =>
      t.label.startsWith("[Tạo bản dịch AI]"),
    );
    assert.equal((await jobs()).length, 0);
    const wait = await Promise.all([fetch(option.url), fetch(option.url)]);
    assert.match(await wait[0].text(), /Đang dịch/);
    const detailUrl = base + "/admin/jobs/" + (await jobs())[0].id;
    const running = await (await fetch(detailUrl, { headers: auth })).json();
    assert.ok(["running", "queued", "preparing"].includes(running.state));
    assert.equal(running.groups, 1);
    assert.equal(running.seconds, null);
    assert.equal((await fetch(detailUrl)).status, 401);
    await new Promise((r) => setTimeout(r, 1600));
    assert.equal((await jobs()).length, 1);
    const finished = await (await fetch(detailUrl, { headers: auth })).json();
    assert.equal(finished.state, "ready");
    assert.equal(finished.completedCues, finished.cues);
    assert.equal(finished.step, finished.groups);
    assert.match(await (await fetch(option.url)).text(), /Xin chào/);
    assert.match(
      (await list("movie/tt0133093")).find((t) =>
        t.label.startsWith("[Đã dịch AI]"),
      ).url,
      /ready/,
    );
    for (const [episode, release] of [
      [1, "WEB-DL"],
      [1, "BluRay"],
      [2, "Other"],
    ]) {
      const f = new FormData();
      f.set("media", "tt123:1:" + episode);
      f.set("release", String(release));
      f.set("lang", "vi");
      f.set(
        "file",
        new Blob(["1\n00:00:01,000 --> 00:00:02,000\nXin chào"]),
        "vi.srt",
      );
      assert.equal(
        (
          await fetch(base + "/admin/upload", {
            method: "POST",
            headers: auth,
            body: f,
          })
        ).status,
        200,
      );
    }
    assert.equal((await list("series/tt123:1:2")).length, 1);
    const releases = await list("series/tt123:1:1/filename=movie.BluRay.mkv");
    assert.match(releases[0].label, /BluRay/);
    assert.match(await (await fetch(releases[0].url)).text(), /Xin chào/);
    assert.equal((await jobs()).length, 1);
    await fetch(base + "/admin/rotate", { method: "POST", headers: auth });
    assert.equal((await fetch(root + "/manifest.json")).status, 404);
  } finally {
    child.kill();
    await exited;
    await rm(dir, { recursive: true, force: true });
  }
});

test("legacy secondary stays enabled as an additional provider", () => {
  assert.deepEqual(preferences({ main: "ds", secondary: "google" }).others, [
    "google",
  ]);
  assert.deepEqual(
    preferences({ main: "ds", secondary: "google", others: [] }).others,
    [],
  );
  assert.throws(() => preferences({ main: "ds", others: ["ds"] }));
});

test('completed translation survives model and source configuration changes', async () => {
 const { createApp } = await import('./server.ts');
 const { DatabaseSync } = await import('node:sqlite');
 const dir = await mkdtemp(join(tmpdir(), 'subai-completed-'));
 const app = await createApp({ DATA_DIR: dir, APP_KEY: 'ab'.repeat(32), ADMIN_PASSWORD: 'test', PUBLIC_URL: 'http://localhost', DEMO_MODE: '0' });
 const db = new DatabaseSync(join(dir, 'subai.db'));
 try {
  const token = db.prepare('SELECT v FROM settings WHERE k=?').get('token').v;
  const result = '1\n00:00:01,000 --> 00:00:02,000\nXin chào\n';
  db.prepare('INSERT OR REPLACE INTO settings VALUES(?,?)').run('model','new-model');
  db.prepare('INSERT OR REPLACE INTO settings VALUES(?,?)').run('preferences',JSON.stringify({directOnly:false,subdl:false,addons:[],targets:['vi']}));
  db.prepare('INSERT INTO sources VALUES(?,?,?,?,?,?)').run('source','tt123','en','Release','https://unavailable.example/sub.zip','');
  db.prepare('INSERT INTO jobs(id,src,model,recipe,result) VALUES(?,?,?,?,?)').run('finished','source','old-model',JSON.stringify({dst:'vi'}),result);
  db.prepare('INSERT INTO requests(id,src,model,job) VALUES(?,?,?,?)').run('request','source','old-model','finished');
  const list = (await app.inject('/a/'+token+'/subtitles/movie/tt123.json')).json().subtitles;
  assert.equal(list.length,1);
  assert.match(list[0].label,/Đã dịch AI.*old-model/);
  const old = await app.inject('/a/'+token+'/make/source/old-model.srt?to=vi');
  assert.equal(old.statusCode,200);assert.equal(old.body,result);
  assert.equal((await app.inject('/a/'+token+'/make/source/old-model.srt?to=fr')).statusCode,404);
  assert.equal((db.prepare('SELECT count(*) n FROM jobs').get()).n,1);
  const { createHash } = await import('node:crypto');
  const fingerprint = (recipe: string) => createHash('sha256').update(JSON.stringify([recipe])).digest('hex');
  const otherRecipe = JSON.stringify({dst:'vi',main:'custom',customEndpoint:'http://other.test/v1'});
  db.prepare('INSERT INTO jobs(id,src,model,recipe,result) VALUES(?,?,?,?,?)').run('other','source','old-model',otherRecipe,result.replace('Xin chào','Chào bạn'));
  db.prepare('INSERT INTO requests(id,src,model,job) VALUES(?,?,?,?)').run('other-request','source','old-model','other');
  const originalUrl = '/a/'+token+'/make/source/old-model.srt?to=vi&recipe='+fingerprint(JSON.stringify({dst:'vi'}));
  assert.equal((await app.inject(originalUrl)).body,result);
  const otherUrl = '/a/'+token+'/make/source/old-model.srt?to=vi&recipe='+fingerprint(otherRecipe);
  assert.match((await app.inject(otherUrl)).body,/Chào bạn/);
  assert.equal((await app.inject('/a/'+token+'/make/source/new-model.srt?to=vi&recipe=stale')).statusCode,409);
  assert.equal((db.prepare('SELECT count(*) n FROM jobs').get()).n,2);
 } finally { db.close(); await app.close(); await rm(dir,{recursive:true,force:true}); }
});


test('V3 provides AI inputs without a subtitle API key and custom source selection is independent', async () => {
 const {createApp}=await import('./server.ts');const {DatabaseSync}=await import('node:sqlite');
 const {downloadV3}=await import('./directSources.ts');
 const dir=await mkdtemp(join(tmpdir(),'subai-v3-'));const originalFetch=globalThis.fetch;
 let downloads=0;
 globalThis.fetch=async (url:any) => {
  const u=new URL(url);
  if(u.hostname==='opensubtitles-v3.strem.io')return Response.json({subtitles:[{lang:'eng',url:'https://subs5.strem.io/source.srt',movieReleaseName:'WEB-DL'},{lang:'vie',url:'https://subs5.strem.io/vi.srt',movieReleaseName:'BluRay'}]});
  if(u.hostname==='subs5.strem.io'){downloads++;return new Response('1\n00:00:01,000 --> 00:00:02,000\nHello\n')}
  throw Error('Unexpected network request');
 };
 const app=await createApp({DATA_DIR:dir,APP_KEY:'ab'.repeat(32),ADMIN_PASSWORD:'test',PUBLIC_URL:'http://localhost',DEMO_MODE:'0'});
 const db=new DatabaseSync(join(dir,'subai.db'));
 try {
  const token=db.prepare("SELECT v FROM settings WHERE k='token'").get().v;
  const prefs={subdl:false,addons:['os'],sources:['en'],targets:['vi'],orModel:'test-model'};
  const set=(extra={})=>db.prepare('INSERT OR REPLACE INTO settings VALUES(?,?)').run('preferences',JSON.stringify({...prefs,...extra}));
  set();db.prepare('INSERT OR REPLACE INTO settings VALUES(?,?)').run('model','test-model');
  const list=async()=>(await app.inject('/a/'+token+'/subtitles/movie/tt123.json')).json().subtitles;
  const tracks=await list();assert.equal(tracks.length,2);assert.ok(tracks.every(t=>t.lang==='vie'));assert.match(tracks[1].label,/Tạo bản dịch AI/);assert.equal(downloads,0);
  assert.match(tracks[1].label,/Chưa xác định độ khớp/);
  assert.match(tracks[1].id,/Chưa xác định độ khớp/);
  const mismatched=(await app.inject('/a/'+token+'/subtitles/movie/tt123/filename=OTHER.mkv.json')).json().subtitles;
  assert.match(mismatched[1].label,/Chưa xác định độ khớp/);
  const matched=(await app.inject('/a/'+token+'/subtitles/movie/tt123/filename=WEB-DL.mkv.json')).json().subtitles;
  assert.doesNotMatch(matched[1].label,/Chưa xác định độ khớp/);
  assert.equal(matched[1].url,tracks[1].url);
  assert.equal(db.prepare('SELECT count(*) n FROM jobs').get().n,0);
  const src=db.prepare("SELECT id FROM sources WHERE url LIKE 'osv3:%'").get();
  assert.match((await app.inject('/a/'+token+'/source/'+src.id+'.srt')).body,/Hello/);assert.equal(downloads,1);
  set({aiSourceMode:'custom',aiSourceOrder:[]});assert.equal((await list()).length,1);
  set({aiSourceMode:'custom',aiSourceOrder:['os']});assert.equal((await list()).length,2);
  set({directOnly:true});assert.equal((await list()).length,1);
  await assert.rejects(downloadV3('https://127.0.0.1/private'),/không hợp lệ/);
  const {preferences}=await import('./preferences.ts');assert.throws(()=>preferences({aiSourceOrder:['os','os']}));assert.throws(()=>preferences({aiSourceOrder:['invalid']}));assert.deepEqual(preferences({aiSourceOrder:['os','subdl']}).aiSourceOrder,['os','subdl']);
 } finally {await app.close();db.close();globalThis.fetch=originalFetch;await rm(dir,{recursive:true,force:true})}
});

test('uploaded files can be listed downloaded and removed without deleting stored sources', async()=>{
 const {createApp}=await import('./server.ts');const {DatabaseSync}=await import('node:sqlite');
 const dir=await mkdtemp(join(tmpdir(),'subai-uploads-'));const app=await createApp({DATA_DIR:dir,APP_KEY:'ab'.repeat(32),ADMIN_PASSWORD:'test',PUBLIC_URL:'http://localhost',DEMO_MODE:'0'});const db=new DatabaseSync(join(dir,'subai.db'));const headers={authorization:'Basic '+Buffer.from('admin:test').toString('base64'),origin:'http://localhost'};
 try{db.prepare('INSERT INTO sources VALUES(?,?,?,?,?,?)').run('upload','tt123','vi','WEB-DL','','1\n00:00:01,000 --> 00:00:02,000\nXin chào');db.prepare('INSERT INTO sources VALUES(?,?,?,?,?,?)').run('remote','tt123','en','WEB','https://example.com/a','');db.prepare('INSERT OR REPLACE INTO settings VALUES(?,?)').run('preferences',JSON.stringify({directOnly:true,subdl:false,addons:[],targets:['vi']}));const token=db.prepare("SELECT v FROM settings WHERE k='token'").get().v;
 assert.equal((await app.inject('/admin/uploads')).statusCode,401);
 assert.equal((await app.inject({url:'/admin/uploads',headers})).json().length,1);
 assert.match((await app.inject({url:'/admin/uploads/upload/file',headers})).body,/Xin chào/);
 assert.equal((await app.inject({url:'/admin/uploads/remove',method:'POST',headers,payload:{id:'remote'}})).statusCode,404);
 assert.equal((await app.inject({url:'/admin/uploads/remove',method:'POST',headers,payload:{id:'upload'}})).statusCode,200);
 assert.equal((await app.inject({url:'/admin/uploads',headers})).json().length,0);
 assert.equal((await app.inject('/a/'+token+'/subtitles/movie/tt123.json')).json().subtitles.length,0);
 assert.ok(db.prepare("SELECT id FROM sources WHERE id='upload'").get());
 }finally{await app.close();db.close();await rm(dir,{recursive:true,force:true})}
});

test('upload release is optional and defaults to the subtitle filename', async()=>{
 const {createApp}=await import('./server.ts');const dir=await mkdtemp(join(tmpdir(),'subai-upload-name-'));const app=await createApp({DATA_DIR:dir,APP_KEY:'ab'.repeat(32),ADMIN_PASSWORD:'test',PUBLIC_URL:'http://localhost',DEMO_MODE:'0'});const headers={authorization:'Basic '+Buffer.from('admin:test').toString('base64'),origin:'http://localhost'};
 try{for(const release of ['', '   ', 'My release']){
 const form=new FormData();form.set('media','tt123');form.set('lang','en');form.set('release',release);form.set('file',new Blob(['1\n00:00:01,000 --> 00:00:02,000\nHello']), 'Movie.WEB-DL.srt');
 const req=new Request('http://localhost',{method:'POST',body:form});const r=await app.inject({method:'POST',url:'/admin/upload',headers:{...headers,'content-type':req.headers.get('content-type')},payload:Buffer.from(await req.arrayBuffer())});assert.equal(r.statusCode,200,r.body);
 const items=(await app.inject({url:'/admin/uploads',headers})).json();assert.equal(items[0].rel,release.trim()||'Movie.WEB-DL');
 }}finally{await app.close();await rm(dir,{recursive:true,force:true})}
});
