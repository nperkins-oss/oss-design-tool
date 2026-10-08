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

function openPortMatrixStudio(targetSwitchIdOrLoc) {
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
}

function closePortMatrixStudio() {
  const modal = document.getElementById("portMatrixStudioModal");
  if (modal) {
    modal.classList.add("hidden");
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
  const copperPorts = ports.filter(p => !p.connector || p.connector === "RJ-45");
  const opticalPorts = ports.filter(p => p.connector && p.connector !== "RJ-45");
  const usedCopper = copperPorts.filter(p => p.connectedDeviceId || p.poeOutputWatts > 0).length;
  const usedOptical = opticalPorts.filter(p => p.connectedDeviceId).length;

  const badgeText = `${ports.length}-Port ${poeBudget > 0 ? 'PoE+' : 'Data'} (${isStacked ? `${stackUnits}-Switch Stack` : 'Standalone'})`;
  const badgeEl = document.getElementById("matrixStudioSwitchBadge");
  if (badgeEl) {
    badgeEl.textContent = badgeText;
  }
  const facilityBadgeEl = document.getElementById("facilityPortMatrixSwitchBadge");
  if (facilityBadgeEl) {
    facilityBadgeEl.textContent = badgeText;
  }

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
          ${sw.deviceNumber ? `<span class="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-indigo-950 border border-indigo-700 text-indigo-300">${sw.deviceNumber}</span>` : ''}
        </div>
        <div class="text-[10px] text-slate-400 font-mono">${escapeHTML(sw.model)} &bull; SKU: ${escapeHTML(sw.sku)}</div>
        <div class="text-cyan-400 font-mono text-[11px] font-medium pt-0.5">Location: ${escapeHTML(loc)}</div>
      </div>

      <div class="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
        <span class="text-slate-500 text-[10px] uppercase font-mono block">Electrical & PoE Budget</span>
        <div class="font-bold text-amber-400 text-sm font-mono">${poeBudget} W PoE Budget</div>
        <div class="text-[10px] text-slate-400 font-mono">Draw: ${consumedPoE}W (${poePercent}%) &bull; Free: ${freePoE}W</div>
        <div class="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mt-1 border border-slate-800">
          <div class="h-full ${poePercent > 90 ? 'bg-rose-500' : (poePercent > 75 ? 'bg-amber-500' : 'bg-emerald-500')}" style="width: ${poePercent}%;"></div>
        </div>
      </div>

      <div class="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
        <span class="text-slate-500 text-[10px] uppercase font-mono block">Port Utilization</span>
        <div class="font-bold text-sky-400 text-sm font-mono">${usedCopper + usedOptical} / ${ports.length} In-Use</div>
        <div class="text-[10px] text-slate-400 font-mono">Copper: ${usedCopper}/${copperPorts.length} &bull; SFP/QSFP: ${usedOptical}/${opticalPorts.length}</div>
        <div class="text-emerald-400 font-mono text-[11px] font-semibold pt-0.5">${ports.length - (usedCopper + usedOptical)} Free Ports Available</div>
      </div>

      <div class="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
        <span class="text-slate-500 text-[10px] uppercase font-mono block">Architecture & Stacking</span>
        <div class="font-bold text-indigo-300 text-sm font-mono">${isStacked ? `${stackUnits}-Switch Resilient Stack` : 'Standalone (1 Chassis)'}</div>
        <div class="text-[10px] text-slate-400 font-mono">${isStacked ? (hasDedicatedStack ? 'Dedicated Rear Hardware Stack Ports' : 'Uplink Cages in use for Stacking') : '1x AC Outlet Drop'}</div>
        <div class="text-slate-400 font-mono text-[11px] pt-0.5">Footprint: ${parseInt(sw.rackUnits || 1, 10) * stackUnits}U Total Height</div>
      </div>
    </div>

    <!-- High-Resolution Hardware Faceplate Port Matrix -->
    <div class="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <i data-lucide="cpu" class="w-4 h-4 text-sky-400"></i>
          <span class="text-xs font-bold text-white uppercase tracking-wider">Hardware Faceplate & Physical Ports</span>
        </div>
        <div class="flex items-center gap-3 text-[10px] font-mono">
          <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded bg-emerald-500/40 border border-emerald-500"></span> PoE Active</span>
          <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded bg-sky-500/40 border border-sky-500"></span> Uplink / Trunk</span>
          <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded bg-indigo-500/40 border border-indigo-500"></span> Stacking DAC</span>
          <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded bg-amber-500/40 border border-amber-500"></span> Data-Only</span>
          <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded bg-slate-900 border border-slate-700"></span> Unused</span>
        </div>
      </div>

      ${isStacked ? `
        <!-- Stacking Interconnect Fabric Banner -->
        <div class="bg-indigo-950/40 border border-indigo-500/40 rounded-xl p-3.5 space-y-2">
          <div class="flex items-center justify-between flex-wrap gap-2">
            <div class="flex items-center gap-2">
              <div class="p-1.5 rounded-lg bg-indigo-500/20 border border-indigo-500/40 text-indigo-300">
                <i data-lucide="layers" class="w-4 h-4"></i>
              </div>
              <div>
                <span class="text-xs font-bold text-white tracking-wide">High-Speed Resilient Stacking Interconnect Fabric</span>
                <span class="text-[10px] text-indigo-300 font-mono block">
                  ${hasDedicatedStack ? 'Dedicated Rear Hardware Stack Ports' : `Uplink-Based Stacking (${sw.vendor || 'UniFi'} uses optical cages with high-speed DAC loop)`}
                </span>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-700 text-emerald-300 text-[10px] font-mono font-bold flex items-center gap-1">
                <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                RING CLOSED / REDUNDANT
              </span>
              <span class="text-[10px] font-mono text-indigo-300 bg-indigo-900/60 px-2 py-0.5 rounded border border-indigo-700/60">
                ${hasDedicatedStack ? `${stackUnits}x Dedicated Stacking DACs` : `${stackUnits * 2}x Uplink Cages Form Stacking Ring`}
              </span>
            </div>
          </div>

          <!-- Stacking Ring Topology Visualizer -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${Math.min(stackUnits, 4)} gap-2 pt-1 border-t border-indigo-900/60">
            ${Array.from({ length: stackUnits }, (_, uIdx) => {
    const u = uIdx + 1;
    const nextU = u === stackUnits ? 1 : u + 1;
    const prevU = u === 1 ? stackUnits : u - 1;
    return `
                <div class="bg-slate-950/80 p-2 rounded-lg border border-indigo-800/40 text-[10px] font-mono space-y-1">
                  <div class="flex items-center justify-between text-indigo-300 font-bold">
                    <span>Unit ${u} Stack Fabric</span>
                    <span class="text-emerald-400 font-normal">LINK UP</span>
                  </div>
                  <div class="text-slate-400 text-[9px] flex items-center justify-between">
                    <span>DAC Ring Out:</span>
                    <span class="text-sky-300 font-bold">&rarr; Unit ${nextU}</span>
                  </div>
                  <div class="text-slate-400 text-[9px] flex items-center justify-between">
                    <span>DAC Ring Return:</span>
                    <span class="text-purple-300 font-bold">&larr; Unit ${prevU}</span>
                  </div>
                </div>
              `;
  }).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Render units (if stacked, multiple faceplates) -->
      <div class="space-y-4">
        ${Array.from({ length: stackUnits }, (_, uIdx) => {
    const u = uIdx + 1;
    const unitCopper = copperPorts.filter(p => (p.unitIndex || 1) === u);
    const unitOptical = opticalPorts.filter(p => (p.unitIndex || 1) === u);

    return `
            <div class="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2">
              <div class="flex items-center justify-between text-xs font-mono">
                <span class="font-bold ${u === 1 ? 'text-sky-400' : 'text-indigo-400'} flex items-center gap-1.5">
                  <i data-lucide="layers" class="w-3.5 h-3.5"></i>
                  ${isStacked ? `Chassis Unit ${u} (${u === 1 ? 'Master / Active' : 'Member / Standby'}) &bull; ${unitCopper.length} Copper + ${unitOptical.length} Optical` : `${sw.friendlyName || sw.model} Faceplate (${unitCopper.length} Copper + ${unitOptical.length} Optical)`}
                </span>
                <span class="text-slate-400 text-[11px]">${u === 1 ? 'PSU 1 & 2 Active' : `Member ${u} Power Feed OK`}</span>
              </div>

              <!-- Copper Port Bank -->
              <div class="grid grid-cols-12 sm:grid-cols-24 gap-1.5 pt-1">
                ${unitCopper.map(p => {
      const isPoE = (p.poeOutputWatts || 0) > 0;
      const isUp = p.isUplink || p.role === "uplink";
      const isData = p.connectedDeviceId && !isPoE;
      let bg = "bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-600";
      if (isUp) bg = "bg-sky-500/20 border-sky-500/70 text-sky-300 font-bold";
      else if (isPoE) bg = "bg-emerald-500/20 border-emerald-500/70 text-emerald-300 font-bold";
      else if (isData) bg = "bg-amber-500/20 border-amber-500/70 text-amber-300 font-bold";

      return `
                    <div 
                      class="h-9 rounded-lg border ${bg} flex flex-col items-center justify-center font-mono text-[9px] cursor-pointer transition-all hover:scale-105"
                      title="${p.label}: ${p.connectedDeviceModel || 'Free Port'} [${p.speedLabel || p.speed}] ${isPoE ? `(${p.poeOutputWatts}W)` : ''}"
                      onclick="highlightMatrixPort(${p.portNumber})"
                    >
                      <div class="flex items-center gap-0.5">
                        <span>${p.unitPortNumber || p.portNumber}</span>
                        ${p.speed && p.speed !== '1G' ? `<span class="text-[7px] font-bold ${p.speed === '10G' ? 'text-amber-400' : 'text-emerald-400'}">${p.speed}</span>` : ''}
                      </div>
                      ${isPoE ? `<span class="text-[7px] text-emerald-400 leading-none">${p.poeOutputWatts}W</span>` : ''}
                    </div>
                  `;
    }).join('')}
              </div>

              <!-- Optical Transceiver Cages Bank -->
              ${unitOptical.length > 0 ? `
                <div class="pt-2 border-t border-slate-800 flex items-center justify-between gap-3">
                  <span class="text-[10px] font-mono text-cyan-400 uppercase font-bold shrink-0">Optical Cages:</span>
                  <div class="flex items-center gap-2 flex-wrap flex-1">
                    ${unitOptical.map((p, idx) => {
      const isConnected = !!p.connectedDeviceId;
      const isStack = !!p.isStackPort;
      let bg = "bg-slate-950 border-slate-800 text-slate-500";
      if (isStack) bg = "bg-indigo-500/20 border-indigo-500 text-indigo-200 font-bold shadow-sm";
      else if (isConnected) bg = "bg-cyan-500/20 border-cyan-500 text-cyan-300 font-bold";

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

    <!-- Active Port Assignments & Connections Table -->
    <div class="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <i data-lucide="list" class="w-4 h-4 text-emerald-400"></i>
          <span class="text-xs font-bold text-white uppercase tracking-wider">Connected Devices & Interconnects</span>
        </div>
        <span class="text-xs font-mono text-slate-400">${ports.filter(p => p.connectedDeviceId || p.isStackPort).length + (isStacked && hasDedicatedStack ? stackUnits : 0)} Active Connections</span>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs text-slate-300 font-mono">
          <thead class="bg-slate-900 border-b border-slate-800 text-[10px] uppercase text-slate-400">
            <tr>
              <th class="p-2.5">Port</th>
              <th class="p-2.5">Type & Speed</th>
              <th class="p-2.5">Status</th>
              <th class="p-2.5">Connected Device</th>
              <th class="p-2.5">Target Location</th>
              <th class="p-2.5">Cabling & Media</th>
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
                    Unit ${u} Stk-1 &bull; Stacking Port 1
                  </td>
                  <td class="p-2.5 text-indigo-200">
                    Dedicated Hardware Stacking Bus (Bi-Dir)
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

              return ports.map(p => {
                const hasDev = !!p.connectedDeviceId;
                const targetDev = hasDev ? projectBOM.find(i => i.instanceId === p.connectedDeviceId) : null;
                const targetLoc = targetDev ? (targetDev.closetName || targetDev.rackId || 'Space') : (p.connectedLocation || (p.isStackPort ? `${loc} [Stack Ring]` : 'Unassigned'));
                const isPoE = (p.poeOutputWatts || 0) > 0;
                const isOptical = p.connector && p.connector !== "RJ-45";
                const isStack = !!p.isStackPort;

                return `
                  <tr id="matrix-row-${p.portNumber}" class="hover:bg-slate-900/60 transition-colors ${hasDev || isStack ? '' : 'opacity-60'}">
                    <td class="p-2.5 font-bold ${isStack ? 'text-indigo-300' : (isOptical ? 'text-cyan-400' : 'text-white')}">
                      ${p.shortLabel || `Port ${p.portNumber}`}
                    </td>
                    <td class="p-2.5">
                      <span class="font-medium ${isStack ? 'text-indigo-300 font-bold' : (p.speed === '10G' ? 'text-amber-300' : (p.speed === '2.5G' ? 'text-emerald-300' : (isOptical ? 'text-cyan-300' : 'text-slate-300')))}">
                        ${p.speedLabel || (isOptical ? `${p.connector || 'Optical'} (${p.speed})` : `${p.speed} Base-T`)}
                      </span>
                    </td>
                    <td class="p-2.5">
                      ${(hasDev || isStack) ? `
                        <span class="px-1.5 py-0.5 rounded ${isStack ? 'bg-indigo-950 border border-indigo-700 text-indigo-300' : 'bg-emerald-950/80 border border-emerald-800 text-emerald-400'} font-bold text-[9px]">
                          ${isStack ? 'STACK UP' : 'LINK UP'}
                        </span>
                      ` : `
                        <span class="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-500 text-[9px]">
                          IDLE
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
                          ${targetDev && targetDev.deviceNumber ? `<span class="text-[9px] font-mono px-1 py-0.2 rounded bg-indigo-950 border border-indigo-700/60 text-indigo-300 font-bold">${targetDev.deviceNumber}</span>` : ''}
                        </div>
                        <div class="text-[10px] text-slate-500">${escapeHTML(targetDev ? (targetDev.model || targetDev.role) : 'Uplink Peer')}</div>
                      ` : `
                        <span class="text-slate-600">Unconnected / Spare</span>
                      `)}
                    </td>
                    <td class="p-2.5 text-slate-400">
                      ${(hasDev || isStack) ? escapeHTML(targetLoc) : '-'}
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
                          : { color: "Yellow", lengthFt: 1, hex: "#eab308" };
                        return `
                          <div class="space-y-1">
                            <div class="flex items-center gap-1.5" title="Cable Run Standard: ${escapeHTML(runStd.category)} (${escapeHTML(runStd.color)})">
                              <span class="w-2 h-2 rounded-full shrink-0 shadow-sm" style="background-color: ${runStd.hex}; border: 1px solid rgba(255,255,255,0.3);"></span>
                              <span class="text-[11px] text-slate-200">Run: <span class="font-bold text-white">${escapeHTML(runStd.category || 'Cat6A')}</span> <span class="text-slate-400">(${escapeHTML(runStd.color)})</span></span>
                            </div>
                            <div class="flex items-center gap-1.5" title="Patch Cord Standard: ${escapeHTML(String(patchStd.lengthFt || 1))}ft (${escapeHTML(patchStd.color)})">
                              <span class="w-2 h-2 rounded-full shrink-0 shadow-sm" style="background-color: ${patchStd.hex}; border: 1px solid rgba(255,255,255,0.3);"></span>
                              <span class="text-[10px] text-slate-400">Patch: <span class="text-slate-300">${patchStd.lengthFt ? `${escapeHTML(String(patchStd.lengthFt))}ft` : '1ft'}</span> (${escapeHTML(patchStd.color)})</span>
                            </div>
                          </div>
                        `;
                      })() : `
                        <span class="text-slate-600">-</span>
                      `))}
                    </td>
                    <td class="p-2.5">
                      ${isPoE ? `
                        <span class="text-amber-400 font-bold font-mono">${p.poeOutputWatts} W (802.3at)</span>
                      ` : (isStack ? `<span class="text-indigo-400/80 text-[10px]">DAC Copper</span>` : (hasDev ? `<span class="text-slate-500">Data Only</span>` : '-'))}
                    </td>
                    <td class="p-2.5 text-right">
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

function highlightMatrixPort(portNum) {
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
window.highlightMatrixPort = highlightMatrixPort;
window.jumpFromMatrixStudioToElevation = jumpFromMatrixStudioToElevation;
window.jumpFromMatrixStudioToTopology = jumpFromMatrixStudioToTopology;
window.disconnectMatrixPort = disconnectMatrixPort;
window.connectDeviceFromMatrix = connectDeviceFromMatrix;
window.isNetworkSwitchItem = isNetworkSwitchItem;
window.getProjectSwitches = getProjectSwitches;
window.quickAddDefaultSwitchToProject = quickAddDefaultSwitchToProject;
