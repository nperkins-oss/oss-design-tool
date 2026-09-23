// ==========================================
// RACK ELEVATION, POWER & THERMAL ENGINE
// ==========================================

let currentRackHeight = 24;

function toggleRackModal() {
  const modal = document.getElementById("rackModal");
  if (!modal) return;

  if (modal.classList.contains("hidden")) {
    modal.classList.remove("hidden");
    populateRackSelectors();
    renderRackVisualizer();
  } else {
    modal.classList.add("hidden");
  }
}

function populateRackSelectors() {
  const closetSelect = document.getElementById("rackClosetSelector");
  const rackSelect = document.getElementById("rackIdSelector");
  if (!closetSelect || !rackSelect) return;

  let closets = [...new Set(projectBOM.filter(i => !i.parentInstanceId).map(i => (i.closetName || "IDF-1").trim()))];
  if (closets.length === 0) closets = ["MDF", "IDF-1"];

  const racks = ["Rack-1", "Rack-2", "Rack-3", "Wall-Box"];

  const prevCloset = closetSelect.value;
  const prevRack = rackSelect.value;

  closetSelect.innerHTML = closets.map(c => `<option value="${c}" ${c === prevCloset ? 'selected' : ''}>${c}</option>`).join("");
  rackSelect.innerHTML = racks.map(r => `<option value="${r}" ${r === prevRack ? 'selected' : ''}>${r}</option>`).join("");

  if (!closetSelect.value && closets.length > 0) closetSelect.value = closets[0];
  if (!rackSelect.value && racks.length > 0) rackSelect.value = racks[0];
}

function changeRackPresetHeight(val) {
  const newHeight = parseInt(val) || 24;
  currentRackHeight = newHeight;

  const closetEl = document.getElementById("rackClosetSelector");
  const rackEl = document.getElementById("rackIdSelector");
  const selectedCloset = closetEl && closetEl.value ? closetEl.value : "IDF-1";
  const selectedRack = rackEl && rackEl.value ? rackEl.value : "Rack-1";

  const rackable = projectBOM.filter(i => 
    !i.parentInstanceId &&
    !i.isDinMounted &&
    (i.closetName || "IDF-1") === selectedCloset &&
    (i.rackId || "Rack-1") === selectedRack
  );

  rackable.forEach(item => {
    if (item.assignedSlots) {
      item.assignedSlots = item.assignedSlots.filter(u => u <= newHeight);
    }
  });

  renderRackVisualizer();
  showToast(`Adjusted frame height to ${newHeight}U. Overflow units unmounted.`);
}

function autoPackRackEquipment() {
  const closetEl = document.getElementById("rackClosetSelector");
  const rackEl = document.getElementById("rackIdSelector");
  const selectedCloset = closetEl && closetEl.value ? closetEl.value : "IDF-1";
  const selectedRack = rackEl && rackEl.value ? rackEl.value : "Rack-1";

  const rackable = projectBOM.filter(i => 
    !i.parentInstanceId &&
    !i.isDinMounted &&
    (i.closetName || "IDF-1") === selectedCloset &&
    (i.rackId || "Rack-1") === selectedRack
  );

  function getRolePriority(item) {
    if (item.role === "Security WAN") return 1;
    if (item.role === "Core") return 2;
    if (item.role === "Aggregation") return 3;
    if (item.role === "Access") return 4;
    return 5;
  }

  rackable.sort((a, b) => {
    const pA = getRolePriority(a);
    const pB = getRolePriority(b);
    if (pA !== pB) return pA - pB;

    const portsA = a.ports || 0;
    const portsB = b.ports || 0;
    return portsB - portsA;
  });

  let currentU = currentRackHeight;
  rackable.forEach(item => {
    item.assignedSlots = [];
    for (let q = 0; q < item.qty; q++) {
      if (currentU >= 1) {
        item.assignedSlots.push(currentU);
        currentU--;
      }
    }
  });

  renderRackVisualizer();
  showToast(`Auto-packed ${rackable.length} units (Firewall → Core → Agg → Access).`);
}

function clearRackAssignments() {
  const closetEl = document.getElementById("rackClosetSelector");
  const rackEl = document.getElementById("rackIdSelector");
  const selectedCloset = closetEl && closetEl.value ? closetEl.value : "IDF-1";
  const selectedRack = rackEl && rackEl.value ? rackEl.value : "Rack-1";

  const rackable = projectBOM.filter(i => 
    !i.parentInstanceId &&
    !i.isDinMounted &&
    (i.closetName || "IDF-1") === selectedCloset &&
    (i.rackId || "Rack-1") === selectedRack
  );

  rackable.forEach(item => {
    item.assignedSlots = [];
  });

  renderRackVisualizer();
  showToast("Unmounted all equipment in this rack.");
}

function mountToHighestSlot(instanceId) {
  const item = projectBOM.find(i => i.instanceId === instanceId);
  if (!item) return;

  if (!item.assignedSlots) item.assignedSlots = [];

  const closetEl = document.getElementById("rackClosetSelector");
  const rackEl = document.getElementById("rackIdSelector");
  const selectedCloset = closetEl && closetEl.value ? closetEl.value : "IDF-1";
  const selectedRack = rackEl && rackEl.value ? rackEl.value : "Rack-1";

  const allOccupiedSlots = projectBOM
    .filter(i => !i.parentInstanceId && (i.closetName || "IDF-1") === selectedCloset && (i.rackId || "Rack-1") === selectedRack)
    .flatMap(i => i.assignedSlots || []);

  for (let u = currentRackHeight; u >= 1; u--) {
    if (!allOccupiedSlots.includes(u)) {
      item.assignedSlots.push(u);
      break;
    }
  }

  renderRackVisualizer();
}

function unmountSingleUnit(instanceId, u) {
  const item = projectBOM.find(i => i.instanceId === instanceId);
  if (!item || !item.assignedSlots) return;

  item.assignedSlots = item.assignedSlots.filter(slot => slot !== u);
  renderRackVisualizer();
}

function nudgeSlot(instanceId, currentU, direction) {
  const item = projectBOM.find(i => i.instanceId === instanceId);
  if (!item || !item.assignedSlots) return;

  const targetU = currentU + direction;
  if (targetU < 1 || targetU > currentRackHeight) return;

  const targetOccupied = projectBOM.find(i => !i.parentInstanceId && i.assignedSlots && i.assignedSlots.includes(targetU));
  if (targetOccupied) {
    const targetIdx = targetOccupied.assignedSlots.indexOf(targetU);
    targetOccupied.assignedSlots[targetIdx] = currentU;
  }

  const idx = item.assignedSlots.indexOf(currentU);
  if (idx > -1) {
    item.assignedSlots[idx] = targetU;
  }

  renderRackVisualizer();
}

function renderRackVisualizer() {
  const closetEl = document.getElementById("rackClosetSelector");
  const rackEl = document.getElementById("rackIdSelector");
  const railsContainer = document.getElementById("rackRailsContainer");
  const dinContainer = document.getElementById("dinEnclosureList");
  const unmountedContainer = document.getElementById("unmountedEquipmentList");
  const statsU = document.getElementById("rackStatsU");
  const statsPoE = document.getElementById("rackStatsPoE");
  const metricsContainer = document.getElementById("rackPowerMetricsContainer");

  if (!railsContainer || !dinContainer) return;

  const selectedCloset = closetEl && closetEl.value ? closetEl.value : "IDF-1";
  const selectedRack = rackEl && rackEl.value ? rackEl.value : "Rack-1";

  const rackEquipment = projectBOM.filter(i => 
    !i.parentInstanceId &&
    !i.isDinMounted &&
    (i.closetName || "IDF-1") === selectedCloset &&
    (i.rackId || "Rack-1") === selectedRack
  );

  const dinEquipment = projectBOM.filter(i => 
    !i.parentInstanceId &&
    i.isDinMounted &&
    (i.closetName || "IDF-1") === selectedCloset
  );

  let totalAssignedSlotsCount = 0;
  let totalRackWatts = 0;
  let totalBaseWatts = 0;

  rackEquipment.forEach(item => {
    const slotsCount = item.assignedSlots ? item.assignedSlots.length : 0;
    totalAssignedSlotsCount += slotsCount;
    if (slotsCount > 0) {
      totalRackWatts += (item.poeBudget || 0) * item.qty;
      totalBaseWatts += (item.baseWatts || 50) * item.qty;
    }
  });

  const totalConnectedWatts = totalRackWatts + totalBaseWatts;
  const totalBtuHr = Math.round(totalConnectedWatts * 3.412142);
  const coolingTons = (totalBtuHr / 12000).toFixed(2);
  const amps120V = (totalConnectedWatts / (120 * 0.8)).toFixed(1);
  const amps208V = (totalConnectedWatts / (208 * 0.8)).toFixed(1);

  if (statsU) statsU.innerText = `${totalAssignedSlotsCount} / ${currentRackHeight} RUs Occupied`;
  if (statsPoE) statsPoE.innerText = `${totalRackWatts.toLocaleString()} W PoE Budget`;

  if (metricsContainer) {
    metricsContainer.innerHTML = `
      <div class="bg-slate-950 p-2 rounded-xl border border-slate-800">
        <span class="text-slate-500 text-[10px] block uppercase font-bold">Total Power Draw</span>
        <span class="font-mono text-white text-sm font-bold">${totalConnectedWatts.toLocaleString()} W</span>
        <span class="text-slate-400 text-[10px] block font-mono">Base: ${totalBaseWatts}W | PoE: ${totalRackWatts}W</span>
      </div>
      <div class="bg-slate-950 p-2 rounded-xl border border-slate-800">
        <span class="text-slate-500 text-[10px] block uppercase font-bold">Heat Output</span>
        <span class="font-mono text-orange-400 text-sm font-bold">${totalBtuHr.toLocaleString()} BTU/hr</span>
        <span class="text-slate-400 text-[10px] block font-mono">HVAC Load: ${coolingTons} Tons AC</span>
      </div>
      <div class="bg-slate-950 p-2 rounded-xl border border-slate-800">
        <span class="text-slate-500 text-[10px] block uppercase font-bold">Branch Circuit (120V)</span>
        <span class="font-mono text-sky-400 text-sm font-bold">${amps120V} A</span>
        <span class="text-slate-400 text-[10px] block">Req: ${Math.ceil(parseFloat(amps120V) / 20) || 1}x 20A Circuits</span>
      </div>
      <div class="bg-slate-950 p-2 rounded-xl border border-slate-800">
        <span class="text-slate-500 text-[10px] block uppercase font-bold">Branch Circuit (208V)</span>
        <span class="font-mono text-emerald-400 text-sm font-bold">${amps208V} A</span>
        <span class="text-slate-400 text-[10px] block">Req: ${Math.ceil(parseFloat(amps208V) / 20) || 1}x 20A PDU Feeds</span>
      </div>
    `;
  }

  let railsHtml = "";
  for (let u = currentRackHeight; u >= 1; u--) {
    const item = rackEquipment.find(i => i.assignedSlots && i.assignedSlots.includes(u));

    if (item) {
      const isDeep = item.depthInches > 14 && (currentRackHeight <= 12);
      let borderTone = "border-purple-500/70";
      if (item.vendor === "Meraki") borderTone = "border-emerald-500/70";
      else if (item.vendor === "UniFi") borderTone = "border-sky-500/70";
      else if (item.vendor === "Juniper") borderTone = "border-blue-500/70";
      else if (item.vendor === "Allied Telesis") borderTone = "border-teal-500/70";
      else if (item.vendor === "Ruckus") borderTone = "border-amber-500/70";

      railsHtml += `
        <div class="h-10 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-2 ${borderTone} rounded-lg flex items-center justify-between px-3 text-xs shadow-md relative group">
          <div class="flex items-center gap-2.5 min-w-0">
            <span class="w-7 font-bold text-slate-400 font-mono text-[11px] bg-slate-950 px-1 py-0.5 rounded border border-slate-800 text-center">U${u}</span>
            <div class="truncate">
              <span class="font-bold text-white tracking-tight">${item.model}</span>
              <span class="text-[10px] text-slate-400 font-mono ml-1">(${item.sku})</span>
            </div>
            ${isDeep ? '<span class="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.2 rounded font-sans font-semibold shrink-0">Clearance: ' + item.depthInches + '"</span>' : ''}
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <span class="text-[10px] font-mono text-slate-400 hidden sm:inline">${item.role}</span>
            <div class="flex items-center gap-1 bg-slate-950 px-1 py-0.5 rounded border border-slate-800">
              <button onclick="nudgeSlot('${item.instanceId}', ${u}, 1)" title="Nudge Up 1U" class="p-0.5 hover:text-white text-slate-400"><i data-lucide="chevron-up" class="w-3.5 h-3.5"></i></button>
              <button onclick="nudgeSlot('${item.instanceId}', ${u}, -1)" title="Nudge Down 1U" class="p-0.5 hover:text-white text-slate-400"><i data-lucide="chevron-down" class="w-3.5 h-3.5"></i></button>
              <button onclick="unmountSingleUnit('${item.instanceId}', ${u})" title="Unmount from Slot" class="p-0.5 hover:text-rose-400 text-slate-500"><i data-lucide="x" class="w-3.5 h-3.5"></i></button>
            </div>
          </div>
        </div>
      `;
    } else {
      railsHtml += `
        <div class="h-8 border border-dashed border-slate-800/90 rounded-md flex items-center justify-between px-3 text-[11px] text-slate-600 hover:border-slate-700 hover:bg-slate-900/30 transition-colors">
          <span class="w-7 font-mono text-slate-700 text-center">U${u}</span>
          <span class="text-[10px] text-slate-700 font-mono tracking-widest uppercase select-none">— Open Rack Unit —</span>
          <span></span>
        </div>
      `;
    }
  }

  railsContainer.innerHTML = railsHtml;

  const unmountedItems = [];
  rackEquipment.forEach(item => {
    const assignedCount = item.assignedSlots ? item.assignedSlots.length : 0;
    const requiredSlots = item.qty;
    const unmountedCount = Math.max(0, requiredSlots - assignedCount);
    if (unmountedCount > 0) {
      unmountedItems.push({ item, unmountedCount });
    }
  });

  if (unmountedItems.length === 0) {
    unmountedContainer.innerHTML = `
      <div class="p-3 bg-slate-900/50 border border-slate-800/80 rounded-xl text-center text-slate-500 text-xs">
        All 19" units in this cabinet are currently mounted.
      </div>`;
  } else {
    unmountedContainer.innerHTML = unmountedItems.map(({ item, unmountedCount }) => `
      <div class="p-2.5 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between gap-2 shadow-sm">
        <div class="min-w-0">
          <span class="font-bold text-xs text-white truncate block">${item.model}</span>
          <div class="text-[10px] font-mono text-slate-400">${unmountedCount}x unmounted (${item.role})</div>
        </div>
        <button onclick="mountToHighestSlot('${item.instanceId}')" class="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow shrink-0">
          Mount
        </button>
      </div>
    `).join("");
  }

  if (dinEquipment.length === 0) {
    dinContainer.innerHTML = `
      <div class="p-4 bg-slate-900/50 border border-slate-800/80 rounded-xl text-center text-slate-500 text-xs">
        No DIN-rail or wall-mount equipment in this closet.
      </div>
    `;
  } else {
    dinContainer.innerHTML = dinEquipment.map(item => `
      <div class="p-3 bg-slate-900 border border-amber-500/30 rounded-xl space-y-1.5 shadow-md">
        <div class="flex items-start justify-between">
          <div>
            <span class="badge-chip border border-amber-500/40 bg-amber-500/10 text-amber-300">DIN / Wall Mount</span>
            <h4 class="font-bold text-xs text-white mt-1">${item.model}</h4>
            <div class="text-[10px] font-mono text-slate-400">SKU: ${item.sku} • Qty: ${item.qty}x</div>
          </div>
          <span class="text-xs font-mono font-bold text-emerald-400">$${(item.msrp * item.qty).toLocaleString()}</span>
        </div>
        <div class="text-[10px] text-slate-400">
          Chassis Depth: <strong>${item.depthInches}"</strong> (Fits shallow exterior NEMA cabinets)
        </div>
      </div>
    `).join("");
  }

  if (window.lucide) {
    try { lucide.createIcons(); } catch(e) {}
  }
  if (typeof queueAutoSave === 'function') queueAutoSave();
}

function printRackElevation() {
  const closetEl = document.getElementById("rackClosetSelector");
  const rackEl = document.getElementById("rackIdSelector");
  const selectedCloset = closetEl && closetEl.value ? closetEl.value : "IDF-1";
  const selectedRack = rackEl && rackEl.value ? rackEl.value : "Rack-1";

  const rackEquipment = projectBOM.filter(i => 
    !i.parentInstanceId &&
    !i.isDinMounted &&
    (i.closetName || "IDF-1") === selectedCloset &&
    (i.rackId || "Rack-1") === selectedRack
  );

  let rowsHtml = "";
  for (let u = currentRackHeight; u >= 1; u--) {
    const item = rackEquipment.find(i => i.assignedSlots && i.assignedSlots.includes(u));
    if (item) {
      rowsHtml += `
        <tr style="border-bottom: 1px solid #334155; background: #f8fafc;">
          <td style="padding: 6px 12px; font-weight: bold; font-family: monospace; width: 60px;">U${u}</td>
          <td style="padding: 6px 12px; font-weight: bold;">${item.model} <span style="font-size: 11px; font-weight: normal; color: #64748b;">(${item.sku})</span></td>
          <td style="padding: 6px 12px;">${item.role}</td>
          <td style="padding: 6px 12px; font-family: monospace;">${item.poeBudget || 0}W PoE</td>
          <td style="padding: 6px 12px; font-family: monospace;">${item.depthInches}" D</td>
        </tr>
      `;
    } else {
      rowsHtml += `
        <tr style="border-bottom: 1px dashed #cbd5e1;">
          <td style="padding: 4px 12px; font-family: monospace; color: #94a3b8;">U${u}</td>
          <td colspan="4" style="padding: 4px 12px; color: #cbd5e1; font-style: italic;">-- Empty Rack Unit --</td>
        </tr>
      `;
    }
  }

  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Rack Elevation - ${selectedCloset} / ${selectedRack}</title>
      <style>
        body { font-family: system-ui, -apple-system, sans-serif; padding: 24px; color: #0f172a; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th { text-align: left; background: #e2e8f0; padding: 8px 12px; border-bottom: 2px solid #94a3b8; }
        .header { margin-bottom: 20px; border-bottom: 2px solid #0f172a; padding-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-end; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1 style="margin: 0; font-size: 20px;">RACK ELEVATION & PHYSICAL SCHEMATIC</h1>
          <p style="margin: 4px 0 0; color: #475569; font-size: 13px;">Location: <strong>${selectedCloset}</strong> | Cabinet: <strong>${selectedRack}</strong> | Frame: <strong>${currentRackHeight}U</strong></p>
        </div>
        <div style="text-align: right; font-size: 11px; color: #64748b;">
          Generated: ${new Date().toLocaleString()}
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Unit</th>
            <th>Installed Hardware</th>
            <th>Classification</th>
            <th>PoE Capacity</th>
            <th>Depth</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => { printWindow.print(); }, 250);
}