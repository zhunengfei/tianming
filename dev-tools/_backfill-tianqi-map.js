// 第一刀·地图数据回灌：把 snapshot(游戏权威) 的 adminHierarchy(429府州) + map/mapData(laterjin新地图)
// 回灌进当前 JSON 源(只覆盖这3键·保留 JSON 的 203人物等新数据)，地图块 owner ID 按 factionName 重映射到 JSON 势力 ID。
const fs = require('fs');
const path = require('path');
const repoRoot = path.resolve(__dirname, '..', '..');
const jsonPath = path.join(repoRoot, 'scenarios', '天启七年·九月（官方）.json');

// 1) 载入 snapshot（P 桩让 applySnapshot 跑）
global.window = global;
var sid = 'sc-tianqi7-1627';
global.P = { scenarios: [{ id: sid }] };
global.localStorage = { setItem: function () {}, getItem: function () { return null; } };
require(path.join(repoRoot, 'web', 'data', 'scenario-supplements', 'tianqi7-official-runtime-snapshot.js'));

setTimeout(function () {
  var snap = global.P.scenarios.find(function (s) { return s.id === sid && s._runtimeSnapshot; });
  var snapFacs = global.P.factions || [];
  var json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  // 2) 重映射表：snapshot 势力 ID → name → JSON 势力 ID
  var snapIdToName = {}; snapFacs.forEach(function (f) { if (f.id) snapIdToName[f.id] = f.name; });
  var nameToJsonId = {}; (json.factions || []).forEach(function (f) { if (f.name) nameToJsonId[f.name] = f.id || f.stableId || f.name; });
  function remapFacRef(v) {
    if (v && snapIdToName[v] && nameToJsonId[snapIdToName[v]]) return nameToJsonId[snapIdToName[v]];
    return v;
  }
  var ID_FIELDS = ['owner', 'currentOwner', 'controller', 'factionId', 'stableFactionId', 'initialOwner'];

  // 3) 深拷贝 snapshot 的 map，重映射地图块的势力 ID 字段（factionName/ownerKey 不动）
  var newMap = JSON.parse(JSON.stringify(snap.map));
  var remapCount = 0;
  (newMap.regions || []).forEach(function (r) {
    ID_FIELDS.forEach(function (k) {
      if (r[k] != null && r[k] !== remapFacRef(r[k])) { r[k] = remapFacRef(r[k]); remapCount++; }
    });
  });
  // map.factions 字典的 key 也可能是旧 ID → 重映射（按其 name 或值）
  if (newMap.factions && typeof newMap.factions === 'object') {
    var remappedFactions = {};
    Object.keys(newMap.factions).forEach(function (k) {
      var meta = newMap.factions[k] || {};
      var nm = meta.scenarioFactionName || meta.label || meta.name;
      var newKey = (nm && nameToJsonId[nm]) ? nameToJsonId[nm] : remapFacRef(k);
      if (meta.scenarioFactionId) meta.scenarioFactionId = remapFacRef(meta.scenarioFactionId);
      remappedFactions[newKey] = meta;
    });
    newMap.factions = remappedFactions;
  }

  // 4) adminHierarchy(429)：用稳定键(fac-ming)·防御性同样跑一遍重映射（无匹配则不变）
  var newAdmin = JSON.parse(JSON.stringify(snap.adminHierarchy));
  Object.keys(newAdmin).forEach(function (fk) {
    (function dig(ds) {
      (ds || []).forEach(function (d) {
        ID_FIELDS.forEach(function (k) { if (d[k] != null) d[k] = remapFacRef(d[k]); });
        dig(d.children);
      });
    })((newAdmin[fk] || {}).divisions);
  });

  // 5) 备份 + 覆盖三键
  var bak = jsonPath + '.bak-mapbackfill-20260605';
  fs.writeFileSync(bak, fs.readFileSync(jsonPath));
  function countDiv(ah) { var c = 0; Object.keys(ah || {}).forEach(function (fk) { (function dig(ds) { (ds || []).forEach(function (d) { c++; dig(d.children); }); })((ah[fk] || {}).divisions); }); return c; }
  var beforeDiv = countDiv(json.adminHierarchy), beforeReg = ((json.map || {}).regions || []).length;
  json.adminHierarchy = newAdmin;
  json.map = newMap;
  json.mapData = JSON.parse(JSON.stringify(newMap));
  fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2), 'utf8');

  console.log('备份:', path.basename(bak));
  console.log('adminHierarchy 区划: ' + beforeDiv + ' → ' + countDiv(json.adminHierarchy));
  console.log('map.regions: ' + beforeReg + ' → ' + (json.map.regions || []).length);
  console.log('地图块势力ID重映射字段数:', remapCount);
  // 验证 owner 全部解析到 JSON 势力
  var jFacIds = {}; (json.factions || []).forEach(function (f) { if (f.id) jFacIds[f.id] = 1; if (f.stableId) jFacIds[f.stableId] = 1; if (f.name) jFacIds[f.name] = 1; });
  var unresolved = (json.map.regions || []).filter(function (r) { return r.owner && !jFacIds[r.owner]; }).map(function (r) { return r.name + '→' + r.owner; });
  console.log('owner 解析不到 JSON 势力的地图块:', unresolved.length ? unresolved.join(' | ') : '(全部解析✓)');
}, 400);
