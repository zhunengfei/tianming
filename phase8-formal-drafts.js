// phase8-formal-drafts.js·起草面板 (诏/朱批/鸿雁) + desk overlay + 议事清册
// split from phase8-formal-bridge.js·2026-05-26
// paradigm·head alias 块 / body 0 改动

(function(){
  'use strict';

  var bridge = window.TMPhase8FormalBridge;
  if (!bridge) {
    console.error('[phase8-formal-drafts] TMPhase8FormalBridge not init·bridge.js 必须先 load');
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

  // ── module body (P3 Wave 4 迁入) ─────────────────────────────────
  // 待迁·
  //   renderFormalEdictPanel / renderFormalMemorialPanel / renderFormalLetterPanel
  //   renderEdictSuggestionItem / renderMemorialCardV4
  //   renderFormalInboxItem / renderFormalLetterCard
  //   renderFormalMemorialTransit
  //   openDeskOverlay / captureDeskOverlayState
  //   updateFormalEdictDraft / updateFormalMemorialReply / updateFormalLetterDraft

  bridge.drafts = bridge.drafts || {};
})();
