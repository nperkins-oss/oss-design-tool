// ==========================================
// CARD RENDERERS (NetSelect Enterprise)
// Renders individual hardware cards across all domains
// ==========================================

function openDatasheetModal(path, title, sku) {
  if (!path) {
    if (typeof showToast === 'function') showToast('No local technical datasheet on file for this model.');
    return;
  }
  const modal = document.getElementById('datasheetViewerModal');
  const iframe = document.getElementById('datasheetModalIframe');
  const titleEl = document.getElementById('datasheetModalTitle');
  const skuEl = document.getElementById('datasheetModalSkuBadge');
  const popoutBtn = document.getElementById('datasheetPopoutBtn');
  const downloadBtn = document.getElementById('datasheetDownloadBtn');

  if (titleEl) titleEl.textContent = title || 'Product Datasheet';
  if (skuEl) {
    skuEl.textContent = sku || '';
    skuEl.style.display = sku ? 'inline-block' : 'none';
  }
  if (popoutBtn) popoutBtn.href = path;
  if (downloadBtn) {
    downloadBtn.href = path;
    downloadBtn.setAttribute('download', (sku || 'datasheet') + '.pdf');
  }
  if (iframe) iframe.src = path;

  if (modal) modal.classList.remove('hidden');
  if (typeof safeCreateIcons === 'function') safeCreateIcons(modal);
}

function closeDatasheetModal() {
  const modal = document.getElementById('datasheetViewerModal');
  const iframe = document.getElementById('datasheetModalIframe');
  if (iframe) iframe.src = 'about:blank';
  if (modal) modal.classList.add('hidden');
}

function openProductImageModal(imgSrc, title, sku) {
  if (!imgSrc) return;
  const modal = document.getElementById('productImageModal');
  const imgEl = document.getElementById('productImageModalImg');
  const titleEl = document.getElementById('productImageModalTitle');
  const skuEl = document.getElementById('productImageModalSku');

  if (imgEl) imgEl.src = imgSrc;
  if (titleEl) titleEl.textContent = title || 'Product Photo';
  if (skuEl) skuEl.textContent = sku ? `SKU: ${sku}` : '';

  if (modal) modal.classList.remove('hidden');
  if (typeof safeCreateIcons === 'function') safeCreateIcons(modal);
}

function closeProductImageModal() {
  const modal = document.getElementById('productImageModal');
  const imgEl = document.getElementById('productImageModalImg');
  if (imgEl) imgEl.src = '';
  if (modal) modal.classList.add('hidden');
}

window.openDatasheetModal = openDatasheetModal;
window.closeDatasheetModal = closeDatasheetModal;
window.openProductImageModal = openProductImageModal;
window.closeProductImageModal = closeProductImageModal;

// Keyboard accessibility: dismiss open modal viewers on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' || e.key === 'Esc') {
    const dsModal = document.getElementById('datasheetViewerModal');
    if (dsModal && !dsModal.classList.contains('hidden')) {
      closeDatasheetModal();
    }
    const imgModal = document.getElementById('productImageModal');
    if (imgModal && !imgModal.classList.contains('hidden')) {
      closeProductImageModal();
    }
  }
});

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

function handleSwitchTargetLocChanged(selectEl, switchId, sku) {
  if (!selectEl) return;
  if (selectEl.value === 'new_location') {
    handleLocationDropdownChange(selectEl);
    return;
  }
  const loc = (selectEl.value || '').toLowerCase();
  const mountEl = document.getElementById(`mountSelect-${switchId}`);
  if (!mountEl) return;
  
  const isEnclosure = loc.includes('enclosure') || loc.includes('nema') || loc.includes('trove') || loc.includes('box');
  const isRack = !isEnclosure && (loc.includes('rack') || loc.includes('cabinet') || loc.includes('mdf') || loc.includes('idf'));
  const isOutdoor = loc.includes('pole') || loc.includes('outdoor') || loc.includes('exterior') || loc.includes('utility');

  if (sku && sku.includes('Pro-Max-16')) {
    if (isRack && mountEl.querySelector('option[value="UACC-Pro-Max-16-RM"]')) {
      mountEl.value = 'UACC-Pro-Max-16-RM';
    } else {
      mountEl.value = 'included';
    }
  } else if (sku === 'USW-Flex') {
    if (isEnclosure && mountEl.querySelector('option[value="3rd_party_enclosure"]')) {
      mountEl.value = '3rd_party_enclosure';
    } else if (isOutdoor && mountEl.querySelector('option[value="USW-Flex-Utility"]')) {
      mountEl.value = 'USW-Flex-Utility';
    } else if (isRack && mountEl.querySelector('option[value="UACC-Rack-Shelf-SD"]')) {
      mountEl.value = 'UACC-Rack-Shelf-SD';
    } else {
      mountEl.value = 'included';
    }
  } else if (isRack && (sku.includes('Lite') || sku.includes('Ultra') || sku.includes('Flex-Mini'))) {
    if (mountEl.querySelector('option[value="UACC-Rack-Shelf-SD"]')) {
      mountEl.value = 'UACC-Rack-Shelf-SD';
    }
  }
}
window.handleSwitchTargetLocChanged = handleSwitchTargetLocChanged;

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
  if (sw.vendor === "Cisco") vendorColor = "bg-cyan-500/10 text-cyan-400 border-cyan-500/30";
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
  const isFanless = (typeof checkSwitchFanless === "function") ? checkSwitchFanless(sw) : Boolean(sw.fanless || sw.acousticNoiseDba === 0);
  const isPoEPowered = (typeof checkSwitchPoEPowered === "function") ? checkSwitchPoEPowered(sw) : Boolean(sw.poePowered);
  const isDcPower = (typeof checkSwitchDcPower === "function") ? checkSwitchDcPower(sw) : Boolean(sw.dcPowered);
  const isL3 = (typeof checkSwitchLayer3 === "function") ? checkSwitchLayer3(sw) : Boolean(sw.layer3);
  const isOutdoor = (typeof checkSwitchFormFactor === "function") ? checkSwitchFormFactor(sw, ["outdoor"]) : Boolean(sw.outdoor);

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
        ${sw.image ? `
          <div class="mb-3 w-full h-24 bg-slate-950/70 border border-slate-800/80 rounded-xl flex items-center justify-center p-2 relative overflow-hidden group/img cursor-pointer transition-all hover:border-brand-500/40" onclick="openProductImageModal('${sw.image}', '${escapeHTML(sw.model)}', '${escapeHTML(sw.sku)}')" title="Click to view full photo">
            <img src="${sw.image}" alt="${escapeHTML(sw.model)}" class="max-h-full max-w-full object-contain filter drop-shadow(0 4px 8px rgba(0,0,0,0.7)) transition-transform duration-300 group-hover/img:scale-105" loading="lazy" />
            <div class="absolute bottom-1 right-1.5 opacity-0 group-hover/img:opacity-100 transition-opacity bg-slate-900/85 border border-slate-700/80 rounded px-1.5 py-0.5 text-[9px] text-slate-300 font-mono flex items-center gap-1">
              <i data-lucide="zoom-in" class="w-2.5 h-2.5 text-brand-400"></i> Zoom
            </div>
          </div>
        ` : ''}
        <div class="flex items-start justify-between gap-2 mb-2">
          <div>
            <div class="flex flex-wrap items-center gap-1.5 mb-1.5">
              <span class="badge-chip border ${vendorColor}">${escapeHTML(sw.vendor)}</span>
              ${roleBadge}
              <span class="badge-chip border border-slate-700 bg-slate-800 text-slate-300">${sw.ports} Ports</span>
              ${isOutdoor ? '<span class="badge-chip border border-cyan-500/40 bg-cyan-500/10 text-cyan-300 font-semibold">Outdoor IP55/NEMA</span>' : ''}
              ${isDin ? '<span class="badge-chip border border-amber-500/40 bg-amber-500/10 text-amber-300">DIN-Mount</span>' : ''}
              ${(!isDin && !isOutdoor && sw.rackUnits > 0) ? `<span class="badge-chip border border-slate-700 bg-slate-800 text-slate-300 font-mono">${sw.rackUnits}U Rack</span>` : ''}
              ${(!isDin && !isOutdoor && sw.rackUnits === 0) ? '<span class="badge-chip border border-slate-700 bg-slate-800 text-slate-300">0U Compact</span>' : ''}
              ${isL3 ? '<span class="badge-chip border border-indigo-500/40 bg-indigo-500/10 text-indigo-300">Layer 3</span>' : ''}
              ${isFanless ? '<span class="badge-chip border border-emerald-500/40 bg-emerald-500/10 text-emerald-300">Fanless (0 dB)</span>' : ''}
              ${isPoEPowered ? '<span class="badge-chip border border-sky-500/40 bg-sky-500/10 text-sky-300">PoE-Powered In</span>' : ''}
              ${(isDcPower && !sw.dualPsu) ? '<span class="badge-chip border border-amber-500/40 bg-amber-500/10 text-amber-300">DC Terminal</span>' : ''}
              ${sw.stacking ? '<span class="badge-chip border border-indigo-500/40 bg-indigo-500/10 text-indigo-300">Stackable</span>' : ''}
              ${isShallow ? '<span class="badge-chip border border-sky-500/40 bg-sky-500/10 text-sky-300">Shallow &le;12"</span>' : ''}
              ${sw.dualPsu ? '<span class="badge-chip border border-indigo-500/40 bg-indigo-500/10 text-indigo-300">Dual PSU</span>' : ''}
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

          ${(() => {
            const isPMax16 = Boolean(sw.sku && sw.sku.includes("Pro-Max-16"));
            const isFlex = Boolean(sw.sku === "USW-Flex");
            const isUltra = Boolean(sw.sku && sw.sku.includes("Ultra"));
            const isCompactDesktop = Boolean(sw.rackUnits === 0 || isFlex || isUltra || isPMax16 || (sw.sku && (sw.sku.includes("Lite") || sw.sku.includes("Flex-Mini"))));

            const defLocLower = (defaultLoc || "").toLowerCase();
            const isDefLocEnclosure = defLocLower.includes("enclosure") || defLocLower.includes("nema") || defLocLower.includes("trove") || defLocLower.includes("box");
            const isDefLocRack = !isDefLocEnclosure && (defLocLower.includes("rack") || defLocLower.includes("cabinet") || defLocLower.includes("mdf") || defLocLower.includes("idf"));
            const isDefLocOutdoor = defLocLower.includes("pole") || defLocLower.includes("outdoor") || defLocLower.includes("exterior") || defLocLower.includes("utility");

            let autoSelectedMount = "included";
            if (isPMax16 && isDefLocRack) autoSelectedMount = "UACC-Pro-Max-16-RM";
            else if (isFlex && isDefLocEnclosure) autoSelectedMount = "3rd_party_enclosure";
            else if (isFlex && isDefLocOutdoor) autoSelectedMount = "USW-Flex-Utility";
            else if (isFlex && isDefLocRack) autoSelectedMount = "UACC-Rack-Shelf-SD";

            const showMountSection = sw.mountSku || isFlex || isPMax16 || isUltra || isCompactDesktop || sw.compatibleAccessories?.some(a => a.includes("RM") || a.includes("Rail") || a.includes("Mount") || a.includes("Utility")) || (sw.depthInches && sw.depthInches >= 14);
            if (!showMountSection) return '';

            return `
              <div class="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span class="text-slate-400 font-medium flex items-center gap-1">
                  <i data-lucide="wrench" class="w-3 h-3 text-slate-500"></i> Mount Hardware:
                </span>
                <select id="mountSelect-${sw.id}" class="bg-slate-900 border border-slate-700 text-slate-200 text-[10px] font-mono rounded px-1.5 py-0.5 focus:outline-none focus:border-brand-500 max-w-[205px] truncate">
                  ${isFlex ? `
                    <option value="included" ${autoSelectedMount === 'included' ? 'selected' : ''}>Magnetic / Wall Mount (Included)</option>
                    <option value="3rd_party_enclosure" ${autoSelectedMount === '3rd_party_enclosure' ? 'selected' : ''}>Inside 3rd-Party / NEMA Enclosure ($0)</option>
                    <option value="USW-Flex-Utility" ${autoSelectedMount === 'USW-Flex-Utility' ? 'selected' : ''}>Outdoor Utility Enclosure [USW-Flex-Utility] (+$58)</option>
                    <option value="UACC-Rack-Shelf-SD" ${autoSelectedMount === 'UACC-Rack-Shelf-SD' ? 'selected' : ''}>1U Cantilever Rack Shelf [UACC-Rack-Shelf-SD] (+$49)</option>
                  ` : isPMax16 ? `
                    <option value="included" ${autoSelectedMount === 'included' ? 'selected' : ''}>Desktop / Wall Mount (Included)</option>
                    <option value="UACC-Pro-Max-16-RM" ${autoSelectedMount === 'UACC-Pro-Max-16-RM' ? 'selected' : ''}>1U Rack Mount Kit [UACC-Pro-Max-16-RM] (+$29)</option>
                  ` : isUltra ? `
                    <option value="included">Desktop / Wall Mount (Included)</option>
                    <option value="UACC-UTS">Universal Table Stand [UACC-UTS] (+$19)</option>
                    <option value="UACC-Rack-Shelf-SD">1U Cantilever Rack Shelf [UACC-Rack-Shelf-SD] (+$49)</option>
                  ` : isCompactDesktop ? `
                    <option value="included">Desktop / Wall Mount (Included)</option>
                    <option value="UACC-Rack-Shelf-SD">1U Cantilever Rack Shelf [UACC-Rack-Shelf-SD] (+$49)</option>
                  ` : `
                    <option value="included">Standard 19" Ears / Bracket (Included)</option>
                    ${(sw.vendor === 'UniFi' && (sw.mountSku === 'UACC-Rack-Rails-Slide' || sw.compatibleAccessories?.includes('UACC-Rack-Rails-Slide') || sw.depthInches >= 14)) ? `
                      <option value="UACC-Rack-Rails-Slide">UniFi Sliding Rack Rails [UACC-Rack-Rails-Slide] (+$99)</option>
                    ` : ''}
                    ${(sw.vendor === 'Juniper' && sw.depthInches >= 14) ? `
                      <option value="EX-4PST-RMK">Juniper 4-Post Adjustable Rack Mount Kit [EX-4PST-RMK] (+$95)</option>
                    ` : ''}
                  `}
                </select>
              </div>
            `;
          })()}

          ${sw.dualPsu && sw.psuSku && typeof POWER_SUPPLY_CATALOG !== "undefined" && POWER_SUPPLY_CATALOG[sw.psuSku] ? `
            <div class="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <label class="flex items-center gap-1.5 text-slate-300 cursor-pointer hover:text-white">
                <input type="checkbox" id="psuRedundant-${sw.id}" class="rounded border-slate-700 bg-slate-950 text-indigo-500 cursor-pointer">
                <span class="font-medium text-[11px]">Add 2nd Hot-Swap PSU (${POWER_SUPPLY_CATALOG[sw.psuSku].wattage || 0}W)</span>
              </label>
              <span class="font-mono text-emerald-400 font-semibold">+$${POWER_SUPPLY_CATALOG[sw.psuSku].msrp.toLocaleString()}</span>
            </div>
          ` : ''}

          ${(sw.fanSku || (sw.compatibleAccessories && sw.compatibleAccessories.includes('UACC-Fan-4020'))) ? `
            <div class="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <label class="flex items-center gap-1.5 text-slate-300 cursor-pointer hover:text-white">
                <input type="checkbox" id="fanSpare-${sw.id}" class="rounded border-slate-700 bg-slate-950 text-teal-500 cursor-pointer">
                <span class="font-medium text-[11px]">Add Hot-Swap Fan Module (UACC-Fan-4020)</span>
              </label>
              <span class="font-mono text-emerald-400 font-semibold">+$49</span>
            </div>
          ` : ''}
        </div>

        ${(sw.role === 'Access' && (sw.poeBudget > 0 || (sw.poeAfPorts || sw.poeAtPorts || sw.poeBt60Ports || sw.poeBt90Ports))) ? `
          <div class="grid grid-cols-4 gap-1.5 bg-slate-950 p-2 rounded-xl border border-slate-855 mb-2 text-center text-xs">
            <div>
              <span class="text-[9px] text-slate-500 block uppercase">PoE (af)</span>
              <span class="font-mono font-bold ${sw.poeAfPorts > 0 ? 'text-emerald-300' : 'text-slate-600'}">${sw.poeAfPorts || 0}p</span>
            </div>
            <div>
              <span class="text-[9px] text-slate-500 block uppercase">PoE+ (at)</span>
              <span class="font-mono font-bold ${sw.poeAtPorts > 0 ? 'text-sky-300' : 'text-slate-600'}">${sw.poeAtPorts || 0}p</span>
            </div>
            <div>
              <span class="text-[9px] text-slate-500 block uppercase">PoE++ (60W)</span>
              <span class="font-mono font-bold ${sw.poeBt60Ports > 0 ? 'text-indigo-300' : 'text-slate-600'}">${sw.poeBt60Ports || 0}p</span>
            </div>
            <div>
              <span class="text-[9px] text-slate-500 block uppercase">PoE+++ (90W)</span>
              <span class="font-mono font-bold ${sw.poeBt90Ports > 0 ? 'text-amber-400' : 'text-slate-600'}">${sw.poeBt90Ports || 0}p</span>
            </div>
          </div>
        ` : (sw.role === 'Access') ? `
          <div class="bg-slate-950/70 p-2 rounded-xl border border-slate-855 mb-2 flex items-center justify-between text-xs text-slate-400">
            <span class="flex items-center gap-1.5 text-slate-300 font-semibold text-[11px]">
              <i data-lucide="shield-check" class="w-3.5 h-3.5 text-slate-500"></i> Pure Data / Non-PoE Switch
            </span>
            <span class="font-mono text-[10px] text-slate-500">Low Heat &bull; High Reliability</span>
          </div>
        ` : ''}

        <div class="grid grid-cols-4 gap-1.5 bg-slate-950/70 p-2 rounded-xl border border-slate-855 mb-3 text-xs text-center">
          <div><span class="text-[9px] text-slate-500 block uppercase font-medium truncate">${sw.role === 'Access' ? (sw.poeBudget > 0 ? 'PoE Budget' : 'Power State') : 'Fabric'}</span><span class="font-mono font-bold text-amber-400">${sw.role === 'Access' ? (sw.poeBudget > 0 ? `${sw.poeBudget}W` : 'Data Only') : sw.switchingCapacity}</span></div>
          <div><span class="text-[9px] text-slate-500 block uppercase font-medium truncate">VMS Buffer</span><span class="font-mono font-bold ${sw.packetBufferMb >= 4 ? 'text-cyan-300' : 'text-slate-400'}">${sw.packetBufferMb} MB</span></div>
          <div><span class="text-[9px] text-slate-500 block uppercase font-medium truncate">Depth</span><span class="font-mono font-semibold ${isShallow ? 'text-sky-300' : 'text-slate-400'}">${sw.depthInches}"</span></div>
          <div><span class="text-[9px] text-slate-500 block uppercase font-medium truncate">Acoustics</span><span class="font-mono font-semibold ${isFanless ? 'text-emerald-300 font-bold' : 'text-slate-400'}">${isFanless ? '0 dB' : (sw.acousticNoiseDba ? `${sw.acousticNoiseDba} dBA` : 'Active')}</span></div>
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

      <div class="pt-3 border-t border-slate-800 flex items-center justify-between gap-1.5 flex-wrap sm:flex-nowrap">
        <button onclick="toggleCompareItem('${sw.id}')" class="px-2.5 py-1.5 rounded-lg border ${isCompared ? 'border-brand-500 bg-brand-500/20 text-brand-300' : 'border-slate-700 bg-slate-800 text-slate-300'} text-xs font-medium flex items-center gap-1 shrink-0">
          <i data-lucide="${isCompared ? 'check-square' : 'plus-square'}" class="w-3.5 h-3.5"></i>
          <span>${isCompared ? 'Compared' : 'Compare'}</span>
        </button>

        ${sw.datasheetPath ? `
          <button onclick="openDatasheetModal('${sw.datasheetPath}', '${escapeHTML(sw.model)}', '${escapeHTML(sw.sku)}')" class="px-2 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1 shrink-0 transition-colors" title="View Official Engineering Datasheet">
            <i data-lucide="file-text" class="w-3.5 h-3.5 text-rose-400"></i>
            <span class="text-[11px]">Datasheet</span>
          </button>
        ` : ''}

        <select id="targetLocSelect-${sw.id}" onchange="handleSwitchTargetLocChanged(this, '${sw.id}', '${sw.sku}')" class="bg-slate-950 border border-slate-700 text-slate-300 text-[11px] font-bold rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-500 max-w-[120px] truncate" title="Destination Location / Cabinet">
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

  const has25G = (fw.interfaces || '').includes('25G') || (fw.wanPorts || '').includes('25G') || (fw.uplinksSummary || '').includes('25G') || fw.maxBackboneSpeed === '25G' || fw.portSpeed === '25G';
  const hasHA = (fw.keyFeatures || []).some(k => /shadow\s*mode|high\s*availability|\bha\b|vrrp/i.test(k));
  const hasStorage = (fw.keyFeatures || []).some(k => /3\.5"|hdd|ssd|nvr|storage/i.test(k));

  return `
    <div class="bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all rounded-2xl p-4 flex flex-col justify-between shadow-md">
      <div>
        ${fw.image ? `
          <div class="mb-3 w-full h-24 bg-slate-950/70 border border-slate-800/80 rounded-xl flex items-center justify-center p-2 relative overflow-hidden group/img cursor-pointer transition-all hover:border-brand-500/40" onclick="openProductImageModal('${fw.image}', '${safeModel}', '${safeSku}')" title="Click to view full photo">
            <img src="${fw.image}" alt="${safeModel}" class="max-h-full max-w-full object-contain filter drop-shadow(0 4px 8px rgba(0,0,0,0.7)) transition-transform duration-300 group-hover/img:scale-105" loading="lazy" />
            <div class="absolute bottom-1 right-1.5 opacity-0 group-hover/img:opacity-100 transition-opacity bg-slate-900/85 border border-slate-700/80 rounded px-1.5 py-0.5 text-[9px] text-slate-300 font-mono flex items-center gap-1">
              <i data-lucide="zoom-in" class="w-2.5 h-2.5 text-brand-400"></i> Zoom
            </div>
          </div>
        ` : ''}
        <div class="flex items-start justify-between gap-2 mb-2">
          <div>
            <div class="flex items-center gap-1.5 mb-1.5 flex-wrap">
              <span class="badge-chip border border-rose-500/30 bg-rose-500/10 text-rose-400 font-bold">${safeVendor}</span>
              <span class="badge-chip border border-slate-700 bg-slate-800 text-slate-300 uppercase">${safeCategory}</span>
              ${fw.cellularFailover || (fw.keyFeatures || []).some(k => k.toLowerCase().includes("lte") || k.toLowerCase().includes("5g")) ? '<span class="badge-chip border border-amber-500/30 bg-amber-500/10 text-amber-300">LTE / 5G Failover</span>' : ''}
              ${fw.ports ? `<span class="badge-chip border border-slate-700 bg-slate-800 text-slate-300">${fw.ports}x Interfaces</span>` : ''}
              ${has25G ? '<span class="badge-chip border border-cyan-500/40 bg-cyan-500/10 text-cyan-300 font-bold">25G SFP28 WAN</span>' : ((fw.interfaces || '').includes('10G') || (fw.wanPorts || '').includes('10G') ? '<span class="badge-chip border border-indigo-500/40 bg-indigo-500/10 text-indigo-300">10G SFP+ WAN</span>' : '')}
              ${hasHA ? '<span class="badge-chip border border-indigo-500/40 bg-indigo-500/10 text-indigo-300 font-bold">Shadow Mode HA</span>' : ''}
              ${hasStorage ? '<span class="badge-chip border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 font-bold">NVR Storage</span>' : ''}
              ${fw.dualPsu ? '<span class="badge-chip border border-sky-500/40 bg-sky-500/10 text-sky-300">Dual PSU</span>' : ''}
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

      <div class="pt-3 border-t border-slate-800 flex items-center justify-between gap-1.5 flex-wrap sm:flex-nowrap">
        <button onclick="toggleCompareItem('${safeSku}')" class="px-2.5 py-1.5 rounded-lg border ${isCompared ? 'border-brand-500 bg-brand-500/20 text-brand-300' : 'border-slate-700 bg-slate-800 text-slate-300'} text-xs font-medium flex items-center gap-1 shrink-0">
          <i data-lucide="${isCompared ? 'check-square' : 'plus-square'}" class="w-3.5 h-3.5"></i>
        </button>
        ${fw.datasheetPath ? `
          <button onclick="openDatasheetModal('${fw.datasheetPath}', '${safeModel}', '${safeSku}')" class="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1 shrink-0 transition-colors" title="View Official Engineering Datasheet">
            <i data-lucide="file-text" class="w-3.5 h-3.5 text-rose-400"></i>
            <span class="text-[11px]">Datasheet</span>
          </button>
        ` : ''}
        <select id="targetFwLocSelect-${safeSku}" onchange="if(this.value==='new_location') handleLocationDropdownChange(this)" class="bg-slate-950 border border-slate-700 text-slate-300 text-[11px] font-bold rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-500 max-w-[120px] truncate" title="Destination Location">
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

  let reachLabel = "";
  let isDacOrStackLength = false;
  if (isDac || isStacking) {
    let meters = opt.lengthMeters;
    if (!meters && opt.reach) {
      const rm = opt.reach.match(/([\d\.]+)m/i);
      if (rm) meters = parseFloat(rm[1]);
    }
    if (!meters) {
      const nm = (opt.name || '').match(/\b(0\.5|1|2|3|5)m\b/i);
      if (nm) meters = parseFloat(nm[1]);
    }
    if (meters) {
      isDacOrStackLength = true;
      const feetMap = { 0.5: "1.6'", 1: "3.3'", 2: "6.6'", 3: "9.8'", 5: "16.4'" };
      const ftStr = feetMap[meters] || `${(meters * 3.28084).toFixed(1)}'`;
      reachLabel = `${meters}m (${ftStr}) ${isStacking ? 'Stack' : 'DAC'}`;
    } else {
      reachLabel = isStacking ? 'Stacking Cable' : 'DAC Patch';
    }
  } else if (opt.reach) {
    reachLabel = opt.reach;
  } else if (/bidi|simplex|single[\s-]strand/i.test((opt.name || '') + ' ' + (opt.description || ''))) {
    const m = (opt.name || '').match(/\b(\d+km)\b/i);
    reachLabel = m ? `${m[1]} BiDi` : '10km BiDi';
  } else if ((opt.medium || '').toLowerCase() === 'mmf') {
    const m = (opt.name || '').match(/\b(\d+m)\b/i);
    reachLabel = m ? `${m[1]} MMF` : '300m MMF';
  } else if ((opt.medium || '').toLowerCase() === 'smf') {
    const m = (opt.name || '').match(/\b(\d+km)\b/i);
    reachLabel = m ? `${m[1]} SMF` : '10km SMF';
  }
  const isBiDi = opt.bidi || /bidi|simplex|single[\s-]strand|wdm/i.test((opt.name || '') + ' ' + (opt.description || '') + ' ' + (opt.sku || ''));

  return `
    <div class="bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all rounded-2xl p-4 flex flex-col justify-between shadow-md">
      <div>
        <div class="flex items-start justify-between gap-2 mb-2">
          <div>
            <div class="flex items-center gap-1.5 mb-1.5 flex-wrap">
              <span class="badge-chip border ${badgeColor} font-bold">${safeSpeed}</span>
              <span class="badge-chip border border-slate-700 bg-slate-800 text-slate-300 uppercase">${safeMedium}</span>
              ${reachLabel ? `<span class="badge-chip border ${isDacOrStackLength ? 'border-teal-500/30 bg-teal-500/10 text-teal-300 font-bold' : 'border-slate-700 bg-slate-800 text-slate-300'} font-mono">${escapeHTML(reachLabel)}</span>` : ''}
              ${opt.formFactor ? `<span class="badge-chip border border-slate-700 bg-slate-800 text-slate-300 font-mono">${escapeHTML(opt.formFactor)}</span>` : ''}
              ${isBiDi ? '<span class="badge-chip border border-purple-500/40 bg-purple-500/10 text-purple-300 font-bold">BiDi (Simplex LC)</span>' : ''}
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

  const is60G = (radio.frequency || '').includes('60') || (radio.band || '').includes('60') || (radio.keyFeatures || []).some(k => k.includes('60 GHz'));
  const has5GBackup = radio.backup5GHz || (radio.frequency && radio.frequency.toLowerCase().includes("backup")) || (radio.architecture && radio.architecture.toLowerCase().includes("backup"));
  const roleName = radio.topologyRole === "ptp" ? "PtP Link" : radio.topologyRole === "ap" ? "PtMP Base AP" : radio.topologyRole === "station" ? "Station CPE" : safeTopology;

  return `
    <div class="bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all rounded-2xl p-4 flex flex-col justify-between shadow-md">
      <div>
        ${radio.image ? `
          <div class="mb-3 w-full h-24 bg-slate-950/70 border border-slate-800/80 rounded-xl flex items-center justify-center p-2 relative overflow-hidden group/img cursor-pointer transition-all hover:border-brand-500/40" onclick="openProductImageModal('${radio.image}', '${safeModel}', '${safeSku}')" title="Click to view full photo">
            <img src="${radio.image}" alt="${safeModel}" class="max-h-full max-w-full object-contain filter drop-shadow(0 4px 8px rgba(0,0,0,0.7)) transition-transform duration-300 group-hover/img:scale-105" loading="lazy" />
            <div class="absolute bottom-1 right-1.5 opacity-0 group-hover/img:opacity-100 transition-opacity bg-slate-900/85 border border-slate-700/80 rounded px-1.5 py-0.5 text-[9px] text-slate-300 font-mono flex items-center gap-1">
              <i data-lucide="zoom-in" class="w-2.5 h-2.5 text-brand-400"></i> Zoom
            </div>
          </div>
        ` : ''}
        <div class="flex items-start justify-between gap-2 mb-2">
          <div>
            <div class="flex items-center gap-1.5 mb-1.5 flex-wrap">
              <span class="badge-chip border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-bold">${safeVendor}</span>
              ${is60G ? '<span class="badge-chip border border-teal-500/40 bg-teal-500/10 text-teal-300 font-bold">60 GHz Multi-Gig</span>' : ''}
              <span class="badge-chip border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 font-bold">${safeFreq}</span>
              <span class="badge-chip border border-slate-700 bg-slate-800 text-slate-300 font-mono">${escapeHTML(roleName)}</span>
              ${has5GBackup ? '<span class="badge-chip border border-amber-500/30 bg-amber-500/10 text-amber-300 font-bold">5GHz Backup</span>' : ''}
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

        <div class="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 mb-3 space-y-1.5 text-xs">
          ${radio.precisionMountSku ? (() => {
            const precItem = typeof WIRELESS_ACCESSORY_CATALOG !== "undefined" ? WIRELESS_ACCESSORY_CATALOG[radio.precisionMountSku] : null;
            const precPrice = precItem ? precItem.msrp : 99;
            const precName = precItem ? precItem.name : "Precision Alignment Bracket";
            return `
              <label class="flex items-center justify-between text-slate-300 cursor-pointer hover:text-white" title="${escapeHTML(precName)}">
                <div class="flex items-center gap-1.5 truncate">
                  <input type="checkbox" id="wl-prec-${safeId}" checked class="rounded border-slate-700 bg-slate-950 text-indigo-500" />
                  <span class="text-[11px] truncate">Precision Alignment Mount</span>
                </div>
                <span class="font-mono text-slate-400 shrink-0">+$${precPrice}</span>
              </label>
            `;
          })() : ''}
          ${radio.surgeSku ? (() => {
            const surgeItem = typeof WIRELESS_ACCESSORY_CATALOG !== "undefined" ? WIRELESS_ACCESSORY_CATALOG[radio.surgeSku] : null;
            const surgePrice = surgeItem ? surgeItem.msrp : 19;
            return `
              <label class="flex items-center justify-between text-slate-300 cursor-pointer hover:text-white" title="Outdoor PoE Lightning / ESD Surge Suppressor">
                <div class="flex items-center gap-1.5 truncate">
                  <input type="checkbox" id="wl-surge-${safeId}" checked class="rounded border-slate-700 bg-slate-950 text-indigo-500" />
                  <span class="text-[11px] truncate">Outdoor PoE Surge Protector</span>
                </div>
                <span class="font-mono text-slate-400 shrink-0">+$${surgePrice}</span>
              </label>
            `;
          })() : ''}
          ${radio.licenseSku ? (() => {
            const licItem = typeof WIRELESS_LICENSE_CATALOG !== "undefined" ? WIRELESS_LICENSE_CATALOG[radio.licenseSku] : null;
            const licPrice = licItem ? licItem.msrp : 0;
            const licName = licItem ? licItem.name : "Capacity Upgrade License";
            return `
              <label class="flex items-center justify-between text-slate-300 cursor-pointer hover:text-white" title="${escapeHTML(licName)}">
                <div class="flex items-center gap-1.5 truncate">
                  <input type="checkbox" id="wl-lic-${safeId}" class="rounded border-slate-700 bg-slate-950 text-indigo-500" />
                  <span class="text-[11px] truncate text-emerald-300 font-semibold">Speed / Capacity Upgrade License</span>
                </div>
                <span class="font-mono text-emerald-400 shrink-0">+$${licPrice.toLocaleString()}</span>
              </label>
            `;
          })() : ''}
          ${radio.antennaOptions && radio.antennaOptions.length > 0 ? `
            <div class="pt-1 border-t border-slate-800/80 flex items-center justify-between gap-1 text-[11px]">
              <span class="text-slate-400 font-medium">Antenna:</span>
              <select id="wl-ant-${safeId}" class="bg-slate-900 border border-slate-700 text-slate-200 rounded px-1.5 py-0.5 text-[10px] max-w-[170px] truncate focus:outline-none">
                <option value="">None (Existing / Radio-Only)</option>
                ${radio.antennaOptions.map(antSku => {
                  const ant = (typeof WIRELESS_ACCESSORY_CATALOG !== 'undefined' ? WIRELESS_ACCESSORY_CATALOG[antSku] : null) || { sku: antSku, name: antSku, msrp: 0 };
                  return `<option value="${ant.sku}">${ant.name} (+$${ant.msrp})</option>`;
                }).join('')}
              </select>
            </div>
          ` : ''}
        </div>
      </div>

      <div class="pt-3 border-t border-slate-800 space-y-2">
        <div class="flex items-center gap-2">
          <button onclick="toggleCompareItem('${safeId}')" class="px-2.5 py-1.5 rounded-lg border ${isCompared ? 'border-brand-500 bg-brand-500/20 text-brand-300' : 'border-slate-700 bg-slate-800 text-slate-300'} text-xs font-medium flex items-center gap-1 shrink-0">
            <i data-lucide="${isCompared ? 'check-square' : 'plus-square'}" class="w-3.5 h-3.5"></i>
          </button>
          ${radio.datasheetPath ? `
            <button onclick="openDatasheetModal('${radio.datasheetPath}', '${safeModel}', '${safeSku}')" class="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1 shrink-0 transition-colors" title="View Official Engineering Datasheet">
              <i data-lucide="file-text" class="w-3.5 h-3.5 text-rose-400"></i>
              <span class="text-[11px]">Datasheet</span>
            </button>
          ` : ''}
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

  const isSine = (acc.keyFeatures || []).some(k => /pure\s*sine/i.test(k)) || /pure\s*sine/i.test((acc.model || '') + ' ' + (acc.name || '') + ' ' + (acc.description || ''));
  const isOnline = (acc.keyFeatures || []).some(k => /online\s*double|double-conversion|0\s*ms/i.test(k)) || /online/i.test((acc.model || '') + ' ' + (acc.name || ''));
  const isEbm = (acc.keyFeatures || []).some(k => /external\s*battery|scalable\s*runtime|battery\s*pack|ebm/i.test(k));
  const isOutdoor = /weatherproof|outdoor|ipx6|ip67|nema/i.test((acc.mounting || '') + ' ' + (acc.description || '') + ' ' + ((acc.keyFeatures || []).join(' ')));
  const isDin = (acc.mounting || '').toLowerCase().includes('din');

  let vendorBadgeStyle = "border-amber-500/30 bg-amber-500/10 text-amber-400";
  if (acc.vendor === "AMG") vendorBadgeStyle = "border-rose-500/30 bg-rose-500/10 text-rose-400";
  else if (acc.vendor === "UniFi") vendorBadgeStyle = "border-sky-500/30 bg-sky-500/10 text-sky-400";

  return `
    <div class="bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all rounded-2xl p-4 flex flex-col justify-between shadow-md">
      <div>
        ${acc.image ? `
          <div class="mb-3 w-full h-24 bg-slate-950/70 border border-slate-800/80 rounded-xl flex items-center justify-center p-2 relative overflow-hidden group/img cursor-pointer transition-all hover:border-brand-500/40" onclick="openProductImageModal('${acc.image}', '${safeModel}', '${safeSku}')" title="Click to view full photo">
            <img src="${acc.image}" alt="${safeModel}" class="max-h-full max-w-full object-contain filter drop-shadow(0 4px 8px rgba(0,0,0,0.7)) transition-transform duration-300 group-hover/img:scale-105" loading="lazy" />
            <div class="absolute bottom-1 right-1.5 opacity-0 group-hover/img:opacity-100 transition-opacity bg-slate-900/85 border border-slate-700/80 rounded px-1.5 py-0.5 text-[9px] text-slate-300 font-mono flex items-center gap-1">
              <i data-lucide="zoom-in" class="w-2.5 h-2.5 text-brand-400"></i> Zoom
            </div>
          </div>
        ` : ''}
        <div class="flex items-start justify-between gap-2 mb-2">
          <div>
            <div class="flex items-center gap-1.5 mb-1.5 flex-wrap">
              <span class="badge-chip border ${vendorBadgeStyle} font-bold">${safeVendor}</span>
              <span class="badge-chip border border-slate-700 bg-slate-800 text-slate-300 uppercase">${safeType}</span>
              ${isDin ? '<span class="badge-chip border border-amber-500/40 bg-amber-500/10 text-amber-300">DIN-Mount</span>' : (acc.mounting ? `<span class="badge-chip border border-slate-700 bg-slate-800 text-slate-400 font-mono">${escapeHTML(acc.mounting)}</span>` : '')}
              ${acc.rackUnits ? `<span class="badge-chip border border-indigo-500/40 bg-indigo-500/10 text-indigo-300">${acc.rackUnits}U Rack</span>` : ''}
              ${acc.powerWatts ? `<span class="badge-chip border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 font-mono font-semibold">${acc.powerWatts}W</span>` : ''}
              ${isSine ? `<span class="badge-chip border border-teal-500/30 bg-teal-500/10 text-teal-300 font-bold">Pure Sine Wave</span>` : ''}
              ${isOnline ? `<span class="badge-chip border border-sky-500/30 bg-sky-500/10 text-sky-300 font-bold">Online 0ms</span>` : ''}
              ${isEbm ? `<span class="badge-chip border border-purple-500/30 bg-purple-500/10 text-purple-300 font-bold">EBM Expandable</span>` : ''}
              ${isOutdoor ? `<span class="badge-chip border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">Outdoor / NEMA</span>` : ''}
            </div>
            <h3 class="font-bold text-base text-white">${safeModel}</h3>
            <span class="text-[11px] font-mono text-slate-400">SKU: ${safeSku}</span>
          </div>
          <div class="text-right">
            <span class="text-xs text-slate-400 block">Unit MSRP</span>
            <span class="font-mono text-base font-bold text-emerald-400">$${(acc.msrp || 0).toLocaleString()}</span>
          </div>
        </div>

        ${(acc.type === 'ups' || acc.category === 'ups') ? `
          <div class="bg-slate-950 p-2.5 rounded-xl border border-slate-800 mb-2.5 text-xs font-mono space-y-1">
            <div class="flex justify-between"><span class="text-slate-500">Power Rating:</span><span class="text-amber-400 font-bold">${acc.powerWatts || 1000}W Output (${acc.rackUnits ? `${acc.rackUnits}U Rack` : 'Rackmount'})</span></div>
            <div class="flex justify-between"><span class="text-slate-500">Topology:</span><span class="text-sky-300 font-bold">${isOnline ? 'Online Double-Conversion (0ms)' : (isSine ? 'Pure Sine Wave Battery Backup' : 'Line-Interactive')}</span></div>
            <div class="flex justify-between"><span class="text-slate-500">Chassis Depth:</span><span class="text-slate-200">${acc.depthInches ? `${acc.depthInches}" Rack Depth` : 'Standard Rack Depth'}</span></div>
          </div>
        ` : ''}

        <p class="text-xs text-slate-300 mb-2 line-clamp-2">${escapeHTML(acc.description || 'Hardware accessory & interconnect adapter.')}</p>

        ${(acc.keyFeatures && acc.keyFeatures.length > 0) ? `
          <div class="space-y-1 mb-3">
            ${acc.keyFeatures.slice(0, 3).map(f => `
              <div class="text-[11px] text-slate-400 flex items-center gap-1.5">
                <i data-lucide="check" class="w-3 h-3 text-emerald-400 shrink-0"></i>
                <span class="truncate">${escapeHTML(f)}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>

      <div class="pt-3 border-t border-slate-800 flex items-center justify-between gap-1.5 flex-wrap sm:flex-nowrap">
        ${acc.datasheetPath ? `
          <button onclick="openDatasheetModal('${acc.datasheetPath}', '${safeModel}', '${safeSku}')" class="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1 shrink-0 transition-colors" title="View Official Engineering Datasheet">
            <i data-lucide="file-text" class="w-3.5 h-3.5 text-rose-400"></i>
            <span class="text-[11px]">Datasheet</span>
          </button>
        ` : ''}
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
    let assignedLoc = (typeof FacilityStore !== "undefined") ? FacilityStore.UNASSIGNED : "Unassigned";
    if (loc && loc !== "new_location") {
      assignedLoc = typeof FacilityStore !== "undefined" ? FacilityStore.normalize(loc) : loc;
    } else if (typeof FacilityStore !== "undefined") {
      const locs = FacilityStore.getLocationNames(false);
      if (locs.length > 0) assignedLoc = locs.find(l => l.includes("MDF")) || locs[0];
    }

    if (mode === "servers") {
      if (typeof addServerToBOM === "function") addServerToBOM(safeId, assignedLoc);
    } else if (mode === "cameras") {
      if (typeof addCameraToBOM === "function") addCameraToBOM(safeId, assignedLoc);
    } else if (mode === "access_control") {
      if (typeof addAccessDeviceToBOM === "function") addAccessDeviceToBOM(safeId, assignedLoc);
    } else if (mode === "wireless") {
      if (typeof addWirelessToBOM === "function") addWirelessToBOM(safeId, assignedLoc);
      else addOpticsToBOM(safeSku, safeModel, msrp, 1, safeVendor);
    } else {
      // Infrastructure & Interconnect Domain Routing
      const catItem = (typeof CatalogRegistry !== "undefined" && typeof CatalogRegistry.get === "function") ? CatalogRegistry.get(safeSku || safeId) : null;
      let role = "Infrastructure";
      if (mode === "racks") role = "Racks & Closets";
      else if (mode === "ups") role = "Rack UPS Power";
      else if (mode === "cabling") role = "Structured Cabling";
      else if (mode === "pathways") role = "Pathways & J-Hooks";
      else if (mode === "accessories") role = "Power & Midspans";
      else if (mode === "optics") role = "Optics / Interconnect";

      const instanceId = `infra-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const bomItem = {
        instanceId: instanceId,
        id: safeSku || safeId,
        model: safeModel,
        sku: safeSku,
        role: role,
        category: (catItem && catItem.category) || mode,
        vendor: safeVendor,
        msrp: msrp,
        rackUnits: (catItem && catItem.rackUnits) || 0,
        depthInches: (catItem && catItem.depthInches) || 0,
        baseWatts: (catItem && catItem.baseWatts) || 0,
        powerWatts: (catItem && catItem.powerWatts) || 0,
        poeBudget: 0,
        closetName: assignedLoc,
        rackId: assignedLoc,
        qty: 1
      };

      projectBOM.push(bomItem);
      if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
        FacilityStore.notifyWorkspaceChange();
      }
      if (typeof showToast === "function") {
        showToast(`Added ${safeModel} to ${assignedLoc}`);
      }
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
  } else if (mode === "racks" || item.category === "racks" || item.type === "equipment_rack") {
    const rackDesc = (item.model || '').includes('Wall') ? 'Wall-Mount Swing-Out' : ((item.model || '').includes('2-Post') || (item.model || '').includes('Relay') ? '2-Post Open Relay Frame' : 'Full-Depth Datacenter Cabinet');
    specStripHtml = `
      <div class="bg-slate-950 p-2.5 rounded-xl border border-slate-800 mb-2.5 text-xs font-mono space-y-1">
        <div class="flex justify-between"><span class="text-slate-500">Rack Capacity:</span><span class="text-indigo-400 font-bold">${item.rackUnits || 42}U (${item.mounting || 'Floor'} Mount)</span></div>
        <div class="flex justify-between"><span class="text-slate-500">Usable Depth:</span><span class="text-emerald-400 font-bold">${item.depthInches ? `${item.depthInches}" Depth` : 'Standard EIA-310'}</span></div>
        <div class="flex justify-between"><span class="text-slate-500">Enclosure Type:</span><span class="text-slate-200">${escapeHTML(rackDesc)}</span></div>
      </div>
    `;
  } else if (mode === "ups" || item.category === "ups" || item.type === "ups") {
    const topology = item.description?.includes('LiFePO4') ? 'LiFePO4 Online Double-Conversion' : (item.description?.includes('Sine Wave') ? 'Pure Sine Wave Battery Backup' : 'Line-Interactive Sine Wave');
    specStripHtml = `
      <div class="bg-slate-950 p-2.5 rounded-xl border border-slate-800 mb-2.5 text-xs font-mono space-y-1">
        <div class="flex justify-between"><span class="text-slate-500">Power Rating:</span><span class="text-amber-400 font-bold">${item.powerWatts || 1350}W Output (${item.rackUnits ? `${item.rackUnits}U Rack` : 'Rackmount'})</span></div>
        <div class="flex justify-between"><span class="text-slate-500">Topology:</span><span class="text-sky-300 font-bold">${escapeHTML(topology)}</span></div>
        <div class="flex justify-between"><span class="text-slate-500">Chassis Depth:</span><span class="text-slate-200">${item.depthInches ? `${item.depthInches}" Rack Depth` : 'Standard Rack Depth'}</span></div>
      </div>
    `;
  } else if (mode === "cabling" || item.category === "cabling" || item.type === "patch_panel" || item.type === "bulk_cable" || item.type === "fiber_trunk" || item.type === "patch_cord") {
    const configDesc = item.ports ? `${item.ports}-Port Keystone Panel` : (item.ftPerBox ? `${item.ftPerBox} ft Spool Box` : (item.strands ? `${item.strands}-Strand Armored LC Trunk` : (item.lengthFt != null ? (item.lengthFt === 0.5 ? '6-Inch (0.5 ft) Patch Cord' : `${item.lengthFt} ft Patch Cord`) : `${item.packQty || 1}-Pack`)));
    const ratingDesc = item.rating || (item.medium ? item.medium.toUpperCase() : null) || item.standard || 'Cat6A TIA-568';
    specStripHtml = `
      <div class="bg-slate-950 p-2.5 rounded-xl border border-slate-800 mb-2.5 text-xs font-mono space-y-1">
        <div class="flex justify-between"><span class="text-slate-500">Configuration:</span><span class="text-teal-400 font-bold">${escapeHTML(configDesc)}</span></div>
        <div class="flex justify-between"><span class="text-slate-500">Jacket / Media:</span><span class="text-indigo-300 font-bold">${escapeHTML(ratingDesc)}</span></div>
        <div class="flex justify-between"><span class="text-slate-500">Performance:</span><span class="text-slate-200">${escapeHTML(item.speed || item.standard || 'Enterprise Structured Cabling')}</span></div>
      </div>
    `;
  } else if (mode === "pathways" || item.category === "pathways" || item.type === "pathway") {
    specStripHtml = `
      <div class="bg-slate-950 p-2.5 rounded-xl border border-slate-800 mb-2.5 text-xs font-mono space-y-1">
        <div class="flex justify-between"><span class="text-slate-500">Mounting:</span><span class="text-emerald-400 font-bold">${escapeHTML(item.mounting || 'Ceiling / Wall Trapeze')}</span></div>
        <div class="flex justify-between"><span class="text-slate-500">Pathway Type:</span><span class="text-sky-300 font-bold">${item.model.includes('J-Hook') ? 'High-Performance J-Hook' : 'Wire Mesh Basket Tray'}</span></div>
        <div class="flex justify-between"><span class="text-slate-500">Standard:</span><span class="text-slate-200">TIA-569 Compliant Pathway</span></div>
      </div>
    `;
  }

  const isUps = mode === "ups" || item.category === "ups" || item.type === "ups";
  const isCabling = mode === "cabling" || item.category === "cabling" || item.type === "bulk_cable" || item.type === "patch_panel" || item.type === "fiber_trunk" || item.type === "patch_cord" || item.type === "connector";
  const isRack = mode === "racks" || item.category === "racks" || item.type === "equipment_rack";

  const isSine = (item.keyFeatures || []).some(k => /pure\s*sine/i.test(k)) || /pure\s*sine/i.test((item.model || '') + ' ' + (item.name || '') + ' ' + (item.description || ''));
  const isOnline = (item.keyFeatures || []).some(k => /online\s*double|double-conversion|0\s*ms/i.test(k)) || /online/i.test((item.model || '') + ' ' + (item.name || ''));
  const isEbm = (item.keyFeatures || []).some(k => /external\s*battery|scalable\s*runtime|battery\s*pack|ebm/i.test(k));

  const isShielded = /shielded|f\/utp|stp|oas/i.test((item.name || '') + ' ' + (item.standard || '') + ' ' + (item.jacketType || ''));
  const isOutdoor = /outdoor|direct\s*burial|osp|uv/i.test((item.name || '') + ' ' + (item.standard || '') + ' ' + (item.jacketType || '') + ' ' + (item.rating || ''));
  const isPlenum = /plenum|cmp/i.test((item.name || '') + ' ' + (item.standard || '') + ' ' + (item.jacketType || '') + ' ' + (item.rating || ''));
  const isRiser = /riser|cmr/i.test((item.name || '') + ' ' + (item.standard || '') + ' ' + (item.jacketType || '') + ' ' + (item.rating || ''));

  return `
    <div class="bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all rounded-2xl p-4 flex flex-col justify-between shadow-md">
      <div>
        ${item.image ? `
          <div class="mb-3 w-full h-24 bg-slate-950/70 border border-slate-800/80 rounded-xl flex items-center justify-center p-2 relative overflow-hidden group/img cursor-pointer transition-all hover:border-brand-500/40" onclick="openProductImageModal('${item.image}', '${safeModel}', '${safeSku}')" title="Click to view full photo">
            <img src="${item.image}" alt="${safeModel}" class="max-h-full max-w-full object-contain filter drop-shadow(0 4px 8px rgba(0,0,0,0.7)) transition-transform duration-300 group-hover/img:scale-105" loading="lazy" />
            <div class="absolute bottom-1 right-1.5 opacity-0 group-hover/img:opacity-100 transition-opacity bg-slate-900/85 border border-slate-700/80 rounded px-1.5 py-0.5 text-[9px] text-slate-300 font-mono flex items-center gap-1">
              <i data-lucide="zoom-in" class="w-2.5 h-2.5 text-brand-400"></i> Zoom
            </div>
          </div>
        ` : ''}
        <div class="flex items-start justify-between gap-2 mb-2">
          <div>
            <div class="flex items-center gap-1.5 mb-1.5 flex-wrap">
              <span class="badge-chip border border-brand-500/30 bg-brand-500/10 text-brand-300 font-bold">${safeVendor}</span>
              <span class="badge-chip border border-slate-700 bg-slate-800 text-slate-300 uppercase">${safeType}</span>
              ${item.formFactor ? `<span class="badge-chip border border-slate-700 bg-slate-800 text-slate-400 font-mono">${escapeHTML(item.formFactor)}</span>` : ''}
              ${item.rackUnits ? `<span class="badge-chip border border-indigo-500/40 bg-indigo-500/10 text-indigo-300">${item.rackUnits}U Rack</span>` : ''}
              ${item.resolution ? `<span class="badge-chip border border-teal-500/40 bg-teal-500/10 text-teal-300">${escapeHTML(item.resolution)}</span>` : ''}
              ${item.dualPsu ? `<span class="badge-chip border border-amber-500/30 bg-amber-500/10 text-amber-300 font-bold">Dual PSU</span>` : ''}
              ${isUps && isSine ? `<span class="badge-chip border border-teal-500/30 bg-teal-500/10 text-teal-300 font-bold">Pure Sine Wave</span>` : ''}
              ${isUps && isOnline ? `<span class="badge-chip border border-sky-500/30 bg-sky-500/10 text-sky-300 font-bold">Online 0ms</span>` : ''}
              ${isUps && isEbm ? `<span class="badge-chip border border-purple-500/30 bg-purple-500/10 text-purple-300 font-bold">EBM Expandable</span>` : ''}
              ${isCabling && isPlenum ? `<span class="badge-chip border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 font-bold">Plenum CMP</span>` : ''}
              ${isCabling && isRiser ? `<span class="badge-chip border border-blue-500/30 bg-blue-500/10 text-blue-300 font-bold">Riser CMR</span>` : ''}
              ${isCabling && isOutdoor ? `<span class="badge-chip border border-amber-500/30 bg-amber-500/10 text-amber-300 font-bold">Outdoor OSP</span>` : ''}
              ${isCabling && isShielded ? `<span class="badge-chip border border-violet-500/30 bg-violet-500/10 text-violet-300 font-bold">Shielded F/UTP</span>` : ''}
              ${isCabling && item.strands ? `<span class="badge-chip border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 font-mono">${item.strands} Strands</span>` : ''}
              ${isCabling && (item.lengthFt != null) ? `<span class="badge-chip border border-sky-500/30 bg-sky-500/10 text-sky-300 font-mono font-bold">${item.lengthFt === 0.5 ? '6-Inch (0.5 ft)' : (item.lengthMeters ? `${item.lengthFt} ft (${item.lengthMeters}m)` : `${item.lengthFt} ft Length`)}</span>` : ''}
              ${isCabling && item.etherlighting ? `<span class="badge-chip border border-amber-500/40 bg-amber-500/10 text-amber-300 font-bold">Etherlighting™</span>` : ''}
              ${isRack && (item.model || '').includes('Wall') ? `<span class="badge-chip border border-indigo-500/30 bg-indigo-500/10 text-indigo-300">Wall-Mount</span>` : ''}
              ${isRack && ((item.model || '').includes('2-Post') || (item.model || '').includes('Relay')) ? `<span class="badge-chip border border-slate-700 bg-slate-800 text-slate-300">2-Post Open</span>` : ''}
              ${isRack && ((item.model || '').includes('NEMA') || (item.model || '').includes('Outdoor')) ? `<span class="badge-chip border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">NEMA Weatherproof</span>` : ''}
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

      <div class="pt-3 border-t border-slate-800 flex items-center justify-between gap-1.5 flex-wrap sm:flex-nowrap">
        <button onclick="toggleCompareItem('${safeId}')" class="px-2.5 py-1.5 rounded-lg border ${isCompared ? 'border-brand-500 bg-brand-500/20 text-brand-300' : 'border-slate-700 bg-slate-800 text-slate-300'} text-xs font-medium flex items-center gap-1 shrink-0">
          <i data-lucide="${isCompared ? 'check-square' : 'plus-square'}" class="w-3.5 h-3.5"></i>
        </button>

        ${item.datasheetPath ? `
          <button onclick="openDatasheetModal('${item.datasheetPath}', '${safeModel}', '${safeSku}')" class="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1 shrink-0 transition-colors" title="View Official Engineering Datasheet">
            <i data-lucide="file-text" class="w-3.5 h-3.5 text-rose-400"></i>
            <span class="text-[11px]">Datasheet</span>
          </button>
        ` : ''}

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
window.renderCardByDomain = renderCardByDomain;