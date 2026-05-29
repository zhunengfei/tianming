const fs = require('fs');
const path = require('path');
const glob = require('glob');

const files = fs.readdirSync('.').filter(f => f.match(/^tm-.*\.js$/));

const results = {};

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf-8');
  const globals = new Set();
  
  // 1. Top-level function declarations
  const funcMatches = content.matchAll(/^\s*function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/gm);
  for (const m of funcMatches) {
    globals.add(m[1]);
  }
  
  // 2. window.NAME = ...
  const windowMatches = content.matchAll(/window\.([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/g);
  for (const m of windowMatches) {
    globals.add(m[1]);
  }
  
  // 3. global.NAME = ... (top-level)
  const globalMatches = content.matchAll(/(?:^|\n)\s*global\.([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/gm);
  for (const m of globalMatches) {
    globals.add(m[1]);
  }
  
  // 4. Top-level var/let/const NAME = ...
  const varMatches = content.matchAll(/^\s*(var|let|const)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/gm);
  for (const m of varMatches) {
    globals.add(m[2]);
  }
  
  // 5. Top-level NAME = function (overwrite)
  const overwriteMatches = content.matchAll(/^\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(function|class|async\s+function)/gm);
  for (const m of overwriteMatches) {
    globals.add(m[1]);
  }
  
  results[file] = Array.from(globals).sort();
});

// Sort by count descending
const sorted = Object.entries(results)
  .sort((a, b) => b[1].length - a[1].length);

console.log('Top 10 files:');
sorted.slice(0, 10).forEach(([file, names], i) => {
  console.log(`${i+1}. ${file} - ${names.length} globals: ${names.slice(0, 5).join(', ')}${names.length > 5 ? '...' : ''}`);
});

// Statistics
const typeMap = { funcDecl: 0, windowExpo: 0, globalExpo: 0, topVarLet: 0, overwrite: 0 };
const allNames = new Set();

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf-8');
  
  content.matchAll(/^\s*function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/gm);
  for (const m of content.matchAll(/^\s*function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/gm)) {
    allNames.add(m[1]);
  }
  
  for (const m of content.matchAll(/window\.([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/g)) {
    allNames.add(m[1]);
  }
});

console.log('\n=== STATISTICS ===');
console.log(`Total unique globals: ${allNames.size}`);
console.log(`Total files scanned: ${files.length}`);
