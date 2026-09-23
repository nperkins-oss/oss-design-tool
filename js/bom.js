// ==========================================
// BILL OF MATERIALS (BOM) & LICENSING ENGINE
// ==========================================

let projectBOM = [];
let bomViewMode = "grouped";
let globalSelectedTerm = "1YR";

function checkMerakiCompliance() {
  const merakiDevices = projectBOM.filter(i => !i.parentInstanceId && i.vendor === "Meraki");
  if (!merakiDevices || merakiDevices.length === 0) return { compliant: true, missingCount: 0 };

  let unmanagedCount = 0;
  merakiDevices.forEach(dev => {
    const hasLicense = projectBOM.some(i => i.parentInstanceId === dev.instanceId && (i.role === "Mgmt License" || i.role === "Security License"));
    if (!hasLicense) unmanagedCount++;
  });

  return {
    compliant: unmanagedCount === 0,
    missingCount: unmanagedCount
  };
}

function autoFixMerakiLicenses() {
  const merakiDevices = projectBOM.filter(i => !i.parentInstanceId && i.vendor === "Meraki");
  merakiDevices.forEach(dev => {
    dev.selectedMgmtProfile = "cloud";
    const term = dev.individualTerm || globalSelectedTerm || "1YR";
    applyManagementSubscription(dev.instanceId, "cloud", term);
  });

  updateBOMView();
  showToast(`Attached ${globalSelectedTerm || '1YR'} Meraki Enterprise licenses.`);
}

function setBomViewMode(mode) {
  bomViewMode = mode;
  const grpBtn = document.getElementById("bomViewMode-grouped");
  const fltBtn = document.getElementById("bomViewMode-flat");

  if (mode === "grouped") {
    grpBtn.classList.replace("text-slate-400", "text-white");
    grpBtn.classList.replace("bg-slate-950", "bg-brand-600");
    fltBtn.classList.replace("text-white", "text-slate-400");
    fltBtn.classList.replace("bg-brand-600", "bg-slate-950");
  } else {
    fltBtn.classList.replace("text-slate-400", "text-white");
    fltBtn.classList.replace("bg-slate-950", "bg-brand-600");
    grpBtn.classList.replace("text-white", "text-slate-400");
    grpBtn.classList.replace("bg-brand-600", "bg-slate-950");
  }

  updateBOMView();
}

function addToProjectBOM(id) {
  const sw = SWITCH_DATABASE.find(s => s.id === id);
  if (!sw) return;

  const qtyToAdd = 1;
  const sledSelect = document.getElementById(`sled-${sw.id}`);
  const selectedSledSku = sledSelect ? sledSelect.value : (sw.modularUplink ? sw.modularUplink.defaultModuleSku : null);

  const instanceId = `inst-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
  const defaultCloset = (sw.role === "Core" || sw.role === "Aggregation") ? "MDF" : "IDF-1";
  const isDinOnly = sw.mounting && sw.mounting.includes("DIN") && !sw.mounting.includes("19\"");

  let initialMgmtProfile = sw.defaultMgmtProfile || (sw.vendor === "Meraki" ? "cloud" : "standalone");
  const baseWatts = sw.role === "Core" ? 250 : (sw.role === "Aggregation" ? 150 : (sw.ports >= 48 ? 65 : 35));

  const newParent = {
    instanceId: instanceId,
    id: sw.id,
    model: sw.model,
    sku: sw.sku,
    role: sw.role,
    vendor: sw.vendor,
    msrp: sw.msrp,
    poeBudget: sw.poeBudget || 0,
    baseWatts: baseWatts,
    depthInches: sw.depthInches || 12,
    shallowDepth: sw.shallowDepth || false,
    qty: qtyToAdd,
    canStack: sw.stacking || false,
    closetName: defaultCloset,
    rackId: "Rack-1",
    rackU: null,
    isDinMounted: isDinOnly,
    stackedUnits: 0,
    stackCableSku: sw.stackCableSku || null,
    portSpeed: sw.portSpeed || "10G",
    maxBackboneSpeed: sw.maxBackboneSpeed || "10G",
    selectedMgmtProfile: initialMgmtProfile
  };

  projectBOM.push(newParent);

  if (selectedSledSku && MODULAR_UPLINK_CATALOG[selectedSledSku]) {
    const mod = MODULAR_UPLINK_CATALOG[selectedSledSku];
    projectBOM.push({
      instanceId: `mod-${instanceId}`,
      parentInstanceId: instanceId,
      id: mod.sku,
      model: mod.name,
      sku: mod.sku,
      role: "Uplink Module",
      vendor: sw.vendor,
      msrp: mod.msrp,
      poeBudget: 0,
      baseWatts: 15,
      qty: qtyToAdd
    });
  }

  const selectedLicCheckboxes = document.querySelectorAll(`input[name="featLic-${sw.id}"]:checked`);
  selectedLicCheckboxes.forEach(cb => {
    const licSku = cb.value;
    const lic = FEATURE_LICENSE_CATALOG[licSku];
    if (lic) {
      projectBOM.push({
        instanceId: `lic-${licSku}-${instanceId}`,
        parentInstanceId: instanceId,
        id: lic.sku,
        model: lic.name,
        sku: lic.sku,
        role: "Feature License",
        vendor: sw.vendor,
        msrp: lic.msrp,
        poeBudget: 0,
        baseWatts: 0,
        qty: qtyToAdd
      });
    }
  });

  const redundantPsuChecked = document.getElementById(`psuRedundant-${sw.id}`)?.checked;
  if (redundantPsuChecked && sw.psuSku && POWER_SUPPLY_CATALOG[sw.psuSku]) {
    const psu = POWER_SUPPLY_CATALOG[sw.psuSku];
    projectBOM.push({
      instanceId: `psu2-${instanceId}`,
      parentInstanceId: instanceId,
      id: psu.sku,
      model: `2nd Redundant PSU: ${psu.name}`,
      sku: psu.sku,
      role: "Power Supply",
      vendor: sw.vendor,
      msrp: psu.msrp,
      poeBudget: 0,
      baseWatts: 0,
      qty: 1
    });
  }

  if (sw.needsExternalPsu && sw.psuSku && POWER_SUPPLY_CATALOG[sw.psuSku]) {
    const psu = POWER_SUPPLY_CATALOG[sw.psuSku];
    projectBOM.push({
      instanceId: `psu-ext-${instanceId}`,
      parentInstanceId: instanceId,
      id: psu.sku,
      model: `Primary Power Supply: ${psu.name}`,
      sku: psu.sku,
      role: "Power Supply",
      vendor: sw.vendor,
      msrp: psu.msrp,
      poeBudget: 0,
      baseWatts: 0,
      qty: 1
    });
  }

  if (sw.vendor === "Meraki") {
    applyManagementSubscription(instanceId, "cloud", globalSelectedTerm || "1YR");
  }

  updateBOMView();
  showToast(`Added ${sw.model} to Project BOM.`);
}

function applyManagementSubscription(instanceId, profileKey, term) {
  const sw = projectBOM.find(i => i.instanceId === instanceId);
  if (!sw) return;

  projectBOM = projectBOM.filter(i => !(i.parentInstanceId === instanceId && (i.role === "Mgmt License" || i.role === "Security License")));

  sw.selectedMgmtProfile = profileKey;

  if (!profileKey || profileKey === "standalone") return;

  const profile = MGMT_SUBSCRIPTION_CATALOG[sw.vendor]?.[profileKey];
  if (profile && profile.terms) {
    const termEntry = profile.terms[term] || profile.terms["1YR"] || profile.terms["PERP"] || Object.values(profile.terms)[0];
    if (termEntry && termEntry.msrp > 0) {
      projectBOM.push({
        instanceId: `mgmt-${instanceId}`,
        parentInstanceId: instanceId,
        id: termEntry.sku,
        model: `${profile.name} (${term || '1YR'})`,
        sku: termEntry.sku,
        role: "Mgmt License",
        vendor: sw.vendor,
        msrp: termEntry.msrp,
        poeBudget: 0,
        baseWatts: 0,
        qty: sw.qty || 1
      });
    }
  }
}

function updateClosetName(instanceId, name) {
  const item = projectBOM.find(i => i.instanceId === instanceId);
  if (item) item.closetName = name.trim() || "Closet";
  updateBOMView();
  if (!document.getElementById("rackModal").classList.contains("hidden")) {
    renderRackVisualizer();
  }
}

function updateRackId(instanceId, rack) {
  const item = projectBOM.find(i => i.instanceId === instanceId);
  if (item) item.rackId = rack;
  updateBOMView();
  if (!document.getElementById("rackModal").classList.contains("hidden")) {
    renderRackVisualizer();
  }
}

function updateStackedCount(instanceId, count) {
  const item = projectBOM.find(i => i.instanceId === instanceId);
  if (!item) return;

  const val = parseInt(count) || 0;
  item.stackedUnits = Math.min(item.qty, Math.max(0, val));
  if (item.stackedUnits === 1) item.stackedUnits = 0;

  applyStackCabling(item);
  updateBOMView();
}

function applyStackCabling(item) {
  const cableSku = item.stackCableSku || "STACK-DAC-1M";
  projectBOM = projectBOM.filter(i => !(i.role === "Stacking Cable" && i.parentInstanceId === item.instanceId));

  if (item.stackedUnits >= 2) {
    projectBOM.push({
      instanceId: `cable-${item.instanceId}`,
      parentInstanceId: item.instanceId,
      id: `${item.id}-stack-cable`,
      model: `${item.vendor} Stacking Cable (${item.closetName})`,
      sku: cableSku,
      role: "Stacking Cable",
      vendor: item.vendor,
      msrp: 180,
      poeBudget: 0,
      baseWatts: 0,
      qty: item.stackedUnits
    });
  }
}

function autoResolveUplinks() {
  const coreSwitches = projectBOM.filter(i => (i.role === "Core" || i.role === "Aggregation") && !i.parentInstanceId);
  const accessSwitches = projectBOM.filter(i => i.role === "Access" && !i.parentInstanceId);

  if (coreSwitches.length === 0) {
    showToast("Please add at least one Core or Aggregation switch to the BOM first.");
    return;
  }
  if (accessSwitches.length === 0) {
    showToast("No Access switches found in BOM to calculate uplinks for.");
    return;
  }

  const core = coreSwitches[0];
  projectBOM = projectBOM.filter(i => i.role !== "Uplink Interconnect");

  let dacCount = 0;
  let opticPairsCount = 0;
  let highestSpeedResolved = "10G";

  accessSwitches.forEach(sw => {
    const linksNeeded = sw.stackedUnits >= 2 ? 2 : (sw.qty * 1);

    const attachedSled = projectBOM.find(i => i.parentInstanceId === sw.instanceId && i.role === "Uplink Module");
    const sledData = attachedSled ? (MODULAR_UPLINK_CATALOG[attachedSled.id] || MODULAR_UPLINK_CATALOG[attachedSled.sku]) : null;

    let accessUplinkSpeed = "10G";
    if (sledData) {
      accessUplinkSpeed = sledData.speed;
    } else if (sw.maxBackboneSpeed) {
      accessUplinkSpeed = sw.maxBackboneSpeed;
    } else if (sw.portSpeed === "100G" || sw.portSpeed === "25G" || sw.portSpeed === "40G") {
      accessUplinkSpeed = sw.portSpeed;
    }

    const coreSpeed = core.maxBackboneSpeed || "10G";

    let linkSpeed = "10G";
    if (accessUplinkSpeed === "100G" && coreSpeed === "100G") {
      linkSpeed = "100G";
    } else if ((accessUplinkSpeed === "25G" || accessUplinkSpeed === "100G") && (coreSpeed === "25G" || coreSpeed === "100G")) {
      linkSpeed = "25G";
    } else if (accessUplinkSpeed === "40G" && coreSpeed === "40G") {
      linkSpeed = "40G";
    } else if (accessUplinkSpeed === "1G" || coreSpeed === "1G") {
      linkSpeed = "1G";
    }
    highestSpeedResolved = linkSpeed;

    const isSameCloset = (sw.closetName || "IDF-1").trim().toUpperCase() === (core.closetName || "MDF").trim().toUpperCase();
    const isSameRack = isSameCloset && ((sw.rackId || "Rack-1") === (core.rackId || "Rack-1"));

    if (isSameRack) {
      const dacData = OPTICS_CATALOG[sw.vendor]?.[linkSpeed]?.["dac"] || OPTICS_CATALOG["Meraki"]?.[linkSpeed]?.["dac"];
      if (dacData) {
        projectBOM.push({
          instanceId: `uplink-dac-${sw.instanceId}`,
          parentInstanceId: sw.instanceId,
          id: dacData.sku,
          model: `${sw.vendor} ${linkSpeed} 1M DAC (${sw.closetName} / ${sw.rackId})`,
          sku: dacData.sku,
          role: "Uplink Interconnect",
          vendor: sw.vendor,
          msrp: dacData.msrp,
          poeBudget: 0,
          baseWatts: 0,
          qty: linksNeeded
        });
        dacCount += linksNeeded;
      }
    } else {
      const medium = isSameCloset ? "mmf" : "smf";
      let opticData = OPTICS_CATALOG[sw.vendor]?.[linkSpeed]?.[medium];
      if (!opticData) {
        opticData = OPTICS_CATALOG[sw.vendor]?.[linkSpeed]?.["mmf"] || OPTICS_CATALOG["Meraki"]?.[linkSpeed]?.[medium];
      }

      if (opticData) {
        const transceiversQty = linksNeeded * 2;
        projectBOM.push({
          instanceId: `uplink-opt-${sw.instanceId}`,
          parentInstanceId: sw.instanceId,
          id: opticData.sku,
          model: `${sw.vendor} ${linkSpeed} ${medium.toUpperCase()} Optic Pair (${sw.closetName} -> ${core.closetName})`,
          sku: opticData.sku,
          role: "Uplink Interconnect",
          vendor: sw.vendor,
          msrp: opticData.msrp,
          poeBudget: 0,
          baseWatts: 2,
          qty: transceiversQty
        });
        opticPairsCount += linksNeeded;
      }
    }
  });

  updateBOMView();
  showToast(`Auto Uplinks resolved at ${highestSpeedResolved}: Added ${dacCount}x DACs and ${opticPairsCount * 2}x transceivers.`);
}

function addFirewallToBOM(sku) {
  const fw = FIREWALL_DATABASE.find(f => f.sku === sku);
  if (!fw) return;

  const qtyToAdd = 1;
  const instanceId = `fw-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

  projectBOM.push({
    instanceId: instanceId,
    id: fw.sku,
    model: fw.model,
    sku: fw.sku,
    role: "Security WAN",
    vendor: fw.vendor,
    msrp: fw.msrp,
    poeBudget: 0,
    baseWatts: 45,
    depthInches: 17.5,
    shallowDepth: false,
    qty: qtyToAdd,
    uHeight: 1,
    closetName: "MDF",
    rackId: "Rack-1",
    rackU: null,
    isDinMounted: fw.category === "cellular",
    selectedMgmtProfile: fw.category === "cellular" ? "standalone" : (fw.vendor === "Meraki" ? "cloud" : "standalone")
  });

  updateBOMView();
  showToast(`Added ${fw.model} Gateway to Project BOM.`);
}

function addOpticsToBOM(sku, name, msrp, qty, vendor) {
  const instanceId = `opt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
  projectBOM.push({
    instanceId: instanceId,
    id: sku,
    model: name,
    sku: sku,
    role: "Optics / Interconnect",
    vendor: vendor,
    msrp: msrp,
    poeBudget: 0,
    baseWatts: 1,
    qty: qty
  });

  updateBOMView();
  showToast(`Added ${qty}x ${sku} to Project BOM.`);
}

function changeBomQty(instanceId, delta) {
  const item = projectBOM.find(i => i.instanceId === instanceId);
  if (!item) return;

  item.qty += delta;

  if (item.qty <= 0) {
    projectBOM = projectBOM.filter(i => i.instanceId !== instanceId && i.parentInstanceId !== instanceId);
  } else {
    if (item.stackedUnits > item.qty) {
      item.stackedUnits = item.qty >= 2 ? item.qty : 0;
    }
    projectBOM.filter(i => i.parentInstanceId === instanceId && i.role !== "Stacking Cable" && i.role !== "Uplink Interconnect").forEach(child => {
      child.qty = item.qty;
    });
    applyStackCabling(item);
  }

  updateBOMView();
  if (!document.getElementById("rackModal").classList.contains("hidden")) {
    renderRackVisualizer();
  }
}

function removeBomItem(instanceId) {
  projectBOM = projectBOM.filter(i => i.instanceId !== instanceId && i.parentInstanceId !== instanceId);
  updateBOMView();
  if (!document.getElementById("rackModal").classList.contains("hidden")) {
    renderRackVisualizer();
  }
  showToast("Item removed from BOM.");
}

function clearBom() {
  projectBOM = [];
  updateBOMView();
  if (!document.getElementById("rackModal").classList.contains("hidden")) {
    renderRackVisualizer();
  }
  showToast("Project BOM cleared.");
}

function toggleBomDrawer() {
  document.getElementById("bomDrawer").classList.toggle("translate-x-full");
}

function updateBOMView() {
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
    totalUnits += item.qty;
    totalPoE += ((item.poeBudget || 0) * item.qty);
    totalMSRP += (item.msrp * item.qty);
  });

  const { budgetWithHeadroom, raw, totalCameras } = calculatePoETarget();
  const auditContainer = document.getElementById("bomPoEHeadroomAudit");
  if (auditContainer) {
    if (totalCameras === 0) {
      auditContainer.innerHTML = `
        <div class="flex items-center justify-between text-slate-400">
          <span>Calculator Demand: <strong class="text-white">0 Cameras</strong></span>
          <span class="font-mono text-slate-500">No Target Specified</span>
        </div>
      `;
    } else {
      const delta = totalPoE - budgetWithHeadroom;
      const isSurplus = delta >= 0;
      auditContainer.innerHTML = `
        <div class="space-y-1">
          <div class="flex items-center justify-between">
            <span class="text-slate-400">Camera Target (+20% Headroom):</span>
            <span class="font-mono font-bold text-white">${budgetWithHeadroom} W</span>
          </div>
          <div class="flex items-center justify-between pt-1 border-t border-slate-800">
            <span class="${isSurplus ? 'text-emerald-400' : 'text-rose-400'} font-bold flex items-center gap-1">
              <i data-lucide="${isSurplus ? 'check-circle-2' : 'alert-octagon'}" class="w-3.5 h-3.5"></i>
              ${isSurplus ? 'PoE Capacity Surplus' : 'PoE Deficit Alert'}:
            </span>
            <span class="font-mono font-bold ${isSurplus ? 'text-emerald-300' : 'text-rose-400'}">
              ${isSurplus ? '+' : ''}${delta} W (${Math.round((totalPoE / (budgetWithHeadroom || 1)) * 100)}% coverage)
            </span>
          </div>
        </div>
      `;
    }
  }

  const badge = document.getElementById("bomCountBadge");
  if (badge) badge.innerText = totalUnits;
  const totalUnitsEl = document.getElementById("bomTotalUnits");
  if (totalUnitsEl) totalUnitsEl.innerText = totalUnits;
  const totalPoEEl = document.getElementById("bomTotalPoE");
  if (totalPoEEl) totalPoEEl.innerText = `${totalPoE.toLocaleString()} W`;
  const totalMSRPEl = document.getElementById("bomTotalMSRP");
  if (totalMSRPEl) totalMSRPEl.innerText = `$${totalMSRP.toLocaleString()}`;

  const listContainer = document.getElementById("bomItemsList");
  if (!listContainer) return;

  if (projectBOM.length === 0) {
    listContainer.innerHTML = `<div class="py-12 text-center text-slate-500"><p class="text-xs font-semibold text-slate-400">Your Project BOM is empty</p></div>`;
    return;
  }

  if (bomViewMode === "flat") {
    listContainer.innerHTML = projectBOM.map(item => renderBomSingleItemHtml(item)).join("");
  } else {
    const groups = {};
    projectBOM.forEach(item => {
      if (item.parentInstanceId) return;
      const cName = (item.closetName || "IDF-1").trim();
      const rName = (item.rackId || "Rack-1").trim();
      const key = `${cName} • ${rName}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });

    let groupedHtml = "";
    Object.entries(groups).forEach(([locKey, items]) => {
      let locWatts = 0, locCost = 0;
      items.forEach(it => {
        locWatts += ((it.poeBudget || 0) + (it.baseWatts || 0)) * it.qty;
        locCost += it.msrp * it.qty;
        projectBOM.filter(ch => ch.parentInstanceId === it.instanceId).forEach(ch => {
          locCost += ch.msrp * ch.qty;
          locWatts += (ch.baseWatts || 0) * ch.qty;
        });
      });

      groupedHtml += `
        <div class="space-y-2 pt-1">
          <div class="bg-slate-850 px-3 py-1.5 rounded-lg border border-slate-750 flex items-center justify-between text-xs">
            <span class="font-bold text-indigo-300 flex items-center gap-1.5">
              <i data-lucide="map-pin" class="w-3.5 h-3.5 text-indigo-400"></i> ${locKey}
            </span>
            <span class="font-mono text-slate-400 text-[11px]">${locWatts}W Load &bull; $${locCost.toLocaleString()}</span>
          </div>
          <div class="space-y-2">
            ${items.map(it => renderBomSingleItemHtml(it)).join("")}
          </div>
        </div>
      `;
    });

    listContainer.innerHTML = groupedHtml;
  }

  if (window.lucide) {
    try { lucide.createIcons(); } catch(e) {}
  }
  if (typeof queueAutoSave === 'function') queueAutoSave();
}

function renderBomSingleItemHtml(item) {
  if (item.parentInstanceId) {
    return `
      <div class="ml-4 bg-slate-950/70 p-2 rounded-lg border border-slate-800/60 flex items-center justify-between text-xs">
        <div>
          <span class="text-slate-300 font-medium">${item.model}</span>
          <div class="text-[10px] font-mono text-slate-500">${item.role} &bull; SKU: ${item.sku}</div>
        </div>
        <div class="text-right">
          <span class="font-mono text-emerald-400 font-semibold">$${(item.msrp * item.qty).toLocaleString()}</span>
          <span class="text-[10px] text-slate-400 block">${item.qty}x @ $${item.msrp}</span>
        </div>
      </div>
    `;
  }

  return `
    <div class="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2.5 shadow-sm">
      <div class="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-800/80">
        <div class="flex items-center gap-1.5">
          <input type="text" value="${item.closetName || 'IDF-1'}" onchange="updateClosetName('${item.instanceId}', this.value)" class="bg-slate-900 border border-slate-700 text-white text-[11px] font-bold px-2 py-0.5 rounded w-20 focus:outline-none focus:border-brand-500" title="Closet name / ID" />
          <select onchange="updateRackId('${item.instanceId}', this.value)" class="bg-slate-900 border border-slate-700 text-[10px] text-slate-300 font-mono rounded px-1.5 py-0.5 focus:outline-none focus:border-brand-500">
            <option value="Rack-1" ${item.rackId === 'Rack-1' ? 'selected' : ''}>Rack 1</option>
            <option value="Rack-2" ${item.rackId === 'Rack-2' ? 'selected' : ''}>Rack 2</option>
            <option value="Rack-3" ${item.rackId === 'Rack-3' ? 'selected' : ''}>Rack 3</option>
            <option value="Wall-Box" ${item.rackId === 'Wall-Box' ? 'selected' : ''}>Wall Box</option>
          </select>
        </div>
        <span class="text-[10px] ${item.isDinMounted ? 'text-amber-400 border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 rounded' : 'text-slate-500 font-mono'} uppercase">${item.isDinMounted ? 'DIN Rail' : item.role}</span>
      </div>

      <div class="flex items-center justify-between gap-3">
        <div class="flex-1 min-w-0">
          <span class="text-xs font-bold text-white truncate block">${item.model}</span>
          <div class="text-[10px] font-mono text-slate-400">SKU: ${item.sku}</div>
          <div class="text-[11px] text-emerald-400 font-mono mt-0.5">$${(item.msrp * item.qty).toLocaleString()} ($${item.msrp.toLocaleString()} ea)</div>
        </div>
        <div class="flex items-center gap-2">
          <div class="flex items-center bg-slate-900 border border-slate-700 rounded-lg">
            <button onclick="changeBomQty('${item.instanceId}', -1)" class="px-2 py-1 text-slate-400 hover:text-white font-bold">-</button>
            <span class="px-2 text-xs font-mono font-bold text-white">${item.qty}</span>
            <button onclick="changeBomQty('${item.instanceId}', 1)" class="px-2 py-1 text-slate-400 hover:text-white font-bold">+</button>
          </div>
          <button onclick="removeBomItem('${item.instanceId}')" class="text-slate-500 hover:text-rose-400 p-1"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
        </div>
      </div>

      ${item.canStack ? `
        <div class="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
          <span class="text-slate-400">Units in stack:</span>
          <div class="flex items-center gap-2">
            <select onchange="updateStackedCount('${item.instanceId}', this.value)" class="bg-slate-900 border border-slate-700 text-xs text-white rounded px-2 py-0.5 focus:outline-none focus:border-brand-500 font-mono">
              <option value="0" ${item.stackedUnits === 0 ? 'selected' : ''}>0 (Standalone)</option>${Array.from({ length: item.qty - 1 }, (_, i) => i + 2).map(n => `
                <option value="${n}" ${item.stackedUnits === n ? 'selected' : ''}>${n} Stacked</option>
              `).join('')}
            </select>
            <span class="text-[10px] font-mono ${item.stackedUnits >= 2 ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30' : 'text-slate-500 bg-slate-900 border-slate-800'} px-1.5 py-0.5 rounded border">
              ${item.stackedUnits >= 2 ? `+${item.stackedUnits}x Cables` : '0 Cables'}
            </span>
          </div>
        </div>
      ` : ''}

      <div class="space-y-1.5">
        ${projectBOM.filter(ch => ch.parentInstanceId === item.instanceId).map(ch => `
          <div class="bg-slate-900/70 p-2 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
            <div>
              <span class="text-slate-300 font-medium">${ch.model}</span>
              <div class="text-[10px] font-mono text-slate-500">${ch.role} &bull; SKU: ${ch.sku}</div>             </div>             <div class="text-right">               <span class="font-mono text-emerald-400 font-semibold">$${(ch.msrp * ch.qty).toLocaleString()}</span>
              <span class="text-[10px] text-slate-400 block">${ch.qty}x @ $${ch.msrp}</span>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

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
          const locationLabel = (dev.closetName || 'General') + ' / ' + (dev.rackId || 'Rack-1');

          return `
            <div class="bg-slate-900 p-3 rounded-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <span class="font-bold text-white truncate">${dev.model}</span>
                  <span class="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 border border-slate-700 text-slate-400 font-mono">${dev.vendor}</span>
                </div>
                <span class="text-[10px] text-slate-400 font-mono">${dev.qty}x units &bull; Location: [${locationLabel}]</span>
              </div>

              <div class="flex flex-wrap items-center gap-3">
                <select onchange="updateSwitchMgmtProfile('${dev.instanceId}', this.value)" class="bg-slate-950 border border-slate-700 text-purple-300 font-semibold rounded px-2.5 py-1 text-xs focus:outline-none focus:border-purple-500">
                  ${Object.entries(vendorProfiles).map(([pKey, pData]) => `
                    <option value="${pKey}" ${activeKey === pKey ? 'selected' : ''}>${pData.name}</option>
                  `).join('')}
                  ${dev.vendor !== "Meraki" ? `
                    <option value="standalone" ${activeKey === 'standalone' ? 'selected' : ''}>Standalone / Air-Gapped CLI ($0)</option>
                  ` : ''}
                </select>

                ${deviceSupportedTerms.length > 1 ? `
                  <div class="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                    ${deviceSupportedTerms.map(t => `
                      <button onclick="setIndividualDeviceTerm('${dev.instanceId}', '${t}')" class="px-1.5 py-0.5 text-[10px] font-mono rounded font-bold ${dev.individualTerm === t || (!dev.individualTerm && globalSelectedTerm === t) ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}">
                        ${t}
                      </button>
                    `).join('')}
                  </div>
                ` : ''}

                <div class="w-24 text-right font-mono text-emerald-400 font-bold text-xs">
                  ${currentMgmtItem ? `$${(currentMgmtItem.msrp * currentMgmtItem.qty).toLocaleString()}` : '$0'}
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  if (window.lucide) {
    try { lucide.createIcons(); } catch(e) {}
  }
}

function setGlobalTerm(term) {
  globalSelectedTerm = term;
  const parentDevices = projectBOM.filter(i => !i.parentInstanceId && (i.role === "Access" || i.role === "Core" || i.role === "Aggregation" || i.role === "Security WAN"));

  parentDevices.forEach(dev => {
    dev.individualTerm = null;
    if (dev.selectedMgmtProfile && dev.selectedMgmtProfile !== "standalone") {
      applyManagementSubscription(dev.instanceId, dev.selectedMgmtProfile, globalSelectedTerm);
    }
  });

  updateBOMView();
  renderLicenseManagerContent();
  showToast(`Updated all cloud subscriptions to ${term} terms.`);
}

function setIndividualDeviceTerm(instanceId, term) {
  const dev = projectBOM.find(i => i.instanceId === instanceId);
  if (!dev) return;

  dev.individualTerm = term;
  applyManagementSubscription(instanceId, dev.selectedMgmtProfile, term);

  updateBOMView();
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

  updateBOMView();
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

  updateBOMView();
  renderLicenseManagerContent();
  showToast("Cleared non-mandatory subscriptions. Meraki retained required licenses.");
}

function updateSwitchMgmtProfile(instanceId, profileKey) {
  const dev = projectBOM.find(i => i.instanceId === instanceId);
  const term = (dev && dev.individualTerm) ? dev.individualTerm : globalSelectedTerm;
  applyManagementSubscription(instanceId, profileKey, term);

  updateBOMView();
  renderLicenseManagerContent();
  showToast("Updated management subscription.");
}

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
    const loc = i.closetName ? `[${i.closetName} / ${i.rackId || 'Rack-1'}] ` : '';
    txt += `${loc}[${i.qty}x] ${i.vendor} ${i.model} (SKU: ${i.sku}) - $${(i.msrp * i.qty).toLocaleString()}\n`;
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

  let csv = "Location,Rack,Role,Vendor,Model,SKU,Quantity,Unit MSRP,Total MSRP,PoE Budget,Power Watts\n";
  projectBOM.forEach(i => {
    const totalW = ((i.poeBudget || 0) + (i.baseWatts || 0)) * i.qty;
    csv += `"${i.closetName || 'General'}","${i.rackId || 'General'}","${i.role || 'Accessory'}","${i.vendor}","${i.model}","${i.sku}",${i.qty},${i.msrp},${i.msrp * i.qty},${i.poeBudget || 0},${totalW}\n`;
  });
  const link = document.createElement("a");
  link.href = "data:text/csv;charset=utf-8," + encodeURI(csv);
  link.download = `Security_Infrastructure_BOM_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  showToast("Exported BOM CSV.");
}