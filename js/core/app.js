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
// Universal Interactive Table Column Resizer Engine
// -----------------------------------------------------------
window.ossTableColumnWidths = window.ossTableColumnWidths || {};

function getTableSignature(table, ths) {
  if (table.id) return "id:" + table.id;
  if (table.dataset && table.dataset.tableId) return "ds:" + table.dataset.tableId;
  const headerKey = Array.from(ths)
    .map(th => (th.textContent || "").replace(/\s+/g, " ").trim().slice(0, 28))
    .join("|");
  return "hdr:" + headerKey;
}

function initResizableTables(root = document) {
  if (!root || typeof root.querySelectorAll !== "function") return;
  const tables = root.tagName === "TABLE" ? [root] : Array.from(root.querySelectorAll("table"));
  tables.forEach(table => {
    const headerRow = table.querySelector("thead tr") || table.querySelector("tr");
    if (!headerRow) return;
    const ths = Array.from(headerRow.querySelectorAll("th"));
    if (ths.length < 2) return;

    const sig = getTableSignature(table, ths);
    const savedMap = window.ossTableColumnWidths[sig] || {};

    ths.forEach((th, colIdx) => {
      th.classList.add("oss-resizable-th");
      if (savedMap[colIdx]) {
        th.style.width = savedMap[colIdx] + "px";
        th.style.minWidth = savedMap[colIdx] + "px";
      }

      if (th.querySelector(".oss-col-resizer")) return;

      const handle = document.createElement("div");
      handle.className = "oss-col-resizer";
      handle.title = "Drag to resize column • Double-click to reset width";

      handle.addEventListener("click", (e) => {
        e.stopPropagation();
      });

      handle.addEventListener("dblclick", (e) => {
        e.preventDefault();
        e.stopPropagation();
        th.style.width = "";
        th.style.minWidth = "";
        if (window.ossTableColumnWidths[sig]) {
          delete window.ossTableColumnWidths[sig][colIdx];
        }
      });

      handle.addEventListener("mousedown", (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        const startX = e.clientX;
        const startWidth = th.getBoundingClientRect().width;
        handle.classList.add("is-resizing");
        document.body.classList.add("oss-is-resizing-col");

        const onMouseMove = (moveEvent) => {
          const delta = moveEvent.clientX - startX;
          const newWidth = Math.max(48, Math.round(startWidth + delta));
          th.style.width = newWidth + "px";
          th.style.minWidth = newWidth + "px";
          if (!window.ossTableColumnWidths[sig]) {
            window.ossTableColumnWidths[sig] = {};
          }
          window.ossTableColumnWidths[sig][colIdx] = newWidth;
        };

        const onMouseUp = () => {
          handle.classList.remove("is-resizing");
          document.body.classList.remove("oss-is-resizing-col");
          window.removeEventListener("mousemove", onMouseMove);
          window.removeEventListener("mouseup", onMouseUp);
        };

        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
      });

      th.appendChild(handle);
    });
  });
}
window.initResizableTables = initResizableTables;

const debouncedInitResizableTables = debounce(() => {
  initResizableTables(document);
}, 60);

document.addEventListener("DOMContentLoaded", () => {
  initResizableTables(document);
  if (typeof MutationObserver !== "undefined" && document.body) {
    const tableObserver = new MutationObserver((mutations) => {
      for (let i = 0; i < mutations.length; i++) {
        if (mutations[i].addedNodes && mutations[i].addedNodes.length > 0) {
          debouncedInitResizableTables();
          break;
        }
      }
    });
    tableObserver.observe(document.body, { childList: true, subtree: true });
  }
});

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

function renderPoeCalculatorStudioHtml() {
  const p = calculatePoETarget();
  const hasDemand = p.totalCameras > 0;
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

  return `
    <div class="bg-slate-900/95 border border-slate-800 rounded-2xl p-3.5 sm:p-4 flex flex-col gap-3.5 shadow-lg">
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
              <button type="button" onclick="if(typeof TabManager !== 'undefined') TabManager.openTab('sizer_storage');" class="px-2.5 py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer" title="Open Video Storage, Archiver & Failover Calculator Studio">
                <i data-lucide="hard-drive" class="w-3 h-3"></i>
                <span>Storage &amp; Failover Sizer &rarr;</span>
              </button>
              <button type="button" onclick="if(typeof TabManager !== 'undefined') TabManager.openTab('sizer_workstation');" class="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer" title="Open Client Workstation Decoding Sizer Studio">
                <i data-lucide="monitor" class="w-3 h-3"></i>
                <span>Workstation Sizer &rarr;</span>
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
}
window.renderPoeCalculatorStudioHtml = renderPoeCalculatorStudioHtml;

function buildCalculatorStrip() {
  renderGlobalDesignModeToggle();
  if (typeof renderCalculatorStudioIfOpen === "function") {
    renderCalculatorStudioIfOpen();
  }
  const container = document.getElementById("calculatorStripContainer");
  if (!container) return;

  if (currentMode === "access") {
    container.classList.remove("hidden");
    const p = calculatePoETarget();
    const genericTypes = typeof GENERIC_CAMERA_TYPES !== "undefined" ? GENERIC_CAMERA_TYPES : [];
    const totalSyncedGenericCams = genericTypes.reduce((sum, g) => sum + getGenericCameraTypeCountInBom(g.id), 0);
    const showInlinePoe = Boolean(window.catalogShowInlinePoeCalc);

    container.innerHTML = `
      <div class="space-y-3">
        <div class="bg-slate-900/95 border border-slate-800 rounded-2xl px-3.5 py-2.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 shadow-md">
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
              <i data-lucide="zap" class="w-4 h-4"></i>
            </div>
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h4 class="text-xs font-bold text-white uppercase tracking-wider">Access &amp; Edge Switch Catalog</h4>
                <span class="px-2 py-0.5 rounded bg-amber-950/80 border border-amber-700/50 text-amber-300 font-mono text-[10px] font-bold">
                  PoE Target: ${p.budgetWithHeadroom}W (+${extraHeadroomPercent}% Buffer)
                </span>
                <span class="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300 font-mono text-[10px]">
                  ${demandCounts.af || 0} af &bull; ${demandCounts.at || 0} at &bull; ${demandCounts.bt60 || 0} bt60 &bull; ${demandCounts.bt90 || 0} bt90 (${totalSyncedGenericCams} Generic Cameras)
                </span>
              </div>
              <p class="text-[11px] text-slate-400">
                Use the dedicated <strong class="text-amber-300">PoE &amp; Switch Calculator Studio</strong> in the top navigation to size IEEE 802.3 PoE budgets and camera counts.
              </p>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2 shrink-0">
            <button type="button" onclick="deriveDemandFromBOM()" class="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer" title="Auto-detect PoE demands from devices in project BOM">
              <i data-lucide="sparkles" class="w-3.5 h-3.5"></i>
              <span>Derive from BOM</span>
            </button>
            <button type="button" onclick="window.catalogShowInlinePoeCalc = !window.catalogShowInlinePoeCalc; buildCalculatorStrip();" class="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer">
              <i data-lucide="${showInlinePoe ? 'chevron-up' : 'chevron-down'}" class="w-3.5 h-3.5 text-amber-400"></i>
              <span>${showInlinePoe ? 'Hide Inline Sizer' : 'Quick Inline Sizer'}</span>
            </button>
            <button type="button" onclick="if(typeof TabManager !== 'undefined') TabManager.openTab('sizer_poe');" class="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer">
              <i data-lucide="calculator" class="w-3.5 h-3.5"></i>
              <span>Open PoE Calculator Studio &rarr;</span>
            </button>
          </div>
        </div>
        ${showInlinePoe ? renderPoeCalculatorStudioHtml() : ''}
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
            <span class="text-[10px] font-mono font-bold text-slate-400 uppercase">Minimum Routing:</span>
            <select onchange="fwTargetThroughputGbps = parseFloat(this.value) || 0; runActiveFilter();" class="bg-transparent font-mono font-bold text-white text-xs focus:outline-none">
              <option value="0" ${fwTargetThroughputGbps === 0 ? 'selected' : ''}>Any Speed</option>
              <option value="1" ${fwTargetThroughputGbps === 1 ? 'selected' : ''}>1.0+ Gbps</option>
              <option value="2.5" ${fwTargetThroughputGbps === 2.5 ? 'selected' : ''}>2.5+ Gbps</option>
              <option value="5" ${fwTargetThroughputGbps === 5 ? 'selected' : ''}>5.0+ Gbps</option>
              <option value="10" ${fwTargetThroughputGbps === 10 ? 'selected' : ''}>10+ Gbps</option>
            </select>
          </div>

          <div class="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5">
            <span class="text-[10px] font-mono font-bold text-slate-400 uppercase">Minimum IPS / Threat:</span>
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
              Reset Specifications
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
            <span class="text-[10px] font-mono font-bold text-slate-400 uppercase">Minimum Distance:</span>
            <input type="number" step="0.1" min="0" max="25" value="${wlTargetDistanceMiles || 0}" onchange="wlTargetDistanceMiles = parseFloat(this.value) || 0; runActiveFilter();" class="w-14 bg-transparent font-mono font-bold text-emerald-400 focus:outline-none text-right" />
            <span class="text-[10px] font-mono text-slate-500">Miles (${((wlTargetDistanceMiles || 0) * 1.609).toFixed(1)} km)</span>
          </div>

          <div class="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5">
            <span class="text-[10px] font-mono font-bold text-slate-400 uppercase">Minimum Speed:</span>
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
                  ${totalBomCams} Camera${totalBomCams === 1 ? '' : 's'}
                  <span class="text-[10px] font-normal text-slate-400">(${totalGenericCams} Generic / ${totalSpecificCams} Specific)</span>
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
    container.classList.remove("hidden");
    const vCalc = (typeof VideoStorageSizer !== "undefined" && typeof VideoStorageSizer.calculateFromBOM === "function")
      ? VideoStorageSizer.calculateFromBOM(projectBOM, {
          sourceMode: videoSourceMode,
          manualCameraCount: videoManualCamCount,
          resolutionMp: videoResolutionMp,
          retentionDays: videoRetentionDays,
          codec: videoCodec,
          fps: videoFps,
          lowFpsUntilMotion: videoLowFpsUntilMotion,
          idleFps: videoIdleFps,
          motionDutyCycle: videoMotionDuty,
          sceneActivity: videoSceneActivity,
          raidType: videoRaidType,
          preferredDriveSizeTb: videoPreferredDriveTb,
          vmsVendor: videoVmsVendor,
          genetecProfile: videoGenetecProfile,
          milestoneProfile: videoMilestoneProfile,
          archiverRolesCount: videoArchiverRoles,
          serverCountOverride: videoServerCount,
          encryptionCerts: videoEncryptionCerts,
          softwareMotionDetection: videoSoftwareMotion,
          failoverStructure: videoFailoverStructure,
          ringNodeCount: videoRingNodeCount,
          dedicatedPrimaryCount: videoDedicatedPrimaryCount,
          dedicatedFailoverCount: videoDedicatedFailoverCount,
          maxSimultaneousFailures: videoMaxSimultaneousFailures,
          failoverRetentionDays: videoFailoverRetentionDays,
          failoverIncludeStorageBuffer: videoFailoverIncludeStorageBuffer
        })
      : { totalCameras: 32, peakIngressMbps: 105.6, averageRecordingMbps: 52.8, requiredUsableTB: 18.8, raidLevel: "RAID 6", vmsVendor: "genetec", genetec: { activeArchiverRoles: 1, recommendedArchiverServers: 1, isFullyCompliant: true } };
    const isMilestoneVms = vCalc.vmsVendor === "milestone";
    const g = isMilestoneVms ? (vCalc.milestone || vCalc.genetec || {}) : (vCalc.genetec || {});
    const showInlineStorage = Boolean(window.catalogShowInlineStorageCalc);
    container.innerHTML = `
      <div class="space-y-3">
        <div class="bg-slate-900/95 border border-slate-800 rounded-2xl px-3.5 py-2.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 shadow-md">
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 shrink-0">
              <i data-lucide="hard-drive" class="w-4 h-4"></i>
            </div>
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h4 class="text-xs font-bold text-white uppercase tracking-wider">Servers &amp; Storage Catalog</h4>
                <span class="px-2 py-0.5 rounded bg-purple-950/80 border border-purple-700/50 text-purple-300 font-mono text-[10px] font-bold">
                  ${vCalc.totalCameras} Cameras &bull; ${vCalc.requiredUsableTB} TB Usable (${vCalc.raidLevel})
                </span>
                <span class="px-2 py-0.5 rounded bg-sky-950/80 border border-sky-700/50 text-sky-300 font-mono text-[10px] font-bold">
                  ${vCalc.peakIngressMbps} / ${vCalc.averageRecordingMbps} Mbps
                </span>
                <span class="px-2 py-0.5 rounded ${g.isFullyCompliant !== false ? 'bg-emerald-950/80 border-emerald-700/50 text-emerald-300' : 'bg-rose-950/80 border-rose-700/50 text-rose-300'} border font-mono text-[10px] font-bold">
                  ${isMilestoneVms ? `Milestone Husky: ${g.recommendedArchiverServers || 1} Server(s)` : `Genetec: ${g.activeArchiverRoles || 1} Role(s) (${g.recommendedArchiverServers || 1} Server(s))`}
                </span>
              </div>
              <p class="text-[11px] text-slate-400">
                Use the dedicated <strong class="text-purple-300">Storage &amp; Failover Calculator Studio</strong> in the top navigation for multi-manufacturer sizing (<strong class="text-indigo-300">Genetec Streamvault</strong> &amp; <strong class="text-sky-300">Milestone Husky IVO</strong>), Low-FPS Until Motion, and Ring/Dedicated failover.
              </p>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2 shrink-0">
            <button type="button" onclick="autoFitNvrToBom()" class="px-2.5 py-1.5 bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/40 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer">
              <i data-lucide="wand-2" class="w-3.5 h-3.5"></i>
              <span>Auto-Fit Server</span>
            </button>
            <button type="button" onclick="window.catalogShowInlineStorageCalc = !window.catalogShowInlineStorageCalc; buildCalculatorStrip();" class="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer">
              <i data-lucide="${showInlineStorage ? 'chevron-up' : 'chevron-down'}" class="w-3.5 h-3.5 text-purple-400"></i>
              <span>${showInlineStorage ? 'Hide Inline Sizer' : 'Quick Inline Sizer'}</span>
            </button>
            <button type="button" onclick="if(typeof TabManager !== 'undefined') TabManager.openTab('sizer_storage');" class="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer">
              <i data-lucide="hard-drive" class="w-3.5 h-3.5"></i>
              <span>Open Storage &amp; Failover Studio &rarr;</span>
            </button>
          </div>
        </div>
        ${showInlineStorage ? renderStorageCalculatorStudioHtml(false) : ''}
      </div>
    `;
  } else if (currentMode === "vms_software" || currentMode === "os_virtualization") {
    container.classList.remove("hidden");
    const isMilestoneLic = activeVmsLicensingVendor === "milestone";
    const licRes = isMilestoneLic
      ? ((typeof MilestoneLicensingSizer !== "undefined") ? MilestoneLicensingSizer.calculate(projectBOM) : null)
      : ((typeof GenetecLicensingSizer !== "undefined") ? GenetecLicensingSizer.calculate(projectBOM) : null);
    const showInlineLic = Boolean(window.catalogShowInlineLicCalc);
    container.innerHTML = `
      <div class="space-y-3">
        <div class="bg-slate-900/95 border border-slate-800 rounded-2xl px-3.5 py-2.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 shadow-md">
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shrink-0">
              <i data-lucide="key" class="w-4 h-4"></i>
            </div>
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h4 class="text-xs font-bold text-white uppercase tracking-wider">VMS Software &amp; Licensing Catalog</h4>
                ${licRes ? (isMilestoneLic ? `
                  <span class="px-2 py-0.5 rounded bg-sky-950/80 border border-sky-700/50 text-sky-300 font-mono text-[10px] font-bold">
                    Milestone ${licRes.editionInfo?.shortLabel || 'Corporate'} &bull; ${licRes.totalDeviceLicenses} Device Licenses &bull; ${licRes.careYears}Y Care Plus
                  </span>
                  <span class="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-700/50 text-emerald-300 font-mono text-[10px] font-bold">
                    Total Software MSRP: $${(licRes.totalSoftwareMsrp || 0).toLocaleString()}
                  </span>
                ` : `
                  <span class="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-700/50 text-emerald-300 font-mono text-[10px] font-bold">
                    Genetec ${String(licRes.effectiveTier || 'Enterprise').toUpperCase()} &bull; ${licRes.cameraUnits} Camera Licenses &bull; ${licRes.readerConnections} Doors
                  </span>
                  <span class="px-2 py-0.5 rounded bg-indigo-950/80 border border-indigo-700/50 text-indigo-300 font-mono text-[10px] font-bold">
                    Total Software MSRP: $${(licRes.totalSoftwareMsrp || 0).toLocaleString()} (${licRes.advantageYears}Y Advantage)
                  </span>
                `) : ''}
              </div>
              <p class="text-[11px] text-slate-400">
                Use the dedicated <strong class="text-emerald-300">VMS Licensing Sizer Studio</strong> in the top navigation to configure <strong class="text-indigo-300">Genetec Security Center 5.14</strong> or <strong class="text-sky-300">Milestone XProtect 2026 R2</strong> licensing &amp; appliances.
              </p>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2 shrink-0">
            <button type="button" onclick="${isMilestoneLic ? 'addMilestoneLicensesToBom()' : 'addGenetecLicensesToBom()'}" class="px-2.5 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer">
              <i data-lucide="plus-circle" class="w-3.5 h-3.5"></i>
              <span>+ Add ${isMilestoneLic ? 'Milestone' : 'Genetec'} Licenses</span>
            </button>
            <button type="button" onclick="window.catalogShowInlineLicCalc = !window.catalogShowInlineLicCalc; buildCalculatorStrip();" class="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer">
              <i data-lucide="${showInlineLic ? 'chevron-up' : 'chevron-down'}" class="w-3.5 h-3.5 text-emerald-400"></i>
              <span>${showInlineLic ? 'Hide Inline Builder' : 'Quick Inline Builder'}</span>
            </button>
            <button type="button" onclick="if(typeof TabManager !== 'undefined') TabManager.openTab('sizer_licensing');" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer">
              <i data-lucide="key" class="w-3.5 h-3.5"></i>
              <span>Open VMS Licensing Studio &rarr;</span>
            </button>
          </div>
        </div>
        ${showInlineLic ? renderVmsLicensingStudioHtml(false) : ''}
      </div>
    `;
  } else if (currentMode === "workstations") {
    container.classList.remove("hidden");
    const wsCalc = (typeof ClientWorkstationSizer !== "undefined" && typeof ClientWorkstationSizer.calculate === "function")
      ? ClientWorkstationSizer.calculate(projectBOM)
      : null;
    const recEv = wsCalc?.recommendedProfileEvaluation || {};
    const recCat = wsCalc?.recommendedCatalogWorkstation;
    const showInlineWs = Boolean(window.catalogShowInlineWsCalc);
    container.innerHTML = `
      <div class="space-y-3">
        <div class="bg-slate-900/95 border border-slate-800 rounded-2xl px-3.5 py-2.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 shadow-md">
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400 shrink-0">
              <i data-lucide="monitor" class="w-4 h-4"></i>
            </div>
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h4 class="text-xs font-bold text-white uppercase tracking-wider">Client Workstations Catalog</h4>
                ${wsCalc ? `
                  <span class="px-2 py-0.5 rounded bg-sky-950/80 border border-sky-700/50 text-sky-300 font-mono text-[10px] font-bold">
                    Viewing ${wsCalc.totalViewedStreams} Streams (${wsCalc.monitorCount} Monitors) &bull; ${recEv.utilizationPct || 0}% Decode Load
                  </span>
                  <span class="px-2 py-0.5 rounded bg-indigo-950/80 border border-indigo-700/50 text-indigo-300 font-mono text-[10px] font-bold">
                    ${wsCalc.vmsPlatform === 'milestone' ? 'Milestone Smart Client' : 'Genetec 5.14'} Specification: ${wsCalc.recommendedProfile?.shortLabel || 'Recommended'} ${recCat ? `(${recCat.sku})` : ''}
                  </span>
                ` : ''}
              </div>
              <p class="text-[11px] text-slate-400">
                Use the dedicated <strong class="text-sky-300">Client Workstation Sizer Studio</strong> in the top navigation to calculate CPU/GPU specs for <strong class="text-indigo-300">Genetec Security Desk 5.14</strong> or <strong class="text-sky-300">Milestone XProtect Smart Client 2026 / Husky IVO VS</strong>.
              </p>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2 shrink-0">
            <button type="button" onclick="autoFitWorkstationToBom()" class="px-2.5 py-1.5 bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/40 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer">
              <i data-lucide="wand-2" class="w-3.5 h-3.5"></i>
              <span>Auto-Fit Workstation</span>
            </button>
            <button type="button" onclick="window.catalogShowInlineWsCalc = !window.catalogShowInlineWsCalc; buildCalculatorStrip();" class="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer">
              <i data-lucide="${showInlineWs ? 'chevron-up' : 'chevron-down'}" class="w-3.5 h-3.5 text-sky-400"></i>
              <span>${showInlineWs ? 'Hide Inline Sizer' : 'Quick Inline Sizer'}</span>
            </button>
            <button type="button" onclick="if(typeof TabManager !== 'undefined') TabManager.openTab('sizer_workstation');" class="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer">
              <i data-lucide="monitor" class="w-3.5 h-3.5"></i>
              <span>Open Workstation Sizer Studio &rarr;</span>
            </button>
          </div>
        </div>
        ${showInlineWs ? renderWorkstationSizerStudioHtml(false) : ''}
      </div>
    `;
  } else if (currentMode === "access_control") {
    container.classList.remove("hidden");
    const showInlineDoors = Boolean(window.catalogShowInlineDoorCalc);
    container.innerHTML = `
      <div class="space-y-3">
        <div class="bg-slate-900/95 border border-slate-800 rounded-2xl px-3.5 py-2.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 shadow-md">
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shrink-0">
              <i data-lucide="door-open" class="w-4 h-4"></i>
            </div>
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h4 class="text-xs font-bold text-white uppercase tracking-wider">Access Control Hardware Catalog</h4>
                <span class="px-2 py-0.5 rounded bg-amber-950/80 border border-amber-700/50 text-amber-300 font-mono text-[10px] font-bold">
                  Turnkey Door Kit Builder &amp; Schedule
                </span>
              </div>
              <p class="text-[11px] text-slate-400">
                Use the dedicated <strong class="text-amber-300">Doors &amp; Access Builder Studio</strong> in the top navigation to build multi-group door schedules (Controller + OSDP Reader + Strike/Maglock + REX + DPS + Power).
              </p>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2 shrink-0">
            <button type="button" onclick="window.catalogShowInlineDoorCalc = !window.catalogShowInlineDoorCalc; buildCalculatorStrip();" class="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer">
              <i data-lucide="${showInlineDoors ? 'chevron-up' : 'chevron-down'}" class="w-3.5 h-3.5 text-amber-400"></i>
              <span>${showInlineDoors ? 'Hide Inline Builder' : 'Quick Door Builder'}</span>
            </button>
            <button type="button" onclick="if(typeof TabManager !== 'undefined') TabManager.openTab('sizer_doors');" class="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer">
              <i data-lucide="door-open" class="w-3.5 h-3.5"></i>
              <span>Open Doors &amp; Access Studio &rarr;</span>
            </button>
          </div>
        </div>
        ${showInlineDoors ? renderDoorBuilderStudioHtml(false) : ''}
      </div>
    `;
  } else {
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

function renderStorageCalculatorStudioHtml(isFullStudio = true) {
    const vCalc = (typeof VideoStorageSizer !== "undefined" && typeof VideoStorageSizer.calculateFromBOM === "function")
      ? VideoStorageSizer.calculateFromBOM(projectBOM, {
          sourceMode: videoSourceMode,
          manualCameraCount: videoManualCamCount,
          resolutionMp: videoResolutionMp,
          retentionDays: videoRetentionDays,
          codec: videoCodec,
          fps: videoFps,
          lowFpsUntilMotion: videoLowFpsUntilMotion,
          idleFps: videoIdleFps,
          motionDutyCycle: videoMotionDuty,
          sceneActivity: videoSceneActivity,
          raidType: videoRaidType,
          preferredDriveSizeTb: videoPreferredDriveTb,
          vmsVendor: videoVmsVendor,
          genetecProfile: videoGenetecProfile,
          milestoneProfile: videoMilestoneProfile,
          archiverRolesCount: videoArchiverRoles,
          serverCountOverride: videoServerCount,
          encryptionCerts: videoEncryptionCerts,
          softwareMotionDetection: videoSoftwareMotion,
          failoverStructure: videoFailoverStructure,
          ringNodeCount: videoRingNodeCount,
          dedicatedPrimaryCount: videoDedicatedPrimaryCount,
          dedicatedFailoverCount: videoDedicatedFailoverCount,
          maxSimultaneousFailures: videoMaxSimultaneousFailures,
          failoverRetentionDays: videoFailoverRetentionDays,
          failoverIncludeStorageBuffer: videoFailoverIncludeStorageBuffer
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
          vmsVendor: "genetec",
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
    const isMilestoneVms = vCalc.vmsVendor === "milestone";
    const isGenericVms = vCalc.vmsVendor === "generic";
    const g = isMilestoneVms ? (vCalc.milestone || vCalc.genetec || {}) : (vCalc.genetec || {});
    const dp = vCalc.selectedDrivePlan || {};
    const showMatrix = isFullStudio ? (videoShowDetailsPanel !== false) : Boolean(videoShowDetailsPanel);

    const profilesList = (typeof GENETEC_514_REQUIREMENTS !== "undefined" && GENETEC_514_REQUIREMENTS.ARCHIVER_PROFILES)
      ? Object.values(GENETEC_514_REQUIREMENTS.ARCHIVER_PROFILES)
      : [];
    const milestoneProfilesList = (typeof MILESTONE_2026_REQUIREMENTS !== "undefined" && MILESTONE_2026_REQUIREMENTS.RECORDING_SERVER_PROFILES)
      ? Object.values(MILESTONE_2026_REQUIREMENTS.RECORDING_SERVER_PROFILES)
      : [];

    return `
      <div class="bg-slate-900/95 border border-slate-800 rounded-2xl p-3.5 sm:p-4 flex flex-col gap-3.5 shadow-lg">
        <!-- Row 1: Header, Multi-Manufacturer VMS Switcher, Datasheet Links & Primary KPI Strip -->
        <div class="flex flex-col xl:flex-row xl:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div class="flex items-start sm:items-center gap-3">
            <div class="p-2.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 shrink-0">
              <i data-lucide="hard-drive" class="w-5 h-5"></i>
            </div>
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h4 class="text-xs font-bold text-white uppercase tracking-wider">Storage, Bandwidth, RAID &amp; Multi-VMS Recorder Sizer</h4>
                <!-- Multi-Manufacturer VMS / Appliance Ecosystem Switcher -->
                <div class="inline-flex items-center bg-slate-950 border border-slate-800 rounded-xl p-0.5 text-[11px]">
                  <button type="button" onclick="setVideoSizerParam('vmsVendor', 'genetec')" class="px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer ${vCalc.vmsVendor === 'genetec' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}" title="Genetec Security Center 5.14.1.0 Archiver Role & Streamvault Appliance Sizing">
                    <i data-lucide="shield-check" class="w-3 h-3"></i>
                    <span>Genetec 5.14 / Streamvault</span>
                  </button>
                  <button type="button" onclick="setVideoSizerParam('vmsVendor', 'milestone')" class="px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer ${isMilestoneVms ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'}" title="Milestone XProtect 2026 R2 Recording Server & Husky IVO Appliance Sizing">
                    <i data-lucide="server" class="w-3 h-3"></i>
                    <span>Milestone XProtect / Husky IVO</span>
                  </button>
                  <button type="button" onclick="setVideoSizerParam('vmsVendor', 'generic')" class="px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer ${isGenericVms ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'}" title="Open VMS / Generic Enterprise NVR Storage & RAID Sizing">
                    <i data-lucide="hard-drive" class="w-3 h-3"></i>
                    <span>Open VMS / Generic</span>
                  </button>
                </div>
                <span class="px-2 py-0.5 rounded-md bg-purple-950/80 border border-purple-700/50 text-[10px] font-mono font-bold text-purple-300">
                  ${vCalc.totalCameras} Cameras (${vCalc.totalSensors} Streams @ ${vCalc.perCameraMbps} Mbps per Camera)
                </span>
                ${isMilestoneVms ? `
                  <button onclick="openDatasheetModal('Datasheets/Milestone/Systems Comparison Chart.pdf', 'Milestone XProtect 2026 R2 Systems Comparison Chart', 'MILESTONE-XPROTECT-2026')" class="px-2 py-0.5 rounded-md bg-sky-950/80 hover:bg-sky-900 border border-sky-700/60 text-[10px] font-mono font-semibold text-sky-300 flex items-center gap-1 transition-all cursor-pointer" title="Open Milestone XProtect 2026 R2 Systems Comparison Chart PDF">
                    <i data-lucide="file-text" class="w-3 h-3"></i>
                    <span>Milestone XProtect Chart</span>
                  </button>
                  <button onclick="openDatasheetModal('${g.profile?.datasheetPath || 'Datasheets/Milestone/Husky 1000R.pdf'}', 'Milestone Husky IVO Recording Server Datasheet', '${g.profile?.applianceSku || 'HIVO-1000R'}')" class="px-2 py-0.5 rounded-md bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/60 text-[10px] font-mono font-semibold text-indigo-300 flex items-center gap-1 transition-all cursor-pointer" title="Open Milestone Husky IVO Hardware Datasheet PDF">
                    <i data-lucide="server" class="w-3 h-3"></i>
                    <span>Husky IVO Datasheet</span>
                  </button>
                ` : `
                  <button onclick="openDatasheetModal('Datasheets/Genetec/SystemRequirements.pdf', 'Genetec Security Center 5.14.1.0 System Requirements Guide', 'GENETEC-SC-5.14')" class="px-2 py-0.5 rounded-md bg-sky-950/80 hover:bg-sky-900 border border-sky-700/60 text-[10px] font-mono font-semibold text-sky-300 flex items-center gap-1 transition-all cursor-pointer" title="Open Genetec Security Center 5.14.1.0 System Requirements Guide PDF">
                    <i data-lucide="file-text" class="w-3 h-3"></i>
                    <span>Genetec 5.14 Specification Guide</span>
                  </button>
                `}
              </div>
              <p class="text-[11px] text-slate-400 mt-0.5">
                ${isMilestoneVms
                  ? 'Industry-standard bitrate &amp; RAID array sizing with live <strong class="text-sky-300">Milestone XProtect 2026 R2</strong> Recording Server &amp; <strong class="text-white">Husky IVO (150D / 350T / 350R / 700R / 1000R / 1800R)</strong> throughput verification.'
                  : 'Industry-standard bitrate &amp; RAID array sizing with live <strong class="text-indigo-300">Genetec Security Center 5.14</strong> Archiver role &amp; <strong class="text-white">Streamvault</strong> server throughput verification.'}
              </p>
            </div>
          </div>

          <!-- Top Right KPI Summary & Actions -->
          <div class="flex flex-wrap items-center gap-2.5 shrink-0">
            <div class="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-slate-950 border ${g.isFullyCompliant !== false ? 'border-slate-800' : 'border-rose-600/80'}">
              <div>
                <div class="text-[9px] uppercase font-bold text-slate-400">Peak / Average Bitrate</div>
                <div class="text-xs font-mono font-bold text-sky-400">${vCalc.peakIngressMbps} <span class="text-slate-500">/</span> ${vCalc.averageRecordingMbps} Mbps</div>
              </div>
              <div class="h-6 w-px bg-slate-800"></div>
              <div>
                <div class="text-[9px] uppercase font-bold text-slate-400">Usable / Raw (${vCalc.raidLevel})</div>
                <div class="text-xs font-mono font-bold text-purple-300">${vCalc.requiredUsableTB} TB <span class="text-slate-500">/</span> ${vCalc.arrayRawTb || vCalc.requiredRawTB} TB</div>
              </div>
              <div class="h-6 w-px bg-slate-800"></div>
              <div>
                <div class="text-[9px] uppercase font-bold text-slate-400">${isMilestoneVms ? 'Milestone Recorders' : 'Genetec Archivers'}</div>
                <div class="text-xs font-mono font-bold ${g.isArchiverCountVerified !== false ? 'text-emerald-400' : 'text-rose-400'}">
                  ${isMilestoneVms ? `${g.recommendedArchiverServers || 1} Husky Server(s) (${g.activeArchiverRoles || 1} Instance(s))` : `${g.activeArchiverRoles} Role${g.activeArchiverRoles === 1 ? '' : 's'} (${g.recommendedArchiverServers} Server${g.recommendedArchiverServers === 1 ? '' : 's'})`}
                </div>
              </div>
              <div class="h-6 w-px bg-slate-800"></div>
              <div>
                <div class="text-[9px] uppercase font-bold text-slate-400">BOM Quoted</div>
                <div class="text-xs font-mono font-bold ${isStorageHealthy ? 'text-emerald-400' : 'text-amber-400'}">${quotedUsableTB} TB</div>
              </div>
            </div>

            <button onclick="setVideoSizerParam('toggleDetails', !videoShowDetailsPanel)" class="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer" title="Toggle RAID Drive Matrix & VMS Recorder Mapping">
              <i data-lucide="${showMatrix ? 'chevron-up' : 'chevron-down'}" class="w-3.5 h-3.5 text-purple-400"></i>
              <span>${showMatrix ? 'Hide Matrix' : 'RAID & Recorder Matrix'}</span>
            </button>

            <button onclick="autoFitNvrToBom()" class="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer" title="Auto-Fit Server/NVR to BOM based on required Usable TB and VMS throughput">
              <i data-lucide="wand-2" class="w-3.5 h-3.5"></i>
              <span>Auto-Fit ${isMilestoneVms ? 'Husky IVO' : 'Server'}</span>
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
              ${vCalc.anyLowFpsUntilMotion ? `
                <span class="text-[10px] font-mono px-2 py-1 rounded-lg bg-emerald-950/90 border border-emerald-700/60 text-emerald-300" title="Low-FPS baseline active on ${vCalc.lowFpsGroupCount || 1} camera group(s), adding ${vCalc.lowFpsAddedMbps || 0} Mbps average (+${vCalc.lowFpsAddedUsableTb || 0} TB usable storage) compared to motion-only recording">
                  Low-FPS Active (${vCalc.lowFpsGroupCount}/${(vCalc.cameraGroups || []).length} Groups): ${vCalc.idleIngressMbps || 0} Mbps Idle ➔ ${vCalc.peakIngressMbps} Mbps Boost (+${vCalc.lowFpsAddedUsableTb || 0} TB)
                </span>
              ` : ''}

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

          <!-- Camera Groups Table (with Per-Column "All" Sync Checkboxes & Per-Group Low-FPS Until Motion) -->
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="border-b border-slate-800 text-[9px] uppercase font-bold text-slate-400 align-bottom">
                  <th class="py-1.5 px-2 min-w-[125px]">Group Name</th>
                  <th class="py-1.5 px-1.5 w-20">Cameras</th>
                  <th class="py-1.5 px-1.5 min-w-[125px]">
                    <div class="flex flex-col gap-0.5">
                      <label class="inline-flex items-center gap-1 text-[8px] font-mono text-purple-300 cursor-pointer select-none" title="Check to set all camera groups to the same Sensors per Camera setting">
                        <input type="checkbox" ${videoSyncAllColumns.heads ? 'checked' : ''} onchange="toggleVideoColumnSync('heads', this.checked)" class="w-3 h-3 rounded accent-purple-500 cursor-pointer" />
                        <span>All Same</span>
                      </label>
                      <span>Sensors per Camera</span>
                    </div>
                  </th>
                  <th class="py-1.5 px-1.5 min-w-[130px]">
                    <div class="flex flex-col gap-0.5">
                      <label class="inline-flex items-center gap-1 text-[8px] font-mono text-purple-300 cursor-pointer select-none" title="Check to set all camera groups to the same Resolution">
                        <input type="checkbox" ${videoSyncAllColumns.resolutionMp ? 'checked' : ''} onchange="toggleVideoColumnSync('resolutionMp', this.checked)" class="w-3 h-3 rounded accent-purple-500 cursor-pointer" />
                        <span>All Same</span>
                      </label>
                      <span>Resolution / Sensor</span>
                    </div>
                  </th>
                  <th class="py-1.5 px-1.5 w-24">
                    <div class="flex flex-col gap-0.5">
                      <label class="inline-flex items-center gap-1 text-[8px] font-mono text-purple-300 cursor-pointer select-none" title="Check to set all camera groups to the same target Frame Rate">
                        <input type="checkbox" ${videoSyncAllColumns.fps ? 'checked' : ''} onchange="toggleVideoColumnSync('fps', this.checked)" class="w-3 h-3 rounded accent-purple-500 cursor-pointer" />
                        <span>All Same</span>
                      </label>
                      <span>Frame Rate</span>
                    </div>
                  </th>
                  <th class="py-1.5 px-1.5 min-w-[140px]">
                    <div class="flex flex-col gap-0.5">
                      <div class="flex items-center justify-between gap-1">
                        <label class="inline-flex items-center gap-1 text-[8px] font-mono text-emerald-300 cursor-pointer select-none" title="Check/uncheck to enable or disable Low-FPS Until Motion for ALL camera groups at once">
                          <input type="checkbox" ${vCalc.allLowFpsUntilMotion ? 'checked' : ''} onchange="toggleAllCameraGroupsLowFps(this.checked)" class="w-3 h-3 rounded accent-emerald-500 cursor-pointer" />
                          <span>All Groups</span>
                        </label>
                        <select onchange="setAllCameraGroupsIdleFps(Number(this.value))" class="bg-slate-900 border border-slate-700 rounded px-1 py-0 text-[8px] font-mono text-emerald-300 cursor-pointer" title="Set Idle FPS for all camera groups">
                          ${[1, 2, 3, 4, 5].map(ifps => `<option value="${ifps}" class="bg-slate-900" ${(vCalc.idleFps || 2) === ifps ? 'selected' : ''}>All ${ifps}FPS</option>`).join('')}
                        </select>
                      </div>
                      <span class="text-emerald-300">Low-FPS Until Motion</span>
                    </div>
                  </th>
                  <th class="py-1.5 px-1.5 min-w-[120px]">
                    <div class="flex flex-col gap-0.5">
                      <label class="inline-flex items-center gap-1 text-[8px] font-mono text-purple-300 cursor-pointer select-none" title="Check to set all camera groups to the same Codec">
                        <input type="checkbox" ${videoSyncAllColumns.codec ? 'checked' : ''} onchange="toggleVideoColumnSync('codec', this.checked)" class="w-3 h-3 rounded accent-purple-500 cursor-pointer" />
                        <span>All Same</span>
                      </label>
                      <span>Format / Codec</span>
                    </div>
                  </th>
                  <th class="py-1.5 px-1.5 min-w-[115px]">
                    <div class="flex flex-col gap-0.5">
                      <label class="inline-flex items-center gap-1 text-[8px] font-mono text-purple-300 cursor-pointer select-none" title="Check to set all camera groups to the same Scene Activity">
                        <input type="checkbox" ${videoSyncAllColumns.sceneActivity ? 'checked' : ''} onchange="toggleVideoColumnSync('sceneActivity', this.checked)" class="w-3 h-3 rounded accent-purple-500 cursor-pointer" />
                        <span>All Same</span>
                      </label>
                      <span>Scene Activity</span>
                    </div>
                  </th>
                  <th class="py-1.5 px-1.5 min-w-[155px]">
                    <div class="flex flex-col gap-0.5">
                      <label class="inline-flex items-center gap-1 text-[8px] font-mono text-purple-300 cursor-pointer select-none" title="Check to set all camera groups to the same Recording Mode / Motion %">
                        <input type="checkbox" ${videoSyncAllColumns.motionDutyPct ? 'checked' : ''} onchange="toggleVideoColumnSync('motionDutyPct', this.checked)" class="w-3 h-3 rounded accent-purple-500 cursor-pointer" />
                        <span>All Same</span>
                      </label>
                      <span>Recording Mode / Motion</span>
                    </div>
                  </th>
                  <th class="py-1.5 px-1.5 w-28">
                    <div class="flex flex-col gap-0.5">
                      <label class="inline-flex items-center gap-1 text-[8px] font-mono text-purple-300 cursor-pointer select-none" title="Check to set all camera groups to the same Retention (Days)">
                        <input type="checkbox" ${videoSyncAllColumns.retentionDays ? 'checked' : ''} onchange="toggleVideoColumnSync('retentionDays', this.checked)" class="w-3 h-3 rounded accent-purple-500 cursor-pointer" />
                        <span>All Same</span>
                      </label>
                      <span>Retention (Days)</span>
                    </div>
                  </th>
                  <th class="py-1.5 px-2 text-right min-w-[130px]">Peak / Average Mbps</th>
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
                    <!-- Per-Group Low-FPS Until Motion (e.g. 2 FPS Idle -> High FPS on Motion/Event) -->
                    <td class="py-1.5 px-1.5">
                      <div class="flex items-center gap-1.5 px-2 py-1 rounded border ${grp.lowFpsUntilMotion ? 'bg-emerald-950/30 border-emerald-600/60' : 'bg-slate-900 border-slate-700/80'}">
                        <input type="checkbox" ${grp.lowFpsUntilMotion ? 'checked' : ''} onchange="updateVideoCameraGroup(${idx}, 'lowFpsUntilMotion', this.checked)" class="w-3.5 h-3.5 rounded accent-emerald-500 cursor-pointer shrink-0" title="Enable low-FPS continuous recording for this camera group until motion/event boosts to ${grp.fps} FPS" />
                        <select onchange="updateVideoCameraGroup(${idx}, 'idleFps', Number(this.value))" class="w-full bg-transparent ${grp.lowFpsUntilMotion ? 'text-emerald-300 font-bold' : 'text-slate-400'} font-mono text-[11px] focus:outline-none cursor-pointer" title="Idle frame rate for this camera group before motion/event occurs">
                          ${[1, 2, 3, 4, 5].map(ifps => `<option value="${ifps}" class="bg-slate-900" ${(grp.idleFps || 2) === ifps ? 'selected' : ''}>${ifps} FPS ➔ ${grp.fps} FPS</option>`).join('')}
                        </select>
                      </div>
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
                    <!-- Recording Mode / Motion Duty -->
                    <td class="py-1.5 px-1.5">
                      <select onchange="updateVideoCameraGroup(${idx}, 'motionDutyPct', Number(this.value))" class="w-full bg-slate-900 border border-slate-700/80 rounded px-1.5 py-1 text-white font-bold text-xs focus:outline-none cursor-pointer">
                        <option value="100" class="bg-slate-900" ${grp.motionDutyPct >= 100 ? 'selected' : ''}>Continuous (100%)</option>
                        <option value="75" class="bg-slate-900" ${grp.motionDutyPct === 75 ? 'selected' : ''}>${grp.lowFpsUntilMotion ? `75% Boost / 25% @ ${grp.idleFps || 2}FPS` : 'Motion High (75%)'}</option>
                        <option value="70" class="bg-slate-900" ${grp.motionDutyPct === 70 ? 'selected' : ''}>${grp.lowFpsUntilMotion ? `70% Boost / 30% @ ${grp.idleFps || 2}FPS` : 'Motion Commercial (70%)'}</option>
                        <option value="50" class="bg-slate-900" ${grp.motionDutyPct === 50 ? 'selected' : ''}>${grp.lowFpsUntilMotion ? `50% Boost / 50% @ ${grp.idleFps || 2}FPS` : 'Motion Medium (50%)'}</option>
                        <option value="25" class="bg-slate-900" ${grp.motionDutyPct === 25 ? 'selected' : ''}>${grp.lowFpsUntilMotion ? `25% Boost / 75% @ ${grp.idleFps || 2}FPS` : 'Motion Low (25%)'}</option>
                        <option value="10" class="bg-slate-900" ${grp.motionDutyPct === 10 ? 'selected' : ''}>${grp.lowFpsUntilMotion ? `10% Boost / 90% @ ${grp.idleFps || 2}FPS` : 'Motion Minimum (10%)'}</option>
                      </select>
                    </td>
                    <!-- Retention Days (Number input with quick step) -->
                    <td class="py-1.5 px-1.5">
                      <div class="flex items-center gap-1">
                        <input type="number" min="1" max="1825" value="${grp.retentionDays}" onchange="updateVideoCameraGroup(${idx}, 'retentionDays', Math.max(1, parseInt(this.value, 10) || 30))" class="w-full bg-slate-900 border border-slate-700/80 rounded px-2 py-1 text-xs font-mono font-bold text-amber-300 text-center focus:outline-none focus:border-purple-500" title="Retention in days for this camera group" />
                        <span class="text-[10px] text-slate-400 font-mono">Days</span>
                      </div>
                    </td>
                    <!-- Group Peak / Average Bitrate -->
                    <td class="py-1.5 px-2 text-right font-mono">
                      <div class="text-xs font-bold text-sky-400">${grp.peakIngressMbps} <span class="text-slate-500">/</span> ${grp.averageRecordingMbps}</div>
                      <div class="text-[9px] ${grp.lowFpsUntilMotion ? 'text-emerald-400' : 'text-slate-500'}">
                        ${grp.lowFpsUntilMotion ? `Idle: ${grp.idleIngressMbps} Mbps (@${grp.idleFps}fps)` : `${grp.perCameraMbps} Mbps per Camera (${grp.totalStreams} Streams)`}
                      </div>
                    </td>
                    <!-- Group Usable TB -->
                    <td class="py-1.5 px-2 text-right font-mono">
                      <div class="text-xs font-bold text-purple-300">${grp.requiredUsableTb} TB</div>
                      <div class="text-[9px] text-slate-500">${grp.dailyStorageGb} GB/Day</div>
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

        <!-- Row 2.5: Archiver / NVR Failover Calculator (Dynamic N-Server Ring vs. Shared Dedicated Failover N ➔ M) -->
        ${(() => {
          const fo = vCalc.failover || {
            structure: 'none',
            ringNodes: 0,
            dynamicAutoRingNodes: 2,
            ringChainText: 'None',
            ringNodeSchedule: [],
            dedicatedPoolSchedule: [],
            dedicatedFailoverServers: 0,
            simultaneousFailures: 1,
            loadsPerFailoverServer: 1,
            minFailoverServersForK: 1,
            primaryServerCount: g.recommendedArchiverServers || 1,
            totalServersRequired: g.recommendedArchiverServers || 1,
            normalCamsPerServer: vCalc.totalCameras,
            normalMbpsPerServer: vCalc.peakIngressMbps,
            failoverCamsOnSurvivor: vCalc.totalCameras,
            failoverMbpsOnSurvivor: vCalc.peakIngressMbps,
            primaryUsableTbPerServer: vCalc.basePrimaryUsableTb || vCalc.requiredUsableTB,
            failoverBufferTbPerServer: 0,
            totalUsableTbPerRingServer: vCalc.basePrimaryUsableTb || vCalc.requiredUsableTB,
            failoverAddedUsableTb: 0,
            isRingSurvivorVerified: true,
            isDedicatedSurvivorVerified: true
          };
          const isRing = fo.structure === 'ring';
          const isDedicated = fo.structure === 'dedicated';
          const isActiveFailover = isRing || isDedicated;
          const bufferSelectorValue = !videoFailoverIncludeStorageBuffer ? -1 : (videoFailoverRetentionDays || 0);

          return `
            <div class="bg-slate-950/90 border ${isActiveFailover ? 'border-cyan-500/40' : 'border-slate-800'} rounded-xl p-3 flex flex-col gap-2.5">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="text-[11px] font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                    <i data-lucide="refresh-cw" class="w-3.5 h-3.5 ${isActiveFailover ? 'text-cyan-400' : 'text-slate-400'}"></i>
                    <span>Archiver / NVR Failover Calculator</span>
                  </span>
                  <!-- Failover Structure Segmented Buttons -->
                  <div class="inline-flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-[11px]">
                    <button type="button" onclick="setVideoSizerParam('failoverStructure', 'none')" class="px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${fo.structure === 'none' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}">
                      None (Standalone)
                    </button>
                    <button type="button" onclick="setVideoSizerParam('failoverStructure', 'ring')" class="px-2.5 py-1 rounded-md font-bold flex items-center gap-1 transition-all cursor-pointer ${isRing ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'}" title="Dynamic N-Server Ring Failover (S1 ➔ S2 ➔ ... ➔ SN ➔ S1): Each server in the ring hosts a Primary Archiver + Standby Archiver for its upstream neighbor">
                      <i data-lucide="repeat" class="w-3 h-3"></i>
                      <span>Ring Failover (${isRing ? `${fo.ringNodes}-Server Ring: ${fo.ringChainText}` : 'Dynamic N-Server Ring'})</span>
                    </button>
                    <button type="button" onclick="setVideoSizerParam('failoverStructure', 'dedicated')" class="px-2.5 py-1 rounded-md font-bold flex items-center gap-1 transition-all cursor-pointer ${isDedicated ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}" title="Dedicated Failover Server(s) (N Main ➔ M Shared Failover): Multiple main servers can fail over to the same shared failover server(s)">
                      <i data-lucide="server-cog" class="w-3 h-3"></i>
                      <span>Dedicated Failover (${isDedicated ? `${fo.primaryServerCount} Main ➔ ${fo.dedicatedFailoverServers} Failover` : 'N Main ➔ M Shared'})</span>
                    </button>
                  </div>
                </div>

                ${isActiveFailover ? `
                  <div class="flex flex-wrap items-center gap-2">
                    ${isRing ? `
                      <!-- Dynamic Ring Server Count Control (Auto or any N >= 2) -->
                      <div class="flex items-center gap-1.5 bg-slate-900 border border-cyan-500/40 rounded-lg px-2.5 py-1" title="Number of servers in the failover ring (dynamically builds A➔B➔A for 2, A➔B➔C➔A for 3, A➔B➔C➔D➔A for 4, etc.)">
                        <span class="text-[9px] font-bold uppercase text-cyan-300">Ring Servers (N):</span>
                        <input type="number" min="2" max="64" value="${fo.ringNodes}" onchange="setVideoSizerParam('ringNodeCount', Math.max(2, parseInt(this.value, 10) || 2))" class="w-12 bg-slate-950 border border-slate-700/80 rounded px-1.5 py-0.5 text-xs font-mono font-bold text-cyan-300 focus:outline-none text-center" />
                        <button type="button" onclick="setVideoSizerParam('ringNodeCount', 0)" class="text-[9px] font-mono px-1.5 py-0.5 rounded ${videoRingNodeCount === 0 ? 'bg-cyan-900/80 text-cyan-200' : 'bg-slate-800 text-slate-400 hover:text-white'} cursor-pointer" title="Automatically size ring to match required servers (${fo.dynamicAutoRingNodes || 2} servers)">
                          Auto (${fo.dynamicAutoRingNodes || 2})
                        </button>
                      </div>
                    ` : `
                      <!-- Dedicated Many-to-One / Shared Pool Controls: N Main Servers, M Shared Failover Servers, K Simultaneous Failures -->
                      <div class="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1" title="Number of Main Primary Servers being protected by the shared Failover Server pool">
                        <span class="text-[9px] font-bold uppercase text-slate-300">Main Servers (N):</span>
                        <input type="number" min="1" max="64" value="${fo.primaryServerCount}" onchange="setVideoSizerParam('dedicatedPrimaryCount', Math.max(1, parseInt(this.value, 10) || 1))" class="w-11 bg-slate-950 border border-slate-700/80 rounded px-1 py-0.5 text-xs font-mono font-bold text-sky-300 focus:outline-none text-center" />
                        <button type="button" onclick="setVideoSizerParam('dedicatedPrimaryCount', 0)" class="text-[9px] font-mono px-1.5 py-0.5 rounded ${videoDedicatedPrimaryCount === 0 ? 'bg-purple-900/80 text-purple-200' : 'bg-slate-800 text-slate-400 hover:text-white'} cursor-pointer" title="Auto-calculate Main Primary Servers from camera/throughput load">
                          Auto
                        </button>
                      </div>
                      <div class="flex items-center gap-1.5 bg-slate-900 border border-indigo-500/40 rounded-lg px-2.5 py-1" title="Number of shared Dedicated Failover Servers (M) monitoring the N Main Servers">
                        <span class="text-[9px] font-bold uppercase text-indigo-300">Failover Servers (M):</span>
                        <input type="number" min="1" max="32" value="${fo.dedicatedFailoverServers}" onchange="setVideoSizerParam('dedicatedFailoverCount', Math.max(1, parseInt(this.value, 10) || 1))" class="w-11 bg-slate-950 border border-slate-700/80 rounded px-1 py-0.5 text-xs font-mono font-bold text-indigo-300 focus:outline-none text-center" />
                      </div>
                      <div class="flex items-center gap-1.5 bg-slate-900 border border-amber-500/30 rounded-lg px-2.5 py-1" title="How many Main Servers can fail at the exact same time onto the shared Failover pool? (1 = Standard N+1 where 1 Main Server fails at a time; 2+ = multi-server simultaneous outage)">
                        <span class="text-[9px] font-bold uppercase text-amber-300">Simultaneous Failures (K):</span>
                        <select onchange="setVideoSizerParam('maxSimultaneousFailures', Number(this.value))" class="bg-slate-950 border border-slate-700/80 rounded px-1.5 py-0.5 text-amber-300 font-mono font-bold text-xs focus:outline-none cursor-pointer">
                          ${Array.from({ length: Math.max(1, fo.primaryServerCount) }, (_, kIdx) => kIdx + 1).map(k => `
                            <option value="${k}" class="bg-slate-900" ${(fo.simultaneousFailures || 1) === k ? 'selected' : ''}>
                              ${k} Main Server(s) at once${k === 1 ? ' (Standard N+1)' : k === fo.primaryServerCount ? ' (All Main Servers)' : ''}
                            </option>
                          `).join('')}
                        </select>
                      </div>
                    `}

                    <!-- Failover Storage Buffer Selector -->
                    <div class="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1" title="Storage buffer reserved for recording failover streams during an outage">
                      <span class="text-[9px] font-bold uppercase text-slate-400">Failover Storage Buffer:</span>
                      <select onchange="setVideoSizerParam('failoverBufferMode', Number(this.value))" class="bg-slate-950 border border-slate-700/80 rounded px-1.5 py-0.5 text-amber-300 font-mono font-bold text-xs focus:outline-none cursor-pointer">
                        <option value="0" class="bg-slate-900" ${bufferSelectorValue === 0 ? 'selected' : ''}>Full Retention Mirror (100%)</option>
                        <option value="30" class="bg-slate-900" ${bufferSelectorValue === 30 ? 'selected' : ''}>30-Day Failover Buffer</option>
                        <option value="14" class="bg-slate-900" ${bufferSelectorValue === 14 ? 'selected' : ''}>14-Day Failover Buffer</option>
                        <option value="7" class="bg-slate-900" ${bufferSelectorValue === 7 ? 'selected' : ''}>7-Day Failover Buffer</option>
                        <option value="3" class="bg-slate-900" ${bufferSelectorValue === 3 ? 'selected' : ''}>3-Day Outage Buffer</option>
                        <option value="-1" class="bg-slate-900" ${bufferSelectorValue === -1 ? 'selected' : ''}>Switchover Only (0 TB Extra)</option>
                      </select>
                    </div>
                  </div>
                ` : `
                  <span class="text-[10px] text-slate-400 font-mono">
                    Select <strong class="text-cyan-300">Ring Failover (Dynamic N-Server Ring)</strong> or <strong class="text-indigo-300">Dedicated Failover (N Main ➔ M Shared)</strong> to size survivor throughput &amp; failover storage buffers.
                  </span>
                `}
              </div>

              ${isRing ? `
                <!-- Dynamic N-Server Ring Failover Visual Chain & Survivor Load Telemetry -->
                <div class="grid grid-cols-1 xl:grid-cols-12 gap-2.5 pt-1 border-t border-slate-800/80">
                  <div class="xl:col-span-5 bg-slate-900/90 border border-cyan-500/30 rounded-lg p-2.5 flex flex-col justify-between gap-2">
                    <div class="flex items-center justify-between gap-2">
                      <span class="text-[10px] font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1">
                        <i data-lucide="git-merge" class="w-3.5 h-3.5"></i>
                        <span>Dynamic ${fo.ringNodes}-Server Ring Chain</span>
                      </span>
                      <span class="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${fo.isRingSurvivorVerified ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60' : 'bg-amber-950 text-amber-300 border border-amber-700/60'}">
                        ${fo.isRingSurvivorVerified ? '✓ 2x Survivor Load Verified' : `⚠ Minimum ${fo.minCompliantRingNodes} Ring Servers Needed`}
                      </span>
                    </div>
                    <div class="px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 font-mono text-xs font-bold text-cyan-300 text-center tracking-wide">
                      ${fo.ringChainText}
                    </div>
                    <div class="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                      ${(fo.ringNodeSchedule || []).map(node => `
                        <div class="flex-1 min-w-[125px] p-1.5 rounded bg-slate-950/80 border border-slate-800/90 text-[10px] font-mono">
                          <div class="font-bold text-white flex items-center justify-between">
                            <span>${node.nodeLabel}</span>
                            <span class="text-cyan-400">➔ ${node.failsOverTo}</span>
                          </div>
                          <div class="text-[9px] text-slate-400 mt-0.5">Normal: <strong class="text-sky-300">${node.normalCams} Cameras / ${node.normalMbps} Mbps</strong></div>
                          <div class="text-[9px] text-slate-400">Failover: <strong class="text-amber-300">${node.survivorCams} Cameras / ${node.survivorMbps} Mbps</strong></div>
                        </div>
                      `).join('')}
                    </div>
                  </div>

                  <div class="xl:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div class="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
                      <div class="text-[9px] font-mono uppercase text-slate-400">Ring Fleet Size</div>
                      <div class="text-sm font-mono font-bold text-cyan-300">${fo.ringNodes} Servers</div>
                      <div class="text-[9px] text-slate-500">1 Primary + 1 Neighbor Standby per Server</div>
                    </div>
                    <div class="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
                      <div class="text-[9px] font-mono uppercase text-slate-400">Normal Load / Node</div>
                      <div class="text-sm font-mono font-bold text-sky-400">${fo.normalMbpsPerServer} Mbps</div>
                      <div class="text-[9px] text-slate-500">${fo.normalCamsPerServer} Cameras • ${fo.primaryUsableTbPerServer} TB Primary</div>
                    </div>
                    <div class="p-2.5 rounded-lg bg-slate-900/80 border ${fo.isRingSurvivorVerified ? 'border-slate-800' : 'border-amber-600/70'} flex flex-col justify-between">
                      <div class="text-[9px] font-mono uppercase text-amber-300">Survivor Load (2x)</div>
                      <div class="text-sm font-mono font-bold text-amber-300">${fo.failoverMbpsOnSurvivor} Mbps</div>
                      <div class="text-[9px] text-slate-400">${fo.failoverCamsOnSurvivor} Cameras when neighbor fails</div>
                    </div>
                    <div class="p-2.5 rounded-lg bg-slate-900/80 border border-purple-500/30 flex flex-col justify-between">
                      <div class="text-[9px] font-mono uppercase text-purple-300">Storage / Ring Node</div>
                      <div class="text-sm font-mono font-bold text-purple-300">${fo.totalUsableTbPerRingServer} TB per Server</div>
                      <div class="text-[9px] text-slate-400">+${fo.failoverBufferTbPerServer} TB buffer (+${fo.failoverAddedUsableTb} TB total)</div>
                    </div>
                  </div>
                </div>
              ` : ''}

              ${isDedicated ? `
                <!-- Dedicated Shared Failover Pool (N Main Servers ➔ M Shared Failover Server(s)) Telemetry -->
                <div class="grid grid-cols-1 xl:grid-cols-12 gap-2.5 pt-1 border-t border-slate-800/80">
                  <div class="xl:col-span-5 bg-slate-900/90 border border-indigo-500/30 rounded-lg p-2.5 flex flex-col justify-between gap-2">
                    <div class="flex items-center justify-between gap-2">
                      <span class="text-[10px] font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1">
                        <i data-lucide="share-2" class="w-3.5 h-3.5"></i>
                        <span>Shared Failover Pool (${fo.primaryServerCount} Main ➔ ${fo.dedicatedFailoverServers} Failover)</span>
                      </span>
                      <span class="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${fo.isDedicatedSurvivorVerified !== false ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60' : 'bg-amber-950 text-amber-300 border border-amber-700/60'}">
                        ${fo.isDedicatedSurvivorVerified !== false ? `✓ Covers ${fo.simultaneousFailures || 1} Simultaneous Failure(s)` : `⚠ Need ≥${fo.minFailoverServersForK} Failover Server(s)`}
                      </span>
                    </div>
                    <div class="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                      ${(fo.dedicatedPoolSchedule || []).map(pool => `
                        <div class="flex-1 min-w-[160px] p-1.5 rounded bg-slate-950/80 border border-slate-800/90 text-[10px] font-mono">
                          <div class="font-bold text-indigo-300 flex items-center justify-between">
                            <span>${pool.failoverName}</span>
                            <span class="text-amber-300">Absorbs ${pool.simultaneousAbsorbed}x Main Load</span>
                          </div>
                          <div class="text-[9px] text-slate-300 mt-0.5">Protects: <strong class="text-white">${pool.monitorsText}</strong></div>
                          <div class="text-[9px] text-slate-400">Sized For: <strong class="text-amber-300">${pool.failoverCams} Cameras / ${pool.failoverMbps} Mbps / ${pool.failoverBufferTb} TB</strong></div>
                        </div>
                      `).join('')}
                    </div>
                  </div>

                  <div class="xl:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div class="p-2.5 rounded-lg bg-slate-900/80 border border-indigo-500/30 flex flex-col justify-between">
                      <div class="text-[9px] font-mono uppercase text-indigo-300">Total Fleet (N + M)</div>
                      <div class="text-sm font-mono font-bold text-white">${fo.primaryServerCount} Main + ${fo.dedicatedFailoverServers} Failover = <span class="text-indigo-300">${fo.totalServersRequired} Servers</span></div>
                      <div class="text-[9px] text-slate-400">${fo.primaryServerCount} Main Servers share ${fo.dedicatedFailoverServers} Failover Server(s)</div>
                    </div>
                    <div class="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
                      <div class="text-[9px] font-mono uppercase text-slate-400">Load / Main Server (N=${fo.primaryServerCount})</div>
                      <div class="text-sm font-mono font-bold text-sky-400">${fo.normalMbpsPerServer} Mbps per Server</div>
                      <div class="text-[9px] text-slate-500">${fo.normalCamsPerServer} Cameras • ${fo.primaryUsableTbPerServer} TB Usable per Server</div>
                    </div>
                    <div class="p-2.5 rounded-lg bg-slate-900/80 border ${fo.isDedicatedSurvivorVerified !== false ? 'border-slate-800' : 'border-amber-600/70'} flex flex-col justify-between">
                      <div class="text-[9px] font-mono uppercase text-amber-300">Failover Server Specification (${fo.loadsPerFailoverServer || 1}x Load)</div>
                      <div class="text-sm font-mono font-bold text-amber-300">${fo.failoverMbpsOnSurvivor} Mbps Capacity</div>
                      <div class="text-[9px] text-slate-400">Absorbs ${fo.failoverCamsOnSurvivor} Cameras (${fo.simultaneousFailures || 1} Simultaneous Failure${(fo.simultaneousFailures || 1) === 1 ? '' : 's'})</div>
                    </div>
                    <div class="p-2.5 rounded-lg bg-slate-900/80 border border-purple-500/30 flex flex-col justify-between">
                      <div class="text-[9px] font-mono uppercase text-purple-300">Failover Storage Buffer</div>
                      <div class="text-sm font-mono font-bold text-purple-300">${fo.failoverBufferTbPerServer} TB per Failover Server</div>
                      <div class="text-[9px] text-slate-400">Total Project: ${vCalc.requiredUsableTB} TB (+${fo.failoverAddedUsableTb} TB buffer)</div>
                    </div>
                  </div>
                </div>
              ` : ''}
            </div>
          `;
        })()}

        ${showMatrix ? `
        <!-- Row 3: Detailed VMS (Genetec 5.14 / Milestone XProtect 2026) Verification & RAID Drive Options Matrix -->
        <div class="grid grid-cols-1 xl:grid-cols-12 gap-3 pt-1">
          <!-- Left Panel (5 cols): Multi-Manufacturer VMS Recorder & Server Verification -->
          <div class="xl:col-span-5 bg-slate-950/90 border ${g.isFullyCompliant !== false ? 'border-slate-800' : 'border-amber-600/70'} rounded-xl p-3 flex flex-col justify-between gap-2.5">
            <div class="space-y-2">
              <div class="flex items-center justify-between gap-2 flex-wrap">
                <div class="flex items-center gap-1.5">
                  <i data-lucide="shield-check" class="w-4 h-4 ${g.isFullyCompliant !== false ? 'text-emerald-400' : 'text-amber-400'}"></i>
                  <span class="text-[11px] font-bold uppercase tracking-wider text-white">
                    ${isMilestoneVms ? 'Milestone XProtect 2026 &amp; Husky IVO Verification' : 'Genetec 5.14 Archiver &amp; Server Verification'}
                  </span>
                </div>
                <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold ${g.isFullyCompliant !== false ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60' : 'bg-rose-950 text-rose-300 border border-rose-700/60'}">
                  ${g.isFullyCompliant !== false ? `✓ PASS: ${isMilestoneVms ? 'MILESTONE 2026' : 'GENETEC 5.14'} VERIFIED` : '⚠ CAPACITY / RULE ALERT'}
                </span>
              </div>

              <!-- Server Profile, Multi-Role Server Count & Encryption Modifiers -->
              <div class="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1">
                <div class="sm:col-span-6 bg-slate-900/90 border border-slate-800 rounded-lg px-2.5 py-1.5">
                  <div class="text-[9px] font-bold uppercase text-slate-400">
                    ${isMilestoneVms ? `Milestone Husky IVO Profile (${g.profile?.referencePage || 'Husky IVO'})` : `Genetec 5.14 Server Profile (${g.profile?.referencePage || 'Sec 1.4'})`}
                  </div>
                  ${isMilestoneVms ? `
                    <select onchange="setVideoSizerParam('milestoneProfile', this.value)" class="w-full bg-transparent text-sky-300 font-bold text-xs focus:outline-none cursor-pointer mt-0.5">
                      ${milestoneProfilesList.map(p => `<option value="${p.id}" class="bg-slate-900" ${g.profileKey === p.id ? 'selected' : ''}>${p.label} (Maximum ${p.maxCamerasPerRole} Cameras / ${p.maxBitrateMbpsPerRole} Mbps • Up to ${p.maxRawStorageTb}TB Raw)</option>`).join('')}
                    </select>
                  ` : `
                    <select onchange="setVideoSizerParam('genetecProfile', this.value)" class="w-full bg-transparent text-sky-300 font-bold text-xs focus:outline-none cursor-pointer mt-0.5">
                      ${profilesList.map(p => `<option value="${p.id}" class="bg-slate-900" ${g.profileKey === p.id ? 'selected' : ''}>${p.label} (Maximum ${p.maxCamerasPerRole} Cameras / ${p.maxBitrateMbpsPerRole} Mbps per Role • ≤${p.maxRolesPerServer || 4} Roles per Server)</option>`).join('')}
                    </select>
                  `}
                </div>
                <div class="sm:col-span-3 bg-slate-900/90 border ${g.isServerCountVerified !== false ? 'border-slate-800' : 'border-rose-600'} rounded-lg px-2.5 py-1.5 flex flex-col justify-center">
                  <div class="flex items-center justify-between">
                    <span class="text-[9px] font-bold uppercase text-slate-400">Servers (#)</span>
                    <button onclick="setVideoSizerParam('serverCount', 0)" class="text-[9px] font-mono px-1 rounded ${videoServerCount === 0 ? 'bg-purple-900/80 text-purple-200' : 'bg-slate-800 text-slate-400 hover:text-white'} cursor-pointer" title="Auto-pack Recording/Archiver roles onto servers within manufacturer limits">
                      Auto (${g.minRequiredServers || 1})
                    </button>
                  </div>
                  <div class="flex items-center gap-1 mt-0.5">
                    <input type="number" min="0" max="64" value="${videoServerCount === 0 ? g.recommendedArchiverServers : videoServerCount}" onchange="setVideoSizerParam('serverCount', Math.max(0, parseInt(this.value, 10) || 0))" class="w-full bg-slate-950 border border-slate-700/80 rounded px-1.5 py-0.5 text-xs font-mono font-bold ${g.isServerCountVerified !== false ? 'text-amber-300' : 'text-rose-400'} focus:outline-none" title="Number of physical servers" />
                    <span class="text-[9px] text-slate-400 font-mono">Servers</span>
                  </div>
                </div>
                <div class="sm:col-span-3 bg-slate-900/90 border border-slate-800 rounded-lg px-2.5 py-1.5 flex flex-col justify-center">
                  <div class="text-[9px] font-bold uppercase text-slate-400">${isMilestoneVms ? 'Database Encryption' : 'Encryption (p.10)'}</div>
                  <select onchange="setVideoSizerParam('encryptionCerts', Number(this.value))" class="w-full bg-transparent text-slate-200 font-bold text-xs focus:outline-none cursor-pointer mt-0.5">
                    <option value="0" class="bg-slate-900" ${g.encryptionCerts === 0 ? 'selected' : ''}>0 Certificates (100%)</option>
                    <option value="1" class="bg-slate-900" ${g.encryptionCerts === 1 ? 'selected' : ''}>${isMilestoneVms ? 'Media Database Encrypted (-15%)' : '1 Certificate (-30%)'}</option>
                    <option value="5" class="bg-slate-900" ${g.encryptionCerts === 5 ? 'selected' : ''}>${isMilestoneVms ? 'Signed + Encrypted (-25%)' : '5 Certificates (-41%)'}</option>
                    <option value="10" class="bg-slate-900" ${g.encryptionCerts === 10 ? 'selected' : ''}>10 Certificates (-52%)</option>
                    <option value="20" class="bg-slate-900" ${g.encryptionCerts === 20 ? 'selected' : ''}>20 Certificates (-68%)</option>
                  </select>
                </div>
              </div>

              <!-- Per-Recorder/Archiver, Multi-Role Server & Storage Tier Mapping Grid -->
              <div class="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center pt-1">
                <div class="p-2 rounded-lg bg-slate-900/70 border border-slate-800/90">
                  <div class="text-[9px] font-mono uppercase text-slate-400">${isMilestoneVms ? 'Recording Instances' : 'Archiver Roles'}</div>
                  <div class="text-sm font-mono font-bold ${g.isArchiverCountVerified !== false ? 'text-emerald-400' : 'text-rose-400'}">${g.activeArchiverRoles} <span class="text-[10px] text-slate-400">/ ${g.minRequiredArchiverRoles} Minimum</span></div>
                  <div class="text-[9px] text-slate-500">≤${g.effectiveMaxMbpsPerArchiver} Mbps per ${isMilestoneVms ? 'Instance' : 'Role'}</div>
                </div>
                <div class="p-2 rounded-lg bg-slate-900/70 border border-slate-800/90">
                  <div class="text-[9px] font-mono uppercase text-slate-400">Load per ${isMilestoneVms ? 'Instance' : 'Role'}</div>
                  <div class="text-sm font-mono font-bold text-sky-400">${g.bitratePerArchiverRoleMbps} Mbps</div>
                  <div class="text-[9px] text-slate-500">${g.camerasPerArchiverRole} Cameras • ${g.usableTbPerArchiverRole} TB</div>
                </div>
                <div class="p-2 rounded-lg bg-slate-900/70 border border-slate-800/90">
                  <div class="text-[9px] font-mono uppercase text-slate-400">${isMilestoneVms ? 'Husky Fleet' : 'Roles / Server'}</div>
                  <div class="text-sm font-mono font-bold ${g.isServerCountVerified !== false ? 'text-amber-300' : 'text-rose-400'}">${isMilestoneVms ? `${g.recommendedArchiverServers} Husky Server(s)` : `${g.rolesPerServer || 1} Role${(g.rolesPerServer || 1) === 1 ? '' : 's'} per Server`}</div>
                  <div class="text-[9px] text-slate-500">${g.recommendedArchiverServers} Server(s) (${g.bitratePerServerMbps} Mbps per Server)</div>
                </div>
                <div class="p-2 rounded-lg bg-slate-900/70 border border-slate-800/90 sm:col-span-2" title="${isMilestoneVms ? 'Milestone XProtect supports Live Database + Multi-Stage Archive tiering on RAID 5/6/10 arrays.' : 'Every Archiver role requires its own separate Windows volume(s), and each Windows volume is capped at ≤30 TB usable.'}">
                  <div class="text-[9px] font-mono uppercase text-purple-300">${isMilestoneVms ? `Live + Archive Tiering (${g.profile?.raidSupport || 'RAID 5/6/10'})` : `Windows Volumes (≤${g.maxVolumeSizeTb || 30}TB Cap • Isolated per Role)`}</div>
                  <div class="text-sm font-mono font-bold text-purple-300">${g.totalLogicalVolumes || 1} Volume${(g.totalLogicalVolumes || 1) === 1 ? '' : 's'} <span class="text-[10px] text-slate-400">(${g.volumesPerArchiverRole || 1} Volume(s) per ${isMilestoneVms ? 'Instance' : 'Role'})</span></div>
                  <div class="text-[9px] text-slate-400">${g.volumesPerServer || 1} Volume(s) per Server • ~${g.sizePerVolumeTb || g.usableTbPerArchiverRole} TB per Volume</div>
                </div>
              </div>
            </div>

            <!-- Hardware Spec & VMS Rule Alerts -->
            <div class="space-y-1.5 border-t border-slate-800/80 pt-2 text-[11px]">
              <div class="flex items-center justify-between text-slate-300 font-mono text-[10px]">
                <span>Minimum Specification: <strong class="text-white">${g.profile?.cpuSpec || ''} • ${g.profile?.ramGb || 16}GB RAM • ${g.profile?.nicSpec || '1 GbE'}</strong></span>
                <span>Daily: <strong class="text-sky-300">${vCalc.dailyStorageGb} GB/Day</strong></span>
              </div>
              ${(g.findings && g.findings.length > 0) ? g.findings.map(f => `
                <div class="px-2.5 py-1.5 rounded-lg text-[10px] font-medium flex items-start gap-1.5 ${f.severity === 'critical' ? 'bg-rose-950/70 border border-rose-700/70 text-rose-200' : f.severity === 'warning' ? 'bg-amber-950/70 border border-amber-700/70 text-amber-200' : 'bg-sky-950/70 border border-sky-700/70 text-sky-200'}">
                  <i data-lucide="${f.severity === 'critical' ? 'alert-octagon' : f.severity === 'warning' ? 'alert-triangle' : 'info'}" class="w-3.5 h-3.5 shrink-0 mt-0.5"></i>
                  <span>${f.text}</span>
                </div>
              `).join('') : `
                <div class="px-2.5 py-1 rounded-lg bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 text-[10px] flex items-center gap-1.5">
                  <i data-lucide="check-circle-2" class="w-3.5 h-3.5 shrink-0"></i>
                  <span>All ${isMilestoneVms ? 'Milestone XProtect 2026 R2 & Husky IVO throughput and storage' : 'Genetec 5.14 throughput, multi-role server limits, directory isolation, and Windows volume'} rules satisfied.</span>
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
                Selected Plan: <strong>${dp.totalDrives || 0}x ${dp.driveSizeTb || 16}TB</strong> = <strong>${dp.rawStorageTb || 0} TB Raw</strong> (${dp.usableStorageTb || 0} TB Usable • ${dp.totalVolumes30Tb || 1} Windows Volumes)
              </span>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse text-[11px] font-mono">
                <thead>
                  <tr class="border-b border-slate-800 text-[9px] uppercase text-slate-400">
                    <th class="py-1.5 px-2">Drive Size</th>
                    <th class="py-1.5 px-2">Total Drives</th>
                    <th class="py-1.5 px-2">Data + Parity</th>
                    <th class="py-1.5 px-2">Drives per Server</th>
                    <th class="py-1.5 px-2">Total Raw TB</th>
                    <th class="py-1.5 px-2">Usable TB (Efficiency %)</th>
                    <th class="py-1.5 px-2">Windows Volumes (≤30TB)</th>
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
                        <td class="py-1.5 px-2 text-sky-300">${opt.drivesPerServer} per Server</td>
                        <td class="py-1.5 px-2 text-white">${opt.rawStorageTb} TB</td>
                        <td class="py-1.5 px-2 text-emerald-400">${opt.usableStorageTb} TB <span class="text-slate-500">(${opt.efficiencyPct}%)</span></td>
                        <td class="py-1.5 px-2 text-purple-300" title="${opt.windowsVolumesPerRole} Windows Volume(s) per role × ${g.activeArchiverRoles} role(s) = ${opt.totalVolumes30Tb} separate Volumes (~${opt.sizePerVolumeTb} TB each)">
                          ${opt.totalVolumes30Tb} Volume${opt.totalVolumes30Tb === 1 ? '' : 's'} <span class="text-slate-400 text-[10px]">(${opt.windowsVolumesPerRole}/Role @ ${opt.sizePerVolumeTb}TB)</span>
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

        <!-- Turnkey Appliance & VMS Licensing Integration Bar (Genetec Streamvault vs Milestone Husky IVO) -->
        ${(() => {
          const showLicInline = Boolean(window.videoShowLicPanel);
          if (isMilestoneVms && typeof MilestoneLicensingSizer !== "undefined") {
            const mLicRes = MilestoneLicensingSizer.calculate(projectBOM);
            const hPlan = mLicRes.huskyPlan || {};
            const prim = hPlan.primaryAppliance;
            return `
              <div class="pt-2.5 border-t border-slate-800/90 flex flex-col gap-2.5">
                <div class="bg-sky-950/30 border border-sky-500/30 rounded-xl p-3 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                  <div class="flex flex-wrap items-center gap-3">
                    <div class="flex items-center gap-2">
                      <span class="px-2 py-0.5 rounded bg-sky-500/20 border border-sky-500/40 text-sky-300 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                        <i data-lucide="server" class="w-3 h-3"></i>
                        Husky IVO &amp; Milestone XProtect
                      </span>
                      <span class="text-xs font-bold text-white">
                        ${prim ? `${hPlan.primaryQty}x ${prim.model.replace('Milestone ', '')}` : 'Add Cameras to Size Husky IVO Appliance'}
                      </span>
                    </div>
                    ${prim ? `
                      <span class="text-[11px] text-slate-300 font-mono bg-slate-950/80 border border-slate-800 px-2 py-0.5 rounded-lg">
                        ${(hPlan.primaryQty * (prim.usableStorageTb || 0)).toFixed(1)} TB Usable (${prim.raidSupport}) &bull; ${hPlan.primaryQty * (prim.maxThroughputMbps || 0)} Mbps &bull; $${(hPlan.primaryQty * (prim.msrp || 0)).toLocaleString()} Hardware
                      </span>
                    ` : ''}
                    ${hPlan.analyticsAppliance ? `
                      <span class="text-[11px] text-emerald-300 font-mono bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded-lg">
                        + ${hPlan.analyticsQty}x ${hPlan.analyticsAppliance.sku} BriefCam Analytics
                      </span>
                    ` : ''}
                    <span class="text-[11px] text-sky-200 font-mono bg-sky-950/60 border border-sky-500/30 px-2.5 py-0.5 rounded-lg">
                      Edition: <strong>${mLicRes.editionInfo?.label || 'XProtect Corporate'}</strong> &bull; ${mLicRes.totalDeviceLicenses} Device Licenses + ${mLicRes.careYears}Y Care Plus = <strong>$${mLicRes.totalSoftwareMsrp.toLocaleString()}</strong> Software
                    </span>
                  </div>

                  <div class="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onclick="autoFitHuskyToBom()"
                      class="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                      title="Auto-fit the recommended Milestone Husky IVO Appliance(s) (150D / 350T / 350R / 700R / 1000R / 1800R) to the BOM"
                    >
                      <i data-lucide="server" class="w-3.5 h-3.5"></i>
                      <span>+ Auto-Fit Husky IVO</span>
                    </button>
                    <button
                      type="button"
                      onclick="addMilestoneLicensesToBom()"
                      class="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                      title="Add the calculated Milestone XProtect Base, Device Licenses, Care Plus, and Add-On licenses to the BOM"
                    >
                      <i data-lucide="key" class="w-3.5 h-3.5"></i>
                      <span>+ Add Milestone Licenses ($${mLicRes.totalSoftwareMsrp.toLocaleString()})</span>
                    </button>
                    <button
                      type="button"
                      onclick="window.videoShowLicPanel = !window.videoShowLicPanel; buildCalculatorStrip();"
                      class="px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${showLicInline ? 'bg-sky-500/20 border-sky-500/50 text-sky-200' : 'bg-slate-950 border-slate-700 text-slate-300 hover:text-white'}"
                    >
                      <i data-lucide="sliders" class="w-3.5 h-3.5"></i>
                      <span>${showLicInline ? 'Hide Milestone Builder' : 'Configure Milestone XProtect'}</span>
                    </button>
                  </div>
                </div>
                ${showLicInline ? renderMilestoneLicensingBuilderHtml(mLicRes, true) : ''}
              </div>
            `;
          }

          if (typeof GenetecLicensingSizer === "undefined") return "";
          const licRes = GenetecLicensingSizer.calculate(projectBOM);
          const svPlan = licRes.streamvaultPlan || {};
          const prim = svPlan.primaryAppliance;
          const tierLabels = {
            aio: "Streamvault AIO (≤32 Cameras)",
            standard: "Omnicast Standard (≤50 Cameras)",
            pro: "Omnicast Pro (≤100 Cameras)",
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
                      ${(svPlan.primaryQty * (prim.usableStorageTb || 0)).toFixed(1)} TB Usable (${prim.raidSupport}) &bull; ${svPlan.primaryQty * (prim.maxThroughputMbps || 0)} Mbps &bull; $${(svPlan.primaryQty * (prim.msrp || 0)).toLocaleString()} Hardware
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
                    Tier: <strong>${tierLabels[licRes.effectiveTier] || 'Enterprise'}</strong> &bull; ${licRes.cameraUnits} Camera Licenses + ${licRes.advantageYears}Y Advantage = <strong>$${licRes.totalSoftwareMsrp.toLocaleString()}</strong> Software
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
}
window.renderStorageCalculatorStudioHtml = renderStorageCalculatorStudioHtml;

function setVideoSizerParam(key, val) {
  if (key === "retentionDays") {
    videoRetentionDays = val; window.videoRetentionDays = val;
    if (typeof VideoStorageSizer !== "undefined") VideoStorageSizer.state.retentionDays = val;
  } else if (key === "vmsVendor") {
    videoVmsVendor = ["genetec", "milestone", "generic"].includes(val) ? val : "genetec";
    window.videoVmsVendor = videoVmsVendor;
    if (typeof VideoStorageSizer !== "undefined") VideoStorageSizer.state.vmsVendor = videoVmsVendor;
    if (videoVmsVendor === "milestone" || videoVmsVendor === "genetec") {
      activeVmsLicensingVendor = videoVmsVendor;
      window.activeVmsLicensingVendor = videoVmsVendor;
    }
  } else if (key === "milestoneProfile") {
    videoMilestoneProfile = val; window.videoMilestoneProfile = val;
    if (typeof VideoStorageSizer !== "undefined") VideoStorageSizer.state.milestoneProfile = val;
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
  } else if (key === "lowFpsUntilMotion") {
    videoLowFpsUntilMotion = Boolean(val); window.videoLowFpsUntilMotion = Boolean(val);
    if (typeof VideoStorageSizer !== "undefined") {
      VideoStorageSizer.state.lowFpsUntilMotion = Boolean(val);
      if (Boolean(val) && Array.isArray(VideoStorageSizer.state.cameraGroups)) {
        VideoStorageSizer.state.cameraGroups.forEach(grp => {
          if ((Number(grp.motionDutyPct) || 100) >= 100) {
            grp.motionDutyPct = 50;
          }
          grp.lowFpsUntilMotion = true;
        });
      } else if (!Boolean(val) && Array.isArray(VideoStorageSizer.state.cameraGroups)) {
        VideoStorageSizer.state.cameraGroups.forEach(grp => {
          grp.lowFpsUntilMotion = false;
        });
      }
    }
  } else if (key === "idleFps") {
    const cleanIdleFps = Math.max(1, Math.min(15, Number(val) || 2));
    videoIdleFps = cleanIdleFps; window.videoIdleFps = cleanIdleFps;
    if (typeof VideoStorageSizer !== "undefined") {
      VideoStorageSizer.state.idleFps = cleanIdleFps;
      if (Array.isArray(VideoStorageSizer.state.cameraGroups)) {
        VideoStorageSizer.state.cameraGroups.forEach(grp => {
          grp.idleFps = cleanIdleFps;
        });
      }
    }
  } else if (key === "failoverStructure") {
    const normStruct = ["none", "ring", "dedicated"].includes(val) ? val : "none";
    videoFailoverStructure = normStruct; window.videoFailoverStructure = normStruct;
    if (typeof VideoStorageSizer !== "undefined") VideoStorageSizer.state.failoverStructure = normStruct;
    if (typeof window !== "undefined") {
      window.genetecLicensingConfig = window.genetecLicensingConfig || {};
      if (normStruct !== "none") {
        window.genetecLicensingConfig.enableVideoFailover = true;
        if (!window.genetecLicensingConfig.failoverMode || window.genetecLicensingConfig.failoverMode === "none") {
          window.genetecLicensingConfig.failoverMode = "all";
        }
      }
    }
  } else if (key === "ringNodeCount") {
    const cleanRing = Math.max(0, parseInt(val, 10) || 0);
    videoRingNodeCount = cleanRing; window.videoRingNodeCount = cleanRing;
    if (typeof VideoStorageSizer !== "undefined") VideoStorageSizer.state.ringNodeCount = cleanRing;
  } else if (key === "dedicatedPrimaryCount") {
    const cleanPrim = Math.max(0, parseInt(val, 10) || 0);
    videoDedicatedPrimaryCount = cleanPrim; window.videoDedicatedPrimaryCount = cleanPrim;
    if (typeof VideoStorageSizer !== "undefined") VideoStorageSizer.state.dedicatedPrimaryCount = cleanPrim;
  } else if (key === "dedicatedFailoverCount") {
    const cleanDed = Math.max(1, parseInt(val, 10) || 1);
    videoDedicatedFailoverCount = cleanDed; window.videoDedicatedFailoverCount = cleanDed;
    if (typeof VideoStorageSizer !== "undefined") VideoStorageSizer.state.dedicatedFailoverCount = cleanDed;
  } else if (key === "maxSimultaneousFailures") {
    const cleanSim = Math.max(1, parseInt(val, 10) || 1);
    videoMaxSimultaneousFailures = cleanSim; window.videoMaxSimultaneousFailures = cleanSim;
    if (typeof VideoStorageSizer !== "undefined") VideoStorageSizer.state.maxSimultaneousFailures = cleanSim;
  } else if (key === "failoverBufferMode") {
    const numMode = Number(val);
    if (numMode < 0) {
      videoFailoverIncludeStorageBuffer = false; window.videoFailoverIncludeStorageBuffer = false;
      videoFailoverRetentionDays = 0; window.videoFailoverRetentionDays = 0;
      if (typeof VideoStorageSizer !== "undefined") {
        VideoStorageSizer.state.failoverIncludeStorageBuffer = false;
        VideoStorageSizer.state.failoverRetentionDays = 0;
      }
    } else {
      videoFailoverIncludeStorageBuffer = true; window.videoFailoverIncludeStorageBuffer = true;
      videoFailoverRetentionDays = Math.max(0, numMode || 0); window.videoFailoverRetentionDays = Math.max(0, numMode || 0);
      if (typeof VideoStorageSizer !== "undefined") {
        VideoStorageSizer.state.failoverIncludeStorageBuffer = true;
        VideoStorageSizer.state.failoverRetentionDays = Math.max(0, numMode || 0);
      }
    }
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
    heads: last.heads || 1,
    resolutionMp: last.resolutionMp || 4,
    fps: last.fps || 15,
    idleFps: last.idleFps || videoIdleFps || 2,
    lowFpsUntilMotion: Boolean(last.lowFpsUntilMotion),
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
  if (field === "lowFpsUntilMotion" && Boolean(val) && (Number(groups[index].motionDutyPct) || 100) >= 100) {
    groups[index].motionDutyPct = 50;
  }
  // If the column's "All Same" checkbox is active, propagate this setting to all camera groups
  if (videoSyncAllColumns && videoSyncAllColumns[field]) {
    groups.forEach(g => {
      g[field] = val;
      if (field === "lowFpsUntilMotion" && Boolean(val) && (Number(g.motionDutyPct) || 100) >= 100) {
        g.motionDutyPct = 50;
      }
    });
  }
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
  if (typeof updateProjectHealthUI === "function") updateProjectHealthUI();
}
window.updateVideoCameraGroup = updateVideoCameraGroup;

function toggleVideoColumnSync(field, checked) {
  const isChecked = Boolean(checked);
  if (videoSyncAllColumns && field in videoSyncAllColumns) {
    videoSyncAllColumns[field] = isChecked;
  }
  if (isChecked) {
    const groups = ensureEditableCameraGroups();
    if (groups.length > 0) {
      const masterVal = groups[0][field];
      groups.forEach(g => {
        if (masterVal !== undefined) g[field] = masterVal;
      });
    }
  }
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
  if (typeof updateProjectHealthUI === "function") updateProjectHealthUI();
}
window.toggleVideoColumnSync = toggleVideoColumnSync;

function toggleAllCameraGroupsLowFps(checked) {
  const isChecked = Boolean(checked);
  videoLowFpsUntilMotion = isChecked;
  window.videoLowFpsUntilMotion = isChecked;
  if (videoSyncAllColumns) videoSyncAllColumns.lowFpsUntilMotion = isChecked;
  if (typeof VideoStorageSizer !== "undefined") {
    VideoStorageSizer.state.lowFpsUntilMotion = isChecked;
  }
  const groups = ensureEditableCameraGroups();
  groups.forEach(g => {
    g.lowFpsUntilMotion = isChecked;
    if (g.idleFps === undefined) g.idleFps = videoIdleFps || 2;
    if (isChecked && (Number(g.motionDutyPct) || 100) >= 100) {
      g.motionDutyPct = 50;
    }
  });
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
  if (typeof updateProjectHealthUI === "function") updateProjectHealthUI();
}
window.toggleAllCameraGroupsLowFps = toggleAllCameraGroupsLowFps;

function setAllCameraGroupsIdleFps(idleFpsVal) {
  const cleanIdle = Math.max(1, Math.min(15, Number(idleFpsVal) || 2));
  videoIdleFps = cleanIdle;
  window.videoIdleFps = cleanIdle;
  if (typeof VideoStorageSizer !== "undefined") {
    VideoStorageSizer.state.idleFps = cleanIdle;
  }
  const groups = ensureEditableCameraGroups();
  groups.forEach(g => {
    g.idleFps = cleanIdle;
  });
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
  if (typeof updateProjectHealthUI === "function") updateProjectHealthUI();
}
window.setAllCameraGroupsIdleFps = setAllCameraGroupsIdleFps;

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
    lowFpsUntilMotion: videoLowFpsUntilMotion,
    idleFps: videoIdleFps,
    motionDutyCycle: videoMotionDuty,
    sceneActivity: videoSceneActivity,
    raidType: videoRaidType,
    preferredDriveSizeTb: videoPreferredDriveTb,
    vmsVendor: videoVmsVendor,
    genetecProfile: videoGenetecProfile,
    milestoneProfile: videoMilestoneProfile,
    archiverRolesCount: videoArchiverRoles,
    serverCountOverride: videoServerCount,
    encryptionCerts: videoEncryptionCerts,
    softwareMotionDetection: videoSoftwareMotion,
    failoverStructure: videoFailoverStructure,
    ringNodeCount: videoRingNodeCount,
    dedicatedPrimaryCount: videoDedicatedPrimaryCount,
    dedicatedFailoverCount: videoDedicatedFailoverCount,
    maxSimultaneousFailures: videoMaxSimultaneousFailures,
    failoverRetentionDays: videoFailoverRetentionDays,
    failoverIncludeStorageBuffer: videoFailoverIncludeStorageBuffer
  });

  const fo = vCalc.failover || { structure: "none" };
  const targetTB = Math.max(16, vCalc.requiredUsableTB || 16);
  const targetMbps = Math.max(50, vCalc.peakIngressMbps || 50);
  const isMilestone = vCalc.vmsVendor === "milestone";
  const vmsVerify = isMilestone ? (vCalc.milestone || vCalc.genetec || {}) : (vCalc.genetec || {});
  const minArchiverServers = vmsVerify.recommendedArchiverServers || 1;

  const allServers = (typeof SERVERS_DATABASE !== "undefined")
    ? SERVERS_DATABASE.filter(s => s.serverType !== "access_security_host" && s.serverType !== "analytics_server" && s.serverType !== "cloud_gateway")
    : [];
  if (allServers.length === 0) return;

  // Prefer Milestone Husky IVO when Milestone is selected, or non-Milestone when Genetec/Generic is selected
  const vendorFiltered = isMilestone
    ? allServers.filter(s => String(s.vendor || "").toLowerCase().includes("milestone"))
    : allServers.filter(s => !String(s.vendor || "").toLowerCase().includes("milestone"));
  const servers = vendorFiltered.length > 0 ? vendorFiltered : allServers;

  // Sort NVRs ascending by usableStorageTb
  const getCap = s => Number(s.usableStorageTb ?? s.usableStorageTB ?? s.rawStorageTb ?? s.rawStorageTB ?? 0);
  const getBw = s => Number(s.maxIngestBandwidthMbps ?? s.maxThroughputMbps ?? 450);
  const sorted = [...servers].sort((a, b) => getCap(a) - getCap(b));

  if (fo.structure === "ring" && (fo.ringNodes || 0) >= 2 && typeof addToBOM === "function") {
    const ringNodes = fo.ringNodes;
    const perNodeTb = Math.max(8, fo.totalUsableTbPerRingServer || Math.ceil(targetTB / ringNodes));
    const survivorMbps = Math.max(50, fo.failoverMbpsOnSurvivor || targetMbps);
    const chosen = sorted.find(s => getCap(s) >= perNodeTb && getBw(s) >= survivorMbps) || sorted[sorted.length - 1];
    if (chosen) {
      addToBOM(chosen.id || chosen.sku, ringNodes);
      if (typeof showToast === "function") {
        showToast(`Auto-Fitted Ring Failover (${fo.ringChainText}): ${ringNodes}x ${chosen.model} (${getCap(chosen)} TB & ${getBw(chosen)} Mbps/node) for 2x survivor load.`, "success");
      }
    }
  } else if (fo.structure === "dedicated" && (fo.dedicatedFailoverServers || 0) >= 1 && typeof addToBOM === "function") {
    const totalCount = Math.max(2, fo.totalServersRequired || 2);
    const perNodeTb = Math.max(8, fo.primaryUsableTbPerServer || 16, fo.failoverBufferTbPerServer || 0);
    const perNodeMbps = Math.max(50, fo.normalMbpsPerServer || targetMbps, fo.failoverMbpsOnSurvivor || 0);
    const chosen = sorted.find(s => getCap(s) >= perNodeTb && getBw(s) >= perNodeMbps) || sorted[sorted.length - 1];
    if (chosen) {
      addToBOM(chosen.id || chosen.sku, totalCount);
      if (typeof showToast === "function") {
        showToast(`Auto-Fitted Dedicated Failover (${fo.primaryServerCount} Main + ${fo.dedicatedFailoverServers} Shared Standby = ${totalCount} Servers): ${totalCount}x ${chosen.model}.`, "success");
      }
    }
  } else {
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

function toggleGenetecFeature(toggleKey, enabled) {
  if (typeof window.genetecLicensingConfig !== "object" || !window.genetecLicensingConfig) {
    window.genetecLicensingConfig = (typeof GenetecLicensingSizer !== "undefined")
      ? GenetecLicensingSizer.getDefaultConfig()
      : {};
  }
  const cfg = window.genetecLicensingConfig;
  const isOn = Boolean(enabled);
  cfg[toggleKey] = isOn;

  // When turning a feature toggle ON, seed a sensible default if all sub-counts are currently 0
  if (isOn) {
    if (toggleKey === "enableEncodersDvr" && !(cfg.analogEncoderChannels > 0) && !(cfg.dvrNvrChannels > 0)) {
      cfg.analogEncoderChannels = 4;
    } else if (toggleKey === "enableSipelia" && !(cfg.sipIntercomsOverride > 0) && !(cfg.sipTrunks > 0) && !(cfg.sipPublicAddress > 0)) {
      cfg.sipIntercomsOverride = 1;
    } else if (toggleKey === "enableLpr" && !(cfg.lprCamerasOverride > 0)) {
      cfg.lprCamerasOverride = 1;
    } else if (toggleKey === "enableVideoFailover" && (!cfg.failoverMode || cfg.failoverMode === "none") && !(cfg.standbyServerCount > 0)) {
      cfg.failoverMode = "all";
    } else if (toggleKey === "enableIntrusionPanels" && !(cfg.intrusionPanels > 0)) {
      cfg.intrusionPanels = 1;
    } else if (
      toggleKey === "enableBiometricsIdentity" &&
      !(cfg.supremaDevices > 0) &&
      !(cfg.supremaPluginServers > 0) &&
      !(cfg.supremaEndpoints > 0) &&
      !cfg.idemiaMorphoEnabled &&
      !(cfg.controlIdBridgeServers > 0) &&
      !(cfg.princetonIdentityServers > 0) &&
      !(cfg.idScannerClients > 0) &&
      !(cfg.xpressEntryServers > 0)
    ) {
      cfg.supremaDevices = 10;
      cfg.supremaPluginServers = 1;
    } else if (
      toggleKey === "enableCardholderSync" &&
      !(cfg.globalCardholderSystems > 0) &&
      !(cfg.cardSyncDataSources > 0)
    ) {
      cfg.globalCardholderSystems = 1;
      cfg.cardSyncDataSources = 2;
    } else if (
      toggleKey === "enableClearId" &&
      !(cfg.clearIdIdentities > 0) &&
      !(cfg.clearIdKiosks > 0)
    ) {
      cfg.clearIdIdentities = 500;
    } else if (toggleKey === "enableKeyManagement" && !(cfg.medecoXtLocks > 0) && !(cfg.keyCabinetCount > 0)) {
      cfg.medecoXtLocks = 10;
    } else if (
      toggleKey === "enableBuildingPsim" &&
      !(cfg.winGuardNodes > 0) &&
      !(cfg.elevatorDispatchSystems > 0) &&
      !(cfg.opcServerSystems > 0) &&
      !(cfg.missionControlOperators > 0)
    ) {
      cfg.winGuardNodes = 1;
    } else if (
      toggleKey === "enableRsa" &&
      (!cfg.rsaTier || cfg.rsaTier === "none") &&
      !(cfg.rsaShortRangeSensors > 0) &&
      !(cfg.rsaRadars > 0) &&
      !(cfg.rsaFenceControllers > 0) &&
      !(cfg.swmRpmUnits > 0)
    ) {
      cfg.rsaShortRangeSensors = 1;
    } else if (toggleKey === "enableFederation" && !(cfg.federationSites > 0) && !(cfg.federationSmallSites > 0)) {
      cfg.federationSites = 1;
    } else if (toggleKey === "enableIiot" && (!cfg.iiotMode || cfg.iiotMode === "none")) {
      cfg.iiotMode = "devices";
      cfg.iiotDevices = Math.max(1, cfg.iiotDevices || 1);
    } else if (toggleKey === "enableCloudServices" && !(cfg.cloudArchiveTb > 0) && !(cfg.clearanceCameras > 0)) {
      cfg.cloudArchiveTb = 2;
    }
  }

  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
  if (typeof updateProjectHealthUI === "function") updateProjectHealthUI();
}
window.toggleGenetecFeature = toggleGenetecFeature;

function toggleGenetecPartnerSdk(sdkKey, checked, defaultQty = 1) {
  if (typeof window.genetecLicensingConfig !== "object" || !window.genetecLicensingConfig) {
    window.genetecLicensingConfig = (typeof GenetecLicensingSizer !== "undefined")
      ? GenetecLicensingSizer.getDefaultConfig()
      : {};
  }
  const cfg = window.genetecLicensingConfig;
  if (typeof cfg.selectedPartnerSdks !== "object" || !cfg.selectedPartnerSdks) {
    cfg.selectedPartnerSdks = {};
  }
  if (checked) {
    cfg.enablePartnerSdks = true;
    cfg.selectedPartnerSdks[sdkKey] = Math.max(1, parseInt(defaultQty, 10) || 1);
  } else {
    delete cfg.selectedPartnerSdks[sdkKey];
    if (cfg.partnerSdkKey === sdkKey) {
      cfg.partnerSdkKey = "none";
    }
  }
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
  if (typeof updateProjectHealthUI === "function") updateProjectHealthUI();
}
window.toggleGenetecPartnerSdk = toggleGenetecPartnerSdk;

function setGenetecPartnerSdkQty(sdkKey, qty) {
  if (typeof window.genetecLicensingConfig !== "object" || !window.genetecLicensingConfig) {
    window.genetecLicensingConfig = (typeof GenetecLicensingSizer !== "undefined")
      ? GenetecLicensingSizer.getDefaultConfig()
      : {};
  }
  const cfg = window.genetecLicensingConfig;
  if (typeof cfg.selectedPartnerSdks !== "object" || !cfg.selectedPartnerSdks) {
    cfg.selectedPartnerSdks = {};
  }
  const n = Math.max(0, parseInt(qty, 10) || 0);
  if (n > 0) {
    cfg.enablePartnerSdks = true;
    cfg.selectedPartnerSdks[sdkKey] = n;
  } else {
    delete cfg.selectedPartnerSdks[sdkKey];
  }
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
  if (typeof updateProjectHealthUI === "function") updateProjectHealthUI();
}
window.setGenetecPartnerSdkQty = setGenetecPartnerSdkQty;

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
    "genetec-sy-e-1gchm", "genetec-sy-e-1gchmstu",
    "genetec-autovu-base", "genetec-autovu-1shp",
    "genetec-sipelia-base", "genetec-sipelia-1sip-std", "genetec-sipelia-1sip-adv",
    "genetec-adv-sip-s-1y", "genetec-adv-sip-s-3y", "genetec-adv-sip-s-5y",
    "genetec-adv-sip-a-1y", "genetec-adv-sip-a-3y", "genetec-adv-sip-a-5y",
    "genetec-sipelia-1sip", "genetec-sipelia-1trunk", "genetec-sipelia-1pa",
    "genetec-intrusion-1ap", "genetec-intrusion-dmp", "genetec-intrusion-dsc",
    "genetec-intrusion-honeywell", "genetec-intrusion-bosch-map5000", "genetec-intrusion-vanderbilt-spc",
    "genetec-gsc-1sdk", "genetec-sdk-lsp-netlink", "genetec-sdk-amg-ndm", "genetec-sdk-allied-streamconnect",
    "genetec-sdk-hid-is", "genetec-sdk-schlage-wifilock", "genetec-sdk-aa-accentra",
    "genetec-sdk-alcatraz-rock", "genetec-sdk-raptor-connect", "genetec-sdk-omnilert-gundetect",
    "genetec-sdk-senstar-nms", "genetec-sdk-commend-duetto",
    "genetec-sdk-suprema-biostar", "genetec-sdk-controlid-idbridge", "genetec-sdk-princeton-identity",
    "genetec-sdk-corsight-ai", "genetec-sdk-briefcam", "genetec-sdk-xpressentry", "genetec-sdk-advancis-winguard",
    "genetec-plugin-card-sync", "genetec-plugin-morpho-biometrics", "genetec-plugin-idscanner",
    "genetec-plugin-medeco-base", "genetec-plugin-offlinelock-1l",
    "genetec-clearid-id-1y-t1", "genetec-clearid-id-3y-t1", "genetec-clearid-id-5y-t1",
    "genetec-clearid-id-1y-t2", "genetec-clearid-id-3y-t2", "genetec-clearid-id-5y-t2",
    "genetec-clearid-id-1y-t3", "genetec-clearid-id-3y-t3", "genetec-clearid-id-5y-t3",
    "genetec-clearid-id-1y-t4", "genetec-clearid-id-3y-t4", "genetec-clearid-id-5y-t4",
    "genetec-clearid-kiosk-1y", "genetec-clearid-kiosk-3y", "genetec-clearid-kiosk-5y",
    "genetec-plugin-elevator-dispatch", "genetec-plugin-opc-server", "genetec-plugin-keycabinet-base",
    "genetec-plugin-keycabinet-1cab",
    "genetec-adv-mc-1opp-1y", "genetec-adv-mc-1opp-3y", "genetec-adv-mc-1opp-5y",
    "genetec-rsa-standard", "genetec-rsa-pro", "genetec-rsa-ent",
    "genetec-rsa-1srs", "genetec-rsa-1rad", "genetec-rsa-1fen",
    "genetec-rsa-1km", "genetec-rsa-10km", "genetec-rsa-100km", "genetec-plugin-swm-rpmii",
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

  const genetecCatalogSkus = new Set(items.map(li => li.sku).filter(Boolean));
  if (Array.isArray(projectBOM)) {
    for (let i = projectBOM.length - 1; i >= 0; i--) {
      const bItem = projectBOM[i]?.item || projectBOM[i];
      if (!bItem) continue;
      const isGenetecVms = genetecCatalogIds.has(bItem.id) ||
        genetecCatalogSkus.has(bItem.sku) ||
        (bItem.vendor === "Genetec" && (bItem.category === "vms_software" || String(bItem.role || "").includes("License") || String(bItem.role || "").includes("Maintenance")));
      if (isGenetecVms) {
        projectBOM.splice(i, 1);
      }
    }
  }

  items.forEach(li => {
    if (li.catalogId && li.qty > 0) {
      addToBOM(li.catalogId, li.qty);
    }
  });

  if (typeof updateBOMView === "function") updateBOMView();
  if (typeof updateProjectHealthUI === "function") updateProjectHealthUI();
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
  const mrSpec = licRes.multiRoleServerSpec || {};
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
                ${needsSqlStd ? 'Database: Microsoft SQL Server Standard ($1,418 • Full Core Failover)' : 'Database: Microsoft SQL Server 2025 Express (50 GB Cap • Included Default, Not on BOM)'}
              </span>
              <a href="Datasheets/Genetec/ProductCompatability.pdf" target="_blank" class="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold flex items-center gap-1 transition">
                <i data-lucide="file-text" class="w-3 h-3 text-indigo-400"></i>
                <span>Product Compatibility</span>
              </a>
              <a href="Datasheets/Genetec/SystemRequirements.pdf" target="_blank" class="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold flex items-center gap-1 transition">
                <i data-lucide="file-text" class="w-3 h-3 text-purple-400"></i>
                <span>System Requirements</span>
              </a>
              <a href="Datasheets/Genetec/SupportedPlugins.pdf" target="_blank" class="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold flex items-center gap-1 transition">
                <i data-lucide="plug" class="w-3 h-3 text-emerald-400"></i>
                <span>Supported Plugins</span>
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
        <!-- Card 1: Main System — Base Package, Core Failover, Clients, Federation & Global Cardholder / Card Sync -->
        <div class="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3 space-y-2">
          <div class="text-[10px] font-bold uppercase tracking-wider text-indigo-400 flex items-center justify-between">
            <span>1. Main System, Core, Federation &amp; Card Sync</span>
            <span class="font-mono text-emerald-400">${needsSqlStd ? 'SQL Standard ($1,418)' : 'SQL 2025 Express (50 GB)'}</span>
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
            <label class="text-[10px] text-slate-400 block mb-1" title="Microsoft SQL Server 2025 Express (50 GB Database Cap, Included Default, omitted from BOM) stays in play for None and Directory Only (Backup and Restore). Automatically switches to Microsoft SQL Server Standard ($1,418) only when Core Failover is set to Full.">
              Core Failover &amp; Microsoft SQL Server Edition:
            </label>
            <select onchange="setGenetecLicParam('coreFailover', this.value)" class="w-full bg-slate-900 border ${needsSqlStd ? 'border-amber-500/60 text-amber-300' : 'border-emerald-500/50 text-emerald-300'} rounded-lg px-2 py-1.5 text-xs font-bold focus:outline-none">
              <option value="none" ${coreFailover === 'none' ? 'selected' : ''}>None — Microsoft SQL Server 2025 Express (50 GB Cap • Not Listed on BOM)</option>
              <option value="directory_only" ${coreFailover === 'directory_only' ? 'selected' : ''}>Directory Only (Backup and Restore) — SQL 2025 Express (50 GB Cap • Not on BOM)</option>
              <option value="full" ${coreFailover === 'full' ? 'selected' : ''}>Full (Core + Database Failover) — Upgrades to SQL Server Standard ($1,418)</option>
            </select>
          </div>
          <div class="grid grid-cols-3 gap-2 pt-1 border-t border-slate-800/80">
            <div>
              <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Security Desk Operator Workstation Connections (25 included in Standard Base; Unlimited Site Login License included in Enterprise Base)">
                Workstations:
              </label>
              <input type="number" min="1" max="500" value="${licRes.workstationClients}" onchange="setGenetecLicParam('workstationClients', Math.max(1, parseInt(this.value,10)||5))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-white" />
            </div>
            <div>
              <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Genetec Mobile Application Connections ($250 per concurrent user via GSC-1MobileU, or $10,000 Unlimited Site License via GSC-1MobileSTU at 40+ users)">
                Mobile Users:
              </label>
              <input type="number" min="0" max="500" value="${licRes.mobileClients}" onchange="setGenetecLicParam('mobileClients', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-sky-300" />
            </div>
            <div>
              <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Security Center Web Client Connections ($200 per user via GSC-1WU; included at $0.00 in Enterprise Site Login License)">
                Web Clients:
              </label>
              <input type="number" min="0" max="500" value="${licRes.webClients || 0}" onchange="setGenetecLicParam('webClients', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-sky-300" />
            </div>
          </div>

          <!-- Feature Toggle: Multi-Site Security Center Federation (Moved to Main System & Core) -->
          <div class="rounded-lg border ${licRes.enableFederation ? 'border-indigo-500/40 bg-indigo-950/20' : 'border-slate-800/90 bg-slate-900/50'} p-2 space-y-1.5 transition-all">
            <div class="flex items-center justify-between gap-2">
              <label class="flex items-center gap-2 cursor-pointer select-none flex-1">
                <input type="checkbox" ${licRes.enableFederation ? 'checked' : ''} onchange="toggleGenetecFeature('enableFederation', this.checked)" class="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-0" />
                <span class="text-[11px] font-bold ${licRes.enableFederation ? 'text-indigo-300' : 'text-slate-300'}">Multi-Site Security Center Federation</span>
              </label>
              <span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${licRes.enableFederation ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40' : 'bg-slate-800 text-slate-400'}">${licRes.enableFederation ? 'ON' : 'OFF'}</span>
            </div>
            ${licRes.enableFederation ? `
              <div class="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
                <div>
                  <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Federated Remote Security Center Sites with Over 20 Entities (GSC-1SCFED @ $1,000 per site)">
                    Federated Sites (&gt;20 Entities • $1k):
                  </label>
                  <input type="number" min="0" max="100" value="${cfg.federationSites || 0}" onchange="setGenetecLicParam('federationSites', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-white" />
                </div>
                <div>
                  <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Federated Remote Security Center Sites with 20 Entities or Fewer (GSC-1SCFED-20 @ $600 per site)">
                    Small Federated Sites (&le;20 • $600):
                  </label>
                  <input type="number" min="0" max="100" value="${cfg.federationSmallSites || 0}" onchange="setGenetecLicParam('federationSmallSites', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-white" />
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Feature Toggle: Global Cardholder Synchronizer & Card Synchronization Plugin (Moved to Main System & Core) -->
          <div class="rounded-lg border ${licRes.enableCardholderSync ? 'border-emerald-500/40 bg-emerald-950/20' : 'border-slate-800/90 bg-slate-900/50'} p-2 space-y-1.5 transition-all">
            <div class="flex items-center justify-between gap-2">
              <label class="flex items-center gap-2 cursor-pointer select-none flex-1">
                <input type="checkbox" ${licRes.enableCardholderSync ? 'checked' : ''} onchange="toggleGenetecFeature('enableCardholderSync', this.checked)" class="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0" />
                <span class="text-[11px] font-bold ${licRes.enableCardholderSync ? 'text-emerald-300' : 'text-slate-300'}">Global Cardholder Synchronizer &amp; Card Sync Plugin</span>
              </label>
              <span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${licRes.enableCardholderSync ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'}">${licRes.enableCardholderSync ? 'ON' : 'OFF'}</span>
            </div>
            ${licRes.enableCardholderSync ? `
              <div class="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
                <div>
                  <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Global Cardholder Synchronizer / Management — Synchronizes cardholders & credentials across independent Security Center systems (GSC-Sy-E-1GCHM @ $1,950/remote system; Unlimited Site License GSC-SY-E-1GCHMSTU @ $78,000 at 40+ systems)">
                    Global Cardholder Systems ($1.95k):
                  </label>
                  <input type="number" min="0" max="200" value="${licRes.globalCardholderSystems || 0}" onchange="setGenetecLicParam('globalCardholderSystems', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-emerald-300" />
                </div>
                <div>
                  <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Card Synchronization Plugin External HR/SQL/CSV/Oracle Data Sources (GSC-1PSINGLECARD @ $4,000 per 2 data sources)">
                    Card Sync Data Sources ($4k/2):
                  </label>
                  <input type="number" min="0" max="50" value="${licRes.cardSyncDataSources || 0}" onchange="setGenetecLicParam('cardSyncDataSources', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-emerald-300" />
                </div>
              </div>
            ` : ''}
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

        <!-- Card 2: Omnicast Video, Sipelia Intercom, AutoVu LPR & Cloud Archives -->
        <div class="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3 space-y-2">
          <div class="text-[10px] font-bold uppercase tracking-wider text-sky-400 flex items-center justify-between">
            <span>2. Video, Sipelia Intercom, LPR &amp; Cloud Archives</span>
            <span class="font-mono text-white">${licRes.cameraUnits} IP Cameras ($${licRes.effectiveTier === 'aio' ? 120 : licRes.effectiveTier === 'standard' ? 200 : 325} per Camera)</span>
          </div>

          <!-- Feature Toggle: Sipelia Intercom (Standard / Advanced / Unified) -->
          <div class="rounded-lg border ${licRes.enableSipelia ? 'border-sky-500/40 bg-sky-950/20' : 'border-slate-800/90 bg-slate-900/50'} p-2 space-y-2 transition-all">
            <div class="flex items-center justify-between gap-2">
              <label class="flex items-center gap-2 cursor-pointer select-none flex-1">
                <input type="checkbox" ${licRes.enableSipelia ? 'checked' : ''} onchange="toggleGenetecFeature('enableSipelia', this.checked)" class="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-0" />
                <span class="text-[11px] font-bold ${licRes.enableSipelia ? 'text-sky-300' : 'text-slate-300'}">Sipelia SIP Intercom (Standard / Advanced / Unified)</span>
              </label>
              <div class="flex items-center gap-1.5">
                <a href="Datasheets/Genetec/Plugins/EN.Sipelia User Guide 2.14.0.0.pdf" target="_blank" class="text-[9px] text-sky-400 hover:underline">2.14 PDF</a>
                <span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${licRes.enableSipelia ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' : 'bg-slate-800 text-slate-400'}">${licRes.enableSipelia ? 'ON' : 'OFF'}</span>
              </div>
            </div>
            ${licRes.enableSipelia ? `
              <div class="space-y-1.5 pt-1 border-t border-slate-800/80">
                <select onchange="setGenetecLicParam('sipeliaMode', this.value)" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[10px] font-bold text-sky-300 focus:outline-none">
                  <option value="unified_513" ${licRes.sipeliaMode === 'unified_513' ? 'selected' : ''}>Unified SC 5.11–5.14 — GSC-SIPELIA-1SIP ($250/station • Base, Failover, Recording, Trunks &amp; PA Included)</option>
                  <option value="standard" ${licRes.sipeliaMode === 'standard' ? 'selected' : ''}>Sipelia Standard (Legacy) — GSC-Sipelia-Base ($1,500) + GSC-Sipelia-1SIP-STD ($160/station)</option>
                  <option value="advanced" ${licRes.sipeliaMode === 'advanced' ? 'selected' : ''}>Sipelia Advanced (Legacy) — Base ($1,500) + 1SIP-STD ($160) + 1SIP-ADV ($100 Failover &amp; Recording)</option>
                </select>
                <div class="grid grid-cols-3 gap-2">
                  <div>
                    <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Sipelia SIP Intercom Station Count">
                      SIP Stations:
                    </label>
                    <input type="number" min="0" max="500" value="${licRes.effectiveSipIntercoms || 0}" onchange="setGenetecLicParam('sipIntercomsOverride', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-sky-300" />
                  </div>
                  <div>
                    <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Sipelia SIP Trunk Connections to external VoIP PBX or Intercom Server (GSC-Sipelia-1Trunk $550)">
                      SIP Trunks ($550):
                    </label>
                    <input type="number" min="0" max="100" value="${licRes.sipTrunks || 0}" onchange="setGenetecLicParam('sipTrunks', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-sky-300" />
                  </div>
                  <div>
                    <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Sipelia Public Address (PA) Voice Paging Connections (GSC-SIPELIA-1PA $550)">
                      Public Address:
                    </label>
                    <input type="number" min="0" max="100" value="${licRes.sipPublicAddress || 0}" onchange="setGenetecLicParam('sipPublicAddress', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-sky-300" />
                  </div>
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Feature Toggle: AutoVu Fixed License Plate Recognition (LPR) -->
          <div class="rounded-lg border ${licRes.enableLpr ? 'border-amber-500/40 bg-amber-950/20' : 'border-slate-800/90 bg-slate-900/50'} p-2 space-y-1.5 transition-all">
            <div class="flex items-center justify-between gap-2">
              <label class="flex items-center gap-2 cursor-pointer select-none flex-1">
                <input type="checkbox" ${licRes.enableLpr ? 'checked' : ''} onchange="toggleGenetecFeature('enableLpr', this.checked)" class="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-0" />
                <span class="text-[11px] font-bold ${licRes.enableLpr ? 'text-amber-300' : 'text-slate-300'}">AutoVu Fixed License Plate Recognition (LPR)</span>
              </label>
              <span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${licRes.enableLpr ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-400'}">${licRes.enableLpr ? `${licRes.effectiveLprCameras} Camera(s)` : 'OFF'}</span>
            </div>
            ${licRes.enableLpr ? `
              <div class="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
                <label class="text-[10px] text-slate-300 font-semibold" title="AutoVu Fixed Sharp License Plate Recognition Camera Connections (GSC-Av-S-1SHP $500 + Advantage Maintenance; AutoVu Standard Base is included at $0.00)">
                  Fixed Sharp LPR Camera Connections (<code class="text-amber-300">GSC-Av-S-1SHP</code> @ $500):
                </label>
                <input type="number" min="0" max="200" value="${licRes.effectiveLprCameras}" onchange="setGenetecLicParam('lprCamerasOverride', Math.max(0, parseInt(this.value,10)||0))" class="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-amber-300" />
              </div>
            ` : ''}
          </div>

          <!-- Feature Toggle: Analog Video Encoders & 3rd-Party DVR/NVR -->
          <div class="rounded-lg border ${licRes.enableEncodersDvr ? 'border-sky-500/40 bg-sky-950/20' : 'border-slate-800/90 bg-slate-900/50'} p-2 space-y-1.5 transition-all">
            <div class="flex items-center justify-between gap-2">
              <label class="flex items-center gap-2 cursor-pointer select-none flex-1">
                <input type="checkbox" ${licRes.enableEncodersDvr ? 'checked' : ''} onchange="toggleGenetecFeature('enableEncodersDvr', this.checked)" class="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-0" />
                <span class="text-[11px] font-bold ${licRes.enableEncodersDvr ? 'text-sky-300' : 'text-slate-300'}">Analog Video Encoders &amp; 3rd-Party DVR/NVR Channels</span>
              </label>
              <span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${licRes.enableEncodersDvr ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' : 'bg-slate-800 text-slate-400'}">${licRes.enableEncodersDvr ? 'ON' : 'OFF'}</span>
            </div>
            ${licRes.enableEncodersDvr ? `
              <div class="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
                <div>
                  <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Analog Video Encoder Channel Connections (GSC-OM-S-1PAC $60 / GSC-OM-E-1PAC $100 / GSC-SV-AIO-1PAC $36)">
                    Analog Encoder Channels:
                  </label>
                  <input type="number" min="0" max="1000" value="${licRes.analogEncoderChannels || 0}" onchange="setGenetecLicParam('analogEncoderChannels', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-white" />
                </div>
                <div>
                  <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Third-Party Digital Video Recorder or Network Video Recorder Input Channels (GSC-Om-E-1DV $130)">
                    3rd-Party DVR/NVR Channels:
                  </label>
                  <input type="number" min="0" max="1000" value="${licRes.dvrNvrChannels || 0}" onchange="setGenetecLicParam('dvrNvrChannels', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-white" />
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Feature Toggle: Standby Archiver & High-Availability Clustering -->
          <div class="rounded-lg border ${licRes.enableVideoFailover ? 'border-indigo-500/40 bg-indigo-950/20' : 'border-slate-800/90 bg-slate-900/50'} p-2 space-y-1.5 transition-all">
            <div class="flex items-center justify-between gap-2">
              <label class="flex items-center gap-2 cursor-pointer select-none flex-1">
                <input type="checkbox" ${licRes.enableVideoFailover ? 'checked' : ''} onchange="toggleGenetecFeature('enableVideoFailover', this.checked)" class="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-0" />
                <span class="text-[11px] font-bold ${licRes.enableVideoFailover ? 'text-indigo-300' : 'text-slate-300'}">Standby Archiver &amp; 3rd-Party HA Standby Servers</span>
              </label>
              <span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${licRes.enableVideoFailover ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40' : 'bg-slate-800 text-slate-400'}">${licRes.enableVideoFailover ? 'ON' : 'OFF'}</span>
            </div>
            ${licRes.enableVideoFailover ? `
              <div class="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
                <div>
                  <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold">
                    Standby Archiver ${licRes.effectiveTier === 'enterprise' ? '<span class="text-emerald-400 font-bold">($0.00 Enterprise)</span>' : '($45 per Camera)'}:
                  </label>
                  <select onchange="setGenetecLicParam('failoverMode', this.value)" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-1.5 py-1 text-[10px] font-bold text-white focus:outline-none">
                    <option value="none" ${cfg.failoverMode === 'none' ? 'selected' : ''}>No Standby Archiver</option>
                    <option value="all" ${cfg.failoverMode === 'all' ? 'selected' : ''}>All ${licRes.cameraUnits} Cameras</option>
                    <option value="custom" ${cfg.failoverMode === 'custom' ? 'selected' : ''}>Custom Camera Count</option>
                  </select>
                </div>
                <div>
                  <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Third-Party High-Availability Clustering Standby Server License (GSC-StandbyServer @ $1,500 per server)">
                    3rd-Party HA Servers ($1.5k):
                  </label>
                  <input type="number" min="0" max="50" value="${cfg.standbyServerCount || 0}" onchange="setGenetecLicParam('standbyServerCount', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-white" />
                </div>
              </div>
              ${cfg.failoverMode === 'custom' ? `
                <div class="flex items-center justify-between gap-2 pt-1">
                  <label class="text-[10px] text-slate-300 font-semibold">Custom Failover Camera Channels:</label>
                  <input type="number" min="1" max="${Math.max(1, licRes.cameraUnits)}" value="${cfg.failoverCamerasCustom || licRes.cameraUnits || 1}" onchange="setGenetecLicParam('failoverCamerasCustom', Math.max(0, parseInt(this.value,10)||0))" class="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-indigo-300" />
                </div>
              ` : ''}
            ` : ''}
          </div>

          <!-- Feature Toggle: Cloud Archives & Genetec Clearance (Moved under Video) -->
          <div class="rounded-lg border ${licRes.enableCloudServices ? 'border-sky-500/40 bg-sky-950/20' : 'border-slate-800/90 bg-slate-900/50'} p-2 space-y-1.5 transition-all">
            <div class="flex items-center justify-between gap-2">
              <label class="flex items-center gap-2 cursor-pointer select-none flex-1">
                <input type="checkbox" ${licRes.enableCloudServices ? 'checked' : ''} onchange="toggleGenetecFeature('enableCloudServices', this.checked)" class="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-0" />
                <span class="text-[11px] font-bold ${licRes.enableCloudServices ? 'text-sky-300' : 'text-slate-300'}">Cloud Archives &amp; Genetec Clearance Evidence</span>
              </label>
              <span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${licRes.enableCloudServices ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' : 'bg-slate-800 text-slate-400'}">${licRes.enableCloudServices ? 'ON' : 'OFF'}</span>
            </div>
            ${licRes.enableCloudServices ? `
              <div class="grid grid-cols-3 gap-2 pt-1 border-t border-slate-800/80">
                <div>
                  <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold">Cloud Tier:</label>
                  <select onchange="setGenetecLicParam('cloudArchiveTier', this.value)" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-1 py-1 text-[10px] font-bold text-sky-300 focus:outline-none">
                    <option value="performance" ${cfg.cloudArchiveTier !== 'long_term' ? 'selected' : ''}>Performance ($257/TB)</option>
                    <option value="long_term" ${cfg.cloudArchiveTier === 'long_term' ? 'selected' : ''}>Long-Term ($122/TB)</option>
                  </select>
                </div>
                <div>
                  <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold">Archive TB:</label>
                  <input type="number" min="0" max="500" value="${cfg.cloudArchiveTb || 0}" onchange="setGenetecLicParam('cloudArchiveTb', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-sky-300" />
                </div>
                <div>
                  <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold">Clearance Cameras:</label>
                  <input type="number" min="0" max="1000" value="${cfg.clearanceCameras || 0}" onchange="setGenetecLicParam('clearanceCameras', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-sky-300" />
                </div>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Card 3: Synergis Access Control Readers, Biometrics, ClearID & Key Management -->
        <div class="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3 space-y-2">
          <div class="text-[10px] font-bold uppercase tracking-wider text-purple-400 flex items-center justify-between">
            <span>3. Synergis Access Readers, Biometrics &amp; Identity</span>
            <span class="font-mono text-purple-300">${licRes.totalSynergisReaders || 0} Readers</span>
          </div>
          <!-- Always-Visible Core Synergis Reader Counts -->
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Synergis Access Control Reader Connections for Hardware Purchased from Genetec — Cloud Link, Axis Powered by Genetec, and Mercury Panels (GSC-SY-S-1RE $65 / GSC-SY-E-1RE $125)">
                Genetec-Supplied Readers:
              </label>
              <input type="number" min="0" max="2000" value="${licRes.synergisGenetecReaders || 0}" onchange="setGenetecLicParam('synergisGenetecReaders', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-purple-300" />
            </div>
            <div>
              <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Synergis Access Control External Reader Connections when Controller Hardware is Not Purchased from Genetec (GSC-Sy-S-1R $175 / GSC-Sy-E-1R $260)">
                Third-Party Hardware Readers:
              </label>
              <input type="number" min="0" max="2000" value="${licRes.synergisExternalReaders || 0}" onchange="setGenetecLicParam('synergisExternalReaders', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-purple-300" />
            </div>
          </div>

          <!-- Feature Toggle: Biometrics (Suprema Plugin v1.00, IDEMIA, iDBridge, Princeton) & ID/XpressEntry -->
          <div class="rounded-lg border ${licRes.enableBiometricsIdentity ? 'border-purple-500/40 bg-purple-950/20' : 'border-slate-800/90 bg-slate-900/50'} p-2 space-y-1.5 transition-all">
            <div class="flex items-center justify-between gap-2">
              <label class="flex items-center gap-2 cursor-pointer select-none flex-1">
                <input type="checkbox" ${licRes.enableBiometricsIdentity ? 'checked' : ''} onchange="toggleGenetecFeature('enableBiometricsIdentity', this.checked)" class="rounded border-slate-700 bg-slate-900 text-purple-500 focus:ring-0" />
                <span class="text-[11px] font-bold ${licRes.enableBiometricsIdentity ? 'text-purple-300' : 'text-slate-300'}">Biometrics (Suprema, IDEMIA, iDBridge, Princeton) &amp; ID/XpressEntry</span>
              </label>
              <div class="flex items-center gap-1.5">
                <a href="Datasheets/Genetec/Plugins/Suprema_Genetec_Security_Center_Integration.pdf" target="_blank" class="text-[9px] text-purple-300 hover:underline">Suprema PDF</a>
                <span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${licRes.enableBiometricsIdentity ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' : 'bg-slate-800 text-slate-400'}">${licRes.enableBiometricsIdentity ? 'ON' : 'OFF'}</span>
              </div>
            </div>
            ${licRes.enableBiometricsIdentity ? `
              <div class="space-y-2 pt-1 border-t border-slate-800/80">
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Number of Suprema Biometric Readers/Devices (Each device assigned to a door requires 1x GSC-Sy-X-1R(E) door reader license; <=50 Suprema devices per dedicated Synergis Cloud Link with RIO enabled)">
                      Suprema Devices (Doors):
                    </label>
                    <input type="number" min="0" max="1000" value="${licRes.supremaDevices || 0}" onchange="setGenetecLicParam('supremaDevices', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-purple-300" />
                  </div>
                  <div>
                    <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Suprema Plugin Servers — Requires 3x GSC-1SDK-SUPREMA-READ ($250) per Server (1 license = 2 connections: 2 Config Tool + 1 Security Desk + 1 Suprema Extractor Plugin + 1 Suprema Device Plugin supporting up to 4 Cloud Links / 256 devices per Suprema Guide Page 16)">
                      Suprema Servers (3x SDK per Server):
                    </label>
                    <input type="number" min="0" max="50" value="${licRes.supremaPluginServers || 0}" onchange="setGenetecLicParam('supremaPluginServers', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-purple-300" />
                  </div>
                </div>
                ${licRes.supremaSdkConnections > 0 ? `
                  <div class="p-1.5 rounded bg-purple-950/40 border border-purple-500/30 text-[9px] text-purple-200 leading-tight">
                    <span class="font-bold text-purple-300">Suprema Licensing (Page 16):</span> <code class="text-white">${licRes.supremaSdkConnections}x GSC-1SDK-SUPREMA-READ</code> ($${(licRes.supremaSdkConnections * 250).toLocaleString()}) + Suprema <code class="text-white">INT_GEN_GSC</code> plugin license + <strong class="text-white">${licRes.supremaCloudLinksNeeded} Dedicated Cloud Link(s)</strong> (&le;50 Devices per Cloud Link, RIO enabled) + 1x <code class="text-white">GSC-Sy-X-1R(E)</code> per door.
                  </div>
                ` : ''}
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Control iD iDBridge Server Instances (GSC-1SDK-CONTROLID-IDBRIDGE @ $250/server)">
                      iDBridge Servers ($250):
                    </label>
                    <input type="number" min="0" max="50" value="${licRes.controlIdBridgeServers || 0}" onchange="setGenetecLicParam('controlIdBridgeServers', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-purple-300" />
                  </div>
                  <div>
                    <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Princeton Identity Access Control Suite Servers (GSC-1SDK-PRINCETONIDENTITY-ACS @ $250/server)">
                      Princeton Identity ($250):
                    </label>
                    <input type="number" min="0" max="50" value="${licRes.princetonIdentityServers || 0}" onchange="setGenetecLicParam('princetonIdentityServers', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-purple-300" />
                  </div>
                </div>
                <div class="grid grid-cols-3 gap-2 items-end">
                  <div>
                    <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Document / Passport / Driver's License ID Scanner Workstations (GSC-1PIDSCANNER @ $500/workstation)">
                      ID Scanner Clients:
                    </label>
                    <input type="number" min="0" max="100" value="${licRes.idScannerClients || 0}" onchange="setGenetecLicParam('idScannerClients', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-emerald-300" />
                  </div>
                  <div>
                    <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Telaeris XpressEntry Handheld Badge & Mustering Servers (GSC-1SDK-TELAERIS-XPRESSENTRY @ $250/server)">
                      XpressEntry Servers:
                    </label>
                    <input type="number" min="0" max="50" value="${licRes.xpressEntryServers || 0}" onchange="setGenetecLicParam('xpressEntryServers', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-emerald-300" />
                  </div>
                  <div class="pb-1">
                    <label class="flex items-center gap-1.5 text-[10px] text-slate-300 cursor-pointer" title="IDEMIA MorphoManager Biometrics Integration Plugin (GSC-1PMORPHOBIOMETRICS @ $2,500 per system)">
                      <input type="checkbox" ${licRes.idemiaMorphoEnabled ? 'checked' : ''} onchange="setGenetecLicParam('idemiaMorphoEnabled', this.checked)" class="rounded border-slate-700 bg-slate-900 text-purple-500" />
                      <span>IDEMIA ($2.5k)</span>
                    </label>
                  </div>
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Feature Toggle: ClearID Physical Identity & Visitor Self-Check-In Kiosks -->
          <div class="rounded-lg border ${licRes.enableClearId ? 'border-emerald-500/40 bg-emerald-950/20' : 'border-slate-800/90 bg-slate-900/50'} p-2 space-y-1.5 transition-all">
            <div class="flex items-center justify-between gap-2">
              <label class="flex items-center gap-2 cursor-pointer select-none flex-1">
                <input type="checkbox" ${licRes.enableClearId ? 'checked' : ''} onchange="toggleGenetecFeature('enableClearId', this.checked)" class="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0" />
                <span class="text-[11px] font-bold ${licRes.enableClearId ? 'text-emerald-300' : 'text-slate-300'}">ClearID Identity Governance &amp; Visitor Kiosks</span>
              </label>
              <div class="flex items-center gap-1.5">
                <a href="Datasheets/Genetec/Plugins/Genetec_ClearID_Plugin_Datasheet.pdf" target="_blank" class="text-[9px] text-emerald-300 hover:underline">PDF</a>
                <span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${licRes.enableClearId ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'}">${licRes.enableClearId ? 'ON' : 'OFF'}</span>
              </div>
            </div>
            ${licRes.enableClearId ? `
              <div class="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
                <div>
                  <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Genetec ClearID Active Identities (CID-IDENTITY-1Y/3Y/5Y tiered pricing: $7/$5/$4/$2.50 per identity/yr)">
                    ClearID Identities:
                  </label>
                  <input type="number" min="0" max="500000" step="100" value="${licRes.clearIdIdentities || 0}" onchange="setGenetecLicParam('clearIdIdentities', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-sky-300" />
                </div>
                <div>
                  <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Genetec ClearID Visitor Self-Check-In Kiosks (CID-KIOSK-LIC-1Y @ $2,000/yr)">
                    ClearID Kiosks ($2k/yr):
                  </label>
                  <input type="number" min="0" max="100" value="${licRes.clearIdKiosks || 0}" onchange="setGenetecLicParam('clearIdKiosks', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-sky-300" />
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Feature Toggle: Medeco XT Intelligent Keys & Key Cabinets -->
          <div class="rounded-lg border ${licRes.enableKeyManagement ? 'border-amber-500/40 bg-amber-950/20' : 'border-slate-800/90 bg-slate-900/50'} p-2 space-y-1.5 transition-all">
            <div class="flex items-center justify-between gap-2">
              <label class="flex items-center gap-2 cursor-pointer select-none flex-1">
                <input type="checkbox" ${licRes.enableKeyManagement ? 'checked' : ''} onchange="toggleGenetecFeature('enableKeyManagement', this.checked)" class="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-0" />
                <span class="text-[11px] font-bold ${licRes.enableKeyManagement ? 'text-amber-300' : 'text-slate-300'}">Medeco XT Intelligent Keys &amp; Key Cabinets</span>
              </label>
              <div class="flex items-center gap-1.5">
                <a href="Datasheets/Genetec/Plugins/Genetec_Medeco_Key_Asset_Management_Datasheet.pdf" target="_blank" class="text-[9px] text-amber-300 hover:underline">PDF</a>
                <span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${licRes.enableKeyManagement ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-400'}">${licRes.enableKeyManagement ? 'ON' : 'OFF'}</span>
              </div>
            </div>
            ${licRes.enableKeyManagement ? `
              <div class="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
                <div>
                  <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Medeco XT Intelligent Keys & Offline Cylinders — Automatically includes GSC-1PMEDECOBASE ($1,000) + GSC-1P-OFFLINELOCK-1L ($40/lock)">
                    Medeco XT Locks ($1k + $40/lock):
                  </label>
                  <input type="number" min="0" max="5000" value="${licRes.medecoXtLocks || 0}" onchange="setGenetecLicParam('medecoXtLocks', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-amber-300" />
                </div>
                <div>
                  <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Key & Asset Management Cabinets — Includes $1,500 Base Plugin (GSC-1P-KEYCABINETBASE) + $500 per Key Cabinet (Morse Watchmans, Traka, Deister)">
                    Key Cabinets ($1.5k + $500 per Cabinet):
                  </label>
                  <input type="number" min="0" max="100" value="${cfg.keyCabinetCount || 0}" onchange="setGenetecLicParam('keyCabinetCount', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-white" />
                </div>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Card 4: Multi-Select Certified Partner SDKs, PSIM & Industrial IoT -->
        <div class="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3 space-y-2">
          <div class="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center justify-between">
            <span>4. Multi-Select Partner SDKs, PSIM &amp; IIoT</span>
            <a href="Datasheets/Genetec/SupportedPlugins.pdf" target="_blank" class="text-[9px] text-emerald-300 hover:underline">Supported Plugins PDF</a>
          </div>

          <!-- Feature Toggle: Multi-Select Certified Partner SDKs (GSC-1SDK-* & GSC-1SDK) -->
          <div class="rounded-lg border ${licRes.enablePartnerSdks ? 'border-emerald-500/40 bg-emerald-950/20' : 'border-slate-800/90 bg-slate-900/50'} p-2 space-y-2 transition-all">
            <div class="flex items-center justify-between gap-2">
              <label class="flex items-center gap-2 cursor-pointer select-none flex-1">
                <input type="checkbox" ${licRes.enablePartnerSdks ? 'checked' : ''} onchange="toggleGenetecFeature('enablePartnerSdks', this.checked)" class="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0" />
                <span class="text-[11px] font-bold ${licRes.enablePartnerSdks ? 'text-emerald-300' : 'text-slate-300'}">Certified Partner SDK Connections (Select Multiple)</span>
              </label>
              <span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${licRes.enablePartnerSdks ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'}">
                ${licRes.enablePartnerSdks ? `${Object.values(licRes.selectedPartnerSdks || {}).filter(q => q > 0).length + ((licRes.genericSdkConnections || 0) > 0 ? 1 : 0)} Active` : 'OFF'}
              </span>
            </div>
            ${licRes.enablePartnerSdks ? `
              <div class="space-y-1.5 pt-1 border-t border-slate-800/80">
                <div class="text-[10px] text-slate-400 flex items-center justify-between">
                  <span>Check all Partner SDK integrations needed ($250 per Connection):</span>
                  <span class="font-mono text-emerald-300">Quantity</span>
                </div>
                <div class="max-h-48 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                  ${partnerSdkOptions.filter(opt => opt.key !== 'none').map(opt => {
                    const selectedQty = Number((licRes.selectedPartnerSdks || {})[opt.key]) || 0;
                    const isChecked = selectedQty > 0;
                    const defaultQty = opt.defaultQty || 1;
                    return `
                      <div class="flex items-center justify-between gap-1.5 p-1.5 rounded-lg border ${isChecked ? 'bg-emerald-950/40 border-emerald-500/40' : 'bg-slate-900/70 border-slate-800/80 hover:border-slate-700'} transition">
                        <label class="flex items-start gap-1.5 cursor-pointer select-none flex-1 min-w-0" title="${opt.ruleHint || opt.label}">
                          <input
                            type="checkbox"
                            ${isChecked ? 'checked' : ''}
                            onchange="toggleGenetecPartnerSdk('${opt.key}', this.checked, ${defaultQty})"
                            class="mt-0.5 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0 shrink-0"
                          />
                          <div class="min-w-0 leading-tight">
                            <div class="text-[10px] font-semibold ${isChecked ? 'text-white' : 'text-slate-300'} truncate">${opt.label}</div>
                            <div class="text-[9px] text-slate-400 flex items-center gap-1.5">
                              <code class="text-emerald-300">${opt.sku}</code>
                              ${opt.ruleHint ? `<span class="truncate">&bull; ${opt.ruleHint}</span>` : ''}
                              ${opt.datasheet ? `<a href="${opt.datasheet}" target="_blank" onclick="event.stopPropagation()" class="text-sky-400 hover:underline shrink-0">PDF</a>` : ''}
                            </div>
                          </div>
                        </label>
                        ${isChecked ? `
                          <input
                            type="number"
                            min="1"
                            max="200"
                            value="${selectedQty}"
                            onchange="setGenetecPartnerSdkQty('${opt.key}', this.value)"
                            class="w-14 bg-slate-950 border border-emerald-500/50 rounded px-1.5 py-0.5 text-center font-mono font-bold text-emerald-300 text-[11px] shrink-0"
                            title="Number of ${opt.sku} SDK Connection Licenses ($250 each)"
                          />
                        ` : `
                          <span class="text-[9px] font-mono text-slate-500 shrink-0">$250</span>
                        `}
                      </div>
                    `;
                  }).join('')}
                </div>
                <div class="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
                  <label class="text-[10px] text-slate-300 font-semibold" title="Generic Software Development Kit (SDK) Connections (GSC-1SDK @ $250/connection)">
                    Additional Generic SDK Connections (<code class="text-emerald-300">GSC-1SDK</code> @ $250):
                  </label>
                  <input type="number" min="0" max="200" value="${licRes.genericSdkConnections || 0}" onchange="setGenetecLicParam('genericSdkConnections', Math.max(0, parseInt(this.value,10)||0))" class="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-0.5 text-center font-mono font-bold text-emerald-300" />
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Feature Toggle: Building Automation, WinGuard PSIM & Mission Control -->
          <div class="rounded-lg border ${licRes.enableBuildingPsim ? 'border-sky-500/40 bg-sky-950/20' : 'border-slate-800/90 bg-slate-900/50'} p-2 space-y-1.5 transition-all">
            <div class="flex items-center justify-between gap-2">
              <label class="flex items-center gap-2 cursor-pointer select-none flex-1">
                <input type="checkbox" ${licRes.enableBuildingPsim ? 'checked' : ''} onchange="toggleGenetecFeature('enableBuildingPsim', this.checked)" class="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-0" />
                <span class="text-[11px] font-bold ${licRes.enableBuildingPsim ? 'text-sky-300' : 'text-slate-300'}">WinGuard PSIM, Mission Control, Elevator &amp; OPC</span>
              </label>
              <div class="flex items-center gap-1.5">
                <a href="Datasheets/Genetec/Plugins/Advancis_WinGuard_PSIM_Genetec_Integration.pdf" target="_blank" class="text-[9px] text-sky-300 hover:underline">PDF</a>
                <span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${licRes.enableBuildingPsim ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' : 'bg-slate-800 text-slate-400'}">${licRes.enableBuildingPsim ? 'ON' : 'OFF'}</span>
              </div>
            </div>
            ${licRes.enableBuildingPsim ? `
              <div class="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
                <div>
                  <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Advancis WinGuard Physical Security Information Management (PSIM) Interface Nodes (GSC-1SDK-ADVANCIS-WINGUARD @ $250/node)">
                    Advancis WinGuard Nodes:
                  </label>
                  <input type="number" min="0" max="50" value="${licRes.winGuardNodes || 0}" onchange="setGenetecLicParam('winGuardNodes', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-emerald-300" />
                </div>
                <div>
                  <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Genetec Mission Control Collaborative Decision Management Concurrent Operators ($0 Base + $3,000/yr Operator Maintenance)">
                    Mission Control Operators:
                  </label>
                  <input type="number" min="0" max="200" value="${cfg.missionControlOperators || 0}" onchange="setGenetecLicParam('missionControlOperators', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-white" />
                </div>
                <div>
                  <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Elevator Destination Dispatch Plugin — Otis Compass, KONE, ThyssenKrupp, or MCE Sentry ($8,000 per system)">
                    Elevator Dispatch ($8k):
                  </label>
                  <input type="number" min="0" max="50" value="${cfg.elevatorDispatchSystems || 0}" onchange="setGenetecLicParam('elevatorDispatchSystems', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-white" />
                </div>
                <div>
                  <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Open Platform Communications (OPC) Server Building Automation Plugin (GSC-1POPC-S @ $8,000)">
                    OPC Server Systems ($8k):
                  </label>
                  <input type="number" min="0" max="20" value="${cfg.opcServerSystems || 0}" onchange="setGenetecLicParam('opcServerSystems', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-white" />
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Feature Toggle: Industrial IoT (BACnet / Modbus / OPC / SNMP / MQTT) -->
          <div class="rounded-lg border ${licRes.enableIiot ? 'border-emerald-500/40 bg-emerald-950/20' : 'border-slate-800/90 bg-slate-900/50'} p-2 space-y-1.5 transition-all">
            <div class="flex items-center justify-between gap-2">
              <label class="flex items-center gap-2 cursor-pointer select-none flex-1">
                <input type="checkbox" ${licRes.enableIiot ? 'checked' : ''} onchange="toggleGenetecFeature('enableIiot', this.checked)" class="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0" />
                <span class="text-[11px] font-bold ${licRes.enableIiot ? 'text-emerald-300' : 'text-slate-300'}">Industrial IoT Plugin (BACnet, Modbus, SNMP, MQTT)</span>
              </label>
              <span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${licRes.enableIiot ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'}">${licRes.enableIiot ? 'ON' : 'OFF'}</span>
            </div>
            ${licRes.enableIiot ? `
              <div class="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
                <div>
                  <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold">IIoT Licensing Mode:</label>
                  <select onchange="setGenetecLicParam('iiotMode', this.value)" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-1.5 py-1 text-[10px] font-bold text-emerald-300 focus:outline-none">
                    <option value="devices" ${cfg.iiotMode !== 'site' ? 'selected' : ''}>Per Device ($149/device)</option>
                    <option value="site" ${cfg.iiotMode === 'site' ? 'selected' : ''}>Unlimited Site ($6,000)</option>
                  </select>
                </div>
                <div>
                  <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold">IIoT Devices ($149):</label>
                  <input type="number" min="1" max="500" value="${cfg.iiotDevices || 1}" onchange="setGenetecLicParam('iiotDevices', Math.max(1, parseInt(this.value,10)||1))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-white" />
                </div>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Card 5: Restricted Security Area (RSA) & Intrusion Alarm Panels -->
        <div class="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3 space-y-2">
          <div class="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center justify-between gap-2">
            <span>5. Restricted Security Area (RSA) &amp; Intrusion</span>
            <div class="flex items-center gap-2 shrink-0">
              <a href="Datasheets/Genetec/RSA.pdf" target="_blank" class="text-[9px] text-amber-300 hover:underline">RSA Guide PDF</a>
              <a href="Datasheets/Genetec/Plugins/Genetec_RSA_Surveillance_Plugin_Datasheet.pdf" target="_blank" class="text-[9px] text-amber-300 hover:underline">Plugin PDF</a>
            </div>
          </div>

          <!-- Feature Toggle: Restricted Security Area (RSA) — Quanergy, SpotterRF & Southwest Microwave -->
          <div class="rounded-lg border ${licRes.enableRsa ? 'border-amber-500/40 bg-amber-950/20' : 'border-slate-800/90 bg-slate-900/50'} p-2 space-y-2 transition-all">
            <div class="flex items-center justify-between gap-2">
              <label class="flex items-center gap-2 cursor-pointer select-none flex-1">
                <input type="checkbox" ${licRes.enableRsa ? 'checked' : ''} onchange="toggleGenetecFeature('enableRsa', this.checked)" class="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-0" />
                <span class="text-[11px] font-bold ${licRes.enableRsa ? 'text-amber-300' : 'text-slate-300'}">Restricted Security Area (Quanergy, SpotterRF, SW Microwave)</span>
              </label>
              <div class="flex items-center gap-1.5">
                <a href="Datasheets/Genetec/Plugins/Quanergy_Genetec_RSA_Integration.pdf" target="_blank" class="text-[9px] text-amber-300 hover:underline">LiDAR PDF</a>
                <span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${licRes.enableRsa ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-400'}">${licRes.enableRsa ? 'ON' : 'OFF'}</span>
              </div>
            </div>
            ${licRes.enableRsa ? `
              <div class="space-y-2 pt-1 border-t border-slate-800/80">
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Restricted Security Area (RSA) Base Package (Auto-upgrades to Pro or Enterprise when Quanergy LiDAR, SpotterRF Radar, or Southwest Microwave Fence sensors are added)">
                      RSA Base Package Tier:
                    </label>
                    <select onchange="setGenetecLicParam('rsaTier', this.value)" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-1.5 py-1 text-[10px] font-bold text-amber-300 focus:outline-none">
                      <option value="none" ${(cfg.rsaTier === 'none' || !cfg.rsaTier) ? 'selected' : ''}>Auto (${licRes.effectiveRsaTier !== 'none' ? licRes.effectiveRsaTier.toUpperCase() : 'PRO'})</option>
                      <option value="standard" ${cfg.rsaTier === 'standard' ? 'selected' : ''}>RSA Standard ($1,000)</option>
                      <option value="pro" ${cfg.rsaTier === 'pro' ? 'selected' : ''}>RSA Professional ($7,000)</option>
                      <option value="enterprise" ${cfg.rsaTier === 'enterprise' ? 'selected' : ''}>RSA Enterprise ($14,000)</option>
                    </select>
                  </div>
                  <div>
                    <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Southwest Microwave INTREPID RPM II Standalone Plugin (GSC-1PSWM-RPMII @ $6,500 per 5 RPM units)">
                      SWM RPM II Units ($6.5k/5):
                    </label>
                    <input type="number" min="0" max="100" value="${licRes.swmRpmUnits || 0}" onchange="setGenetecLicParam('swmRpmUnits', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-amber-300" />
                  </div>
                </div>
                <div class="grid grid-cols-4 gap-1.5">
                  <div>
                    <label class="text-[9px] text-slate-300 block mb-0.5 font-semibold" title="Short-Range Tracking Sensors — Quanergy M8 LiDAR (Qortex DTC), Optex PIE-1, Axis, SightLogix, Magos SR (GSC-GAP-RSA-1SRS @ $175/sensor)">
                      Quanergy/SRS:
                    </label>
                    <input type="number" min="0" max="500" value="${licRes.rsaShortRangeSensors || 0}" onchange="setGenetecLicParam('rsaShortRangeSensors', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-1.5 py-1 text-center font-mono font-bold text-amber-300" />
                  </div>
                  <div>
                    <label class="text-[9px] text-slate-300 block mb-0.5 font-semibold" title="Radar Tracking Connections — SpotterRF / Spotter Global (C20/C40/A-Series/3D), FLIR Ranger, Echodyne, Navtech (GSC-GAP-RSA-1RAD @ $1,000/radar)">
                      SpotterRF Radar:
                    </label>
                    <input type="number" min="0" max="200" value="${licRes.rsaRadars || 0}" onchange="setGenetecLicParam('rsaRadars', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-1.5 py-1 text-center font-mono font-bold text-amber-300" />
                  </div>
                  <div>
                    <label class="text-[9px] text-slate-300 block mb-0.5 font-semibold" title="Perimeter Fence Intrusion Detection Controllers — Southwest Microwave INTREPID (MicroPoint POE-S / 316 / 334 / 336 / 390), Senstar, FFT (GSC-GAP-RSA-1FEN @ $2,000/PIDS)">
                      SWM/Fence PIDS:
                    </label>
                    <input type="number" min="0" max="100" value="${licRes.rsaFenceControllers || 0}" onchange="setGenetecLicParam('rsaFenceControllers', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-1.5 py-1 text-center font-mono font-bold text-amber-300" />
                  </div>
                  <div>
                    <label class="text-[9px] text-slate-300 block mb-0.5 font-semibold" title="Monitored Perimeter Fence Distance in Kilometers (GSC-GAP-RSA-1KM $2,000 / 10KM $5,000 / 100KM $15,000)">
                      Fence (km):
                    </label>
                    <input type="number" min="0" max="500" value="${licRes.rsaFenceKm || 0}" onchange="setGenetecLicParam('rsaFenceKm', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-1.5 py-1 text-center font-mono font-bold text-amber-300" />
                  </div>
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Feature Toggle: Intrusion Alarm Panels (Moved alongside RSA) -->
          <div class="rounded-lg border ${licRes.enableIntrusionPanels ? 'border-amber-500/40 bg-amber-950/20' : 'border-slate-800/90 bg-slate-900/50'} p-2 space-y-1.5 transition-all">
            <div class="flex items-center justify-between gap-2">
              <label class="flex items-center gap-2 cursor-pointer select-none flex-1">
                <input type="checkbox" ${licRes.enableIntrusionPanels ? 'checked' : ''} onchange="toggleGenetecFeature('enableIntrusionPanels', this.checked)" class="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-0" />
                <span class="text-[11px] font-bold ${licRes.enableIntrusionPanels ? 'text-amber-300' : 'text-slate-300'}">Intrusion Alarm Panel Integration ($350/panel)</span>
              </label>
              <span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${licRes.enableIntrusionPanels ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-400'}">${licRes.enableIntrusionPanels ? `${licRes.intrusionPanels} Panel` : 'OFF'}</span>
            </div>
            ${licRes.enableIntrusionPanels ? `
              <div class="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
                <div>
                  <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Intrusion Alarm Panel Connections ($350.00 per panel + $65.00/year Advantage Maintenance)">
                    Intrusion Panels ($350):
                  </label>
                  <input type="number" min="0" max="200" value="${licRes.intrusionPanels || 0}" onchange="setGenetecLicParam('intrusionPanels', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-amber-300" />
                </div>
                <div>
                  <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold">Intrusion Panel Brand:</label>
                  <select onchange="setGenetecLicParam('intrusionPanelManufacturer', this.value)" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-1.5 py-1 text-[10px] font-bold text-white focus:outline-none">
                    <option value="bosch" ${licRes.intrusionPanelManufacturer === 'bosch' ? 'selected' : ''}>Bosch B/G (GSC-1AP-Bosch)</option>
                    <option value="dmp" ${licRes.intrusionPanelManufacturer === 'dmp' ? 'selected' : ''}>DMP (GSC-1AP-DMP)</option>
                    <option value="dsc" ${licRes.intrusionPanelManufacturer === 'dsc' ? 'selected' : ''}>DSC (GSC-1AP-DSC)</option>
                    <option value="honeywell" ${licRes.intrusionPanelManufacturer === 'honeywell' ? 'selected' : ''}>Honeywell (GSC-1AP-CDC3-HW)</option>
                    <option value="bosch_map5000" ${licRes.intrusionPanelManufacturer === 'bosch_map5000' ? 'selected' : ''}>Bosch MAP5000</option>
                    <option value="vanderbilt_spc" ${licRes.intrusionPanelManufacturer === 'vanderbilt_spc' ? 'selected' : ''}>Vanderbilt SPC</option>
                  </select>
                </div>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Card 6: Streamvault Turnkey Hardware Appliance Fit & Multi-Role Server Sharing Spec -->
        <div class="bg-slate-950/80 border border-indigo-500/30 rounded-xl p-3 space-y-2">
          <div class="text-[10px] font-bold uppercase tracking-wider text-sky-400 flex items-center justify-between">
            <span>6. Streamvault Hardware &amp; Multi-Role Server Sizing</span>
            <select onchange="setGenetecLicParam('applianceFormFactor', this.value)" class="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[10px] font-bold text-slate-200 focus:outline-none">
              <option value="rack" ${cfg.applianceFormFactor === 'rack' ? 'selected' : ''}>Rackmount (1U / 2U)</option>
              <option value="tower" ${cfg.applianceFormFactor === 'tower' ? 'selected' : ''}>Tower / Small Form Factor</option>
              <option value="any" ${cfg.applianceFormFactor === 'any' ? 'selected' : ''}>Any Form Factor</option>
            </select>
          </div>
          ${prim ? `
            <div class="p-2 rounded-lg bg-indigo-950/40 border border-indigo-500/30 space-y-1.5">
              <div class="flex items-center justify-between">
                <span class="font-bold text-white text-[11px]">${svPlan.primaryQty}x ${prim.applianceSeries} (${prim.sku})</span>
                <span class="font-mono font-bold text-indigo-300 text-[11px]">$${(svPlan.primaryQty * (prim.msrp || 0)).toLocaleString()}</span>
              </div>
              <div class="text-[10px] text-slate-300 leading-snug">${svPlan.archiverReason}</div>
              ${typeof renderApplianceBuildOptionsAndAccessoriesHtml === 'function' ? renderApplianceBuildOptionsAndAccessoriesHtml(prim) : ''}
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
            <div class="p-2 rounded-lg bg-slate-900/60 border border-slate-800 text-[10px] text-slate-400">
              Add cameras to the project or storage calculator to automatically size Streamvault turnkey appliances.
            </div>
          `}
          ${svPlan.directoryAppliance ? `
            <div class="p-1.5 rounded-lg bg-amber-950/30 border border-amber-500/30 flex items-center justify-between text-[10px]">
              <span class="text-amber-300 font-bold">+ ${svPlan.directoryQty}x ${svPlan.directoryAppliance.applianceSeries} Dedicated Directory / Expansion Server</span>
              <span class="font-mono text-white">$${(svPlan.directoryQty * (svPlan.directoryAppliance.msrp || 0)).toLocaleString()}</span>
            </div>
          ` : ''}
          ${svPlan.analyticsAppliance ? `
            <div class="p-1.5 rounded-lg bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between text-[10px]">
              <span class="text-emerald-300 font-bold">+ ${svPlan.analyticsQty}x ${svPlan.analyticsAppliance.applianceSeries} Dedicated GPU Analytics Appliance</span>
              <span class="font-mono text-white">$${(svPlan.analyticsQty * (svPlan.analyticsAppliance.msrp || 0)).toLocaleString()}</span>
            </div>
          ` : ''}
          <!-- Multi-Role & Co-Hosted Plugin Server Resource Requirements -->
          <div class="p-2 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1">
            <div class="flex items-center justify-between text-[10px]">
              <span class="font-bold text-slate-300 uppercase tracking-wider">Shared Server Resource Specification:</span>
              <span class="font-mono font-bold text-emerald-400">${mrSpec.requiredServerCores || 4} Cores • ${mrSpec.requiredServerRamGb || 16} GB RAM • ~${licRes.estimatedSqlDbGb || 0.5} GB SQL</span>
            </div>
            ${Array.isArray(mrSpec.activeRolesAndPlugins) && mrSpec.activeRolesAndPlugins.length > 0 ? `
              <div class="space-y-1 pt-1 border-t border-slate-800/80 max-h-28 overflow-y-auto custom-scrollbar">
                ${mrSpec.activeRolesAndPlugins.map(rp => `
                  <div class="text-[9px] text-slate-300 leading-tight flex items-start justify-between gap-1">
                    <div>
                      <span class="font-bold text-indigo-300">${rp.name}</span> (+${rp.cores}C / +${rp.ramGb}GB): ${rp.rule}
                    </div>
                    ${rp.datasheet ? `<a href="${rp.datasheet}" target="_blank" class="text-sky-400 hover:underline shrink-0">PDF</a>` : ''}
                  </div>
                `).join('')}
              </div>
            ` : ''}
            ${Array.isArray(mrSpec.roleSharingRules) && mrSpec.roleSharingRules.length > 0 ? `
              <div class="text-[9px] text-amber-300/90 pt-0.5 leading-snug">
                ${mrSpec.roleSharingRules.map(r => `<div>&bull; ${r}</div>`).join('')}
              </div>
            ` : ''}
          </div>
        </div>
      </div>

      <!-- Plugin & Integration Engineering Datasheets Bar -->
      <div class="p-2 rounded-xl bg-slate-950/80 border border-slate-800/90 flex flex-wrap items-center justify-between gap-2 text-[10px]">
        <span class="font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <i data-lucide="book-open" class="w-3.5 h-3.5 text-indigo-400"></i>
          <span>Plugin &amp; Multi-Role Server Sizing Datasheets:</span>
        </span>
        <div class="flex flex-wrap items-center gap-1.5">
          <a href="Datasheets/Genetec/EN.Security Center Administrator Guide 5.14.pdf" target="_blank" class="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-indigo-500/50 text-indigo-300 font-semibold">SC 5.14 Admin Guide</a>
          <a href="Datasheets/Genetec/EN.Synergis Supported Hardware and Features 12.0_3.3_5.14.xlsx" target="_blank" class="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-purple-500/50 text-purple-300 font-semibold">Synergis 12.0 / SCL 3.3 Matrix</a>
          <a href="Datasheets/Genetec/Plugins/EN.Sipelia User Guide 2.14.0.0.pdf" target="_blank" class="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-sky-500/50 text-sky-300 font-semibold">Sipelia 2.14 User Guide</a>
          <a href="Datasheets/Genetec/Plugins/EN.DMP Intrusion Panel Extension Guide 4.5.0.pdf" target="_blank" class="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-amber-500/50 text-amber-300 font-semibold">DMP Intrusion 4.5.0 Guide</a>
          <a href="Datasheets/Genetec/Plugins/EN.Genetec Mission Control Deployment Guide 3.4.1.0.pdf" target="_blank" class="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-emerald-500/50 text-emerald-300 font-semibold">Mission Control 3.4.1.0 Guide</a>
          <a href="Datasheets/Genetec/Plugins/Genetec_RSA_Surveillance_Plugin_Datasheet.pdf" target="_blank" class="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-300 font-semibold">RSA / SpotterRF / SWM</a>
          <a href="Datasheets/Genetec/Plugins/Quanergy_Genetec_RSA_Integration.pdf" target="_blank" class="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-300 font-semibold">Quanergy LiDAR RSA</a>
          <a href="Datasheets/Genetec/Plugins/Suprema_Genetec_Security_Center_Integration.pdf" target="_blank" class="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-purple-300 font-semibold">Suprema Plugin v1.00</a>
          <a href="Datasheets/Genetec/Plugins/Corsight Syfty Genetec - User Guide 2026.pdf" target="_blank" class="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-indigo-300 font-semibold">Corsight Syfty 2026</a>
          <a href="Datasheets/Genetec/Plugins/StreamConnect_for_Genetec_v2_1_User_Guide.pdf" target="_blank" class="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-emerald-300 font-semibold">Allied Telesis StreamConnect v2.1</a>
          <a href="Datasheets/Genetec/Plugins/Genetec_Identity_Biometrics_Plugins_Datasheet.pdf" target="_blank" class="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-purple-300 font-semibold">IDEMIA / iDBridge / Princeton / ID Scanner</a>
          <a href="Datasheets/Genetec/Plugins/Genetec_ClearID_Plugin_Datasheet.pdf" target="_blank" class="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-emerald-300 font-semibold">ClearID &amp; Card Sync</a>
          <a href="Datasheets/Genetec/Plugins/Telaeris_XPressEntry_Genetec_Integration.pdf" target="_blank" class="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-emerald-300 font-semibold">Telaeris XpressEntry</a>
          <a href="Datasheets/Genetec/Plugins/Genetec_Medeco_Key_Asset_Management_Datasheet.pdf" target="_blank" class="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-300 font-semibold">Medeco XT &amp; Key Cabinets</a>
          <a href="Datasheets/Genetec/Plugins/BriefCam_Corsight_Video_Analytics_Genetec_Integration.pdf" target="_blank" class="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-indigo-300 font-semibold">BriefCam Analytics</a>
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
            No camera, reader, or client licenses calculated yet. Add cameras in Initial Design, Power over Ethernet Calculator, or Physical Security, or enter reader/panel/plugin counts above.
          </div>
        `}
      </div>
    </div>
  `;
}
window.renderGenetecLicensingBuilderHtml = renderGenetecLicensingBuilderHtml;

// =========================================================================
// SERVER & WORKSTATION BUILD OPTIONS & ACCESSORY CONFIGURATOR
// =========================================================================

window.applianceBuildSelections = window.applianceBuildSelections || {};

function setApplianceBuildSelection(applianceId, optKey, val) {
  if (!applianceId) return;
  if (!window.applianceBuildSelections[applianceId]) {
    window.applianceBuildSelections[applianceId] = {};
  }
  window.applianceBuildSelections[applianceId][optKey] = val;
  if (typeof showToast === "function") {
    showToast(`Updated ${applianceId} build option (${optKey}: ${val}).`, "info");
  }
}
window.setApplianceBuildSelection = setApplianceBuildSelection;

function addServerAccessoryToBom(sku, label, msrp, parentVendor) {
  if (!sku) return;
  // First check if SKU is in catalog (e.g. HEMS-* warranties)
  if (typeof addToBOM === "function") {
    const swDb = (typeof window !== "undefined" && window.SOFTWARE_DATABASE && Array.isArray(window.SOFTWARE_DATABASE.vms))
      ? window.SOFTWARE_DATABASE.vms
      : [];
    const matchedCatalogItem = swDb.find(s => s.sku === sku || s.id === sku);
    if (matchedCatalogItem) {
      addToBOM(matchedCatalogItem.id, 1);
      if (typeof showToast === "function") {
        showToast(`Added ${matchedCatalogItem.sku} (${matchedCatalogItem.model}) to BOM.`, "success");
      }
      if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
      return;
    }
  }
  // Otherwise add as a custom hardware accessory line item on projectBOM
  if (Array.isArray(projectBOM)) {
    const existing = projectBOM.find(entry => entry && entry.item && entry.item.sku === sku);
    if (existing) {
      existing.qty = (Number(existing.qty) || 1) + 1;
    } else {
      projectBOM.push({
        id: `acc_${sku.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
        qty: 1,
        item: {
          id: `acc_${sku.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
          sku: sku,
          vendor: parentVendor || "Server Option / Accessory",
          model: label || sku,
          category: "servers",
          subcategory: "Server Build Option / Accessory",
          msrp: Number(msrp) || 0,
          description: label || sku
        }
      });
    }
    if (typeof updateBOMTable === "function") updateBOMTable();
    if (typeof updateProjectHealthUI === "function") updateProjectHealthUI();
    if (typeof showToast === "function") {
      showToast(`Added Server Accessory ${sku} (${label}${msrp ? ' • $' + Number(msrp).toLocaleString() : ''}) to BOM.`, "success");
    }
  }
}
window.addServerAccessoryToBom = addServerAccessoryToBom;

function renderApplianceBuildOptionsAndAccessoriesHtml(appliance) {
  if (!appliance) return "";
  const bo = appliance.buildOptions || {};
  const accs = Array.isArray(appliance.compatibleAccessories) ? appliance.compatibleAccessories : [];
  const hasBuildOpts = Object.keys(bo).length > 0;
  if (!hasBuildOpts && accs.length === 0) return "";

  const sel = (window.applianceBuildSelections && window.applianceBuildSelections[appliance.id]) || {};
  const storageList = Array.isArray(bo.storageCapacitiesTb) ? bo.storageCapacitiesTb : [];
  const raidList = Array.isArray(bo.raidOptions) ? bo.raidOptions : [];
  const cpuList = Array.isArray(bo.cpuOptions) ? bo.cpuOptions : [];
  const ramList = Array.isArray(bo.ramOptionsGb) ? bo.ramOptionsGb : [];
  const nicList = Array.isArray(bo.nicOptions) ? bo.nicOptions : [];
  const gpuList = Array.isArray(bo.gpuOptions) ? bo.gpuOptions : [];
  const psuList = Array.isArray(bo.powerSupplyOptions) ? bo.powerSupplyOptions : [];

  return `
    <details class="group rounded-lg bg-slate-950/90 border border-slate-800/90 px-2.5 py-1.5 text-[10px]">
      <summary class="cursor-pointer select-none font-bold text-amber-300 flex items-center justify-between gap-2">
        <span class="flex items-center gap-1.5">
          <i data-lucide="sliders" class="w-3 h-3 text-amber-400"></i>
          <span>Configure Factory Build Options &amp; Accessories (${accs.length} Add-Ons)</span>
        </span>
        <span class="text-[9px] font-mono text-slate-400 group-open:rotate-180 transition-transform">&#9660;</span>
      </summary>
      <div class="pt-2 mt-1.5 border-t border-slate-800/80 space-y-2">
        ${hasBuildOpts ? `
          <div class="grid grid-cols-2 gap-1.5">
            ${storageList.length > 0 ? `
              <div>
                <label class="text-[9px] text-slate-400 block mb-0.5">Raw Storage Build (TB):</label>
                <select onchange="setApplianceBuildSelection('${appliance.id}', 'storageTb', this.value)" class="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[9.5px] font-mono font-bold text-white">
                  ${storageList.map(tb => `<option value="${tb}" ${(sel.storageTb ? Number(sel.storageTb) === tb : Number(appliance.rawStorageTb) === tb) ? 'selected' : ''}>${tb} TB Raw Capacity</option>`).join('')}
                </select>
              </div>
            ` : ''}
            ${raidList.length > 0 ? `
              <div>
                <label class="text-[9px] text-slate-400 block mb-0.5">Factory RAID Level:</label>
                <select onchange="setApplianceBuildSelection('${appliance.id}', 'raid', this.value)" class="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[9.5px] font-mono font-bold text-emerald-300">
                  ${raidList.map(r => `<option value="${r}" ${sel.raid === r ? 'selected' : ''}>${r}</option>`).join('')}
                </select>
              </div>
            ` : ''}
            ${cpuList.length > 0 ? `
              <div class="col-span-2">
                <label class="text-[9px] text-slate-400 block mb-0.5">Processor (CPU) Build Option:</label>
                <select onchange="setApplianceBuildSelection('${appliance.id}', 'cpu', this.value)" class="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[9.5px] font-mono text-sky-300">
                  ${cpuList.map(c => `<option value="${String(c).replace(/"/g, '&quot;')}" ${sel.cpu === c ? 'selected' : ''}>${c}</option>`).join('')}
                </select>
              </div>
            ` : ''}
            ${ramList.length > 0 ? `
              <div>
                <label class="text-[9px] text-slate-400 block mb-0.5">System Memory (RAM):</label>
                <select onchange="setApplianceBuildSelection('${appliance.id}', 'ramGb', this.value)" class="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[9.5px] font-mono font-bold text-white">
                  ${ramList.map(g => `<option value="${g}" ${(sel.ramGb ? Number(sel.ramGb) === g : Number(appliance.ramGb) === g) ? 'selected' : ''}>${g} GB RAM</option>`).join('')}
                </select>
              </div>
            ` : ''}
            ${nicList.length > 0 ? `
              <div>
                <label class="text-[9px] text-slate-400 block mb-0.5">Network Interface (NIC):</label>
                <select onchange="setApplianceBuildSelection('${appliance.id}', 'nic', this.value)" class="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[9.5px] font-mono text-indigo-300">
                  ${nicList.map(n => `<option value="${String(n).replace(/"/g, '&quot;')}" ${sel.nic === n ? 'selected' : ''}>${n}</option>`).join('')}
                </select>
              </div>
            ` : ''}
            ${gpuList.length > 0 ? `
              <div class="col-span-2">
                <label class="text-[9px] text-slate-400 block mb-0.5">GPU / VMD Decoding Accelerator:</label>
                <select onchange="setApplianceBuildSelection('${appliance.id}', 'gpu', this.value)" class="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[9.5px] font-mono text-purple-300">
                  ${gpuList.map(g => `<option value="${String(g).replace(/"/g, '&quot;')}" ${sel.gpu === g ? 'selected' : ''}>${g}</option>`).join('')}
                </select>
              </div>
            ` : ''}
            ${psuList.length > 0 ? `
              <div class="col-span-2">
                <label class="text-[9px] text-slate-400 block mb-0.5">Power Supply Configuration:</label>
                <select onchange="setApplianceBuildSelection('${appliance.id}', 'psu', this.value)" class="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[9.5px] font-mono text-amber-300">
                  ${psuList.map(p => `<option value="${String(p).replace(/"/g, '&quot;')}" ${sel.psu === p ? 'selected' : ''}>${p}</option>`).join('')}
                </select>
              </div>
            ` : ''}
          </div>
        ` : ''}
        ${accs.length > 0 ? `
          <div class="space-y-1 pt-1 border-t border-slate-800/80">
            <div class="text-[9px] font-bold uppercase tracking-wider text-slate-400">Compatible Server Accessories &amp; Warranties:</div>
            <div class="space-y-1 max-h-28 overflow-y-auto custom-scrollbar pr-1">
              ${accs.map((acc, idx) => {
                const isObj = acc && typeof acc === 'object';
                const sku = isObj ? (acc.sku || `ACC-${idx+1}`) : String(acc).split(':')[0].trim();
                const label = isObj ? (acc.label || acc.sku) : String(acc);
                const msrp = isObj ? (Number(acc.msrp) || 0) : 0;
                const safeSku = String(sku).replace(/'/g, "\\'");
                const safeLabel = String(label).replace(/'/g, "\\'");
                const safeVendor = String(appliance.vendor || "Server Accessory").replace(/'/g, "\\'");
                return `
                  <div class="flex items-center justify-between gap-2 bg-slate-900/80 border border-slate-800 rounded px-2 py-1">
                    <div class="text-[9px] text-slate-200 leading-tight">
                      <span class="font-mono font-bold text-amber-300">${sku}</span>
                      <span class="text-slate-300"> — ${label}</span>
                      ${msrp > 0 ? `<span class="font-mono text-emerald-400 ml-1">($${msrp.toLocaleString()})</span>` : ''}
                    </div>
                    <button type="button" onclick="addServerAccessoryToBom('${safeSku}', '${safeLabel}', ${msrp}, '${safeVendor}')" class="px-1.5 py-0.5 rounded bg-amber-600/80 hover:bg-amber-500 text-white text-[9px] font-bold shrink-0 cursor-pointer">
                      + Add
                    </button>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    </details>
  `;
}
window.renderApplianceBuildOptionsAndAccessoriesHtml = renderApplianceBuildOptionsAndAccessoriesHtml;

// =========================================================================
// MILESTONE HUSKY IVO APPLIANCE & XPROTECT 2026 R2 LICENSING CONTROLLERS
// =========================================================================

function setVmsLicensingVendor(vendor) {
  activeVmsLicensingVendor = vendor === "milestone" ? "milestone" : "genetec";
  window.activeVmsLicensingVendor = activeVmsLicensingVendor;
  videoVmsVendor = activeVmsLicensingVendor;
  window.videoVmsVendor = activeVmsLicensingVendor;
  if (typeof VideoStorageSizer !== "undefined") {
    VideoStorageSizer.state.vmsVendor = activeVmsLicensingVendor;
  }
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
  if (typeof updateProjectHealthUI === "function") updateProjectHealthUI();
}
window.setVmsLicensingVendor = setVmsLicensingVendor;

function setMilestoneLicParam(key, val) {
  if (typeof window.milestoneLicensingConfig !== "object" || !window.milestoneLicensingConfig) {
    window.milestoneLicensingConfig = (typeof MilestoneLicensingSizer !== "undefined")
      ? MilestoneLicensingSizer.getDefaultConfig()
      : {};
  }
  const cfg = window.milestoneLicensingConfig;
  cfg[key] = val;
  // Synchronize UI alias keys with MilestoneLicensingSizer engine keys
  if (key === "edition") cfg.tierMode = val;
  if (key === "tierMode") cfg.edition = val;
  if (key === "includeCarePremium") cfg.carePremium = Boolean(val);
  if (key === "carePremium") cfg.includeCarePremium = Boolean(val);
  if (key === "lprLanesOverride") cfg.lprCamerasOverride = val;
  if (key === "lprCountryModules") cfg.lprCountryLibs = val;
  if (key === "interconnectDevices") cfg.interconnectCameras = val;
  if (key === "transactConnectors") cfg.transactSources = val;
  if (key === "axisSecureEntryDoorsOverride") {
    cfg.accessMode = "axis_secure_entry";
    cfg.accessReadersOverride = val;
  }
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
  if (typeof updateProjectHealthUI === "function") updateProjectHealthUI();
}
window.setMilestoneLicParam = setMilestoneLicParam;

function toggleMilestoneFeature(toggleKey, enabled) {
  if (typeof window.milestoneLicensingConfig !== "object" || !window.milestoneLicensingConfig) {
    window.milestoneLicensingConfig = (typeof MilestoneLicensingSizer !== "undefined")
      ? MilestoneLicensingSizer.getDefaultConfig()
      : {};
  }
  const cfg = window.milestoneLicensingConfig;
  const isOn = Boolean(enabled);
  cfg[toggleKey] = isOn;

  if (toggleKey === "enableAxisSecureEntry") {
    cfg.enableAccessControl = isOn;
    cfg.accessMode = isOn ? "axis_secure_entry" : "xprotect_access";
    if (isOn && !(cfg.accessReadersOverride > 0)) {
      cfg.accessReadersOverride = 4;
      cfg.axisSecureEntryDoorsOverride = 4;
    }
  } else if (isOn) {
    if (toggleKey === "enableAccessControl") {
      cfg.accessMode = "xprotect_access";
      if (!(cfg.accessReadersOverride > 0)) cfg.accessReadersOverride = 4;
    } else if (toggleKey === "enableLpr" && !(cfg.lprCamerasOverride > 0)) {
      cfg.lprCamerasOverride = 1;
      cfg.lprLanesOverride = 1;
      cfg.lprCountryLibs = Math.max(1, cfg.lprCountryLibs || 1);
    } else if (toggleKey === "enableTransact" && !(cfg.transactSources > 0)) {
      cfg.transactSources = 2;
      cfg.transactConnectors = 2;
    } else if (toggleKey === "enableInterconnect" && !(cfg.interconnectCameras > 0)) {
      cfg.interconnectCameras = 8;
      cfg.interconnectDevices = 8;
    } else if (toggleKey === "enableRapidReview" && !(cfg.rapidReviewCameras > 0)) {
      cfg.rapidReviewCameras = 5;
    } else if (toggleKey === "enableHospitalAssist" && !(cfg.hospitalAssistCameras > 0)) {
      cfg.hospitalAssistCameras = 4;
    }
  }
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
  if (typeof updateProjectHealthUI === "function") updateProjectHealthUI();
}
window.toggleMilestoneFeature = toggleMilestoneFeature;

function autoFitHuskyToBom() {
  if (typeof MilestoneLicensingSizer === "undefined" || typeof addToBOM !== "function") return;
  const res = MilestoneLicensingSizer.calculate(projectBOM);
  const hp = res.huskyPlan;
  if (!hp || !hp.primaryAppliance) {
    if (typeof showToast === "function") showToast("Add cameras or set manual storage parameters to size a Milestone Husky IVO appliance.", "info");
    return;
  }

  let addedDesc = [];
  addToBOM(hp.primaryAppliance.id, hp.primaryQty);
  addedDesc.push(`${hp.primaryQty}x ${hp.primaryAppliance.model}`);

  if (hp.analyticsAppliance && hp.analyticsQty > 0) {
    addToBOM(hp.analyticsAppliance.id, hp.analyticsQty);
    addedDesc.push(`${hp.analyticsQty}x ${hp.analyticsAppliance.model}`);
  }
  if (hp.cloudGatewayAppliance && hp.cloudGatewayQty > 0) {
    addToBOM(hp.cloudGatewayAppliance.id, hp.cloudGatewayQty);
    addedDesc.push(`${hp.cloudGatewayQty}x ${hp.cloudGatewayAppliance.model}`);
  }

  if (typeof showToast === "function") {
    showToast(`Added Milestone Husky Hardware: ${addedDesc.join(" + ")}`, "success");
  }
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
  if (typeof updateProjectHealthUI === "function") updateProjectHealthUI();
}
window.autoFitHuskyToBom = autoFitHuskyToBom;

function addMilestoneLicensesToBom() {
  if (typeof MilestoneLicensingSizer === "undefined" || typeof addToBOM !== "function") return;
  const res = MilestoneLicensingSizer.calculate(projectBOM);
  if (!res.lineItems || res.lineItems.length === 0) {
    if (typeof showToast === "function") showToast("No Milestone XProtect licenses needed yet — add cameras or access readers first.", "info");
    return;
  }

  // Remove any previously auto-added Milestone VMS software SKUs before re-adding updated quantities
  const milestoneSkus = new Set(res.lineItems.map(li => li.sku));
  if (Array.isArray(projectBOM)) {
    for (let i = projectBOM.length - 1; i >= 0; i--) {
      const entry = projectBOM[i];
      const item = entry && (entry.item || entry);
      if (item && (milestoneSkus.has(item.sku) || String(item.id || "").startsWith("milestone-xp") || String(item.id || "").startsWith("milestone-mc"))) {
        projectBOM.splice(i, 1);
      }
    }
  }

  let count = 0;
  res.lineItems.forEach(li => {
    if (li.qty > 0 && !li.isIncludedZeroCost && (li.unitMsrp || 0) > 0) {
      addToBOM(li.catalogId || li.id || li.sku, li.qty);
      count++;
    }
  });

  if (typeof showToast === "function") {
    showToast(`Added ${count} Milestone XProtect 2026 R2 license SKU(s) ($${res.totalSoftwareMsrp.toLocaleString()} MSRP) to BOM.`, "success");
  }
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
  if (typeof updateProjectHealthUI === "function") updateProjectHealthUI();
}
window.addMilestoneLicensesToBom = addMilestoneLicensesToBom;

function addTurnkeyMilestonePackageToBom() {
  autoFitHuskyToBom();
  addMilestoneLicensesToBom();
}
window.addTurnkeyMilestonePackageToBom = addTurnkeyMilestonePackageToBom;

function renderMilestoneLicensingBuilderHtml(licRes, isCompactDrawer = false) {
  const cfg = licRes.config || {};
  const hp = licRes.huskyPlan || {};
  const prim = hp.primaryAppliance;
  const ed = licRes.editionInfo || licRes.tierDef || {};
  const isAxisMode = licRes.enableAccessControl && licRes.accessMode === "axis_secure_entry";
  const isXpAccessMode = licRes.enableAccessControl && licRes.accessMode !== "axis_secure_entry";

  return `
    <div class="bg-slate-900/95 border border-sky-500/40 rounded-2xl p-3.5 sm:p-4 space-y-3.5 shadow-xl">
      <!-- Top Header & Datasheets -->
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-800">
        <div class="flex items-start gap-2.5">
          <div class="p-2 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400 shrink-0">
            <i data-lucide="key" class="w-4 h-4"></i>
          </div>
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <h5 class="text-xs font-bold text-white uppercase tracking-wider">
                Milestone XProtect 2026 R2 &amp; Husky IVO Turnkey Sizer
              </h5>
              <span class="px-2 py-0.5 rounded bg-sky-500/15 border border-sky-500/30 text-sky-300 text-[10px] font-mono font-bold">
                Edition: ${ed.label || 'XProtect Corporate'} &bull; ${licRes.totalDeviceLicenses ?? licRes.cameraUnits ?? 0} Device Licenses &bull; ${licRes.careYears}Y Care Plus (${licRes.multiYearDiscountPct ?? licRes.careDiscountPct ?? 0}% Multi-Year Discount)
              </span>
              <a href="Datasheets/Milestone/Milestone_XProtect_VMS_Product_Comparison_Chart.pdf" target="_blank" class="text-[10px] text-sky-400 hover:text-sky-300 underline flex items-center gap-1">
                <i data-lucide="file-text" class="w-3 h-3"></i>
                <span>2026 R2 Comparison Chart</span>
              </a>
              <a href="Datasheets/Milestone/XProtect_Price List_USD-US_January 1_2027.xlsx" target="_blank" class="text-[10px] text-emerald-400 hover:text-emerald-300 underline flex items-center gap-1">
                <i data-lucide="dollar-sign" class="w-3 h-3"></i>
                <span>Official USD Price List (Jan 2027)</span>
              </a>
            </div>
            <p class="text-[11px] text-slate-400 mt-0.5">
              Automatic edition selection (<strong class="text-white">Express+</strong> &bull; <strong class="text-white">Professional+</strong> &bull; <strong class="text-white">Expert</strong> &bull; <strong class="text-white">Corporate</strong>), Care Plus multi-year discounts (10%–25%), XProtect Access, LPR, Smart Wall, BriefCam XA/XE, and Husky IVO sizing.
            </p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2 shrink-0">
          <div class="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-right">
            <div class="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Total Software + Husky IVO</div>
            <div class="text-xs font-mono font-bold text-emerald-400">
              $${(licRes.totalSoftwareMsrp || 0).toLocaleString()} Software <span class="text-slate-500">+</span> <span class="text-sky-300">$${(licRes.totalHardwareMsrp || 0).toLocaleString()} Hardware</span>
            </div>
          </div>
          <button
            type="button"
            onclick="addTurnkeyMilestonePackageToBom()"
            class="px-3 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-emerald-600 hover:from-sky-500 hover:to-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
          >
            <i data-lucide="sparkles" class="w-3.5 h-3.5"></i>
            <span>+ Quote Full Turnkey Milestone Package ($${(licRes.totalTurnkeyMsrp ?? licRes.combinedTurnkeyMsrp ?? 0).toLocaleString()})</span>
          </button>
        </div>
      </div>

      ${licRes.autoUpgradedReasons && licRes.autoUpgradedReasons.length > 0 ? `
        <div class="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/40 flex items-start gap-2 text-[11px] text-amber-200">
          <i data-lucide="info" class="w-4 h-4 text-amber-400 shrink-0 mt-0.5"></i>
          <div>
            <strong class="text-amber-300">Automatic Milestone XProtect Edition Promotion:</strong>
            ${licRes.autoUpgradedReasons.join(" • ")}
          </div>
        </div>
      ` : ''}

      <!-- 6-Card Configuration Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 text-xs">
        <!-- Card 1: XProtect Edition, Device Licenses & Care Plus Term -->
        <div class="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3 space-y-2.5">
          <div class="text-[10px] font-bold uppercase tracking-wider text-sky-400 flex items-center justify-between">
            <span>1. XProtect Edition &amp; Care Plus SMA</span>
            <span class="font-mono text-slate-400">${ed.baseSku || 'XPCOBT'} / ${ed.deviceSku || 'XPCODL'}</span>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div class="col-span-2">
              <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Select Milestone XProtect VMS Edition (Auto promotes to Professional+ >48 cameras, Expert for Failover, or Corporate for Smart Wall Included / Federation)">
                XProtect Edition Tier:
              </label>
              <select onchange="setMilestoneLicParam('tierMode', this.value)" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-white focus:outline-none">
                <option value="auto" ${(cfg.tierMode === 'auto' || !cfg.tierMode) ? 'selected' : ''}>Auto-Select Edition (${ed.shortLabel || 'Professional+'})</option>
                <option value="express_plus" ${cfg.tierMode === 'express_plus' ? 'selected' : ''}>XProtect Express+ (≤100 Cameras, 1 Server • $29 Base + $109 per Device)</option>
                <option value="professional_plus" ${cfg.tierMode === 'professional_plus' ? 'selected' : ''}>XProtect Professional+ (Unlimited Cameras • $566 Base + $192 per Device)</option>
                <option value="expert" ${cfg.tierMode === 'expert' ? 'selected' : ''}>XProtect Expert (Failover &amp; Encryption • $2,267 Base + $305 per Device)</option>
                <option value="corporate" ${cfg.tierMode === 'corporate' ? 'selected' : ''}>XProtect Corporate (Smart Wall &amp; Incident Manager Included • $3,610 Base + $373 per Device)</option>
              </select>
            </div>
            <div>
              <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Care Plus Multi-Year Discount: 2Y (-10%), 3Y (-15%), 4Y (-20%), 5Y (-25%). Mandatory at purchase for Expert and Corporate.">
                Care Plus Term:
              </label>
              <select onchange="setMilestoneLicParam('careYears', parseInt(this.value,10))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-emerald-300 focus:outline-none">
                <option value="1" ${licRes.careYears === 1 ? 'selected' : ''}>1 Year Care Plus (0% Discount)</option>
                <option value="2" ${licRes.careYears === 2 ? 'selected' : ''}>2 Years Care Plus (-10% Discount)</option>
                <option value="3" ${licRes.careYears === 3 ? 'selected' : ''}>3 Years Care Plus (-15% Discount)</option>
                <option value="4" ${licRes.careYears === 4 ? 'selected' : ''}>4 Years Care Plus (-20% Discount)</option>
                <option value="5" ${licRes.careYears === 5 ? 'selected' : ''}>5 Years Care Plus (-25% Discount)</option>
              </select>
            </div>
            <div>
              <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Milestone Smart Client Workstations (Unlimited $0 Smart Client licenses; sizes Husky IVO 150D-VS / 350T-VS Viewing Stations)">
                Viewing Stations:
              </label>
              <input type="number" min="0" max="500" value="${licRes.workstationClients ?? 2}" onchange="setMilestoneLicParam('workstationClients', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-white" />
            </div>
          </div>
          <label class="flex items-center justify-between gap-2 pt-1 cursor-pointer select-none">
            <span class="text-[11px] text-slate-300" title="Care Premium 24/7 direct Milestone technical support add-on (MCPR-* per device)">Include Care Premium 24/7 Direct Support</span>
            <input type="checkbox" ${licRes.carePremium ? 'checked' : ''} onchange="setMilestoneLicParam('carePremium', this.checked)" class="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-0" />
          </label>
        </div>

        <!-- Card 2: High Availability, Smart Wall & Incident Manager -->
        <div class="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3 space-y-2">
          <div class="text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center justify-between">
            <span>2. High Availability, Smart Wall &amp; SOC</span>
            <span class="font-mono text-slate-400">XPMSFSL / XPSWBL</span>
          </div>

          <label class="flex items-center justify-between gap-2 p-2 rounded-lg border ${licRes.managementServerFailover ? 'border-cyan-500/40 bg-cyan-950/20' : 'border-slate-800/90 bg-slate-900/50'} cursor-pointer select-none">
            <div>
              <div class="text-[11px] font-bold ${licRes.managementServerFailover ? 'text-cyan-300' : 'text-slate-300'}">Management Server Failover (<code class="text-cyan-400">XPMSFSL</code>)</div>
              <div class="text-[9.5px] text-slate-400">Zero-downtime Management Server HA cluster ($7,650)</div>
            </div>
            <input type="checkbox" ${licRes.managementServerFailover ? 'checked' : ''} onchange="setMilestoneLicParam('managementServerFailover', this.checked)" class="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0" />
          </label>

          <label class="flex items-center justify-between gap-2 p-2 rounded-lg border ${licRes.enableSmartWall || ed.includesSmartWall ? 'border-indigo-500/40 bg-indigo-950/20' : 'border-slate-800/90 bg-slate-900/50'} cursor-pointer select-none">
            <div>
              <div class="text-[11px] font-bold ${licRes.enableSmartWall || ed.includesSmartWall ? 'text-indigo-300' : 'text-slate-300'}">XProtect Smart Wall Video Wall (<code class="text-indigo-400">XPSWBL</code>)</div>
              <div class="text-[9.5px] text-slate-400">${ed.includesSmartWall ? 'Included FREE ($0) in XProtect Corporate ($15,799 Value)!' : 'Add-On for XProtect Expert ($15,799) — Auto-upgrades to Corporate'}</div>
            </div>
            <input type="checkbox" ${licRes.enableSmartWall || ed.includesSmartWall ? 'checked' : ''} onchange="setMilestoneLicParam('enableSmartWall', this.checked)" class="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-0" />
          </label>

          <label class="flex items-center justify-between gap-2 p-2 rounded-lg border ${licRes.enableIncidentManager || ed.includesIncidentManager ? 'border-purple-500/40 bg-purple-950/20' : 'border-slate-800/90 bg-slate-900/50'} cursor-pointer select-none">
            <div>
              <div class="text-[11px] font-bold ${licRes.enableIncidentManager || ed.includesIncidentManager ? 'text-purple-300' : 'text-slate-300'}">XProtect Incident Manager (<code class="text-purple-400">XPIMBL</code>)</div>
              <div class="text-[9.5px] text-slate-400">${ed.includesIncidentManager ? 'Included FREE ($0) in XProtect Corporate ($9,975 Value)!' : 'Case documentation &amp; video evidence packaging ($9,975)'}</div>
            </div>
            <input type="checkbox" ${licRes.enableIncidentManager || ed.includesIncidentManager ? 'checked' : ''} onchange="setMilestoneLicParam('enableIncidentManager', this.checked)" class="rounded border-slate-700 bg-slate-900 text-purple-500 focus:ring-0" />
          </label>
        </div>

        <!-- Card 3: Access Control (XProtect Access & AXIS Secure Entry) -->
        <div class="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3 space-y-2">
          <div class="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center justify-between">
            <span>3. Access Control &amp; Door Integration</span>
            <span class="font-mono text-slate-400">XPABL / XPSEADL</span>
          </div>

          <div class="rounded-lg border ${isXpAccessMode ? 'border-amber-500/40 bg-amber-950/20' : 'border-slate-800/90 bg-slate-900/50'} p-2 space-y-1.5">
            <div class="flex items-center justify-between gap-2">
              <label class="flex items-center gap-2 cursor-pointer select-none flex-1">
                <input type="checkbox" ${isXpAccessMode ? 'checked' : ''} onchange="toggleMilestoneFeature('enableAccessControl', this.checked)" class="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-0" />
                <span class="text-[11px] font-bold ${isXpAccessMode ? 'text-amber-300' : 'text-slate-300'}">XProtect Access (3rd-Party ACS Integration)</span>
              </label>
              <span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${isXpAccessMode ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-400'}">${isXpAccessMode ? `${licRes.effectiveAccessCount || 0} Readers` : 'OFF'}</span>
            </div>
            ${isXpAccessMode ? `
              <div class="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
                <span class="text-[10px] text-slate-300">Base ($129) + Access Door/Reader Licenses ($39 per Reader):</span>
                <input type="number" min="0" max="2000" value="${licRes.effectiveAccessCount || 0}" onchange="setMilestoneLicParam('accessReadersOverride', Math.max(0, parseInt(this.value,10)||0))" class="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-0.5 text-center font-mono font-bold text-amber-300" />
              </div>
            ` : ''}
          </div>

          <div class="rounded-lg border ${isAxisMode ? 'border-emerald-500/40 bg-emerald-950/20' : 'border-slate-800/90 bg-slate-900/50'} p-2 space-y-1.5">
            <div class="flex items-center justify-between gap-2">
              <label class="flex items-center gap-2 cursor-pointer select-none flex-1">
                <input type="checkbox" ${isAxisMode ? 'checked' : ''} onchange="toggleMilestoneFeature('enableAxisSecureEntry', this.checked)" class="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0" />
                <span class="text-[11px] font-bold ${isAxisMode ? 'text-emerald-300' : 'text-slate-300'}">XProtect AXIS Secure Entry (A1001 / A1610)</span>
              </label>
              <span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${isAxisMode ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'}">${isAxisMode ? `${licRes.effectiveAccessCount || 0} Doors` : 'OFF'}</span>
            </div>
            ${isAxisMode ? `
              <div class="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
                <span class="text-[10px] text-slate-300">Base ($0) + Axis Controller Door Licenses ($89 per Door):</span>
                <input type="number" min="0" max="500" value="${licRes.effectiveAccessCount || 0}" onchange="setMilestoneLicParam('axisSecureEntryDoorsOverride', Math.max(0, parseInt(this.value,10)||0))" class="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-0.5 text-center font-mono font-bold text-emerald-300" />
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Card 4: LPR, Rapid REVIEW, BriefCam XA/XE & Hospital Assist -->
        <div class="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3 space-y-2">
          <div class="text-[10px] font-bold uppercase tracking-wider text-purple-400 flex items-center justify-between">
            <span>4. LPR, Rapid REVIEW &amp; BriefCam Analytics</span>
            <a href="Datasheets/Milestone/8_Husky XA20T-XA20R Specification Sheet.pdf" target="_blank" class="text-[9px] text-purple-300 hover:underline">Husky XA PDF</a>
          </div>

          <div class="rounded-lg border ${licRes.enableLpr ? 'border-purple-500/40 bg-purple-950/20' : 'border-slate-800/90 bg-slate-900/50'} p-2 space-y-1.5">
            <div class="flex items-center justify-between gap-2">
              <label class="flex items-center gap-2 cursor-pointer select-none flex-1">
                <input type="checkbox" ${licRes.enableLpr ? 'checked' : ''} onchange="toggleMilestoneFeature('enableLpr', this.checked)" class="rounded border-slate-700 bg-slate-900 text-purple-500 focus:ring-0" />
                <span class="text-[11px] font-bold ${licRes.enableLpr ? 'text-purple-300' : 'text-slate-300'}">XProtect LPR License Plate Recognition</span>
              </label>
              <span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${licRes.enableLpr ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' : 'bg-slate-800 text-slate-400'}">${licRes.enableLpr ? `${licRes.effectiveLprCameras || 0} Lanes` : 'OFF'}</span>
            </div>
            ${licRes.enableLpr ? `
              <div class="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
                <div>
                  <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold">LPR Cameras ($1,295):</label>
                  <input type="number" min="1" max="200" value="${licRes.effectiveLprCameras || 1}" onchange="setMilestoneLicParam('lprCamerasOverride', Math.max(1, parseInt(this.value,10)||1))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-0.5 text-center font-mono font-bold text-purple-300" />
                </div>
                <div>
                  <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold">Country Packs ($645):</label>
                  <input type="number" min="1" max="20" value="${licRes.lprCountryLibs || 1}" onchange="setMilestoneLicParam('lprCountryLibs', Math.max(1, parseInt(this.value,10)||1))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-0.5 text-center font-mono font-bold text-white" />
                </div>
              </div>
            ` : ''}
          </div>

          <div class="rounded-lg border ${licRes.enableRapidReview ? 'border-sky-500/40 bg-sky-950/20' : 'border-slate-800/90 bg-slate-900/50'} p-2 space-y-1.5">
            <div class="flex items-center justify-between gap-2">
              <label class="flex items-center gap-2 cursor-pointer select-none flex-1">
                <input type="checkbox" ${licRes.enableRapidReview ? 'checked' : ''} onchange="toggleMilestoneFeature('enableRapidReview', this.checked)" class="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-0" />
                <span class="text-[11px] font-bold ${licRes.enableRapidReview ? 'text-sky-300' : 'text-slate-300'}">XProtect Rapid REVIEW / BriefCam Forensics</span>
              </label>
              <span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${licRes.enableRapidReview ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' : 'bg-slate-800 text-slate-400'}">${licRes.enableRapidReview ? `${licRes.rapidReviewCameras} Cameras` : 'OFF'}</span>
            </div>
            ${licRes.enableRapidReview ? `
              <div class="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
                <span class="text-[10px] text-slate-300">Rapid REVIEW Camera Licenses ($220 per Camera):</span>
                <input type="number" min="1" max="500" value="${licRes.rapidReviewCameras || 5}" onchange="setMilestoneLicParam('rapidReviewCameras', Math.max(1, parseInt(this.value,10)||1))" class="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-0.5 text-center font-mono font-bold text-sky-300" />
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Card 5: Transact POS, Interconnect & Arcules Hybrid Cloud -->
        <div class="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3 space-y-2">
          <div class="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center justify-between">
            <span>5. Interconnect, POS &amp; Arcules Cloud</span>
            <a href="Datasheets/Milestone/Husky GW Units Flyer.pdf" target="_blank" class="text-[9px] text-emerald-300 hover:underline">Husky GW PDF</a>
          </div>

          <div class="rounded-lg border ${licRes.enableInterconnect ? 'border-emerald-500/40 bg-emerald-950/20' : 'border-slate-800/90 bg-slate-900/50'} p-2 space-y-1.5">
            <div class="flex items-center justify-between gap-2">
              <label class="flex items-center gap-2 cursor-pointer select-none flex-1">
                <input type="checkbox" ${licRes.enableInterconnect ? 'checked' : ''} onchange="toggleMilestoneFeature('enableInterconnect', this.checked)" class="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0" />
                <span class="text-[11px] font-bold ${licRes.enableInterconnect ? 'text-emerald-300' : 'text-slate-300'}">Milestone Interconnect (<code class="text-emerald-400">XPCOMIDL</code> @ $77.76 per Camera)</span>
              </label>
              <span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${licRes.enableInterconnect ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'}">${licRes.enableInterconnect ? `${licRes.interconnectCameras || 0} Devices` : 'OFF'}</span>
            </div>
            ${licRes.enableInterconnect ? `
              <div class="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
                <span class="text-[10px] text-slate-300">Remote Interconnected Cameras (Corporate Required):</span>
                <input type="number" min="1" max="2000" value="${licRes.interconnectCameras || 8}" onchange="setMilestoneLicParam('interconnectCameras', Math.max(1, parseInt(this.value,10)||1))" class="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-0.5 text-center font-mono font-bold text-emerald-300" />
              </div>
            ` : ''}
          </div>

          <div class="rounded-lg border ${licRes.enableTransact ? 'border-amber-500/40 bg-amber-950/20' : 'border-slate-800/90 bg-slate-900/50'} p-2 space-y-1.5">
            <div class="flex items-center justify-between gap-2">
              <label class="flex items-center gap-2 cursor-pointer select-none flex-1">
                <input type="checkbox" ${licRes.enableTransact ? 'checked' : ''} onchange="toggleMilestoneFeature('enableTransact', this.checked)" class="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-0" />
                <span class="text-[11px] font-bold ${licRes.enableTransact ? 'text-amber-300' : 'text-slate-300'}">XProtect Transact POS / ATM (<code class="text-amber-400">XPTBS</code>)</span>
              </label>
              <span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${licRes.enableTransact ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-400'}">${licRes.enableTransact ? `${licRes.transactSources || 0} POS` : 'OFF'}</span>
            </div>
            ${licRes.enableTransact ? `
              <div class="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
                <span class="text-[10px] text-slate-300">POS / ATM Sources ($299 Base + $269/extra):</span>
                <input type="number" min="1" max="500" value="${licRes.transactSources || 2}" onchange="setMilestoneLicParam('transactSources', Math.max(1, parseInt(this.value,10)||1))" class="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-0.5 text-center font-mono font-bold text-amber-300" />
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Card 6: Milestone Husky IVO Turnkey Appliance Recommendation -->
        <div class="bg-slate-950/80 border border-sky-500/30 rounded-xl p-3 space-y-2">
          <div class="text-[10px] font-bold uppercase tracking-wider text-sky-400 flex items-center justify-between">
            <span>6. Milestone Husky IVO Appliance Fit</span>
            <select onchange="setMilestoneLicParam('applianceFormFactor', this.value)" class="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[10px] font-bold text-slate-200 focus:outline-none">
              <option value="rack" ${cfg.applianceFormFactor === 'rack' ? 'selected' : ''}>Rackmount (350R / 700R / 1000R / 1800R)</option>
              <option value="tower" ${cfg.applianceFormFactor === 'tower' ? 'selected' : ''}>Tower / Desktop (150D / 350T)</option>
              <option value="any" ${cfg.applianceFormFactor === 'any' ? 'selected' : ''}>Any Form Factor</option>
            </select>
          </div>
          ${prim ? `
            <div class="p-2 rounded-lg bg-sky-950/40 border border-sky-500/30 space-y-1.5">
              <div class="flex items-center justify-between">
                <span class="font-bold text-white text-[11px]">${hp.primaryQty}x ${prim.model} (${prim.sku})</span>
                <span class="font-mono font-bold text-sky-300 text-[11px]">$${(hp.primaryQty * (prim.msrp || 0)).toLocaleString()}</span>
              </div>
              <div class="text-[10px] text-slate-300 leading-snug">${hp.recordingReason || hp.recorderReason || ''}</div>
              ${typeof renderApplianceBuildOptionsAndAccessoriesHtml === 'function' ? renderApplianceBuildOptionsAndAccessoriesHtml(prim) : ''}
              <div class="flex items-center justify-between pt-1">
                <a href="${prim.datasheetPath}" target="_blank" class="text-[10px] text-sky-400 hover:underline flex items-center gap-1">
                  <i data-lucide="external-link" class="w-3 h-3"></i>
                  <span>Official Husky IVO Datasheet</span>
                </a>
                <button type="button" onclick="autoFitHuskyToBom()" class="px-2 py-0.5 rounded bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-bold cursor-pointer">
                  + Add Husky IVO to BOM
                </button>
              </div>
            </div>
          ` : `
            <div class="p-2 rounded-lg bg-slate-900/60 border border-slate-800 text-[10px] text-slate-400">
              Add cameras to the project or storage calculator to automatically size Milestone Husky IVO appliances.
            </div>
          `}
          ${hp.analyticsAppliance ? `
            <div class="p-1.5 rounded-lg bg-purple-950/30 border border-purple-500/30 flex items-center justify-between text-[10px]">
              <span class="text-purple-300 font-bold">+ ${hp.analyticsQty}x ${hp.analyticsAppliance.model} BriefCam Analytics</span>
              <span class="font-mono text-white">$${(hp.analyticsQty * (hp.analyticsAppliance.msrp || 0)).toLocaleString()}</span>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- Itemized Milestone XProtect License & Care Plus Breakdown Table -->
      <div class="bg-slate-950/90 border border-slate-800 rounded-xl overflow-hidden">
        <div class="px-3 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-300">
            Calculated Milestone XProtect 2026 R2 License &amp; Care Plus Bill of Materials (${licRes.lineItems.length} Line Items)
          </span>
          <span class="text-[11px] font-mono font-bold text-emerald-400">
            Total Software MSRP: $${(licRes.totalSoftwareMsrp || 0).toLocaleString()}
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
                ${licRes.lineItems.map(li => {
                  const isZero = Boolean(li.isIncludedZeroCost || (li.unitMsrp || 0) === 0);
                  return `
                  <tr class="${isZero ? 'bg-emerald-950/20' : 'hover:bg-slate-900/60'}">
                    <td class="py-1.5 px-3 font-bold ${isZero ? 'text-emerald-300' : 'text-sky-300'} whitespace-nowrap">${li.sku}</td>
                    <td class="py-1.5 px-3 font-sans text-slate-200">
                      <div class="font-semibold">${li.model}</div>
                      ${li.notes ? `<div class="text-[10px] ${isZero ? 'text-emerald-300/90' : 'text-slate-400'}">${li.notes}</div>` : ''}
                    </td>
                    <td class="py-1.5 px-3 text-[10px] text-slate-400 whitespace-nowrap">${li.categoryLabel || li.category || ''}</td>
                    <td class="py-1.5 px-3 text-center font-bold text-amber-300">${li.qty}</td>
                    <td class="py-1.5 px-3 text-right text-slate-300">${isZero ? '<span class="text-emerald-400 font-bold">INCLUDED ($0.00)</span>' : '$' + (li.unitMsrp || 0).toLocaleString()}</td>
                    <td class="py-1.5 px-3 text-right font-bold text-emerald-400">$${(li.extendedMsrp || 0).toLocaleString()}</td>
                  </tr>
                `;
                }).join('')}
              </tbody>
            </table>
          </div>
        ` : `
          <div class="p-4 text-center text-xs text-slate-400">
            No Milestone XProtect device licenses calculated yet. Add cameras in Initial Design, Power over Ethernet Calculator, or Physical Security.
          </div>
        `}
      </div>
    </div>
  `;
}
window.renderMilestoneLicensingBuilderHtml = renderMilestoneLicensingBuilderHtml;

function renderVmsLicensingStudioHtml(isCompactDrawer = false) {
  const isMilestone = activeVmsLicensingVendor === "milestone";
  const gRes = (typeof GenetecLicensingSizer !== "undefined") ? GenetecLicensingSizer.calculate(projectBOM) : null;
  const mRes = (typeof MilestoneLicensingSizer !== "undefined") ? MilestoneLicensingSizer.calculate(projectBOM) : null;

  return `
    <div class="space-y-3">
      <!-- Top Multi-Manufacturer VMS Licensing Switcher Bar -->
      <div class="bg-slate-900/95 border border-slate-800 rounded-2xl px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
        <div class="flex items-center gap-2.5">
          <span class="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <i data-lucide="layers" class="w-4 h-4 text-emerald-400"></i>
            <span>VMS Manufacturer &amp; Appliance Ecosystem:</span>
          </span>
          <div class="inline-flex items-center bg-slate-950 border border-slate-800 rounded-xl p-0.5 text-xs">
            <button
              type="button"
              onclick="setVmsLicensingVendor('genetec')"
              class="px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${!isMilestone ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}"
            >
              <i data-lucide="shield-check" class="w-3.5 h-3.5"></i>
              <span>Genetec Security Center 5.14 &amp; Streamvault</span>
              ${gRes ? `<span class="px-1.5 py-0.2 rounded text-[10px] font-mono ${!isMilestone ? 'bg-indigo-900/80 text-indigo-200' : 'bg-slate-900 text-slate-400'}">$${gRes.totalSoftwareMsrp.toLocaleString()}</span>` : ''}
            </button>
            <button
              type="button"
              onclick="setVmsLicensingVendor('milestone')"
              class="px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${isMilestone ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'}"
            >
              <i data-lucide="server" class="w-3.5 h-3.5"></i>
              <span>Milestone XProtect 2026 R2 &amp; Husky IVO</span>
              ${mRes ? `<span class="px-1.5 py-0.2 rounded text-[10px] font-mono ${isMilestone ? 'bg-sky-900/80 text-sky-200' : 'bg-slate-900 text-slate-400'}">$${mRes.totalSoftwareMsrp.toLocaleString()}</span>` : ''}
            </button>
          </div>
        </div>
        <div class="text-[11px] text-slate-400 font-mono">
          Compare software licensing, multi-year SMA/Care Plus, and turnkey appliances across manufacturers.
        </div>
      </div>

      ${isMilestone
        ? (mRes ? renderMilestoneLicensingBuilderHtml(mRes, isCompactDrawer) : '')
        : (gRes ? renderGenetecLicensingBuilderHtml(gRes, isCompactDrawer) : '')}
    </div>
  `;
}
window.renderVmsLicensingStudioHtml = renderVmsLicensingStudioHtml;


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
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
  if (typeof updateProjectHealthUI === "function") updateProjectHealthUI();
}
window.addDoorPackageToBom = addDoorPackageToBom;

// =========================================================================
// CLIENT WORKSTATION DECODING SIZER (Genetec Security Center 5.14.1.0 Sec 1.2 & 1.3)
// =========================================================================

let workstationSyncAllColumns = {
  heads: false,
  resolutionMp: false,
  fps: false,
  codec: false
};
window.workstationSyncAllColumns = workstationSyncAllColumns;

function ensureEditableWorkstationGroups() {
  if (typeof ClientWorkstationSizer === "undefined") return [];
  if (!Array.isArray(ClientWorkstationSizer.state.viewedGroups) || ClientWorkstationSizer.state.viewedGroups.length === 0) {
    ClientWorkstationSizer.state.viewedGroups = [
      { id: "ws_grp_1", name: "Primary Tile Grid (1080p)", qty: 16, heads: 1, resolutionMp: 2, fps: 15, codec: "H.265" }
    ];
  }
  return ClientWorkstationSizer.state.viewedGroups;
}

function addWorkstationCameraGroup() {
  const groups = ensureEditableWorkstationGroups();
  const last = groups[groups.length - 1] || {};
  const nextIdx = groups.length + 1;
  groups.push({
    id: `ws_grp_${Date.now()}_${nextIdx}`,
    name: `Viewing Grid ${nextIdx}`,
    qty: 8,
    heads: last.heads || 1,
    resolutionMp: last.resolutionMp || 4,
    fps: last.fps || 15,
    codec: last.codec || "H.265"
  });
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
  if (typeof updateProjectHealthUI === "function") updateProjectHealthUI();
}
window.addWorkstationCameraGroup = addWorkstationCameraGroup;

function duplicateWorkstationCameraGroup(index) {
  const groups = ensureEditableWorkstationGroups();
  const src = groups[index];
  if (!src) return;
  groups.splice(index + 1, 0, {
    ...src,
    id: `ws_grp_${Date.now()}_${index + 2}`,
    name: `${src.name || "Grid"} (Copy)`
  });
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
  if (typeof updateProjectHealthUI === "function") updateProjectHealthUI();
}
window.duplicateWorkstationCameraGroup = duplicateWorkstationCameraGroup;

function removeWorkstationCameraGroup(index) {
  const groups = ensureEditableWorkstationGroups();
  if (groups.length <= 1) return;
  groups.splice(index, 1);
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
  if (typeof updateProjectHealthUI === "function") updateProjectHealthUI();
}
window.removeWorkstationCameraGroup = removeWorkstationCameraGroup;

function updateWorkstationCameraGroup(index, field, val) {
  const groups = ensureEditableWorkstationGroups();
  if (!groups[index]) return;
  groups[index][field] = val;
  if (workstationSyncAllColumns && workstationSyncAllColumns[field]) {
    groups.forEach(g => {
      g[field] = val;
    });
  }
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
  if (typeof updateProjectHealthUI === "function") updateProjectHealthUI();
}
window.updateWorkstationCameraGroup = updateWorkstationCameraGroup;

function toggleWorkstationColumnSync(field, checked) {
  const isChecked = Boolean(checked);
  if (workstationSyncAllColumns && field in workstationSyncAllColumns) {
    workstationSyncAllColumns[field] = isChecked;
  }
  if (isChecked) {
    const groups = ensureEditableWorkstationGroups();
    if (groups.length > 0) {
      const masterVal = groups[0][field];
      groups.forEach(g => {
        if (masterVal !== undefined) g[field] = masterVal;
      });
    }
  }
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
  if (typeof updateProjectHealthUI === "function") updateProjectHealthUI();
}
window.toggleWorkstationColumnSync = toggleWorkstationColumnSync;

function setWorkstationSizerParam(key, val) {
  if (typeof ClientWorkstationSizer === "undefined") return;
  const st = ClientWorkstationSizer.state;
  if (key === "vmsPlatform") {
    st.vmsPlatform = val === "milestone" ? "milestone" : "genetec";
  } else if (key === "adaptiveStreaming") {
    st.adaptiveStreaming = Boolean(val);
  } else if (key === "monitorCount") {
    st.monitorCount = Math.max(1, Math.min(16, parseInt(val, 10) || 2));
  } else if (key === "workstationCount") {
    st.workstationCount = Math.max(1, Math.min(200, parseInt(val, 10) || 1));
    if (typeof setGenetecLicParam === "function") {
      setGenetecLicParam("workstationClients", st.workstationCount);
    }
  } else if (key === "usageMode") {
    st.usageMode = val === "video_wall" ? "video_wall" : "active_operator";
  } else if (key === "watermarking") {
    st.watermarking = Boolean(val);
  } else if (key === "hwAccelDecode") {
    st.hwAccelDecode = Boolean(val);
  } else if (key === "encryptedStreams") {
    st.encryptedStreams = Boolean(val);
  } else if (key === "preferredFormFactor") {
    st.preferredFormFactor = ["any", "tower", "rack"].includes(val) ? val : "any";
  }
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
  if (typeof updateProjectHealthUI === "function") updateProjectHealthUI();
}
window.setWorkstationSizerParam = setWorkstationSizerParam;

function syncWorkstationGroupsFromStorage() {
  if (typeof ClientWorkstationSizer === "undefined") return;
  let imported = [];
  if (typeof VideoStorageSizer !== "undefined" && Array.isArray(VideoStorageSizer.state?.cameraGroups) && VideoStorageSizer.state.cameraGroups.length > 0) {
    imported = VideoStorageSizer.state.cameraGroups.map((g, i) => ({
      id: `ws_sync_${Date.now()}_${i}`,
      name: g.name || `Camera Group ${i + 1}`,
      qty: Math.max(1, parseInt(g.qty, 10) || 1),
      heads: Math.max(1, parseInt(g.heads, 10) || 1),
      resolutionMp: Number(g.resolutionMp) || 4,
      fps: Number(g.fps) || 15,
      codec: g.codec || "H.265"
    }));
  } else if (typeof VideoStorageSizer !== "undefined" && typeof VideoStorageSizer.buildCameraGroupsFromBom === "function") {
    const bomGrps = VideoStorageSizer.buildCameraGroupsFromBom(projectBOM);
    imported = bomGrps.map((g, i) => ({
      id: `ws_bom_${Date.now()}_${i}`,
      name: g.name || `BOM Cameras ${i + 1}`,
      qty: Math.max(1, parseInt(g.qty, 10) || 1),
      heads: Math.max(1, parseInt(g.heads, 10) || 1),
      resolutionMp: Number(g.resolutionMp) || 4,
      fps: Number(g.fps) || 15,
      codec: g.codec || "H.265"
    }));
  }
  if (imported.length > 0) {
    ClientWorkstationSizer.state.viewedGroups = imported;
    if (typeof showToast === "function") {
      showToast(`Synced ${imported.length} camera group(s) into the Client Workstation Sizer.`, "info");
    }
    if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
  } else if (typeof showToast === "function") {
    showToast("No BOM or Storage camera groups found to sync yet.", "info");
  }
}
window.syncWorkstationGroupsFromStorage = syncWorkstationGroupsFromStorage;

function applyWorkstationPreset(presetKey) {
  if (typeof ClientWorkstationSizer === "undefined") return;
  const st = ClientWorkstationSizer.state;
  if (presetKey === "operator_16_1080p") {
    st.monitorCount = 2;
    st.usageMode = "active_operator";
    st.viewedGroups = [
      { id: "ws_p1", name: "2x2 + 3x4 Operator Grids (1080p)", qty: 16, heads: 1, resolutionMp: 2, fps: 15, codec: "H.265" }
    ];
  } else if (presetKey === "operator_32_mixed") {
    st.monitorCount = 3;
    st.usageMode = "active_operator";
    st.viewedGroups = [
      { id: "ws_p2a", name: "Overview Grid (24x 1080p)", qty: 24, heads: 1, resolutionMp: 2, fps: 15, codec: "H.265" },
      { id: "ws_p2b", name: "Call-Up Spot Monitors (8x 4K UHD)", qty: 8, heads: 1, resolutionMp: 8, fps: 30, codec: "H.265" }
    ];
  } else if (presetKey === "soc_wall_48") {
    st.monitorCount = 4;
    st.usageMode = "video_wall";
    st.viewedGroups = [
      { id: "ws_p3a", name: "4-Monitor Video Wall (36x 4MP)", qty: 36, heads: 1, resolutionMp: 4, fps: 15, codec: "H.265" },
      { id: "ws_p3b", name: "High-Detail Perimeter (12x 4K UHD)", qty: 12, heads: 1, resolutionMp: 8, fps: 15, codec: "H.265" }
    ];
  } else if (presetKey === "panoramic_multisensor") {
    st.monitorCount = 4;
    st.usageMode = "active_operator";
    st.viewedGroups = [
      { id: "ws_p4a", name: "Multi-Sensor 4-Head Cameras", qty: 6, heads: 4, resolutionMp: 4, fps: 15, codec: "H.265" },
      { id: "ws_p4b", name: "12MP 360° Fisheye De-Warping", qty: 8, heads: 1, resolutionMp: 12, fps: 15, codec: "H.265" }
    ];
  }
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
}
window.applyWorkstationPreset = applyWorkstationPreset;

function autoFitWorkstationToBom() {
  if (typeof ClientWorkstationSizer === "undefined" || typeof addToBOM !== "function") return;
  const wsCalc = ClientWorkstationSizer.calculate(projectBOM);
  const chosen = wsCalc.recommendedCatalogWorkstation;
  if (!chosen) return;
  const qty = Math.max(1, wsCalc.workstationCount * (wsCalc.workstationsNeededPerOperator || 1));
  addToBOM(chosen.id || chosen.sku, qty);
  if (typeof showToast === "function") {
    showToast(`Auto-Fitted ${qty}x ${chosen.model} (${chosen.sku}) to BOM for ${wsCalc.totalViewedStreams} simultaneously decoded streams (${wsCalc.recommendedProfile.shortLabel} tier).`, "success");
  }
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
}
window.autoFitWorkstationToBom = autoFitWorkstationToBom;

function renderWorkstationSizerStudioHtml(isFullStudio = true) {
  if (typeof ClientWorkstationSizer === "undefined") {
    return `<div class="p-4 text-slate-400 text-xs">Client Workstation Sizer engine is loading...</div>`;
  }
  const wsCalc = ClientWorkstationSizer.calculate(projectBOM);
  const isMilestoneWs = wsCalc.vmsPlatform === "milestone";
  const recProf = wsCalc.recommendedProfile || {};
  const recEv = wsCalc.recommendedProfileEvaluation || {};
  const recHw = wsCalc.recommendedCatalogWorkstation;
  const mods = wsCalc.modifiers || {};

  return `
    <div class="bg-slate-900/95 border border-slate-800 rounded-2xl p-3.5 sm:p-4 flex flex-col gap-3.5 shadow-lg">
      <!-- Row 1: Header, Multi-VMS Client Platform Switcher, Spec Reference Link, and Primary KPI Summary -->
      <div class="flex flex-col xl:flex-row xl:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div class="flex items-start sm:items-center gap-3">
          <div class="p-2.5 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400 shrink-0">
            <i data-lucide="monitor" class="w-5 h-5"></i>
          </div>
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <h4 class="text-xs font-bold text-white uppercase tracking-wider">
                Client Workstation Decoding Sizer
              </h4>
              <!-- Multi-Manufacturer VMS Client Platform Switcher -->
              <div class="inline-flex items-center bg-slate-950 border border-slate-800 rounded-xl p-0.5 text-[11px]">
                <button type="button" onclick="setWorkstationSizerParam('vmsPlatform', 'genetec')" class="px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer ${!isMilestoneWs ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}" title="Genetec Security Desk 5.14.1.0 Section 1.2 & 1.3 Decoding Benchmarks">
                  <i data-lucide="shield-check" class="w-3 h-3"></i>
                  <span>Genetec Security Desk 5.14</span>
                </button>
                <button type="button" onclick="setWorkstationSizerParam('vmsPlatform', 'milestone')" class="px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer ${isMilestoneWs ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'}" title="Milestone XProtect Smart Client 2026 & Husky IVO Viewing Station (150D-VS / 350T-VS) Benchmarks">
                  <i data-lucide="monitor" class="w-3 h-3"></i>
                  <span>Milestone Smart Client / Husky IVO VS</span>
                </button>
              </div>
              <span class="px-2 py-0.5 rounded-md bg-sky-950/80 border border-sky-700/50 text-[10px] font-mono font-bold text-sky-300">
                ${wsCalc.totalViewedCameras} Cameras (${wsCalc.totalViewedStreams} Simultaneously Decoded Streams &bull; ${wsCalc.totalPixelRateMpPerSec} MP/s)
              </span>
              ${isMilestoneWs ? `
                <button onclick="openDatasheetModal('Datasheets/Milestone/7_Milestone Husky IVO Viewing Stations flyer.pdf', 'Milestone Husky IVO 150D / 350T Viewing Station Datasheet', 'HIVO-350T-VS')" class="px-2 py-0.5 rounded-md bg-sky-950/80 hover:bg-sky-900 border border-sky-700/60 text-[10px] font-mono font-semibold text-sky-300 flex items-center gap-1 transition-all cursor-pointer" title="Open Milestone Husky IVO 150D/350T Viewing Station Datasheet PDF">
                  <i data-lucide="file-text" class="w-3 h-3"></i>
                  <span>Husky IVO Viewing Station Specification</span>
                </button>
              ` : `
                <button onclick="openDatasheetModal('Datasheets/Genetec/SystemRequirements.pdf', 'Genetec Security Center 5.14.1.0 System Requirements Guide (Pages 5-6)', 'GENETEC-SC-5.14-WS')" class="px-2 py-0.5 rounded-md bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/60 text-[10px] font-mono font-semibold text-indigo-300 flex items-center gap-1 transition-all cursor-pointer" title="Open Genetec 5.14.1.0 System Requirements PDF (Pages 5-6 Client Workstation Specifications & Decoding Performance)">
                  <i data-lucide="file-text" class="w-3 h-3"></i>
                  <span>Genetec 5.14 Specification Guide (p. 5–6)</span>
                </button>
              `}
            </div>
            <p class="text-[11px] text-slate-400 mt-0.5">
              Calculates exact CPU, GPU, RAM, Dual-GPU Monitor, and Hardware Decoding requirements for <strong class="text-white">${isMilestoneWs ? 'Milestone XProtect Smart Client 2026 &amp; Husky IVO Viewing Stations' : 'Genetec Security Desk 5.14'}</strong> based on simultaneously viewed camera tiles, resolution, frame rate, codec (<code class="text-sky-300">H.264</code> / <code class="text-sky-300">H.265</code> / <code class="text-sky-300">AV1</code>), and GPU acceleration.
            </p>
          </div>
        </div>

        <!-- Top Right KPI Strip & Auto-Fit Button -->
        <div class="flex flex-wrap items-center gap-2.5 shrink-0">
          <div class="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-slate-950 border ${wsCalc.exceedsSingleHighPerfWorkstation ? 'border-amber-600/80' : 'border-slate-800'}">
            <div>
              <div class="text-[9px] uppercase font-bold text-slate-400">Required Specification Tier</div>
              <div class="text-xs font-mono font-bold text-sky-400">${recProf.shortLabel || 'Recommended'}</div>
            </div>
            <div class="h-6 w-px bg-slate-800"></div>
            <div>
              <div class="text-[9px] uppercase font-bold text-slate-400">Decode Utilization</div>
              <div class="text-xs font-mono font-bold ${recEv.isCompliant ? 'text-emerald-400' : 'text-amber-400'}">
                ${recEv.utilizationPct || 0}% <span class="text-slate-500">/ ${recEv.safeCapPct || 80}% Cap</span>
              </div>
            </div>
            <div class="h-6 w-px bg-slate-800"></div>
            <div>
              <div class="text-[9px] uppercase font-bold text-slate-400">Recommended Appliance</div>
              <div class="text-xs font-mono font-bold text-indigo-300">${recHw ? `${recHw.sku} ($${(recHw.msrp || 0).toLocaleString()})` : 'High-Performance'}</div>
            </div>
          </div>

          <button onclick="autoFitWorkstationToBom()" class="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer" title="Add the recommended Client Workstation(s) to the Project BOM">
            <i data-lucide="wand-2" class="w-4 h-4"></i>
            <span>+ Auto-Fit ${wsCalc.workstationCount * (wsCalc.workstationsNeededPerOperator || 1)}x ${recHw ? recHw.sku : 'Workstation'}</span>
          </button>
        </div>
      </div>

      <!-- Row 2: Global Workstation Environment & Genetec 5.14 Decoding Modifiers Bar -->
      <div class="bg-slate-950/90 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-2.5">
          <!-- Operator Workstation Count -->
          <div class="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5" title="Number of Security Desk operator workstations to quote (Base package includes 5 free client connections)">
            <span class="text-[10px] font-bold uppercase text-slate-300">Operator Stations:</span>
            <input type="number" min="1" max="100" value="${wsCalc.workstationCount}" onchange="setWorkstationSizerParam('workstationCount', this.value)" class="w-12 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-center font-mono font-bold text-white text-xs focus:outline-none" />
          </div>

          <!-- Monitors per Workstation -->
          <div class="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5" title="Displays connected per workstation (Genetec 5.14 Rule: Connecting >2 monitors requires High-Performance tier with Dual GPUs)">
            <span class="text-[10px] font-bold uppercase text-slate-300">Monitors / Station:</span>
            <select onchange="setWorkstationSizerParam('monitorCount', this.value)" class="bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-sky-300 font-mono font-bold text-xs focus:outline-none cursor-pointer">
              ${[1, 2, 3, 4, 6, 8].map(m => `<option value="${m}" class="bg-slate-900" ${wsCalc.monitorCount === m ? 'selected' : ''}>${m} Monitor${m === 1 ? '' : 's'}${m > 2 ? ' (Requires Dual GPU)' : ''}</option>`).join('')}
            </select>
          </div>

          <!-- Usage Mode (Active Operator 20% Headroom vs Static Video Wall 15% Headroom) -->
          <div class="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5" title="Genetec 5.14 Page 6: Leave at least 20% headroom if the workstation is actively used by an operator (80% max decode load)">
            <span class="text-[10px] font-bold uppercase text-slate-300">Station Role:</span>
            <select onchange="setWorkstationSizerParam('usageMode', this.value)" class="bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-amber-300 font-bold text-xs focus:outline-none cursor-pointer">
              <option value="active_operator" class="bg-slate-900" ${wsCalc.usageMode === 'active_operator' ? 'selected' : ''}>Active Security Desk Operator (80% Cap / 20% Headroom)</option>
              <option value="video_wall" class="bg-slate-900" ${wsCalc.usageMode === 'video_wall' ? 'selected' : ''}>Passive Video Wall Display Only (85% Cap / 15% Headroom)</option>
            </select>
          </div>

          <!-- Form Factor Filter -->
          <div class="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5">
            <span class="text-[10px] font-bold uppercase text-slate-300">Chassis:</span>
            <select onchange="setWorkstationSizerParam('preferredFormFactor', this.value)" class="bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-slate-200 font-bold text-xs focus:outline-none cursor-pointer">
              <option value="any" class="bg-slate-900" ${wsCalc.preferredFormFactor === 'any' ? 'selected' : ''}>Any (Tower / SFF / Rack)</option>
              <option value="tower" class="bg-slate-900" ${wsCalc.preferredFormFactor === 'tower' ? 'selected' : ''}>Desktop / Tower / Mini</option>
              <option value="rack" class="bg-slate-900" ${wsCalc.preferredFormFactor === 'rack' ? 'selected' : ''}>Rackmount Workstation</option>
            </select>
          </div>
        </div>

        <!-- Genetec 5.14 Page 6 Decoding Modifiers (Watermarking, HW Accel, Encrypted Streams) -->
        <div class="flex flex-wrap items-center gap-2">
          <label class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold cursor-pointer select-none transition-all ${wsCalc.hwAccelDecode ? 'bg-emerald-950/40 border-emerald-600/50 text-emerald-300' : 'bg-slate-900 border-slate-800 text-slate-400'}" title="Hardware-accelerated GPU decoding enabled in Security Desk options">
            <input type="checkbox" ${wsCalc.hwAccelDecode ? 'checked' : ''} onchange="setWorkstationSizerParam('hwAccelDecode', this.checked)" class="w-3.5 h-3.5 rounded accent-emerald-500 cursor-pointer" />
            <span>GPU Hardware Acceleration</span>
          </label>

          <label class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold cursor-pointer select-none transition-all ${wsCalc.watermarking ? 'bg-amber-950/40 border-amber-600/50 text-amber-300' : 'bg-slate-900 border-slate-800 text-slate-400'}" title="Genetec 5.14 Page 6: Video Watermarking reduces maximum decoded streams by 10% with hardware acceleration or 30% without hardware acceleration">
            <input type="checkbox" ${wsCalc.watermarking ? 'checked' : ''} onchange="setWorkstationSizerParam('watermarking', this.checked)" class="w-3.5 h-3.5 rounded accent-amber-500 cursor-pointer" />
            <span>Video Watermarking (${wsCalc.hwAccelDecode ? '-10%' : '-30%'} Capacity)</span>
          </label>

          <label class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold cursor-pointer select-none transition-all ${wsCalc.encryptedStreams ? 'bg-rose-950/40 border-rose-600/50 text-rose-300' : 'bg-slate-900 border-slate-800 text-slate-400'}" title="Viewing encrypted streams increases CPU load by up to 40% (~28.6% stream capacity reduction)">
            <input type="checkbox" ${wsCalc.encryptedStreams ? 'checked' : ''} onchange="setWorkstationSizerParam('encryptedStreams', this.checked)" class="w-3.5 h-3.5 rounded accent-rose-500 cursor-pointer" />
            <span>Encrypted Streams (+40% CPU Load)</span>
          </label>

          ${isMilestoneWs ? `
            <label class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold cursor-pointer select-none transition-all ${wsCalc.adaptiveStreaming ? 'bg-sky-950/40 border-sky-600/50 text-sky-300' : 'bg-slate-900 border-slate-800 text-slate-400'}" title="Milestone XProtect Adaptive Streaming dynamically requests lower-resolution secondary streams for small grid tiles, increasing multi-tile decoding capacity by ~35%">
              <input type="checkbox" ${wsCalc.adaptiveStreaming ? 'checked' : ''} onchange="setWorkstationSizerParam('adaptiveStreaming', this.checked)" class="w-3.5 h-3.5 rounded accent-sky-500 cursor-pointer" />
              <span>Adaptive Streaming (+35% Tile Capacity)</span>
            </label>
          ` : ''}
        </div>
      </div>

      <!-- Row 3: Simultaneously Viewed Camera Tile Groups Table -->
      <div class="bg-slate-950/90 border border-slate-800 rounded-xl p-3 flex flex-col gap-2.5">
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-[11px] font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
              <i data-lucide="layout-grid" class="w-3.5 h-3.5 text-sky-400"></i>
              <span>Simultaneously Viewed Camera Tile Groups (${wsCalc.viewedGroups.length} Group${wsCalc.viewedGroups.length === 1 ? '' : 's'})</span>
            </span>
            <button onclick="addWorkstationCameraGroup()" class="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-bold flex items-center gap-1 shadow-sm transition-all cursor-pointer">
              <i data-lucide="plus" class="w-3.5 h-3.5"></i>
              <span>Add Viewed Tile Group</span>
            </button>
            <button onclick="syncWorkstationGroupsFromStorage()" class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer" title="Import camera groups from the Storage Calculator or Project BOM">
              <i data-lucide="refresh-cw" class="w-3 h-3 text-sky-400"></i>
              <span>Sync from Storage / BOM</span>
            </button>
          </div>

          <!-- Quick Operator Tile Layout Presets -->
          <div class="flex flex-wrap items-center gap-1.5">
            <span class="text-[10px] font-mono text-slate-400 uppercase mr-1">Quick Presets:</span>
            <button onclick="applyWorkstationPreset('operator_16_1080p')" class="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] font-semibold text-slate-300 cursor-pointer">
              16x 1080p @ 15fps (2 Monitors)
            </button>
            <button onclick="applyWorkstationPreset('operator_32_mixed')" class="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] font-semibold text-sky-300 cursor-pointer">
              24x 1080p + 8x 4K (3 Monitors)
            </button>
            <button onclick="applyWorkstationPreset('soc_wall_48')" class="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] font-semibold text-indigo-300 cursor-pointer">
              36x 4MP + 12x 4K Wall (4 Monitors)
            </button>
            <button onclick="applyWorkstationPreset('panoramic_multisensor')" class="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] font-semibold text-purple-300 cursor-pointer">
              Multi-Sensor + 12MP Fisheye
            </button>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="border-b border-slate-800 text-[9px] uppercase font-bold text-slate-400 align-bottom">
                <th class="py-1.5 px-2 min-w-[160px]">Tile Group / Monitor Assignment</th>
                <th class="py-1.5 px-1.5 w-24">Viewed Cameras</th>
                <th class="py-1.5 px-1.5 w-28">
                  <div class="flex flex-col gap-0.5">
                    <label class="inline-flex items-center gap-1 text-[8px] font-mono text-sky-300 cursor-pointer select-none">
                      <input type="checkbox" ${workstationSyncAllColumns.heads ? 'checked' : ''} onchange="toggleWorkstationColumnSync('heads', this.checked)" class="w-3 h-3 rounded accent-sky-500 cursor-pointer" />
                      <span>All Same</span>
                    </label>
                    <span>Streams per Camera</span>
                  </div>
                </th>
                <th class="py-1.5 px-1.5 min-w-[140px]">
                  <div class="flex flex-col gap-0.5">
                    <label class="inline-flex items-center gap-1 text-[8px] font-mono text-sky-300 cursor-pointer select-none">
                      <input type="checkbox" ${workstationSyncAllColumns.resolutionMp ? 'checked' : ''} onchange="toggleWorkstationColumnSync('resolutionMp', this.checked)" class="w-3 h-3 rounded accent-sky-500 cursor-pointer" />
                      <span>All Same</span>
                    </label>
                    <span>Displayed Stream Resolution</span>
                  </div>
                </th>
                <th class="py-1.5 px-1.5 w-28">
                  <div class="flex flex-col gap-0.5">
                    <label class="inline-flex items-center gap-1 text-[8px] font-mono text-sky-300 cursor-pointer select-none">
                      <input type="checkbox" ${workstationSyncAllColumns.fps ? 'checked' : ''} onchange="toggleWorkstationColumnSync('fps', this.checked)" class="w-3 h-3 rounded accent-sky-500 cursor-pointer" />
                      <span>All Same</span>
                    </label>
                    <span>Viewing FPS</span>
                  </div>
                </th>
                <th class="py-1.5 px-1.5 w-32">
                  <div class="flex flex-col gap-0.5">
                    <label class="inline-flex items-center gap-1 text-[8px] font-mono text-sky-300 cursor-pointer select-none">
                      <input type="checkbox" ${workstationSyncAllColumns.codec ? 'checked' : ''} onchange="toggleWorkstationColumnSync('codec', this.checked)" class="w-3 h-3 rounded accent-sky-500 cursor-pointer" />
                      <span>All Same</span>
                    </label>
                    <span>Compression Codec</span>
                  </div>
                </th>
                <th class="py-1.5 px-2 text-right">Decoded Streams</th>
                <th class="py-1.5 px-2 text-right">Pixel Rate (MP/s)</th>
                <th class="py-1.5 px-2 text-right">Estimated Client Mbps</th>
                <th class="py-1.5 px-2 text-right" title="Decode load on the Recommended Workstation profile">Load (${recProf.shortLabel || 'Recommended'})</th>
                <th class="py-1.5 px-1.5 text-center w-16">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/60">
              ${wsCalc.viewedGroups.map((grp, idx) => {
                const recGroupDetail = (recEv.groupDetails || [])[idx] || {};
                return `
                  <tr class="hover:bg-slate-900/50 transition-colors">
                    <td class="py-1.5 px-2">
                      <input type="text" value="${String(grp.name || `Grid ${idx + 1}`).replace(/"/g, '&quot;')}" onchange="updateWorkstationCameraGroup(${idx}, 'name', this.value)" class="w-full bg-slate-900 border border-slate-700/80 rounded px-2 py-1 text-xs font-semibold text-white focus:outline-none focus:border-sky-500" />
                    </td>
                    <td class="py-1.5 px-1.5">
                      <input type="number" min="1" max="256" value="${grp.qty}" onchange="updateWorkstationCameraGroup(${idx}, 'qty', Math.max(1, parseInt(this.value, 10) || 1))" class="w-full bg-slate-900 border border-slate-700/80 rounded px-2 py-1 text-xs font-mono font-bold text-white text-center focus:outline-none focus:border-sky-500" />
                    </td>
                    <td class="py-1.5 px-1.5">
                      <select onchange="updateWorkstationCameraGroup(${idx}, 'heads', Number(this.value))" class="w-full bg-slate-900 border border-slate-700/80 rounded px-1.5 py-1 text-slate-200 font-mono text-xs focus:outline-none cursor-pointer">
                        <option value="1" class="bg-slate-900" ${(grp.heads || 1) === 1 ? 'selected' : ''}>1x Single</option>
                        <option value="2" class="bg-slate-900" ${grp.heads === 2 ? 'selected' : ''}>2x Dual</option>
                        <option value="3" class="bg-slate-900" ${grp.heads === 3 ? 'selected' : ''}>3x Triple</option>
                        <option value="4" class="bg-slate-900" ${grp.heads === 4 ? 'selected' : ''}>4x Quad</option>
                        <option value="5" class="bg-slate-900" ${grp.heads === 5 ? 'selected' : ''}>5x (4-Head+PTZ)</option>
                      </select>
                    </td>
                    <td class="py-1.5 px-1.5">
                      <select onchange="updateWorkstationCameraGroup(${idx}, 'resolutionMp', Number(this.value))" class="w-full bg-slate-900 border border-slate-700/80 rounded px-1.5 py-1 text-white font-bold text-xs focus:outline-none cursor-pointer">
                        ${[
                          { mp: 0.4, label: "0.4MP (CIF / Low-Res Tile)" },
                          { mp: 1, label: "1MP (720p HD)" },
                          { mp: 2, label: "2MP (1080p Full HD)" },
                          { mp: 3, label: "3MP (2048x1536)" },
                          { mp: 4, label: "4MP (1440p QHD)" },
                          { mp: 5, label: "5MP (2592x1944)" },
                          { mp: 6, label: "6MP (3072x2048)" },
                          { mp: 8, label: "8MP (4K Ultra HD)" },
                          { mp: 12, label: "12MP (360° Fisheye)" },
                          { mp: 16, label: "16MP (Panoramic)" }
                        ].map(r => `<option value="${r.mp}" class="bg-slate-900" ${Number(grp.resolutionMp) === r.mp ? 'selected' : ''}>${r.label}</option>`).join('')}
                      </select>
                    </td>
                    <td class="py-1.5 px-1.5">
                      <select onchange="updateWorkstationCameraGroup(${idx}, 'fps', Number(this.value))" class="w-full bg-slate-900 border border-slate-700/80 rounded px-1.5 py-1 text-white font-bold text-xs focus:outline-none cursor-pointer">
                        ${[1, 2, 5, 10, 12, 15, 20, 24, 30, 60].map(f => `<option value="${f}" class="bg-slate-900" ${Number(grp.fps) === f ? 'selected' : ''}>${f} FPS</option>`).join('')}
                      </select>
                    </td>
                    <td class="py-1.5 px-1.5">
                      <select onchange="updateWorkstationCameraGroup(${idx}, 'codec', this.value)" class="w-full bg-slate-900 border border-slate-700/80 rounded px-1.5 py-1 text-sky-300 font-bold text-xs focus:outline-none cursor-pointer">
                        <option value="H.264" class="bg-slate-900" ${grp.codec === 'H.264' ? 'selected' : ''}>H.264 (AVC)</option>
                        <option value="H.265" class="bg-slate-900" ${grp.codec === 'H.265' ? 'selected' : ''}>H.265 (HEVC)</option>
                        <option value="AV1" class="bg-slate-900" ${grp.codec === 'AV1' ? 'selected' : ''}>AV1 (Genetec 5.14)</option>
                      </select>
                    </td>
                    <td class="py-1.5 px-2 text-right font-mono font-bold text-white">${recGroupDetail.streams || (grp.qty * (grp.heads || 1))} Streams</td>
                    <td class="py-1.5 px-2 text-right font-mono text-sky-300">${recGroupDetail.pixelRateMpPerSec || 0} MP/s</td>
                    <td class="py-1.5 px-2 text-right font-mono text-purple-300">${recGroupDetail.estimatedBandwidthMbps || 0} Mbps</td>
                    <td class="py-1.5 px-2 text-right font-mono">
                      <span class="font-bold ${(recGroupDetail.groupLoadPct || 0) <= 80 ? 'text-emerald-400' : 'text-amber-400'}">${recGroupDetail.groupLoadPct || 0}%</span>
                      <span class="text-[9px] text-slate-500 block">of ${recGroupDetail.effectiveMaxStreams || 0} Maximum</span>
                    </td>
                    <td class="py-1.5 px-1.5 text-center">
                      <div class="flex items-center justify-center gap-1">
                        <button onclick="duplicateWorkstationCameraGroup(${idx})" class="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-sky-300 transition-colors cursor-pointer" title="Duplicate tile group">
                          <i data-lucide="copy" class="w-3.5 h-3.5"></i>
                        </button>
                        ${wsCalc.viewedGroups.length > 1 ? `
                          <button onclick="removeWorkstationCameraGroup(${idx})" class="p-1 rounded hover:bg-rose-950/80 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer" title="Remove tile group">
                            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                          </button>
                        ` : ''}
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Row 4: Genetec 5.14.1.0 Section 1.2 & 1.3 Hardware Profile Comparison Cards (Minimum vs Recommended vs High-Performance) -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-3">
        ${(wsCalc.profileEvaluations || []).map(ev => {
          const prof = ev.profile || {};
          const isRec = prof.id === wsCalc.recommendedProfileKey;
          const barPct = Math.min(100, Math.round(ev.utilizationPct || 0));
          const barColor = !ev.isDecodeCompliant
            ? "bg-rose-500"
            : !ev.isMonitorCompliant
              ? "bg-amber-500"
              : (barPct > 70 ? "bg-amber-400" : "bg-emerald-500");

          return `
            <div class="rounded-xl p-3.5 border flex flex-col justify-between gap-2.5 transition-all ${
              isRec
                ? 'bg-sky-950/25 border-sky-500/70 shadow-lg ring-1 ring-sky-500/30'
                : (ev.isCompliant ? 'bg-slate-950/90 border-slate-800' : 'bg-slate-950/60 border-slate-800/70 opacity-85')
            }">
              <div class="space-y-2">
                <div class="flex items-center justify-between gap-2">
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-black uppercase tracking-wider ${isRec ? 'text-sky-300' : 'text-white'}">${prof.shortLabel} Profile</span>
                    ${isRec ? `<span class="px-2 py-0.5 rounded bg-sky-500/20 border border-sky-400/50 text-sky-200 text-[9px] font-mono font-bold uppercase">★ Required Specification</span>` : ''}
                  </div>
                  <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    ev.isCompliant
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60'
                      : 'bg-rose-950 text-rose-300 border border-rose-700/60'
                  }">
                    ${ev.isCompliant ? `✓ PASS (${ev.utilizationPct}%)` : (!ev.isMonitorCompliant ? `⚠ MAXIMUM ${prof.maxMonitors} MONITORS` : `✗ OVERLOAD (${ev.utilizationPct}%)`)}
                  </span>
                </div>

                <!-- Utilization Progress Bar with 80%/85% Operator Headroom Marker -->
                <div class="space-y-1">
                  <div class="flex items-center justify-between text-[10px] font-mono">
                    <span class="text-slate-400">Decoding Load vs Safe Cap (${ev.safeCapPct}%):</span>
                    <span class="font-bold ${ev.isDecodeCompliant ? 'text-emerald-400' : 'text-rose-400'}">${ev.utilizationPct}% / ${ev.safeCapPct}%</span>
                  </div>
                  <div class="w-full h-2 rounded-full bg-slate-900 border border-slate-800 overflow-hidden relative">
                    <div class="h-full ${barColor} transition-all" style="width: ${barPct}%"></div>
                  </div>
                </div>

                <!-- Genetec 5.14.1.0 Section 1.2 Hardware Spec Breakdown -->
                <div class="bg-slate-900/90 border border-slate-800/90 rounded-lg p-2.5 space-y-1 text-[10px] font-mono">
                  <div class="flex justify-between gap-2"><span class="text-slate-400">CPU:</span><span class="text-white font-semibold text-right">${prof.cpuSpec}</span></div>
                  <div class="flex justify-between gap-2"><span class="text-slate-400">GPU:</span><span class="text-sky-300 font-semibold text-right">${prof.gpuSpec}</span></div>
                  <div class="flex justify-between gap-2"><span class="text-slate-400">Memory &amp; Disk:</span><span class="text-slate-200 text-right">${prof.ramGb} GB RAM &bull; ${prof.osDriveSpec}</span></div>
                  <div class="flex justify-between gap-2"><span class="text-slate-400">Display Support:</span><span class="text-amber-300 text-right">${prof.monitorSpec}</span></div>
                </div>

                <!-- Genetec 5.14.1.0 Section 1.3 (Page 6) Benchmark Stream Capacities at 30 FPS -->
                <div class="grid grid-cols-3 gap-1.5 text-center text-[9px] font-mono pt-0.5">
                  <div class="p-1.5 rounded bg-slate-900/70 border border-slate-800">
                    <div class="text-slate-400">H.264 @ 30fps</div>
                    <div class="font-bold text-white">${ev.benchmarks30Fps.fhd1080p_h264}x 1080p</div>
                    <div class="text-sky-300">${ev.benchmarks30Fps.uhd4k_h264}x 4K UHD</div>
                  </div>
                  <div class="p-1.5 rounded bg-slate-900/70 border border-slate-800">
                    <div class="text-slate-400">H.265 @ 30fps</div>
                    <div class="font-bold text-white">${ev.benchmarks30Fps.fhd1080p_h265}x 1080p</div>
                    <div class="text-sky-300">${ev.benchmarks30Fps.uhd4k_h265}x 4K UHD</div>
                  </div>
                  <div class="p-1.5 rounded bg-slate-900/70 border border-slate-800">
                    <div class="text-slate-400">AV1 @ 30fps</div>
                    <div class="font-bold text-white">${ev.benchmarks30Fps.fhd1080p_av1}x 1080p</div>
                    <div class="text-sky-300">${ev.benchmarks30Fps.uhd4k_av1}x 4K UHD</div>
                  </div>
                </div>
              </div>

              <div class="text-[10px] text-slate-400 border-t border-slate-800/80 pt-2 flex items-center justify-between">
                <span>${isMilestoneWs ? 'Husky IVO Match' : 'Streamvault Match'}: <strong class="${isMilestoneWs ? 'text-sky-300' : 'text-indigo-300'}">${prof.recommendedHuskySku || prof.recommendedStreamvaultSku || 'Custom'}</strong></span>
                <span>${prof.referencePage}</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Row 5: Engineering Findings & Matched Catalog Workstations -->
      <div class="grid grid-cols-1 xl:grid-cols-12 gap-3 pt-1">
        <div class="xl:col-span-5 bg-slate-950/90 border border-slate-800 rounded-xl p-3 space-y-2">
          <div class="text-[10px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <i data-lucide="cpu" class="w-3.5 h-3.5 text-sky-400"></i>
            <span>${isMilestoneWs ? 'Milestone Smart Client 2026 &amp; Husky IVO VS Decoding Notes' : 'Genetec 5.14.1.0 Decoding Math &amp; Engineering Notes'}</span>
          </div>
          <div class="space-y-1.5">
            ${(wsCalc.findings || []).map(f => `
              <div class="px-2.5 py-1.5 rounded-lg text-[10px] font-medium flex items-start gap-1.5 ${
                f.severity === 'warning'
                  ? 'bg-amber-950/70 border border-amber-700/70 text-amber-200'
                  : f.severity === 'success'
                    ? 'bg-emerald-950/50 border border-emerald-700/60 text-emerald-200'
                    : 'bg-sky-950/50 border border-sky-700/60 text-sky-200'
              }">
                <i data-lucide="${f.severity === 'warning' ? 'alert-triangle' : f.severity === 'success' ? 'check-circle-2' : 'info'}" class="w-3.5 h-3.5 shrink-0 mt-0.5"></i>
                <span>${f.text}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="xl:col-span-7 bg-slate-950/90 border border-slate-800 rounded-xl p-3 space-y-2">
          <div class="flex items-center justify-between gap-2">
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <i data-lucide="package-check" class="w-3.5 h-3.5 text-indigo-400"></i>
              <span>Matched Client Workstations (Streamvault SVW / Milestone Husky IVO VS / Dell / BCDVideo)</span>
            </span>
            <span class="text-[10px] font-mono text-slate-400">Click + Add to quote into Project BOM</span>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-72 overflow-y-auto custom-scrollbar pr-1">
            ${(wsCalc.matchedCatalogWorkstations || []).map(w => `
              <div class="p-2.5 rounded-xl border flex flex-col justify-between gap-1.5 ${
                recHw && recHw.id === w.id
                  ? 'bg-indigo-950/40 border-indigo-500/60'
                  : (w.meetsSpec ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-900/40 border-slate-800/50 opacity-60')
              }">
                <div class="flex items-start justify-between gap-2">
                  <div>
                    <div class="flex items-center gap-1.5">
                      <span class="text-xs font-bold text-white">${w.sku}</span>
                      ${recHw && recHw.id === w.id ? `<span class="px-1.5 py-0.2 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[9px] font-mono font-bold">BEST FIT</span>` : ''}
                    </div>
                    <div class="text-[10px] text-slate-300">${w.vendor} &bull; ${w.formFactor}</div>
                  </div>
                  <span class="text-xs font-mono font-bold text-emerald-400">$${(w.msrp || 0).toLocaleString()}</span>
                </div>
                <div class="text-[9.5px] font-mono text-slate-400 leading-snug">
                  ${w.processor} &bull; ${w.ramGb}GB RAM &bull; ${w.gpu} &bull; Up to ${w.maxMonitors} Monitors
                </div>
                ${typeof renderApplianceBuildOptionsAndAccessoriesHtml === 'function' ? renderApplianceBuildOptionsAndAccessoriesHtml(w) : ''}
                <div class="flex items-center justify-between pt-1 border-t border-slate-800/80">
                  <span class="text-[9px] font-mono ${w.meetsSpec ? 'text-emerald-400' : 'text-rose-400'}">
                    ${w.meetsSpec ? '✓ Meets Viewed Stream Specification' : 'Below Required Tier/Monitors'}
                  </span>
                  <button onclick="addToBOM('${w.id}', ${wsCalc.workstationCount}); if(typeof showToast==='function') showToast('Added ${wsCalc.workstationCount}x ${w.sku} to BOM.', 'success');" class="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold cursor-pointer">
                    + Add ${wsCalc.workstationCount}x to BOM
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}
window.renderWorkstationSizerStudioHtml = renderWorkstationSizerStudioHtml;

// =========================================================================
// DOORS & ACCESS CONTROL SCHEDULE BUILDER STUDIO
// (EN.Synergis Supported Hardware and Features 12.0_3.3_5.14.xlsx & Milestone XProtect Access)
// =========================================================================

const DOOR_BUILDER_PRESETS = {
  standard_strike: {
    id: "standard_strike",
    vendor: "mercury",
    label: "Mercury LP1502 • Standard Interior / Mortise Strike Door (2-Door Panel)",
    controllerId: "mercury-lp1502",
    controllerLabel: "Mercury LP1502 (2-Door Intelligent Controller via Cloud Link)",
    doorsPerController: 2,
    requiresCloudLink: true,
    isGenetecSuppliedHardware: true,
    readerId: "hid-signo-40",
    readerLabel: "HID Signo 40 OSDP/BLE Wall Reader",
    lockId: "hes-1006-electric-strike",
    lockLabel: "HES 1006 Series Heavy-Duty Electric Strike",
    rexId: "bosch-ds160-rex",
    rexLabel: "Bosch DS160 Request-to-Exit PIR Sensor",
    dpsId: "gri-180-12-dps",
    dpsLabel: "GRI 180-12 Recessed Door Position Switch",
    enclosureId: "altronix-trove2m2",
    enclosureLabel: "Altronix Trove2M2 Enclosure (Up to 8 Doors / 4 Panels)",
    lockMilliamps12v: 450
  },
  rim_exit_strike: {
    id: "rim_exit_strike",
    vendor: "mercury",
    label: "Mercury LP1502 • Crash-Bar Rim Exit Device Door (2-Door Panel)",
    controllerId: "mercury-lp1502",
    controllerLabel: "Mercury LP1502 (2-Door Intelligent Controller via Cloud Link)",
    doorsPerController: 2,
    requiresCloudLink: true,
    isGenetecSuppliedHardware: true,
    readerId: "hid-signo-40",
    readerLabel: "HID Signo 40 OSDP/BLE Wall Reader",
    lockId: "hes-9600-surface-strike",
    lockLabel: "HES 9600 Surface-Mount Rim Exit Strike",
    rexId: "bosch-ds160-rex",
    rexLabel: "Bosch DS160 Request-to-Exit PIR Sensor",
    dpsId: "gri-180-12-dps",
    dpsLabel: "GRI 180-12 Recessed Door Position Switch",
    enclosureId: "altronix-trove2m2",
    enclosureLabel: "Altronix Trove2M2 Enclosure (Up to 8 Doors / 4 Panels)",
    lockMilliamps12v: 450
  },
  perimeter_maglock: {
    id: "perimeter_maglock",
    vendor: "mercury",
    label: "Mercury LP1502 • Perimeter / Double-Glass Maglock Door (1200 lb)",
    controllerId: "mercury-lp1502",
    controllerLabel: "Mercury LP1502 (2-Door Intelligent Controller via Cloud Link)",
    doorsPerController: 2,
    requiresCloudLink: true,
    isGenetecSuppliedHardware: true,
    readerId: "hid-signo-40",
    readerLabel: "HID Signo 40 OSDP/BLE Wall Reader",
    lockId: "securitron-m62-maglock",
    lockLabel: "Securitron M62 1200lb Weatherproof Maglock",
    rexId: "bosch-ds160-rex",
    rexLabel: "Bosch DS160 Request-to-Exit PIR Sensor",
    dpsId: "sentrol-1078c-dps",
    dpsLabel: "Sentrol 1078C Armored Steel Door Contact",
    enclosureId: "altronix-trove2m2",
    enclosureLabel: "Altronix Trove2M2 Enclosure (Up to 8 Doors / 4 Panels)",
    lockMilliamps12v: 250
  },
  mercury_mp1502_strike: {
    id: "mercury_mp1502_strike",
    vendor: "mercury_mp",
    label: "Mercury MP1502 (SC 5.12.1+ Native) • Next-Gen 2-Door OSDP Controller Kit",
    controllerId: "mercury-lp1502",
    controllerLabel: "Mercury MP1502 Next-Gen 2-Door Controller (Up to 32/Cloud Link)",
    doorsPerController: 2,
    requiresCloudLink: true,
    isGenetecSuppliedHardware: true,
    readerId: "hid-signo-40",
    readerLabel: "HID Signo 40 OSDP Secure Channel Reader",
    lockId: "hes-1006-electric-strike",
    lockLabel: "HES 1006 Series Heavy-Duty Electric Strike",
    rexId: "bosch-ds160-rex",
    rexLabel: "Bosch DS160 Request-to-Exit PIR Sensor",
    dpsId: "gri-180-12-dps",
    dpsLabel: "GRI 180-12 Recessed Door Position Switch",
    enclosureId: "altronix-trove2m2",
    enclosureLabel: "Altronix Trove2M2 Enclosure (Up to 8 Doors / 4 MP Panels)",
    lockMilliamps12v: 450
  },
  axis_pbg_a1610: {
    id: "axis_pbg_a1610",
    vendor: "axis_pbg",
    label: "Axis A1610 Powered by Genetec • 2-Door PoE+ Direct IP (0 Cloud Links Needed!)",
    controllerId: "axis-a1001",
    controllerLabel: "Axis A1610 Powered by Genetec (2-Door • 250k Cardholders • Direct to Access Mgr)",
    doorsPerController: 2,
    requiresCloudLink: false,
    isGenetecSuppliedHardware: true,
    readerId: "hid-signo-40",
    readerLabel: "HID Signo 40 OSDP/BLE Wall Reader",
    lockId: "hes-1006-electric-strike",
    lockLabel: "HES 1006 Series Heavy-Duty Electric Strike",
    rexId: "bosch-ds160-rex",
    rexLabel: "Bosch DS160 Request-to-Exit PIR Sensor",
    dpsId: "gri-180-12-dps",
    dpsLabel: "GRI 180-12 Recessed Door Position Switch",
    enclosureId: null,
    enclosureLabel: "Plenum PoE+ Edge Mount (Direct IP to Security Center — 0 Cloud Links)",
    lockMilliamps12v: 450
  },
  ip_edge_door: {
    id: "ip_edge_door",
    vendor: "axis",
    label: "Axis A1001 • Single-Door PoE+ IP Edge Controller Kit",
    controllerId: "axis-a1001",
    controllerLabel: "Axis A1001 Network PoE+ Door Controller (30/Cloud Link or Milestone Secure Entry)",
    doorsPerController: 1,
    requiresCloudLink: true,
    isGenetecSuppliedHardware: false,
    readerId: "hid-signo-40",
    readerLabel: "HID Signo 40 OSDP/BLE Wall Reader",
    lockId: "hes-1006-electric-strike",
    lockLabel: "HES 1006 Series Heavy-Duty Electric Strike",
    rexId: "bosch-ds160-rex",
    rexLabel: "Bosch DS160 Request-to-Exit PIR Sensor",
    dpsId: "gri-180-12-dps",
    dpsLabel: "GRI 180-12 Recessed Door Position Switch",
    enclosureId: null,
    enclosureLabel: "Plenum Above-Door PoE+ Edge Mount",
    lockMilliamps12v: 450
  },
  axis_rim_exit: {
    id: "axis_rim_exit",
    vendor: "axis",
    label: "Axis A1001 • Crash-Bar Rim Exit PoE+ IP Edge Door Kit",
    controllerId: "axis-a1001",
    controllerLabel: "Axis A1001 Network PoE+ Door Controller",
    doorsPerController: 1,
    requiresCloudLink: true,
    isGenetecSuppliedHardware: false,
    readerId: "hid-signo-40",
    readerLabel: "HID Signo 40 OSDP/BLE Wall Reader",
    lockId: "hes-9600-surface-strike",
    lockLabel: "HES 9600 Surface-Mount Rim Exit Strike",
    rexId: "bosch-ds160-rex",
    rexLabel: "Bosch DS160 Request-to-Exit PIR Sensor",
    dpsId: "gri-180-12-dps",
    dpsLabel: "GRI 180-12 Recessed Door Position Switch",
    enclosureId: null,
    enclosureLabel: "Plenum Above-Door PoE+ Edge Mount",
    lockMilliamps12v: 450
  },
  scl312_osdp_direct: {
    id: "scl312_osdp_direct",
    vendor: "scl312",
    label: "Synergis Cloud Link-312 • 12x RS-485 Direct OSDP Bus (Up to 48 Readers / 24 Doors)",
    controllerId: "genetec-synergis-cloudlink",
    controllerLabel: "Synergis Cloud Link-312 (12x RS-485 Ports • 32 OSDP I/O • 48 OSDP Readers)",
    doorsPerController: 24,
    requiresCloudLink: false,
    isGenetecSuppliedHardware: true,
    readerId: "hid-signo-40",
    readerLabel: "HID Signo 40 OSDP Direct RS-485 Bus Reader",
    lockId: "hes-1006-electric-strike",
    lockLabel: "HES 1006 Series Heavy-Duty Electric Strike",
    rexId: "bosch-ds160-rex",
    rexLabel: "Bosch DS160 Request-to-Exit PIR Sensor",
    dpsId: "gri-180-12-dps",
    dpsLabel: "GRI 180-12 Recessed Door Position Switch",
    enclosureId: "altronix-trove2m2",
    enclosureLabel: "Synergis Cloud Link-312 Direct RS-485 OSDP Architecture",
    lockMilliamps12v: 450
  }
};

function setDoorBuilderParam(key, val) {
  if (key === "acsPlatform") {
    doorBuilderAcsPlatform = val;
    window.doorBuilderAcsPlatform = val;
  } else if (key === "controllerVendor") {
    doorBuilderControllerVendor = val;
    window.doorBuilderControllerVendor = val;
    const defaultPresetMap = {
      mercury: "standard_strike",
      mercury_mp: "mercury_mp1502_strike",
      axis_pbg: "axis_pbg_a1610",
      axis: "ip_edge_door",
      scl312: "scl312_osdp_direct"
    };
    const targetPreset = defaultPresetMap[val] || "standard_strike";
    doorScheduleGroups.forEach(g => {
      g.preset = targetPreset;
    });
  }
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
  if (typeof updateProjectHealthUI === "function") updateProjectHealthUI();
}
window.setDoorBuilderParam = setDoorBuilderParam;

let doorScheduleGroups = [
  { id: "door_grp_1", name: "Main Lobby & Perimeter Entrances", preset: "rim_exit_strike", doorQty: 4, readersPerDoor: 1 },
  { id: "door_grp_2", name: "Interior Office & IDF/MDF Doors", preset: "standard_strike", doorQty: 8, readersPerDoor: 1 }
];
window.doorScheduleGroups = doorScheduleGroups;

function addDoorScheduleGroup() {
  const nextIdx = doorScheduleGroups.length + 1;
  doorScheduleGroups.push({
    id: `door_grp_${Date.now()}_${nextIdx}`,
    name: `Door Group ${nextIdx}`,
    preset: "standard_strike",
    doorQty: 2,
    readersPerDoor: 1
  });
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
}
window.addDoorScheduleGroup = addDoorScheduleGroup;

function duplicateDoorScheduleGroup(index) {
  const src = doorScheduleGroups[index];
  if (!src) return;
  doorScheduleGroups.splice(index + 1, 0, {
    ...src,
    id: `door_grp_${Date.now()}_${index + 2}`,
    name: `${src.name || "Door Group"} (Copy)`
  });
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
}
window.duplicateDoorScheduleGroup = duplicateDoorScheduleGroup;

function removeDoorScheduleGroup(index) {
  if (doorScheduleGroups.length <= 1) return;
  doorScheduleGroups.splice(index, 1);
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
}
window.removeDoorScheduleGroup = removeDoorScheduleGroup;

function updateDoorScheduleGroup(index, field, val) {
  if (!doorScheduleGroups[index]) return;
  doorScheduleGroups[index][field] = val;
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
}
window.updateDoorScheduleGroup = updateDoorScheduleGroup;

function calculateDoorScheduleRollup() {
  let totalDoors = 0;
  let totalReaders = 0;
  let genetecSuppliedReaders = 0;
  let externalReaders = 0;
  let mercuryDoors = 0;
  let mercuryReaders = 0;
  let axisPbgDoors = 0;
  let axisStandardDoors = 0;
  let scl312Doors = 0;
  let scl312Readers = 0;
  let edgePoEDoors = 0;
  let totalLockCurrentMa = 0;
  const partTotals = {};

  const addPart = (id, qty) => {
    if (!id || !(qty > 0)) return;
    partTotals[id] = (partTotals[id] || 0) + qty;
  };

  const rows = doorScheduleGroups.map(grp => {
    const p = DOOR_BUILDER_PRESETS[grp.preset] || DOOR_BUILDER_PRESETS.standard_strike;
    const doors = Math.max(1, parseInt(grp.doorQty, 10) || 1);
    const rdrPerDoor = Math.max(1, Math.min(2, parseInt(grp.readersPerDoor, 10) || 1));
    const readers = doors * rdrPerDoor;
    const controllers = Math.ceil(doors / (p.doorsPerController || 2));
    const lockMa = doors * (p.lockMilliamps12v || 450) + readers * 180;

    totalDoors += doors;
    totalReaders += readers;
    totalLockCurrentMa += lockMa;

    if (p.isGenetecSuppliedHardware) {
      genetecSuppliedReaders += readers;
    } else {
      externalReaders += readers;
    }

    if (p.vendor === "axis_pbg") {
      axisPbgDoors += doors;
      edgePoEDoors += doors;
      addPart("axis-a1001", controllers);
    } else if (p.vendor === "axis" || p.id === "ip_edge_door" || p.id === "axis_rim_exit") {
      axisStandardDoors += doors;
      edgePoEDoors += doors;
      addPart("axis-a1001", controllers);
    } else if (p.vendor === "scl312") {
      scl312Doors += doors;
      scl312Readers += readers;
    } else {
      mercuryDoors += doors;
      mercuryReaders += readers;
    }

    addPart(p.readerId, readers);
    addPart(p.lockId, doors);
    addPart(p.rexId, doors);
    addPart(p.dpsId, doors);

    return {
      ...grp,
      presetObj: p,
      doors,
      readersPerDoor: rdrPerDoor,
      readers,
      controllers,
      lockMa
    };
  });

  const totalMercuryControllers = mercuryDoors > 0 ? Math.ceil(mercuryDoors / 2) : 0;
  const totalTroveEnclosures = totalMercuryControllers > 0 ? Math.ceil(totalMercuryControllers / 4) : 0;
  if (totalMercuryControllers > 0) addPart("mercury-lp1502", totalMercuryControllers);
  if (totalTroveEnclosures > 0) addPart("altronix-trove2m2", totalTroveEnclosures);

  // Synergis Cloud Link Sizing (EN.Synergis Supported Hardware and Features 12.0_3.3_5.14.xlsx):
  // - Standard Synergis Cloud Link: max 32 Mercury LP/MP panels, max 30 Axis A1001/A1601, max 256 readers
  // - Axis Powered by Genetec (A1210/A1610/A1710-B/A1810-B): connects directly to Access Manager (0 Cloud Links!)
  // - Synergis Cloud Link-312: 12x RS-485 ports, max 48 OSDP non-transparent readers / 24 doors
  const sclForMercuryAndAxis = (totalMercuryControllers > 0 || axisStandardDoors > 0)
    ? Math.max(
        Math.ceil(totalMercuryControllers / 32),
        Math.ceil(axisStandardDoors / 30),
        Math.ceil((mercuryReaders + axisStandardDoors) / 256)
      )
    : 0;
  const scl312Units = scl312Readers > 0 ? Math.ceil(Math.max(scl312Readers / 48, scl312Doors / 24)) : 0;
  const totalCloudLinksRequired = doorBuilderAcsPlatform === "genetec_synergis"
    ? (sclForMercuryAndAxis + scl312Units)
    : 0;
  if (totalCloudLinksRequired > 0) {
    addPart("genetec-synergis-cloudlink", totalCloudLinksRequired);
  }

  return {
    rows,
    totalDoors,
    totalReaders,
    genetecSuppliedReaders,
    externalReaders,
    mercuryDoors,
    axisPbgDoors,
    axisStandardDoors,
    scl312Doors,
    edgePoEDoors,
    totalMercuryControllers,
    totalTroveEnclosures,
    totalCloudLinksRequired,
    scl312Units,
    totalLockCurrentAmps: Math.round((totalLockCurrentMa / 1000) * 100) / 100,
    partTotals
  };
}

function addFullDoorScheduleToBom() {
  if (typeof addToBOM !== "function") return;
  const rollup = calculateDoorScheduleRollup();
  Object.entries(rollup.partTotals).forEach(([partId, qty]) => {
    addToBOM(partId, qty);
  });
  if (doorBuilderAcsPlatform === "milestone_xpaccess" && typeof setMilestoneLicParam === "function") {
    setMilestoneLicParam("enableAccessControl", true);
    setMilestoneLicParam("accessReadersOverride", rollup.totalReaders);
  } else if (doorBuilderAcsPlatform === "milestone_axis_secure_entry" && typeof setMilestoneLicParam === "function") {
    toggleMilestoneFeature("enableAxisSecureEntry", true);
    setMilestoneLicParam("axisSecureEntryDoorsOverride", rollup.totalDoors);
  } else if (typeof setGenetecLicParam === "function") {
    setGenetecLicParam("synergisGenetecReaders", rollup.genetecSuppliedReaders);
    setGenetecLicParam("synergisExternalReaders", rollup.externalReaders);
  }
  if (typeof showToast === "function") {
    showToast(`Added ${rollup.totalDoors}-Door Schedule (${rollup.totalReaders} Readers, ${rollup.totalMercuryControllers} Mercury LP/MP Panels, ${rollup.edgePoEDoors} Axis Controllers, ${rollup.totalCloudLinksRequired} Synergis Cloud Links) to Project BOM.`, "success");
  }
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
  if (typeof updateProjectHealthUI === "function") updateProjectHealthUI();
}
window.addFullDoorScheduleToBom = addFullDoorScheduleToBom;

function renderDoorBuilderStudioHtml(isFullStudio = true) {
  const rollup = calculateDoorScheduleRollup();
  return `
    <div class="bg-slate-900/95 border border-slate-800 rounded-2xl p-3.5 sm:p-4 flex flex-col gap-3.5 shadow-lg">
      <!-- Header, Multi-Vendor Controller & ACS Head-End Selector, and KPI Rollup -->
      <div class="flex flex-col xl:flex-row xl:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div class="flex items-start sm:items-center gap-3">
          <div class="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shrink-0">
            <i data-lucide="door-open" class="w-5 h-5"></i>
          </div>
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <h4 class="text-xs font-bold text-white uppercase tracking-wider">
                Access Control Door Schedule &amp; Multi-Manufacturer Kit Builder
              </h4>
              <span class="px-2 py-0.5 rounded-md bg-amber-950/80 border border-amber-700/50 text-[10px] font-mono font-bold text-amber-300">
                ${rollup.totalDoors} Doors &bull; ${rollup.totalReaders} OSDP Readers &bull; ${rollup.totalMercuryControllers} Mercury LP/MP &bull; ${rollup.edgePoEDoors} Axis PoE+ &bull; ${rollup.totalCloudLinksRequired} Cloud Link(s)
              </span>
              <a href="Datasheets/Genetec/EN.Synergis Supported Hardware and Features 12.0_3.3_5.14.xlsx" target="_blank" class="text-[10px] text-purple-400 hover:underline flex items-center gap-1">
                <i data-lucide="file-spreadsheet" class="w-3 h-3"></i>
                <span>Synergis 12.0 / SCL 3.3 Hardware Matrix</span>
              </a>
            </div>
            <p class="text-[11px] text-slate-400 mt-0.5">
              Build multi-zone door schedules across <strong class="text-white">Mercury LP/MP Series (LP1502 / MP1502)</strong>, <strong class="text-emerald-300">Axis Powered by Genetec (A1610/A1210 — 0 Cloud Links!)</strong>, <strong class="text-sky-300">Axis A1001</strong>, and <strong class="text-purple-300">Synergis Cloud Link-312 (12x RS-485 OSDP)</strong> with live <strong class="text-indigo-300">Genetec Synergis</strong> / <strong class="text-sky-300">Milestone XProtect Access</strong> licensing sync.
            </p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2.5 shrink-0">
          <!-- Controller Ecosystem Quick Switcher -->
          <div class="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5">
            <span class="text-[9px] font-bold uppercase text-slate-400">Controller Architecture:</span>
            <select onchange="setDoorBuilderParam('controllerVendor', this.value)" class="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-amber-300 font-bold text-xs focus:outline-none cursor-pointer">
              <option value="mercury" class="bg-slate-900" ${doorBuilderControllerVendor === 'mercury' ? 'selected' : ''}>Mercury LP Series (LP1502 + Cloud Link + Trove2)</option>
              <option value="mercury_mp" class="bg-slate-900" ${doorBuilderControllerVendor === 'mercury_mp' ? 'selected' : ''}>Mercury MP Series (MP1502 SC 5.12.1+ Native)</option>
              <option value="axis_pbg" class="bg-slate-900" ${doorBuilderControllerVendor === 'axis_pbg' ? 'selected' : ''}>Axis Powered by Genetec (A1610 — 0 Cloud Links!)</option>
              <option value="axis" class="bg-slate-900" ${doorBuilderControllerVendor === 'axis' ? 'selected' : ''}>Axis Network Controllers (A1001 PoE+)</option>
              <option value="scl312" class="bg-slate-900" ${doorBuilderControllerVendor === 'scl312' ? 'selected' : ''}>Synergis Cloud Link-312 (12x RS-485 Direct OSDP)</option>
            </select>
          </div>

          <!-- ACS Head-End Software Platform Selector -->
          <div class="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5">
            <span class="text-[9px] font-bold uppercase text-slate-400">ACS Platform:</span>
            <select onchange="setDoorBuilderParam('acsPlatform', this.value)" class="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-sky-300 font-bold text-xs focus:outline-none cursor-pointer">
              <option value="genetec_synergis" class="bg-slate-900" ${doorBuilderAcsPlatform === 'genetec_synergis' ? 'selected' : ''}>Genetec Synergis (Security Center 5.14)</option>
              <option value="milestone_xpaccess" class="bg-slate-900" ${doorBuilderAcsPlatform === 'milestone_xpaccess' ? 'selected' : ''}>Milestone XProtect Access ($129 + $39 per Reader)</option>
              <option value="milestone_axis_secure_entry" class="bg-slate-900" ${doorBuilderAcsPlatform === 'milestone_axis_secure_entry' ? 'selected' : ''}>Milestone AXIS Secure Entry ($89 per Door)</option>
              <option value="standalone" class="bg-slate-900" ${doorBuilderAcsPlatform === 'standalone' ? 'selected' : ''}>Standalone / Other ACS Head-End</option>
            </select>
          </div>

          <button onclick="addFullDoorScheduleToBom()" class="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer">
            <i data-lucide="package-plus" class="w-4 h-4"></i>
            <span>+ Add Full ${rollup.totalDoors}-Door Schedule to BOM</span>
          </button>
        </div>
      </div>

      <!-- Multi-Group Door Schedule Table -->
      <div class="bg-slate-950/90 border border-slate-800 rounded-xl p-3 flex flex-col gap-2.5">
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
          <div class="flex items-center gap-2">
            <span class="text-[11px] font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
              <i data-lucide="list-checks" class="w-3.5 h-3.5 text-amber-400"></i>
              <span>Project Door Schedule Groups (${rollup.rows.length})</span>
            </span>
            <button onclick="addDoorScheduleGroup()" class="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold flex items-center gap-1 shadow-sm transition-all cursor-pointer">
              <i data-lucide="plus" class="w-3.5 h-3.5"></i>
              <span>Add Door Group</span>
            </button>
          </div>
          <span class="text-[10px] font-mono text-slate-400">
            Synergis Cloud Link: 32 Mercury LP/MP panels / 256 readers / 600k cardholders &bull; Axis Powered by Genetec (A1610): Direct IP to Access Manager (0 Cloud Links) &bull; SCL-312: 12x RS-485 / 48 OSDP Readers
          </span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="border-b border-slate-800 text-[9px] uppercase font-bold text-slate-400">
                <th class="py-1.5 px-2 min-w-[180px]">Door Zone / Group Name</th>
                <th class="py-1.5 px-2 min-w-[260px]">Door Hardware Kit Preset</th>
                <th class="py-1.5 px-1.5 w-24 text-center">Door Quantity</th>
                <th class="py-1.5 px-1.5 w-36">Readers per Door</th>
                <th class="py-1.5 px-2">Included Lock &amp; Peripherals</th>
                <th class="py-1.5 px-2 text-right">Controllers</th>
                <th class="py-1.5 px-2 text-right">12V Load</th>
                <th class="py-1.5 px-1.5 text-center w-16">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/60">
              ${rollup.rows.map((row, idx) => `
                <tr class="hover:bg-slate-900/50 transition-colors">
                  <td class="py-1.5 px-2">
                    <input type="text" value="${String(row.name || `Door Group ${idx + 1}`).replace(/"/g, '&quot;')}" onchange="updateDoorScheduleGroup(${idx}, 'name', this.value)" class="w-full bg-slate-900 border border-slate-700/80 rounded px-2 py-1 text-xs font-semibold text-white focus:outline-none focus:border-amber-500" />
                  </td>
                  <td class="py-1.5 px-2">
                    <select onchange="updateDoorScheduleGroup(${idx}, 'preset', this.value)" class="w-full bg-slate-900 border border-slate-700/80 rounded px-2 py-1 text-amber-300 font-bold text-xs focus:outline-none cursor-pointer">
                      ${Object.values(DOOR_BUILDER_PRESETS).map(p => `<option value="${p.id}" class="bg-slate-900" ${row.preset === p.id ? 'selected' : ''}>${p.label}</option>`).join('')}
                    </select>
                  </td>
                  <td class="py-1.5 px-1.5">
                    <input type="number" min="1" max="128" value="${row.doors}" onchange="updateDoorScheduleGroup(${idx}, 'doorQty', Math.max(1, parseInt(this.value, 10) || 1))" class="w-full bg-slate-900 border border-slate-700/80 rounded px-2 py-1 text-xs font-mono font-bold text-white text-center focus:outline-none focus:border-amber-500" />
                  </td>
                  <td class="py-1.5 px-1.5">
                    <select onchange="updateDoorScheduleGroup(${idx}, 'readersPerDoor', Number(this.value))" class="w-full bg-slate-900 border border-slate-700/80 rounded px-1.5 py-1 text-slate-200 font-mono text-xs focus:outline-none cursor-pointer">
                      <option value="1" class="bg-slate-900" ${row.readersPerDoor === 1 ? 'selected' : ''}>1x In + REX Out</option>
                      <option value="2" class="bg-slate-900" ${row.readersPerDoor === 2 ? 'selected' : ''}>2x In/Out Readers</option>
                    </select>
                  </td>
                  <td class="py-1.5 px-2 text-[10px] text-slate-300 font-mono">
                    ${row.presetObj.lockLabel} + ${row.presetObj.rexLabel} + ${row.presetObj.dpsLabel}
                  </td>
                  <td class="py-1.5 px-2 text-right font-mono text-sky-300 font-bold">
                    ${row.controllers}x ${row.presetObj.vendor === 'axis_pbg' ? 'Axis A1610 (Direct IP)' : row.presetObj.vendor === 'axis' ? 'Axis A1001' : row.presetObj.vendor === 'scl312' ? 'SCL-312' : row.presetObj.vendor === 'mercury_mp' ? 'MP1502' : 'LP1502'}
                  </td>
                  <td class="py-1.5 px-2 text-right font-mono text-emerald-400">
                    ${Math.round((row.lockMa / 1000) * 100) / 100} A
                  </td>
                  <td class="py-1.5 px-1.5 text-center">
                    <div class="flex items-center justify-center gap-1">
                      <button onclick="duplicateDoorScheduleGroup(${idx})" class="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-amber-300 transition-colors cursor-pointer" title="Duplicate door group">
                        <i data-lucide="copy" class="w-3.5 h-3.5"></i>
                      </button>
                      ${rollup.rows.length > 1 ? `
                        <button onclick="removeDoorScheduleGroup(${idx})" class="p-1 rounded hover:bg-rose-950/80 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer" title="Remove door group">
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
    </div>
  `;
}
window.renderDoorBuilderStudioHtml = renderDoorBuilderStudioHtml;

// =========================================================================
// TOP-LEVEL CALCULATORS & SIZERS STUDIO MODAL CONTROLLER
// =========================================================================

let activeCalculatorStudioType = "poe";
window.activeCalculatorStudioType = activeCalculatorStudioType;

function openCalculatorStudio(calcType = "poe") {
  activeCalculatorStudioType = calcType || "poe";
  window.activeCalculatorStudioType = activeCalculatorStudioType;
  const modal = document.getElementById("calculatorsStudioModal");
  if (!modal) return;
  modal.classList.remove("hidden");
  renderCalculatorStudioIfOpen();
}
window.openCalculatorStudio = openCalculatorStudio;

function renderCalculatorStudioIfOpen() {
  const modal = document.getElementById("calculatorsStudioModal");
  if (!modal || modal.classList.contains("hidden")) return;

  // Preserve focused input element if user is actively typing inside the studio
  const activeEl = document.activeElement;
  const isTypingInModal = activeEl && modal.contains(activeEl) && (activeEl.tagName === "INPUT" || activeEl.tagName === "SELECT");

  const t = activeCalculatorStudioType || "poe";
  let bodyHtml = "";
  let catalogJumpLabel = "Open Hardware Catalog";
  let catalogJumpAction = "if(typeof TabManager!=='undefined') TabManager.openTab('catalog');";

  if (t === "poe") {
    bodyHtml = renderPoeCalculatorStudioHtml();
    catalogJumpLabel = "Browse Matching PoE Switches in Catalog";
    catalogJumpAction = "switchDomain('networking'); setMode('access'); if(typeof TabManager!=='undefined') TabManager.openTab('catalog');";
  } else if (t === "storage") {
    bodyHtml = renderStorageCalculatorStudioHtml(true);
    catalogJumpLabel = "Browse Matching Servers & Storage in Catalog";
    catalogJumpAction = "switchDomain('compute_storage'); setMode('servers'); if(typeof TabManager!=='undefined') TabManager.openTab('catalog');";
  } else if (t === "workstation") {
    bodyHtml = renderWorkstationSizerStudioHtml(true);
    catalogJumpLabel = "Browse Client Workstations in Catalog";
    catalogJumpAction = "switchDomain('compute_storage'); setMode('workstations'); if(typeof TabManager!=='undefined') TabManager.openTab('catalog');";
  } else if (t === "doors") {
    bodyHtml = renderDoorBuilderStudioHtml(true);
    catalogJumpLabel = "Browse Access Control Hardware in Catalog";
    catalogJumpAction = "switchDomain('physical_security'); setMode('access_control'); if(typeof TabManager!=='undefined') TabManager.openTab('catalog');";
  } else if (t === "licensing") {
    bodyHtml = renderVmsLicensingStudioHtml(false);
    catalogJumpLabel = "Browse VMS Software & Licenses in Catalog";
    catalogJumpAction = "switchDomain('compute_storage'); setMode('vms_software'); if(typeof TabManager!=='undefined') TabManager.openTab('catalog');";
  }

  const navPills = [
    { id: "sizer_poe", type: "poe", label: "PoE & Switch Calculator", icon: "zap", color: "amber" },
    { id: "sizer_storage", type: "storage", label: "Storage & Failover Calculator", icon: "hard-drive", color: "purple" },
    { id: "sizer_workstation", type: "workstation", label: "Client Workstation Sizer", icon: "monitor", color: "sky" },
    { id: "sizer_doors", type: "doors", label: "Doors & Access Builder", icon: "door-open", color: "amber" },
    { id: "sizer_licensing", type: "licensing", label: "VMS Licensing Sizer", icon: "key", color: "emerald" }
  ];

  modal.innerHTML = `
    <!-- Studio Sub-Header Bar -->
    <div class="px-4 py-2.5 bg-slate-900/95 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
      <div class="flex flex-wrap items-center gap-1.5">
        <span class="text-[10px] font-mono uppercase tracking-wider text-slate-400 mr-1.5 flex items-center gap-1">
          <i data-lucide="calculator" class="w-3.5 h-3.5 text-amber-400"></i>
          <span>Calculators &amp; Sizers:</span>
        </span>
        ${navPills.map(np => {
          const isActive = np.type === t;
          return `
            <button
              type="button"
              onclick="if(typeof TabManager !== 'undefined') { TabManager.openTab('${np.id}'); } else { openCalculatorStudio('${np.type}'); }"
              class="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                isActive
                  ? 'bg-slate-800 text-white border-amber-500/60 shadow-sm'
                  : 'bg-slate-950/70 text-slate-400 hover:text-white border-slate-800 hover:border-slate-700'
              }"
            >
              <i data-lucide="${np.icon}" class="w-3.5 h-3.5 ${isActive ? 'text-amber-400' : 'text-slate-400'}"></i>
              <span>${np.label}</span>
            </button>
          `;
        }).join('')}
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          onclick="${catalogJumpAction}"
          class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <i data-lucide="layers" class="w-3.5 h-3.5 text-brand-400"></i>
          <span>${catalogJumpLabel} &rarr;</span>
        </button>
      </div>
    </div>

    <!-- Scrollable Full-Screen Calculator Studio Body -->
    <div class="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar">
      <div class="max-w-[1650px] mx-auto space-y-4">
        ${bodyHtml}
      </div>
    </div>
  `;

  safeCreateIcons(modal);
}
window.renderCalculatorStudioIfOpen = renderCalculatorStudioIfOpen;

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

