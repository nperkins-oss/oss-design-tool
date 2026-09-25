// =========================================================================
// APPLICATION MASTER ORCHESTRATOR & TOP-LEVEL DOMAIN ROUTER
// NetSelect Enterprise Architecture (js/core/app.js)
// Single-Page Domain Switcher, Multi-Sizer Pipeline & State Coordinator
// =========================================================================

// Version & Build Information
const APP_VERSION = "0.10.14-alpha";
const BUILD_NUMBER = "2026.09.25.1330";

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
      { id: "wireless", label: "Wireless PtP", icon: "radio" }
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
      { id: "accessories", label: "Power & Midspans", icon: "wrench" },
      { id: "ups", label: "Rack UPS Power", icon: "zap" },
      { id: "racks", label: "19\" Equipment Racks", icon: "server" },
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

// 3. Optics Filters
let selectedOpticMediums = [];
let selectedOpticSpeeds = [];
let selectedOpticVendors = [];
let selectedOpticFormFactor = "all";
let requireOpticIndustrial = false;

// 4. Wireless Filters
let wlTargetDistanceMiles = 0;
let wlTargetThroughputMbps = 0;
let selectedWlTopologyRole = "all";
let selectedCompatibleMasterSku = "all";
let minWlStations = 0;
let selectedWlFrequencies = [];
let selectedWlVendors = [];
let requireWlBackup5G = false;

// 5. Infrastructure Accessories Filters
let selectedAccVendors = [];
let selectedAccCategories = [];
let selectedAccTypes = [];
let selectedAccMounting = "all";
let accMinPowerWatts = 0;

// 6. Camera Filters
let selectedCameraVendors = [];
let selectedCameraFormFactors = [];
let selectedCameraResolutions = [];
let requireCameraIR = false;
let requireCameraAudio = false;

// 7. Access Control Filters
let selectedAccessVendors = [];
let selectedDoorCounts = [];

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
  resetFilters(mode) {
    if (typeof resetCurrentFilters === "function") {
      resetCurrentFilters();
    }
  }
};
window.AppState = AppState;
window.APP_VERSION = APP_VERSION;
window.BUILD_NUMBER = BUILD_NUMBER;

// Debounced filter runner for fast typing response
const debouncedRunActiveFilter = debounce(() => {
  runActiveFilter();
}, 150);

// -----------------------------------------------------------
// Initialization Lifecycle
// -----------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
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
  safeCreateIcons();
});

// -----------------------------------------------------------
// Master Domain & Sub-Mode Routing
// -----------------------------------------------------------
function switchDomain(domainKey) {
  if (!DOMAIN_DEFINITIONS[domainKey]) return;
  activeDomain = domainKey;
  
  // Default to the first mode of this domain
  currentMode = DOMAIN_DEFINITIONS[domainKey].modes[0].id;

  buildDomainNavigation();
  buildSubModeNavigation();
  buildCalculatorStrip();
  buildSidebarFilters();
  runActiveFilter();
}

function switchMode(newMode) {
  // Find parent domain for this mode
  for (const [dKey, dDef] of Object.entries(DOMAIN_DEFINITIONS)) {
    if (dDef.modes.some(m => m.id === newMode)) {
      activeDomain = dKey;
      break;
    }
  }

  currentMode = newMode;
  buildDomainNavigation();
  buildSubModeNavigation();
  buildCalculatorStrip();
  buildSidebarFilters();
  runActiveFilter();
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
      <button onclick="switchDomain('${dKey}')" id="domain-tab-${dKey}" class="px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 border transition-all ${activeClasses}">
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

function resetCurrentFilters() {
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

  selectedFwVendors = [];
  selectedFwCategories = [];
  fwTargetThroughputGbps = 0;
  fwTargetThreatMbps = 0;
  requireFwCellular = false;
  requireFwDualPsu = false;
  requireFwRackmount = false;
  requireFw10GWan = false;
  requireFwPoePorts = false;

  selectedOpticMediums = [];
  selectedOpticSpeeds = [];
  selectedOpticVendors = [];
  selectedOpticFormFactor = "all";
  requireOpticIndustrial = false;

  wlTargetDistanceMiles = 0;
  wlTargetThroughputMbps = 0;
  selectedWlTopologyRole = "all";
  selectedCompatibleMasterSku = "all";
  minWlStations = 0;
  selectedWlFrequencies = [];
  selectedWlVendors = [];
  requireWlBackup5G = false;

  selectedAccVendors = [];
  selectedAccCategories = [];
  selectedAccTypes = [];
  selectedAccMounting = "all";
  accMinPowerWatts = 0;

  selectedCameraVendors = [];
  selectedCameraFormFactors = [];
  selectedCameraResolutions = [];
  requireCameraIR = false;
  requireCameraAudio = false;

  selectedAccessVendors = [];
  selectedDoorCounts = [];

  activeSearchQuery = "";
  const searchInput = document.getElementById("filterSearch");
  if (searchInput) searchInput.value = "";

  buildSidebarFilters();
  runActiveFilter();
  showToast("Filters reset to default.");
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
    container.innerHTML = `
      <div class="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4 shadow-md">
        <div class="flex items-center gap-3">
          <div class="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
            <i data-lucide="wrench" class="w-5 h-5"></i>
          </div>
          <div>
            <h4 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              Power & Enclosure Infrastructure Sizer
            </h4>
            <p class="text-[11px] text-slate-400">Directly size industrial DIN-rail power supplies, midspan PoE injectors, and exterior enclosures.</p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-3 text-xs">
          <div class="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5">
            <span class="text-[10px] font-mono font-bold text-slate-400 uppercase">Min Output Power:</span>
            <select onchange="accMinPowerWatts = parseInt(this.value) || 0; runActiveFilter();" class="bg-transparent font-mono font-bold text-amber-400 text-xs focus:outline-none">
              <option value="0" ${accMinPowerWatts === 0 ? 'selected' : ''}>Any Power</option>
              <option value="30" ${accMinPowerWatts === 30 ? 'selected' : ''}>30W (PoE+)</option>
              <option value="60" ${accMinPowerWatts === 60 ? 'selected' : ''}>60W (PoE++ / bt)</option>
              <option value="120" ${accMinPowerWatts === 120 ? 'selected' : ''}>120W (High-Power DIN)</option>
              <option value="240" ${accMinPowerWatts === 240 ? 'selected' : ''}>240W (Cabinet DIN)</option>
              <option value="480" ${accMinPowerWatts === 480 ? 'selected' : ''}>480W (Multi-Switch DIN)</option>
            </select>
          </div>

          ${accMinPowerWatts > 0 ? `
            <button onclick="accMinPowerWatts = 0; buildCalculatorStrip(); runActiveFilter();" class="text-xs text-rose-400 hover:text-rose-300 font-semibold px-2">
              Reset Power
            </button>
          ` : ''}
        </div>
      </div>
    `;
  } else {
    // Sizer placeholder for emerging domains (Cameras, Access, Servers, etc.)
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

// -----------------------------------------------------------
// Faceted Filter Interactions
// -----------------------------------------------------------
function setUplinkSpeedFilter(speed) {
  selectedUplinkSpeed = speed;
  buildSidebarFilters();
  runActiveFilter();
}

function toggleFilterItem(type, val) {
  if (type === "vendor") {
    selectedVendors = selectedVendors.includes(val) ? selectedVendors.filter(v => v !== val) : [...selectedVendors, val];
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
  } else if (type === "accVendor") {
    selectedAccVendors = selectedAccVendors.includes(val) ? selectedAccVendors.filter(v => v !== val) : [...selectedAccVendors, val];
  } else if (type === "accType") {
    selectedAccTypes = selectedAccTypes.includes(val) ? selectedAccTypes.filter(t => t !== val) : [...selectedAccTypes, val];
  }
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
      rawDataset = (typeof ACCESSORY_DATABASE !== "undefined") ? ACCESSORY_DATABASE : [];
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
          selectedFwVendors,
          selectedFwCategories,
          fwTargetThroughputGbps,
          fwTargetThreatMbps,
          selectedOpticMediums,
          selectedOpticSpeeds,
          selectedOpticVendors,
          selectedOpticFormFactor,
          wlTargetDistanceMiles,
          wlTargetThroughputMbps,
          selectedWlTopologyRole,
          selectedCompatibleMasterSku,
          minWlStations,
          selectedWlVendors,
          selectedWlFrequencies,
          selectedAccVendors,
          selectedAccTypes,
          selectedAccMounting,
          accMinPowerWatts
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
            ? "No matching hardware found"
            : `No ${currentLabel} models loaded yet`;
        }
        if (emptyDesc) {
          emptyDesc.innerText = activeSearchQuery
            ? "Try clearing search terms or resetting sidebar filters."
            : `Catalog database for ${currentLabel} will populate once its domain data payload is configured.`;
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

    // 5. BOM Drawer
    const bomDrawer = document.getElementById("bomDrawer");
    if (bomDrawer && !bomDrawer.classList.contains("translate-x-full")) {
      return { tool: "bom" };
    }

    return null;
  },

  restoreState(state) {
    if (!state || !state.tool) return false;

    if (state.tool === "physical") {
      if (typeof toggleCableLayoutModal === "function") {
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
      if (typeof toggleTopologyModal === "function") {
        const modal = document.getElementById("topologyModal");
        if (modal && modal.classList.contains("hidden")) toggleTopologyModal();
      }
      if (state.nodeId && typeof selectTopologyNode === "function") {
        selectTopologyNode(state.nodeId);
      }
      return true;
    }

    if (state.tool === "facility") {
      const facModal = document.getElementById("facilityModal");
      if (facModal && facModal.classList.contains("hidden")) {
        if (typeof toggleFacilityModal === "function") toggleFacilityModal();
      }
      if (typeof switchFacilityView === "function") {
        switchFacilityView(state.view || "hierarchy", state.rackId);
      }
      return true;
    }

    if (state.tool === "bom") {
      const drawer = document.getElementById("bomDrawer");
      if (drawer && drawer.classList.contains("translate-x-full")) {
        if (typeof toggleBomDrawer === "function") toggleBomDrawer();
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

// Universal Master ESC Listener with Navigation History & Deselect
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    // 1. Port Matrix Studio Modal
    const portStudio = document.getElementById("portMatrixStudioModal");
    if (portStudio && !portStudio.classList.contains("hidden")) {
      e.preventDefault();
      if (typeof closePortMatrixStudio === "function") closePortMatrixStudio();
      return;
    }

    // 2. Topology Quick Search popup
    const topoSearchResults = document.getElementById("topologyQuickSearchResults");
    if (topoSearchResults && !topoSearchResults.classList.contains("hidden")) {
      e.preventDefault();
      if (typeof clearTopologySearch === "function") clearTopologySearch();
      return;
    }

    // 3. Physical Layout Quick Search popup
    const physSearchResults = document.getElementById("physQuickSearchResults");
    if (physSearchResults && !physSearchResults.classList.contains("hidden")) {
      e.preventDefault();
      physSearchResults.classList.add("hidden");
      return;
    }

    // 4. Facility Inline Form (Add Space, Add Host, Add Floor)
    if (typeof facilityActiveForm !== "undefined" && facilityActiveForm) {
      e.preventDefault();
      if (typeof closeFacilityAddForm === "function") closeFacilityAddForm();
      return;
    }

    // 5. Active selection in Physical Layout -> First ESC deselects node
    const physModal = document.getElementById("cableLayoutModal");
    if (physModal && !physModal.classList.contains("hidden")) {
      if (typeof selectedNodeId !== "undefined" && selectedNodeId) {
        e.preventDefault();
        if (typeof deselectNode === "function") deselectNode();
        return;
      }
    }

    // 6. Active selection in Topology -> First ESC deselects node
    const topoModal = document.getElementById("topologyModal");
    if (topoModal && !topoModal.classList.contains("hidden")) {
      if ((typeof selectedTopologyNodeId !== "undefined" && selectedTopologyNodeId) || 
          (typeof selectedTopologyRackLoc !== "undefined" && selectedTopologyRackLoc)) {
        e.preventDefault();
        if (typeof deselectTopologyNode === "function") deselectTopologyNode();
        return;
      }
    }

    // 7. Navigation History Back-Stack: If user arrived via a cross-tool link, ESC goes BACK!
    const prevState = NavigationHistory.pop();
    if (prevState) {
      e.preventDefault();
      // Close currently active modal
      if (physModal && !physModal.classList.contains("hidden")) {
        if (typeof toggleCableLayoutModal === "function") toggleCableLayoutModal();
      }
      if (topoModal && !topoModal.classList.contains("hidden")) {
        if (typeof toggleTopologyModal === "function") toggleTopologyModal();
      }
      const facModal = document.getElementById("facilityModal");
      if (facModal && !facModal.classList.contains("hidden")) {
        if (typeof toggleFacilityModal === "function") toggleFacilityModal();
      }
      const bomDrawer = document.getElementById("bomDrawer");
      if (bomDrawer && !bomDrawer.classList.contains("translate-x-full")) {
        if (typeof toggleBomDrawer === "function") toggleBomDrawer();
      }

      // Restore previous state!
      NavigationHistory.restoreState(prevState);
      return;
    }

    // 8. If no navigation history, close the top-most active modal/drawer
    const modals = [
      { id: "cableLayoutModal", closeFn: () => typeof toggleCableLayoutModal === "function" && toggleCableLayoutModal() },
      { id: "topologyModal", closeFn: () => typeof toggleTopologyModal === "function" && toggleTopologyModal() },
      { id: "facilityModal", closeFn: () => typeof handleFacilityModalCloseOrBack === "function" ? handleFacilityModalCloseOrBack() : (typeof toggleFacilityModal === "function" && toggleFacilityModal()) },
      { id: "projectHealthModal", closeFn: () => typeof toggleProjectHealthModal === "function" && toggleProjectHealthModal() },
      { id: "compareModal", closeFn: () => typeof toggleCompareModal === "function" && toggleCompareModal() },
      { id: "projectModal", closeFn: () => typeof toggleProjectModal === "function" && toggleProjectModal() },
      { id: "licenseModal", closeFn: () => typeof toggleLicenseModal === "function" && toggleLicenseModal() },
      { id: "bomDrawer", closeFn: () => typeof toggleBomDrawer === "function" && toggleBomDrawer() }
    ];

    for (const m of modals) {
      const el = document.getElementById(m.id);
      if (el && !el.classList.contains("hidden") && !el.classList.contains("translate-x-full")) {
        e.preventDefault();
        m.closeFn();
        break;
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
window.updateHeadroom = updateHeadroom;
window.setOpticQuickFilter = setOpticQuickFilter;
window.setUplinkSpeedFilter = setUplinkSpeedFilter;
window.toggleFilterItem = toggleFilterItem;
window.showToast = showToast;
