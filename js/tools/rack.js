// =========================================================================
// RACK ELEVATION & POWER SIZING VISUALIZER (NetSelect Enterprise)
// Integrated with FacilityStore & Interactive Unassigned Staging Area
// =========================================================================

let activeRackId = "MDF • Rack-1";
let activeRackHeight = 24;
let draggedRackItemInstanceId = null;

function isRackModalVisible() {
  const modal = document.getElementById("rackModal");
  return modal && !modal.classList.contains("hidden");
}

function toggleRackModal() {
  const modal = document.getElementById("rackModal");
  if (!modal) return;

  if (modal.classList.contains("hidden")) {
    modal.classList.remove("hidden");
    syncRackSelectorOptions();
    loadRackSettings();
    renderRackVisualizer();
    if (window.lucide) lucide.createIcons();
  } else {
    modal.classList.add("hidden");
    draggedRackItemInstanceId = null;
  }
}

// -----------------------------------------------------------
// Rack Selector & Location Sync
// -----------------------------------------------------------
function syncRackSelectorOptions() {
  const sel = document.getElementById("rackLocationSelector");
  const racks = FacilityStore.getLocationNames(false); // Racks only (excludes Unassigned)

  activeRackId = FacilityStore.normalize(activeRackId);
  if (activeRackId === FacilityStore.UNASSIGNED || !racks.includes(activeRackId)) {
    activeRackId = racks[0] || "MDF • Rack-1";
  }

  if (sel) {
    sel.innerHTML = racks.map(r => `
      <option value="${r}" ${r === activeRackId ? 'selected' : ''}>${r}</option>
    `).join('');
  }

  const heightSel = document.getElementById("rackHeightSelector");
  if (heightSel) heightSel.value = activeRackHeight.toString();
}

function switchActiveRackElevation(rackName) {
  activeRackId = FacilityStore.normalize(rackName);
  loadRackSettings();
  syncRackSelectorOptions();
  renderRackVisualizer();
}

function setRackHeight(heightVal) {
  activeRackHeight = parseInt(heightVal) || 24;
  saveRackSettings();
  renderRackVisualizer();
  if (typeof showToast === "function") {
    showToast(`Set ${activeRackId} height to ${activeRackHeight}U`);
  }
}

function promptCreateNewRack() {
  const name = prompt("Enter new Location & Enclosure (e.g., IDF-2 • Rack-1):", `IDF-${FacilityStore.getLocations().length} • Rack-1`);
  if (!name || !name.trim()) return;

  const createdName = FacilityStore.addLocation(name);
  activeRackId = createdName;
  syncRackSelectorOptions();
  renderRackVisualizer();
  if (typeof showToast === "function") {
    showToast(`Created ${createdName}`);
  }
}

function deleteActiveRackElevation() {
  const racks = FacilityStore.getLocationNames(false);
  if (racks.length <= 1) {
    alert("You must retain at least one cabinet / closet in the project.");
    return;
  }

  const fallbackRack = racks.find(r => r !== activeRackId) || "MDF • Rack-1";

  if (!confirm(`Delete "${activeRackId}"? All assigned equipment will be moved to "${fallbackRack}".`)) {
    return;
  }

  const success = FacilityStore.deleteLocation(activeRackId, fallbackRack);
  if (success) {
    activeRackId = fallbackRack;
    syncRackSelectorOptions();
    renderRackVisualizer();
    if (typeof showToast === "function") {
      showToast(`Cabinet removed. Hardware moved to ${fallbackRack}.`);
    }
  }
}

// -----------------------------------------------------------
// Auto-Mount & Unmount Actions
// -----------------------------------------------------------
function autoMountAllToActiveRack() {
  if (typeof projectBOM === "undefined") return;

  // Grab both items assigned to this rack AND unassigned items
  const mountableItems = projectBOM.filter(item => {
    if (item.parentInstanceId) return false;
    if (item.role === "Optics & DAC" || item.role === "Mgmt License" || item.role === "Security License") return false;
    const isField = item.isDinMounted || (item.model && item.model.includes("DIN")) || item.role === "Wireless Bridge" || item.role === "Accessory";
    if (isField) return false;

    const itemLoc = FacilityStore.normalize(item.closetName || item.rackId);
    return itemLoc === activeRackId || itemLoc === FacilityStore.UNASSIGNED;
  });

  const slots = {};
  for (let u = 1; u <= activeRackHeight; u++) slots[u] = null;

  // Clear slots for items we are mounting
  mountableItems.forEach(i => i.rackSlot = null);

  let mountedCount = 0;
  mountableItems.forEach(item => {
    const itemHeight = parseInt(item.rackUnits || 1);
    const slot = findNextAvailableSlot(slots, itemHeight, activeRackHeight);
    if (slot) {
      item.rackSlot = slot;
      item.closetName = activeRackId;
      item.rackId = activeRackId;
      for (let offset = 0; offset < itemHeight; offset++) {
        slots[slot + offset] = item.instanceId;
      }
      mountedCount++;
    }
  });

  FacilityStore.notifyWorkspaceChange();
  renderRackVisualizer();
  if (typeof showToast === "function") {
    showToast(`Auto-mounted ${mountedCount} unit${mountedCount === 1 ? '' : 's'} into ${activeRackId}.`);
  }
}

function unmountAllFromActiveRack() {
  if (typeof projectBOM === "undefined") return;

  let clearedCount = 0;
  projectBOM.forEach(item => {
    const itemLoc = FacilityStore.normalize(item.closetName || item.rackId);
    if (itemLoc === activeRackId && item.rackSlot) {
      item.rackSlot = null;
      item.closetName = FacilityStore.UNASSIGNED;
      item.rackId = FacilityStore.UNASSIGNED;
      clearedCount++;
    }
  });

  FacilityStore.notifyWorkspaceChange();
  renderRackVisualizer();
  if (typeof showToast === "function") {
    showToast(`Unmounted ${clearedCount} unit${clearedCount === 1 ? '' : 's'} to Unassigned Staging.`);
  }
}

// -----------------------------------------------------------
// 19" Equipment Rail & Unassigned Staging Renderer
// -----------------------------------------------------------
function renderRackVisualizer() {
  const frame = document.getElementById("rackElevationFrame");
  if (!frame) return;

  syncRackSelectorOptions();

  const rackItems = [];
  const fieldItems = [];
  const unassignedItems = [];

  if (typeof projectBOM !== "undefined") {
    projectBOM.forEach(item => {
      if (item.parentInstanceId) return;
      if (item.role === "Optics & DAC" || item.role === "Mgmt License" || item.role === "Security License") return;

      const rawLoc = item.closetName || item.rackId;
      const itemLoc = FacilityStore.normalize(rawLoc);

      const isField = item.isDinMounted || (item.model && item.model.includes("DIN")) || item.role === "Wireless Bridge" || item.role === "Accessory";

      if (itemLoc === FacilityStore.UNASSIGNED) {
        unassignedItems.push(item);
      } else if (itemLoc === activeRackId) {
        if (isField) {
          fieldItems.push(item);
        } else {
          rackItems.push(item);
        }
      }
    });
  }

  // Occupancy map for 1U to activeRackHeight
  const slots = {};
  for (let u = 1; u <= activeRackHeight; u++) {
    slots[u] = null;
  }

  // Position items that have assigned slots
  rackItems.forEach(item => {
    const itemHeight = parseInt(item.rackUnits || 1);
    let assignedU = parseInt(item.rackSlot);

    if (assignedU && assignedU >= 1 && (assignedU + itemHeight - 1) <= activeRackHeight) {
      if (!isCollision(slots, assignedU, itemHeight, item.instanceId)) {
        for (let offset = 0; offset < itemHeight; offset++) {
          slots[assignedU + offset] = {
            item: item,
            isBase: offset === 0,
            span: itemHeight
          };
        }
      }
    }
  });

  // Render 19" Equipment Rail Slots (Descending from Top U down to 1U)
  let railHTML = "";

  for (let u = activeRackHeight; u >= 1; u--) {
    const slotData = slots[u];

    if (slotData) {
      if (slotData.isBase) {
        const it = slotData.item;
        railHTML += `
          <div 
            class="group relative bg-slate-900 border border-indigo-500/60 hover:border-indigo-400 rounded-lg px-3 py-2 flex items-center justify-between cursor-move shadow-md transition-all select-none"
            draggable="true"
            ondragstart="handleRackItemDragStart(event, '${it.instanceId}')"
            ondragover="handleRackSlotDragOver(event)"
            ondrop="handleRackSlotDrop(event, ${u})"
            style="min-height: ${Math.max(40, slotData.span * 42)}px;"
          >
            <div class="flex items-center gap-3 min-w-0">
              <span class="text-[11px] font-mono font-bold text-indigo-400 w-7 shrink-0">U${u}</span>
              <div class="min-w-0">
                <span class="text-xs font-bold text-white block truncate">${it.model}</span>
                <span class="text-[10px] text-slate-400 font-mono block truncate">${it.vendor || 'Generic'} &bull; ${slotData.span}U &bull; ${it.baseWatts || 0}W Base</span>
              </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <span class="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 ${getRoleColor(it.role)}">${it.role}</span>
              <button onclick="unmountRackItem('${it.instanceId}')" class="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-amber-300 transition-opacity" title="Unmount to Staging">
                <i data-lucide="inbox" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </div>
        `;
      }
    } else {
      railHTML += `
        <div 
          class="h-8 border border-dashed border-slate-800/80 hover:border-indigo-500/50 hover:bg-indigo-950/10 rounded-lg px-3 flex items-center justify-between transition-colors select-none"
          ondragover="handleRackSlotDragOver(event)"
          ondrop="handleRackSlotDrop(event, ${u})"
        >
          <span class="text-[10px] font-mono text-slate-600 font-bold">U${u}</span>
          <span class="text-[9px] font-mono text-slate-700 uppercase tracking-wider">Empty Slot</span>
        </div>
      `;
    }
  }

  // Append Interactive Unassigned Staging Tray at the bottom of the rack rail column
  railHTML += `
    <div class="pt-3 mt-3 border-t border-slate-800">
      <div class="flex items-center justify-between mb-2">
        <span class="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
          <i data-lucide="inbox" class="w-3.5 h-3.5"></i> Unassigned Staging Area (${unassignedItems.length})
        </span>
        <span class="text-[9px] text-slate-500 font-mono">Drag into empty U-slot above</span>
      </div>
      <div class="space-y-1.5 max-h-36 overflow-y-auto pr-1">
        ${unassignedItems.length === 0 ? `
          <div class="p-2.5 rounded-lg border border-dashed border-slate-800 text-center text-[10px] text-slate-500">
            No unassigned items. All hardware is currently mounted or mapped.
          </div>
        ` : unassignedItems.map(it => `
          <div 
            class="bg-slate-900/90 border border-amber-500/40 hover:border-amber-400 p-2 rounded-lg flex items-center justify-between cursor-move shadow-sm select-none"
            draggable="true"
            ondragstart="handleRackItemDragStart(event, '${it.instanceId}')"
          >
            <div class="min-w-0 flex items-center gap-2">
              <span class="text-[10px] font-mono font-bold text-amber-400 bg-amber-950/40 px-1 py-0.5 rounded border border-amber-800/60">${it.rackUnits || 1}U</span>
              <span class="text-xs font-bold text-slate-200 truncate block">${it.model}</span>
            </div>
            <span class="text-[10px] font-mono text-slate-400 shrink-0">${it.vendor}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  frame.innerHTML = railHTML;

  renderRackTelemetry(rackItems, activeRackHeight);
  renderFieldDevices(fieldItems);

  if (window.lucide) lucide.createIcons();
}

function findNextAvailableSlot(slots, heightU, maxU) {
  for (let u = 1; u <= maxU - heightU + 1; u++) {
    let available = true;
    for (let offset = 0; offset < heightU; offset++) {
      if (slots[u + offset] !== null) {
        available = false;
        break;
      }
    }
    if (available) return u;
  }
  return null;
}

function isCollision(slots, startU, heightU, ignoreInstanceId) {
  for (let offset = 0; offset < heightU; offset++) {
    const slot = slots[startU + offset];
    if (slot && slot.item.instanceId !== ignoreInstanceId) {
      return true;
    }
  }
  return false;
}

function getRoleColor(role) {
  switch (role) {
    case "Core":
    case "Core & Agg":
    case "Aggregation":
      return "text-purple-400";
    case "Access":
      return "text-emerald-400";
    case "Structured Cabling":
      return "text-amber-300";
    case "Gateways & WAN":
    case "Security WAN":
      return "text-rose-400";
    default:
      return "text-slate-300";
  }
}

// -----------------------------------------------------------
// Drag & Drop
// -----------------------------------------------------------
function handleRackItemDragStart(e, instanceId) {
  draggedRackItemInstanceId = instanceId;
  e.dataTransfer.setData("text/plain", instanceId);
  e.dataTransfer.effectAllowed = "move";
}

function handleRackSlotDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
}

function handleRackSlotDrop(e, targetU) {
  e.preventDefault();
  const instanceId = draggedRackItemInstanceId || e.dataTransfer.getData("text/plain");
  if (!instanceId || typeof projectBOM === "undefined") return;

  const item = projectBOM.find(i => i.instanceId === instanceId);
  if (!item) return;

  const itemHeight = parseInt(item.rackUnits || 1);
  if ((targetU + itemHeight - 1) > activeRackHeight) {
    if (typeof showToast === "function") {
      showToast(`Cannot place ${itemHeight}U device at U${targetU}: exceeds cabinet top.`);
    }
    return;
  }

  // Assign to active rack and slot
  item.rackSlot = targetU;
  item.closetName = activeRackId;
  item.rackId = activeRackId;

  FacilityStore.notifyWorkspaceChange();
  renderRackVisualizer();
  if (typeof showToast === "function") {
    showToast(`Mounted ${item.model} into ${activeRackId} at U${targetU}`);
  }
  draggedRackItemInstanceId = null;
}

function unmountRackItem(instanceId) {
  if (typeof projectBOM === "undefined") return;
  const item = projectBOM.find(i => i.instanceId === instanceId);
  if (item) {
    item.rackSlot = null;
    item.closetName = FacilityStore.UNASSIGNED;
    item.rackId = FacilityStore.UNASSIGNED;
    FacilityStore.notifyWorkspaceChange();
    renderRackVisualizer();
    if (typeof showToast === "function") {
      showToast(`Unmounted ${item.model} to Unassigned Staging.`);
    }
  }
}

// -----------------------------------------------------------
// Telemetry & Field Devices
// -----------------------------------------------------------
// Telemetry & Field Devices
// -----------------------------------------------------------
function renderRackTelemetry(rackItems, totalU) {
  // If auditSwitchCapacities is available, synchronize active connected PoE load
  if (typeof auditSwitchCapacities === "function" && typeof projectBOM !== "undefined") {
    const audits = auditSwitchCapacities();
    rackItems.forEach(it => {
      if (audits[it.instanceId]) {
        it.consumedPoEWatts = audits[it.instanceId].consumedPoEWatts || 0;
      }
    });
  }

  let telemetry;
  if (typeof NetworkSizer !== "undefined" && typeof NetworkSizer.calculateRackElectricalAndThermal === "function") {
    telemetry = NetworkSizer.calculateRackElectricalAndThermal(rackItems, {
      nominalVoltage: 120,
      growthMargin: 0.25
    });
  } else {
    // Fallback calculation
    let occupiedU = 0, totalPoE = 0, totalBaseWatts = 0;
    rackItems.forEach(it => {
      if (it.rackSlot) occupiedU += parseInt(it.rackUnits || 1, 10);
      totalPoE += parseFloat(it.poeBudget || 0);
      totalBaseWatts += parseFloat(it.baseWatts || 0);
    });
    const worstCaseWatts = Math.round(totalBaseWatts + totalPoE);
    telemetry = {
      occupiedU,
      chassisBaseWatts: Math.round(totalBaseWatts),
      nameplatePoEWatts: Math.round(totalPoE),
      operatingAcWatts: Math.round(totalBaseWatts + (totalPoE * 0.5)),
      worstCaseAcWatts: worstCaseWatts,
      worstCaseBTU: Math.round(worstCaseWatts * 3.412142),
      tonsCooling: Math.round((worstCaseWatts * 3.412142 / 12000) * 10) / 10,
      electrical: {
        operatingAmps120V: Math.round(((totalBaseWatts + (totalPoE * 0.5)) / (120 * 0.92)) * 10) / 10,
        worstCaseAmps120V: Math.round((worstCaseWatts / (120 * 0.92)) * 10) / 10,
        recommendedCircuit: worstCaseWatts > 1440 ? "120V 20A Dedicated Circuit (NEMA 5-20R)" : "120V 15A Dedicated Circuit (NEMA 5-15R)"
      },
      ups: {
        minVA: Math.round(worstCaseWatts / 0.90),
        recommendedVA: Math.round((worstCaseWatts / 0.90) * 1.25),
        recommendation: worstCaseWatts > 1200 ? "2200VA 2U Line-Interactive" : "1500VA 2U Line-Interactive",
        formFactor: "2U Rackmount",
        batteryRuntimeEstimate: "12 - 18 minutes on battery"
      }
    };
  }

  const badgeEl = document.getElementById("rackUtilizationBadge");
  const poeEl = document.getElementById("rackTotalPoE");
  const baseEl = document.getElementById("rackTotalBaseWatts");
  const operatingEl = document.getElementById("rackOperatingWatts");
  const worstEl = document.getElementById("rackTotalWorstCase");
  const btuEl = document.getElementById("rackTotalBTU");
  const circuitEl = document.getElementById("rackCircuitSpec");
  const upsEl = document.getElementById("rackUpsAdvisor");

  if (badgeEl) badgeEl.innerText = `${telemetry.occupiedU} / ${totalU} U Used`;
  if (baseEl) baseEl.innerText = `${telemetry.chassisBaseWatts} W`;
  if (poeEl) poeEl.innerText = `${telemetry.nameplatePoEWatts.toLocaleString()} W`;
  if (operatingEl) operatingEl.innerText = `${telemetry.operatingAcWatts} W (${telemetry.electrical.operatingAmps120V} A @ 120V)`;
  if (worstEl) worstEl.innerText = `${telemetry.worstCaseAcWatts.toLocaleString()} W (${telemetry.electrical.worstCaseAmps120V} A)`;
  if (btuEl) btuEl.innerText = `${telemetry.worstCaseBTU.toLocaleString()} BTU/hr (${telemetry.tonsCooling} Tons AC)`;
  if (circuitEl) circuitEl.innerText = telemetry.electrical.recommendedCircuit;

  if (upsEl) {
    upsEl.innerHTML = `
      <div class="space-y-1">
        <div class="font-bold text-emerald-400 flex items-center justify-between">
          <span class="truncate max-w-[240px]">${telemetry.ups.recommendation}</span>
          <span class="font-mono text-[11px] text-emerald-300 font-bold shrink-0">${telemetry.ups.recommendedVA} VA</span>
        </div>
        <div class="text-[11px] text-slate-400">
          Minimum ${telemetry.ups.minVA}VA load + 25% buffer &bull; ${telemetry.ups.formFactor}
        </div>
        <div class="text-[10px] text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
          <i data-lucide="clock" class="w-3 h-3 text-slate-400 shrink-0"></i>
          <span>${telemetry.ups.batteryRuntimeEstimate}</span>
        </div>
      </div>
    `;
    if (typeof safeCreateIcons === "function") {
      safeCreateIcons(upsEl);
    } else if (window.lucide) {
      lucide.createIcons();
    }
  }
}

function renderFieldDevices(fieldItems) {
  const container = document.getElementById("rackDinList");
  if (!container) return;

  if (fieldItems.length === 0) {
    container.innerHTML = `<span class="text-slate-500 text-[11px] block py-1">No field or DIN-rail hardware in ${activeRackId}.</span>`;
    return;
  }

  container.innerHTML = fieldItems.map(it => `
    <div class="bg-slate-950 p-2 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
      <div>
        <span class="font-bold text-white block truncate max-w-[200px]">${it.model}</span>
        <span class="text-[10px] text-amber-400 font-mono">${it.closetName || 'Field'} &bull; ${it.isDinMounted || (it.model && it.model.includes('DIN')) ? 'DIN-Rail Mount' : 'Exterior Pole'}</span>
      </div>
      <span class="font-mono text-[11px] text-slate-400 font-bold">${it.qty || 1}x</span>
    </div>
  `).join('');
}

// -----------------------------------------------------------
// Persistence
// -----------------------------------------------------------
function saveRackSettings() {
  try {
    const projKey = FacilityStore.getProjectId();
    localStorage.setItem(`netselect_rack_height_${projKey}_${activeRackId}`, activeRackHeight.toString());
  } catch (e) {}
}

function loadRackSettings() {
  try {
    const projKey = FacilityStore.getProjectId();
    const val = localStorage.getItem(`netselect_rack_height_${projKey}_${activeRackId}`);
    activeRackHeight = val ? parseInt(val) : 24;
  } catch (e) {
    activeRackHeight = 24;
  }
}