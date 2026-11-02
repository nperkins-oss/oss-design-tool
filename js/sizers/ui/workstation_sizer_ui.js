// SUBSYSTEM: Sizer UI — Client Workstation Decoding & GPU Sizer Studio UI (js/sizers/ui/workstation_sizer_ui.js)

// =========================================================================
// CLIENT WORKSTATION DECODING SIZER (Genetec Security Center 5.14.1.0 Sec 1.2 & 1.3)
// =========================================================================

let workstationSyncAllColumns = {
  heads: false,
  resolutionMp: false,
  fps: false,
  codec: false
};
window.workstationSyncAllColumns = workstationSyncAllColumns;

function ensureEditableWorkstationGroups() {
  if (typeof ClientWorkstationSizer === "undefined") return [];
  if (!Array.isArray(ClientWorkstationSizer.state.viewedGroups) || ClientWorkstationSizer.state.viewedGroups.length === 0) {
    ClientWorkstationSizer.state.viewedGroups = [
      { id: "ws_grp_1", name: "Primary Tile Grid (1080p)", qty: 16, heads: 1, resolutionMp: 2, fps: 15, codec: "H.265" }
    ];
  }
  return ClientWorkstationSizer.state.viewedGroups;
}

function addWorkstationCameraGroup() {
  const groups = ensureEditableWorkstationGroups();
  const last = groups[groups.length - 1] || {};
  const nextIdx = groups.length + 1;
  groups.push({
    id: `ws_grp_${Date.now()}_${nextIdx}`,
    name: `Viewing Grid ${nextIdx}`,
    qty: 8,
    heads: last.heads || 1,
    resolutionMp: last.resolutionMp || 4,
    fps: last.fps || 15,
    codec: last.codec || "H.265"
  });
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
  if (typeof updateProjectHealthUI === "function") updateProjectHealthUI();
}
window.addWorkstationCameraGroup = addWorkstationCameraGroup;

function duplicateWorkstationCameraGroup(index) {
  const groups = ensureEditableWorkstationGroups();
  const src = groups[index];
  if (!src) return;
  groups.splice(index + 1, 0, {
    ...src,
    id: `ws_grp_${Date.now()}_${index + 2}`,
    name: `${src.name || "Grid"} (Copy)`
  });
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
  if (typeof updateProjectHealthUI === "function") updateProjectHealthUI();
}
window.duplicateWorkstationCameraGroup = duplicateWorkstationCameraGroup;

function removeWorkstationCameraGroup(index) {
  const groups = ensureEditableWorkstationGroups();
  if (groups.length <= 1) return;
  groups.splice(index, 1);
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
  if (typeof updateProjectHealthUI === "function") updateProjectHealthUI();
}
window.removeWorkstationCameraGroup = removeWorkstationCameraGroup;

function updateWorkstationCameraGroup(index, field, val) {
  const groups = ensureEditableWorkstationGroups();
  if (!groups[index]) return;
  groups[index][field] = val;
  if (workstationSyncAllColumns && workstationSyncAllColumns[field]) {
    groups.forEach(g => {
      g[field] = val;
    });
  }
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
  if (typeof updateProjectHealthUI === "function") updateProjectHealthUI();
}
window.updateWorkstationCameraGroup = updateWorkstationCameraGroup;

function toggleWorkstationColumnSync(field, checked) {
  const isChecked = Boolean(checked);
  if (workstationSyncAllColumns && field in workstationSyncAllColumns) {
    workstationSyncAllColumns[field] = isChecked;
  }
  if (isChecked) {
    const groups = ensureEditableWorkstationGroups();
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
window.toggleWorkstationColumnSync = toggleWorkstationColumnSync;

function setWorkstationSizerParam(key, val, skipConfirm = false) {
  if (typeof ClientWorkstationSizer === "undefined") return;
  const st = ClientWorkstationSizer.state;
  const defs = (typeof StorageService !== "undefined" && typeof StorageService.getProjectDefaults === "function") ? StorageService.getProjectDefaults() : null;
  if (key === "vmsPlatform" && !skipConfirm && defs && typeof confirmProjectDefaultChange === "function" && !(typeof isProjectWizardOpen === "function" && isProjectWizardOpen())) {
    const cleanPlat = val === "milestone" ? "milestone" : "genetec";
    const defVendor = typeof mapProjectPlatformToVmsVendor === "function" ? mapProjectPlatformToVmsVendor(defs.vms?.platform) : "genetec";
    const defPlat = defVendor === "milestone" ? "milestone" : "genetec";
    if (cleanPlat !== defPlat && cleanPlat !== st.vmsPlatform) {
      const defLbl = defs.vms?.platform || (defPlat === "milestone" ? "Milestone XProtect" : "Genetec");
      const newLbl = cleanPlat === "milestone" ? "Milestone XProtect" : "Genetec";
      confirmProjectDefaultChange({
        title: "Change Client Workstation VMS Client?",
        settingLabel: "VMS Client Decode Profile",
        defaultLabel: defLbl,
        newLabel: newLbl,
        message: `Your Project Default VMS Platform is set to "${defLbl}". Are you sure you want to size workstations for "${newLbl}"?`,
        allowLocalOverride: true,
        localOverrideLabel: `Override in Workstation Sizer Only`,
        updateDefaultLabel: `Update Project Default to ${newLbl}`,
        onLocalOverride: () => setWorkstationSizerParam(key, cleanPlat, true),
        onUpdateDefault: () => {
          if (typeof updateSingleProjectDefault === "function") {
            updateSingleProjectDefault(d => { if (!d.vms) d.vms = {}; d.vms.platform = newLbl; }, true);
          } else {
            setWorkstationSizerParam(key, cleanPlat, true);
          }
        },
        onCancel: () => { if (typeof buildCalculatorStrip === "function") buildCalculatorStrip(); }
      });
      return;
    }
  }
  if (key === "vmsPlatform") {
    st.vmsPlatform = val === "milestone" ? "milestone" : "genetec";
  } else if (key === "adaptiveStreaming") {
    st.adaptiveStreaming = Boolean(val);
  } else if (key === "monitorCount") {
    st.monitorCount = Math.max(1, Math.min(16, parseInt(val, 10) || 2));
  } else if (key === "workstationCount") {
    st.workstationCount = Math.max(1, Math.min(200, parseInt(val, 10) || 1));
    if (typeof setGenetecLicParam === "function") {
      setGenetecLicParam("workstationClients", st.workstationCount);
    }
  } else if (key === "usageMode") {
    st.usageMode = val === "video_wall" ? "video_wall" : "active_operator";
  } else if (key === "watermarking") {
    st.watermarking = Boolean(val);
  } else if (key === "hwAccelDecode") {
    st.hwAccelDecode = Boolean(val);
  } else if (key === "encryptedStreams") {
    st.encryptedStreams = Boolean(val);
  } else if (key === "preferredFormFactor") {
    st.preferredFormFactor = ["any", "tower", "rack"].includes(val) ? val : "any";
  }
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
  if (typeof updateProjectHealthUI === "function") updateProjectHealthUI();
}
window.setWorkstationSizerParam = setWorkstationSizerParam;

function syncWorkstationGroupsFromStorage() {
  if (typeof ClientWorkstationSizer === "undefined") return;
  let imported = [];
  if (typeof VideoStorageSizer !== "undefined" && Array.isArray(VideoStorageSizer.state?.cameraGroups) && VideoStorageSizer.state.cameraGroups.length > 0) {
    imported = VideoStorageSizer.state.cameraGroups.map((g, i) => ({
      id: `ws_sync_${Date.now()}_${i}`,
      name: g.name || `Camera Group ${i + 1}`,
      qty: Math.max(1, parseInt(g.qty, 10) || 1),
      heads: Math.max(1, parseInt(g.heads, 10) || 1),
      resolutionMp: Number(g.resolutionMp) || 4,
      fps: Number(g.fps) || 15,
      codec: g.codec || "H.265"
    }));
  } else if (typeof VideoStorageSizer !== "undefined" && typeof VideoStorageSizer.buildCameraGroupsFromBom === "function") {
    const bomGrps = VideoStorageSizer.buildCameraGroupsFromBom(projectBOM);
    imported = bomGrps.map((g, i) => ({
      id: `ws_bom_${Date.now()}_${i}`,
      name: g.name || `BOM Cameras ${i + 1}`,
      qty: Math.max(1, parseInt(g.qty, 10) || 1),
      heads: Math.max(1, parseInt(g.heads, 10) || 1),
      resolutionMp: Number(g.resolutionMp) || 4,
      fps: Number(g.fps) || 15,
      codec: g.codec || "H.265"
    }));
  }
  if (imported.length > 0) {
    ClientWorkstationSizer.state.viewedGroups = imported;
    if (typeof showToast === "function") {
      showToast(`Synced ${imported.length} camera group(s) into the Client Workstation Sizer.`, "info");
    }
    if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
  } else if (typeof showToast === "function") {
    showToast("No BOM or Storage camera groups found to sync yet.", "info");
  }
}
window.syncWorkstationGroupsFromStorage = syncWorkstationGroupsFromStorage;

function applyWorkstationPreset(presetKey) {
  if (typeof ClientWorkstationSizer === "undefined") return;
  const st = ClientWorkstationSizer.state;
  if (presetKey === "operator_16_1080p") {
    st.monitorCount = 2;
    st.usageMode = "active_operator";
    st.viewedGroups = [
      { id: "ws_p1", name: "2x2 + 3x4 Operator Grids (1080p)", qty: 16, heads: 1, resolutionMp: 2, fps: 15, codec: "H.265" }
    ];
  } else if (presetKey === "operator_32_mixed") {
    st.monitorCount = 3;
    st.usageMode = "active_operator";
    st.viewedGroups = [
      { id: "ws_p2a", name: "Overview Grid (24x 1080p)", qty: 24, heads: 1, resolutionMp: 2, fps: 15, codec: "H.265" },
      { id: "ws_p2b", name: "Call-Up Spot Monitors (8x 4K UHD)", qty: 8, heads: 1, resolutionMp: 8, fps: 30, codec: "H.265" }
    ];
  } else if (presetKey === "soc_wall_48") {
    st.monitorCount = 4;
    st.usageMode = "video_wall";
    st.viewedGroups = [
      { id: "ws_p3a", name: "4-Monitor Video Wall (36x 4MP)", qty: 36, heads: 1, resolutionMp: 4, fps: 15, codec: "H.265" },
      { id: "ws_p3b", name: "High-Detail Perimeter (12x 4K UHD)", qty: 12, heads: 1, resolutionMp: 8, fps: 15, codec: "H.265" }
    ];
  } else if (presetKey === "panoramic_multisensor") {
    st.monitorCount = 4;
    st.usageMode = "active_operator";
    st.viewedGroups = [
      { id: "ws_p4a", name: "Multi-Sensor 4-Head Cameras", qty: 6, heads: 4, resolutionMp: 4, fps: 15, codec: "H.265" },
      { id: "ws_p4b", name: "12MP 360° Fisheye De-Warping", qty: 8, heads: 1, resolutionMp: 12, fps: 15, codec: "H.265" }
    ];
  }
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
}
window.applyWorkstationPreset = applyWorkstationPreset;

function autoFitWorkstationToBom() {
  if (typeof ClientWorkstationSizer === "undefined" || typeof addToBOM !== "function") return;
  const wsCalc = ClientWorkstationSizer.calculate(projectBOM);
  const chosen = wsCalc.recommendedCatalogWorkstation;
  if (!chosen) return;
  const qty = Math.max(1, wsCalc.workstationCount * (wsCalc.workstationsNeededPerOperator || 1));
  addToBOM(chosen.id || chosen.sku, qty);
  if (typeof showToast === "function") {
    showToast(`Auto-Fitted ${qty}x ${chosen.model} (${chosen.sku}) to BOM for ${wsCalc.totalViewedStreams} simultaneously decoded streams (${wsCalc.recommendedProfile.shortLabel} tier).`, "success");
  }
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
}
window.autoFitWorkstationToBom = autoFitWorkstationToBom;

function renderWorkstationSizerStudioHtml(isFullStudio = true) {
  if (typeof ClientWorkstationSizer === "undefined") {
    return `<div class="p-4 text-slate-400 text-xs">Client Workstation Sizer engine is loading...</div>`;
  }
  const wsCalc = ClientWorkstationSizer.calculate(projectBOM);
  const isMilestoneWs = wsCalc.vmsPlatform === "milestone";
  const recProf = wsCalc.recommendedProfile || {};
  const recEv = wsCalc.recommendedProfileEvaluation || {};
  const recHw = wsCalc.recommendedCatalogWorkstation;
  const mods = wsCalc.modifiers || {};

  return `
    <div class="bg-slate-900/95 border border-slate-800 rounded-2xl p-3.5 sm:p-4 flex flex-col gap-3.5 shadow-lg">
      <!-- Row 1: Header, Multi-VMS Client Platform Switcher, Spec Reference Link, and Primary KPI Summary -->
      <div class="flex flex-col xl:flex-row xl:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div class="flex items-start sm:items-center gap-3">
          <div class="p-2.5 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400 shrink-0">
            <i data-lucide="monitor" class="w-5 h-5"></i>
          </div>
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <h4 class="text-xs font-bold text-white uppercase tracking-wider">
                Client Workstation Decoding Sizer
              </h4>
              <!-- Multi-Manufacturer VMS Client Platform Switcher -->
              <div class="inline-flex items-center bg-slate-950 border border-slate-800 rounded-xl p-0.5 text-[11px]">
                <button type="button" onclick="setWorkstationSizerParam('vmsPlatform', 'genetec')" class="px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer ${!isMilestoneWs ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}" title="Genetec Security Desk 5.14.1.0 Section 1.2 & 1.3 Decoding Benchmarks">
                  <i data-lucide="shield-check" class="w-3 h-3"></i>
                  <span>Genetec Security Desk 5.14</span>
                </button>
                <button type="button" onclick="setWorkstationSizerParam('vmsPlatform', 'milestone')" class="px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all cursor-pointer ${isMilestoneWs ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'}" title="Milestone XProtect Smart Client 2026 & Husky IVO Viewing Station (150D-VS / 350T-VS) Benchmarks">
                  <i data-lucide="monitor" class="w-3 h-3"></i>
                  <span>Milestone Smart Client / Husky IVO VS</span>
                </button>
              </div>
              <span class="px-2 py-0.5 rounded-md bg-sky-950/80 border border-sky-700/50 text-[10px] font-mono font-bold text-sky-300">
                ${wsCalc.totalViewedCameras} Cameras (${wsCalc.totalViewedStreams} Simultaneously Decoded Streams &bull; ${wsCalc.totalPixelRateMpPerSec} MP/s)
              </span>
              ${isMilestoneWs ? `
                <button onclick="openDatasheetModal('Datasheets/Milestone/7_Milestone Husky IVO Viewing Stations flyer.pdf', 'Milestone Husky IVO 150D / 350T Viewing Station Datasheet', 'HIVO-350T-VS')" class="px-2 py-0.5 rounded-md bg-sky-950/80 hover:bg-sky-900 border border-sky-700/60 text-[10px] font-mono font-semibold text-sky-300 flex items-center gap-1 transition-all cursor-pointer" title="Open Milestone Husky IVO 150D/350T Viewing Station Datasheet PDF">
                  <i data-lucide="file-text" class="w-3 h-3"></i>
                  <span>Husky IVO Viewing Station Specification</span>
                </button>
              ` : `
                <button onclick="openDatasheetModal('Datasheets/Genetec/SystemRequirements.pdf', 'Genetec Security Center 5.14.1.0 System Requirements Guide (Pages 5-6)', 'GENETEC-SC-5.14-WS')" class="px-2 py-0.5 rounded-md bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/60 text-[10px] font-mono font-semibold text-indigo-300 flex items-center gap-1 transition-all cursor-pointer" title="Open Genetec 5.14.1.0 System Requirements PDF (Pages 5-6 Client Workstation Specifications & Decoding Performance)">
                  <i data-lucide="file-text" class="w-3 h-3"></i>
                  <span>Genetec 5.14 Specification Guide (p. 5–6)</span>
                </button>
              `}
            </div>
            <p class="text-[11px] text-slate-400 mt-0.5">
              Calculates exact CPU, GPU, RAM, Dual-GPU Monitor, and Hardware Decoding requirements for <strong class="text-white">${isMilestoneWs ? 'Milestone XProtect Smart Client 2026 &amp; Husky IVO Viewing Stations' : 'Genetec Security Desk 5.14'}</strong> based on simultaneously viewed camera tiles, resolution, frame rate, codec (<code class="text-sky-300">H.264</code> / <code class="text-sky-300">H.265</code> / <code class="text-sky-300">AV1</code>), and GPU acceleration.
            </p>
          </div>
        </div>

        <!-- Top Right KPI Strip & Auto-Fit Button -->
        <div class="flex flex-wrap items-center gap-2.5 shrink-0">
          <div class="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-slate-950 border ${wsCalc.exceedsSingleHighPerfWorkstation ? 'border-amber-600/80' : 'border-slate-800'}">
            <div>
              <div class="text-[9px] uppercase font-bold text-slate-400">Required Specification Tier</div>
              <div class="text-xs font-mono font-bold text-sky-400">${recProf.shortLabel || 'Recommended'}</div>
            </div>
            <div class="h-6 w-px bg-slate-800"></div>
            <div>
              <div class="text-[9px] uppercase font-bold text-slate-400">Decode Utilization</div>
              <div class="text-xs font-mono font-bold ${recEv.isCompliant ? 'text-emerald-400' : 'text-amber-400'}">
                ${recEv.utilizationPct || 0}% <span class="text-slate-500">/ ${recEv.safeCapPct || 80}% Cap</span>
              </div>
            </div>
            <div class="h-6 w-px bg-slate-800"></div>
            <div>
              <div class="text-[9px] uppercase font-bold text-slate-400">Recommended Appliance</div>
              <div class="text-xs font-mono font-bold text-indigo-300">${recHw ? `${recHw.sku} ($${(recHw.msrp || 0).toLocaleString()})` : 'High-Performance'}</div>
            </div>
          </div>

          <button onclick="autoFitWorkstationToBom()" class="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer" title="Add the recommended Client Workstation(s) to the Project BOM">
            <i data-lucide="wand-2" class="w-4 h-4"></i>
            <span>+ Auto-Fit ${wsCalc.workstationCount * (wsCalc.workstationsNeededPerOperator || 1)}x ${recHw ? recHw.sku : 'Workstation'}</span>
          </button>
        </div>
      </div>

      <!-- Row 2: Global Workstation Environment & Genetec 5.14 Decoding Modifiers Bar -->
      <div class="bg-slate-950/90 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-2.5">
          <!-- Operator Workstation Count -->
          <div class="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5" title="Number of Security Desk operator workstations to quote (Base package includes 5 free client connections)">
            <span class="text-[10px] font-bold uppercase text-slate-300">Operator Stations:</span>
            <input type="number" min="1" max="100" value="${wsCalc.workstationCount}" onchange="setWorkstationSizerParam('workstationCount', this.value)" class="w-12 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-center font-mono font-bold text-white text-xs focus:outline-none" />
          </div>

          <!-- Monitors per Workstation -->
          <div class="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5" title="Displays connected per workstation (Genetec 5.14 Rule: Connecting >2 monitors requires High-Performance tier with Dual GPUs)">
            <span class="text-[10px] font-bold uppercase text-slate-300">Monitors / Station:</span>
            <select onchange="setWorkstationSizerParam('monitorCount', this.value)" class="bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-sky-300 font-mono font-bold text-xs focus:outline-none cursor-pointer">
              ${[1, 2, 3, 4, 6, 8].map(m => `<option value="${m}" class="bg-slate-900" ${wsCalc.monitorCount === m ? 'selected' : ''}>${m} Monitor${m === 1 ? '' : 's'}${m > 2 ? ' (Requires Dual GPU)' : ''}</option>`).join('')}
            </select>
          </div>

          <!-- Usage Mode (Active Operator 20% Headroom vs Static Video Wall 15% Headroom) -->
          <div class="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5" title="Genetec 5.14 Page 6: Leave at least 20% headroom if the workstation is actively used by an operator (80% max decode load)">
            <span class="text-[10px] font-bold uppercase text-slate-300">Station Role:</span>
            <select onchange="setWorkstationSizerParam('usageMode', this.value)" class="bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-amber-300 font-bold text-xs focus:outline-none cursor-pointer">
              <option value="active_operator" class="bg-slate-900" ${wsCalc.usageMode === 'active_operator' ? 'selected' : ''}>Active Security Desk Operator (80% Cap / 20% Headroom)</option>
              <option value="video_wall" class="bg-slate-900" ${wsCalc.usageMode === 'video_wall' ? 'selected' : ''}>Passive Video Wall Display Only (85% Cap / 15% Headroom)</option>
            </select>
          </div>

          <!-- Form Factor Filter -->
          <div class="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5">
            <span class="text-[10px] font-bold uppercase text-slate-300">Chassis:</span>
            <select onchange="setWorkstationSizerParam('preferredFormFactor', this.value)" class="bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-slate-200 font-bold text-xs focus:outline-none cursor-pointer">
              <option value="any" class="bg-slate-900" ${wsCalc.preferredFormFactor === 'any' ? 'selected' : ''}>Any (Tower / SFF / Rack)</option>
              <option value="tower" class="bg-slate-900" ${wsCalc.preferredFormFactor === 'tower' ? 'selected' : ''}>Desktop / Tower / Mini</option>
              <option value="rack" class="bg-slate-900" ${wsCalc.preferredFormFactor === 'rack' ? 'selected' : ''}>Rackmount Workstation</option>
            </select>
          </div>
        </div>

        <!-- Genetec 5.14 Page 6 Decoding Modifiers (Watermarking, HW Accel, Encrypted Streams) -->
        <div class="flex flex-wrap items-center gap-2">
          <label class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold cursor-pointer select-none transition-all ${wsCalc.hwAccelDecode ? 'bg-emerald-950/40 border-emerald-600/50 text-emerald-300' : 'bg-slate-900 border-slate-800 text-slate-400'}" title="Hardware-accelerated GPU decoding enabled in Security Desk options">
            <input type="checkbox" ${wsCalc.hwAccelDecode ? 'checked' : ''} onchange="setWorkstationSizerParam('hwAccelDecode', this.checked)" class="w-3.5 h-3.5 rounded accent-emerald-500 cursor-pointer" />
            <span>GPU Hardware Acceleration</span>
          </label>

          <label class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold cursor-pointer select-none transition-all ${wsCalc.watermarking ? 'bg-amber-950/40 border-amber-600/50 text-amber-300' : 'bg-slate-900 border-slate-800 text-slate-400'}" title="Genetec 5.14 Page 6: Video Watermarking reduces maximum decoded streams by 10% with hardware acceleration or 30% without hardware acceleration">
            <input type="checkbox" ${wsCalc.watermarking ? 'checked' : ''} onchange="setWorkstationSizerParam('watermarking', this.checked)" class="w-3.5 h-3.5 rounded accent-amber-500 cursor-pointer" />
            <span>Video Watermarking (${wsCalc.hwAccelDecode ? '-10%' : '-30%'} Capacity)</span>
          </label>

          <label class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold cursor-pointer select-none transition-all ${wsCalc.encryptedStreams ? 'bg-rose-950/40 border-rose-600/50 text-rose-300' : 'bg-slate-900 border-slate-800 text-slate-400'}" title="Viewing encrypted streams increases CPU load by up to 40% (~28.6% stream capacity reduction)">
            <input type="checkbox" ${wsCalc.encryptedStreams ? 'checked' : ''} onchange="setWorkstationSizerParam('encryptedStreams', this.checked)" class="w-3.5 h-3.5 rounded accent-rose-500 cursor-pointer" />
            <span>Encrypted Streams (+40% CPU Load)</span>
          </label>

          ${isMilestoneWs ? `
            <label class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold cursor-pointer select-none transition-all ${wsCalc.adaptiveStreaming ? 'bg-sky-950/40 border-sky-600/50 text-sky-300' : 'bg-slate-900 border-slate-800 text-slate-400'}" title="Milestone XProtect Adaptive Streaming dynamically requests lower-resolution secondary streams for small grid tiles, increasing multi-tile decoding capacity by ~35%">
              <input type="checkbox" ${wsCalc.adaptiveStreaming ? 'checked' : ''} onchange="setWorkstationSizerParam('adaptiveStreaming', this.checked)" class="w-3.5 h-3.5 rounded accent-sky-500 cursor-pointer" />
              <span>Adaptive Streaming (+35% Tile Capacity)</span>
            </label>
          ` : ''}
        </div>
      </div>

      <!-- Row 3: Simultaneously Viewed Camera Tile Groups Table -->
      <div class="bg-slate-950/90 border border-slate-800 rounded-xl p-3 flex flex-col gap-2.5">
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-[11px] font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
              <i data-lucide="layout-grid" class="w-3.5 h-3.5 text-sky-400"></i>
              <span>Simultaneously Viewed Camera Tile Groups (${wsCalc.viewedGroups.length} Group${wsCalc.viewedGroups.length === 1 ? '' : 's'})</span>
            </span>
            <button onclick="addWorkstationCameraGroup()" class="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-bold flex items-center gap-1 shadow-sm transition-all cursor-pointer">
              <i data-lucide="plus" class="w-3.5 h-3.5"></i>
              <span>Add Viewed Tile Group</span>
            </button>
            <button onclick="syncWorkstationGroupsFromStorage()" class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer" title="Import camera groups from the Storage Calculator or Project BOM">
              <i data-lucide="refresh-cw" class="w-3 h-3 text-sky-400"></i>
              <span>Sync from Storage / BOM</span>
            </button>
          </div>

          <!-- Quick Operator Tile Layout Presets -->
          <div class="flex flex-wrap items-center gap-1.5">
            <span class="text-[10px] font-mono text-slate-400 uppercase mr-1">Quick Presets:</span>
            <button onclick="applyWorkstationPreset('operator_16_1080p')" class="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] font-semibold text-slate-300 cursor-pointer">
              16x 1080p @ 15fps (2 Monitors)
            </button>
            <button onclick="applyWorkstationPreset('operator_32_mixed')" class="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] font-semibold text-sky-300 cursor-pointer">
              24x 1080p + 8x 4K (3 Monitors)
            </button>
            <button onclick="applyWorkstationPreset('soc_wall_48')" class="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] font-semibold text-indigo-300 cursor-pointer">
              36x 4MP + 12x 4K Wall (4 Monitors)
            </button>
            <button onclick="applyWorkstationPreset('panoramic_multisensor')" class="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] font-semibold text-purple-300 cursor-pointer">
              Multi-Sensor + 12MP Fisheye
            </button>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="border-b border-slate-800 text-[9px] uppercase font-bold text-slate-400 align-bottom">
                <th class="py-1.5 px-2 min-w-[160px]">Tile Group / Monitor Assignment</th>
                <th class="py-1.5 px-1.5 w-24">Viewed Cameras</th>
                <th class="py-1.5 px-1.5 w-28">
                  <div class="flex flex-col gap-0.5">
                    <label class="inline-flex items-center gap-1 text-[8px] font-mono text-sky-300 cursor-pointer select-none">
                      <input type="checkbox" ${workstationSyncAllColumns.heads ? 'checked' : ''} onchange="toggleWorkstationColumnSync('heads', this.checked)" class="w-3 h-3 rounded accent-sky-500 cursor-pointer" />
                      <span>All Same</span>
                    </label>
                    <span>Streams per Camera</span>
                  </div>
                </th>
                <th class="py-1.5 px-1.5 min-w-[140px]">
                  <div class="flex flex-col gap-0.5">
                    <label class="inline-flex items-center gap-1 text-[8px] font-mono text-sky-300 cursor-pointer select-none">
                      <input type="checkbox" ${workstationSyncAllColumns.resolutionMp ? 'checked' : ''} onchange="toggleWorkstationColumnSync('resolutionMp', this.checked)" class="w-3 h-3 rounded accent-sky-500 cursor-pointer" />
                      <span>All Same</span>
                    </label>
                    <span>Displayed Stream Resolution</span>
                  </div>
                </th>
                <th class="py-1.5 px-1.5 w-28">
                  <div class="flex flex-col gap-0.5">
                    <label class="inline-flex items-center gap-1 text-[8px] font-mono text-sky-300 cursor-pointer select-none">
                      <input type="checkbox" ${workstationSyncAllColumns.fps ? 'checked' : ''} onchange="toggleWorkstationColumnSync('fps', this.checked)" class="w-3 h-3 rounded accent-sky-500 cursor-pointer" />
                      <span>All Same</span>
                    </label>
                    <span>Viewing FPS</span>
                  </div>
                </th>
                <th class="py-1.5 px-1.5 w-32">
                  <div class="flex flex-col gap-0.5">
                    <label class="inline-flex items-center gap-1 text-[8px] font-mono text-sky-300 cursor-pointer select-none">
                      <input type="checkbox" ${workstationSyncAllColumns.codec ? 'checked' : ''} onchange="toggleWorkstationColumnSync('codec', this.checked)" class="w-3 h-3 rounded accent-sky-500 cursor-pointer" />
                      <span>All Same</span>
                    </label>
                    <span>Compression Codec</span>
                  </div>
                </th>
                <th class="py-1.5 px-2 text-right">Decoded Streams</th>
                <th class="py-1.5 px-2 text-right">Pixel Rate (MP/s)</th>
                <th class="py-1.5 px-2 text-right">Estimated Client Mbps</th>
                <th class="py-1.5 px-2 text-right" title="Decode load on the Recommended Workstation profile">Load (${recProf.shortLabel || 'Recommended'})</th>
                <th class="py-1.5 px-1.5 text-center w-16">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/60">
              ${wsCalc.viewedGroups.map((grp, idx) => {
                const recGroupDetail = (recEv.groupDetails || [])[idx] || {};
                return `
                  <tr class="hover:bg-slate-900/50 transition-colors">
                    <td class="py-1.5 px-2">
                      <input type="text" value="${escapeHTML(grp.name || `Grid ${idx + 1}`)}" onchange="updateWorkstationCameraGroup(${idx}, 'name', this.value)" class="w-full bg-slate-900 border border-slate-700/80 rounded px-2 py-1 text-xs font-semibold text-white focus:outline-none focus:border-sky-500" />
                    </td>
                    <td class="py-1.5 px-1.5">
                      <input type="number" min="1" max="256" value="${grp.qty}" onchange="updateWorkstationCameraGroup(${idx}, 'qty', Math.max(1, parseInt(this.value, 10) || 1))" class="w-full bg-slate-900 border border-slate-700/80 rounded px-2 py-1 text-xs font-mono font-bold text-white text-center focus:outline-none focus:border-sky-500" />
                    </td>
                    <td class="py-1.5 px-1.5">
                      <select onchange="updateWorkstationCameraGroup(${idx}, 'heads', Number(this.value))" class="w-full bg-slate-900 border border-slate-700/80 rounded px-1.5 py-1 text-slate-200 font-mono text-xs focus:outline-none cursor-pointer">
                        <option value="1" class="bg-slate-900" ${(grp.heads || 1) === 1 ? 'selected' : ''}>1x Single</option>
                        <option value="2" class="bg-slate-900" ${grp.heads === 2 ? 'selected' : ''}>2x Dual</option>
                        <option value="3" class="bg-slate-900" ${grp.heads === 3 ? 'selected' : ''}>3x Triple</option>
                        <option value="4" class="bg-slate-900" ${grp.heads === 4 ? 'selected' : ''}>4x Quad</option>
                        <option value="5" class="bg-slate-900" ${grp.heads === 5 ? 'selected' : ''}>5x (4-Head+PTZ)</option>
                      </select>
                    </td>
                    <td class="py-1.5 px-1.5">
                      <select onchange="updateWorkstationCameraGroup(${idx}, 'resolutionMp', Number(this.value))" class="w-full bg-slate-900 border border-slate-700/80 rounded px-1.5 py-1 text-white font-bold text-xs focus:outline-none cursor-pointer">
                        ${[
                          { mp: 0.4, label: "0.4MP (CIF / Low-Res Tile)" },
                          { mp: 1, label: "1MP (720p HD)" },
                          { mp: 2, label: "2MP (1080p Full HD)" },
                          { mp: 3, label: "3MP (2048x1536)" },
                          { mp: 4, label: "4MP (1440p QHD)" },
                          { mp: 5, label: "5MP (2592x1944)" },
                          { mp: 6, label: "6MP (3072x2048)" },
                          { mp: 8, label: "8MP (4K Ultra HD)" },
                          { mp: 12, label: "12MP (360° Fisheye)" },
                          { mp: 16, label: "16MP (Panoramic)" }
                        ].map(r => `<option value="${r.mp}" class="bg-slate-900" ${Number(grp.resolutionMp) === r.mp ? 'selected' : ''}>${r.label}</option>`).join('')}
                      </select>
                    </td>
                    <td class="py-1.5 px-1.5">
                      <select onchange="updateWorkstationCameraGroup(${idx}, 'fps', Number(this.value))" class="w-full bg-slate-900 border border-slate-700/80 rounded px-1.5 py-1 text-white font-bold text-xs focus:outline-none cursor-pointer">
                        ${[1, 2, 5, 10, 12, 15, 20, 24, 30, 60].map(f => `<option value="${f}" class="bg-slate-900" ${Number(grp.fps) === f ? 'selected' : ''}>${f} FPS</option>`).join('')}
                      </select>
                    </td>
                    <td class="py-1.5 px-1.5">
                      <select onchange="updateWorkstationCameraGroup(${idx}, 'codec', this.value)" class="w-full bg-slate-900 border border-slate-700/80 rounded px-1.5 py-1 text-sky-300 font-bold text-xs focus:outline-none cursor-pointer">
                        <option value="H.264" class="bg-slate-900" ${grp.codec === 'H.264' ? 'selected' : ''}>H.264 (AVC)</option>
                        <option value="H.265" class="bg-slate-900" ${grp.codec === 'H.265' ? 'selected' : ''}>H.265 (HEVC)</option>
                        <option value="AV1" class="bg-slate-900" ${grp.codec === 'AV1' ? 'selected' : ''}>AV1 (Genetec 5.14)</option>
                      </select>
                    </td>
                    <td class="py-1.5 px-2 text-right font-mono font-bold text-white">${recGroupDetail.streams || (grp.qty * (grp.heads || 1))} Streams</td>
                    <td class="py-1.5 px-2 text-right font-mono text-sky-300">${recGroupDetail.pixelRateMpPerSec || 0} MP/s</td>
                    <td class="py-1.5 px-2 text-right font-mono text-purple-300">${recGroupDetail.estimatedBandwidthMbps || 0} Mbps</td>
                    <td class="py-1.5 px-2 text-right font-mono">
                      <span class="font-bold ${(recGroupDetail.groupLoadPct || 0) <= 80 ? 'text-emerald-400' : 'text-amber-400'}">${recGroupDetail.groupLoadPct || 0}%</span>
                      <span class="text-[9px] text-slate-500 block">of ${recGroupDetail.effectiveMaxStreams || 0} Maximum</span>
                    </td>
                    <td class="py-1.5 px-1.5 text-center">
                      <div class="flex items-center justify-center gap-1">
                        <button onclick="duplicateWorkstationCameraGroup(${idx})" class="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-sky-300 transition-colors cursor-pointer" title="Duplicate tile group">
                          <i data-lucide="copy" class="w-3.5 h-3.5"></i>
                        </button>
                        ${wsCalc.viewedGroups.length > 1 ? `
                          <button onclick="removeWorkstationCameraGroup(${idx})" class="p-1 rounded hover:bg-rose-950/80 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer" title="Remove tile group">
                            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                          </button>
                        ` : ''}
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Row 4: Genetec 5.14.1.0 Section 1.2 & 1.3 Hardware Profile Comparison Cards (Minimum vs Recommended vs High-Performance) -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-3">
        ${(wsCalc.profileEvaluations || []).map(ev => {
          const prof = ev.profile || {};
          const isRec = prof.id === wsCalc.recommendedProfileKey;
          const barPct = Math.min(100, Math.round(ev.utilizationPct || 0));
          const barColor = !ev.isDecodeCompliant
            ? "bg-rose-500"
            : !ev.isMonitorCompliant
              ? "bg-amber-500"
              : (barPct > 70 ? "bg-amber-400" : "bg-emerald-500");

          return `
            <div class="rounded-xl p-3.5 border flex flex-col justify-between gap-2.5 transition-all ${
              isRec
                ? 'bg-sky-950/25 border-sky-500/70 shadow-lg ring-1 ring-sky-500/30'
                : (ev.isCompliant ? 'bg-slate-950/90 border-slate-800' : 'bg-slate-950/60 border-slate-800/70 opacity-85')
            }">
              <div class="space-y-2">
                <div class="flex items-center justify-between gap-2">
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-black uppercase tracking-wider ${isRec ? 'text-sky-300' : 'text-white'}">${prof.shortLabel} Profile</span>
                    ${isRec ? `<span class="px-2 py-0.5 rounded bg-sky-500/20 border border-sky-400/50 text-sky-200 text-[9px] font-mono font-bold uppercase">★ Required Specification</span>` : ''}
                  </div>
                  <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    ev.isCompliant
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60'
                      : 'bg-rose-950 text-rose-300 border border-rose-700/60'
                  }">
                    ${ev.isCompliant ? `✓ PASS (${ev.utilizationPct}%)` : (!ev.isMonitorCompliant ? `⚠ MAXIMUM ${prof.maxMonitors} MONITORS` : `✗ OVERLOAD (${ev.utilizationPct}%)`)}
                  </span>
                </div>

                <!-- Utilization Progress Bar with 80%/85% Operator Headroom Marker -->
                <div class="space-y-1">
                  <div class="flex items-center justify-between text-[10px] font-mono">
                    <span class="text-slate-400">Decoding Load vs Safe Cap (${ev.safeCapPct}%):</span>
                    <span class="font-bold ${ev.isDecodeCompliant ? 'text-emerald-400' : 'text-rose-400'}">${ev.utilizationPct}% / ${ev.safeCapPct}%</span>
                  </div>
                  <div class="w-full h-2 rounded-full bg-slate-900 border border-slate-800 overflow-hidden relative">
                    <div class="h-full ${barColor} transition-all" style="width: ${barPct}%"></div>
                  </div>
                </div>

                <!-- Genetec 5.14.1.0 Section 1.2 Hardware Spec Breakdown -->
                <div class="bg-slate-900/90 border border-slate-800/90 rounded-lg p-2.5 space-y-1 text-[10px] font-mono">
                  <div class="flex justify-between gap-2"><span class="text-slate-400">CPU:</span><span class="text-white font-semibold text-right">${prof.cpuSpec}</span></div>
                  <div class="flex justify-between gap-2"><span class="text-slate-400">GPU:</span><span class="text-sky-300 font-semibold text-right">${prof.gpuSpec}</span></div>
                  <div class="flex justify-between gap-2"><span class="text-slate-400">Memory &amp; Disk:</span><span class="text-slate-200 text-right">${prof.ramGb} GB RAM &bull; ${prof.osDriveSpec}</span></div>
                  <div class="flex justify-between gap-2"><span class="text-slate-400">Display Support:</span><span class="text-amber-300 text-right">${prof.monitorSpec}</span></div>
                </div>

                <!-- Genetec 5.14.1.0 Section 1.3 (Page 6) Benchmark Stream Capacities at 30 FPS -->
                <div class="grid grid-cols-3 gap-1.5 text-center text-[9px] font-mono pt-0.5">
                  <div class="p-1.5 rounded bg-slate-900/70 border border-slate-800">
                    <div class="text-slate-400">H.264 @ 30fps</div>
                    <div class="font-bold text-white">${ev.benchmarks30Fps.fhd1080p_h264}x 1080p</div>
                    <div class="text-sky-300">${ev.benchmarks30Fps.uhd4k_h264}x 4K UHD</div>
                  </div>
                  <div class="p-1.5 rounded bg-slate-900/70 border border-slate-800">
                    <div class="text-slate-400">H.265 @ 30fps</div>
                    <div class="font-bold text-white">${ev.benchmarks30Fps.fhd1080p_h265}x 1080p</div>
                    <div class="text-sky-300">${ev.benchmarks30Fps.uhd4k_h265}x 4K UHD</div>
                  </div>
                  <div class="p-1.5 rounded bg-slate-900/70 border border-slate-800">
                    <div class="text-slate-400">AV1 @ 30fps</div>
                    <div class="font-bold text-white">${ev.benchmarks30Fps.fhd1080p_av1}x 1080p</div>
                    <div class="text-sky-300">${ev.benchmarks30Fps.uhd4k_av1}x 4K UHD</div>
                  </div>
                </div>
              </div>

              <div class="text-[10px] text-slate-400 border-t border-slate-800/80 pt-2 flex items-center justify-between">
                <span>${isMilestoneWs ? 'Husky IVO Match' : 'Streamvault Match'}: <strong class="${isMilestoneWs ? 'text-sky-300' : 'text-indigo-300'}">${prof.recommendedHuskySku || prof.recommendedStreamvaultSku || 'Custom'}</strong></span>
                <span>${prof.referencePage}</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Row 5: Engineering Findings & Matched Catalog Workstations -->
      <div class="grid grid-cols-1 xl:grid-cols-12 gap-3 pt-1">
        <div class="xl:col-span-5 bg-slate-950/90 border border-slate-800 rounded-xl p-3 space-y-2">
          <div class="text-[10px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <i data-lucide="cpu" class="w-3.5 h-3.5 text-sky-400"></i>
            <span>${isMilestoneWs ? 'Milestone Smart Client 2026 &amp; Husky IVO VS Decoding Notes' : 'Genetec 5.14.1.0 Decoding Math &amp; Engineering Notes'}</span>
          </div>
          <div class="space-y-1.5">
            ${(wsCalc.findings || []).map(f => `
              <div class="px-2.5 py-1.5 rounded-lg text-[10px] font-medium flex items-start gap-1.5 ${
                f.severity === 'warning'
                  ? 'bg-amber-950/70 border border-amber-700/70 text-amber-200'
                  : f.severity === 'success'
                    ? 'bg-emerald-950/50 border border-emerald-700/60 text-emerald-200'
                    : 'bg-sky-950/50 border border-sky-700/60 text-sky-200'
              }">
                <i data-lucide="${f.severity === 'warning' ? 'alert-triangle' : f.severity === 'success' ? 'check-circle-2' : 'info'}" class="w-3.5 h-3.5 shrink-0 mt-0.5"></i>
                <span>${f.text}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="xl:col-span-7 bg-slate-950/90 border border-slate-800 rounded-xl p-3 space-y-2">
          <div class="flex items-center justify-between gap-2">
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <i data-lucide="package-check" class="w-3.5 h-3.5 text-indigo-400"></i>
              <span>Matched Client Workstations (Streamvault SVW / Milestone Husky IVO VS / Dell / BCDVideo)</span>
            </span>
            <span class="text-[10px] font-mono text-slate-400">Click + Add to quote into Project BOM</span>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-72 overflow-y-auto custom-scrollbar pr-1">
            ${(wsCalc.matchedCatalogWorkstations || []).map(w => `
              <div class="p-2.5 rounded-xl border flex flex-col justify-between gap-1.5 ${
                recHw && recHw.id === w.id
                  ? 'bg-indigo-950/40 border-indigo-500/60'
                  : (w.meetsSpec ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-900/40 border-slate-800/50 opacity-60')
              }">
                <div class="flex items-start justify-between gap-2">
                  <div>
                    <div class="flex items-center gap-1.5">
                      <span class="text-xs font-bold text-white">${w.sku}</span>
                      ${recHw && recHw.id === w.id ? `<span class="px-1.5 py-0.2 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[9px] font-mono font-bold">BEST FIT</span>` : ''}
                    </div>
                    <div class="text-[10px] text-slate-300">${w.vendor} &bull; ${w.formFactor}</div>
                  </div>
                  <span class="text-xs font-mono font-bold text-emerald-400">$${(w.msrp || 0).toLocaleString()}</span>
                </div>
                <div class="text-[9.5px] font-mono text-slate-400 leading-snug">
                  ${w.processor} &bull; ${w.ramGb}GB RAM &bull; ${w.gpu} &bull; Up to ${w.maxMonitors} Monitors
                </div>
                ${typeof renderApplianceBuildOptionsAndAccessoriesHtml === 'function' ? renderApplianceBuildOptionsAndAccessoriesHtml(w) : ''}
                <div class="flex items-center justify-between pt-1 border-t border-slate-800/80">
                  <span class="text-[9px] font-mono ${w.meetsSpec ? 'text-emerald-400' : 'text-rose-400'}">
                    ${w.meetsSpec ? '✓ Meets Viewed Stream Specification' : 'Below Required Tier/Monitors'}
                  </span>
                  <button onclick="addToBOM('${w.id}', ${wsCalc.workstationCount}); if(typeof showToast==='function') showToast('Added ${wsCalc.workstationCount}x ${w.sku} to BOM.', 'success');" class="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold cursor-pointer">
                    + Add ${wsCalc.workstationCount}x to BOM
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}
window.renderWorkstationSizerStudioHtml = renderWorkstationSizerStudioHtml;

if (window.OSS && typeof window.OSS.register === "function") {
  window.OSS.register("Sizers.UI.Workstation", {
    setWorkstationSizerParam,
    syncWorkstationGroupsFromStorage,
    applyWorkstationPreset,
    autoFitWorkstationToBom,
    renderWorkstationSizerStudioHtml
  });
}
