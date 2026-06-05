// 编辑器顶栏加 ⚙ API设置按钮 + 设置弹窗(读写全游戏通用 tm_api·复用saveApiSettings/readApiSettings·带测试连接)。
const fs = require('fs');

// ── 1) HTML：顶栏 top-actions 加 ⚙ 按钮 ──
const fh = 'preview/scenario-editor-reset-preview.html';
let h = fs.readFileSync(fh, 'utf8');
const ha = `        <button type="button" class="icon-btn" title="校验冲突" aria-label="校验剧本冲突">验</button>`;
const hb = `        <button type="button" class="icon-btn" title="API 设置 · 全游戏通用主 API（国师 / 生图共用）" aria-label="API 设置" data-editor-command="open-api-settings-modal">⚙</button>
        <button type="button" class="icon-btn" title="校验冲突" aria-label="校验剧本冲突">验</button>`;
if (h.split(ha).length - 1 !== 1) throw new Error('HTML anchor x' + (h.split(ha).length - 1));
h = h.replace(ha, hb);
fs.writeFileSync(fh, h, 'utf8');

// ── 2) app.js：弹窗函数 + 命令分发 ──
const fa = 'preview/scenario-editor-reset-app.js';
let s = fs.readFileSync(fa, 'utf8');
function once(a, b, t) { if (s.split(a).length - 1 !== 1) throw new Error('app anchor ' + t + ' x' + (s.split(a).length - 1)); s = s.replace(a, b); }

const FN = String.raw`  function gmApiVal(id) { var e = document.getElementById(id); return e ? e.value : ''; }
  function gmApiCollect() { return { main: { key: gmApiVal('gm-api-key'), url: gmApiVal('gm-api-url'), model: gmApiVal('gm-api-model') }, image: { key: gmApiVal('gm-img-key'), url: gmApiVal('gm-img-url'), model: gmApiVal('gm-img-model') } }; }
  function closeApiSettingsModal() { var m = document.getElementById('gm-api-modal'); if (m && m.parentNode) m.parentNode.removeChild(m); }
  function openApiSettingsModal() {
    closeApiSettingsModal();
    var s = readApiSettings();
    var ov = document.createElement('div');
    ov.id = 'gm-api-modal';
    ov.setAttribute('style', 'position:fixed;inset:0;z-index:4000;background:rgba(30,22,12,.55);display:flex;align-items:center;justify-content:center');
    ov.innerHTML = '<style>' +
      '#gm-api-modal .gm-card{width:min(560px,94vw);max-height:90vh;overflow:auto;background:linear-gradient(160deg,#fffdf3,#f6efda);border:1px solid #c9a84c;border-radius:14px;box-shadow:0 12px 40px rgba(30,20,10,.4);font-family:"KaiTi","STKaiti","Noto Serif SC",serif;color:#241d15}' +
      '#gm-api-modal .gm-h{display:flex;align-items:baseline;gap:10px;padding:14px 18px 10px;border-bottom:1px solid rgba(168,131,58,.3)}' +
      '#gm-api-modal .gm-h b{font-size:17px;color:#7a2018}#gm-api-modal .gm-h span{font-size:11px;color:#9c8b6b;flex:1;line-height:1.4}' +
      '#gm-api-modal .gm-x{cursor:pointer;border:none;background:none;font-size:20px;color:#9c8b6b;line-height:1}' +
      '#gm-api-modal .gm-b{padding:12px 18px;display:flex;flex-direction:column;gap:9px}' +
      '#gm-api-modal .gm-b label{display:flex;flex-direction:column;gap:3px;font-size:12px;color:#574733}' +
      '#gm-api-modal .gm-b input{border:1px solid #dcc99c;border-radius:6px;background:rgba(255,252,242,.9);font:inherit;font-size:13px;color:#241d15;padding:5px 8px}' +
      '#gm-api-modal .gm-b input:focus{border-color:#a8833a;outline:none}' +
      '#gm-api-modal .gm-sub{margin-top:6px;font-size:11px;font-weight:700;color:#a8833a;border-left:3px solid #a8833a;padding-left:7px}' +
      '#gm-api-modal .gm-f{display:flex;align-items:center;gap:8px;padding:10px 18px 16px;border-top:1px solid rgba(168,131,58,.3)}' +
      '#gm-api-modal .gm-status{flex:1;font-size:11px;color:#574733;min-height:1em}' +
      '#gm-api-modal .gm-save{cursor:pointer;border:1px solid #a8833a;background:#a8833a;color:#fff;border-radius:7px;padding:5px 16px;font:inherit;font-size:13px}' +
      '#gm-api-modal .gm-mini{cursor:pointer;border:1px solid #c9a84c;background:transparent;color:#7d5e22;border-radius:7px;padding:5px 12px;font:inherit;font-size:12px}' +
    '</style>' +
    '<div class="gm-card">' +
      '<div class="gm-h"><b>API 设置</b><span>全游戏通用主 API · 与正式游戏共用一份（存 tm_api）· 国师助手 / 生图都用它</span><button class="gm-x" data-editor-command="close-api-settings-modal" aria-label="关闭">×</button></div>' +
      '<div class="gm-b">' +
        '<label>主 API · 地址（URL）<input id="gm-api-url" value="' + escapeHtml(s.main.url || 'https://api.openai.com/v1/chat/completions') + '" placeholder="https://api.openai.com/v1/chat/completions 或中转站地址"></label>' +
        '<label>主 API · 模型<input id="gm-api-model" value="' + escapeHtml(s.main.model || 'gpt-4o') + '" placeholder="gpt-4o / claude-sonnet-4 / deepseek-chat …"></label>' +
        '<label>主 API · Key<input id="gm-api-key" type="password" value="' + escapeHtml(s.main.key || '') + '" placeholder="sk-…（仅存本机，不写进剧本包）"></label>' +
        '<div class="gm-sub">生图 API（留空则复用主 API）</div>' +
        '<label>生图 · 地址<input id="gm-img-url" value="' + escapeHtml(s.image.url || '') + '" placeholder="https://api.openai.com/v1/images/generations"></label>' +
        '<label>生图 · 模型<input id="gm-img-model" value="' + escapeHtml(s.image.model || '') + '" placeholder="dall-e-3 / gpt-image-1"></label>' +
        '<label>生图 · Key<input id="gm-img-key" type="password" value="' + escapeHtml(s.image.key || '') + '" placeholder="留空复用主 API"></label>' +
      '</div>' +
      '<div class="gm-f"><span class="gm-status" id="gm-api-status"></span><button class="gm-mini" data-editor-command="test-api-settings-modal">测试连接</button><button class="gm-save" data-editor-command="save-api-settings-modal">保存</button><button class="gm-mini" data-editor-command="close-api-settings-modal">关闭</button></div>' +
    '</div>';
    ov.addEventListener('click', function (e) { if (e.target === ov) closeApiSettingsModal(); });
    document.body.appendChild(ov);
  }
  function saveApiSettingsModal() { saveApiSettings(gmApiCollect()); closeApiSettingsModal(); setStatus('API 设置已保存（全游戏通用主 API · 国师 / 生图共用）', 'good'); }
  function testApiSettingsModal() {
    var st = document.getElementById('gm-api-status'); if (st) { st.textContent = '测试中…'; st.style.color = '#574733'; }
    saveApiSettings(gmApiCollect());
    var AA = global.TM && global.TM.AuthoringAgent;
    if (!AA || typeof AA.testConnection !== 'function') { if (st) st.textContent = '测试不可用（国师助手未加载）'; return; }
    AA.testConnection().then(function (r) { var s2 = document.getElementById('gm-api-status'); if (s2) { s2.textContent = (r && r.ok ? '✓ ' : '✗ ') + ((r && r.detail) || (r && r.ok ? '连通' : '失败')); s2.style.color = (r && r.ok) ? '#2d5848' : '#a83228'; } })
      .catch(function (e) { var s2 = document.getElementById('gm-api-status'); if (s2) { s2.textContent = '✗ ' + (e && e.message || e); s2.style.color = '#a83228'; } });
  }

  function renderApiSettingsWorkbench() {`;

once(`  function renderApiSettingsWorkbench() {`, FN, 'modal-fns');

once(`    if (command === 'admin-div-select') { state._adminDivId = target && target.dataset && target.dataset.adminDivId; reRenderModulePrimary(); }`,
     `    if (command === 'admin-div-select') { state._adminDivId = target && target.dataset && target.dataset.adminDivId; reRenderModulePrimary(); }
    if (command === 'open-api-settings-modal') openApiSettingsModal();
    if (command === 'close-api-settings-modal') closeApiSettingsModal();
    if (command === 'save-api-settings-modal') saveApiSettingsModal();
    if (command === 'test-api-settings-modal') testApiSettingsModal();`,
     'dispatch-modal');

fs.writeFileSync(fa, s, 'utf8');
console.log('OK: HTML ⚙按钮 + 弹窗函数 + 4命令');
