// ==========================================
// Global SubCategory Controller for Networking Accessories
if (typeof window.setAccSubCategory !== "function") {
  window.setAccSubCategory = function(catId) {
    if (typeof selectedAccSubCategory !== "undefined") selectedAccSubCategory = catId;
    window.selectedAccSubCategory = catId;
    if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
    if (typeof buildSidebarFilters === "function") buildSidebarFilters();
    if (typeof runActiveFilter === "function") runActiveFilter();
  };
}

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
    return (typeof NETWORKING_ACCESSORIES !== "undefined") ? NETWORKING_ACCESSORIES : (typeof ACCESSORY_DATABASE !== "undefined" ? ACCESSORY_DATABASE : []);
  } else if (currentMode === "enclosures") {
    return (typeof ENCLOSURES_DATABASE !== "undefined") ? ENCLOSURES_DATABASE : [];
  } else if (currentMode === "pdus") {
    return (typeof PDUS_DATABASE !== "undefined") ? PDUS_DATABASE : [];
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
  } else if (currentMode === "racks") {
    buildRacksSidebar(container, baseSet);
  } else if (currentMode === "enclosures") {
    buildEnclosuresSidebar(container, baseSet);
  } else if (currentMode === "ups") {
    buildUpsSidebar(container, baseSet);
  } else if (currentMode === "pdus") {
    buildPdusSidebar(container, baseSet);
  } else if (currentMode === "cabling") {
    buildCablingSidebar(container, baseSet);
  } else if (currentMode === "pathways") {
    buildPathwaysSidebar(container, baseSet);
  } else {
    buildDomainPlaceholderSidebar(container, currentMode);
  }

  safeCreateIcons(container);
}

function buildSwitchSidebar(container, baseSet) {
  const vendors = ["UniFi", "Ruckus", "Meraki", "Cisco", "Juniper", "AMG", "Allied Telesis"];
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

  const formFactors = [
    { id: "rackmount", label: "19\" Rackmount (1U/2U)" },
    { id: "desktop", label: "0U Compact / Wall" },
    { id: "outdoor", label: "Outdoor Weatherproof" },
    { id: "din", label: "DIN-Rail Industrial" }
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

      <!-- Form Factor & Enclosure -->
      <div class="pt-3 border-t border-slate-800">
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Form Factor & Mounting</span>
        <div class="space-y-1">
          ${formFactors.map(f => {
            const isChecked = (typeof selectedFormFactors !== "undefined" && selectedFormFactors.includes(f.id));
            const count = baseSet.filter(s => (typeof checkSwitchFormFactor === "function") ? checkSwitchFormFactor(s, [f.id]) : true).length;
            return `
              <label class="flex items-center justify-between text-slate-300 hover:text-white cursor-pointer py-0.5 select-none">
                <div class="flex items-center gap-2">
                  <input type="checkbox" onchange="toggleFilterItem('formFactor', '${f.id}')" ${isChecked ? 'checked' : ''} class="rounded border-slate-700 bg-slate-900 text-brand-500 focus:ring-0">
                  <span>${f.label}</span>
                </div>
                <span class="text-[10px] font-mono text-slate-500">${count}</span>
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

      <!-- Management & Switching Architecture -->
      <div class="pt-3 border-t border-slate-800">
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Management Architecture</span>
        <div class="grid grid-cols-3 gap-1 font-semibold">
          ${[
            { id: "l3", label: "Layer 3", sub: "Routing" },
            { id: "l2", label: "Layer 2", sub: "Managed" },
            { id: "unmanaged", label: "Unmanaged", sub: "Air-Gapped" }
          ].map(lay => {
            const isSel = typeof selectedSwitchLayers !== "undefined" && selectedSwitchLayers.includes(lay.id);
            const count = baseSet.filter(s => (typeof getSwitchManagementLayer === "function") && getSwitchManagementLayer(s) === lay.id).length;
            return `
              <button onclick="toggleFilterItem('switchLayer', '${lay.id}')" class="py-1 px-1 rounded-lg border text-center transition-all ${isSel ? 'bg-indigo-600 border-indigo-500 text-white font-bold shadow-sm' : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'}">
                <span class="block text-[11px] leading-tight">${lay.label}</span>
                <span class="block text-[9px] opacity-75">${count}</span>
              </button>
            `;
          }).join('')}
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
              <input type="checkbox" onchange="requireLayer3 = this.checked; runActiveFilter();" ${(typeof requireLayer3 !== "undefined" && requireLayer3) ? 'checked' : ''} class="rounded border-slate-700 bg-slate-900 text-brand-500 focus:ring-0">
              <span class="text-indigo-300 font-medium">Layer 3 (Inter-VLAN Routing)</span>
            </div>
          </label>
          <label class="flex items-center justify-between hover:text-white cursor-pointer py-0.5 select-none">
            <div class="flex items-center gap-2">
              <input type="checkbox" onchange="requireFanless = this.checked; runActiveFilter();" ${(typeof requireFanless !== "undefined" && requireFanless) ? 'checked' : ''} class="rounded border-slate-700 bg-slate-900 text-brand-500 focus:ring-0">
              <span class="text-teal-300 font-medium">Fanless / Silent (0 dB)</span>
            </div>
          </label>
          <label class="flex items-center justify-between hover:text-white cursor-pointer py-0.5 select-none">
            <div class="flex items-center gap-2">
              <input type="checkbox" onchange="requirePoEPowered = this.checked; runActiveFilter();" ${(typeof requirePoEPowered !== "undefined" && requirePoEPowered) ? 'checked' : ''} class="rounded border-slate-700 bg-slate-900 text-brand-500 focus:ring-0">
              <span>PoE-Powered In (Passthrough)</span>
            </div>
          </label>
          <label class="flex items-center justify-between hover:text-white cursor-pointer py-0.5 select-none">
            <div class="flex items-center gap-2">
              <input type="checkbox" onchange="requireDcPower = this.checked; runActiveFilter();" ${(typeof requireDcPower !== "undefined" && requireDcPower) ? 'checked' : ''} class="rounded border-slate-700 bg-slate-900 text-brand-500 focus:ring-0">
              <span>DC Terminal Power (12-48V)</span>
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
              <input type="checkbox" onchange="if (typeof requireModularUplink !== 'undefined') requireModularUplink = this.checked; window.requireModularUplink = this.checked; runActiveFilter();" ${(typeof requireModularUplink !== 'undefined' && requireModularUplink) || (typeof window.requireModularUplink !== 'undefined' && window.requireModularUplink) ? 'checked' : ''} class="rounded border-slate-700 bg-slate-900 text-brand-500 focus:ring-0">
              <span>Modular Uplink Bays (Swappable Sleds)</span>
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
          <label class="flex items-center justify-between hover:text-white cursor-pointer py-0.5 select-none">
            <div class="flex items-center gap-2">
              <input type="checkbox" onchange="requireIndustrialHardened = this.checked; runActiveFilter();" ${(typeof requireIndustrialHardened !== "undefined" && requireIndustrialHardened) ? 'checked' : ''} class="rounded border-slate-700 bg-slate-900 text-amber-400 focus:ring-0">
              <span class="text-amber-300 font-medium">Industrial Hardened (-40°C to +75°C)</span>
            </div>
          </label>
          <label class="flex items-center justify-between hover:text-white cursor-pointer py-0.5 select-none">
            <div class="flex items-center gap-2">
              <input type="checkbox" onchange="requirePoEBt90 = this.checked; runActiveFilter();" ${(typeof requirePoEBt90 !== "undefined" && requirePoEBt90) ? 'checked' : ''} class="rounded border-slate-700 bg-slate-900 text-rose-400 focus:ring-0">
              <span class="text-rose-300 font-medium">90W 802.3bt Type 4 / PoH</span>
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
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Hardware Constraints & Features</span>
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
              <input type="checkbox" onchange="requireFw25GWan = this.checked; runActiveFilter();" ${(typeof requireFw25GWan !== "undefined" && requireFw25GWan) ? 'checked' : ''} class="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0">
              <span>25G SFP28 Enterprise WAN</span>
            </div>
          </label>
          <label class="flex items-center justify-between hover:text-white cursor-pointer py-0.5 select-none">
            <div class="flex items-center gap-2">
              <input type="checkbox" onchange="requireFwHA = this.checked; runActiveFilter();" ${(typeof requireFwHA !== "undefined" && requireFwHA) ? 'checked' : ''} class="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-0">
              <span>Shadow Mode HA (VRRP)</span>
            </div>
          </label>
          <label class="flex items-center justify-between hover:text-white cursor-pointer py-0.5 select-none">
            <div class="flex items-center gap-2">
              <input type="checkbox" onchange="requireFwStorage = this.checked; runActiveFilter();" ${(typeof requireFwStorage !== "undefined" && requireFwStorage) ? 'checked' : ''} class="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0">
              <span>Integrated NVR HDD/SSD Bay</span>
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

      <!-- Reach & Distance -->
      <div class="pt-3 border-t border-slate-800">
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Link Reach / Distance</span>
        <div class="grid grid-cols-2 gap-1 text-[11px] font-medium">
          ${[
            { id: "all", label: "All Reaches" },
            { id: "patch", label: "Patch (≤5m DAC)" },
            { id: "short", label: "Short (≤300m MMF)" },
            { id: "long", label: "Long (10km SMF)" },
            { id: "extended", label: "Extended (≥40km)" }
          ].map(r => `
            <button onclick="selectedOpticReach = '${r.id}'; runActiveFilter();" class="py-1 px-1.5 rounded-lg border text-center transition-all ${(typeof selectedOpticReach !== "undefined" && selectedOpticReach === r.id) ? 'bg-sky-600 border-sky-500 text-white font-bold shadow-sm' : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'}">
              ${r.label}
            </button>
          `).join('')}
        </div>
      </div>

      <!-- DAC Cable Length -->
      <div class="pt-3 border-t border-slate-800">
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">DAC / Stacking Length</span>
        <div class="grid grid-cols-3 gap-1 text-[11px] font-medium font-mono">
          ${[
            { id: "all", label: "All Lengths" },
            { id: "0.5m", label: "0.5m (1.6')" },
            { id: "1m", label: "1m (3.3')" },
            { id: "2m", label: "2m (6.6')" },
            { id: "3m", label: "3m (9.8')" },
            { id: "5m", label: "5m (16.4')" }
          ].map(d => `
            <button onclick="selectedDacLength = '${d.id}'; runActiveFilter();" class="py-1 px-1 rounded-lg border text-center transition-all ${(typeof selectedDacLength !== "undefined" && selectedDacLength === d.id) ? 'bg-sky-600 border-sky-500 text-white font-bold shadow-sm' : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'}">
              ${d.label}
            </button>
          `).join('')}
        </div>
      </div>

      <div class="pt-3 border-t border-slate-800 space-y-1.5">
        <label class="flex items-center justify-between text-slate-300 hover:text-white cursor-pointer py-0.5 select-none">
          <div class="flex items-center gap-2">
            <input type="checkbox" onchange="requireOpticBiDi = this.checked; runActiveFilter();" ${(typeof requireOpticBiDi !== "undefined" && requireOpticBiDi) ? 'checked' : ''} class="rounded border-slate-700 bg-slate-900 text-purple-500 focus:ring-0">
            <span>BiDi (Simplex LC 1-Strand)</span>
          </div>
        </label>
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
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Link Distance Range</span>
        <div class="grid grid-cols-2 gap-1 text-[11px] font-medium">
          ${[
            { id: "all", label: "All Ranges" },
            { id: "short", label: "Short (≤1 km)" },
            { id: "medium", label: "Mid (1-5 km)" },
            { id: "long", label: "Long (>5 km)" }
          ].map(r => `
            <button onclick="selectedWlRangeTier = '${r.id}'; runActiveFilter();" class="py-1 px-1.5 rounded-lg border text-center transition-all ${(typeof selectedWlRangeTier !== "undefined" && selectedWlRangeTier === r.id) ? 'bg-emerald-600 border-emerald-500 text-white font-bold shadow-sm' : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'}">
              ${r.label}
            </button>
          `).join('')}
        </div>
      </div>

      <div class="pt-3 border-t border-slate-800 space-y-1.5">
        <label class="flex items-center justify-between text-slate-300 hover:text-white cursor-pointer py-0.5 select-none">
          <div class="flex items-center gap-2">
            <input type="checkbox" onchange="requireWl60GHz = this.checked; runActiveFilter();" ${(typeof requireWl60GHz !== "undefined" && requireWl60GHz) ? 'checked' : ''} class="rounded border-slate-700 bg-slate-900 text-teal-500 focus:ring-0">
            <span>60 GHz High-Capacity (Wave / airFiber)</span>
          </div>
        </label>
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
  const vendors = [...new Set(baseSet.map(a => (a.vendor || '').trim()).filter(Boolean))].sort();
  const subCategories = [
    { id: "all", label: "All Network Accessories" },
    { id: "mounts", label: "Mounts & Brackets" },
    { id: "media_converters", label: "Media Converters & Extenders" },
    { id: "licenses", label: "Licenses & Subscriptions" },
    { id: "modular_uplinks", label: "Modular Uplinks & Expansion" },
    { id: "power_supplies", label: "Modular Power Supplies" },
    { id: "poe_injectors", label: "PoE Midspans & Injectors" }
  ];

  const currentSubCat = typeof selectedAccSubCategory !== "undefined" ? selectedAccSubCategory : "all";

  container.innerHTML = `
    <div class="space-y-4 text-xs">
      <div>
        <span class="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block mb-1.5 flex items-center justify-between">
          <span>Accessory Category</span>
          ${currentSubCat !== 'all' ? `
            <button onclick="setAccSubCategory('all')" class="text-[10px] text-rose-400 hover:text-rose-300 font-semibold lowercase">
              reset
            </button>
          ` : ''}
        </span>
        <div class="space-y-1">
          ${subCategories.map(sc => {
            const isSelected = currentSubCat === sc.id;
            let count = 0;
            if (sc.id === "all") {
              count = baseSet.length;
            } else {
              count = baseSet.filter(a => {
                if (a.subCategory === sc.id) return true;
                if (sc.id === "mounts" && (a.type === "mounting" || a.category === "mounting" || a.type === "rack_kit" || a.type === "wall_bracket" || (a.role && a.role.toLowerCase().includes("mount")))) return true;
                if (sc.id === "media_converters" && (a.type === "media_converter" || a.category === "media_converter")) return true;
                if (sc.id === "licenses" && (a.type === "license" || a.category === "licenses" || a.type === "feature_license" || a.type === "cloud_subscription" || (a.role && a.role.toLowerCase().includes("license")))) return true;
                if (sc.id === "modular_uplinks" && (a.type === "modular_uplink" || a.category === "modular_uplinks" || (a.role && a.role.toLowerCase().includes("modular")))) return true;
                if (sc.id === "power_supplies" && (a.type === "power_supply" || a.category === "power_supplies" || (a.role && a.role.toLowerCase().includes("power supply")))) return true;
                if (sc.id === "poe_injectors" && (a.type === "poe_injector" || a.type === "poe_splitter" || a.category === "power_injector" || (a.role && a.role.toLowerCase().includes("injector")))) return true;
                return false;
              }).length;
            }
            if (count === 0 && sc.id !== "all") return '';
            return `
              <button onclick="setAccSubCategory('${sc.id}')" class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-left transition-all ${isSelected ? '!bg-indigo-600 !border-indigo-400 !text-white font-bold shadow-md shadow-indigo-950/50 ring-2 ring-indigo-400/60' : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'}">
                <span class="truncate">${sc.label}</span>
                <span class="text-[10px] font-mono shrink-0 ml-1.5 ${isSelected ? '!text-indigo-100 font-bold' : 'text-slate-400'}">${count}</span>
              </button>
            `;
          }).join('')}
        </div>
      </div>

      <div class="pt-3 border-t border-slate-800">
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Manufacturer</span>
        <div class="space-y-1 max-h-48 overflow-y-auto pr-1">
          ${vendors.map(v => {
            const isChecked = (typeof selectedAccVendors !== "undefined" && selectedAccVendors.includes(v));
            const count = baseSet.filter(a => (a.vendor || '').trim() === v).length;
            return `
              <label class="flex items-center justify-between text-slate-300 hover:text-white cursor-pointer py-0.5 select-none">
                <div class="flex items-center gap-2">
                  <input type="checkbox" onchange="toggleFilterItem('accVendor', '${v}')" ${isChecked ? 'checked' : ''} class="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-0">
                  <span class="truncate max-w-[130px]">${v}</span>
                </div>
                <span class="text-[10px] font-mono text-slate-500">${count}</span>
              </label>
            `;
          }).join('')}
        </div>
      </div>

      <div class="pt-3 border-t border-slate-800">
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Mounting Form</span>
        <select onchange="selectedAccMounting = this.value; runActiveFilter();" class="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-indigo-500">
          <option value="all" ${(typeof selectedAccMounting !== "undefined" && selectedAccMounting === 'all') ? 'selected' : ''}>All Mountings</option>
          <option value="Rack" ${(typeof selectedAccMounting !== "undefined" && selectedAccMounting === 'Rack') ? 'selected' : ''}>19" Rackmount (Ears / Tray)</option>
          <option value="DIN" ${(typeof selectedAccMounting !== "undefined" && selectedAccMounting === 'DIN') ? 'selected' : ''}>DIN-Rail Clip</option>
          <option value="Wall" ${(typeof selectedAccMounting !== "undefined" && selectedAccMounting === 'Wall') ? 'selected' : ''}>Wall / Surface Bracket</option>
          <option value="Magnetic" ${(typeof selectedAccMounting !== "undefined" && selectedAccMounting === 'Magnetic') ? 'selected' : ''}>Magnetic Mount</option>
        </select>
      </div>

      <div class="pt-3 border-t border-slate-800">
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Minimum Output Power</span>
        <select onchange="accMinPowerWatts = Number(this.value); runActiveFilter();" class="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-indigo-500">
          <option value="0" ${(typeof accMinPowerWatts !== "undefined" && accMinPowerWatts === 0) ? 'selected' : ''}>Any Capacity</option>
          <option value="30" ${(typeof accMinPowerWatts !== "undefined" && accMinPowerWatts === 30) ? 'selected' : ''}>&ge; 30W (PoE+)</option>
          <option value="60" ${(typeof accMinPowerWatts !== "undefined" && accMinPowerWatts === 60) ? 'selected' : ''}>&ge; 60W (PoE++ / bt)</option>
          <option value="90" ${(typeof accMinPowerWatts !== "undefined" && accMinPowerWatts === 90) ? 'selected' : ''}>&ge; 90W (PoE++ bt Type 4)</option>
          <option value="120" ${(typeof accMinPowerWatts !== "undefined" && accMinPowerWatts === 120) ? 'selected' : ''}>&ge; 120W (High-Power DIN)</option>
          <option value="250" ${(typeof accMinPowerWatts !== "undefined" && accMinPowerWatts === 250) ? 'selected' : ''}>&ge; 250W (Switch PSU)</option>
          <option value="500" ${(typeof accMinPowerWatts !== "undefined" && accMinPowerWatts === 500) ? 'selected' : ''}>&ge; 500W+ (RPS High-Density)</option>
        </select>
      </div>
    </div>
  `;
}

function buildRacksSidebar(container, baseSet) {
  const vendors = [...new Set(baseSet.map(a => (a.vendor || '').trim()).filter(Boolean))];

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
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Mounting & Form Factor</span>
        <select onchange="selectedAccMounting = this.value; runActiveFilter();" class="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-amber-500">
          <option value="all" ${(typeof selectedAccMounting !== "undefined" && selectedAccMounting === 'all') ? 'selected' : ''}>All Enclosure Types</option>
          <option value="Floor" ${(typeof selectedAccMounting !== "undefined" && selectedAccMounting === 'Floor') ? 'selected' : ''}>Floor-Standing (4-Post / 2-Post)</option>
          <option value="Wall" ${(typeof selectedAccMounting !== "undefined" && selectedAccMounting === 'Wall') ? 'selected' : ''}>Wall-Mount Hinged Cabinet</option>
          <option value="Desktop" ${(typeof selectedAccMounting !== "undefined" && selectedAccMounting === 'Desktop') ? 'selected' : ''}>Tabletop / Desk</option>
          <option value="Pole" ${(typeof selectedAccMounting !== "undefined" && selectedAccMounting === 'Pole') ? 'selected' : ''}>Pole / Outdoor Utility</option>
        </select>
      </div>
    </div>
  `;
}

function buildEnclosuresSidebar(container, baseSet) {
  const vendors = [...new Set(baseSet.map(a => (a.vendor || '').trim()).filter(Boolean))].sort();

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
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Enclosure Environment</span>
        <select onchange="selectedAccMounting = this.value; runActiveFilter();" class="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-amber-500">
          <option value="all" ${(typeof selectedAccMounting !== "undefined" && selectedAccMounting === 'all') ? 'selected' : ''}>All Enclosure Types</option>
          <option value="Pole" ${(typeof selectedAccMounting !== "undefined" && selectedAccMounting === 'Pole') ? 'selected' : ''}>Outdoor Pole Box (NEMA 4X)</option>
          <option value="Wall" ${(typeof selectedAccMounting !== "undefined" && selectedAccMounting === 'Wall') ? 'selected' : ''}>Wall / Security Cabinet</option>
          <option value="DIN" ${(typeof selectedAccMounting !== "undefined" && selectedAccMounting === 'DIN') ? 'selected' : ''}>DIN Rail Cabinet</option>
        </select>
      </div>
    </div>
  `;
}

function buildUpsSidebar(container, baseSet) {
  const vendors = [...new Set(baseSet.map(a => (a.vendor || '').trim()).filter(Boolean))];

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
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Hardware Category</span>
        <select onchange="selectedUpsCategory = this.value; runActiveFilter();" class="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-amber-500">
          <option value="all" ${(typeof selectedUpsCategory !== "undefined" && selectedUpsCategory === 'all') ? 'selected' : ''}>All Power Infrastructure</option>
          <option value="ups" ${(typeof selectedUpsCategory !== "undefined" && selectedUpsCategory === 'ups') ? 'selected' : ''}>UPS Systems (Battery Backup)</option>
          <option value="ebp" ${(typeof selectedUpsCategory !== "undefined" && selectedUpsCategory === 'ebp') ? 'selected' : ''}>Extended Battery Packs (EBP)</option>
          <option value="pdu" ${(typeof selectedUpsCategory !== "undefined" && selectedUpsCategory === 'pdu') ? 'selected' : ''}>Rack Power Distribution (PDUs)</option>
          <option value="power_cord" ${(typeof selectedUpsCategory !== "undefined" && selectedUpsCategory === 'power_cord') ? 'selected' : ''}>Power Cords & Jumpers</option>
        </select>
      </div>

      <div class="pt-3 border-t border-slate-800">
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Nominal Voltage</span>
        <select onchange="selectedUpsVoltage = this.value; runActiveFilter();" class="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-amber-500">
          <option value="all" ${(typeof selectedUpsVoltage !== "undefined" && selectedUpsVoltage === 'all') ? 'selected' : ''}>All Voltages</option>
          <option value="120" ${(typeof selectedUpsVoltage !== "undefined" && selectedUpsVoltage === '120') ? 'selected' : ''}>120V AC (Standard)</option>
          <option value="240" ${(typeof selectedUpsVoltage !== "undefined" && selectedUpsVoltage === '240') ? 'selected' : ''}>208V / 240V AC (High-Density)</option>
        </select>
      </div>

      <div class="pt-3 border-t border-slate-800">
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Minimum Output Wattage</span>
        <select onchange="accMinPowerWatts = Number(this.value); runActiveFilter();" class="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-amber-500">
          <option value="0" ${(typeof accMinPowerWatts !== "undefined" && accMinPowerWatts === 0) ? 'selected' : ''}>Any Capacity</option>
          <option value="500" ${(typeof accMinPowerWatts !== "undefined" && accMinPowerWatts === 500) ? 'selected' : ''}>&ge; 500W</option>
          <option value="1000" ${(typeof accMinPowerWatts !== "undefined" && accMinPowerWatts === 1000) ? 'selected' : ''}>&ge; 1,000W</option>
          <option value="1500" ${(typeof accMinPowerWatts !== "undefined" && accMinPowerWatts === 1500) ? 'selected' : ''}>&ge; 1,500W</option>
          <option value="2000" ${(typeof accMinPowerWatts !== "undefined" && accMinPowerWatts === 2000) ? 'selected' : ''}>&ge; 2,000W</option>
          <option value="3000" ${(typeof accMinPowerWatts !== "undefined" && accMinPowerWatts === 3000) ? 'selected' : ''}>&ge; 3,000W</option>
        </select>
      </div>

      <div class="pt-3 border-t border-slate-800 space-y-1.5">
        <label class="flex items-center justify-between text-slate-300 hover:text-white cursor-pointer py-0.5 select-none">
          <div class="flex items-center gap-2">
            <input type="checkbox" onchange="requireUpsSineWave = this.checked; runActiveFilter();" ${(typeof requireUpsSineWave !== "undefined" && requireUpsSineWave) ? 'checked' : ''} class="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0">
            <span>Pure Sine Wave Output</span>
          </div>
        </label>
        <label class="flex items-center justify-between text-slate-300 hover:text-white cursor-pointer py-0.5 select-none">
          <div class="flex items-center gap-2">
            <input type="checkbox" onchange="requireUpsOnline = this.checked; runActiveFilter();" ${(typeof requireUpsOnline !== "undefined" && requireUpsOnline) ? 'checked' : ''} class="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-0">
            <span>Online Double-Conversion (0ms)</span>
          </div>
        </label>
        <label class="flex items-center justify-between text-slate-300 hover:text-white cursor-pointer py-0.5 select-none">
          <div class="flex items-center gap-2">
            <input type="checkbox" onchange="requireUpsEbm = this.checked; runActiveFilter();" ${(typeof requireUpsEbm !== "undefined" && requireUpsEbm) ? 'checked' : ''} class="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-0">
            <span>Extended Battery (EBM) Support</span>
          </div>
        </label>
      </div>
    </div>
  `;
}

function buildPdusSidebar(container, baseSet) {
  const vendors = [...new Set(baseSet.map(a => (a.vendor || '').trim()).filter(Boolean))].sort();

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
                  <input type="checkbox" onchange="toggleFilterItem('accVendor', '${v}')" ${isChecked ? 'checked' : ''} class="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-0">
                  <span>${v}</span>
                </div>
                <span class="text-[10px] font-mono text-slate-500">${count}</span>
              </label>
            `;
          }).join('')}
        </div>
      </div>

      <div class="pt-3 border-t border-slate-800">
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Input Voltage</span>
        <select onchange="selectedUpsVoltage = this.value; runActiveFilter();" class="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-sky-500">
          <option value="all" ${(typeof selectedUpsVoltage !== "undefined" && selectedUpsVoltage === 'all') ? 'selected' : ''}>All Voltages</option>
          <option value="120" ${(typeof selectedUpsVoltage !== "undefined" && selectedUpsVoltage === '120') ? 'selected' : ''}>120V AC (15A / 20A)</option>
          <option value="240" ${(typeof selectedUpsVoltage !== "undefined" && selectedUpsVoltage === '240') ? 'selected' : ''}>208V / 240V AC (30A L6-30P)</option>
        </select>
      </div>

      <div class="pt-3 border-t border-slate-800">
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Form Factor</span>
        <select onchange="selectedAccMounting = this.value; runActiveFilter();" class="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-sky-500">
          <option value="all" ${(typeof selectedAccMounting !== "undefined" && selectedAccMounting === 'all') ? 'selected' : ''}>All Form Factors</option>
          <option value="0U" ${(typeof selectedAccMounting !== "undefined" && selectedAccMounting === '0U') ? 'selected' : ''}>0U Vertical High-Density</option>
          <option value="Rack" ${(typeof selectedAccMounting !== "undefined" && selectedAccMounting === 'Rack') ? 'selected' : ''}>1U/2U Horizontal Rackmount</option>
        </select>
      </div>
    </div>
  `;
}

function buildCablingSidebar(container, baseSet) {
  const vendors = [...new Set(baseSet.map(c => (c.vendor || '').trim()).filter(Boolean))];
  const ratings = [
    { id: "CMP", label: "Plenum (CMP)" },
    { id: "CMR", label: "Riser (CMR)" },
    { id: "OSP", label: "Outdoor / Direct Burial (OSP)" },
    { id: "Cat6A", label: "10G Cat6A Standard" },
    { id: "Cat6", label: "Gigabit Cat6 Standard" }
  ];

  container.innerHTML = `
    <div class="space-y-4 text-xs">
      <div>
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Manufacturer</span>
        <div class="space-y-1">
          ${vendors.map(v => {
            const isChecked = (typeof selectedAccVendors !== "undefined" && selectedAccVendors.includes(v));
            const count = baseSet.filter(c => (c.vendor || '').includes(v)).length;
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
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Rating & Standard</span>
        <div class="space-y-1">
          ${ratings.map(r => {
            const isChecked = (typeof selectedCableRatings !== "undefined" && selectedCableRatings.includes(r.id)) || (typeof selectedAccTypes !== "undefined" && selectedAccTypes.includes(r.id));
            const count = baseSet.filter(c => c.rating === r.id || c.standard === r.id || (c.jacketType || '').includes(r.id)).length;
            return `
              <label class="flex items-center justify-between text-slate-300 hover:text-white cursor-pointer py-0.5 select-none">
                <div class="flex items-center gap-2">
                  <input type="checkbox" onchange="toggleFilterItem('cableRating', '${r.id}')" ${isChecked ? 'checked' : ''} class="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-0">
                  <span>${r.label}</span>
                </div>
                <span class="text-[10px] font-mono text-slate-500">${count}</span>
              </label>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Patch Cord Length -->
      <div class="pt-3 border-t border-slate-800">
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Patch Cord Length</span>
        <div class="grid grid-cols-3 gap-1 text-[11px] font-medium font-mono">
          ${[
            { id: "all", label: "All" },
            { id: "0.5", label: "6 in" },
            { id: "1", label: "1 ft" },
            { id: "2", label: "2 ft" },
            { id: "3", label: "3 ft" },
            { id: "5", label: "5 ft" },
            { id: "7", label: "7 ft" },
            { id: "10", label: "10 ft" },
            { id: "15", label: "15+ ft" }
          ].map(p => `
            <button onclick="selectedPatchCordLength = '${p.id}'; runActiveFilter();" class="py-1 px-1 rounded-lg border text-center transition-all ${(typeof selectedPatchCordLength !== "undefined" && selectedPatchCordLength === p.id) ? 'bg-amber-600 border-amber-500 text-white font-bold shadow-sm' : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'}">
              ${p.label}
            </button>
          `).join('')}
        </div>
      </div>

      <div class="pt-3 border-t border-slate-800 space-y-1.5">
        <label class="flex items-center justify-between text-slate-300 hover:text-white cursor-pointer py-0.5 select-none">
          <div class="flex items-center gap-2">
            <input type="checkbox" onchange="requireCableShielded = this.checked; runActiveFilter();" ${(typeof requireCableShielded !== "undefined" && requireCableShielded) ? 'checked' : ''} class="rounded border-slate-700 bg-slate-900 text-teal-500 focus:ring-0">
            <span>Shielded (F/UTP / STP / OAS)</span>
          </div>
        </label>
        <label class="flex items-center justify-between text-slate-300 hover:text-white cursor-pointer py-0.5 select-none">
          <div class="flex items-center gap-2">
            <input type="checkbox" onchange="requireEtherlighting = this.checked; runActiveFilter();" ${(typeof requireEtherlighting !== "undefined" && requireEtherlighting) ? 'checked' : ''} class="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-0">
            <span>Etherlighting™ Translucent Boot</span>
          </div>
        </label>
      </div>
    </div>
  `;
}

function buildPathwaysSidebar(container, baseSet) {
  const vendors = [...new Set(baseSet.map(a => (a.vendor || '').trim()).filter(Boolean))];

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