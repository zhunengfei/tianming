const fs = require('fs');
const file = 'preview/scenario-editor-reset-app.js';
let s = fs.readFileSync(file, 'utf8');
const a = `  function pickFolioPortrait() {
    var h = _folioCurChar(); if (!h) return;
    var v = global.prompt ? global.prompt('立绘路径（相对 web 根，如 assets/portraits/tianqi7/' + (h.c.name || '') + '.png）：', h.c.portrait || '') : null;
    if (v == null) return;
    saveCharFolioField(h.i, 'portrait', String(v).trim());
  }`;
const b = `  function pickFolioPortrait() {
    var h = _folioCurChar(); if (!h) return;
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = function () {
      var f = input.files && input.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function (e) { saveCharFolioField(h.i, 'portrait', e.target.result); setStatus('已设立绘：' + (h.c.name || '') + '（' + Math.round(f.size / 1024) + 'KB）', 'good'); };
      reader.onerror = function () { setStatus('读图失败', 'error'); };
      reader.readAsDataURL(f);
    };
    input.click();
  }`;
if (s.split(a).length - 1 !== 1) throw new Error('anchor x' + (s.split(a).length - 1));
fs.writeFileSync(file, s.replace(a, b), 'utf8');
console.log('OK portrait→file-picker');
