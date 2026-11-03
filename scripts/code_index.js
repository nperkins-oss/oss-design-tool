#!/usr/bin/env node
/**
 * scripts/code_index.js
 * Fast Zero-Dependency Codebase Symbol, Line-Range, Reference & Integrity Indexer for OSS Design Tool.
 *
 * Commands:
 *   node scripts/code_index.js lookup <symbol_or_modal_id>
 *   node scripts/code_index.js file <file_path>
 *   node scripts/code_index.js refs <symbol_or_id>
 *   node scripts/code_index.js audit
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

function findBlockEndLine(lines, startIdx) {
  let depth = 0;
  let opened = false;
  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];
    // Strip simple line comments to avoid brace skew
    const clean = line.replace(/\/\/.*$/, '');
    for (let c = 0; c < clean.length; c++) {
      const ch = clean[c];
      if (ch === '{') {
        depth++;
        opened = true;
      } else if (ch === '}') {
        depth--;
        if (opened && depth <= 0) {
          return i + 1;
        }
      }
    }
  }
  return startIdx + 1;
}

function scanSymbolsInJsFile(relFile) {
  const fullPath = path.join(ROOT, relFile);
  if (!fs.existsSync(fullPath)) return { file: relFile, lines: 0, kb: 0, symbols: [] };
  const content = fs.readFileSync(fullPath, 'utf8').replace(/\r\n/g, '\n');
  const lines = content.split('\n');
  const symbols = [];
  let activeContainer = null;
  let activeContainerEndLine = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    if (activeContainer && lineNum > activeContainerEndLine) {
      activeContainer = null;
    }

    // 1. Top-level function declarations: function foo(...) or async function foo(...)
    const fnMatch = line.match(/^(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(/);
    if (fnMatch) {
      const endLine = findBlockEndLine(lines, i);
      symbols.push({ name: fnMatch[1], kind: 'function', file: relFile, line: lineNum, endLine });
      continue;
    }

    // 2. Top-level const / let / var declarations: const Foo = ...
    const varMatch = line.match(/^(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*(.*)/);
    if (varMatch) {
      const varName = varMatch[1];
      const rhs = varMatch[2] || '';
      const endLine = rhs.includes('{') ? findBlockEndLine(lines, i) : lineNum;
      symbols.push({ name: varName, kind: 'variable', file: relFile, line: lineNum, endLine });
      if (/^(?:\{|new\s+|function|\(\s*\)\s*=>)/.test(rhs.trim()) && endLine > lineNum) {
        activeContainer = varName;
        activeContainerEndLine = endLine;
      }
      continue;
    }

    // 3. Explicit window.* or OSS.* global exports
    const winMatch = line.match(/^\s*(?:window|OSS)\.([A-Za-z0-9_$.]+)\s*=/);
    if (winMatch) {
      const endLine = line.includes('{') ? findBlockEndLine(lines, i) : lineNum;
      symbols.push({ name: winMatch[1], kind: 'export', file: relFile, line: lineNum, endLine });
      continue;
    }

    // 4. Object / Singleton method definitions (2-space or 4-space indent)
    const methodMatch = line.match(/^(?:  |    )(?:async\s+)?([A-Za-z0-9_$]+)\s*(?:\([^)]*\)\s*\{|:\s*(?:async\s+)?function\s*\()/);
    if (methodMatch && !['if', 'for', 'while', 'switch', 'catch', 'return'].includes(methodMatch[1])) {
      const endLine = findBlockEndLine(lines, i);
      const methodName = activeContainer ? `${activeContainer}.${methodMatch[1]}` : methodMatch[1];
      symbols.push({ name: methodName, kind: 'method', file: relFile, line: lineNum, endLine });
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
      ids.push({ name: `#${m[1]}`, kind: 'html-id', file: relFile, line: i + 1, endLine: i + 1 });
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

function formatLineRange(sym) {
  return sym.endLine && sym.endLine > sym.line ? `L${sym.line}-L${sym.endLine}` : `L${sym.line}`;
}

function findReferences(query) {
  const cleanQuery = query.replace(/^#/, '');
  const escaped = cleanQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const wordRegex = new RegExp(`\\b${escaped}\\b`);
  const filesToScan = ['index.html', 'login.html', ...walkCodeFiles('js', ['.js']), ...walkCodeFiles('data', ['.js'])];
  const refs = [];
  for (const relFile of filesToScan) {
    const fullPath = path.join(ROOT, relFile);
    if (!fs.existsSync(fullPath)) continue;
    const lines = fs.readFileSync(fullPath, 'utf8').replace(/\r\n/g, '\n').split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (wordRegex.test(lines[i])) {
        refs.push({
          file: relFile,
          line: i + 1,
          snippet: lines[i].trim().slice(0, 110)
        });
      }
    }
  }
  return refs;
}

function runCrossModuleAudit() {
  const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const scriptPaths = [...indexHtml.matchAll(/src="((?:js|data)\/[^"?]+\.js)/g)].map(m => m[1]);

  // 1. Check for duplicate top-level functions across loaded browser scripts
  const topFnMap = new Map();
  const duplicateFns = [];
  const allBrowserJs = [];

  for (const relScript of scriptPaths) {
    const src = fs.readFileSync(path.join(ROOT, relScript), 'utf8').replace(/\r\n/g, '\n');
    allBrowserJs.push(src);
    const lines = src.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(/^(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(/);
      if (m) {
        const fnName = m[1];
        const loc = `${relScript}#L${i + 1}`;
        if (topFnMap.has(fnName)) {
          duplicateFns.push({ name: fnName, first: topFnMap.get(fnName), second: loc });
        } else {
          topFnMap.set(fnName, loc);
        }
      }
    }
  }

  // 2. Check that all inline HTML event handlers reference defined symbols
  const combinedJs = allBrowserJs.join('\n');
  const htmlLines = indexHtml.replace(/\r\n/g, '\n').split('\n');
  const builtins = new Set([
    'if', 'else', 'for', 'while', 'switch', 'return', 'let', 'const', 'var',
    'true', 'false', 'null', 'undefined', 'this', 'event', 'window', 'document',
    'localStorage', 'console', 'Math', 'Number', 'String', 'Boolean', 'Array',
    'Object', 'setTimeout', 'clearTimeout', 'confirm', 'alert', ' parseInt', 'parseFloat'
  ]);
  const missingHandlers = [];

  for (let i = 0; i < htmlLines.length; i++) {
    const line = htmlLines[i];
    const attrMatches = [...line.matchAll(/\bon(?:click|change|input|submit|keydown|keyup)="([^"]+)"/g)];
    for (const attr of attrMatches) {
      const expr = attr[1];
      const calls = [...expr.matchAll(/(?:^|[;{(\s!])([A-Za-z_$][A-Za-z0-9_$]*)(?:\.[A-Za-z0-9_$]+)?\s*\(/g)];
      for (const c of calls) {
        const rootIdent = c[1];
        if (builtins.has(rootIdent)) continue;
        const identRegex = new RegExp(`\\b${rootIdent}\\b`);
        if (!identRegex.test(combinedJs)) {
          missingHandlers.push({ identifier: rootIdent, handler: expr, line: i + 1 });
        }
      }
    }
  }

  return {
    scriptCount: scriptPaths.length,
    uniqueTopLevelFunctions: topFnMap.size,
    duplicateFns,
    missingHandlers
  };
}

if (require.main === module) {
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
      console.log(`  [${m.kind.padEnd(8)}] ${m.name.padEnd(42)} -> ${m.file}#${formatLineRange(m)}`);
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
      console.log(`  ${formatLineRange(s).padEnd(13)} [${s.kind.padEnd(8)}] ${s.name}`);
    }
  } else if (cmd === 'refs') {
    const target = args[1];
    if (!target) {
      console.error('Usage: node scripts/code_index.js refs <symbol_or_id>');
      process.exit(1);
    }
    const refs = findReferences(target);
    console.log(`Found ${refs.length} reference(s) for "${target}":`);
    for (const r of refs.slice(0, 80)) {
      console.log(`  ${(r.file + '#L' + r.line).padEnd(44)} ${r.snippet}`);
    }
    if (refs.length > 80) {
      console.log(`  ... and ${refs.length - 80} more reference(s).`);
    }
  } else if (cmd === 'audit') {
    const res = runCrossModuleAudit();
    console.log(`Cross-Module Audit: ${res.scriptCount} browser scripts, ${res.uniqueTopLevelFunctions} unique top-level functions.`);
    if (res.duplicateFns.length > 0) {
      console.error('Duplicate top-level functions found:', res.duplicateFns);
      process.exit(1);
    }
    if (res.missingHandlers.length > 0) {
      console.error('Missing HTML inline event handlers found:', res.missingHandlers);
      process.exit(1);
    }
    console.log('✓ 0 duplicate top-level functions & 100% of HTML inline handlers resolved.');
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
}

module.exports = {
  buildFullIndex,
  scanSymbolsInJsFile,
  findReferences,
  runCrossModuleAudit
};
