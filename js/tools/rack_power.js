// =========================================================================
// RACK POWER, ZERO-U VERTICAL CHANNELS, PDU SIZING & POWER MATRIX ENGINE
// Separated from js/tools/rack.js for modular maintainability
// =========================================================================

// -----------------------------------------------------------
// Power Supply Units (PSU), Power Feeds & PDU Sizing Models
// -----------------------------------------------------------
// -----------------------------------------------------------
// Rack Vertical Zero-U Channels (4-Corner Layout: Front L/R, Back L/R)
// & PDU Sizing / Feed Models
// -----------------------------------------------------------
const DEFAULT_VERTICAL_CHANNELS = {
  frontLeft: "vertical_cable_mgr",
  frontRight: "vertical_cable_mgr",
  rearLeft: "pdu",
  rearRight: "pdu"
};

function getRackVerticalChannels(rackId = activeRackId) {
  if (!rackId) return { ...DEFAULT_VERTICAL_CHANNELS };
  const parsed = FacilityStore.parse(rackId);
  const enclosures = FacilityStore.getEnclosures();
  const activeEnc = enclosures.find(e => e.id === parsed.hostId) || enclosures.find(e => e.name.toLowerCase() === (parsed.hostName || '').toLowerCase()) || null;

  if (activeEnc && activeEnc.verticalChannels) {
    return { ...DEFAULT_VERTICAL_CHANNELS, ...activeEnc.verticalChannels };
  }

  const saved = localStorage.getItem(`rack_vertical_channels_${rackId}`);
  if (saved) {
    try {
      const parsedChannels = JSON.parse(saved);
      if (parsedChannels && typeof parsedChannels === "object") {
        return { ...DEFAULT_VERTICAL_CHANNELS, ...parsedChannels };
      }
    } catch (e) {
      console.warn("Failed to parse rack_vertical_channels", e);
    }
  }

  const legacyPdu = (activeEnc && activeEnc.pduConfig) || localStorage.getItem(`rack_pdu_config_${rackId}`) || "dual_vertical";
  if (legacyPdu === "single_vertical") {
    return {
      frontLeft: "vertical_cable_mgr",
      frontRight: "vertical_cable_mgr",
      rearLeft: "pdu",
      rearRight: "none"
    };
  } else if (legacyPdu === "horizontal") {
    return {
      frontLeft: "vertical_cable_mgr",
      frontRight: "vertical_cable_mgr",
      rearLeft: "none",
      rearRight: "none"
    };
  } else if (legacyPdu === "all_cable") {
    return {
      frontLeft: "vertical_cable_mgr",
      frontRight: "vertical_cable_mgr",
      rearLeft: "vertical_cable_mgr",
      rearRight: "vertical_cable_mgr"
    };
  } else if (legacyPdu === "quad_pdu") {
    return {
      frontLeft: "pdu",
      frontRight: "pdu",
      rearLeft: "pdu",
      rearRight: "pdu"
    };
  }

  return { ...DEFAULT_VERTICAL_CHANNELS };
}

function setRackVerticalChannel(slotKey, value, rackId = activeRackId) {
  if (!rackId) return;
  const current = getRackVerticalChannels(rackId);
  current[slotKey] = value;

  localStorage.setItem(`rack_vertical_channels_${rackId}`, JSON.stringify(current));

  const parsed = FacilityStore.parse(rackId);
  if (parsed.hostId) {
    FacilityStore.updateHost(parsed.hostId, { verticalChannels: current });
  }

  const pduCount = Object.values(current).filter(v => v === "pdu").length;
  let legacyVal = "front_cable_rear_pdu";
  if (current.frontLeft === "vertical_cable_mgr" && current.frontRight === "vertical_cable_mgr" && current.rearLeft === "pdu" && current.rearRight === "pdu") {
    legacyVal = "front_cable_rear_pdu";
  } else if (current.frontLeft === "vertical_cable_mgr" && current.frontRight === "vertical_cable_mgr" && current.rearLeft === "pdu" && current.rearRight === "none") {
    legacyVal = "single_rear";
  } else if (pduCount >= 3) legacyVal = "quad_pdu";
  else if (pduCount === 2) legacyVal = "dual_vertical";
  else if (pduCount === 1) legacyVal = "single_vertical";
  else {
    const cableCount = Object.values(current).filter(v => v === "vertical_cable_mgr").length;
    legacyVal = cableCount > 0 ? "all_cable" : "horizontal";
  }

  localStorage.setItem(`rack_pdu_config_${rackId}`, legacyVal);
  if (parsed.hostId) {
    FacilityStore.updateHost(parsed.hostId, { pduConfig: legacyVal });
  }

  const sel = document.getElementById("rackPduConfigSelect");
  if (sel) sel.value = legacyVal;

  renderRackVisualizer();

  if (typeof showToast === "function") {
    const slotNames = {
      frontLeft: "Front Left",
      frontRight: "Front Right",
      rearLeft: "Back Left",
      rearRight: "Back Right"
    };
    const valNames = {
      none: "Open (None)",
      pdu: "0U Vertical PDU Strip",
      vertical_cable_mgr: "0U Vertical Cable Management"
    };
    showToast(`${slotNames[slotKey] || slotKey} configured as ${valNames[value] || value}`);
  }
}

function setRackVerticalChannels(channels, rackId = activeRackId) {
  if (!rackId) return;
  const merged = { ...DEFAULT_VERTICAL_CHANNELS, ...channels };
  localStorage.setItem(`rack_vertical_channels_${rackId}`, JSON.stringify(merged));

  const parsed = FacilityStore.parse(rackId);
  if (parsed.hostId) {
    FacilityStore.updateHost(parsed.hostId, { verticalChannels: merged });
  }

  const pduCount = Object.values(merged).filter(v => v === "pdu").length;
  let legacyVal = "front_cable_rear_pdu";
  if (merged.frontLeft === "vertical_cable_mgr" && merged.frontRight === "vertical_cable_mgr" && merged.rearLeft === "pdu" && merged.rearRight === "pdu") {
    legacyVal = "front_cable_rear_pdu";
  } else if (merged.frontLeft === "vertical_cable_mgr" && merged.frontRight === "vertical_cable_mgr" && merged.rearLeft === "pdu" && merged.rearRight === "none") {
    legacyVal = "single_rear";
  } else if (pduCount >= 3) legacyVal = "quad_pdu";
  else if (pduCount === 2) legacyVal = "dual_vertical";
  else if (pduCount === 1) legacyVal = "single_vertical";
  else {
    const cableCount = Object.values(merged).filter(v => v === "vertical_cable_mgr").length;
    legacyVal = cableCount > 0 ? "all_cable" : "horizontal";
  }

  localStorage.setItem(`rack_pdu_config_${rackId}`, legacyVal);
  if (parsed.hostId) {
    FacilityStore.updateHost(parsed.hostId, { pduConfig: legacyVal });
  }

  const sel = document.getElementById("rackPduConfigSelect");
  if (sel) sel.value = legacyVal;

  renderRackVisualizer();
}

function getRackPduConfig(rackIdOverride = null) {
  const targetRackId = rackIdOverride || activeRackId;
  const parsed = FacilityStore.parse(targetRackId);
  const enclosures = FacilityStore.getEnclosures();
  const activeEnc = enclosures.find(e => e.id === parsed.hostId) || enclosures.find(e => e.name.toLowerCase() === (parsed.hostName || '').toLowerCase()) || null;
  const saved = localStorage.getItem(`rack_pdu_config_${targetRackId}`);
  if (saved) return saved;
  if (activeEnc && activeEnc.pduConfig) return activeEnc.pduConfig;
  return "front_cable_rear_pdu";
}

function setRackPduConfig(val) {
  const parsed = FacilityStore.parse(activeRackId);
  localStorage.setItem(`rack_pdu_config_${activeRackId}`, val);
  if (parsed.hostId) {
    FacilityStore.updateHost(parsed.hostId, { pduConfig: val });
  }
  const sel = document.getElementById("rackPduConfigSelect");
  if (sel) sel.value = val;

  let newChannels = null;
  if (val === "front_cable_rear_pdu" || val === "front_cable_rear_pdus" || val === "dual_vertical" || val === "standard") {
    newChannels = {
      frontLeft: "vertical_cable_mgr",
      frontRight: "vertical_cable_mgr",
      rearLeft: "pdu",
      rearRight: "pdu"
    };
  } else if (val === "single_rear" || val === "single_vertical") {
    newChannels = {
      frontLeft: "vertical_cable_mgr",
      frontRight: "vertical_cable_mgr",
      rearLeft: "pdu",
      rearRight: "none"
    };
  } else if (val === "horizontal") {
    newChannels = {
      frontLeft: "vertical_cable_mgr",
      frontRight: "vertical_cable_mgr",
      rearLeft: "none",
      rearRight: "none"
    };
  } else if (val === "all_cable") {
    newChannels = {
      frontLeft: "vertical_cable_mgr",
      frontRight: "vertical_cable_mgr",
      rearLeft: "vertical_cable_mgr",
      rearRight: "vertical_cable_mgr"
    };
  } else if (val === "quad_pdu") {
    newChannels = {
      frontLeft: "pdu",
      frontRight: "pdu",
      rearLeft: "pdu",
      rearRight: "pdu"
    };
  } else if (val === "open") {
    newChannels = {
      frontLeft: "none",
      frontRight: "none",
      rearLeft: "none",
      rearRight: "none"
    };
  }

  if (newChannels) {
    localStorage.setItem(`rack_vertical_channels_${activeRackId}`, JSON.stringify(newChannels));
    if (parsed.hostId) {
      FacilityStore.updateHost(parsed.hostId, { verticalChannels: newChannels });
    }
  }

  renderRackVisualizer();
  if (typeof showToast === "function") {
    const labels = {
      front_cable_rear_pdu: "Front Cable Management / Rear PDUs",
      dual_vertical: "Front Cable Management / Rear PDUs (A+B)",
      single_vertical: "Single 0U Vertical (Feed A)",
      single_rear: "Front Cable Management / Single Rear PDU",
      horizontal: "Horizontal 1U Rackmount PDU",
      all_cable: "All 0U Vertical Cable Managers",
      quad_pdu: "Quad 0U Vertical PDUs",
      open: "Open Rails (No Verticals)"
    };
    showToast(`Vertical configuration: ${labels[val] || val}`);
  }
}
window.getRackVerticalChannels = getRackVerticalChannels;
window.setRackVerticalChannel = setRackVerticalChannel;
window.setRackVerticalChannels = setRackVerticalChannels;
window.getRackPduConfig = getRackPduConfig;
window.setRackPduConfig = setRackPduConfig;

function renderVerticalChannelHtml(slotKey, type, pduMetrics, isRear) {
  if (!type || type === "none") return "";

  const slotLabels = {
    frontLeft: "Front Left",
    frontRight: "Front Right",
    rearLeft: "Back Left",
    rearRight: "Back Right"
  };
  const slotTitle = slotLabels[slotKey] || slotKey;

  if (type === "pdu") {
    const isFeedA = (slotKey === "rearLeft" || slotKey === "frontLeft");
    const feed = isFeedA
      ? (pduMetrics ? pduMetrics.pduA : { id: "PDU-A", sku: "EMI001", vendor: "Eaton", amps: 0, maxSafeAmps: 16.0, watts: 0, pct: 0, outletsUsed: 0, totalOutlets: 24, outlets: [] })
      : (pduMetrics ? pduMetrics.pduB : { id: "PDU-B", sku: "EMI001", vendor: "Eaton", amps: 0, maxSafeAmps: 16.0, watts: 0, pct: 0, outletsUsed: 0, totalOutlets: 24, outlets: [] });
    const feedKey = isFeedA ? "PDU-A" : "PDU-B";
    const feedName = feed.fullId || (isFeedA ? (isRear ? "PDU-A" : "PDU-FL") : (isRear ? "PDU-B" : "PDU-FR"));
    const feedSubtitle = feed.upstreamShort || (isFeedA ? (isRear ? "Feed A (Util)" : "Front Feed A") : (isRear ? "Feed B (UPS)" : "Front Feed B"));
    const feedColor = isFeedA ? "text-emerald-400" : "text-sky-400";
    const barBg = feed.pct > 80 ? "bg-rose-500" : (isFeedA ? "bg-emerald-500" : "bg-sky-500");
    const totalOutlets = feed.totalOutlets || 24;
    const maxSafeAmps = feed.maxSafeAmps || 16;
    const pduSkuBadge = `${feed.vendor || "Eaton"} ${feed.sku || "EMI001"}`;
    const outletsArr = Array.isArray(feed.outlets) && feed.outlets.length > 0
      ? feed.outlets
      : Array.from({ length: totalOutlets }, (_, idx) => ({ outletNumber: idx + 1, socketType: "NEMA 5-20R", shortSocket: "5-20R", occupied: idx < (feed.outletsUsed || 0) }));

    return `
      <!-- 0U Vertical PDU Channel (${slotTitle}) -->
      <div class="w-24 sm:w-28 shrink-0 bg-slate-950 border border-slate-800 rounded-xl p-2 flex flex-col justify-between select-none shadow-md group relative">
        <div class="space-y-1 border-b border-slate-800 pb-2 text-center relative">
          <button 
            type="button" 
            onclick="event.stopPropagation(); openRackVerticalSlotPicker('${slotKey}')" 
            class="absolute top-0 right-0 p-0.5 rounded text-slate-500 hover:text-white hover:bg-slate-800 transition-colors opacity-0 group-hover:opacity-100" 
            title="Configure ${slotTitle} Slot"
          >
            <i data-lucide="settings" class="w-2.5 h-2.5"></i>
          </button>
          <button
            type="button"
            onclick="event.stopPropagation(); openRackPowerMatrixModal('${feedKey}', 1)"
            class="flex items-center justify-center gap-1 text-[10px] font-mono font-bold ${feedColor} hover:underline mx-auto cursor-pointer"
            title="Click to open Rack Power &amp; PDU Receptacle Matrix"
          >
            <i data-lucide="zap" class="w-3 h-3"></i>
            <span class="truncate">${escapeHTML(feedName)}</span>
          </button>
          <span class="px-1 py-0.2 rounded bg-indigo-950/80 border border-indigo-700/60 text-[8px] font-mono font-bold text-indigo-300 block truncate" title="${escapeHTML(feed.model || pduSkuBadge)}">${escapeHTML(pduSkuBadge)}</span>
          <span class="text-[8px] text-slate-400 uppercase font-mono block truncate" title="${escapeHTML(feedSubtitle)}">${escapeHTML(feedSubtitle)}</span>
          <span class="text-[10px] font-mono font-bold text-white block">${feed.amps}A / ${maxSafeAmps}A</span>
          <span class="text-[9px] font-mono text-slate-400 block">${feed.watts}W (${feed.pct}%)</span>
          <div class="w-full bg-slate-900 rounded-full h-1 mt-1 overflow-hidden">
            <div class="${barBg} h-1 rounded-full" style="width: ${feed.pct}%"></div>
          </div>
        </div>

        <!-- Interactive Catalog Receptacle Visualizer (R01-R${totalOutlets}) -->
        <div class="py-2 flex-1 flex flex-col justify-center">
          <div class="rack-pdu-grid">
            ${outletsArr.map(o => {
              const rNumStr = String(o.outletNumber).padStart(2, "0");
              const isOcc = Boolean(o.occupied);
              const sock = o.socketType || "NEMA 5-20R";
              const stateCls = isOcc
                ? (o.isSpof ? "spof-warn" : (isFeedA ? "occupied-a" : "occupied-b"))
                : "";
              const tip = isOcc && o.assignment
                ? `${o.assignment.pduReceptacleTag} (${sock}) ⟷ ${o.assignment.powerCordId} [${o.assignment.cordSku}] ⟷ U${o.assignment.rackSlot} ${o.assignment.devicePsuTag} (${o.assignment.deviceModel} • ${o.assignment.watts}W / ${o.assignment.amps}A) — Click to inspect in Power Matrix`
                : `${feedName}-R${rNumStr} (${sock}) — Open Receptacle on ${pduSkuBadge} — Click to assign`;
              return `
                <button
                  type="button"
                  onclick="event.stopPropagation(); openRackPowerMatrixModal('${feedKey}', ${o.outletNumber})"
                  class="rack-pdu-outlet ${stateCls}"
                  title="${escapeHTML(tip)}"
                >
                  <span>R${rNumStr}</span>
                  <span>${isOcc ? '●' : (o.isHighCurrentSocket ? '◆' : '○')}</span>
                </button>
              `;
            }).join('')}
          </div>
        </div>

        <div class="pt-2 border-t border-slate-800 text-center space-y-1">
          <span class="text-[8px] font-mono text-slate-300 font-bold block">${feed.outletsUsed}/${totalOutlets} Outlets</span>
          <button
            type="button"
            onclick="event.stopPropagation(); openRackPowerMatrixModal('${feedKey}', 1)"
            class="w-full py-0.5 px-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[8px] font-mono font-bold ${feedColor} transition-colors cursor-pointer"
          >
            Inspect PDU
          </button>
        </div>
      </div>
    `;
  }

  if (type === "vertical_cable_mgr") {
    return `
      <!-- 0U Vertical Cable Management Channel (${slotTitle}) -->
      <div class="w-20 sm:w-24 shrink-0 bg-slate-950 border border-amber-900/40 rounded-xl p-2 flex flex-col justify-between select-none shadow-md group relative">
        <div class="space-y-1 border-b border-slate-800 pb-2 text-center relative">
          <button 
            type="button" 
            onclick="event.stopPropagation(); openRackVerticalSlotPicker('${slotKey}')" 
            class="absolute top-0 right-0 p-0.5 rounded text-slate-500 hover:text-white hover:bg-slate-800 transition-colors opacity-0 group-hover:opacity-100" 
            title="Configure ${slotTitle} Slot"
          >
            <i data-lucide="settings" class="w-2.5 h-2.5"></i>
          </button>
          <div class="flex items-center justify-center gap-1 text-[11px] font-bold text-amber-400">
            <i data-lucide="align-justify" class="w-3 h-3"></i> 0U CABLE MGR
          </div>
          <span class="text-[8.5px] text-amber-300/80 uppercase font-mono block">${slotTitle}</span>
          <span class="text-[8px] text-slate-500 uppercase font-mono block">Finger Duct &amp; Rings</span>
          <span class="px-1.5 py-0.2 rounded bg-amber-950/80 border border-amber-700/60 text-[8px] font-mono font-bold text-amber-300 inline-block mt-0.5">PASS-THROUGH</span>
        </div>

        <!-- Vertical Finger Duct Routing Slots -->
        <div class="py-2 space-y-1.5 flex-1 flex flex-col justify-around">
          ${Array.from({ length: 12 }, (_, dIdx) => `
            <div class="flex items-center justify-between px-1 py-1 rounded bg-slate-900/90 border-l-2 border-r-2 border-amber-500/50 border-t border-b border-slate-800 text-[8px] font-mono shadow-inner" title="Duct Finger Gate ${dIdx + 1}">
              <span class="w-2 h-0.5 bg-sky-500/80 rounded inline-block" title="Cat6A Bundle Line"></span>
              <span class="text-amber-400/70 font-mono text-[7px]">◄──►</span>
              <span class="w-2 h-0.5 bg-indigo-500/80 rounded inline-block" title="Fiber / Patch Line"></span>
            </div>
          `).join('')}
        </div>

        <div class="pt-2 border-t border-slate-800 text-center">
          <span class="text-[8px] font-mono text-amber-300/80 block">Toolless Zero-U</span>
          <span class="text-[7.5px] font-mono text-slate-500 block">Slack Retention</span>
        </div>
      </div>
    `;
  }

  return "";
}

function toggleRackVerticalChannelsModal(initialFocusSlot = null) {
  let modal = document.getElementById("rackVerticalChannelsModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "rackVerticalChannelsModal";
    modal.className = "fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 transition-all";
    document.body.appendChild(modal);
  }

  if (modal.classList.contains("hidden")) {
    modal.classList.remove("hidden");
  }

  const channels = getRackVerticalChannels();

  modal.innerHTML = `
    <div class="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
      <!-- Modal Header -->
      <div class="flex items-center justify-between border-b border-slate-800 pb-3">
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <i data-lucide="columns-3" class="w-5 h-5"></i>
          </div>
          <div>
            <h3 class="text-base font-bold text-white flex items-center gap-2">
              Rack Vertical Zero-U Channels
              <span class="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 text-[10px] font-mono">4-Corner Layout</span>
            </h3>
            <p class="text-xs text-slate-400">Configure PDUs or Vertical Cable Managers independently in each corner</p>
          </div>
        </div>
        <button onclick="closeRackVerticalChannelsModal()" class="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>
      </div>

      <!-- Quick Presets -->
      <div class="flex items-center gap-2 flex-wrap text-xs">
        <span class="text-slate-400 font-mono text-[11px]">Presets:</span>
        <button onclick="applyRackVerticalPreset('front_cable_rear_pdu')" class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white font-semibold transition-all flex items-center gap-1" title="Front Left &amp; Right: 0U Cable Managers; Rear Left &amp; Right: 0U PDUs">
          <i data-lucide="check-circle" class="w-3.5 h-3.5 text-indigo-400"></i> Front Cable Management / Rear PDUs
        </button>
        <button onclick="applyRackVerticalPreset('single_rear')" class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white font-semibold transition-all flex items-center gap-1">
          <i data-lucide="zap" class="w-3.5 h-3.5 text-emerald-400"></i> Single Rear PDU
        </button>
        <button onclick="applyRackVerticalPreset('all_cable')" class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white font-semibold transition-all flex items-center gap-1">
          <i data-lucide="align-justify" class="w-3.5 h-3.5 text-amber-400"></i> All Cable Mgrs
        </button>
        <button onclick="applyRackVerticalPreset('quad_pdu')" class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white font-semibold transition-all flex items-center gap-1">
          <i data-lucide="zap" class="w-3.5 h-3.5 text-sky-400"></i> Quad PDUs
        </button>
        <button onclick="applyRackVerticalPreset('open')" class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-semibold transition-all">
          Open Rails
        </button>
      </div>

      <!-- 4-Corner Grid: Top = FRONT VIEW, Bottom = REAR VIEW -->
      <div class="space-y-4">
        <!-- Front Section -->
        <div class="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
          <div class="flex items-center gap-2 mb-2.5">
            <span class="px-2 py-0.5 rounded bg-brand-900/60 text-brand-300 font-mono text-[10px] font-bold border border-brand-500/40">FRONT VIEW ELEVATION</span>
            <span class="text-xs text-slate-400">Channels visible in Front View</span>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            ${renderSlotSelectorCard("frontLeft", "Front Left Corner", channels.frontLeft, initialFocusSlot)}
            ${renderSlotSelectorCard("frontRight", "Front Right Corner", channels.frontRight, initialFocusSlot)}
          </div>
        </div>

        <!-- Rear Section -->
        <div class="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
          <div class="flex items-center gap-2 mb-2.5">
            <span class="px-2 py-0.5 rounded bg-purple-900/60 text-purple-300 font-mono text-[10px] font-bold border border-purple-500/40">REAR VIEW ELEVATION</span>
            <span class="text-xs text-slate-400">Channels visible in Rear View (PDUs / Power Feeds / Cable Duct)</span>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            ${renderSlotSelectorCard("rearLeft", "Back Left Corner (Feed A)", channels.rearLeft, initialFocusSlot)}
            ${renderSlotSelectorCard("rearRight", "Back Right Corner (Feed B)", channels.rearRight, initialFocusSlot)}
          </div>
        </div>
      </div>

      <!-- Footer Actions -->
      <div class="flex items-center justify-between border-t border-slate-800 pt-3">
        <div class="text-xs text-slate-400 font-mono">
          Changes update live and persist with active enclosure.
        </div>
        <button onclick="closeRackVerticalChannelsModal()" class="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow transition-colors cursor-pointer">
          Done
        </button>
      </div>
    </div>
  `;

  if (window.lucide) lucide.createIcons();
}

function renderSlotSelectorCard(slotKey, label, currentValue, focusKey) {
  const isFocused = slotKey === focusKey;
  const isPdu = currentValue === "pdu";
  const isCable = currentValue === "vertical_cable_mgr";

  return `
    <div class="p-2.5 rounded-lg bg-slate-900 border ${isFocused ? 'border-indigo-500 ring-2 ring-indigo-500/30' : 'border-slate-800'} space-y-2">
      <div class="flex items-center justify-between">
        <span class="text-xs font-bold text-white flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full ${isPdu ? 'bg-emerald-400' : (isCable ? 'bg-amber-400' : 'bg-slate-600')}"></span>
          ${label}
        </span>
        <span class="text-[10px] font-mono px-1.5 py-0.2 rounded ${isPdu ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : (isCable ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-slate-800 text-slate-400')}">
          ${isPdu ? '0U PDU' : (isCable ? 'CABLE MGR' : 'OPEN')}
        </span>
      </div>
      <select 
        id="verticalSlotSelect_${slotKey}"
        onchange="handleSlotSelectChange('${slotKey}', this.value)" 
        class="w-full bg-slate-950 border border-slate-700 text-white text-xs rounded-lg px-2.5 py-1.5 font-mono focus:border-indigo-500 focus:outline-none cursor-pointer"
      >
        <option value="vertical_cable_mgr" ${currentValue === "vertical_cable_mgr" ? "selected" : ""}>0U Vertical Cable Management (Finger Duct)</option>
        <option value="pdu" ${currentValue === "pdu" ? "selected" : ""}>0U Vertical PDU Strip (24-Receptacle)</option>
        <option value="none" ${currentValue === "none" ? "selected" : ""}>None (Open / No Vertical Channel)</option>
      </select>
    </div>
  `;
}

function handleSlotSelectChange(slotKey, val) {
  setRackVerticalChannel(slotKey, val);
  toggleRackVerticalChannelsModal(slotKey);
}

function closeRackVerticalChannelsModal() {
  const modal = document.getElementById("rackVerticalChannelsModal");
  if (modal) modal.classList.add("hidden");
}

function openRackVerticalSlotPicker(slotKey) {
  toggleRackVerticalChannelsModal(slotKey);
}

function applyRackVerticalPreset(preset) {
  if (preset === "front_cable_rear_pdu" || preset === "front_cable_rear_pdus" || preset === "standard") {
    setRackVerticalChannels({
      frontLeft: "vertical_cable_mgr",
      frontRight: "vertical_cable_mgr",
      rearLeft: "pdu",
      rearRight: "pdu"
    });
  } else if (preset === "single_rear" || preset === "single_vertical") {
    setRackVerticalChannels({
      frontLeft: "vertical_cable_mgr",
      frontRight: "vertical_cable_mgr",
      rearLeft: "pdu",
      rearRight: "none"
    });
  } else if (preset === "all_cable") {
    setRackVerticalChannels({
      frontLeft: "vertical_cable_mgr",
      frontRight: "vertical_cable_mgr",
      rearLeft: "vertical_cable_mgr",
      rearRight: "vertical_cable_mgr"
    });
  } else if (preset === "quad_pdu") {
    setRackVerticalChannels({
      frontLeft: "pdu",
      frontRight: "pdu",
      rearLeft: "pdu",
      rearRight: "pdu"
    });
  } else if (preset === "open") {
    setRackVerticalChannels({
      frontLeft: "none",
      frontRight: "none",
      rearLeft: "none",
      rearRight: "none"
    });
  }
  toggleRackVerticalChannelsModal();
}
window.toggleRackVerticalChannelsModal = toggleRackVerticalChannelsModal;
window.closeRackVerticalChannelsModal = closeRackVerticalChannelsModal;
window.openRackVerticalSlotPicker = openRackVerticalSlotPicker;
window.applyRackVerticalPreset = applyRackVerticalPreset;


function getPsuBtnClass(feed, pduConfig) {
  if (pduConfig === "horizontal") {
    if (feed === "PDU-A" || feed === "PDU-Main") return "bg-indigo-950/80 border-indigo-500/70 text-indigo-300 hover:border-indigo-400";
    return "bg-slate-900 border-slate-700 text-slate-500 hover:text-slate-300";
  }
  if (feed === "PDU-A") return "bg-emerald-950/80 border-emerald-500/70 text-emerald-300 hover:border-emerald-400";
  if (feed === "PDU-B") return "bg-sky-950/80 border-sky-500/70 text-sky-300 hover:border-sky-400";
  return "bg-slate-900 border-slate-700 text-slate-500 hover:text-slate-300";
}

function getDevicePsuSpecs(item) {
  if (!item) return { psuCount: 1, isDualModular: false, inletType: "C14", cordType: "C13-to-C14", stackUnits: 1 };
  const role = item.role || "";
  const model = (item.model || "").toLowerCase();
  const cat = (item.category || "").toLowerCase();
  const stackUnits = (item.stackedUnits && item.stackedUnits >= 2) ? item.stackedUnits : 1;

  let psuCount = 1;
  let isDualModular = false;

  if (stackUnits > 1) {
    psuCount = stackUnits;
    isDualModular = true;
  } else if (
    role === "Core" || 
    role === "Aggregation" || 
    role === "Server" || 
    role.includes("Storage") ||
    cat.includes("server") ||
    cat.includes("san") ||
    model.includes("catalyst") ||
    model.includes("nexus") ||
    model.includes("aruba-cx") ||
    model.includes("ex4") ||
    model.includes("x530") ||
    model.includes("redundant") ||
    model.includes("dual") ||
    (role === "Firewall" && !model.includes("40f") && !model.includes("60f"))
  ) {
    psuCount = 2;
    isDualModular = true;
  }

  if (item.tertiaryPsuSku) {
    psuCount = Math.max(psuCount, 3 * stackUnits);
    isDualModular = true;
  } else if (item.hasRedundantPsu || item.secondaryPsuSku) {
    psuCount = Math.max(psuCount, 2 * stackUnits);
    isDualModular = true;
  }

  const baseW = parseFloat(item.baseWatts) || 0;
  const has1900W = /1900w/i.test(item.primaryPsuSku || "") || /1900w/i.test(item.secondaryPsuSku || "") || /1900w/i.test(item.tertiaryPsuSku || "");
  const inletType = has1900W ? "C22/C21 (16A/20A)" : ((baseW > 1200) ? "C20 (16A/20A)" : "C14 (10A/15A)");
  const cordType = has1900W ? "C21-to-C20" : (inletType.startsWith("C20") ? "C19-to-C20" : "C13-to-C14");

  return {
    psuCount,
    isDualModular,
    inletType,
    cordType,
    stackUnits
  };
}

function isMountedUpsUnit(item) {
  if (!item) return false;
  if (item.isEbp || item.isPdu) return false;
  const role = (item.role || "").toLowerCase();
  const cat = (item.category || "").toLowerCase();
  const model = (item.model || "").toLowerCase();
  const sku = (item.sku || "").toLowerCase();
  if (model.includes("battery pack") || sku.startsWith("bp") || sku.includes("ebp")) return false;
  return role === "ups" || cat.includes("ups") || model.includes("smart-ups") || /\bups\b/i.test(model);
}

function isPoweredRackEquipment(item) {
  if (!item || !item.rackSlot) return false;
  if (isPassiveInfrastructure(item)) return false;
  if (item.isEbp || item.isPdu) return false;
  const model = (item.model || "").toLowerCase();
  const sku = (item.sku || "").toLowerCase();
  if (model.includes("battery pack") || sku.startsWith("bp") || sku.includes("ebp")) return false;
  if (isMountedUpsUnit(item)) return false; // UPS units feed the PDUs upstream rather than plugging into PDU outlets
  return true;
}

function getDeviceShortPowerTag(item, peerItems) {
  if (!item) return "DEV01";
  if (typeof PortEngine !== "undefined" && typeof PortEngine.resolveSwitchPatchMapping === "function" && (isStackableSwitch(item) || isFirewallDevice(item))) {
    const pm = PortEngine.resolveSwitchPatchMapping(item);
    if (pm && pm.switchCode) return pm.switchCode;
  }
  if (item.deviceNumber) {
    return String(item.deviceNumber).replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  }
  const role = (item.role || "").toLowerCase();
  const cat = (item.category || "").toLowerCase();
  let prefix = "DEV";
  if (isFirewallDevice(item)) prefix = "FW";
  else if (isStackableSwitch(item)) prefix = "SW";
  else if (role.includes("nvr") || (item.model || "").toLowerCase().includes("nvr")) prefix = "NVR";
  else if (role.includes("server") || cat.includes("server") || role.includes("storage")) prefix = "SRV";
  else if (isMountedUpsUnit(item)) prefix = "UPS";

  const sameGroup = (peerItems || []).filter(p => {
    if (prefix === "FW") return isFirewallDevice(p);
    if (prefix === "SW") return isStackableSwitch(p);
    if (prefix === "UPS") return isMountedUpsUnit(p);
    return !isFirewallDevice(p) && !isStackableSwitch(p) && !isMountedUpsUnit(p);
  });
  const idx = Math.max(0, sameGroup.findIndex(p => p.instanceId === item.instanceId));
  return `${prefix}${String(idx + 1).padStart(2, "0")}`;
}

function getDevicePowerConnections(item) {
  if (!item) return { psu1: "PDU-A" };
  const specs = getDevicePsuSpecs(item);
  if (!item.powerConnections || typeof item.powerConnections !== "object") {
    item.powerConnections = {};
  }
  if (!item.powerConnections.psu1) {
    item.powerConnections.psu1 = "PDU-A";
  }
  if (specs.psuCount >= 2 && !item.powerConnections.psu2) {
    item.powerConnections.psu2 = "PDU-B";
  }
  for (let p = 3; p <= specs.psuCount; p++) {
    const k = `psu${p}`;
    if (!item.powerConnections[k]) {
      item.powerConnections[k] = (p % 2 === 1) ? "PDU-A" : "PDU-B";
    }
  }
  return item.powerConnections;
}

function toggleDevicePsuFeed(instanceId, psuNum) {
  if (typeof projectBOM === "undefined") return;
  const item = projectBOM.find(i => i.instanceId === instanceId);
  if (!item) return;

  const pduConfig = getRackPduConfig();
  const conns = getDevicePowerConnections(item);
  const key = `psu${psuNum}`;
  const current = conns[key] || (psuNum === 1 ? "PDU-A" : "PDU-B");

  let next = "PDU-A";
  if (pduConfig === "single_vertical" || pduConfig === "horizontal") {
    next = (current === "PDU-A" || current === "PDU-Main") ? "None" : "PDU-A";
  } else {
    if (current === "PDU-A") next = "PDU-B";
    else if (current === "PDU-B") next = "None";
    else next = "PDU-A";
  }

  item.powerConnections[key] = next;
  FacilityStore.notifyWorkspaceChange();
  renderRackVisualizer();
  if (document.getElementById("rackPowerMatrixModal") && !document.getElementById("rackPowerMatrixModal").classList.contains("hidden")) {
    renderRackPowerMatrixModalContent();
  }
}
window.toggleDevicePsuFeed = toggleDevicePsuFeed;

function setDevicePsuFeedDirect(instanceId, psuNum, feedVal) {
  if (typeof projectBOM === "undefined") return;
  const item = projectBOM.find(i => i.instanceId === instanceId);
  if (!item) return;
  const conns = getDevicePowerConnections(item);
  conns[`psu${psuNum}`] = feedVal;
  FacilityStore.notifyWorkspaceChange();
  renderRackVisualizer();
  if (document.getElementById("rackPowerMatrixModal") && !document.getElementById("rackPowerMatrixModal").classList.contains("hidden")) {
    renderRackPowerMatrixModalContent();
  }
}
window.setDevicePsuFeedDirect = setDevicePsuFeedDirect;

function setDevicePsuOutlet(instanceId, psuNum, targetOutletNumber) {
  if (typeof projectBOM === "undefined") return;
  const item = projectBOM.find(i => i.instanceId === instanceId);
  if (!item) return;
  const outletInt = parseInt(targetOutletNumber, 10);
  if (!outletInt || outletInt < 1) return;

  if (!item.powerOutlets || typeof item.powerOutlets !== "object") {
    item.powerOutlets = {};
  }
  const conns = getDevicePowerConnections(item);
  const feed = conns[`psu${psuNum}`] || "PDU-A";

  // Check if another device PSU in the same rack & feed is currently using that outlet, and clear/swap it
  const prevOutlet = item.powerOutlets[`psu${psuNum}`] || null;
  projectBOM.forEach(other => {
    if (FacilityStore.normalize(other.closetName || other.rackId) !== activeRackId) return;
    if (!other.powerOutlets || !other.powerConnections) return;
    Object.keys(other.powerOutlets).forEach(pKey => {
      if (other.instanceId === instanceId && pKey === `psu${psuNum}`) return;
      if (other.powerConnections[pKey] === feed && parseInt(other.powerOutlets[pKey], 10) === outletInt) {
        if (prevOutlet) {
          other.powerOutlets[pKey] = prevOutlet;
        } else {
          delete other.powerOutlets[pKey];
        }
      }
    });
  });

  item.powerOutlets[`psu${psuNum}`] = outletInt;
  window._rackPowerMatrixSelected = { pduKey: feed === "PDU-B" ? "PDU-B" : "PDU-A", outletNumber: outletInt };
  FacilityStore.notifyWorkspaceChange();
  renderRackVisualizer();
  if (document.getElementById("rackPowerMatrixModal") && !document.getElementById("rackPowerMatrixModal").classList.contains("hidden")) {
    renderRackPowerMatrixModalContent();
  }
}
window.setDevicePsuOutlet = setDevicePsuOutlet;

function getCatalogPdusList() {
  let list = [];
  if (typeof CatalogRegistry !== "undefined" && CatalogRegistry.infrastructure && Array.isArray(CatalogRegistry.infrastructure.pdus)) {
    list = CatalogRegistry.infrastructure.pdus.filter(p => p && (p.isPdu || p.category === "pdus" || p.type === "pdu"));
  }
  if (list.length === 0 && typeof ACCESSORY_DATABASE !== "undefined" && Array.isArray(ACCESSORY_DATABASE)) {
    list = ACCESSORY_DATABASE.filter(p => p && (p.isPdu || p.category === "pdus" || p.type === "pdu"));
  }
  return list;
}
window.getCatalogPdusList = getCatalogPdusList;

function getCatalogPowerCordsList() {
  let list = [];
  if (typeof CatalogRegistry !== "undefined" && CatalogRegistry.infrastructure && Array.isArray(CatalogRegistry.infrastructure.power_cords)) {
    list = CatalogRegistry.infrastructure.power_cords;
  }
  if (list.length === 0 && typeof ACCESSORY_DATABASE !== "undefined" && Array.isArray(ACCESSORY_DATABASE)) {
    list = ACCESSORY_DATABASE.filter(c => c && (c.category === "power_cords" || c.type === "power_cord"));
  }
  return list;
}
window.getCatalogPowerCordsList = getCatalogPowerCordsList;

function shortSocketLabel(socketType) {
  const s = String(socketType || "NEMA 5-20R").toUpperCase();
  if (s.includes("L5-20R")) return "L5-20R";
  if (s.includes("L6-20R")) return "L6-20R";
  if (s.includes("L6-30R")) return "L6-30R";
  if (s.includes("5-15/20R")) return "5-15/20R";
  if (s.includes("5-20R")) return "5-20R";
  if (s.includes("5-15R")) return "5-15R";
  if (s.includes("C19")) return "IEC C19";
  if (s.includes("C13")) return "IEC C13";
  if (s.includes("USB")) return "USB-C";
  return socketType || "5-20R";
}

function resolveRackCatalogPdus(assignedItems, activeEnc, pduConfig, rackIdOverride = null) {
  const targetRackId = rackIdOverride || activeRackId;
  const allPdus = getCatalogPdusList();
  const isHoriz = (pduConfig === "horizontal");
  const defaultZeroU = allPdus.find(p => p.sku === "EMI001") || allPdus.find(p => (p.rackUnits || 0) === 0) || null;
  const defaultHoriz = allPdus.find(p => p.sku === "PDUMH20NET2") || allPdus.find(p => (p.rackUnits || 0) >= 1) || null;

  // Check if any PDU items are already in projectBOM for this rack
  const bomPdus = (assignedItems || []).filter(it => it && (it.isPdu || it.category === "pdus" || it.type === "pdu"));
  const matchingBomPdus = bomPdus.filter(it => isHoriz ? (parseInt(it.rackUnits, 10) || 0) >= 1 : (parseInt(it.rackUnits, 10) || 0) === 0);

  const savedSkuA = (activeEnc && (isHoriz ? activeEnc.pduHorizSku : activeEnc.pduASku))
    || localStorage.getItem(`rack_pdu_sku_${isHoriz ? 'horiz' : 'a'}_${targetRackId}`)
    || (matchingBomPdus[0] && matchingBomPdus[0].sku)
    || (bomPdus[0] && bomPdus[0].sku)
    || null;

  const savedSkuB = (activeEnc && activeEnc.pduBSku)
    || localStorage.getItem(`rack_pdu_sku_b_${targetRackId}`)
    || (matchingBomPdus[1] ? matchingBomPdus[1].sku : (matchingBomPdus[0] && matchingBomPdus[0].sku))
    || savedSkuA
    || null;

  let pduADef = savedSkuA ? allPdus.find(p => p.sku.toLowerCase() === String(savedSkuA).toLowerCase()) : null;
  if (!pduADef || (isHoriz && (pduADef.rackUnits || 0) === 0) || (!isHoriz && (pduADef.rackUnits || 0) >= 1)) {
    pduADef = isHoriz ? defaultHoriz : defaultZeroU;
  }

  let pduBDef = savedSkuB ? allPdus.find(p => p.sku.toLowerCase() === String(savedSkuB).toLowerCase()) : null;
  if (!pduBDef || (pduBDef.rackUnits || 0) >= 1) {
    pduBDef = pduADef && (pduADef.rackUnits || 0) === 0 ? pduADef : defaultZeroU;
  }

  return { pduADef, pduBDef, bomPdus };
}

function buildPduSpecFromCatalog(pduDef, pduFullId, pduCode) {
  const fallback = {
    sku: "EMI001",
    vendor: "Eaton",
    model: "Eaton ePDU G3 Metered Input 0U Vertical (120V 20A 1.92kW)",
    rackUnits: 0,
    msrp: 849,
    inputVoltage: 120,
    outputVoltage: 120,
    inputCircuitAmps: 20,
    powerWatts: 1920,
    inputConnector: "5-20P",
    plugType: "NEMA 5-20P (120V 20A)",
    receptacles: "24x NEMA 5-20R",
    outletsCount: 24,
    pduType: "Metered Input",
    receptacleBreakdown: [{ type: "NEMA 5-20R", count: 24 }]
  };
  const d = pduDef || fallback;
  const voltage = parseInt(d.outputVoltage || d.inputVoltage, 10) || 120;
  const inputVoltage = parseInt(d.inputVoltage || voltage, 10) || 120;
  const circuitBreakerAmps = parseInt(d.inputCircuitAmps, 10) || 20;
  const maxSafeAmps = parseFloat((circuitBreakerAmps * 0.8).toFixed(1));
  const maxSafeWatts = parseInt(d.powerWatts || d.maxCapacityWatts, 10) || Math.round(voltage * maxSafeAmps);

  // Build individual outlet socket types from receptacleBreakdown (excluding USB-C auxiliary ports unless needed)
  const breakdown = Array.isArray(d.receptacleBreakdown) && d.receptacleBreakdown.length > 0
    ? d.receptacleBreakdown.filter(b => !String(b.type || "").toUpperCase().includes("USB"))
    : [{ type: d.receptacles || "NEMA 5-20R", count: parseInt(d.outletsCount || d.portCount, 10) || 24 }];

  const socketTypesList = [];
  breakdown.forEach(group => {
    const cnt = parseInt(group.count, 10) || 0;
    for (let i = 0; i < cnt; i++) {
      socketTypesList.push(group.type || "NEMA 5-20R");
    }
  });
  const totalOutlets = socketTypesList.length || parseInt(d.outletsCount || d.portCount, 10) || 24;
  while (socketTypesList.length < totalOutlets) {
    socketTypesList.push("NEMA 5-20R");
  }

  const outlets = Array.from({ length: totalOutlets }, (_, idx) => {
    const rawSocket = socketTypesList[idx] || "NEMA 5-20R";
    const shortSocket = shortSocketLabel(rawSocket);
    return {
      outletNumber: idx + 1,
      outletCode: `R${String(idx + 1).padStart(2, "0")}`,
      receptacleTag: `${pduFullId}-R${String(idx + 1).padStart(2, "0")}`,
      shortTag: `${pduCode}-R${String(idx + 1).padStart(2, "0")}`,
      socketType: rawSocket,
      shortSocket,
      isHighCurrentSocket: shortSocket.includes("C19") || shortSocket.includes("L5-20R"),
      occupied: false,
      isSpof: false,
      assignment: null
    };
  });

  return {
    sku: d.sku || "EMI001",
    id: d.id || "eaton-emi001",
    vendor: d.vendor || "Eaton",
    model: d.model || d.name || "Rack PDU",
    rackUnits: parseInt(d.rackUnits, 10) || 0,
    msrp: parseFloat(d.msrp) || 849,
    weightLbs: parseFloat(d.weightLbs) || 12.0,
    depthInches: parseFloat(d.depthInches) || 2.1,
    pduType: d.pduType || d.networkType || "Metered",
    isNetworked: Boolean(d.isNetworked),
    inputVoltage,
    outputVoltage: voltage,
    circuitBreakerAmps,
    maxSafeAmps,
    maxSafeWatts,
    inputConnector: d.inputConnector || "5-20P",
    plugType: d.plugType || `${d.inputConnector || "5-20P"} (${inputVoltage}V ${circuitBreakerAmps}A)`,
    receptaclesSummary: d.receptacles || `${totalOutlets}x NEMA 5-20R`,
    receptacleBreakdown: breakdown,
    totalOutlets,
    outlets
  };
}

function resolveCatalogPowerCord(deviceInletType, outletSocketType, isFeedA, pduVendor) {
  const cords = getCatalogPowerCordsList();
  const inlet = String(deviceInletType || "IEC C14").toUpperCase();
  const socket = String(outletSocketType || "NEMA 5-20R").toUpperCase();
  const colorTarget = isFeedA ? "Black" : "Blue";

  let targetSku = "P006-006";
  if (socket.includes("C19")) {
    if (inlet.includes("C20")) {
      targetSku = isFeedA ? "P005-006" : "P005-006-BLU";
    } else {
      targetSku = "P094-006"; // C20-to-C13 adapter cord
    }
  } else if (socket.includes("C13")) {
    if (inlet.includes("C15")) {
      targetSku = isFeedA ? "P018-006-BLK" : "P018-006-BLU";
    } else if (String(pduVendor || "").toUpperCase().includes("APC")) {
      targetSku = isFeedA ? "PLC13-006-BLK" : "PLC13-006-BLU";
    } else {
      targetSku = isFeedA ? "P004-006" : "P004-006-BLU";
    }
  } else if (socket.includes("L5-20R")) {
    targetSku = "P040-010"; // L5-20P to C19
  } else {
    // NEMA 5-15R or 5-20R or 5-15/20R
    if (inlet.includes("C20")) {
      targetSku = "P049-006"; // 5-20P to C19
    } else if (inlet.includes("C15")) {
      targetSku = "P019-006"; // 5-15P to C15 High-Temp
    } else {
      targetSku = isFeedA ? "P006-006" : "P006-006-BLU"; // 5-15P to C13
    }
  }

  const found = cords.find(c => c.sku === targetSku);
  if (found) {
    return {
      cordSku: found.sku,
      cordId: found.id,
      cordVendor: found.vendor || "Tripp Lite",
      cordModel: found.model || found.name,
      cordColor: found.color || colorTarget,
      cordLengthFt: found.lengthFt || 6,
      cordGauge: found.gauge || "14 AWG",
      plugToConnector: `${found.inputConnector || found.plugType} ➔ ${found.outputConnector || deviceInletType}`,
      cordSpec: `${found.sku} • ${found.lengthFt || 6}ft ${found.gauge || '16 AWG'} ${found.plugType} (${found.color || colorTarget})`,
      msrp: found.msrp || 9.5
    };
  }

  return {
    cordSku: targetSku,
    cordId: targetSku.toLowerCase(),
    cordVendor: "Tripp Lite",
    cordModel: `6ft ${socket} to ${deviceInletType} Power Cord (${colorTarget})`,
    cordColor: colorTarget,
    cordLengthFt: 6,
    cordGauge: "14 AWG",
    plugToConnector: `${shortSocketLabel(outletSocketType)} ➔ ${deviceInletType}`,
    cordSpec: `${targetSku} • 6ft 14 AWG (${colorTarget})`,
    msrp: 9.5
  };
}

function setRackPduCatalogSku(feedTarget, newSku) {
  if (!newSku) return;
  const pduConfig = getRackPduConfig();
  const isHoriz = (pduConfig === "horizontal");
  const parsed = FacilityStore.parse(activeRackId);

  if (isHoriz) {
    localStorage.setItem(`rack_pdu_sku_horiz_${activeRackId}`, newSku);
    if (parsed && parsed.hostId) {
      FacilityStore.updateHost(parsed.hostId, { pduHorizSku: newSku });
    }
  } else if (feedTarget === "PDU-A") {
    localStorage.setItem(`rack_pdu_sku_a_${activeRackId}`, newSku);
    if (parsed && parsed.hostId) {
      FacilityStore.updateHost(parsed.hostId, { pduASku: newSku });
    }
  } else if (feedTarget === "PDU-B") {
    localStorage.setItem(`rack_pdu_sku_b_${activeRackId}`, newSku);
    if (parsed && parsed.hostId) {
      FacilityStore.updateHost(parsed.hostId, { pduBSku: newSku });
    }
  } else {
    localStorage.setItem(`rack_pdu_sku_a_${activeRackId}`, newSku);
    localStorage.setItem(`rack_pdu_sku_b_${activeRackId}`, newSku);
    if (parsed && parsed.hostId) {
      FacilityStore.updateHost(parsed.hostId, { pduASku: newSku, pduBSku: newSku });
    }
  }

  FacilityStore.notifyWorkspaceChange();
  renderRackVisualizer();
  if (document.getElementById("rackPowerMatrixModal") && !document.getElementById("rackPowerMatrixModal").classList.contains("hidden")) {
    renderRackPowerMatrixModalContent();
  }
  const pduObj = getCatalogPdusList().find(p => p.sku === newSku);
  if (typeof showToast === "function" && pduObj) {
    showToast(`Updated ${feedTarget === 'BOTH' ? 'Rack PDUs (A+B)' : feedTarget} to ${pduObj.vendor} ${pduObj.sku} (${pduObj.outletsCount} outlets, ${pduObj.inputVoltage}V/${pduObj.inputCircuitAmps}A)`);
  }
}
window.setRackPduCatalogSku = setRackPduCatalogSku;

function syncRackPdusAndCordsToBom() {
  if (typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) return;
  const metrics = window._lastRackPduMetrics;
  if (!metrics) return;

  const hostNorm = FacilityStore.normalize(activeRackId);
  const isSingleFeedMode = (metrics.pduConfig === "single_vertical" || metrics.pduConfig === "horizontal");

  // Remove existing PDU and power_cord items for this rack
  for (let i = projectBOM.length - 1; i >= 0; i--) {
    const it = projectBOM[i];
    const itNorm = FacilityStore.normalize(it.closetName || it.location || it.rackId);
    if (itNorm === hostNorm && (it.isPdu || it.category === "pdus" || it.type === "pdu" || it.category === "power_cords" || it.type === "power_cord")) {
      projectBOM.splice(i, 1);
    }
  }

  const allPdus = getCatalogPdusList();
  const pduADef = allPdus.find(p => p.sku === metrics.pduA.sku);
  const pduBDef = !isSingleFeedMode ? allPdus.find(p => p.sku === metrics.pduB.sku) : null;

  const addedSummary = [];

  if (pduADef) {
    const sameSkuDual = (!isSingleFeedMode && pduBDef && pduBDef.sku === pduADef.sku);
    const pduQty = sameSkuDual ? 2 : 1;
    projectBOM.push({
      instanceId: `inst-pdu-a-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      id: pduADef.id || pduADef.sku,
      sku: pduADef.sku,
      model: pduADef.model || pduADef.name,
      name: pduADef.name || pduADef.model,
      vendor: pduADef.vendor || "Eaton",
      category: "pdus",
      type: "pdu",
      role: "PDU",
      isPdu: true,
      rackUnits: pduADef.rackUnits || 0,
      rackSlot: null,
      closetName: activeRackId,
      location: activeRackId,
      rackId: activeRackId,
      msrp: pduADef.msrp || 849,
      qty: pduQty,
      baseWatts: pduADef.baseWatts || 10,
      powerWatts: pduADef.powerWatts || 1920,
      weightLbs: pduADef.weightLbs || 12.0,
      receptacles: pduADef.receptacles,
      inputConnector: pduADef.inputConnector
    });
    addedSummary.push(`${pduQty}x ${pduADef.sku}`);

    if (!isSingleFeedMode && pduBDef && !sameSkuDual) {
      projectBOM.push({
        instanceId: `inst-pdu-b-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        id: pduBDef.id || pduBDef.sku,
        sku: pduBDef.sku,
        model: pduBDef.model || pduBDef.name,
        name: pduBDef.name || pduBDef.model,
        vendor: pduBDef.vendor || "Eaton",
        category: "pdus",
        type: "pdu",
        role: "PDU",
        isPdu: true,
        rackUnits: pduBDef.rackUnits || 0,
        rackSlot: null,
        closetName: activeRackId,
        location: activeRackId,
        rackId: activeRackId,
        msrp: pduBDef.msrp || 849,
        qty: 1,
        baseWatts: pduBDef.baseWatts || 10,
        powerWatts: pduBDef.powerWatts || 1920,
        weightLbs: pduBDef.weightLbs || 12.0,
        receptacles: pduBDef.receptacles,
        inputConnector: pduBDef.inputConnector
      });
      addedSummary.push(`1x ${pduBDef.sku}`);
    }
  }

  // Aggregate active power cords by catalog SKU
  const allCords = getCatalogPowerCordsList();
  const cordCounts = {};
  (metrics.powerCords || []).forEach(c => {
    if (!c.cordSku) return;
    cordCounts[c.cordSku] = (cordCounts[c.cordSku] || 0) + 1;
  });

  Object.keys(cordCounts).forEach(cSku => {
    const qty = cordCounts[cSku];
    const cordDef = allCords.find(c => c.sku === cSku);
    if (cordDef && qty > 0) {
      projectBOM.push({
        instanceId: `inst-pwrcord-${cSku}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        id: cordDef.id || cordDef.sku,
        sku: cordDef.sku,
        model: cordDef.model || cordDef.name,
        name: cordDef.name || cordDef.model,
        vendor: cordDef.vendor || "Tripp Lite",
        category: "power_cords",
        type: "power_cord",
        role: "Power Cord",
        isPdu: false,
        rackUnits: 0,
        rackSlot: null,
        closetName: activeRackId,
        location: activeRackId,
        rackId: activeRackId,
        msrp: cordDef.msrp || 9.5,
        qty,
        baseWatts: 0,
        powerWatts: 0,
        weightLbs: cordDef.weightLbs || 0.65
      });
      addedSummary.push(`${qty}x ${cordDef.sku}`);
    }
  });

  FacilityStore.notifyWorkspaceChange();
  renderRackVisualizer();
  if (typeof updateBOMView === "function") updateBOMView();
  if (typeof renderBOM === "function") renderBOM();
  if (document.getElementById("rackPowerMatrixModal") && !document.getElementById("rackPowerMatrixModal").classList.contains("hidden")) {
    renderRackPowerMatrixModalContent();
  }
  if (typeof showToast === "function") {
    showToast(`Synced to BOM for ${activeRackId}: ${addedSummary.join(", ")}`);
  }
}
window.syncRackPdusAndCordsToBom = syncRackPdusAndCordsToBom;

function findPreferredOutletForDevice(outletsArr, inletType, startFromIndex = 1) {
  const wantsHighCurrent = String(inletType || "").toUpperCase().includes("C20");
  // First try matching socket class starting from startFromIndex
  for (let i = Math.max(1, startFromIndex) - 1; i < outletsArr.length; i++) {
    const o = outletsArr[i];
    if (!o.occupied && Boolean(o.isHighCurrentSocket) === wantsHighCurrent) {
      return o.outletNumber;
    }
  }
  // Next try any unoccupied outlet from startFromIndex
  for (let i = Math.max(1, startFromIndex) - 1; i < outletsArr.length; i++) {
    if (!outletsArr[i].occupied) return outletsArr[i].outletNumber;
  }
  // Fallback to any unoccupied outlet from 1
  const anyFree = outletsArr.find(o => !o.occupied);
  return anyFree ? anyFree.outletNumber : outletsArr.length;
}

function autoBalanceRackPowerFeeds() {
  if (typeof projectBOM === "undefined") return;
  const allRackItems = projectBOM.filter(i => !i.parentInstanceId && FacilityStore.normalize(i.closetName || i.rackId) === activeRackId);
  const assigned = allRackItems
    .filter(i => isPoweredRackEquipment(i))
    .sort((a, b) => (parseInt(b.rackSlot, 10) || 0) - (parseInt(a.rackSlot, 10) || 0));

  const pduConfig = getRackPduConfig();
  const isSingleFeedMode = (pduConfig === "single_vertical" || pduConfig === "horizontal");
  const parsed = FacilityStore.parse(activeRackId);
  const enclosures = FacilityStore.getEnclosures();
  const activeEnc = enclosures.find(e => e.id === parsed.hostId) || null;
  const { pduADef, pduBDef } = resolveRackCatalogPdus(allRackItems, activeEnc, pduConfig);
  const specA = buildPduSpecFromCatalog(pduADef, "PDUA", "PDUA");
  const specB = buildPduSpecFromCatalog(pduBDef, "PDUB", "PDUB");

  let singleCounter = 0;

  assigned.forEach(item => {
    const specs = getDevicePsuSpecs(item);
    if (!item.powerConnections) item.powerConnections = {};
    item.powerOutlets = {};

    if (isSingleFeedMode) {
      for (let p = 1; p <= specs.psuCount; p++) {
        item.powerConnections[`psu${p}`] = "PDU-A";
        const outNum = findPreferredOutletForDevice(specA.outlets, specs.inletType, 1);
        specA.outlets[outNum - 1].occupied = true;
        item.powerOutlets[`psu${p}`] = outNum;
      }
    } else {
      if (specs.psuCount >= 2) {
        // Find symmetrical outlet number available on both PDU-A and PDU-B matching socket class
        const wantsHigh = String(specs.inletType || "").toUpperCase().includes("C20");
        const maxShared = Math.min(specA.outlets.length, specB.outlets.length);
        let symOutlet = null;
        for (let r = 1; r <= maxShared; r++) {
          const oa = specA.outlets[r - 1];
          const ob = specB.outlets[r - 1];
          if (!oa.occupied && !ob.occupied && Boolean(oa.isHighCurrentSocket) === wantsHigh) {
            symOutlet = r;
            break;
          }
        }
        if (!symOutlet) {
          for (let r = 1; r <= maxShared; r++) {
            if (!specA.outlets[r - 1].occupied && !specB.outlets[r - 1].occupied) {
              symOutlet = r;
              break;
            }
          }
        }
        const outA = symOutlet || findPreferredOutletForDevice(specA.outlets, specs.inletType, 1);
        const outB = symOutlet || findPreferredOutletForDevice(specB.outlets, specs.inletType, 1);
        specA.outlets[outA - 1].occupied = true;
        specB.outlets[outB - 1].occupied = true;

        item.powerConnections.psu1 = "PDU-A";
        item.powerConnections.psu2 = "PDU-B";
        item.powerOutlets.psu1 = outA;
        item.powerOutlets.psu2 = outB;

        for (let p = 3; p <= specs.psuCount; p++) {
          const isOdd = (p % 2 === 1);
          const targetSpec = isOdd ? specA : specB;
          const oNum = findPreferredOutletForDevice(targetSpec.outlets, specs.inletType, 1);
          targetSpec.outlets[oNum - 1].occupied = true;
          item.powerConnections[`psu${p}`] = isOdd ? "PDU-A" : "PDU-B";
          item.powerOutlets[`psu${p}`] = oNum;
        }
      } else {
        singleCounter++;
        const toA = (singleCounter % 2 === 1);
        const targetSpec = toA ? specA : specB;
        const oNum = findPreferredOutletForDevice(targetSpec.outlets, specs.inletType, 1);
        targetSpec.outlets[oNum - 1].occupied = true;
        item.powerConnections.psu1 = toA ? "PDU-A" : "PDU-B";
        item.powerOutlets.psu1 = oNum;
        delete item.powerConnections.psu2;
      }
    }
  });

  FacilityStore.notifyWorkspaceChange();
  renderRackVisualizer();
  if (document.getElementById("rackPowerMatrixModal") && !document.getElementById("rackPowerMatrixModal").classList.contains("hidden")) {
    renderRackPowerMatrixModalContent();
  }
  if (typeof showToast === "function") {
    showToast(`Balanced power feeds & aligned A/B receptacles on ${specA.sku}${!isSingleFeedMode ? ' / ' + specB.sku : ''}.`);
  }
}
window.autoBalanceRackPowerFeeds = autoBalanceRackPowerFeeds;

function calculateRackPduMetrics(assignedItems, activeEnc, rackIdOverride = null) {
  const targetRackId = rackIdOverride || activeRackId;
  const pduConfig = getRackPduConfig(targetRackId);
  const isSingleFeedMode = (pduConfig === "single_vertical" || pduConfig === "horizontal");

  // Resolve OSS Standard Closet Prefix (e.g., MDF, IDFA, 2-IDFB, 1-2-IDFC)
  const parsed = (typeof FacilityStore !== "undefined") ? FacilityStore.parse(targetRackId) : { space: "MDF" };
  const closetPrefix = (typeof PortEngine !== "undefined" && typeof PortEngine.formatClosetPrefix === "function")
    ? PortEngine.formatClosetPrefix(parsed)
    : ((parsed.space || "MDF").replace(/[^a-zA-Z0-9]/g, "").toUpperCase() || "MDF");

  const pduACode = (pduConfig === "horizontal") ? "PDU01" : "PDUA";
  const pduBCode = "PDUB";
  const pduAFullId = `${closetPrefix}-${pduACode}`;
  const pduBFullId = `${closetPrefix}-${pduBCode}`;

  // Resolve Real Catalog PDU Specifications for PDU-A and PDU-B
  const { pduADef, pduBDef, bomPdus } = resolveRackCatalogPdus(assignedItems, activeEnc, pduConfig, targetRackId);
  const specA = buildPduSpecFromCatalog(pduADef, pduAFullId, pduACode);
  const specB = buildPduSpecFromCatalog(pduBDef, pduBFullId, pduBCode);

  const pduAOutlets = specA.outlets;
  const pduBOutlets = specB.outlets;

  // Discover Mounted UPS Units in this Rack (sorted from bottom U1 upward)
  const mountedUps = (assignedItems || [])
    .filter(it => it.rackSlot && isMountedUpsUnit(it))
    .sort((a, b) => (parseInt(a.rackSlot, 10) || 0) - (parseInt(b.rackSlot, 10) || 0))
    .map((u, idx) => {
      const upsTag = `${closetPrefix}-UPS${String(idx + 1).padStart(2, "0")}`;
      const upsVolt = parseInt(u.outputVoltage || u.inputVoltage, 10) || specA.inputVoltage || 120;
      const upsAmps = parseInt(u.inputCircuitAmps, 10) || specA.circuitBreakerAmps || 20;
      const circuitTag = (idx % 2 === 0 && !isSingleFeedMode && (assignedItems || []).filter(x => x.rackSlot && isMountedUpsUnit(x)).length === 1)
        ? `${closetPrefix}-CKT-B (${upsVolt}V/${upsAmps}A)`
        : `${closetPrefix}-CKT-${idx % 2 === 0 ? 'A' : 'B'} (${upsVolt}V/${upsAmps}A)`;
      return {
        instanceId: u.instanceId,
        upsTag,
        model: u.model || u.sku || "Rackmount UPS",
        sku: u.sku || "UPS",
        rackSlot: parseInt(u.rackSlot, 10) || 1,
        va: u.va || 1500,
        watts: u.powerWatts || 1000,
        inputCordId: `PWR-${upsTag}-IN`,
        upstreamCircuit: circuitTag
      };
    });

  // Determine Upstream Power Chain for PDU-A and PDU-B using actual PDU voltage & breaker amperage
  const cktASpec = `${specA.inputVoltage}V/${specA.circuitBreakerAmps}A ${specA.inputConnector}`;
  const cktBSpec = `${specB.inputVoltage}V/${specB.circuitBreakerAmps}A ${specB.inputConnector}`;

  let pduAUpstream = `${closetPrefix}-CKT-A (${cktASpec})`;
  let pduAUpstreamShort = `CKT-A (${specA.inputVoltage}V/${specA.circuitBreakerAmps}A)`;
  let pduBUpstream = `${closetPrefix}-CKT-B (${cktBSpec})`;
  let pduBUpstreamShort = `CKT-B (${specB.inputVoltage}V/${specB.circuitBreakerAmps}A)`;

  if (mountedUps.length >= 2) {
    pduAUpstream = `${mountedUps[0].upsTag} ➔ ${closetPrefix}-CKT-A (${cktASpec})`;
    pduAUpstreamShort = `${mountedUps[0].upsTag} (${specA.inputConnector})`;
    pduBUpstream = `${mountedUps[1].upsTag} ➔ ${closetPrefix}-CKT-B (${cktBSpec})`;
    pduBUpstreamShort = `${mountedUps[1].upsTag} (${specB.inputConnector})`;
  } else if (mountedUps.length === 1) {
    if (isSingleFeedMode) {
      pduAUpstream = `${mountedUps[0].upsTag} ➔ ${closetPrefix}-CKT-A (${cktASpec})`;
      pduAUpstreamShort = `${mountedUps[0].upsTag} (${specA.inputConnector})`;
    } else {
      pduAUpstream = `${closetPrefix}-CKT-A (${cktASpec})`;
      pduAUpstreamShort = `CKT-A (${specA.inputConnector})`;
      pduBUpstream = `${mountedUps[0].upsTag} ➔ ${closetPrefix}-CKT-B (${cktBSpec})`;
      pduBUpstreamShort = `${mountedUps[0].upsTag} (${specB.inputConnector})`;
    }
  }

  let pduALoadWatts = 0;
  let pduBLoadWatts = 0;
  let pduAOutletCount = 0;
  let pduBOutletCount = 0;
  let redundantDeviceCount = 0;
  let singlePointFailureCount = 0;
  let singleCordedCount = 0;

  const poweredDevices = (assignedItems || [])
    .filter(item => isPoweredRackEquipment(item))
    .sort((a, b) => (parseInt(b.rackSlot, 10) || 0) - (parseInt(a.rackSlot, 10) || 0));

  const byDeviceId = {};
  const powerCords = [];

  // Helper to claim a receptacle on PDU-A or PDU-B (preferring socket class match when auto-claiming)
  const claimOutlet = (targetPduKey, preferredOutletNum, inletType) => {
    const arr = targetPduKey === "PDU-B" ? pduBOutlets : pduAOutlets;
    if (preferredOutletNum && preferredOutletNum >= 1 && preferredOutletNum <= arr.length) {
      const slot = arr[preferredOutletNum - 1];
      if (!slot.occupied) return slot;
    }
    const autoNum = findPreferredOutletForDevice(arr, inletType, 1);
    return arr[autoNum - 1] || arr[arr.length - 1];
  };

  poweredDevices.forEach(item => {
    const stackUnits = (item.stackedUnits && item.stackedUnits >= 2) ? item.stackedUnits : 1;
    const baseW = (parseFloat(item.baseWatts) || 0) * stackUnits;
    const poeW = (parseFloat(item.poeBudget) || 0) * stackUnits;
    const itemOperatingWatts = Math.round(baseW + (poeW * 0.5));

    const specs = getDevicePsuSpecs(item);
    const psuConn = getDevicePowerConnections(item);
    if (!item.powerOutlets || typeof item.powerOutlets !== "object") {
      item.powerOutlets = {};
    }

    const deviceShortTag = getDeviceShortPowerTag(item, poweredDevices);
    const psuList = [];
    for (let p = 1; p <= specs.psuCount; p++) {
      let rawFeed = psuConn[`psu${p}`] || (p === 1 ? "PDU-A" : "PDU-B");
      if (isSingleFeedMode && (rawFeed === "PDU-B" || rawFeed === "PDU-Main")) {
        rawFeed = "PDU-A";
      }
      psuList.push({ psuNum: p, feed: rawFeed });
    }

    const activePsus = psuList.filter(p => p.feed === "PDU-A" || p.feed === "PDU-B");
    const feedsUsed = new Set(activePsus.map(p => p.feed));
    const isDualRedundant = !isSingleFeedMode && specs.psuCount >= 2 && feedsUsed.has("PDU-A") && feedsUsed.has("PDU-B");
    const isSpof = !isSingleFeedMode && specs.psuCount >= 2 && activePsus.length >= 2 && feedsUsed.size === 1;

    if (isDualRedundant) redundantDeviceCount++;
    else if (isSpof) singlePointFailureCount++;
    else singleCordedCount++;

    const perPsuWatts = activePsus.length > 0 ? Math.round(itemOperatingWatts / activePsus.length) : 0;

    // Symmetrical A+B outlet assignment when no manual outlet override exists
    if (
      !isSingleFeedMode &&
      specs.psuCount >= 2 &&
      psuList[0].feed !== "None" &&
      psuList[1].feed !== "None" &&
      psuList[0].feed !== psuList[1].feed &&
      !item.powerOutlets.psu1 &&
      !item.powerOutlets.psu2
    ) {
      const wantsHigh = String(specs.inletType || "").toUpperCase().includes("C20");
      const maxShared = Math.min(pduAOutlets.length, pduBOutlets.length);
      for (let r = 1; r <= maxShared; r++) {
        if (!pduAOutlets[r - 1].occupied && !pduBOutlets[r - 1].occupied && Boolean(pduAOutlets[r - 1].isHighCurrentSocket) === wantsHigh) {
          item.powerOutlets.psu1 = r;
          item.powerOutlets.psu2 = r;
          break;
        }
      }
      if (!item.powerOutlets.psu1) {
        for (let r = 1; r <= maxShared; r++) {
          if (!pduAOutlets[r - 1].occupied && !pduBOutlets[r - 1].occupied) {
            item.powerOutlets.psu1 = r;
            item.powerOutlets.psu2 = r;
            break;
          }
        }
      }
    }

    const deviceAssignments = {};

    psuList.forEach(pObj => {
      const pNum = pObj.psuNum;
      const pKey = `psu${pNum}`;
      const feed = pObj.feed;
      const devicePsuTag = `${deviceShortTag}-PSU${pNum}`;

      if (feed !== "PDU-A" && feed !== "PDU-B") {
        deviceAssignments[pKey] = {
          psuNum: pNum,
          feed: "None",
          connected: false,
          deviceShortTag,
          devicePsuTag,
          watts: 0,
          amps: 0
        };
        return;
      }

      const isFeedA = (feed === "PDU-A");
      const activePduSpec = isFeedA ? specA : specB;
      const preferredOutlet = parseInt(item.powerOutlets[pKey], 10) || null;
      const slot = claimOutlet(feed, preferredOutlet, specs.inletType);
      const rNum = slot.outletNumber;
      const rStr = String(rNum).padStart(2, "0");
      item.powerOutlets[pKey] = rNum;

      const pduCode = isFeedA ? pduACode : pduBCode;
      const pduFullId = isFeedA ? pduAFullId : pduBFullId;
      const pduReceptacleTag = `${pduFullId}-R${rStr}`;
      const pduShortReceptacle = `${pduCode}-R${rStr}`;
      const powerCordId = `PWR-${closetPrefix}-${pduCode}-${rStr}`;
      const upstreamSource = isFeedA ? pduAUpstream : pduBUpstream;

      // Resolve exact Catalog Power Cord SKU based on PDU Receptacle Socket + Device PSU Inlet
      const cordInfo = resolveCatalogPowerCord(specs.inletType, slot.socketType, isFeedA, activePduSpec.vendor);
      const perPsuAmps = parseFloat((perPsuWatts / activePduSpec.outputVoltage).toFixed(2));

      // Orion 2-Line Brady (M21-750-499) Power Cord Labels
      const bradyPsuLine1 = powerCordId;
      const bradyPsuLine2 = `${devicePsuTag} -> ${pduReceptacleTag}`;
      const bradyPduLine1 = powerCordId;
      const bradyPduLine2 = `${pduReceptacleTag} -> ${devicePsuTag}`;

      const assignmentRecord = {
        instanceId: item.instanceId,
        deviceModel: item.friendlyName || item.model || item.sku || "Device",
        deviceCatalogModel: item.model || item.sku || "",
        rackSlot: parseInt(item.rackSlot, 10) || 1,
        psuNum: pNum,
        psuKey: pKey,
        psuCount: specs.psuCount,
        inletType: specs.inletType,
        outletSocketType: slot.socketType,
        outletShortSocket: slot.shortSocket,
        cordSku: cordInfo.cordSku,
        cordVendor: cordInfo.cordVendor,
        cordModel: cordInfo.cordModel,
        cordType: cordInfo.plugToConnector,
        cordColor: cordInfo.cordColor,
        cordSpec: cordInfo.cordSpec,
        cordMsrp: cordInfo.msrp,
        feed,
        pduSku: activePduSpec.sku,
        pduVendor: activePduSpec.vendor,
        pduModel: activePduSpec.model,
        pduVoltage: activePduSpec.outputVoltage,
        pduCode,
        pduFullId,
        outletNumber: rNum,
        outletCode: `R${rStr}`,
        pduReceptacleTag,
        pduShortReceptacle,
        powerCordId,
        deviceShortTag,
        devicePsuTag,
        watts: perPsuWatts,
        amps: perPsuAmps,
        isDualRedundant,
        isSpof,
        upstreamSource,
        bradyPsuLine1,
        bradyPsuLine2,
        bradyPduLine1,
        bradyPduLine2,
        connected: true
      };

      slot.occupied = true;
      slot.isSpof = isSpof;
      slot.assignment = assignmentRecord;
      deviceAssignments[pKey] = assignmentRecord;
      powerCords.push(assignmentRecord);

      if (isFeedA) {
        pduALoadWatts += perPsuWatts;
        pduAOutletCount++;
      } else {
        pduBLoadWatts += perPsuWatts;
        pduBOutletCount++;
      }
    });

    byDeviceId[item.instanceId] = {
      instanceId: item.instanceId,
      deviceShortTag,
      psuCount: specs.psuCount,
      inletType: specs.inletType,
      cordType: specs.cordType,
      operatingWatts: itemOperatingWatts,
      isDualRedundant,
      isSpof,
      psus: deviceAssignments
    };
  });

  const pduAAmps = parseFloat((pduALoadWatts / specA.outputVoltage).toFixed(1));
  const pduBAmps = parseFloat((pduBLoadWatts / specB.outputVoltage).toFixed(1));
  const pduAPct = Math.min(100, Math.round((pduAAmps / specA.maxSafeAmps) * 100));
  const pduBPct = Math.min(100, Math.round((pduBAmps / specB.maxSafeAmps) * 100));

  const isSyncedInBom = bomPdus.some(b => b.sku === specA.sku);

  const metricsResult = {
    closetPrefix,
    voltage: specA.outputVoltage,
    circuitBreakerAmps: specA.circuitBreakerAmps,
    maxSafeAmps: specA.maxSafeAmps,
    maxSafeWatts: specA.maxSafeWatts,
    pduConfig,
    isSyncedInBom,
    mountedUps,
    byDeviceId,
    powerCords,
    pduA: {
      ...specA,
      id: "PDU-A",
      code: pduACode,
      fullId: pduAFullId,
      label: (pduConfig === "horizontal") ? `${specA.rackUnits || 1}U PDU (${pduAFullId})` : (pduConfig === "single_vertical" ? `0U PDU (${pduAFullId})` : pduAFullId),
      subLabel: pduAUpstreamShort,
      upstreamFull: pduAUpstream,
      upstreamShort: pduAUpstreamShort,
      cordColor: "Black",
      watts: Math.round(pduALoadWatts),
      amps: pduAAmps,
      pct: pduAPct,
      outletsUsed: pduAOutletCount,
      isOverloaded: pduAAmps > specA.maxSafeAmps
    },
    pduB: {
      ...specB,
      id: "PDU-B",
      code: pduBCode,
      fullId: pduBFullId,
      label: pduBFullId,
      subLabel: pduBUpstreamShort,
      upstreamFull: pduBUpstream,
      upstreamShort: pduBUpstreamShort,
      cordColor: "Blue",
      watts: Math.round(pduBLoadWatts),
      amps: pduBAmps,
      pct: pduBPct,
      outletsUsed: pduBOutletCount,
      isOverloaded: pduBAmps > specB.maxSafeAmps
    },
    redundancy: {
      redundantDeviceCount,
      singlePointFailureCount,
      singleCordedCount
    }
  };

  if (!rackIdOverride || rackIdOverride === activeRackId) {
    window._lastRackPduMetrics = metricsResult;
  }
  return metricsResult;
}
window.calculateRackPduMetrics = calculateRackPduMetrics;

function getRackPduMetricsForLocation(loc) {
  if (!loc || typeof FacilityStore === "undefined" || typeof projectBOM === "undefined") return null;
  const normLoc = FacilityStore.normalize(loc);
  const parsed = FacilityStore.parse(normLoc);
  if (!parsed || parsed.isDin || parsed.isWallBackboard || parsed.isPole || normLoc.endsWith("• Field")) {
    return null;
  }
  const enclosures = FacilityStore.getEnclosures();
  const enc = enclosures.find(e => e.id === parsed.hostId) || enclosures.find(e => e.name.toLowerCase() === (parsed.hostName || "").toLowerCase()) || null;
  if (enc && enc.hostType && enc.hostType !== "equipment_rack") {
    return null;
  }
  const itemsInRack = projectBOM.filter(it => {
    if (!it || it.parentInstanceId) return false;
    return FacilityStore.normalize(it.closetName || it.rackId) === normLoc;
  });
  return calculateRackPduMetrics(itemsInRack, enc, normLoc);
}
window.getRackPduMetricsForLocation = getRackPduMetricsForLocation;

// =========================================================================
// RACK POWER & PDU RECEPTACLE MATRIX STUDIO MODAL
// Interactive End-to-End Power Chain Trace, Catalog PDU Faceplates,
// and Orion 2-Line Brady (M21-750-499) Power Cord Schedule
// =========================================================================
function openRackPowerMatrixModal(focusPduKey = null, focusOutletNum = null, focusInstanceId = null, targetRackId = null) {
  let modal = document.getElementById("rackPowerMatrixModal");
  if (!modal) {
    const viewport = document.getElementById("workspaceMainViewport") || document.body;
    modal = document.createElement("div");
    modal.id = "rackPowerMatrixModal";
    modal.className = "hidden absolute inset-0 z-30 bg-slate-950 flex flex-col transition-all";
    viewport.appendChild(modal);
  }

  if (targetRackId) {
    activeRackId = FacilityStore.normalize(targetRackId);
    syncRackSelectorOptions();
  } else {
    // Ensure activeRackId points to an equipment_rack if possible
    const locations = FacilityStore.getLocations().filter(l => l.hostType === "equipment_rack");
    const currentNormalized = FacilityStore.normalize(activeRackId);
    const isCurrentRack = locations.some(l => FacilityStore.normalize(l.name) === currentNormalized);
    if (!isCurrentRack && locations.length > 0) {
      activeRackId = FacilityStore.normalize(locations[0].name);
      syncRackSelectorOptions();
    }
  }

  modal.classList.remove("hidden");

  // Calculate fresh metrics for activeRackId so focusInstanceId lookup is accurate
  const assignedItems = (typeof projectBOM !== "undefined" && Array.isArray(projectBOM))
    ? projectBOM.filter(i => !i.parentInstanceId && FacilityStore.normalize(i.closetName || i.rackId) === activeRackId)
    : [];
  const parsed = FacilityStore.parse(activeRackId);
  const enclosures = FacilityStore.getEnclosures();
  const activeEnc = enclosures.find(e => e.id === parsed.hostId) || enclosures.find(e => e.name.toLowerCase() === (parsed.hostName || "").toLowerCase()) || null;
  const metrics = calculateRackPduMetrics(assignedItems, activeEnc);

  if (focusPduKey && focusOutletNum) {
    window._rackPowerMatrixSelected = { pduKey: focusPduKey, outletNumber: parseInt(focusOutletNum, 10) };
  } else if (focusInstanceId && metrics?.byDeviceId?.[focusInstanceId]) {
    const devPwr = metrics.byDeviceId[focusInstanceId];
    const firstPsu = devPwr.psus?.psu1 || devPwr.psus?.psu2;
    if (firstPsu && firstPsu.connected) {
      window._rackPowerMatrixSelected = { pduKey: firstPsu.feed, outletNumber: firstPsu.outletNumber };
    }
  }

  renderRackPowerMatrixModalContent();
}
window.openRackPowerMatrixModal = openRackPowerMatrixModal;
window.openPowerMatrixStudio = openRackPowerMatrixModal;

function closeRackPowerMatrixModal() {
  const modal = document.getElementById("rackPowerMatrixModal");
  if (modal) modal.classList.add("hidden");
}
window.closeRackPowerMatrixModal = closeRackPowerMatrixModal;

function switchPowerMatrixRack(newRackName) {
  if (!newRackName) return;
  activeRackId = FacilityStore.normalize(newRackName);
  window._rackPowerMatrixSelected = null;
  syncRackSelectorOptions();
  renderRackPowerMatrixModalContent();
}
window.switchPowerMatrixRack = switchPowerMatrixRack;

function jumpFromPowerMatrixToRack(rackSlot = null, instanceId = null) {
  if (window.TabManager && typeof window.TabManager.openTab === "function") {
    window.TabManager.openTab("enclosures", { locationName: activeRackId });
  } else if (typeof openRackViewerFor === "function") {
    openRackViewerFor(activeRackId);
  }
  if (rackSlot !== null && instanceId && typeof selectRackSlotItem === "function") {
    setTimeout(() => {
      selectRackSlotItem(parseInt(rackSlot, 10), instanceId);
    }, 60);
  }
}
window.jumpFromPowerMatrixToRack = jumpFromPowerMatrixToRack;

function selectRackPowerMatrixOutlet(pduKey, outletNumber) {
  window._rackPowerMatrixSelected = { pduKey, outletNumber: parseInt(outletNumber, 10) };
  renderRackPowerMatrixModalContent();
}
window.selectRackPowerMatrixOutlet = selectRackPowerMatrixOutlet;

function exportRackPowerScheduleCSV() {
  const metrics = window._lastRackPduMetrics;
  if (!metrics || !Array.isArray(metrics.powerCords) || metrics.powerCords.length === 0) {
    if (typeof showToast === "function") showToast("No active power cords in this rack to export.");
    return;
  }

  const headers = [
    "Power Cord ID",
    "Catalog Cord SKU",
    "Cord Description & Color",
    "Enclosure / Rack",
    "Rack Slot",
    "Device Tag",
    "Device Model",
    "Chassis PSU Tag",
    "PSU Inlet Type",
    "PDU ID",
    "Catalog PDU SKU",
    "PDU Model",
    "PDU Receptacle Tag",
    "PDU Socket Type",
    "Upstream UPS / Circuit",
    "Operating Watts",
    "Operating Amps",
    "Redundancy Status",
    "Brady PSU End (Line 1)",
    "Brady PSU End (Line 2)",
    "Brady PDU End (Line 1)",
    "Brady PDU End (Line 2)"
  ];

  const escapeCsv = (val) => typeof window.escapeCSVCell === "function" ? window.escapeCSVCell(val) : `"${String(val ?? "").replace(/"/g, '""')}"`;
  const rows = metrics.powerCords.map(c => [
    c.powerCordId,
    c.cordSku,
    c.cordModel,
    activeRackId,
    `U${c.rackSlot}`,
    c.deviceShortTag,
    c.deviceModel,
    c.devicePsuTag,
    c.inletType,
    c.pduFullId,
    c.pduSku,
    c.pduModel,
    c.pduReceptacleTag,
    c.outletSocketType,
    c.upstreamSource,
    `${c.watts}W`,
    `${c.amps}A @ ${c.pduVoltage}V`,
    c.isDualRedundant ? "Dual-Feed A+B Redundant" : (c.isSpof ? "SPOF Warning (Same PDU)" : "Single-Corded"),
    c.bradyPsuLine1,
    c.bradyPsuLine2,
    c.bradyPduLine1,
    c.bradyPduLine2
  ].map(escapeCsv).join(","));

  const csvContent = [headers.map(escapeCsv).join(","), ...rows].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Orion_Rack_Power_Schedule_${metrics.closetPrefix}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  if (typeof showToast === "function") {
    showToast(`Exported ${metrics.powerCords.length} power cords & catalog SKUs for ${activeRackId}`);
  }
}
window.exportRackPowerScheduleCSV = exportRackPowerScheduleCSV;

function renderRackPowerMatrixModalContent() {
  const modal = document.getElementById("rackPowerMatrixModal");
  if (!modal) return;

  const allLocations = FacilityStore.getLocations();
  const rackLocations = allLocations.filter(l => l.hostType === "equipment_rack");
  const selectorLocations = rackLocations.length > 0
    ? rackLocations
    : allLocations.filter(l => l.hostType !== "field" && !l.isField);

  const assignedItems = (typeof projectBOM !== "undefined" && Array.isArray(projectBOM))
    ? projectBOM.filter(i => !i.parentInstanceId && FacilityStore.normalize(i.closetName || i.rackId) === activeRackId)
    : [];
  const parsed = FacilityStore.parse(activeRackId);
  const enclosures = FacilityStore.getEnclosures();
  const activeEnc = enclosures.find(e => e.id === parsed.hostId) || enclosures.find(e => e.name.toLowerCase() === (parsed.hostName || "").toLowerCase()) || null;

  const metrics = calculateRackPduMetrics(assignedItems, activeEnc);
  const isSingleFeedMode = (metrics.pduConfig === "single_vertical" || metrics.pduConfig === "horizontal");
  const isHorizMode = (metrics.pduConfig === "horizontal");

  const allCatalogPdus = getCatalogPdusList();
  let compatibleCatalogPdus = allCatalogPdus.filter(p => isHorizMode ? (parseInt(p.rackUnits, 10) || 0) >= 1 : (parseInt(p.rackUnits, 10) || 0) === 0);
  if (compatibleCatalogPdus.length === 0 && allCatalogPdus.length > 0) {
    compatibleCatalogPdus = allCatalogPdus;
  }

  // Default selected outlet to first occupied outlet if not set
  let sel = window._rackPowerMatrixSelected;
  if (!sel || !sel.pduKey || !sel.outletNumber) {
    const firstOccA = metrics.pduA.outlets.find(o => o.occupied);
    const firstOccB = !isSingleFeedMode ? metrics.pduB.outlets.find(o => o.occupied) : null;
    if (firstOccA) sel = { pduKey: "PDU-A", outletNumber: firstOccA.outletNumber };
    else if (firstOccB) sel = { pduKey: "PDU-B", outletNumber: firstOccB.outletNumber };
    else sel = { pduKey: "PDU-A", outletNumber: 1 };
    window._rackPowerMatrixSelected = sel;
  }

  const selPduObj = (sel.pduKey === "PDU-B" && !isSingleFeedMode) ? metrics.pduB : metrics.pduA;
  const selOutletObj = selPduObj.outlets[Math.min(selPduObj.outlets.length - 1, Math.max(0, (sel.outletNumber || 1) - 1))] || selPduObj.outlets[0];
  const selAssign = selOutletObj ? selOutletObj.assignment : null;

  const buildPduSelectOptions = (selectedSku, fallbackPduObj) => {
    if (compatibleCatalogPdus.length === 0 && fallbackPduObj) {
      const ruTag = (fallbackPduObj.rackUnits || 0) === 0 ? "0U" : `${fallbackPduObj.rackUnits}U`;
      return `<option class="bg-slate-900 text-white" value="${escapeHTML(fallbackPduObj.sku)}" selected>${escapeHTML(fallbackPduObj.vendor)} ${escapeHTML(fallbackPduObj.sku)} — ${ruTag} • ${fallbackPduObj.totalOutlets} Outlets (${escapeHTML(fallbackPduObj.receptaclesSummary)}) ($${fallbackPduObj.msrp || 385})</option>`;
    }
    return compatibleCatalogPdus.map(p => {
      const ruTag = (p.rackUnits || 0) === 0 ? "0U" : `${p.rackUnits}U`;
      const cktTag = `${p.inputVoltage || 120}V/${p.inputCircuitAmps || 20}A ${p.inputConnector || '5-20P'}`;
      return `<option class="bg-slate-900 text-white" value="${escapeHTML(p.sku)}" ${p.sku === selectedSku ? 'selected' : ''}>${escapeHTML(p.vendor)} ${escapeHTML(p.sku)} — ${ruTag} • ${p.outletsCount} Outlets (${escapeHTML(p.receptacles)}) • ${cktTag} ($${p.msrp})</option>`;
    }).join("");
  };

  const rackSelectorOptionsHtml = selectorLocations.map(loc => {
    const normName = FacilityStore.normalize(loc.name);
    return `<option class="bg-slate-900 text-white" value="${escapeHTML(normName)}" ${normName === activeRackId ? 'selected' : ''}>${escapeHTML(normName)}</option>`;
  }).join("");

  const renderPduStripCard = (pduObj, isFeedA) => {
    const pduKey = isFeedA ? "PDU-A" : "PDU-B";
    const accentText = isFeedA ? "text-emerald-400" : "text-sky-400";
    const accentBorder = isFeedA ? "border-emerald-500/40" : "border-sky-500/40";
    const barColor = pduObj.pct > 80 ? "bg-rose-500" : (isFeedA ? "bg-emerald-500" : "bg-sky-500");
    const gridClass = (pduObj.totalOutlets === 9 || pduObj.totalOutlets === 10)
      ? "pdu-strip-10col"
      : ((pduObj.totalOutlets <= 8 || pduObj.totalOutlets === 16) ? "pdu-strip-8col" : "pdu-strip-12col");

    return `
      <div class="p-3.5 rounded-2xl bg-slate-950 border ${accentBorder} space-y-2.5 shadow-lg">
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="px-2 py-0.5 rounded bg-slate-900 border ${accentBorder} font-mono text-xs font-bold ${accentText} flex items-center gap-1">
              <i data-lucide="plug-zap" class="w-3.5 h-3.5"></i>
              <span>${escapeHTML(pduObj.fullId)}</span>
            </span>
            <span class="px-2 py-0.5 rounded bg-indigo-950/80 border border-indigo-500/40 font-mono text-[10px] font-bold text-indigo-300" title="${escapeHTML(pduObj.model)}">
              SKU: ${escapeHTML(pduObj.vendor)} ${escapeHTML(pduObj.sku)}
            </span>
            <span class="text-[11px] font-mono text-slate-300 font-semibold">${escapeHTML(pduObj.receptaclesSummary)}</span>
            <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-amber-300">
              Input: ${escapeHTML(pduObj.plugType)}
            </span>
            <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
              Cords: <strong class="${isFeedA ? 'text-slate-200' : 'text-sky-300'}">${pduObj.cordColor}</strong>
            </span>
          </div>
          <div class="flex items-center gap-3 text-xs font-mono">
            <span class="text-slate-400">Outlets: <strong class="text-white">${pduObj.outletsUsed}/${pduObj.totalOutlets}</strong></span>
            <span class="${pduObj.pct > 80 ? 'text-rose-400 font-bold' : accentText} font-bold">${pduObj.amps}A / ${pduObj.maxSafeAmps}A NEC (${pduObj.watts}W / ${pduObj.maxSafeWatts}W &bull; ${pduObj.pct}%)</span>
          </div>
        </div>

        <div class="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
          <div class="${barColor} h-full rounded-full transition-all" style="width: ${pduObj.pct}%"></div>
        </div>

        <!-- Interactive Numbered Receptacles R01..RN with Exact Catalog Socket Type -->
        <div class="${gridClass} pt-1">
          ${pduObj.outlets.map(o => {
            const isSelected = (sel.pduKey === pduKey && sel.outletNumber === o.outletNumber);
            const isOcc = Boolean(o.occupied && o.assignment);
            const a = o.assignment;
            let boxStyle = o.isHighCurrentSocket
              ? "bg-slate-900/95 border-amber-700/50 text-slate-400 hover:border-amber-500"
              : "bg-slate-900/90 border-slate-800 text-slate-500 hover:border-slate-600";
            if (isOcc) {
              if (o.isSpof) {
                boxStyle = "bg-rose-950/60 border-rose-500/70 text-rose-200";
              } else if (isFeedA) {
                boxStyle = "bg-emerald-950/50 border-emerald-500/60 text-emerald-200";
              } else {
                boxStyle = "bg-sky-950/50 border-sky-500/60 text-sky-200";
              }
            }
            const ringStyle = isSelected ? "ring-2 ring-amber-400 border-amber-400 scale-105 z-10" : "";

            return `
              <button
                type="button"
                onclick="selectRackPowerMatrixOutlet('${pduKey}', ${o.outletNumber})"
                class="p-1.5 rounded-lg border ${boxStyle} ${ringStyle} flex flex-col items-center justify-between text-center font-mono transition-all cursor-pointer select-none"
                title="${escapeHTML(isOcc ? `${a.pduReceptacleTag} (${o.socketType}) ⟷ ${a.powerCordId} [${a.cordSku}] ⟷ U${a.rackSlot} ${a.devicePsuTag} (${a.deviceModel} • ${a.watts}W)` : `${pduObj.fullId}-${o.outletCode} (${o.socketType}) — Open Receptacle`)}"
              >
                <div class="w-full flex items-center justify-between text-[9px] font-bold">
                  <span>${o.outletCode}</span>
                  <span class="${o.isHighCurrentSocket ? 'text-amber-400' : (isOcc ? (isFeedA ? 'text-emerald-400' : 'text-sky-400') : 'text-slate-600')}">${o.shortSocket}</span>
                </div>
                <div class="text-[9px] font-bold truncate w-full mt-0.5 ${isOcc ? 'text-white' : 'text-slate-600'}">
                  ${isOcc ? escapeHTML(a.devicePsuTag) : 'OPEN'}
                </div>
                <div class="text-[8px] text-slate-400 truncate w-full">
                  ${isOcc ? `U${a.rackSlot} &bull; ${a.watts}W` : escapeHTML(o.socketType)}
                </div>
              </button>
            `;
          }).join("")}
        </div>
      </div>
    `;
  };

  const poweredDevices = assignedItems
    .filter(item => isPoweredRackEquipment(item))
    .sort((a, b) => (parseInt(b.rackSlot, 10) || 0) - (parseInt(a.rackSlot, 10) || 0));

  modal.innerHTML = `
    <div class="bg-slate-900 w-full h-full flex flex-col overflow-hidden">
      <!-- Studio Workspace Tab Header -->
      <div class="px-5 py-3 border-b border-slate-800 bg-slate-950/90 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div class="flex items-center gap-3 flex-wrap">
          <div class="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <i data-lucide="plug-zap" class="w-5 h-5"></i>
          </div>
          <div>
            <div class="flex items-center gap-2 flex-wrap">
              <h2 class="text-sm sm:text-base font-bold text-white">Power Matrix Studio</h2>
              <span class="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-700/60 text-[10px] font-mono font-bold">${escapeHTML(metrics.pduA.vendor)} ${escapeHTML(metrics.pduA.sku)}${!isSingleFeedMode && metrics.pduB.sku !== metrics.pduA.sku ? ` + ${escapeHTML(metrics.pduB.sku)}` : ''}</span>
            </div>
            <p class="text-[11px] text-slate-400">Catalog-Driven PDU Receptacles (R01–R${metrics.pduA.totalOutlets}), Power Cord Part Numbers, &amp; Orion 2-Line Brady Labels</p>
          </div>

          <!-- Active Rack Selector -->
          <div class="flex items-center gap-2 ml-1 pl-3 border-l border-slate-800">
            <span class="text-[10px] font-mono uppercase tracking-wider text-slate-400">Active Rack:</span>
            <select
              onchange="switchPowerMatrixRack(this.value)"
              class="bg-slate-900 border border-emerald-500/50 hover:border-emerald-400 text-emerald-300 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold focus:outline-none cursor-pointer"
            >
              ${rackSelectorOptionsHtml}
            </select>
          </div>
        </div>

        <div class="flex items-center gap-2 flex-wrap">
          <!-- Cross-Navigation Links (Symmetric with Port Matrix Studio) -->
          <button
            type="button"
            onclick="openCablePullScheduleModal()"
            class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Cable Pull Schedule &amp; Field Labels"
          >
            <i data-lucide="file-spreadsheet" class="w-3.5 h-3.5 text-amber-400"></i>
            <span>Cable Schedule</span>
          </button>
          <button
            type="button"
            onclick="if (typeof openPortMatrixStudio === 'function') openPortMatrixStudio(activeRackId); else if (window.TabManager) TabManager.openTab('port_matrix', { switchInstanceId: activeRackId });"
            class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Open Switch Port Matrix Studio for ${escapeHTML(activeRackId)}"
          >
            <i data-lucide="cpu" class="w-3.5 h-3.5 text-sky-400"></i>
            <span>Port Matrix</span>
          </button>
          <button
            type="button"
            onclick="jumpFromPowerMatrixToRack()"
            class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Open ${escapeHTML(activeRackId)} in the Rack Elevation Visualizer"
          >
            <i data-lucide="server" class="w-3.5 h-3.5 text-indigo-400"></i>
            <span>View in Rack</span>
          </button>
          <button
            type="button"
            onclick="toggleTopologyModal()"
            class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Open Network Topology Studio"
          >
            <i data-lucide="network" class="w-3.5 h-3.5 text-emerald-400"></i>
            <span>View in Topology</span>
          </button>

          <div class="h-5 w-px bg-slate-800 mx-0.5"></div>

          <button
            type="button"
            onclick="syncRackPdusAndCordsToBom()"
            class="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/60 text-amber-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Add/Update selected Catalog PDU SKUs and Power Jumper Cord SKUs in the Project BOM"
          >
            <i data-lucide="package-check" class="w-3.5 h-3.5 text-amber-400"></i>
            <span>Sync PDUs &amp; Cords to BOM</span>
          </button>
          <button
            type="button"
            onclick="autoBalanceRackPowerFeeds()"
            class="px-3 py-1.5 rounded-xl bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-600/70 text-emerald-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Auto-balance dual-PSU devices symmetrically across PDU-A and PDU-B matching socket types"
          >
            <i data-lucide="scale" class="w-3.5 h-3.5 text-emerald-400"></i>
            <span>Auto-Balance A+B</span>
          </button>
          <button
            type="button"
            onclick="exportRackPowerScheduleCSV()"
            class="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow transition-colors cursor-pointer"
            title="Export Orion Rack Power, Catalog SKUs &amp; 2-Line Brady Label Schedule to CSV"
          >
            <i data-lucide="download" class="w-3.5 h-3.5"></i>
            <span>Export Power CSV</span>
          </button>
        </div>
      </div>

      <!-- Studio Scrollable Body -->
      <div class="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        <!-- Catalog PDU Hardware Part Number Selector Bar -->
        <div class="p-3.5 rounded-2xl bg-slate-950 border border-indigo-500/40 flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-2.5">
            <div class="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <i data-lucide="cpu" class="w-4 h-4"></i>
            </div>
            <div>
              <div class="text-xs font-bold text-white flex items-center gap-2 flex-wrap">
                <span>Catalog PDU Hardware Selection (${isHorizMode ? '1U/2U Horizontal Rackmount' : '0U Vertical Strip'} &bull; ${compatibleCatalogPdus.length} Models)</span>
                <span class="px-1.5 py-0.2 rounded text-[9px] font-mono ${metrics.isSyncedInBom ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60' : 'bg-amber-950 text-amber-300 border border-amber-700/60'}">
                  ${metrics.isSyncedInBom ? '✓ In Project BOM' : 'Not Yet Synced to BOM'}
                </span>
              </div>
              <div class="text-[10px] text-slate-400 font-mono">Selecting a catalog PDU automatically updates receptacle count, socket types (5-15R / 5-20R / L5-20R / C13 / C19), voltage (120V/208V), and NEC 80% load limits.</div>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2 flex-1 min-w-[280px] justify-end">
            ${isSingleFeedMode ? `
              <div class="w-full sm:w-auto flex-1 max-w-xl">
                <label class="text-[9px] font-mono uppercase text-emerald-400 block mb-0.5">${escapeHTML(metrics.pduA.fullId)} Catalog Part Number</label>
                <select
                  onchange="setRackPduCatalogSku('PDU-A', this.value)"
                  class="w-full bg-slate-900 border border-emerald-500/50 text-white rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold focus:outline-none cursor-pointer"
                >
                  ${buildPduSelectOptions(metrics.pduA.sku, metrics.pduA)}
                </select>
              </div>
            ` : `
              <div class="w-full sm:w-auto flex-1">
                <label class="text-[9px] font-mono uppercase text-emerald-400 block mb-0.5">PDU-A (${escapeHTML(metrics.pduA.fullId)}) Catalog SKU</label>
                <select
                  onchange="setRackPduCatalogSku('PDU-A', this.value)"
                  class="w-full bg-slate-900 border border-emerald-500/50 text-white rounded-lg px-2 py-1 text-[11px] font-mono font-bold focus:outline-none cursor-pointer"
                >
                  ${buildPduSelectOptions(metrics.pduA.sku, metrics.pduA)}
                </select>
              </div>
              <div class="w-full sm:w-auto flex-1">
                <label class="text-[9px] font-mono uppercase text-sky-400 block mb-0.5">PDU-B (${escapeHTML(metrics.pduB.fullId)}) Catalog SKU</label>
                <select
                  onchange="setRackPduCatalogSku('PDU-B', this.value)"
                  class="w-full bg-slate-900 border border-sky-500/50 text-white rounded-lg px-2 py-1 text-[11px] font-mono font-bold focus:outline-none cursor-pointer"
                >
                  ${buildPduSelectOptions(metrics.pduB.sku, metrics.pduB)}
                </select>
              </div>
              <button
                type="button"
                onclick="setRackPduCatalogSku('BOTH', '${escapeJSAttr(metrics.pduA.sku)}')"
                class="mt-3 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] font-mono font-bold text-slate-300 hover:text-white cursor-pointer"
                title="Match PDU-B to the same catalog SKU as PDU-A"
              >
                Match B=A
              </button>
            `}
          </div>
        </div>

        <!-- 1. End-to-End Power Chain KPI Strip -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div class="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div class="text-[10px] font-mono uppercase text-slate-400 flex items-center justify-between">
              <span>1. Facility Branch Circuits</span>
              <i data-lucide="zap" class="w-3.5 h-3.5 text-amber-400"></i>
            </div>
            <div class="text-xs font-bold text-white mt-1 font-mono">${escapeHTML(metrics.closetPrefix)}-CKT-A ${!isSingleFeedMode ? `&amp; CKT-B` : ''}</div>
            <div class="text-[10px] text-slate-400 font-mono mt-0.5">${metrics.pduA.inputVoltage}V / ${metrics.pduA.circuitBreakerAmps}A (${metrics.pduA.maxSafeAmps}A NEC Continuous &bull; ${escapeHTML(metrics.pduA.inputConnector)})</div>
          </div>

          <div class="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div class="text-[10px] font-mono uppercase text-slate-400 flex items-center justify-between">
              <span>2. Standby UPS Backing</span>
              <i data-lucide="battery-charging" class="w-3.5 h-3.5 text-emerald-400"></i>
            </div>
            ${metrics.mountedUps.length > 0 ? `
              <div class="text-xs font-bold text-emerald-300 mt-1 font-mono truncate">
                ${metrics.mountedUps.map(u => `${u.upsTag} (U${u.rackSlot})`).join(" + ")}
              </div>
              <div class="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                ${escapeHTML(metrics.mountedUps[0].model)}
              </div>
            ` : `
              <div class="text-xs font-bold text-amber-300 mt-1 font-mono">No UPS Slotted in Rack</div>
              <button type="button" onclick="window.addRecommendedUpsAndEbpToRack(); renderRackPowerMatrixModalContent();" class="text-[10px] text-indigo-400 hover:underline font-mono mt-0.5 cursor-pointer">
                + Auto-Slot Recommended UPS at U1
              </button>
            `}
          </div>

          <div class="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div class="text-[10px] font-mono uppercase text-slate-400 flex items-center justify-between">
              <span>3. Catalog PDU Receptacles</span>
              <i data-lucide="plug-zap" class="w-3.5 h-3.5 text-sky-400"></i>
            </div>
            <div class="text-xs font-bold text-white mt-1 font-mono">
              ${escapeHTML(metrics.pduA.sku)}: ${metrics.pduA.outletsUsed}/${metrics.pduA.totalOutlets}
              ${!isSingleFeedMode ? ` &bull; ${escapeHTML(metrics.pduB.sku)}: ${metrics.pduB.outletsUsed}/${metrics.pduB.totalOutlets}` : ''}
            </div>
            <div class="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
              ${escapeHTML(metrics.pduA.receptaclesSummary)}
            </div>
          </div>

          <div class="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div class="text-[10px] font-mono uppercase text-slate-400 flex items-center justify-between">
              <span>4. Redundancy &amp; Power Cords</span>
              <i data-lucide="shield-check" class="w-3.5 h-3.5 ${metrics.redundancy.singlePointFailureCount > 0 ? 'text-rose-400' : 'text-emerald-400'}"></i>
            </div>
            <div class="text-xs font-bold text-white mt-1 font-mono">
              ${metrics.powerCords.length} Catalog Power Cords
            </div>
            <div class="text-[10px] font-mono mt-0.5 ${metrics.redundancy.singlePointFailureCount > 0 ? 'text-rose-400 font-bold' : 'text-emerald-400'}">
              ${metrics.redundancy.redundantDeviceCount} A+B Redundant &bull; ${metrics.redundancy.singleCordedCount} Single &bull; ${metrics.redundancy.singlePointFailureCount} SPOF
            </div>
          </div>
        </div>

        <!-- 2. Interactive PDU-A & PDU-B Receptacle Faceplates -->
        <div class="space-y-3">
          ${renderPduStripCard(metrics.pduA, true)}
          ${!isSingleFeedMode ? renderPduStripCard(metrics.pduB, false) : ''}
        </div>

        <!-- 3. Selected Receptacle End-to-End Power Trace & Orion 2-Line Brady Label Preview -->
        <div class="p-4 rounded-2xl bg-slate-950 border border-indigo-500/40 space-y-3 shadow-inner">
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-700/60 text-[10px] font-mono font-bold">
                SELECTED RECEPTACLE TRACE
              </span>
              <span class="text-xs font-mono font-bold text-white">
                ${escapeHTML(selOutletObj.receptacleTag)} (${escapeHTML(selOutletObj.socketType)})
              </span>
              ${selAssign ? `
                <span class="px-2 py-0.5 rounded bg-emerald-950/90 text-emerald-300 border border-emerald-600/50 text-[10px] font-mono font-bold">
                  ${escapeHTML(selAssign.powerCordId)} &bull; SKU: ${escapeHTML(selAssign.cordSku)}
                </span>
              ` : `
                <span class="px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800 text-[10px] font-mono">
                  UNOCCUPIED SPARE OUTLET (${escapeHTML(selOutletObj.socketType)})
                </span>
              `}
            </div>
            <span class="text-[10px] font-mono text-slate-400">Click any outlet R01–R${selPduObj.totalOutlets} above to inspect its full power chain &amp; Brady labels</span>
          </div>

          ${selAssign ? `
            <!-- 5-Stage End-to-End Power Chain Visual Cards -->
            <div class="matrix-trace-grid text-xs font-mono">
              <!-- Box 1: Chassis PSU -->
              <div class="p-2.5 rounded-xl bg-slate-900 border border-indigo-500/50">
                <div class="text-[9px] text-indigo-400 uppercase font-bold flex items-center justify-between">
                  <span>1. Rack Device PSU</span>
                  <button
                    type="button"
                    onclick="jumpFromPowerMatrixToRack(${selAssign.rackSlot}, '${selAssign.instanceId}')"
                    class="text-[9px] text-indigo-300 hover:text-white underline cursor-pointer"
                    title="Highlight U${selAssign.rackSlot} in Rack Elevation Visualizer"
                  >
                    View U${selAssign.rackSlot} ↗
                  </button>
                </div>
                <div class="text-xs font-bold text-white truncate mt-0.5">${escapeHTML(selAssign.devicePsuTag)} (U${selAssign.rackSlot})</div>
                <div class="text-[10px] text-slate-300 truncate">${escapeHTML(selAssign.deviceModel)}</div>
                <div class="text-[9px] text-slate-400 mt-0.5">Inlet: ${escapeHTML(selAssign.inletType)} &bull; ${selAssign.watts}W (${selAssign.amps}A)</div>
              </div>

              <!-- Arrow 1: Catalog Power Cord -->
              <div class="p-2 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                <div class="text-[9px] text-amber-300 font-bold">${escapeHTML(selAssign.powerCordId)}</div>
                <div class="text-indigo-300 text-[9px] font-bold">SKU: ${escapeHTML(selAssign.cordSku)}</div>
                <div class="text-slate-500 text-[10px]">◄───────►</div>
                <div class="text-[8.5px] text-slate-400">${escapeHTML(selAssign.cordType)} (${escapeHTML(selAssign.cordColor)})</div>
              </div>

              <!-- Box 2: Catalog PDU Receptacle -->
              <div class="p-2.5 rounded-xl bg-slate-900 border ${selAssign.feed === 'PDU-A' ? 'border-emerald-500/60' : 'border-sky-500/60'}">
                <div class="text-[9px] ${selAssign.feed === 'PDU-A' ? 'text-emerald-400' : 'text-sky-400'} uppercase font-bold">2. PDU Receptacle</div>
                <div class="text-xs font-bold text-white mt-0.5">${escapeHTML(selAssign.pduReceptacleTag)}</div>
                <div class="text-[10px] text-slate-300">${escapeHTML(selAssign.pduVendor)} ${escapeHTML(selAssign.pduSku)} &bull; ${selAssign.outletCode}</div>
                <div class="text-[9px] text-amber-300 mt-0.5">Socket: ${escapeHTML(selAssign.outletSocketType)}</div>
              </div>

              <!-- Arrow 2 -->
              <div class="p-2 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                <div class="text-[9px] text-cyan-300 font-bold">PDU Input Cord</div>
                <div class="text-slate-500 text-[10px]">◄───────►</div>
                <div class="text-[8.5px] text-slate-400">${escapeHTML(selPduObj.plugType)}</div>
              </div>

              <!-- Box 3: Upstream UPS & Branch Circuit -->
              <div class="p-2.5 rounded-xl bg-slate-900 border border-amber-500/50">
                <div class="text-[9px] text-amber-400 uppercase font-bold">3. UPS &amp; Branch Circuit</div>
                <div class="text-xs font-bold text-white truncate mt-0.5">${escapeHTML(selAssign.upstreamSource)}</div>
                <div class="text-[10px] text-slate-300">Breaker: ${selPduObj.circuitBreakerAmps}A (${selPduObj.maxSafeAmps}A NEC Safe)</div>
                <div class="text-[9px] ${selAssign.isDualRedundant ? 'text-emerald-400' : (selAssign.isSpof ? 'text-rose-400' : 'text-slate-400')} mt-0.5">
                  ${selAssign.isDualRedundant ? '✓ Dual-Feed A+B Protected' : (selAssign.isSpof ? '⚠️ SPOF: Both PSUs on same PDU' : 'Single-Feed')}
                </div>
              </div>
            </div>

            <!-- Orion 2-Line Brady (M21-750-499) Power Cord Labels -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div class="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3">
                <div>
                  <span class="text-[9px] font-mono uppercase text-slate-400 block">Orion 2-Line Brady Label (Chassis PSU End)</span>
                  <span class="text-[10px] text-slate-500 font-mono">Brady M21-750-499 &bull; Cord SKU: ${escapeHTML(selAssign.cordSku)}</span>
                </div>
                <div class="px-3 py-1.5 rounded bg-amber-50 text-slate-950 font-mono text-[11px] font-bold leading-tight border-2 border-amber-400 shadow">
                  <div>L1: ${escapeHTML(selAssign.bradyPsuLine1)}</div>
                  <div>L2: ${escapeHTML(selAssign.bradyPsuLine2)}</div>
                </div>
              </div>

              <div class="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3">
                <div>
                  <span class="text-[9px] font-mono uppercase text-slate-400 block">Orion 2-Line Brady Label (PDU Receptacle End)</span>
                  <span class="text-[10px] text-slate-500 font-mono">Brady M21-750-499 &bull; PDU SKU: ${escapeHTML(selAssign.pduSku)}</span>
                </div>
                <div class="px-3 py-1.5 rounded bg-amber-50 text-slate-950 font-mono text-[11px] font-bold leading-tight border-2 border-amber-400 shadow">
                  <div>L1: ${escapeHTML(selAssign.bradyPduLine1)}</div>
                  <div>L2: ${escapeHTML(selAssign.bradyPduLine2)}</div>
                </div>
              </div>
            </div>
          ` : `
            <div class="py-3 text-center text-xs text-slate-400 font-mono">
              Receptacle <strong>${escapeHTML(selOutletObj.receptacleTag)} (${escapeHTML(selOutletObj.socketType)})</strong> on <strong>${escapeHTML(selPduObj.vendor)} ${escapeHTML(selPduObj.sku)}</strong> is currently open. Assign any device PSU to outlet <strong>${selOutletObj.outletCode}</strong> in the table below.
            </div>
          `}
        </div>

        <!-- 4. Complete Interactive Device PSU -> PDU Receptacle Assignment & Brady Label Table -->
        <div class="rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden">
          <div class="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
            <span class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <i data-lucide="list-checks" class="w-4 h-4 text-emerald-400"></i>
              Rack Equipment Power Cord &amp; Receptacle Schedule (${poweredDevices.length} Powered Units)
            </span>
            <span class="text-[10px] font-mono text-slate-400">Assign Feed (${escapeHTML(metrics.pduA.sku)}${!isSingleFeedMode ? ' / ' + escapeHTML(metrics.pduB.sku) : ''}) &amp; Exact Receptacle</span>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="bg-slate-900/60 border-b border-slate-800 text-[10px] font-mono uppercase text-slate-400">
                  <th class="py-2 px-3">U-Slot</th>
                  <th class="py-2 px-3">Device &amp; Tag</th>
                  <th class="py-2 px-3">Chassis PSU</th>
                  <th class="py-2 px-3">PDU Feed (SKU)</th>
                  <th class="py-2 px-3">PDU Receptacle &amp; Socket</th>
                  <th class="py-2 px-3">Power Cord ID &amp; Catalog SKU</th>
                  <th class="py-2 px-3">Load</th>
                  <th class="py-2 px-3">Orion 2-Line Brady Label (PSU End)</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800/80 font-mono text-[11px]">
                ${poweredDevices.length === 0 ? `
                  <tr>
                    <td colspan="8" class="py-6 text-center text-slate-500 font-sans">No active powered equipment is currently mounted in ${escapeHTML(activeRackId)}.</td>
                  </tr>
                ` : poweredDevices.map(item => {
                  const devInfo = metrics.byDeviceId[item.instanceId];
                  if (!devInfo) return "";
                  const psuKeys = Object.keys(devInfo.psus);
                  return psuKeys.map((pKey) => {
                    const p = devInfo.psus[pKey];
                    const pNum = p.psuNum;
                    const targetPdu = (p.feed === "PDU-B") ? metrics.pduB : metrics.pduA;
                    const maxOut = targetPdu.totalOutlets;
                    const outletOptions = Array.from({ length: maxOut }, (_, oIdx) => {
                      const rNum = oIdx + 1;
                      const rCode = `R${String(rNum).padStart(2, "0")}`;
                      const slotObj = targetPdu.outlets[oIdx];
                      const sockBadge = slotObj ? slotObj.shortSocket : "5-20R";
                      const occByOther = slotObj && slotObj.occupied && slotObj.assignment && !(slotObj.assignment.instanceId === item.instanceId && slotObj.assignment.psuNum === pNum);
                      const occLabel = occByOther ? ` • [${slotObj.assignment.devicePsuTag}]` : "";
                      return `<option class="bg-slate-900 text-white" value="${rNum}" ${p.outletNumber === rNum ? 'selected' : ''}>${targetPdu.code}-${rCode} (${sockBadge})${occLabel}</option>`;
                    }).join("");

                    return `
                      <tr class="hover:bg-slate-900/50 transition-colors">
                        <td class="py-2 px-3">
                          <button
                            type="button"
                            onclick="jumpFromPowerMatrixToRack(${item.rackSlot}, '${item.instanceId}')"
                            class="font-bold text-indigo-400 hover:text-indigo-200 underline cursor-pointer"
                            title="View U${item.rackSlot} in Rack Elevation Visualizer"
                          >
                            U${item.rackSlot}
                          </button>
                        </td>
                        <td class="py-2 px-3">
                          <div class="flex items-center gap-1.5">
                            <span class="px-1.5 py-0.5 rounded bg-brand-900/60 border border-brand-500/40 text-[9px] font-bold text-brand-300">${escapeHTML(devInfo.deviceShortTag)}</span>
                            <span class="font-sans font-bold text-white truncate max-w-[170px]" title="${escapeHTML(item.friendlyName || item.model)}">${escapeHTML(item.friendlyName || item.model)}</span>
                          </div>
                        </td>
                        <td class="py-2 px-3">
                          <span class="font-bold text-slate-200">${escapeHTML(p.devicePsuTag)}</span>
                          <span class="text-[9px] text-slate-500 block">Inlet: ${escapeHTML(devInfo.inletType)}</span>
                        </td>
                        <td class="py-2 px-3">
                          <select
                            onchange="setDevicePsuFeedDirect('${item.instanceId}', ${pNum}, this.value)"
                            class="bg-slate-900 border ${p.feed === 'PDU-A' ? 'border-emerald-500/60 text-emerald-300' : (p.feed === 'PDU-B' ? 'border-sky-500/60 text-sky-300' : 'border-slate-700 text-slate-400')} rounded px-2 py-1 text-[10px] font-bold focus:outline-none cursor-pointer"
                          >
                            <option class="bg-slate-900 text-white" value="PDU-A" ${p.feed === "PDU-A" ? "selected" : ""}>${escapeHTML(metrics.pduA.fullId)} (${escapeHTML(metrics.pduA.sku)})</option>
                            ${!isSingleFeedMode ? `<option class="bg-slate-900 text-white" value="PDU-B" ${p.feed === "PDU-B" ? "selected" : ""}>${escapeHTML(metrics.pduB.fullId)} (${escapeHTML(metrics.pduB.sku)})</option>` : ''}
                            <option class="bg-slate-900 text-white" value="None" ${p.feed === "None" ? "selected" : ""}>Unplugged (None)</option>
                          </select>
                        </td>
                        <td class="py-2 px-3">
                          ${p.connected ? `
                            <select
                              onchange="setDevicePsuOutlet('${item.instanceId}', ${pNum}, this.value)"
                              class="bg-slate-900 border border-slate-700 hover:border-indigo-500 text-white rounded px-2 py-1 text-[10px] font-bold focus:outline-none cursor-pointer"
                            >
                              ${outletOptions}
                            </select>
                          ` : `<span class="text-slate-600 text-[10px]">— Unplugged —</span>`}
                        </td>
                        <td class="py-2 px-3">
                          ${p.connected ? `
                            <div class="flex items-center gap-1.5">
                              <span class="text-amber-300 font-bold">${escapeHTML(p.powerCordId)}</span>
                              <span class="px-1.5 py-0.2 rounded bg-indigo-950 border border-indigo-700/60 text-[9px] text-indigo-300 font-bold">${escapeHTML(p.cordSku)}</span>
                            </div>
                            <span class="text-[9px] text-slate-400 block">${escapeHTML(p.cordType)} (${escapeHTML(p.cordColor)})</span>
                          ` : `<span class="text-slate-600">—</span>`}
                        </td>
                        <td class="py-2 px-3">
                          ${p.connected ? `
                            <span class="text-white font-bold">${p.watts}W</span>
                            <span class="text-[9px] text-slate-400 block">${p.amps}A @ ${p.pduVoltage}V</span>
                          ` : `<span class="text-slate-600">0W</span>`}
                        </td>
                        <td class="py-2 px-3">
                          ${p.connected ? `
                            <div class="inline-block px-2 py-0.5 rounded bg-slate-900 border border-amber-500/40 text-[9.5px] leading-tight">
                              <div class="text-amber-300 font-bold">${escapeHTML(p.bradyPsuLine1)}</div>
                              <div class="text-slate-300">${escapeHTML(p.bradyPsuLine2)}</div>
                            </div>
                          ` : `<span class="text-slate-600">—</span>`}
                        </td>
                      </tr>
                    `;
                  }).join("");
                }).join("")}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;

  if (window.lucide) lucide.createIcons();
}
window.renderRackPowerMatrixModalContent = renderRackPowerMatrixModalContent;

function getDeviceFrontPortPreview(item) {
  const model = (item.model || "").toLowerCase();
  const role = item.role || "";
  const portCount = getItemPortCount(item);

  if (role === "Access" || role === "Core" || role === "Aggregation" || role.includes("Switch")) {
    if (portCount >= 48) return "48x 1G/PoE+ &bull; 4x 10G/25G SFP+";
    if (portCount >= 24) return "24x 1G/PoE+ &bull; 4x 10G SFP+";
    if (portCount >= 16) return "16x 1G/PoE+ &bull; 2x 10G SFP+";
    if (portCount >= 8) return "8x 1G/PoE+ &bull; 2x SFP";
    return `${portCount || 24}x Ethernet Ports`;
  }
  if (role === "Server" || item.category?.includes("server")) {
    return "8x 2.5\" Hot-Swap SAS/NVMe &bull; Dual 10G NIC";
  }
  if (role === "Firewall") {
    return "2x 10G WAN &bull; 1x DMZ &bull; 8x 1G LAN &bull; Mgmt Console";
  }
  if (role === "UPS" || item.category?.includes("ups")) {
    return "Smart-UPS LCD Diagnostics &bull; SmartSlot Card &bull; EPO";
  }
  if (role === "Structured Cabling" || item.category?.includes("patch")) {
    return "24-Port High-Density Keystone RJ45 Panel";
  }
  return null;
}

