// phase8-formal-modules.js·module 分发 (12 kind·中央内容区)
// split from phase8-formal-bridge.js·2026-05-26
// paradigm·head alias 块 / body 0 改动

(function(){
  'use strict';

  var bridge = window.TMPhase8FormalBridge;
  if (!bridge) {
    console.error('[phase8-formal-modules] TMPhase8FormalBridge not init·bridge.js 必须先 load');
    return;
  }

  var state = window.TM_PHASE8_FORMAL;

  // ── alias 块 ─────────────────────────────────────────────────────
  var esc = bridge._esc;
  var attr = bridge._attr;
  var miniRows = bridge._miniRows;
  var actionButton = bridge._actionButton;
  var moduleShell = bridge._moduleShell;
  var asset = bridge._asset;
  var fmtNum = bridge._fmtNum;
  var findPerson = bridge._findPerson;
  var personKey = bridge._personKey;
  var getPeople = bridge._getPeople;
  var getParties = bridge._getParties;
  var getClasses = bridge._getClasses;
  var collectRecentEvents = bridge._collectRecentEvents;

  // ── module body (P3 Wave 5 迁入) ─────────────────────────────────
  // 待迁·
  //   openModule / renderModule (dispatch 主门面)
  //   renderEdictModule / renderMemorialModule / renderLetterModule
  //   renderRecordsModule / renderRenwuModule / renderShizhengModule
  //   renderWenduiModule / renderChaoyiModule / renderKejuModule
  //   renderWenshiModule / renderFinanceModule / renderOfficeModule
  //   renderIssueListForEdict
  //   tmfRenwuText / 人物图志 detail render

  bridge.modules = bridge.modules || {};
})();
