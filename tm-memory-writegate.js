(function(global) {
  'use strict';

  var root = global || (typeof window !== 'undefined' ? window : {});
  root.TM = root.TM || {};

  var ns = root.TM.MemoryWriteGate = root.TM.MemoryWriteGate || {};
  var DEFAULT_CAPS = {
    writeQueue: 80,
    draftInbox: 80,
    quarantine: 80,
    accepted: 80,
    auditEvents: 120
  };

  function clean(value, maxLen) {
    var s = String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
    return maxLen ? s.slice(0, maxLen) : s;
  }

  function nowId(prefix) {
    return prefix + '-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 100000).toString(36);
  }

  function reason(code, message) {
    return { code: code, message: message || code };
  }

  function arr(value) {
    return Array.isArray(value) ? value : [];
  }

  function copyRefs(value) {
    var list = Array.isArray(value) ? value : (value == null ? [] : [value]);
    return list.slice(0, 12).map(function(ref) {
      if (!ref) return null;
      if (typeof ref === 'string') return { id: clean(ref, 160) };
      var out = {};
      Object.keys(ref).forEach(function(k) { out[k] = ref[k]; });
      return out;
    }).filter(Boolean);
  }

  function enrichMemoryItem(item, candidate) {
    item = item || {};
    candidate = candidate || {};
    var extra = item.extra && typeof item.extra === 'object' && !Array.isArray(item.extra) ? item.extra : {};
    item.extra = extra;
    if (candidate.factKey || candidate.stableKey || extra.factKey || extra.stableKey) {
      item.factKey = clean(candidate.factKey || candidate.stableKey || extra.factKey || extra.stableKey, 180);
      item.extra.factKey = item.factKey;
    }
    if (candidate.issueId || candidate.issue_id || extra.issueId) {
      item.issueId = clean(candidate.issueId || candidate.issue_id || extra.issueId, 160);
      item.extra.issueId = item.issueId;
    }
    if (candidate.authorityRank != null) item.authorityRank = Number(candidate.authorityRank);
    if (candidate.confidence != null) item.confidence = Number(candidate.confidence);
    if (candidate.supersedesRefs || candidate.supersedes || candidate.replacesId || candidate.supersededRefs) {
      item.supersedesRefs = copyRefs(candidate.supersedesRefs || candidate.supersededRefs || candidate.supersedes || candidate.replacesId);
    }
    if (candidate.contradictsRefs || candidate.contradicts || candidate.conflictsWithRefs) {
      item.contradictsRefs = copyRefs(candidate.contradictsRefs || candidate.conflictsWithRefs || candidate.contradicts);
    }
    if (candidate.cooldownTurns != null) item.cooldownTurns = Number(candidate.cooldownTurns);
    return item;
  }

  function hasPromptInjection(text) {
    text = clean(text).toLowerCase();
    return /ignore (all )?(previous|system|above) instructions/.test(text) ||
      /from now on/.test(text) && /\b(gm|system|developer|admin)\b/.test(text) ||
      /remember i am (the )?(gm|system|developer|admin)/.test(text) ||
      /disregard (previous|system|above)/.test(text);
  }

  function makeEnvelope(candidate) {
    var ME = root.TM && root.TM.MemoryEnvelope;
    if (ME && typeof ME.makeEnvelope === 'function') {
      return enrichMemoryItem(ME.makeEnvelope({
        id: candidate.id || nowId('draft'),
        schemaVersion: candidate.schemaVersion,
        projectionVersion: candidate.projectionVersion,
        saveId: candidate.saveId,
        worldId: candidate.worldId,
        ownerScope: candidate.ownerScope,
        readScope: candidate.readScope,
        writeScope: candidate.writeScope,
        type: candidate.type || candidate.kind || 'semantic_fact',
        body: candidate.body || candidate.text || candidate.content || '',
        safeBody: candidate.safeBody,
        sourceRefs: candidate.sourceRefs || [],
        basisRefs: candidate.basisRefs || candidate.evidenceRefs || [],
        status: candidate.status || 'draft',
        authority: candidate.authority || candidate.source || 'ai_extracted',
        visibility: candidate.visibility || 'player_known',
        turn: candidate.turn || 0,
        entities: candidate.entities || [],
        lane: candidate.lane || 'L6_retrieved_evidence',
        reason: candidate.reason || 'writegate:candidate',
        extra: candidate.extra || {},
        authorityRank: candidate.authorityRank,
        confidence: candidate.confidence
      }), candidate);
    }
    return enrichMemoryItem({
      id: candidate.id || nowId('draft'),
      schemaVersion: candidate.schemaVersion || '',
      projectionVersion: candidate.projectionVersion || 0,
      saveId: candidate.saveId || '',
      worldId: candidate.worldId || '',
      ownerScope: candidate.ownerScope || '',
      readScope: candidate.readScope || '',
      writeScope: candidate.writeScope || '',
      type: candidate.type || candidate.kind || 'semantic_fact',
      body: clean(candidate.body || candidate.text || candidate.content || '', 1000),
      safeBody: clean(candidate.safeBody || candidate.body || candidate.text || candidate.content || '', 1000),
      sourceRefs: candidate.sourceRefs || [],
      basisRefs: candidate.basisRefs || candidate.evidenceRefs || [],
      status: candidate.status || 'draft',
      authority: candidate.authority || candidate.source || 'ai_extracted',
      visibility: candidate.visibility || 'player_known',
      turn: Number(candidate.turn || 0),
      entities: candidate.entities || [],
      lane: candidate.lane || 'L6_retrieved_evidence',
      reason: candidate.reason || 'writegate:candidate',
      authorityRank: candidate.authorityRank != null ? Number(candidate.authorityRank) : null,
      confidence: candidate.confidence != null ? Number(candidate.confidence) : null,
      extra: candidate.extra || {}
    }, candidate);
  }

  function evaluateCandidate(candidate, opts) {
    candidate = candidate || {};
    opts = opts || {};
    var env = makeEnvelope(candidate);
    var reasons = [];
    var source = clean(candidate.source || env.authority).toLowerCase();
    var type = clean(env.type).toLowerCase();
    var body = clean(env.body);
    var trusted = source === 'engine_state' || source === 'system_rule' || source === 'player_pin' || source === 'designer_seed';

    if (hasPromptInjection(body)) reasons.push(reason('prompt_injection', 'candidate text looks like prompt injection'));
    if (type === 'hard_state' && !trusted) reasons.push(reason('unauthorized_hard_state', 'AI/external source cannot directly write hard_state'));
    if (!Array.isArray(env.sourceRefs) || env.sourceRefs.length === 0) reasons.push(reason('missing_source_refs', 'candidate has no sourceRefs'));

    env.reasons = reasons;
    env.reviewStatus = trusted && reasons.length === 0 ? 'accepted' : 'pending_review';
    if (reasons.length) {
      env.status = 'quarantined';
      env.reviewStatus = 'quarantined';
    } else if (trusted) {
      env.status = 'active';
    } else {
      env.status = 'draft';
    }
    if (opts.forceDraft === true && env.status === 'active') {
      env.status = 'draft';
      env.reviewStatus = 'pending_review';
    }
    return env;
  }

  function ensureQueues(GM) {
    GM._memoryWriteQueue = Array.isArray(GM._memoryWriteQueue) ? GM._memoryWriteQueue : [];
    GM._memoryDraftInbox = Array.isArray(GM._memoryDraftInbox) ? GM._memoryDraftInbox : [];
    GM._memoryQuarantine = Array.isArray(GM._memoryQuarantine) ? GM._memoryQuarantine : [];
    GM._memoryAccepted = Array.isArray(GM._memoryAccepted) ? GM._memoryAccepted : [];
    GM._memoryAuditEvents = Array.isArray(GM._memoryAuditEvents) ? GM._memoryAuditEvents : [];
  }

  function capList(list, limit) {
    if (!Array.isArray(list)) return 0;
    limit = Math.max(0, Number(limit || 0));
    if (!limit || list.length <= limit) return 0;
    var removed = list.length - limit;
    list.splice(0, removed);
    return removed;
  }

  function pruneQueues(GM, opts) {
    opts = opts || {};
    if (!GM) return { pruned: 0 };
    ensureQueues(GM);
    var caps = opts.caps || {};
    var pruned = 0;
    pruned += capList(GM._memoryWriteQueue, caps.writeQueue || DEFAULT_CAPS.writeQueue);
    pruned += capList(GM._memoryDraftInbox, caps.draftInbox || DEFAULT_CAPS.draftInbox);
    pruned += capList(GM._memoryQuarantine, caps.quarantine || DEFAULT_CAPS.quarantine);
    pruned += capList(GM._memoryAccepted, caps.accepted || DEFAULT_CAPS.accepted);
    pruned += capList(GM._memoryAuditEvents, caps.auditEvents || DEFAULT_CAPS.auditEvents);
    return {
      pruned: pruned,
      writeQueue: GM._memoryWriteQueue.length,
      draftInbox: GM._memoryDraftInbox.length,
      quarantine: GM._memoryQuarantine.length,
      accepted: GM._memoryAccepted.length,
      auditEvents: GM._memoryAuditEvents.length
    };
  }

  function recordLifecycleWrite(GM, data) {
    var MT = root.TM && root.TM.MemoryTrace;
    if (!MT || typeof MT.recordWrite !== 'function') return null;
    try { return MT.recordWrite(GM, data || {}); } catch (_) { return null; }
  }

  function normalizedBodyKey(item) {
    return clean(item && (item.safeBody || item.body || item.text || item.content) || '', 500)
      .toLowerCase()
      .replace(/[^\w\u3400-\u9fff]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 220);
  }

  function acceptedFactKey(item) {
    item = item || {};
    var extra = item.extra || {};
    var explicit = clean(item.factKey || item.stableKey || extra.factKey || extra.stableKey, 180);
    if (explicit) return explicit.toLowerCase();
    return [
      clean(item.type || item.kind || 'semantic_fact', 60).toLowerCase(),
      clean(item.ownerScope || '', 120).toLowerCase(),
      clean(item.readScope || '', 120).toLowerCase(),
      normalizedBodyKey(item)
    ].join('|');
  }

  function refId(ref) {
    if (!ref) return '';
    if (typeof ref === 'string') return clean(ref, 180);
    return clean(ref.id || ref.key || ref.uuid || ref.sourceId || '', 180);
  }

  function governanceRefs(item, field) {
    item = item || {};
    return copyRefs(item[field]).map(function(ref) {
      var id = refId(ref);
      return id ? { type: clean(ref.type || 'accepted_memory', 80), id: id } : null;
    }).filter(Boolean);
  }

  function edgeExists(GM, type, src, dst) {
    return arr(GM && GM._memEdges).some(function(edge) {
      return edge && edge.type === type && edge.src === src && edge.dst === dst;
    });
  }

  function pushGovernanceEdge(GM, type, src, dst, reasonText, opts) {
    opts = opts || {};
    if (!GM || !type || !src || !dst) return null;
    if (!Array.isArray(GM._memEdges)) GM._memEdges = [];
    if (edgeExists(GM, type, src, dst)) {
      for (var i = 0; i < GM._memEdges.length; i++) {
        if (GM._memEdges[i] && GM._memEdges[i].type === type && GM._memEdges[i].src === src && GM._memEdges[i].dst === dst) return GM._memEdges[i];
      }
    }
    var edge = {
      id: 'writegate-' + clean(type + '-' + (GM.turn || 0) + '-' + src + '-' + dst, 180).replace(/[^a-zA-Z0-9_-]+/g, '-'),
      type: type,
      src: src,
      dst: dst,
      reason: clean(reasonText || ('writegate accepted ' + type), 160),
      turn: Number((GM && GM.turn) || opts.turn || 0),
      source: 'MemoryWriteGate'
    };
    GM._memEdges.push(edge);
    var MC = root.TM && root.TM.MemoryControls;
    if (MC && typeof MC.pruneControls === 'function') {
      try { MC.pruneControls(GM, opts); } catch (_) {}
    }
    return edge;
  }

  function setGovernanceControl(GM, id, patch, opts) {
    opts = opts || {};
    if (!GM || !id) return null;
    var MC = root.TM && root.TM.MemoryControls;
    if (MC && typeof MC.setControl === 'function') {
      try { return MC.setControl(GM, id, patch, opts); } catch (_) {}
    }
    if (!GM._memoryControls || typeof GM._memoryControls !== 'object' || Array.isArray(GM._memoryControls)) GM._memoryControls = {};
    var item = GM._memoryControls[id] || {};
    Object.keys(patch || {}).forEach(function(k) { item[k] = patch[k]; });
    item.key = id;
    item.updatedTurn = Number((GM && GM.turn) || opts.turn || item.updatedTurn || 0);
    item.updatedBy = clean(opts.reviewer || opts.by || item.updatedBy || 'writegate', 80);
    if (opts.reason || patch && patch.reason) item.reason = clean(opts.reason || patch.reason, 160);
    GM._memoryControls[id] = item;
    return item;
  }

  function findAcceptedDuplicate(GM, item, factKey) {
    if (!GM || !item || !factKey) return null;
    for (var i = GM._memoryAccepted.length - 1; i >= 0; i--) {
      var old = GM._memoryAccepted[i];
      if (!old || old.id === item.id) continue;
      if (acceptedFactKey(old) === factKey && clean(old.status || 'active', 40) === 'active') return old;
    }
    return null;
  }

  function hasExplicitGovernanceRefs(item) {
    return governanceRefs(item, 'supersedesRefs').length > 0 || governanceRefs(item, 'contradictsRefs').length > 0;
  }

  function governAcceptedMemory(GM, item, opts) {
    opts = opts || {};
    if (!GM || !item) return { decision: 'skip', reason: 'missing_input' };
    ensureQueues(GM);
    var factKey = acceptedFactKey(item);
    item.factKey = item.factKey || factKey;
    item.extra = item.extra && typeof item.extra === 'object' && !Array.isArray(item.extra) ? item.extra : {};
    item.extra.factKey = item.factKey;

    var duplicate = hasExplicitGovernanceRefs(item) ? null : findAcceptedDuplicate(GM, item, factKey);
    if (duplicate) {
      item.status = 'archived';
      item.reviewStatus = 'duplicate';
      item.duplicateOf = duplicate.id;
      item.duplicateFactKey = factKey;
      GM._memoryAuditEvents.push({
        id: item.id,
        action: 'duplicate_accepted',
        duplicateOf: duplicate.id,
        factKey: factKey,
        reviewer: clean(opts.reviewer || item.reviewedBy || 'writegate', 80),
        turn: Number((GM && GM.turn) || item.turn || 0)
      });
      recordLifecycleWrite(GM, {
        id: 'WRITEGATE_ACCEPT_DUPLICATE',
        stage: 'accepted-governance',
        sourceId: item.id,
        status: item.status,
        candidates: 1,
        added: 0,
        archived: 1,
        items: [item]
      });
      return { decision: 'duplicate', duplicateOf: duplicate.id, factKey: factKey };
    }

    var edges = [];
    var cooldownTurns = Number(opts.governanceCooldownTurns != null ? opts.governanceCooldownTurns : item.cooldownTurns);
    if (!isFinite(cooldownTurns)) cooldownTurns = 0;
    governanceRefs(item, 'supersedesRefs').forEach(function(ref) {
      var oldId = refId(ref);
      if (!oldId) return;
      var edge = pushGovernanceEdge(GM, 'supersedes', item.id, oldId, 'accepted memory supersedes prior memory', opts);
      if (edge) edges.push(edge);
      setGovernanceControl(GM, oldId, {
        supersededBy: item.id,
        archived: true,
        pinned: false,
        resident: false,
        reason: 'accepted memory superseded'
      }, opts);
      if (cooldownTurns > 0) {
        setGovernanceControl(GM, oldId, {
          cooldownUntilTurn: Number((GM && GM.turn) || item.turn || 0) + cooldownTurns,
          reason: 'accepted memory superseded cooldown'
        }, opts);
      }
    });
    governanceRefs(item, 'contradictsRefs').forEach(function(ref) {
      var oldId = refId(ref);
      if (!oldId) return;
      var edge = pushGovernanceEdge(GM, 'contradicts', item.id, oldId, 'accepted memory contradicts prior memory', opts);
      if (edge) edges.push(edge);
    });
    if (edges.length) {
      GM._memoryAuditEvents.push({
        id: item.id,
        action: 'accepted_governance',
        edges: edges.length,
        reviewer: clean(opts.reviewer || item.reviewedBy || 'writegate', 80),
        turn: Number((GM && GM.turn) || item.turn || 0)
      });
      recordLifecycleWrite(GM, {
        id: 'WRITEGATE_ACCEPT_GOVERNANCE',
        stage: 'accepted-governance',
        sourceId: item.id,
        status: item.status,
        candidates: 1,
        added: edges.length,
        accepted: 1,
        items: [item]
      });
    }
    return { decision: 'accept', factKey: factKey, edges: edges };
  }

  function enqueue(GM, candidate, opts) {
    if (!GM) return null;
    ensureQueues(GM);
    var item = candidate && candidate.type && candidate.status && candidate.body ? enrichMemoryItem(candidate, candidate) : evaluateCandidate(candidate, opts);
    item.id = item.id || nowId('mem-write');
    item.enqueuedAtTurn = Number((GM && GM.turn) || item.turn || 0);
    GM._memoryWriteQueue.push(item);
    if (item.status === 'quarantined') GM._memoryQuarantine.push(item);
    else if (item.status === 'draft') GM._memoryDraftInbox.push(item);
    GM._memoryAuditEvents.push({ id: item.id, action: 'enqueue', status: item.status, turn: item.enqueuedAtTurn });
    if (item.status === 'active' && item.reviewStatus === 'accepted') flushAccepted(GM, { reviewer: item.reviewedBy || 'system', governanceCooldownTurns: opts && opts.governanceCooldownTurns });
    pruneQueues(GM, opts);
    return item;
  }

  function findQueued(GM, id) {
    if (!GM) return null;
    ensureQueues(GM);
    var all = GM._memoryWriteQueue.concat(GM._memoryDraftInbox).concat(GM._memoryQuarantine);
    for (var i = 0; i < all.length; i++) {
      if (all[i] && all[i].id === id) return all[i];
    }
    return null;
  }

  function acceptDraft(GM, id, opts) {
    opts = opts || {};
    var item = findQueued(GM, id);
    if (!item) return null;
    item.status = 'active';
    item.reviewStatus = 'accepted';
    item.reviewedBy = clean(opts.reviewer || 'system', 80);
    item.reviewedAtTurn = Number((GM && GM.turn) || item.turn || 0);
    ensureQueues(GM);
    GM._memoryAuditEvents.push({ id: item.id, action: 'accept', reviewer: item.reviewedBy, turn: item.reviewedAtTurn });
    flushAccepted(GM, {
      reviewer: item.reviewedBy,
      governanceCooldownTurns: opts.governanceCooldownTurns,
      sourceId: item.id
    });
    recordLifecycleWrite(GM, {
      id: 'WRITEGATE_ACCEPT',
      stage: 'review-accept',
      sourceId: item.id,
      status: item.status,
      candidates: 1,
      added: item.status === 'active' && item.reviewStatus === 'accepted' ? 1 : 0,
      accepted: item.status === 'active' && item.reviewStatus === 'accepted' ? 1 : 0,
      archived: item.status === 'archived' ? 1 : 0,
      items: [item]
    });
    pruneQueues(GM, opts);
    return item;
  }

  function rejectDraft(GM, id, opts) {
    opts = opts || {};
    var item = findQueued(GM, id);
    if (!item) return null;
    item.reviewStatus = 'rejected';
    item.status = item.status === 'quarantined' ? 'quarantined' : 'archived';
    item.reviewedBy = clean(opts.reviewer || 'system', 80);
    item.rejectReason = clean(opts.reason || 'rejected', 160);
    item.reviewedAtTurn = Number((GM && GM.turn) || item.turn || 0);
    ensureQueues(GM);
    GM._memoryAuditEvents.push({ id: item.id, action: 'reject', reviewer: item.reviewedBy, reason: item.rejectReason, turn: item.reviewedAtTurn });
    recordLifecycleWrite(GM, {
      id: 'WRITEGATE_REJECT',
      stage: 'review-reject',
      sourceId: item.id,
      status: item.status,
      candidates: 1,
      added: 0,
      archived: item.status === 'archived' ? 1 : 0,
      quarantined: item.status === 'quarantined' ? 1 : 0,
      items: [item]
    });
    pruneQueues(GM, opts);
    return item;
  }

  function acceptedKey(item) {
    item = item || {};
    return clean(item.id || '', 160);
  }

  function flushAccepted(GM, opts) {
    opts = opts || {};
    if (!GM) return { added: 0, total: 0 };
    ensureQueues(GM);
    var seen = {};
    GM._memoryAccepted.forEach(function(item) {
      var key = acceptedKey(item);
      if (key) seen[key] = true;
    });
    var added = 0;
    var addedItems = [];
    var pools = GM._memoryWriteQueue.concat(GM._memoryDraftInbox);
    pools.forEach(function(item) {
      if (!item || item.status !== 'active' || item.reviewStatus !== 'accepted') return;
      var key = acceptedKey(item);
      if (!key || seen[key]) return;
      var governed = governAcceptedMemory(GM, item, opts);
      if (governed && governed.decision === 'duplicate') return;
      if (item.status !== 'active' || item.reviewStatus !== 'accepted') return;
      seen[key] = true;
      item.acceptedAtTurn = Number((GM && GM.turn) || item.turn || 0);
      item.acceptedBy = clean(item.reviewedBy || opts.reviewer || 'system', 80);
      GM._memoryAccepted.push(item);
      GM._memoryAuditEvents.push({ id: item.id, action: 'flush_accepted', reviewer: item.acceptedBy, turn: item.acceptedAtTurn });
      addedItems.push(item);
      added++;
    });
    if (added > 0) {
      recordLifecycleWrite(GM, {
        id: 'WRITEGATE_FLUSH_ACCEPTED',
        stage: 'accepted-flush',
        sourceId: clean(opts.sourceId || opts.reviewer || 'writegate', 80),
        status: 'accepted',
        candidates: pools.length,
        added: added,
        accepted: added,
        items: addedItems
      });
    }
    pruneQueues(GM, opts);
    return { added: added, total: GM._memoryAccepted.length };
  }

  ns.evaluateCandidate = evaluateCandidate;
  ns.enqueue = enqueue;
  ns.acceptDraft = acceptDraft;
  ns.rejectDraft = rejectDraft;
  ns.flushAccepted = flushAccepted;
  ns.governAcceptedMemory = governAcceptedMemory;
  ns.pruneQueues = pruneQueues;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
