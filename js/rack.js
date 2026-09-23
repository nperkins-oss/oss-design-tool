// ==========================================
// RACK ELEVATION, THERMAL & COLLISION ENGINE
// ==========================================

let rackHeightsByRack = {}; // Map of "ClosetName • RackId" -> height number (12, 18, 24, 42, 48)
let activeViewingRackKey = null; // format: "ClosetName • RackId"
let draggedRackItemInstanceId = null;

function getCurrentRackHeight() {
  const key = activeViewingRackKey || "MDF • Rack-1";
  return rackHeightsByRack[key] || 24;
}

function setRackHeight(val) {
  const newHeight = parseInt(val) || 24;
  const key = activeViewingRackKey || "MDF • Rack-1";
  rackHeightsByRack[key] = newHeight;

  clampAndDownscaleSlots(key, newHeight);

  const badge = document.getElementById("rackUtilizationBadge");
  if (badge) {
    const usedU = getRackOccupiedUCount(key);
    badge.innerText = `${usedU} / ${newHeight} U Used`;
  }

  renderRackElevationGrid();
  renderRackAnalytics();
  if (typeof queueAutoSave === "function") queueAutoSave();
}

function clampAndDownscaleSlots(rackKey, maxHeight) {
  if (!rackKey) return;
  const [closet, rack] = rackKey.split(" • ");
  const rackItems = projectBOM.filter(i => 
    !i.parentInstanceId && 
    !i.isDinMounted && 
    (i.closetName || "MDF").trim() === closet && 
    (i.rackId || "Rack-1").trim() === rack
  );

  const outOfBounds = rackItems.filter(i => i.rackU && i.rackU > maxHeight);
  if (outOfBounds.length === 0) return;

  const occupiedSlots = new Set();
  rackItems.filter(i => i.rackU && i.rackU <= maxHeight).forEach(it => {
    const uSpan = it.rackUnitHeight || (it.qty || 1);
    for (let s = 0; s < uSpan; s++) {
      occupiedSlots.add(it.rackU + s);
    }
  });

  outOfBounds.forEach(item => {
    item.rackU = null;
    const uSpan = item.rackUnitHeight || (item.qty || 1);
    for (let s = 1; s <= (maxHeight - uSpan + 1); s++) {
      let canFit = true;
      for (let span = 0; span < uSpan; span++) {
        if (occupiedSlots.has(s + span)) {
          canFit = false;
          break;
        }
      }
      if (canFit) {
        item.rackU = s;
        for (let span = 0; span < uSpan; span++) {
          occupiedSlots.add(s + span);
        }
        break;
      }
    }
  });

  showToast(`Adjusted rack height to ${maxHeight}U for ${rackKey}.`);
}

function setActiveViewingRack(rackKey) {
  activeViewingRackKey = rackKey;
  renderRackVisualizer();
}

function getRackKeysInProject() {
  const rackKeys = new Set();
  projectBOM.filter(i => !i.parentInstanceId && !i.isDinMounted).forEach(item => {
    const cName = (item.closetName || "MDF").trim();
    const rName = (item.rackId || "Rack-1").trim();
    rackKeys.add(`${cName} • ${rName}`);
  });

  try {
    const customRacks = JSON.parse(localStorage.getItem("netselect_custom_racks") || "[]");
    customRacks.forEach(rk => rackKeys.add(rk));
  } catch(e) {}

  return Array.from(rackKeys);
}

function getRackOccupiedUCount(rackKey) {
  if (!rackKey) return 0;
  const [closet, rack] = rackKey.split(" • ");
  const items = projectBOM.filter(i => 
    !i.parentInstanceId && 
    !i.isDinMounted && 
    (i.closetName || "MDF").trim() === closet && 
    (i.rackId || "Rack-1").trim() === rack
  );

  let totalU = 0;
  items.forEach(it => {
    if (it.rackU) {
      const uSpan = it.rackUnitHeight || (it.qty || 1);
      totalU += uSpan;
    }
  });
  return totalU;
}

// ==========================================
// TOP-TO-BOTTOM HIERARCHICAL AUTO-POPULATE
// ==========================================
function autoPopulateRackSlots() {
  if (!activeViewingRackKey) return;
  const [closet, rack] = activeViewingRackKey.split(" • ");
  const items = projectBOM.filter(i => 
    !i.parentInstanceId && 
    !i.isDinMounted && 
    (i.closetName || "MDF").trim() === closet && 
    (i.rackId || "Rack-1").trim() === rack
  );

  if (items.length === 0) {
    showToast("No equipment assigned to this cabinet to slot.");
    return;
  }

  items.sort((a, b) => {
    const roleRank = {
      "Security WAN": 1,
      "Core": 2,
      "Aggregation": 3,
      "Access": 4
    };

    const rankA = roleRank[a.role] || 5;
    const rankB = roleRank[b.role] || 5;

    if (rankA !== rankB) return rankA - rankB;
    return (b.ports || 0) - (a.ports || 0);
  });

  const rackHeight = getCurrentRackHeight();
  let currentTopU = rackHeight;
  items.forEach(it => {
    const uSpan = it.rackUnitHeight || (it.qty || 1);
    const targetBaseU = currentTopU - uSpan + 1;

    if (targetBaseU >= 1) {
      it.rackU = targetBaseU;
      currentTopU = targetBaseU - 1;
    } else {
      it.rackU = null;
    }
  });

  renderRackElevationGrid();
  renderRackAnalytics();
  if (typeof queueAutoSave === "function") queueAutoSave();
  showToast("Auto-populated top-down: Gateway > Core > Agg > Access.");
}

function unrackAllItems() {
  if (!activeViewingRackKey) return;
  const [closet, rack] = activeViewingRackKey.split(" • ");
  projectBOM.filter(i => 
    !i.parentInstanceId && 
    !i.isDinMounted && 
    (i.closetName || "MDF").trim() === closet && 
    (i.rackId || "Rack-1").trim() === rack
  ).forEach(it => {
    it.rackU = null;
  });

  renderRackElevationGrid();
  renderRackAnalytics();
  if (typeof queueAutoSave === "function") queueAutoSave();
  showToast("Unslotted all items from this rack.");
}

function promptCreateNewRack() {
  const closetName = prompt("Enter Room / Location Name (e.g., IDF-2, Guard Shack, Server Room):", "IDF-2");
  if (!closetName || !closetName.trim()) return;

  const rackId = prompt("Enter Cabinet Identifier (e.g., Rack-1, Wall-Box, 2-Post):", "Rack-1");
  if (!rackId || !rackId.trim()) return;

  const newKey = `${closetName.trim()} • ${rackId.trim()}`;

  try {
    const customRacks = JSON.parse(localStorage.getItem("netselect_custom_racks") || "[]");
    if (!customRacks.includes(newKey)) {
      customRacks.push(newKey);
      localStorage.setItem("netselect_custom_racks", JSON.stringify(customRacks));
    }
  } catch(e) {}

  activeViewingRackKey = newKey;
  if (!rackHeightsByRack[newKey]) {
    rackHeightsByRack[newKey] = 24;
  }
  renderRackVisualizer();
  if (typeof updateBOMView === "function") updateBOMView();
  showToast(`Created new cabinet: ${newKey}`);
}

function toggleRackModal() {
  const modal = document.getElementById("rackModal");
  if (!modal) return;

  if (modal.classList.contains("hidden")) {
    modal.classList.remove("hidden");
    renderRackVisualizer();
  } else {
    modal.classList.add("hidden");
  }
}

function renderRackVisualizer() {
  const availableRacks = getRackKeysInProject();

  if (!activeViewingRackKey || (!availableRacks.includes(activeViewingRackKey) && availableRacks.length > 0)) {
    activeViewingRackKey = availableRacks[0] || "MDF • Rack-1";
  }

  const [closet, rack] = (activeViewingRackKey || "MDF • Rack-1").split(" • ");
  const unslotted = projectBOM.filter(i => 
    !i.parentInstanceId && 
    !i.isDinMounted && 
    (i.closetName || "MDF").trim() === closet && 
    (i.rackId || "Rack-1").trim() === rack && 
    !i.rackU
  );

  if (unslotted.length > 0) {
    autoPopulateRackSlots();
  }

  renderRackToolbar(availableRacks);
  renderRackElevationGrid();
  renderRackAnalytics();
  renderRackDinList();

  if (window.lucide) {
    try { lucide.createIcons(); } catch(e) {}
  }
}

function renderRackToolbar(availableRacks) {
  const heightSelector = document.getElementById("rackHeightSelector");
  if (!heightSelector) return;
  const headerContainer = heightSelector.parentElement;
  if (!headerContainer) return;

  // Sync the height dropdown with THIS specific rack's saved height
  const currentHeight = getCurrentRackHeight();
  heightSelector.value = currentHeight.toString();

  let toolbarEl = document.getElementById("rackLocationPicker");
  if (!toolbarEl) {
    toolbarEl = document.createElement("div");
    toolbarEl.id = "rackLocationPicker";
    toolbarEl.className = "flex flex-wrap items-center gap-2";
    headerContainer.parentElement.insertBefore(toolbarEl, headerContainer);
  }

  toolbarEl.innerHTML = `
    <div class="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl text-xs">
      <span class="text-slate-400 font-medium">Cabinet:</span>
      <select onchange="setActiveViewingRack(this.value)" class="bg-slate-900 border border-slate-700 text-white font-bold rounded px-2 py-0.5 focus:outline-none focus:border-indigo-500">
        ${availableRacks.length === 0 ? '<option value="MDF • Rack-1">MDF • Rack-1 (Empty)</option>' : ''}
        ${availableRacks.map(rk => `
          <option value="${rk}" ${rk === activeViewingRackKey ? 'selected' : ''}>${rk}</option>
        `).join('')}
      </select>
      <button onclick="promptCreateNewRack()" class="ml-1 px-2 py-0.5 bg-brand-600 hover:bg-brand-500 text-white rounded font-bold text-[11px] shadow flex items-center gap-1" title="Create new Room/Rack location">
        <i data-lucide="plus" class="w-3 h-3"></i> Add Rack
      </button>
    </div>
    <div class="flex items-center gap-1 bg-slate-950 border border-slate-800 p-1 rounded-xl">
      <button onclick="autoPopulateRackSlots()" class="px-2.5 py-1 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all" title="Auto-place top-down: Gateway > Core > Agg > Access">
        <i data-lucide="arrow-down-narrow-wide" class="w-3.5 h-3.5"></i> Auto-Populate (Top-Down)
      </button>
      <button onclick="unrackAllItems()" class="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-300 rounded-lg text-xs font-medium transition-all" title="Remove all units from slots">
        <i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i> Unrack All
      </button>
    </div>
  `;
}

function renderRackElevationGrid() {
  const frame = document.getElementById("rackElevationFrame");
  const badge = document.getElementById("rackUtilizationBadge");
  if (!frame) return;

  const [closet, rack] = (activeViewingRackKey || "MDF • Rack-1").split(" • ");
  const rackItems = projectBOM.filter(i => 
    !i.parentInstanceId && 
    !i.isDinMounted && 
    (i.closetName || "MDF").trim() === closet && 
    (i.rackId || "Rack-1").trim() === rack
  );

  const rackHeight = getCurrentRackHeight();
  const usedU = getRackOccupiedUCount(activeViewingRackKey);
  if (badge) badge.innerText = `${usedU} / ${rackHeight} U Used`;

  const slotMap = {};
  rackItems.forEach(item => {
    if (item.rackU) {
      const uSpan = item.rackUnitHeight || (item.qty || 1);
      for (let s = 0; s < uSpan; s++) {
        slotMap[item.rackU + s] = {
          item: item,
          unitIndex: s + 1,
          totalUnits: uSpan,
          isBase: s === 0
        };
      }
    }
  });

  let html = "";
  for (let u = rackHeight; u >= 1; u--) {
    const slot = slotMap[u];

    if (slot) {
      const { item, unitIndex, totalUnits } = slot;
      const isStacked = item.stackedUnits >= 2;
      const label = totalUnits > 1 ? `${item.model} (Unit ${unitIndex}/${totalUnits})` : item.model;

      let borderTheme = "border-indigo-500/60";
      if (item.role === "Security WAN") borderTheme = "border-rose-500/70";
      else if (item.role === "Core") borderTheme = "border-purple-500/70";
      else if (item.role === "Aggregation") borderTheme = "border-cyan-500/70";

      html += `
        <div class="h-10 bg-slate-900 border-2 ${borderTheme} rounded-lg flex items-center justify-between px-3 text-xs shadow-md group relative"
             draggable="true" 
             ondragstart="handleRackDragStart(event, '${item.instanceId}')"
             ondragover="handleRackDragOver(event)"
             ondrop="handleRackDrop(event, ${u})">
          <div class="flex items-center gap-2 min-w-0">
            <span class="font-mono text-[10px] font-bold text-indigo-400 bg-slate-950 px-1.5 py-0.5 rounded border border-indigo-500/30">U${u}</span>
            <span class="font-bold text-white truncate text-[11px]">${label}</span>
            ${isStacked ? `<span class="badge-chip border border-indigo-500/40 bg-indigo-500/20 text-indigo-300 text-[9px]">${item.stackedUnits}x Stack</span>` : ''}
          </div>
          <div class="flex items-center gap-3 shrink-0">
            <span class="text-[10px] font-mono text-slate-400">${item.depthInches || 12}"</span>
            <span class="text-[10px] font-mono text-amber-300 font-semibold">${Math.round(((item.poeBudget || 0) + (item.baseWatts || 0)) / totalUnits)}W</span>
            <button onclick="unslotRackItem('${item.instanceId}')" class="text-slate-500 hover:text-rose-400 p-0.5" title="Unseat unit">
              <i data-lucide="x" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </div>
      `;
    } else {
      html += `
        <div class="h-8 border border-dashed border-slate-800/80 rounded-lg flex items-center justify-between px-3 text-[10px] text-slate-600 hover:border-slate-700 transition-colors"
             ondragover="handleRackDragOver(event)"
             ondrop="handleRackDrop(event, ${u})">
          <span class="font-mono font-semibold">U${u}</span>
          <span class="text-[9px] uppercase tracking-wider text-slate-700">Empty Slot</span>
        </div>
      `;
    }
  }

  frame.innerHTML = html;
}

function handleRackDragStart(e, instanceId) {
  draggedRackItemInstanceId = instanceId;
  e.dataTransfer.effectAllowed = "move";
}

function handleRackDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
}

function handleRackDrop(e, targetU) {
  e.preventDefault();
  if (!draggedRackItemInstanceId) return;

  const item = projectBOM.find(i => i.instanceId === draggedRackItemInstanceId);
  if (!item) return;

  const rackHeight = getCurrentRackHeight();
  const uSpan = item.rackUnitHeight || (item.qty || 1);
  if (targetU + uSpan - 1 > rackHeight) {
    showToast(`Device requires ${uSpan}U and will exceed top of rack.`);
    return;
  }

  const [closet, rack] = (activeViewingRackKey || "MDF • Rack-1").split(" • ");
  const occupant = projectBOM.find(i => 
    !i.parentInstanceId && 
    (i.closetName || "MDF").trim() === closet && 
    (i.rackId || "Rack-1").trim() === rack && 
    i.rackU === targetU && 
    i.instanceId !== item.instanceId
  );

  if (occupant) {
    occupant.rackU = item.rackU;
  }

  item.rackU = targetU;
  draggedRackItemInstanceId = null;

  renderRackElevationGrid();
  renderRackAnalytics();
  if (typeof queueAutoSave === "function") queueAutoSave();
}

function unslotRackItem(instanceId) {
  const item = projectBOM.find(i => i.instanceId === instanceId);
  if (item) {
    item.rackU = null;
    renderRackElevationGrid();
    renderRackAnalytics();
    if (typeof queueAutoSave === "function") queueAutoSave();
  }
}

function renderRackAnalytics() {
  const [closet, rack] = (activeViewingRackKey || "MDF • Rack-1").split(" • ");
  const items = projectBOM.filter(i => 
    !i.parentInstanceId && 
    !i.isDinMounted && 
    (i.closetName || "MDF").trim() === closet && 
    (i.rackId || "Rack-1").trim() === rack
  );

  let totalPoE = 0;
  let totalBaseWatts = 0;

  items.forEach(it => {
    totalPoE += (it.poeBudget || 0) * (it.qty || 1);
    totalBaseWatts += (it.baseWatts || 0) * (it.qty || 1);
  });

  const worstCaseLoad = totalPoE + totalBaseWatts;
  const btu = Math.round(worstCaseLoad * 3.412142);

  const poeEl = document.getElementById("rackTotalPoE");
  const baseEl = document.getElementById("rackTotalBaseWatts");
  const worstEl = document.getElementById("rackTotalWorstCase");
  const btuEl = document.getElementById("rackTotalBTU");
  const upsAdvisor = document.getElementById("rackUpsAdvisor");

  if (poeEl) poeEl.innerText = `${totalPoE.toLocaleString()} W`;
  if (baseEl) baseEl.innerText = `${totalBaseWatts.toLocaleString()} W`;
  if (worstEl) worstEl.innerText = `${worstCaseLoad.toLocaleString()} W`;
  if (btuEl) btuEl.innerText = `${btu.toLocaleString()} BTU/hr`;

  if (upsAdvisor) {
    if (worstCaseLoad === 0) {
      upsAdvisor.innerHTML = `<span class="text-slate-500">No active electrical load in this rack.</span>`;
    } else {
      const minVa = Math.ceil((worstCaseLoad * 1.25) / 100) * 100;
      const recModel = minVa > 2200 ? "3000VA 2U Online Double-Conversion (L5-30P)" : (minVa > 1400 ? "2200VA 2U Line-Interactive" : "1500VA 2U Line-Interactive (5-15P)");
      upsAdvisor.innerHTML = `
        <div class="flex items-center justify-between text-white font-bold">
          <span>Minimum UPS VA:</span>
          <span class="font-mono text-emerald-400">${minVa} VA</span>
        </div>
        <div class="text-[11px] text-slate-400">Recommendation: <strong class="text-indigo-300">${recModel}</strong></div>
      `;
    }
  }
}

function renderRackDinList() {
  const container = document.getElementById("rackDinList");
  if (!container) return;

  const dinItems = projectBOM.filter(i => !i.parentInstanceId && i.isDinMounted);

  if (dinItems.length === 0) {
    container.innerHTML = `<span class="text-slate-500 text-[11px]">No DIN or pole-mount equipment in quote.</span>`;
    return;
  }

  container.innerHTML = dinItems.map(d => `
    <div class="bg-slate-950 p-2 rounded-lg border border-slate-800/80 flex items-center justify-between text-xs">
      <div>
        <span class="font-bold text-white text-[11px] block">${d.model}</span>
        <span class="text-[10px] text-slate-400 font-mono">${d.closetName || 'Pole'} &bull; ${d.rackId || 'NEMA-Box'}</span>
      </div>
      <span class="text-[10px] font-mono text-amber-400 font-bold">${d.baseWatts || 15}W</span>
    </div>
  `).join("");
}