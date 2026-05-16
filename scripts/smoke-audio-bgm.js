// smoke-audio-bgm.js - guard configurable background music wiring.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

function assert(cond, msg) {
  if (!cond) throw new Error('[assert] ' + msg);
}

const played = [];
const created = [];
const hooks = {};
const storage = new Map();

function FakeAudio(src) {
  this.src = src;
  this.volume = 1;
  this.loop = false;
  this.preload = '';
  this.paused = true;
  this.onerror = null;
  this.onended = null;
  created.push(this);
  this.play = () => {
    this.paused = false;
    played.push({ src: this.src, volume: this.volume, loop: this.loop });
    return Promise.resolve();
  };
  this.pause = () => { this.paused = true; };
}

const context = {
  console,
  window: {},
  document: {
    body: { appendChild() {}, insertAdjacentHTML() {} },
    createElement() { return { style: {}, setAttribute() {}, appendChild() {}, remove() {} }; },
    getElementById() { return null; },
    querySelector() { return null; },
    head: { appendChild() {} },
    documentElement: { style: { setProperty() {} }, removeAttribute() {}, setAttribute() {} }
  },
  localStorage: {
    getItem(k) { return storage.has(k) ? storage.get(k) : null; },
    setItem(k, v) { storage.set(k, String(v)); },
    removeItem(k) { storage.delete(k); }
  },
  Audio: FakeAudio,
  GameHooks: {
    on(name, fn) {
      if (!hooks[name]) hooks[name] = [];
      hooks[name].push(fn);
    },
    run(name) {
      (hooks[name] || []).forEach(fn => fn());
    }
  },
  _$() { return null; },
  _dbg() {},
  toast() {},
  setTimeout(fn) { if (typeof fn === 'function') fn(); return 1; },
  clearTimeout() {}
};
context.window = context;

vm.createContext(context);

vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-bgm-config.js'), 'utf8'), context, { filename: 'tm-bgm-config.js' });

assert(Array.isArray(context.TM_BGM_TRACKS), 'TM_BGM_TRACKS should be an array');
assert(context.TM_BGM_TRACKS.length === 4, 'TM_BGM_TRACKS should include the four bundled themes');
assert(context.TM_BGM_PLAYLIST_VERSION === 'theme-quartet-20260513', 'BGM playlist version should be pinned for migration');
assert(context.TM_BGM_DEFAULT_LOOP === 'sequence', 'default loop mode should cycle through the theme playlist');
context.TM_BGM_TRACKS.forEach(track => {
  assert(track.id && track.title && track.src, 'each BGM track should have id, title and src');
  assert(fs.existsSync(path.join(ROOT, track.src)), 'BGM file missing: ' + track.src);
});

vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-audio-theme.js'), 'utf8'), context, { filename: 'tm-audio-theme.js' });

assert(context.AudioSystem, 'AudioSystem missing');
assert(typeof context.AudioSystem.playDefaultBgm === 'function', 'playDefaultBgm missing');
assert(typeof context.AudioSystem.renderShellPanelHtml === 'function', 'renderShellPanelHtml missing');

storage.set('tianming_audio_settings', JSON.stringify({
  sfxVolume: 0.5,
  bgmVolume: 0.3,
  enabled: true,
  bgmEnabled: true,
  currentTrackId: 'old-track',
  loopMode: 'single',
  bgmPlaylistVersion: 'old-playlist'
}));

context.AudioSystem.init();
assert(context.AudioSystem.loopMode === 'sequence', 'AudioSystem should migrate stale playlist settings to sequence loop mode');
assert(context.AudioSystem.currentTrackId === context.TM_BGM_TRACKS[0].id, 'AudioSystem should reset stale current track to first bundled theme');
context.AudioSystem.playDefaultBgm();

assert(played.length === 1, 'default BGM should call Audio.play once');
assert(played[0].src === context.TM_BGM_TRACKS[0].src, 'default BGM should use first configured track');
assert(played[0].loop === false, 'sequence mode should advance tracks instead of looping one audio element');
assert(Math.abs(played[0].volume - context.AudioSystem.bgmVolume) < 0.001, 'BGM volume should sync to audio element');
assert(created[0].preload === 'none', 'BGM should avoid eager loading before play');
assert(typeof created[0].onerror === 'function', 'BGM should install load error handler');
created[0].onerror();
context.AudioSystem.playDefaultBgm();
assert(played.length === 1, 'recently failed BGM track should be cooled down instead of retried');
assert(JSON.parse(storage.get('tianming_audio_settings')).bgmPlaylistVersion === context.TM_BGM_PLAYLIST_VERSION, 'saved settings should include current playlist version');

const html = context.AudioSystem.renderShellPanelHtml();
assert(html.includes(context.TM_BGM_TRACKS[0].title), 'shell panel should render configured track title');
assert(/data-track-id=/.test(html), 'shell panel should include playable track ids');

console.log('[smoke-audio-bgm] PASS tracks=' + context.TM_BGM_TRACKS.length + ' played=' + played.length);
