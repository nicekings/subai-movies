import test from "node:test";
import assert from "node:assert/strict";
import {
  authSearch,
  authDownload,
  proSettings,
  proManifest,
} from "./openSubs.ts";
import { directTracks } from "./directSources.ts";
test("Pro config and delegated subtitle endpoint", async (t) => {
  const p = proSettings({
      langs: ["vi"],
      source: "trusted",
      autoAdjustment: true,
      aiTranslated: false,
      name: "Nguồn riêng",
    }),
    url = proManifest(p, ["en"]);
  const cfg = JSON.parse(
    Buffer.from(new URL(url).pathname.split("/")[1], "base64").toString(),
  );
  assert.deepEqual(cfg, {
    langs: ["vietnamese"],
    source: "trusted",
    aiTranslated: false,
    autoAdjustment: true,
  });
  t.mock.method(globalThis, "fetch", async (u) =>
    new URL(u).host.startsWith("opensubtitlesv3-")
      ? new Response(null, {
          status: 302,
          headers: { location: "https://opensubtitles.stremio.homes/test" },
        })
      : Response.json({
          subtitles: [{ lang: "vie", url: "https://example.org/a.srt" }],
        }),
  );
  assert.match(
    (await directTracks("pro", url, "movie", "tt1", "", ["vi"], p))[0].label,
    /Nguồn riêng/,
  );
});
test("Auth searches exact episode and downloads only the selected file", async (t) => {
  const c = { user: "fixture", password: "private-test", apiKey: "test-key" },
    paths = [];
  t.mock.method(globalThis, "fetch", async (u, o) => {
    const url = new URL(u);
    paths.push(url.pathname);
    if (url.pathname.endsWith("/login")) {
      assert.deepEqual(JSON.parse(o.body), {
        username: c.user,
        password: c.password,
      });
      return Response.json({
        token: "test-jwt",
        base_url: "vip-api.opensubtitles.com",
      });
    }
    if (url.pathname === "/test.srt") {
      assert.equal(o.headers, undefined);
      return new Response("Hello");
    }
    assert.equal(url.host, "vip-api.opensubtitles.com");
    assert.equal(o.headers.Authorization, "Bearer test-jwt");
    if (url.pathname.endsWith("/subtitles")) {
      assert.equal(url.searchParams.get("episode_number"), "3");
      return Response.json({
        data: [
          {
            attributes: {
              language: "vi",
              files: [{ file_id: 123, file_name: "WEB-DL" }],
            },
          },
        ],
      });
    }
    assert.equal(JSON.parse(o.body).file_id, 123);
    return Response.json({ link: "https://www.opensubtitles.com/test.srt" });
  });
  const rows = await authSearch(c, "tt42:2:3", "series", ["vi"], "");
  assert.equal(rows[0].url, "osauth:123");
  assert.equal(paths.length, 2);
  assert.equal(await authDownload(c, "123"), "Hello");
});
