// ==========================================
// BILL OF MATERIALS (BOM) & LICENSING ENGINE (NetSelect Enterprise)
// Integrated with FacilityStore & Universal Workspace Dispatcher
// ==========================================

let projectBOM = [];
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
  const merakiDevices = projectBOM.filter(i => !i.parentInstanceId && (i.vendor === "Meraki" || i.vendor === "Cisco"));
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
  const merakiDevices = projectBOM.filter(i => !i.parentInstanceId && (i.vendor === "Meraki" || i.vendor === "Cisco"));
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
  access_control: { id: "access_control", label: "Access Control (PACS)", icon: "key-round", color: "orange" },
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

  if (cat === "licensing" || cat === "software" || role.includes("license") || role.includes("subscription")) {
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
  const groups = FacilityStore.getLocationGroups(true);
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

    // 7. Mounting & Form Factor Flag
    if (item.isDinMounted === undefined) {
      item.isDinMounted = Boolean(catItem.mounting && catItem.mounting.includes("DIN") && !catItem.mounting.includes("19\""));
    }
  }

  return item;
}
window.enrichBOMItemFromCatalog = enrichBOMItemFromCatalog;

function addToProjectBOM(id, targetLocation = null) {
  const sw = (typeof CatalogRegistry !== "undefined" && typeof CatalogRegistry.getSwitch === "function" ? CatalogRegistry.getSwitch(id) : null) ||
             (typeof CatalogRegistry !== "undefined" && typeof CatalogRegistry.get === "function" ? CatalogRegistry.get(id) : null) ||
             (typeof SWITCH_DATABASE !== "undefined" ? SWITCH_DATABASE.find(s => s.id === id || s.sku === id) : null);
  if (!sw) {
    console.error("addToProjectBOM: Switch not found in catalog for id:", id);
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
        qty: qtyToAdd
      });
    }
  });

  // Redundant & External PSUs
  const redundantPsuChecked = document.getElementById(`psuRedundant-${sw.id}`)?.checked;
  if (redundantPsuChecked && sw.psuSku && POWER_SUPPLY_CATALOG[sw.psuSku]) {
    const psu = POWER_SUPPLY_CATALOG[sw.psuSku];
    projectBOM.push({
      instanceId: `psu2-${instanceId}`,
      parentInstanceId: instanceId,
      id: psu.sku,
      model: `2nd Redundant PSU: ${psu.name}`,
      sku: psu.sku,
      role: "Power Supply",
      vendor: sw.vendor,
      msrp: psu.msrp,
      poeBudget: 0,
      baseWatts: 0,
      qty: 1
    });
  }

  // Hot-Swappable Fan Module
  const fanSpareChecked = document.getElementById(`fanSpare-${sw.id}`)?.checked;
  const fanSku = sw.fanSku || (sw.compatibleAccessories && sw.compatibleAccessories.includes('UACC-Fan-4020') ? 'UACC-Fan-4020' : null);
  if (fanSpareChecked && fanSku) {
    const fan = (typeof POWER_SUPPLY_CATALOG !== "undefined" && POWER_SUPPLY_CATALOG[fanSku]) || { sku: fanSku, name: `${sw.vendor || ''} Hot-Swappable Fan Module (${fanSku})`, msrp: 49 };
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
      poeBudget: 0,
      baseWatts: 2,
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
        closetName: assignedLoc,
        rackId: assignedLoc,
        qty: 1
      });
      if (mountItem.rackUnits && mountItem.rackUnits > 0) {
        newParent.rackUnits = mountItem.rackUnits;
      }
    }
  }

  if (sw.needsExternalPsu && sw.psuSku && POWER_SUPPLY_CATALOG[sw.psuSku]) {
    const psu = POWER_SUPPLY_CATALOG[sw.psuSku];
    projectBOM.push({
      instanceId: `psu-ext-${instanceId}`,
      parentInstanceId: instanceId,
      id: psu.sku,
      model: `Primary Power Supply: ${psu.name}`,
      sku: psu.sku,
      role: "Power Supply",
      vendor: sw.vendor,
      msrp: psu.msrp,
      poeBudget: 0,
      baseWatts: 0,
      qty: 1
    });
  }

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
          msrp: 19
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
          msrp: 19
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
        msrp: 29
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
        msrp: 58
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
        msrp: 49
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
        qty: sw.qty || 1
      });
    }
  }
}

function updateStackedCount(instanceId, count) {
  const item = projectBOM.find(i => i.instanceId === instanceId);
  if (!item) return;

  const val = parseInt(count, 10) || 0;
  if (val >= 2) {
    item.canStack = true;
    item.stackedUnits = val;
    item.qty = Math.max(item.qty || 1, val);
    item.uplinkMode = "lag_dual";
    item.customLinkMultiplier = Math.max(item.customLinkMultiplier || 1, val);
  } else {
    item.stackedUnits = 0;
  }

  if (typeof PortEngine !== "undefined") {
    PortEngine.initSwitchPorts(item, true);
  }

  applyStackCabling(item);
  FacilityStore.notifyWorkspaceChange();
  updateBOMView();
}

function applyStackCabling(item) {
  const baseCableSku = item.stackCableSku || "STACK-DAC-1M";
  projectBOM = projectBOM.filter(i => !(i.role === "Stacking Cable" && i.parentInstanceId === item.instanceId));
  projectBOM = projectBOM.filter(i => !(i.source === "stack_patch_panel" && i.parentInstanceId === item.instanceId));
  projectBOM = projectBOM.filter(i => !(i.source === "stack_cable_manager" && i.parentInstanceId === item.instanceId));

  if (item.stackedUnits >= 2) {
    const baseRU = parseInt(item.rackUnits, 10) || 1;
    const interleaveU = (item.patchPanelBetween ? item.stackedUnits - 1 : 0) + (item.cableManagerBetween ? item.stackedUnits - 1 : 0);
    const stackSpanU = ((item.stackedUnits - 1) * baseRU) + interleaveU;

    // Stack cable length dynamically adjusted for member U-span
    let stackCableLen = "0.5m";
    if (stackSpanU >= 7) stackCableLen = "2m";
    else if (stackSpanU >= 3) stackCableLen = "1m";

    let resolvedSku = baseCableSku;
    let resolvedName = `${item.vendor} Dedicated Hardware Stacking Cable (${stackCableLen} • ${stackSpanU}U Stack Span)`;
    let resolvedMsrp = 180;
    if (typeof formatDacItem === "function") {
      const fmt = formatDacItem(baseCableSku, `${item.vendor} Dedicated Hardware Stacking Cable`, 180, stackCableLen, "40G", item.vendor);
      resolvedSku = fmt.sku;
      resolvedName = `${fmt.name} (${item.closetName || 'Rack'} • ${stackSpanU}U Stack Span)`;
      resolvedMsrp = fmt.msrp;
    }

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
      qty: item.stackedUnits
    });

    if (item.patchPanelBetween) {
      projectBOM.push({
        instanceId: `stack-pp-${item.instanceId}`,
        parentInstanceId: item.instanceId,
        source: "stack_patch_panel",
        id: `${item.id}-stack-pp`,
        model: `1U 24-Port High-Density Modular Keystone Patch Panel (In-Stack Interleave)`,
        sku: "PP-1U-24P-MOD",
        role: "Structured Cabling",
        category: "Infrastructure",
        vendor: "Panduit",
        msrp: 68,
        rackUnits: 1,
        ports: 24,
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

  const stackMultiplier = (item.stackedUnits && item.stackedUnits >= 2) ? item.stackedUnits : 1;
  const switchPorts = (parseInt(item.ports, 10) || 24);
  const patchCordQty = switchPorts * stackMultiplier;
  const panelQty = 2 * stackMultiplier; // 1 above + 1 below per switch unit

  // 1. Add Upper and Lower 24-Port Modular Keystone Patch Panels
  projectBOM.push({
    instanceId: `pod-pp-${item.instanceId}`,
    parentInstanceId: item.instanceId,
    source: "switch_standard_pod",
    id: `${item.id}-pod-pp`,
    model: `1U 24-Port High-Density Modular Keystone Patch Panel (Standard Pod: Above & Below)`,
    sku: "PP-1U-24P-MOD",
    role: "Structured Cabling",
    category: "Infrastructure",
    vendor: "Panduit",
    msrp: 68,
    rackUnits: 1,
    ports: 24,
    poeBudget: 0,
    baseWatts: 0,
    closetName: item.closetName,
    rackId: item.rackId,
    qty: panelQty
  });

  // 2. Add 6-Inch Cat6A Slim Patch Cords
  projectBOM.push({
    instanceId: `pod-patch-cables-${item.instanceId}`,
    parentInstanceId: item.instanceId,
    source: "switch_standard_pod",
    id: `${item.id}-pod-patch-cables`,
    model: `Cat6A 28AWG Slim High-Density Patch Cord (6-Inch / 0.5-Foot, Blue)`,
    sku: "C6A-SLIM-6IN-BL",
    role: "Structured Cabling",
    category: "Infrastructure",
    vendor: "Panduit",
    msrp: 6.20,
    rackUnits: 0,
    lengthFt: 0.5,
    poeBudget: 0,
    baseWatts: 0,
    closetName: item.closetName,
    rackId: item.rackId,
    qty: patchCordQty
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
// Dynamic Auto-Uplinks
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
  projectBOM = projectBOM.filter(i => i.role !== "Uplink Interconnect");

  let dacCount = 0;
  let opticPairsCount = 0;
  let highestSpeedResolved = "10G";

  accessSwitches.forEach(sw => {
    sw.uplinkTargetId = core.instanceId;

    const isDual = sw.uplinkMode === "lag_dual" || sw.stackedUnits >= 2;
    const linksNeeded = isDual ? 2 : 1;

    let accessUplinkSpeed = "10G";
    const attachedSled = projectBOM.find(i => i.parentInstanceId === sw.instanceId && i.role === "Uplink Module");
    const sledData = attachedSled ? (MODULAR_UPLINK_CATALOG[attachedSled.id] || MODULAR_UPLINK_CATALOG[attachedSled.sku]) : null;

    if (sledData) {
      accessUplinkSpeed = sledData.speed;
    } else if (sw.portSpeed === "25G" || (sw.uplinksSummary && sw.uplinksSummary.includes("25G"))) {
      accessUplinkSpeed = "25G";
    } else if (sw.portSpeed === "100G" || (sw.uplinksSummary && sw.uplinksSummary.includes("100G"))) {
      accessUplinkSpeed = "100G";
    } else if (sw.maxBackboneSpeed && sw.maxBackboneSpeed !== "100G") {
      accessUplinkSpeed = sw.maxBackboneSpeed;
    }

    const coreSpeed = core.maxBackboneSpeed || "10G";

    let linkSpeed = "10G";
    if (accessUplinkSpeed === "100G" && coreSpeed === "100G") {
      linkSpeed = "100G";
    } else if ((accessUplinkSpeed === "25G" || accessUplinkSpeed === "100G") && (coreSpeed === "25G" || coreSpeed === "100G")) {
      linkSpeed = "25G";
    } else if (accessUplinkSpeed === "1G" || coreSpeed === "1G") {
      linkSpeed = "1G";
    }
    highestSpeedResolved = linkSpeed;

    const isSameCloset = (sw.closetName || "IDF-1 • Rack-1").trim().toUpperCase() === (core.closetName || "MDF • Rack-1").trim().toUpperCase();

    if (isSameCloset) {
      const dacData = OPTICS_CATALOG[sw.vendor]?.[linkSpeed]?.["dac"] || OPTICS_CATALOG["Meraki"]?.[linkSpeed]?.["dac"] || OPTICS_CATALOG["UniFi"]?.[linkSpeed]?.["dac"];
      if (dacData) {
        projectBOM.push({
          instanceId: `uplink-dac-${sw.instanceId}`,
          parentInstanceId: sw.instanceId,
          id: dacData.sku,
          model: `${sw.vendor} ${linkSpeed} Direct Attach Copper (DAC) Cable ${isDual ? '(2x LACP Bundle)' : '(Single Link)'}`,
          sku: dacData.sku,
          role: "Uplink Interconnect",
          vendor: sw.vendor,
          msrp: dacData.msrp,
          poeBudget: 0,
          baseWatts: 0,
          qty: linksNeeded
        });
        dacCount += linksNeeded;
      }
    } else {
      const medium = "smf";
      let opticData = OPTICS_CATALOG[sw.vendor]?.[linkSpeed]?.[medium] || OPTICS_CATALOG["Meraki"]?.[linkSpeed]?.[medium] || OPTICS_CATALOG["UniFi"]?.[linkSpeed]?.[medium];

      if (opticData) {
        const transceiversQty = linksNeeded * 2;
        projectBOM.push({
          instanceId: `uplink-opt-${sw.instanceId}`,
          parentInstanceId: sw.instanceId,
          id: opticData.sku,
          model: `${sw.vendor} ${linkSpeed} ${medium.toUpperCase()} Optical Transceiver Pair ${isDual ? '(2x LAG)' : ''} (${sw.closetName} -> ${core.closetName})`,
          sku: opticData.sku,
          role: "Uplink Interconnect",
          vendor: sw.vendor,
          msrp: opticData.msrp,
          poeBudget: 0,
          baseWatts: 2,
          qty: transceiversQty
        });
        opticPairsCount += linksNeeded;
      }
    }
  });

  FacilityStore.notifyWorkspaceChange();
  showToast(`Auto Uplinks resolved at ${highestSpeedResolved}: Added ${dacCount}x DAC cables and ${opticPairsCount * 2}x transceivers.`);
}

function addFirewallToBOM(sku, targetLocation = null) {
  const fw = (typeof CatalogRegistry !== "undefined" && CatalogRegistry.get(sku)) ||
             (typeof FIREWALL_DATABASE !== "undefined" ? FIREWALL_DATABASE.find(f => f.sku === sku || f.id === sku) : null);
  if (!fw) return;

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

function addServerToBOM(serverId, targetLocation = null) {
  const srv = (typeof CatalogRegistry !== "undefined" && typeof CatalogRegistry.get === "function" ? CatalogRegistry.get(serverId) : null) ||
              (typeof SERVERS_DATABASE !== "undefined" ? SERVERS_DATABASE : []).find(s => s.id === serverId || s.sku === serverId);
  if (!srv) return;

  const instanceId = `srv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  let assignedLoc = (typeof FacilityStore !== "undefined") ? FacilityStore.UNASSIGNED : "Unassigned";
  if (targetLocation && targetLocation !== "new_location") {
    assignedLoc = typeof FacilityStore !== "undefined" ? FacilityStore.normalize(targetLocation) : targetLocation;
  } else if (typeof FacilityStore !== "undefined") {
    const locs = FacilityStore.getLocationNames(false);
    if (locs.length > 0) {
      assignedLoc = locs.find(l => l.includes("MDF")) || locs[0];
    }
  }

  projectBOM.push({
    instanceId: instanceId,
    id: srv.id,
    model: srv.model,
    sku: srv.sku,
    role: "Server",
    serverType: srv.serverType || "vms_recording",
    vendor: srv.vendor,
    msrp: srv.msrp,
    ports: srv.ports || 2,
    portSpeed: srv.portSpeed || "10G",
    maxBackboneSpeed: srv.portSpeed || "10G",
    baseWatts: srv.baseWatts || 300,
    maxPowerWatts: srv.maxPowerWatts || 500,
    rackUnits: srv.rackUnits || 2,
    depthInches: srv.depthInches || 28,
    dualPsu: srv.dualPsu !== false,
    qty: 1,
    closetName: assignedLoc,
    rackId: assignedLoc,
    rackSlot: null,
    rackU: null,
    isDinMounted: false,
    hostedRoles: [...(srv.hostedRoles || ["VMS Ingest & Recording"])],
    maxIngestBandwidthMbps: srv.maxIngestBandwidthMbps || 750,
    powerSource: "dual_ac",
    uplinkTargetId: null
  });

  FacilityStore.notifyWorkspaceChange();
  showToast(`Added ${srv.model} to ${assignedLoc}`);
}

function addCameraToBOM(cameraId, targetLocation = null, uplinkTargetId = null) {
  const cam = (typeof CatalogRegistry !== "undefined" && typeof CatalogRegistry.get === "function" ? CatalogRegistry.get(cameraId) : null) ||
              (typeof CAMERAS_DATABASE !== "undefined" ? CAMERAS_DATABASE : []).find(c => c.id === cameraId || c.sku === cameraId);
  if (!cam) return;

  const instanceId = `cam-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
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
    powerConsumptionWatts: cam.powerConsumptionWatts || 8,
    maxPowerWatts: cam.maxPowerWatts || 15,
    poeStandard: cam.poeStandard || "802.3af",
    streamBitrateMbps: cam.streamBitrateMbps || 4.0,
    resolution: cam.resolution || "2MP",
    qty: 1,
    closetName: assignedLoc,
    rackId: assignedLoc,
    rackSlot: null,
    rackU: null,
    isDinMounted: false,
    mountMethod: assignedLoc.toLowerCase().includes("pole") ? "pole" : ((cam.formFactor === "dome" || cam.dome) ? "ceiling" : "wall"),
    uplinkTargetId: targetSwitchId,
    assignedRecordingServerId: null
  };

  const defs = (typeof StorageService !== "undefined" && typeof StorageService.getProjectDefaults === "function")
    ? StorageService.getProjectDefaults()
    : null;

  if (defs && defs.vms && defs.vms.promptAnalytics) {
    const hasAI = cam.deepLearningAnalytics || (cam.keyFeatures && cam.keyFeatures.some(f => /deep learning|dlpu|artpec|analytics|iva|object classification|ngva/i.test(f)));
    if (hasAI) {
      newCam.videoAnalyticsEnabled = true;
      newCam.analyticsProfile = cam.vendor === "Axis Communications"
        ? "Axis Object Analytics (AOA - DLPU)"
        : (cam.vendor === "Hanwha Vision"
            ? "Hanwha AI Object Detection (Person/Vehicle/Face)"
            : (cam.vendor === "Bosch"
                ? "Bosch IVA Pro Buildings"
                : (cam.vendor === "Avigilon" ? "Avigilon Next-Gen Video Analytics (NGVA)" : "AI Video Analytics")));
    }
  }

  projectBOM.push(newCam);

  if (typeof PortEngine !== "undefined") {
    PortEngine.initDeviceInterfaces(newCam);
    if (targetSwitchId) {
      const sw = projectBOM.find(i => i.instanceId === targetSwitchId);
      if (sw) PortEngine.allocatePort(sw, newCam);
    } else {
      PortEngine.autoAssignDeviceToClosetSwitch(newCam, assignedLoc);
    }
  }

  FacilityStore.notifyWorkspaceChange();
  if (newCam.videoAnalyticsEnabled) {
    showToast(`Added ${cam.model} (${newCam.analyticsProfile})`);
  } else {
    showToast(`Added ${cam.model} to quote`);
  }
}

function addAccessDeviceToBOM(accessId, targetLocation = null, uplinkTargetId = null) {
  const dev = (typeof CatalogRegistry !== "undefined" && typeof CatalogRegistry.get === "function" ? CatalogRegistry.get(accessId) : null) ||
              (typeof ACCESS_CONTROL_DATABASE !== "undefined" ? ACCESS_CONTROL_DATABASE : []).find(a => a.id === accessId || a.sku === accessId);
  if (!dev) return;

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

function addWirelessToBOM(radioId, isMatchedPair = false) {
  const radio = (typeof CatalogRegistry !== "undefined" && typeof CatalogRegistry.get === "function" ? CatalogRegistry.get(radioId) : null) ||
                (typeof WIRELESS_DATABASE !== "undefined" ? WIRELESS_DATABASE : []).find(r => r.id === radioId || r.sku === radioId);
  if (!radio) return;

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
    projectBOM.filter(i => i.parentInstanceId === instanceId && i.role !== "Stacking Cable" && i.role !== "Uplink Interconnect").forEach(child => {
      child.qty = item.qty;
    });
    applyStackCabling(item);
    if (typeof PortEngine !== "undefined" && (item.canStack || item.ports)) {
      PortEngine.initSwitchPorts(item, true);
    }
  }

  FacilityStore.notifyWorkspaceChange();
}

function changeBomUplinkModule(parentInstanceId, newModuleSku) {
  if (!parentInstanceId || typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) return;
  const parent = projectBOM.find(i => i.instanceId === parentInstanceId);
  if (!parent) return;

  const existingIdx = projectBOM.findIndex(i => i.parentInstanceId === parentInstanceId && i.role === "Uplink Module");

  if (!newModuleSku || newModuleSku === "none") {
    if (existingIdx !== -1) {
      projectBOM.splice(existingIdx, 1);
    }
  } else if (typeof MODULAR_UPLINK_CATALOG !== "undefined" && MODULAR_UPLINK_CATALOG[newModuleSku]) {
    const mod = MODULAR_UPLINK_CATALOG[newModuleSku];
    if (existingIdx !== -1) {
      projectBOM[existingIdx].id = mod.sku;
      projectBOM[existingIdx].model = mod.name;
      projectBOM[existingIdx].sku = mod.sku;
      projectBOM[existingIdx].msrp = mod.msrp;
      projectBOM[existingIdx].qty = parent.qty || 1;
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
        qty: parent.qty || 1
      });
    }
  }

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
  FacilityStore.notifyWorkspaceChange();
  showToast("Project BOM reset.");
}

function toggleBomModal() {
  const modal = document.getElementById("bomModal");
  const drawer = document.getElementById("bomDrawer");
  if (!modal) return;
  const isOpening = modal.classList.contains("hidden");
  if (isOpening) {
    const openModals = ["facilityModal", "cableLayoutModal", "topologyModal", "portMatrixStudioModal", "rackElevationModal", "licenseModal", "projectHealthModal"];
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
  if (typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) {
    projectBOM.forEach(item => {
      enrichBOMItemFromCatalog(item);
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
    totalUnits += item.qty;
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
    if (window.lucide) { try { lucide.createIcons(); } catch(e) {} }
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
    if (window.lucide) { try { lucide.createIcons(); } catch(e) {} }
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

  if (window.lucide) {
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
  const pwrBadge = (typeof PortEngine !== "undefined" && PortEngine.POWER_MODES && PortEngine.POWER_MODES[pwr]) ? PortEngine.POWER_MODES[pwr] : null;
  const childItems = projectBOM.filter(ch => ch.parentInstanceId === item.instanceId);

  const catSw = (item.modularUplink ? item : null) || 
    (typeof CatalogRegistry !== "undefined" && typeof CatalogRegistry.getSwitch === "function" ? CatalogRegistry.getSwitch(item.id || item.sku) : null) ||
    (typeof CatalogRegistry !== "undefined" && typeof CatalogRegistry.get === "function" ? CatalogRegistry.get(item.id || item.sku) : null) ||
    (typeof SWITCH_DATABASE !== "undefined" ? SWITCH_DATABASE.find(s => s.id === item.id || s.sku === item.sku) : null);
  const hasModularBay = !!(catSw && catSw.modularUplink && catSw.modularUplink.hasSlot);
  const attachedSled = childItems.find(ch => ch.role === "Uplink Module");
  const otherChildItems = hasModularBay ? childItems.filter(ch => ch.role !== "Uplink Module") : childItems;

  const totalItemCost = (item.msrp || 0) * (item.qty || 1);
  const isStackable = item.canStack || item.role === "Access" || item.role === "Aggregation";
  const isStack = isStackable && item.stackedUnits >= 2;

  const uPosition = item.uPosition || (item.startU ? `U${item.startU}${item.heightU > 1 ? `-U${item.startU + item.heightU - 1}` : ''}` : null);
  const mountLabel = item.mountMethod ? formatMountMethodLabel(item.mountMethod) : null;

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
                      <span class="text-[10px] text-slate-400 font-mono">Installed: <span class="text-slate-200 font-semibold">${escapeHTML(attachedSled.sku)}</span></span>
                    ` : `
                      <span class="text-[10px] text-amber-400/90 font-mono">No module installed</span>
                    `}
                  </div>
                  ${attachedSled ? `
                    <span class="font-mono text-emerald-400 font-semibold text-xs">$${((attachedSled.msrp || 0) * (attachedSled.qty || 1)).toLocaleString()}</span>
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
              data-previous-val="${currentLocationKey}" 
              class="w-full max-w-[210px] bg-slate-900 border border-slate-700/80 text-slate-200 text-xs font-semibold rounded-lg px-2 py-1 focus:outline-none focus:border-brand-500 truncate cursor-pointer shadow-sm" 
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
                onclick="toggleBomModal(); openRackViewerFor('${item.closetName || item.rackId}')"
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
                    class="px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all flex items-center gap-1 border ${item.patchPanelBetween ? 'bg-purple-900/80 text-purple-200 border-purple-500 hover:bg-purple-800' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'}"
                    title="${item.patchPanelBetween ? 'Remove 24-port patch panel between stacked switches' : 'Place 24-port patch panel in between stacked switches'}"
                  >
                    <i data-lucide="${item.patchPanelBetween ? 'check-square' : 'plus-square'}" class="w-2.5 h-2.5 ${item.patchPanelBetween ? 'text-purple-400' : 'text-slate-400'}"></i>
                    <span>${item.patchPanelBetween ? '24P Patch In-Between' : '+ 24P Patch'}</span>
                  </button>
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
              <div class="text-sm font-mono font-bold text-emerald-400 tracking-tight">$${totalItemCost.toLocaleString()}</div>
              <div class="text-[10px] text-slate-400 font-mono">($${(item.msrp || 0).toLocaleString()} ea)</div>
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
          <!-- Jump to Topology -->
          <button 
            type="button" 
            onclick="toggleBomModal(); jumpToTopologyTarget('node:${item.instanceId}')" 
            class="p-1.5 rounded-lg bg-slate-900 hover:bg-indigo-950/80 border border-slate-800 hover:border-indigo-800/60 text-slate-400 hover:text-indigo-300 transition-colors cursor-pointer"
            title="Inspect ports, wire speeds, and logical uplinks in Topology"
          >
            <i data-lucide="network" class="w-3.5 h-3.5"></i>
          </button>

          <!-- Jump to Physical Blueprint -->
          <button 
            type="button" 
            onclick="toggleBomModal(); jumpToPhysicalLayoutTarget('${item.instanceId}')" 
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
    projectBOM.filter(ch => ch.parentInstanceId === it.instanceId).forEach(ch => {
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
        onclick="toggleBomLocationCollapse('${escapeHTML(locKey)}')" 
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
              onclick="event.stopPropagation(); toggleBomModal(); openRackViewerFor('${escapeHTML(locKey)}')" 
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
                <th class="py-2.5 px-4 font-bold w-[16%]">Pricing & Qty</th>
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
    projectBOM.filter(ch => ch.parentInstanceId === it.instanceId).forEach(ch => {
      catCost += (ch.msrp || 0) * (ch.qty || 1);
      catWatts += (ch.baseWatts || 0) * (ch.qty || 1);
    });
  });

  const isCollapsed = bomCollapsedLocations.has(catKey);

  return `
    <div class="bg-slate-950/90 rounded-2xl border border-slate-800 overflow-hidden shadow-sm transition-all">
      <!-- Accordion Header Banner -->
      <div 
        onclick="toggleBomLocationCollapse('${escapeHTML(catKey)}')" 
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
                <th class="py-2.5 px-4 font-bold w-[16%]">Pricing & Qty</th>
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
          <span class="font-mono text-[11px] truncate max-w-sm" title="${escapeHTML(locSummary)}">${escapeHTML(locSummary)}</span>
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
            <button onclick="changeRawSkuQty('${escapeHTML(skuItem.sku)}', -1)" class="px-2 py-1 text-slate-400 hover:text-white font-bold transition-colors text-xs cursor-pointer" title="Decrease Total Quantity">-</button>
            <span class="px-2 text-xs font-mono font-bold text-white min-w-[24px] text-center">${skuItem.rawQty}</span>
            <button onclick="changeRawSkuQty('${escapeHTML(skuItem.sku)}', 1)" class="px-2 py-1 text-slate-400 hover:text-white font-bold transition-colors text-xs cursor-pointer" title="Increase Total Quantity">+</button>
          </div>
        </div>
      </td>

      <td class="py-3 px-4 align-top text-right">
        <button onclick="deleteRawSkuFromBOM('${escapeHTML(skuItem.sku)}')" class="text-slate-500 hover:text-rose-400 p-1.5 transition-colors rounded-lg hover:bg-slate-900 cursor-pointer" title="Delete all units of this SKU">
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
            <div class="bg-slate-900 p-3 rounded-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <span class="font-bold text-white truncate">${dev.model}</span>
                  <span class="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 border border-slate-700 text-slate-400 font-mono">${dev.vendor}</span>
                </div>
                <span class="text-[10px] text-slate-400 font-mono">${dev.qty}x units &bull; Location: [${locationLabel}]</span>
              </div>

              <div class="flex flex-wrap items-center gap-3">
                <select onchange="updateSwitchMgmtProfile('${dev.instanceId}', this.value)" class="bg-slate-950 border border-slate-700 text-purple-300 font-semibold rounded px-2.5 py-1 text-xs focus:outline-none focus:border-purple-500">
                  ${Object.entries(vendorProfiles).map(([pKey, pData]) => `
                    <option value="${pKey}" ${activeKey === pKey ? 'selected' : ''}>${pData.name}</option>
                  `).join('')}
                  ${dev.vendor !== "Meraki" ? `
                    <option value="standalone" ${activeKey === 'standalone' ? 'selected' : ''}>Standalone / Air-Gapped CLI ($0)</option>
                  ` : ''}
                </select>

                ${deviceSupportedTerms.length > 1 ? `
                  <div class="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                    ${deviceSupportedTerms.map(t => `
                      <button onclick="setIndividualDeviceTerm('${dev.instanceId}', '${t}')" class="px-1.5 py-0.5 text-[10px] font-mono rounded font-bold ${dev.individualTerm === t || (!dev.individualTerm && globalSelectedTerm === t) ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}">
                        ${t}
                      </button>
                    `).join('')}
                  </div>
                ` : ''}

                <div class="w-24 text-right font-mono text-emerald-400 font-bold text-xs">
                  ${currentMgmtItem ? `$${(currentMgmtItem.msrp * currentMgmtItem.qty).toLocaleString()}` : '$0'}
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  if (window.lucide) {
    try { lucide.createIcons(); } catch(e) {}
  }
}

function setGlobalTerm(term) {
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

  let csv = "Device ID,Friendly Name,Location,Rack,Role,Vendor,Model,SKU,Quantity,Uplink Mode,Unit MSRP,Total MSRP,PoE Budget,Power Watts\n";
  projectBOM.forEach(i => {
    const rawLoc = i.closetName || i.rackId || FacilityStore.UNASSIGNED;
    const normalizedLoc = typeof FacilityStore !== "undefined" ? FacilityStore.normalize(rawLoc) : rawLoc;
    const parsed = typeof FacilityStore !== "undefined" ? FacilityStore.parse(normalizedLoc) : { space: "General", enclosure: "General" };
    const totalW = ((i.poeBudget || 0) + (i.baseWatts || 0)) * i.qty;
    const devNum = i.deviceNumber || "";
    const friendly = (typeof DeviceTaxonomy !== "undefined" ? DeviceTaxonomy.getFriendlyName(i) : (i.friendlyName || i.model)) || "";
    csv += `"${devNum}","${friendly}","${parsed.space}","${parsed.enclosure}","${i.role || 'Accessory'}","${i.vendor}","${i.model}","${i.sku}",${i.qty},"${i.uplinkMode || 'single'}",${i.msrp},${i.msrp * i.qty},${i.poeBudget || 0},${totalW}\n`;
  });
  const link = document.createElement("a");
  link.href = "data:text/csv;charset=utf-8," + encodeURI(csv);
  link.download = `Security_Infrastructure_BOM_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
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
  if (typeof facilityFloors !== "undefined" && Array.isArray(facilityFloors)) {
    facilityFloors.forEach(fl => {
      (fl.nodes || []).forEach(n => {
        if (n.type !== "closet") {
          const target = n.assignedCloset || n.closetId || "MDF";
          dropMap[target] = (dropMap[target] || 0) + 1;
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
    const estFootage = drops * 150;

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
  const esc = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

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

function openEngineeringSubmittalModal() {
  if (projectBOM.length === 0) {
    showToast("Cannot generate engineering submittal for an empty BOM.");
    return;
  }

  const modal = document.getElementById("engineeringSubmittalModal");
  const content = document.getElementById("engineeringSubmittalModalContent");
  if (!modal || !content) return;

  const data = compileProjectEngineeringData();

  // Helper to render subsystem table
  const renderSubsystemSection = (title, icon, items) => {
    if (!items || items.length === 0) return "";
    let subtotalCost = 0;
    let subtotalWatts = 0;
    items.forEach(it => {
      subtotalCost += (it.msrp || 0) * (it.qty || 1);
      subtotalWatts += ((it.baseWatts || it.powerWatts || 0) + (it.poeBudget || 0)) * (it.qty || 1);
    });

    const rows = items.map((i, idx) => {
      const rawLoc = i.closetName || i.rackId || FacilityStore.UNASSIGNED;
      const normalizedLoc = typeof FacilityStore !== "undefined" ? FacilityStore.normalize(rawLoc) : rawLoc;
      const devNum = i.deviceNumber || `DEV-${idx + 1}`;
      const friendly = (typeof DeviceTaxonomy !== "undefined" ? DeviceTaxonomy.getFriendlyName(i) : (i.friendlyName || i.model)) || "";
      const itemW = ((i.baseWatts || i.powerWatts || 0) + (i.poeBudget || 0)) * (i.qty || 1);
      const extCost = (i.msrp || 0) * (i.qty || 1);
      const asset = (typeof CATALOG_ASSETS !== "undefined" ? (CATALOG_ASSETS[i.id] || CATALOG_ASSETS[i.sku]) : null) || {};
      const img = i.image || asset.image;
      const dsheet = i.datasheetPath || asset.datasheetPath;

      return `
        <tr class="border-b border-slate-800/60 hover:bg-slate-850/40 text-xs">
          <td class="py-2 px-3 font-mono text-slate-400">${idx + 1}</td>
          <td class="py-2 px-3 font-mono text-indigo-400 font-semibold">${escapeHTML(devNum)}</td>
          <td class="py-2 px-3">
            <div class="flex items-center gap-2.5">
              ${img ? `
                <img src="${img}" alt="${escapeHTML(i.model)}" class="w-10 h-7 object-contain bg-slate-900 border border-slate-800 rounded p-0.5 shrink-0 cursor-pointer hover:border-brand-500/50 print:border-slate-300" onclick="if(typeof openProductImageModal==='function') openProductImageModal('${img}', '${escapeHTML(i.model)}', '${escapeHTML(i.sku)}')" title="Click to view full photo" loading="lazy" />
              ` : ''}
              <div>
                <div class="font-bold text-white flex items-center gap-1.5 flex-wrap">
                  <span>${escapeHTML(i.vendor || '')} ${escapeHTML(i.model || '')}</span>
                  ${dsheet ? `
                    <button onclick="if(typeof openDatasheetModal==='function') openDatasheetModal('${dsheet}', '${escapeHTML(i.model)}', '${escapeHTML(i.sku)}')" class="inline-flex items-center gap-0.5 text-[10px] text-rose-400 hover:text-rose-300 font-normal underline ml-1 cursor-pointer print:hidden" title="View Technical Datasheet">
                      <i data-lucide="file-text" class="w-2.5 h-2.5"></i> Datasheet
                    </button>
                  ` : ''}
                </div>
                <div class="text-[11px] text-slate-400">${escapeHTML(friendly)}</div>
              </div>
            </div>
          </td>
          <td class="py-2 px-3 font-mono text-slate-400 text-[11px]">${escapeHTML(i.sku)}</td>
          <td class="py-2 px-3 text-slate-300 text-[11px]">${escapeHTML(normalizedLoc)}</td>
          <td class="py-2 px-3 text-center font-bold font-mono text-white">${i.qty || 1}</td>
          <td class="py-2 px-3 text-right font-mono text-slate-300">$${(i.msrp || 0).toLocaleString()}</td>
          <td class="py-2 px-3 text-right font-mono font-bold text-emerald-400">$${extCost.toLocaleString()}</td>
          <td class="py-2 px-3 text-right font-mono text-amber-400">${itemW} W</td>
        </tr>
      `;
    }).join("");

    return `
      <div class="space-y-2 pt-4 print-avoid-break">
        <div class="flex items-center justify-between pb-1 border-b border-slate-800">
          <h4 class="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <i data-lucide="${icon}" class="w-4 h-4 text-brand-400"></i> ${escapeHTML(title)} (${items.length} Lines)
          </h4>
          <span class="text-xs font-mono text-slate-400">Subtotal: <strong class="text-emerald-400 font-semibold">$${subtotalCost.toLocaleString()}</strong> &bull; <strong class="text-amber-400 font-semibold">${subtotalWatts} W</strong></span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left submittal-table">
            <thead>
              <tr class="text-[10px] uppercase font-bold text-slate-400 bg-slate-950/80 border-b border-slate-800">
                <th class="py-2 px-3">#</th>
                <th class="py-2 px-3">Device ID</th>
                <th class="py-2 px-3">Equipment / Model</th>
                <th class="py-2 px-3">Part / SKU</th>
                <th class="py-2 px-3">Location / Space</th>
                <th class="py-2 px-3 text-center">Qty</th>
                <th class="py-2 px-3 text-right">Unit MSRP</th>
                <th class="py-2 px-3 text-right">Ext MSRP</th>
                <th class="py-2 px-3 text-right">Power</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </div>
      </div>
    `;
  };

  const totalDrops = data.cablingSchedule.reduce((a, c) => a + c.drops, 0);
  const totalPanels = data.cablingSchedule.reduce((a, c) => a + c.totalPanels, 0);

  content.innerHTML = `
    <div class="max-w-5xl mx-auto space-y-6">
      
      <!-- Executive Header & Metadata -->
      <div class="p-6 rounded-2xl bg-slate-950/90 border border-slate-800 submittal-header-bg flex flex-col md:flex-row items-start md:items-center justify-between gap-4 print-avoid-break">
        <div>
          <div class="flex items-center gap-2 text-[11px] font-bold tracking-widest uppercase text-brand-400 mb-1">
            <span>ORION SECURITY SOLUTIONS</span> &bull; <span>SYSTEM DESIGN TOOL v0.10.0-ALPHA</span>
          </div>
          <h1 class="text-xl sm:text-2xl font-black text-white tracking-tight">ENGINEERING SUBMITTAL & SYSTEM PROPOSAL</h1>
          <p class="text-xs text-slate-400 mt-0.5">Comprehensive Hardware Bill of Materials, Closet Utilization, PoE Headroom, and Cabling Schedules.</p>
        </div>
        <div class="grid grid-cols-2 gap-x-6 gap-y-1 text-xs border-t md:border-t-0 md:border-l border-slate-800 pt-3 md:pt-0 md:pl-6 shrink-0 font-mono">
          <div class="text-slate-400">Project:</div>
          <div class="text-white font-bold">${escapeHTML(data.projName)}</div>
          ${data.jobOpportunityNumber ? `<div class="text-slate-400">Job / Opp #:</div><div class="text-amber-400 font-semibold">${escapeHTML(data.jobOpportunityNumber)}</div>` : ''}
          ${data.clientName ? `<div class="text-slate-400">Client / Facility:</div><div class="text-slate-200 font-semibold">${escapeHTML(data.clientName)}</div>` : ''}
          ${data.siteAddress ? `<div class="text-slate-400">Site Location:</div><div class="text-slate-300">${escapeHTML(data.siteAddress)}</div>` : ''}
          ${data.leadDesigner ? `<div class="text-slate-400">Lead Designer:</div><div class="text-sky-400 font-semibold">${escapeHTML(data.leadDesigner)}</div>` : ''}
          <div class="text-slate-400">Doc Reference:</div>
          <div class="text-indigo-400 font-semibold">${escapeHTML(data.projId)}</div>
          <div class="text-slate-400">Licensing Term:</div>
          <div class="text-purple-400 font-semibold">${escapeHTML(data.licensingTerm || "1-Year")}</div>
          <div class="text-slate-400">Date Issued:</div>
          <div class="text-slate-200">${escapeHTML(data.dateStr)}</div>
          <div class="text-slate-400">Revision:</div>
          <div class="text-emerald-400 font-bold">REV 1.0 (PROPOSAL)</div>
        </div>
      </div>

      <!-- Executive KPIs Strip -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 print-avoid-break">
        <div class="p-3 rounded-xl bg-slate-950/70 border border-slate-800 submittal-kpi-card">
          <div class="text-[10px] text-slate-400 font-bold uppercase">Total Hardware</div>
          <div class="text-lg font-black text-white font-mono mt-0.5">${data.totalHardwareUnits} <span class="text-xs font-normal text-slate-500">units</span></div>
        </div>
        <div class="p-3 rounded-xl bg-slate-950/70 border border-slate-800 submittal-kpi-card">
          <div class="text-[10px] text-slate-400 font-bold uppercase">Estimated MSRP</div>
          <div class="text-lg font-black text-emerald-400 font-mono mt-0.5">$${data.totalMSRP.toLocaleString()}</div>
        </div>
        <div class="p-3 rounded-xl bg-slate-950/70 border border-slate-800 submittal-kpi-card">
          <div class="text-[10px] text-slate-400 font-bold uppercase">PoE Capacity</div>
          <div class="text-lg font-black text-amber-400 font-mono mt-0.5">${data.totalPoEBudgetWatts.toLocaleString()} <span class="text-xs font-normal text-slate-500">W</span></div>
        </div>
        <div class="p-3 rounded-xl bg-slate-950/70 border border-slate-800 submittal-kpi-card">
          <div class="text-[10px] text-slate-400 font-bold uppercase">Heat Dissipation</div>
          <div class="text-sm font-black text-rose-400 font-mono mt-1">${data.totalHeatBTU.toLocaleString()} <span class="text-[10px] font-normal text-slate-500">BTU/hr</span></div>
          <div class="text-[10px] text-slate-400 font-mono mt-0.5">${data.totalCoolingTons} AC Tons</div>
        </div>
        <div class="p-3 rounded-xl bg-slate-950/70 border border-slate-800 submittal-kpi-card">
          <div class="text-[10px] text-slate-400 font-bold uppercase">Field Drops</div>
          <div class="text-lg font-black text-sky-400 font-mono mt-0.5">${totalDrops} <span class="text-xs font-normal text-slate-500">runs</span></div>
          <div class="text-[10px] text-slate-400 font-mono">${totalPanels} Patch Panels</div>
        </div>
        <div class="p-3 rounded-xl bg-slate-950/70 border border-slate-800 submittal-kpi-card">
          <div class="text-[10px] text-slate-400 font-bold uppercase">Telecom Spaces</div>
          <div class="text-lg font-black text-purple-400 font-mono mt-0.5">${data.spaces.length} <span class="text-xs font-normal text-slate-500">closets</span></div>
        </div>
      </div>

      <!-- Section 1: Detailed Systems Bill of Materials -->
      <div class="space-y-4">
        <div class="flex items-center gap-2 border-b-2 border-brand-500/40 pb-2">
          <h3 class="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
            <span class="w-6 h-6 rounded-md bg-brand-600 text-white flex items-center justify-center text-xs font-bold">1</span>
            System Bill of Materials & Subsystem Breakdown
          </h3>
        </div>

        ${renderSubsystemSection("Network Switching & Routing", "network", data.categorized.switches)}
        ${renderSubsystemSection("Video Surveillance Cameras", "camera", data.categorized.cameras)}
        ${renderSubsystemSection("Access Control & Door Hardware", "shield", data.categorized.access)}
        ${renderSubsystemSection("Cybersecurity Gateways & Firewalls", "shield-alert", data.categorized.firewalls)}
        ${renderSubsystemSection("Servers, NVRs & Compute", "hard-drive", data.categorized.servers)}
        ${renderSubsystemSection("Structured Cabling & Passive Infrastructure", "cable", data.categorized.cabling)}
        ${renderSubsystemSection("Interconnects, Optics & Fiber Trunks", "link-2", data.categorized.optics)}
        ${renderSubsystemSection("Software Licensing & Cloud Subscriptions", "key", data.categorized.licenses)}
        ${renderSubsystemSection("Rack Accessories & Mounting Hardware", "package", data.categorized.accessories)}

        <div class="p-3 bg-slate-950/90 rounded-xl border border-slate-800 flex justify-between items-center text-sm font-bold font-mono">
          <span class="text-slate-300">TOTAL ESTIMATED HARDWARE MSRP (EXTENDED):</span>
          <span class="text-emerald-400 text-base font-extrabold">$${data.totalMSRP.toLocaleString()}</span>
        </div>
      </div>

      <!-- Section 2: Telecom Closets & Rack Utilization Schedule -->
      <div class="space-y-4 pt-4 print-avoid-break">
        <div class="flex items-center gap-2 border-b-2 border-brand-500/40 pb-2">
          <h3 class="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
            <span class="w-6 h-6 rounded-md bg-brand-600 text-white flex items-center justify-center text-xs font-bold">2</span>
            Telecom Closets & Rack Utilization Schedule
          </h3>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left submittal-table">
            <thead>
              <tr class="text-[10px] uppercase font-bold text-slate-400 bg-slate-950/80 border-b border-slate-800">
                <th class="py-2 px-3">Telecom Closet</th>
                <th class="py-2 px-3">Enclosure / Form Factor</th>
                <th class="py-2 px-3 text-center">Rack Height</th>
                <th class="py-2 px-3 text-center">Occupied / Free</th>
                <th class="py-2 px-3 text-center">Utilization</th>
                <th class="py-2 px-3 text-right">Power Draw</th>
                <th class="py-2 px-3 text-right">Thermal (BTU/hr)</th>
                <th class="py-2 px-3">Mounted Equipment</th>
              </tr>
            </thead>
            <tbody>
              ${data.rackSchedule.map(r => `
                <tr class="border-b border-slate-800/60 hover:bg-slate-850/40 text-xs">
                  <td class="py-2.5 px-3 font-bold text-white">${escapeHTML(r.space)}</td>
                  <td class="py-2.5 px-3">
                    <div class="font-semibold text-indigo-300">${escapeHTML(r.enclosure)}</div>
                    <div class="text-[10px] text-slate-400">${escapeHTML(r.formFactor)}</div>
                  </td>
                  <td class="py-2.5 px-3 text-center font-mono text-slate-300 font-bold">${r.totalU}U</td>
                  <td class="py-2.5 px-3 text-center font-mono text-xs">
                    <span class="text-brand-400 font-bold">${r.occupiedU}U used</span> &bull; <span class="text-slate-400">${r.availableU}U free</span>
                  </td>
                  <td class="py-2.5 px-3 text-center">
                    <div class="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold ${r.utilPct > 85 ? 'bg-rose-950/80 text-rose-400 border border-rose-800' : 'bg-slate-800 text-slate-300'}">
                      ${r.utilPct}%
                    </div>
                  </td>
                  <td class="py-2.5 px-3 text-right font-mono text-amber-400">${r.watts} W</td>
                  <td class="py-2.5 px-3 text-right font-mono text-rose-400">${r.btu.toLocaleString()}</td>
                  <td class="py-2.5 px-3 text-[11px] text-slate-300 max-w-xs truncate" title="${escapeHTML(r.equipment)}">
                    ${escapeHTML(r.equipment || "No active equipment assigned")}
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Section 3: PoE Power Budget & Headroom Telemetry -->
      <div class="space-y-4 pt-4 print-avoid-break">
        <div class="flex items-center gap-2 border-b-2 border-brand-500/40 pb-2">
          <h3 class="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
            <span class="w-6 h-6 rounded-md bg-brand-600 text-white flex items-center justify-center text-xs font-bold">3</span>
            PoE Power Budget & Headroom Telemetry
          </h3>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left submittal-table">
            <thead>
              <tr class="text-[10px] uppercase font-bold text-slate-400 bg-slate-950/80 border-b border-slate-800">
                <th class="py-2 px-3">Telecom Closet</th>
                <th class="py-2 px-3 text-center">Switches</th>
                <th class="py-2 px-3 text-right">Switch PoE Capacity</th>
                <th class="py-2 px-3 text-center">Edge Devices</th>
                <th class="py-2 px-3 text-right">Edge PoE Demand</th>
                <th class="py-2 px-3 text-right">Headroom Margin</th>
                <th class="py-2 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              ${data.poeSchedule.map(p => {
                let badgeClass = "bg-emerald-950 text-emerald-400 border-emerald-800";
                if (p.status.includes("DEFICIT")) badgeClass = "bg-rose-950 text-rose-400 border-rose-800";
                else if (p.status.includes("WARNING")) badgeClass = "bg-amber-950 text-amber-400 border-amber-800";

                return `
                  <tr class="border-b border-slate-800/60 hover:bg-slate-850/40 text-xs">
                    <td class="py-2.5 px-3 font-bold text-white">${escapeHTML(p.space)}</td>
                    <td class="py-2.5 px-3 text-center font-mono text-slate-300">${p.switchCount}</td>
                    <td class="py-2.5 px-3 text-right font-mono font-bold text-amber-400">${p.switchBudget.toLocaleString()} W</td>
                    <td class="py-2.5 px-3 text-center font-mono text-slate-300">${p.edgeCount}</td>
                    <td class="py-2.5 px-3 text-right font-mono font-semibold text-rose-400">${p.edgeDemand.toLocaleString()} W</td>
                    <td class="py-2.5 px-3 text-right font-mono font-bold ${p.headroom >= 0 ? 'text-emerald-400' : 'text-rose-500'}">
                      ${p.headroom >= 0 ? '+' : ''}${p.headroom.toLocaleString()} W
                    </td>
                    <td class="py-2.5 px-3 text-center">
                      <span class="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${badgeClass}">
                        ${escapeHTML(p.status)}
                      </span>
                    </td>
                  </tr>
                `;
              }).join("")}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Section 4: Structured Cabling & Field Drop Schedule -->
      <div class="space-y-4 pt-4 print-avoid-break">
        <div class="flex items-center gap-2 border-b-2 border-brand-500/40 pb-2">
          <h3 class="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
            <span class="w-6 h-6 rounded-md bg-brand-600 text-white flex items-center justify-center text-xs font-bold">4</span>
            Structured Cabling & Field Drop Schedule
          </h3>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left submittal-table">
            <thead>
              <tr class="text-[10px] uppercase font-bold text-slate-400 bg-slate-950/80 border-b border-slate-800">
                <th class="py-2 px-3">Telecom Closet</th>
                <th class="py-2 px-3 text-center">Data Drops</th>
                <th class="py-2 px-3 text-center">48P Panels</th>
                <th class="py-2 px-3 text-center">24P Panels</th>
                <th class="py-2 px-3 text-center">Total Panels</th>
                <th class="py-2 px-3 text-center">Keystones</th>
                <th class="py-2 px-3 text-right">Est. Footage</th>
                <th class="py-2 px-3 text-center">1k' Spools</th>
                <th class="py-2 px-3 text-center">Fiber Trunks</th>
              </tr>
            </thead>
            <tbody>
              ${data.cablingSchedule.map(c => `
                <tr class="border-b border-slate-800/60 hover:bg-slate-850/40 text-xs">
                  <td class="py-2.5 px-3 font-bold text-white">${escapeHTML(c.space)}</td>
                  <td class="py-2.5 px-3 text-center font-mono font-bold text-sky-400">${c.drops}</td>
                  <td class="py-2.5 px-3 text-center font-mono text-slate-300">${c.pp48}</td>
                  <td class="py-2.5 px-3 text-center font-mono text-slate-300">${c.pp24}</td>
                  <td class="py-2.5 px-3 text-center font-mono font-bold text-indigo-400">${c.totalPanels}</td>
                  <td class="py-2.5 px-3 text-center font-mono text-slate-300">${c.keystones}</td>
                  <td class="py-2.5 px-3 text-right font-mono text-slate-300">${c.estFootage.toLocaleString()} ft</td>
                  <td class="py-2.5 px-3 text-center font-mono font-bold text-amber-400">${c.spoolsNeeded}</td>
                  <td class="py-2.5 px-3 text-center font-mono font-bold text-purple-400">${c.fiberLinks}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Section 5: Engineering Submittal Sign-Off & Approvals Block -->
      <div class="space-y-4 pt-6 print-avoid-break">
        <div class="flex items-center gap-2 border-b-2 border-brand-500/40 pb-2">
          <h3 class="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
            <span class="w-6 h-6 rounded-md bg-brand-600 text-white flex items-center justify-center text-xs font-bold">5</span>
            Engineering Verification & Submittal Approval
          </h3>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-4 text-xs">
            <div class="font-bold text-slate-200 uppercase tracking-wider text-[11px] border-b border-slate-800 pb-1.5 flex items-center gap-1.5">
              <i data-lucide="award" class="w-3.5 h-3.5 text-brand-400"></i> Lead Systems Designer
            </div>
            <div class="space-y-2.5 font-mono text-[11px]">
              <div><span class="text-slate-500">Name:</span> ___________________________</div>
              <div><span class="text-slate-500">Signature:</span> ______________________</div>
              <div><span class="text-slate-500">Date:</span> ___________________________</div>
              <div><span class="text-slate-500">Lic / Cert:</span> ______________________</div>
            </div>
          </div>

          <div class="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-4 text-xs">
            <div class="font-bold text-slate-200 uppercase tracking-wider text-[11px] border-b border-slate-800 pb-1.5 flex items-center gap-1.5">
              <i data-lucide="briefcase" class="w-3.5 h-3.5 text-indigo-400"></i> Project Manager / GC
            </div>
            <div class="space-y-2.5 font-mono text-[11px]">
              <div><span class="text-slate-500">Name:</span> ___________________________</div>
              <div><span class="text-slate-500">Signature:</span> ______________________</div>
              <div><span class="text-slate-500">Date:</span> ___________________________</div>
              <div><span class="text-slate-500">Company:</span> ________________________</div>
            </div>
          </div>

          <div class="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-4 text-xs">
            <div class="font-bold text-slate-200 uppercase tracking-wider text-[11px] border-b border-slate-800 pb-1.5 flex items-center gap-1.5">
              <i data-lucide="check-square" class="w-3.5 h-3.5 text-emerald-400"></i> Customer Acceptance / AHJ
            </div>
            <div class="space-y-2.5 font-mono text-[11px]">
              <div><span class="text-slate-500">Name:</span> ___________________________</div>
              <div><span class="text-slate-500">Signature:</span> ______________________</div>
              <div><span class="text-slate-500">Date:</span> ___________________________</div>
              <div><span class="text-slate-500">Title / Auth:</span> ___________________</div>
            </div>
          </div>
        </div>

        <div class="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400">
          <strong class="text-slate-300">Engineering Notes & Field Deviations:</strong>
          <p class="mt-1 font-mono text-slate-500 leading-relaxed">
            All equipment installations shall comply with NFPA 70 (NEC), TIA-568-D structured cabling standards, and local electrical codes. 
            Any field alterations to cabling paths exceeding 295ft (90m) permanent link limits must receive written engineering change approval.
          </p>
        </div>
      </div>

    </div>
  `;

  modal.classList.remove("hidden");
  if (window.lucide && typeof lucide.createIcons === "function") {
    try { lucide.createIcons(); } catch(e) {}
  }
}

function closeEngineeringSubmittalModal() {
  const modal = document.getElementById("engineeringSubmittalModal");
  if (modal) modal.classList.add("hidden");
}

function printEngineeringSubmittal() {
  window.print();
}

function jumpToBomTarget(instanceId) {
  if (typeof NavigationHistory !== "undefined") {
    const st = NavigationHistory.captureCurrentState();
    if (st && st.tool !== "bom") NavigationHistory.push(st);
  }

  // Minimize/hide open modal windows so the user immediately sees the BOM drawer in foreground
  const facilityModal = document.getElementById("facilityModal");
  if (facilityModal && !facilityModal.classList.contains("hidden")) {
    facilityModal.classList.add("hidden");
  }
  const cableModal = document.getElementById("cableLayoutModal");
  if (cableModal && !cableModal.classList.contains("hidden")) {
    cableModal.classList.add("hidden");
  }
  const topoModal = document.getElementById("topologyModal");
  if (topoModal && !topoModal.classList.contains("hidden")) {
    topoModal.classList.add("hidden");
  }
  const pmModal = document.getElementById("portMatrixStudioModal");
  if (pmModal && !pmModal.classList.contains("hidden")) {
    pmModal.classList.add("hidden");
  }

  const modal = document.getElementById("bomModal");
  if (modal && modal.classList.contains("hidden")) {
    toggleBomModal();
  } else {
    const drawer = document.getElementById("bomDrawer");
    if (drawer && drawer.classList.contains("translate-x-full")) {
      toggleBomModal();
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

// Window Compatibility Exports
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
window.openEngineeringSubmittalModal = openEngineeringSubmittalModal;
window.closeEngineeringSubmittalModal = closeEngineeringSubmittalModal;
window.printEngineeringSubmittal = printEngineeringSubmittal;
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

