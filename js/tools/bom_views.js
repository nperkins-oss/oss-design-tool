// =========================================================================
// BOM VIEW RENDERERS, ACCORDIONS, LICENSE MANAGER & ENGINEERING EXPORT
// Separated from js/tools/bom.js for modular maintainability
// =========================================================================

// -----------------------------------------------------------
// BOM View HTML Renderers
// -----------------------------------------------------------
// -----------------------------------------------------------
// BOM View HTML Renderers & Studio Engine
// -----------------------------------------------------------
function updateBOMView() {
  window._cachedBomLocationGroups = (typeof FacilityStore !== "undefined" && typeof FacilityStore.getLocationGroups === "function")
    ? FacilityStore.getLocationGroups(true)
    : null;
  window._cachedBomChildrenMap = new Map();
  if (typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) {
    projectBOM.forEach(item => {
      enrichBOMItemFromCatalog(item);
      if (item.parentInstanceId) {
        if (!window._cachedBomChildrenMap.has(item.parentInstanceId)) {
          window._cachedBomChildrenMap.set(item.parentInstanceId, []);
        }
        window._cachedBomChildrenMap.get(item.parentInstanceId).push(item);
      }
    });
  }

  const merakiAlertEl = document.getElementById("merakiLicenseAlert");
  if (merakiAlertEl) {
    const compliance = checkMerakiCompliance();
    if (!compliance.compliant) {
      merakiAlertEl.classList.remove("hidden");
    } else {
      merakiAlertEl.classList.add("hidden");
    }
  }

  let totalUnits = 0, totalPoE = 0, totalMSRP = 0;
  projectBOM.forEach(item => {
    if (!item.parentInstanceId) {
      totalUnits += item.qty;
    }
    totalPoE += ((item.poeBudget || 0) * item.qty);
    totalMSRP += (item.msrp * item.qty);
  });

  // Live Project Health & Deficit Telemetry
  updateProjectHealthUI();

  // Top header badges
  const badge = document.getElementById("bomCountBadge");
  if (badge) badge.innerText = totalUnits;
  const headerUnitsEl = document.getElementById("bomHeaderUnits");
  if (headerUnitsEl) headerUnitsEl.innerText = totalUnits;
  const headerPoEEl = document.getElementById("bomHeaderPoE");
  if (headerPoEEl) headerPoEEl.innerText = `${totalPoE.toLocaleString()} W`;
  const headerMSRPEl = document.getElementById("bomHeaderMSRP");
  if (headerMSRPEl) headerMSRPEl.innerText = `$${Math.round(totalMSRP).toLocaleString()}`;

  // Bottom footer telemetry
  const totalUnitsEl = document.getElementById("bomTotalUnits");
  if (totalUnitsEl) totalUnitsEl.innerText = totalUnits;
  const totalPoEEl = document.getElementById("bomTotalPoE");
  if (totalPoEEl) totalPoEEl.innerText = `${totalPoE.toLocaleString()} W`;
  const totalMSRPEl = document.getElementById("bomTotalMSRP");
  if (totalMSRPEl) totalMSRPEl.innerText = `$${Math.round(totalMSRP).toLocaleString()}`;

  // Skip heavy table DOM rendering and icon replacement when the BOM modal is hidden
  const bomModalEl = document.getElementById("bomModal");
  if (bomModalEl && bomModalEl.classList.contains("hidden")) {
    return;
  }

  // Populate dynamic Location filter dropdown
  const locSelect = document.getElementById("bomLocationFilter");
  if (locSelect) {
    const currentVal = bomSelectedLocation;
    const allLocations = new Set();
    if (typeof FacilityStore !== "undefined") {
      const names = FacilityStore.getLocationNames(true);
      names.forEach(n => allLocations.add(FacilityStore.normalize(n)));
    }
    projectBOM.forEach(i => {
      const rawLoc = i.closetName || i.rackId || (typeof FacilityStore !== "undefined" ? FacilityStore.UNASSIGNED : "Unassigned");
      allLocations.add(typeof FacilityStore !== "undefined" ? FacilityStore.normalize(rawLoc) : rawLoc);
    });

    let optsHtml = `<option value="all" ${currentVal === 'all' ? 'selected' : ''}>All Locations & Racks</option>`;
    Array.from(allLocations).sort().forEach(loc => {
      const isSelected = currentVal === loc;
      const isUnassigned = typeof FacilityStore !== "undefined" && loc === FacilityStore.UNASSIGNED;
      optsHtml += `<option value="${escapeHTML(loc)}" ${isSelected ? 'selected' : ''}>${isUnassigned ? 'Unassigned (Staging)' : escapeHTML(loc)}</option>`;
    });
    locSelect.innerHTML = optsHtml;
  }

  const listContainer = document.getElementById("bomItemsList");
  if (!listContainer) return;

  if (projectBOM.length === 0) {
    listContainer.innerHTML = `
      <div class="py-16 text-center text-slate-500 flex flex-col items-center justify-center">
        <div class="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 mb-3 shadow-sm">
          <i data-lucide="shopping-bag" class="w-8 h-8 text-brand-400"></i>
        </div>
        <h3 class="text-sm font-bold text-white mb-1">Your Project BOM is Empty</h3>
        <p class="text-xs text-slate-400 max-w-sm mb-4">Add switches, cameras, wireless access points, or rack hardware from the catalog to populate your equipment schedule.</p>
      </div>
    `;
    if (typeof safeCreateIcons === "function") safeCreateIcons(listContainer);
    return;
  }

  // Filter items based on active criteria
  let filteredItems = projectBOM.filter(item => {
    // 1. Search Query
    if (bomSearchQuery) {
      const q = bomSearchQuery.toLowerCase();
      const match = (
        (item.model && item.model.toLowerCase().includes(q)) ||
        (item.sku && item.sku.toLowerCase().includes(q)) ||
        (item.id && item.id.toLowerCase().includes(q)) ||
        (item.friendlyName && item.friendlyName.toLowerCase().includes(q)) ||
        (item.deviceNumber && item.deviceNumber.toLowerCase().includes(q)) ||
        (item.role && item.role.toLowerCase().includes(q)) ||
        (item.vendor && item.vendor.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q)) ||
        (item.closetName && item.closetName.toLowerCase().includes(q)) ||
        (item.rackId && item.rackId.toLowerCase().includes(q))
      );
      if (!match) return false;
    }

    // 2. Location Filter
    if (bomSelectedLocation !== "all") {
      const rawLoc = item.closetName || item.rackId || (typeof FacilityStore !== "undefined" ? FacilityStore.UNASSIGNED : "Unassigned");
      const itemLoc = typeof FacilityStore !== "undefined" ? FacilityStore.normalize(rawLoc) : rawLoc;
      if (itemLoc !== bomSelectedLocation) return false;
    }

    // 3. Category Filter
    if (bomSelectedCategory !== "all") {
      const itemCat = getBomItemCategoryKey(item);
      if (itemCat !== bomSelectedCategory) return false;
    }

    return true;
  });

  if (filteredItems.length === 0) {
    listContainer.innerHTML = `
      <div class="py-16 text-center text-slate-500 flex flex-col items-center justify-center">
        <div class="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 mb-3 shadow-sm">
          <i data-lucide="filter-x" class="w-8 h-8 text-amber-400"></i>
        </div>
        <h3 class="text-sm font-bold text-white mb-1">No Matching Hardware Found</h3>
        <p class="text-xs text-slate-400 max-w-sm mb-4">No equipment in the project matched your current search query or active dropdown filters.</p>
        <button onclick="resetBomFilters()" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold border border-slate-700 transition-colors cursor-pointer shadow-sm">
          Reset Search & Filters
        </button>
      </div>
    `;
    if (typeof safeCreateIcons === "function") safeCreateIcons(listContainer);
    return;
  }

  // -------------------------------------------------------------
  // Mode A: Flat Procurement Order
  // -------------------------------------------------------------
  if (bomViewMode === "flat") {
    const skuMap = new Map();

    filteredItems.forEach(item => {
      const rawSku = String(item.sku || item.id || item.model || 'GENERIC-SKU').trim();
      const qty = parseInt(item.qty, 10) || 1;
      const msrp = parseFloat(item.msrp) || 0;
      const baseWatts = parseFloat(item.baseWatts) || 0;
      const poeWatts = parseFloat(item.poeBudget) || 0;
      const rawLoc = item.closetName || item.rackId || (typeof FacilityStore !== "undefined" ? FacilityStore.UNASSIGNED : "Unassigned");
      const locKey = typeof FacilityStore !== "undefined" ? FacilityStore.normalize(rawLoc) : rawLoc;

      if (!skuMap.has(rawSku)) {
        skuMap.set(rawSku, {
          sku: item.sku || item.id || rawSku,
          model: item.model || rawSku,
          vendor: item.vendor || "",
          role: item.role || item.category || "Hardware",
          category: item.category || "",
          msrp: msrp,
          rawQty: 0,
          totalCost: 0,
          totalWatts: 0,
          locations: {},
          instances: []
        });
      }

      const entry = skuMap.get(rawSku);
      entry.rawQty += qty;
      entry.totalCost += (msrp * qty);
      entry.totalWatts += ((baseWatts + poeWatts) * qty);
      entry.locations[locKey] = (entry.locations[locKey] || 0) + qty;
      entry.instances.push(item);
    });

    const skuList = Array.from(skuMap.values());
    skuList.sort((a, b) => (b.totalCost - a.totalCost) || (b.rawQty - a.rawQty) || a.sku.localeCompare(b.sku));

    const totalUniqueSkus = skuList.length;
    const totalRawCount = skuList.reduce((acc, s) => acc + s.rawQty, 0);
    const totalOrderCost = skuList.reduce((acc, s) => acc + s.totalCost, 0);

    listContainer.innerHTML = renderBomFlatTable(skuList, totalUniqueSkus, totalRawCount, totalOrderCost);
  } 
  // -------------------------------------------------------------
  // Mode B: Category Breakdown
  // -------------------------------------------------------------
  else if (bomViewMode === "category") {
    const catGroups = {};
    Object.keys(BOM_CATEGORIES).forEach(k => { catGroups[k] = []; });

    filteredItems.forEach(item => {
      if (item.parentInstanceId) return; // Child parts render inside parent rows
      const catKey = getBomItemCategoryKey(item);
      if (!catGroups[catKey]) catGroups[catKey] = [];
      catGroups[catKey].push(item);
    });

    let catHtml = '<div class="space-y-4">';
    let renderedAny = false;

    Object.entries(catGroups).forEach(([catKey, items]) => {
      if (!items || items.length === 0) return;
      renderedAny = true;
      const catMeta = BOM_CATEGORIES[catKey] || { label: catKey, icon: "box" };
      catHtml += renderBomCategoryAccordion(catKey, catMeta, items);
    });

    catHtml += '</div>';
    listContainer.innerHTML = renderedAny ? catHtml : '<div class="py-8 text-center text-slate-500 text-xs">No items in selected categories.</div>';
  }
  // -------------------------------------------------------------
  // Mode C: By Location / Rack (Default)
  // -------------------------------------------------------------
  else {
    const locGroups = {};

    filteredItems.forEach(item => {
      if (item.parentInstanceId) return; // Child parts render inside parent rows
      const rawLoc = item.closetName || item.rackId || (typeof FacilityStore !== "undefined" ? FacilityStore.UNASSIGNED : "Unassigned");
      const key = typeof FacilityStore !== "undefined" ? FacilityStore.normalize(rawLoc) : rawLoc;
      if (!locGroups[key]) locGroups[key] = [];
      locGroups[key].push(item);
    });

    // Sort locations: Assigned spaces/racks first, Unassigned staging last
    const sortedKeys = Object.keys(locGroups).sort((a, b) => {
      const isUnA = typeof FacilityStore !== "undefined" && a === FacilityStore.UNASSIGNED;
      const isUnB = typeof FacilityStore !== "undefined" && b === FacilityStore.UNASSIGNED;
      if (isUnA && !isUnB) return 1;
      if (!isUnA && isUnB) return -1;
      return a.localeCompare(b);
    });

    let groupedHtml = '<div class="space-y-4">';
    sortedKeys.forEach(locKey => {
      groupedHtml += renderBomLocationAccordion(locKey, locGroups[locKey]);
    });
    groupedHtml += '</div>';

    listContainer.innerHTML = groupedHtml;
  }

  if (typeof safeCreateIcons === "function") {
    safeCreateIcons(listContainer);
  } else if (window.lucide) {
    try { lucide.createIcons(); } catch(e) {}
  }
}

// -----------------------------------------------------------
// Modern Structured Table Row Renderer (Spacious Grid)
// -----------------------------------------------------------
function renderBomTableRow(item) {
  const rawLoc = item.closetName || item.rackId || (typeof FacilityStore !== "undefined" ? FacilityStore.UNASSIGNED : "Unassigned");
  const currentLocationKey = typeof FacilityStore !== "undefined" ? FacilityStore.normalize(rawLoc) : rawLoc;
  const isUnassigned = typeof FacilityStore !== "undefined" && currentLocationKey === FacilityStore.UNASSIGNED;

  const pwr = (typeof PortEngine !== "undefined") ? PortEngine.getDevicePowerSource(item) : (item.powerSource || "internal_psu");
  const pwrBadge = (pwr !== "passive" && typeof PortEngine !== "undefined" && PortEngine.POWER_MODES && PortEngine.POWER_MODES[pwr]) ? PortEngine.POWER_MODES[pwr] : null;
  const childItems = (window._cachedBomChildrenMap && window._cachedBomChildrenMap.get(item.instanceId)) || projectBOM.filter(ch => ch.parentInstanceId === item.instanceId);

  const catSw = (item.modularUplink ? item : null) || 
    (typeof CatalogRegistry !== "undefined" && typeof CatalogRegistry.getSwitch === "function" ? CatalogRegistry.getSwitch(item.id || item.sku) : null) ||
    (typeof CatalogRegistry !== "undefined" && typeof CatalogRegistry.get === "function" ? CatalogRegistry.get(item.id || item.sku) : null) ||
    (typeof SWITCH_DATABASE !== "undefined" ? SWITCH_DATABASE.find(s => s.id === item.id || s.sku === item.sku) : null);
  const hasModularBay = !!(catSw && catSw.modularUplink && catSw.modularUplink.hasSlot);
  const attachedSled = childItems.find(ch => ch.role === "Uplink Module");
  const otherChildItems = hasModularBay ? childItems.filter(ch => ch.role !== "Uplink Module") : childItems;

  const totalItemCost = (item.msrp || 0) * (item.qty || 1);
  const childCost = childItems.reduce((sum, ch) => sum + ((ch.msrp || 0) * (ch.qty || 1)), 0);
  const totalRowCost = totalItemCost + childCost;
  const isStackable = item.canStack || item.role === "Access" || item.role === "Aggregation";
  const isStack = isStackable && item.stackedUnits >= 2;
  const ppCfg = resolveSwitchPatchPanelConfig(item);
  const hasStackPower = supportsCiscoStackPower(item);

  const uPosition = item.uPosition || (item.startU ? `U${item.startU}${item.heightU > 1 ? `-U${item.startU + item.heightU - 1}` : ''}` : null);
  const mountLabel = item.mountMethod ? formatMountMethodLabel(item.mountMethod) : null;
  const isCameraItem = item.role === "Camera" || item.category === "camera" || item.category === "cameras";

  let cameraSkuSelectorHtml = "";
  if (isCameraItem) {
    const allRealCams = typeof CAMERAS_DATABASE !== "undefined" ? CAMERAS_DATABASE : [];
    const allGenCams = typeof GENERIC_CAMERA_TYPES !== "undefined" ? GENERIC_CAMERA_TYPES : [];
    const genTypeId = item.genericCameraTypeId || item.originGenericTypeId || (item.isGenericCamera ? item.id : null);
    const genDef = genTypeId ? allGenCams.find(g => g.id === genTypeId || g.sku === genTypeId) : null;
    const recSkus = (item.recommendedUpgradeSkus && item.recommendedUpgradeSkus.length > 0)
      ? item.recommendedUpgradeSkus
      : (genDef && Array.isArray(genDef.recommendedUpgradeSkus) ? genDef.recommendedUpgradeSkus : []);

    const recCamObjs = recSkus.map(sku => allRealCams.find(c => c.sku === sku || c.id === sku)).filter(Boolean);
    const otherRealCams = allRealCams.filter(c => !recSkus.includes(c.sku) && !recSkus.includes(c.id));

    cameraSkuSelectorHtml = `
      <div class="pt-1.5">
        <div class="p-2 rounded-lg ${item.isGenericCamera ? 'bg-emerald-950/25 border border-emerald-500/30' : 'bg-slate-950/80 border border-slate-800'} transition-colors shadow-sm space-y-1.5">
          <div class="flex items-center justify-between gap-2">
            <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${item.isGenericCamera ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-sky-500/15 text-sky-300 border border-sky-500/30'} text-[10px] font-mono font-semibold">
              <i data-lucide="camera" class="w-3 h-3"></i>
              <span>${item.isGenericCamera ? 'Generic Sizing Placeholder' : 'Assigned Catalog Part'}</span>
            </span>
            <span class="text-[10px] font-mono text-slate-400">Override Individual Camera SKU:</span>
          </div>
          <select
            onchange="upgradeSingleCameraInstance('${item.instanceId}', this.value)"
            class="w-full bg-slate-900 border border-slate-700/80 hover:border-slate-600 text-slate-200 text-xs font-medium rounded-md px-2 py-1 focus:outline-none focus:border-brand-500 cursor-pointer shadow-sm transition-colors"
            title="Assign or override specific camera part SKU for this individual drop"
          >
            ${recCamObjs.length > 0 ? `
              <optgroup label="Recommended Compatible Parts">
                ${recCamObjs.map(c => `<option value="${escapeHTML(c.sku)}" ${(item.sku === c.sku || item.id === c.id) ? 'selected' : ''}>★ ${escapeHTML(c.vendor)} ${escapeHTML(c.model)} (${escapeHTML(c.sku)}) — $${(c.msrp || 0).toLocaleString()}</option>`).join('')}
              </optgroup>
            ` : ''}
            <optgroup label="All Catalog Camera SKUs (Full Design)">
              ${otherRealCams.map(c => `<option value="${escapeHTML(c.sku)}" ${(item.sku === c.sku || item.id === c.id) ? 'selected' : ''}>${escapeHTML(c.vendor)} ${escapeHTML(c.model)} (${escapeHTML(c.sku)}) — $${(c.msrp || 0).toLocaleString()}</option>`).join('')}
            </optgroup>
            <optgroup label="Generic Sizing Types (Initial Design)">
              ${allGenCams.map(g => `<option value="${escapeHTML(g.id)}" ${(item.id === g.id || item.sku === g.sku) ? 'selected' : ''}>[Generic] ${escapeHTML(g.model)} (${escapeHTML(g.poeStandard)}) — $${(g.msrp || 0).toLocaleString()}</option>`).join('')}
            </optgroup>
          </select>
        </div>
      </div>
    `;
  }

  return `
    <tr id="bom-item-${item.instanceId}" data-bom-instance="${item.instanceId}" class="group border-b border-slate-800/80 hover:bg-slate-900/50 transition-colors">
      <!-- Col 1: Hardware Identity -->
      <td class="py-3 px-4 align-top">
        <div class="space-y-1">
          <div class="flex items-center gap-2 flex-wrap">
            ${item.deviceNumber ? `
              <span class="px-2 py-0.5 rounded-md bg-brand-950/90 border border-brand-500/50 text-[11px] font-mono font-bold text-brand-300 shadow-sm" title="Device Sequence ID">
                ${escapeHTML(item.deviceNumber)}
              </span>
            ` : ''}
            <span class="text-xs font-bold text-white tracking-tight" title="${escapeHTML(item.friendlyName || item.model)}">
              ${escapeHTML(item.friendlyName || item.model)}
            </span>
            <button type="button" onclick="promptEditDeviceFriendlyName('${item.instanceId}')" class="text-slate-500 hover:text-white p-0.5 rounded hover:bg-slate-800 transition-colors cursor-pointer" title="Edit Device Friendly Name">
              <i data-lucide="pencil" class="w-3 h-3"></i>
            </button>
            ${item.vendor ? `
              <span class="px-1.5 py-0.2 rounded bg-slate-900 border border-slate-700/80 text-[10px] font-mono text-slate-300">
                ${escapeHTML(item.vendor)}
              </span>
            ` : ''}
          </div>

          <div class="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
            ${item.friendlyName && item.friendlyName !== item.model ? `
              <span class="text-slate-300 font-medium">${escapeHTML(item.model)}</span>
              <span>&bull;</span>
            ` : ''}
            <span class="text-slate-400">SKU: <strong class="text-slate-300 font-semibold">${escapeHTML(item.sku)}</strong></span>
            <span>&bull;</span>
            <span class="px-1.5 py-0.2 rounded bg-slate-900/80 text-slate-400 text-[10px] border border-slate-800">${escapeHTML(item.role || 'Hardware')}</span>
          </div>

          ${cameraSkuSelectorHtml}

          <!-- Modular Uplink Bay Selector (if switch has modular uplink slot) -->
          ${hasModularBay ? `
            <div class="pt-2">
              <div class="p-2 rounded-lg bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-colors shadow-sm space-y-1.5">
                <div class="flex items-center justify-between gap-2">
                  <div class="flex items-center gap-1.5">
                    <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-400 text-[10px] font-mono font-semibold border border-brand-500/20">
                      <i data-lucide="cpu" class="w-3 h-3 text-brand-400"></i>
                      <span>Modular Uplink Bay</span>
                    </span>
                    ${attachedSled ? `
                      <span class="text-[10px] text-slate-400 font-mono">Installed: <span class="text-slate-200 font-semibold">${escapeHTML(attachedSled.sku)}</span> (${attachedSled.qty}x)</span>
                    ` : `
                      <span class="text-[10px] text-amber-400/90 font-mono">No module installed</span>
                    `}
                    ${item.stackedUnits > 2 ? `
                      <button
                        type="button"
                        onclick="setBomUplinkStackPolicy('${item.instanceId}', '${(item.uplinkModuleStackPolicy || 'first_last') === 'first_last' ? 'all' : 'first_last'}')"
                        class="px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold border cursor-pointer transition-colors ${(item.uplinkModuleStackPolicy || 'first_last') === 'first_last' ? 'bg-cyan-950/80 text-cyan-300 border-cyan-700/60 hover:bg-cyan-900' : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'}"
                        title="Click to toggle between populating 1st &amp; Last stack members only vs all stack members"
                      >
                        ${(item.uplinkModuleStackPolicy || 'first_last') === 'first_last' ? '1st &amp; Last Only (2x)' : `All Members (${item.qty}x)`}
                      </button>
                    ` : ''}
                  </div>
                  ${attachedSled ? `
                    <span class="font-mono text-emerald-400 font-semibold text-xs">${((attachedSled.msrp || 0) * (attachedSled.qty || 1)).toLocaleString()}</span>
                  ` : ''}
                </div>

                <div class="flex items-center gap-2">
                  <select 
                    onchange="changeBomUplinkModule('${item.instanceId}', this.value)" 
                    class="w-full bg-slate-900 border border-slate-700/80 hover:border-slate-600 text-slate-200 text-xs font-medium rounded-md px-2 py-1 focus:outline-none focus:border-brand-500 cursor-pointer shadow-sm transition-colors"
                    title="Select expansion sled to install in modular uplink slot"
                  >
                    <option value="none" ${!attachedSled ? 'selected' : ''}>-- Empty Bay (No Module) --</option>
                    ${(catSw.modularUplink.supportedModules || []).map(mSku => {
                      const mod = (typeof MODULAR_UPLINK_CATALOG !== 'undefined') ? MODULAR_UPLINK_CATALOG[mSku] : null;
                      const isSel = attachedSled && (attachedSled.sku === mSku || attachedSled.id === mSku);
                      const label = mod ? `${mod.name} (${mSku}) - $${mod.msrp.toLocaleString()}` : mSku;
                      return `<option value="${escapeHTML(mSku)}" ${isSel ? 'selected' : ''}>${escapeHTML(label)}</option>`;
                    }).join('')}
                  </select>
                </div>
              </div>
            </div>
          ` : ''}

          <!-- Other Attached Sub-items (Child transceivers, licenses, PSUs) -->
          ${otherChildItems.length > 0 ? `
            <div class="pt-1.5 space-y-1">
              ${otherChildItems.map(ch => `
                <div class="flex items-center gap-2 text-[11px] text-slate-400 bg-slate-950/60 border border-slate-800/80 px-2 py-1 rounded-lg">
                  <i data-lucide="corner-down-right" class="w-3 h-3 text-brand-400 shrink-0"></i>
                  <span class="text-slate-200 font-medium truncate">${escapeHTML(ch.model)}</span>
                  <span class="px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 text-[10px] font-mono border border-slate-800">${escapeHTML(ch.role)}</span>
                  <span class="text-slate-500 font-mono text-[10px]">SKU: ${escapeHTML(ch.sku)}</span>
                  <span class="ml-auto font-mono text-emerald-400 font-semibold text-xs">$${((ch.msrp || 0) * (ch.qty || 1)).toLocaleString()}</span>
                  <span class="text-[10px] text-slate-500 font-mono">(${ch.qty}x)</span>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      </td>

      <!-- Col 2: Placement & Enclosure -->
      <td class="py-3 px-4 align-top">
        <div class="space-y-1.5">
          <div class="flex items-center gap-1.5">
            <i data-lucide="${isUnassigned ? 'inbox' : (currentLocationKey.endsWith(' • Field') ? 'radio' : 'map-pin')}" class="w-3.5 h-3.5 ${isUnassigned ? 'text-amber-400' : (currentLocationKey.endsWith(' • Field') ? 'text-cyan-400' : 'text-indigo-400')} shrink-0"></i>
            <select 
              onchange="handleLocationDropdownChange(this, (newLoc) => setItemLocation('${item.instanceId}', newLoc))" 
              data-previous-val="${escapeHTML(currentLocationKey)}" 
              class="w-full bg-slate-900 border border-slate-700/80 text-slate-200 text-xs font-semibold rounded-lg px-2 py-1 focus:outline-none focus:border-brand-500 truncate cursor-pointer shadow-sm" 
              title="Change Assigned Space or Rack Enclosure"
            >
              ${renderBomLocationOptions(currentLocationKey, item)}
            </select>
          </div>

          <div class="flex items-center gap-1.5 flex-wrap">
            ${uPosition ? `
              <span class="px-2 py-0.5 rounded bg-sky-950/60 border border-sky-800 text-[10px] font-mono text-sky-300 font-bold flex items-center gap-1" title="Mounted at Rack Unit ${uPosition}">
                <i data-lucide="server" class="w-3 h-3 text-sky-400"></i>
                <span>${uPosition}</span>
              </span>
            ` : ''}

            ${mountLabel ? `
              <span class="px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800 text-[10px] font-mono text-cyan-300 font-semibold flex items-center gap-1" title="Mounting Method: ${mountLabel}">
                <i data-lucide="anchor" class="w-3 h-3 text-cyan-400"></i>
                <span>${mountLabel}</span>
              </span>
            ` : ''}

            ${item.closetName && !isUnassigned ? `
              <button 
                type="button" 
                onclick="openRackViewerFor('${escapeJSAttr(item.closetName || item.rackId)}')"
                class="px-2 py-0.5 rounded bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-800/60 text-indigo-300 hover:text-white text-[10px] font-mono flex items-center gap-1 transition-colors cursor-pointer"
                title="View in Rack Elevation Visualizer"
              >
                <i data-lucide="layout-grid" class="w-2.5 h-2.5"></i>
                <span>View Rack</span>
              </button>
            ` : ''}
          </div>
        </div>
      </td>

      <!-- Col 3: Engineering, Power & Stacking -->
      <td class="py-3 px-4 align-top">
        <div class="space-y-1.5 text-xs">
          <!-- Power badges -->
          <div class="flex items-center gap-2 flex-wrap">
            ${item.poeBudget > 0 ? `
              <span class="px-2 py-0.5 rounded bg-amber-950/70 border border-amber-700/60 text-amber-300 font-mono text-[11px] font-bold flex items-center gap-1" title="PoE Power Budget">
                <i data-lucide="zap" class="w-3 h-3 text-amber-400"></i>
                <span>${item.poeBudget}W PoE</span>
              </span>
            ` : ''}

            ${item.baseWatts > 0 ? `
              <span class="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 font-mono text-[10px]" title="Base System Power Consumption">
                ${item.baseWatts}W Base
              </span>
            ` : ''}

            ${isCameraItem ? `
              <span class="px-2 py-0.5 rounded ${(item.maxPowerWatts || 0) >= 50 ? 'bg-rose-950/70 border border-rose-700/60 text-rose-300' : ((item.maxPowerWatts || 0) >= 25 ? 'bg-sky-950/70 border border-sky-700/60 text-sky-300' : 'bg-amber-950/70 border border-amber-700/60 text-amber-300')} font-mono text-[10px] font-bold flex items-center gap-1" title="Camera PoE Power Draw & Standard">
                <i data-lucide="zap" class="w-3 h-3"></i>
                <span>${item.powerConsumptionWatts || 8}W / ${item.maxPowerWatts || 15.4}W (${escapeHTML(item.poeStandard || '802.3af')})</span>
              </span>
              <span class="px-2 py-0.5 rounded bg-teal-950/60 border border-teal-800/60 text-teal-300 font-mono text-[10px] flex items-center gap-1" title="Camera Video Stream Bitrate & Resolution">
                <i data-lucide="video" class="w-3 h-3 text-teal-400"></i>
                <span>${item.heads || 1}x ${item.mpPerHead || item.sensorMegapixels || 2}MP &bull; ${item.streamBitrateMbps || 4} Mbps</span>
              </span>
            ` : ''}

            ${pwrBadge ? `
              <span class="px-2 py-0.5 rounded ${pwrBadge.bgClass || 'bg-slate-900 border border-slate-700 text-slate-300'} font-mono text-[10px] flex items-center gap-1" title="Power Source: ${pwrBadge.label}">
                <i data-lucide="${pwrBadge.icon || 'plug'}" class="w-3 h-3"></i>
                <span>${pwrBadge.label}</span>
              </span>
            ` : ''}
          </div>

          <!-- Stacking / Uplink details -->
          <div class="flex items-center gap-2 flex-wrap">
            ${isStackable ? `
              <div class="flex items-center gap-1.5">
                <span class="text-[10px] font-mono px-2 py-0.5 rounded border ${isStack ? 'bg-indigo-950/60 border-indigo-500/40 text-indigo-300 font-bold' : 'bg-slate-900 border-slate-800 text-slate-400'} flex items-center gap-1">
                  <i data-lucide="layers" class="w-3 h-3 ${isStack ? 'text-indigo-400' : 'text-slate-500'}"></i>
                  <span>${isStack ? `${item.stackedUnits}-Switch Stack` : 'Standalone (1 Chassis)'}</span>
                </span>
                ${isStack ? `
                  <button 
                    type="button" 
                    onclick="if (typeof toggleStackPatchPanel === 'function') toggleStackPatchPanel('${item.instanceId}')"
                    class="px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all flex items-center gap-1 border cursor-pointer ${item.patchPanelBetween ? 'bg-purple-900/80 text-purple-200 border-purple-500 hover:bg-purple-800' : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 hover:text-white'}"
                    title="${item.patchPanelBetween ? `Remove ${ppCfg.ports}-port (${ppCfg.sku}) patch panel between stacked switches` : `Place ${ppCfg.rackUnits}U ${ppCfg.ports}-port (${ppCfg.sku}) patch panel in between stacked switches`}"
                  >
                    <i data-lucide="${item.patchPanelBetween ? 'check-square' : 'plus-square'}" class="w-2.5 h-2.5 ${item.patchPanelBetween ? 'text-purple-400' : 'text-slate-400'}"></i>
                    <span>${item.patchPanelBetween ? `${ppCfg.btwnShortLabel || ppCfg.shortLabel} Patch In-Between` : `+ ${ppCfg.btwnShortLabel || ppCfg.shortLabel} Patch`}</span>
                  </button>
                  ${hasStackPower ? `
                    <button
                      type="button"
                      onclick="toggleSwitchStackPower('${item.instanceId}')"
                      class="px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all flex items-center gap-1 border cursor-pointer ${item.stackPowerEnabled !== false ? 'bg-amber-950/85 text-amber-200 border-amber-500/70 hover:bg-amber-900' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'}"
                      title="Toggle Cisco StackPower shared power backplane ring cables"
                    >
                      <i data-lucide="zap" class="w-2.5 h-2.5 ${item.stackPowerEnabled !== false ? 'text-amber-400' : 'text-slate-500'}"></i>
                      <span>${item.stackPowerEnabled !== false ? 'StackPower ON' : '+ StackPower'}</span>
                    </button>
                  ` : ''}
                ` : ''}
              </div>
            ` : ''}

            ${item.uplinkTargetId ? `
              <span class="px-2 py-0.5 rounded bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 text-[10px] font-mono flex items-center gap-1" title="Uplink configured in Topology">
                <i data-lucide="link" class="w-2.5 h-2.5 text-emerald-400"></i>
                <span>Linked</span>
              </span>
            ` : ''}
          </div>
        </div>
      </td>

      <!-- Col 4: Pricing & Quantity -->
      <td class="py-3 px-4 align-top">
        <div class="space-y-1.5">
          <div class="flex items-center gap-3">
            <div>
              <div class="text-sm font-mono font-bold text-emerald-400 tracking-tight" title="${childCost > 0 ? `Hardware: $${totalItemCost.toLocaleString()} + Attached Options: $${childCost.toLocaleString()}` : ''}">$${totalRowCost.toLocaleString()}</div>
              <div class="text-[10px] text-slate-400 font-mono">($${(item.msrp || 0).toLocaleString()} ea${childCost > 0 ? ` + $${childCost.toLocaleString()} opts` : ''})</div>
            </div>

            <!-- Qty Stepper -->
            <div class="flex items-center bg-slate-900 border border-slate-700/80 rounded-xl overflow-hidden shadow-inner">
              <button onclick="changeBomQty('${item.instanceId}', -1)" class="px-2.5 py-1 text-slate-400 hover:text-white hover:bg-slate-800 font-bold transition-colors text-xs cursor-pointer" title="Decrease Quantity">-</button>
              <span class="px-2 text-xs font-mono font-bold text-white min-w-[24px] text-center">${item.qty}</span>
              <button onclick="changeBomQty('${item.instanceId}', 1)" class="px-2.5 py-1 text-slate-400 hover:text-white hover:bg-slate-800 font-bold transition-colors text-xs cursor-pointer" title="Increase Quantity">+</button>
            </div>
          </div>
        </div>
      </td>

      <!-- Col 5: Actions -->
      <td class="py-3 px-4 align-top text-right">
        <div class="flex items-center justify-end gap-1">
          <!-- Configure Accessories, PSUs, Mounts, StackPower & Patch Panels -->
          <button
            type="button"
            onclick="openBomItemAccessoriesModal('${item.instanceId}')"
            class="px-2 py-1.5 rounded-lg bg-slate-900 hover:bg-cyan-950/80 border border-slate-800 hover:border-cyan-700/70 text-cyan-300 hover:text-cyan-200 text-[10px] font-mono font-bold flex items-center gap-1 transition-colors cursor-pointer"
            title="Add or change accessories: Power Supplies, Rack Mounts, Uplink Modules, StackPower, 48P Patch Panels &amp; Licenses"
          >
            <i data-lucide="sliders-horizontal" class="w-3.5 h-3.5"></i>
            <span class="hidden xl:inline">Options</span>
          </button>

          <!-- Replace / Swap Hardware Model in Place -->
          <button
            type="button"
            onclick="openReplaceBomItemModal('${item.instanceId}')"
            class="px-2 py-1.5 rounded-lg bg-slate-900 hover:bg-purple-950/80 border border-slate-800 hover:border-purple-700/70 text-purple-300 hover:text-purple-200 text-[10px] font-mono font-bold flex items-center gap-1 transition-colors cursor-pointer"
            title="Replace / Swap this hardware model for another catalog part while keeping location, rack slot, connections &amp; drops"
          >
            <i data-lucide="repeat" class="w-3.5 h-3.5"></i>
            <span class="hidden xl:inline">Swap</span>
          </button>

          <!-- Jump to Topology -->
          <button 
            type="button" 
            onclick="jumpToTopologyTarget('node:${item.instanceId}')" 
            class="p-1.5 rounded-lg bg-slate-900 hover:bg-indigo-950/80 border border-slate-800 hover:border-indigo-800/60 text-slate-400 hover:text-indigo-300 transition-colors cursor-pointer"
            title="Inspect ports, wire speeds, and logical uplinks in Topology"
          >
            <i data-lucide="network" class="w-3.5 h-3.5"></i>
          </button>

          <!-- Jump to Physical Blueprint -->
          <button 
            type="button" 
            onclick="jumpToPhysicalLayoutTarget('${item.instanceId}')" 
            class="p-1.5 rounded-lg bg-slate-900 hover:bg-amber-950/80 border border-slate-800 hover:border-amber-800/60 text-slate-400 hover:text-amber-300 transition-colors cursor-pointer"
            title="Inspect blueprint, floor drops, and cable pathways in Physical Layout"
          >
            <i data-lucide="map" class="w-3.5 h-3.5"></i>
          </button>

          <!-- Delete Item -->
          <button 
            type="button" 
            onclick="removeBomItem('${item.instanceId}')" 
            class="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/80 border border-slate-800 hover:border-rose-800/60 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
            title="Remove equipment from BOM"
          >
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      </td>
    </tr>
  `;
}

// -----------------------------------------------------------
// Location Accordion Renderer
// -----------------------------------------------------------
function renderBomLocationAccordion(locKey, items) {
  let locWatts = 0, locCost = 0, locUnits = 0;
  items.forEach(it => {
    locUnits += (it.qty || 1);
    locWatts += ((it.poeBudget || 0) + (it.baseWatts || 0)) * (it.qty || 1);
    locCost += (it.msrp || 0) * (it.qty || 1);
    ((window._cachedBomChildrenMap && window._cachedBomChildrenMap.get(it.instanceId)) || projectBOM.filter(ch => ch.parentInstanceId === it.instanceId)).forEach(ch => {
      locCost += (ch.msrp || 0) * (ch.qty || 1);
      locWatts += (ch.baseWatts || 0) * (ch.qty || 1);
    });
  });

  const isUnassigned = typeof FacilityStore !== "undefined" && locKey === FacilityStore.UNASSIGNED;
  const isCollapsed = bomCollapsedLocations.has(locKey);

  return `
    <div class="bg-slate-950/90 rounded-2xl border ${isUnassigned ? 'border-amber-900/40 bg-amber-950/10' : 'border-slate-800'} overflow-hidden shadow-sm transition-all">
      <!-- Accordion Header Banner -->
      <div 
        onclick="toggleBomLocationCollapse('${escapeJSAttr(locKey)}')" 
        class="px-4 py-3 bg-slate-900/90 hover:bg-slate-900 border-b border-slate-800/80 flex items-center justify-between gap-3 cursor-pointer select-none transition-colors"
      >
        <div class="flex items-center gap-3">
          <i data-lucide="${isCollapsed ? 'chevron-right' : 'chevron-down'}" class="w-4 h-4 text-slate-400 transition-transform"></i>
          <div class="p-1.5 rounded-lg ${isUnassigned ? 'bg-amber-950/80 text-amber-400 border border-amber-800/60' : 'bg-indigo-950/80 text-indigo-400 border border-indigo-800/60'}">
            <i data-lucide="${isUnassigned ? 'inbox' : (locKey.endsWith(' • Field') ? 'radio' : 'map-pin')}" class="w-4 h-4"></i>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-sm font-bold ${isUnassigned ? 'text-amber-300' : 'text-white'}">
                ${isUnassigned ? 'Unassigned Equipment (Staging)' : escapeHTML(locKey)}
              </span>
              <span class="px-2 py-0.2 rounded-full ${isUnassigned ? 'bg-amber-950/80 text-amber-300 border border-amber-800' : 'bg-slate-800 text-slate-300 border border-slate-700'} text-[10px] font-mono font-bold">
                ${locUnits} ${locUnits === 1 ? 'unit' : 'units'} (${items.length} ${items.length === 1 ? 'device' : 'devices'})
              </span>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2 text-xs font-mono">
            <span class="text-slate-400">${locWatts}W Load</span>
            <span class="text-slate-600">&bull;</span>
            <span class="font-bold text-emerald-400 text-sm">$${Math.round(locCost).toLocaleString()}</span>
          </div>

          ${!isUnassigned ? `
            <button 
              type="button" 
              onclick="event.stopPropagation(); openRackViewerFor('${escapeJSAttr(locKey)}')" 
              class="px-2.5 py-1 bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-800/60 text-indigo-300 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Open Enclosure Visualizer"
            >
              <i data-lucide="server" class="w-3.5 h-3.5"></i>
              <span>Enclosure</span>
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Accordion Body: Table -->
      ${!isCollapsed ? `
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-950/90 text-[10px] font-mono uppercase text-slate-400 border-b border-slate-800">
                <th class="py-2.5 px-4 font-bold w-[34%]">Item & Specification</th>
                <th class="py-2.5 px-4 font-bold w-[18%]">Placement / Rack Slot</th>
                <th class="py-2.5 px-4 font-bold w-[22%]">Engineering & Power</th>
                <th class="py-2.5 px-4 font-bold w-[16%]">Pricing & Quantity</th>
                <th class="py-2.5 px-4 font-bold w-[10%] text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(it => renderBomTableRow(it)).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}
    </div>
  `;
}

// -----------------------------------------------------------
// Category Accordion Renderer
// -----------------------------------------------------------
function renderBomCategoryAccordion(catKey, catMeta, items) {
  let catWatts = 0, catCost = 0, catUnits = 0;
  items.forEach(it => {
    catUnits += (it.qty || 1);
    catWatts += ((it.poeBudget || 0) + (it.baseWatts || 0)) * (it.qty || 1);
    catCost += (it.msrp || 0) * (it.qty || 1);
    ((window._cachedBomChildrenMap && window._cachedBomChildrenMap.get(it.instanceId)) || projectBOM.filter(ch => ch.parentInstanceId === it.instanceId)).forEach(ch => {
      catCost += (ch.msrp || 0) * (ch.qty || 1);
      catWatts += (ch.baseWatts || 0) * (ch.qty || 1);
    });
  });

  const isCollapsed = bomCollapsedLocations.has(catKey);

  return `
    <div class="bg-slate-950/90 rounded-2xl border border-slate-800 overflow-hidden shadow-sm transition-all">
      <!-- Accordion Header Banner -->
      <div 
        onclick="toggleBomLocationCollapse('${escapeJSAttr(catKey)}')" 
        class="px-4 py-3 bg-slate-900/90 hover:bg-slate-900 border-b border-slate-800/80 flex items-center justify-between gap-3 cursor-pointer select-none transition-colors"
      >
        <div class="flex items-center gap-3">
          <i data-lucide="${isCollapsed ? 'chevron-right' : 'chevron-down'}" class="w-4 h-4 text-slate-400 transition-transform"></i>
          <div class="p-1.5 rounded-lg bg-indigo-950/80 text-indigo-400 border border-indigo-800/60">
            <i data-lucide="${catMeta.icon || 'box'}" class="w-4 h-4"></i>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-sm font-bold text-white">
                ${escapeHTML(catMeta.label)}
              </span>
              <span class="px-2 py-0.2 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-mono font-bold">
                ${catUnits} ${catUnits === 1 ? 'unit' : 'units'} (${items.length} ${items.length === 1 ? 'device' : 'devices'})
              </span>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2 text-xs font-mono">
            <span class="text-slate-400">${catWatts}W Load</span>
            <span class="text-slate-600">&bull;</span>
            <span class="font-bold text-emerald-400 text-sm">$${Math.round(catCost).toLocaleString()}</span>
          </div>
        </div>
      </div>

      <!-- Accordion Body: Table -->
      ${!isCollapsed ? `
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-950/90 text-[10px] font-mono uppercase text-slate-400 border-b border-slate-800">
                <th class="py-2.5 px-4 font-bold w-[34%]">Item & Specification</th>
                <th class="py-2.5 px-4 font-bold w-[18%]">Placement / Rack Slot</th>
                <th class="py-2.5 px-4 font-bold w-[22%]">Engineering & Power</th>
                <th class="py-2.5 px-4 font-bold w-[16%]">Pricing & Quantity</th>
                <th class="py-2.5 px-4 font-bold w-[10%] text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(it => renderBomTableRow(it)).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}
    </div>
  `;
}

// -----------------------------------------------------------
// Flat Procurement Order Table Renderer
// -----------------------------------------------------------
function renderBomFlatTable(skuList, totalUniqueSkus, totalRawCount, totalOrderCost) {
  return `
    <div class="space-y-4">
      <!-- Flat Order Summary Header -->
      <div class="p-4 bg-slate-900 border border-indigo-900/60 rounded-2xl flex items-center justify-between gap-3 shadow-sm select-none">
        <div class="flex items-center gap-3">
          <div class="p-2.5 rounded-xl bg-indigo-950 border border-indigo-700/60 text-indigo-400">
            <i data-lucide="package-check" class="w-5 h-5"></i>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-sm font-bold text-white">Flat Procurement Order</span>
              <span class="px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800 text-[10px] font-mono font-bold">RAW SKU COUNTS</span>
            </div>
            <span class="text-xs text-slate-400 font-mono">${totalUniqueSkus} Unique SKUs &bull; ${totalRawCount} Total Raw Units &bull; Consolidated Regardless of Location</span>
          </div>
        </div>
        <div class="text-right">
          <span class="text-[10px] text-slate-400 uppercase font-mono block">Order Total</span>
          <span class="text-base font-mono font-bold text-emerald-400">$${Math.round(totalOrderCost).toLocaleString()}</span>
        </div>
      </div>

      <!-- Raw SKU Table -->
      <div class="bg-slate-950/90 rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-950 text-[10px] font-mono uppercase text-slate-400 border-b border-slate-800">
                <th class="py-2.5 px-4 font-bold w-[34%]">Part & Catalog Specification</th>
                <th class="py-2.5 px-4 font-bold w-[28%]">Location Allocations</th>
                <th class="py-2.5 px-4 font-bold w-[14%]">Power Draw</th>
                <th class="py-2.5 px-4 font-bold w-[16%]">Pricing & Quantity</th>
                <th class="py-2.5 px-4 font-bold w-[8%] text-right">Delete</th>
              </tr>
            </thead>
            <tbody>
              ${skuList.map(s => renderBomFlatTableRow(s)).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function renderBomFlatTableRow(skuItem) {
  const locEntries = Object.entries(skuItem.locations);
  const locSummary = locEntries.map(([loc, count]) => `${loc}: ${count}`).join(" • ");

  return `
    <tr class="border-b border-slate-800/80 hover:bg-slate-900/50 transition-colors">
      <td class="py-3 px-4 align-top">
        <div class="space-y-1">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-xs font-bold text-white tracking-tight">${escapeHTML(skuItem.model)}</span>
            ${skuItem.vendor ? `<span class="px-1.5 py-0.2 rounded bg-slate-900 border border-slate-700 text-[10px] font-mono text-slate-300">${escapeHTML(skuItem.vendor)}</span>` : ''}
            <span class="px-1.5 py-0.2 rounded bg-indigo-950/80 border border-indigo-800/80 text-[10px] font-mono text-indigo-300 font-semibold">SKU: ${escapeHTML(skuItem.sku)}</span>
          </div>
          <div class="text-[11px] text-slate-400 font-mono">
            <span>${escapeHTML(skuItem.role)}</span>
          </div>
        </div>
      </td>

      <td class="py-3 px-4 align-top">
        <div class="flex items-center gap-1.5 text-xs text-slate-300">
          <i data-lucide="map-pin" class="w-3.5 h-3.5 text-indigo-400 shrink-0"></i>
          <span class="font-mono text-[11px] truncate" title="${escapeHTML(locSummary)}">${escapeHTML(locSummary)}</span>
        </div>
      </td>

      <td class="py-3 px-4 align-top font-mono text-xs text-slate-400">
        ${skuItem.totalWatts > 0 ? `<span class="text-slate-200 font-semibold">${Math.round(skuItem.totalWatts)}W</span> Total` : '<span class="text-slate-600">-</span>'}
      </td>

      <td class="py-3 px-4 align-top">
        <div class="flex items-center gap-3">
          <div>
            <div class="text-xs font-mono font-bold text-emerald-400">$${Math.round(skuItem.totalCost).toLocaleString()}</div>
            <div class="text-[10px] text-slate-400 font-mono">($${(skuItem.msrp || 0).toLocaleString()} ea)</div>
          </div>
          <div class="flex items-center bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-inner">
            <button onclick="changeRawSkuQty('${escapeJSAttr(skuItem.sku)}', -1)" class="px-2 py-1 text-slate-400 hover:text-white font-bold transition-colors text-xs cursor-pointer" title="Decrease Total Quantity">-</button>
            <span class="px-2 text-xs font-mono font-bold text-white min-w-[24px] text-center">${skuItem.rawQty}</span>
            <button onclick="changeRawSkuQty('${escapeJSAttr(skuItem.sku)}', 1)" class="px-2 py-1 text-slate-400 hover:text-white font-bold transition-colors text-xs cursor-pointer" title="Increase Total Quantity">+</button>
          </div>
        </div>
      </td>

      <td class="py-3 px-4 align-top text-right">
        <button onclick="deleteRawSkuFromBOM('${escapeJSAttr(skuItem.sku)}')" class="text-slate-500 hover:text-rose-400 p-1.5 transition-colors rounded-lg hover:bg-slate-900 cursor-pointer" title="Delete all units of this SKU">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
      </td>
    </tr>
  `;
}

// Backwards-compatible card wrappers
function renderBomFlatSkuItemHtml(skuItem) {
  return renderBomFlatTableRow(skuItem);
}

function renderBomSingleItemHtml(item) {
  return renderBomTableRow(item);
}

function changeRawSkuQty(skuKey, delta) {
  if (typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) return;

  const matchingItems = projectBOM.filter(item => {
    const key = String(item.sku || item.id || item.model || '').trim();
    return key === skuKey;
  });

  if (matchingItems.length === 0) return;

  if (delta > 0) {
    const unassignedItem = matchingItems.find(it => {
      const loc = typeof FacilityStore !== "undefined" ? FacilityStore.normalize(it.closetName || it.rackId) : it.closetName;
      return loc === FacilityStore.UNASSIGNED;
    }) || matchingItems[0];

    const isCamera = unassignedItem.role === "Camera" || unassignedItem.role === "Surveillance" || unassignedItem.role === "Video" ||
                     (unassignedItem.category && unassignedItem.category.toLowerCase().includes("camera")) ||
                     (unassignedItem.deviceTypePrefix === "CAM" || unassignedItem.deviceTypePrefix === "LPR") ||
                     (typeof DeviceTaxonomy !== "undefined" && DeviceTaxonomy.getDeviceType && ["CAM", "LPR"].includes(DeviceTaxonomy.getDeviceType(unassignedItem).prefix));

    if (isCamera) {
      changeBomQty(unassignedItem.instanceId, 1);
    } else {
      unassignedItem.qty = (unassignedItem.qty || 1) + 1;
      if (typeof FacilityStore !== "undefined") FacilityStore.notifyWorkspaceChange();
      updateBOMView();
      if (typeof StorageService !== "undefined" && typeof StorageService.queueAutoSave === "function") {
        StorageService.queueAutoSave();
      }
    }
  } else if (delta < 0) {
    const unassignedItem = matchingItems.slice().reverse().find(it => {
      const loc = typeof FacilityStore !== "undefined" ? FacilityStore.normalize(it.closetName || it.rackId) : it.closetName;
      return loc === FacilityStore.UNASSIGNED;
    }) || matchingItems[matchingItems.length - 1];

    if ((unassignedItem.qty || 1) > 1) {
      unassignedItem.qty = (unassignedItem.qty || 1) - 1;
      if (typeof FacilityStore !== "undefined") FacilityStore.notifyWorkspaceChange();
      updateBOMView();
      if (typeof StorageService !== "undefined" && typeof StorageService.queueAutoSave === "function") {
        StorageService.queueAutoSave();
      }
    } else {
      if (matchingItems.length > 1) {
        deleteDeviceFromBOM(unassignedItem.instanceId, true);
      } else {
        deleteDeviceFromBOM(unassignedItem.instanceId);
      }
    }
  }
}

function deleteRawSkuFromBOM(skuKey) {
  if (typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) return;

  const matchingItems = projectBOM.filter(item => {
    const key = String(item.sku || item.id || item.model || '').trim();
    return key === skuKey;
  });

  if (matchingItems.length === 0) return;

  const skuName = matchingItems[0].model || skuKey;
  const totalUnits = matchingItems.reduce((acc, x) => acc + (x.qty || 1), 0);
  if (!confirm(`Are you sure you want to remove all ${totalUnits} unit(s) of ${skuName} from the project BOM?`)) {
    return;
  }

  matchingItems.forEach(ch => {
    if (ch.parentInstanceId && ch.buildOptionCategory) {
      const parentSrv = projectBOM.find(p => p.instanceId === ch.parentInstanceId);
      if (parentSrv && parentSrv.selectedBuildOptions) {
        delete parentSrv.selectedBuildOptions[ch.buildOptionCategory];
      }
    }
  });
  const idsToDelete = matchingItems.map(x => x.instanceId);
  idsToDelete.forEach(id => {
    deleteDeviceFromBOM(id, true);
  });

  if (typeof showToast === "function") {
    showToast(`Removed all ${totalUnits} unit(s) of ${skuName} from BOM.`);
  }
}

// -----------------------------------------------------------
// Cloud Licensing Manager Modal
// -----------------------------------------------------------
function toggleLicenseModal() {
  const modal = document.getElementById("licenseModal");
  if (!modal) return;

  if (modal.classList.contains("hidden")) {
    modal.classList.remove("hidden");
    renderLicenseManagerContent();
  } else {
    modal.classList.add("hidden");
  }
}

function getAvailableTermsInBOM() {
  const parentItems = projectBOM.filter(i => !i.parentInstanceId && (i.role === "Access" || i.role === "Core" || i.role === "Aggregation" || i.role === "Security WAN"));
  const termSet = new Set();

  parentItems.forEach(item => {
    const vendorCatalog = MGMT_SUBSCRIPTION_CATALOG[item.vendor] || {};
    Object.values(vendorCatalog).forEach(profile => {
      if (profile && profile.terms) {
        Object.keys(profile.terms).forEach(termKey => {
          if (termKey !== "PERP") termSet.add(termKey);
        });
      }
    });
  });

  const standardOrder = ["1YR", "2YR", "3YR", "5YR", "7YR", "10YR"];
  return standardOrder.filter(t => termSet.has(t));
}

function renderLicenseManagerContent() {
  const container = document.getElementById("licenseManagerContent");
  if (!container) return;

  const parentDevices = projectBOM.filter(i => !i.parentInstanceId && (i.role === "Access" || i.role === "Core" || i.role === "Aggregation" || i.role === "Security WAN"));

  if (parentDevices.length === 0) {
    container.innerHTML = `
      <div class="py-12 text-center text-slate-500 text-xs">
        <p class="font-semibold text-slate-400">No manageable devices in the BOM.</p>
        <p class="mt-1">Add switches or firewalls to configure licensing terms.</p>
      </div>`;
    return;
  }

  const availableTerms = getAvailableTermsInBOM();
  if (availableTerms.length > 0 && !availableTerms.includes(globalSelectedTerm)) {
    globalSelectedTerm = availableTerms[0];
  }

  const deployedVendors = [...new Set(parentDevices.map(d => d.vendor))];

  container.innerHTML = `
    <div class="space-y-4 text-xs">
      <div class="bg-slate-900 p-3.5 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span class="font-bold text-white text-sm block">Global Subscription Duration:</span>
          <span class="text-slate-400 text-[11px]">Only durations supported by your quoted hardware are shown.</span>
        </div>
        <div class="flex items-center gap-1.5">
          ${availableTerms.map(term => `
            <button onclick="setGlobalTerm('${term}')" class="px-2.5 py-1 rounded text-xs font-mono font-bold border transition-all ${globalSelectedTerm === term ? 'bg-purple-600 border-purple-400 text-white shadow-md' : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-white'}">
              ${term}
            </button>
          `).join('')}
        </div>
      </div>

      <div class="bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-2">
        <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Batch Assign Management by Manufacturer:</span>
        <div class="flex flex-wrap gap-2">
          ${deployedVendors.map(vendor => {
            const vendorProfiles = MGMT_SUBSCRIPTION_CATALOG[vendor] || {};
            const profileKeys = Object.keys(vendorProfiles);
            if (profileKeys.length === 0) return '';

            return profileKeys.map(pKey => `
              <button onclick="setVendorManagementProfile('${vendor}', '${pKey}')" class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-purple-900/40 border border-slate-700 hover:border-purple-500/50 text-[11px] text-slate-300 hover:text-purple-200 transition-colors flex items-center gap-1.5">
                <span class="font-bold text-white">${vendor}:</span>
                <span>${vendorProfiles[pKey].name}</span>
              </button>
            `).join('');
          }).join('')}
          <button onclick="clearAllManagementLicenses()" class="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-400 hover:text-rose-300 transition-colors">
            Set All to Standalone ($0)
          </button>
        </div>
      </div>

      <div class="space-y-2">
        <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Individual Device Management Routing:</span>
        <div class="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/80">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="bg-slate-950/90 text-[10px] font-mono uppercase text-slate-400 border-b border-slate-800">
                <th class="py-2.5 px-3.5 font-bold">Hardware Model &amp; Vendor</th>
                <th class="py-2.5 px-3.5 font-bold">Quantity &amp; Assigned Location</th>
                <th class="py-2.5 px-3.5 font-bold">Management Platform / License Tier</th>
                <th class="py-2.5 px-3.5 font-bold">Subscription Term</th>
                <th class="py-2.5 px-3.5 font-bold text-right">Extended Cost</th>
              </tr>
            </thead>
            <tbody>
              ${parentDevices.map(dev => {
                const vendorProfiles = MGMT_SUBSCRIPTION_CATALOG[dev.vendor] || {};
                const currentMgmtItem = projectBOM.find(i => i.parentInstanceId === dev.instanceId && (i.role === "Mgmt License" || i.role === "Security License"));
                
                let activeKey = dev.selectedMgmtProfile;
                if (!activeKey || (!vendorProfiles[activeKey] && activeKey !== "standalone")) {
                  activeKey = dev.vendor === "Meraki" ? "cloud" : "standalone";
                  dev.selectedMgmtProfile = activeKey;
                }

                const activeProfile = vendorProfiles[activeKey];
                const deviceSupportedTerms = (activeProfile && activeProfile.terms) ? Object.keys(activeProfile.terms).filter(t => t !== "PERP") : [];
                const rawLoc = dev.closetName || dev.rackId || FacilityStore.UNASSIGNED;
                const locationLabel = typeof FacilityStore !== "undefined" ? FacilityStore.normalize(rawLoc) : rawLoc;

                return `
                  <tr class="border-b border-slate-800/70 hover:bg-slate-850/40 transition-colors">
                    <td class="py-2.5 px-3.5">
                      <div class="flex items-center gap-2">
                        <span class="font-bold text-white">${dev.model}</span>
                        <span class="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 border border-slate-700 text-slate-400 font-mono">${dev.vendor}</span>
                      </div>
                    </td>
                    <td class="py-2.5 px-3.5 font-mono text-[11px] text-slate-300">
                      <span class="font-bold text-white">${dev.qty}x</span> units &bull; <span class="text-slate-400">${locationLabel}</span>
                    </td>
                    <td class="py-2.5 px-3.5">
                      <select onchange="updateSwitchMgmtProfile('${dev.instanceId}', this.value)" class="w-full bg-slate-950 border border-slate-700 text-purple-300 font-semibold rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-purple-500">
                        ${Object.entries(vendorProfiles).map(([pKey, pData]) => `
                          <option value="${pKey}" ${activeKey === pKey ? 'selected' : ''}>${pData.name}</option>
                        `).join('')}
                        ${dev.vendor !== "Meraki" && !vendorProfiles.standalone ? `
                          <option value="standalone" ${activeKey === 'standalone' ? 'selected' : ''}>Standalone / Air-Gapped CLI ($0)</option>
                        ` : ''}
                      </select>
                    </td>
                    <td class="py-2.5 px-3.5">
                      ${deviceSupportedTerms.length > 1 ? `
                        <div class="inline-flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                          ${deviceSupportedTerms.map(t => `
                            <button onclick="setIndividualDeviceTerm('${dev.instanceId}', '${t}')" class="px-1.5 py-0.5 text-[10px] font-mono rounded font-bold ${dev.individualTerm === t || (!dev.individualTerm && globalSelectedTerm === t) ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}">
                              ${t}
                            </button>
                          `).join('')}
                        </div>
                      ` : `<span class="text-[11px] font-mono text-slate-500">N/A</span>`}
                    </td>
                    <td class="py-2.5 px-3.5 text-right font-mono text-emerald-400 font-bold text-xs">
                      ${currentMgmtItem ? `$${(currentMgmtItem.msrp * currentMgmtItem.qty).toLocaleString()}` : '$0'}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  if (typeof safeCreateIcons === "function") {
    safeCreateIcons(container);
  } else if (window.lucide) {
    try { lucide.createIcons(); } catch(e) {}
  }
}

function setGlobalTerm(term, skipConfirm = false) {
  const defs = (typeof StorageService !== "undefined" && typeof StorageService.getProjectDefaults === "function") ? StorageService.getProjectDefaults() : null;
  const defTerm = defs?.licensing?.globalSelectedTerm || "1YR";
  if (!skipConfirm && defs && term !== defTerm && typeof confirmProjectDefaultChange === "function" && !(typeof isProjectWizardOpen === "function" && isProjectWizardOpen())) {
    confirmProjectDefaultChange({
      title: "Change Project Licensing & Subscription Term?",
      settingLabel: "Software Licensing & Warranty Term",
      defaultLabel: defTerm,
      newLabel: term,
      message: `Your Project Default Software Licensing Term is set to "${defTerm}". Are you sure you want to change it to "${term}"?`,
      allowLocalOverride: true,
      localOverrideLabel: `Apply ${term} to Cloud Hardware Only`,
      updateDefaultLabel: `Update Project Default to ${term}`,
      onLocalOverride: () => setGlobalTerm(term, true),
      onUpdateDefault: () => {
        if (typeof updateSingleProjectDefault === "function") {
          updateSingleProjectDefault(d => { if (!d.licensing) d.licensing = {}; d.licensing.globalSelectedTerm = term; }, true);
        }
        setGlobalTerm(term, true);
      }
    });
    return;
  }
  globalSelectedTerm = term;
  const parentDevices = projectBOM.filter(i => !i.parentInstanceId && (i.role === "Access" || i.role === "Core" || i.role === "Aggregation" || i.role === "Security WAN"));

  parentDevices.forEach(dev => {
    dev.individualTerm = null;
    if (dev.selectedMgmtProfile && dev.selectedMgmtProfile !== "standalone") {
      applyManagementSubscription(dev.instanceId, dev.selectedMgmtProfile, globalSelectedTerm);
    }
  });

  FacilityStore.notifyWorkspaceChange();
  renderLicenseManagerContent();
  showToast(`Updated all cloud subscriptions to ${term} terms.`);
}

function setIndividualDeviceTerm(instanceId, term) {
  const dev = projectBOM.find(i => i.instanceId === instanceId);
  if (!dev) return;

  dev.individualTerm = term;
  applyManagementSubscription(instanceId, dev.selectedMgmtProfile, term);

  FacilityStore.notifyWorkspaceChange();
  renderLicenseManagerContent();
  showToast(`Updated ${dev.model} to ${term} term.`);
}

function setVendorManagementProfile(vendor, profileKey) {
  const devices = projectBOM.filter(i => !i.parentInstanceId && i.vendor === vendor);
  devices.forEach(dev => {
    dev.selectedMgmtProfile = profileKey;
    const term = dev.individualTerm || globalSelectedTerm;
    applyManagementSubscription(dev.instanceId, profileKey, term);
  });

  FacilityStore.notifyWorkspaceChange();
  renderLicenseManagerContent();
  showToast(`Applied ${profileKey} across all ${vendor} devices.`);
}

function clearAllManagementLicenses() {
  const parentDevices = projectBOM.filter(i => !i.parentInstanceId);
  parentDevices.forEach(dev => {
    if (dev.vendor === "Meraki") {
      dev.selectedMgmtProfile = "cloud";
      applyManagementSubscription(dev.instanceId, "cloud", globalSelectedTerm || "1YR");
    } else {
      dev.selectedMgmtProfile = "standalone";
      applyManagementSubscription(dev.instanceId, "standalone", "PERP");
    }
  });

  FacilityStore.notifyWorkspaceChange();
  renderLicenseManagerContent();
  showToast("Cleared non-mandatory subscriptions. Meraki retained required licenses.");
}

function updateSwitchMgmtProfile(instanceId, profileKey) {
  const dev = projectBOM.find(i => i.instanceId === instanceId);
  const term = (dev && dev.individualTerm) ? dev.individualTerm : globalSelectedTerm;
  applyManagementSubscription(instanceId, profileKey, term);

  FacilityStore.notifyWorkspaceChange();
  renderLicenseManagerContent();
  showToast("Updated management subscription.");
}

// -----------------------------------------------------------
// Quote Export & Clipboard
// -----------------------------------------------------------
function copyBomSummary() {
  if (projectBOM.length === 0) { showToast("Cannot export empty BOM."); return; }

  const compliance = checkMerakiCompliance();
  if (!compliance.compliant) {
    showToast("Compliance Alert: Configure Meraki licensing before copying.");
    toggleLicenseModal();
    return;
  }

  let txt = `SECURITY NETWORK INFRASTRUCTURE BOM\n\n`;
  let totalMSRP = 0;
  projectBOM.forEach(i => {
    totalMSRP += (i.msrp * i.qty);
    const rawLoc = i.closetName || i.rackId || FacilityStore.UNASSIGNED;
    const loc = `[${typeof FacilityStore !== "undefined" ? FacilityStore.normalize(rawLoc) : rawLoc}] `;
    const devNum = i.deviceNumber ? `[${i.deviceNumber}] ` : '';
    const friendly = (i.friendlyName && i.friendlyName !== i.model) ? ` "${i.friendlyName}"` : '';
    const lagStr = i.uplinkMode === 'lag_dual' ? ' (2x LAG Uplink)' : '';
    txt += `${loc}${devNum}[${i.qty}x] ${i.vendor} ${i.model}${friendly}${lagStr} (SKU: ${i.sku}) - $${(i.msrp * i.qty).toLocaleString()}\n`;
  });
  txt += `\nTotal Estimated Hardware MSRP: $${totalMSRP.toLocaleString()}\n`;
  navigator.clipboard.writeText(txt).then(() => showToast("BOM copied to clipboard!"));
}

function exportBomCSV() {
  if (projectBOM.length === 0) { showToast("Cannot export empty BOM."); return; }

  const compliance = checkMerakiCompliance();
  if (!compliance.compliant) {
    showToast("Compliance Alert: Configure Meraki licensing before exporting.");
    toggleLicenseModal();
    return;
  }

  const escCell = typeof window.escapeCSVCell === "function" ? window.escapeCSVCell : (v => `"${String(v ?? "").replace(/"/g, '""')}"`);
  let csv = "Device ID,Friendly Name,Location,Rack,Role,Vendor,Model,SKU,Quantity,Uplink Mode,Unit MSRP,Total MSRP,PoE Budget,Power Watts\n";
  projectBOM.forEach(i => {
    const rawLoc = i.closetName || i.rackId || FacilityStore.UNASSIGNED;
    const normalizedLoc = typeof FacilityStore !== "undefined" ? FacilityStore.normalize(rawLoc) : rawLoc;
    const parsed = typeof FacilityStore !== "undefined" ? FacilityStore.parse(normalizedLoc) : { space: "General", enclosure: "General" };
    const totalW = ((i.poeBudget || 0) + (i.baseWatts || 0)) * i.qty;
    const devNum = i.deviceNumber || "";
    const friendly = (typeof DeviceTaxonomy !== "undefined" ? DeviceTaxonomy.getFriendlyName(i) : (i.friendlyName || i.model)) || "";
    csv += `${escCell(devNum)},${escCell(friendly)},${escCell(parsed.space)},${escCell(parsed.enclosure)},${escCell(i.role || 'Accessory')},${escCell(i.vendor)},${escCell(i.model)},${escCell(i.sku)},${i.qty},${escCell(i.uplinkMode || 'single')},${i.msrp},${i.msrp * i.qty},${i.poeBudget || 0},${totalW}\n`;
  });
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Security_Infrastructure_BOM_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  showToast("Exported BOM CSV.");
}

// ==========================================
// ENGINEERING SUBMITTAL & COMPREHENSIVE WORKBOOK ENGINE
// ==========================================

function compileProjectEngineeringData() {
  const projName = typeof StorageService !== "undefined" ? StorageService.getActiveProjectName() : "Security Infrastructure Project";
  const projId = typeof StorageService !== "undefined" ? StorageService.getActiveProjectId() : "default";
  const dateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const timeStr = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  const defs = (typeof StorageService !== "undefined" && typeof StorageService.getProjectDefaults === "function")
    ? StorageService.getProjectDefaults()
    : {};
  const meta = defs.metadata || {};
  const jobOpportunityNumber = meta.jobOpportunityNumber || "";
  const clientName = meta.clientName || "";
  const siteAddress = meta.siteAddress || "";
  const leadDesigner = meta.leadDesigner || "";
  const licensingTerm = (defs.licensing && defs.licensing.globalSelectedTerm) || (typeof globalSelectedTerm !== "undefined" ? globalSelectedTerm : "1YR");

  let totalHardwareUnits = 0;
  let totalMSRP = 0;
  let totalPoEBudgetWatts = 0;
  let totalPowerConsumptionWatts = 0;

  const categorized = {
    switches: [],
    cameras: [],
    access: [],
    firewalls: [],
    servers: [],
    cabling: [],
    optics: [],
    accessories: [],
    licenses: []
  };

  projectBOM.forEach((item) => {
    const qty = item.qty || 1;
    totalHardwareUnits += qty;
    totalMSRP += (item.msrp || 0) * qty;
    const poe = (item.poeBudget || 0) * qty;
    totalPoEBudgetWatts += poe;
    const power = ((item.baseWatts || item.powerWatts || item.powerConsumptionWatts || 0) + (item.poeBudget || 0)) * qty;
    totalPowerConsumptionWatts += power;

    const role = (item.role || "").toLowerCase();
    const cat = (item.category || "").toLowerCase();
    const model = (item.model || "").toLowerCase();
    const desc = (item.description || "").toLowerCase();
    const all = `${role} ${cat} ${model} ${desc}`;

    if (item.source === "cabling_auto_sync" || role.includes("passive") || cat.includes("cabling") || /patch panel|keystone|cable spool|cat6/i.test(all)) {
      categorized.cabling.push(item);
    } else if (item.source === "topology_auto_sync" || role === "optics" || cat === "optics" || /transceiver|dac|sfp|fiber patch/i.test(all)) {
      categorized.optics.push(item);
    } else if (role === "license" || cat === "license" || /license|cloud management/i.test(all)) {
      categorized.licenses.push(item);
    } else if (role === "camera" || role === "surveillance" || /camera|bullet|dome|ptz|multisensor/i.test(all)) {
      categorized.cameras.push(item);
    } else if (role === "access control" || /door|controller|mercury|reader|cloudlink|trove/i.test(all)) {
      categorized.access.push(item);
    } else if (role === "firewall" || /gateway|firewall|mx|fortigate/i.test(all)) {
      categorized.firewalls.push(item);
    } else if (role === "server" || /server|storage|nvr|vms/i.test(all)) {
      categorized.servers.push(item);
    } else if (role === "access" || role === "core" || role === "aggregation" || /switch/i.test(all)) {
      categorized.switches.push(item);
    } else {
      categorized.accessories.push(item);
    }
  });

  const totalHeatBTU = Math.round(totalPowerConsumptionWatts * 3.412142);
  const totalCoolingTons = (totalHeatBTU / 12000).toFixed(2);

  // Telecom Closets & Spaces
  let spaces = [];
  if (typeof FacilityStore !== "undefined" && typeof FacilityStore.getSpaces === "function") {
    spaces = FacilityStore.getSpaces();
  }
  if (!spaces || spaces.length === 0) {
    const spaceSet = new Set();
    projectBOM.forEach(i => {
      const loc = i.closetName || i.rackId || "MDF";
      const parsed = typeof FacilityStore !== "undefined" ? FacilityStore.parse(loc) : { space: loc };
      spaceSet.add(parsed.space || loc);
    });
    spaces = Array.from(spaceSet).map(s => ({ id: s, name: s, type: "MDF" }));
  }

  // Rack Utilization Schedule
  const rackSchedule = [];
  const enclosures = (typeof FacilityStore !== "undefined" && typeof FacilityStore.getEnclosures === "function")
    ? FacilityStore.getEnclosures()
    : [];

  spaces.forEach(sp => {
    const spEnclosures = enclosures.filter(e => e.spaceId === sp.id || e.spaceName === sp.name);
    if (spEnclosures.length > 0) {
      spEnclosures.forEach(enc => {
        const mounted = projectBOM.filter(i => {
          const loc = i.closetName || i.rackId || "";
          return loc.includes(enc.name) || i.rackId === enc.id || (i.spaceId === sp.id && (!i.rackId || i.rackId === enc.name));
        });
        let occupiedU = 0;
        let encWatts = 0;
        mounted.forEach(m => {
          const mRU = (m.rackUnits !== undefined && m.rackUnits !== null) ? (parseInt(m.rackUnits, 10) || 0) : 1;
          occupiedU += mRU * (m.qty || 1);
          encWatts += ((m.baseWatts || m.powerWatts || 0) + (m.poeBudget || 0)) * (m.qty || 1);
        });
        const totalU = enc.rackUnits || 42;
        const availableU = Math.max(0, totalU - occupiedU);
        const utilPct = Math.min(100, Math.round((occupiedU / totalU) * 100));
        const encBTU = Math.round(encWatts * 3.412142);

        rackSchedule.push({
          space: sp.name,
          enclosure: enc.name,
          formFactor: enc.formFactor || "4-Post Open Frame",
          totalU,
          occupiedU,
          availableU,
          utilPct,
          itemsCount: mounted.length,
          watts: encWatts,
          btu: encBTU,
          equipment: mounted.map(m => `${m.qty}x ${m.vendor} ${m.model}`).join("; ")
        });
      });
    } else {
      const mounted = projectBOM.filter(i => {
        const loc = i.closetName || i.rackId || "";
        return loc.includes(sp.name) || i.spaceId === sp.id;
      });
      let encWatts = 0;
      mounted.forEach(m => {
        encWatts += ((m.baseWatts || m.powerWatts || 0) + (m.poeBudget || 0)) * (m.qty || 1);
      });
      const encBTU = Math.round(encWatts * 3.412142);
      const occupiedU = mounted.reduce((acc, m) => {
        const mRU = (m.rackUnits !== undefined && m.rackUnits !== null) ? (parseInt(m.rackUnits, 10) || 0) : 1;
        return acc + (mRU * (m.qty || 1));
      }, 0);
      rackSchedule.push({
        space: sp.name,
        enclosure: "Standard Floor Enclosure",
        formFactor: "Cabinet",
        totalU: 42,
        occupiedU,
        availableU: Math.max(0, 42 - occupiedU),
        utilPct: Math.min(100, Math.round((occupiedU / 42) * 100)),
        itemsCount: mounted.length,
        watts: encWatts,
        btu: encBTU,
        equipment: mounted.map(m => `${m.qty}x ${m.vendor} ${m.model}`).join("; ")
      });
    }
  });

  // PoE Telemetry Per Space
  const poeSchedule = [];
  spaces.forEach(sp => {
    const closetItems = projectBOM.filter(i => {
      const loc = i.closetName || i.rackId || "";
      return loc.includes(sp.name) || i.spaceId === sp.id;
    });

    let switchBudget = 0;
    let switchCount = 0;
    let edgeDemand = 0;
    let edgeCount = 0;

    closetItems.forEach(i => {
      const role = (i.role || "").toLowerCase();
      const isSwitch = role === "access" || role === "core" || role === "aggregation" || /switch/i.test(role);
      if (isSwitch) {
        switchBudget += (i.poeBudget || 0) * (i.qty || 1);
        switchCount += (i.qty || 1);
      } else if (i.poeStandard || i.poeWattsDrawn || i.powerSource === "poe_switch" || /camera|door|reader|intercom|access control/i.test(role)) {
        const itemW = (i.powerConsumptionWatts || i.maxPowerWatts || i.powerWatts || i.poeWattsDrawn || 15);
        edgeDemand += itemW * (i.qty || 1);
        edgeCount += (i.qty || 1);
      }
    });

    const headroom = switchBudget - edgeDemand;
    const utilPct = switchBudget > 0 ? Math.round((edgeDemand / switchBudget) * 100) : (edgeDemand > 0 ? 999 : 0);
    let status = "OPTIMAL";
    if (switchBudget === 0 && edgeDemand > 0) status = "DEFICIT (NO POE)";
    else if (headroom < 0) status = "DEFICIT OVERLOAD";
    else if (utilPct > 80) status = "WARNING (>80%)";

    poeSchedule.push({
      space: sp.name,
      switchCount,
      switchBudget,
      edgeCount,
      edgeDemand,
      headroom,
      utilPct,
      status
    });
  });

  // Structured Cabling Per Space
  const cablingSchedule = [];
  const dropMap = {};
  const footageMap = {};
  const allFacilityClosets = (typeof getAllClosetsAcrossFacility === "function") ? getAllClosetsAcrossFacility() : [];
  if (typeof facilityFloors !== "undefined" && Array.isArray(facilityFloors)) {
    facilityFloors.forEach(fl => {
      const floorClosets = (fl.nodes || []).filter(cn => cn.type === "closet");
      (fl.nodes || []).forEach(n => {
        if (n.type !== "closet") {
          let closetNode = allFacilityClosets.find(c => c.id === n.assignedClosetId) || floorClosets.find(c => c.id === n.assignedClosetId) || floorClosets[0];
          const rawTarget = closetNode ? closetNode.name : (n.assignedCloset || n.closetId || "MDF");
          const parsedTarget = (typeof FacilityStore !== "undefined" && typeof FacilityStore.parse === "function")
            ? FacilityStore.parse(rawTarget).spaceName
            : rawTarget.split("•")[0].trim();
          const target = parsedTarget || "MDF";
          dropMap[target] = (dropMap[target] || 0) + 1;
          const runFt = (n.calculatedRun && n.calculatedRun.totalFt) ? n.calculatedRun.totalFt : 150;
          footageMap[target] = (footageMap[target] || 0) + runFt;
        }
      });
    });
  }

  spaces.forEach(sp => {
    const drops = dropMap[sp.name] || dropMap[sp.id] || 0;
    const pp48 = Math.floor(drops / 48);
    const remainder = drops % 48;
    const pp24 = remainder > 24 ? 0 : (remainder > 0 ? 1 : 0);
    const effectivePP48 = remainder > 24 ? pp48 + 1 : pp48;
    const totalPanels = effectivePP48 + pp24;
    const estFootage = footageMap[sp.name] || footageMap[sp.id] || (drops * 150);

    let fiberLinks = 0;
    if (typeof topologyLinks !== "undefined" && Array.isArray(topologyLinks)) {
      fiberLinks = topologyLinks.filter(l => {
        return (l.sourceCloset === sp.name || l.targetCloset === sp.name) && l.isInterCloset;
      }).length;
    }

    cablingSchedule.push({
      space: sp.name,
      drops,
      pp48: effectivePP48,
      pp24,
      totalPanels,
      keystones: drops,
      estFootage,
      spoolsNeeded: Math.ceil(estFootage / 1000),
      fiberLinks
    });
  });

  return {
    projName,
    projId,
    dateStr,
    timeStr,
    totalHardwareUnits,
    totalMSRP,
    totalPoEBudgetWatts,
    totalPowerConsumptionWatts,
    totalHeatBTU,
    totalCoolingTons,
    categorized,
    spaces,
    rackSchedule,
    poeSchedule,
    cablingSchedule,
    jobOpportunityNumber,
    clientName,
    siteAddress,
    leadDesigner,
    licensingTerm
  };
}

function exportComprehensiveProjectCSV() {
  if (projectBOM.length === 0) {
    showToast("Cannot export empty BOM.");
    return;
  }

  const compliance = checkMerakiCompliance();
  if (!compliance.compliant) {
    showToast("Compliance Alert: Configure Meraki licensing before exporting.");
    toggleLicenseModal();
    return;
  }

  const data = compileProjectEngineeringData();
  const esc = typeof window.escapeCSVCell === "function" ? window.escapeCSVCell : ((val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  });

  let csv = "";

  // HEADER
  csv += "================================================================================\n";
  csv += "ORION SECURITY SOLUTIONS - COMPREHENSIVE PROJECT SPECIFICATION & ENGINEERING SUBMITTAL\n";
  csv += "================================================================================\n";
  csv += `Project Name:,${esc(data.projName)}\n`;
  csv += `Job / Opportunity #:,${esc(data.jobOpportunityNumber || "N/A")}\n`;
  csv += `Client / Facility:,${esc(data.clientName || "N/A")}\n`;
  csv += `Site Address:,${esc(data.siteAddress || "N/A")}\n`;
  csv += `Lead System Designer:,${esc(data.leadDesigner || "N/A")}\n`;
  csv += `Project Key:,${esc(data.projId)}\n`;
  csv += `Licensing Term:,${esc(data.licensingTerm || "1-Year")}\n`;
  csv += `Generated Date:,${esc(data.dateStr + " " + data.timeStr)}\n`;
  csv += `Platform Version:,OSS Design Tool v0.10.0-alpha\n`;
  csv += `Total Hardware Items:,${data.totalHardwareUnits}\n`;
  csv += `Estimated Hardware MSRP:,${esc("$" + data.totalMSRP.toLocaleString())}\n`;
  csv += `Combined PoE Power Budget:,${data.totalPoEBudgetWatts} W\n`;
  csv += `Total Heat Dissipation:,${data.totalHeatBTU} BTU/hr (${data.totalCoolingTons} AC Tons)\n`;
  csv += "\n";

  // SECTION 1: DETAILED BILL OF MATERIALS
  csv += "================================================================================\n";
  csv += "SECTION 1: DETAILED PROJECT BILL OF MATERIALS (BOM)\n";
  csv += "================================================================================\n";
  csv += "Item #,Device ID,Subsystem Category,Friendly Name,Space / Location,Enclosure / Rack,Role,Vendor,Model,SKU,Quantity,Uplink Mode,Unit MSRP,Ext MSRP,PoE Budget (W),Total Power (W),Heat Output (BTU/hr)\n";

  projectBOM.forEach((i, idx) => {
    const rawLoc = i.closetName || i.rackId || FacilityStore.UNASSIGNED;
    const normalizedLoc = typeof FacilityStore !== "undefined" ? FacilityStore.normalize(rawLoc) : rawLoc;
    const parsed = typeof FacilityStore !== "undefined" ? FacilityStore.parse(normalizedLoc) : { space: "General", enclosure: "General" };
    const devNum = i.deviceNumber || `DEV-${idx + 1}`;
    const friendly = (typeof DeviceTaxonomy !== "undefined" ? DeviceTaxonomy.getFriendlyName(i) : (i.friendlyName || i.model)) || "";
    const devType = typeof DeviceTaxonomy !== "undefined" ? DeviceTaxonomy.getDeviceType(i).label : (i.role || "Device");
    const totalW = ((i.poeBudget || 0) + (i.baseWatts || i.powerWatts || 0)) * (i.qty || 1);
    const btu = Math.round(totalW * 3.412142);

    csv += `${idx + 1},${esc(devNum)},${esc(devType)},${esc(friendly)},${esc(parsed.space)},${esc(parsed.enclosure)},${esc(i.role || "Device")},${esc(i.vendor)},${esc(i.model)},${esc(i.sku)},${i.qty || 1},${esc(i.uplinkMode || "single")},${i.msrp || 0},${(i.msrp || 0) * (i.qty || 1)},${i.poeBudget || 0},${totalW},${btu}\n`;
  });
  csv += `,,,,,,,,,,,,TOTAL MSRP,${data.totalMSRP},${data.totalPoEBudgetWatts},${data.totalPowerConsumptionWatts},${data.totalHeatBTU}\n\n`;

  // SECTION 2: TELECOM CLOSETS & RACK UTILIZATION SCHEDULE
  csv += "================================================================================\n";
  csv += "SECTION 2: TELECOM CLOSETS & RACK UTILIZATION SCHEDULE\n";
  csv += "================================================================================\n";
  csv += "Space / Closet,Enclosure Name,Form Factor,Rack Capacity (U),Occupied (U),Available (U),Utilization %,Installed Devices Count,Enclosure Power (W),Heat Output (BTU/hr),Installed Equipment Inventory\n";
  data.rackSchedule.forEach(r => {
    csv += `${esc(r.space)},${esc(r.enclosure)},${esc(r.formFactor)},${r.totalU},${r.occupiedU},${r.availableU},${r.utilPct}%,${r.itemsCount},${r.watts},${r.btu},${esc(r.equipment)}\n`;
  });
  csv += "\n";

  // SECTION 3: POE POWER BUDGET & HEADROOM TELEMETRY
  csv += "================================================================================\n";
  csv += "SECTION 3: POE POWER BUDGET & HEADROOM TELEMETRY\n";
  csv += "================================================================================\n";
  csv += "Space / Closet,Switch Count,Switch PoE Budget (W),Connected Edge Devices,Calculated PoE Demand (W),PoE Headroom (W),Utilization %,Compliance Status\n";
  data.poeSchedule.forEach(p => {
    csv += `${esc(p.space)},${p.switchCount},${p.switchBudget},${p.edgeCount},${p.edgeDemand},${p.headroom},${p.utilPct}%,${esc(p.status)}\n`;
  });
  csv += "\n";

  // SECTION 4: STRUCTURED CABLING & FIELD DROP SCHEDULE
  csv += "================================================================================\n";
  csv += "SECTION 4: STRUCTURED CABLING & FIELD DROP SCHEDULE\n";
  csv += "================================================================================\n";
  csv += "Space / Closet,Terminated Drops,48P Panels,24P Panels,Total Patch Panels,Keystone Jacks,Est Horizontal Footage (ft),1000ft Spools Needed,Inter-Closet Fiber Trunks\n";
  data.cablingSchedule.forEach(c => {
    csv += `${esc(c.space)},${c.drops},${c.pp48},${c.pp24},${c.totalPanels},${c.keystones},${c.estFootage},${c.spoolsNeeded},${c.fiberLinks}\n`;
  });
  csv += "\n";

  // SECTION 5: LICENSING & ENGINEERING COMPLIANCE
  csv += "================================================================================\n";
  csv += "SECTION 5: SYSTEM LICENSING & CLOUD TERMS AUDIT\n";
  csv += "================================================================================\n";
  csv += "Subsystem / Vendor,Model / SKU,Required Licenses,Quantity,Term,Audit Status\n";
  data.categorized.licenses.forEach(l => {
    csv += `${esc(l.vendor)},${esc(l.model + " (" + l.sku + ")")},Required,${l.qty || 1},${esc(l.term || "1-Year")},Verified\n`;
  });
  if (data.categorized.licenses.length === 0) {
    csv += "Enterprise Cloud Licensing,No cloud subscription licenses required in active BOM,0,0,N/A,Compliant\n";
  }
  csv += "\n";

  const cleanName = data.projName.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 32);
  const fileName = `OSS_Engineering_Submittal_${cleanName}_${new Date().toISOString().slice(0, 10)}.csv`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
  showToast("Exported comprehensive multi-section CSV workbook.");
}

function jumpToBomTarget(instanceId) {
  if (typeof NavigationHistory !== "undefined") {
    const st = NavigationHistory.captureCurrentState();
    if (st && st.tool !== "bom") NavigationHistory.push(st);
  }

  if (window.TabManager && typeof window.TabManager.openTab === "function") {
    window.TabManager.openTab("bom");
  } else {
    const modal = document.getElementById("bomModal");
    if (modal && modal.classList.contains("hidden")) {
      toggleBomModal();
    } else {
      const drawer = document.getElementById("bomDrawer");
      if (drawer && drawer.classList.contains("translate-x-full")) {
        toggleBomModal();
      }
    }
  }

  if (instanceId) {
    const targetItem = projectBOM.find(i => i.instanceId === instanceId);
    if (targetItem) {
      if (bomSearchQuery || bomSelectedLocation !== "all" || bomSelectedCategory !== "all") {
        resetBomFilters();
      }
      const rawLoc = targetItem.closetName || targetItem.rackId || (typeof FacilityStore !== "undefined" ? FacilityStore.UNASSIGNED : "Unassigned");
      const locKey = typeof FacilityStore !== "undefined" ? FacilityStore.normalize(rawLoc) : rawLoc;
      if (bomCollapsedLocations.has(locKey)) {
        bomCollapsedLocations.delete(locKey);
        updateBOMView();
      }
    }

    setTimeout(() => {
      const el = document.getElementById(`bom-item-${instanceId}`) || document.querySelector(`[data-bom-instance="${instanceId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-indigo-400", "bg-indigo-950/40");
        setTimeout(() => {
          el.classList.remove("ring-2", "ring-indigo-400", "bg-indigo-950/40");
        }, 2500);
      }
    }, 150);
  }
}

