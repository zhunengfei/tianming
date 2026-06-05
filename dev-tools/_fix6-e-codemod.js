// 深查修·刀E — bug3项目库假成功：putProjectBody 返回真落盘布尔 + saveProjectSnapshot 如实反馈。
const fs = require('fs');
const path = 'preview/scenario-editor-reset-app.js';
let s = fs.readFileSync(path, 'utf8');
const orig = s;
let edits = [];
function once(a, b, t) { const n = s.split(a).length - 1; if (n !== 1) throw new Error('ANCHOR ' + t + ' x' + n); s = s.replace(a, b); edits.push(t); }

// 1) putProjectBody 返回 durable 布尔（不再 db 缺失时假成功）
once(
  "  function putProjectBody(snapshot) {\n" +
  "    projectMemoryBodies[snapshot.id] = clone(snapshot);\n" +
  "    return openProjectDb().then(function(db) {\n" +
  "      if (!db) return snapshot;\n" +
  "      return new Promise(function(resolve, reject) {\n" +
  "        var tx = db.transaction(PROJECT_DB_STORE, 'readwrite');\n" +
  "        tx.objectStore(PROJECT_DB_STORE).put(snapshot);\n" +
  "        tx.oncomplete = function() { db.close(); resolve(snapshot); };\n" +
  "        tx.onerror = function() { db.close(); reject(tx.error || new Error('IndexedDB put failed')); };\n" +
  "      });\n" +
  "    });\n" +
  "  }",
  "  function putProjectBody(snapshot) {\n" +
  "    projectMemoryBodies[snapshot.id] = clone(snapshot);\n" +
  "    // 修假成功：返回是否真落盘(IndexedDB)。db 不可用/出错→false(仅会话内存)，让调用方如实告诉用户而非谎报已存。\n" +
  "    return openProjectDb().then(function(db) {\n" +
  "      if (!db) return false;\n" +
  "      return new Promise(function(resolve) {\n" +
  "        try {\n" +
  "          var tx = db.transaction(PROJECT_DB_STORE, 'readwrite');\n" +
  "          tx.objectStore(PROJECT_DB_STORE).put(snapshot);\n" +
  "          tx.oncomplete = function() { db.close(); resolve(true); };\n" +
  "          tx.onerror = function() { db.close(); resolve(false); };\n" +
  "        } catch (_) { resolve(false); }\n" +
  "      });\n" +
  "    }).catch(function() { return false; });\n" +
  "  }",
  'putProjectBody');

// 2) saveProjectSnapshot 取 durable + 如实反馈
once(
  "    await putProjectBody(snapshot);\n" +
  "    var meta = compactProjectMeta(snapshot);",
  "    var durable = await putProjectBody(snapshot);\n" +
  "    var meta = compactProjectMeta(snapshot);",
  'saveSnapDurable');
once(
  "    setStatus('已存入案卷库：' + snapshot.name, 'good');",
  "    setStatus(durable ? ('已存入案卷库：' + snapshot.name) : ('已存入会话内存：' + snapshot.name + '·但本地库(IndexedDB)不可用，关闭页面将丢失，请「导出案卷包」备份'), durable ? 'good' : 'warn');",
  'saveSnapStatus');

fs.writeFileSync(path, s, 'utf8');
console.log('EDITS:', edits.join(' | '), '| delta:', s.length - orig.length);
