// Tianming desktop content manager: updates + workshop packs.
(function(){
  'use strict';

  var state = {
    tab: 'update',
    status: null,
    packs: [],
    feedUrl: '',
    defaultFeedUrl: ''
  };

  function desktop() {
    return !!(window.tianming && window.tianming.isDesktop);
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c];
    });
  }

  function say(msg) {
    try {
      if (typeof toast === 'function') toast(msg);
      else console.log('[content]', msg);
    } catch(e) {}
  }

  function loadFeedUrl() {
    try { return localStorage.getItem('tm_update_feed_url') || state.defaultFeedUrl || ''; } catch(e) { return state.defaultFeedUrl || ''; }
  }

  function saveFeedUrl(url) {
    try { localStorage.setItem('tm_update_feed_url', url || ''); } catch(e) {}
  }

  function releaseNotes(info) {
    if (!info) return '';
    var notes = info.releaseNotes || info.releaseName || info.releaseDate || '';
    if (Array.isArray(notes)) {
      notes = notes.map(function(n){ return n && (n.note || n.version || n); }).filter(Boolean).join('\n');
    }
    return String(notes || '').slice(0, 1600);
  }

  function ensureLayer() {
    var bg = document.getElementById('tm-content-bg');
    if (bg) return bg;
    bg = document.createElement('div');
    bg.id = 'tm-content-bg';
    bg.style.cssText = 'position:fixed;inset:0;z-index:2600;background:rgba(0,0,0,.82);display:none;align-items:center;justify-content:center;backdrop-filter:blur(4px);';
    document.body.appendChild(bg);
    return bg;
  }

  function btn(label, onclick, cls) {
    return '<button class="' + (cls || 'bt bs bsm') + '" onclick="' + onclick + '">' + esc(label) + '</button>';
  }

  function renderUpdateTab() {
    var s = state.status || {};
    var url = state.feedUrl || '';
    var status = s.message || s.error || '';
    var progressHtml = '';
    var notes = releaseNotes(s.info);
    if (s.kind === 'checking') status = '正在检查更新...';
    else if (s.kind === 'available' && s.info) status = '发现新版本 ' + s.info.version + '，当前版本 ' + (s.currentVersion || '');
    else if (s.kind === 'not-available') status = '当前已是最新版本。';
    else if (s.kind === 'blocked-downgrade') status = s.message || '远端版本不高于当前版本，已拒绝下载。';
    else if (s.kind === 'download-progress' && s.progress) {
      var pct = Math.max(0, Math.min(100, Math.round(s.progress.percent || 0)));
      status = '正在下载更新 ' + pct + '%';
      progressHtml = '<div style="height:6px;background:rgba(255,255,255,.08);border:1px solid var(--bdr);margin-top:.4rem;"><div style="height:100%;width:' + pct + '%;background:var(--gold);"></div></div>';
    } else if (s.kind === 'downloaded') status = '更新已下载，可以安装并重启。';
    if (s.hasUpdate) status = '发现新版本 ' + s.remoteVersion + '，当前版本 ' + s.currentVersion;
    else if (s.blockedDowngrade) status = '远端版本 ' + s.remoteVersion + ' 不高于当前版本 ' + s.currentVersion + '，已拒绝。';
    else if (s.currentVersion && !status) status = '当前版本 ' + s.currentVersion + '，未发现新版本。';
    return '' +
      '<div class="settings-section">' +
        '<h4>本体在线更新</h4>' +
        '<div style="font-size:.76rem;color:var(--txt-d);line-height:1.6;margin-bottom:.55rem;">更新源应为 electron-builder generic 发布目录，目录内需要 latest.yml 与安装包。远端版本必须严格高于当前版本，否则不会下载和安装。</div>' +
        '<div class="fd full"><label>更新源地址</label><input id="tm-update-feed" value="' + esc(url) + '" placeholder="https://example.com/tianming/releases/win/"></div>' +
        '<div style="display:flex;gap:.4rem;flex-wrap:wrap;margin-top:.55rem;">' +
          btn('检查更新', 'TMContentManager.checkUpdate()', 'bt bp bsm') +
          btn('下载更新', 'TMContentManager.downloadUpdate()') +
          btn('安装并重启', 'TMContentManager.installUpdate()', 'bt bd bsm') +
        '</div>' +
        '<div id="tm-update-status" style="margin-top:.55rem;font-size:.78rem;color:var(--gold-d);line-height:1.6;">' + esc(status || '尚未检查。') + progressHtml + '</div>' +
        (notes ? '<details style="margin-top:.55rem;color:var(--txt-d);font-size:.76rem;line-height:1.6;"><summary style="cursor:pointer;color:var(--gold);">发布说明</summary><pre style="white-space:pre-wrap;font-family:inherit;margin:.4rem 0 0;">' + esc(notes) + '</pre></details>' : '') +
      '</div>' +
      '<div class="settings-section">' +
        '<h4>官方内容</h4>' +
        '<div style="font-size:.76rem;color:var(--txt-d);line-height:1.6;">官方剧本、地图、立绘和语义包仍随安装包发布；后续官方内容小包可沿用工坊包 manifest 规则，但由官方签名源分发。</div>' +
      '</div>';
  }

  function packRow(p) {
    var enabled = p.enabled !== false;
    var bad = !p.installed ? ' · 文件缺失' : '';
    return '<div style="border:1px solid var(--bdr);background:rgba(0,0,0,.18);padding:.65rem;margin-bottom:.5rem;">' +
      '<div style="display:flex;justify-content:space-between;gap:.6rem;align-items:flex-start;">' +
        '<div style="min-width:0;">' +
          '<div style="font-weight:700;color:var(--gold);">' + esc(p.title || p.id) + '</div>' +
          '<div style="font-size:.72rem;color:var(--txt-d);margin-top:.15rem;">' + esc(p.id) + ' · v' + esc(p.version || '1.0.0') + ' · ' + esc(p.type || 'content') + bad + '</div>' +
          (p.description ? '<div style="font-size:.76rem;color:var(--txt);line-height:1.5;margin-top:.35rem;">' + esc(p.description) + '</div>' : '') +
        '</div>' +
        '<div style="display:flex;gap:.35rem;flex-wrap:wrap;justify-content:flex-end;">' +
          btn(enabled ? '停用' : '启用', 'TMContentManager.togglePack(\'' + esc(p.id) + '\',' + (!enabled) + ')') +
          btn('卸载', 'TMContentManager.uninstallPack(\'' + esc(p.id) + '\')', 'bt bd bsm') +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function renderWorkshopTab() {
    var rows = state.packs.length ? state.packs.map(packRow).join('') : '<div style="color:var(--txt-d);padding:1rem 0;">暂无工坊包。</div>';
    return '<div class="settings-section">' +
      '<h4>创意工坊</h4>' +
      '<div style="font-size:.76rem;color:var(--txt-d);line-height:1.6;margin-bottom:.55rem;">支持 .tm-pack / .zip / 单个剧本 JSON。导入前会校验 manifest、路径越界、危险文件类型和大小上限；启用的剧本包会在开卷前合入剧本列表。</div>' +
      '<div style="display:flex;gap:.4rem;flex-wrap:wrap;margin-bottom:.7rem;">' +
        btn('导入工坊包', 'TMContentManager.importPack()', 'bt bp bsm') +
        btn('刷新列表', 'TMContentManager.refreshPacks()') +
        btn('打开目录', 'TMContentManager.openWorkshopDir()') +
        btn('包格式说明', 'TMContentManager.openFormatDoc()') +
      '</div>' +
      rows +
    '</div>';
  }

  function render() {
    var bg = ensureLayer();
    var body = state.tab === 'workshop' ? renderWorkshopTab() : renderUpdateTab();
    bg.innerHTML = '<div style="width:min(860px,92vw);max-height:86vh;overflow:auto;background:var(--bg-2);border:1px solid var(--gold-d);box-shadow:0 18px 60px rgba(0,0,0,.55);">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;padding:.85rem 1rem;border-bottom:1px solid var(--bdr);">' +
        '<div style="font-size:1.05rem;font-weight:700;color:var(--gold);">内容管理</div>' +
        '<button class="bt bs bsm" onclick="TMContentManager.close()">×</button>' +
      '</div>' +
      '<div style="display:flex;gap:.35rem;padding:.75rem 1rem 0;">' +
        '<button class="bt ' + (state.tab === 'update' ? 'bp' : 'bs') + ' bsm" onclick="TMContentManager.switchTab(\'update\')">更新</button>' +
        '<button class="bt ' + (state.tab === 'workshop' ? 'bp' : 'bs') + ' bsm" onclick="TMContentManager.switchTab(\'workshop\')">工坊</button>' +
      '</div>' +
      '<div class="settings-body" style="padding:1rem;">' + body + '</div>' +
    '</div>';
    bg.style.display = 'flex';
  }

  async function refreshPacks() {
    if (!desktop() || !window.tianming.listWorkshopPacks) return;
    var res = await window.tianming.listWorkshopPacks();
    if (res && res.success) state.packs = res.packs || [];
    render();
  }

  async function openContentManager() {
    state.feedUrl = loadFeedUrl();
    if (!desktop()) {
      state.status = { error: '当前是网页环境，在线更新和本地工坊安装只在桌面版启用。' };
      render();
      return;
    }
    try {
      var status = await window.tianming.contentStatus();
      if (status && status.success) {
        state.packs = status.workshopPacks || [];
        state.defaultFeedUrl = status.defaultUpdateFeedUrl || state.defaultFeedUrl || '';
        if (!state.feedUrl) state.feedUrl = loadFeedUrl();
        state.status = { currentVersion: status.currentVersion };
      }
    } catch(e) {
      state.status = { error: e.message };
    }
    render();
  }

  async function checkUpdate() {
    var input = document.getElementById('tm-update-feed');
    state.feedUrl = input ? input.value.trim() : state.feedUrl;
    if (!state.feedUrl) state.feedUrl = state.defaultFeedUrl || '';
    saveFeedUrl(state.feedUrl);
    state.status = { message: '正在检查更新...' };
    render();
    var res = await window.tianming.checkForUpdate(state.feedUrl);
    state.status = res || { error: '检查失败' };
    render();
  }

  async function downloadUpdate() {
    state.status = { message: '正在下载更新...' };
    render();
    var res = await window.tianming.downloadUpdate();
    state.status = res && res.success ? { message: '更新已下载，可以安装并重启。', info: res.info } : (res || { error: '下载失败' });
    render();
  }

  async function installUpdate() {
    var res = await window.tianming.installUpdate();
    if (!res || !res.success) {
      state.status = res || { error: '安装失败' };
      render();
    }
  }

  async function importPack(overwrite) {
    var res = await window.tianming.importWorkshopPack(!!overwrite);
    if (res && res.exists && !overwrite) {
      if (confirm(res.error + '\n是否覆盖安装？')) return importPack(true);
      return;
    }
    if (!res || !res.success) {
      if (res && !res.canceled) alert(res.error || '导入失败');
      return;
    }
    say('工坊包已导入：' + (res.pack && res.pack.title || ''));
    await refreshPacks();
    await loadWorkshopScenarios(true);
  }

  async function togglePack(id, enabled) {
    await window.tianming.setWorkshopPackEnabled(id, enabled);
    await refreshPacks();
    await loadWorkshopScenarios(true);
  }

  async function uninstallPack(id) {
    if (!confirm('卸载工坊包：' + id + '？')) return;
    await window.tianming.uninstallWorkshopPack(id);
    await refreshPacks();
    await loadWorkshopScenarios(true);
  }

  function scenarioIdExists(id) {
    return (window.P && Array.isArray(P.scenarios)) && P.scenarios.some(function(s){ return s && s.id === id; });
  }

  function uniqueScenarioId(base, packId) {
    var id = String(base || packId || 'workshop');
    if (!scenarioIdExists(id)) return id;
    var next = packId + '-' + id;
    var i = 2;
    while (scenarioIdExists(next)) next = packId + '-' + id + '-' + (i++);
    return next;
  }

  function mergeArray(key, arr, sidMap, defaultSid, packId) {
    if (!Array.isArray(arr)) return;
    if (!Array.isArray(P[key])) P[key] = [];
    arr.forEach(function(item){
      if (!item || typeof item !== 'object') return;
      var copy = Object.assign({}, item);
      if (copy.sid && sidMap[copy.sid]) copy.sid = sidMap[copy.sid];
      else if (!copy.sid && defaultSid) copy.sid = defaultSid;
      copy._workshopPackId = packId;
      P[key].push(copy);
    });
  }

  function clearWorkshopPack(packId) {
    if (!window.P) return;
    [
      'scenarios','characters','factions','parties','classes','variables','events','relations','rules',
      'items','cities','territories','externalForces','goals'
    ].forEach(function(key){
      if (Array.isArray(P[key])) P[key] = P[key].filter(function(x){ return !x || x._workshopPackId !== packId; });
    });
  }

  function rewriteWorkshopAssets(pack, value) {
    var base = pack && pack.assetBase;
    if (!base) return value;
    if (typeof value === 'string') {
      var v = value.trim();
      var isAsset = /\.(png|jpe?g|webp|bmp|mp3|ogg|wav|geojson|json)(\?.*)?$/i.test(v);
      var isPackRelative = v.indexOf('./') === 0 || v.indexOf('@pack/') === 0 || v.indexOf('pack-assets/') === 0 || v.indexOf('workshop-assets/') === 0;
      var isExternal = /^(https?:|data:|blob:|file:|tm-content:|\/)/i.test(v);
      if (isAsset && isPackRelative && !isExternal) {
        v = v.replace(/^\.\//, '').replace(/^@pack\//, '');
        return base + v.split('/').map(encodeURIComponent).join('/');
      }
      return value;
    }
    if (Array.isArray(value)) return value.map(function(item){ return rewriteWorkshopAssets(pack, item); });
    if (value && typeof value === 'object') {
      var out = {};
      Object.keys(value).forEach(function(k){ out[k] = rewriteWorkshopAssets(pack, value[k]); });
      return out;
    }
    return value;
  }

  function mergeScenarioData(pack, data) {
    if (!window.P || !data) return 0;
    data = rewriteWorkshopAssets(pack, data);
    clearWorkshopPack(pack.id);
    var sidMap = {};
    var defaultSid = '';
    var scenarios = Array.isArray(data.scenarios) ? data.scenarios : null;
    if (!scenarios) {
      var single = Object.assign({}, data);
      single.id = data.id || pack.id;
      single.era = data.era || data.dynasty || '';
      single.name = data.name || data.title || pack.title;
      single.role = data.role || '';
      single.background = data.background || data.overview || '';
      single.overview = data.overview || data.background || '';
      single.opening = data.opening || data.openingText || '';
      single.active = data.active !== false;
      scenarios = [single];
    }
    if (!Array.isArray(P.scenarios)) P.scenarios = [];
    scenarios.forEach(function(sc, idx){
      if (!sc || typeof sc !== 'object') return;
      var oldId = sc.id || pack.id + '-' + idx;
      var newId = uniqueScenarioId(oldId, pack.id);
      sidMap[oldId] = newId;
      if (!defaultSid) defaultSid = newId;
      var copy = Object.assign({}, sc, { id: newId, _workshopPackId: pack.id, _workshopTitle: pack.title });
      P.scenarios.push(copy);
    });
    ['characters','factions','parties','classes','variables','events','relations','rules','items','cities','territories','externalForces','goals'].forEach(function(key){
      mergeArray(key, data[key], sidMap, defaultSid, pack.id);
    });
    try { if (typeof buildIndices === 'function') buildIndices(); } catch(e) {}
    return scenarios.length;
  }

  async function loadWorkshopScenarios(silent) {
    if (!desktop() || !window.tianming.loadEnabledWorkshopScenarios || !window.P) return;
    try {
      if (window.tianming.listWorkshopPacks) {
        var list = await window.tianming.listWorkshopPacks();
        if (list && list.success) state.packs = list.packs || state.packs || [];
      }
      (state.packs || []).forEach(function(pack){
        if (pack && pack.id) clearWorkshopPack(pack.id);
      });
      var res = await window.tianming.loadEnabledWorkshopScenarios();
      if (!res || !res.success) return;
      var count = 0;
      (res.scenarios || []).forEach(function(item){
        if (item && item.pack && item.data) count += mergeScenarioData(item.pack, item.data);
      });
      if (count && !silent) say('已载入工坊剧本 ' + count + ' 个');
    } catch(e) {
      console.warn('[TMContentManager] load workshop failed', e);
    }
  }

  window.openContentManager = openContentManager;
  window.TMContentManager = {
    open: openContentManager,
    close: function(){ var bg = document.getElementById('tm-content-bg'); if (bg) bg.style.display = 'none'; },
    switchTab: function(tab){ state.tab = tab || 'update'; render(); },
    checkUpdate: checkUpdate,
    downloadUpdate: downloadUpdate,
    installUpdate: installUpdate,
    refreshPacks: refreshPacks,
    importPack: importPack,
    togglePack: togglePack,
    uninstallPack: uninstallPack,
    openWorkshopDir: function(){ return window.tianming.openWorkshopDir(); },
    openFormatDoc: function(){ window.open('docs/workshop-pack-format.md', '_blank'); },
    loadWorkshopScenarios: loadWorkshopScenarios
  };

  if (desktop() && window.tianming.onUpdateStatus) {
    try {
      window.tianming.onUpdateStatus(function(status){
        state.status = status || state.status;
        var bg = document.getElementById('tm-content-bg');
        if (bg && bg.style.display !== 'none') render();
      });
    } catch(e) {}
  }

  setTimeout(function(){
    loadWorkshopScenarios(false);
    if (typeof window.showScnSelect === 'function' && !window.showScnSelect._tmWorkshopWrapped) {
      var oldShowScnSelect = window.showScnSelect;
      window.showScnSelect = function(){
        var args = arguments;
        return Promise.resolve(loadWorkshopScenarios(true)).then(function(){
          return oldShowScnSelect.apply(window, args);
        });
      };
      window.showScnSelect._tmWorkshopWrapped = true;
    }
  }, 0);
})();
