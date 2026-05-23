#!/usr/bin/env node
/*
 * Build a Tianming renderer hot-update package.
 *
 * Usage:
 *   node web/tools/build-hot-update-package.js --version 1.2.0.1 --out release-hot --notes "fix ui"
 *
 * Output:
 *   release-hot/tianming-hot-1.2.0.1.zip
 *   release-hot/hot-latest.json
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const AdmZip = require('adm-zip');

const WEB_ROOT = path.resolve(__dirname, '..');
const APP_ROOT = path.resolve(WEB_ROOT, '..');

const ALLOWED_EXTS = new Set([
  '.html', '.htm', '.js', '.mjs', '.css', '.json', '.geojson', '.png', '.jpg', '.jpeg', '.webp',
  '.bmp', '.svg', '.ico', '.mp3', '.ogg', '.wav', '.md', '.txt', '.csv', '.woff', '.woff2',
  '.ttf', '.wasm', '.map'
]);

const EXCLUDED_DIRS = new Set([
  '.git', 'node_modules', '.cache', '.tmp', 'tmp', 'dist', 'build', 'release', 'coverage',
  // 本地开发产物·绝不入热更包
  '_archive', 'backups', '_screenshots', 'test-results', '_codex_tmp',
  // godot 端 WIP 移植·web 运行时不依赖·package.json 也用 !web/godot/**/* 排掉
  'godot'
]);

// 额外按前缀排除·.bak-rNN 历史快照目录
function _isExcludedDir(name) {
  if (EXCLUDED_DIRS.has(name)) return true;
  if (name.startsWith('.bak-')) return true;
  return false;
}

function arg(name, fallback) {
  const idx = process.argv.indexOf('--' + name);
  if (idx >= 0 && idx + 1 < process.argv.length) return process.argv[idx + 1];
  return fallback;
}

function flag(name) {
  return process.argv.includes('--' + name);
}

function listArg(name) {
  const raw = arg(name, '');
  if (!raw) return [];
  return raw.split(/[;,]/).map(s => s.trim()).filter(Boolean);
}

function sha256Buffer(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function sha256File(file) {
  return sha256Buffer(fs.readFileSync(file));
}

function normalizeRel(file) {
  return path.relative(WEB_ROOT, file).replace(/\\/g, '/');
}

function walk(dir, out) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(entry => {
    const abs = path.join(dir, entry.name);
    const rel = normalizeRel(abs);
    if (entry.isDirectory()) {
      if (_isExcludedDir(entry.name)) return;
      walk(abs, out);
      return;
    }
    if (!entry.isFile()) return;
    const ext = path.extname(entry.name).toLowerCase();
    if (!ALLOWED_EXTS.has(ext)) return;
    out.push(abs);
  });
}

// 2026-05-23·主进程实现热更·把 APP_ROOT/main-impl.js 打到 zip 根·命名 _app_main.js
// installer 里的 main.js shim 会优先 require hot dir 的 _app_main.js·让 main 实现也能 hot ship
function walkAppMainImpl() {
  const APP_MAIN_IMPL = path.join(APP_ROOT, 'main-impl.js');
  if (!fs.existsSync(APP_MAIN_IMPL)) return [];
  return [{ abs: APP_MAIN_IMPL, zipPath: '_app_main.js' }];
}

// 2026-05-23·preload 也热更·APP_ROOT/preload-impl.js → zip 根 _app_preload.js
// installer 里的 preload.js shim 通过 process.argv (main 透传) 找 hot _app_preload.js·失败 fallback bundled
function walkAppPreloadImpl() {
  const APP_PRELOAD_IMPL = path.join(APP_ROOT, 'preload-impl.js');
  if (!fs.existsSync(APP_PRELOAD_IMPL)) return [];
  return [{ abs: APP_PRELOAD_IMPL, zipPath: '_app_preload.js' }];
}

// 2026-05-22·扫 APP_ROOT/scenarios·把官方剧本 JSON 也打进 zip·路径 bundled-scenarios/<file>
// 让 hot update 也能 ship scenarios 改动·不必等下个 installer
function walkBundledScenarios() {
  const SCENARIOS_SRC = path.join(APP_ROOT, 'scenarios');
  const out = [];
  if (!fs.existsSync(SCENARIOS_SRC)) return out;
  fs.readdirSync(SCENARIOS_SRC, { withFileTypes: true }).forEach(entry => {
    if (!entry.isFile()) return;
    const ext = path.extname(entry.name).toLowerCase();
    if (ext !== '.json') return;  // 只 ship 官方 JSON 剧本
    out.push({
      abs: path.join(SCENARIOS_SRC, entry.name),
      zipPath: 'bundled-scenarios/' + entry.name
    });
  });
  return out;
}

function readPackageVersion() {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(APP_ROOT, 'package.json'), 'utf-8'));
    return (pkg.build && pkg.build.buildVersion) || pkg.version || '0.0.0';
  } catch (e) {
    return '0.0.0';
  }
}

function main() {
  const version = String(arg('version', '')).trim();
  if (!version) {
    console.error('Missing --version, example: --version 1.2.0.1');
    process.exit(1);
  }
  const outDir = path.resolve(APP_ROOT, arg('out', 'release-hot'));
  const notes = String(arg('notes', '') || '');
  const minAppVersion = String(arg('min-app-version', readPackageVersion()) || '');
  const packageName = arg('package-name', 'tianming-hot-' + version + '.zip');
  const packageUrl = arg('package-url', packageName);
  const includePreview = flag('include-preview');
  const explicitFiles = listArg('files');

  const files = [];
  if (explicitFiles.length) {
    explicitFiles.forEach(rel => {
      const abs = path.resolve(WEB_ROOT, rel);
      if (!abs.startsWith(WEB_ROOT + path.sep)) {
        console.error('file outside web root:', rel);
        process.exit(1);
      }
      if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
        console.error('file not found:', rel);
        process.exit(1);
      }
      files.push(abs);
    });
  } else {
    walk(WEB_ROOT, files);
  }
  const filtered = includePreview || explicitFiles.length ? files : files.filter(file => !normalizeRel(file).startsWith('preview/'));
  if (!explicitFiles.length && !filtered.some(file => normalizeRel(file) === 'index.html')) {
    console.error('index.html not found in hot-update file list');
    process.exit(1);
  }

  fs.mkdirSync(outDir, { recursive: true });
  const zipPath = path.join(outDir, packageName);
  const zip = new AdmZip();
  const manifestFiles = filtered.sort().map(file => {
    const rel = normalizeRel(file);
    const stat = fs.statSync(file);
    zip.addLocalFile(file, path.dirname(rel) === '.' ? '' : path.dirname(rel));
    return { path: rel, sha256: sha256File(file), size: stat.size };
  });

  // 2026-05-22·bundled scenarios·热更也能 ship 官方剧本 JSON 改动
  const bundledScenarios = walkBundledScenarios();
  bundledScenarios.forEach(entry => {
    const stat = fs.statSync(entry.abs);
    zip.addLocalFile(entry.abs, 'bundled-scenarios');
    manifestFiles.push({ path: entry.zipPath, sha256: sha256File(entry.abs), size: stat.size });
  });
  if (bundledScenarios.length) {
    console.log('[hot-update] bundled scenarios·' + bundledScenarios.length + ' file(s)·' + bundledScenarios.map(e => path.basename(e.abs)).join(', '));
  }

  // 2026-05-23·主进程实现·main-impl.js → _app_main.js·shim 会找
  const appMains = walkAppMainImpl();
  appMains.forEach(entry => {
    const stat = fs.statSync(entry.abs);
    zip.addLocalFile(entry.abs, '', '_app_main.js');
    manifestFiles.push({ path: entry.zipPath, sha256: sha256File(entry.abs), size: stat.size });
  });
  if (appMains.length) {
    console.log('[hot-update] app main impl·_app_main.js·' + (fs.statSync(appMains[0].abs).size/1024).toFixed(1) + ' KB');
  } else {
    console.warn('[hot-update] WARN·APP_ROOT/main-impl.js 不存在·main shim 将无 hot 实现可加载·只能 fallback bundled');
  }

  // 2026-05-23·preload 实现·preload-impl.js → _app_preload.js·shim 会找 (sandbox: false 在 main-impl webPreferences)
  const appPreloads = walkAppPreloadImpl();
  appPreloads.forEach(entry => {
    const stat = fs.statSync(entry.abs);
    zip.addLocalFile(entry.abs, '', '_app_preload.js');
    manifestFiles.push({ path: entry.zipPath, sha256: sha256File(entry.abs), size: stat.size });
  });
  if (appPreloads.length) {
    console.log('[hot-update] app preload impl·_app_preload.js·' + (fs.statSync(appPreloads[0].abs).size/1024).toFixed(1) + ' KB');
  } else {
    console.warn('[hot-update] WARN·APP_ROOT/preload-impl.js 不存在·preload shim 将无 hot 实现可加载·只能 fallback bundled');
  }

  const manifest = {
    type: 'tianming-hot-update',
    version,
    entry: 'index.html',
    minAppVersion,
    generatedAt: new Date().toISOString(),
    files: manifestFiles,
    remove: []
  };
  zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest, null, 2), 'utf-8'));
  zip.writeZip(zipPath);

  const zipStat = fs.statSync(zipPath);
  // 2026-05-23·incremental update 字段·old client 读不到 manifestUrl 自动 fallback 走 packageUrl 全包路径
  //   manifestUrl·per-version manifest·{path,sha256,size}·客户端 diff 本地 .hot-update-manifest.json
  //   filesBaseUrl·sha-content-addressable file store·客户端按 `${filesBaseUrl}<sha2>/<sha-rest>/<basename>` 取
  const feed = {
    type: 'tianming-hot-update-feed',
    version,
    packageUrl,
    manifestUrl: 'manifests/' + version + '.json',
    filesBaseUrl: 'files/',
    sha256: sha256File(zipPath),
    size: zipStat.size,
    notes,
    generatedAt: manifest.generatedAt
  };
  fs.writeFileSync(path.join(outDir, 'hot-latest.json'), JSON.stringify(feed, null, 2), 'utf-8');
  // 同步把 manifest 单独写到 outDir·upload-hot.py 直接拾·SCP 到 server hot/manifests/<ver>.json
  fs.mkdirSync(path.join(outDir, 'manifests'), { recursive: true });
  fs.writeFileSync(path.join(outDir, 'manifests', version + '.json'), JSON.stringify(manifest, null, 2), 'utf-8');

  console.log('[hot-update] package:', zipPath);
  console.log('[hot-update] feed:', path.join(outDir, 'hot-latest.json'));
  console.log('[hot-update] files:', manifestFiles.length);
}

main();
