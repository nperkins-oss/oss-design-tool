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

// =========================================================================
// BETA FEATURE FLAGS & CAMERA DESIGN MODE CONFIGURATION
// Set flags to true here (or call window.setFeatureFlag(key, true)) to
// re-enable deferred modules as they are ready for production release.
// =========================================================================
const FEATURE_FLAGS = {
  enableAccessControl: false,         // Hides Access Control & Doors sub-tab, Power & Trove Enclosures sub-tab, Access Software sub-tab, Door Builder, and ACS CAD layers for Beta
  enableSpecificCameraDetails: false, // Hides unfinished optical camera details (DORI distances, horizontal FOV angle sliders/cones) for Beta
  enableWalkAudit: false,             // Hides Onsite Camera Walk Audit in Project menu for Beta
  enableStorageDrivesTab: false       // Hides Storage Drives & SAN sub-tab in Compute & Storage for Beta
};
window.FEATURE_FLAGS = FEATURE_FLAGS;

// Camera Specification Mode:
// "generic"  = Initial Design Mode (Specify cameras by Generic Type & Resolution with built-in PoE & Storage defaults)
// "specific" = Full Design Mode (Switch generic cameras to actual vendor SKUs via Bulk Mapping + Individual Override)
let cameraDesignMode = "generic";
let showCameraBulkUpgradePanel = true;
// PoE Calculator Input Mode:
// "camera_types" = Enter counts of the 11 Generic Camera Types (auto-syncs to BOM, PoE Classes, and Storage/Archiver Sizer)
// "poe_classes"  = Enter raw IEEE 802.3 PoE Class port counts (af 15.4W, at 30W, bt 60W, bt 90W)
let poeCalcInputMode = "camera_types";
let poeCalcTargetLocation = "";
window.cameraDesignMode = cameraDesignMode;
window.showCameraBulkUpgradePanel = showCameraBulkUpgradePanel;
window.poeCalcInputMode = poeCalcInputMode;
window.poeCalcTargetLocation = poeCalcTargetLocation;

function isGenericCameraModeActive() {
  return cameraDesignMode === "generic";
}
window.isGenericCameraModeActive = isGenericCameraModeActive;

function renderGlobalDesignModeToggle() {
  const el = document.getElementById("globalDesignModeToggleContainer");
  if (!el) return;
  const isGeneric = isGenericCameraModeActive();
  const bomList = (typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) ? projectBOM : [];
  const genericCount = bomList
    .filter(i => !i.parentInstanceId && (i.role === "Camera" || i.category === "camera" || i.category === "cameras") && (i.isGenericCamera || String(i.id || i.sku || "").startsWith("gen-cam-")))
    .reduce((sum, i) => sum + (parseInt(i.qty, 10) || 1), 0);

  el.innerHTML = `
    <div class="inline-flex items-center bg-slate-950/90 border border-slate-700/80 rounded-lg p-0.5 text-[11px] shadow-sm">
      <span class="hidden xl:inline text-[9px] font-mono uppercase tracking-wider text-slate-400 px-2 font-bold">Camera Mode:</span>
      <button
        type="button"
        onclick="setCameraDesignMode('generic')"
        class="px-2 py-1 rounded-md font-bold flex items-center gap-1 transition-all cursor-pointer ${isGeneric ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}"
        title="Initial Design Mode: Size PoE & Video Storage using Generic Camera Types (2MP, 4MP, 5MP, 8MP 4K, 360°, Dual/Quad/5-Sensor, PTZ, 60W LPR)"
      >
        <i data-lucide="layers" class="w-3 h-3"></i>
        <span>Initial Design</span>
      </button>
      <button
        type="button"
        onclick="setCameraDesignMode('specific')"
        class="px-2 py-1 rounded-md font-bold flex items-center gap-1 transition-all cursor-pointer ${!isGeneric ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'}"
        title="Full Design Mode: Select actual manufacturer camera SKUs and bulk-convert generic cameras to real parts"
      >
        <i data-lucide="cpu" class="w-3 h-3"></i>
        <span>Full Design</span>
        ${genericCount > 0 ? `<span class="ml-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-mono ${!isGeneric ? 'bg-white/20 text-white' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'}" title="${genericCount} Generic Camera(s) in Project">${genericCount}</span>` : ''}
      </button>
    </div>
  `;
  if (typeof safeCreateIcons === "function") safeCreateIcons(el);
}
window.renderGlobalDesignModeToggle = renderGlobalDesignModeToggle;

function setPoeCalcInputMode(mode) {
  poeCalcInputMode = mode === "poe_classes" ? "poe_classes" : "camera_types";
  window.poeCalcInputMode = poeCalcInputMode;
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
}
window.setPoeCalcInputMode = setPoeCalcInputMode;

function setPoeCalcTargetLocation(loc) {
  poeCalcTargetLocation = loc || "";
  window.poeCalcTargetLocation = poeCalcTargetLocation;
}
window.setPoeCalcTargetLocation = setPoeCalcTargetLocation;

function setCameraDesignMode(mode) {
  const normalized = mode === "specific" ? "specific" : "generic";
  cameraDesignMode = normalized;
  window.cameraDesignMode = normalized;

  if (normalized === "generic") {
    selectedCamVendors = [];
    requireCamAnalytics = false;
    requireCamVandal = false;
    requireCamTaa = false;
    poeCalcInputMode = "camera_types";
    window.poeCalcInputMode = "camera_types";
  }

  renderGlobalDesignModeToggle();
  if (typeof GlobalSearchEngine !== "undefined" && typeof GlobalSearchEngine.buildIndex === "function") {
    GlobalSearchEngine.buildIndex();
  }
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
  if (typeof buildSidebarFilters === "function") buildSidebarFilters();
  if (typeof runActiveFilter === "function") runActiveFilter();
  if (typeof updateBOMView === "function") updateBOMView();
  if (typeof showToast === "function") {
    showToast(
      normalized === "generic"
        ? "Switched to Initial Design Mode (Generic Camera Types & Default PoE/Bitrate)."
        : "Switched to Full Design Mode (Actual Manufacturer Parts & Bulk SKU Assignment)."
    );
  }
}
window.setCameraDesignMode = setCameraDesignMode;

function getEnabledDomainModes(domainKey) {
  const def = DOMAIN_DEFINITIONS[domainKey];
  if (!def || !Array.isArray(def.modes)) return [];
  return def.modes.filter(m => {
    if (!FEATURE_FLAGS.enableAccessControl && (m.id === "access_control" || m.id === "power_enclosures" || m.id === "access_software")) {
      return false;
    }
    if (!FEATURE_FLAGS.enableStorageDrivesTab && m.id === "storage") {
      return false;
    }
    return true;
  });
}
window.getEnabledDomainModes = getEnabledDomainModes;

function applyFeatureFlagsToDOM() {
  // 1. Hide/show Walk Audit menu & toolbar items
  ["walkAuditMenuBtn", "btnWalkAuditModal", "btnCanvasFieldAudit"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle("hidden", !FEATURE_FLAGS.enableWalkAudit);
  });

  // 2. Hide/show Access Control layer filter on Physical Layout
  ["layerBtn-access", "physLayerLabel-access"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle("hidden", !FEATURE_FLAGS.enableAccessControl);
  });

  // 3. Hide/show Optical FOV/DORI details on Physical Layout if disabled
  ["physToggleFovBtn", "btnToggleCameraFov", "btnToggleDoriBands"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle("hidden", !FEATURE_FLAGS.enableSpecificCameraDetails);
  });
}
window.applyFeatureFlagsToDOM = applyFeatureFlagsToDOM;

function setFeatureFlag(flagKey, enabled) {
  if (!(flagKey in FEATURE_FLAGS)) return false;
  FEATURE_FLAGS[flagKey] = Boolean(enabled);
  applyFeatureFlagsToDOM();
  if (typeof GlobalSearchEngine !== "undefined" && typeof GlobalSearchEngine.buildIndex === "function") {
    GlobalSearchEngine.buildIndex();
  }
  // Ensure active mode is still enabled
  const enabledModes = getEnabledDomainModes(activeDomain);
  if (enabledModes.length > 0 && !enabledModes.some(m => m.id === currentMode)) {
    currentMode = enabledModes[0].id;
    window.currentMode = currentMode;
  }
  buildDomainNavigation();
  buildSubModeNavigation();
  buildCalculatorStrip();
  buildSidebarFilters();
  runActiveFilter();
  if (typeof updateBOMView === "function") updateBOMView();
  return true;
}
window.setFeatureFlag = setFeatureFlag;

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
let videoServerCount = 0;   // 0 = Auto (packs multiple Archiver roles per server within Genetec limits)
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
  applyFeatureFlagsToDOM();
  if (typeof StorageService !== "undefined") {
    StorageService.restoreStateFromLocalStorage();
  }

  // Ensure restored currentMode is enabled under FEATURE_FLAGS
  const enabledModes = getEnabledDomainModes(activeDomain);
  if (enabledModes.length > 0 && !enabledModes.some(m => m.id === currentMode)) {
    currentMode = enabledModes[0].id;
    window.currentMode = currentMode;
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
  const enabledModes = getEnabledDomainModes(domainKey);
  const savedMode = lastActiveModeByDomain[domainKey];
  const validMode = enabledModes.some(m => m.id === savedMode)
    ? savedMode
    : (enabledModes[0] ? enabledModes[0].id : DOMAIN_DEFINITIONS[domainKey].modes[0].id);
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
  // Guard against disabled modes when FEATURE_FLAGS are off
  if (!FEATURE_FLAGS.enableAccessControl && (newMode === "access_control" || newMode === "power_enclosures" || newMode === "access_software")) {
    newMode = newMode === "access_software" ? "vms_software" : "cameras";
  }
  if (!FEATURE_FLAGS.enableStorageDrivesTab && newMode === "storage") {
    newMode = "servers";
  }

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
  const enabledModes = getEnabledDomainModes(activeDomain);

  container.innerHTML = enabledModes.map(mode => {
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

function getGenericCameraTypeCountInBom(genericTypeId) {
  if (!genericTypeId || typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) return 0;
  return projectBOM
    .filter(i => !i.parentInstanceId && (i.role === "Camera" || i.category === "camera" || i.category === "cameras") &&
      (i.genericCameraTypeId === genericTypeId || i.originGenericTypeId === genericTypeId || i.id === genericTypeId || i.sku === genericTypeId))
    .reduce((sum, i) => sum + (parseInt(i.qty, 10) || 1), 0);
}
window.getGenericCameraTypeCountInBom = getGenericCameraTypeCountInBom;

function setGenericCameraTypeCountFromSizer(genericTypeId, targetQty) {
  if (!genericTypeId || typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) return;

  const desired = Math.max(0, Math.min(500, parseInt(targetQty, 10) || 0));

  if (typeof unbundleMultiQtyCameras === "function") {
    unbundleMultiQtyCameras(projectBOM);
  }

  const matchingInstances = projectBOM.filter(i =>
    !i.parentInstanceId &&
    (i.role === "Camera" || i.category === "camera" || i.category === "cameras") &&
    (i.genericCameraTypeId === genericTypeId || i.originGenericTypeId === genericTypeId || i.id === genericTypeId || i.sku === genericTypeId)
  );

  const currentCount = matchingInstances.length;
  if (desired === currentCount) return;

  if (desired > currentCount) {
    const toAdd = desired - currentCount;
    let targetLoc = poeCalcTargetLocation;
    if (!targetLoc && typeof FacilityStore !== "undefined") {
      const locs = FacilityStore.getLocationNames(false);
      if (locs.length > 0) {
        targetLoc = locs.find(l => l.includes("IDF")) || locs[0];
      }
    }
    if (typeof addCameraToBOM === "function") {
      addCameraToBOM(genericTypeId, targetLoc || null, null, toAdd);
    }
  } else {
    const toRemove = currentCount - desired;
    // Prefer removing unplaced instances first (from newest to oldest)
    const placedIds = new Set(
      (typeof floorplanState !== "undefined" && Array.isArray(floorplanState.deviceDrops))
        ? floorplanState.deviceDrops.map(d => d.instanceId)
        : []
    );
    const sortedForRemoval = [...matchingInstances].reverse().sort((a, b) => {
      const aPlaced = placedIds.has(a.instanceId) ? 1 : 0;
      const bPlaced = placedIds.has(b.instanceId) ? 1 : 0;
      return aPlaced - bPlaced;
    });

    const idsToRemove = new Set(sortedForRemoval.slice(0, toRemove).map(i => i.instanceId));

    // Clean up switch port allocations and physical drops for removed cameras
    projectBOM.forEach(item => {
      if (idsToRemove.has(item.instanceId)) {
        if (item.uplinkTargetId && item.assignedSwitchPort && typeof PortEngine !== "undefined") {
          const hostSw = projectBOM.find(s => s.instanceId === item.uplinkTargetId);
          if (hostSw && typeof PortEngine.disconnectPort === "function") {
            PortEngine.disconnectPort(hostSw, item.assignedSwitchPort);
          }
        }
        if (typeof removePhysicalLayoutDropByInstanceId === "function") {
          removePhysicalLayoutDropByInstanceId(item.instanceId);
        }
      }
    });

    projectBOM = projectBOM.filter(i => !idsToRemove.has(i.instanceId) && !idsToRemove.has(i.parentInstanceId));
    window.projectBOM = projectBOM;

    if (typeof DeviceTaxonomy !== "undefined" && typeof DeviceTaxonomy.recalculateNumbers === "function") {
      DeviceTaxonomy.recalculateNumbers(projectBOM);
    }
  }

  // Keep VideoStorageSizer synced with BOM cameras
  if (typeof VideoStorageSizer !== "undefined" && VideoStorageSizer.state) {
    VideoStorageSizer.state.hasCustomGroups = false;
    VideoStorageSizer.state.sourceMode = "auto";
    videoSourceMode = "auto";
    window.videoSourceMode = "auto";
  }

  deriveDemandFromBOM(true);
  renderGlobalDesignModeToggle();
  if (typeof updateBOMView === "function") updateBOMView();
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
  if (typeof buildSidebarFilters === "function") buildSidebarFilters();
  if (typeof runActiveFilter === "function") runActiveFilter();
}
window.setGenericCameraTypeCountFromSizer = setGenericCameraTypeCountFromSizer;

function adjustGenericCameraTypeCountFromSizer(genericTypeId, delta) {
  const cur = getGenericCameraTypeCountInBom(genericTypeId);
  setGenericCameraTypeCountFromSizer(genericTypeId, Math.max(0, cur + (parseInt(delta, 10) || 0)));
}
window.adjustGenericCameraTypeCountFromSizer = adjustGenericCameraTypeCountFromSizer;

function clearAllGenericCamerasFromSizer() {
  if (typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) return;
  const genericTypes = typeof GENERIC_CAMERA_TYPES !== "undefined" ? GENERIC_CAMERA_TYPES : [];
  genericTypes.forEach(g => {
    if (getGenericCameraTypeCountInBom(g.id) > 0) {
      setGenericCameraTypeCountFromSizer(g.id, 0);
    }
  });
  demandCounts = { af: 0, at: 0, bt60: 0, bt90: 0 };
  buildCalculatorStrip();
  buildSidebarFilters();
  runActiveFilter();
  if (typeof showToast === "function") {
    showToast("Cleared all generic camera counts from PoE Sizer & Project BOM.");
  }
}
window.clearAllGenericCamerasFromSizer = clearAllGenericCamerasFromSizer;

function deriveDemandFromBOM(silent = false) {
  if (typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) {
    if (!silent && typeof showToast === "function") showToast("Project BOM is empty.");
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
                      role === "server" || role === "workstation" || role === "storage" || role === "ups" || role === "pdu" ||
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

      if (item.poeTierKey === "bt90" || std.includes("bt4") || std.includes("90w") || std.includes("type 4") || watts > 60) {
        countBt90 += qty;
      } else if (item.poeTierKey === "bt60" || std.includes("bt") || std.includes("60w") || std.includes("type 3") || watts > 30) {
        countBt60 += qty;
      } else if (item.poeTierKey === "at" || std.includes("at") || std.includes("poe+") || watts > 15.4) {
        countAt += qty;
      } else {
        countAf += qty;
      }
    }
  });

  if (edgeDeviceCount === 0 && !silent) {
    if (typeof showToast === "function") showToast("No PoE edge devices (cameras, access, APs) found in quote.");
    return;
  }

  demandCounts.af = countAf;
  demandCounts.at = countAt;
  demandCounts.bt60 = countBt60;
  demandCounts.bt90 = countBt90;

  renderGlobalDesignModeToggle();
  buildCalculatorStrip();
  buildSidebarFilters();
  runActiveFilter();

  if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
    FacilityStore.notifyWorkspaceChange();
  }
  if (typeof StorageService !== "undefined" && typeof StorageService.queueAutoSave === "function") {
    StorageService.queueAutoSave();
  }

  if (!silent) {
    const p = calculatePoETarget();
    if (typeof showToast === "function") {
      showToast(`Derived demands from BOM: ${edgeDeviceCount} edge devices (${countAf} af, ${countAt} at, ${countBt60} bt60, ${countBt90} bt90) totaling ${p.budgetWithHeadroom}W required.`);
    }
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
  renderGlobalDesignModeToggle();
  const container = document.getElementById("calculatorStripContainer");
  if (!container) return;

  if (currentMode === "access") {
    container.classList.remove("hidden");
    const p = calculatePoETarget();
    const hasDemand = p.totalCameras > 0;
    const isGenericMode = isGenericCameraModeActive();
    const isCameraTypesInput = poeCalcInputMode === "camera_types";
    const genericTypes = typeof GENERIC_CAMERA_TYPES !== "undefined" ? GENERIC_CAMERA_TYPES : [];

    // Resolve available closets/racks for newly added cameras from PoE Sizer
    const allLocs = typeof FacilityStore !== "undefined" ? FacilityStore.getLocationNames(false) : ["IDF-1 • Rack-1", "MDF • Rack-1"];
    if (!poeCalcTargetLocation && allLocs.length > 0) {
      poeCalcTargetLocation = allLocs.find(l => l.includes("IDF")) || allLocs[0];
    }

    const shortLabels = {
      "gen-cam-2mp-1080p": "Single 2MP (1080p)",
      "gen-cam-4mp": "Single 4MP (2K)",
      "gen-cam-5mp": "Single 5MP",
      "gen-cam-8mp-4k": "Single 8MP (4K)",
      "gen-cam-6mp-360": "6MP 360° Fisheye",
      "gen-cam-12mp-360": "12MP 360° Fisheye",
      "gen-cam-dual-1080p": "Dual-Sensor 1080P",
      "gen-cam-quad-4mp": "Quad-Sensor 4MP",
      "gen-cam-5sensor-ptz": "5-Sensor + PTZ",
      "gen-cam-ptz": "PTZ Camera",
      "gen-cam-lpr-60w": "LPR Camera (60W)"
    };

    const totalSyncedGenericCams = genericTypes.reduce((sum, g) => sum + getGenericCameraTypeCountInBom(g.id), 0);

    container.innerHTML = `
      <div class="bg-slate-900/95 border border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-col gap-3 shadow-lg">
        <!-- Top Row: Title, Design Mode Switcher, Input Mode Switcher & Live PoE Budget Summary -->
        <div class="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div class="flex items-start sm:items-center gap-3">
            <div class="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
              <i data-lucide="zap" class="w-5 h-5"></i>
            </div>
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h4 class="text-xs font-bold text-white uppercase tracking-wider">
                  PoE Power Budget &amp; Edge Capacity Calculator
                </h4>

                <!-- PoE Input Mode Toggle: By Generic Camera Types vs By PoE Class -->
                <div class="inline-flex items-center p-0.5 rounded-xl bg-slate-950 border border-slate-800">
                  <button
                    type="button"
                    onclick="setPoeCalcInputMode('camera_types')"
                    class="px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${isCameraTypesInput ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}"
                    title="Enter camera counts by Generic Type & Resolution (2MP, 4MP, 5MP, 8MP 4K, 360°, Dual/Quad/5-Sensor, PTZ, 60W LPR). Automatically syncs to BOM, PoE Classes, and Server Storage Calculator!"
                  >
                    <i data-lucide="camera" class="w-3.5 h-3.5"></i>
                    <span>By Camera Types (Syncs BOM &amp; Storage)</span>
                  </button>
                  <button
                    type="button"
                    onclick="setPoeCalcInputMode('poe_classes')"
                    class="px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${!isCameraTypesInput ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}"
                    title="Enter raw IEEE 802.3 PoE Class port counts directly (15W af, 30W at, 60W bt, 90W bt)"
                  >
                    <i data-lucide="zap" class="w-3.5 h-3.5"></i>
                    <span>By PoE Class (15W / 30W / 60W / 90W)</span>
                  </button>
                </div>
              </div>
              <p class="text-[11px] text-slate-400 mt-0.5">
                ${isCameraTypesInput
                  ? 'Enter camera counts by type below to <strong class="text-emerald-300">auto-sync across Switch PoE sizing, Quote BOM, Physical Security, and Video Storage / Genetec Archiver calculations</strong>.'
                  : 'Spec connected PoE ports by IEEE 802.3 class to compute continuous PSE wattage, cable dissipation, and filter matching switches.'}
              </p>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2.5 text-xs">
            <!-- 15.4W af -->
            <div class="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 hover:border-slate-700 transition-colors" title="IEEE 802.3af: 15.4W PSE / 12.95W PD">
              <span class="text-[10px] font-mono text-slate-400 font-semibold uppercase">15W (af):</span>
              <input type="number" min="0" max="500" value="${demandCounts.af || 0}" onchange="updateDemandInput('af', this.value)" class="w-9 bg-transparent text-center font-mono font-bold text-white focus:outline-none" />
            </div>

            <!-- 30W at -->
            <div class="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 hover:border-slate-700 transition-colors" title="IEEE 802.3at: 30W PSE / 25.5W PD (PoE+)">
              <span class="text-[10px] font-mono text-slate-400 font-semibold uppercase">30W (at):</span>
              <input type="number" min="0" max="500" value="${demandCounts.at || 0}" onchange="updateDemandInput('at', this.value)" class="w-9 bg-transparent text-center font-mono font-bold text-sky-400 focus:outline-none" />
            </div>

            <!-- 60W bt Type 3 -->
            <div class="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 hover:border-slate-700 transition-colors" title="IEEE 802.3bt Type 3: 60W PSE / 51W PD (PoE++ / 4PPoE)">
              <span class="text-[10px] font-mono text-slate-400 font-semibold uppercase">60W (bt):</span>
              <input type="number" min="0" max="500" value="${demandCounts.bt60 || 0}" onchange="updateDemandInput('bt60', this.value)" class="w-9 bg-transparent text-center font-mono font-bold text-rose-400 focus:outline-none" />
            </div>

            <!-- 90W bt Type 4 -->
            <div class="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 hover:border-slate-700 transition-colors" title="IEEE 802.3bt Type 4: 90W PSE / 71.3W PD (High-Power PoE++)">
              <span class="text-[10px] font-mono text-slate-400 font-semibold uppercase">90W (bt):</span>
              <input type="number" min="0" max="500" value="${demandCounts.bt90 || 0}" onchange="updateDemandInput('bt90', this.value)" class="w-9 bg-transparent text-center font-mono font-bold text-amber-400 focus:outline-none" />
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

        ${isCameraTypesInput ? `
          <!-- Interactive Generic Camera Types PoE & Storage Sync Matrix -->
          <div class="bg-slate-950/90 border border-emerald-500/30 rounded-xl p-3 space-y-2.5">
            <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
              <div class="flex flex-wrap items-center gap-2">
                <span class="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-mono font-bold text-emerald-300 uppercase flex items-center gap-1">
                  <i data-lucide="refresh-cw" class="w-3 h-3"></i> Live BOM &amp; Storage Sync
                </span>
                <span class="text-xs font-bold text-white">Enter Camera Counts by Generic Type (${totalSyncedGenericCams} Camera${totalSyncedGenericCams === 1 ? '' : 's'} Synced)</span>
                <div class="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2 py-0.5 text-[11px]">
                  <span class="text-slate-400 font-mono text-[10px]">Assign Closet:</span>
                  <select onchange="setPoeCalcTargetLocation(this.value)" class="bg-transparent text-indigo-300 font-bold text-[11px] focus:outline-none cursor-pointer">
                    ${allLocs.map(loc => `<option value="${escapeHTML(loc)}" class="bg-slate-900" ${poeCalcTargetLocation === loc ? 'selected' : ''}>${escapeHTML(loc)}</option>`).join('')}
                  </select>
                </div>
              </div>

              <div class="flex flex-wrap items-center gap-1.5">
                <button type="button" onclick="switchDomain('physical_security')" class="px-2.5 py-1 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/40 text-sky-300 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer" title="Open Physical Security Cameras tab to view camera cards or bulk-upgrade to actual SKUs">
                  <i data-lucide="camera" class="w-3 h-3"></i>
                  <span>Cameras / Upgrade SKUs &rarr;</span>
                </button>
                <button type="button" onclick="switchDomain('compute_storage')" class="px-2.5 py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer" title="Open Compute & Storage tab to view synced Video Storage & Genetec 5.14 Archiver sizing">
                  <i data-lucide="hard-drive" class="w-3 h-3"></i>
                  <span>Storage &amp; Archiver Sizer &rarr;</span>
                </button>
                ${totalSyncedGenericCams > 0 ? `
                  <button type="button" onclick="clearAllGenericCamerasFromSizer()" class="px-2 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800/60 text-rose-300 text-[10px] font-mono font-bold transition-all cursor-pointer" title="Clear all generic camera counts">
                    Clear Cameras
                  </button>
                ` : ''}
              </div>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-2">
              ${genericTypes.map(g => {
                const cnt = getGenericCameraTypeCountInBom(g.id);
                const label = shortLabels[g.id] || g.model.replace("Generic ", "");
                const tierColor = g.poeTierKey === "bt60"
                  ? "text-rose-300 border-rose-500/40 bg-rose-500/10"
                  : (g.poeTierKey === "at" ? "text-sky-300 border-sky-500/40 bg-sky-500/10" : "text-amber-300 border-amber-500/40 bg-amber-500/10");
                const tierShort = g.poeTierKey === "bt60" ? "60W bt" : (g.poeTierKey === "at" ? "30W at" : "15W af");
                return `
                  <div class="flex flex-col justify-between p-2 rounded-xl border transition-all ${cnt > 0 ? 'bg-emerald-950/30 border-emerald-500/50 shadow-sm' : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'}">
                    <div class="flex items-start justify-between gap-1 mb-1.5">
                      <span class="text-[11px] font-bold ${cnt > 0 ? 'text-white' : 'text-slate-300'} leading-tight" title="${escapeHTML(g.model)} (${g.streamBitrateMbps} Mbps)">${escapeHTML(label)}</span>
                      <span class="px-1.5 py-0.2 rounded border text-[9px] font-mono font-bold shrink-0 ${tierColor}">${tierShort}</span>
                    </div>
                    <div class="flex items-center justify-between gap-1 mt-auto pt-1 border-t border-slate-800/70">
                      <span class="text-[9.5px] font-mono text-slate-400">${g.heads > 1 ? `${g.heads}x${g.mpPerHead}MP` : `${g.sensorMegapixels}MP`} &bull; ${g.streamBitrateMbps}M</span>
                      <div class="flex items-center bg-slate-950 border ${cnt > 0 ? 'border-emerald-500/60' : 'border-slate-700'} rounded-lg overflow-hidden">
                        <button type="button" onclick="adjustGenericCameraTypeCountFromSizer('${g.id}', -1)" class="px-1.5 py-0.5 text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-bold cursor-pointer">-</button>
                        <input
                          type="number"
                          min="0"
                          max="500"
                          value="${cnt}"
                          onchange="setGenericCameraTypeCountFromSizer('${g.id}', this.value)"
                          class="w-9 bg-transparent text-center font-mono text-xs font-bold ${cnt > 0 ? 'text-emerald-300' : 'text-slate-400'} focus:outline-none"
                        />
                        <button type="button" onclick="adjustGenericCameraTypeCountFromSizer('${g.id}', 1)" class="px-1.5 py-0.5 text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-bold cursor-pointer">+</button>
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        ` : ''}
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
  } else if (currentMode === "cameras") {
    // Camera Design Mode (Initial Generic vs Full Actual Parts), Live PoE/Storage Summary & Bulk SKU Upgrade Strip
    container.classList.remove("hidden");
    const isGenericMode = isGenericCameraModeActive();
    const bomCams = (projectBOM || []).filter(i => !i.parentInstanceId && (i.role === "Camera" || i.category === "camera" || i.category === "cameras" || i.deviceTypePrefix === "CAM" || i.deviceTypePrefix === "LPR"));
    const totalBomCams = bomCams.reduce((s, c) => s + (parseInt(c.qty, 10) || 1), 0);
    const genericBomCams = bomCams.filter(c => c.isGenericCamera || String(c.id || c.sku || "").startsWith("gen-cam-") || String(c.sku || "").startsWith("GEN-CAM-"));
    const totalGenericCams = genericBomCams.reduce((s, c) => s + (parseInt(c.qty, 10) || 1), 0);
    const totalSpecificCams = totalBomCams - totalGenericCams;

    // Compute live PoE & Storage from BOM cameras
    let camAf = 0, camAt = 0, camBt60 = 0, camRawWatts = 0;
    bomCams.forEach(c => {
      const q = parseInt(c.qty, 10) || 1;
      const std = String(c.poeStandard || "").toLowerCase();
      const maxW = parseFloat(c.maxPowerWatts || c.powerConsumptionWatts || 12);
      const drawW = parseFloat(c.powerConsumptionWatts || maxW || 8);
      camRawWatts += drawW * q;
      if (c.poeTierKey === "bt60" || std.includes("bt") || maxW > 30) camBt60 += q;
      else if (c.poeTierKey === "at" || std.includes("at") || maxW > 15.4) camAt += q;
      else camAf += q;
    });
    camRawWatts = Math.round(camRawWatts * 10) / 10;

    const vCalcCam = (typeof VideoStorageSizer !== "undefined" && typeof VideoStorageSizer.calculateFromBOM === "function")
      ? VideoStorageSizer.calculateFromBOM(projectBOM, { sourceMode: totalBomCams > 0 ? "bom" : "manual" })
      : { totalSensors: totalBomCams, peakIngressMbps: 0, requiredUsableTB: 0 };

    // Group generic cameras in BOM by generic type for Bulk Assignment
    const genericGroupsMap = new Map();
    genericBomCams.forEach(c => {
      const gKey = c.id || c.genericCameraTypeId || c.sku;
      const gRef = (typeof CatalogRegistry !== "undefined" && CatalogRegistry.get(gKey)) ||
                   (typeof GENERIC_CAMERA_TYPES !== "undefined" ? GENERIC_CAMERA_TYPES.find(g => g.id === gKey || g.sku === gKey || g.genericTypeKey === gKey) : null) ||
                   c;
      const mapId = gRef.id || gKey;
      if (!genericGroupsMap.has(mapId)) {
        genericGroupsMap.set(mapId, {
          genericId: mapId,
          sku: gRef.sku || c.sku,
          model: gRef.model || c.model,
          resolution: gRef.resolution || c.resolution,
          poeStandard: gRef.poeStandard || c.poeStandard,
          powerConsumptionWatts: gRef.powerConsumptionWatts || c.powerConsumptionWatts,
          streamBitrateMbps: gRef.streamBitrateMbps || c.streamBitrateMbps,
          recommendedUpgradeSkus: Array.isArray(gRef.recommendedUpgradeSkus) ? gRef.recommendedUpgradeSkus : [],
          count: 0
        });
      }
      genericGroupsMap.get(mapId).count += (parseInt(c.qty, 10) || 1);
    });
    const genericGroups = Array.from(genericGroupsMap.values());
    const allSpecificCams = typeof CAMERAS_DATABASE !== "undefined" ? CAMERAS_DATABASE : [];

    container.innerHTML = `
      <div class="bg-slate-900/95 border border-slate-800 rounded-2xl p-3.5 sm:p-4 flex flex-col gap-3 shadow-lg">
        <div class="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <!-- Left: Camera Specification Mode Switcher -->
          <div class="flex items-start sm:items-center gap-3">
            <div class="p-2.5 rounded-xl ${isGenericMode ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400' : 'bg-sky-500/15 border border-sky-500/30 text-sky-400'} shrink-0">
              <i data-lucide="camera" class="w-5 h-5"></i>
            </div>
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h4 class="text-xs font-bold text-white uppercase tracking-wider">Camera Specification &amp; Sizing Mode</h4>
                <div class="inline-flex items-center p-0.5 rounded-xl bg-slate-950 border border-slate-800">
                  <button onclick="setCameraDesignMode('generic')" class="px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${isGenericMode ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}" title="Specify cameras by generic type and resolution (2MP, 4MP, 5MP, 8MP 4K, 360 Fisheye, Dual/Quad/5-Sensor, PTZ, 60W LPR). Automatically drives PoE and Storage calculations.">
                    <i data-lucide="layers" class="w-3.5 h-3.5"></i>
                    <span>Initial Design (Generic Types)</span>
                  </button>
                  <button onclick="setCameraDesignMode('specific')" class="px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${!isGenericMode ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}" title="Switch to actual manufacturer catalog parts and bulk-upgrade generic cameras to real SKUs.">
                    <i data-lucide="cpu" class="w-3.5 h-3.5"></i>
                    <span>Full Design (Actual Parts)</span>
                  </button>
                </div>
              </div>
              <p class="text-[11px] text-slate-400 mt-1">
                ${isGenericMode
                  ? 'Specify cameras by <strong class="text-emerald-300">Generic Type &amp; Resolution</strong>. Built-in PoE classes (<code class="text-amber-300">802.3af 15W</code>, <code class="text-sky-300">802.3at 30W</code>, <code class="text-rose-300">802.3bt 60W</code>) and bitrates automatically drive Switch PoE &amp; Server Storage sizing.'
                  : 'Browse <strong class="text-sky-300">Actual Manufacturer Parts</strong> or bulk-assign generic cameras in your quote to real catalog SKUs while preserving rack, switch port &amp; floorplan placements.'}
              </p>
            </div>
          </div>

          <!-- Right: Live Camera PoE & Storage Telemetry -->
          <div class="flex flex-wrap items-center gap-2.5 shrink-0">
            <div class="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800">
              <div>
                <div class="text-[9px] uppercase font-bold text-slate-400">Quoted Cameras</div>
                <div class="text-xs font-mono font-bold text-white">
                  ${totalBomCams} Cam${totalBomCams === 1 ? '' : 's'}
                  <span class="text-[10px] font-normal text-slate-400">(${totalGenericCams} Gen / ${totalSpecificCams} SKU)</span>
                </div>
              </div>
              <div class="h-6 w-px bg-slate-800"></div>
              <div title="802.3af (15.4W): ${camAf} | 802.3at PoE+ (30W): ${camAt} | 802.3bt PoE++ (60W): ${camBt60}">
                <div class="text-[9px] uppercase font-bold text-slate-400">Camera PoE Draw</div>
                <div class="text-xs font-mono font-bold text-amber-400">
                  ${camRawWatts}W <span class="text-[10px] text-slate-400">(${camAf}af/${camAt}at/${camBt60}bt)</span>
                </div>
              </div>
              <div class="h-6 w-px bg-slate-800"></div>
              <div>
                <div class="text-[9px] uppercase font-bold text-slate-400">Video Bandwidth / Storage</div>
                <div class="text-xs font-mono font-bold text-sky-400">
                  ${totalBomCams > 0 ? `${vCalcCam.peakIngressMbps} Mbps` : '0 Mbps'} <span class="text-slate-500">•</span> <span class="text-purple-300">${totalBomCams > 0 ? `${vCalcCam.requiredUsableTB} TB` : '0 TB'}</span>
                </div>
              </div>
            </div>

            ${totalGenericCams > 0 ? `
              <button onclick="window.showCameraBulkUpgradePanel = !window.showCameraBulkUpgradePanel; showCameraBulkUpgradePanel = window.showCameraBulkUpgradePanel; buildCalculatorStrip();" class="px-3 py-2 rounded-xl ${showCameraBulkUpgradePanel ? 'bg-sky-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-sky-300 border border-sky-500/40'} text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer" title="Bulk-upgrade generic camera types in the project to actual manufacturer SKUs">
                <i data-lucide="arrow-up-right-square" class="w-3.5 h-3.5"></i>
                <span>Upgrade Generic Parts (${totalGenericCams})</span>
              </button>
            ` : ''}

            <button onclick="switchMode('servers')" class="px-3 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer" title="Open Storage, Bandwidth, RAID & Genetec 5.14 Archiver Calculator on the Servers tab">
              <i data-lucide="hard-drive" class="w-3.5 h-3.5"></i>
              <span>Storage &amp; Archiver Sizer &rarr;</span>
            </button>
          </div>
        </div>

        ${(totalGenericCams > 0 && (showCameraBulkUpgradePanel || !isGenericMode)) ? `
          <!-- Bulk Generic-to-Actual SKU Upgrade Bar -->
          <div class="bg-slate-950/90 border border-sky-500/30 rounded-xl p-3 space-y-2.5">
            <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
              <div class="flex items-center gap-2">
                <span class="px-2 py-0.5 rounded bg-sky-500/15 border border-sky-500/40 text-[10px] font-mono font-bold text-sky-300 uppercase">Bulk + Individual Part Assignment</span>
                <span class="text-xs font-bold text-white">Convert Generic Camera Types to Actual Catalog SKUs (${totalGenericCams} Generic Camera${totalGenericCams === 1 ? '' : 's'} in Quote)</span>
              </div>
              <div class="flex items-center gap-2">
                <button onclick="upgradeAllGenericCamerasToRecommended()" class="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer" title="Automatically upgrade all generic camera types in the quote to their primary recommended manufacturer SKU">
                  <i data-lucide="wand-2" class="w-3.5 h-3.5"></i>
                  <span>Upgrade All ${totalGenericCams}x to Recommended SKUs</span>
                </button>
                <button onclick="if (typeof TabManager !== 'undefined') TabManager.openTab('bom');" class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer" title="Open BOM Studio to override individual cameras one-by-one">
                  <i data-lucide="list-checks" class="w-3.5 h-3.5 text-sky-400"></i>
                  <span>Per-Camera Override in BOM</span>
                </button>
              </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-2">
              ${genericGroups.map(grp => {
                // Sort recommended SKUs first, then remaining catalog SKUs
                const recSet = new Set(grp.recommendedUpgradeSkus || []);
                const recCams = allSpecificCams.filter(c => recSet.has(c.sku) || recSet.has(c.id));
                const otherCams = allSpecificCams.filter(c => !recSet.has(c.sku) && !recSet.has(c.id));
                const selectId = `bulk-upgrade-select-${grp.genericId}`;
                return `
                  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded-lg bg-slate-900/90 border border-slate-800">
                    <div class="min-w-0">
                      <div class="flex items-center gap-1.5">
                        <span class="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-[10px] font-bold">${grp.count}x</span>
                        <span class="text-xs font-bold text-white truncate">${escapeHTML(grp.model)}</span>
                      </div>
                      <div class="text-[10px] font-mono text-slate-400 mt-0.5">
                        ${escapeHTML(grp.resolution || '')} &bull; ${escapeHTML(grp.poeStandard || '802.3af')} (${grp.powerConsumptionWatts || 8}W) &bull; ${grp.streamBitrateMbps || 4} Mbps
                      </div>
                    </div>
                    <div class="flex items-center gap-1.5 shrink-0">
                      <select id="${selectId}" class="bg-slate-950 border border-slate-700 text-slate-200 text-[11px] font-mono rounded-lg px-2 py-1.5 max-w-[230px] focus:outline-none focus:border-sky-500">
                        ${recCams.length > 0 ? `
                          <optgroup label="Recommended Matching SKUs">
                            ${recCams.map(c => `<option value="${escapeHTML(c.sku)}">★ ${escapeHTML(c.vendor)} — ${escapeHTML(c.sku)} ($${(c.msrp || 0).toLocaleString()})</option>`).join('')}
                          </optgroup>
                        ` : ''}
                        <optgroup label="All Catalog Cameras">
                          ${otherCams.map(c => `<option value="${escapeHTML(c.sku)}">${escapeHTML(c.vendor)} — ${escapeHTML(c.sku)} (${escapeHTML(c.resolution || '')}, $${(c.msrp || 0).toLocaleString()})</option>`).join('')}
                        </optgroup>
                      </select>
                      <button onclick="const el = document.getElementById('${selectId}'); if (el && el.value) upgradeGenericCameraTypeBulk('${grp.genericId}', el.value);" class="px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-bold whitespace-nowrap cursor-pointer transition-colors">
                        Apply to ${grp.count}x
                      </button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  } else if (currentMode === "servers" || currentMode === "storage") {
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
          serverCountOverride: videoServerCount,
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

        <!-- Row 2: Multi-Group Camera & Recording Schedule Table + Global RAID & Archiver Controls -->
        <div class="bg-slate-950/90 border border-slate-800 rounded-xl p-3 flex flex-col gap-2.5">
          <!-- Table Toolbar: Add Camera Group, Import BOM Cameras, Global RAID Level & Archiver Roles -->
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-[11px] font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                <i data-lucide="camera" class="w-3.5 h-3.5 text-purple-400"></i>
                <span>Camera Groups &amp; Recording Schedules (${(vCalc.cameraGroups || []).length} Group${(vCalc.cameraGroups || []).length === 1 ? '' : 's'})</span>
              </span>
              <button onclick="addVideoCameraGroup()" class="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold flex items-center gap-1 shadow-sm transition-all cursor-pointer" title="Add another camera group with different resolution, frame rate, motion %, or retention days">
                <i data-lucide="plus" class="w-3.5 h-3.5"></i>
                <span>Add Camera Group</span>
              </button>
              ${vCalc.bomCameraUnits > 0 ? `
                <button onclick="importBomCamerasToGroups()" class="px-2.5 py-1 rounded-lg ${vCalc.sourceMode === 'bom' ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-700/60' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'} text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer" title="Import cameras from Project BOM into editable camera groups">
                  <i data-lucide="download" class="w-3 h-3"></i>
                  <span>Sync BOM Cameras (${vCalc.bomCameraUnits})</span>
                </button>
              ` : ''}
            </div>

            <!-- Global Storage RAID & Genetec Archiver Role Controls -->
            <div class="flex flex-wrap items-center gap-2">
              <div class="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1">
                <span class="text-[9px] font-bold uppercase text-slate-400">RAID Level:</span>
                <select onchange="setVideoSizerParam('raidType', this.value)" class="bg-slate-950 border border-slate-700/80 rounded px-1.5 py-0.5 text-amber-300 font-bold text-xs focus:outline-none cursor-pointer">
                  <option value="RAID 5" class="bg-slate-900" ${vCalc.raidLevel === 'RAID 5' ? 'selected' : ''}>RAID 5 (1 Parity)</option>
                  <option value="RAID 6" class="bg-slate-900" ${vCalc.raidLevel === 'RAID 6' ? 'selected' : ''}>RAID 6 (2 Parity)</option>
                  <option value="RAID 10" class="bg-slate-900" ${vCalc.raidLevel === 'RAID 10' ? 'selected' : ''}>RAID 10 (50% Mirror)</option>
                  <option value="RAID 50" class="bg-slate-900" ${vCalc.raidLevel === 'RAID 50' ? 'selected' : ''}>RAID 50 (Dual R5)</option>
                  <option value="RAID 60" class="bg-slate-900" ${vCalc.raidLevel === 'RAID 60' ? 'selected' : ''}>RAID 60 (Dual R6)</option>
                  <option value="JBOD" class="bg-slate-900" ${vCalc.raidLevel === 'JBOD' ? 'selected' : ''}>JBOD (No Parity)</option>
                </select>
              </div>

              <div class="flex items-center gap-1.5 bg-slate-900 border ${g.isArchiverCountVerified ? 'border-slate-800' : 'border-rose-600'} rounded-lg px-2.5 py-1">
                <span class="text-[9px] font-bold uppercase text-slate-400">Archiver Roles:</span>
                <input type="number" min="0" max="64" value="${videoArchiverRoles === 0 ? g.activeArchiverRoles : videoArchiverRoles}" onchange="setVideoSizerParam('archiverRoles', Math.max(0, parseInt(this.value, 10) || 0))" class="w-12 bg-slate-950 border border-slate-700/80 rounded px-1.5 py-0.5 text-xs font-mono font-bold ${g.isArchiverCountVerified ? 'text-emerald-400' : 'text-rose-400'} focus:outline-none text-center" title="Enter number of Genetec Archiver roles to verify against bitrate & camera count (0 = Auto)" />
                <button onclick="setVideoSizerParam('archiverRoles', 0)" class="text-[9px] font-mono px-1.5 py-0.5 rounded ${videoArchiverRoles === 0 ? 'bg-purple-900/80 text-purple-200' : 'bg-slate-800 text-slate-400 hover:text-white'} cursor-pointer" title="Reset to Auto-Calculated minimum Archiver roles">
                  Auto (${g.minRequiredArchiverRoles})
                </button>
              </div>
            </div>
          </div>

          <!-- Camera Groups Table -->
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="border-b border-slate-800 text-[9px] uppercase font-bold text-slate-400">
                  <th class="py-1.5 px-2 min-w-[130px]">Group Name</th>
                  <th class="py-1.5 px-1.5 w-20">Cameras</th>
                  <th class="py-1.5 px-1.5 w-24">Sensors/Cam</th>
                  <th class="py-1.5 px-1.5 min-w-[130px]">Resolution / Sensor</th>
                  <th class="py-1.5 px-1.5 w-24">Frame Rate</th>
                  <th class="py-1.5 px-1.5 min-w-[125px]">Format / Codec</th>
                  <th class="py-1.5 px-1.5 min-w-[120px]">Scene Activity</th>
                  <th class="py-1.5 px-1.5 min-w-[140px]">Rec Mode / Motion</th>
                  <th class="py-1.5 px-1.5 w-28">Retention (Days)</th>
                  <th class="py-1.5 px-2 text-right min-w-[115px]">Peak / Avg Mbps</th>
                  <th class="py-1.5 px-2 text-right min-w-[95px]">Group Usable</th>
                  <th class="py-1.5 px-1.5 text-center w-16">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800/60">
                ${(vCalc.cameraGroups || []).map((grp, idx) => `
                  <tr class="hover:bg-slate-900/50 transition-colors">
                    <!-- Group Name -->
                    <td class="py-1.5 px-2">
                      <input type="text" value="${String(grp.name || `Group ${idx + 1}`).replace(/"/g, '&quot;')}" onchange="updateVideoCameraGroup(${idx}, 'name', this.value)" class="w-full bg-slate-900 border border-slate-700/80 rounded px-2 py-1 text-xs font-semibold text-white focus:outline-none focus:border-purple-500" />
                    </td>
                    <!-- Camera Count -->
                    <td class="py-1.5 px-1.5">
                      <input type="number" min="1" max="5000" value="${grp.qty}" onchange="updateVideoCameraGroup(${idx}, 'qty', Math.max(1, parseInt(this.value, 10) || 1))" class="w-full bg-slate-900 border border-slate-700/80 rounded px-2 py-1 text-xs font-mono font-bold text-white text-center focus:outline-none focus:border-purple-500" />
                    </td>
                    <!-- Sensors per Camera -->
                    <td class="py-1.5 px-1.5">
                      <select onchange="updateVideoCameraGroup(${idx}, 'heads', Number(this.value))" class="w-full bg-slate-900 border border-slate-700/80 rounded px-1.5 py-1 text-slate-200 font-mono text-xs focus:outline-none cursor-pointer" title="Number of sensor heads/streams per camera unit">
                        <option value="1" class="bg-slate-900" ${(grp.heads || 1) === 1 ? 'selected' : ''}>1x Single</option>
                        <option value="2" class="bg-slate-900" ${grp.heads === 2 ? 'selected' : ''}>2x Dual</option>
                        <option value="3" class="bg-slate-900" ${grp.heads === 3 ? 'selected' : ''}>3x Triple</option>
                        <option value="4" class="bg-slate-900" ${grp.heads === 4 ? 'selected' : ''}>4x Quad</option>
                        <option value="5" class="bg-slate-900" ${grp.heads === 5 ? 'selected' : ''}>5x (4-Head+PTZ)</option>
                      </select>
                    </td>
                    <!-- Resolution -->
                    <td class="py-1.5 px-1.5">
                      <select onchange="updateVideoCameraGroup(${idx}, 'resolutionMp', Number(this.value))" class="w-full bg-slate-900 border border-slate-700/80 rounded px-1.5 py-1 text-white font-bold text-xs focus:outline-none cursor-pointer">
                        ${[
                          { mp: 1, label: "1MP (720p HD)" },
                          { mp: 2, label: "2MP (1080p FHD)" },
                          { mp: 3, label: "3MP (2048x1536)" },
                          { mp: 4, label: "4MP (2K QHD)" },
                          { mp: 5, label: "5MP (2592x1944)" },
                          { mp: 6, label: "6MP (3072x2048)" },
                          { mp: 8, label: "8MP (4K UHD)" },
                          { mp: 12, label: "12MP (Fisheye)" },
                          { mp: 16, label: "16MP (Panoramic)" },
                          { mp: 20, label: "20MP (Multi/Pan)" },
                          { mp: 32, label: "32MP (Ultra-Pan)" }
                        ].map(r => `<option value="${r.mp}" class="bg-slate-900" ${grp.resolutionMp === r.mp ? 'selected' : ''}>${r.label}</option>`).join('')}
                      </select>
                    </td>
                    <!-- Frame Rate (FPS) -->
                    <td class="py-1.5 px-1.5">
                      <select onchange="updateVideoCameraGroup(${idx}, 'fps', Number(this.value))" class="w-full bg-slate-900 border border-slate-700/80 rounded px-1.5 py-1 text-white font-bold text-xs focus:outline-none cursor-pointer">
                        ${[1, 5, 10, 12, 15, 20, 24, 30, 60].map(f => `<option value="${f}" class="bg-slate-900" ${grp.fps === f ? 'selected' : ''}>${f} FPS</option>`).join('')}
                      </select>
                    </td>
                    <!-- Format / Codec -->
                    <td class="py-1.5 px-1.5">
                      <select onchange="updateVideoCameraGroup(${idx}, 'codec', this.value)" class="w-full bg-slate-900 border border-slate-700/80 rounded px-1.5 py-1 text-sky-300 font-bold text-xs focus:outline-none cursor-pointer">
                        <option value="H.265" class="bg-slate-900" ${grp.codec === 'H.265' ? 'selected' : ''}>H.265 (HEVC)</option>
                        <option value="H.265+" class="bg-slate-900" ${grp.codec === 'H.265+' ? 'selected' : ''}>H.265+ (Smart)</option>
                        <option value="H.264" class="bg-slate-900" ${grp.codec === 'H.264' ? 'selected' : ''}>H.264 (AVC)</option>
                        <option value="AV1" class="bg-slate-900" ${grp.codec === 'AV1' ? 'selected' : ''}>AV1 (Genetec 5.14)</option>
                        <option value="AVI" class="bg-slate-900" ${grp.codec === 'AVI' ? 'selected' : ''}>AVI / MJPEG</option>
                      </select>
                    </td>
                    <!-- Scene Activity -->
                    <td class="py-1.5 px-1.5">
                      <select onchange="updateVideoCameraGroup(${idx}, 'sceneActivity', this.value)" class="w-full bg-slate-900 border border-slate-700/80 rounded px-1.5 py-1 text-white font-bold text-xs focus:outline-none cursor-pointer">
                        <option value="low" class="bg-slate-900" ${grp.sceneActivity === 'low' ? 'selected' : ''}>Low (0.65x)</option>
                        <option value="medium" class="bg-slate-900" ${grp.sceneActivity === 'medium' ? 'selected' : ''}>Medium (1.0x)</option>
                        <option value="high" class="bg-slate-900" ${grp.sceneActivity === 'high' ? 'selected' : ''}>High (1.40x)</option>
                        <option value="ultra" class="bg-slate-900" ${grp.sceneActivity === 'ultra' ? 'selected' : ''}>Very High (1.75x)</option>
                      </select>
                    </td>
                    <!-- Rec Mode / Motion Duty -->
                    <td class="py-1.5 px-1.5">
                      <select onchange="updateVideoCameraGroup(${idx}, 'motionDutyPct', Number(this.value))" class="w-full bg-slate-900 border border-slate-700/80 rounded px-1.5 py-1 text-white font-bold text-xs focus:outline-none cursor-pointer">
                        <option value="100" class="bg-slate-900" ${grp.motionDutyPct >= 100 ? 'selected' : ''}>Continuous (100%)</option>
                        <option value="75" class="bg-slate-900" ${grp.motionDutyPct === 75 ? 'selected' : ''}>Motion High (75%)</option>
                        <option value="70" class="bg-slate-900" ${grp.motionDutyPct === 70 ? 'selected' : ''}>Motion Comm (70%)</option>
                        <option value="50" class="bg-slate-900" ${grp.motionDutyPct === 50 ? 'selected' : ''}>Motion Med (50%)</option>
                        <option value="25" class="bg-slate-900" ${grp.motionDutyPct === 25 ? 'selected' : ''}>Motion Low (25%)</option>
                        <option value="10" class="bg-slate-900" ${grp.motionDutyPct === 10 ? 'selected' : ''}>Motion Min (10%)</option>
                      </select>
                    </td>
                    <!-- Retention Days (Number input with quick step) -->
                    <td class="py-1.5 px-1.5">
                      <div class="flex items-center gap-1">
                        <input type="number" min="1" max="1825" value="${grp.retentionDays}" onchange="updateVideoCameraGroup(${idx}, 'retentionDays', Math.max(1, parseInt(this.value, 10) || 30))" class="w-full bg-slate-900 border border-slate-700/80 rounded px-2 py-1 text-xs font-mono font-bold text-amber-300 text-center focus:outline-none focus:border-purple-500" title="Retention in days for this camera group" />
                        <span class="text-[10px] text-slate-400 font-mono">d</span>
                      </div>
                    </td>
                    <!-- Group Peak / Avg Bitrate -->
                    <td class="py-1.5 px-2 text-right font-mono">
                      <div class="text-xs font-bold text-sky-400">${grp.peakIngressMbps} <span class="text-slate-500">/</span> ${grp.averageRecordingMbps}</div>
                      <div class="text-[9px] text-slate-500">${grp.perCameraMbps} Mbps/cam (${grp.totalStreams} str)</div>
                    </td>
                    <!-- Group Usable TB -->
                    <td class="py-1.5 px-2 text-right font-mono">
                      <div class="text-xs font-bold text-purple-300">${grp.requiredUsableTb} TB</div>
                      <div class="text-[9px] text-slate-500">${grp.dailyStorageGb} GB/d</div>
                    </td>
                    <!-- Row Actions -->
                    <td class="py-1.5 px-1.5 text-center">
                      <div class="flex items-center justify-center gap-1">
                        <button onclick="duplicateVideoCameraGroup(${idx})" class="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-sky-300 transition-colors cursor-pointer" title="Duplicate this camera group">
                          <i data-lucide="copy" class="w-3.5 h-3.5"></i>
                        </button>
                        ${(vCalc.cameraGroups || []).length > 1 ? `
                          <button onclick="removeVideoCameraGroup(${idx})" class="p-1 rounded hover:bg-rose-950/80 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer" title="Remove this camera group">
                            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                          </button>
                        ` : ''}
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
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

              <!-- Server Profile, Multi-Role Server Count & Encryption Modifiers -->
              <div class="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1">
                <div class="sm:col-span-6 bg-slate-900/90 border border-slate-800 rounded-lg px-2.5 py-1.5">
                  <div class="text-[9px] font-bold uppercase text-slate-400">Genetec 5.14 Server Profile (${g.profile?.referencePage || 'Sec 1.4'})</div>
                  <select onchange="setVideoSizerParam('genetecProfile', this.value)" class="w-full bg-transparent text-sky-300 font-bold text-xs focus:outline-none cursor-pointer mt-0.5">
                    ${profilesList.map(p => `<option value="${p.id}" class="bg-slate-900" ${g.profileKey === p.id ? 'selected' : ''}>${p.label} (Max ${p.maxCamerasPerRole} Cam / ${p.maxBitrateMbpsPerRole} Mbps/Role • ≤${p.maxRolesPerServer || 4} Roles/Srv)</option>`).join('')}
                  </select>
                </div>
                <div class="sm:col-span-3 bg-slate-900/90 border ${g.isServerCountVerified !== false ? 'border-slate-800' : 'border-rose-600'} rounded-lg px-2.5 py-1.5 flex flex-col justify-center">
                  <div class="flex items-center justify-between">
                    <span class="text-[9px] font-bold uppercase text-slate-400">Servers (#)</span>
                    <button onclick="setVideoSizerParam('serverCount', 0)" class="text-[9px] font-mono px-1 rounded ${videoServerCount === 0 ? 'bg-purple-900/80 text-purple-200' : 'bg-slate-800 text-slate-400 hover:text-white'} cursor-pointer" title="Auto-pack multiple Archiver roles onto servers within Genetec limits">
                      Auto (${g.minRequiredServers || 1})
                    </button>
                  </div>
                  <div class="flex items-center gap-1 mt-0.5">
                    <input type="number" min="0" max="64" value="${videoServerCount === 0 ? g.recommendedArchiverServers : videoServerCount}" onchange="setVideoSizerParam('serverCount', Math.max(0, parseInt(this.value, 10) || 0))" class="w-full bg-slate-950 border border-slate-700/80 rounded px-1.5 py-0.5 text-xs font-mono font-bold ${g.isServerCountVerified !== false ? 'text-amber-300' : 'text-rose-400'} focus:outline-none" title="Number of physical servers (can run up to ${g.maxRolesPerPhysicalServer || 4} Archiver roles per server)" />
                    <span class="text-[9px] text-slate-400 font-mono">Srv</span>
                  </div>
                </div>
                <div class="sm:col-span-3 bg-slate-900/90 border border-slate-800 rounded-lg px-2.5 py-1.5 flex flex-col justify-center">
                  <div class="text-[9px] font-bold uppercase text-slate-400">Encryption (p.10)</div>
                  <select onchange="setVideoSizerParam('encryptionCerts', Number(this.value))" class="w-full bg-transparent text-slate-200 font-bold text-xs focus:outline-none cursor-pointer mt-0.5">
                    <option value="0" class="bg-slate-900" ${g.encryptionCerts === 0 ? 'selected' : ''}>0 Certs (100%)</option>
                    <option value="1" class="bg-slate-900" ${g.encryptionCerts === 1 ? 'selected' : ''}>1 Cert (-30%)</option>
                    <option value="5" class="bg-slate-900" ${g.encryptionCerts === 5 ? 'selected' : ''}>5 Certs (-41%)</option>
                    <option value="10" class="bg-slate-900" ${g.encryptionCerts === 10 ? 'selected' : ''}>10 Certs (-52%)</option>
                    <option value="20" class="bg-slate-900" ${g.encryptionCerts === 20 ? 'selected' : ''}>20 Certs (-68%)</option>
                  </select>
                </div>
              </div>

              <!-- Per-Archiver, Multi-Role Server & Isolated Windows Volume Mapping Grid -->
              <div class="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center pt-1">
                <div class="p-2 rounded-lg bg-slate-900/70 border border-slate-800/90">
                  <div class="text-[9px] font-mono uppercase text-slate-400">Archiver Roles</div>
                  <div class="text-sm font-mono font-bold ${g.isArchiverCountVerified ? 'text-emerald-400' : 'text-rose-400'}">${g.activeArchiverRoles} <span class="text-[10px] text-slate-400">/ ${g.minRequiredArchiverRoles} Min</span></div>
                  <div class="text-[9px] text-slate-500">≤${g.effectiveMaxMbpsPerArchiver} Mbps/Role</div>
                </div>
                <div class="p-2 rounded-lg bg-slate-900/70 border border-slate-800/90">
                  <div class="text-[9px] font-mono uppercase text-slate-400">Load / Role</div>
                  <div class="text-sm font-mono font-bold text-sky-400">${g.bitratePerArchiverRoleMbps} Mbps</div>
                  <div class="text-[9px] text-slate-500">${g.camerasPerArchiverRole} Cam • ${g.usableTbPerArchiverRole} TB</div>
                </div>
                <div class="p-2 rounded-lg bg-slate-900/70 border border-slate-800/90">
                  <div class="text-[9px] font-mono uppercase text-slate-400">Roles / Server</div>
                  <div class="text-sm font-mono font-bold ${g.isServerCountVerified !== false ? 'text-amber-300' : 'text-rose-400'}">${g.rolesPerServer || 1} Role${(g.rolesPerServer || 1) === 1 ? '' : 's'}/Srv</div>
                  <div class="text-[9px] text-slate-500">${g.recommendedArchiverServers} Srv (${g.bitratePerServerMbps} Mbps/Srv)</div>
                </div>
                <div class="p-2 rounded-lg bg-slate-900/70 border border-slate-800/90 sm:col-span-2" title="Every Archiver role requires its own separate Windows volume(s), and each Windows volume is capped at ≤30 TB usable.">
                  <div class="text-[9px] font-mono uppercase text-purple-300">Windows Volumes (≤${g.maxVolumeSizeTb || 30}TB Cap • Isolated/Role)</div>
                  <div class="text-sm font-mono font-bold text-purple-300">${g.totalLogicalVolumes || 1} Win Vol${(g.totalLogicalVolumes || 1) === 1 ? '' : 's'} <span class="text-[10px] text-slate-400">(${g.volumesPerArchiverRole || 1} Vol/Role)</span></div>
                  <div class="text-[9px] text-slate-400">${g.volumesPerServer || 1} Vol/Srv • ~${g.sizePerVolumeTb || g.usableTbPerArchiverRole} TB/Vol</div>
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
                  <span>All Genetec 5.14 throughput, multi-role server limits, directory isolation, and Windows volume rules satisfied.</span>
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
                Selected Plan: <strong>${dp.totalDrives || 0}x ${dp.driveSizeTb || 16}TB</strong> = <strong>${dp.rawStorageTb || 0} TB Raw</strong> (${dp.usableStorageTb || 0} TB Usable • ${dp.totalVolumes30Tb || 1} Win Vols)
              </span>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse text-[11px] font-mono">
                <thead>
                  <tr class="border-b border-slate-800 text-[9px] uppercase text-slate-400">
                    <th class="py-1.5 px-2">Drive Size</th>
                    <th class="py-1.5 px-2">Total Drives</th>
                    <th class="py-1.5 px-2">Data + Parity</th>
                    <th class="py-1.5 px-2">Drives / Srv</th>
                    <th class="py-1.5 px-2">Total Raw TB</th>
                    <th class="py-1.5 px-2">Usable TB (Eff%)</th>
                    <th class="py-1.5 px-2">Windows Vols (≤30TB)</th>
                    <th class="py-1.5 px-2">Chassis Bay Fit</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-800/60">
                  ${(vCalc.driveOptionsMatrix || []).map(opt => {
                    const isSelected = opt.driveSizeTb === vCalc.preferredDriveSizeTb;
                    return `
                      <tr onclick="setVideoSizerParam('preferredDriveTb', ${opt.driveSizeTb})" class="cursor-pointer transition-colors ${isSelected ? 'bg-purple-950/50 text-white font-bold' : 'hover:bg-slate-900/80 text-slate-300'}">
                        <td class="py-1.5 px-2 flex items-center gap-1.5">
                          <span class="w-2 h-2 rounded-full ${isSelected ? 'bg-purple-400 ring-2 ring-purple-400/40' : 'bg-slate-700'}"></span>
                          <span class="${isSelected ? 'text-purple-300 font-bold' : 'text-white'}">${opt.driveSizeTb} TB HDD</span>
                        </td>
                        <td class="py-1.5 px-2 text-amber-300 font-bold">${opt.totalDrives} Drives</td>
                        <td class="py-1.5 px-2 text-slate-400">${opt.totalDataDrives}D + ${opt.totalParityDrives}P</td>
                        <td class="py-1.5 px-2 text-sky-300">${opt.drivesPerServer} / srv</td>
                        <td class="py-1.5 px-2 text-white">${opt.rawStorageTb} TB</td>
                        <td class="py-1.5 px-2 text-emerald-400">${opt.usableStorageTb} TB <span class="text-slate-500">(${opt.efficiencyPct}%)</span></td>
                        <td class="py-1.5 px-2 text-purple-300" title="${opt.windowsVolumesPerRole} Windows Volume(s) per Archiver role × ${g.activeArchiverRoles} role(s) = ${opt.totalVolumes30Tb} separate Windows Volumes (~${opt.sizePerVolumeTb} TB each, ≤30 TB)">
                          ${opt.totalVolumes30Tb} Vol${opt.totalVolumes30Tb === 1 ? '' : 's'} <span class="text-slate-400 text-[10px]">(${opt.windowsVolumesPerRole}/role @ ${opt.sizePerVolumeTb}TB)</span>
                        </td>
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

        <!-- Turnkey Streamvault Appliance & Genetec Security Center Licensing Integration Bar -->
        ${(() => {
          if (typeof GenetecLicensingSizer === "undefined") return "";
          const licRes = GenetecLicensingSizer.calculate(projectBOM);
          const svPlan = licRes.streamvaultPlan || {};
          const prim = svPlan.primaryAppliance;
          const showLicInline = Boolean(window.videoShowLicPanel);
          const tierLabels = {
            aio: "Streamvault AIO (≤32 Cams)",
            standard: "Omnicast Standard (≤50 Cams)",
            pro: "Omnicast Pro (≤100 Cams)",
            enterprise: "Omnicast Enterprise"
          };
          return `
            <div class="pt-2.5 border-t border-slate-800/90 flex flex-col gap-2.5">
              <div class="bg-indigo-950/30 border border-indigo-500/30 rounded-xl p-3 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                <div class="flex flex-wrap items-center gap-3">
                  <div class="flex items-center gap-2">
                    <span class="px-2 py-0.5 rounded bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                      <i data-lucide="shield-check" class="w-3 h-3"></i>
                      Streamvault &amp; Genetec Licensing
                    </span>
                    <span class="text-xs font-bold text-white">
                      ${prim ? `${svPlan.primaryQty}x ${prim.model.replace('Streamvault ', '')}` : 'Add Cameras to Size Streamvault Appliance'}
                    </span>
                  </div>
                  ${prim ? `
                    <span class="text-[11px] text-slate-300 font-mono bg-slate-950/80 border border-slate-800 px-2 py-0.5 rounded-lg">
                      ${(svPlan.primaryQty * (prim.usableStorageTb || 0)).toFixed(1)} TB Usable (${prim.raidSupport}) &bull; ${svPlan.primaryQty * (prim.maxThroughputMbps || 0)} Mbps &bull; $${(svPlan.primaryQty * (prim.msrp || 0)).toLocaleString()} HW
                    </span>
                  ` : ''}
                  ${svPlan.directoryAppliance ? `
                    <span class="text-[11px] text-amber-300 font-mono bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 rounded-lg" title="Dedicated Directory / Failover Host (>300 cameras or Failover Directory enabled)">
                      + ${svPlan.directoryQty}x ${svPlan.directoryAppliance.sku} Directory Host
                    </span>
                  ` : ''}
                  ${svPlan.analyticsAppliance ? `
                    <span class="text-[11px] text-emerald-300 font-mono bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded-lg">
                      + ${svPlan.analyticsQty}x ${svPlan.analyticsAppliance.applianceSeries} Analytics
                    </span>
                  ` : ''}
                  <span class="text-[11px] text-indigo-200 font-mono bg-indigo-950/60 border border-indigo-500/30 px-2.5 py-0.5 rounded-lg">
                    Tier: <strong>${tierLabels[licRes.effectiveTier] || 'Enterprise'}</strong> &bull; ${licRes.cameraUnits} Cam Lic + ${licRes.advantageYears}Y Advantage = <strong>$${licRes.totalSoftwareMsrp.toLocaleString()}</strong> SW
                  </span>
                </div>

                <div class="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onclick="autoFitStreamvaultToBom()"
                    class="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    title="Auto-fit the recommended Genetec Streamvault Appliance(s) (SV-300E / SV-350E / SV-1041E / SV-2041E / SV-4041EX) to the BOM"
                  >
                    <i data-lucide="server" class="w-3.5 h-3.5"></i>
                    <span>+ Auto-Fit Streamvault</span>
                  </button>
                  <button
                    type="button"
                    onclick="addGenetecLicensesToBom()"
                    class="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    title="Add the calculated Genetec Security Center Base, Camera Connections, Failover, and Advantage SMA licenses to the BOM"
                  >
                    <i data-lucide="key" class="w-3.5 h-3.5"></i>
                    <span>+ Add Genetec Licenses ($${licRes.totalSoftwareMsrp.toLocaleString()})</span>
                  </button>
                  <button
                    type="button"
                    onclick="window.videoShowLicPanel = !window.videoShowLicPanel; buildCalculatorStrip();"
                    class="px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${showLicInline ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-200' : 'bg-slate-950 border-slate-700 text-slate-300 hover:text-white'}"
                  >
                    <i data-lucide="sliders" class="w-3.5 h-3.5"></i>
                    <span>${showLicInline ? 'Hide Licensing Builder' : 'Configure Licensing & Add-Ons'}</span>
                  </button>
                </div>
              </div>
              ${showLicInline ? renderGenetecLicensingBuilderHtml(licRes, true) : ''}
            </div>
          `;
        })()}
      </div>
    `;
  } else if (currentMode === "vms_software" || currentMode === "os_virtualization") {
    container.classList.remove("hidden");
    const licRes = (typeof GenetecLicensingSizer !== "undefined")
      ? GenetecLicensingSizer.calculate(projectBOM)
      : null;
    container.innerHTML = licRes ? renderGenetecLicensingBuilderHtml(licRes, false) : "";
  } else if (currentMode === "workstations") {
    container.classList.remove("hidden");
    const licRes = (typeof GenetecLicensingSizer !== "undefined")
      ? GenetecLicensingSizer.calculate(projectBOM)
      : null;
    const svw = licRes?.streamvaultPlan?.workstationAppliance;
    const cams = licRes?.cameraUnits || 0;
    container.innerHTML = `
      <div class="bg-slate-900/95 border border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 shadow-md">
        <div class="flex items-center gap-3">
          <div class="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 shrink-0">
            <i data-lucide="monitor" class="w-5 h-5"></i>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h4 class="text-xs font-bold text-white uppercase tracking-wider">Genetec Security Desk &amp; Streamvault SVW Workstation Sizer</h4>
              <span class="px-2 py-0.5 rounded bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-[10px] font-bold">SVW-100E / 300E / 500E</span>
            </div>
            <p class="text-[11px] text-slate-400">
              Project has <strong class="text-white">${cams} camera streams</strong>.
              ${svw ? `Recommended operator station: <strong class="text-indigo-300">${svw.model}</strong> (up to ${svw.maxMonitors} monitors, ${svw.decodeStreams1080p} FHD / ${svw.decodeStreams720p || svw.decodeStreams1080p * 2} HD streams).` : ''}
            </p>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-2.5">
          <div class="flex items-center gap-2 bg-slate-950/90 border border-slate-800 rounded-xl px-3 py-1.5">
            <span class="text-[10px] font-bold uppercase text-slate-400">Security Desk Clients:</span>
            <input type="number" min="1" max="200" value="${licRes?.workstationClients || 5}" onchange="setGenetecLicParam('workstationClients', parseInt(this.value,10)||5)" class="w-14 bg-slate-900 border border-slate-700 rounded-lg px-2 py-0.5 text-center text-xs font-bold text-white focus:outline-none" />
            <span class="text-[10px] text-slate-500">(5 free in Base, +${licRes?.extraClients || 0} GSC-1U)</span>
          </div>
          ${svw ? `
          <button onclick="addToBOM('${svw.id}', 1); if(typeof showToast==='function') showToast('Added 1x ${svw.model} to BOM.', 'success');" class="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer">
            <i data-lucide="plus-circle" class="w-4 h-4"></i>
            <span>+ Add ${svw.sku} ($${(svw.msrp || 0).toLocaleString()})</span>
          </button>
          ` : ''}
        </div>
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
  } else if (key === "serverCount") {
    videoServerCount = val; window.videoServerCount = val;
    if (typeof VideoStorageSizer !== "undefined") VideoStorageSizer.state.serverCountOverride = val;
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

function ensureEditableCameraGroups() {
  if (typeof VideoStorageSizer === "undefined") return [];
  if (!VideoStorageSizer.state.hasCustomGroups) {
    const bomGroups = VideoStorageSizer.buildCameraGroupsFromBom(projectBOM);
    if (bomGroups.length > 0 && (videoSourceMode === "auto" || videoSourceMode === "bom")) {
      VideoStorageSizer.state.cameraGroups = bomGroups;
    } else if (!Array.isArray(VideoStorageSizer.state.cameraGroups) || VideoStorageSizer.state.cameraGroups.length === 0) {
      VideoStorageSizer.state.cameraGroups = [{
        id: "grp_1",
        name: "Camera Group 1",
        qty: videoManualCamCount || 32,
        heads: 1,
        resolutionMp: videoResolutionMp || 4,
        fps: videoFps || 15,
        codec: videoCodec || "H.265",
        sceneActivity: videoSceneActivity || "medium",
        motionDutyPct: Math.round((videoMotionDuty || 0.5) * 100),
        retentionDays: videoRetentionDays || 30
      }];
    }
    VideoStorageSizer.state.hasCustomGroups = true;
    videoSourceMode = "manual";
    window.videoSourceMode = "manual";
    VideoStorageSizer.state.sourceMode = "manual";
  }
  return VideoStorageSizer.state.cameraGroups;
}

function addVideoCameraGroup() {
  const groups = ensureEditableCameraGroups();
  const last = groups[groups.length - 1] || {};
  const nextIdx = groups.length + 1;
  groups.push({
    id: `grp_${Date.now()}_${nextIdx}`,
    name: `Camera Group ${nextIdx}`,
    qty: 8,
    heads: 1,
    resolutionMp: last.resolutionMp || 4,
    fps: last.fps || 15,
    codec: last.codec || "H.265",
    sceneActivity: last.sceneActivity || "medium",
    motionDutyPct: last.motionDutyPct ?? 50,
    retentionDays: last.retentionDays || 30
  });
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
  if (typeof updateProjectHealthUI === "function") updateProjectHealthUI();
}
window.addVideoCameraGroup = addVideoCameraGroup;

function duplicateVideoCameraGroup(index) {
  const groups = ensureEditableCameraGroups();
  const src = groups[index];
  if (!src) return;
  groups.splice(index + 1, 0, {
    ...src,
    id: `grp_${Date.now()}_${index + 2}`,
    name: `${src.name || 'Group'} (Copy)`
  });
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
  if (typeof updateProjectHealthUI === "function") updateProjectHealthUI();
}
window.duplicateVideoCameraGroup = duplicateVideoCameraGroup;

function removeVideoCameraGroup(index) {
  const groups = ensureEditableCameraGroups();
  if (groups.length <= 1) return;
  groups.splice(index, 1);
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
  if (typeof updateProjectHealthUI === "function") updateProjectHealthUI();
}
window.removeVideoCameraGroup = removeVideoCameraGroup;

function updateVideoCameraGroup(index, field, val) {
  const groups = ensureEditableCameraGroups();
  if (!groups[index]) return;
  groups[index][field] = val;
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
  if (typeof updateProjectHealthUI === "function") updateProjectHealthUI();
}
window.updateVideoCameraGroup = updateVideoCameraGroup;

function importBomCamerasToGroups() {
  if (typeof VideoStorageSizer === "undefined") return;
  const bomGroups = VideoStorageSizer.buildCameraGroupsFromBom(projectBOM);
  if (bomGroups.length > 0) {
    VideoStorageSizer.state.cameraGroups = bomGroups;
    VideoStorageSizer.state.hasCustomGroups = true;
    videoSourceMode = "manual";
    window.videoSourceMode = "manual";
    VideoStorageSizer.state.sourceMode = "manual";
    if (typeof showToast === "function") {
      showToast(`Imported ${bomGroups.length} camera group(s) from BOM into the Storage Calculator.`, "info");
    }
    if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
    if (typeof updateProjectHealthUI === "function") updateProjectHealthUI();
  }
}
window.importBomCamerasToGroups = importBomCamerasToGroups;

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

// =========================================================================
// GENETEC STREAMVAULT APPLIANCE & SECURITY CENTER LICENSING CONTROLLERS
// =========================================================================

function setGenetecLicParam(key, val) {
  if (typeof window.genetecLicensingConfig !== "object" || !window.genetecLicensingConfig) {
    window.genetecLicensingConfig = (typeof GenetecLicensingSizer !== "undefined")
      ? GenetecLicensingSizer.getDefaultConfig()
      : {};
  }
  window.genetecLicensingConfig[key] = val;
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
  if (typeof updateProjectHealthUI === "function") updateProjectHealthUI();
}
window.setGenetecLicParam = setGenetecLicParam;

function autoFitStreamvaultToBom() {
  if (typeof GenetecLicensingSizer === "undefined" || typeof addToBOM !== "function") return;
  const licRes = GenetecLicensingSizer.calculate(projectBOM);
  const svPlan = licRes.streamvaultPlan || {};
  const addedModels = [];

  if (svPlan.primaryAppliance && svPlan.primaryQty > 0) {
    addToBOM(svPlan.primaryAppliance.id || svPlan.primaryAppliance.sku, svPlan.primaryQty);
    addedModels.push(`${svPlan.primaryQty}x ${svPlan.primaryAppliance.sku}`);
  }
  if (svPlan.directoryAppliance && svPlan.directoryQty > 0) {
    addToBOM(svPlan.directoryAppliance.id || svPlan.directoryAppliance.sku, svPlan.directoryQty);
    addedModels.push(`${svPlan.directoryQty}x ${svPlan.directoryAppliance.sku} (Directory)`);
  }
  if (svPlan.analyticsAppliance && svPlan.analyticsQty > 0) {
    addToBOM(svPlan.analyticsAppliance.id || svPlan.analyticsAppliance.sku, svPlan.analyticsQty);
    addedModels.push(`${svPlan.analyticsQty}x ${svPlan.analyticsAppliance.sku} (Analytics)`);
  }

  if (addedModels.length > 0 && typeof showToast === "function") {
    showToast(`Auto-Fitted Streamvault Hardware to BOM: ${addedModels.join(", ")}.`, "success");
  } else if (typeof showToast === "function") {
    showToast("Add cameras or set camera count first to auto-size Streamvault appliances.", "info");
  }
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
}
window.autoFitStreamvaultToBom = autoFitStreamvaultToBom;

function addGenetecLicensesToBom() {
  if (typeof GenetecLicensingSizer === "undefined" || typeof addToBOM !== "function") return;
  const licRes = GenetecLicensingSizer.calculate(projectBOM);
  const items = licRes.lineItems || [];
  if (items.length === 0) {
    if (typeof showToast === "function") {
      showToast("Add cameras or configure client/add-on counts first to generate Genetec licenses.", "info");
    }
    return;
  }

  // Remove any previously added Genetec VMS software licenses to avoid duplicates when re-syncing
  const genetecCatalogIds = new Set(items.map(li => li.catalogId).filter(Boolean));
  [
    "genetec-gsc-base-s-513", "genetec-gsc-base-e-513",
    "genetec-gsc-om-s-base", "genetec-gsc-om-p-base", "genetec-gsc-base-514",
    "genetec-gsc-sv-aio-1c", "genetec-gsc-sv-aio-1pac", "genetec-gsc-sv-aio-1r",
    "genetec-gsc-om-s-1c", "genetec-gsc-om-p-1c", "genetec-gsc-1cam-lic",
    "genetec-gsc-om-s-1pac", "genetec-gsc-om-e-1pac", "genetec-gsc-om-e-1dv", "genetec-gsc-om-e-1bwc",
    "genetec-gsc-failover-1cam", "genetec-gsc-1fod", "genetec-gsc-standby-svr",
    "genetec-gsc-sy-s-1re", "genetec-gsc-sy-e-1re", "genetec-gsc-sy-s-1r", "genetec-gsc-sy-e-1r",
    "genetec-gsc-sy-e-1wr", "genetec-gsc-sy-s-vis", "genetec-gsc-sy-e-vis",
    "genetec-gsc-1u-client", "genetec-gsc-1stu-site", "genetec-gsc-1mobileu", "genetec-gsc-1mobilestu", "genetec-gsc-1wu",
    "genetec-pm-std-50", "genetec-pm-std-100", "genetec-pm-std-250", "genetec-pm-std-500", "genetec-pm-std-1000", "genetec-pm-std-site",
    "genetec-ad-integration", "genetec-federation", "genetec-federation-20", "genetec-stratocast-fed",
    "genetec-kiwivision-privacy-1c", "genetec-kiwivision-security-1c", "genetec-kiwivision-unlimited-1c", "genetec-kiwivision-people-1c",
    "genetec-autovu-base", "genetec-autovu-1shp", "genetec-autovu-1patroller",
    "genetec-sipelia-1sip", "genetec-sipelia-1trunk", "genetec-sipelia-1pa",
    "genetec-intrusion-1ap", "genetec-intrusion-dmp", "genetec-intrusion-dsc",
    "genetec-intrusion-honeywell", "genetec-intrusion-bosch-map5000", "genetec-intrusion-vanderbilt-spc",
    "genetec-gsc-1sdk", "genetec-sdk-lsp-netlink", "genetec-sdk-amg-ndm", "genetec-sdk-allied-streamconnect",
    "genetec-sdk-vunetrix", "genetec-sdk-hid-is", "genetec-sdk-schlage-wifilock", "genetec-sdk-aa-accentra",
    "genetec-sdk-alcatraz-rock", "genetec-sdk-raptor-connect", "genetec-sdk-evolv-express", "genetec-sdk-omnilert-gundetect",
    "genetec-sdk-senstar-nms", "genetec-sdk-esri-arcgis", "genetec-sdk-vuwall-trx", "genetec-sdk-commend-duetto",
    "genetec-sdk-tiger-bridge", "genetec-dap-bronze",
    "genetec-plugin-elevator-dispatch", "genetec-plugin-opc-server", "genetec-plugin-keycabinet-base",
    "genetec-plugin-keycabinet-1cab", "genetec-plugin-alarm-receiver",
    "genetec-adv-mc-1opp-1y", "genetec-adv-mc-1opp-3y", "genetec-adv-mc-1opp-5y",
    "genetec-rsa-standard", "genetec-rsa-pro", "genetec-rsa-ent",
    "genetec-iiot-site", "genetec-iiot-1d",
    "genetec-cloud-perf-1tb", "genetec-cloud-lt-1tb", "genetec-clearance-1cam-1y",
    "genetec-adv-cam-aio-1y", "genetec-adv-cam-aio-3y", "genetec-adv-cam-aio-5y",
    "genetec-adv-cam-s-1y", "genetec-adv-cam-s-3y", "genetec-adv-cam-s-5y",
    "genetec-adv-cam-p-1y", "genetec-advantage-1cam-1yr", "genetec-adv-cam-e-3y", "genetec-adv-cam-e-5y",
    "genetec-adv-rdr-aio-1y", "genetec-adv-rdr-aio-3y", "genetec-adv-rdr-aio-5y",
    "genetec-adv-rdr-s-1y", "genetec-adv-rdr-s-3y", "genetec-adv-rdr-s-5y",
    "genetec-adv-rdr-e-1y", "genetec-adv-rdr-e-3y", "genetec-adv-rdr-e-5y",
    "genetec-adv-lpr-f-1y", "genetec-adv-lpr-f-3y", "genetec-adv-lpr-f-5y",
    "genetec-adv-sip-1y", "genetec-adv-sip-3y", "genetec-adv-sip-5y",
    "genetec-adv-1ap-1y", "genetec-adv-1ap-3y", "genetec-adv-1ap-5y",
    "genetec-adv-option-247-1y", "genetec-adv-option-247-3y", "genetec-adv-option-247-5y",
    "ms-sql-svr-2025-express", "ms-sql-svr-2022-std-4c"
  ].forEach(id => genetecCatalogIds.add(id));

  if (Array.isArray(projectBOM)) {
    for (let i = projectBOM.length - 1; i >= 0; i--) {
      const bItem = projectBOM[i]?.item;
      if (bItem && (genetecCatalogIds.has(bItem.id) || (bItem.vendor === "Genetec" && bItem.category === "vms_software"))) {
        projectBOM.splice(i, 1);
      }
    }
  }

  items.forEach(li => {
    if (li.catalogId && li.qty > 0) {
      addToBOM(li.catalogId, li.qty);
    }
  });

  if (typeof showToast === "function") {
    showToast(`Synchronized ${items.length} Genetec Security Center License and Software Maintenance line item(s) ($${licRes.totalSoftwareMsrp.toLocaleString()} MSRP) to Bill of Materials.`, "success");
  }
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
}
window.addGenetecLicensesToBom = addGenetecLicensesToBom;

function addTurnkeyGenetecPackageToBom() {
  autoFitStreamvaultToBom();
  addGenetecLicensesToBom();
}
window.addTurnkeyGenetecPackageToBom = addTurnkeyGenetecPackageToBom;

function renderGenetecLicensingBuilderHtml(licRes, isEmbeddedInServers = false) {
  if (!licRes) return "";
  const cfg = licRes.config || {};
  const svPlan = licRes.streamvaultPlan || {};
  const prim = svPlan.primaryAppliance;
  const vLoad = licRes.videoLoad || {};
  const coreFailover = licRes.coreFailover || cfg.coreFailover || "none";
  const needsSqlStd = Boolean(licRes.needsSqlStandard);
  const partnerSdkOptions = (typeof GenetecLicensingSizer !== "undefined" && Array.isArray(GenetecLicensingSizer.PARTNER_SDK_OPTIONS))
    ? GenetecLicensingSizer.PARTNER_SDK_OPTIONS
    : [];

  const tierBadgeMap = {
    aio: {
      label: "Streamvault All-in-One Tier (Up to 32 Cameras • $0.00 Base)",
      color: "bg-sky-500/20 border-sky-500/40 text-sky-300"
    },
    standard: {
      label: "Security Center Base Standard Package — GSC-BASE-S ($0.00 Base • Up to 100 Cameras / 100 Readers / 25 Clients)",
      color: "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
    },
    enterprise: {
      label: "Security Center Base Enterprise Package — GSC-BASE-E ($0.00 Base • Unlimited Cameras, Readers & Clients)",
      color: "bg-indigo-500/20 border-indigo-500/40 text-indigo-300"
    }
  };
  const activeTierBadge = tierBadgeMap[licRes.effectiveTier] || tierBadgeMap.enterprise;

  return `
    <div class="${isEmbeddedInServers ? 'bg-slate-950/90 border border-indigo-500/30 rounded-xl p-3.5' : 'bg-slate-900/95 border border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-lg'} flex flex-col gap-3.5 max-h-[75vh] overflow-y-auto overscroll-contain custom-scrollbar">
      <!-- Header Row -->
      <div class="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pb-2.5 border-b border-slate-800/80">
        <div class="flex items-start sm:items-center gap-3">
          <div class="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 shrink-0">
            <i data-lucide="key" class="w-5 h-5"></i>
          </div>
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <h4 class="text-xs font-bold text-white uppercase tracking-wider">
                Genetec Security Center 5.13 / 5.14 Unified License &amp; Streamvault Designer
              </h4>
              <span class="px-2 py-0.5 rounded border text-[10px] font-bold ${activeTierBadge.color}">
                ${activeTierBadge.label}
              </span>
              <span class="px-2 py-0.5 rounded border text-[10px] font-bold ${needsSqlStd ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'}">
                ${needsSqlStd ? 'Database: Microsoft SQL Server Standard ($1,418 • Full Core Failover)' : 'Database: Microsoft SQL Server 2025 Express (50 GB Cap • $0.00 Included)'}
              </span>
              <a href="Datasheets/Genetec/ProductCompatability.pdf" target="_blank" class="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold flex items-center gap-1 transition">
                <i data-lucide="file-text" class="w-3 h-3 text-indigo-400"></i>
                <span>Product Compatibility Guide</span>
              </a>
              <a href="Datasheets/Genetec/SystemRequirements.pdf" target="_blank" class="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold flex items-center gap-1 transition">
                <i data-lucide="file-text" class="w-3 h-3 text-purple-400"></i>
                <span>System Requirements Guide</span>
              </a>
              <a href="Datasheets/Genetec/SupportedPlugins.pdf" target="_blank" class="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold flex items-center gap-1 transition">
                <i data-lucide="plug" class="w-3 h-3 text-emerald-400"></i>
                <span>Supported Plugins Guide</span>
              </a>
              <a href="Datasheets/Genetec/RSA.pdf" target="_blank" class="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold flex items-center gap-1 transition">
                <i data-lucide="radar" class="w-3 h-3 text-amber-400"></i>
                <span>Restricted Security Area Guide</span>
              </a>
            </div>
            <p class="text-[11px] text-slate-400 mt-0.5">
              Synchronized with <strong class="text-white">${licRes.cameraUnits} IP Camera Connections</strong>${licRes.totalSynergisReaders > 0 ? ` and <strong class="text-white">${licRes.totalSynergisReaders} Synergis Access Control Reader Connections</strong>` : ''} (${vLoad.requiredUsableTb || 0} TB Usable Storage / ${vLoad.peakIngressMbps || 0} Mbps Recording Bitrate / ${vLoad.genetec?.activeArchiverRoles || 1} Archiver Role${(vLoad.genetec?.activeArchiverRoles || 1) === 1 ? '' : 's'}).
            </p>
          </div>
        </div>

        <!-- Summary & One-Click Actions -->
        <div class="flex flex-wrap items-center gap-2 shrink-0">
          <div class="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-right">
            <div class="text-[9px] uppercase font-bold text-slate-400">Software + ${licRes.advantageYears}-Year Maintenance</div>
            <div class="text-sm font-mono font-extrabold text-emerald-400">$${licRes.totalSoftwareMsrp.toLocaleString()}</div>
          </div>
          <div class="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-right">
            <div class="text-[9px] uppercase font-bold text-slate-400">Streamvault Hardware</div>
            <div class="text-sm font-mono font-extrabold text-indigo-400">$${licRes.totalHardwareMsrp.toLocaleString()}</div>
          </div>
          <button
            type="button"
            onclick="addGenetecLicensesToBom()"
            class="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <i data-lucide="key" class="w-4 h-4"></i>
            <span>+ Synchronize Licenses to Bill of Materials</span>
          </button>
          <button
            type="button"
            onclick="addTurnkeyGenetecPackageToBom()"
            class="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            title="Adds both the recommended Streamvault Hardware Appliance(s) and all calculated Genetec Security Center Licenses to the Bill of Materials"
          >
            <i data-lucide="package-check" class="w-4 h-4"></i>
            <span>+ Add Turnkey Hardware + Licenses ($${licRes.combinedTurnkeyMsrp.toLocaleString()})</span>
          </button>
        </div>
      </div>

      <!-- Bundled Features Included at $0.00 in Security Center 5.13 / 5.14 Unified Base Package -->
      ${Array.isArray(licRes.includedBaseFeatures) && licRes.includedBaseFeatures.length > 0 ? `
        <div class="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-[11px] flex flex-col gap-1.5">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <span class="font-bold uppercase tracking-wider text-[10px] text-emerald-300 flex items-center gap-1.5">
              <i data-lucide="check-circle-2" class="w-3.5 h-3.5 text-emerald-400"></i>
              <span>Included at $0.00 in ${licRes.effectiveTier === 'standard' ? 'Security Center Base Standard Package (GSC-BASE-S)' : 'Security Center Base Enterprise Package (GSC-BASE-E)'}</span>
            </span>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-x-4 gap-y-1 text-slate-300 text-[10px]">
            ${licRes.includedBaseFeatures.map(f => `
              <div class="flex items-center gap-1.5">
                <span class="text-emerald-400 font-bold">&#10003;</span>
                <span>${f.label}</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Compatibility Warnings Banner (if any) -->
      ${licRes.compatibilityWarnings && licRes.compatibilityWarnings.length > 0 ? `
        <div class="p-2.5 rounded-xl bg-amber-950/50 border border-amber-500/40 text-amber-200 text-[11px] space-y-1">
          <div class="font-bold uppercase tracking-wider text-[10px] text-amber-400 flex items-center gap-1.5">
            <i data-lucide="alert-triangle" class="w-3.5 h-3.5"></i>
            <span>Genetec Tier Compatibility Notice (ProductCompatability.pdf)</span>
          </div>
          ${licRes.compatibilityWarnings.map(w => `<div class="pl-5">&bull; ${w}</div>`).join('')}
        </div>
      ` : ''}

      <!-- Configuration Controls Grid (6 Cards across 3 columns on XL) -->
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 text-xs">
        <!-- Card 1: Main System — Base Package, Core Failover, SQL Server 2025 & Client Connections -->
        <div class="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3 space-y-2.5">
          <div class="text-[10px] font-bold uppercase tracking-wider text-indigo-400 flex items-center justify-between">
            <span>1. Main System, Core Failover &amp; Client Connections</span>
            <span class="font-mono text-emerald-400">${needsSqlStd ? 'SQL Standard ($1,418)' : 'SQL 2025 Express (50 GB Cap)'}</span>
          </div>
          <div>
            <label class="text-[10px] text-slate-400 block mb-1">Security Center Base Package Tier:</label>
            <select onchange="setGenetecLicParam('tierMode', this.value)" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs font-bold text-white focus:outline-none">
              <option value="auto" ${cfg.tierMode === 'auto' ? 'selected' : ''}>Automatically Select Tier (${licRes.effectiveTier === 'aio' ? 'Streamvault All-in-One' : licRes.effectiveTier === 'standard' ? 'Standard Base Package' : 'Enterprise Base Package'})</option>
              <option value="aio" ${cfg.tierMode === 'aio' ? 'selected' : ''}>Streamvault All-in-One Tier (Up to 32 Cameras • $0.00 Base, $120/camera)</option>
              <option value="standard" ${cfg.tierMode === 'standard' ? 'selected' : ''}>Security Center Base Standard Package — GSC-BASE-S ($0.00 Base, $200/camera)</option>
              <option value="enterprise" ${cfg.tierMode === 'enterprise' ? 'selected' : ''}>Security Center Base Enterprise Package — GSC-BASE-E ($0.00 Base, $325/camera)</option>
            </select>
          </div>
          <div>
            <label class="text-[10px] text-slate-400 block mb-1" title="Microsoft SQL Server 2025 Express (50 GB Database Cap, $0.00 Included) stays in play for None and Directory Only (Backup and Restore). Automatically switches to Microsoft SQL Server Standard ($1,418) only when Core Failover is set to Full.">
              Core Failover &amp; Microsoft SQL Server Edition:
            </label>
            <select onchange="setGenetecLicParam('coreFailover', this.value)" class="w-full bg-slate-900 border ${needsSqlStd ? 'border-amber-500/60 text-amber-300' : 'border-emerald-500/50 text-emerald-300'} rounded-lg px-2 py-1.5 text-xs font-bold focus:outline-none">
              <option value="none" ${coreFailover === 'none' ? 'selected' : ''}>None — Microsoft SQL Server 2025 Express (50 GB Cap • $0.00)</option>
              <option value="directory_only" ${coreFailover === 'directory_only' ? 'selected' : ''}>Directory Only (Backup and Restore) — SQL 2025 Express (50 GB Cap • $0.00)</option>
              <option value="full" ${coreFailover === 'full' ? 'selected' : ''}>Full (Core + Database Failover) — Upgrades to SQL Server Standard ($1,418)</option>
            </select>
            <div class="text-[10px] text-slate-400 mt-1 leading-snug">
              ${needsSqlStd
                ? '<span class="text-amber-300 font-semibold">Full Core Failover active:</span> Includes Failover Directory (<code class="text-indigo-300">GSC-1FOD</code>) and Microsoft SQL Server Standard Edition (<code class="text-amber-300">7NQ-01025</code>, $1,418).'
                : coreFailover === 'directory_only'
                  ? '<span class="text-emerald-300 font-semibold">Directory Only (Backup and Restore):</span> Enables Failover Directory (<code class="text-emerald-300">GSC-1FOD</code>, $0.00 in Enterprise) while keeping <strong class="text-white">Microsoft SQL Server 2025 Express (50 GB Cap, $0.00)</strong>.'
                  : 'Default <strong class="text-white">Microsoft SQL Server 2025 Express (50 GB Database Cap)</strong> is included at $0.00.'}
            </div>
          </div>
          <div class="grid grid-cols-3 gap-2 pt-1 border-t border-slate-800/80">
            <div>
              <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Security Desk Operator Workstation Connections (25 included in Standard Base; Unlimited Site Login License included in Enterprise Base)">
                Security Desk Workstations:
              </label>
              <input type="number" min="1" max="500" value="${licRes.workstationClients}" onchange="setGenetecLicParam('workstationClients', Math.max(1, parseInt(this.value,10)||5))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-white" />
            </div>
            <div>
              <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Genetec Mobile Application Connections ($250 per concurrent user via GSC-1MobileU, or $10,000 Unlimited Site License via GSC-1MobileSTU at 40+ users)">
                Mobile Application Users:
              </label>
              <input type="number" min="0" max="500" value="${licRes.mobileClients}" onchange="setGenetecLicParam('mobileClients', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-sky-300" />
            </div>
            <div>
              <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Security Center Web Client Connections ($200 per user via GSC-1WU; included at $0.00 in Enterprise Site Login License)">
                Web Client Connections:
              </label>
              <input type="number" min="0" max="500" value="${licRes.webClients || 0}" onchange="setGenetecLicParam('webClients', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-sky-300" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
            <div>
              <label class="text-[10px] text-slate-400 block mb-1">Genetec Advantage Maintenance Term:</label>
              <select onchange="setGenetecLicParam('advantageYears', parseInt(this.value, 10) || 1)" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] font-bold text-emerald-300 focus:outline-none">
                <option value="1" ${licRes.advantageYears === 1 ? 'selected' : ''}>1-Year Software Maintenance</option>
                <option value="3" ${licRes.advantageYears === 3 ? 'selected' : ''}>3-Year Software Maintenance (Discounted)</option>
                <option value="5" ${licRes.advantageYears === 5 ? 'selected' : ''}>5-Year Software Maintenance (Matches 5-Year Hardware)</option>
              </select>
            </div>
            <div class="flex flex-col justify-end pb-1">
              <label class="flex items-center gap-1.5 text-[10px] text-slate-300 cursor-pointer" title="Genetec Advantage 24/7 Technical Assistance Center Support Upgrade (ADV-OPTION-247-1Y/3Y/5Y)">
                <input type="checkbox" ${cfg.advantage247 ? 'checked' : ''} onchange="setGenetecLicParam('advantage247', this.checked)" class="rounded border-slate-700 bg-slate-900 text-emerald-500" />
                <span>24/7 Technical Assistance Center Support</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Card 2: Omnicast Video, Sipelia Intercom & License Plate Recognition Connections -->
        <div class="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3 space-y-2.5">
          <div class="text-[10px] font-bold uppercase tracking-wider text-sky-400 flex items-center justify-between">
            <span>2. Video, Sipelia Intercom &amp; License Plate Recognition</span>
            <span class="font-mono text-white">${licRes.cameraUnits} IP Cameras</span>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Analog Video Encoder Channel Connections (GSC-OM-S-1PAC $60 / GSC-OM-E-1PAC $100 / GSC-SV-AIO-1PAC $36)">
                Analog Video Encoder Channels:
              </label>
              <input type="number" min="0" max="1000" value="${licRes.analogEncoderChannels || 0}" onchange="setGenetecLicParam('analogEncoderChannels', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-white" />
            </div>
            <div>
              <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Third-Party Digital Video Recorder or Network Video Recorder Input Channels (GSC-Om-E-1DV $130)">
                Third-Party Recorder Channels:
              </label>
              <input type="number" min="0" max="1000" value="${licRes.dvrNvrChannels || 0}" onchange="setGenetecLicParam('dvrNvrChannels', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-white" />
            </div>
          </div>
          <div class="grid grid-cols-3 gap-2 pt-1 border-t border-slate-800/80">
            <div>
              <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Sipelia Session Initiation Protocol (SIP) Intercom Station Connections (GSC-SIPELIA-1SIP $295 + Advantage Maintenance; Sipelia Base is included at $0.00)">
                Sipelia Intercom Stations:
              </label>
              <input type="number" min="0" max="500" value="${licRes.effectiveSipIntercoms || 0}" onchange="setGenetecLicParam('sipIntercomsOverride', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-sky-300" />
            </div>
            <div>
              <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Sipelia Session Initiation Protocol (SIP) Trunk Connections to external VoIP PBX or Intercom Server (GSC-Sipelia-1Trunk $550)">
                Sipelia SIP Trunks:
              </label>
              <input type="number" min="0" max="100" value="${licRes.sipTrunks || 0}" onchange="setGenetecLicParam('sipTrunks', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-sky-300" />
            </div>
            <div>
              <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="AutoVu Fixed Sharp License Plate Recognition Camera Connections (GSC-Av-S-1SHP $500 + Advantage Maintenance; AutoVu Standard Base is included at $0.00)">
                Fixed License Plate Cameras:
              </label>
              <input type="number" min="0" max="200" value="${licRes.effectiveLprCameras}" onchange="setGenetecLicParam('lprCamerasOverride', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-amber-300" />
            </div>
          </div>
          <div class="pt-1 border-t border-slate-800/80">
            <label class="text-[10px] text-slate-400 block mb-1">
              Standby Archiver Failover ${licRes.effectiveTier === 'enterprise' ? '<span class="text-emerald-400 font-bold">(Included at $0.00 in Enterprise Base!)</span>' : '(Requires Enterprise Base Package)'}:
            </label>
            <div class="flex items-center gap-1.5">
              <select onchange="setGenetecLicParam('failoverMode', this.value)" class="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] font-bold text-white focus:outline-none">
                <option value="none" ${cfg.failoverMode === 'none' ? 'selected' : ''}>No Standby Archiver Failover</option>
                <option value="all" ${cfg.failoverMode === 'all' ? 'selected' : ''}>All ${licRes.cameraUnits} Cameras ($0.00 Included in Enterprise Base)</option>
                <option value="custom" ${cfg.failoverMode === 'custom' ? 'selected' : ''}>Custom Camera Count</option>
              </select>
              ${cfg.failoverMode === 'custom' ? `
                <input type="number" min="0" max="${licRes.cameraUnits}" value="${cfg.customFailoverCameras || 0}" onchange="setGenetecLicParam('customFailoverCameras', parseInt(this.value,10)||0)" class="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-white" />
              ` : ''}
            </div>
          </div>
          <div class="flex items-center justify-between gap-2 pt-0.5">
            <label class="text-[10px] text-slate-400" title="Third-Party High-Availability Clustering Standby Server License (GSC-StandbyServer @ $1,500 per server)">
              Third-Party Clustering Standby Servers (<code class="text-indigo-300">GSC-StandbyServer</code>):
            </label>
            <input type="number" min="0" max="50" value="${cfg.standbyServerCount || 0}" onchange="setGenetecLicParam('standbyServerCount', Math.max(0, parseInt(this.value,10)||0))" class="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-white" />
          </div>
        </div>

        <!-- Card 3: Synergis Access Control Readers & Intrusion Alarm Panels -->
        <div class="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3 space-y-2.5">
          <div class="text-[10px] font-bold uppercase tracking-wider text-purple-400 flex items-center justify-between">
            <span>3. Access Control Readers &amp; Intrusion Alarm Panels</span>
            <span class="font-mono text-purple-300">${licRes.totalSynergisReaders || 0} Readers • ${licRes.intrusionPanels || 0} Panels</span>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Synergis Access Control Reader Connections for Hardware Purchased from Genetec — Cloud Link, Axis Powered by Genetec, and Mercury Panels (GSC-SY-S-1RE $65 / GSC-SY-E-1RE $125)">
                Genetec-Supplied Hardware Readers:
              </label>
              <input type="number" min="0" max="2000" value="${licRes.synergisGenetecReaders || 0}" onchange="setGenetecLicParam('synergisGenetecReaders', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-center font-mono font-bold text-purple-300" />
              <span class="text-[9px] text-slate-400 block mt-0.5">
                ${licRes.effectiveTier === 'standard' ? '$65.00/reader (GSC-SY-S-1RE)' : licRes.effectiveTier === 'aio' ? '$175.00/reader (GSC-SV-AIO-1R)' : '$125.00/reader (GSC-SY-E-1RE)'}
              </span>
            </div>
            <div>
              <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Synergis Access Control External Reader Connections when Controller Hardware is Not Purchased from Genetec (GSC-Sy-S-1R $175 / GSC-Sy-E-1R $260)">
                Third-Party Hardware Readers:
              </label>
              <input type="number" min="0" max="2000" value="${licRes.synergisExternalReaders || 0}" onchange="setGenetecLicParam('synergisExternalReaders', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-center font-mono font-bold text-purple-300" />
              <span class="text-[9px] text-slate-400 block mt-0.5">
                ${licRes.effectiveTier === 'standard' ? '$175.00/reader (GSC-Sy-S-1R)' : licRes.effectiveTier === 'aio' ? '$175.00/reader (GSC-SV-AIO-1R)' : '$260.00/reader (GSC-Sy-E-1R)'}
              </span>
            </div>
          </div>
          <div class="pt-1.5 border-t border-slate-800/80 space-y-2">
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Intrusion Alarm Panel Connections ($350.00 per panel + $65.00/year Advantage Maintenance; no separate Intrusion Base license is required in Security Center 5.13+)">
                  Intrusion Alarm Panel Count:
                </label>
                <input type="number" min="0" max="200" value="${licRes.intrusionPanels || 0}" onchange="setGenetecLicParam('intrusionPanels', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-center font-mono font-bold text-amber-300" />
              </div>
              <div>
                <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Select the Intrusion Alarm Panel Manufacturer SKU from Genetec Licensing.xls ($350.00 per panel)">
                  Intrusion Panel Manufacturer:
                </label>
                <select onchange="setGenetecLicParam('intrusionPanelManufacturer', this.value)" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-[11px] font-bold text-white focus:outline-none">
                  <option value="bosch" ${licRes.intrusionPanelManufacturer === 'bosch' ? 'selected' : ''}>Bosch B/G Series (GSC-1AP-Bosch • $350)</option>
                  <option value="dmp" ${licRes.intrusionPanelManufacturer === 'dmp' ? 'selected' : ''}>Digital Monitoring Products — DMP (GSC-1AP-DMP • $350)</option>
                  <option value="dsc" ${licRes.intrusionPanelManufacturer === 'dsc' ? 'selected' : ''}>Digital Security Controls — DSC (GSC-1AP-DSC • $350)</option>
                  <option value="honeywell" ${licRes.intrusionPanelManufacturer === 'honeywell' ? 'selected' : ''}>Honeywell Intrusion Panel (GSC-1AP-CDC3-HW • $350)</option>
                  <option value="bosch_map5000" ${licRes.intrusionPanelManufacturer === 'bosch_map5000' ? 'selected' : ''}>Bosch MAP5000 Panel (GSC-1AP-BOSCHMAP5000 • $350)</option>
                  <option value="vanderbilt_spc" ${licRes.intrusionPanelManufacturer === 'vanderbilt_spc' ? 'selected' : ''}>Vanderbilt SPC Panel (GSC-1AP-CDC2-SPC • $350)</option>
                </select>
              </div>
            </div>
            <div class="text-[10px] text-slate-400 leading-snug">
              Synergis Access Control Base Package (Access Manager &amp; Badge Designer) is included at <strong class="text-emerald-400">$0.00</strong> in the Unified Base Package.
            </div>
          </div>
        </div>

        <!-- Card 4: Software Development Kit (SDK) Connections & Core Native Plugins -->
        <div class="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3 space-y-2.5">
          <div class="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center justify-between">
            <span>4. Software Development Kit (SDK) &amp; Native Plugins</span>
            <span class="font-mono text-slate-400">$250 / SDK Connection</span>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Generic Software Development Kit (SDK) Connections for custom or third-party integrations (GSC-1SDK @ $250.00 per connection)">
                Generic SDK Connections (<code class="text-emerald-300">GSC-1SDK</code>):
              </label>
              <input type="number" min="0" max="200" value="${licRes.genericSdkConnections || 0}" onchange="setGenetecLicParam('genericSdkConnections', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-emerald-300" />
            </div>
            <div class="flex flex-col justify-end pb-1">
              <label class="flex items-center gap-1.5 text-[10px] text-slate-300 cursor-pointer" title="Genetec Development Acceleration Program — 1-Year SDK Partner Assistance Bronze (GSC-DAP-A-BRONZE @ $3,500)">
                <input type="checkbox" ${cfg.sdkPartnerAssistance ? 'checked' : ''} onchange="setGenetecLicParam('sdkPartnerAssistance', this.checked)" class="rounded border-slate-700 bg-slate-900 text-emerald-500" />
                <span>SDK Partner Assistance ($3,500)</span>
              </label>
            </div>
          </div>
          <div>
            <label class="text-[10px] text-slate-300 block mb-1 font-semibold" title="Select a specific certified partner Software Development Kit (SDK) integration SKU from Genetec Licensing.xls ($250.00 per connection)">
              Certified Partner SDK Integration (<code class="text-emerald-300">GSC-1SDK-*</code>):
            </label>
            <div class="flex items-center gap-1.5">
              <select onchange="setGenetecLicParam('partnerSdkKey', this.value)" class="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] font-bold text-white focus:outline-none">
                ${partnerSdkOptions.map(opt => `
                  <option value="${opt.key}" ${licRes.partnerSdkKey === opt.key ? 'selected' : ''}>${opt.label}</option>
                `).join('')}
              </select>
              ${licRes.partnerSdkKey && licRes.partnerSdkKey !== 'none' ? `
                <input type="number" min="1" max="200" value="${licRes.partnerSdkConnections || 1}" onchange="setGenetecLicParam('partnerSdkConnections', Math.max(1, parseInt(this.value,10)||1))" class="w-14 bg-slate-900 border border-slate-700 rounded-lg px-1.5 py-1 text-center font-mono font-bold text-emerald-300" title="Partner SDK Connection Quantity" />
              ` : ''}
            </div>
          </div>
          <div class="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
            <div>
              <label class="text-[10px] text-slate-400 block mb-0.5" title="Elevator Destination Dispatch Plugin — Otis Compass, KONE, ThyssenKrupp, or MCE Sentry ($8,000 per system)">
                Elevator Dispatch Systems ($8,000):
              </label>
              <input type="number" min="0" max="50" value="${cfg.elevatorDispatchSystems || 0}" onchange="setGenetecLicParam('elevatorDispatchSystems', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-white" />
            </div>
            <div>
              <label class="text-[10px] text-slate-400 block mb-0.5" title="Key & Asset Management Cabinets — Includes $1,500 Base Plugin (GSC-1P-KEYCABINETBASE) + $500 per Key Cabinet (Morse Watchmans, Traka, Deister)">
                Key Management Cabinets ($500):
              </label>
              <input type="number" min="0" max="100" value="${cfg.keyCabinetCount || 0}" onchange="setGenetecLicParam('keyCabinetCount', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-white" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="text-[10px] text-slate-400 block mb-0.5" title="Open Platform Communications (OPC) Server Building Automation Plugin (GSC-1POPC-S @ $8,000)">
                OPC Server Plugin ($8,000):
              </label>
              <input type="number" min="0" max="20" value="${cfg.opcServerSystems || 0}" onchange="setGenetecLicParam('opcServerSystems', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-white" />
            </div>
            <div>
              <label class="text-[10px] text-slate-400 block mb-0.5" title="Genetec Mission Control Collaborative Decision Management Concurrent Operators ($0 Base + $3,000/yr Operator Maintenance)">
                Mission Control Operators:
              </label>
              <input type="number" min="0" max="200" value="${cfg.missionControlOperators || 0}" onchange="setGenetecLicParam('missionControlOperators', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-white" />
            </div>
          </div>
        </div>

        <!-- Card 5: Multi-Site Federation, Restricted Security Area, Industrial IoT & Cloud Services -->
        <div class="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3 space-y-2.5">
          <div class="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center justify-between">
            <span>5. Federation, Perimeter &amp; Cloud Services</span>
            <span class="font-mono text-slate-400">Multi-Site / Cloud</span>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Federated Remote Security Center Sites with Over 20 Entities (GSC-1SCFED @ $1,000 per site)">
                Federation Sites (&gt;20 Entities):
              </label>
              <input type="number" min="0" max="100" value="${cfg.federationSites || 0}" onchange="setGenetecLicParam('federationSites', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-white" />
            </div>
            <div>
              <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Federated Remote Security Center Sites with 20 Entities or Fewer (GSC-1SCFED-20 @ $600 per site)">
                Federation Sites (&le;20 Entities):
              </label>
              <input type="number" min="0" max="100" value="${cfg.federationSmallSites || 0}" onchange="setGenetecLicParam('federationSmallSites', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-white" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
            <div>
              <label class="text-[10px] text-slate-400 block mb-0.5" title="Restricted Security Area (RSA) Radar, LiDAR, and Fence Perimeter Surveillance Package">
                Restricted Security Area (RSA):
              </label>
              <select onchange="setGenetecLicParam('rsaTier', this.value)" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-1.5 py-1 text-[10px] font-bold text-white focus:outline-none">
                <option value="none" ${(cfg.rsaTier === 'none' || !cfg.rsaTier) ? 'selected' : ''}>None</option>
                <option value="standard" ${cfg.rsaTier === 'standard' ? 'selected' : ''}>Standard Package ($1,000)</option>
                <option value="pro" ${cfg.rsaTier === 'pro' ? 'selected' : ''}>Professional Package ($7,000)</option>
                <option value="enterprise" ${cfg.rsaTier === 'enterprise' ? 'selected' : ''}>Enterprise Package ($14,000)</option>
              </select>
            </div>
            <div>
              <label class="text-[10px] text-slate-400 block mb-0.5" title="Industrial Internet of Things (IIoT) Plugin (BACnet, Modbus, OPC, SNMP, MQTT)">
                Industrial Internet of Things:
              </label>
              <div class="flex items-center gap-1">
                <select onchange="setGenetecLicParam('iiotMode', this.value)" class="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-1.5 py-1 text-[10px] font-bold text-white focus:outline-none">
                  <option value="none" ${!cfg.iiotMode || cfg.iiotMode === 'none' ? 'selected' : ''}>None</option>
                  <option value="devices" ${cfg.iiotMode === 'devices' ? 'selected' : ''}>Per Device ($149)</option>
                  <option value="site" ${cfg.iiotMode === 'site' ? 'selected' : ''}>Unlimited Site ($6,000)</option>
                </select>
                ${cfg.iiotMode === 'devices' ? `
                  <input type="number" min="1" max="500" value="${cfg.iiotDevices || 1}" onchange="setGenetecLicParam('iiotDevices', Math.max(1, parseInt(this.value,10)||1))" class="w-12 bg-slate-900 border border-slate-700 rounded-lg px-1 py-1 text-center font-mono font-bold text-white" />
                ` : ''}
              </div>
            </div>
          </div>
          <div class="grid grid-cols-3 gap-2 pt-1 border-t border-slate-800/80">
            <div>
              <label class="text-[10px] text-slate-400 block mb-0.5" title="Omnicast Cloud Archive Storage Tier">
                Cloud Storage Tier:
              </label>
              <select onchange="setGenetecLicParam('cloudArchiveTier', this.value)" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-1.5 py-1 text-[10px] font-bold text-sky-300 focus:outline-none">
                <option value="performance" ${cfg.cloudArchiveTier !== 'long_term' ? 'selected' : ''}>Performance ($257/TB)</option>
                <option value="long_term" ${cfg.cloudArchiveTier === 'long_term' ? 'selected' : ''}>Long-Term ($122/TB)</option>
              </select>
            </div>
            <div>
              <label class="text-[10px] text-slate-400 block mb-0.5" title="Omnicast Cloud Archive Storage Capacity in Terabytes (TB)">
                Cloud Archive (TB):
              </label>
              <input type="number" min="0" max="500" value="${cfg.cloudArchiveTb || 0}" onchange="setGenetecLicParam('cloudArchiveTb', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-sky-300" />
            </div>
            <div>
              <label class="text-[10px] text-slate-400 block mb-0.5" title="Genetec Clearance Digital Evidence Management Camera Subscriptions ($24/camera/year via CLR-1CCST1-US-1Y)">
                Clearance Cameras:
              </label>
              <input type="number" min="0" max="1000" value="${cfg.clearanceCameras || 0}" onchange="setGenetecLicParam('clearanceCameras', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-sky-300" />
            </div>
          </div>
        </div>

        <!-- Card 6: Streamvault Turnkey Hardware Appliance Fit -->
        <div class="bg-slate-950/80 border border-indigo-500/30 rounded-xl p-3 space-y-2">
          <div class="text-[10px] font-bold uppercase tracking-wider text-sky-400 flex items-center justify-between">
            <span>6. Streamvault Turnkey Appliance Fit</span>
            <select onchange="setGenetecLicParam('applianceFormFactor', this.value)" class="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[10px] font-bold text-slate-200 focus:outline-none">
              <option value="rack" ${cfg.applianceFormFactor === 'rack' ? 'selected' : ''}>Rackmount (1U / 2U)</option>
              <option value="tower" ${cfg.applianceFormFactor === 'tower' ? 'selected' : ''}>Tower / Small Form Factor</option>
              <option value="any" ${cfg.applianceFormFactor === 'any' ? 'selected' : ''}>Any Form Factor</option>
            </select>
          </div>
          ${prim ? `
            <div class="p-2 rounded-lg bg-indigo-950/40 border border-indigo-500/30 space-y-1">
              <div class="flex items-center justify-between">
                <span class="font-bold text-white text-[11px]">${svPlan.primaryQty}x ${prim.applianceSeries} (${prim.sku})</span>
                <span class="font-mono font-bold text-indigo-300 text-[11px]">$${(svPlan.primaryQty * (prim.msrp || 0)).toLocaleString()}</span>
              </div>
              <div class="text-[10px] text-slate-300 leading-snug">${svPlan.archiverReason}</div>
              <div class="flex items-center justify-between pt-1">
                <a href="${prim.datasheetPath}" target="_blank" class="text-[10px] text-indigo-400 hover:underline flex items-center gap-1">
                  <i data-lucide="external-link" class="w-3 h-3"></i>
                  <span>Official Hardware Datasheet</span>
                </a>
                <button type="button" onclick="autoFitStreamvaultToBom()" class="px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold cursor-pointer">
                  + Add Hardware to Bill of Materials
                </button>
              </div>
            </div>
          ` : `
            <div class="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400">
              Add cameras to the project or storage calculator to automatically size Streamvault turnkey appliances.
            </div>
          `}
          ${svPlan.directoryAppliance ? `
            <div class="p-1.5 rounded-lg bg-amber-950/30 border border-amber-500/30 flex items-center justify-between text-[10px]">
              <span class="text-amber-300 font-bold">+ ${svPlan.directoryQty}x ${svPlan.directoryAppliance.applianceSeries} Dedicated Directory / Failover Server</span>
              <span class="font-mono text-white">$${(svPlan.directoryQty * (svPlan.directoryAppliance.msrp || 0)).toLocaleString()}</span>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- Itemized Genetec License & Software Maintenance Breakdown Table -->
      <div class="bg-slate-950/90 border border-slate-800 rounded-xl overflow-hidden">
        <div class="px-3 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-300">
            Calculated Genetec Security Center License &amp; Software Maintenance Bill of Materials (${licRes.lineItems.length} Line Items)
          </span>
          <span class="text-[11px] font-mono font-bold text-emerald-400">
            Total Software MSRP: $${licRes.totalSoftwareMsrp.toLocaleString()}
          </span>
        </div>
        ${licRes.lineItems.length > 0 ? `
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-[11px] font-mono">
              <thead>
                <tr class="border-b border-slate-800/80 text-[9px] uppercase text-slate-400">
                  <th class="py-1.5 px-3">Part Number (SKU)</th>
                  <th class="py-1.5 px-3">Full License Description</th>
                  <th class="py-1.5 px-3">Category</th>
                  <th class="py-1.5 px-3 text-center">Quantity</th>
                  <th class="py-1.5 px-3 text-right">Unit MSRP</th>
                  <th class="py-1.5 px-3 text-right">Extended MSRP</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800/50">
                ${licRes.lineItems.map(li => `
                  <tr class="${li.isIncludedZeroCost ? 'bg-emerald-950/20' : 'hover:bg-slate-900/60'}">
                    <td class="py-1.5 px-3 font-bold ${li.isIncludedZeroCost ? 'text-emerald-300' : 'text-indigo-300'} whitespace-nowrap">${li.sku}</td>
                    <td class="py-1.5 px-3 font-sans text-slate-200">
                      <div class="font-semibold">${li.model}</div>
                      ${li.notes ? `<div class="text-[10px] ${li.isIncludedZeroCost ? 'text-emerald-300/90' : 'text-slate-400'}">${li.notes}</div>` : ''}
                    </td>
                    <td class="py-1.5 px-3 text-[10px] text-slate-400 whitespace-nowrap">${li.categoryLabel}</td>
                    <td class="py-1.5 px-3 text-center font-bold text-amber-300">${li.qty}</td>
                    <td class="py-1.5 px-3 text-right text-slate-300">${li.isIncludedZeroCost ? '<span class="text-emerald-400 font-bold">INCLUDED ($0.00)</span>' : '$' + li.unitMsrp.toLocaleString()}</td>
                    <td class="py-1.5 px-3 text-right font-bold text-emerald-400">$${li.extendedMsrp.toLocaleString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : `
          <div class="p-4 text-center text-xs text-slate-400">
            No camera, reader, or client licenses calculated yet. Add cameras in Initial Design, Power over Ethernet Calculator, or Physical Security, or enter reader/panel/SDK counts above.
          </div>
        `}
      </div>
    </div>
  `;
}
window.renderGenetecLicensingBuilderHtml = renderGenetecLicensingBuilderHtml;


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

    if (currentMode === "vms_software" && window.selectedVmsLicCategory && window.selectedVmsLicCategory !== "all") {
      const targetCat = window.selectedVmsLicCategory;
      results = results.filter(item => {
        if (targetCat === "Annual SMA") {
          return item.licenseType === "Annual SMA" || item.licenseType === "Multi-Year SMA";
        }
        return item.licenseType === targetCat;
      });
    }

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

