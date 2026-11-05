import { languages, services, modelServices } from "./preferences.ts";
export function checkButton(id: string, name: string) {
  return (
    '<button type="button" id="check-' +
    id +
    '" aria-label="Kiểm tra ' +
    name +
    '">Kiểm tra</button><output role="status" aria-live="polite" id="status-' +
    id +
    '"></output>'
  );
}
export function controls(p: any, keyPreviews: Record<string, string>) {
  const options = (value: string) =>
    Object.entries(services)
      .map(
        ([k, n]) =>
          '<option value="' +
          k +
          '" ' +
          (value === k ? "selected" : "") +
          ">" +
          n +
          "</option>",
      )
      .join("");
  const customPanel = `<div id="panel-custom" ${p.main === "custom" || p.others.includes("custom") ? "" : "hidden"}>
    <label>URL API<input type=url id=custom-endpoint placeholder="http://localhost:11434/v1" autocomplete=off></label>
    <label>API key (tùy chọn)<input data-api-key type=password id=custom autocomplete=off placeholder="${keyPreviews.custom || "Để trống nếu máy chủ không yêu cầu key"}"></label>
    <label id=custom-clear-label class=source-toggle hidden><input type=checkbox id=custom-clear>Bỏ API key đã lưu</label>
    <div class=custom-model-row><label>Tên model<input id=model-custom placeholder="Ví dụ: llama3:8b" autocomplete=off></label>
    ${checkButton("custom", "Custom Provider")}</div>
    <label>Thời gian chờ mỗi yêu cầu (giây)<input id=custom-timeout type=number min=60 max=300 step=1 required value="${p.customTimeout}"></label>
    <small>Mặc định 60 giây. Có thể tăng đến 300 giây cho model chạy chậm.</small>
    <small>Nhập tên model đang chạy trên Ollama, LM Studio hoặc API tương thích OpenAI. Nút Kiểm tra gửi một câu dịch thử.</small></div>`;
  const panel = (k: string, n: string) =>
    k === "custom"
      ? customPanel
      : '<div id="panel-' +
        k +
        '"' +
        (k === p.main || p.others.includes(k) ? "" : " hidden") +
        "><label>API key " +
        n +
        '<input data-api-key type="password" id="' +
        k +
        '" autocomplete="off" data-saved="' +
        Number(Boolean(keyPreviews[k])) +
        '" placeholder="' +
        (keyPreviews[k] || "Nhập hoặc dán API key") +
        '"></label>' +
        checkButton(k, n) +
        (k === "google"
          ? "<small>Google Cloud Translation Basic dịch trực tiếp.</small>"
          : '<div class="model-row"><label>Tìm model<input type="search" disabled id="filter-' +
            k +
            '" placeholder="Lọc theo tên model"></label><label>Model ' +
            n +
            '<select id="model-' +
            k +
            '" disabled><option>Nhập API key để tải model</option></select></label></div>') +
        "</div>";
  function picker(k: string, title: string, max: number) {
    return `<section class="language-card" aria-labelledby="heading-${k}"><h3 id="heading-${k}">${title}</h3>
      <button type="button" class="open-picker" id="open-${k}" aria-expanded="false" aria-controls="editor-${k}"></button>
      <div class="lang-editor" id="editor-${k}" hidden><small>Đã chọn <span id="total-${k}"></span> · Tối đa ${max} tiếng</small>
      <div class="chosen-langs" id="chips-${k}"></div>
      <label for="find-${k}">Tìm ngôn ngữ</label><input type=search id="find-${k}" placeholder="Nhập tên hoặc mã">
      <div class="lang-options" id="list-${k}"></div></div></section>`;
  }
  return {
    providers: options(p.main),
    panels:
      '<div id="main-panel">' +
      panel(p.main, services[p.main]) +
      "</div>" +
      '<fieldset class="other-providers"><legend>Nhà cung cấp khác</legend><small>Chọn thêm hãng muốn dùng. Nếu nhà dịch chính gặp lỗi, nhóm câu đó sẽ được thử lại lần lượt theo thứ tự bên dưới. Kéo vùng tên nhà cung cấp hoặc dùng nút mũi tên để đổi ưu tiên, rồi bấm Lưu cấu hình.</small><p id="provider-priority" aria-live="polite"></p>' +
      Object.entries(services)
        .map(
          ([k, n]) =>
            `<div id="other-row-${k}" class="other-row" ${k === p.main ? "hidden" : ""}><div class="provider-heading" data-drag="${k}"><label class="source-toggle"><input id="other-${k}" type=checkbox aria-controls="panel-${k}" ${p.others.includes(k) ? "checked" : ""}>${n}</label><div id="order-${k}" class="provider-order" hidden><button type="button" data-provider="${k}" data-move="-1" aria-label="Ưu tiên ${n} cao hơn" title="Đưa lên">↑</button><button type="button" data-provider="${k}" data-move="1" aria-label="Ưu tiên ${n} thấp hơn" title="Đưa xuống">↓</button></div></div>${k === p.main ? "" : panel(k, n)}</div>`,
        )
        .join("") +
      "</fieldset>",
    langs:
      '<div class="language-pair">' +
      picker("sources", "Ngôn ngữ nguồn (phụ đề gốc)", 3) +
      picker("targets", "Ngôn ngữ muốn xem (có sẵn và dịch AI)", 6) +
      "</div>",
  };
}
export function setup(p: any) {
  return (
    "const langs=" +
    JSON.stringify(languages) +
    ",prefs=" +
    JSON.stringify(p).replaceAll("<", "\\u003c") +
    ";" +
    `
el('workflow').value=prefs.workflow;el('batch-context').checked=prefs.batchContext;
function scopeLanguages(){
 const only=el('direct-only').checked,global=prefs.targets;
 for(const k of ['subdl','ss']){
  const names=global.map(code=>langs.find(l=>l.code===code).name).join(', ');
  const hint=names?'Phụ đề có sẵn: '+names+'.':'Không hiển thị phụ đề có sẵn từ nguồn này.';
  el(k+'-effective').textContent=hint;
  el(k+'-ai-source').textContent=only?'Đang tắt dịch AI.':'Theo mục Dịch từ: '+prefs.sources.map(code=>langs.find(l=>l.code===code).name).join(', ')+'.';
 }
}
function paint(k,max){
 scopeLanguages();
 const selected=prefs[k], search=el('find-'+k), query=search.value.trim().toLowerCase();
 const chosen=el('chips-'+k), choices=el('list-'+k),toggle=el('open-'+k);
 el('total-'+k).textContent=selected.length+' / '+max;
 toggle.textContent=selected.map(code=>{const l=langs.find(l=>l.code===code);return l.name+' ('+l.en+')'}).join(', ')||'Chọn ngôn ngữ';
 chosen.replaceChildren();
 for(const code of selected){
   const name=langs.find(l=>l.code===code).name,b=document.createElement('button');
   b.type='button';b.className='selected-lang';b.textContent=name+'  ×';b.setAttribute('aria-label','Bỏ '+name);
   b.onclick=()=>{prefs[k]=selected.filter(x=>x!==code);paint(k,max);toggle.focus()};chosen.append(b)
 }
 if(!selected.length)chosen.textContent='Chọn ít nhất một ngôn ngữ.';
 choices.replaceChildren();
 if(el('editor-'+k).hidden)return;
 if(selected.length>=max){choices.textContent='Đã chọn đủ '+max+' ngôn ngữ. Bỏ một lựa chọn ở trên để thêm tiếng khác.';return}
 for(const l of langs.filter(l=>!selected.includes(l.code)&&[l.name,l.en,l.iso,l.code].join(' ').toLowerCase().includes(query))){
   const b=document.createElement('button');b.type='button';b.textContent='+ '+l.name+' · '+l.iso.toUpperCase();b.onclick=()=>{prefs[k]=[...selected,l.code];search.value='';paint(k,max);search.focus()};choices.append(b)
 }
 if(!choices.childElementCount)choices.textContent='Không tìm thấy ngôn ngữ phù hợp.'
}
for(const [k,max] of [['sources',3],['targets',6]]){
 const toggle=el('open-'+k),editor=el('editor-'+k),search=el('find-'+k);
 toggle.onclick=()=>{editor.hidden=!editor.hidden;toggle.setAttribute('aria-expanded',String(!editor.hidden));search.value='';paint(k,max);if(!editor.hidden)search.focus()};
 search.oninput=()=>paint(k,max);editor.onkeydown=e=>{if(e.key==='Escape'){toggle.click();toggle.focus()}};
 paint(k,max)
}
const modelKeys=${JSON.stringify(modelServices)}, providerKeys=${JSON.stringify(Object.keys(services))};
let providerOrder=[...prefs.others,...providerKeys.filter(k=>!prefs.others.includes(k))];
const otherProviders=()=>providerOrder.filter(k=>k!==el('main').value&&el('other-'+k).checked);
function renderPriority(){
 const selected=otherProviders(),container=document.querySelector('.other-providers');
 for(const k of [...selected,...providerOrder.filter(k=>!selected.includes(k))]){
  container.append(el('other-row-'+k));const actions=el('order-'+k),index=selected.indexOf(k);
  actions.hidden=index<0;const heading=actions.parentElement;heading.draggable=index>=0;heading.title=index>=0?'Kéo để đổi thứ tự ưu tiên':'';actions.querySelector('[data-move="-1"]').disabled=index<=0;
  actions.querySelector('[data-move="1"]').disabled=index<0||index===selected.length-1;
 }
 const names=${JSON.stringify(services)};
 el('provider-priority').textContent='Thứ tự dịch: '+[el('main').value,...selected].map(k=>names[k]).join(' → ');
}
for(const button of document.querySelectorAll('[data-move]'))button.onclick=()=>{
 const selected=otherProviders(),key=button.dataset.provider,index=selected.indexOf(key),next=index+Number(button.dataset.move);
 if(index<0||next<0||next>=selected.length)return;
 const a=providerOrder.indexOf(key),b=providerOrder.indexOf(selected[next]);
 [providerOrder[a],providerOrder[b]]=[providerOrder[b],providerOrder[a]];renderPriority();
 const enabledButton=el('order-'+key).querySelector('[data-move]:not(:disabled)');if(enabledButton)enabledButton.focus();
};
let draggedProvider='';
for(const handle of document.querySelectorAll('[data-drag]')){
 handle.ondragstart=event=>{if(event.target.closest('input,button')){event.preventDefault();return;}handle.classList.add('dragging');draggedProvider=handle.dataset.drag;event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',draggedProvider)};
 handle.ondragend=()=>{handle.classList.remove('dragging');draggedProvider='';for(const row of document.querySelectorAll('.other-row'))row.style.outline=''};
}
for(const k of providerKeys){
 const row=el('other-row-'+k);
 row.ondragover=event=>{if(draggedProvider&&draggedProvider!==k&&otherProviders().includes(k)){event.preventDefault();event.dataTransfer.dropEffect='move';row.style.outline='2px solid #9ce2ce'}};
 row.ondragleave=event=>{if(!row.contains(event.relatedTarget))row.style.outline=''};
 row.ondrop=event=>{
  row.style.outline='';if(!draggedProvider||draggedProvider===k||!otherProviders().includes(k))return;
  event.preventDefault();const source=providerOrder.indexOf(draggedProvider),target=providerOrder.indexOf(k);
  providerOrder.splice(source,1);providerOrder.splice(target,0,draggedProvider);draggedProvider='';renderPriority();
 };
}
const active=k=>!el('direct-only').checked&&(k===el('main').value||el('other-'+k).checked);
const timers={},seq=Object.fromEntries(modelKeys.map(k=>[k,0])),choices={};
function filterModels(k){const q=el('filter-'+k).value.trim().toLowerCase(),ms=choices[k].filter(m=>m.toLowerCase().includes(q));el('model-'+k).replaceChildren(new Option('Chọn model…',''),...ms.map(m=>new Option(m,m,false,m===prefs[k+'Model'])));el('model-'+k).disabled=!ms.length}
function errorText(message){
 if(/HTTP 401\\b|INVALID_API_KEY/.test(message))return 'Khóa API không hợp lệ - xác thực thất bại';
 if(/HTTP 403\\b/.test(message))return 'Dịch vụ từ chối quyền truy cập (403). Kiểm tra quyền của key.';
 if(/HTTP 429\\b/.test(message))return 'Đã đạt giới hạn yêu cầu (429). Kiểm tra hạn mức hoặc thử lại sau.';
 if(/HTTP 5[0-9]{2}\\b/.test(message))return 'Dịch vụ tạm thời gặp lỗi. Vui lòng thử lại sau.';
 return message;
}
const feedbackTimers=new WeakMap();
function feedback(node,state,message=''){
 clearTimeout(feedbackTimers.get(node));
 if(state==='success'&&(node.id.startsWith('status-')||node.id==='installmsg'))feedbackTimers.set(node,setTimeout(()=>{node.textContent='';delete node.dataset.state;feedbackTimers.delete(node)},6000));
 node.dataset.state=state;
 const prefix={success:'✓ ',error:'⚠ Lỗi: ',pending:'◷ ',hint:'',idle:''};
 node.textContent=prefix[state]+(state==='error'?errorText(message):message);
 if(node.id.startsWith('status-')&&el(node.id.slice(7))){
  const field=el(node.id.slice(7));field.setAttribute('aria-describedby',node.id);
  const invalid=state==='error'&&/401|INVALID_API_KEY|nhập.*key/i.test(message);
  field.setAttribute('aria-invalid',String(invalid));
  field.dataset.state=invalid?'error':state==='success'?'success':'idle';
 }
}
function load(k,manual=false){
 choices[k]=[];el('filter-'+k).disabled=true;
 const field=el(k),box=el('model-'+k),status=el('status-'+k),id=++seq[k];
 clearTimeout(timers[k]);feedback(status,'idle');
 box.replaceChildren(new Option('Đang tải model…',''));box.disabled=true;
 if(!active(k))return;
 if(!field.value.trim()&&field.dataset.saved!=='1'){
  box.replaceChildren(new Option('Nhập API key để tải model',''));
  if(manual)feedback(status,'error','Nhập API key để tải danh sách model.');
  return;
 }
 if(manual)feedback(status,'pending','Đang kiểm tra và tải model…');
 timers[k]=setTimeout(async()=>{
  try{
   const r=await api('models',{provider:k,key:field.value.trim(),workflow:el('workflow').value});
   if(seq[k]!==id)return;
   choices[k]=r.models;if(!r.models.includes(prefs[k+'Model']))prefs[k+'Model']='';
   el('filter-'+k).disabled=false;filterModels(k);
   if(manual)feedback(status,'success','Đã kết nối · '+r.models.length+' model khả dụng.');
  }catch(e){
   if(seq[k]!==id)return;
   box.replaceChildren(new Option('Chưa tải được model · bấm Kiểm tra',''));
   if(manual)feedback(status,'error',e.message);
  }
 },manual?0:450);
}
function workflowHelp(){
 const select=el('workflow');
 el('workflow-help').textContent=select.disabled?'Google Cloud Translate nhận văn bản trực tiếp, nên bạn không cần chọn định dạng.':select.value==='json'?'Phù hợp cho hầu hết phim. Mỗi câu có một mã để ứng dụng ghép lời dịch vào đúng mốc thời gian của bản gốc.':'Dùng XML nếu model thường trả JSON sai định dạng. Ứng dụng vẫn kiểm tra mã từng câu và giữ mốc thời gian gốc.';
}
const enabled=new Set();
function panels(){
 const main=el('main').value;
 for(const k of providerKeys){
  const primary=k===main, row=el('other-row-'+k),field=el('panel-'+k), checkbox=el('other-'+k);
  if(primary)checkbox.checked=false;
  row.hidden=primary;
  const eye=field.querySelector('.api-eye');
  if(eye){eye.hidden=!primary;if(!primary&&eye.getAttribute('aria-pressed')==='true')eye.click()}

  const parent=primary?el('main-panel'):row;
  if(field.parentNode!==parent)parent.append(field);
  const on=active(k);
  field.hidden=!on;
  if(on!==enabled.has(k)){
    if(on)enabled.add(k);else enabled.delete(k);
    if(modelKeys.includes(k))load(k);
  }
 }
 renderPriority();
 el('workflow').disabled=!active('custom')&&!modelKeys.some(active);el('batch-context').disabled=el('workflow').disabled;workflowHelp()
}
for(const k of providerKeys)el('other-'+k).onchange=panels;
for(const k of modelKeys){el('filter-'+k).oninput=()=>filterModels(k);el(k).oninput=()=>load(k);el('model-'+k).onchange=()=>prefs[k+'Model']=el('model-'+k).value}
el('workflow').onchange=()=>{workflowHelp();load('or')};el('main').onchange=panels;
el('custom-endpoint').value=prefs.customEndpoint;
el('model-custom').value=prefs.customModel;
const storedCustomPreview=el('custom').hasAttribute('data-has-preview')?el('custom').placeholder:'';
let customRevision=0;
function customChanged(){
 const key=el('custom'), sameServer=el('custom-endpoint').value.trim()===prefs.customEndpoint;
 el('custom-clear-label').hidden=!storedCustomPreview||!sameServer;
 if(!sameServer)el('custom-clear').checked=false;
 key.disabled=el('custom-clear').checked;
 if(key.disabled){key.value='';key.dispatchEvent(new Event('change'))}
 key.placeholder=sameServer&&!key.disabled&&storedCustomPreview?storedCustomPreview:'Để trống nếu máy chủ không yêu cầu key';
 customRevision++;el('check-custom').disabled=false;feedback(el('status-custom'),'idle')
}
for(const id of ['custom-endpoint','custom','custom-clear','model-custom','custom-timeout','workflow'])el(id).addEventListener('input',customChanged);
customChanged();
el('check-custom').onclick=async()=>{
 if(!el('custom-timeout').reportValidity())return;
 const version=++customRevision,status=el('status-custom'),button=el('check-custom');
 button.disabled=true;feedback(status,'pending','Đang dịch thử một câu…');
 try{await api('check',{provider:'custom',customTimeout:el('custom-timeout').valueAsNumber,endpoint:el('custom-endpoint').value,model:el('model-custom').value,key:el('custom').value,clearCustomKey:el('custom-clear').checked,workflow:el('workflow').value});
 if(version===customRevision)feedback(status,'success','Model đã trả về bản dịch thử.')}
 catch(e){if(version===customRevision)feedback(status,'error',e.message)}
 finally{if(version===customRevision)button.disabled=false}
};
const nativeIds=['os','pro','ss','sense'];
const osCredentials=()=>({user:el('os-user').value,password:el('os-password').value,apiKey:el('os-apiKey').value});
function openSubsFields(){el('os-account').hidden=!el('os-auth').checked;el('pro-manual-fields').hidden=!el('pro-manual').checked;for(const id of ['pro-source','pro-langs','pro-ai','pro-hash'])el(id).disabled=el('pro-manual').checked}
for(const id of ['os-auth','os-v3','pro-manual'])el(id).onchange=openSubsFields;
let authVersion=0;
for(const id of ['os-user','os-password','os-apiKey'])el(id).addEventListener('input',()=>{authVersion++;feedback(el('status-osauth'),'idle');el('check-osauth').disabled=false});
el('check-osauth').onclick=async()=>{const status=el('status-osauth'),button=el('check-osauth'),v=++authVersion;button.disabled=true;feedback(status,'pending','Đang kiểm tra…');try{await api('check',{provider:'osauth',os:osCredentials()});if(v===authVersion)feedback(status,'success','Đã đăng nhập OpenSubtitles.')}catch(e){if(v===authVersion)feedback(status,'error',e.message)}finally{if(v===authVersion)button.disabled=false}};
const sourceNames={subdl:'SubDL',ss:'SubSource',osauth:'OpenSubtitles Auth',os:'OpenSubtitles V3'};
let sourceOrder=[...prefs.aiSourceOrder,...Object.keys(sourceNames).filter(k=>!prefs.aiSourceOrder.includes(k))], sourceSelected=new Set(prefs.aiSourceOrder), sourceDrag='';
el('ai-source-mode').value=prefs.aiSourceMode;
function sourceAvailable(k){
 if(k==='os'||k==='osauth'){const enabled=el('use-os').checked&&((k==='osauth')===el('os-auth').checked);return enabled&&(k==='os'||['os-user','os-password'].every(id=>!!(el(id).value||el(id).placeholder)))}
 const input=el(k==='subdl'?'sub':'ss');return el('use-'+k).checked&&!!(input.value||input.placeholder.includes('•'));
}
function drawAISources(){
 const custom=el('ai-source-mode').value==='custom', list=el('ai-source-list');list.replaceChildren();el('ai-source-settings').hidden=el('direct-only').checked;
 for(const k of custom?sourceOrder:Object.keys(sourceNames)){
  const row=document.createElement('div');row.className='provider-heading ai-source-row';row.draggable=custom;
  const label=document.createElement('label');label.className='source-toggle';const check=document.createElement('input');check.type='checkbox';check.checked=custom?sourceSelected.has(k):sourceAvailable(k);check.disabled=!custom||!sourceAvailable(k);check.onchange=()=>{check.checked?sourceSelected.add(k):sourceSelected.delete(k)};label.append(check,document.createTextNode(' '+sourceNames[k]));
  const status=document.createElement('small');status.textContent=sourceAvailable(k)?(k==='os'?'Không cần API key':'Sẵn sàng'):'Chưa bật hoặc thiếu thông tin kết nối';row.append(label,status);
  const move=(offset)=>{const i=sourceOrder.indexOf(k),j=i+offset;if(j<0||j>=sourceOrder.length)return;[sourceOrder[i],sourceOrder[j]]=[sourceOrder[j],sourceOrder[i]];drawAISources()};
  for(const [offset,text] of [[-1,'↑'],[1,'↓']]){const button=document.createElement('button');button.type='button';button.textContent=text;button.setAttribute('aria-label',sourceNames[k]+' '+(offset<0?'↑':'↓'));button.disabled=!custom||sourceOrder.indexOf(k)+offset<0||sourceOrder.indexOf(k)+offset>=sourceOrder.length;button.onclick=()=>move(offset);row.append(button)}
  row.ondragstart=e=>{if(e.target.closest('input,button')){e.preventDefault();return}sourceDrag=k;row.classList.add('dragging');e.dataTransfer.setData('text/plain',k)};row.ondragend=()=>{sourceDrag='';row.classList.remove('dragging')};row.ondragover=e=>{if(custom)e.preventDefault()};row.ondrop=e=>{e.preventDefault();if(!custom||!sourceDrag||sourceDrag===k)return;sourceOrder.splice(sourceOrder.indexOf(sourceDrag),1);sourceOrder.splice(sourceOrder.indexOf(k),0,sourceDrag);sourceDrag='';drawAISources()};list.append(row);
 }
}
el('ai-source-mode').onchange=drawAISources;
for(const k of ['sub','ss'])el(k).addEventListener('input',drawAISources);
function updateSources(){openSubsFields();scopeLanguages();drawAISources();
 const only=el('direct-only').checked;
 el('ai-fields').hidden=only;el('key-hint').hidden=!only;
 el('settings').hidden=only;el('heading-sources').closest('section').hidden=only;
 panels()
}
for(const id of ['direct-only','use-subdl',...nativeIds.map(k=>'use-'+k)])el(id).onchange=updateSources;
updateSources();
const catalog=k=>({name:el(k+'-name').value,timeout:Number(el(k+'-timeout').value),hi:el(k+'-hi').value,langs:[],...(k==='ss'?{types:Array.from(el('ss-types').selectedOptions,o=>o.value)}:{})});
for(const edit of document.querySelectorAll('[data-edit]')){
 const dlg=el('dialog-'+edit.dataset.edit),fields=Array.from(dlg.querySelectorAll('input,select'));
 let before=[];
 edit.onclick=()=>{before=fields.map(x=>x.multiple?Array.from(x.options,o=>o.selected):['checkbox','radio'].includes(x.type)?x.checked:x.value);dlg.showModal()};
 const close=apply=>{
  if(apply){for(const x of fields)if(!x.reportValidity())return}
  else fields.forEach((x,i)=>{if(x.multiple)Array.from(x.options).forEach((o,j)=>o.selected=before[i][j]);else if(['radio','checkbox'].includes(x.type))x.checked=before[i];else x.value=before[i];x.dispatchEvent(new Event('input'))});
  for(const b of dlg.querySelectorAll('.key-eye[aria-pressed=true]'))b.click();
  openSubsFields();scopeLanguages();drawAISources();dlg.close();edit.focus();
 };
 dlg.oncancel=e=>{e.preventDefault();close(false)};
 for(const b of dlg.querySelectorAll('[data-dismiss]'))b.onclick=()=>close(false);
 dlg.querySelector('[data-apply]').onclick=()=>close(true);
}
const keys=()=>({custom:el('custom').value,clearCustomKey:el('custom-clear').checked,ss:el('ss').value,native:{subdl:catalog('subdl'),ss:catalog('ss')},os:el('use-os').checked&&el('os-auth').checked?osCredentials():{},pro:{name:el('pro-name').value,timeout:Number(el('pro-timeout').value),source:el('pro-source').value,aiTranslated:el('pro-ai').checked,autoAdjustment:el('pro-hash').checked,langs:Array.from(el('pro-langs').selectedOptions,o=>o.value)},proManual:el('pro-manual').checked,proOverride:el('pro-override').value,manifests:Object.fromEntries(nativeIds.filter(k=>el('manifest-'+k)).map(k=>[k,el('manifest-'+k).value])),...Object.fromEntries(modelKeys.map(k=>[k,el(k).value])),google:el('google').value,sub:el('sub').value,model:prefs.orModel || '',preferences:{aiSourceMode:el('ai-source-mode').value,aiSourceOrder:sourceOrder.filter(k=>sourceSelected.has(k)),batchContext:el('batch-context').checked,customTimeout:active('custom')?el('custom-timeout').valueAsNumber:prefs.customTimeout,customModel:el('model-custom').value,customEndpoint:el('custom-endpoint').value,sources:prefs.sources,targets:prefs.targets,osAuth:el('os-auth').checked,subdl:el('use-subdl').checked,directOnly:el('direct-only').checked,addons:nativeIds.filter(k=>el('use-'+k).checked),main:el('main').value,others:otherProviders(),workflow:el('workflow').value,...Object.fromEntries(modelKeys.map(k=>[k+'Model',prefs[k+'Model'] || '']))}});
function action(id,fn,output='msg'){el(id).onclick=async()=>{const b=el(id);b.disabled=true;feedback(el(output),'pending','Đang xử lý…');try{await fn()}catch(e){feedback(el(output),'error',e.message)}finally{b.disabled=false}}}
for(const k of modelKeys)el('check-'+k).onclick=()=>load(k,true);
for(const k of ['sub','ss','google']){
 let revision=0;
 const field=el(k),status=el('status-'+k),button=el('check-'+k);
 field.addEventListener('input',()=>{revision++;feedback(status,'idle');button.disabled=false});
 button.onclick=async()=>{
  const check=++revision;button.disabled=true;feedback(status,'pending','Đang kiểm tra…');
  try{await api('check',{provider:k,key:field.value.trim(),options:k==='google'?undefined:catalog(k==='sub'?'subdl':'ss')});if(check===revision)feedback(status,'success','Đã kết nối '+(k==='sub'?'SubDL':k==='ss'?'SubSource':'Google Cloud Translate')+'.')}
  catch(e){if(check===revision)feedback(status,'error',e.message)}
  finally{if(check===revision)button.disabled=false}
 }
}
action('save',async()=>{await api('save',keys());location.reload()},'modelmsg');
`
  );
}
