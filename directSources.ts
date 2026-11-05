import { createHash } from "node:crypto";
import { subtitleText } from "./providers.ts";
import { languages } from "./preferences.ts";
export const directSources = {
  os: {
    name: "OpenSubtitles V3",
    host: "opensubtitles-v3.strem.io",
    custom: false,
  },
  pro: {
    name: "OpenSubtitles V3 Pro",
    host: "opensubtitlesv3-pro.dexter21767.com",
    custom: true,
  },
  ss: {
    name: "SubSource Subtitles",
    host: "subsource.strem.top",
    custom: true,
  },
  sense: { name: "SubSense", host: "subsense.nepiraw.com", custom: true },
};
export function manifestFor(k: string, value: string) {
  const source = directSources[k];
  const u = new URL(
    (value || "https://" + source.host + "/manifest.json").replace(
      /^stremio:/i,
      "https:",
    ),
  );
  if (
    u.protocol !== "https:" ||
    u.host !== source.host ||
    u.username ||
    u.password ||
    !u.pathname.endsWith("/manifest.json") ||
    u.hash
  )
    throw Error("Link manifest không hợp lệ cho " + source.name + ".");
  return u;
}
async function read(url: URL, timeout = 6500) {
  const signal = AbortSignal.timeout(timeout);
  const allowed = new Set([url.host]);
  if (url.host === directSources.pro.host)
    allowed.add("opensubtitles.stremio.homes");
  for (let n = 0; n < 4; n++) {
    const r = await fetch(url, { redirect: "manual", signal });
    if (r.status >= 300 && r.status < 400 && r.headers.has("location")) {
      const next = new URL(r.headers.get("location"), url);
      if (
        next.protocol !== "https:" ||
        next.username ||
        next.password ||
        !allowed.has(next.host)
      )
        throw Error("Chuyển hướng nguồn phụ đề không hợp lệ.");
      url = next;
      continue;
    }
    if (!r.ok) throw Error("HTTP " + r.status);
    return r.json();
  }
  throw Error("Quá nhiều lần chuyển hướng.");
}
export async function verifyManifest(k: string, value: string, timeout = 6500) {
  const m = await read(manifestFor(k, value), timeout).catch(() => {
    throw Error("Không đọc được manifest của " + directSources[k].name + ".");
  });
  if (
    !m.resources?.some((x) => (x.name ?? x) === "subtitles") ||
    m.behaviorHints?.configurationRequired
  )
    throw Error(
      "Cần link manifest phụ đề đã cấu hình cho " + directSources[k].name + ".",
    );
}
export async function directTracks(
  k: string,
  manifest: string,
  type: string,
  id: string,
  extra: string,
  wanted: string[],
  opts?: { name: string; timeout: number },
) {
  const u = manifestFor(k, manifest),
    args = new URLSearchParams();
  for (const [n, v] of new URLSearchParams(extra))
    if (["filename", "videoHash", "videoSize"].includes(n)) args.set(n, v);
  u.pathname = u.pathname.replace(
    /manifest\.json$/,
    "subtitles/" +
      type +
      "/" +
      encodeURIComponent(id) +
      (args.size ? "/" + args.toString() : "") +
      ".json",
  );
  const data = await read(u, opts?.timeout);
  if (!Array.isArray(data.subtitles)) throw Error("Sai định dạng phụ đề.");
  return data.subtitles.flatMap((t) => {
    const raw = String(t.lang || "").toLowerCase(),
      l = languages.find((x) =>
        [x.code, x.iso, x.bibliographic, x.en.toLowerCase()].includes(
          raw === "pob" ? "pt" : raw,
        ),
      );
    if (
      !l ||
      !wanted.includes(l.code) ||
      typeof t.url !== "string" ||
      !/^https:\/\//i.test(t.url)
    )
      return [];
    const release = String(
        t.movieReleaseName || t.subtitleFileName || t.label ||
          (k === "pro"
            ? String(t.id || "")
                .split("|")
                .at(2)
            : "") ||
          "",
      ).slice(0, 130),
      label =
        "[Có sẵn] " +
        l.name +
        " · " +
        (opts?.name || directSources[k].name) +
        (release ? " · " + release : "");
    return [
      {
        id:
          label +
          " · " +
          createHash("sha256").update(t.url).digest("hex").slice(0, 10),
        label,
        release,
        lang: l.iso,
        url: t.url,
      },
    ];
  });
}

export async function downloadV3(url: string) {
  const signal = AbortSignal.timeout(30000);
  for (let i=0;i<4;i++) {
    const u = new URL(url);
    if (u.protocol !== 'https:' || u.username || u.password || u.port || !/^(subs[0-9]*\.strem\.io|opensubtitles-v3\.strem\.io)$/.test(u.hostname)) throw Error('Địa chỉ tải OpenSubtitles V3 không hợp lệ.');
    const r = await fetch(u, {redirect:'manual', signal});
    if (r.status>=300 && r.status<400 && r.headers.has('location')) {url=new URL(r.headers.get('location'),u).href;continue;}
    if (!r.ok) throw Error('OpenSubtitles V3 HTTP '+r.status);
    return subtitleText(r);
  }
  throw Error('OpenSubtitles V3 chuyển hướng quá nhiều.');
}
