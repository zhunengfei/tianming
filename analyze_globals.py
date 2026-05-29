#!/usr/bin/env python3
import os
import re
from collections import defaultdict

# Phase 3 R10 done (2026-05-04): -8 deleted (tm-currency-engine/tm-currency-unit/tm-economy-gap-fill/tm-economy-linkage/tm-env-capacity-engine/tm-fiscal-fixed-expense/tm-neitang-p2/tm-phase-h-final) +3 merged successors (tm-economy-engine·tm-fiscal-engine·tm-neitang-engine)
# R12b/R12d done (2026-05-04): tm-phase-c-patches merged into tm-edict-parser; tm-phase-f1-fixes merged into tm-authority-engines + tm-prophecy.
# P4-beta UI foundation done (2026-05-04): tm-icons/modal/settings/cheatsheet merged into tm-ui-foundation.
files_to_scan = [
    'tm-ai-npc-memorials.js', 'tm-authority-complete.js', 'tm-authority-engines.js',
    'tm-central-local-engine.js', 'tm-change-queue.js', 'tm-char-full-schema.js',
    'tm-char-historical-profiles.js', 'tm-corruption-engine.js',
    'tm-data-model.js',
    'tm-economy-engine.js', 'tm-economy-military.js',
    'tm-edict-lifecycle.js', 'tm-edict-parser.js',
    'tm-editor-custom-presets.js', 'tm-editor-division-deep.js', 'tm-editor-office-deep.js',
    'tm-env-recovery-fill.js', 'tm-event-system.js',
    'tm-fiscal-engine.js', 'tm-guoku-engine.js', 'tm-guoku-panel.js', 'tm-historical-presets.js',
    'tm-huji-deep-fill.js', 'tm-huji-engine.js', 'tm-ui-foundation.js', 'tm-lizhi-panel.js',
    'tm-map-system.js', 'tm-neitang-engine.js', 'tm-neitang-panel.js', 'tm-phase-b-fills.js',
    'tm-phase-d-patches.js', 'tm-phase-e-patches.js',
    'tm-phase-f2-linkage.js', 'tm-phase-f3-depth.js',
    'tm-phase-f4-authority-deep.js', 'tm-phase-f5-ui-ai.js', 'tm-phase-g1-authority-ui.js',
    'tm-phase-g2-huji-complete.js', 'tm-phase-g3-edict-finalize.js', 'tm-phase-g4-economy-finalize.js',
    'tm-test.js', 'tm-traits-data.js'
]

globals_by_file = {}
all_globals = {}  # name -> (file, type)
conflicts = defaultdict(list)

for fname in files_to_scan:
    if not os.path.exists(fname):
        continue
    
    with open(fname, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    names = set()
    
    # 1. Top-level function declarations
    for m in re.finditer(r'^\s*function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(', content, re.MULTILINE):
        name = m.group(1)
        names.add(name)
        if name in all_globals:
            conflicts[name].append((all_globals[name][0], fname))
        else:
            all_globals[name] = (fname, 'function')
    
    # 2. window.NAME =
    for m in re.finditer(r'window\.([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=', content):
        name = m.group(1)
        names.add(name)
        if name in all_globals:
            conflicts[name].append((all_globals[name][0], fname))
        else:
            all_globals[name] = (fname, 'window')
    
    # 3. Top-level var/let/const NAME =
    for m in re.finditer(r'^\s*(var|let|const)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=', content, re.MULTILINE):
        name = m.group(2)
        names.add(name)
        if name in all_globals:
            conflicts[name].append((all_globals[name][0], fname))
        else:
            all_globals[name] = (fname, 'var/let/const')
    
    # 4. Top-level NAME = function/class/object
    for m in re.finditer(r'^\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(function|class|\{)', content, re.MULTILINE):
        name = m.group(1)
        names.add(name)
        if name in all_globals:
            conflicts[name].append((all_globals[name][0], fname))
        else:
            all_globals[name] = (fname, 'assignment')
    
    globals_by_file[fname] = sorted(names)

# Sort by count
sorted_files = sorted(globals_by_file.items(), key=lambda x: len(x[1]), reverse=True)

print("## Top 10 files (by window exposure count)")
for i, (fname, names) in enumerate(sorted_files[:10], 1):
    example = ', '.join(names[:5])
    if len(names) > 5:
        example += '...'
    print(f"{i}. {fname} - {len(names)} globals: {example}")

# Category counts
func_count = sum(1 for _, (_, t) in all_globals.items() if t == 'function')
window_count = sum(1 for _, (_, t) in all_globals.items() if t == 'window')
var_count = sum(1 for _, (_, t) in all_globals.items() if t == 'var/let/const')
assign_count = sum(1 for _, (_, t) in all_globals.items() if t == 'assignment')

print("\n## Category breakdown")
print(f"- Top-level function declarations: {func_count}")
print(f"- window.X = ... assignments: {window_count}")
print(f"- var/let/const X = ... (top-level): {var_count}")
print(f"- X = function/class (assignments): {assign_count}")
print(f"**Total unique globals: {len(all_globals)}**")

# Conflicts (>1 file)
real_conflicts = {k: v for k, v in conflicts.items() if len(v) > 0}
if real_conflicts:
    print("\n## Naming conflicts detected")
    for name, origins in sorted(real_conflicts.items())[:5]:
        print(f"- '{name}': {', '.join(set([o[0] for o in origins] + [origins[0][1]]))}")
else:
    print("\n## Naming conflicts: None detected")
