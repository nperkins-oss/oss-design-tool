// ==========================================
// CARD RENDERERS (NetSelect Enterprise)
// Renders individual hardware cards across all domains
// ==========================================

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

  const isMGig = checkSwitchMultiGig(sw);
  const isShallow = sw.shallowDepth === true || (sw.depthInches > 0 && sw.depthInches <= 12.0);
  const isDin = sw.isDinMounted === true || (sw.mounting && sw.mounting.includes("DIN"));

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
              <span class="font-bold text-white">${escapeHTML(displayLoc)}</span>
              <span class="font-mono text-[10px] ${portOverload ? 'text-rose-400 font-bold' : 'text-slate-400'}">
                ${a.usedDownlinkPorts}/${a.totalPorts} Ports
              </span>
            </div>
            ${a.totalPoEBudget > 0 ? `
              <div class="flex justify-between items-center text-[10px]">
                <span class="text-slate-500">PoE (+${typeof extraHeadroomPercent !== 'undefined' ? extraHeadroomPercent : 20}% Buffer):</span>
                <span class="font-mono font-bold ${poeOverload ? 'text-rose-400' : 'text-amber-300'}">
                  ${a.consumedPoEWatts}W / ${a.totalPoEBudget}W ${a.secondaryPsuInstalled ? '<span class="text-[9px] text-emerald-400 font-semibold">(2nd PSU)</span>' : ''}
                </span>
              </div>
            ` : ''}
            ${a.alerts.length > 0 ? `
              <div class="text-[9px] text-rose-400 font-medium truncate" title="${escapeHTML(a.alerts[0])}">
                ⚠️ ${escapeHTML(a.alerts[0])}
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
              <span class="badge-chip border ${vendorColor}">${escapeHTML(sw.vendor)}</span>
              ${roleBadge}
              <span class="badge-chip border border-slate-700 bg-slate-800 text-slate-300">${sw.ports} Ports</span>
              ${sw.stacking ? '<span class="badge-chip border border-indigo-500/40 bg-indigo-500/10 text-indigo-300">Stackable</span>' : ''}
              ${isShallow ? '<span class="badge-chip border border-sky-500/40 bg-sky-500/10 text-sky-300">Shallow &le;12"</span>' : ''}
              ${sw.dualPsu ? '<span class="badge-chip border border-indigo-500/40 bg-indigo-500/10 text-indigo-300">Dual PSU</span>' : ''}
              ${isDin ? '<span class="badge-chip border border-amber-500/40 bg-amber-500/10 text-amber-300">DIN-Mount</span>' : ''}
              ${isMGig ? '<span class="badge-chip border border-teal-500/40 bg-teal-500/10 text-teal-300">Multi-Gig</span>' : ''}
              ${sw.perpetualPoE ? '<span class="badge-chip border border-emerald-500/40 bg-emerald-500/10 text-emerald-300">Continuous PoE</span>' : ''}
              ${sw.substationCertified ? '<span class="badge-chip border border-amber-500/40 bg-amber-500/10 text-amber-300">IEC 61850-3</span>' : ''}
              ${sw.taa ? '<span class="badge-chip border border-sky-500/40 bg-sky-500/10 text-sky-300">TAA/NDAA</span>' : ''}
            </div>
            <h3 class="font-bold text-base text-white group-hover:text-brand-400 transition-colors">${escapeHTML(sw.model)}</h3>
            <span class="text-[11px] font-mono text-slate-400">SKU: ${escapeHTML(sw.sku)}</span>
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
            <span class="text-white font-semibold font-mono text-[11px]">${escapeHTML(sw.portFormFactorSummary)}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-slate-400 font-medium">Uplink Architecture:</span>
            ${hasModularBay ? `
              <select id="sled-${sw.id}" class="bg-slate-900 border border-brand-500/40 text-brand-300 text-[10px] font-mono rounded px-1.5 py-0.5 focus:outline-none">
                ${sw.modularUplink.supportedModules.map(mSku => {
                  const mod = (typeof MODULAR_UPLINK_CATALOG !== "undefined") ? MODULAR_UPLINK_CATALOG[mSku] : null;
                  return `<option value="${escapeHTML(mSku)}" ${mSku === sw.modularUplink.defaultModuleSku ? 'selected' : ''}>${mod ? `${escapeHTML(mod.name)} (+$${mod.msrp})` : escapeHTML(mSku)}</option>`;
                }).join("")}
              </select>
            ` : `<span class="text-indigo-300 font-semibold font-mono text-[11px]">${escapeHTML(sw.uplinksSummary)}</span>`}
          </div>

          ${hasLicenseOption && typeof FEATURE_LICENSE_CATALOG !== "undefined" ? `
            <div class="pt-2 border-t border-slate-800/80 space-y-1">
              <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Add Feature Licenses:</span>
              <div class="space-y-1 bg-slate-900/60 p-2 rounded-lg border border-slate-855">
                ${sw.featureLicense.supportedLicenses.map(lSku => {
                  const lic = FEATURE_LICENSE_CATALOG[lSku];
                  if (!lic) return '';
                  return `
                    <label class="flex items-center justify-between text-[11px] text-slate-300 cursor-pointer hover:text-white">
                      <div class="flex items-center gap-1.5">
                        <input type="checkbox" name="featLic-${sw.id}" value="${escapeHTML(lSku)}" class="rounded border-slate-700 bg-slate-950 text-teal-500 cursor-pointer">
                        <span>${escapeHTML(lic.name)}</span>
                      </div>
                      <span class="font-mono text-emerald-400 font-semibold">+$${lic.msrp.toLocaleString()}</span>
                    </label>
                  `;
                }).join('')}
              </div>
            </div>
          ` : ''}

          ${sw.dualPsu && sw.psuSku && typeof POWER_SUPPLY_CATALOG !== "undefined" && POWER_SUPPLY_CATALOG[sw.psuSku] ? `
            <div class="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <label class="flex items-center gap-1.5 text-slate-300 cursor-pointer hover:text-white">
                <input type="checkbox" id="psuRedundant-${sw.id}" class="rounded border-slate-700 bg-slate-950 text-indigo-500 cursor-pointer">
                <span class="font-medium text-[11px]">Add 2nd Redundant Power Supply</span>
              </label>
              <span class="font-mono text-emerald-400 font-semibold">+$${POWER_SUPPLY_CATALOG[sw.psuSku].msrp.toLocaleString()}</span>
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
          <div><span class="text-[10px] text-slate-500 block uppercase font-medium">Depth</span><span class="font-mono font-semibold ${isShallow ? 'text-sky-300' : 'text-slate-400'}">${sw.depthInches}"</span></div>
        </div>

        <div class="space-y-1 mb-3">
          ${(sw.keyFeatures || []).map(f => `
            <div class="text-[11px] text-slate-300 flex items-center gap-1.5">
              <i data-lucide="check" class="w-3 h-3 text-emerald-400 shrink-0"></i>
              <span>${escapeHTML(f)}</span>
            </div>
          `).join("")}
        </div>
      </div>

      <div class="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
        <button onclick="toggleCompareItem('${sw.id}')" class="px-2.5 py-1.5 rounded-lg border ${isCompared ? 'border-brand-500 bg-brand-500/20 text-brand-300' : 'border-slate-700 bg-slate-800 text-slate-300'} text-xs font-medium flex items-center gap-1 shrink-0">
          <i data-lucide="${isCompared ? 'check-square' : 'plus-square'}" class="w-3.5 h-3.5"></i>
          <span>${isCompared ? 'Compared' : 'Compare'}</span>
        </button>

        <select id="targetLocSelect-${sw.id}" onchange="if(this.value==='new_location') handleLocationDropdownChange(this)" class="bg-slate-950 border border-slate-700 text-slate-300 text-[11px] font-bold rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-500 max-w-[130px] truncate" title="Destination Location / Cabinet">
          ${allLocations.map(loc => `
            <option value="${escapeHTML(loc)}" ${loc === defaultLoc ? 'selected' : ''}>${escapeHTML(loc)}</option>
          `).join('')}
          <option value="new_location">+ New Location...</option>
        </select>

        <button onclick="handleAddSwitchToBOM('${sw.id}')" class="flex-1 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md">
          <i data-lucide="plus" class="w-3.5 h-3.5"></i>
          <span>Add Switch</span>
        </button>
      </div>
    </div>
  `;
}

function renderFirewallCard(fw) {
  const isCompared = comparisonList.includes(fw.sku);
  const allLocations = typeof FacilityStore !== "undefined" ? FacilityStore.getLocationNames(true) : ["Unassigned", "MDF • Rack-1"];
  const safeVendor = escapeHTML(fw.vendor || "");
  const safeCategory = escapeHTML((fw.category || '').replace('_', ' '));
  const safeModel = escapeHTML(fw.model || "");
  const safeSku = escapeHTML(fw.sku || "");

  return `
    <div class="bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all rounded-2xl p-4 flex flex-col justify-between shadow-md">
      <div>
        <div class="flex items-start justify-between gap-2 mb-2">
          <div>
            <div class="flex items-center gap-1.5 mb-1.5 flex-wrap">
              <span class="badge-chip border border-rose-500/30 bg-rose-500/10 text-rose-400 font-bold">${safeVendor}</span>
              <span class="badge-chip border border-slate-700 bg-slate-800 text-slate-300 uppercase">${safeCategory}</span>
              ${fw.cellularFailover || (fw.keyFeatures || []).some(k => k.toLowerCase().includes("lte") || k.toLowerCase().includes("5g")) ? '<span class="badge-chip border border-amber-500/30 bg-amber-500/10 text-amber-300">LTE / 5G Failover</span>' : ''}
              ${fw.ports ? `<span class="badge-chip border border-slate-700 bg-slate-800 text-slate-300">${fw.ports}x Interfaces</span>` : ''}
              ${(fw.interfaces || '').includes('10G') || (fw.wanPorts || '').includes('10G') ? '<span class="badge-chip border border-indigo-500/40 bg-indigo-500/10 text-indigo-300">10G SFP+ WAN</span>' : ''}
              ${fw.dualPsu ? '<span class="badge-chip border border-indigo-500/40 bg-indigo-500/10 text-indigo-300">Dual PSU</span>' : ''}
              ${fw.rackUnits ? `<span class="badge-chip border border-slate-700 bg-slate-800 text-slate-300">${fw.rackUnits}U Rackmount</span>` : ''}
            </div>
            <h3 class="font-bold text-base text-white">${safeModel}</h3>
            <span class="text-[11px] font-mono text-slate-400">SKU: ${safeSku}</span>
          </div>
          <div class="text-right">
            <span class="text-xs text-slate-400 block">Est. MSRP</span>
            <span class="font-mono text-base font-bold text-emerald-400">$${(fw.msrp || 0).toLocaleString()}</span>
          </div>
        </div>

        <div class="bg-slate-950 p-2.5 rounded-xl border border-slate-800 mb-3 space-y-1.5 text-xs font-mono">
          <div class="flex justify-between"><span class="text-slate-500">Stateful Routing:</span><span class="text-white font-bold">${escapeHTML(fw.statefulThroughput || '1.0 Gbps')}</span></div>
          <div class="flex justify-between"><span class="text-slate-500">Threat / IPS:</span><span class="text-rose-300 font-bold">${escapeHTML(fw.threatThroughput || '500 Mbps')}</span></div>
          <div class="flex justify-between"><span class="text-slate-500">Site-to-Site VPN:</span><span class="text-indigo-300 font-bold">${escapeHTML(fw.vpnThroughput || '250 Mbps')}</span></div>
          <div class="flex justify-between"><span class="text-slate-500">Interfaces:</span><span class="text-slate-200">${escapeHTML(fw.interfaces || `${fw.ports || 4}x GbE RJ45`)}</span></div>
        </div>
      </div>

      <div class="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
        <button onclick="toggleCompareItem('${safeSku}')" class="px-2.5 py-1.5 rounded-lg border ${isCompared ? 'border-brand-500 bg-brand-500/20 text-brand-300' : 'border-slate-700 bg-slate-800 text-slate-300'} text-xs font-medium flex items-center gap-1 shrink-0">
          <i data-lucide="${isCompared ? 'check-square' : 'plus-square'}" class="w-3.5 h-3.5"></i>
        </button>
        <select id="targetFwLocSelect-${safeSku}" onchange="if(this.value==='new_location') handleLocationDropdownChange(this)" class="bg-slate-950 border border-slate-700 text-slate-300 text-[11px] font-bold rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-500 max-w-[130px] truncate" title="Destination Location">
          ${allLocations.map(loc => `<option value="${escapeHTML(loc)}">${escapeHTML(loc)}</option>`).join('')}
          <option value="new_location">+ New Location...</option>
        </select>
        <button onclick="handleAddFirewallToBOM('${safeSku}')" class="flex-1 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md">
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

  const safeSpeed = escapeHTML(opt.speed || "");
  const safeMedium = escapeHTML((opt.medium || '').toUpperCase());
  const safeVendor = escapeHTML(opt.vendor || "");
  const safeName = escapeHTML(opt.name || "");
  const safeSku = escapeHTML(opt.sku || "");

  return `
    <div class="bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all rounded-2xl p-4 flex flex-col justify-between shadow-md">
      <div>
        <div class="flex items-start justify-between gap-2 mb-2">
          <div>
            <div class="flex items-center gap-1.5 mb-1.5 flex-wrap">
              <span class="badge-chip border ${badgeColor} font-bold">${safeSpeed}</span>
              <span class="badge-chip border border-slate-700 bg-slate-800 text-slate-300 uppercase">${safeMedium}</span>
              ${opt.formFactor ? `<span class="badge-chip border border-slate-700 bg-slate-800 text-slate-300 font-mono">${escapeHTML(opt.formFactor)}</span>` : ''}
              <span class="badge-chip border border-slate-700 bg-slate-800 text-slate-300">${safeVendor}</span>
              ${opt.industrial ? '<span class="badge-chip border border-amber-500/40 bg-amber-500/10 text-amber-300">Industrial</span>' : ''}
            </div>
            <h3 class="font-bold text-sm text-white">${safeName}</h3>
            <span class="text-[11px] font-mono text-slate-400">SKU: ${safeSku}</span>
          </div>
          <div class="text-right">
            <span class="text-xs text-slate-400 block">Unit MSRP</span>
            <span class="font-mono text-sm font-bold text-emerald-400">$${(opt.msrp || 0).toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div class="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
        <div class="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1">
          <span class="text-[10px] text-slate-500 font-mono">${isStacking ? 'CABLES:' : isDac ? 'DAC:' : 'OPTICS:'}</span>
          <input type="number" id="opt-qty-${safeSku}" min="1" max="48" value="${defaultQty}" class="w-10 bg-transparent text-xs text-white font-mono font-bold focus:outline-none text-right" />
        </div>
        <button onclick="addOpticsToBOM('${safeSku}', '${safeName}', ${opt.msrp || 0}, parseInt(document.getElementById('opt-qty-${safeSku}')?.value) || ${defaultQty}, '${safeVendor}')" class="flex-1 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md">
          <i data-lucide="plus" class="w-3.5 h-3.5"></i>
          <span>${isStacking ? 'Add Stacking Cable' : isDac ? 'Add DAC Cable' : 'Add Transceivers'}</span>
        </button>
      </div>
    </div>
  `;
}

function renderWirelessCard(radio) {
  const isCompared = comparisonList.includes(radio.id);
  const throughput = radio.throughput || (radio.throughputGbps ? `${radio.throughputGbps} Gbps` : radio.maxThroughput) || "1.0+ Gbps";
  const distance = radio.distanceKm || radio.rangeKm || radio.maxRangeKm || "N/A";
  const watts = radio.powerConsumptionWatts || radio.maxPowerWatts || radio.powerWatts || 24;
  const standard = radio.poeStandard || (radio.poeStandardsSupported && radio.poeStandardsSupported[0]) || (watts > 30 ? "802.3bt" : "802.3at");

  const safeVendor = escapeHTML(radio.vendor || "");
  const safeFreq = escapeHTML(radio.frequency || radio.band || "");
  const safeTopology = escapeHTML(radio.topology || radio.type || "");
  const safeModel = escapeHTML(radio.model || "");
  const safeSku = escapeHTML(radio.sku || "");
  const safeId = escapeHTML(radio.id || "");

  return `
    <div class="bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all rounded-2xl p-4 flex flex-col justify-between shadow-md">
      <div>
        <div class="flex items-start justify-between gap-2 mb-2">
          <div>
            <div class="flex items-center gap-1.5 mb-1.5 flex-wrap">
              <span class="badge-chip border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-bold">${safeVendor}</span>
              <span class="badge-chip border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 font-bold">${safeFreq}</span>
              <span class="badge-chip border border-slate-700 bg-slate-800 text-slate-300 font-mono">${safeTopology}</span>
              ${radio.frequency && radio.frequency.includes("5 GHz") ? '<span class="badge-chip border border-sky-500/30 bg-sky-500/10 text-sky-300">5GHz Failover</span>' : ''}
              ${radio.maxStations > 1 ? `<span class="badge-chip border border-purple-500/30 bg-purple-500/10 text-purple-300 font-bold">${radio.maxStations} Clients</span>` : ''}
              ${radio.antennaGainDbi ? `<span class="badge-chip border border-teal-500/30 bg-teal-500/10 text-teal-300">${radio.antennaGainDbi} dBi</span>` : ''}
            </div>
            <h3 class="font-bold text-base text-white">${safeModel}</h3>
            <span class="text-[11px] font-mono text-slate-400">SKU: ${safeSku}</span>
          </div>
          <div class="text-right">
            <span class="text-xs text-slate-400 block">Single Radio</span>
            <span class="font-mono text-base font-bold text-emerald-400">$${(radio.msrp || 0).toLocaleString()}</span>
          </div>
        </div>

        <div class="bg-slate-950 p-2.5 rounded-xl border border-slate-800 mb-2.5 text-xs font-mono space-y-1">
          <div class="flex justify-between"><span class="text-slate-500">Max Throughput:</span><span class="text-emerald-400 font-bold">${escapeHTML(throughput)}</span></div>
          <div class="flex justify-between"><span class="text-slate-500">Max Distance:</span><span class="text-slate-200 font-bold">${escapeHTML(distance)} km</span></div>
          <div class="flex justify-between"><span class="text-slate-500">Power Consumption:</span><span class="text-amber-300 font-bold">${watts} W (${escapeHTML(standard)})</span></div>
        </div>

        <div class="bg-slate-950/60 p-2.5 rounded-xl border border-slate-855 mb-3 space-y-1.5 text-xs">
          ${radio.precisionMountSku ? `
            <label class="flex items-center justify-between text-slate-300 cursor-pointer hover:text-white">
              <div class="flex items-center gap-1.5">
                <input type="checkbox" id="wl-prec-${safeId}" checked class="rounded border-slate-700 bg-slate-950 text-indigo-500" />
                <span class="text-[11px]">Precision Alignment Bracket</span>
              </div>
              <span class="font-mono text-slate-400">+$99</span>
            </label>
          ` : ''}
          ${radio.surgeSku ? `
            <label class="flex items-center justify-between text-slate-300 cursor-pointer hover:text-white">
              <div class="flex items-center gap-1.5">
                <input type="checkbox" id="wl-surge-${safeId}" checked class="rounded border-slate-700 bg-slate-950 text-indigo-500" />
                <span class="text-[11px]">Outdoor PoE Surge Suppressor</span>
              </div>
              <span class="font-mono text-slate-400">+$19</span>
            </label>
          ` : ''}
        </div>
      </div>

      <div class="pt-3 border-t border-slate-800 space-y-2">
        <div class="flex items-center gap-2">
          <button onclick="toggleCompareItem('${safeId}')" class="px-2.5 py-1.5 rounded-lg border ${isCompared ? 'border-brand-500 bg-brand-500/20 text-brand-300' : 'border-slate-700 bg-slate-800 text-slate-300'} text-xs font-medium flex items-center gap-1 shrink-0">
            <i data-lucide="${isCompared ? 'check-square' : 'plus-square'}" class="w-3.5 h-3.5"></i>
          </button>
          <button onclick="addWirelessToBOM('${safeId}', false)" class="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold">
            Single Unit ($${(radio.msrp || 0).toLocaleString()})
          </button>
        </div>
        <button onclick="addWirelessToBOM('${safeId}', true)" class="w-full py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-bold shadow flex items-center justify-center gap-1.5">
          <i data-lucide="split" class="w-3.5 h-3.5"></i> Add Matched 2-Radio Link Pair ($${((radio.msrp || 0) * 2).toLocaleString()})
        </button>
      </div>
    </div>
  `;
}

function renderAccessoryCard(acc) {
  const allLocations = typeof FacilityStore !== "undefined" ? FacilityStore.getLocationNames(true) : ["Unassigned", "MDF • Rack-1"];
  const safeVendor = escapeHTML(acc.vendor || "");
  const safeType = escapeHTML((acc.type || acc.category || 'Accessory').replace('_', ' '));
  const safeModel = escapeHTML(acc.model || acc.name || "");
  const safeSku = escapeHTML(acc.sku || "");

  return `
    <div class="bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all rounded-2xl p-4 flex flex-col justify-between shadow-md">
      <div>
        <div class="flex items-start justify-between gap-2 mb-2">
          <div>
            <div class="flex items-center gap-1.5 mb-1.5 flex-wrap">
              <span class="badge-chip border border-amber-500/30 bg-amber-500/10 text-amber-400 font-bold">${safeVendor}</span>
              <span class="badge-chip border border-slate-700 bg-slate-800 text-slate-300 uppercase">${safeType}</span>
              ${acc.mounting ? `<span class="badge-chip border border-slate-700 bg-slate-800 text-slate-400 font-mono">${escapeHTML(acc.mounting)}</span>` : ''}
              ${acc.rackUnits ? `<span class="badge-chip border border-indigo-500/40 bg-indigo-500/10 text-indigo-300">${acc.rackUnits}U Rack</span>` : ''}
            </div>
            <h3 class="font-bold text-base text-white">${safeModel}</h3>
            <span class="text-[11px] font-mono text-slate-400">SKU: ${safeSku}</span>
          </div>
          <div class="text-right">
            <span class="text-xs text-slate-400 block">Unit MSRP</span>
            <span class="font-mono text-base font-bold text-emerald-400">$${(acc.msrp || 0).toLocaleString()}</span>
          </div>
        </div>

        <p class="text-xs text-slate-300 mb-3 line-clamp-2">${escapeHTML(acc.description || 'Hardware accessory & interconnect adapter.')}</p>
      </div>

      <div class="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
        <select id="targetAccLocSelect-${safeSku}" onchange="if(this.value==='new_location') handleLocationDropdownChange(this)" class="bg-slate-950 border border-slate-700 text-slate-300 text-[11px] font-bold rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-500 max-w-[130px] truncate" title="Destination Location">
          ${allLocations.map(loc => `<option value="${escapeHTML(loc)}">${escapeHTML(loc)}</option>`).join('')}
          <option value="new_location">+ New Location...</option>
        </select>
        <button onclick="handleAddCatalogCardToBOM('accessories', '${safeSku}', '${safeSku}', '${safeModel}', ${acc.msrp || 0}, '${safeVendor}')" class="flex-1 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md">
          <i data-lucide="plus" class="w-3.5 h-3.5"></i>
          <span>Add Accessory</span>
        </button>
      </div>
    </div>
  `;
}

function handleAddCatalogCardToBOM(mode, safeId, safeSku, safeModel, msrp, safeVendor) {
  const selectEl = document.getElementById(`targetLocSelect-${safeId}`) || document.getElementById(`targetAccLocSelect-${safeSku}`);
  const targetLoc = selectEl ? selectEl.value : null;

  const performAdd = (loc) => {
    if (mode === "servers") {
      if (typeof addServerToBOM === "function") addServerToBOM(safeId, loc);
    } else if (mode === "cameras") {
      if (typeof addCameraToBOM === "function") addCameraToBOM(safeId, loc);
    } else if (mode === "access_control") {
      if (typeof addAccessDeviceToBOM === "function") addAccessDeviceToBOM(safeId, loc);
    } else if (mode === "wireless") {
      if (typeof addWirelessToBOM === "function") addWirelessToBOM(safeId, loc);
      else addOpticsToBOM(safeSku, safeModel, msrp, 1, safeVendor);
    } else {
      addOpticsToBOM(safeSku, safeModel, msrp, 1, safeVendor);
    }
  };

  if (targetLoc === "new_location" && selectEl) {
    handleLocationDropdownChange(selectEl, (createdLoc) => {
      performAdd(createdLoc);
    });
  } else {
    performAdd(targetLoc);
  }
}

function renderCardByDomain(item, mode) {
  const isCompared = typeof comparisonList !== "undefined" && comparisonList.includes(item.id || item.sku);
  const allLocations = typeof FacilityStore !== "undefined" ? FacilityStore.getLocationNames(true) : ["Unassigned", "MDF • Rack-1"];
  const safeVendor = escapeHTML(item.vendor || 'Generic');
  const safeType = escapeHTML((item.type || item.category || mode || 'Hardware').replace(/_/g, ' '));
  const safeModel = escapeHTML(item.model || item.name || "");
  const safeSku = escapeHTML(item.sku || item.id || "");
  const safeId = escapeHTML(item.id || item.sku || "");

  // Domain-specific click handler routing through handleAddCatalogCardToBOM
  let addActionCode = `handleAddCatalogCardToBOM('${mode}', '${safeId}', '${safeSku}', '${safeModel}', ${item.msrp || 0}, '${safeVendor}')`;

  // Domain-specific telemetry pills
  let specStripHtml = "";
  if (item.category === "servers" || item.role === "Server") {
    specStripHtml = `
      <div class="bg-slate-950 p-2.5 rounded-xl border border-slate-800 mb-2.5 text-xs font-mono space-y-1">
        <div class="flex justify-between"><span class="text-slate-500">Video Storage:</span><span class="text-emerald-400 font-bold">${item.usableStorageTb || 0} TB Net (${item.raidLevel || 'RAID'})</span></div>
        <div class="flex justify-between"><span class="text-slate-500">Ingest Throughput:</span><span class="text-sky-300 font-bold">${item.maxIngestBandwidthMbps || 500} Mbps (${item.supportedCameras || 64} Cams)</span></div>
        <div class="flex justify-between"><span class="text-slate-500">Dual Hot-Swap PSU:</span><span class="text-amber-300 font-bold">${item.baseWatts || 300}W Base (${item.psuWattage || 800}W Plat)</span></div>
      </div>
      ${item.hostedRoles ? `
        <div class="flex flex-wrap gap-1 mb-2.5">
          ${item.hostedRoles.map(r => `<span class="text-[9.5px] font-mono px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/30 text-purple-300">${escapeHTML(r)}</span>`).join('')}
        </div>
      ` : ''}
    `;
  } else if (item.category === "cameras" || item.role === "Camera") {
    specStripHtml = `
      <div class="bg-slate-950 p-2.5 rounded-xl border border-slate-800 mb-2.5 text-xs font-mono space-y-1">
        <div class="flex justify-between"><span class="text-slate-500">Stream Bitrate:</span><span class="text-sky-300 font-bold">${item.streamBitrateMbps || 4} Mbps (${escapeHTML(item.compression || 'H.265')})</span></div>
        <div class="flex justify-between"><span class="text-slate-500">PoE Power:</span><span class="text-amber-300 font-bold">${item.powerConsumptionWatts || 8}W (${escapeHTML(item.poeStandard || '802.3af')})</span></div>
        <div class="flex justify-between"><span class="text-slate-500">Low-Light IR:</span><span class="text-slate-200 font-bold">${item.irRangeMeters ? `${item.irRangeMeters}m Night Vision` : 'Visual Only'}</span></div>
      </div>
    `;
  } else if (item.category === "access_control" || item.role === "Access Control") {
    specStripHtml = `
      <div class="bg-slate-950 p-2.5 rounded-xl border border-slate-800 mb-2.5 text-xs font-mono space-y-1">
        <div class="flex justify-between"><span class="text-slate-500">Door Capacity:</span><span class="text-emerald-400 font-bold">${item.doorCapacity || 2} Doors (${item.readerCapacity || 4} Readers)</span></div>
        <div class="flex justify-between"><span class="text-slate-500">Power Delivery:</span><span class="text-amber-300 font-bold">${item.powerConsumptionWatts || 15}W (${item.powerSource === 'poe_switch' ? 'PoE+ 802.3at' : '12-24VDC'})</span></div>
        <div class="flex justify-between"><span class="text-slate-500">Protocols:</span><span class="text-slate-200 font-bold">${(item.readerProtocols || ['OSDP v2']).join(', ')}</span></div>
      </div>
    `;
  }

  return `
    <div class="bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all rounded-2xl p-4 flex flex-col justify-between shadow-md">
      <div>
        <div class="flex items-start justify-between gap-2 mb-2">
          <div>
            <div class="flex items-center gap-1.5 mb-1.5 flex-wrap">
              <span class="badge-chip border border-brand-500/30 bg-brand-500/10 text-brand-300 font-bold">${safeVendor}</span>
              <span class="badge-chip border border-slate-700 bg-slate-800 text-slate-300 uppercase">${safeType}</span>
              ${item.formFactor ? `<span class="badge-chip border border-slate-700 bg-slate-800 text-slate-400 font-mono">${escapeHTML(item.formFactor)}</span>` : ''}
              ${item.rackUnits ? `<span class="badge-chip border border-indigo-500/40 bg-indigo-500/10 text-indigo-300">${item.rackUnits}U Rack</span>` : ''}
              ${item.resolution ? `<span class="badge-chip border border-teal-500/40 bg-teal-500/10 text-teal-300">${escapeHTML(item.resolution)}</span>` : ''}
              ${item.dualPsu ? `<span class="badge-chip border border-amber-500/30 bg-amber-500/10 text-amber-300 font-bold">Dual PSU</span>` : ''}
            </div>
            <h3 class="font-bold text-base text-white">${safeModel}</h3>
            <span class="text-[11px] font-mono text-slate-400">SKU: ${safeSku}</span>
          </div>
          <div class="text-right">
            <span class="text-xs text-slate-400 block">Est. MSRP</span>
            <span class="font-mono text-base font-bold text-emerald-400">$${(item.msrp || 0).toLocaleString()}</span>
          </div>
        </div>

        ${specStripHtml}

        <p class="text-xs text-slate-300 mb-3 line-clamp-2">${escapeHTML(item.description || (item.keyFeatures ? item.keyFeatures[0] : 'Enterprise hardware specification and sizing asset.'))}</p>
      </div>

      <div class="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
        <button onclick="toggleCompareItem('${safeId}')" class="px-2.5 py-1.5 rounded-lg border ${isCompared ? 'border-brand-500 bg-brand-500/20 text-brand-300' : 'border-slate-700 bg-slate-800 text-slate-300'} text-xs font-medium flex items-center gap-1 shrink-0">
          <i data-lucide="${isCompared ? 'check-square' : 'plus-square'}" class="w-3.5 h-3.5"></i>
        </button>

        <select id="targetLocSelect-${safeId}" onchange="if(this.value==='new_location') handleLocationDropdownChange(this)" class="bg-slate-950 border border-slate-700 text-slate-300 text-[11px] font-bold rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-500 max-w-[130px] truncate" title="Destination Location">
          ${allLocations.map(loc => `<option value="${escapeHTML(loc)}">${escapeHTML(loc)}</option>`).join('')}
          <option value="new_location">+ New Location...</option>
        </select>

        <button onclick="${addActionCode}" class="flex-1 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md">
          <i data-lucide="plus" class="w-3.5 h-3.5"></i>
          <span>Add to Quote</span>
        </button>
      </div>
    </div>
  `;
}

// Window Compatibility Exports
window.handleAddSwitchToBOM = handleAddSwitchToBOM;
window.handleAddFirewallToBOM = handleAddFirewallToBOM;
window.handleAddCatalogCardToBOM = handleAddCatalogCardToBOM;
window.renderSwitchCard = renderSwitchCard;
window.renderFirewallCard = renderFirewallCard;
if (typeof renderOpticsCard !== "undefined") window.renderOpticsCard = renderOpticsCard;
if (typeof renderWirelessCard !== "undefined") window.renderWirelessCard = renderWirelessCard;
if (typeof renderAccessoryCard !== "undefined") window.renderAccessoryCard = renderAccessoryCard;
window.renderCardByDomain = renderCardByDomain;