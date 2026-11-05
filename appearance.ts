const paths: Record<string,string> = {
  film: '<path d="m3 7 17-5 1 4-17 5zM4 11h17v10H4z"/><path d="m7 6 3 3m3-5 3 3"/>',
  settings: '<path d="m10 3 4 0 .6 2.1 2 .9 2-.7 2 3.4-1.6 1.5v2.5l1.6 1.6-2 3.5-2.1-.6-1.9 1-.6 2.2h-4l-.6-2.2-2-1-2 .6-2-3.5 1.6-1.6v-2.5L3.4 8.7l2-3.4 2 .7 2-.9z"/><circle cx="12" cy="11.8" r="3"/>',
  link: '<path d="m10 13 4-4m-6 2-2 2a4 4 0 0 0 6 6l3-3m-1-3 3-3a4 4 0 0 0-6-6L8 7"/>',
  download:'<path d="M12 3v12m-5-5 5 5 5-5M3 16v4h18v-4"/>',
  upload:'<path d="M12 16V3m-5 5 5-5 5 5M3 15v6h18v-6"/>',
  ai:'<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 1v3m4-3v3m4-3v3M8 20v3m4-3v3m4-3v3M1 8h3m-3 4h3m-3 4h3m16-8h3m-3 4h3m-3 4h3M7 15l2.5-7 2.5 7m-4.3-2h3.6m4-5v7"/>',
  globe:'<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M4 9h16M4 15h16"/>',
  sliders:'<path d="M2 5h5m4 0h11M2 12h11m4 0h5M2 19h3m4 0h13"/><circle cx="9" cy="5" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="7" cy="19" r="2"/>',
  save:'<path d="M3 3h14l4 4v14H3zM7 3v6h9V3M7 21v-8h10v8"/>',
  play:'<path d="m6 3 14 9-14 9z"/>',
  sound:'<path d="M2 10v4m5-8v12m5-16v20m5-15v10m5-7v4"/>',
  layers:'<path d="m2 7 10-5 10 5-10 5zM2 12l10 5 10-5M2 17l10 5 10-5"/>',
};
export function icon(name:string) {
  return '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+paths[name]+'</svg>';
}
export const theme = `
:root{color-scheme:dark;font:15px/1.5 'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;--bg:#070f1e;--ink:#edf4ff;--muted:#adc2d8;--line:#38506b;--mint:#90f0cf;--panel:#122238;--field:#182c42;color:var(--ink);background:var(--bg)}
*{box-sizing:border-box}
body{margin:0 auto;max-width:1500px;min-height:100vh;padding:0 clamp(16px,2.1vw,34px) 56px;background:radial-gradient(ellipse at 38% 13%,#101e3380,transparent 66%)}
[hidden]{display:none!important}button,input,select,a{font:inherit;color:inherit}button,a{touch-action:manipulation}
button,.actions a,.modal-body a,.nav a{display:inline-flex;align-items:center;justify-content:center;gap:.6em;padding:9px 14px;border:1px solid var(--line);border-radius:8px;background:linear-gradient(155deg,#20354b,#122135);text-decoration:none;cursor:pointer}
button:hover,a:hover{border-color:#89b8cc}button:disabled,[aria-disabled=true]{opacity:.48;cursor:default}
:focus-visible{outline:2px solid var(--mint);outline-offset:3px}
.icon{width:1.35em;height:1.35em;flex:none}
h1,h2,h3,p{margin:0}h1{font-size:clamp(25px,2.2vw,32px);letter-spacing:-.025em;line-height:1.13;margin:0 0 24px}
h2{font-size:clamp(19px,1.5vw,22px);line-height:1.2}small,.group-note{display:block;color:var(--muted);font-size:.88rem}
.mast,.nav,.utilities,.brand{display:flex;align-items:center}
.mast{min-height:82px;justify-content:space-between;gap:16px;border-bottom:1px solid #25364d}
.brand{gap:12px;white-space:nowrap;font-size:clamp(23px,2vw,30px);letter-spacing:-.03em}.brand>.icon{color:#a6d4f0}.wave{width:clamp(60px,8vw,115px);height:36px;stroke:#71e5ce;stroke-width:2.2;stroke-linecap:round;margin-left:4px}
.utilities{gap:10px}.utilities button{min-height:42px}
.nav{flex-wrap:wrap;border-bottom:2px solid #5f809d;gap:9px;padding:14px 0 8px}.nav a{background:none;border-color:transparent;font-weight:600;padding:10px 20px}.nav a[aria-current]{color:#071c22;background:linear-gradient(110deg,#72d9df,#96f0ca)}
.workspace{display:grid;grid-template-columns:minmax(0,2fr) minmax(292px,1fr);align-items:start;gap:clamp(18px,2.5vw,36px);padding-top:32px}
#config,.rail{min-width:0}.rail{display:grid;gap:16px}.card,dialog,.config-group{border:1px solid var(--line);border-radius:11px;background:linear-gradient(120deg,#122136,#101d30);box-shadow:0 7px 20px #03091238}
.card{padding:clamp(16px,1.6vw,24px)}.card h2{display:flex;align-items:center;gap:12px;margin-bottom:18px}
.config-group{margin:0 0 13px}.config-group>summary{border-radius:10px;min-height:56px;padding:13px 20px;background:linear-gradient(105deg,#1b3047,#1c314a);font-size:clamp(17px,1.3vw,19px);gap:16px}
summary{display:flex;align-items:center;cursor:pointer;border-radius:inherit;list-style:none;font-weight:650}summary::-webkit-details-marker{display:none}
summary:after,.open-picker:after{content:"";width:.52em;height:.52em;flex:none;border:solid currentColor;border-width:0 2px 2px 0;transform:rotate(45deg);margin:-.25em 2px 0 auto}
details[open]>summary:after,.open-picker[aria-expanded=true]:after{transform:rotate(225deg);margin-top:.3em}
.config-group[open]>summary{border-radius:10px 10px 0 0;background:linear-gradient(100deg,#284967,#233f5d);border-bottom:1px solid var(--line)}
.inner{padding:18px 22px}.inner .group-note{margin-bottom:14px}.inner details{margin:14px 0 0}.inner details>summary{padding:10px;background:var(--field)}
label{display:block;font-weight:550;margin:12px 0}label:first-child{margin-top:0}
input,select,.api-key-field,.open-picker{display:block;width:100%;min-width:0;margin:5px 0 0;padding:10px 12px;background:var(--field);color:var(--ink);border:1px solid #5b7691;border-radius:7px;line-height:1.3}
input::placeholder{color:#a7b6c9}input:disabled,select:disabled{opacity:.65}input[type=checkbox],input[type=radio]{width:auto;accent-color:var(--mint);margin:0}
input,select{font-weight:400}
.file-picker{position:relative;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:5px 6px 5px 12px;margin-top:5px;border:1px solid #5b7691;border-radius:7px;background:var(--field);font-weight:400}
.file-picker:focus-within{outline:2px solid var(--mint)}#file-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.file-picker span:nth-child(2){padding:4px 9px;background:#304a65;border-radius:5px;white-space:nowrap}.file-picker input{position:absolute;inset:0;width:100%;height:100%;z-index:1;margin:0;padding:0;opacity:0;cursor:pointer}
fieldset{min-width:0;border:1px solid var(--line);border-radius:8px;margin:12px 0;padding:12px}
.source-toggle{display:flex;gap:10px;align-items:center}.provider-row,.chosen-heading{display:flex;align-items:center;gap:12px}.provider-row{margin:9px 0;border:1px solid var(--line);padding:9px 12px;border-radius:8px}.provider-row strong{flex:1}
.provider-row .provider-switch{appearance:none;padding:0;background:#53647a;position:relative;width:40px;height:24px;border-radius:20px;cursor:pointer}
.provider-switch:before{content:"";position:absolute;top:3px;left:3px;width:16px;height:16px;background:white;border-radius:50%}.provider-switch:checked{background:#20866c}.provider-switch:checked:before{left:19px}.edit-source{padding:7px}
.model-row,.language-pair{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(12px,2vw,28px)}.model-row{grid-template-columns:minmax(0,2fr) minmax(0,3fr);align-items:end}.model-row label{margin-top:12px}.model-row input,.model-row select{height:44px;text-overflow:ellipsis}
.language-card{min-width:0}.language-card h3{font-size:1rem;font-weight:550}.open-picker{display:flex;align-items:center;text-align:left;justify-content:space-between;min-height:44px;font-weight:500}.lang-editor{margin-top:10px}.chosen-langs,.lang-options{display:flex;flex-wrap:wrap;gap:5px}.selected-lang{background:#1b5151;border-color:#4f9292;font-size:.9rem;padding:4px 8px}.lang-options{max-height:180px;overflow:auto;margin-top:8px}.lang-options button{font-size:.9rem;padding:5px 8px}.chosen-langs{margin:8px 0}.lang-editor label{margin-bottom:2px}
.api-eye{margin-left:auto;padding:4px;border:0;background:transparent;flex:none}.api-key-field{display:flex;align-items:center;min-width:0;padding:0 12px;cursor:text}.api-key-field input{background:transparent;border:0;padding:10px 0;margin:0;outline:none}.api-key-field:focus-within{outline:2px solid var(--mint)}.api-key-field span{white-space:pre;pointer-events:none}.api-key-field input::-ms-reveal,.key-field input::-ms-reveal{display:none}
.key-field{position:relative}.key-field input{padding-right:44px}.key-eye{position:absolute;right:3px;top:50%;transform:translateY(-50%);padding:5px;border:0;background:none}.key-eye svg{width:20px}.key-eye[aria-pressed=false] .slash{display:none}
.other-providers{background:#0c192b;border-color:#3b526d;padding:16px}.other-providers legend{padding:0 8px}.other-row:has(> .provider-heading input:checked){background:#1b3047;border:1px solid #45627e;border-left:3px solid #7bdcc3;border-radius:9px;padding:8px 10px;margin-top:14px;margin-bottom:16px}.other-row:has(> .provider-heading input:checked)>.provider-heading{background:#233e55;margin-bottom:10px}.other-row:has(> .provider-heading input:checked)>[id^="panel-"]{margin:0 4px 8px}.other-row{border-top:1px solid var(--line);margin-top:9px}.other-row>div{margin:0 0 12px 16px}.other-row>.provider-heading{display:flex;align-items:center;gap:10px;margin:0;padding:5px 8px;border-radius:6px;transition:background .15s}.provider-heading>.source-toggle{flex:1;margin:0}.provider-heading[draggable=true],.provider-heading[draggable=true]>.source-toggle{cursor:grab}.provider-heading[draggable=true]:hover{background:#203c52}.provider-heading.dragging{opacity:.55;cursor:grabbing}.provider-order{display:flex;gap:4px;margin-left:auto}.provider-order button{width:28px;height:28px;min-height:28px;padding:0;font-size:17px;border-radius:5px}.custom-model-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:end}.custom-model-row label{margin:0}.custom-model-row output{grid-column:1/-1}
.actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:30px}.actions>*{min-height:48px;flex:1 1 auto;font-weight:600}
#save,[data-apply],#upload button[type=submit]{font-weight:600;color:#07261f;background:linear-gradient(110deg,#79dfc2,#a3f3cd);border-color:#a3f1da}#save{box-shadow:0 0 18px #73e2c527}
#jobs{overflow-wrap:anywhere}#jobs:empty,#jobs:not(:has(p)){padding:17px;text-align:center;border:1px solid var(--line);border-radius:8px;background:var(--field);color:var(--muted)}#jobs p{padding:12px;background:#172a41;border:1px solid var(--line);border-radius:8px;margin:0 0 8px;font-size:.93rem}#jobs p button{font-size:.86rem;margin:6px 6px 0 0;padding:5px 9px}
#jobs strong{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}#jobs small{margin:4px 0}.job-state{display:block;color:var(--muted);font-size:.85rem}.job-state[data-phase=ready]{color:var(--mint)}.job-state[data-phase=failed]{color:#ffb9bd}
dialog{color:var(--ink);width:min(520px,94vw);max-height:88dvh;padding:0}dialog[open]{display:flex;flex-direction:column}dialog::backdrop{background:#010813bb}.modal-head,.modal-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:14px 18px}.modal-head{border-bottom:1px solid var(--line)}.modal-head h2{font-size:19px}.modal-body{overflow:auto;padding:16px 18px;overflow-wrap:anywhere}.modal-body p{margin:8px 0}.modal-foot{border-top:1px solid var(--line);justify-content:flex-end;flex-wrap:wrap}.modal-foot small{width:100%}#detail-release{font-weight:700}#detail-progress,.job-progress{width:100%;accent-color:var(--mint)}.job-progress{display:block;height:8px;margin:8px 0 4px}
[id^="check-"]{margin-top:12px;margin-bottom:4px}
output{display:block}
output:not(:empty){margin-top:12px;color:var(--muted)}
output[data-state]:not(:empty){width:fit-content;max-width:100%;padding:10px 14px;border:1px solid transparent;border-left-width:3px;border-radius:10px;font-size:.9rem;line-height:1.55;overflow-wrap:anywhere;box-shadow:0 3px 10px #00000012;animation:feedback-in .18s ease-out}
output[data-state=success]{background:#12382f;color:#a2efd3;border-color:#28634f;border-left-color:#65d6ac}
output[data-state=error]{background:#381e29;color:#ffc4cc;border-color:#703747;border-left-color:#f18e9d}
output[data-state=pending]{background:#172f47;color:#c0e0ff;border-color:#345774;border-left-color:#79b7ed}
#installmsg:not(:empty),#modelmsg:not(:empty){margin-top:14px}
.ai-source-row{display:flex;align-items:center;gap:8px;padding:12px 8px;border-bottom:1px solid var(--line);flex-wrap:wrap}.ai-source-row label{flex:1;min-width:170px;margin:0}.ai-source-row small{flex-basis:180px}.ai-source-row button{padding:4px 9px}.ai-source-row[draggable=true]{cursor:grab}.ai-source-row.dragging{opacity:.5}
.input-check-row{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:stretch;gap:12px;margin-top:5px}
.input-check-row>.api-key-field,.input-check-row>.key-field,.input-check-row>input{margin:0;min-width:0}
.input-check-row>button[id^="check-"]{margin:0;min-height:42px;white-space:nowrap;align-self:stretch}
.custom-model-row>button[id^="check-"]{margin:0;min-height:42px}
.modal-body .source-config-link{display:flex;width:fit-content;margin-top:14px!important}
@media(max-width:540px){.input-check-row{gap:8px}.input-check-row>button[id^="check-"]{padding:8px 10px;font-size:13px}}
.uploaded-section{margin-top:26px;padding-top:20px;border-top:1px solid var(--line)}.uploaded-section h3{font-size:1rem;margin-bottom:8px}#uploaded-list{max-height:420px;overflow:auto;margin-top:12px}.uploaded-item{padding:12px;border:1px solid var(--line);background:var(--field);border-radius:9px;margin-bottom:10px;overflow-wrap:anywhere}.uploaded-item strong{display:block;font-size:.93rem}.uploaded-actions{display:flex;gap:8px;margin-top:10px}.uploaded-actions a,.uploaded-actions button{padding:6px 10px;font-size:.88rem}.uploaded-actions a{border:1px solid var(--line);border-radius:7px;text-decoration:none}
@keyframes feedback-in{from{opacity:0;transform:translateY(-3px)}to{opacity:1;transform:translateY(0)}}
@media(prefers-reduced-motion:reduce){output[data-state]:not(:empty){animation:none}}
.api-key-field:has([data-state=error]){border-color:#ed898c}.api-key-field:has([data-state=success]){border-color:#69c99a}
body:not([data-view=config]) #config,body:not([data-view=activity]) #activity,body:not([data-view=config]) #files,body:not([data-view=uploads]) #uploads{display:none}body:not([data-view=config]) .workspace{display:block;max-width:960px;margin:auto}

.language-switch{position:relative;display:flex;align-items:center}.language-options{position:absolute;top:calc(100% + 8px);left:0;display:flex;flex-direction:column;gap:6px;padding:6px;border:1px solid var(--line);border-radius:12px;background:var(--panel);box-shadow:0 8px 24px #0003;z-index:30}.language-options [role=tooltip]{top:50%;left:calc(100% + 10px);transform:translateY(-50%)}#language-toggle{border-color:var(--mint)}
.language-switch button{position:relative;width:40px;height:38px;min-height:38px;margin:0;padding:7px;flex:none}
.language-switch svg{display:block;width:26px;height:18px;border-radius:2px;box-shadow:0 0 0 1px #ffffff30}
.language-switch button[aria-pressed=true]{border-color:var(--mint);box-shadow:0 0 0 2px color-mix(in srgb,var(--mint) 22%,transparent)}
.language-switch [role=tooltip]{display:none;position:absolute;top:calc(100% + 8px);left:50%;transform:translateX(-50%);white-space:nowrap;background:var(--panel);color:var(--ink);border:1px solid var(--line);border-radius:5px;padding:5px 9px;font-size:13px;z-index:20;pointer-events:none}
.language-switch button:hover [role=tooltip],.language-switch button:focus-visible [role=tooltip],.language-switch button:active [role=tooltip]{display:block}
:root[data-theme=light]{color-scheme:light;--bg:#f0f5fa;--ink:#17314b;--muted:#526a80;--line:#bdcddd;--mint:#08775d;--panel:#fff;--field:#f6f9fc}
[data-theme=light] body{background:none}
[data-theme=light] button,[data-theme=light] .actions a,[data-theme=light] .modal-body a{background:#edf4f9}
[data-theme=light] .card,[data-theme=light] dialog,[data-theme=light] .config-group{background:#fff;box-shadow:0 7px 20px #284c6710}
[data-theme=light] .config-group>summary{background:#e8f0f7}
[data-theme=light] .config-group[open]>summary{background:#dceaf4}
[data-theme=light] input,[data-theme=light] select,[data-theme=light] .api-key-field,[data-theme=light] .open-picker,[data-theme=light] .file-picker{border-color:#a9bed1}
[data-theme=light] input::placeholder{color:#64788b}
[data-theme=light] .brand>.icon{color:#27718d}
[data-theme=light] .wave{stroke:#08775d}
[data-theme=light] .mast{border-color:var(--line)}
[data-theme=light] .file-picker span:nth-child(2){background:#dceaf4}
[data-theme=light] .selected-lang{background:#d7eee7;border-color:#85b5a7}
[data-theme=light] .other-providers{background:#f3f7fb;border-color:#bdcddd}
[data-theme=light] .other-row:has(> .provider-heading input:checked){background:#fff;border-color:#b7cfda;border-left-color:#168b71}
[data-theme=light] .other-row:has(> .provider-heading input:checked)>.provider-heading{background:#e1f1ed}
[data-theme=light] .provider-heading[draggable=true]:hover{background:#cce6de}
[data-theme=light] #jobs p{background:#f2f7fb}
[data-theme=light] .job-state[data-phase=failed]{color:#ae253b}
[data-theme=light] output[data-state=success]{background:#e8f7ef;color:#146346;border-color:#b3ddc7;border-left-color:#24966b}
[data-theme=light] output[data-state=error]{background:#fff0f1;color:#a12840;border-color:#efc0c9;border-left-color:#d4536c}
[data-theme=light] output[data-state=pending]{background:#edf5fd;color:#28547c;border-color:#bfd7ed;border-left-color:#4b8cc7}
[data-theme=light] #save,[data-theme=light] [data-apply],[data-theme=light] #upload button[type=submit]{background:linear-gradient(110deg,#79dfc2,#a3f3cd);color:#07261f}
#theme-toggle .theme-symbol{display:inline-block;font-size:20px;line-height:1}
@media(max-width:800px){.mast{flex-wrap:wrap;padding:12px 0}.utilities{flex-wrap:wrap}}
@media(max-width:800px){
 .workspace{display:block;padding-top:24px}body[data-view=config] .rail{display:grid;margin-top:20px}
 .mast{min-height:65px}.utilities button{padding:8px;min-height:36px}.utilities>button span{display:none}.nav{gap:4px}.nav a{flex:auto;padding:8px 5px}.actions{margin-top:24px}.config-group>summary{min-height:52px}
}
@media(max-width:540px){
 body{padding:0 12px 36px}.brand{font-size:22px;gap:7px}.wave{width:40px;margin:0}.brand>.icon{width:1.2em}.utilities{gap:5px}
 .nav{font-size:14px}.nav a{gap:5px}.nav .icon{width:17px;height:17px}.language-pair{grid-template-columns:1fr;gap:15px}
 h1{margin-bottom:18px}.inner,.card{padding:15px}.config-group>summary{padding:12px 16px;font-size:17px}
 .actions{display:grid;gap:8px}.actions>*{min-height:44px}
}
@media(max-width:360px){.wave{display:none}.nav{font-size:13px}}
`;

export const themeInit = `<script>try{const mode=localStorage.getItem('subai-theme');document.documentElement.dataset.theme=mode==='light'?'light':'dark'}catch{document.documentElement.dataset.theme='dark'}</script>`;
export const themeButton = `<button type="button" id="theme-toggle" aria-label="Chuyển giao diện sáng tối" title="Chuyển giao diện sáng tối"><span aria-hidden="true" class="theme-symbol">☀</span></button>`;
export const themeScript = `const themeToggle=document.getElementById('theme-toggle');function updateThemeButton(){const light=document.documentElement.dataset.theme==='light';themeToggle.querySelector('.theme-symbol').textContent=light?'☾':'☀';themeToggle.setAttribute('aria-label',light?'Chuyển sang giao diện tối':'Chuyển sang giao diện sáng');themeToggle.title=themeToggle.getAttribute('aria-label')}updateThemeButton();themeToggle.onclick=()=>{const mode=document.documentElement.dataset.theme==='light'?'dark':'light';document.documentElement.dataset.theme=mode;try{localStorage.setItem('subai-theme',mode)}catch{}updateThemeButton()};window.addEventListener('storage',e=>{if(e.key==='subai-theme'){document.documentElement.dataset.theme=e.newValue==='light'?'light':'dark';updateThemeButton()}});`;
