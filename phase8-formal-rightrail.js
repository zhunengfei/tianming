// phase8-formal-rightrail.js·右 rail (8 menu icon + drawer + event feed)
// split from phase8-formal-bridge.js·2026-05-26
// paradigm·head alias 块 / body 0 改动

(function(){
  'use strict';

  var bridge = window.TMPhase8FormalBridge;
  if (!bridge) {
    console.error('[phase8-formal-rightrail] TMPhase8FormalBridge not init·bridge.js 必须先 load');
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
  var ownerKey = bridge._ownerKey;
  var ownerName = bridge._ownerName;
  var findFaction = bridge._findFaction;
  var findPerson = bridge._findPerson;
  var personKey = bridge._personKey;
  var getPeople = bridge._getPeople;
  var getMapData = bridge._getMapData;
  var getParties = bridge._getParties;
  var getClasses = bridge._getClasses;
  var collectRecentEvents = bridge._collectRecentEvents;

  // ── module body (P3 Wave 3 迁入) ─────────────────────────────────
  // 待迁·
  //   openPanel / updateRailActive / updateRailBadges
  //   renderRightWenduiPanel / renderRightChaoyiPanel
  //   renderRightArmyDetailCard
  //   renderArmy (KEEP V0·dispatch 用)
  //   renderMapPanelRich / renderFinanceRich / renderWenRich / renderGangRich
  //   renderRumorRich / renderPinnedPeopleRich / renderZhiRich
  //   renderRightClassPanel / renderRightPartyPanel / renderRightOfficeNode
  //   renderZheng (KEEP V0·dispatch 用)
  //   renderEventFeed / renderEventTurnMenu / openEventDetail
  //   right* private helpers (rightChaoyiModeLabel etc.)
  //   renderers dispatch table

  bridge.rightrail = bridge.rightrail || {};
})();
