// =========================================================================
// SWITCH PORT MATRIX & INTERCONNECT STUDIO (NetSelect Enterprise)
// Widescreen Port Telemetry, Faceplate Status Grid, Patch Cable Cross-Links
// =========================================================================

let activePortMatrixSwitchId = null;

function openPortMatrixStudio(targetSwitchIdOrLoc) {
  if (typeof projectBOM === "undefined") return;

  const switches = projectBOM.filter(item => {
    if (item.parentInstanceId) return false;
    return item.role === "Core / Spine" || item.role === "Aggregation" || item.role === "Access" || item.role === "Industrial DIN-Rail Switch" || item.category === "switch";
  });

  if (switches.length === 0) {
    if (typeof showToast === "function") showToast("No network switches currently in project Quote BOM.", 3000);
    return;
  }

  let selectedSw = null;
  if (targetSwitchIdOrLoc) {
    selectedSw = switches.find(s => s.instanceId === targetSwitchIdOrLoc) ||
      switches.find(s => FacilityStore.normalize(s.closetName || s.rackId) === FacilityStore.normalize(targetSwitchIdOrLoc));
  }
  if (!selectedSw) {
    selectedSw = switches[0];
  }

  activePortMatrixSwitchId = selectedSw.instanceId;

  const selector = document.getElementById("matrixStudioSwitchSelector");
  if (selector) {
    selector.innerHTML = switches.map(sw => {
      const loc = FacilityStore.normalize(sw.closetName || sw.rackId);
      const isSel = sw.instanceId === selectedSw.instanceId;
      return `<option value="${sw.instanceId}" ${isSel ? 'selected' : ''}>${escapeHTML(sw.model)} (${escapeHTML(loc)})</option>`;
    }).join('');
  }

  renderPortMatrixStudioContent(selectedSw.instanceId);

  const modal = document.getElementById("portMatrixStudioModal");
  if (modal) {
    modal.classList.remove("hidden");
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
  if (!sw || !container) return;

  const stackUnits = (sw.stackedUnits && sw.stackedUnits >= 2) ? sw.stackedUnits : 1;
  const isStacked = stackUnits >= 2;
  const poeBudget = (parseFloat(sw.poeBudget) || 0) * stackUnits;
  const consumedPoE = parseFloat(sw.consumedPoEWatts) || 0;
  const freePoE = Math.max(0, poeBudget - consumedPoE);
  const poePercent = poeBudget > 0 ? Math.min(100, Math.round((consumedPoE / poeBudget) * 100)) : 0;
  const loc = FacilityStore.normalize(sw.closetName || sw.rackId);

  // Sync uplinks & get port list from PortEngine
  if (typeof PortEngine !== "undefined") {
    PortEngine.syncSwitchUplinks(sw);
  }
  const ports = (typeof PortEngine !== "undefined") ? PortEngine.initSwitchPorts(sw) : [];
  const copperPorts = ports.filter(p => p.type === "copper" || !p.type);
  const opticalPorts = ports.filter(p => p.type === "optical" || p.type === "sfp" || p.type === "qsfp");
  const usedCopper = copperPorts.filter(p => p.connectedDeviceId || p.poeOutputWatts > 0).length;
  const usedOptical = opticalPorts.filter(p => p.connectedDeviceId).length;

  const badgeEl = document.getElementById("matrixStudioSwitchBadge");
  if (badgeEl) {
    badgeEl.textContent = `${ports.length}-Port ${poeBudget > 0 ? 'PoE+' : 'Data'} (${isStacked ? `${stackUnits}-Switch Stack` : 'Standalone'})`;
  }

  container.innerHTML = `
    <!-- Switch Specs & Telemetry Overview Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
      <div class="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
        <span class="text-slate-500 text-[10px] uppercase font-mono block">Hardware Identity</span>
        <div class="font-bold text-white text-sm truncate">${escapeHTML(sw.model)}</div>
        <div class="text-[10px] text-slate-400 font-mono">SKU: ${escapeHTML(sw.sku)} &bull; ${sw.vendor || 'Generic'}</div>
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
        <div class="text-[10px] text-slate-400 font-mono">${isStacked ? `${stackUnits * 2}x AC Outlets &bull; ${stackUnits}x DACs` : '1x AC Outlet Drop'}</div>
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
          <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded bg-amber-500/40 border border-amber-500"></span> Data-Only</span>
          <span class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded bg-slate-900 border border-slate-700"></span> Unused</span>
        </div>
      </div>

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
                  ${isStacked ? `Chassis Unit ${u} (${u === 1 ? 'Master / Active' : 'Member / Standby'}) &bull; ${unitCopper.length} Copper + ${unitOptical.length} Optical` : `${sw.model} Faceplate (${unitCopper.length} Copper + ${unitOptical.length} Optical)`}
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
                      class="h-8 rounded-lg border ${bg} flex flex-col items-center justify-center font-mono text-[9px] cursor-pointer transition-all hover:scale-105"
                      title="${p.label}: ${p.connectedDeviceModel || 'Free Port'} ${isPoE ? `(${p.poeOutputWatts}W)` : ''}"
                      onclick="highlightMatrixPort(${p.portNumber})"
                    >
                      <span>${p.unitPortNumber || p.portNumber}</span>
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
                      const bg = isConnected ? "bg-cyan-500/20 border-cyan-500 text-cyan-300 font-bold" : "bg-slate-950 border-slate-800 text-slate-500";
                      return `
                        <div 
                          class="px-2.5 py-1 rounded-lg border ${bg} font-mono text-[10px] flex items-center gap-1.5 cursor-pointer hover:border-cyan-400 transition-all"
                          title="${p.label}: ${p.connectedDeviceModel || 'Free Optical Cage'} (${p.speed})"
                          onclick="highlightMatrixPort(${p.portNumber})"
                        >
                          <i data-lucide="zap" class="w-3 h-3 text-cyan-400"></i>
                          <span>${p.shortLabel || `U${idx + 1}`} (${p.speed})</span>
                          ${isConnected ? `<span class="text-[8px] bg-cyan-950 border border-cyan-800 px-1 rounded text-cyan-300">UP</span>` : ''}
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
    </div>

    <!-- Active Port Assignments & Connections Table -->
    <div class="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <i data-lucide="list" class="w-4 h-4 text-emerald-400"></i>
          <span class="text-xs font-bold text-white uppercase tracking-wider">Connected Devices & Interconnects</span>
        </div>
        <span class="text-xs font-mono text-slate-400">${ports.filter(p => p.connectedDeviceId).length} Active Connections</span>
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
              <th class="p-2.5">PoE Delivery</th>
              <th class="p-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/60">
            ${ports.map(p => {
              const hasDev = !!p.connectedDeviceId;
              const targetDev = hasDev ? projectBOM.find(i => i.instanceId === p.connectedDeviceId) : null;
              const targetLoc = targetDev ? (targetDev.closetName || targetDev.rackId || 'Space') : (p.connectedLocation || 'Unassigned');
              const isPoE = (p.poeOutputWatts || 0) > 0;
              const isOptical = p.type === "optical" || p.type === "sfp" || p.type === "qsfp";

              return `
                <tr id="matrix-row-${p.portNumber}" class="hover:bg-slate-900/60 transition-colors ${hasDev ? '' : 'opacity-60'}">
                  <td class="p-2.5 font-bold ${isOptical ? 'text-cyan-400' : 'text-white'}">
                    ${p.shortLabel || `Port ${p.portNumber}`}
                  </td>
                  <td class="p-2.5 text-slate-400">
                    ${isOptical ? `Optical SFP+ (${p.speed})` : `10/100/1000 Base-T`}
                  </td>
                  <td class="p-2.5">
                    ${hasDev ? `
                      <span class="px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-800 text-emerald-400 font-bold text-[9px]">
                        LINK UP
                      </span>
                    ` : `
                      <span class="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-500 text-[9px]">
                        IDLE
                      </span>
                    `}
                  </td>
                  <td class="p-2.5">
                    ${hasDev ? `
                      <div class="font-bold text-white">${escapeHTML(targetDev ? targetDev.model : (p.connectedDeviceModel || p.connectedDeviceId))}</div>
                      <div class="text-[10px] text-slate-500">${escapeHTML(targetDev ? (targetDev.role || 'Field Device') : 'Uplink Peer')}</div>
                    ` : `
                      <span class="text-slate-600">Unconnected / Spare</span>
                    `}
                  </td>
                  <td class="p-2.5 text-slate-400">
                    ${hasDev ? escapeHTML(targetLoc) : '-'}
                  </td>
                  <td class="p-2.5">
                    ${isPoE ? `
                      <span class="text-amber-400 font-bold font-mono">${p.poeOutputWatts} W (802.3at)</span>
                    ` : (hasDev ? `<span class="text-slate-500">Data Only</span>` : '-')}
                  </td>
                  <td class="p-2.5 text-right">
                    ${hasDev ? `
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
                      </div>
                    ` : ''}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

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
  if (sw && typeof openRackViewerFor === "function") {
    openRackViewerFor(sw.closetName || sw.rackId);
  }
}

function jumpFromMatrixStudioToTopology() {
  if (!activePortMatrixSwitchId) return;
  closePortMatrixStudio();
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

// Window Compatibility Exports
window.openPortMatrixStudio = openPortMatrixStudio;
window.closePortMatrixStudio = closePortMatrixStudio;
window.renderPortMatrixStudioContent = renderPortMatrixStudioContent;
window.highlightMatrixPort = highlightMatrixPort;
window.jumpFromMatrixStudioToElevation = jumpFromMatrixStudioToElevation;
window.jumpFromMatrixStudioToTopology = jumpFromMatrixStudioToTopology;
