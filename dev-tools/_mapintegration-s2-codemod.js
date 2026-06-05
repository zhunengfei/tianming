// 地图接入 · 刀2：反向桥 convertScenarioToMapEditor —— 剧本/游戏格式 → map-editor 原生 divisions。
// 纯附加，不动既有正向桥。几何取自 map.regions[].polygon/coords/path，gameplay 取自 adminHierarchy.divisions。
const fs = require('fs');
const path = 'map-editor-to-game.js';
let s = fs.readFileSync(path, 'utf8');
const orig = s;
const edits = [];
function once(a, b, t) {
  const n = s.split(a).length - 1;
  if (n !== 1) throw new Error('ANCHOR ' + t + ' matched x' + n + ' (need 1)');
  s = s.replace(a, b);
  edits.push(t);
}

const REVERSE_FNS =
"  // ─── ⁹ 反向桥·剧本/游戏格式 → map-editor 原生 divisions (刀２) ──────\n" +
"  //\n" +
"  // 输入·scenario { map:{regions[],factions}, adminHierarchy:{[fac]:{divisions[]}} }\n" +
"  // 输出·{ dynasty, era, title, bitmapWidth, bitmapHeight, divisions[], factions[] }·可直馈 ME.loadMap\n" +
"  // 几何取 map.regions·gameplay 取 adminHierarchy.divisions(最全)·按 id 合。loadMap 会走 createDivision 补全默认。\n" +
"  function convertScenarioToMapEditor(scenario){\n" +
"    scenario = scenario || {};\n" +
"    var map = scenario.map || scenario.mapData || {};\n" +
"    var regions = Array.isArray(map.regions) ? map.regions : [];\n" +
"    var ah = scenario.adminHierarchy;\n" +
"\n" +
"    // 几何索引·多键登记·官方剧本 div↔region 是松链接(div.name 常等于 region.adminBinding)\n" +
"    var geomById = {};\n" +
"    function regKey(k, poly){ if (k != null && k !== '' && geomById[k] == null && poly && poly.length >= 3) geomById[k] = poly; }\n" +
"    regions.forEach(function(r){\n" +
"      if (!r) return;\n" +
"      var poly = regionToPolygon(r);\n" +
"      if (!poly || poly.length < 3) return;\n" +
"      regKey(r.id, poly); regKey(r.mapRegionId, poly); regKey(r.name, poly); regKey(r.adminBinding, poly); regKey(r.sourceId, poly);\n" +
"    });\n" +
"\n" +
"    var divisions = [];\n" +
"    var factions = [];\n" +
"    var facSeen = {};\n" +
"    function pushFaction(id, name, color){\n" +
"      if (!id || facSeen[id]) return;\n" +
"      facSeen[id] = 1;\n" +
"      factions.push({ id: id, name: name || id, color: color || '' });\n" +
"    }\n" +
"    function attachGeom(nd){\n" +
"      var g = geomById[nd.mapRegionId] || geomById[nd.id] || geomById[nd.name] || geomById[nd.adminBinding];\n" +
"      if (g && g.length >= 3) nd.polygon = g;\n" +
"    }\n" +
"    function walkDivs(divs, facId){\n" +
"      (divs || []).forEach(function(d){\n" +
"        if (!d || typeof d !== 'object') return;\n" +
"        var nd = {};\n" +
"        for (var k in d){ if (k === 'children') continue; nd[k] = d[k]; }\n" +
"        attachGeom(nd);\n" +
"        if (facId && nd.factionId == null) nd.factionId = facId;\n" +
"        divisions.push(nd);\n" +
"        if (d.children && d.children.length) walkDivs(d.children, facId);\n" +
"      });\n" +
"    }\n" +
"\n" +
"    if (ah && typeof ah === 'object' && !Array.isArray(ah)){\n" +
"      Object.keys(ah).forEach(function(facKey){\n" +
"        var node = ah[facKey] || {};\n" +
"        var facId = node.factionId || facKey;\n" +
"        pushFaction(facId, node.factionName || node.name || facKey, node.color);\n" +
"        walkDivs(node.divisions || [], facId);\n" +
"      });\n" +
"    } else if (Array.isArray(ah) && ah.length){\n" +
"      walkDivs(ah, null);\n" +
"    } else {\n" +
"      regions.forEach(function(r){\n" +
"        var fid = r.factionId || r.ownerKey || r.currentOwnerKey || r.controllerKey || null;\n" +
"        pushFaction(fid, r.factionName || r.ownerName || fid, r.color || r.factionColor);\n" +
"        divisions.push({\n" +
"          id: r.id || r.mapRegionId, name: r.name || '', level: r.level || 'province',\n" +
"          polygon: regionToPolygon(r), terrain: r.terrain, neighbors: (r.neighbors || []).slice(),\n" +
"          prosperity: typeof r.prosperity === 'number' ? r.prosperity : (typeof r.development === 'number' ? r.development : undefined),\n" +
"          minxinLocal: r.minxinLocal, corruptionLocal: r.corruptionLocal, factionId: fid\n" +
"        });\n" +
"      });\n" +
"    }\n" +
"\n" +
"    enrichFactionColors(factions, map.factions);\n" +
"    return {\n" +
"      dynasty: map.dynasty || scenario.dynasty || '',\n" +
"      era: map.era || scenario.era || '',\n" +
"      title: map.name || map.title || scenario.name || scenario.title || '剧本地图',\n" +
"      bitmapWidth: map.width || map.bitmapWidth || 1280,\n" +
"      bitmapHeight: map.height || map.bitmapHeight || 800,\n" +
"      divisions: divisions,\n" +
"      factions: factions\n" +
"    };\n" +
"  }\n" +
"\n" +
"  function enrichFactionColors(factions, mapFactions){\n" +
"    if (!mapFactions) return;\n" +
"    var byId = {};\n" +
"    if (Array.isArray(mapFactions)) mapFactions.forEach(function(f){ if (f && f.id) byId[f.id] = f; });\n" +
"    else if (typeof mapFactions === 'object') Object.keys(mapFactions).forEach(function(k){ byId[k] = mapFactions[k]; });\n" +
"    factions.forEach(function(f){\n" +
"      var src = byId[f.id];\n" +
"      if (src && !f.color && src.color) f.color = src.color;\n" +
"      if (src && (!f.name || f.name === f.id) && src.name) f.name = src.name;\n" +
"    });\n" +
"  }\n" +
"\n" +
"  // 几何提取·优先 polygon[[x,y]]·次 points·次 coords(flat)·最后解 SVG path/d (scaffold 的 M/L)\n" +
"  function regionToPolygon(r){\n" +
"    if (!r) return [];\n" +
"    if (Array.isArray(r.polygon) && r.polygon.length >= 3 && Array.isArray(r.polygon[0])) return r.polygon.map(function(p){ return [p[0], p[1]]; });\n" +
"    if (Array.isArray(r.points) && r.points.length >= 3 && Array.isArray(r.points[0])) return r.points.map(function(p){ return [p[0], p[1]]; });\n" +
"    if (Array.isArray(r.coords) && r.coords.length >= 6){\n" +
"      var out = []; for (var i = 0; i + 1 < r.coords.length; i += 2) out.push([r.coords[i], r.coords[i + 1]]); return out;\n" +
"    }\n" +
"    var d = r.path || r.d;\n" +
"    if (typeof d === 'string'){\n" +
"      var nums = (d.match(/-?\\d+(\\.\\d+)?/g) || []).map(Number);\n" +
"      var pts = []; for (var j = 0; j + 1 < nums.length; j += 2) pts.push([nums[j], nums[j + 1]]); return pts;\n" +
"    }\n" +
"    return [];\n" +
"  }\n" +
"\n";

// 1) 在 expose 段前插入反向函数（锚 ASCII 唯一）
once(
"  global.convertMapEditorToGame = convertMapEditorToGame;\n",
REVERSE_FNS +
"  global.convertMapEditorToGame = convertMapEditorToGame;\n" +
"  global.convertScenarioToMapEditor = convertScenarioToMapEditor;\n",
'insert-reverse+global');

// 2) MapEditorBridge 命名空间加导出
once(
"    convertMapEditorToGame: convertMapEditorToGame,\n",
"    convertMapEditorToGame: convertMapEditorToGame,\n    convertScenarioToMapEditor: convertScenarioToMapEditor,\n",
'namespace-export');

fs.writeFileSync(path, s, 'utf8');
console.log('EDITS:', edits.join(' | '));
console.log('delta:', s.length - orig.length, 'chars');
