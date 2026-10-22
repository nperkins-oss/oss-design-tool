// =========================================================================
// APPLICATION MASTER ORCHESTRATOR & TOP-LEVEL DOMAIN ROUTER
// NetSelect Enterprise Architecture (js/core/app.js)
// Single-Page Domain Switcher, Multi-Sizer Pipeline & State Coordinator
// =========================================================================

// Version & Build Information (Single Source of Truth — synced via scripts/bump_version.py)
const APP_VERSION = "0.11.0-beta.1";
const BUILD_NUMBER = "2026.10.13.1230";
const SCHEMA_VERSION = "2.1.0";

function getAppEnvironment() {
  const host = (typeof window !== "undefined" && window.location && window.location.hostname) ? window.location.hostname.toLowerCase() : "";
  if (!host || host === "localhost" || host === "127.0.0.1" || (typeof window !== "undefined" && window.location.protocol === "file:")) {
    return { id: "local", label: "LOCAL DEV", badgeClass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" };
  }
  if (host.includes("staging") || host.includes("-dev") || host.includes("azurestaticapps.net") && APP_VERSION.includes("-")) {
    return { id: "staging", label: "STAGING", badgeClass: "bg-amber-500/15 text-amber-300 border-amber-500/30" };
  }
  return { id: "production", label: "PROD", badgeClass: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30" };
}

function renderVersionBadge() {
  const el = document.getElementById("appVersionBadge");
  if (!el) return;
  const env = getAppEnvironment();
  el.textContent = env.id === "production" ? `v${APP_VERSION}` : `v${APP_VERSION} • ${env.label}`;
  el.title = `OSS Network Design Tool v${APP_VERSION} | Build ${BUILD_NUMBER} | Schema v${SCHEMA_VERSION} (${env.label})`;
  el.className = `text-[10px] font-mono border px-1.5 py-0.5 rounded hidden xl:inline ${env.badgeClass}`;
}

// Active Navigation State
let activeDomain = "networking"; // "networking" | "physical_security" | "compute_storage" | "infrastructure" | "software"
let currentMode = "access";      // Active sub-mode within the domain
let activeSearchQuery = "";
let currentSortMode = "featured";

// Domain Metadata & Sub-Modes
const DOMAIN_DEFINITIONS = {
  networking: {
    label: "Networking",
    icon: "network",
    color: "indigo",
    modes: [
      { id: "access", label: "Access & Edge", icon: "layers" },
      { id: "backbone", label: "Core & Agg", icon: "cpu" },
      { id: "firewalls", label: "Gateways & WAN", icon: "shield" },
      { id: "optics", label: "Optics & DACs", icon: "cable" },
      { id: "wireless", label: "Wireless PtP", icon: "radio" },
      { id: "accessories", label: "Accessories", icon: "wrench" }
    ]
  },
  physical_security: {
    label: "Physical Security",
    icon: "video",
    color: "emerald",
    modes: [
      { id: "cameras", label: "Cameras & Mounts", icon: "camera" },
      { id: "access_control", label: "Access Control & Doors", icon: "door-closed" },
      { id: "power_enclosures", label: "Power & Trove Enclosures", icon: "box" }
    ]
  },
  compute_storage: {
    label: "Compute & Storage",
    icon: "hard-drive",
    color: "purple",
    modes: [
      { id: "servers", label: "VMS & NVR Servers", icon: "server" },
      { id: "storage", label: "Storage Drives & SAN", icon: "database" },
      { id: "workstations", label: "SOC Workstations", icon: "monitor" }
    ]
  },
  infrastructure: {
    label: "Infrastructure",
    icon: "hammer",
    color: "amber",
    modes: [
      { id: "racks", label: "Equipment Racks", icon: "server" },
      { id: "enclosures", label: "Cabinets & Enclosures", icon: "box" },
      { id: "ups", label: "Rack UPS Power", icon: "zap" },
      { id: "pdus", label: "Rackmount PDUs", icon: "power" },
      { id: "power_cords", label: "Power Cords & Jumpers", icon: "plug" },
      { id: "cabling", label: "Structured Cabling", icon: "git-commit" },
      { id: "pathways", label: "Pathways & J-Hooks", icon: "route" }
    ]
  },
  software: {
    label: "Software & Cloud",
    icon: "key",
    color: "sky",
    modes: [
      { id: "vms_software", label: "VMS Channel Licenses", icon: "key" },
      { id: "access_software", label: "Door Credentials & Access", icon: "lock" },
      { id: "os_virtualization", label: "OS & Hypervisor Cores", icon: "terminal" }
    ]
  }
};

// -----------------------------------------------------------
// Performance Utilities (Debounce & Throttling)
// -----------------------------------------------------------
function debounce(func, wait = 150) {
  let timeout;
  const debounced = function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
  debounced.cancel = () => clearTimeout(timeout);
  debounced.flush = (...args) => {
    clearTimeout(timeout);
    return func.apply(this, args);
  };
  return debounced;
}
window.debounce = debounce;

// -----------------------------------------------------------
// Multi-Device Port & PoE Sizing Demand State
// -----------------------------------------------------------
let demandCounts = {
  af: 0,      // Fixed cameras / VoIP (15.4W)
  at: 0,      // PTZ / Access Readers (30W)
  bt60: 0,    // Multi-sensor / Radios (60W)
  bt90: 0     // Heated domes / High-power PTZ (90W)
};
let extraHeadroomPercent = 20;

// Filter States across Domains (Legacy Compatibility Variables)
// 1. Networking Switch Filters
let selectedVendors = [];
let selectedPortCounts = [];
let selectedPoEClasses = [];
let selectedUplinkSpeed = "all";
let requireDemandFit = false;
let requirePerpetualPoE = false;
let requireSubstation = false;
let requirePassThrough = false;
let requireShallowDepth = false;
let requireStacking = false;
let requireDualPsu = false;
let requireTAA = false;
let requireDinMount = false;
let requireMultiGig = false;
let selectedFormFactors = [];
let requireFanless = false;
let requirePoEPowered = false;
let requireDcPower = false;
let requireLayer3 = false;
let selectedSwitchLayers = [];
let requirePoEBt90 = false;
let requireIndustrialHardened = false;
let requireModularUplink = false;

// 2. Firewall / Gateway Filters
let selectedFwCategories = [];
let selectedFwVendors = [];
let fwTargetThroughputGbps = 0;
let fwTargetThreatMbps = 0;
let requireFwCellular = false;
let requireFwDualPsu = false;
let requireFwRackmount = false;
let requireFw10GWan = false;
let requireFwPoePorts = false;
let requireFwHA = false;
let requireFw25GWan = false;
let requireFwStorage = false;

// 3. Optics Filters
let selectedOpticMediums = [];
let selectedOpticSpeeds = [];
let selectedOpticVendors = [];
let selectedOpticFormFactor = "all";
let selectedOpticReach = "all";
let selectedDacLength = "all";
let requireOpticIndustrial = false;
let requireOpticBiDi = false;

// 4. Wireless Filters
let wlTargetDistanceMiles = 0;
let wlTargetThroughputMbps = 0;
let selectedWlTopologyRole = "all";
let selectedCompatibleMasterSku = "all";
let minWlStations = 0;
let selectedWlFrequencies = [];
let selectedWlVendors = [];
let selectedWlRangeTier = "all";
let requireWl60GHz = false;
let requireWlBackup5G = false;

// 5. Infrastructure & Networking Accessories Filters
let selectedAccSubCategory = "all"; // "all" | "mounts" | "media_converters" | "licenses" | "modular_uplinks" | "power_supplies" | "poe_injectors"
let selectedAccVendors = [];
let selectedAccCategories = [];
let selectedAccTypes = [];
let selectedAccMounting = "all";
let accMinPowerWatts = 0;
let requireUpsSineWave = false;
let requireUpsOnline = false;
let requireUpsEbm = false;
let selectedUpsCategory = "all";
let selectedUpsVoltage = "all";
let selectedCableRatings = [];
let selectedPatchCordLength = "all";
let requireCableShielded = false;
let requireEtherlighting = false;

// Power Infrastructure Filters (UPS, PDU, Power Cords)
let selectedUpsInputPlug = "all";
let requireUpsNetworked = false;
let selectedPduNetworkType = "all";
let selectedPduPlugType = "all";
let selectedPduReceptacleType = "all";
let selectedPduMinOutlets = 0;
let requirePduManaged = false;
let requirePduDisplay = false;
let selectedCordPlugType = "all";
let selectedCordLength = "all";
let selectedCordColor = "all";
let selectedCordGauge = "all";
let requireCordLocking = false;

// 6. Camera Filters & Video Storage / Genetec 5.14 Sizer State
let selectedCamVendors = [];
let selectedCamFormFactors = [];
let selectedCamResolutions = [];
let requireCamAnalytics = false;
let requireCamVandal = false;
let requireCamTaa = false;
let videoRetentionDays = 30;
let videoCodec = "H.265";
let videoFps = 15;
let videoMotionDuty = 0.5;
let videoRaidType = "RAID 6";
let videoSourceMode = "auto"; // "auto" | "manual" | "bom"
let videoManualCamCount = 32;
let videoResolutionMp = 4;
let videoSceneActivity = "medium"; // "low" | "medium" | "high" | "ultra"
let videoPreferredDriveTb = 16;
let videoGenetecProfile = "dedicated_300";
let videoArchiverRoles = 0; // 0 = Auto
let videoEncryptionCerts = 0;
let videoSoftwareMotion = false;
let videoShowDetailsPanel = true;

// 7. Access Control Filters & Door Package Builder State
let selectedAcsVendors = [];
let selectedAcsControllerTypes = [];
let selectedAcsPowerSource = "all";
let requireAcsOsdp = false;
let doorPkgPreset = "standard_strike";
let doorPkgQty = 2;

// 8. Compute, Servers & Storage Filters
let selectedSrvVendors = [];
let selectedSrvRackUnits = [];
let minSrvStorageTb = 0;
let requireSrvDualPsu = false;

// -----------------------------------------------------------
// Central Application State Store
// -----------------------------------------------------------
const AppState = {
  get activeDomain() { return activeDomain; },
  set activeDomain(val) { activeDomain = val; },
  get currentMode() { return currentMode; },
  set currentMode(val) { currentMode = val; },
  get searchQuery() { return activeSearchQuery; },
  set searchQuery(val) { activeSearchQuery = val; },
  get sortMode() { return currentSortMode; },
  set sortMode(val) { currentSortMode = val; },
  demandCounts,
  extraHeadroomPercent,
  version: APP_VERSION,
  build: BUILD_NUMBER,
  schemaVersion: SCHEMA_VERSION,
  resetFilters(mode) {
    if (typeof resetCurrentFilters === "function") {
      resetCurrentFilters();
    }
  }
};
window.AppState = AppState;
window.APP_VERSION = APP_VERSION;
window.BUILD_NUMBER = BUILD_NUMBER;
window.SCHEMA_VERSION = SCHEMA_VERSION;
window.getAppEnvironment = getAppEnvironment;
window.renderVersionBadge = renderVersionBadge;

// Debounced filter runner for fast typing response
const debouncedRunActiveFilter = debounce(() => {
  runActiveFilter();
}, 150);

// -----------------------------------------------------------
// Initialization Lifecycle
// -----------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  renderVersionBadge();
  if (typeof StorageService !== "undefined") {
    StorageService.restoreStateFromLocalStorage();
  }

  buildDomainNavigation();
  buildSubModeNavigation();
  buildCalculatorStrip();
  buildSidebarFilters();
  runActiveFilter();

  // Attach immediate key listener to search input
  const searchInput = document.getElementById("filterSearch");
  if (searchInput) {
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        debouncedRunActiveFilter.flush();
      } else if (e.key === "Escape") {
        searchInput.value = "";
        activeSearchQuery = "";
        debouncedRunActiveFilter.flush();
      }
    });
  }

  if (typeof updateBOMView === "function") updateBOMView();
  if (typeof updateProjectHealthUI === "function") updateProjectHealthUI();
  if (typeof updateCompareBadge === "function") updateCompareBadge();
  if (typeof applyProjectFocusMode === "function") applyProjectFocusMode();
  if (typeof renderProjectDefaultsSummary === "function") renderProjectDefaultsSummary();
  safeCreateIcons();
});

// Remember last active sub-mode per domain and isolated per-mode shared filter state
const lastActiveModeByDomain = {
  networking: "access",
  physical_security: "cameras",
  compute_storage: "servers",
  infrastructure: "racks",
  software: "vms_software"
};

const modeFilterState = {};

function saveModeFilterState(mode) {
  if (!mode) return;
  modeFilterState[mode] = {
    selectedAccSubCategory,
    selectedAccVendors: Array.isArray(selectedAccVendors) ? [...selectedAccVendors] : [],
    selectedAccCategories: Array.isArray(selectedAccCategories) ? [...selectedAccCategories] : [],
    selectedAccTypes: Array.isArray(selectedAccTypes) ? [...selectedAccTypes] : [],
    selectedAccMounting,
    accMinPowerWatts,
    selectedUpsVoltage
  };
}

function restoreModeFilterState(mode) {
  if (!mode) return;
  const saved = modeFilterState[mode];
  if (saved) {
    selectedAccSubCategory = saved.selectedAccSubCategory ?? "all";
    window.selectedAccSubCategory = selectedAccSubCategory;
    selectedAccVendors = Array.isArray(saved.selectedAccVendors) ? [...saved.selectedAccVendors] : [];
    selectedAccCategories = Array.isArray(saved.selectedAccCategories) ? [...saved.selectedAccCategories] : [];
    selectedAccTypes = Array.isArray(saved.selectedAccTypes) ? [...saved.selectedAccTypes] : [];
    selectedAccMounting = saved.selectedAccMounting ?? "all";
    accMinPowerWatts = saved.accMinPowerWatts ?? 0;
    selectedUpsVoltage = saved.selectedUpsVoltage ?? "all";
  } else {
    selectedAccSubCategory = "all";
    window.selectedAccSubCategory = "all";
    selectedAccVendors = [];
    selectedAccCategories = [];
    selectedAccTypes = [];
    selectedAccMounting = "all";
    accMinPowerWatts = 0;
    selectedUpsVoltage = "all";
  }
}

// -----------------------------------------------------------
// Master Domain & Sub-Mode Routing
// -----------------------------------------------------------
function switchDomain(domainKey, openTabFlag = true) {
  if (!DOMAIN_DEFINITIONS[domainKey]) return;
  saveModeFilterState(currentMode);

  activeDomain = domainKey;
  window.activeDomain = activeDomain;

  // Restore the last active sub-mode for this domain instead of resetting to modes[0]
  const savedMode = lastActiveModeByDomain[domainKey];
  const validMode = DOMAIN_DEFINITIONS[domainKey].modes.some(m => m.id === savedMode)
    ? savedMode
    : DOMAIN_DEFINITIONS[domainKey].modes[0].id;
  currentMode = validMode;
  window.currentMode = currentMode;
  lastActiveModeByDomain[domainKey] = currentMode;

  restoreModeFilterState(currentMode);

  if (openTabFlag && typeof TabManager !== "undefined") {
    TabManager.openTab("catalog_" + domainKey);
  }

  // Keep search input box synchronized with persistent activeSearchQuery
  const searchInput = document.getElementById("filterSearch");
  if (searchInput && searchInput.value !== activeSearchQuery) {
    searchInput.value = activeSearchQuery;
  }

  buildDomainNavigation();
  buildSubModeNavigation();
  buildCalculatorStrip();
  buildSidebarFilters();
  runActiveFilter();
  if (typeof applyProjectFocusMode === "function") applyProjectFocusMode();
}

function switchMode(newMode) {
  saveModeFilterState(currentMode);

  // Find parent domain for this mode
  for (const [dKey, dDef] of Object.entries(DOMAIN_DEFINITIONS)) {
    if (dDef.modes.some(m => m.id === newMode)) {
      activeDomain = dKey;
      window.activeDomain = activeDomain;
      lastActiveModeByDomain[dKey] = newMode;
      break;
    }
  }

  currentMode = newMode;
  window.currentMode = currentMode;

  restoreModeFilterState(newMode);

  // Keep search input box synchronized with persistent activeSearchQuery
  const searchInput = document.getElementById("filterSearch");
  if (searchInput && searchInput.value !== activeSearchQuery) {
    searchInput.value = activeSearchQuery;
  }

  buildDomainNavigation();
  buildSubModeNavigation();
  buildCalculatorStrip();
  buildSidebarFilters();
  runActiveFilter();
  if (typeof applyProjectFocusMode === "function") applyProjectFocusMode();
}

function buildDomainNavigation() {
  const container = document.getElementById("domainNavigationContainer");
  if (!container) return;

  container.innerHTML = Object.entries(DOMAIN_DEFINITIONS).map(([dKey, def]) => {
    const isActive = activeDomain === dKey;
    const activeClasses = isActive 
      ? "bg-slate-800 text-white font-bold border-brand-500/50 shadow-sm" 
      : "text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-900/60";

    return `
      <button onclick="switchDomain('${dKey}'); if (typeof toggleCatalogExpand === 'function') toggleCatalogExpand(false);" id="domain-tab-${dKey}" class="px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 border transition-all ${activeClasses} cursor-pointer shrink-0">
        <i data-lucide="${def.icon}" class="w-3.5 h-3.5 ${isActive ? 'text-brand-400' : 'text-slate-500'}"></i>
        <span>${def.label}</span>
      </button>
    `;
  }).join('');

  safeCreateIcons(container);
}

function buildSubModeNavigation() {
  const container = document.getElementById("subModeNavigationContainer");
  if (!container) return;

  const currentDef = DOMAIN_DEFINITIONS[activeDomain];
  if (!currentDef) return;

  container.innerHTML = currentDef.modes.map(mode => {
    const isActive = currentMode === mode.id;
    const activeClasses = isActive
      ? "bg-brand-600/20 text-brand-300 font-bold border-brand-500/40 shadow-sm"
      : "bg-slate-950 text-slate-400 hover:text-white border-slate-800 hover:border-slate-700";

    return `
      <button onclick="switchMode('${mode.id}')" id="nav-${mode.id}" class="top-nav-btn px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition-all ${activeClasses}">
        <i data-lucide="${mode.icon}" class="w-3.5 h-3.5 ${isActive ? 'text-brand-400' : 'text-slate-400'}"></i>
        <span>${mode.label}</span>
      </button>
    `;
  }).join('');

  safeCreateIcons(container);
}

function updateSearchFilter(val) {
  activeSearchQuery = val ? val.trim() : "";
  debouncedRunActiveFilter();
}

function resetCurrentFilters(silent = false) {
  selectedVendors = [];
  selectedPortCounts = [];
  selectedPoEClasses = [];
  selectedUplinkSpeed = "all";
  requireDemandFit = false;
  requirePerpetualPoE = false;
  requireSubstation = false;
  requirePassThrough = false;
  requireShallowDepth = false;
  requireStacking = false;
  requireDualPsu = false;
  requireTAA = false;
  requireDinMount = false;
  requireMultiGig = false;
  selectedFormFactors = [];
  requireFanless = false;
  requirePoEPowered = false;
  requireDcPower = false;
  requireLayer3 = false;
  selectedSwitchLayers = [];
  requirePoEBt90 = false;
  requireIndustrialHardened = false;
  requireModularUplink = false;

  selectedFwVendors = [];
  selectedFwCategories = [];
  fwTargetThroughputGbps = 0;
  fwTargetThreatMbps = 0;
  requireFwCellular = false;
  requireFwDualPsu = false;
  requireFwRackmount = false;
  requireFw10GWan = false;
  requireFwPoePorts = false;
  requireFwHA = false;
  requireFw25GWan = false;
  requireFwStorage = false;

  selectedOpticMediums = [];
  selectedOpticSpeeds = [];
  selectedOpticVendors = [];
  selectedOpticFormFactor = "all";
  selectedOpticReach = "all";
  selectedDacLength = "all";
  requireOpticIndustrial = false;
  requireOpticBiDi = false;

  wlTargetDistanceMiles = 0;
  wlTargetThroughputMbps = 0;
  selectedWlTopologyRole = "all";
  selectedCompatibleMasterSku = "all";
  minWlStations = 0;
  selectedWlFrequencies = [];
  selectedWlVendors = [];
  selectedWlRangeTier = "all";
  requireWl60GHz = false;
  requireWlBackup5G = false;

  selectedAccSubCategory = "all";
  selectedAccVendors = [];
  selectedAccCategories = [];
  selectedAccTypes = [];
  selectedAccMounting = "all";
  accMinPowerWatts = 0;
  requireUpsSineWave = false;
  requireUpsOnline = false;
  requireUpsEbm = false;
  selectedUpsCategory = "all";
  selectedUpsVoltage = "all";
  selectedCableRatings = [];
  selectedPatchCordLength = "all";
  requireCableShielded = false;
  requireEtherlighting = false;

  // Power Infrastructure Filter Resets
  selectedUpsCategory = "all";
  selectedUpsVoltage = "all";
  selectedUpsInputPlug = "all";
  requireUpsSineWave = false;
  requireUpsOnline = false;
  requireUpsEbm = false;
  requireUpsNetworked = false;

  selectedPduNetworkType = "all";
  selectedPduPlugType = "all";
  selectedPduReceptacleType = "all";
  selectedPduMinOutlets = 0;
  requirePduManaged = false;
  requirePduDisplay = false;

  selectedCordPlugType = "all";
  selectedCordLength = "all";
  selectedCordColor = "all";
  selectedCordGauge = "all";
  requireCordLocking = false;

  selectedCamVendors = [];
  selectedCamFormFactors = [];
  selectedCamResolutions = [];
  requireCamAnalytics = false;
  requireCamVandal = false;
  requireCamTaa = false;

  selectedAcsVendors = [];
  selectedAcsControllerTypes = [];
  selectedAcsPowerSource = "all";
  requireAcsOsdp = false;

  selectedSrvVendors = [];
  selectedSrvRackUnits = [];
  minSrvStorageTb = 0;
  requireSrvDualPsu = false;

  window.selectedAccSubCategory = "all";
  Object.keys(modeFilterState).forEach(k => delete modeFilterState[k]);

  activeSearchQuery = "";
  const searchInput = document.getElementById("filterSearch");
  if (searchInput) searchInput.value = "";

  buildCalculatorStrip();
  buildSidebarFilters();
  runActiveFilter();
  if (!silent && typeof showToast === "function") {
    showToast("Filters reset to default.");
  }
}

// -----------------------------------------------------------
// Sizing Strip & Headroom Engine
// -----------------------------------------------------------
function calculatePoETarget() {
  if (typeof NetworkSizer !== "undefined" && typeof NetworkSizer.calculatePoEPlan === "function") {
    const plan = NetworkSizer.calculatePoEPlan(demandCounts, {
      headroomPercent: extraHeadroomPercent || 20
    });
    return {
      rawWatts: plan.rawWattsPSE,
      budgetWithHeadroom: plan.budgetWithHeadroom,
      totalCameras: plan.totalDevices,
      demandCounts: plan.demandCounts,
      rawWattsPSE: plan.rawWattsPSE,
      rawWattsPD: plan.rawWattsPD,
      cableLossWatts: plan.estimatedCableLossWatts,
      headroomWatts: plan.headroomWatts,
      headroomPercent: plan.headroomPercent,
      plan: plan
    };
  }

  // Graceful fallback
  const wattsAf = (demandCounts.af || 0) * 15.4;
  const wattsAt = (demandCounts.at || 0) * 30;
  const wattsBt60 = (demandCounts.bt60 || 0) * 60;
  const wattsBt90 = (demandCounts.bt90 || 0) * 90;

  const rawWatts = wattsAf + wattsAt + wattsBt60 + wattsBt90;
  const factor = 1 + ((extraHeadroomPercent || 20) / 100);
  const budgetWithHeadroom = Math.ceil(rawWatts * factor);
  const totalCameras = (demandCounts.af || 0) + (demandCounts.at || 0) + (demandCounts.bt60 || 0) + (demandCounts.bt90 || 0);

  return {
    rawWatts,
    budgetWithHeadroom,
    totalCameras,
    demandCounts
  };
}

function updateDemandInput(field, val) {
  demandCounts[field] = Math.max(0, parseInt(val, 10) || 0);
  buildCalculatorStrip();
  buildSidebarFilters();
  runActiveFilter();
  if (typeof FacilityStore !== "undefined") FacilityStore.notifyWorkspaceChange();
  if (typeof StorageService !== "undefined") StorageService.queueAutoSave();
}

function resetDemandInputs() {
  demandCounts = { af: 0, at: 0, bt60: 0, bt90: 0 };
  buildCalculatorStrip();
  buildSidebarFilters();
  runActiveFilter();
  if (typeof FacilityStore !== "undefined") FacilityStore.notifyWorkspaceChange();
  if (typeof StorageService !== "undefined") StorageService.queueAutoSave();
  showToast("PoE demand targets reset to 0.");
}

function deriveDemandFromBOM() {
  if (typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) {
    if (typeof showToast === "function") showToast("Project BOM is empty.");
    return;
  }

  let countAf = 0;
  let countAt = 0;
  let countBt60 = 0;
  let countBt90 = 0;
  let edgeDeviceCount = 0;

  projectBOM.forEach(item => {
    // Filter out switches, servers, PDUs, UPS, structured cabling, licenses, and optics
    const role = (item.role || "").toLowerCase();
    const cat = (item.category || "").toLowerCase();
    const model = (item.model || "").toLowerCase();

    const isNonEdge = role.includes("switch") || role === "access" || role === "core" || role === "aggregation" ||
                      role === "server" || role === "storage" || role === "ups" || role === "pdu" ||
                      role === "structured cabling" || role === "optics & dac" || role.includes("license") ||
                      item.source === "cabling_sync" || item.source === "topology_auto_sync";
    if (isNonEdge) return;

    // Check if device is powered via PoE
    const isCamera = role === "camera" || cat.includes("camera") || item.deviceType === "camera" || model.includes("camera");
    const isAccess = role === "access control" || cat.includes("access") || model.includes("controller") || model.includes("reader");
    const isWireless = role === "wireless" || role === "wireless bridge" || cat.includes("wireless") || model.includes("access point");
    const isIntercom = role.includes("intercom") || model.includes("intercom") || model.includes("speaker");
    const hasPoeAttr = Boolean(item.poeStandard || item.poeWattsDrawn || (item.powerConsumptionWatts && item.powerSource !== "dual_ac" && item.powerSource !== "internal_ac"));

    if (isCamera || isAccess || isWireless || isIntercom || hasPoeAttr) {
      const qty = Math.max(1, parseInt(item.qty, 10) || 1);
      const std = (item.poeStandard || "").toLowerCase();
      const watts = parseFloat(item.maxPowerWatts || item.powerConsumptionWatts || item.poeWattsDrawn || item.baseWatts || (isCamera ? 12 : 15));

      edgeDeviceCount += qty;

      if (std.includes("bt4") || std.includes("90w") || std.includes("type 4") || watts > 60) {
        countBt90 += qty;
      } else if (std.includes("bt") || std.includes("60w") || std.includes("type 3") || watts > 30) {
        countBt60 += qty;
      } else if (std.includes("at") || std.includes("poe+") || watts > 15.4) {
        countAt += qty;
      } else {
        countAf += qty;
      }
    }
  });

  if (edgeDeviceCount === 0) {
    if (typeof showToast === "function") showToast("No PoE edge devices (cameras, access, APs) found in quote.");
    return;
  }

  demandCounts.af = countAf;
  demandCounts.at = countAt;
  demandCounts.bt60 = countBt60;
  demandCounts.bt90 = countBt90;

  buildCalculatorStrip();
  buildSidebarFilters();
  runActiveFilter();

  if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
    FacilityStore.notifyWorkspaceChange();
  }
  if (typeof StorageService !== "undefined" && typeof StorageService.queueAutoSave === "function") {
    StorageService.queueAutoSave();
  }

  const p = calculatePoETarget();
  if (typeof showToast === "function") {
    showToast(`Derived demands from BOM: ${edgeDeviceCount} edge devices (${countAf} af, ${countAt} at, ${countBt60} bt60, ${countBt90} bt90) totaling ${p.budgetWithHeadroom}W required.`);
  }
}

function updateHeadroom(val) {
  extraHeadroomPercent = parseInt(val, 10) || 20;
  buildCalculatorStrip();
  runActiveFilter();
  if (typeof FacilityStore !== "undefined") FacilityStore.notifyWorkspaceChange();
  if (typeof StorageService !== "undefined") StorageService.queueAutoSave();
}

function setOpticQuickFilter(preset) {
  if (preset === "10g_dac") {
    selectedOpticSpeeds = ["10G"];
    selectedOpticMediums = ["dac"];
  } else if (preset === "10g_sr") {
    selectedOpticSpeeds = ["10G"];
    selectedOpticMediums = ["mmf"];
  } else if (preset === "10g_lr") {
    selectedOpticSpeeds = ["10G"];
    selectedOpticMediums = ["smf"];
  } else if (preset === "25g") {
    selectedOpticSpeeds = ["25G"];
    selectedOpticMediums = [];
  } else if (preset === "100g") {
    selectedOpticSpeeds = ["100G"];
    selectedOpticMediums = [];
  } else if (preset === "stacking") {
    selectedOpticSpeeds = [];
    selectedOpticMediums = ["stacking"];
  } else if (preset === "reset") {
    selectedOpticSpeeds = [];
    selectedOpticMediums = [];
    selectedOpticFormFactor = "all";
    requireOpticIndustrial = false;
  }

  buildSidebarFilters();
  runActiveFilter();
}

function buildCalculatorStrip() {
  const container = document.getElementById("calculatorStripContainer");
  if (!container) return;

  if (currentMode === "access") {
    container.classList.remove("hidden");
    const p = calculatePoETarget();
    const hasDemand = p.totalCameras > 0;

    container.innerHTML = `
      <div class="bg-slate-900/95 border border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4 shadow-lg">
        <div class="flex items-center gap-3">
          <div class="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
            <i data-lucide="zap" class="w-5 h-5"></i>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h4 class="text-xs font-bold text-white uppercase tracking-wider">
                PoE Power Budget & Edge Capacity Calculator
              </h4>
              <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold">
                IEEE 802.3 Sizing
              </span>
            </div>
            <p class="text-[11px] text-slate-400 mt-0.5">
              Spec connected cameras, intercoms, or APs to compute continuous PSE wattage, cable dissipation, and filter matching switches.
            </p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2.5 text-xs">
          <!-- 15.4W af -->
          <div class="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 hover:border-slate-700 transition-colors" title="IEEE 802.3af: 15.4W PSE / 12.95W PD">
            <span class="text-[10px] font-mono text-slate-400 font-semibold uppercase">15W (af):</span>
            <input type="number" min="0" max="96" value="${demandCounts.af || 0}" onchange="updateDemandInput('af', this.value)" class="w-8 bg-transparent text-center font-mono font-bold text-white focus:outline-none" />
          </div>

          <!-- 30W at -->
          <div class="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 hover:border-slate-700 transition-colors" title="IEEE 802.3at: 30W PSE / 25.5W PD (PoE+)">
            <span class="text-[10px] font-mono text-slate-400 font-semibold uppercase">30W (at):</span>
            <input type="number" min="0" max="96" value="${demandCounts.at || 0}" onchange="updateDemandInput('at', this.value)" class="w-8 bg-transparent text-center font-mono font-bold text-sky-400 focus:outline-none" />
          </div>

          <!-- 60W bt Type 3 -->
          <div class="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 hover:border-slate-700 transition-colors" title="IEEE 802.3bt Type 3: 60W PSE / 51W PD (PoE++ / 4PPoE)">
            <span class="text-[10px] font-mono text-slate-400 font-semibold uppercase">60W (bt):</span>
            <input type="number" min="0" max="96" value="${demandCounts.bt60 || 0}" onchange="updateDemandInput('bt60', this.value)" class="w-8 bg-transparent text-center font-mono font-bold text-indigo-400 focus:outline-none" />
          </div>

          <!-- 90W bt Type 4 -->
          <div class="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 hover:border-slate-700 transition-colors" title="IEEE 802.3bt Type 4: 90W PSE / 71.3W PD (High-Power PoE++)">
            <span class="text-[10px] font-mono text-slate-400 font-semibold uppercase">90W (bt):</span>
            <input type="number" min="0" max="96" value="${demandCounts.bt90 || 0}" onchange="updateDemandInput('bt90', this.value)" class="w-8 bg-transparent text-center font-mono font-bold text-amber-400 focus:outline-none" />
          </div>

          <!-- Auto-Derive from BOM Button -->
          <button onclick="deriveDemandFromBOM()" class="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl transition-all font-semibold text-[11px] cursor-pointer" title="Auto-detect PoE demands from devices in project BOM">
            <i data-lucide="sparkles" class="w-3.5 h-3.5"></i>
            <span>Derive from BOM</span>
          </button>

          <!-- Telemetry & Headroom Buffer Selection -->
          <div class="flex items-center gap-3 border-l border-slate-800 pl-3">
            <div class="text-right">
              <span class="text-[10px] text-slate-400 uppercase font-mono block">
                Required Budget (+${extraHeadroomPercent}%):
              </span>
              <div class="flex items-baseline justify-end gap-1.5">
                <span class="text-sm font-mono font-black text-amber-400">${p.budgetWithHeadroom} W</span>
                ${p.rawWattsPD ? `<span class="text-[10px] text-slate-500 font-mono" title="Estimated device draw: ${p.rawWattsPD}W, Cable loss: ${p.cableLossWatts || 0}W">(${p.rawWatts || 0}W PSE)</span>` : ''}
              </div>
            </div>

            <select onchange="updateHeadroom(this.value)" class="bg-slate-950 border border-slate-800 text-[11px] font-semibold rounded-lg px-2 py-1.5 text-slate-300 focus:outline-none focus:border-amber-500">
              <option value="10" ${extraHeadroomPercent === 10 ? 'selected' : ''}>+10% Buffer</option>
              <option value="15" ${extraHeadroomPercent === 15 ? 'selected' : ''}>+15% Buffer</option>
              <option value="20" ${extraHeadroomPercent === 20 ? 'selected' : ''}>+20% Buffer</option>
              <option value="25" ${extraHeadroomPercent === 25 ? 'selected' : ''}>+25% Buffer</option>
              <option value="30" ${extraHeadroomPercent === 30 ? 'selected' : ''}>+30% Buffer</option>
            </select>

            ${hasDemand ? `
              <button onclick="resetDemandInputs()" class="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors" title="Clear Demand Targets">
                <i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i>
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;
    safeCreateIcons(container);
  } else if (currentMode === "firewalls") {
    container.classList.remove("hidden");
    container.innerHTML = `
      <div class="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4 shadow-md">
        <div class="flex items-center gap-3">
          <div class="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 shrink-0">
            <i data-lucide="shield" class="w-5 h-5"></i>
          </div>
          <div>
            <h4 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              WAN Throughput & IPS Sizing Strip
            </h4>
            <p class="text-[11px] text-slate-400">Filter security gateways by line-rate throughput and advanced threat inspection capabilities.</p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-3 text-xs">
          <div class="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5">
            <span class="text-[10px] font-mono font-bold text-slate-400 uppercase">Min Routing:</span>
            <select onchange="fwTargetThroughputGbps = parseFloat(this.value) || 0; runActiveFilter();" class="bg-transparent font-mono font-bold text-white text-xs focus:outline-none">
              <option value="0" ${fwTargetThroughputGbps === 0 ? 'selected' : ''}>Any Speed</option>
              <option value="1" ${fwTargetThroughputGbps === 1 ? 'selected' : ''}>1.0+ Gbps</option>
              <option value="2.5" ${fwTargetThroughputGbps === 2.5 ? 'selected' : ''}>2.5+ Gbps</option>
              <option value="5" ${fwTargetThroughputGbps === 5 ? 'selected' : ''}>5.0+ Gbps</option>
              <option value="10" ${fwTargetThroughputGbps === 10 ? 'selected' : ''}>10+ Gbps</option>
            </select>
          </div>

          <div class="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5">
            <span class="text-[10px] font-mono font-bold text-slate-400 uppercase">Min IPS / Threat:</span>
            <select onchange="fwTargetThreatMbps = parseInt(this.value) || 0; runActiveFilter();" class="bg-transparent font-mono font-bold text-rose-400 text-xs focus:outline-none">
              <option value="0" ${fwTargetThreatMbps === 0 ? 'selected' : ''}>Any IPS</option>
              <option value="500" ${fwTargetThreatMbps === 500 ? 'selected' : ''}>500+ Mbps</option>
              <option value="1000" ${fwTargetThreatMbps === 1000 ? 'selected' : ''}>1.0+ Gbps</option>
              <option value="3000" ${fwTargetThreatMbps === 3000 ? 'selected' : ''}>3.0+ Gbps</option>
              <option value="5000" ${fwTargetThreatMbps === 5000 ? 'selected' : ''}>5.0+ Gbps</option>
            </select>
          </div>

          ${(fwTargetThroughputGbps > 0 || fwTargetThreatMbps > 0) ? `
            <button onclick="fwTargetThroughputGbps = 0; fwTargetThreatMbps = 0; buildCalculatorStrip(); runActiveFilter();" class="text-xs text-rose-400 hover:text-rose-300 font-semibold px-2">
              Reset Specs
            </button>
          ` : ''}
        </div>
      </div>
    `;
  } else if (currentMode === "optics") {
    container.classList.remove("hidden");
    container.innerHTML = `
      <div class="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4 shadow-md">
        <div class="flex items-center gap-3">
          <div class="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400 shrink-0">
            <i data-lucide="cable" class="w-5 h-5"></i>
          </div>
          <div>
            <h4 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              Optics & Transceiver Fast-Select Strip
            </h4>
            <p class="text-[11px] text-slate-400">Quick-filter physical fiber interfaces, direct-attach copper, and chassis stacking cables.</p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-1.5 text-xs">
          <button onclick="setOpticQuickFilter('10g_dac')" class="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 hover:border-sky-500/50 hover:bg-sky-950/20 text-slate-300 hover:text-white font-mono text-[11px] transition-all">10G DAC</button>
          <button onclick="setOpticQuickFilter('10g_sr')" class="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 hover:border-sky-500/50 hover:bg-sky-950/20 text-slate-300 hover:text-white font-mono text-[11px] transition-all">10G MMF (SR)</button>
          <button onclick="setOpticQuickFilter('10g_lr')" class="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 hover:border-sky-500/50 hover:bg-sky-950/20 text-slate-300 hover:text-white font-mono text-[11px] transition-all">10G SMF (LR)</button>
          <button onclick="setOpticQuickFilter('25g')" class="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 hover:border-sky-500/50 hover:bg-sky-950/20 text-slate-300 hover:text-white font-mono text-[11px] transition-all">25G SFP28</button>
          <button onclick="setOpticQuickFilter('100g')" class="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 hover:border-sky-500/50 hover:bg-sky-950/20 text-slate-300 hover:text-white font-mono text-[11px] transition-all">100G QSFP28</button>
          <button onclick="setOpticQuickFilter('stacking')" class="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-950/20 text-indigo-300 hover:text-white font-mono text-[11px] transition-all">Stacking</button>
          <button onclick="setOpticQuickFilter('reset')" class="text-xs text-rose-400 hover:text-rose-300 font-semibold px-2">Reset</button>
        </div>
      </div>
    `;
  } else if (currentMode === "wireless") {
    container.classList.remove("hidden");
    container.innerHTML = `
      <div class="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4 shadow-md">
        <div class="flex items-center gap-3">
          <div class="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shrink-0">
            <i data-lucide="radio" class="w-5 h-5"></i>
          </div>
          <div>
            <h4 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              Wireless Link Path Sizer
            </h4>
            <p class="text-[11px] text-slate-400">Filter radios by minimum operating distance and line-rate throughput requirements.</p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-3 text-xs">
          <div class="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5">
            <span class="text-[10px] font-mono font-bold text-slate-400 uppercase">Min Distance:</span>
            <input type="number" step="0.1" min="0" max="25" value="${wlTargetDistanceMiles || 0}" onchange="wlTargetDistanceMiles = parseFloat(this.value) || 0; runActiveFilter();" class="w-14 bg-transparent font-mono font-bold text-emerald-400 focus:outline-none text-right" />
            <span class="text-[10px] font-mono text-slate-500">Miles (${((wlTargetDistanceMiles || 0) * 1.609).toFixed(1)} km)</span>
          </div>

          <div class="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5">
            <span class="text-[10px] font-mono font-bold text-slate-400 uppercase">Min Speed:</span>
            <select onchange="wlTargetThroughputMbps = parseInt(this.value) || 0; runActiveFilter();" class="bg-transparent font-mono font-bold text-indigo-300 text-xs focus:outline-none">
              <option value="0" ${wlTargetThroughputMbps === 0 ? 'selected' : ''}>Any Speed</option>
              <option value="450" ${wlTargetThroughputMbps === 450 ? 'selected' : ''}>450+ Mbps (Camera Pole)</option>
              <option value="1000" ${wlTargetThroughputMbps === 1000 ? 'selected' : ''}>1.0+ Gbps (Gigabit Trunk)</option>
              <option value="2000" ${wlTargetThroughputMbps === 2000 ? 'selected' : ''}>2.0+ Gbps (Multi-Gig)</option>
              <option value="5000" ${wlTargetThroughputMbps === 5000 ? 'selected' : ''}>5.0+ Gbps (High Capacity)</option>
              <option value="10000" ${wlTargetThroughputMbps === 10000 ? 'selected' : ''}>10 Gbps (Carrier E-Band)</option>
            </select>
          </div>

          ${(wlTargetDistanceMiles > 0 || wlTargetThroughputMbps > 0) ? `
            <button onclick="wlTargetDistanceMiles = 0; wlTargetThroughputMbps = 0; buildCalculatorStrip(); runActiveFilter();" class="text-xs text-rose-400 hover:text-rose-300 font-semibold px-2">
              Reset Link
            </button>
          ` : ''}
        </div>
      </div>
    `;
  } else if (currentMode === "accessories") {
    container.classList.remove("hidden");
    const accCats = [
      { id: "all", label: "All Items", icon: "wrench" },
      { id: "mounts", label: "Mounts & Brackets", icon: "layers" },
      { id: "media_converters", label: "Media Converters", icon: "repeat" },
      { id: "licenses", label: "Licenses & Cloud", icon: "key" },
      { id: "modular_uplinks", label: "Modular Uplinks", icon: "cpu" },
      { id: "power_supplies", label: "Power Supplies", icon: "zap" },
      { id: "poe_injectors", label: "PoE Midspans", icon: "plug" }
    ];
    container.innerHTML = `
      <div class="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4 shadow-md">
        <div class="flex items-center gap-3">
          <div class="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 shrink-0">
            <i data-lucide="wrench" class="w-5 h-5"></i>
          </div>
          <div>
            <h4 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              Networking Accessories & Modular Hardware
            </h4>
            <p class="text-[11px] text-slate-400">Filter mounting kits, media converters, expansion uplinks, power supplies, and cloud licenses.</p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-1.5">
          ${accCats.map(cat => {
            const isActive = (typeof selectedAccSubCategory !== "undefined" ? selectedAccSubCategory : "all") === cat.id;
            return `
              <button onclick="setAccSubCategory('${cat.id}')" class="px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${isActive ? '!bg-indigo-600 !border-indigo-400 !text-white shadow-md shadow-indigo-900/40 ring-2 ring-indigo-400/60 font-bold' : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'}">
                <i data-lucide="${cat.icon}" class="w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-indigo-400'}"></i>
                <span>${cat.label}</span>
              </button>
            `;
          }).join('')}
        </div>
      </div>
    `;
  } else if (currentMode === "enclosures") {
    container.classList.remove("hidden");
    container.innerHTML = `
      <div class="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4 shadow-md">
        <div class="flex items-center gap-3">
          <div class="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
            <i data-lucide="box" class="w-5 h-5"></i>
          </div>
          <div>
            <h4 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              Enclosures, Cabinets & Security Backboards
            </h4>
            <p class="text-[11px] text-slate-400">Exterior NEMA 4X weather-tight boxes, Trove/LSP access control cabinets, DIN boxes, and plywood backboards.</p>
          </div>
        </div>
        <div class="flex items-center gap-2 text-xs">
          <span class="text-[10px] font-mono font-bold text-slate-400 uppercase">Environment:</span>
          <select onchange="selectedAccMounting = this.value; runActiveFilter();" class="bg-slate-950 border border-slate-800 text-amber-400 rounded-xl px-3 py-1.5 font-bold text-xs focus:outline-none focus:border-amber-500">
            <option value="all" ${selectedAccMounting === 'all' ? 'selected' : ''}>All Enclosure Types</option>
            <option value="Pole" ${selectedAccMounting === 'Pole' ? 'selected' : ''}>Outdoor Pole Box (NEMA 4X)</option>
            <option value="Wall" ${selectedAccMounting === 'Wall' ? 'selected' : ''}>Wall / Security Cabinet</option>
            <option value="DIN" ${selectedAccMounting === 'DIN' ? 'selected' : ''}>DIN Rail Cabinet</option>
          </select>
        </div>
      </div>
    `;
  } else if (currentMode === "ups") {
    container.classList.remove("hidden");
    const vVal = typeof selectedUpsVoltage !== "undefined" ? selectedUpsVoltage : "all";
    const cVal = typeof selectedUpsCategory !== "undefined" ? selectedUpsCategory : "all";
    container.innerHTML = `
      <div class="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4 shadow-md">
        <div class="flex items-center gap-3">
          <div class="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
            <i data-lucide="zap" class="w-5 h-5"></i>
          </div>
          <div>
            <h4 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              Uninterruptible Power Supply (UPS) Systems & Battery Modules
            </h4>
            <p class="text-[11px] text-slate-400">Online double-conversion pure sine wave battery backups, external battery modules (EBPs), and SmartConnect cloud monitoring.</p>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-2.5 text-xs">
          <div class="flex items-center gap-1.5">
            <span class="text-[10px] font-mono font-bold text-slate-400 uppercase">Class:</span>
            <select onchange="selectedUpsCategory = this.value; runActiveFilter();" class="bg-slate-950 border border-slate-800 text-amber-400 rounded-xl px-2.5 py-1.5 font-bold text-xs focus:outline-none focus:border-amber-500">
              <option value="all" ${cVal === 'all' ? 'selected' : ''}>All Power Hardware</option>
              <option value="ups" ${cVal === 'ups' ? 'selected' : ''}>UPS Units Only</option>
              <option value="ebp" ${cVal === 'ebp' ? 'selected' : ''}>Battery Packs (EBP)</option>
            </select>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="text-[10px] font-mono font-bold text-slate-400 uppercase">Voltage:</span>
            <select onchange="selectedUpsVoltage = this.value; runActiveFilter();" class="bg-slate-950 border border-slate-800 text-amber-400 rounded-xl px-2.5 py-1.5 font-bold text-xs focus:outline-none focus:border-amber-500">
              <option value="all" ${vVal === 'all' ? 'selected' : ''}>All Voltages</option>
              <option value="120" ${vVal === '120' ? 'selected' : ''}>120V AC Standard</option>
              <option value="240" ${vVal === '240' ? 'selected' : ''}>208V / 240V AC</option>
            </select>
          </div>
        </div>
      </div>
    `;
  } else if (currentMode === "pdus") {
    container.classList.remove("hidden");
    const pduNet = typeof selectedPduNetworkType !== "undefined" ? selectedPduNetworkType : "all";
    const pduVolt = typeof selectedUpsVoltage !== "undefined" ? selectedUpsVoltage : "all";
    container.innerHTML = `
      <div class="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4 shadow-md">
        <div class="flex items-center gap-3">
          <div class="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400 shrink-0">
            <i data-lucide="power" class="w-5 h-5"></i>
          </div>
          <div>
            <h4 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              Rack Power Distribution Units (PDUs)
            </h4>
            <p class="text-[11px] text-slate-400">0U vertical toolless high-density strips, 1U horizontal rack power, and automatic transfer switches (ATS) with per-outlet rebooting.</p>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-2.5 text-xs">
          <div class="flex items-center gap-1.5">
            <span class="text-[10px] font-mono font-bold text-slate-400 uppercase">Management:</span>
            <select onchange="selectedPduNetworkType = this.value; runActiveFilter();" class="bg-slate-950 border border-slate-800 text-sky-400 rounded-xl px-2.5 py-1.5 font-bold text-xs focus:outline-none focus:border-sky-500">
              <option value="all" ${pduNet === 'all' ? 'selected' : ''}>All Management Types</option>
              <option value="switched" ${pduNet === 'switched' ? 'selected' : ''}>Switched (Remote Reboot)</option>
              <option value="metered" ${pduNet === 'metered' ? 'selected' : ''}>Metered (Load Display)</option>
              <option value="basic" ${pduNet === 'basic' ? 'selected' : ''}>Basic (Unmanaged)</option>
              <option value="ats" ${pduNet === 'ats' ? 'selected' : ''}>Automatic Transfer (ATS)</option>
            </select>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="text-[10px] font-mono font-bold text-slate-400 uppercase">Voltage:</span>
            <select onchange="selectedUpsVoltage = this.value; runActiveFilter();" class="bg-slate-950 border border-slate-800 text-sky-400 rounded-xl px-2.5 py-1.5 font-bold text-xs focus:outline-none focus:border-sky-500">
              <option value="all" ${pduVolt === 'all' ? 'selected' : ''}>All Voltages</option>
              <option value="120" ${pduVolt === '120' ? 'selected' : ''}>120V AC (15A / 20A / 30A)</option>
              <option value="240" ${pduVolt === '240' ? 'selected' : ''}>208V / 240V AC (L6-30P)</option>
            </select>
          </div>
        </div>
      </div>
    `;
  } else if (currentMode === "power_cords") {
    container.classList.remove("hidden");
    const cordLen = typeof selectedCordLength !== "undefined" ? selectedCordLength : "all";
    const cordColor = typeof selectedCordColor !== "undefined" ? selectedCordColor : "all";
    const colorSwatches = [
      { id: "all", label: "All Colors", bg: "bg-slate-700" },
      { id: "Black", label: "Black", bg: "bg-slate-900 border border-slate-700" },
      { id: "Blue", label: "Blue (A-Feed)", bg: "bg-blue-600" },
      { id: "Red", label: "Red (B-Feed)", bg: "bg-red-600" },
      { id: "Yellow", label: "Yellow", bg: "bg-yellow-500" },
      { id: "Green", label: "Green", bg: "bg-emerald-600" },
      { id: "White", label: "White", bg: "bg-slate-100 text-slate-900" },
      { id: "Orange", label: "Orange", bg: "bg-orange-600" }
    ];
    container.innerHTML = `
      <div class="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4 shadow-md">
        <div class="flex items-center gap-3">
          <div class="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400 shrink-0">
            <i data-lucide="plug" class="w-5 h-5"></i>
          </div>
          <div>
            <h4 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              Power Cords, Equipment Jumpers & Dual-Locking Cables
            </h4>
            <p class="text-[11px] text-slate-400">IEC C13/C14, C19/C20, C15 High-Temp, locking retention cords, and color-coded jackets for A/B redundant feed isolation.</p>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-2 text-xs">
          <!-- Color Quick Selector -->
          <div class="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <span class="text-[10px] font-mono font-bold text-slate-400 uppercase px-1.5">Color:</span>
            ${colorSwatches.map(c => `
              <button onclick="selectedCordColor = '${c.id}'; buildCalculatorStrip(); runActiveFilter();" title="${c.label}" class="w-5 h-5 rounded-lg flex items-center justify-center transition-all ${c.bg} ${cordColor === c.id ? 'ring-2 ring-teal-400 scale-110 shadow-sm' : 'opacity-70 hover:opacity-100'}">
                ${cordColor === c.id ? '<div class="w-1.5 h-1.5 rounded-full bg-white"></div>' : ''}
              </button>
            `).join('')}
          </div>

          <!-- Quick Length Selector -->
          <div class="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <span class="text-[10px] font-mono font-bold text-slate-400 uppercase px-1.5">Length:</span>
            ${["all", "1", "2", "3", "6", "10", "15"].map(len => `
              <button onclick="selectedCordLength = '${len}'; buildCalculatorStrip(); runActiveFilter();" class="px-2 py-0.5 rounded-lg text-[11px] font-mono font-semibold transition-all ${cordLen === len ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}">
                ${len === 'all' ? 'All' : `${len}ft`}
              </button>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  } else if (currentMode === "cameras" || currentMode === "servers" || currentMode === "storage") {
    // Interactive Video Storage, Bandwidth, RAID Drive Matrix & Genetec 5.14 Archiver Sizer
    container.classList.remove("hidden");
    const vCalc = (typeof VideoStorageSizer !== "undefined" && typeof VideoStorageSizer.calculateFromBOM === "function")
      ? VideoStorageSizer.calculateFromBOM(projectBOM, {
          sourceMode: videoSourceMode,
          manualCameraCount: videoManualCamCount,
          resolutionMp: videoResolutionMp,
          retentionDays: videoRetentionDays,
          codec: videoCodec,
          fps: videoFps,
          motionDutyCycle: videoMotionDuty,
          sceneActivity: videoSceneActivity,
          raidType: videoRaidType,
          preferredDriveSizeTb: videoPreferredDriveTb,
          genetecProfile: videoGenetecProfile,
          archiverRolesCount: videoArchiverRoles,
          encryptionCerts: videoEncryptionCerts,
          softwareMotionDetection: videoSoftwareMotion
        })
      : {
          sourceMode: "manual",
          bomCameraUnits: 0,
          totalCameras: 32,
          totalSensors: 32,
          perCameraMbps: 3.3,
          peakIngressMbps: 105.6,
          averageRecordingMbps: 52.8,
          totalBandwidthMbps: 105.6,
          dailyStorageGb: 570.2,
          requiredUsableTB: 18.82,
          requiredRawTB: 25.03,
          arrayRawTb: 64,
          arrayUsableTb: 32,
          driveOptionsMatrix: [],
          selectedDrivePlan: { driveSizeTb: 16, totalDrives: 4, drivesPerServer: 4, rawStorageTb: 64, usableStorageTb: 32, efficiencyPct: 50, chassisFormFactor: "1U 4-Bay" },
          genetec: {
            version: "5.14.1.0",
            datasheetPath: "Datasheets/Genetec/SystemRequirements.pdf",
            profileKey: "dedicated_300",
            profile: { label: "Dedicated Archiver (Up to 300 Mbps)", cpuSpec: "Xeon Silver 4210", ramGb: 16, nicSpec: "1 GbE" },
            effectiveMaxCamerasPerArchiver: 300,
            effectiveMaxMbpsPerArchiver: 300,
            minRequiredArchiverRoles: 1,
            activeArchiverRoles: 1,
            isArchiverCountVerified: true,
            recommendedArchiverServers: 1,
            requiresDedicatedDirectoryServer: false,
            totalServersIncludingDirectory: 1,
            camerasPerArchiverRole: 32,
            bitratePerArchiverRoleMbps: 105.6,
            usableTbPerArchiverRole: 18.82,
            usableTbPerServer: 18.82,
            bitratePerServerMbps: 105.6,
            findings: [],
            isFullyCompliant: true
          }
        };

    const quotedNvrs = (projectBOM || []).filter(i => {
      const r = (i.role || "").toLowerCase();
      const c = (i.category || "").toLowerCase();
      return r.includes("nvr") || r.includes("recorder") || r.includes("server") || c === "servers" || c === "storage";
    });
    const quotedUsableTB = Math.round(quotedNvrs.reduce((sum, nvr) => sum + ((Number(nvr.usableStorageTb ?? nvr.usableStorageTB ?? nvr.rawStorageTb ?? nvr.rawStorageTB ?? 0)) * (nvr.qty || 1)), 0) * 10) / 10;
    const isStorageHealthy = vCalc.requiredUsableTB === 0 || quotedUsableTB >= vCalc.requiredUsableTB;
    const g = vCalc.genetec || {};
    const dp = vCalc.selectedDrivePlan || {};
    const showMatrix = (currentMode === "servers" || currentMode === "storage") ? (videoShowDetailsPanel !== false) : Boolean(videoShowDetailsPanel);

    const profilesList = (typeof GENETEC_514_REQUIREMENTS !== "undefined" && GENETEC_514_REQUIREMENTS.ARCHIVER_PROFILES)
      ? Object.values(GENETEC_514_REQUIREMENTS.ARCHIVER_PROFILES)
      : [];

    container.innerHTML = `
      <div class="bg-slate-900/95 border border-slate-800 rounded-2xl p-3.5 sm:p-4 flex flex-col gap-3.5 shadow-lg">
        <!-- Row 1: Header, Source Toggle, Genetec Datasheet Link & Primary KPI Strip -->
        <div class="flex flex-col xl:flex-row xl:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div class="flex items-start sm:items-center gap-3">
            <div class="p-2.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 shrink-0">
              <i data-lucide="hard-drive" class="w-5 h-5"></i>
            </div>
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h4 class="text-xs font-bold text-white uppercase tracking-wider">Storage, Bandwidth, RAID &amp; Genetec 5.14 Archiver Calculator</h4>
                <span class="px-2 py-0.5 rounded-md bg-purple-950/80 border border-purple-700/50 text-[10px] font-mono font-bold text-purple-300">
                  ${vCalc.totalCameras} Cameras (${vCalc.totalSensors} Streams @ ${vCalc.perCameraMbps} Mbps/cam)
                </span>
                <button onclick="openDatasheetModal('Datasheets/Genetec/SystemRequirements.pdf', 'Genetec Security Center 5.14.1.0 System Requirements Guide', 'GENETEC-SC-5.14')" class="px-2 py-0.5 rounded-md bg-sky-950/80 hover:bg-sky-900 border border-sky-700/60 text-[10px] font-mono font-semibold text-sky-300 flex items-center gap-1 transition-all cursor-pointer" title="Open Genetec Security Center 5.14.1.0 System Requirements Guide PDF">
                  <i data-lucide="file-text" class="w-3 h-3"></i>
                  <span>Genetec 5.14 Spec Guide</span>
                </button>
              </div>
              <p class="text-[11px] text-slate-400 mt-0.5">
                Industry-standard bitrate &amp; RAID array sizing with live <strong class="text-slate-200">Genetec Security Center 5.14</strong> Archiver role &amp; server throughput verification.
              </p>
            </div>
          </div>

          <!-- Top Right KPI Summary & Actions -->
          <div class="flex flex-wrap items-center gap-2.5 shrink-0">
            <div class="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-slate-950 border ${g.isFullyCompliant ? 'border-slate-800' : 'border-rose-600/80'}">
              <div>
                <div class="text-[9px] uppercase font-bold text-slate-400">Peak / Avg Bitrate</div>
                <div class="text-xs font-mono font-bold text-sky-400">${vCalc.peakIngressMbps} <span class="text-slate-500">/</span> ${vCalc.averageRecordingMbps} Mbps</div>
              </div>
              <div class="h-6 w-px bg-slate-800"></div>
              <div>
                <div class="text-[9px] uppercase font-bold text-slate-400">Usable / Raw (${vCalc.raidLevel})</div>
                <div class="text-xs font-mono font-bold text-purple-300">${vCalc.requiredUsableTB} TB <span class="text-slate-500">/</span> ${vCalc.arrayRawTb || vCalc.requiredRawTB} TB</div>
              </div>
              <div class="h-6 w-px bg-slate-800"></div>
              <div>
                <div class="text-[9px] uppercase font-bold text-slate-400">Genetec Archivers</div>
                <div class="text-xs font-mono font-bold ${g.isArchiverCountVerified ? 'text-emerald-400' : 'text-rose-400'}">
                  ${g.activeArchiverRoles} Role${g.activeArchiverRoles === 1 ? '' : 's'} (${g.recommendedArchiverServers} Srv)
                </div>
              </div>
              <div class="h-6 w-px bg-slate-800"></div>
              <div>
                <div class="text-[9px] uppercase font-bold text-slate-400">BOM Quoted</div>
                <div class="text-xs font-mono font-bold ${isStorageHealthy ? 'text-emerald-400' : 'text-amber-400'}">${quotedUsableTB} TB</div>
              </div>
            </div>

            <button onclick="setVideoSizerParam('toggleDetails', !videoShowDetailsPanel)" class="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer" title="Toggle RAID Drive Matrix & Genetec Archiver Mapping">
              <i data-lucide="${showMatrix ? 'chevron-up' : 'chevron-down'}" class="w-3.5 h-3.5 text-purple-400"></i>
              <span>${showMatrix ? 'Hide Matrix' : 'RAID & Archiver Matrix'}</span>
            </button>

            <button onclick="autoFitNvrToBom()" class="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer" title="Auto-Fit Server/NVR to BOM based on required Usable TB and Genetec Archiver throughput">
              <i data-lucide="wand-2" class="w-3.5 h-3.5"></i>
              <span>Auto-Fit Server</span>
            </button>
          </div>
        </div>

        <!-- Row 2: Parameter Controls Grid -->
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-2 text-xs">
          <!-- 1. Camera Count & Source -->
          <div class="flex flex-col gap-1 bg-slate-950/90 border border-slate-800 rounded-xl px-2.5 py-1.5">
            <div class="flex items-center justify-between">
              <span class="text-[9px] font-bold uppercase text-slate-400">1. Cameras</span>
              <button onclick="setVideoSizerParam('sourceMode', '${vCalc.sourceMode === 'bom' ? 'manual' : 'bom'}')" class="text-[9px] font-mono px-1.5 py-0.2 rounded ${vCalc.sourceMode === 'bom' ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60' : 'bg-slate-800 text-slate-300'} cursor-pointer" title="Switch between BOM cameras and Manual camera count">
                ${vCalc.sourceMode === 'bom' ? `BOM (${vCalc.bomCameraUnits})` : 'Manual'}
              </button>
            </div>
            <div class="flex items-center gap-1">
              <input type="number" min="1" max="5000" value="${vCalc.totalCameras}" onchange="setVideoSizerParam('manualCameraCount', Math.max(1, parseInt(this.value, 10) || 1))" class="w-full bg-slate-900 border border-slate-700/80 rounded px-2 py-0.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-purple-500" />
              <span class="text-[10px] text-slate-400 font-mono">Cam</span>
            </div>
          </div>

          <!-- 2. Resolution -->
          <div class="flex flex-col gap-1 bg-slate-950/90 border border-slate-800 rounded-xl px-2.5 py-1.5">
            <span class="text-[9px] font-bold uppercase text-slate-400">2. Resolution</span>
            <select onchange="setVideoSizerParam('resolutionMp', Number(this.value))" class="bg-slate-900 border border-slate-700/80 rounded px-1.5 py-0.5 text-white font-bold text-xs focus:outline-none cursor-pointer">
              ${[
                { mp: 1, label: "1MP (720p HD)" },
                { mp: 2, label: "2MP (1080p FHD)" },
                { mp: 3, label: "3MP (2048x1536)" },
                { mp: 4, label: "4MP (2K QHD)" },
                { mp: 5, label: "5MP (2592x1944)" },
                { mp: 6, label: "6MP (3072x2048)" },
                { mp: 8, label: "8MP (4K UHD)" },
                { mp: 12, label: "12MP (Fisheye)" },
                { mp: 16, label: "16MP (Multi-Sensor)" },
                { mp: 20, label: "20MP (4x5MP)" },
                { mp: 32, label: "32MP (4x8MP 4K)" }
              ].map(r => `<option value="${r.mp}" class="bg-slate-900" ${vCalc.resolutionMp === r.mp ? 'selected' : ''}>${r.label}</option>`).join('')}
            </select>
          </div>

          <!-- 3. Frame Rate (FPS) -->
          <div class="flex flex-col gap-1 bg-slate-950/90 border border-slate-800 rounded-xl px-2.5 py-1.5">
            <span class="text-[9px] font-bold uppercase text-slate-400">3. Frame Rate</span>
            <select onchange="setVideoSizerParam('fps', Number(this.value))" class="bg-slate-900 border border-slate-700/80 rounded px-1.5 py-0.5 text-white font-bold text-xs focus:outline-none cursor-pointer">
              ${[1, 5, 10, 12, 15, 20, 24, 30, 60].map(f => `<option value="${f}" class="bg-slate-900" ${vCalc.fps === f ? 'selected' : ''}>${f} FPS</option>`).join('')}
            </select>
          </div>

          <!-- 4. Format / Codec (H.264 / H.265 / AV1 / AVI) -->
          <div class="flex flex-col gap-1 bg-slate-950/90 border border-slate-800 rounded-xl px-2.5 py-1.5">
            <span class="text-[9px] font-bold uppercase text-slate-400">4. Format / Codec</span>
            <select onchange="setVideoSizerParam('codec', this.value)" class="bg-slate-900 border border-slate-700/80 rounded px-1.5 py-0.5 text-sky-300 font-bold text-xs focus:outline-none cursor-pointer">
              <option value="H.265" class="bg-slate-900" ${vCalc.codec === 'H.265' ? 'selected' : ''}>H.265 (HEVC)</option>
              <option value="H.265+" class="bg-slate-900" ${vCalc.codec === 'H.265+' ? 'selected' : ''}>H.265+ (Smart Codec)</option>
              <option value="H.264" class="bg-slate-900" ${vCalc.codec === 'H.264' ? 'selected' : ''}>H.264 (AVC)</option>
              <option value="AV1" class="bg-slate-900" ${vCalc.codec === 'AV1' ? 'selected' : ''}>AV1 (Genetec 5.14)</option>
              <option value="AVI" class="bg-slate-900" ${vCalc.codec === 'AVI' ? 'selected' : ''}>AVI / MJPEG (Raw)</option>
            </select>
          </div>

          <!-- 5. Scene Activity -->
          <div class="flex flex-col gap-1 bg-slate-950/90 border border-slate-800 rounded-xl px-2.5 py-1.5">
            <span class="text-[9px] font-bold uppercase text-slate-400">5. Scene Activity</span>
            <select onchange="setVideoSizerParam('sceneActivity', this.value)" class="bg-slate-900 border border-slate-700/80 rounded px-1.5 py-0.5 text-white font-bold text-xs focus:outline-none cursor-pointer">
              <option value="low" class="bg-slate-900" ${vCalc.sceneActivity === 'low' ? 'selected' : ''}>Low (Static 0.65x)</option>
              <option value="medium" class="bg-slate-900" ${vCalc.sceneActivity === 'medium' ? 'selected' : ''}>Medium (Std 1.0x)</option>
              <option value="high" class="bg-slate-900" ${vCalc.sceneActivity === 'high' ? 'selected' : ''}>High (Busy 1.40x)</option>
              <option value="ultra" class="bg-slate-900" ${vCalc.sceneActivity === 'ultra' ? 'selected' : ''}>Very High (1.75x)</option>
            </select>
          </div>

          <!-- 6. Motion vs Continuous Recording -->
          <div class="flex flex-col gap-1 bg-slate-950/90 border border-slate-800 rounded-xl px-2.5 py-1.5">
            <span class="text-[9px] font-bold uppercase text-slate-400">6. Rec Mode / Duty</span>
            <select onchange="setVideoSizerParam('motionDuty', Number(this.value))" class="bg-slate-900 border border-slate-700/80 rounded px-1.5 py-0.5 text-white font-bold text-xs focus:outline-none cursor-pointer">
              <option value="1" class="bg-slate-900" ${vCalc.motionDutyPct >= 100 ? 'selected' : ''}>Continuous 24/7 (100%)</option>
              <option value="0.75" class="bg-slate-900" ${vCalc.motionDutyPct === 75 ? 'selected' : ''}>Motion High (18h / 75%)</option>
              <option value="0.7" class="bg-slate-900" ${vCalc.motionDutyPct === 70 ? 'selected' : ''}>Motion Commercial (70%)</option>
              <option value="0.5" class="bg-slate-900" ${vCalc.motionDutyPct === 50 ? 'selected' : ''}>Motion Medium (12h / 50%)</option>
              <option value="0.25" class="bg-slate-900" ${vCalc.motionDutyPct === 25 ? 'selected' : ''}>Motion Low (6h / 25%)</option>
            </select>
          </div>

          <!-- 7. Retention Days -->
          <div class="flex flex-col gap-1 bg-slate-950/90 border border-slate-800 rounded-xl px-2.5 py-1.5">
            <span class="text-[9px] font-bold uppercase text-slate-400">7. Retention</span>
            <select onchange="setVideoSizerParam('retentionDays', Number(this.value))" class="bg-slate-900 border border-slate-700/80 rounded px-1.5 py-0.5 text-white font-bold text-xs focus:outline-none cursor-pointer">
              ${[7, 14, 15, 30, 45, 60, 90, 120, 180, 365].map(d => `<option value="${d}" class="bg-slate-900" ${vCalc.retentionDays === d ? 'selected' : ''}>${d} Days</option>`).join('')}
            </select>
          </div>

          <!-- 8. RAID Level -->
          <div class="flex flex-col gap-1 bg-slate-950/90 border border-slate-800 rounded-xl px-2.5 py-1.5">
            <span class="text-[9px] font-bold uppercase text-slate-400">8. RAID Level</span>
            <select onchange="setVideoSizerParam('raidType', this.value)" class="bg-slate-900 border border-slate-700/80 rounded px-1.5 py-0.5 text-amber-300 font-bold text-xs focus:outline-none cursor-pointer">
              <option value="RAID 5" class="bg-slate-900" ${vCalc.raidLevel === 'RAID 5' ? 'selected' : ''}>RAID 5 (1 Parity)</option>
              <option value="RAID 6" class="bg-slate-900" ${vCalc.raidLevel === 'RAID 6' ? 'selected' : ''}>RAID 6 (2 Parity)</option>
              <option value="RAID 10" class="bg-slate-900" ${vCalc.raidLevel === 'RAID 10' ? 'selected' : ''}>RAID 10 (50% Mirror)</option>
              <option value="RAID 50" class="bg-slate-900" ${vCalc.raidLevel === 'RAID 50' ? 'selected' : ''}>RAID 50 (Dual R5)</option>
              <option value="RAID 60" class="bg-slate-900" ${vCalc.raidLevel === 'RAID 60' ? 'selected' : ''}>RAID 60 (Dual R6)</option>
              <option value="JBOD" class="bg-slate-900" ${vCalc.raidLevel === 'JBOD' ? 'selected' : ''}>JBOD (No Parity)</option>
            </select>
          </div>

          <!-- 9. Genetec Archiver Roles -->
          <div class="flex flex-col gap-1 bg-slate-950/90 border ${g.isArchiverCountVerified ? 'border-slate-800' : 'border-rose-600'} rounded-xl px-2.5 py-1.5">
            <div class="flex items-center justify-between">
              <span class="text-[9px] font-bold uppercase text-slate-400">9. Archiver Roles</span>
              <button onclick="setVideoSizerParam('archiverRoles', 0)" class="text-[9px] font-mono px-1 rounded ${videoArchiverRoles === 0 ? 'bg-purple-900/80 text-purple-200' : 'bg-slate-800 text-slate-400 hover:text-white'} cursor-pointer" title="Reset to Auto-Calculated minimum Archiver roles">
                Auto (${g.minRequiredArchiverRoles})
              </button>
            </div>
            <div class="flex items-center gap-1">
              <input type="number" min="0" max="64" value="${videoArchiverRoles === 0 ? g.activeArchiverRoles : videoArchiverRoles}" onchange="setVideoSizerParam('archiverRoles', Math.max(0, parseInt(this.value, 10) || 0))" class="w-full bg-slate-900 border border-slate-700/80 rounded px-2 py-0.5 text-xs font-mono font-bold ${g.isArchiverCountVerified ? 'text-emerald-400' : 'text-rose-400'} focus:outline-none" title="Enter number of Genetec Archiver roles to verify against bitrate & camera count (0 = Auto)" />
              <span class="text-[10px] text-slate-400 font-mono">Roles</span>
            </div>
          </div>
        </div>

        ${showMatrix ? `
        <!-- Row 3: Detailed Genetec 5.14 Verification & RAID Drive Options Matrix -->
        <div class="grid grid-cols-1 xl:grid-cols-12 gap-3 pt-1">
          <!-- Left Panel (5 cols): Genetec Security Center 5.14.1.0 Archiver & Server Verification -->
          <div class="xl:col-span-5 bg-slate-950/90 border ${g.isFullyCompliant ? 'border-slate-800' : 'border-amber-600/70'} rounded-xl p-3 flex flex-col justify-between gap-2.5">
            <div class="space-y-2">
              <div class="flex items-center justify-between gap-2 flex-wrap">
                <div class="flex items-center gap-1.5">
                  <i data-lucide="shield-check" class="w-4 h-4 ${g.isFullyCompliant ? 'text-emerald-400' : 'text-amber-400'}"></i>
                  <span class="text-[11px] font-bold uppercase tracking-wider text-white">Genetec 5.14 Archiver &amp; Server Verification</span>
                </div>
                <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold ${g.isFullyCompliant ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60' : 'bg-rose-950 text-rose-300 border border-rose-700/60'}">
                  ${g.isFullyCompliant ? '✓ PASS: GENETEC 5.14 VERIFIED' : '⚠ CAPACITY / RULE ALERT'}
                </span>
              </div>

              <!-- Server Profile & Encryption Modifiers -->
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                <div class="sm:col-span-2 bg-slate-900/90 border border-slate-800 rounded-lg px-2.5 py-1.5">
                  <div class="text-[9px] font-bold uppercase text-slate-400">Genetec 5.14 Server Profile (${g.profile?.referencePage || 'Sec 1.4'})</div>
                  <select onchange="setVideoSizerParam('genetecProfile', this.value)" class="w-full bg-transparent text-sky-300 font-bold text-xs focus:outline-none cursor-pointer mt-0.5">
                    ${profilesList.map(p => `<option value="${p.id}" class="bg-slate-900" ${g.profileKey === p.id ? 'selected' : ''}>${p.label} (Max ${p.maxCamerasPerRole} Cam / ${p.maxBitrateMbpsPerRole} Mbps)</option>`).join('')}
                  </select>
                </div>
                <div class="bg-slate-900/90 border border-slate-800 rounded-lg px-2.5 py-1.5 flex flex-col justify-center">
                  <div class="text-[9px] font-bold uppercase text-slate-400">Fusion Encryption (p.10)</div>
                  <select onchange="setVideoSizerParam('encryptionCerts', Number(this.value))" class="w-full bg-transparent text-slate-200 font-bold text-xs focus:outline-none cursor-pointer mt-0.5">
                    <option value="0" class="bg-slate-900" ${g.encryptionCerts === 0 ? 'selected' : ''}>0 Certs (100% Cap)</option>
                    <option value="1" class="bg-slate-900" ${g.encryptionCerts === 1 ? 'selected' : ''}>1 Cert (-30% Cap)</option>
                    <option value="5" class="bg-slate-900" ${g.encryptionCerts === 5 ? 'selected' : ''}>5 Certs (-41% Cap)</option>
                    <option value="10" class="bg-slate-900" ${g.encryptionCerts === 10 ? 'selected' : ''}>10 Certs (-52% Cap)</option>
                    <option value="20" class="bg-slate-900" ${g.encryptionCerts === 20 ? 'selected' : ''}>20 Certs (-68% Cap)</option>
                  </select>
                </div>
              </div>

              <!-- Per-Archiver & Per-Server Load Mapping Grid -->
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center pt-1">
                <div class="p-2 rounded-lg bg-slate-900/70 border border-slate-800/90">
                  <div class="text-[9px] font-mono uppercase text-slate-400">Archiver Roles</div>
                  <div class="text-sm font-mono font-bold ${g.isArchiverCountVerified ? 'text-emerald-400' : 'text-rose-400'}">${g.activeArchiverRoles} <span class="text-[10px] text-slate-400">/ ${g.minRequiredArchiverRoles} Min</span></div>
                  <div class="text-[9px] text-slate-500">Limit: ${g.effectiveMaxMbpsPerArchiver} Mbps</div>
                </div>
                <div class="p-2 rounded-lg bg-slate-900/70 border border-slate-800/90">
                  <div class="text-[9px] font-mono uppercase text-slate-400">Load / Archiver</div>
                  <div class="text-sm font-mono font-bold text-sky-400">${g.bitratePerArchiverRoleMbps} Mbps</div>
                  <div class="text-[9px] text-slate-500">${g.camerasPerArchiverRole} Streams / Role</div>
                </div>
                <div class="p-2 rounded-lg bg-slate-900/70 border border-slate-800/90">
                  <div class="text-[9px] font-mono uppercase text-slate-400">Storage / Role</div>
                  <div class="text-sm font-mono font-bold text-purple-300">${g.usableTbPerArchiverRole} TB</div>
                  <div class="text-[9px] text-slate-500">Usable per Role</div>
                </div>
                <div class="p-2 rounded-lg bg-slate-900/70 border border-slate-800/90">
                  <div class="text-[9px] font-mono uppercase text-slate-400">Servers Needed</div>
                  <div class="text-sm font-mono font-bold text-amber-300">${g.recommendedArchiverServers} Archiver${g.requiresDedicatedDirectoryServer ? ' + 1 Dir' : ''}</div>
                  <div class="text-[9px] text-slate-500">${g.usableTbPerServer} TB Usable / Srv</div>
                </div>
              </div>
            </div>

            <!-- Hardware Spec & Genetec Rule Alerts -->
            <div class="space-y-1.5 border-t border-slate-800/80 pt-2 text-[11px]">
              <div class="flex items-center justify-between text-slate-300 font-mono text-[10px]">
                <span>Min Spec: <strong class="text-white">${g.profile?.cpuSpec || ''} • ${g.profile?.ramGb || 16}GB RAM • ${g.profile?.nicSpec || '1 GbE'}</strong></span>
                <span>Daily: <strong class="text-sky-300">${vCalc.dailyStorageGb} GB/day</strong></span>
              </div>
              ${(g.findings && g.findings.length > 0) ? g.findings.map(f => `
                <div class="px-2.5 py-1.5 rounded-lg text-[10px] font-medium flex items-start gap-1.5 ${f.severity === 'critical' ? 'bg-rose-950/70 border border-rose-700/70 text-rose-200' : f.severity === 'warning' ? 'bg-amber-950/70 border border-amber-700/70 text-amber-200' : 'bg-sky-950/70 border border-sky-700/70 text-sky-200'}">
                  <i data-lucide="${f.severity === 'critical' ? 'alert-octagon' : f.severity === 'warning' ? 'alert-triangle' : 'info'}" class="w-3.5 h-3.5 shrink-0 mt-0.5"></i>
                  <span>${f.text}</span>
                </div>
              `).join('') : `
                <div class="px-2.5 py-1 rounded-lg bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 text-[10px] flex items-center gap-1.5">
                  <i data-lucide="check-circle-2" class="w-3.5 h-3.5 shrink-0"></i>
                  <span>All Genetec 5.14 throughput, camera count, directory isolation, and RAID disk spindle rules satisfied.</span>
                </div>
              `}
            </div>
          </div>

          <!-- Right Panel (7 cols): RAID Level Drive Size & Drive Count Options Matrix -->
          <div class="xl:col-span-7 bg-slate-950/90 border border-slate-800 rounded-xl p-3 flex flex-col justify-between gap-2">
            <div class="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div class="flex items-center gap-2">
                  <i data-lucide="database" class="w-4 h-4 text-amber-400"></i>
                  <span class="text-[11px] font-bold uppercase tracking-wider text-white">${vCalc.raidLevel} Drive Size &amp; Bay Count Options</span>
                  <span class="text-[10px] font-mono text-slate-400">(${vCalc.raidDescription || ''})</span>
                </div>
              </div>
              <span class="text-[10px] font-mono text-purple-300 bg-purple-950/60 border border-purple-700/50 px-2 py-0.5 rounded">
                Selected Plan: <strong>${dp.totalDrives || 0}x ${dp.driveSizeTb || 16}TB</strong> = <strong>${dp.rawStorageTb || 0} TB Raw</strong> (${dp.usableStorageTb || 0} TB Usable)
              </span>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse text-[11px] font-mono">
                <thead>
                  <tr class="border-b border-slate-800 text-[9px] uppercase text-slate-400">
                    <th class="py-1.5 px-2">Drive Size</th>
                    <th class="py-1.5 px-2">Total Drives</th>
                    <th class="py-1.5 px-2">Data + Parity</th>
                    <th class="py-1.5 px-2">Drives / Server</th>
                    <th class="py-1.5 px-2">Total Raw TB</th>
                    <th class="py-1.5 px-2">Usable TB (Eff%)</th>
                    <th class="py-1.5 px-2">Chassis Bay Fit</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-800/60">
                  ${(vCalc.driveOptionsMatrix || []).map(opt => {
                    const isSelected = opt.driveSizeTb === vCalc.preferredDriveSizeTb;
                    const warn12 = g.requires12DriveRaidArray && !opt.meetsGenetec12DriveHighPerf;
                    return `
                      <tr onclick="setVideoSizerParam('preferredDriveTb', ${opt.driveSizeTb})" class="cursor-pointer transition-colors ${isSelected ? 'bg-purple-950/50 text-white font-bold' : 'hover:bg-slate-900/80 text-slate-300'}">
                        <td class="py-1.5 px-2 flex items-center gap-1.5">
                          <span class="w-2 h-2 rounded-full ${isSelected ? 'bg-purple-400 ring-2 ring-purple-400/40' : 'bg-slate-700'}"></span>
                          <span class="${isSelected ? 'text-purple-300 font-bold' : 'text-white'}">${opt.driveSizeTb} TB HDD</span>
                        </td>
                        <td class="py-1.5 px-2 text-amber-300 font-bold">${opt.totalDrives} Drives</td>
                        <td class="py-1.5 px-2 text-slate-400">${opt.totalDataDrives}D + ${opt.totalParityDrives}P</td>
                        <td class="py-1.5 px-2 ${warn12 ? 'text-amber-400' : 'text-sky-300'}">
                          ${opt.drivesPerServer} / srv
                          ${opt.meetsGenetec12DriveHighPerf ? '<span class="ml-1 px-1 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/50 text-[8px]" title="Meets Genetec 5.14 ≥12-disk RAID 5/6 requirement for 300-500 Mbps">≥12✓</span>' : ''}
                        </td>
                        <td class="py-1.5 px-2 text-white">${opt.rawStorageTb} TB</td>
                        <td class="py-1.5 px-2 text-emerald-400">${opt.usableStorageTb} TB <span class="text-slate-500">(${opt.efficiencyPct}%)</span></td>
                        <td class="py-1.5 px-2 text-[10px] text-slate-300">${opt.chassisFormFactor}</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        ` : ''}
      </div>
    `;
  } else if (currentMode === "access_control") {
    // Phase B.3: Interactive Access Control Door Package Builder Strip
    container.classList.remove("hidden");
    container.innerHTML = `
      <div class="bg-slate-900/95 border border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 shadow-md">
        <div class="flex items-center gap-3">
          <div class="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
            <i data-lucide="door-closed" class="w-5 h-5"></i>
          </div>
          <div>
            <h4 class="text-xs font-bold text-white uppercase tracking-wider">Access Control Door Package Builder</h4>
            <p class="text-[11px] text-slate-400">1-Click complete door kit assembly (Controller + OSDP Reader + Lock + REX + Door Contact).</p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <div class="flex items-center gap-2 bg-slate-950/90 border border-slate-800 rounded-xl px-3 py-1.5">
            <span class="text-[10px] font-bold uppercase text-slate-400">Door Type:</span>
            <select onchange="window.doorPkgPreset = this.value; doorPkgPreset = this.value;" class="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer">
              <option value="standard_strike" class="bg-slate-900" ${doorPkgPreset === 'standard_strike' ? 'selected' : ''}>Standard Interior/Mortise Door (Mercury LP1502 + HID Signo 40 + HES 1006 + DS160 REX + 180-12 DPS)</option>
              <option value="rim_exit_strike" class="bg-slate-900" ${doorPkgPreset === 'rim_exit_strike' ? 'selected' : ''}>Crash-Bar Rim Exit Door (Mercury LP1502 + HID Signo 40 + HES 9600 Surface Strike + DS160 REX + 180-12 DPS)</option>
              <option value="perimeter_maglock" class="bg-slate-900" ${doorPkgPreset === 'perimeter_maglock' ? 'selected' : ''}>Perimeter / Gate Maglock Door (Mercury LP1502 + HID Signo 40 + Securitron M62 + DS160 REX + 1078C Armored DPS)</option>
              <option value="ip_edge_door" class="bg-slate-900" ${doorPkgPreset === 'ip_edge_door' ? 'selected' : ''}>Single-Door PoE+ Edge Kit (Axis A1001 PoE+ Controller + HID Signo 40 + HES 1006 + DS160 REX + 180-12 DPS)</option>
            </select>
          </div>

          <div class="flex items-center gap-2 bg-slate-950/90 border border-slate-800 rounded-xl px-3 py-1.5">
            <span class="text-[10px] font-bold uppercase text-slate-400">Door Qty:</span>
            <input type="number" min="1" max="64" value="${doorPkgQty || 1}" onchange="window.doorPkgQty = Math.max(1, parseInt(this.value, 10) || 1); doorPkgQty = window.doorPkgQty;" class="w-14 bg-slate-900 border border-slate-700 rounded-lg px-2 py-0.5 text-center text-xs font-bold text-white focus:outline-none" />
          </div>

          <button onclick="addDoorPackageToBom()" class="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer">
            <i data-lucide="package-plus" class="w-4 h-4"></i>
            <span>+ Add Door Package to BOM</span>
          </button>
        </div>
      </div>
    `;
  } else {
    // Sizer placeholder for emerging domains
    container.classList.remove("hidden");
    container.innerHTML = `
      <div class="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-4 shadow-md">
        <div class="flex items-center gap-3">
          <div class="p-2.5 rounded-xl bg-brand-500/10 border border-brand-500/30 text-brand-400 shrink-0">
            <i data-lucide="sparkles" class="w-5 h-5"></i>
          </div>
          <div>
            <h4 class="text-xs font-bold text-white uppercase tracking-wider">
              ${DOMAIN_DEFINITIONS[activeDomain]?.label || "Active Domain"} &bull; ${currentMode.replace('_', ' ').toUpperCase()}
            </h4>
            <p class="text-[11px] text-slate-400">Interactive hardware sizing and cross-domain load fitting engine.</p>
          </div>
        </div>
      </div>
    `;
  }

  const calcContainer = document.getElementById("calculatorStripContainer");
  if (calcContainer) safeCreateIcons(calcContainer);
}

function setVideoSizerParam(key, val) {
  if (key === "retentionDays") {
    videoRetentionDays = val; window.videoRetentionDays = val;
    if (typeof VideoStorageSizer !== "undefined") VideoStorageSizer.state.retentionDays = val;
  } else if (key === "codec") {
    videoCodec = val; window.videoCodec = val;
    if (typeof VideoStorageSizer !== "undefined") VideoStorageSizer.state.codec = val;
  } else if (key === "fps") {
    videoFps = val; window.videoFps = val;
    if (typeof VideoStorageSizer !== "undefined") VideoStorageSizer.state.fps = val;
  } else if (key === "motionDuty") {
    videoMotionDuty = val; window.videoMotionDuty = val;
    if (typeof VideoStorageSizer !== "undefined") {
      VideoStorageSizer.state.recordingMode = val >= 1 ? "continuous" : "motion";
      VideoStorageSizer.state.motionDutyPct = Math.round(val * 100);
    }
  } else if (key === "raidType") {
    videoRaidType = val; window.videoRaidType = val;
    if (typeof VideoStorageSizer !== "undefined") VideoStorageSizer.state.raidLevel = val;
  } else if (key === "sourceMode") {
    videoSourceMode = val; window.videoSourceMode = val;
    if (typeof VideoStorageSizer !== "undefined") VideoStorageSizer.state.sourceMode = val;
  } else if (key === "manualCameraCount") {
    videoManualCamCount = val; window.videoManualCamCount = val;
    videoSourceMode = "manual"; window.videoSourceMode = "manual";
    if (typeof VideoStorageSizer !== "undefined") {
      VideoStorageSizer.state.manualCameraCount = val;
      VideoStorageSizer.state.sourceMode = "manual";
    }
  } else if (key === "resolutionMp") {
    videoResolutionMp = val; window.videoResolutionMp = val;
    if (typeof VideoStorageSizer !== "undefined") {
      VideoStorageSizer.state.resolutionMp = val;
      VideoStorageSizer.state.useManualResolutionOnBom = true;
    }
  } else if (key === "sceneActivity") {
    videoSceneActivity = val; window.videoSceneActivity = val;
    if (typeof VideoStorageSizer !== "undefined") VideoStorageSizer.state.sceneActivity = val;
  } else if (key === "preferredDriveTb") {
    videoPreferredDriveTb = val; window.videoPreferredDriveTb = val;
    if (typeof VideoStorageSizer !== "undefined") VideoStorageSizer.state.preferredDriveSizeTb = val;
  } else if (key === "genetecProfile") {
    videoGenetecProfile = val; window.videoGenetecProfile = val;
    if (typeof VideoStorageSizer !== "undefined") VideoStorageSizer.state.genetecProfile = val;
  } else if (key === "archiverRoles") {
    videoArchiverRoles = val; window.videoArchiverRoles = val;
    if (typeof VideoStorageSizer !== "undefined") VideoStorageSizer.state.archiverRolesCount = val;
  } else if (key === "encryptionCerts") {
    videoEncryptionCerts = val; window.videoEncryptionCerts = val;
    if (typeof VideoStorageSizer !== "undefined") VideoStorageSizer.state.encryptionCerts = val;
  } else if (key === "softwareMotion") {
    videoSoftwareMotion = Boolean(val); window.videoSoftwareMotion = Boolean(val);
    if (typeof VideoStorageSizer !== "undefined") VideoStorageSizer.state.softwareMotionDetection = Boolean(val);
  } else if (key === "toggleDetails") {
    videoShowDetailsPanel = Boolean(val); window.videoShowDetailsPanel = Boolean(val);
  }
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
  if (typeof updateProjectHealthUI === "function") updateProjectHealthUI();
}
window.setVideoSizerParam = setVideoSizerParam;

function autoFitNvrToBom() {
  if (typeof VideoStorageSizer === "undefined") return;
  const vCalc = VideoStorageSizer.calculateFromBOM(projectBOM, {
    sourceMode: videoSourceMode,
    manualCameraCount: videoManualCamCount,
    resolutionMp: videoResolutionMp,
    retentionDays: videoRetentionDays,
    codec: videoCodec,
    fps: videoFps,
    motionDutyCycle: videoMotionDuty,
    sceneActivity: videoSceneActivity,
    raidType: videoRaidType,
    preferredDriveSizeTb: videoPreferredDriveTb,
    genetecProfile: videoGenetecProfile,
    archiverRolesCount: videoArchiverRoles,
    encryptionCerts: videoEncryptionCerts,
    softwareMotionDetection: videoSoftwareMotion
  });

  const targetTB = Math.max(16, vCalc.requiredUsableTB || 16);
  const targetMbps = Math.max(50, vCalc.peakIngressMbps || 50);
  const minArchiverServers = (vCalc.genetec && vCalc.genetec.recommendedArchiverServers) ? vCalc.genetec.recommendedArchiverServers : 1;

  const servers = (typeof SERVERS_DATABASE !== "undefined")
    ? SERVERS_DATABASE.filter(s => s.serverType !== "access_security_host")
    : [];
  if (servers.length === 0) return;

  // Sort NVRs ascending by usableStorageTb
  const getCap = s => Number(s.usableStorageTb ?? s.usableStorageTB ?? s.rawStorageTb ?? s.rawStorageTB ?? 0);
  const getBw = s => Number(s.maxIngestBandwidthMbps ?? s.maxThroughputMbps ?? 450);
  const sorted = [...servers].sort((a, b) => getCap(a) - getCap(b));

  // If 1 server is sufficient for Genetec roles, try to find a single appliance that fits both TB and Mbps
  const singleFit = minArchiverServers === 1
    ? sorted.find(s => getCap(s) >= targetTB && getBw(s) >= targetMbps)
    : null;

  if (singleFit && typeof addToBOM === "function") {
    addToBOM(singleFit.id || singleFit.sku, 1);
    if (typeof showToast === "function") {
      showToast(`Auto-Fitted 1x ${singleFit.model} (${getCap(singleFit)} TB Usable, ${getBw(singleFit)} Mbps max) for ${vCalc.requiredUsableTB} TB / ${vCalc.peakIngressMbps} Mbps.`, "success");
    }
  } else if (sorted.length > 0 && typeof addToBOM === "function") {
    // Choose the server tier whose per-server usable TB best matches targetTB / minArchiverServers
    const perServerTargetTb = targetTB / minArchiverServers;
    const chosen = sorted.find(s => getCap(s) >= perServerTargetTb) || sorted[sorted.length - 1];
    const cap = getCap(chosen) || 32;
    const bw = getBw(chosen) || 600;
    const qtyByStorage = Math.ceil(targetTB / cap);
    const qtyByBw = Math.ceil(targetMbps / bw);
    const qtyNeeded = Math.max(1, minArchiverServers, qtyByStorage, qtyByBw);

    addToBOM(chosen.id || chosen.sku, qtyNeeded);
    if (typeof showToast === "function") {
      showToast(`Auto-Fitted ${qtyNeeded}x ${chosen.model} (${cap * qtyNeeded} TB Usable, ${bw * qtyNeeded} Mbps max) for ${vCalc.genetec.activeArchiverRoles} Genetec Archiver role(s).`, "success");
    }
  }
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
}
window.autoFitNvrToBom = autoFitNvrToBom;

function addDoorPackageToBom() {
  const doors = Math.max(1, parseInt(doorPkgQty, 10) || 1);
  const preset = doorPkgPreset || "standard_strike";
  if (typeof addToBOM !== "function") return;

  if (preset === "ip_edge_door") {
    addToBOM("axis-a1001", doors);
    addToBOM("hid-signo-40", doors);
    addToBOM("hes-1006-electric-strike", doors);
    addToBOM("bosch-ds160-rex", doors);
    addToBOM("gri-180-12-dps", doors);
  } else {
    const controllersNeeded = Math.ceil(doors / 2);
    addToBOM("mercury-lp1502", controllersNeeded);
    if (controllersNeeded >= 2) {
      addToBOM("altronix-trove2m2", Math.ceil(controllersNeeded / 4));
    }
    addToBOM("hid-signo-40", doors);
    if (preset === "rim_exit_strike") {
      addToBOM("hes-9600-surface-strike", doors);
      addToBOM("gri-180-12-dps", doors);
    } else if (preset === "perimeter_maglock") {
      addToBOM("securitron-m62-maglock", doors);
      addToBOM("sentrol-1078c-dps", doors);
    } else {
      addToBOM("hes-1006-electric-strike", doors);
      addToBOM("gri-180-12-dps", doors);
    }
    addToBOM("bosch-ds160-rex", doors);
  }

  if (typeof showToast === "function") {
    showToast(`Added ${doors}-Door Access Control Package (${preset.replace(/_/g, " ")}) to BOM.`, "success");
  }
  if (typeof updateProjectHealthUI === "function") updateProjectHealthUI();
}
window.addDoorPackageToBom = addDoorPackageToBom;

// -----------------------------------------------------------
// Faceted Filter Interactions
// -----------------------------------------------------------
function setUplinkSpeedFilter(speed) {
  selectedUplinkSpeed = speed;
  buildSidebarFilters();
  runActiveFilter();
}

function setAccSubCategory(catId) {
  selectedAccSubCategory = catId;
  window.selectedAccSubCategory = catId;
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
  if (typeof buildSidebarFilters === "function") buildSidebarFilters();
  if (typeof runActiveFilter === "function") runActiveFilter();
}
window.setAccSubCategory = setAccSubCategory;

function toggleFilterItem(type, val) {
  if (type === "vendor") {
    selectedVendors = selectedVendors.includes(val) ? selectedVendors.filter(v => v !== val) : [...selectedVendors, val];
  } else if (type === "switchLayer") {
    selectedSwitchLayers = selectedSwitchLayers.includes(val) ? selectedSwitchLayers.filter(l => l !== val) : [...selectedSwitchLayers, val];
  } else if (type === "ports") {
    selectedPortCounts = selectedPortCounts.includes(val) ? selectedPortCounts.filter(p => p !== val) : [...selectedPortCounts, val];
  } else if (type === "poeClass") {
    selectedPoEClasses = selectedPoEClasses.includes(val) ? selectedPoEClasses.filter(c => c !== val) : [...selectedPoEClasses, val];
  } else if (type === "fwVendor") {
    selectedFwVendors = selectedFwVendors.includes(val) ? selectedFwVendors.filter(v => v !== val) : [...selectedFwVendors, val];
  } else if (type === "fwCategory") {
    selectedFwCategories = selectedFwCategories.includes(val) ? selectedFwCategories.filter(c => c !== val) : [...selectedFwCategories, val];
  } else if (type === "opticMedium") {
    selectedOpticMediums = selectedOpticMediums.includes(val) ? selectedOpticMediums.filter(m => m !== val) : [...selectedOpticMediums, val];
  } else if (type === "opticSpeed") {
    selectedOpticSpeeds = selectedOpticSpeeds.includes(val) ? selectedOpticSpeeds.filter(s => s !== val) : [...selectedOpticSpeeds, val];
  } else if (type === "opticVendor") {
    selectedOpticVendors = selectedOpticVendors.includes(val) ? selectedOpticVendors.filter(v => v !== val) : [...selectedOpticVendors, val];
  } else if (type === "wlVendor") {
    selectedWlVendors = selectedWlVendors.includes(val) ? selectedWlVendors.filter(v => v !== val) : [...selectedWlVendors, val];
  } else if (type === "wlFreq") {
    selectedWlFrequencies = selectedWlFrequencies.includes(val) ? selectedWlFrequencies.filter(f => f !== val) : [...selectedWlFrequencies, val];
  } else if (type === "formFactor") {
    selectedFormFactors = selectedFormFactors.includes(val) ? selectedFormFactors.filter(f => f !== val) : [...selectedFormFactors, val];
  } else if (type === "accSubCategory") {
    selectedAccSubCategory = (selectedAccSubCategory === val) ? "all" : val;
    window.selectedAccSubCategory = selectedAccSubCategory;
    if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
    if (typeof buildSidebarFilters === "function") buildSidebarFilters();
  } else if (type === "accVendor") {
    selectedAccVendors = selectedAccVendors.includes(val) ? selectedAccVendors.filter(v => v !== val) : [...selectedAccVendors, val];
  } else if (type === "accType") {
    selectedAccTypes = selectedAccTypes.includes(val) ? selectedAccTypes.filter(t => t !== val) : [...selectedAccTypes, val];
  } else if (type === "cableRating") {
    selectedCableRatings = selectedCableRatings.includes(val) ? selectedCableRatings.filter(r => r !== val) : [...selectedCableRatings, val];
  } else if (type === "camVendor") {
    selectedCamVendors = selectedCamVendors.includes(val) ? selectedCamVendors.filter(v => v !== val) : [...selectedCamVendors, val];
  } else if (type === "camFormFactor") {
    selectedCamFormFactors = selectedCamFormFactors.includes(val) ? selectedCamFormFactors.filter(f => f !== val) : [...selectedCamFormFactors, val];
  } else if (type === "camResolution") {
    selectedCamResolutions = selectedCamResolutions.includes(val) ? selectedCamResolutions.filter(r => r !== val) : [...selectedCamResolutions, val];
  } else if (type === "acsVendor") {
    selectedAcsVendors = selectedAcsVendors.includes(val) ? selectedAcsVendors.filter(v => v !== val) : [...selectedAcsVendors, val];
  } else if (type === "acsType") {
    selectedAcsControllerTypes = selectedAcsControllerTypes.includes(val) ? selectedAcsControllerTypes.filter(t => t !== val) : [...selectedAcsControllerTypes, val];
  } else if (type === "srvVendor") {
    selectedSrvVendors = selectedSrvVendors.includes(val) ? selectedSrvVendors.filter(v => v !== val) : [...selectedSrvVendors, val];
  } else if (type === "srvRackUnit") {
    selectedSrvRackUnits = selectedSrvRackUnits.includes(val) ? selectedSrvRackUnits.filter(u => u !== val) : [...selectedSrvRackUnits, val];
  }
  if (typeof buildSidebarFilters === "function") buildSidebarFilters();
  runActiveFilter();
}

// -----------------------------------------------------------
// Master Hardware Filter & Renderer Execution
// -----------------------------------------------------------
function runActiveFilter() {
  const container = document.getElementById("hardwareCardsContainer");
  const countBadge = document.getElementById("resultCount");
  const noResults = document.getElementById("noResultsState");
  const sortSelector = document.getElementById("sortSelector");

  if (!container) return;
  if (sortSelector) currentSortMode = sortSelector.value;

  try {
    if (typeof renderActiveFilterPills === "function") renderActiveFilterPills();

    let rawDataset = [];
    if (typeof CatalogRegistry !== "undefined" && typeof CatalogRegistry.getDatasetForMode === "function") {
      rawDataset = [...CatalogRegistry.getDatasetForMode(currentMode)];
    } else if (currentMode === "access") {
      rawDataset = (typeof SWITCH_DATABASE !== "undefined" ? SWITCH_DATABASE : []).filter(s => s.role === "Access");
    } else if (currentMode === "backbone") {
      rawDataset = (typeof SWITCH_DATABASE !== "undefined" ? SWITCH_DATABASE : []).filter(s => s.role === "Core" || s.role === "Aggregation");
    } else if (currentMode === "firewalls") {
      rawDataset = (typeof FIREWALL_DATABASE !== "undefined") ? FIREWALL_DATABASE : [];
    } else if (currentMode === "optics") {
      rawDataset = (typeof OPTICS_LIST !== "undefined") ? OPTICS_LIST : [];
    } else if (currentMode === "wireless") {
      rawDataset = (typeof WIRELESS_DATABASE !== "undefined") ? WIRELESS_DATABASE : [];
    } else if (currentMode === "accessories") {
      rawDataset = (typeof NETWORKING_ACCESSORIES !== "undefined") ? NETWORKING_ACCESSORIES : (typeof ACCESSORY_DATABASE !== "undefined" ? ACCESSORY_DATABASE : []);
    } else if (currentMode === "enclosures") {
      rawDataset = (typeof ENCLOSURES_DATABASE !== "undefined") ? ENCLOSURES_DATABASE : [];
    } else if (currentMode === "pdus") {
      rawDataset = (typeof PDUS_DATABASE !== "undefined") ? PDUS_DATABASE : [];
    } else if (currentMode === "ups") {
      rawDataset = (typeof UPS_DATABASE !== "undefined") ? UPS_DATABASE : [];
    } else if (currentMode === "power_cords") {
      rawDataset = (typeof POWER_CORDS_DATABASE !== "undefined") ? POWER_CORDS_DATABASE : [];
    }

    // Execute pluggable FilterEngine
    let results = (typeof FilterEngine !== "undefined" && typeof FilterEngine.apply === "function")
      ? FilterEngine.apply(currentMode, rawDataset, {
          searchQuery: activeSearchQuery,
          currentMode,
          selectedVendors,
          selectedPortCounts,
          selectedPoEClasses,
          selectedUplinkSpeed,
          requireDemandFit,
          selectedFormFactors,
          requireFanless,
          requirePoEPowered,
          requireDcPower,
          requireLayer3,
          selectedSwitchLayers,
          requirePoEBt90,
          requireIndustrialHardened,
          requireModularUplink: (typeof requireModularUplink !== "undefined" ? requireModularUplink : window.requireModularUplink),
          selectedFwVendors,
          selectedFwCategories,
          fwTargetThroughputGbps,
          fwTargetThreatMbps,
          requireFwCellular,
          requireFwDualPsu,
          requireFwRackmount,
          requireFw10GWan,
          requireFwPoePorts,
          requireFwHA,
          requireFw25GWan,
          requireFwStorage,
          selectedOpticMediums,
          selectedOpticSpeeds,
          selectedOpticVendors,
          selectedOpticFormFactor,
          selectedOpticReach,
          requireOpticIndustrial,
          requireOpticBiDi,
          wlTargetDistanceMiles,
          wlTargetThroughputMbps,
          selectedWlTopologyRole,
          selectedCompatibleMasterSku,
          minWlStations,
          selectedWlVendors,
          selectedWlFrequencies,
          selectedWlRangeTier,
          requireWl60GHz,
          requireWlBackup5G,
          selectedAccSubCategory,
          selectedAccVendors,
          selectedAccTypes,
          selectedAccMounting,
          accMinPowerWatts,
          selectedUpsCategory,
          selectedUpsVoltage,
          selectedUpsInputPlug,
          requireUpsSineWave,
          requireUpsOnline,
          requireUpsEbm,
          requireUpsNetworked,
          selectedPduNetworkType,
          selectedPduPlugType,
          selectedPduReceptacleType,
          selectedPduMinOutlets,
          requirePduManaged,
          requirePduDisplay,
          selectedCordPlugType,
          selectedCordLength,
          selectedCordColor,
          selectedCordGauge,
          requireCordLocking,
          selectedCableRatings,
          requireCableShielded,
          selectedDacLength,
          selectedPatchCordLength,
          requireEtherlighting,
          selectedCamVendors,
          selectedCamFormFactors,
          selectedCamResolutions,
          requireCamAnalytics,
          requireCamVandal,
          requireCamTaa,
          selectedAcsVendors,
          selectedAcsControllerTypes,
          selectedAcsPowerSource,
          requireAcsOsdp,
          selectedSrvVendors,
          selectedSrvRackUnits,
          minSrvStorageTb,
          requireSrvDualPsu
        })
      : (activeSearchQuery && typeof matchesSearchTokens === "function")
        ? rawDataset.filter(item => matchesSearchTokens(item, activeSearchQuery))
        : rawDataset;

    // Sorting
    results.sort((a, b) => {
      if (currentSortMode === "price_asc") return (a.msrp || 0) - (b.msrp || 0);
      if (currentSortMode === "price_desc") return (b.msrp || 0) - (a.msrp || 0);
      if (currentSortMode === "poe_desc") return (b.poeBudget || 0) - (a.poeBudget || 0);
      if (currentSortMode === "buffer_desc") return (b.packetBufferMb || 0) - (a.packetBufferMb || 0);
      if (currentSortMode === "ports_desc") return (b.ports || 0) - (a.ports || 0);
      return 0;
    });

    if (countBadge) countBadge.innerText = results.length;

    if (results.length === 0) {
      container.innerHTML = "";
      if (noResults) {
        noResults.classList.remove("hidden");
        const emptyTitle = noResults.querySelector("h3");
        const emptyDesc = noResults.querySelector("p");
        const currentLabel = (currentMode || "hardware").replace(/_/g, " ");
        if (emptyTitle) {
          emptyTitle.innerText = activeSearchQuery 
            ? "No matching hardware found in this category"
            : `No ${currentLabel} models loaded yet`;
        }
        if (emptyDesc) {
          emptyDesc.innerText = activeSearchQuery
            ? "Try clearing search terms or explore matching products found in other categories below."
            : `Catalog database for ${currentLabel} will populate once its domain data payload is configured.`;
        }

        // Render cross-domain matches if found
        const suggestBox = document.getElementById("noResultsCrossCategorySuggestions");
        if (suggestBox) {
          if (activeSearchQuery && typeof GlobalSearchEngine !== "undefined" && typeof GlobalSearchEngine.search === "function") {
            const searchData = GlobalSearchEngine.search(activeSearchQuery, "all", 6);
            const otherMatches = (searchData.results || []).filter(r => r.target?.mode !== currentMode);
            if (otherMatches.length > 0) {
              suggestBox.classList.remove("hidden");
              suggestBox.innerHTML = `
                <div class="p-3.5 bg-brand-950/40 border border-brand-800/60 rounded-2xl text-xs text-brand-300 space-y-2.5">
                  <div class="font-bold flex items-center justify-center gap-1.5 text-white">
                    <i data-lucide="compass" class="w-4 h-4 text-brand-400"></i>
                    Found ${otherMatches.length} matching product${otherMatches.length === 1 ? '' : 's'} in other catalog sections:
                  </div>
                  <div class="flex flex-wrap items-center justify-center gap-2">
                    ${otherMatches.map(m => `
                      <button onclick="GlobalSearchEngine.navigateTo('${escapeHTML(m.sku)}')" class="px-3 py-1.5 bg-slate-900 hover:bg-brand-600 border border-slate-700 hover:border-brand-500 rounded-xl text-white font-medium flex items-center gap-1.5 transition-all shadow-sm cursor-pointer group">
                        <span class="text-[10px] text-brand-300 font-mono font-bold">${escapeHTML(m.target.modeLabel)}:</span>
                        <span class="font-bold">${escapeHTML(m.model)}</span>
                        <i data-lucide="arrow-right" class="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-colors"></i>
                      </button>
                    `).join('')}
                  </div>
                </div>
              `;
              if (typeof safeCreateIcons === "function") safeCreateIcons(suggestBox);
            } else {
              suggestBox.classList.add("hidden");
              suggestBox.innerHTML = "";
            }
          } else {
            suggestBox.classList.add("hidden");
            suggestBox.innerHTML = "";
          }
        }
      }
      return;
    }

    if (noResults) noResults.classList.add("hidden");

    if (currentMode === "access" || currentMode === "backbone") {
      container.innerHTML = results.map(sw => renderSwitchCard(sw)).join("");
    } else if (currentMode === "firewalls") {
      container.innerHTML = results.map(fw => renderFirewallCard(fw)).join("");
    } else if (currentMode === "optics") {
      container.innerHTML = results.map(opt => renderOpticCard(opt)).join("");
    } else if (currentMode === "wireless") {
      container.innerHTML = results.map(wl => renderWirelessCard(wl)).join("");
    } else if (currentMode === "accessories") {
      container.innerHTML = results.map(acc => renderAccessoryCard(acc)).join("");
    } else if (typeof renderCardByDomain === "function") {
      container.innerHTML = results.map(it => renderCardByDomain(it, currentMode)).join("");
    }

    safeCreateIcons(container);
  } catch (err) {
    console.error("[runActiveFilter] Exception running filter:", err);
    container.innerHTML = "";
    if (noResults) noResults.classList.remove("hidden");
  }
}

// -----------------------------------------------------------
// Global Toast Notification Utility
// -----------------------------------------------------------
let toastTimer = null;
function showToast(msg) {
  const toast = document.getElementById("toastNotification");
  const toastMsg = document.getElementById("toastMessage");
  if (!toast || !toastMsg) return;

  toastMsg.innerText = msg;
  toast.classList.remove("translate-y-20", "opacity-0");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.add("translate-y-20", "opacity-0");
  }, 2800);
}

// ===========================================================
// Centralized Navigation History & Backstack Architecture
// ===========================================================
const NavigationHistory = {
  stack: [],

  push(state) {
    if (!state || !state.tool) return;
    const top = this.stack[this.stack.length - 1];
    if (top && top.tool === state.tool && top.targetId === state.targetId && top.view === state.view && top.floorId === state.floorId) {
      return;
    }
    this.stack.push(state);
    if (this.stack.length > 25) this.stack.shift();
  },

  pop() {
    return this.stack.pop();
  },

  peek() {
    return this.stack[this.stack.length - 1];
  },

  clear() {
    this.stack = [];
  },

  captureCurrentState() {
    // 1. Physical Layout Modal
    const physModal = document.getElementById("cableLayoutModal");
    if (physModal && !physModal.classList.contains("hidden")) {
      return {
        tool: "physical",
        floorId: typeof activeFloorId !== "undefined" ? activeFloorId : null,
        selectedNodeId: typeof selectedNodeId !== "undefined" ? selectedNodeId : null
      };
    }

    // 2. Topology Modal
    const topoModal = document.getElementById("topologyModal");
    if (topoModal && !topoModal.classList.contains("hidden")) {
      return {
        tool: "topology",
        nodeId: typeof selectedTopologyNodeId !== "undefined" ? selectedTopologyNodeId : null,
        rackLoc: typeof selectedTopologyRackLoc !== "undefined" ? selectedTopologyRackLoc : null
      };
    }

    // 3. Port Matrix Studio Modal
    const portStudio = document.getElementById("portMatrixStudioModal");
    if (portStudio && !portStudio.classList.contains("hidden")) {
      return { tool: "port_matrix" };
    }

    // 4. Facility Modal (Hierarchy or Visualizer)
    const facModal = document.getElementById("facilityModal");
    if (facModal && !facModal.classList.contains("hidden")) {
      return {
        tool: "facility",
        view: typeof facilityActiveView !== "undefined" ? facilityActiveView : "hierarchy",
        spaceId: typeof activeFacilitySpaceId !== "undefined" ? activeFacilitySpaceId : null,
        floorId: typeof activeFacilityFloorId !== "undefined" ? activeFacilityFloorId : null,
        rackId: typeof activeRackId !== "undefined" ? activeRackId : null
      };
    }

    // 5. BOM Modal / Drawer
    const bomModal = document.getElementById("bomModal");
    const bomDrawer = document.getElementById("bomDrawer");
    if ((bomModal && !bomModal.classList.contains("hidden")) || (bomDrawer && !bomDrawer.classList.contains("translate-x-full"))) {
      return { tool: "bom" };
    }

    return null;
  },

  restoreState(state) {
    if (!state || !state.tool) return false;

    if (state.tool === "physical") {
      if (window.TabManager && typeof window.TabManager.openTab === "function") {
        window.TabManager.openTab("physical_layout");
      } else if (typeof toggleCableLayoutModal === "function") {
        const modal = document.getElementById("cableLayoutModal");
        if (modal && modal.classList.contains("hidden")) toggleCableLayoutModal();
      }
      if (state.floorId && typeof switchActiveFloor === "function") {
        switchActiveFloor(state.floorId);
      }
      if (state.selectedNodeId && typeof selectNode === "function") {
        selectNode(state.selectedNodeId);
      }
      return true;
    }

    if (state.tool === "topology") {
      if (window.TabManager && typeof window.TabManager.openTab === "function") {
        window.TabManager.openTab("topology");
      } else if (typeof toggleTopologyModal === "function") {
        const modal = document.getElementById("topologyModal");
        if (modal && modal.classList.contains("hidden")) toggleTopologyModal();
      }
      if (state.nodeId && typeof selectTopologyNode === "function") {
        selectTopologyNode(state.nodeId);
      }
      return true;
    }

    if (state.tool === "facility") {
      const targetTab = (state.view === "visualizer") ? "enclosures" : "facility";
      if (window.TabManager && typeof window.TabManager.openTab === "function") {
        window.TabManager.openTab(targetTab);
      } else {
        const facModal = document.getElementById("facilityModal");
        if (facModal && facModal.classList.contains("hidden")) {
          if (typeof toggleFacilityModal === "function") toggleFacilityModal();
        }
      }
      if (typeof switchFacilityView === "function") {
        switchFacilityView(state.view || "hierarchy", state.rackId);
      }
      return true;
    }

    if (state.tool === "bom") {
      if (window.TabManager && typeof window.TabManager.openTab === "function") {
        window.TabManager.openTab("bom");
      } else {
        const modal = document.getElementById("bomModal");
        const drawer = document.getElementById("bomDrawer");
        if ((modal && modal.classList.contains("hidden")) || (drawer && drawer.classList.contains("translate-x-full"))) {
          if (typeof toggleBomModal === "function") toggleBomModal();
          else if (typeof toggleBomDrawer === "function") toggleBomDrawer();
        }
      }
      return true;
    }

    if (state.tool === "port_matrix") {
      if (typeof openPortMatrixStudio === "function") openPortMatrixStudio();
      return true;
    }

    return false;
  }
};
window.NavigationHistory = NavigationHistory;

// Universal Master ESC Listener with Overlay Dismiss & Canvas Deselection (Tab-Safe)
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    // 1. Close New Tab dropdown menu if open
    const newTabDropdown = document.getElementById("newTabMenuDropdown");
    if (newTabDropdown && !newTabDropdown.classList.contains("hidden")) {
      e.preventDefault();
      newTabDropdown.classList.add("hidden");
      return;
    }

    // 2. Project Level Menu Dropdown
    const projDropdown = document.getElementById("projectLevelDropdown");
    if (projDropdown && !projDropdown.classList.contains("hidden")) {
      e.preventDefault();
      projDropdown.classList.add("hidden");
      return;
    }

    // 2b. Catalog & Facility Menus
    if (typeof isCatalogExpanded !== "undefined" && isCatalogExpanded) {
      e.preventDefault();
      toggleCatalogExpand(false);
      return;
    }
    if (typeof isFacilityExpanded !== "undefined" && isFacilityExpanded) {
      e.preventDefault();
      toggleFacilityExpand(false);
      return;
    }

    // 3. Global Search Modal (Ctrl+K Command Palette) & Dropdown
    const globalSearchModal = document.getElementById("globalSearchModal");
    if (globalSearchModal && !globalSearchModal.classList.contains("hidden")) {
      e.preventDefault();
      if (typeof GlobalSearchEngine !== "undefined" && typeof GlobalSearchEngine.closeModal === "function") {
        GlobalSearchEngine.closeModal();
      } else {
        globalSearchModal.classList.add("hidden");
      }
      return;
    }

    const globalSearchDropdown = document.getElementById("globalSearchDropdown");
    if (globalSearchDropdown && !globalSearchDropdown.classList.contains("hidden")) {
      e.preventDefault();
      if (typeof GlobalSearchEngine !== "undefined" && typeof GlobalSearchEngine.closeDropdown === "function") {
        GlobalSearchEngine.closeDropdown();
      } else {
        globalSearchDropdown.classList.add("hidden");
      }
      return;
    }

    // 4. True Floating Overlay Dialogs (Sit on top of tabs - close these first)
    const dsModal = document.getElementById("datasheetViewerModal");
    if (dsModal && !dsModal.classList.contains("hidden")) {
      e.preventDefault();
      if (typeof closeDatasheetModal === "function") closeDatasheetModal();
      else dsModal.classList.add("hidden");
      return;
    }

    const imgModal = document.getElementById("productImageModal");
    if (imgModal && !imgModal.classList.contains("hidden")) {
      e.preventDefault();
      if (typeof closeProductImageModal === "function") closeProductImageModal();
      else imgModal.classList.add("hidden");
      return;
    }

    const wizModal = document.getElementById("projectWizardModal");
    if (wizModal && !wizModal.classList.contains("hidden")) {
      e.preventDefault();
      if (typeof closeProjectWizardModal === "function") closeProjectWizardModal();
      else wizModal.classList.add("hidden");
      return;
    }

    const compareModal = document.getElementById("compareModal");
    if (compareModal && !compareModal.classList.contains("hidden")) {
      e.preventDefault();
      if (typeof toggleCompareModal === "function") toggleCompareModal();
      else compareModal.classList.add("hidden");
      return;
    }

    const projModal = document.getElementById("projectModal");
    if (projModal && !projModal.classList.contains("hidden")) {
      e.preventDefault();
      if (typeof toggleProjectModal === "function") toggleProjectModal();
      else projModal.classList.add("hidden");
      return;
    }

    const licModal = document.getElementById("licenseModal");
    if (licModal && !licModal.classList.contains("hidden")) {
      e.preventDefault();
      if (typeof toggleLicenseModal === "function") toggleLicenseModal();
      else licModal.classList.add("hidden");
      return;
    }

    // 5. Canvas Quick Search Popups
    const topoSearchResults = document.getElementById("topologyQuickSearchResults");
    if (topoSearchResults && !topoSearchResults.classList.contains("hidden")) {
      e.preventDefault();
      if (typeof clearTopologySearch === "function") clearTopologySearch();
      else topoSearchResults.classList.add("hidden");
      return;
    }

    const physSearchResults = document.getElementById("physQuickSearchResults");
    if (physSearchResults && !physSearchResults.classList.contains("hidden")) {
      e.preventDefault();
      physSearchResults.classList.add("hidden");
      return;
    }

    // 6. Facility Inline Form (Add Space, Add Host, Add Floor)
    if (typeof facilityActiveForm !== "undefined" && facilityActiveForm) {
      e.preventDefault();
      if (typeof closeFacilityAddForm === "function") closeFacilityAddForm();
      return;
    }

    // 7. Active selection / drawing in Physical Layout -> First ESC cancels drawing or deselects corridor, multi-selection, node, or fiber backbone
    const physModal = document.getElementById("cableLayoutModal");
    if (physModal && !physModal.classList.contains("hidden")) {
      if (typeof isDrawingCable !== "undefined" && window.isDrawingCable) {
        e.preventDefault();
        if (typeof cancelCableDrawing === "function") cancelCableDrawing();
        return;
      }
      if (typeof isDraggingPhysNode !== "undefined" && window.isDraggingPhysNode) {
        e.preventDefault();
        window.isDraggingPhysNode = false;
        window.draggedPhysNode = null;
        return;
      }
      if (typeof selectedPathwayTrunkId !== "undefined" && selectedPathwayTrunkId) {
        e.preventDefault();
        if (typeof deselectPathwayTrunk === "function") deselectPathwayTrunk();
        return;
      }
      if (typeof selectedNodeIds !== "undefined" && selectedNodeIds && selectedNodeIds.size > 0) {
        e.preventDefault();
        if (typeof clearMultiSelection === "function") clearMultiSelection();
        return;
      }
      if (typeof selectedFiberBackboneId !== "undefined" && selectedFiberBackboneId) {
        e.preventDefault();
        if (typeof deselectFiberBackbone === "function") deselectFiberBackbone();
        return;
      }
      const hasSelNode = (typeof window.getSelectedNodeId === "function" && window.getSelectedNodeId()) || 
                         (typeof selectedNodeId !== "undefined" && selectedNodeId);
      if (hasSelNode) {
        e.preventDefault();
        if (typeof deselectNode === "function") deselectNode();
        return;
      }
    }

    // 8. Active selection in Topology -> First ESC deselects node
    const topoModal = document.getElementById("topologyModal");
    if (topoModal && !topoModal.classList.contains("hidden")) {
      const hasTopoSel = (typeof window.getSelectedTopologyNodeId === "function" && window.getSelectedTopologyNodeId()) || 
                         (typeof selectedTopologyNodeId !== "undefined" && selectedTopologyNodeId) ||
                         (typeof window.getSelectedTopologyRackLoc === "function" && window.getSelectedTopologyRackLoc()) ||
                         (typeof selectedTopologyRackLoc !== "undefined" && selectedTopologyRackLoc);
      if (hasTopoSel) {
        e.preventDefault();
        if (typeof deselectTopologyNode === "function") deselectTopologyNode();
        return;
      }
    }

    // 9. IMPORTANT: When Workspace Tabs are active, NEVER exit out of or close tabs on ESC!
    // Tabs are persistent workspace environments (like browser or IDE tabs).
    // They should only close when the user clicks 'x' on the tab or presses Ctrl+W.
    if (window.TabManager) {
      return;
    }

    // Legacy Fallback (Only if TabManager is completely absent): close top-most active modal
    const legacyModals = [
      { id: "cableScheduleModal", closeFn: () => typeof closeCablePullScheduleModal === "function" && closeCablePullScheduleModal() },
      { id: "revisionModal", closeFn: () => typeof closeRevisionModal === "function" && closeRevisionModal() },
      { id: "submittalModal", closeFn: () => typeof closeSubmittalModal === "function" && closeSubmittalModal() },
      { id: "cableLayoutModal", closeFn: () => typeof toggleCableLayoutModal === "function" && toggleCableLayoutModal() },
      { id: "topologyModal", closeFn: () => typeof toggleTopologyModal === "function" && toggleTopologyModal() },
      { id: "facilityModal", closeFn: () => typeof handleFacilityModalCloseOrBack === "function" ? handleFacilityModalCloseOrBack() : (typeof toggleFacilityModal === "function" && toggleFacilityModal()) },
      { id: "projectHealthModal", closeFn: () => typeof toggleProjectHealthModal === "function" && toggleProjectHealthModal() },
      { id: "bomModal", closeFn: () => typeof toggleBomModal === "function" ? toggleBomModal() : (typeof toggleBomDrawer === "function" && toggleBomDrawer()) }
    ];

    for (const m of legacyModals) {
      const el = document.getElementById(m.id);
      if (el && !el.classList.contains("hidden") && !el.classList.contains("translate-x-full")) {
        e.preventDefault();
        m.closeFn();
        break;
      }
    }
  }

  // Delete / Backspace key to delete selected fiber backbone
  if ((e.key === "Delete" || e.key === "Backspace") && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) {
    const physModal = document.getElementById("cableLayoutModal");
    if (physModal && !physModal.classList.contains("hidden")) {
      if (typeof selectedFiberBackboneId !== "undefined" && selectedFiberBackboneId) {
        e.preventDefault();
        if (typeof deleteFiberBackbone === "function") {
          deleteFiberBackbone(selectedFiberBackboneId);
        }
        return;
      }
    }
  }
});

// Window Compatibility
window.currentMode = currentMode;
window.activeDomain = activeDomain;
window.switchDomain = switchDomain;
window.switchMode = switchMode;
window.runActiveFilter = runActiveFilter;
window.resetCurrentFilters = resetCurrentFilters;
window.updateSearchFilter = updateSearchFilter;
window.buildCalculatorStrip = buildCalculatorStrip;
window.calculatePoETarget = calculatePoETarget;
window.updateDemandInput = updateDemandInput;
window.resetDemandInputs = resetDemandInputs;
window.deriveDemandFromBOM = deriveDemandFromBOM;
window.updateHeadroom = updateHeadroom;
window.setOpticQuickFilter = setOpticQuickFilter;
window.setUplinkSpeedFilter = setUplinkSpeedFilter;
window.selectedDacLength = selectedDacLength;
window.selectedPatchCordLength = selectedPatchCordLength;
window.selectedAccSubCategory = selectedAccSubCategory;
window.toggleFilterItem = toggleFilterItem;
window.showToast = showToast;

function toggleProjectLevelMenu() {
  const dropdown = document.getElementById("projectLevelDropdown");
  if (!dropdown) return;
  dropdown.classList.toggle("hidden");
  if (!dropdown.classList.contains("hidden") && window.lucide) {
    lucide.createIcons();
  }
}
window.toggleProjectLevelMenu = toggleProjectLevelMenu;

let isCatalogExpanded = false;
let catalogHoverTimeout = null;

function toggleCatalogExpand(forceState = null) {
  const container = document.getElementById("domainNavigationContainer");
  const chevron = document.getElementById("catalogExpandChevron");
  const btn = document.getElementById("catalogExpandBtn");
  if (!container) return;

  if (forceState !== null) {
    isCatalogExpanded = forceState;
  } else {
    isCatalogExpanded = !isCatalogExpanded;
  }

  if (isCatalogExpanded) {
    if (catalogHoverTimeout) {
      clearTimeout(catalogHoverTimeout);
      catalogHoverTimeout = null;
    }
    container.classList.remove("hidden");
    if (chevron) chevron.style.transform = "rotate(180deg)";
    if (btn) {
      btn.classList.add("bg-brand-600/20", "border-brand-500/40", "text-brand-300");
    }
  } else {
    if (catalogHoverTimeout) {
      clearTimeout(catalogHoverTimeout);
      catalogHoverTimeout = null;
    }
    container.classList.add("hidden");
    if (chevron) chevron.style.transform = "";
    if (btn) {
      btn.classList.remove("bg-brand-600/20", "border-brand-500/40", "text-brand-300");
    }
  }

  if (window.lucide) {
    lucide.createIcons();
  }
}

function handleCatalogNavClick() {
  if (catalogHoverTimeout) {
    clearTimeout(catalogHoverTimeout);
    catalogHoverTimeout = null;
  }
  if (typeof TabManager !== "undefined") {
    const activeTab = TabManager.getActiveTabId();
    if (!activeTab.startsWith("catalog")) {
      const targetDomain = typeof activeDomain !== "undefined" ? activeDomain : "networking";
      TabManager.openTab("catalog_" + targetDomain);
      toggleCatalogExpand(false);
      return;
    }
  }
  toggleCatalogExpand();
}

let isFacilityExpanded = false;
let facilityHoverTimeout = null;

function toggleFacilityExpand(forceState = null) {
  const container = document.getElementById("facilityNavigationContainer");
  const chevron = document.getElementById("facilityExpandChevron");
  const btn = document.getElementById("facilityExpandBtn");
  if (!container) return;

  if (forceState !== null) {
    isFacilityExpanded = forceState;
  } else {
    isFacilityExpanded = !isFacilityExpanded;
  }

  if (isFacilityExpanded) {
    if (facilityHoverTimeout) {
      clearTimeout(facilityHoverTimeout);
      facilityHoverTimeout = null;
    }
    container.classList.remove("hidden");
    if (chevron) chevron.style.transform = "rotate(180deg)";
    if (btn) {
      btn.classList.add("bg-sky-600/20", "border-sky-500/40", "text-sky-300");
    }
    updateFacilitySubNavUI();
  } else {
    if (facilityHoverTimeout) {
      clearTimeout(facilityHoverTimeout);
      facilityHoverTimeout = null;
    }
    container.classList.add("hidden");
    if (chevron) chevron.style.transform = "";
    if (btn) {
      btn.classList.remove("bg-sky-600/20", "border-sky-500/40", "text-sky-300");
    }
  }

  if (window.lucide) {
    lucide.createIcons();
  }
}

function updateFacilitySubNavUI() {
  const activeTab = typeof TabManager !== "undefined" ? TabManager.getActiveTabId() : "";
  const bHierarchy = document.getElementById("facility-nav-hierarchy");
  const bEnclosures = document.getElementById("facility-nav-enclosures");
  const bPortMatrix = document.getElementById("facility-nav-portmatrix");
  const bPowerMatrix = document.getElementById("facility-nav-powermatrix");

  const activeClasses = "bg-slate-800 text-white font-bold border-sky-500/50 shadow-sm";
  const inactiveClasses = "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/60";

  [bHierarchy, bEnclosures, bPortMatrix, bPowerMatrix].forEach(b => {
    if (!b) return;
    b.className = `px-2.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 border transition-all cursor-pointer shrink-0 ${inactiveClasses}`;
  });

  if (activeTab === "facility" && bHierarchy) {
    bHierarchy.className = `px-2.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 border transition-all cursor-pointer shrink-0 ${activeClasses}`;
  } else if (activeTab === "enclosures" && bEnclosures) {
    bEnclosures.className = `px-2.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 border transition-all cursor-pointer shrink-0 ${activeClasses}`;
  } else if (activeTab === "port_matrix" && bPortMatrix) {
    bPortMatrix.className = `px-2.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 border transition-all cursor-pointer shrink-0 ${activeClasses}`;
  } else if (activeTab === "power_matrix" && bPowerMatrix) {
    bPowerMatrix.className = `px-2.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 border transition-all cursor-pointer shrink-0 ${activeClasses}`;
  }
}

function handleFacilityNavClick() {
  if (facilityHoverTimeout) {
    clearTimeout(facilityHoverTimeout);
    facilityHoverTimeout = null;
  }
  if (typeof TabManager !== "undefined") {
    const cur = TabManager.getActiveTabId();
    if (cur !== "facility" && cur !== "enclosures" && cur !== "port_matrix" && cur !== "power_matrix") {
      TabManager.openTab("facility");
      toggleFacilityExpand(false);
      return;
    }
  }
  toggleFacilityExpand();
}

/**
 * Attaches hover (mouseenter/mouseleave) listeners with debounce timeout to Catalog and Facility dropdown wrappers
 */
function setupNavDropdownHoverListeners() {
  const catWrapper = document.getElementById("catalogDomainWrapper");
  if (catWrapper && !catWrapper._hoverInitialized) {
    catWrapper._hoverInitialized = true;
    catWrapper.addEventListener("mouseenter", () => {
      if (catalogHoverTimeout) {
        clearTimeout(catalogHoverTimeout);
        catalogHoverTimeout = null;
      }
      if (facilityHoverTimeout) {
        clearTimeout(facilityHoverTimeout);
        facilityHoverTimeout = null;
      }
      toggleFacilityExpand(false);
      toggleCatalogExpand(true);
    });

    catWrapper.addEventListener("mouseleave", () => {
      catalogHoverTimeout = setTimeout(() => {
        toggleCatalogExpand(false);
      }, 250);
    });
  }

  const facWrapper = document.getElementById("facilityDomainWrapper");
  if (facWrapper && !facWrapper._hoverInitialized) {
    facWrapper._hoverInitialized = true;
    facWrapper.addEventListener("mouseenter", () => {
      if (facilityHoverTimeout) {
        clearTimeout(facilityHoverTimeout);
        facilityHoverTimeout = null;
      }
      if (catalogHoverTimeout) {
        clearTimeout(catalogHoverTimeout);
        catalogHoverTimeout = null;
      }
      toggleCatalogExpand(false);
      toggleFacilityExpand(true);
    });

    facWrapper.addEventListener("mouseleave", () => {
      facilityHoverTimeout = setTimeout(() => {
        toggleFacilityExpand(false);
      }, 250);
    });
  }
}

window.handleCatalogNavClick = handleCatalogNavClick;
window.toggleCatalogExpand = toggleCatalogExpand;
window.isCatalogExpanded = isCatalogExpanded;

window.handleFacilityNavClick = handleFacilityNavClick;
window.toggleFacilityExpand = toggleFacilityExpand;
window.updateFacilitySubNavUI = updateFacilitySubNavUI;
window.isFacilityExpanded = isFacilityExpanded;
window.setupNavDropdownHoverListeners = setupNavDropdownHoverListeners;

// Initialize hover listeners when DOM is ready
if (document.readyState === "complete" || document.readyState === "interactive") {
  setupNavDropdownHoverListeners();
} else {
  document.addEventListener("DOMContentLoaded", setupNavDropdownHoverListeners);
}

// Click-outside listener for Catalog and Facility popovers
document.addEventListener("click", (e) => {
  const catWrapper = document.getElementById("catalogDomainWrapper");
  if (catWrapper && isCatalogExpanded && !catWrapper.contains(e.target)) {
    toggleCatalogExpand(false);
  }
  const facWrapper = document.getElementById("facilityDomainWrapper");
  if (facWrapper && isFacilityExpanded && !facWrapper.contains(e.target)) {
    toggleFacilityExpand(false);
  }
});

// Outside click handler to close projectLevelDropdown
document.addEventListener("click", (e) => {
  const wrapper = document.getElementById("projectLevelMenuWrapper");
  const dropdown = document.getElementById("projectLevelDropdown");
  if (dropdown && !dropdown.classList.contains("hidden")) {
    if (wrapper && !wrapper.contains(e.target)) {
      dropdown.classList.add("hidden");
    }
  }
});

