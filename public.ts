import { languageControl, languageScript } from './localization.ts';
import { theme, themeInit, themeButton, themeScript } from './appearance.ts';
import Fastify from 'fastify';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { addonManifest, createApp } from './server.ts';
import { addonLogo } from './logo.ts';

const env = process.env;
const directory = resolve(env.DATA_DIR || './data');
const origin = new URL(env.PUBLIC_URL || 'http://127.0.0.1:7000').origin;
if (!env.ADMIN_PASSWORD || !/^[a-f0-9]{64}$/i.test(env.APP_KEY || '')) throw Error('Cần ADMIN_PASSWORD và APP_KEY hợp lệ.');
mkdirSync(directory, { recursive: true });
const registry = new DatabaseSync(resolve(directory, 'profiles.db'));
registry.exec('CREATE TABLE IF NOT EXISTS profiles(id TEXT PRIMARY KEY, token TEXT UNIQUE NOT NULL, legacy INTEGER NOT NULL DEFAULT 0)');
type Profile = { id: string; token: string; legacy: number };
if (existsSync(resolve(directory, 'subai.db')) && !registry.prepare('SELECT id FROM profiles WHERE legacy=1').get()) {
  const old = new DatabaseSync(resolve(directory, 'subai.db'), { readOnly: true });
  const row = old.prepare("SELECT v FROM settings WHERE k='token'").get() as { v: string } | undefined;
  if (row) registry.prepare('INSERT INTO profiles VALUES(?,?,1)').run(randomBytes(24).toString('hex'), row.v);
  old.close();
}
const apps = new Map<string, ReturnType<typeof createApp>>();
function application(profile: Profile) {
  let pending = apps.get(profile.id);
  if (!pending) {
    pending = createApp({ ...env, PUBLIC_PROFILES: "1", DATA_DIR: profile.legacy ? directory : resolve(directory, 'profiles', profile.id), DEMO_MODE: '0', OPENSUBTITLES_API_KEY: profile.legacy ? env.OPENSUBTITLES_API_KEY : '' });
    apps.set(profile.id, pending);
    pending.catch(() => apps.delete(profile.id));
  }
  return pending;
}
const gateway = Fastify({ logger: false, bodyLimit: 3_000_000, routerOptions: { maxParamLength: 4096 } });
gateway.removeAllContentTypeParsers();
gateway.addContentTypeParser('*', { parseAs: 'buffer' }, (_, body, done) => done(null, body));
const landing = `<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SubAI Movies</title>${themeInit}<style>${theme}body{max-width:720px;min-height:100vh;margin:0 auto;padding:32px 20px 48px;background:var(--bg)}
.utilities{justify-content:flex-end;gap:10px;margin-bottom:24px}
.utilities>button,.utilities #language-toggle{width:42px;height:42px;min-height:42px;flex:0 0 42px;padding:8px;margin:0}
h1{margin-bottom:24px}
.profile-card{padding:clamp(20px,4vw,32px);border:1px solid var(--line);border-radius:16px;background:var(--panel)}
.profile-card h2{margin-bottom:12px}
.profile-card p{line-height:1.65;color:var(--muted);overflow-wrap:anywhere}
.profile-card label{margin:20px 0 8px;font-size:.93rem}
.profile-card input{margin:0;min-height:46px}
.profile-card #create,.profile-card #restore{width:100%;min-height:46px;margin-top:18px;background:var(--mint);color:#07261f;font-weight:600;border-color:transparent}
.profile-card #create:hover,.profile-card #restore:hover{filter:brightness(.95)}
.profile-card #restore-heading{border-top:1px solid var(--line);padding-top:24px;margin-top:28px}
.profile-card #message{color:#ffb4b4;margin-top:16px}
.profile-card #message:empty{display:none}
[data-theme=light] .profile-card #message{color:#ae253b}
@media(max-width:480px){body{padding:20px 16px 32px}.utilities{margin-bottom:20px}}
</style><div class="utilities">${languageControl}${themeButton}</div><h1>SubAI Movies</h1><section class="profile-card"><h2>Cấu hình của bạn</h2><p>Mỗi người dùng API key và thiết lập riêng. Giữ URL cài add-on để mở lại cấu hình trên máy khác. Người có URL này có thể sử dụng và chỉnh sửa hồ sơ của bạn.</p><button id="create">Tạo cấu hình mới</button><h2 id="restore-heading">Khôi phục cấu hình</h2><label for="url">URL cài add-on đã lưu</label><input id="url" type="url" placeholder="Dán URL kết thúc bằng /manifest.json"><button id="restore">Khôi phục cấu hình</button><p id="message" role="alert" aria-live="polite"></p></section><script>${themeScript}async function openProfile(action){const button=document.getElementById(action);button.disabled=true;try{const r=await fetch('/profiles/'+action,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:document.getElementById('url').value})});const v=await r.json();if(!r.ok)throw Error(v.error);location.href='/configure';}catch(e){document.getElementById('message').textContent=e.message;}finally{button.disabled=false;}}document.getElementById('create').onclick=()=>openProfile('create');document.getElementById('restore').onclick=()=>openProfile('restore');</script><script>${languageScript}</script></html>`;
gateway.addHook('onRequest', async (req, reply) => {
  reply.header('Cache-Control', 'no-store').header('Referrer-Policy', 'no-referrer').header('X-Frame-Options', 'DENY');
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.headers.origin !== origin) return reply.code(403).send({ error: 'Origin không hợp lệ.' });
});
gateway.get('/manifest.json', async (_, reply) => {
  reply.header('Access-Control-Allow-Origin', '*');
  const manifest = addonManifest(origin + '/logo.png', true);
  const signature = env.STREMIO_ADDONS_CLAIM_SIGNATURE?.trim();
  if (!signature) return manifest;
  return {
    ...manifest,
    stremioAddonsConfig: { issuer: 'https://stremio-addons.net', signature },
  };
});
gateway.get('/logo.png', async (_, reply) => reply.type('image/png').header('Cache-Control', 'public, max-age=86400').send(addonLogo));

gateway.post('/profiles/:action', async (req, reply) => {
  const { action } = req.params as { action: string };
  let profile: Profile | undefined;
  if (action === 'create') {
    const count = registry.prepare('SELECT count(*) n FROM profiles').get() as { n: number };
    if (count.n >= Number(env.MAX_PROFILES || 100)) return reply.code(503).send({ error: 'Máy chủ đã đạt giới hạn hồ sơ.' });
    profile = { id: randomBytes(24).toString('hex'), token: randomBytes(24).toString('hex'), legacy: 0 };
    const folder = resolve(directory, 'profiles', profile.id);
    mkdirSync(folder, { recursive: true });
    const db = new DatabaseSync(resolve(folder, 'subai.db'));
    db.exec('CREATE TABLE settings(k TEXT PRIMARY KEY,v TEXT NOT NULL)');
    db.prepare('INSERT INTO settings VALUES(?,?)').run('token', profile.token);
    db.prepare('INSERT INTO settings VALUES(?,?)').run('preferences', JSON.stringify({ directOnly: true, subdl: false, addons: ['os'], osAuth: false }));
    db.close();
    registry.prepare('INSERT INTO profiles VALUES(?,?,0)').run(profile.id, profile.token);
  } else if (action === 'restore') {
    try {
      const body = JSON.parse(String(req.body));
      const url = new URL(String(body.url).trim().replace(/^stremio:/, new URL(origin).protocol));
      const match = url.pathname.match(/^\/a\/([a-f0-9]{48})\/manifest.json$/);
      if (url.origin === origin && match) profile = registry.prepare('SELECT * FROM profiles WHERE token=?').get(match[1]) as Profile | undefined;
    } catch {}
    if (!profile) return reply.code(400).send({ error: 'URL không hợp lệ hoặc hồ sơ đã bị thu hồi. Hãy dùng URL của máy chủ này.' });
  } else return reply.code(404).send();
  reply.header('Set-Cookie', `subai_profile=${profile.id}; HttpOnly; SameSite=Lax; Path=/; Max-Age=31536000${origin.startsWith('https:') ? '; Secure' : ''}`);
  return { ok: true };
});
gateway.all('/*', async (req, reply) => {
  const path = req.url.split('?')[0];
  if (path === '/profiles') return reply.type('text/html').send(landing);
  const token = path.startsWith('/a/') ? path.split('/')[2] : '';
  const cookie = req.headers.cookie?.match(/(?:^|;\s*)subai_profile=([a-f0-9]{48})(?:;|$)/)?.[1];
  const profile = (token ? registry.prepare('SELECT * FROM profiles WHERE token=?').get(token) : registry.prepare('SELECT * FROM profiles WHERE id=?').get(cookie || '')) as Profile | undefined;
  if (!profile) {
    if (path === '/' || path === '/configure') return reply.type('text/html').send(landing);
    return reply.code(404).send({ error: 'Không tìm thấy hồ sơ. Mở /configure để khôi phục.' });
  }
  if (req.method === 'GET' && token && path === '/a/' + token + '/configure') {
    reply.header('Set-Cookie', `subai_profile=${profile.id}; HttpOnly; SameSite=Lax; Path=/; Max-Age=31536000${origin.startsWith('https:') ? '; Secure' : ''}`);
    return reply.redirect('/configure');
  }
  const app = await application(profile);
  const headers = { ...req.headers, authorization: 'Basic ' + Buffer.from('admin:' + env.ADMIN_PASSWORD).toString('base64') };
  delete headers.cookie;
  const response = await app.inject({ method: req.method as any, url: req.url, headers, payload: req.body as Buffer });
  // Token rotation must invalidate the old installation URL in the public registry too.
  const db = new DatabaseSync(resolve(profile.legacy ? directory : resolve(directory, 'profiles', profile.id), 'subai.db'), { readOnly: true });
  const saved = db.prepare("SELECT v FROM settings WHERE k='token'").get() as { v: string };
  db.close();
  if (saved.v !== profile.token) registry.prepare('UPDATE profiles SET token=? WHERE id=?').run(saved.v, profile.id);
  reply.code(response.statusCode);
  for (const [name, value] of Object.entries(response.headers)) if (value !== undefined && !['content-length','connection','transfer-encoding'].includes(name)) reply.header(name, value);
  return reply.send(response.rawPayload);
});
// Reopen profiles with unfinished work so saved batches resume after a restart.
for (const profile of registry.prepare('SELECT * FROM profiles').all() as Profile[]) {
 const file = resolve(profile.legacy ? directory : resolve(directory, 'profiles', profile.id), 'subai.db');
 const db = new DatabaseSync(file, { readOnly: true });
 const hasJobs = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='jobs'").get();
 const pending = hasJobs && db.prepare('SELECT id FROM jobs WHERE result IS NULL AND error IS NULL LIMIT 1').get();
 db.close();
 if (pending) await application(profile);
}
await gateway.listen({ host: env.HOST || '127.0.0.1', port: Number(env.PORT || 7000) });
