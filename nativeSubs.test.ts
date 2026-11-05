import test from "node:test";
import assert from "node:assert/strict";
import { zipSync, strToU8 } from "fflate";
import { catalogOptions, searchSS, downloadSS } from "./nativeSubs.ts";

test("SubSource uses its key, language and accessibility filters, and retrieves the exact episode", async (t) => {
  const key = "fixture-only";
  const archive = zipSync({
    "Show.S01E01.srt": strToU8("episode one"),
    "Show.S01E02.srt": strToU8("episode two"),
  });
  t.mock.method(
    globalThis,
    "fetch",
    async (input: string, opts: RequestInit) => {
      const u = new URL(input);
      assert.equal(u.hostname, "api.subsource.net");
      assert.equal(new Headers(opts.headers).get("X-API-Key"), key);
      if (u.pathname.endsWith("/download"))
        return new Response(Buffer.from(archive));
      if (u.pathname.endsWith("/movies/search")) {
        assert.equal(u.searchParams.get("season"), "1");
        return Response.json({
          success: true,
          data: [{ movieId: 3, imdbId: "tt123", season: 1 }],
        });
      }
      assert.equal(u.searchParams.get("language"), "vietnamese");
      assert.equal(u.searchParams.get("hearingImpaired"), "true");
      return Response.json({
        success: true,
        data: [
          {
            subtitleId: 10,
            language: "vietnamese",
            releaseInfo: ["Show.S01E02.WEB"],
            productionType: "translated",
          },
          {
            subtitleId: 11,
            language: "vietnamese",
            releaseInfo: ["Show.S01E01.WEB"],
            productionType: "translated",
          },
          {
            subtitleId: 12,
            language: "vietnamese",
            releaseInfo: ["Show.S01E02.WEB"],
            productionType: "machine",
          },
        ],
      });
    },
  );
  const opts = catalogOptions("ss", { types: ["translated"], hi: "only" });
  const [result, ...rest] = await searchSS(
    key,
    "tt123:1:2",
    "series",
    ["vi"],
    opts,
  );
  assert.deepEqual(rest, []);
  assert.equal(result.url, "ssapi:10");
  assert.equal(
    await downloadSS(key, result.url, "tt123:1:2", 3000),
    "episode two",
  );
  await assert.rejects(downloadSS(key, result.url, "tt123:1:3", 3000));
});
