// map-editor-juben-handoff.js
// 地图编辑器 ↔ 剧本编辑器（御案）跳转往返桥 · 编辑器侧。
// 御案点「去地图编辑器」→ 写交接键 + 开本页(?tmFromJuben=1)；本脚本载入交接地图 + 注入「返回剧本」按钮。
// 返回时把当前 ME.EDITOR.map 写返回键，御案靠 storage 事件接收并经 applyMapPatch 写回。
// 键名与 scenario-editor-reset-app.js 约定一致。
(function () {
  'use strict';
  var HANDOFF_KEY = 'tm.scenarioEditorReset.mapHandoff.v1';
  var RETURN_KEY = 'tm.scenarioEditorReset.mapReturn.v1';

  function fromJuben() {
    try { return /[?&]tmFromJuben=1/.test(location.search); } catch (e) { return false; }
  }
  function readHandoff() {
    try { var raw = localStorage.getItem(HANDOFF_KEY); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  }
  function ME() { return (window.TM && window.TM.MapEditor) || null; }
  function ready() {
    var m = ME();
    return !!(m && m.EDITOR && m.EDITOR.canvas && typeof m.loadMap === 'function');
  }
  function whenReady(cb) {
    if (ready()) { cb(); return; }
    var tries = 0;
    var t = setInterval(function () {
      if (ready()) { clearInterval(t); cb(); }
      else if (++tries > 200) { clearInterval(t); }  // ~10s 放弃
    }, 50);
  }

  function injectReturnButton() {
    if (document.getElementById('juben-return-btn')) return;
    var btn = document.createElement('button');
    btn.id = 'juben-return-btn';
    btn.type = 'button';
    btn.textContent = '← 返回剧本（写回地图）';
    btn.style.cssText = 'position:fixed;left:50%;top:10px;transform:translateX(-50%);z-index:99999;' +
      'padding:8px 18px;background:#c9a84c;color:#1a1206;border:1px solid #8a6a2c;border-radius:6px;' +
      'font:600 14px/1.4 system-ui,sans-serif;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.4);';
    btn.onmouseover = function () { btn.style.background = '#d9b85c'; };
    btn.onmouseout = function () { btn.style.background = '#c9a84c'; };
    btn.onclick = returnToJuben;
    document.body.appendChild(btn);
  }

  function returnToJuben() {
    var m = ME();
    if (!m || !m.EDITOR || !m.EDITOR.map) { alert('地图未就绪，无法返回'); return; }
    // 提交 raster 脏改（同 exportJSON 前置）
    try { if (window.TM && TM.MapEditor && TM.MapEditor.rastermaps) TM.MapEditor.rastermaps.commitAllDirty(); } catch (e) {}
    var payload = { createdAt: new Date().toISOString(), source: 'map-editor', native: m.EDITOR.map };
    try { localStorage.setItem(RETURN_KEY, JSON.stringify(payload)); }
    catch (err) { alert('写回失败（地图可能过大）：' + (err && err.message || err)); return; }
    try { localStorage.removeItem(HANDOFF_KEY); } catch (e) {}
    // 关闭本标签（御案靠 storage 事件接收）；关不掉则后退
    try { window.close(); } catch (e) {}
    setTimeout(function () { if (!window.closed) { try { history.back(); } catch (e) {} } }, 150);
  }

  function start() {
    if (!fromJuben()) return;
    var handoff = readHandoff();
    whenReady(function () {
      var m = ME();
      if (handoff && handoff.native && handoff.native.divisions && handoff.native.divisions.length) {
        try { m.loadMap(handoff.native); } catch (e) { console.error('[juben-handoff] loadMap 失败', e); }
      }
      injectReturnButton();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  // 暴露给 e2e/调试
  window.JubenMapHandoff = { returnToJuben: returnToJuben, readHandoff: readHandoff, _keys: { HANDOFF_KEY: HANDOFF_KEY, RETURN_KEY: RETURN_KEY } };
})();
