// =========================================================================
// SWITCH PORT MATRIX & INTERCONNECT STUDIO (NetSelect Enterprise)
// Widescreen Port Telemetry, Faceplate Status Grid, Patch Cable Cross-Links
// =========================================================================

let activePortMatrixSwitchId = null;

function isNetworkSwitchItem(item) {
  if (!item || item.parentInstanceId) return false;
  if (item.isPassive || item.category === "passive" || item.category === "accessories") return false;

  // 1. Device Taxonomy check
  if (typeof DeviceTaxonomy !== "undefined" && typeof DeviceTaxonomy.isSwitch === "function") {
    if (DeviceTaxonomy.isSwitch(item)) return true;
  }

  // 2. Strict Role matches
  const role = String(item.role || "").trim().toLowerCase();
  const validRoles = [
    "access", "core", "aggregation", "core & agg", "core / spine", "core/spine", 
    "distribution", "industrial din-rail switch", "switch", "network switch", 
    "access switch", "poe switch", "managed switch", "spine", "leaf"
  ];
  if (validRoles.includes(role) || role.includes("switch")) return true;

  // 3. Category matches
  const cat = String(item.category || "").trim().toLowerCase();
  if (cat === "switch" || cat === "switches" || cat === "networking" || cat === "network_switch") return true;

  // 4. Ports heuristic & model keywords
  const model = String(item.model || "").toLowerCase();
  const name = String(item.name || item.friendlyName || "").toLowerCase();
  if (model.includes("switch") || name.includes("switch") || model.includes("catalyst") || model.includes("aruba") || model.includes("unifi switch") || model.includes("fortiswitch")) {
    return true;
  }
  if ((item.portsTotal || item.ports || item.totalPorts || item.poePorts) && (item.poeBudget !== undefined || item.baseWatts !== undefined)) {
    return true;
  }

  return false;
}

function getProjectSwitches() {
  if (typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) return [];
  return projectBOM.filter(isNetworkSwitchItem);
}

function quickAddDefaultSwitchToProject() {
  if (typeof projectBOM === "undefined") return;
  const defaultSwitch = (typeof SWITCH_DATABASE !== "undefined" && SWITCH_DATABASE.length > 0)
    ? (SWITCH_DATABASE.find(s => s.role === "Access" && (s.portsTotal === 24 || s.ports === 24)) ||
       SWITCH_DATABASE.find(s => s.role === "Access") ||
       SWITCH_DATABASE[0])
    : {
        id: "SW-24P-POE",
        model: "Enterprise 24-Port PoE+ Gigabit Switch",
        role: "Access",
        category: "switches",
        portsTotal: 24,
        poeBudget: 370,
        baseWatts: 45,
        rackUnits: 1,
        ru: 1,
        msrp: 1450
      };

  const targetCloset = (typeof activeRackId !== "undefined" && activeRackId) ? activeRackId : "MDF • Rack-1";
  const newSw = {
    ...defaultSwitch,
    instanceId: `sw-${Date.now()}`,
    closetName: targetCloset,
    rackId: targetCloset,
    qty: 1
  };
  projectBOM.push(newSw);
  if (typeof saveState === "function") saveState();
  if (typeof showToast === "function") showToast(`Added ${newSw.friendlyName || newSw.model} to Quote BOM.`);
  openPortMatrixStudio(newSw.instanceId);
  if (typeof renderBOMTable === "function") renderBOMTable();
  if (typeof recalculateAllTelemetry === "function") recalculateAllTelemetry();
}

function openPortMatrixStudio(targetSwitchIdOrLoc, focusPortNumber = null) {
  if (typeof projectBOM === "undefined") return;

  const switches = getProjectSwitches();

  const selector = document.getElementById("matrixStudioSwitchSelector");
  const facilitySelector = document.getElementById("facilityPortMatrixSwitchSelector");

  if (switches.length === 0) {
    activePortMatrixSwitchId = null;
    const noSwitchOption = `<option value="" disabled selected>-- No Network Switches in Quote BOM --</option>`;
    if (selector) {
      selector.innerHTML = noSwitchOption;
      selector.disabled = true;
    }
    if (facilitySelector) {
      facilitySelector.innerHTML = noSwitchOption;
      facilitySelector.disabled = true;
    }

    const emptyHtml = `
      <div class="flex-1 flex flex-col items-center justify-center py-16 px-6 text-center max-w-lg mx-auto">
        <div class="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 mb-4 shadow-lg shadow-sky-950/40">
          <i data-lucide="network" class="w-8 h-8"></i>
        </div>
        <h3 class="text-base font-bold text-white mb-1.5">No Network Switches Detected</h3>
        <p class="text-xs text-slate-400 mb-6 leading-relaxed">
          The Port Matrix &amp; Interconnect Studio requires at least one network switch in your Quote BOM. Add an Access, Aggregation, or Core switch to manage port assignments, PoE telemetry, VLAN tagging, and patch cross-links.
        </p>
        <div class="flex flex-wrap items-center justify-center gap-3">
          <button type="button" onclick="quickAddDefaultSwitchToProject()" class="px-4 py-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-sky-900/30 flex items-center gap-2 transition-all cursor-pointer">
            <i data-lucide="plus-circle" class="w-4 h-4"></i> Add 24-Port PoE+ Switch
          </button>
          <button type="button" onclick="switchFacilityView('hierarchy')" class="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer">
            <i data-lucide="layers" class="w-4 h-4 text-indigo-400"></i> Hierarchy &amp; Spaces
          </button>
        </div>
      </div>
    `;

    const container = document.getElementById("portMatrixStudioBody");
    if (container) container.innerHTML = emptyHtml;
    const facilityContainer = document.getElementById("facilityPortMatrixBody");
    if (facilityContainer) facilityContainer.innerHTML = emptyHtml;

    const facModal = document.getElementById("facilityModal");
    const isFacilityActive = facModal && !facModal.classList.contains("hidden") && (typeof facilityActiveView !== "undefined" && facilityActiveView === "port_matrix");
    if (!isFacilityActive) {
      const modal = document.getElementById("portMatrixStudioModal");
      if (modal) modal.classList.remove("hidden");
    }
    if (window.lucide) lucide.createIcons();
    return;
  }

  if (selector) selector.disabled = false;
  if (facilitySelector) facilitySelector.disabled = false;

  let selectedSw = null;
  if (targetSwitchIdOrLoc) {
    selectedSw = switches.find(s => s.instanceId === targetSwitchIdOrLoc) ||
      switches.find(s => FacilityStore.normalize(s.closetName || s.rackId) === FacilityStore.normalize(targetSwitchIdOrLoc));
  }
  if (!selectedSw) {
    selectedSw = switches[0];
  }

  activePortMatrixSwitchId = selectedSw.instanceId;
  if (focusPortNumber !== null && focusPortNumber !== undefined) {
    window.activePortTraceNumber = parseInt(focusPortNumber, 10);
  }

  const switchOptions = switches.map(sw => {
    const loc = FacilityStore.normalize(sw.closetName || sw.rackId);
    const isSel = sw.instanceId === selectedSw.instanceId;
    const dNum = sw.deviceNumber ? ` [${sw.deviceNumber}]` : '';
    const dispName = sw.friendlyName || sw.model;
    return `<option value="${sw.instanceId}" ${isSel ? 'selected' : ''}>${escapeHTML(dispName)}${dNum} (${escapeHTML(loc)})</option>`;
  }).join('');

  if (selector) {
    selector.innerHTML = switchOptions;
    selector.value = selectedSw.instanceId;
  }
  if (facilitySelector) {
    facilitySelector.innerHTML = switchOptions;
    facilitySelector.value = selectedSw.instanceId;
  }

  renderPortMatrixStudioContent(selectedSw.instanceId);

  const facModal = document.getElementById("facilityModal");
  const isFacilityActive = facModal && !facModal.classList.contains("hidden") && (typeof facilityActiveView !== "undefined" && facilityActiveView === "port_matrix");
  if (!isFacilityActive) {
    const modal = document.getElementById("portMatrixStudioModal");
    if (modal) {
      modal.classList.remove("hidden");
    }
  }
  if (window.lucide) lucide.createIcons();

  if (focusPortNumber !== null && focusPortNumber !== undefined) {
    setTimeout(() => {
      highlightMatrixPort(parseInt(focusPortNumber, 10));
    }, 80);
  }
}

function closePortMatrixStudio() {
  const modal = document.getElementById("portMatrixStudioModal");
  if (modal) {
    modal.classList.add("hidden");
  }
}

if (typeof window.portMatrixFilterMode === "undefined") {
  window.portMatrixFilterMode = "all"; // 'all' | 'active'
}

function setPortMatrixFilterMode(mode) {
  window.portMatrixFilterMode = mode === "active" ? "active" : "all";
  if (activePortMatrixSwitchId) {
    renderPortMatrixStudioContent(activePortMatrixSwitchId);
  }
}

function renderPortMatrixStudioContent(switchInstanceId) {
  activePortMatrixSwitchId = switchInstanceId;
  const sw = projectBOM.find(i => i.instanceId === switchInstanceId);
  const container = document.getElementById("portMatrixStudioBody");
  const facilityContainer = document.getElementById("facilityPortMatrixBody");
  if (!sw || (!container && !facilityContainer)) return;

  const selector = document.getElementById("matrixStudioSwitchSelector");
  if (selector && selector.value !== switchInstanceId) selector.value = switchInstanceId;
  const facilitySelector = document.getElementById("facilityPortMatrixSwitchSelector");
  if (facilitySelector && facilitySelector.value !== switchInstanceId) facilitySelector.value = switchInstanceId;

  const hasDedicatedStack = typeof PortEngine !== "undefined" && typeof PortEngine.hasDedicatedStackPorts === "function"
    ? PortEngine.hasDedicatedStackPorts(sw)
    : false;

  const stackUnits = (sw.stackedUnits && sw.stackedUnits >= 2) ? sw.stackedUnits : 1;
  const isStacked = stackUnits >= 2;
  const poeBudget = (parseFloat(sw.poeBudget) || 0) * stackUnits;
  const consumedPoE = parseFloat(sw.consumedPoEWatts) || 0;
  const freePoE = Math.max(0, poeBudget - consumedPoE);
  const poePercent = poeBudget > 0 ? Math.min(100, Math.round((consumedPoE / poeBudget) * 100)) : 0;
  const loc = FacilityStore.normalize(sw.closetName || sw.rackId);

  // Sync uplinks & edge ports from PortEngine
  if (typeof PortEngine !== "undefined") {
    PortEngine.syncSwitchUplinks(sw);
    PortEngine.syncSwitchEdgePorts(sw);
  }
  const ports = (typeof PortEngine !== "undefined") ? PortEngine.initSwitchPorts(sw) : [];
  const patchData = (typeof PortEngine !== "undefined" && typeof PortEngine.resolveSwitchPatchMapping === "function")
    ? PortEngine.resolveSwitchPatchMapping(sw)
    : { mappings: {}, panels: [], isStandardPod: true };
  const patchMappings = patchData.mappings || {};

  const copperPorts = ports.filter(p => !p.connector || p.connector === "RJ-45");
  const opticalPorts = ports.filter(p => p.connector && p.connector !== "RJ-45");
  const usedCopper = copperPorts.filter(p => p.connectedDeviceId || p.poeOutputWatts > 0).length;
  const usedOptical = opticalPorts.filter(p => p.connectedDeviceId).length;

  // Ensure an active traced port is selected for the End-to-End Signal Trace Inspector
  let tracePortNum = window.activePortTraceNumber;
  if (!tracePortNum || !ports.some(p => p.portNumber === tracePortNum)) {
    const firstConnected = ports.find(p => p.connectedDeviceId);
    tracePortNum = firstConnected ? firstConnected.portNumber : (ports[0] ? ports[0].portNumber : 1);
    window.activePortTraceNumber = tracePortNum;
  }
  const tracedPort = ports.find(p => p.portNumber === tracePortNum) || ports[0] || { portNumber: 1, speed: "1G" };
  const tracedPatch = patchMappings[tracePortNum] || null;
  const tracedDev = tracedPort.connectedDeviceId ? projectBOM.find(i => i.instanceId === tracedPort.connectedDeviceId) : null;
  const tracedIsOptical = tracedPort.connector && tracedPort.connector !== "RJ-45";
  const tracedVlan = (typeof getProjectVlanForDevice === "function")
    ? getProjectVlanForDevice(tracedDev, tracedPort, Boolean(tracedPort.isUplink || tracedIsOptical))
    : (tracedPort.vlan || "Untagged");

  const badgeText = `${ports.length}-Port ${poeBudget > 0 ? 'PoE+' : 'Data'} (${isStacked ? `${stackUnits}-Switch Stack` : 'Standalone'})`;
  const badgeEl = document.getElementById("matrixStudioSwitchBadge");
  if (badgeEl) {
    badgeEl.textContent = badgeText;
  }
  const facilityBadgeEl = document.getElementById("facilityPortMatrixSwitchBadge");
  if (facilityBadgeEl) {
    facilityBadgeEl.textContent = badgeText;
  }

  const renderKeystoneJackCell = (p) => {
    const pm = patchMappings[p.portNumber] || {};
    const jackLbl = pm.keystoneJackLabel || `J${String(((p.unitPortNumber || p.portNumber) - 1) % 24 + 1).padStart(2, '0')}`;
    const hasDev = !!p.connectedDeviceId;
    const isPoE = (p.poeOutputWatts || 0) > 0;
    const isUp = p.isUplink || p.role === "uplink";
    const isTraced = p.portNumber === tracePortNum;

    let styleCls = "bg-slate-950/90 border-slate-800 text-slate-600 hover:border-slate-600";
    if (isUp) styleCls = "bg-sky-500/20 border-sky-500/70 text-sky-300 font-bold";
    else if (isPoE) styleCls = "bg-purple-500/25 border-purple-400/80 text-purple-200 font-bold";
    else if (hasDev) styleCls = "bg-amber-500/20 border-amber-500/70 text-amber-200 font-bold";

    if (isTraced) {
      styleCls += " ring-2 ring-cyan-400 border-cyan-300 scale-105 z-10 shadow-md shadow-cyan-950/80";
    }

    const devName = p.connectedDeviceModel || "Unpatched Spare Keystone";
    const cblId = pm.horizontalCableId || "No Drop";
    return `
      <div 
        onclick="highlightMatrixPort(${p.portNumber})"
        class="h-7 rounded border ${styleCls} flex flex-col items-center justify-center font-mono text-[8px] cursor-pointer transition-all select-none"
        title="${escapeHTML(pm.fullPatchCoordinate || jackLbl)} &bull; ${escapeHTML(devName)}${hasDev ? ` (${escapeHTML(cblId)})` : ''} &rarr; Switch Port ${p.portNumber}"
      >
        <span class="leading-none">${escapeHTML(jackLbl)}</span>
        <span class="text-[7px] leading-none mt-0.5 ${hasDev ? 'text-emerald-300' : 'text-slate-600'}">${hasDev ? `P${p.unitPortNumber || p.portNumber}` : '&bull;'}</span>
      </div>
    `;
  };

  const renderSwitchCopperCell = (p) => {
    const isPoE = (p.poeOutputWatts || 0) > 0;
    const isUp = p.isUplink || p.role === "uplink";
    const isData = p.connectedDeviceId && !isPoE;
    const isTraced = p.portNumber === tracePortNum;
    const pm = patchMappings[p.portNumber] || {};

    let bg = "bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-600";
    if (isUp) bg = "bg-sky-500/20 border-sky-500/70 text-sky-300 font-bold";
    else if (isPoE) bg = "bg-emerald-500/20 border-emerald-500/70 text-emerald-300 font-bold";
    else if (isData) bg = "bg-amber-500/20 border-amber-500/70 text-amber-300 font-bold";

    if (isTraced) {
      bg += " ring-2 ring-cyan-400 border-cyan-300 scale-105 z-10 shadow-md shadow-cyan-950/80";
    }

    return `
      <div 
        class="h-9 rounded-lg border ${bg} flex flex-col items-center justify-center font-mono text-[9px] cursor-pointer transition-all hover:scale-105 select-none"
        title="${p.label}: ${escapeHTML(p.connectedDeviceModel || 'Free Port')} [${p.speedLabel || p.speed}] ${isPoE ? `(${p.poeOutputWatts}W)` : ''} ${pm.fullPatchCoordinate ? `via ${pm.fullPatchCoordinate}` : ''}"
        onclick="highlightMatrixPort(${p.portNumber})"
      >
        <div class="flex items-center gap-0.5 leading-none">
          <span>${p.unitPortNumber || p.portNumber}</span>
          ${p.speed && p.speed !== '1G' ? `<span class="text-[7px] font-bold ${p.speed === '10G' ? 'text-amber-400' : 'text-emerald-400'}">${p.speed}</span>` : ''}
        </div>
        ${isPoE ? `<span class="text-[7px] text-emerald-400 leading-none mt-0.5">${p.poeOutputWatts}W</span>` : (p.connectedDeviceId ? `<span class="text-[7px] text-sky-300 leading-none mt-0.5">${escapeHTML(pm.keystoneJackLabel || 'LINK')}</span>` : '')}
      </div>
    `;
  };

  const matrixHtml = `
    <!-- Switch Specs & Telemetry Overview Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
      <div class="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
        <span class="text-slate-500 text-[10px] uppercase font-mono block">Hardware Identity</span>
        <div class="font-bold text-white text-sm truncate flex items-center gap-1.5">
          <span title="${escapeHTML(sw.friendlyName || sw.model)}">${escapeHTML(sw.friendlyName || sw.model)}</span>
          <button onclick="promptEditDeviceFriendlyName('${sw.instanceId}')" class="text-slate-500 hover:text-sky-300 p-0.5 rounded transition-colors" title="Edit Device Friendly Name">
            <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
          </button>
          ${sw.deviceNumber ? `<span class="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-950 border border-indigo-700 text-indigo-300">${sw.deviceNumber}</span>` : ''}
        </div>
        <div class="text-[10px] text-slate-400 font-mono">${escapeHTML(sw.model)} &bull; SKU: ${escapeHTML(sw.sku)}</div>
        <div class="text-cyan-400 font-mono text-[11px] font-medium pt-0.5">Location: ${escapeHTML(loc)}${sw.rackSlot ? ` [Rack U${sw.rackSlot}]` : ''}</div>
      </div>

      <div class="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
        <span class="text-slate-500 text-[10px] uppercase font-mono block">Electrical &amp; PoE Budget</span>
        <div class="font-bold text-amber-400 text-sm font-mono">${poeBudget} W PoE Budget</div>
        <div class="text-[10px] text-slate-400 font-mono">Draw: ${consumedPoE}W (${poePercent}%) &bull; Free: ${freePoE}W</div>
        <div class="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mt-1 border border-slate-800">
          <div class="h-full ${poePercent > 90 ? 'bg-rose-500' : (poePercent > 75 ? 'bg-amber-500' : 'bg-emerald-500')}" style="width: ${poePercent}%;"></div>
        </div>
      </div>

      <div class="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
        <span class="text-slate-500 text-[10px] uppercase font-mono block">Port &amp; Patch Utilization</span>
        <div class="font-bold text-sky-400 text-sm font-mono">${usedCopper + usedOptical} / ${ports.length} In-Use</div>
        <div class="text-[10px] text-slate-400 font-mono">Keystones Patched: ${usedCopper}/${copperPorts.length} &bull; SFP/QSFP: ${usedOptical}/${opticalPorts.length}</div>
        <div class="text-emerald-400 font-mono text-[11px] font-semibold pt-0.5">${ports.length - (usedCopper + usedOptical)} Free Ports Available</div>
      </div>

      <div class="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
        <span class="text-slate-500 text-[10px] uppercase font-mono block">Patch Panel Pairing</span>
        <div class="font-bold text-purple-300 text-sm font-mono">${patchData.panels ? patchData.panels.length : 1}x 24-Port Modular Panels</div>
        <div class="text-[10px] text-slate-400 font-mono">${patchData.isStandardPod ? 'Orion TOW Standard 6U Pod (6" Slim Cords)' : '1:1 Keystone-to-Switch Port Mapping'}</div>
        <div class="text-slate-400 font-mono text-[11px] pt-0.5">Click any Keystone or Port below to trace</div>
      </div>
    </div>

    <!-- Interactive End-to-End Signal & Patch Path Trace Inspector -->
    <div id="portMatrixSignalTraceBanner" class="bg-gradient-to-r from-slate-950 via-indigo-950/30 to-slate-950 p-3.5 rounded-xl border border-indigo-500/40 shadow-lg">
      <div class="flex items-center justify-between flex-wrap gap-2 mb-2.5">
        <div class="flex items-center gap-2">
          <span class="px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
            <i data-lucide="activity" class="w-3 h-3"></i> End-to-End Patch Path Inspector
          </span>
          <span class="text-xs font-bold text-white font-mono">Tracing ${escapeHTML(tracedPort.shortLabel || `Port ${tracedPort.portNumber}`)}</span>
        </div>
        <div class="flex items-center gap-2 text-[10px] font-mono">
          <span class="text-slate-400">Click any Keystone Jack, Switch Port, or Table Row to inspect its physical path</span>
          ${tracedPatch && !tracedIsOptical ? `
            <button onclick="promptOverridePortPatchMapping('${sw.instanceId}', ${tracedPort.portNumber})" class="px-2 py-0.5 rounded bg-purple-950/80 hover:bg-purple-900 border border-purple-700/70 text-purple-200 font-semibold flex items-center gap-1 cursor-pointer transition-colors" title="Customize Patch Panel ID or Keystone Jack # for this port">
              <i data-lucide="edit-2" class="w-3 h-3 text-purple-300"></i> Edit Patch Jack
            </button>
          ` : ''}
        </div>
      </div>

      <div class="matrix-trace-grid text-xs font-mono">
        <!-- Node 1: Field Device -->
        <div class="p-2.5 rounded-xl bg-slate-900/90 border ${tracedPort.connectedDeviceId ? 'border-emerald-500/50' : 'border-slate-800'} flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg ${tracedPort.connectedDeviceId ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300' : 'bg-slate-800 text-slate-500'} flex items-center justify-center shrink-0">
            <i data-lucide="${tracedIsOptical ? 'network' : 'video'}" class="w-4 h-4"></i>
          </div>
          <div class="min-w-0">
            <div class="text-[9px] uppercase text-slate-400">1. Field Device / Peer</div>
            <div class="font-bold ${tracedPort.connectedDeviceId ? 'text-white' : 'text-slate-500'} truncate" title="${escapeHTML(tracedDev ? (tracedDev.friendlyName || tracedDev.model) : (tracedPort.connectedDeviceModel || 'Unassigned / Spare'))}">
              ${escapeHTML(tracedDev ? (tracedDev.friendlyName || tracedDev.model) : (tracedPort.connectedDeviceModel || 'Unconnected Spare'))}
            </div>
            <div class="text-[10px] text-slate-400 truncate">
              ${tracedDev && tracedDev.deviceNumber ? `<span class="text-indigo-300 font-bold">${escapeHTML(tracedDev.deviceNumber)}</span> &bull; ` : ''}${escapeHTML(tracedDev ? (tracedDev.closetName || tracedDev.rackId || loc) : loc)}
            </div>
          </div>
        </div>

        <!-- Link 1: Horizontal Cable Run -->
        <div class="flex flex-col items-center justify-center px-2 text-center">
          <div class="text-[9px] font-bold ${tracedPort.connectedDeviceId ? 'text-amber-300' : 'text-slate-600'}">
            ${tracedIsOptical ? 'Fiber Backbone Trunk' : (tracedPatch && tracedPatch.horizontalCableId ? escapeHTML(tracedPatch.horizontalCableId) : 'No Horizontal Drop')}
          </div>
          <div class="w-full flex items-center gap-1 my-1">
            <div class="h-0.5 flex-1 ${tracedPort.connectedDeviceId ? 'bg-gradient-to-r from-emerald-500 to-purple-500' : 'bg-slate-800'}"></div>
            <i data-lucide="arrow-right" class="w-3.5 h-3.5 ${tracedPort.connectedDeviceId ? 'text-purple-400' : 'text-slate-700'}"></i>
          </div>
          <div class="text-[9px] text-slate-400">
            ${tracedIsOptical ? escapeHTML(tracedPort.connector || 'SFP+ Fiber') : 'Cat6A Horizontal Run'}
          </div>
        </div>

        <!-- Node 2: Patch Panel & Keystone Jack -->
        <div class="p-2.5 rounded-xl bg-slate-900/90 border ${tracedIsOptical ? 'border-cyan-500/40' : 'border-purple-500/50'} flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg ${tracedIsOptical ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300' : 'bg-purple-500/20 border border-purple-500/40 text-purple-300'} flex items-center justify-center shrink-0 font-bold text-xs">
            ${tracedIsOptical ? 'LIU' : escapeHTML(tracedPatch ? tracedPatch.keystoneJackLabel : 'J01')}
          </div>
          <div class="min-w-0">
            <div class="text-[9px] uppercase text-purple-300">2. Patch Panel &amp; Jack</div>
            <div class="font-bold text-white truncate">
              ${tracedIsOptical ? 'Fiber LIU Housing' : escapeHTML(tracedPatch ? `${tracedPatch.patchPanelId} • Jack ${tracedPatch.keystoneJackLabel}` : 'Direct / Unpatched')}
            </div>
            <div class="text-[10px] text-slate-400 truncate">
              ${tracedIsOptical ? 'LC Duplex Bulkhead' : (tracedPatch && tracedPatch.patchPanelSlotU ? `Mounted at ${escapeHTML(tracedPatch.patchPanelSlotU)}` : 'Closet Patch Panel')}
            </div>
          </div>
        </div>

        <!-- Link 2: Short Patch Cord -->
        <div class="flex flex-col items-center justify-center px-2 text-center">
          <div class="text-[9px] font-bold ${tracedPort.connectedDeviceId ? 'text-sky-300' : 'text-slate-500'}">
            ${tracedIsOptical ? 'LC-LC Fiber Jumper' : escapeHTML(tracedPatch ? tracedPatch.patchCordSpec : '6" Cat6A Slim Patch')}
          </div>
          <div class="w-full flex items-center gap-1 my-1">
            <div class="h-0.5 flex-1 ${tracedPort.connectedDeviceId ? 'bg-gradient-to-r from-purple-500 to-sky-500' : 'bg-slate-800'}"></div>
            <i data-lucide="arrow-right" class="w-3.5 h-3.5 ${tracedPort.connectedDeviceId ? 'text-sky-400' : 'text-slate-700'}"></i>
          </div>
          <div class="text-[9px] text-slate-400">
            1:1 Vertical Patching
          </div>
        </div>

        <!-- Node 3: Switch Physical Port -->
        <div class="p-2.5 rounded-xl bg-slate-900/90 border border-sky-500/50 flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/40 text-sky-300 flex items-center justify-center shrink-0 font-bold text-xs">
            P${tracedPort.unitPortNumber || tracedPort.portNumber}
          </div>
          <div class="min-w-0">
            <div class="text-[9px] uppercase text-sky-300">3. Switch Port</div>
            <div class="font-bold text-white truncate">
              ${escapeHTML(sw.friendlyName || sw.model)} &bull; ${escapeHTML(tracedPort.shortLabel || `P${tracedPort.portNumber}`)}
            </div>
            <div class="text-[10px] text-emerald-400 truncate">
              ${tracedPort.speed || '1G'} &bull; ${(tracedPort.poeOutputWatts || 0) > 0 ? `${tracedPort.poeOutputWatts}W PoE` : 'Data'} &bull; ${escapeHTML(tracedVlan)}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- High-Resolution Paired Patch Panel & Switch Hardware Faceplate -->
    <div class="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div class="flex items-center gap-2">
          <i data-lucide="cpu" class="w-4 h-4 text-sky-400"></i>
          <span class="text-xs font-bold text-white uppercase tracking-wider">Paired Patch Panel Keystones &amp; Switch Faceplate</span>
        </div>
        <div class="flex items-center gap-3 text-[10px] font-mono flex-wrap">
          <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded bg-purple-500/40 border border-purple-400"></span> Patched Keystone</span>
          <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded bg-emerald-500/40 border border-emerald-500"></span> Switch PoE Active</span>
          <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded bg-sky-500/40 border border-sky-500"></span> Uplink / Trunk</span>
          <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded bg-amber-500/40 border border-amber-500"></span> Data-Only</span>
          <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded bg-slate-900 border border-slate-700"></span> Spare</span>
        </div>
      </div>

      <!-- Render units (with paired top/bottom 24-port patch panels) -->
      <div class="space-y-4">
        ${Array.from({ length: stackUnits }, (_, uIdx) => {
    const u = uIdx + 1;
    const unitCopper = copperPorts.filter(p => (p.unitIndex || 1) === u);
    const unitOptical = opticalPorts.filter(p => (p.unitIndex || 1) === u);
    const topBank = unitCopper.slice(0, 24);
    const botBank = unitCopper.slice(24, 48);
    const topPm = topBank[0] ? patchMappings[topBank[0].portNumber] : null;
    const botPm = botBank[0] ? patchMappings[botBank[0].portNumber] : null;

    return `
            <div class="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2.5">
              <div class="flex items-center justify-between text-xs font-mono">
                <span class="font-bold ${u === 1 ? 'text-sky-400' : 'text-indigo-400'} flex items-center gap-1.5">
                  <i data-lucide="layers" class="w-3.5 h-3.5"></i>
                  ${isStacked ? `Chassis Unit ${u} (${u === 1 ? 'Master / Active' : 'Member / Standby'})` : `${escapeHTML(sw.friendlyName || sw.model)}`} &bull; Paired Patch &amp; Switch Deck
                </span>
                <span class="text-slate-400 text-[11px]">${unitCopper.length} Copper + ${unitOptical.length} Optical</span>
              </div>

              <!-- Top 24-Port Patch Panel Strip (J01 - J24 -> Switch Ports 1 - 24) -->
              ${topBank.length > 0 ? `
                <div class="p-2 rounded-lg bg-slate-950/90 border border-purple-500/30 space-y-1">
                  <div class="flex items-center justify-between text-[10px] font-mono">
                    <span class="text-purple-300 font-bold flex items-center gap-1.5">
                      <span class="px-1.5 py-0.5 rounded bg-purple-950 border border-purple-700/70 text-purple-200">${escapeHTML(topPm ? topPm.patchPanelId : `PP-U${u}-TOP`)}</span>
                      <span>24-Port Modular Keystone Patch Panel (J01&ndash;J${String(topBank.length).padStart(2, '0')})</span>
                      ${topPm && topPm.patchPanelSlotU ? `<span class="text-slate-400">[${escapeHTML(topPm.patchPanelSlotU)}]</span>` : ''}
                    </span>
                    <span class="text-slate-400">6" Slim Cat6A &darr; Ports 1&ndash;${topBank.length}</span>
                  </div>
                  <div class="matrix-24p-grid">
                    ${topBank.map(p => renderKeystoneJackCell(p)).join('')}
                  </div>
                </div>
              ` : ''}

              <!-- Switch Copper Port Bank -->
              <div class="p-2.5 rounded-lg bg-slate-950 border border-sky-500/30 space-y-1.5">
                <div class="flex items-center justify-between text-[10px] font-mono">
                  <span class="text-sky-300 font-bold flex items-center gap-1.5">
                    <span class="px-1.5 py-0.5 rounded bg-sky-950 border border-sky-700/70 text-sky-200">SWITCH UNIT ${u}</span>
                    <span>${escapeHTML(sw.model)} RJ45 Matrix</span>
                    ${sw.rackSlot ? `<span class="text-slate-400">[Rack U${sw.rackSlot}]</span>` : ''}
                  </span>
                  <span class="text-emerald-400">${unitCopper.filter(p => p.connectedDeviceId).length} / ${unitCopper.length} Ports Active</span>
                </div>
                <div class="matrix-24p-grid">
                  ${topBank.map(p => renderSwitchCopperCell(p)).join('')}
                </div>
                ${botBank.length > 0 ? `
                  <div class="matrix-24p-grid pt-1 border-t border-slate-900">
                    ${botBank.map(p => renderSwitchCopperCell(p)).join('')}
                  </div>
                ` : ''}
              </div>

              <!-- Bottom 24-Port Patch Panel Strip (J01 - J24 -> Switch Ports 25 - 48) -->
              ${botBank.length > 0 ? `
                <div class="p-2 rounded-lg bg-slate-950/90 border border-purple-500/30 space-y-1">
                  <div class="flex items-center justify-between text-[10px] font-mono">
                    <span class="text-purple-300 font-bold flex items-center gap-1.5">
                      <span class="px-1.5 py-0.5 rounded bg-purple-950 border border-purple-700/70 text-purple-200">${escapeHTML(botPm ? botPm.patchPanelId : `PP-U${u}-BOT`)}</span>
                      <span>24-Port Modular Keystone Patch Panel (J01&ndash;J${String(botBank.length).padStart(2, '0')})</span>
                      ${botPm && botPm.patchPanelSlotU ? `<span class="text-slate-400">[${escapeHTML(botPm.patchPanelSlotU)}]</span>` : ''}
                    </span>
                    <span class="text-slate-400">6" Slim Cat6A &uarr; Ports 25&ndash;${24 + botBank.length}</span>
                  </div>
                  <div class="matrix-24p-grid">
                    ${botBank.map(p => renderKeystoneJackCell(p)).join('')}
                  </div>
                </div>
              ` : ''}

              <!-- Optical Transceiver Cages Bank -->
              ${unitOptical.length > 0 ? `
                <div class="pt-2 border-t border-slate-800 flex items-center justify-between gap-3">
                  <span class="text-[10px] font-mono text-cyan-400 uppercase font-bold shrink-0">Optical Cages:</span>
                  <div class="flex items-center gap-2 flex-wrap flex-1">
                    ${unitOptical.map((p, idx) => {
      const isConnected = !!p.connectedDeviceId;
      const isStack = !!p.isStackPort;
      const isTraced = p.portNumber === tracePortNum;
      let bg = "bg-slate-950 border-slate-800 text-slate-500";
      if (isStack) bg = "bg-indigo-500/20 border-indigo-500 text-indigo-200 font-bold shadow-sm";
      else if (isConnected) bg = "bg-cyan-500/20 border-cyan-500 text-cyan-300 font-bold";
      if (isTraced) bg += " ring-2 ring-cyan-400 border-cyan-300";

      return `
                        <div 
                          class="px-2.5 py-1 rounded-lg border ${bg} font-mono text-[10px] flex items-center gap-1.5 cursor-pointer hover:border-cyan-400 transition-all"
                          title="${p.label}: ${p.connectedDeviceModel || 'Free Optical Cage'} (${p.speedLabel || p.speed})"
                          onclick="highlightMatrixPort(${p.portNumber})"
                        >
                          <i data-lucide="${isStack ? 'layers' : 'zap'}" class="w-3 h-3 ${isStack ? 'text-indigo-400' : 'text-cyan-400'}"></i>
                          <span>${p.shortLabel || `U${idx + 1}`} (${p.speed})</span>
                          ${isStack ? `<span class="text-[8px] bg-indigo-950 border border-indigo-700 px-1 rounded text-emerald-300 font-bold">STACK UP</span>` : (isConnected ? `<span class="text-[8px] bg-cyan-950 border border-cyan-800 px-1 rounded text-cyan-300">UP</span>` : '')}
                        </div>
                      `;
    }).join('')}
                  </div>
                </div>
              ` : ''}

              <!-- Stacking Ports (for Stacked Switches with Dedicated Hardware Ports) -->
              ${isStacked && hasDedicatedStack ? `
                <div class="pt-2 border-t border-indigo-900/40 flex items-center justify-between gap-3">
                  <div class="flex items-center gap-1.5 text-[10px] font-mono text-indigo-300 uppercase font-bold shrink-0">
                    <i data-lucide="link" class="w-3.5 h-3.5 text-indigo-400"></i>
                    <span>Dedicated Stacking Ports:</span>
                  </div>
                  <div class="flex items-center gap-2 flex-wrap flex-1">
                    <div class="px-2.5 py-1 rounded-lg border bg-indigo-500/20 border-indigo-500/70 text-indigo-200 font-mono text-[10px] flex items-center gap-1.5 cursor-pointer hover:border-indigo-400 transition-all shadow-sm"
                         title="Dedicated Stack Port 1: Connected via Hardware Cable to Unit ${u === stackUnits ? 1 : u + 1} Port 2">
                      <i data-lucide="zap" class="w-3 h-3 text-indigo-400"></i>
                      <span>Stk-1 &bull; Unit ${u}</span>
                      <span class="text-[8px] bg-indigo-950 border border-indigo-700 px-1 rounded text-emerald-300 font-bold">UP &rarr; U${u === stackUnits ? 1 : u + 1}</span>
                    </div>
                    <div class="px-2.5 py-1 rounded-lg border bg-indigo-500/20 border-indigo-500/70 text-indigo-200 font-mono text-[10px] flex items-center gap-1.5 cursor-pointer hover:border-indigo-400 transition-all shadow-sm"
                         title="Dedicated Stack Port 2: Connected via Hardware Cable to Unit ${u === 1 ? stackUnits : u - 1} Port 1">
                      <i data-lucide="zap" class="w-3 h-3 text-indigo-400"></i>
                      <span>Stk-2 &bull; Unit ${u}</span>
                      <span class="text-[8px] bg-indigo-950 border border-indigo-700 px-1 rounded text-purple-300 font-bold">UP &larr; U${u === 1 ? stackUnits : u - 1}</span>
                    </div>
                    <span class="text-[10px] text-indigo-400/80 font-mono">Dedicated 0.5m/1m Stacking Cable Active</span>
                  </div>
                </div>
              ` : ''}
            </div>
          `;
  }).join('')}
      </div>
    </div>

    <!-- Active Port Assignments, Patch Panel Schedule & Connections Table -->
    <div class="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div class="flex items-center gap-2">
          <i data-lucide="list" class="w-4 h-4 text-emerald-400"></i>
          <span class="text-xs font-bold text-white uppercase tracking-wider">End-to-End Patch Schedule &amp; Connected Devices</span>
          <span class="text-[11px] font-mono text-slate-400">(${ports.filter(p => p.connectedDeviceId || p.isStackPort).length + (isStacked && hasDedicatedStack ? stackUnits : 0)} Active / ${ports.length} Total)</span>
        </div>
        <div class="flex items-center gap-1.5">
          <div class="bg-slate-900 p-0.5 rounded-lg border border-slate-800 flex items-center text-[10px] font-mono">
            <button type="button" onclick="setPortMatrixFilterMode('all')" class="px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer ${window.portMatrixFilterMode !== 'active' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}">
              All Ports (${ports.length})
            </button>
            <button type="button" onclick="setPortMatrixFilterMode('active')" class="px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer ${window.portMatrixFilterMode === 'active' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}">
              Active Patched Only (${ports.filter(p => p.connectedDeviceId || p.isStackPort).length})
            </button>
          </div>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs text-slate-300 font-mono">
          <thead class="bg-slate-900 border-b border-slate-800 text-[10px] uppercase text-slate-400">
            <tr>
              <th class="p-2.5">Switch Port</th>
              <th class="p-2.5">Patch Panel &amp; Jack</th>
              <th class="p-2.5">Status</th>
              <th class="p-2.5">Connected Device</th>
              <th class="p-2.5">Horizontal Run &amp; Location</th>
              <th class="p-2.5">VLAN</th>
              <th class="p-2.5">Cabling &amp; Patch Cord</th>
              <th class="p-2.5">PoE Delivery</th>
              <th class="p-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/60">
            ${isStacked && hasDedicatedStack ? Array.from({ length: stackUnits }, (_, uIdx) => {
    const u = uIdx + 1;
    const nextU = u === stackUnits ? 1 : u + 1;
    return `
                <tr class="bg-indigo-950/20 hover:bg-indigo-950/40 transition-colors">
                  <td class="p-2.5 font-bold text-indigo-300 flex items-center gap-1.5">
                    <i data-lucide="link" class="w-3.5 h-3.5 text-indigo-400"></i>
                    Unit ${u} Stk-1
                  </td>
                  <td class="p-2.5 text-indigo-300 text-[10px]">
                    Rear Stack Bus
                  </td>
                  <td class="p-2.5">
                    <span class="px-1.5 py-0.5 rounded bg-indigo-950 border border-indigo-700 text-emerald-400 font-bold text-[9px] flex items-center gap-1 w-fit">
                      <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      STACK UP
                    </span>
                  </td>
                  <td class="p-2.5">
                    <div class="font-bold text-white">Chassis Unit ${nextU} (Stack Member)</div>
                    <div class="text-[10px] text-indigo-400">Hardware Chassis Ring Interconnect</div>
                  </td>
                  <td class="p-2.5 text-slate-400">
                    ${escapeHTML(loc)} [Rack Stacking Bus]
                  </td>
                  <td class="p-2.5 text-indigo-300 text-[10px]">
                    Backplane
                  </td>
                  <td class="p-2.5">
                    <div class="flex items-center gap-1.5 text-indigo-300">
                      <span class="w-2 h-2 rounded-full bg-indigo-500 shrink-0"></span>
                      <span class="text-[11px] font-mono">Stack DAC (0.5m)</span>
                    </div>
                  </td>
                  <td class="p-2.5 text-slate-500">
                    Hardware Bus
                  </td>
                  <td class="p-2.5 text-right">
                    <span class="px-2 py-0.5 rounded bg-indigo-900/60 border border-indigo-700/60 text-indigo-300 text-[10px] font-mono">
                      Cable Ring #${u}
                    </span>
                  </td>
                </tr>
              `;
  }).join('') : ''}
            ${(() => {
              const unassignedDevices = (typeof projectBOM !== "undefined" && Array.isArray(projectBOM))
                ? projectBOM.filter(d => {
                    if (!d || d.parentInstanceId || d.instanceId === sw.instanceId) return false;
                    const r = (d.role || "").toLowerCase();
                    const c = (d.category || "").toLowerCase();
                    const isFieldDev = r === "camera" || r === "access control" || r === "intercom" ||
                                       c.includes("camera") || c.includes("access") || c.includes("intercom") ||
                                       c.includes("wireless") || r === "wireless bridge" || r === "edge device";
                    return isFieldDev && !d.assignedSwitchPort;
                  })
                : [];

              const visiblePorts = window.portMatrixFilterMode === "active"
                ? ports.filter(p => p.connectedDeviceId || p.isStackPort)
                : ports;

              if (visiblePorts.length === 0) {
                return `
                  <tr>
                    <td colspan="9" class="p-6 text-center text-slate-500">
                      No active patched ports on this switch yet. Switch to <strong>All Ports</strong> or plug in a device below.
                    </td>
                  </tr>
                `;
              }

              return visiblePorts.map(p => {
                const hasDev = !!p.connectedDeviceId;
                const targetDev = hasDev ? projectBOM.find(i => i.instanceId === p.connectedDeviceId) : null;
                const targetLoc = targetDev ? (targetDev.closetName || targetDev.rackId || 'Space') : (p.connectedLocation || (p.isStackPort ? `${loc} [Stack Ring]` : 'Unassigned'));
                const isPoE = (p.poeOutputWatts || 0) > 0;
                const isOptical = p.connector && p.connector !== "RJ-45";
                const isStack = !!p.isStackPort;
                const isUplinkPort = Boolean(p.isUplink || isOptical);
                const resolvedVlan = (typeof getProjectVlanForDevice === "function")
                  ? getProjectVlanForDevice(targetDev, p, isUplinkPort)
                  : "Untagged (Flat)";
                const curPortVlan = p.vlan || "auto";
                const pm = patchMappings[p.portNumber] || null;
                const isTraced = p.portNumber === tracePortNum;

                return `
                  <tr id="matrix-row-${p.portNumber}" onclick="selectMatrixTracePort('${sw.instanceId}', ${p.portNumber}, event)" class="hover:bg-slate-900/80 transition-colors cursor-pointer ${isTraced ? 'bg-cyan-950/30 ring-1 ring-inset ring-cyan-500/50' : ''} ${hasDev || isStack ? '' : 'opacity-65'}">
                    <td class="p-2.5">
                      <div class="font-bold ${isStack ? 'text-indigo-300' : (isOptical ? 'text-cyan-400' : 'text-white')} flex items-center gap-1.5">
                        <span>${p.shortLabel || `Port ${p.portNumber}`}</span>
                        ${isTraced ? `<span class="w-1.5 h-1.5 rounded-full bg-cyan-400" title="Currently traced in Patch Inspector"></span>` : ''}
                      </div>
                      <div class="text-[10px] ${isStack ? 'text-indigo-300' : (p.speed === '10G' ? 'text-amber-300' : (p.speed === '2.5G' ? 'text-emerald-300' : 'text-slate-500'))}">
                        ${p.speedLabel || (isOptical ? `${p.connector || 'Optical'} (${p.speed})` : `${p.speed} Base-T`)}
                      </div>
                    </td>

                    <!-- Dedicated Patch Panel & Keystone Jack Column -->
                    <td class="p-2.5">
                      ${isStack ? `
                        <span class="text-[10px] text-indigo-400">Direct Stack DAC</span>
                      ` : (isOptical ? `
                        <div class="flex items-center gap-1">
                          <span class="px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-800/70 text-cyan-300 text-[10px] font-bold">FIBER-LIU</span>
                          <span class="text-[10px] text-slate-400">LC Port ${p.unitPortNumber || p.portNumber}</span>
                        </div>
                      ` : (pm ? `
                        <div class="flex items-center gap-1.5">
                          <div>
                            <div class="flex items-center gap-1">
                              <span class="px-1.5 py-0.5 rounded bg-purple-950/90 border border-purple-700/70 text-purple-200 text-[10px] font-bold">${escapeHTML(pm.patchPanelId)}</span>
                              <span class="px-1.5 py-0.5 rounded ${hasDev ? 'bg-emerald-950/90 border border-emerald-700/70 text-emerald-300' : 'bg-slate-900 border border-slate-700 text-slate-400'} text-[10px] font-bold">${escapeHTML(pm.keystoneJackLabel)}</span>
                              ${pm.patchPanelSlotU ? `<span class="text-[9px] text-slate-400">[${escapeHTML(pm.patchPanelSlotU)}]</span>` : ''}
                            </div>
                            <div class="text-[9px] text-slate-500 mt-0.5">
                              ${escapeHTML(pm.patchPanelLabel || '24P Modular Patch Panel')}
                            </div>
                          </div>
                          <button type="button" onclick="event.stopPropagation(); promptOverridePortPatchMapping('${sw.instanceId}', ${p.portNumber})" class="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-purple-300 transition-colors cursor-pointer" title="Customize Patch Panel ID or Keystone Jack #">
                            <i data-lucide="edit-2" class="w-3 h-3"></i>
                          </button>
                        </div>
                      ` : `<span class="text-slate-600">-</span>`))}
                    </td>

                    <td class="p-2.5">
                      ${(hasDev || isStack) ? `
                        <span class="px-1.5 py-0.5 rounded ${isStack ? 'bg-indigo-950 border border-indigo-700 text-indigo-300' : 'bg-emerald-950/80 border border-emerald-800 text-emerald-400'} font-bold text-[9px]">
                          ${isStack ? 'STACK UP' : 'PATCHED'}
                        </span>
                      ` : `
                        <span class="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-500 text-[9px]">
                          SPARE
                        </span>
                      `}
                    </td>

                    <td class="p-2.5">
                      ${isStack ? `
                        <div class="font-bold text-indigo-300 flex items-center gap-1.5">
                          <i data-lucide="layers" class="w-3.5 h-3.5 text-indigo-400"></i>
                          <span>${escapeHTML(p.connectedDeviceModel || 'Stack Member Ring')}</span>
                        </div>
                        <div class="text-[10px] text-indigo-400/80">Optical Uplink Cage Formed Stacking Fabric (DAC)</div>
                      ` : (hasDev ? `
                        <div class="font-bold text-white flex items-center gap-1.5">
                          <span>${escapeHTML(targetDev ? (targetDev.friendlyName || targetDev.model) : (p.connectedDeviceModel || p.connectedDeviceId))}</span>
                          ${targetDev && targetDev.deviceNumber ? `<span class="text-[9px] font-mono px-1 py-0.5 rounded bg-indigo-950 border border-indigo-700/60 text-indigo-300 font-bold">${targetDev.deviceNumber}</span>` : ''}
                        </div>
                        <div class="text-[10px] text-slate-500">${escapeHTML(targetDev ? (targetDev.model || targetDev.role) : 'Uplink Peer')}</div>
                      ` : `
                        <span class="text-slate-600">Unconnected / Spare Jack</span>
                      `)}
                    </td>

                    <td class="p-2.5">
                      ${(hasDev || isStack) ? `
                        <div class="text-slate-200 font-semibold">${pm && pm.horizontalCableId ? `<span class="text-amber-300">${escapeHTML(pm.horizontalCableId)}</span> &bull; ` : ''}${escapeHTML(targetLoc)}</div>
                        <div class="text-[9px] text-slate-500">${isOptical ? 'Backbone Fiber Trunk' : 'Horizontal Drop to Keystone Rear'}</div>
                      ` : '<span class="text-slate-600">-</span>'}
                    </td>

                    <td class="p-2.5" onclick="event.stopPropagation()">
                      ${isStack ? `<span class="text-indigo-400/80 text-[10px]">Stack Ring</span>` : `
                        <select onchange="updateMatrixPortVlan('${sw.instanceId}', ${p.portNumber}, this.value)" class="bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded px-1.5 py-0.5 text-[10px] text-slate-200 font-mono focus:outline-none focus:border-indigo-500 cursor-pointer">
                          <option value="auto" ${curPortVlan === 'auto' ? 'selected' : ''}>Auto (${escapeHTML(resolvedVlan)})</option>
                          <option value="untagged" ${curPortVlan === 'untagged' ? 'selected' : ''}>Untagged (Flat)</option>
                          <option value="trunk" ${curPortVlan === 'trunk' ? 'selected' : ''}>802.1Q Trunk</option>
                          <option value="10" ${String(curPortVlan) === '10' ? 'selected' : ''}>VLAN 10 (DATA)</option>
                          <option value="20" ${String(curPortVlan) === '20' ? 'selected' : ''}>VLAN 20 (CCTV)</option>
                          <option value="30" ${String(curPortVlan) === '30' ? 'selected' : ''}>VLAN 30 (ACS)</option>
                          <option value="40" ${String(curPortVlan) === '40' ? 'selected' : ''}>VLAN 40 (SIP)</option>
                          <option value="50" ${String(curPortVlan) === '50' ? 'selected' : ''}>VLAN 50 (WLAN)</option>
                          <option value="99" ${String(curPortVlan) === '99' ? 'selected' : ''}>VLAN 99 (MGMT)</option>
                        </select>
                      `}
                    </td>

                    <td class="p-2.5">
                      ${isStack ? `
                        <div class="flex items-center gap-1.5 text-indigo-300">
                          <span class="w-2 h-2 rounded-full bg-indigo-500 shrink-0"></span>
                          <span class="text-[11px] font-mono">10G SFP+ DAC</span>
                        </div>
                      ` : (isOptical ? `
                        <div class="flex items-center gap-1.5 text-cyan-300">
                          <span class="w-2 h-2 rounded-full bg-cyan-400 shrink-0"></span>
                          <span class="text-[11px] font-mono">${escapeHTML(p.connector || 'Optical')} Fiber</span>
                        </div>
                      ` : (hasDev ? (() => {
                        const runStd = (typeof getProjectCablingStandard === "function") 
                          ? getProjectCablingStandard(targetDev, "run") 
                          : { color: "Yellow", category: "Cat6A", hex: "#eab308" };
                        const patchStd = (typeof getProjectCablingStandard === "function") 
                          ? getProjectCablingStandard(targetDev, "patch") 
                          : { color: "Yellow", lengthFt: 0.5, hex: "#eab308" };
                        return `
                          <div class="space-y-0.5">
                            <div class="flex items-center gap-1.5" title="Horizontal Run: ${escapeHTML(runStd.category)} (${escapeHTML(runStd.color)})">
                              <span class="w-2 h-2 rounded-full shrink-0 shadow-sm" style="background-color: ${runStd.hex}; border: 1px solid rgba(255,255,255,0.3);"></span>
                              <span class="text-[10px] text-slate-200">Run: <span class="font-bold text-white">${escapeHTML(runStd.category || 'Cat6A')}</span></span>
                            </div>
                            <div class="flex items-center gap-1.5" title="Rack Patch Cord: ${escapeHTML(pm ? pm.patchCordSpec : '6" Cat6A Slim')}">
                              <span class="w-2 h-2 rounded-full shrink-0 shadow-sm" style="background-color: ${patchStd.hex}; border: 1px solid rgba(255,255,255,0.3);"></span>
                              <span class="text-[10px] text-sky-300">${escapeHTML(pm ? pm.patchCordSpec : '6" Slim Cat6A')}</span>
                            </div>
                          </div>
                        `;
                      })() : `
                        <span class="text-slate-600 text-[10px]">${pm ? escapeHTML(pm.patchCordSpec) : '-'}</span>
                      `))}
                    </td>

                    <td class="p-2.5">
                      ${isPoE ? `
                        <span class="text-amber-400 font-bold font-mono">${p.poeOutputWatts} W (${p.poeStandard === 'bt90' ? '802.3bt-90W' : (p.poeStandard === 'bt60' ? '802.3bt-60W' : (p.poeStandard === 'af' ? '802.3af' : '802.3at'))})</span>
                      ` : (isStack ? `<span class="text-indigo-400/80 text-[10px]">DAC Copper</span>` : (hasDev ? `<span class="text-slate-500">Data Only</span>` : '-'))}
                    </td>

                    <td class="p-2.5 text-right" onclick="event.stopPropagation()">
                      ${hasDev && !isStack ? `
                        <div class="flex items-center justify-end gap-1">
                          <button onclick="closePortMatrixStudio(); jumpToTopologyTarget('node:${p.connectedDeviceId}')" class="px-1.5 py-0.5 rounded bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-800 text-indigo-300 text-[10px] cursor-pointer" title="Focus in Topology">
                            Topo
                          </button>
                          <button onclick="closePortMatrixStudio(); jumpToPhysicalLayoutTarget('${p.connectedDeviceId}')" class="px-1.5 py-0.5 rounded bg-amber-950/60 hover:bg-amber-900 border border-amber-800 text-amber-300 text-[10px] cursor-pointer" title="Focus in Physical Layout">
                            Phys
                          </button>
                          <button onclick="closePortMatrixStudio(); jumpToBomTarget('${p.connectedDeviceId}')" class="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-[10px] cursor-pointer" title="Locate in BOM">
                            BOM
                          </button>
                          <button onclick="disconnectMatrixPort('${sw.instanceId}', ${p.portNumber})" class="px-1.5 py-0.5 rounded bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 text-[10px] cursor-pointer flex items-center gap-0.5" title="Disconnect device from this port">
                            <i data-lucide="unlink" class="w-2.5 h-2.5"></i> Unplug
                          </button>
                        </div>
                      ` : (!hasDev && !isStack && !isOptical && unassignedDevices.length > 0 ? `
                        <select onchange="connectDeviceFromMatrix('${sw.instanceId}', ${p.portNumber}, this.value)" class="bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500 text-emerald-400 text-[10px] rounded px-1.5 py-0.5 cursor-pointer max-w-[130px] truncate focus:outline-none">
                          <option value="">+ Plug In Device...</option>
                          ${unassignedDevices.map(d => `
                            <option value="${d.instanceId}">${escapeHTML(d.friendlyName || d.model)} (${d.powerConsumptionWatts || 15}W)</option>
                          `).join('')}
                        </select>
                      ` : (isStack ? `<span class="text-[10px] font-mono text-indigo-400/80">Stack Bus</span>` : `<span class="text-[10px] font-mono text-slate-600">Spare</span>`))}
                    </td>
                  </tr>
                `;
              }).join('');
            })()}
          </tbody>
        </table>
      </div>
    </div>
  `;

  if (container) container.innerHTML = matrixHtml;
  if (facilityContainer) facilityContainer.innerHTML = matrixHtml;

  if (window.lucide) lucide.createIcons();
}

function selectMatrixTracePort(switchInstanceId, portNum, event) {
  window.activePortTraceNumber = parseInt(portNum, 10);
  renderPortMatrixStudioContent(switchInstanceId);
}

function promptOverridePortPatchMapping(switchInstanceId, portNum) {
  const sw = projectBOM.find(i => i.instanceId === switchInstanceId);
  if (!sw) return;
  const ports = (typeof PortEngine !== "undefined") ? PortEngine.initSwitchPorts(sw) : (sw.physicalPorts || []);
  const p = ports.find(pt => pt.portNumber === parseInt(portNum, 10));
  if (!p) return;

  const patchData = (typeof PortEngine !== "undefined" && typeof PortEngine.resolveSwitchPatchMapping === "function")
    ? PortEngine.resolveSwitchPatchMapping(sw)
    : { mappings: {} };
  const pm = (patchData.mappings && patchData.mappings[portNum]) || {};

  const currentPanel = p.customPatchPanelId || pm.patchPanelId || "PP-U1-TOP";
  const currentJack = p.customKeystoneJack || pm.keystoneJackNumber || (((p.unitPortNumber || p.portNumber) - 1) % 24) + 1;

  const newPanel = prompt(`Custom Patch Panel ID for ${p.shortLabel || `Port ${portNum}`} (leave blank to reset to automatic):`, currentPanel);
  if (newPanel === null) return;

  const newJackStr = prompt(`Keystone Jack # (1-48) on ${newPanel.trim() || currentPanel}:`, String(currentJack));
  if (newJackStr === null) return;

  if (!newPanel.trim()) {
    delete p.customPatchPanelId;
    delete p.customKeystoneJack;
  } else {
    p.customPatchPanelId = newPanel.trim().toUpperCase();
    const parsedJack = parseInt(newJackStr, 10);
    if (!isNaN(parsedJack) && parsedJack >= 1 && parsedJack <= 48) {
      p.customKeystoneJack = parsedJack;
    }
  }

  if (typeof StorageService !== "undefined") {
    StorageService.queueAutoSave();
  }
  window.activePortTraceNumber = parseInt(portNum, 10);
  renderPortMatrixStudioContent(switchInstanceId);
  if (typeof renderRackVisualizer === "function") {
    renderRackVisualizer();
  }
}

function updateMatrixPortVlan(switchInstanceId, portNumber, vlanVal) {
  const sw = projectBOM.find(i => i.instanceId === switchInstanceId);
  if (!sw) return;
  const ports = sw.physicalPorts || sw.portsList || [];
  const p = ports.find(pt => pt.portNumber === parseInt(portNumber, 10));
  if (p) {
    if (!vlanVal || vlanVal === "auto") {
      delete p.vlan;
    } else {
      p.vlan = vlanVal;
    }
  }
  if (typeof StorageService !== "undefined") {
    StorageService.queueAutoSave();
  }
  renderPortMatrixStudioContent(switchInstanceId);
}

function highlightMatrixPort(portNum) {
  window.activePortTraceNumber = parseInt(portNum, 10);
  if (activePortMatrixSwitchId) {
    renderPortMatrixStudioContent(activePortMatrixSwitchId);
  }
  const row = document.getElementById(`matrix-row-${portNum}`);
  if (row) {
    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    row.classList.add("bg-sky-950/80");
    setTimeout(() => {
      row.classList.remove("bg-sky-950/80");
    }, 1500);
  }
}

function jumpFromMatrixStudioToElevation() {
  if (!activePortMatrixSwitchId) return;
  const sw = projectBOM.find(i => i.instanceId === activePortMatrixSwitchId);
  closePortMatrixStudio();
  const swLoc = sw ? (sw.closetName || sw.rackId) : null;
  const facilityModal = document.getElementById("facilityModal");
  if (facilityModal && !facilityModal.classList.contains("hidden") && typeof switchFacilityView === "function") {
    switchFacilityView("visualizer", swLoc);
  } else if (sw && typeof openRackViewerFor === "function") {
    openRackViewerFor(swLoc);
  }
}

function jumpFromMatrixStudioToTopology() {
  if (!activePortMatrixSwitchId) return;
  closePortMatrixStudio();
  const facilityModal = document.getElementById("facilityModal");
  if (facilityModal && !facilityModal.classList.contains("hidden")) {
    facilityModal.classList.add("hidden");
  }
  if (typeof toggleTopologyModal === "function") {
    const modal = document.getElementById("topologyModal");
    if (modal && modal.classList.contains("hidden")) {
      toggleTopologyModal();
    }
    if (typeof selectTopologyNode === "function") {
      selectTopologyNode(activePortMatrixSwitchId);
    }
    if (typeof panNodeIntoView === "function") {
      panNodeIntoView(activePortMatrixSwitchId);
    }
  }
}

function disconnectMatrixPort(switchInstanceId, portNumber) {
  const sw = projectBOM.find(i => i.instanceId === switchInstanceId);
  if (!sw) return;

  if (typeof PortEngine !== "undefined") {
    PortEngine.disconnectPort(sw, portNumber);
  }

  if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
    FacilityStore.notifyWorkspaceChange();
  }

  renderPortMatrixStudioContent(switchInstanceId);

  if (typeof renderTopology === "function") renderTopology();
  if (typeof recalculateCurrentFloorCables === "function") recalculateCurrentFloorCables();
  if (typeof renderCableCanvas === "function") renderCableCanvas();
  if (typeof renderInspector === "function") renderInspector();
  if (typeof updateProjectHealthUI === "function") updateProjectHealthUI();

  if (typeof showToast === "function") {
    showToast(`Disconnected Port ${portNumber} on ${sw.friendlyName || sw.model}`);
  }
}

function connectDeviceFromMatrix(switchInstanceId, portNumber, deviceInstanceId) {
  if (!deviceInstanceId) return;
  const sw = projectBOM.find(i => i.instanceId === switchInstanceId);
  const dev = projectBOM.find(i => i.instanceId === deviceInstanceId);
  if (!sw || !dev) return;

  if (typeof PortEngine !== "undefined") {
    if (dev.uplinkTargetId && dev.uplinkTargetId !== sw.instanceId) {
      const oldSw = projectBOM.find(i => i.instanceId === dev.uplinkTargetId);
      if (oldSw && dev.assignedSwitchPort) {
        PortEngine.disconnectPort(oldSw, dev.assignedSwitchPort);
      }
    }
    PortEngine.connect(sw, parseInt(portNumber, 10), dev, 1);

    const swLoc = sw.closetName || sw.rackId;
    if (swLoc) {
      dev.closetName = swLoc;
      dev.rackId = swLoc;
      if (typeof facilityFloors !== "undefined" && Array.isArray(facilityFloors)) {
        const allClosets = (typeof getAllClosetsAcrossFacility === "function") ? getAllClosetsAcrossFacility() : [];
        const matchCl = allClosets.find(c => c.name === swLoc || swLoc.startsWith(c.name));
        facilityFloors.forEach(fl => {
          const drop = (fl.nodes || []).find(n => n.instanceId === dev.instanceId || n.id === `dev-${dev.instanceId}` || n.id === dev.instanceId);
          if (drop && matchCl) {
            drop.assignedClosetId = matchCl.id;
          }
        });
      }
    }
  }

  if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
    FacilityStore.notifyWorkspaceChange();
  }

  window.activePortTraceNumber = parseInt(portNumber, 10);
  renderPortMatrixStudioContent(switchInstanceId);

  if (typeof renderTopology === "function") renderTopology();
  if (typeof recalculateCurrentFloorCables === "function") recalculateCurrentFloorCables();
  if (typeof renderCableCanvas === "function") renderCableCanvas();
  if (typeof renderInspector === "function") renderInspector();
  if (typeof updateProjectHealthUI === "function") updateProjectHealthUI();

  if (typeof showToast === "function") {
    showToast(`Connected ${dev.friendlyName || dev.model} to Port ${portNumber} on ${sw.friendlyName || sw.model}`);
  }
}

// Window Compatibility Exports
window.openPortMatrixStudio = openPortMatrixStudio;
window.closePortMatrixStudio = closePortMatrixStudio;
window.renderPortMatrixStudioContent = renderPortMatrixStudioContent;
window.updateMatrixPortVlan = updateMatrixPortVlan;
window.highlightMatrixPort = highlightMatrixPort;
window.selectMatrixTracePort = selectMatrixTracePort;
window.promptOverridePortPatchMapping = promptOverridePortPatchMapping;
window.setPortMatrixFilterMode = setPortMatrixFilterMode;
window.jumpFromMatrixStudioToElevation = jumpFromMatrixStudioToElevation;
window.jumpFromMatrixStudioToTopology = jumpFromMatrixStudioToTopology;
window.disconnectMatrixPort = disconnectMatrixPort;
window.connectDeviceFromMatrix = connectDeviceFromMatrix;
window.isNetworkSwitchItem = isNetworkSwitchItem;
window.getProjectSwitches = getProjectSwitches;
window.quickAddDefaultSwitchToProject = quickAddDefaultSwitchToProject;
