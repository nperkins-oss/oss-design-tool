// =========================================================================
// TOPOLOGY SLIDE-OUT INSPECTOR, HIERARCHY LAYOUT & QUICK-JUMP SEARCH ENGINE
// Separated from js/tools/topology.js for modular maintainability
// =========================================================================

// -----------------------------------------------------------
// Slide-Out Topology Inspector
// -----------------------------------------------------------
function selectTopologyRack(loc, e) {
  if (e) e.stopPropagation();
  selectedTopologyRackLoc = loc;
  selectedTopologyNodeId = null;
  selectedTopologyLinkId = null;
  toggleTopologyInspector(true);
  renderTopology();
  renderTopologyInspector();
}

function selectTopologyNode(instanceId, e) {
  if (e) e.stopPropagation();
  selectedTopologyNodeId = instanceId;
  selectedTopologyRackLoc = null;
  selectedTopologyLinkId = null;
  toggleTopologyInspector(true);
  renderTopology();
  renderTopologyInspector();
}

function selectTopologyLink(linkId, e) {
  if (e) {
    if (typeof e.stopPropagation === "function") e.stopPropagation();
    if (typeof e.preventDefault === "function") e.preventDefault();
  }
  selectedTopologyLinkId = linkId;
  selectedTopologyNodeId = null;
  selectedTopologyRackLoc = null;
  toggleTopologyInspector(true);
  renderTopologyLinks();
  renderTopologyInspector();
}

function deselectTopologyNode() {
  selectedTopologyNodeId = null;
  selectedTopologyRackLoc = null;
  selectedTopologyLinkId = null;
  renderTopology();
  renderTopologyInspector();
}

function renderTopologyLocationOptions(currentLoc) {
  if (typeof FacilityStore === "undefined") return "";
  const groups = FacilityStore.getLocationGroups(false);
  const normalizedCurrent = FacilityStore.normalize(currentLoc);
  let html = "";

  if (groups.spaces.length > 0) {
    html += `<optgroup label="Spaces & Zones (Field / Unenclosed)" class="bg-slate-900 text-slate-300">`;
    groups.spaces.forEach(s => {
      const isSel = normalizedCurrent === s.name;
      html += `<option value="${escapeHTML(s.name)}" class="bg-slate-900 text-white" ${isSel ? 'selected' : ''}>${escapeHTML(s.displayName || s.name)}</option>`;
    });
    html += `</optgroup>`;
  }

  if (groups.enclosures.length > 0) {
    html += `<optgroup label="Racks & Enclosures" class="bg-slate-900 text-slate-300">`;
    groups.enclosures.forEach(e => {
      const isSel = normalizedCurrent === e.name;
      html += `<option value="${escapeHTML(e.name)}" class="bg-slate-900 text-white" ${isSel ? 'selected' : ''}>${escapeHTML(e.displayName || e.name)}</option>`;
    });
    html += `</optgroup>`;
  }

  return html;
}

function renderTopologyInspector() {
  const container = document.getElementById("topologyInspectorContent");
  const selectedNodeEl = document.getElementById("topoInspectorSelectedNode");
  const linkSpeedEl = document.getElementById("topoInspectorLinkSpeed");
  const powerSourceEl = document.getElementById("topoInspectorPowerSource");

  if (!container) return;

  if (selectedTopologyRackLoc) {
    const loc = selectedTopologyRackLoc;
    const isFieldCluster = loc.endsWith("• Field Drops") || loc.toLowerCase().includes("field drop");
    const parsed = FacilityStore.parse(loc);

    let itemsInRack;
    if (isFieldCluster) {
      const floorNameLower = parsed.space.toLowerCase();
      itemsInRack = projectBOM.filter(item => {
        if (item.parentInstanceId) return false;
        if (typeof FacilityStore !== "undefined" && typeof FacilityStore.isFieldDevice === "function" && !FacilityStore.isFieldDevice(item)) return false;
        const fl = (typeof FacilityStore !== "undefined" && typeof FacilityStore.getDevicePhysicalFloor === "function") 
          ? FacilityStore.getDevicePhysicalFloor(item).toLowerCase() 
          : "main floor";
        return fl === floorNameLower;
      });
    } else {
      itemsInRack = projectBOM.filter(item => {
        if (!isTopologyActiveNode(item)) return false;
        const itemLoc = FacilityStore.normalize(item.closetName || item.rackId);
        return itemLoc === loc;
      });

      // Align Mounted Chassis order with Enclosure Visualizer (top U down to bottom U1)
      itemsInRack.sort((a, b) => {
        const uA = parseInt(a.rackSlot, 10);
        const uB = parseInt(b.rackSlot, 10);
        if (!isNaN(uA) && !isNaN(uB)) return uB - uA;
        if (!isNaN(uA)) return -1;
        if (!isNaN(uB)) return 1;
        if (a.rackSlot && b.rackSlot) return String(a.rackSlot).localeCompare(String(b.rackSlot));
        const pA = (typeof getDeviceMountPriority === "function") ? getDeviceMountPriority(a).priority : 5;
        const pB = (typeof getDeviceMountPriority === "function") ? getDeviceMountPriority(b).priority : 5;
        return pA - pB;
      });
    }

    if (isFieldCluster) {
      const floorName = parsed.space;
      let totalPoEWatts = 0;
      let cams = 0;
      let doors = 0;
      let intercoms = 0;
      const servingMap = {};

      itemsInRack.forEach(item => {
        const qty = parseInt(item.qty, 10) || 1;
        const w = (parseFloat(item.consumedPoEWatts || item.powerConsumptionWatts || item.baseWatts || 0)) * qty;
        totalPoEWatts += w;
        if (item.role === "Camera" || (item.category && item.category.includes("camera"))) cams += qty;
        else if (item.role === "Access Control" || (item.category && item.category.includes("access"))) doors += qty;
        else if (item.role === "Intercom" || (item.category && item.category.includes("intercom"))) intercoms += qty;

        let hostName = "Unassigned";
        if (item.uplinkTargetId) {
          const sw = projectBOM.find(s => s.instanceId === item.uplinkTargetId);
          if (sw) {
            const closet = sw.closetName ? sw.closetName.split('•')[0].trim() : "IDF/MDF";
            hostName = `${closet} (${sw.friendlyName || sw.model})`;
          }
        }
        servingMap[hostName] = (servingMap[hostName] || 0) + qty;
      });

      if (selectedNodeEl) selectedNodeEl.innerText = `${floorName} • Field Drops`;
      if (linkSpeedEl) linkSpeedEl.innerText = `${itemsInRack.length} Field Drops`;
      if (powerSourceEl) powerSourceEl.innerText = `${Math.round(totalPoEWatts)}W PoE Ingest`;

      container.innerHTML = `
        <!-- Floor Field Drops Header Card -->
        <div class="space-y-3 pb-3 border-b border-cyan-900/40">
          <div class="flex items-start justify-between">
            <div>
              <span class="text-xs font-bold text-white block">${escapeHTML(floorName)}</span>
              <span class="text-[11px] font-mono text-cyan-300">Physical Floor Field Endpoints</span>
            </div>
            <span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-cyan-500/40 bg-cyan-500/10 text-cyan-300">
              ${itemsInRack.length} Drops
            </span>
          </div>

          <!-- Action Buttons -->
          <div class="grid grid-cols-2 gap-2 pt-1">
            <button 
              onclick="if (typeof TabManager !== 'undefined' && typeof TabManager.openTab === 'function') { TabManager.openTab('physical_layout'); } else if (typeof openCableLayoutModal === 'function') { toggleTopologyModal(); openCableLayoutModal(); }"
              class="px-2.5 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/50 hover:border-cyan-400 text-cyan-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm group"
              title="Open Floor in Physical Layout Tool"
            >
              <i data-lucide="map" class="w-3.5 h-3.5 group-hover:scale-110 transition-transform"></i>
              <span>Physical Layout</span>
            </button>
            <button 
              onclick="panClusterIntoView('${escapeJSAttr(loc)}')"
              class="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm"
              title="Center this floor container on the topology canvas"
            >
              <i data-lucide="focus" class="w-3.5 h-3.5"></i>
              <span>Center View</span>
            </button>
          </div>
        </div>

        <!-- Telemetry Breakdown -->
        <div class="space-y-2 pb-3 border-b border-slate-800">
          <span class="text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
            <i data-lucide="zap" class="w-3.5 h-3.5"></i> PoE Load & Device Mix
          </span>
          <div class="space-y-1.5 text-xs bg-slate-950 p-2.5 rounded-xl border border-slate-850 font-mono">
            <div class="flex justify-between text-slate-400">
              <span>Total Field Drops:</span>
              <span class="text-white font-bold">${itemsInRack.length} Devices</span>
            </div>
            <div class="flex justify-between text-slate-400">
              <span>PoE Power Delivered:</span>
              <span class="text-cyan-400 font-bold">${Math.round(totalPoEWatts)} W</span>
            </div>
            <div class="grid grid-cols-3 gap-1 pt-1.5 border-t border-slate-900 text-center">
              <div class="bg-slate-900/60 p-1 rounded">
                <span class="text-[9px] text-slate-500 block">Cameras</span>
                <span class="font-bold text-teal-400">${cams}</span>
              </div>
              <div class="bg-slate-900/60 p-1 rounded">
                <span class="text-[9px] text-slate-500 block">Doors</span>
                <span class="font-bold text-cyan-400">${doors}</span>
              </div>
              <div class="bg-slate-900/60 p-1 rounded">
                <span class="text-[9px] text-slate-500 block">Other</span>
                <span class="font-bold text-slate-300">${intercoms + Math.max(0, itemsInRack.length - cams - doors - intercoms)}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Home-Run Serving Switches Breakdown -->
        <div class="space-y-2 pb-3 border-b border-slate-800">
          <span class="text-[10px] font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
            <i data-lucide="network" class="w-3.5 h-3.5"></i> Home-Run Terminating Switches
          </span>
          <div class="space-y-1 text-xs">
            ${Object.keys(servingMap).length === 0 ? `
              <div class="text-[11px] text-slate-500 py-1.5 text-center font-mono">Direct local drops</div>
            ` : Object.entries(servingMap).map(([targetName, count]) => `
              <div class="bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-850 flex items-center justify-between text-[11px] font-mono">
                <span class="text-slate-300 truncate max-w-[200px]" title="${escapeHTML(targetName)}">${escapeHTML(targetName)}</span>
                <span class="text-cyan-300 font-bold shrink-0">${count} ${count === 1 ? 'drop' : 'drops'}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Field Endpoints in this Zone -->
        <div class="space-y-2 pb-3">
          <span class="text-[10px] font-bold uppercase tracking-wider text-cyan-300 flex items-center justify-between">
            <span>Devices in Floor Zone (${itemsInRack.length})</span>
            <span class="text-[9px] font-mono text-slate-500">Click to Trace Cable</span>
          </span>
          <div class="space-y-1.5 max-h-60 overflow-y-auto pr-1">
            ${itemsInRack.map(item => {
              let orionBadge = "";
              if (item.uplinkTargetId && item.assignedSwitchPort && typeof PortEngine !== "undefined" && typeof PortEngine.resolveSwitchPatchMapping === "function") {
                const sw = projectBOM.find(s => s.instanceId === item.uplinkTargetId);
                if (sw) {
                  const patchData = PortEngine.resolveSwitchPatchMapping(sw);
                  const pInfo = patchData && patchData.byPortNumber ? patchData.byPortNumber[item.assignedSwitchPort] : null;
                  if (pInfo) {
                    orionBadge = `${pInfo.horizontalCableId} &bull; ${pInfo.panelTag}-${String(pInfo.jackNumber).padStart(2, '0')} &rarr; ${pInfo.switchPortTag}`;
                  }
                }
              }
              return `
              <div 
                onclick="selectTopologyNode('${item.instanceId}', event)"
                class="bg-slate-950 p-2 rounded-lg border border-slate-850 hover:border-cyan-500/60 hover:bg-slate-900 cursor-pointer flex items-center justify-between text-xs transition-colors group"
              >
                <div class="truncate max-w-[215px]">
                  <div class="flex items-center gap-1.5">
                    ${item.deviceNumber ? `<span class="px-1 py-0.2 rounded bg-cyan-900/60 border border-cyan-500/40 text-[9px] font-mono font-bold text-cyan-300">${escapeHTML(item.deviceNumber)}</span>` : ''}
                    <span class="text-white font-medium truncate block">${escapeHTML(item.friendlyName || item.model)}</span>
                  </div>
                  <span class="text-[10px] text-slate-400 font-mono block truncate">${orionBadge ? `<span class="text-sky-300 font-bold">${orionBadge}</span> &bull; ` : ''}${escapeHTML(item.role || 'Drop')} &bull; ${item.consumedPoEWatts || 15}W</span>
                </div>
                <i data-lucide="chevron-right" class="w-3.5 h-3.5 text-slate-600 group-hover:text-cyan-400 transition-colors shrink-0"></i>
              </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
      if (typeof safeCreateIcons === "function") safeCreateIcons(container);
      else if (window.lucide) lucide.createIcons();
      return;
    }

    let occupiedRU = 0;
    let totalWatts = 0;
    let totalPoEBudget = 0;
    let totalPoEConsumed = 0;

    // Look up physical Rack/Enclosure Frame SKU & Rack UPS / Patch Panels assigned to this location
    const rackEnclosureBomItem = projectBOM.find(i =>
      !i.parentInstanceId &&
      (i.isEnclosureFrame || i.role === "Equipment Rack" || i.role === "19\" Equipment Racks" || i.role === "Cabinets & Enclosures" || i.role === "Security Cabinet" || i.role === "Industrial NEMA Enclosure" || i.category === "racks" || i.category === "enclosures") &&
      FacilityStore.normalize(i.closetName || i.rackId) === loc
    );
    const rackUpsBomItems = projectBOM.filter(i =>
      !i.parentInstanceId &&
      (i.role === "Rack UPS Power" || i.role === "UPS" || i.category === "ups") &&
      FacilityStore.normalize(i.closetName || i.rackId) === loc
    );
    const rackPatchPanels = projectBOM.filter(i =>
      !i.parentInstanceId &&
      (i.isPassive || (i.sku && (i.sku.startsWith("PP-") || i.sku.startsWith("HCM-")))) &&
      FacilityStore.normalize(i.closetName || i.rackId) === loc
    );

    itemsInRack.forEach(item => {
      if (typeof enrichBOMItemFromCatalog === "function") enrichBOMItemFromCatalog(item);
      const qty = parseInt(item.qty, 10) || 1;
      const ru = (item.rackUnits !== undefined && item.rackUnits !== null) ? (parseInt(item.rackUnits, 10) || 0) : (item.role === "Server" ? 2 : 1);
      occupiedRU += ru * qty;

      const baseW = (parseFloat(item.baseWatts !== undefined ? item.baseWatts : (item.powerConsumptionWatts || item.maxPowerWatts || 0))) * qty;
      totalWatts += baseW;

      if (item.poeBudget) {
        totalPoEBudget += (parseFloat(item.poeBudget) || 0) * qty;
      }
      if (item.consumedPoEWatts) {
        totalPoEConsumed += (parseFloat(item.consumedPoEWatts) || 0);
      }
    });

    rackUpsBomItems.forEach(ups => {
      const qty = parseInt(ups.qty, 10) || 1;
      occupiedRU += (parseInt(ups.rackUnits, 10) || 2) * qty;
    });
    rackPatchPanels.forEach(pp => {
      const qty = parseInt(pp.qty, 10) || 1;
      occupiedRU += (parseInt(pp.rackUnits, 10) || 1) * qty;
    });

    const totalHeightU = (rackEnclosureBomItem && rackEnclosureBomItem.rackUnits > 0)
      ? rackEnclosureBomItem.rackUnits
      : (parsed.heightU || (parsed.isDin ? 0 : 24));
    const ruPercent = totalHeightU > 0 ? Math.min(100, Math.round((occupiedRU / totalHeightU) * 100)) : 0;
    const btuPerHour = Math.round(totalWatts * 3.412142);
    const rackPduMetrics = (!parsed.isDin && typeof getRackPduMetricsForLocation === "function")
      ? getRackPduMetricsForLocation(loc)
      : null;

    const switchIds = itemsInRack.map(i => i.instanceId);
    const servedClients = projectBOM.filter(i => isTopologyActiveNode(i) && switchIds.includes(i.uplinkTargetId) && !itemsInRack.includes(i));
    const cameraCount = servedClients.filter(c => c.role === "Camera" || (c.category && c.category.includes("camera"))).reduce((sum, c) => sum + (parseInt(c.qty, 10) || 1), 0);
    const doorCount = servedClients.filter(d => d.role === "Access Control" || (d.category && d.category.includes("access"))).reduce((sum, d) => sum + (parseInt(d.qty, 10) || 1), 0);
    const firstSwitchInRack = itemsInRack.find(i => i.role === "Access" || i.role === "Core" || i.role === "Core & Agg" || i.role === "Aggregation");

    if (selectedNodeEl) selectedNodeEl.innerText = `${parsed.space} • ${parsed.enclosure}`;
    if (linkSpeedEl) linkSpeedEl.innerText = `${itemsInRack.length} Active Chassis`;
    if (powerSourceEl) powerSourceEl.innerText = `${Math.round(totalWatts)}W Total Load`;

    container.innerHTML = `
      <!-- Enclosure Header Card -->
      <div class="space-y-3 pb-3 border-b border-slate-800">
        <div class="flex items-start justify-between">
          <div>
            <span class="text-xs font-bold text-white block">${escapeHTML(parsed.space)}</span>
            <span class="text-[11px] font-mono text-indigo-300">${escapeHTML(parsed.enclosure)}${rackEnclosureBomItem ? ` &bull; ${escapeHTML(rackEnclosureBomItem.sku)}` : ''}</span>
            ${rackEnclosureBomItem ? `<span class="text-[10px] text-slate-400 block truncate max-w-[210px]">${escapeHTML(rackEnclosureBomItem.model)}</span>` : ''}
          </div>
          <span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-indigo-500/40 bg-indigo-500/10 text-indigo-300 shrink-0">
            ${parsed.isDin ? 'NEMA / DIN Enclosure' : `${totalHeightU}U Rack Cabinet`}
          </span>
        </div>

        <!-- Action Buttons -->
        <div class="grid grid-cols-2 gap-1.5 pt-1">
          <button 
            onclick="openRackViewerFor('${escapeJSAttr(loc)}')"
            class="px-2.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/50 hover:border-indigo-400 text-indigo-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm group cursor-pointer"
            title="Open this rack directly in the 2D Rack Elevation Tool"
          >
            <i data-lucide="server" class="w-3.5 h-3.5 group-hover:scale-110 transition-transform"></i>
            <span>Open Elevation</span>
          </button>
          <button 
            onclick="panClusterIntoView('${escapeHTML(loc)}')"
            class="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
            title="Center this enclosure cluster on the topology canvas"
          >
            <i data-lucide="focus" class="w-3.5 h-3.5"></i>
            <span>Center View</span>
          </button>
          ${!parsed.isDin ? `
            <button 
              onclick="if (typeof openRackPowerMatrixModal === 'function') openRackPowerMatrixModal('${escapeJSAttr(loc)}');"
              class="px-2.5 py-1.5 bg-amber-950/50 hover:bg-amber-900/70 border border-amber-500/50 text-amber-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
              title="Open 1:1 Rack Power & PDU Matrix Studio for this rack"
            >
              <i data-lucide="zap" class="w-3.5 h-3.5 text-amber-400"></i>
              <span>Power Matrix</span>
            </button>
            <button 
              onclick="if (typeof openPortMatrixStudio === 'function') openPortMatrixStudio(${firstSwitchInRack ? `'${firstSwitchInRack.instanceId}'` : ''});"
              class="px-2.5 py-1.5 bg-sky-950/50 hover:bg-sky-900/70 border border-sky-500/50 text-sky-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
              title="Open Port & Patch Panel Matrix Studio"
            >
              <i data-lucide="grid" class="w-3.5 h-3.5 text-sky-400"></i>
              <span>Port Matrix</span>
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Rack Space Occupancy (RU) -->
      ${!parsed.isDin && totalHeightU > 0 ? `
        <div class="space-y-2 pb-3 border-b border-slate-800">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
              <i data-lucide="layers" class="w-3.5 h-3.5"></i> Vertical Rack Space (RU)
            </span>
            <span class="font-mono text-[10px] text-white font-bold">
              ${occupiedRU}U / ${totalHeightU}U (${ruPercent}%)
            </span>
          </div>
          <div class="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800 p-0.5">
            <div 
              class="h-full rounded-full transition-all ${ruPercent > 90 ? 'bg-rose-500' : ruPercent > 70 ? 'bg-amber-400' : 'bg-sky-400'}" 
              style="width: ${ruPercent}%"
            ></div>
          </div>
          <div class="flex justify-between text-[9px] font-mono text-slate-400">
            <span>Available Space: <strong>${Math.max(0, totalHeightU - occupiedRU)}U Free</strong></span>
            <span>Standard 19" Mounting</span>
          </div>
        </div>
      ` : ''}

      <!-- Catalog Rack PDU & Electrical Load -->
      <div class="space-y-2 pb-3 border-b border-slate-800">
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <i data-lucide="zap" class="w-3.5 h-3.5"></i> Electrical & Catalog Rack PDU
          </span>
          ${rackPduMetrics ? `
            <span class="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-500/40 text-amber-300 font-bold">
              ${rackPduMetrics.redundancy === 'dual' ? '2N A+B PDUs' : 'Single PDU-A'}
            </span>
          ` : ''}
        </div>
        <div class="space-y-1.5 text-xs bg-slate-950 p-2.5 rounded-xl border border-slate-850 font-mono">
          <div class="flex justify-between text-slate-400">
            <span>Enclosure Power Draw:</span>
            <span class="text-white font-bold">${Math.round(totalWatts)} W</span>
          </div>
          <div class="flex justify-between text-slate-400">
            <span>Heat Dissipation:</span>
            <span class="text-orange-400 font-bold">${btuPerHour.toLocaleString()} BTU/hr</span>
          </div>
          ${rackUpsBomItems.length > 0 ? `
            <div class="flex justify-between text-slate-400 pt-1 border-t border-slate-900">
              <span>Rack UPS Backup:</span>
              <span class="text-emerald-400 font-bold truncate max-w-[160px]" title="${escapeHTML(rackUpsBomItems.map(u => u.model).join(', '))}">${escapeHTML(rackUpsBomItems.map(u => u.sku).join(', '))}</span>
            </div>
          ` : ''}
          ${totalPoEBudget > 0 ? `
            <div class="flex justify-between text-slate-400 pt-1 border-t border-slate-900">
              <span>PoE Sourcing Budget:</span>
              <span class="text-amber-400 font-bold">${Math.round(totalPoEBudget)} W</span>
            </div>
            <div class="flex justify-between text-slate-400">
              <span>Delivered PoE Flow:</span>
              <span class="${totalPoEConsumed > totalPoEBudget ? 'text-rose-400 font-bold' : 'text-emerald-400'}">
                ${Math.round(totalPoEConsumed)} W (${Math.round((totalPoEConsumed / (totalPoEBudget || 1)) * 100)}%)
              </span>
            </div>
          ` : ''}
          ${rackPduMetrics ? `
            <div class="pt-1.5 mt-1 border-t border-slate-900 space-y-1 text-[10px]">
              <div class="flex items-center justify-between">
                <span class="text-amber-300 font-bold">${escapeHTML(rackPduMetrics.pduA.id)} (${escapeHTML(rackPduMetrics.pduA.sku)}):</span>
                <span class="${rackPduMetrics.pduA.isOverContinuous || rackPduMetrics.pduA.isOverOutlets ? 'text-rose-400 font-bold' : 'text-slate-200'}">${rackPduMetrics.pduA.usedOutlets}/${rackPduMetrics.pduA.totalOutlets} R &bull; ${rackPduMetrics.pduA.amps}A</span>
              </div>
              ${rackPduMetrics.pduB ? `
                <div class="flex items-center justify-between">
                  <span class="text-sky-300 font-bold">${escapeHTML(rackPduMetrics.pduB.id)} (${escapeHTML(rackPduMetrics.pduB.sku)}):</span>
                  <span class="${rackPduMetrics.pduB.isOverContinuous || rackPduMetrics.pduB.isOverOutlets ? 'text-rose-400 font-bold' : 'text-slate-200'}">${rackPduMetrics.pduB.usedOutlets}/${rackPduMetrics.pduB.totalOutlets} R &bull; ${rackPduMetrics.pduB.amps}A</span>
                </div>
              ` : ''}
            </div>
          ` : ''}
        </div>
      </div>

      <!-- Installed Hardware Inventory List -->
      <div class="space-y-2 pb-3 border-b border-slate-800">
        <span class="text-[10px] font-bold uppercase tracking-wider text-indigo-300 flex items-center justify-between">
          <span>Mounted Chassis (${itemsInRack.length})</span>
          <span class="text-[9px] font-mono text-slate-500">Click to Inspect Chassis</span>
        </span>
        <div class="space-y-1.5 max-h-52 overflow-y-auto pr-1">
          ${itemsInRack.length === 0 ? `
            <div class="text-[11px] text-slate-500 py-3 text-center bg-slate-950 rounded-xl border border-slate-850">
              No equipment mounted in this rack yet.
            </div>
          ` : itemsInRack.map(item => {
            const devPduList = rackPduMetrics && rackPduMetrics.byDeviceId ? rackPduMetrics.byDeviceId[item.instanceId] : null;
            const devPduShort = devPduList && devPduList.length > 0
              ? devPduList.map(rec => `${rec.pduBank ? 'PDU' + rec.pduBank : 'UPS'}-R${String(rec.outletNumber).padStart(2, '0')}`).join('+')
              : '';
            return `
            <div 
              onclick="selectTopologyNode('${item.instanceId}', event)"
              class="bg-slate-950 p-2 rounded-lg border border-slate-850 hover:border-indigo-500/60 hover:bg-slate-900 cursor-pointer flex items-center justify-between text-xs transition-colors group"
            >
              <div class="truncate max-w-[185px]">
                <div class="flex items-center gap-1.5">
                  ${item.rackSlot ? `<span class="px-1.5 py-0.2 rounded bg-indigo-950/80 border border-indigo-700/60 text-[9px] font-mono font-bold text-indigo-300">U${item.rackSlot}</span>` : ''}
                  <span class="text-white block font-medium truncate group-hover:text-indigo-200">${escapeHTML(item.model)}</span>
                </div>
                <span class="text-[10px] text-slate-400 font-mono truncate block">${devPduShort ? `<span class="text-amber-300 font-bold">${escapeHTML(devPduShort)}</span> &bull; ` : ''}${escapeHTML(item.vendor || 'Generic')} &bull; ${(item.rackUnits !== undefined ? item.rackUnits : 1)}U</span>
              </div>
              <div class="flex items-center gap-1.5 shrink-0">
                <div class="text-right">
                  <span class="font-mono text-[10px] text-indigo-300 font-bold block">
                    ${item.ports ? `${item.ports}P` : (item.role === 'Server' ? 'SRV' : 'DEV')}
                  </span>
                  <span class="font-mono text-[9px] text-slate-500">
                    ${item.baseWatts || item.powerConsumptionWatts || 0}W
                  </span>
                </div>
                <button 
                  type="button" 
                  onclick="event.stopPropagation(); deleteDeviceFromBOM('${item.instanceId}')"
                  class="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-opacity"
                  title="Delete from Quote BOM"
                >
                  <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                </button>
              </div>
            </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Served Downstream Edge Clients -->
      ${servedClients.length > 0 ? `
        <div class="space-y-2">
          <span class="text-[10px] font-bold uppercase tracking-wider text-teal-400 flex items-center justify-between">
            <span>Downstream Field Endpoints</span>
            <span class="font-mono text-[9px] text-slate-400">${servedClients.length} Total</span>
          </span>
          <div class="grid grid-cols-2 gap-2 text-xs font-mono">
            <div class="bg-slate-950 p-2 rounded-lg border border-slate-850 text-center">
              <span class="text-teal-400 font-bold block text-sm">${cameraCount}</span>
              <span class="text-[10px] text-slate-400">Cameras</span>
            </div>
            <div class="bg-slate-950 p-2 rounded-lg border border-slate-850 text-center">
              <span class="text-emerald-400 font-bold block text-sm">${doorCount}</span>
              <span class="text-[10px] text-slate-400">Access Doors</span>
            </div>
          </div>
        </div>
      ` : ''}
    `;

    if (typeof safeCreateIcons === "function") {
      safeCreateIcons(container);
    } else if (window.lucide) {
      lucide.createIcons();
    }
    return;
  } else if (selectedTopologyNodeId) {
    const item = projectBOM.find(i => i.instanceId === selectedTopologyNodeId);
    if (!item) {
      deselectTopologyNode();
      return;
    }

    if (selectedNodeEl) selectedNodeEl.innerText = item.model;
    if (powerSourceEl) powerSourceEl.innerText = getPowerSourceLabel(item);

    // Find upstream link
    const upstreamLink = topologyLinks.find(l => l.toId === item.instanceId);
    if (linkSpeedEl) linkSpeedEl.innerText = upstreamLink ? upstreamLink.speedLabel : (item.role === "Server" ? "Server Ingest" : "Host Core");

    // Candidate uplink targets (Core, Agg, Peer Access switches, Wireless Radios, Gateways and Firewalls)
    const candidateTargets = projectBOM.filter(n => {
      if (n.instanceId === item.instanceId || n.parentInstanceId) return false;
      return n.role === "Core" || n.role === "Core & Agg" || n.role === "Aggregation" || 
             n.role === "Gateways & WAN" || n.role === "Security WAN" || n.role === "Firewall" || n.category === "firewall" ||
             n.role === "Access" || n.role === "Wireless Bridge" || n.category === "wireless";
    });

    // Candidate servers in quote
    const candidateServers = projectBOM.filter(n => !n.parentInstanceId && (n.role === "Server" || n.role === "VMS Server" || n.role === "Compute & Storage"));

    // Connected downstream devices
    const children = projectBOM.filter(ch => ch.uplinkTargetId === item.instanceId && isTopologyActiveNode(ch));

    // If selected node is a SERVER
    if (item.role === "Server" || item.role === "VMS Server" || item.role === "Compute & Storage") {
      // Find all cameras assigned to this server
      const assignedCameras = projectBOM.filter(c => {
        if (c.parentInstanceId) return false;
        if (c.role !== "Camera" && !(c.category && c.category.includes("camera"))) return false;
        if (c.assignedRecordingServerId === item.instanceId) return true;
        if (!c.assignedRecordingServerId && c.uplinkTargetId) {
          const sw = projectBOM.find(s => s.instanceId === c.uplinkTargetId);
          if (sw && sw.assignedVmsServerId === item.instanceId) return true;
        }
        const firstServer = candidateServers[0];
        return (!c.assignedRecordingServerId && firstServer && firstServer.instanceId === item.instanceId);
      });

      // Find all access doors assigned to this server
      const assignedDoors = projectBOM.filter(d => {
        if (d.parentInstanceId) return false;
        if (d.role !== "Access Control" && !(d.category && d.category.includes("access"))) return false;
        if (d.assignedAccessServerId === item.instanceId) return true;
        if (!d.assignedAccessServerId && d.uplinkTargetId) {
          const sw = projectBOM.find(s => s.instanceId === d.uplinkTargetId);
          if (sw && sw.assignedAccessServerId === item.instanceId) return true;
        }
        const firstServer = candidateServers[0];
        return (!d.assignedAccessServerId && firstServer && firstServer.instanceId === item.instanceId);
      });

      let totalIngestMbps = 0;
      let totalCameraCount = 0;
      assignedCameras.forEach(c => {
        const qty = parseInt(c.qty, 10) || 1;
        totalIngestMbps += (parseFloat(c.streamBitrateMbps) || 4.0) * qty;
        totalCameraCount += qty;
      });

      let totalDoorCount = 0;
      assignedDoors.forEach(d => {
        totalDoorCount += (parseInt(d.qty, 10) || 1) * (parseInt(d.doorCapacity, 10) || 2);
      });

      const maxCap = item.maxIngestBandwidthMbps || 750;
      const ingestPercent = Math.min(100, Math.round((totalIngestMbps / maxCap) * 100));
      const hostedRoles = item.hostedRoles || ["VMS Ingest & Recording"];
      const serverSupportedModes = (typeof PortEngine !== "undefined") ? PortEngine.getSupportedPowerModes(item) : ["internal_psu", "dual_ac"];
      const serverPowerMode = (typeof PortEngine !== "undefined") ? PortEngine.getDevicePowerSource(item) : (item.dualPsu ? "dual_ac" : "internal_psu");
      const srvLoc = FacilityStore.normalize(item.closetName || item.rackId);
      const srvPduMetrics = (typeof getRackPduMetricsForLocation === "function") ? getRackPduMetricsForLocation(srvLoc) : null;
      const srvPduOutlets = (srvPduMetrics && srvPduMetrics.byDeviceId) ? (srvPduMetrics.byDeviceId[item.instanceId] || []) : [];

      container.innerHTML = `
        <!-- Server Overview Card -->
        <div class="space-y-2 pb-3 border-b border-slate-800">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5 flex-wrap">
              ${item.deviceNumber ? `<span class="px-1.5 py-0.5 rounded bg-purple-900/60 border border-purple-500/40 text-[9px] font-mono font-bold text-purple-300">${escapeHTML(item.deviceNumber)}</span>` : ''}
              ${item.rackSlot ? `<span class="px-1.5 py-0.5 rounded bg-indigo-950/80 border border-indigo-700/60 text-[9px] font-mono font-bold text-indigo-300">U${escapeHTML(item.rackSlot)}</span>` : ''}
              <span class="text-xs font-bold text-white">${escapeHTML(item.friendlyName || item.model)}</span>
              <button type="button" onclick="promptEditDeviceFriendlyName('${item.instanceId}')" class="text-slate-400 hover:text-white p-0.5 rounded hover:bg-slate-800 transition-colors" title="Edit Friendly Name">
                <i data-lucide="pencil" class="w-3 h-3"></i>
              </button>
            </div>
            <span class="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-purple-500/40 bg-purple-500/10 text-purple-300">
              Server / Appliance
            </span>
          </div>
          ${item.friendlyName && item.friendlyName !== item.model ? `<div class="text-[11px] text-slate-300 font-medium">${escapeHTML(item.model)}</div>` : ''}
          <div class="text-[11px] text-slate-400 space-y-1 font-mono">
            <div>Vendor: <strong class="text-slate-200">${escapeHTML(item.vendor || 'Generic')}</strong></div>
            <div class="pt-1 pb-1">
              <label class="text-[10px] text-slate-400 block mb-1 font-sans">Assigned Rack / Enclosure:</label>
              <select onchange="updateDeviceLocation('${item.instanceId}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-indigo-300 font-mono text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-500 cursor-pointer">
                ${renderTopologyLocationOptions(item.closetName || item.rackId)}
              </select>
            </div>
            <!-- 4-Way Omnipresent Cross-Navigation Action Buttons -->
            <div class="pt-1 pb-1.5 flex items-center gap-1.5 flex-wrap">
              <button 
                type="button" 
                onclick="openRackViewerFor('${escapeJSAttr(item.closetName || item.rackId)}')"
                class="flex-1 min-w-[95px] px-2 py-1 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-200 border border-indigo-500/40 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                title="Open Enclosure Visualizer at this rack"
              >
                <i data-lucide="server" class="w-3 h-3 text-indigo-400"></i> Enclosure
              </button>
              <button 
                type="button" 
                onclick="if (typeof openRackPowerMatrixModal === 'function') openRackPowerMatrixModal('${escapeJSAttr(srvLoc)}');"
                class="flex-1 min-w-[95px] px-2 py-1 bg-amber-950/60 hover:bg-amber-900/80 text-amber-200 border border-amber-500/50 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                title="Open 1:1 Rack Power & PDU Matrix Studio"
              >
                <i data-lucide="zap" class="w-3 h-3 text-amber-400"></i> Power Matrix
              </button>
              <button 
                type="button" 
                onclick="jumpToFacilitySpace('${escapeJSAttr(item.closetName || item.rackId)}')"
                class="px-2 py-1 bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-200 border border-cyan-500/40 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                title="View Space Hierarchy & Unenclosed Devices"
              >
                <i data-lucide="building-2" class="w-3 h-3 text-cyan-400"></i> Space
              </button>
              <button 
                type="button" 
                onclick="jumpToBomTarget('${item.instanceId}')"
                class="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                title="Locate item in BOM Drawer"
              >
                <i data-lucide="file-spreadsheet" class="w-3 h-3 text-emerald-400"></i> BOM
              </button>
              <button 
                type="button" 
                onclick="jumpToPhysicalLayoutTarget('${item.instanceId}')"
                class="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                title="View in Physical Layout Canvas"
              >
                <i data-lucide="map-pin" class="w-3 h-3 text-amber-400"></i> Physical
              </button>
              <button 
                type="button" 
                onclick="deleteDeviceFromBOM('${item.instanceId}')"
                class="px-2 py-1 bg-rose-950/40 hover:bg-rose-900/70 text-rose-300 border border-rose-800/60 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                title="Permanently remove device from Project Quote BOM"
              >
                <i data-lucide="trash-2" class="w-3 h-3 text-rose-400"></i> Delete
              </button>
            </div>
            <div>Interfaces: <strong class="text-white">${item.ports || 2}x ${item.portSpeed || '10G'} High-Speed NICs</strong></div>
            ${item.usableStorageTb ? `<div>Video Storage: <strong class="text-emerald-400">${item.usableStorageTb} TB RAID Array</strong></div>` : ''}
          </div>
        </div>

        <!-- Electrical & Power Supply -->
        <div class="space-y-2 pb-3 border-b border-slate-800">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <i data-lucide="zap" class="w-3.5 h-3.5"></i> Electrical & Rack PDU Feed
            </span>
            ${srvPduOutlets.length > 0 ? `
              <button 
                type="button" 
                onclick="if (typeof openRackPowerMatrixModal === 'function') openRackPowerMatrixModal('${escapeJSAttr(srvLoc)}');"
                class="px-1.5 py-0.5 bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-700/60 rounded text-[9px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-colors"
                title="Open Dedicated 1:1 Power Matrix Studio"
              >
                <i data-lucide="maximize-2" class="w-2.5 h-2.5"></i> Studio
              </button>
            ` : ''}
          </div>
          <div class="space-y-2 bg-slate-950 p-2.5 rounded-xl border border-slate-850 text-xs">
            <div>
              <label class="text-[10px] text-slate-400 block mb-1">Power Architecture:</label>
              <select onchange="setDevicePowerSource('${item.instanceId}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-amber-300 font-mono text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-500">
                ${serverSupportedModes.map(m => {
                  const def = (typeof POWER_SOURCE_MODES !== "undefined" && POWER_SOURCE_MODES[m]) || { label: m };
                  return `<option value="${m}" class="bg-slate-900 text-white" ${serverPowerMode === m ? 'selected' : ''}>${def.label}</option>`;
                }).join('')}
              </select>
            </div>
            <div class="flex justify-between text-slate-400 text-xs font-mono pt-1">
              <span>Chassis Draw:</span>
              <span class="text-white font-bold">${item.baseWatts || item.powerWatts || 350} W</span>
            </div>
            ${srvPduOutlets.length > 0 ? `
              <div class="pt-1.5 mt-1 border-t border-slate-900 space-y-1.5 font-mono text-[10px]">
                <div class="text-slate-400 font-bold uppercase text-[9px] flex items-center justify-between">
                  <span>1:1 Rack PDU Receptacle Mapping</span>
                  <span class="text-amber-300">${srvPduOutlets.length}x Power Cord${srvPduOutlets.length > 1 ? 's' : ''}</span>
                </div>
                ${srvPduOutlets.map(rec => `
                  <div class="p-1.5 rounded-lg bg-slate-900/90 border border-amber-500/30 space-y-0.5">
                    <div class="flex items-center justify-between">
                      <span class="text-amber-300 font-bold">${escapeHTML(rec.psuTag)} &rarr; ${escapeHTML(rec.receptacleId)}</span>
                      <span class="text-slate-300">${escapeHTML(rec.cordSku || 'P006-006')} (${rec.cordLengthFt || 6}ft)</span>
                    </div>
                    <div class="text-[9px] text-slate-400 flex items-center justify-between">
                      <span>Cord ID: <strong class="text-white">${escapeHTML(rec.cordId)}</strong></span>
                      <span>${rec.watts}W &bull; ${escapeHTML(rec.receptacleType || '5-15R')}</span>
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Hosted Software Services & Roles -->
        <div class="space-y-2 pb-3 border-b border-slate-800">
          <span class="text-[10px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
            <i data-lucide="cpu" class="w-3.5 h-3.5"></i> Hosted Software Roles
          </span>
          <div class="space-y-1.5">
            ${[
              { name: "VMS Ingest & Recording", desc: "Real-time camera stream ingestion & archiving" },
              { name: "Access Control Engine", desc: "Cardholder validation & door access engine" },
              { name: "AI Video Analytics", desc: "Object recognition & vehicle LPR processing" },
              { name: "Directory / IAM Authentication", desc: "LDAP / SSO enterprise user sync" }
            ].map(r => {
              const active = hostedRoles.includes(r.name);
              return `
                <div 
                  onclick="toggleServerRole('${item.instanceId}', '${r.name}')" 
                  class="flex items-start gap-2 p-2 rounded-xl border ${active ? 'border-purple-500/50 bg-purple-500/10' : 'border-slate-800 bg-slate-950/60 opacity-60'} cursor-pointer hover:opacity-100 transition-all text-xs"
                >
                  <input type="checkbox" ${active ? 'checked' : ''} class="mt-0.5 rounded border-slate-700 bg-slate-900 text-purple-500 pointer-events-none" />
                  <div class="min-w-0">
                    <span class="font-bold text-white block text-[11px]">${r.name}</span>
                    <span class="text-[10px] text-slate-400 block">${r.desc}</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Video Ingest Telemetry -->
        <div class="space-y-2 pb-3 border-b border-slate-800">
          <span class="text-[10px] font-bold uppercase tracking-wider text-teal-400 flex items-center justify-between">
            <span class="flex items-center gap-1.5"><i data-lucide="video" class="w-3.5 h-3.5"></i> Video Ingest Pipeline</span>
            <span class="font-mono text-[9px] text-slate-400">${totalCameraCount} Streams</span>
          </span>
          <div class="space-y-2 bg-slate-950 p-2.5 rounded-xl border border-slate-850 text-xs font-mono">
            <div class="flex justify-between">
              <span class="text-slate-400">Total Ingest Load:</span>
              <span class="text-teal-300 font-bold">${Math.round(totalIngestMbps)} Mbps / ${maxCap} Mbps</span>
            </div>
            <div class="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
              <div class="h-full rounded-full transition-all ${ingestPercent > 85 ? 'bg-rose-500' : 'bg-teal-400'}" style="width: ${ingestPercent}%"></div>
            </div>
            <div class="flex justify-between text-[10px] text-slate-500">
              <span>Ingress Utilization:</span>
              <span class="${ingestPercent > 85 ? 'text-rose-400 font-bold' : 'text-slate-300'}">${ingestPercent}% Capacity</span>
            </div>
          </div>

          <!-- Ingest Stream Breakdown -->
          <div class="space-y-1 max-h-36 overflow-y-auto pr-1">
            ${assignedCameras.length === 0 ? `
              <div class="text-[11px] text-slate-500 py-2 text-center bg-slate-950 rounded-lg">No camera streams assigned to this host yet.</div>
            ` : assignedCameras.map(c => `
              <div class="bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-850 flex items-center justify-between text-xs">
                <span class="text-slate-200 font-medium truncate max-w-[170px]">${escapeHTML(c.model)}</span>
                <span class="font-mono text-teal-400 text-[10px] shrink-0">${(parseFloat(c.streamBitrateMbps) || 4.0) * (c.qty || 1)} Mbps</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Access Control Pipeline -->
        <div class="space-y-2 pb-3 border-b border-slate-800">
          <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center justify-between">
            <span class="flex items-center gap-1.5"><i data-lucide="shield" class="w-3.5 h-3.5"></i> Access Control Pipeline</span>
            <span class="font-mono text-[9px] text-slate-400">${totalDoorCount} Doors</span>
          </span>
          <div class="space-y-1.5 bg-slate-950 p-2.5 rounded-xl border border-slate-850 text-xs font-mono">
            <div class="flex justify-between">
              <span class="text-slate-400">Managed Doors:</span>
              <span class="text-emerald-400 font-bold">${totalDoorCount} Access Readers Online</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Security Protocol:</span>
              <span class="text-slate-300">OSDP v2 Secure Channel</span>
            </div>
          </div>
        </div>

        <!-- Core Uplink Interconnect -->
        <div class="space-y-2">
          <span class="text-[10px] font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
            <i data-lucide="git-commit" class="w-3.5 h-3.5"></i> Core Switch Uplink
          </span>
          <div class="space-y-2 bg-slate-950 p-2.5 rounded-xl border border-slate-850 text-xs">
            <div>
              <label class="text-[10px] text-slate-400 block mb-1">Target Core / Aggregation Switch:</label>
              <select onchange="updateCustomUplink('${item.instanceId}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-brand-500">
                <option value="" class="bg-slate-900 text-white">Auto-Assign (Nearest Core)</option>
                ${candidateTargets.map(t => `
                  <option value="${t.instanceId}" class="bg-slate-900 text-white" ${item.customUplinkTargetId === t.instanceId ? 'selected' : ''}>${t.model} (${FacilityStore.normalize(t.closetName)})</option>
                `).join('')}
              </select>
            </div>
          </div>
        </div>
      `;
      return;
    }

    const isRadio = item.role === "Wireless Bridge" || item.category === "wireless" || item.category === "ptp_60g" || item.topology === "PtP / PtMP";
    const isEdgeDevice = item.role === "Camera" || item.role === "Access Control" || (item.category && (item.category.includes("camera") || item.category.includes("access")));

    // If selected node is a WIRELESS RADIO / PTP BRIDGE
    if (isRadio) {
      const hostSwitch = item.uplinkTargetId ? projectBOM.find(s => s.instanceId === item.uplinkTargetId) : null;
      const currentPowerMode = (typeof PortEngine !== "undefined") ? PortEngine.getDevicePowerSource(item) : (item.powerSourceOverride || "poe_switch");
      const supportedModes = (typeof PortEngine !== "undefined") ? PortEngine.getSupportedPowerModes(item) : ["poe_switch", "poe_injector"];
      const peerRadios = projectBOM.filter(r => (r.category === "wireless" || r.role === "Wireless Bridge") && r.instanceId !== item.instanceId);

      container.innerHTML = `
        <!-- Wireless Overview Card -->
        <div class="space-y-2 pb-3 border-b border-slate-800">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5 flex-wrap">
              ${item.deviceNumber ? `<span class="px-1.5 py-0.5 rounded bg-purple-900/60 border border-purple-500/40 text-[9px] font-mono font-bold text-purple-300">${escapeHTML(item.deviceNumber)}</span>` : ''}
              <span class="text-xs font-bold text-white truncate max-w-[180px]">${escapeHTML(item.friendlyName || item.model)}</span>
              <button type="button" onclick="promptEditDeviceFriendlyName('${item.instanceId}')" class="text-slate-400 hover:text-white p-0.5 rounded hover:bg-slate-800 transition-colors" title="Edit Friendly Name">
                <i data-lucide="pencil" class="w-3 h-3"></i>
              </button>
            </div>
            <span class="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-purple-500/40 bg-purple-500/10 text-purple-300 shrink-0">
              Wireless RF
            </span>
          </div>
          ${item.friendlyName && item.friendlyName !== item.model ? `<div class="text-[11px] text-slate-300 font-medium">${escapeHTML(item.model)}</div>` : ''}
          <div class="text-[11px] text-slate-400 space-y-1 font-mono">
            <div>Throughput: <strong class="text-purple-300">${item.throughput || item.maxThroughput || '5.4 Gbps'}</strong></div>
            <div>Band: <strong class="text-white">${item.band || item.frequency || '60 GHz / 5 GHz Backup'}</strong></div>
            <div class="pt-1 pb-1">
              <label class="text-[10px] text-slate-400 block mb-1 font-sans">Assigned Location / Enclosure:</label>
              <select onchange="updateDeviceLocation('${item.instanceId}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-indigo-300 font-mono text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-500 cursor-pointer">
                ${renderTopologyLocationOptions(item.closetName || item.rackId)}
              </select>
            </div>
            <!-- 4-Way Omnipresent Cross-Navigation Action Buttons -->
            <div class="pt-1 pb-1.5 flex items-center gap-1.5 flex-wrap">
              <button 
                type="button" 
                onclick="openRackViewerFor('${escapeJSAttr(item.closetName || item.rackId)}')"
                class="flex-1 min-w-[105px] px-2 py-1 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-200 border border-indigo-500/40 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
                title="Open Enclosure Visualizer at this rack"
              >
                <i data-lucide="server" class="w-3 h-3 text-indigo-400"></i> Enclosure
              </button>
              <button 
                type="button" 
                onclick="jumpToFacilitySpace('${escapeJSAttr(item.closetName || item.rackId)}')"
                class="flex-1 min-w-[105px] px-2 py-1 bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-200 border border-cyan-500/40 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
                title="View Space Hierarchy & Unenclosed Devices"
              >
                <i data-lucide="building-2" class="w-3 h-3 text-cyan-400"></i> Space
              </button>
              <button 
                type="button" 
                onclick="jumpToBomTarget('${item.instanceId}')"
                class="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
                title="Locate item in BOM Drawer"
              >
                <i data-lucide="file-spreadsheet" class="w-3 h-3 text-emerald-400"></i> BOM
              </button>
              <button 
                type="button" 
                onclick="jumpToPhysicalLayoutTarget('${item.instanceId}')"
                class="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
                title="View in Physical Layout Canvas"
              >
                <i data-lucide="map-pin" class="w-3 h-3 text-amber-400"></i> Physical
              </button>
              <button 
                type="button" 
                onclick="deleteDeviceFromBOM('${item.instanceId}')"
                class="px-2 py-1 bg-rose-950/40 hover:bg-rose-900/70 text-rose-300 border border-rose-800/60 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                title="Permanently remove device from Project Quote BOM"
              >
                <i data-lucide="trash-2" class="w-3 h-3 text-rose-400"></i> Delete
              </button>
            </div>
          </div>
        </div>

        <!-- Power Delivery & Sourcing -->
        <div class="space-y-2 pb-3 border-b border-slate-800">
          <span class="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <i data-lucide="zap" class="w-3.5 h-3.5"></i> Power Delivery & Sourcing
          </span>
          <div class="space-y-2 bg-slate-950 p-2.5 rounded-xl border border-slate-850 text-xs">
            <div>
              <label class="text-[10px] text-slate-400 block mb-1">Power Sourcing Method:</label>
              <select onchange="setDevicePowerSource('${item.instanceId}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-amber-300 font-mono text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-500">
                ${supportedModes.map(m => {
                  const def = (typeof POWER_SOURCE_MODES !== "undefined" && POWER_SOURCE_MODES[m]) || { label: m };
                  return `<option value="${m}" class="bg-slate-900 text-white" ${currentPowerMode === m ? 'selected' : ''}>${def.label}</option>`;
                }).join('')}
              </select>
            </div>
            <div class="flex justify-between text-slate-400 text-xs font-mono pt-1">
              <span>Radio Power Consumption:</span>
              <span class="text-amber-400 font-bold">${item.powerWatts || item.maxPowerWatts || 24} W</span>
            </div>
          </div>
        </div>

        <!-- Reverse Uplink & Network Handoff -->
        <div class="space-y-2 pb-3 border-b border-slate-800">
          <span class="text-[10px] font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
            <i data-lucide="git-commit" class="w-3.5 h-3.5"></i> Host Switch Handoff & Uplink Role
          </span>
          <div class="space-y-2.5 bg-slate-950 p-2.5 rounded-xl border border-slate-850 text-xs">
            <div>
              <label class="text-[10px] text-slate-400 block mb-1">Connected Local Switch (e.g. Pole Switch):</label>
              <select onchange="setDeviceHostSwitch('${item.instanceId}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-500">
                <option value="" class="bg-slate-900 text-white">Unassigned</option>
                ${candidateTargets.filter(t => t.role === "Access" || t.role === "Core").map(sw => `
                  <option value="${sw.instanceId}" class="bg-slate-900 text-white" ${item.uplinkTargetId === sw.instanceId ? 'selected' : ''}>
                    ${sw.model} (${FacilityStore.normalize(sw.closetName)})
                  </option>
                `).join('')}
              </select>
            </div>

            <!-- Reverse Uplink Toggle -->
            <div 
              onclick="toggleRadioUplinkRole('${item.instanceId}', ${!item.isUplinkForSwitch})"
              class="flex items-start gap-2 p-2 rounded-xl border ${item.isUplinkForSwitch ? 'border-sky-500/50 bg-sky-500/10' : 'border-slate-800 bg-slate-900/60 opacity-60'} cursor-pointer hover:opacity-100 transition-all text-xs"
            >
              <input type="checkbox" ${item.isUplinkForSwitch ? 'checked' : ''} class="mt-0.5 rounded border-slate-700 bg-slate-900 text-sky-500 pointer-events-none" />
              <div>
                <span class="font-bold text-white block text-[11px]">Provides Network Uplink for Host Switch</span>
                <span class="text-[10px] text-slate-400 block">Switch routes all upstream traffic across this wireless backhaul</span>
              </div>
            </div>
          </div>
        </div>

        <!-- PtP Wireless Peer Link -->
        <div class="space-y-2">
          <span class="text-[10px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
            <i data-lucide="radio" class="w-3.5 h-3.5"></i> PtP Wireless Bridge Partner
          </span>
          <div class="space-y-2 bg-slate-950 p-2.5 rounded-xl border border-slate-850 text-xs">
            <div>
              <label class="text-[10px] text-slate-400 block mb-1">Target Radio (Opposite End of Link):</label>
              <select onchange="updateRadioPartner('${item.instanceId}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-purple-300 font-mono text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-500">
                <option value="" class="bg-slate-900 text-white">Auto-Pair or Standalone</option>
                ${peerRadios.map(p => `
                  <option value="${p.instanceId}" class="bg-slate-900 text-white" ${item.customUplinkTargetId === p.instanceId ? 'selected' : ''}>${p.model} (${FacilityStore.normalize(p.closetName)})</option>
                `).join('')}
              </select>
            </div>
          </div>
        </div>
      `;
      return;
    }

    // If selected node is an EDGE CLIENT (Camera, Access Reader, etc.)
    if (isEdgeDevice) {
      const hostSwitch = item.uplinkTargetId ? projectBOM.find(s => s.instanceId === item.uplinkTargetId) : null;
      const hostSwitchPorts = hostSwitch && typeof PortEngine !== "undefined" ? PortEngine.initSwitchPorts(hostSwitch) : [];
      const hostPatchMap = (hostSwitch && typeof PortEngine !== "undefined" && typeof PortEngine.resolveSwitchPatchMapping === "function")
        ? PortEngine.resolveSwitchPatchMapping(hostSwitch)
        : null;
      const activePortNum = item.assignedSwitchPort || (hostSwitchPorts.find(p => p.connectedDeviceId === item.instanceId)?.portNumber) || null;
      const orionPatchInfo = (hostPatchMap && hostPatchMap.byPortNumber && activePortNum)
        ? hostPatchMap.byPortNumber[activePortNum]
        : null;
      const currentPowerMode = (typeof PortEngine !== "undefined") ? PortEngine.getDevicePowerSource(item) : (item.powerSourceOverride || "poe_switch");
      const supportedModes = (typeof PortEngine !== "undefined") ? PortEngine.getSupportedPowerModes(item) : ["poe_switch", "poe_injector"];
      const isCamera = item.role === "Camera" || (item.category && item.category.includes("camera"));

      container.innerHTML = `
        <!-- Device Overview Card -->
        <div class="space-y-2 pb-3 border-b border-slate-800">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5 flex-wrap">
              ${item.deviceNumber ? `<span class="px-1.5 py-0.5 rounded bg-brand-900/60 border border-brand-500/40 text-[9px] font-mono font-bold text-brand-300">${escapeHTML(item.deviceNumber)}</span>` : ''}
              <span class="text-xs font-bold text-white truncate max-w-[180px]">${escapeHTML(item.friendlyName || item.model)}</span>
              <button type="button" onclick="promptEditDeviceFriendlyName('${item.instanceId}')" class="text-slate-400 hover:text-white p-0.5 rounded hover:bg-slate-800 transition-colors" title="Edit Friendly Name">
                <i data-lucide="pencil" class="w-3 h-3"></i>
              </button>
            </div>
            <span class="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${getRoleBadgeStyle(item.role)} shrink-0">
              ${item.role}
            </span>
          </div>
          ${item.friendlyName && item.friendlyName !== item.model ? `<div class="text-[11px] text-slate-300 font-medium">${escapeHTML(item.model)}</div>` : ''}
          <div class="text-[11px] text-slate-400 space-y-1 font-mono">
            <div>Vendor: <strong class="text-slate-200">${escapeHTML(item.vendor || 'Generic')}</strong></div>
            <div class="pt-1 pb-1">
              <label class="text-[10px] text-slate-400 block mb-1 font-sans">Assigned Location / Enclosure:</label>
              <select onchange="updateDeviceLocation('${item.instanceId}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-indigo-300 font-mono text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-500 cursor-pointer">
                ${renderTopologyLocationOptions(item.closetName || item.rackId)}
              </select>
            </div>
            <!-- 4-Way Omnipresent Cross-Navigation Action Buttons -->
            <div class="pt-1 pb-1.5 flex items-center gap-1.5 flex-wrap">
              <button 
                type="button" 
                onclick="openRackViewerFor('${escapeJSAttr(item.closetName || item.rackId)}')"
                class="flex-1 min-w-[105px] px-2 py-1 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-200 border border-indigo-500/40 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
                title="Open Enclosure Visualizer at this rack"
              >
                <i data-lucide="server" class="w-3 h-3 text-indigo-400"></i> Enclosure
              </button>
              <button 
                type="button" 
                onclick="jumpToFacilitySpace('${escapeJSAttr(item.closetName || item.rackId)}')"
                class="flex-1 min-w-[105px] px-2 py-1 bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-200 border border-cyan-500/40 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
                title="View Space Hierarchy & Unenclosed Devices"
              >
                <i data-lucide="building-2" class="w-3 h-3 text-cyan-400"></i> Space
              </button>
              <button 
                type="button" 
                onclick="jumpToBomTarget('${item.instanceId}')"
                class="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
                title="Locate item in BOM Drawer"
              >
                <i data-lucide="file-spreadsheet" class="w-3 h-3 text-emerald-400"></i> BOM
              </button>
              <button 
                type="button" 
                onclick="jumpToPhysicalLayoutTarget('${item.instanceId}')"
                class="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
                title="View in Physical Layout Canvas"
              >
                <i data-lucide="map-pin" class="w-3 h-3 text-amber-400"></i> Physical
              </button>
              <button 
                type="button" 
                onclick="deleteDeviceFromBOM('${item.instanceId}')"
                class="px-2 py-1 bg-rose-950/40 hover:bg-rose-900/70 text-rose-300 border border-rose-800/60 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                title="Permanently remove device from Project Quote BOM"
              >
                <i data-lucide="trash-2" class="w-3 h-3 text-rose-400"></i> Delete
              </button>
            </div>
            <div>Hardware Interface: <strong class="text-white">1x 1G RJ-45 (100m Loop)</strong></div>
          </div>
        </div>

        <!-- Power Delivery & Sourcing -->
        <div class="space-y-2 pb-3 border-b border-slate-800">
          <span class="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <i data-lucide="zap" class="w-3.5 h-3.5"></i> Power Delivery & Sourcing
          </span>
          <div class="space-y-2 bg-slate-950 p-2.5 rounded-xl border border-slate-850 text-xs">
            <div>
              <label class="text-[10px] text-slate-400 block mb-1">Power Sourcing Method:</label>
              <select onchange="setDevicePowerSource('${item.instanceId}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-amber-300 font-mono text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-500">
                ${supportedModes.map(m => {
                  const def = (typeof POWER_SOURCE_MODES !== "undefined" && POWER_SOURCE_MODES[m]) || { label: m };
                  return `<option value="${m}" class="bg-slate-900 text-white" ${currentPowerMode === m ? 'selected' : ''}>${def.label}</option>`;
                }).join('')}
              </select>
            </div>

            <div class="flex justify-between items-center text-slate-400 text-xs font-mono pt-1">
              <span>Device Power Draw:</span>
              <span class="text-amber-400 font-bold">${item.powerConsumptionWatts || item.maxPowerWatts || 15} W</span>
            </div>

            ${currentPowerMode !== 'poe_switch' ? `
              <div class="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-300 flex items-start gap-1.5">
                <i data-lucide="info" class="w-3.5 h-3.5 shrink-0 mt-0.5"></i>
                <span>External power supply active. Switch port carries data only with 0W PoE load on switch budget.</span>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Network Switch, Orion Patch Panel & Port Mapping -->
        <div class="space-y-2 pb-3 border-b border-slate-800">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
              <i data-lucide="git-commit" class="w-3.5 h-3.5"></i> Host Switch & Orion Patch Path
            </span>
            ${hostSwitch ? `
              <button 
                type="button" 
                onclick="if (typeof openPortMatrixStudio === 'function') openPortMatrixStudio('${hostSwitch.instanceId}');"
                class="px-1.5 py-0.5 bg-sky-950/60 hover:bg-sky-900/80 text-sky-300 border border-sky-700/60 rounded text-[9px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-colors"
                title="Open Port & Patch Panel Matrix Studio"
              >
                <i data-lucide="grid" class="w-2.5 h-2.5"></i> Port Matrix
              </button>
            ` : ''}
          </div>
          <div class="space-y-2 bg-slate-950 p-2.5 rounded-xl border border-slate-850 text-xs">
            <div>
              <label class="text-[10px] text-slate-400 block mb-1">Connected Host Switch:</label>
              <select onchange="setDeviceHostSwitch('${item.instanceId}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-500">
                <option value="" class="bg-slate-900 text-white">Unassigned</option>
                ${candidateTargets.filter(t => t.role === "Access" || t.role === "Core" || t.role === "Core & Agg" || t.role === "Gateways & WAN" || t.role === "Security WAN" || t.role === "Firewall").map(sw => `
                  <option value="${sw.instanceId}" class="bg-slate-900 text-white" ${item.uplinkTargetId === sw.instanceId ? 'selected' : ''}>
                    ${sw.model} (${FacilityStore.normalize(sw.closetName)})
                  </option>
                `).join('')}
              </select>
            </div>

            ${hostSwitch ? `
              <div>
                <label class="text-[10px] text-slate-400 block mb-1">Assigned Switch Port:</label>
                <select onchange="setDeviceSwitchPort('${item.instanceId}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-sky-300 font-mono text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-brand-500">
                  ${hostSwitchPorts.map(p => `
                    <option value="${p.portNumber}" class="bg-slate-900 text-white" ${(item.assignedSwitchPort === p.portNumber || p.connectedDeviceId === item.instanceId) ? 'selected' : ''}>
                      ${p.label} &bull; ${p.speed} ${p.poeStandard ? `(${p.poeStandard.toUpperCase()})` : ''} ${p.connectedDeviceId && p.connectedDeviceId !== item.instanceId ? `[In Use: ${p.connectedDeviceModel}]` : ''}
                    </option>
                  `).join('')}
                </select>
              </div>
              ${orionPatchInfo ? `
                <div class="pt-1.5 mt-1 border-t border-slate-900 space-y-1 font-mono text-[10px]">
                  <div class="flex items-center justify-between">
                    <span class="text-slate-400">Horizontal Cable ID:</span>
                    <span class="px-1.5 py-0.2 rounded bg-sky-950 text-sky-300 border border-sky-700/60 font-bold">${escapeHTML(orionPatchInfo.horizontalCableId)}</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-slate-400">Patch Panel Jack:</span>
                    <span class="text-cyan-300 font-bold">${escapeHTML(orionPatchInfo.keystoneJackLabel)}</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-slate-400">Patch Cord:</span>
                    <span class="text-indigo-300 font-bold">${escapeHTML(orionPatchInfo.patchCordId)} (${escapeHTML(orionPatchInfo.patchCordSpec?.label || '3 ft Cat6')})</span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-slate-400">Switch Port Tag:</span>
                    <span class="text-emerald-300 font-bold">${escapeHTML(orionPatchInfo.closetCode)}-${escapeHTML(orionPatchInfo.switchPortTag)}</span>
                  </div>
                  <div class="mt-1 p-1.5 rounded bg-slate-900 border border-slate-800 text-[9px] text-slate-300 space-y-0.5">
                    <div class="text-[8px] uppercase text-slate-500 font-bold">2-Line Brady Label (Headend)</div>
                    <div class="text-amber-300 font-bold">${escapeHTML(orionPatchInfo.headendLabelLine1)}</div>
                    <div class="text-cyan-300">${escapeHTML(orionPatchInfo.headendLabelLine2)}</div>
                  </div>
                </div>
              ` : ''}
            ` : ''}
          </div>
        </div>

        <!-- Application Specific Routing (Camera / Access) -->
        ${isCamera ? `
          <div class="space-y-2">
            <span class="text-[10px] font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
              <i data-lucide="video" class="w-3.5 h-3.5"></i> VMS Video Stream Routing
            </span>
            <div class="space-y-2 bg-slate-950 p-2.5 rounded-xl border border-slate-850 text-xs font-mono">
              <div class="flex justify-between">
                <span class="text-slate-400">Stream Bitrate:</span>
                <span class="text-teal-400 font-bold">${item.streamBitrateMbps || 4.0} Mbps Continuous</span>
              </div>
              <div>
                <label class="text-[10px] text-slate-400 block mb-1">Assigned Recording Server:</label>
                <select onchange="item.assignedRecordingServerId = this.value || null; FacilityStore.notifyWorkspaceChange(); renderTopology(); renderTopologyInspector();" class="w-full bg-slate-900 border border-slate-700 text-teal-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-500">
                  <option value="" class="bg-slate-900 text-white">Auto-Detect Primary VMS</option>
                  ${candidateServers.map(s => `
                    <option value="${s.instanceId}" class="bg-slate-900 text-white" ${item.assignedRecordingServerId === s.instanceId ? 'selected' : ''}>${s.model} (${FacilityStore.normalize(s.closetName)})</option>
                  `).join('')}
                </select>
              </div>
            </div>
          </div>
        ` : `
          <div class="space-y-2">
            <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <i data-lucide="shield" class="w-3.5 h-3.5"></i> Access Control Engine Routing
            </span>
            <div class="space-y-2 bg-slate-950 p-2.5 rounded-xl border border-slate-850 text-xs font-mono">
              <div class="flex justify-between">
                <span class="text-slate-400">Door Capacity:</span>
                <span class="text-emerald-400 font-bold">${item.doorCapacity || 2} Doors Managed</span>
              </div>
              <div>
                <label class="text-[10px] text-slate-400 block mb-1">Assigned Access Engine Server:</label>
                <select onchange="item.assignedAccessServerId = this.value || null; FacilityStore.notifyWorkspaceChange(); renderTopology(); renderTopologyInspector();" class="w-full bg-slate-900 border border-slate-700 text-emerald-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-500">
                  <option value="" class="bg-slate-900 text-white">Auto-Detect Primary Host</option>
                  ${candidateServers.map(s => `
                    <option value="${s.instanceId}" class="bg-slate-900 text-white" ${item.assignedAccessServerId === s.instanceId ? 'selected' : ''}>${s.model} (${FacilityStore.normalize(s.closetName)})</option>
                  `).join('')}
                </select>
              </div>
            </div>
          </div>
        `}
      `;
      return;
    }

    // Default Switch Inspector Card
    if (typeof enrichBOMItemFromCatalog === "function") enrichBOMItemFromCatalog(item);
    const switchPorts = typeof PortEngine !== "undefined" ? PortEngine.initSwitchPorts(item) : [];
    const portSummary = typeof PortEngine !== "undefined" ? PortEngine.getPortSummary(item) : null;
    const supportedModes = typeof PortEngine !== "undefined" ? PortEngine.getSupportedPowerModes(item) : ["internal_psu"];
    const currentPowerMode = typeof PortEngine !== "undefined" ? PortEngine.getDevicePowerSource(item) : (item.powerSource || "internal_psu");
    const swPatchMap = (typeof PortEngine !== "undefined" && typeof PortEngine.resolveSwitchPatchMapping === "function")
      ? PortEngine.resolveSwitchPatchMapping(item)
      : null;
    const swLoc = FacilityStore.normalize(item.closetName || item.rackId);
    const swPduMetrics = (typeof getRackPduMetricsForLocation === "function") ? getRackPduMetricsForLocation(swLoc) : null;
    const swPduOutlets = (swPduMetrics && swPduMetrics.byDeviceId) ? (swPduMetrics.byDeviceId[item.instanceId] || []) : [];

    const isStacked = (item.stackedUnits && item.stackedUnits >= 2) || 
      (item.stackedUnits !== 0 && item.qty >= 2 && (item.canStack || item.role === "Access" || item.role === "Aggregation"));
    const stackUnits = isStacked ? (item.stackedUnits || item.qty) : 1;
    const basePortsPerUnit = item.ports || 24;
    const totalStackPorts = basePortsPerUnit * stackUnits;
    const totalStackPoE = (item.poeBudget || 0) * stackUnits;
    const totalStackBaseWatts = (item.baseWatts || 0) * stackUnits;
    const itemRU = (item.rackUnits !== undefined && item.rackUnits !== null) ? item.rackUnits : 1;

    const copperPorts = switchPorts.filter(p => p.connector === "RJ-45" || p.mediaType?.includes("rj45"));
    const opticalCages = switchPorts.filter(p => p.connector && p.connector !== "RJ-45" && !p.mediaType?.includes("rj45"));
    const isAllOptical = copperPorts.length === 0 && opticalCages.length > 0;

    container.innerHTML = `
      <!-- Node Overview Card -->
      <div class="space-y-2 pb-3 border-b border-slate-800">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1.5 flex-wrap">
            ${item.deviceNumber ? `<span class="px-1.5 py-0.5 rounded bg-brand-900/60 border border-brand-500/40 text-[9px] font-mono font-bold text-brand-300">${escapeHTML(item.deviceNumber)}</span>` : ''}
            ${item.rackSlot ? `<span class="px-1.5 py-0.5 rounded bg-indigo-950/80 border border-indigo-700/60 text-[9px] font-mono font-bold text-indigo-300">U${escapeHTML(item.rackSlot)}</span>` : ''}
            <span class="text-xs font-bold text-white truncate max-w-[180px]">${escapeHTML(item.friendlyName || item.model)}</span>
            <button type="button" onclick="promptEditDeviceFriendlyName('${item.instanceId}')" class="text-slate-400 hover:text-white p-0.5 rounded hover:bg-slate-800 transition-colors" title="Edit Friendly Name">
              <i data-lucide="pencil" class="w-3 h-3"></i>
            </button>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            ${isStacked ? `
              <span class="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border border-indigo-500/50 bg-indigo-500/20 text-indigo-300">
                Stack (${stackUnits}U)
              </span>
            ` : ''}
            <span class="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${getRoleBadgeStyle(item.role)}">
              ${item.role}
            </span>
          </div>
        </div>
        ${item.friendlyName && item.friendlyName !== item.model ? `<div class="text-[11px] text-slate-300 font-medium">${escapeHTML(item.model)}</div>` : ''}
        <div class="text-[11px] text-slate-400 space-y-1 font-mono">
          <div>Vendor: <strong class="text-slate-200">${escapeHTML(item.vendor || 'Generic')}</strong></div>
          <div>Architecture: <strong class="${isStacked ? 'text-indigo-300 font-semibold' : 'text-slate-300'}">${isStacked ? `Single Logical Stack (${stackUnits}x Member Units &bull; ${itemRU * stackUnits}U)` : (itemRU === 0 ? '0U Compact / DIN / Desktop Chassis' : `${itemRU}U Standalone Chassis`)}</strong></div>
          <div class="pt-1 pb-1">
            <label class="text-[10px] text-slate-400 block mb-1 font-sans">Assigned Rack / Enclosure:</label>
            <select onchange="updateDeviceLocation('${item.instanceId}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-indigo-300 font-mono text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-500 cursor-pointer">
              ${renderTopologyLocationOptions(item.closetName || item.rackId)}
            </select>
          </div>
          <!-- 4-Way Omnipresent Cross-Navigation Action Buttons -->
          <div class="pt-1 pb-1.5 flex items-center gap-1.5 flex-wrap">
            <button 
              type="button" 
              onclick="openRackViewerFor('${item.closetName || item.rackId}')"
              class="flex-1 min-w-[95px] px-2 py-1 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-200 border border-indigo-500/40 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
              title="Open Enclosure Visualizer at this rack"
            >
              <i data-lucide="server" class="w-3 h-3 text-indigo-400"></i> Enclosure
            </button>
            <button 
              type="button" 
              onclick="if (typeof openRackPowerMatrixModal === 'function') openRackPowerMatrixModal('${escapeJSAttr(swLoc)}');"
              class="flex-1 min-w-[95px] px-2 py-1 bg-amber-950/60 hover:bg-amber-900/80 text-amber-200 border border-amber-500/50 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
              title="Open 1:1 Rack Power & PDU Matrix Studio"
            >
              <i data-lucide="zap" class="w-3 h-3 text-amber-400"></i> Power Matrix
            </button>
            <button 
              type="button" 
              onclick="jumpToFacilitySpace('${item.closetName || item.rackId}')"
              class="px-2 py-1 bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-200 border border-cyan-500/40 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
              title="View Space Hierarchy & Unenclosed Devices"
            >
              <i data-lucide="building-2" class="w-3 h-3 text-cyan-400"></i> Space
            </button>
            <button 
              type="button" 
              onclick="jumpToBomTarget('${item.instanceId}')"
              class="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
              title="Locate item in BOM Drawer"
            >
              <i data-lucide="file-spreadsheet" class="w-3 h-3 text-emerald-400"></i> BOM
            </button>
            <button 
              type="button" 
              onclick="jumpToPhysicalLayoutTarget('${item.instanceId}')"
              class="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
              title="View in Physical Layout Canvas"
            >
              <i data-lucide="map-pin" class="w-3 h-3 text-amber-400"></i> Physical
            </button>
            <button 
              type="button" 
              onclick="deleteDeviceFromBOM('${item.instanceId}')"
              class="px-2 py-1 bg-rose-950/40 hover:bg-rose-900/70 text-rose-300 border border-rose-800/60 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
              title="Permanently remove device from Project Quote BOM"
            >
              <i data-lucide="trash-2" class="w-3 h-3 text-rose-400"></i> Delete
            </button>
          </div>
          <div>Interface: <strong class="text-white">${totalStackPorts} Ports ${isStacked ? `(${stackUnits}x ${basePortsPerUnit}P Stack)` : ''} &bull; ${escapeHTML(item.portFormFactorSummary || item.portSpeed || '1G')}</strong></div>
          ${item.uplinksSummary ? `<div class="text-[10px] text-sky-400">Uplinks: <span class="text-slate-300 font-semibold">${escapeHTML(item.uplinksSummary)}</span></div>` : ''}
        </div>
      </div>

      <!-- Chassis Stacking & Virtual Resiliency -->
      ${(item.canStack || item.role === "Access") ? `
        <div class="space-y-2 pb-3 border-b border-slate-800">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
              <i data-lucide="layers" class="w-3.5 h-3.5"></i> Chassis Stacking & Resiliency
            </span>
            <span class="text-[9px] font-mono ${isStacked ? 'text-indigo-400 font-bold bg-indigo-500/10 border border-indigo-500/30 px-1.5 py-0.5 rounded' : 'text-slate-500'}">
              ${isStacked ? `${stackUnits}-Switch Stack` : 'Standalone'}
            </span>
          </div>
          <div class="space-y-2 bg-slate-950 p-2.5 rounded-xl border border-slate-850 text-xs">
            <div>
              <label class="text-[10px] text-slate-400 block mb-1 font-sans">Stack Members (Treated as 1 Single Stack):</label>
              <select onchange="updateSwitchStackFromTopology('${item.instanceId}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-indigo-300 font-mono text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-500">
                <option value="0" class="bg-slate-900 text-white" ${!isStacked ? 'selected' : ''}>0 (Standalone - 1 Unit)</option>
                <option value="2" class="bg-slate-900 text-white" ${stackUnits === 2 ? 'selected' : ''}>2 Units (Dual-Chassis Stack - Recommended)</option>
                <option value="3" class="bg-slate-900 text-white" ${stackUnits === 3 ? 'selected' : ''}>3 Units (3-Chassis Stack)</option>
                <option value="4" class="bg-slate-900 text-white" ${stackUnits === 4 ? 'selected' : ''}>4 Units (4-Chassis Stack)</option>
              </select>
            </div>
            <div class="text-[10px] font-mono text-slate-400 space-y-1 pt-1 border-t border-slate-900">
              <div class="flex justify-between">
                <span>Hardware Stacking Cables:</span>
                <span class="text-white font-bold">${isStacked ? `${stackUnits}x Dedicated Cables (In BOM)` : 'None'}</span>
              </div>
              <div class="flex justify-between">
                <span>Uplink Architecture:</span>
                <span class="text-indigo-300 font-semibold">${isStacked ? 'Cross-Stack LACP LAG (Failover Protected)' : 'Standard Single Trunk'}</span>
              </div>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- Power & PoE Telemetry -->
      <div class="space-y-2 pb-3 border-b border-slate-800">
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <i data-lucide="zap" class="w-3.5 h-3.5"></i> Electrical & PoE Telemetry
          </span>
          ${swPduOutlets.length > 0 ? `
            <button 
              type="button" 
              onclick="if (typeof openRackPowerMatrixModal === 'function') openRackPowerMatrixModal('${escapeJSAttr(swLoc)}');"
              class="px-1.5 py-0.5 bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-700/60 rounded text-[9px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-colors"
              title="Open Dedicated 1:1 Power Matrix Studio"
            >
              <i data-lucide="maximize-2" class="w-2.5 h-2.5"></i> Studio
            </button>
          ` : ''}
        </div>
        <div class="space-y-2 text-xs bg-slate-950 p-2.5 rounded-xl border border-slate-850">
          <div>
            <label class="text-[10px] text-slate-400 block mb-1 font-sans">Chassis Power Mode:</label>
            <select onchange="setDevicePowerSource('${item.instanceId}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-amber-300 font-mono text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-500">
              ${supportedModes.map(m => {
                const def = (typeof POWER_SOURCE_MODES !== "undefined" && POWER_SOURCE_MODES[m]) || { label: m };
                return `<option value="${m}" class="bg-slate-900 text-white" ${currentPowerMode === m ? 'selected' : ''}>${def.label}</option>`;
              }).join('')}
            </select>
          </div>
          <div class="flex justify-between text-slate-400">
            <span>Power Source:</span>
            <span class="text-amber-300 font-bold font-mono">${getPowerSourceLabel(item)}${isStacked ? ` (${stackUnits}x PSUs)` : ''}</span>
          </div>
          <div class="flex justify-between text-slate-400">
            <span>Chassis Base Draw:</span>
            <span class="font-mono text-white">${totalStackBaseWatts} W ${isStacked ? `(${stackUnits}x ${item.baseWatts || 0}W Chassis)` : ''}</span>
          </div>
          ${item.maxPowerWatts ? `
            <div class="flex justify-between text-slate-400">
              <span>Max System Draw:</span>
              <span class="font-mono text-slate-300">${item.maxPowerWatts * stackUnits} W ${isStacked ? `(${stackUnits}x ${item.maxPowerWatts}W)` : ''}</span>
            </div>
          ` : ''}
          ${item.heatBtuPerHour ? `
            <div class="flex justify-between text-slate-400">
              <span>Thermal Dissipation:</span>
              <span class="font-mono text-amber-300">${item.heatBtuPerHour * stackUnits} BTU/hr</span>
            </div>
          ` : ''}
          ${totalStackPoE > 0 ? `
            <div class="flex justify-between text-slate-400">
              <span>Total PoE Budget:</span>
              <span class="font-mono text-amber-400 font-bold">${totalStackPoE} W ${isStacked ? `(${stackUnits}x ${item.poeBudget}W PSUs)` : ''}</span>
            </div>
            <div class="flex justify-between text-slate-400">
              <span>Connected Load:</span>
              <span class="font-mono ${((item.consumedPoEWatts || 0) > totalStackPoE) ? 'text-rose-400 font-bold' : 'text-emerald-400'}">
                ${item.consumedPoEWatts || 0} W (${Math.round(((item.consumedPoEWatts || 0) / (totalStackPoE || 1)) * 100)}%)
              </span>
            </div>
          ` : ''}
          ${swPduOutlets.length > 0 ? `
            <div class="pt-1.5 mt-1 border-t border-slate-900 space-y-1.5 font-mono text-[10px]">
              <div class="text-slate-400 font-bold uppercase text-[9px] flex items-center justify-between">
                <span>1:1 Rack PDU Receptacle Mapping</span>
                <span class="text-amber-300">${swPduOutlets.length}x Power Cord${swPduOutlets.length > 1 ? 's' : ''}</span>
              </div>
              ${swPduOutlets.map(rec => `
                <div class="p-1.5 rounded-lg bg-slate-900/90 border border-amber-500/30 space-y-0.5">
                  <div class="flex items-center justify-between">
                    <span class="text-amber-300 font-bold">${escapeHTML(rec.psuTag)} &rarr; ${escapeHTML(rec.receptacleId)}</span>
                    <span class="text-slate-300">${escapeHTML(rec.cordSku || 'P006-006')} (${rec.cordLengthFt || 6}ft)</span>
                  </div>
                  <div class="text-[9px] text-slate-400 flex items-center justify-between">
                    <span>Cord ID: <strong class="text-white">${escapeHTML(rec.cordId)}</strong></span>
                    <span>${rec.watts}W &bull; ${escapeHTML(rec.receptacleType || '5-15R')}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      </div>

      <!-- Physical Port Matrix (Faceplate Status Grid) -->
      ${switchPorts.length > 0 ? `
        <div class="space-y-2 pb-3 border-b border-slate-800">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
              <i data-lucide="layout-grid" class="w-3.5 h-3.5"></i> Physical Port Matrix
            </span>
            <div class="flex items-center gap-2">
              <span class="font-mono text-[9px] text-slate-400">
                ${portSummary ? `${portSummary.used}/${portSummary.total} Used` : ''}
              </span>
              <button 
                type="button" 
                onclick="openPortMatrixStudio('${item.instanceId}')"
                class="px-1.5 py-0.5 bg-sky-950/60 hover:bg-sky-900/80 text-sky-300 border border-sky-700/60 rounded text-[9px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-colors"
                title="Open Dedicated Widescreen Port Studio"
              >
                <i data-lucide="maximize-2" class="w-2.5 h-2.5"></i> Studio
              </button>
            </div>
          </div>

          <div class="p-2.5 bg-slate-950 rounded-xl border border-slate-850 space-y-2.5">
            ${isAllOptical ? `
              <!-- High-Density All-Optical Spine Matrix -->
              <div class="space-y-2">
                ${Array.from({ length: stackUnits }, (_, uIdx) => {
                  const u = uIdx + 1;
                  const unitCages = opticalCages.filter(p => (p.unitIndex || 1) === u);
                  return `
                    <div class="space-y-1.5 ${u > 1 ? 'pt-2 border-t border-slate-900' : ''}">
                      <div class="flex items-center justify-between text-[9px] font-mono text-cyan-400 uppercase font-semibold">
                        <span>${isStacked ? `Unit ${u} Optical Cages:` : 'QSFP/SFP Optical Transceiver Cages:'}</span>
                        <span class="text-slate-400">${unitCages.length}x ${unitCages[0]?.speed || '100G'}</span>
                      </div>
                      <div class="grid ${unitCages.length > 16 ? 'grid-cols-8' : (unitCages.length > 8 ? 'grid-cols-6' : 'grid-cols-4')} gap-1">
                        ${unitCages.map(p => {
                          const isConnected = !!p.connectedDeviceId;
                          let bg = "bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700";
                          if (isConnected) bg = "bg-cyan-500/20 border-cyan-500 text-cyan-300";
                          return `
                            <div 
                              class="h-7 rounded border ${bg} flex flex-col items-center justify-center font-mono text-[8px] font-bold cursor-pointer transition-all hover:scale-105"
                              title="${escapeHTML(p.label)}: ${escapeHTML(p.connectedDeviceModel || 'Free / Unpopulated Cage')} (${escapeHTML(p.speed)})"
                              onclick="inspectSwitchPort('${item.instanceId}', ${p.portNumber})"
                            >
                              <span>${p.shortLabel || `Q${p.portNumber}`}</span>
                              <span class="text-[7px] font-normal opacity-70">${p.speed}</span>
                            </div>
                          `;
                        }).join('')}
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            ` : `
              <!-- Copper Access Ports Grid (per stack unit) -->
              <div class="space-y-2.5">
                ${Array.from({ length: stackUnits }, (_, uIdx) => {
                  const u = uIdx + 1;
                  const unitCopper = copperPorts.filter(p => (p.unitIndex || 1) === u);
                  const unitOptical = opticalCages.filter(p => (p.unitIndex || 1) === u);
                  return `
                    <div class="space-y-1.5 ${u > 1 ? 'pt-2.5 border-t border-slate-900' : ''}">
                      <div class="flex items-center justify-between text-[10px] font-mono font-bold ${u === 1 ? 'text-sky-400' : 'text-indigo-400'}">
                        <span class="flex items-center gap-1">
                          <i data-lucide="layers" class="w-3 h-3"></i>
                          ${isStacked ? `Unit ${u} (${u === 1 ? 'Master Chassis' : 'Member Chassis'} &bull; ${unitCopper.length} Ports)` : 'Access Ports Faceplate'}
                        </span>
                        <span class="text-slate-500 font-normal text-[9px]">${isStacked ? `Member ${u} Ports` : `${unitCopper.length}P`}</span>
                      </div>

                      <div class="grid grid-cols-12 gap-1">
                        ${unitCopper.map(p => {
                          const isPoEActive = (p.poeOutputWatts || 0) > 0;
                          const isUplink = p.isUplink || p.role === "uplink";
                          const isDataOnly = p.connectedDeviceId && !isPoEActive;
                          let bg = "bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700";
                          if (isUplink) bg = "bg-sky-500/20 border-sky-500/50 text-sky-300";
                          else if (isPoEActive) bg = "bg-emerald-500/20 border-emerald-500/50 text-emerald-300";
                          else if (isDataOnly) bg = "bg-amber-500/20 border-amber-500/50 text-amber-300";

                          return `
                            <div 
                              class="h-6 rounded border ${bg} flex items-center justify-center font-mono text-[9px] font-bold cursor-pointer transition-all hover:scale-105" 
                              title="${escapeHTML(p.label)}: ${escapeHTML(p.connectedDeviceModel || 'Free')} ${isPoEActive ? `(${p.poeOutputWatts}W)` : ''}"
                              onclick="inspectSwitchPort('${item.instanceId}', ${p.portNumber})"
                            >
                              ${p.unitPortNumber || p.portNumber}
                            </div>
                          `;
                        }).join('')}
                      </div>

                      ${unitOptical.length > 0 ? `
                        <div class="pt-1.5 border-t border-slate-900 space-y-1">
                          <div class="flex items-center justify-between text-[9px] font-mono text-slate-400 uppercase">
                            <span>${isStacked ? `Unit ${u} Uplink Cages:` : 'Optical SFP/QSFP Cages:'}</span>
                            <span class="text-sky-400 font-bold">${unitOptical.length} Cages</span>
                          </div>
                          <div class="grid grid-cols-4 gap-1.5">
                            ${unitOptical.map((p, idx) => {
                              const isConnected = !!p.connectedDeviceId;
                              const bg = isConnected ? "bg-sky-500/20 border-sky-500 text-sky-300" : "bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700";
                              return `
                                <div 
                                  class="px-1.5 py-1 rounded border ${bg} font-mono text-[9px] font-bold cursor-pointer flex items-center justify-between transition-all hover:border-slate-600"
                                  title="${escapeHTML(p.label)}: ${escapeHTML(p.connectedDeviceModel || 'Free')} (${escapeHTML(p.speed)})"
                                  onclick="inspectSwitchPort('${item.instanceId}', ${p.portNumber})"
                                >
                                  <span>${p.shortLabel || `U${idx + 1}`}</span>
                                  <span class="text-[8px] text-sky-400 font-normal">${p.speed}</span>
                                </div>
                              `;
                            }).join('')}
                          </div>
                        </div>
                      ` : ''}
                    </div>
                  `;
                }).join('')}
              </div>
            `}

            <!-- Legend strip -->
            <div class="flex flex-wrap items-center justify-between gap-1.5 text-[9px] font-mono text-slate-400 pt-2 border-t border-slate-900">
              <span class="flex items-center gap-1"><span class="w-2 h-2 rounded bg-emerald-500 inline-block"></span> PoE Active</span>
              <span class="flex items-center gap-1"><span class="w-2 h-2 rounded bg-sky-500 inline-block"></span> Uplink/LAG</span>
              <span class="flex items-center gap-1"><span class="w-2 h-2 rounded bg-amber-500 inline-block"></span> Data Only</span>
              <span class="flex items-center gap-1"><span class="w-2 h-2 rounded bg-slate-800 inline-block"></span> Free</span>
            </div>

            <!-- Active Backbone Uplinks & Interconnects (Requirement 3) -->
            ${opticalCages.some(p => p.connectedDeviceId) ? `
              <div class="pt-2 border-t border-slate-900 space-y-1.5">
                <div class="flex items-center justify-between text-[10px] font-mono font-bold text-sky-400 uppercase">
                  <span class="flex items-center gap-1"><i data-lucide="git-commit" class="w-3 h-3"></i> Uplinks in Use & Trunks</span>
                  <span class="text-slate-500 font-normal">${opticalCages.filter(p => p.connectedDeviceId).length} Connected</span>
                </div>
                <div class="space-y-1">
                  ${opticalCages.filter(p => p.connectedDeviceId).map(p => {
                    const targetDev = projectBOM.find(i => i.instanceId === p.connectedDeviceId);
                    const targetModel = targetDev ? targetDev.model : (p.connectedDeviceModel || 'Connected Switch');
                    const targetLoc = targetDev ? (targetDev.closetName || targetDev.rackId || 'Space') : (p.connectedLocation || 'Rack');
                    return `
                      <div class="p-1.5 rounded-lg bg-slate-900 border border-sky-500/40 flex items-center justify-between text-xs">
                        <div class="flex items-center gap-2 min-w-0">
                          <span class="px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 font-mono font-bold text-[9px] border border-sky-800 shrink-0">${p.shortLabel || `Port ${p.portNumber}`}</span>
                          <div class="min-w-0">
                            <span class="font-bold text-white block truncate text-[11px]">${escapeHTML(targetModel)}</span>
                            <span class="text-[9px] text-slate-400 font-mono block truncate">${escapeHTML(targetLoc)} &bull; ${p.speed} Trunk</span>
                          </div>
                        </div>
                        <div class="flex items-center gap-1 shrink-0">
                          <button onclick="selectTopologyNode('${p.connectedDeviceId}'); panNodeIntoView('${p.connectedDeviceId}')" class="px-2 py-0.5 bg-sky-600/30 hover:bg-sky-600 text-sky-200 hover:text-white rounded border border-sky-500/40 text-[10px] font-bold transition-all flex items-center gap-1 shadow-sm" title="Jump to ${escapeHTML(targetModel)} in Topology">
                            <span>Link</span> &rarr;
                          </button>
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            ` : `
              <div class="pt-2 border-t border-slate-900 text-[10px] font-mono text-slate-500 flex items-center justify-between">
                <span>Backbone Optical Uplinks:</span>
                <span class="text-slate-400">Auto-Homed / Standby</span>
              </div>
            `}
          </div>
        </div>
      ` : ''}

      <!-- Uplink & Interconnect Settings -->
      ${item.role !== "Core" && item.role !== "Core & Agg" && item.role !== "Aggregation" && item.role !== "Gateways & WAN" && item.role !== "Security WAN" && item.role !== "Firewall" ? `
        <div class="space-y-2 pb-3 border-b border-slate-800">
          <span class="text-[10px] font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
            <i data-lucide="git-commit" class="w-3.5 h-3.5"></i> Uplink Configuration
          </span>
          <div class="space-y-2 bg-slate-950 p-2.5 rounded-xl border border-slate-850 text-xs">
            <div>
              <label class="text-[10px] text-slate-400 block mb-1">Target Core / Aggregation Switch:</label>
              <select onchange="updateCustomUplink('${item.instanceId}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-brand-500">
                <option value="" class="bg-slate-900 text-white">Auto-Assign (Nearest Core)</option>
                ${candidateTargets.map(t => `
                  <option value="${t.instanceId}" class="bg-slate-900 text-white" ${item.customUplinkTargetId === t.instanceId ? 'selected' : ''}>${t.model} (${FacilityStore.normalize(t.closetName)})</option>
                `).join('')}
              </select>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="text-[10px] text-slate-400 block mb-1">Trunk LAG:</label>
                <select onchange="updateCustomLinkMultiplier('${item.instanceId}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-sky-300 font-mono font-bold rounded-lg px-2 py-1 text-xs">
                  <option value="1" class="bg-slate-900 text-white" ${(item.customLinkMultiplier || 1) == 1 ? 'selected' : ''}>1x Link</option>
                  <option value="2" class="bg-slate-900 text-white" ${item.customLinkMultiplier == 2 ? 'selected' : ''}>2x LACP LAG</option>
                  <option value="4" class="bg-slate-900 text-white" ${item.customLinkMultiplier == 4 ? 'selected' : ''}>4x LACP LAG</option>
                </select>
              </div>

              <div>
                <label class="text-[10px] text-slate-400 block mb-1">Speed Override:</label>
                <select onchange="updateCustomLinkSpeed('${item.instanceId}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-amber-300 font-mono font-bold rounded-lg px-2 py-1 text-xs">
                  <option value="" class="bg-slate-900 text-white">Auto-Detect</option>
                  <option value="100G" class="bg-slate-900 text-white" ${item.customLinkSpeed === '100G' ? 'selected' : ''}>100G</option>
                  <option value="40G" class="bg-slate-900 text-white" ${item.customLinkSpeed === '40G' ? 'selected' : ''}>40G</option>
                  <option value="25G" class="bg-slate-900 text-white" ${item.customLinkSpeed === '25G' ? 'selected' : ''}>25G</option>
                  <option value="10G" class="bg-slate-900 text-white" ${item.customLinkSpeed === '10G' ? 'selected' : ''}>10G</option>
                  <option value="1G" class="bg-slate-900 text-white" ${item.customLinkSpeed === '1G' ? 'selected' : ''}>1G</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- Logical Services Routing (VMS & Access) -->
      ${candidateServers.length > 0 ? `
        <div class="space-y-2 pb-3 border-b border-slate-800">
          <span class="text-[10px] font-bold uppercase tracking-wider text-brand-400 flex items-center gap-1.5">
            <i data-lucide="route" class="w-3.5 h-3.5"></i> Logical Services Routing
          </span>
          <div class="space-y-2 bg-slate-950 p-2.5 rounded-xl border border-slate-850 text-xs">
            <div>
              <label class="text-[10px] text-slate-400 block mb-1">Assigned VMS Recording Server:</label>
              <select onchange="updateSwitchVmsServer('${item.instanceId}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-teal-300 font-mono text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-500">
                <option value="" class="bg-slate-900 text-white">Auto-Detect Primary VMS</option>
                ${candidateServers.map(s => `
                  <option value="${s.instanceId}" class="bg-slate-900 text-white" ${item.assignedVmsServerId === s.instanceId ? 'selected' : ''}>${s.model} (${FacilityStore.normalize(s.closetName)})</option>
                `).join('')}
              </select>
            </div>

            <div>
              <label class="text-[10px] text-slate-400 block mb-1">Assigned Access Control Engine:</label>
              <select onchange="updateSwitchAccessServer('${item.instanceId}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-emerald-300 font-mono text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-500">
                <option value="" class="bg-slate-900 text-white">Auto-Detect Primary Host</option>
                ${candidateServers.map(s => `
                  <option value="${s.instanceId}" class="bg-slate-900 text-white" ${item.assignedAccessServerId === s.instanceId ? 'selected' : ''}>${s.model} (${FacilityStore.normalize(s.closetName)})</option>
                `).join('')}
              </select>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- Connected Downstream Devices List -->
      <div class="space-y-2">
        <span class="text-[10px] font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
          <span>Downlink Clients (${children.length})</span>
          <span class="text-[9px] font-mono text-slate-500">Click to Inspect</span>
        </span>
        <div class="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          ${children.length === 0 ? `
            <div class="text-[11px] text-slate-500 py-3 text-center bg-slate-950 rounded-xl border border-slate-850">
              No field devices attached to this switch in quote.
            </div>
          ` : children.map(ch => {
            const chPowerBadge = (typeof PortEngine !== "undefined") ? PortEngine.getPowerBadge(ch) : { label: "PoE", badgeLabel: "PoE", isExternal: false };
            const chPortNum = ch.assignedSwitchPort || (switchPorts.find(p => p.connectedDeviceId === ch.instanceId)?.portNumber) || null;
            const chPatch = (swPatchMap && swPatchMap.byPortNumber && chPortNum) ? swPatchMap.byPortNumber[chPortNum] : null;
            const chPathLabel = chPatch
              ? `${chPatch.horizontalCableId} &bull; ${chPatch.panelTag}-${String(chPatch.jackNumber).padStart(2, '0')} &rarr; ${chPatch.switchPortTag}`
              : `Port ${chPortNum || 'Auto'}`;
            return `
              <div 
                onclick="selectTopologyNode('${ch.instanceId}', event)"
                class="bg-slate-950 p-2 rounded-lg border border-slate-850 hover:border-slate-700 cursor-pointer flex items-center justify-between text-xs transition-colors"
              >
                <div class="truncate max-w-[195px]">
                  <span class="text-white block font-medium truncate">${escapeHTML(ch.friendlyName || ch.model)}</span>
                  <span class="text-[10px] text-slate-400 font-mono truncate block"><span class="text-sky-300 font-bold">${chPathLabel}</span> &bull; ${ch.role || 'Edge Device'}</span>
                </div>
                <div class="text-right shrink-0">
                  <span class="font-mono text-[10px] ${chPowerBadge.isExternal ? 'text-amber-400' : 'text-emerald-400'} font-bold block">
                    ${chPowerBadge.badgeLabel}
                  </span>
                  <span class="font-mono text-[9px] text-slate-500">
                    ${Math.round((ch.powerConsumptionWatts || ch.maxPowerWatts || 15) * (ch.qty || 1))}W
                  </span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  } else if (selectedTopologyLinkId) {
    const link = topologyLinks.find(l => l.id === selectedTopologyLinkId);
    if (!link) {
      deselectTopologyNode();
      return;
    }

    const fromNode = projectBOM.find(i => i.instanceId === link.fromId);
    const toNode = projectBOM.find(i => i.instanceId === link.toId);

    if (selectedNodeEl) selectedNodeEl.innerText = link.speedLabel;
    if (linkSpeedEl) linkSpeedEl.innerText = link.speedLabel;
    if (powerSourceEl) powerSourceEl.innerText = link.isPoEDelivery ? "PoE Delivery" : "Data / Signal Only";

    if (link.category === "vms_stream") {
      container.innerHTML = `
        <div class="space-y-3">
          <div class="pb-2 border-b border-slate-800">
            <span class="text-xs font-bold text-white block">${link.speedLabel}</span>
            <span class="text-[10px] font-mono text-teal-400">Logical Video Stream Ingest Pipe</span>
          </div>

          <div class="space-y-2 text-xs bg-slate-950 p-3 rounded-xl border border-slate-850 font-mono">
            <div class="flex justify-between">
              <span class="text-slate-400">Edge Switch:</span>
              <span class="text-white font-bold truncate max-w-[150px]">${escapeHTML(fromNode ? fromNode.model : 'Switch')}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Recording Server:</span>
              <span class="text-teal-300 font-bold truncate max-w-[150px]">${escapeHTML(toNode ? toNode.model : 'VMS Server')}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Continuous Ingress:</span>
              <span class="text-teal-400 font-bold">${link.speedLabel}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Compression:</span>
              <span class="text-slate-300">H.265 / SmartCodec</span>
            </div>
          </div>
        </div>
      `;
    } else if (link.category === "access_link") {
      container.innerHTML = `
        <div class="space-y-3">
          <div class="pb-2 border-b border-slate-800">
            <span class="text-xs font-bold text-white block">${link.speedLabel}</span>
            <span class="text-[10px] font-mono text-indigo-400">Access Control Communication Pipe</span>
          </div>

          <div class="space-y-2 text-xs bg-slate-950 p-3 rounded-xl border border-slate-850 font-mono">
            <div class="flex justify-between">
              <span class="text-slate-400">Edge Switch:</span>
              <span class="text-white font-bold truncate max-w-[150px]">${escapeHTML(fromNode ? fromNode.model : 'Switch')}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Access Engine Host:</span>
              <span class="text-indigo-300 font-bold truncate max-w-[150px]">${escapeHTML(toNode ? toNode.model : 'Access Server')}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Managed Capacity:</span>
              <span class="text-emerald-400 font-bold">${link.speedLabel}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Encryption:</span>
              <span class="text-slate-300">TLS 1.3 / OSDP v2</span>
            </div>
          </div>
        </div>
      `;
    } else if (link.category === "field_drop" || link.isFieldDrop) {
      const pInfo = link.orionPatchInfo || null;
      container.innerHTML = `
        <div class="space-y-3">
          <div class="pb-2 border-b border-slate-800 flex items-center justify-between">
            <div>
              <span class="text-xs font-bold text-white block">${escapeHTML(link.speedLabel)}</span>
              <span class="text-[10px] font-mono text-cyan-400">Orion Structured Cabling & Patch Panel Drop</span>
            </div>
            ${fromNode ? `
              <button 
                type="button" 
                onclick="if (typeof openPortMatrixStudio === 'function') openPortMatrixStudio('${fromNode.instanceId}');"
                class="px-2 py-0.5 bg-sky-950/80 hover:bg-sky-900 text-sky-300 border border-sky-600/60 rounded text-[9px] font-mono font-bold cursor-pointer"
                title="Open Port & Patch Panel Matrix Studio"
              >
                Port Matrix
              </button>
            ` : ''}
          </div>

          <div class="space-y-2 text-xs bg-slate-950 p-3 rounded-xl border border-slate-850 font-mono">
            <div class="flex justify-between">
              <span class="text-slate-400">Serving Switch:</span>
              <span class="text-white font-bold truncate max-w-[165px]">${escapeHTML(fromNode ? (fromNode.friendlyName || fromNode.model) : 'Switch')}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Field Endpoint:</span>
              <span class="text-cyan-300 font-bold truncate max-w-[165px]">${escapeHTML(toNode ? (toNode.friendlyName || toNode.model) : 'Endpoint')}</span>
            </div>
            ${pInfo ? `
              <div class="pt-1.5 mt-1 border-t border-slate-900 space-y-1">
                <div class="flex justify-between">
                  <span class="text-slate-400">Horizontal Cable ID:</span>
                  <span class="text-sky-300 font-bold">${escapeHTML(pInfo.horizontalCableId)}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-400">Patch Panel Jack:</span>
                  <span class="text-cyan-300 font-bold">${escapeHTML(pInfo.keystoneJackLabel)}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-400">Patch Cord:</span>
                  <span class="text-indigo-300 font-bold">${escapeHTML(pInfo.patchCordId)} (${escapeHTML(pInfo.patchCordSpec?.label || '3 ft Cat6')})</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-400">Switch Port Tag:</span>
                  <span class="text-emerald-300 font-bold">${escapeHTML(pInfo.closetCode)}-${escapeHTML(pInfo.switchPortTag)}</span>
                </div>
                <div class="mt-1.5 p-2 rounded-lg bg-slate-900 border border-slate-800 text-[9px] space-y-0.5">
                  <div class="text-[8px] uppercase text-slate-500 font-bold">2-Line Brady Cable Label</div>
                  <div class="text-amber-300 font-bold">${escapeHTML(pInfo.headendLabelLine1)}</div>
                  <div class="text-cyan-300">${escapeHTML(pInfo.headendLabelLine2)}</div>
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    } else {
      const fromLoc = (typeof FacilityStore !== "undefined") ? FacilityStore.normalize(fromNode?.closetName || fromNode?.rackId || "MDF") : (fromNode?.closetName || "MDF");
      const toLoc = (typeof FacilityStore !== "undefined") ? FacilityStore.normalize(toNode?.closetName || toNode?.rackId || "MDF") : (toNode?.closetName || "MDF");
      const isSameRack = (fromLoc === toLoc) && !fromLoc.endsWith("• Field") && (typeof FacilityStore === "undefined" || fromLoc !== FacilityStore.UNASSIGNED);
      const uDiff = calculateUDistance(fromNode, toNode);
      const calcDacLen = getDacLengthForUDiff(uDiff);
      const calcPatchCord = getPatchCordLengthForUDiff(uDiff);
      const projectFiber = getProjectFiberType();
      const override = getLinkInterconnectOverride(link.id);

      const activeMedium = (override.medium && override.medium !== "auto") ? override.medium : (isSameRack ? "dac" : projectFiber);

      container.innerHTML = `
        <div class="space-y-3">
          <div class="pb-2 border-b border-slate-800 flex items-center justify-between">
            <div>
              <span class="text-xs font-bold text-white block">${link.speedLabel}</span>
              <span class="text-[10px] font-mono text-slate-400">Logical Transport Interconnect</span>
            </div>
            <span class="px-2 py-0.5 rounded text-[9px] font-mono font-bold border ${activeMedium === 'dac' ? 'bg-amber-950/80 text-amber-300 border-amber-600/60' : ((activeMedium === 'patch' || activeMedium === 'cat6a') ? 'bg-sky-950/80 text-sky-300 border-sky-600/60' : (activeMedium === 'smf' ? 'bg-yellow-950/80 text-yellow-300 border-yellow-600/60' : 'bg-cyan-950/80 text-cyan-300 border-cyan-600/60'))}">
              ${activeMedium === 'dac' ? `DAC (${override.dacLength && override.dacLength !== 'auto' ? override.dacLength : calcDacLen})` : ((activeMedium === 'patch' || activeMedium === 'cat6a') ? `Patch (${override.patchLength && override.patchLength !== 'auto' ? override.patchLength + ' ft' : calcPatchCord.label})` : (activeMedium === 'smf' ? 'OS2 SMF' : 'OM4 MMF'))}
            </span>
          </div>

          <!-- Physical Placement & Endpoints -->
          <div class="space-y-2 text-xs bg-slate-950 p-3 rounded-xl border border-slate-850 font-mono">
            <div class="flex justify-between items-center">
              <span class="text-slate-400">Host A:</span>
              <span class="text-white font-bold truncate max-w-[170px]" title="${escapeHTML(fromNode ? fromNode.model : 'Core')}">${escapeHTML(fromNode ? fromNode.model : 'Core')}</span>
            </div>
            <div class="flex justify-between items-center text-[11px] text-slate-400">
              <span>Location A:</span>
              <span class="text-sky-300 truncate max-w-[170px]">${escapeHTML(fromLoc)} ${fromNode?.rackSlot ? `@ U${fromNode.rackSlot}` : ''}</span>
            </div>
            <div class="flex justify-between items-center mt-1 pt-1 border-t border-slate-900">
              <span class="text-slate-400">Host B:</span>
              <span class="text-indigo-300 font-bold truncate max-w-[170px]" title="${escapeHTML(toNode ? toNode.model : 'Access')}">${escapeHTML(toNode ? toNode.model : 'Access')}</span>
            </div>
            <div class="flex justify-between items-center text-[11px] text-slate-400">
              <span>Location B:</span>
              <span class="text-sky-300 truncate max-w-[170px]">${escapeHTML(toLoc)} ${toNode?.rackSlot ? `@ U${toNode.rackSlot}` : ''}</span>
            </div>
            <div class="flex justify-between items-center mt-1 pt-1 border-t border-slate-900">
              <span class="text-slate-400">Placement:</span>
              <span class="${isSameRack ? 'text-emerald-400 font-bold' : 'text-cyan-300'}">
                ${isSameRack ? `Same Rack (${uDiff}U Separation)` : 'Inter-Rack / Backbone'}
              </span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-slate-400">Port Speed & LAG:</span>
              <span class="text-cyan-400 font-bold">${link.rawSpeed} &bull; ${link.multiplier}x ${link.isLAG ? '(LACP)' : ''}</span>
            </div>
          </div>

          <!-- Interconnect Auto-Calculation & Overrides -->
          <div class="space-y-2.5 pt-2 border-t border-slate-800">
            <div class="flex items-center justify-between">
              <label class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Interconnect Medium</label>
              <span class="text-[9px] font-mono text-slate-500">${override.medium && override.medium !== 'auto' ? 'Overridden' : 'Auto-Calculated'}</span>
            </div>

            <div>
              <label class="text-[11px] text-slate-400 block mb-1">Medium Specification:</label>
              <select 
                onchange="updateLinkOverride('${link.id}', 'medium', this.value)"
                class="w-full bg-slate-950 border border-slate-700 text-white text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-brand-500 font-mono"
              >
                <option value="auto" class="bg-slate-900 text-white" ${(!override.medium || override.medium === 'auto') ? 'selected' : ''}>Auto-Calculate (${isSameRack ? 'Same Rack: DAC' : `Inter-Rack: ${projectFiber.toUpperCase()} SFP`})</option>
                <option value="dac" class="bg-slate-900 text-white" ${override.medium === 'dac' ? 'selected' : ''}>Direct Attach Copper (DAC)</option>
                <option value="patch" class="bg-slate-900 text-white" ${(override.medium === 'patch' || override.medium === 'cat6a') ? 'selected' : ''}>RJ45 Copper Patch Cord (Cat6A)</option>
                <option value="mmf" class="bg-slate-900 text-white" ${override.medium === 'mmf' ? 'selected' : ''}>Multi-Mode Fiber (MMF / OM4 SR Optics)</option>
                <option value="smf" class="bg-slate-900 text-white" ${override.medium === 'smf' ? 'selected' : ''}>Single-Mode Fiber (SMF / OS2 LR Optics)</option>
              </select>
            </div>

            ${activeMedium === 'dac' ? `
              <div>
                <div class="flex justify-between items-center mb-1">
                  <label class="text-[11px] text-slate-400">DAC Cable Length:</label>
                  <span class="text-[10px] font-mono text-amber-400">Span: ${uDiff}U</span>
                </div>
                <select 
                  onchange="updateLinkOverride('${link.id}', 'dacLength', this.value)"
                  class="w-full bg-slate-950 border border-slate-700 text-amber-200 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-brand-500 font-mono"
                >
                  <option value="auto" class="bg-slate-900 text-white" ${(!override.dacLength || override.dacLength === 'auto') ? 'selected' : ''}>Auto (${calcDacLen} based on ${uDiff}U separation)</option>
                  <option value="0.5m" class="bg-slate-900 text-white" ${override.dacLength === '0.5m' ? 'selected' : ''}>0.5m (~1.6 ft &bull; Adjacent / 1-2U)</option>
                  <option value="1m" class="bg-slate-900 text-white" ${override.dacLength === '1m' ? 'selected' : ''}>1.0m (~3.3 ft &bull; 3-6U)</option>
                  <option value="2m" class="bg-slate-900 text-white" ${override.dacLength === '2m' ? 'selected' : ''}>2.0m (~6.6 ft &bull; 7-15U)</option>
                  <option value="3m" class="bg-slate-900 text-white" ${override.dacLength === '3m' ? 'selected' : ''}>3.0m (~10 ft &bull; 16-28U)</option>
                  <option value="5m" class="bg-slate-900 text-white" ${override.dacLength === '5m' ? 'selected' : ''}>5.0m (~16.4 ft &bull; 28U+ Top-to-Bottom)</option>
                </select>
              </div>
            ` : ((activeMedium === 'patch' || activeMedium === 'cat6a') ? `
              <div>
                <div class="flex justify-between items-center mb-1">
                  <label class="text-[11px] text-slate-400">RJ45 Patch Cord Length:</label>
                  <span class="text-[10px] font-mono text-sky-400">Span: ${uDiff}U</span>
                </div>
                <select 
                  onchange="updateLinkOverride('${link.id}', 'patchLength', this.value)"
                  class="w-full bg-slate-950 border border-slate-700 text-sky-200 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-brand-500 font-mono"
                >
                  <option value="auto" class="bg-slate-900 text-white" ${(!override.patchLength || override.patchLength === 'auto') ? 'selected' : ''}>Auto (${calcPatchCord.label} based on ${uDiff}U separation)</option>
                  <option value="0.5" class="bg-slate-900 text-white" ${override.patchLength === '0.5' ? 'selected' : ''}>0.5 ft (6-Inch &bull; Adjacent / 0-1U)</option>
                  <option value="1" class="bg-slate-900 text-white" ${override.patchLength === '1' ? 'selected' : ''}>1.0 ft (~0.3m &bull; 2-4U)</option>
                  <option value="3" class="bg-slate-900 text-white" ${override.patchLength === '3' ? 'selected' : ''}>3.0 ft (~1.0m &bull; 5-7U)</option>
                  <option value="5" class="bg-slate-900 text-white" ${override.patchLength === '5' ? 'selected' : ''}>5.0 ft (~1.5m &bull; 8-14U)</option>
                  <option value="7" class="bg-slate-900 text-white" ${override.patchLength === '7' ? 'selected' : ''}>7.0 ft (~2.1m &bull; 15-22U)</option>
                  <option value="10" class="bg-slate-900 text-white" ${override.patchLength === '10' ? 'selected' : ''}>10.0 ft (~3.0m &bull; 23-32U)</option>
                  <option value="15" class="bg-slate-900 text-white" ${override.patchLength === '15' ? 'selected' : ''}>15.0 ft (~4.6m &bull; 33U+ Top-to-Bottom)</option>
                </select>
              </div>
            ` : `
              <div>
                <label class="text-[11px] text-slate-400 block mb-1">Optical Transceiver & Fiber Type:</label>
                <select 
                  onchange="updateLinkOverride('${link.id}', 'fiberType', this.value)"
                  class="w-full bg-slate-950 border border-slate-700 text-cyan-200 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-brand-500 font-mono"
                >
                  <option value="auto" class="bg-slate-900 text-white" ${(!override.fiberType || override.fiberType === 'auto') ? 'selected' : ''}>Project Default (${projectFiber.toUpperCase()} / ${projectFiber === 'smf' ? 'OS2 Single-Mode' : 'OM4 Multi-Mode'})</option>
                  <option value="mmf" class="bg-slate-900 text-white" ${override.fiberType === 'mmf' ? 'selected' : ''}>Multi-Mode (OM4 Duplex LC &bull; SR Optics 850nm)</option>
                  <option value="smf" class="bg-slate-900 text-white" ${override.fiberType === 'smf' ? 'selected' : ''}>Single-Mode (OS2 Duplex LC &bull; LR Optics 1310nm)</option>
                </select>
              </div>
            `)}

            <button 
              type="button" 
              onclick="autoSynthesizeInterconnects()"
              class="w-full mt-2 py-2 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-500/40 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow"
            >
              <i data-lucide="cpu" class="w-3.5 h-3.5 text-emerald-400"></i>
              <span>Re-Synthesize Interconnects to BOM</span>
            </button>
          </div>
        </div>
      `;
    }
  } else {
    // Project-wide Topology Summary when nothing is selected
    if (selectedNodeEl) selectedNodeEl.innerText = "Project Overview";
    if (linkSpeedEl) linkSpeedEl.innerText = "Unified";
    if (powerSourceEl) powerSourceEl.innerText = "All Sources";

    const totalSwitches = projectBOM.filter(i => !i.parentInstanceId && (i.role === "Access" || i.role === "Core" || i.role === "Aggregation")).length;
    const totalGateways = projectBOM.filter(i => !i.parentInstanceId && (i.role === "Gateways & WAN" || i.role === "Security WAN")).length;
    const totalEdge = projectBOM.filter(i => i.uplinkTargetId && !i.parentInstanceId).length;
    const currentFiber = getProjectFiberType();

    container.innerHTML = `
      <div class="space-y-4">
        <div class="text-slate-400 text-xs">
          Select any rack, switch, server, field drop, or interconnect link on the canvas to configure uplinks, inspect Orion patch panel & cable labels, or verify 1:1 rack PDU receptacle assignments.
        </div>

        <div class="grid grid-cols-2 gap-2">
          <button
            type="button"
            onclick="if (typeof openPortMatrixStudio === 'function') openPortMatrixStudio();"
            class="px-2.5 py-2 bg-sky-950/60 hover:bg-sky-900/80 border border-sky-500/50 text-sky-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <i data-lucide="grid" class="w-3.5 h-3.5 text-sky-400"></i>
            <span>Port Matrix</span>
          </button>
          <button
            type="button"
            onclick="if (typeof openRackPowerMatrixModal === 'function') openRackPowerMatrixModal();"
            class="px-2.5 py-2 bg-amber-950/60 hover:bg-amber-900/80 border border-amber-500/50 text-amber-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <i data-lucide="zap" class="w-3.5 h-3.5 text-amber-400"></i>
            <span>Power Matrix</span>
          </button>
        </div>

        <div class="space-y-2 pt-2 border-t border-slate-800">
          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Project Systems Telemetry</span>
          <div class="space-y-2 text-xs bg-slate-950 p-3 rounded-xl border border-slate-850 font-mono">
            <div class="flex justify-between">
              <span class="text-slate-400">Security Gateways:</span>
              <span class="text-white font-bold">${totalGateways} Units</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Distribution Switches:</span>
              <span class="text-white font-bold">${totalSwitches} Units</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Connected Edge Devices:</span>
              <span class="text-sky-400 font-bold">${totalEdge} Devices</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Active Interconnects:</span>
              <span class="text-emerald-400 font-bold">${topologyLinks.length} Trunks</span>
            </div>
          </div>
        </div>

        <div class="space-y-2 pt-2 border-t border-slate-800">
          <span class="text-[10px] font-bold uppercase tracking-wider text-cyan-400 block">Default Inter-Rack Backbone Standard</span>
          <div class="bg-slate-950 p-3 rounded-xl border border-slate-850 space-y-1.5">
            <label class="text-[10px] text-slate-400 block">Backbone Fiber & SFP Default:</label>
            <select
              onchange="setProjectFiberType(this.value)"
              class="w-full bg-slate-900 border border-slate-700 text-cyan-300 font-mono text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-brand-500 cursor-pointer"
            >
              <option value="mmf" class="bg-slate-900 text-white" ${currentFiber === 'mmf' ? 'selected' : ''}>OM4 Multi-Mode Fiber (850nm SR Optics)</option>
              <option value="smf" class="bg-slate-900 text-white" ${currentFiber === 'smf' ? 'selected' : ''}>OS2 Single-Mode Fiber (1310nm LR Optics)</option>
            </select>
            <p class="text-[10px] text-slate-500 leading-relaxed">
              Same-rack switch links default to short DAC copper; inter-rack links default to this fiber standard unless overridden per link.
            </p>
          </div>
        </div>
      </div>
    `;
  }

  if (typeof safeCreateIcons === "function") {
    safeCreateIcons(container);
  } else if (window.lucide) {
    lucide.createIcons();
  }
}

function getPowerSourceLabel(item) {
  if (typeof PortEngine !== "undefined") {
    const badge = PortEngine.getPowerBadge(item);
    if (badge && badge.label) {
      if (item.dualPsu && badge.mode === "dedicated_ac") return "Dual Hot-Swap AC";
      return badge.label;
    }
  }
  if (item.dualPsu) return "Dual Hot-Swap AC";
  if (item.powerSourceOverride) return item.powerSourceOverride;
  if (item.powerSource === "poe_switch" || item.poeStandardRequired) return "PoE-In Powered";
  if (item.isDinMounted || (item.model && item.model.includes("DIN"))) return "48-56VDC Terminal";
  return "Internal AC";
}

function getRoleBadgeStyle(role) {
  switch (role) {
    case "Core":
    case "Core & Agg":
    case "Aggregation":
      return "border-purple-500/40 bg-purple-500/10 text-purple-300";
    case "Access":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
    case "Gateways & WAN":
    case "Security WAN":
      return "border-rose-500/40 bg-rose-500/10 text-rose-300";
    case "Wireless Bridge":
      return "border-sky-500/40 bg-sky-500/10 text-sky-300";
    case "Server":
    case "Compute & Storage":
      return "border-amber-500/40 bg-amber-500/10 text-amber-300";
    default:
      return "border-slate-700 bg-slate-800 text-slate-300";
  }
}

// -----------------------------------------------------------
// Interactive Custom Link Controls
// -----------------------------------------------------------
function updateCustomUplink(nodeInstanceId, targetInstanceId) {
  const item = projectBOM.find(i => i.instanceId === nodeInstanceId);
  if (item) {
    TopologyHistory.pushState(`Change Uplink (${item.model})`);
    item.customUplinkTargetId = targetInstanceId || null;
    FacilityStore.notifyWorkspaceChange();
    renderTopology();
    renderTopologyInspector();
  }
}

function updateCustomLinkMultiplier(nodeInstanceId, multiplierVal) {
  const item = projectBOM.find(i => i.instanceId === nodeInstanceId);
  if (item) {
    TopologyHistory.pushState(`Change LAG Trunks (${item.model})`);
    item.customLinkMultiplier = parseInt(multiplierVal, 10) || 1;
    FacilityStore.notifyWorkspaceChange();
    renderTopology();
    renderTopologyInspector();
  }
}

function updateCustomLinkSpeed(nodeInstanceId, speedVal) {
  const item = projectBOM.find(i => i.instanceId === nodeInstanceId);
  if (item) {
    TopologyHistory.pushState(`Change Link Speed (${item.model})`);
    item.customLinkSpeed = speedVal || null;
    FacilityStore.notifyWorkspaceChange();
    renderTopology();
    renderTopologyInspector();
  }
}

// -----------------------------------------------------------
// Drag & Drop & Viewport Movement Engine
// -----------------------------------------------------------
function handleClusterMouseDown(e, clusterEl, loc) {
  if (!isTopologyModalVisible()) return;
  if (e.target.closest("button") || e.target.closest("select") || e.target.closest("input")) {
    return;
  }

  TopologyHistory.pushState(`Move Rack (${loc})`);
  isCanvasDragging = true;
  dragStartPos = { x: e.clientX, y: e.clientY };
  draggedTopologyNode = {
    el: clusterEl,
    loc: loc
  };

  const viewport = document.getElementById("topologyCanvasViewport");
  const rect = viewport.getBoundingClientRect();
  topoDragOffset.x = (e.clientX - rect.left + viewport.scrollLeft) - (clusterEl.offsetLeft * topologyZoomLevel);
  topoDragOffset.y = (e.clientY - rect.top + viewport.scrollTop) - (clusterEl.offsetTop * topologyZoomLevel);

  e.stopPropagation();
}

function handleTopologyMouseMove(e) {
  if (!isTopologyModalVisible()) return;

  const viewport = document.getElementById("topologyCanvasViewport");
  if (!viewport) return;

  // Mode 1: Viewport Canvas Panning
  if (isViewportPanning) {
    const dx = e.clientX - panStart.x;
    const dy = e.clientY - panStart.y;
    viewport.scrollLeft = panStart.scrollLeft - dx;
    viewport.scrollTop = panStart.scrollTop - dy;
    return;
  }

  // Mode 2: Dragging a location cluster
  if (isCanvasDragging && draggedTopologyNode) {
    const rect = viewport.getBoundingClientRect();
    const newX = Math.max(30, ((e.clientX - rect.left + viewport.scrollLeft) - topoDragOffset.x) / topologyZoomLevel);
    const newY = Math.max(30, ((e.clientY - rect.top + viewport.scrollTop) - topoDragOffset.y) / topologyZoomLevel);

    draggedTopologyNode.el.style.left = `${Math.round(newX)}px`;
    draggedTopologyNode.el.style.top = `${Math.round(newY)}px`;

    renderTopologyLinks();
  }
}

function handleTopologyMouseUp(e) {
  const viewport = document.getElementById("topologyCanvasViewport");
  if (isViewportPanning && viewport) {
    isViewportPanning = false;
    viewport.style.cursor = "grab";
  }

  if (isCanvasDragging && draggedTopologyNode) {
    isCanvasDragging = false;
    saveTopologyPosition(draggedTopologyNode.loc, draggedTopologyNode.el.offsetLeft, draggedTopologyNode.el.offsetTop);
    
    // If movement was minimal (< 5px), treat as a click to select the rack and pop no-op history state
    if (e && Math.hypot(e.clientX - dragStartPos.x, e.clientY - dragStartPos.y) < 5) {
      TopologyHistory.popSilent();
      selectTopologyRack(draggedTopologyNode.loc);
    }
    draggedTopologyNode = null;
  }
}

// -----------------------------------------------------------
// Position State & Auto-Arrange Hierarchy
// -----------------------------------------------------------
function autoArrangeTopologyHierarchy(layoutMode = null) {
  if (typeof projectBOM === "undefined") return;

  if (!layoutMode) {
    const modeSelect = document.getElementById("topologyLayoutMode");
    layoutMode = modeSelect ? modeSelect.value : "tree";
  }

  TopologyHistory.pushState(`Auto-Arrange Topology (${layoutMode})`);
  const positions = {};
  const activeNodes = projectBOM.filter(item => {
    if (!isTopologyActiveNode(item)) return false;
    const loc = FacilityStore.normalize(item.closetName || item.rackId);
    return loc !== FacilityStore.UNASSIGNED;
  });

  // Collect unique locations and categorize by primary role
  const locMap = {};
  activeNodes.forEach(item => {
    let loc;
    const isField = (typeof FacilityStore !== "undefined" && typeof FacilityStore.isFieldDevice === "function") 
      ? FacilityStore.isFieldDevice(item) 
      : (item.role === "Camera" || item.role === "Access Control" || item.role === "Intercom");

    if (topologyGroupingMode === "floor" && isField) {
      const floorName = (typeof FacilityStore !== "undefined" && typeof FacilityStore.getDevicePhysicalFloor === "function")
        ? FacilityStore.getDevicePhysicalFloor(item)
        : "Main Floor";
      loc = `${floorName} • Field Drops`;
    } else {
      loc = FacilityStore.normalize(item.closetName || item.rackId);
      const curLocLower = (loc || "").toLowerCase();
      if ((curLocLower === "field" || curLocLower.endsWith("• field") || curLocLower === "unassigned") && isField) {
        const floorName = (typeof FacilityStore !== "undefined" && typeof FacilityStore.getDevicePhysicalFloor === "function")
          ? FacilityStore.getDevicePhysicalFloor(item)
          : "Main Floor";
        loc = `${floorName} • Field Drops`;
      }
    }

    if (!locMap[loc]) locMap[loc] = [];
    locMap[loc].push(item);
  });

  const allLocs = Object.keys(locMap);
  if (allLocs.length === 0) return;

  if (layoutMode === "hub_spoke") {
    // Hub and Spoke Star Pattern
    const hubLoc = allLocs.find(loc => 
      locMap[loc].some(i => i.role === "Core" || i.role === "Core & Agg" || i.role === "Gateways & WAN")
    ) || allLocs[0];

    const spokes = allLocs.filter(l => l !== hubLoc);
    const centerX = 800;
    const centerY = 480;
    positions[hubLoc] = { x: centerX - 140, y: centerY - 80 };

    const spokeCount = spokes.length;
    const radiusX = Math.max(460, spokeCount * 80);
    const radiusY = Math.max(300, spokeCount * 55);

    spokes.forEach((loc, idx) => {
      const theta = (2 * Math.PI * idx) / (spokeCount || 1) - (Math.PI / 2);
      positions[loc] = {
        x: Math.round(centerX + radiusX * Math.cos(theta) - 140),
        y: Math.round(centerY + radiusY * Math.sin(theta) - 80)
      };
    });
  } else if (layoutMode === "ring") {
    // Resilient Circular / Perimeter Ring Loop
    const totalCount = allLocs.length;
    const centerX = 800;
    const centerY = 500;
    const radiusX = Math.max(500, totalCount * 95);
    const radiusY = Math.max(350, totalCount * 65);

    allLocs.forEach((loc, idx) => {
      const theta = (2 * Math.PI * idx) / totalCount - (Math.PI / 2);
      positions[loc] = {
        x: Math.round(centerX + radiusX * Math.cos(theta) - 140),
        y: Math.round(centerY + radiusY * Math.sin(theta) - 80)
      };
    });
  } else {
    // Default Tiered Tree Hierarchy
    const gateways = [];
    const coreAgg = [];
    const access = [];
    const others = [];

    Object.entries(locMap).forEach(([loc, items]) => {
      if (items.some(i => i.role === "Gateways & WAN" || i.role === "Security WAN")) {
        gateways.push(loc);
      } else if (items.some(i => i.role === "Core" || i.role === "Core & Agg" || i.role === "Aggregation" || i.role === "Server")) {
        coreAgg.push(loc);
      } else if (items.some(i => i.role === "Access")) {
        access.push(loc);
      } else {
        others.push(loc);
      }
    });

    // Layout Tier 1: Gateways (Top)
    gateways.forEach((loc, idx) => {
      positions[loc] = { x: 80 + (idx * 400), y: 80 };
    });

    // Layout Tier 2: Core & Distribution Aggregation (Middle)
    const coreY = gateways.length > 0 ? 320 : 80;
    coreAgg.forEach((loc, idx) => {
      positions[loc] = { x: 80 + (idx * 400), y: coreY };
    });

    // Layout Tier 3: Access Closets (Lower Tier)
    const accessY = coreY + (coreAgg.length > 0 ? 340 : 0);
    access.forEach((loc, idx) => {
      positions[loc] = { x: 80 + (idx * 400), y: accessY };
    });

    // Layout Tier 4: Field & Wireless (Bottom)
    const othersY = accessY + (access.length > 0 ? 360 : 0);
    others.forEach((loc, idx) => {
      positions[loc] = { x: 80 + (idx * 420), y: othersY };
    });
  }

  // Save to persistence
  try {
    const projKey = FacilityStore.getProjectId();
    localStorage.setItem(`netselect_topo_pos_${projKey}`, JSON.stringify(positions));
  } catch (e) {}

  renderTopology();
  renderTopologyInspector();
  if (typeof showToast === "function") {
    const label = layoutMode === "hub_spoke" ? "Hub & Spoke Star" : (layoutMode === "ring" ? "Resilient Ring Loop" : "Tiered Tree Hierarchy");
    showToast(`Arranged topology into clean ${label}.`);
  }
}

function saveTopologyPosition(loc, x, y) {
  try {
    const projKey = FacilityStore.getProjectId();
    const positions = loadTopologyPositions();
    positions[loc] = { x, y };
    localStorage.setItem(`netselect_topo_pos_${projKey}`, JSON.stringify(positions));
  } catch (e) {}
}

function loadTopologyPositions() {
  try {
    const projKey = FacilityStore.getProjectId();
    const raw = localStorage.getItem(`netselect_topo_pos_${projKey}`);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function autoDefaultTopology() {
  autoArrangeTopologyHierarchy();
}

function updateTopologyCounters(nodesCount, linksCount, poeFlowWatts = 0) {
  const nEl = document.getElementById("topologyNodesCount");
  const lEl = document.getElementById("topologyLinksCount");
  const pEl = document.getElementById("topologyTotalPoEFlow");
  if (nEl) nEl.innerText = `${nodesCount} Nodes`;
  if (lEl) lEl.innerText = `${linksCount} Trunks`;
  if (pEl) pEl.innerText = `${poeFlowWatts.toLocaleString()}W PoE Flow`;
}

// -----------------------------------------------------------
// Logical Services & Routing Helpers
// -----------------------------------------------------------
function updateSwitchVmsServer(switchInstanceId, serverInstanceId) {
  const item = projectBOM.find(i => i.instanceId === switchInstanceId);
  if (item) {
    TopologyHistory.pushState(`Assign VMS Server (${item.model})`);
    item.assignedVmsServerId = serverInstanceId || null;
    FacilityStore.notifyWorkspaceChange();
    renderTopology();
    renderTopologyInspector();
  }
}

function updateSwitchAccessServer(switchInstanceId, serverInstanceId) {
  const item = projectBOM.find(i => i.instanceId === switchInstanceId);
  if (item) {
    TopologyHistory.pushState(`Assign Access Server (${item.model})`);
    item.assignedAccessServerId = serverInstanceId || null;
    FacilityStore.notifyWorkspaceChange();
    renderTopology();
    renderTopologyInspector();
  }
}

function toggleServerRole(serverInstanceId, roleName) {
  const item = projectBOM.find(i => i.instanceId === serverInstanceId);
  if (item) {
    TopologyHistory.pushState(`Toggle Server Role (${item.model})`);
    if (!item.hostedRoles) item.hostedRoles = [];
    const idx = item.hostedRoles.indexOf(roleName);
    if (idx >= 0) {
      item.hostedRoles.splice(idx, 1);
    } else {
      item.hostedRoles.push(roleName);
    }
    FacilityStore.notifyWorkspaceChange();
    renderTopology();
    renderTopologyInspector();
  }
}

function setDevicePowerSource(deviceInstanceId, newPowerSource) {
  const item = projectBOM.find(i => i.instanceId === deviceInstanceId);
  if (!item) return;
  TopologyHistory.pushState(`Change Power Source (${item.model})`);
  if (typeof PortEngine !== "undefined") {
    PortEngine.setPowerSource(item, newPowerSource);
  } else {
    item.powerSourceOverride = newPowerSource;
  }
  FacilityStore.notifyWorkspaceChange();
  renderTopology();
  renderTopologyInspector();
  if (typeof showToast === "function") {
    const modeDef = (typeof POWER_SOURCE_MODES !== "undefined" && POWER_SOURCE_MODES[newPowerSource]) || { label: newPowerSource };
    showToast(`Set ${item.model} power to ${modeDef.label}`);
  }
}

function setDeviceHostSwitch(deviceInstanceId, newSwitchId) {
  const item = projectBOM.find(i => i.instanceId === deviceInstanceId);
  if (!item) return;
  TopologyHistory.pushState(`Reassign Switch (${item.model})`);
  const oldSwitchId = item.uplinkTargetId;
  item.uplinkTargetId = newSwitchId || null;
  if (typeof PortEngine !== "undefined") {
    if (oldSwitchId) {
      const oldSw = projectBOM.find(i => i.instanceId === oldSwitchId);
      if (oldSw) PortEngine.disconnectPort(oldSw, item.assignedSwitchPort);
    }
    if (newSwitchId) {
      delete item.unassignedByUser;
      const newSw = projectBOM.find(i => i.instanceId === newSwitchId);
      if (newSw) {
        PortEngine.allocatePort(newSw, item);
        const swLoc = newSw.closetName || newSw.rackId;
        if (swLoc) {
          item.closetName = swLoc;
          item.rackId = swLoc;
          if (typeof facilityFloors !== "undefined" && Array.isArray(facilityFloors)) {
            const allClosets = (typeof getAllClosetsAcrossFacility === "function") ? getAllClosetsAcrossFacility() : [];
            const matchCl = allClosets.find(c => c.name === swLoc || swLoc.startsWith(c.name));
            facilityFloors.forEach(fl => {
              const drop = (fl.nodes || []).find(n => n.instanceId === item.instanceId || n.id === `dev-${item.instanceId}` || n.id === item.instanceId);
              if (drop && matchCl) {
                drop.assignedClosetId = matchCl.id;
              }
            });
          }
        }
      }
    } else {
      item.assignedSwitchPort = null;
    }
  }
  FacilityStore.notifyWorkspaceChange();
  if (typeof recalculateCurrentFloorCables === "function") recalculateCurrentFloorCables();
  if (typeof renderCableCanvas === "function") renderCableCanvas();
  renderTopology();
  renderTopologyInspector();
  if (typeof showToast === "function") showToast(`Reassigned ${item.model} to new host switch`);
}

function setDeviceSwitchPort(deviceInstanceId, newPortNumber) {
  const item = projectBOM.find(i => i.instanceId === deviceInstanceId);
  if (!item || !item.uplinkTargetId) return;
  const sw = projectBOM.find(i => i.instanceId === item.uplinkTargetId);
  if (!sw) return;
  TopologyHistory.pushState(`Change Switch Port (${item.model})`);
  if (typeof PortEngine !== "undefined") {
    PortEngine.connect(sw, parseInt(newPortNumber, 10), item, 1);
  } else {
    item.assignedSwitchPort = parseInt(newPortNumber, 10);
  }
  FacilityStore.notifyWorkspaceChange();
  renderTopology();
  renderTopologyInspector();
  if (typeof showToast === "function") showToast(`Assigned ${item.model} to Port ${newPortNumber}`);
}

function toggleRadioUplinkRole(radioInstanceId, isUplink) {
  const radio = projectBOM.find(i => i.instanceId === radioInstanceId);
  if (!radio) return;
  TopologyHistory.pushState(`Toggle Radio Uplink (${radio.model})`);
  radio.isUplinkForSwitch = isUplink;
  if (radio.uplinkTargetId) {
    const sw = projectBOM.find(i => i.instanceId === radio.uplinkTargetId);
    if (sw) {
      if (isUplink) {
        sw.customUplinkTargetId = radio.instanceId;
      } else if (sw.customUplinkTargetId === radio.instanceId) {
        sw.customUplinkTargetId = null;
      }
    }
  }
  FacilityStore.notifyWorkspaceChange();
  renderTopology();
  renderTopologyInspector();
  if (typeof showToast === "function") {
    showToast(isUplink ? `Set ${radio.model} as uplink for host switch` : `Cleared radio uplink role`);
  }
}

function updateRadioPartner(radioInstanceId, partnerInstanceId) {
  const radio = projectBOM.find(i => i.instanceId === radioInstanceId);
  if (radio) {
    TopologyHistory.pushState(`Change Radio Partner (${radio.model})`);
    radio.customUplinkTargetId = partnerInstanceId || null;
    FacilityStore.notifyWorkspaceChange();
    renderTopology();
    renderTopologyInspector();
  }
}

function inspectSwitchPort(switchInstanceId, portNum) {
  const sw = projectBOM.find(i => i.instanceId === switchInstanceId);
  if (!sw || typeof PortEngine === "undefined") return;
  const ports = PortEngine.initSwitchPorts(sw);
  const port = ports.find(p => p.portNumber === parseInt(portNum, 10));
  if (!port) return;

  if (port.connectedDeviceId) {
    const targetDev = projectBOM.find(i => i.instanceId === port.connectedDeviceId);
    const targetName = targetDev ? targetDev.model : (port.connectedDeviceModel || "Connected Device");
    const targetLoc = targetDev ? (targetDev.closetName || targetDev.rackId || "Space") : "Location";
    selectTopologyNode(port.connectedDeviceId);
    panNodeIntoView(port.connectedDeviceId);
    if (typeof showToast === "function") {
      showToast(`${port.label} &rarr; Navigated to ${targetName} (${targetLoc})`);
    }
  } else {
    if (typeof showToast === "function") {
      showToast(`${port.label} (${port.speed}) is free / unpopulated.`);
    }
  }
}

// -----------------------------------------------------------
// Rack Enclosure & Navigation Helpers
// -----------------------------------------------------------
function updateDeviceLocation(instanceId, newLoc) {
  const item = projectBOM.find(i => i.instanceId === instanceId);
  if (!item || !newLoc) return;
  TopologyHistory.pushState(`Move Device (${item.model})`);
  const parsed = FacilityStore.parse(newLoc);
  item.closetName = newLoc;
  item.rackId = parsed.enclosure || newLoc;
  if (parsed.space) item.spaceName = parsed.space;

  FacilityStore.notifyWorkspaceChange();
  renderTopology();
  renderTopologyInspector();
  panNodeIntoView(instanceId);
  if (typeof showToast === "function") {
    showToast(`Moved ${item.model} to ${newLoc}`);
  }
}

// -----------------------------------------------------------
// Searchable Quick Navigator (Combobox & Filter Engine)
// -----------------------------------------------------------
let topologySearchActiveIndex = -1;

function getTopologySearchItems() {
  const items = [];
  const groups = {};

  if (typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) {
    projectBOM.forEach(item => {
      if (!isTopologyActiveNode(item)) return;

      const loc = FacilityStore.normalize(item.closetName || item.rackId);
      if (loc === FacilityStore.UNASSIGNED) return;
      if (!groups[loc]) groups[loc] = [];
      groups[loc].push(item);
    });
  }

  // 1. Racks & Enclosures
  Object.keys(groups).forEach(loc => {
    const chassisList = groups[loc];
    items.push({
      targetVal: `loc:${loc}`,
      name: loc,
      badge: `${chassisList.length} Chassis`,
      category: "Racks & Closets",
      icon: "🏢",
      searchText: `${loc} rack enclosure closet cabinet ${chassisList.map(c => c.model).join(' ')}`.toLowerCase()
    });
  });

  // 2. Chassis & Connected Devices by Category
  Object.keys(groups).forEach(loc => {
    groups[loc].forEach(item => {
      let category = "Connected Devices";
      let icon = "🔌";

      if (item.role === "Core" || item.role === "Core & Agg" || item.role === "Aggregation" || item.role === "Gateways & WAN") {
        category = "Core & Aggregation";
        icon = "🌐";
      } else if (item.role === "Access") {
        category = "Access Switches";
        icon = "⚡";
      } else if (item.role === "Server" || item.role === "VMS Server" || item.role === "Compute & Storage") {
        category = "Servers & Ingest";
        icon = "🖥️";
      } else if (item.role === "Wireless Bridge" || item.category === "wireless") {
        category = "Wireless Bridges";
        icon = "📡";
      } else if (item.category === "camera" || item.role === "Security Camera") {
        category = "IP Cameras & Video";
        icon = "📹";
      } else if (item.category === "access_control" || item.role === "Access Control") {
        category = "Access Control & Intercom";
        icon = "🔐";
      }

      const pwr = (typeof PortEngine !== "undefined") ? PortEngine.getDevicePowerSource(item) : (item.powerSource || "");

      items.push({
        targetVal: `node:${item.instanceId}`,
        name: item.model,
        badge: `${loc} • ${item.role || category}`,
        category: category,
        icon: icon,
        searchText: `${item.model} ${loc} ${item.role || ''} ${category} ${item.partNumber || ''} ${item.notes || ''} ${pwr}`.toLowerCase()
      });
    });
  });

  return items;
}

function openTopologySearchMenu() {
  const input = document.getElementById("topologyQuickSearchInput");
  const query = input ? input.value : "";
  filterTopologySearch(query);
}

function filterTopologySearch(query) {
  const resultsContainer = document.getElementById("topologyQuickSearchResults");
  const clearBtn = document.getElementById("topologySearchClearBtn");
  if (!resultsContainer) return;

  const q = (query || "").trim().toLowerCase();
  if (clearBtn) {
    if (q.length > 0) clearBtn.classList.remove("hidden");
    else clearBtn.classList.add("hidden");
  }

  const allItems = getTopologySearchItems();
  const filtered = q ? allItems.filter(i => i.searchText.includes(q)) : allItems;

  if (filtered.length === 0) {
    resultsContainer.innerHTML = `
      <div class="px-3 py-4 text-center text-xs text-slate-500 font-mono">
        No devices or racks matching "${escapeHTML(q)}"
      </div>
    `;
    resultsContainer.classList.remove("hidden");
    topologySearchActiveIndex = -1;
    return;
  }

  // Group by category
  const categories = {};
  filtered.forEach(item => {
    if (!categories[item.category]) categories[item.category] = [];
    categories[item.category].push(item);
  });

  let html = "";
  let itemCounter = 0;

  Object.keys(categories).forEach(cat => {
    html += `
      <div class="px-2 pt-1.5 pb-0.5 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center justify-between border-t border-slate-800/60 first:border-t-0">
        <span>${escapeHTML(cat)}</span>
        <span class="text-slate-500">${categories[cat].length}</span>
      </div>
    `;

    categories[cat].forEach(item => {
      const isSelected = (selectedTopologyRackLoc && item.targetVal === `loc:${selectedTopologyRackLoc}`) ||
                         (selectedTopologyNodeId && item.targetVal === `node:${selectedTopologyNodeId}`);
      
      html += `
        <button
          type="button"
          data-search-idx="${itemCounter}"
          data-target-val="${escapeHTML(item.targetVal)}"
          onclick="selectSearchItem('${escapeJSAttr(item.targetVal)}', '${escapeJSAttr(item.name)}')"
          class="w-full text-left px-2 py-1.5 rounded-lg flex items-center justify-between gap-2 text-xs transition-colors group cursor-pointer ${
            isSelected ? 'bg-indigo-950/70 border border-indigo-500/40 text-white' : 'text-slate-200 hover:bg-slate-850 hover:text-white'
          }"
        >
          <div class="flex items-center gap-2 min-w-0">
            <span class="text-sm shrink-0">${item.icon}</span>
            <div class="truncate">
              <div class="font-medium truncate group-hover:text-indigo-300 transition-colors">${escapeHTML(item.name)}</div>
              <div class="text-[10px] text-slate-400 font-mono truncate">${escapeHTML(item.badge)}</div>
            </div>
          </div>
          <i data-lucide="arrow-right" class="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"></i>
        </button>
      `;
      itemCounter++;
    });
  });

  resultsContainer.innerHTML = html;
  resultsContainer.classList.remove("hidden");
  topologySearchActiveIndex = -1;

  if (typeof safeCreateIcons === "function") {
    safeCreateIcons(resultsContainer);
  } else if (window.lucide) {
    lucide.createIcons();
  }
}

function selectSearchItem(targetVal, label) {
  const input = document.getElementById("topologyQuickSearchInput");
  const resultsContainer = document.getElementById("topologyQuickSearchResults");
  const clearBtn = document.getElementById("topologySearchClearBtn");

  if (input && label) {
    input.value = label;
  }
  if (resultsContainer) {
    resultsContainer.classList.add("hidden");
  }
  if (clearBtn) {
    clearBtn.classList.remove("hidden");
  }

  jumpToTopologyTarget(targetVal);
}

function clearTopologySearch() {
  const input = document.getElementById("topologyQuickSearchInput");
  const clearBtn = document.getElementById("topologySearchClearBtn");
  const resultsContainer = document.getElementById("topologyQuickSearchResults");

  if (input) {
    input.value = "";
    input.focus();
  }
  if (clearBtn) {
    clearBtn.classList.add("hidden");
  }
  if (resultsContainer) {
    resultsContainer.classList.add("hidden");
  }
  deselectTopologyNode();
}

function handleTopologySearchKey(e) {
  const resultsContainer = document.getElementById("topologyQuickSearchResults");
  if (!resultsContainer || resultsContainer.classList.contains("hidden")) {
    if (e.key === "ArrowDown" || e.key === "Enter") {
      openTopologySearchMenu();
    }
    return;
  }

  const buttons = Array.from(resultsContainer.querySelectorAll("button[data-search-idx]"));
  if (buttons.length === 0) return;

  if (e.key === "ArrowDown") {
    e.preventDefault();
    topologySearchActiveIndex = (topologySearchActiveIndex + 1) % buttons.length;
    highlightSearchItem(buttons);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    topologySearchActiveIndex = (topologySearchActiveIndex - 1 + buttons.length) % buttons.length;
    highlightSearchItem(buttons);
  } else if (e.key === "Enter") {
    e.preventDefault();
    if (topologySearchActiveIndex >= 0 && topologySearchActiveIndex < buttons.length) {
      buttons[topologySearchActiveIndex].click();
    } else if (buttons.length > 0) {
      buttons[0].click();
    }
  } else if (e.key === "Escape") {
    resultsContainer.classList.add("hidden");
  }
}

function highlightSearchItem(buttons) {
  buttons.forEach((btn, idx) => {
    if (idx === topologySearchActiveIndex) {
      btn.classList.add("bg-indigo-600", "text-white");
      btn.scrollIntoView({ block: "nearest", behavior: "smooth" });
    } else {
      btn.classList.remove("bg-indigo-600");
    }
  });
}

// Global click-outside listener to close quick search results menu
document.addEventListener("click", function(e) {
  const container = document.getElementById("topologyQuickSearchContainer");
  const results = document.getElementById("topologyQuickSearchResults");
  if (container && results && !container.contains(e.target)) {
    results.classList.add("hidden");
  }
});

function populateTopologyQuickJump() {
  const select = document.getElementById("topologyQuickJump");
  if (!select) return;

  const items = getTopologySearchItems();
  let html = `<option value="" class="bg-slate-900 text-white">Jump to Device / Rack...</option>`;
  items.forEach(item => {
    const isSel = (selectedTopologyRackLoc && item.targetVal === `loc:${selectedTopologyRackLoc}`) ||
                  (selectedTopologyNodeId && item.targetVal === `node:${selectedTopologyNodeId}`);
    html += `<option value="${escapeHTML(item.targetVal)}" class="bg-slate-900 text-white" ${isSel ? 'selected' : ''}>${item.icon} ${escapeHTML(item.name)} (${escapeHTML(item.badge)})</option>`;
  });
  select.innerHTML = html;
}

function updateSwitchStackFromTopology(instanceId, count) {
  if (typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) return;
  const item = projectBOM.find(i => i.instanceId === instanceId);
  if (!item) return;

  const prevStacked = parseInt(item.stackedUnits, 10) || 0;
  const val = parseInt(count, 10) || 0;
  if (val >= 2) {
    item.canStack = true;
    item.stackedUnits = val;
    item.qty = (prevStacked >= 2 && item.qty === prevStacked) ? val : Math.max(item.qty || 1, val);
    item.uplinkMode = "lag_dual";
    item.customLinkMultiplier = Math.max(item.customLinkMultiplier || 1, 2);
  } else {
    if (prevStacked >= 2 && item.qty === prevStacked) item.qty = 1;
    item.stackedUnits = 0;
  }
  if (typeof syncPerChassisChildQuantities === "function") syncPerChassisChildQuantities(item);

  if (typeof PortEngine !== "undefined") {
    PortEngine.initSwitchPorts(item, true);
  }

  if (typeof applyStackCabling === "function") {
    applyStackCabling(item);
  }

  if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
    FacilityStore.notifyWorkspaceChange();
  }

  renderTopology();
  renderTopologyInspector();
  if (typeof showToast === "function") {
    showToast(val >= 2 ? `Configured ${item.model} as a ${val}-Unit Switch Stack.` : `Configured ${item.model} as Standalone.`);
  }
}

function jumpToTopologyTarget(targetVal = null) {
  // 1. Capture navigation history before switching tools
  if (typeof NavigationHistory !== "undefined") {
    const st = NavigationHistory.captureCurrentState();
    if (st && st.tool !== "topology") NavigationHistory.push(st);
  }

  // 2. Open topology via TabManager (or modal fallback)
  const wasHidden = !isTopologyModalVisible();
  if (typeof TabManager !== "undefined" && typeof TabManager.openTab === "function") {
    TabManager.openTab("topology");
  } else if (wasHidden && typeof toggleTopologyModal === "function") {
    toggleTopologyModal();
  }

  // 4. Jump to target after delay to allow canvas rendering
  if (targetVal) {
    setTimeout(() => {
      if (targetVal.startsWith("loc:")) {
        const loc = targetVal.substring(4);
        selectTopologyRack(loc);
        panClusterIntoView(loc);
      } else if (targetVal.startsWith("node:")) {
        const nodeId = targetVal.substring(5);
        const item = (typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) ? projectBOM.find(i => i.instanceId === nodeId) : null;
        if (item) {
          // If node has no valid closet, assign default so it displays in a rack cluster
          if (!item.closetName || item.closetName === FacilityStore.UNASSIGNED) {
            const def = (item.role === "Core" || item.role === "Aggregation") ? "MDF • Rack-1" : "IDF-1 • Rack-1";
            item.closetName = def;
            item.rackId = def;
            if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
              FacilityStore.notifyWorkspaceChange();
            }
            renderTopology();
          }
        }
        selectTopologyNode(nodeId);
        panNodeIntoView(nodeId);
      }
    }, wasHidden ? 160 : 60);
  }
}

// Window Compatibility Exports
window.isTopologyActiveNode = isTopologyActiveNode;
window.isTopologyModalVisible = isTopologyModalVisible;
window.toggleTopologyModal = toggleTopologyModal;
window.initTopologyCanvas = initTopologyCanvas;
window.renderTopology = renderTopology;
window.zoomTopologyCanvas = zoomTopologyCanvas;
window.resetTopologyZoom = resetTopologyZoom;
window.fitTopologyToScreen = fitTopologyToScreen;
window.panClusterIntoView = panClusterIntoView;
window.panNodeIntoView = panNodeIntoView;
window.setTopologyViewPlane = setTopologyViewPlane;
window.toggleTopologyInspector = toggleTopologyInspector;
window.selectTopologyNode = selectTopologyNode;
window.selectTopologyRack = selectTopologyRack;
window.selectTopologyLink = selectTopologyLink;
window.deselectTopologyNode = deselectTopologyNode;
window.getSelectedTopologyNodeId = () => selectedTopologyNodeId;
window.getSelectedTopologyRackLoc = () => selectedTopologyRackLoc;
window.updateDeviceLocation = updateDeviceLocation;
window.populateTopologyQuickJump = populateTopologyQuickJump;
window.openTopologySearchMenu = openTopologySearchMenu;
window.filterTopologySearch = filterTopologySearch;
window.selectSearchItem = selectSearchItem;
window.clearTopologySearch = clearTopologySearch;
window.handleTopologySearchKey = handleTopologySearchKey;
window.jumpToTopologyTarget = jumpToTopologyTarget;
window.autoArrangeTopologyHierarchy = autoArrangeTopologyHierarchy;
window.autoDefaultTopology = autoDefaultTopology;
window.updateCustomUplink = updateCustomUplink;
window.updateCustomLinkMultiplier = updateCustomLinkMultiplier;
window.updateCustomLinkSpeed = updateCustomLinkSpeed;
window.updateSwitchVmsServer = updateSwitchVmsServer;
window.updateSwitchAccessServer = updateSwitchAccessServer;
window.toggleServerRole = toggleServerRole;
window.setDevicePowerSource = setDevicePowerSource;
window.setDeviceHostSwitch = setDeviceHostSwitch;
window.setDeviceSwitchPort = setDeviceSwitchPort;
window.toggleRadioUplinkRole = toggleRadioUplinkRole;
window.updateRadioPartner = updateRadioPartner;
window.inspectSwitchPort = inspectSwitchPort;
window.updateSwitchStackFromTopology = updateSwitchStackFromTopology;
window.toggleTopologyFieldDevices = toggleTopologyFieldDevices;
window.updateTopologyFieldDevicesButton = updateTopologyFieldDevicesButton;
window.autoSynthesizeInterconnects = autoSynthesizeInterconnects;
window.toggleTopologyLayerMenu = toggleTopologyLayerMenu;
window.setTopologyLayerFilter = setTopologyLayerFilter;
window.toggleAllTopologyLayers = toggleAllTopologyLayers;
window.updateTopologyLayerCountBadge = updateTopologyLayerCountBadge;
window.getTopologyDeviceLayer = getTopologyDeviceLayer;
window.setTopologyGroupingMode = setTopologyGroupingMode;
window.getProjectFiberType = getProjectFiberType;
window.setProjectFiberType = setProjectFiberType;
window.getLinkInterconnectOverrides = getLinkInterconnectOverrides;
window.setLinkInterconnectOverrides = setLinkInterconnectOverrides;
window.getLinkInterconnectOverride = getLinkInterconnectOverride;
window.updateLinkOverride = updateLinkOverride;
window.getDacLengthForUDiff = getDacLengthForUDiff;
window.getPatchCordLengthForUDiff = getPatchCordLengthForUDiff;
window.parseRackU = parseRackU;
window.calculateUDistance = calculateUDistance;
window.findDacItem = findDacItem;
window.findPatchCordItem = findPatchCordItem;
window.formatDacItem = formatDacItem;
window.syncRackInterconnectsAndCabling = syncRackInterconnectsAndCabling;
window.syncTopologyLinkToPhysicalLayout = syncTopologyLinkToPhysicalLayout;
window.isClosetNameMatch = isClosetNameMatch;
window.topologyLinks = topologyLinks;
window.linkInterconnectOverrides = linkInterconnectOverrides;

// Close menus when clicking outside
if (typeof document !== "undefined") {
  document.addEventListener("click", (e) => {
    const topoContainer = document.getElementById("topologyLayerFilterContainer");
    const topoMenu = document.getElementById("topologyLayerMenu");
    if (topoMenu && !topoMenu.classList.contains("hidden")) {
      if (topoContainer && !topoContainer.contains(e.target)) {
        topoMenu.classList.add("hidden");
      }
    }
    const physContainer = document.getElementById("physicalLayerFilterContainer");
    const physMenu = document.getElementById("physicalLayerMenu");
    if (physMenu && !physMenu.classList.contains("hidden")) {
      if (physContainer && !physContainer.contains(e.target)) {
        physMenu.classList.add("hidden");
      }
    }
  });
}

