import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { parse } from "./subs.ts";

test("provider failure resumes the saved batch after restart", async () => {
  const dir = await mkdtemp(join(tmpdir(), "subai-restart-")),
    fixture = join(dir, "mock.mjs"),
    flag = join(dir, "quota"),
    calls = join(dir, "calls");
  const lines = Array.from(
    { length: 51 },
    (_, i) => i + 1 + "\n00:00:01,000 --> 00:00:02,250\nHello " + (i + 1),
  ).join("\n\n");
  await writeFile(
    fixture,
    `import {existsSync,appendFileSync} from 'node:fs'
 const nativeTimeout=AbortSignal.timeout; const deadlines=new WeakMap();
 AbortSignal.timeout=(ms)=>{const signal=nativeTimeout(ms);deadlines.set(signal,ms);return signal};
 globalThis.fetch=async(url,opts)=>{const u=new URL(url),json=Response.json
 if(u.hostname==='private.test'||u.hostname==='local.test'){
   if(deadlines.get(opts.signal)!==300000)return new Response('',{status:400});
   if(u.pathname!=='/v1/chat/completions')return new Response('',{status:404});
   const expected=u.hostname==='private.test'?'Bearer custom-example-secret':undefined;
   if(opts.headers.Authorization!==expected)return new Response('',{status:401});
   const body=JSON.parse(opts.body);
   if(body.model!=='local:3b')return new Response('',{status:404});
   const input=JSON.parse(body.messages[1].content);
   const replacing=existsSync(${JSON.stringify(flag + ".replace")});
   if(replacing){
     appendFileSync(${JSON.stringify(calls)},'R'+input[0].id+'\\n');
     if(input[0].id===51&&!existsSync(${JSON.stringify(flag + ".resume")}))return new Response('',{status:429});
   }
   const rows=input.map(row=>({id:row.id,text:replacing?'Bản dịch mới':'Phụ đề tùy chỉnh'}));
   return json({choices:[{message:{content:JSON.stringify({rows})}}]})
 }
 if(opts?.headers?.Authorization==='Bearer invalid')return new Response('',{status:401})
 if(u.pathname.endsWith('/key'))return json({data:{}})
 if(u.pathname.endsWith('/models/user'))return json({data:[{id:'mock/model',supported_parameters:['structured_outputs']}]})
 if(u.host==='api.subsource.net'){
   if(opts.headers['X-API-Key']!=='ok')return new Response('',{status:401})
   if(u.pathname.endsWith('/movies/search'))return json({success:true,data:[{movieId:10,imdbId:u.searchParams.get('imdb')}]})
   if(u.pathname.endsWith('/subtitles')){const language=u.searchParams.get('language');return json({success:true,data:[{subtitleId:language==='english'?41:42,language,releaseInfo:[language==='english'?'Extended':'WEB'],productionType:'retail'}]})}
   if(u.pathname.endsWith('/download'))return new Response('1\\n00:00:01,000 --> 00:00:02,000\\nSubtitle');
 }
 if(u.pathname.endsWith('/search'))return json({subtitles:[{lang:'english',release_name:'WEB-DL',url:'https://dl.subdl.com/test.srt'}]})
 if(u.host==='dl.subdl.com')return new Response(${JSON.stringify(lines)})
 if(u.host==='api.mistral.ai'){
   if(u.pathname.endsWith('/models'))return json({data:[{id:'test-mistral',capabilities:{completion_chat:true}}]})
   appendFileSync(${JSON.stringify(calls)},'Mistral\\n');return new Response('',{status:503})
 }
 if(u.host==='api.deepseek.com'&&u.pathname==='/models')return json({data:[{id:'test-ds'}]})
 if(u.host==='api.deepseek.com'&&u.pathname.endsWith('/completions')){
 const xml=JSON.parse(opts.body).messages[1].content;appendFileSync(${JSON.stringify(calls)},'DS'+(xml.includes('id="51"')?'51':'1')+'\\n');
 if(!xml.includes('id="51"'))return new Response('',{status:503});return json({choices:[{message:{content:'<subs><cue id="51">Bonjour</cue></subs>'}}]})}
 if(u.host==='opensubtitles-v3.strem.io'){if(u.pathname.endsWith('/manifest.json'))return json({resources:['subtitles']});return json({subtitles:[{lang:'vie',id:'vi1',url:'https://example.org/test.srt',label:'WEB-DL'}]})}
 if(u.pathname.endsWith('/languages'))return json({data:{languages:['en','fr','vi','ko'].map(language=>({language}))}})
 if(u.host==='translation.googleapis.com'){const b=JSON.parse(opts.body);appendFileSync(${JSON.stringify(calls)},'Google:'+b.target+'\\n');return json({data:{translations:b.q.map(()=>({translatedText:'Bonjour'}))}})}
 if(u.pathname.endsWith('/completions')){
 const data=JSON.parse(JSON.parse(opts.body).messages[1].content),rows=data.cues??data;
 if(rows[0].id===51){
   const expected=[48,49,50].map(id=>({source:'Hello '+id,translation:'Xin chào'}));
   if(JSON.stringify(data.previous)!==JSON.stringify(expected))throw Error('previous batch context mismatch');
 }else if(data.previous)throw Error('unexpected context');
 appendFileSync(${JSON.stringify(calls)},rows[0].id+'\\n')
 if(rows[0].id===51&&!existsSync(${JSON.stringify(flag)}))return new Response('',{status:429})
 return json({choices:[{message:{content:JSON.stringify({rows:rows.map(x=>({id:x.id,text:'Xin chào'}))})}}]})
 }
 throw Error('unexpected endpoint')
 }`,
  );
  const sock = createServer();
  sock.listen(0, "127.0.0.1");
  await once(sock, "listening");
  const port = (sock.address() as any).port;
  await new Promise<void>((r) => sock.close(() => r()));
  const base = "http://127.0.0.1:" + port,
    headers = {
      Authorization: "Basic " + Buffer.from("admin:test").toString("base64"),
      Origin: base,
      "Content-Type": "application/json",
    };
  const start = () =>
    spawn(
      process.execPath,
      ["--import", pathToFileURL(fixture).href, "server.ts"],
      {
        env: {
          ...process.env,
          DEMO_MODE: "0",
          DATA_DIR: dir,
          PORT: String(port),
          PUBLIC_URL: base,
          APP_KEY: "89".repeat(32),
          ADMIN_PASSWORD: "test",
        },
        stdio: "ignore",
      },
    );
  let child = start();
  async function stop() {
    if (child.exitCode !== null || child.signalCode) return;
    const done = once(child, "exit");
    child.kill();
    await done;
  }
  async function poll(fn: () => Promise<any>) {
    for (let i = 0; i < 150; i++) {
      try {
        const value = await fn();
        if (value) return value;
      } catch {}
      await new Promise((r) => setTimeout(r, 30));
    }
    throw Error("timeout");
  }
  const jobs = async () =>
    (await (await fetch(base + "/admin/jobs", { headers })).json())[0];
  const post = (path: string, data: any) =>
    fetch(base + "/admin/" + path, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });
  try {
    await poll(async () => (await fetch(base + "/configure", { headers })).ok);
    for (const provider of ["sub", "ss", "google"]) {
      assert.equal((await post("check", { provider, key: "" })).status, 400);
      assert.equal((await post("check", { provider, key: "ok" })).status, 200);
    }
    assert.equal(
      (await post("check", { or: "invalid", sub: "ok" })).status,
      400,
    );
    assert.equal(
      (
        await post("save", {
          preferences: { batchContext: true },
          or: "test-router-secret",
          sub: "test-sub-secret",
          model: "mock/model",
        })
      ).status,
      200,
    );
    const html = await (await fetch(base + "/configure", { headers })).text();
    assert.match(html, /id="or"[^>]*placeholder="test•{8}cret"/);
    assert.doesNotMatch(html, /test-router-secret|test-sub-secret/);
    const root = html.match(/http:\/\/127\.0\.0\.1:\d+\/a\/[a-f0-9]+/)![0];
    const list = async () =>
      (await (await fetch(root + "/subtitles/movie/tt123.json")).json())
        .subtitles;
    const track = (await list()).find((t) =>
      t.label.startsWith("[Tạo bản dịch AI]"),
    );
    await Promise.all([fetch(track.url), fetch(track.url)]);
    const failed = await poll(async () => {
      const j = await jobs();
      return j?.error && j;
    });
    assert.equal(failed.step, 1);
    assert.match(failed.error, /429/);
    assert.doesNotMatch(await (await fetch(track.url)).text(), /Xin chào/);
    await stop();
    await writeFile(flag, "1");
    child = start();
    await poll(async () => (await fetch(base + "/configure", { headers })).ok);
    await post("retry", { id: failed.id });
    await poll(async () => (await jobs())?.ready);
    const result = parse(
      await (
        await fetch(
          (await list()).find((t) => t.label.startsWith("[Đã dịch AI]")).url,
        )
      ).text(),
    );
    assert.equal(result.length, 51);
    assert.ok(
      result.every((x) => x.text === "Xin chào" && x.end === "00:00:02,250"),
    );
    assert.deepEqual((await readFile(calls, "utf8")).trim().split("\n"), [
      "1",
      "51",
      "51",
    ]);
    assert.equal(
      (await post("models", { provider: "ds", key: "" })).status,
      400,
    );
    assert.equal(
      (await post("models", { provider: "ds", key: "valid" })).status,
      200,
    );
    const response = await post("save", {
      ds: "valid",
      mistral: "valid",
      google: "valid",
      preferences: {
        main: "ds",
        others: ["mistral", "google"],
        mistralModel: "test-mistral",
        workflow: "xml",
        dsModel: "test-ds",
        sources: ["en", "ko"],
        targets: ["fr", "vi"],
      },
    });
    assert.equal(response.status, 200, await response.text());
    const french = (await list()).find((x) => x.lang === "fra");
    await fetch(french.url);
    await poll(async () => (await jobs())?.ready);
    assert.equal(parse(await (await fetch(french.url)).text()).length, 51);
    assert.deepEqual(
      (await readFile(calls, "utf8")).trim().split("\n").slice(-4),
      ["DS1", "Mistral", "Google:fr", "DS51"],
    );
    const nativeSave = await post("save", {
      preferences: {
        directOnly: true,
        subdl: false,
        addons: ["os"],
        targets: ["vi"],
      },
    });
    assert.equal(nativeSave.status, 200, await nativeSave.text());
    const available = await list();
    assert.equal(available.length, 1);
    assert.match(available[0].label, /^\[Có sẵn\].*OpenSubtitles V3/);
    assert.equal(available[0].url, "https://example.org/test.srt");
    assert.equal((await fetch(track.url)).status, 404);
    const prefs = {
      subdl: false,
      addons: ["ss"],
      sources: ["en"],
      targets: ["vi"],
      orModel: "mock/model",
    };
    const saveSS = async (directOnly: boolean, langs: string[]) => {
      const response = await post("save", {
        ss: "ok",
        model: "mock/model",
        preferences: { ...prefs, directOnly },
        native: { ss: { langs } },
      });
      assert.equal(response.status, 200, await response.text());
      return list();
    };
    const beforeCatalog = await readFile(calls, 'utf8');
    const both = await saveSS(false, []);
    assert.deepEqual(both.map((t) => t.lang), ["vie", "vie", "vie"]);
    assert.match(both[1].label, /Đã dịch AI/);
    assert.match(both[2].label, /Tạo bản dịch AI/);
    assert.match(await (await fetch(both[0].url)).text(), /Subtitle/);
    // A Vietnamese display filter must not hide English AI inputs.
    const vietnameseOnly = await saveSS(false, ["vi"]);
    assert.deepEqual(vietnameseOnly.map(t => t.label), both.map(t => t.label));
    // Legacy per-provider filters are ignored in favor of global languages.
    const legacyFilter = await saveSS(false, ["en"]);
    assert.deepEqual(legacyFilter.map(t => t.label), both.map(t => t.label));
    assert.equal(await readFile(calls, 'utf8'), beforeCatalog, 'Listing must not call paid AI');
    const direct = await saveSS(true, []);
    assert.equal(direct.length, 1);
    assert.match(direct[0].label, /Có sẵn.*SubSource/);
    assert.equal(direct[0].lang, "vie");
    assert.deepEqual((await saveSS(true, ["en"])).map(t => t.label), direct.map(t => t.label));
    const endpoint = "http://private.test/v1",
      local = "http://local.test/v1";
    const customPrefs = {
      main: "custom",
      customModel: "local:3b",
      customTimeout: 300,
      customEndpoint: endpoint,
    };
    assert.equal(
      (
        await post("save", {
          preferences: customPrefs,
          custom: "custom-example-secret",
        })
      ).status,
      200,
    );
    const check = { provider: "custom", model: "local:3b", endpoint };
    assert.equal(
      (await post("check", { ...check, customTimeout: 301 })).status,
      400,
    );
    assert.equal((await post("check", check)).status, 200);
    assert.equal(
      (await post("check", { ...check, model: "missing" })).status,
      400,
    );
    assert.equal(
      (await post("check", { ...check, endpoint: local })).status,
      200,
    );
    assert.equal(
      (await post("check", { ...check, endpoint: "file:///tmp" })).status,
      400,
    );
    const customTrack = (await list()).find((t) =>
      t.label.startsWith("[Tạo bản dịch AI]"),
    );
    await fetch(customTrack.url);
    const done = await poll(async () =>
      (await list()).find((t) => t.label.startsWith("[Đã dịch AI]")),
    );
    assert.match(await (await fetch(done.url)).text(), /Phụ đề tùy chỉnh/);
    const published = await jobs();
    const revision = { id: published.id, version: published.version };
    await writeFile(flag + ".replace", "1");
    const submitted = await Promise.all([
      post("retranslate", revision),
      post("retranslate", revision),
    ]);
    assert.ok(submitted.every((r) => r.status === 202));
    const failure = await poll(async () => {
      const row = await jobs();
      return row.replacing && row.error && row;
    });
    const detail = await (
      await fetch(base + "/admin/jobs/" + failure.id, { headers })
    ).json();
    assert.equal(detail.state, "failed");
    assert.equal(detail.groups, 2);
    assert.equal(detail.completedCues, 50);
    assert.equal(detail.cues, 51);
    assert.equal(detail.seconds, null);
    assert.equal(failure.ready, 1);
    assert.equal(failure.step, 1);
    assert.match(failure.error, /429/);
    assert.equal(
      (await list()).find((t) => t.label.startsWith("[Đã dịch AI]")).url,
      done.url,
    );
    assert.match(
      await (await fetch(customTrack.url)).text(),
      /Phụ đề tùy chỉnh/,
    );
    await stop();
    child = start();
    await poll(async () => (await fetch(base + "/configure", { headers })).ok);
    assert.match(await (await fetch(done.url)).text(), /Phụ đề tùy chỉnh/);
    await writeFile(flag + ".resume", "1");
    await post("retry", { id: revision.id });
    const swapped = await poll(async () => {
      const row = await jobs();
      return (
        row.ready && !row.replacing && row.version !== revision.version && row
      );
    });
    const latest = (await list()).find((t) =>
      t.label.startsWith("[Đã dịch AI]"),
    );
    assert.notEqual(latest.url, done.url);
    assert.match(await (await fetch(done.url)).text(), /Phụ đề tùy chỉnh/);
    const replacement = parse(await (await fetch(latest.url)).text());
    assert.equal(replacement.length, 51);
    assert.ok(replacement.every((c) => c.text === "Bản dịch mới"));
    await post("retranslate", revision);
    assert.equal((await jobs()).version, swapped.version);
    assert.equal((await jobs()).replacing, 0);
    assert.deepEqual(
      (await readFile(calls, "utf8"))
        .trim()
        .split("\n")
        .filter((v) => v.startsWith("R")),
      ["R1", "R51", "R51"],
    );

    assert.equal(
      (
        await post("save", {
          preferences: { ...customPrefs, customEndpoint: local },
        })
      ).status,
      200,
    );
    assert.equal(
      (await post("check", { ...check, endpoint: local })).status,
      200,
    );
  } finally {
    await stop();
    await rm(dir, { recursive: true, force: true });
  }
});
