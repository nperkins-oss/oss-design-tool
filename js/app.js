// ==========================================
// APPLICATION CORE CONTROLLER (NetSelect Enterprise)
// Integrated with FacilityStore & Project-Scoped State Isolation
// ==========================================

let currentMode = "access"; // "access" | "backbone" | "firewalls" | "optics" | "wireless" | "accessories"
let activeSearchQuery = "";
let currentSortMode = "featured";
let comparisonList = [];

// Multi-Device Port & PoE Sizing Demand
let demandCounts = {
  af: 0,      // Standard fixed cameras / VoIP (15.4W)
  at: 0,      // PTZ / Access Control Panels (30W)
  bt60: 0,    // Multi-sensor / Radios (60W)
  bt90: 0     // Heated domes / High-power PTZ (90W)
};
let extraHeadroomPercent = 20;

// Switch Filter States
let selectedVendors = [];
let selectedPortCounts = [];
let selectedPoEClasses = [];
let requirePerpetualPoE = false;
let requireSubstation = false;
let requirePassThrough = false;
let requireShallowDepth = false;
let requireStacking = false;
let requireDualPsu = false;
let requireTAA = false;
let requireDinMount = false;
let requireMultiGig = false;

// Firewall Filter States
let selectedFwCategories = [];
let selectedFwVendors = [];

// Optics Filter States
let selectedOpticMediums = [];
let selectedOpticSpeeds = [];
let selectedOpticVendors = [];

// Wireless Filter States
let selectedWlFrequencies = [];
let selectedWlVendors = [];
let requireWlBackup5G = false;

// Accessories Filter States
let selectedAccVendors = [];
let selectedAccCategories = [];

// Initialize on DOM Ready
document.addEventListener("DOMContentLoaded", () => {
  restoreStateFromLocalStorage();
  buildCalculatorStrip();
  buildSidebarFilters();
  runActiveFilter();
  updateBOMView();
  if (window.lucide) {
    try { lucide.createIcons(); } catch (e) {}
  }
});

// -----------------------------------------------------------
// Mode Switching & Layout Controls
// -----------------------------------------------------------
function switchMode(newMode) {
  currentMode = newMode;

  const modeButtons = ["access", "backbone", "firewalls", "optics", "wireless", "accessories"];
  modeButtons.forEach(m => {
    const btn = document.getElementById(`nav-${m}`);
    if (btn) {
      if (m === newMode) {
        btn.classList.add("active");
        btn.classList.replace("border-slate-700", "border-transparent");
      } else {
        btn.classList.remove("active");
        btn.classList.replace("border-transparent", "border-slate-700");
      }
    }
  });

  const sidebarTitle = document.getElementById("sidebarFilterTitle");
  if (sidebarTitle) {
    const titles = {
      access: "Access & Edge Filters",
      backbone: "Core / Agg Filters",
      firewalls: "Security WAN Filters",
      optics: "Interconnect Filters",
      wireless: "Wireless PtP Filters",
      accessories: "Accessory Filters"
    };
    sidebarTitle.innerHTML = `<i data-lucide="filter" class="w-3.5 h-3.5 text-brand-400"></i> ${titles[newMode] || "Filters"}`;
  }

  buildCalculatorStrip();
  buildSidebarFilters();
  runActiveFilter();

  if (window.lucide) {
    try { lucide.createIcons(); } catch (e) {}
  }
}

function updateSearchFilter(val) {
  activeSearchQuery = (val || "").trim().toLowerCase();
  runActiveFilter();
}

function resetCurrentFilters() {
  selectedVendors = [];
  selectedPortCounts = [];
  selectedPoEClasses = [];
  requirePerpetualPoE = false;
  requireSubstation = false;
  requirePassThrough = false;
  requireShallowDepth = false;
  requireStacking = false;
  requireDualPsu = false;
  requireTAA = false;
  requireDinMount = false;
  requireMultiGig = false;

  selectedFwCategories = [];
  selectedFwVendors = [];
  selectedOpticMediums = [];
  selectedOpticSpeeds = [];
  selectedOpticVendors = [];
  selectedWlFrequencies = [];
  selectedWlVendors = [];
  requireWlBackup5G = false;

  selectedAccVendors = [];
  selectedAccCategories = [];
  activeSearchQuery = "";

  const searchInput = document.getElementById("filterSearch");
  if (searchInput) searchInput.value = "";

  buildSidebarFilters();
  runActiveFilter();
  showToast("Filters reset to default.");
}

// -----------------------------------------------------------
// Multi-Port Demand & Headroom Sizing Engine
// -----------------------------------------------------------
function calculatePoETarget() {
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
  demandCounts[field] = Math.max(0, parseInt(val) || 0);
  buildCalculatorStrip();
  FacilityStore.notifyWorkspaceChange();
}

function updateHeadroom(val) {
  extraHeadroomPercent = parseInt(val) || 20;
  buildCalculatorStrip();
  FacilityStore.notifyWorkspaceChange();
}

function buildCalculatorStrip() {
  const container = document.getElementById("calculatorStripContainer");
  if (!container) return;

  if (currentMode !== "access") {
    container.classList.add("hidden");
    container.innerHTML = "";
    return;
  }

  container.classList.remove("hidden");
  const { budgetWithHeadroom, totalCameras } = calculatePoETarget();

  container.innerHTML = `
    <div class="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4 shadow-md">
      <div class="flex items-center gap-3">
        <div class="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
          <i data-lucide="video" class="w-5 h-5"></i>
        </div>
        <div>
          <h4 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            Surveillance & Physical Security Port Sizer
          </h4>
          <p class="text-[11px] text-slate-400">Total Ports: <strong class="text-white font-mono">${totalCameras}</strong> &bull; Wattage with +${extraHeadroomPercent}% Headroom: <strong class="text-amber-300 font-mono">${budgetWithHeadroom}W</strong></p>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2 text-xs">
        <div class="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-xl px-2 py-1" title="Fixed 1080p/4K Domes, Intercoms (15.4W)">
          <span class="text-[10px] font-mono font-bold text-slate-400">af (15W):</span>
          <input type="number" min="0" max="250" value="${demandCounts.af}" onchange="updateDemandInput('af', this.value)" class="w-11 bg-transparent font-mono font-bold text-white focus:outline-none text-right" />
        </div>

        <div class="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-xl px-2 py-1" title="Motorized PTZ, Reader Controllers (30W)">
          <span class="text-[10px] font-mono font-bold text-sky-400">at (30W):</span>
          <input type="number" min="0" max="250" value="${demandCounts.at}" onchange="updateDemandInput('at', this.value)" class="w-11 bg-transparent font-mono font-bold text-white focus:outline-none text-right" />
        </div>

        <div class="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-xl px-2 py-1" title="180°/360° Multi-Sensor, 60GHz Radios (60W)">
          <span class="text-[10px] font-mono font-bold text-indigo-400">bt (60W):</span>
          <input type="number" min="0" max="250" value="${demandCounts.bt60}" onchange="updateDemandInput('bt60', this.value)" class="w-11 bg-transparent font-mono font-bold text-white focus:outline-none text-right" />
        </div>

        <div class="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-xl px-2 py-1" title="Heated Enclosures, Blowers, Long-Range PTZ (90W)">
          <span class="text-[10px] font-mono font-bold text-rose-400">bt (90W):</span>
          <input type="number" min="0" max="250" value="${demandCounts.bt90}" onchange="updateDemandInput('bt90', this.value)" class="w-11 bg-transparent font-mono font-bold text-white focus:outline-none text-right" />
        </div>

        <div class="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-xl px-2 py-1">
          <span class="text-slate-500 text-[10px]">Headroom:</span>
          <select onchange="updateHeadroom(this.value)" class="bg-transparent font-mono text-white text-[11px] focus:outline-none">
            <option value="15" ${extraHeadroomPercent === 15 ? 'selected' : ''}>+15%</option>
            <option value="20" ${extraHeadroomPercent === 20 ? 'selected' : ''}>+20%</option>
            <option value="25" ${extraHeadroomPercent === 25 ? 'selected' : ''}>+25%</option>
            <option value="30" ${extraHeadroomPercent === 30 ? 'selected' : ''}>+30%</option>
          </select>
        </div>

        <div class="bg-slate-950 border border-amber-500/40 px-3 py-1 rounded-xl flex items-center gap-2">
          <span class="text-[10px] uppercase font-bold text-amber-400">Target PoE:</span>
          <span class="font-mono text-sm font-black text-amber-300">${budgetWithHeadroom} W</span>
        </div>
      </div>
    </div>
  `;

  if (window.lucide) {
    try { lucide.createIcons(); } catch (e) {}
  }
}

// -----------------------------------------------------------
// Dynamic Sidebar Filter Builders
// -----------------------------------------------------------
function buildSidebarFilters() {
  const container = document.getElementById("dynamicSidebarContent");
  if (!container) return;

  if (currentMode === "access" || currentMode === "backbone") {
    const currentDataset = SWITCH_DATABASE.filter(s => currentMode === "access" ? s.role === "Access" : (s.role === "Core" || s.role === "Aggregation"));
    const vendors = [...new Set(currentDataset.map(s => s.vendor))];

    container.innerHTML = `
      <div class="space-y-2">
        <label class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Manufacturer</label>
        <div class="space-y-1">
          ${vendors.map(v => `
            <label class="flex items-center justify-between text-xs text-slate-300 hover:text-white cursor-pointer select-none">
              <span class="flex items-center gap-2">
                <input type="checkbox" value="${v}" ${selectedVendors.includes(v) ? 'checked' : ''} onchange="toggleFilterItem('vendor', '${v}')" class="rounded border-slate-700 bg-slate-950 text-indigo-500" />
                <span>${v}</span>
              </span>
              <span class="font-mono text-[10px] text-slate-500">${currentDataset.filter(s => s.vendor === v).length}</span>
            </label>
          `).join('')}
        </div>
      </div>

      <div class="space-y-2 pt-3 border-t border-slate-800">
        <label class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Downlink Port Density</label>
        <div class="grid grid-cols-2 gap-1 text-xs">
          ${[8, 10, 16, 24, 48].map(p => `
            <label class="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-slate-700 cursor-pointer">
              <input type="checkbox" value="${p}" ${selectedPortCounts.includes(p) ? 'checked' : ''} onchange="toggleFilterItem('ports', ${p})" class="rounded border-slate-700 bg-slate-950 text-indigo-500" />
              <span class="font-mono text-slate-300">${p} Ports</span>
            </label>
          `).join('')}
        </div>
      </div>

      ${currentMode === "access" ? `
        <div class="space-y-2 pt-3 border-t border-slate-800">
          <label class="text-[11px] font-bold uppercase tracking-wider text-slate-400">PoE Power Class Required</label>
          <div class="space-y-1 text-xs text-slate-300">
            <label class="flex items-center gap-2 cursor-pointer hover:text-white">
              <input type="checkbox" value="bt60" ${selectedPoEClasses.includes('bt60') ? 'checked' : ''} onchange="toggleFilterItem('poeClass', 'bt60')" class="rounded border-slate-700 bg-slate-950 text-indigo-500" />
              <span>Requires 60W bt (Type 3)</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer hover:text-white">
              <input type="checkbox" value="bt90" ${selectedPoEClasses.includes('bt90') ? 'checked' : ''} onchange="toggleFilterItem('poeClass', 'bt90')" class="rounded border-slate-700 bg-slate-950 text-indigo-500" />
              <span>Requires 90W bt (Type 4)</span>
            </label>
          </div>
        </div>
      ` : ''}

      <div class="space-y-2 pt-3 border-t border-slate-800">
        <label class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Chassis & Architecture</label>
        <div class="space-y-1.5 text-xs text-slate-300">
          <label class="flex items-center gap-2 cursor-pointer hover:text-white">
            <input type="checkbox" ${requireStacking ? 'checked' : ''} onchange="requireStacking = this.checked; runActiveFilter();" class="rounded border-slate-700 bg-slate-950 text-indigo-500" />
            <span class="font-semibold text-indigo-300">Hardware Stacking Capable</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer hover:text-white">
            <input type="checkbox" ${requireMultiGig ? 'checked' : ''} onchange="requireMultiGig = this.checked; runActiveFilter();" class="rounded border-slate-700 bg-slate-950 text-indigo-500" />
            <span>Multi-Gigabit Downlinks (2.5G/5G/10G)</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer hover:text-white">
            <input type="checkbox" ${requireShallowDepth ? 'checked' : ''} onchange="requireShallowDepth = this.checked; runActiveFilter();" class="rounded border-slate-700 bg-slate-950 text-indigo-500" />
            <span>Shallow Depth (&lt;12" Wallmount)</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer hover:text-white">
            <input type="checkbox" ${requireDinMount ? 'checked' : ''} onchange="requireDinMount = this.checked; runActiveFilter();" class="rounded border-slate-700 bg-slate-950 text-indigo-500" />
            <span>DIN-Rail / Outdoor Field Mounting</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer hover:text-white">
            <input type="checkbox" ${requireDualPsu ? 'checked' : ''} onchange="requireDualPsu = this.checked; runActiveFilter();" class="rounded border-slate-700 bg-slate-950 text-indigo-500" />
            <span>Dual / Redundant Power Supply</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer hover:text-white">
            <input type="checkbox" ${requireTAA ? 'checked' : ''} onchange="requireTAA = this.checked; runActiveFilter();" class="rounded border-slate-700 bg-slate-950 text-indigo-500" />
            <span>TAA / NDAA Government Compliant</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer hover:text-white">
            <input type="checkbox" ${requireSubstation ? 'checked' : ''} onchange="requireSubstation = this.checked; runActiveFilter();" class="rounded border-slate-700 bg-slate-950 text-indigo-500" />
            <span>IEC 61850-3 Substation Hardened</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer hover:text-white">
            <input type="checkbox" ${requirePerpetualPoE ? 'checked' : ''} onchange="requirePerpetualPoE = this.checked; runActiveFilter();" class="rounded border-slate-700 bg-slate-950 text-indigo-500" />
            <span>Continuous / Perpetual PoE</span>
          </label>
        </div>
      </div>
    `;
  } else if (currentMode === "firewalls") {
    const list = FIREWALL_DATABASE || [];
    const vendors = [...new Set(list.map(f => (f.vendor || '').trim()).filter(Boolean))];
    const categories = [...new Set(list.map(f => (f.category || '').toLowerCase().trim()).filter(Boolean))];

    container.innerHTML = `
      <div class="space-y-2">
        <label class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Gateway Manufacturer</label>
        <div class="space-y-1">
          ${vendors.map(v => `
            <label class="flex items-center justify-between text-xs text-slate-300 hover:text-white cursor-pointer select-none">
              <span class="flex items-center gap-2">
                <input type="checkbox" value="${v}" ${selectedFwVendors.includes(v) ? 'checked' : ''} onchange="toggleFilterItem('fwVendor', '${v}')" class="rounded border-slate-700 bg-slate-950 text-rose-500" />
                <span>${v}</span>
              </span>
              <span class="font-mono text-[10px] text-slate-500">${list.filter(f => (f.vendor || '').trim() === v).length}</span>
            </label>
          `).join('')}
        </div>
      </div>

      <div class="space-y-2 pt-3 border-t border-slate-800">
        <label class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Form Factor & Role</label>
        <div class="space-y-1.5 text-xs text-slate-300">
          ${categories.map(c => `
            <label class="flex items-center gap-2 cursor-pointer hover:text-white">
              <input type="checkbox" value="${c}" ${selectedFwCategories.includes(c) ? 'checked' : ''} onchange="toggleFilterItem('fwCategory', '${c}')" class="rounded border-slate-700 bg-slate-950 text-rose-500" />
              <span class="capitalize">${c.replace('_', ' ')}</span>
            </label>
          `).join('')}
        </div>
      </div>
    `;
  } else if (currentMode === "optics") {
    const list = OPTICS_LIST || [];
    const mediums = [...new Set(list.map(o => (o.medium || '').toLowerCase().trim()).filter(Boolean))];
    const speeds = [...new Set(list.map(o => (o.speed || '').trim()).filter(Boolean))];
    const vendors = [...new Set(list.map(o => (o.vendor || '').trim()).filter(Boolean))];

    container.innerHTML = `
      <div class="space-y-2">
        <label class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Interconnect Medium</label>
        <div class="space-y-1 text-xs text-slate-300">
          <label class="flex items-center gap-2 cursor-pointer hover:text-white">
            <input type="checkbox" value="stacking" ${selectedOpticMediums.includes('stacking') ? 'checked' : ''} onchange="toggleFilterItem('opticMedium', 'stacking')" class="rounded border-slate-700 bg-slate-950 text-indigo-400" />
            <span class="font-bold text-indigo-300">Dedicated Stacking Cables</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer hover:text-white">
            <input type="checkbox" value="dac" ${selectedOpticMediums.includes('dac') ? 'checked' : ''} onchange="toggleFilterItem('opticMedium', 'dac')" class="rounded border-slate-700 bg-slate-950 text-sky-500" />
            <span>Direct Attach Copper (DAC)</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer hover:text-white">
            <input type="checkbox" value="mmf" ${selectedOpticMediums.includes('mmf') ? 'checked' : ''} onchange="toggleFilterItem('opticMedium', 'mmf')" class="rounded border-slate-700 bg-slate-950 text-sky-500" />
            <span>Multimode Fiber (MMF)</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer hover:text-white">
            <input type="checkbox" value="smf" ${selectedOpticMediums.includes('smf') ? 'checked' : ''} onchange="toggleFilterItem('opticMedium', 'smf')" class="rounded border-slate-700 bg-slate-950 text-sky-500" />
            <span>Single Mode Fiber (SMF)</span>
          </label>
        </div>
      </div>

      <div class="space-y-2 pt-3 border-t border-slate-800">
        <label class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Speed</label>
        <div class="grid grid-cols-2 gap-1 text-xs">
          ${speeds.map(s => `
            <label class="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-slate-700 cursor-pointer">
              <input type="checkbox" value="${s}" ${selectedOpticSpeeds.includes(s) ? 'checked' : ''} onchange="toggleFilterItem('opticSpeed', '${s}')" class="rounded border-slate-700 bg-slate-950 text-sky-500" />
              <span class="font-mono text-slate-300">${s}</span>
            </label>
          `).join('')}
        </div>
      </div>

      <div class="space-y-2 pt-3 border-t border-slate-800">
        <label class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Vendor</label>
        <div class="space-y-1">
          ${vendors.map(v => `
            <label class="flex items-center justify-between text-xs text-slate-300 hover:text-white cursor-pointer select-none">
              <span class="flex items-center gap-2">
                <input type="checkbox" value="${v}" ${selectedOpticVendors.includes(v) ? 'checked' : ''} onchange="toggleFilterItem('opticVendor', '${v}')" class="rounded border-slate-700 bg-slate-950 text-sky-500" />
                <span>${v}</span>
              </span>
            </label>
          `).join('')}
        </div>
      </div>
    `;
  } else if (currentMode === "wireless") {
    const list = (typeof WIRELESS_DATABASE !== "undefined") ? WIRELESS_DATABASE : [];
    const vendors = [...new Set(list.map(w => (w.vendor || '').trim()).filter(Boolean))];

    container.innerHTML = `
      <div class="space-y-2">
        <label class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Wireless Manufacturer</label>
        <div class="space-y-1">
          ${vendors.map(v => `
            <label class="flex items-center justify-between text-xs text-slate-300 hover:text-white cursor-pointer select-none">
              <span class="flex items-center gap-2">
                <input type="checkbox" value="${v}" ${selectedWlVendors.includes(v) ? 'checked' : ''} onchange="toggleFilterItem('wlVendor', '${v}')" class="rounded border-slate-700 bg-slate-950 text-emerald-500" />
                <span>${v}</span>
              </span>
              <span class="font-mono text-[10px] text-slate-500">${list.filter(w => (w.vendor || '').trim() === v).length}</span>
            </label>
          `).join('')}
        </div>
      </div>

      <div class="space-y-2 pt-3 border-t border-slate-800">
        <label class="text-[11px] font-bold uppercase tracking-wider text-slate-400">RF Frequency Band</label>
        <div class="space-y-1.5 text-xs text-slate-300">
          <label class="flex items-center gap-2 cursor-pointer hover:text-white">
            <input type="checkbox" value="60" ${selectedWlFrequencies.includes('60') ? 'checked' : ''} onchange="toggleFilterItem('wlFreq', '60')" class="rounded border-slate-700 bg-slate-950 text-emerald-500" />
            <span>60 GHz High-Capacity Carrier</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer hover:text-white">
            <input type="checkbox" value="5" ${selectedWlFrequencies.includes('5') ? 'checked' : ''} onchange="toggleFilterItem('wlFreq', '5')" class="rounded border-slate-700 bg-slate-950 text-emerald-500" />
            <span>5 GHz Long Distance Backhaul</span>
          </label>
        </div>
      </div>

      <div class="space-y-2 pt-3 border-t border-slate-800">
        <label class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Resilience</label>
        <label class="flex items-center gap-2 text-xs text-slate-300 cursor-pointer hover:text-white">
          <input type="checkbox" ${requireWlBackup5G ? 'checked' : ''} onchange="requireWlBackup5G = this.checked; runActiveFilter();" class="rounded border-slate-700 bg-slate-950 text-emerald-500" />
          <span>Active 5 GHz Rain-Fade Failover</span>
        </label>
      </div>
    `;
  } else if (currentMode === "accessories") {
    const list = (typeof ACCESSORY_DATABASE !== "undefined") ? ACCESSORY_DATABASE : [];
    const vendors = [...new Set(list.map(a => (a.vendor || '').trim()).filter(Boolean))];
    const categories = [...new Set(list.map(a => (a.category || '').toLowerCase().trim()).filter(Boolean))];

    container.innerHTML = `
      <div class="space-y-2">
        <label class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Manufacturer</label>
        <div class="space-y-1">
          ${vendors.map(v => `
            <label class="flex items-center justify-between text-xs text-slate-300 hover:text-white cursor-pointer select-none">
              <span class="flex items-center gap-2">
                <input type="checkbox" value="${v}" ${selectedAccVendors.includes(v) ? 'checked' : ''} onchange="toggleFilterItem('accVendor', '${v}')" class="rounded border-slate-700 bg-slate-950 text-amber-500" />
                <span>${v}</span>
              </span>
              <span class="font-mono text-[10px] text-slate-500">${list.filter(a => (a.vendor || '').trim() === v).length}</span>
            </label>
          `).join('')}
        </div>
      </div>

      <div class="space-y-2 pt-3 border-t border-slate-800">
        <label class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Type / Classification</label>
        <div class="space-y-1.5 text-xs text-slate-300">
          ${categories.map(c => `
            <label class="flex items-center gap-2 cursor-pointer hover:text-white">
              <input type="checkbox" value="${c}" ${selectedAccCategories.includes(c) ? 'checked' : ''} onchange="toggleFilterItem('accCategory', '${c}')" class="rounded border-slate-700 bg-slate-950 text-amber-500" />
              <span class="capitalize">${c.replace('_', ' ')}</span>
            </label>
          `).join('')}
        </div>
      </div>
    `;
  }
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
  } else if (type === "accCategory") {
    selectedAccCategories = selectedAccCategories.includes(val) ? selectedAccCategories.filter(c => c !== val) : [...selectedAccCategories, val];
  }
  runActiveFilter();
}

// -----------------------------------------------------------
// Master Hardware Filter & Renderer
// -----------------------------------------------------------
function runActiveFilter() {
  const container = document.getElementById("hardwareCardsContainer");
  const countBadge = document.getElementById("resultCount");
  const noResults = document.getElementById("noResultsState");
  const sortSelector = document.getElementById("sortSelector");

  if (!container) return;
  if (sortSelector) currentSortMode = sortSelector.value;

  let results = [];

  if (currentMode === "access") {
    results = SWITCH_DATABASE.filter(s => s.role === "Access");
  } else if (currentMode === "backbone") {
    results = SWITCH_DATABASE.filter(s => s.role === "Core" || s.role === "Aggregation");
  } else if (currentMode === "firewalls") {
    results = FIREWALL_DATABASE || [];
  } else if (currentMode === "optics") {
    results = OPTICS_LIST || [];
  } else if (currentMode === "wireless") {
    results = (typeof WIRELESS_DATABASE !== "undefined") ? WIRELESS_DATABASE : [];
  } else if (currentMode === "accessories") {
    results = (typeof ACCESSORY_DATABASE !== "undefined") ? ACCESSORY_DATABASE : [];
  }

  // Universal text search
  if (activeSearchQuery) {
    results = results.filter(item => {
      const targetStr = `${item.model || ''} ${item.sku || ''} ${item.name || ''} ${item.vendor || ''} ${item.category || ''} ${(item.keyFeatures || []).join(' ')}`.toLowerCase();
      return targetStr.includes(activeSearchQuery);
    });
  }

  // Switch Filters
  if (currentMode === "access" || currentMode === "backbone") {
    if (selectedVendors.length > 0) results = results.filter(s => selectedVendors.includes(s.vendor));
    if (selectedPortCounts.length > 0) results = results.filter(s => selectedPortCounts.includes(s.ports));
    if (requireShallowDepth) results = results.filter(s => s.shallowDepth);
    if (requireDualPsu) results = results.filter(s => s.dualPsu);
    if (requireStacking) results = results.filter(s => s.stacking);
    if (requireTAA) results = results.filter(s => s.taa);
    if (requireSubstation) results = results.filter(s => s.substationCertified);
    if (requirePerpetualPoE) results = results.filter(s => s.perpetualPoE);
    if (requireDinMount) results = results.filter(s => s.mounting && s.mounting.includes("DIN"));
    if (requireMultiGig) results = results.filter(s => s.hasMultiGig || (s.portSpeed && s.portSpeed.includes("2.5G")));
    if (selectedPoEClasses.includes("bt60")) results = results.filter(s => (s.poeBt60Ports || 0) > 0 || (s.poeBt90Ports || 0) > 0);
    if (selectedPoEClasses.includes("bt90")) results = results.filter(s => (s.poeBt90Ports || 0) > 0);
  }

  // Firewall Filters
  if (currentMode === "firewalls") {
    if (selectedFwVendors.length > 0) {
      results = results.filter(f => selectedFwVendors.includes((f.vendor || '').trim()));
    }
    if (selectedFwCategories.length > 0) {
      results = results.filter(f => selectedFwCategories.includes((f.category || '').toLowerCase().trim()));
    }
  }

  // Optics Filters
  if (currentMode === "optics") {
    if (selectedOpticMediums.length > 0) {
      results = results.filter(o => selectedOpticMediums.includes((o.medium || '').toLowerCase().trim()));
    }
    if (selectedOpticSpeeds.length > 0) {
      results = results.filter(o => selectedOpticSpeeds.includes((o.speed || '').trim()));
    }
    if (selectedOpticVendors.length > 0) {
      results = results.filter(o => selectedOpticVendors.includes((o.vendor || '').trim()));
    }
  }

  // Wireless Filters
  if (currentMode === "wireless") {
    if (selectedWlVendors.length > 0) {
      results = results.filter(w => {
        const v = (w.vendor || '').trim().toLowerCase();
        return selectedWlVendors.some(sel => {
          const s = sel.trim().toLowerCase();
          return v === s || (s === 'unifi' && v === 'ubiquiti') || (s === 'ubiquiti' && v === 'unifi');
        });
      });
    }
    if (selectedWlFrequencies.length > 0) {
      results = results.filter(w => {
        const cleanFreq = (w.frequency || '').toLowerCase().replace(/\s+/g, '');
        return selectedWlFrequencies.some(f => {
          const cleanF = f.toLowerCase().replace(/\s+/g, '');
          return cleanFreq.includes(cleanF);
        });
      });
    }
    if (requireWlBackup5G) results = results.filter(w => w.backup5GHz);
  }

  // Accessories Filters
  if (currentMode === "accessories") {
    if (selectedAccVendors.length > 0) {
      results = results.filter(a => selectedAccVendors.includes((a.vendor || '').trim()));
    }
    if (selectedAccCategories.length > 0) {
      results = results.filter(a => selectedAccCategories.includes((a.category || '').toLowerCase().trim()));
    }
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
    if (noResults) noResults.classList.remove("hidden");
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
  }

  if (window.lucide) {
    try { lucide.createIcons(); } catch (e) {}
  }
}

// -----------------------------------------------------------
// Card Renderers & Pre-Assignment Dropdowns
// -----------------------------------------------------------
function handleAddSwitchToBOM(switchId) {
  const selectEl = document.getElementById(`targetLocSelect-${switchId}`);
  const targetLoc = selectEl ? selectEl.value : null;

  if (targetLoc === "new_location") {
    handleLocationDropdownChange(selectEl, (createdLoc) => {
      addToProjectBOM(switchId, createdLoc);
    });
  } else {
    addToProjectBOM(switchId, targetLoc);
  }
}

function handleAddFirewallToBOM(sku) {
  const selectEl = document.getElementById(`targetFwLocSelect-${sku}`);
  const targetLoc = selectEl ? selectEl.value : null;

  if (targetLoc === "new_location") {
    handleLocationDropdownChange(selectEl, (createdLoc) => {
      addFirewallToBOM(sku, createdLoc);
    });
  } else {
    addFirewallToBOM(sku, targetLoc);
  }
}

function renderSwitchCard(sw) {
  const isCompared = comparisonList.includes(sw.id);
  let vendorColor = "bg-slate-800 text-slate-300 border-slate-700";
  if (sw.vendor === "Meraki") vendorColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  if (sw.vendor === "Juniper") vendorColor = "bg-blue-500/10 text-blue-400 border-blue-500/30";
  if (sw.vendor === "Ruckus") vendorColor = "bg-amber-500/10 text-amber-400 border-amber-500/30";
  if (sw.vendor === "UniFi") vendorColor = "bg-sky-500/10 text-sky-400 border-sky-500/30";
  if (sw.vendor === "AMG") vendorColor = "bg-rose-500/10 text-rose-400 border-rose-500/30";
  if (sw.vendor === "Allied Telesis") vendorColor = "bg-teal-500/10 text-teal-400 border-teal-500/30";

  let roleBadge = sw.role === "Core" ?
    '<span class="badge-chip border border-purple-500/50 bg-purple-500/20 text-purple-300">Core / Spine</span>' :
    sw.role === "Aggregation" ?
    '<span class="badge-chip border border-indigo-500/50 bg-indigo-500/20 text-indigo-300">Aggregation</span>' :
    '<span class="badge-chip border border-slate-600 bg-slate-800 text-slate-300">Access Edge</span>';

  const hasModularBay = sw.modularUplink && sw.modularUplink.hasSlot;
  const hasLicenseOption = sw.featureLicense && sw.featureLicense.hasOptions;
  const allLocations = typeof FacilityStore !== "undefined" ? FacilityStore.getLocationNames(true) : ["Unassigned", "MDF • Rack-1", "IDF-1 • Rack-1"];
  const defaultLoc = (sw.role === "Core" || sw.role === "Aggregation") ? "MDF • Rack-1" : "IDF-1 • Rack-1";

  let allocationHtml = "";
  if (typeof auditSwitchCapacities === "function" && typeof projectBOM !== "undefined") {
    const activeInstances = projectBOM.filter(i => !i.parentInstanceId && (i.id === sw.id || i.sku === sw.sku));
    if (activeInstances.length > 0) {
      const audits = auditSwitchCapacities();
      const instancePills = activeInstances.map(inst => {
        const a = audits[inst.instanceId];
        if (!a) return "";
        const portOverload = a.usedDownlinkPorts > a.totalPorts;
        const poeOverload = a.totalPoEBudget > 0 && a.consumedPoEWatts > a.totalPoEBudget;
        const rawLoc = inst.closetName || inst.rackId || FacilityStore.UNASSIGNED;
        const displayLoc = typeof FacilityStore !== "undefined" ? FacilityStore.normalize(rawLoc) : rawLoc;

        return `
          <div class="bg-slate-950/90 border ${portOverload || poeOverload ? 'border-rose-500/50' : 'border-slate-800'} rounded-lg p-2 text-[11px] space-y-1">
            <div class="flex justify-between items-center text-slate-400">
              <span class="font-bold text-white">${displayLoc}</span>
              <span class="font-mono text-[10px] ${portOverload ? 'text-rose-400 font-bold' : 'text-slate-400'}">
                ${a.usedDownlinkPorts}/${a.totalPorts} Ports
              </span>
            </div>
            ${a.totalPoEBudget > 0 ? `
              <div class="flex justify-between items-center text-[10px]">
                <span class="text-slate-500">PoE (+20% Headroom):</span>
                <span class="font-mono font-bold ${poeOverload ? 'text-rose-400' : 'text-amber-300'}">
                  ${a.consumedPoEWatts}W / ${a.totalPoEBudget}W
                </span>
              </div>
            ` : ''}
            ${a.alerts.length > 0 ? `
              <div class="text-[9px] text-rose-400 font-medium truncate" title="${a.alerts[0]}">
                ⚠️ ${a.alerts[0]}
              </div>
            ` : ''}
          </div>
        `;
      }).join("");

      allocationHtml = `
        <div class="mb-3 space-y-1.5">
          <div class="flex items-center justify-between">
            <span class="text-[10px] uppercase font-bold tracking-wider text-emerald-400 flex items-center gap-1">
              <i data-lucide="check-circle" class="w-3 h-3"></i> Quoted in Project (${activeInstances.length}x)
            </span>
          </div>
          <div class="space-y-1">
            ${instancePills}
          </div>
        </div>
      `;
    }
  }

  return `
    <div class="bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all rounded-2xl p-4 flex flex-col justify-between shadow-md group">
      <div>
        <div class="flex items-start justify-between gap-2 mb-2">
          <div>
            <div class="flex flex-wrap items-center gap-1.5 mb-1.5">
              <span class="badge-chip border ${vendorColor}">${sw.vendor}</span>
              ${roleBadge}
              <span class="badge-chip border border-slate-700 bg-slate-800 text-slate-300">${sw.ports} Ports</span>
              ${sw.stacking ? '<span class="badge-chip border border-indigo-500/40 bg-indigo-500/10 text-indigo-300">Stackable</span>' : ''}
              ${sw.shallowDepth ? '<span class="badge-chip border border-sky-500/40 bg-sky-500/10 text-sky-300">Shallow &lt;12"</span>' : ''}
              ${sw.dualPsu ? '<span class="badge-chip border border-indigo-500/40 bg-indigo-500/10 text-indigo-300">Dual PSU</span>' : ''}
              ${sw.mounting && sw.mounting.includes("DIN") ? '<span class="badge-chip border border-amber-500/40 bg-amber-500/10 text-amber-300">DIN-Mount</span>' : ''}
              ${sw.hasMultiGig ? '<span class="badge-chip border border-teal-500/40 bg-teal-500/10 text-teal-300">Multi-Gig</span>' : ''}
              ${sw.perpetualPoE ? '<span class="badge-chip border border-emerald-500/40 bg-emerald-500/10 text-emerald-300">Continuous PoE</span>' : ''}
              ${sw.substationCertified ? '<span class="badge-chip border border-amber-500/40 bg-amber-500/10 text-amber-300">IEC 61850-3</span>' : ''}
              ${sw.taa ? '<span class="badge-chip border border-sky-500/40 bg-sky-500/10 text-sky-300">TAA/NDAA</span>' : ''}
            </div>
            <h3 class="font-bold text-base text-white group-hover:text-brand-400 transition-colors">${sw.model}</h3>
            <span class="text-[11px] font-mono text-slate-400">SKU: ${sw.sku}</span>
          </div>
          <div class="text-right">
            <span class="text-xs text-slate-400 block">Est. MSRP</span>
            <span class="font-mono text-base font-bold text-emerald-400">$${sw.msrp.toLocaleString()}</span>
          </div>
        </div>

        ${allocationHtml}

        <div class="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 mb-2.5 text-xs space-y-1.5">
          <div class="flex justify-between">
            <span class="text-slate-400 font-medium">Downlink Ports:</span>
            <span class="text-white font-semibold font-mono text-[11px]">${sw.portFormFactorSummary}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-slate-400 font-medium">Uplink Architecture:</span>
            ${hasModularBay ? `
              <select id="sled-${sw.id}" class="bg-slate-900 border border-brand-500/40 text-brand-300 text-[10px] font-mono rounded px-1.5 py-0.5 focus:outline-none">
                ${sw.modularUplink.supportedModules.map(mSku => {
                  const mod = MODULAR_UPLINK_CATALOG[mSku];
                  return `<option value="${mSku}" ${mSku === sw.modularUplink.defaultModuleSku ? 'selected' : ''}>${mod ? `${mod.name} (+$${mod.msrp})` : mSku}</option>`;
                }).join("")}
              </select>
            ` : `<span class="text-indigo-300 font-semibold font-mono text-[11px]">${sw.uplinksSummary}</span>`}
          </div>

          ${hasLicenseOption ? `
            <div class="pt-2 border-t border-slate-800/80 space-y-1">
              <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Add Feature Licenses:</span>
              <div class="space-y-1 bg-slate-900/60 p-2 rounded-lg border border-slate-855">
                ${sw.featureLicense.supportedLicenses.map(lSku => {
                  const lic = FEATURE_LICENSE_CATALOG[lSku];
                  if (!lic) return '';
                  return `
                    <label class="flex items-center justify-between text-[11px] text-slate-300 cursor-pointer hover:text-white">
                      <div class="flex items-center gap-1.5">
                        <input type="checkbox" name="featLic-${sw.id}" value="${lSku}" class="rounded border-slate-700 bg-slate-950 text-teal-500 cursor-pointer">
                        <span>${lic.name}</span>
                      </div>
                      <span class="font-mono text-emerald-400 font-semibold">+$${lic.msrp.toLocaleString()}</span>
                    </label>
                  `;
                }).join('')}
              </div>
            </div>
          ` : ''}

          ${sw.dualPsu && sw.psuSku && POWER_SUPPLY_CATALOG[sw.psuSku] ? `
            <div class="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <label class="flex items-center gap-1.5 text-slate-300 cursor-pointer hover:text-white">
                <input type="checkbox" id="psuRedundant-${sw.id}" class="rounded border-slate-700 bg-slate-950 text-indigo-500 cursor-pointer">                 <span class="font-medium text-[11px]">Add 2nd Redundant Power Supply</span>               </label>               <span class="font-mono text-emerald-400 font-semibold">+$${POWER_SUPPLY_CATALOG[sw.psuSku].msrp.toLocaleString()}</span>
            </div>
          ` : ''}
        </div>

        ${sw.role === 'Access' ? `
          <div class="grid grid-cols-4 gap-1.5 bg-slate-950 p-2 rounded-xl border border-slate-855 mb-2 text-center text-xs">
            <div><span class="text-[9px] text-slate-500 block uppercase">PoE (af)</span><span class="font-mono font-bold text-white">${sw.poeAfPorts || 0}p</span></div>
            <div><span class="text-[9px] text-slate-500 block uppercase">PoE+ (at)</span><span class="font-mono font-bold text-sky-300">${sw.poeAtPorts || 0}p</span></div>
            <div><span class="text-[9px] text-slate-500 block uppercase">PoE++ (60W)</span><span class="font-mono font-bold text-indigo-300">${sw.poeBt60Ports || 0}p</span></div>
            <div><span class="text-[9px] text-slate-500 block uppercase">PoE+++ (90W)</span><span class="font-mono font-bold text-amber-400">${sw.poeBt90Ports || 0}p</span></div>
          </div>
        ` : ''}

        <div class="grid grid-cols-3 gap-2 bg-slate-950/70 p-2 rounded-xl border border-slate-855 mb-3 text-xs">
          <div><span class="text-[10px] text-slate-500 block uppercase font-medium">${sw.role === 'Access' ? 'PoE Budget' : 'Fabric'}</span><span class="font-mono font-bold text-amber-400">${sw.role === 'Access' ? `${sw.poeBudget}W` : sw.switchingCapacity}</span></div>
          <div><span class="text-[10px] text-slate-500 block uppercase font-medium">VMS Buffer</span><span class="font-mono font-bold ${sw.packetBufferMb >= 4 ? 'text-cyan-300' : 'text-slate-400'}">${sw.packetBufferMb} MB</span></div>
          <div><span class="text-[10px] text-slate-500 block uppercase font-medium">Depth</span><span class="font-mono font-semibold ${sw.shallowDepth ? 'text-sky-300' : 'text-slate-400'}">${sw.depthInches}"</span></div>
        </div>

        <div class="space-y-1 mb-3">
          ${(sw.keyFeatures || []).map(f => `
            <div class="text-[11px] text-slate-300 flex items-center gap-1.5">
              <i data-lucide="check" class="w-3 h-3 text-emerald-400 shrink-0"></i>
              <span>${f}</span>
            </div>
          `).join("")}
        </div>
      </div>

      <!-- Action Row: Compare + Destination Dropdown + Add to Quote -->
      <div class="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
        <button onclick="toggleCompareItem('${sw.id}')" class="px-2.5 py-1.5 rounded-lg border ${isCompared ? 'border-brand-500 bg-brand-500/20 text-brand-300' : 'border-slate-700 bg-slate-800 text-slate-300'} text-xs font-medium flex items-center gap-1 shrink-0">
          <i data-lucide="${isCompared ? 'check-square' : 'plus-square'}" class="w-3.5 h-3.5"></i>
          <span>${isCompared ? 'Compared' : 'Compare'}</span>
        </button>

        <select id="targetLocSelect-${sw.id}" onchange="if(this.value==='new_location') handleLocationDropdownChange(this)" class="bg-slate-950 border border-slate-700 text-slate-300 text-[11px] font-bold rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-500 max-w-[130px] truncate" title="Destination Location / Cabinet">
          ${allLocations.map(loc => `
            <option value="${loc}" ${loc === defaultLoc ? 'selected' : ''}>${loc}</option>
          `).join('')}
          <option value="new_location">+ New Location...</option>
        </select>

        <button onclick="handleAddSwitchToBOM('${sw.id}')" class="flex-1 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md">
          <i data-lucide="plus" class="w-3.5 h-3.5"></i>
          <span>Add to Quote</span>
        </button>
      </div>
    </div>
  `;
}

function renderFirewallCard(fw) {
  const isCompared = comparisonList.includes(fw.sku);
  const allLocations = typeof FacilityStore !== "undefined" ? FacilityStore.getLocationNames(true) : ["Unassigned", "MDF • Rack-1"];

  return `
    <div class="bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all rounded-2xl p-4 flex flex-col justify-between shadow-md">
      <div>
        <div class="flex items-start justify-between gap-2 mb-2">
          <div>
            <div class="flex items-center gap-1.5 mb-1.5 flex-wrap">
              <span class="badge-chip border border-rose-500/30 bg-rose-500/10 text-rose-400 font-bold">${fw.vendor}</span>
              <span class="badge-chip border border-slate-700 bg-slate-800 text-slate-300 uppercase">${(fw.category || '').replace('_', ' ')}</span>
              ${fw.cellularFailover ? '<span class="badge-chip border border-amber-500/30 bg-amber-500/10 text-amber-300">LTE / 5G Failover</span>' : ''}
              ${fw.ports ? `<span class="badge-chip border border-slate-700 bg-slate-800 text-slate-300">${fw.ports}x Interfaces</span>` : ''}
              ${fw.has10G ? '<span class="badge-chip border border-indigo-500/40 bg-indigo-500/10 text-indigo-300">10G SFP+ WAN</span>' : ''}
            </div>
            <h3 class="font-bold text-base text-white">${fw.model}</h3>
            <span class="text-[11px] font-mono text-slate-400">SKU: ${fw.sku}</span>
          </div>
          <div class="text-right">
            <span class="text-xs text-slate-400 block">Est. MSRP</span>
            <span class="font-mono text-base font-bold text-emerald-400">$${fw.msrp.toLocaleString()}</span>
          </div>
        </div>

        <div class="bg-slate-950 p-2.5 rounded-xl border border-slate-800 mb-3 space-y-1.5 text-xs font-mono">
          <div class="flex justify-between"><span class="text-slate-500">Stateful FW:</span><span class="text-white font-bold">${fw.statefulThroughput || '1.0 Gbps'}</span></div>
          <div class="flex justify-between"><span class="text-slate-500">UTM / Threat:</span><span class="text-rose-300 font-bold">${fw.threatThroughput || '500 Mbps'}</span></div>
          <div class="flex justify-between"><span class="text-slate-500">Site-to-Site VPN:</span><span class="text-indigo-300 font-bold">${fw.vpnThroughput || '250 Mbps'}</span></div>
          <div class="flex justify-between"><span class="text-slate-500">Physical Ports:</span><span class="text-slate-200">${fw.interfaces || `${fw.ports || 4}x GbE RJ45`}</span></div>
        </div>
      </div>

      <div class="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
        <button onclick="toggleCompareItem('${fw.sku}')" class="px-2.5 py-1.5 rounded-lg border ${isCompared ? 'border-brand-500 bg-brand-500/20 text-brand-300' : 'border-slate-700 bg-slate-800 text-slate-300'} text-xs font-medium flex items-center gap-1 shrink-0">
          <i data-lucide="${isCompared ? 'check-square' : 'plus-square'}" class="w-3.5 h-3.5"></i>
        </button>
        <select id="targetFwLocSelect-${fw.sku}" onchange="if(this.value==='new_location') handleLocationDropdownChange(this)" class="bg-slate-950 border border-slate-700 text-slate-300 text-[11px] font-bold rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-500 max-w-[130px] truncate" title="Destination Location">
          ${allLocations.map(loc => `<option value="${loc}">${loc}</option>`).join('')}
          <option value="new_location">+ New Location...</option>
        </select>
        <button onclick="handleAddFirewallToBOM('${fw.sku}')" class="flex-1 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md">
          <i data-lucide="plus" class="w-3.5 h-3.5"></i>
          <span>Add Gateway</span>
        </button>
      </div>
    </div>
  `;
}

function renderOpticCard(opt) {
  const isDac = (opt.medium || '').toLowerCase() === 'dac';
  const isStacking = (opt.medium || '').toLowerCase() === 'stacking';
  const defaultQty = (isDac || isStacking) ? 1 : 2;

  let badgeColor = "border-sky-500/30 bg-sky-500/10 text-sky-300";
  if (isStacking) badgeColor = "border-indigo-500/40 bg-indigo-500/10 text-indigo-300";

  return `
    <div class="bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all rounded-2xl p-4 flex flex-col justify-between shadow-md">
      <div>
        <div class="flex items-start justify-between gap-2 mb-2">
          <div>
            <div class="flex items-center gap-1.5 mb-1.5 flex-wrap">
              <span class="badge-chip border ${badgeColor} font-bold">${opt.speed}</span>
              <span class="badge-chip border border-slate-700 bg-slate-800 text-slate-300 uppercase">${(opt.medium || '').toUpperCase()}</span>
              <span class="badge-chip border border-slate-700 bg-slate-800 text-slate-300">${opt.vendor}</span>
            </div>
            <h3 class="font-bold text-sm text-white">${opt.name}</h3>
            <span class="text-[11px] font-mono text-slate-400">SKU: ${opt.sku}</span>
          </div>
          <div class="text-right">
            <span class="text-xs text-slate-400 block">Unit MSRP</span>
            <span class="font-mono text-sm font-bold text-emerald-400">$${opt.msrp.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div class="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
        <div class="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1">
          <span class="text-[10px] text-slate-500 font-mono">${isStacking ? 'CABLES:' : isDac ? 'DAC:' : 'OPTICS:'}</span>
          <input type="number" id="opt-qty-${opt.sku}" min="1" max="48" value="${defaultQty}" class="w-10 bg-transparent text-xs text-white font-mono font-bold focus:outline-none text-right" />
        </div>
        <button onclick="addOpticsToBOM('${opt.sku}', '${opt.name}', ${opt.msrp}, parseInt(document.getElementById('opt-qty-${opt.sku}')?.value) || ${defaultQty}, '${opt.vendor}')" class="flex-1 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md">
          <i data-lucide="plus" class="w-3.5 h-3.5"></i>
          <span>${isStacking ? 'Add Stacking Cable' : isDac ? 'Add DAC Cable' : 'Add Transceivers'}</span>
        </button>
      </div>
    </div>
  `;
}

function renderWirelessCard(radio) {
  const isCompared = comparisonList.includes(radio.id);
  const throughput = radio.maxThroughputGbps || radio.throughputGbps || (radio.throughputMbps ? `${radio.throughputMbps / 1000} Gbps` : '1.0+ Gbps');
  const distance = radio.maxDistanceKm || radio.distanceKm || radio.rangeKm || 'N/A';
  const watts = radio.powerWatts || radio.powerDrawWatts || radio.poeWatts || 24;

  return `
    <div class="bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all rounded-2xl p-4 flex flex-col justify-between shadow-md">
      <div>
        <div class="flex items-start justify-between gap-2 mb-2">
          <div>
            <div class="flex items-center gap-1.5 mb-1.5 flex-wrap">
              <span class="badge-chip border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-bold">${radio.vendor}</span>
              <span class="badge-chip border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 font-bold">${radio.frequency}</span>
              <span class="badge-chip border border-slate-700 bg-slate-800 text-slate-300 font-mono">${radio.topology}</span>
              ${radio.backup5GHz ? '<span class="badge-chip border border-sky-500/30 bg-sky-500/10 text-sky-300">5GHz Failover</span>' : ''}
              ${radio.integratedAntenna ? '<span class="badge-chip border border-teal-500/30 bg-teal-500/10 text-teal-300">Integrated Antenna</span>' : ''}
            </div>
            <h3 class="font-bold text-base text-white">${radio.model}</h3>
            <span class="text-[11px] font-mono text-slate-400">SKU: ${radio.sku}</span>
          </div>
          <div class="text-right">
            <span class="text-xs text-slate-400 block">Single Radio</span>
            <span class="font-mono text-base font-bold text-emerald-400">$${radio.msrp.toLocaleString()}</span>
          </div>
        </div>

        <div class="bg-slate-950 p-2.5 rounded-xl border border-slate-800 mb-2.5 text-xs font-mono space-y-1">
          <div class="flex justify-between"><span class="text-slate-500">Max Throughput:</span><span class="text-emerald-400 font-bold">${throughput}</span></div>
          <div class="flex justify-between"><span class="text-slate-500">Max Distance:</span><span class="text-slate-200 font-bold">${distance} km</span></div>
          <div class="flex justify-between"><span class="text-slate-500">Power Consumption:</span><span class="text-amber-300 font-bold">${watts} W (${watts > 30 ? '802.3bt' : '802.3at'})</span></div>
        </div>

        <div class="bg-slate-950/60 p-2.5 rounded-xl border border-slate-855 mb-3 space-y-1.5 text-xs">
          ${radio.precisionMountSku ? `
            <label class="flex items-center justify-between text-slate-300 cursor-pointer hover:text-white">
              <div class="flex items-center gap-1.5">
                <input type="checkbox" id="wl-prec-${radio.id}" checked class="rounded border-slate-700 bg-slate-950 text-indigo-500" />
                <span class="text-[11px]">Precision Alignment Bracket</span>
              </div>
              <span class="font-mono text-slate-400">+$99</span>
            </label>
          ` : ''}
          ${radio.surgeSku ? `
            <label class="flex items-center justify-between text-slate-300 cursor-pointer hover:text-white">
              <div class="flex items-center gap-1.5">
                <input type="checkbox" id="wl-surge-${radio.id}" checked class="rounded border-slate-700 bg-slate-950 text-indigo-500" />
                <span class="text-[11px]">Outdoor PoE Surge Suppressor</span>
              </div>
              <span class="font-mono text-slate-400">+$19</span>
            </label>
          ` : ''}
        </div>
      </div>

      <div class="pt-3 border-t border-slate-800 space-y-2">
        <div class="flex items-center gap-2">
          <button onclick="toggleCompareItem('${radio.id}')" class="px-2.5 py-1.5 rounded-lg border ${isCompared ? 'border-brand-500 bg-brand-500/20 text-brand-300' : 'border-slate-700 bg-slate-800 text-slate-300'} text-xs font-medium flex items-center gap-1 shrink-0">
            <i data-lucide="${isCompared ? 'check-square' : 'plus-square'}" class="w-3.5 h-3.5"></i>
          </button>
          <button onclick="addWirelessToBOM('${radio.id}', false)" class="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold">
            Single Unit ($${radio.msrp})
          </button>
        </div>
        <button onclick="addWirelessToBOM('${radio.id}', true)" class="w-full py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-bold shadow flex items-center justify-center gap-1.5">
          <i data-lucide="split" class="w-3.5 h-3.5"></i> Add Matched 2-Radio Link Pair ($${radio.msrp * 2})
        </button>
      </div>
    </div>
  `;
}

function renderAccessoryCard(acc) {
  const allLocations = typeof FacilityStore !== "undefined" ? FacilityStore.getLocationNames(true) : ["Unassigned", "MDF • Rack-1"];

  return `
    <div class="bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all rounded-2xl p-4 flex flex-col justify-between shadow-md">
      <div>
        <div class="flex items-start justify-between gap-2 mb-2">
          <div>
            <div class="flex items-center gap-1.5 mb-1.5 flex-wrap">
              <span class="badge-chip border border-amber-500/30 bg-amber-500/10 text-amber-400 font-bold">${acc.vendor}</span>
              <span class="badge-chip border border-slate-700 bg-slate-800 text-slate-300 uppercase">${(acc.category || 'Accessory').replace('_', ' ')}</span>
              ${acc.mounting ? `<span class="badge-chip border border-slate-700 bg-slate-800 text-slate-400">${acc.mounting}</span>` : ''}
            </div>
            <h3 class="font-bold text-base text-white">${acc.model || acc.name}</h3>
            <span class="text-[11px] font-mono text-slate-400">SKU: ${acc.sku}</span>
          </div>
          <div class="text-right">
            <span class="text-xs text-slate-400 block">Unit MSRP</span>
            <span class="font-mono text-base font-bold text-emerald-400">$${(acc.msrp || 0).toLocaleString()}</span>
          </div>
        </div>

        <p class="text-xs text-slate-300 mb-3 line-clamp-2">${acc.description || 'Hardware accessory & interconnect adapter.'}</p>
      </div>

      <div class="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
        <select id="targetAccLocSelect-${acc.sku}" onchange="if(this.value==='new_location') handleLocationDropdownChange(this)" class="bg-slate-950 border border-slate-700 text-slate-300 text-[11px] font-bold rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-500 max-w-[130px] truncate" title="Destination Location">
          ${allLocations.map(loc => `<option value="${loc}">${loc}</option>`).join('')}
          <option value="new_location">+ New Location...</option>
        </select>
        <button onclick="addOpticsToBOM('${acc.sku}', '${acc.model || acc.name}', ${acc.msrp || 0}, 1, '${acc.vendor}')" class="flex-1 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md">
          <i data-lucide="plus" class="w-3.5 h-3.5"></i>
          <span>Add Accessory</span>
        </button>
      </div>
    </div>
  `;
}

// -----------------------------------------------------------
// Comparison Matrix Engine
// -----------------------------------------------------------
function toggleCompareItem(id) {
  if (comparisonList.includes(id)) {
    comparisonList = comparisonList.filter(item => item !== id);
  } else {
    if (comparisonList.length >= 4) {
      showToast("Maximum 4 models can be compared simultaneously.");
      return;
    }
    comparisonList.push(id);
  }

  updateCompareBadge();
  runActiveFilter();
  renderCompareModalContent();
}

function updateCompareBadge() {
  const badge = document.getElementById("compareCountBadge");
  if (!badge) return;
  badge.innerText = comparisonList.length;
  if (comparisonList.length > 0) badge.classList.remove("hidden");
  else badge.classList.add("hidden");
}

function clearComparison() {
  comparisonList = [];
  updateCompareBadge();
  runActiveFilter();
  renderCompareModalContent();
  showToast("Comparison cleared.");
}

function toggleCompareModal() {
  const modal = document.getElementById("compareModal");
  if (!modal) return;
  if (modal.classList.contains("hidden")) {
    modal.classList.remove("hidden");
    renderCompareModalContent();
  } else {
    modal.classList.add("hidden");
  }
}

function renderCompareModalContent() {
  const container = document.getElementById("compareContent");
  if (!container) return;

  if (comparisonList.length === 0) {
    container.innerHTML = `
      <div class="py-20 text-center text-slate-500 space-y-2">
        <i data-lucide="columns-3" class="w-10 h-10 mx-auto text-slate-600"></i>
        <p class="text-sm font-semibold text-slate-400">Comparison Matrix is empty.</p>
        <p class="text-xs">Click "Compare" on up to 4 models in the catalog to evaluate specs side-by-side.</p>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
    return;
  }

  const items = comparisonList.map(id => {
    return SWITCH_DATABASE.find(s => s.id === id) ||
           FIREWALL_DATABASE.find(f => f.sku === id) ||
           ((typeof WIRELESS_DATABASE !== "undefined") ? WIRELESS_DATABASE.find(w => w.id === id) : null);
  }).filter(Boolean);

  container.innerHTML = `
    <div class="overflow-x-auto">
      <table class="w-full text-xs text-left border-collapse">
        <thead>
          <tr class="border-b border-slate-800">
            <th class="p-3 text-slate-400 font-bold uppercase tracking-wider w-44">Feature</th>
            ${items.map(it => `
              <th class="p-3 min-w-[200px]">
                <div class="flex items-center justify-between gap-2">
                  <span class="font-bold text-white text-sm">${it.model}</span>
                  <button onclick="toggleCompareItem('${it.id || it.sku}')" class="text-slate-500 hover:text-rose-400"><i data-lucide="x" class="w-4 h-4"></i></button>
                </div>
                <span class="text-[10px] font-mono text-slate-400">${it.vendor} &bull; ${it.sku}</span>
              </th>
            `).join('')}
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-800 font-mono">
          <tr><td class="p-3 text-slate-400">MSRP</td>${items.map(it => `<td class="p-3 text-emerald-400 font-bold">$${(it.msrp || 0).toLocaleString()}</td>`).join('')}</tr>
          <tr><td class="p-3 text-slate-400">Downlink Ports</td>${items.map(it => `<td class="p-3 text-white">${it.ports || it.interfaces || 'N/A'}</td>`).join('')}</tr>
          <tr><td class="p-3 text-slate-400">PoE Budget</td>${items.map(it => `<td class="p-3 text-amber-400">${it.poeBudget ? `${it.poeBudget}W` : 'None'}</td>`).join('')}</tr>
          <tr><td class="p-3 text-slate-400">VMS Packet Buffer</td>${items.map(it => `<td class="p-3 text-cyan-300">${it.packetBufferMb ? `${it.packetBufferMb} MB` : 'N/A'}</td>`).join('')}</tr>
          <tr><td class="p-3 text-slate-400">Uplinks / Backhaul</td>${items.map(it => `<td class="p-3 text-slate-300">${it.uplinksSummary || (it.maxThroughputGbps ? `${it.maxThroughputGbps} Gbps` : 'Fixed')}</td>`).join('')}</tr>
          <tr><td class="p-3 text-slate-400">Cabinet Depth</td>${items.map(it => `<td class="p-3 text-slate-300">${it.depthInches ? `${it.depthInches}"` : 'N/A'}</td>`).join('')}</tr>
          <tr><td class="p-3 text-slate-400">Stacking</td>${items.map(it => `<td class="p-3 ${it.stacking ? 'text-emerald-400' : 'text-slate-500'}">${it.stacking ? 'Yes' : 'No'}</td>`).join('')}</tr>
          <tr><td class="p-3 text-slate-400">Dual PSU</td>${items.map(it => `<td class="p-3 ${it.dualPsu ? 'text-emerald-400' : 'text-slate-500'}">${it.dualPsu ? 'Yes' : 'No'}</td>`).join('')}</tr>
          <tr><td class="p-3 text-slate-400">TAA / NDAA</td>${items.map(it => `<td class="p-3 ${it.taa ? 'text-emerald-400' : 'text-slate-500'}">${it.taa ? 'Compliant' : 'Commercial'}</td>`).join('')}</tr>
        </tbody>
      </table>
    </div>
  `;

  if (window.lucide) {
    try { lucide.createIcons(); } catch (e) {}
  }
}

// -----------------------------------------------------------
// Multi-Project State Persistence & Project Synchronization (Item B)
// -----------------------------------------------------------
let autoSaveDebounce = null;
function queueAutoSave() {
  clearTimeout(autoSaveDebounce);
  autoSaveDebounce = setTimeout(saveStateToLocalStorage, 300);
}

function saveStateToLocalStorage() {
  try {
    const projId = FacilityStore.getProjectId();
    const state = {
      projectBOM: projectBOM || [],
      demandCounts,
      extraHeadroomPercent,
      globalSelectedTerm: typeof globalSelectedTerm !== "undefined" ? globalSelectedTerm : "1YR"
    };
    localStorage.setItem(`netselect_active_state_${projId}`, JSON.stringify(state));
  } catch (e) {}
}

function restoreStateFromLocalStorage() {
  try {
    const projId = FacilityStore.getProjectId();
    const raw = localStorage.getItem(`netselect_active_state_${projId}`) || localStorage.getItem("netselect_active_state_v1");
    if (!raw) return;
    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed.projectBOM)) projectBOM = parsed.projectBOM;
    if (parsed.demandCounts) demandCounts = parsed.demandCounts;
    if (parsed.extraHeadroomPercent) extraHeadroomPercent = parsed.extraHeadroomPercent;
    if (parsed.globalSelectedTerm && typeof globalSelectedTerm !== "undefined") globalSelectedTerm = parsed.globalSelectedTerm;
  } catch (e) {}
}

function toggleProjectModal() {
  const modal = document.getElementById("projectModal");
  if (!modal) return;
  modal.classList.toggle("hidden");
  if (!modal.classList.contains("hidden")) {
    renderSavedProjectsList();
  }
}

function renderSavedProjectsList() {
  const container = document.getElementById("savedProjectsList");
  if (!container) return;

  let saved = [];
  try {
    saved = JSON.parse(localStorage.getItem("netselect_saved_quotes") || "[]");
  } catch (e) { saved = []; }

  if (saved.length === 0) {
    container.innerHTML = `<span class="text-xs text-slate-500">No saved quote snapshots found.</span>`;
    return;
  }

  container.innerHTML = saved.map((proj, idx) => `
    <div class="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
      <div>
        <span class="font-bold text-white block">${proj.name}</span>
        <span class="text-[10px] text-slate-500 font-mono">${proj.date} &bull; ${proj.itemsCount} items &bull; $${(proj.totalMsrp || 0).toLocaleString()}</span>
      </div>
      <div class="flex items-center gap-1.5">
        <button onclick="loadProjectSnapshot(${idx})" class="px-2 py-1 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-lg text-[10px]">Load</button>
        <button onclick="deleteProjectSnapshot(${idx})" class="p-1 text-slate-500 hover:text-rose-400"><i data-lucide="trash" class="w-3.5 h-3.5"></i></button>
      </div>
    </div>
  `).join('');

  if (window.lucide) {
    try { lucide.createIcons(); } catch (e) {}
  }
}

function saveCurrentAsNewProject() {
  const nameInput = document.getElementById("newProjectNameInput");
  const name = nameInput ? nameInput.value.trim() : null;
  if (!name) { showToast("Please enter a project name."); return; }

  const projId = `proj-${Date.now()}`;
  FacilityStore.setProjectId(projId);

  let saved = [];
  try {
    saved = JSON.parse(localStorage.getItem("netselect_saved_quotes") || "[]");
  } catch (e) { saved = []; }

  let totalMsrp = 0;
  projectBOM.forEach(i => totalMsrp += (i.msrp * i.qty));

  // Retrieve project-specific facility floors
  let facilityFloors = [];
  try {
    const rawFac = localStorage.getItem(`netselect_facility_${projId}`);
    if (rawFac) facilityFloors = JSON.parse(rawFac);
  } catch (e) {}

  saved.push({
    id: projId,
    name,
    date: new Date().toLocaleDateString(),
    itemsCount: projectBOM.reduce((acc, i) => acc + i.qty, 0),
    totalMsrp,
    bom: projectBOM,
    demandCounts,
    facilityFloors
  });

  localStorage.setItem("netselect_saved_quotes", JSON.stringify(saved));
  if (nameInput) nameInput.value = "";
  const label = document.getElementById("activeProjectLabel");
  if (label) label.innerText = name;

  // Persist state under new project ID
  saveStateToLocalStorage();
  if (typeof saveFacilityState === "function") saveFacilityState();

  renderSavedProjectsList();
  showToast(`Saved project: ${name}`);
}

function loadProjectSnapshot(idx) {
  let saved = [];
  try {
    saved = JSON.parse(localStorage.getItem("netselect_saved_quotes") || "[]");
  } catch (e) { return; }

  const proj = saved[idx];
  if (!proj) return;

  const projId = proj.id || `proj-${idx}`;
  FacilityStore.setProjectId(projId);

  projectBOM = proj.bom || [];
  if (proj.demandCounts) demandCounts = proj.demandCounts;

  const label = document.getElementById("activeProjectLabel");
  if (label) label.innerText = proj.name;

  // Sync Facility Layout State to this project
  if (typeof loadFacilityState === "function") {
    loadFacilityState();
  }

  // Refresh All Application Views
  FacilityStore.notifyWorkspaceChange();
  buildCalculatorStrip();
  runActiveFilter();

  toggleProjectModal();
  showToast(`Loaded snapshot: ${proj.name}`);
}

function deleteProjectSnapshot(idx) {
  let saved = [];
  try {
    saved = JSON.parse(localStorage.getItem("netselect_saved_quotes") || "[]");
  } catch (e) { return; }

  const proj = saved[idx];
  if (proj && proj.id) {
    localStorage.removeItem(`netselect_facility_${proj.id}`);
    localStorage.removeItem(`netselect_active_state_${proj.id}`);
    localStorage.removeItem(`netselect_topo_pos_${proj.id}`);
  }

  saved.splice(idx, 1);
  localStorage.setItem("netselect_saved_quotes", JSON.stringify(saved));
  renderSavedProjectsList();
  showToast("Snapshot deleted.");
}

function exportCurrentProjectJSON() {
  const projId = FacilityStore.getProjectId();
  let facilityData = null;
  try {
    const rawFac = localStorage.getItem(`netselect_facility_${projId}`);
    if (rawFac) facilityData = JSON.parse(rawFac);
  } catch (e) {}

  const data = {
    projectId: projId,
    projectName: document.getElementById("activeProjectLabel")?.innerText || "Project",
    projectBOM,
    demandCounts,
    extraHeadroomPercent,
    facilityData,
    exportDate: new Date().toISOString()
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `NetSelect_${data.projectName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("Exported project JSON.");
}

function importProjectJSON(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (Array.isArray(parsed.projectBOM)) {
        const projId = parsed.projectId || `proj-${Date.now()}`;
        FacilityStore.setProjectId(projId);

        projectBOM = parsed.projectBOM;
        if (parsed.demandCounts) demandCounts = parsed.demandCounts;
        extraHeadroomPercent = parsed.extraHeadroomPercent || 20;

        if (parsed.facilityData) {
          localStorage.setItem(`netselect_facility_${projId}`, JSON.stringify(parsed.facilityData));
        }

        const label = document.getElementById("activeProjectLabel");
        if (label && parsed.projectName) label.innerText = parsed.projectName;

        if (typeof loadFacilityState === "function") loadFacilityState();

        FacilityStore.notifyWorkspaceChange();
        buildCalculatorStrip();
        runActiveFilter();

        toggleProjectModal();
        showToast("Project JSON successfully loaded!");
      }
    } catch (err) {
      showToast("Invalid project JSON file.");
    }
  };
  reader.readAsText(file);
}

// -----------------------------------------------------------
// Toast Notification Utility
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