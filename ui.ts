import { guide } from './guide.ts';
import { languageControl, languageScript } from './localization.ts';
import { theme, icon, themeInit, themeButton, themeScript } from "./appearance.ts";
import { proLanguages } from "./proLanguages.ts";
import { directSources } from "./directSources.ts";
import { controls, setup, checkButton } from "./controls.ts";
import { languages } from "./preferences.ts";
const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => "&#" + c.charCodeAt(0) + ";");
export function keyPreview(key: string) {
  if (!key) return "";
  return key.length >= 12
    ? key.slice(0, 4) + "••••••••" + key.slice(-4)
    : "••••••••";
}
export function page(
  root: string,
  model: string,
  demo: boolean,
  prefs: any,
  keyPreviews: Record<string, string>,
  saved: Record<string, boolean>,
) {
  const url = esc(root + "/manifest.json");
  if (!prefs.orModel && !demo && prefs.main === "or") prefs.orModel = model;
  const c = controls(
    prefs,
    Object.fromEntries(
      Object.entries(keyPreviews).map(([id, preview]) => [id, esc(preview)]),
    ),
  );
  const available = Boolean(model || prefs.directOnly);
  const switchRow = (id: string, title: string, on: boolean) =>
    '<label class="source-toggle"><input type="checkbox" id="' +
    id +
    '" ' +
    (on ? "checked" : "") +
    ">" +
    title +
    "</label>";
  const pro = prefs.pro;
  const placeholder = (k: string) =>
    saved[k] ? "Đã lưu · để trống để dùng lại" : "";
  const authForm = `<div id="setup-os"><fieldset><legend>Cách kết nối OpenSubtitles</legend>
  <label class="source-toggle"><input type=radio name=os-mode id=os-v3 ${prefs.osAuth ? "" : "checked"}>V3 · dùng ngay</label>
  <label class="source-toggle"><input type=radio name=os-mode id=os-auth ${prefs.osAuth ? "checked" : ""}>Auth · dùng tài khoản OpenSubtitles.com</label></fieldset>
  <div id=os-account><label>Username<input id=os-user autocomplete=off placeholder="${placeholder("osUser")}"></label><label>Password<input id=os-password type=password autocomplete=off placeholder="${placeholder("osPassword")}"></label>
  <label>OpenSubtitles API key<input data-api-key type=password id=os-apiKey autocomplete=off placeholder="${esc(keyPreviews["os-apiKey"]) || "Nhập API key"}"></label><small>Auth dùng API key ứng dụng cùng tài khoản. Chủ máy có thể đặt OPENSUBTITLES_API_KEY trên máy chủ.</small>
  ${checkButton("osauth", "OpenSubtitles Auth")}</div></div>`;
  const proForm = `<div id=setup-pro><label>Tên hiển thị<input id=pro-name maxlength=80 value="${esc(pro.name)}"></label>
  <label>Thời gian chờ (ms)<input id=pro-timeout type=number min=1000 max=60000 value="${pro.timeout}"></label>
  <small>Tài nguyên: Phụ đề (subtitles)</small>
  <label>Ngôn ngữ V3 Pro<select id=pro-langs multiple size=5>${languages
    .filter((l) => proLanguages[l.code])
    .map(
      (l) =>
        '<option value="' +
        l.code +
        '" ' +
        (pro.langs.includes(l.code) ? "selected" : "") +
        ">" +
        esc(l.name) +
        "</option>",
    )
    .join("")}</select></label>
  <small>Để trống để theo mục Ngôn ngữ của add-on, hoặc chọn tối đa 10 tiếng. Trình phát chỉ hiện các tiếng đã bật trong mục Ngôn ngữ.</small>
  <label>Nguồn đăng<select id=pro-source>${[
    ["all", "Tất cả"],
    ["trusted", "Người đăng đáng tin cậy"],
    ["users", "Người dùng"],
  ]
    .map(
      ([v, n]) =>
        '<option value="' +
        v +
        '" ' +
        (v === pro.source ? "selected" : "") +
        ">" +
        n +
        "</option>",
    )
    .join("")}</select></label>
  ${switchRow("pro-ai", "Bao gồm phụ đề đã được nguồn dịch bằng AI", pro.aiTranslated)}
  ${switchRow("pro-hash", "Dùng hash phim và tự điều chỉnh thời gian tại nguồn", pro.autoAdjustment)}
  ${switchRow("pro-manual", "Nâng cao · ghi đè URL manifest", saved.proManual)}
  <div id=pro-manual-fields><label>URL manifest V3 Pro<input type=password id=pro-override placeholder="Dán URL mới hoặc dùng URL ghi đè đã lưu"></label><small>Khi ghi đè URL, nguồn dùng ngôn ngữ và bộ lọc trong link đó.</small></div></div>`;
  function catalogForm(k: "subdl" | "ss") {
    const opts = prefs.native[k],
      id = k === "subdl" ? "sub" : "ss",
      name = k === "subdl" ? "SubDL" : "SubSource";
    const option = (value: string, label: string, selected: boolean) =>
      `<option value="${esc(value)}" ${selected ? "selected" : ""}>${esc(label)}</option>`;
    return `<label>Tên hiển thị<input required maxlength=80 id="${k}-name" value="${esc(opts.name)}"></label>
      <label>API key ${name}<input data-api-key type=password autocomplete=off id="${id}" placeholder="${esc(keyPreviews[id]) || "Nhập key " + name}"></label>
      ${k === "ss" && saved.legacySS ? "<small>Đang dùng liên kết cũ. Nhập API key và lưu cấu hình để chuyển sang kết nối trực tiếp.</small>" : ""}
      ${checkButton(id, name)}
      <label>Thời gian chờ (ms)<input id="${k}-timeout" type=number required min=1000 max=60000 value="${opts.timeout}"></label>
      <label>Phụ đề có sẵn muốn hiển thị</label>
      <small id="${k}-effective" aria-live=polite></small>
      <label>Nguồn dịch AI</label><small id="${k}-ai-source" aria-live=polite></small>
      <small>Thiết lập ở mục Ngôn ngữ → Dịch từ. Phụ đề nguồn chỉ dùng để dịch, không hiện riêng trên trình phát trừ khi bạn cũng chọn ngôn ngữ đó để xem.</small>
      <label>Phụ đề dành cho người khiếm thính<select id="${k}-hi">${[
        ["include", "Bao gồm"],
        ["exclude", "Loại trừ"],
        ["only", "Chỉ lấy loại này"],
      ]
        .map(([v, n]) => option(v, n, opts.hi === v))
        .join("")}</select></label>
      ${
        k === "ss"
          ? '<label>Loại phụ đề<select id="ss-types" multiple size=4 required>' +
            [
              ["translated", "Bản dịch"],
              ["retail", "Bản phát hành chính thức"],
              ["machine", "Dịch máy / AI"],
              ["forced", "Chỉ dịch lời ngoại ngữ (forced)"],
            ]
              .map(([v, n]) => option(v, n, opts.types.includes(v)))
              .join("") +
            "</select></label>"
          : ""
      }`;
  }
  const senseForm = `<label>Link manifest SubSense đã cấu hình<input type=password id=manifest-sense autocomplete=off placeholder="Dán link mới hoặc để trống để dùng lại"></label><a class="source-config-link" href="https://${directSources.sense.host}/configure" target="_blank" rel="noreferrer">Cấu hình SubSense</a>`;
  const nativePanel =
    switchRow(
      "direct-only",
      "Chỉ xem phụ đề có sẵn (không dùng AI)",
      prefs.directOnly,
    ) +
    "<p>Các nguồn đều tùy chọn. OpenSubtitles V3 dùng ngay ở chế độ V3. SubDL và SubSource cần API key khi bật. Chọn biểu tượng bút để chỉnh sửa từng nguồn.</p>" +
    [
      ["subdl", "SubDL", catalogForm("subdl")],
      ["ss", "SubSource", catalogForm("ss")],
      ["os", directSources.os.name, authForm],
      ["pro", directSources.pro.name, proForm],
      ["sense", directSources.sense.name, senseForm],
    ]
      .map(
        ([k, name, form]) =>
          `<div class="provider-row"><strong>${name}</strong>
    <input type=checkbox role=switch class="provider-switch" aria-label="Bật ${name}" id="use-${k}" ${(k === "subdl" ? prefs.subdl : prefs.addons.includes(k)) ? "checked" : ""}>
    <button type=button class="edit-source" aria-label="Chỉnh sửa ${name}" title="Chỉnh sửa ${name}" data-edit="${k}"><svg viewBox="0 0 24 24" width=19 height=19 fill="none" stroke="currentColor" stroke-width=1.8 aria-hidden=true><path d="m14 5 5 5M4 20l5-1L21 7a2 2 0 0 0-5-5L4 15z"/></svg></button></div>
    <dialog id="dialog-${k}" aria-labelledby="dialog-title-${k}"><div class=modal-head><h2 id="dialog-title-${k}">Chỉnh sửa ${name}</h2><button type=button data-dismiss aria-label="Đóng">×</button></div><div class=modal-body>${form}</div>
    <div class=modal-foot><small>Bấm Lưu cấu hình trên trang chính để lưu thay đổi.</small><button type=button data-dismiss>Hủy</button><button type=button data-apply>Áp dụng</button></div></dialog>`,
      )
      .join("") +
    `<small>Tệp phụ đề riêng luôn dùng được.</small>
    <details id="ai-source-settings"><summary>Nguồn phụ đề gốc để dịch AI</summary>
    <label>Chế độ chọn nguồn<select id="ai-source-mode"><option value="auto">Tự động</option><option value="custom">Tùy chỉnh</option></select></label>
    <p class="group-note">Chỉ dùng nguồn đã bật và đủ thông tin kết nối. Ưu tiên tên bản phát hành khớp; nếu tương đương thì theo ngôn ngữ nguồn và thứ tự bên dưới. Tệp riêng luôn dùng được. Không ảnh hưởng phụ đề có sẵn.</p>
    <div id="ai-source-list"></div><small>Kéo hàng hoặc dùng nút mũi tên để đổi ưu tiên, rồi bấm Lưu cấu hình.</small>
    </details>`;
  const group = (
    id: string,
    symbol: string,
    title: string,
    desc: string,
    content: string,
    open = false,
  ) => `<details class="config-group" id="${id}" ${open ? "open" : ""}><summary>${icon(symbol)}<b>${title}</b></summary><div class="inner">${desc ? '<p class="group-note">'+desc+'</p>' : ""}${content}</div></details>`;
  const langOptions = languages
    .map(
      (l) =>
        '<option value="' +
        l.code +
        '" ' +
        (l.code === "en" ? "selected" : "") +
        ">" +
        esc(l.name) +
        "</option>",
    )
    .join("");
  return `<!doctype html><html lang="vi"><meta charset=utf-8><meta name=viewport content="width=device-width"><title>SubAI Movies</title>${themeInit}<style>${theme}</style><body data-view="config">
<header class=mast><div class="brand">${icon("film")}<strong>SubAI Movies</strong><svg class=wave viewBox="0 0 110 36" aria-hidden=true>${[3,5,8,4,12,7,16,25,11,32,18,9,13,6,4,6,3].map((h,i)=>'<path d="M'+(4+i*6)+' '+(18-h/2)+'v'+h+'"/>').join("")}</svg></div>
<div class=utilities>${languageControl}${themeButton}${saved.multiProfile ? '<button type="button" id="open-restore" aria-haspopup="dialog">Khôi phục cấu hình</button>' : ""}<button id=open-device title="Liên kết thiết bị" aria-label="Liên kết thiết bị">${icon("link")}<span>Liên kết thiết bị</span></button><button id=jump-settings title="Mở cài đặt" aria-label="Mở cài đặt">${icon("settings")}</button></div></header>
<nav class=nav aria-label="Điều hướng quản lý">${[["config","settings","Cấu hình"],["activity","layers","Tiến độ dịch"],["uploads","upload","Phụ đề của tôi"],["guide","book","Hướng dẫn"]].map(([id,symbol,title])=>`<a href="#${id}" data-nav="${id}" ${id==="config"?'aria-current="page"':""}>${icon(symbol)}${title}</a>`).join("")}</nav>
<main class=workspace><div id=config><h1>Cấu hình phụ đề</h1>${demo ? '<p class=group-note>Đang dùng bản thử The Matrix (1999). Lưu cấu hình để bật dịch thật.</p>' : ""}
${group("native", "download", "Nguồn phụ đề", "Subtitles API Keys", nativePanel)}
${group("connect", "ai", "API dịch AI", "AI Translation API Keys", "<div id=ai-fields><label>Nhà dịch chính<select id=main>" + c.providers + "</select></label>" + c.panels + "</div><small id=key-hint hidden>Đang ở chế độ chỉ xem phụ đề có sẵn. Tắt chế độ này trong Subtitles API Keys để cấu hình dịch AI.</small>", false)}
${group("langs", "globe", "Ngôn ngữ", "", c.langs, true)}
${group("settings", "sliders", "Cài đặt dịch", "Chọn cách gửi lời thoại cho model AI.", "<label>Định dạng gửi cho AI<select id=workflow aria-describedby=workflow-help><option value=json>JSON theo ID (khuyên dùng)</option><option value=xml>Thẻ XML</option></select></label><small id=workflow-help aria-live=polite></small><details><summary>Nâng cao</summary><div class=inner><label class=source-toggle><input id=batch-context type=checkbox aria-describedby=context-help>Dùng ngữ cảnh từ nhóm trước</label><small id=context-help>Gửi thêm tối đa 3 câu cuối của nhóm trước cùng bản dịch để AI giữ cách xưng hô và tên riêng. Tùy chọn này dùng thêm token và chỉ áp dụng cho model AI.</small></div></details>")}
<div class=actions><button id=save>${icon("save")}Lưu cấu hình</button><a ${available ? `href="${url.replace(/^https?:/, "stremio:")}"` : 'aria-disabled="true"'}>${icon("play")}Cài vào Stremio</a><button id=copy ${available ? "" : "disabled"}>${icon("link")}Sao chép URL</button></div><output id=modelmsg></output><output id=installmsg></output></div>
<aside class=rail><section id=files class=card><h2>${icon("upload")}Thêm phụ đề thủ công</h2><form id=upload><label>IMDb<input name=media required placeholder="tt1234567 hoặc tt1234567:1:2"></label><label>Bản phát hành (tùy chọn)<input name=release maxlength=160 placeholder="Ví dụ: WEB-DL, BluRay"></label><small>Để trống để dùng tên tệp phụ đề.</small><label>Ngôn ngữ<select name=lang>${langOptions}</select></label><label>Chọn tệp SRT/VTT<span class=file-picker><span id=file-name>Chưa chọn tệp</span><span>Chọn tệp</span><input id=subtitle-file type=file name=file accept=".vtt,.srt" required></span></label><button type=submit>${icon("upload")}Tải lên phụ đề</button><output id=up></output></form></section><section id="uploads" class="card"><h2>Phụ đề của tôi</h2><label>Tìm phụ đề<input type="search" id="upload-search" placeholder="IMDb, bản phát hành hoặc ngôn ngữ"></label><p class="group-note">Gỡ tệp sẽ ẩn khỏi danh sách nguồn; bản dịch đã lưu vẫn được giữ.</p><div id="uploaded-list" aria-live="polite"></div><output id="uploadmsg" role="status"></output></section>
<section id=activity class=card><h2>${icon("sound")}Tiến độ dịch</h2><div id=jobs></div><dialog id=job-detail aria-labelledby=job-detail-title><div class=modal-head><h2 id=job-detail-title>Chi tiết tác vụ</h2><button type=button id=close-job>Đóng</button></div><div class=modal-body><p id=detail-release></p><p id=detail-config></p><p id=detail-state></p><progress id=detail-progress aria-label="Tiến độ dịch"></progress><p id=detail-count></p><p id=detail-eta></p></div></dialog><output id=jobmsg role=status></output></section>${guide}</aside></main>
${saved.multiProfile ? `<dialog id="restore-profile" aria-labelledby="restore-title"><form id="restore-form"><div class="modal-head"><h2 id="restore-title">Khôi phục cấu hình</h2><button type="button" id="close-restore" aria-label="Đóng">×</button></div><div class="modal-body"><p>Dán URL đã dùng để cài add-on để mở lại hồ sơ của bạn.</p><label for="restore-url">URL cài add-on<input id="restore-url" required autocomplete="off" spellcheck="false" placeholder="Dán URL kết thúc bằng /manifest.json"></label><small>Khi mở hồ sơ khác, những chỉnh sửa chưa lưu trên trang hiện tại sẽ mất.</small><output id="restore-message" role="alert"></output></div><div class="modal-foot"><button type="submit" id="submit-restore">Khôi phục cấu hình</button></div></form></dialog>` : ""}
<dialog id=install aria-labelledby=install-title><div class=modal-head><h2 id=install-title>Liên kết thiết bị</h2><button id=close-device aria-label="Đóng">×</button></div><div class=modal-body>${available ? '<label>URL cài add-on<input readonly id=url value="'+url+'"></label><button id=rotate>Thu hồi link</button>' : '<p>Lưu cấu hình để nhận link.</p><button hidden id=rotate></button>'}</div></dialog><script>
for(const input of document.querySelectorAll('input[type=password]')){
 const label=input.closest('label'), name=label.textContent.trim();
 if(input.hasAttribute('data-api-key')){
  const field=document.createElement('div'),prefix=document.createElement('span'),suffix=document.createElement('span');
  field.className='api-key-field';prefix.setAttribute('aria-hidden','true');suffix.setAttribute('aria-hidden','true');
  if(input.placeholder.includes('••••••••'))input.setAttribute('data-has-preview','');
  label.htmlFor=input.id;label.after(field);field.append(prefix,input,suffix);
  function updatePreview(){
   const key=input.value,showEnds=input.type==='password'&&key.length>=12;
   prefix.textContent=showEnds?key.slice(0,4):'';
   suffix.textContent=showEnds?key.slice(-4):'';
   input.style.width=showEnds?'8ch':'100%';
  }
  field.addEventListener('click',()=>input.focus());
  input.addEventListener('input',updatePreview);input.addEventListener('change',updatePreview);updatePreview();
  const eye=document.createElement('button');eye.type='button';eye.className='api-eye';eye.hidden=true;
  eye.setAttribute('aria-label','Hiện API key');eye.setAttribute('aria-pressed','false');
  eye.innerHTML='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
  eye.onclick=async()=>{
   if(input.type==='text'){input.type='password';eye.setAttribute('aria-pressed','false');eye.setAttribute('aria-label','Hiện API key');updatePreview();return}
   eye.disabled=true;const selected=document.getElementById('main').value;
   try{if(!input.value){const result=await api('reveal-key',{provider:selected});if(document.getElementById('main').value!==selected)return;input.value=result.key}
    input.type='text';eye.setAttribute('aria-pressed','true');eye.setAttribute('aria-label','Ẩn API key');updatePreview();
   }catch(error){feedback(document.getElementById('status-'+input.id),'error',error.message)}finally{eye.disabled=false}
  };field.append(eye);
  continue;
 }
 const field=document.createElement('div');field.className='key-field';
 label.htmlFor=input.id;label.after(field);field.append(input);
 const button=document.createElement('button');button.type='button';button.className='key-eye';
 button.setAttribute('aria-controls',input.id);
 button.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/><path class="slash" d="m3 3 18 18"/></svg>';
 function reveal(visible){input.type=visible?'text':'password';button.title=(visible?'Ẩn ':'Hiện ')+name;button.setAttribute('aria-label',button.title);button.setAttribute('aria-pressed',String(visible))}
 reveal(false);button.onclick=()=>reveal(input.type==='password');field.append(button);
}
for(const button of document.querySelectorAll('button[id^="check-"]')){
 const id=button.id.slice(6);
 if(id==='custom')continue;
 const input=document.getElementById(id==='osauth'?'os-apiKey':id);
 if(!input)continue;
 const field=input.closest('.api-key-field,.key-field')||input;
 const row=document.createElement('div');row.className='input-check-row';
 field.before(row);row.append(field,button);
}
${themeScript}
const el=id=>document.getElementById(id);
function setView(){
 const hash=location.hash.slice(1),view=hash.startsWith('guide')?'guide':['uploads','activity'].includes(hash)?hash:'config';
 document.body.dataset.view=view;
 if(view==='activity')refresh();if(view==='uploads')loadUploads();
 for(const link of document.querySelectorAll('[data-nav]')){
  if(link.dataset.nav===view)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
 }
}
window.addEventListener('hashchange',setView);
for(const link of document.querySelectorAll('[data-nav]'))link.onclick=e=>{
 e.preventDefault();if(location.hash!==link.hash)history.pushState(null,'',link.hash);
 setView();window.scrollTo(0,0);
};
el('subtitle-file').onchange=e=>el('file-name').textContent=e.target.files[0]?.name||'Chưa chọn tệp';
el('open-device').onclick=()=>el('install').showModal();
el('close-device').onclick=()=>el('install').close();
if(el('open-restore')){
 el('open-restore').onclick=()=>{el('restore-message').textContent='';el('restore-profile').showModal();el('restore-url').focus()};
 el('close-restore').onclick=()=>el('restore-profile').close();
 el('restore-form').onsubmit=async event=>{
  event.preventDefault();const button=el('submit-restore');button.disabled=true;
  feedback(el('restore-message'),'loading','Đang khôi phục…');
  try{
   const response=await fetch('/profiles/restore',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:el('restore-url').value.trim()})});
   const result=await response.json();if(!response.ok)throw Error(result.error||'Không thể khôi phục cấu hình.');
   location.href='/configure';
  }catch(error){feedback(el('restore-message'),'error',error.message)}finally{button.disabled=false}
 };
}
el('jump-settings').onclick=()=>{document.querySelector('[data-nav=config]').click();const group=el('settings').hidden?el('native'):el('settings');group.open=true;group.querySelector('summary').focus();group.scrollIntoView({block:'center'})};
async function api(path,data){const form=data instanceof FormData,r=await fetch('/admin/'+path,data?{method:'POST',body:form?data:JSON.stringify(data),headers:form?{}:{'Content-Type':'application/json'}}:{});const j=await r.json();if(!r.ok)throw Error(j.error||'Lỗi kết nối');return j}
${setup(prefs)}
action('copy',async()=>{await navigator.clipboard.writeText(el('url').value);feedback(el('installmsg'),'success','Đã sao chép.')},'installmsg');
action('rotate',async()=>{if(confirm('Thu hồi link trên mọi thiết bị?')){await api('rotate',{});location.reload()}else feedback(el('installmsg'),'idle')},'installmsg');el('upload').onsubmit=async e=>{e.preventDefault();try{await api('upload',new FormData(e.target));feedback(el('up'),'success','Đã thêm phụ đề.');await loadUploads()}catch(x){feedback(el('up'),'error',x.message)}};
const jobDialog=el('job-detail');
let selectedJob='',detailVersion=0;
const stateNames={queued:'Đang chờ đến lượt',preparing:'Đang tải phụ đề gốc',running:'Đang dịch',paused:'Tạm dừng · chỉ xem phụ đề có sẵn',ready:'✓ Hoàn tất',failed:'Dịch lỗi'};
const langName=code=>langs.find(l=>l.code===code)?.name||code;
function etaText(seconds){return seconds==null?'đang ước tính…':'còn khoảng '+(seconds>=60?Math.ceil(seconds/60)+' phút':seconds+' giây')}
function jobState(j){return (stateNames[j.state]||'Đang xử lý')+(j.error?' · '+j.error:'')+(j.replacing?' · Đang thay bản dịch, bản cũ vẫn xem được':'')}
async function loadDetail(){
 if(!jobDialog.open)return;
 const revision=++detailVersion;
 try{
  const d=await api('jobs/'+encodeURIComponent(selectedJob));
  if(revision!==detailVersion||!jobDialog.open)return;
  el('detail-release').textContent=d.rel;
  el('detail-config').textContent=[d.media,langName(d.src)+' → '+langName(d.dst),d.model].join(' · ');
  el('detail-state').textContent=jobState(d);
  el('detail-progress').hidden=!d.groups;
  if(d.groups){el('detail-progress').max=d.groups;el('detail-progress').value=d.step}
  el('detail-count').textContent=d.groups?'Đã lưu '+d.step+'/'+d.groups+' nhóm · '+d.completedCues+'/'+d.cues+' đoạn phụ đề':'Chưa có số nhóm.';
  el('detail-eta').textContent=d.state==='ready'?'Bạn có thể chọn lại phụ đề trong trình phát.':d.state==='queued'?'Thời gian chờ phụ thuộc tác vụ đang chạy.':d.state!=='running'?'':d.seconds==null?'Đang đo thời gian dịch mỗi nhóm…':'Ước tính '+etaText(d.seconds)+'.';
 }catch(e){if(revision===detailVersion)el('detail-state').textContent=e.message}
}
function openDetail(id){
 selectedJob=id;
 for(const key of ['release','config','count','eta'])el('detail-'+key).textContent='';
 el('detail-state').textContent='Đang tải…';el('detail-progress').hidden=true;
 jobDialog.showModal();loadDetail()
}
el('close-job').onclick=()=>jobDialog.close();
jobDialog.onclose=()=>{detailVersion++;el('view-'+selectedJob)?.focus();selectedJob=''};
async function refresh(){
 try{
  const rows=await api('jobs');
  const focused=el('jobs').contains(document.activeElement)?document.activeElement.id:'';
  el('jobs').replaceChildren(...rows.map(j=>{
   const p=document.createElement('p');
   const state=jobState(j);
   const detail=document.createElement('button');
   detail.type='button';detail.id='view-'+j.id;detail.textContent='Xem chi tiết';detail.setAttribute('aria-haspopup','dialog');detail.onclick=()=>openDetail(j.id);
   const release=document.createElement('strong'),meta=document.createElement('small'),status=document.createElement('span');
   release.textContent=j.rel;release.title=j.rel;meta.textContent=[j.media,langName(j.src)+' → '+langName(j.dst),j.model].join(' · ');
   status.className='job-state';status.dataset.phase=j.state;status.textContent=state;
   p.append(release,meta,status);
   if(j.state==='running' && j.groups>0){
    const bar=document.createElement('progress'),count=document.createElement('small');
    bar.className='job-progress';bar.max=j.groups;bar.value=j.step;bar.setAttribute('aria-label','Tiến độ dịch '+j.rel);
    count.textContent=j.step+'/'+j.groups+' nhóm · '+etaText(j.seconds);p.append(bar,count);
   }
   p.append(detail);
   if(j.error){
    const button=document.createElement('button');
    button.type='button';button.id='action-'+j.id;button.textContent='Thử lại';
    button.onclick=async()=>{
     button.disabled=true;
     try{await api('retry',{id:j.id});feedback(el('jobmsg'),'success','Đã yêu cầu thử lại.');await refresh()}
     catch(e){feedback(el('jobmsg'),'error',e.message);button.disabled=false}
    };
    p.append(button);
   }
   return p;
  }));
  if(focused)el(focused)?.focus({preventScroll:true});
  if(!rows.length)el('jobs').textContent='Chưa có tác vụ.';
 }catch(e){el('jobs').textContent=e.message}
}
async function loadUploads(){
 const list=el('uploaded-list');
 try{const items=await api('uploads');list.replaceChildren();
 if(!items.length){list.textContent='Chưa có tệp phụ đề.';return}
 const query=el('upload-search').value.trim().toLowerCase();const filtered=items.filter(item=>[item.media,item.rel,langName(item.lang)].join(' ').toLowerCase().includes(query));if(!filtered.length){list.textContent='Không có kết quả phù hợp.';return}
 for(const item of filtered){const row=document.createElement('article');row.className='uploaded-item';const title=document.createElement('strong');title.textContent=item.rel;const meta=document.createElement('small');meta.textContent=item.media+' · '+langName(item.lang);const actions=document.createElement('div');actions.className='uploaded-actions';const download=document.createElement('a');download.href='/admin/uploads/'+encodeURIComponent(item.id)+'/file';download.textContent='Tải xuống';download.download='subtitle.srt';const remove=document.createElement('button');remove.type='button';remove.textContent='Gỡ';remove.onclick=async()=>{if(!confirm('Gỡ tệp khỏi danh sách nguồn? Bản dịch đã lưu vẫn được giữ.'))return;remove.disabled=true;try{await api('uploads/remove',{id:item.id});await loadUploads()}catch(e){feedback(el('uploadmsg'),'error',e.message);remove.disabled=false}};actions.append(download,remove);row.append(title,meta,actions);list.append(row)}
 }catch(e){list.textContent='Không tải được danh sách phụ đề.'}
}
el('upload-search').oninput=()=>loadUploads();
loadUploads();
setView();setInterval(()=>{if(document.body.dataset.view==='activity'){refresh();loadDetail()}},4000)
</script><script>${languageScript}</script></html>`;
}
