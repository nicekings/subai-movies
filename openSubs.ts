import { createHash } from "node:crypto";
import { proLanguages } from "./proLanguages.ts";
export const proDefaults = {
  name: "OpenSubtitles V3 Pro",
  timeout: 15000,
  source: "all",
  aiTranslated: true,
  autoAdjustment: false,
  langs: [] as string[],
};
export function proSettings(input: any = {}) {
  const v = { ...proDefaults, ...input };
  if (
    typeof v.name !== "string" ||
    !v.name.trim() ||
    v.name.length > 80 ||
    !Number.isInteger(v.timeout) ||
    v.timeout < 1000 ||
    v.timeout > 60000 ||
    !["all", "trusted", "users"].includes(v.source) ||
    !Array.isArray(v.langs) ||
    v.langs.length > 10 ||
    v.langs.some((k) => !Object.hasOwn(proLanguages, k))
  )
    throw Error(
      "Kiểm tra tên nguồn, timeout (1.000–60.000 ms), bộ lọc và tối đa 10 ngôn ngữ V3 Pro.",
    );
  return {
    name: v.name.trim(),
    timeout: v.timeout,
    source: v.source,
    aiTranslated: v.aiTranslated === true,
    autoAdjustment: v.autoAdjustment === true,
    langs: [...new Set<string>(v.langs)],
  };
}
export function proManifest(
  p: ReturnType<typeof proSettings>,
  wanted: string[],
) {
  const langs = (p.langs.length ? p.langs : wanted)
    .map((k) => proLanguages[k])
    .filter(Boolean);
  if (!langs.length) throw Error("Chọn ngôn ngữ V3 Pro hỗ trợ.");
  const cfg = {
    langs,
    source: p.source,
    aiTranslated: p.aiTranslated,
    autoAdjustment: p.autoAdjustment,
  };
  return (
    "https://opensubtitlesv3-pro.dexter21767.com/" +
    Buffer.from(JSON.stringify(cfg)).toString("base64") +
    "/manifest.json"
  );
}
type Credentials = { user: string; password: string; apiKey: string };
const origin = "https://api.opensubtitles.com";
async function request(
  host: string,
  path: string,
  c: Credentials,
  token: string,
  body?: any,
) {
  const r = await fetch(host + "/api/v1/" + path, {
    method: body ? "POST" : "GET",
    redirect: "error",
    headers: {
      "Api-Key": c.apiKey,
      "User-Agent": "SubAI Movies v1.0",
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) throw Error("OpenSubtitles HTTP " + r.status);
  return r.json();
}
let current:
  | {
      id: string;
      until: number;
      login: Promise<{ token: string; host: string }>;
    }
  | undefined;
export function session(c: Credentials, force = false) {
  if (!c.user || !c.password || !c.apiKey)
    throw Error(
      "OpenSubtitles Auth cần username, password và API key ứng dụng.",
    );
  const id = createHash("sha256").update(JSON.stringify(c)).digest("hex");
  if (!force && current?.id === id && current.until > Date.now())
    return current.login;
  const login = request(origin, "login", c, "", {
    username: c.user,
    password: c.password,
  })
    .then((r) => {
      if (typeof r.token !== "string" || !r.token)
        throw Error("OpenSubtitles không trả token đăng nhập.");
      const h = r.base_url || "api.opensubtitles.com";
      if (!["api.opensubtitles.com", "vip-api.opensubtitles.com"].includes(h))
        throw Error("Máy chủ OpenSubtitles không hợp lệ.");
      return { token: r.token, host: "https://" + h };
    })
    .catch((e) => {
      if (current?.login === login) current = undefined;
      throw e;
    });
  current = { id, until: Date.now() + 20 * 60000, login };
  return login;
}
async function account(c: Credentials, path: string, body?: any) {
  const s = await session(c);
  try {
    return await request(s.host, path, c, s.token, body);
  } catch (e) {
    if (e.message !== "OpenSubtitles HTTP 401") throw e;
    const t = await session(c, true);
    return request(t.host, path, c, t.token, body);
  }
}
export async function authSearch(
  c: Credentials,
  id: string,
  type: string,
  wanted: string[],
  extra: string,
) {
  const [tt, season, episode] = id.split(":"),
    q = new URLSearchParams({ languages: [...wanted].sort().join(",") });
  if (type === "series") {
    q.set("parent_imdb_id", tt.slice(2));
    q.set("season_number", season);
    q.set("episode_number", episode);
  } else q.set("imdb_id", tt.slice(2));
  const hash = new URLSearchParams(extra).get("videoHash");
  if (hash && /^[a-f0-9]{16}$/i.test(hash)) q.set("moviehash", hash);
  const r = await account(c, "subtitles?" + q);
  return (r.data || []).flatMap((row) => {
    const a = row.attributes;
    return wanted.includes(a?.language)
      ? (a.files || [])
          .filter((f) => Number.isSafeInteger(f.file_id) && f.file_id > 0)
          .map((f) => ({
            lang: a.language,
            rel: String(f.file_name || a.release || f.file_id).slice(0, 160),
            url: "osauth:" + f.file_id,
          }))
      : [];
  });
}
export async function authDownload(c: Credentials, id: string) {
  const d = await account(c, "download", {
      file_id: Number(id),
      sub_format: "srt",
    }),
    u = new URL(d.link);
  if (
    u.protocol !== "https:" ||
    !/(^|\.)opensubtitles\.(com|org)$/i.test(u.hostname)
  )
    throw Error("Link tải OpenSubtitles không hợp lệ.");
  const r = await fetch(u, {
    redirect: "error",
    signal: AbortSignal.timeout(20000),
  });
  if (!r.ok || !r.body) throw Error("Tải phụ đề OpenSubtitles thất bại.");
  let size = 0;
  const chunks = [];
  for await (const part of r.body) {
    size += part.byteLength;
    if (size > 2_000_000) throw Error("Tệp phụ đề quá lớn.");
    chunks.push(part);
  }
  return Buffer.concat(chunks).toString("utf8");
}
