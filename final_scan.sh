#!/bin/bash

# Phase 3 R10 done (2026-05-04): -8 deleted (tm-currency-engine/tm-currency-unit/tm-economy-gap-fill/tm-economy-linkage/tm-env-capacity-engine/tm-fiscal-fixed-expense/tm-neitang-p2/tm-phase-h-final) +3 merged successors (tm-economy-engine·tm-fiscal-engine·tm-neitang-engine)
# R12b/R12d done (2026-05-04): tm-phase-c-patches merged into tm-edict-parser; tm-phase-f1-fixes merged into tm-authority-engines + tm-prophecy.
# P4-beta UI foundation done (2026-05-04): tm-icons/modal/settings/cheatsheet merged into tm-ui-foundation.
files=(
    "tm-ai-npc-memorials.js" "tm-authority-complete.js" "tm-authority-engines.js"
    "tm-central-local-engine.js" "tm-change-queue.js" "tm-char-full-schema.js"
    "tm-char-historical-profiles.js" "tm-corruption-engine.js"
    "tm-data-model.js"
    "tm-economy-engine.js" "tm-economy-military.js"
    "tm-edict-lifecycle.js" "tm-edict-parser.js"
    "tm-editor-custom-presets.js" "tm-editor-division-deep.js" "tm-editor-office-deep.js"
    "tm-env-recovery-fill.js" "tm-event-system.js"
    "tm-fiscal-engine.js" "tm-guoku-engine.js" "tm-guoku-panel.js" "tm-historical-presets.js"
    "tm-huji-deep-fill.js" "tm-huji-engine.js" "tm-ui-foundation.js" "tm-lizhi-panel.js"
    "tm-map-system.js" "tm-neitang-engine.js" "tm-neitang-panel.js" "tm-phase-b-fills.js"
    "tm-phase-d-patches.js" "tm-phase-e-patches.js"
    "tm-phase-f2-linkage.js" "tm-phase-f3-depth.js"
    "tm-phase-f4-authority-deep.js" "tm-phase-f5-ui-ai.js" "tm-phase-g1-authority-ui.js"
    "tm-phase-g2-huji-complete.js" "tm-phase-g3-edict-finalize.js" "tm-phase-g4-economy-finalize.js"
    "tm-test.js" "tm-traits-data.js"
)

echo "Scanning ${#files[@]} files..."

# Create temp file for all globals
> /tmp/all_globals.txt

declare -A fileCounts

for f in "${files[@]}"; do
    if [ ! -f "$f" ]; then continue; fi
    
    grep -o '\b[a-zA-Z_$][a-zA-Z0-9_$]*\b' "$f" | sort -u > /tmp/vars.txt
    count=$(wc -l < /tmp/vars.txt)
    fileCounts[$f]=$count
    
    cat /tmp/vars.txt >> /tmp/all_globals.txt
done

# Show top 10
echo "## Top 10 files (by extracted identifier count)"
i=1
for f in "${!fileCounts[@]}"; do
    echo "${fileCounts[$f]} $f"
done | sort -rn | head -10 | while read cnt f; do
    echo "$i. $f - $cnt identifiers"
    i=$((i+1))
done

# Total unique
unique=$(sort -u /tmp/all_globals.txt | wc -l)
echo ""
echo "**Total unique identifiers across all 54 files: $unique**"

# Look for explicit window/global assignments
echo ""
echo "## Explicit window exposures"
grep -h 'window\.[a-zA-Z_$][a-zA-Z0-9_$]*\s*=' "${files[@]}" 2>/dev/null | \
    sed 's/.*window\.\([a-zA-Z_$][a-zA-Z0-9_$]*\).*/\1/' | \
    sort -u | wc -l | xargs echo "window.X = ... count:"
