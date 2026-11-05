import { addonLogo } from "./logo.ts";
import { catalogOptions, checkSS, searchSS, downloadSS } from "./nativeSubs.ts";
import {
  proSettings,
  proManifest,
  authSearch,
  authDownload,
  session as osLogin,
} from "./openSubs.ts";
import { proLanguages } from "./proLanguages.ts";
import {
  downloadV3,
  directSources,
  directTracks,
  verifyManifest,
} from "./directSources.ts";
import {
  aiSourceNames,
  defaults,
  preferences,
  customTimeoutSeconds,
  language,
  services,
  modelServices,
} from "./preferences.ts";
import Fastify from "fastify";
import multipart from "@fastify/multipart";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import {
  randomBytes,
  createHash,
  createCipheriv,
  createDecipheriv,
  timingSafeEqual,
} from "node:crypto";
import { parse, render, merge, batches } from "./subs.ts";
import * as upstream from "./providers.ts";
import { keyPreview, page } from "./ui.ts";

export function addonManifest(logo: string, configurationRequired: boolean) {
  return {
    id: "local.subai.movies",
    version: "1.0.2",
    logo,
    behaviorHints: { configurable: true, configurationRequired },
    name: "SubAI Movies",
    description: "Phụ đề Việt cá nhân",
    resources: ["subtitles"],
    types: ["movie", "series"],
    idPrefixes: ["tt"],
    catalogs: [],
  };
}

export async function createApp(env: NodeJS.ProcessEnv = process.env) {
const dir = env.DATA_DIR || "./data",
  demo = () => env.DEMO_MODE === "1" && !get("model") && !get("preferences");
const key = Buffer.from(env.APP_KEY || "", "hex"),
  password = env.ADMIN_PASSWORD,
  base = new URL(env.PUBLIC_URL || "http://127.0.0.1:7000").origin;
if (key.length !== 32 || !password)
  throw Error("Cần APP_KEY (64 ký tự hex) và ADMIN_PASSWORD.");
mkdirSync(dir, { recursive: true });
const db = new DatabaseSync(dir + "/subai.db");
db.exec(`PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS settings(k TEXT PRIMARY KEY,v TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS hidden_uploads(id TEXT PRIMARY KEY);
CREATE TABLE IF NOT EXISTS catalog_cache(media TEXT, provider TEXT, scope TEXT, ids TEXT, PRIMARY KEY(media,provider));
CREATE TABLE IF NOT EXISTS sources(id TEXT PRIMARY KEY,media TEXT,lang TEXT,rel TEXT,url TEXT,body TEXT);
CREATE TABLE IF NOT EXISTS requests(id TEXT PRIMARY KEY,src TEXT,model TEXT,job TEXT,error TEXT);
CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY,src TEXT,model TEXT,step INTEGER DEFAULT 0,parts TEXT DEFAULT '[]',result TEXT,error TEXT);
`);
const one = (q: string, ...p: any[]) => db.prepare(q).get(...p) as any;
const all = (q: string, ...p: any[]) => db.prepare(q).all(...p) as any[];
const run = (q: string, ...p: any[]) => db.prepare(q).run(...p);
const get = (k: string) => one("SELECT v FROM settings WHERE k=?", k)?.v || "";
const set = (k: string, v: string) =>
  run("INSERT OR REPLACE INTO settings VALUES(?,?)", k, v);
const hash = (...x: string[]) =>
  createHash("sha256").update(JSON.stringify(x)).digest("hex");
function seal(s: string) {
  const iv = randomBytes(12),
    c = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([c.update(s, "utf8"), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), data]).toString("base64");
}
function secret(k: string) {
  if (!get(k)) return "";
  const b = Buffer.from(get(k), "base64"),
    d = createDecipheriv("aes-256-gcm", key, b.subarray(0, 12));
  d.setAuthTag(b.subarray(12, 28));
  return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString();
}
if (!get("token")) set("token", randomBytes(24).toString("hex"));
function source(
  media: string,
  lang: string,
  rel: string,
  url: string,
  body: string,
) {
  const id = hash(media, lang, rel, url, body);
  run(
    "INSERT OR IGNORE INTO sources VALUES(?,?,?,?,?,?)",
    id,
    media,
    lang,
    rel,
    url,
    body,
  );
  return id;
}
if (demo())
  source(
    "tt0133093",
    "en",
    "DEMO",
    "demo:sample",
    render(parse("1\n00:00:01,000 --> 00:00:05,000\nHello!")),
  );
const valid = (id: string, t: string) =>
  t === "movie"
    ? /^tt\d+$/.test(id)
    : t === "series" && /^tt\d+:\d+:\d+$/.test(id);
const model = () => (demo() ? "demo" : get("model"));
const version = "vi-1";
const settings = () => preferences(JSON.parse(get("preferences") || "{}"));
for (const table of ["requests", "jobs"])
  if (!all("PRAGMA table_info(" + table + ")").some((c) => c.name === "recipe"))
    db.exec("ALTER TABLE " + table + " ADD COLUMN recipe TEXT");
if (!all("PRAGMA table_info(requests)").some((c) => c.name === "pending_job"))
  db.exec("ALTER TABLE requests ADD COLUMN pending_job TEXT");
db.exec(`CREATE INDEX IF NOT EXISTS requests_pending ON requests(pending_job) WHERE pending_job IS NOT NULL;
CREATE TRIGGER IF NOT EXISTS publish_retranslation AFTER UPDATE OF result ON jobs
WHEN NEW.result IS NOT NULL AND OLD.result IS NULL
BEGIN
  UPDATE requests SET job=NEW.id,pending_job=NULL WHERE pending_job=NEW.id;
END;`);
function osCredentials(b: any = {}) {
  return {
    user: String(b.user || "").trim() || secret("os-user"),
    password: String(b.password || "") || secret("os-password"),
    apiKey:
      String(b.apiKey || "").trim() ||
      secret("os-apiKey") ||
      env.OPENSUBTITLES_API_KEY ||
      "",
  };
}
function nativeSettings(input = JSON.parse(get("native-settings") || "{}")) {
  return {
    subdl: catalogOptions("subdl", { ...input.subdl, langs: [] }),
    ss: catalogOptions("ss", { ...input.ss, langs: [] }),
  };
}
function savedPro() {
  if (get("pro-settings")) return proSettings(JSON.parse(get("pro-settings")));
  try {
    const path = new URL(secret("manifest-pro")).pathname.slice(
        1,
        -"/manifest.json".length,
      ),
      v = JSON.parse(
        Buffer.from(decodeURIComponent(path), "base64").toString(),
      );
    return proSettings({
      ...v,
      langs: Object.keys(proLanguages).filter((k) =>
        v.langs?.includes(proLanguages[k]),
      ),
    });
  } catch {
    return proSettings();
  }
}
function recipe(src: string, dst: string) {
  const p = settings();
  return {
    src,
    dst,
    main: p.main,
    secondary: p.others[0] || "",
    ...(p.others.length > 1 ? { others: p.others } : {}),
    workflow: p.workflow,
    ...(p.batchContext && [p.main, ...p.others].some((k) => k !== "google")
      ? { batchContext: true }
      : {}),
    ...([p.main, ...p.others].includes("custom")
      ? { customEndpoint: p.customEndpoint }
      : {}),
    orModel: p.orModel || model(),
    dsModel: p.dsModel,
    ...Object.fromEntries(
      [p.main, ...p.others]
        .filter((k) => k && k !== "google" && k !== "or")
        .map((k) => [k + "Model", p[k + "Model"]]),
    ),
  };
}
function ticket(s: any, dst: string) {
  const p = recipe(s.lang, dst);
  return p.main === "or" &&
    !p.secondary &&
    !p.batchContext &&
    p.workflow === "json" &&
    p.src === "en" &&
    dst === "vi"
    ? hash(s.id, model(), version)
    : hash(s.id, model(), JSON.stringify(p), version);
}
const app = Fastify({ logger: false, routerOptions: { maxParamLength: 4096 } });
await app.register(multipart, {
  limits: { fileSize: 2_000_000, files: 1, fields: 5 },
});
app.addHook("onRequest", async (req, rep) => {
  const path = req.url.split("?")[0];
  if (path.startsWith("/a/")) {
    rep
      .header("Access-Control-Allow-Origin", "*")
      .header("Cache-Control", "no-store");
    if (path.split("/")[2] !== get("token")) return rep.code(404).send();
    if (req.method === "OPTIONS")
      return rep
        .header("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS")
        .code(204)
        .send();
  } else {
    rep
      .header("Cache-Control", "no-store")
      .header("Referrer-Policy", "no-referrer")
      .header("X-Frame-Options", "DENY");
    const expect =
      "Basic " + Buffer.from("admin:" + password).toString("base64");
    if (
      !timingSafeEqual(
        Buffer.from(hash(req.headers.authorization || "")),
        Buffer.from(hash(expect)),
      )
    )
      return rep
        .header("WWW-Authenticate", 'Basic realm="SubAI"')
        .code(401)
        .send("Đăng nhập bằng tài khoản admin.");
    if (req.method === "POST" && req.headers.origin !== base)
      return rep.code(403).send("Origin không hợp lệ.");
  }
});
app.setErrorHandler((e: any, req, rep) => {
  rep.code(e.statusCode || 400).send({ error: e.message });
});
const root = () => base + "/a/" + get("token");
app.get("/", async (_, r) => r.redirect("/configure"));
app.get("/configure", async (_, r) =>
  r.type("text/html; charset=utf-8").send(
    page(
      root(),
      model(),
      demo(),
      { ...settings(), pro: savedPro(), native: nativeSettings() },
      Object.fromEntries(
        [...Object.keys(services), "sub", "ss", "os-apiKey"].map((k) => [
          k,
          keyPreview(
            secret(k) ||
              (k === "os-apiKey" ? env.OPENSUBTITLES_API_KEY || "" : ""),
          ),
        ]),
      ),
      {
        multiProfile: env.PUBLIC_PROFILES === "1",
        legacySS: !!get("manifest-ss") && !get("ss"),
        proManual: !!get("pro-override"),
        osUser: !!get("os-user"),
        osPassword: !!get("os-password"),
      },
    ),
  ),
);
app.post("/admin/reveal-key", async (req) => {
  const provider = (req.body as any)?.provider;
  if (!Object.hasOwn(services, provider)) throw Error("Nhà cung cấp không hợp lệ.");
  return { key: secret(provider) };
});
app.post("/admin/models", async (req) => {
  const b = req.body as any;
  if (!modelServices.includes(b.provider))
    throw Error("Nhà cung cấp không hợp lệ.");
  const k = String(b.key || "").trim() || secret(b.provider);
  if (!k) throw Error("Nhập API key để tải model.");
  return { models: await upstream.providerModels(b.provider, k, b.workflow) };
});
async function googleLanguages(key: string) {
  const response = await fetch(
    "https://translation.googleapis.com/language/translate/v2/languages",
    { headers: { "X-Goog-Api-Key": key }, signal: AbortSignal.timeout(15000) },
  );
  if (!response.ok) throw Error("Google Translate HTTP " + response.status);
  return (await response.json()).data.languages.map(
    (entry: any) => entry.language,
  );
}
function customKey(endpoint: string, draft = "", clear = false) {
  if (clear) return "";
  return (
    draft.trim() ||
    (endpoint === settings().customEndpoint ? secret("custom") : "")
  );
}
function validateCustom(endpoint: string, model: string) {
  if (!model || model.length > 256)
    throw Error("Nhập tên model của Custom Provider.");
  return upstream.customEndpoint(endpoint);
}
async function verify(b: any) {
  const native = nativeSettings(b?.native);
  const p = preferences(b?.preferences ?? settings()),
    needed = [
      ...(p.subdl ? ["sub"] : []),
      ...(p.addons.includes("ss") &&
      (b?.ss?.trim() || get("ss") || !get("manifest-ss"))
        ? ["ss"]
        : []),
      ...(p.directOnly ? [] : [p.main, ...p.others]),
    ];
  const creds = Object.fromEntries(
    needed.map((k) => [k, String(b?.[k] || "").trim() || secret(k)]),
  );
  if (needed.includes("custom")) {
    p.customEndpoint = validateCustom(p.customEndpoint, p.customModel);
    creds.custom = customKey(
      p.customEndpoint,
      String(b?.custom || ""),
      b?.clearCustomKey === true,
    );
  } else {
    const saved = settings();
    p.customEndpoint = saved.customEndpoint;
    p.customModel = saved.customModel;
    p.customTimeout = saved.customTimeout;
  }
  const missing = needed.filter((k) => k !== "custom" && !creds[k]);
  if (missing.length)
    throw Error(
      "Cần nhập API key cho " +
        missing
          .map((k) => services[k] || (k === "ss" ? "SubSource" : "SubDL"))
          .join(" và ") +
        ".",
    );
  const [entries] = await Promise.all([
    Promise.all(
      needed
        .filter((k) => modelServices.includes(k))
        .map(async (k) => [
          k,
          await upstream.providerModels(k, creds[k], p.workflow),
        ]),
    ),
    p.subdl ? upstream.checkSub(creds.sub, native.subdl.timeout) : null,
    needed.includes("ss") ? checkSS(creds.ss, native.ss.timeout) : null,
    needed.includes("google")
      ? googleLanguages(creds.google).then((codes) => {
          if ([...p.sources, ...p.targets].some((x) => !codes.includes(x)))
            throw Error("Google Translate không hỗ trợ một ngôn ngữ đã chọn.");
        })
      : null,
  ]);
  const catalogs = Object.fromEntries(entries);
  return {
    p,
    creds,
    catalogs,
    models: catalogs.or || [],
    dsModels: catalogs.ds || [],
  };
}
app.post("/admin/check", async (req) => {
  const b = req.body as any;
  if (b?.provider === "custom") {
    const model = String(b.model || "").trim(),
      endpoint = validateCustom(String(b.endpoint || ""), model);
    const key = customKey(
      endpoint,
      String(b.key || ""),
      b.clearCustomKey === true,
    );
    const sample = [{ id: 1, start: "", end: "", text: "Hello!" }];
    merge(
      sample,
      await upstream.translate(
        key,
        model,
        sample,
        "en",
        "vi",
        "custom",
        b.workflow === "xml" ? "xml" : "json",
        endpoint,
        {
          timeoutSeconds: customTimeoutSeconds(
            b.customTimeout ?? settings().customTimeout,
          ),
        },
      ),
    );
    return { ok: true };
  }
  if (b?.provider === "osauth") {
    await osLogin(osCredentials(b.os), true);
    return { ok: true };
  }
  if (b?.provider !== undefined) {
    if (!["sub", "ss", "google"].includes(b.provider))
      throw Error("Dịch vụ không hợp lệ.");
    const key = String(b.key || "").trim() || secret(b.provider);
    if (!key)
      throw Error(
        "Cần nhập API key " +
          (b.provider === "sub"
            ? "SubDL"
            : b.provider === "ss"
              ? "SubSource"
              : "Google Cloud Translate") +
          ".",
      );
    if (b.provider === "sub")
      await upstream.checkSub(key, catalogOptions("subdl", b.options).timeout);
    else if (b.provider === "ss")
      await checkSS(key, catalogOptions("ss", b.options).timeout);
    else await googleLanguages(key);
    return { ok: true };
  }
  const { models, dsModels } = await verify(req.body);
  return { models, dsModels };
});
app.post("/admin/save", async (req) => {
  const b = req.body as any,
    { p, creds, catalogs } = await verify(b);
  const manifests: Record<string, string> = {};
  const pro = proSettings(b.pro ?? savedPro()),
    auth = p.addons.includes("os") && p.osAuth;
  const credentials = auth ? osCredentials(b.os) : null;
  if (auth) await osLogin(credentials);
  await Promise.all(
    p.addons.map(async (k) => {
      if ((k === "os" && auth) || (k === "ss" && creds.ss)) return;
      if (k === "pro" && b.pro) {
        const url = b.proManual
          ? String(b.proOverride || "").trim() || secret("pro-override")
          : proManifest(
              pro,
              p.directOnly
                ? p.targets
                : [...new Set<string>([...p.sources, ...p.targets])],
            );
        if (!url) throw Error("Nhập URL manifest ghi đè hoặc tắt ghi đè.");
        await verifyManifest(k, url, pro.timeout);
        manifests[k] = url;
        return;
      }
      const value =
        String(b.manifests?.[k] || "").trim() || secret("manifest-" + k);
      if (directSources[k].custom && !value)
        throw Error(
          "Dán link manifest đã cấu hình cho " + directSources[k].name + ".",
        );
      await verifyManifest(k, value);
      if (value) manifests[k] = value;
    }),
  );
  if (p.directOnly) {
    const old = settings();
    p.orModel = old.orModel || get("model");
    for (const k of modelServices)
      if (!p[k + "Model"]) p[k + "Model"] = old[k + "Model"] || "";
  }
  if (!p.directOnly) p.orModel = b.model || p.orModel;
  for (const k of Object.keys(catalogs))
    if (!catalogs[k].includes(p[k + "Model"]))
      throw Error("Chọn model hợp lệ cho " + services[k] + ".");
  const native = nativeSettings(b.native);
  for (const k of ["sub", "ss"] as const) {
    const newKey = String(b[k] || "").trim();
    if (!creds[k] && newKey) {
      if (k === "ss") await checkSS(newKey, native.ss.timeout);
      else await upstream.checkSub(newKey, native.subdl.timeout);
      creds[k] = newKey;
    }
  }
  db.exec("BEGIN");
  try {
    for (const [k, v] of Object.entries(creds))
      set(k, v ? seal(String(v)) : "");
    set("native-settings", JSON.stringify(native));
    if (creds.ss) set("manifest-ss", "");
    if (b.pro && p.addons.includes("pro"))
      set("pro-override", b.proManual ? seal(manifests.pro) : "");
    if (b.pro) set("pro-settings", JSON.stringify(pro));
    if (auth)
      for (const [k, v] of Object.entries(credentials))
        if (k !== "apiKey" || b.os?.apiKey || get("os-apiKey"))
          set("os-" + k, seal(String(v)));
    for (const [k, v] of Object.entries(manifests))
      set("manifest-" + k, seal(v));
    set("preferences", JSON.stringify(p));
    if (!p.directOnly)
      set(
        "model",
        p.main === "google" ? "Google Translate" : p[p.main + "Model"],
      );
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
  kick();
  return { ok: true };
});
app.post("/admin/rotate", async () => {
  set("token", randomBytes(24).toString("hex"));
  return { ok: true };
});
app.post("/admin/upload", async (req) => {
  const f: Record<string, string> = {};
  let raw = "", uploadedName = "";
  for await (const p of req.parts()) {
    if (p.type === "file") {
      uploadedName = String(p.filename || "").replaceAll("\\", "/").split("/").pop()?.replace(/\.(srt|vtt)$/i, "").trim() || "";
      raw = new TextDecoder("utf-8", { fatal: true }).decode(
        await p.toBuffer(),
      );
    } else f[p.fieldname] = String(p.value);
  }
  if (
    !valid(f.media || "", f.media?.includes(":") ? "series" : "movie") ||
    !language(f.lang)
  )
    throw Error("Sai IMDb, mùa/tập hoặc ngôn ngữ.");
  const uploadedId = source(
    f.media,
    f.lang,
    (f.release?.trim() || uploadedName || "Tệp riêng").slice(0, 160),
    "",
    render(parse(raw)),
  );
  run("DELETE FROM hidden_uploads WHERE id=?", uploadedId);
  return { ok: true };
});
app.get('/admin/uploads', async () => all("SELECT id,media,lang,rel FROM sources WHERE url='' AND id NOT IN (SELECT id FROM hidden_uploads) ORDER BY rowid DESC"));
app.get('/admin/uploads/:id/file', async (req: any, reply) => {
 const s = one("SELECT body FROM sources WHERE id=? AND url='' AND id NOT IN (SELECT id FROM hidden_uploads)",req.params.id);
 if (!s) return reply.code(404).send();
 return reply.header('Content-Disposition','attachment; filename="subtitle.srt"').type('application/x-subrip; charset=utf-8').send(s.body);
});
app.post('/admin/uploads/remove', async (req: any, reply) => {
 const s=one("SELECT id FROM sources WHERE id=? AND url=''",String(req.body?.id||''));
 if (!s) return reply.code(404).send({error:'Không tìm thấy tệp phụ đề.'});
 run('INSERT OR IGNORE INTO hidden_uploads VALUES(?)',s.id);
 return {ok:true};
});
let activeJob = "",
  preparingRequest = "",
  activeGroupCount = 0,
  batchStarted = 0,
  measuredMs = 0,
  measuredGroups = 0;
const activityQuery = `SELECT r.id,s.media,s.rel,r.model,r.job AS version,r.pending_job IS NOT NULL AS replacing,
      s.lang AS src,COALESCE(json_extract(r.recipe,'$.dst'),'vi') AS dst,
      coalesce(n.step,j.step,0) AS step,j.result IS NOT NULL AS ready,coalesce(n.error,r.error,j.error) AS error,
      coalesce(r.pending_job,r.job) AS workId
      FROM requests r JOIN sources s ON s.id=r.src LEFT JOIN jobs j ON j.id=r.job
      LEFT JOIN jobs n ON n.id=r.pending_job`;
function activityState(row: any, paused: boolean) {
  if (row.error) return "failed";
  if (row.ready && !row.replacing) return "ready";
  if (activeJob && row.workId === activeJob) return "running";
  if (row.id === preparingRequest) return "preparing";
  return paused ? "paused" : "queued";
}
function remainingSeconds(state: string, step: number) {
  if (state !== "running" || !measuredGroups || activeGroupCount <= step)
    return null;
  const average = measuredMs / measuredGroups;
  const currentRemaining = Math.max(
    0,
    average - (performance.now() - batchStarted),
  );
  return Math.max(
    1,
    Math.ceil(
      ((activeGroupCount - step - 1) * average + currentRemaining) / 1000,
    ),
  );
}
app.get("/admin/jobs", async () => {
  const paused = settings().directOnly;
  return all(activityQuery + " ORDER BY r.rowid DESC LIMIT 100").map((row) => {
    const state = activityState(row, paused);
    return {
      ...row,
      state,
      ...(state === "running"
        ? {
            groups: activeGroupCount,
            seconds: remainingSeconds(state, row.step),
          }
        : {}),
    };
  });
});
app.get("/admin/jobs/:id", async (req: any, rep) => {
  const row = one(activityQuery + " WHERE r.id=?", req.params.id);
  if (!row) return rep.code(404).send({ error: "Không tìm thấy tác vụ." });
  const state = activityState(row, settings().directOnly);
  const source = one(
    "SELECT s.body FROM sources s JOIN requests r ON s.id=r.src WHERE r.id=?",
    row.id,
  );
  const cues = source.body ? parse(source.body) : [];
  const groups = batches(cues);
  const completedCues = groups
    .slice(0, row.step)
    .reduce((n, g) => n + g.length, 0);
  return {
    ...row,
    state,
    groups: groups.length || null,
    cues: cues.length || null,
    completedCues,
    seconds: remainingSeconds(state, row.step),
  };
});
app.post("/admin/retranslate", async (req, rep) => {
  if (settings().directOnly) throw Error("Bật dịch AI trước khi dịch lại.");
  const { id, version } = req.body as { id: string; version: string };
  db.exec("BEGIN IMMEDIATE");
  try {
    const row = one(
      `SELECT r.job,r.pending_job,j.src,j.recipe,j.model,j.result IS NOT NULL AS ready
      FROM requests r JOIN jobs j ON j.id=r.job WHERE r.id=?`,
      id,
    );
    if (!row?.ready) throw Error("Chỉ có thể dịch lại bản đã hoàn tất.");
    if (row.job === version && !row.pending_job) {
      const next = randomBytes(32).toString("hex");
      run(
        "INSERT INTO jobs(id,src,model,recipe) VALUES(?,?,?,?)",
        next,
        row.src,
        row.model,
        row.recipe,
      );
      run("UPDATE requests SET pending_job=? WHERE id=?", next, id);
    }
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
  kick();
  return rep.code(202).send({ ok: true });
});
app.post("/admin/retry", async (req) => {
  const id = (req.body as any).id;
  run(
    "UPDATE jobs SET error=NULL WHERE id=(SELECT coalesce(pending_job,job) FROM requests WHERE id=?)",
    id,
  );
  run("UPDATE requests SET error=NULL WHERE id=?", id);
  kick();
  return { ok: true };
});
app.get("/a/:token/configure", async (_, reply) => reply.redirect("/configure"));
app.get("/a/:token/logo.png", async (_, reply) => reply.type("image/png").header("Cache-Control", "public, max-age=86400").send(addonLogo));
app.get("/a/:token/manifest.json", async () => addonManifest(root() + "/logo.png", false));
const notice = (s: string) => "1\n00:00:00,000 --> 99:59:59,999\n" + s + "\n";
const note = (e: unknown) =>
  e instanceof Error ? e.message : "Có lỗi khi xử lý.";
async function body(s: any) {
  if (s.body) return s.body;
  const v = render(
    parse(
      s.url.startsWith("osv3:")
        ? await downloadV3(s.url.slice(5))
        : s.url.startsWith("osauth:")
        ? await authDownload(osCredentials(), s.url.slice(7))
        : s.url.startsWith("ssapi:")
          ? await downloadSS(
              secret("ss"),
              s.url,
              s.media,
              nativeSettings().ss.timeout,
            )
          : await upstream.download(
              s.url,
              secret("sub"),
              nativeSettings().subdl.timeout,
            ),
    ),
  );
  run("UPDATE sources SET body=? WHERE id=?", v, s.id);
  return v;
}
let busy = false;
function kick() {
  if (!busy) {
    busy = true;
    setImmediate(async () => {
      try {
        for (;;) {
          if (!db.isOpen || settings().directOnly) break;
          const r = one(
            "SELECT * FROM requests WHERE job IS NULL AND error IS NULL LIMIT 1",
          );
          if (r) {
            preparingRequest = r.id;
            try {
              const s = one("SELECT * FROM sources WHERE id=?", r.src),
                v = await body(s),
                id = hash(v, r.recipe || "vi", r.model, version);
              run(
                "INSERT OR IGNORE INTO jobs(id,src,model,recipe) VALUES(?,?,?,?)",
                id,
                s.id,
                r.model,
                r.recipe,
              );
              run("UPDATE requests SET job=? WHERE id=?", id, r.id);
            } catch (e) {
              run("UPDATE requests SET error=? WHERE id=?", note(e), r.id);
            }
            preparingRequest = "";
            continue;
          }
          const j = one(
            "SELECT * FROM jobs WHERE result IS NULL AND error IS NULL LIMIT 1",
          );
          if (!j) break;
          if (activeJob !== j.id) {
            measuredGroups = 0;
            measuredMs = 0;
          }
          activeJob = j.id;
          batchStarted = performance.now();
          try {
            const groups = batches(
                parse(one("SELECT body FROM sources WHERE id=?", j.src).body),
              ),
              g = groups[j.step],
              parts = JSON.parse(j.parts);
            activeGroupCount = groups.length;
            const cfg = JSON.parse(j.recipe || "null") || {
              ...defaults,
              src: "en",
              dst: "vi",
              orModel: j.model,
            };
            const priorCues =
              cfg.batchContext && j.step > 0
                ? groups[j.step - 1].slice(-3)
                : [];
            const previous = priorCues.map((cue, i) => ({
              source: cue.text,
              translation: parts[parts.length - priorCues.length + i].text,
            }));
            const perform = async (provider: string) =>
              merge(
                g,
                await upstream.translate(
                  provider === "custom"
                    ? customKey(cfg.customEndpoint)
                    : secret(provider),
                  cfg[provider + "Model"] || "",
                  g,
                  cfg.src,
                  cfg.dst,
                  provider,
                  cfg.workflow,
                  cfg.customEndpoint,
                  {
                    previous,
                    timeoutSeconds:
                      provider === "custom"
                        ? settings().customTimeout
                        : undefined,
                  },
                ),
              );
            // Older jobs stored just one secondary provider.
            const others: string[] =
              cfg.others ?? (cfg.secondary ? [cfg.secondary] : []);
            const translateBatch = () => {
              let result = perform(cfg.main);
              for (const provider of others)
                result = result.catch(() => perform(provider));
              return result;
            };
            let translated;
            for (let attempt = 0; ; attempt++) {
              try {
                const rows =
                  j.model === "demo"
                    ? (await new Promise((resolve) =>
                        setTimeout(resolve, 1200),
                      ),
                      g.map((x) => ({
                        id: x.id,
                        text:
                          x.text === "Hello!"
                            ? "Xin chào!"
                            : "[Bản thử] " + x.text,
                      })))
                    : await translateBatch();
                translated = merge(g, rows);
                break;
              } catch (e) {
                if (attempt >= 2 || /HTTP (401|402|403|429)|INVALID_API_KEY/.test(note(e)))
                  throw e;
              }
            }
            measuredGroups++;
            measuredMs += performance.now() - batchStarted;
            parts.push(...translated);
            run(
              "UPDATE jobs SET step=?,parts=?,result=? WHERE id=?",
              j.step + 1,
              JSON.stringify(parts),
              j.step + 1 === groups.length ? render(parts) : null,
              j.id,
            );
          } catch (e) {
            run("UPDATE jobs SET error=? WHERE id=?", note(e), j.id);
          }
        }
      } finally {
        activeJob = "";
        preparingRequest = "";
        busy = false;
      }
    });
  }
}
kick();
async function list(req: any) {
  const { type, id } = req.params;
  if (!valid(id, type)) return { subtitles: [] };
  const p = settings(),
    wanted = p.directOnly
      ? p.targets
      : [...new Set<string>([...p.sources, ...p.targets])];
  const native = nativeSettings();
  const priority = p.aiSourceMode === 'custom' ? p.aiSourceOrder : Object.keys(aiSourceNames);
  const enabledAI = (k: string) => !p.directOnly && priority.includes(k);
  const current = new Set<string>();
  const visibleNative = new Set<string>();
  const origins = new Map<string,string>();
  const external = Promise.allSettled(
    p.addons.map((k) =>
      (k === "os" && p.osAuth) || (k === "ss" && get("ss"))
        ? Promise.resolve([])
        : directTracks(
            k,
            secret("manifest-" + k),
            type,
            id,
            req.params.extra || "",
            k === 'os' && enabledAI('os') ? wanted : p.targets,
            k === "pro" ? savedPro() : undefined,
          ),
    ),
  );
  let warning = "";
  if (p.osAuth && p.addons.includes("os"))
    try {
      for (const x of await authSearch(
        osCredentials(),
        id,
        type,
        enabledAI('osauth') ? wanted : p.targets,
        req.params.extra || "",
      )) {
        const sid = source(id, x.lang, x.rel, x.url, "");
        current.add(sid); origins.set(sid, 'osauth');
      }
    } catch (e) {
      warning = "OpenSubtitles Auth: " + note(e);
    }
  await Promise.all(
    (["subdl", "ss"] as const).map(async (k) => {
      const enabled = k === "subdl" ? p.subdl : p.addons.includes("ss");
      const key = secret(k === "ss" ? "ss" : "sub");
      const opts = native[k];
      // Per-provider languages filter ready-to-watch subtitles only.
      // AI source languages are independent and remain searchable.
      const visible = p.targets.filter((x) => !opts.langs.length || opts.langs.includes(x));
      const langs = [...new Set([...visible, ...(enabledAI(k) ? p.sources : [])])];
      if (!enabled || !key || demo() || !langs.length) return;
      const scope = hash(
        ...[...langs].sort(),
        opts.hi,
        ...[...opts.types].sort(),
      );
      try {
        const results =
          k === "ss"
            ? await searchSS(key, id, type, langs, opts)
            : await upstream.search(key, id, type, langs, opts);
        const ids = results.map((x) =>
          source(id, x.lang, x.release, x.url, ""),
        );
        for (const [index, sid] of ids.entries()) {
          current.add(sid); origins.set(sid, k);
          if (visible.includes(results[index].lang)) visibleNative.add(sid);
        }
        run(
          "INSERT OR REPLACE INTO catalog_cache VALUES(?,?,?,?)",
          id,
          k,
          scope,
          JSON.stringify(ids),
        );
      } catch (e) {
        warning += " " + opts.name + ": " + note(e);
        const cached = one(
          "SELECT ids FROM catalog_cache WHERE media=? AND provider=? AND scope=?",
          id,
          k,
          scope,
        );
        if (cached) for (const sid of JSON.parse(cached.ids)) {
          current.add(sid); origins.set(sid, k);
          const cachedSource = one("SELECT lang FROM sources WHERE id=?", sid);
          if (cachedSource && visible.includes(cachedSource.lang)) visibleNative.add(sid);
        }
      }
    }),
  );
  const externalResults = await external;
  for (const [index,result] of externalResults.entries()) {
    if (p.addons[index] !== 'os' || result.status !== 'fulfilled' || !enabledAI('os') || p.osAuth) continue;
    for (const t of result.value) {
      const lang = p.sources.find(k => language(k).iso === t.lang);
      if (!lang) continue;
      const sid = source(id,lang,t.release || 'OpenSubtitles V3', 'osv3:'+t.url,'');
      current.add(sid); origins.set(sid,'os');
    }
  }
  const rows = all("SELECT * FROM sources WHERE media=?", id).filter(
    (s) =>
      (!s.url && !one("SELECT id FROM hidden_uploads WHERE id=?", s.id)) ||
      (s.url === "demo:sample"
        ? demo()
        : s.url.startsWith("osauth:")
          ? p.osAuth && p.addons.includes("os") && current.has(s.id)
          : current.has(s.id)),
  );
  const extra = new URLSearchParams(req.params.extra || "");
  const filename = (extra.get("filename") || "").toLowerCase();
  const words = (s: string) =>
    s
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean);
  const score = (s: any) =>
    words(s.rel).filter((w) => words(filename).includes(w)).length;
  const matchNotice = (s: { rel: string }) => !filename || score(s) === 0 ? " · Chưa xác định độ khớp" : "";
  const sourceRank = (s: any) => !s.url ? -1 : priority.indexOf(origins.get(s.id));
  rows.sort((a, b) => score(b) - score(a) || Number(!b.url) - Number(!a.url) || p.sources.indexOf(a.lang)-p.sources.indexOf(b.lang) || sourceRank(a)-sourceRank(b));
  const originals = rows.filter((s) => wanted.includes(s.lang));
  const subtitles = [];
  // Finished translations remain available when provider settings or catalogs change.
  const completed = all(
    "SELECT DISTINCT j.id,j.model,j.recipe,s.lang,s.rel FROM jobs j JOIN requests r ON r.job=j.id JOIN sources s ON s.id=j.src WHERE s.media=? AND j.result IS NOT NULL ORDER BY j.rowid DESC",
    id,
  );
  for (const job of p.directOnly ? [] : completed) {
    const destination = JSON.parse(job.recipe || "null")?.dst || "vi";
    if (!p.targets.includes(destination)) continue;
    const label = "[Đã dịch AI] " + language(job.lang).name + " → " +
      language(destination).name + " · " + job.rel + " · " + job.model + matchNotice(job);
    subtitles.push({ lang: language(destination).iso, id: label + " · " + job.id.slice(0, 8), label,
      url: root() + "/ready/" + job.id + ".srt" });
  }
  for (const dst of p.directOnly ? [] : p.targets) {
    for (const s of originals) {
      if (
        (s.url && s.url !== 'demo:sample' && !enabledAI(origins.get(s.id))) ||
        !p.sources.includes(s.lang) ||
        s.lang === dst ||
        !model() ||
        originals.some(
          (n) => n.lang === dst && n.rel.toLowerCase() === s.rel.toLowerCase(),
        )
      )
        continue;
      const tid = ticket(s, dst),
        j = one(
          "SELECT j.id,j.result IS NOT NULL ready FROM requests r JOIN jobs j ON r.job=j.id WHERE r.id=?",
          tid,
        );
      if (j?.ready && subtitles.some((track) => track.url === root() + "/ready/" + j.id + ".srt")) continue;
      const label =
        (j?.ready ? "[Đã dịch AI] " : "[Tạo bản dịch AI] ") +
        language(s.lang).name +
        " → " +
        language(dst).name +
        " · " +
        s.rel + matchNotice(s);
      subtitles.push({
        lang: language(dst).iso,
        id: label + " · " + s.id.slice(0, 8),
        label,
        url:
          root() +
          "/" +
          (j?.ready
            ? "ready/" + j.id
            : "make/" + s.id + "/" + encodeURIComponent(model())) +
          ".srt" +
          (j?.ready ? "" : "?to=" + dst + "&recipe=" + hash(JSON.stringify(recipe(s.lang, dst)))),
      });
    }
  }
  for (const s of originals) {
    if (!p.targets.includes(s.lang)) continue;
    if (s.url && s.url !== "demo:sample" && !s.url.startsWith("osauth:") && !visibleNative.has(s.id)) continue;
    const label =
      "[Có sẵn] " +
      language(s.lang).name +
      " · " +
      (s.url === "demo:sample"
        ? "Demo"
        : s.url?.startsWith("osauth:")
          ? "OpenSubtitles Auth"
          : s.url
            ? s.url.startsWith("ssapi:")
              ? native.ss.name
              : native.subdl.name
            : "Tệp riêng") +
      " · " +
      s.rel;
    subtitles.push({
      lang: language(s.lang).iso,
      id: label + " · " + s.id.slice(0, 8),
      label,
      url: root() + "/source/" + s.id + ".srt",
    });
  }
  const seen = new Set(subtitles.map((t) => t.url));
  for (const [i, result] of externalResults.entries()) {
    if (result.status === "rejected") {
      warning +=
        " " +
        directSources[p.addons[i]].name +
        " tạm thời không trả được phụ đề.";
      continue;
    }
    for (const t of result.value)
      if (p.targets.some(k=>language(k).iso===t.lang) && !seen.has(t.url)) {
        subtitles.push(t);
        seen.add(t.url);
      }
  }
  const targetCodes = new Set(p.targets.map((k) => language(k).iso));
  const rank = (t) =>
    t.label.startsWith("[Có sẵn]")
      ? targetCodes.has(t.lang)
        ? 0
        : 1
      : t.label.startsWith("[Đã dịch AI]")
        ? 2
        : 3;
  subtitles.sort((a, b) => rank(a) - rank(b));
  return { subtitles, ...(warning ? { warning: warning.trim() } : {}) };
}
app.get("/a/:token/subtitles/:type/:id.json", list);
app.get("/a/:token/subtitles/:type/:id/:extra.json", list);
app.get("/a/:token/source/:id.srt", async (req: any, r) => {
  const s = one("SELECT * FROM sources WHERE id=?", req.params.id);
  if (!s) return r.code(404).send();
  return r.type("application/x-subrip; charset=utf-8").send(await body(s));
});
app.get("/a/:token/ready/:id.srt", async (req: any, r) => {
  const j = one("SELECT result FROM jobs WHERE id=?", req.params.id);
  return j?.result
    ? r.type("application/x-subrip; charset=utf-8").send(j.result)
    : r.code(404).send();
});
app.get("/a/:token/make/:id/:model.srt", async (req: any, r) => {
  r.type("application/x-subrip; charset=utf-8");
  if (req.method === "HEAD") return r.send("");
  const s = one("SELECT * FROM sources WHERE id=?", req.params.id);
  if (!s) return r.code(404).send();
  const dst = req.query.to || "vi",
    p = settings();
  // A player can retain the original /make URL after a model change.
  // Serve an existing result without scheduling work under the new settings.
  const saved = all(
    "SELECT j.result,j.recipe FROM requests r JOIN jobs j ON r.job=j.id WHERE r.src=? AND r.model=? AND j.result IS NOT NULL ORDER BY j.rowid DESC",
    s.id, req.params.model,
  ).find((job) => (JSON.parse(job.recipe || "null")?.dst || "vi") === dst &&
    (!req.query.recipe || req.query.recipe === hash(job.recipe || "")));
  if (p.directOnly) return r.code(404).send();
  if (saved) return r.send(saved.result);
  if (!model() || req.params.model !== model()) return r.code(404).send();
  if (req.query.recipe && req.query.recipe !== hash(JSON.stringify(recipe(s.lang, dst))))
    return r.code(409).send(notice("Cấu hình đã thay đổi. Vui lòng tải lại danh sách phụ đề."));
  if (
    p.directOnly ||
    !p.sources.includes(s.lang) ||
    !p.targets.includes(dst) ||
    s.lang === dst
  )
    return r.code(404).send();
  const id = ticket(s, dst);
  run(
    "INSERT OR IGNORE INTO requests(id,src,model,recipe) VALUES(?,?,?,?)",
    id,
    s.id,
    model(),
    JSON.stringify(recipe(s.lang, dst)),
  );
  const j = one(
    "SELECT r.error re,j.error,j.result FROM requests r LEFT JOIN jobs j ON j.id=r.job WHERE r.id=?",
    id,
  );
  kick();
  return r.send(
    j.result ||
      notice(
        j.error || j.re
          ? "Dịch lỗi. Xem trang quản lý."
          : "Đang dịch. Vui lòng chọn lại phụ đề sau.",
      ),
  );
});
app.addHook("onClose", async () => { db.close(); });
return app;
}
if (process.argv[1] && import.meta.url === (await import("node:url")).pathToFileURL(process.argv[1]).href) {
 const app = await createApp();
 await app.listen({ port: Number(process.env.PORT || 7000), host: process.env.HOST || "127.0.0.1" });
}
