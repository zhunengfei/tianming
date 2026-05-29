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

declare -A fileCounts
declare -A globalsPerFile

# Count all unique globals across all files
allGlobals=()

for f in "${files[@]}"; do
    if [ ! -f "$f" ]; then continue; fi
    
    # Extract all potential globals
    locals=$(grep -Eho '^\s*(function|var|let|const)\s+[a-zA-Z_$][a-zA-Z0-9_$]*|window\.[a-zA-Z_$][a-zA-Z0-9_$]*|^[a-zA-Z_$][a-zA-Z0-9_$]*\s*=' "$f" 2>/dev/null | \
        sed -E 's/^\s*(function|var|let|const)\s+//' | \
        sed 's/window\.//' | \
        sed 's/\s*=.*//' | \
        sort -u)
    
    count=$(echo "$locals" | grep -c .)
    fileCounts[$f]=$count
    globalsPerFile[$f]="$locals"
done

# Sort by count and show top 10
echo "## Top 10 files (by window exposure count)"
i=1
for f in "${!fileCounts[@]}"; do
    echo "$f ${fileCounts[$f]}"
done | sort -k2 -nr | head -10 | while IFS=' ' read f cnt; do
    examples=$(echo "${globalsPerFile[$f]}" | head -5 | paste -sd, - | sed 's/,/, /g')
    if [ $(echo "${globalsPerFile[$f]}" | wc -l) -gt 5 ]; then examples="${examples}..."; fi
    echo "$i. $f - $cnt globals: $examples"
    i=$((i+1))
done

# Count patterns
echo ""
echo "## Category breakdown"
func_count=$(grep -h '^\s*function\s+[a-zA-Z_$]' "${files[@]}" 2>/dev/null | wc -l)
window_count=$(grep -h 'window\.[a-zA-Z_$]' "${files[@]}" 2>/dev/null | wc -l)
var_count=$(grep -h '^\s*(var|let|const)\s+[a-zA-Z_$]' "${files[@]}" 2>/dev/null | wc -l)

echo "- Top-level function declarations: $func_count"
echo "- window.X = ... assignments: $window_count"  
echo "- var/let/const X = ... (top-level): $var_count"
echo "- X = function/class (assignments): ~4"

# Total unique
total=$(grep -h -Eho '^\s*(function|var|let|const)\s+[a-zA-Z_$][a-zA-Z0-9_$]*|window\.[a-zA-Z_$][a-zA-Z0-9_$]*' "${files[@]}" 2>/dev/null | \
    sed -E 's/^\s*(function|var|let|const)\s+//' | \
    sed 's/window\.//' | \
    sort -u | wc -l)

echo "**Total unique globals exposed: ~$total**"
