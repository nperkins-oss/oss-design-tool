// ==========================================
// BILL OF MATERIALS (BOM) & LICENSING ENGINE (NetSelect Enterprise)
// Integrated with FacilityStore & Universal Workspace Dispatcher
// ==========================================

let projectBOM = [];
try {
  Object.defineProperty(window, "projectBOM", {
    get: () => projectBOM,
    set: (val) => { projectBOM = val; },
    configurable: true
  });
} catch(e) {}
let bomViewMode = "grouped"; // "grouped" | "category" | "flat"
let bomSearchQuery = "";
let bomSelectedLocation = "all";
let bomSelectedCategory = "all";
let bomCollapsedLocations = new Set();
let bomAllExpanded = true;
let globalSelectedTerm = "1YR";

function saveBOMState() {
  if (typeof queueAutoSave === "function") {
    queueAutoSave();
  } else if (typeof saveStateToLocalStorage === "function") {
    saveStateToLocalStorage();
  }
}

// -----------------------------------------------------------
// Meraki License Compliance
// -----------------------------------------------------------
function checkMerakiCompliance() {
  const merakiDevices = projectBOM.filter(i => !i.parentInstanceId && (i.vendor === "Meraki" || (i.vendor === "Cisco" && i.selectedMgmtProfile !== "standalone")));
  if (!merakiDevices || merakiDevices.length === 0) return { compliant: true, missingCount: 0 };

  let unmanagedCount = 0;
  merakiDevices.forEach(dev => {
    const hasLicense = projectBOM.some(i => i.parentInstanceId === dev.instanceId && (i.role === "Mgmt License" || i.role === "Security License"));
    if (!hasLicense) unmanagedCount++;
  });

  return {
    compliant: unmanagedCount === 0,
    missingCount: unmanagedCount
  };
}

function autoFixMerakiLicenses() {
  const merakiDevices = projectBOM.filter(i => !i.parentInstanceId && (i.vendor === "Meraki" || (i.vendor === "Cisco" && i.selectedMgmtProfile !== "standalone")));
  merakiDevices.forEach(dev => {
    dev.selectedMgmtProfile = "cloud";
    const term = dev.individualTerm || globalSelectedTerm || "1YR";
    applyManagementSubscription(dev.instanceId, "cloud", term);
  });

  FacilityStore.notifyWorkspaceChange();
  showToast(`Attached ${globalSelectedTerm || '1YR'} Meraki Enterprise licenses.`);
}

// -----------------------------------------------------------
// BOM Taxonomy Categories & Display Profiles
// -----------------------------------------------------------
const BOM_CATEGORIES = {
  switches: { id: "switches", label: "Switches & Core Networking", icon: "network", color: "indigo" },
  firewalls: { id: "firewalls", label: "Firewalls & Security Appliances", icon: "shield", color: "rose" },
  wireless: { id: "wireless", label: "Wireless APs & Bridges", icon: "wifi", color: "sky" },
  surveillance: { id: "surveillance", label: "Video Surveillance & Cameras", icon: "video", color: "amber" },
  access_control: { id: "access_control", label: "Access Control System (ACS)", icon: "key-round", color: "orange" },
  servers: { id: "servers", label: "Servers & Compute Systems", icon: "hard-drive", color: "blue" },
  racks_power: { id: "racks_power", label: "Racks, Power & PDUs", icon: "server", color: "purple" },
  optics_cabling: { id: "optics_cabling", label: "Transceivers, DACs & Structured Cabling", icon: "cable", color: "emerald" },
  licensing: { id: "licensing", label: "Software Licenses & Subscriptions", icon: "key", color: "fuchsia" },
  other: { id: "other", label: "Accessories & Supporting Hardware", icon: "box", color: "slate" }
};

function getBomItemCategoryKey(item) {
  if (!item) return "other";
  const cat = String(item.category || "").toLowerCase();
  const role = String(item.role || "").toLowerCase();

  if (cat === "licensing" || cat === "software" || cat === "vms_software" || role.includes("license") || role.includes("subscription") || role.includes("maintenance") || role.includes("database")) {
    return "licensing";
  }
  if (cat === "camera" || role.includes("camera") || role.includes("surveillance") || item.deviceTypePrefix === "CAM" || item.deviceTypePrefix === "LPR") {
    return "surveillance";
  }
  if (cat === "access_control" || role.includes("access control") || role.includes("door") || role.includes("reader") || item.deviceTypePrefix === "AC") {
    return "access_control";
  }
  if (cat === "firewall" || role.includes("firewall") || role.includes("security gateway") || item.deviceTypePrefix === "FW") {
    return "firewalls";
  }
  if (cat === "wireless" || role.includes("wireless") || role.includes("access point") || item.deviceTypePrefix === "AP") {
    return "wireless";
  }
  if (cat === "servers" || cat === "server" || role.includes("server") || item.deviceTypePrefix === "SRV") {
    return "servers";
  }
  if (cat === "racks" || cat === "rack" || cat === "pdu" || cat === "pdus" || cat === "ups" || cat === "power_cords" || cat === "power_cord" || role.includes("rack") || role.includes("pdu") || role.includes("ups") || role.includes("enclosure") || role.includes("cord") || role.includes("jumper")) {
    return "racks_power";
  }
  if (cat === "optics" || cat === "cabling" || cat === "transceivers" || role.includes("optic") || role.includes("dac") || role.includes("patch") || role.includes("cabling")) {
    return "optics_cabling";
  }
  if (cat === "switches" || role.includes("access") || role.includes("core") || role.includes("aggregation") || role.includes("switch") || item.deviceTypePrefix === "SW") {
    return "switches";
  }
  return "other";
}

// -----------------------------------------------------------
// View Mode Switcher
// -----------------------------------------------------------
function setBomViewMode(mode) {
  bomViewMode = (mode === "flat") ? "flat" : (mode === "category" ? "category" : "grouped");
  const grpBtn = document.getElementById("bomViewMode-grouped");
  const catBtn = document.getElementById("bomViewMode-category");
  const fltBtn = document.getElementById("bomViewMode-flat");

  const activeClass = "px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-brand-600 transition-colors cursor-pointer flex items-center gap-1.5";
  const inactiveClass = "px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5";

  if (grpBtn) grpBtn.className = (bomViewMode === "grouped") ? activeClass : inactiveClass;
  if (catBtn) catBtn.className = (bomViewMode === "category") ? activeClass : inactiveClass;
  if (fltBtn) fltBtn.className = (bomViewMode === "flat") ? activeClass : inactiveClass;

  bomCollapsedLocations.clear();
  bomAllExpanded = true;
  const btnText = document.getElementById("bomExpandCollapseText");
  if (btnText) btnText.textContent = "Collapse All";

  updateBOMView();
}

function setBomSearchQuery(query) {
  bomSearchQuery = (query || "").trim();
  const clearBtn = document.getElementById("bomSearchClearBtn");
  if (clearBtn) {
    if (bomSearchQuery.length > 0) {
      clearBtn.classList.remove("hidden");
    } else {
      clearBtn.classList.add("hidden");
    }
  }
  updateBOMView();
}

function clearBomSearch() {
  bomSearchQuery = "";
  const input = document.getElementById("bomSearchInput");
  if (input) input.value = "";
  const clearBtn = document.getElementById("bomSearchClearBtn");
  if (clearBtn) clearBtn.classList.add("hidden");
  updateBOMView();
}

function setBomLocationFilter(loc) {
  bomSelectedLocation = loc || "all";
  updateBOMView();
}

function setBomCategoryFilter(cat) {
  bomSelectedCategory = cat || "all";
  updateBOMView();
}

function toggleBomLocationCollapse(locKey) {
  if (bomCollapsedLocations.has(locKey)) {
    bomCollapsedLocations.delete(locKey);
  } else {
    bomCollapsedLocations.add(locKey);
  }
  updateBOMView();
}

function toggleBomExpandAll() {
  bomAllExpanded = !bomAllExpanded;
  const btnText = document.getElementById("bomExpandCollapseText");
  if (btnText) {
    btnText.textContent = bomAllExpanded ? "Collapse All" : "Expand All";
  }
  if (bomAllExpanded) {
    bomCollapsedLocations.clear();
  } else {
    if (bomViewMode === "category") {
      bomCollapsedLocations = new Set(Object.keys(BOM_CATEGORIES));
    } else {
      const locKeys = new Set();
      projectBOM.forEach(item => {
        if (!item.parentInstanceId) {
          const rawLoc = item.closetName || item.rackId || (typeof FacilityStore !== "undefined" ? FacilityStore.UNASSIGNED : "Unassigned");
          locKeys.add(typeof FacilityStore !== "undefined" ? FacilityStore.normalize(rawLoc) : rawLoc);
        }
      });
      bomCollapsedLocations = locKeys;
    }
  }
  updateBOMView();
}

function resetBomFilters() {
  bomSearchQuery = "";
  bomSelectedLocation = "all";
  bomSelectedCategory = "all";
  const searchInput = document.getElementById("bomSearchInput");
  if (searchInput) searchInput.value = "";
  const clearBtn = document.getElementById("bomSearchClearBtn");
  if (clearBtn) clearBtn.classList.add("hidden");
  const locSelect = document.getElementById("bomLocationFilter");
  if (locSelect) locSelect.value = "all";
  const catSelect = document.getElementById("bomCategoryFilter");
  if (catSelect) catSelect.value = "all";
  updateBOMView();
}

// -----------------------------------------------------------
// Locations & Holding Bin Connectors
// -----------------------------------------------------------
function getAllDefinedLocations() {
  if (typeof FacilityStore !== "undefined") {
    return FacilityStore.getLocationNames(true); // Includes "Unassigned"
  }
  return ["Unassigned"];
}

function renderBomLocationOptions(currentLocationKey, item = null) {
  if (typeof FacilityStore === "undefined") {
    const locs = ["Unassigned"];
    return locs.map(l => `<option value="${escapeHTML(l)}" ${l === currentLocationKey ? 'selected' : ''}>${escapeHTML(l)}</option>`).join('');
  }

  const isServer = item ? (typeof isServerDevice === "function" ? isServerDevice(item) : (item.role === "Server" || item.category === "servers" || /server/i.test(item.role || ''))) : false;
  const groups = window._cachedBomLocationGroups || FacilityStore.getLocationGroups(true);
  let html = `<option value="${FacilityStore.UNASSIGNED}" ${currentLocationKey === FacilityStore.UNASSIGNED ? 'selected' : ''}>Unassigned (Staging)</option>`;

  // Spaces & Zones (Field locations) are prohibited for server-class hardware
  if (!isServer && groups.spaces.length > 0) {
    html += `<optgroup label="Spaces & Zones (Field / Unenclosed)">`;
    groups.spaces.forEach(s => {
      const isSel = currentLocationKey === s.name;
      html += `<option value="${escapeHTML(s.name)}" ${isSel ? 'selected' : ''}>${escapeHTML(s.displayName || s.name)}</option>`;
    });
    html += `</optgroup>`;
  }

  if (groups.enclosures.length > 0) {
    html += `<optgroup label="Racks & Enclosures">`;
    groups.enclosures.forEach(e => {
      const isSel = currentLocationKey === e.name;
      html += `<option value="${escapeHTML(e.name)}" ${isSel ? 'selected' : ''}>${escapeHTML(e.displayName || e.name)}</option>`;
    });
    html += `</optgroup>`;
  }

  html += `<option value="new_location">+ Create New Location...</option>`;
  return html;
}

function formatMountMethodLabel(m) {
  if (!m) return "Wall Mount";
  switch (m.toLowerCase()) {
    case "ceiling": return "Ceiling / Soffit";
    case "pole": return "Pole / Mast";
    case "parapet": return "Parapet Roof";
    case "corner": return "Corner Bracket";
    default: return "Wall Mount";
  }
}

let pendingFacilityLocationContext = null;

function openFacilityCreationForLocation(ctx) {
  pendingFacilityLocationContext = ctx;

  // Open the Facility Hierarchy Modal
  const modal = document.getElementById("facilityModal");
  if (modal && modal.classList.contains("hidden")) {
    if (typeof toggleFacilityModal === "function") {
      toggleFacilityModal();
    }
  }

  // Ensure we are in the Hierarchy & Spaces view
  if (typeof switchFacilityView === "function") {
    switchFacilityView("hierarchy");
  }

  // Open the Space creation form by default
  if (typeof openFacilityAddForm === "function") {
    openFacilityAddForm("add_space");
  }

  if (typeof showToast === "function") {
    showToast("Opened Facility & Enclosure tool. Create a Space or Enclosure to assign your equipment.");
  }
}

function handleLocationDropdownChange(selectEl, callback, context) {
  if (!selectEl) return;
  if (selectEl.value === "new_location") {
    const prevVal = selectEl.getAttribute("data-previous-val") || "Unassigned";
    selectEl.value = prevVal;

    openFacilityCreationForLocation({
      selectEl: selectEl,
      callback: callback,
      context: context,
      prevVal: prevVal
    });
  } else {
    selectEl.setAttribute("data-previous-val", selectEl.value);
    if (typeof callback === "function") callback(selectEl.value);
  }
}

function setItemLocation(instanceId, combinedKey) {
  if (combinedKey === "new_location") return;

  const normalized = typeof FacilityStore !== "undefined" ? FacilityStore.normalize(combinedKey) : combinedKey;
  const item = projectBOM.find(i => i.instanceId === instanceId);
  
  if (item) {
    const isServer = (typeof isServerDevice === "function" ? isServerDevice(item) : (item.role === "Server" || item.category === "servers" || /server/i.test(item.role || '')));
    const isField = typeof isFieldLocation === "function" ? isFieldLocation(normalized) : (normalized.endsWith("• Field") || normalized.toLowerCase().includes("field"));
    if (isServer && isField) {
      if (typeof showToast === "function") {
        showToast("Servers cannot be added to field locations. Please assign to an enclosure or rack.", 4000);
      }
      if (typeof updateBOMView === "function") updateBOMView();
      return;
    }

    item.closetName = normalized;
    item.rackId = normalized;
    item.rackSlot = null; // Unslot from physical rail to avoid collisions in the new rack
    item.rackU = null;

    // Propagate location update to any child accessories/modules/licenses
    projectBOM.forEach(ch => {
      if (ch.parentInstanceId === item.instanceId) {
        ch.closetName = normalized;
        ch.rackId = normalized;
      }
    });

    FacilityStore.notifyWorkspaceChange();
    showToast(normalized === FacilityStore.UNASSIGNED ? `Moved ${item.model} to Unassigned Staging` : `Moved ${item.model} to ${normalized}`);
  }
}

// -----------------------------------------------------------
// Universal Catalog Enrichment & Hardware Line Item Creation
// -----------------------------------------------------------
function enrichBOMItemFromCatalog(item) {
  if (!item) return item;

  const lookupKey = item.sku || item.id || item.model;
  let catItem = null;
  if (typeof CatalogRegistry !== "undefined") {
    if (typeof CatalogRegistry.getSwitch === "function") {
      catItem = CatalogRegistry.getSwitch(lookupKey);
    }
    if (!catItem && typeof CatalogRegistry.get === "function") {
      catItem = CatalogRegistry.get(lookupKey);
    }
  }
  if (!catItem && typeof SWITCH_DATABASE !== "undefined" && Array.isArray(SWITCH_DATABASE)) {
    catItem = SWITCH_DATABASE.find(s => s.sku === lookupKey || s.id === lookupKey || s.model === lookupKey);
  }

  if (catItem) {
    // 1. Rack Units & Form Factor (Preserve 0U!)
    if (catItem.rackUnits !== undefined && catItem.rackUnits !== null) {
      if (item.rackUnits === undefined || item.rackUnits === null || (item.rackUnits === 1 && catItem.rackUnits === 0 && !item.mountSku?.includes("19"))) {
        item.rackUnits = catItem.rackUnits;
      }
    } else if (item.rackUnits === undefined) {
      item.rackUnits = 1;
    }

    // 2. Port & Uplink Summaries
    if (!item.portFormFactorSummary && catItem.portFormFactorSummary) {
      item.portFormFactorSummary = catItem.portFormFactorSummary;
    }
    if (!item.uplinksSummary && catItem.uplinksSummary) {
      item.uplinksSummary = catItem.uplinksSummary;
    }
    if (!item.portsBreakdown && catItem.portsBreakdown) {
      item.portsBreakdown = catItem.portsBreakdown;
    }
    if (!item.interfaces && catItem.interfaces) {
      item.interfaces = catItem.interfaces;
    }

    // 3. Speeds & Backbones
    if (catItem.maxBackboneSpeed) {
      item.maxBackboneSpeed = catItem.maxBackboneSpeed;
    }
    if (catItem.portSpeed && (!item.portSpeed || item.portSpeed === "10G")) {
      item.portSpeed = catItem.portSpeed;
    }

    // 4. PoE Breakdown & Standards
    if (item.poeAfPorts === undefined && catItem.poeAfPorts !== undefined) item.poeAfPorts = catItem.poeAfPorts;
    if (item.poeAtPorts === undefined && catItem.poeAtPorts !== undefined) item.poeAtPorts = catItem.poeAtPorts;
    if (item.poeBt60Ports === undefined && catItem.poeBt60Ports !== undefined) item.poeBt60Ports = catItem.poeBt60Ports;
    if (item.poeBt90Ports === undefined && catItem.poeBt90Ports !== undefined) item.poeBt90Ports = catItem.poeBt90Ports;
    if (!item.poeStandardsSupported && catItem.poeStandardsSupported) item.poeStandardsSupported = catItem.poeStandardsSupported;

    // 5. Electrical & Thermal Telemetry
    if (catItem.baseWatts !== undefined && (item.baseWatts === undefined || item.baseWatts === 35 || item.baseWatts === 65)) {
      item.baseWatts = Number(catItem.baseWatts);
    }
    if (item.maxPowerWatts === undefined) {
      item.maxPowerWatts = catItem.maxPowerWatts !== undefined ? Number(catItem.maxPowerWatts) : ((item.baseWatts || 0) + (item.poeBudget || 0));
    }
    if (item.heatBtuPerHour === undefined) {
      item.heatBtuPerHour = catItem.heatBtuPerHour !== undefined ? Number(catItem.heatBtuPerHour) : Math.round((item.baseWatts || 0) * 3.412);
    }

    // 6. Dimensions & Hardware Spec
    if (catItem.depthInches !== undefined && (!item.depthInches || item.depthInches === 12)) item.depthInches = catItem.depthInches;
    if (catItem.weightLbs !== undefined && !item.weightLbs) item.weightLbs = catItem.weightLbs;
    if (!item.mounting && catItem.mounting) item.mounting = catItem.mounting;
    if (item.fanless === undefined && catItem.fanless !== undefined) item.fanless = catItem.fanless;
    if (item.dualPsu === undefined && catItem.dualPsu !== undefined) item.dualPsu = catItem.dualPsu;
    if (!item.psuSku && catItem.psuSku) item.psuSku = catItem.psuSku;
    if (!item.switchingCapacity && catItem.switchingCapacity) item.switchingCapacity = catItem.switchingCapacity;
    if (!item.throughputMpps && catItem.throughputMpps) item.throughputMpps = catItem.throughputMpps;
    if (!item.packetBufferMb && catItem.packetBufferMb) item.packetBufferMb = catItem.packetBufferMb;
    if (!item.stackCableSku && catItem.stackCableSku) item.stackCableSku = catItem.stackCableSku;
    if (!item.image && catItem.image) item.image = catItem.image;
    if (!item.datasheetPath && (catItem.datasheet || catItem.datasheetPath)) item.datasheetPath = catItem.datasheet || catItem.datasheetPath;

    if (!item.modularUplink && catItem.modularUplink) {
      item.modularUplink = catItem.modularUplink;
    }
    if (!item.defaultPsuSku && catItem.defaultPsuSku) item.defaultPsuSku = catItem.defaultPsuSku;
    if (!item.maxPsuBays && catItem.maxPsuBays) item.maxPsuBays = catItem.maxPsuBays;
    if (!item.supportedPrimaryPsus && Array.isArray(catItem.supportedPrimaryPsus)) item.supportedPrimaryPsus = [...catItem.supportedPrimaryPsus];
    if (!item.supportedSecondaryPsus && Array.isArray(catItem.supportedSecondaryPsus)) item.supportedSecondaryPsus = [...catItem.supportedSecondaryPsus];
    if (item.stackPowerSupported === undefined && catItem.stackPowerSupported !== undefined) item.stackPowerSupported = Boolean(catItem.stackPowerSupported);
    if (!item.stackPowerShortSku && catItem.stackPowerShortSku) item.stackPowerShortSku = catItem.stackPowerShortSku;
    if (!item.stackPowerLongSku && catItem.stackPowerLongSku) item.stackPowerLongSku = catItem.stackPowerLongSku;
    if (!item.fanSku && catItem.fanSku) item.fanSku = catItem.fanSku;
    if (!item.compatibleAccessories && Array.isArray(catItem.compatibleAccessories)) item.compatibleAccessories = [...catItem.compatibleAccessories];
    if (!item.featureLicenses && Array.isArray(catItem.featureLicenses)) item.featureLicenses = [...catItem.featureLicenses];
    if (!item.compatibleMounts && Array.isArray(catItem.compatibleMounts)) item.compatibleMounts = [...catItem.compatibleMounts];


    // 7. Mounting & Form Factor Flag
    if (item.isDinMounted === undefined) {
      item.isDinMounted = Boolean(catItem.mounting && catItem.mounting.includes("DIN") && !catItem.mounting.includes("19\""));
    }

    // 8. Camera & Multi-Sensor Sizing Enrichment
    if (item.role === "Camera" || item.category === "camera" || item.category === "cameras" || catItem.category === "cameras") {
      if (item.heads === undefined && catItem.heads !== undefined) item.heads = catItem.heads;
      if (item.mpPerHead === undefined && catItem.mpPerHead !== undefined) item.mpPerHead = catItem.mpPerHead;
      if (item.sensorMegapixels === undefined && catItem.sensorMegapixels !== undefined) item.sensorMegapixels = catItem.sensorMegapixels;
      if (!item.defaultFps && catItem.defaultFps) item.defaultFps = catItem.defaultFps;
      if (!item.compression && catItem.compression) item.compression = catItem.compression;
      if (!item.poeClass && catItem.poeClass) item.poeClass = catItem.poeClass;
      if (!item.poeTierKey && catItem.poeTierKey) item.poeTierKey = catItem.poeTierKey;
      if (item.isGenericCamera === undefined && catItem.isGenericCamera !== undefined) item.isGenericCamera = Boolean(catItem.isGenericCamera);
      if (!item.genericCameraTypeId && catItem.genericCameraTypeId) item.genericCameraTypeId = catItem.genericCameraTypeId;
      if (!item.recommendedUpgradeSkus && Array.isArray(catItem.recommendedUpgradeSkus)) {
        item.recommendedUpgradeSkus = [...catItem.recommendedUpgradeSkus];
      }
    }
  }

  return item;
}
window.enrichBOMItemFromCatalog = enrichBOMItemFromCatalog;

// -----------------------------------------------------------
// Stacking, 48P/24P Patch Panel, StackPower & Multi-PSU Helpers
// -----------------------------------------------------------
function lookupCatalogRecordForBomItem(item) {
  if (!item) return null;
  const keys = [item.id, item.sku, item.model].filter(Boolean);
  for (const k of keys) {
    if (typeof CatalogRegistry !== "undefined") {
      if (typeof CatalogRegistry.getSwitch === "function") {
        const s = CatalogRegistry.getSwitch(k);
        if (s) return s;
      }
      if (typeof CatalogRegistry.get === "function") {
        const g = CatalogRegistry.get(k);
        if (g) return g;
      }
    }
    if (typeof SWITCH_DATABASE !== "undefined" && Array.isArray(SWITCH_DATABASE)) {
      const sw = SWITCH_DATABASE.find(s => s.id === k || s.sku === k || s.model === k);
      if (sw) return sw;
    }
  }
  return null;
}

function getSwitchCopperPortCount(item) {
  if (!item) return 24;
  if (item.portsBreakdown && Array.isArray(item.portsBreakdown.access) && item.portsBreakdown.access.length > 0) {
    const rjCount = item.portsBreakdown.access.reduce((acc, g) => {
      const t = String(g.type || g.connector || "RJ-45");
      if (/rj|copper|base-t/i.test(t) || !/sfp|qsfp|fiber/i.test(t)) {
        return acc + (parseInt(g.count, 10) || 0);
      }
      return acc;
    }, 0);
    if (rjCount > 0) return rjCount;
  }
  if (Array.isArray(item.interfaces) && item.interfaces.length > 0) {
    const rjCount = item.interfaces.filter(i => !i.isUplink && i.role !== "uplink" && /rj/i.test(i.connector || "RJ-45")).length;
    if (rjCount > 0) return rjCount;
  }
  const raw = parseInt(item.ports, 10) || 24;
  if (raw === 52 || raw === 54 || raw === 56) return 48;
  if (raw === 26 || raw === 28 || raw === 30) return 24;
  if (raw === 18 || raw === 20) return 16;
  if (raw === 10 || raw === 12) return 8;
  return raw > 48 ? 48 : raw;
}

function resolveSwitchPatchPanelConfig(item) {
  const copperPorts = getSwitchCopperPortCount(item);
  const override = item?.patchPanelSku || null;

  if (override === "DUAL-24P") {
    return {
      sku: "PP-1U-24P-MOD",
      model: "1U 24-Port High-Density Modular Keystone Patch Panel",
      ports: 24,
      rackUnits: 1,
      msrp: 68,
      weightLbs: 1.8,
      depthInches: 1.5,
      panelsPerSwitch: 2,
      isDual24: true,
      is48: false,
      shortLabel: "2x24P",
      copperPorts
    };
  }

  if (override === "PP-2U-48P-MOD") {
    return {
      sku: "PP-2U-48P-MOD",
      model: "2U 48-Port High-Density Modular Keystone Patch Panel",
      ports: 48,
      rackUnits: 2,
      msrp: 115,
      weightLbs: 3.4,
      depthInches: 1.5,
      panelsPerSwitch: 1,
      isDual24: false,
      is48: true,
      shortLabel: "2U 48P",
      copperPorts
    };
  }

  const use48 = override === "PP-1U-48P-MOD" || (override !== "PP-1U-24P-MOD" && copperPorts > 24);
  if (use48) {
    const cat48 = (typeof CABLING_CATALOG !== "undefined" && CABLING_CATALOG.patchPanels?.find(p => p.sku === "PP-1U-48P-MOD")) || null;
    return {
      sku: "PP-1U-48P-MOD",
      model: cat48?.name || "1U 48-Port High-Density Modular Keystone Patch Panel",
      ports: 48,
      rackUnits: 1,
      msrp: Number(cat48?.msrp) || 108,
      weightLbs: Number(cat48?.weightLbs) || 2.2,
      depthInches: Number(cat48?.depthInches) || 1.5,
      panelsPerSwitch: 1,
      isDual24: false,
      is48: true,
      shortLabel: "48P",
      copperPorts
    };
  }

  const cat24 = (typeof CABLING_CATALOG !== "undefined" && CABLING_CATALOG.patchPanels?.find(p => p.sku === "PP-1U-24P-MOD")) || null;
  return {
    sku: "PP-1U-24P-MOD",
    model: cat24?.name || "1U 24-Port High-Density Modular Keystone Patch Panel",
    ports: 24,
    rackUnits: 1,
    msrp: Number(cat24?.msrp) || 68,
    weightLbs: Number(cat24?.weightLbs) || 1.8,
    depthInches: Number(cat24?.depthInches) || 1.5,
    panelsPerSwitch: 1,
    isDual24: false,
    is48: false,
    shortLabel: "24P",
    copperPorts
  };
}

function getRequiredUplinkModuleQty(parentItem) {
  if (!parentItem) return 1;
  const totalQty = Math.max(1, parseInt(parentItem.qty, 10) || 1);
  const stacked = parseInt(parentItem.stackedUnits, 10) || 0;
  const policy = parentItem.uplinkModuleStackPolicy || "first_last";
  if (stacked > 2 && policy === "first_last") {
    return 2 + Math.max(0, totalQty - stacked);
  }
  return totalQty;
}

function syncBomUplinkModuleQtyAndBlankPlates(parentItem) {
  if (!parentItem || typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) return;
  const sled = projectBOM.find(i => i.parentInstanceId === parentItem.instanceId && i.role === "Uplink Module");
  if (sled) {
    sled.qty = getRequiredUplinkModuleQty(parentItem);
    sled.closetName = parentItem.closetName;
    sled.rackId = parentItem.rackId;
  }

  projectBOM = projectBOM.filter(i => !(i.parentInstanceId === parentItem.instanceId && i.source === "stack_blank_module"));
  const stacked = parseInt(parentItem.stackedUnits, 10) || 0;
  const policy = parentItem.uplinkModuleStackPolicy || "first_last";
  if (parentItem.includeStackBlankPlates && stacked > 2 && policy === "first_last" && sled) {
    const blankCount = stacked - 2;
    const blankSku = /9300|MS390/i.test(parentItem.sku || "") ? "C9300-NM-BLANK=" : "NM-BLANK";
    const blankObj = (typeof POWER_SUPPLY_CATALOG !== "undefined" && POWER_SUPPLY_CATALOG["C9300-NM-BLANK="]) || { sku: blankSku, name: "Network Module Blank Cover Plate", msrp: 35 };
    projectBOM.push({
      instanceId: `blank-nm-${parentItem.instanceId}`,
      parentInstanceId: parentItem.instanceId,
      source: "stack_blank_module",
      id: blankObj.sku,
      model: `${blankObj.name} (Middle Stack Members)`,
      sku: blankObj.sku,
      role: "Uplink Blank Cover",
      vendor: parentItem.vendor || "Cisco",
      msrp: Number(blankObj.msrp) || 35,
      poeBudget: 0,
      baseWatts: 0,
      closetName: parentItem.closetName,
      rackId: parentItem.rackId,
      qty: blankCount
    });
  }
}

function supportsCiscoStackPower(item) {
  if (!item) return false;
  if (item.stackPowerSupported === true) return true;
  if (item.stackPowerSupported === false) return false;
  const cat = lookupCatalogRecordForBomItem(item);
  if (cat && cat.stackPowerSupported !== undefined) return Boolean(cat.stackPowerSupported);
  const key = String(item.sku || item.id || item.model || "").toUpperCase();
  if (/^C9300L|^C9200/.test(key)) return false;
  return /^(C9300|C9300X|C9350|MS390)/.test(key);
}

function resolveCiscoStackPowerCables(item) {
  if (!item || !supportsCiscoStackPower(item)) return [];
  const stacked = parseInt(item.stackedUnits, 10) || 0;
  if (stacked < 2) return [];

  const cat = lookupCatalogRecordForBomItem(item);
  const skuKey = String(item.sku || item.id || "").toUpperCase();

  let shortSku = item.stackPowerShortSku || cat?.stackPowerShortSku || "CAB-SPWR-30CM";
  let longSku = item.stackPowerLongSku || cat?.stackPowerLongSku || "CAB-SPWR-150CM";
  if (!item.stackPowerShortSku && !cat?.stackPowerShortSku) {
    if (skuKey.startsWith("C9350")) {
      shortSku = "CAB-SPWR-35CM";
      longSku = "CAB-SPWR-100CM";
    } else if (skuKey.startsWith("MS390")) {
      shortSku = "MA-CBL-SPWR-30CM";
      longSku = "MA-CBL-SPWR-150CM";
    } else if (skuKey.endsWith("-M")) {
      shortSku = "CAB-SPWR-30CM-M";
      longSku = "CAB-SPWR-150CM-M";
    }
  }

  // Split 2..8 stacked switches into closed Cisco StackPower rings (max 4 chassis per StackPower ring)
  let rings = [];
  if (stacked <= 4) rings = [stacked];
  else if (stacked === 5) rings = [3, 2];
  else if (stacked === 6) rings = [3, 3];
  else if (stacked === 7) rings = [4, 3];
  else rings = [4, 4];

  const ppCfg = resolveSwitchPatchPanelConfig(item);
  const interU = item.standardPod
    ? (ppCfg.isDual24 ? 2 : ppCfg.rackUnits)
    : (item.patchPanelBetween ? ppCfg.rackUnits : (item.cableManagerBetween ? 1 : 0));

  const pref = item.stackPowerCableLength || "auto";
  let shortCount = 0;
  let longCount = 0;

  rings.forEach(rSize => {
    if (pref === "short") {
      shortCount += rSize;
    } else if (pref === "long") {
      longCount += rSize;
    } else {
      // Auto: adjacent links use short (30/35cm) when interleave <= 1U, else long; ring closure return cable uses long for >=3 chassis or interleaved 2-chassis
      if (interU >= 2) {
        longCount += (rSize - 1);
      } else {
        shortCount += (rSize - 1);
      }
      if (rSize <= 2 && interU === 0) {
        shortCount += 1;
      } else {
        longCount += 1;
      }
    }
  });

  const ringLabel = rings.length > 1 ? `${rings.length}x Closed StackPower Rings (${rings.join('+')})` : `${stacked}-Chassis StackPower Ring`;
  const modeLabel = item.stackPowerMode === "redundant" ? "RPS Redundant" : "Power Sharing";
  const out = [];

  if (shortCount > 0) {
    const sObj = (typeof POWER_SUPPLY_CATALOG !== "undefined" && POWER_SUPPLY_CATALOG[shortSku]) ||
      (typeof CatalogRegistry !== "undefined" && typeof CatalogRegistry.get === "function" && CatalogRegistry.get(shortSku)) ||
      null;
    out.push({
      sku: shortSku,
      name: `${sObj?.name || sObj?.model || `Cisco StackPower Cable (${shortSku})`} [${ringLabel} • ${modeLabel}]`,
      msrp: Number(sObj?.msrp) || 100,
      qty: shortCount
    });
  }
  if (longCount > 0) {
    const lObj = (typeof POWER_SUPPLY_CATALOG !== "undefined" && POWER_SUPPLY_CATALOG[longSku]) ||
      (typeof CatalogRegistry !== "undefined" && typeof CatalogRegistry.get === "function" && CatalogRegistry.get(longSku)) ||
      null;
    out.push({
      sku: longSku,
      name: `${lObj?.name || lObj?.model || `Cisco StackPower Return Cable (${longSku})`} [${ringLabel} • ${modeLabel}]`,
      msrp: Number(lObj?.msrp) || 125,
      qty: longCount
    });
  }
  return out;
}

function toggleSwitchStackPower(instanceId) {
  if (!instanceId || typeof projectBOM === "undefined") return;
  const item = projectBOM.find(i => i.instanceId === instanceId);
  if (!item || !supportsCiscoStackPower(item)) return;
  item.stackPowerEnabled = !(item.stackPowerEnabled !== false);
  applyStackCabling(item);
  if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
    FacilityStore.notifyWorkspaceChange();
  }
  if (typeof updateBOMView === "function") updateBOMView();
  if (typeof renderRackVisualizer === "function") renderRackVisualizer();
  if (typeof showToast === "function") {
    showToast(item.stackPowerEnabled
      ? `Enabled Cisco StackPower shared backplane ring on ${item.friendlyName || item.model}`
      : `Disabled Cisco StackPower cables on ${item.friendlyName || item.model}`);
  }
}

function getPsuWattageBySku(sku) {
  if (!sku || sku === "none" || sku === "included") return 0;
  const p = (typeof POWER_SUPPLY_CATALOG !== "undefined" && POWER_SUPPLY_CATALOG[sku]) || null;
  if (p && (p.wattage || p.powerWatts)) return Number(p.wattage || p.powerWatts) || 0;
  const m = String(sku).match(/(\d{3,4})W/i);
  return m ? parseInt(m[1], 10) : 0;
}

function calculateSwitchPoeBudgetForPsus(item, primarySku, secondarySku, tertiarySku) {
  if (!item) return 0;
  const cat = lookupCatalogRecordForBomItem(item) || item;
  const baseCatPoe = Number(cat.poeBudget) || 0;
  const skuUpper = String(cat.sku || item.sku || "").toUpperCase();

  // Data-only / Non-PoE chassis remain 0W PoE regardless of redundant PSUs
  if (baseCatPoe <= 0 && !/P|U|H/i.test(skuUpper.split("-")[1] || "")) {
    return 0;
  }
  if (baseCatPoe <= 0) return 0;

  const defSku = cat.defaultPsuSku || item.defaultPsuSku || null;
  const effPrimary = (!primarySku || primarySku === "included") ? defSku : primarySku;
  const w1 = getPsuWattageBySku(effPrimary) || getPsuWattageBySku(defSku);
  const w2 = (secondarySku && secondarySku !== "none") ? getPsuWattageBySku(secondarySku) : 0;
  const w3 = (tertiarySku && tertiarySku !== "none") ? getPsuWattageBySku(tertiarySku) : 0;
  const totalPsuWatts = w1 + w2 + w3;

  if (totalPsuWatts <= 0) return baseCatPoe;

  const defWatts = getPsuWattageBySku(defSku) || w1;
  const copperPorts = getSwitchCopperPortCount(cat);

  // Official Cisco Catalyst 9300 & Meraki MS390 Datasheet PoE Matrices
  if (/^(C9300|MS390)-48P/i.test(skuUpper)) {
    // 715W=437W, 715+350=787W, 715+715=1152W, 1100W=822W, 1100+350=1172W, >=1815W (or 1900W)=1440W
    return Math.min(1440, Math.max(0, totalPsuWatts - 278));
  }
  if (/^(C9300|MS390)-24P/i.test(skuUpper)) {
    // 715W=445W, >=1065W (1100W -O or +350W/715W)=720W
    return Math.min(720, Math.max(0, totalPsuWatts - 270));
  }
  if (/^C9300-48UXM|^MS390-48UX/i.test(skuUpper)) {
    // 1100W=490W, +350=840W, +715=1205W, +1100=1590W, +1900=1800W
    const extra = totalPsuWatts > 1100 ? (totalPsuWatts >= 2200 ? 490 + (totalPsuWatts - 1100) : 490 + (totalPsuWatts - 1100)) : 490;
    return Math.min(1800, Math.max(0, totalPsuWatts === 1100 ? 490 : (totalPsuWatts === 1450 ? 840 : (totalPsuWatts === 1815 ? 1205 : (totalPsuWatts === 2200 ? 1590 : (totalPsuWatts === 1900 ? 1290 : 1800))))));
  }
  if (/^C9300-48UN/i.test(skuUpper)) {
    // 1100W=645W, +350=995W, +715=1360W, +1100=1745W, >=2600W=1800W
    return Math.min(1800, totalPsuWatts === 1100 ? 645 : (totalPsuWatts === 1450 ? 995 : (totalPsuWatts === 1815 ? 1360 : (totalPsuWatts === 2200 ? 1745 : Math.max(0, totalPsuWatts - 455)))));
  }
  if (/^(C9300|MS390)-48U/i.test(skuUpper)) {
    // C9300-48U / MS390-48U: 1100W=822W, +350=1172W, +715=1537W, >=1900W/2200W=1800W
    if (totalPsuWatts >= 1900) return 1800;
    return Math.min(1800, Math.max(0, totalPsuWatts - 278));
  }
  if (/^(C9300|MS390)-(24U|24H|48H)/i.test(skuUpper)) {
    const is90W = /24H|48H/i.test(skuUpper);
    const maxCap = is90W ? Math.min(copperPorts * 90, 1800) : 1440;
    const overhead = Math.max(250, defWatts - baseCatPoe);
    return Math.min(maxCap, Math.max(0, totalPsuWatts - overhead));
  }
  if (/^C9300X-/i.test(skuUpper)) {
    const maxCap = copperPorts <= 24 ? 2160 : 2880;
    const overhead = Math.max(270, defWatts - baseCatPoe);
    return Math.min(maxCap, Math.max(0, totalPsuWatts - overhead));
  }
  if (/^C9350-/i.test(skuUpper)) {
    const isBt = /24U|48U|24H|48H|HX/i.test(skuUpper);
    const maxCap = isBt ? Math.min(copperPorts * 90, 3820) : (copperPorts * 30);
    const overhead = Math.max(280, defWatts - baseCatPoe);
    return Math.min(maxCap, Math.max(0, totalPsuWatts - overhead));
  }

  // General formula for C9300L, C9200L, MS355, MS350, MS250, Juniper EX, Aruba, Ruckus, Extreme
  const is90 = /bt|90w|upoe+/i.test(cat.poeStandard || "");
  const is60 = !is90 && (/60w|upoe|ux/i.test(cat.poeStandard || "") || /UX/i.test(skuUpper));
  const perPortMax = is90 ? 90 : (is60 ? 60 : 30);
  const maxHardwareCap = Math.max(baseCatPoe, copperPorts * perPortMax);
  const chassisOverhead = defWatts > baseCatPoe ? (defWatts - baseCatPoe) : 150;
  return Math.min(maxHardwareCap, Math.max(0, totalPsuWatts - chassisOverhead));
}

function applyBomItemPsuConfig(instanceId, opts = {}) {
  if (!instanceId || typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) return;
  const item = projectBOM.find(i => i.instanceId === instanceId);
  if (!item) return;

  const cat = lookupCatalogRecordForBomItem(item) || item;
  const defSku = cat.defaultPsuSku || item.defaultPsuSku || null;
  const primarySku = (opts.primaryPsuSku !== undefined) ? opts.primaryPsuSku : (item.primaryPsuSku || defSku || "included");
  const secondarySku = (opts.secondaryPsuSku !== undefined) ? opts.secondaryPsuSku : (item.secondaryPsuSku || "none");
  const tertiarySku = (opts.tertiaryPsuSku !== undefined) ? opts.tertiaryPsuSku : (item.tertiaryPsuSku || "none");
  if (opts.includeHighAmpCords !== undefined) {
    item.includeHighAmpCords = Boolean(opts.includeHighAmpCords);
  }

  item.defaultPsuSku = defSku;
  item.primaryPsuSku = primarySku;
  item.secondaryPsuSku = (!secondarySku || secondarySku === "none") ? null : secondarySku;
  item.tertiaryPsuSku = (!tertiarySku || tertiarySku === "none") ? null : tertiarySku;
  item.hasRedundantPsu = Boolean(item.secondaryPsuSku);
  if (item.hasRedundantPsu) item.dualPsu = true;

  // Remove previous managed PSU & C21 high-amp power cord rows for this parent
  projectBOM = projectBOM.filter(ch => {
    if (ch.parentInstanceId !== instanceId) return true;
    if (ch.instanceId === `psu1-${instanceId}` || ch.instanceId === `psu-ext-${instanceId}` || ch.instanceId === `psu2-${instanceId}` || ch.instanceId === `psu3-${instanceId}` || ch.instanceId === `pwr-cord-c21-${instanceId}`) return false;
    return true;
  });

  const parentQty = Math.max(1, parseInt(item.qty, 10) || 1);

  // 1. Primary PSU row: added if external PSU is required OR if primarySku is an upgrade (different from defaultPsuSku)
  const isPrimaryUpgrade = primarySku && primarySku !== "included" && primarySku !== "none" && (Boolean(cat.needsExternalPsu) || (defSku && primarySku !== defSku));
  if (isPrimaryUpgrade && typeof POWER_SUPPLY_CATALOG !== "undefined" && POWER_SUPPLY_CATALOG[primarySku]) {
    const p1 = POWER_SUPPLY_CATALOG[primarySku];
    projectBOM.push({
      instanceId: cat.needsExternalPsu ? `psu-ext-${instanceId}` : `psu1-${instanceId}`,
      parentInstanceId: instanceId,
      id: p1.sku,
      model: cat.needsExternalPsu ? `Primary Power Supply: ${p1.name}` : `Primary PSU Factory Upgrade: ${p1.name}`,
      sku: p1.sku,
      role: "Power Supply",
      vendor: p1.vendor || item.vendor,
      msrp: Number(p1.msrp) || 0,
      weightLbs: p1.weightLbs || 2.5,
      poeBudget: 0,
      baseWatts: 0,
      closetName: item.closetName,
      rackId: item.rackId,
      qty: parentQty,
      qtyPerUnit: 1
    });
  }

  // 2. Secondary Redundant PSU row
  if (item.secondaryPsuSku && typeof POWER_SUPPLY_CATALOG !== "undefined" && POWER_SUPPLY_CATALOG[item.secondaryPsuSku]) {
    const p2 = POWER_SUPPLY_CATALOG[item.secondaryPsuSku];
    projectBOM.push({
      instanceId: `psu2-${instanceId}`,
      parentInstanceId: instanceId,
      id: p2.sku,
      model: `2nd Redundant PSU: ${p2.name}`,
      sku: p2.sku,
      role: "Power Supply",
      vendor: p2.vendor || item.vendor,
      msrp: Number(p2.msrp) || 0,
      weightLbs: p2.weightLbs || 2.5,
      poeBudget: 0,
      baseWatts: 0,
      closetName: item.closetName,
      rackId: item.rackId,
      qty: parentQty,
      qtyPerUnit: 1
    });
  }

  // 3. Tertiary Redundant PSU row (e.g. Cisco Catalyst C9350 3-Bay)
  if (item.tertiaryPsuSku && typeof POWER_SUPPLY_CATALOG !== "undefined" && POWER_SUPPLY_CATALOG[item.tertiaryPsuSku]) {
    const p3 = POWER_SUPPLY_CATALOG[item.tertiaryPsuSku];
    projectBOM.push({
      instanceId: `psu3-${instanceId}`,
      parentInstanceId: instanceId,
      id: p3.sku,
      model: `3rd Redundant PSU: ${p3.name}`,
      sku: p3.sku,
      role: "Power Supply",
      vendor: p3.vendor || item.vendor,
      msrp: Number(p3.msrp) || 0,
      weightLbs: p3.weightLbs || 2.6,
      poeBudget: 0,
      baseWatts: 0,
      closetName: item.closetName,
      rackId: item.rackId,
      qty: parentQty,
      qtyPerUnit: 1
    });
  }

  // 4. High-Amperage C21 AC Power Cords when 1900W PSUs are installed
  const c21PerChassis = (/1900W/i.test(primarySku || "") ? 1 : 0) + (/1900W/i.test(item.secondaryPsuSku || "") ? 1 : 0) + (/1900W/i.test(item.tertiaryPsuSku || "") ? 1 : 0);
  if (c21PerChassis > 0 && item.includeHighAmpCords !== false && typeof POWER_SUPPLY_CATALOG !== "undefined" && POWER_SUPPLY_CATALOG["C9K-PWR-CAB-AC-US"]) {
    const cord = POWER_SUPPLY_CATALOG["C9K-PWR-CAB-AC-US"];
    projectBOM.push({
      instanceId: `pwr-cord-c21-${instanceId}`,
      parentInstanceId: instanceId,
      id: cord.sku,
      model: `High-Amp C21 Power Cord: ${cord.name}`,
      sku: cord.sku,
      role: "Power Cord",
      vendor: cord.vendor || item.vendor,
      msrp: Number(cord.msrp) || 50,
      poeBudget: 0,
      baseWatts: 0,
      closetName: item.closetName,
      rackId: item.rackId,
      qty: parentQty * c21PerChassis,
      qtyPerUnit: c21PerChassis
    });
  }

  // 5. Recalculate PoE Budget & Max Power
  const newPoe = calculateSwitchPoeBudgetForPsus(item, primarySku, item.secondaryPsuSku, item.tertiaryPsuSku);
  if (Number(cat.poeBudget) > 0 || newPoe > 0) {
    item.poeBudget = newPoe;
    item.maxPowerWatts = (Number(item.baseWatts) || 0) + newPoe;
  }

  if (typeof PortEngine !== "undefined" && typeof PortEngine.recalculateSwitchPoE === "function" && Array.isArray(item.physicalPorts)) {
    PortEngine.recalculateSwitchPoE(item);
  }

  if (!opts.silent) {
    if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") FacilityStore.notifyWorkspaceChange();
    if (typeof updateBOMView === "function") updateBOMView();
    if (typeof renderRackVisualizer === "function") renderRackVisualizer();
    if (typeof showToast === "function") {
      showToast(`Updated PSU config on ${item.friendlyName || item.model} (${item.poeBudget}W PoE budget)`);
    }
  }
}

function addToProjectBOM(id, targetLocation = null, batchCount = 1, skipConfirm = false) {
  const sw = (typeof CatalogRegistry !== "undefined" && typeof CatalogRegistry.getSwitch === "function" ? CatalogRegistry.getSwitch(id) : null) ||
             (typeof CatalogRegistry !== "undefined" && typeof CatalogRegistry.get === "function" ? CatalogRegistry.get(id) : null) ||
             (typeof SWITCH_DATABASE !== "undefined" ? SWITCH_DATABASE.find(s => s.id === id || s.sku === id) : null);
  if (!sw) {
    console.error("addToProjectBOM: Switch not found in catalog for id:", id);
    return;
  }

  const totalUnitsToAdd = Math.max(1, parseInt(batchCount, 10) || 1);
  const defs = (typeof StorageService !== "undefined" && typeof StorageService.getProjectDefaults === "function") ? StorageService.getProjectDefaults() : null;
  if (!skipConfirm && defs && defs.network?.switchesInScope === false && typeof confirmProjectDefaultChange === "function") {
    confirmProjectDefaultChange({
      title: "Network Switching Marked Out of Orion Scope",
      settingLabel: "Orion Scope of Work • Active Network Switching",
      defaultLabel: "Customer-Furnished / Out of Scope",
      newLabel: `Include ${sw.vendor} ${sw.model}`,
      message: `Your Project Scope & Defaults specify that Active Network Switching is Customer-Furnished / Out of Scope. Are you sure you want to add ${totalUnitsToAdd > 1 ? `${totalUnitsToAdd}x ` : ""}${sw.vendor} ${sw.model} to Orion's BOM?`,
      allowLocalOverride: true,
      localOverrideLabel: "Add Switch as One-Time Exception",
      updateDefaultLabel: "Enable Network Switching in Project Scope",
      onLocalOverride: () => addToProjectBOM(id, targetLocation, totalUnitsToAdd, true),
      onUpdateDefault: () => {
        if (typeof updateSingleProjectDefault === "function") {
          updateSingleProjectDefault(d => { if (!d.network) d.network = {}; d.network.switchesInScope = true; });
        }
        addToProjectBOM(id, targetLocation, totalUnitsToAdd, true);
      }
    });
    return;
  }
  if (totalUnitsToAdd > 1) {
    for (let k = 0; k < totalUnitsToAdd; k++) {
      addToProjectBOM(id, targetLocation, 1, true);
    }
    return;
  }

  const qtyToAdd = 1;
  const sledSelect = document.getElementById(`sled-${sw.id}`);
  const selectedSledSku = sledSelect ? sledSelect.value : (sw.modularUplink ? sw.modularUplink.defaultModuleSku : null);

  const instanceId = `inst-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  
  // Resolve destination through FacilityStore
  let assignedLoc = (typeof FacilityStore !== "undefined") ? FacilityStore.UNASSIGNED : "Unassigned";
  if (targetLocation && targetLocation !== "new_location") {
    assignedLoc = typeof FacilityStore !== "undefined" ? FacilityStore.normalize(targetLocation) : targetLocation;
  } else if (typeof FacilityStore !== "undefined") {
    const locs = FacilityStore.getLocationNames(false);
    if (locs.length > 0) {
      assignedLoc = (sw.role === "Core" || sw.role === "Aggregation") ? (locs.find(l => l.includes("MDF")) || locs[0]) : (locs.find(l => l.includes("IDF")) || locs[0]);
    }
  }

  const isDinOnly = sw.mounting && sw.mounting.includes("DIN") && !sw.mounting.includes("19\"");
  let initialMgmtProfile = sw.defaultMgmtProfile || ((sw.vendor === "Meraki" || sw.vendor === "Cisco") ? "cloud" : "standalone");
  const fallbackBaseWatts = sw.role === "Core" ? 250 : (sw.role === "Aggregation" ? 150 : (sw.ports >= 48 ? 65 : 35));
  const baseWatts = sw.baseWatts !== undefined ? Number(sw.baseWatts) : fallbackBaseWatts;

  const newParent = {
    instanceId: instanceId,
    id: sw.id,
    model: sw.model,
    sku: sw.sku,
    role: sw.role,
    vendor: sw.vendor,
    msrp: sw.msrp,
    ports: parseInt(sw.ports) || 0,
    poeStandard: sw.poeStandard || "802.3at",
    poeBudget: parseInt(sw.poeBudget) || 0,
    baseWatts: baseWatts,
    maxPowerWatts: sw.maxPowerWatts !== undefined ? Number(sw.maxPowerWatts) : (baseWatts + (parseInt(sw.poeBudget) || 0)),
    heatBtuPerHour: sw.heatBtuPerHour !== undefined ? Number(sw.heatBtuPerHour) : Math.round(baseWatts * 3.412),
    rackUnits: (sw.rackUnits !== undefined ? sw.rackUnits : 1),
    depthInches: sw.depthInches !== undefined ? sw.depthInches : (sw.shallowDepth ? 10 : 12),
    shallowDepth: sw.shallowDepth || false,
    weightLbs: sw.weightLbs || 0,
    mounting: sw.mounting || "",
    fanless: !!sw.fanless,
    dualPsu: !!sw.dualPsu,
    psuSku: sw.psuSku || null,
    defaultPsuSku: sw.defaultPsuSku || null,
    maxPsuBays: sw.maxPsuBays || (sw.dualPsu ? 2 : 1),
    supportedPrimaryPsus: Array.isArray(sw.supportedPrimaryPsus) ? [...sw.supportedPrimaryPsus] : null,
    supportedSecondaryPsus: Array.isArray(sw.supportedSecondaryPsus) ? [...sw.supportedSecondaryPsus] : null,
    stackPowerSupported: !!sw.stackPowerSupported,
    stackPowerShortSku: sw.stackPowerShortSku || null,
    stackPowerLongSku: sw.stackPowerLongSku || null,
    fanSku: sw.fanSku || null,
    uplinkModuleStackPolicy: "first_last",
    compatibleAccessories: Array.isArray(sw.compatibleAccessories) ? [...sw.compatibleAccessories] : [],
    featureLicenses: Array.isArray(sw.featureLicenses) ? [...sw.featureLicenses] : [],
    switchingCapacity: sw.switchingCapacity || null,
    throughputMpps: sw.throughputMpps || null,
    packetBufferMb: sw.packetBufferMb || null,
    portFormFactorSummary: sw.portFormFactorSummary || "",
    uplinksSummary: sw.uplinksSummary || "",
    portsBreakdown: sw.portsBreakdown || null,
    interfaces: sw.interfaces || null,
    poeAfPorts: sw.poeAfPorts || 0,
    poeAtPorts: sw.poeAtPorts || 0,
    poeBt60Ports: sw.poeBt60Ports || 0,
    poeBt90Ports: sw.poeBt90Ports || 0,
    poeStandardsSupported: sw.poeStandardsSupported || [],
    image: sw.image || "",
    datasheetPath: sw.datasheet || sw.datasheetPath || "",
    qty: qtyToAdd,
    canStack: (sw.stacking !== undefined ? sw.stacking : (sw.canStack !== undefined ? sw.canStack : (sw.role === "Access" || sw.role === "Aggregation"))),
    closetName: assignedLoc,
    rackId: assignedLoc,
    rackSlot: null,
    rackU: null,
    isDinMounted: isDinOnly,
    stackedUnits: 0,
    stackCableSku: sw.stackCableSku || null,
    portSpeed: sw.portSpeed || "1G",
    maxBackboneSpeed: sw.maxBackboneSpeed || (sw.uplinksSummary && /100g/i.test(sw.uplinksSummary) ? "100G" : (sw.uplinksSummary && /40g/i.test(sw.uplinksSummary) ? "40G" : (sw.uplinksSummary && /25g/i.test(sw.uplinksSummary) ? "25G" : (sw.uplinksSummary && /10g/i.test(sw.uplinksSummary) ? "10G" : "1G")))),
    selectedMgmtProfile: initialMgmtProfile,
    uplinkTargetId: null,
    uplinkMode: "single",
    modularUplink: sw.modularUplink || null,
    installedUplinkModuleSku: sw.modularUplink ? (selectedSledSku || "none") : undefined,
    powerSource: (sw.poePassThrough && sw.powerSource === "poe_switch") ? "poe_switch" : "internal_psu"
  };

  projectBOM.push(newParent);
  if (typeof PortEngine !== "undefined") {
    PortEngine.initSwitchPorts(newParent);
  }

  // Modular Sled Addition
  if (selectedSledSku && MODULAR_UPLINK_CATALOG[selectedSledSku]) {
    const mod = MODULAR_UPLINK_CATALOG[selectedSledSku];
    projectBOM.push({
      instanceId: `mod-${instanceId}`,
      parentInstanceId: instanceId,
      id: mod.sku,
      model: mod.name,
      sku: mod.sku,
      role: "Uplink Module",
      vendor: sw.vendor,
      msrp: mod.msrp,
      poeBudget: 0,
      baseWatts: 15,
      closetName: assignedLoc,
      rackId: assignedLoc,
      qty: qtyToAdd
    });
  }

  // Feature Licenses
  const selectedLicCheckboxes = document.querySelectorAll(`input[name="featLic-${sw.id}"]:checked`);
  selectedLicCheckboxes.forEach(cb => {
    const licSku = cb.value;
    const lic = FEATURE_LICENSE_CATALOG[licSku];
    if (lic) {
      projectBOM.push({
        instanceId: `lic-${licSku}-${instanceId}`,
        parentInstanceId: instanceId,
        id: lic.sku,
        model: lic.name,
        sku: lic.sku,
        role: "Feature License",
        vendor: sw.vendor,
        msrp: lic.msrp,
        poeBudget: 0,
        baseWatts: 0,
        closetName: assignedLoc,
        rackId: assignedLoc,
        qty: qtyToAdd
      });
    }
  });

  // Primary (-O Factory Upgrade / External) & 2nd Redundant PSUs
  const primaryPsuSelectEl = (typeof document !== "undefined") ? document.getElementById(`psuPrimarySelect-${sw.id}`) : null;
  const secondaryPsuSelectEl = (typeof document !== "undefined") ? document.getElementById(`psuSecondarySelect-${sw.id}`) : null;
  const redundantPsuChecked = (typeof document !== "undefined") ? document.getElementById(`psuRedundant-${sw.id}`)?.checked : false;
  const chosenPrimaryPsu = primaryPsuSelectEl ? primaryPsuSelectEl.value : (sw.defaultPsuSku || (sw.needsExternalPsu && sw.psuSku ? sw.psuSku : "included"));
  const chosenSecondaryPsu = secondaryPsuSelectEl ? secondaryPsuSelectEl.value : (redundantPsuChecked && sw.psuSku ? sw.psuSku : "none");
  applyBomItemPsuConfig(instanceId, {
    primaryPsuSku: chosenPrimaryPsu,
    secondaryPsuSku: chosenSecondaryPsu,
    silent: true
  });

  // Hot-Swappable Fan Module
  const fanSpareChecked = document.getElementById(`fanSpare-${sw.id}`)?.checked;
  const fanSku = sw.fanSku || (sw.compatibleAccessories && sw.compatibleAccessories.includes('UACC-Fan-4020') ? 'UACC-Fan-4020' : null);
  if (fanSpareChecked && fanSku) {
    const fan = (typeof POWER_SUPPLY_CATALOG !== "undefined" && POWER_SUPPLY_CATALOG[fanSku]) || { sku: fanSku, name: `${sw.vendor || ''} Hot-Swappable Fan Module (${fanSku})`, msrp: 49, weightLbs: 0.4 };
    projectBOM.push({
      instanceId: `fan-${instanceId}`,
      parentInstanceId: instanceId,
      id: fan.sku,
      model: `Hot-Swap Fan: ${fan.name}`,
      sku: fan.sku,
      role: "Cooling & Fans",
      category: "Accessory",
      vendor: sw.vendor,
      msrp: fan.msrp || 49,
      weightLbs: fan.weightLbs || 0.4,
      poeBudget: 0,
      baseWatts: 2,
      closetName: assignedLoc,
      rackId: assignedLoc,
      qty: 1
    });
  }

  // Mounting Hardware (Sliding Rails, Rack Kits, Utility Enclosures, Shelves)
  const mountSelect = document.getElementById(`mountSelect-${sw.id}`);
  let selectedMountSku = mountSelect ? mountSelect.value : null;

  // Auto-select mount based on destination environment
  const assignedLocLower = (assignedLoc || "").toLowerCase();
  const isDestEnclosure = assignedLocLower.includes("enclosure") || assignedLocLower.includes("nema") || assignedLocLower.includes("trove") || assignedLocLower.includes("box");
  const isDestRack = !isDestEnclosure && (assignedLocLower.includes("rack") || assignedLocLower.includes("cabinet") || assignedLocLower.includes("mdf") || assignedLocLower.includes("idf"));
  const isDestOutdoor = assignedLocLower.includes("pole") || assignedLocLower.includes("outdoor") || assignedLocLower.includes("exterior") || assignedLocLower.includes("utility");

  // Check if target location already has an enclosure in projectBOM
  const hasExistingEnclosureInBOM = projectBOM.some(i => 
    (i.closetName === assignedLoc || i.rackId === assignedLoc) && 
    (i.category === "enclosure" || i.category === "outdoor_enclosure" || i.sku === "USW-Flex-Utility" || i.sku === "NF141208" || i.sku === "Trove1WP1")
  );

  if (sw.sku === "USW-Flex") {
    if (selectedMountSku === "3rd_party_enclosure" || selectedMountSku === "included" || selectedMountSku === "UACC-Flex-DIN" || selectedMountSku === "UACC-DIN-Rail") {
      // User explicitly selected included mount, DIN bracket, or 3rd-party enclosure - preserve choice!
    } else if (isDestEnclosure || hasExistingEnclosureInBOM) {
      selectedMountSku = "3rd_party_enclosure";
    } else if (isDestOutdoor) {
      selectedMountSku = "USW-Flex-Utility";
    } else if (isDestRack) {
      selectedMountSku = "UACC-Rack-Shelf-SD";
    } else if (selectedMountSku === "UACC-Rack-Shelf-SD") {
      selectedMountSku = "included";
    }
  } else if (sw.sku && sw.sku.includes("Pro-Max-16")) {
    if (isDestRack) {
      selectedMountSku = "UACC-Pro-Max-16-RM";
    } else if (selectedMountSku === "UACC-Pro-Max-16-RM" && !isDestRack) {
      selectedMountSku = "included";
    }
  } else if (!selectedMountSku) {
    selectedMountSku = "included";
  }

  newParent.selectedMountSku = selectedMountSku;

  if (selectedMountSku === "UACC-Flex-DIN" || selectedMountSku === "UACC-DIN-Rail" || sw.sku === "USW-Industrial" || (sw.mounting && /din/i.test(sw.mounting))) {
    newParent.isDinMounted = true;
    newParent.mountMethod = "din";
  }

  if (selectedMountSku && selectedMountSku !== "included" && selectedMountSku !== "3rd_party_enclosure" && selectedMountSku !== "none") {
    const mountItem = (typeof MOUNTING_CATALOG !== "undefined" && MOUNTING_CATALOG[selectedMountSku]) ||
                      (typeof CatalogRegistry !== "undefined" && CatalogRegistry.get(selectedMountSku));
    if (mountItem) {
      projectBOM.push({
        instanceId: `mount-${instanceId}`,
        parentInstanceId: instanceId,
        id: mountItem.sku || selectedMountSku,
        model: `Mount Hardware: ${mountItem.name || mountItem.model}`,
        sku: mountItem.sku || selectedMountSku,
        role: "Mounting Hardware",
        category: "Infrastructure",
        vendor: sw.vendor || "UniFi",
        msrp: mountItem.msrp || 0,
        rackUnits: mountItem.rackUnits || 0,
        weightLbs: mountItem.weightLbs || 1.5,
        depthInches: mountItem.depthInches || 0,
        closetName: assignedLoc,
        rackId: assignedLoc,
        qty: 1
      });
      if (mountItem.rackUnits && mountItem.rackUnits > 0) {
        newParent.rackUnits = mountItem.rackUnits;
      }
    }
  }

  // External primary PSU handled cleanly by applyBomItemPsuConfig above

  if (sw.vendor === "Meraki" || sw.vendor === "Cisco") {
    applyManagementSubscription(instanceId, "cloud", globalSelectedTerm || "1YR");
  }

  FacilityStore.notifyWorkspaceChange();
  showToast(`Added ${sw.model} to ${assignedLoc}`);
}

// -----------------------------------------------------------
// Dynamic Auto-Selection of Hardware Mounts & Accessories
// Auto-attaches required kits when items are assigned/mounted to Racks or Enclosures
// -----------------------------------------------------------
function autoSelectMountingForHost(item, targetLocation, hostType = null) {
  if (!item || !targetLocation || typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) return;
  const sku = (item.sku || "").trim();
  const model = item.model || "";
  const locStr = (targetLocation || "").toLowerCase();
  
  let resolvedHostType = hostType;
  if (!resolvedHostType && typeof FacilityStore !== "undefined" && typeof FacilityStore.parse === "function") {
    const parsed = FacilityStore.parse(targetLocation);
    resolvedHostType = parsed.hostType;
  }
  const isDinHost = resolvedHostType === "industrial_din" || locStr.includes("din");
  const isEnclosure = isDinHost || resolvedHostType === "security_cabinet" || locStr.includes("enclosure") || locStr.includes("nema") || locStr.includes("trove") || locStr.includes("box");
  const isRack = !isEnclosure && (resolvedHostType === "equipment_rack" || locStr.includes("rack") || locStr.includes("cabinet") || locStr.includes("mdf") || locStr.includes("idf"));
  const isOutdoorOrPole = resolvedHostType === "structural_mount" || locStr.includes("pole") || locStr.includes("outdoor") || locStr.includes("exterior") || locStr.includes("utility");

  // 1. Compact / Edge UniFi switches into Industrial DIN Rail Enclosure
  if (isDinHost) {
    if (sku === "USW-Industrial" || (item.mounting && /din/i.test(item.mounting))) {
      item.isDinMounted = true;
      item.mountMethod = "din";
      item.rackUnits = 0;
      return;
    }

    if (sku === "USW-Flex") {
      item.isDinMounted = true;
      item.mountMethod = "din";
      item.rackUnits = 0;
      const hasDinMount = projectBOM.some(ch => ch.parentInstanceId === item.instanceId && (ch.sku === "UACC-Flex-DIN" || ch.sku === "UACC-DIN-Rail" || ch.role === "Mounting Hardware"));
      if (!hasDinMount) {
        const mountKit = (typeof MOUNTING_CATALOG !== "undefined" && MOUNTING_CATALOG["UACC-Flex-DIN"]) || {
          sku: "UACC-Flex-DIN",
          name: "UniFi Switch Flex DIN Rail Mount Bracket",
          msrp: 19,
          weightLbs: 0.2
        };
        projectBOM.push({
          instanceId: `mount-flex-din-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          parentInstanceId: item.instanceId,
          id: mountKit.sku,
          sku: mountKit.sku,
          model: `DIN Rail Mount: ${mountKit.name || mountKit.model}`,
          role: "Mounting Hardware",
          category: "Infrastructure",
          vendor: item.vendor || "UniFi",
          msrp: mountKit.msrp || 19,
          rackUnits: 0,
          weightLbs: mountKit.weightLbs || 0.2,
          closetName: targetLocation,
          rackId: targetLocation,
          qty: 1
        });
        if (typeof showToast === "function") {
          showToast(`Auto-selected DIN Rail Mount (UACC-Flex-DIN) for ${model}`);
        }
      }
      return;
    }

    if (sku.includes("Ultra") || sku.includes("Lite") || sku.includes("Flex-Mini") || sku.includes("Flex-2.5G") || sku.includes("Flex-XG") || (item.rackUnits === 0 && item.vendor === "UniFi")) {
      item.isDinMounted = true;
      item.mountMethod = "din";
      item.rackUnits = 0;
      const hasDinMount = projectBOM.some(ch => ch.parentInstanceId === item.instanceId && (ch.sku === "UACC-DIN-Rail" || ch.role === "Mounting Hardware"));
      if (!hasDinMount) {
        const mountKit = (typeof MOUNTING_CATALOG !== "undefined" && MOUNTING_CATALOG["UACC-DIN-Rail"]) || {
          sku: "UACC-DIN-Rail",
          name: "UniFi DIN Rail Mount Kit",
          msrp: 19,
          weightLbs: 0.2
        };
        projectBOM.push({
          instanceId: `mount-din-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          parentInstanceId: item.instanceId,
          id: mountKit.sku,
          sku: mountKit.sku,
          model: `DIN Rail Mount: ${mountKit.name || mountKit.model}`,
          role: "Mounting Hardware",
          category: "Infrastructure",
          vendor: item.vendor || "UniFi",
          msrp: mountKit.msrp || 19,
          rackUnits: 0,
          weightLbs: mountKit.weightLbs || 0.2,
          closetName: targetLocation,
          rackId: targetLocation,
          qty: 1
        });
        if (typeof showToast === "function") {
          showToast(`Auto-selected DIN Rail Mount Kit (UACC-DIN-Rail) for ${model}`);
        }
      }
      return;
    }
  }

  // 2. USW-Pro-Max-16 in 19" Equipment Rack
  if (isRack && sku.includes("Pro-Max-16")) {
    const hasMount = projectBOM.some(ch => ch.parentInstanceId === item.instanceId && (ch.sku === "UACC-Pro-Max-16-RM" || ch.role === "Mounting Hardware"));
    if (!hasMount) {
      const mountKit = (typeof MOUNTING_CATALOG !== "undefined" && MOUNTING_CATALOG["UACC-Pro-Max-16-RM"]) || {
        sku: "UACC-Pro-Max-16-RM",
        name: "UniFi Pro Max 16 Rack Mount Kit",
        msrp: 29,
        weightLbs: 1.4
      };
      projectBOM.push({
        instanceId: `mount-pmax16-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        parentInstanceId: item.instanceId,
        id: mountKit.sku,
        sku: mountKit.sku,
        model: `1U Rackmount Kit: ${mountKit.name || mountKit.model}`,
        role: "Mounting Hardware",
        category: "Infrastructure",
        vendor: item.vendor || "UniFi",
        msrp: mountKit.msrp || 29,
        rackUnits: 0,
        weightLbs: mountKit.weightLbs || 1.4,
        closetName: targetLocation,
        rackId: targetLocation,
        qty: 1
      });
      item.rackUnits = 1;
      if (typeof showToast === "function") {
        showToast(`Auto-selected 1U Rack Mount Kit (UACC-Pro-Max-16-RM) for ${model}`);
      }
    }
  }

  // 3. USW-Flex on Outdoor Pole, Exterior Location, or Enclosure
  if (isOutdoorOrPole && sku === "USW-Flex") {
    // Check if location is already an enclosure or has an outdoor enclosure item in BOM
    const hasEnclosureInBOM = projectBOM.some(ch => 
      (ch.closetName === targetLocation || ch.rackId === targetLocation) &&
      (ch.category === "enclosure" || ch.category === "outdoor_enclosure" || ch.sku === "USW-Flex-Utility" || ch.sku === "NF141208" || ch.sku === "Trove1WP1")
    );
    const isUserExplicitNonUtility = item.selectedMountSku === "included" || 
                                     item.selectedMountSku === "3rd_party_enclosure" ||
                                     item.mountingOption === "included" ||
                                     item.mountingOption === "3rd_party_enclosure";

    if (isEnclosure || hasEnclosureInBOM || isUserExplicitNonUtility) {
      // USW-Flex mounted inside existing/3rd-party enclosure using included plate/magnetic base
      if (typeof showToast === "function" && (isEnclosure || hasEnclosureInBOM)) {
        showToast(`USW-Flex deployed inside ${targetLocation} using included mounting bracket`);
      }
      return;
    }

    const hasUtility = projectBOM.some(ch => ch.parentInstanceId === item.instanceId && (ch.sku === "USW-Flex-Utility" || ch.role === "Mounting Hardware" || ch.category === "enclosure"));
    if (!hasUtility) {
      const utilItem = (typeof MOUNTING_CATALOG !== "undefined" && MOUNTING_CATALOG["USW-Flex-Utility"]) || {
        sku: "USW-Flex-Utility",
        name: "UniFi Switch Flex Outdoor Weatherproof Enclosure (60W PoE)",
        msrp: 58,
        weightLbs: 3.75,
        depthInches: 2.5
      };
      projectBOM.push({
        instanceId: `util-flex-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        parentInstanceId: item.instanceId,
        id: utilItem.sku,
        sku: utilItem.sku,
        model: `Outdoor Enclosure: ${utilItem.name || utilItem.model}`,
        role: "Mounting Hardware",
        category: "Infrastructure",
        vendor: item.vendor || "UniFi",
        msrp: utilItem.msrp || 58,
        rackUnits: 0,
        weightLbs: utilItem.weightLbs || 3.75,
        depthInches: utilItem.depthInches || 2.5,
        closetName: targetLocation,
        rackId: targetLocation,
        qty: 1
      });
      if (typeof showToast === "function") {
        showToast(`Auto-selected Outdoor Utility Enclosure (USW-Flex-Utility) for ${model}`);
      }
    }
  }

  // 4. Compact 0U Switches in 19" Equipment Rack (Shelf allocation)
  if (isRack && (sku === "USW-Flex" || sku === "USW-Flex-Mini" || sku.includes("Ultra") || sku === "USW-Lite-8-PoE" || sku === "USW-Lite-16-PoE")) {
    item.rackUnits = 1;
    const hasShelf = projectBOM.some(ch => ch.parentInstanceId === item.instanceId && (ch.sku === "UACC-Rack-Shelf-SD" || ch.role === "Mounting Hardware"));
    if (!hasShelf) {
      const shelfItem = (typeof MOUNTING_CATALOG !== "undefined" && MOUNTING_CATALOG["UACC-Rack-Shelf-SD"]) || {
        sku: "UACC-Rack-Shelf-SD",
        name: "UniFi 1U Cantilever Shallow Rack Shelf",
        msrp: 49,
        weightLbs: 4.5,
        depthInches: 10.6
      };
      projectBOM.push({
        instanceId: `shelf-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        parentInstanceId: item.instanceId,
        id: shelfItem.sku,
        sku: shelfItem.sku,
        model: `1U Rack Shelf: ${shelfItem.name || shelfItem.model}`,
        role: "Mounting Hardware",
        category: "Infrastructure",
        vendor: item.vendor || "UniFi",
        msrp: shelfItem.msrp || 49,
        rackUnits: 0,
        weightLbs: shelfItem.weightLbs || 4.5,
        depthInches: shelfItem.depthInches || 10.6,
        closetName: targetLocation,
        rackId: targetLocation,
        qty: 1
      });
      if (typeof showToast === "function") {
        showToast(`Auto-selected 1U Cantilever Rack Shelf (UACC-Rack-Shelf-SD) for ${model} in rack`);
      }
    }
  }
}
window.autoSelectMountingForHost = autoSelectMountingForHost;

function cleanupMountingForHost(item, targetLocation, hostType = null) {
  if (!item || !targetLocation || typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) return;
  const locStr = (targetLocation || "").toLowerCase();
  const isUnassignedOrDesktop = locStr.includes("unassigned") || locStr.includes("desktop") || locStr.includes("table");
  const isEnclosure = hostType === "industrial_din" || hostType === "security_cabinet" || locStr.includes("enclosure") || locStr.includes("nema") || locStr.includes("trove") || locStr.includes("box");
  const isRack = hostType === "equipment_rack" || (!isEnclosure && (locStr.includes("rack") || locStr.includes("cabinet") || locStr.includes("mdf") || locStr.includes("idf")));

  if (isUnassignedOrDesktop) {
    projectBOM = projectBOM.filter(ch => {
      if (ch.parentInstanceId !== item.instanceId) return true;
      if (ch.sku === "UACC-Pro-Max-16-RM" || ch.sku === "UACC-Rack-Shelf-SD" || ch.sku === "USW-Flex-Utility" || ch.sku === "UACC-DIN-Rail" || ch.sku === "UACC-Flex-DIN") {
        return false;
      }
      return true;
    });
    if (item.sku !== "USW-Industrial" && !(item.mounting && /din/i.test(item.mounting))) {
      item.isDinMounted = false;
    }
  } else if (isRack) {
    // If moving to a standard 19" rack, remove DIN rail brackets
    projectBOM = projectBOM.filter(ch => {
      if (ch.parentInstanceId !== item.instanceId) return true;
      if (ch.sku === "UACC-DIN-Rail" || ch.sku === "UACC-Flex-DIN") {
        return false;
      }
      return true;
    });
    if (item.sku !== "USW-Industrial" && !(item.mounting && /din/i.test(item.mounting))) {
      item.isDinMounted = false;
    }
  } else if (isEnclosure && item.sku === "USW-Flex") {
    // If moving into an enclosure, remove standalone pole utility box if it was previously auto-added
    projectBOM = projectBOM.filter(ch => {
      if (ch.parentInstanceId !== item.instanceId) return true;
      if (ch.sku === "USW-Flex-Utility") {
        return false;
      }
      return true;
    });
  }
}
window.cleanupMountingForHost = cleanupMountingForHost;

function applyManagementSubscription(instanceId, profileKey, term) {
  const sw = projectBOM.find(i => i.instanceId === instanceId);
  if (!sw) return;

  projectBOM = projectBOM.filter(i => !(i.parentInstanceId === instanceId && (i.role === "Mgmt License" || i.role === "Security License")));
  sw.selectedMgmtProfile = profileKey;

  if (!profileKey || profileKey === "standalone") return;

  const profile = MGMT_SUBSCRIPTION_CATALOG[sw.vendor]?.[profileKey];
  if (profile && profile.terms) {
    const termEntry = profile.terms[term] || profile.terms["1YR"] || profile.terms["PERP"] || Object.values(profile.terms)[0];
    if (termEntry && termEntry.msrp > 0) {
      projectBOM.push({
        instanceId: `mgmt-${instanceId}`,
        parentInstanceId: instanceId,
        id: termEntry.sku,
        model: `${profile.name} (${term || '1YR'})`,
        sku: termEntry.sku,
        role: "Mgmt License",
        vendor: sw.vendor,
        msrp: termEntry.msrp,
        poeBudget: 0,
        baseWatts: 0,
        closetName: sw.closetName,
        rackId: sw.rackId,
        qty: sw.qty || 1
      });
    }
  }
}

function syncPerChassisChildQuantities(parentItem) {
  if (!parentItem || typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) return;
  projectBOM.filter(ch => ch.parentInstanceId === parentItem.instanceId && ch.role !== "Stacking Cable" && ch.role !== "StackPower Cable" && ch.role !== "Uplink Module" && ch.role !== "Uplink Interconnect" && ch.source !== "stack_patch_panel" && ch.source !== "stack_cable_manager" && ch.source !== "switch_standard_pod" && ch.source !== "stack_blank_module" && ch.source !== "manual_bom_accessory").forEach(ch => {
    const perUnit = ch.qtyPerUnit || ch.qtyPerServer || 1;
    ch.qty = (parentItem.qty || 1) * perUnit;
  });
}
window.syncPerChassisChildQuantities = syncPerChassisChildQuantities;

function updateStackedCount(instanceId, count) {
  const item = projectBOM.find(i => i.instanceId === instanceId);
  if (!item) return;

  const oldStacked = parseInt(item.stackedUnits, 10) || 0;
  const val = parseInt(count, 10) || 0;
  if (val >= 2) {
    item.canStack = true;
    item.stackedUnits = val;
    item.qty = (oldStacked >= 2 && item.qty === oldStacked) ? val : Math.max(item.qty || 1, val);
    item.uplinkMode = "lag_dual";
    item.customLinkMultiplier = Math.max(item.customLinkMultiplier || 1, 2);
  } else {
    if (oldStacked >= 2 && item.qty === oldStacked) item.qty = 1;
    item.stackedUnits = 0;
  }
  syncPerChassisChildQuantities(item);

  if (typeof PortEngine !== "undefined") {
    PortEngine.initSwitchPorts(item, true);
  }

  applyStackCabling(item);
  FacilityStore.notifyWorkspaceChange();
  updateBOMView();
}

function applyStackCabling(item) {
  projectBOM = projectBOM.filter(i => !(i.role === "Stacking Cable" && i.parentInstanceId === item.instanceId));
  projectBOM = projectBOM.filter(i => !(i.role === "StackPower Cable" && i.parentInstanceId === item.instanceId));
  projectBOM = projectBOM.filter(i => !(i.source === "stack_patch_panel" && i.parentInstanceId === item.instanceId));
  projectBOM = projectBOM.filter(i => !(i.source === "stack_cable_manager" && i.parentInstanceId === item.instanceId));

  // Enforce 1st & Last Only Uplink Module rule on >2-switch stacks
  syncBomUplinkModuleQtyAndBlankPlates(item);

  const ppCfg = resolveSwitchPatchPanelConfig(item);

  if (item.stackedUnits >= 2) {
    const baseRU = parseInt(item.rackUnits, 10) || 1;
    const interleaveU = (item.patchPanelBetween ? ppCfg.rackUnits * (item.stackedUnits - 1) : 0) + (item.cableManagerBetween ? (item.stackedUnits - 1) : 0);
    const stackSpanU = ((item.stackedUnits - 1) * baseRU) + interleaveU;

    // Stack cable length dynamically adjusted for member U-span
    let stackCableLen = "0.5m";
    if (stackSpanU >= 7) stackCableLen = "2m";
    else if (stackSpanU >= 3) stackCableLen = "1m";

    const hasDedicatedStack = Boolean(item.stackCableSku) ||
      (typeof PortEngine !== "undefined" && typeof PortEngine.hasDedicatedStackPorts === "function" && PortEngine.hasDedicatedStackPorts(item));

    let resolvedSku = item.stackCableSku || "STACK-DAC-1M";
    let resolvedName = `${item.vendor} Dedicated Hardware Stacking Cable (${stackCableLen} • ${stackSpanU}U Stack Span)`;
    let resolvedMsrp = 180;

    if (hasDedicatedStack) {
      const catStack = (typeof POWER_SUPPLY_CATALOG !== "undefined" && item.stackCableSku && POWER_SUPPLY_CATALOG[item.stackCableSku]) ||
        (typeof CatalogRegistry !== "undefined" && item.stackCableSku && CatalogRegistry.get(item.stackCableSku)) || null;
      const baseMsrp = catStack?.msrp || 180;
      const baseTitle = catStack?.name || `${item.vendor} Dedicated Hardware Stacking Cable`;
      if (typeof formatDacItem === "function") {
        const fmt = formatDacItem(resolvedSku, baseTitle, baseMsrp, stackCableLen, "40G", item.vendor);
        resolvedSku = fmt.sku;
        resolvedName = `${fmt.name} (${item.closetName || 'Rack'} • ${stackSpanU}U Stack Span)`;
        resolvedMsrp = fmt.msrp;
      }
    } else {
      // Front-panel SFP+ / SFP28 / QSFP28 DAC Stack Ring (respects 1st-Party OEM vs 3rd-Party IronLink / FS.com mode)
      const upSummary = `${item.uplinksSummary || ""} ${item.portFormFactorSummary || ""} ${item.maxBackboneSpeed || ""}`.toUpperCase();
      let stackSpeed = "10G";
      if (upSummary.includes("100G") || upSummary.includes("QSFP28")) stackSpeed = "100G";
      else if (upSummary.includes("40G") || upSummary.includes("QSFP+")) stackSpeed = "40G";
      else if (upSummary.includes("25G") || upSummary.includes("SFP28")) stackSpeed = "25G";

      const opticsMode = (typeof getProjectOpticsVendorMode === "function") ? getProjectOpticsVendorMode() : "oem";
      const lookupVendor = opticsMode === "ironlink" ? "IronLink" : (opticsMode === "fs" ? "FS.com" : item.vendor);
      const eepromCode = (typeof getVendorEepromCode === "function") ? getVendorEepromCode(item.vendor) : "MSA";

      const dacMatch = (typeof findDacItem === "function") ? findDacItem(stackSpeed, lookupVendor, stackCableLen) : null;
      const fallbackDac = (typeof OPTICS_CATALOG !== "undefined" && OPTICS_CATALOG[lookupVendor]?.[stackSpeed]?.dac) || null;
      const chosenDac = dacMatch || fallbackDac;
      const baseSku = chosenDac?.sku || `${lookupVendor || "MSA"}-${stackSpeed}-DAC-1M`;
      const baseTitle = chosenDac?.name || `${lookupVendor || "MSA"} ${stackSpeed} Direct Attach Copper Stack Ring Cable`;
      const baseMsrp = chosenDac?.msrp || (stackSpeed === "25G" ? 55 : (stackSpeed === "100G" ? 120 : 25));

      if (typeof formatDacItem === "function") {
        const fmt = formatDacItem(baseSku, baseTitle, baseMsrp, stackCableLen, stackSpeed, lookupVendor);
        resolvedSku = opticsMode === "oem" ? fmt.sku : `${fmt.sku}-${eepromCode}`;
        resolvedName = `${fmt.name}${opticsMode === "oem" ? "" : ` [${item.vendor} Coded]`} (Front-Panel Stack Ring • ${stackSpanU}U Span)`;
        resolvedMsrp = fmt.msrp;
      } else {
        resolvedSku = opticsMode === "oem" ? baseSku : `${baseSku}-${eepromCode}`;
        resolvedName = `${baseTitle} (${stackCableLen} • ${stackSpanU}U Stack Ring)`;
        resolvedMsrp = baseMsrp;
      }
    }

    const stackInfraScope = (typeof getProjectInfrastructureScope === "function")
      ? getProjectInfrastructureScope()
      : { sfpAndDac: true, rackPatchPanels: true };
    const stackDirectRj45 = (typeof StorageService !== "undefined" && typeof StorageService.getProjectDefaults === "function")
      ? (StorageService.getProjectDefaults()?.cabling?.rackTermination === "direct_rj45")
      : false;

    if (stackInfraScope.sfpAndDac !== false) {
      projectBOM.push({
        instanceId: `cable-${item.instanceId}`,
        parentInstanceId: item.instanceId,
        id: `${item.id}-stack-cable`,
        model: resolvedName,
        sku: resolvedSku,
        role: "Stacking Cable",
        vendor: item.vendor,
        msrp: resolvedMsrp,
        poeBudget: 0,
        baseWatts: 0,
        stackCableLength: stackCableLen,
        uDiff: stackSpanU,
        closetName: item.closetName,
        rackId: item.rackId,
        qty: item.stackedUnits
      });
    }

    // Cisco StackPower / StackPower+ Shared Backplane Cables
    if (supportsCiscoStackPower(item)) {
      if (item.stackPowerEnabled === undefined) {
        item.stackPowerEnabled = true;
        item.stackPowerMode = item.stackPowerMode || "power_sharing";
        item.stackPowerCableLength = item.stackPowerCableLength || "auto";
      }
      if (item.stackPowerEnabled) {
        const spwrCables = resolveCiscoStackPowerCables(item);
        spwrCables.forEach((sc, scIdx) => {
          projectBOM.push({
            instanceId: `spwr-${scIdx}-${item.instanceId}`,
            parentInstanceId: item.instanceId,
            id: sc.sku,
            model: sc.name,
            sku: sc.sku,
            role: "StackPower Cable",
            category: "Stacking & Power",
            vendor: item.vendor || "Cisco",
            msrp: sc.msrp,
            poeBudget: 0,
            baseWatts: 0,
            closetName: item.closetName,
            rackId: item.rackId,
            qty: sc.qty
          });
        });
      }
    }

    if (item.patchPanelBetween && stackInfraScope.rackPatchPanels !== false && !stackDirectRj45) {
      projectBOM.push({
        instanceId: `stack-pp-${item.instanceId}`,
        parentInstanceId: item.instanceId,
        source: "stack_patch_panel",
        id: `${item.id}-stack-pp`,
        model: `${ppCfg.model} (In-Stack Interleave)`,
        sku: ppCfg.sku,
        role: "Structured Cabling",
        category: "Infrastructure",
        vendor: "Panduit",
        msrp: ppCfg.msrp,
        rackUnits: ppCfg.rackUnits,
        weightLbs: ppCfg.weightLbs,
        depthInches: ppCfg.depthInches,
        ports: ppCfg.ports,
        poeBudget: 0,
        baseWatts: 0,
        closetName: item.closetName,
        rackId: item.rackId,
        qty: item.stackedUnits - 1
      });
    }

    if (item.cableManagerBetween) {
      projectBOM.push({
        instanceId: `stack-hcm-${item.instanceId}`,
        parentInstanceId: item.instanceId,
        source: "stack_cable_manager",
        id: `${item.id}-stack-hcm`,
        model: `1U Horizontal Cable Manager with Dual-Hinged Cover (In-Stack Management)`,
        sku: "HCM-1U",
        role: "Structured Cabling",
        category: "Infrastructure",
        vendor: "Panduit",
        msrp: 45,
        rackUnits: 1,
        weightLbs: 1.6,
        depthInches: 3.5,
        ports: 0,
        poeBudget: 0,
        baseWatts: 0,
        closetName: item.closetName,
        rackId: item.rackId,
        qty: item.stackedUnits - 1
      });
    }
  }

  if (item.standardPod) {
    applyStandardPodCabling(item);
  }
}

function applyStandardPodCabling(item) {
  projectBOM = projectBOM.filter(i => !(i.source === "switch_standard_pod" && i.parentInstanceId === item.instanceId));

  if (!item.standardPod) return;

  const infraScope = (typeof getProjectInfrastructureScope === "function")
    ? getProjectInfrastructureScope()
    : { rackPatchPanels: true, patchCords: true };
  const isDirectRj45 = (typeof StorageService !== "undefined" && typeof StorageService.getProjectDefaults === "function")
    ? (StorageService.getProjectDefaults()?.cabling?.rackTermination === "direct_rj45")
    : false;

  const stackMultiplier = (item.stackedUnits && item.stackedUnits >= 2) ? item.stackedUnits : 1;
  const ppCfg = resolveSwitchPatchPanelConfig(item);
  const totalCopperPorts = ppCfg.copperPorts * stackMultiplier;
  const panelQty = ppCfg.panelsPerSwitch * stackMultiplier; // 1x 48P (or 24P) per switch by default; 2x 24P only if DUAL-24P
  const keystonePackQty = Math.max(1, Math.ceil(totalCopperPorts / 24));

  if (infraScope.rackPatchPanels !== false && !isDirectRj45) {
    // 1. Add Unified 48-Port (1U/2U) or 24-Port Modular Keystone Patch Panel(s)
    projectBOM.push({
      instanceId: `pod-pp-${item.instanceId}`,
      parentInstanceId: item.instanceId,
      source: "switch_standard_pod",
      id: `${item.id}-pod-pp`,
      model: `${ppCfg.model} (${ppCfg.isDual24 ? 'Standard Pod: Above & Below' : 'Standard Switch Pod'})`,
      sku: ppCfg.sku,
      role: "Structured Cabling",
      category: "Infrastructure",
      vendor: "Panduit",
      msrp: ppCfg.msrp,
      rackUnits: ppCfg.rackUnits,
      weightLbs: ppCfg.weightLbs,
      depthInches: ppCfg.depthInches,
      ports: ppCfg.ports,
      poeBudget: 0,
      baseWatts: 0,
      closetName: item.closetName,
      rackId: item.rackId,
      qty: panelQty
    });

    // 2. Add Cat6A Shielded Toolless Keystone Jack 24-Packs to populate the modular patch panels
    const defaultJack = (typeof CABLING_CATALOG !== "undefined" && CABLING_CATALOG.connectors?.[0]) || {
      sku: "C6A-KEY-SLD-24",
      name: "Cat6A Shielded Toolless Keystone Jacks (Pack of 24)",
      vendor: "Panduit",
      msrp: 145
    };
    projectBOM.push({
      instanceId: `pod-jacks-${item.instanceId}`,
      parentInstanceId: item.instanceId,
      source: "switch_standard_pod",
      id: `${item.id}-pod-jacks`,
      model: `${defaultJack.name} (Standard Pod Termination)`,
      sku: defaultJack.sku,
      role: "Structured Cabling",
      category: "Infrastructure",
      vendor: defaultJack.vendor || "Panduit",
      msrp: defaultJack.msrp || 145,
      rackUnits: 0,
      packQty: 24,
      poeBudget: 0,
      baseWatts: 0,
      closetName: item.closetName,
      rackId: item.rackId,
      qty: keystonePackQty
    });
  }

  if (infraScope.patchCords === false) return;

  // 3. Add 6-Inch (0.5-Foot) Cat6A Slim Patch Cords aligned with Project Cabling Standards & connected device colors
  const colorCounts = {};
  const ports = (typeof PortEngine !== "undefined" && typeof PortEngine.initSwitchPorts === "function")
    ? PortEngine.initSwitchPorts(item)
    : [];
  const copperPorts = ports.filter(p => !p.isUplink && p.role !== "uplink" && p.role !== "stack_interconnect" && String(p.connector || "RJ-45").includes("RJ"));

  if (copperPorts.length > 0) {
    copperPorts.forEach(p => {
      const dev = (p.connectedDeviceId && Array.isArray(projectBOM))
        ? projectBOM.find(b => b && b.instanceId === p.connectedDeviceId)
        : null;
      const patchStd = (typeof getProjectCablingStandard === "function")
        ? getProjectCablingStandard(dev, "patch")
        : { color: "Yellow" };
      const col = patchStd?.color || "Yellow";
      colorCounts[col] = (colorCounts[col] || 0) + 1;
    });
  } else {
    const defStd = (typeof getProjectCablingStandard === "function")
      ? getProjectCablingStandard(null, "patch")
      : { color: "Yellow" };
    const col = defStd?.color || "Yellow";
    colorCounts[col] = totalCopperPorts;
  }

  Object.entries(colorCounts).forEach(([colorName, count]) => {
    if (count <= 0) return;
    const matchedCord = (typeof findPatchCordItem === "function")
      ? findPatchCordItem(0.5, "Panduit", false, colorName)
      : {
          sku: colorName === "Blue" ? "C6A-SLIM-6IN-BL" : "C6A-SLIM-6IN-YL",
          name: `Cat6A 28AWG Slim High-Density Patch Cord (6-Inch / 0.5-Foot, ${colorName})`,
          vendor: "Panduit",
          msrp: 6.20
        };
    projectBOM.push({
      instanceId: `pod-patch-cables-${item.instanceId}-${colorName.toLowerCase()}`,
      parentInstanceId: item.instanceId,
      source: "switch_standard_pod",
      id: `${item.id}-pod-patch-cables-${colorName.toLowerCase()}`,
      model: matchedCord.name,
      sku: matchedCord.sku,
      role: "Structured Cabling",
      category: "Infrastructure",
      vendor: matchedCord.vendor || "Panduit",
      msrp: matchedCord.msrp || 6.20,
      rackUnits: 0,
      lengthFt: 0.5,
      color: colorName,
      poeBudget: 0,
      baseWatts: 0,
      closetName: item.closetName,
      rackId: item.rackId,
      qty: count
    });
  });
}

function updateDeviceMountMethod(instanceId, method) {
  if (typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) return;
  const item = projectBOM.find(i => i.instanceId === instanceId);
  if (!item) return;

  item.mountMethod = method;
  if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
    FacilityStore.notifyWorkspaceChange();
  }
  updateBOMView();
  if (typeof showToast === "function") {
    const labels = {
      wall: "Wall Mount (Façade)",
      ceiling: "Ceiling / Soffit Mount",
      pole: "Pole / Mast Mount",
      parapet: "Parapet / Roof Mount",
      corner: "Corner Mount Bracket"
    };
    showToast(`Updated mounting for ${item.model} to ${labels[method] || method}`);
  }
}

// -----------------------------------------------------------
// Dynamic Auto-Uplinks (Unified with Topology Auto-Synthesizer)
// -----------------------------------------------------------
function autoResolveUplinks() {
  const coreSwitches = projectBOM.filter(i => (i.role === "Core" || i.role === "Aggregation") && !i.parentInstanceId);
  const accessSwitches = projectBOM.filter(i => i.role === "Access" && !i.parentInstanceId && !i.isDinMounted);

  if (coreSwitches.length === 0) {
    showToast("Please add at least one Core or Aggregation switch to the BOM first.");
    return;
  }
  if (accessSwitches.length === 0) {
    showToast("No standard Access switches found in BOM to calculate uplinks for.");
    return;
  }

  const core = coreSwitches[0];
  // Remove any legacy Uplink Interconnect items so we never double-count with topology_auto_sync
  projectBOM = projectBOM.filter(i => i.role !== "Uplink Interconnect");

  accessSwitches.forEach(sw => {
    if (!sw.uplinkTargetId) {
      sw.uplinkTargetId = core.instanceId;
    }
  });

  if (typeof autoSynthesizeInterconnects === "function") {
    autoSynthesizeInterconnects(false);
    FacilityStore.notifyWorkspaceChange();
    return;
  }
}

function addFirewallToBOM(sku, targetLocation = null, batchCount = 1, skipConfirm = false) {
  const fw = (typeof CatalogRegistry !== "undefined" && CatalogRegistry.get(sku)) ||
             (typeof FIREWALL_DATABASE !== "undefined" ? FIREWALL_DATABASE.find(f => f.sku === sku || f.id === sku) : null);
  if (!fw) return;

  const totalUnitsToAdd = Math.max(1, parseInt(batchCount, 10) || 1);
  const defs = (typeof StorageService !== "undefined" && typeof StorageService.getProjectDefaults === "function") ? StorageService.getProjectDefaults() : null;
  if (!skipConfirm && defs && defs.network?.switchesInScope === false && typeof confirmProjectDefaultChange === "function") {
    confirmProjectDefaultChange({
      title: "Network & Routing Marked Out of Orion Scope",
      settingLabel: "Orion Scope of Work • Active Network & Firewalls",
      defaultLabel: "Customer-Furnished / Out of Scope",
      newLabel: `Include ${fw.vendor} ${fw.model}`,
      message: `Your Project Scope & Defaults specify that Active Network Switching & Routing is Customer-Furnished / Out of Scope. Are you sure you want to add ${fw.vendor} ${fw.model} to Orion's BOM?`,
      allowLocalOverride: true,
      localOverrideLabel: "Add Firewall Once",
      updateDefaultLabel: "Enable Networking in Project Scope",
      onLocalOverride: () => addFirewallToBOM(sku, targetLocation, totalUnitsToAdd, true),
      onUpdateDefault: () => {
        if (typeof updateSingleProjectDefault === "function") {
          updateSingleProjectDefault(d => { if (!d.network) d.network = {}; d.network.switchesInScope = true; });
        }
        addFirewallToBOM(sku, targetLocation, totalUnitsToAdd, true);
      }
    });
    return;
  }
  if (totalUnitsToAdd > 1) {
    for (let k = 0; k < totalUnitsToAdd; k++) {
      addFirewallToBOM(sku, targetLocation, 1, true);
    }
    return;
  }

  const qtyToAdd = 1;
  const instanceId = `fw-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  let defaultLoc = (typeof FacilityStore !== "undefined") ? FacilityStore.UNASSIGNED : "Unassigned";
  if (targetLocation && targetLocation !== "new_location") {
    defaultLoc = typeof FacilityStore !== "undefined" ? FacilityStore.normalize(targetLocation) : targetLocation;
  } else if (typeof FacilityStore !== "undefined") {
    const locs = FacilityStore.getLocationNames(false);
    if (locs.length > 0) {
      defaultLoc = locs.find(l => l.includes("MDF")) || locs[0];
    }
  }

  const ifText = fw.interfaces || "";
  let speed = fw.maxBackboneSpeed || fw.portSpeed || "10G";
  if (ifText.includes("25G") || ifText.includes("SFP28")) speed = "25G";
  else if (ifText.includes("10G") || ifText.includes("SFP+")) speed = "10G";
  else if (ifText.includes("2.5G") || ifText.includes("2.5GbE")) speed = "2.5G";
  else if (ifText.includes("1G") || ifText.includes("SFP") || ifText.includes("1GbE")) speed = "1G";

  const bomItem = {
    instanceId: instanceId,
    id: fw.sku,
    model: fw.model,
    sku: fw.sku,
    role: fw.role || "Security WAN",
    category: fw.category || "firewall",
    vendor: fw.vendor,
    msrp: fw.msrp,
    ports: fw.ports || 4,
    interfaces: fw.interfaces || "",
    wanPorts: fw.wanPorts || "",
    portFormFactorSummary: fw.portFormFactorSummary || fw.interfaces || "",
    uplinksSummary: fw.uplinksSummary || (ifText.includes("SFP") || ifText.includes("QSFP") ? ifText : ""),
    maxBackboneSpeed: speed,
    portSpeed: speed,
    poeBudget: fw.poeBudget || 0,
    poeAfPorts: fw.poeAfPorts || 0,
    poeAtPorts: fw.poeAtPorts || 0,
    baseWatts: fw.baseWatts || 45,
    maxPowerWatts: fw.maxPowerWatts || fw.baseWatts || 60,
    rackUnits: (fw.rackUnits !== undefined) ? fw.rackUnits : 1,
    depthInches: fw.depthInches || 11.2,
    shallowDepth: !!fw.shallowDepth,
    qty: qtyToAdd,
    closetName: defaultLoc,
    rackId: defaultLoc,
    rackSlot: null,
    rackU: null,
    isDinMounted: !!fw.isDinMounted || fw.category === "cellular",
    selectedMgmtProfile: fw.category === "cellular" ? "standalone" : (fw.vendor === "Meraki" ? "cloud" : "standalone"),
    uplinkTargetId: null,
    powerSource: fw.powerSource || "internal_psu",
    dualPsu: !!fw.dualPsu,
    statefulThroughput: fw.statefulThroughput || "",
    threatThroughput: fw.threatThroughput || "",
    vpnThroughput: fw.vpnThroughput || ""
  };

  if (typeof PortEngine !== "undefined" && typeof PortEngine.initSwitchPorts === "function") {
    PortEngine.initSwitchPorts(bomItem);
  }

  projectBOM.push(bomItem);

  FacilityStore.notifyWorkspaceChange();
  showToast(`Added ${fw.model} Gateway to ${defaultLoc}`);
}

function addOpticsToBOM(sku, name, msrp, qty, vendor) {
  const instanceId = `opt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  projectBOM.push({
    instanceId: instanceId,
    id: sku,
    model: name,
    sku: sku,
    role: "Optics / Interconnect",
    vendor: vendor,
    msrp: msrp,
    poeBudget: 0,
    baseWatts: 1,
    qty: qty
  });

  FacilityStore.notifyWorkspaceChange();
  showToast(`Added ${qty}x ${sku} to Project BOM.`);
}

function addServerToBOM(serverId, targetLocation = null, qty = 1, skipConfirm = false) {
  const srv = (typeof CatalogRegistry !== "undefined" && typeof CatalogRegistry.get === "function" ? CatalogRegistry.get(serverId) : null) ||
              (typeof SERVERS_DATABASE !== "undefined" ? SERVERS_DATABASE : []).find(s => s.id === serverId || s.sku === serverId) ||
              (typeof WORKSTATIONS_DATABASE !== "undefined" ? WORKSTATIONS_DATABASE : []).find(w => w.id === serverId || w.sku === serverId);
  if (!srv) return;

  const isWorkstationItem = (typeof WORKSTATIONS_DATABASE !== "undefined" && WORKSTATIONS_DATABASE.some(w => w.id === srv.id || w.sku === srv.sku)) ||
    /workstation/i.test(String(srv.role || "") + " " + String(srv.category || ""));
  const isVmsSoftwareCheck = srv.category === "vms_software" ||
    String(srv.role || "").includes("License") ||
    String(srv.role || "").includes("Maintenance") ||
    String(srv.role || "").includes("Database");

  const defs = (typeof StorageService !== "undefined" && typeof StorageService.getProjectDefaults === "function") ? StorageService.getProjectDefaults() : null;
  if (!skipConfirm && defs && typeof confirmProjectDefaultChange === "function") {
    if (isVmsSoftwareCheck && !window._bypassLicScopePromptOnce) {
      if ((defs.vms?.licensingInScope ?? defs.vms?.headEndInScope) === false) {
        confirmProjectDefaultChange({
          title: "Software Licensing Marked Out of Orion Scope",
          settingLabel: "Orion Scope of Work • Software Licensing",
          defaultLabel: "Excluded / Out of Scope",
          newLabel: `Include ${srv.vendor} ${srv.model}`,
          message: `Your Project Scope & Defaults currently mark Software Licensing as Out of Scope. Are you sure you want to add ${srv.vendor} ${srv.model} to Orion's BOM?`,
          allowLocalOverride: true,
          localOverrideLabel: "Add License Once",
          updateDefaultLabel: "Enable Software Licensing in Project Scope",
          onLocalOverride: () => addServerToBOM(serverId, targetLocation, qty, true),
          onUpdateDefault: () => {
            if (typeof updateSingleProjectDefault === "function") {
              updateSingleProjectDefault(d => { if (!d.vms) d.vms = {}; d.vms.licensingInScope = true; d.vms.headEndInScope = true; });
            }
            addServerToBOM(serverId, targetLocation, qty, true);
          }
        });
        return;
      }
    } else if (!isVmsSoftwareCheck) {
      if ((defs.vms?.serversInScope ?? defs.vms?.headEndInScope) === false) {
        const hwLabel = isWorkstationItem ? "Workstation" : "Server";
        confirmProjectDefaultChange({
          title: "Servers / Workstations Marked Out of Orion Scope",
          settingLabel: "Orion Scope of Work • Servers / Workstations",
          defaultLabel: "Excluded / Out of Scope",
          newLabel: `Include ${srv.vendor} ${srv.model}`,
          message: `Your Project Scope & Defaults currently mark Servers / Workstations as Out of Scope. Are you sure you want to add ${srv.vendor} ${srv.model} to Orion's BOM?`,
          allowLocalOverride: true,
          localOverrideLabel: `Add ${hwLabel} Once`,
          updateDefaultLabel: "Enable Servers / Workstations in Project Scope",
          onLocalOverride: () => addServerToBOM(serverId, targetLocation, qty, true),
          onUpdateDefault: () => {
            if (typeof updateSingleProjectDefault === "function") {
              updateSingleProjectDefault(d => { if (!d.vms) d.vms = {}; d.vms.serversInScope = true; d.vms.headEndInScope = true; });
            }
            addServerToBOM(serverId, targetLocation, qty, true);
          }
        });
        return;
      }

      if (!isWorkstationItem) {
        const srvText = `${srv.vendor || ""} ${srv.model || ""} ${srv.sku || ""}`.toLowerCase();
        const isStreamvault = srvText.includes("streamvault") || (srv.vendor || "").toLowerCase() === "genetec";
        const isHusky = srvText.includes("husky") || (srv.vendor || "").toLowerCase().includes("milestone");
        const defVms = typeof mapProjectPlatformToVmsVendor === "function" ? mapProjectPlatformToVmsVendor(defs.vms?.platform) : "genetec";
        if ((isStreamvault && defVms !== "genetec") || (isHusky && defVms !== "milestone")) {
          const targetPlatform = isHusky ? "Milestone XProtect" : "Genetec";
          confirmProjectDefaultChange({
            title: "Server Appliance Differs from Project VMS Default",
            settingLabel: "VMS Platform & Turnkey Appliance Ecosystem",
            defaultLabel: defs.vms?.platform || "Genetec",
            newLabel: `${targetPlatform} (${srv.model})`,
            message: `Your Project Default VMS Platform is set to "${defs.vms?.platform || 'Genetec'}", while "${srv.model}" is a ${targetPlatform} turnkey appliance. Are you sure you want to add it?`,
            allowLocalOverride: true,
            localOverrideLabel: "Add Appliance Only",
            updateDefaultLabel: `Switch Project VMS to ${targetPlatform} & Add`,
            onLocalOverride: () => addServerToBOM(serverId, targetLocation, qty, true),
            onUpdateDefault: () => {
              if (typeof updateSingleProjectDefault === "function") {
                updateSingleProjectDefault(d => { if (!d.vms) d.vms = {}; d.vms.platform = targetPlatform; }, true);
              }
              addServerToBOM(serverId, targetLocation, qty, true);
            }
          });
          return;
        }
      }
    }
  }

  const count = Math.max(1, parseInt(qty, 10) || 1);
  let assignedLoc = (typeof FacilityStore !== "undefined") ? FacilityStore.UNASSIGNED : "Unassigned";
  if (targetLocation && targetLocation !== "new_location") {
    assignedLoc = typeof FacilityStore !== "undefined" ? FacilityStore.normalize(targetLocation) : targetLocation;
  } else if (typeof FacilityStore !== "undefined") {
    const locs = FacilityStore.getLocationNames(false);
    if (locs.length > 0) {
      assignedLoc = locs.find(l => l.includes("MDF")) || locs[0];
    }
  }

  const isVmsSoftware = srv.category === "vms_software" ||
    String(srv.role || "").includes("License") ||
    String(srv.role || "").includes("Maintenance") ||
    String(srv.role || "").includes("Database");

  if (isVmsSoftware) {
    const existingLic = projectBOM.find(i => !i.parentInstanceId && (i.id === srv.id || i.sku === srv.sku));
    if (existingLic) {
      existingLic.qty = (parseInt(existingLic.qty, 10) || 1) + count;
    } else {
      projectBOM.push({
        instanceId: `lic-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        id: srv.id,
        model: srv.model,
        sku: srv.sku,
        role: srv.role || "Security License",
        category: "vms_software",
        serverType: srv.serverType || "vms_license",
        vendor: srv.vendor || "Genetec",
        msrp: srv.msrp || 0,
        ports: 0,
        poeBudget: 0,
        baseWatts: 0,
        maxPowerWatts: 0,
        rackUnits: 0,
        depthInches: 0,
        dualPsu: false,
        qty: count,
        closetName: assignedLoc,
        rackId: assignedLoc,
        rackSlot: null,
        rackU: null,
        isDinMounted: false
      });
    }
    if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
      FacilityStore.notifyWorkspaceChange();
    }
    if (typeof updateBOMView === "function") updateBOMView();
    if (typeof updateProjectHealthUI === "function") updateProjectHealthUI();
    return;
  }

  const isWorkstation = srv.category === "workstations" || srv.role === "Workstation";

  for (let idx = 0; idx < count; idx++) {
    const instanceId = `srv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}${count > 1 ? `-${idx + 1}` : ''}`;
    projectBOM.push({
      instanceId: instanceId,
      id: srv.id,
      model: srv.model,
      sku: srv.sku,
      role: isWorkstation ? "Workstation" : "Server",
      category: isWorkstation ? "workstations" : "servers",
      serverType: srv.serverType || (isWorkstation ? "operator_client" : "vms_recording"),
      vendor: srv.vendor,
      msrp: srv.msrp,
      ports: srv.ports || 2,
      portSpeed: srv.portSpeed || (isWorkstation ? "2.5G" : "10G"),
      maxBackboneSpeed: srv.portSpeed || (isWorkstation ? "2.5G" : "10G"),
      baseWatts: srv.baseWatts || (isWorkstation ? 220 : 300),
      maxPowerWatts: srv.maxPowerWatts || (isWorkstation ? 450 : 500),
      rackUnits: srv.rackUnits !== undefined ? srv.rackUnits : (isWorkstation ? 0 : 2),
      depthInches: srv.depthInches || 28,
      dualPsu: srv.dualPsu !== false,
      ramGb: srv.ramGb || (isWorkstation ? 16 : 32),
      cpuModel: srv.cpuModel || "",
      gpuModel: srv.gpuModel || null,
      usableStorageTb: srv.usableStorageTb || 0,
      rawStorageTb: srv.rawStorageTb || 0,
      raidLevel: srv.raidLevel || "",
      maxCamerasSupported: srv.maxCamerasSupported || 0,
      qty: 1,
      closetName: assignedLoc,
      rackId: assignedLoc,
      rackSlot: null,
      rackU: null,
      isDinMounted: false,
      hostedRoles: [...(srv.hostedRoles || (isWorkstation ? ["SOC Operator Client"] : ["VMS Ingest & Recording"]))],
      maxIngestBandwidthMbps: srv.maxIngestBandwidthMbps || (isWorkstation ? 0 : 750),
      powerSource: srv.dualPsu === false ? "single_ac" : "dual_ac",
      uplinkTargetId: null
    });
  }

  FacilityStore.notifyWorkspaceChange();
  showToast(`Added ${count > 1 ? `${count}x ` : ''}${srv.model} to ${assignedLoc}`);
}

function addToBOM(idOrSku, qty = 1, targetLocation = null, skipConfirm = false) {
  if (!idOrSku) return;
  const count = Math.max(1, parseInt(qty, 10) || 1);

  const isSrvOrLic = (typeof SERVERS_DATABASE !== "undefined" && SERVERS_DATABASE.some(s => s.id === idOrSku || s.sku === idOrSku)) ||
                     (typeof WORKSTATIONS_DATABASE !== "undefined" && WORKSTATIONS_DATABASE.some(w => w.id === idOrSku || w.sku === idOrSku));
  if (isSrvOrLic) {
    addServerToBOM(idOrSku, targetLocation, count, skipConfirm);
    return;
  }

  const isCam = (typeof CAMERAS_DATABASE !== "undefined" && CAMERAS_DATABASE.some(c => c.id === idOrSku || c.sku === idOrSku)) ||
                (typeof GENERIC_CAMERA_TYPES !== "undefined" && GENERIC_CAMERA_TYPES.some(c => c.id === idOrSku || c.sku === idOrSku));
  if (isCam) {
    addCameraToBOM(idOrSku, targetLocation, null, count, skipConfirm);
    return;
  }

  const isAcc = typeof ACCESS_CONTROL_DATABASE !== "undefined" && ACCESS_CONTROL_DATABASE.some(a => a.id === idOrSku || a.sku === idOrSku);
  if (isAcc) {
    addAccessDeviceToBOM(idOrSku, targetLocation, null, count, skipConfirm);
    return;
  }

  const isSw = typeof SWITCH_DATABASE !== "undefined" && SWITCH_DATABASE.some(s => s.id === idOrSku || s.sku === idOrSku);
  if (isSw) {
    addToProjectBOM(idOrSku, targetLocation, count, skipConfirm);
    return;
  }

  const isFw = typeof FIREWALL_DATABASE !== "undefined" && FIREWALL_DATABASE.some(f => f.id === idOrSku || f.sku === idOrSku);
  if (isFw) {
    addFirewallToBOM(idOrSku, targetLocation, count, skipConfirm);
    return;
  }

  const catItem = typeof CatalogRegistry !== "undefined" && typeof CatalogRegistry.get === "function" ? CatalogRegistry.get(idOrSku) : null;
  if (catItem) {
    const defs = (typeof StorageService !== "undefined" && typeof StorageService.getProjectDefaults === "function") ? StorageService.getProjectDefaults() : null;
    const catKey = String(catItem.category || "").toLowerCase();
    const roleKey = String(catItem.role || "").toLowerCase();
    const isRackOrEnc = catKey === "racks" || catKey === "enclosures" || roleKey.includes("equipment rack");
    const isUpsOrPdu = catKey === "ups" || catKey === "pdus" || roleKey === "ups" || roleKey.includes("rack ups") || roleKey.includes("pdu");
    if (!skipConfirm && defs && typeof confirmProjectDefaultChange === "function") {
      if (isRackOrEnc && defs.infrastructure?.racksInScope === false) {
        confirmProjectDefaultChange({
          title: "Racks & Enclosures Marked Out of Orion Scope",
          settingLabel: "Orion Scope of Work • Racks & Enclosures",
          defaultLabel: "Excluded / Out of Scope",
          newLabel: `Include ${catItem.vendor || "Generic"} ${catItem.model || idOrSku}`,
          message: `Your Project Scope & Defaults currently mark Racks & Enclosures as Out of Scope. Are you sure you want to add ${catItem.model || idOrSku} to Orion's BOM?`,
          allowLocalOverride: true,
          localOverrideLabel: "Add Rack / Enclosure Once",
          updateDefaultLabel: "Enable Racks & Enclosures in Project Scope",
          onLocalOverride: () => addToBOM(idOrSku, count, targetLocation, true),
          onUpdateDefault: () => {
            if (typeof updateSingleProjectDefault === "function") {
              updateSingleProjectDefault(d => { if (!d.infrastructure) d.infrastructure = {}; d.infrastructure.racksInScope = true; });
            }
            addToBOM(idOrSku, count, targetLocation, true);
          }
        });
        return;
      }
      if (isUpsOrPdu && defs.infrastructure?.powerInScope === false) {
        confirmProjectDefaultChange({
          title: "Rack Power (UPS / PDU) Marked Out of Orion Scope",
          settingLabel: "Orion Scope of Work • Rack Power (UPS / PDU)",
          defaultLabel: "Excluded / Out of Scope",
          newLabel: `Include ${catItem.vendor || "Generic"} ${catItem.model || idOrSku}`,
          message: `Your Project Scope & Defaults currently mark Rack Power (UPS / PDU) as Out of Scope. Are you sure you want to add ${catItem.model || idOrSku} to Orion's BOM?`,
          allowLocalOverride: true,
          localOverrideLabel: "Add Power Unit Once",
          updateDefaultLabel: "Enable Rack Power in Project Scope",
          onLocalOverride: () => addToBOM(idOrSku, count, targetLocation, true),
          onUpdateDefault: () => {
            if (typeof updateSingleProjectDefault === "function") {
              updateSingleProjectDefault(d => { if (!d.infrastructure) d.infrastructure = {}; d.infrastructure.powerInScope = true; });
            }
            addToBOM(idOrSku, count, targetLocation, true);
          }
        });
        return;
      }
    }
    const existing = projectBOM.find(i => !i.parentInstanceId && (i.id === catItem.id || i.sku === catItem.sku));
    if (existing) {
      existing.qty = (parseInt(existing.qty, 10) || 1) + count;
    } else {
      const locs = typeof FacilityStore !== "undefined" ? FacilityStore.getLocationNames(false) : [];
      const assignedLoc = targetLocation || locs.find(l => l.includes("MDF")) || locs[0] || "MDF • Rack-1";
      projectBOM.push({
        instanceId: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        id: catItem.id || catItem.sku,
        model: catItem.model || catItem.name || idOrSku,
        sku: catItem.sku || catItem.id,
        role: catItem.role || "Accessory",
        category: catItem.category || "accessories",
        vendor: catItem.vendor || "Generic",
        msrp: catItem.msrp || 0,
        rackUnits: catItem.rackUnits || 0,
        baseWatts: catItem.baseWatts || 0,
        poeBudget: catItem.poeBudget || 0,
        qty: count,
        closetName: assignedLoc,
        rackId: assignedLoc,
        rackSlot: null
      });
    }
    if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
      FacilityStore.notifyWorkspaceChange();
    }
    if (typeof updateBOMView === "function") updateBOMView();
    if (typeof updateProjectHealthUI === "function") updateProjectHealthUI();
  }
}

function addCameraToBOM(cameraId, targetLocation = null, uplinkTargetId = null, qty = 1, skipConfirm = false) {
  const cam = (typeof CatalogRegistry !== "undefined" && typeof CatalogRegistry.get === "function" ? CatalogRegistry.get(cameraId) : null) ||
              (typeof GENERIC_CAMERA_TYPES !== "undefined" ? GENERIC_CAMERA_TYPES : []).find(c => c.id === cameraId || c.sku === cameraId) ||
              (typeof CAMERAS_DATABASE !== "undefined" ? CAMERAS_DATABASE : []).find(c => c.id === cameraId || c.sku === cameraId);
  if (!cam) return;

  const preCheckDefs = (typeof StorageService !== "undefined" && typeof StorageService.getProjectDefaults === "function") ? StorageService.getProjectDefaults() : null;
  if (!skipConfirm && preCheckDefs && typeof confirmProjectDefaultChange === "function") {
    if (preCheckDefs.vms?.enabled === false) {
      confirmProjectDefaultChange({
        title: "Video Surveillance Marked Out of Orion Scope",
        settingLabel: "Orion Scope of Work • Video Surveillance (VMS / CCTV)",
        defaultLabel: "Excluded / Out of Scope",
        newLabel: `Include ${cam.model}`,
        message: `Your Project Scope & Defaults currently mark Video Surveillance (VMS / CCTV) as Excluded / Out of Scope. Are you sure you want to add ${cam.model} to Orion's BOM?`,
        allowLocalOverride: true,
        localOverrideLabel: "Add Camera Once",
        updateDefaultLabel: "Enable Video Surveillance in Project Scope",
        onLocalOverride: () => addCameraToBOM(cameraId, targetLocation, uplinkTargetId, qty, true),
        onUpdateDefault: () => {
          if (typeof updateSingleProjectDefault === "function") {
            updateSingleProjectDefault(d => { if (!d.vms) d.vms = {}; d.vms.enabled = true; });
          }
          addCameraToBOM(cameraId, targetLocation, uplinkTargetId, qty, true);
        }
      });
      return;
    }

    const prefVendors = Array.isArray(preCheckDefs.vms?.cameraVendors) ? preCheckDefs.vms.cameraVendors : [];
    const canonCamVendor = typeof canonicalWizardCameraVendorName === "function" ? canonicalWizardCameraVendorName(cam.vendor) : cam.vendor;
    const isGenericCam = Boolean(cam.isGenericCamera) || /generic/i.test(String(cam.vendor || ""));
    if (!isGenericCam && prefVendors.length > 0 && !prefVendors.some(v => (typeof canonicalWizardCameraVendorName === "function" ? canonicalWizardCameraVendorName(v) : v) === canonCamVendor)) {
      confirmProjectDefaultChange({
        title: "Non-Default Camera Manufacturer Selected",
        settingLabel: "Preferred Camera Manufacturers",
        defaultLabel: prefVendors.join(", "),
        newLabel: `${cam.vendor} (${cam.model})`,
        message: `Your Project Defaults specify [${prefVendors.join(", ")}] as Preferred Camera Manufacturers. Are you sure you want to add "${cam.vendor} ${cam.model}"?`,
        allowLocalOverride: true,
        localOverrideLabel: "Add as One-Time Exception",
        updateDefaultLabel: `Add ${canonCamVendor} to Project Defaults & Quote`,
        onLocalOverride: () => addCameraToBOM(cameraId, targetLocation, uplinkTargetId, qty, true),
        onUpdateDefault: () => {
          if (typeof updateSingleProjectDefault === "function") {
            updateSingleProjectDefault(d => {
              if (!d.vms) d.vms = {};
              const cur = Array.isArray(d.vms.cameraVendors) ? d.vms.cameraVendors : [];
              if (!cur.includes(canonCamVendor)) d.vms.cameraVendors = [...cur, canonCamVendor];
            }, true);
          }
          addCameraToBOM(cameraId, targetLocation, uplinkTargetId, qty, true);
        }
      });
      return;
    }
  }

  const count = Math.max(1, Math.min(500, parseInt(qty, 10) || 1));

  let assignedLoc = (typeof FacilityStore !== "undefined") ? FacilityStore.UNASSIGNED : "Unassigned";
  if (targetLocation && targetLocation !== "new_location") {
    assignedLoc = typeof FacilityStore !== "undefined" ? FacilityStore.normalize(targetLocation) : targetLocation;
  } else if (typeof FacilityStore !== "undefined") {
    const locs = FacilityStore.getLocationNames(false);
    if (locs.length > 0) {
      assignedLoc = locs.find(l => l.includes("IDF")) || locs[0];
    }
  }

  // Auto-resolve uplink switch if not explicitly provided
  let targetSwitchId = uplinkTargetId;
  if (!targetSwitchId && assignedLoc !== (typeof FacilityStore !== "undefined" ? FacilityStore.UNASSIGNED : "Unassigned")) {
    const sw = projectBOM.find(i => !i.parentInstanceId && (i.role === "Access" || i.role === "Core") && FacilityStore.normalize(i.closetName) === assignedLoc);
    if (sw) targetSwitchId = sw.instanceId;
  }

  const defs = (typeof StorageService !== "undefined" && typeof StorageService.getProjectDefaults === "function")
    ? StorageService.getProjectDefaults()
    : null;

  let lastAddedCam = null;

  for (let idx = 0; idx < count; idx++) {
    const instanceId = `cam-${Date.now()}-${Math.random().toString(36).substring(2, 6)}${count > 1 ? `-${idx + 1}` : ''}`;

    const newCam = {
      instanceId: instanceId,
      id: cam.id,
      model: cam.model,
      sku: cam.sku,
      role: "Camera",
      category: "camera",
      vendor: cam.vendor,
      msrp: cam.msrp,
      ports: 1,
      isGenericCamera: Boolean(cam.isGenericCamera),
      genericCameraTypeId: cam.genericCameraTypeId || (cam.isGenericCamera ? cam.id : null),
      heads: cam.heads || 1,
      mpPerHead: cam.mpPerHead || cam.sensorMegapixels || 2,
      sensorMegapixels: cam.sensorMegapixels || 2,
      defaultFps: cam.defaultFps || 15,
      compression: cam.compression || "H.265",
      powerConsumptionWatts: cam.powerConsumptionWatts || 8,
      maxPowerWatts: cam.maxPowerWatts || 15.4,
      poeStandard: cam.poeStandard || "802.3af",
      poeClass: cam.poeClass || null,
      poeTierKey: cam.poeTierKey || null,
      streamBitrateMbps: cam.streamBitrateMbps || 4.0,
      resolution: cam.resolution || "2MP",
      formFactor: cam.formFactor || "dome",
      recommendedUpgradeSkus: Array.isArray(cam.recommendedUpgradeSkus) ? [...cam.recommendedUpgradeSkus] : [],
      qty: 1,
      closetName: assignedLoc,
      rackId: assignedLoc,
      rackSlot: null,
      rackU: null,
      isDinMounted: false,
      mountMethod: assignedLoc.toLowerCase().includes("pole") ? "pole" : ((cam.formFactor === "dome" || cam.formFactor === "fisheye" || cam.dome) ? "ceiling" : "wall"),
      uplinkTargetId: targetSwitchId,
      assignedRecordingServerId: null
    };

    if (!cam.isGenericCamera && defs && defs.vms && defs.vms.promptAnalytics) {
      const hasAI = cam.deepLearningAnalytics || (cam.keyFeatures && cam.keyFeatures.some(f => /deep learning|dlpu|artpec|analytics|iva|object classification|ngva/i.test(f)));
      if (hasAI) {
        newCam.videoAnalyticsEnabled = true;
        newCam.analyticsProfile = cam.vendor === "Axis Communications"
          ? "Axis Object Analytics (AOA - DLPU)"
          : (cam.vendor === "Hanwha Vision"
              ? "Hanwha AI Object Detection (Person/Vehicle/Face)"
              : (cam.vendor === "Bosch" || cam.vendor === "Bosch Security"
                  ? "Bosch IVA Pro Buildings"
                  : (cam.vendor === "Avigilon" ? "Avigilon Next-Gen Video Analytics (NGVA)" : "AI Video Analytics")));
      }
    }

    projectBOM.push(newCam);
    lastAddedCam = newCam;

    if (typeof PortEngine !== "undefined") {
      PortEngine.initDeviceInterfaces(newCam);
      if (targetSwitchId) {
        const sw = projectBOM.find(i => i.instanceId === targetSwitchId);
        if (sw) PortEngine.allocatePort(sw, newCam);
      } else {
        PortEngine.autoAssignDeviceToClosetSwitch(newCam, assignedLoc);
      }
    }
  }

  if (typeof VideoStorageSizer !== "undefined" && VideoStorageSizer.state) {
    VideoStorageSizer.state.hasCustomGroups = false;
    VideoStorageSizer.state.sourceMode = "auto";
    if (typeof window !== "undefined") window.videoSourceMode = "auto";
  }
  if (typeof deriveDemandFromBOM === "function") {
    deriveDemandFromBOM(true);
  }
  if (typeof renderGlobalDesignModeToggle === "function") {
    renderGlobalDesignModeToggle();
  }
  FacilityStore.notifyWorkspaceChange();
  if (typeof buildCalculatorStrip === "function") {
    buildCalculatorStrip();
  }
  if (count > 1) {
    showToast(`Added ${count}x ${cam.model} units to ${assignedLoc}`);
  } else if (lastAddedCam && lastAddedCam.videoAnalyticsEnabled) {
    showToast(`Added ${cam.model} (${lastAddedCam.analyticsProfile})`);
  } else {
    showToast(`Added ${cam.model} to quote`);
  }
}

/**
 * Applies a catalog camera definition (either an actual part from CAMERAS_DATABASE
 * or a generic camera type from GENERIC_CAMERA_TYPES) onto an existing BOM camera instance
 * while preserving its instanceId, closet/rack placement, switch port allocation, and floorplan drop.
 */
function applyCameraCatalogSpecToBomInstance(bomCam, targetCatCam) {
  if (!bomCam || !targetCatCam) return false;

  // Preserve original genericCameraTypeId if upgrading from a generic type so user can see origin or re-map
  if (bomCam.isGenericCamera && (bomCam.genericCameraTypeId || bomCam.id)) {
    bomCam.originGenericTypeId = bomCam.genericCameraTypeId || bomCam.id;
  }

  bomCam.id = targetCatCam.id;
  bomCam.sku = targetCatCam.sku;
  bomCam.model = targetCatCam.model;
  bomCam.vendor = targetCatCam.vendor;
  bomCam.msrp = targetCatCam.msrp;
  bomCam.isGenericCamera = Boolean(targetCatCam.isGenericCamera);
  if (targetCatCam.isGenericCamera) {
    bomCam.genericCameraTypeId = targetCatCam.genericCameraTypeId || targetCatCam.id;
  }

  bomCam.heads = targetCatCam.heads || 1;
  bomCam.mpPerHead = targetCatCam.mpPerHead || targetCatCam.sensorMegapixels || 2;
  bomCam.sensorMegapixels = targetCatCam.sensorMegapixels || 2;
  bomCam.defaultFps = targetCatCam.defaultFps || 15;
  bomCam.compression = targetCatCam.compression || "H.265";
  bomCam.powerConsumptionWatts = targetCatCam.powerConsumptionWatts || 8;
  bomCam.maxPowerWatts = targetCatCam.maxPowerWatts || 15.4;
  bomCam.poeStandard = targetCatCam.poeStandard || "802.3af";
  bomCam.poeClass = targetCatCam.poeClass || null;
  bomCam.poeTierKey = targetCatCam.poeTierKey || null;
  bomCam.streamBitrateMbps = targetCatCam.streamBitrateMbps || 4.0;
  bomCam.resolution = targetCatCam.resolution || "2MP";
  bomCam.formFactor = targetCatCam.formFactor || bomCam.formFactor || "dome";
  bomCam.image = targetCatCam.image || null;
  bomCam.datasheetPath = targetCatCam.datasheet || targetCatCam.datasheetPath || null;

  if (Array.isArray(targetCatCam.recommendedUpgradeSkus) && targetCatCam.recommendedUpgradeSkus.length > 0) {
    bomCam.recommendedUpgradeSkus = [...targetCatCam.recommendedUpgradeSkus];
  }

  // Sync floorplan drop metadata if placed on Physical Layout canvas
  if (typeof floorplanState !== "undefined" && Array.isArray(floorplanState.deviceDrops)) {
    floorplanState.deviceDrops.forEach(drop => {
      if (drop.instanceId === bomCam.instanceId) {
        drop.sku = bomCam.sku;
        drop.model = bomCam.model;
      }
    });
  }

  return true;
}

/**
 * Bulk-upgrades all quoted cameras of a given generic camera type to a selected actual catalog SKU.
 */
function upgradeGenericCameraTypeBulk(genericTypeId, targetSkuOverride = null) {
  if (!genericTypeId || typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) return;

  const selectEl = document.getElementById(`bulk-upgrade-select-${genericTypeId}`) || document.getElementById(`bulkUpgradeSelect-${genericTypeId}`);
  const chosenSku = targetSkuOverride || (selectEl ? selectEl.value : null);
  if (!chosenSku) {
    if (typeof showToast === "function") showToast("Select a target camera SKU first.");
    return;
  }

  const targetCatCam = (typeof CAMERAS_DATABASE !== "undefined" ? CAMERAS_DATABASE : []).find(c => c.sku === chosenSku || c.id === chosenSku) ||
                       (typeof CatalogRegistry !== "undefined" && typeof CatalogRegistry.get === "function" ? CatalogRegistry.get(chosenSku) : null);
  if (!targetCatCam) {
    if (typeof showToast === "function") showToast(`Camera SKU ${chosenSku} not found in catalog.`);
    return;
  }

  let upgradedCount = 0;
  projectBOM.forEach(item => {
    if (!item || item.parentInstanceId) return;
    const isCam = item.role === "Camera" || item.category === "camera" || item.category === "cameras";
    if (!isCam) return;
    const matchesGeneric = (item.isGenericCamera && (item.genericCameraTypeId === genericTypeId || item.id === genericTypeId || item.sku === genericTypeId)) ||
                           (item.originGenericTypeId === genericTypeId && item.isGenericCamera);
    if (matchesGeneric) {
      applyCameraCatalogSpecToBomInstance(item, targetCatCam);
      upgradedCount += (parseInt(item.qty, 10) || 1);
    }
  });

  if (upgradedCount > 0) {
    if (typeof DeviceTaxonomy !== "undefined" && typeof DeviceTaxonomy.recalculateNumbers === "function") {
      DeviceTaxonomy.recalculateNumbers(projectBOM);
    }
    if (typeof deriveDemandFromBOM === "function") {
      deriveDemandFromBOM(true);
    }
    if (typeof renderGlobalDesignModeToggle === "function") {
      renderGlobalDesignModeToggle();
    }
    if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
      FacilityStore.notifyWorkspaceChange();
    }
    if (typeof buildCalculatorStrip === "function") {
      buildCalculatorStrip();
    }
    if (typeof runActiveFilter === "function") {
      runActiveFilter();
    }
    if (typeof showToast === "function") {
      showToast(`Converted ${upgradedCount}x generic cameras to ${targetCatCam.vendor} ${targetCatCam.model} (${targetCatCam.sku})`);
    }
  } else {
    if (typeof showToast === "function") {
      showToast("No matching generic cameras found in Project BOM.");
    }
  }
}
window.upgradeGenericCameraTypeBulk = upgradeGenericCameraTypeBulk;

/**
 * Bulk-upgrades ALL generic cameras currently in the BOM to their currently selected dropdown SKUs
 * (or their primary recommended catalog SKU).
 */
function upgradeAllGenericCamerasToRecommended() {
  if (typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) return;

  const genericTypesInBom = new Set();
  projectBOM.forEach(item => {
    if (item && !item.parentInstanceId && item.isGenericCamera) {
      genericTypesInBom.add(item.genericCameraTypeId || item.id || item.sku);
    }
  });

  if (genericTypesInBom.size === 0) {
    if (typeof showToast === "function") showToast("All cameras in Project BOM are already assigned to specific catalog SKUs.");
    return;
  }

  let totalUpgraded = 0;
  genericTypesInBom.forEach(typeId => {
    const selectEl = document.getElementById(`bulk-upgrade-select-${typeId}`) || document.getElementById(`bulkUpgradeSelect-${typeId}`);
    const genericDef = (typeof GENERIC_CAMERA_TYPES !== "undefined" ? GENERIC_CAMERA_TYPES : []).find(g => g.id === typeId || g.sku === typeId);
    const chosenSku = (selectEl && selectEl.value) || (genericDef && Array.isArray(genericDef.recommendedUpgradeSkus) ? genericDef.recommendedUpgradeSkus[0] : null);
    if (!chosenSku) return;

    const targetCatCam = (typeof CAMERAS_DATABASE !== "undefined" ? CAMERAS_DATABASE : []).find(c => c.sku === chosenSku || c.id === chosenSku);
    if (!targetCatCam) return;

    projectBOM.forEach(item => {
      if (item && !item.parentInstanceId && item.isGenericCamera && (item.genericCameraTypeId === typeId || item.id === typeId || item.sku === typeId)) {
        applyCameraCatalogSpecToBomInstance(item, targetCatCam);
        totalUpgraded += (parseInt(item.qty, 10) || 1);
      }
    });
  });

  if (totalUpgraded > 0) {
    if (typeof DeviceTaxonomy !== "undefined" && typeof DeviceTaxonomy.recalculateNumbers === "function") {
      DeviceTaxonomy.recalculateNumbers(projectBOM);
    }
    if (typeof deriveDemandFromBOM === "function") {
      deriveDemandFromBOM(true);
    }
    if (typeof renderGlobalDesignModeToggle === "function") {
      renderGlobalDesignModeToggle();
    }
    if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
      FacilityStore.notifyWorkspaceChange();
    }
    if (typeof buildCalculatorStrip === "function") {
      buildCalculatorStrip();
    }
    if (typeof runActiveFilter === "function") {
      runActiveFilter();
    }
    if (typeof showToast === "function") {
      showToast(`Bulk-converted ${totalUpgraded}x generic cameras to actual catalog SKUs!`);
    }
  }
}
window.upgradeAllGenericCamerasToRecommended = upgradeAllGenericCamerasToRecommended;

/**
 * Overrides a single individual camera instance in the Project BOM (e.g., from the BOM row dropdown
 * or Inspector) to any specific catalog SKU or generic camera type while preserving its closet/port/drop.
 */
function upgradeSingleCameraInstance(instanceId, targetSkuOrId) {
  if (!instanceId || !targetSkuOrId || typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) return;
  const bomCam = projectBOM.find(i => i.instanceId === instanceId);
  if (!bomCam) return;

  const targetCatCam = (typeof CAMERAS_DATABASE !== "undefined" ? CAMERAS_DATABASE : []).find(c => c.sku === targetSkuOrId || c.id === targetSkuOrId) ||
                       (typeof GENERIC_CAMERA_TYPES !== "undefined" ? GENERIC_CAMERA_TYPES : []).find(g => g.sku === targetSkuOrId || g.id === targetSkuOrId) ||
                       (typeof CatalogRegistry !== "undefined" && typeof CatalogRegistry.get === "function" ? CatalogRegistry.get(targetSkuOrId) : null);
  if (!targetCatCam) return;

  const prevLabel = bomCam.friendlyName || bomCam.deviceNumber || bomCam.model;
  applyCameraCatalogSpecToBomInstance(bomCam, targetCatCam);

  if (typeof DeviceTaxonomy !== "undefined" && typeof DeviceTaxonomy.recalculateNumbers === "function") {
    DeviceTaxonomy.recalculateNumbers(projectBOM);
  }
  if (typeof deriveDemandFromBOM === "function") {
    deriveDemandFromBOM(true);
  }
  if (typeof renderGlobalDesignModeToggle === "function") {
    renderGlobalDesignModeToggle();
  }
  if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
    FacilityStore.notifyWorkspaceChange();
  }
  if (typeof updateBOMView === "function") {
    updateBOMView();
  }
  if (typeof buildCalculatorStrip === "function") {
    buildCalculatorStrip();
  }
  if (typeof showToast === "function") {
    showToast(`Updated ${prevLabel} → ${targetCatCam.vendor} ${targetCatCam.model} (${targetCatCam.sku})`);
  }
}
window.upgradeSingleCameraInstance = upgradeSingleCameraInstance;

function addAccessDeviceToBOM(accessId, targetLocation = null, uplinkTargetId = null, batchCount = 1, skipConfirm = false) {
  const dev = (typeof CatalogRegistry !== "undefined" && typeof CatalogRegistry.get === "function" ? CatalogRegistry.get(accessId) : null) ||
              (typeof ACCESS_CONTROL_DATABASE !== "undefined" ? ACCESS_CONTROL_DATABASE : []).find(a => a.id === accessId || a.sku === accessId);
  if (!dev) return;

  const totalUnitsToAdd = Math.max(1, parseInt(batchCount, 10) || 1);
  const defs = (typeof StorageService !== "undefined" && typeof StorageService.getProjectDefaults === "function") ? StorageService.getProjectDefaults() : null;
  if (!skipConfirm && !window._bypassAcsScopePromptOnce && defs && defs.accessControl?.enabled === false && typeof confirmProjectDefaultChange === "function") {
    confirmProjectDefaultChange({
      title: "Access Control Marked Out of Orion Scope",
      settingLabel: "Orion Scope of Work • Access Control System (ACS)",
      defaultLabel: "Excluded / Out of Scope",
      newLabel: `Include ${dev.vendor} ${dev.model}`,
      message: `Your Project Scope & Defaults currently mark Access Control (ACS) as Excluded / Out of Scope. Are you sure you want to add ${totalUnitsToAdd > 1 ? `${totalUnitsToAdd}x ` : ""}${dev.vendor} ${dev.model} to Orion's BOM?`,
      allowLocalOverride: true,
      localOverrideLabel: "Add Device Once",
      updateDefaultLabel: "Enable Access Control in Project Scope",
      onLocalOverride: () => addAccessDeviceToBOM(accessId, targetLocation, uplinkTargetId, totalUnitsToAdd, true),
      onUpdateDefault: () => {
        if (typeof updateSingleProjectDefault === "function") {
          updateSingleProjectDefault(d => { if (!d.accessControl) d.accessControl = {}; d.accessControl.enabled = true; });
        }
        addAccessDeviceToBOM(accessId, targetLocation, uplinkTargetId, totalUnitsToAdd, true);
      }
    });
    return;
  }
  if (totalUnitsToAdd > 1) {
    for (let k = 0; k < totalUnitsToAdd; k++) {
      addAccessDeviceToBOM(accessId, targetLocation, uplinkTargetId, 1, true);
    }
    return;
  }

  const instanceId = `acc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  let assignedLoc = (typeof FacilityStore !== "undefined") ? FacilityStore.UNASSIGNED : "Unassigned";
  if (targetLocation && targetLocation !== "new_location") {
    assignedLoc = typeof FacilityStore !== "undefined" ? FacilityStore.normalize(targetLocation) : targetLocation;
  } else if (typeof FacilityStore !== "undefined") {
    const locs = FacilityStore.getLocationNames(false);
    if (locs.length > 0) {
      assignedLoc = locs.find(l => l.includes("IDF")) || locs[0];
    }
  }

  let targetSwitchId = uplinkTargetId;
  if (!targetSwitchId && assignedLoc !== (typeof FacilityStore !== "undefined" ? FacilityStore.UNASSIGNED : "Unassigned")) {
    const sw = projectBOM.find(i => !i.parentInstanceId && (i.role === "Access" || i.role === "Core") && FacilityStore.normalize(i.closetName) === assignedLoc);
    if (sw) targetSwitchId = sw.instanceId;
  }

  const newAcc = {
    instanceId: instanceId,
    id: dev.id,
    model: dev.model,
    sku: dev.sku,
    role: "Access Control",
    category: "access_control",
    vendor: dev.vendor,
    msrp: dev.msrp,
    ports: 1,
    powerConsumptionWatts: dev.powerConsumptionWatts || 15,
    poeStandard: dev.poeStandard || "802.3at",
    doorCapacity: dev.doorCapacity || 2,
    readerCapacity: dev.readerCapacity || 4,
    qty: 1,
    closetName: assignedLoc,
    rackId: assignedLoc,
    rackSlot: null,
    rackU: null,
    isDinMounted: dev.mounting && dev.mounting.includes("DIN"),
    mountMethod: (dev.mounting && dev.mounting.includes("DIN")) ? "din" : "wall",
    uplinkTargetId: targetSwitchId,
    assignedAccessServerId: null
  };

  projectBOM.push(newAcc);

  if (typeof PortEngine !== "undefined") {
    PortEngine.initDeviceInterfaces(newAcc);
    if (targetSwitchId) {
      const sw = projectBOM.find(i => i.instanceId === targetSwitchId);
      if (sw) PortEngine.allocatePort(sw, newAcc);
    } else {
      PortEngine.autoAssignDeviceToClosetSwitch(newAcc, assignedLoc);
    }
  }

  FacilityStore.notifyWorkspaceChange();
  showToast(`Added ${dev.model} to quote`);
}

function addWirelessToBOM(radioId, isMatchedPair = false, targetLocation = null) {
  const radio = (typeof CatalogRegistry !== "undefined" && typeof CatalogRegistry.get === "function" ? CatalogRegistry.get(radioId) : null) ||
                (typeof WIRELESS_DATABASE !== "undefined" ? WIRELESS_DATABASE : []).find(r => r.id === radioId || r.sku === radioId);
  if (!radio) return;

  // Support legacy calls where 2nd arg was a location string
  if (typeof isMatchedPair === "string") {
    targetLocation = isMatchedPair;
    isMatchedPair = false;
  }

  const precChecked = document.getElementById(`wl-prec-${radio.id}`)?.checked;
  const surgeChecked = document.getElementById(`wl-surge-${radio.id}`)?.checked;
  const antSelect = document.getElementById(`wl-ant-${radio.id}`);
  const licChecked = document.getElementById(`wl-lic-${radio.id}`)?.checked;

  let defaultClosetA = (typeof FacilityStore !== "undefined") ? FacilityStore.UNASSIGNED : "Unassigned";
  let defaultClosetB = (typeof FacilityStore !== "undefined") ? FacilityStore.UNASSIGNED : "Unassigned";
  if (typeof FacilityStore !== "undefined") {
    const locs = FacilityStore.getLocationNames(false);
    if (locs.length > 0) {
      defaultClosetA = locs.find(l => l.includes("MDF")) || locs[0];
      defaultClosetB = locs.find(l => l.toLowerCase().includes("pole") || l.includes("IDF")) || locs[0];
    }
  }
  if (targetLocation && targetLocation !== "new_location") {
    const normLoc = typeof FacilityStore !== "undefined" ? FacilityStore.normalize(targetLocation) : targetLocation;
    defaultClosetB = normLoc;
  }

  const rolesToCreate = isMatchedPair 
    ? [
        { label: "PtP Local Master", defaultCloset: defaultClosetA, defaultPower: "poe_switch" },
        { label: "PtP Remote Substation", defaultCloset: defaultClosetB, defaultPower: "local_injector" }
      ]
    : [
        { label: radio.topology === "PtMP-AP" ? "PtMP BaseStation AP" : "Wireless Radio", defaultCloset: defaultClosetB, defaultPower: "poe_switch" }
      ];

  const linkPairId = `link-${Date.now()}`;

  rolesToCreate.forEach(roleConfig => {
    const instanceId = `wl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    projectBOM.push({
      instanceId: instanceId,
      linkPairId: isMatchedPair ? linkPairId : null,
      id: radio.sku,
      model: `${radio.model} (${roleConfig.label})`,
      sku: radio.sku,
      role: "Wireless Bridge",
      vendor: radio.vendor,
      msrp: radio.msrp,
      ports: 1,
      poeBudget: 0,
      baseWatts: radio.powerWatts,
      poeWattsDrawn: radio.powerWatts,
      poeStandardRequired: radio.powerWatts > 30 ? "802.3bt-60" : "802.3at",
      powerSource: roleConfig.defaultPower,
      uplinkTargetId: null,
      uplinkMode: "single",
      depthInches: 4,
      shallowDepth: true,
      qty: 1,
      closetName: roleConfig.defaultCloset,
      rackId: roleConfig.defaultCloset,
      rackSlot: null,
      rackU: null,
      isDinMounted: true,
      mountMethod: roleConfig.defaultCloset.toLowerCase().includes("pole") ? "pole" : "wall"
    });

    if (precChecked && radio.precisionMountSku && WIRELESS_ACCESSORY_CATALOG[radio.precisionMountSku]) {
      const acc = WIRELESS_ACCESSORY_CATALOG[radio.precisionMountSku];
      projectBOM.push({
        instanceId: `mnt-${instanceId}`,
        parentInstanceId: instanceId,
        id: acc.sku,
        model: acc.name,
        sku: acc.sku,
        role: "Mounting Bracket",
        vendor: radio.vendor,
        msrp: acc.msrp,
        poeBudget: 0,
        baseWatts: 0,
        closetName: roleConfig.defaultCloset,
        rackId: roleConfig.defaultCloset,
        qty: 1
      });
    }

    if (surgeChecked && radio.surgeSku && WIRELESS_ACCESSORY_CATALOG[radio.surgeSku]) {
      const acc = WIRELESS_ACCESSORY_CATALOG[radio.surgeSku];
      projectBOM.push({
        instanceId: `srg-${instanceId}`,
        parentInstanceId: instanceId,
        id: acc.sku,
        model: acc.name,
        sku: acc.sku,
        role: "Surge Protection",
        vendor: radio.vendor,
        msrp: acc.msrp,
        poeBudget: 0,
        baseWatts: 0,
        closetName: roleConfig.defaultCloset,
        rackId: roleConfig.defaultCloset,
        qty: 1
      });
    }

    if (antSelect && WIRELESS_ACCESSORY_CATALOG[antSelect.value]) {
      const ant = WIRELESS_ACCESSORY_CATALOG[antSelect.value];
      projectBOM.push({
        instanceId: `ant-${instanceId}`,
        parentInstanceId: instanceId,
        id: ant.sku,
        model: ant.name,
        sku: ant.sku,
        role: "Antenna Assembly",
        vendor: radio.vendor,
        msrp: ant.msrp,
        poeBudget: 0,
        baseWatts: 0,
        closetName: roleConfig.defaultCloset,
        rackId: roleConfig.defaultCloset,
        qty: 1
      });
    }

    if (licChecked && radio.licenseSku && WIRELESS_LICENSE_CATALOG[radio.licenseSku]) {
      const lic = WIRELESS_LICENSE_CATALOG[radio.licenseSku];
      projectBOM.push({
        instanceId: `lic-${instanceId}`,
        parentInstanceId: instanceId,
        id: lic.sku,
        model: lic.name,
        sku: lic.sku,
        role: "Feature License",
        vendor: radio.vendor,
        msrp: lic.msrp,
        poeBudget: 0,
        baseWatts: 0,
        closetName: roleConfig.defaultCloset,
        rackId: roleConfig.defaultCloset,
        qty: 1
      });
    }
  });

  FacilityStore.notifyWorkspaceChange();
  showToast(isMatchedPair ? `Added 2-Radio Link Pair (${radio.model}) with split endpoints.` : `Added ${radio.model} to BOM.`);
}

/**
 * Ensures all cameras exist as discrete individual BOM line items (qty: 1 each)
 * so they can be placed individually on physical, topology, and enclosure layouts.
 */
function unbundleMultiQtyCameras(bom = null) {
  const targetBom = bom || projectBOM;
  if (!Array.isArray(targetBom)) return false;

  let didUnbundle = false;
  for (let i = targetBom.length - 1; i >= 0; i--) {
    const item = targetBom[i];
    if (!item) continue;
    const isCamera = item.role === "Camera" || item.role === "Surveillance" || item.role === "Video" ||
                     (item.category && item.category.toLowerCase().includes("camera")) ||
                     (item.deviceTypePrefix === "CAM" || item.deviceTypePrefix === "LPR") ||
                     (typeof DeviceTaxonomy !== "undefined" && DeviceTaxonomy.getDeviceType && ["CAM", "LPR"].includes(DeviceTaxonomy.getDeviceType(item).prefix));

    if (isCamera && item.qty > 1) {
      didUnbundle = true;
      const count = item.qty;
      item.qty = 1;

      // Clear combined range suffix in custom friendly name
      if (item.customFriendlyName && /-\d+$/.test(item.customFriendlyName)) {
        item.customFriendlyName = null;
      }
      item.deviceNumber = null;
      item.friendlyName = null;

      for (let k = 1; k < count; k++) {
        const cloned = JSON.parse(JSON.stringify(item));
        cloned.instanceId = `cam-${Date.now()}-${Math.random().toString(36).substring(2, 6)}-u${k}`;
        cloned.qty = 1;
        cloned.customFriendlyName = null;
        cloned.deviceNumber = null;
        cloned.friendlyName = null;
        targetBom.splice(i + k, 0, cloned);

        if (typeof PortEngine !== "undefined") {
          PortEngine.initDeviceInterfaces(cloned);
          if (cloned.uplinkTargetId) {
            const sw = targetBom.find(s => s.instanceId === cloned.uplinkTargetId);
            if (sw) PortEngine.allocatePort(sw, cloned);
          }
        }
      }
    }
  }

  if (didUnbundle && typeof DeviceTaxonomy !== "undefined") {
    DeviceTaxonomy.recalculateNumbers(targetBom);
  }

  return didUnbundle;
}

function changeBomQty(instanceId, delta) {
  const item = projectBOM.find(i => i.instanceId === instanceId);
  if (!item) return;

  const isCamera = item.role === "Camera" || item.role === "Surveillance" || item.role === "Video" ||
                   (item.category && item.category.toLowerCase().includes("camera")) ||
                   (item.deviceTypePrefix === "CAM" || item.deviceTypePrefix === "LPR") ||
                   (typeof DeviceTaxonomy !== "undefined" && DeviceTaxonomy.getDeviceType && ["CAM", "LPR"].includes(DeviceTaxonomy.getDeviceType(item).prefix));

  if (isCamera && delta > 0) {
    // Individual camera requirement: spawn a discrete individual camera unit!
    const cloned = JSON.parse(JSON.stringify(item));
    cloned.instanceId = `cam-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    cloned.qty = 1;
    cloned.customFriendlyName = null;
    cloned.deviceNumber = null;
    cloned.friendlyName = null;

    const idx = projectBOM.indexOf(item);
    projectBOM.splice(idx + 1, 0, cloned);

    if (typeof PortEngine !== "undefined") {
      PortEngine.initDeviceInterfaces(cloned);
      if (cloned.uplinkTargetId) {
        const sw = projectBOM.find(i => i.instanceId === cloned.uplinkTargetId);
        if (sw) PortEngine.allocatePort(sw, cloned);
      }
    }

    if (typeof deriveDemandFromBOM === "function") deriveDemandFromBOM(true);
    if (typeof renderGlobalDesignModeToggle === "function") renderGlobalDesignModeToggle();
    if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
    FacilityStore.notifyWorkspaceChange();
    showToast(`Added individual camera unit (${item.model})`);
    return;
  }

  item.qty += delta;

  if (item.qty <= 0) {
    projectBOM = projectBOM.filter(i => i.instanceId !== instanceId && i.parentInstanceId !== instanceId);
    if (typeof removePhysicalLayoutDropByInstanceId === "function") {
      removePhysicalLayoutDropByInstanceId(instanceId);
    }
  } else {
    if (item.stackedUnits > item.qty) {
      item.stackedUnits = item.qty >= 2 ? item.qty : 0;
    }
    projectBOM.filter(i => i.parentInstanceId === instanceId && i.role !== "Stacking Cable" && i.role !== "StackPower Cable" && i.role !== "Uplink Module" && i.role !== "Uplink Interconnect" && i.source !== "stack_patch_panel" && i.source !== "stack_cable_manager" && i.source !== "switch_standard_pod" && i.source !== "stack_blank_module" && i.source !== "manual_bom_accessory").forEach(child => {
      const perParent = child.qtyPerUnit || child.qtyPerServer || 1;
      child.qty = item.qty * perParent;
    });
    applyStackCabling(item);
    if (typeof PortEngine !== "undefined" && (item.canStack || item.ports)) {
      PortEngine.initSwitchPorts(item, true);
    }
  }

  if (typeof deriveDemandFromBOM === "function") deriveDemandFromBOM(true);
  if (typeof renderGlobalDesignModeToggle === "function") renderGlobalDesignModeToggle();
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
  FacilityStore.notifyWorkspaceChange();
}

function changeBomUplinkModule(parentInstanceId, newModuleSku) {
  if (!parentInstanceId || typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) return;
  const parent = projectBOM.find(i => i.instanceId === parentInstanceId);
  if (!parent) return;

  const existingIdx = projectBOM.findIndex(i => i.parentInstanceId === parentInstanceId && i.role === "Uplink Module");
  parent.installedUplinkModuleSku = (!newModuleSku || newModuleSku === "none") ? "none" : newModuleSku;

  if (!newModuleSku || newModuleSku === "none") {
    if (existingIdx !== -1) {
      projectBOM.splice(existingIdx, 1);
    }
  } else if (typeof MODULAR_UPLINK_CATALOG !== "undefined" && MODULAR_UPLINK_CATALOG[newModuleSku]) {
    const mod = MODULAR_UPLINK_CATALOG[newModuleSku];
    const reqModQty = getRequiredUplinkModuleQty(parent);
    if (existingIdx !== -1) {
      projectBOM[existingIdx].id = mod.sku;
      projectBOM[existingIdx].model = mod.name;
      projectBOM[existingIdx].sku = mod.sku;
      projectBOM[existingIdx].msrp = mod.msrp;
      projectBOM[existingIdx].qty = reqModQty;
    } else {
      projectBOM.push({
        instanceId: `mod-${parentInstanceId}`,
        parentInstanceId: parentInstanceId,
        id: mod.sku,
        model: mod.name,
        sku: mod.sku,
        role: "Uplink Module",
        vendor: parent.vendor,
        msrp: mod.msrp,
        poeBudget: 0,
        baseWatts: 15,
        closetName: parent.closetName,
        rackId: parent.rackId,
        qty: reqModQty
      });
    }
  }

  syncBomUplinkModuleQtyAndBlankPlates(parent);
  if (typeof PortEngine !== "undefined" && typeof PortEngine.initSwitchPorts === "function") {
    PortEngine.initSwitchPorts(parent, true);
  }
  if (typeof recalculateAutoUplinks === "function") {
    recalculateAutoUplinks();
  }
  if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
    FacilityStore.notifyWorkspaceChange();
  }
  if (typeof renderBomModalContent === "function") {
    renderBomModalContent();
  }
  if (typeof updateBOMView === "function") {
    updateBOMView();
  }
  if (typeof showToast === "function") {
    showToast(`Updated modular uplink sled for ${parent.friendlyName || parent.model}`);
  }
}
window.changeBomUplinkModule = changeBomUplinkModule;

function removeBomItem(instanceId) {
  deleteDeviceFromBOM(instanceId, true);
}

function deleteDeviceFromBOM(instanceId, skipConfirm = false) {
  if (!instanceId || typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) return;
  const item = projectBOM.find(i => i.instanceId === instanceId);
  const name = item ? (item.friendlyName || item.model || "Device") : "Device";

  if (!skipConfirm) {
    if (!confirm(`Are you sure you want to permanently delete "${name}" from the project quote BOM?`)) {
      return;
    }
  }

  // 1. Remove device and all child line items (optics, licenses, mounts)
  projectBOM = projectBOM.filter(i => i.instanceId !== instanceId && i.parentInstanceId !== instanceId);

  // 2. Remove physical layout canvas drop if present
  if (typeof removePhysicalLayoutDropByInstanceId === "function") {
    removePhysicalLayoutDropByInstanceId(instanceId);
  }

  // 3. Clean up topology links referencing this device
  if (typeof topologyLinks !== "undefined" && Array.isArray(topologyLinks)) {
    topologyLinks = topologyLinks.filter(l => l.fromId !== instanceId && l.toId !== instanceId);
  }

  // 4. Clear any uplink or server associations referencing this device
  projectBOM.forEach(i => {
    if (i.uplinkTargetId === instanceId) i.uplinkTargetId = null;
    if (i.customUplinkTargetId === instanceId) i.customUplinkTargetId = null;
    if (i.assignedRecordingServerId === instanceId) i.assignedRecordingServerId = null;
    if (i.assignedAccessServerId === instanceId) i.assignedAccessServerId = null;
    if (i.assignedVmsServerId === instanceId) i.assignedVmsServerId = null;
  });

  // 5. Deselect in topology if selected
  if (typeof selectedTopologyNodeId !== "undefined" && selectedTopologyNodeId === instanceId) {
    if (typeof deselectTopologyNode === "function") deselectTopologyNode();
  }

  // 6. Notify workspace and re-render all active UI tools
  if (typeof deriveDemandFromBOM === "function") deriveDemandFromBOM(true);
  if (typeof renderGlobalDesignModeToggle === "function") renderGlobalDesignModeToggle();
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
  if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
    FacilityStore.notifyWorkspaceChange();
  }
  if (typeof renderTopology === "function") renderTopology();
  if (typeof renderTopologyInspector === "function") renderTopologyInspector();
  if (typeof renderRackVisualizer === "function") renderRackVisualizer();
  if (typeof renderCableCanvas === "function") renderCableCanvas();
  if (typeof renderInspector === "function") renderInspector();
  if (typeof renderBOM === "function") renderBOM();
  if (typeof updateBOMBadge === "function") updateBOMBadge();
  if (typeof StorageService !== "undefined" && typeof StorageService.queueAutoSave === "function") {
    StorageService.queueAutoSave();
  }
  if (typeof showToast === "function") {
    showToast(`Deleted ${name} from project BOM.`);
  }
}

function clearBom() {
  if (projectBOM.length === 0) return;
  if (!confirm("Are you sure you want to clear the entire Project BOM?")) return;
  projectBOM = [];
  if (typeof clearPhysicalLayoutDrops === "function") {
    clearPhysicalLayoutDrops();
  }
  if (typeof deriveDemandFromBOM === "function") deriveDemandFromBOM(true);
  if (typeof renderGlobalDesignModeToggle === "function") renderGlobalDesignModeToggle();
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
  FacilityStore.notifyWorkspaceChange();
  showToast("Project BOM reset.");
}

function toggleBomModal() {
  const modal = document.getElementById("bomModal");
  const drawer = document.getElementById("bomDrawer");
  if (!modal) return;
  const isOpening = modal.classList.contains("hidden");
  if (isOpening) {
    const openModals = ["facilityModal", "cableLayoutModal", "topologyModal", "portMatrixStudioModal", "licenseModal", "projectHealthModal"];
    openModals.forEach(id => {
      const el = document.getElementById(id);
      if (el && !el.classList.contains("hidden")) {
        el.classList.add("hidden");
      }
    });
    modal.classList.remove("hidden");
    if (drawer) drawer.classList.remove("translate-x-full");
    updateBOMView();
  } else {
    modal.classList.add("hidden");
    if (drawer) drawer.classList.add("translate-x-full");
  }
}

function toggleBomDrawer() {
  toggleBomModal();
}

// -----------------------------------------------------------
// Real-Time Capacity & PoE Auditing
// -----------------------------------------------------------
function auditSwitchCapacities() {
  if (typeof NetworkSizer !== "undefined" && typeof NetworkSizer.auditBOMCapacities === "function") {
    return NetworkSizer.auditBOMCapacities(projectBOM, {
      extraHeadroomPercent: typeof extraHeadroomPercent !== "undefined" ? extraHeadroomPercent : 20
    });
  }

  // Graceful fallback
  const switchAudits = {};
  if (!Array.isArray(projectBOM)) return switchAudits;

  projectBOM.filter(i => i && !i.parentInstanceId && (i.role === "Access" || i.role === "Core" || i.role === "Aggregation")).forEach(sw => {
    let switchPorts = parseInt(sw.ports, 10);
    if (!switchPorts || isNaN(switchPorts)) {
      const dbEntry = typeof SWITCH_DATABASE !== "undefined" ? SWITCH_DATABASE.find(s => s.id === sw.id || s.sku === sw.sku) : null;
      switchPorts = dbEntry ? dbEntry.ports : 24;
      sw.ports = switchPorts;
    }

    let switchPoE = parseInt(sw.poeBudget, 10);
    if (isNaN(switchPoE)) {
      const dbEntry = typeof SWITCH_DATABASE !== "undefined" ? SWITCH_DATABASE.find(s => s.id === sw.id || s.sku === sw.sku) : null;
      switchPoE = dbEntry ? dbEntry.poeBudget : 0;
      sw.poeBudget = switchPoE;
    }

    switchAudits[sw.instanceId] = {
      instanceId: sw.instanceId,
      model: sw.model || "Unknown Switch",
      totalPorts: switchPorts * (sw.qty || 1),
      usedDownlinkPorts: 0,
      totalPoEBudget: switchPoE * (sw.qty || 1),
      consumedPoEWatts: 0,
      poeStandard: sw.poeStandard || "802.3at",
      uplinkPortsTotal: (sw.uplinkPortCount || 4) * (sw.qty || 1),
      uplinkPortsUsed: 0,
      connectedDevices: [],
      alerts: []
    };
  });

  const factor = 1 + ((typeof extraHeadroomPercent !== "undefined" ? extraHeadroomPercent : 20) / 100);

  projectBOM.forEach(item => {
    if (!item || item.parentInstanceId || !item.uplinkTargetId) return;

    const host = switchAudits[item.uplinkTargetId];
    if (!host) return;

    const qty = item.qty || 1;

    if (item.role === "Access") {
      const isDual = item.uplinkMode === "lag_dual" || item.stackedUnits >= 2;
      const linksUsed = isDual ? 2 : 1;

      host.usedDownlinkPorts += linksUsed;
      host.connectedDevices.push(`${item.model} (${linksUsed}x ${isDual ? 'LAG Uplinks' : 'Uplink'})`);
    } else {
      host.usedDownlinkPorts += qty;

      if (item.powerSource === "poe_switch" || (!item.powerSource && (item.poeStandard || item.poeWattsDrawn))) {
        const itemWatts = (item.powerConsumptionWatts || item.maxPowerWatts || item.powerWatts || item.baseWatts || item.poeWattsDrawn || 15) * qty;
        host.consumedPoEWatts += Math.ceil(itemWatts * factor);

        if (item.poeStandardRequired === "802.3bt-60" && host.poeStandard === "802.3at") {
          host.alerts.push(`Device "${item.model}" requires 60W bt, but switch only supports 30W at.`);
        }
      }
      host.connectedDevices.push(`${item.model} (${qty}x port)`);
    }
  });

  Object.values(switchAudits).forEach(audit => {
    if (audit.totalPorts > 0 && audit.usedDownlinkPorts > audit.totalPorts) {
      audit.alerts.push(`Port Exhaustion: ${audit.usedDownlinkPorts}/${audit.totalPorts} ports assigned!`);
    }
    if (audit.consumedPoEWatts > audit.totalPoEBudget && audit.totalPoEBudget > 0) {
      audit.alerts.push(`PoE Overload: ${audit.consumedPoEWatts}W required, budget is ${audit.totalPoEBudget}W!`);
    }
  });

  return switchAudits;
}

function setPowerSource(childInstanceId, powerType) {
  const child = projectBOM.find(i => i.instanceId === childInstanceId);
  if (!child) return;

  if (typeof PortEngine !== "undefined" && typeof PortEngine.setPowerSource === "function") {
    PortEngine.setPowerSource(child, powerType);
  } else {
    child.powerSource = powerType;
    FacilityStore.notifyWorkspaceChange();
  }
}

// -----------------------------------------------------------
// BOM View HTML Renderers
// -----------------------------------------------------------
// -----------------------------------------------------------
// BOM View HTML Renderers & Studio Engine
// -----------------------------------------------------------
function updateBOMView() {
  window._cachedBomLocationGroups = (typeof FacilityStore !== "undefined" && typeof FacilityStore.getLocationGroups === "function")
    ? FacilityStore.getLocationGroups(true)
    : null;
  window._cachedBomChildrenMap = new Map();
  if (typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) {
    projectBOM.forEach(item => {
      enrichBOMItemFromCatalog(item);
      if (item.parentInstanceId) {
        if (!window._cachedBomChildrenMap.has(item.parentInstanceId)) {
          window._cachedBomChildrenMap.set(item.parentInstanceId, []);
        }
        window._cachedBomChildrenMap.get(item.parentInstanceId).push(item);
      }
    });
  }

  const merakiAlertEl = document.getElementById("merakiLicenseAlert");
  if (merakiAlertEl) {
    const compliance = checkMerakiCompliance();
    if (!compliance.compliant) {
      merakiAlertEl.classList.remove("hidden");
    } else {
      merakiAlertEl.classList.add("hidden");
    }
  }

  let totalUnits = 0, totalPoE = 0, totalMSRP = 0;
  projectBOM.forEach(item => {
    if (!item.parentInstanceId) {
      totalUnits += item.qty;
    }
    totalPoE += ((item.poeBudget || 0) * item.qty);
    totalMSRP += (item.msrp * item.qty);
  });

  // Live Project Health & Deficit Telemetry
  updateProjectHealthUI();

  // Top header badges
  const badge = document.getElementById("bomCountBadge");
  if (badge) badge.innerText = totalUnits;
  const headerUnitsEl = document.getElementById("bomHeaderUnits");
  if (headerUnitsEl) headerUnitsEl.innerText = totalUnits;
  const headerPoEEl = document.getElementById("bomHeaderPoE");
  if (headerPoEEl) headerPoEEl.innerText = `${totalPoE.toLocaleString()} W`;
  const headerMSRPEl = document.getElementById("bomHeaderMSRP");
  if (headerMSRPEl) headerMSRPEl.innerText = `$${Math.round(totalMSRP).toLocaleString()}`;

  // Bottom footer telemetry
  const totalUnitsEl = document.getElementById("bomTotalUnits");
  if (totalUnitsEl) totalUnitsEl.innerText = totalUnits;
  const totalPoEEl = document.getElementById("bomTotalPoE");
  if (totalPoEEl) totalPoEEl.innerText = `${totalPoE.toLocaleString()} W`;
  const totalMSRPEl = document.getElementById("bomTotalMSRP");
  if (totalMSRPEl) totalMSRPEl.innerText = `$${Math.round(totalMSRP).toLocaleString()}`;

  // Skip heavy table DOM rendering and icon replacement when the BOM modal is hidden
  const bomModalEl = document.getElementById("bomModal");
  if (bomModalEl && bomModalEl.classList.contains("hidden")) {
    return;
  }

  // Populate dynamic Location filter dropdown
  const locSelect = document.getElementById("bomLocationFilter");
  if (locSelect) {
    const currentVal = bomSelectedLocation;
    const allLocations = new Set();
    if (typeof FacilityStore !== "undefined") {
      const names = FacilityStore.getLocationNames(true);
      names.forEach(n => allLocations.add(FacilityStore.normalize(n)));
    }
    projectBOM.forEach(i => {
      const rawLoc = i.closetName || i.rackId || (typeof FacilityStore !== "undefined" ? FacilityStore.UNASSIGNED : "Unassigned");
      allLocations.add(typeof FacilityStore !== "undefined" ? FacilityStore.normalize(rawLoc) : rawLoc);
    });

    let optsHtml = `<option value="all" ${currentVal === 'all' ? 'selected' : ''}>All Locations & Racks</option>`;
    Array.from(allLocations).sort().forEach(loc => {
      const isSelected = currentVal === loc;
      const isUnassigned = typeof FacilityStore !== "undefined" && loc === FacilityStore.UNASSIGNED;
      optsHtml += `<option value="${escapeHTML(loc)}" ${isSelected ? 'selected' : ''}>${isUnassigned ? 'Unassigned (Staging)' : escapeHTML(loc)}</option>`;
    });
    locSelect.innerHTML = optsHtml;
  }

  const listContainer = document.getElementById("bomItemsList");
  if (!listContainer) return;

  if (projectBOM.length === 0) {
    listContainer.innerHTML = `
      <div class="py-16 text-center text-slate-500 flex flex-col items-center justify-center">
        <div class="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 mb-3 shadow-sm">
          <i data-lucide="shopping-bag" class="w-8 h-8 text-brand-400"></i>
        </div>
        <h3 class="text-sm font-bold text-white mb-1">Your Project BOM is Empty</h3>
        <p class="text-xs text-slate-400 max-w-sm mb-4">Add switches, cameras, wireless access points, or rack hardware from the catalog to populate your equipment schedule.</p>
      </div>
    `;
    if (typeof safeCreateIcons === "function") safeCreateIcons(listContainer);
    return;
  }

  // Filter items based on active criteria
  let filteredItems = projectBOM.filter(item => {
    // 1. Search Query
    if (bomSearchQuery) {
      const q = bomSearchQuery.toLowerCase();
      const match = (
        (item.model && item.model.toLowerCase().includes(q)) ||
        (item.sku && item.sku.toLowerCase().includes(q)) ||
        (item.id && item.id.toLowerCase().includes(q)) ||
        (item.friendlyName && item.friendlyName.toLowerCase().includes(q)) ||
        (item.deviceNumber && item.deviceNumber.toLowerCase().includes(q)) ||
        (item.role && item.role.toLowerCase().includes(q)) ||
        (item.vendor && item.vendor.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q)) ||
        (item.closetName && item.closetName.toLowerCase().includes(q)) ||
        (item.rackId && item.rackId.toLowerCase().includes(q))
      );
      if (!match) return false;
    }

    // 2. Location Filter
    if (bomSelectedLocation !== "all") {
      const rawLoc = item.closetName || item.rackId || (typeof FacilityStore !== "undefined" ? FacilityStore.UNASSIGNED : "Unassigned");
      const itemLoc = typeof FacilityStore !== "undefined" ? FacilityStore.normalize(rawLoc) : rawLoc;
      if (itemLoc !== bomSelectedLocation) return false;
    }

    // 3. Category Filter
    if (bomSelectedCategory !== "all") {
      const itemCat = getBomItemCategoryKey(item);
      if (itemCat !== bomSelectedCategory) return false;
    }

    return true;
  });

  if (filteredItems.length === 0) {
    listContainer.innerHTML = `
      <div class="py-16 text-center text-slate-500 flex flex-col items-center justify-center">
        <div class="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 mb-3 shadow-sm">
          <i data-lucide="filter-x" class="w-8 h-8 text-amber-400"></i>
        </div>
        <h3 class="text-sm font-bold text-white mb-1">No Matching Hardware Found</h3>
        <p class="text-xs text-slate-400 max-w-sm mb-4">No equipment in the project matched your current search query or active dropdown filters.</p>
        <button onclick="resetBomFilters()" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold border border-slate-700 transition-colors cursor-pointer shadow-sm">
          Reset Search & Filters
        </button>
      </div>
    `;
    if (typeof safeCreateIcons === "function") safeCreateIcons(listContainer);
    return;
  }

  // -------------------------------------------------------------
  // Mode A: Flat Procurement Order
  // -------------------------------------------------------------
  if (bomViewMode === "flat") {
    const skuMap = new Map();

    filteredItems.forEach(item => {
      const rawSku = String(item.sku || item.id || item.model || 'GENERIC-SKU').trim();
      const qty = parseInt(item.qty, 10) || 1;
      const msrp = parseFloat(item.msrp) || 0;
      const baseWatts = parseFloat(item.baseWatts) || 0;
      const poeWatts = parseFloat(item.poeBudget) || 0;
      const rawLoc = item.closetName || item.rackId || (typeof FacilityStore !== "undefined" ? FacilityStore.UNASSIGNED : "Unassigned");
      const locKey = typeof FacilityStore !== "undefined" ? FacilityStore.normalize(rawLoc) : rawLoc;

      if (!skuMap.has(rawSku)) {
        skuMap.set(rawSku, {
          sku: item.sku || item.id || rawSku,
          model: item.model || rawSku,
          vendor: item.vendor || "",
          role: item.role || item.category || "Hardware",
          category: item.category || "",
          msrp: msrp,
          rawQty: 0,
          totalCost: 0,
          totalWatts: 0,
          locations: {},
          instances: []
        });
      }

      const entry = skuMap.get(rawSku);
      entry.rawQty += qty;
      entry.totalCost += (msrp * qty);
      entry.totalWatts += ((baseWatts + poeWatts) * qty);
      entry.locations[locKey] = (entry.locations[locKey] || 0) + qty;
      entry.instances.push(item);
    });

    const skuList = Array.from(skuMap.values());
    skuList.sort((a, b) => (b.totalCost - a.totalCost) || (b.rawQty - a.rawQty) || a.sku.localeCompare(b.sku));

    const totalUniqueSkus = skuList.length;
    const totalRawCount = skuList.reduce((acc, s) => acc + s.rawQty, 0);
    const totalOrderCost = skuList.reduce((acc, s) => acc + s.totalCost, 0);

    listContainer.innerHTML = renderBomFlatTable(skuList, totalUniqueSkus, totalRawCount, totalOrderCost);
  } 
  // -------------------------------------------------------------
  // Mode B: Category Breakdown
  // -------------------------------------------------------------
  else if (bomViewMode === "category") {
    const catGroups = {};
    Object.keys(BOM_CATEGORIES).forEach(k => { catGroups[k] = []; });

    filteredItems.forEach(item => {
      if (item.parentInstanceId) return; // Child parts render inside parent rows
      const catKey = getBomItemCategoryKey(item);
      if (!catGroups[catKey]) catGroups[catKey] = [];
      catGroups[catKey].push(item);
    });

    let catHtml = '<div class="space-y-4">';
    let renderedAny = false;

    Object.entries(catGroups).forEach(([catKey, items]) => {
      if (!items || items.length === 0) return;
      renderedAny = true;
      const catMeta = BOM_CATEGORIES[catKey] || { label: catKey, icon: "box" };
      catHtml += renderBomCategoryAccordion(catKey, catMeta, items);
    });

    catHtml += '</div>';
    listContainer.innerHTML = renderedAny ? catHtml : '<div class="py-8 text-center text-slate-500 text-xs">No items in selected categories.</div>';
  }
  // -------------------------------------------------------------
  // Mode C: By Location / Rack (Default)
  // -------------------------------------------------------------
  else {
    const locGroups = {};

    filteredItems.forEach(item => {
      if (item.parentInstanceId) return; // Child parts render inside parent rows
      const rawLoc = item.closetName || item.rackId || (typeof FacilityStore !== "undefined" ? FacilityStore.UNASSIGNED : "Unassigned");
      const key = typeof FacilityStore !== "undefined" ? FacilityStore.normalize(rawLoc) : rawLoc;
      if (!locGroups[key]) locGroups[key] = [];
      locGroups[key].push(item);
    });

    // Sort locations: Assigned spaces/racks first, Unassigned staging last
    const sortedKeys = Object.keys(locGroups).sort((a, b) => {
      const isUnA = typeof FacilityStore !== "undefined" && a === FacilityStore.UNASSIGNED;
      const isUnB = typeof FacilityStore !== "undefined" && b === FacilityStore.UNASSIGNED;
      if (isUnA && !isUnB) return 1;
      if (!isUnA && isUnB) return -1;
      return a.localeCompare(b);
    });

    let groupedHtml = '<div class="space-y-4">';
    sortedKeys.forEach(locKey => {
      groupedHtml += renderBomLocationAccordion(locKey, locGroups[locKey]);
    });
    groupedHtml += '</div>';

    listContainer.innerHTML = groupedHtml;
  }

  if (typeof safeCreateIcons === "function") {
    safeCreateIcons(listContainer);
  } else if (window.lucide) {
    try { lucide.createIcons(); } catch(e) {}
  }
}

// -----------------------------------------------------------
// Modern Structured Table Row Renderer (Spacious Grid)
// -----------------------------------------------------------
function renderBomTableRow(item) {
  const rawLoc = item.closetName || item.rackId || (typeof FacilityStore !== "undefined" ? FacilityStore.UNASSIGNED : "Unassigned");
  const currentLocationKey = typeof FacilityStore !== "undefined" ? FacilityStore.normalize(rawLoc) : rawLoc;
  const isUnassigned = typeof FacilityStore !== "undefined" && currentLocationKey === FacilityStore.UNASSIGNED;

  const pwr = (typeof PortEngine !== "undefined") ? PortEngine.getDevicePowerSource(item) : (item.powerSource || "internal_psu");
  const pwrBadge = (pwr !== "passive" && typeof PortEngine !== "undefined" && PortEngine.POWER_MODES && PortEngine.POWER_MODES[pwr]) ? PortEngine.POWER_MODES[pwr] : null;
  const childItems = (window._cachedBomChildrenMap && window._cachedBomChildrenMap.get(item.instanceId)) || projectBOM.filter(ch => ch.parentInstanceId === item.instanceId);

  const catSw = (item.modularUplink ? item : null) || 
    (typeof CatalogRegistry !== "undefined" && typeof CatalogRegistry.getSwitch === "function" ? CatalogRegistry.getSwitch(item.id || item.sku) : null) ||
    (typeof CatalogRegistry !== "undefined" && typeof CatalogRegistry.get === "function" ? CatalogRegistry.get(item.id || item.sku) : null) ||
    (typeof SWITCH_DATABASE !== "undefined" ? SWITCH_DATABASE.find(s => s.id === item.id || s.sku === item.sku) : null);
  const hasModularBay = !!(catSw && catSw.modularUplink && catSw.modularUplink.hasSlot);
  const attachedSled = childItems.find(ch => ch.role === "Uplink Module");
  const otherChildItems = hasModularBay ? childItems.filter(ch => ch.role !== "Uplink Module") : childItems;

  const totalItemCost = (item.msrp || 0) * (item.qty || 1);
  const childCost = childItems.reduce((sum, ch) => sum + ((ch.msrp || 0) * (ch.qty || 1)), 0);
  const totalRowCost = totalItemCost + childCost;
  const isStackable = item.canStack || item.role === "Access" || item.role === "Aggregation";
  const isStack = isStackable && item.stackedUnits >= 2;
  const ppCfg = resolveSwitchPatchPanelConfig(item);
  const hasStackPower = supportsCiscoStackPower(item);

  const uPosition = item.uPosition || (item.startU ? `U${item.startU}${item.heightU > 1 ? `-U${item.startU + item.heightU - 1}` : ''}` : null);
  const mountLabel = item.mountMethod ? formatMountMethodLabel(item.mountMethod) : null;
  const isCameraItem = item.role === "Camera" || item.category === "camera" || item.category === "cameras";

  let cameraSkuSelectorHtml = "";
  if (isCameraItem) {
    const allRealCams = typeof CAMERAS_DATABASE !== "undefined" ? CAMERAS_DATABASE : [];
    const allGenCams = typeof GENERIC_CAMERA_TYPES !== "undefined" ? GENERIC_CAMERA_TYPES : [];
    const genTypeId = item.genericCameraTypeId || item.originGenericTypeId || (item.isGenericCamera ? item.id : null);
    const genDef = genTypeId ? allGenCams.find(g => g.id === genTypeId || g.sku === genTypeId) : null;
    const recSkus = (item.recommendedUpgradeSkus && item.recommendedUpgradeSkus.length > 0)
      ? item.recommendedUpgradeSkus
      : (genDef && Array.isArray(genDef.recommendedUpgradeSkus) ? genDef.recommendedUpgradeSkus : []);

    const recCamObjs = recSkus.map(sku => allRealCams.find(c => c.sku === sku || c.id === sku)).filter(Boolean);
    const otherRealCams = allRealCams.filter(c => !recSkus.includes(c.sku) && !recSkus.includes(c.id));

    cameraSkuSelectorHtml = `
      <div class="pt-1.5">
        <div class="p-2 rounded-lg ${item.isGenericCamera ? 'bg-emerald-950/25 border border-emerald-500/30' : 'bg-slate-950/80 border border-slate-800'} transition-colors shadow-sm space-y-1.5">
          <div class="flex items-center justify-between gap-2">
            <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${item.isGenericCamera ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-sky-500/15 text-sky-300 border border-sky-500/30'} text-[10px] font-mono font-semibold">
              <i data-lucide="camera" class="w-3 h-3"></i>
              <span>${item.isGenericCamera ? 'Generic Sizing Placeholder' : 'Assigned Catalog Part'}</span>
            </span>
            <span class="text-[10px] font-mono text-slate-400">Override Individual Camera SKU:</span>
          </div>
          <select
            onchange="upgradeSingleCameraInstance('${item.instanceId}', this.value)"
            class="w-full bg-slate-900 border border-slate-700/80 hover:border-slate-600 text-slate-200 text-xs font-medium rounded-md px-2 py-1 focus:outline-none focus:border-brand-500 cursor-pointer shadow-sm transition-colors"
            title="Assign or override specific camera part SKU for this individual drop"
          >
            ${recCamObjs.length > 0 ? `
              <optgroup label="Recommended Compatible Parts">
                ${recCamObjs.map(c => `<option value="${escapeHTML(c.sku)}" ${(item.sku === c.sku || item.id === c.id) ? 'selected' : ''}>★ ${escapeHTML(c.vendor)} ${escapeHTML(c.model)} (${escapeHTML(c.sku)}) — $${(c.msrp || 0).toLocaleString()}</option>`).join('')}
              </optgroup>
            ` : ''}
            <optgroup label="All Catalog Camera SKUs (Full Design)">
              ${otherRealCams.map(c => `<option value="${escapeHTML(c.sku)}" ${(item.sku === c.sku || item.id === c.id) ? 'selected' : ''}>${escapeHTML(c.vendor)} ${escapeHTML(c.model)} (${escapeHTML(c.sku)}) — $${(c.msrp || 0).toLocaleString()}</option>`).join('')}
            </optgroup>
            <optgroup label="Generic Sizing Types (Initial Design)">
              ${allGenCams.map(g => `<option value="${escapeHTML(g.id)}" ${(item.id === g.id || item.sku === g.sku) ? 'selected' : ''}>[Generic] ${escapeHTML(g.model)} (${escapeHTML(g.poeStandard)}) — $${(g.msrp || 0).toLocaleString()}</option>`).join('')}
            </optgroup>
          </select>
        </div>
      </div>
    `;
  }

  return `
    <tr id="bom-item-${item.instanceId}" data-bom-instance="${item.instanceId}" class="group border-b border-slate-800/80 hover:bg-slate-900/50 transition-colors">
      <!-- Col 1: Hardware Identity -->
      <td class="py-3 px-4 align-top">
        <div class="space-y-1">
          <div class="flex items-center gap-2 flex-wrap">
            ${item.deviceNumber ? `
              <span class="px-2 py-0.5 rounded-md bg-brand-950/90 border border-brand-500/50 text-[11px] font-mono font-bold text-brand-300 shadow-sm" title="Device Sequence ID">
                ${escapeHTML(item.deviceNumber)}
              </span>
            ` : ''}
            <span class="text-xs font-bold text-white tracking-tight" title="${escapeHTML(item.friendlyName || item.model)}">
              ${escapeHTML(item.friendlyName || item.model)}
            </span>
            <button type="button" onclick="promptEditDeviceFriendlyName('${item.instanceId}')" class="text-slate-500 hover:text-white p-0.5 rounded hover:bg-slate-800 transition-colors cursor-pointer" title="Edit Device Friendly Name">
              <i data-lucide="pencil" class="w-3 h-3"></i>
            </button>
            ${item.vendor ? `
              <span class="px-1.5 py-0.2 rounded bg-slate-900 border border-slate-700/80 text-[10px] font-mono text-slate-300">
                ${escapeHTML(item.vendor)}
              </span>
            ` : ''}
          </div>

          <div class="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
            ${item.friendlyName && item.friendlyName !== item.model ? `
              <span class="text-slate-300 font-medium">${escapeHTML(item.model)}</span>
              <span>&bull;</span>
            ` : ''}
            <span class="text-slate-400">SKU: <strong class="text-slate-300 font-semibold">${escapeHTML(item.sku)}</strong></span>
            <span>&bull;</span>
            <span class="px-1.5 py-0.2 rounded bg-slate-900/80 text-slate-400 text-[10px] border border-slate-800">${escapeHTML(item.role || 'Hardware')}</span>
          </div>

          ${cameraSkuSelectorHtml}

          <!-- Modular Uplink Bay Selector (if switch has modular uplink slot) -->
          ${hasModularBay ? `
            <div class="pt-2">
              <div class="p-2 rounded-lg bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-colors shadow-sm space-y-1.5">
                <div class="flex items-center justify-between gap-2">
                  <div class="flex items-center gap-1.5">
                    <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-400 text-[10px] font-mono font-semibold border border-brand-500/20">
                      <i data-lucide="cpu" class="w-3 h-3 text-brand-400"></i>
                      <span>Modular Uplink Bay</span>
                    </span>
                    ${attachedSled ? `
                      <span class="text-[10px] text-slate-400 font-mono">Installed: <span class="text-slate-200 font-semibold">${escapeHTML(attachedSled.sku)}</span> (${attachedSled.qty}x)</span>
                    ` : `
                      <span class="text-[10px] text-amber-400/90 font-mono">No module installed</span>
                    `}
                    ${item.stackedUnits > 2 ? `
                      <button
                        type="button"
                        onclick="setBomUplinkStackPolicy('${item.instanceId}', '${(item.uplinkModuleStackPolicy || 'first_last') === 'first_last' ? 'all' : 'first_last'}')"
                        class="px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold border cursor-pointer transition-colors ${(item.uplinkModuleStackPolicy || 'first_last') === 'first_last' ? 'bg-cyan-950/80 text-cyan-300 border-cyan-700/60 hover:bg-cyan-900' : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'}"
                        title="Click to toggle between populating 1st &amp; Last stack members only vs all stack members"
                      >
                        ${(item.uplinkModuleStackPolicy || 'first_last') === 'first_last' ? '1st &amp; Last Only (2x)' : `All Members (${item.qty}x)`}
                      </button>
                    ` : ''}
                  </div>
                  ${attachedSled ? `
                    <span class="font-mono text-emerald-400 font-semibold text-xs">${((attachedSled.msrp || 0) * (attachedSled.qty || 1)).toLocaleString()}</span>
                  ` : ''}
                </div>

                <div class="flex items-center gap-2">
                  <select 
                    onchange="changeBomUplinkModule('${item.instanceId}', this.value)" 
                    class="w-full bg-slate-900 border border-slate-700/80 hover:border-slate-600 text-slate-200 text-xs font-medium rounded-md px-2 py-1 focus:outline-none focus:border-brand-500 cursor-pointer shadow-sm transition-colors"
                    title="Select expansion sled to install in modular uplink slot"
                  >
                    <option value="none" ${!attachedSled ? 'selected' : ''}>-- Empty Bay (No Module) --</option>
                    ${(catSw.modularUplink.supportedModules || []).map(mSku => {
                      const mod = (typeof MODULAR_UPLINK_CATALOG !== 'undefined') ? MODULAR_UPLINK_CATALOG[mSku] : null;
                      const isSel = attachedSled && (attachedSled.sku === mSku || attachedSled.id === mSku);
                      const label = mod ? `${mod.name} (${mSku}) - $${mod.msrp.toLocaleString()}` : mSku;
                      return `<option value="${escapeHTML(mSku)}" ${isSel ? 'selected' : ''}>${escapeHTML(label)}</option>`;
                    }).join('')}
                  </select>
                </div>
              </div>
            </div>
          ` : ''}

          <!-- Other Attached Sub-items (Child transceivers, licenses, PSUs) -->
          ${otherChildItems.length > 0 ? `
            <div class="pt-1.5 space-y-1">
              ${otherChildItems.map(ch => `
                <div class="flex items-center gap-2 text-[11px] text-slate-400 bg-slate-950/60 border border-slate-800/80 px-2 py-1 rounded-lg">
                  <i data-lucide="corner-down-right" class="w-3 h-3 text-brand-400 shrink-0"></i>
                  <span class="text-slate-200 font-medium truncate">${escapeHTML(ch.model)}</span>
                  <span class="px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 text-[10px] font-mono border border-slate-800">${escapeHTML(ch.role)}</span>
                  <span class="text-slate-500 font-mono text-[10px]">SKU: ${escapeHTML(ch.sku)}</span>
                  <span class="ml-auto font-mono text-emerald-400 font-semibold text-xs">$${((ch.msrp || 0) * (ch.qty || 1)).toLocaleString()}</span>
                  <span class="text-[10px] text-slate-500 font-mono">(${ch.qty}x)</span>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      </td>

      <!-- Col 2: Placement & Enclosure -->
      <td class="py-3 px-4 align-top">
        <div class="space-y-1.5">
          <div class="flex items-center gap-1.5">
            <i data-lucide="${isUnassigned ? 'inbox' : (currentLocationKey.endsWith(' • Field') ? 'radio' : 'map-pin')}" class="w-3.5 h-3.5 ${isUnassigned ? 'text-amber-400' : (currentLocationKey.endsWith(' • Field') ? 'text-cyan-400' : 'text-indigo-400')} shrink-0"></i>
            <select 
              onchange="handleLocationDropdownChange(this, (newLoc) => setItemLocation('${item.instanceId}', newLoc))" 
              data-previous-val="${escapeHTML(currentLocationKey)}" 
              class="w-full bg-slate-900 border border-slate-700/80 text-slate-200 text-xs font-semibold rounded-lg px-2 py-1 focus:outline-none focus:border-brand-500 truncate cursor-pointer shadow-sm" 
              title="Change Assigned Space or Rack Enclosure"
            >
              ${renderBomLocationOptions(currentLocationKey, item)}
            </select>
          </div>

          <div class="flex items-center gap-1.5 flex-wrap">
            ${uPosition ? `
              <span class="px-2 py-0.5 rounded bg-sky-950/60 border border-sky-800 text-[10px] font-mono text-sky-300 font-bold flex items-center gap-1" title="Mounted at Rack Unit ${uPosition}">
                <i data-lucide="server" class="w-3 h-3 text-sky-400"></i>
                <span>${uPosition}</span>
              </span>
            ` : ''}

            ${mountLabel ? `
              <span class="px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800 text-[10px] font-mono text-cyan-300 font-semibold flex items-center gap-1" title="Mounting Method: ${mountLabel}">
                <i data-lucide="anchor" class="w-3 h-3 text-cyan-400"></i>
                <span>${mountLabel}</span>
              </span>
            ` : ''}

            ${item.closetName && !isUnassigned ? `
              <button 
                type="button" 
                onclick="openRackViewerFor('${escapeJSAttr(item.closetName || item.rackId)}')"
                class="px-2 py-0.5 rounded bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-800/60 text-indigo-300 hover:text-white text-[10px] font-mono flex items-center gap-1 transition-colors cursor-pointer"
                title="View in Rack Elevation Visualizer"
              >
                <i data-lucide="layout-grid" class="w-2.5 h-2.5"></i>
                <span>View Rack</span>
              </button>
            ` : ''}
          </div>
        </div>
      </td>

      <!-- Col 3: Engineering, Power & Stacking -->
      <td class="py-3 px-4 align-top">
        <div class="space-y-1.5 text-xs">
          <!-- Power badges -->
          <div class="flex items-center gap-2 flex-wrap">
            ${item.poeBudget > 0 ? `
              <span class="px-2 py-0.5 rounded bg-amber-950/70 border border-amber-700/60 text-amber-300 font-mono text-[11px] font-bold flex items-center gap-1" title="PoE Power Budget">
                <i data-lucide="zap" class="w-3 h-3 text-amber-400"></i>
                <span>${item.poeBudget}W PoE</span>
              </span>
            ` : ''}

            ${item.baseWatts > 0 ? `
              <span class="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 font-mono text-[10px]" title="Base System Power Consumption">
                ${item.baseWatts}W Base
              </span>
            ` : ''}

            ${isCameraItem ? `
              <span class="px-2 py-0.5 rounded ${(item.maxPowerWatts || 0) >= 50 ? 'bg-rose-950/70 border border-rose-700/60 text-rose-300' : ((item.maxPowerWatts || 0) >= 25 ? 'bg-sky-950/70 border border-sky-700/60 text-sky-300' : 'bg-amber-950/70 border border-amber-700/60 text-amber-300')} font-mono text-[10px] font-bold flex items-center gap-1" title="Camera PoE Power Draw & Standard">
                <i data-lucide="zap" class="w-3 h-3"></i>
                <span>${item.powerConsumptionWatts || 8}W / ${item.maxPowerWatts || 15.4}W (${escapeHTML(item.poeStandard || '802.3af')})</span>
              </span>
              <span class="px-2 py-0.5 rounded bg-teal-950/60 border border-teal-800/60 text-teal-300 font-mono text-[10px] flex items-center gap-1" title="Camera Video Stream Bitrate & Resolution">
                <i data-lucide="video" class="w-3 h-3 text-teal-400"></i>
                <span>${item.heads || 1}x ${item.mpPerHead || item.sensorMegapixels || 2}MP &bull; ${item.streamBitrateMbps || 4} Mbps</span>
              </span>
            ` : ''}

            ${pwrBadge ? `
              <span class="px-2 py-0.5 rounded ${pwrBadge.bgClass || 'bg-slate-900 border border-slate-700 text-slate-300'} font-mono text-[10px] flex items-center gap-1" title="Power Source: ${pwrBadge.label}">
                <i data-lucide="${pwrBadge.icon || 'plug'}" class="w-3 h-3"></i>
                <span>${pwrBadge.label}</span>
              </span>
            ` : ''}
          </div>

          <!-- Stacking / Uplink details -->
          <div class="flex items-center gap-2 flex-wrap">
            ${isStackable ? `
              <div class="flex items-center gap-1.5">
                <span class="text-[10px] font-mono px-2 py-0.5 rounded border ${isStack ? 'bg-indigo-950/60 border-indigo-500/40 text-indigo-300 font-bold' : 'bg-slate-900 border-slate-800 text-slate-400'} flex items-center gap-1">
                  <i data-lucide="layers" class="w-3 h-3 ${isStack ? 'text-indigo-400' : 'text-slate-500'}"></i>
                  <span>${isStack ? `${item.stackedUnits}-Switch Stack` : 'Standalone (1 Chassis)'}</span>
                </span>
                ${isStack ? `
                  <button 
                    type="button" 
                    onclick="if (typeof toggleStackPatchPanel === 'function') toggleStackPatchPanel('${item.instanceId}')"
                    class="px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all flex items-center gap-1 border cursor-pointer ${item.patchPanelBetween ? 'bg-purple-900/80 text-purple-200 border-purple-500 hover:bg-purple-800' : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 hover:text-white'}"
                    title="${item.patchPanelBetween ? `Remove ${ppCfg.ports}-port (${ppCfg.sku}) patch panel between stacked switches` : `Place ${ppCfg.rackUnits}U ${ppCfg.ports}-port (${ppCfg.sku}) patch panel in between stacked switches`}"
                  >
                    <i data-lucide="${item.patchPanelBetween ? 'check-square' : 'plus-square'}" class="w-2.5 h-2.5 ${item.patchPanelBetween ? 'text-purple-400' : 'text-slate-400'}"></i>
                    <span>${item.patchPanelBetween ? `${ppCfg.shortLabel} Patch In-Between` : `+ ${ppCfg.shortLabel} Patch`}</span>
                  </button>
                  ${hasStackPower ? `
                    <button
                      type="button"
                      onclick="toggleSwitchStackPower('${item.instanceId}')"
                      class="px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all flex items-center gap-1 border cursor-pointer ${item.stackPowerEnabled !== false ? 'bg-amber-950/85 text-amber-200 border-amber-500/70 hover:bg-amber-900' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'}"
                      title="Toggle Cisco StackPower shared power backplane ring cables"
                    >
                      <i data-lucide="zap" class="w-2.5 h-2.5 ${item.stackPowerEnabled !== false ? 'text-amber-400' : 'text-slate-500'}"></i>
                      <span>${item.stackPowerEnabled !== false ? 'StackPower ON' : '+ StackPower'}</span>
                    </button>
                  ` : ''}
                ` : ''}
              </div>
            ` : ''}

            ${item.uplinkTargetId ? `
              <span class="px-2 py-0.5 rounded bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 text-[10px] font-mono flex items-center gap-1" title="Uplink configured in Topology">
                <i data-lucide="link" class="w-2.5 h-2.5 text-emerald-400"></i>
                <span>Linked</span>
              </span>
            ` : ''}
          </div>
        </div>
      </td>

      <!-- Col 4: Pricing & Quantity -->
      <td class="py-3 px-4 align-top">
        <div class="space-y-1.5">
          <div class="flex items-center gap-3">
            <div>
              <div class="text-sm font-mono font-bold text-emerald-400 tracking-tight" title="${childCost > 0 ? `Hardware: $${totalItemCost.toLocaleString()} + Attached Options: $${childCost.toLocaleString()}` : ''}">$${totalRowCost.toLocaleString()}</div>
              <div class="text-[10px] text-slate-400 font-mono">($${(item.msrp || 0).toLocaleString()} ea${childCost > 0 ? ` + $${childCost.toLocaleString()} opts` : ''})</div>
            </div>

            <!-- Qty Stepper -->
            <div class="flex items-center bg-slate-900 border border-slate-700/80 rounded-xl overflow-hidden shadow-inner">
              <button onclick="changeBomQty('${item.instanceId}', -1)" class="px-2.5 py-1 text-slate-400 hover:text-white hover:bg-slate-800 font-bold transition-colors text-xs cursor-pointer" title="Decrease Quantity">-</button>
              <span class="px-2 text-xs font-mono font-bold text-white min-w-[24px] text-center">${item.qty}</span>
              <button onclick="changeBomQty('${item.instanceId}', 1)" class="px-2.5 py-1 text-slate-400 hover:text-white hover:bg-slate-800 font-bold transition-colors text-xs cursor-pointer" title="Increase Quantity">+</button>
            </div>
          </div>
        </div>
      </td>

      <!-- Col 5: Actions -->
      <td class="py-3 px-4 align-top text-right">
        <div class="flex items-center justify-end gap-1">
          <!-- Configure Accessories, PSUs, Mounts, StackPower & Patch Panels -->
          <button
            type="button"
            onclick="openBomItemAccessoriesModal('${item.instanceId}')"
            class="px-2 py-1.5 rounded-lg bg-slate-900 hover:bg-cyan-950/80 border border-slate-800 hover:border-cyan-700/70 text-cyan-300 hover:text-cyan-200 text-[10px] font-mono font-bold flex items-center gap-1 transition-colors cursor-pointer"
            title="Add or change accessories: Power Supplies, Rack Mounts, Uplink Modules, StackPower, 48P Patch Panels &amp; Licenses"
          >
            <i data-lucide="sliders-horizontal" class="w-3.5 h-3.5"></i>
            <span class="hidden xl:inline">Options</span>
          </button>

          <!-- Replace / Swap Hardware Model in Place -->
          <button
            type="button"
            onclick="openReplaceBomItemModal('${item.instanceId}')"
            class="px-2 py-1.5 rounded-lg bg-slate-900 hover:bg-purple-950/80 border border-slate-800 hover:border-purple-700/70 text-purple-300 hover:text-purple-200 text-[10px] font-mono font-bold flex items-center gap-1 transition-colors cursor-pointer"
            title="Replace / Swap this hardware model for another catalog part while keeping location, rack slot, connections &amp; drops"
          >
            <i data-lucide="repeat" class="w-3.5 h-3.5"></i>
            <span class="hidden xl:inline">Swap</span>
          </button>

          <!-- Jump to Topology -->
          <button 
            type="button" 
            onclick="jumpToTopologyTarget('node:${item.instanceId}')" 
            class="p-1.5 rounded-lg bg-slate-900 hover:bg-indigo-950/80 border border-slate-800 hover:border-indigo-800/60 text-slate-400 hover:text-indigo-300 transition-colors cursor-pointer"
            title="Inspect ports, wire speeds, and logical uplinks in Topology"
          >
            <i data-lucide="network" class="w-3.5 h-3.5"></i>
          </button>

          <!-- Jump to Physical Blueprint -->
          <button 
            type="button" 
            onclick="jumpToPhysicalLayoutTarget('${item.instanceId}')" 
            class="p-1.5 rounded-lg bg-slate-900 hover:bg-amber-950/80 border border-slate-800 hover:border-amber-800/60 text-slate-400 hover:text-amber-300 transition-colors cursor-pointer"
            title="Inspect blueprint, floor drops, and cable pathways in Physical Layout"
          >
            <i data-lucide="map" class="w-3.5 h-3.5"></i>
          </button>

          <!-- Delete Item -->
          <button 
            type="button" 
            onclick="removeBomItem('${item.instanceId}')" 
            class="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/80 border border-slate-800 hover:border-rose-800/60 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
            title="Remove equipment from BOM"
          >
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      </td>
    </tr>
  `;
}

// -----------------------------------------------------------
// Location Accordion Renderer
// -----------------------------------------------------------
function renderBomLocationAccordion(locKey, items) {
  let locWatts = 0, locCost = 0, locUnits = 0;
  items.forEach(it => {
    locUnits += (it.qty || 1);
    locWatts += ((it.poeBudget || 0) + (it.baseWatts || 0)) * (it.qty || 1);
    locCost += (it.msrp || 0) * (it.qty || 1);
    ((window._cachedBomChildrenMap && window._cachedBomChildrenMap.get(it.instanceId)) || projectBOM.filter(ch => ch.parentInstanceId === it.instanceId)).forEach(ch => {
      locCost += (ch.msrp || 0) * (ch.qty || 1);
      locWatts += (ch.baseWatts || 0) * (ch.qty || 1);
    });
  });

  const isUnassigned = typeof FacilityStore !== "undefined" && locKey === FacilityStore.UNASSIGNED;
  const isCollapsed = bomCollapsedLocations.has(locKey);

  return `
    <div class="bg-slate-950/90 rounded-2xl border ${isUnassigned ? 'border-amber-900/40 bg-amber-950/10' : 'border-slate-800'} overflow-hidden shadow-sm transition-all">
      <!-- Accordion Header Banner -->
      <div 
        onclick="toggleBomLocationCollapse('${escapeJSAttr(locKey)}')" 
        class="px-4 py-3 bg-slate-900/90 hover:bg-slate-900 border-b border-slate-800/80 flex items-center justify-between gap-3 cursor-pointer select-none transition-colors"
      >
        <div class="flex items-center gap-3">
          <i data-lucide="${isCollapsed ? 'chevron-right' : 'chevron-down'}" class="w-4 h-4 text-slate-400 transition-transform"></i>
          <div class="p-1.5 rounded-lg ${isUnassigned ? 'bg-amber-950/80 text-amber-400 border border-amber-800/60' : 'bg-indigo-950/80 text-indigo-400 border border-indigo-800/60'}">
            <i data-lucide="${isUnassigned ? 'inbox' : (locKey.endsWith(' • Field') ? 'radio' : 'map-pin')}" class="w-4 h-4"></i>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-sm font-bold ${isUnassigned ? 'text-amber-300' : 'text-white'}">
                ${isUnassigned ? 'Unassigned Equipment (Staging)' : escapeHTML(locKey)}
              </span>
              <span class="px-2 py-0.2 rounded-full ${isUnassigned ? 'bg-amber-950/80 text-amber-300 border border-amber-800' : 'bg-slate-800 text-slate-300 border border-slate-700'} text-[10px] font-mono font-bold">
                ${locUnits} ${locUnits === 1 ? 'unit' : 'units'} (${items.length} ${items.length === 1 ? 'device' : 'devices'})
              </span>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2 text-xs font-mono">
            <span class="text-slate-400">${locWatts}W Load</span>
            <span class="text-slate-600">&bull;</span>
            <span class="font-bold text-emerald-400 text-sm">$${Math.round(locCost).toLocaleString()}</span>
          </div>

          ${!isUnassigned ? `
            <button 
              type="button" 
              onclick="event.stopPropagation(); openRackViewerFor('${escapeJSAttr(locKey)}')" 
              class="px-2.5 py-1 bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-800/60 text-indigo-300 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Open Enclosure Visualizer"
            >
              <i data-lucide="server" class="w-3.5 h-3.5"></i>
              <span>Enclosure</span>
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Accordion Body: Table -->
      ${!isCollapsed ? `
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-950/90 text-[10px] font-mono uppercase text-slate-400 border-b border-slate-800">
                <th class="py-2.5 px-4 font-bold w-[34%]">Item & Specification</th>
                <th class="py-2.5 px-4 font-bold w-[18%]">Placement / Rack Slot</th>
                <th class="py-2.5 px-4 font-bold w-[22%]">Engineering & Power</th>
                <th class="py-2.5 px-4 font-bold w-[16%]">Pricing & Quantity</th>
                <th class="py-2.5 px-4 font-bold w-[10%] text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(it => renderBomTableRow(it)).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}
    </div>
  `;
}

// -----------------------------------------------------------
// Category Accordion Renderer
// -----------------------------------------------------------
function renderBomCategoryAccordion(catKey, catMeta, items) {
  let catWatts = 0, catCost = 0, catUnits = 0;
  items.forEach(it => {
    catUnits += (it.qty || 1);
    catWatts += ((it.poeBudget || 0) + (it.baseWatts || 0)) * (it.qty || 1);
    catCost += (it.msrp || 0) * (it.qty || 1);
    ((window._cachedBomChildrenMap && window._cachedBomChildrenMap.get(it.instanceId)) || projectBOM.filter(ch => ch.parentInstanceId === it.instanceId)).forEach(ch => {
      catCost += (ch.msrp || 0) * (ch.qty || 1);
      catWatts += (ch.baseWatts || 0) * (ch.qty || 1);
    });
  });

  const isCollapsed = bomCollapsedLocations.has(catKey);

  return `
    <div class="bg-slate-950/90 rounded-2xl border border-slate-800 overflow-hidden shadow-sm transition-all">
      <!-- Accordion Header Banner -->
      <div 
        onclick="toggleBomLocationCollapse('${escapeJSAttr(catKey)}')" 
        class="px-4 py-3 bg-slate-900/90 hover:bg-slate-900 border-b border-slate-800/80 flex items-center justify-between gap-3 cursor-pointer select-none transition-colors"
      >
        <div class="flex items-center gap-3">
          <i data-lucide="${isCollapsed ? 'chevron-right' : 'chevron-down'}" class="w-4 h-4 text-slate-400 transition-transform"></i>
          <div class="p-1.5 rounded-lg bg-indigo-950/80 text-indigo-400 border border-indigo-800/60">
            <i data-lucide="${catMeta.icon || 'box'}" class="w-4 h-4"></i>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-sm font-bold text-white">
                ${escapeHTML(catMeta.label)}
              </span>
              <span class="px-2 py-0.2 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-mono font-bold">
                ${catUnits} ${catUnits === 1 ? 'unit' : 'units'} (${items.length} ${items.length === 1 ? 'device' : 'devices'})
              </span>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2 text-xs font-mono">
            <span class="text-slate-400">${catWatts}W Load</span>
            <span class="text-slate-600">&bull;</span>
            <span class="font-bold text-emerald-400 text-sm">$${Math.round(catCost).toLocaleString()}</span>
          </div>
        </div>
      </div>

      <!-- Accordion Body: Table -->
      ${!isCollapsed ? `
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-950/90 text-[10px] font-mono uppercase text-slate-400 border-b border-slate-800">
                <th class="py-2.5 px-4 font-bold w-[34%]">Item & Specification</th>
                <th class="py-2.5 px-4 font-bold w-[18%]">Placement / Rack Slot</th>
                <th class="py-2.5 px-4 font-bold w-[22%]">Engineering & Power</th>
                <th class="py-2.5 px-4 font-bold w-[16%]">Pricing & Quantity</th>
                <th class="py-2.5 px-4 font-bold w-[10%] text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(it => renderBomTableRow(it)).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}
    </div>
  `;
}

// -----------------------------------------------------------
// Flat Procurement Order Table Renderer
// -----------------------------------------------------------
function renderBomFlatTable(skuList, totalUniqueSkus, totalRawCount, totalOrderCost) {
  return `
    <div class="space-y-4">
      <!-- Flat Order Summary Header -->
      <div class="p-4 bg-slate-900 border border-indigo-900/60 rounded-2xl flex items-center justify-between gap-3 shadow-sm select-none">
        <div class="flex items-center gap-3">
          <div class="p-2.5 rounded-xl bg-indigo-950 border border-indigo-700/60 text-indigo-400">
            <i data-lucide="package-check" class="w-5 h-5"></i>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-sm font-bold text-white">Flat Procurement Order</span>
              <span class="px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800 text-[10px] font-mono font-bold">RAW SKU COUNTS</span>
            </div>
            <span class="text-xs text-slate-400 font-mono">${totalUniqueSkus} Unique SKUs &bull; ${totalRawCount} Total Raw Units &bull; Consolidated Regardless of Location</span>
          </div>
        </div>
        <div class="text-right">
          <span class="text-[10px] text-slate-400 uppercase font-mono block">Order Total</span>
          <span class="text-base font-mono font-bold text-emerald-400">$${Math.round(totalOrderCost).toLocaleString()}</span>
        </div>
      </div>

      <!-- Raw SKU Table -->
      <div class="bg-slate-950/90 rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-950 text-[10px] font-mono uppercase text-slate-400 border-b border-slate-800">
                <th class="py-2.5 px-4 font-bold w-[34%]">Part & Catalog Specification</th>
                <th class="py-2.5 px-4 font-bold w-[28%]">Location Allocations</th>
                <th class="py-2.5 px-4 font-bold w-[14%]">Power Draw</th>
                <th class="py-2.5 px-4 font-bold w-[16%]">Pricing & Quantity</th>
                <th class="py-2.5 px-4 font-bold w-[8%] text-right">Delete</th>
              </tr>
            </thead>
            <tbody>
              ${skuList.map(s => renderBomFlatTableRow(s)).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function renderBomFlatTableRow(skuItem) {
  const locEntries = Object.entries(skuItem.locations);
  const locSummary = locEntries.map(([loc, count]) => `${loc}: ${count}`).join(" • ");

  return `
    <tr class="border-b border-slate-800/80 hover:bg-slate-900/50 transition-colors">
      <td class="py-3 px-4 align-top">
        <div class="space-y-1">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-xs font-bold text-white tracking-tight">${escapeHTML(skuItem.model)}</span>
            ${skuItem.vendor ? `<span class="px-1.5 py-0.2 rounded bg-slate-900 border border-slate-700 text-[10px] font-mono text-slate-300">${escapeHTML(skuItem.vendor)}</span>` : ''}
            <span class="px-1.5 py-0.2 rounded bg-indigo-950/80 border border-indigo-800/80 text-[10px] font-mono text-indigo-300 font-semibold">SKU: ${escapeHTML(skuItem.sku)}</span>
          </div>
          <div class="text-[11px] text-slate-400 font-mono">
            <span>${escapeHTML(skuItem.role)}</span>
          </div>
        </div>
      </td>

      <td class="py-3 px-4 align-top">
        <div class="flex items-center gap-1.5 text-xs text-slate-300">
          <i data-lucide="map-pin" class="w-3.5 h-3.5 text-indigo-400 shrink-0"></i>
          <span class="font-mono text-[11px] truncate" title="${escapeHTML(locSummary)}">${escapeHTML(locSummary)}</span>
        </div>
      </td>

      <td class="py-3 px-4 align-top font-mono text-xs text-slate-400">
        ${skuItem.totalWatts > 0 ? `<span class="text-slate-200 font-semibold">${Math.round(skuItem.totalWatts)}W</span> Total` : '<span class="text-slate-600">-</span>'}
      </td>

      <td class="py-3 px-4 align-top">
        <div class="flex items-center gap-3">
          <div>
            <div class="text-xs font-mono font-bold text-emerald-400">$${Math.round(skuItem.totalCost).toLocaleString()}</div>
            <div class="text-[10px] text-slate-400 font-mono">($${(skuItem.msrp || 0).toLocaleString()} ea)</div>
          </div>
          <div class="flex items-center bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-inner">
            <button onclick="changeRawSkuQty('${escapeJSAttr(skuItem.sku)}', -1)" class="px-2 py-1 text-slate-400 hover:text-white font-bold transition-colors text-xs cursor-pointer" title="Decrease Total Quantity">-</button>
            <span class="px-2 text-xs font-mono font-bold text-white min-w-[24px] text-center">${skuItem.rawQty}</span>
            <button onclick="changeRawSkuQty('${escapeJSAttr(skuItem.sku)}', 1)" class="px-2 py-1 text-slate-400 hover:text-white font-bold transition-colors text-xs cursor-pointer" title="Increase Total Quantity">+</button>
          </div>
        </div>
      </td>

      <td class="py-3 px-4 align-top text-right">
        <button onclick="deleteRawSkuFromBOM('${escapeJSAttr(skuItem.sku)}')" class="text-slate-500 hover:text-rose-400 p-1.5 transition-colors rounded-lg hover:bg-slate-900 cursor-pointer" title="Delete all units of this SKU">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
      </td>
    </tr>
  `;
}

// Backwards-compatible card wrappers
function renderBomFlatSkuItemHtml(skuItem) {
  return renderBomFlatTableRow(skuItem);
}

function renderBomSingleItemHtml(item) {
  return renderBomTableRow(item);
}

function changeRawSkuQty(skuKey, delta) {
  if (typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) return;

  const matchingItems = projectBOM.filter(item => {
    const key = String(item.sku || item.id || item.model || '').trim();
    return key === skuKey;
  });

  if (matchingItems.length === 0) return;

  if (delta > 0) {
    const unassignedItem = matchingItems.find(it => {
      const loc = typeof FacilityStore !== "undefined" ? FacilityStore.normalize(it.closetName || it.rackId) : it.closetName;
      return loc === FacilityStore.UNASSIGNED;
    }) || matchingItems[0];

    const isCamera = unassignedItem.role === "Camera" || unassignedItem.role === "Surveillance" || unassignedItem.role === "Video" ||
                     (unassignedItem.category && unassignedItem.category.toLowerCase().includes("camera")) ||
                     (unassignedItem.deviceTypePrefix === "CAM" || unassignedItem.deviceTypePrefix === "LPR") ||
                     (typeof DeviceTaxonomy !== "undefined" && DeviceTaxonomy.getDeviceType && ["CAM", "LPR"].includes(DeviceTaxonomy.getDeviceType(unassignedItem).prefix));

    if (isCamera) {
      changeBomQty(unassignedItem.instanceId, 1);
    } else {
      unassignedItem.qty = (unassignedItem.qty || 1) + 1;
      if (typeof FacilityStore !== "undefined") FacilityStore.notifyWorkspaceChange();
      updateBOMView();
      if (typeof StorageService !== "undefined" && typeof StorageService.queueAutoSave === "function") {
        StorageService.queueAutoSave();
      }
    }
  } else if (delta < 0) {
    const unassignedItem = matchingItems.slice().reverse().find(it => {
      const loc = typeof FacilityStore !== "undefined" ? FacilityStore.normalize(it.closetName || it.rackId) : it.closetName;
      return loc === FacilityStore.UNASSIGNED;
    }) || matchingItems[matchingItems.length - 1];

    if ((unassignedItem.qty || 1) > 1) {
      unassignedItem.qty = (unassignedItem.qty || 1) - 1;
      if (typeof FacilityStore !== "undefined") FacilityStore.notifyWorkspaceChange();
      updateBOMView();
      if (typeof StorageService !== "undefined" && typeof StorageService.queueAutoSave === "function") {
        StorageService.queueAutoSave();
      }
    } else {
      if (matchingItems.length > 1) {
        deleteDeviceFromBOM(unassignedItem.instanceId, true);
      } else {
        deleteDeviceFromBOM(unassignedItem.instanceId);
      }
    }
  }
}

function deleteRawSkuFromBOM(skuKey) {
  if (typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) return;

  const matchingItems = projectBOM.filter(item => {
    const key = String(item.sku || item.id || item.model || '').trim();
    return key === skuKey;
  });

  if (matchingItems.length === 0) return;

  const skuName = matchingItems[0].model || skuKey;
  const totalUnits = matchingItems.reduce((acc, x) => acc + (x.qty || 1), 0);
  if (!confirm(`Are you sure you want to remove all ${totalUnits} unit(s) of ${skuName} from the project BOM?`)) {
    return;
  }

  matchingItems.forEach(ch => {
    if (ch.parentInstanceId && ch.buildOptionCategory) {
      const parentSrv = projectBOM.find(p => p.instanceId === ch.parentInstanceId);
      if (parentSrv && parentSrv.selectedBuildOptions) {
        delete parentSrv.selectedBuildOptions[ch.buildOptionCategory];
      }
    }
  });
  const idsToDelete = matchingItems.map(x => x.instanceId);
  idsToDelete.forEach(id => {
    deleteDeviceFromBOM(id, true);
  });

  if (typeof showToast === "function") {
    showToast(`Removed all ${totalUnits} unit(s) of ${skuName} from BOM.`);
  }
}

// -----------------------------------------------------------
// Cloud Licensing Manager Modal
// -----------------------------------------------------------
function toggleLicenseModal() {
  const modal = document.getElementById("licenseModal");
  if (!modal) return;

  if (modal.classList.contains("hidden")) {
    modal.classList.remove("hidden");
    renderLicenseManagerContent();
  } else {
    modal.classList.add("hidden");
  }
}

function getAvailableTermsInBOM() {
  const parentItems = projectBOM.filter(i => !i.parentInstanceId && (i.role === "Access" || i.role === "Core" || i.role === "Aggregation" || i.role === "Security WAN"));
  const termSet = new Set();

  parentItems.forEach(item => {
    const vendorCatalog = MGMT_SUBSCRIPTION_CATALOG[item.vendor] || {};
    Object.values(vendorCatalog).forEach(profile => {
      if (profile && profile.terms) {
        Object.keys(profile.terms).forEach(termKey => {
          if (termKey !== "PERP") termSet.add(termKey);
        });
      }
    });
  });

  const standardOrder = ["1YR", "2YR", "3YR", "5YR", "7YR", "10YR"];
  return standardOrder.filter(t => termSet.has(t));
}

function renderLicenseManagerContent() {
  const container = document.getElementById("licenseManagerContent");
  if (!container) return;

  const parentDevices = projectBOM.filter(i => !i.parentInstanceId && (i.role === "Access" || i.role === "Core" || i.role === "Aggregation" || i.role === "Security WAN"));

  if (parentDevices.length === 0) {
    container.innerHTML = `
      <div class="py-12 text-center text-slate-500 text-xs">
        <p class="font-semibold text-slate-400">No manageable devices in the BOM.</p>
        <p class="mt-1">Add switches or firewalls to configure licensing terms.</p>
      </div>`;
    return;
  }

  const availableTerms = getAvailableTermsInBOM();
  if (availableTerms.length > 0 && !availableTerms.includes(globalSelectedTerm)) {
    globalSelectedTerm = availableTerms[0];
  }

  const deployedVendors = [...new Set(parentDevices.map(d => d.vendor))];

  container.innerHTML = `
    <div class="space-y-4 text-xs">
      <div class="bg-slate-900 p-3.5 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span class="font-bold text-white text-sm block">Global Subscription Duration:</span>
          <span class="text-slate-400 text-[11px]">Only durations supported by your quoted hardware are shown.</span>
        </div>
        <div class="flex items-center gap-1.5">
          ${availableTerms.map(term => `
            <button onclick="setGlobalTerm('${term}')" class="px-2.5 py-1 rounded text-xs font-mono font-bold border transition-all ${globalSelectedTerm === term ? 'bg-purple-600 border-purple-400 text-white shadow-md' : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-white'}">
              ${term}
            </button>
          `).join('')}
        </div>
      </div>

      <div class="bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-2">
        <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Batch Assign Management by Manufacturer:</span>
        <div class="flex flex-wrap gap-2">
          ${deployedVendors.map(vendor => {
            const vendorProfiles = MGMT_SUBSCRIPTION_CATALOG[vendor] || {};
            const profileKeys = Object.keys(vendorProfiles);
            if (profileKeys.length === 0) return '';

            return profileKeys.map(pKey => `
              <button onclick="setVendorManagementProfile('${vendor}', '${pKey}')" class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-purple-900/40 border border-slate-700 hover:border-purple-500/50 text-[11px] text-slate-300 hover:text-purple-200 transition-colors flex items-center gap-1.5">
                <span class="font-bold text-white">${vendor}:</span>
                <span>${vendorProfiles[pKey].name}</span>
              </button>
            `).join('');
          }).join('')}
          <button onclick="clearAllManagementLicenses()" class="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-400 hover:text-rose-300 transition-colors">
            Set All to Standalone ($0)
          </button>
        </div>
      </div>

      <div class="space-y-2">
        <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Individual Device Management Routing:</span>
        <div class="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/80">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="bg-slate-950/90 text-[10px] font-mono uppercase text-slate-400 border-b border-slate-800">
                <th class="py-2.5 px-3.5 font-bold">Hardware Model &amp; Vendor</th>
                <th class="py-2.5 px-3.5 font-bold">Quantity &amp; Assigned Location</th>
                <th class="py-2.5 px-3.5 font-bold">Management Platform / License Tier</th>
                <th class="py-2.5 px-3.5 font-bold">Subscription Term</th>
                <th class="py-2.5 px-3.5 font-bold text-right">Extended Cost</th>
              </tr>
            </thead>
            <tbody>
              ${parentDevices.map(dev => {
                const vendorProfiles = MGMT_SUBSCRIPTION_CATALOG[dev.vendor] || {};
                const currentMgmtItem = projectBOM.find(i => i.parentInstanceId === dev.instanceId && (i.role === "Mgmt License" || i.role === "Security License"));
                
                let activeKey = dev.selectedMgmtProfile;
                if (!activeKey || (!vendorProfiles[activeKey] && activeKey !== "standalone")) {
                  activeKey = dev.vendor === "Meraki" ? "cloud" : "standalone";
                  dev.selectedMgmtProfile = activeKey;
                }

                const activeProfile = vendorProfiles[activeKey];
                const deviceSupportedTerms = (activeProfile && activeProfile.terms) ? Object.keys(activeProfile.terms).filter(t => t !== "PERP") : [];
                const rawLoc = dev.closetName || dev.rackId || FacilityStore.UNASSIGNED;
                const locationLabel = typeof FacilityStore !== "undefined" ? FacilityStore.normalize(rawLoc) : rawLoc;

                return `
                  <tr class="border-b border-slate-800/70 hover:bg-slate-850/40 transition-colors">
                    <td class="py-2.5 px-3.5">
                      <div class="flex items-center gap-2">
                        <span class="font-bold text-white">${dev.model}</span>
                        <span class="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 border border-slate-700 text-slate-400 font-mono">${dev.vendor}</span>
                      </div>
                    </td>
                    <td class="py-2.5 px-3.5 font-mono text-[11px] text-slate-300">
                      <span class="font-bold text-white">${dev.qty}x</span> units &bull; <span class="text-slate-400">${locationLabel}</span>
                    </td>
                    <td class="py-2.5 px-3.5">
                      <select onchange="updateSwitchMgmtProfile('${dev.instanceId}', this.value)" class="w-full bg-slate-950 border border-slate-700 text-purple-300 font-semibold rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-purple-500">
                        ${Object.entries(vendorProfiles).map(([pKey, pData]) => `
                          <option value="${pKey}" ${activeKey === pKey ? 'selected' : ''}>${pData.name}</option>
                        `).join('')}
                        ${dev.vendor !== "Meraki" && !vendorProfiles.standalone ? `
                          <option value="standalone" ${activeKey === 'standalone' ? 'selected' : ''}>Standalone / Air-Gapped CLI ($0)</option>
                        ` : ''}
                      </select>
                    </td>
                    <td class="py-2.5 px-3.5">
                      ${deviceSupportedTerms.length > 1 ? `
                        <div class="inline-flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                          ${deviceSupportedTerms.map(t => `
                            <button onclick="setIndividualDeviceTerm('${dev.instanceId}', '${t}')" class="px-1.5 py-0.5 text-[10px] font-mono rounded font-bold ${dev.individualTerm === t || (!dev.individualTerm && globalSelectedTerm === t) ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}">
                              ${t}
                            </button>
                          `).join('')}
                        </div>
                      ` : `<span class="text-[11px] font-mono text-slate-500">N/A</span>`}
                    </td>
                    <td class="py-2.5 px-3.5 text-right font-mono text-emerald-400 font-bold text-xs">
                      ${currentMgmtItem ? `$${(currentMgmtItem.msrp * currentMgmtItem.qty).toLocaleString()}` : '$0'}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  if (typeof safeCreateIcons === "function") {
    safeCreateIcons(container);
  } else if (window.lucide) {
    try { lucide.createIcons(); } catch(e) {}
  }
}

function setGlobalTerm(term, skipConfirm = false) {
  const defs = (typeof StorageService !== "undefined" && typeof StorageService.getProjectDefaults === "function") ? StorageService.getProjectDefaults() : null;
  const defTerm = defs?.licensing?.globalSelectedTerm || "1YR";
  if (!skipConfirm && defs && term !== defTerm && typeof confirmProjectDefaultChange === "function" && !(typeof isProjectWizardOpen === "function" && isProjectWizardOpen())) {
    confirmProjectDefaultChange({
      title: "Change Project Licensing & Subscription Term?",
      settingLabel: "Software Licensing & Warranty Term",
      defaultLabel: defTerm,
      newLabel: term,
      message: `Your Project Default Software Licensing Term is set to "${defTerm}". Are you sure you want to change it to "${term}"?`,
      allowLocalOverride: true,
      localOverrideLabel: `Apply ${term} to Cloud Hardware Only`,
      updateDefaultLabel: `Update Project Default to ${term}`,
      onLocalOverride: () => setGlobalTerm(term, true),
      onUpdateDefault: () => {
        if (typeof updateSingleProjectDefault === "function") {
          updateSingleProjectDefault(d => { if (!d.licensing) d.licensing = {}; d.licensing.globalSelectedTerm = term; }, true);
        }
        setGlobalTerm(term, true);
      }
    });
    return;
  }
  globalSelectedTerm = term;
  const parentDevices = projectBOM.filter(i => !i.parentInstanceId && (i.role === "Access" || i.role === "Core" || i.role === "Aggregation" || i.role === "Security WAN"));

  parentDevices.forEach(dev => {
    dev.individualTerm = null;
    if (dev.selectedMgmtProfile && dev.selectedMgmtProfile !== "standalone") {
      applyManagementSubscription(dev.instanceId, dev.selectedMgmtProfile, globalSelectedTerm);
    }
  });

  FacilityStore.notifyWorkspaceChange();
  renderLicenseManagerContent();
  showToast(`Updated all cloud subscriptions to ${term} terms.`);
}

function setIndividualDeviceTerm(instanceId, term) {
  const dev = projectBOM.find(i => i.instanceId === instanceId);
  if (!dev) return;

  dev.individualTerm = term;
  applyManagementSubscription(instanceId, dev.selectedMgmtProfile, term);

  FacilityStore.notifyWorkspaceChange();
  renderLicenseManagerContent();
  showToast(`Updated ${dev.model} to ${term} term.`);
}

function setVendorManagementProfile(vendor, profileKey) {
  const devices = projectBOM.filter(i => !i.parentInstanceId && i.vendor === vendor);
  devices.forEach(dev => {
    dev.selectedMgmtProfile = profileKey;
    const term = dev.individualTerm || globalSelectedTerm;
    applyManagementSubscription(dev.instanceId, profileKey, term);
  });

  FacilityStore.notifyWorkspaceChange();
  renderLicenseManagerContent();
  showToast(`Applied ${profileKey} across all ${vendor} devices.`);
}

function clearAllManagementLicenses() {
  const parentDevices = projectBOM.filter(i => !i.parentInstanceId);
  parentDevices.forEach(dev => {
    if (dev.vendor === "Meraki") {
      dev.selectedMgmtProfile = "cloud";
      applyManagementSubscription(dev.instanceId, "cloud", globalSelectedTerm || "1YR");
    } else {
      dev.selectedMgmtProfile = "standalone";
      applyManagementSubscription(dev.instanceId, "standalone", "PERP");
    }
  });

  FacilityStore.notifyWorkspaceChange();
  renderLicenseManagerContent();
  showToast("Cleared non-mandatory subscriptions. Meraki retained required licenses.");
}

function updateSwitchMgmtProfile(instanceId, profileKey) {
  const dev = projectBOM.find(i => i.instanceId === instanceId);
  const term = (dev && dev.individualTerm) ? dev.individualTerm : globalSelectedTerm;
  applyManagementSubscription(instanceId, profileKey, term);

  FacilityStore.notifyWorkspaceChange();
  renderLicenseManagerContent();
  showToast("Updated management subscription.");
}

// -----------------------------------------------------------
// Quote Export & Clipboard
// -----------------------------------------------------------
function copyBomSummary() {
  if (projectBOM.length === 0) { showToast("Cannot export empty BOM."); return; }

  const compliance = checkMerakiCompliance();
  if (!compliance.compliant) {
    showToast("Compliance Alert: Configure Meraki licensing before copying.");
    toggleLicenseModal();
    return;
  }

  let txt = `SECURITY NETWORK INFRASTRUCTURE BOM\n\n`;
  let totalMSRP = 0;
  projectBOM.forEach(i => {
    totalMSRP += (i.msrp * i.qty);
    const rawLoc = i.closetName || i.rackId || FacilityStore.UNASSIGNED;
    const loc = `[${typeof FacilityStore !== "undefined" ? FacilityStore.normalize(rawLoc) : rawLoc}] `;
    const devNum = i.deviceNumber ? `[${i.deviceNumber}] ` : '';
    const friendly = (i.friendlyName && i.friendlyName !== i.model) ? ` "${i.friendlyName}"` : '';
    const lagStr = i.uplinkMode === 'lag_dual' ? ' (2x LAG Uplink)' : '';
    txt += `${loc}${devNum}[${i.qty}x] ${i.vendor} ${i.model}${friendly}${lagStr} (SKU: ${i.sku}) - $${(i.msrp * i.qty).toLocaleString()}\n`;
  });
  txt += `\nTotal Estimated Hardware MSRP: $${totalMSRP.toLocaleString()}\n`;
  navigator.clipboard.writeText(txt).then(() => showToast("BOM copied to clipboard!"));
}

function exportBomCSV() {
  if (projectBOM.length === 0) { showToast("Cannot export empty BOM."); return; }

  const compliance = checkMerakiCompliance();
  if (!compliance.compliant) {
    showToast("Compliance Alert: Configure Meraki licensing before exporting.");
    toggleLicenseModal();
    return;
  }

  const escCell = typeof window.escapeCSVCell === "function" ? window.escapeCSVCell : (v => `"${String(v ?? "").replace(/"/g, '""')}"`);
  let csv = "Device ID,Friendly Name,Location,Rack,Role,Vendor,Model,SKU,Quantity,Uplink Mode,Unit MSRP,Total MSRP,PoE Budget,Power Watts\n";
  projectBOM.forEach(i => {
    const rawLoc = i.closetName || i.rackId || FacilityStore.UNASSIGNED;
    const normalizedLoc = typeof FacilityStore !== "undefined" ? FacilityStore.normalize(rawLoc) : rawLoc;
    const parsed = typeof FacilityStore !== "undefined" ? FacilityStore.parse(normalizedLoc) : { space: "General", enclosure: "General" };
    const totalW = ((i.poeBudget || 0) + (i.baseWatts || 0)) * i.qty;
    const devNum = i.deviceNumber || "";
    const friendly = (typeof DeviceTaxonomy !== "undefined" ? DeviceTaxonomy.getFriendlyName(i) : (i.friendlyName || i.model)) || "";
    csv += `${escCell(devNum)},${escCell(friendly)},${escCell(parsed.space)},${escCell(parsed.enclosure)},${escCell(i.role || 'Accessory')},${escCell(i.vendor)},${escCell(i.model)},${escCell(i.sku)},${i.qty},${escCell(i.uplinkMode || 'single')},${i.msrp},${i.msrp * i.qty},${i.poeBudget || 0},${totalW}\n`;
  });
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Security_Infrastructure_BOM_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  showToast("Exported BOM CSV.");
}

// ==========================================
// ENGINEERING SUBMITTAL & COMPREHENSIVE WORKBOOK ENGINE
// ==========================================

function compileProjectEngineeringData() {
  const projName = typeof StorageService !== "undefined" ? StorageService.getActiveProjectName() : "Security Infrastructure Project";
  const projId = typeof StorageService !== "undefined" ? StorageService.getActiveProjectId() : "default";
  const dateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const timeStr = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  const defs = (typeof StorageService !== "undefined" && typeof StorageService.getProjectDefaults === "function")
    ? StorageService.getProjectDefaults()
    : {};
  const meta = defs.metadata || {};
  const jobOpportunityNumber = meta.jobOpportunityNumber || "";
  const clientName = meta.clientName || "";
  const siteAddress = meta.siteAddress || "";
  const leadDesigner = meta.leadDesigner || "";
  const licensingTerm = (defs.licensing && defs.licensing.globalSelectedTerm) || (typeof globalSelectedTerm !== "undefined" ? globalSelectedTerm : "1YR");

  let totalHardwareUnits = 0;
  let totalMSRP = 0;
  let totalPoEBudgetWatts = 0;
  let totalPowerConsumptionWatts = 0;

  const categorized = {
    switches: [],
    cameras: [],
    access: [],
    firewalls: [],
    servers: [],
    cabling: [],
    optics: [],
    accessories: [],
    licenses: []
  };

  projectBOM.forEach((item) => {
    const qty = item.qty || 1;
    totalHardwareUnits += qty;
    totalMSRP += (item.msrp || 0) * qty;
    const poe = (item.poeBudget || 0) * qty;
    totalPoEBudgetWatts += poe;
    const power = ((item.baseWatts || item.powerWatts || item.powerConsumptionWatts || 0) + (item.poeBudget || 0)) * qty;
    totalPowerConsumptionWatts += power;

    const role = (item.role || "").toLowerCase();
    const cat = (item.category || "").toLowerCase();
    const model = (item.model || "").toLowerCase();
    const desc = (item.description || "").toLowerCase();
    const all = `${role} ${cat} ${model} ${desc}`;

    if (item.source === "cabling_auto_sync" || role.includes("passive") || cat.includes("cabling") || /patch panel|keystone|cable spool|cat6/i.test(all)) {
      categorized.cabling.push(item);
    } else if (item.source === "topology_auto_sync" || role === "optics" || cat === "optics" || /transceiver|dac|sfp|fiber patch/i.test(all)) {
      categorized.optics.push(item);
    } else if (role === "license" || cat === "license" || /license|cloud management/i.test(all)) {
      categorized.licenses.push(item);
    } else if (role === "camera" || role === "surveillance" || /camera|bullet|dome|ptz|multisensor/i.test(all)) {
      categorized.cameras.push(item);
    } else if (role === "access control" || /door|controller|mercury|reader|cloudlink|trove/i.test(all)) {
      categorized.access.push(item);
    } else if (role === "firewall" || /gateway|firewall|mx|fortigate/i.test(all)) {
      categorized.firewalls.push(item);
    } else if (role === "server" || /server|storage|nvr|vms/i.test(all)) {
      categorized.servers.push(item);
    } else if (role === "access" || role === "core" || role === "aggregation" || /switch/i.test(all)) {
      categorized.switches.push(item);
    } else {
      categorized.accessories.push(item);
    }
  });

  const totalHeatBTU = Math.round(totalPowerConsumptionWatts * 3.412142);
  const totalCoolingTons = (totalHeatBTU / 12000).toFixed(2);

  // Telecom Closets & Spaces
  let spaces = [];
  if (typeof FacilityStore !== "undefined" && typeof FacilityStore.getSpaces === "function") {
    spaces = FacilityStore.getSpaces();
  }
  if (!spaces || spaces.length === 0) {
    const spaceSet = new Set();
    projectBOM.forEach(i => {
      const loc = i.closetName || i.rackId || "MDF";
      const parsed = typeof FacilityStore !== "undefined" ? FacilityStore.parse(loc) : { space: loc };
      spaceSet.add(parsed.space || loc);
    });
    spaces = Array.from(spaceSet).map(s => ({ id: s, name: s, type: "MDF" }));
  }

  // Rack Utilization Schedule
  const rackSchedule = [];
  const enclosures = (typeof FacilityStore !== "undefined" && typeof FacilityStore.getEnclosures === "function")
    ? FacilityStore.getEnclosures()
    : [];

  spaces.forEach(sp => {
    const spEnclosures = enclosures.filter(e => e.spaceId === sp.id || e.spaceName === sp.name);
    if (spEnclosures.length > 0) {
      spEnclosures.forEach(enc => {
        const mounted = projectBOM.filter(i => {
          const loc = i.closetName || i.rackId || "";
          return loc.includes(enc.name) || i.rackId === enc.id || (i.spaceId === sp.id && (!i.rackId || i.rackId === enc.name));
        });
        let occupiedU = 0;
        let encWatts = 0;
        mounted.forEach(m => {
          const mRU = (m.rackUnits !== undefined && m.rackUnits !== null) ? (parseInt(m.rackUnits, 10) || 0) : 1;
          occupiedU += mRU * (m.qty || 1);
          encWatts += ((m.baseWatts || m.powerWatts || 0) + (m.poeBudget || 0)) * (m.qty || 1);
        });
        const totalU = enc.rackUnits || 42;
        const availableU = Math.max(0, totalU - occupiedU);
        const utilPct = Math.min(100, Math.round((occupiedU / totalU) * 100));
        const encBTU = Math.round(encWatts * 3.412142);

        rackSchedule.push({
          space: sp.name,
          enclosure: enc.name,
          formFactor: enc.formFactor || "4-Post Open Frame",
          totalU,
          occupiedU,
          availableU,
          utilPct,
          itemsCount: mounted.length,
          watts: encWatts,
          btu: encBTU,
          equipment: mounted.map(m => `${m.qty}x ${m.vendor} ${m.model}`).join("; ")
        });
      });
    } else {
      const mounted = projectBOM.filter(i => {
        const loc = i.closetName || i.rackId || "";
        return loc.includes(sp.name) || i.spaceId === sp.id;
      });
      let encWatts = 0;
      mounted.forEach(m => {
        encWatts += ((m.baseWatts || m.powerWatts || 0) + (m.poeBudget || 0)) * (m.qty || 1);
      });
      const encBTU = Math.round(encWatts * 3.412142);
      const occupiedU = mounted.reduce((acc, m) => {
        const mRU = (m.rackUnits !== undefined && m.rackUnits !== null) ? (parseInt(m.rackUnits, 10) || 0) : 1;
        return acc + (mRU * (m.qty || 1));
      }, 0);
      rackSchedule.push({
        space: sp.name,
        enclosure: "Standard Floor Enclosure",
        formFactor: "Cabinet",
        totalU: 42,
        occupiedU,
        availableU: Math.max(0, 42 - occupiedU),
        utilPct: Math.min(100, Math.round((occupiedU / 42) * 100)),
        itemsCount: mounted.length,
        watts: encWatts,
        btu: encBTU,
        equipment: mounted.map(m => `${m.qty}x ${m.vendor} ${m.model}`).join("; ")
      });
    }
  });

  // PoE Telemetry Per Space
  const poeSchedule = [];
  spaces.forEach(sp => {
    const closetItems = projectBOM.filter(i => {
      const loc = i.closetName || i.rackId || "";
      return loc.includes(sp.name) || i.spaceId === sp.id;
    });

    let switchBudget = 0;
    let switchCount = 0;
    let edgeDemand = 0;
    let edgeCount = 0;

    closetItems.forEach(i => {
      const role = (i.role || "").toLowerCase();
      const isSwitch = role === "access" || role === "core" || role === "aggregation" || /switch/i.test(role);
      if (isSwitch) {
        switchBudget += (i.poeBudget || 0) * (i.qty || 1);
        switchCount += (i.qty || 1);
      } else if (i.poeStandard || i.poeWattsDrawn || i.powerSource === "poe_switch" || /camera|door|reader|intercom|access control/i.test(role)) {
        const itemW = (i.powerConsumptionWatts || i.maxPowerWatts || i.powerWatts || i.poeWattsDrawn || 15);
        edgeDemand += itemW * (i.qty || 1);
        edgeCount += (i.qty || 1);
      }
    });

    const headroom = switchBudget - edgeDemand;
    const utilPct = switchBudget > 0 ? Math.round((edgeDemand / switchBudget) * 100) : (edgeDemand > 0 ? 999 : 0);
    let status = "OPTIMAL";
    if (switchBudget === 0 && edgeDemand > 0) status = "DEFICIT (NO POE)";
    else if (headroom < 0) status = "DEFICIT OVERLOAD";
    else if (utilPct > 80) status = "WARNING (>80%)";

    poeSchedule.push({
      space: sp.name,
      switchCount,
      switchBudget,
      edgeCount,
      edgeDemand,
      headroom,
      utilPct,
      status
    });
  });

  // Structured Cabling Per Space
  const cablingSchedule = [];
  const dropMap = {};
  const footageMap = {};
  const allFacilityClosets = (typeof getAllClosetsAcrossFacility === "function") ? getAllClosetsAcrossFacility() : [];
  if (typeof facilityFloors !== "undefined" && Array.isArray(facilityFloors)) {
    facilityFloors.forEach(fl => {
      const floorClosets = (fl.nodes || []).filter(cn => cn.type === "closet");
      (fl.nodes || []).forEach(n => {
        if (n.type !== "closet") {
          let closetNode = allFacilityClosets.find(c => c.id === n.assignedClosetId) || floorClosets.find(c => c.id === n.assignedClosetId) || floorClosets[0];
          const rawTarget = closetNode ? closetNode.name : (n.assignedCloset || n.closetId || "MDF");
          const parsedTarget = (typeof FacilityStore !== "undefined" && typeof FacilityStore.parse === "function")
            ? FacilityStore.parse(rawTarget).spaceName
            : rawTarget.split("•")[0].trim();
          const target = parsedTarget || "MDF";
          dropMap[target] = (dropMap[target] || 0) + 1;
          const runFt = (n.calculatedRun && n.calculatedRun.totalFt) ? n.calculatedRun.totalFt : 150;
          footageMap[target] = (footageMap[target] || 0) + runFt;
        }
      });
    });
  }

  spaces.forEach(sp => {
    const drops = dropMap[sp.name] || dropMap[sp.id] || 0;
    const pp48 = Math.floor(drops / 48);
    const remainder = drops % 48;
    const pp24 = remainder > 24 ? 0 : (remainder > 0 ? 1 : 0);
    const effectivePP48 = remainder > 24 ? pp48 + 1 : pp48;
    const totalPanels = effectivePP48 + pp24;
    const estFootage = footageMap[sp.name] || footageMap[sp.id] || (drops * 150);

    let fiberLinks = 0;
    if (typeof topologyLinks !== "undefined" && Array.isArray(topologyLinks)) {
      fiberLinks = topologyLinks.filter(l => {
        return (l.sourceCloset === sp.name || l.targetCloset === sp.name) && l.isInterCloset;
      }).length;
    }

    cablingSchedule.push({
      space: sp.name,
      drops,
      pp48: effectivePP48,
      pp24,
      totalPanels,
      keystones: drops,
      estFootage,
      spoolsNeeded: Math.ceil(estFootage / 1000),
      fiberLinks
    });
  });

  return {
    projName,
    projId,
    dateStr,
    timeStr,
    totalHardwareUnits,
    totalMSRP,
    totalPoEBudgetWatts,
    totalPowerConsumptionWatts,
    totalHeatBTU,
    totalCoolingTons,
    categorized,
    spaces,
    rackSchedule,
    poeSchedule,
    cablingSchedule,
    jobOpportunityNumber,
    clientName,
    siteAddress,
    leadDesigner,
    licensingTerm
  };
}

function exportComprehensiveProjectCSV() {
  if (projectBOM.length === 0) {
    showToast("Cannot export empty BOM.");
    return;
  }

  const compliance = checkMerakiCompliance();
  if (!compliance.compliant) {
    showToast("Compliance Alert: Configure Meraki licensing before exporting.");
    toggleLicenseModal();
    return;
  }

  const data = compileProjectEngineeringData();
  const esc = typeof window.escapeCSVCell === "function" ? window.escapeCSVCell : ((val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  });

  let csv = "";

  // HEADER
  csv += "================================================================================\n";
  csv += "ORION SECURITY SOLUTIONS - COMPREHENSIVE PROJECT SPECIFICATION & ENGINEERING SUBMITTAL\n";
  csv += "================================================================================\n";
  csv += `Project Name:,${esc(data.projName)}\n`;
  csv += `Job / Opportunity #:,${esc(data.jobOpportunityNumber || "N/A")}\n`;
  csv += `Client / Facility:,${esc(data.clientName || "N/A")}\n`;
  csv += `Site Address:,${esc(data.siteAddress || "N/A")}\n`;
  csv += `Lead System Designer:,${esc(data.leadDesigner || "N/A")}\n`;
  csv += `Project Key:,${esc(data.projId)}\n`;
  csv += `Licensing Term:,${esc(data.licensingTerm || "1-Year")}\n`;
  csv += `Generated Date:,${esc(data.dateStr + " " + data.timeStr)}\n`;
  csv += `Platform Version:,OSS Design Tool v0.10.0-alpha\n`;
  csv += `Total Hardware Items:,${data.totalHardwareUnits}\n`;
  csv += `Estimated Hardware MSRP:,${esc("$" + data.totalMSRP.toLocaleString())}\n`;
  csv += `Combined PoE Power Budget:,${data.totalPoEBudgetWatts} W\n`;
  csv += `Total Heat Dissipation:,${data.totalHeatBTU} BTU/hr (${data.totalCoolingTons} AC Tons)\n`;
  csv += "\n";

  // SECTION 1: DETAILED BILL OF MATERIALS
  csv += "================================================================================\n";
  csv += "SECTION 1: DETAILED PROJECT BILL OF MATERIALS (BOM)\n";
  csv += "================================================================================\n";
  csv += "Item #,Device ID,Subsystem Category,Friendly Name,Space / Location,Enclosure / Rack,Role,Vendor,Model,SKU,Quantity,Uplink Mode,Unit MSRP,Ext MSRP,PoE Budget (W),Total Power (W),Heat Output (BTU/hr)\n";

  projectBOM.forEach((i, idx) => {
    const rawLoc = i.closetName || i.rackId || FacilityStore.UNASSIGNED;
    const normalizedLoc = typeof FacilityStore !== "undefined" ? FacilityStore.normalize(rawLoc) : rawLoc;
    const parsed = typeof FacilityStore !== "undefined" ? FacilityStore.parse(normalizedLoc) : { space: "General", enclosure: "General" };
    const devNum = i.deviceNumber || `DEV-${idx + 1}`;
    const friendly = (typeof DeviceTaxonomy !== "undefined" ? DeviceTaxonomy.getFriendlyName(i) : (i.friendlyName || i.model)) || "";
    const devType = typeof DeviceTaxonomy !== "undefined" ? DeviceTaxonomy.getDeviceType(i).label : (i.role || "Device");
    const totalW = ((i.poeBudget || 0) + (i.baseWatts || i.powerWatts || 0)) * (i.qty || 1);
    const btu = Math.round(totalW * 3.412142);

    csv += `${idx + 1},${esc(devNum)},${esc(devType)},${esc(friendly)},${esc(parsed.space)},${esc(parsed.enclosure)},${esc(i.role || "Device")},${esc(i.vendor)},${esc(i.model)},${esc(i.sku)},${i.qty || 1},${esc(i.uplinkMode || "single")},${i.msrp || 0},${(i.msrp || 0) * (i.qty || 1)},${i.poeBudget || 0},${totalW},${btu}\n`;
  });
  csv += `,,,,,,,,,,,,TOTAL MSRP,${data.totalMSRP},${data.totalPoEBudgetWatts},${data.totalPowerConsumptionWatts},${data.totalHeatBTU}\n\n`;

  // SECTION 2: TELECOM CLOSETS & RACK UTILIZATION SCHEDULE
  csv += "================================================================================\n";
  csv += "SECTION 2: TELECOM CLOSETS & RACK UTILIZATION SCHEDULE\n";
  csv += "================================================================================\n";
  csv += "Space / Closet,Enclosure Name,Form Factor,Rack Capacity (U),Occupied (U),Available (U),Utilization %,Installed Devices Count,Enclosure Power (W),Heat Output (BTU/hr),Installed Equipment Inventory\n";
  data.rackSchedule.forEach(r => {
    csv += `${esc(r.space)},${esc(r.enclosure)},${esc(r.formFactor)},${r.totalU},${r.occupiedU},${r.availableU},${r.utilPct}%,${r.itemsCount},${r.watts},${r.btu},${esc(r.equipment)}\n`;
  });
  csv += "\n";

  // SECTION 3: POE POWER BUDGET & HEADROOM TELEMETRY
  csv += "================================================================================\n";
  csv += "SECTION 3: POE POWER BUDGET & HEADROOM TELEMETRY\n";
  csv += "================================================================================\n";
  csv += "Space / Closet,Switch Count,Switch PoE Budget (W),Connected Edge Devices,Calculated PoE Demand (W),PoE Headroom (W),Utilization %,Compliance Status\n";
  data.poeSchedule.forEach(p => {
    csv += `${esc(p.space)},${p.switchCount},${p.switchBudget},${p.edgeCount},${p.edgeDemand},${p.headroom},${p.utilPct}%,${esc(p.status)}\n`;
  });
  csv += "\n";

  // SECTION 4: STRUCTURED CABLING & FIELD DROP SCHEDULE
  csv += "================================================================================\n";
  csv += "SECTION 4: STRUCTURED CABLING & FIELD DROP SCHEDULE\n";
  csv += "================================================================================\n";
  csv += "Space / Closet,Terminated Drops,48P Panels,24P Panels,Total Patch Panels,Keystone Jacks,Est Horizontal Footage (ft),1000ft Spools Needed,Inter-Closet Fiber Trunks\n";
  data.cablingSchedule.forEach(c => {
    csv += `${esc(c.space)},${c.drops},${c.pp48},${c.pp24},${c.totalPanels},${c.keystones},${c.estFootage},${c.spoolsNeeded},${c.fiberLinks}\n`;
  });
  csv += "\n";

  // SECTION 5: LICENSING & ENGINEERING COMPLIANCE
  csv += "================================================================================\n";
  csv += "SECTION 5: SYSTEM LICENSING & CLOUD TERMS AUDIT\n";
  csv += "================================================================================\n";
  csv += "Subsystem / Vendor,Model / SKU,Required Licenses,Quantity,Term,Audit Status\n";
  data.categorized.licenses.forEach(l => {
    csv += `${esc(l.vendor)},${esc(l.model + " (" + l.sku + ")")},Required,${l.qty || 1},${esc(l.term || "1-Year")},Verified\n`;
  });
  if (data.categorized.licenses.length === 0) {
    csv += "Enterprise Cloud Licensing,No cloud subscription licenses required in active BOM,0,0,N/A,Compliant\n";
  }
  csv += "\n";

  const cleanName = data.projName.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 32);
  const fileName = `OSS_Engineering_Submittal_${cleanName}_${new Date().toISOString().slice(0, 10)}.csv`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
  showToast("Exported comprehensive multi-section CSV workbook.");
}

function jumpToBomTarget(instanceId) {
  if (typeof NavigationHistory !== "undefined") {
    const st = NavigationHistory.captureCurrentState();
    if (st && st.tool !== "bom") NavigationHistory.push(st);
  }

  if (window.TabManager && typeof window.TabManager.openTab === "function") {
    window.TabManager.openTab("bom");
  } else {
    const modal = document.getElementById("bomModal");
    if (modal && modal.classList.contains("hidden")) {
      toggleBomModal();
    } else {
      const drawer = document.getElementById("bomDrawer");
      if (drawer && drawer.classList.contains("translate-x-full")) {
        toggleBomModal();
      }
    }
  }

  if (instanceId) {
    const targetItem = projectBOM.find(i => i.instanceId === instanceId);
    if (targetItem) {
      if (bomSearchQuery || bomSelectedLocation !== "all" || bomSelectedCategory !== "all") {
        resetBomFilters();
      }
      const rawLoc = targetItem.closetName || targetItem.rackId || (typeof FacilityStore !== "undefined" ? FacilityStore.UNASSIGNED : "Unassigned");
      const locKey = typeof FacilityStore !== "undefined" ? FacilityStore.normalize(rawLoc) : rawLoc;
      if (bomCollapsedLocations.has(locKey)) {
        bomCollapsedLocations.delete(locKey);
        updateBOMView();
      }
    }

    setTimeout(() => {
      const el = document.getElementById(`bom-item-${instanceId}`) || document.querySelector(`[data-bom-instance="${instanceId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-indigo-400", "bg-indigo-950/40");
        setTimeout(() => {
          el.classList.remove("ring-2", "ring-indigo-400", "bg-indigo-950/40");
        }, 2500);
      }
    }, 150);
  }
}

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
                Resolved Panel: ${escapeHTML(ppCfg.sku)} (${ppCfg.rackUnits}U ${ppCfg.ports}-Port)
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
                  <option value="standard_pod" ${currentPatchLayout === "standard_pod" ? 'selected' : ''}>Standard Pod (Panel Above Each Switch)</option>
                  ${stackCount >= 2 ? `<option value="between_stack" ${currentPatchLayout === "between_stack" ? 'selected' : ''}>In-Between Stack Members (${stackCount - 1}x Interleaved)</option>` : ''}
                </select>
              </div>

              <div>
                <label class="block text-[10px] font-mono uppercase text-slate-400 mb-1">Patch Panel Density / SKU</label>
                <select onchange="setBomItemPatchPanelOptions('${item.instanceId}', undefined, this.value)" class="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs cursor-pointer">
                  <option value="auto" ${currentPatchSku === "auto" ? 'selected' : ''}>Auto (${ppCfg.copperPorts > 24 ? '1U 48-Port PP-1U-48P-MOD' : '1U 24-Port PP-1U-24P-MOD'})</option>
                  <option value="PP-1U-48P-MOD" ${currentPatchSku === "PP-1U-48P-MOD" ? 'selected' : ''}>1U 48-Port High-Density (PP-1U-48P-MOD)</option>
                  <option value="PP-2U-48P-MOD" ${currentPatchSku === "PP-2U-48P-MOD" ? 'selected' : ''}>2U 48-Port Keystone (PP-2U-48P-MOD)</option>
                  <option value="PP-1U-24P-MOD" ${currentPatchSku === "PP-1U-24P-MOD" ? 'selected' : ''}>1U 24-Port Keystone (PP-1U-24P-MOD)</option>
                  <option value="DUAL-24P" ${currentPatchSku === "DUAL-24P" ? 'selected' : ''}>Dual 1U 24-Port Split (Above &amp; Below Switch)</option>
                </select>
              </div>
            </div>

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
window.resolveSwitchPatchPanelConfig = resolveSwitchPatchPanelConfig;
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


