// =========================================================================
// PROJECT HEALTH & VALIDATION AUDIT ENGINE
// Dynamic scan for PoE deficits, unassigned gear, missing licenses, hardware
// =========================================================================

function auditProjectHealth() {
  const issues = [];
  if (typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) {
    return { isHealthy: true, issueCount: 0, criticalCount: 0, issues: [] };
  }

  // 1. PoE Deficit Audit
  let totalPoEAvailable = 0;
  let activeConnectedPoE = 0;
  let activeConnectedPorts = 0;

  projectBOM.forEach(item => {
    if (item.parentInstanceId) return;
    const isSw = (item.role === "Access" || item.role === "Aggregation" || item.role === "Industrial DIN-Rail Switch" || item.role === "Core / Spine");
    if (isSw) {
      const units = (item.stackedUnits && item.stackedUnits >= 2) ? item.stackedUnits : (item.qty || 1);
      totalPoEAvailable += (item.poeBudget || 0) * units;
    } else if (item.role !== "Structured Cabling" && item.role !== "Optics & DAC" && !item.role?.includes("License")) {
      const pwr = (typeof PortEngine !== "undefined") ? PortEngine.getDevicePowerSource(item) : (item.powerSource || "poe_switch");
      if (pwr === "poe_switch") {
        const draw = item.poeWattsDrawn || item.powerConsumptionWatts || item.baseWatts || 15;
        activeConnectedPoE += draw * (item.qty || 1);
        activeConnectedPorts += (item.ports || 1) * (item.qty || 1);
      }
    }
  });

  // Calculate target calculator camera demand if present
  let targetCalcWatts = 0;
  if (typeof calculatePoETarget === "function") {
    const target = calculatePoETarget();
    targetCalcWatts = target.budgetWithHeadroom || 0;
  }

  const demandWatts = Math.max(activeConnectedPoE, targetCalcWatts);
  if (demandWatts > totalPoEAvailable) {
    const deficitWatts = demandWatts - totalPoEAvailable;
    issues.push({
      id: "poe_deficit",
      category: "poe",
      severity: "critical",
      title: "PoE Power Budget Deficit",
      summary: `PoE Demand (${demandWatts}W) exceeds Switch Capacity (${totalPoEAvailable}W) by ${deficitWatts}W`,
      details: `Project requires ${demandWatts}W across connected edge devices and headroom targets, but total quoted switch PoE capacity is only ${totalPoEAvailable}W (${deficitWatts}W shortfall). Connected field hardware will suffer brownouts.`,
      actionLabel: "+ Auto-Add High-PoE Switch to MDF",
      actionFn: "autoAddPoeSupplyOrSwitch"
    });
  }

  // 2. Unassigned Equipment Audit
  const unassignedItems = projectBOM.filter(item => {
    if (item.parentInstanceId) return false;
    if (item.role === "Structured Cabling" || item.role === "Optics & DAC" || item.role?.includes("License")) return false;
    const loc = FacilityStore.normalize(item.closetName || item.rackId);
    return loc === FacilityStore.UNASSIGNED;
  });

  if (unassignedItems.length > 0) {
    const totalQty = unassignedItems.reduce((acc, i) => acc + (i.qty || 1), 0);
    issues.push({
      id: "unassigned_equipment",
      category: "assignment",
      severity: "critical",
      title: "Unassigned Physical Hardware",
      summary: `${totalQty} device${totalQty === 1 ? '' : 's'} staged without assigned Facility, Floor, or Rack`,
      details: `${unassignedItems.map(i => `${i.qty || 1}x ${i.model}`).join(', ')} currently have no mounting host assigned and cannot be routed.`,
      actionLabel: "Auto-Assign All to MDF • Rack-1",
      actionFn: "autoFixUnassignedGear"
    });
  }

  // 3. Missing Licenses Audit
  const cameraItems = projectBOM.filter(i => 
    !i.parentInstanceId && 
    (i.category === "cameras" || i.role === "Camera" || i.deviceType === "camera" || (i.model || '').toLowerCase().includes("camera"))
  );
  const totalCameras = cameraItems.reduce((acc, i) => acc + (i.qty || 1), 0);

  const licenseItems = projectBOM.filter(i => 
    i.role === "Mgmt License" || i.role === "Security License" || i.role === "Feature License" || (i.sku || '').startsWith("LIC-")
  );
  const totalLicenses = licenseItems.reduce((acc, i) => acc + (i.qty || 1), 0);

  if (totalCameras > 0 && totalLicenses < totalCameras) {
    const missingLic = totalCameras - totalLicenses;
    issues.push({
      id: "missing_licenses",
      category: "licensing",
      severity: "warning",
      title: "Missing VMS Camera Channel Licenses",
      summary: `${missingLic} Camera${missingLic === 1 ? '' : 's'} without VMS Core Channel Licenses`,
      details: `Project contains ${totalCameras} IP camera(s) but only ${totalLicenses} VMS recording license(s) have been added to the BOM. Cameras cannot record without valid channel keys.`,
      actionLabel: `+ Add ${missingLic} Missing VMS License${missingLic === 1 ? '' : 's'}`,
      actionFn: "autoAddMissingLicenses"
    });
  }

  // 4. Missing Hardware / Interconnects Audit (Stacking DACs)
  const stackedSwitches = projectBOM.filter(i => !i.parentInstanceId && i.stackedUnits >= 2);
  let requiredDACCables = 0;
  stackedSwitches.forEach(sw => {
    requiredDACCables += sw.stackedUnits;
  });

  const existingDACCables = projectBOM.filter(i => i.role === "Stacking Cable" || (i.role === "Optics & DAC" && (i.sku === "STACK-DAC-1M" || (i.model || '').includes("DAC")))).reduce((acc, i) => acc + (i.qty || 1), 0);

  if (requiredDACCables > 0 && existingDACCables < requiredDACCables) {
    const missingDAC = requiredDACCables - existingDACCables;
    issues.push({
      id: "missing_stack_dac",
      category: "hardware",
      severity: "critical",
      title: "Missing Switch Stacking DAC Cables",
      summary: `${missingDAC} Stacking DAC Cable${missingDAC === 1 ? '' : 's'} required for physical ring`,
      details: `${stackedSwitches.map(s => `${s.model} (${s.stackedUnits}-unit stack)`).join(', ')} require dedicated direct-attach copper cables to form a resilient virtual stack ring.`,
      actionLabel: `+ Add ${missingDAC} Stacking DAC Cable${missingDAC === 1 ? '' : 's'}`,
      actionFn: "autoAddMissingDACCables"
    });
  }

  return {
    isHealthy: issues.length === 0,
    issueCount: issues.length,
    criticalCount: issues.filter(i => i.severity === "critical").length,
    issues: issues
  };
}

function updateProjectHealthUI() {
  const audit = auditProjectHealth();

  // 1. Update Persistent Top-Bar Alert Pill
  const pill = document.getElementById("projectHealthPill");
  const icon = document.getElementById("projectHealthPillIcon");
  const label = document.getElementById("projectHealthPillLabel");
  const countBadge = document.getElementById("projectHealthPillCount");

  if (pill) {
    if (audit.isHealthy) {
      pill.className = "px-2.5 py-2 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-400 border border-emerald-800/80 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer";
      if (icon) {
        icon.setAttribute("data-lucide", "check-circle-2");
        icon.className = "w-4 h-4 text-emerald-400";
      }
      if (label) label.innerText = "System Healthy";
      if (countBadge) {
        countBadge.classList.add("hidden");
        countBadge.innerText = "0";
      }
      pill.title = "Project Health: 100% Validated. No PoE deficits or unassigned hardware.";
    } else {
      pill.className = "px-2.5 py-2 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-600/80 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer animate-pulse";
      if (icon) {
        icon.setAttribute("data-lucide", "alert-octagon");
        icon.className = "w-4 h-4 text-rose-400";
      }
      if (label) label.innerText = `${audit.issueCount} Project Miss${audit.issueCount === 1 ? '' : 'es'}`;
      if (countBadge) {
        countBadge.classList.remove("hidden");
        countBadge.innerText = audit.issueCount;
      }
      pill.title = `Project Health: ${audit.issueCount} Misses Detected! Click to inspect and resolve.`;
    }
  }

  // 2. Update BOM Drawer Dynamic Alert Strip
  const strip = document.getElementById("bomDeficitAlertStrip");
  if (strip) {
    if (audit.isHealthy) {
      strip.innerHTML = `
        <div class="flex items-center justify-between text-[11px] text-slate-400">
          <span class="flex items-center gap-1.5 text-emerald-400 font-medium">
            <i data-lucide="check-circle-2" class="w-3.5 h-3.5"></i> All Engineering Checks Passed
          </span>
          <button onclick="toggleProjectHealthModal()" class="text-indigo-400 hover:text-indigo-300 font-mono text-[10px] hover:underline cursor-pointer">
            Audit Details &rarr;
          </button>
        </div>
      `;
    } else {
      strip.innerHTML = `
        <div class="p-2.5 rounded-xl bg-rose-950/60 border border-rose-600/80 text-xs space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-rose-300 font-bold flex items-center gap-1.5">
              <i data-lucide="alert-octagon" class="w-4 h-4 text-rose-400"></i> ${audit.issueCount} Project Miss${audit.issueCount === 1 ? '' : 'es'} Detected
            </span>
            <button onclick="toggleProjectHealthModal()" class="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded text-[10px] shadow transition-all cursor-pointer">
              Review & Fix &rarr;
            </button>
          </div>
          <div class="text-[11px] text-rose-200/90 space-y-0.5 font-mono">
            ${audit.issues.map(iss => `<div class="truncate">&bull; ${escapeHTML(iss.summary)}</div>`).join('')}
          </div>
        </div>
      `;
    }
  }

  // 3. Update Modal if already open
  const modal = document.getElementById("projectHealthModal");
  if (modal && !modal.classList.contains("hidden")) {
    renderProjectHealthModal();
  }

  if (window.lucide) {
    try { lucide.createIcons(); } catch(e) {}
  }
}

function toggleProjectHealthModal() {
  const modal = document.getElementById("projectHealthModal");
  if (!modal) return;

  if (modal.classList.contains("hidden")) {
    modal.classList.remove("hidden");
    renderProjectHealthModal();
  } else {
    modal.classList.add("hidden");
  }
}

function renderProjectHealthModal() {
  const audit = auditProjectHealth();
  const content = document.getElementById("projectHealthModalContent");
  const badge = document.getElementById("projectHealthModalBadge");
  const iconBox = document.getElementById("projectHealthModalIcon");

  if (badge) {
    if (audit.isHealthy) {
      badge.innerText = "100% Validated";
      badge.className = "text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800";
    } else {
      badge.innerText = `${audit.issueCount} Miss${audit.issueCount === 1 ? '' : 'es'} Requiring Action`;
      badge.className = "text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-700 animate-pulse";
    }
  }

  if (iconBox) {
    if (audit.isHealthy) {
      iconBox.className = "p-2 rounded-xl bg-emerald-950/80 text-emerald-400 border border-emerald-800/80";
      iconBox.innerHTML = `<i data-lucide="shield-check" class="w-5 h-5"></i>`;
    } else {
      iconBox.className = "p-2 rounded-xl bg-rose-950/80 text-rose-400 border border-rose-700/80";
      iconBox.innerHTML = `<i data-lucide="alert-octagon" class="w-5 h-5"></i>`;
    }
  }

  if (!content) return;

  if (audit.isHealthy) {
    content.innerHTML = `
      <div class="py-10 text-center space-y-3">
        <div class="w-16 h-16 rounded-full bg-emerald-950 border border-emerald-700/80 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-900/30">
          <i data-lucide="check-check" class="w-8 h-8"></i>
        </div>
        <h3 class="text-base font-bold text-white">All Engineering Validations Passed</h3>
        <p class="text-xs text-slate-300 max-w-md mx-auto">
          PoE headroom is satisfied, all physical hardware is assigned to valid spaces/racks, required camera recording licenses are accounted for, and virtual stacking DAC cables are included.
        </p>
        <div class="pt-2">
          <button onclick="toggleProjectHealthModal()" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold cursor-pointer">
            Return to Design Canvas
          </button>
        </div>
      </div>
    `;
  } else {
    content.innerHTML = `
      <div class="space-y-4">
        <!-- Top Action Banner -->
        <div class="p-4 rounded-2xl bg-rose-950/40 border border-rose-800/80 flex items-center justify-between flex-wrap gap-3">
          <div class="flex items-center gap-3">
            <div class="p-2.5 rounded-xl bg-rose-900/60 text-rose-300 border border-rose-700/60">
              <i data-lucide="alert-triangle" class="w-6 h-6"></i>
            </div>
            <div>
              <h3 class="text-sm font-bold text-white flex items-center gap-2">
                <span>${audit.issueCount} Action Item${audit.issueCount === 1 ? '' : 's'} Required</span>
                <span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-900 text-rose-200 border border-rose-700">${audit.criticalCount} Critical</span>
              </h3>
              <p class="text-xs text-slate-300">${audit.criticalCount} Critical Deficit${audit.criticalCount === 1 ? '' : 's'} &bull; ${audit.issueCount - audit.criticalCount} Advisory Warnings detected.</p>
            </div>
          </div>
          <button onclick="autoFixAllProjectMisses()" class="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-rose-900/40 flex items-center gap-2 cursor-pointer transition-all">
            <i data-lucide="wrench" class="w-4 h-4"></i>
            <span>1-Click Resolve All Misses</span>
          </button>
        </div>

        <!-- Issue Cards Grid -->
        <div class="space-y-3">
          ${audit.issues.map(iss => `
            <div class="p-4 rounded-xl bg-slate-950 border ${iss.severity === 'critical' ? 'border-rose-700/80' : 'border-amber-700/80'} space-y-2.5 shadow-md">
              <div class="flex items-center justify-between flex-wrap gap-2">
                <div class="flex items-center gap-2">
                  <span class="p-1.5 rounded-lg ${iss.severity === 'critical' ? 'bg-rose-950 text-rose-400 border border-rose-800' : 'bg-amber-950 text-amber-400 border border-amber-800'}">
                    <i data-lucide="${iss.severity === 'critical' ? 'alert-octagon' : 'alert-triangle'}" class="w-4 h-4"></i>
                  </span>
                  <span class="text-xs font-bold text-white">${escapeHTML(iss.title)}</span>
                </div>
                <span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase ${iss.severity === 'critical' ? 'bg-rose-950 text-rose-400 border border-rose-800' : 'bg-amber-950 text-amber-300 border border-amber-800'}">
                  ${iss.severity === 'critical' ? 'Critical Deficit' : 'Engineering Warning'}
                </span>
              </div>
              <p class="text-xs text-slate-200 font-mono font-medium">${escapeHTML(iss.summary)}</p>
              <p class="text-[11px] text-slate-400">${escapeHTML(iss.details)}</p>
              <div class="pt-2 border-t border-slate-800 flex items-center justify-between flex-wrap gap-2">
                <span class="text-[10px] text-slate-500 uppercase tracking-wider font-mono">Suggested Remediation:</span>
                <button onclick="${iss.actionFn}()" class="px-3.5 py-1.5 ${iss.severity === 'critical' ? 'bg-rose-600 hover:bg-rose-500' : 'bg-amber-600 hover:bg-amber-500'} text-white font-bold rounded-lg text-xs shadow flex items-center gap-1.5 cursor-pointer transition-all">
                  <i data-lucide="check" class="w-3.5 h-3.5"></i>
                  <span>${escapeHTML(iss.actionLabel)}</span>
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  if (window.lucide) {
    try { lucide.createIcons(); } catch(e) {}
  }
}

// -----------------------------------------------------------
// 1-Click Project Health Resolution Handlers
// -----------------------------------------------------------
function autoFixUnassignedGear() {
  if (typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) return;
  const locations = typeof FacilityStore !== "undefined" ? FacilityStore.getLocationNames(false) : [];
  const targetLoc = locations.find(l => l.includes("MDF") || l.includes("Rack-1")) || locations[0] || "MDF • Rack-1";

  let fixedCount = 0;
  projectBOM.forEach(item => {
    if (item.parentInstanceId) return;
    if (item.role === "Structured Cabling" || item.role === "Optics & DAC" || item.role?.includes("License")) return;
    const loc = FacilityStore.normalize(item.closetName || item.rackId);
    if (loc === FacilityStore.UNASSIGNED) {
      item.closetName = targetLoc;
      item.rackId = targetLoc;
      item.rackSlot = null;
      fixedCount++;
    }
  });

  if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
    FacilityStore.notifyWorkspaceChange();
  }
  updateBOMView();
  updateProjectHealthUI();
  if (typeof showToast === "function") {
    showToast(`Assigned ${fixedCount} item${fixedCount === 1 ? '' : 's'} to ${targetLoc}`);
  }
}

function autoAddMissingLicenses() {
  if (typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) return;
  const cameraItems = projectBOM.filter(i => 
    !i.parentInstanceId && 
    (i.category === "cameras" || i.role === "Camera" || i.deviceType === "camera" || (i.model || '').toLowerCase().includes("camera"))
  );
  const totalCameras = cameraItems.reduce((acc, i) => acc + (i.qty || 1), 0);

  const licenseItems = projectBOM.filter(i => 
    i.role === "Mgmt License" || i.role === "Security License" || i.role === "Feature License" || (i.sku || '').startsWith("LIC-")
  );
  const totalLicenses = licenseItems.reduce((acc, i) => acc + (i.qty || 1), 0);
  const missing = Math.max(0, totalCameras - totalLicenses);

  if (missing > 0) {
    projectBOM.push({
      instanceId: `lic-cam-${Date.now()}`,
      id: "LIC-VMS-CAM-CORE",
      model: "VMS Enterprise Single Camera Channel Recording License (Perpetual)",
      sku: "LIC-VMS-CAM-CORE",
      role: "Security License",
      vendor: "Milestone / Network Optix",
      msrp: 180,
      poeBudget: 0,
      baseWatts: 0,
      qty: missing,
      closetName: "MDF • Rack-1",
      rackId: "MDF • Rack-1",
      rackSlot: null
    });
  }

  if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
    FacilityStore.notifyWorkspaceChange();
  }
  updateBOMView();
  updateProjectHealthUI();
  if (typeof showToast === "function") {
    showToast(`Added ${missing} VMS Camera Channel License${missing === 1 ? '' : 's'} to Quote BOM.`);
  }
}

function autoAddMissingDACCables() {
  if (typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) return;
  const stackedSwitches = projectBOM.filter(i => !i.parentInstanceId && i.stackedUnits >= 2);
  let required = 0;
  stackedSwitches.forEach(sw => { required += sw.stackedUnits; });

  const existing = projectBOM.filter(i => i.role === "Stacking Cable" || (i.role === "Optics & DAC" && (i.sku === "STACK-DAC-1M" || (i.model || '').includes("DAC")))).reduce((acc, i) => acc + (i.qty || 1), 0);
  const missing = Math.max(0, required - existing);

  if (missing > 0) {
    const existingEntry = projectBOM.find(i => i.sku === "STACK-DAC-1M");
    if (existingEntry) {
      existingEntry.qty += missing;
    } else {
      projectBOM.push({
        instanceId: `stack-dac-${Date.now()}`,
        id: "STACK-DAC-1M",
        model: "10G/25G Direct Attach Passive Copper Stacking Cable (1 Meter)",
        sku: "STACK-DAC-1M",
        role: "Optics & DAC",
        vendor: "Generic / OEM",
        msrp: 65,
        poeBudget: 0,
        baseWatts: 0,
        qty: missing,
        closetName: "MDF • Rack-1",
        rackId: "MDF • Rack-1",
        rackSlot: null
      });
    }
  }

  if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
    FacilityStore.notifyWorkspaceChange();
  }
  updateBOMView();
  updateProjectHealthUI();
  if (typeof showToast === "function") {
    showToast(`Added ${missing} Stacking DAC Cable${missing === 1 ? '' : 's'} to Quote BOM.`);
  }
}

function autoAddPoeSupplyOrSwitch() {
  if (typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) return;
  projectBOM.push({
    instanceId: `sw-poe-high-${Date.now()}`,
    id: "CBS350-24FP-4X",
    model: "Cisco Business 350 24-Port Full PoE+ Gigabit Managed Switch (370W)",
    sku: "CBS350-24FP-4X",
    role: "Access",
    vendor: "Cisco",
    msrp: 1150,
    ports: 24,
    poeBudget: 370,
    baseWatts: 45,
    rackUnits: 1,
    depthInches: 13.8,
    uplinkMode: "single",
    qty: 1,
    closetName: "MDF • Rack-1",
    rackId: "MDF • Rack-1",
    rackSlot: null
  });

  if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
    FacilityStore.notifyWorkspaceChange();
  }
  updateBOMView();
  updateProjectHealthUI();
  if (typeof showToast === "function") {
    showToast("Added 370W Full PoE+ Switch to MDF to resolve power deficit.");
  }
}

function autoFixAllProjectMisses() {
  const audit = auditProjectHealth();
  if (audit.isHealthy) return;

  const hasUnassigned = audit.issues.some(i => i.id === "unassigned_equipment");
  const hasLicenses = audit.issues.some(i => i.id === "missing_licenses");
  const hasDAC = audit.issues.some(i => i.id === "missing_stack_dac");
  const hasPoE = audit.issues.some(i => i.id === "poe_deficit");

  if (hasUnassigned) autoFixUnassignedGear();
  if (hasLicenses) autoAddMissingLicenses();
  if (hasDAC) autoAddMissingDACCables();
  if (hasPoE) autoAddPoeSupplyOrSwitch();

  updateBOMView();
  updateProjectHealthUI();
  if (typeof showToast === "function") {
    showToast("1-Click Remediation Complete: All engineering misses resolved!");
  }
}


// Window Compatibility Exports
window.auditProjectHealth = auditProjectHealth;
window.updateProjectHealthUI = updateProjectHealthUI;
window.toggleProjectHealthModal = toggleProjectHealthModal;
window.renderProjectHealthModal = renderProjectHealthModal;
window.autoFixUnassignedGear = autoFixUnassignedGear;
window.autoAddMissingLicenses = autoAddMissingLicenses;
window.autoAddMissingDACCables = autoAddMissingDACCables;
window.autoAddPoeSupplyOrSwitch = autoAddPoeSupplyOrSwitch;
window.autoFixAllProjectMisses = autoFixAllProjectMisses;
