// ==========================================
// APPLICATION CORE, STATE & FILTER ENGINE
// ==========================================

let activeMode = "access";
let accessPortSelection = "any";
let backboneRoleSelection = "all";
let lockPoEBudget = false;
let comparisonList = [];

// Global Persistent Filter State
const filterState = {
  search: "",
  vendors: ["Meraki", "Juniper", "Ruckus", "UniFi", "AMG", "Allied Telesis", "Ubiquiti", "Siklu", "Cambium"],
  mgmts: ["standalone", "free_central", "paid_onprem", "paid_cloud"],
  industrialOnly: false,
  stackingOnly: false,
  dualPsuOnly: false,
  perpetualPoE: false,
  shallowDepth: false,
  substation: false,
  poePassThrough: false,
  deepBuffer: false,
  uplinks100G: false,
  evpn: false,
  minClients: 0,
  opticsFormFactor: "all",
  opticsMedium: "all",
  // Wireless Filters
  wirelessTopology: "all",
  wirelessBand: "all",
  wirelessTargetKm: 1.5,
  wirelessRequire5gBackup: false
};

function switchMode(mode) {
  activeMode = mode;
  ['access', 'backbone', 'firewalls', 'optics', 'wireless'].forEach(m => {
    const btn = document.getElementById(`nav-${m}`);
    if (btn) btn.classList.remove('active');
  });
  document.getElementById(`nav-${mode}`)?.classList.add('active');

  renderTopCalculatorStrip(mode);
  renderSidebarFilters(mode);

  const searchBox = document.getElementById("filterSearch");
  if (searchBox) searchBox.value = filterState.search;

  setTimeout(() => {
    runActiveFilter();
  }, 30);
}

function renderTopCalculatorStrip(mode) {
  const container = document.getElementById("calculatorStripContainer");
  if (!container) return;

  if (mode === "access") {
    container.innerHTML = `
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3">
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <div class="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400"><i data-lucide="plug-zap" class="w-5 h-5"></i></div>
            <div>
              <h3 class="text-sm font-bold text-white flex items-center gap-2">Camera & Device PoE Port Calculator <span class="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">+20% Headroom Included</span></h3>
              <p class="text-xs text-slate-400">Enter required endpoints by standard to filter access switches with sufficient power & port breakdown.</p>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2 sm:gap-3">
            <div class="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800">
              <label class="text-[10px] font-semibold text-slate-400">PoE (15.4W):</label>
              <input type="number" id="calcPoE" min="0" value="0" oninput="runActiveFilter(); updateBOMView();" class="w-10 bg-slate-800 text-center text-xs py-1 rounded text-white font-mono border border-slate-700" />
            </div>
            <div class="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800">
              <label class="text-[10px] font-semibold text-slate-400">PoE+ (30W):</label>
              <input type="number" id="calcPoEPlus" min="0" value="0" oninput="runActiveFilter(); updateBOMView();" class="w-10 bg-slate-800 text-center text-xs py-1 rounded text-white font-mono border border-slate-700" />
            </div>
            <div class="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800">
              <label class="text-[10px] font-semibold text-slate-400">PoE++ (60W):</label>
              <input type="number" id="calcPoEPlusPlus" min="0" value="0" oninput="runActiveFilter(); updateBOMView();" class="w-10 bg-slate-800 text-center text-xs py-1 rounded text-white font-mono border border-slate-700" />
            </div>
            <div class="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800">
              <label class="text-[10px] font-semibold text-amber-300 font-bold">PoE+++ (90W):</label>
              <input type="number" id="calcPoEPlusPlusPlus" min="0" value="0" oninput="runActiveFilter(); updateBOMView();" class="w-10 bg-slate-800 text-center text-xs py-1 rounded text-amber-300 font-bold font-mono border border-slate-700" />
            </div>
            <div class="px-3 py-1.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 rounded-xl text-xs flex items-center gap-2">
              <span class="text-amber-200 text-[11px] font-bold">Target:</span>
              <span id="calculatedPoETarget" class="font-mono font-bold text-amber-300 text-sm">0 W</span>
            </div>
            <button id="lockPoEBtn" onclick="togglePoELock()" class="text-xs px-2.5 py-1.5 rounded-xl font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1">
              <i data-lucide="filter" class="w-3.5 h-3.5"></i><span id="lockPoEText">Lock Budget</span>
            </button>
          </div>
        </div>
        <div id="vmsBufferWarning" class="hidden p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl flex items-center gap-2 text-xs text-amber-300">
          <i data-lucide="alert-triangle" class="w-4 h-4 text-amber-400 shrink-0"></i>
          <span><strong>High Camera Ingest Notice:</strong> &ge;24 cameras specified. Select switches with packet buffers &ge; 4MB to prevent dropped frames during VMS ingest bursts.</span>
        </div>
      </div>
    `;
  } else if (mode === "wireless") {
    container.innerHTML = `
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3">
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <div class="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"><i data-lucide="radio" class="w-5 h-5"></i></div>
            <div>
              <h3 class="text-sm font-bold text-white flex items-center gap-2">RF Distance & Rain-Fade Advisor</h3>
              <p class="text-xs text-slate-400">Simulate link distance across mmWave and sub-6 frequencies to audit rain-fade limits.</p>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-3 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
            <div class="flex items-center gap-2">
              <label class="text-[11px] font-semibold text-slate-400">Target Distance:</label>
              <input type="range" id="wirelessDistanceSlider" min="0.1" max="25" step="0.1" value="${filterState.wirelessTargetKm}" oninput="updateWirelessDistance(this.value)" class="w-32 accent-emerald-500 cursor-pointer" />
              <span id="wirelessDistanceLabel" class="font-mono font-bold text-emerald-400 text-xs w-24">${filterState.wirelessTargetKm} km</span>
            </div>
          </div>
        </div>
        <div id="wirelessRainFadeAlert" class="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
          <span id="wirelessAdvisorText" class="text-slate-300">Evaluating RF conditions...</span>
        </div>
      </div>
    `;
    updateWirelessDistance(filterState.wirelessTargetKm, false);
  } else {
    container.innerHTML = "";
  }

  if (window.lucide) {
    try { lucide.createIcons(); } catch(e) {}
  }
}

function updateWirelessDistance(kmVal, reFilter = true) {
  filterState.wirelessTargetKm = parseFloat(kmVal);
  const lbl = document.getElementById("wirelessDistanceLabel");
  const alertText = document.getElementById("wirelessAdvisorText");
  const alertContainer = document.getElementById("wirelessRainFadeAlert");

  if (lbl) lbl.innerText = `${filterState.wirelessTargetKm} km (${(filterState.wirelessTargetKm * 0.621371).toFixed(1)} mi)`;

  if (alertText && alertContainer) {
    if (filterState.wirelessTargetKm > 5.0) {
      alertContainer.className = "p-3 bg-amber-950/40 border border-amber-800/80 rounded-xl flex items-center gap-2 text-xs text-amber-300";
      alertText.innerHTML = `<strong>Heavy Rain-Fade Advisory:</strong> At ${filterState.wirelessTargetKm} km, standalone 60GHz/80GHz links will suffer severe rain attenuation (>25 mm/hr). Sub-6GHz (5GHz) or integrated backup radios are strictly required.`;
    } else if (filterState.wirelessTargetKm > 2.0) {
      alertContainer.className = "p-3 bg-sky-950/40 border border-sky-800/80 rounded-xl flex items-center gap-2 text-xs text-sky-300";
      alertText.innerHTML = `<strong>Medium Range:</strong> High-gain 60GHz dishes (e.g., Wave Pro) or 70/80GHz E-Band units with 2ft antennas recommended.`;
    } else {
      alertContainer.className = "p-3 bg-emerald-950/40 border border-emerald-800/80 rounded-xl flex items-center gap-2 text-xs text-emerald-300";
      alertText.innerHTML = `<strong>Clear Line of Sight (Short Range):</strong> 60GHz mmWave provides maximum 2Gbps–10Gbps capacity with zero channel congestion.`;
    }
  }

  if (reFilter) runActiveFilter();
}

function updateSearchFilter(val) {
  filterState.search = val.trim();
  runActiveFilter();
}

function togglePersistentVendor(vendor, isChecked) {
  if (isChecked) {
    if (!filterState.vendors.includes(vendor)) filterState.vendors.push(vendor);
  } else {
    filterState.vendors = filterState.vendors.filter(v => v !== vendor);
  }
  runActiveFilter();
}

function togglePersistentMgmt(mgmt, isChecked) {
  if (isChecked) {
    if (!filterState.mgmts.includes(mgmt)) filterState.mgmts.push(mgmt);
  } else {
    filterState.mgmts = filterState.mgmts.filter(m => m !== mgmt);
  }
  runActiveFilter();
}

function renderSidebarFilters(mode) {
  const container = document.getElementById("dynamicSidebarContent");
  const title = document.getElementById("sidebarFilterTitle");
  if (!container || !title) return;

  if (mode === "access") {
    title.innerHTML = `<i data-lucide="filter" class="w-3.5 h-3.5 text-brand-400"></i> Access & Edge Specs`;
    container.innerHTML = `
      <div>
        <label class="text-[11px] font-semibold text-slate-300 block mb-1">Chassis Port Count</label>
        <div class="grid grid-cols-2 gap-1.5">
          <button onclick="setAccessPorts('any')" id="portPill-any" class="px-2 py-1 text-xs rounded ${accessPortSelection === 'any' ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-300'} font-medium">Any Port</button>
          <button onclick="setAccessPorts('compact')" id="portPill-compact" class="px-2 py-1 text-xs rounded ${accessPortSelection === 'compact' ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-300'} font-medium">Compact (4-12)</button>
          <button onclick="setAccessPorts('24')" id="portPill-24" class="px-2 py-1 text-xs rounded ${accessPortSelection === '24' ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-300'} font-medium">24 Ports</button>
          <button onclick="setAccessPorts('48')" id="portPill-48" class="px-2 py-1 text-xs rounded ${accessPortSelection === '48' ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-300'} font-medium">48 Ports</button>
        </div>
      </div>

      <div class="pt-3 border-t border-slate-800">
        <label class="flex items-center gap-2 p-2 bg-amber-950/30 border border-amber-500/40 rounded-xl text-xs text-amber-300 font-bold cursor-pointer hover:bg-amber-900/30 transition-colors">
          <input type="checkbox" id="filterIndustrialOnly" onchange="filterState.industrialOnly = this.checked; runActiveFilter()" ${filterState.industrialOnly ? 'checked' : ''} class="rounded border-amber-500 text-amber-500 bg-slate-950 cursor-pointer" />
          <span>Hardened / Industrial Only (-40°C)</span>
        </label>
      </div>

      <div class="pt-3 border-t border-slate-800 space-y-2">
        <label class="text-[11px] font-semibold text-slate-300 block">Enclosure & Electrical</label>
        <label class="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
          <input type="checkbox" id="filterPerpetualPoE" onchange="filterState.perpetualPoE = this.checked; runActiveFilter()" ${filterState.perpetualPoE ? 'checked' : ''} class="rounded border-slate-700 text-brand-600 bg-slate-800" />
          <span class="text-emerald-300 font-medium">Perpetual / Continuous PoE</span>
        </label>
        <label class="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
          <input type="checkbox" id="filterShallowDepth" onchange="filterState.shallowDepth = this.checked; runActiveFilter()" ${filterState.shallowDepth ? 'checked' : ''} class="rounded border-slate-700 text-brand-600 bg-slate-800" />
          <span class="text-sky-300 font-medium">&lt;12" Depth (NEMA Fit)</span>
        </label>
        <label class="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
          <input type="checkbox" id="filterSubstation" onchange="filterState.substation = this.checked; runActiveFilter()" ${filterState.substation ? 'checked' : ''} class="rounded border-slate-700 text-brand-600 bg-slate-800" />
          <span class="text-amber-400 font-medium">Substation (IEC 61850-3)</span>
        </label>
        <label class="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
          <input type="checkbox" id="filterPoePassThrough" onchange="filterState.poePassThrough = this.checked; runActiveFilter()" ${filterState.poePassThrough ? 'checked' : ''} class="rounded border-slate-700 text-brand-600 bg-slate-800" />
          <span class="text-cyan-300 font-medium">PoE Pass-Through Powered</span>
        </label>
        <label class="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
          <input type="checkbox" id="filterStacking" onchange="filterState.stackingOnly = this.checked; runActiveFilter()" ${filterState.stackingOnly ? 'checked' : ''} class="rounded border-slate-700 text-brand-600 bg-slate-800" />
          <span>Stacking Capable</span>
        </label>
        <label class="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
          <input type="checkbox" id="filterDualPsu" onchange="filterState.dualPsuOnly = this.checked; runActiveFilter()" ${filterState.dualPsuOnly ? 'checked' : ''} class="rounded border-slate-700 text-brand-600 bg-slate-800" />
          <span>Dual Hot-Swap PSUs</span>
        </label>
      </div>

      <div class="pt-3 border-t border-slate-800 space-y-1.5">
        <label class="text-[11px] font-semibold text-slate-300 block">Management Architecture</label>
        ${renderPersistentMgmtCheckboxes()}
      </div>

      <div class="pt-3 border-t border-slate-800 space-y-1.5">
        <label class="text-[11px] font-semibold text-slate-300 block">Manufacturer</label>
        ${renderPersistentVendorCheckboxes()}
      </div>
    `;
  } else if (mode === "backbone") {
    title.innerHTML = `<i data-lucide="filter" class="w-3.5 h-3.5 text-brand-400"></i> Core & Agg Specs`;
    container.innerHTML = `
      <div>
        <label class="text-[11px] font-semibold text-slate-300 block mb-1.5">Layer Role</label>
        <div class="grid grid-cols-2 gap-1.5">
          <button onclick="setBackboneRole('all')" id="bbRole-all" class="px-2 py-1 text-xs rounded ${backboneRoleSelection === 'all' ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-300'} font-medium">All Core/Agg</button>
          <button onclick="setBackboneRole('Core')" id="bbRole-Core" class="px-2 py-1 text-xs rounded ${backboneRoleSelection === 'Core' ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-300'} font-medium">Core Only</button>
          <button onclick="setBackboneRole('Aggregation')" id="bbRole-Aggregation" class="px-2 py-1 text-xs rounded ${backboneRoleSelection === 'Aggregation' ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-300'} font-medium col-span-2">Aggregation Only</button>
        </div>
      </div>

      <div class="pt-3 border-t border-slate-800">
        <label class="flex items-center gap-2 p-2 bg-amber-950/30 border border-amber-500/40 rounded-xl text-xs text-amber-300 font-bold cursor-pointer hover:bg-amber-900/30 transition-colors">
          <input type="checkbox" id="filterIndustrialOnly" onchange="filterState.industrialOnly = this.checked; runActiveFilter()" ${filterState.industrialOnly ? 'checked' : ''} class="rounded border-amber-500 text-amber-500 bg-slate-950 cursor-pointer" />
          <span>Hardened / Industrial Aggregation (-40°C)</span>
        </label>
      </div>

      <div class="pt-3 border-t border-slate-800 space-y-2">
        <label class="text-[11px] font-semibold text-slate-300 block">Fabric & Stacking</label>
        <label class="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
          <input type="checkbox" id="filterStacking" onchange="filterState.stackingOnly = this.checked; runActiveFilter()" ${filterState.stackingOnly ? 'checked' : ''} class="rounded border-slate-700 text-brand-600 bg-slate-800" />
          <span class="text-indigo-300 font-medium">Stacking / VCStack / VC</span>
        </label>
        <label class="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
          <input type="checkbox" id="filterDeepBuffer" onchange="filterState.deepBuffer = this.checked; runActiveFilter()" ${filterState.deepBuffer ? 'checked' : ''} class="rounded border-slate-700 text-brand-600 bg-slate-800" />
          <span class="text-cyan-300 font-medium">VMS Buffer (&ge; 16MB)</span>
        </label>
        <label class="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
          <input type="checkbox" id="filter100G" onchange="filterState.uplinks100G = this.checked; runActiveFilter()" ${filterState.uplinks100G ? 'checked' : ''} class="rounded border-slate-700 text-brand-600 bg-slate-800" />
          <span class="text-purple-300 font-medium">100G QSFP28 Uplinks</span>
        </label>
        <label class="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
          <input type="checkbox" id="filterEvpn" onchange="filterState.evpn = this.checked; runActiveFilter()" ${filterState.evpn ? 'checked' : ''} class="rounded border-slate-700 text-brand-600 bg-slate-800" />
          <span class="text-indigo-300 font-medium">EVPN-VXLAN / Advanced L3</span>
        </label>
        <label class="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
          <input type="checkbox" id="filterDualPsu" onchange="filterState.dualPsuOnly = this.checked; runActiveFilter()" ${filterState.dualPsuOnly ? 'checked' : ''} class="rounded border-slate-700 text-brand-600 bg-slate-800" />
          <span class="text-emerald-300 font-medium">Dual Hot-Swap PSUs</span>
        </label>
      </div>

      <div class="pt-3 border-t border-slate-800 space-y-1.5">
        <label class="text-[11px] font-semibold text-slate-300 block">Management Architecture</label>
        ${renderPersistentMgmtCheckboxes()}
      </div>

      <div class="pt-3 border-t border-slate-800 space-y-1.5">
        <label class="text-[11px] font-semibold text-slate-300 block">Manufacturer</label>
        ${renderPersistentVendorCheckboxes()}
      </div>
    `;
  } else if (mode === "firewalls") {
    title.innerHTML = `<i data-lucide="filter" class="w-3.5 h-3.5 text-brand-400"></i> Gateway & WAN Specs`;
    container.innerHTML = `
      <div class="space-y-1.5">
        <label class="text-[11px] font-semibold text-slate-300 block">Manufacturer</label>
        ${renderPersistentVendorCheckboxes()}
      </div>

      <div class="pt-3 border-t border-slate-800">
        <label class="text-[11px] font-semibold text-slate-300 block mb-1">Min Client Support</label>
        <select id="fwClientMin" onchange="filterState.minClients = parseInt(this.value) || 0; runActiveFilter()" class="w-full bg-slate-950 border border-slate-700 text-xs rounded-lg px-2.5 py-1.5 text-white">
          <option value="0" ${filterState.minClients === 0 ? 'selected' : ''}>Any Client Count</option>
          <option value="100" ${filterState.minClients === 100 ? 'selected' : ''}>&ge; 100 Clients</option>
          <option value="500" ${filterState.minClients === 500 ? 'selected' : ''}>&ge; 500 Clients</option>
          <option value="1000" ${filterState.minClients === 1000 ? 'selected' : ''}>&ge; 1,000 Clients</option>
          <option value="5000" ${filterState.minClients === 5000 ? 'selected' : ''}>&ge; 5,000 Clients</option>
        </select>
      </div>

      <div class="pt-3 border-t border-slate-800 space-y-2">
        <label class="text-[11px] font-semibold text-slate-300 block">Hardware Options</label>
        <label class="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
          <input type="checkbox" id="fwDualPsuOnly" onchange="filterState.dualPsuOnly = this.checked; runActiveFilter()" ${filterState.dualPsuOnly ? 'checked' : ''} class="rounded border-slate-700 text-brand-600 bg-slate-800" />
          <span class="text-emerald-300 font-medium">Dual Hot-Swap PSUs</span>
        </label>
        <label class="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
          <input type="checkbox" id="fwCellularOnly" onchange="filterState.industrialOnly = this.checked; runActiveFilter()" ${filterState.industrialOnly ? 'checked' : ''} class="rounded border-slate-700 text-brand-600 bg-slate-800" />
          <span class="text-orange-300 font-medium">Integrated 4G/LTE Modem</span>
        </label>
      </div>
    `;
  } else if (mode === "optics") {
    title.innerHTML = `<i data-lucide="filter" class="w-3.5 h-3.5 text-brand-400"></i> Optics & Interconnects`;
    container.innerHTML = `
      <div>
        <label class="text-[11px] font-semibold text-slate-300 block mb-1">Form Factor</label>
        <select id="opticsFormFactorFilter" onchange="filterState.opticsFormFactor = this.value; runActiveFilter()" class="w-full bg-slate-950 border border-slate-700 text-xs rounded-lg px-2.5 py-1.5 text-white">
          <option value="all" ${filterState.opticsFormFactor === 'all' ? 'selected' : ''}>All Form Factors</option>
          <option value="SFP" ${filterState.opticsFormFactor === 'SFP' ? 'selected' : ''}>SFP (1G)</option>
          <option value="SFP+" ${filterState.opticsFormFactor === 'SFP+' ? 'selected' : ''}>SFP+ (10G)</option>
          <option value="SFP28" ${filterState.opticsFormFactor === 'SFP28' ? 'selected' : ''}>SFP28 (25G)</option>
          <option value="QSFP28" ${filterState.opticsFormFactor === 'QSFP28' ? 'selected' : ''}>QSFP28 (100G)</option>
          <option value="DAC" ${filterState.opticsFormFactor === 'DAC' ? 'selected' : ''}>Direct Attach Copper (DAC)</option>
          <option value="Stacking" ${filterState.opticsFormFactor === 'Stacking' ? 'selected' : ''}>Hardware Stacking Cable</option>
        </select>
      </div>

      <div class="pt-3 border-t border-slate-800">
        <label class="text-[11px] font-semibold text-slate-300 block mb-1">Cable Medium</label>
        <select id="opticsMediumFilter" onchange="filterState.opticsMedium = this.value; runActiveFilter()" class="w-full bg-slate-950 border border-slate-700 text-xs rounded-lg px-2.5 py-1.5 text-white">
          <option value="all" ${filterState.opticsMedium === 'all' ? 'selected' : ''}>All Cable Media</option>
          <option value="MMF" ${filterState.opticsMedium === 'MMF' ? 'selected' : ''}>Multi-Mode Fiber (MMF / SR)</option>
          <option value="SMF" ${filterState.opticsMedium === 'SMF' ? 'selected' : ''}>Single-Mode Fiber (SMF / LR)</option>
          <option value="DAC" ${filterState.opticsMedium === 'DAC' ? 'selected' : ''}>Direct Attach Copper</option>
          <option value="Hardware" ${filterState.opticsMedium === 'Hardware' ? 'selected' : ''}>Proprietary Stacking Cable</option>
        </select>
      </div>

      <div class="pt-3 border-t border-slate-800 space-y-1.5">
        <label class="text-[11px] font-semibold text-slate-300 block">Manufacturer</label>
        ${renderPersistentVendorCheckboxes()}
      </div>
    `;
  } else if (mode === "wireless") {
    title.innerHTML = `<i data-lucide="filter" class="w-3.5 h-3.5 text-brand-400"></i> Wireless PtP & PtMP Specs`;
    container.innerHTML = `
      <div>
        <label class="text-[11px] font-semibold text-slate-300 block mb-1.5">Topology Architecture</label>
        <div class="grid grid-cols-2 gap-1.5">
          <button onclick="setWirelessTopology('all')" id="wlTop-all" class="px-2 py-1 text-xs rounded ${filterState.wirelessTopology === 'all' ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-300'} font-medium">All Topologies</button>
          <button onclick="setWirelessTopology('PtP')" id="wlTop-PtP" class="px-2 py-1 text-xs rounded ${filterState.wirelessTopology === 'PtP' ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-300'} font-medium">Point-to-Point (PtP)</button>
          <button onclick="setWirelessTopology('PtMP-AP')" id="wlTop-PtMP-AP" class="px-2 py-1 text-xs rounded ${filterState.wirelessTopology === 'PtMP-AP' ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-300'} font-medium col-span-2">BaseStation / AP (PtMP)</button>
        </div>
      </div>

      <div class="pt-3 border-t border-slate-800">
        <label class="text-[11px] font-semibold text-slate-300 block mb-1">Frequency Spectrum</label>
        <select onchange="filterState.wirelessBand = this.value; runActiveFilter()" class="w-full bg-slate-950 border border-slate-700 text-xs rounded-lg px-2.5 py-1.5 text-white">
          <option value="all" ${filterState.wirelessBand === 'all' ? 'selected' : ''}>All Frequency Bands</option>
          <option value="60 GHz mmWave" ${filterState.wirelessBand === '60 GHz mmWave' ? 'selected' : ''}>60 GHz mmWave (High Capacity)</option>
          <option value="70/80 GHz E-Band" ${filterState.wirelessBand === '70/80 GHz E-Band' ? 'selected' : ''}>70/80 GHz E-Band (10G Dedicated)</option>
          <option value="5 GHz Sub-6" ${filterState.wirelessBand === '5 GHz Sub-6' ? 'selected' : ''}>5 GHz Sub-6 (Rain Resilient)</option>
        </select>
      </div>

      <div class="pt-3 border-t border-slate-800 space-y-2">
        <label class="text-[11px] font-semibold text-slate-300 block">Link Reliability</label>
        <label class="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
          <input type="checkbox" id="filterWl5gBackup" onchange="filterState.wirelessRequire5gBackup = this.checked; runActiveFilter()" ${filterState.wirelessRequire5gBackup ? 'checked' : ''} class="rounded border-slate-700 text-brand-600 bg-slate-800" />
          <span class="text-amber-300 font-medium">Integrated 5GHz Backup Radio</span>
        </label>
      </div>

      <div class="pt-3 border-t border-slate-800 space-y-1.5">
        <label class="text-[11px] font-semibold text-slate-300 block">Manufacturer</label>
        ${['Ubiquiti', 'Siklu', 'Cambium', 'AMG'].map(v => `
          <label class="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
            <input type="checkbox" value="${v}" onchange="togglePersistentVendor('${v}', this.checked)" ${filterState.vendors.includes(v) ? 'checked' : ''} class="rounded border-slate-700 text-brand-600 bg-slate-800" />
            <span>${v}</span>
          </label>
        `).join('')}
      </div>
    `;
  }

  if (window.lucide) {
    try { lucide.createIcons(); } catch(e) {}
  }
}

function setWirelessTopology(val) {
  filterState.wirelessTopology = val;
  ['all', 'PtP', 'PtMP-AP'].forEach(v => {
    const btn = document.getElementById(`wlTop-${v}`);
    if (btn) {
      btn.classList.remove('bg-brand-600', 'text-white');
      btn.classList.add('bg-slate-800', 'text-slate-300');
    }
  });
  const activeBtn = document.getElementById(`wlTop-${val}`);
  activeBtn?.classList.remove('bg-slate-800', 'text-slate-300');
  activeBtn?.classList.add('bg-brand-600', 'text-white');
  runActiveFilter();
}

function renderPersistentVendorCheckboxes() {
  const vendorDefs = [
    { key: "Meraki", label: "Cisco Meraki & Catalyst-M" },
    { key: "Juniper", label: "Juniper Networks" },
    { key: "Ruckus", label: "Ruckus CommScope" },
    { key: "UniFi", label: "Ubiquiti UniFi" },
    { key: "AMG", label: "AMG Systems (Industrial)" },
    { key: "Allied Telesis", label: "Allied Telesis (Security/Industrial)" }
  ];

  return vendorDefs.map(v => `
    <label class="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
      <input type="checkbox" value="${v.key}" onchange="togglePersistentVendor('${v.key}', this.checked)" ${filterState.vendors.includes(v.key) ? 'checked' : ''} class="rounded border-slate-700 text-brand-600 bg-slate-800" />
      <span>${v.label}</span>
    </label>
  `).join('');
}

function renderPersistentMgmtCheckboxes() {
  const mgmtDefs = [
    { key: "standalone", label: "Standalone / Air-Gapped CLI" },
    { key: "free_central", label: "Free Central (UniFi OS)" },
    { key: "paid_onprem", label: "Paid On-Prem (AMF / SmartZone)" },
    { key: "paid_cloud", label: "Paid Cloud (Meraki / Mist)" }
  ];

  return mgmtDefs.map(m => `
    <label class="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
      <input type="checkbox" value="${m.key}" onchange="togglePersistentMgmt('${m.key}', this.checked)" ${filterState.mgmts.includes(m.key) ? 'checked' : ''} class="rounded border-slate-700 text-brand-600 bg-slate-800" />
      <span>${m.label}</span>
    </label>
  `).join('');
}

function setAccessPorts(val) {
  accessPortSelection = val;
  ['any', 'compact', '24', '48'].forEach(v => {
    const btn = document.getElementById(`portPill-${v}`);
    if (btn) {
      btn.classList.remove('bg-brand-600', 'text-white');
      btn.classList.add('bg-slate-800', 'text-slate-300');
    }
  });
  const activeBtn = document.getElementById(`portPill-${val}`);
  activeBtn?.classList.remove('bg-slate-800', 'text-slate-300');
  activeBtn?.classList.add('bg-brand-600', 'text-white');
  runActiveFilter();
}

function setBackboneRole(val) {
  backboneRoleSelection = val;
  ['all', 'Core', 'Aggregation'].forEach(v => {
    const btn = document.getElementById(`bbRole-${v}`);
    if (btn) {
      btn.classList.remove('bg-brand-600', 'text-white');
      btn.classList.add('bg-slate-800', 'text-slate-300');
    }
  });
  const activeBtn = document.getElementById(`bbRole-${val}`);
  activeBtn?.classList.remove('bg-slate-800', 'text-slate-300');
  activeBtn?.classList.add('bg-brand-600', 'text-white');
  runActiveFilter();
}

function togglePoELock() {
  lockPoEBudget = !lockPoEBudget;
  const btn = document.getElementById("lockPoEBtn");
  const txt = document.getElementById("lockPoEText");
  if (lockPoEBudget) {
    btn?.classList.replace("bg-slate-800", "bg-amber-600");
    if (txt) txt.innerText = "Budget Locked";
  } else {
    btn?.classList.replace("bg-amber-600", "bg-slate-800");
    if (txt) txt.innerText = "Lock Budget";
  }
  runActiveFilter();
}

function calculatePoETarget() {
  const af = parseInt(document.getElementById("calcPoE")?.value) || 0;
  const at = parseInt(document.getElementById("calcPoEPlus")?.value) || 0;
  const bt60 = parseInt(document.getElementById("calcPoEPlusPlus")?.value) || 0;
  const bt90 = parseInt(document.getElementById("calcPoEPlusPlusPlus")?.value) || 0;

  const totalCameras = af + at + bt60 + bt90;
  const raw = (af * 15.4) + (at * 30) + (bt60 * 60) + (bt90 * 90);
  const budgetWithHeadroom = Math.ceil(raw * 1.2);

  const targetEl = document.getElementById("calculatedPoETarget");
  if (targetEl) targetEl.innerText = `${budgetWithHeadroom} W`;

  const vmsWarning = document.getElementById("vmsBufferWarning");
  if (vmsWarning) {
    if (totalCameras >= 24) vmsWarning.classList.remove("hidden");
    else vmsWarning.classList.add("hidden");
  }

  return { af, at, bt60, bt90, budgetWithHeadroom, raw, totalCameras };
}

function runActiveFilter() {
  const search = filterState.search.toLowerCase();

  if (activeMode === "access") {
    const { af, at, bt60, bt90, budgetWithHeadroom } = calculatePoETarget();

    const filtered = SWITCH_DATABASE.filter(sw => {
      if (sw.role !== "Access") return false;
      if (search && !sw.model.toLowerCase().includes(search) && !sw.sku.toLowerCase().includes(search) && !sw.vendor.toLowerCase().includes(search)) return false;
      if (!filterState.vendors.includes(sw.vendor)) return false;

      if (sw.mgmtTypes && !sw.mgmtTypes.some(m => filterState.mgmts.includes(m))) return false;

      if (filterState.industrialOnly && sw.env !== "Industrial") return false;
      if (accessPortSelection !== "any" && sw.portCategory !== accessPortSelection) return false;
      if (filterState.perpetualPoE && !sw.perpetualPoE) return false;
      if (filterState.shallowDepth && !sw.shallowDepth) return false;
      if (filterState.substation && !sw.substationCertified) return false;
      if (filterState.poePassThrough && !sw.poePassThrough) return false;
      if (filterState.stackingOnly && !sw.stacking) return false;
      if (filterState.dualPsuOnly && !sw.dualPsu) return false;

      if (af > 0 && sw.poeAfPorts < af) return false;
      if (at > 0 && sw.poeAtPorts < at) return false;
      if (bt60 > 0 && sw.poeBt60Ports < bt60) return false;
      if (bt90 > 0 && sw.poeBt90Ports < bt90) return false;
      if (lockPoEBudget && sw.poeBudget < budgetWithHeadroom) return false;

      return true;
    });

    renderHardwareCards(filtered);
  } else if (activeMode === "backbone") {
    const filtered = SWITCH_DATABASE.filter(sw => {
      if (sw.role !== "Core" && sw.role !== "Aggregation") return false;
      if (backboneRoleSelection !== "all" && sw.role !== backboneRoleSelection) return false;
      if (search && !sw.model.toLowerCase().includes(search) && !sw.sku.toLowerCase().includes(search) && !sw.vendor.toLowerCase().includes(search)) return false;
      if (!filterState.vendors.includes(sw.vendor)) return false;

      if (sw.mgmtTypes && !sw.mgmtTypes.some(m => filterState.mgmts.includes(m))) return false;

      if (filterState.industrialOnly && sw.env !== "Industrial") return false;
      if (filterState.stackingOnly && !sw.stacking) return false;
      if (filterState.dualPsuOnly && !sw.dualPsu) return false;
      if (filterState.deepBuffer && sw.packetBufferMb < 16) return false;
      if (filterState.uplinks100G && sw.maxBackboneSpeed !== "100G") return false;
      if (filterState.evpn && !sw.evpnVxlan) return false;

      return true;
    });

    renderHardwareCards(filtered);
  } else if (activeMode === "firewalls") {
    const filtered = FIREWALL_DATABASE.filter(fw => {
      if (!filterState.vendors.includes(fw.vendor)) return false;
      if (filterState.minClients > 0 && fw.clients < filterState.minClients) return false;
      if (filterState.dualPsuOnly && !fw.dualPsu) return false;
      if (filterState.industrialOnly && fw.category !== "cellular") return false;
      if (search && !fw.model.toLowerCase().includes(search) && !fw.sku.toLowerCase().includes(search)) return false;
      return true;
    });

    renderFirewallCards(filtered);
  } else if (activeMode === "optics") {
    const filtered = OPTICS_LIST.filter(opt => {
      if (search && !opt.name.toLowerCase().includes(search) && !opt.sku.toLowerCase().includes(search) && !opt.vendor.toLowerCase().includes(search)) return false;
      if (!filterState.vendors.includes(opt.vendor)) return false;
      if (filterState.opticsFormFactor !== "all" && opt.formFactor !== filterState.opticsFormFactor) return false;
      if (filterState.opticsMedium !== "all" && opt.medium !== filterState.opticsMedium) return false;
      return true;
    });

    renderOpticsCards(filtered);
  } else if (activeMode === "wireless") {
    const targetKm = filterState.wirelessTargetKm || 1.0;
    const filtered = WIRELESS_DATABASE.filter(r => {
      if (search && !r.model.toLowerCase().includes(search) && !r.sku.toLowerCase().includes(search) && !r.vendor.toLowerCase().includes(search)) return false;
      if (!filterState.vendors.includes(r.vendor)) return false;
      if (filterState.wirelessTopology !== "all" && r.topology !== filterState.wirelessTopology) return false;
      if (filterState.wirelessBand !== "all" && r.band !== filterState.wirelessBand) return false;
      if (filterState.wirelessRequire5gBackup && !r.integrated5gBackup) return false;
      if (targetKm > r.maxRangeKm) return false;
      return true;
    });

    renderWirelessCards(filtered);
  }
}

function renderHardwareCards(list) {
  const sortMode = document.getElementById("sortSelector")?.value || "featured";

  list.sort((a, b) => {
    if (sortMode === "poe_desc") return b.poeBudget - a.poeBudget;
    if (sortMode === "buffer_desc") return b.packetBufferMb - a.packetBufferMb;
    if (sortMode === "throughput_desc") return b.throughputMpps - a.throughputMpps;
    if (sortMode === "ports_desc") return b.ports - a.ports;
    if (sortMode === "price_asc") return a.msrp - b.msrp;
    if (sortMode === "price_desc") return b.msrp - a.msrp;
    return (b.ports || 0) - (a.ports || 0);
  });

  const container = document.getElementById("hardwareCardsContainer");
  const noResults = document.getElementById("noResultsState");
  const countBadge = document.getElementById("resultCount");
  if (countBadge) countBadge.innerText = list.length;

  if (!container) return;

  if (list.length === 0) {
    container.innerHTML = "";
    noResults?.classList.remove("hidden");
    return;
  }

  noResults?.classList.add("hidden");
  container.innerHTML = list.map(sw => renderSwitchCard(sw)).join("");
  if (window.lucide) {
    try { lucide.createIcons(); } catch(e) {}
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

  return `
    <div class="bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all rounded-2xl p-4 flex flex-col justify-between shadow-md group">
      <div>
        <div class="flex items-start justify-between gap-2 mb-2">
          <div>
            <div class="flex flex-wrap items-center gap-1.5 mb-1.5">
              <span class="badge-chip border ${vendorColor}">${sw.vendor}</span>
              ${roleBadge}
              <span class="badge-chip border border-slate-700 bg-slate-800 text-slate-300">${sw.ports} Ports</span>
              ${sw.perpetualPoE ? '<span class="badge-chip border border-emerald-500/40 bg-emerald-500/10 text-emerald-300">Continuous PoE</span>' : ''}
              ${sw.substationCertified ? '<span class="badge-chip border border-amber-500/40 bg-amber-500/10 text-amber-300">IEC 61850-3</span>' : ''}
              ${sw.poePassThrough ? '<span class="badge-chip border border-cyan-500/40 bg-cyan-500/10 text-cyan-300">PoE Pass-Thru</span>' : ''}
              ${sw.shallowDepth ? '<span class="badge-chip border border-sky-500/40 bg-sky-500/10 text-sky-300">Shallow &lt;12"</span>' : ''}
              ${sw.stacking ? '<span class="badge-chip border border-indigo-500/40 bg-indigo-500/10 text-indigo-300">Stackable</span>' : ''}
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
              <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Add Feature Licenses (Select all needed):</span>
              <div class="space-y-1 bg-slate-900/60 p-2 rounded-lg border border-slate-850">
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
          <div class="grid grid-cols-4 gap-1.5 bg-slate-950 p-2 rounded-xl border border-slate-850 mb-2 text-center text-xs">
            <div><span class="text-[9px] text-slate-500 block uppercase">PoE (af)</span><span class="font-mono font-bold text-white">${sw.poeAfPorts}p</span></div>
            <div><span class="text-[9px] text-slate-500 block uppercase">PoE+ (at)</span><span class="font-mono font-bold text-sky-300">${sw.poeAtPorts}p</span></div>
            <div><span class="text-[9px] text-slate-500 block uppercase">PoE++ (60W)</span><span class="font-mono font-bold text-indigo-300">${sw.poeBt60Ports}p</span></div>
            <div><span class="text-[9px] text-slate-500 block uppercase">PoE+++ (90W)</span><span class="font-mono font-bold text-amber-400">${sw.poeBt90Ports}p</span></div>
          </div>
        ` : ''}

        <div class="grid grid-cols-3 gap-2 bg-slate-950/70 p-2 rounded-xl border border-slate-850 mb-3 text-xs">
          <div><span class="text-[10px] text-slate-500 block uppercase font-medium">${sw.role === 'Access' ? 'PoE Budget' : 'Fabric'}</span><span class="font-mono font-bold text-amber-400">${sw.role === 'Access' ? `${sw.poeBudget}W` : sw.switchingCapacity}</span></div>
          <div><span class="text-[10px] text-slate-500 block uppercase font-medium">VMS Buffer</span><span class="font-mono font-bold ${sw.packetBufferMb >= 4 ? 'text-cyan-300' : 'text-slate-400'}">${sw.packetBufferMb} MB</span></div>
          <div><span class="text-[10px] text-slate-500 block uppercase font-medium">Depth</span><span class="font-mono font-semibold ${sw.shallowDepth ? 'text-sky-300' : 'text-slate-400'}">${sw.depthInches}"</span></div>
        </div>

        <div class="space-y-1 mb-3">
          ${sw.keyFeatures.map(f => `
            <div class="text-[11px] text-slate-300 flex items-center gap-1.5">
              <i data-lucide="check" class="w-3 h-3 text-emerald-400 shrink-0"></i>
              <span>${f}</span>
            </div>
          `).join("")}
        </div>
      </div>

      <div class="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
        <button onclick="toggleCompareItem('${sw.id}')" class="px-2.5 py-1.5 rounded-lg border ${isCompared ? 'border-brand-500 bg-brand-500/20 text-brand-300' : 'border-slate-700 bg-slate-800 text-slate-300'} text-xs font-medium flex items-center gap-1">
          <i data-lucide="${isCompared ? 'check-square' : 'plus-square'}" class="w-3.5 h-3.5"></i>
          <span>${isCompared ? 'Compared' : 'Compare'}</span>
        </button>
        <button onclick="addToProjectBOM('${sw.id}')" class="flex-1 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md">
          <i data-lucide="plus" class="w-3.5 h-3.5"></i>
          <span>Add to Quote / BOM</span>
        </button>
      </div>
    </div>
  `;
}

function renderFirewallCards(list) {
  const container = document.getElementById("hardwareCardsContainer");
  const noResults = document.getElementById("noResultsState");
  const countBadge = document.getElementById("resultCount");
  if (countBadge) countBadge.innerText = list.length;

  if (!container) return;

  if (list.length === 0) {
    container.innerHTML = "";
    noResults?.classList.remove("hidden");
    return;
  }

  noResults?.classList.add("hidden");
  container.innerHTML = list.map(fw => `
    <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-md">
      <div>
        <div class="flex justify-between items-start mb-2">
          <span class="badge-chip border ${fw.vendor === 'UniFi' ? 'border-sky-500/40 bg-sky-500/10 text-sky-300' : fw.vendor === 'Meraki' ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : fw.vendor === 'Allied Telesis' ? 'border-teal-500/40 bg-teal-500/10 text-teal-300' : 'border-rose-500/40 bg-rose-500/10 text-rose-300'}">${fw.vendor}</span>
          <span class="font-mono font-bold text-emerald-400 text-sm">$${fw.msrp.toLocaleString()}</span>
        </div>
        <h3 class="font-bold text-base text-white">${fw.model}</h3>
        <span class="text-[11px] font-mono text-slate-400">SKU: ${fw.sku}</span>

        <div class="grid grid-cols-2 gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800 my-3 text-xs">
          <div><span class="text-[10px] text-slate-500 block uppercase">Client Sizing</span><span class="font-bold text-white">${fw.clients.toLocaleString()} Clients</span></div>
          <div><span class="text-[10px] text-slate-500 block uppercase">Throughput</span><span class="font-bold text-rose-300">${fw.fwThroughput}</span></div>
          <div><span class="text-[10px] text-slate-500 block uppercase">IPS / IDS</span><span class="font-semibold text-white">${fw.ipsThroughput}</span></div>
          <div><span class="text-[10px] text-slate-500 block uppercase">Dual PSU</span><span class="font-semibold ${fw.dualPsu ? 'text-emerald-400' : 'text-slate-500'}">${fw.dualPsu ? 'Yes' : 'No'}</span></div>
        </div>

        <div class="text-[11px] text-slate-300">
          <span class="text-slate-500">Interfaces:</span> ${fw.wanPorts}
        </div>
      </div>

      <button onclick="addFirewallToBOM('${fw.sku}')" class="mt-4 w-full py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-md flex items-center justify-center gap-1">
        <i data-lucide="plus" class="w-3.5 h-3.5"></i> Add Gateway to BOM
      </button>
    </div>
  `).join("");
  if (window.lucide) {
    try { lucide.createIcons(); } catch(e) {}
  }
}

function renderOpticsCards(list) {
  const container = document.getElementById("hardwareCardsContainer");
  const noResults = document.getElementById("noResultsState");
  const countBadge = document.getElementById("resultCount");
  if (countBadge) countBadge.innerText = list.length;

  if (!container) return;

  if (list.length === 0) {
    container.innerHTML = "";
    noResults?.classList.remove("hidden");
    return;
  }

  noResults?.classList.add("hidden");
  container.innerHTML = list.map(opt => `
    <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-md">
      <div>
        <div class="flex justify-between items-start mb-2">
          <span class="badge-chip border ${opt.vendor === 'UniFi' ? 'border-sky-500/40 bg-sky-500/10 text-sky-300' : opt.vendor === 'Meraki' ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : opt.vendor === 'AMG' ? 'border-rose-500/40 bg-rose-500/10 text-rose-300' : opt.vendor === 'Allied Telesis' ? 'border-teal-500/40 bg-teal-500/10 text-teal-300' : opt.vendor === 'Juniper' ? 'border-blue-500/40 bg-blue-500/10 text-blue-300' : 'border-amber-500/40 bg-amber-500/10 text-amber-300'}">${opt.vendor}</span>
          <span class="font-mono font-bold text-emerald-400 text-sm">$${opt.msrp.toLocaleString()}</span>
        </div>
        <h3 class="font-bold text-base text-white">${opt.name}</h3>
        <span class="text-[11px] font-mono text-slate-400">SKU: ${opt.sku}</span>

        <div class="grid grid-cols-2 gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800 my-3 text-xs">
          <div><span class="text-[10px] text-slate-500 block uppercase">Link Speed</span><span class="font-bold text-white">${opt.speed}</span></div>
          <div><span class="text-[10px] text-slate-500 block uppercase">Form Factor</span><span class="font-bold text-sky-300">${opt.formFactor}</span></div>
          <div><span class="text-[10px] text-slate-500 block uppercase">Cable Medium</span><span class="font-semibold text-white">${opt.medium === 'DAC' ? 'Passive Copper (1m)' : opt.medium === 'MMF' ? 'Multi-Mode Fiber' : opt.medium === 'Hardware' ? 'Stacking Bus' : 'Single-Mode Fiber'}</span></div>
          <div><span class="text-[10px] text-slate-500 block uppercase">Temperature</span><span class="font-semibold ${opt.industrial ? 'text-amber-400 font-bold' : 'text-slate-400'}">${opt.industrial ? '-40C to +85C' : 'Commercial (0-70C)'}</span></div>
        </div>
      </div>

      <button onclick="addOpticsToBOM('${opt.sku}', '${opt.name}', ${opt.msrp}, 1, '${opt.vendor}')" class="mt-4 w-full py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold shadow-md flex items-center justify-center gap-1">
        <i data-lucide="plus" class="w-3.5 h-3.5"></i> Add Optic to Quote BOM
      </button>
    </div>
  `).join("");
  if (window.lucide) {
    try { lucide.createIcons(); } catch(e) {}
  }
}

function renderWirelessCards(list) {
  const container = document.getElementById("hardwareCardsContainer");
  const noResults = document.getElementById("noResultsState");
  const countBadge = document.getElementById("resultCount");
  if (countBadge) countBadge.innerText = list.length;
  if (!container) return;

  if (list.length === 0) {
    container.innerHTML = "";
    noResults?.classList.remove("hidden");
    return;
  }

  noResults?.classList.add("hidden");
  container.innerHTML = list.map(r => {
    let vendorColor = "bg-slate-800 text-slate-300 border-slate-700";
    if (r.vendor === "Ubiquiti") vendorColor = "bg-sky-500/10 text-sky-400 border-sky-500/30";
    if (r.vendor === "Siklu") vendorColor = "bg-purple-500/10 text-purple-400 border-purple-500/30";
    if (r.vendor === "Cambium") vendorColor = "bg-orange-500/10 text-orange-400 border-orange-500/30";
    if (r.vendor === "AMG") vendorColor = "bg-rose-500/10 text-rose-400 border-rose-500/30";

    const hasPrecisionMount = r.precisionMountSku && WIRELESS_ACCESSORY_CATALOG[r.precisionMountSku];
    const hasAntennaOptions = r.needsExternalAntenna && r.supportedAntennaSkus;
    const hasLicense = r.licenseSku && WIRELESS_LICENSE_CATALOG[r.licenseSku];

    return `
      <div class="bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all rounded-2xl p-4 flex flex-col justify-between shadow-md">
        <div>
          <div class="flex items-start justify-between gap-2 mb-2">
            <div>
              <div class="flex flex-wrap items-center gap-1.5 mb-1.5">
                <span class="badge-chip border ${vendorColor}">${r.vendor}</span>
                <span class="badge-chip border border-indigo-500/40 bg-indigo-500/10 text-indigo-300">${r.topology === 'PtP' ? 'Point-to-Point' : 'BaseStation AP'}</span>
                <span class="badge-chip border border-emerald-500/40 bg-emerald-500/10 text-emerald-300">${r.band}</span>
                ${r.integrated5gBackup ? '<span class="badge-chip border border-amber-500/40 bg-amber-500/10 text-amber-300">5G Failover</span>' : ''}
              </div>
              <h3 class="font-bold text-base text-white">${r.model}</h3>
              <span class="text-[11px] font-mono text-slate-400">SKU: ${r.sku}</span>
            </div>
            <div class="text-right">
              <span class="text-xs text-slate-400 block">Unit MSRP</span>
              <span class="font-mono text-base font-bold text-emerald-400">$${r.msrp.toLocaleString()}</span>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800 my-2.5 text-xs">
            <div><span class="text-[10px] text-slate-500 block uppercase">Max Capacity</span><span class="font-bold text-white">${r.maxThroughput}</span></div>
            <div><span class="text-[10px] text-slate-500 block uppercase">Max RF Range</span><span class="font-bold text-emerald-400">${r.maxRangeKm} km</span></div>
            <div><span class="text-[10px] text-slate-500 block uppercase">Antenna</span><span class="font-semibold text-slate-300 truncate block">${r.integratedAntenna}</span></div>
            <div><span class="text-[10px] text-slate-500 block uppercase">Power Draw</span><span class="font-mono text-amber-300">${r.powerWatts}W (${r.poeRequired})</span></div>
          </div>

          <div class="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 mb-3 space-y-2 text-xs">
            ${hasAntennaOptions ? `
              <div class="flex items-center justify-between">
                <span class="text-slate-400 font-medium">Antenna Assembly:</span>
                <select id="wl-ant-${r.id}" class="bg-slate-900 border border-slate-700 text-white text-[11px] rounded px-2 py-0.5">
                  ${r.supportedAntennaSkus.map(aSku => {
                    const a = WIRELESS_ACCESSORY_CATALOG[aSku];
                    return `<option value="${aSku}">${a.name} (+$${a.msrp})</option>`;
                  }).join('')}
                </select>
              </div>
            ` : ''}

            ${hasPrecisionMount ? `
              <label class="flex items-center justify-between text-slate-300 cursor-pointer hover:text-white">
                <div class="flex items-center gap-1.5">
                  <input type="checkbox" id="wl-prec-${r.id}" class="rounded border-slate-700 bg-slate-950 text-indigo-500 cursor-pointer" />                   <span>Add Precision Alignment Bracket</span>                 </div>                 <span class="font-mono text-emerald-400">+$${WIRELESS_ACCESSORY_CATALOG[r.precisionMountSku].msrp}</span>
              </label>
            ` : ''}

            ${r.surgeSku && WIRELESS_ACCESSORY_CATALOG[r.surgeSku] ? `
              <label class="flex items-center justify-between text-slate-300 cursor-pointer hover:text-white">
                <div class="flex items-center gap-1.5">
                  <input type="checkbox" id="wl-surge-${r.id}" checked class="rounded border-slate-700 bg-slate-950 text-indigo-500 cursor-pointer" />                   <span>Outdoor Surge Protector (ETH-SP)</span>                 </div>                 <span class="font-mono text-emerald-400">+$${WIRELESS_ACCESSORY_CATALOG[r.surgeSku].msrp}</span>
              </label>
            ` : ''}

            ${hasLicense ? `
              <label class="flex items-center justify-between text-slate-300 cursor-pointer hover:text-white pt-1 border-t border-slate-800">
                <div class="flex items-center gap-1.5">
                  <input type="checkbox" id="wl-lic-${r.id}" class="rounded border-slate-700 bg-slate-950 text-purple-500 cursor-pointer" />
                  <span>${WIRELESS_LICENSE_CATALOG[r.licenseSku].name}</span>                 </div>                 <span class="font-mono text-emerald-400">+$${WIRELESS_LICENSE_CATALOG[r.licenseSku].msrp}</span>
              </label>
            ` : ''}
          </div>
        </div>

        <div class="pt-2 border-t border-slate-800 flex items-center gap-2">
          ${r.topology === 'PtP' ? `
            <button onclick="addWirelessToBOM('${r.id}', true)" class="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow flex items-center justify-center gap-1.5">
              <i data-lucide="link" class="w-3.5 h-3.5"></i> Add Matched 2-Radio Link Pair
            </button>
            <button onclick="addWirelessToBOM('${r.id}', false)" title="Add single standalone radio" class="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl">
              1x Only
            </button>
          ` : `
            <button onclick="addWirelessToBOM('${r.id}', false)" class="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow flex items-center justify-center gap-1.5">
              <i data-lucide="plus" class="w-3.5 h-3.5"></i> Add BaseStation AP to BOM
            </button>
          `}
        </div>
      </div>
    `;
  }).join("");

  if (window.lucide) {
    try { lucide.createIcons(); } catch(e) {}
  }
}

function resetCurrentFilters() {
  filterState.search = "";
  filterState.vendors = ["Meraki", "Juniper", "Ruckus", "UniFi", "AMG", "Allied Telesis", "Ubiquiti", "Siklu", "Cambium"];
  filterState.mgmts = ["standalone", "free_central", "paid_onprem", "paid_cloud"];
  filterState.industrialOnly = false;
  filterState.stackingOnly = false;
  filterState.dualPsuOnly = false;
  filterState.perpetualPoE = false;
  filterState.shallowDepth = false;
  filterState.substation = false;
  filterState.poePassThrough = false;
  filterState.deepBuffer = false;
  filterState.uplinks100G = false;
  filterState.evpn = false;
  filterState.minClients = 0;
  filterState.opticsFormFactor = "all";
  filterState.opticsMedium = "all";
  filterState.wirelessTopology = "all";
  filterState.wirelessBand = "all";
  filterState.wirelessTargetKm = 1.5;
  filterState.wirelessRequire5gBackup = false;

  accessPortSelection = "any";
  backboneRoleSelection = "all";
  lockPoEBudget = false;

  switchMode(activeMode);
  showToast("Filters reset to default.");
}

function toggleCompareItem(id) {
  const idx = comparisonList.indexOf(id);
  if (idx > -1) {
    comparisonList.splice(idx, 1);
    showToast("Removed from comparison.");
  } else {
    if (comparisonList.length >= 4) { showToast("Maximum 4 models can be compared."); return; }
    comparisonList.push(id);
    showToast("Added to comparison matrix.");
  }
  const b = document.getElementById("compareCountBadge");
  if (comparisonList.length > 0) {
    b.innerText = comparisonList.length;
    b.classList.remove("hidden");
  } else {
    b.classList.add("hidden");
  }
  runActiveFilter();
}

function toggleCompareModal() {
  const modal = document.getElementById("compareModal");
  if (modal.classList.contains("hidden")) {
    renderComparisonContent();
    modal.classList.remove("hidden");
  } else {
    modal.classList.add("hidden");
  }
}

function clearComparison() {
  comparisonList = [];
  document.getElementById("compareCountBadge").classList.add("hidden");
  runActiveFilter();
  toggleCompareModal();
}

function renderComparisonContent() {
  const container = document.getElementById("compareContent");
  if (comparisonList.length === 0) {
    container.innerHTML = `<div class="py-12 text-center text-slate-400"><p>No switches selected for comparison.</p></div>`;
    return;
  }
  const compared = comparisonList.map(id => SWITCH_DATABASE.find(s => s.id === id)).filter(Boolean);
  container.innerHTML = `
    <table class="w-full text-xs text-left border-collapse">
      <thead>
        <tr class="border-b border-slate-700 bg-slate-950/80">
          <th class="p-3 font-semibold text-slate-400 w-44">Security Specification</th>
          ${compared.map(s => `<th class="p-3 font-bold text-white"><span class="text-brand-400">${s.vendor}</span><div class="text-sm font-bold text-white">${s.model}</div></th>`).join("")}
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-800">
        <tr><td class="p-3 font-semibold text-slate-400">Total Ports</td>${compared.map(s => `<td class="p-3 font-bold">${s.ports} Ports</td>`).join("")}</tr>
        <tr><td class="p-3 font-semibold text-slate-400">Port Media & Form Factor</td>${compared.map(s => `<td class="p-3 font-mono text-indigo-300">${s.portFormFactorSummary}</td>`).join("")}</tr>
        <tr><td class="p-3 font-semibold text-slate-400">Continuous PoE (Zero Drop)</td>${compared.map(s => `<td class="p-3 font-semibold ${s.perpetualPoE ? 'text-emerald-400' : 'text-slate-500'}">${s.perpetualPoE ? 'Yes (Supported)' : 'No'}</td>`).join("")}</tr>
        <tr><td class="p-3 font-semibold text-slate-400">Substation Certified</td>${compared.map(s => `<td class="p-3 font-semibold ${s.substationCertified ? 'text-amber-400' : 'text-slate-500'}">${s.substationCertified ? 'IEC 61850-3' : 'Standard'}</td>`).join("")}</tr>
        <tr><td class="p-3 font-semibold text-slate-400">PoE Pass-Through Powered</td>${compared.map(s => `<td class="p-3 font-semibold ${s.poePassThrough ? 'text-cyan-400' : 'text-slate-500'}">${s.poePassThrough ? 'Yes (802.3bt In)' : 'No'}</td>`).join("")}</tr>
        <tr><td class="p-3 font-semibold text-slate-400">Chassis Depth (NEMA Fit)</td>${compared.map(s => `<td class="p-3 font-semibold ${s.shallowDepth ? 'text-sky-300' : 'text-slate-400'}">${s.depthInches}" (${s.shallowDepth ? 'Shallow NEMA' : 'Standard Rack'})</td>`).join("")}</tr>
        <tr><td class="p-3 font-semibold text-slate-400">VMS Packet Buffer</td>${compared.map(s => `<td class="p-3 font-mono font-bold ${s.packetBufferMb >= 4 ? 'text-cyan-300' : 'text-slate-400'}">${s.packetBufferMb} MB</td>`).join("")}</tr>
        <tr><td class="p-3 font-semibold text-slate-400">PoE Standards Breakdown</td>${compared.map(s => `<td class="p-3 font-mono">${s.poeAfPorts}x af \vert{}${s.poeAtPorts}x at | ${s.poeBt60Ports}x bt60 \vert{}${s.poeBt90Ports}x bt90</td>`).join("")}</tr>
        <tr><td class="p-3 font-semibold text-slate-400">Total PoE Budget</td>${compared.map(s => `<td class="p-3 font-bold text-amber-400">${s.poeBudget > 0 ? `${s.poeBudget}W` : 'Non-PoE'}</td>`).join("")}</tr>
        <tr><td class="p-3 font-semibold text-slate-400">Est. MSRP</td>${compared.map(s => `<td class="p-3 font-mono font-bold text-emerald-400">$${s.msrp.toLocaleString()}</td>`).join("")}</tr>
      </tbody>
    </table>
  `;
  if (window.lucide) {
    try { lucide.createIcons(); } catch(e) {}
  }
}

function showToast(msg) {
  const t = document.getElementById("toastNotification");
  if (!t) return;
  document.getElementById("toastMessage").innerText = msg;
  t.classList.replace("translate-y-20", "translate-y-0");
  t.classList.replace("opacity-0", "opacity-100");
  setTimeout(() => {
    t.classList.replace("translate-y-0", "translate-y-20");
    t.classList.replace("opacity-100", "opacity-0");
  }, 3000);
}

// ==========================================
// LOCALSTORAGE PERSISTENCE & PROJECT MANAGER
// ==========================================
const STORAGE_KEY_CURRENT = "netselect_active_state_v1";
const STORAGE_KEY_PROJECTS = "netselect_saved_projects_v1";

let activeProjectName = "Default Project";
let autoSaveDebounceTimeout = null;

function queueAutoSave() {
  if (autoSaveDebounceTimeout) clearTimeout(autoSaveDebounceTimeout);
  autoSaveDebounceTimeout = setTimeout(() => {
    saveStateToLocalStorage();
  }, 300);
}

function saveStateToLocalStorage() {
  try {
    const statePayload = {
      activeProjectName,
      activeMode,
      accessPortSelection,
      backboneRoleSelection,
      lockPoEBudget,
      currentRackHeight: typeof currentRackHeight !== "undefined" ? currentRackHeight : 24,
      globalSelectedTerm: typeof globalSelectedTerm !== "undefined" ? globalSelectedTerm : "1YR",
      bomViewMode: typeof bomViewMode !== "undefined" ? bomViewMode : "grouped",
      filterState,
      projectBOM: typeof projectBOM !== "undefined" ? projectBOM : [],
      calcValues: {
        calcPoE: document.getElementById("calcPoE")?.value || 0,
        calcPoEPlus: document.getElementById("calcPoEPlus")?.value || 0,
        calcPoEPlusPlus: document.getElementById("calcPoEPlusPlus")?.value || 0,
        calcPoEPlusPlusPlus: document.getElementById("calcPoEPlusPlusPlus")?.value || 0
      },
      savedAt: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(statePayload));
  } catch (err) {
    console.error("Failed to auto-save state:", err);
  }
}

function restoreStateFromLocalStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CURRENT);
    if (!raw) return false;

    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.projectBOM) return false;

    if (typeof projectBOM !== "undefined") projectBOM = parsed.projectBOM || [];
    activeProjectName = parsed.activeProjectName || "Default Project";
    activeMode = parsed.activeMode || "access";
    accessPortSelection = parsed.accessPortSelection || "any";
    backboneRoleSelection = parsed.backboneRoleSelection || "all";
    lockPoEBudget = parsed.lockPoEBudget || false;
    if (typeof currentRackHeight !== "undefined") currentRackHeight = parsed.currentRackHeight || 24;
    if (typeof globalSelectedTerm !== "undefined") globalSelectedTerm = parsed.globalSelectedTerm || "1YR";
    if (typeof bomViewMode !== "undefined") bomViewMode = parsed.bomViewMode || "grouped";

    if (parsed.filterState) {
      Object.assign(filterState, parsed.filterState);
      // Ensure wireless vendors are present even if restored from an older saved session:
      ['Ubiquiti', 'Siklu', 'Cambium', 'AMG'].forEach(v => {
        if (!filterState.vendors.includes(v)) filterState.vendors.push(v);
      });
    }

    const label = document.getElementById("activeProjectLabel");
    if (label) label.innerText = activeProjectName;

    if (parsed.calcValues) {
      setTimeout(() => {
        if (document.getElementById("calcPoE")) document.getElementById("calcPoE").value = parsed.calcValues.calcPoE;
        if (document.getElementById("calcPoEPlus")) document.getElementById("calcPoEPlus").value = parsed.calcValues.calcPoEPlus;
        if (document.getElementById("calcPoEPlusPlus")) document.getElementById("calcPoEPlusPlus").value = parsed.calcValues.calcPoEPlusPlus;
        if (document.getElementById("calcPoEPlusPlusPlus")) document.getElementById("calcPoEPlusPlusPlus").value = parsed.calcValues.calcPoEPlusPlusPlus;
        calculatePoETarget();
      }, 50);
    }

    return true;
  } catch (err) {
    console.error("Failed to load local state:", err);
    return false;
  }
}

function toggleProjectModal() {
  const modal = document.getElementById("projectModal");
  if (!modal) return;
  if (modal.classList.contains("hidden")) {
    modal.classList.remove("hidden");
    renderSavedProjectsList();
  } else {
    modal.classList.add("hidden");
  }
}

function getSavedProjectsIndex() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_PROJECTS)) || {};
  } catch (e) {
    return {};
  }
}

function saveCurrentAsNewProject() {
  const input = document.getElementById("newProjectNameInput");
  const name = (input ? input.value : "").trim();
  if (!name) {
    showToast("Please enter a project name.");
    return;
  }

  const projects = getSavedProjectsIndex();
  projects[name] = {
    name,
    projectBOM: typeof projectBOM !== "undefined" ? projectBOM : [],
    globalSelectedTerm: typeof globalSelectedTerm !== "undefined" ? globalSelectedTerm : "1YR",
    currentRackHeight: typeof currentRackHeight !== "undefined" ? currentRackHeight : 24,
    savedAt: new Date().toISOString()
  };

  localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(projects));
  activeProjectName = name;
  const lbl = document.getElementById("activeProjectLabel");
  if (lbl) lbl.innerText = name;
  if (input) input.value = "";

  saveStateToLocalStorage();
  renderSavedProjectsList();
  showToast(`Saved project: ${name}`);
}

function loadSavedProject(name) {
  const projects = getSavedProjectsIndex();
  const proj = projects[name];
  if (!proj) return;

  if (typeof projectBOM !== "undefined") projectBOM = proj.projectBOM || [];
  activeProjectName = proj.name || name;
  if (typeof globalSelectedTerm !== "undefined") globalSelectedTerm = proj.globalSelectedTerm || "1YR";
  if (typeof currentRackHeight !== "undefined") currentRackHeight = proj.currentRackHeight || 24;

  const lbl = document.getElementById("activeProjectLabel");
  if (lbl) lbl.innerText = activeProjectName;
  saveStateToLocalStorage();
  if (typeof updateBOMView === "function") updateBOMView();
  renderSavedProjectsList();
  toggleProjectModal();
  showToast(`Loaded project: ${name}`);
}

function deleteSavedProject(name) {
  if (!confirm(`Delete project "${name}"?`)) return;
  const projects = getSavedProjectsIndex();
  delete projects[name];
  localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(projects));
  renderSavedProjectsList();
  showToast(`Deleted project: ${name}`);
}

function renderSavedProjectsList() {
  const container = document.getElementById("savedProjectsList");
  if (!container) return;

  const projects = getSavedProjectsIndex();
  const names = Object.keys(projects);

  if (names.length === 0) {
    container.innerHTML = `
      <div class="p-4 bg-slate-950/60 border border-slate-800 rounded-xl text-center text-slate-500 text-xs">
        No custom snapshots saved yet. Current work auto-saves continuously.
      </div>
    `;
    return;
  }

  container.innerHTML = names.map(n => {
    const p = projects[n];
    const isCurrent = n === activeProjectName;
    const unitCount = (p.projectBOM || []).reduce((acc, i) => acc + (i.qty || 1), 0);
    const dateStr = p.savedAt ? new Date(p.savedAt).toLocaleDateString() : 'N/A';

    return `
      <div class="p-3 bg-slate-950 border ${isCurrent ? 'border-emerald-500/60 bg-emerald-950/20' : 'border-slate-800'} rounded-xl flex items-center justify-between gap-3 shadow-sm">
        <div>
          <div class="flex items-center gap-2">
            <span class="font-bold text-white text-xs">${p.name}</span>
            ${isCurrent ? '<span class="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1.5 rounded font-bold">ACTIVE</span>' : ''}
          </div>
          <span class="text-[10px] text-slate-400 font-mono">${unitCount} total units &bull; Saved ${dateStr}</span>
        </div>
        <div class="flex items-center gap-1.5">
          ${!isCurrent ? `
            <button onclick="loadSavedProject('${p.name}')" class="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-semibold text-xs">
              Load
            </button>
          ` : ''}
          <button onclick="deleteSavedProject('${p.name}')" class="p-1 hover:text-rose-400 text-slate-500">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      </div>
    `;
  }).join("");

  if (window.lucide) {
    try { lucide.createIcons(); } catch(e) {}
  }
}

function exportCurrentProjectJSON() {
  const payload = {
    projectName: activeProjectName,
    exportedAt: new Date().toISOString(),
    projectBOM: typeof projectBOM !== "undefined" ? projectBOM : [],
    globalSelectedTerm: typeof globalSelectedTerm !== "undefined" ? globalSelectedTerm : "1YR",
    currentRackHeight: typeof currentRackHeight !== "undefined" ? currentRackHeight : 24
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${activeProjectName.replace(/[^a-z0-9_-]/gi, '_')}_BOM.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("Project exported as JSON.");
}

function importProjectJSON(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.projectBOM) {
        showToast("Invalid project JSON file.");
        return;
      }

      if (typeof projectBOM !== "undefined") projectBOM = data.projectBOM;
      activeProjectName = data.projectName || file.name.replace(".json", "");
      if (typeof globalSelectedTerm !== "undefined") globalSelectedTerm = data.globalSelectedTerm || "1YR";
      if (typeof currentRackHeight !== "undefined") currentRackHeight = data.currentRackHeight || 24;

      const lbl = document.getElementById("activeProjectLabel");
      if (lbl) lbl.innerText = activeProjectName;
      saveStateToLocalStorage();
      if (typeof updateBOMView === "function") updateBOMView();
      renderSavedProjectsList();
      toggleProjectModal();
      showToast(`Imported ${activeProjectName} successfully.`);
    } catch (err) {
      showToast("Error parsing project JSON.");
    }
  };
  reader.readAsText(file);
}

window.addEventListener("DOMContentLoaded", () => {
  const restored = restoreStateFromLocalStorage();
  switchMode(activeMode);
  if (typeof updateBOMView === "function") updateBOMView();
  if (restored) {
    showToast(`Restored active session: ${activeProjectName}`);
  }
});