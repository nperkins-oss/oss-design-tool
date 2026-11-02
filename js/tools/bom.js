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

/**
 * Detects physical left/right copper port block offset on <=24-port 19" rackmount switches:
 *  - "left":  Cisco, Meraki, Juniper, Ruckus, Aruba/HPE, Allied Telesis, Fortinet (2x12 copper block on left half)
 *  - "right": Ubiquiti UniFi 16/24P rackmount switches (1.3" LCM touchscreen & bezel on left, RJ-45 ports shifted right)
 *  - "inline": Full-width or generic 24-port switches
 */
function resolveSwitch24PortOffset(item) {
  const copperPorts = getSwitchCopperPortCount(item);
  if (copperPorts > 24 || copperPorts <= 0) {
    return {
      is24Class: false,
      side: "full",
      autoSide: "full",
      isAutoSide: true,
      rawMode: "auto",
      effectiveMode: "full_width",
      alignedPortsPerUnit: copperPorts,
      offsetPortsPerUnit: 0,
      shortBadge: "Full-Width 48P",
      description: "Full-width 48-port dual-row chassis"
    };
  }

  const catItem = lookupCatalogRecordForBomItem(item);
  const vendor = String(item?.vendor || catItem?.vendor || "").trim();
  const skuModel = `${item?.sku || ""} ${item?.id || ""} ${item?.model || ""} ${catItem?.sku || ""} ${catItem?.model || ""}`.toUpperCase();

  let autoSide = "inline";
  if (/UNIFI|UBIQUITI/i.test(vendor) || /\bUSW-/i.test(skuModel)) {
    autoSide = "right";
  } else if (
    copperPorts >= 12 &&
    (/CISCO|MERAKI|JUNIPER|RUCKUS|ARUBA|HPE|ALLIED|FORTINET|EXTREME/i.test(vendor) ||
     /\b(C9200|C9300|C9350|C1200|C1300|CBS|MS1[235]0|MS2[125]0|MS3[59]0|EX2300|EX4[134]00|ICX|AT-X|FS-[124])/i.test(skuModel))
  ) {
    autoSide = "left";
  }

  const explicitSide = (item?.portOffsetSide && item.portOffsetSide !== "auto") ? item.portOffsetSide : null;
  const side = (explicitSide === "left" || explicitSide === "right" || explicitSide === "inline") ? explicitSide : autoSide;
  const rawMode = item?.offset24PatchMode || "auto";

  let effectiveMode = rawMode;
  if (!rawMode || rawMode === "auto") {
    effectiveMode = (side === "left" || side === "right") ? "mixed_cords" : "inline_6in";
  } else if (side === "inline" && effectiveMode === "mixed_cords") {
    effectiveMode = "inline_6in";
  }

  let alignedPortsPerUnit = copperPorts;
  let offsetPortsPerUnit = 0;
  if (effectiveMode === "mixed_cords" && (side === "left" || side === "right")) {
    if (side === "left") {
      alignedPortsPerUnit = Math.min(12, copperPorts);
      offsetPortsPerUnit = Math.max(0, copperPorts - 12);
    } else {
      offsetPortsPerUnit = Math.min(12, copperPorts);
      alignedPortsPerUnit = Math.max(0, copperPorts - 12);
    }
  } else if (effectiveMode === "all_1ft_cords") {
    alignedPortsPerUnit = 0;
    offsetPortsPerUnit = copperPorts;
  }

  const sideTitle = side === "left" ? "Left-Offset 2×12" : (side === "right" ? "Right-Offset (LCM Left)" : "Full-Width Inline");
  let shortBadge = sideTitle;
  if (effectiveMode === "mixed_cords") {
    shortBadge = `${sideTitle} • ${alignedPortsPerUnit}×6" + ${offsetPortsPerUnit}×1ft`;
  } else if (effectiveMode === "offset_48p_frame") {
    shortBadge = `48P Half-Frame (${side === "right" ? "Right" : "Left"} 2×12) • ${copperPorts}×6"`;
  } else if (effectiveMode === "all_1ft_cords") {
    shortBadge = `${sideTitle} • ${copperPorts}×1ft`;
  } else {
    shortBadge = `${sideTitle} • ${copperPorts}×6"`;
  }

  return {
    is24Class: true,
    side,
    autoSide,
    isAutoSide: !explicitSide,
    rawMode,
    effectiveMode,
    alignedPortsPerUnit,
    offsetPortsPerUnit,
    shortBadge,
    description: side === "left"
      ? "Copper ports clustered in 2×12 block on LEFT half of chassis"
      : (side === "right"
        ? "LCM screen/bezel on left; copper ports shifted to RIGHT half of chassis"
        : "Copper ports distributed across full faceplate width")
  };
}

function resolve24PortCordLengthFt(offset24, localCopperIdx) {
  if (!offset24 || !offset24.is24Class) return 0.5;
  if (offset24.effectiveMode === "all_1ft_cords") return 1;
  if (offset24.effectiveMode === "offset_48p_frame" || offset24.effectiveMode === "inline_6in" || offset24.side === "inline") return 0.5;
  if (offset24.side === "left") {
    return localCopperIdx < 12 ? 0.5 : 1;
  }
  if (offset24.side === "right") {
    return localCopperIdx < 12 ? 1 : 0.5;
  }
  return 0.5;
}

function resolveSwitchPatchPanelConfig(item) {
  const copperPorts = getSwitchCopperPortCount(item);
  const stackUnits = (item?.stackedUnits && item.stackedUnits >= 2) ? item.stackedUnits : 1;
  const override = (item?.patchPanelSku && item.patchPanelSku !== "auto") ? item.patchPanelSku : null;
  const offset24 = resolveSwitch24PortOffset(item);

  const cat24 = (typeof CABLING_CATALOG !== "undefined" && CABLING_CATALOG.patchPanels?.find(p => p.sku === "PP-1U-24P-MOD")) || null;
  const cat48 = (typeof CABLING_CATALOG !== "undefined" && CABLING_CATALOG.patchPanels?.find(p => p.sku === "PP-1U-48P-MOD")) || null;
  const cat2U48 = (typeof CABLING_CATALOG !== "undefined" && CABLING_CATALOG.patchPanels?.find(p => p.sku === "PP-2U-48P-MOD")) || null;

  const cap24Model = cat24?.name || "1U 24-Port High-Density Modular Keystone Patch Panel";
  const cap24Msrp = Number(cat24?.msrp) || 68;
  const cap24WeightLbs = Number(cat24?.weightLbs) || 1.8;

  const between48Model = cat48?.name || "1U 48-Port High-Density Modular Keystone Patch Panel";
  const between48Msrp = Number(cat48?.msrp) || 108;
  const between48WeightLbs = Number(cat48?.weightLbs) || 2.2;

  if (override === "DUAL-24P") {
    return {
      sku: "PP-1U-24P-MOD",
      model: cap24Model,
      ports: 24,
      rackUnits: 1,
      msrp: cap24Msrp,
      weightLbs: cap24WeightLbs,
      depthInches: 1.5,
      panelsPerSwitch: 2,
      isSandwich48: false,
      isDual24: true,
      is48: false,
      isOffset48Frame: false,
      shortLabel: "2x24P",
      copperPorts,
      offset24
    };
  }

  if (override === "PP-2U-48P-MOD") {
    return {
      sku: "PP-2U-48P-MOD",
      model: cat2U48?.name || "2U 48-Port High-Density Modular Keystone Patch Panel",
      ports: 48,
      rackUnits: 2,
      msrp: Number(cat2U48?.msrp) || 115,
      weightLbs: Number(cat2U48?.weightLbs) || 3.4,
      depthInches: 1.5,
      panelsPerSwitch: 1,
      isSandwich48: false,
      isDual24: false,
      is48: true,
      isOffset48Frame: false,
      shortLabel: "2U 48P",
      copperPorts,
      offset24
    };
  }

  // Default 48-Port Switch Architecture ("SANDWICH-48" or auto):
  //  - Standalone 48P (N=1): 2x 24-Port panels (1U Above & 1U Below switch = 3U total)
  //  - Stacked / Adjacent 48P (N>=2): 2x 24-Port outer cap panels (Above top & Below bottom) + (N-1)x 48-Port panels IN BETWEEN
  //  - In-Between Stack Only (!standardPod && patchPanelBetween): (N-1)x 48-Port panels IN BETWEEN
  if ((copperPorts > 24 && (!override || override === "SANDWICH-48")) || override === "SANDWICH-48") {
    const adjRole = item?.podAdjacentRole || null;
    const outer24Count = adjRole === "top" || adjRole === "bottom" ? 1 : (adjRole === "middle" ? 0 : 2);
    const inner48Count = Math.max(0, stackUnits - 1) + (adjRole === "top" || adjRole === "middle" ? 1 : 0);
    return {
      sku: "PP-1U-48P-MOD",
      model: between48Model,
      ports: 48,
      rackUnits: 1,
      msrp: between48Msrp,
      weightLbs: between48WeightLbs,
      depthInches: 1.5,
      cap24Sku: "PP-1U-24P-MOD",
      cap24Model,
      cap24Msrp,
      cap24WeightLbs,
      between48Sku: "PP-1U-48P-MOD",
      between48Model,
      between48Msrp,
      between48WeightLbs,
      betweenRackUnits: 1,
      outer24Count,
      inner48Count,
      panelsPerSwitch: 1,
      isSandwich48: true,
      isDual24: false,
      is48: true,
      isOffset48Frame: false,
      shortLabel: (stackUnits >= 2 || inner48Count > 0) ? "24P+48P" : "2x24P",
      btwnShortLabel: "48P",
      copperPorts,
      offset24
    };
  }

  // Explicit single 1U 48P panel above each switch OR 24P Offset Half-Populated 48P Frame
  if (override === "PP-1U-48P-MOD" || (!override && offset24.is24Class && offset24.effectiveMode === "offset_48p_frame")) {
    const isHalfFrame = Boolean(offset24.is24Class && offset24.effectiveMode === "offset_48p_frame" && override !== "PP-1U-48P-MOD");
    return {
      sku: "PP-1U-48P-MOD",
      model: between48Model,
      ports: isHalfFrame ? Math.min(24, copperPorts || 24) : 48,
      frameSlots: 48,
      rackUnits: 1,
      msrp: between48Msrp,
      weightLbs: between48WeightLbs,
      depthInches: 1.5,
      panelsPerSwitch: 1,
      isSandwich48: false,
      isDual24: false,
      is48: !isHalfFrame,
      isOffset48Frame: isHalfFrame,
      populatedSide: isHalfFrame ? (offset24.side === "right" ? "right" : "left") : null,
      shortLabel: isHalfFrame ? (offset24.side === "right" ? "48P-R24" : "48P-L24") : "48P",
      btwnShortLabel: "48P",
      copperPorts,
      offset24
    };
  }

  return {
    sku: "PP-1U-24P-MOD",
    model: cap24Model,
    ports: 24,
    rackUnits: 1,
    msrp: cap24Msrp,
    weightLbs: cap24WeightLbs,
    depthInches: 1.5,
    panelsPerSwitch: 1,
    isSandwich48: false,
    isDual24: false,
    is48: false,
    isOffset48Frame: false,
    shortLabel: "24P",
    btwnShortLabel: "24P",
    copperPorts,
    offset24
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
    ? (ppCfg.isSandwich48 ? (ppCfg.betweenRackUnits || 1) : (ppCfg.isDual24 ? 2 : ppCfg.rackUnits))
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
    const podInterleavePerGap = item.standardPod
      ? (ppCfg.isSandwich48 ? (ppCfg.betweenRackUnits || 1) : (ppCfg.isDual24 ? 2 : ppCfg.rackUnits))
      : 0;
    const interleaveU = item.standardPod
      ? (podInterleavePerGap * (item.stackedUnits - 1))
      : ((item.patchPanelBetween ? ppCfg.rackUnits * (item.stackedUnits - 1) : 0) + (item.cableManagerBetween ? (item.stackedUnits - 1) : 0));
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

    if (item.patchPanelBetween && !item.standardPod && stackInfraScope.rackPatchPanels !== false && !stackDirectRj45) {
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
  const keystonePackQty = Math.max(1, Math.ceil(totalCopperPorts / 24));

  if (infraScope.rackPatchPanels !== false && !isDirectRj45) {
    if (ppCfg.isSandwich48) {
      // 1A. 48-Port Switch Sandwich Pod: 24-Port Panels Above & Below + 48-Port Panels In-Between
      if (ppCfg.outer24Count > 0) {
        const capDesc = stackMultiplier >= 2 || ppCfg.inner48Count > 0
          ? "Standard Pod: Outer Top & Bottom 24P Cap Panels"
          : "Standard Pod: 24P Above & Below Switch";
        projectBOM.push({
          instanceId: `pod-pp24-${item.instanceId}`,
          parentInstanceId: item.instanceId,
          source: "switch_standard_pod",
          id: `${item.id}-pod-pp24`,
          model: `${ppCfg.cap24Model} (${capDesc})`,
          sku: ppCfg.cap24Sku,
          role: "Structured Cabling",
          category: "Infrastructure",
          vendor: "Panduit",
          msrp: ppCfg.cap24Msrp,
          rackUnits: 1,
          weightLbs: ppCfg.cap24WeightLbs,
          depthInches: ppCfg.depthInches,
          ports: 24,
          poeBudget: 0,
          baseWatts: 0,
          closetName: item.closetName,
          rackId: item.rackId,
          qty: ppCfg.outer24Count
        });
      }
      if (ppCfg.inner48Count > 0) {
        projectBOM.push({
          instanceId: `pod-pp48-btwn-${item.instanceId}`,
          parentInstanceId: item.instanceId,
          source: "switch_standard_pod",
          id: `${item.id}-pod-pp48-btwn`,
          model: `${ppCfg.between48Model} (Standard Pod: In-Between 48P Shared Panel)`,
          sku: ppCfg.between48Sku,
          role: "Structured Cabling",
          category: "Infrastructure",
          vendor: "Panduit",
          msrp: ppCfg.between48Msrp,
          rackUnits: ppCfg.betweenRackUnits || 1,
          weightLbs: ppCfg.between48WeightLbs,
          depthInches: ppCfg.depthInches,
          ports: 48,
          poeBudget: 0,
          baseWatts: 0,
          closetName: item.closetName,
          rackId: item.rackId,
          qty: ppCfg.inner48Count
        });
      }
    } else {
      // 1B. 24-Port Pod (Standard 1U 24P, Half-Populated 1U 48P Offset Frame, or Explicit Override)
      const panelQty = ppCfg.panelsPerSwitch * stackMultiplier;
      const podDesc = ppCfg.isOffset48Frame
        ? `Half-Populated 2×12 ${ppCfg.populatedSide === 'right' ? 'Right' : 'Left'}-Offset Frame`
        : (ppCfg.isDual24 ? 'Standard Pod: Above & Below' : 'Standard Switch Pod');
      projectBOM.push({
        instanceId: `pod-pp-${item.instanceId}`,
        parentInstanceId: item.instanceId,
        source: "switch_standard_pod",
        id: `${item.id}-pod-pp`,
        model: `${ppCfg.model} (${podDesc})`,
        sku: ppCfg.sku,
        role: "Structured Cabling",
        category: "Infrastructure",
        vendor: "Panduit",
        msrp: ppCfg.msrp,
        rackUnits: ppCfg.rackUnits,
        weightLbs: ppCfg.weightLbs,
        depthInches: ppCfg.depthInches,
        ports: ppCfg.ports,
        frameSlots: ppCfg.frameSlots || ppCfg.ports,
        poeBudget: 0,
        baseWatts: 0,
        closetName: item.closetName,
        rackId: item.rackId,
        qty: panelQty
      });
    }

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

  // 3. Add Cat6A Slim Patch Cords (6-Inch vertical direct + automatic 1-Foot horizontal-reach split on Left/Right Offset 24P switches)
  const cordBuckets = {}; // key: "<lengthFt>|<colorName>" -> { lengthFt, colorName, count }
  const addCordBucket = (lengthFt, colorName, cnt) => {
    if (cnt <= 0) return;
    const key = `${lengthFt}|${colorName}`;
    if (!cordBuckets[key]) cordBuckets[key] = { lengthFt, colorName, count: 0 };
    cordBuckets[key].count += cnt;
  };

  const ports = (typeof PortEngine !== "undefined" && typeof PortEngine.initSwitchPorts === "function")
    ? PortEngine.initSwitchPorts(item)
    : [];
  const copperPorts = ports.filter(p => !p.isUplink && p.role !== "uplink" && p.role !== "stack_interconnect" && String(p.connector || "RJ-45").includes("RJ"));
  const perUnitCopper = Math.max(1, ppCfg.copperPorts || 24);

  if (copperPorts.length > 0) {
    copperPorts.forEach((p, idx) => {
      const dev = (p.connectedDeviceId && Array.isArray(projectBOM))
        ? projectBOM.find(b => b && b.instanceId === p.connectedDeviceId)
        : null;
      const patchStd = (typeof getProjectCablingStandard === "function")
        ? getProjectCablingStandard(dev, "patch")
        : { color: "Yellow" };
      const col = patchStd?.color || "Yellow";
      const localCopperIdx = p.unitPortNumber ? ((p.unitPortNumber - 1) % perUnitCopper) : (idx % perUnitCopper);
      const lenFt = ppCfg.offset24?.is24Class ? resolve24PortCordLengthFt(ppCfg.offset24, localCopperIdx) : 0.5;
      addCordBucket(lenFt, col, 1);
    });
  } else {
    const defStd = (typeof getProjectCablingStandard === "function")
      ? getProjectCablingStandard(null, "patch")
      : { color: "Yellow" };
    const col = defStd?.color || "Yellow";
    if (ppCfg.offset24?.is24Class) {
      addCordBucket(0.5, col, ppCfg.offset24.alignedPortsPerUnit * stackMultiplier);
      addCordBucket(1, col, ppCfg.offset24.offsetPortsPerUnit * stackMultiplier);
    } else {
      addCordBucket(0.5, col, totalCopperPorts);
    }
  }

  Object.values(cordBuckets).forEach(({ lengthFt, colorName, count }) => {
    if (count <= 0) return;
    const isOneFoot = lengthFt === 1;
    const matchedCord = (typeof findPatchCordItem === "function")
      ? findPatchCordItem(lengthFt, "Panduit", false, colorName)
      : {
          sku: isOneFoot
            ? (colorName === "Blue" ? "C6A-SLIM-1FT-BL" : "C6A-SLIM-1FT-YL")
            : (colorName === "Blue" ? "C6A-SLIM-6IN-BL" : "C6A-SLIM-6IN-YL"),
          name: isOneFoot
            ? `Cat6A 28AWG Slim High-Density Patch Cord (1-Foot, ${colorName})`
            : `Cat6A 28AWG Slim High-Density Patch Cord (6-Inch / 0.5-Foot, ${colorName})`,
          vendor: "Panduit",
          msrp: isOneFoot ? 7.50 : 6.20
        };
    const lenSlug = isOneFoot ? "1ft" : "6in";
    const offsetNote = (isOneFoot && ppCfg.offset24?.is24Class && ppCfg.offset24.effectiveMode === "mixed_cords")
      ? ` [24P ${ppCfg.offset24.side === 'right' ? 'Right' : 'Left'}-Offset Reach]`
      : "";
    projectBOM.push({
      instanceId: `pod-patch-cables-${item.instanceId}-${lenSlug}-${colorName.toLowerCase()}`,
      parentInstanceId: item.instanceId,
      source: "switch_standard_pod",
      id: `${item.id}-pod-patch-cables-${lenSlug}-${colorName.toLowerCase()}`,
      model: `${matchedCord.name}${offsetNote}`,
      sku: matchedCord.sku,
      role: "Structured Cabling",
      category: "Infrastructure",
      vendor: matchedCord.vendor || "Panduit",
      msrp: matchedCord.msrp || (isOneFoot ? 7.50 : 6.20),
      rackUnits: 0,
      lengthFt,
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

