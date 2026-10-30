#!/usr/bin/env node
/**
 * scripts/verify_app.js
 * Zero-dependency Pre-Deploy & Engineering Regression Suite for OSS Design Tool.
 * Runs locally (`npm run verify`) and in GitHub Actions CI before deploying to Azure Static Web Apps.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const ROOT = path.resolve(__dirname, '..');
const readUtf8 = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const existsRel = (rel) => fs.existsSync(path.join(ROOT, rel));

console.log('==================================================================');
console.log('OSS Design Tool — Pre-Deploy Integrity & Engineering Audit Suite');
console.log('==================================================================');

// ---------------------------------------------------------------------------
// 1. Version Synchronization & Cache-Busting Audit
// ---------------------------------------------------------------------------
const verJson = JSON.parse(readUtf8('VERSION.json'));
const expectedVersion = verJson.version;
assert(expectedVersion, 'VERSION.json must define "version"');

if (existsRel('package.json')) {
  const pkgJson = JSON.parse(readUtf8('package.json'));
  assert.strictEqual(
    pkgJson.version,
    expectedVersion,
    `package.json version (${pkgJson.version}) !== VERSION.json (${expectedVersion}). Run: python scripts/bump_version.py --set ${expectedVersion}`
  );
}

const appJsSrc = readUtf8('js/core/app.js');
const appVerMatch = appJsSrc.match(/const APP_VERSION\s*=\s*"([^"]+)";/);
assert(appVerMatch && appVerMatch[1] === expectedVersion, `js/core/app.js APP_VERSION (${appVerMatch?.[1]}) !== VERSION.json (${expectedVersion})`);

const indexHtml = readUtf8('index.html');
assert(indexHtml.includes(`>v${expectedVersion}</span>`), `index.html #appVersionBadge does not match v${expectedVersion}`);

// Extract all local CSS and JS asset references from index.html
const localAssetRegex = /(?:src|href)="((?:js|data|assets\/css)\/[^"?]+\.(?:js|css))(?:\?v=([^"]*))?"/g;
const localScripts = [];
const staleVersionTags = [];
let assetMatch;
while ((assetMatch = localAssetRegex.exec(indexHtml)) !== null) {
  const relPath = assetMatch[1];
  const tagVer = assetMatch[2];
  assert(existsRel(relPath), `index.html references missing local file: ${relPath}`);
  if (tagVer !== expectedVersion) {
    staleVersionTags.push(`${relPath}?v=${tagVer || 'MISSING'}`);
  }
  if (relPath.endsWith('.js')) {
    localScripts.push(relPath);
  }
}
assert.strictEqual(
  staleVersionTags.length,
  0,
  `Stale or missing ?v=${expectedVersion} cache-bust params in index.html:\n  ` + staleVersionTags.join('\n  ')
);
console.log(`✓ [1/5] Version Sync Verified: v${expectedVersion} across VERSION.json, package.json, app.js & ${localScripts.length + 1} HTML asset tags.`);

// ---------------------------------------------------------------------------
// 2. HTML Structure, Modals & 5-Step Project Wizard Audit
// ---------------------------------------------------------------------------
for (let s = 1; s <= 5; s++) {
  assert(indexHtml.includes(`id="wizStepPill-${s}"`), `index.html missing #wizStepPill-${s}`);
  assert(indexHtml.includes(`id="wizStepContent-${s}"`), `index.html missing #wizStepContent-${s}`);
}
for (const modalId of ['bomModal', 'bomItemAccessoriesModal', 'bomReplaceItemModal', 'newProjectModal', 'projectDefaultConfirmModal']) {
  assert(indexHtml.includes(`id="${modalId}"`), `index.html missing required modal #${modalId}`);
}
const modalSlice = indexHtml.slice(indexHtml.indexOf('id="newProjectModal"'), indexHtml.indexOf('id="projectDefaultConfirmModal"'));
assert(!modalSlice.includes('peer-checked:bg-indigo-600') && !modalSlice.includes('peer-checked:bg-amber-600'), 'Uncompiled peer-checked:bg-* utility found in #newProjectModal');
console.log('✓ [2/5] HTML Structure Verified: 5-Step Project Wizard & BOM Configurator / Swap modals present.');

// ---------------------------------------------------------------------------
// 3. JavaScript Syntax Check Across Every Script in index.html
// ---------------------------------------------------------------------------
for (const relScript of localScripts) {
  const code = readUtf8(relScript);
  new vm.Script(code, { filename: relScript });
}
console.log(`✓ [3/5] JS Syntax Verified: All ${localScripts.length} local data, core, engine, renderer & tool scripts parse cleanly.`);

// ---------------------------------------------------------------------------
// 4. Headless VM Boot, CatalogRegistry & Asset File Existence Audit
// ---------------------------------------------------------------------------
const elementsById = new Map();
function makeEl(id, tag = 'div') {
  const el = {
    id,
    tagName: tag.toUpperCase(),
    innerHTML: '',
    innerText: '',
    textContent: '',
    value: '',
    checked: false,
    style: {},
    dataset: {},
    className: '',
    classList: {
      _set: new Set(['hidden']),
      add(...cls) { cls.forEach(c => this._set.add(c)); },
      remove(...cls) { cls.forEach(c => this._set.delete(c)); },
      contains(c) { return this._set.has(c); },
      toggle(c) { if (this._set.has(c)) this._set.delete(c); else this._set.add(c); }
    },
    appendChild(child) { if (child && child.id) elementsById.set(child.id, child); return child; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {},
    removeEventListener() {},
    setAttribute(k, v) { this[k] = v; },
    getAttribute(k) { return this[k] || null; }
  };
  if (id) elementsById.set(id, el);
  return el;
}

['bomModal', 'bomItemsList', 'bomLocationFilter', 'bomCountBadge', 'bomItemAccessoriesModal', 'bomReplaceItemModal'].forEach(id => makeEl(id));
elementsById.get('bomModal').classList.remove('hidden');

const sandbox = {
  console,
  setTimeout: () => 0,
  clearTimeout: () => {},
  setInterval: () => 0,
  clearInterval: () => {},
  Math, Date, JSON, Array, Object, Map, Set, Number, String, Boolean, RegExp,
  parseInt, parseFloat, isNaN, encodeURIComponent, decodeURIComponent,
  localStorage: {
    _s: {},
    getItem(k) { return this._s[k] || null; },
    setItem(k, v) { this._s[k] = String(v); },
    removeItem(k) { delete this._s[k]; }
  },
  document: {
    body: makeEl('body', 'body'),
    getElementById(id) { return elementsById.get(id) || null; },
    createElement(tag) { return makeEl('', tag); },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {}
  },
  escapeHTML: (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
  escapeJSAttr: (s) => String(s ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'"),
  showToast: (msg) => { sandbox._lastToast = msg; },
  updateProjectHealthUI: () => {},
  globalSelectedTerm: '3YR',
  comparisonList: [],
  checkSwitchMultiGig: (sw) => /2\.5G|5G|mGig/i.test(`${sw?.portSpeed || ''} ${sw?.portFormFactorSummary || ''}`),
  projectBOM: [],
  topologyLinks: [],
  facilityFloors: [{ id: 'fl-1', name: 'Floor 1', nodes: [] }]
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
const ctx = vm.createContext(sandbox);

// Boot data, core, engine, renderer & core engineering tools in exact load order
const bootScripts = localScripts.filter(s =>
  s.startsWith('data/') ||
  s === 'js/core/storage.js' ||
  s === 'js/core/facility.js' ||
  s === 'js/engines/device_taxonomy.js' ||
  s === 'js/engines/port_engine.js' ||
  s === 'js/engines/sizer_network.js' ||
  s === 'js/engines/search_filter.js' ||
  s === 'js/renderers/render_cards.js' ||
  s === 'js/tools/topology.js' ||
  s === 'js/tools/rack.js' ||
  s === 'js/tools/bom.js'
);

for (const rel of bootScripts) {
  vm.runInContext(readUtf8(rel), ctx, { filename: rel });
}
vm.runInContext('CatalogRegistry.init();', ctx);

const catalogAssets = ctx.window.CATALOG_ASSETS || {};
const hasDatasheetsDir = existsRel('Datasheets');
const missingImages = [];
const missingDatasheets = [];
for (const [key, entry] of Object.entries(catalogAssets)) {
  if (!entry) continue;
  if (entry.image && !existsRel(entry.image)) {
    missingImages.push(`${key} -> ${entry.image}`);
  }
  if (hasDatasheetsDir && entry.datasheetPath && !existsRel(entry.datasheetPath)) {
    missingDatasheets.push(`${key} -> ${entry.datasheetPath}`);
  }
}
assert.strictEqual(missingImages.length, 0, `Missing WebP product images (${missingImages.length}):\n  ` + missingImages.slice(0, 15).join('\n  '));
assert.strictEqual(missingDatasheets.length, 0, `Missing PDF datasheets (${missingDatasheets.length}):\n  ` + missingDatasheets.slice(0, 15).join('\n  '));
console.log(`✓ [4/5] Catalog & Assets Verified: ${Object.keys(catalogAssets).length} CATALOG_ASSETS entries (${hasDatasheetsDir ? 'WebP + PDF' : 'WebP'} 100% present on disk).`);

// ---------------------------------------------------------------------------
// 5. Core Engineering Regression Suite (Stacking, StackPower, 48P, PSUs, Swap)
// ---------------------------------------------------------------------------
vm.runInContext(`
  const assert = (cond, msg) => { if (!cond) throw new Error('REGRESSION FAILURE: ' + msg); };

  // 5A. Zero unvendored networking accessories & Cisco/Meraki shared accessory filtering
  const netAccs = CatalogRegistry.networking.accessories;
  const unvendored = netAccs.filter(a => !a.vendor);
  assert(unvendored.length === 0, 'Expected 0 unvendored networking accessories, found ' + unvendored.length);

  const ciscoFiltered = FilterEngine.apply('accessories', netAccs, { selectedAccVendors: ['Cisco'], searchQuery: '' });
  const ciscoSkus = new Set(ciscoFiltered.map(a => a.sku));
  for (const sku of ['PWR-C1-1100WAC-P-M-O', 'PWR-C1-1900WAC-P-M-O', 'PWR-C1-1100WAC-P-M', 'PWR-C1-1900WAC-P-M', 'C9300-NM-8X-M', 'C9300-NM-2Q-M', 'CAB-SPWR-30CM-M', '4PT-KIT-T1-M', 'C9300-NM-BLANK=']) {
    assert(ciscoSkus.has(sku), 'Cisco FilterEngine missing accessory ' + sku);
  }

  // 5B. Stacking > 2 Switches -> 1st & Last Only Uplink Modules + Dual-LAG Diversity
  projectBOM.length = 0;
  addToProjectBOM('meraki-ms450-12', 'MDF • Rack-1', 1, true);
  const coreSw = projectBOM.find(i => !i.parentInstanceId && i.sku === 'MS450-12-HW');
  addToProjectBOM('c9300-48p-m', 'IDF-1 • Rack-1', 1, true);
  const accSw = projectBOM.find(i => !i.parentInstanceId && i.sku === 'C9300-48P-M');
  changeBomUplinkModule(accSw.instanceId, 'C9300-NM-8X-M');
  updateStackedCount(accSw.instanceId, 4);

  const sled = projectBOM.find(i => i.parentInstanceId === accSw.instanceId && i.role === 'Uplink Module');
  assert(sled && sled.qty === 2, '4-switch stack must quote 2x Uplink Modules (1st & Last), got ' + (sled && sled.qty));
  const modUnits = Array.from(new Set(accSw.physicalPorts.filter(p => p.isUplink && p.isModular).map(p => p.unitIndex))).sort();
  assert(JSON.stringify(modUnits) === '[1,4]', 'Modular uplink ports must populate on Unit 1 & Unit 4 only');

  accSw.uplinkTargetId = coreSw.instanceId;
  accSw.customLinkMultiplier = 2;
  PortEngine.syncAllSwitchPorts();
  const activeUpUnits = accSw.physicalPorts.filter(p => p.isUplink && p.linkStatus === 'up').map(p => p.unitIndex).sort();
  assert(JSON.stringify(activeUpUnits) === '[1,4]', 'Dual-LAG uplinks must land on Unit 1 & Unit 4');

  // 5C. Cisco StackPower Closed-Ring Sizing (4-switch single ring & 6-switch dual 3+3 rings)
  const spwr4 = projectBOM.filter(i => i.parentInstanceId === accSw.instanceId && i.role === 'StackPower Cable');
  assert(spwr4.reduce((s, r) => s + r.qty, 0) === 4, '4-switch C9300 stack must quote 4 StackPower cables');
  updateStackedCount(accSw.instanceId, 6);
  const spwr6 = projectBOM.filter(i => i.parentInstanceId === accSw.instanceId && i.role === 'StackPower Cable');
  assert(spwr6.reduce((s, r) => s + r.qty, 0) === 6 && spwr6.find(r => r.sku === 'CAB-SPWR-150CM-M')?.qty === 2, '6-switch stack must split into 2 closed 3-switch StackPower rings');
  updateStackedCount(accSw.instanceId, 4);

  // 5D. 48P Sandwich Patch Panels (2x 24P Outer Caps + (N-1)x 48P In-Between) & 24P Offset Port Handling
  setBomItemPatchPanelOptions(accSw.instanceId, 'between_stack', 'auto');
  const btwnPP = projectBOM.find(i => i.parentInstanceId === accSw.instanceId && i.source === 'stack_patch_panel');
  assert(btwnPP && btwnPP.sku === 'PP-1U-48P-MOD' && btwnPP.qty === 3 && getRackItemHeight(accSw) === 7, 'Between-stack 48P panels must be 3x PP-1U-48P-MOD (7U)');

  setBomItemPatchPanelOptions(accSw.instanceId, 'standard_pod', 'auto');
  const podOuter24 = projectBOM.find(i => i.parentInstanceId === accSw.instanceId && i.source === 'switch_standard_pod' && i.sku === 'PP-1U-24P-MOD');
  const podInner48 = projectBOM.find(i => i.parentInstanceId === accSw.instanceId && i.source === 'switch_standard_pod' && i.sku === 'PP-1U-48P-MOD');
  assert(podOuter24 && podOuter24.qty === 2 && podInner48 && podInner48.qty === 3 && getRackItemHeight(accSw) === 9, '4-stack 48P Sandwich Pod must quote 2x 24P outer + 3x 48P in-between (9U)');

  // Standalone 48P -> 2x 24P (Above & Below = 3U)
  addToProjectBOM('c9350-48p', 'IDF-1 • Rack-1', 1, true);
  const solo48 = projectBOM.find(i => !i.parentInstanceId && i.sku === 'C9350-48P');
  setBomItemPatchPanelOptions(solo48.instanceId, 'standard_pod', 'auto');
  const solo24 = projectBOM.find(i => i.parentInstanceId === solo48.instanceId && i.source === 'switch_standard_pod' && i.sku === 'PP-1U-24P-MOD');
  const solo48PP = projectBOM.find(i => i.parentInstanceId === solo48.instanceId && i.source === 'switch_standard_pod' && i.sku === 'PP-1U-48P-MOD');
  assert(solo24 && solo24.qty === 2 && !solo48PP && getRackItemHeight(solo48) === 3, 'Standalone 48P Sandwich Pod must quote 2x 24P above & below (3U)');
  projectBOM = projectBOM.filter(i => i.instanceId !== solo48.instanceId && i.parentInstanceId !== solo48.instanceId);

  // 24P Offset Switch (Cisco 24P Left-Offset -> 12x 6in + 12x 1ft; Half-Frame -> 1x 48P + 24x 6in)
  addToProjectBOM('c9300-24p-m', 'IDF-1 • Rack-1', 1, true);
  const sw24 = projectBOM.find(i => !i.parentInstanceId && i.sku === 'C9300-24P-M');
  assert(resolveSwitch24PortOffset(sw24).side === 'left', 'Cisco 24P must auto-detect left port offset');
  setBomItemPatchPanelOptions(sw24.instanceId, 'standard_pod', 'auto');
  const c6in = projectBOM.find(i => i.parentInstanceId === sw24.instanceId && i.source === 'switch_standard_pod' && i.lengthFt === 0.5);
  const c1ft = projectBOM.find(i => i.parentInstanceId === sw24.instanceId && i.source === 'switch_standard_pod' && i.lengthFt === 1);
  assert(c6in && c6in.qty === 12 && c1ft && c1ft.qty === 12, 'Left-offset 24P pod must split into 12x 6-inch + 12x 1-foot cords');
  setBomItem24PortOffsetOptions(sw24.instanceId, undefined, 'offset_48p_frame');
  const hf48 = projectBOM.find(i => i.parentInstanceId === sw24.instanceId && i.source === 'switch_standard_pod' && i.sku === 'PP-1U-48P-MOD');
  const hfCords = projectBOM.find(i => i.parentInstanceId === sw24.instanceId && i.source === 'switch_standard_pod' && i.lengthFt === 0.5);
  assert(hf48 && hf48.qty === 1 && hfCords && hfCords.qty === 24, '24P offset_48p_frame must quote 1x PP-1U-48P-MOD + 24x 6-inch cords');
  projectBOM = projectBOM.filter(i => i.instanceId !== sw24.instanceId && i.parentInstanceId !== sw24.instanceId);

  // 5E. Multi-PSU PoE Budget Matrix & In-Place Hardware Swap
  applyBomItemPsuConfig(accSw.instanceId, { primaryPsuSku: 'PWR-C1-1100WAC-P-M-O', secondaryPsuSku: 'none', silent: true });
  assert(accSw.poeBudget === 822, 'C9300-48P-M w/ 1100W -O must yield 822W PoE');
  applyBomItemPsuConfig(accSw.instanceId, { primaryPsuSku: 'PWR-C1-715WAC-P-M', secondaryPsuSku: 'PWR-C1-1100WAC-P-M', silent: true });
  assert(accSw.poeBudget === 1440, 'C9300-48P-M w/ 715W + 1100W must yield 1440W PoE');

  accSw.rackSlot = 10;
  DeviceTaxonomy.setFriendlyName(accSw, 'IDF-1 Main Access Stack');
  const origId = accSw.instanceId;
  projectBOM.push({
    instanceId: 'cam-verify-1',
    id: CAMERAS_DATABASE[0].id,
    sku: CAMERAS_DATABASE[0].sku,
    model: CAMERAS_DATABASE[0].model,
    vendor: CAMERAS_DATABASE[0].vendor,
    role: 'Camera',
    category: 'cameras',
    msrp: 500,
    powerConsumptionWatts: 12,
    poeStandard: '802.3af',
    qty: 1,
    closetName: 'IDF-1 • Rack-1',
    rackId: 'IDF-1 • Rack-1',
    uplinkTargetId: origId,
    assignedSwitchPort: 35
  });
  PortEngine.syncAllSwitchPorts();

  replaceBomHardwareItem(origId, 'c9350-48p');
  const swapped = projectBOM.find(i => i.instanceId === origId);
  assert(swapped && swapped.sku === 'C9350-48P' && swapped.rackSlot === 10 && swapped.stackedUnits === 4, 'In-place swap must preserve instanceId, rackSlot & stack size');
  assert(swapped.friendlyName === 'IDF-1-Main-Access-Stack', 'In-place swap must preserve custom friendly name');
  const port35 = swapped.physicalPorts.find(p => p.portNumber === 35 && !p.isUplink);
  assert(port35 && port35.connectedDeviceId === 'cam-verify-1', 'In-place swap must preserve connected camera on Port 35');
`, ctx);

console.log('✓ [5/5] Engineering Regression Suite Passed: Stacking, StackPower, 48P Panels, PSU PoE Matrix & In-Place Swap verified.');
console.log('==================================================================');
console.log('ALL PRE-DEPLOY CHECKS PASSED');
console.log('==================================================================');
