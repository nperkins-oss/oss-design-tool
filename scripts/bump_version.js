#!/usr/bin/env node
/**
 * scripts/bump_version.js
 * Zero-dependency Single-Source-of-Truth Version, Build Stamp & Changelog Synchronizer (Node.js)
 * Syncs VERSION.json, package.json, js/core/app.js, index.html (all ?v= tags + badge), login.html,
 * and scaffolds a dated release section in CHANGELOG.md when bumping to a new version.
 *
 * Usage:
 *   node scripts/bump_version.js --set 0.11.0-beta.8
 *   node scripts/bump_version.js --patch
 *   node scripts/bump_version.js --minor --prerelease rc.1
 *   node scripts/bump_version.js --release
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const VERSION_FILE = path.join(ROOT, 'VERSION.json');
const PACKAGE_JSON_FILE = path.join(ROOT, 'package.json');
const APP_JS_FILE = path.join(ROOT, 'js', 'core', 'app.js');
const INDEX_HTML_FILE = path.join(ROOT, 'index.html');
const LOGIN_HTML_FILE = path.join(ROOT, 'login.html');
const CHANGELOG_FILE = path.join(ROOT, 'CHANGELOG.md');

function parseSemver(verStr) {
  const clean = String(verStr || '').trim().replace(/^v/, '');
  const m = clean.match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/);
  if (!m) throw new Error(`Invalid SemVer string: ${verStr}`);
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]), pre: m[4] || null };
}

function getBuildAndDateStamps() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  return {
    buildStamp: `${yyyy}.${mm}.${dd}.${pad(d.getHours())}${pad(d.getMinutes())}`,
    isoDate: `${yyyy}-${mm}-${dd}`
  };
}

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const args = process.argv.slice(2);
const getArg = (flag) => {
  const i = args.indexOf(flag);
  return (i >= 0 && i + 1 < args.length) ? args[i + 1] : null;
};
const hasFlag = (flag) => args.includes(flag);

const data = JSON.parse(fs.readFileSync(VERSION_FILE, 'utf8'));
let { major, minor, patch, pre } = parseSemver(data.version || '0.11.0-beta.1');
const setVer = getArg('--set');
const preArg = getArg('--prerelease');
const schemaArg = getArg('--schema');

if (setVer) {
  ({ major, minor, patch, pre } = parseSemver(setVer));
} else if (hasFlag('--major')) {
  major += 1; minor = 0; patch = 0; pre = preArg;
} else if (hasFlag('--minor')) {
  minor += 1; patch = 0; pre = preArg;
} else if (hasFlag('--patch')) {
  if (pre && !preArg) {
    const pm = pre.match(/^([a-zA-Z]+)(?:\.(\d+))?$/);
    if (pm) {
      pre = `${pm[1]}.${Number(pm[2] || 0) + 1}`;
    } else {
      patch += 1;
    }
  } else {
    patch += 1;
    if (preArg) pre = preArg;
  }
} else if (preArg) {
  pre = preArg;
}

if (hasFlag('--release')) pre = null;

const newVer = `${major}.${minor}.${patch}${pre ? `-${pre}` : ''}`;
const { buildStamp, isoDate } = getBuildAndDateStamps();
const schemaVer = schemaArg || data.schemaVersion || '2.1.0';

data.version = newVer;
data.build = buildStamp;
data.schemaVersion = schemaVer;
fs.writeFileSync(VERSION_FILE, JSON.stringify(data, null, 2) + '\n', 'utf8');

if (fs.existsSync(PACKAGE_JSON_FILE)) {
  const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON_FILE, 'utf8'));
  pkg.version = newVer;
  fs.writeFileSync(PACKAGE_JSON_FILE, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
}

if (fs.existsSync(APP_JS_FILE)) {
  let appText = fs.readFileSync(APP_JS_FILE, 'utf8');
  appText = appText
    .replace(/const APP_VERSION\s*=\s*"[^"]+";/, `const APP_VERSION = "${newVer}";`)
    .replace(/const BUILD_NUMBER\s*=\s*"[^"]+";/, `const BUILD_NUMBER = "${buildStamp}";`)
    .replace(/const SCHEMA_VERSION\s*=\s*"[^"]+";/, `const SCHEMA_VERSION = "${schemaVer}";`);
  fs.writeFileSync(APP_JS_FILE, appText, 'utf8');
}

if (fs.existsSync(INDEX_HTML_FILE)) {
  let idxText = fs.readFileSync(INDEX_HTML_FILE, 'utf8');
  idxText = idxText
    .replace(/(<(?:span|button)[^>]*id="appVersionBadge"[^>]*>)[^<]*(<\/(?:span|button)>)/, `$1v${newVer}$2`)
    .replace(/((?:src|href)="(?:js|data|assets\/css)\/[^"?]+\.(?:js|css))(?:\?v=[^"]*)?(")/g, `$1?v=${newVer}$2`);
  fs.writeFileSync(INDEX_HTML_FILE, idxText, 'utf8');
}

if (fs.existsSync(LOGIN_HTML_FILE)) {
  let loginText = fs.readFileSync(LOGIN_HTML_FILE, 'utf8');
  loginText = loginText.replace(/(Orion Security Solutions &bull; )v[0-9A-Za-z.\-]+/, `$1v${newVer}`);
  fs.writeFileSync(LOGIN_HTML_FILE, loginText, 'utf8');
}

if (!hasFlag('--no-changelog') && fs.existsSync(CHANGELOG_FILE)) {
  let clText = fs.readFileSync(CHANGELOG_FILE, 'utf8').replace(/\r\n/g, '\n');
  const verHeaderRe = new RegExp(`^## \\[${escapeRegExp(newVer)}\\]`, 'm');
  if (!verHeaderRe.test(clText)) {
    const firstHeaderIdx = clText.search(/^## \[/m);
    const scaffold = [
      `## [${newVer}] - ${isoDate}`,
      '',
      '### Added & Enhanced',
      `- _TODO: Document release notes for v${newVer} before running npm run verify_`,
      '',
      '---',
      '',
      ''
    ].join('\n');
    if (firstHeaderIdx >= 0) {
      clText = clText.slice(0, firstHeaderIdx) + scaffold + clText.slice(firstHeaderIdx);
    } else {
      clText = clText.trimEnd() + '\n\n' + scaffold;
    }
    fs.writeFileSync(CHANGELOG_FILE, clText, 'utf8');
    console.log(`[Changelog] Scaffolded ## [${newVer}] - ${isoDate} in CHANGELOG.md (fill in notes before verifying).`);
  }
}

console.log(`[Version Sync] Updated APP_VERSION = v${newVer}, BUILD_NUMBER = ${buildStamp}, SCHEMA_VERSION = ${schemaVer}`);
