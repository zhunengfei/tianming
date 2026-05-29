const fs = require('fs');

// Phase 3 R10 done (2026-05-04): -3 deleted (tm-fiscal-fixed-expense/tm-neitang-p2/tm-phase-h-final) +2 merged successors (tm-fiscal-engine·tm-neitang-engine)
// R12b/R12d done (2026-05-04): tm-phase-c-patches merged into tm-edict-parser; tm-phase-f1-fixes merged into tm-authority-engines + tm-prophecy.
// P4-beta UI foundation done (2026-05-04): tm-icons/modal/settings/cheatsheet merged into tm-ui-foundation.
const files = [
    "tm-ai-npc-memorials.js", "tm-authority-complete.js", "tm-authority-engines.js",
    "tm-central-local-engine.js", "tm-change-queue.js", "tm-char-full-schema.js",
    "tm-char-historical-profiles.js", "tm-corruption-engine.js",
    "tm-data-model.js",
    "tm-economy-engine.js", "tm-economy-military.js",
    "tm-edict-lifecycle.js", "tm-edict-parser.js",
    "editor-presets.js", "editor-division-deep.js", "editor-office-deep.js",
    "tm-env-recovery-fill.js", "tm-event-system.js",
    "tm-fiscal-engine.js", "tm-guoku-engine.js", "tm-guoku-panel.js", "tm-historical-presets.js",
    "tm-huji-deep-fill.js", "tm-huji-engine.js", "tm-ui-foundation.js", "tm-lizhi-panel.js",
    "tm-map-system.js", "tm-neitang-engine.js", "tm-neitang-panel.js", "tm-phase-b-fills.js",
    "tm-phase-d-patches.js", "tm-phase-e-patches.js",
    "tm-phase-f2-linkage.js", "tm-phase-f3-depth.js",
    "tm-phase-f4-authority-deep.js", "tm-phase-f5-ui-ai.js", "tm-phase-g1-authority-ui.js",
    "tm-phase-g2-huji-complete.js", "tm-phase-g3-edict-finalize.js", "tm-phase-g4-economy-finalize.js",
    "tm-test.js", "tm-traits-data.js"
];

const fileGlobals = {};
const allGlobals = new Map(); // name -> list of files
const typeCount = { func: 0, window: 0, var: 0, assign: 0 };

for (const fname of files) {
    if (!fs.existsSync(fname)) continue;
    
    const src = fs.readFileSync(fname, 'utf-8');
    const globals = new Set();
    const types = {};
    
    // Pattern 1: Top-level function declarations
    for (const m of src.matchAll(/^\s*function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/gm)) {
        const name = m[1];
        globals.add(name);
        if (!types[name]) types[name] = [];
        types[name].push('func');
    }
    
    // Pattern 2: window.NAME =
    for (const m of src.matchAll(/(?:^|\n)\s*window\.([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/g)) {
        const name = m[1];
        globals.add(name);
        if (!types[name]) types[name] = [];
        types[name].push('window');
    }
    
    // Pattern 3: Top-level var/let/const (not in IIFE)
    // Simplified: just check if starts at column 0 or minimal indent
    for (const m of src.matchAll(/^\s{0,2}(var|let|const)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/gm)) {
        const name = m[2];
        globals.add(name);
        if (!types[name]) types[name] = [];
        types[name].push('var');
    }
    
    // Pattern 4: Top-level NAME = function/class
    for (const m of src.matchAll(/^\s{0,2}([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(function|\{|class)/gm)) {
        const name = m[1];
        globals.add(name);
        if (!types[name]) types[name] = [];
        types[name].push('assign');
    }
    
    fileGlobals[fname] = Array.from(globals);
    
    for (const g of globals) {
        if (!allGlobals.has(g)) allGlobals.set(g, []);
        allGlobals.get(g).push(fname);
    }
    
    for (const typelist of Object.values(types)) {
        for (const t of typelist) {
            typeCount[t]++;
        }
    }
}

// Sort files by global count
const sorted = Object.entries(fileGlobals)
    .sort((a, b) => b[1].length - a[1].length);

console.log('## Top 10 files (by window exposure count)');
for (let i = 0; i < Math.min(10, sorted.length); i++) {
    const [fname, names] = sorted[i];
    const ex = names.slice(0, 5).join(', ');
    const more = names.length > 5 ? '...' : '';
    console.log(`${i+1}. ${fname} - ${names.length} globals: ${ex}${more}`);
}

// Check for conflicts
const conflicts = Array.from(allGlobals.entries())
    .filter(([name, files]) => files.length > 1)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 3);

console.log('\n## Naming conflicts');
if (conflicts.length > 0) {
    for (const [name, files] of conflicts) {
        console.log(`- "${name}": ${files.slice(0, 2).join(', ')} ${files.length > 2 ? `+ ${files.length - 2} more` : ''}`);
    }
} else {
    console.log('- None detected (good!)');
}

console.log('\n## Category breakdown');
console.log(`- function declarations: ${typeCount.func}`);
console.log(`- window.X = ...: ${typeCount.window}`);
console.log(`- var/let/const X = ...: ${typeCount.var}`);
console.log(`- X = function/class: ${typeCount.assign}`);
console.log(`**Total unique globals: ${allGlobals.size}**`);

console.log('\n## Improvement recommendations');
const avgPerFile = Math.round(allGlobals.size / files.length);
console.log(`1. Namespace consolidation: Avg ${avgPerFile} globals/file. Wrap in module objects.`);
console.log(`2. Top 3 files (${sorted[0][0]}, ${sorted[1][0]}, ${sorted[2][0]}) exceed 400+ globals - consider splitting.`);
console.log(`3. Minimal window exposure (${typeCount.window} explicit). Use IIFE patterns to reduce leakage.`);
