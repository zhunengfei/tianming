// QuotaExceeded 治本 — 超大草稿落 IndexedDB 后备（不再静默丢一整轮编辑）。
const fs = require('fs');
const path = 'preview/scenario-editor-reset-app.js';
let s = fs.readFileSync(path, 'utf8');
const orig = s;
let edits = [];
function once(a, b, t) { const n = s.split(a).length - 1; if (n !== 1) throw new Error('ANCHOR ' + t + ' x' + n); s = s.replace(a, b); edits.push(t); }

// 1) 模块级变量（projectMemoryBodies 后）
once(
  "  var projectMemoryBodies = {};",
  "  var projectMemoryBodies = {};\n" +
  "  var DRAFT_DB_ID = '__autosaveDraft__';  // 治 quota：超大剧本草稿落 IndexedDB 的保留 key\n" +
  "  var idbDraftCache = null;               // 启动时异步捞到的 IndexedDB 草稿（localStorage 装不下时的后备）\n" +
  "  var idbDraftActive = false;             // 当前草稿是否存在 IndexedDB（避免每次小存都去开 DB 删）",
  'vars');

// 2) 草稿专用 IndexedDB 读写 + 落盘助手（deleteProjectBody 后、pushHistoryLog 前）
const DRAFT_FNS =
  "  // 治 quota：超大草稿专用的 IndexedDB 读写（复用项目库的 DB/store，保留 key __autosaveDraft__）。\n" +
  "  function putDraftBody(payload) {\n" +
  "    return openProjectDb().then(function (db) {\n" +
  "      if (!db) return false;\n" +
  "      return new Promise(function (resolve) {\n" +
  "        try {\n" +
  "          var tx = db.transaction(PROJECT_DB_STORE, 'readwrite');\n" +
  "          tx.objectStore(PROJECT_DB_STORE).put({ id: DRAFT_DB_ID, draft: payload });\n" +
  "          tx.oncomplete = function () { db.close(); resolve(true); };\n" +
  "          tx.onerror = function () { db.close(); resolve(false); };\n" +
  "        } catch (_) { resolve(false); }\n" +
  "      });\n" +
  "    }).catch(function () { return false; });\n" +
  "  }\n" +
  "  function getDraftBody() {\n" +
  "    return openProjectDb().then(function (db) {\n" +
  "      if (!db) return null;\n" +
  "      return new Promise(function (resolve) {\n" +
  "        try {\n" +
  "          var tx = db.transaction(PROJECT_DB_STORE, 'readonly');\n" +
  "          var request = tx.objectStore(PROJECT_DB_STORE).get(DRAFT_DB_ID);\n" +
  "          request.onsuccess = function () { db.close(); resolve(request.result ? request.result.draft : null); };\n" +
  "          request.onerror = function () { db.close(); resolve(null); };\n" +
  "        } catch (_) { resolve(null); }\n" +
  "      });\n" +
  "    }).catch(function () { return null; });\n" +
  "  }\n" +
  "  function deleteDraftBody() {\n" +
  "    openProjectDb().then(function (db) {\n" +
  "      if (!db) return;\n" +
  "      try {\n" +
  "        var tx = db.transaction(PROJECT_DB_STORE, 'readwrite');\n" +
  "        tx.objectStore(PROJECT_DB_STORE).delete(DRAFT_DB_ID);\n" +
  "        tx.oncomplete = function () { db.close(); };\n" +
  "        tx.onerror = function () { db.close(); };\n" +
  "      } catch (_) {}\n" +
  "    }).catch(function () {});\n" +
  "  }\n" +
  "  // 治 quota：把超大草稿写进 IndexedDB，成功/失败都如实反馈（绝不静默成功）。\n" +
  "  function persistDraftToIdb(payload) {\n" +
  "    putDraftBody(payload).then(function (ok) {\n" +
  "      idbDraftActive = !!ok; if (ok) idbDraftCache = payload;\n" +
  "      setSaveIndicator(ok ? 'saved' : 'error', ok ? payload.savedAt : null,\n" +
  "        ok ? '大剧本·已存本地库（IndexedDB）' : '剧本过大且本地库不可用·请手动导出 JSON 备份');\n" +
  "    });\n" +
  "  }\n\n" +
  "  function pushHistoryLog(type, detail) {";
once("  function pushHistoryLog(type, detail) {", DRAFT_FNS, 'draftFns');

// 3) readStoredDraft 加 IndexedDB 后备
once(
  "  function readStoredDraft() {\n" +
  "    try {\n" +
  "      var raw = localStorage.getItem(STORAGE_KEY);\n" +
  "      if (!raw) return null;\n" +
  "      var parsed = JSON.parse(raw);\n" +
  "      if (!parsed || !parsed.scenario) return null;\n" +
  "      return parsed;\n" +
  "    } catch (_) {\n" +
  "      return null;\n" +
  "    }\n" +
  "  }",
  "  function readStoredDraft() {\n" +
  "    try {\n" +
  "      var raw = localStorage.getItem(STORAGE_KEY);\n" +
  "      if (raw) {\n" +
  "        var parsed = JSON.parse(raw);\n" +
  "        if (parsed && parsed.scenario) return parsed;\n" +
  "      }\n" +
  "    } catch (_) {}\n" +
  "    // 治 quota：localStorage 没有（大剧本走了 IndexedDB）→ 用启动时异步捞好的 IndexedDB 草稿。\n" +
  "    if (idbDraftCache && idbDraftCache.scenario) return idbDraftCache;\n" +
  "    return null;\n" +
  "  }",
  'readStoredDraft');

// 4) writeStoredDraft 的 try/catch 改为落 IndexedDB 后备
once(
  "    try {\n" +
  "      var raw = JSON.stringify(payload);\n" +
  "      if (raw.length > DRAFT_PERSIST_MAX) {\n" +
  "        try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}   // 清旧草稿·避免重载恢复到过期内容\n" +
  "        setSaveIndicator('error', null, '剧本过大·自动存草稿已暂停（编辑/应用/导出不受影响）');\n" +
  "        return;\n" +
  "      }\n" +
  "      localStorage.setItem(STORAGE_KEY, raw);\n" +
  "      setSaveIndicator('saved', payload.savedAt);\n" +
  "    } catch (err) {\n" +
  "      setSaveIndicator('error', null,\n" +
  "        (err && err.name === 'QuotaExceededError')\n" +
  "          ? '存储空间不足·自动存草稿已暂停（编辑/应用/导出不受影响）'\n" +
  "          : ((err && err.message) || '自动存草稿失败'));\n" +
  "      // 不再 throw：持久化失败是非致命的，内存里的编辑/应用照常生效\n" +
  "    }",
  "    try {\n" +
  "      var raw = JSON.stringify(payload);\n" +
  "      if (raw.length > DRAFT_PERSIST_MAX) {\n" +
  "        // 治 quota：超大剧本（天启 3.7M）localStorage 装不下 → 落 IndexedDB（配额远大），不再静默丢编辑。\n" +
  "        try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}\n" +
  "        persistDraftToIdb(payload);\n" +
  "        return;\n" +
  "      }\n" +
  "      localStorage.setItem(STORAGE_KEY, raw);\n" +
  "      if (idbDraftActive) { idbDraftActive = false; deleteDraftBody(); }  // 转回小草稿·清旧 IndexedDB 后备避免读到过期\n" +
  "      setSaveIndicator('saved', payload.savedAt);\n" +
  "    } catch (err) {\n" +
  "      // localStorage 配额炸了也别静默丢 → 同样落 IndexedDB 后备。\n" +
  "      try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}\n" +
  "      if (err && err.name === 'QuotaExceededError') {\n" +
  "        persistDraftToIdb(payload);\n" +
  "      } else {\n" +
  "        setSaveIndicator('error', null, (err && err.message) || '自动存草稿失败');\n" +
  "      }\n" +
  "      // 不再 throw：持久化失败是非致命的，内存里的编辑/应用照常生效\n" +
  "    }",
  'writeStoredDraft');

// 5) init 拆为 init + finishInit，先异步捞 IndexedDB 草稿
once(
  "  function init() {\n" +
  "    bootstrapChrome();\n" +
  "    bootstrapSectionNav();\n" +
  "    bootstrapAiPromptControls();\n" +
  "    wireEvents();\n" +
  "    loadScenario();\n",
  "  function init() {\n" +
  "    bootstrapChrome();\n" +
  "    bootstrapSectionNav();\n" +
  "    bootstrapAiPromptControls();\n" +
  "    wireEvents();\n" +
  "    // 治 quota：localStorage 没草稿（大剧本可能存在 IndexedDB）时，先异步捞 IndexedDB 草稿再载入。\n" +
  "    if (!readStoredDraft() && global.indexedDB) {\n" +
  "      getDraftBody().then(function (idb) { idbDraftCache = idb || null; idbDraftActive = !!idb; finishInit(); })\n" +
  "        .catch(function () { finishInit(); });\n" +
  "    } else {\n" +
  "      finishInit();\n" +
  "    }\n" +
  "  }\n" +
  "  function finishInit() {\n" +
  "    loadScenario();\n",
  'init');

fs.writeFileSync(path, s, 'utf8');
console.log('EDITS:', edits.join(' | '), '| delta:', s.length - orig.length);
