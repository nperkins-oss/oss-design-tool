// ==========================================
// SIDEBAR FILTER RENDERER (NetSelect Enterprise)
// Builds dynamic faceted filter controls for the active hardware mode
// Attached to dynamicSidebarContent
// ==========================================

function getCurrentDataset() {
  if (typeof currentMode === "undefined") return [];
  if (typeof CatalogRegistry !== "undefined" && typeof CatalogRegistry.getDatasetForMode === "function") {
    return CatalogRegistry.getDatasetForMode(currentMode);
  }
  if (currentMode === "access") {
    return (typeof SWITCH_DATABASE !== "undefined") ? SWITCH_DATABASE.filter(s => s.role === "Access") : [];
  } else if (currentMode === "backbone") {
    return (typeof SWITCH_DATABASE !== "undefined") ? SWITCH_DATABASE.filter(s => s.role === "Core" || s.role === "Aggregation") : [];
  } else if (currentMode === "firewalls") {
    return (typeof FIREWALL_DATABASE !== "undefined") ? FIREWALL_DATABASE : [];
  } else if (currentMode === "optics") {
    return (typeof OPTICS_LIST !== "undefined") ? OPTICS_LIST : [];
  } else if (currentMode === "wireless") {
    return (typeof WIRELESS_DATABASE !== "undefined") ? WIRELESS_DATABASE : [];
  } else if (currentMode === "accessories") {
    return (typeof ACCESSORY_DATABASE !== "undefined") ? ACCESSORY_DATABASE : [];
  }
  return [];
}

function getActiveBaseFilteredCatalog() {
  return getCurrentDataset();
}

function buildSidebarFilters() {
  const container = document.getElementById("dynamicSidebarContent") || document.getElementById("sidebarFilters");
  if (!container) return;

  const baseSet = getActiveBaseFilteredCatalog();

  if (currentMode === "access" || currentMode === "backbone") {
    buildSwitchSidebar(container, baseSet);
  } else if (currentMode === "firewalls") {
    buildFirewallSidebar(container, baseSet);
  } else if (currentMode === "optics") {
    buildOpticsSidebar(container, baseSet);
  } else if (currentMode === "wireless") {
    buildWirelessSidebar(container, baseSet);
  } else if (currentMode === "accessories") {
    buildAccessoriesSidebar(container, baseSet);
  } else {
    buildDomainPlaceholderSidebar(container, currentMode);
  }

  safeCreateIcons(container);
}

function buildSwitchSidebar(container, baseSet) {
  const vendors = ["UniFi", "Ruckus", "Meraki", "Juniper", "AMG", "Allied Telesis"];
  const portCategories = [
    { label: "48-Port Density", val: 48 },
    { label: "24-Port Density", val: 24 },
    { label: "16-Port Density", val: 16 },
    { label: "Compact / DIN (8-12)", val: 8 }
  ];
  const poeClasses = [
    { id: "af", label: "PoE (802.3af - 15.4W)" },
    { id: "at", label: "PoE+ (802.3at - 30W)" },
    { id: "bt60", label: "PoE++ (802.3bt Type 3 - 60W)" },
    { id: "bt90", label: "PoE++ (802.3bt Type 4 - 90W)" }
  ];

  const totalCams = (typeof calculatePoETarget === "function") ? calculatePoETarget().totalCameras : 0;

  container.innerHTML = `
    <div class="space-y-4 text-xs">
      ${currentMode === "access" && totalCams > 0 ? `
        <div class="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/40 space-y-1.5">
          <label class="flex items-center gap-2 text-xs font-bold text-amber-300 cursor-pointer">
            <input type="checkbox" ${(typeof requireDemandFit !== "undefined" && requireDemandFit) ? 'checked' : ''} onchange="requireDemandFit = this.checked; runActiveFilter();" class="rounded border-amber-600 bg-slate-950 text-amber-500" />
            <span>Only Show Capable Switches</span>
          </label>
          <p class="text-[10px] text-slate-400 leading-tight">Filters out switches that cannot fulfill ${totalCams} ports or required PoE wattage.</p>
        </div>
      ` : ''}

      <!-- Vendors -->
      <div>
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Manufacturer</span>
        <div class="space-y-1">
          ${vendors.map(v => {
            const isChecked = (typeof selectedVendors !== "undefined" && selectedVendors.includes(v));
            const count = baseSet.filter(s => s.vendor === v).length;
            return `
              <label class="flex items-center justify-between text-slate-300 hover:text-white cursor-pointer py-0.5 select-none">
                <div class="flex items-center gap-2">
                  <input type="checkbox" onchange="toggleFilterItem('vendor', '${v}')" ${isChecked ? 'checked' : ''} class="rounded border-slate-700 bg-slate-900 text-brand-500 focus:ring-0">
                  <span>${v}</span>
                </div>
                <span class="text-[10px] font-mono text-slate-500">${count}</span>
              </label>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Port Densities -->
      <div class="pt-3 border-t border-slate-800">
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Port Density</span>
        <div class="grid grid-cols-2 gap-1 text-xs">
          ${portCategories.map(p => {
            const isChecked = (typeof selectedPortCounts !== "undefined" && selectedPortCounts.includes(p.val));
            const count = baseSet.filter(s => (typeof checkSwitchPortCategory === "function") ? checkSwitchPortCategory(s, [p.val]) : s.ports === p.val).length;
            return `
              <label class="flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-slate-700 cursor-pointer select-none">
                <input type="checkbox" onchange="toggleFilterItem('ports', ${p.val})" ${isChecked ? 'checked' : ''} class="rounded border-slate-700 bg-slate-900 text-brand-500 focus:ring-0">
                <span class="font-mono text-slate-300 text-[11px]">${p.label.replace(' Density', '')}</span>
              </label>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Uplink Speeds -->
      <div class="pt-3 border-t border-slate-800">
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Uplink Speed</span>
        <div class="grid grid-cols-3 gap-1 font-mono font-semibold">
          ${['all', '10G', '25G', '40G', '100G', '1G'].map(spd => `
            <button onclick="setUplinkSpeedFilter('${spd}')" class="py-1 px-1.5 rounded-lg border text-center text-[11px] transition-all ${(typeof selectedUplinkSpeed !== "undefined" && selectedUplinkSpeed === spd) ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm' : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'}">
              ${spd === 'all' ? 'All' : spd}
            </button>
          `).join('')}
        </div>
      </div>

      <!-- PoE Capabilities -->
      <div class="pt-3 border-t border-slate-800">
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">PoE Standards</span>
        <div class="space-y-1">
          ${poeClasses.map(c => {
            const isChecked = (typeof selectedPoEClasses !== "undefined" && selectedPoEClasses.includes(c.id));
            return `
              <label class="flex items-center justify-between text-slate-300 hover:text-white cursor-pointer py-0.5 select-none">
                <div class="flex items-center gap-2">
                  <input type="checkbox" onchange="toggleFilterItem('poeClass', '${c.id}')" ${isChecked ? 'checked' : ''} class="rounded border-slate-700 bg-slate-900 text-brand-500 focus:ring-0">
                  <span>${c.label}</span>
                </div>
              </label>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Hardware Constraints -->
      <div class="pt-3 border-t border-slate-800">
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Hardware Constraints</span>
        <div class="space-y-1 text-slate-300">
          <label class="flex items-center justify-between hover:text-white cursor-pointer py-0.5 select-none">
            <div class="flex items-center gap-2">
              <input type="checkbox" onchange="requireDemandFit = this.checked; runActiveFilter();" ${(typeof requireDemandFit !== "undefined" && requireDemandFit) ? 'checked' : ''} class="rounded border-slate-700 bg-slate-900 text-brand-500 focus:ring-0">
              <span class="text-amber-300 font-medium">Meet PoE & Port Demand</span>
            </div>
          </label>
          <label class="flex items-center justify-between hover:text-white cursor-pointer py-0.5 select-none">
            <div class="flex items-center gap-2">
              <input type="checkbox" onchange="requireMultiGig = this.checked; runActiveFilter();" ${(typeof requireMultiGig !== "undefined" && requireMultiGig) ? 'checked' : ''} class="rounded border-slate-700 bg-slate-900 text-brand-500 focus:ring-0">
              <span>Multi-Gigabit (2.5G/5G/10G)</span>
            </div>
          </label>
          <label class="flex items-center justify-between hover:text-white cursor-pointer py-0.5 select-none">
            <div class="flex items-center gap-2">
              <input type="checkbox" onchange="requireShallowDepth = this.checked; runActiveFilter();" ${(typeof requireShallowDepth !== "undefined" && requireShallowDepth) ? 'checked' : ''} class="rounded border-slate-700 bg-slate-900 text-brand-500 focus:ring-0">
              <span>Shallow Depth (&le;12")</span>
            </div>
          </label>
          <label class="flex items-center justify-between hover:text-white cursor-pointer py-0.5 select-none">
            <div class="flex items-center gap-2">
              <input type="checkbox" onchange="requireStacking = this.checked; runActiveFilter();" ${(typeof requireStacking !== "undefined" && requireStacking) ? 'checked' : ''} class="rounded border-slate-700 bg-slate-900 text-brand-500 focus:ring-0">
              <span>Hardware Stacking</span>
            </div>
          </label>
          <label class="flex items-center justify-between hover:text-white cursor-pointer py-0.5 select-none">
            <div class="flex items-center gap-2">
              <input type="checkbox" onchange="requireDualPsu = this.checked; runActiveFilter();" ${(typeof requireDualPsu !== "undefined" && requireDualPsu) ? 'checked' : ''} class="rounded border-slate-700 bg-slate-900 text-brand-500 focus:ring-0">
              <span>Dual / Redundant PSUs</span>
            </div>
          </label>
          <label class="flex items-center justify-between hover:text-white cursor-pointer py-0.5 select-none">
            <div class="flex items-center gap-2">
              <input type="checkbox" onchange="requireDinMount = this.checked; runActiveFilter();" ${(typeof requireDinMount !== "undefined" && requireDinMount) ? 'checked' : ''} class="rounded border-slate-700 bg-slate-900 text-brand-500 focus:ring-0">
              <span>DIN-Rail Mounting</span>
            </div>
          </label>
          <label class="flex items-center justify-between hover:text-white cursor-pointer py-0.5 select-none">
            <div class="flex items-center gap-2">
              <input type="checkbox" onchange="requirePerpetualPoE = this.checked; runActiveFilter();" ${(typeof requirePerpetualPoE !== "undefined" && requirePerpetualPoE) ? 'checked' : ''} class="rounded border-slate-700 bg-slate-900 text-brand-500 focus:ring-0">
              <span>Continuous / Perpetual PoE</span>
            </div>
          </label>
          <label class="flex items-center justify-between hover:text-white cursor-pointer py-0.5 select-none">
            <div class="flex items-center gap-2">
              <input type="checkbox" onchange="requireTAA = this.checked; runActiveFilter();" ${(typeof requireTAA !== "undefined" && requireTAA) ? 'checked' : ''} class="rounded border-slate-700 bg-slate-900 text-brand-500 focus:ring-0">
              <span>TAA / NDAA Compliant</span>
            </div>
          </label>
          <label class="flex items-center justify-between hover:text-white cursor-pointer py-0.5 select-none">
            <div class="flex items-center gap-2">
              <input type="checkbox" onchange="requireSubstation = this.checked; runActiveFilter();" ${(typeof requireSubstation !== "undefined" && requireSubstation) ? 'checked' : ''} class="rounded border-slate-700 bg-slate-900 text-brand-500 focus:ring-0">
              <span>Substation Certified (IEC 61850)</span>
            </div>
          </label>
        </div>
      </div>
    </div>
  `;
}

function buildFirewallSidebar(container, baseSet) {
  const fwVendors = [...new Set(baseSet.map(f => (f.vendor || '').trim()).filter(Boolean))];
  const fwCategories = [...new Set(baseSet.map(f => (f.category || '').toLowerCase().trim()).filter(Boolean))];

  const categoryLabels = {
    firewall: "Next-Gen Firewall / UTM",
    gateway: "Security Gateway",
    sdwan_edge: "SD-WAN / Branch Edge",
    cellular: "LTE / 5G Failover",
    specialty: "Specialty / GPS Clock"
  };

  container.innerHTML = `
    <div class="space-y-4 text-xs">
      <div>
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Manufacturer</span>
        <div class="space-y-1">
          ${fwVendors.map(v => {
            const isChecked = (typeof selectedFwVendors !== "undefined" && selectedFwVendors.includes(v));
            const count = baseSet.filter(f => (f.vendor || '').trim() === v).length;
            return `
              <label class="flex items-center justify-between text-slate-300 hover:text-white cursor-pointer py-0.5 select-none">
                <div class="flex items-center gap-2">
                  <input type="checkbox" onchange="toggleFilterItem('fwVendor', '${v}')" ${isChecked ? 'checked' : ''} class="rounded border-slate-700 bg-slate-900 text-rose-500 focus:ring-0">
                  <span>${v}</span>
                </div>
                <span class="text-[10px] font-mono text-slate-500">${count}</span>
              </label>
            `;
          }).join('')}
        </div>
      </div>

      <div class="pt-3 border-t border-slate-800">
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Appliance Category</span>
        <div class="space-y-1">
          ${fwCategories.map(c => {
            const isChecked = (typeof selectedFwCategories !== "undefined" && selectedFwCategories.includes(c));
            const count = baseSet.filter(f => (f.category || '').toLowerCase().trim() === c).length;
            return `
              <label class="flex items-center justify-between text-slate-300 hover:text-white cursor-pointer py-0.5 select-none">
                <div class="flex items-center gap-2">
                  <input type="checkbox" onchange="toggleFilterItem('fwCategory', '${c}')" ${isChecked ? 'checked' : ''} class="rounded border-slate-700 bg-slate-900 text-rose-500 focus:ring-0">
                  <span>${categoryLabels[c] || c.replace('_', ' ')}</span>
                </div>
                <span class="text-[10px] font-mono text-slate-500">${count}</span>
              </label>
            `;
          }).join('')}
        </div>
      </div>

      <div class="pt-3 border-t border-slate-800">
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Hardware Constraints</span>
        <div class="space-y-1 text-slate-300">
          <label class="flex items-center justify-between hover:text-white cursor-pointer py-0.5 select-none">
            <div class="flex items-center gap-2">
              <input type="checkbox" onchange="requireFwRackmount = this.checked; runActiveFilter();" ${(typeof requireFwRackmount !== "undefined" && requireFwRackmount) ? 'checked' : ''} class="rounded border-slate-700 bg-slate-900 text-rose-500 focus:ring-0">
              <span>1U 19" Rackmount</span>
            </div>
          </label>
          <label class="flex items-center justify-between hover:text-white cursor-pointer py-0.5 select-none">
            <div class="flex items-center gap-2">
              <input type="checkbox" onchange="requireFwCellular = this.checked; runActiveFilter();" ${(typeof requireFwCellular !== "undefined" && requireFwCellular) ? 'checked' : ''} class="rounded border-slate-700 bg-slate-900 text-rose-500 focus:ring-0">
              <span>LTE / 5G Failover</span>
            </div>
          </label>
          <label class="flex items-center justify-between hover:text-white cursor-pointer py-0.5 select-none">
            <div class="flex items-center gap-2">
              <input type="checkbox" onchange="requireFwDualPsu = this.checked; runActiveFilter();" ${(typeof requireFwDualPsu !== "undefined" && requireFwDualPsu) ? 'checked' : ''} class="rounded border-slate-700 bg-slate-900 text-rose-500 focus:ring-0">
              <span>Dual Redundant PSUs</span>
            </div>
          </label>
          <label class="flex items-center justify-between hover:text-white cursor-pointer py-0.5 select-none">
            <div class="flex items-center gap-2">
              <input type="checkbox" onchange="requireFw10GWan = this.checked; runActiveFilter();" ${(typeof requireFw10GWan !== "undefined" && requireFw10GWan) ? 'checked' : ''} class="rounded border-slate-700 bg-slate-900 text-rose-500 focus:ring-0">
              <span>10G/25G SFP+ Uplinks</span>
            </div>
          </label>
          <label class="flex items-center justify-between hover:text-white cursor-pointer py-0.5 select-none">
            <div class="flex items-center gap-2">
              <input type="checkbox" onchange="requireFwPoePorts = this.checked; runActiveFilter();" ${(typeof requireFwPoePorts !== "undefined" && requireFwPoePorts) ? 'checked' : ''} class="rounded border-slate-700 bg-slate-900 text-rose-500 focus:ring-0">
              <span>Integrated PoE Ports</span>
            </div>
          </label>
        </div>
      </div>
    </div>
  `;
}

function buildOpticsSidebar(container, baseSet) {
  const vendors = [...new Set(baseSet.map(o => (o.vendor || '').trim()).filter(Boolean))];
  const mediums = [...new Set(baseSet.map(o => (o.medium || '').toLowerCase().trim()).filter(Boolean))];
  const speeds = ["1G", "10G", "25G", "40G", "100G"].filter(s => baseSet.some(o => o.speed === s));

  const mediumLabels = {
    dac: "Direct Attach Copper (DAC)",
    stacking: "Hardware Stacking Cable",
    mmf: "Multimode Fiber (MMF / SR)",
    smf: "Single Mode Fiber (SMF / LR)",
    copper: "RJ45 Copper Transceiver"
  };

  container.innerHTML = `
    <div class="space-y-4 text-xs">
      <div>
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Manufacturer</span>
        <div class="space-y-1">
          ${vendors.map(v => {
            const isChecked = (typeof selectedOpticVendors !== "undefined" && selectedOpticVendors.includes(v));
            const count = baseSet.filter(o => o.vendor === v).length;
            return `
              <label class="flex items-center justify-between text-slate-300 hover:text-white cursor-pointer py-0.5 select-none">
                <div class="flex items-center gap-2">
                  <input type="checkbox" onchange="toggleFilterItem('opticVendor', '${v}')" ${isChecked ? 'checked' : ''} class="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-0">
                  <span>${v}</span>
                </div>
                <span class="text-[10px] font-mono text-slate-500">${count}</span>
              </label>
            `;
          }).join('')}
        </div>
      </div>

      <div class="pt-3 border-t border-slate-800">
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Medium / Type</span>
        <div class="space-y-1">
          ${mediums.map(m => {
            const isChecked = (typeof selectedOpticMediums !== "undefined" && selectedOpticMediums.includes(m));
            const count = baseSet.filter(o => (o.medium || '').toLowerCase() === m).length;
            return `
              <label class="flex items-center justify-between text-slate-300 hover:text-white cursor-pointer py-0.5 select-none">
                <div class="flex items-center gap-2">
                  <input type="checkbox" onchange="toggleFilterItem('opticMedium', '${m}')" ${isChecked ? 'checked' : ''} class="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-0">
                  <span>${mediumLabels[m] || m.toUpperCase()}</span>
                </div>
                <span class="text-[10px] font-mono text-slate-500">${count}</span>
              </label>
            `;
          }).join('')}
        </div>
      </div>

      <div class="pt-3 border-t border-slate-800">
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Line Rate Speed</span>
        <div class="grid grid-cols-3 gap-1 font-mono font-semibold">
          ${speeds.map(s => {
            const isChecked = (typeof selectedOpticSpeeds !== "undefined" && selectedOpticSpeeds.includes(s));
            return `
              <button onclick="toggleFilterItem('opticSpeed', '${s}')" class="py-1 px-1.5 rounded-lg border text-center text-[11px] transition-all ${isChecked ? 'bg-sky-600 border-sky-500 text-white shadow-sm' : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'}">
                ${s}
              </button>
            `;
          }).join('')}
        </div>
      </div>

      <div class="pt-3 border-t border-slate-800">
        <label class="flex items-center justify-between text-slate-300 hover:text-white cursor-pointer py-0.5 select-none">
          <div class="flex items-center gap-2">
            <input type="checkbox" onchange="requireOpticIndustrial = this.checked; runActiveFilter();" ${(typeof requireOpticIndustrial !== "undefined" && requireOpticIndustrial) ? 'checked' : ''} class="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-0">
            <span>Industrial Range (-40°C to +85°C)</span>
          </div>
        </label>
      </div>
    </div>
  `;
}

function buildWirelessSidebar(container, baseSet) {
  const vendors = [...new Set(baseSet.map(w => (w.vendor || '').trim()).filter(Boolean))];
  const masters = baseSet.filter(w => (w.topologyRole === "ap" || (w.maxStations || 0) > 1));
  const freqs = ["60", "70", "5", "24", "11"].filter(f => baseSet.some(w => (w.frequency || w.band || '').includes(f)));

  container.innerHTML = `
    <div class="space-y-4 text-xs">
      <div>
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Wireless Manufacturer</span>
        <div class="space-y-1">
          ${vendors.map(v => {
            const isChecked = (typeof selectedWlVendors !== "undefined" && selectedWlVendors.includes(v));
            const count = baseSet.filter(w => (w.vendor || '').trim() === v).length;
            return `
              <label class="flex items-center justify-between text-slate-300 hover:text-white cursor-pointer py-0.5 select-none">
                <div class="flex items-center gap-2">
                  <input type="checkbox" onchange="toggleFilterItem('wlVendor', '${v}')" ${isChecked ? 'checked' : ''} class="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0">
                  <span>${v}</span>
                </div>
                <span class="text-[10px] font-mono text-slate-500">${count}</span>
              </label>
            `;
          }).join('')}
        </div>
      </div>

      <div class="pt-3 border-t border-slate-800">
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Topology & Role</span>
        <div class="space-y-2 text-xs">
          <select onchange="selectedWlTopologyRole = this.value; runActiveFilter();" class="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-emerald-500">
            <option value="all" ${(typeof selectedWlTopologyRole !== "undefined" && selectedWlTopologyRole === 'all') ? 'selected' : ''}>All Roles (PtP & PtMP)</option>
            <option value="ap" ${(typeof selectedWlTopologyRole !== "undefined" && selectedWlTopologyRole === 'ap') ? 'selected' : ''}>BaseStation AP (Master)</option>
            <option value="ptp" ${(typeof selectedWlTopologyRole !== "undefined" && selectedWlTopologyRole === 'ptp') ? 'selected' : ''}>Point-to-Point (1-to-1)</option>
            <option value="station" ${(typeof selectedWlTopologyRole !== "undefined" && selectedWlTopologyRole === 'station') ? 'selected' : ''}>Subscriber Station Only</option>
          </select>
        </div>
      </div>

      ${masters.length > 0 ? `
        <div class="pt-3 border-t border-slate-800">
          <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Station Compatibility</span>
          <select onchange="selectedCompatibleMasterSku = this.value; runActiveFilter();" class="w-full bg-slate-950 border border-slate-700 text-amber-300 font-semibold rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-amber-500">
            <option value="all" ${(typeof selectedCompatibleMasterSku !== "undefined" && selectedCompatibleMasterSku === 'all') ? 'selected' : ''}>All Hardware</option>
            ${masters.map(m => `
              <option value="${m.sku}" ${(typeof selectedCompatibleMasterSku !== "undefined" && selectedCompatibleMasterSku === m.sku) ? 'selected' : ''}>Stations for ${m.model} (${m.sku})</option>
            `).join('')}
          </select>
        </div>
      ` : ''}

      <div class="pt-3 border-t border-slate-800">
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Frequency Band</span>
        <div class="space-y-1">
          ${freqs.map(f => {
            const isChecked = (typeof selectedWlFrequencies !== "undefined" && selectedWlFrequencies.includes(f));
            const count = baseSet.filter(w => (w.frequency || w.band || '').includes(f)).length;
            return `
              <label class="flex items-center justify-between text-slate-300 hover:text-white cursor-pointer py-0.5 select-none">
                <div class="flex items-center gap-2">
                  <input type="checkbox" onchange="toggleFilterItem('wlFreq', '${f}')" ${isChecked ? 'checked' : ''} class="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0">
                  <span>${f} GHz Band</span>
                </div>
                <span class="text-[10px] font-mono text-slate-500">${count}</span>
              </label>
            `;
          }).join('')}
        </div>
      </div>

      <div class="pt-3 border-t border-slate-800">
        <label class="flex items-center justify-between text-slate-300 hover:text-white cursor-pointer py-0.5 select-none">
          <div class="flex items-center gap-2">
            <input type="checkbox" onchange="requireWlBackup5G = this.checked; runActiveFilter();" ${(typeof requireWlBackup5G !== "undefined" && requireWlBackup5G) ? 'checked' : ''} class="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0">
            <span>5GHz Integrated Weather Failover</span>
          </div>
        </label>
      </div>
    </div>
  `;
}

function buildAccessoriesSidebar(container, baseSet) {
  const vendors = [...new Set(baseSet.map(a => (a.vendor || '').trim()).filter(Boolean))];
  const types = [
    { id: "power_supply", label: "Power Supplies (DIN/AC)" },
    { id: "poe_injector", label: "PoE Midspan Injectors" },
    { id: "media_converter", label: "Media Converters" },
    { id: "power_distribution", label: "Managed PDUs" },
    { id: "enclosure", label: "Weatherproof Enclosures" },
    { id: "surge_protector", label: "Surge Suppressors" }
  ];

  container.innerHTML = `
    <div class="space-y-4 text-xs">
      <div>
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Manufacturer</span>
        <div class="space-y-1">
          ${vendors.map(v => {
            const isChecked = (typeof selectedAccVendors !== "undefined" && selectedAccVendors.includes(v));
            const count = baseSet.filter(a => (a.vendor || '').trim() === v).length;
            return `
              <label class="flex items-center justify-between text-slate-300 hover:text-white cursor-pointer py-0.5 select-none">
                <div class="flex items-center gap-2">
                  <input type="checkbox" onchange="toggleFilterItem('accVendor', '${v}')" ${isChecked ? 'checked' : ''} class="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-0">
                  <span>${v}</span>
                </div>
                <span class="text-[10px] font-mono text-slate-500">${count}</span>
              </label>
            `;
          }).join('')}
        </div>
      </div>

      <div class="pt-3 border-t border-slate-800">
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Accessory Type</span>
        <div class="space-y-1">
          ${types.map(t => {
            const isChecked = (typeof selectedAccTypes !== "undefined" && selectedAccTypes.includes(t.id));
            const count = baseSet.filter(a => a.type === t.id || a.category === t.id).length;
            return `
              <label class="flex items-center justify-between text-slate-300 hover:text-white cursor-pointer py-0.5 select-none">
                <div class="flex items-center gap-2">
                  <input type="checkbox" onchange="toggleFilterItem('accType', '${t.id}')" ${isChecked ? 'checked' : ''} class="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-0">
                  <span>${t.label}</span>
                </div>
                <span class="text-[10px] font-mono text-slate-500">${count}</span>
              </label>
            `;
          }).join('')}
        </div>
      </div>

      <div class="pt-3 border-t border-slate-800">
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Mounting Environment</span>
        <select onchange="selectedAccMounting = this.value; runActiveFilter();" class="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-amber-500">
          <option value="all" ${(typeof selectedAccMounting !== "undefined" && selectedAccMounting === 'all') ? 'selected' : ''}>All Mountings</option>
          <option value="DIN" ${(typeof selectedAccMounting !== "undefined" && selectedAccMounting === 'DIN') ? 'selected' : ''}>DIN-Rail</option>
          <option value="Rack" ${(typeof selectedAccMounting !== "undefined" && selectedAccMounting === 'Rack') ? 'selected' : ''}>19" Rackmount (1U)</option>
          <option value="Wall" ${(typeof selectedAccMounting !== "undefined" && selectedAccMounting === 'Wall') ? 'selected' : ''}>Wall / Surface</option>
          <option value="Pole" ${(typeof selectedAccMounting !== "undefined" && selectedAccMounting === 'Pole') ? 'selected' : ''}>Outdoor Pole Box</option>
        </select>
      </div>
    </div>
  `;
}

function buildDomainPlaceholderSidebar(container, mode) {
  const modeTitle = (mode || "").replace(/_/g, " ").toUpperCase();
  container.innerHTML = `
    <div class="space-y-4">
      <div class="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs space-y-2">
        <div class="flex items-center gap-2 text-brand-400 font-bold uppercase tracking-wider text-[11px]">
          <i data-lucide="layers" class="w-4 h-4"></i>
          <span>${modeTitle}</span>
        </div>
        <p class="text-[11px] text-slate-400">Faceted hardware filtering and capacity thresholds for this catalog domain.</p>
      </div>
      <div class="space-y-2">
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Status</span>
        <div class="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs">
          Ready for domain catalog ingestion.
        </div>
      </div>
    </div>
  `;
}