// 降门槛①：左列九章字形换白话单字（卷→总/廷→官/户→财/史→事/律→规；人/势/图/军已清晰保留）。
// 改静态 rail(preview.html) + 中央头(app.js moduleGlyph 加显式映射)使两处一致。
const fs = require('fs');
const edits = [];
function once(path, a, b, t) {
  let s = fs.readFileSync(path, 'utf8');
  const n = s.split(a).length - 1;
  if (n !== 1) throw new Error(path + ' ANCHOR ' + t + ' x' + n + ' (need 1)');
  fs.writeFileSync(path, s.replace(a, b), 'utf8');
  edits.push(t);
}

const H = 'preview/scenario-editor-reset-preview.html';
once(H, '<span class="module-glyph">卷</span>', '<span class="module-glyph">总</span>', 'glyph-总');
once(H, '<span class="module-glyph">廷</span>', '<span class="module-glyph">官</span>', 'glyph-官');
once(H, '<span class="module-glyph">户</span>', '<span class="module-glyph">财</span>', 'glyph-财');
once(H, '<span class="module-glyph">史</span>', '<span class="module-glyph">事</span>', 'glyph-事');
once(H, '<span class="module-glyph">律</span>', '<span class="module-glyph">规</span>', 'glyph-规');

const A = 'preview/scenario-editor-reset-app.js';
once(A,
`  function moduleGlyph(module) {
    var title = moduleTitle(module);
    return title ? title.slice(0, 1) : '?';
  }`,
`  var MODULE_GLYPHS = { scenarioOpening: '总', peopleLineages: '人', factionsSociety: '势', courtInstitutions: '官', adminMap: '图', economyPopulation: '财', militaryFrontier: '军', eventsChronicle: '事', rulesAi: '规' };
  function moduleGlyph(module) {
    if (module && MODULE_GLYPHS[module.id]) return MODULE_GLYPHS[module.id];
    var title = moduleTitle(module);
    return title ? title.slice(0, 1) : '?';
  }`,
'moduleGlyph-map');

console.log('EDITS:', edits.join(' | '));
