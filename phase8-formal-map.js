// phase8-formal-map.js·中央地图 (含 region/faction popup·alerts strip)
// split from phase8-formal-bridge.js·2026-05-26
// paradigm·head alias 块 / body 0 改动

(function(){
  'use strict';

  var bridge = window.TMPhase8FormalBridge;
  if (!bridge) {
    console.error('[phase8-formal-map] TMPhase8FormalBridge not init·bridge.js 必须先 load');
    return;
  }

  var state = window.TM_PHASE8_FORMAL;

  // ── alias 块 ─────────────────────────────────────────────────────
  var esc = bridge._esc;
  var attr = bridge._attr;
  var miniRows = bridge._miniRows;
  var actionButton = bridge._actionButton;
  var asset = bridge._asset;
  var fmtNum = bridge._fmtNum;
  var dossierRows = bridge._dossierRows;
  var ownerKey = bridge._ownerKey;
  var ownerName = bridge._ownerName;
  var findFaction = bridge._findFaction;
  var getMapData = bridge._getMapData;
  var collectRecentEvents = bridge._collectRecentEvents;

  // ── module body (P3 Wave 6 迁入) ─────────────────────────────────
  // 待迁·
  //   renderFormalMap / renderFormalMapSoon
  //   updateMapChrome / renderLegend / renderMapSearchResults
  //   openRegionDossier (L3654 winner) / openFactionDossier (L4029 winner)
  //   closeMapDossier
  //   renderMapAlerts
  //   MAP_REGION_TABS / MAP_MODE_META 常量

  bridge.map = bridge.map || {};
})();
