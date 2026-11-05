import { language } from "./preferences.ts";
import { subtitleText } from "./providers.ts";

export const subTypes = ["translated", "retail", "machine", "forced"];
export function catalogOptions(provider: "subdl" | "ss", input: any = {}) {
  const name = String(
    input.name ?? (provider === "ss" ? "SubSource" : "SubDL"),
  ).trim();
  const timeout = Number(input.timeout ?? 30000);
  const langs: string[] = input.langs ?? [],
    hi = input.hi ?? "include";
  const types: string[] = input.types ?? subTypes;
  if (
    !name ||
    name.length > 80 ||
    !Number.isInteger(timeout) ||
    timeout < 1000 ||
    timeout > 60000
  )
    throw Error("Tên nguồn hoặc thời gian chờ không hợp lệ (1.000–60.000 ms).");
  if (
    !Array.isArray(langs) ||
    langs.some((x) => !language(x)) ||
    !["include", "exclude", "only"].includes(hi)
  )
    throw Error("Bộ lọc ngôn ngữ hoặc phụ đề khiếm thính không hợp lệ.");
  if (
    !Array.isArray(types) ||
    !types.length ||
    types.some((x) => !subTypes.includes(x))
  )
    throw Error("Chọn ít nhất một loại phụ đề SubSource hợp lệ.");
  return {
    name,
    timeout,
    langs: [...new Set(langs)],
    hi,
    types: [...new Set(types)],
  };
}
async function request(path: string, key: string, signal: AbortSignal) {
  const r = await fetch("https://api.subsource.net/api/v1" + path, {
    headers: { "X-API-Key": key },
    redirect: "error",
    signal,
  });
  if (!r.ok) throw Error("SubSource HTTP " + r.status);
  return r;
}
async function rows(path: string, key: string, signal: AbortSignal) {
  const data = await (await request(path, key, signal)).json();
  if (!data.success || !Array.isArray(data.data))
    throw Error("SubSource trả về dữ liệu không hợp lệ.");
  return data.data as any[];
}
export async function checkSS(key: string, timeout: number) {
  await rows(
    "/movies/search?searchType=imdb&imdb=tt0133093&type=movie",
    key,
    AbortSignal.timeout(timeout),
  );
}
function episodePattern(season: string, episode: string) {
  return new RegExp(
    "(?:\\b|_)(?:s0*" +
      Number(season) +
      "[ ._-]*e0*" +
      Number(episode) +
      "|0*" +
      Number(season) +
      "x0*" +
      Number(episode) +
      ")(?!\\d)",
    "i",
  );
}
export async function searchSS(
  key: string,
  id: string,
  type: string,
  wanted: string[],
  opts: ReturnType<typeof catalogOptions>,
) {
  const signal = AbortSignal.timeout(opts.timeout);
  const [imdb, season, episode] = id.split(":");
  const params = new URLSearchParams({ searchType: "imdb", imdb, type });
  if (season) params.set("season", season);
  const titles = await rows("/movies/search?" + params, key, signal);
  const title = titles.find(
    (x) =>
      x.imdbId === imdb && (!season || Number(x.season) === Number(season)),
  );
  if (!title) return [];
  return (
    await Promise.all(
      wanted.map(async (lang) => {
        const slug = language(lang)!.en.toLowerCase();
        const query = new URLSearchParams({
          movieId: String(title.movieId),
          language: slug,
          limit: "100",
          sort: "popular",
        });
        if (opts.hi !== "include")
          query.set("hearingImpaired", String(opts.hi === "only"));
        return (await rows("/subtitles?" + query, key, signal)).flatMap(
          (row) => {
            if (
              !/^\d+$/.test(String(row.subtitleId)) ||
              String(row.language).toLowerCase() !== slug
            )
              return [];
            const raw = String(row.productionType || "").toLowerCase();
            const kind = row.foreignParts === true ? "forced" : raw;
            // Imported entries often lack production metadata. Keep them under the default selection.
            if (
              kind
                ? !opts.types.includes(kind)
                : opts.types.length < subTypes.length
            )
              return [];
            const releases = Array.isArray(row.releaseInfo)
              ? row.releaseInfo
              : [row.releaseInfo];
            const release = releases
              .filter(
                (x) =>
                  typeof x === "string" &&
                  (!season || episodePattern(season, episode).test(x)),
              )
              .join(" · ");
            if (season && !release) return [];
            return [
              {
                lang,
                release: (release || "SubSource #" + row.subtitleId).slice(
                  0,
                  160,
                ),
                url: "ssapi:" + row.subtitleId,
              },
            ];
          },
        );
      }),
    )
  ).flat();
}
export async function downloadSS(
  key: string,
  marker: string,
  media: string,
  timeout: number,
) {
  const id = marker.slice(6);
  if (!/^\d+$/.test(id)) throw Error("Mã phụ đề SubSource không hợp lệ.");
  const [, season, episode] = media.split(":");
  return subtitleText(
    await request(
      "/subtitles/" + id + "/download",
      key,
      AbortSignal.timeout(timeout),
    ),
    season ? episodePattern(season, episode) : undefined,
  );
}
