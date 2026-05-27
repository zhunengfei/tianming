// phase8-formal-map.js·中央地图 (renderFormalMap·region dossier·faction dossier·alerts·basemap·tile rendering·121 functions)
// split from phase8-formal-bridge.js·2026-05-26·Wave 6
// paradigm·head alias 块·body 0 改动·跨闭包 helper 通过 bridge._xxx + late-bound wrapper

(function(){
  'use strict';

  var bridge = window.TMPhase8FormalBridge;
  if (!bridge) {
    console.error('[phase8-formal-map] TMPhase8FormalBridge not init·bridge.js 必须先 load');
    return;
  }

  var state = bridge._state || window.TM_PHASE8_FORMAL;

  // ── alias 块 (cross-closure helpers from bridge._xxx) ──────────────
  var esc = bridge._esc;
  var attr = bridge._attr;
  var asset = bridge._asset;
  var miniRows = bridge._miniRows;
  var actionButton = bridge._actionButton;
  var ownerKey = bridge._ownerKey;
  var ownerName = bridge._ownerName;
  var findFaction = bridge._findFaction;
  var findPerson = bridge._findPerson;
  var personKey = bridge._personKey;
  var getPeople = bridge._getPeople;
  var getParties = bridge._getParties;
  var getClasses = bridge._getClasses;
  var collectRecentEvents = bridge._collectRecentEvents;
  var getTurnText = bridge._getTurnText;
  var firstArray = bridge._firstArray;
  var compactText = bridge._compactText;
  var getMemorials = bridge._getMemorials;
  var getIssues = bridge._getIssues;
  var getActiveScenario = bridge._getActiveScenario;
  var getArmies = bridge._getArmies;
  var issueIsResolved = bridge._issueIsResolved;
  var toast = bridge._toast;
  var cssEscape = bridge._cssEscape;
  var renderEventFeed = bridge._renderEventFeed;
  var syncFormalShellVisibility = bridge._syncFormalShellVisibility;
  var hasRegionMap = bridge._hasRegionMap;
  var getScenarioMapData = bridge._getScenarioMapData;
  var activeScenarioId = bridge._activeScenarioId;
  var mapIdentity = bridge._mapIdentity;
  var isGameVisible = bridge._isGameVisible;

  // ── late-bound wrappers (orchestration into bridge / window) ───────
  function openPanel(slot){ return bridge.openPanel(slot); }
  function openModule(kind, options){ return bridge.openModule(kind, options); }
  function openGuoku(){ return bridge.openGuoku(); }
  function closeModule(){ return bridge._closeModule && bridge._closeModule(); }
  function moduleShell(kind, title, sub, left, main, right){ return bridge._moduleShell ? bridge._moduleShell(kind, title, sub, left, main, right) : ''; }

  // ── module body (P3 Wave 6 迁入·2606 行·body 0 改动) ─────────────

  function mapStage(){
    return document.getElementById('ming-map-layer') || document.getElementById('tmf-map-stage');
  }

  function ensureMainShell(){
    if (!syncFormalShellVisibility()) return null;
    var gc = document.getElementById('gc');
    if (!gc) return null;
    var shell = document.getElementById('tm-phase8-main-shell');
    if (!shell) {
      shell = document.createElement('section');
      shell.id = 'tm-phase8-main-shell';
      shell.setAttribute('aria-label', '天命 Phase 8 主界面');
      shell.innerHTML =
        '<div id="mapwrap" class="tmf-mapwrap" data-map-mode="' + esc(state.mapMode) + '" data-map-scale="' + esc(state.mapScale) + '">' +
          '<div class="map-bg"></div><div class="map-board-corner c1"></div><div class="map-board-corner c2"></div><div class="map-board-corner c3"></div><div class="map-board-corner c4"></div>' +
          '<div class="desk-prop paperweight"></div><div class="desk-prop counter"></div><div class="desk-prop seal"></div>' +
          '<div id="ming-map-layer" class="ming-map-layer tmf-map-stage" aria-label="天下舆图"></div>' +
          '<div class="map-zoom-tools" aria-label="舆图缩放"><button type="button" class="mz-btn" data-map-zoom="1.22" title="放大">+</button><button type="button" class="mz-btn reset" data-map-reset="1" title="复位">◎</button><button type="button" class="mz-btn" data-map-zoom="0.82" title="缩小">−</button></div>' +
          '<div class="ming-map-wash"></div>' +
          '<button type="button" class="renwu-tuzhi-entry" data-tmf-action="renwu" title="人物图志"><img class="renwu-tuzhi-img" src="' + esc(asset('renwu-tuzhi-card-ui.png')) + '" alt="人物图志"></button>' +
          '<div class="map-tools-dock open" id="map-tools-dock"><button type="button" class="map-tools-toggle" id="map-tools-toggle" data-map-tools-toggle="1" aria-expanded="true"><span>舆图工具</span><span class="map-tools-mode" id="map-tools-mode">势力</span><span class="map-tools-caret">▾</span></button><div class="map-tools-pop" id="map-tools-pop"><div class="map-layer-bar"><button class="map-layer" data-map-mode="mood">民情</button><button class="map-layer" data-map-mode="tax">财赋</button><button class="map-layer" data-map-mode="army">军务</button><button class="map-layer" data-map-mode="office">官守</button><button class="map-layer on" data-map-mode="owner">势力</button></div><div class="map-nav-panel"><div class="map-search-row"><span class="map-search-label">检索</span><input id="map-search" class="map-search" list="map-region-list" autocomplete="off" placeholder="地名 / 势力 / 主官"><datalist id="map-region-list"></datalist></div><div id="map-search-results" class="map-search-results"></div></div></div></div>' +
          '<div class="map-scale-strip" aria-label="舆图层级"><button type="button" class="map-scale" data-map-scale="realm" aria-pressed="false">天下</button><button type="button" class="map-scale" data-map-scale="region" aria-pressed="true">省道</button><button type="button" class="map-scale" data-map-scale="prefecture" aria-pressed="false">府州</button></div>' +
          '<div class="map-alert-strip"><button type="button" class="map-alert hot" onclick="TMPhase8FormalBridge.openModule(\'memorial\')">待批奏疏</button><button type="button" class="map-alert" onclick="TMPhase8FormalBridge.openPanel(\'issue\')">朝议待核</button><button type="button" class="map-alert ok" onclick="TMPhase8FormalBridge.openPanel(\'finance\')">财赋入库</button></div>' +
          '<div id="tmf-map-legend" class="map-legend tmf-map-legend"></div>' +
          '<div class="map-hint" id="tmf-map-hint">滚轮缩放，拖拽移图，点击地块查看档案。</div>' +
          '<div id="tmf-map-tip" class="map-tooltip tmf-map-tip"></div>' +
        '</div>';
      gc.insertBefore(shell, gc.firstChild);
    }
    var legacyStage = document.getElementById('tmf-map-stage');
    if (legacyStage && !document.getElementById('ming-map-layer')) legacyStage.id = 'ming-map-layer';
    var back = document.getElementById('tm-phase8-home-return');
    if (!back) {
      back = document.createElement('button');
      back.type = 'button';
      back.id = 'tm-phase8-home-return';
      back.textContent = '返回舆图';
      back.onclick = showHome;
      document.getElementById('G').appendChild(back);
    }
    if (state.mainShellBound !== gc) {
      state.mainShellBound = gc;
      gc.addEventListener('click', function(e){
        var toggle = e.target && e.target.closest ? e.target.closest('[data-map-tools-toggle]') : null;
        if (toggle) {
          e.preventDefault();
          e.stopPropagation();
          var dock = document.getElementById('map-tools-dock');
          if (dock) dock.classList.toggle('open');
          toggle.setAttribute('aria-expanded', String(!!(dock && dock.classList.contains('open'))));
          return;
        }
        var zoom = e.target && e.target.closest ? e.target.closest('[data-map-zoom]') : null;
        if (zoom) {
          e.preventDefault();
          e.stopPropagation();
          zoomMap(Number(zoom.dataset.mapZoom || 1));
          return;
        }
        var reset = e.target && e.target.closest ? e.target.closest('[data-map-reset]') : null;
        if (reset) {
          e.preventDefault();
          e.stopPropagation();
          resetMapView();
          return;
        }
        var mode = e.target && e.target.closest ? e.target.closest('.map-layer[data-map-mode]') : null;
        if (mode) {
          e.preventDefault();
          e.stopPropagation();
          state.mapMode = mode.dataset.mapMode || 'owner';
          state.mapPanelTab = state.mapMode;
          updateMapChrome();
          renderFormalMap();
          refreshMapPpop();
          return;
        }
        var scale = e.target && e.target.closest ? e.target.closest('.map-scale[data-map-scale]') : null;
        if (scale) {
          e.preventDefault();
          e.stopPropagation();
          state.mapScale = scale.dataset.mapScale || 'region';
          updateMapChrome();
          renderFormalMap();
          refreshMapPpop();
          return;
        }
      });
      gc.addEventListener('input', function(e){
        if (e.target && e.target.id === 'map-search') renderMapSearchResults(e.target.value || '');
      });
      gc.addEventListener('keydown', function(e){
        if (!(e.target && e.target.id === 'map-search') || e.key !== 'Enter') return;
        var first = document.querySelector('#map-search-results [data-region-id]');
        if (first) {
          e.preventDefault();
          focusRegion(first.dataset.regionId, true);
        }
      });
    }
    installMapInteraction();
    return shell;
  }

  function ensureMapDataScript(){
    return null;
  }

  function cloneMapForFormal(map){
    if (!map) return map;
    if (typeof window.deepClone === 'function') {
      try { return window.deepClone(map); } catch(_) {}
    }
    try { return JSON.parse(JSON.stringify(map)); } catch(_) { return map; }
  }

  function bindFormalMapState(sourceMap){
    if (!hasRegionMap(sourceMap)) return null;
    if (typeof window.bindRuntimeMapState === 'function') {
      try {
        var bound = window.bindRuntimeMapState(sourceMap);
        if (hasRegionMap(bound)) {
          return syncLiveMapRefs(bound);
        }
      } catch(_) {}
    }
    var live = cloneMapForFormal(sourceMap);
    return syncLiveMapRefs(live);
  }

  function syncLiveMapRefs(live){
    if (!hasRegionMap(live)) return null;
    if (window.GM) {
      window.GM.mapData = live;
      window.GM._useAIGeo = false;
    }
    if (window.P) {
      window.P.map = live;
      window.P.mapData = live;
    }
    return live;
  }

  function getMapData(){
    if (window.TMMapRuntime && typeof TMMapRuntime.getMap === 'function') {
      try {
        var live = TMMapRuntime.getMap();
        if (hasRegionMap(live)) return syncLiveMapRefs(live) || live;
      } catch(_) {}
    }
    var gm = window.GM && GM.mapData;
    if (hasRegionMap(gm)) return syncLiveMapRefs(gm) || gm;
    var pMap = window.P && P.map;
    if (hasRegionMap(pMap) && pMap.enabled !== false) return bindFormalMapState(pMap) || pMap;
    var pMapData = window.P && P.mapData;
    if (hasRegionMap(pMapData)) return bindFormalMapState(pMapData) || pMapData;
    var sm = getScenarioMapData();
    if (hasRegionMap(sm)) return bindFormalMapState(sm) || sm;
    if (Array.isArray(window.MING_MAP_REGIONS) && window.MING_MAP_REGIONS.length) {
      var sourceMeta = window.MING_MAP_SOURCE_META || window.MING_MAP_SOURCE || {};
      var sourceId = String(sourceMeta.id || sourceMeta.mapId || 'tianqi-ming2');
      // activeScenarioId is a scenario id, not a map id. Empty scenario map metadata
      // must not block the bundled Ming map fallback used by Tianqi/Chongzhen saves.
      return {
        id: sourceId,
        width: window.MING_MAP_WIDTH || 1200,
        height: window.MING_MAP_HEIGHT || 720,
        regions: window.MING_MAP_REGIONS,
        oceans: window.MING_MAP_OCEANS || [],
        factions: window.MING_MAP_FACTIONS || window.MING_OWNER_POWERS || {}
      };
    }
    ensureMapDataScript();
    return null;
  }

  function resolveBasemap(map){
    if (useGeneratedBasemap(map)) return '';
    var assets = map && map.assets;
    var source = map && map.source;
    var src = map && (map.basemap || map.baseMap || map.backgroundImage || map.background || map.previewImage);
    if (!src && assets) src = assets.basemap || assets.baseMap || assets.backgroundImage || assets.background || assets.image;
    if (!src && source) src = source.basemap || source.baseMap || source.backgroundImage || source.background || source.image;
    if (src && typeof src === 'object') src = src.src || src.url || src.path || src.href;
    if (src) return String(src);
    return '';
  }

  function useGeneratedBasemap(map){
    var base = window.EAST_ASIA_BASEMAP;
    if (!base || typeof base !== 'object' || Array.isArray(base)) return false;
    var id = String(mapIdentity(map) || '').toLowerCase();
    var source = (map && map.source) || {};
    var meta = (map && map.meta) || {};
    var name = [
      id,
      source.id,
      source.mapId,
      source.name,
      meta.id,
      meta.name,
      map && map.name
    ].filter(Boolean).join(' ').toLowerCase();
    if (name.indexOf('tianqi-ming2') >= 0 || name.indexOf('ming') >= 0) return true;
    var regions = map && Array.isArray(map.regions) ? map.regions : [];
    return regions.length > 10 && regions.slice(0, 12).every(function(r){
      return /^ming[-_]/i.test(String((r && (r.id || r.sourceId || r.mapRegionId)) || ''));
    });
  }

  function generatedBasemapLayer(map, basemapSrc){
    var width = Number((map && map.width) || 1200);
    var height = Number((map && map.height) || 720);
    if (useGeneratedBasemap(map)) {
      var base = window.EAST_ASIA_BASEMAP || {};
      var landPaths = Array.isArray(base.landPaths) ? base.landPaths : [];
      var lakePaths = Array.isArray(base.lakePaths) ? base.lakePaths : [];
      var riverPaths = Array.isArray(base.riverPaths) ? base.riverPaths : [];
      var geoLabels = Array.isArray(base.geoLabels) ? base.geoLabels : [];
      var baseImage = base.imageHref ? '<image class="generated-basemap" href="' + attr(base.imageHref) + '" x="0" y="0" width="' + attr(width) + '" height="' + attr(height) + '" preserveAspectRatio="none"></image>' : '';
      var basePaths = landPaths.map(function(d){
        return '<path class="east-base-region" d="' + attr(d) + '" fill-rule="evenodd"></path>';
      }).join('');
      var coastPaths = landPaths.map(function(d){
        return '<path class="east-coastline" d="' + attr(d) + '"></path>';
      }).join('');
      var lakes = lakePaths.map(function(d){
        return '<path class="east-lake" d="' + attr(d) + '"></path>';
      }).join('');
      var rivers = riverPaths.map(function(r){
        var d = typeof r === 'string' ? r : (r && r.d);
        if (!d) return '';
        return '<path class="east-river ' + attr(r && r.major ? 'major' : '') + '" d="' + attr(d) + '"></path>';
      }).join('');
      var grid = [260,420,580,740,900,1060].map(function(x){
        return '<path class="east-geo-grid" d="M' + x + ' 72 L' + x + ' 650"></path>';
      }).join('') + [150,285,420,555].map(function(y){
        return '<path class="east-geo-grid" d="M72 ' + y + ' L1128 ' + y + '"></path>';
      }).join('');
      var labels = geoLabels.map(function(r){
        return '<text class="east-base-label ' + attr(r && r.kind || '') + '" x="' + attr(r && r.x) + '" y="' + attr(r && r.y) + '">' + esc(r && r.text) + '</text>';
      }).join('');
      return '<g class="tmf-generated-basemap">' +
        '<g class="basemap-art">' + baseImage + '</g>' +
        '<ellipse class="ming-map-paper" cx="600" cy="370" rx="631" ry="384"></ellipse>' +
        '<ellipse class="east-sea-wash" cx="632" cy="405" rx="638" ry="380"></ellipse>' +
        '<g class="east-grid">' + grid + '</g>' +
        '<g class="east-base">' + basePaths + '</g>' +
        '<g class="east-lakes">' + lakes + '</g>' +
        '<g class="east-rivers">' + rivers + '</g>' +
        '<g class="east-coast">' + coastPaths + '</g>' +
        '<g class="terrain-under">' +
          '<path class="terrain-ridge" d="M136 390 C188 360 244 360 296 383 C344 404 394 397 440 368"></path>' +
          '<path class="terrain-ridge" d="M452 176 C520 150 586 151 651 174 C708 195 763 188 824 165"></path>' +
          '<path class="terrain-ridge" d="M455 465 C500 438 553 440 602 463 C645 482 690 476 736 452"></path>' +
          '<path class="terrain-hill" d="M290 488 C344 470 405 476 454 507"></path>' +
          '<path class="terrain-hill" d="M790 176 C840 156 897 161 945 191"></path>' +
          '<path class="terrain-shore" d="M912 248 C955 280 973 333 948 381 C923 430 945 481 1005 518"></path>' +
          '<path class="terrain-shore" d="M724 520 C778 552 840 552 890 524"></path>' +
        '</g>' +
        '<g class="east-base-labels">' + labels + '</g>' +
      '</g>';
    }
    if (!basemapSrc) return '';
    return '<image class="tmf-map-basemap" href="' + attr(basemapSrc) + '" x="0" y="0" width="' + attr(width) + '" height="' + attr(height) + '" preserveAspectRatio="none"></image>';
  }

  function pathForRegion(r){
    if (!r) return '';
    if (r.d) return r.d;
    if (r.path) return r.path;
    var pts = [];
    if (Array.isArray(r.points)) pts = r.points.map(function(p){ return Array.isArray(p) ? {x:p[0], y:p[1]} : p; });
    else if (Array.isArray(r.polygon)) pts = r.polygon;
    else if (Array.isArray(r.coords)) {
      for (var i = 0; i < r.coords.length - 1; i += 2) pts.push({ x: r.coords[i], y: r.coords[i + 1] });
    }
    pts = pts.filter(function(p){ return p && isFinite(p.x) && isFinite(p.y); });
    if (!pts.length) return '';
    return 'M' + pts.map(function(p){ return Number(p.x).toFixed(1) + ' ' + Number(p.y).toFixed(1); }).join(' L') + ' Z';
  }

  function centerForRegion(r){
    if (!r) return { x: 0, y: 0 };
    if (Array.isArray(r.center)) return { x: Number(r.center[0]) || 0, y: Number(r.center[1]) || 0 };
    if (r.centroid) return { x: Number(r.centroid.x) || 0, y: Number(r.centroid.y) || 0 };
    var pts = [];
    if (Array.isArray(r.points)) pts = r.points.map(function(p){ return Array.isArray(p) ? {x:p[0], y:p[1]} : p; });
    else if (Array.isArray(r.polygon)) pts = r.polygon;
    else if (Array.isArray(r.coords)) {
      for (var i = 0; i < r.coords.length - 1; i += 2) pts.push({ x: r.coords[i], y: r.coords[i + 1] });
    }
    pts = pts.filter(function(p){ return p && isFinite(p.x) && isFinite(p.y); });
    if (!pts.length) return { x: 0, y: 0 };
    return pts.reduce(function(acc, p){ acc.x += Number(p.x); acc.y += Number(p.y); return acc; }, { x: 0, y: 0, n: pts.length });
  }

  function pointsForRegion(r){
    var pts = [];
    if (!r) return pts;
    if (Array.isArray(r.points)) pts = r.points.map(function(p){ return Array.isArray(p) ? {x:p[0], y:p[1]} : p; });
    else if (Array.isArray(r.polygon)) pts = r.polygon;
    else if (Array.isArray(r.coords)) {
      for (var i = 0; i < r.coords.length - 1; i += 2) pts.push({ x: r.coords[i], y: r.coords[i + 1] });
    } else {
      var d = String(r.d || r.path || '');
      var nums = d.match(/-?\d+(?:\.\d+)?/g) || [];
      for (var j = 0; j < nums.length - 1; j += 2) pts.push({ x: Number(nums[j]), y: Number(nums[j + 1]) });
    }
    return pts.filter(function(p){ return p && isFinite(p.x) && isFinite(p.y); }).map(function(p){ return { x: Number(p.x), y: Number(p.y) }; });
  }

  function regionExtent(r){
    var pts = pointsForRegion(r);
    if (!pts.length) {
      var c = actualCenter(r);
      return { minX: c.x, maxX: c.x, minY: c.y, maxY: c.y, w: 0, h: 0, area: 0 };
    }
    var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    pts.forEach(function(p){
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    });
    var w = Math.max(0, maxX - minX);
    var h = Math.max(0, maxY - minY);
    return { minX: minX, maxX: maxX, minY: minY, maxY: maxY, w: w, h: h, area: w * h };
  }

  function actualCenter(r){
    var c = centerForRegion(r);
    if (c.n) return { x: c.x / c.n, y: c.y / c.n };
    return c;
  }

  function regionKeyNorm(v){
    return String(v === undefined || v === null ? '' : v).trim().replace(/\s+/g, '').toLowerCase();
  }

  function pushUniqueValue(list, value){
    if (value === undefined || value === null || value === '') return;
    var text = String(value);
    if (list.indexOf(text) < 0) list.push(text);
  }

  function regionNameKeys(r){
    var data = Object.assign({}, (r && r.admin) || {}, (r && r.data) || {});
    var out = [];
    [
      r && r.id,
      r && r.name,
      r && r.title,
      r && r.officialName,
      r && r.sourceId,
      r && r.mapRegionId,
      r && r.adminBinding,
      data.id,
      data.name,
      data.title,
      data.officialName,
      data.province,
      data.provinceName,
      data.adminName,
      data.regionName
    ].forEach(function(v){ pushUniqueValue(out, v); });
    return out;
  }

  function plainObject(v){
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  }

  function hasValue(v){
    return v !== undefined && v !== null && v !== '';
  }

  function assignKnown(target){
    for (var i = 1; i < arguments.length; i += 1) {
      var src = arguments[i];
      if (!src || typeof src !== 'object') continue;
      Object.keys(src).forEach(function(k){
        if (hasValue(src[k])) target[k] = src[k];
      });
    }
    return target;
  }

  function regionMatchFields(node, objectKey){
    if (!node || typeof node !== 'object') return [objectKey];
    return [
      objectKey,
      node.id,
      node.sid,
      node.key,
      node.name,
      node.title,
      node.officialName,
      node.province,
      node.provinceName,
      node.adminName,
      node.regionName,
      node.mapRegionId,
      node.sourceId,
      node.adminBinding
    ];
  }

  function findLiveProvinceStats(r){
    var stats = window.GM && GM.provinceStats;
    if (!stats) return null;
    var keys = regionNameKeys(r);
    var wanted = keys.map(regionKeyNorm).filter(Boolean);
    if (!wanted.length) return null;
    if (!Array.isArray(stats) && typeof stats === 'object') {
      for (var i = 0; i < keys.length; i += 1) {
        if (stats[keys[i]] && typeof stats[keys[i]] === 'object') return Object.assign({ _provinceKey: keys[i] }, stats[keys[i]]);
      }
    }
    var rows = Array.isArray(stats) ? stats.map(function(x){ return { key: '', value: x }; }) : Object.keys(stats).map(function(k){ return { key: k, value: stats[k] }; });
    for (var j = 0; j < rows.length; j += 1) {
      var value = rows[j].value;
      if (!value || typeof value !== 'object') continue;
      var fields = regionMatchFields(value, rows[j].key).map(regionKeyNorm).filter(Boolean);
      if (fields.some(function(x){ return wanted.indexOf(x) >= 0; })) return Object.assign({ _provinceKey: rows[j].key }, value);
    }
    return null;
  }

  function findLiveAdminDivision(r){
    var wanted = regionNameKeys(r).map(regionKeyNorm).filter(Boolean);
    if (!wanted.length) return null;
    var roots = [];
    if (window.GM && GM.adminHierarchy) roots.push(GM.adminHierarchy);
    if (window.P && P.adminHierarchy) roots.push(P.adminHierarchy);
    var found = null;
    var seen = [];
    function walk(node, objectKey){
      if (found || !node || typeof node !== 'object') return;
      if (seen.indexOf(node) >= 0) return;
      seen.push(node);
      if (Array.isArray(node)) {
        node.forEach(function(item){ walk(item, objectKey); });
        return;
      }
      var fields = regionMatchFields(node, objectKey).map(regionKeyNorm).filter(Boolean);
      if (fields.some(function(x){ return wanted.indexOf(x) >= 0; })) {
        found = objectKey && !node.name ? Object.assign({ name: objectKey }, node) : node;
        return;
      }
      Object.keys(node).forEach(function(k){
        if (found) return;
        var child = node[k];
        if (!child || typeof child !== 'object') return;
        if (wanted.indexOf(regionKeyNorm(k)) >= 0) {
          found = Object.assign({ name: k }, child);
          return;
        }
        walk(child, k);
      });
    }
    roots.forEach(function(root){ walk(root, ''); });
    return found;
  }

  function liveOwnerFromProvinceMap(r){
    var map = window.GM && GM._provinceToFaction;
    if (!map || typeof map !== 'object') return '';
    var keys = regionNameKeys(r);
    for (var i = 0; i < keys.length; i += 1) {
      if (hasValue(map[keys[i]])) return map[keys[i]];
    }
    var wanted = keys.map(regionKeyNorm).filter(Boolean);
    var hit = Object.keys(map).find(function(k){ return wanted.indexOf(regionKeyNorm(k)) >= 0; });
    return hit && hasValue(map[hit]) ? map[hit] : '';
  }

  function ownerFromRecord(record){
    if (!record || typeof record !== 'object') return '';
    return firstValue(
      record.currentOwner,
      record.currentOwnerName,
      record.controller,
      record.controllerName,
      record.owner,
      record.ownerName,
      record.currentOwnerKey,
      record.controllerKey,
      record.ownerKey,
      record.factionId,
      record.factionKey,
      record.factionName,
      record.currentFactionName,
      record.power,
      record.realm
    );
  }

  function liveRegionOwner(r, liveStats, liveDivision){
    return firstValue(
      liveOwnerFromProvinceMap(r),
      ownerFromRecord(liveStats || findLiveProvinceStats(r)),
      ownerFromRecord(liveDivision || findLiveAdminDivision(r))
    );
  }

  function ownerKey(r){
    if (!r) return '';
    var liveOwner = liveRegionOwner(r);
    if (liveOwner) return String(liveOwner);
    var data = Object.assign({}, r.admin || {}, r.data || {});
    return String(r.currentOwner || r.controller || r.owner || r.currentOwnerKey || r.controllerKey || r.ownerKey || r.factionId || data.factionId || data.groupKey || '');
  }

  function ownerName(r){
    if (!r) return '';
    var f = findFaction(ownerKey(r), r.factionName || r.ownerName);
    return (f && (f.label || f.name || f.scenarioFactionName)) || r.factionName || r.ownerName || ownerKey(r) || '未记';
  }

  function canonicalOwnerKey(r){
    var raw = ownerKey(r);
    var f = findFaction(raw, r && (r.factionName || r.ownerName));
    return (f && (f.stableOwnerKey || f.mapFactionId || f.id)) || raw;
  }

  function factionsMap(){
    var map = getMapData() || {};
    return map.factions || map.factionColors || {};
  }

  function normKey(v){
    return String(v === undefined || v === null ? '' : v).trim().toLowerCase();
  }

  function factionTokens(f, key, name){
    var out = [key, name];
    if (f) {
      out.push(f.id, f.sid, f.key, f.scenarioFactionId, f.runtimeFactionId, f.mapFactionId);
      out.push(f.name, f.label, f.short, f.scenarioFactionName, f.ownerKey, f.stableOwnerKey);
    }
    return out.filter(function(x){ return x !== undefined && x !== null && x !== ''; }).map(normKey);
  }

  function liveFactionList(){
    var lists = [];
    var gm = window.GM || {};
    var p = window.P || {};
    var sc = getActiveScenario();
    if (Array.isArray(gm.facs)) lists.push(gm.facs);
    if (Array.isArray(gm.factions)) lists.push(gm.factions);
    if (Array.isArray(p.factions)) lists.push(p.factions);
    if (sc && Array.isArray(sc.factions)) lists.push(sc.factions);
    var sid = activeScenarioId();
    var seen = {};
    var out = [];
    lists.forEach(function(list){
      list.forEach(function(f, i){
        if (!f || typeof f !== 'object') return;
        if (sid && f.sid && String(f.sid) !== sid) return;
        var key = String(f.id || f.sid || f.key || f.name || f.label || ('live-' + i));
        if (seen[key]) return;
        seen[key] = true;
        out.push(f);
      });
    });
    return out;
  }

  function bestLiveFaction(mapFaction, key, name){
    var want = factionTokens(mapFaction, key, name);
    var live = liveFactionList();
    var best = null;
    var bestScore = 0;
    live.forEach(function(f){
      var tokens = factionTokens(f);
      var score = 0;
      tokens.forEach(function(t){
        if (!t) return;
        if (want.indexOf(t) >= 0) score += 10;
        want.forEach(function(w){
          if (!w || w === t) return;
          if (w.length >= 2 && t.length >= 2 && (w.indexOf(t) >= 0 || t.indexOf(w) >= 0)) score += 2;
        });
      });
      if (score > bestScore) {
        bestScore = score;
        best = f;
      }
    });
    return bestScore > 0 ? best : null;
  }

  function mergeFactionData(mapFaction, liveFaction, stableKey){
    var merged = Object.assign({}, mapFaction || {}, liveFaction || {});
    var mapId = mapFaction && (mapFaction.id || mapFaction.key || stableKey);
    var liveId = liveFaction && (liveFaction.id || liveFaction.sid || liveFaction.key);
    merged.id = stableKey || mapId || liveId || merged.id || '';
    merged.mapFactionId = mapId || '';
    merged.runtimeFactionId = liveId || '';
    merged.stableOwnerKey = stableKey || mapId || merged.ownerKey || '';
    merged.label = firstValue(liveFaction && liveFaction.label, liveFaction && liveFaction.name, mapFaction && mapFaction.label, merged.label, merged.name);
    merged.name = firstValue(liveFaction && liveFaction.name, liveFaction && liveFaction.label, mapFaction && mapFaction.name, mapFaction && mapFaction.label, merged.name, merged.label);
    merged.short = firstValue(liveFaction && liveFaction.short, mapFaction && mapFaction.short, merged.short, merged.label, merged.name);
    merged.color = firstValue(liveFaction && liveFaction.color, mapFaction && mapFaction.color, mapFaction && mapFaction.line, merged.color);
    merged.line = firstValue(liveFaction && liveFaction.line, mapFaction && mapFaction.line, mapFaction && mapFaction.color, merged.line);
    merged._mapFaction = mapFaction || null;
    merged._runtimeFaction = liveFaction || null;
    return merged;
  }

  function findFaction(key, name){
    var fmap = factionsMap();
    var mapHit = null;
    var stableKey = key || '';
    if (key && fmap[key]) mapHit = Object.assign({ id: key }, fmap[key]);
    var vals = Object.keys(fmap).map(function(k){ return Object.assign({ id: k }, fmap[k]); });
    if (!mapHit) {
      mapHit = vals.find(function(f){
        return normKey(f.scenarioFactionId) === normKey(key) ||
          normKey(f.id) === normKey(key) ||
          normKey(f.label || f.name || f.scenarioFactionName) === normKey(name || key);
      }) || null;
      if (mapHit) stableKey = mapHit.id || stableKey;
    }
    var liveHit = bestLiveFaction(mapHit, stableKey || key, name || (mapHit && (mapHit.label || mapHit.name)));
    if (mapHit || liveHit) return mergeFactionData(mapHit, liveHit, stableKey || (mapHit && mapHit.id) || key || '');
    return null;
  }

  function heatColor(value, low, high, colors){
    var n = Number(value);
    if (!isFinite(n)) n = low;
    var t = Math.max(0, Math.min(1, (n - low) / Math.max(1, high - low)));
    return t < .34 ? colors[0] : (t < .67 ? colors[1] : colors[2]);
  }

  function regionColor(r){
    var b = regionBundle(r);
    var data = b.data || {};
    if (state.mapMode === 'tax') return heatColor(firstValue(b.fiscal.actualRevenue, r && r.tax, r && r.development), 0, 3000000, ['#6f8a72','#b8994c','#c65b3d']);
    if (state.mapMode === 'mood') return heatColor(firstValue(data.minxinLocal, r && r.mood, r && r.prosperity), 20, 85, ['#b94a3c','#b69650','#6f9f88']);
    if (state.mapMode === 'army') return heatColor(firstValue(data.garrison, b.army.troops, data.armyPressure, r && r.troops, r && r.armyPressure), 0, 250000, ['#7b8467','#b98e4c','#b6533f']);
    var f = findFaction(ownerKey(r), r.factionName || r.ownerName);
    return (f && (f.color || f.line)) || r.factionColor || r.color || '#b7914f';
  }

  function ownerGroups(map){
    var groups = {};
    (map && map.regions || []).forEach(function(r){
      var key = canonicalOwnerKey(r);
      if (!key) return;
      var c = actualCenter(r);
      if (!isFinite(c.x) || !isFinite(c.y)) return;
      if (!groups[key]) {
        groups[key] = { key: key, name: ownerName(r), color: regionColor(r), x: 0, y: 0, n: 0, area: 0, minX: c.x, maxX: c.x, minY: c.y, maxY: c.y };
      }
      var g = groups[key];
      var ext = regionExtent(r);
      g.x += c.x;
      g.y += c.y;
      g.n += 1;
      g.area += Math.max(1, ext.area || 0);
      g.minX = Math.min(g.minX, ext.minX, c.x);
      g.maxX = Math.max(g.maxX, ext.maxX, c.x);
      g.minY = Math.min(g.minY, ext.minY, c.y);
      g.maxY = Math.max(g.maxY, ext.maxY, c.y);
    });
    return Object.keys(groups).map(function(k){
      var g = groups[k];
      g.x = g.x / Math.max(1, g.n);
      g.y = g.y / Math.max(1, g.n);
      g.span = Math.sqrt(Math.pow(Math.max(0, g.maxX - g.minX), 2) + Math.pow(Math.max(0, g.maxY - g.minY), 2));
      return g;
    }).sort(function(a, b){ return b.n - a.n; });
  }

  function factionLabelLayer(map){
    var groups = ownerGroups(map);
    var maxArea = Math.max.apply(null, groups.map(function(g){ return Number(g.area || 0); }).concat([1]));
    var maxN = Math.max.apply(null, groups.map(function(g){ return Number(g.n || 0); }).concat([1]));
    var maxSpan = Math.max.apply(null, groups.map(function(g){ return Number(g.span || 0); }).concat([1]));
    return groups.map(function(g){
      var name = realmFactionName(g);
      var size = realmLabelSize(g, maxArea, maxN, maxSpan, name);
      var rotate = realmLabelRotation(g.key || name);
      return '<g class="tmf-faction-label" data-faction-key="' + attr(g.key) + '" style="--realm-label-size:' + attr(size) + 'px" transform="translate(' + attr(g.x) + ' ' + attr(g.y) + ') rotate(' + attr(rotate) + ')" onclick="TMPhase8FormalBridge.openFactionByKey(\'' + attr(g.key) + '\')">' +
        '<text class="main" x="0" y="0" text-anchor="middle">' + esc(name) + '</text>' +
      '</g>';
    }).join('');
  }

  function realmLabelSize(g, maxArea, maxN, maxSpan, name){
    var areaScore = maxArea ? Math.sqrt(Math.max(0, Number(g.area || 0)) / maxArea) : 0;
    var countScore = maxN ? Math.sqrt(Math.max(0, Number(g.n || 0)) / maxN) : 0;
    var spanScore = maxSpan ? Math.sqrt(Math.max(0, Number(g.span || 0)) / maxSpan) : 0;
    var score = Math.max(0.05, areaScore * 0.56 + countScore * 0.28 + spanScore * 0.16);
    var size = 16 + score * 40;
    if (Number(g.n || 0) <= 1) size = Math.min(size, 24);
    var len = String(name || '').length;
    if (len >= 5) size *= 0.9;
    if (len >= 7) size *= 0.82;
    return Math.round(Math.max(16, Math.min(56, size)));
  }

  function realmFactionName(g){
    var raw = (g && (g.name || g.key)) || '';
    var name = cleanDisplayValue(raw);
    if (!name || name === '已记录') name = String(raw || '未记势力');
    return name.replace(/朝廷$/g, '').replace(/^大明帝国$/g, '大明');
  }

  function realmFactionSub(g){
    if (!g) return '势力范围';
    var live = null;
    try { live = bestLiveFaction(g.key, { name: g.name }); } catch (_) { live = null; }
    var stance = cleanDisplayValue(live && (live.stance || live.diplomacy || live.posture || live.type));
    if (stance && stance !== '已记录' && stance !== realmFactionName(g)) return stance + ' · ' + (g.n || 0) + '地';
    return (g.n || 0) + '地 · 势力范围';
  }

  function realmLabelRotation(seed){
    var s = String(seed || '');
    var n = 0;
    for (var i = 0; i < s.length; i += 1) n = (n + s.charCodeAt(i) * (i + 3)) % 997;
    return (n % 13) - 6;
  }

  function renderFormalMapSoon(){
    clearTimeout(state.mapRenderTimer);
    state.mapRenderTimer = setTimeout(renderFormalMap, 0);
  }

  function zoomMap(factor){
    var v = state.mapView || { scale: 1, tx: 0, ty: 0 };
    v.scale = Math.max(0.72, Math.min(4.2, Number(v.scale || 1) * (factor || 1)));
    state.mapView = v;
    applyMapTransform();
  }

  function resetMapView(){
    state.mapView = { scale: 1, tx: 0, ty: 0 };
    applyMapTransform();
  }

  function updateMapChrome(){
    var wrap = document.getElementById('mapwrap');
    if (wrap) {
      wrap.dataset.mapMode = state.mapMode || 'owner';
      wrap.dataset.mapScale = state.mapScale || 'region';
    }
    document.querySelectorAll('.map-layer').forEach(function(btn){
      var on = btn.dataset.mapMode === state.mapMode;
      btn.classList.toggle('on', on);
      btn.setAttribute('aria-pressed', String(on));
    });
    document.querySelectorAll('[data-map-scale]').forEach(function(btn){
      if (btn.id === 'mapwrap') return;
      var on = btn.dataset.mapScale === state.mapScale;
      btn.classList.toggle('on', on);
      btn.setAttribute('aria-pressed', String(on));
    });
    var mode = document.getElementById('map-tools-mode');
    if (mode) mode.textContent = mapModeTitle();
    var hint = document.getElementById('tmf-map-hint');
    if (hint) hint.textContent = mapScaleNote() + ' · ' + mapModeNote();
  }

  function mapScaleNote(){
    return ({ realm:'天下视域', region:'行省视域', prefecture:'府县视域' })[state.mapScale || 'region'] || '行省视域';
  }

  function mapModeNote(){
    return ({
      owner:'按势力归属着色',
      tax:'按财赋压力着色',
      mood:'按民情冷暖着色',
      army:'按军务态势着色',
      office:'按官守治理着色'
    })[state.mapMode || 'owner'] || '按势力归属着色';
  }

  function renderFormalMap(){
    var shell = document.getElementById('tm-phase8-main-shell');
    var stage = mapStage();
    if (!shell || !stage || !isGameVisible()) return;
    var map = getMapData();
    if (!map || !Array.isArray(map.regions) || !map.regions.length) {
      stage.innerHTML = '<div class="tmf-map-loading">舆图数据尚未载入</div>';
      state.mapLoadRetry = (state.mapLoadRetry || 0) + 1;
      if (state.mapLoadRetry <= 80) setTimeout(renderFormalMapSoon, state.mapLoadRetry < 12 ? 250 : 700);
      return;
    }
    state.mapLoadRetry = 0;
    var width = Number(map.width || 1200);
    var height = Number(map.height || 720);
    var oceans = Array.isArray(map.oceans) ? map.oceans : [];
    var mapId = mapIdentity(map);
    var basemap = resolveBasemap(map);
    var basemapLayer = generatedBasemapLayer(map, basemap);
    var regionWashes = map.regions.map(function(r){
      var d = pathForRegion(r);
      if (!d) return '';
      return '<path class="tmf-region-wash ming-region-wash" data-id="' + attr(r.id || r.name || '') + '" data-region-id="' + attr(r.id || r.name || '') + '" d="' + attr(d) + '" fill="' + attr(regionColor(r)) + '" fill-rule="evenodd"></path>';
    }).join('');
    var regionHalos = map.regions.map(function(r){
      var d = pathForRegion(r);
      if (!d) return '';
      return '<path class="tmf-region-halo ming-region-halo" data-id="' + attr(r.id || r.name || '') + '" data-region-id="' + attr(r.id || r.name || '') + '" d="' + attr(d) + '"></path>';
    }).join('');
    var regionPaths = map.regions.map(function(r){
      var d = pathForRegion(r);
      if (!d) return '';
      var c = actualCenter(r);
      var labelText = String(r.title || r.name || r.officialName || '');
      var labelWidth = Math.max(34, Math.min(96, labelText.length * 13 + 18));
      return '<path class="tmf-region ming-region" data-id="' + attr(r.id || r.name || '') + '" data-region-id="' + attr(r.id || r.name || '') + '" d="' + attr(d) + '" fill="' + attr(regionColor(r)) + '" fill-rule="evenodd"></path>' +
        '<g class="tmf-region-label ming-label" transform="translate(' + attr(c.x) + ' ' + attr(c.y) + ')"><rect x="' + attr(-labelWidth / 2) + '" y="-10" width="' + attr(labelWidth) + '" height="20"></rect><text x="0" y="0">' + esc(labelText) + '</text></g>';
    }).join('');
    var oceanPaths = oceans.map(function(r){
      var d = pathForRegion(r);
      if (!d) return '';
      var c = actualCenter(r);
      return '<path class="tmf-ocean ming-ocean ming-ocean-region" data-id="' + attr(r.id || r.name || '') + '" d="' + attr(d) + '" fill-rule="evenodd"></path>' +
        '<text class="tmf-ocean-label ming-ocean-label" x="' + attr(c.x) + '" y="' + attr(c.y) + '">' + esc(r.title || r.name || '') + '</text>';
    }).join('');
    stage.innerHTML =
      '<div class="ming-map-camera">' +
      '<svg id="tmf-formal-map" class="ming-map-svg" viewBox="0 0 ' + width + ' ' + height + '" role="img">' +
        '<defs>' +
          '<filter id="tmfPaperNoise"><feTurbulence type="fractalNoise" baseFrequency=".92" numOctaves="2" result="n"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 .07"/></feComponentTransfer></filter>' +
          '<radialGradient id="tmf-ming-paper" cx="52%" cy="46%" r="66%"><stop offset="0" stop-color="#e1be73" stop-opacity=".18"/><stop offset=".72" stop-color="#8b632f" stop-opacity=".06"/><stop offset="1" stop-color="#000000" stop-opacity="0"/></radialGradient>' +
          '<radialGradient id="tmf-east-sea" cx="62%" cy="52%" r="75%"><stop offset="0" stop-color="#617c6f" stop-opacity=".18"/><stop offset=".62" stop-color="#466a61" stop-opacity=".08"/><stop offset="1" stop-color="#1c2b2c" stop-opacity="0"/></radialGradient>' +
        '</defs>' +
        '<g id="tmf-map-world" class="tmf-map-world ming-map-world">' +
          '<rect class="tmf-map-paper-fill" x="0" y="0" width="' + width + '" height="' + height + '"></rect>' +
          basemapLayer +
          oceanPaths +
          '<g class="tmf-region-washes">' + regionWashes + '</g>' +
          '<g class="tmf-region-halos">' + regionHalos + '</g>' +
          '<g class="tmf-region-layer ming-admin-layer">' + regionPaths + '</g>' +
          '<g class="tmf-faction-label-layer">' + factionLabelLayer(map) + '</g>' +
          '<rect class="tmf-map-grain" x="0" y="0" width="' + width + '" height="' + height + '"></rect>' +
        '</g>' +
      '</svg></div>';
    stage.dataset.width = String(width);
    stage.dataset.height = String(height);
    stage.dataset.mapId = mapId;
    applyMapTransform();
    updateMapChrome();
    renderLegend(map);
    renderMapAlerts(map);
    syncMapSearch(map);
    bindRegionPathEvents(map);
  }

  function renderLegend(map){
    var host = document.getElementById('tmf-map-legend');
    if (!host) return;
    var regions = (map && map.regions) || [];
    var seen = {};
    var entries = [];
    regions.forEach(function(r){
      var key = canonicalOwnerKey(r);
      if (!key || seen[key]) return;
      seen[key] = true;
      entries.push({ key: key, name: ownerName(r), color: regionColor(r) });
    });
    if (state.mapMode !== 'owner') {
      host.innerHTML = '<div class="map-legend-title"><span class="map-legend-mode"><i class="map-legend-mark"></i><span class="map-legend-name">' + esc(mapModeTitle()) + '</span></span><span class="map-legend-sub">' + esc(mapScaleNote()) + '</span></div>' +
        '<div class="map-legend-main"><div class="map-legend-bar"></div><div class="map-legend-scale"><span>低</span><span>中</span><span>高</span></div></div>' +
        '<div class="map-legend-detail"><p class="map-legend-note">' + esc(mapModeNote()) + '。颜色随当前运行字段即时重绘，点击地块查看档案。</p></div>';
      return;
    }
    host.innerHTML = '<div class="map-legend-title"><span class="map-legend-mode"><i class="map-legend-mark"></i><span class="map-legend-name">势力版图</span></span><span class="map-legend-sub">' + esc(entries.length) + ' 方</span></div>' +
      '<div class="map-legend-main"><div class="map-owner-row">' + entries.slice(0, 3).map(function(e){
        return '<span class="map-owner-swatch"><i style="background:' + attr(e.color) + '"></i>' + esc(e.name) + '</span>';
      }).join('') + '</div></div>' +
      '<div class="map-legend-detail"><p class="map-legend-note">点击色块查看势力档案，右键任一地块打开所属势力。</p><div class="tmf-legend-list">' + entries.slice(0, 10).map(function(e){
        return '<button type="button" onclick="TMPhase8FormalBridge.openFactionByKey(\'' + attr(e.key) + '\')"><span style="background:' + attr(e.color) + '"></span>' + esc(e.name) + '</button>';
      }).join('') + '</div></div>';
  }

  function regionSearchText(r){
    return [r && (r.title || r.name || r.officialName), r && ownerName(r), r && (r.governor || r.official || r.office || r.capital || r.note)].filter(Boolean).join(' ');
  }

  function syncMapSearch(map){
    var list = document.getElementById('map-region-list');
    if (list && map && Array.isArray(map.regions)) {
      list.innerHTML = map.regions.map(function(r){ return '<option value="' + attr(r.title || r.name || r.officialName || '') + '"></option>'; }).join('');
    }
    var input = document.getElementById('map-search');
    if (input) renderMapSearchResults(input.value || '');
  }

  function renderMapSearchResults(q){
    var host = document.getElementById('map-search-results');
    if (!host) return;
    var map = getMapData();
    var regions = map && Array.isArray(map.regions) ? map.regions : [];
    var query = String(q || '').trim().toLowerCase();
    var rows = regions.filter(function(r){
      return !query || regionSearchText(r).toLowerCase().indexOf(query) >= 0;
    }).slice(0, 6);
    host.innerHTML = rows.map(function(r){
      return '<button type="button" data-region-id="' + attr(r.id || r.name || r.title || '') + '" onclick="TMPhase8FormalBridge.focusRegion(\'' + attr(r.id || r.name || r.title || '') + '\')"><b>' + esc(r.title || r.name || r.officialName || '未名地块') + '</b><span>' + esc(ownerName(r)) + '</span></button>';
    }).join('');
  }

  function focusRegion(id, open){
    var r = findRegion(id);
    if (!r) return;
    var map = getMapData();
    var c = actualCenter(r);
    if (map && c) {
      state.mapView.scale = Math.max(state.mapView.scale || 1, 1.45);
      state.mapView.tx = Number(map.width || 1200) * .52 - c.x * state.mapView.scale;
      state.mapView.ty = Number(map.height || 720) * .48 - c.y * state.mapView.scale;
      applyMapTransform();
    }
    var el = document.querySelector('.tmf-region[data-region-id="' + cssEscape(id) + '"]');
    document.querySelectorAll('.tmf-region.selected').forEach(function(x){ x.classList.remove('selected'); });
    if (el) el.classList.add('selected');
    if (open !== false) openRegionDossier(r);
  }

  function mapModeTitle(){
    return ({ owner:'势力', tax:'财赋', mood:'民情', army:'军务', office:'官守' })[state.mapMode] || '势力';
  }

  function applyMapTransform(){
    var world = document.getElementById('tmf-map-world');
    if (!world) return;
    var v = state.mapView || { scale: 1, tx: 0, ty: 0 };
    world.setAttribute('transform', 'translate(' + v.tx.toFixed(2) + ' ' + v.ty.toFixed(2) + ') scale(' + v.scale.toFixed(4) + ')');
    var stage = mapStage();
    if (stage) stage.classList.toggle('zoomed', v.scale > 1.35);
  }

  function regionPathFromPoint(e){
    if (!e) return null;
    var direct = e.target && e.target.closest ? e.target.closest('.tmf-region,.ming-region') : null;
    if (direct) return direct;
    var stack = document.elementsFromPoint ? document.elementsFromPoint(e.clientX, e.clientY) : [document.elementFromPoint(e.clientX, e.clientY)];
    return (stack || []).find(function(el){
      return el && el.classList && (el.classList.contains('tmf-region') || el.classList.contains('ming-region'));
    }) || null;
  }

  function bindRegionPathEvents(map){
    var regions = map && Array.isArray(map.regions) ? map.regions : [];
    document.querySelectorAll('#tmf-formal-map .tmf-region').forEach(function(el){
      if (el.__phase8RegionBound) return;
      el.__phase8RegionBound = true;
      el.addEventListener('click', function(e){
        if (state.dragSuppressClick) return;
        e.stopPropagation();
        var r = findRegion(el.dataset.regionId || el.dataset.id);
        if (r) openRegionDossier(r);
      });
      el.addEventListener('contextmenu', function(e){
        e.preventDefault();
        e.stopPropagation();
        var r = findRegion(el.dataset.regionId || el.dataset.id);
        if (r) openFactionDossier(ownerKey(r), r);
      });
    });
    if (!regions.length) return;
  }

  function installMapInteraction(){
    var stage = mapStage();
    if (!stage || stage.__phase8MapBound) return;
    stage.__phase8MapBound = true;
    function clearMapSelection(){
      try {
        var sel = window.getSelection && window.getSelection();
        if (sel && typeof sel.removeAllRanges === 'function') sel.removeAllRanges();
      } catch(_) {}
    }
    function preventMapSelection(e){
      if (e && typeof e.preventDefault === 'function') e.preventDefault();
      clearMapSelection();
    }
    stage.addEventListener('selectstart', preventMapSelection, { passive: false });
    stage.addEventListener('dragstart', preventMapSelection, { passive: false });
    stage.addEventListener('wheel', function(e){
      e.preventDefault();
      var map = getMapData();
      if (!map) return;
      var rect = stage.getBoundingClientRect();
      var width = Number(map.width || stage.dataset.width || 1200);
      var height = Number(map.height || stage.dataset.height || 720);
      var x = (e.clientX - rect.left) / rect.width * width;
      var y = (e.clientY - rect.top) / rect.height * height;
      var old = state.mapView.scale || 1;
      var next = Math.max(.85, Math.min(3.4, old * (e.deltaY < 0 ? 1.14 : .88)));
      state.mapView.tx = x - (x - (state.mapView.tx || 0)) * (next / old);
      state.mapView.ty = y - (y - (state.mapView.ty || 0)) * (next / old);
      state.mapView.scale = next;
      applyMapTransform();
    }, { passive: false });
    stage.addEventListener('pointerdown', function(e){
      if (e.button !== 0) return;
      if (e.cancelable) e.preventDefault();
      clearMapSelection();
      state.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, tx: state.mapView.tx || 0, ty: state.mapView.ty || 0, moved: false };
      stage.setPointerCapture(e.pointerId);
      stage.classList.add('dragging');
    });
    stage.addEventListener('pointermove', function(e){
      if (!state.drag || state.drag.id !== e.pointerId) return;
      var map = getMapData();
      if (!map) return;
      var rect = stage.getBoundingClientRect();
      var dx = (e.clientX - state.drag.x) / rect.width * Number(map.width || 1200);
      var dy = (e.clientY - state.drag.y) / rect.height * Number(map.height || 720);
      if (Math.abs(dx) + Math.abs(dy) > 2) {
        state.drag.moved = true;
        clearMapSelection();
      }
      state.mapView.tx = state.drag.tx + dx;
      state.mapView.ty = state.drag.ty + dy;
      applyMapTransform();
    });
    stage.addEventListener('pointerup', function(e){
      if (state.drag && state.drag.id === e.pointerId) {
        state.dragSuppressClick = state.drag.moved;
        state.drag = null;
        stage.classList.remove('dragging');
        clearMapSelection();
        setTimeout(function(){ state.dragSuppressClick = false; }, 0);
      }
    });
    stage.addEventListener('dblclick', function(){
      state.mapView = { scale: 1, tx: 0, ty: 0 };
      applyMapTransform();
    });
    stage.addEventListener('click', function(e){
      if (state.dragSuppressClick) return;
      var path = regionPathFromPoint(e);
      if (!path) return;
      var r = findRegion(path.dataset.regionId || path.dataset.id);
      if (r) openRegionDossier(r);
    });
    stage.addEventListener('contextmenu', function(e){
      var path = regionPathFromPoint(e);
      if (!path) return;
      e.preventDefault();
      var r = findRegion(path.dataset.regionId || path.dataset.id);
      if (r) openFactionDossier(ownerKey(r), r);
    });
    stage.addEventListener('mousemove', function(e){
      var path = regionPathFromPoint(e);
      var tip = document.getElementById('tmf-map-tip');
      if (!tip) return;
      if (!path) {
        tip.classList.remove('show');
        return;
      }
      var r = findRegion(path.dataset.regionId || path.dataset.id);
      if (!r) return;
      var data = r.data || {};
      tip.innerHTML = '<b>' + esc(r.title || r.name) + '</b><span>' + esc(ownerName(r)) + ' · ' + esc(data.officialPosition || r.terrain || '未记') + '</span>';
      tip.style.left = (e.clientX + 12) + 'px';
      tip.style.top = (e.clientY + 12) + 'px';
      tip.classList.add('show');
    });
  }

  function findRegion(id){
    var map = getMapData();
    var key = String(id == null ? '' : id);
    return map && Array.isArray(map.regions) ? map.regions.find(function(r){
      return [r.id, r.name, r.title, r.officialName, r.sourceId, r.mapRegionId, r.adminBinding].some(function(v){
        return String(v == null ? '' : v) === key;
      });
    }) : null;
  }

  function metric(value, fallback){
    if (value == null || value === '') return fallback == null ? '未记' : fallback;
    return value;
  }

  function fmtNum(v, unit){
    var n = Number(v);
    if (!isFinite(n)) return metric(v);
    if (Math.abs(n) >= 10000) return Math.round(n / 10000) + '万' + (unit || '');
    return String(Math.round(n)) + (unit || '');
  }

  function dossierRows(rows){
    return '<div class="tmf-dossier-rows">' + rows.map(function(r){
      return '<div><span>' + esc(r[0]) + '</span><b>' + esc(metric(r[1])) + '</b></div>';
    }).join('') + '</div>';
  }

  function closeMapDossier(){
    var old = document.getElementById('tmf-map-dossier');
    if (old) old.remove();
  }

  var MAP_REGION_TABS = [
    ['overview', '总览'],
    ['mood', '民情'],
    ['tax', '财赋'],
    ['army', '军务'],
    ['office', '官守'],
    ['owner', '势力']
  ];

  var MAP_FACTION_TABS = [
    ['records', '档案'],
    ['overview', '总览'],
    ['territory', '版图'],
    ['military', '军务'],
    ['finance', '财赋'],
    ['relations', '关系']
  ];

  MAP_FACTION_TABS.sort(function(a, b){
    var order = { overview: 1, territory: 2, military: 3, finance: 4, relations: 5, records: 6 };
    return (order[a[0]] || 99) - (order[b[0]] || 99);
  });

  var MAP_MODE_META = {
    overview: { title: '地块总览', mark: '览', note: '汇总地形、户口、财赋、军务、官守与势力归属，作为点击地块后的默认档案。' },
    owner: { title: '势力归属', mark: '势', note: '显示当前控制者、法理归属和所属势力，用来判断此地听命于谁。' },
    mood: { title: '民情冷暖', mark: '民', note: '显示民心、逃户、灾异与地方不满，用来判断此地是否容易生变。' },
    tax: { title: '财赋压力', mark: '赋', note: '显示应征、实征、留用、银粮和税负，用来判断此地能否支撑朝廷。' },
    army: { title: '军务态势', mark: '军', note: '显示驻军、城防、边警和军压，用来判断此地是否需要调兵或拨饷。' },
    office: { title: '官守治理', mark: '官', note: '显示主官、官缺、腐败和政令执行，用来判断地方治理是否失衡。' }
  };

  function firstValue(){
    for (var i = 0; i < arguments.length; i += 1) {
      var v = arguments[i];
      if (v !== undefined && v !== null && v !== '') return v;
    }
    return '';
  }

  function objectValue(o, keys){
    if (!o || typeof o !== 'object') return '';
    for (var i = 0; i < keys.length; i += 1) {
      var v = o[keys[i]];
      if (v !== undefined && v !== null && v !== '') return v;
    }
    return '';
  }

  function splitFieldWords(raw){
    return String(raw || '')
      .replace(/^_+/, '')
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[-_]+/g, ' ')
      .split(/\s+/)
      .filter(Boolean);
  }

  function readableUnknownField(raw){
    raw = String(raw || '').trim();
    if (!raw) return '';
    var direct = {
      x: '横坐标', y: '纵坐标', d: '路径', line: '线段', path: '路径', polygon: '多边形',
      coords: '坐标', points: '坐标点', width: '宽度', height: '高度', color: '颜色',
      fac: '势力', self: '自身', to: '对方', from: '来源', old: '旧值', value: '数值',
      active: '启用', enabled: '启用', pending: '待处理', mutable: '可变'
    };
    if (direct[raw]) return direct[raw];
    if (/^fac[-_]/i.test(raw)) {
      try {
        var fac = findFaction(raw);
        if (fac) return '势力·' + (fac.label || fac.name || fac.scenarioFactionName || raw);
      } catch(_) {}
      return '势力编号·' + raw.replace(/^fac[-_]/i, '');
    }
    if (/^among[A-Z]/.test(raw)) {
      return '影响对象·' + readableUnknownField(raw.slice(5));
    }
    if (/^in[_-]/i.test(raw)) {
      return '所在范围·' + readableUnknownField(raw.replace(/^in[_-]/i, ''));
    }
    var wordMap = {
      ai: 'AI', npc: 'NPC', voc: 'VOC',
      id: '编号', sid: '剧本编号', key: '键', source: '来源', refs: '依据',
      map: '地图', runtime: '运行态', stable: '稳定', scenario: '剧本', supplement: '补充',
      faction: '势力', region: '地块', land: '陆地', ocean: '海域', owner: '归属',
      ownership: '归属', controller: '实际控制', current: '当前', initial: '初始',
      dejure: '法理', legal: '法理', core: '核心', border: '边缘',
      name: '名称', label: '称谓', short: '简称', type: '类型', sub: '子项',
      detail: '明细', profile: '画像', contract: '契约', role: '角色', style: '风格',
      leader: '首领', ruler: '君主', heir: '继嗣', chancellor: '宰辅', general: '主将',
      title: '头衔', rank: '位阶', government: '政体', posture: '姿态',
      population: '人口', mouths: '口数', households: '户数', ding: '丁口',
      registered: '在册', actual: '实数', hidden: '隐匿', fugitives: '逃户',
      male: '男丁', female: '女口', young: '少壮', old: '老弱',
      fiscal: '财政', revenue: '税额', claimed: '应征', remitted: '起运',
      retained: '留用', compliance: '合规率', skimming: '截留', autonomy: '自主',
      treasury: '府库', money: '银', grain: '粮', cloth: '布', horses: '马',
      economy: '经济', economic: '经济', commerce: '商业', volume: '额',
      coefficient: '系数', agriculture: '农业', arable: '可耕地', farmland: '耕地',
      handicraft: '手工业', mining: '矿业', trade: '贸易', routes: '路线',
      maritime: '海贸', tribute: '朝贡', currency: '货币',
      army: '军务', military: '军事', troops: '兵力', militia: '民兵',
      standing: '常备', artillery: '火炮', fleet: '舰队', fortification: '城防',
      supply: '补给', pressure: '压力', readiness: '备战度', casualties: '伤亡',
      war: '战争', front: '战线', fronts: '战线', mobilization: '动员',
      office: '官守', official: '官员', governor: '主官', position: '职名',
      vacancy: '官缺', corruption: '贪腐', execution: '执行', policy: '政策',
      local: '地方', gentry: '士绅', academies: '书院', religious: '宗教',
      sites: '场所', baojia: '保甲', jia: '甲', pai: '牌', bao: '保',
      mood: '民情', minxin: '民心', prosperity: '繁荣', carrying: '承载',
      capacity: '上限', disaster: '灾异', disasters: '灾异', unrest: '不稳',
      threats: '威胁', risk: '风险', risks: '风险', severity: '烈度',
      terrain: '地势', climate: '气候', water: '水利', roads: '道路',
      road: '道路', post: '驿递', relays: '驿站', port: '港口',
      salt: '盐课', mineral: '矿课', horse: '马政', fishing: '渔课',
      imperial: '皇室', domain: '皇庄', assets: '资产',
      culture: '文化', cultural: '文化', faith: '信仰', belief: '信仰',
      ethnicity: '族群', ethnic: '族群', ethnicities: '族群', gender: '性别',
      age: '年龄', settlement: '聚落', commoners: '平民', elite: '精英',
      relation: '关系', relations: '关系', relationship: '关系', allies: '盟友',
      enemies: '敌对', neutrals: '中立', attitude: '态度', player: '玩家',
      influence: '影响', court: '朝堂', popular: '民间', cohesion: '凝聚',
      prestige: '威望', loyalty: '忠诚', stability: '稳定', confidence: '可信度',
      strategy: '方略', strategic: '战略', priorities: '优先', goal: '目标',
      opening: '开局', problems: '问题', hints: '提示', decision: '决策',
      taboo: '禁忌', moves: '动作', counterplay: '应对', mitigations: '缓解',
      events: '事件', event: '事件', history: '历史', historical: '历史',
      notes: '备注', note: '备注', description: '叙述', desc: '叙述',
      technology: '技术', tech: '技术', learning: '学术', astronomy: '天文',
      mathematics: '算学', medicine: '医学', navigation: '航海', cartography: '舆图',
      printing: '刊印', metallurgy: '冶铁', shipbuilding: '造船',
      victory: '胜利', defeat: '失败', conditions: '条件',
      data: '数据', confidence: '可信度', readable: '可读', apply: '应用',
      function: '函数', visible: '可见', theme: '主题'
    };
    var words = splitFieldWords(raw);
    if (!words.length) return raw;
    var translated = words.map(function(w){
      var lower = w.toLowerCase();
      return wordMap[lower] || (/^[\u4e00-\u9fa5]/.test(w) ? w : '');
    }).filter(Boolean);
    if (translated.length) return translated.join('');
    return raw;
  }

  function fieldLabel(k){
    var map = {
      id: '编号', sid: '剧本编号', key: '键名', name: '名称', label: '称谓', short: '简称', type: '类型',
      factionType: '势力类型', leader: '首领', leaderName: '首领', leaderTitle: '称号', ruler: '君主',
      capital: '首府', home: '核心据点', government: '政体', rank: '位阶', desc: '说明', description: '叙述',
      note: '备注', goal: '目标', strategy: '方略', longTermStrategy: '长期方略', agenda: '议程',
      territory: '领土', resources: '资源', mainResources: '核心资源', ideology: '理念', mainstream: '主流',
      culture: '文化', personality: '性格', traits: '特质', members: '成员', history: '历史',
      historicalEvents: '历史事件', relations: '关系', allies: '盟友', enemies: '敌对', neutrals: '中立',
      attitude: '态度', attitudeDetail: '态度细节', playerRelation: '对玩家关系',
      strength: '实力', score: '评分', strengths: '优势', weaknesses: '弱点', militaryStrength: '军力',
      militaryBreakdown: '军力构成', warState: '战争状态', mobilization: '动员', manpower: '人力',
      economy: '经济', wealth: '财力', finance: '财政', treasury: '库藏', supply: '补给',
      population: '人口', actual: '实口', registered: '编户', hidden: '隐户', money: '银', grain: '粮',
      cloth: '布', horses: '马', courtInfluence: '朝堂影响', popularInfluence: '民间影响',
      prestige: '威望', cohesion: '凝聚', political: '政治', military: '军事', economic: '经济',
      cultural: '文化', ethnic: '族群', loyalty: '忠诚', succession: '继承', techLevel: '技术',
      cultureLevel: '文教', publicOpinion: '舆情', economicStructure: '经济结构', economicPolicy: '经济政策',
      internalParties: '内部派系', partyRelations: '党派关系', knownSpies: '已知间谍',
      offendThresholds: '冒犯阈值', decisionHints: '决策提示', npcDecisionHints: 'NPC 提示',
      strategicPriorities: '战略优先', openingProblems: '开局问题', tabooMoves: '禁忌动作',
      aiProfile: 'AI 画像', victoryConditions: '胜利条件', defeatConditions: '失败条件',
      mapFactionId: '地图势力编号', runtimeFactionId: '运行态编号', stableOwnerKey: '稳定归属键',
      commerceVolume: '商业额', commerceCoefficient: '商业系数', farmland: '耕地', roadQuality: '道路',
      postRelays: '驿站', saltProduction: '盐课', mineralProduction: '矿课', horseProduction: '马政',
      fishingProduction: '渔课', imperialFarmland: '皇庄'
    };
    Object.assign(map, {
      title: '题名', officialName: '官称', sourceId: '来源编号', sourceMap: '来源地图',
      sourceScenario: '来源剧本', sourceSupplement: '来源补充', generatedAt: '生成时间',
      mutableFields: '可变字段', runtimeContract: '运行契约', ownershipFields: '归属字段',
      ownershipMutable: '归属可变', liveState: '运行状态', dataConfidence: '数据可信度',
      dataConfidenceNote: '可信度说明', aiReadable: 'AI 可读', aiRole: 'AI 角色',
      aiReadFunction: 'AI 读取函数', aiApplyFunction: 'AI 应用函数',
      regionType: '地块类型', mapRegionId: '地图地块编号', center: '中心点', centroid: '几何中心',
      polygon: '边界多边形', points: '边界点', coords: '坐标', path: '路径', d: '路径',
      sourceRefs: '史料依据', notes: '备注', historicalNote: '史料备注',
      factionId: '势力编号', factionName: '势力名称', owner: '归属', ownerKey: '归属键',
      ownerName: '归属势力', currentOwner: '当前归属', currentOwnerKey: '当前归属键',
      initialOwner: '初始归属', initialOwnerKey: '初始归属键', controller: '实际控制者',
      controllerKey: '实际控制键', currentLoad: '当前负载', ownerHistory: '归属历史',
      controllerHistory: '控制历史', factionColor: '势力颜色', scenarioFactionColor: '剧本势力颜色',
      scenarioFactionId: '剧本势力编号', scenarioFactionName: '剧本势力名称',
      stableFactionId: '稳定势力编号', landRegionCount: '陆地数量', oceanRegionCount: '海域数量',
      unboundLandRegions: '未绑定陆地', affectedSubDivisions: '受影响子区',
      populationDetail: '人口明细', mouths: '口数', households: '户数', ding: '丁口',
      fugitives: '逃户', hiddenCount: '隐户数', sexRatio: '性别比例',
      byGender: '按性别', byAge: '按年龄', byEthnicity: '按族群', byFaith: '按信仰',
      bySettlement: '按聚落', actualRevenue: '实收税额', claimedRevenue: '应征税额',
      remittedToCenter: '起运中枢', retainedBudget: '留用地方', compliance: '合规率',
      skimmingRate: '截留率', autonomy: '财政自主', autonomyLevel: '自治程度',
      taxLevel: '税级', taxPressure: '税负压力', taxBurden: '税负',
      publicTreasuryInit: '地方府库', fiscalDetail: '财赋明细', economyBase: '经济基础',
      imperialAssets: '官府资产', zhizao: '织造', kuangchang: '矿厂', yuyao: '御窑',
      agriculture: '农业', arable: '可耕地', handicraft: '手工业', mining: '矿业',
      maritimeTradeVolume: '海贸额', tradeRoutes: '贸易路线', roads: '道路',
      hasPort: '港口', saltRegion: '盐区', mineralRegion: '矿区', horseRegion: '马政区',
      fishingRegion: '渔区', imperialDomain: '皇庄', armyDetail: '军务明细',
      armyPressure: '军压', troops: '驻军', garrison: '驻军', commander: '主将',
      fortification: '城防', borderRisk: '边警', warRisk: '战事风险',
      standingArmy: '常备军', militia: '民兵', artillery: '火炮', fleet: '舰队',
      activeFronts: '活跃战线', office: '官署', official: '官员', officialPosition: '主官职名',
      officialPattern: '官职模板', officeVacancy: '官缺', officeRisk: '官守风险',
      corruption: '腐败', corruptionLocal: '地方贪腐', policyExecution: '政令执行',
      localFaction: '地方派系', leadingGentry: '地方士绅', academies: '书院',
      religiousSites: '宗教场所', carryingCapacity: '承载上限', carryingRegime: '承载制度',
      minxinLocal: '地方民心', recentDisasters: '近期灾异', disasterRecord: '灾异记录',
      baojia: '保甲', baoCount: '保数', jiaCount: '甲数', paiCount: '牌数',
      specialResources: '特殊资源', specialCulture: '特殊文化', strategicValue: '战略价值',
      coreStatus: '核心/边缘', borderStatus: '边缘状态', capitalChildId: '治所子区',
      tags: '标签', neighbors: '邻接地块', climate: '气候', water: '水利',
      mainResources: '核心资源', publicOpinion: '公共舆情', decisionStyle: '决策风格',
      riskTolerance: '风险偏好', pressureVectors: '压力来源', playerCounterplay: '玩家应对',
      playerVisibleTheme: '玩家可见主题', shouldUseNamedCharacters: '需使用具名人物',
      simulationProfile: '推演画像', willSpawnIfUnanswered: '未回应将触发',
      relationshipType: '关系类型', localSupport: '地方支持', overall: '总体',
      leadership: '领导层', leaderInfo: '首领信息', leaderOriginalText: '首领原文',
      heir: '继嗣', heirInfo: '继嗣信息', designatedHeir: '指定继承人',
      regent: '摄政', chancellor: '宰辅', general: '主将', foundYear: '建立年份',
      peakYear: '鼎盛年份', historicalCap: '历史上限', vassalType: '藩属类型',
      twoBan: '两班', allyClass: '盟友类型', posture: '姿态', readiness: '备战度',
      casualties: '伤亡', fled: '逃散', starved: '饥亡', sold: '售出',
      landsSurveyed: '清丈土地', landsReclaimed: '垦复土地', landsAnnexed: '兼并土地',
      subTypes: '子类型', characterCorrections: '人物校正', isSupplement: '补充项',
      supplementId: '补充编号', supplementName: '补充名称'
    });
    var raw = String(k || '');
    if (map[raw]) return map[raw];
    if (/^[a-z][a-z0-9_-]*$/i.test(raw)) return readableUnknownField(raw);
    return raw;
  }

  function cleanDisplayValue(v){
    if (v === undefined || v === null) return '';
    var s = String(v).trim();
    if (!s) return '';
    var lower = s.toLowerCase();
    var valueMap = {
      province: '省道',
      prefecture: '府州',
      county: '县邑',
      district: '辖区',
      region: '地块',
      realm: '天下',
      frontier: '边地',
      border: '边境',
      capital: '京畿',
      commandery: '郡府',
      tribe: '部族',
      jimi: '羁縻',
      vassal: '藩属',
      tributary: '朝贡',
      sovereign: '独立势力',
      court: '朝廷',
      local: '地方',
      direct: '直辖',
      neutral: '中立',
      ally: '盟友',
      allied: '盟友',
      enemy: '敌对',
      hostile: '敌对',
      friendly: '亲善',
      tense: '紧张',
      active: '生效',
      inactive: '未启用',
      pending: '待定',
      completed: '已完成',
      done: '已完成',
      good: '良好',
      warn: '警戒',
      danger: '危急',
      crisis: '危局',
      high: '高',
      medium: '中',
      low: '低'
    };
    if (valueMap[s]) return valueMap[s];
    if (valueMap[lower]) return valueMap[lower];
    var label = fieldLabel(s);
    if (label && label !== s) return label;
    var faction = null;
    try { faction = findFaction(s); } catch (_) { faction = null; }
    if (faction) return faction.label || faction.name || faction.shortName || faction.id || s;
    if (/^[a-z][a-z0-9_-]*$/i.test(s)) return '已记录';
    return s;
  }

  function ppValue(v, fallback){
    if (v === undefined || v === null || v === '') return fallback || '未记';
    if (typeof v === 'number') return mapNum(v);
    if (Array.isArray(v)) return v.length ? v.map(function(x){ return ppValue(x, ''); }).filter(Boolean).join('、') : (fallback || '未记');
    if (typeof v === 'object') {
      var rows = Object.keys(v).slice(0, 6).map(function(k){ return fieldLabel(k) + '：' + ppValue(v[k], ''); }).filter(Boolean);
      return rows.length ? rows.join(' / ') : (fallback || '未记');
    }
    return cleanDisplayValue(v);
  }

  function mapNum(v, unit){
    var n = Number(v);
    if (!isFinite(n)) return v === undefined || v === null || v === '' ? '未记' : String(v);
    var abs = Math.abs(n);
    var text = '';
    if (abs >= 100000000) text = (n / 100000000).toFixed(abs >= 1000000000 ? 1 : 2).replace(/\.0+$/, '') + '亿';
    else if (abs >= 10000) text = (n / 10000).toFixed(abs >= 1000000 ? 0 : 1).replace(/\.0$/, '') + '万';
    else text = String(Math.round(n));
    return text + (unit || '');
  }

  function pctValue(v){
    var n = Number(v);
    if (!isFinite(n)) return ppValue(v);
    return Math.round(n <= 1 ? n * 100 : n) + '%';
  }

  function shortText(v, max){
    var s = ppValue(v, '');
    max = max || 18;
    return s.length > max ? s.slice(0, max - 1) + '…' : s;
  }

  function regionBundle(r){
    var base = Object.assign({}, (r && r.admin) || {}, (r && r.data) || {});
    var liveDivision = findLiveAdminDivision(r);
    var liveStats = findLiveProvinceStats(r);
    var data = assignKnown({}, base, liveDivision, liveStats);
    var liveOwner = liveRegionOwner(r, liveStats, liveDivision);
    if (hasValue(liveOwner)) {
      data.owner = liveOwner;
      data.factionName = liveOwner;
      data.ownerName = liveOwner;
    }
    var liveGovernor = firstValue(
      liveStats && liveStats.governor,
      liveStats && liveStats.governorName,
      liveStats && liveStats.currentGovernor,
      liveStats && liveStats.administrator,
      liveStats && liveStats.administratorName,
      liveStats && liveStats.localOfficial,
      liveStats && liveStats.official,
      liveStats && liveStats.currentOfficial,
      liveDivision && liveDivision.governor,
      liveDivision && liveDivision.governorName,
      liveDivision && liveDivision.currentGovernor,
      liveDivision && liveDivision.administrator,
      liveDivision && liveDivision.administratorName,
      liveDivision && liveDivision.localOfficial,
      liveDivision && liveDivision.official,
      liveDivision && liveDivision.currentOfficial
    );
    if (hasValue(liveGovernor)) {
      data.governor = liveGovernor;
      data.official = liveGovernor;
    }
    var liveOffice = firstValue(
      liveStats && liveStats.officialPosition,
      liveStats && liveStats.officialTitle,
      liveStats && liveStats.governorTitle,
      liveStats && liveStats.positionTitle,
      liveStats && liveStats.office,
      liveDivision && liveDivision.officialPosition,
      liveDivision && liveDivision.officialTitle,
      liveDivision && liveDivision.governorTitle,
      liveDivision && liveDivision.positionTitle,
      liveDivision && liveDivision.office
    );
    if (hasValue(liveOffice)) {
      data.officialPosition = liveOffice;
      data.office = liveOffice;
    }
    var pop = assignKnown({},
      plainObject(base.populationDetail),
      plainObject(liveDivision && liveDivision.populationDetail),
      plainObject(liveStats && liveStats.populationDetail),
      plainObject(liveStats && liveStats.population)
    );
    if (hasValue(liveDivision && liveDivision.population) && typeof liveDivision.population !== 'object') pop.mouths = liveDivision.population;
    if (hasValue(liveStats && liveStats.population) && typeof liveStats.population !== 'object') pop.mouths = liveStats.population;
    if (hasValue(liveStats && liveStats.households)) pop.households = liveStats.households;
    [
      ['ding', 'ding', 'dingCount'],
      ['fugitives', 'fugitives', 'escapedHouseholds', 'escapedPopulation'],
      ['hiddenCount', 'hiddenCount', 'hiddenHouseholds', 'hiddenPopulation']
    ].forEach(function(row){
      var target = row[0];
      for (var i = 1; i < row.length; i += 1) {
        var key = row[i];
        var value = firstValue(liveStats && liveStats[key], liveDivision && liveDivision[key]);
        if (hasValue(value)) {
          pop[target] = value;
          break;
        }
      }
    });
    if (hasValue(pop.mouths)) data.population = pop.mouths;
    var fiscal = assignKnown({},
      plainObject(base.fiscalDetail),
      plainObject(liveDivision && liveDivision.fiscalDetail),
      plainObject(liveStats && liveStats.fiscalDetail)
    );
    [
      ['actualRevenue', 'taxRevenue', 'revenue', 'actualRevenue'],
      ['claimedRevenue', 'claimedRevenue', 'expectedRevenue'],
      ['remittedToCenter', 'remittedToCenter', 'remitToCenter'],
      ['retainedBudget', 'retainedBudget', 'retainedLocal'],
      ['compliance', 'compliance', 'taxCompliance'],
      ['skimmingRate', 'skimmingRate', 'corruptionSkimRate'],
      ['autonomy', 'fiscalAutonomy', 'autonomy'],
      ['taxBurden', 'taxBurden']
    ].forEach(function(row){
      var target = row[0];
      for (var i = 1; i < row.length; i += 1) {
        var key = row[i];
        var value = firstValue(liveStats && liveStats[key], liveDivision && liveDivision[key]);
        if (hasValue(value)) {
          fiscal[target] = value;
          break;
        }
      }
    });
    if (hasValue(fiscal.actualRevenue)) data.taxRevenue = fiscal.actualRevenue;
    var treasury = assignKnown({},
      plainObject(base.publicTreasuryInit),
      plainObject(liveDivision && liveDivision.publicTreasuryInit),
      plainObject(liveStats && liveStats.publicTreasuryInit),
      plainObject(liveStats && liveStats.treasury)
    );
    ['money','silver','grain','cloth','horse'].forEach(function(k){
      var value = firstValue(liveStats && liveStats[k], liveDivision && liveDivision[k]);
      if (hasValue(value)) treasury[k] = value;
    });
    var economy = assignKnown({},
      plainObject(base.economyBase),
      plainObject(liveDivision && liveDivision.economyBase),
      plainObject(liveStats && liveStats.economyBase)
    );
    [
      'farmland',
      'commerceVolume',
      'commerceCoefficient',
      'saltProduction',
      'mineralProduction',
      'horseProduction',
      'fishingProduction',
      'imperialFarmland',
      'postRelays',
      'roadQuality',
      'kejuQuota'
    ].forEach(function(k){
      var value = firstValue(liveStats && liveStats[k], liveDivision && liveDivision[k]);
      if (hasValue(value)) economy[k] = value;
    });
    if (hasValue(liveStats && liveStats.imperialAssets) || hasValue(liveDivision && liveDivision.imperialAssets)) {
      economy.imperialAssets = assignKnown({}, plainObject(economy.imperialAssets), plainObject(liveDivision && liveDivision.imperialAssets), plainObject(liveStats && liveStats.imperialAssets));
    }
    var army = assignKnown({},
      plainObject(base.armyDetail),
      plainObject(liveDivision && liveDivision.armyDetail),
      plainObject(liveStats && liveStats.armyDetail)
    );
    var liveDivisionArmy = plainObject(liveDivision && liveDivision.armyDetail);
    var liveStatsArmy = plainObject(liveStats && liveStats.armyDetail);
    var troops = firstValue(liveStats && liveStats.soldiers, liveStats && liveStats.troops, liveStats && liveStats.garrison, liveStats && liveStats.strength, liveDivision && liveDivision.garrison, liveDivision && liveDivision.troops);
    if (hasValue(troops)) {
      army.troops = troops;
      data.garrison = troops;
    }
    var regionCommander = firstValue(
      liveStatsArmy.commander,
      liveStatsArmy.commanderName,
      liveStatsArmy.general,
      liveStatsArmy.generalName,
      liveStatsArmy.commandingOfficer,
      liveStatsArmy.chiefCommander,
      liveStats && liveStats.commander,
      liveStats && liveStats.commanderName,
      liveStats && liveStats.general,
      liveStats && liveStats.generalName,
      liveStats && liveStats.commandingOfficer,
      liveStats && liveStats.chiefCommander,
      liveDivisionArmy.commander,
      liveDivisionArmy.commanderName,
      liveDivisionArmy.general,
      liveDivisionArmy.generalName,
      liveDivisionArmy.commandingOfficer,
      liveDivisionArmy.chiefCommander,
      liveDivision && liveDivision.commander,
      liveDivision && liveDivision.commanderName,
      liveDivision && liveDivision.general,
      liveDivision && liveDivision.generalName,
      army.commander,
      army.commanderName,
      army.general,
      army.generalName
    );
    if (hasValue(regionCommander)) {
      army.commander = regionCommander;
      data.commander = regionCommander;
    }
    var regionSupply = firstValue(
      liveStatsArmy.supply,
      liveStatsArmy.supplies,
      liveStatsArmy.supplyState,
      liveStats && liveStats.supply,
      liveStats && liveStats.supplies,
      liveStats && liveStats.supplyState,
      liveDivisionArmy.supply,
      liveDivisionArmy.supplies,
      liveDivisionArmy.supplyState,
      liveDivision && liveDivision.supply,
      liveDivision && liveDivision.supplies,
      liveDivision && liveDivision.supplyState,
      army.supply,
      army.supplies,
      army.supplyState
    );
    if (hasValue(regionSupply)) {
      army.supply = regionSupply;
      data.supply = regionSupply;
    }
    var minxin = firstValue(liveStats && liveStats.minxin, liveStats && liveStats.mood, liveStats && liveStats.stability, liveDivision && liveDivision.minxinLocal, liveDivision && liveDivision.minxin);
    if (hasValue(minxin)) data.minxinLocal = minxin;
    var corruption = firstValue(liveStats && liveStats.corruption, liveStats && liveStats.corruptionLocal, liveDivision && liveDivision.corruptionLocal, liveDivision && liveDivision.corruption);
    if (hasValue(corruption)) {
      data.corruptionLocal = corruption;
      data.corruption = corruption;
    }
    data.populationDetail = pop;
    data.fiscalDetail = fiscal;
    data.publicTreasuryInit = treasury;
    data.economyBase = economy;
    data.armyDetail = army;
    return { data: data, pop: pop, fiscal: fiscal, treasury: treasury, army: army, liveStats: liveStats, liveDivision: liveDivision };
  }

  function regionTitle(r){
    var data = regionBundle(r).data;
    return firstValue(r && r.title, r && r.name, data.name, r && r.officialName, '未名地块');
  }

  function regionLevel(r){
    var data = regionBundle(r).data;
    return [firstValue(data.regionType, data.level, r && r.type, r && r.level, '政区'), ownerName(r)].filter(Boolean).join(' · ');
  }

  function regionIdentity(r){
    var b = regionBundle(r);
    return [
      ['层级', firstValue(b.data.level, b.data.regionType, r && r.level, r && r.type)],
      ['主官', firstValue(b.data.governor, b.data.official, r && r.governor, r && r.official)],
      ['治所', firstValue(b.data.capital, r && r.capital)],
      ['地势', firstValue(b.data.terrain, r && r.terrain)],
      ['资源', firstValue(b.data.specialResources, r && r.resources)],
      ['法理', firstValue(b.data.dejureOwner, ownerName(r))]
    ];
  }

  function modeScore(r, mode){
    var b = regionBundle(r);
    if (mode === 'mood') return firstValue(b.data.minxinLocal, r && r.mood, r && r.prosperity, 50);
    if (mode === 'tax') {
      var actual = Number(firstValue(b.fiscal.actualRevenue, r && r.tax, r && r.development, 0));
      var claimed = Number(firstValue(b.fiscal.claimedRevenue, actual || 0));
      if (claimed > 0 && actual >= 0) return Math.max(0, Math.min(100, Math.round(actual / claimed * 100)));
      return actual ? Math.min(100, Math.round(actual / 30000)) : 50;
    }
    if (mode === 'army') return firstValue(b.data.armyPressure, b.data.garrison, b.army.troops, r && r.armyPressure, r && r.troops, 50);
    if (mode === 'office') {
      var c = Number(firstValue(b.data.corruptionLocal, b.data.corruption, 50));
      return isFinite(c) ? Math.max(0, Math.min(100, 100 - c)) : 50;
    }
    if (mode === 'owner') return ownerName(r) ? 80 : 50;
    return 60;
  }

  function riskClass(score, inverse){
    var n = Number(score);
    if (!isFinite(n)) return 'risk-mid';
    if (inverse) {
      if (n >= 66) return 'risk-low';
      if (n >= 38) return 'risk-mid';
      return 'risk-high';
    }
    if (n >= 66) return 'risk-high';
    if (n >= 38) return 'risk-mid';
    return 'risk-low';
  }

  function ppTabButtons(kind, active){
    var tabs = kind === 'faction' ? MAP_FACTION_TABS : MAP_REGION_TABS;
    return tabs.map(function(t){
      return '<button type="button" class="pp-tab ' + (t[0] === active ? 'active' : '') + '" data-pp-tab="' + attr(t[0]) + '">' + esc(t[1]) + '</button>';
    }).join('');
  }

  function ppZone(title, rows, wide){
    var html = rows.filter(function(row){ return row && row[1] !== undefined && row[1] !== null && row[1] !== ''; }).map(function(row){
      return '<div class="pp-zr"><span class="pp-zk">' + esc(row[0]) + '</span><span class="pp-zv">' + esc(ppValue(row[1])) + '</span></div>';
    }).join('');
    if (!html) html = '<div class="pp-zr"><span class="pp-zk">记录</span><span class="pp-zv">未记</span></div>';
    return '<section class="pp-zone ' + (wide ? 'wide' : '') + '"><div class="pp-zt">' + esc(title) + '</div>' + html + '</section>';
  }

  function ppModeBanner(r, active){
    var mode = MAP_MODE_META[active] ? active : 'overview';
    var meta = MAP_MODE_META[mode];
    var b = regionBundle(r);
    var value = '';
    var note = meta.note;
    if (mode === 'mood') value = firstValue(b.data.minxinLocal, r && r.mood, '未记');
    else if (mode === 'tax') value = firstValue(b.fiscal.actualRevenue, r && r.tax, '未记');
    else if (mode === 'army') value = firstValue(b.data.garrison, b.army.troops, b.data.armyPressure, r && r.troops, '未记');
    else if (mode === 'office') value = firstValue(b.data.governor, b.data.officialPosition, b.data.corruptionLocal, '未记');
    else if (mode === 'owner') value = ownerName(r);
    else value = firstValue(regionTitle(r), ownerName(r));
    var score = mode === 'overview' ? '' : modeScore(r, mode);
    return '<div class="pp-mode-banner ' + (mode === 'overview' ? 'overview' : riskClass(score, mode === 'mood' || mode === 'tax')) + '">' +
      '<div class="pp-mode-seal">' + esc(meta.mark) + '</div>' +
      '<div class="pp-mode-copy"><div class="pp-mode-title">' + esc(meta.title) + '</div><div class="pp-mode-note">' + esc(note) + '</div></div>' +
      '<div class="pp-mode-score"><span>' + esc(mode === 'overview' ? '档案' : '读数') + '</span><b>' + esc(ppValue(value)) + '</b></div>' +
    '</div>';
  }

  function ppStatusSeal(mode, label, r){
    var score = modeScore(r, mode);
    var inverse = mode === 'mood' || mode === 'tax';
    return '<button type="button" class="pp-status-seal ' + riskClass(score, inverse) + (state.mapPanelTab === mode ? ' active' : '') + '" data-pp-tab="' + attr(mode) + '">' +
      '<span class="pp-status-k">' + esc(label) + '</span><b class="pp-status-v">' + esc(ppValue(score)) + '</b><em class="pp-status-note">' + esc(MAP_MODE_META[mode].title) + '</em>' +
    '</button>';
  }

  function ppDevTriplet(r){
    var b = regionBundle(r);
    var rows = [
      ['户', firstValue(b.data.population, b.pop.mouths, b.pop.households, r && r.population), '户口 / 丁册'],
      ['赋', firstValue(b.fiscal.actualRevenue, b.fiscal.claimedRevenue, r && r.tax), '实征 / 应征'],
      ['兵', firstValue(b.data.garrison, b.army.troops, r && r.troops), '驻军 / 军压']
    ];
    return '<div class="pp-dev-triplet">' + rows.map(function(row){
      return '<div class="pp-dev-chip"><i>' + esc(row[0]) + '</i><b>' + esc(ppValue(row[1])) + '</b><span>' + esc(row[2]) + '</span><em>读数</em></div>';
    }).join('') + '</div>';
  }

  function ppLedger(label, value, note, tone){
    return '<div class="pp-ledger-card ' + attr(tone || '') + '"><span>' + esc(label) + '</span><b>' + esc(ppValue(value)) + '</b><small>' + esc(note || '') + '</small></div>';
  }

  function ppFieldChips(rows){
    var html = rows.filter(function(row){ return row && row[1] !== undefined && row[1] !== null && row[1] !== ''; }).map(function(row){
      return '<span class="pp-field-chip"><b>' + esc(row[0]) + '</b>' + esc(ppValue(row[1])) + '</span>';
    }).join('');
    return html ? '<div class="pp-field-chips wide">' + html + '</div>' : '';
  }

  function ppTableRows(rows){
    var html = rows.filter(Boolean).map(function(row){
      return '<div class="pp-table-row"><div><b>' + esc(fieldLabel(row[0])) + '</b><span>' + esc(ppValue(row[2] || '')) + '</span></div><em>' + esc(ppValue(row[1])) + '</em></div>';
    }).join('');
    return '<div class="pp-table-list wide">' + (html || '<div class="pp-table-row"><div><b>暂无</b><span>未记录</span></div><em>-</em></div>') + '</div>';
  }

  function ppTagNames(tags){
    if (!tags || typeof tags !== 'object') return [];
    var label = { hasPort: '港口', saltRegion: '盐课', mineralRegion: '矿课', horseRegion: '马政', fishingRegion: '渔课', imperialDomain: '皇庄' };
    return Object.keys(tags).filter(function(k){ return !!tags[k]; }).map(function(k){ return label[k] || k; });
  }

  function ppIdChain(r){
    var b = regionBundle(r);
    var children = Array.isArray(b.data.children) ? b.data.children : [];
    return '<div class="pp-id-chain wide">' + [
      ['归属', ownerName(r)],
      ['官守', firstValue(b.data.officialPosition, b.data.governor, '未任')],
      ['地块 ID', firstValue(r && r.id, r && r.mapRegionId, b.data.id)],
      ['法理', firstValue(b.data.dejureOwner, ownerName(r))],
      ['首府/子区', firstValue(b.data.capitalChildId, b.data.capital, children.length ? children.length + ' 项' : '')],
      ['类型', firstValue(b.data.regionType, b.data.level, r && r.type)]
    ].map(function(row){
      return '<div class="pp-chain-item"><div class="pp-chain-k">' + esc(row[0]) + '</div><div class="pp-chain-v">' + esc(ppValue(row[1])) + '</div></div>';
    }).join('') + '</div>';
  }

  function ppFacilities(r){
    var b = regionBundle(r);
    var econ = b.data.economyBase || {};
    var assets = econ.imperialAssets || {};
    var rows = [
      ['耕地', econ.farmland], ['商贸', econ.commerceVolume], ['盐课', econ.saltProduction], ['矿课', econ.mineralProduction],
      ['马政', econ.horseProduction], ['渔课', econ.fishingProduction], ['皇庄', econ.imperialFarmland], ['织造', assets.zhizao],
      ['矿厂', assets.kuangchang], ['御窑', assets.yuyao], ['驿站', econ.postRelays], ['道路', econ.roadQuality]
    ];
    return '<section class="pp-zone pp-facilities wide"><div class="pp-zt">地方设施</div><div class="pp-facility-grid">' + rows.map(function(row){
      return '<div class="pp-facility"><span>' + esc(row[0]) + '</span><b>' + esc(ppValue(row[1])) + '</b></div>';
    }).join('') + '</div></section>';
  }

  function ppAdminExtra(r){
    var b = regionBundle(r);
    var econ = b.data.economyBase || {};
    return '<div class="pp-section-strip wide">地方底账</div>' + ppTableRows([
      ['书院', b.data.academies, '地方士林'],
      ['士绅', b.data.leadingGentry, '地方精英'],
      ['宗教场所', b.data.religiousSites, '信仰网络'],
      ['城镇聚落', b.data.bySettlement, '城乡构成'],
      ['贸易路线', b.data.tradeRoutes, '商路/漕路'],
      ['近期灾异', firstValue(b.data.recentDisasters, econ.disasterRecord), '灾害记录'],
      ['威胁', b.data.threats, '军政风险'],
      ['特殊文化', b.data.specialCulture, '地域叙述'],
      ['战略价值', b.data.strategicValue, '军政判断']
    ]);
  }

  function ppRegionTabDetail(r, active){
    var b = regionBundle(r);
    var data = b.data || {};
    var econ = data.economyBase || {};
    var children = Array.isArray(data.children) ? data.children : [];
    var tagList = ppTagNames(data.tags);
    var mode = MAP_MODE_META[active] ? active : 'overview';
    var body = '';
    if (mode === 'overview') {
      body = ppZone('行政档案', [
        ['地块名', regionTitle(r)],
        ['行政层级', firstValue(data.level, data.regionType, r && r.level, r && r.type)],
        ['官方 ID', firstValue(data.id, r && r.id, r && r.mapRegionId)],
        ['主官职名', firstValue(data.officialPosition, data.office, r && r.office)],
        ['主官', firstValue(data.governor, data.official, r && r.governor)],
        ['治所 / 核心', firstValue(data.capital, data.capitalChildId, r && r.capital)],
        ['法理归属', firstValue(data.dejureOwner, ownerName(r))],
        ['下辖子区', children.length ? children.map(function(x){ return ppValue(x.name || x.title || x.id || x); }).join('、') : '未细分']
      ], true) + ppFieldChips([
        ['地势', firstValue(data.terrain, r && r.terrain)],
        ['特殊资源', firstValue(data.specialResources, r && r.resources)],
        ['特殊文化', data.specialCulture],
        ['战略价值', data.strategicValue],
        ['标签', tagList]
      ]) + ppIdChain(r);
    } else if (mode === 'mood') {
      body = ppZone('民情与人口', [
        ['总人口', firstValue(data.population, b.pop.mouths, r && r.population)],
        ['黄册户', b.pop.households],
        ['丁口', b.pop.ding],
        ['逃户', b.pop.fugitives],
        ['隐户', b.pop.hiddenCount],
        ['民心', firstValue(data.minxinLocal, r && r.mood)],
        ['繁荣', firstValue(data.prosperity, r && r.prosperity)],
        ['承载上限', data.carryingCapacity],
        ['保甲', data.baojia],
        ['近期灾异', firstValue(data.recentDisasters, econ.disasterRecord)]
      ], true) + ppFieldChips([
        ['性别', data.byGender],
        ['年龄', data.byAge],
        ['族群', data.byEthnicity],
        ['信仰', data.byFaith],
        ['聚落', data.bySettlement],
        ['宗教场所', data.religiousSites]
      ]);
    } else if (mode === 'tax') {
      body = ppZone('财赋流水', [
        ['应征税额', b.fiscal.claimedRevenue],
        ['实收税额', b.fiscal.actualRevenue],
        ['起运中枢', b.fiscal.remittedToCenter],
        ['留用地方', b.fiscal.retainedBudget],
        ['合规率', pctValue(b.fiscal.compliance)],
        ['截留率', pctValue(b.fiscal.skimmingRate)],
        ['财政自主', b.fiscal.autonomy],
        ['税负', firstValue(b.fiscal.taxBurden, data.taxBurden)],
        ['税级', data.taxLevel],
        ['地方银', b.treasury.money],
        ['地方粮', b.treasury.grain],
        ['地方布', b.treasury.cloth]
      ], true) + ppFacilities(r);
    } else if (mode === 'army') {
      body = ppZone('军务态势', [
        ['驻军', firstValue(data.garrison, b.army.troops, r && r.troops)],
        ['军压', firstValue(data.armyPressure, r && r.armyPressure)],
        ['城防', firstValue(data.fortification, b.army.fortification)],
        ['主将', firstValue(data.commander, b.army.commander)],
        ['边警', firstValue(data.borderRisk, data.warRisk)],
        ['补给', firstValue(data.supply, b.army.supply)],
        ['战略价值', data.strategicValue],
        ['威胁', data.threats]
      ], true) + ppFieldChips([
        ['商路', data.tradeRoutes],
        ['道路', econ.roadQuality],
        ['驿站', econ.postRelays],
        ['马政', econ.horseProduction],
        ['水师 / 海防', firstValue(data.navy, data.coastalDefense)]
      ]);
    } else if (mode === 'office') {
      body = ppZone('官守治理', [
        ['官职', data.officialPosition],
        ['主官', firstValue(data.governor, data.official)],
        ['官缺', firstValue(data.officeVacancy, data.vacancy)],
        ['腐败', firstValue(data.corruptionLocal, data.corruption)],
        ['执行', firstValue(data.policyExecution, data.execution)],
        ['地方派系', firstValue(data.localFaction, data.party)],
        ['士绅', data.leadingGentry],
        ['书院', data.academies],
        ['税级', data.taxLevel]
      ], true) + ppFieldChips([
        ['治理标签', tagList],
        ['科举名额', econ.kejuQuota],
        ['官府资产', econ.imperialAssets],
        ['地方备注', firstValue(data.note, r && r.note)]
      ]);
    } else if (mode === 'owner') {
      var key = ownerKey(r);
      var f = findFaction(key, r && (r.factionName || r.ownerName)) || {};
      body = ppZone('势力归属', [
        ['当前控制', ownerName(r)],
        ['势力键', key],
        ['法理归属', firstValue(data.dejureOwner, ownerName(r))],
        ['实际控制键', firstValue(data.controllerKey, r && r.controllerKey, key)],
        ['地图势力 ID', firstValue(f.mapFactionId, key)],
        ['运行态势力 ID', f.runtimeFactionId],
        ['核心 / 边缘', firstValue(data.coreStatus, data.borderStatus)],
        ['归属历史', data.ownerHistory]
      ], true) + '<div class="pp-action-row wide"><button type="button" class="pp-action" onclick="TMPhase8FormalBridge.openFactionByKey(\'' + attr(key) + '\')">打开势力档案</button></div>';
    }
    return '<div class="pp-tab-detail">' + ppModeBanner(r, mode) + body + '</div>';
  }

  function ppRegionGrid(r, active){
    var b = regionBundle(r);
    var children = Array.isArray(b.data.children) ? b.data.children : [];
    var tags = [];
    if (b.data.tags && typeof b.data.tags === 'object') {
      Object.keys(b.data.tags).forEach(function(k){ if (b.data.tags[k]) tags.push(k); });
    }
    return [
      '<section class="pp-admin-brief wide"><div class="pp-admin-seal">' + esc(regionTitle(r).slice(0, 1)) + '</div><div><b>' + esc(firstValue(b.data.officialPosition, b.data.regionType, b.data.level, r && r.type, '地方政区')) + '</b><p class="pp-admin-desc">' + esc(firstValue(b.data.description, r && r.description, '此地尚无专门叙述，但会随剧本地图数据、地方财政、军务和人物任职动态更新。')) + '</p></div></section>',
      ppDevTriplet(r),
      '<div class="pp-seal-grid wide">' + [
        ppStatusSeal('mood', '民情', r),
        ppStatusSeal('tax', '财赋', r),
        ppStatusSeal('army', '军务', r),
        ppStatusSeal('office', '官守', r),
        ppStatusSeal('owner', '势力', r)
      ].join('') + '</div>',
      ppZone('地形 · 户口', [
        ['地势', firstValue(b.data.terrain, r && r.terrain)],
        ['总口', firstValue(b.data.population, b.pop.mouths, r && r.population)],
        ['黄册户', b.pop.households],
        ['丁口', b.pop.ding],
        ['逃户', b.pop.fugitives],
        ['族群/风俗', firstValue(b.data.ethnicity, b.data.customs)]
      ]),
      ppZone('财赋 · 库藏', [
        ['应征', b.fiscal.claimedRevenue],
        ['实征', b.fiscal.actualRevenue],
        ['留用', b.fiscal.retainedBudget],
        ['税负', firstValue(b.fiscal.taxBurden, b.data.taxBurden)],
        ['地方银', b.treasury.money],
        ['地方粮', b.treasury.grain]
      ]),
      ppZone('军务 · 城防', [
        ['驻军', firstValue(b.data.garrison, b.army.troops, r && r.troops)],
        ['军压', firstValue(b.data.armyPressure, r && r.armyPressure)],
        ['城防', firstValue(b.data.fortification, b.army.fortification)],
        ['主将', firstValue(b.data.commander, b.army.commander)],
        ['边警', firstValue(b.data.borderRisk, b.data.warRisk)],
        ['补给', firstValue(b.data.supply, b.army.supply)]
      ]),
      ppZone('官守 · 治理', [
        ['主官', firstValue(b.data.governor, b.data.official)],
        ['官职', b.data.officialPosition],
        ['官缺', firstValue(b.data.officeVacancy, b.data.vacancy)],
        ['腐败', firstValue(b.data.corruptionLocal, b.data.corruption)],
        ['执行', firstValue(b.data.policyExecution, b.data.execution)],
        ['地方派系', firstValue(b.data.localFaction, b.data.party)]
      ]),
      ppZone('势力 · 归属', [
        ['当前控制', ownerName(r)],
        ['势力键', ownerKey(r)],
        ['法理归属', firstValue(b.data.dejureOwner, ownerName(r))],
        ['核心/边缘', firstValue(b.data.coreStatus, b.data.borderStatus)],
        ['下辖子区', children.length ? children.map(function(x){ return ppValue(x.name || x.title || x); }).join('、') : '未细分'],
        ['标签', tags.length ? tags.join('、') : '未记']
      ]),
      '<div class="pp-action-row wide">' +
        '<button type="button" class="pp-action" data-pp-action="map">行政区划</button>' +
        '<button type="button" class="pp-action" data-pp-action="issue">转御案</button>' +
        '<button type="button" class="pp-action" data-pp-action="records">入史官</button>' +
      '</div>'
    ].join('');
  }

  function ppRegionGridV2(r, active){
    var b = regionBundle(r);
    var children = Array.isArray(b.data.children) ? b.data.children : [];
    var tagList = ppTagNames(b.data.tags);
    return [
      '<section class="pp-admin-brief wide"><div class="pp-admin-head"><div class="pp-admin-seal"><b>' + esc(regionTitle(r).slice(0, 1)) + '</b><span>' + esc(firstValue(b.data.level, r && r.level, '政区')) + '</span></div><div><div class="pp-admin-title"><span>' + esc(regionTitle(r)) + '</span><small>' + esc(firstValue(r && r.id, b.data.id, '未记 ID')) + '</small></div><p class="pp-admin-desc">' + esc(firstValue(b.data.description, r && r.description, '此地暂无专门叙述，但会随剧本地图数据、地方财政、军务和人物任职动态更新。')) + '</p><div class="pp-badge-row">' + [firstValue(b.data.regionType, b.data.level, r && r.type), firstValue(b.data.officialPosition, b.data.governor), ownerName(r)].concat(tagList).filter(Boolean).slice(0, 9).map(function(x, i){ return '<span class="' + (i === 2 ? 'good' : '') + '">' + esc(ppValue(x)) + '</span>'; }).join('') + '</div></div></div></section>',
      '<div class="pp-ledger-grid wide">' +
        ppLedger('在编人口', firstValue(b.data.population, b.pop.mouths, r && r.population), '官方剧本口径') +
        ppLedger('黄册户口', b.pop.households, '丁 ' + ppValue(b.pop.ding)) +
        ppLedger('商业额', objectValue(b.data.economyBase, ['commerceVolume']), '系数 ' + ppValue(objectValue(b.data.economyBase, ['commerceCoefficient']))) +
        ppLedger('实收税银', b.fiscal.actualRevenue, '缴纳 ' + pctValue(b.fiscal.compliance)) +
        ppLedger('民心', firstValue(b.data.minxinLocal, r && r.mood), '地方读数') +
        ppLedger('贪腐', firstValue(b.data.corruptionLocal, b.data.corruption), '截留 ' + pctValue(b.fiscal.skimmingRate)) +
        ppLedger('驿路', objectValue(b.data.economyBase, ['roadQuality']), '驿站 ' + ppValue(objectValue(b.data.economyBase, ['postRelays']))) +
        ppLedger('灾异', firstValue(b.data.recentDisasters, objectValue(b.data.economyBase, ['disasterRecord']), '未见大灾'), '近期记录') +
        ppLedger('威胁', firstValue(b.data.threats, r && r.issue), '可入近事') +
      '</div>',
      ppDevTriplet(r),
      '<div class="pp-seal-grid wide">' + [
        ppStatusSeal('mood', '民情', r),
        ppStatusSeal('tax', '财赋', r),
        ppStatusSeal('army', '军务', r),
        ppStatusSeal('office', '官守', r),
        ppStatusSeal('owner', '势力', r)
      ].join('') + '</div>',
      ppIdChain(r),
      ppZone('地形 · 户口', [
        ['地势', firstValue(b.data.terrain, r && r.terrain)],
        ['总口', firstValue(b.data.population, b.pop.mouths, r && r.population)],
        ['黄册户', b.pop.households],
        ['丁口', b.pop.ding],
        ['逃户', b.pop.fugitives],
        ['隐户', b.pop.hiddenCount],
        ['承载上限', b.data.carryingCapacity],
        ['保甲', b.data.baojia],
        ['性别 / 年龄', [b.data.byGender, b.data.byAge].filter(Boolean).map(ppValue).join(' / ')],
        ['族群 / 信仰', [b.data.byEthnicity, b.data.byFaith].filter(Boolean).map(ppValue).join(' / ')]
      ]),
      ppZone('财赋 · 库藏', [
        ['应征', b.fiscal.claimedRevenue],
        ['实征', b.fiscal.actualRevenue],
        ['起运中枢', b.fiscal.remittedToCenter],
        ['留用地方', b.fiscal.retainedBudget],
        ['合规率', pctValue(b.fiscal.compliance)],
        ['截留率', pctValue(b.fiscal.skimmingRate)],
        ['税负', firstValue(b.fiscal.taxBurden, b.data.taxBurden)],
        ['地方银', b.treasury.money],
        ['地方粮', b.treasury.grain],
        ['地方布', b.treasury.cloth],
        ['税级', b.data.taxLevel]
      ]),
      ppZone('军务 · 城防', [
        ['驻军', firstValue(b.data.garrison, b.army.troops, r && r.troops)],
        ['军压', firstValue(b.data.armyPressure, r && r.armyPressure)],
        ['城防', firstValue(b.data.fortification, b.army.fortification)],
        ['主将', firstValue(b.data.commander, b.army.commander)],
        ['边警', firstValue(b.data.borderRisk, b.data.warRisk)],
        ['补给', firstValue(b.data.supply, b.army.supply)],
        ['商路', b.data.tradeRoutes],
        ['战略价值', b.data.strategicValue]
      ]),
      ppZone('官守 · 治理', [
        ['主官', firstValue(b.data.governor, b.data.official)],
        ['官职', b.data.officialPosition],
        ['官缺', firstValue(b.data.officeVacancy, b.data.vacancy)],
        ['腐败', firstValue(b.data.corruptionLocal, b.data.corruption)],
        ['执行', firstValue(b.data.policyExecution, b.data.execution)],
        ['地方派系', firstValue(b.data.localFaction, b.data.party)],
        ['士绅', b.data.leadingGentry],
        ['书院', b.data.academies]
      ]),
      ppZone('势力 · 归属', [
        ['当前控制', ownerName(r)],
        ['势力键', ownerKey(r)],
        ['法理归属', firstValue(b.data.dejureOwner, ownerName(r))],
        ['核心/边缘', firstValue(b.data.coreStatus, b.data.borderStatus)],
        ['下辖子区', children.length ? children.map(function(x){ return ppValue(x.name || x.title || x); }).join('、') : '未细分'],
        ['标签', tagList.length ? tagList.join('、') : '未记']
      ]),
      ppFacilities(r),
      ppFieldChips([
        ['资源', firstValue(b.data.specialResources, r && r.resources)],
        ['文化', b.data.specialCulture],
        ['聚落', b.data.bySettlement],
        ['贸易', b.data.tradeRoutes],
        ['灾异', b.data.recentDisasters],
        ['威胁', b.data.threats],
        ['地方士林', b.data.leadingGentry],
        ['书院', b.data.academies],
        ['宗教场所', b.data.religiousSites]
      ]),
      ppAdminExtra(r),
      '<div class="pp-action-row wide">' +
        '<button type="button" class="pp-action" data-pp-action="map">行政区划</button>' +
        '<button type="button" class="pp-action" data-pp-action="issue">转奏档</button>' +
        '<button type="button" class="pp-action" data-pp-action="records">入史官</button>' +
      '</div>'
    ].join('');
  }

  function ensureMapPpop(){
    var pop = document.getElementById('ppop');
    if (!pop) {
      pop = document.createElement('div');
      pop.id = 'ppop';
      document.body.appendChild(pop);
    }
    if (!pop.__phase8MapBound) {
      pop.__phase8MapBound = true;
      pop.addEventListener('click', function(e){
        var close = e.target && e.target.closest ? e.target.closest('[data-pp-close]') : null;
        if (close) {
          closeMapDossier();
          return;
        }
        var tab = e.target && e.target.closest ? e.target.closest('[data-pp-tab]') : null;
        if (tab) {
          var value = tab.dataset.ppTab || 'overview';
          if (pop.dataset.panelKind === 'faction') {
            state.mapFactionTab = value;
          } else {
            state.mapPanelTab = value;
            if (MAP_MODE_META[value] && value !== 'overview') {
              state.mapMode = value;
              updateMapChrome();
              renderFormalMap();
            }
          }
          refreshMapPpop();
          return;
        }
        var action = e.target && e.target.closest ? e.target.closest('[data-pp-action]') : null;
        if (action) {
          var kind = action.dataset.ppAction;
          if (kind === 'map') openPanel('map');
          else if (kind === 'issue') openPanel('issue');
          else if (kind === 'records') openModule('records');
          else if (kind === 'finance') openPanel('finance');
        }
      });
    }
    return pop;
  }

  function markSelectedRegion(id){
    document.querySelectorAll('.tmf-region.selected').forEach(function(x){ x.classList.remove('selected'); });
    if (!id) return;
    var el = document.querySelector('.tmf-region[data-region-id="' + cssEscape(id) + '"]');
    if (el) el.classList.add('selected');
  }

  function closeMapDossier(){
    var old = document.getElementById('tmf-map-dossier');
    if (old) old.remove();
    var pop = document.getElementById('ppop');
    if (pop) {
      pop.classList.remove('show', 'region-panel', 'faction-panel');
      pop.removeAttribute('data-region-id');
      pop.removeAttribute('data-faction-key');
      pop.removeAttribute('data-panel-kind');
    }
    document.body.classList.remove('province-panel-open');
  }

  function openRegionDossier(r){
    if (!r) return;
    var id = String(r.id || r.name || r.title || '');
    state.mapPanelTab = state.mapPanelTab || 'overview';
    var active = MAP_MODE_META[state.mapPanelTab] ? state.mapPanelTab : 'overview';
    var pop = ensureMapPpop();
    pop.dataset.panelKind = 'region';
    pop.dataset.regionId = id;
    pop.className = 'tmf-map-ppop region-panel show';
    pop.innerHTML =
      '<div class="pp-top"><div class="pp-crest">' + esc(regionTitle(r).slice(0, 1)) + '</div><div class="pp-title-wrap"><div class="pp-name">' + esc(regionTitle(r)) + '</div><div class="pp-level">' + esc(regionLevel(r)) + '</div></div><span class="pp-top-mark">掌印</span><button type="button" class="pp-close" data-pp-close="1">×</button></div>' +
      '<div class="pp-tabs">' + ppTabButtons('region', active) + '</div>' +
      '<div class="pp-tab-body">' + ppRegionTabDetail(r, active) + '</div>' +
      '<div class="pp-grid">' + ppRegionGridV2(r, active) + '</div>';
    document.body.classList.add('province-panel-open');
    markSelectedRegion(id);
  }

  function factionRegions(key){
    var map = getMapData() || {};
    var f = findFaction(key);
    return (map.regions || []).filter(function(r){ return factionOwnsRegion(r, key, f); });
  }

  function factionPanelRows(f, key, region){
    var regions = factionRegions(key);
    return [
      ppZone('势力 · 总览', [
        ['首脑', firstValue(f.leader, f.leaderName, f.ruler, f.scenarioFactionName)],
        ['都城/核心', firstValue(f.capital, f.home, region && regionTitle(region))],
        ['政体', firstValue(f.government, f.type, f.factionType)],
        ['控制地块', regions.length ? regions.length + ' 块' : '未记'],
        ['对朝态度', firstValue(f.attitude, f.playerRelation, f.relation)],
        ['长期目标', firstValue(f.goal, f.longTermStrategy, f.agenda)]
      ]),
      ppZone('军务 · 财赋', [
        ['军力', firstValue(f.militaryStrength, f.strength, f.army, f.score)],
        ['经济', firstValue(runtimeFactionValue(f, 'economy'), runtimeFactionValue(f, 'wealth'), f.economy, f.wealth, f.finance)],
        ['粮饷', firstValue(f.supply, f.grain, f.pay)],
        ['动员', firstValue(f.mobilization, f.manpower)],
        ['风险', firstValue(f.risk, f.risks)],
        ['近事', firstValue(f.recentEvent, f.lastEvent, f.note)]
      ]),
      '<section class="pp-zone wide"><div class="pp-zt">所属地块</div><div class="tmf-region-links">' + (regions.length ? regions.map(function(r){
        return '<button type="button" onclick="TMPhase8FormalBridge.openRegionById(\'' + attr(r.id || r.name || r.title || '') + '\')">' + esc(regionTitle(r)) + '</button>';
      }).join('') : '<span>暂无可读取地块</span>') + '</div></section>',
      '<div class="pp-action-row wide">' +
        '<button type="button" class="pp-action" data-pp-action="map">回到舆图</button>' +
        '<button type="button" class="pp-action" data-pp-action="issue">转御案</button>' +
        '<button type="button" class="pp-action" data-pp-action="finance">财赋面板</button>' +
      '</div>'
    ].join('');
  }

  function sumFactionValues(regions, pick){
    return regions.reduce(function(sum, r){
      var value = Number(pick(regionBundle(r), r));
      return sum + (isFinite(value) ? value : 0);
    }, 0);
  }

  function factionRegionTokens(r){
    var b = regionBundle(r);
    return factionTokens(null, ownerKey(r), firstValue(b.data.factionName, b.data.ownerName, b.data.dejureOwner, r && r.factionName, r && r.ownerName));
  }

  function factionOwnsRegion(r, key, f){
    var ft = factionTokens(f, key, f && (f.label || f.name || f.scenarioFactionName));
    var rt = factionRegionTokens(r);
    return rt.some(function(x){ return ft.indexOf(x) >= 0; });
  }

  function factionControlledRegions(key, f){
    var map = getMapData() || {};
    return (map.regions || []).filter(function(r){ return factionOwnsRegion(r, key, f); });
  }

  function avgFactionValue(regions, pick){
    var vals = regions.map(function(r){ return Number(pick(regionBundle(r), r)); }).filter(function(n){ return isFinite(n); });
    if (!vals.length) return '';
    return Math.round(vals.reduce(function(a, b){ return a + b; }, 0) / vals.length);
  }

  function factionIndexEntry(f, key){
    var api = window.TM && TM.FactionIndex;
    if (!api || typeof api.getOrRebuild !== 'function') return null;
    var names = [];
    function add(v){
      if (v === undefined || v === null || v === '') return;
      var s = String(v);
      if (names.indexOf(s) < 0) names.push(s);
    }
    add(f && f.name);
    add(f && f.label);
    add(f && f.scenarioFactionName);
    add(f && f.runtimeFactionId);
    add(f && f.stableOwnerKey);
    add(f && f.mapFactionId);
    add(key);
    for (var i = 0; i < names.length; i += 1) {
      try {
        var entry = api.getOrRebuild(names[i]);
        if (entry) return entry;
      } catch (_) {}
    }
    return null;
  }

  function runtimeFactionValue(f, key){
    var live = f && f._runtimeFaction;
    return live && hasValue(live[key]) ? live[key] : undefined;
  }

  function factionProfile(f, key, region){
    f = f || {};
    key = key || f.stableOwnerKey || f.mapFactionId || f.id || '';
    var regions = factionControlledRegions(key, f);
    var sample = region || regions[0] || null;
    var pop = sumFactionValues(regions, function(b, r){ return firstValue(b.data.population, b.pop.mouths, r && r.population, 0); });
    var revenue = sumFactionValues(regions, function(b){ return firstValue(b.fiscal.actualRevenue, 0); });
    var grain = sumFactionValues(regions, function(b){ return firstValue(b.treasury.grain, 0); });
    var indexEntry = factionIndexEntry(f, key);
    var indexMetrics = (indexEntry && indexEntry.metrics) || {};
    var indexedTroops = Number(indexMetrics.totalSoldiers);
    var regionTroops = sumFactionValues(regions, function(b, r){ return firstValue(b.data.garrison, b.army.troops, r && r.troops, 0); });
    var troops = firstValue(indexMetrics.armyCount > 0 && isFinite(indexedTroops) ? indexedTroops : '', regionTroops || '', f.militaryStrength, f.strength, 0);
    var avgMood = avgFactionValue(regions, function(b, r){ return firstValue(b.data.minxinLocal, r && r.mood); });
    var avgCorr = avgFactionValue(regions, function(b){ return firstValue(b.data.corruptionLocal, b.data.corruption); });
    var threats = [];
    var resources = [];
    regions.forEach(function(r){
      var b = regionBundle(r);
      [b.data.threats, b.data.tradeRoutes].forEach(function(v){
        if (Array.isArray(v)) v.forEach(function(x){ if (x && threats.indexOf(x) < 0) threats.push(x); });
        else if (v && threats.indexOf(v) < 0) threats.push(v);
      });
      [b.data.specialResources, r && r.resources].forEach(function(v){
        if (Array.isArray(v)) v.forEach(function(x){ if (x && resources.indexOf(x) < 0) resources.push(x); });
        else if (v && resources.indexOf(v) < 0) resources.push(v);
      });
    });
    return { f: f, key: key, regions: regions, sample: sample, pop: pop, revenue: revenue, grain: grain, troops: troops, avgMood: avgMood, avgCorr: avgCorr, threats: threats, resources: resources, indexEntry: indexEntry, indexMetrics: indexMetrics };
  }

  function factionLeaderCards(f){
    var rows = [];
    function push(title, person){
      if (!person) return;
      var text = typeof person === 'object' ? firstValue(person.name, person.ruler, person.general, person.chancellor, ppValue(person)) : person;
      var meta = typeof person === 'object' ? [person.title, person.role, person.age, person.personality, person.bio].filter(Boolean).join(' / ') : '';
      rows.push('<div class="pp-faction-person"><b>' + esc(title + ' · ' + ppValue(text)) + '</b><span>' + esc(meta || ppValue(person)) + '</span></div>');
    }
    push('君主', f.leaderInfo || f.leader || f.ruler);
    push('继嗣', f.heirInfo || f.heir);
    if (f.leadership && typeof f.leadership === 'object') {
      Object.keys(f.leadership).slice(0, 4).forEach(function(k){ push(fieldLabel(k), f.leadership[k]); });
    }
    return rows.length ? '<div class="pp-faction-portrait-row wide">' + rows.join('') + '</div>' : '';
  }

  function factionTabDetail(f, key, region, active){
    var p = factionProfile(f, key, region);
    var name = firstValue(f.label, f.name, f.scenarioFactionName, p.sample && ownerName(p.sample), key);
    var territoryRows = p.regions.map(function(r){
      var b = regionBundle(r);
      return [regionTitle(r), firstValue(b.data.population, b.pop.mouths, r.population), [firstValue(b.data.officialPosition, b.data.governor, '地块'), firstValue(b.data.terrain, r.terrain), firstValue(b.data.strategicValue, '')].filter(Boolean).join(' · ')];
    });
    var tab = MAP_FACTION_TABS.some(function(t){ return t[0] === active; }) ? active : 'overview';
    var hero = '<section class="pp-faction-hero wide"><div class="pp-faction-head"><div class="pp-faction-seal"><b>' + esc(shortText(f.short || name, 2)) + '</b><span>' + esc(firstValue(f.leaderTitle, f.type, '势力')) + '</span></div><div><div class="pp-faction-title"><span>' + esc(name) + '</span><small>' + esc(firstValue(f.stableOwnerKey, key, f.mapFactionId, f.runtimeFactionId)) + '</small></div><p class="pp-faction-desc">' + esc(firstValue(f.description, f.desc, f.note, '此势力档案合并地图归属与运行态势力数据；AI 推演改写 GM/P 势力后，此处会随刷新同步。')) + '</p><div class="pp-badge-row">' + [firstValue(f.type, f.factionType), firstValue(f.leaderTitle, f.rank), firstValue(f.attitude, f.playerRelation), '领地 ' + p.regions.length].filter(Boolean).map(function(x, i){ return '<span class="' + (i === 0 ? 'good' : '') + '">' + esc(ppValue(x)) + '</span>'; }).join('') + '</div></div></div></section>';
    var ledger = '<div class="pp-ledger-grid wide">' +
      ppLedger('首脑', firstValue(f.leader, f.leaderName, f.ruler, f.scenarioFactionName), '运行态势力字段') +
      ppLedger('首府', firstValue(f.capital, f.home, p.sample && regionTitle(p.sample)), '政治中心') +
      ppLedger('控制地块', p.regions.length + ' 块', p.regions.slice(0, 3).map(regionTitle).join('、')) +
      ppLedger('总人口', firstValue(p.regions.length ? p.pop : '', runtimeFactionValue(f, 'population'), f.population), '势力/地块聚合') +
      ppLedger('总兵力', p.troops, '势力/地块聚合') +
      ppLedger('实收财赋', p.revenue, '所辖地块合计') +
      ppLedger('粮储', p.grain, '所辖地块合计') +
      ppLedger('平均民心', p.avgMood, '所辖地块均值') +
      ppLedger('平均腐败', p.avgCorr, '所辖地块均值') +
    '</div>';
    if (tab === 'overview') {
      return '<div class="pp-tab-detail">' + hero + ledger + factionLeaderCards(f) + ppZone('势力总览', [
        ['政体 / 组织', firstValue(f.government, f.type, f.factionType)],
        ['首领', firstValue(f.leader, f.leaderName, f.ruler)],
        ['称号', firstValue(f.leaderTitle, f.rank)],
        ['首府', firstValue(f.capital, f.home, p.sample && regionTitle(p.sample))],
        ['战略目标', firstValue(f.goal, f.strategy, f.longTermStrategy)],
        ['意识形态', firstValue(f.ideology, f.mainstream)],
        ['文化', f.culture],
        ['成员', f.members],
        ['开局问题', f.openingProblems]
      ], true) + '</div>';
    }
    if (tab === 'territory') {
      return '<div class="pp-tab-detail">' + ledger + ppFieldChips([['剧本领土', f.territory], ['资源', firstValue(f.resources, f.mainResources, p.resources)], ['威胁/商路', p.threats], ['地图编号', f.mapFactionId], ['运行态编号', f.runtimeFactionId]]) + ppTableRows(territoryRows.length ? territoryRows : [['暂无地块', '0', '当前地图未找到归属地块']]) + '</div>';
    }
    if (tab === 'military') {
      return '<div class="pp-tab-detail">' + ppZone('军务与战略', [
        ['总兵力', firstValue(p.troops, runtimeFactionValue(f, 'militaryStrength'), f.militaryStrength)],
        ['军力构成', f.militaryBreakdown],
        ['战争状态', f.warState],
        ['动员', firstValue(f.mobilization, f.manpower)],
        ['战略优先', f.strategicPriorities],
        ['决策提示', firstValue(f.decisionHints, f.npcDecisionHints)],
        ['禁忌动作', f.tabooMoves],
        ['地缘威胁', p.threats]
      ], true) + '</div>';
    }
    if (tab === 'finance') {
      return '<div class="pp-tab-detail">' + ledger + ppZone('财赋与国力', [
        ['经济', firstValue(runtimeFactionValue(f, 'economy'), runtimeFactionValue(f, 'wealth'), p.revenue, f.economy, f.wealth)],
        ['库藏', firstValue(runtimeFactionValue(f, 'treasury'), p.revenue, f.treasury)],
        ['经济结构', f.economicStructure],
        ['经济政策', f.economicPolicy],
        ['公共舆情', f.publicOpinion],
        ['科技', f.techLevel],
        ['文教', f.cultureLevel],
        ['继承', f.succession]
      ], true) + ppFieldChips([['凝聚', f.cohesion], ['优势', f.strengths], ['弱点', f.weaknesses], ['资源', firstValue(f.resources, f.mainResources, p.resources)]]) + '</div>';
    }
    if (tab === 'relations') {
      return '<div class="pp-tab-detail">' + ppTableRows([
        ['关系', f.relations, '外交'],
        ['盟友', f.allies, '阵营'],
        ['敌对', f.enemies, '敌情'],
        ['中立', f.neutrals, '外交'],
        ['态度', firstValue(f.attitudeDetail, f.attitude), '立场'],
        ['玩家关系', f.playerRelation, '关系值'],
        ['冒犯阈值', f.offendThresholds, '风险'],
        ['内部派系', f.internalParties, '内政'],
        ['党派关系', f.partyRelations, '内政'],
        ['已知间谍', f.knownSpies, '情报']
      ]) + '</div>';
    }
    return '<div class="pp-tab-detail">' + ppTableRows([
      ['势力叙事', firstValue(f.description, f.desc), '设定'],
      ['历史脉络', f.history, '设定'],
      ['历史事件', f.historicalEvents, '年表'],
      ['AI 画像', f.aiProfile, '推演'],
      ['长期战略', f.longTermStrategy, '方略'],
      ['胜利条件', f.victoryConditions, '目标'],
      ['失败条件', f.defeatConditions, '败局'],
      ['地图势力编号', f.mapFactionId, '数据链'],
      ['运行态编号', f.runtimeFactionId, '数据链']
    ]) + '</div>';
  }

  function factionPanelRowsV2(f, key, region){
    var profile = factionProfile(f, key, region);
    var regions = profile.regions;
    var sample = profile.sample;
    var pop = profile.pop;
    var revenue = profile.revenue;
    var grain = profile.grain;
    var troops = profile.troops;
    var name = firstValue(f.label, f.name, f.scenarioFactionName, sample && ownerName(sample), key);
    var territoryRows = regions.map(function(r){
      var b = regionBundle(r);
      return [
        regionTitle(r),
        firstValue(b.data.population, b.pop.mouths, r.population),
        [firstValue(b.data.officialPosition, b.data.governor, '地块'), firstValue(b.data.terrain, r.terrain), firstValue(b.data.strategicValue, '')].filter(Boolean).join(' · ')
      ];
    });
    return [
      '<section class="pp-faction-hero wide"><div class="pp-faction-head"><div class="pp-faction-seal"><b>' + esc(shortText(f.short || name, 2)) + '</b><span>' + esc(firstValue(f.leaderTitle, f.type, '势力')) + '</span></div><div><div class="pp-faction-title"><span>' + esc(name) + '</span><small>' + esc(firstValue(key, f.id, f.sid)) + '</small></div><p class="pp-faction-desc">' + esc(firstValue(f.description, f.desc, f.note, '该势力档案来自当前剧本/运行时势力数据，会随地块归属和剧本设定变化。')) + '</p><div class="pp-badge-row">' + [firstValue(f.type, f.factionType), firstValue(f.leaderTitle, f.rank), firstValue(f.attitude, f.playerRelation), '领地 ' + regions.length].filter(Boolean).map(function(x, i){ return '<span class="' + (i === 0 ? 'good' : '') + '">' + esc(ppValue(x)) + '</span>'; }).join('') + '</div></div></div></section>',
      '<div class="pp-ledger-grid wide">' +
        ppLedger('首脑', firstValue(f.leader, f.leaderName, f.ruler, f.scenarioFactionName), '势力首领') +
        ppLedger('首府', firstValue(f.capital, f.home, sample && regionTitle(sample)), '政治中心') +
        ppLedger('控制地块', regions.length + ' 块', regions.slice(0, 3).map(regionTitle).join('、')) +
        ppLedger('总人口', firstValue(regions.length ? pop : '', runtimeFactionValue(f, 'population'), f.population), '剧本/地块聚合') +
        ppLedger('总兵力', troops, '剧本/地块聚合') +
        ppLedger('国势', firstValue(runtimeFactionValue(f, 'strength'), runtimeFactionValue(f, 'score'), f.strength, f.score), '综合实力') +
        ppLedger('府库', firstValue(runtimeFactionValue(f, 'treasury'), revenue, f.treasury), '银粮布马') +
        ppLedger('经济', firstValue(runtimeFactionValue(f, 'economy'), revenue, f.economy), '经济基础') +
        ppLedger('粮储', grain, '地块府库合计') +
      '</div>',
      ppFieldChips([
        ['目标', firstValue(f.goal, f.strategy, f.longTermStrategy)],
        ['资源', firstValue(f.resources, f.mainResources)],
        ['意识', firstValue(f.ideology, f.mainstream)],
        ['文化', f.culture],
        ['性格', f.personality],
        ['领土', f.territory],
        ['优势', f.strengths],
        ['弱点', f.weaknesses]
      ]),
      ppZone('势力 · 总览', [
        ['首脑', firstValue(f.leader, f.leaderName, f.ruler, f.scenarioFactionName)],
        ['称号', firstValue(f.leaderTitle, f.rank)],
        ['政体', firstValue(f.government, f.type, f.factionType)],
        ['首府/核心', firstValue(f.capital, f.home, sample && regionTitle(sample))],
        ['对朝态度', firstValue(f.attitude, f.playerRelation, f.relation)],
        ['长期目标', firstValue(f.goal, f.longTermStrategy, f.agenda)]
      ]),
      ppZone('军务 · 财赋', [
        ['军力', firstValue(troops, runtimeFactionValue(f, 'militaryStrength'), f.militaryStrength, f.strength, f.army)],
        ['军力分解', f.militaryBreakdown],
        ['战争状态', f.warState],
        ['经济', firstValue(runtimeFactionValue(f, 'economy'), runtimeFactionValue(f, 'wealth'), revenue, f.economy, f.wealth)],
        ['经济结构', f.economicStructure],
        ['府库', firstValue(runtimeFactionValue(f, 'treasury'), revenue, f.treasury)],
        ['动员', firstValue(f.mobilization, f.manpower)],
        ['风险', firstValue(f.openingProblems, f.risk, f.risks)]
      ]),
      ppZone('内政 · 凝聚', [
        ['朝廷影响', f.courtInfluence],
        ['民间影响', f.popularInfluence],
        ['威望', f.prestige],
        ['凝聚', f.cohesion],
        ['继承', f.succession],
        ['科技', f.techLevel],
        ['文化水平', f.cultureLevel],
        ['舆情', f.publicOpinion]
      ]),
      ppZone('外交 · 暗线', [
        ['关系', f.relations],
        ['盟友', f.allies],
        ['敌对', f.enemies],
        ['中立', f.neutrals],
        ['冒犯阈值', f.offendThresholds],
        ['已知间谍', f.knownSpies],
        ['内部党派', f.internalParties],
        ['党派关系', f.partyRelations]
      ]),
      '<div class="pp-section-strip wide">所属地块</div>',
      ppTableRows(territoryRows.length ? territoryRows : [['暂无地块', '0', '当前地图没有可读取地块']]),
      '<div class="pp-section-strip wide">史料与推演</div>',
      ppTableRows([
        ['势力叙事', firstValue(f.description, f.desc), '设定'],
        ['历史脉络', f.history, '设定'],
        ['历史事件', f.historicalEvents, '年表'],
        ['AI 姿态', f.aiProfile, '推演'],
        ['决策提示', firstValue(f.decisionHints, f.npcDecisionHints), '推演'],
        ['禁忌动作', f.tabooMoves, '风险'],
        ['胜利条件', f.victoryConditions, '目标'],
        ['失败条件', f.defeatConditions, '败局']
      ]),
      '<div class="pp-action-row wide">' +
        '<button type="button" class="pp-action" data-pp-action="map">回到舆图</button>' +
        '<button type="button" class="pp-action" data-pp-action="issue">转奏档</button>' +
        '<button type="button" class="pp-action" data-pp-action="finance">财赋面板</button>' +
      '</div>'
    ].join('');
  }

  function factionSupplementRows(f, key, region, active){
    var p = factionProfile(f || {}, key, region);
    var regions = p.regions || [];
    return [
      ppFieldChips([
        ['运行来源', f.runtimeFactionId ? 'GM/P 势力对象' : '地图势力档案'],
        ['稳定归属键', firstValue(f.stableOwnerKey, f.mapFactionId, key)],
        ['运行态编号', f.runtimeFactionId],
        ['当前标签', active],
        ['AI 可改字段', '目标、关系、军力、经济、库藏、策略、舆情、内部派系、地块归属']
      ]),
      ppZone('推演读写账本', [
        ['地图对象', 'GM.mapData / P.map / P.mapData 已统一引用'],
        ['势力对象', f.runtimeFactionId ? '已合并运行态势力' : '未找到运行态，使用地图档案'],
        ['归属重绘', '归属键改变后重绘地图颜色与天下势力名'],
        ['保存路径', '存档写入 GM._savedMapData，读档后回绑到 GM/P'],
        ['地块数', regions.length + ' 块']
      ], true),
      '<section class="pp-zone wide"><div class="pp-zt">所辖地块</div><div class="tmf-region-links">' + (regions.length ? regions.map(function(r){
        return '<button type="button" onclick="TMPhase8FormalBridge.openRegionById(\'' + attr(r.id || r.name || r.title || '') + '\')">' + esc(regionTitle(r)) + '</button>';
      }).join('') : '<span>当前地图没有读取到所辖地块</span>') + '</div></section>',
      '<div class="pp-action-row wide">' +
        '<button type="button" class="pp-action" data-pp-action="map">回到舆图</button>' +
        '<button type="button" class="pp-action" data-pp-action="issue">转御案</button>' +
        '<button type="button" class="pp-action" data-pp-action="finance">财赋面板</button>' +
      '</div>'
    ].join('');
  }

  function openFactionDossier(key, region){
    var map = getMapData() || {};
    var f = findFaction(key, region && (region.factionName || region.ownerName)) || {};
    var r = region || factionControlledRegions(key, f)[0] || ((map.regions || []).find(function(x){ return ownerKey(x) === key; }) || null);
    key = key || (r && ownerKey(r)) || '';
    var name = firstValue(f.label, f.name, f.scenarioFactionName, r && ownerName(r), key, '未名势力');
    state.mapFactionTab = state.mapFactionTab || 'overview';
    var active = MAP_FACTION_TABS.some(function(t){ return t[0] === state.mapFactionTab; }) ? state.mapFactionTab : 'overview';
    var pop = ensureMapPpop();
    pop.dataset.panelKind = 'faction';
    pop.dataset.factionKey = key;
    pop.className = 'tmf-map-ppop faction-panel show';
    pop.innerHTML =
      '<div class="pp-top"><div class="pp-crest">' + esc(shortText(f.short || name, 2)) + '</div><div class="pp-title-wrap"><div class="pp-name">' + esc(name) + '</div><div class="pp-level">' + esc(firstValue(f.type, f.factionType, '势力档案')) + '</div></div><span class="pp-top-mark">势力</span><button type="button" class="pp-close" data-pp-close="1">×</button></div>' +
      '<div class="pp-tabs">' + ppTabButtons('faction', active) + '</div>' +
      '<div class="pp-tab-body">' + factionTabDetail(f, key, r, active) + '</div>' +
      '<div class="pp-tab-body"><div class="pp-faction-hero"><div class="pp-mode-seal">势</div><div><b>' + esc(firstValue(f.rank, f.type, '势力')) + '</b><p class="pp-faction-desc">' + esc(firstValue(f.note, f.description, f.desc, '该势力档案来自当前剧本/运行时势力数据，会随地块归属和剧本设定变化。')) + '</p></div></div></div>' +
      '<div class="pp-grid">' + factionSupplementRows(f, key, r, active) + '</div>';
    document.body.classList.add('province-panel-open');
  }

  function refreshMapPpop(){
    var pop = document.getElementById('ppop');
    if (!pop || !pop.classList.contains('show')) return;
    if (pop.dataset.panelKind === 'faction') {
      openFactionDossier(pop.dataset.factionKey || '');
      return;
    }
    var r = findRegion(pop.dataset.regionId || '');
    if (r) openRegionDossier(r);
  }

  function refreshMapFromRuntime(){
    getMapData();
    renderFormalMapSoon();
    setTimeout(refreshMapPpop, 0);
  }

  function installMapRefreshHooks(){
    if (state.mapRefreshHooksInstalled) return;
    state.mapRefreshHooksInstalled = true;
    ['tm-map-changed','tm:map-changed','tm-state-updated','tm:state-updated','tm-save-loaded','tm:save-loaded','tm-endturn-done','tm:endturn:done','tm:endturn:complete'].forEach(function(name){
      window.addEventListener(name, refreshMapFromRuntime);
      document.addEventListener(name, refreshMapFromRuntime);
    });
    if (window.EndTurnHooks && typeof EndTurnHooks.register === 'function') {
      try { EndTurnHooks.register('after', refreshMapFromRuntime, 'phase8-formal-map-refresh'); } catch(_) {}
    }
  }

  function renderMapAlerts(map){
    var host = document.querySelector('#mapwrap .map-alert-strip');
    if (!host) return;
    var issues = [];
    try { issues = typeof getIssues === 'function' ? getIssues() : []; } catch(_) { issues = []; }
    var urgent = issues.filter(function(x){ return x && String(x.status || 'pending') !== 'done'; }).slice(0, 2);
    var buttons = urgent.map(function(x, i){
      return '<button type="button" class="map-alert ' + (i === 0 ? 'hot' : '') + '" onclick="TMPhase8FormalBridge.openModule(\'memorial\')" title="' + attr(x.title || '') + '">' + esc(shortText(x.title || '待批奏疏', 10)) + '</button>';
    });
    if (buttons.length < 2) buttons.push('<button type="button" class="map-alert" onclick="TMPhase8FormalBridge.openPanel(\'issue\')">朝议待核</button>');
    buttons.push('<button type="button" class="map-alert ok" onclick="TMPhase8FormalBridge.openPanel(\'finance\')">财赋入库</button>');
    host.innerHTML = buttons.slice(0, 3).join('');
    var hint = document.getElementById('tmf-map-hint');
    if (hint) {
      var count = map && Array.isArray(map.regions) ? map.regions.length : 0;
      hint.textContent = mapScaleNote() + ' · ' + mapModeNote() + ' · ' + count + ' 地块 · 点击地块查看档案，右键查看势力。';
    }
  }

  // ── public API attach (Wave 6·map) ────────────────────────────────
  bridge.map = bridge.map || {};
  bridge.map.renderFormalMap = renderFormalMap;
  bridge.map.renderFormalMapSoon = renderFormalMapSoon;
  bridge.map.ensureMainShell = ensureMainShell;
  bridge.map.getMapData = getMapData;
  bridge.map.findRegion = findRegion;
  bridge.map.focusRegion = focusRegion;
  bridge.map.openRegionDossier = openRegionDossier;
  bridge.map.openFactionDossier = openFactionDossier;
  bridge.map.closeMapDossier = closeMapDossier;
  bridge.map.refreshMapFromRuntime = refreshMapFromRuntime;
  bridge.map.installMapRefreshHooks = installMapRefreshHooks;
  bridge.map.renderMapAlerts = renderMapAlerts;
  bridge.map.updateMapChrome = updateMapChrome;
  bridge.map.factionOwnsRegion = factionOwnsRegion;
  bridge.map.ownerKey = ownerKey;
  bridge.map.ownerName = ownerName;
  bridge.map.findFaction = findFaction;
  bridge.map.dossierRows = dossierRows;
  bridge.map.fmtNum = fmtNum;

  // ── re-attach bridge exposes that previously came from bridge.js ──
  bridge._ownerKey = ownerKey;
  bridge._ownerName = ownerName;
  bridge._findFaction = findFaction;
  bridge._getMapData = getMapData;
  bridge._dossierRows = dossierRows;
  bridge._fmtNum = fmtNum;

})();
