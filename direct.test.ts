import test from "node:test";
import assert from "node:assert/strict";
import { providerModels, translate } from "./providers.ts";
test("direct providers authenticate catalogs and translate a numbered cue", async (t) => {
  for (const [provider, host, id] of [
    ["openai", "api.openai.com", "gpt-test"],
    ["gemini", "generativelanguage.googleapis.com", "gemini-test"],
    ["claude", "api.anthropic.com", "claude-test"],
    ["grok", "api.x.ai", "grok-test"],
    ["mistral", "api.mistral.ai", "mistral-test"],
  ])
    await t.test(provider, async (ctx) => {
      const rows = [{ id: 1, text: "Xin chào" }];
      ctx.mock.method(globalThis, "fetch", async (url: string, opts: any) => {
        assert.equal(new URL(url).hostname, host);
        assert.ok(
          Object.values(opts.headers).some((v) =>
            String(v).includes("sample-key"),
          ),
        );
        if (opts.method === "GET") {
          return Response.json(
            provider === "gemini"
              ? {
                  models: [
                    {
                      name: "models/" + id,
                      supportedGenerationMethods: ["generateContent"],
                    },
                  ],
                }
              : { data: [{ id, capabilities: { completion_chat: true } }] },
          );
        }
        const payload = JSON.parse(opts.body);
        assert.equal(payload.model, id);
        assert.equal(
          new URL(url).pathname.endsWith(
            provider === "claude" ? "/messages" : "/chat/completions",
          ),
          true,
        );
        const answer = JSON.stringify({ rows });
        return Response.json(
          provider === "claude"
            ? { content: [{ type: "text", text: answer }] }
            : { choices: [{ message: { content: answer } }] },
        );
      });
      assert.deepEqual(await providerModels(provider, "sample-key", "json"), [
        id,
      ]);
      assert.deepEqual(
        await translate(
          "sample-key",
          id,
          [{ id: 1, start: "", end: "", text: "Hello" }],
          "en",
          "vi",
          provider,
        ),
        rows,
      );
    });
});

test('all translation providers preserve cue IDs and timestamps in JSON and XML', async t => {
  const { merge } = await import('./subs.ts');
  const cues = [
    { id: 7, start: '00:01:00,100', end: '00:01:02,900', text: 'Hello & goodbye' },
    { id: 8, start: '00:01:04,000', end: '00:01:06,000', text: 'See you soon.' },
  ];
  for (const provider of ['or','ds','openai','gemini','claude','grok','mistral','google','custom']) {
    for (const workflow of ['json','xml']) await t.test(provider+' '+workflow, async ctx => {
      ctx.mock.method(globalThis, 'fetch', async (url: string, options: any) => {
        const body = JSON.parse(options.body);
        const texts = ['Xin chào & tạm biệt', 'Hẹn gặp lại.'];
        if (provider === 'google') {
          assert.deepEqual(body.q, cues.map(c => c.text));
          return Response.json({data:{translations:texts.map(translatedText=>({translatedText}))}});
        }
        assert.equal(body.model,'chosen-model');
        if (provider === 'custom') {
          assert.equal(String(url),'http://local.test/v1/chat/completions');
          assert.equal(options.headers.Authorization, undefined);
          assert.equal(body.response_format,undefined);
        }
        if (workflow === 'xml') assert.equal(body.response_format,undefined);
        const answer = workflow === 'json'
          ? JSON.stringify({rows: cues.map((c,i)=>({id:c.id,text:texts[i]}))})
          : '<subs><cue id="7">Xin chào &amp; tạm biệt</cue><cue id="8">Hẹn gặp lại.</cue></subs>';
        const wrapped = '```'+workflow+'\n'+answer+'\n```';
        return Response.json(provider === 'claude'
          ? {content:[{type:'text',text:wrapped}],stop_reason:'end_turn'}
          : {choices:[{message:{content:wrapped},finish_reason:'stop'}]});
      });
      const result = merge(cues, await translate(provider==='custom'?'':'sample-key','chosen-model',cues,'en','vi',provider,workflow,'http://local.test/v1'));
      assert.deepEqual(result.map(c=>[c.id,c.start,c.end]), cues.map(c=>[c.id,c.start,c.end]));
      assert.equal(result[0].text,'Xin chào & tạm biệt');
    });
  }
});

test('models exclude incompatible endpoints and paginate Claude catalog', async t => {
 await t.test('OpenAI chat compatibility', async ctx => {
  const ids=['gpt-4o','gpt-5','o3-mini','o1-pro','o3-pro-2025-06-10','gpt-5-pro','gpt-5.2-pro','gpt-image-1','o1-mini','gpt-4o-audio-preview'];
  ctx.mock.method(globalThis,'fetch',async()=>Response.json({data:ids.map(id=>({id}))}));
  assert.deepEqual(await providerModels('openai','key','json'),['gpt-4o','gpt-5','o3-mini']);
 });
 await t.test('OpenRouter text output', async ctx => {
  ctx.mock.method(globalThis,'fetch',async(url:string)=>Response.json({data:String(url).endsWith('/key')?{}:[
    {id:'text',architecture:{output_modalities:['text']},supported_parameters:['structured_outputs']},
    {id:'image',architecture:{output_modalities:['image']},supported_parameters:['structured_outputs']},
    {id:'xml-text',architecture:{output_modalities:['text']},supported_parameters:[]}
  ]}));
  assert.deepEqual(await providerModels('or','key','json'),['text']);
  assert.deepEqual(await providerModels('or','key','xml'),['text','xml-text']);
 });
 await t.test('Claude pagination', async ctx => {
  let calls=0;
  ctx.mock.method(globalThis,'fetch',async(url:string)=>{
   calls++;
   return Response.json(new URL(url).searchParams.has('after_id')
    ? {data:[{id:'claude-b'},{id:'claude-retired',lifecycle:'retired'}],has_more:false}
    : {data:[{id:'claude-a'}],has_more:true,last_id:'claude-a'});
  });
  assert.deepEqual(await providerModels('claude','key','json'),['claude-a','claude-b']);assert.equal(calls,2);
 });
});

test('empty, truncated, refused and malformed AI replies fail clearly', async t => {
 const cues=[{id:1,start:'00:00:01,000',end:'00:00:02,000',text:'Hello'}];
 for(const [name,response,expected] of [
  ['empty',{choices:[{message:{content:null}}]},/nội dung trống/],
  ['whitespace',{choices:[{message:{content:'   '}}]},/nội dung trống/],
  ['truncated',{choices:[{message:{content:'{"rows":[]}'},finish_reason:'length'}]},/giới hạn token/],
  ['refused',{choices:[{message:{content:null,refusal:'refused'}}]},/từ chối/],
  ['bad-json',{choices:[{message:{content:'{incomplete'}}]},/JSON không hợp lệ/],
  ['missing-rows',{choices:[{message:{content:'{"text":"Hello"}'}}]},/không có danh sách/],
 ] as const) await t.test(name,async ctx=>{
  ctx.mock.method(globalThis,'fetch',async()=>Response.json(response));
  await assert.rejects(translate('key','model',cues,'en','vi','ds'),expected);
 });
 const {merge}=await import('./subs.ts');
 assert.throws(()=>merge(cues,[null]),/ID/);
 assert.throws(()=>merge(cues,[{id:9,text:'wrong'}]),/ID/);
 assert.throws(()=>merge([...cues,{...cues[0],id:2}],[{id:1,text:'a'},{id:1,text:'b'}]),/trùng ID/);
});
