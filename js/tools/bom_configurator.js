// =========================================================================
// POST-BOM ACCESSORIES CONFIGURATOR & IN-PLACE HARDWARE REPLACEMENT ENGINE
// Separated from js/tools/bom.js for modular maintainability
// =========================================================================

// New Post-BOM Accessories Configurator & Universal Product Replacement Engine for js/tools/bom.js

let activeBomAccessoriesInstanceId = null;
let bomAccPickerSearch = "";
let bomAccPickerShowAllVendors = false;

let activeBomReplaceInstanceId = null;
let bomReplaceSearchQuery = "";
let bomReplaceVendorFilter = "all";
let bomReplaceMatchPortsOnly = false;
let bomReplacePoeOnly = false;

function ensureBomConfiguratorModals() {
  if (typeof document === "undefined" || !document.body) return;
  if (!document.getElementById("bomItemAccessoriesModal")) {
    const m1 = document.createElement("div");
    m1.id = "bomItemAccessoriesModal";
    m1.className = "hidden fixed inset-0 z-[75] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4";
    m1.onclick = function (e) { if (e.target === m1) closeBomItemAccessoriesModal(); };
    document.body.appendChild(m1);
  }
  if (!document.getElementById("bomReplaceItemModal")) {
    const m2 = document.createElement("div");
    m2.id = "bomReplaceItemModal";
    m2.className = "hidden fixed inset-0 z-[75] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4";
    m2.onclick = function (e) { if (e.target === m2) closeReplaceBomItemModal(); };
    document.body.appendChild(m2);
  }
}

function getAllCatalogAccessoriesPool() {
  const poolMap = new Map();
  const addRec = (rec, fallbackRole) => {
    if (!rec) return;
    const sku = String(rec.sku || rec.id || "").trim();
    if (!sku || poolMap.has(sku)) return;
    poolMap.set(sku, {
      sku,
      id: rec.id || sku,
      name: rec.name || rec.model || sku,
      model: rec.model || rec.name || sku,
      vendor: rec.vendor || "Generic",
      compatibleVendors: Array.isArray(rec.compatibleVendors) ? rec.compatibleVendors : (rec.vendor ? [rec.vendor] : []),
      compatibleSeries: Array.isArray(rec.compatibleSeries) ? rec.compatibleSeries : [],
      role: rec.role || fallbackRole || rec.subcategory || "Accessory",
      category: rec.category || "Accessory",
      msrp: Number(rec.msrp) || 0,
      wattage: Number(rec.wattage || rec.powerWatts) || 0,
      rackUnits: Number(rec.rackUnits) || 0,
      weightLbs: Number(rec.weightLbs) || 0,
      depthInches: Number(rec.depthInches) || 0
    });
  };

  if (typeof POWER_SUPPLY_CATALOG !== "undefined") {
    Object.values(POWER_SUPPLY_CATALOG).forEach(r => addRec(r, r.category === "Cooling & Fans" ? "Cooling & Fans" : (r.category === "Power Cord" ? "Power Cord" : (r.category === "Stacking & Power" ? "Stacking & Power" : "Power Supply"))));
  }
  if (typeof MOUNTING_CATALOG !== "undefined") {
    Object.values(MOUNTING_CATALOG).forEach(r => addRec(r, "Mounting Hardware"));
  }
  if (typeof MODULAR_UPLINK_CATALOG !== "undefined") {
    Object.values(MODULAR_UPLINK_CATALOG).forEach(r => addRec(r, "Uplink Module"));
  }
  if (typeof FEATURE_LICENSE_CATALOG !== "undefined") {
    Object.values(FEATURE_LICENSE_CATALOG).forEach(r => addRec(r, "Feature License"));
  }
  if (typeof CatalogRegistry !== "undefined" && CatalogRegistry.networking && Array.isArray(CatalogRegistry.networking.accessories)) {
    CatalogRegistry.networking.accessories.forEach(r => addRec(r, r.subcategory || "Accessory"));
  }
  if (typeof CABLING_CATALOG !== "undefined") {
    (CABLING_CATALOG.patchPanels || []).forEach(r => addRec(r, "Structured Cabling"));
    (CABLING_CATALOG.patchCords || []).forEach(r => addRec(r, "Patch Cord"));
    (CABLING_CATALOG.fiberEnclosures || []).forEach(r => addRec(r, "Fiber Infrastructure"));
  }
  if (typeof CAMERA_ACCESSORIES_DATABASE !== "undefined" && Array.isArray(CAMERA_ACCESSORIES_DATABASE)) {
    CAMERA_ACCESSORIES_DATABASE.forEach(r => addRec(r, "Camera Mount / Accessory"));
  }
  return Array.from(poolMap.values());
}

function getCompatibleMountsForBomItem(item, catItem) {
  const vendor = (item.vendor || catItem?.vendor || "").toLowerCase();
  const skuUpper = (item.sku || item.id || "").toUpperCase();
  const mounts = [];
  const seen = new Set();

  const pushMount = (sku, obj) => {
    if (!sku || seen.has(sku)) return;
    seen.add(sku);
    mounts.push({
      sku,
      name: obj?.name || obj?.model || sku,
      msrp: Number(obj?.msrp) || 0,
      rackUnits: Number(obj?.rackUnits) || 0,
      weightLbs: Number(obj?.weightLbs) || 1.5,
      depthInches: Number(obj?.depthInches) || 0
    });
  };

  const explicitList = catItem?.compatibleMounts || item?.compatibleMounts || [];
  explicitList.forEach(mSku => {
    const m = (typeof MOUNTING_CATALOG !== "undefined" && MOUNTING_CATALOG[mSku]) ||
      (typeof POWER_SUPPLY_CATALOG !== "undefined" && POWER_SUPPLY_CATALOG[mSku]) ||
      (typeof CatalogRegistry !== "undefined" && CatalogRegistry.get(mSku));
    if (m) pushMount(mSku, m);
  });

  if (typeof MOUNTING_CATALOG !== "undefined") {
    Object.entries(MOUNTING_CATALOG).forEach(([mSku, m]) => {
      const mVendor = (m.vendor || "").toLowerCase();
      const compatVendors = (m.compatibleVendors || []).map(v => v.toLowerCase());
      const compatModels = (m.compatibleModels || []).map(x => x.toUpperCase());
      if (compatModels.includes(skuUpper) || mVendor === vendor || compatVendors.includes(vendor) || mVendor === "generic" || mVendor === "panduit") {
        pushMount(mSku, m);
      }
    });
  }

  if (typeof POWER_SUPPLY_CATALOG !== "undefined") {
    Object.entries(POWER_SUPPLY_CATALOG).forEach(([mSku, m]) => {
      const cat = (m.category || "").toLowerCase();
      if (!cat.includes("mount") && !/KIT|MNT|RM|RACK|RAIL|DIN/i.test(mSku)) return;
      if (/STAK|STACK|SPWR|PWR|FAN|CAB/i.test(mSku) && !/WMNTBR/i.test(mSku)) return;
      const mVendor = (m.vendor || "").toLowerCase();
      const compatVendors = (m.compatibleVendors || []).map(v => v.toLowerCase());
      if (mVendor === vendor || compatVendors.includes(vendor)) {
        pushMount(mSku, m);
      }
    });
  }

  return mounts;
}

function openBomItemAccessoriesModal(instanceId) {
  if (!instanceId || typeof projectBOM === "undefined") return;
  const item = projectBOM.find(i => i.instanceId === instanceId);
  if (!item) return;

  ensureBomConfiguratorModals();
  activeBomAccessoriesInstanceId = instanceId;
  bomAccPickerSearch = "";
  bomAccPickerShowAllVendors = false;

  const modal = document.getElementById("bomItemAccessoriesModal");
  if (!modal) return;
  modal.classList.remove("hidden");
  renderBomItemAccessoriesModalContent();
}

function closeBomItemAccessoriesModal() {
  const modal = document.getElementById("bomItemAccessoriesModal");
  if (modal) modal.classList.add("hidden");
  activeBomAccessoriesInstanceId = null;
}

function refreshAllViewsAfterBomConfigChange() {
  if (typeof PortEngine !== "undefined" && typeof PortEngine.syncAllSwitchPorts === "function") {
    PortEngine.syncAllSwitchPorts();
  }
  if (typeof deriveDemandFromBOM === "function") deriveDemandFromBOM(true);
  if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
    FacilityStore.notifyWorkspaceChange();
  }
  if (typeof updateBOMView === "function") updateBOMView();
  if (typeof renderRackVisualizer === "function") renderRackVisualizer();
  if (typeof renderTopology === "function") renderTopology();
  if (typeof StorageService !== "undefined" && typeof StorageService.queueAutoSave === "function") {
    StorageService.queueAutoSave();
  }
}

function handleBomModalPsuChange(instanceId) {
  const pEl = document.getElementById("bomAccPrimaryPsu");
  const sEl = document.getElementById("bomAccSecondaryPsu");
  const tEl = document.getElementById("bomAccTertiaryPsu");
  const cEl = document.getElementById("bomAccHighAmpCord");
  applyBomItemPsuConfig(instanceId, {
    primaryPsuSku: pEl ? pEl.value : undefined,
    secondaryPsuSku: sEl ? sEl.value : "none",
    tertiaryPsuSku: tEl ? tEl.value : "none",
    includeHighAmpCords: cEl ? cEl.checked : true
  });
  if (activeBomAccessoriesInstanceId === instanceId) {
    renderBomItemAccessoriesModalContent();
  }
}

function setBomItemMount(instanceId, mountSku) {
  const item = projectBOM.find(i => i.instanceId === instanceId);
  if (!item) return;

  projectBOM = projectBOM.filter(i => !(i.parentInstanceId === instanceId && i.role === "Mounting Hardware"));
  item.selectedMountSku = mountSku || "included";

  if (mountSku === "UACC-Flex-DIN" || mountSku === "UACC-DIN-Rail" || /DIN/i.test(mountSku || "")) {
    item.isDinMounted = true;
    item.mountMethod = "din";
  } else if (item.mountMethod === "din" && !(item.mounting && /din/i.test(item.mounting) && !item.mounting.includes("19"))) {
    item.isDinMounted = false;
    item.mountMethod = "rack";
  }

  if (mountSku && mountSku !== "included" && mountSku !== "none" && mountSku !== "3rd_party_enclosure") {
    const m = (typeof MOUNTING_CATALOG !== "undefined" && MOUNTING_CATALOG[mountSku]) ||
      (typeof POWER_SUPPLY_CATALOG !== "undefined" && POWER_SUPPLY_CATALOG[mountSku]) ||
      (typeof CatalogRegistry !== "undefined" && CatalogRegistry.get(mountSku));
    if (m) {
      projectBOM.push({
        instanceId: `mount-${instanceId}`,
        parentInstanceId: instanceId,
        id: m.sku || mountSku,
        model: `Mount Hardware: ${m.name || m.model || mountSku}`,
        sku: m.sku || mountSku,
        role: "Mounting Hardware",
        category: "Infrastructure",
        vendor: m.vendor || item.vendor || "Generic",
        msrp: Number(m.msrp) || 0,
        rackUnits: Number(m.rackUnits) || 0,
        weightLbs: Number(m.weightLbs) || 1.5,
        depthInches: Number(m.depthInches) || 0,
        closetName: item.closetName,
        rackId: item.rackId,
        qty: item.qty || 1,
        qtyPerUnit: 1
      });
    }
  }

  refreshAllViewsAfterBomConfigChange();
  if (activeBomAccessoriesInstanceId === instanceId) renderBomItemAccessoriesModalContent();
  if (typeof showToast === "function") {
    showToast(`Updated mounting hardware for ${item.friendlyName || item.model}`);
  }
}

function setBomUplinkStackPolicy(instanceId, policy) {
  const item = projectBOM.find(i => i.instanceId === instanceId);
  if (!item) return;
  item.uplinkModuleStackPolicy = (policy === "all") ? "all" : "first_last";
  syncBomUplinkModuleQtyAndBlankPlates(item);
  if (typeof PortEngine !== "undefined" && typeof PortEngine.initSwitchPorts === "function") {
    PortEngine.initSwitchPorts(item, true);
  }
  if (typeof recalculateAutoUplinks === "function") {
    recalculateAutoUplinks();
  }
  refreshAllViewsAfterBomConfigChange();
  if (activeBomAccessoriesInstanceId === instanceId) renderBomItemAccessoriesModalContent();
  if (typeof showToast === "function") {
    const reqQty = getRequiredUplinkModuleQty(item);
    showToast(item.uplinkModuleStackPolicy === "first_last"
      ? `Uplink modules set to 1st & Last stack members only (${reqQty}x modules)`
      : `Uplink modules populated on all stack members (${reqQty}x modules)`);
  }
}

function toggleBomStackBlankPlates(instanceId, enabled) {
  const item = projectBOM.find(i => i.instanceId === instanceId);
  if (!item) return;
  item.includeStackBlankPlates = !!enabled;
  syncBomUplinkModuleQtyAndBlankPlates(item);
  refreshAllViewsAfterBomConfigChange();
  if (activeBomAccessoriesInstanceId === instanceId) renderBomItemAccessoriesModalContent();
}

function setBomItemStackPowerOptions(instanceId, opts = {}) {
  const item = projectBOM.find(i => i.instanceId === instanceId);
  if (!item) return;
  if (opts.enabled !== undefined) item.stackPowerEnabled = !!opts.enabled;
  if (opts.mode) item.stackPowerMode = opts.mode;
  if (opts.cableLength) item.stackPowerCableLength = opts.cableLength;
  applyStackCabling(item);
  refreshAllViewsAfterBomConfigChange();
  if (activeBomAccessoriesInstanceId === instanceId) renderBomItemAccessoriesModalContent();
}

function setBomItemPatchPanelOptions(instanceId, layoutMode, panelSku) {
  const item = projectBOM.find(i => i.instanceId === instanceId);
  if (!item) return;
  if (panelSku !== undefined) {
    item.patchPanelSku = (!panelSku || panelSku === "auto") ? null : panelSku;
  }
  if (layoutMode !== undefined) {
    delete item.podAdjacentRole;
    if (layoutMode === "standard_pod") {
      item.standardPod = true;
      item.patchPanelBetween = false;
      item.cableManagerBetween = false;
    } else if (layoutMode === "between_stack") {
      item.standardPod = false;
      item.patchPanelBetween = (item.stackedUnits >= 2);
      if (item.patchPanelBetween) item.cableManagerBetween = false;
    } else {
      item.standardPod = false;
      item.patchPanelBetween = false;
    }
  }
  applyStackCabling(item);
  applyStandardPodCabling(item);
  refreshAllViewsAfterBomConfigChange();
  if (activeBomAccessoriesInstanceId === instanceId) renderBomItemAccessoriesModalContent();
}

function setBomItem24PortOffsetOptions(instanceId, side, patchMode) {
  const item = projectBOM.find(i => i.instanceId === instanceId);
  if (!item) return;
  if (side !== undefined) {
    item.portOffsetSide = (!side || side === "auto") ? null : side;
  }
  if (patchMode !== undefined) {
    item.offset24PatchMode = (!patchMode || patchMode === "auto") ? null : patchMode;
    if (patchMode === "offset_48p_frame" && item.patchPanelSku === "PP-1U-24P-MOD") {
      item.patchPanelSku = null;
    }
  }
  applyStackCabling(item);
  applyStandardPodCabling(item);
  refreshAllViewsAfterBomConfigChange();
  if (activeBomAccessoriesInstanceId === instanceId) renderBomItemAccessoriesModalContent();
}

function toggleBomItemCableManagerBetween(instanceId, enabled) {
  const item = projectBOM.find(i => i.instanceId === instanceId);
  if (!item) return;
  item.cableManagerBetween = !!enabled;
  if (item.cableManagerBetween) {
    item.patchPanelBetween = false;
    item.standardPod = false;
  }
  applyStackCabling(item);
  applyStandardPodCabling(item);
  refreshAllViewsAfterBomConfigChange();
  if (activeBomAccessoriesInstanceId === instanceId) renderBomItemAccessoriesModalContent();
}

function toggleBomItemSpareFan(instanceId, enabled) {
  const item = projectBOM.find(i => i.instanceId === instanceId);
  if (!item) return;
  const catItem = lookupCatalogRecordForBomItem(item);
  const fanSku = item.fanSku || catItem?.fanSku || ((catItem?.compatibleAccessories || item.compatibleAccessories || []).find(s => /FAN/i.test(s))) || null;
  projectBOM = projectBOM.filter(i => !(i.parentInstanceId === instanceId && i.role === "Cooling & Fans"));
  if (enabled && fanSku) {
    const fan = (typeof POWER_SUPPLY_CATALOG !== "undefined" && POWER_SUPPLY_CATALOG[fanSku]) ||
      (typeof CatalogRegistry !== "undefined" && CatalogRegistry.get(fanSku)) ||
      { sku: fanSku, name: `${item.vendor || ''} Hot-Swappable Fan Module (${fanSku})`, msrp: 125, weightLbs: 0.4 };
    projectBOM.push({
      instanceId: `fan-${instanceId}`,
      parentInstanceId: instanceId,
      id: fan.sku || fanSku,
      model: `Hot-Swap Fan: ${fan.name || fan.model || fanSku}`,
      sku: fan.sku || fanSku,
      role: "Cooling & Fans",
      category: "Accessory",
      vendor: fan.vendor || item.vendor,
      msrp: Number(fan.msrp) || 125,
      weightLbs: Number(fan.weightLbs) || 0.4,
      poeBudget: 0,
      baseWatts: 2,
      closetName: item.closetName,
      rackId: item.rackId,
      qty: item.qty || 1,
      qtyPerUnit: 1
    });
  }
  refreshAllViewsAfterBomConfigChange();
  if (activeBomAccessoriesInstanceId === instanceId) renderBomItemAccessoriesModalContent();
}

function toggleBomItemFeatureLicense(instanceId, licSku, enabled) {
  const item = projectBOM.find(i => i.instanceId === instanceId);
  if (!item || !licSku) return;
  projectBOM = projectBOM.filter(i => !(i.parentInstanceId === instanceId && i.role === "Feature License" && (i.sku === licSku || i.id === licSku)));
  if (enabled && typeof FEATURE_LICENSE_CATALOG !== "undefined" && FEATURE_LICENSE_CATALOG[licSku]) {
    const lic = FEATURE_LICENSE_CATALOG[licSku];
    projectBOM.push({
      instanceId: `lic-${licSku}-${instanceId}`,
      parentInstanceId: instanceId,
      id: lic.sku,
      model: lic.name,
      sku: lic.sku,
      role: "Feature License",
      vendor: lic.vendor || item.vendor,
      msrp: Number(lic.msrp) || 0,
      poeBudget: 0,
      baseWatts: 0,
      closetName: item.closetName,
      rackId: item.rackId,
      qty: item.qty || 1,
      qtyPerUnit: 1
    });
  }
  refreshAllViewsAfterBomConfigChange();
  if (activeBomAccessoriesInstanceId === instanceId) renderBomItemAccessoriesModalContent();
}

function setBomItemMgmtTerm(instanceId, term) {
  const item = projectBOM.find(i => i.instanceId === instanceId);
  if (!item) return;
  if (!term || term === "none") {
    projectBOM = projectBOM.filter(i => !(i.parentInstanceId === instanceId && (i.role === "Mgmt License" || i.role === "Security License")));
    item.selectedMgmtTerm = "none";
  } else {
    item.selectedMgmtTerm = term;
    const profileKey = item.selectedMgmtProfile && item.selectedMgmtProfile !== "standalone" ? item.selectedMgmtProfile : "cloud";
    applyManagementSubscription(instanceId, profileKey, term);
  }
  refreshAllViewsAfterBomConfigChange();
  if (activeBomAccessoriesInstanceId === instanceId) renderBomItemAccessoriesModalContent();
}

function addAccessoryToBomItem(instanceId, accSku, qtyToAdd = 1) {
  const item = projectBOM.find(i => i.instanceId === instanceId);
  if (!item || !accSku) return;
  const pool = getAllCatalogAccessoriesPool();
  const acc = pool.find(a => a.sku === accSku || a.id === accSku);
  if (!acc) return;

  const qty = Math.max(1, parseInt(qtyToAdd, 10) || 1);
  const existing = projectBOM.find(ch => ch.parentInstanceId === instanceId && ch.sku === acc.sku && ch.source === "manual_bom_accessory");
  if (existing) {
    existing.qty = (parseInt(existing.qty, 10) || 1) + qty;
  } else {
    projectBOM.push({
      instanceId: `acc-${acc.sku}-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      parentInstanceId: instanceId,
      source: "manual_bom_accessory",
      id: acc.sku,
      model: acc.name,
      sku: acc.sku,
      role: acc.role || "Accessory",
      category: acc.category || "Accessory",
      vendor: acc.vendor || item.vendor || "Generic",
      msrp: Number(acc.msrp) || 0,
      rackUnits: Number(acc.rackUnits) || 0,
      weightLbs: Number(acc.weightLbs) || 0,
      depthInches: Number(acc.depthInches) || 0,
      poeBudget: 0,
      baseWatts: 0,
      closetName: item.closetName,
      rackId: item.rackId,
      qty
    });
  }
  refreshAllViewsAfterBomConfigChange();
  if (activeBomAccessoriesInstanceId === instanceId) renderBomItemAccessoriesModalContent();
  if (typeof showToast === "function") {
    showToast(`Added ${qty}x ${acc.sku} to ${item.friendlyName || item.model}`);
  }
}

function changeBomChildAccessoryQty(childInstanceId, delta) {
  const ch = projectBOM.find(i => i.instanceId === childInstanceId);
  if (!ch) return;
  const nextQty = (parseInt(ch.qty, 10) || 1) + delta;
  if (nextQty <= 0) {
    removeBomChildAccessory(childInstanceId);
    return;
  }
  ch.qty = nextQty;
  refreshAllViewsAfterBomConfigChange();
  if (activeBomAccessoriesInstanceId) renderBomItemAccessoriesModalContent();
}

function removeBomChildAccessory(childInstanceId) {
  const ch = projectBOM.find(i => i.instanceId === childInstanceId);
  if (!ch) return;
  const parent = ch.parentInstanceId ? projectBOM.find(p => p.instanceId === ch.parentInstanceId) : null;
  if (parent) {
    if (ch.role === "Uplink Module") {
      changeBomUplinkModule(parent.instanceId, "none");
      if (activeBomAccessoriesInstanceId) renderBomItemAccessoriesModalContent();
      return;
    }
    if (ch.instanceId === `psu2-${parent.instanceId}`) {
      applyBomItemPsuConfig(parent.instanceId, {
        primaryPsuSku: parent.primaryPsuSku || parent.defaultPsuSku || "included",
        secondaryPsuSku: "none",
        tertiaryPsuSku: parent.tertiaryPsuSku || "none"
      });
      if (activeBomAccessoriesInstanceId) renderBomItemAccessoriesModalContent();
      return;
    }
    if (ch.instanceId === `psu3-${parent.instanceId}`) {
      applyBomItemPsuConfig(parent.instanceId, {
        primaryPsuSku: parent.primaryPsuSku || parent.defaultPsuSku || "included",
        secondaryPsuSku: parent.secondaryPsuSku || "none",
        tertiaryPsuSku: "none"
      });
      if (activeBomAccessoriesInstanceId) renderBomItemAccessoriesModalContent();
      return;
    }
    if (ch.role === "StackPower Cable") {
      parent.stackPowerEnabled = false;
    }
    if (ch.source === "stack_patch_panel") {
      parent.patchPanelBetween = false;
    }
    if (ch.source === "switch_standard_pod") {
      parent.standardPod = false;
      projectBOM = projectBOM.filter(i => !(i.parentInstanceId === parent.instanceId && i.source === "switch_standard_pod"));
      refreshAllViewsAfterBomConfigChange();
      if (activeBomAccessoriesInstanceId) renderBomItemAccessoriesModalContent();
      return;
    }
    if (ch.source === "stack_cable_manager") {
      parent.cableManagerBetween = false;
    }
  }
  projectBOM = projectBOM.filter(i => i.instanceId !== childInstanceId);
  refreshAllViewsAfterBomConfigChange();
  if (activeBomAccessoriesInstanceId) renderBomItemAccessoriesModalContent();
}

function renderBomItemAccessoriesModalContent() {
  const modal = document.getElementById("bomItemAccessoriesModal");
  if (!modal || !activeBomAccessoriesInstanceId) return;
  const item = projectBOM.find(i => i.instanceId === activeBomAccessoriesInstanceId);
  if (!item) {
    closeBomItemAccessoriesModal();
    return;
  }

  enrichBOMItemFromCatalog(item);
  const catItem = lookupCatalogRecordForBomItem(item) || item;
  const children = projectBOM.filter(ch => ch.parentInstanceId === item.instanceId);

  const isSwitch = Boolean(item.canStack || item.role === "Access" || item.role === "Aggregation" || item.role === "Core" || (catItem && catItem.ports && catItem.switchingCapacity));
  const hasModularBay = Boolean(catItem?.modularUplink?.hasSlot || item?.modularUplink?.hasSlot);
  const supportedModules = catItem?.modularUplink?.supportedModules || item?.modularUplink?.supportedModules || [];
  const attachedSled = children.find(ch => ch.role === "Uplink Module");

  // PSU Options
  const primaryPsuSkus = Array.isArray(catItem?.supportedPrimaryPsus) && catItem.supportedPrimaryPsus.length > 0
    ? catItem.supportedPrimaryPsus
    : (catItem?.defaultPsuSku ? [catItem.defaultPsuSku] : (catItem?.needsExternalPsu && catItem?.psuSku ? [catItem.psuSku] : []));
  const secondaryPsuSkus = Array.isArray(catItem?.supportedSecondaryPsus) && catItem.supportedSecondaryPsus.length > 0
    ? catItem.supportedSecondaryPsus
    : (catItem?.dualPsu && catItem?.psuSku ? [catItem.psuSku] : []);
  const maxPsuBays = Number(catItem?.maxPsuBays || item?.maxPsuBays || (secondaryPsuSkus.length > 0 ? 2 : 1));
  const hasPsuSection = primaryPsuSkus.length > 0 || secondaryPsuSkus.length > 0;

  const activePrimarySku = item.primaryPsuSku || catItem?.defaultPsuSku || primaryPsuSkus[0] || "included";
  const attachedPsu2 = children.find(ch => ch.instanceId === `psu2-${item.instanceId}`);
  const attachedPsu3 = children.find(ch => ch.instanceId === `psu3-${item.instanceId}`);
  const activeSecondarySku = item.secondaryPsuSku || (attachedPsu2 ? attachedPsu2.sku : "none");
  const activeTertiarySku = item.tertiaryPsuSku || (attachedPsu3 ? attachedPsu3.sku : "none");
  const has1900W = /1900W/i.test(activePrimarySku) || /1900W/i.test(activeSecondarySku) || /1900W/i.test(activeTertiarySku);

  // Mount Options
  const mountOptions = getCompatibleMountsForBomItem(item, catItem);
  const attachedMount = children.find(ch => ch.role === "Mounting Hardware");
  const activeMountSku = attachedMount ? attachedMount.sku : (item.selectedMountSku || "included");

  // Stacking, StackPower & Patch Panels
  const stackCount = item.stackedUnits >= 2 ? item.stackedUnits : 0;
  const canStack = Boolean(item.canStack || catItem?.stacking || catItem?.canStack || item.role === "Access" || item.role === "Aggregation");
  const hasStackPower = supportsCiscoStackPower(item);
  const stackPowerPreview = (hasStackPower && stackCount >= 2 && item.stackPowerEnabled !== false) ? resolveCiscoStackPowerCables(item) : [];
  const ppCfg = resolveSwitchPatchPanelConfig(item);
  const currentPatchLayout = item.standardPod ? "standard_pod" : (item.patchPanelBetween ? "between_stack" : "none");
  const currentPatchSku = item.patchPanelSku || "auto";

  // Fan & Licenses
  const fanSku = item.fanSku || catItem?.fanSku || ((catItem?.compatibleAccessories || item.compatibleAccessories || []).find(s => /FAN/i.test(s))) || null;
  const hasSpareFan = children.some(ch => ch.role === "Cooling & Fans");
  const featureLicSkus = Array.isArray(catItem?.featureLicenses) ? catItem.featureLicenses : [];
  const hasCloudMgmt = (item.vendor === "Cisco" || item.vendor === "Meraki") && typeof MGMT_SUBSCRIPTION_CATALOG !== "undefined" && MGMT_SUBSCRIPTION_CATALOG[item.vendor];
  const attachedMgmt = children.find(ch => ch.role === "Mgmt License");

  // Additional Accessory Picker Pool
  const allPool = getAllCatalogAccessoriesPool();
  const itemVendorLower = (item.vendor || "").toLowerCase();
  const filteredPool = allPool.filter(acc => {
    if (!bomAccPickerShowAllVendors && itemVendorLower) {
      const vMatch = acc.vendor.toLowerCase() === itemVendorLower ||
        acc.compatibleVendors.some(v => v.toLowerCase() === itemVendorLower) ||
        acc.vendor === "Panduit" || acc.vendor === "Generic";
      if (!vMatch) return false;
    }
    if (bomAccPickerSearch) {
      const q = bomAccPickerSearch.toLowerCase();
      return acc.sku.toLowerCase().includes(q) || acc.name.toLowerCase().includes(q) || acc.role.toLowerCase().includes(q) || acc.vendor.toLowerCase().includes(q);
    }
    return true;
  }).slice(0, 60);

  const childCost = children.reduce((s, c) => s + ((Number(c.msrp) || 0) * (Number(c.qty) || 1)), 0);
  const totalWithOpts = ((Number(item.msrp) || 0) * (Number(item.qty) || 1)) + childCost;

  modal.innerHTML = `
    <div class="w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
      <!-- Header -->
      <div class="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
        <div class="flex items-center gap-3 min-w-0">
          <div class="p-2 rounded-xl bg-cyan-950/80 border border-cyan-700/60 text-cyan-300 shrink-0">
            <i data-lucide="sliders-horizontal" class="w-4 h-4"></i>
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              ${item.deviceNumber ? `<span class="px-1.5 py-0.5 rounded bg-brand-950 border border-brand-500/40 text-[10px] font-mono font-bold text-brand-300">${escapeHTML(item.deviceNumber)}</span>` : ''}
              <h3 class="text-sm font-bold text-white truncate">${escapeHTML(item.friendlyName || item.model)}</h3>
              <span class="text-[11px] font-mono text-slate-400">(${escapeHTML(item.sku)})</span>
              <span class="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono">${escapeHTML(item.closetName || 'Unassigned')}</span>
            </div>
            <p class="text-[11px] text-slate-400">Configure power supplies, rack mounts, uplink modules, Cisco StackPower, 48P/24P patch panels, and compatible accessories.</p>
          </div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <button type="button" onclick="closeBomItemAccessoriesModal(); openReplaceBomItemModal('${item.instanceId}')" class="px-2.5 py-1.5 rounded-lg bg-purple-950/80 hover:bg-purple-900 border border-purple-600/60 text-purple-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors" title="Swap this hardware model while keeping connections &amp; placement">
            <i data-lucide="repeat" class="w-3.5 h-3.5 text-purple-300"></i>
            <span>Swap Model</span>
          </button>
          <button type="button" onclick="closeBomItemAccessoriesModal()" class="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer">
            <i data-lucide="x" class="w-4 h-4"></i>
          </button>
        </div>
      </div>

      <!-- Body -->
      <div class="flex-1 overflow-y-auto p-5 space-y-4 text-xs">

        ${hasPsuSection ? `
          <!-- 1. Power Supplies & PoE Budget -->
          <div class="p-3.5 rounded-xl bg-slate-950/75 border border-slate-800 space-y-3">
            <div class="flex items-center justify-between gap-2 flex-wrap">
              <div class="flex items-center gap-2">
                <i data-lucide="zap" class="w-4 h-4 text-amber-400"></i>
                <span class="font-bold text-white text-xs">Power Supplies &amp; PoE Budget Configuration</span>
                <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">${maxPsuBays} PSU Bay${maxPsuBays > 1 ? 's' : ''}</span>
              </div>
              <span class="px-2.5 py-0.5 rounded-full bg-amber-950/80 border border-amber-600/60 text-amber-300 font-mono font-bold text-[11px]">
                Active PoE Budget: ${(item.poeBudget || 0).toLocaleString()}W / chassis
              </span>
            </div>

            <div class="grid grid-cols-1 ${maxPsuBays >= 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-3">
              ${primaryPsuSkus.length > 0 ? `
                <div>
                  <label class="block text-[10px] font-mono uppercase text-slate-400 mb-1">Bay 1 — Primary Power Supply</label>
                  <select id="bomAccPrimaryPsu" onchange="handleBomModalPsuChange('${item.instanceId}')" class="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-500 cursor-pointer">
                    ${primaryPsuSkus.map(pSku => {
                      const pObj = (typeof POWER_SUPPLY_CATALOG !== "undefined" && POWER_SUPPLY_CATALOG[pSku]) || null;
                      const isDef = pSku === catItem?.defaultPsuSku && !catItem?.needsExternalPsu;
                      const priceTag = isDef ? "Included in Chassis" : `+${(pObj?.msrp || 0).toLocaleString()}`;
                      const wTag = pObj?.wattage ? `${pObj.wattage}W ` : "";
                      return `<option value="${escapeHTML(pSku)}" ${activePrimarySku === pSku ? 'selected' : ''}>${escapeHTML(wTag + pSku)} (${priceTag})</option>`;
                    }).join('')}
                  </select>
                </div>
              ` : ''}

              ${secondaryPsuSkus.length > 0 ? `
                <div>
                  <label class="block text-[10px] font-mono uppercase text-slate-400 mb-1">Bay 2 — Redundant / Boost PSU</label>
                  <select id="bomAccSecondaryPsu" onchange="handleBomModalPsuChange('${item.instanceId}')" class="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-500 cursor-pointer">
                    <option value="none" ${(!activeSecondarySku || activeSecondarySku === "none") ? 'selected' : ''}>-- Empty Bay (Single Primary PSU) --</option>
                    ${secondaryPsuSkus.map(sSku => {
                      const sObj = (typeof POWER_SUPPLY_CATALOG !== "undefined" && POWER_SUPPLY_CATALOG[sSku]) || null;
                      const wTag = sObj?.wattage ? `${sObj.wattage}W ` : "";
                      return `<option value="${escapeHTML(sSku)}" ${activeSecondarySku === sSku ? 'selected' : ''}>${escapeHTML(wTag + sSku)} (+${(sObj?.msrp || 0).toLocaleString()})</option>`;
                    }).join('')}
                  </select>
                </div>
              ` : ''}

              ${maxPsuBays >= 3 && secondaryPsuSkus.length > 0 ? `
                <div>
                  <label class="block text-[10px] font-mono uppercase text-slate-400 mb-1">Bay 3 — Tertiary Redundant PSU</label>
                  <select id="bomAccTertiaryPsu" onchange="handleBomModalPsuChange('${item.instanceId}')" class="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-500 cursor-pointer">
                    <option value="none" ${(!activeTertiarySku || activeTertiarySku === "none") ? 'selected' : ''}>-- Empty Bay 3 --</option>
                    ${secondaryPsuSkus.map(tSku => {
                      const tObj = (typeof POWER_SUPPLY_CATALOG !== "undefined" && POWER_SUPPLY_CATALOG[tSku]) || null;
                      const wTag = tObj?.wattage ? `${tObj.wattage}W ` : "";
                      return `<option value="${escapeHTML(tSku)}" ${activeTertiarySku === tSku ? 'selected' : ''}>${escapeHTML(wTag + tSku)} (+${(tObj?.msrp || 0).toLocaleString()})</option>`;
                    }).join('')}
                  </select>
                </div>
              ` : ''}
            </div>

            ${has1900W ? `
              <label class="flex items-center gap-2 pt-1 text-[11px] text-amber-200 cursor-pointer">
                <input id="bomAccHighAmpCord" type="checkbox" ${item.includeHighAmpCords !== false ? 'checked' : ''} onchange="handleBomModalPsuChange('${item.instanceId}')" class="rounded border-amber-600 bg-slate-900 text-amber-500" />
                <span>Include High-Amperage C21 AC Power Cord (<code class="font-mono text-amber-300">C9K-PWR-CAB-AC-US</code>, 16A/20A required by 1900W PSUs)</span>
              </label>
            ` : ''}
          </div>
        ` : ''}

        <!-- 2. Mounting Hardware & Modular Uplink Bay -->
        <div class="grid grid-cols-1 ${hasModularBay ? 'md:grid-cols-2' : ''} gap-3">
          <div class="p-3.5 rounded-xl bg-slate-950/75 border border-slate-800 space-y-2.5">
            <div class="flex items-center gap-2">
              <i data-lucide="anchor" class="w-4 h-4 text-cyan-400"></i>
              <span class="font-bold text-white text-xs">Rack Mounts, Rails &amp; Brackets</span>
            </div>
            <select onchange="setBomItemMount('${item.instanceId}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-cyan-500 cursor-pointer">
              <option value="included" ${(!activeMountSku || activeMountSku === "included") ? 'selected' : ''}>Standard Included Ears / Hardware ($0)</option>
              ${mountOptions.map(m => `
                <option value="${escapeHTML(m.sku)}" ${activeMountSku === m.sku ? 'selected' : ''}>${escapeHTML(m.name)} (${escapeHTML(m.sku)}) — +${m.msrp.toLocaleString()}</option>
              `).join('')}
            </select>
          </div>

          ${hasModularBay ? `
            <div class="p-3.5 rounded-xl bg-slate-950/75 border border-slate-800 space-y-2.5">
              <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-2">
                  <i data-lucide="cpu" class="w-4 h-4 text-brand-400"></i>
                  <span class="font-bold text-white text-xs">Modular Uplink Expansion Slot</span>
                </div>
                <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-brand-950/80 border border-brand-600/50 text-brand-300 font-bold">
                  Qty Quoted: ${attachedSled ? attachedSled.qty : 0}x
                </span>
              </div>
              <select onchange="changeBomUplinkModule('${item.instanceId}', this.value); renderBomItemAccessoriesModalContent();" class="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-brand-500 cursor-pointer">
                <option value="none" ${!attachedSled ? 'selected' : ''}>-- Empty Bay (No Module Installed) --</option>
                ${supportedModules.map(mSku => {
                  const mod = (typeof MODULAR_UPLINK_CATALOG !== "undefined") ? MODULAR_UPLINK_CATALOG[mSku] : null;
                  const isSel = attachedSled && (attachedSled.sku === mSku || attachedSled.id === mSku);
                  return `<option value="${escapeHTML(mSku)}" ${isSel ? 'selected' : ''}>${escapeHTML(mod ? `${mod.name} (${mSku}) — ${mod.msrp.toLocaleString()}` : mSku)}</option>`;
                }).join('')}
              </select>

              ${canStack ? `
                <div class="pt-1 space-y-1.5 border-t border-slate-800/80">
                  <label class="block text-[10px] font-mono uppercase text-slate-400">Stack Uplink Module Population Rule (&gt;2 Switches)</label>
                  <select onchange="setBomUplinkStackPolicy('${item.instanceId}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2 py-1 text-[11px] cursor-pointer">
                    <option value="first_last" ${(item.uplinkModuleStackPolicy || "first_last") === "first_last" ? 'selected' : ''}>1st &amp; Last Stack Members Only (2x Modules on 3+ Switch Stacks)</option>
                    <option value="all" ${item.uplinkModuleStackPolicy === "all" ? 'selected' : ''}>Populate Every Stack Member (${item.qty || 1}x Modules)</option>
                  </select>
                  ${stackCount > 2 && (item.uplinkModuleStackPolicy || "first_last") === "first_last" ? `
                    <label class="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer">
                      <input type="checkbox" ${item.includeStackBlankPlates ? 'checked' : ''} onchange="toggleBomStackBlankPlates('${item.instanceId}', this.checked)" class="rounded border-slate-600 bg-slate-900 text-brand-500" />
                      <span>Include ${stackCount - 2}x Blank Expansion Cover Plates (<code class="font-mono text-slate-400">C9300-NM-BLANK=</code>) on middle switches</span>
                    </label>
                  ` : ''}
                </div>
              ` : ''}
            </div>
          ` : ''}
        </div>

        ${isSwitch ? `
          <!-- 3. Switch Stacking, Cisco StackPower & 48P/24P Patch Panels -->
          <div class="p-3.5 rounded-xl bg-slate-950/75 border border-slate-800 space-y-3">
            <div class="flex items-center justify-between gap-2 flex-wrap">
              <div class="flex items-center gap-2">
                <i data-lucide="layers" class="w-4 h-4 text-indigo-400"></i>
                <span class="font-bold text-white text-xs">Virtual Stacking, StackPower &amp; Patch Panel Layout</span>
              </div>
              <span class="text-[10px] font-mono text-purple-300 bg-purple-950/80 border border-purple-700/60 px-2 py-0.5 rounded">
                ${ppCfg.isSandwich48
                  ? `Sandwich: ${ppCfg.outer24Count}× 24P Outer${ppCfg.inner48Count > 0 ? ` + ${ppCfg.inner48Count}× 48P Btwn` : ' (Above & Below)'}`
                  : `Resolved Panel: ${escapeHTML(ppCfg.sku)} (${ppCfg.rackUnits}U ${ppCfg.isOffset48Frame ? '48P Half-Populated 24J' : `${ppCfg.ports}-Port`})`}
              </span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              ${canStack ? `
                <div>
                  <label class="block text-[10px] font-mono uppercase text-slate-400 mb-1">Virtual Stack Chassis Count</label>
                  <select onchange="updateStackedCount('${item.instanceId}', parseInt(this.value, 10)); renderBomItemAccessoriesModalContent();" class="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs cursor-pointer">
                    <option value="0" ${stackCount < 2 ? 'selected' : ''}>Standalone (Unstacked)</option>
                    ${[2, 3, 4, 5, 6, 7, 8].map(n => `<option value="${n}" ${stackCount === n ? 'selected' : ''}>${n}-Switch Virtual Stack</option>`).join('')}
                  </select>
                </div>
              ` : ''}

              <div>
                <label class="block text-[10px] font-mono uppercase text-slate-400 mb-1">Patch Panel Arrangement</label>
                <select onchange="setBomItemPatchPanelOptions('${item.instanceId}', this.value, undefined)" class="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs cursor-pointer">
                  <option value="none" ${currentPatchLayout === "none" ? 'selected' : ''}>No Attached Pod / Stack Patch Panels</option>
                  <option value="standard_pod" ${currentPatchLayout === "standard_pod" ? 'selected' : ''}>${ppCfg.copperPorts > 24 ? 'Standard Sandwich Pod (24P Top/Bot + 48P In-Between)' : 'Standard Pod (Panel Above Each Switch)'}</option>
                  ${stackCount >= 2 ? `<option value="between_stack" ${currentPatchLayout === "between_stack" ? 'selected' : ''}>In-Between Stack Only (${stackCount - 1}x ${ppCfg.copperPorts > 24 ? '48P ' : ''}Interleaved)</option>` : ''}
                </select>
              </div>

              <div>
                <label class="block text-[10px] font-mono uppercase text-slate-400 mb-1">Patch Panel Density / SKU</label>
                <select onchange="setBomItemPatchPanelOptions('${item.instanceId}', undefined, this.value)" class="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs cursor-pointer">
                  <option value="auto" ${currentPatchSku === "auto" ? 'selected' : ''}>Auto (${ppCfg.copperPorts > 24 ? '24P Outer Caps + 48P In-Between' : (ppCfg.isOffset48Frame ? '1U 48P Half-Frame (24 Jacks)' : '1U 24-Port PP-1U-24P-MOD')})</option>
                  ${ppCfg.copperPorts > 24 ? `<option value="SANDWICH-48" ${currentPatchSku === "SANDWICH-48" ? 'selected' : ''}>24P Above &amp; Below + 48P In-Between (Recommended)</option>` : ''}
                  <option value="PP-1U-48P-MOD" ${currentPatchSku === "PP-1U-48P-MOD" ? 'selected' : ''}>1U 48-Port Above Each Switch (PP-1U-48P-MOD)</option>
                  <option value="PP-2U-48P-MOD" ${currentPatchSku === "PP-2U-48P-MOD" ? 'selected' : ''}>2U 48-Port Above Each Switch (PP-2U-48P-MOD)</option>
                  <option value="PP-1U-24P-MOD" ${currentPatchSku === "PP-1U-24P-MOD" ? 'selected' : ''}>1U 24-Port Keystone (PP-1U-24P-MOD)</option>
                  <option value="DUAL-24P" ${currentPatchSku === "DUAL-24P" ? 'selected' : ''}>Dual 1U 24-Port Per Switch (2x 24P Every Chassis)</option>
                </select>
              </div>
            </div>

            ${ppCfg.offset24?.is24Class ? `
              <div class="p-3 rounded-lg bg-indigo-950/30 border border-indigo-700/50 space-y-2">
                <div class="flex items-center justify-between gap-2 flex-wrap">
                  <span class="font-bold text-indigo-200 flex items-center gap-1.5">
                    <i data-lucide="align-horizontal-space-around" class="w-3.5 h-3.5 text-indigo-400"></i>
                    <span>24-Port Physical Faceplate Offset &amp; Patch Cord Reach</span>
                  </span>
                  <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950/90 border border-indigo-600/60 text-cyan-300 font-bold">
                    ${escapeHTML(ppCfg.offset24.shortBadge)}
                  </span>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label class="block text-[10px] font-mono text-indigo-300/80 mb-1">Switch Copper Port Cluster Position</label>
                    <select onchange="setBomItem24PortOffsetOptions('${item.instanceId}', this.value, undefined)" class="w-full bg-slate-900 border border-indigo-700/60 text-slate-200 rounded-lg px-2 py-1 text-[11px] cursor-pointer">
                      <option value="auto" ${!item.portOffsetSide ? 'selected' : ''}>Auto-Detect (${ppCfg.offset24.autoSide === 'left' ? 'Left 2×12 Cluster' : (ppCfg.offset24.autoSide === 'right' ? 'Right Cluster / LCM Left' : 'Full-Width Inline')})</option>
                      <option value="left" ${item.portOffsetSide === 'left' ? 'selected' : ''}>Left-Offset 2×12 Block (Cisco / Meraki / Juniper / Ruckus)</option>
                      <option value="right" ${item.portOffsetSide === 'right' ? 'selected' : ''}>Right-Offset Block (UniFi w/ Left LCM Screen)</option>
                      <option value="inline" ${item.portOffsetSide === 'inline' ? 'selected' : ''}>Full-Width Inline (No Horizontal Offset)</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-[10px] font-mono text-indigo-300/80 mb-1">Offset Patching Strategy</label>
                    <select onchange="setBomItem24PortOffsetOptions('${item.instanceId}', undefined, this.value)" class="w-full bg-slate-900 border border-indigo-700/60 text-slate-200 rounded-lg px-2 py-1 text-[11px] cursor-pointer">
                      <option value="auto" ${!item.offset24PatchMode ? 'selected' : ''}>Auto (${ppCfg.offset24.side === 'inline' ? '1U 24P + All 6" Cords' : '1U 24P + Split 12× 6" & 12× 1ft Cords'})</option>
                      <option value="mixed_cords" ${item.offset24PatchMode === 'mixed_cords' ? 'selected' : ''}>1U 24P Panel + Split 12× 6" (Aligned) &amp; 12× 1ft (Offset Reach)</option>
                      <option value="offset_48p_frame" ${item.offset24PatchMode === 'offset_48p_frame' ? 'selected' : ''}>Half-Populated 1U 48P Frame (Matching 2×12 Side + All 24× 6" Cords)</option>
                      <option value="all_1ft_cords" ${item.offset24PatchMode === 'all_1ft_cords' ? 'selected' : ''}>1U 24P Panel + Uniform 24× 1-Foot Cords</option>
                      <option value="inline_6in" ${item.offset24PatchMode === 'inline_6in' ? 'selected' : ''}>1U 24P Panel + All 24× 6-Inch Cords</option>
                    </select>
                  </div>
                </div>
              </div>
            ` : ''}

            ${stackCount >= 2 ? `
              <label class="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer">
                <input type="checkbox" ${item.cableManagerBetween ? 'checked' : ''} onchange="toggleBomItemCableManagerBetween('${item.instanceId}', this.checked)" class="rounded border-slate-600 bg-slate-900 text-amber-500" />
                <span>Interleave 1U Horizontal Cable Manager (<code class="font-mono text-amber-300">HCM-1U</code>) between stacked switches</span>
              </label>
            ` : ''}

            ${hasStackPower ? `
              <div class="p-3 rounded-lg bg-amber-950/25 border border-amber-700/50 space-y-2">
                <div class="flex items-center justify-between gap-2 flex-wrap">
                  <label class="flex items-center gap-2 font-bold text-amber-200 cursor-pointer">
                    <input type="checkbox" ${item.stackPowerEnabled !== false ? 'checked' : ''} ${stackCount < 2 ? 'disabled' : ''} onchange="setBomItemStackPowerOptions('${item.instanceId}', { enabled: this.checked })" class="rounded border-amber-500 bg-slate-900 text-amber-500" />
                    <span>⚡ Cisco StackPower Shared Power Backplane Ring</span>
                  </label>
                  ${stackCount < 2 ? `<span class="text-[10px] font-mono text-slate-400">Enable 2+ switch stack above to activate StackPower</span>` : `<span class="text-[10px] font-mono text-emerald-300">${stackPowerPreview.map(c => `${c.qty}x ${c.sku}`).join(' + ') || 'Disabled'}</span>`}
                </div>
                ${stackCount >= 2 && item.stackPowerEnabled !== false ? `
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    <div>
                      <label class="block text-[10px] font-mono text-amber-300/80 mb-1">StackPower Architecture Mode</label>
                      <select onchange="setBomItemStackPowerOptions('${item.instanceId}', { mode: this.value })" class="w-full bg-slate-900 border border-amber-700/60 text-slate-200 rounded-lg px-2 py-1 text-[11px] cursor-pointer">
                        <option value="power_sharing" ${(item.stackPowerMode || "power_sharing") === "power_sharing" ? 'selected' : ''}>Power Sharing (Zero-Loss Pooled Wattage)</option>
                        <option value="redundant" ${item.stackPowerMode === "redundant" ? 'selected' : ''}>Redundant Mode (Reserve Largest PSU as N+1 RPS)</option>
                      </select>
                    </div>
                    <div>
                      <label class="block text-[10px] font-mono text-amber-300/80 mb-1">StackPower Cable Length Policy</label>
                      <select onchange="setBomItemStackPowerOptions('${item.instanceId}', { cableLength: this.value })" class="w-full bg-slate-900 border border-amber-700/60 text-slate-200 rounded-lg px-2 py-1 text-[11px] cursor-pointer">
                        <option value="auto" ${(item.stackPowerCableLength || "auto") === "auto" ? 'selected' : ''}>Auto-Size by Rack Span (Short Adjacent + Long Return)</option>
                        <option value="short" ${item.stackPowerCableLength === "short" ? 'selected' : ''}>All Short StackPower Cables (30cm / 35cm)</option>
                        <option value="long" ${item.stackPowerCableLength === "long" ? 'selected' : ''}>All Long StackPower Cables (150cm / 100cm)</option>
                      </select>
                    </div>
                  </div>
                ` : ''}
              </div>
            ` : ''}
          </div>
        ` : ''}

        ${(fanSku || featureLicSkus.length > 0 || hasCloudMgmt) ? `
          <!-- 4. Cooling Fans & Licensing -->
          <div class="p-3.5 rounded-xl bg-slate-950/75 border border-slate-800 space-y-2.5">
            <div class="flex items-center gap-2">
              <i data-lucide="shield-check" class="w-4 h-4 text-emerald-400"></i>
              <span class="font-bold text-white text-xs">Cooling Spares, Feature Licenses &amp; Subscriptions</span>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              ${fanSku ? `
                <label class="flex items-center gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 cursor-pointer">
                  <input type="checkbox" ${hasSpareFan ? 'checked' : ''} onchange="toggleBomItemSpareFan('${item.instanceId}', this.checked)" class="rounded border-slate-600 bg-slate-950 text-cyan-500" />
                  <span>Hot-Swappable Spare Fan Module (<code class="font-mono text-cyan-300">${escapeHTML(fanSku)}</code>)</span>
                </label>
              ` : ''}
              ${hasCloudMgmt ? `
                <div>
                  <label class="block text-[10px] font-mono uppercase text-slate-400 mb-1">${escapeHTML(item.vendor)} Subscription Term</label>
                  <select onchange="setBomItemMgmtTerm('${item.instanceId}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs cursor-pointer">
                    ${["1YR", "3YR", "5YR"].map(t => `<option value="${t}" ${(item.selectedMgmtTerm || (attachedMgmt && attachedMgmt.model.includes(t) ? t : "1YR")) === t ? 'selected' : ''}>${t} Enterprise Cloud / DNA Subscription</option>`).join('')}
                    <option value="none" ${(!attachedMgmt && item.selectedMgmtTerm === "none") ? 'selected' : ''}>None (Hardware Only / Existing EA)</option>
                  </select>
                </div>
              ` : ''}
            </div>
            ${featureLicSkus.length > 0 ? `
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                ${featureLicSkus.map(lSku => {
                  const lic = (typeof FEATURE_LICENSE_CATALOG !== "undefined") ? FEATURE_LICENSE_CATALOG[lSku] : null;
                  if (!lic) return '';
                  const isAttached = children.some(ch => ch.role === "Feature License" && (ch.sku === lSku || ch.id === lSku));
                  return `
                    <label class="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 cursor-pointer">
                      <span class="flex items-center gap-2 min-w-0">
                        <input type="checkbox" ${isAttached ? 'checked' : ''} onchange="toggleBomItemFeatureLicense('${item.instanceId}', '${escapeJSAttr(lSku)}', this.checked)" class="rounded border-slate-600 bg-slate-950 text-emerald-500" />
                        <span class="truncate">${escapeHTML(lic.name)} (<code class="font-mono text-slate-400">${escapeHTML(lSku)}</code>)</span>
                      </span>
                      <span class="font-mono text-emerald-400 font-semibold shrink-0">+${(lic.msrp || 0).toLocaleString()}</span>
                    </label>
                  `;
                }).join('')}
              </div>
            ` : ''}
          </div>
        ` : ''}

        <!-- 5. Add Any Catalog Accessory & Manage Attached Accessories -->
        <div class="p-3.5 rounded-xl bg-slate-950/75 border border-slate-800 space-y-3">
          <div class="flex items-center justify-between gap-2 flex-wrap">
            <div class="flex items-center gap-2">
              <i data-lucide="package-plus" class="w-4 h-4 text-emerald-400"></i>
              <span class="font-bold text-white text-xs">Add Compatible Catalog Accessories (${children.length} attached)</span>
            </div>
            <label class="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
              <input type="checkbox" ${bomAccPickerShowAllVendors ? 'checked' : ''} onchange="bomAccPickerShowAllVendors = this.checked; renderBomItemAccessoriesModalContent();" class="rounded border-slate-600 bg-slate-900 text-brand-500" />
              <span>Show All Vendors / Universal Parts</span>
            </label>
          </div>

          <div class="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value="${escapeHTML(bomAccPickerSearch)}"
              placeholder="Filter accessories by SKU, wattage, mount, cable, fan, or license..."
              oninput="bomAccPickerSearch = this.value; renderBomItemAccessoriesModalContent();"
              class="sm:w-64 bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-brand-500"
            />
            <select id="bomExtraAccessorySelect" class="flex-1 bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs cursor-pointer">
              ${filteredPool.length === 0 ? `<option value="">No matching accessories — check "Show All Vendors"</option>` : filteredPool.map(a => `
                <option value="${escapeHTML(a.sku)}">[${escapeHTML(a.vendor)}] ${escapeHTML(a.name)} (${escapeHTML(a.sku)}) — ${a.msrp.toLocaleString()}</option>
              `).join('')}
            </select>
            <button
              type="button"
              onclick="const sel=document.getElementById('bomExtraAccessorySelect'); if(sel && sel.value) addAccessoryToBomItem('${item.instanceId}', sel.value, 1);"
              class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shrink-0 cursor-pointer transition-colors"
            >
              <i data-lucide="plus" class="w-3.5 h-3.5"></i>
              <span>Add to Part</span>
            </button>
          </div>

          ${children.length > 0 ? `
            <div class="space-y-1.5 pt-2 border-t border-slate-800/80">
              <div class="text-[10px] font-mono uppercase text-slate-400">Currently Attached Accessories &amp; Sub-Items</div>
              ${children.map(ch => `
                <div class="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px]">
                  <div class="flex items-center gap-2 min-w-0">
                    <span class="px-1.5 py-0.2 rounded bg-slate-950 border border-slate-700 text-[10px] font-mono text-cyan-300 shrink-0">${escapeHTML(ch.role || 'Accessory')}</span>
                    <span class="text-slate-200 font-semibold truncate">${escapeHTML(ch.model)}</span>
                    <span class="text-slate-400 font-mono text-[10px] shrink-0">(${escapeHTML(ch.sku)})</span>
                  </div>
                  <div class="flex items-center gap-2 shrink-0">
                    <span class="font-mono text-emerald-400 font-bold">${((Number(ch.msrp) || 0) * (Number(ch.qty) || 1)).toLocaleString()}</span>
                    <div class="flex items-center bg-slate-950 border border-slate-700 rounded-md overflow-hidden">
                      <button type="button" onclick="changeBomChildAccessoryQty('${ch.instanceId}', -1)" class="px-1.5 py-0.5 text-slate-400 hover:text-white hover:bg-slate-800 font-bold cursor-pointer">-</button>
                      <span class="px-1.5 font-mono text-white text-[10px] font-bold">${ch.qty || 1}</span>
                      <button type="button" onclick="changeBomChildAccessoryQty('${ch.instanceId}', 1)" class="px-1.5 py-0.5 text-slate-400 hover:text-white hover:bg-slate-800 font-bold cursor-pointer">+</button>
                    </div>
                    <button type="button" onclick="removeBomChildAccessory('${ch.instanceId}')" class="p-1 text-slate-400 hover:text-rose-400 cursor-pointer" title="Remove Accessory">
                      <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : `
            <div class="text-[11px] text-slate-500 italic">No child accessories currently attached to this item.</div>
          `}
        </div>
      </div>

      <!-- Footer -->
      <div class="px-5 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0 text-xs">
        <div class="font-mono text-slate-300">
          Base Hardware: <strong class="text-white">${((Number(item.msrp) || 0) * (Number(item.qty) || 1)).toLocaleString()}</strong>
          + Attached Options: <strong class="text-cyan-300">${childCost.toLocaleString()}</strong>
          = Total: <strong class="text-emerald-400 text-sm">${totalWithOpts.toLocaleString()}</strong>
        </div>
        <button type="button" onclick="closeBomItemAccessoriesModal()" class="px-4 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs cursor-pointer transition-colors">
          Done
        </button>
      </div>
    </div>
  `;

  if (typeof safeCreateIcons === "function") safeCreateIcons(modal);
  else if (window.lucide) { try { lucide.createIcons(); } catch (e) {} }
}

// =========================================================================
// Universal In-Place Product Replacement / Hardware Swap Engine
// =========================================================================

function getBomItemReplacementDomain(item) {
  const role = (item.role || "").toLowerCase();
  const cat = (item.category || "").toLowerCase();
  if (role === "camera" || role === "surveillance" || cat.includes("camera")) return "camera";
  if (role === "firewall" || cat.includes("firewall") || role.includes("security appliance")) return "firewall";
  if (role.includes("wireless") || cat.includes("wireless") || role === "access point") return "wireless";
  if (role === "access control" || cat.includes("access")) return "access_control";
  if (role === "ups" || role === "pdu" || cat.includes("ups") || cat.includes("pdu") || cat.includes("power")) return "power";
  if (role === "server" || role.includes("nvr") || role.includes("recording") || cat.includes("server") || cat.includes("compute")) return "compute";
  if (item.canStack || role === "access" || role === "aggregation" || role === "core" || (Number(item.ports) > 0 && !item.isPassive)) return "switch";
  return "generic";
}

function getCatalogPoolForDomain(domain) {
  const results = [];
  const seen = new Set();
  const addList = (arr) => {
    if (!Array.isArray(arr)) return;
    arr.forEach(c => {
      if (!c) return;
      const key = String(c.id || c.sku || "").trim();
      if (!key || seen.has(key)) return;
      seen.add(key);
      results.push(c);
    });
  };

  if (domain === "switch") {
    if (typeof CatalogRegistry !== "undefined" && typeof CatalogRegistry.getSwitches === "function") addList(CatalogRegistry.getSwitches());
    if (typeof SWITCH_DATABASE !== "undefined") addList(SWITCH_DATABASE);
  } else if (domain === "firewall") {
    if (typeof CatalogRegistry !== "undefined" && CatalogRegistry.networking) addList(CatalogRegistry.networking.firewalls);
    if (typeof FIREWALL_CATALOG !== "undefined") addList(FIREWALL_CATALOG);
  } else if (domain === "wireless") {
    if (typeof CatalogRegistry !== "undefined" && CatalogRegistry.networking) addList(CatalogRegistry.networking.wireless);
    if (typeof WIRELESS_CATALOG !== "undefined") addList(WIRELESS_CATALOG);
  } else if (domain === "camera") {
    if (typeof CAMERAS_DATABASE !== "undefined") addList(CAMERAS_DATABASE);
    if (typeof GENERIC_CAMERA_TYPES !== "undefined") addList(GENERIC_CAMERA_TYPES);
  } else if (domain === "access_control") {
    if (typeof ACCESS_CONTROL_CATALOG !== "undefined") addList(ACCESS_CONTROL_CATALOG);
    if (typeof CatalogRegistry !== "undefined" && CatalogRegistry.security) addList(CatalogRegistry.security.accessControl);
  } else if (domain === "compute") {
    if (typeof SERVERS_DATABASE !== "undefined") addList(SERVERS_DATABASE);
    if (typeof STREAMVAULT_CATALOG !== "undefined" && Array.isArray(STREAMVAULT_CATALOG)) addList(STREAMVAULT_CATALOG);
    if (typeof MILESTONE_HUSKY_CATALOG !== "undefined" && Array.isArray(MILESTONE_HUSKY_CATALOG)) addList(MILESTONE_HUSKY_CATALOG);
    if (typeof CatalogRegistry !== "undefined" && CatalogRegistry.compute) {
      Object.values(CatalogRegistry.compute).forEach(v => { if (Array.isArray(v)) addList(v); });
    }
  } else if (domain === "power") {
    if (typeof UPS_PDU_CATALOG !== "undefined") {
      if (Array.isArray(UPS_PDU_CATALOG)) addList(UPS_PDU_CATALOG);
      else Object.values(UPS_PDU_CATALOG).forEach(v => { if (Array.isArray(v)) addList(v); });
    }
    if (typeof CatalogRegistry !== "undefined" && CatalogRegistry.power) {
      Object.values(CatalogRegistry.power).forEach(v => { if (Array.isArray(v)) addList(v); });
    }
  } else if (typeof CatalogRegistry !== "undefined" && typeof CatalogRegistry.getAll === "function") {
    addList(CatalogRegistry.getAll());
  }
  return results;
}

function getSwitchActiveUsageSnapshot(item) {
  const ports = Array.isArray(item.physicalPorts) ? item.physicalPorts : [];
  const stackUnits = item.stackedUnits >= 2 ? item.stackedUnits : 1;
  let maxUsedPortInUnit = 0;
  let totalConnectedEdge = 0;
  let totalPoeDrawWatts = 0;
  ports.forEach(p => {
    if (p.connectedDeviceId && !p.isUplink && p.role !== "uplink" && p.role !== "stack_interconnect") {
      totalConnectedEdge++;
      const uPort = p.unitPortNumber || p.portNumber || 0;
      if (uPort > maxUsedPortInUnit) maxUsedPortInUnit = uPort;
      totalPoeDrawWatts += Number(p.poeOutputWatts) || 0;
    }
  });
  return {
    stackUnits,
    totalConnectedEdge,
    maxUsedPortInUnit,
    poeDrawPerChassis: stackUnits > 1 ? Math.ceil(totalPoeDrawWatts / stackUnits) : Math.ceil(totalPoeDrawWatts),
    totalPoeDrawWatts: Math.ceil(totalPoeDrawWatts)
  };
}

function getCompatibleReplacementCandidates(item) {
  const domain = getBomItemReplacementDomain(item);
  const pool = getCatalogPoolForDomain(domain);
  const usage = domain === "switch" ? getSwitchActiveUsageSnapshot(item) : null;
  const curCopper = domain === "switch" ? getSwitchCopperPortCount(item) : (Number(item.ports) || 0);

  return pool.filter(c => {
    if (!c) return false;
    if ((c.sku && c.sku === item.sku) || (c.id && c.id === item.id)) return false;
    return true;
  }).map(c => {
    const candCopper = domain === "switch" ? getSwitchCopperPortCount(c) : (Number(c.ports) || 0);
    const candPoe = Number(c.poeBudget) || 0;
    const warnings = [];
    if (domain === "switch" && usage) {
      if (candCopper < usage.maxUsedPortInUnit || (candCopper * usage.stackUnits) < usage.totalConnectedEdge) {
        warnings.push(`Fewer ports (${candCopper}P vs ${usage.totalConnectedEdge} patched)`);
      }
      if (usage.poeDrawPerChassis > 0 && candPoe < usage.poeDrawPerChassis) {
        warnings.push(`Base PoE ${candPoe}W < ${usage.poeDrawPerChassis}W active load`);
      }
      if (usage.stackUnits >= 2 && c.stacking === false && c.canStack === false) {
        warnings.push(`Does not support hardware stacking`);
      }
    }
    return {
      record: c,
      key: c.id || c.sku,
      sku: c.sku || c.id,
      model: c.model || c.name || c.sku,
      vendor: c.vendor || "Generic",
      msrp: Number(c.msrp) || 0,
      priceDelta: (Number(c.msrp) || 0) - (Number(item.msrp) || 0),
      copperPorts: candCopper,
      samePortTier: candCopper === curCopper,
      poeBudget: candPoe,
      isDropInFit: warnings.length === 0,
      warnings
    };
  });
}

function openReplaceBomItemModal(instanceId) {
  if (!instanceId || typeof projectBOM === "undefined") return;
  const item = projectBOM.find(i => i.instanceId === instanceId);
  if (!item) return;

  ensureBomConfiguratorModals();
  activeBomReplaceInstanceId = instanceId;
  bomReplaceSearchQuery = "";
  bomReplaceVendorFilter = "all";
  bomReplaceMatchPortsOnly = false;
  bomReplacePoeOnly = (Number(item.poeBudget) || 0) > 0;

  const modal = document.getElementById("bomReplaceItemModal");
  if (!modal) return;
  modal.classList.remove("hidden");
  renderReplaceBomItemModalContent();
}

function closeReplaceBomItemModal() {
  const modal = document.getElementById("bomReplaceItemModal");
  if (modal) modal.classList.add("hidden");
  activeBomReplaceInstanceId = null;
}

function renderReplaceBomItemModalContent() {
  const modal = document.getElementById("bomReplaceItemModal");
  if (!modal || !activeBomReplaceInstanceId) return;
  const item = projectBOM.find(i => i.instanceId === activeBomReplaceInstanceId);
  if (!item) {
    closeReplaceBomItemModal();
    return;
  }

  const domain = getBomItemReplacementDomain(item);
  const usage = domain === "switch" ? getSwitchActiveUsageSnapshot(item) : null;
  const allCandidates = getCompatibleReplacementCandidates(item);
  const vendors = Array.from(new Set(allCandidates.map(c => c.vendor).filter(Boolean))).sort();

  const filtered = allCandidates.filter(c => {
    if (bomReplaceVendorFilter !== "all" && c.vendor !== bomReplaceVendorFilter) return false;
    if (bomReplaceMatchPortsOnly && !c.samePortTier) return false;
    if (bomReplacePoeOnly && domain === "switch" && c.poeBudget <= 0) return false;
    if (bomReplaceSearchQuery) {
      const q = bomReplaceSearchQuery.toLowerCase();
      return c.sku.toLowerCase().includes(q) || c.model.toLowerCase().includes(q) || c.vendor.toLowerCase().includes(q);
    }
    return true;
  }).sort((a, b) => {
    if (a.isDropInFit !== b.isDropInFit) return a.isDropInFit ? -1 : 1;
    if (a.samePortTier !== b.samePortTier) return a.samePortTier ? -1 : 1;
    if ((a.vendor === item.vendor) !== (b.vendor === item.vendor)) return a.vendor === item.vendor ? -1 : 1;
    return Math.abs(a.priceDelta) - Math.abs(b.priceDelta);
  });

  modal.innerHTML = `
    <div class="w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
      <!-- Header -->
      <div class="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
        <div class="flex items-center gap-3 min-w-0">
          <div class="p-2 rounded-xl bg-purple-950/80 border border-purple-700/60 text-purple-300 shrink-0">
            <i data-lucide="repeat" class="w-4 h-4"></i>
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <h3 class="text-sm font-bold text-white truncate">Replace / Swap Hardware Model in Place</h3>
              <span class="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-300">
                Current: ${escapeHTML(item.vendor || '')} ${escapeHTML(item.model)} (${escapeHTML(item.sku)})
              </span>
            </div>
            <p class="text-[11px] text-slate-400">Preserves location (<strong class="text-slate-200">${escapeHTML(item.closetName || 'Unassigned')}</strong>${item.rackSlot ? ` • U${item.rackSlot}` : ''}), qty (${item.qty}x), stack config, Topology uplinks, Port Matrix connections, and Physical Layout drops.</p>
          </div>
        </div>
        <button type="button" onclick="closeReplaceBomItemModal()" class="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>
      </div>

      <!-- Filter Bar -->
      <div class="px-5 py-3 bg-slate-950/60 border-b border-slate-800 space-y-2.5 shrink-0 text-xs">
        <div class="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value="${escapeHTML(bomReplaceSearchQuery)}"
            placeholder="Search replacement model or SKU (e.g. C9300-48U, C9350, EX4400, USW-Pro)..."
            oninput="bomReplaceSearchQuery = this.value; renderReplaceBomItemModalContent();"
            class="flex-1 bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-purple-500"
          />
          <select onchange="bomReplaceVendorFilter = this.value; renderReplaceBomItemModalContent();" class="bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs cursor-pointer">
            <option value="all" ${bomReplaceVendorFilter === "all" ? 'selected' : ''}>All Vendors (${allCandidates.length})</option>
            ${vendors.map(v => `<option value="${escapeHTML(v)}" ${bomReplaceVendorFilter === v ? 'selected' : ''}>${escapeHTML(v)}</option>`).join('')}
          </select>
        </div>

        ${domain === "switch" ? `
          <div class="flex items-center justify-between gap-2 flex-wrap text-[11px]">
            <div class="flex items-center gap-3">
              <label class="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                <input type="checkbox" ${bomReplaceMatchPortsOnly ? 'checked' : ''} onchange="bomReplaceMatchPortsOnly = this.checked; renderReplaceBomItemModalContent();" class="rounded border-slate-600 bg-slate-900 text-purple-500" />
                <span>Same Copper Port Count (${getSwitchCopperPortCount(item)}P)</span>
              </label>
              <label class="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                <input type="checkbox" ${bomReplacePoeOnly ? 'checked' : ''} onchange="bomReplacePoeOnly = this.checked; renderReplaceBomItemModalContent();" class="rounded border-slate-600 bg-slate-900 text-purple-500" />
                <span>PoE Capable Only</span>
              </label>
            </div>
            ${usage ? `
              <span class="font-mono text-[10px] text-cyan-300 bg-cyan-950/70 border border-cyan-800/60 px-2 py-0.5 rounded">
                Active State: ${usage.totalConnectedEdge} Patched Ports • ${usage.totalPoeDrawWatts}W PoE Load${usage.stackUnits >= 2 ? ` • ${usage.stackUnits}-Switch Stack` : ''}
              </span>
            ` : ''}
          </div>
        ` : ''}
      </div>

      <!-- Candidate List -->
      <div class="flex-1 overflow-y-auto p-4 space-y-2 text-xs">
        ${filtered.length === 0 ? `
          <div class="py-12 text-center text-slate-400">No replacement models match your current filter criteria.</div>
        ` : filtered.slice(0, 80).map(c => {
          const deltaStr = c.priceDelta === 0 ? "$0 delta" : (c.priceDelta > 0 ? `+${c.priceDelta.toLocaleString()}/ea` : `-${Math.abs(c.priceDelta).toLocaleString()}/ea`);
          return `
            <div class="p-3 rounded-xl bg-slate-950/80 hover:bg-slate-950 border ${c.isDropInFit ? 'border-slate-800 hover:border-purple-500/60' : 'border-amber-800/50 hover:border-amber-500/70'} flex items-center justify-between gap-3 transition-all">
              <div class="min-w-0 space-y-1">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] font-mono text-slate-300">${escapeHTML(c.vendor)}</span>
                  <span class="font-bold text-white text-xs">${escapeHTML(c.model)}</span>
                  <span class="text-[11px] font-mono text-slate-400">(${escapeHTML(c.sku)})</span>
                  ${c.isDropInFit ? `
                    <span class="px-1.5 py-0.2 rounded bg-emerald-950/90 border border-emerald-700/60 text-emerald-300 text-[10px] font-mono font-bold">✓ Drop-In Fit</span>
                  ` : c.warnings.map(w => `
                    <span class="px-1.5 py-0.2 rounded bg-amber-950/90 border border-amber-700/60 text-amber-300 text-[10px] font-mono">${escapeHTML(w)}</span>
                  `).join('')}
                </div>
                <div class="text-[11px] font-mono text-slate-400 flex items-center gap-2 flex-wrap">
                  ${c.copperPorts > 0 ? `<span>${c.copperPorts} Ports</span><span>&bull;</span>` : ''}
                  ${c.poeBudget > 0 ? `<span class="text-amber-300">${c.poeBudget}W PoE (${escapeHTML(c.record.poeStandard || 'PoE+')})</span><span>&bull;</span>` : ''}
                  ${c.record.uplinksSummary ? `<span class="text-indigo-300">${escapeHTML(c.record.uplinksSummary)}</span>` : ''}
                </div>
              </div>

              <div class="flex items-center gap-3 shrink-0">
                <div class="text-right font-mono">
                  <div class="text-sm font-bold text-emerald-400">${c.msrp.toLocaleString()}</div>
                  <div class="text-[10px] ${c.priceDelta > 0 ? 'text-amber-300' : (c.priceDelta < 0 ? 'text-emerald-300' : 'text-slate-400')}">${deltaStr}</div>
                </div>
                <button
                  type="button"
                  onclick="replaceBomHardwareItem('${item.instanceId}', '${escapeJSAttr(c.key)}'); closeReplaceBomItemModal();"
                  class="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                >
                  <i data-lucide="repeat" class="w-3.5 h-3.5"></i>
                  <span>Swap In</span>
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  if (typeof safeCreateIcons === "function") safeCreateIcons(modal);
  else if (window.lucide) { try { lucide.createIcons(); } catch (e) {} }
}

function replaceBomHardwareItem(instanceId, newCatalogKey, options = {}) {
  if (!instanceId || !newCatalogKey || typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) return null;
  const item = projectBOM.find(i => i.instanceId === instanceId);
  if (!item) return null;

  const domain = getBomItemReplacementDomain(item);

  // Delegate cameras to upgradeSingleCameraInstance if available so FOV/pixel-density/floorplan stay synced,
  // while falling through if upgradeSingleCameraInstance is unavailable.
  if (domain === "camera" && typeof upgradeSingleCameraInstance === "function") {
    upgradeSingleCameraInstance(instanceId, newCatalogKey);
    return item;
  }

  const pool = getCatalogPoolForDomain(domain);
  let newCat = pool.find(c => c && (c.id === newCatalogKey || c.sku === newCatalogKey)) ||
    (typeof CatalogRegistry !== "undefined" && (CatalogRegistry.getSwitch?.(newCatalogKey) || CatalogRegistry.get?.(newCatalogKey))) ||
    null;
  if (!newCat) return null;

  const oldModel = item.model;
  const oldSku = item.sku;
  const oldVendor = item.vendor;
  const oldStacked = parseInt(item.stackedUnits, 10) || 0;
  const hadCustomFriendly = Boolean(item.customFriendlyName || (item.friendlyName && item.friendlyName !== oldModel && !item.friendlyName.startsWith(`${item.deviceNumber || ''} `)));

  // Capture existing child accessory intent before migrating
  const oldChildren = projectBOM.filter(ch => ch.parentInstanceId === instanceId);
  const oldSled = oldChildren.find(ch => ch.role === "Uplink Module");
  const hadRedundantPsu = Boolean(item.hasRedundantPsu || (item.secondaryPsuSku && item.secondaryPsuSku !== "none") || oldChildren.some(ch => ch.instanceId === `psu2-${instanceId}`));
  const oldSecondaryWatts = item.secondaryPsuSku ? getPsuWattageBySku(item.secondaryPsuSku) : 0;
  const hadSpareFan = oldChildren.some(ch => ch.role === "Cooling & Fans");

  // Capture existing PortEngine port custom tags/patch coordinates for switches
  const savedPortCustomMap = new Map();
  if (Array.isArray(item.physicalPorts)) {
    item.physicalPorts.forEach(p => {
      if (p.connectedDeviceId && !p.isUplink && p.role !== "uplink" && p.role !== "stack_interconnect") {
        savedPortCustomMap.set(p.connectedDeviceId, {
          portNumber: p.portNumber,
          unitIndex: p.unitIndex || 1,
          unitPortNumber: p.unitPortNumber || p.portNumber,
          customPatchPanelId: p.customPatchPanelId || null,
          customKeystoneJack: p.customKeystoneJack || null
        });
      }
    });
  }

  // Update core hardware specs in-place (preserving instanceId, closetName, rackId, rackSlot, rackU, qty, uplinkTargetId, etc.!)
  const fallbackBaseWatts = newCat.role === "Core" ? 250 : (newCat.role === "Aggregation" ? 150 : ((parseInt(newCat.ports, 10) || 0) >= 48 ? 65 : 35));
  const baseWatts = newCat.baseWatts !== undefined ? Number(newCat.baseWatts) : fallbackBaseWatts;

  item.id = newCat.id || newCat.sku;
  item.sku = newCat.sku || newCat.id;
  item.model = newCat.model || newCat.name || item.sku;
  item.vendor = newCat.vendor || item.vendor;
  if (newCat.role) item.role = newCat.role;
  if (newCat.category) item.category = newCat.category;
  item.msrp = Number(newCat.msrp) || 0;
  if (newCat.ports !== undefined) item.ports = parseInt(newCat.ports, 10) || 0;
  item.poeStandard = newCat.poeStandard || (Number(newCat.poeBudget) > 0 ? "802.3at" : "None");
  item.poeBudget = parseInt(newCat.poeBudget, 10) || 0;
  item.baseWatts = baseWatts;
  item.maxPowerWatts = newCat.maxPowerWatts !== undefined ? Number(newCat.maxPowerWatts) : (baseWatts + item.poeBudget);
  item.heatBtuPerHour = newCat.heatBtuPerHour !== undefined ? Number(newCat.heatBtuPerHour) : Math.round(baseWatts * 3.412);
  item.rackUnits = newCat.rackUnits !== undefined ? newCat.rackUnits : (item.rackUnits !== undefined ? item.rackUnits : 1);
  item.depthInches = newCat.depthInches !== undefined ? newCat.depthInches : 12;
  item.shallowDepth = Boolean(newCat.shallowDepth);
  item.weightLbs = newCat.weightLbs || 0;
  item.mounting = newCat.mounting || "";
  item.fanless = Boolean(newCat.fanless);
  item.dualPsu = Boolean(newCat.dualPsu);
  item.psuSku = newCat.psuSku || null;
  item.defaultPsuSku = newCat.defaultPsuSku || null;
  item.maxPsuBays = newCat.maxPsuBays || (newCat.dualPsu ? 2 : 1);
  item.supportedPrimaryPsus = Array.isArray(newCat.supportedPrimaryPsus) ? [...newCat.supportedPrimaryPsus] : null;
  item.supportedSecondaryPsus = Array.isArray(newCat.supportedSecondaryPsus) ? [...newCat.supportedSecondaryPsus] : null;
  item.stackPowerSupported = Boolean(newCat.stackPowerSupported);
  item.stackPowerShortSku = newCat.stackPowerShortSku || null;
  item.stackPowerLongSku = newCat.stackPowerLongSku || null;
  item.fanSku = newCat.fanSku || null;
  item.switchingCapacity = newCat.switchingCapacity || null;
  item.throughputMpps = newCat.throughputMpps || null;
  item.packetBufferMb = newCat.packetBufferMb || null;
  item.portFormFactorSummary = newCat.portFormFactorSummary || "";
  item.uplinksSummary = newCat.uplinksSummary || "";
  item.portsBreakdown = newCat.portsBreakdown || null;
  item.interfaces = newCat.interfaces || null;
  item.poeAfPorts = newCat.poeAfPorts || 0;
  item.poeAtPorts = newCat.poeAtPorts || 0;
  item.poeBt60Ports = newCat.poeBt60Ports || 0;
  item.poeBt90Ports = newCat.poeBt90Ports || 0;
  item.poeStandardsSupported = newCat.poeStandardsSupported || [];
  item.image = newCat.image || "";
  item.datasheetPath = newCat.datasheet || newCat.datasheetPath || "";
  item.stackCableSku = newCat.stackCableSku || null;
  item.portSpeed = newCat.portSpeed || "1G";
  item.maxBackboneSpeed = newCat.maxBackboneSpeed || "10G";
  item.modularUplink = newCat.modularUplink || null;
  item.compatibleAccessories = newCat.compatibleAccessories || [];
  item.featureLicenses = newCat.featureLicenses || [];

  if (!hadCustomFriendly) {
    item.friendlyName = null;
  }

  if (domain === "switch") {
    const newCanStack = newCat.stacking !== undefined ? Boolean(newCat.stacking) : (newCat.canStack !== undefined ? Boolean(newCat.canStack) : (newCat.role === "Access" || newCat.role === "Aggregation"));
    item.canStack = newCanStack;
    if (oldStacked >= 2 && !newCanStack) {
      item.stackedUnits = 0;
      item.patchPanelBetween = false;
      item.cableManagerBetween = false;
      item.stackPowerEnabled = false;
    }

    // Remove old model-specific child accessories (PSUs, uplink sled, mount, fan, feature/mgmt licenses, stack/spwr cables)
    projectBOM = projectBOM.filter(ch => {
      if (ch.parentInstanceId !== instanceId) return true;
      if (ch.source === "manual_bom_accessory" && (ch.vendor === item.vendor || ch.vendor === "Panduit" || ch.vendor === "Generic")) return true;
      return false;
    });

    // 1. Migrate Modular Uplink Module
    if (newCat.modularUplink && newCat.modularUplink.hasSlot) {
      const supported = newCat.modularUplink.supportedModules || [];
      let chosenModSku = newCat.modularUplink.defaultModuleSku || supported[0] || "none";
      if (oldSled && supported.length > 0) {
        if (supported.includes(oldSled.sku)) {
          chosenModSku = oldSled.sku;
        } else {
          const oldModSpec = (typeof MODULAR_UPLINK_CATALOG !== "undefined") ? MODULAR_UPLINK_CATALOG[oldSled.sku] : null;
          const oldSpeed = (oldModSpec?.speed || oldSled.model || "").toUpperCase();
          const speedMatch = supported.find(s => {
            const m = (typeof MODULAR_UPLINK_CATALOG !== "undefined") ? MODULAR_UPLINK_CATALOG[s] : null;
            const sp = (m?.speed || m?.name || "").toUpperCase();
            return (oldSpeed.includes("40G") && sp.includes("40G")) ||
                   (oldSpeed.includes("25G") && sp.includes("25G")) ||
                   (oldSpeed.includes("10G") && sp.includes("10G"));
          });
          if (speedMatch) chosenModSku = speedMatch;
        }
      }
      item.installedUplinkModuleSku = chosenModSku;
      if (chosenModSku && chosenModSku !== "none" && typeof MODULAR_UPLINK_CATALOG !== "undefined" && MODULAR_UPLINK_CATALOG[chosenModSku]) {
        const mod = MODULAR_UPLINK_CATALOG[chosenModSku];
        projectBOM.push({
          instanceId: `mod-${instanceId}`,
          parentInstanceId: instanceId,
          id: mod.sku,
          model: mod.name,
          sku: mod.sku,
          role: "Uplink Module",
          vendor: item.vendor,
          msrp: mod.msrp,
          poeBudget: 0,
          baseWatts: 15,
          closetName: item.closetName,
          rackId: item.rackId,
          qty: getRequiredUplinkModuleQty(item)
        });
      }
    } else {
      item.installedUplinkModuleSku = undefined;
    }

    // 2. Migrate Primary & Secondary PSUs + PoE Budget
    const newPrimarySku = newCat.defaultPsuSku || (Array.isArray(newCat.supportedPrimaryPsus) && newCat.supportedPrimaryPsus[0]) || "included";
    let newSecondarySku = "none";
    if (hadRedundantPsu) {
      const secList = Array.isArray(newCat.supportedSecondaryPsus) ? newCat.supportedSecondaryPsus : (newCat.psuSku ? [newCat.psuSku] : []);
      if (secList.length > 0) {
        if (oldSecondaryWatts > 0) {
          newSecondarySku = secList.slice().sort((a, b) => Math.abs(getPsuWattageBySku(a) - oldSecondaryWatts) - Math.abs(getPsuWattageBySku(b) - oldSecondaryWatts))[0];
        } else {
          newSecondarySku = newCat.psuSku && secList.includes(newCat.psuSku) ? newCat.psuSku : secList[0];
        }
      }
    }
    item.tertiaryPsuSku = null;
    applyBomItemPsuConfig(instanceId, {
      primaryPsuSku: newPrimarySku,
      secondaryPsuSku: newSecondarySku,
      tertiaryPsuSku: "none",
      silent: true
    });

    // 3. Migrate Spare Fan if present
    if (hadSpareFan && newCat.fanSku) {
      toggleBomItemSpareFan(instanceId, true);
    }

    // 4. Migrate Mount Hardware for current host/rack
    item.selectedMountSku = "included";
    if (typeof autoSelectMountingForHost === "function" && (item.closetName || item.rackId)) {
      autoSelectMountingForHost(item, item.closetName || item.rackId);
    }

    // 5. Migrate StackPower, Stacking Cables, and 48P/24P Standard Pod / In-Between Patch Panels
    if (!supportsCiscoStackPower(item)) {
      item.stackPowerEnabled = false;
    } else if (item.stackedUnits >= 2 && item.stackPowerEnabled === undefined) {
      item.stackPowerEnabled = true;
    }
    applyStackCabling(item);
    if (item.standardPod) {
      applyStandardPodCabling(item);
    }

    // 6. Migrate Management Subscription
    if (item.vendor === "Cisco" || item.vendor === "Meraki") {
      const term = (typeof globalSelectedTerm !== "undefined" && globalSelectedTerm) ? globalSelectedTerm : "1YR";
      applyManagementSubscription(instanceId, "cloud", term);
    } else {
      item.selectedMgmtProfile = "standalone";
    }

    // 7. Re-initialize Physical Ports & Restore Connected Edge Devices
    if (typeof PortEngine !== "undefined") {
      PortEngine.initSwitchPorts(item, true);
      const maxAccessPortNum = (item.physicalPorts || [])
        .filter(p => !p.isUplink && p.role !== "uplink" && p.role !== "stack_interconnect")
        .reduce((mx, p) => Math.max(mx, p.portNumber || 0), 0);

      projectBOM.forEach(dev => {
        if (dev && dev.uplinkTargetId === instanceId && dev.assignedSwitchPort) {
          if (parseInt(dev.assignedSwitchPort, 10) > maxAccessPortNum) {
            // Clear overflow port assignment so syncAllSwitchPorts packs it onto an available port
            dev.assignedSwitchPort = null;
          }
        }
      });

      PortEngine.syncAllSwitchPorts();

      // Restore custom patch panel coordinates where ports remain valid
      if (Array.isArray(item.physicalPorts)) {
        item.physicalPorts.forEach(p => {
          if (p.connectedDeviceId && savedPortCustomMap.has(p.connectedDeviceId)) {
            const saved = savedPortCustomMap.get(p.connectedDeviceId);
            if (saved.customPatchPanelId) p.customPatchPanelId = saved.customPatchPanelId;
            if (saved.customKeystoneJack) p.customKeystoneJack = saved.customKeystoneJack;
          }
        });
      }
    }

    if (typeof recalculateAutoUplinks === "function") {
      recalculateAutoUplinks();
    }
  } else {
    // Non-switch domain (Firewall, Wireless AP, Access Control, Server, UPS/PDU): clean old vendor licenses and re-apply if Cisco/Meraki
    projectBOM = projectBOM.filter(ch => !(ch.parentInstanceId === instanceId && (ch.role === "Mgmt License" || ch.role === "Security License" || ch.role === "Feature License")));
    if (item.vendor === "Cisco" || item.vendor === "Meraki") {
      const term = (typeof globalSelectedTerm !== "undefined" && globalSelectedTerm) ? globalSelectedTerm : "1YR";
      applyManagementSubscription(instanceId, "cloud", term);
    }
    if (typeof PortEngine !== "undefined" && typeof PortEngine.initDeviceInterfaces === "function") {
      PortEngine.initDeviceInterfaces(item);
    }
  }

  // Sync Physical Layout Floorplan Node Metadata if placed on canvas
  if (typeof facilityFloors !== "undefined" && Array.isArray(facilityFloors)) {
    facilityFloors.forEach(fl => {
      (fl.nodes || []).forEach(n => {
        if (n && (n.instanceId === instanceId || n.id === instanceId || n.id === `dev-${instanceId}`)) {
          n.sku = item.sku;
          n.model = item.model;
          n.vendor = item.vendor;
        }
      });
    });
  }

  if (typeof DeviceTaxonomy !== "undefined" && typeof DeviceTaxonomy.recalculateNumbers === "function") {
    DeviceTaxonomy.recalculateNumbers(projectBOM);
  }

  refreshAllViewsAfterBomConfigChange();
  if (typeof renderCableCanvas === "function") renderCableCanvas();

  if (!options.silent && typeof showToast === "function") {
    showToast(`Swapped ${oldVendor || ''} ${oldModel} (${oldSku}) → ${item.vendor || ''} ${item.model} (${item.sku}) in ${item.closetName || 'BOM'}`);
  }

  return item;
}


// Window Compatibility Exports
window.addToBOM = addToBOM;
window.addToProjectBOM = addToProjectBOM;
window.addFirewallToBOM = addFirewallToBOM;
window.addOpticsToBOM = addOpticsToBOM;
window.addWirelessToBOM = addWirelessToBOM;
window.addServerToBOM = addServerToBOM;
window.addCameraToBOM = addCameraToBOM;
window.addAccessDeviceToBOM = addAccessDeviceToBOM;
window.handleLocationDropdownChange = handleLocationDropdownChange;
window.setItemLocation = setItemLocation;
window.updateDeviceMountMethod = updateDeviceMountMethod;
window.updateBOMView = updateBOMView;
window.removeBomItem = removeBomItem;
window.deleteDeviceFromBOM = deleteDeviceFromBOM;
window.clearBom = clearBom;
window.changeBomQty = changeBomQty;
window.toggleBomDrawer = toggleBomDrawer;
window.exportBomCSV = exportBomCSV;
window.compileProjectEngineeringData = compileProjectEngineeringData;
window.exportComprehensiveProjectCSV = exportComprehensiveProjectCSV;
window.auditSwitchCapacities = auditSwitchCapacities;
window.autoResolveUplinks = autoResolveUplinks;
window.updateStackedCount = updateStackedCount;
window.applyStackCabling = applyStackCabling;
window.applyStandardPodCabling = applyStandardPodCabling;
window.jumpToBomTarget = jumpToBomTarget;
window.openFacilityCreationForLocation = openFacilityCreationForLocation;
window.getPendingFacilityLocationContext = () => pendingFacilityLocationContext;
window.clearPendingFacilityLocationContext = () => { pendingFacilityLocationContext = null; };
window.unbundleMultiQtyCameras = unbundleMultiQtyCameras;
window.setBomViewMode = setBomViewMode;
window.renderBomFlatSkuItemHtml = renderBomFlatSkuItemHtml;
window.changeRawSkuQty = changeRawSkuQty;
window.deleteRawSkuFromBOM = deleteRawSkuFromBOM;
window.toggleBomModal = toggleBomModal;
window.setBomSearchQuery = setBomSearchQuery;
window.clearBomSearch = clearBomSearch;
window.setBomLocationFilter = setBomLocationFilter;
window.setBomCategoryFilter = setBomCategoryFilter;
window.toggleBomLocationCollapse = toggleBomLocationCollapse;
window.toggleBomExpandAll = toggleBomExpandAll;
window.resetBomFilters = resetBomFilters;
window.getSwitchCopperPortCount = getSwitchCopperPortCount;
window.resolveSwitch24PortOffset = resolveSwitch24PortOffset;
window.resolve24PortCordLengthFt = resolve24PortCordLengthFt;
window.resolveSwitchPatchPanelConfig = resolveSwitchPatchPanelConfig;
window.setBomItem24PortOffsetOptions = setBomItem24PortOffsetOptions;
window.getRequiredUplinkModuleQty = getRequiredUplinkModuleQty;
window.supportsCiscoStackPower = supportsCiscoStackPower;
window.resolveCiscoStackPowerCables = resolveCiscoStackPowerCables;
window.toggleSwitchStackPower = toggleSwitchStackPower;
window.calculateSwitchPoeBudgetForPsus = calculateSwitchPoeBudgetForPsus;
window.applyBomItemPsuConfig = applyBomItemPsuConfig;
window.openBomItemAccessoriesModal = openBomItemAccessoriesModal;
window.closeBomItemAccessoriesModal = closeBomItemAccessoriesModal;
window.renderBomItemAccessoriesModalContent = renderBomItemAccessoriesModalContent;
window.handleBomModalPsuChange = handleBomModalPsuChange;
window.setBomItemMount = setBomItemMount;
window.setBomUplinkStackPolicy = setBomUplinkStackPolicy;
window.toggleBomStackBlankPlates = toggleBomStackBlankPlates;
window.setBomItemStackPowerOptions = setBomItemStackPowerOptions;
window.setBomItemPatchPanelOptions = setBomItemPatchPanelOptions;
window.toggleBomItemCableManagerBetween = toggleBomItemCableManagerBetween;
window.toggleBomItemSpareFan = toggleBomItemSpareFan;
window.toggleBomItemFeatureLicense = toggleBomItemFeatureLicense;
window.setBomItemMgmtTerm = setBomItemMgmtTerm;
window.addAccessoryToBomItem = addAccessoryToBomItem;
window.changeBomChildAccessoryQty = changeBomChildAccessoryQty;
window.removeBomChildAccessory = removeBomChildAccessory;
window.openReplaceBomItemModal = openReplaceBomItemModal;
window.closeReplaceBomItemModal = closeReplaceBomItemModal;
window.renderReplaceBomItemModalContent = renderReplaceBomItemModalContent;
window.getCompatibleReplacementCandidates = getCompatibleReplacementCandidates;
window.replaceBomHardwareItem = replaceBomHardwareItem;



