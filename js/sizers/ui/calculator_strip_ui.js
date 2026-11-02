// SUBSYSTEM: Sizer UI — PoE Calculator, RF Strip, Video Storage/Failover Studio & Calculators Modal (js/sizers/ui/calculator_strip_ui.js)

// -----------------------------------------------------------
// Sizing Strip & Headroom Engine
// -----------------------------------------------------------
function calculatePoETarget() {
  if (typeof NetworkSizer !== "undefined" && typeof NetworkSizer.calculatePoEPlan === "function") {
    const plan = NetworkSizer.calculatePoEPlan(demandCounts, {
      headroomPercent: extraHeadroomPercent || 20
    });
    return {
      rawWatts: plan.rawWattsPSE,
      budgetWithHeadroom: plan.budgetWithHeadroom,
      totalCameras: plan.totalDevices,
      demandCounts: plan.demandCounts,
      rawWattsPSE: plan.rawWattsPSE,
      rawWattsPD: plan.rawWattsPD,
      cableLossWatts: plan.estimatedCableLossWatts,
      headroomWatts: plan.headroomWatts,
      headroomPercent: plan.headroomPercent,
      plan: plan
    };
  }

  // Graceful fallback
  const wattsAf = (demandCounts.af || 0) * 15.4;
  const wattsAt = (demandCounts.at || 0) * 30;
  const wattsBt60 = (demandCounts.bt60 || 0) * 60;
  const wattsBt90 = (demandCounts.bt90 || 0) * 90;

  const rawWatts = wattsAf + wattsAt + wattsBt60 + wattsBt90;
  const factor = 1 + ((extraHeadroomPercent || 20) / 100);
  const budgetWithHeadroom = Math.ceil(rawWatts * factor);
  const totalCameras = (demandCounts.af || 0) + (demandCounts.at || 0) + (demandCounts.bt60 || 0) + (demandCounts.bt90 || 0);

  return {
    rawWatts,
    budgetWithHeadroom,
    totalCameras,
    demandCounts
  };
}

function updateDemandInput(field, val) {
  demandCounts[field] = Math.max(0, parseInt(val, 10) || 0);
  buildCalculatorStrip();
  buildSidebarFilters();
  runActiveFilter();
  if (typeof FacilityStore !== "undefined") FacilityStore.notifyWorkspaceChange();
  if (typeof StorageService !== "undefined") StorageService.queueAutoSave();
}

function resetDemandInputs() {
  demandCounts = { af: 0, at: 0, bt60: 0, bt90: 0 };
  buildCalculatorStrip();
  buildSidebarFilters();
  runActiveFilter();
  if (typeof FacilityStore !== "undefined") FacilityStore.notifyWorkspaceChange();
  if (typeof StorageService !== "undefined") StorageService.queueAutoSave();
  showToast("PoE demand targets reset to 0.");
}

function getGenericCameraTypeCountInBom(genericTypeId) {
  if (!genericTypeId || typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) return 0;
  return projectBOM
    .filter(i => !i.parentInstanceId && (i.role === "Camera" || i.category === "camera" || i.category === "cameras") &&
      (i.genericCameraTypeId === genericTypeId || i.originGenericTypeId === genericTypeId || i.id === genericTypeId || i.sku === genericTypeId))
    .reduce((sum, i) => sum + (parseInt(i.qty, 10) || 1), 0);
}
window.getGenericCameraTypeCountInBom = getGenericCameraTypeCountInBom;

function setGenericCameraTypeCountFromSizer(genericTypeId, targetQty) {
  if (!genericTypeId || typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) return;

  const desired = Math.max(0, Math.min(500, parseInt(targetQty, 10) || 0));

  if (typeof unbundleMultiQtyCameras === "function") {
    unbundleMultiQtyCameras(projectBOM);
  }

  const matchingInstances = projectBOM.filter(i =>
    !i.parentInstanceId &&
    (i.role === "Camera" || i.category === "camera" || i.category === "cameras") &&
    (i.genericCameraTypeId === genericTypeId || i.originGenericTypeId === genericTypeId || i.id === genericTypeId || i.sku === genericTypeId)
  );

  const currentCount = matchingInstances.length;
  if (desired === currentCount) return;

  if (desired > currentCount) {
    const toAdd = desired - currentCount;
    let targetLoc = poeCalcTargetLocation;
    if (!targetLoc && typeof FacilityStore !== "undefined") {
      const locs = FacilityStore.getLocationNames(false);
      if (locs.length > 0) {
        targetLoc = locs.find(l => l.includes("IDF")) || locs[0];
      }
    }
    if (typeof addCameraToBOM === "function") {
      addCameraToBOM(genericTypeId, targetLoc || null, null, toAdd);
    }
  } else {
    const toRemove = currentCount - desired;
    // Prefer removing unplaced instances first (from newest to oldest)
    const placedIds = new Set(
      (typeof floorplanState !== "undefined" && Array.isArray(floorplanState.deviceDrops))
        ? floorplanState.deviceDrops.map(d => d.instanceId)
        : []
    );
    const sortedForRemoval = [...matchingInstances].reverse().sort((a, b) => {
      const aPlaced = placedIds.has(a.instanceId) ? 1 : 0;
      const bPlaced = placedIds.has(b.instanceId) ? 1 : 0;
      return aPlaced - bPlaced;
    });

    const idsToRemove = new Set(sortedForRemoval.slice(0, toRemove).map(i => i.instanceId));

    // Clean up switch port allocations and physical drops for removed cameras
    projectBOM.forEach(item => {
      if (idsToRemove.has(item.instanceId)) {
        if (item.uplinkTargetId && item.assignedSwitchPort && typeof PortEngine !== "undefined") {
          const hostSw = projectBOM.find(s => s.instanceId === item.uplinkTargetId);
          if (hostSw && typeof PortEngine.disconnectPort === "function") {
            PortEngine.disconnectPort(hostSw, item.assignedSwitchPort);
          }
        }
        if (typeof removePhysicalLayoutDropByInstanceId === "function") {
          removePhysicalLayoutDropByInstanceId(item.instanceId);
        }
      }
    });

    projectBOM = projectBOM.filter(i => !idsToRemove.has(i.instanceId) && !idsToRemove.has(i.parentInstanceId));
    window.projectBOM = projectBOM;

    if (typeof DeviceTaxonomy !== "undefined" && typeof DeviceTaxonomy.recalculateNumbers === "function") {
      DeviceTaxonomy.recalculateNumbers(projectBOM);
    }
  }

  // Keep VideoStorageSizer synced with BOM cameras
  if (typeof VideoStorageSizer !== "undefined" && VideoStorageSizer.state) {
    VideoStorageSizer.state.hasCustomGroups = false;
    VideoStorageSizer.state.sourceMode = "auto";
    videoSourceMode = "auto";
    window.videoSourceMode = "auto";
  }

  deriveDemandFromBOM(true);
  renderGlobalDesignModeToggle();
  if (typeof updateBOMView === "function") updateBOMView();
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
  if (typeof buildSidebarFilters === "function") buildSidebarFilters();
  if (typeof runActiveFilter === "function") runActiveFilter();
}
window.setGenericCameraTypeCountFromSizer = setGenericCameraTypeCountFromSizer;

function adjustGenericCameraTypeCountFromSizer(genericTypeId, delta) {
  const cur = getGenericCameraTypeCountInBom(genericTypeId);
  setGenericCameraTypeCountFromSizer(genericTypeId, Math.max(0, cur + (parseInt(delta, 10) || 0)));
}
window.adjustGenericCameraTypeCountFromSizer = adjustGenericCameraTypeCountFromSizer;

function clearAllGenericCamerasFromSizer() {
  if (typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) return;
  const genericTypes = typeof GENERIC_CAMERA_TYPES !== "undefined" ? GENERIC_CAMERA_TYPES : [];
  genericTypes.forEach(g => {
    if (getGenericCameraTypeCountInBom(g.id) > 0) {
      setGenericCameraTypeCountFromSizer(g.id, 0);
    }
  });
  demandCounts = { af: 0, at: 0, bt60: 0, bt90: 0 };
  buildCalculatorStrip();
  buildSidebarFilters();
  runActiveFilter();
  if (typeof showToast === "function") {
    showToast("Cleared all generic camera counts from PoE Sizer & Project BOM.");
  }
}
window.clearAllGenericCamerasFromSizer = clearAllGenericCamerasFromSizer;

function deriveDemandFromBOM(silent = false) {
  if (typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) {
    if (!silent && typeof showToast === "function") showToast("Project BOM is empty.");
    return;
  }

  let countAf = 0;
  let countAt = 0;
  let countBt60 = 0;
  let countBt90 = 0;
  let edgeDeviceCount = 0;

  projectBOM.forEach(item => {
    // Filter out switches, servers, PDUs, UPS, structured cabling, licenses, and optics
    const role = (item.role || "").toLowerCase();
    const cat = (item.category || "").toLowerCase();
    const model = (item.model || "").toLowerCase();

    const isNonEdge = role.includes("switch") || role === "access" || role === "core" || role === "aggregation" ||
                      role === "server" || role === "workstation" || role === "storage" || role === "ups" || role === "pdu" ||
                      role === "structured cabling" || role === "optics & dac" || role.includes("license") ||
                      item.source === "cabling_sync" || item.source === "topology_auto_sync";
    if (isNonEdge) return;

    // Check if device is powered via PoE
    const isCamera = role === "camera" || cat.includes("camera") || item.deviceType === "camera" || model.includes("camera");
    const isAccess = role === "access control" || cat.includes("access") || model.includes("controller") || model.includes("reader");
    const isWireless = role === "wireless" || role === "wireless bridge" || cat.includes("wireless") || model.includes("access point");
    const isIntercom = role.includes("intercom") || model.includes("intercom") || model.includes("speaker");
    const hasPoeAttr = Boolean(item.poeStandard || item.poeWattsDrawn || (item.powerConsumptionWatts && item.powerSource !== "dual_ac" && item.powerSource !== "internal_ac"));

    if (isCamera || isAccess || isWireless || isIntercom || hasPoeAttr) {
      const qty = Math.max(1, parseInt(item.qty, 10) || 1);
      const std = (item.poeStandard || "").toLowerCase();
      const watts = parseFloat(item.maxPowerWatts || item.powerConsumptionWatts || item.poeWattsDrawn || item.baseWatts || (isCamera ? 12 : 15));

      edgeDeviceCount += qty;

      if (item.poeTierKey === "bt90" || std.includes("bt4") || std.includes("90w") || std.includes("type 4") || watts > 60) {
        countBt90 += qty;
      } else if (item.poeTierKey === "bt60" || std.includes("bt") || std.includes("60w") || std.includes("type 3") || watts > 30) {
        countBt60 += qty;
      } else if (item.poeTierKey === "at" || std.includes("at") || std.includes("poe+") || watts > 15.4) {
        countAt += qty;
      } else {
        countAf += qty;
      }
    }
  });

  if (edgeDeviceCount === 0 && !silent) {
    if (typeof showToast === "function") showToast("No PoE edge devices (cameras, access, APs) found in quote.");
    return;
  }

  demandCounts.af = countAf;
  demandCounts.at = countAt;
  demandCounts.bt60 = countBt60;
  demandCounts.bt90 = countBt90;

  renderGlobalDesignModeToggle();
  buildCalculatorStrip();
  buildSidebarFilters();
  runActiveFilter();

  if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
    FacilityStore.notifyWorkspaceChange();
  }
  if (typeof StorageService !== "undefined" && typeof StorageService.queueAutoSave === "function") {
    StorageService.queueAutoSave();
  }

  if (!silent) {
    const p = calculatePoETarget();
    if (typeof showToast === "function") {
      showToast(`Derived demands from BOM: ${edgeDeviceCount} edge devices (${countAf} af, ${countAt} at, ${countBt60} bt60, ${countBt90} bt90) totaling ${p.budgetWithHeadroom}W required.`);
    }
  }
}

function updateHeadroom(val, skipConfirm = false) {
  const targetHr = parseInt(val, 10) || 20;
  const defs = (typeof StorageService !== "undefined" && typeof StorageService.getProjectDefaults === "function")
    ? StorageService.getProjectDefaults()
    : null;
  const defHr = parseInt(defs?.network?.poeHeadroomPercent, 10) || 20;

  if (!skipConfirm && defs && targetHr !== extraHeadroomPercent && targetHr !== defHr && typeof confirmProjectDefaultChange === "function" && !(typeof isProjectWizardOpen === "function" && isProjectWizardOpen())) {
    confirmProjectDefaultChange({
      title: "Change PoE Power Sizing Reserve Buffer?",
      settingLabel: "PoE Engineering Reserve Buffer",
      defaultLabel: `+${defHr}% Buffer`,
      newLabel: `+${targetHr}% Buffer`,
      message: `Your Project Default PoE Power Reserve Buffer is set to +${defHr}%. Are you sure you want to change it to +${targetHr}%?`,
      allowLocalOverride: true,
      localOverrideLabel: `Use +${targetHr}% Here Only`,
      updateDefaultLabel: `Update Project Default to +${targetHr}%`,
      onLocalOverride: () => updateHeadroom(targetHr, true),
      onUpdateDefault: () => {
        if (typeof updateSingleProjectDefault === "function") {
          updateSingleProjectDefault(d => { if (!d.network) d.network = {}; d.network.poeHeadroomPercent = targetHr; });
        }
        updateHeadroom(targetHr, true);
      },
      onCancel: () => buildCalculatorStrip()
    });
    return;
  }

  extraHeadroomPercent = targetHr;
  window.extraHeadroomPercent = targetHr;
  if (typeof AppState !== "undefined" && AppState) AppState.extraHeadroomPercent = targetHr;
  buildCalculatorStrip();
  runActiveFilter();
  if (typeof FacilityStore !== "undefined") FacilityStore.notifyWorkspaceChange();
  if (typeof StorageService !== "undefined") StorageService.queueAutoSave();
}

function setOpticQuickFilter(preset) {
  if (preset === "10g_dac") {
    selectedOpticSpeeds = ["10G"];
    selectedOpticMediums = ["dac"];
  } else if (preset === "10g_sr") {
    selectedOpticSpeeds = ["10G"];
    selectedOpticMediums = ["mmf"];
  } else if (preset === "10g_lr") {
    selectedOpticSpeeds = ["10G"];
    selectedOpticMediums = ["smf"];
  } else if (preset === "25g") {
    selectedOpticSpeeds = ["25G"];
    selectedOpticMediums = [];
  } else if (preset === "100g") {
    selectedOpticSpeeds = ["100G"];
    selectedOpticMediums = [];
  } else if (preset === "stacking") {
    selectedOpticSpeeds = [];
    selectedOpticMediums = ["stacking"];
  } else if (preset === "reset") {
    selectedOpticSpeeds = [];
    selectedOpticMediums = [];
    selectedOpticFormFactor = "all";
    requireOpticIndustrial = false;
  }

  buildSidebarFilters();
  runActiveFilter();
}

function renderPoeCalculatorStudioHtml() {
  const p = calculatePoETarget();
  const hasDemand = p.totalCameras > 0;
  const isCameraTypesInput = poeCalcInputMode === "camera_types";
  const genericTypes = typeof GENERIC_CAMERA_TYPES !== "undefined" ? GENERIC_CAMERA_TYPES : [];

  // Resolve available closets/racks for newly added cameras from PoE Sizer
  const allLocs = typeof FacilityStore !== "undefined" ? FacilityStore.getLocationNames(false) : ["IDF-1 • Rack-1", "MDF • Rack-1"];
  if (!poeCalcTargetLocation && allLocs.length > 0) {
    poeCalcTargetLocation = allLocs.find(l => l.includes("IDF")) || allLocs[0];
  }

  const shortLabels = {
    "gen-cam-2mp-1080p": "Single 2MP (1080p)",
    "gen-cam-4mp": "Single 4MP (2K)",
    "gen-cam-5mp": "Single 5MP",
    "gen-cam-8mp-4k": "Single 8MP (4K)",
    "gen-cam-6mp-360": "6MP 360° Fisheye",
    "gen-cam-12mp-360": "12MP 360° Fisheye",
    "gen-cam-dual-1080p": "Dual-Sensor 1080P",
    "gen-cam-quad-4mp": "Quad-Sensor 4MP",
    "gen-cam-5sensor-ptz": "5-Sensor + PTZ",
    "gen-cam-ptz": "PTZ Camera",
    "gen-cam-lpr-60w": "LPR Camera (60W)"
  };

  const totalSyncedGenericCams = genericTypes.reduce((sum, g) => sum + getGenericCameraTypeCountInBom(g.id), 0);

  return `
    <div class="bg-slate-900/95 border border-slate-800 rounded-2xl p-3.5 sm:p-4 flex flex-col gap-3.5 shadow-lg">
      <!-- Top Row: Title, Design Mode Switcher, Input Mode Switcher & Live PoE Budget Summary -->
      <div class="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div class="flex items-start sm:items-center gap-3">
          <div class="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
            <i data-lucide="zap" class="w-5 h-5"></i>
          </div>
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <h4 class="text-xs font-bold text-white uppercase tracking-wider">
                PoE Power Budget &amp; Edge Capacity Calculator
              </h4>

              <!-- PoE Input Mode Toggle: By Generic Camera Types vs By PoE Class -->
              <div class="inline-flex items-center p-0.5 rounded-xl bg-slate-950 border border-slate-800">
                <button
                  type="button"
                  onclick="setPoeCalcInputMode('camera_types')"
                  class="px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${isCameraTypesInput ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}"
                  title="Enter camera counts by Generic Type & Resolution (2MP, 4MP, 5MP, 8MP 4K, 360°, Dual/Quad/5-Sensor, PTZ, 60W LPR). Automatically syncs to BOM, PoE Classes, and Server Storage Calculator!"
                >
                  <i data-lucide="camera" class="w-3.5 h-3.5"></i>
                  <span>By Camera Types (Syncs BOM &amp; Storage)</span>
                </button>
                <button
                  type="button"
                  onclick="setPoeCalcInputMode('poe_classes')"
                  class="px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${!isCameraTypesInput ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}"
                  title="Enter raw IEEE 802.3 PoE Class port counts directly (15W af, 30W at, 60W bt, 90W bt)"
                >
                  <i data-lucide="zap" class="w-3.5 h-3.5"></i>
                  <span>By PoE Class (15W / 30W / 60W / 90W)</span>
                </button>
              </div>
            </div>
            <p class="text-[11px] text-slate-400 mt-0.5">
              ${isCameraTypesInput
                ? 'Enter camera counts by type below to <strong class="text-emerald-300">auto-sync across Switch PoE sizing, Quote BOM, Physical Security, and Video Storage / Genetec Archiver calculations</strong>.'
                : 'Spec connected PoE ports by IEEE 802.3 class to compute continuous PSE wattage, cable dissipation, and filter matching switches.'}
            </p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2.5 text-xs">
          <!-- 15.4W af -->
          <div class="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 hover:border-slate-700 transition-colors" title="IEEE 802.3af: 15.4W PSE / 12.95W PD">
            <span class="text-[10px] font-mono text-slate-400 font-semibold uppercase">15W (af):</span>
            <input type="number" min="0" max="500" value="${demandCounts.af || 0}" onchange="updateDemandInput('af', this.value)" class="w-9 bg-transparent text-center font-mono font-bold text-white focus:outline-none" />
          </div>

          <!-- 30W at -->
          <div class="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 hover:border-slate-700 transition-colors" title="IEEE 802.3at: 30W PSE / 25.5W PD (PoE+)">
            <span class="text-[10px] font-mono text-slate-400 font-semibold uppercase">30W (at):</span>
            <input type="number" min="0" max="500" value="${demandCounts.at || 0}" onchange="updateDemandInput('at', this.value)" class="w-9 bg-transparent text-center font-mono font-bold text-sky-400 focus:outline-none" />
          </div>

          <!-- 60W bt Type 3 -->
          <div class="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 hover:border-slate-700 transition-colors" title="IEEE 802.3bt Type 3: 60W PSE / 51W PD (PoE++ / 4PPoE)">
            <span class="text-[10px] font-mono text-slate-400 font-semibold uppercase">60W (bt):</span>
            <input type="number" min="0" max="500" value="${demandCounts.bt60 || 0}" onchange="updateDemandInput('bt60', this.value)" class="w-9 bg-transparent text-center font-mono font-bold text-rose-400 focus:outline-none" />
          </div>

          <!-- 90W bt Type 4 -->
          <div class="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 hover:border-slate-700 transition-colors" title="IEEE 802.3bt Type 4: 90W PSE / 71.3W PD (High-Power PoE++)">
            <span class="text-[10px] font-mono text-slate-400 font-semibold uppercase">90W (bt):</span>
            <input type="number" min="0" max="500" value="${demandCounts.bt90 || 0}" onchange="updateDemandInput('bt90', this.value)" class="w-9 bg-transparent text-center font-mono font-bold text-amber-400 focus:outline-none" />
          </div>

          <!-- Auto-Derive from BOM Button -->
          <button onclick="deriveDemandFromBOM()" class="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl transition-all font-semibold text-[11px] cursor-pointer" title="Auto-detect PoE demands from devices in project BOM">
            <i data-lucide="sparkles" class="w-3.5 h-3.5"></i>
            <span>Derive from BOM</span>
          </button>

          <!-- Telemetry & Headroom Buffer Selection -->
          <div class="flex items-center gap-3 border-l border-slate-800 pl-3">
            <div class="text-right">
              <span class="text-[10px] text-slate-400 uppercase font-mono block">
                Required Budget (+${extraHeadroomPercent}%):
              </span>
              <div class="flex items-baseline justify-end gap-1.5">
                <span class="text-sm font-mono font-black text-amber-400">${p.budgetWithHeadroom} W</span>
                ${p.rawWattsPD ? `<span class="text-[10px] text-slate-500 font-mono" title="Estimated device draw: ${p.rawWattsPD}W, Cable loss: ${p.cableLossWatts || 0}W">(${p.rawWatts || 0}W PSE)</span>` : ''}
              </div>
            </div>

            <select onchange="updateHeadroom(this.value)" class="bg-slate-950 border border-slate-800 text-[11px] font-semibold rounded-lg px-2 py-1.5 text-slate-300 focus:outline-none focus:border-amber-500">
              <option value="10" ${extraHeadroomPercent === 10 ? 'selected' : ''}>+10% Buffer</option>
              <option value="15" ${extraHeadroomPercent === 15 ? 'selected' : ''}>+15% Buffer</option>
              <option value="20" ${extraHeadroomPercent === 20 ? 'selected' : ''}>+20% Buffer</option>
              <option value="25" ${extraHeadroomPercent === 25 ? 'selected' : ''}>+25% Buffer</option>
              <option value="30" ${extraHeadroomPercent === 30 ? 'selected' : ''}>+30% Buffer</option>
            </select>

            ${hasDemand ? `
              <button onclick="resetDemandInputs()" class="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors" title="Clear Demand Targets">
                <i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i>
              </button>
            ` : ''}
          </div>
        </div>
      </div>

      ${isCameraTypesInput ? `
        <!-- Interactive Generic Camera Types PoE & Storage Sync Matrix -->
        <div class="bg-slate-950/90 border border-emerald-500/30 rounded-xl p-3 space-y-2.5">
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
            <div class="flex flex-wrap items-center gap-2">
              <span class="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-mono font-bold text-emerald-300 uppercase flex items-center gap-1">
                <i data-lucide="refresh-cw" class="w-3 h-3"></i> Live BOM &amp; Storage Sync
              </span>
              <span class="text-xs font-bold text-white">Enter Camera Counts by Generic Type (${totalSyncedGenericCams} Camera${totalSyncedGenericCams === 1 ? '' : 's'} Synced)</span>
              <div class="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2 py-0.5 text-[11px]">
                <span class="text-slate-400 font-mono text-[10px]">Assign Closet:</span>
                <select onchange="setPoeCalcTargetLocation(this.value)" class="bg-transparent text-indigo-300 font-bold text-[11px] focus:outline-none cursor-pointer">
                  ${allLocs.map(loc => `<option value="${escapeHTML(loc)}" class="bg-slate-900" ${poeCalcTargetLocation === loc ? 'selected' : ''}>${escapeHTML(loc)}</option>`).join('')}
                </select>
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-1.5">
              <button type="button" onclick="switchDomain('physical_security')" class="px-2.5 py-1 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/40 text-sky-300 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer" title="Open Physical Security Cameras tab to view camera cards or bulk-upgrade to actual SKUs">
                <i data-lucide="camera" class="w-3 h-3"></i>
                <span>Cameras / Upgrade SKUs &rarr;</span>
              </button>
              <button type="button" onclick="if(typeof TabManager !== 'undefined') TabManager.openTab('sizer_storage');" class="px-2.5 py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer" title="Open Video Storage, Archiver & Failover Calculator Studio">
                <i data-lucide="hard-drive" class="w-3 h-3"></i>
                <span>Storage &amp; Failover Sizer &rarr;</span>
              </button>
              <button type="button" onclick="if(typeof TabManager !== 'undefined') TabManager.openTab('sizer_workstation');" class="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer" title="Open Client Workstation Decoding Sizer Studio">
                <i data-lucide="monitor" class="w-3 h-3"></i>
                <span>Workstation Sizer &rarr;</span>
              </button>
              ${totalSyncedGenericCams > 0 ? `
                <button type="button" onclick="clearAllGenericCamerasFromSizer()" class="px-2 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800/60 text-rose-300 text-[10px] font-mono font-bold transition-all cursor-pointer" title="Clear all generic camera counts">
                  Clear Cameras
                </button>
              ` : ''}
            </div>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-2">
            ${genericTypes.map(g => {
              const cnt = getGenericCameraTypeCountInBom(g.id);
              const label = shortLabels[g.id] || g.model.replace("Generic ", "");
              const tierColor = g.poeTierKey === "bt60"
                ? "text-rose-300 border-rose-500/40 bg-rose-500/10"
                : (g.poeTierKey === "at" ? "text-sky-300 border-sky-500/40 bg-sky-500/10" : "text-amber-300 border-amber-500/40 bg-amber-500/10");
              const tierShort = g.poeTierKey === "bt60" ? "60W bt" : (g.poeTierKey === "at" ? "30W at" : "15W af");
              return `
                <div class="flex flex-col justify-between p-2 rounded-xl border transition-all ${cnt > 0 ? 'bg-emerald-950/30 border-emerald-500/50 shadow-sm' : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'}">
                  <div class="flex items-start justify-between gap-1 mb-1.5">
                    <span class="text-[11px] font-bold ${cnt > 0 ? 'text-white' : 'text-slate-300'} leading-tight" title="${escapeHTML(g.model)} (${g.streamBitrateMbps} Mbps)">${escapeHTML(label)}</span>
                    <span class="px-1.5 py-0.2 rounded border text-[9px] font-mono font-bold shrink-0 ${tierColor}">${tierShort}</span>
                  </div>
                  <div class="flex items-center justify-between gap-1 mt-auto pt-1 border-t border-slate-800/70">
                    <span class="text-[9.5px] font-mono text-slate-400">${g.heads > 1 ? `${g.heads}x${g.mpPerHead}MP` : `${g.sensorMegapixels}MP`} &bull; ${g.streamBitrateMbps}M</span>
                    <div class="flex items-center bg-slate-950 border ${cnt > 0 ? 'border-emerald-500/60' : 'border-slate-700'} rounded-lg overflow-hidden">
                      <button type="button" onclick="adjustGenericCameraTypeCountFromSizer('${g.id}', -1)" class="px-1.5 py-0.5 text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-bold cursor-pointer">-</button>
                      <input
                        type="number"
                        min="0"
                        max="500"
                        value="${cnt}"
                        onchange="setGenericCameraTypeCountFromSizer('${g.id}', this.value)"
                        class="w-9 bg-transparent text-center font-mono text-xs font-bold ${cnt > 0 ? 'text-emerald-300' : 'text-slate-400'} focus:outline-none"
                      />
                      <button type="button" onclick="adjustGenericCameraTypeCountFromSizer('${g.id}', 1)" class="px-1.5 py-0.5 text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-bold cursor-pointer">+</button>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}
window.renderPoeCalculatorStudioHtml = renderPoeCalculatorStudioHtml;

function buildCalculatorStrip() {
  renderGlobalDesignModeToggle();
  if (typeof renderCalculatorStudioIfOpen === "function") {
    renderCalculatorStudioIfOpen();
  }
  const container = document.getElementById("calculatorStripContainer");
  if (!container) return;

  if (currentMode === "access") {
    container.classList.remove("hidden");
    const p = calculatePoETarget();
    const genericTypes = typeof GENERIC_CAMERA_TYPES !== "undefined" ? GENERIC_CAMERA_TYPES : [];
    const totalSyncedGenericCams = genericTypes.reduce((sum, g) => sum + getGenericCameraTypeCountInBom(g.id), 0);
    const showInlinePoe = Boolean(window.catalogShowInlinePoeCalc);

    container.innerHTML = `
      <div class="space-y-3">
        <div class="bg-slate-900/95 border border-slate-800 rounded-2xl px-3.5 py-2.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 shadow-md">
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
              <i data-lucide="zap" class="w-4 h-4"></i>
            </div>
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h4 class="text-xs font-bold text-white uppercase tracking-wider">Access &amp; Edge Switch Catalog</h4>
                <span class="px-2 py-0.5 rounded bg-amber-950/80 border border-amber-700/50 text-amber-300 font-mono text-[10px] font-bold">
                  PoE Target: ${p.budgetWithHeadroom}W (+${extraHeadroomPercent}% Buffer)
                </span>
                <span class="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300 font-mono text-[10px]">
                  ${demandCounts.af || 0} af &bull; ${demandCounts.at || 0} at &bull; ${demandCounts.bt60 || 0} bt60 &bull; ${demandCounts.bt90 || 0} bt90 (${totalSyncedGenericCams} Generic Cameras)
                </span>
              </div>
              <p class="text-[11px] text-slate-400">
                Use the dedicated <strong class="text-amber-300">PoE &amp; Switch Calculator Studio</strong> in the top navigation to size IEEE 802.3 PoE budgets and camera counts.
              </p>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2 shrink-0">
            <button type="button" onclick="deriveDemandFromBOM()" class="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer" title="Auto-detect PoE demands from devices in project BOM">
              <i data-lucide="sparkles" class="w-3.5 h-3.5"></i>
              <span>Derive from BOM</span>
            </button>
            <button type="button" onclick="window.catalogShowInlinePoeCalc = !window.catalogShowInlinePoeCalc; buildCalculatorStrip();" class="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer">
              <i data-lucide="${showInlinePoe ? 'chevron-up' : 'chevron-down'}" class="w-3.5 h-3.5 text-amber-400"></i>
              <span>${showInlinePoe ? 'Hide Inline Sizer' : 'Quick Inline Sizer'}</span>
            </button>
            <button type="button" onclick="if(typeof TabManager !== 'undefined') TabManager.openTab('sizer_poe');" class="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer">
              <i data-lucide="calculator" class="w-3.5 h-3.5"></i>
              <span>Open PoE Calculator Studio &rarr;</span>
            </button>
          </div>
        </div>
        ${showInlinePoe ? renderPoeCalculatorStudioHtml() : ''}
      </div>
    `;
    safeCreateIcons(container);
  } else if (currentMode === "firewalls") {
    container.classList.remove("hidden");
    container.innerHTML = `
      <div class="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4 shadow-md">
        <div class="flex items-center gap-3">
          <div class="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 shrink-0">
            <i data-lucide="shield" class="w-5 h-5"></i>
          </div>
          <div>
            <h4 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              WAN Throughput & IPS Sizing Strip
            </h4>
            <p class="text-[11px] text-slate-400">Filter security gateways by line-rate throughput and advanced threat inspection capabilities.</p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-3 text-xs">
          <div class="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5">
            <span class="text-[10px] font-mono font-bold text-slate-400 uppercase">Minimum Routing:</span>
            <select onchange="fwTargetThroughputGbps = parseFloat(this.value) || 0; runActiveFilter();" class="bg-transparent font-mono font-bold text-white text-xs focus:outline-none">
              <option value="0" ${fwTargetThroughputGbps === 0 ? 'selected' : ''}>Any Speed</option>
              <option value="1" ${fwTargetThroughputGbps === 1 ? 'selected' : ''}>1.0+ Gbps</option>
              <option value="2.5" ${fwTargetThroughputGbps === 2.5 ? 'selected' : ''}>2.5+ Gbps</option>
              <option value="5" ${fwTargetThroughputGbps === 5 ? 'selected' : ''}>5.0+ Gbps</option>
              <option value="10" ${fwTargetThroughputGbps === 10 ? 'selected' : ''}>10+ Gbps</option>
            </select>
          </div>

          <div class="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5">
            <span class="text-[10px] font-mono font-bold text-slate-400 uppercase">Minimum IPS / Threat:</span>
            <select onchange="fwTargetThreatMbps = parseInt(this.value) || 0; runActiveFilter();" class="bg-transparent font-mono font-bold text-rose-400 text-xs focus:outline-none">
              <option value="0" ${fwTargetThreatMbps === 0 ? 'selected' : ''}>Any IPS</option>
              <option value="500" ${fwTargetThreatMbps === 500 ? 'selected' : ''}>500+ Mbps</option>
              <option value="1000" ${fwTargetThreatMbps === 1000 ? 'selected' : ''}>1.0+ Gbps</option>
              <option value="3000" ${fwTargetThreatMbps === 3000 ? 'selected' : ''}>3.0+ Gbps</option>
              <option value="5000" ${fwTargetThreatMbps === 5000 ? 'selected' : ''}>5.0+ Gbps</option>
            </select>
          </div>

          ${(fwTargetThroughputGbps > 0 || fwTargetThreatMbps > 0) ? `
            <button onclick="fwTargetThroughputGbps = 0; fwTargetThreatMbps = 0; buildCalculatorStrip(); runActiveFilter();" class="text-xs text-rose-400 hover:text-rose-300 font-semibold px-2">
              Reset Specifications
            </button>
          ` : ''}
        </div>
      </div>
    `;
  } else if (currentMode === "optics") {
    container.classList.remove("hidden");
    container.innerHTML = `
      <div class="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4 shadow-md">
        <div class="flex items-center gap-3">
          <div class="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400 shrink-0">
            <i data-lucide="cable" class="w-5 h-5"></i>
          </div>
          <div>
            <h4 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              Optics & Transceiver Fast-Select Strip
            </h4>
            <p class="text-[11px] text-slate-400">Quick-filter physical fiber interfaces, direct-attach copper, and chassis stacking cables.</p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-1.5 text-xs">
          <button onclick="setOpticQuickFilter('10g_dac')" class="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 hover:border-sky-500/50 hover:bg-sky-950/20 text-slate-300 hover:text-white font-mono text-[11px] transition-all">10G DAC</button>
          <button onclick="setOpticQuickFilter('10g_sr')" class="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 hover:border-sky-500/50 hover:bg-sky-950/20 text-slate-300 hover:text-white font-mono text-[11px] transition-all">10G MMF (SR)</button>
          <button onclick="setOpticQuickFilter('10g_lr')" class="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 hover:border-sky-500/50 hover:bg-sky-950/20 text-slate-300 hover:text-white font-mono text-[11px] transition-all">10G SMF (LR)</button>
          <button onclick="setOpticQuickFilter('25g')" class="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 hover:border-sky-500/50 hover:bg-sky-950/20 text-slate-300 hover:text-white font-mono text-[11px] transition-all">25G SFP28</button>
          <button onclick="setOpticQuickFilter('100g')" class="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 hover:border-sky-500/50 hover:bg-sky-950/20 text-slate-300 hover:text-white font-mono text-[11px] transition-all">100G QSFP28</button>
          <button onclick="setOpticQuickFilter('stacking')" class="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-950/20 text-indigo-300 hover:text-white font-mono text-[11px] transition-all">Stacking</button>
          <button onclick="setOpticQuickFilter('reset')" class="text-xs text-rose-400 hover:text-rose-300 font-semibold px-2">Reset</button>
        </div>
      </div>
    `;
  } else if (currentMode === "wireless") {
    container.classList.remove("hidden");
    container.innerHTML = `
      <div class="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4 shadow-md">
        <div class="flex items-center gap-3">
          <div class="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shrink-0">
            <i data-lucide="radio" class="w-5 h-5"></i>
          </div>
          <div>
            <h4 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              Wireless Link Path Sizer
            </h4>
            <p class="text-[11px] text-slate-400">Filter radios by minimum operating distance and line-rate throughput requirements.</p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-3 text-xs">
          <div class="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5">
            <span class="text-[10px] font-mono font-bold text-slate-400 uppercase">Minimum Distance:</span>
            <input type="number" step="0.1" min="0" max="25" value="${wlTargetDistanceMiles || 0}" onchange="wlTargetDistanceMiles = parseFloat(this.value) || 0; runActiveFilter();" class="w-14 bg-transparent font-mono font-bold text-emerald-400 focus:outline-none text-right" />
            <span class="text-[10px] font-mono text-slate-500">Miles (${((wlTargetDistanceMiles || 0) * 1.609).toFixed(1)} km)</span>
          </div>

          <div class="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5">
            <span class="text-[10px] font-mono font-bold text-slate-400 uppercase">Minimum Speed:</span>
            <select onchange="wlTargetThroughputMbps = parseInt(this.value) || 0; runActiveFilter();" class="bg-transparent font-mono font-bold text-indigo-300 text-xs focus:outline-none">
              <option value="0" ${wlTargetThroughputMbps === 0 ? 'selected' : ''}>Any Speed</option>
              <option value="450" ${wlTargetThroughputMbps === 450 ? 'selected' : ''}>450+ Mbps (Camera Pole)</option>
              <option value="1000" ${wlTargetThroughputMbps === 1000 ? 'selected' : ''}>1.0+ Gbps (Gigabit Trunk)</option>
              <option value="2000" ${wlTargetThroughputMbps === 2000 ? 'selected' : ''}>2.0+ Gbps (Multi-Gig)</option>
              <option value="5000" ${wlTargetThroughputMbps === 5000 ? 'selected' : ''}>5.0+ Gbps (High Capacity)</option>
              <option value="10000" ${wlTargetThroughputMbps === 10000 ? 'selected' : ''}>10 Gbps (Carrier E-Band)</option>
            </select>
          </div>

          ${(wlTargetDistanceMiles > 0 || wlTargetThroughputMbps > 0) ? `
            <button onclick="wlTargetDistanceMiles = 0; wlTargetThroughputMbps = 0; buildCalculatorStrip(); runActiveFilter();" class="text-xs text-rose-400 hover:text-rose-300 font-semibold px-2">
              Reset Link
            </button>
          ` : ''}
        </div>
      </div>
    `;
  } else if (currentMode === "accessories") {
    container.classList.remove("hidden");
    const accCats = [
      { id: "all", label: "All Items", icon: "wrench" },
      { id: "mounts", label: "Mounts & Brackets", icon: "layers" },
      { id: "media_converters", label: "Media Converters", icon: "repeat" },
      { id: "licenses", label: "Licenses & Cloud", icon: "key" },
      { id: "modular_uplinks", label: "Modular Uplinks", icon: "cpu" },
      { id: "power_supplies", label: "Power Supplies", icon: "zap" },
      { id: "poe_injectors", label: "PoE Midspans", icon: "plug" }
    ];
    container.innerHTML = `
      <div class="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4 shadow-md">
        <div class="flex items-center gap-3">
          <div class="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 shrink-0">
            <i data-lucide="wrench" class="w-5 h-5"></i>
          </div>
          <div>
            <h4 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              Networking Accessories & Modular Hardware
            </h4>
            <p class="text-[11px] text-slate-400">Filter mounting kits, media converters, expansion uplinks, power supplies, and cloud licenses.</p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-1.5">
          ${accCats.map(cat => {
            const isActive = (typeof selectedAccSubCategory !== "undefined" ? selectedAccSubCategory : "all") === cat.id;
            return `
              <button onclick="setAccSubCategory('${cat.id}')" class="px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${isActive ? '!bg-indigo-600 !border-indigo-400 !text-white shadow-md shadow-indigo-900/40 ring-2 ring-indigo-400/60 font-bold' : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'}">
                <i data-lucide="${cat.icon}" class="w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-indigo-400'}"></i>
                <span>${cat.label}</span>
              </button>
            `;
          }).join('')}
        </div>
      </div>
    `;
  } else if (currentMode === "enclosures") {
    container.classList.remove("hidden");
    container.innerHTML = `
      <div class="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4 shadow-md">
        <div class="flex items-center gap-3">
          <div class="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
            <i data-lucide="box" class="w-5 h-5"></i>
          </div>
          <div>
            <h4 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              Enclosures, Cabinets & Security Backboards
            </h4>
            <p class="text-[11px] text-slate-400">Exterior NEMA 4X weather-tight boxes, Trove/LSP access control cabinets, DIN boxes, and plywood backboards.</p>
          </div>
        </div>
        <div class="flex items-center gap-2 text-xs">
          <span class="text-[10px] font-mono font-bold text-slate-400 uppercase">Environment:</span>
          <select onchange="selectedAccMounting = this.value; runActiveFilter();" class="bg-slate-950 border border-slate-800 text-amber-400 rounded-xl px-3 py-1.5 font-bold text-xs focus:outline-none focus:border-amber-500">
            <option value="all" ${selectedAccMounting === 'all' ? 'selected' : ''}>All Enclosure Types</option>
            <option value="Pole" ${selectedAccMounting === 'Pole' ? 'selected' : ''}>Outdoor Pole Box (NEMA 4X)</option>
            <option value="Wall" ${selectedAccMounting === 'Wall' ? 'selected' : ''}>Wall / Security Cabinet</option>
            <option value="DIN" ${selectedAccMounting === 'DIN' ? 'selected' : ''}>DIN Rail Cabinet</option>
          </select>
        </div>
      </div>
    `;
  } else if (currentMode === "ups") {
    container.classList.remove("hidden");
    const vVal = typeof selectedUpsVoltage !== "undefined" ? selectedUpsVoltage : "all";
    const cVal = typeof selectedUpsCategory !== "undefined" ? selectedUpsCategory : "all";
    container.innerHTML = `
      <div class="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4 shadow-md">
        <div class="flex items-center gap-3">
          <div class="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
            <i data-lucide="zap" class="w-5 h-5"></i>
          </div>
          <div>
            <h4 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              Uninterruptible Power Supply (UPS) Systems & Battery Modules
            </h4>
            <p class="text-[11px] text-slate-400">Online double-conversion pure sine wave battery backups, external battery modules (EBPs), and SmartConnect cloud monitoring.</p>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-2.5 text-xs">
          <div class="flex items-center gap-1.5">
            <span class="text-[10px] font-mono font-bold text-slate-400 uppercase">Class:</span>
            <select onchange="selectedUpsCategory = this.value; runActiveFilter();" class="bg-slate-950 border border-slate-800 text-amber-400 rounded-xl px-2.5 py-1.5 font-bold text-xs focus:outline-none focus:border-amber-500">
              <option value="all" ${cVal === 'all' ? 'selected' : ''}>All Power Hardware</option>
              <option value="ups" ${cVal === 'ups' ? 'selected' : ''}>UPS Units Only</option>
              <option value="ebp" ${cVal === 'ebp' ? 'selected' : ''}>Battery Packs (EBP)</option>
            </select>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="text-[10px] font-mono font-bold text-slate-400 uppercase">Voltage:</span>
            <select onchange="selectedUpsVoltage = this.value; runActiveFilter();" class="bg-slate-950 border border-slate-800 text-amber-400 rounded-xl px-2.5 py-1.5 font-bold text-xs focus:outline-none focus:border-amber-500">
              <option value="all" ${vVal === 'all' ? 'selected' : ''}>All Voltages</option>
              <option value="120" ${vVal === '120' ? 'selected' : ''}>120V AC Standard</option>
              <option value="240" ${vVal === '240' ? 'selected' : ''}>208V / 240V AC</option>
            </select>
          </div>
        </div>
      </div>
    `;
  } else if (currentMode === "pdus") {
    container.classList.remove("hidden");
    const pduNet = typeof selectedPduNetworkType !== "undefined" ? selectedPduNetworkType : "all";
    const pduVolt = typeof selectedUpsVoltage !== "undefined" ? selectedUpsVoltage : "all";
    container.innerHTML = `
      <div class="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4 shadow-md">
        <div class="flex items-center gap-3">
          <div class="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400 shrink-0">
            <i data-lucide="power" class="w-5 h-5"></i>
          </div>
          <div>
            <h4 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              Rack Power Distribution Units (PDUs)
            </h4>
            <p class="text-[11px] text-slate-400">0U vertical toolless high-density strips, 1U horizontal rack power, and automatic transfer switches (ATS) with per-outlet rebooting.</p>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-2.5 text-xs">
          <div class="flex items-center gap-1.5">
            <span class="text-[10px] font-mono font-bold text-slate-400 uppercase">Management:</span>
            <select onchange="selectedPduNetworkType = this.value; runActiveFilter();" class="bg-slate-950 border border-slate-800 text-sky-400 rounded-xl px-2.5 py-1.5 font-bold text-xs focus:outline-none focus:border-sky-500">
              <option value="all" ${pduNet === 'all' ? 'selected' : ''}>All Management Types</option>
              <option value="switched" ${pduNet === 'switched' ? 'selected' : ''}>Switched (Remote Reboot)</option>
              <option value="metered" ${pduNet === 'metered' ? 'selected' : ''}>Metered (Load Display)</option>
              <option value="basic" ${pduNet === 'basic' ? 'selected' : ''}>Basic (Unmanaged)</option>
              <option value="ats" ${pduNet === 'ats' ? 'selected' : ''}>Automatic Transfer (ATS)</option>
            </select>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="text-[10px] font-mono font-bold text-slate-400 uppercase">Voltage:</span>
            <select onchange="selectedUpsVoltage = this.value; runActiveFilter();" class="bg-slate-950 border border-slate-800 text-sky-400 rounded-xl px-2.5 py-1.5 font-bold text-xs focus:outline-none focus:border-sky-500">
              <option value="all" ${pduVolt === 'all' ? 'selected' : ''}>All Voltages</option>
              <option value="120" ${pduVolt === '120' ? 'selected' : ''}>120V AC (15A / 20A / 30A)</option>
              <option value="240" ${pduVolt === '240' ? 'selected' : ''}>208V / 240V AC (L6-30P)</option>
            </select>
          </div>
        </div>
      </div>
    `;
  } else if (currentMode === "power_cords") {
    container.classList.remove("hidden");
    const cordLen = typeof selectedCordLength !== "undefined" ? selectedCordLength : "all";
    const cordColor = typeof selectedCordColor !== "undefined" ? selectedCordColor : "all";
    const colorSwatches = [
      { id: "all", label: "All Colors", bg: "bg-slate-700" },
      { id: "Black", label: "Black", bg: "bg-slate-900 border border-slate-700" },
      { id: "Blue", label: "Blue (A-Feed)", bg: "bg-blue-600" },
      { id: "Red", label: "Red (B-Feed)", bg: "bg-red-600" },
      { id: "Yellow", label: "Yellow", bg: "bg-yellow-500" },
      { id: "Green", label: "Green", bg: "bg-emerald-600" },
      { id: "White", label: "White", bg: "bg-slate-100 text-slate-900" },
      { id: "Orange", label: "Orange", bg: "bg-orange-600" }
    ];
    container.innerHTML = `
      <div class="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4 shadow-md">
        <div class="flex items-center gap-3">
          <div class="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400 shrink-0">
            <i data-lucide="plug" class="w-5 h-5"></i>
          </div>
          <div>
            <h4 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              Power Cords, Equipment Jumpers & Dual-Locking Cables
            </h4>
            <p class="text-[11px] text-slate-400">IEC C13/C14, C19/C20, C15 High-Temp, locking retention cords, and color-coded jackets for A/B redundant feed isolation.</p>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-2 text-xs">
          <!-- Color Quick Selector -->
          <div class="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <span class="text-[10px] font-mono font-bold text-slate-400 uppercase px-1.5">Color:</span>
            ${colorSwatches.map(c => `
              <button onclick="selectedCordColor = '${c.id}'; buildCalculatorStrip(); runActiveFilter();" title="${c.label}" class="w-5 h-5 rounded-lg flex items-center justify-center transition-all ${c.bg} ${cordColor === c.id ? 'ring-2 ring-teal-400 scale-110 shadow-sm' : 'opacity-70 hover:opacity-100'}">
                ${cordColor === c.id ? '<div class="w-1.5 h-1.5 rounded-full bg-white"></div>' : ''}
              </button>
            `).join('')}
          </div>

          <!-- Quick Length Selector -->
          <div class="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <span class="text-[10px] font-mono font-bold text-slate-400 uppercase px-1.5">Length:</span>
            ${["all", "1", "2", "3", "6", "10", "15"].map(len => `
              <button onclick="selectedCordLength = '${len}'; buildCalculatorStrip(); runActiveFilter();" class="px-2 py-0.5 rounded-lg text-[11px] font-mono font-semibold transition-all ${cordLen === len ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}">
                ${len === 'all' ? 'All' : `${len}ft`}
              </button>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  } else if (currentMode === "cameras") {
    // Camera Design Mode (Initial Generic vs Full Actual Parts), Live PoE/Storage Summary & Bulk SKU Upgrade Strip
    container.classList.remove("hidden");
    const isGenericMode = isGenericCameraModeActive();
    const bomCams = (projectBOM || []).filter(i => !i.parentInstanceId && (i.role === "Camera" || i.category === "camera" || i.category === "cameras" || i.deviceTypePrefix === "CAM" || i.deviceTypePrefix === "LPR"));
    const totalBomCams = bomCams.reduce((s, c) => s + (parseInt(c.qty, 10) || 1), 0);
    const genericBomCams = bomCams.filter(c => c.isGenericCamera || String(c.id || c.sku || "").startsWith("gen-cam-") || String(c.sku || "").startsWith("GEN-CAM-"));
    const totalGenericCams = genericBomCams.reduce((s, c) => s + (parseInt(c.qty, 10) || 1), 0);
    const totalSpecificCams = totalBomCams - totalGenericCams;

    // Compute live PoE & Storage from BOM cameras
    let camAf = 0, camAt = 0, camBt60 = 0, camRawWatts = 0;
    bomCams.forEach(c => {
      const q = parseInt(c.qty, 10) || 1;
      const std = String(c.poeStandard || "").toLowerCase();
      const maxW = parseFloat(c.maxPowerWatts || c.powerConsumptionWatts || 12);
      const drawW = parseFloat(c.powerConsumptionWatts || maxW || 8);
      camRawWatts += drawW * q;
      if (c.poeTierKey === "bt60" || std.includes("bt") || maxW > 30) camBt60 += q;
      else if (c.poeTierKey === "at" || std.includes("at") || maxW > 15.4) camAt += q;
      else camAf += q;
    });
    camRawWatts = Math.round(camRawWatts * 10) / 10;

    const vCalcCam = (typeof VideoStorageSizer !== "undefined" && typeof VideoStorageSizer.calculateFromBOM === "function")
      ? VideoStorageSizer.calculateFromBOM(projectBOM, { sourceMode: totalBomCams > 0 ? "bom" : "manual" })
      : { totalSensors: totalBomCams, peakIngressMbps: 0, requiredUsableTB: 0 };

    // Group generic cameras in BOM by generic type for Bulk Assignment
    const genericGroupsMap = new Map();
    genericBomCams.forEach(c => {
      const gKey = c.id || c.genericCameraTypeId || c.sku;
      const gRef = (typeof CatalogRegistry !== "undefined" && CatalogRegistry.get(gKey)) ||
                   (typeof GENERIC_CAMERA_TYPES !== "undefined" ? GENERIC_CAMERA_TYPES.find(g => g.id === gKey || g.sku === gKey || g.genericTypeKey === gKey) : null) ||
                   c;
      const mapId = gRef.id || gKey;
      if (!genericGroupsMap.has(mapId)) {
        genericGroupsMap.set(mapId, {
          genericId: mapId,
          sku: gRef.sku || c.sku,
          model: gRef.model || c.model,
          resolution: gRef.resolution || c.resolution,
          poeStandard: gRef.poeStandard || c.poeStandard,
          powerConsumptionWatts: gRef.powerConsumptionWatts || c.powerConsumptionWatts,
          streamBitrateMbps: gRef.streamBitrateMbps || c.streamBitrateMbps,
          recommendedUpgradeSkus: Array.isArray(gRef.recommendedUpgradeSkus) ? gRef.recommendedUpgradeSkus : [],
          count: 0
        });
      }
      genericGroupsMap.get(mapId).count += (parseInt(c.qty, 10) || 1);
    });
    const genericGroups = Array.from(genericGroupsMap.values());
    const allSpecificCams = typeof CAMERAS_DATABASE !== "undefined" ? CAMERAS_DATABASE : [];

    container.innerHTML = `
      <div class="bg-slate-900/95 border border-slate-800 rounded-2xl p-3.5 sm:p-4 flex flex-col gap-3 shadow-lg">
        <div class="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <!-- Left: Camera Specification Mode Switcher -->
          <div class="flex items-start sm:items-center gap-3">
            <div class="p-2.5 rounded-xl ${isGenericMode ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400' : 'bg-sky-500/15 border border-sky-500/30 text-sky-400'} shrink-0">
              <i data-lucide="camera" class="w-5 h-5"></i>
            </div>
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h4 class="text-xs font-bold text-white uppercase tracking-wider">Camera Specification &amp; Sizing Mode</h4>
                <div class="inline-flex items-center p-0.5 rounded-xl bg-slate-950 border border-slate-800">
                  <button onclick="setCameraDesignMode('generic')" class="px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${isGenericMode ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}" title="Specify cameras by generic type and resolution (2MP, 4MP, 5MP, 8MP 4K, 360 Fisheye, Dual/Quad/5-Sensor, PTZ, 60W LPR). Automatically drives PoE and Storage calculations.">
                    <i data-lucide="layers" class="w-3.5 h-3.5"></i>
                    <span>Initial/Quick Design (Generic Types)</span>
                  </button>
                  <button onclick="setCameraDesignMode('specific')" class="px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${!isGenericMode ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'}" title="Switch to actual manufacturer catalog parts and bulk-upgrade generic cameras to real SKUs.">
                    <i data-lucide="cpu" class="w-3.5 h-3.5"></i>
                    <span>Full Design (Actual Parts)</span>
                  </button>
                </div>
              </div>
              <p class="text-[11px] text-slate-400 mt-1">
                ${isGenericMode
                  ? 'Specify cameras by <strong class="text-emerald-300">Generic Type &amp; Resolution</strong>. Built-in PoE classes (<code class="text-amber-300">802.3af 15W</code>, <code class="text-sky-300">802.3at 30W</code>, <code class="text-rose-300">802.3bt 60W</code>) and bitrates automatically drive Switch PoE &amp; Server Storage sizing.'
                  : 'Browse <strong class="text-sky-300">Actual Manufacturer Parts</strong> or bulk-assign generic cameras in your quote to real catalog SKUs while preserving rack, switch port &amp; floorplan placements.'}
              </p>
            </div>
          </div>

          <!-- Right: Live Camera PoE & Storage Telemetry -->
          <div class="flex flex-wrap items-center gap-2.5 shrink-0">
            <div class="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800">
              <div>
                <div class="text-[9px] uppercase font-bold text-slate-400">Quoted Cameras</div>
                <div class="text-xs font-mono font-bold text-white">
                  ${totalBomCams} Camera${totalBomCams === 1 ? '' : 's'}
                  <span class="text-[10px] font-normal text-slate-400">(${totalGenericCams} Generic / ${totalSpecificCams} Specific)</span>
                </div>
              </div>
              <div class="h-6 w-px bg-slate-800"></div>
              <div title="802.3af (15.4W): ${camAf} | 802.3at PoE+ (30W): ${camAt} | 802.3bt PoE++ (60W): ${camBt60}">
                <div class="text-[9px] uppercase font-bold text-slate-400">Camera PoE Draw</div>
                <div class="text-xs font-mono font-bold text-amber-400">
                  ${camRawWatts}W <span class="text-[10px] text-slate-400">(${camAf}af/${camAt}at/${camBt60}bt)</span>
                </div>
              </div>
              <div class="h-6 w-px bg-slate-800"></div>
              <div>
                <div class="text-[9px] uppercase font-bold text-slate-400">Video Bandwidth / Storage</div>
                <div class="text-xs font-mono font-bold text-sky-400">
                  ${totalBomCams > 0 ? `${vCalcCam.peakIngressMbps} Mbps` : '0 Mbps'} <span class="text-slate-500">•</span> <span class="text-purple-300">${totalBomCams > 0 ? `${vCalcCam.requiredUsableTB} TB` : '0 TB'}</span>
                </div>
              </div>
            </div>

            ${totalGenericCams > 0 ? `
              <button onclick="window.showCameraBulkUpgradePanel = !window.showCameraBulkUpgradePanel; showCameraBulkUpgradePanel = window.showCameraBulkUpgradePanel; buildCalculatorStrip();" class="px-3 py-2 rounded-xl ${showCameraBulkUpgradePanel ? 'bg-sky-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-sky-300 border border-sky-500/40'} text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer" title="Bulk-upgrade generic camera types in the project to actual manufacturer SKUs">
                <i data-lucide="arrow-up-right-square" class="w-3.5 h-3.5"></i>
                <span>Upgrade Generic Parts (${totalGenericCams})</span>
              </button>
            ` : ''}

            <button onclick="switchMode('servers')" class="px-3 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer" title="Open Storage, Bandwidth, RAID & Genetec 5.14 Archiver Calculator on the Servers tab">
              <i data-lucide="hard-drive" class="w-3.5 h-3.5"></i>
              <span>Storage &amp; Archiver Sizer &rarr;</span>
            </button>
          </div>
        </div>

        ${(totalGenericCams > 0 && (showCameraBulkUpgradePanel || !isGenericMode)) ? `
          <!-- Bulk Generic-to-Actual SKU Upgrade Bar -->
          <div class="bg-slate-950/90 border border-sky-500/30 rounded-xl p-3 space-y-2.5">
            <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
              <div class="flex items-center gap-2">
                <span class="px-2 py-0.5 rounded bg-sky-500/15 border border-sky-500/40 text-[10px] font-mono font-bold text-sky-300 uppercase">Bulk + Individual Part Assignment</span>
                <span class="text-xs font-bold text-white">Convert Generic Camera Types to Actual Catalog SKUs (${totalGenericCams} Generic Camera${totalGenericCams === 1 ? '' : 's'} in Quote)</span>
              </div>
              <div class="flex items-center gap-2">
                <button onclick="upgradeAllGenericCamerasToRecommended()" class="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer" title="Automatically upgrade all generic camera types in the quote to their primary recommended manufacturer SKU">
                  <i data-lucide="wand-2" class="w-3.5 h-3.5"></i>
                  <span>Upgrade All ${totalGenericCams}x to Recommended SKUs</span>
                </button>
                <button onclick="if (typeof TabManager !== 'undefined') TabManager.openTab('bom');" class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer" title="Open BOM Studio to override individual cameras one-by-one">
                  <i data-lucide="list-checks" class="w-3.5 h-3.5 text-sky-400"></i>
                  <span>Per-Camera Override in BOM</span>
                </button>
              </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-2">
              ${genericGroups.map(grp => {
                // Sort recommended SKUs first, then remaining catalog SKUs
                const recSet = new Set(grp.recommendedUpgradeSkus || []);
                const recCams = allSpecificCams.filter(c => recSet.has(c.sku) || recSet.has(c.id));
                const otherCams = allSpecificCams.filter(c => !recSet.has(c.sku) && !recSet.has(c.id));
                const selectId = `bulk-upgrade-select-${grp.genericId}`;
                return `
                  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded-lg bg-slate-900/90 border border-slate-800">
                    <div class="min-w-0">
                      <div class="flex items-center gap-1.5">
                        <span class="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-[10px] font-bold">${grp.count}x</span>
                        <span class="text-xs font-bold text-white truncate">${escapeHTML(grp.model)}</span>
                      </div>
                      <div class="text-[10px] font-mono text-slate-400 mt-0.5">
                        ${escapeHTML(grp.resolution || '')} &bull; ${escapeHTML(grp.poeStandard || '802.3af')} (${grp.powerConsumptionWatts || 8}W) &bull; ${grp.streamBitrateMbps || 4} Mbps
                      </div>
                    </div>
                    <div class="flex items-center gap-1.5 shrink-0">
                      <select id="${selectId}" class="bg-slate-950 border border-slate-700 text-slate-200 text-[11px] font-mono rounded-lg px-2 py-1.5 max-w-[230px] focus:outline-none focus:border-sky-500">
                        ${recCams.length > 0 ? `
                          <optgroup label="Recommended Matching SKUs">
                            ${recCams.map(c => `<option value="${escapeHTML(c.sku)}">★ ${escapeHTML(c.vendor)} — ${escapeHTML(c.sku)} ($${(c.msrp || 0).toLocaleString()})</option>`).join('')}
                          </optgroup>
                        ` : ''}
                        <optgroup label="All Catalog Cameras">
                          ${otherCams.map(c => `<option value="${escapeHTML(c.sku)}">${escapeHTML(c.vendor)} — ${escapeHTML(c.sku)} (${escapeHTML(c.resolution || '')}, $${(c.msrp || 0).toLocaleString()})</option>`).join('')}
                        </optgroup>
                      </select>
                      <button onclick="const el = document.getElementById('${selectId}'); if (el && el.value) upgradeGenericCameraTypeBulk('${grp.genericId}', el.value);" class="px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-bold whitespace-nowrap cursor-pointer transition-colors">
                        Apply to ${grp.count}x
                      </button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  } else if (currentMode === "servers" || currentMode === "storage") {
    container.classList.remove("hidden");
    const vCalc = (typeof VideoStorageSizer !== "undefined" && typeof VideoStorageSizer.calculateFromBOM === "function")
      ? VideoStorageSizer.calculateFromBOM(projectBOM, {
          sourceMode: videoSourceMode,
          manualCameraCount: videoManualCamCount,
          resolutionMp: videoResolutionMp,
          retentionDays: videoRetentionDays,
          codec: videoCodec,
          fps: videoFps,
          lowFpsUntilMotion: videoLowFpsUntilMotion,
          idleFps: videoIdleFps,
          motionDutyCycle: videoMotionDuty,
          sceneActivity: videoSceneActivity,
          raidType: videoRaidType,
          preferredDriveSizeTb: videoPreferredDriveTb,
          vmsVendor: videoVmsVendor,
          genetecProfile: videoGenetecProfile,
          milestoneProfile: videoMilestoneProfile,
          archiverRolesCount: videoArchiverRoles,
          serverCountOverride: videoServerCount,
          encryptionCerts: videoEncryptionCerts,
          softwareMotionDetection: videoSoftwareMotion,
          failoverStructure: videoFailoverStructure,
          ringNodeCount: videoRingNodeCount,
          dedicatedPrimaryCount: videoDedicatedPrimaryCount,
          dedicatedFailoverCount: videoDedicatedFailoverCount,
          maxSimultaneousFailures: videoMaxSimultaneousFailures,
          failoverRetentionDays: videoFailoverRetentionDays,
          failoverIncludeStorageBuffer: videoFailoverIncludeStorageBuffer
        })
      : { totalCameras: 32, peakIngressMbps: 105.6, averageRecordingMbps: 52.8, requiredUsableTB: 18.8, raidLevel: "RAID 6", vmsVendor: "genetec", genetec: { activeArchiverRoles: 1, recommendedArchiverServers: 1, isFullyCompliant: true } };
    const isMilestoneVms = vCalc.vmsVendor === "milestone";
    const g = isMilestoneVms ? (vCalc.milestone || vCalc.genetec || {}) : (vCalc.genetec || {});
    const showInlineStorage = Boolean(window.catalogShowInlineStorageCalc);
    container.innerHTML = `
      <div class="space-y-3">
        <div class="bg-slate-900/95 border border-slate-800 rounded-2xl px-3.5 py-2.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 shadow-md">
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 shrink-0">
              <i data-lucide="hard-drive" class="w-4 h-4"></i>
            </div>
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h4 class="text-xs font-bold text-white uppercase tracking-wider">Servers &amp; Storage Catalog</h4>
                <span class="px-2 py-0.5 rounded bg-purple-950/80 border border-purple-700/50 text-purple-300 font-mono text-[10px] font-bold">
                  ${vCalc.totalCameras} Cameras &bull; ${vCalc.requiredUsableTB} TB Usable (${vCalc.raidLevel})
                </span>
                <span class="px-2 py-0.5 rounded bg-sky-950/80 border border-sky-700/50 text-sky-300 font-mono text-[10px] font-bold">
                  ${vCalc.peakIngressMbps} / ${vCalc.averageRecordingMbps} Mbps
                </span>
                <span class="px-2 py-0.5 rounded ${g.isFullyCompliant !== false ? 'bg-emerald-950/80 border-emerald-700/50 text-emerald-300' : 'bg-rose-950/80 border-rose-700/50 text-rose-300'} border font-mono text-[10px] font-bold">
                  ${isMilestoneVms ? `Milestone Husky: ${g.recommendedArchiverServers || 1} Server(s)` : `Genetec: ${g.activeArchiverRoles || 1} Role(s) (${g.recommendedArchiverServers || 1} Server(s))`}
                </span>
              </div>
              <p class="text-[11px] text-slate-400">
                Use the dedicated <strong class="text-purple-300">Storage &amp; Failover Calculator Studio</strong> in the top navigation for multi-manufacturer sizing (<strong class="text-indigo-300">Genetec Streamvault</strong> &amp; <strong class="text-sky-300">Milestone Husky IVO</strong>), Low-FPS Until Motion, and Ring/Dedicated failover.
              </p>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2 shrink-0">
            <button type="button" onclick="autoFitNvrToBom()" class="px-2.5 py-1.5 bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/40 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer">
              <i data-lucide="wand-2" class="w-3.5 h-3.5"></i>
              <span>Auto-Fit Server</span>
            </button>
            <button type="button" onclick="window.catalogShowInlineStorageCalc = !window.catalogShowInlineStorageCalc; buildCalculatorStrip();" class="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer">
              <i data-lucide="${showInlineStorage ? 'chevron-up' : 'chevron-down'}" class="w-3.5 h-3.5 text-purple-400"></i>
              <span>${showInlineStorage ? 'Hide Inline Sizer' : 'Quick Inline Sizer'}</span>
            </button>
            <button type="button" onclick="if(typeof TabManager !== 'undefined') TabManager.openTab('sizer_storage');" class="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer">
              <i data-lucide="hard-drive" class="w-3.5 h-3.5"></i>
              <span>Open Storage &amp; Failover Studio &rarr;</span>
            </button>
          </div>
        </div>
        ${showInlineStorage ? renderStorageCalculatorStudioHtml(false) : ''}
      </div>
    `;
  } else if (currentMode === "vms_software" || currentMode === "os_virtualization") {
    container.classList.remove("hidden");
    const isMilestoneLic = activeVmsLicensingVendor === "milestone";
    const licRes = isMilestoneLic
      ? ((typeof MilestoneLicensingSizer !== "undefined") ? MilestoneLicensingSizer.calculate(projectBOM) : null)
      : ((typeof GenetecLicensingSizer !== "undefined") ? GenetecLicensingSizer.calculate(projectBOM) : null);
    const showInlineLic = Boolean(window.catalogShowInlineLicCalc);
    container.innerHTML = `
      <div class="space-y-3">
        <div class="bg-slate-900/95 border border-slate-800 rounded-2xl px-3.5 py-2.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 shadow-md">
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shrink-0">
              <i data-lucide="key" class="w-4 h-4"></i>
            </div>
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h4 class="text-xs font-bold text-white uppercase tracking-wider">VMS Software &amp; Licensing Catalog</h4>
                ${licRes ? (isMilestoneLic ? `
                  <span class="px-2 py-0.5 rounded bg-sky-950/80 border border-sky-700/50 text-sky-300 font-mono text-[10px] font-bold">
                    Milestone ${licRes.editionInfo?.shortLabel || 'Corporate'} &bull; ${licRes.totalDeviceLicenses} Device Licenses &bull; ${licRes.careYears}Y Care Plus
                  </span>
                  <span class="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-700/50 text-emerald-300 font-mono text-[10px] font-bold">
                    Total Software MSRP: $${(licRes.totalSoftwareMsrp || 0).toLocaleString()}
                  </span>
                ` : `
                  <span class="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-700/50 text-emerald-300 font-mono text-[10px] font-bold">
                    Genetec ${String(licRes.effectiveTier || 'Enterprise').toUpperCase()} &bull; ${licRes.cameraUnits} Camera Licenses &bull; ${licRes.readerConnections} Doors
                  </span>
                  <span class="px-2 py-0.5 rounded bg-indigo-950/80 border border-indigo-700/50 text-indigo-300 font-mono text-[10px] font-bold">
                    Total Software MSRP: $${(licRes.totalSoftwareMsrp || 0).toLocaleString()} (${licRes.advantageYears}Y Advantage)
                  </span>
                `) : ''}
              </div>
              <p class="text-[11px] text-slate-400">
                Use the dedicated <strong class="text-emerald-300">VMS Licensing Sizer Studio</strong> in the top navigation to configure <strong class="text-indigo-300">Genetec Security Center 5.14</strong> or <strong class="text-sky-300">Milestone XProtect 2026 R2</strong> licensing &amp; appliances.
              </p>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2 shrink-0">
            <button type="button" onclick="${isMilestoneLic ? 'addMilestoneLicensesToBom()' : 'addGenetecLicensesToBom()'}" class="px-2.5 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer">
              <i data-lucide="plus-circle" class="w-3.5 h-3.5"></i>
              <span>+ Add ${isMilestoneLic ? 'Milestone' : 'Genetec'} Licenses</span>
            </button>
            <button type="button" onclick="window.catalogShowInlineLicCalc = !window.catalogShowInlineLicCalc; buildCalculatorStrip();" class="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer">
              <i data-lucide="${showInlineLic ? 'chevron-up' : 'chevron-down'}" class="w-3.5 h-3.5 text-emerald-400"></i>
              <span>${showInlineLic ? 'Hide Inline Builder' : 'Quick Inline Builder'}</span>
            </button>
            <button type="button" onclick="if(typeof TabManager !== 'undefined') TabManager.openTab('sizer_licensing');" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer">
              <i data-lucide="key" class="w-3.5 h-3.5"></i>
              <span>Open VMS Licensing Studio &rarr;</span>
            </button>
          </div>
        </div>
        ${showInlineLic ? renderVmsLicensingStudioHtml(false) : ''}
      </div>
    `;
  } else if (currentMode === "workstations") {
    container.classList.remove("hidden");
    const wsCalc = (typeof ClientWorkstationSizer !== "undefined" && typeof ClientWorkstationSizer.calculate === "function")
      ? ClientWorkstationSizer.calculate(projectBOM)
      : null;
    const recEv = wsCalc?.recommendedProfileEvaluation || {};
    const recCat = wsCalc?.recommendedCatalogWorkstation;
    const showInlineWs = Boolean(window.catalogShowInlineWsCalc);
    container.innerHTML = `
      <div class="space-y-3">
        <div class="bg-slate-900/95 border border-slate-800 rounded-2xl px-3.5 py-2.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 shadow-md">
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400 shrink-0">
              <i data-lucide="monitor" class="w-4 h-4"></i>
            </div>
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h4 class="text-xs font-bold text-white uppercase tracking-wider">Client Workstations Catalog</h4>
                ${wsCalc ? `
                  <span class="px-2 py-0.5 rounded bg-sky-950/80 border border-sky-700/50 text-sky-300 font-mono text-[10px] font-bold">
                    Viewing ${wsCalc.totalViewedStreams} Streams (${wsCalc.monitorCount} Monitors) &bull; ${recEv.utilizationPct || 0}% Decode Load
                  </span>
                  <span class="px-2 py-0.5 rounded bg-indigo-950/80 border border-indigo-700/50 text-indigo-300 font-mono text-[10px] font-bold">
                    ${wsCalc.vmsPlatform === 'milestone' ? 'Milestone Smart Client' : 'Genetec 5.14'} Specification: ${wsCalc.recommendedProfile?.shortLabel || 'Recommended'} ${recCat ? `(${recCat.sku})` : ''}
                  </span>
                ` : ''}
              </div>
              <p class="text-[11px] text-slate-400">
                Use the dedicated <strong class="text-sky-300">Client Workstation Sizer Studio</strong> in the top navigation to calculate CPU/GPU specs for <strong class="text-indigo-300">Genetec Security Desk 5.14</strong> or <strong class="text-sky-300">Milestone XProtect Smart Client 2026 / Husky IVO VS</strong>.
              </p>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2 shrink-0">
            <button type="button" onclick="autoFitWorkstationToBom()" class="px-2.5 py-1.5 bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/40 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer">
              <i data-lucide="wand-2" class="w-3.5 h-3.5"></i>
              <span>Auto-Fit Workstation</span>
            </button>
            <button type="button" onclick="window.catalogShowInlineWsCalc = !window.catalogShowInlineWsCalc; buildCalculatorStrip();" class="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer">
              <i data-lucide="${showInlineWs ? 'chevron-up' : 'chevron-down'}" class="w-3.5 h-3.5 text-sky-400"></i>
              <span>${showInlineWs ? 'Hide Inline Sizer' : 'Quick Inline Sizer'}</span>
            </button>
            <button type="button" onclick="if(typeof TabManager !== 'undefined') TabManager.openTab('sizer_workstation');" class="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer">
              <i data-lucide="monitor" class="w-3.5 h-3.5"></i>
              <span>Open Workstation Sizer Studio &rarr;</span>
            </button>
          </div>
        </div>
        ${showInlineWs ? renderWorkstationSizerStudioHtml(false) : ''}
      </div>
    `;
  } else if (currentMode === "access_control") {
    container.classList.remove("hidden");
    const showInlineDoors = Boolean(window.catalogShowInlineDoorCalc);
    container.innerHTML = `
      <div class="space-y-3">
        <div class="bg-slate-900/95 border border-slate-800 rounded-2xl px-3.5 py-2.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 shadow-md">
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shrink-0">
              <i data-lucide="door-open" class="w-4 h-4"></i>
            </div>
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h4 class="text-xs font-bold text-white uppercase tracking-wider">Access Control Hardware Catalog</h4>
                <span class="px-2 py-0.5 rounded bg-amber-950/80 border border-amber-700/50 text-amber-300 font-mono text-[10px] font-bold">
                  Turnkey Door Kit Builder &amp; Schedule
                </span>
              </div>
              <p class="text-[11px] text-slate-400">
                Use the dedicated <strong class="text-amber-300">Doors &amp; Access Builder Studio</strong> in the top navigation to build multi-group door schedules (Controller + OSDP Reader + Strike/Maglock + REX + DPS + Power).
              </p>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2 shrink-0">
            <button type="button" onclick="window.catalogShowInlineDoorCalc = !window.catalogShowInlineDoorCalc; buildCalculatorStrip();" class="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer">
              <i data-lucide="${showInlineDoors ? 'chevron-up' : 'chevron-down'}" class="w-3.5 h-3.5 text-amber-400"></i>
              <span>${showInlineDoors ? 'Hide Inline Builder' : 'Quick Door Builder'}</span>
            </button>
            <button type="button" onclick="if(typeof TabManager !== 'undefined') TabManager.openTab('sizer_doors');" class="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer">
              <i data-lucide="door-open" class="w-3.5 h-3.5"></i>
              <span>Open Doors &amp; Access Studio &rarr;</span>
            </button>
          </div>
        </div>
        ${showInlineDoors ? renderDoorBuilderStudioHtml(false) : ''}
      </div>
    `;
  } else {
    container.classList.remove("hidden");
    container.innerHTML = `
      <div class="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-4 shadow-md">
        <div class="flex items-center gap-3">
          <div class="p-2.5 rounded-xl bg-brand-500/10 border border-brand-500/30 text-brand-400 shrink-0">
            <i data-lucide="sparkles" class="w-5 h-5"></i>
          </div>
          <div>
            <h4 class="text-xs font-bold text-white uppercase tracking-wider">
              ${DOMAIN_DEFINITIONS[activeDomain]?.label || "Active Domain"} &bull; ${currentMode.replace('_', ' ').toUpperCase()}
            </h4>
            <p class="text-[11px] text-slate-400">Interactive hardware sizing and cross-domain load fitting engine.</p>
          </div>
        </div>
      </div>
    `;
  }

  const calcContainer = document.getElementById("calculatorStripContainer");
  if (calcContainer) safeCreateIcons(calcContainer);
}

function renderStorageCalculatorStudioHtml(isFullStudio = true) {
    const vCalc = (typeof VideoStorageSizer !== "undefined" && typeof VideoStorageSizer.calculateFromBOM === "function")
      ? VideoStorageSizer.calculateFromBOM(projectBOM, {
          sourceMode: videoSourceMode,
          manualCameraCount: videoManualCamCount,
          resolutionMp: videoResolutionMp,
          retentionDays: videoRetentionDays,
          codec: videoCodec,
          fps: videoFps,
          lowFpsUntilMotion: videoLowFpsUntilMotion,
          idleFps: videoIdleFps,
          motionDutyCycle: videoMotionDuty,
          sceneActivity: videoSceneActivity,
          raidType: videoRaidType,
          preferredDriveSizeTb: videoPreferredDriveTb,
          vmsVendor: videoVmsVendor,
          genetecProfile: videoGenetecProfile,
          milestoneProfile: videoMilestoneProfile,
          archiverRolesCount: videoArchiverRoles,
          serverCountOverride: videoServerCount,
          encryptionCerts: videoEncryptionCerts,
          softwareMotionDetection: videoSoftwareMotion,
          failoverStructure: videoFailoverStructure,
          ringNodeCount: videoRingNodeCount,
          dedicatedPrimaryCount: videoDedicatedPrimaryCount,
          dedicatedFailoverCount: videoDedicatedFailoverCount,
          maxSimultaneousFailures: videoMaxSimultaneousFailures,
          failoverRetentionDays: videoFailoverRetentionDays,
          failoverIncludeStorageBuffer: videoFailoverIncludeStorageBuffer
        })
      : {
          sourceMode: "manual",
          bomCameraUnits: 0,
          totalCameras: 32,
          totalSensors: 32,
          perCameraMbps: 3.3,
          peakIngressMbps: 105.6,
          averageRecordingMbps: 52.8,
          totalBandwidthMbps: 105.6,
          dailyStorageGb: 570.2,
          requiredUsableTB: 18.82,
          requiredRawTB: 25.03,
          arrayRawTb: 64,
          arrayUsableTb: 32,
          driveOptionsMatrix: [],
          selectedDrivePlan: { driveSizeTb: 16, totalDrives: 4, drivesPerServer: 4, rawStorageTb: 64, usableStorageTb: 32, efficiencyPct: 50, chassisFormFactor: "1U 4-Bay" },
          vmsVendor: "genetec",
          genetec: {
            version: "5.14.1.0",
            datasheetPath: "Datasheets/Genetec/SystemRequirements.pdf",
            profileKey: "dedicated_300",
            profile: { label: "Dedicated Archiver (Up to 300 Mbps)", cpuSpec: "Xeon Silver 4210", ramGb: 16, nicSpec: "1 GbE" },
            effectiveMaxCamerasPerArchiver: 300,
            effectiveMaxMbpsPerArchiver: 300,
            minRequiredArchiverRoles: 1,
            activeArchiverRoles: 1,
            isArchiverCountVerified: true,
            recommendedArchiverServers: 1,
            requiresDedicatedDirectoryServer: false,
            totalServersIncludingDirectory: 1,
            camerasPerArchiverRole: 32,
            bitratePerArchiverRoleMbps: 105.6,
            usableTbPerArchiverRole: 18.82,
            usableTbPerServer: 18.82,
            bitratePerServerMbps: 105.6,
            findings: [],
            isFullyCompliant: true
          }
        };

    const quotedNvrs = (projectBOM || []).filter(i => {
      const r = (i.role || "").toLowerCase();
      const c = (i.category || "").toLowerCase();
      return r.includes("nvr") || r.includes("recorder") || r.includes("server") || c === "servers" || c === "storage";
    });
    const quotedUsableTB = Math.round(quotedNvrs.reduce((sum, nvr) => sum + ((Number(nvr.usableStorageTb ?? nvr.usableStorageTB ?? nvr.rawStorageTb ?? nvr.rawStorageTB ?? 0)) * (nvr.qty || 1)), 0) * 10) / 10;
    const isStorageHealthy = vCalc.requiredUsableTB === 0 || quotedUsableTB >= vCalc.requiredUsableTB;
    const isMilestoneVms = vCalc.vmsVendor === "milestone";
    const isGenericVms = vCalc.vmsVendor === "generic";
    const g = isMilestoneVms ? (vCalc.milestone || vCalc.genetec || {}) : (vCalc.genetec || {});
    const dp = vCalc.selectedDrivePlan || {};
    const showMatrix = isFullStudio ? (videoShowDetailsPanel !== false) : Boolean(videoShowDetailsPanel);

    const profilesList = (typeof GENETEC_514_REQUIREMENTS !== "undefined" && GENETEC_514_REQUIREMENTS.ARCHIVER_PROFILES)
      ? Object.values(GENETEC_514_REQUIREMENTS.ARCHIVER_PROFILES)
      : [];
    const milestoneProfilesList = (typeof MILESTONE_2026_REQUIREMENTS !== "undefined" && MILESTONE_2026_REQUIREMENTS.RECORDING_SERVER_PROFILES)
      ? Object.values(MILESTONE_2026_REQUIREMENTS.RECORDING_SERVER_PROFILES)
      : [];

    return `
      <div class="bg-slate-900/95 border border-slate-800 rounded-2xl p-3.5 sm:p-4 flex flex-col gap-3.5 shadow-lg">
        <!-- Row 1: Header, Multi-Manufacturer VMS Switcher, Datasheet Links & Primary KPI Strip -->
        <div class="flex flex-col xl:flex-row xl:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div class="flex items-start sm:items-center gap-3">
            <div class="p-2.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 shrink-0">
              <i data-lucide="hard-drive" class="w-5 h-5"></i>
            </div>
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h4 class="text-xs font-bold text-white uppercase tracking-wider">Storage, Bandwidth, RAID &amp; Multi-VMS Recorder Sizer</h4>
                <!-- Multi-Manufacturer VMS / Appliance Ecosystem Switcher -->
                <div class="inline-flex items-center bg-slate-950 border border-slate-800 rounded-xl p-0.5 text-[11px]">
                  <button type="button" onclick="setVideoSizerParam('vmsVendor', 'genetec')" class="px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer ${vCalc.vmsVendor === 'genetec' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}" title="Genetec Security Center 5.14.1.0 Archiver Role & Streamvault Appliance Sizing">
                    <i data-lucide="shield-check" class="w-3 h-3"></i>
                    <span>Genetec 5.14 / Streamvault</span>
                  </button>
                  <button type="button" onclick="setVideoSizerParam('vmsVendor', 'milestone')" class="px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer ${isMilestoneVms ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'}" title="Milestone XProtect 2026 R2 Recording Server & Husky IVO Appliance Sizing">
                    <i data-lucide="server" class="w-3 h-3"></i>
                    <span>Milestone XProtect / Husky IVO</span>
                  </button>
                  <button type="button" onclick="setVideoSizerParam('vmsVendor', 'generic')" class="px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer ${isGenericVms ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'}" title="Open VMS / Generic Enterprise NVR Storage & RAID Sizing">
                    <i data-lucide="hard-drive" class="w-3 h-3"></i>
                    <span>Open VMS / Generic</span>
                  </button>
                </div>
                <span class="px-2 py-0.5 rounded-md bg-purple-950/80 border border-purple-700/50 text-[10px] font-mono font-bold text-purple-300">
                  ${vCalc.totalCameras} Cameras (${vCalc.totalSensors} Streams @ ${vCalc.perCameraMbps} Mbps per Camera)
                </span>
                ${isMilestoneVms ? `
                  <button onclick="openDatasheetModal('Datasheets/Milestone/Systems Comparison Chart.pdf', 'Milestone XProtect 2026 R2 Systems Comparison Chart', 'MILESTONE-XPROTECT-2026')" class="px-2 py-0.5 rounded-md bg-sky-950/80 hover:bg-sky-900 border border-sky-700/60 text-[10px] font-mono font-semibold text-sky-300 flex items-center gap-1 transition-all cursor-pointer" title="Open Milestone XProtect 2026 R2 Systems Comparison Chart PDF">
                    <i data-lucide="file-text" class="w-3 h-3"></i>
                    <span>Milestone XProtect Chart</span>
                  </button>
                  <button onclick="openDatasheetModal('${g.profile?.datasheetPath || 'Datasheets/Milestone/Husky 1000R.pdf'}', 'Milestone Husky IVO Recording Server Datasheet', '${g.profile?.applianceSku || 'HIVO-1000R'}')" class="px-2 py-0.5 rounded-md bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/60 text-[10px] font-mono font-semibold text-indigo-300 flex items-center gap-1 transition-all cursor-pointer" title="Open Milestone Husky IVO Hardware Datasheet PDF">
                    <i data-lucide="server" class="w-3 h-3"></i>
                    <span>Husky IVO Datasheet</span>
                  </button>
                ` : `
                  <button onclick="openDatasheetModal('Datasheets/Genetec/SystemRequirements.pdf', 'Genetec Security Center 5.14.1.0 System Requirements Guide', 'GENETEC-SC-5.14')" class="px-2 py-0.5 rounded-md bg-sky-950/80 hover:bg-sky-900 border border-sky-700/60 text-[10px] font-mono font-semibold text-sky-300 flex items-center gap-1 transition-all cursor-pointer" title="Open Genetec Security Center 5.14.1.0 System Requirements Guide PDF">
                    <i data-lucide="file-text" class="w-3 h-3"></i>
                    <span>Genetec 5.14 Specification Guide</span>
                  </button>
                `}
              </div>
              <p class="text-[11px] text-slate-400 mt-0.5">
                ${isMilestoneVms
                  ? 'Industry-standard bitrate &amp; RAID array sizing with live <strong class="text-sky-300">Milestone XProtect 2026 R2</strong> Recording Server &amp; <strong class="text-white">Husky IVO (150D / 350T / 350R / 700R / 1000R / 1800R)</strong> throughput verification.'
                  : 'Industry-standard bitrate &amp; RAID array sizing with live <strong class="text-indigo-300">Genetec Security Center 5.14</strong> Archiver role &amp; <strong class="text-white">Streamvault</strong> server throughput verification.'}
              </p>
            </div>
          </div>

          <!-- Top Right KPI Summary & Actions -->
          <div class="flex flex-wrap items-center gap-2.5 shrink-0">
            <div class="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-slate-950 border ${g.isFullyCompliant !== false ? 'border-slate-800' : 'border-rose-600/80'}">
              <div>
                <div class="text-[9px] uppercase font-bold text-slate-400">Peak / Average Bitrate</div>
                <div class="text-xs font-mono font-bold text-sky-400">${vCalc.peakIngressMbps} <span class="text-slate-500">/</span> ${vCalc.averageRecordingMbps} Mbps</div>
              </div>
              <div class="h-6 w-px bg-slate-800"></div>
              <div>
                <div class="text-[9px] uppercase font-bold text-slate-400">Usable / Raw (${vCalc.raidLevel})</div>
                <div class="text-xs font-mono font-bold text-purple-300">${vCalc.requiredUsableTB} TB <span class="text-slate-500">/</span> ${vCalc.arrayRawTb || vCalc.requiredRawTB} TB</div>
              </div>
              <div class="h-6 w-px bg-slate-800"></div>
              <div>
                <div class="text-[9px] uppercase font-bold text-slate-400">${isMilestoneVms ? 'Milestone Recorders' : 'Genetec Archivers'}</div>
                <div class="text-xs font-mono font-bold ${g.isArchiverCountVerified !== false ? 'text-emerald-400' : 'text-rose-400'}">
                  ${isMilestoneVms ? `${g.recommendedArchiverServers || 1} Husky Server(s) (${g.activeArchiverRoles || 1} Instance(s))` : `${g.activeArchiverRoles} Role${g.activeArchiverRoles === 1 ? '' : 's'} (${g.recommendedArchiverServers} Server${g.recommendedArchiverServers === 1 ? '' : 's'})`}
                </div>
              </div>
              <div class="h-6 w-px bg-slate-800"></div>
              <div>
                <div class="text-[9px] uppercase font-bold text-slate-400">BOM Quoted</div>
                <div class="text-xs font-mono font-bold ${isStorageHealthy ? 'text-emerald-400' : 'text-amber-400'}">${quotedUsableTB} TB</div>
              </div>
            </div>

            <button onclick="setVideoSizerParam('toggleDetails', !videoShowDetailsPanel)" class="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer" title="Toggle RAID Drive Matrix & VMS Recorder Mapping">
              <i data-lucide="${showMatrix ? 'chevron-up' : 'chevron-down'}" class="w-3.5 h-3.5 text-purple-400"></i>
              <span>${showMatrix ? 'Hide Matrix' : 'RAID & Recorder Matrix'}</span>
            </button>

            <button onclick="autoFitNvrToBom()" class="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer" title="Auto-Fit Server/NVR to BOM based on required Usable TB and VMS throughput">
              <i data-lucide="wand-2" class="w-3.5 h-3.5"></i>
              <span>Auto-Fit ${isMilestoneVms ? 'Husky IVO' : 'Server'}</span>
            </button>
          </div>
        </div>

        <!-- Row 2: Multi-Group Camera & Recording Schedule Table + Global RAID & Archiver Controls -->
        <div class="bg-slate-950/90 border border-slate-800 rounded-xl p-3 flex flex-col gap-2.5">
          <!-- Table Toolbar: Add Camera Group, Import BOM Cameras, Global RAID Level & Archiver Roles -->
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-[11px] font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                <i data-lucide="camera" class="w-3.5 h-3.5 text-purple-400"></i>
                <span>Camera Groups &amp; Recording Schedules (${(vCalc.cameraGroups || []).length} Group${(vCalc.cameraGroups || []).length === 1 ? '' : 's'})</span>
              </span>
              <button onclick="addVideoCameraGroup()" class="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold flex items-center gap-1 shadow-sm transition-all cursor-pointer" title="Add another camera group with different resolution, frame rate, motion %, or retention days">
                <i data-lucide="plus" class="w-3.5 h-3.5"></i>
                <span>Add Camera Group</span>
              </button>
              ${vCalc.bomCameraUnits > 0 ? `
                <button onclick="importBomCamerasToGroups()" class="px-2.5 py-1 rounded-lg ${vCalc.sourceMode === 'bom' ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-700/60' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'} text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer" title="Import cameras from Project BOM into editable camera groups">
                  <i data-lucide="download" class="w-3 h-3"></i>
                  <span>Sync BOM Cameras (${vCalc.bomCameraUnits})</span>
                </button>
              ` : ''}
            </div>

            <!-- Global Storage RAID & Genetec Archiver Role Controls -->
            <div class="flex flex-wrap items-center gap-2">
              ${vCalc.anyLowFpsUntilMotion ? `
                <span class="text-[10px] font-mono px-2 py-1 rounded-lg bg-emerald-950/90 border border-emerald-700/60 text-emerald-300" title="Low-FPS baseline active on ${vCalc.lowFpsGroupCount || 1} camera group(s), adding ${vCalc.lowFpsAddedMbps || 0} Mbps average (+${vCalc.lowFpsAddedUsableTb || 0} TB usable storage) compared to motion-only recording">
                  Low-FPS Active (${vCalc.lowFpsGroupCount}/${(vCalc.cameraGroups || []).length} Groups): ${vCalc.idleIngressMbps || 0} Mbps Idle ➔ ${vCalc.peakIngressMbps} Mbps Boost (+${vCalc.lowFpsAddedUsableTb || 0} TB)
                </span>
              ` : ''}

              <div class="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1">
                <span class="text-[9px] font-bold uppercase text-slate-400">RAID Level:</span>
                <select onchange="setVideoSizerParam('raidType', this.value)" class="bg-slate-950 border border-slate-700/80 rounded px-1.5 py-0.5 text-amber-300 font-bold text-xs focus:outline-none cursor-pointer">
                  <option value="RAID 5" class="bg-slate-900" ${vCalc.raidLevel === 'RAID 5' ? 'selected' : ''}>RAID 5 (1 Parity)</option>
                  <option value="RAID 6" class="bg-slate-900" ${vCalc.raidLevel === 'RAID 6' ? 'selected' : ''}>RAID 6 (2 Parity)</option>
                  <option value="RAID 10" class="bg-slate-900" ${vCalc.raidLevel === 'RAID 10' ? 'selected' : ''}>RAID 10 (50% Mirror)</option>
                  <option value="RAID 50" class="bg-slate-900" ${vCalc.raidLevel === 'RAID 50' ? 'selected' : ''}>RAID 50 (Dual R5)</option>
                  <option value="RAID 60" class="bg-slate-900" ${vCalc.raidLevel === 'RAID 60' ? 'selected' : ''}>RAID 60 (Dual R6)</option>
                  <option value="JBOD" class="bg-slate-900" ${vCalc.raidLevel === 'JBOD' ? 'selected' : ''}>JBOD (No Parity)</option>
                </select>
              </div>

              <div class="flex items-center gap-1.5 bg-slate-900 border ${g.isArchiverCountVerified ? 'border-slate-800' : 'border-rose-600'} rounded-lg px-2.5 py-1">
                <span class="text-[9px] font-bold uppercase text-slate-400">Archiver Roles:</span>
                <input type="number" min="0" max="64" value="${videoArchiverRoles === 0 ? g.activeArchiverRoles : videoArchiverRoles}" onchange="setVideoSizerParam('archiverRoles', Math.max(0, parseInt(this.value, 10) || 0))" class="w-12 bg-slate-950 border border-slate-700/80 rounded px-1.5 py-0.5 text-xs font-mono font-bold ${g.isArchiverCountVerified ? 'text-emerald-400' : 'text-rose-400'} focus:outline-none text-center" title="Enter number of Genetec Archiver roles to verify against bitrate & camera count (0 = Auto)" />
                <button onclick="setVideoSizerParam('archiverRoles', 0)" class="text-[9px] font-mono px-1.5 py-0.5 rounded ${videoArchiverRoles === 0 ? 'bg-purple-900/80 text-purple-200' : 'bg-slate-800 text-slate-400 hover:text-white'} cursor-pointer" title="Reset to Auto-Calculated minimum Archiver roles">
                  Auto (${g.minRequiredArchiverRoles})
                </button>
              </div>
            </div>
          </div>

          <!-- Camera Groups Table (with Per-Column "All" Sync Checkboxes & Per-Group Low-FPS Until Motion) -->
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="border-b border-slate-800 text-[9px] uppercase font-bold text-slate-400 align-bottom">
                  <th class="py-1.5 px-2 min-w-[125px]">Group Name</th>
                  <th class="py-1.5 px-1.5 w-20">Cameras</th>
                  <th class="py-1.5 px-1.5 min-w-[125px]">
                    <div class="flex flex-col gap-0.5">
                      <label class="inline-flex items-center gap-1 text-[8px] font-mono text-purple-300 cursor-pointer select-none" title="Check to set all camera groups to the same Sensors per Camera setting">
                        <input type="checkbox" ${videoSyncAllColumns.heads ? 'checked' : ''} onchange="toggleVideoColumnSync('heads', this.checked)" class="w-3 h-3 rounded accent-purple-500 cursor-pointer" />
                        <span>All Same</span>
                      </label>
                      <span>Sensors per Camera</span>
                    </div>
                  </th>
                  <th class="py-1.5 px-1.5 min-w-[130px]">
                    <div class="flex flex-col gap-0.5">
                      <label class="inline-flex items-center gap-1 text-[8px] font-mono text-purple-300 cursor-pointer select-none" title="Check to set all camera groups to the same Resolution">
                        <input type="checkbox" ${videoSyncAllColumns.resolutionMp ? 'checked' : ''} onchange="toggleVideoColumnSync('resolutionMp', this.checked)" class="w-3 h-3 rounded accent-purple-500 cursor-pointer" />
                        <span>All Same</span>
                      </label>
                      <span>Resolution / Sensor</span>
                    </div>
                  </th>
                  <th class="py-1.5 px-1.5 w-24">
                    <div class="flex flex-col gap-0.5">
                      <label class="inline-flex items-center gap-1 text-[8px] font-mono text-purple-300 cursor-pointer select-none" title="Check to set all camera groups to the same target Frame Rate">
                        <input type="checkbox" ${videoSyncAllColumns.fps ? 'checked' : ''} onchange="toggleVideoColumnSync('fps', this.checked)" class="w-3 h-3 rounded accent-purple-500 cursor-pointer" />
                        <span>All Same</span>
                      </label>
                      <span>Frame Rate</span>
                    </div>
                  </th>
                  <th class="py-1.5 px-1.5 min-w-[140px]">
                    <div class="flex flex-col gap-0.5">
                      <div class="flex items-center justify-between gap-1">
                        <label class="inline-flex items-center gap-1 text-[8px] font-mono text-emerald-300 cursor-pointer select-none" title="Check/uncheck to enable or disable Low-FPS Until Motion for ALL camera groups at once">
                          <input type="checkbox" ${vCalc.allLowFpsUntilMotion ? 'checked' : ''} onchange="toggleAllCameraGroupsLowFps(this.checked)" class="w-3 h-3 rounded accent-emerald-500 cursor-pointer" />
                          <span>All Groups</span>
                        </label>
                        <select onchange="setAllCameraGroupsIdleFps(Number(this.value))" class="bg-slate-900 border border-slate-700 rounded px-1 py-0 text-[8px] font-mono text-emerald-300 cursor-pointer" title="Set Idle FPS for all camera groups">
                          ${[1, 2, 3, 4, 5].map(ifps => `<option value="${ifps}" class="bg-slate-900" ${(vCalc.idleFps || 2) === ifps ? 'selected' : ''}>All ${ifps}FPS</option>`).join('')}
                        </select>
                      </div>
                      <span class="text-emerald-300">Low-FPS Until Motion</span>
                    </div>
                  </th>
                  <th class="py-1.5 px-1.5 min-w-[120px]">
                    <div class="flex flex-col gap-0.5">
                      <label class="inline-flex items-center gap-1 text-[8px] font-mono text-purple-300 cursor-pointer select-none" title="Check to set all camera groups to the same Codec">
                        <input type="checkbox" ${videoSyncAllColumns.codec ? 'checked' : ''} onchange="toggleVideoColumnSync('codec', this.checked)" class="w-3 h-3 rounded accent-purple-500 cursor-pointer" />
                        <span>All Same</span>
                      </label>
                      <span>Format / Codec</span>
                    </div>
                  </th>
                  <th class="py-1.5 px-1.5 min-w-[115px]">
                    <div class="flex flex-col gap-0.5">
                      <label class="inline-flex items-center gap-1 text-[8px] font-mono text-purple-300 cursor-pointer select-none" title="Check to set all camera groups to the same Scene Activity">
                        <input type="checkbox" ${videoSyncAllColumns.sceneActivity ? 'checked' : ''} onchange="toggleVideoColumnSync('sceneActivity', this.checked)" class="w-3 h-3 rounded accent-purple-500 cursor-pointer" />
                        <span>All Same</span>
                      </label>
                      <span>Scene Activity</span>
                    </div>
                  </th>
                  <th class="py-1.5 px-1.5 min-w-[155px]">
                    <div class="flex flex-col gap-0.5">
                      <label class="inline-flex items-center gap-1 text-[8px] font-mono text-purple-300 cursor-pointer select-none" title="Check to set all camera groups to the same Recording Mode / Motion %">
                        <input type="checkbox" ${videoSyncAllColumns.motionDutyPct ? 'checked' : ''} onchange="toggleVideoColumnSync('motionDutyPct', this.checked)" class="w-3 h-3 rounded accent-purple-500 cursor-pointer" />
                        <span>All Same</span>
                      </label>
                      <span>Recording Mode / Motion</span>
                    </div>
                  </th>
                  <th class="py-1.5 px-1.5 w-28">
                    <div class="flex flex-col gap-0.5">
                      <label class="inline-flex items-center gap-1 text-[8px] font-mono text-purple-300 cursor-pointer select-none" title="Check to set all camera groups to the same Retention (Days)">
                        <input type="checkbox" ${videoSyncAllColumns.retentionDays ? 'checked' : ''} onchange="toggleVideoColumnSync('retentionDays', this.checked)" class="w-3 h-3 rounded accent-purple-500 cursor-pointer" />
                        <span>All Same</span>
                      </label>
                      <span>Retention (Days)</span>
                    </div>
                  </th>
                  <th class="py-1.5 px-2 text-right min-w-[130px]">Peak / Average Mbps</th>
                  <th class="py-1.5 px-2 text-right min-w-[95px]">Group Usable</th>
                  <th class="py-1.5 px-1.5 text-center w-16">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800/60">
                ${(vCalc.cameraGroups || []).map((grp, idx) => `
                  <tr class="hover:bg-slate-900/50 transition-colors">
                    <!-- Group Name -->
                    <td class="py-1.5 px-2">
                      <input type="text" value="${escapeHTML(grp.name || `Group ${idx + 1}`)}" onchange="updateVideoCameraGroup(${idx}, 'name', this.value)" class="w-full bg-slate-900 border border-slate-700/80 rounded px-2 py-1 text-xs font-semibold text-white focus:outline-none focus:border-purple-500" />
                    </td>
                    <!-- Camera Count -->
                    <td class="py-1.5 px-1.5">
                      <input type="number" min="1" max="5000" value="${grp.qty}" onchange="updateVideoCameraGroup(${idx}, 'qty', Math.max(1, parseInt(this.value, 10) || 1))" class="w-full bg-slate-900 border border-slate-700/80 rounded px-2 py-1 text-xs font-mono font-bold text-white text-center focus:outline-none focus:border-purple-500" />
                    </td>
                    <!-- Sensors per Camera -->
                    <td class="py-1.5 px-1.5">
                      <select onchange="updateVideoCameraGroup(${idx}, 'heads', Number(this.value))" class="w-full bg-slate-900 border border-slate-700/80 rounded px-1.5 py-1 text-slate-200 font-mono text-xs focus:outline-none cursor-pointer" title="Number of sensor heads/streams per camera unit">
                        <option value="1" class="bg-slate-900" ${(grp.heads || 1) === 1 ? 'selected' : ''}>1x Single</option>
                        <option value="2" class="bg-slate-900" ${grp.heads === 2 ? 'selected' : ''}>2x Dual</option>
                        <option value="3" class="bg-slate-900" ${grp.heads === 3 ? 'selected' : ''}>3x Triple</option>
                        <option value="4" class="bg-slate-900" ${grp.heads === 4 ? 'selected' : ''}>4x Quad</option>
                        <option value="5" class="bg-slate-900" ${grp.heads === 5 ? 'selected' : ''}>5x (4-Head+PTZ)</option>
                      </select>
                    </td>
                    <!-- Resolution -->
                    <td class="py-1.5 px-1.5">
                      <select onchange="updateVideoCameraGroup(${idx}, 'resolutionMp', Number(this.value))" class="w-full bg-slate-900 border border-slate-700/80 rounded px-1.5 py-1 text-white font-bold text-xs focus:outline-none cursor-pointer">
                        ${[
                          { mp: 1, label: "1MP (720p HD)" },
                          { mp: 2, label: "2MP (1080p FHD)" },
                          { mp: 3, label: "3MP (2048x1536)" },
                          { mp: 4, label: "4MP (2K QHD)" },
                          { mp: 5, label: "5MP (2592x1944)" },
                          { mp: 6, label: "6MP (3072x2048)" },
                          { mp: 8, label: "8MP (4K UHD)" },
                          { mp: 12, label: "12MP (Fisheye)" },
                          { mp: 16, label: "16MP (Panoramic)" },
                          { mp: 20, label: "20MP (Multi/Pan)" },
                          { mp: 32, label: "32MP (Ultra-Pan)" }
                        ].map(r => `<option value="${r.mp}" class="bg-slate-900" ${grp.resolutionMp === r.mp ? 'selected' : ''}>${r.label}</option>`).join('')}
                      </select>
                    </td>
                    <!-- Frame Rate (FPS) -->
                    <td class="py-1.5 px-1.5">
                      <select onchange="updateVideoCameraGroup(${idx}, 'fps', Number(this.value))" class="w-full bg-slate-900 border border-slate-700/80 rounded px-1.5 py-1 text-white font-bold text-xs focus:outline-none cursor-pointer">
                        ${[1, 5, 10, 12, 15, 20, 24, 30, 60].map(f => `<option value="${f}" class="bg-slate-900" ${grp.fps === f ? 'selected' : ''}>${f} FPS</option>`).join('')}
                      </select>
                    </td>
                    <!-- Per-Group Low-FPS Until Motion (e.g. 2 FPS Idle -> High FPS on Motion/Event) -->
                    <td class="py-1.5 px-1.5">
                      <div class="flex items-center gap-1.5 px-2 py-1 rounded border ${grp.lowFpsUntilMotion ? 'bg-emerald-950/30 border-emerald-600/60' : 'bg-slate-900 border-slate-700/80'}">
                        <input type="checkbox" ${grp.lowFpsUntilMotion ? 'checked' : ''} onchange="updateVideoCameraGroup(${idx}, 'lowFpsUntilMotion', this.checked)" class="w-3.5 h-3.5 rounded accent-emerald-500 cursor-pointer shrink-0" title="Enable low-FPS continuous recording for this camera group until motion/event boosts to ${grp.fps} FPS" />
                        <select onchange="updateVideoCameraGroup(${idx}, 'idleFps', Number(this.value))" class="w-full bg-transparent ${grp.lowFpsUntilMotion ? 'text-emerald-300 font-bold' : 'text-slate-400'} font-mono text-[11px] focus:outline-none cursor-pointer" title="Idle frame rate for this camera group before motion/event occurs">
                          ${[1, 2, 3, 4, 5].map(ifps => `<option value="${ifps}" class="bg-slate-900" ${(grp.idleFps || 2) === ifps ? 'selected' : ''}>${ifps} FPS ➔ ${grp.fps} FPS</option>`).join('')}
                        </select>
                      </div>
                    </td>
                    <!-- Format / Codec -->
                    <td class="py-1.5 px-1.5">
                      <select onchange="updateVideoCameraGroup(${idx}, 'codec', this.value)" class="w-full bg-slate-900 border border-slate-700/80 rounded px-1.5 py-1 text-sky-300 font-bold text-xs focus:outline-none cursor-pointer">
                        <option value="H.265" class="bg-slate-900" ${grp.codec === 'H.265' ? 'selected' : ''}>H.265 (HEVC)</option>
                        <option value="H.265+" class="bg-slate-900" ${grp.codec === 'H.265+' ? 'selected' : ''}>H.265+ (Smart)</option>
                        <option value="H.264" class="bg-slate-900" ${grp.codec === 'H.264' ? 'selected' : ''}>H.264 (AVC)</option>
                        <option value="AV1" class="bg-slate-900" ${grp.codec === 'AV1' ? 'selected' : ''}>AV1 (Genetec 5.14)</option>
                        <option value="AVI" class="bg-slate-900" ${grp.codec === 'AVI' ? 'selected' : ''}>AVI / MJPEG</option>
                      </select>
                    </td>
                    <!-- Scene Activity -->
                    <td class="py-1.5 px-1.5">
                      <select onchange="updateVideoCameraGroup(${idx}, 'sceneActivity', this.value)" class="w-full bg-slate-900 border border-slate-700/80 rounded px-1.5 py-1 text-white font-bold text-xs focus:outline-none cursor-pointer">
                        <option value="low" class="bg-slate-900" ${grp.sceneActivity === 'low' ? 'selected' : ''}>Low (0.65x)</option>
                        <option value="medium" class="bg-slate-900" ${grp.sceneActivity === 'medium' ? 'selected' : ''}>Medium (1.0x)</option>
                        <option value="high" class="bg-slate-900" ${grp.sceneActivity === 'high' ? 'selected' : ''}>High (1.40x)</option>
                        <option value="ultra" class="bg-slate-900" ${grp.sceneActivity === 'ultra' ? 'selected' : ''}>Very High (1.75x)</option>
                      </select>
                    </td>
                    <!-- Recording Mode / Motion Duty -->
                    <td class="py-1.5 px-1.5">
                      <select onchange="updateVideoCameraGroup(${idx}, 'motionDutyPct', Number(this.value))" class="w-full bg-slate-900 border border-slate-700/80 rounded px-1.5 py-1 text-white font-bold text-xs focus:outline-none cursor-pointer">
                        <option value="100" class="bg-slate-900" ${grp.motionDutyPct >= 100 ? 'selected' : ''}>Continuous (100%)</option>
                        <option value="75" class="bg-slate-900" ${grp.motionDutyPct === 75 ? 'selected' : ''}>${grp.lowFpsUntilMotion ? `75% Boost / 25% @ ${grp.idleFps || 2}FPS` : 'Motion High (75%)'}</option>
                        <option value="70" class="bg-slate-900" ${grp.motionDutyPct === 70 ? 'selected' : ''}>${grp.lowFpsUntilMotion ? `70% Boost / 30% @ ${grp.idleFps || 2}FPS` : 'Motion Commercial (70%)'}</option>
                        <option value="50" class="bg-slate-900" ${grp.motionDutyPct === 50 ? 'selected' : ''}>${grp.lowFpsUntilMotion ? `50% Boost / 50% @ ${grp.idleFps || 2}FPS` : 'Motion Medium (50%)'}</option>
                        <option value="25" class="bg-slate-900" ${grp.motionDutyPct === 25 ? 'selected' : ''}>${grp.lowFpsUntilMotion ? `25% Boost / 75% @ ${grp.idleFps || 2}FPS` : 'Motion Low (25%)'}</option>
                        <option value="10" class="bg-slate-900" ${grp.motionDutyPct === 10 ? 'selected' : ''}>${grp.lowFpsUntilMotion ? `10% Boost / 90% @ ${grp.idleFps || 2}FPS` : 'Motion Minimum (10%)'}</option>
                      </select>
                    </td>
                    <!-- Retention Days (Number input with quick step) -->
                    <td class="py-1.5 px-1.5">
                      <div class="flex items-center gap-1">
                        <input type="number" min="1" max="1825" value="${grp.retentionDays}" onchange="updateVideoCameraGroup(${idx}, 'retentionDays', Math.max(1, parseInt(this.value, 10) || 30))" class="w-full bg-slate-900 border border-slate-700/80 rounded px-2 py-1 text-xs font-mono font-bold text-amber-300 text-center focus:outline-none focus:border-purple-500" title="Retention in days for this camera group" />
                        <span class="text-[10px] text-slate-400 font-mono">Days</span>
                      </div>
                    </td>
                    <!-- Group Peak / Average Bitrate -->
                    <td class="py-1.5 px-2 text-right font-mono">
                      <div class="text-xs font-bold text-sky-400">${grp.peakIngressMbps} <span class="text-slate-500">/</span> ${grp.averageRecordingMbps}</div>
                      <div class="text-[9px] ${grp.lowFpsUntilMotion ? 'text-emerald-400' : 'text-slate-500'}">
                        ${grp.lowFpsUntilMotion ? `Idle: ${grp.idleIngressMbps} Mbps (@${grp.idleFps}fps)` : `${grp.perCameraMbps} Mbps per Camera (${grp.totalStreams} Streams)`}
                      </div>
                    </td>
                    <!-- Group Usable TB -->
                    <td class="py-1.5 px-2 text-right font-mono">
                      <div class="text-xs font-bold text-purple-300">${grp.requiredUsableTb} TB</div>
                      <div class="text-[9px] text-slate-500">${grp.dailyStorageGb} GB/Day</div>
                    </td>
                    <!-- Row Actions -->
                    <td class="py-1.5 px-1.5 text-center">
                      <div class="flex items-center justify-center gap-1">
                        <button onclick="duplicateVideoCameraGroup(${idx})" class="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-sky-300 transition-colors cursor-pointer" title="Duplicate this camera group">
                          <i data-lucide="copy" class="w-3.5 h-3.5"></i>
                        </button>
                        ${(vCalc.cameraGroups || []).length > 1 ? `
                          <button onclick="removeVideoCameraGroup(${idx})" class="p-1 rounded hover:bg-rose-950/80 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer" title="Remove this camera group">
                            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                          </button>
                        ` : ''}
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Row 2.5: Archiver / NVR Failover Calculator (Dynamic N-Server Ring vs. Shared Dedicated Failover N ➔ M) -->
        ${(() => {
          const fo = vCalc.failover || {
            structure: 'none',
            ringNodes: 0,
            dynamicAutoRingNodes: 2,
            ringChainText: 'None',
            ringNodeSchedule: [],
            dedicatedPoolSchedule: [],
            dedicatedFailoverServers: 0,
            simultaneousFailures: 1,
            loadsPerFailoverServer: 1,
            minFailoverServersForK: 1,
            primaryServerCount: g.recommendedArchiverServers || 1,
            totalServersRequired: g.recommendedArchiverServers || 1,
            normalCamsPerServer: vCalc.totalCameras,
            normalMbpsPerServer: vCalc.peakIngressMbps,
            failoverCamsOnSurvivor: vCalc.totalCameras,
            failoverMbpsOnSurvivor: vCalc.peakIngressMbps,
            primaryUsableTbPerServer: vCalc.basePrimaryUsableTb || vCalc.requiredUsableTB,
            failoverBufferTbPerServer: 0,
            totalUsableTbPerRingServer: vCalc.basePrimaryUsableTb || vCalc.requiredUsableTB,
            failoverAddedUsableTb: 0,
            isRingSurvivorVerified: true,
            isDedicatedSurvivorVerified: true
          };
          const isRing = fo.structure === 'ring';
          const isDedicated = fo.structure === 'dedicated';
          const isActiveFailover = isRing || isDedicated;
          const bufferSelectorValue = !videoFailoverIncludeStorageBuffer ? -1 : (videoFailoverRetentionDays || 0);

          return `
            <div class="bg-slate-950/90 border ${isActiveFailover ? 'border-cyan-500/40' : 'border-slate-800'} rounded-xl p-3 flex flex-col gap-2.5">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="text-[11px] font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                    <i data-lucide="refresh-cw" class="w-3.5 h-3.5 ${isActiveFailover ? 'text-cyan-400' : 'text-slate-400'}"></i>
                    <span>Archiver / NVR Failover Calculator</span>
                  </span>
                  <!-- Failover Structure Segmented Buttons -->
                  <div class="inline-flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-[11px]">
                    <button type="button" onclick="setVideoSizerParam('failoverStructure', 'none')" class="px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${fo.structure === 'none' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}">
                      None (Standalone)
                    </button>
                    <button type="button" onclick="setVideoSizerParam('failoverStructure', 'ring')" class="px-2.5 py-1 rounded-md font-bold flex items-center gap-1 transition-all cursor-pointer ${isRing ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'}" title="Dynamic N-Server Ring Failover (S1 ➔ S2 ➔ ... ➔ SN ➔ S1): Each server in the ring hosts a Primary Archiver + Standby Archiver for its upstream neighbor">
                      <i data-lucide="repeat" class="w-3 h-3"></i>
                      <span>Ring Failover (${isRing ? `${fo.ringNodes}-Server Ring: ${fo.ringChainText}` : 'Dynamic N-Server Ring'})</span>
                    </button>
                    <button type="button" onclick="setVideoSizerParam('failoverStructure', 'dedicated')" class="px-2.5 py-1 rounded-md font-bold flex items-center gap-1 transition-all cursor-pointer ${isDedicated ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}" title="Dedicated Failover Server(s) (N Main ➔ M Shared Failover): Multiple main servers can fail over to the same shared failover server(s)">
                      <i data-lucide="server-cog" class="w-3 h-3"></i>
                      <span>Dedicated Failover (${isDedicated ? `${fo.primaryServerCount} Main ➔ ${fo.dedicatedFailoverServers} Failover` : 'N Main ➔ M Shared'})</span>
                    </button>
                  </div>
                </div>

                ${isActiveFailover ? `
                  <div class="flex flex-wrap items-center gap-2">
                    ${isRing ? `
                      <!-- Dynamic Ring Server Count Control (Auto or any N >= 2) -->
                      <div class="flex items-center gap-1.5 bg-slate-900 border border-cyan-500/40 rounded-lg px-2.5 py-1" title="Number of servers in the failover ring (dynamically builds A➔B➔A for 2, A➔B➔C➔A for 3, A➔B➔C➔D➔A for 4, etc.)">
                        <span class="text-[9px] font-bold uppercase text-cyan-300">Ring Servers (N):</span>
                        <input type="number" min="2" max="64" value="${fo.ringNodes}" onchange="setVideoSizerParam('ringNodeCount', Math.max(2, parseInt(this.value, 10) || 2))" class="w-12 bg-slate-950 border border-slate-700/80 rounded px-1.5 py-0.5 text-xs font-mono font-bold text-cyan-300 focus:outline-none text-center" />
                        <button type="button" onclick="setVideoSizerParam('ringNodeCount', 0)" class="text-[9px] font-mono px-1.5 py-0.5 rounded ${videoRingNodeCount === 0 ? 'bg-cyan-900/80 text-cyan-200' : 'bg-slate-800 text-slate-400 hover:text-white'} cursor-pointer" title="Automatically size ring to match required servers (${fo.dynamicAutoRingNodes || 2} servers)">
                          Auto (${fo.dynamicAutoRingNodes || 2})
                        </button>
                      </div>
                    ` : `
                      <!-- Dedicated Many-to-One / Shared Pool Controls: N Main Servers, M Shared Failover Servers, K Simultaneous Failures -->
                      <div class="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1" title="Number of Main Primary Servers being protected by the shared Failover Server pool">
                        <span class="text-[9px] font-bold uppercase text-slate-300">Main Servers (N):</span>
                        <input type="number" min="1" max="64" value="${fo.primaryServerCount}" onchange="setVideoSizerParam('dedicatedPrimaryCount', Math.max(1, parseInt(this.value, 10) || 1))" class="w-11 bg-slate-950 border border-slate-700/80 rounded px-1 py-0.5 text-xs font-mono font-bold text-sky-300 focus:outline-none text-center" />
                        <button type="button" onclick="setVideoSizerParam('dedicatedPrimaryCount', 0)" class="text-[9px] font-mono px-1.5 py-0.5 rounded ${videoDedicatedPrimaryCount === 0 ? 'bg-purple-900/80 text-purple-200' : 'bg-slate-800 text-slate-400 hover:text-white'} cursor-pointer" title="Auto-calculate Main Primary Servers from camera/throughput load">
                          Auto
                        </button>
                      </div>
                      <div class="flex items-center gap-1.5 bg-slate-900 border border-indigo-500/40 rounded-lg px-2.5 py-1" title="Number of shared Dedicated Failover Servers (M) monitoring the N Main Servers">
                        <span class="text-[9px] font-bold uppercase text-indigo-300">Failover Servers (M):</span>
                        <input type="number" min="1" max="32" value="${fo.dedicatedFailoverServers}" onchange="setVideoSizerParam('dedicatedFailoverCount', Math.max(1, parseInt(this.value, 10) || 1))" class="w-11 bg-slate-950 border border-slate-700/80 rounded px-1 py-0.5 text-xs font-mono font-bold text-indigo-300 focus:outline-none text-center" />
                      </div>
                      <div class="flex items-center gap-1.5 bg-slate-900 border border-amber-500/30 rounded-lg px-2.5 py-1" title="How many Main Servers can fail at the exact same time onto the shared Failover pool? (1 = Standard N+1 where 1 Main Server fails at a time; 2+ = multi-server simultaneous outage)">
                        <span class="text-[9px] font-bold uppercase text-amber-300">Simultaneous Failures (K):</span>
                        <select onchange="setVideoSizerParam('maxSimultaneousFailures', Number(this.value))" class="bg-slate-950 border border-slate-700/80 rounded px-1.5 py-0.5 text-amber-300 font-mono font-bold text-xs focus:outline-none cursor-pointer">
                          ${Array.from({ length: Math.max(1, fo.primaryServerCount) }, (_, kIdx) => kIdx + 1).map(k => `
                            <option value="${k}" class="bg-slate-900" ${(fo.simultaneousFailures || 1) === k ? 'selected' : ''}>
                              ${k} Main Server(s) at once${k === 1 ? ' (Standard N+1)' : k === fo.primaryServerCount ? ' (All Main Servers)' : ''}
                            </option>
                          `).join('')}
                        </select>
                      </div>
                    `}

                    <!-- Failover Storage Buffer Selector -->
                    <div class="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1" title="Storage buffer reserved for recording failover streams during an outage">
                      <span class="text-[9px] font-bold uppercase text-slate-400">Failover Storage Buffer:</span>
                      <select onchange="setVideoSizerParam('failoverBufferMode', Number(this.value))" class="bg-slate-950 border border-slate-700/80 rounded px-1.5 py-0.5 text-amber-300 font-mono font-bold text-xs focus:outline-none cursor-pointer">
                        <option value="0" class="bg-slate-900" ${bufferSelectorValue === 0 ? 'selected' : ''}>Full Retention Mirror (100%)</option>
                        <option value="30" class="bg-slate-900" ${bufferSelectorValue === 30 ? 'selected' : ''}>30-Day Failover Buffer</option>
                        <option value="14" class="bg-slate-900" ${bufferSelectorValue === 14 ? 'selected' : ''}>14-Day Failover Buffer</option>
                        <option value="7" class="bg-slate-900" ${bufferSelectorValue === 7 ? 'selected' : ''}>7-Day Failover Buffer</option>
                        <option value="3" class="bg-slate-900" ${bufferSelectorValue === 3 ? 'selected' : ''}>3-Day Outage Buffer</option>
                        <option value="-1" class="bg-slate-900" ${bufferSelectorValue === -1 ? 'selected' : ''}>Switchover Only (0 TB Extra)</option>
                      </select>
                    </div>
                  </div>
                ` : `
                  <span class="text-[10px] text-slate-400 font-mono">
                    Select <strong class="text-cyan-300">Ring Failover (Dynamic N-Server Ring)</strong> or <strong class="text-indigo-300">Dedicated Failover (N Main ➔ M Shared)</strong> to size survivor throughput &amp; failover storage buffers.
                  </span>
                `}
              </div>

              ${isRing ? `
                <!-- Dynamic N-Server Ring Failover Visual Chain & Survivor Load Telemetry -->
                <div class="grid grid-cols-1 xl:grid-cols-12 gap-2.5 pt-1 border-t border-slate-800/80">
                  <div class="xl:col-span-5 bg-slate-900/90 border border-cyan-500/30 rounded-lg p-2.5 flex flex-col justify-between gap-2">
                    <div class="flex items-center justify-between gap-2">
                      <span class="text-[10px] font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1">
                        <i data-lucide="git-merge" class="w-3.5 h-3.5"></i>
                        <span>Dynamic ${fo.ringNodes}-Server Ring Chain</span>
                      </span>
                      <span class="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${fo.isRingSurvivorVerified ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60' : 'bg-amber-950 text-amber-300 border border-amber-700/60'}">
                        ${fo.isRingSurvivorVerified ? '✓ 2x Survivor Load Verified' : `⚠ Minimum ${fo.minCompliantRingNodes} Ring Servers Needed`}
                      </span>
                    </div>
                    <div class="px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 font-mono text-xs font-bold text-cyan-300 text-center tracking-wide">
                      ${fo.ringChainText}
                    </div>
                    <div class="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                      ${(fo.ringNodeSchedule || []).map(node => `
                        <div class="flex-1 min-w-[125px] p-1.5 rounded bg-slate-950/80 border border-slate-800/90 text-[10px] font-mono">
                          <div class="font-bold text-white flex items-center justify-between">
                            <span>${node.nodeLabel}</span>
                            <span class="text-cyan-400">➔ ${node.failsOverTo}</span>
                          </div>
                          <div class="text-[9px] text-slate-400 mt-0.5">Normal: <strong class="text-sky-300">${node.normalCams} Cameras / ${node.normalMbps} Mbps</strong></div>
                          <div class="text-[9px] text-slate-400">Failover: <strong class="text-amber-300">${node.survivorCams} Cameras / ${node.survivorMbps} Mbps</strong></div>
                        </div>
                      `).join('')}
                    </div>
                  </div>

                  <div class="xl:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div class="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
                      <div class="text-[9px] font-mono uppercase text-slate-400">Ring Fleet Size</div>
                      <div class="text-sm font-mono font-bold text-cyan-300">${fo.ringNodes} Servers</div>
                      <div class="text-[9px] text-slate-500">1 Primary + 1 Neighbor Standby per Server</div>
                    </div>
                    <div class="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
                      <div class="text-[9px] font-mono uppercase text-slate-400">Normal Load / Node</div>
                      <div class="text-sm font-mono font-bold text-sky-400">${fo.normalMbpsPerServer} Mbps</div>
                      <div class="text-[9px] text-slate-500">${fo.normalCamsPerServer} Cameras • ${fo.primaryUsableTbPerServer} TB Primary</div>
                    </div>
                    <div class="p-2.5 rounded-lg bg-slate-900/80 border ${fo.isRingSurvivorVerified ? 'border-slate-800' : 'border-amber-600/70'} flex flex-col justify-between">
                      <div class="text-[9px] font-mono uppercase text-amber-300">Survivor Load (2x)</div>
                      <div class="text-sm font-mono font-bold text-amber-300">${fo.failoverMbpsOnSurvivor} Mbps</div>
                      <div class="text-[9px] text-slate-400">${fo.failoverCamsOnSurvivor} Cameras when neighbor fails</div>
                    </div>
                    <div class="p-2.5 rounded-lg bg-slate-900/80 border border-purple-500/30 flex flex-col justify-between">
                      <div class="text-[9px] font-mono uppercase text-purple-300">Storage / Ring Node</div>
                      <div class="text-sm font-mono font-bold text-purple-300">${fo.totalUsableTbPerRingServer} TB per Server</div>
                      <div class="text-[9px] text-slate-400">+${fo.failoverBufferTbPerServer} TB buffer (+${fo.failoverAddedUsableTb} TB total)</div>
                    </div>
                  </div>
                </div>
              ` : ''}

              ${isDedicated ? `
                <!-- Dedicated Shared Failover Pool (N Main Servers ➔ M Shared Failover Server(s)) Telemetry -->
                <div class="grid grid-cols-1 xl:grid-cols-12 gap-2.5 pt-1 border-t border-slate-800/80">
                  <div class="xl:col-span-5 bg-slate-900/90 border border-indigo-500/30 rounded-lg p-2.5 flex flex-col justify-between gap-2">
                    <div class="flex items-center justify-between gap-2">
                      <span class="text-[10px] font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1">
                        <i data-lucide="share-2" class="w-3.5 h-3.5"></i>
                        <span>Shared Failover Pool (${fo.primaryServerCount} Main ➔ ${fo.dedicatedFailoverServers} Failover)</span>
                      </span>
                      <span class="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${fo.isDedicatedSurvivorVerified !== false ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60' : 'bg-amber-950 text-amber-300 border border-amber-700/60'}">
                        ${fo.isDedicatedSurvivorVerified !== false ? `✓ Covers ${fo.simultaneousFailures || 1} Simultaneous Failure(s)` : `⚠ Need ≥${fo.minFailoverServersForK} Failover Server(s)`}
                      </span>
                    </div>
                    <div class="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                      ${(fo.dedicatedPoolSchedule || []).map(pool => `
                        <div class="flex-1 min-w-[160px] p-1.5 rounded bg-slate-950/80 border border-slate-800/90 text-[10px] font-mono">
                          <div class="font-bold text-indigo-300 flex items-center justify-between">
                            <span>${pool.failoverName}</span>
                            <span class="text-amber-300">Absorbs ${pool.simultaneousAbsorbed}x Main Load</span>
                          </div>
                          <div class="text-[9px] text-slate-300 mt-0.5">Protects: <strong class="text-white">${pool.monitorsText}</strong></div>
                          <div class="text-[9px] text-slate-400">Sized For: <strong class="text-amber-300">${pool.failoverCams} Cameras / ${pool.failoverMbps} Mbps / ${pool.failoverBufferTb} TB</strong></div>
                        </div>
                      `).join('')}
                    </div>
                  </div>

                  <div class="xl:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div class="p-2.5 rounded-lg bg-slate-900/80 border border-indigo-500/30 flex flex-col justify-between">
                      <div class="text-[9px] font-mono uppercase text-indigo-300">Total Fleet (N + M)</div>
                      <div class="text-sm font-mono font-bold text-white">${fo.primaryServerCount} Main + ${fo.dedicatedFailoverServers} Failover = <span class="text-indigo-300">${fo.totalServersRequired} Servers</span></div>
                      <div class="text-[9px] text-slate-400">${fo.primaryServerCount} Main Servers share ${fo.dedicatedFailoverServers} Failover Server(s)</div>
                    </div>
                    <div class="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
                      <div class="text-[9px] font-mono uppercase text-slate-400">Load / Main Server (N=${fo.primaryServerCount})</div>
                      <div class="text-sm font-mono font-bold text-sky-400">${fo.normalMbpsPerServer} Mbps per Server</div>
                      <div class="text-[9px] text-slate-500">${fo.normalCamsPerServer} Cameras • ${fo.primaryUsableTbPerServer} TB Usable per Server</div>
                    </div>
                    <div class="p-2.5 rounded-lg bg-slate-900/80 border ${fo.isDedicatedSurvivorVerified !== false ? 'border-slate-800' : 'border-amber-600/70'} flex flex-col justify-between">
                      <div class="text-[9px] font-mono uppercase text-amber-300">Failover Server Specification (${fo.loadsPerFailoverServer || 1}x Load)</div>
                      <div class="text-sm font-mono font-bold text-amber-300">${fo.failoverMbpsOnSurvivor} Mbps Capacity</div>
                      <div class="text-[9px] text-slate-400">Absorbs ${fo.failoverCamsOnSurvivor} Cameras (${fo.simultaneousFailures || 1} Simultaneous Failure${(fo.simultaneousFailures || 1) === 1 ? '' : 's'})</div>
                    </div>
                    <div class="p-2.5 rounded-lg bg-slate-900/80 border border-purple-500/30 flex flex-col justify-between">
                      <div class="text-[9px] font-mono uppercase text-purple-300">Failover Storage Buffer</div>
                      <div class="text-sm font-mono font-bold text-purple-300">${fo.failoverBufferTbPerServer} TB per Failover Server</div>
                      <div class="text-[9px] text-slate-400">Total Project: ${vCalc.requiredUsableTB} TB (+${fo.failoverAddedUsableTb} TB buffer)</div>
                    </div>
                  </div>
                </div>
              ` : ''}
            </div>
          `;
        })()}

        ${showMatrix ? `
        <!-- Row 3: Detailed VMS (Genetec 5.14 / Milestone XProtect 2026) Verification & RAID Drive Options Matrix -->
        <div class="grid grid-cols-1 xl:grid-cols-12 gap-3 pt-1">
          <!-- Left Panel (5 cols): Multi-Manufacturer VMS Recorder & Server Verification -->
          <div class="xl:col-span-5 bg-slate-950/90 border ${g.isFullyCompliant !== false ? 'border-slate-800' : 'border-amber-600/70'} rounded-xl p-3 flex flex-col justify-between gap-2.5">
            <div class="space-y-2">
              <div class="flex items-center justify-between gap-2 flex-wrap">
                <div class="flex items-center gap-1.5">
                  <i data-lucide="shield-check" class="w-4 h-4 ${g.isFullyCompliant !== false ? 'text-emerald-400' : 'text-amber-400'}"></i>
                  <span class="text-[11px] font-bold uppercase tracking-wider text-white">
                    ${isMilestoneVms ? 'Milestone XProtect 2026 &amp; Husky IVO Verification' : 'Genetec 5.14 Archiver &amp; Server Verification'}
                  </span>
                </div>
                <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold ${g.isFullyCompliant !== false ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60' : 'bg-rose-950 text-rose-300 border border-rose-700/60'}">
                  ${g.isFullyCompliant !== false ? `✓ PASS: ${isMilestoneVms ? 'MILESTONE 2026' : 'GENETEC 5.14'} VERIFIED` : '⚠ CAPACITY / RULE ALERT'}
                </span>
              </div>

              <!-- Server Profile, Multi-Role Server Count & Encryption Modifiers -->
              <div class="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1">
                <div class="sm:col-span-6 bg-slate-900/90 border border-slate-800 rounded-lg px-2.5 py-1.5">
                  <div class="text-[9px] font-bold uppercase text-slate-400">
                    ${isMilestoneVms ? `Milestone Husky IVO Profile (${g.profile?.referencePage || 'Husky IVO'})` : `Genetec 5.14 Server Profile (${g.profile?.referencePage || 'Sec 1.4'})`}
                  </div>
                  ${isMilestoneVms ? `
                    <select onchange="setVideoSizerParam('milestoneProfile', this.value)" class="w-full bg-transparent text-sky-300 font-bold text-xs focus:outline-none cursor-pointer mt-0.5">
                      ${milestoneProfilesList.map(p => `<option value="${p.id}" class="bg-slate-900" ${g.profileKey === p.id ? 'selected' : ''}>${p.label} (Maximum ${p.maxCamerasPerRole} Cameras / ${p.maxBitrateMbpsPerRole} Mbps • Up to ${p.maxRawStorageTb}TB Raw)</option>`).join('')}
                    </select>
                  ` : `
                    <select onchange="setVideoSizerParam('genetecProfile', this.value)" class="w-full bg-transparent text-sky-300 font-bold text-xs focus:outline-none cursor-pointer mt-0.5">
                      ${profilesList.map(p => `<option value="${p.id}" class="bg-slate-900" ${g.profileKey === p.id ? 'selected' : ''}>${p.label} (Maximum ${p.maxCamerasPerRole} Cameras / ${p.maxBitrateMbpsPerRole} Mbps per Role • ≤${p.maxRolesPerServer || 4} Roles per Server)</option>`).join('')}
                    </select>
                  `}
                </div>
                <div class="sm:col-span-3 bg-slate-900/90 border ${g.isServerCountVerified !== false ? 'border-slate-800' : 'border-rose-600'} rounded-lg px-2.5 py-1.5 flex flex-col justify-center">
                  <div class="flex items-center justify-between">
                    <span class="text-[9px] font-bold uppercase text-slate-400">Servers (#)</span>
                    <button onclick="setVideoSizerParam('serverCount', 0)" class="text-[9px] font-mono px-1 rounded ${videoServerCount === 0 ? 'bg-purple-900/80 text-purple-200' : 'bg-slate-800 text-slate-400 hover:text-white'} cursor-pointer" title="Auto-pack Recording/Archiver roles onto servers within manufacturer limits">
                      Auto (${g.minRequiredServers || 1})
                    </button>
                  </div>
                  <div class="flex items-center gap-1 mt-0.5">
                    <input type="number" min="0" max="64" value="${videoServerCount === 0 ? g.recommendedArchiverServers : videoServerCount}" onchange="setVideoSizerParam('serverCount', Math.max(0, parseInt(this.value, 10) || 0))" class="w-full bg-slate-950 border border-slate-700/80 rounded px-1.5 py-0.5 text-xs font-mono font-bold ${g.isServerCountVerified !== false ? 'text-amber-300' : 'text-rose-400'} focus:outline-none" title="Number of physical servers" />
                    <span class="text-[9px] text-slate-400 font-mono">Servers</span>
                  </div>
                </div>
                <div class="sm:col-span-3 bg-slate-900/90 border border-slate-800 rounded-lg px-2.5 py-1.5 flex flex-col justify-center">
                  <div class="text-[9px] font-bold uppercase text-slate-400">${isMilestoneVms ? 'Database Encryption' : 'Encryption (p.10)'}</div>
                  <select onchange="setVideoSizerParam('encryptionCerts', Number(this.value))" class="w-full bg-transparent text-slate-200 font-bold text-xs focus:outline-none cursor-pointer mt-0.5">
                    <option value="0" class="bg-slate-900" ${g.encryptionCerts === 0 ? 'selected' : ''}>0 Certificates (100%)</option>
                    <option value="1" class="bg-slate-900" ${g.encryptionCerts === 1 ? 'selected' : ''}>${isMilestoneVms ? 'Media Database Encrypted (-15%)' : '1 Certificate (-30%)'}</option>
                    <option value="5" class="bg-slate-900" ${g.encryptionCerts === 5 ? 'selected' : ''}>${isMilestoneVms ? 'Signed + Encrypted (-25%)' : '5 Certificates (-41%)'}</option>
                    <option value="10" class="bg-slate-900" ${g.encryptionCerts === 10 ? 'selected' : ''}>10 Certificates (-52%)</option>
                    <option value="20" class="bg-slate-900" ${g.encryptionCerts === 20 ? 'selected' : ''}>20 Certificates (-68%)</option>
                  </select>
                </div>
              </div>

              <!-- Per-Recorder/Archiver, Multi-Role Server & Storage Tier Mapping Grid -->
              <div class="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center pt-1">
                <div class="p-2 rounded-lg bg-slate-900/70 border border-slate-800/90">
                  <div class="text-[9px] font-mono uppercase text-slate-400">${isMilestoneVms ? 'Recording Instances' : 'Archiver Roles'}</div>
                  <div class="text-sm font-mono font-bold ${g.isArchiverCountVerified !== false ? 'text-emerald-400' : 'text-rose-400'}">${g.activeArchiverRoles} <span class="text-[10px] text-slate-400">/ ${g.minRequiredArchiverRoles} Minimum</span></div>
                  <div class="text-[9px] text-slate-500">≤${g.effectiveMaxMbpsPerArchiver} Mbps per ${isMilestoneVms ? 'Instance' : 'Role'}</div>
                </div>
                <div class="p-2 rounded-lg bg-slate-900/70 border border-slate-800/90">
                  <div class="text-[9px] font-mono uppercase text-slate-400">Load per ${isMilestoneVms ? 'Instance' : 'Role'}</div>
                  <div class="text-sm font-mono font-bold text-sky-400">${g.bitratePerArchiverRoleMbps} Mbps</div>
                  <div class="text-[9px] text-slate-500">${g.camerasPerArchiverRole} Cameras • ${g.usableTbPerArchiverRole} TB</div>
                </div>
                <div class="p-2 rounded-lg bg-slate-900/70 border border-slate-800/90">
                  <div class="text-[9px] font-mono uppercase text-slate-400">${isMilestoneVms ? 'Husky Fleet' : 'Roles / Server'}</div>
                  <div class="text-sm font-mono font-bold ${g.isServerCountVerified !== false ? 'text-amber-300' : 'text-rose-400'}">${isMilestoneVms ? `${g.recommendedArchiverServers} Husky Server(s)` : `${g.rolesPerServer || 1} Role${(g.rolesPerServer || 1) === 1 ? '' : 's'} per Server`}</div>
                  <div class="text-[9px] text-slate-500">${g.recommendedArchiverServers} Server(s) (${g.bitratePerServerMbps} Mbps per Server)</div>
                </div>
                <div class="p-2 rounded-lg bg-slate-900/70 border border-slate-800/90 sm:col-span-2" title="${isMilestoneVms ? 'Milestone XProtect supports Live Database + Multi-Stage Archive tiering on RAID 5/6/10 arrays.' : 'Every Archiver role requires its own separate Windows volume(s), and each Windows volume is capped at ≤30 TB usable.'}">
                  <div class="text-[9px] font-mono uppercase text-purple-300">${isMilestoneVms ? `Live + Archive Tiering (${g.profile?.raidSupport || 'RAID 5/6/10'})` : `Windows Volumes (≤${g.maxVolumeSizeTb || 30}TB Cap • Isolated per Role)`}</div>
                  <div class="text-sm font-mono font-bold text-purple-300">${g.totalLogicalVolumes || 1} Volume${(g.totalLogicalVolumes || 1) === 1 ? '' : 's'} <span class="text-[10px] text-slate-400">(${g.volumesPerArchiverRole || 1} Volume(s) per ${isMilestoneVms ? 'Instance' : 'Role'})</span></div>
                  <div class="text-[9px] text-slate-400">${g.volumesPerServer || 1} Volume(s) per Server • ~${g.sizePerVolumeTb || g.usableTbPerArchiverRole} TB per Volume</div>
                </div>
              </div>
            </div>

            <!-- Hardware Spec & VMS Rule Alerts -->
            <div class="space-y-1.5 border-t border-slate-800/80 pt-2 text-[11px]">
              <div class="flex items-center justify-between text-slate-300 font-mono text-[10px]">
                <span>Minimum Specification: <strong class="text-white">${g.profile?.cpuSpec || ''} • ${g.profile?.ramGb || 16}GB RAM • ${g.profile?.nicSpec || '1 GbE'}</strong></span>
                <span>Daily: <strong class="text-sky-300">${vCalc.dailyStorageGb} GB/Day</strong></span>
              </div>
              ${(g.findings && g.findings.length > 0) ? g.findings.map(f => `
                <div class="px-2.5 py-1.5 rounded-lg text-[10px] font-medium flex items-start gap-1.5 ${f.severity === 'critical' ? 'bg-rose-950/70 border border-rose-700/70 text-rose-200' : f.severity === 'warning' ? 'bg-amber-950/70 border border-amber-700/70 text-amber-200' : 'bg-sky-950/70 border border-sky-700/70 text-sky-200'}">
                  <i data-lucide="${f.severity === 'critical' ? 'alert-octagon' : f.severity === 'warning' ? 'alert-triangle' : 'info'}" class="w-3.5 h-3.5 shrink-0 mt-0.5"></i>
                  <span>${f.text}</span>
                </div>
              `).join('') : `
                <div class="px-2.5 py-1 rounded-lg bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 text-[10px] flex items-center gap-1.5">
                  <i data-lucide="check-circle-2" class="w-3.5 h-3.5 shrink-0"></i>
                  <span>All ${isMilestoneVms ? 'Milestone XProtect 2026 R2 & Husky IVO throughput and storage' : 'Genetec 5.14 throughput, multi-role server limits, directory isolation, and Windows volume'} rules satisfied.</span>
                </div>
              `}
            </div>
          </div>

          <!-- Right Panel (7 cols): RAID Level Drive Size & Drive Count Options Matrix -->
          <div class="xl:col-span-7 bg-slate-950/90 border border-slate-800 rounded-xl p-3 flex flex-col justify-between gap-2">
            <div class="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div class="flex items-center gap-2">
                  <i data-lucide="database" class="w-4 h-4 text-amber-400"></i>
                  <span class="text-[11px] font-bold uppercase tracking-wider text-white">${vCalc.raidLevel} Drive Size &amp; Bay Count Options</span>
                  <span class="text-[10px] font-mono text-slate-400">(${vCalc.raidDescription || ''})</span>
                </div>
              </div>
              <span class="text-[10px] font-mono text-purple-300 bg-purple-950/60 border border-purple-700/50 px-2 py-0.5 rounded">
                Selected Plan: <strong>${dp.totalDrives || 0}x ${dp.driveSizeTb || 16}TB</strong> = <strong>${dp.rawStorageTb || 0} TB Raw</strong> (${dp.usableStorageTb || 0} TB Usable • ${dp.totalVolumes30Tb || 1} Windows Volumes)
              </span>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse text-[11px] font-mono">
                <thead>
                  <tr class="border-b border-slate-800 text-[9px] uppercase text-slate-400">
                    <th class="py-1.5 px-2">Drive Size</th>
                    <th class="py-1.5 px-2">Total Drives</th>
                    <th class="py-1.5 px-2">Data + Parity</th>
                    <th class="py-1.5 px-2">Drives per Server</th>
                    <th class="py-1.5 px-2">Total Raw TB</th>
                    <th class="py-1.5 px-2">Usable TB (Efficiency %)</th>
                    <th class="py-1.5 px-2">Windows Volumes (≤30TB)</th>
                    <th class="py-1.5 px-2">Chassis Bay Fit</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-800/60">
                  ${(vCalc.driveOptionsMatrix || []).map(opt => {
                    const isSelected = opt.driveSizeTb === vCalc.preferredDriveSizeTb;
                    return `
                      <tr onclick="setVideoSizerParam('preferredDriveTb', ${opt.driveSizeTb})" class="cursor-pointer transition-colors ${isSelected ? 'bg-purple-950/50 text-white font-bold' : 'hover:bg-slate-900/80 text-slate-300'}">
                        <td class="py-1.5 px-2 flex items-center gap-1.5">
                          <span class="w-2 h-2 rounded-full ${isSelected ? 'bg-purple-400 ring-2 ring-purple-400/40' : 'bg-slate-700'}"></span>
                          <span class="${isSelected ? 'text-purple-300 font-bold' : 'text-white'}">${opt.driveSizeTb} TB HDD</span>
                        </td>
                        <td class="py-1.5 px-2 text-amber-300 font-bold">${opt.totalDrives} Drives</td>
                        <td class="py-1.5 px-2 text-slate-400">${opt.totalDataDrives}D + ${opt.totalParityDrives}P</td>
                        <td class="py-1.5 px-2 text-sky-300">${opt.drivesPerServer} per Server</td>
                        <td class="py-1.5 px-2 text-white">${opt.rawStorageTb} TB</td>
                        <td class="py-1.5 px-2 text-emerald-400">${opt.usableStorageTb} TB <span class="text-slate-500">(${opt.efficiencyPct}%)</span></td>
                        <td class="py-1.5 px-2 text-purple-300" title="${opt.windowsVolumesPerRole} Windows Volume(s) per role × ${g.activeArchiverRoles} role(s) = ${opt.totalVolumes30Tb} separate Volumes (~${opt.sizePerVolumeTb} TB each)">
                          ${opt.totalVolumes30Tb} Volume${opt.totalVolumes30Tb === 1 ? '' : 's'} <span class="text-slate-400 text-[10px]">(${opt.windowsVolumesPerRole}/Role @ ${opt.sizePerVolumeTb}TB)</span>
                        </td>
                        <td class="py-1.5 px-2 text-[10px] text-slate-300">${opt.chassisFormFactor}</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        ` : ''}

        <!-- Turnkey Appliance & VMS Licensing Integration Bar (Genetec Streamvault vs Milestone Husky IVO) -->
        ${(() => {
          const showLicInline = Boolean(window.videoShowLicPanel);
          if (isMilestoneVms && typeof MilestoneLicensingSizer !== "undefined") {
            const mLicRes = MilestoneLicensingSizer.calculate(projectBOM);
            const hPlan = mLicRes.huskyPlan || {};
            const prim = hPlan.primaryAppliance;
            return `
              <div class="pt-2.5 border-t border-slate-800/90 flex flex-col gap-2.5">
                <div class="bg-sky-950/30 border border-sky-500/30 rounded-xl p-3 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                  <div class="flex flex-wrap items-center gap-3">
                    <div class="flex items-center gap-2">
                      <span class="px-2 py-0.5 rounded bg-sky-500/20 border border-sky-500/40 text-sky-300 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                        <i data-lucide="server" class="w-3 h-3"></i>
                        Husky IVO &amp; Milestone XProtect
                      </span>
                      <span class="text-xs font-bold text-white">
                        ${prim ? `${hPlan.primaryQty}x ${prim.model.replace('Milestone ', '')}` : 'Add Cameras to Size Husky IVO Appliance'}
                      </span>
                    </div>
                    ${prim ? `
                      <span class="text-[11px] text-slate-300 font-mono bg-slate-950/80 border border-slate-800 px-2 py-0.5 rounded-lg">
                        ${(hPlan.primaryQty * (prim.usableStorageTb || 0)).toFixed(1)} TB Usable (${prim.raidSupport}) &bull; ${hPlan.primaryQty * (prim.maxThroughputMbps || 0)} Mbps &bull; $${(hPlan.primaryQty * (prim.msrp || 0)).toLocaleString()} Hardware
                      </span>
                    ` : ''}
                    ${hPlan.analyticsAppliance ? `
                      <span class="text-[11px] text-emerald-300 font-mono bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded-lg">
                        + ${hPlan.analyticsQty}x ${hPlan.analyticsAppliance.sku} BriefCam Analytics
                      </span>
                    ` : ''}
                    <span class="text-[11px] text-sky-200 font-mono bg-sky-950/60 border border-sky-500/30 px-2.5 py-0.5 rounded-lg">
                      Edition: <strong>${mLicRes.editionInfo?.label || 'XProtect Corporate'}</strong> &bull; ${mLicRes.totalDeviceLicenses} Device Licenses + ${mLicRes.careYears}Y Care Plus = <strong>$${mLicRes.totalSoftwareMsrp.toLocaleString()}</strong> Software
                    </span>
                  </div>

                  <div class="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onclick="autoFitHuskyToBom()"
                      class="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                      title="Auto-fit the recommended Milestone Husky IVO Appliance(s) (150D / 350T / 350R / 700R / 1000R / 1800R) to the BOM"
                    >
                      <i data-lucide="server" class="w-3.5 h-3.5"></i>
                      <span>+ Auto-Fit Husky IVO</span>
                    </button>
                    <button
                      type="button"
                      onclick="addMilestoneLicensesToBom()"
                      class="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                      title="Add the calculated Milestone XProtect Base, Device Licenses, Care Plus, and Add-On licenses to the BOM"
                    >
                      <i data-lucide="key" class="w-3.5 h-3.5"></i>
                      <span>+ Add Milestone Licenses ($${mLicRes.totalSoftwareMsrp.toLocaleString()})</span>
                    </button>
                    <button
                      type="button"
                      onclick="window.videoShowLicPanel = !window.videoShowLicPanel; buildCalculatorStrip();"
                      class="px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${showLicInline ? 'bg-sky-500/20 border-sky-500/50 text-sky-200' : 'bg-slate-950 border-slate-700 text-slate-300 hover:text-white'}"
                    >
                      <i data-lucide="sliders" class="w-3.5 h-3.5"></i>
                      <span>${showLicInline ? 'Hide Milestone Builder' : 'Configure Milestone XProtect'}</span>
                    </button>
                  </div>
                </div>
                ${showLicInline ? renderMilestoneLicensingBuilderHtml(mLicRes, true) : ''}
              </div>
            `;
          }

          if (typeof GenetecLicensingSizer === "undefined") return "";
          const licRes = GenetecLicensingSizer.calculate(projectBOM);
          const svPlan = licRes.streamvaultPlan || {};
          const prim = svPlan.primaryAppliance;
          const tierLabels = {
            aio: "Streamvault AIO (≤32 Cameras)",
            standard: "Omnicast Standard (≤50 Cameras)",
            pro: "Omnicast Pro (≤100 Cameras)",
            enterprise: "Omnicast Enterprise"
          };
          return `
            <div class="pt-2.5 border-t border-slate-800/90 flex flex-col gap-2.5">
              <div class="bg-indigo-950/30 border border-indigo-500/30 rounded-xl p-3 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                <div class="flex flex-wrap items-center gap-3">
                  <div class="flex items-center gap-2">
                    <span class="px-2 py-0.5 rounded bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                      <i data-lucide="shield-check" class="w-3 h-3"></i>
                      Streamvault &amp; Genetec Licensing
                    </span>
                    <span class="text-xs font-bold text-white">
                      ${prim ? `${svPlan.primaryQty}x ${prim.model.replace('Streamvault ', '')}` : 'Add Cameras to Size Streamvault Appliance'}
                    </span>
                  </div>
                  ${prim ? `
                    <span class="text-[11px] text-slate-300 font-mono bg-slate-950/80 border border-slate-800 px-2 py-0.5 rounded-lg">
                      ${(svPlan.primaryQty * (prim.usableStorageTb || 0)).toFixed(1)} TB Usable (${prim.raidSupport}) &bull; ${svPlan.primaryQty * (prim.maxThroughputMbps || 0)} Mbps &bull; $${(svPlan.primaryQty * (prim.msrp || 0)).toLocaleString()} Hardware
                    </span>
                  ` : ''}
                  ${svPlan.directoryAppliance ? `
                    <span class="text-[11px] text-amber-300 font-mono bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 rounded-lg" title="Dedicated Directory / Failover Host (>300 cameras or Failover Directory enabled)">
                      + ${svPlan.directoryQty}x ${svPlan.directoryAppliance.sku} Directory Host
                    </span>
                  ` : ''}
                  ${svPlan.analyticsAppliance ? `
                    <span class="text-[11px] text-emerald-300 font-mono bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded-lg">
                      + ${svPlan.analyticsQty}x ${svPlan.analyticsAppliance.applianceSeries} Analytics
                    </span>
                  ` : ''}
                  <span class="text-[11px] text-indigo-200 font-mono bg-indigo-950/60 border border-indigo-500/30 px-2.5 py-0.5 rounded-lg">
                    Tier: <strong>${tierLabels[licRes.effectiveTier] || 'Enterprise'}</strong> &bull; ${licRes.cameraUnits} Camera Licenses + ${licRes.advantageYears}Y Advantage = <strong>$${licRes.totalSoftwareMsrp.toLocaleString()}</strong> Software
                  </span>
                </div>

                <div class="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onclick="autoFitStreamvaultToBom()"
                    class="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    title="Auto-fit the recommended Genetec Streamvault Appliance(s) (SV-300E / SV-350E / SV-1041E / SV-2041E / SV-4041EX) to the BOM"
                  >
                    <i data-lucide="server" class="w-3.5 h-3.5"></i>
                    <span>+ Auto-Fit Streamvault</span>
                  </button>
                  <button
                    type="button"
                    onclick="addGenetecLicensesToBom()"
                    class="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    title="Add the calculated Genetec Security Center Base, Camera Connections, Failover, and Advantage SMA licenses to the BOM"
                  >
                    <i data-lucide="key" class="w-3.5 h-3.5"></i>
                    <span>+ Add Genetec Licenses ($${licRes.totalSoftwareMsrp.toLocaleString()})</span>
                  </button>
                  <button
                    type="button"
                    onclick="window.videoShowLicPanel = !window.videoShowLicPanel; buildCalculatorStrip();"
                    class="px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${showLicInline ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-200' : 'bg-slate-950 border-slate-700 text-slate-300 hover:text-white'}"
                  >
                    <i data-lucide="sliders" class="w-3.5 h-3.5"></i>
                    <span>${showLicInline ? 'Hide Licensing Builder' : 'Configure Licensing & Add-Ons'}</span>
                  </button>
                </div>
              </div>
              ${showLicInline ? renderGenetecLicensingBuilderHtml(licRes, true) : ''}
            </div>
          `;
        })()}
      </div>
    `;
}
window.renderStorageCalculatorStudioHtml = renderStorageCalculatorStudioHtml;

function setVideoSizerParam(key, val, skipConfirm = false) {
  const defs = (typeof StorageService !== "undefined" && typeof StorageService.getProjectDefaults === "function") ? StorageService.getProjectDefaults() : null;
  if (!skipConfirm && defs && typeof confirmProjectDefaultChange === "function" && !(typeof isProjectWizardOpen === "function" && isProjectWizardOpen())) {
    if (key === "retentionDays") {
      const defRet = parseInt(defs.vms?.retentionDays, 10) || 30;
      const newRet = parseInt(val, 10) || 30;
      if (newRet !== defRet && newRet !== videoRetentionDays) {
        confirmProjectDefaultChange({
          title: "Change Video Retention Target?",
          settingLabel: "VMS Default Retention Target",
          defaultLabel: `${defRet} Days`,
          newLabel: `${newRet} Days`,
          message: `Your Project Default Retention Target is set to ${defRet} Days. Are you sure you want to change it to ${newRet} Days?`,
          allowLocalOverride: true,
          localOverrideLabel: `Override in Sizer (${newRet}D)`,
          updateDefaultLabel: `Update Project Default to ${newRet}D`,
          onLocalOverride: () => setVideoSizerParam(key, newRet, true),
          onUpdateDefault: () => {
            if (typeof updateSingleProjectDefault === "function") {
              updateSingleProjectDefault(d => { if (!d.vms) d.vms = {}; d.vms.retentionDays = newRet; });
            }
            setVideoSizerParam(key, newRet, true);
          },
          onCancel: () => { if (typeof buildCalculatorStrip === "function") buildCalculatorStrip(); }
        });
        return;
      }
    } else if (key === "vmsVendor") {
      const cleanVal = ["genetec", "milestone", "generic"].includes(val) ? val : "genetec";
      const defVendor = typeof mapProjectPlatformToVmsVendor === "function" ? mapProjectPlatformToVmsVendor(defs.vms?.platform) : "genetec";
      if (cleanVal !== defVendor && cleanVal !== videoVmsVendor) {
        const defLbl = defs.vms?.platform || (typeof mapVmsVendorToPlatformLabel === "function" ? mapVmsVendorToPlatformLabel(defVendor) : defVendor);
        const newLbl = typeof mapVmsVendorToPlatformLabel === "function" ? mapVmsVendorToPlatformLabel(cleanVal) : cleanVal;
        confirmProjectDefaultChange({
          title: "Change VMS Platform & Appliance Ecosystem?",
          settingLabel: "VMS Platform & Recording Server Profile",
          defaultLabel: defLbl,
          newLabel: newLbl,
          message: `Your Project Default VMS Platform is set to "${defLbl}". Are you sure you want to switch to "${newLbl}"?`,
          allowLocalOverride: true,
          localOverrideLabel: `Compare ${newLbl} Here Only`,
          updateDefaultLabel: `Update Project Default to ${newLbl}`,
          onLocalOverride: () => setVideoSizerParam(key, cleanVal, true),
          onUpdateDefault: () => {
            if (typeof updateSingleProjectDefault === "function") {
              updateSingleProjectDefault(d => { if (!d.vms) d.vms = {}; d.vms.platform = newLbl; }, true);
            } else {
              setVideoSizerParam(key, cleanVal, true);
            }
          },
          onCancel: () => { if (typeof buildCalculatorStrip === "function") buildCalculatorStrip(); }
        });
        return;
      }
    } else if (key === "failoverStructure") {
      const normVal = ["none", "ring", "dedicated"].includes(val) ? val : "none";
      const defFail = ["none", "ring", "dedicated"].includes(defs.vms?.failoverMode) ? defs.vms.failoverMode : "none";
      const failLbl = (m) => m === "dedicated" ? "Dedicated Hot-Standby (N+1)" : (m === "ring" ? "Distributed Peer / Ring Failover" : "None (Standalone Servers)");
      if (normVal !== defFail && normVal !== videoFailoverStructure) {
        confirmProjectDefaultChange({
          title: "Change Recording Server Failover Architecture?",
          settingLabel: "VMS Recording Failover Mode",
          defaultLabel: failLbl(defFail),
          newLabel: failLbl(normVal),
          message: `Your Project Default Recording Failover Architecture is set to "${failLbl(defFail)}". Are you sure you want to change it to "${failLbl(normVal)}"?`,
          allowLocalOverride: true,
          localOverrideLabel: "Override in Storage Sizer Only",
          updateDefaultLabel: `Update Project Default`,
          onLocalOverride: () => setVideoSizerParam(key, normVal, true),
          onUpdateDefault: () => {
            if (typeof updateSingleProjectDefault === "function") {
              updateSingleProjectDefault(d => { if (!d.vms) d.vms = {}; d.vms.failoverMode = normVal; });
            }
            setVideoSizerParam(key, normVal, true);
          },
          onCancel: () => { if (typeof buildCalculatorStrip === "function") buildCalculatorStrip(); }
        });
        return;
      }
    }
  }
  if (key === "retentionDays") {
    videoRetentionDays = val; window.videoRetentionDays = val;
    if (typeof VideoStorageSizer !== "undefined") VideoStorageSizer.state.retentionDays = val;
  } else if (key === "vmsVendor") {
    videoVmsVendor = ["genetec", "milestone", "generic"].includes(val) ? val : "genetec";
    window.videoVmsVendor = videoVmsVendor;
    if (typeof VideoStorageSizer !== "undefined") VideoStorageSizer.state.vmsVendor = videoVmsVendor;
    if (videoVmsVendor === "milestone" || videoVmsVendor === "genetec") {
      activeVmsLicensingVendor = videoVmsVendor;
      window.activeVmsLicensingVendor = videoVmsVendor;
    }
  } else if (key === "milestoneProfile") {
    videoMilestoneProfile = val; window.videoMilestoneProfile = val;
    if (typeof VideoStorageSizer !== "undefined") VideoStorageSizer.state.milestoneProfile = val;
  } else if (key === "codec") {
    videoCodec = val; window.videoCodec = val;
    if (typeof VideoStorageSizer !== "undefined") VideoStorageSizer.state.codec = val;
  } else if (key === "fps") {
    videoFps = val; window.videoFps = val;
    if (typeof VideoStorageSizer !== "undefined") VideoStorageSizer.state.fps = val;
  } else if (key === "motionDuty") {
    videoMotionDuty = val; window.videoMotionDuty = val;
    if (typeof VideoStorageSizer !== "undefined") {
      VideoStorageSizer.state.recordingMode = val >= 1 ? "continuous" : "motion";
      VideoStorageSizer.state.motionDutyPct = Math.round(val * 100);
    }
  } else if (key === "raidType") {
    videoRaidType = val; window.videoRaidType = val;
    if (typeof VideoStorageSizer !== "undefined") VideoStorageSizer.state.raidLevel = val;
  } else if (key === "sourceMode") {
    videoSourceMode = val; window.videoSourceMode = val;
    if (typeof VideoStorageSizer !== "undefined") VideoStorageSizer.state.sourceMode = val;
  } else if (key === "manualCameraCount") {
    videoManualCamCount = val; window.videoManualCamCount = val;
    videoSourceMode = "manual"; window.videoSourceMode = "manual";
    if (typeof VideoStorageSizer !== "undefined") {
      VideoStorageSizer.state.manualCameraCount = val;
      VideoStorageSizer.state.sourceMode = "manual";
    }
  } else if (key === "resolutionMp") {
    videoResolutionMp = val; window.videoResolutionMp = val;
    if (typeof VideoStorageSizer !== "undefined") {
      VideoStorageSizer.state.resolutionMp = val;
      VideoStorageSizer.state.useManualResolutionOnBom = true;
    }
  } else if (key === "sceneActivity") {
    videoSceneActivity = val; window.videoSceneActivity = val;
    if (typeof VideoStorageSizer !== "undefined") VideoStorageSizer.state.sceneActivity = val;
  } else if (key === "preferredDriveTb") {
    videoPreferredDriveTb = val; window.videoPreferredDriveTb = val;
    if (typeof VideoStorageSizer !== "undefined") VideoStorageSizer.state.preferredDriveSizeTb = val;
  } else if (key === "genetecProfile") {
    videoGenetecProfile = val; window.videoGenetecProfile = val;
    if (typeof VideoStorageSizer !== "undefined") VideoStorageSizer.state.genetecProfile = val;
  } else if (key === "archiverRoles") {
    videoArchiverRoles = val; window.videoArchiverRoles = val;
    if (typeof VideoStorageSizer !== "undefined") VideoStorageSizer.state.archiverRolesCount = val;
  } else if (key === "serverCount") {
    videoServerCount = val; window.videoServerCount = val;
    if (typeof VideoStorageSizer !== "undefined") VideoStorageSizer.state.serverCountOverride = val;
  } else if (key === "encryptionCerts") {
    videoEncryptionCerts = val; window.videoEncryptionCerts = val;
    if (typeof VideoStorageSizer !== "undefined") VideoStorageSizer.state.encryptionCerts = val;
  } else if (key === "softwareMotion") {
    videoSoftwareMotion = Boolean(val); window.videoSoftwareMotion = Boolean(val);
    if (typeof VideoStorageSizer !== "undefined") VideoStorageSizer.state.softwareMotionDetection = Boolean(val);
  } else if (key === "lowFpsUntilMotion") {
    videoLowFpsUntilMotion = Boolean(val); window.videoLowFpsUntilMotion = Boolean(val);
    if (typeof VideoStorageSizer !== "undefined") {
      VideoStorageSizer.state.lowFpsUntilMotion = Boolean(val);
      if (Boolean(val) && Array.isArray(VideoStorageSizer.state.cameraGroups)) {
        VideoStorageSizer.state.cameraGroups.forEach(grp => {
          if ((Number(grp.motionDutyPct) || 100) >= 100) {
            grp.motionDutyPct = 50;
          }
          grp.lowFpsUntilMotion = true;
        });
      } else if (!Boolean(val) && Array.isArray(VideoStorageSizer.state.cameraGroups)) {
        VideoStorageSizer.state.cameraGroups.forEach(grp => {
          grp.lowFpsUntilMotion = false;
        });
      }
    }
  } else if (key === "idleFps") {
    const cleanIdleFps = Math.max(1, Math.min(15, Number(val) || 2));
    videoIdleFps = cleanIdleFps; window.videoIdleFps = cleanIdleFps;
    if (typeof VideoStorageSizer !== "undefined") {
      VideoStorageSizer.state.idleFps = cleanIdleFps;
      if (Array.isArray(VideoStorageSizer.state.cameraGroups)) {
        VideoStorageSizer.state.cameraGroups.forEach(grp => {
          grp.idleFps = cleanIdleFps;
        });
      }
    }
  } else if (key === "failoverStructure") {
    const normStruct = ["none", "ring", "dedicated"].includes(val) ? val : "none";
    videoFailoverStructure = normStruct; window.videoFailoverStructure = normStruct;
    if (typeof VideoStorageSizer !== "undefined") VideoStorageSizer.state.failoverStructure = normStruct;
    if (typeof window !== "undefined") {
      window.genetecLicensingConfig = window.genetecLicensingConfig || {};
      if (normStruct !== "none") {
        window.genetecLicensingConfig.enableVideoFailover = true;
        if (!window.genetecLicensingConfig.failoverMode || window.genetecLicensingConfig.failoverMode === "none") {
          window.genetecLicensingConfig.failoverMode = "all";
        }
      }
    }
  } else if (key === "ringNodeCount") {
    const cleanRing = Math.max(0, parseInt(val, 10) || 0);
    videoRingNodeCount = cleanRing; window.videoRingNodeCount = cleanRing;
    if (typeof VideoStorageSizer !== "undefined") VideoStorageSizer.state.ringNodeCount = cleanRing;
  } else if (key === "dedicatedPrimaryCount") {
    const cleanPrim = Math.max(0, parseInt(val, 10) || 0);
    videoDedicatedPrimaryCount = cleanPrim; window.videoDedicatedPrimaryCount = cleanPrim;
    if (typeof VideoStorageSizer !== "undefined") VideoStorageSizer.state.dedicatedPrimaryCount = cleanPrim;
  } else if (key === "dedicatedFailoverCount") {
    const cleanDed = Math.max(1, parseInt(val, 10) || 1);
    videoDedicatedFailoverCount = cleanDed; window.videoDedicatedFailoverCount = cleanDed;
    if (typeof VideoStorageSizer !== "undefined") VideoStorageSizer.state.dedicatedFailoverCount = cleanDed;
  } else if (key === "maxSimultaneousFailures") {
    const cleanSim = Math.max(1, parseInt(val, 10) || 1);
    videoMaxSimultaneousFailures = cleanSim; window.videoMaxSimultaneousFailures = cleanSim;
    if (typeof VideoStorageSizer !== "undefined") VideoStorageSizer.state.maxSimultaneousFailures = cleanSim;
  } else if (key === "failoverBufferMode") {
    const numMode = Number(val);
    if (numMode < 0) {
      videoFailoverIncludeStorageBuffer = false; window.videoFailoverIncludeStorageBuffer = false;
      videoFailoverRetentionDays = 0; window.videoFailoverRetentionDays = 0;
      if (typeof VideoStorageSizer !== "undefined") {
        VideoStorageSizer.state.failoverIncludeStorageBuffer = false;
        VideoStorageSizer.state.failoverRetentionDays = 0;
      }
    } else {
      videoFailoverIncludeStorageBuffer = true; window.videoFailoverIncludeStorageBuffer = true;
      videoFailoverRetentionDays = Math.max(0, numMode || 0); window.videoFailoverRetentionDays = Math.max(0, numMode || 0);
      if (typeof VideoStorageSizer !== "undefined") {
        VideoStorageSizer.state.failoverIncludeStorageBuffer = true;
        VideoStorageSizer.state.failoverRetentionDays = Math.max(0, numMode || 0);
      }
    }
  } else if (key === "toggleDetails") {
    videoShowDetailsPanel = Boolean(val); window.videoShowDetailsPanel = Boolean(val);
  }
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
  if (typeof updateProjectHealthUI === "function") updateProjectHealthUI();
}
window.setVideoSizerParam = setVideoSizerParam;

function ensureEditableCameraGroups() {
  if (typeof VideoStorageSizer === "undefined") return [];
  if (!VideoStorageSizer.state.hasCustomGroups) {
    const bomGroups = VideoStorageSizer.buildCameraGroupsFromBom(projectBOM);
    if (bomGroups.length > 0 && (videoSourceMode === "auto" || videoSourceMode === "bom")) {
      VideoStorageSizer.state.cameraGroups = bomGroups;
    } else if (!Array.isArray(VideoStorageSizer.state.cameraGroups) || VideoStorageSizer.state.cameraGroups.length === 0) {
      VideoStorageSizer.state.cameraGroups = [{
        id: "grp_1",
        name: "Camera Group 1",
        qty: videoManualCamCount || 32,
        heads: 1,
        resolutionMp: videoResolutionMp || 4,
        fps: videoFps || 15,
        codec: videoCodec || "H.265",
        sceneActivity: videoSceneActivity || "medium",
        motionDutyPct: Math.round((videoMotionDuty || 0.5) * 100),
        retentionDays: videoRetentionDays || 30
      }];
    }
    VideoStorageSizer.state.hasCustomGroups = true;
    videoSourceMode = "manual";
    window.videoSourceMode = "manual";
    VideoStorageSizer.state.sourceMode = "manual";
  }
  return VideoStorageSizer.state.cameraGroups;
}

function addVideoCameraGroup() {
  const groups = ensureEditableCameraGroups();
  const last = groups[groups.length - 1] || {};
  const nextIdx = groups.length + 1;
  groups.push({
    id: `grp_${Date.now()}_${nextIdx}`,
    name: `Camera Group ${nextIdx}`,
    qty: 8,
    heads: last.heads || 1,
    resolutionMp: last.resolutionMp || 4,
    fps: last.fps || 15,
    idleFps: last.idleFps || videoIdleFps || 2,
    lowFpsUntilMotion: Boolean(last.lowFpsUntilMotion),
    codec: last.codec || "H.265",
    sceneActivity: last.sceneActivity || "medium",
    motionDutyPct: last.motionDutyPct ?? 50,
    retentionDays: last.retentionDays || 30
  });
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
  if (typeof updateProjectHealthUI === "function") updateProjectHealthUI();
}
window.addVideoCameraGroup = addVideoCameraGroup;

function duplicateVideoCameraGroup(index) {
  const groups = ensureEditableCameraGroups();
  const src = groups[index];
  if (!src) return;
  groups.splice(index + 1, 0, {
    ...src,
    id: `grp_${Date.now()}_${index + 2}`,
    name: `${src.name || 'Group'} (Copy)`
  });
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
  if (typeof updateProjectHealthUI === "function") updateProjectHealthUI();
}
window.duplicateVideoCameraGroup = duplicateVideoCameraGroup;

function removeVideoCameraGroup(index) {
  const groups = ensureEditableCameraGroups();
  if (groups.length <= 1) return;
  groups.splice(index, 1);
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
  if (typeof updateProjectHealthUI === "function") updateProjectHealthUI();
}
window.removeVideoCameraGroup = removeVideoCameraGroup;

function updateVideoCameraGroup(index, field, val) {
  const groups = ensureEditableCameraGroups();
  if (!groups[index]) return;
  groups[index][field] = val;
  if (field === "lowFpsUntilMotion" && Boolean(val) && (Number(groups[index].motionDutyPct) || 100) >= 100) {
    groups[index].motionDutyPct = 50;
  }
  // If the column's "All Same" checkbox is active, propagate this setting to all camera groups
  if (videoSyncAllColumns && videoSyncAllColumns[field]) {
    groups.forEach(g => {
      g[field] = val;
      if (field === "lowFpsUntilMotion" && Boolean(val) && (Number(g.motionDutyPct) || 100) >= 100) {
        g.motionDutyPct = 50;
      }
    });
  }
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
  if (typeof updateProjectHealthUI === "function") updateProjectHealthUI();
}
window.updateVideoCameraGroup = updateVideoCameraGroup;

function toggleVideoColumnSync(field, checked) {
  const isChecked = Boolean(checked);
  if (videoSyncAllColumns && field in videoSyncAllColumns) {
    videoSyncAllColumns[field] = isChecked;
  }
  if (isChecked) {
    const groups = ensureEditableCameraGroups();
    if (groups.length > 0) {
      const masterVal = groups[0][field];
      groups.forEach(g => {
        if (masterVal !== undefined) g[field] = masterVal;
      });
    }
  }
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
  if (typeof updateProjectHealthUI === "function") updateProjectHealthUI();
}
window.toggleVideoColumnSync = toggleVideoColumnSync;

function toggleAllCameraGroupsLowFps(checked) {
  const isChecked = Boolean(checked);
  videoLowFpsUntilMotion = isChecked;
  window.videoLowFpsUntilMotion = isChecked;
  if (videoSyncAllColumns) videoSyncAllColumns.lowFpsUntilMotion = isChecked;
  if (typeof VideoStorageSizer !== "undefined") {
    VideoStorageSizer.state.lowFpsUntilMotion = isChecked;
  }
  const groups = ensureEditableCameraGroups();
  groups.forEach(g => {
    g.lowFpsUntilMotion = isChecked;
    if (g.idleFps === undefined) g.idleFps = videoIdleFps || 2;
    if (isChecked && (Number(g.motionDutyPct) || 100) >= 100) {
      g.motionDutyPct = 50;
    }
  });
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
  if (typeof updateProjectHealthUI === "function") updateProjectHealthUI();
}
window.toggleAllCameraGroupsLowFps = toggleAllCameraGroupsLowFps;

function setAllCameraGroupsIdleFps(idleFpsVal) {
  const cleanIdle = Math.max(1, Math.min(15, Number(idleFpsVal) || 2));
  videoIdleFps = cleanIdle;
  window.videoIdleFps = cleanIdle;
  if (typeof VideoStorageSizer !== "undefined") {
    VideoStorageSizer.state.idleFps = cleanIdle;
  }
  const groups = ensureEditableCameraGroups();
  groups.forEach(g => {
    g.idleFps = cleanIdle;
  });
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
  if (typeof updateProjectHealthUI === "function") updateProjectHealthUI();
}
window.setAllCameraGroupsIdleFps = setAllCameraGroupsIdleFps;

function importBomCamerasToGroups() {
  if (typeof VideoStorageSizer === "undefined") return;
  const bomGroups = VideoStorageSizer.buildCameraGroupsFromBom(projectBOM);
  if (bomGroups.length > 0) {
    VideoStorageSizer.state.cameraGroups = bomGroups;
    VideoStorageSizer.state.hasCustomGroups = true;
    videoSourceMode = "manual";
    window.videoSourceMode = "manual";
    VideoStorageSizer.state.sourceMode = "manual";
    if (typeof showToast === "function") {
      showToast(`Imported ${bomGroups.length} camera group(s) from BOM into the Storage Calculator.`, "info");
    }
    if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
    if (typeof updateProjectHealthUI === "function") updateProjectHealthUI();
  }
}
window.importBomCamerasToGroups = importBomCamerasToGroups;

function autoFitNvrToBom() {
  if (typeof VideoStorageSizer === "undefined") return;
  const vCalc = VideoStorageSizer.calculateFromBOM(projectBOM, {
    sourceMode: videoSourceMode,
    manualCameraCount: videoManualCamCount,
    resolutionMp: videoResolutionMp,
    retentionDays: videoRetentionDays,
    codec: videoCodec,
    fps: videoFps,
    lowFpsUntilMotion: videoLowFpsUntilMotion,
    idleFps: videoIdleFps,
    motionDutyCycle: videoMotionDuty,
    sceneActivity: videoSceneActivity,
    raidType: videoRaidType,
    preferredDriveSizeTb: videoPreferredDriveTb,
    vmsVendor: videoVmsVendor,
    genetecProfile: videoGenetecProfile,
    milestoneProfile: videoMilestoneProfile,
    archiverRolesCount: videoArchiverRoles,
    serverCountOverride: videoServerCount,
    encryptionCerts: videoEncryptionCerts,
    softwareMotionDetection: videoSoftwareMotion,
    failoverStructure: videoFailoverStructure,
    ringNodeCount: videoRingNodeCount,
    dedicatedPrimaryCount: videoDedicatedPrimaryCount,
    dedicatedFailoverCount: videoDedicatedFailoverCount,
    maxSimultaneousFailures: videoMaxSimultaneousFailures,
    failoverRetentionDays: videoFailoverRetentionDays,
    failoverIncludeStorageBuffer: videoFailoverIncludeStorageBuffer
  });

  const fo = vCalc.failover || { structure: "none" };
  const targetTB = Math.max(16, vCalc.requiredUsableTB || 16);
  const targetMbps = Math.max(50, vCalc.peakIngressMbps || 50);
  const isMilestone = vCalc.vmsVendor === "milestone";
  const vmsVerify = isMilestone ? (vCalc.milestone || vCalc.genetec || {}) : (vCalc.genetec || {});
  const minArchiverServers = vmsVerify.recommendedArchiverServers || 1;

  const allServers = (typeof SERVERS_DATABASE !== "undefined")
    ? SERVERS_DATABASE.filter(s => s.serverType !== "access_security_host" && s.serverType !== "analytics_server" && s.serverType !== "cloud_gateway")
    : [];
  if (allServers.length === 0) return;

  // Prefer Milestone Husky IVO when Milestone is selected, or non-Milestone when Genetec/Generic is selected
  const vendorFiltered = isMilestone
    ? allServers.filter(s => String(s.vendor || "").toLowerCase().includes("milestone"))
    : allServers.filter(s => !String(s.vendor || "").toLowerCase().includes("milestone"));
  const servers = vendorFiltered.length > 0 ? vendorFiltered : allServers;

  // Sort NVRs ascending by usableStorageTb
  const getCap = s => Number(s.usableStorageTb ?? s.usableStorageTB ?? s.rawStorageTb ?? s.rawStorageTB ?? 0);
  const getBw = s => Number(s.maxIngestBandwidthMbps ?? s.maxThroughputMbps ?? 450);
  const sorted = [...servers].sort((a, b) => getCap(a) - getCap(b));

  if (fo.structure === "ring" && (fo.ringNodes || 0) >= 2 && typeof addToBOM === "function") {
    const ringNodes = fo.ringNodes;
    const perNodeTb = Math.max(8, fo.totalUsableTbPerRingServer || Math.ceil(targetTB / ringNodes));
    const survivorMbps = Math.max(50, fo.failoverMbpsOnSurvivor || targetMbps);
    const chosen = sorted.find(s => getCap(s) >= perNodeTb && getBw(s) >= survivorMbps) || sorted[sorted.length - 1];
    if (chosen) {
      addToBOM(chosen.id || chosen.sku, ringNodes);
      if (typeof showToast === "function") {
        showToast(`Auto-Fitted Ring Failover (${fo.ringChainText}): ${ringNodes}x ${chosen.model} (${getCap(chosen)} TB & ${getBw(chosen)} Mbps/node) for 2x survivor load.`, "success");
      }
    }
  } else if (fo.structure === "dedicated" && (fo.dedicatedFailoverServers || 0) >= 1 && typeof addToBOM === "function") {
    const totalCount = Math.max(2, fo.totalServersRequired || 2);
    const perNodeTb = Math.max(8, fo.primaryUsableTbPerServer || 16, fo.failoverBufferTbPerServer || 0);
    const perNodeMbps = Math.max(50, fo.normalMbpsPerServer || targetMbps, fo.failoverMbpsOnSurvivor || 0);
    const chosen = sorted.find(s => getCap(s) >= perNodeTb && getBw(s) >= perNodeMbps) || sorted[sorted.length - 1];
    if (chosen) {
      addToBOM(chosen.id || chosen.sku, totalCount);
      if (typeof showToast === "function") {
        showToast(`Auto-Fitted Dedicated Failover (${fo.primaryServerCount} Main + ${fo.dedicatedFailoverServers} Shared Standby = ${totalCount} Servers): ${totalCount}x ${chosen.model}.`, "success");
      }
    }
  } else {
    // If 1 server is sufficient for Genetec roles, try to find a single appliance that fits both TB and Mbps
    const singleFit = minArchiverServers === 1
      ? sorted.find(s => getCap(s) >= targetTB && getBw(s) >= targetMbps)
      : null;

    if (singleFit && typeof addToBOM === "function") {
      addToBOM(singleFit.id || singleFit.sku, 1);
      if (typeof showToast === "function") {
        showToast(`Auto-Fitted 1x ${singleFit.model} (${getCap(singleFit)} TB Usable, ${getBw(singleFit)} Mbps max) for ${vCalc.requiredUsableTB} TB / ${vCalc.peakIngressMbps} Mbps.`, "success");
      }
    } else if (sorted.length > 0 && typeof addToBOM === "function") {
      // Choose the server tier whose per-server usable TB best matches targetTB / minArchiverServers
      const perServerTargetTb = targetTB / minArchiverServers;
      const chosen = sorted.find(s => getCap(s) >= perServerTargetTb) || sorted[sorted.length - 1];
      const cap = getCap(chosen) || 32;
      const bw = getBw(chosen) || 600;
      const qtyByStorage = Math.ceil(targetTB / cap);
      const qtyByBw = Math.ceil(targetMbps / bw);
      const qtyNeeded = Math.max(1, minArchiverServers, qtyByStorage, qtyByBw);

      addToBOM(chosen.id || chosen.sku, qtyNeeded);
      if (typeof showToast === "function") {
        showToast(`Auto-Fitted ${qtyNeeded}x ${chosen.model} (${cap * qtyNeeded} TB Usable, ${bw * qtyNeeded} Mbps max) for ${vCalc.genetec.activeArchiverRoles} Genetec Archiver role(s).`, "success");
      }
    }
  }
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
}
window.autoFitNvrToBom = autoFitNvrToBom;


// =========================================================================
// TOP-LEVEL CALCULATORS & SIZERS STUDIO MODAL CONTROLLER
// =========================================================================

let activeCalculatorStudioType = "poe";
window.activeCalculatorStudioType = activeCalculatorStudioType;

function openCalculatorStudio(calcType = "poe") {
  activeCalculatorStudioType = calcType || "poe";
  window.activeCalculatorStudioType = activeCalculatorStudioType;
  const modal = document.getElementById("calculatorsStudioModal");
  if (!modal) return;
  modal.classList.remove("hidden");
  renderCalculatorStudioIfOpen();
}
window.openCalculatorStudio = openCalculatorStudio;

function renderCalculatorStudioIfOpen() {
  const modal = document.getElementById("calculatorsStudioModal");
  if (!modal || modal.classList.contains("hidden")) return;

  // Preserve focused input element if user is actively typing inside the studio
  const activeEl = document.activeElement;
  const isTypingInModal = activeEl && modal.contains(activeEl) && (activeEl.tagName === "INPUT" || activeEl.tagName === "SELECT");

  const t = activeCalculatorStudioType || "poe";
  let bodyHtml = "";
  let catalogJumpLabel = "Open Hardware Catalog";
  let catalogJumpAction = "if(typeof TabManager!=='undefined') TabManager.openTab('catalog');";

  if (t === "poe") {
    bodyHtml = renderPoeCalculatorStudioHtml();
    catalogJumpLabel = "Browse Matching PoE Switches in Catalog";
    catalogJumpAction = "switchDomain('networking'); setMode('access'); if(typeof TabManager!=='undefined') TabManager.openTab('catalog');";
  } else if (t === "storage") {
    bodyHtml = renderStorageCalculatorStudioHtml(true);
    catalogJumpLabel = "Browse Matching Servers & Storage in Catalog";
    catalogJumpAction = "switchDomain('compute_storage'); setMode('servers'); if(typeof TabManager!=='undefined') TabManager.openTab('catalog');";
  } else if (t === "workstation") {
    bodyHtml = renderWorkstationSizerStudioHtml(true);
    catalogJumpLabel = "Browse Client Workstations in Catalog";
    catalogJumpAction = "switchDomain('compute_storage'); setMode('workstations'); if(typeof TabManager!=='undefined') TabManager.openTab('catalog');";
  } else if (t === "doors") {
    bodyHtml = renderDoorBuilderStudioHtml(true);
    catalogJumpLabel = "Browse Access Control Hardware in Catalog";
    catalogJumpAction = "switchDomain('physical_security'); setMode('access_control'); if(typeof TabManager!=='undefined') TabManager.openTab('catalog');";
  } else if (t === "licensing") {
    bodyHtml = renderVmsLicensingStudioHtml(false);
    catalogJumpLabel = "Browse VMS Software & Licenses in Catalog";
    catalogJumpAction = "switchDomain('compute_storage'); setMode('vms_software'); if(typeof TabManager!=='undefined') TabManager.openTab('catalog');";
  }

  const navPills = [
    { id: "sizer_poe", type: "poe", label: "PoE & Switch Calculator", icon: "zap", color: "amber" },
    { id: "sizer_storage", type: "storage", label: "Storage & Failover Calculator", icon: "hard-drive", color: "purple" },
    { id: "sizer_workstation", type: "workstation", label: "Client Workstation Sizer", icon: "monitor", color: "sky" },
    { id: "sizer_doors", type: "doors", label: "Doors & Access Builder", icon: "door-open", color: "amber" },
    { id: "sizer_licensing", type: "licensing", label: "VMS Licensing Sizer", icon: "key", color: "emerald" }
  ];

  modal.innerHTML = `
    <!-- Studio Sub-Header Bar -->
    <div class="px-4 py-2.5 bg-slate-900/95 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
      <div class="flex flex-wrap items-center gap-1.5">
        <span class="text-[10px] font-mono uppercase tracking-wider text-slate-400 mr-1.5 flex items-center gap-1">
          <i data-lucide="calculator" class="w-3.5 h-3.5 text-amber-400"></i>
          <span>Calculators &amp; Sizers:</span>
        </span>
        ${navPills.map(np => {
          const isActive = np.type === t;
          return `
            <button
              type="button"
              onclick="if(typeof TabManager !== 'undefined') { TabManager.openTab('${np.id}'); } else { openCalculatorStudio('${np.type}'); }"
              class="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                isActive
                  ? 'bg-slate-800 text-white border-amber-500/60 shadow-sm'
                  : 'bg-slate-950/70 text-slate-400 hover:text-white border-slate-800 hover:border-slate-700'
              }"
            >
              <i data-lucide="${np.icon}" class="w-3.5 h-3.5 ${isActive ? 'text-amber-400' : 'text-slate-400'}"></i>
              <span>${np.label}</span>
            </button>
          `;
        }).join('')}
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          onclick="${catalogJumpAction}"
          class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <i data-lucide="layers" class="w-3.5 h-3.5 text-brand-400"></i>
          <span>${catalogJumpLabel} &rarr;</span>
        </button>
      </div>
    </div>

    <!-- Scrollable Full-Screen Calculator Studio Body -->
    <div class="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar">
      <div class="max-w-[1650px] mx-auto space-y-4">
        ${bodyHtml}
      </div>
    </div>
  `;

  safeCreateIcons(modal);
}
window.renderCalculatorStudioIfOpen = renderCalculatorStudioIfOpen;

window.buildCalculatorStrip = buildCalculatorStrip;
window.calculatePoETarget = calculatePoETarget;
window.updateDemandInput = updateDemandInput;
window.resetDemandInputs = resetDemandInputs;
window.deriveDemandFromBOM = deriveDemandFromBOM;
window.updateHeadroom = updateHeadroom;
window.setOpticQuickFilter = setOpticQuickFilter;
if (window.OSS && typeof window.OSS.register === "function") {
  window.OSS.register("Sizers.UI.CalculatorStrip", {
    buildCalculatorStrip,
    calculatePoETarget,
    renderPoeCalculatorStudioHtml,
    renderStorageCalculatorStudioHtml,
    openCalculatorStudio,
    renderCalculatorStudioIfOpen
  });
}
