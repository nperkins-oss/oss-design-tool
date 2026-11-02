// =========================================================================
// APPLICATION MASTER ORCHESTRATOR & TOP-LEVEL DOMAIN ROUTER
// NetSelect Enterprise Architecture (js/core/app.js)
// Single-Page Domain Switcher, Multi-Sizer Pipeline & State Coordinator
// =========================================================================

// Version & Build Information (Single Source of Truth — synced via scripts/bump_version.py)
const APP_VERSION = "0.11.0-beta.10";
const BUILD_NUMBER = "2026.11.02.0849";
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
        title="Initial/Quick Design Mode: Size PoE & Video Storage using Generic Camera Types (2MP, 4MP, 5MP, 8MP 4K, 360°, Dual/Quad/5-Sensor, PTZ, 60W LPR)"
      >
        <i data-lucide="layers" class="w-3 h-3"></i>
        <span>Initial/Quick Design</span>
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

function setCameraDesignMode(mode, skipConfirm = false) {
  const normalized = mode === "specific" ? "specific" : "generic";
  const defs = (typeof StorageService !== "undefined" && typeof StorageService.getProjectDefaults === "function")
    ? StorageService.getProjectDefaults()
    : null;
  const defCamMode = defs?.vms?.cameraDesignMode === "specific" ? "specific" : "generic";
  const labelForMode = (m) => m === "specific"
    ? "Full Engineering Design (Exact Catalog SKUs)"
    : "Initial/Quick Design (Generic Camera Types)";

  if (!skipConfirm && defs && normalized !== cameraDesignMode && normalized !== defCamMode && typeof confirmProjectDefaultChange === "function" && !(typeof isProjectWizardOpen === "function" && isProjectWizardOpen())) {
    confirmProjectDefaultChange({
      title: "Switch Camera Design Workflow Mode?",
      settingLabel: "Camera Specification & Estimation Mode",
      defaultLabel: labelForMode(defCamMode),
      newLabel: labelForMode(normalized),
      message: `Your Project Default Camera Design Mode is set to "${labelForMode(defCamMode)}". Are you sure you want to switch to "${labelForMode(normalized)}"?`,
      allowLocalOverride: true,
      localOverrideLabel: "Switch Session View Only",
      updateDefaultLabel: `Switch & Update Project Default`,
      onLocalOverride: () => setCameraDesignMode(normalized, true),
      onUpdateDefault: () => {
        if (typeof updateSingleProjectDefault === "function") {
          updateSingleProjectDefault(d => { if (!d.vms) d.vms = {}; d.vms.cameraDesignMode = normalized; });
        }
        setCameraDesignMode(normalized, true);
      },
      onCancel: () => renderGlobalDesignModeToggle()
    });
    return;
  }

  cameraDesignMode = normalized;
  window.cameraDesignMode = normalized;

  if (normalized === "generic") {
    selectedCamVendors = [];
    window.selectedCamVendors = [];
    requireCamAnalytics = false;
    requireCamVandal = false;
    requireCamTaa = false;
    poeCalcInputMode = "camera_types";
    window.poeCalcInputMode = "camera_types";
  } else if (defs && Array.isArray(defs.vms?.cameraVendors) && defs.vms.cameraVendors.length > 0 && selectedCamVendors.length === 0) {
    const normFn = typeof normalizeCameraVendorName === "function" ? normalizeCameraVendorName : (v) => v;
    selectedCamVendors = defs.vms.cameraVendors.map(normFn);
    window.selectedCamVendors = [...selectedCamVendors];
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
        ? "Switched to Initial/Quick Design Mode (Generic Camera Types & Default PoE/Bitrate)."
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
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
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
      { id: "backbone", label: "Core & Aggregation", icon: "cpu" },
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
let videoVmsVendor = "genetec"; // "genetec" | "milestone" | "generic"
let videoGenetecProfile = "dedicated_300";
let videoMilestoneProfile = "husky_1000r";
let activeVmsLicensingVendor = "genetec"; // "genetec" | "milestone"
let videoArchiverRoles = 0; // 0 = Auto
let videoServerCount = 0;   // 0 = Auto (packs multiple Archiver roles per server within Genetec limits)
let videoEncryptionCerts = 0;
let videoSoftwareMotion = false;
let videoShowDetailsPanel = true;
let videoLowFpsUntilMotion = false; // Record at low FPS (e.g. 2 FPS) during idle/non-motion and boost to target FPS on motion/event
let videoIdleFps = 2;               // Default low frame rate (2 FPS) during idle periods
let videoFailoverStructure = "none"; // "none" | "ring" | "dedicated"
let videoRingNodeCount = 0;          // 0 = Auto (dynamically uses actual server count N >= 2)
let videoDedicatedPrimaryCount = 0;  // 0 = Auto (N main servers failing over into the dedicated pool)
let videoDedicatedFailoverCount = 1; // Number of dedicated hot-standby failover servers (M in N+M)
let videoMaxSimultaneousFailures = 1;// Number of main servers that can fail simultaneously onto the shared failover pool (1 = N+1 standard, or 2..N)
let videoFailoverRetentionDays = 0;  // 0 = Full primary retention mirror on failover buffer
let videoFailoverIncludeStorageBuffer = true;
let videoSyncAllColumns = {
  heads: false,
  resolutionMp: false,
  fps: false,
  lowFpsUntilMotion: false,
  codec: false,
  sceneActivity: false,
  motionDutyPct: false,
  retentionDays: false
};

// 7. Access Control Filters & Door Package Builder State
let selectedAcsVendors = [];
let selectedAcsControllerTypes = [];
let selectedAcsPowerSource = "all";
let requireAcsOsdp = false;
let doorPkgPreset = "standard_strike";
let doorPkgQty = 2;
let doorBuilderControllerVendor = "mercury"; // "mercury" | "axis" | "hid_aero" | "assa_abloy"
let doorBuilderAcsPlatform = "genetec_synergis"; // "genetec_synergis" | "milestone_xpaccess" | "milestone_axis_secure_entry" | "standalone"

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

// Debounced filter runner for fast typing response
const debouncedRunActiveFilter = debounce(() => {
  runActiveFilter();
}, 150);

// -----------------------------------------------------------
// Initialization Lifecycle
// -----------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  if (typeof renderVersionBadge === "function") renderVersionBadge();
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
  if (typeof StorageService !== "undefined" && typeof StorageService.initStartupProjectPrompt === "function") {
    StorageService.initStartupProjectPrompt();
  }
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

function toggleFilterItem(type, val, skipConfirm = false) {
  if (type === "camVendor" && !skipConfirm && !selectedCamVendors.includes(val) && typeof confirmProjectDefaultChange === "function") {
    const defs = (typeof StorageService !== "undefined" && typeof StorageService.getProjectDefaults === "function") ? StorageService.getProjectDefaults() : null;
    const defCamVendors = Array.isArray(defs?.vms?.cameraVendors) ? defs.vms.cameraVendors : [];
    const canonVal = typeof canonicalWizardCameraVendorName === "function" ? canonicalWizardCameraVendorName(val) : val;
    if (defCamVendors.length > 0 && !defCamVendors.some(v => (typeof canonicalWizardCameraVendorName === "function" ? canonicalWizardCameraVendorName(v) : v) === canonVal)) {
      confirmProjectDefaultChange({
        title: "Include Non-Default Camera Manufacturer?",
        settingLabel: "Preferred Camera Manufacturers",
        defaultLabel: defCamVendors.join(", "),
        newLabel: `${defCamVendors.join(", ")} + ${canonVal}`,
        message: `Your Project Defaults specify [${defCamVendors.join(", ")}] as Preferred Camera Manufacturers. Do you want to include "${canonVal}"?`,
        allowLocalOverride: true,
        localOverrideLabel: `Filter ${canonVal} Temporarily`,
        updateDefaultLabel: `Add ${canonVal} to Project Defaults`,
        onLocalOverride: () => toggleFilterItem(type, val, true),
        onUpdateDefault: () => {
          if (typeof updateSingleProjectDefault === "function") {
            updateSingleProjectDefault(d => {
              if (!d.vms) d.vms = {};
              const cur = Array.isArray(d.vms.cameraVendors) ? d.vms.cameraVendors : [];
              if (!cur.includes(canonVal)) d.vms.cameraVendors = [...cur, canonVal];
            });
          }
          toggleFilterItem(type, val, true);
        },
        onCancel: () => { if (typeof buildSidebarFilters === "function") buildSidebarFilters(); }
      });
      return;
    }
  }
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
                      <button onclick="GlobalSearchEngine.navigateTo('${escapeJSAttr(m.sku)}')" class="px-3 py-1.5 bg-slate-900 hover:bg-brand-600 border border-slate-700 hover:border-brand-500 rounded-xl text-white font-medium flex items-center gap-1.5 transition-all shadow-sm cursor-pointer group">
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
    const clModal = document.getElementById("changelogModal");
    if (clModal && !clModal.classList.contains("hidden")) {
      e.preventDefault();
      if (typeof closeChangelogModal === "function") closeChangelogModal();
      else clModal.classList.add("hidden");
      return;
    }

    const accModal = document.getElementById("bomItemAccessoriesModal");
    if (accModal && !accModal.classList.contains("hidden")) {
      e.preventDefault();
      if (typeof closeBomItemAccessoriesModal === "function") closeBomItemAccessoriesModal();
      else accModal.classList.add("hidden");
      return;
    }

    const repModal = document.getElementById("bomReplaceItemModal");
    if (repModal && !repModal.classList.contains("hidden")) {
      e.preventDefault();
      if (typeof closeReplaceBomItemModal === "function") closeReplaceBomItemModal();
      else repModal.classList.add("hidden");
      return;
    }

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

let isCalculatorsExpanded = false;
let calculatorsHoverTimeout = null;

function toggleCalculatorsExpand(forceState = null) {
  const container = document.getElementById("calculatorsNavigationContainer");
  const chevron = document.getElementById("calculatorsExpandChevron");
  const btn = document.getElementById("calculatorsExpandBtn");
  if (!container) return;

  if (forceState !== null) {
    isCalculatorsExpanded = forceState;
  } else {
    isCalculatorsExpanded = !isCalculatorsExpanded;
  }

  if (isCalculatorsExpanded) {
    if (calculatorsHoverTimeout) {
      clearTimeout(calculatorsHoverTimeout);
      calculatorsHoverTimeout = null;
    }
    container.classList.remove("hidden");
    if (chevron) chevron.style.transform = "rotate(180deg)";
    if (btn) {
      btn.classList.add("bg-amber-600/20", "border-amber-500/40", "text-amber-300");
    }
    updateCalculatorsSubNavUI();
  } else {
    if (calculatorsHoverTimeout) {
      clearTimeout(calculatorsHoverTimeout);
      calculatorsHoverTimeout = null;
    }
    container.classList.add("hidden");
    if (chevron) chevron.style.transform = "";
    if (btn) {
      btn.classList.remove("bg-amber-600/20", "border-amber-500/40", "text-amber-300");
    }
  }

  if (window.lucide) {
    lucide.createIcons();
  }
}

function updateCalculatorsSubNavUI() {
  const activeTab = typeof TabManager !== "undefined" ? TabManager.getActiveTabId() : "";
  const map = [
    { id: "calc-nav-poe", tab: "sizer_poe" },
    { id: "calc-nav-storage", tab: "sizer_storage" },
    { id: "calc-nav-workstation", tab: "sizer_workstation" },
    { id: "calc-nav-doors", tab: "sizer_doors" },
    { id: "calc-nav-licensing", tab: "sizer_licensing" }
  ];
  const activeClasses = "bg-slate-800 text-white font-bold border-amber-500/50 shadow-sm";
  const inactiveClasses = "border-transparent text-slate-300 hover:text-white hover:bg-slate-900/60";

  map.forEach(item => {
    const el = document.getElementById(item.id);
    if (!el) return;
    el.className = `px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer shrink-0 ${activeTab === item.tab ? activeClasses : inactiveClasses}`;
  });
}

function handleCalculatorsNavClick() {
  if (calculatorsHoverTimeout) {
    clearTimeout(calculatorsHoverTimeout);
    calculatorsHoverTimeout = null;
  }
  if (typeof TabManager !== "undefined") {
    const cur = TabManager.getActiveTabId();
    if (!cur.startsWith("sizer_")) {
      TabManager.openTab("sizer_storage");
      toggleCalculatorsExpand(false);
      return;
    }
  }
  toggleCalculatorsExpand();
}

/**
 * Attaches hover (mouseenter/mouseleave) listeners with debounce timeout to Catalog, Calculators & Sizers, and Facility dropdown wrappers
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
      if (calculatorsHoverTimeout) {
        clearTimeout(calculatorsHoverTimeout);
        calculatorsHoverTimeout = null;
      }
      toggleFacilityExpand(false);
      toggleCalculatorsExpand(false);
      toggleCatalogExpand(true);
    });

    catWrapper.addEventListener("mouseleave", () => {
      catalogHoverTimeout = setTimeout(() => {
        toggleCatalogExpand(false);
      }, 250);
    });
  }

  const calcWrapper = document.getElementById("calculatorsDomainWrapper");
  if (calcWrapper && !calcWrapper._hoverInitialized) {
    calcWrapper._hoverInitialized = true;
    calcWrapper.addEventListener("mouseenter", () => {
      if (calculatorsHoverTimeout) {
        clearTimeout(calculatorsHoverTimeout);
        calculatorsHoverTimeout = null;
      }
      if (catalogHoverTimeout) {
        clearTimeout(catalogHoverTimeout);
        catalogHoverTimeout = null;
      }
      if (facilityHoverTimeout) {
        clearTimeout(facilityHoverTimeout);
        facilityHoverTimeout = null;
      }
      toggleCatalogExpand(false);
      toggleFacilityExpand(false);
      toggleCalculatorsExpand(true);
    });

    calcWrapper.addEventListener("mouseleave", () => {
      calculatorsHoverTimeout = setTimeout(() => {
        toggleCalculatorsExpand(false);
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
      if (calculatorsHoverTimeout) {
        clearTimeout(calculatorsHoverTimeout);
        calculatorsHoverTimeout = null;
      }
      toggleCatalogExpand(false);
      toggleCalculatorsExpand(false);
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

window.handleCalculatorsNavClick = handleCalculatorsNavClick;
window.toggleCalculatorsExpand = toggleCalculatorsExpand;
window.updateCalculatorsSubNavUI = updateCalculatorsSubNavUI;
window.isCalculatorsExpanded = isCalculatorsExpanded;

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

// Click-outside listener for Catalog, Calculators & Sizers, and Facility popovers
document.addEventListener("click", (e) => {
  const catWrapper = document.getElementById("catalogDomainWrapper");
  if (catWrapper && isCatalogExpanded && !catWrapper.contains(e.target)) {
    toggleCatalogExpand(false);
  }
  const calcWrapper = document.getElementById("calculatorsDomainWrapper");
  if (calcWrapper && isCalculatorsExpanded && !calcWrapper.contains(e.target)) {
    toggleCalculatorsExpand(false);
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

if (window.OSS && typeof window.OSS.register === "function") {
  window.OSS.register("Core.App", { AppState, switchDomain, switchMode, runActiveFilter, resetCurrentFilters, showToast, NavigationHistory });
}
