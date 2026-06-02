(function(global) {
  'use strict';

  var root = global || (typeof window !== 'undefined' ? window : {});
  root.TM = root.TM || {};

  var ns = root.TM.MemoryControls = root.TM.MemoryControls || {};
  var DEFAULT_CONTROL_LIMIT = 80;
  var DEFAULT_EDGE_LIMIT = 80;

  function clean(value, maxLen) {
    var s = String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
    return maxLen ? s.slice(0, maxLen) : s;
  }

  function keyFor(ref) {
    if (typeof ref === 'string') return clean(ref, 180);
    ref = ref || {};
    if (ref.type && ref.id) return clean(ref.type, 80) + ':' + clean(ref.id, 140);
    if (Array.isArray(ref.sourceRefs) && ref.sourceRefs[0]) return keyFor(ref.sourceRefs[0]);
    var src = clean(ref.source || ref.kind || ref.type, 80);
    var id = clean(ref.id || ref.key || ref.uuid || ref.sourceId, 140);
    if (src && id) return src + ':' + id;
    return id;
  }

  function ensure(GM) {
    if (!GM) return null;
    if (!GM._memoryControls || typeof GM._memoryControls !== 'object' || Array.isArray(GM._memoryControls)) GM._memoryControls = {};
    return GM._memoryControls;
  }

  function pruneEdges(GM, limit) {
    if (!GM || !Array.isArray(GM._memEdges)) return 0;
    limit = Math.max(0, Number(limit || DEFAULT_EDGE_LIMIT));
    if (!limit || GM._memEdges.length <= limit) return 0;
    var removed = GM._memEdges.length - limit;
    GM._memEdges.splice(0, removed);
    return removed;
  }

  function pruneControls(GM, opts) {
    opts = opts || {};
    var controls = ensure(GM);
    if (!controls) return { pruned: 0, controls: 0, edges: 0 };
    var limit = Math.max(0, Number(opts.controlsLimit || opts.limit || DEFAULT_CONTROL_LIMIT));
    var keys = Object.keys(controls);
    var pruned = 0;
    if (limit && keys.length > limit) {
      keys.sort(function(a, b) {
        var ca = controls[a] || {};
        var cb = controls[b] || {};
        return Number(ca._seq || ca.updatedTurn || 0) - Number(cb._seq || cb.updatedTurn || 0);
      }).slice(0, keys.length - limit).forEach(function(key) {
        delete controls[key];
        pruned++;
      });
    }
    pruned += pruneEdges(GM, opts.edgesLimit || DEFAULT_EDGE_LIMIT);
    return {
      pruned: pruned,
      controls: Object.keys(controls).length,
      edges: Array.isArray(GM && GM._memEdges) ? GM._memEdges.length : 0
    };
  }

  function setControl(GM, ref, patch, opts) {
    opts = opts || {};
    var controls = ensure(GM);
    var key = keyFor(ref);
    if (!controls || !key) return null;
    var item = controls[key] || {};
    Object.keys(patch || {}).forEach(function(k) { item[k] = patch[k]; });
    item.key = key;
    item.updatedTurn = Number((GM && GM.turn) || opts.turn || item.updatedTurn || 0);
    item.updatedBy = clean(opts.by || opts.reviewer || item.updatedBy || 'system', 80);
    GM._memoryControlSeq = Number(GM._memoryControlSeq || 0) + 1;
    item._seq = GM._memoryControlSeq;
    if (opts.reason || patch && patch.reason) item.reason = clean(opts.reason || patch.reason, 160);
    controls[key] = item;
    pruneControls(GM, opts);
    return item;
  }

  function pinMemory(GM, ref, opts) {
    opts = opts || {};
    return setControl(GM, ref, {
      pinned: true,
      resident: opts.resident === true,
      hidden: false,
      archived: false,
      markedFalse: false,
      reason: opts.reason || 'pinned'
    }, opts);
  }

  function hideMemory(GM, ref, opts) {
    opts = opts || {};
    return setControl(GM, ref, { hidden: true, reason: opts.reason || 'hidden' }, opts);
  }

  function archiveMemory(GM, ref, opts) {
    opts = opts || {};
    return setControl(GM, ref, { archived: true, pinned: false, resident: false, reason: opts.reason || 'archived' }, opts);
  }

  function markFalse(GM, ref, opts) {
    opts = opts || {};
    return setControl(GM, ref, { markedFalse: true, hidden: true, pinned: false, resident: false, reason: opts.reason || 'marked false' }, opts);
  }

  function cooldownMemory(GM, ref, untilTurn, opts) {
    opts = opts || {};
    return setControl(GM, ref, { cooldownUntilTurn: Number(untilTurn || 0), reason: opts.reason || 'cooldown' }, opts);
  }

  function clearControl(GM, ref) {
    var controls = ensure(GM);
    var key = keyFor(ref);
    if (!controls || !key) return false;
    delete controls[key];
    return true;
  }

  function supersedeMemory(GM, oldRef, newRef, opts) {
    opts = opts || {};
    var oldKey = keyFor(oldRef);
    var newKey = keyFor(newRef);
    if (!oldKey || !newKey || !GM) return null;
    var ctrl = setControl(GM, oldKey, {
      supersededBy: newKey,
      archived: true,
      pinned: false,
      resident: false,
      reason: opts.reason || 'superseded'
    }, opts);
    if (!Array.isArray(GM._memEdges)) GM._memEdges = [];
    var exists = GM._memEdges.some(function(e) {
      return e && e.type === 'supersedes' && e.src === newKey && e.dst === oldKey;
    });
    if (!exists) {
      GM._memEdges.push({
        id: 'memory-control-supersedes-' + clean((GM.turn || 0) + '-' + newKey + '-' + oldKey, 160).replace(/[^a-zA-Z0-9_-]+/g, '-'),
        type: 'supersedes',
        src: newKey,
        dst: oldKey,
        reason: clean(opts.reason || 'memory control supersede', 160),
        turn: Number((GM && GM.turn) || opts.turn || 0),
        source: 'memoryControls'
      });
      pruneControls(GM, opts);
    }
    return ctrl;
  }

  ns.keyFor = keyFor;
  ns.setControl = setControl;
  ns.pinMemory = pinMemory;
  ns.hideMemory = hideMemory;
  ns.archiveMemory = archiveMemory;
  ns.markFalse = markFalse;
  ns.cooldownMemory = cooldownMemory;
  ns.supersedeMemory = supersedeMemory;
  ns.clearControl = clearControl;
  ns.pruneControls = pruneControls;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
