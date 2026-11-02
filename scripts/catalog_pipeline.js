#!/usr/bin/env node
/**
 * OSS Design Tool — Scalable Catalog & Datasheet Ingestion Pipeline
 *
 * Commands:
 *   node scripts/catalog_pipeline.js audit [--json]
 *   node scripts/catalog_pipeline.js auto-link [--apply]
 *   node scripts/catalog_pipeline.js validate <json_file_or_string>
 *   node scripts/catalog_pipeline.js ingest <batch_json_file> [--dry-run] [--allow-update]
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

const DATA_FILES_IN_ORDER = [
  'data/data_assets.js',
  'data/compute_storage/data_servers.js',
  'data/infrastructure/data_accessories.js',
  'data/infrastructure/data_cabling.js',
  'data/networking/data_allied.js',
  'data/networking/data_amg.js',
  'data/networking/data_cisco.js',
  'data/networking/data_firewalls.js',
  'data/networking/data_interconnects.js',
  'data/networking/data_juniper.js',
  'data/networking/data_meraki.js',
  'data/networking/data_ruckus.js',
  'data/networking/data_unifi.js',
  'data/networking/data_wireless.js',
  'data/physical_security/data_access.js',
  'data/physical_security/data_cameras.js',
  'data/registry.js'
];

function walkFiles(relDir, ext) {
  const absDir = path.join(ROOT, relDir);
  if (!fs.existsSync(absDir)) return [];
  const results = [];
  function recurse(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        recurse(full);
      } else if (!ext || entry.name.toLowerCase().endsWith(ext.toLowerCase())) {
        results.push(path.relative(ROOT, full).split(path.sep).join('/'));
      }
    }
  }
  recurse(absDir);
  return results.sort();
}

function loadCatalogContext() {
  const sandbox = {
    console: { info() {}, log() {}, warn() {}, error() {} },
    window: {}
  };
  sandbox.globalThis = sandbox;
  sandbox.window = sandbox;
  const ctx = vm.createContext(sandbox);
  for (const rel of DATA_FILES_IN_ORDER) {
    const full = path.join(ROOT, rel);
    if (fs.existsSync(full)) {
      vm.runInContext(fs.readFileSync(full, 'utf8'), ctx, { filename: rel });
    }
  }
  vm.runInContext('CatalogRegistry.init();', ctx);
  return {
    ctx,
    registry: ctx.window.CatalogRegistry,
    assets: ctx.window.CATALOG_ASSETS || {}
  };
}

function parseCatalogAssetsFile() {
  const fullPath = path.join(ROOT, 'data/data_assets.js');
  const content = fs.readFileSync(fullPath, 'utf8');
  const match = content.match(/const\s+CATALOG_ASSETS\s*=\s*(\{[\s\S]*?\n\});?/);
  if (!match) {
    throw new Error('Could not locate const CATALOG_ASSETS = { ... } in data/data_assets.js');
  }
  const objText = match[1];
  const parsed = JSON.parse(objText);
  const startIdx = match.index + match[0].indexOf(objText);
  const endIdx = startIdx + objText.length;
  return { fullPath, content, parsed, startIdx, endIdx };
}

function writeCatalogAssetsFile(fileInfo, updatedAssets) {
  const sortedKeys = Object.keys(updatedAssets)
    .filter(k => updatedAssets[k] && (updatedAssets[k].datasheetPath || updatedAssets[k].image))
    .sort((a, b) => {
      const cmp = a.toLowerCase().localeCompare(b.toLowerCase());
      return cmp !== 0 ? cmp : a.localeCompare(b);
    });

  const lines = ['{'];
  sortedKeys.forEach((key, idx) => {
    const entry = updatedAssets[key];
    const comma = idx < sortedKeys.length - 1 ? ',' : '';
    lines.push(`    ${JSON.stringify(key)}: {`);
    const props = [];
    if (entry.datasheetPath) {
      props.push(`        "datasheetPath": ${JSON.stringify(entry.datasheetPath)}`);
    }
    if (entry.image) {
      props.push(`        "image": ${JSON.stringify(entry.image)}`);
    }
    lines.push(props.join(',\n'));
    lines.push(`    }${comma}`);
  });
  lines.push('}');

  const newObjText = lines.join('\n');
  const newContent = (fileInfo.content.slice(0, fileInfo.startIdx) + newObjText + fileInfo.content.slice(fileInfo.endIdx)).replace(/\r\n/g, '\n');
  fs.writeFileSync(fileInfo.fullPath, newContent, 'utf8');
}

function resolveTargetDatabase(item) {
  if (item._targetFile && item._targetVar) {
    return { file: item._targetFile, varName: item._targetVar };
  }
  const cat = String(item.category || '').toLowerCase();
  const role = String(item.role || '').toLowerCase();
  const type = String(item.type || '').toLowerCase();
  const vendor = String(item.vendor || '').toLowerCase();

  if (cat === 'cameras' || role === 'camera') {
    return { file: 'data/physical_security/data_cameras.js', varName: 'CAMERAS_DATABASE' };
  }
  if (cat === 'access_control' || cat.includes('access') || role.includes('lock') || role.includes('access')) {
    return { file: 'data/physical_security/data_access.js', varName: 'ACCESS_CONTROL_DATABASE' };
  }
  if (cat === 'firewall' || cat === 'firewalls' || role === 'firewall') {
    return { file: 'data/networking/data_firewalls.js', varName: 'FIREWALL_DATABASE' };
  }
  if (cat.startsWith('ptp') || cat.startsWith('ptmp') || cat === 'wireless' || role.includes('wireless') || role.includes('bridge')) {
    return { file: 'data/networking/data_wireless.js', varName: 'WIRELESS_DATABASE' };
  }
  if (cat === 'servers' || role === 'server' || role === 'nvr' || type === 'server') {
    return { file: 'data/compute_storage/data_servers.js', varName: 'SERVERS_DATABASE' };
  }
  if (cat === 'workstations' || role === 'workstation' || type === 'workstation') {
    return { file: 'data/compute_storage/data_servers.js', varName: 'WORKSTATIONS_DATABASE' };
  }
  if (cat === 'networking' || role === 'access' || role === 'core' || role === 'aggregation' || role.includes('switch')) {
    if (vendor.includes('unifi') || vendor.includes('ubiquiti')) return { file: 'data/networking/data_unifi.js', varName: 'UNIFI_SWITCHES' };
    if (vendor.includes('meraki')) return { file: 'data/networking/data_meraki.js', varName: 'MERAKI_SWITCHES' };
    if (vendor.includes('cisco')) return { file: 'data/networking/data_cisco.js', varName: 'CISCO_SWITCHES' };
    if (vendor.includes('juniper')) return { file: 'data/networking/data_juniper.js', varName: 'JUNIPER_SWITCHES' };
    if (vendor.includes('ruckus')) return { file: 'data/networking/data_ruckus.js', varName: 'RUCKUS_SWITCHES' };
    if (vendor.includes('amg')) return { file: 'data/networking/data_amg.js', varName: 'AMG_SWITCHES' };
    if (vendor.includes('allied')) return { file: 'data/networking/data_allied.js', varName: 'ALLIED_SWITCHES' };
  }
  return { file: 'data/infrastructure/data_accessories.js', varName: 'ACCESSORY_DATABASE' };
}

function validateEntry(item, registry, assetsMap, allowUpdate = false) {
  const errors = [];
  const warnings = [];
  const info = [];

  const requiredBase = ['id', 'vendor', 'model', 'sku', 'role', 'category', 'msrp'];
  for (const field of requiredBase) {
    if (item[field] === undefined || item[field] === null || String(item[field]).trim() === '') {
      errors.push(`Missing required base field: '${field}'`);
    }
  }

  const itemId = String(item.id || '').trim();
  const itemSku = String(item.sku || '').trim();
  const category = String(item.category || '').toLowerCase();
  const role = String(item.role || '').toLowerCase();
  const model = String(item.model || '');

  if (registry && !allowUpdate) {
    if (itemId && registry._byId.has(itemId)) {
      warnings.push(`ID '${itemId}' already exists in CatalogRegistry (use --allow-update to overwrite)`);
    }
    if (itemSku && registry._bySku.has(itemSku)) {
      warnings.push(`SKU '${itemSku}' already exists in CatalogRegistry (use --allow-update to overwrite)`);
    }
  }

  // Domain & DRC checks
  if (category === 'cameras' || role === 'camera' || model.toLowerCase().includes('camera')) {
    if (!item.poeStandard) {
      errors.push("Camera missing 'poeStandard' ('802.3af', '802.3at', '802.3bt')");
    } else if (!['802.3af', '802.3at', '802.3bt'].includes(item.poeStandard)) {
      warnings.push(`Unrecognized poeStandard '${item.poeStandard}'`);
    }
    const watts = item.powerConsumptionWatts || item.baseWatts || 0;
    const maxWatts = item.maxPowerWatts || watts;
    const isOutdoor = item.outdoor === true || item.isOutdoor === true || /ip66|ip67|outdoor/i.test(`${item.ipRating || ''} ${model}`);
    if (isOutdoor && maxWatts > 30) {
      info.push(`DRC Rule 12: Outdoor device drawing ${maxWatts}W (>30W 802.3bt) mandates 802.3bt surge protector`);
    }
    if (isOutdoor) {
      info.push('DRC Rule 9: Outdoor camera requires Cat6A OSP gel-filled cable in exterior pathways');
    }
  } else if (category === 'access_control' || category.includes('access') || role.includes('lock')) {
    const secLevel = item.securityLevel;
    const isMaglock = model.toLowerCase().includes('maglock') || item.lockType === 'maglock';
    if (secLevel === 3 && isMaglock) {
      errors.push('DRC Rule 11 & NFPA 101 Violation: Maglocks are prohibited on Security Level 3 openings');
    }
  } else if (category === 'networking' || role.includes('switch') || model.toLowerCase().includes('switch')) {
    if (item.ports === undefined) warnings.push("Switch missing 'ports' count");
    if (item.poeBudget === undefined && /poe/i.test(model)) {
      warnings.push("PoE switch missing 'poeBudget' in Watts (DRC Rule 2)");
    }
    if (item.dualPowerSupply || item.dualPsu) {
      info.push('DRC Rule 14: Dual PSU switch requires Circuit A / UPS A and Circuit B / UPS B feeds');
    }
  } else if (role === 'ups' || category === 'ups') {
    if ((item.va || 0) >= 3000) {
      info.push(`DRC Rule 8A: High-capacity UPS (${item.va}VA) requires dedicated 30A locking circuit`);
    }
  }

  // Asset check
  const dsPath = item.datasheetPath || item.datasheet || (assetsMap[itemId] && assetsMap[itemId].datasheetPath) || (assetsMap[itemSku] && assetsMap[itemSku].datasheetPath);
  const imgPath = item.image || (assetsMap[itemId] && assetsMap[itemId].image) || (assetsMap[itemSku] && assetsMap[itemSku].image) || `assets/images/products/${itemId}.webp`;

  if (dsPath) {
    if (!fs.existsSync(path.join(ROOT, dsPath))) {
      errors.push(`Datasheet PDF not found on disk: ${dsPath}`);
    } else {
      info.push(`Datasheet verified: ${dsPath}`);
    }
  } else {
    warnings.push(`No datasheetPath linked for ${itemId} (${itemSku})`);
  }

  if (imgPath) {
    if (!fs.existsSync(path.join(ROOT, imgPath))) {
      warnings.push(`Product WebP image not found on disk: ${imgPath}`);
    } else {
      info.push(`Product image verified: ${imgPath}`);
    }
  }

  return { valid: errors.length === 0, errors, warnings, info };
}

function computeAutoLinks(registry, assets, diskPdfs, diskWebps) {
  const newAssetUpdates = [];
  const pdfMatches = [];
  const webpMatches = [];

  const webpByBase = new Map(diskWebps.map(w => [path.basename(w, '.webp').toLowerCase(), w]));

  for (const [id, item] of registry._byId.entries()) {
    if (!item) continue;
    const itemId = String(item.id || '').trim();
    const itemSku = String(item.sku || '').trim();
    if (itemId.startsWith('gen-cam-')) continue; // Skip generic placeholders

    const existingIdAsset = itemId ? assets[itemId] : null;
    const existingSkuAsset = itemSku ? assets[itemSku] : null;

    let resolvedDs = item.datasheetPath || item.datasheet || (existingIdAsset && existingIdAsset.datasheetPath) || (existingSkuAsset && existingSkuAsset.datasheetPath) || '';
    let resolvedImg = item.image || (existingIdAsset && existingIdAsset.image) || (existingSkuAsset && existingSkuAsset.image) || '';

    // Verify physical existence on disk
    if (resolvedDs && !fs.existsSync(path.join(ROOT, resolvedDs))) resolvedDs = '';
    if (resolvedImg && !fs.existsSync(path.join(ROOT, resolvedImg))) resolvedImg = '';

    // Try matching missing WebP image on disk by ID or SKU
    if (!resolvedImg) {
      const candidates = [
        itemId.toLowerCase(),
        itemSku.toLowerCase(),
        itemId.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        itemId.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
        itemSku.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        itemSku.toLowerCase().replace(/[^a-z0-9]+/g, '_')
      ];
      for (const cand of candidates) {
        if (cand && webpByBase.has(cand)) {
          resolvedImg = webpByBase.get(cand);
          webpMatches.push({ id: itemId, sku: itemSku, image: resolvedImg });
          break;
        }
      }
    }

    // Try matching missing Datasheet PDF on disk by exact SKU/model token
    if (!resolvedDs && itemSku.length >= 5) {
      const skuNorm = itemSku.toLowerCase().replace(/[^a-z0-9]/g, '');
      for (const pdf of diskPdfs) {
        const baseNorm = path.basename(pdf, '.pdf').toLowerCase().replace(/[^a-z0-9]/g, '');
        if (baseNorm.includes(skuNorm)) {
          resolvedDs = pdf;
          pdfMatches.push({ id: itemId, sku: itemSku, datasheetPath: resolvedDs });
          break;
        }
      }
    }

    if (resolvedDs || resolvedImg) {
      for (const key of [itemId, itemSku]) {
        if (!key) continue;
        const curr = assets[key] || {};
        const nextDs = curr.datasheetPath || resolvedDs || '';
        const nextImg = curr.image || resolvedImg || '';
        if (nextDs !== (curr.datasheetPath || '') || nextImg !== (curr.image || '')) {
          assets[key] = {
            ...(nextDs ? { datasheetPath: nextDs } : {}),
            ...(nextImg ? { image: nextImg } : {})
          };
          newAssetUpdates.push({
            key,
            id: itemId,
            sku: itemSku,
            datasheetPath: nextDs,
            image: nextImg
          });
        }
      }
    }
  }

  return { newAssetUpdates, pdfMatches, webpMatches };
}

function upsertItemsIntoJsFile(relFile, varName, itemsToUpsert) {
  const fullPath = path.join(ROOT, relFile);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Target catalog file not found: ${relFile}`);
  }
  let content = fs.readFileSync(fullPath, 'utf8').replace(/\r\n/g, '\n');

  // Locate variable declaration: const <varName> = [
  const declRegex = new RegExp(`(const|let|var)\\s+${varName}\\s*=\\s*\\[`);
  const declMatch = declRegex.exec(content);
  if (!declMatch) {
    throw new Error(`Could not find array declaration '${varName} = [' in ${relFile}`);
  }

  // Find matching closing bracket ]; for this array
  const openBracketIdx = declMatch.index + declMatch[0].length - 1;
  let depth = 0;
  let inString = false;
  let stringChar = '';
  let escaped = false;
  let inLineComment = false;
  let inBlockComment = false;
  let closeBracketIdx = -1;

  for (let i = openBracketIdx; i < content.length; i++) {
    const ch = content[i];
    const next = content[i + 1];

    if (inLineComment) {
      if (ch === '\n') inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false;
        i++;
      }
      continue;
    }
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === stringChar) {
        inString = false;
      }
      continue;
    }
    if (ch === '/' && next === '/') {
      inLineComment = true;
      i++;
      continue;
    }
    if (ch === '/' && next === '*') {
      inBlockComment = true;
      i++;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      inString = true;
      stringChar = ch;
      continue;
    }
    if (ch === '[') depth++;
    else if (ch === ']') {
      depth--;
      if (depth === 0) {
        closeBracketIdx = i;
        break;
      }
    }
  }

  if (closeBracketIdx === -1) {
    throw new Error(`Could not find closing ']' for ${varName} in ${relFile}`);
  }

  const formattedItems = itemsToUpsert.map(item => {
    const cleanCopy = { ...item };
    delete cleanCopy._targetFile;
    delete cleanCopy._targetVar;
    delete cleanCopy.altKeys;
    return '  ' + JSON.stringify(cleanCopy, null, 2).replace(/\n/g, '\n  ');
  }).join(',\n');

  // Check if array already has elements before closeBracketIdx
  const beforeClose = content.slice(openBracketIdx + 1, closeBracketIdx).trimEnd();
  const needsComma = beforeClose.length > 0 && !beforeClose.endsWith(',');
  const prefix = content.slice(0, openBracketIdx + 1) + beforeClose + (needsComma ? ',\n' : '\n');
  const suffix = '\n' + content.slice(closeBracketIdx);

  fs.writeFileSync(fullPath, prefix + formattedItems + suffix, 'utf8');
}

function runCommandAudit(asJson = false) {
  const { registry, assets } = loadCatalogContext();
  const diskPdfs = walkFiles('Datasheets', '.pdf');
  const diskWebps = walkFiles('assets/images/products', '.webp');

  const linkedPdfsInAssets = new Set(Object.values(assets).map(a => a && a.datasheetPath).filter(Boolean));
  const allLinkedPdfs = new Set(linkedPdfsInAssets);
  for (const [, item] of registry._byId.entries()) {
    if (item.datasheetPath) allLinkedPdfs.add(item.datasheetPath);
    if (item.datasheet) allLinkedPdfs.add(item.datasheet);
  }

  const unlinkedPdfs = diskPdfs.filter(p => !allLinkedPdfs.has(p));
  const missingDatasheetDevices = [];
  const missingImageDevices = [];

  for (const [, item] of registry._byId.entries()) {
    if (!item || String(item.id || '').startsWith('gen-cam-')) continue;
    if (!item.datasheetPath) {
      missingDatasheetDevices.push({ id: item.id, sku: item.sku, vendor: item.vendor, model: item.model, category: item.category });
    }
    if (!item.image) {
      missingImageDevices.push({ id: item.id, sku: item.sku, vendor: item.vendor, model: item.model, category: item.category });
    }
  }

  const { newAssetUpdates, pdfMatches, webpMatches } = computeAutoLinks(registry, assets, diskPdfs, diskWebps);

  // Group unlinked PDFs by folder
  const unlinkedByFolder = {};
  for (const pdf of unlinkedPdfs) {
    const dir = path.dirname(pdf);
    if (!unlinkedByFolder[dir]) unlinkedByFolder[dir] = [];
    unlinkedByFolder[dir].push(path.basename(pdf));
  }

  const report = {
    totalCatalogDevices: registry._byId.size,
    totalCatalogSkus: registry._bySku.size,
    totalCatalogAssetsKeys: Object.keys(assets).length,
    diskPdfsCount: diskPdfs.length,
    diskWebpsCount: diskWebps.length,
    linkedUniquePdfsCount: allLinkedPdfs.size,
    unlinkedPdfsCount: unlinkedPdfs.length,
    devicesMissingDatasheetCount: missingDatasheetDevices.length,
    devicesMissingImageCount: missingImageDevices.length,
    autoLinkableAssetKeysCount: newAssetUpdates.length,
    autoMatchedPdfsCount: pdfMatches.length,
    autoMatchedWebpsCount: webpMatches.length,
    unlinkedByFolder
  };

  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log('==================================================================');
  console.log('OSS Design Tool — Catalog & Datasheet Coverage Audit');
  console.log('==================================================================');
  console.log(`• Indexed Catalog Devices : ${report.totalCatalogDevices} unique IDs (${report.totalCatalogSkus} SKUs)`);
  console.log(`• CATALOG_ASSETS Registry : ${report.totalCatalogAssetsKeys} keys`);
  console.log(`• Disk Assets             : ${report.diskPdfsCount} PDFs in Datasheets/, ${report.diskWebpsCount} WebPs in assets/images/products/`);
  console.log(`• Linked Unique PDFs      : ${report.linkedUniquePdfsCount} linked / ${report.unlinkedPdfsCount} unlinked on disk`);
  console.log(`• Missing Device Links    : ${report.devicesMissingDatasheetCount} missing datasheetPath, ${report.devicesMissingImageCount} missing image (excl. generic placeholders)`);
  console.log(`• Auto-Linkable Now       : ${report.autoLinkableAssetKeysCount} CATALOG_ASSETS keys ready to sync`);
  console.log('\nUnlinked PDFs on Disk by Folder:');
  for (const [folder, files] of Object.entries(unlinkedByFolder)) {
    console.log(`  - ${folder} (${files.length} PDFs)`);
  }
}

function runCommandAutoLink(apply = false) {
  const { registry, assets } = loadCatalogContext();
  const diskPdfs = walkFiles('Datasheets', '.pdf');
  const diskWebps = walkFiles('assets/images/products', '.webp');

  const { newAssetUpdates, pdfMatches, webpMatches } = computeAutoLinks(registry, assets, diskPdfs, diskWebps);

  console.log(`Found ${newAssetUpdates.length} CATALOG_ASSETS key updates (${pdfMatches.length} PDF matches, ${webpMatches.length} WebP matches, plus inline asset syncs).`);
  if (!apply) {
    console.log('Run with --apply to write updates to data/data_assets.js.');
    return;
  }

  if (newAssetUpdates.length === 0) {
    console.log('data/data_assets.js is already 100% in sync.');
    return;
  }

  const fileInfo = parseCatalogAssetsFile();
  const updatedAssets = { ...fileInfo.parsed };
  for (const upd of newAssetUpdates) {
    const existing = updatedAssets[upd.key] || {};
    updatedAssets[upd.key] = {
      ...(upd.datasheetPath || existing.datasheetPath ? { datasheetPath: upd.datasheetPath || existing.datasheetPath } : {}),
      ...(upd.image || existing.image ? { image: upd.image || existing.image } : {})
    };
  }

  writeCatalogAssetsFile(fileInfo, updatedAssets);
  console.log(`✓ Updated data/data_assets.js (${Object.keys(updatedAssets).length} total keys).`);
}

function loadInputPayload(inputArg) {
  const full = path.resolve(ROOT, inputArg);
  const raw = fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : inputArg;
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) {
    return { items: parsed, targetFile: null, targetVar: null };
  }
  if (parsed && Array.isArray(parsed.items)) {
    return { items: parsed.items, targetFile: parsed.targetFile || null, targetVar: parsed.targetVar || null };
  }
  return { items: [parsed], targetFile: parsed.targetFile || null, targetVar: parsed.targetVar || null };
}

function runCommandValidate(inputArg, allowUpdate = false) {
  const { registry, assets } = loadCatalogContext();
  const { items } = loadInputPayload(inputArg);

  let passed = 0;
  for (const item of items) {
    const res = validateEntry(item, registry, assets, allowUpdate);
    const status = res.valid ? 'PASS' : 'FAIL';
    console.log(`[${status}] ${item.vendor || 'Unknown'} — ${item.model || 'Unknown'} (ID: ${item.id}, SKU: ${item.sku})`);
    res.errors.forEach(e => console.log(`  ❌ ${e}`));
    res.warnings.forEach(w => console.log(`  ⚠️  ${w}`));
    res.info.forEach(i => console.log(`  ℹ️  ${i}`));
    if (res.valid) passed++;
  }

  console.log(`\nValidation Summary: ${passed}/${items.length} item(s) passed.`);
  if (passed !== items.length) process.exit(1);
}

function runCommandIngest(inputArg, dryRun = false, allowUpdate = false) {
  const { registry, assets } = loadCatalogContext();
  const { items, targetFile, targetVar } = loadInputPayload(inputArg);

  // 1. Validate all items first
  const groupedByTarget = new Map();
  const assetRegistrations = [];
  let hasErrors = false;

  for (const rawItem of items) {
    const item = { ...rawItem };
    if (targetFile) item._targetFile = targetFile;
    if (targetVar) item._targetVar = targetVar;

    const res = validateEntry(item, registry, assets, allowUpdate);
    if (!res.valid) {
      hasErrors = true;
      console.error(`[FAIL] ${item.id || item.sku}: ${res.errors.join('; ')}`);
      continue;
    }

    const target = resolveTargetDatabase(item);
    const key = `${target.file}::${target.varName}`;
    if (!groupedByTarget.has(key)) groupedByTarget.set(key, { ...target, items: [] });
    groupedByTarget.get(key).items.push(item);

    const dsPath = item.datasheetPath || item.datasheet || '';
    const imgPath = item.image || (fs.existsSync(path.join(ROOT, `assets/images/products/${item.id}.webp`)) ? `assets/images/products/${item.id}.webp` : '');
    if (dsPath || imgPath) {
      const keys = [item.id, item.sku, ...(item.altKeys || [])].filter(Boolean);
      for (const k of keys) {
        assetRegistrations.push({ key: k, datasheetPath: dsPath, image: imgPath });
      }
    }
  }

  if (hasErrors) {
    console.error('Aborting batch ingestion due to validation errors.');
    process.exit(1);
  }

  for (const group of groupedByTarget.values()) {
    console.log(`${dryRun ? '[DRY-RUN] Would append' : 'Appending'} ${group.items.length} item(s) to ${group.file} (${group.varName})`);
    if (!dryRun) {
      upsertItemsIntoJsFile(group.file, group.varName, group.items);
    }
  }

  if (assetRegistrations.length > 0) {
    console.log(`${dryRun ? '[DRY-RUN] Would register' : 'Registering'} ${assetRegistrations.length} asset key(s) in data/data_assets.js`);
    if (!dryRun) {
      const fileInfo = parseCatalogAssetsFile();
      const updatedAssets = { ...fileInfo.parsed };
      for (const reg of assetRegistrations) {
        const curr = updatedAssets[reg.key] || {};
        updatedAssets[reg.key] = {
          ...(reg.datasheetPath || curr.datasheetPath ? { datasheetPath: reg.datasheetPath || curr.datasheetPath } : {}),
          ...(reg.image || curr.image ? { image: reg.image || curr.image } : {})
        };
      }
      writeCatalogAssetsFile(fileInfo, updatedAssets);
    }
  }

  console.log(`✓ Batch ingestion complete (${items.length} device(s) processed).`);
}

// CLI Dispatcher
const args = process.argv.slice(2);
const cmd = args[0] || 'audit';

if (cmd === 'audit') {
  runCommandAudit(args.includes('--json'));
} else if (cmd === 'auto-link' || cmd === 'sync-assets') {
  runCommandAutoLink(args.includes('--apply'));
} else if (cmd === 'validate') {
  if (!args[1]) {
    console.error('Usage: node scripts/catalog_pipeline.js validate <json_file_or_string>');
    process.exit(1);
  }
  runCommandValidate(args[1], args.includes('--allow-update'));
} else if (cmd === 'ingest') {
  if (!args[1]) {
    console.error('Usage: node scripts/catalog_pipeline.js ingest <batch_json_file> [--dry-run] [--allow-update]');
    process.exit(1);
  }
  runCommandIngest(args[1], args.includes('--dry-run'), args.includes('--allow-update'));
} else {
  console.error(`Unknown command: ${cmd}. Expected: audit | auto-link | validate | ingest`);
  process.exit(1);
}
