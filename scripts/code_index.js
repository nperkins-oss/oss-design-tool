#!/usr/bin/env node
/**
 * scripts/code_index.js
 * Fast Zero-Dependency Codebase Symbol, Function & DOM Modal Indexer for OSS Design Tool.
 *
 * Commands:
 *   node scripts/code_index.js lookup <symbol_or_modal_id>
 *   node scripts/code_index.js file <file_path>
 *   node scripts/code_index.js summary
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function walkCodeFiles(relDir, exts = ['.js']) {
  const absDir = path.join(ROOT, relDir);
  if (!fs.existsSync(absDir)) return [];
  const results = [];
  function recurse(d) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) {
        recurse(full);
      } else if (exts.some(ext => entry.name.endsWith(ext))) {
        results.push(path.relative(ROOT, full).split(path.sep).join('/'));
      }
    }
  }
  recurse(absDir);
  return results.sort();
}

function scanSymbolsInJsFile(relFile) {
  const fullPath = path.join(ROOT, relFile);
  if (!fs.existsSync(fullPath)) return { file: relFile, lines: 0, symbols: [] };
  const content = fs.readFileSync(fullPath, 'utf8').replace(/\r\n/g, '\n');
  const lines = content.split('\n');
  const symbols = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // 1. Top-level function declarations: function foo(...) or async function foo(...)
    const fnMatch = line.match(/^(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(/);
    if (fnMatch) {
      symbols.push({ name: fnMatch[1], kind: 'function', file: relFile, line: lineNum });
      continue;
    }

    // 2. Top-level const / let / var declarations: const Foo = ...
    const varMatch = line.match(/^(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=/);
    if (varMatch) {
      symbols.push({ name: varMatch[1], kind: 'variable', file: relFile, line: lineNum });
      continue;
    }

    // 3. Namespace / Store method definitions (2-space indent): methodName(...) { or methodName: function(...)
    const methodMatch = line.match(/^  (?:async\s+)?([A-Za-z0-9_$]+)\s*\([^)]*\)\s*\{/);
    if (methodMatch && !['if', 'for', 'while', 'switch', 'catch'].includes(methodMatch[1])) {
      symbols.push({ name: methodMatch[1], kind: 'method', file: relFile, line: lineNum });
    }
  }

  return { file: relFile, lines: lines.length, kb: Math.round(content.length / 1024), symbols };
}

function scanHtmlModalsAndIds(relFile = 'index.html') {
  const fullPath = path.join(ROOT, relFile);
  if (!fs.existsSync(fullPath)) return [];
  const lines = fs.readFileSync(fullPath, 'utf8').replace(/\r\n/g, '\n').split('\n');
  const ids = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const regex = /\bid="([^"]+)"/g;
    let m;
    while ((m = regex.exec(line)) !== null) {
      ids.push({ name: `#${m[1]}`, kind: 'html-id', file: relFile, line: i + 1 });
    }
  }
  return ids;
}

function buildFullIndex() {
  const jsFiles = [...walkCodeFiles('js', ['.js']), ...walkCodeFiles('data', ['.js']), ...walkCodeFiles('scripts', ['.js'])];
  const fileReports = jsFiles.map(scanSymbolsInJsFile);
  const htmlSymbols = [...scanHtmlModalsAndIds('index.html'), ...scanHtmlModalsAndIds('login.html')];
  const allSymbols = [];
  for (const rep of fileReports) {
    allSymbols.push(...rep.symbols);
  }
  allSymbols.push(...htmlSymbols);
  return { fileReports, allSymbols };
}

const args = process.argv.slice(2);
const cmd = args[0] || 'summary';

if (cmd === 'lookup' || cmd === 'find') {
  const query = (args[1] || '').toLowerCase();
  if (!query) {
    console.error('Usage: node scripts/code_index.js lookup <symbol_or_id>');
    process.exit(1);
  }
  const { allSymbols } = buildFullIndex();
  const matches = allSymbols.filter(s => s.name.toLowerCase().includes(query));
  if (matches.length === 0) {
    console.log(`No symbol or HTML #id matching "${args[1]}" found.`);
    process.exit(0);
  }
  console.log(`Found ${matches.length} match(es) for "${args[1]}":`);
  for (const m of matches.slice(0, 60)) {
    console.log(`  [${m.kind.padEnd(8)}] ${m.name.padEnd(38)} -> ${m.file}#L${m.line}`);
  }
} else if (cmd === 'file') {
  const target = args[1];
  if (!target) {
    console.error('Usage: node scripts/code_index.js file <relative_path>');
    process.exit(1);
  }
  const rep = scanSymbolsInJsFile(target);
  console.log(`=== ${rep.file} (${rep.lines} lines, ${rep.kb} KB, ${rep.symbols.length} symbols) ===`);
  for (const s of rep.symbols) {
    console.log(`  L${String(s.line).padStart(5)} [${s.kind.padEnd(8)}] ${s.name}`);
  }
} else {
  const { fileReports, allSymbols } = buildFullIndex();
  console.log('==================================================================');
  console.log('OSS Design Tool — Codebase Symbol & File Index Summary');
  console.log('==================================================================');
  console.log(`Total Indexed JS Files : ${fileReports.length}`);
  console.log(`Total Indexed Symbols  : ${allSymbols.length} (functions, variables, store methods & HTML #ids)\n`);
  for (const rep of fileReports) {
    const fnCount = rep.symbols.filter(s => s.kind === 'function' || s.kind === 'method').length;
    console.log(`  ${rep.file.padEnd(42)} ${String(rep.lines).padStart(5)} lines (${String(rep.kb).padStart(3)} KB) • ${String(fnCount).padStart(3)} functions/methods`);
  }
}
