// =========================================================================
// MOUNTING HOST & ENCLOSURE ELEVATION ENGINE (NetSelect Enterprise)
// Unified Visualizer for 5 Physical Mounting Hosts:
// 1. 19" EIA Equipment Racks (RU Rails, Depth Compliance, AC Power)
// 2. Security Cabinets (Trove / LSP Subplate Bays, DC Power, Standby Batteries)
// 3. Industrial DIN-Rail NEMA Enclosures (Wall or Pole Mount, DIN Tracks, Hardened Hardware)
// 4. Structural Mounts (Configurable Pole Height AGL, Masts, Parapets, Bollards, Wind/EPA)
// 5. Architectural Backboards (Plywood Wallfields, Telecom Punchblocks)
// Tied directly with FacilityStore & Served Edge Endpoints
// =========================================================================

let activeRackId = "MDF • Rack-1";
let activeRackHeight = 24;
let activeHostTab = "telemetry"; // "telemetry" | "endpoints"
let rackViewOrientation = "front"; // "front" | "rear"
let draggedRackItemInstanceId = null;

function isPassiveInfrastructure(item) {
  if (!item) return false;
  return Boolean(
    item.isPassive ||
    item.role === "Structured Cabling" ||
    (item.sku && (item.sku.startsWith("PP-") || item.sku.startsWith("HCM-"))) ||
    item.category === "Infrastructure" ||
    (item.model && (item.model.includes("Patch Panel") || item.model.includes("Cable Manager") || item.model.includes("Blank Panel")))
  );
}

function switchRackOrientation(orientation) {
  rackViewOrientation = (orientation === "rear") ? "rear" : "front";
  const frontBtn = document.getElementById("rackViewBtn-front");
  const rearBtn = document.getElementById("rackViewBtn-rear");
  if (frontBtn && rearBtn) {
    if (rackViewOrientation === "front") {
      frontBtn.className = "px-2.5 py-0.5 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 bg-indigo-600 text-white shadow-sm";
      rearBtn.className = "px-2.5 py-0.5 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 text-slate-400 hover:text-white";
    } else {
      frontBtn.className = "px-2.5 py-0.5 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 text-slate-400 hover:text-white";
      rearBtn.className = "px-2.5 py-0.5 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 bg-indigo-600 text-white shadow-sm";
    }
  }
  renderRackVisualizer();
  if (window.lucide) lucide.createIcons();
}
window.switchRackOrientation = switchRackOrientation;

function isRackModalVisible() {
  const modal = document.getElementById("facilityModal");
  return modal && !modal.classList.contains("hidden") && (typeof facilityActiveView === "undefined" || facilityActiveView === "visualizer");
}

function toggleRackModal() {
  const modal = document.getElementById("facilityModal");
  if (!modal) return;

  if (modal.classList.contains("hidden")) {
    modal.classList.remove("hidden");
    if (typeof switchFacilityView === "function") {
      switchFacilityView("visualizer");
    } else {
      syncRackSelectorOptions();
      loadRackSettings();
      renderRackVisualizer();
      if (window.lucide) lucide.createIcons();
    }
  } else {
    if (typeof facilityActiveView !== "undefined" && facilityActiveView === "visualizer") {
      modal.classList.add("hidden");
      draggedRackItemInstanceId = null;
    } else {
      if (typeof switchFacilityView === "function") {
        switchFacilityView("visualizer");
      }
    }
  }
}

function setHostSidebarTab(tabName) {
  activeHostTab = tabName === "endpoints" ? "endpoints" : (tabName === "staging" ? "staging" : "telemetry");
  
  const telBtn = document.getElementById("hostTabBtn-telemetry");
  const endBtn = document.getElementById("hostTabBtn-endpoints");
  const stgBtn = document.getElementById("hostTabBtn-staging");
  const telContent = document.getElementById("hostTabContent-telemetry");
  const endContent = document.getElementById("hostTabContent-endpoints");
  const stgContent = document.getElementById("hostTabContent-staging");

  const btns = [telBtn, endBtn, stgBtn];
  const contents = [telContent, endContent, stgContent];

  btns.forEach(b => {
    if (b) {
      b.classList.remove("text-white", "bg-indigo-600", "shadow");
      b.classList.add("text-slate-400");
    }
  });
  contents.forEach(c => {
    if (c) c.classList.add("hidden");
  });

  if (activeHostTab === "endpoints") {
    if (endBtn) { endBtn.classList.replace("text-slate-400", "text-white"); endBtn.classList.add("bg-indigo-600", "shadow"); }
    if (endContent) endContent.classList.remove("hidden");
  } else if (activeHostTab === "staging") {
    if (stgBtn) { stgBtn.classList.replace("text-slate-400", "text-white"); stgBtn.classList.add("bg-indigo-600", "shadow"); }
    if (stgContent) stgContent.classList.remove("hidden");
  } else {
    if (telBtn) { telBtn.classList.replace("text-slate-400", "text-white"); telBtn.classList.add("bg-indigo-600", "shadow"); }
    if (telContent) telContent.classList.remove("hidden");
  }

  if (window.lucide) lucide.createIcons();
}

// -----------------------------------------------------------
// Device & Form-Factor Compatibility Verification
// -----------------------------------------------------------
function checkDeviceHostCompatibility(item, hostType) {
  if (!item) return { compatible: true, matchBadge: "Universal", advisory: "" };

  const role = item.role || "";
  const cat = (item.category || "").toLowerCase();
  const model = item.model || "";
  const modelLower = model.toLowerCase();

  const isDinOnly = (item.isDinMounted || (item.mounting && /din/i.test(item.mounting))) && 
                    (!item.mounting || !item.mounting.includes("19\""));
  const isZeroU = (item.rackUnits !== undefined && parseInt(item.rackUnits, 10) === 0) || isDinOnly;

  const isRackDev = !isZeroU && (
    (item.rackUnits && parseInt(item.rackUnits, 10) > 0) || 
    (item.mounting && (item.mounting.includes("19\"") || item.mounting.toLowerCase().includes("rack")) && item.rackUnits !== 0) ||
    ((role === "Core" || role === "Core & Agg" || role === "Aggregation" || role === "Server" || role === "Storage" || role === "UPS" || role === "Structured Cabling") && item.rackUnits !== 0) ||
    (role === "Access" && item.rackUnits !== 0 && !isDinOnly)
  );

  const isSecurityDev = cat === "access_control" || role === "Access Control" || 
                        item.doorCapacity || item.controllerType || 
                        /lp1501|lp1502|lp2500|lp4502|mr52|mr50|mr16|trove|fpo|eflow/i.test(model);

  const isDinDev = item.isDinMounted || /din/i.test(model) || (item.mounting && /din/i.test(item.mounting)) || item.mounting === "DIN" || cat === "industrial_din";
  const isDinCapable = isDinDev || (
    !isRackDev &&
    (item.rackUnits === 0 || item.shallowDepth || /flex|ultra|lite/i.test(item.sku || '') || /flex|ultra|lite/i.test(model))
  );

  const isEdgeField = !isRackDev && !isDinCapable && (
                      role === "Surveillance" || role === "Video" || role === "Camera" || 
                      role === "Wireless Bridge" || role === "Wireless" || role === "Access Point" || 
                      role === "Accessory" || role === "Field" || role === "Sensor" || 
                      role === "Audio/Intercom" || cat === "surveillance" || cat === "cameras" || 
                      cat === "wireless" || cat === "field_hardware" || item.isFieldDevice === true ||
                      /\b(camera|cams?|dome|bullet|ptz|turret|fisheye|multisensor|nanobeam|gigabeam|airmax|wave|unifi\s*ap|access\s*point|intercom|horn|sensor|reader|keypad)\b/i.test(modelLower));

  if (hostType === "equipment_rack") {
    if (isEdgeField && !isRackDev) {
      return { compatible: false, matchBadge: "Field Device", advisory: "Field device (Camera/Radio/Sensor) - assign to floor or pole location" };
    }
    if (isDinDev && !isRackDev) {
      return { compatible: false, matchBadge: "DIN Form Factor", advisory: "Requires 19\" DIN bracket shelf to rack-mount" };
    }
    if (isSecurityDev && !isRackDev) {
      return { compatible: false, matchBadge: "Subplate Device", advisory: "Mounts inside Security Cabinet subplate" };
    }
    if (isRackDev) {
      return { compatible: true, matchBadge: "19\" EIA Match", advisory: "" };
    }
    return { compatible: false, matchBadge: "Non-Rackmount", advisory: "Device does not mount directly to 19\" EIA rack rails" };
  } else if (hostType === "security_cabinet") {
    if (isEdgeField) return { compatible: false, matchBadge: "Field Device", advisory: "Mounts at perimeter or door location" };
    if (isSecurityDev) return { compatible: true, matchBadge: "Subplate Match", advisory: "" };
    if (isRackDev) return { compatible: false, matchBadge: "Rackmount Chassis", advisory: "Large chassis requires 19\" EIA rack rails" };
    return { compatible: false, matchBadge: "Incompatible", advisory: "Cabinet requires subplate-mountable module" };
  } else if (hostType === "industrial_din") {
    if (isEdgeField) return { compatible: false, matchBadge: "Field Device", advisory: "Mounts at edge field location" };
    if (isDinDev) return { compatible: true, matchBadge: "DIN-Rail Match", advisory: "" };
    if (isDinCapable) return { compatible: true, matchBadge: "DIN-Mountable", advisory: "Attaches via TS-35 DIN-rail bracket" };
    if (isRackDev && (item.depthInches > 12 || parseInt(item.rackUnits, 10) > 1)) {
      return { compatible: false, matchBadge: "Exceeds Depth", advisory: "Full-depth 19\" unit exceeds NEMA box dimensions" };
    }
    return { compatible: false, matchBadge: "Incompatible", advisory: "Requires DIN-rail mounting form-factor" };
  } else if (hostType === "structural_mount") {
    if (isEdgeField || isDinDev) return { compatible: true, matchBadge: "Pole Compatible", advisory: "" };
    if (isRackDev) return { compatible: false, matchBadge: "Indoor Rackmount", advisory: "Indoor chassis cannot withstand outdoor pole exposure" };
    return { compatible: true, matchBadge: "Edge Mount", advisory: "" };
  } else if (hostType === "architectural_backboard") {
    if (isEdgeField) return { compatible: false, matchBadge: "Field Device", advisory: "Mounts at field/coverage location" };
    if (role === "Structured Cabling" || isSecurityDev || isDinDev || item.shallowDepth) {
      return { compatible: true, matchBadge: "Wallfield Match", advisory: "" };
    }
    if (isRackDev && parseInt(item.rackUnits, 10) > 2) {
      return { compatible: false, matchBadge: "Heavy Rackmount", advisory: "Deep chassis requires floor-standing rack" };
    }
    return { compatible: true, matchBadge: "Wallfield", advisory: "" };
  }

  return { compatible: true, matchBadge: "Universal", advisory: "" };
}

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

function getRackPduConfig() {
  const parsed = FacilityStore.parse(activeRackId);
  const enclosures = FacilityStore.getEnclosures();
  const activeEnc = enclosures.find(e => e.id === parsed.hostId) || enclosures.find(e => e.name.toLowerCase() === (parsed.hostName || '').toLowerCase()) || null;
  const saved = localStorage.getItem(`rack_pdu_config_${activeRackId}`);
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
    const feed = isFeedA ? (pduMetrics ? pduMetrics.pduA : { amps: 0, watts: 0, pct: 0, outletsUsed: 0 }) : (pduMetrics ? pduMetrics.pduB : { amps: 0, watts: 0, pct: 0, outletsUsed: 0 });
    const feedName = isFeedA ? (isRear ? "PDU-A" : "PDU-FL") : (isRear ? "PDU-B" : "PDU-FR");
    const feedSubtitle = isFeedA ? (isRear ? "Feed A (Util)" : "Front Feed A") : (isRear ? "Feed B (UPS)" : "Front Feed B");
    const feedColor = isFeedA ? "text-emerald-400" : "text-sky-400";
    const barBg = feed.pct > 80 ? "bg-rose-500" : (isFeedA ? "bg-emerald-500" : "bg-sky-500");
    const activeDotColor = isFeedA ? "text-emerald-400" : "text-sky-400";
    const activeBorderColor = isFeedA ? "border-emerald-500/50 bg-emerald-950/30" : "border-sky-500/50 bg-sky-950/30";

    return `
      <!-- 0U Vertical PDU Channel (${slotTitle}) -->
      <div class="w-20 sm:w-24 shrink-0 bg-slate-950 border border-slate-800 rounded-xl p-2 flex flex-col justify-between select-none shadow-md group relative">
        <div class="space-y-1 border-b border-slate-800 pb-2 text-center relative">
          <button 
            type="button" 
            onclick="event.stopPropagation(); openRackVerticalSlotPicker('${slotKey}')" 
            class="absolute top-0 right-0 p-0.5 rounded text-slate-500 hover:text-white hover:bg-slate-800 transition-colors opacity-0 group-hover:opacity-100" 
            title="Configure ${slotTitle} Slot"
          >
            <i data-lucide="settings" class="w-2.5 h-2.5"></i>
          </button>
          <div class="flex items-center justify-center gap-1 text-[11px] font-bold ${feedColor}">
            <i data-lucide="zap" class="w-3 h-3"></i> ${feedName}
          </div>
          <span class="text-[8.5px] text-slate-400 uppercase font-mono block">${slotTitle}</span>
          <span class="text-[8px] text-slate-500 uppercase font-mono block">${feedSubtitle}</span>
          <span class="text-[10px] font-mono font-bold text-white block">${feed.amps}A / 16A</span>
          <span class="text-[9px] font-mono text-slate-500 block">${feed.watts}W (${feed.pct}%)</span>
          <div class="w-full bg-slate-900 rounded-full h-1 mt-1 overflow-hidden">
            <div class="${barBg} h-1 rounded-full" style="width: ${feed.pct}%"></div>
          </div>
        </div>

        <!-- Vertical 24-Receptacle Visualizer -->
        <div class="py-2 space-y-1 flex-1 flex flex-col justify-around">
          ${Array.from({ length: 12 }, (_, oIdx) => {
            const isOccupied = (oIdx * 2) < feed.outletsUsed;
            return `
              <div class="flex items-center justify-between px-1 py-0.5 rounded bg-slate-900 border border-slate-800/80 text-[8px] font-mono ${isOccupied ? activeBorderColor : ''}">
                <span class="text-slate-500">${oIdx + 1}</span>
                <span class="${isOccupied ? `${activeDotColor} font-bold` : 'text-slate-700'}">●</span>
              </div>
            `;
          }).join('')}
        </div>

        <div class="pt-2 border-t border-slate-800 text-center">
          <span class="text-[8px] font-mono text-slate-400 block">${feed.outletsUsed}/24 Outlets</span>
          <span class="text-[8px] font-mono text-slate-500 block">NEMA 5-20R (0U)</span>
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

  const baseW = parseFloat(item.baseWatts) || 0;
  const inletType = (baseW > 1200) ? "C20 (16A/20A)" : "C14 (10A/15A)";
  const cordType = inletType.startsWith("C20") ? "C19-to-C20" : "C13-to-C14";

  return {
    psuCount,
    isDualModular,
    inletType,
    cordType,
    stackUnits
  };
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
    // Single feed toggles between PDU-A (connected) and None (unplugged)
    next = (current === "PDU-A" || current === "PDU-Main") ? "None" : "PDU-A";
  } else {
    // Dual feeds cycle: PDU-A -> PDU-B -> None -> PDU-A
    if (current === "PDU-A") next = "PDU-B";
    else if (current === "PDU-B") next = "None";
    else next = "PDU-A";
  }

  item.powerConnections[key] = next;
  FacilityStore.notifyWorkspaceChange();
  renderRackVisualizer();
}
window.toggleDevicePsuFeed = toggleDevicePsuFeed;

function autoBalanceRackPowerFeeds() {
  if (typeof projectBOM === "undefined") return;
  const assigned = projectBOM.filter(i => (FacilityStore.normalize(i.closetName || i.rackId) === activeRackId) && i.rackSlot);
  const pduConfig = getRackPduConfig();
  let singleCounter = 0;

  assigned.forEach(item => {
    const specs = getDevicePsuSpecs(item);
    if (!item.powerConnections) item.powerConnections = {};
    if (pduConfig === "single_vertical" || pduConfig === "horizontal") {
      item.powerConnections.psu1 = "PDU-A";
      if (specs.psuCount >= 2) item.powerConnections.psu2 = "PDU-A";
    } else {
      if (specs.psuCount >= 2) {
        item.powerConnections.psu1 = "PDU-A";
        item.powerConnections.psu2 = "PDU-B";
      } else {
        singleCounter++;
        item.powerConnections.psu1 = (singleCounter % 2 === 1) ? "PDU-A" : "PDU-B";
        delete item.powerConnections.psu2;
      }
    }
  });

  FacilityStore.notifyWorkspaceChange();
  renderRackVisualizer();
  if (typeof showToast === "function") {
    showToast(`Balanced power feeds across ${assigned.length} mounted units.`);
  }
}
window.autoBalanceRackPowerFeeds = autoBalanceRackPowerFeeds;

function calculateRackPduMetrics(assignedItems, activeEnc) {
  const pduConfig = getRackPduConfig();
  const voltage = 120;
  const circuitBreakerAmps = 20;
  const maxSafeAmps = 16.0; // 80% continuous NEC
  const maxSafeWatts = 1920;

  let pduALoadWatts = 0;
  let pduBLoadWatts = 0;
  let pduAOutletCount = 0;
  let pduBOutletCount = 0;
  let redundantDeviceCount = 0;
  let singlePointFailureCount = 0;
  let singleCordedCount = 0;

  assignedItems.forEach(item => {
    if (!item.rackSlot) return;
    const stackUnits = (item.stackedUnits && item.stackedUnits >= 2) ? item.stackedUnits : 1;
    const baseW = (parseFloat(item.baseWatts) || 0) * stackUnits;
    const poeW = (parseFloat(item.poeBudget) || 0) * stackUnits;
    const itemOperatingWatts = Math.round(baseW + (poeW * 0.5));

    const specs = getDevicePsuSpecs(item);
    const psuConn = getDevicePowerConnections(item);

    if (pduConfig === "single_vertical" || pduConfig === "horizontal") {
      // In single or horizontal PDU, all connected load goes to primary PDU-A
      const p1 = psuConn.psu1;
      const p2 = psuConn.psu2;
      if (p1 === "PDU-A" || p1 === "PDU-Main") {
        pduALoadWatts += (specs.psuCount >= 2 && p2 === "PDU-A") ? itemOperatingWatts : (specs.psuCount >= 2 ? itemOperatingWatts * 0.5 : itemOperatingWatts);
        pduAOutletCount++;
      }
      if (specs.psuCount >= 2 && (p2 === "PDU-A" || p2 === "PDU-Main")) {
        if (p1 !== "PDU-A" && p1 !== "PDU-Main") pduALoadWatts += itemOperatingWatts * 0.5;
        pduAOutletCount++;
      }
      singleCordedCount++;
    } else {
      // dual_vertical
      if (specs.psuCount >= 2) {
        const p1 = psuConn.psu1;
        const p2 = psuConn.psu2;

        if ((p1 === "PDU-A" && p2 === "PDU-B") || (p1 === "PDU-B" && p2 === "PDU-A")) {
          pduALoadWatts += (itemOperatingWatts * 0.5);
          pduBLoadWatts += (itemOperatingWatts * 0.5);
          pduAOutletCount++;
          pduBOutletCount++;
          redundantDeviceCount++;
        } else if (p1 === p2 && (p1 === "PDU-A" || p1 === "PDU-B")) {
          if (p1 === "PDU-A") {
            pduALoadWatts += itemOperatingWatts;
            pduAOutletCount += 2;
          } else {
            pduBLoadWatts += itemOperatingWatts;
            pduBOutletCount += 2;
          }
          singlePointFailureCount++;
        } else {
          if (p1 === "PDU-A" || p2 === "PDU-A") {
            pduALoadWatts += itemOperatingWatts;
            pduAOutletCount++;
          } else if (p1 === "PDU-B" || p2 === "PDU-B") {
            pduBLoadWatts += itemOperatingWatts;
            pduBOutletCount++;
          }
          singleCordedCount++;
        }
      } else {
        singleCordedCount++;
        if (psuConn.psu1 === "PDU-A") {
          pduALoadWatts += itemOperatingWatts;
          pduAOutletCount++;
        } else if (psuConn.psu1 === "PDU-B") {
          pduBLoadWatts += itemOperatingWatts;
          pduBOutletCount++;
        }
      }
    }
  });

  const pduAAmps = parseFloat((pduALoadWatts / voltage).toFixed(1));
  const pduBAmps = parseFloat((pduBLoadWatts / voltage).toFixed(1));
  const pduAPct = Math.min(100, Math.round((pduAAmps / maxSafeAmps) * 100));
  const pduBPct = Math.min(100, Math.round((pduBAmps / maxSafeAmps) * 100));
  const totalOutlets = (pduConfig === "horizontal") ? 8 : 24;

  return {
    voltage,
    circuitBreakerAmps,
    maxSafeAmps,
    maxSafeWatts,
    pduConfig,
    pduA: {
      label: (pduConfig === "horizontal") ? "1U Horizontal PDU" : (pduConfig === "single_vertical" ? "0U Vertical PDU" : "PDU-A"),
      subLabel: (pduConfig === "horizontal") ? "1U Rackmount Strip" : (pduConfig === "single_vertical" ? "Single 0U Feed" : "Feed A (Utility)"),
      watts: Math.round(pduALoadWatts),
      amps: pduAAmps,
      pct: pduAPct,
      outletsUsed: pduAOutletCount,
      totalOutlets,
      isOverloaded: pduAAmps > maxSafeAmps
    },
    pduB: {
      label: "PDU-B",
      subLabel: "Feed B (UPS)",
      watts: Math.round(pduBLoadWatts),
      amps: pduBAmps,
      pct: pduBPct,
      outletsUsed: pduBOutletCount,
      totalOutlets: 24,
      isOverloaded: pduBAmps > maxSafeAmps
    },
    redundancy: {
      redundantDeviceCount,
      singlePointFailureCount,
      singleCordedCount
    }
  };
}

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

// -----------------------------------------------------------
// Enclosure Selector & Taxonomy Synchronization
// -----------------------------------------------------------
function syncRackSelectorOptions() {
  const sel = document.getElementById("rackLocationSelector");
  const locations = FacilityStore.getLocations();
  // Filter out field hardware from enclosure visualizer dropdown
  const rackLocations = locations.filter(l => l.hostType !== "field" && !l.isField && !(typeof isFieldLocation === "function" && isFieldLocation(l.name)));
  const rackNames = rackLocations.map(l => l.name);

  activeRackId = FacilityStore.normalize(activeRackId);
  const parsedCheck = FacilityStore.parse(activeRackId);
  const isFieldAct = (typeof isFieldLocation === "function" && isFieldLocation(activeRackId)) || parsedCheck.isField;
  if (activeRackId === FacilityStore.UNASSIGNED || isFieldAct || !rackNames.includes(activeRackId)) {
    activeRackId = rackNames[0] || "";
  }

  const parsed = FacilityStore.parse(activeRackId);
  const enclosures = FacilityStore.getEnclosures();
  const activeEnc = enclosures.find(e => e.id === parsed.hostId) || enclosures.find(e => e.name.toLowerCase() === (parsed.hostName || '').toLowerCase()) || null;

  // Populate Enclosure Dropdown with Type Badges
  if (sel) {
    if (rackLocations.length === 0) {
      sel.innerHTML = `<option value="">(No Enclosures - Open Location Studio)</option>`;
    } else {
      sel.innerHTML = rackLocations.map(loc => {
        const typeDef = FacilityStore.HOST_TYPES[loc.hostType] || FacilityStore.HOST_TYPES.equipment_rack;
        const typeLabel = typeDef.badgeLabel || "Rack";
        const isSel = loc.name === activeRackId;
        return `<option value="${escapeHTML(loc.name)}" ${isSel ? 'selected' : ''}>[${typeLabel}] ${escapeHTML(loc.name)}</option>`;
      }).join('');
    }
  }

  const searchSel = document.getElementById("rackLocationSearchSelect");
  if (searchSel && searchSel.value !== activeRackId) {
    searchSel.value = activeRackId;
  }

  // Update Modal Header Badge & Icon
  const badgeEl = document.getElementById("hostTypeBadge");
  const iconEl = document.getElementById("hostHeaderIcon");
  const hostTypeDef = FacilityStore.HOST_TYPES[parsed.hostType] || FacilityStore.HOST_TYPES.equipment_rack;

  if (badgeEl) {
    badgeEl.innerText = hostTypeDef.label;
    badgeEl.className = `text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${getHostBadgeStyles(parsed.hostType)}`;
  }

  if (iconEl) {
    iconEl.setAttribute("data-lucide", hostTypeDef.icon || "server");
  }

  // Synchronize Dimension Control depending on Host Type
  syncHostDimensionControls(parsed, activeEnc);
}

function getHostBadgeStyles(hostType) {
  switch (hostType) {
    case "security_cabinet":
      return "bg-emerald-950/80 text-emerald-300 border-emerald-700/60";
    case "industrial_din":
      return "bg-amber-950/80 text-amber-300 border-amber-700/60";
    case "structural_mount":
      return "bg-cyan-950/80 text-cyan-300 border-cyan-700/60";
    case "architectural_backboard":
      return "bg-purple-950/80 text-purple-300 border-purple-700/60";
    default:
      return "bg-indigo-950/80 text-indigo-300 border-indigo-700/60";
  }
}

function syncHostDimensionControls(parsed, activeEnc) {
  const container = document.getElementById("hostDimensionControl");
  if (!container) return;

  const hostType = parsed.hostType;

  if (hostType === "security_cabinet") {
    const bays = (activeEnc && activeEnc.subplateBays) ? activeEnc.subplateBays : 8;
    container.innerHTML = `
      <span class="text-slate-400 font-medium">Bays:</span>
      <select onchange="updateActiveHostProperty('subplateBays', parseInt(this.value, 10))" class="bg-slate-950 border border-slate-700 text-emerald-300 font-mono rounded px-2 py-0.5 text-xs">
        <option value="4" ${bays === 4 ? 'selected' : ''}>4 Bays (Trove 1)</option>
        <option value="8" ${bays === 8 ? 'selected' : ''}>8 Bays (Trove 2)</option>
        <option value="12" ${bays === 12 ? 'selected' : ''}>12 Bays (Trove 3)</option>
        <option value="16" ${bays === 16 ? 'selected' : ''}>16 Bays (LifeSafety ProWire)</option>
      </select>
    `;
  } else if (hostType === "industrial_din") {
    const rails = (activeEnc && activeEnc.dinRails) ? activeEnc.dinRails : 2;
    const mounting = (activeEnc && activeEnc.mountingMethod) ? activeEnc.mountingMethod : (parsed.mountingMethod || "wall");
    container.innerHTML = `
      <span class="text-slate-400 font-medium">Mount:</span>
      <select onchange="updateActiveHostProperty('mountingMethod', this.value)" class="bg-slate-950 border border-slate-700 text-amber-300 font-bold rounded px-2 py-0.5 text-xs">
        <option value="wall" ${mounting === 'wall' ? 'selected' : ''}>Wall Flange</option>
        <option value="pole" ${mounting === 'pole' ? 'selected' : ''}>Pole Banding</option>
      </select>
      <span class="text-slate-400 font-medium">Rails:</span>
      <select onchange="updateActiveHostProperty('dinRails', parseInt(this.value, 10))" class="bg-slate-950 border border-slate-700 text-white font-mono rounded px-2 py-0.5 text-xs">
        <option value="1" ${rails === 1 ? 'selected' : ''}>1 Rail</option>
        <option value="2" ${rails === 2 ? 'selected' : ''}>2 Rails</option>
        <option value="3" ${rails === 3 ? 'selected' : ''}>3 Rails</option>
        <option value="4" ${rails === 4 ? 'selected' : ''}>4 Rails</option>
      </select>
    `;
  } else if (hostType === "structural_mount") {
    let currentSpace = null;
    if (parsed.spaceId) {
      currentSpace = FacilityStore.getSpaces().find(s => s.id === parsed.spaceId);
    }
    if (!currentSpace && parsed.space) {
      currentSpace = FacilityStore.getSpaces().find(s => s.name.toLowerCase() === parsed.space.toLowerCase());
    }
    const poleHeight = (currentSpace && currentSpace.poleHeightFt) ? currentSpace.poleHeightFt : ((activeEnc && activeEnc.poleHeightFt) ? activeEnc.poleHeightFt : (parsed.poleHeightFt || 25));
    const diam = (currentSpace && currentSpace.poleDiameterInches) ? currentSpace.poleDiameterInches : ((activeEnc && activeEnc.poleDiameterInches) ? activeEnc.poleDiameterInches : 4);

    container.innerHTML = `
      <span class="text-slate-400 font-medium">Height:</span>
      <select onchange="updateActiveHostProperty('poleHeightFt', parseInt(this.value, 10))" class="bg-slate-950 border border-slate-700 text-cyan-300 font-bold rounded px-2 py-0.5 text-xs">
        <option value="12" ${poleHeight === 12 ? 'selected' : ''}>12 ft AGL</option>
        <option value="15" ${poleHeight === 15 ? 'selected' : ''}>15 ft AGL</option>
        <option value="20" ${poleHeight === 20 ? 'selected' : ''}>20 ft AGL</option>
        <option value="25" ${poleHeight === 25 ? 'selected' : ''}>25 ft AGL</option>
        <option value="30" ${poleHeight === 30 ? 'selected' : ''}>30 ft AGL</option>
        <option value="40" ${poleHeight === 40 ? 'selected' : ''}>40 ft AGL</option>
      </select>
      <span class="text-slate-400 font-medium">Mast O.D.:</span>
      <select onchange="updateActiveHostProperty('poleDiameterInches', parseInt(this.value, 10))" class="bg-slate-950 border border-slate-700 text-white font-mono rounded px-2 py-0.5 text-xs">
        <option value="2" ${diam === 2 ? 'selected' : ''}>2" Pipe</option>
        <option value="3" ${diam === 3 ? 'selected' : ''}>3" Mast</option>
        <option value="4" ${diam === 4 ? 'selected' : ''}>4" Mast</option>
        <option value="6" ${diam === 6 ? 'selected' : ''}>6" Bollard</option>
      </select>
    `;
  } else if (hostType === "architectural_backboard") {
    const w = (activeEnc && activeEnc.widthFt) ? activeEnc.widthFt : 4;
    container.innerHTML = `
      <span class="text-slate-400 font-medium">Plywood:</span>
      <select onchange="updateActiveHostProperty('widthFt', parseInt(this.value, 10))" class="bg-slate-950 border border-slate-700 text-purple-300 font-mono rounded px-2 py-0.5 text-xs">
        <option value="4" ${w === 4 ? 'selected' : ''}>4' x 8' Sheet (32 sq ft)</option>
        <option value="8" ${w === 8 ? 'selected' : ''}>8' x 8' Wallfield (64 sq ft)</option>
        <option value="12" ${w === 12 ? 'selected' : ''}>12' x 8' Room Field (96 sq ft)</option>
      </select>
    `;
  } else {
    // Standard 19" EIA Rack
    container.innerHTML = `
      <span class="text-slate-400 font-medium">Height:</span>
      <select id="rackHeightSelector" onchange="setRackHeight(this.value)" class="bg-slate-950 border border-slate-700 text-white font-mono rounded px-2 py-0.5 text-xs">
        <option value="12" ${activeRackHeight === 12 ? 'selected' : ''}>12U Wallbox</option>
        <option value="18" ${activeRackHeight === 18 ? 'selected' : ''}>18U Wallbox</option>
        <option value="24" ${activeRackHeight === 24 ? 'selected' : ''}>24U Half-Rack</option>
        <option value="42" ${activeRackHeight === 42 ? 'selected' : ''}>42U Full-Rack</option>
        <option value="48" ${activeRackHeight === 48 ? 'selected' : ''}>48U Enterprise</option>
      </select>
    `;
  }
}

function updateActiveHostProperty(propKey, value) {
  const parsed = FacilityStore.parse(activeRackId);
  if (parsed.hostId) {
    FacilityStore.updateHost(parsed.hostId, { [propKey]: value });
  } else if (parsed.spaceId && (parsed.isStructuralMount || parsed.hostType === "structural_mount")) {
    FacilityStore.updateSpace(parsed.spaceId, { [propKey]: value });
  }
  renderRackVisualizer();
  if (typeof showToast === "function") {
    showToast(`Updated ${parsed.hostName} ${propKey} to ${value}`);
  }
}

function updatePoleZoneHeight(spaceId, zoneId, heightVal) {
  if (!spaceId) {
    const parsed = FacilityStore.parse(activeRackId);
    spaceId = parsed.spaceId;
  }
  if (!spaceId) return;

  const updates = {};
  if (zoneId === "Mid-Pole") {
    updates.poleMidHeightFt = heightVal;
    // Also update any enclosures banded to this pole space
    const enclosures = FacilityStore.getEnclosures(spaceId);
    enclosures.forEach(enc => {
      FacilityStore.updateHost(enc.id, { mountHeightFt: heightVal });
    });
  } else if (zoneId === "Upper-Pole") {
    updates.poleUpperHeightFt = heightVal;
  }

  FacilityStore.updateSpace(spaceId, updates);
  FacilityStore.notifyWorkspaceChange();
  renderRackVisualizer();
  if (typeof showToast === "function") {
    showToast(`Adjusted ${zoneId} elevation to ${heightVal} ft AGL`);
  }
}

function switchActiveRackElevation(rackName) {
  activeRackId = FacilityStore.normalize(rackName);
  loadRackSettings();
  syncRackSelectorOptions();
  if (typeof syncVisualizerBreadcrumbs === "function") {
    syncVisualizerBreadcrumbs();
  }
  renderRackVisualizer();
}

function setRackHeight(heightVal) {
  activeRackHeight = parseInt(heightVal, 10) || 24;
  saveRackSettings();
  const parsed = FacilityStore.parse(activeRackId);
  if (parsed.hostId) {
    FacilityStore.updateHost(parsed.hostId, { heightU: activeRackHeight });
  }
  renderRackVisualizer();
  if (typeof showToast === "function") {
    showToast(`Set ${activeRackId} height to ${activeRackHeight}U`);
  }
}

function promptCreateNewRack() {
  if (typeof openQuickAddEnclosureModal === "function") {
    openQuickAddEnclosureModal();
    return;
  }
  if (typeof openFacilityAddForm === "function") {
    openFacilityAddForm("add_host");
    return;
  }

  const currentCount = FacilityStore.getLocations().length;
  const name = prompt(
    "Enter new Enclosure name (e.g. IDF-2 • Rack-1, MDF • Security-Cab-1, Pole 1 • NEMA-Box):",
    `IDF-${currentCount} • Rack-1`
  );
  if (!name || !name.trim()) return;

  const trimmed = name.trim();
  let hostType = "equipment_rack";
  const lower = trimmed.toLowerCase();
  if (lower.includes("nema") || lower.includes("din")) hostType = "industrial_din";
  else if (lower.includes("panel") || lower.includes("trove") || lower.includes("sec") || lower.includes("ac-")) hostType = "security_cabinet";
  else if (lower.includes("pole") || lower.includes("mast")) hostType = "structural_mount";
  else if (lower.includes("backboard") || lower.includes("plywood")) hostType = "architectural_backboard";

  const createdName = FacilityStore.addLocation(trimmed, hostType);
  activeRackId = createdName;
  syncRackSelectorOptions();
  renderRackVisualizer();
  if (typeof showToast === "function") {
    showToast(`Created ${createdName} (${FacilityStore.HOST_TYPES[hostType].label})`);
  }
}

function deleteActiveRackElevation() {
  const locations = FacilityStore.getLocationNames(false);
  if (locations.length <= 1) {
    alert("You must retain at least one rack or enclosure in the project.");
    return;
  }

  const fallbackRack = locations.find(r => r !== activeRackId) || "MDF • Rack-1";

  if (!confirm(`Delete enclosure "${activeRackId}"? All assigned hardware will be moved to "${fallbackRack}".`)) {
    return;
  }

  const success = FacilityStore.deleteLocation(activeRackId, fallbackRack);
  if (success) {
    activeRackId = fallbackRack;
    syncRackSelectorOptions();
    renderRackVisualizer();
    if (typeof showToast === "function") {
      showToast(`Enclosure removed. Hardware moved to ${fallbackRack}.`);
    }
  }
}

// -----------------------------------------------------------
// Auto-Mount & Unmount Actions (With Form-Factor & Priority Alignment)
// Top-to-Bottom Logic: ISP > Firewalls > Core > Aggregation > Access (by port count desc) > Servers > UPSes
// -----------------------------------------------------------
function autoMountAllToActiveRack() {
  if (typeof projectBOM === "undefined") return;

  const parsed = FacilityStore.parse(activeRackId);
  const hostType = parsed.hostType;

  // Filter mountable items: Only auto-mount form-factor compatible hardware
  const mountableItems = projectBOM.filter(item => {
    if (item.parentInstanceId) return false;
    if (item.role === "Optics & DAC" || item.role === "Mgmt License" || item.role === "Security License") return false;

    const itemLoc = FacilityStore.normalize(item.closetName || item.rackId);
    if (itemLoc !== activeRackId && itemLoc !== FacilityStore.UNASSIGNED) return false;

    const compat = checkDeviceHostCompatibility(item, hostType);
    return compat.compatible;
  });

  // Sort according to Enterprise Priority:
  // ISP Equipment > Firewalls > Core > Aggregation > Access (by port count desc) > Servers > UPSes > Other
  mountableItems.sort((a, b) => {
    const pA = getDeviceMountPriority(a);
    const pB = getDeviceMountPriority(b);
    if (pA.priority !== pB.priority) {
      return pA.priority - pB.priority;
    }
    // Access switches or switches sort by port count descending
    if (pA.priority === 5 || pA.portCount || pB.portCount) {
      const portDiff = (pB.portCount || 0) - (pA.portCount || 0);
      if (portDiff !== 0) return portDiff;
    }
    return (a.model || "").localeCompare(b.model || "");
  });

  let mountedCount = 0;

  if (hostType === "equipment_rack") {
    // 19" Rack U-slot filling
    const slots = {};
    for (let u = 1; u <= activeRackHeight; u++) slots[u] = null;
    mountableItems.forEach(i => i.rackSlot = null);

    // Split UPS / battery units (placed at bottom U1+) from data / network gear (placed top-down)
    const upsItems = mountableItems.filter(i => getDeviceMountPriority(i).priority === 7);
    const nonUpsItems = mountableItems.filter(i => getDeviceMountPriority(i).priority !== 7);

    // 1. Mount network & server gear top-to-bottom: ISP > Firewalls > Core > Aggregation > Access > Servers
    nonUpsItems.forEach(item => {
      const rawRU = (item.rackUnits !== undefined && item.rackUnits !== null) ? parseInt(item.rackUnits, 10) : 1;
      if (rawRU === 0) return; // 0U accessories or DIN devices do not consume vertical rack rail slots
      const stackUnits = (item.stackedUnits && item.stackedUnits >= 2) ? item.stackedUnits : 1;
      const ppOffset = (stackUnits >= 2 && item.patchPanelBetween) ? (stackUnits - 1) : 0;
      const itemHeight = (rawRU * stackUnits) + ppOffset;
      const slot = findNextAvailableSlotFromTop(slots, itemHeight, activeRackHeight);
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

    // 2. Mount heavy UPS / battery backup systems at the bottom of the rack (U1+) ascending
    upsItems.forEach(item => {
      const rawRU = (item.rackUnits !== undefined && item.rackUnits !== null) ? parseInt(item.rackUnits, 10) : 2;
      if (rawRU === 0) return;
      const stackUnits = (item.stackedUnits && item.stackedUnits >= 2) ? item.stackedUnits : 1;
      const ppOffset = (stackUnits >= 2 && item.patchPanelBetween) ? (stackUnits - 1) : 0;
      const itemHeight = (rawRU * stackUnits) + ppOffset;
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
  } else if (hostType === "security_cabinet") {
    // Subplate bays
    const enclosures = FacilityStore.getEnclosures();
    const activeEnc = enclosures.find(e => e.id === parsed.hostId);
    const maxBays = (activeEnc && activeEnc.subplateBays) ? activeEnc.subplateBays : 8;

    mountableItems.forEach((item, idx) => {
      const bayNum = (idx % maxBays) + 1;
      item.rackSlot = `Bay-${bayNum}`;
      item.closetName = activeRackId;
      item.rackId = activeRackId;
      mountedCount++;
    });
  } else if (hostType === "industrial_din") {
    // DIN Rails
    const enclosures = FacilityStore.getEnclosures();
    const activeEnc = enclosures.find(e => e.id === parsed.hostId);
    const maxRails = (activeEnc && activeEnc.dinRails) ? activeEnc.dinRails : 2;

    mountableItems.forEach((item, idx) => {
      const railNum = (idx % maxRails) + 1;
      item.rackSlot = `Rail-${railNum}`;
      item.closetName = activeRackId;
      item.rackId = activeRackId;
      mountedCount++;
    });
  } else if (hostType === "structural_mount") {
    // Pole elevations
    const zones = ["Top-Mast", "Upper-Pole", "Mid-Pole", "Base-Handhole"];
    mountableItems.forEach((item, idx) => {
      item.rackSlot = zones[idx % zones.length];
      item.closetName = activeRackId;
      item.rackId = activeRackId;
      mountedCount++;
    });
  } else {
    // Architectural Backboard
    const zones = ["Demarc-NID", "Punchdown-Block", "Wall-Bracket", "Power-Zone"];
    mountableItems.forEach((item, idx) => {
      item.rackSlot = zones[idx % zones.length];
      item.closetName = activeRackId;
      item.rackId = activeRackId;
      mountedCount++;
    });
  }

  FacilityStore.notifyWorkspaceChange();
  renderRackVisualizer();
  if (typeof showToast === "function") {
    showToast(`Mounted ${mountedCount} compatible unit${mountedCount === 1 ? '' : 's'} into ${activeRackId}.`);
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
// Cross-Location Hardware Transfer Bar & Mechanics
// -----------------------------------------------------------
function handleLocationTransferDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
  const el = e.currentTarget;
  if (el) {
    el.classList.add("ring-2", "ring-indigo-400", "scale-[1.02]", "bg-indigo-950/80");
  }
}

function handleLocationTransferDragLeave(e) {
  const el = e.currentTarget;
  if (el) {
    el.classList.remove("ring-2", "ring-indigo-400", "scale-[1.02]", "bg-indigo-950/80");
  }
}

function handleLocationTransferDrop(e, targetLocationName) {
  e.preventDefault();
  const el = e.currentTarget;
  if (el) {
    el.classList.remove("ring-2", "ring-indigo-400", "scale-[1.02]", "bg-indigo-950/80");
  }

  const instanceId = draggedRackItemInstanceId || e.dataTransfer.getData("text/plain");
  if (!instanceId || typeof projectBOM === "undefined") return;

  const item = projectBOM.find(i => i.instanceId === instanceId);
  if (!item) return;

  const prevLocation = item.closetName || item.rackId || "Unassigned";
  const targetNorm = FacilityStore.normalize(targetLocationName);

  if (targetNorm === FacilityStore.UNASSIGNED) {
    item.closetName = FacilityStore.UNASSIGNED;
    item.rackId = FacilityStore.UNASSIGNED;
    item.rackSlot = null;
  } else {
    item.closetName = targetNorm;
    item.rackId = targetNorm;
    item.rackSlot = null;
  }

  FacilityStore.notifyWorkspaceChange();
  renderRackVisualizer();
  if (typeof showToast === "function") {
    showToast(`Transferred ${item.model} to ${targetNorm}`);
  }
  draggedRackItemInstanceId = null;
}

function renderRackLocationTransferBar() {
  const container = document.getElementById("rackLocationTransferBar");
  if (!container) return;

  const allLocations = FacilityStore.getLocations(false);
  const locations = allLocations.filter(l => l.hostType !== "field" && !l.isField && !(typeof isFieldLocation === "function" && isFieldLocation(l.name)));
  if (locations.length === 0) {
    container.innerHTML = "";
    return;
  }

  const counts = {};
  let unassignedCount = 0;
  if (typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) {
    projectBOM.forEach(item => {
      if (item.parentInstanceId) return;
      const rawLoc = item.closetName || item.rackId;
      const norm = FacilityStore.normalize(rawLoc);
      if (norm === FacilityStore.UNASSIGNED) {
        unassignedCount++;
      } else {
        counts[norm] = (counts[norm] || 0) + 1;
      }
    });
  }

  let activeNorm = FacilityStore.normalize(activeRackId);
  const isFieldAct = (typeof isFieldLocation === "function" && isFieldLocation(activeNorm)) || FacilityStore.parse(activeNorm).isField;
  if (isFieldAct || !locations.some(l => l.name === activeNorm)) {
    activeNorm = locations[0] ? locations[0].name : "";
    activeRackId = activeNorm;
  }

  let html = `
    <div class="p-2.5 bg-slate-950/80 border border-slate-800 rounded-xl shadow-inner">
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <!-- Searchable Mounting Location Selector -->
        <div class="flex items-center gap-2 flex-1 min-w-[280px]">
          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5 shrink-0">
            <i data-lucide="map-pin" class="w-3.5 h-3.5 text-indigo-400"></i>
            <span>Mounting Location:</span>
          </span>
          <div class="relative flex-1">
            <select 
              id="rackLocationSearchSelect" 
              onchange="switchActiveRackElevation(this.value)" 
              class="w-full bg-slate-900 border border-slate-700 hover:border-indigo-500 text-indigo-300 font-bold rounded-lg px-2.5 py-1.5 text-xs focus:border-indigo-500 focus:outline-none cursor-pointer shadow-sm font-mono"
              title="Select active enclosure/mounting host to display"
            >
              ${locations.map(loc => {
                const isCurrent = loc.name === activeNorm;
                const count = counts[loc.name] || 0;
                const typeDef = FacilityStore.HOST_TYPES[loc.hostType] || FacilityStore.HOST_TYPES.equipment_rack;
                const typeLabel = typeDef.badgeLabel || "Rack";
                return `<option value="${escapeHTML(loc.name)}" ${isCurrent ? 'selected' : ''}>[${typeLabel}] ${escapeHTML(loc.name)} (${count} unit${count === 1 ? '' : 's'})</option>`;
              }).join('')}
            </select>
          </div>
        </div>

        <!-- Target Transfer Drop Dock & Unassigned Bin -->
        <div class="flex items-center gap-2 shrink-0">
          <div 
            id="locationTransferDropTarget"
            class="px-3 py-1.5 rounded-lg border border-dashed border-indigo-500/60 bg-indigo-950/40 hover:bg-indigo-900/60 text-indigo-300 text-xs font-semibold flex items-center gap-1.5 transition-all select-none cursor-copy"
            title="Drag any equipment here to transfer into active location (${escapeHTML(activeNorm)})"
            ondragover="handleLocationTransferDragOver(event)"
            ondragleave="handleLocationTransferDragLeave(event)"
            ondrop="handleLocationTransferDrop(event, activeRackId)"
          >
            <i data-lucide="arrow-down-to-dot" class="w-3.5 h-3.5 text-indigo-400"></i>
            <span>Drop to Transfer to Active Location</span>
          </div>

          <div 
            class="px-3 py-1.5 rounded-lg bg-amber-950/30 hover:bg-amber-950/50 border border-dashed border-amber-600/50 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer select-none"
            title="Drag equipment here to unmount and return to Unassigned shelf"
            ondragover="handleLocationTransferDragOver(event)"
            ondragleave="handleLocationTransferDragLeave(event)"
            ondrop="handleLocationTransferDrop(event, 'Unassigned')"
          >
            <i data-lucide="inbox" class="w-3.5 h-3.5 text-amber-400"></i>
            <span>Unassigned Bin</span>
            <span class="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-900/60 text-amber-200 font-bold">${unassignedCount}</span>
          </div>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;
}

// -----------------------------------------------------------
// Physical Enclosure Catalog Hardware Specification Bar
// -----------------------------------------------------------
function renderEnclosureHardwareBar(activeEnc, parsed) {
  const container = document.getElementById("enclosureHardwareBar");
  if (!container) return;

  if (!activeEnc) {
    container.innerHTML = "";
    container.classList.add("hidden");
    return;
  }

  container.classList.remove("hidden");
  const hostType = parsed.hostType || activeEnc.hostType || "equipment_rack";
  const catalogRacks = (typeof CatalogRegistry !== "undefined" && typeof CatalogRegistry.getRacks === "function")
    ? CatalogRegistry.getRacks(hostType)
    : [];

  const vendor = activeEnc.catalogVendor || "Generic";
  const sku = activeEnc.catalogSku || "CUSTOM-RACK";
  const model = activeEnc.catalogModel || activeEnc.name || "Physical Enclosure";
  const msrp = (activeEnc.msrp !== undefined) ? activeEnc.msrp : 0;
  const maxWeight = activeEnc.maxWeightLbs || (hostType === "equipment_rack" ? 3000 : 250);
  const tareWeight = activeEnc.tareWeightLbs || (hostType === "equipment_rack" ? 275 : 45);
  const depth = activeEnc.depthInches || (hostType === "equipment_rack" ? 42 : 12);
  const doorType = activeEnc.doorType || "Standard";
  const inBOM = (typeof FacilityStore !== "undefined" && typeof FacilityStore.isEnclosureInBOM === "function")
    ? FacilityStore.isEnclosureInBOM(activeEnc.id)
    : Boolean(activeEnc.inBOM);

  // Form factor label
  let formFactorBadge = "";
  if (hostType === "equipment_rack") {
    formFactorBadge = `${activeEnc.heightU || activeRackHeight || 24}U EIA-310-D`;
  } else if (hostType === "security_cabinet") {
    formFactorBadge = `${activeEnc.subplateBays || 8}-Bay Subplate`;
  } else if (hostType === "industrial_din") {
    formFactorBadge = `${activeEnc.dinRails || 2}x DIN Rail (NEMA 4X)`;
  } else if (hostType === "architectural_backboard") {
    formFactorBadge = `${activeEnc.widthFt || 4}'x${activeEnc.heightFt || 8}' Plywood`;
  } else {
    formFactorBadge = "Structural Mount";
  }

  // Build catalog part selector options
  let optionsHtml = "";
  if (catalogRacks.length > 0) {
    optionsHtml = catalogRacks.map(r => {
      const isSelected = r.sku === sku || (r.sku && sku && r.sku.toLowerCase() === sku.toLowerCase());
      return `<option value="${escapeHTML(r.sku)}" ${isSelected ? 'selected' : ''}>${escapeHTML(r.vendor)} ${escapeHTML(r.sku)} - ${escapeHTML(r.model)} ($${(r.msrp || 0).toLocaleString()})</option>`;
    }).join('');
  }

  // If current part is custom or not in catalogRacks, add it
  const matchInList = catalogRacks.some(r => r.sku === sku);
  if (!matchInList && sku) {
    optionsHtml = `<option value="${escapeHTML(sku)}" selected>${escapeHTML(vendor)} ${escapeHTML(sku)} (Custom Model)</option>` + optionsHtml;
  }

  container.innerHTML = `
    <div class="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-indigo-500/40 rounded-xl p-3 shadow-lg select-none">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <!-- Left: Hardware Identity & Specs -->
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 shadow-inner">
            <i data-lucide="${hostType === 'security_cabinet' ? 'shield' : (hostType === 'industrial_din' ? 'box' : (hostType === 'architectural_backboard' ? 'layers' : 'server'))}" class="w-5 h-5"></i>
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-2 flex-wrap mb-0.5">
              <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-700/60 shadow-sm flex items-center gap-1">
                <i data-lucide="tag" class="w-2.5 h-2.5"></i>
                ${escapeHTML(vendor)} &bull; ${escapeHTML(sku)}
              </span>
              <span class="text-xs font-bold text-white truncate max-w-xs md:max-w-md" title="${escapeHTML(model)}">
                ${escapeHTML(model)}
              </span>
            </div>
            <!-- Dimension & Rating Badges -->
            <div class="flex items-center gap-1.5 flex-wrap text-[9.5px] font-mono text-slate-400">
              <span class="px-1.5 py-0.2 rounded bg-slate-950 border border-slate-800 text-slate-300 font-bold">${formFactorBadge}</span>
              ${depth ? `<span class="px-1.5 py-0.2 rounded bg-slate-950 border border-slate-800 text-cyan-300 font-bold">${depth}" Usable Depth</span>` : ''}
              <span class="px-1.5 py-0.2 rounded bg-slate-950 border border-slate-800 text-emerald-300 font-bold">${maxWeight.toLocaleString()} lbs Capacity</span>
              <span class="px-1.5 py-0.2 rounded bg-slate-950 border border-slate-800 text-slate-400">${tareWeight} lbs Tare</span>
              ${doorType ? `<span class="px-1.5 py-0.2 rounded bg-slate-950 border border-slate-800 text-purple-300">${escapeHTML(doorType)}</span>` : ''}
            </div>
          </div>
        </div>

        <!-- Right: Real Catalog Switcher Dropdown & 1-Click BOM Toggle -->
        <div class="flex items-center gap-2.5 ml-auto">
          <!-- Catalog Hardware Model Switcher -->
          <div class="flex items-center gap-1.5">
            <label class="text-[10px] uppercase font-bold text-slate-400 font-mono hidden sm:inline">Model:</label>
            <select 
              id="enclosureModelSelect" 
              onchange="window.handleEnclosureHardwareChange('${activeEnc.id}', this.value)"
              class="bg-slate-950 border border-slate-700 hover:border-indigo-500 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 font-medium focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer max-w-[210px] sm:max-w-[260px] truncate"
              title="Select physical enclosure hardware from catalog"
            >
              ${optionsHtml}
            </select>
          </div>

          <!-- MSRP Price Display -->
          <div class="text-right px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800/80">
            <span class="text-[9px] uppercase font-mono text-slate-400 block leading-tight">MSRP</span>
            <span class="text-xs font-mono font-bold text-emerald-400">$${msrp.toLocaleString()}</span>
          </div>

          <!-- 1-Click Project BOM & Quote Toggle Button -->
          <button 
            type="button"
            onclick="window.toggleEnclosureBOM('${activeEnc.id}')"
            class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer ${inBOM ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/40' : 'bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white border border-slate-700'}"
            title="${inBOM ? 'Physical enclosure included in Project BOM Quote. Click to remove.' : 'Click to include physical enclosure frame in Project BOM & Quote'}"
          >
            <i data-lucide="${inBOM ? 'check' : 'plus'}" class="w-3.5 h-3.5"></i>
            <span>${inBOM ? 'In BOM Quote' : '+ Add to Quote'}</span>
          </button>
        </div>
      </div>
    </div>
  `;

  if (window.lucide) lucide.createIcons();
}

function handleEnclosureHardwareChange(enclosureId, sku) {
  if (typeof FacilityStore !== "undefined" && typeof FacilityStore.setEnclosureCatalogPart === "function") {
    FacilityStore.setEnclosureCatalogPart(enclosureId, sku, true);
    loadRackSettings();
    if (typeof renderRackVisualizer === "function") renderRackVisualizer();
    if (typeof renderFacilityManager === "function") renderFacilityManager();
    if (typeof renderBOM === "function") renderBOM();
    if (typeof updateBOMView === "function") updateBOMView();
    if (typeof showToast === "function") {
      const rack = typeof CatalogRegistry !== "undefined" ? CatalogRegistry.getRack(sku) : null;
      showToast(`Enclosure hardware updated to ${rack ? rack.vendor + ' ' + rack.sku : sku}`);
    }
  }
}
window.handleEnclosureHardwareChange = handleEnclosureHardwareChange;

function toggleEnclosureBOM(enclosureId) {
  if (typeof FacilityStore !== "undefined" && typeof FacilityStore.syncEnclosureToBOM === "function") {
    const isCurrentlyIn = FacilityStore.isEnclosureInBOM(enclosureId);
    FacilityStore.syncEnclosureToBOM(enclosureId, !isCurrentlyIn);
    if (typeof renderRackVisualizer === "function") renderRackVisualizer();
    if (typeof renderFacilityManager === "function") renderFacilityManager();
    if (typeof renderBOM === "function") renderBOM();
    if (typeof updateBOMView === "function") updateBOMView();
    if (typeof showToast === "function") {
      showToast(!isCurrentlyIn ? "Enclosure added to Project BOM & Quote" : "Enclosure removed from Project BOM");
    }
  }
}
window.toggleEnclosureBOM = toggleEnclosureBOM;

// -----------------------------------------------------------
// Main Visualizer Router
// -----------------------------------------------------------
function renderRackVisualizer() {
  const frame = document.getElementById("rackElevationFrame");
  if (!frame) return;

  syncRackSelectorOptions();
  renderRackLocationTransferBar();

  const locations = FacilityStore.getLocations();
  const rackLocations = locations.filter(l => l.hostType !== "field" && !l.isField);

  if (rackLocations.length === 0 || !activeRackId) {
    const barEl = document.getElementById("enclosureHardwareBar");
    if (barEl) { barEl.innerHTML = ""; barEl.classList.add("hidden"); }

    frame.innerHTML = `
      <div class="h-full min-h-[380px] flex flex-col items-center justify-center p-8 text-center bg-slate-950/60 rounded-xl border border-dashed border-slate-800">
        <div class="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4">
          <i data-lucide="server" class="w-8 h-8 opacity-75"></i>
        </div>
        <h3 class="text-base font-bold text-white mb-1">No Enclosures Defined</h3>
        <p class="text-xs text-slate-400 max-w-sm mb-4">
          Base projects start blank. Create an equipment rack, wall cabinet, or NEMA enclosure in Location Studio to begin elevation mounting.
        </p>
        <button onclick="openFacilityModal('hierarchy')" class="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold shadow flex items-center gap-2 transition-colors cursor-pointer">
          <i data-lucide="plus" class="w-4 h-4"></i> Open Location Studio
        </button>
      </div>
    `;
    const titleEl = document.getElementById("elevationFrameTitle");
    if (titleEl) {
      titleEl.innerHTML = `<span class="text-slate-500 font-normal">No Active Enclosure</span>`;
    }
    const unassignedItems = (typeof projectBOM !== "undefined" && Array.isArray(projectBOM))
      ? projectBOM.filter(item => !item.parentInstanceId && FacilityStore.normalize(item.closetName || item.rackId) === FacilityStore.UNASSIGNED)
      : [];
    renderRackUnassignedStagingDock(unassignedItems, { hostType: "equipment_rack" }, null);
    renderHostStagingDrawer(unassignedItems, { hostType: "equipment_rack" }, null);
    if (window.lucide) lucide.createIcons();
    return;
  }

  const parsed = FacilityStore.parse(activeRackId);
  const hostType = parsed.hostType || "equipment_rack";
  const enclosures = FacilityStore.getEnclosures();
  const activeEnc = enclosures.find(e => e.id === parsed.hostId) || enclosures.find(e => e.name.toLowerCase() === (parsed.hostName || '').toLowerCase()) || null;

  if (activeEnc && activeEnc.heightU && activeEnc.hostType === "equipment_rack") {
    activeRackHeight = activeEnc.heightU;
  }

  const assignedItems = [];
  const unassignedItems = [];

  if (typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) {
    projectBOM.forEach(item => {
      if (item.parentInstanceId) return;
      if (item.role === "Optics & DAC" || item.role === "Mgmt License" || item.role === "Security License") return;

      const rawLoc = item.closetName || item.rackId;
      const itemLoc = FacilityStore.normalize(rawLoc);

      if (itemLoc === FacilityStore.UNASSIGNED) {
        // Only show unassigned hardware that can actually mount to this host type (e.g. exclude cameras/radios from racks)
        const comp = checkDeviceHostCompatibility(item, hostType);
        if (comp.compatible) {
          unassignedItems.push(item);
        }
      } else if (itemLoc === activeRackId) {
        assignedItems.push(item);
      }
    });
  }

  // Branch rendering based on Host Type
  const titleEl = document.getElementById("elevationFrameTitle");
  const hostTypeDef = FacilityStore.HOST_TYPES[hostType] || FacilityStore.HOST_TYPES.equipment_rack;

  const orientControl = document.getElementById("rackOrientationControl");
  if (orientControl) {
    orientControl.style.display = (hostType === "equipment_rack") ? "flex" : "none";
  }

  const pduControl = document.getElementById("rackPduConfigControl");
  if (pduControl) {
    pduControl.style.display = (hostType === "equipment_rack") ? "flex" : "none";
    const pduSelect = document.getElementById("rackPduConfigSelect");
    if (pduSelect) pduSelect.value = getRackPduConfig();
  }

  const frontBtn = document.getElementById("rackViewBtn-front");
  const rearBtn = document.getElementById("rackViewBtn-rear");
  if (frontBtn && rearBtn) {
    if (rackViewOrientation === "front") {
      frontBtn.className = "px-2.5 py-0.5 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 bg-indigo-600 text-white shadow-sm";
      rearBtn.className = "px-2.5 py-0.5 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 text-slate-400 hover:text-white";
    } else {
      frontBtn.className = "px-2.5 py-0.5 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 text-slate-400 hover:text-white";
      rearBtn.className = "px-2.5 py-0.5 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 bg-indigo-600 text-white shadow-sm";
    }
  }

  if (titleEl) {
    let pduModeBadge = "Dual 0U PDUs";
    if (hostType === "equipment_rack") {
      const cfg = getRackPduConfig();
      if (cfg === "dual_vertical") pduModeBadge = "Dual 0U PDUs";
      else if (cfg === "single_vertical") pduModeBadge = "Single 0U PDU";
      else pduModeBadge = "Horizontal 1U PDU";
    }
    const orientLabel = (hostType === "equipment_rack" && rackViewOrientation === "rear") ? `Rear View & ${pduModeBadge}` : "Front Elevation";
    titleEl.innerHTML = `
      <i data-lucide="${hostTypeDef.icon || 'server'}" class="w-3.5 h-3.5 text-indigo-400"></i>
      <span>${escapeHTML(activeRackId)} &bull; ${hostTypeDef.label} &bull; <span class="text-indigo-400 font-mono">${orientLabel}</span></span>
    `;
  }

  // Render Enclosure Hardware Specification Bar directly above elevation
  renderEnclosureHardwareBar(activeEnc, parsed);

  // Render Prominent Staging Dock at the TOP of elevation column (Requirement 2)
  renderRackUnassignedStagingDock(unassignedItems, parsed, activeEnc);
  renderHostStagingDrawer(unassignedItems, parsed, activeEnc);

  if (hostType === "security_cabinet") {
    renderSecurityCabinetFrame(frame, assignedItems, unassignedItems, parsed, activeEnc);
  } else if (hostType === "industrial_din") {
    renderIndustrialDinFrame(frame, assignedItems, unassignedItems, parsed, activeEnc);
  } else if (hostType === "structural_mount") {
    renderStructuralMountFrame(frame, assignedItems, unassignedItems, parsed, activeEnc);
  } else if (hostType === "architectural_backboard") {
    renderArchitecturalBackboardFrame(frame, assignedItems, unassignedItems, parsed, activeEnc);
  } else {
    renderEquipmentRackFrame(frame, assignedItems, unassignedItems, parsed, activeEnc);
  }

  // Update Telemetry & Endpoints
  renderHostTelemetry(assignedItems, parsed, activeEnc);
  renderServedEndpoints(parsed, activeEnc);

  if (window.lucide) lucide.createIcons();
}

// -----------------------------------------------------------
// 1. Host Renderer: 19" EIA Equipment Rack (Front & Rear Views with 0U PDUs)
// -----------------------------------------------------------
function renderEquipmentRackFrame(frame, assignedItems, unassignedItems, parsed, activeEnc) {
  const slots = {};
  for (let u = 1; u <= activeRackHeight; u++) slots[u] = null;

  assignedItems.forEach(item => {
    const stackUnits = (item.stackedUnits && item.stackedUnits >= 2) ? item.stackedUnits : 1;
    const baseRU = (item.rackUnits !== undefined && item.rackUnits !== null) ? (parseInt(item.rackUnits, 10) || 0) : 1;
    const hasPPBetween = (stackUnits >= 2 && !!item.patchPanelBetween);
    const hasHCMBetween = (stackUnits >= 2 && !!item.cableManagerBetween);
    const isStdPod = !!item.standardPod;
    const itemHeight = getRackItemHeight(item);
    const assignedU = parseInt(item.rackSlot, 10);

    if (assignedU && assignedU >= 1 && (assignedU + itemHeight - 1) <= activeRackHeight) {
      if (!isCollision(slots, assignedU, itemHeight, item.instanceId)) {
        for (let offset = 0; offset < itemHeight; offset++) {
          slots[assignedU + offset] = {
            item,
            isBase: offset === 0,
            span: itemHeight,
            baseRU,
            stackUnits,
            hasPPBetween,
            hasHCMBetween,
            isStdPod
          };
        }
      }
    }
  });

  if (rackViewOrientation === "rear") {
    renderEquipmentRackRearFrame(frame, assignedItems, slots, activeRackHeight, activeEnc);
  } else {
    renderEquipmentRackFrontFrame(frame, assignedItems, slots, activeRackHeight, activeEnc);
  }

  const badgeEl = document.getElementById("rackUtilizationBadge");
  const occupiedU = Object.values(slots).filter(s => s && s.isBase).reduce((acc, s) => acc + s.span, 0);
  if (badgeEl) badgeEl.innerText = `${occupiedU} / ${activeRackHeight} U Used`;
}

function isStackableSwitch(item) {
  if (!item || item.parentInstanceId) return false;
  if (item.canStack !== undefined && !item.canStack) return false;
  const role = (item.role || "").toLowerCase();
  const cat = (item.category || "").toLowerCase();
  return item.canStack === true || 
         role === "access" || 
         role === "aggregation" || 
         role === "core" || 
         role === "core & agg" || 
         role.includes("switch") || 
         cat.includes("switch");
}

function isCopperSwitch(item) {
  if (!item || item.parentInstanceId) return false;
  const isSw = isStackableSwitch(item);
  if (!isSw) return false;
  const model = (item.model || "").toLowerCase();
  const sku = (item.sku || "").toLowerCase();
  const role = (item.role || "").toLowerCase();
  if (role.includes("fiber") || model.includes("fiber") || sku.includes("fiber") || 
      model.includes("usw-pro-aggregation") || model.includes("usw-aggregation") ||
      (model.includes("agg") && !model.includes("poe")) ||
      (sku.includes("agg") && !sku.includes("poe"))) {
    return false;
  }
  return true;
}

function isFirewallDevice(item) {
  if (!item || item.parentInstanceId) return false;
  const role = (item.role || "").toLowerCase();
  const cat = (item.category || "").toLowerCase();
  const model = (item.model || "").toLowerCase();
  const sku = (item.sku || "").toLowerCase();
  return role.includes("firewall") || role.includes("security wan") || role.includes("gateway") ||
         cat.includes("firewall") || cat.includes("security_appliance") ||
         model.includes("firewall") || model.includes("fortigate") || model.includes("palo alto") ||
         model.includes("meraki mx") || sku.includes("fg-") || sku.includes("pa-") || sku.includes("firewall");
}

function isFiberSwitch(item) {
  if (!item || item.parentInstanceId) return false;
  if (isCopperSwitch(item)) return false;
  const isSw = isStackableSwitch(item);
  const role = (item.role || "").toLowerCase();
  const model = (item.model || "").toLowerCase();
  const sku = (item.sku || "").toLowerCase();
  return isSw || role === "core" || role === "aggregation" || role === "core & agg" ||
         model.includes("aggregation") || model.includes("fiber") || sku.includes("fiber") ||
         sku.includes("usw-pro-aggregation") || sku.includes("usw-aggregation");
}

function isFiberOrFirewall(item) {
  return isFirewallDevice(item) || isFiberSwitch(item);
}

function getRackItemHeight(it) {
  if (!it) return 1;
  const isZeroU = (it.rackUnits !== undefined && it.rackUnits !== null && parseInt(it.rackUnits, 10) === 0) || it.isDinMounted || (it.mounting && it.mounting.toLowerCase() === "din");
  if (isZeroU) return 0;
  const stack = (it.stackedUnits && it.stackedUnits >= 2) ? it.stackedUnits : 1;
  const baseRU = (it.rackUnits !== undefined && it.rackUnits !== null) ? (parseInt(it.rackUnits, 10) || 0) : 1;

  if (it.standardPod) {
    // Standard Pod: 1U 24P Patch panel directly above and 1U 24P patch panel directly below each switch unit
    return (baseRU * stack) + (2 * stack);
  }

  const hasPP = (stack >= 2 && !!it.patchPanelBetween);
  const hasHCM = (stack >= 2 && !!it.cableManagerBetween);
  const interleave = (hasPP || hasHCM) ? (stack - 1) : 0;
  return (baseRU * stack) + interleave;
}

function renderEquipmentRackFrontFrame(frame, assignedItems, slots, maxU, activeEnc) {
  let railHTML = "";

  for (let u = maxU; u >= 1; u--) {
    const slotData = slots[u];

    if (slotData) {
      if (slotData.isBase) {
        const it = slotData.item;
        const compat = checkDeviceHostCompatibility(it, "equipment_rack");
        const stackUnits = (it.stackedUnits && it.stackedUnits >= 2) ? it.stackedUnits : 1;
        const isSwitch = isStackableSwitch(it);
        const isCopper = isCopperSwitch(it);
        const targetU = parseInt(it.rackSlot, 10);
        const hasHcmBelow = !!(targetU > 1 && slots[targetU - 1] && (
          slots[targetU - 1].item.sku === "HCM-1U" || 
          slots[targetU - 1].item.source === "fiber_firewall_hcm" || 
          (slots[targetU - 1].item.model || "").includes("Cable Manager")
        ));
        const totalBaseWatts = (it.baseWatts || 0) * stackUnits;
        const totalPoEWatts = (it.poeBudget || 0) * stackUnits;
        const uLabel = slotData.span > 1 ? `U${u + slotData.span - 1}-U${u}` : `U${u}`;
        const portPreview = getDeviceFrontPortPreview(it);

        railHTML += `
          <div 
            class="group relative bg-slate-900 border ${compat.compatible ? 'border-indigo-500/60 hover:border-indigo-400' : 'border-amber-500/60 hover:border-amber-400'} rounded-lg px-3 py-2 flex flex-col justify-between cursor-move shadow-md transition-all select-none"
            draggable="true"
            ondragstart="handleRackItemDragStart(event, '${it.instanceId}')"
            ondragover="handleRackSlotDragOver(event)"
            ondrop="handleRackSlotDrop(event, ${u + slotData.span - 1})"
            style="min-height: ${Math.max(44, slotData.span * 46)}px;"
          >
            <div class="flex items-center justify-between w-full">
              <div class="flex items-center gap-3 min-w-0">
                <span class="text-[11px] font-mono font-bold text-indigo-400 w-14 shrink-0">${uLabel}</span>
                <div class="min-w-0">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    ${(!isPassiveInfrastructure(it) && it.deviceNumber) ? `<span class="px-1.5 py-0.2 rounded bg-brand-900/60 border border-brand-500/40 text-[9px] font-mono font-bold text-brand-300" title="Device Sequence ID">${escapeHTML(it.deviceNumber)}</span>` : ''}
                    <span class="text-xs font-bold text-white truncate" title="${escapeHTML(isPassiveInfrastructure(it) ? it.model : (it.friendlyName || it.model))}">${escapeHTML(isPassiveInfrastructure(it) ? it.model : (it.friendlyName || it.model))}</span>
                    ${!isPassiveInfrastructure(it) ? `
                      <button type="button" onclick="event.stopPropagation(); promptEditDeviceFriendlyName('${it.instanceId}')" class="text-slate-400 hover:text-white p-0.5 rounded hover:bg-slate-800 transition-colors" title="Edit Friendly Name">
                        <i data-lucide="pencil" class="w-2.5 h-2.5"></i>
                      </button>
                    ` : ''}
                    <span class="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-950 text-slate-400 border border-slate-800">FRONT</span>
                    <!-- Status LEDs or Passive/UPS Badge -->
                    ${(it.role === "Structured Cabling" || it.sku?.startsWith("PP-") || it.sku?.startsWith("HCM-")) ? `
                      <span class="px-1.5 py-0.2 rounded bg-purple-950/80 text-purple-300 border border-purple-800/60 font-mono font-bold text-[8.5px]">PASSIVE INFRA</span>
                    ` : (it.role === "UPS" || it.category === "ups") ? `
                      <span class="px-1.5 py-0.2 rounded bg-emerald-950/90 text-emerald-300 border border-emerald-600/60 font-mono font-bold text-[8.5px] flex items-center gap-1 shadow-sm" title="UPS Battery Protected">
                        <i data-lucide="zap" class="w-2.5 h-2.5 text-amber-400"></i>
                        <span>UPS BATTERY PROTECTED</span>
                      </span>
                    ` : (it.role === "Battery Pack" || it.type === "ebp" || it.isEbp) ? `
                      <span class="px-1.5 py-0.2 rounded bg-purple-950/90 text-purple-300 border border-purple-600/60 font-mono font-bold text-[8.5px] flex items-center gap-1 shadow-sm" title="External Battery Pack">
                        <i data-lucide="battery-charging" class="w-2.5 h-2.5 text-purple-400"></i>
                        <span>EXTENDED BATTERY PACK</span>
                      </span>
                    ` : `
                      <div class="flex items-center gap-1 text-[8px] font-mono">
                        <span class="px-1 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60 font-bold" title="Power Supply Good">PWR ●</span>
                        <span class="px-1 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60 font-bold" title="System Normal">SYS ●</span>
                        ${totalPoEWatts > 0 ? `<span class="px-1 py-0.2 rounded bg-sky-950 text-sky-400 border border-sky-800/60 font-bold" title="PoE Active">POE ●</span>` : ''}
                      </div>
                    `}
                  </div>
                  <div class="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                    ${(it.friendlyName && it.friendlyName !== it.model) ? `<span>${escapeHTML(it.model)}</span><span>&bull;</span>` : ''}
                    <span>${escapeHTML(it.vendor || 'Generic')}</span>
                    <span>&bull;</span>
                    <span>${slotData.span}U</span>
                    <span>&bull;</span>
                    ${(it.role === "Structured Cabling" || it.sku?.startsWith("PP-") || it.sku?.startsWith("HCM-")) ? `
                      <span class="text-purple-300 font-semibold">${it.ports ? `${it.ports}x Keystone Ports` : (it.model.includes("Manager") ? "Cable Management" : "Passive Panel")}</span>
                    ` : (it.role === "UPS" || it.category === "ups") ? `
                      <span class="text-emerald-400 font-semibold">${it.va || 1500}VA / ${it.powerWatts || 1000}W Rated &bull; Inverter Output</span>
                    ` : (it.role === "Battery Pack" || it.type === "ebp" || it.isEbp) ? `
                      <span class="text-purple-300 font-semibold">${it.dcVoltage || 72}VDC Bus &bull; Multi-Hour Standby Module</span>
                    ` : `
                      ${portPreview ? `<span class="text-indigo-300 font-semibold">${portPreview}</span><span>&bull;</span>` : ''}
                      <span>${totalBaseWatts}W Base${totalPoEWatts > 0 ? ` + ${totalPoEWatts}W PoE` : ''}</span>
                    `}
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                <!-- Omnipresent Cross-Navigation Action Icons -->
                <button onclick="event.stopPropagation(); jumpToTopologyTarget('node:${it.instanceId}')" class="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-indigo-300 transition-opacity" title="Jump to Logical Topology">
                  <i data-lucide="network" class="w-3.5 h-3.5"></i>
                </button>
                <button onclick="event.stopPropagation(); jumpToPhysicalLayoutTarget('${it.instanceId}')" class="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-amber-300 transition-opacity" title="Jump to Physical Layout Canvas">
                  <i data-lucide="map" class="w-3.5 h-3.5"></i>
                </button>
                <button onclick="event.stopPropagation(); jumpToBomTarget('${it.instanceId}')" class="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-emerald-300 transition-opacity" title="Jump to BOM Line Item">
                  <i data-lucide="file-spreadsheet" class="w-3.5 h-3.5"></i>
                </button>

                ${isSwitch ? `
                  <!-- Direct In-Rack Switch Stacking Controls -->
                  <div class="flex items-center gap-1 bg-slate-950/90 border border-slate-800 p-0.5 rounded-lg shadow-sm">
                    ${stackUnits >= 2 ? `
                      <button 
                        type="button" 
                        onclick="event.stopPropagation(); updateSwitchStackFromRack('${it.instanceId}', ${stackUnits - 1})"
                        class="w-5 h-5 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-colors cursor-pointer"
                        title="Decrease stack size (${stackUnits - 1 === 1 ? 'Standalone' : `${stackUnits - 1}x Stack`})"
                      >
                        -
                      </button>
                      <span class="text-[9px] font-mono font-bold px-1 text-indigo-300 flex items-center gap-1" title="${stackUnits}-Chassis Virtual Stack (${slotData.span}U total)">
                        <i data-lucide="layers" class="w-3 h-3 text-indigo-400"></i> ${stackUnits}x
                      </span>
                      <button 
                        type="button" 
                        onclick="event.stopPropagation(); updateSwitchStackFromRack('${it.instanceId}', ${stackUnits + 1})"
                        class="w-5 h-5 flex items-center justify-center rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors cursor-pointer"
                        title="Add stack member (${stackUnits + 1}x Stack)"
                        ${stackUnits >= 8 ? 'disabled class="opacity-50 cursor-not-allowed"' : ''}
                      >
                        +
                      </button>
                    ` : `
                      <button 
                        type="button" 
                        onclick="event.stopPropagation(); updateSwitchStackFromRack('${it.instanceId}', 2)"
                        class="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-300 hover:text-white flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                        title="Configure as 2-Switch Virtual Stack"
                      >
                        <i data-lucide="layers" class="w-2.5 h-2.5 text-indigo-400"></i>
                        <span>+ Stack</span>
                      </button>
                    `}
                  </div>

                  ${stackUnits >= 2 ? `
                    <!-- In-Stack Cable Management Option -->
                    <button 
                      type="button" 
                      onclick="event.stopPropagation(); toggleStackCableManager('${it.instanceId}')" 
                      class="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition-all flex items-center gap-1 ${it.cableManagerBetween ? 'bg-amber-900/90 text-amber-200 border border-amber-500 hover:bg-amber-800' : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 hover:text-white'}" 
                      title="${it.cableManagerBetween ? 'Remove 1U cable management between stacked switches' : 'Place 1U Horizontal Cable Manager between stacked switches'}"
                    >
                      <i data-lucide="${it.cableManagerBetween ? 'check-square' : 'align-justify'}" class="w-2.5 h-2.5 ${it.cableManagerBetween ? 'text-amber-400' : 'text-slate-400'}"></i>
                      <span>${it.cableManagerBetween ? '1U Cable Mgr Between' : '+ 1U Cable Mgr'}</span>
                    </button>
                  ` : ''}

                  ${isCopper ? `
                    <!-- Standard Pod: 24P Patch Panels Directly Above & Below + 6" Patch Cables -->
                    <button 
                      type="button" 
                      onclick="event.stopPropagation(); toggleSwitchStandardPod('${it.instanceId}')" 
                      class="px-2 py-0.5 rounded text-[9px] font-mono font-bold transition-all flex items-center gap-1 ${it.standardPod ? 'bg-emerald-900/90 text-emerald-200 border border-emerald-500 hover:bg-emerald-800 shadow-sm' : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 hover:text-white'}" 
                      title="${it.standardPod ? 'Remove standard 24P patch panels above/below' : 'Standard Rack Design: Add 1U 24P patch panels directly above & below with 6\" patch cables'}"
                    >
                      <i data-lucide="${it.standardPod ? 'check-circle-2' : 'panels-top-left'}" class="w-2.5 h-2.5 ${it.standardPod ? 'text-emerald-400' : 'text-slate-400'}"></i>
                      <span>${it.standardPod ? 'Std 24P Pod Active' : '+ Std 24P Above/Below'}</span>
                    </button>
                  ` : ''}

                  ${isFiberOrFirewall(it) ? `
                    <!-- Horizontal 1U Cable Management Option for Fiber Switches & Firewalls -->
                    <button 
                      type="button" 
                      onclick="event.stopPropagation(); toggleFiberFirewallCableManager('${it.instanceId}')" 
                      class="px-2 py-0.5 rounded text-[9px] font-mono font-bold transition-all flex items-center gap-1 ${hasHcmBelow ? 'bg-amber-900/90 text-amber-200 border border-amber-500 hover:bg-amber-800 shadow-sm' : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 hover:text-white'}" 
                      title="${hasHcmBelow ? 'Remove 1U horizontal cable manager below device' : 'Place 1U Horizontal Cable Manager below device (not doubled up)'}"
                    >
                      <i data-lucide="${hasHcmBelow ? 'check-square' : 'align-justify'}" class="w-2.5 h-2.5 ${hasHcmBelow ? 'text-amber-400' : 'text-slate-400'}"></i>
                      <span>${hasHcmBelow ? '1U Cable Mgr Below' : '+ 1U Cable Mgr'}</span>
                    </button>
                  ` : ''}
                ` : ''}
                ${!compat.compatible ? `
                  <span class="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800" title="${compat.advisory}">⚠️ Bracket Req</span>
                ` : ''}
                <span class="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 ${getRoleColor(it.role)}">${escapeHTML(it.role || 'Hardware')}</span>
                <button onclick="unmountRackItem('${it.instanceId}')" class="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-amber-400 transition-opacity" title="Unmount to Staging">
                  <i data-lucide="inbox" class="w-3.5 h-3.5"></i>
                </button>
                <button onclick="event.stopPropagation(); deleteDeviceFromBOM('${it.instanceId}')" class="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-400 transition-opacity" title="Delete from Quote BOM">
                  <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                </button>
              </div>
            </div>

            <!-- Standard Pod Layout: 24P Panel Above -> Switch -> 24P Panel Below per stack unit -->
            ${slotData.isStdPod ? `
              <div class="mt-2 space-y-1.5 border-t border-slate-800/80 pt-2">
                ${Array.from({ length: stackUnits }, (_, sIdx) => {
                  const unitNum = stackUnits - sIdx;
                  const isMaster = unitNum === 1;
                  const unitBaseU = u + (unitNum - 1) * (slotData.baseRU + 2);
                  const lowerPPU = unitBaseU;
                  const switchU = unitBaseU + 1;
                  const upperPPU = unitBaseU + slotData.baseRU + 1;

                  const is48P = (parseInt(it.ports, 10) || 24) >= 48;
                  const upperPortRange = is48P ? "Ports 1-24" : "Ports 1-12";
                  const lowerPortRange = is48P ? "Ports 25-48" : "Ports 13-24";
                  const unitLabel = stackUnits > 1 ? `Unit ${unitNum} ` : "";

                  return `
                    <!-- Unit ${unitNum} Pod Sandwich -->
                    <div class="space-y-1 p-1 rounded bg-slate-950/60 border border-purple-900/40">
                      <!-- Upper 24-Port Patch Panel Deck (Directly Above Unit ${unitNum}) -->
                      <div class="p-1.5 rounded bg-purple-950/70 border border-purple-600/70 flex items-center justify-between gap-2 text-[10px] font-mono shadow-sm">
                        <div class="flex items-center gap-2">
                          <span class="text-purple-300 font-bold">U${upperPPU}</span>
                          <span class="px-1.5 py-0.5 rounded bg-purple-900/90 text-purple-200 font-bold border border-purple-500/70 flex items-center gap-1">
                            <i data-lucide="layers" class="w-3 h-3 text-purple-300"></i> 1U 24-Port Modular Keystone Patch Panel
                          </span>
                          <span class="text-purple-400/80 text-[9px] font-semibold">PP-1U-24P-MOD (${unitLabel}Upper ${upperPortRange})</span>
                        </div>
                        <div class="flex items-center gap-1.5">
                          <span class="text-[8.5px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 border border-emerald-600 text-emerald-300 font-bold">
                            6" CORD DIRECT
                          </span>
                          <div class="flex items-center gap-0.5 bg-slate-950/80 px-2 py-0.5 rounded border border-purple-800/40">
                            ${Array.from({ length: 12 }, (_, p) => `<span class="w-1.5 h-2 rounded-[1px] bg-slate-800 border border-purple-500/50 inline-block" title="Keystone Port ${p+1}"></span>`).join('')}
                            <span class="w-1.5"></span>
                            ${Array.from({ length: 12 }, (_, p) => `<span class="w-1.5 h-2 rounded-[1px] bg-slate-800 border border-purple-500/50 inline-block" title="Keystone Port ${p+13}"></span>`).join('')}
                          </div>
                        </div>
                      </div>

                      <!-- Middle Deck: Switch Chassis Unit ${unitNum} -->
                      <div class="p-1.5 rounded bg-slate-950/90 border border-sky-500/40 flex items-center justify-between gap-2 text-[10px] font-mono">
                        <div class="flex items-center gap-2">
                          <span class="text-indigo-400 font-bold">U${switchU}</span>
                          <span class="px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 font-bold border border-sky-800/60">
                            ${stackUnits > 1 ? `Unit ${unitNum} (${isMaster ? 'Master Chassis' : 'Member Chassis'}): ` : ''}${escapeHTML(it.model)}
                          </span>
                          <span class="text-slate-300 font-bold">${portPreview || 'Copper Switch'}</span>
                        </div>
                        <div class="text-[9px] text-emerald-400 font-mono font-bold flex items-center gap-1">
                          <i data-lucide="zap" class="w-3 h-3 text-emerald-400"></i>
                          <span>Connected via ${parseInt(it.ports, 10) || 24}x 6" Cat6A Slim Patch Cables</span>
                        </div>
                      </div>

                      <!-- Lower 24-Port Patch Panel Deck (Directly Below Unit ${unitNum}) -->
                      <div class="p-1.5 rounded bg-purple-950/70 border border-purple-600/70 flex items-center justify-between gap-2 text-[10px] font-mono shadow-sm">
                        <div class="flex items-center gap-2">
                          <span class="text-purple-300 font-bold">U${lowerPPU}</span>
                          <span class="px-1.5 py-0.5 rounded bg-purple-900/90 text-purple-200 font-bold border border-purple-500/70 flex items-center gap-1">
                            <i data-lucide="layers" class="w-3 h-3 text-purple-300"></i> 1U 24-Port Modular Keystone Patch Panel
                          </span>
                          <span class="text-purple-400/80 text-[9px] font-semibold">PP-1U-24P-MOD (${unitLabel}Lower ${lowerPortRange})</span>
                        </div>
                        <div class="flex items-center gap-1.5">
                          <span class="text-[8.5px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 border border-emerald-600 text-emerald-300 font-bold">
                            6" CORD DIRECT
                          </span>
                          <div class="flex items-center gap-0.5 bg-slate-950/80 px-2 py-0.5 rounded border border-purple-800/40">
                            ${Array.from({ length: 12 }, (_, p) => `<span class="w-1.5 h-2 rounded-[1px] bg-slate-800 border border-purple-500/50 inline-block" title="Keystone Port ${p+25}"></span>`).join('')}
                            <span class="w-1.5"></span>
                            ${Array.from({ length: 12 }, (_, p) => `<span class="w-1.5 h-2 rounded-[1px] bg-slate-800 border border-purple-500/50 inline-block" title="Keystone Port ${p+37}"></span>`).join('')}
                          </div>
                        </div>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            ` : (stackUnits >= 2) ? `
              <!-- Multi-Chassis Stack Member Breakdown Bar with Optional In-Stack Cable Management -->
              ${slotData.hasHCMBetween ? `
                <div class="mt-2 space-y-1.5">
                  ${Array.from({ length: stackUnits }, (_, sIdx) => {
                    const unitNum = stackUnits - sIdx;
                    const isMaster = unitNum === 1;
                    const memberU = u + (unitNum - 1) * 2;
                    const hcmU = memberU - 1;
                    let memberHTML = `
                      <div class="p-1.5 rounded bg-slate-950/90 border ${isMaster ? 'border-sky-500/40' : 'border-slate-800'} flex items-center justify-between gap-2 text-[10px] font-mono">
                        <div class="flex items-center gap-2">
                          <span class="text-indigo-400 font-bold">U${memberU}</span>
                          <span class="px-1.5 py-0.5 rounded ${isMaster ? 'bg-sky-950 text-sky-300 font-bold border border-sky-800/60' : 'bg-slate-900 text-slate-300'}">
                            Unit ${unitNum} (${isMaster ? 'Master Chassis' : 'Member Chassis'})
                          </span>
                          <span class="text-slate-300 font-bold">${escapeHTML(it.model)}</span>
                        </div>
                        <div class="text-[9px] text-slate-400 flex items-center gap-2">
                          ${portPreview ? `<span class="text-indigo-300 font-semibold">${portPreview}</span>` : ''}
                          <span class="text-emerald-400 font-bold">PWR ●</span>
                        </div>
                      </div>
                    `;
                    if (unitNum > 1) {
                      memberHTML += `
                        <div class="p-1.5 rounded bg-amber-950/60 border border-amber-600/70 flex items-center justify-between gap-2 text-[10px] font-mono shadow-inner my-1">
                          <div class="flex items-center gap-2">
                            <span class="text-amber-300 font-bold">U${hcmU}</span>
                            <span class="px-1.5 py-0.5 rounded bg-amber-900/90 text-amber-200 font-bold border border-amber-500/70 flex items-center gap-1">
                              <i data-lucide="align-justify" class="w-3 h-3 text-amber-300"></i> 1U Horizontal Cable Manager
                            </span>
                            <span class="text-amber-400/80 text-[9px] font-semibold">HCM-1U (Dual-Hinged Cover & Pass-Through)</span>
                          </div>
                          <div class="flex items-center gap-1 bg-slate-950/80 px-2 py-0.5 rounded border border-amber-800/40 text-[9px] text-amber-300 font-mono">
                            <span>◄ Cable Pass-Through ►</span>
                          </div>
                        </div>
                      `;
                    }
                    return memberHTML;
                  }).join('')}
                </div>
              ` : slotData.hasPPBetween ? `
                <div class="mt-2 space-y-1.5">
                  ${Array.from({ length: stackUnits }, (_, sIdx) => {
                    const unitNum = stackUnits - sIdx;
                    const isMaster = unitNum === 1;
                    const memberU = u + (unitNum - 1) * 2;
                    const ppU = memberU - 1;
                    let memberHTML = `
                      <div class="p-1.5 rounded bg-slate-950/90 border ${isMaster ? 'border-sky-500/40' : 'border-slate-800'} flex items-center justify-between gap-2 text-[10px] font-mono">
                        <div class="flex items-center gap-2">
                          <span class="text-indigo-400 font-bold">U${memberU}</span>
                          <span class="px-1.5 py-0.5 rounded ${isMaster ? 'bg-sky-950 text-sky-300 font-bold border border-sky-800/60' : 'bg-slate-900 text-slate-300'}">
                            Unit ${unitNum} (${isMaster ? 'Master Chassis' : 'Member Chassis'})
                          </span>
                          <span class="text-slate-300 font-bold">${escapeHTML(it.model)}</span>
                        </div>
                        <div class="text-[9px] text-slate-400 flex items-center gap-2">
                          ${portPreview ? `<span class="text-indigo-300 font-semibold">${portPreview}</span>` : ''}
                          <span class="text-emerald-400 font-bold">PWR ●</span>
                        </div>
                      </div>
                    `;
                    if (unitNum > 1) {
                      memberHTML += `
                        <div class="p-1.5 rounded bg-purple-950/60 border border-purple-600/70 flex items-center justify-between gap-2 text-[10px] font-mono shadow-inner my-1">
                          <div class="flex items-center gap-2">
                            <span class="text-purple-300 font-bold">U${ppU}</span>
                            <span class="px-1.5 py-0.5 rounded bg-purple-900/90 text-purple-200 font-bold border border-purple-500/70 flex items-center gap-1">
                              <i data-lucide="layers" class="w-3 h-3 text-purple-300"></i> 1U 24-Port Modular Keystone Patch Panel
                            </span>
                            <span class="text-purple-400/80 text-[9px] font-semibold">PP-1U-24P-MOD (Inter-Switch Patching)</span>
                          </div>
                          <div class="flex items-center gap-0.5 bg-slate-950/80 px-2 py-0.5 rounded border border-purple-800/40">
                            ${Array.from({ length: 12 }, (_, p) => `<span class="w-1.5 h-2 rounded-[1px] bg-slate-800 border border-purple-500/50 inline-block" title="Keystone Port ${p+1}"></span>`).join('')}
                            <span class="w-1.5"></span>
                            ${Array.from({ length: 12 }, (_, p) => `<span class="w-1.5 h-2 rounded-[1px] bg-slate-800 border border-purple-500/50 inline-block" title="Keystone Port ${p+13}"></span>`).join('')}
                          </div>
                        </div>
                      `;
                    }
                    return memberHTML;
                  }).join('')}
                </div>
              ` : `
                <div class="mt-1.5 pt-1.5 border-t border-slate-800/80 flex items-center gap-1.5 flex-wrap text-[9px] font-mono text-slate-400">
                  ${Array.from({ length: stackUnits }, (_, idx) => `
                    <span class="px-1.5 py-0.5 rounded bg-slate-950/90 border border-slate-800 ${idx === 0 ? 'text-sky-300 font-bold border-sky-500/40' : 'text-slate-300'}">
                      Unit ${idx + 1} (${idx === 0 ? 'Master Chassis' : 'Member Chassis'} &bull; ${(it.rackUnits !== undefined && it.rackUnits !== null) ? parseInt(it.rackUnits, 10) : 1}U)
                    </span>
                  `).join('')}
                  <span class="text-indigo-400 font-semibold flex items-center gap-1">
                    <i data-lucide="link" class="w-2.5 h-2.5"></i> ${stackUnits === 2 ? '1x 100G Stack Link' : `${stackUnits}x Ring Stack Links`}
                  </span>
                </div>
              `}
            ` : ''}
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
          <span class="text-[9px] font-mono text-slate-700 uppercase tracking-wider">Empty Front Slot</span>
        </div>
      `;
    }
  }

  const vertChannels = getRackVerticalChannels();
  const activeEnclosures = FacilityStore.getEnclosures();
  const parsedHost = FacilityStore.parse(activeRackId);
  const activeEncObj = activeEnc || activeEnclosures.find(e => e.id === parsedHost.hostId) || activeEnclosures.find(e => e.name.toLowerCase() === (parsedHost.hostName || '').toLowerCase()) || null;
  const pduMetrics = calculateRackPduMetrics(assignedItems, activeEncObj);

  const leftColHtml = renderVerticalChannelHtml("frontLeft", vertChannels.frontLeft, pduMetrics, false);
  const rightColHtml = renderVerticalChannelHtml("frontRight", vertChannels.frontRight, pduMetrics, false);

  const vendor = activeEncObj?.catalogVendor || "EIA-310-D";
  const sku = activeEncObj?.catalogSku || `${maxU}U Standard Rack`;
  const model = activeEncObj?.catalogModel || "19\" Equipment Rack";
  const depth = activeEncObj?.depthInches || 42;
  const maxWt = activeEncObj?.maxWeightLbs || 3000;

  const topFasciaHtml = `
    <div class="px-3 py-1.5 mb-1.5 rounded-lg bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-700/80 shadow-md flex items-center justify-between text-xs select-none">
      <div class="flex items-center gap-2 min-w-0">
        <span class="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shrink-0"></span>
        <span class="font-mono font-bold text-slate-200 tracking-wide uppercase text-[11px] truncate">${escapeHTML(vendor)} &bull; ${escapeHTML(sku)}</span>
        <span class="text-[10px] text-slate-400 hidden md:inline truncate max-w-[220px]">${escapeHTML(model)}</span>
      </div>
      <div class="flex items-center gap-2 font-mono text-[10px] text-slate-400 shrink-0">
        <span class="px-1.5 py-0.2 rounded bg-slate-950/80 border border-slate-700 text-cyan-300 font-bold">${depth}" Depth</span>
        <span class="px-1.5 py-0.2 rounded bg-slate-950/80 border border-slate-700 text-emerald-300 font-bold">${maxWt.toLocaleString()} lbs Max</span>
      </div>
    </div>
  `;

  frame.innerHTML = `
    <div class="flex gap-2 sm:gap-3 w-full items-stretch">
      ${leftColHtml}
      <div class="flex-1 min-w-0 space-y-1">
        ${topFasciaHtml}
        ${railHTML}
      </div>
      ${rightColHtml}
    </div>
  `;
}

function renderEquipmentRackRearFrame(frame, assignedItems, slots, maxU, activeEnc) {
  const pduMetrics = calculateRackPduMetrics(assignedItems, activeEnc);
  const pduConfig = getRackPduConfig();
  const isHorizontalPdu = pduConfig === "horizontal";
  const isSinglePdu = pduConfig === "single_vertical";
  let rearRailHTML = "";

  for (let u = maxU; u >= 1; u--) {
    const slotData = slots[u];

    if (slotData) {
      if (slotData.isBase) {
        const it = slotData.item;
        const stackUnits = (it.stackedUnits && it.stackedUnits >= 2) ? it.stackedUnits : 1;
        const isSwitch = isStackableSwitch(it);
        const isCopper = isCopperSwitch(it);
        const targetU = parseInt(it.rackSlot, 10);
        const hasHcmBelow = !!(targetU > 1 && slots[targetU - 1] && (
          slots[targetU - 1].item.sku === "HCM-1U" || 
          slots[targetU - 1].item.source === "fiber_firewall_hcm" || 
          (slots[targetU - 1].item.model || "").includes("Cable Manager")
        ));
        const uLabel = slotData.span > 1 ? `U${u + slotData.span - 1}-U${u}` : `U${u}`;
        const psuSpecs = getDevicePsuSpecs(it);
        const psuConns = getDevicePowerConnections(it);

        const isDualPsu = psuSpecs.psuCount >= 2;
        const isDualRedundant = isDualPsu && ((psuConns.psu1 === "PDU-A" && psuConns.psu2 === "PDU-B") || (psuConns.psu1 === "PDU-B" && psuConns.psu2 === "PDU-A"));
        const isSpof = isDualPsu && (psuConns.psu1 === psuConns.psu2) && (psuConns.psu1 === "PDU-A" || psuConns.psu1 === "PDU-B");

        rearRailHTML += `
          <div 
            class="group relative bg-slate-900 border border-slate-700/80 hover:border-slate-500 rounded-lg px-3 py-2 flex flex-col justify-between cursor-move shadow-md transition-all select-none"
            draggable="true"
            ondragstart="handleRackItemDragStart(event, '${it.instanceId}')"
            ondragover="handleRackSlotDragOver(event)"
            ondrop="handleRackSlotDrop(event, ${u + slotData.span - 1})"
            style="min-height: ${Math.max(48, slotData.span * 48)}px;"
          >
            <div class="flex items-center justify-between w-full gap-2">
              <div class="flex items-center gap-2.5 min-w-0">
                <span class="text-[11px] font-mono font-bold text-slate-400 w-12 shrink-0">${uLabel}</span>
                <div class="min-w-0">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    ${(!isPassiveInfrastructure(it) && it.deviceNumber) ? `<span class="px-1.5 py-0.2 rounded bg-brand-900/60 border border-brand-500/40 text-[9px] font-mono font-bold text-brand-300" title="Device Sequence ID">${escapeHTML(it.deviceNumber)}</span>` : ''}
                    <span class="text-xs font-bold text-white truncate" title="${escapeHTML(isPassiveInfrastructure(it) ? it.model : (it.friendlyName || it.model))}">${escapeHTML(isPassiveInfrastructure(it) ? it.model : (it.friendlyName || it.model))}</span>
                    ${!isPassiveInfrastructure(it) ? `
                      <button type="button" onclick="event.stopPropagation(); promptEditDeviceFriendlyName('${it.instanceId}')" class="text-slate-400 hover:text-white p-0.5 rounded hover:bg-slate-800 transition-colors" title="Edit Friendly Name">
                        <i data-lucide="pencil" class="w-2.5 h-2.5"></i>
                      </button>
                    ` : ''}
                    <span class="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-950 text-slate-400 border border-slate-800">REAR</span>
                    <!-- Redundancy Badge -->
                    ${isHorizontalPdu ? `
                      <span class="text-[9px] font-mono font-bold text-indigo-300 bg-indigo-950/80 border border-indigo-700/60 px-1.5 py-0.2 rounded flex items-center gap-1">
                        <i data-lucide="zap" class="w-2.5 h-2.5 text-indigo-400"></i> 1U PDU
                      </span>
                    ` : (isSinglePdu ? `
                      <span class="text-[9px] font-mono font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-700/60 px-1.5 py-0.2 rounded flex items-center gap-1">
                        <i data-lucide="zap" class="w-2.5 h-2.5 text-emerald-400"></i> 0U Feed A
                      </span>
                    ` : (
                      isDualPsu ? (
                        isDualRedundant 
                          ? `<span class="text-[9px] font-mono font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-700/60 px-1.5 py-0.2 rounded flex items-center gap-1"><i data-lucide="shield-check" class="w-2.5 h-2.5"></i> Dual-Feed A+B</span>`
                          : (isSpof 
                            ? `<span class="text-[9px] font-mono font-bold text-rose-300 bg-rose-950/80 border border-rose-700/60 px-1.5 py-0.2 rounded flex items-center gap-1" title="Both power supplies on same PDU! Single point of failure."><i data-lucide="alert-triangle" class="w-2.5 h-2.5"></i> SPOF</span>`
                            : `<span class="text-[9px] font-mono text-amber-300 bg-amber-950/80 border border-amber-700/60 px-1.5 py-0.2 rounded flex items-center gap-1"><i data-lucide="alert-circle" class="w-2.5 h-2.5"></i> 1 Feed</span>`)
                      ) : `
                        <span class="text-[9px] font-mono text-slate-400 bg-slate-950 border border-slate-800 px-1.5 py-0.2 rounded">Single Cord</span>
                      `
                    ))}
                  </div>
                  <div class="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                    <span>Inlet: ${psuSpecs.inletType}</span>
                    <span>&bull;</span>
                    <span class="text-cyan-400 flex items-center gap-0.5" title="Front-to-Back cooling exhaust"><i data-lucide="wind" class="w-3 h-3"></i> Exhaust</span>
                    <span>&bull;</span>
                    <span class="text-amber-400/90 flex items-center gap-0.5" title="Chassis Grounding Lug (TIA-607-C)">⏚ GND Lug</span>
                  </div>
                </div>
              </div>

              <!-- Power Supply Cord Connectors -->
              <div class="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                ${isHorizontalPdu ? `
                  <button onclick="event.stopPropagation(); toggleDevicePsuFeed('${it.instanceId}', 1)" class="px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 border transition-all ${getPsuBtnClass(psuConns.psu1, pduConfig)}" title="Click to toggle power connection">
                    <i data-lucide="zap" class="w-3 h-3"></i> 1U PDU: ${psuConns.psu1 === 'None' ? 'Unplugged' : 'Connected'}
                  </button>
                ` : (isSinglePdu ? `
                  <button onclick="event.stopPropagation(); toggleDevicePsuFeed('${it.instanceId}', 1)" class="px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 border transition-all ${getPsuBtnClass(psuConns.psu1, pduConfig)}" title="Click to toggle power connection">
                    <i data-lucide="zap" class="w-3 h-3"></i> 0U PDU: ${psuConns.psu1 === 'None' ? 'Unplugged' : 'Feed A'}
                  </button>
                ` : `
                  <!-- PSU 1 Inlet Button -->
                  <button onclick="event.stopPropagation(); toggleDevicePsuFeed('${it.instanceId}', 1)" class="px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 border transition-all ${getPsuBtnClass(psuConns.psu1, pduConfig)}" title="Click to cycle power feed (PDU-A -> PDU-B -> Unplugged)">
                    <i data-lucide="zap" class="w-3 h-3"></i> PSU 1: ${psuConns.psu1 || 'None'}
                  </button>

                  <!-- PSU 2 Inlet Button (for dual modular PSUs) -->
                  ${isDualPsu ? `
                    <button onclick="event.stopPropagation(); toggleDevicePsuFeed('${it.instanceId}', 2)" class="px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 border transition-all ${getPsuBtnClass(psuConns.psu2, pduConfig)}" title="Click to cycle power feed (PDU-A -> PDU-B -> Unplugged)">
                      <i data-lucide="zap" class="w-3 h-3"></i> PSU 2: ${psuConns.psu2 || 'None'}
                    </button>
                  ` : ''}
                `)}

                ${isSwitch ? `
                  ${isCopper ? `
                    <!-- Standard Pod Toggle -->
                    <button 
                      type="button" 
                      onclick="event.stopPropagation(); toggleSwitchStandardPod('${it.instanceId}')" 
                      class="px-2 py-0.5 rounded text-[9px] font-mono font-bold transition-all flex items-center gap-1 ${it.standardPod ? 'bg-emerald-900/90 text-emerald-200 border border-emerald-500 hover:bg-emerald-800 shadow-sm' : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 hover:text-white'}" 
                      title="${it.standardPod ? 'Remove standard 24P patch panels above/below' : 'Standard Rack Design: Add 1U 24P patch panels directly above & below with 6\" patch cables'}"
                    >
                      <i data-lucide="${it.standardPod ? 'check-circle-2' : 'panels-top-left'}" class="w-2.5 h-2.5 ${it.standardPod ? 'text-emerald-400' : 'text-slate-400'}"></i>
                      <span>${it.standardPod ? 'Std 24P Active' : '+ Std 24P'}</span>
                    </button>
                  ` : ''}
                ` : ''}

                ${isFiberOrFirewall(it) ? `
                  <!-- Horizontal 1U Cable Management Option for Fiber Switches & Firewalls -->
                  <button 
                    type="button" 
                    onclick="event.stopPropagation(); toggleFiberFirewallCableManager('${it.instanceId}')" 
                    class="px-2 py-0.5 rounded text-[9px] font-mono font-bold transition-all flex items-center gap-1 ${hasHcmBelow ? 'bg-amber-900/90 text-amber-200 border border-amber-500 hover:bg-amber-800 shadow-sm' : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 hover:text-white'}" 
                    title="${hasHcmBelow ? 'Remove 1U horizontal cable manager below device' : 'Place 1U Horizontal Cable Manager below device (not doubled up)'}"
                  >
                    <i data-lucide="${hasHcmBelow ? 'check-square' : 'align-justify'}" class="w-2.5 h-2.5 ${hasHcmBelow ? 'text-amber-400' : 'text-slate-400'}"></i>
                    <span>${hasHcmBelow ? '1U Cable Mgr Below' : '+ 1U Cable Mgr'}</span>
                  </button>
                ` : ''}

                <!-- Unmount & Delete Buttons -->
                <button onclick="unmountRackItem('${it.instanceId}')" class="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-amber-400 transition-opacity ml-0.5" title="Unmount to Staging">
                  <i data-lucide="inbox" class="w-3.5 h-3.5"></i>
                </button>
                <button onclick="event.stopPropagation(); deleteDeviceFromBOM('${it.instanceId}')" class="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-400 transition-opacity ml-0.5" title="Delete from Quote BOM">
                  <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                </button>
              </div>
            </div>

            <!-- Rear Standard Pod Layout: Upper Tie Bar -> Switch Rear -> Lower Tie Bar per stack unit -->
            ${slotData.isStdPod ? `
              <div class="mt-2 space-y-1.5 border-t border-slate-800/80 pt-2">
                ${Array.from({ length: stackUnits }, (_, sIdx) => {
                  const unitNum = stackUnits - sIdx;
                  const isMaster = unitNum === 1;
                  const unitBaseU = u + (unitNum - 1) * (slotData.baseRU + 2);
                  const lowerPPU = unitBaseU;
                  const switchU = unitBaseU + 1;
                  const upperPPU = unitBaseU + slotData.baseRU + 1;
                  const unitLabel = stackUnits > 1 ? `Unit ${unitNum} ` : "";

                  return `
                    <!-- Rear Unit ${unitNum} Pod Sandwich -->
                    <div class="space-y-1 p-1 rounded bg-slate-950/60 border border-purple-900/40">
                      <!-- Upper 24P Patch Panel Rear Deck -->
                      <div class="p-1.5 rounded bg-purple-950/70 border border-purple-600/70 flex items-center justify-between gap-2 text-[10px] font-mono shadow-sm">
                        <div class="flex items-center gap-2">
                          <span class="text-purple-300 font-bold">U${upperPPU}</span>
                          <span class="px-1.5 py-0.5 rounded bg-purple-900/90 text-purple-200 font-bold border border-purple-500/70 flex items-center gap-1">
                            <i data-lucide="layers" class="w-3 h-3 text-purple-300"></i> 1U 24P Patch Panel Rear (${unitLabel}Upper)
                          </span>
                          <span class="text-purple-400/80 text-[9px] font-semibold">Cable Retention Tie Bar &amp; Keystone Sockets</span>
                        </div>
                        <span class="text-[8.5px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 border border-emerald-600 text-emerald-300 font-bold">
                          6" CORD DIRECT TIE-OFF
                        </span>
                      </div>

                      <!-- Middle Switch Chassis Rear Indicator -->
                      <div class="p-1.5 rounded bg-slate-950/90 border border-sky-500/40 flex items-center justify-between gap-2 text-[10px] font-mono">
                        <div class="flex items-center gap-2">
                          <span class="text-indigo-400 font-bold">U${switchU}</span>
                          <span class="text-slate-300 font-bold">${stackUnits > 1 ? `Unit ${unitNum} ` : ''}${escapeHTML(it.model)} Rear (${psuSpecs.inletType})</span>
                        </div>
                        <div class="text-[9px] text-slate-400 flex items-center gap-2">
                          <span class="text-cyan-400 flex items-center gap-0.5"><i data-lucide="wind" class="w-2.5 h-2.5"></i> Fan Exhaust</span>
                          ${stackUnits > 1 ? `<span class="text-indigo-400 flex items-center gap-0.5"><i data-lucide="link" class="w-2.5 h-2.5"></i> Stack Link</span>` : ''}
                          <span class="text-emerald-400 font-bold">PSU OK</span>
                        </div>
                      </div>

                      <!-- Lower 24P Patch Panel Rear Deck -->
                      <div class="p-1.5 rounded bg-purple-950/70 border border-purple-600/70 flex items-center justify-between gap-2 text-[10px] font-mono shadow-sm">
                        <div class="flex items-center gap-2">
                          <span class="text-purple-300 font-bold">U${lowerPPU}</span>
                          <span class="px-1.5 py-0.5 rounded bg-purple-900/90 text-purple-200 font-bold border border-purple-500/70 flex items-center gap-1">
                            <i data-lucide="layers" class="w-3 h-3 text-purple-300"></i> 1U 24P Patch Panel Rear (${unitLabel}Lower)
                          </span>
                          <span class="text-purple-400/80 text-[9px] font-semibold">Cable Retention Tie Bar &amp; Keystone Sockets</span>
                        </div>
                        <span class="text-[8.5px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 border border-emerald-600 text-emerald-300 font-bold">
                          6" CORD DIRECT TIE-OFF
                        </span>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            ` : (stackUnits >= 2) ? `
              <!-- Multi-Chassis Stack Member Rear Interconnect Bar -->
              ${slotData.hasHCMBetween ? `
                <div class="mt-2 space-y-1.5 border-t border-slate-800/80 pt-2">
                  ${Array.from({ length: stackUnits }, (_, sIdx) => {
                    const unitNum = stackUnits - sIdx;
                    const isMaster = unitNum === 1;
                    const memberU = u + (unitNum - 1) * 2;
                    const hcmU = memberU - 1;
                    let memberHTML = `
                      <div class="p-1.5 rounded bg-slate-950/90 border ${isMaster ? 'border-sky-500/40' : 'border-slate-800'} flex items-center justify-between gap-2 text-[10px] font-mono">
                        <div class="flex items-center gap-2">
                          <span class="text-indigo-400 font-bold">U${memberU}</span>
                          <span class="text-slate-300 font-bold">Unit ${unitNum} Rear Chassis (${psuSpecs.inletType})</span>
                        </div>
                        <div class="text-[9px] text-slate-400 flex items-center gap-2">
                          <span class="text-indigo-400 flex items-center gap-0.5"><i data-lucide="link" class="w-2.5 h-2.5"></i> 100G Stack Port</span>
                          <span class="text-emerald-400 font-bold">PSU OK</span>
                        </div>
                      </div>
                    `;
                    if (unitNum > 1) {
                      memberHTML += `
                        <div class="p-1.5 rounded bg-amber-950/60 border border-amber-600/70 flex items-center justify-between gap-2 text-[10px] font-mono shadow-inner my-1">
                          <div class="flex items-center gap-2">
                            <span class="text-amber-300 font-bold">U${hcmU}</span>
                            <span class="px-1.5 py-0.5 rounded bg-amber-900/90 text-amber-200 font-bold border border-amber-500/70 flex items-center gap-1">
                              <i data-lucide="align-justify" class="w-3 h-3 text-amber-300"></i> 1U Horizontal Cable Manager Rear
                            </span>
                            <span class="text-amber-400/80 text-[9px] font-semibold">Rear Cable Pass-Through Channel & Tie Bar</span>
                          </div>
                          <span class="text-[9px] text-amber-300/80 font-mono">Slack Routing & Strain Relief</span>
                        </div>
                      `;
                    }
                    return memberHTML;
                  }).join('')}
                </div>
              ` : slotData.hasPPBetween ? `
                <div class="mt-2 space-y-1.5 border-t border-slate-800/80 pt-2">
                  ${Array.from({ length: stackUnits }, (_, sIdx) => {
                    const unitNum = stackUnits - sIdx;
                    const isMaster = unitNum === 1;
                    const memberU = u + (unitNum - 1) * 2;
                    const ppU = memberU - 1;
                    let memberHTML = `
                      <div class="p-1.5 rounded bg-slate-950/90 border ${isMaster ? 'border-sky-500/40' : 'border-slate-800'} flex items-center justify-between gap-2 text-[10px] font-mono">
                        <div class="flex items-center gap-2">
                          <span class="text-indigo-400 font-bold">U${memberU}</span>
                          <span class="text-slate-300 font-bold">Unit ${unitNum} Rear Chassis (${psuSpecs.inletType})</span>
                        </div>
                        <div class="text-[9px] text-slate-400 flex items-center gap-2">
                          <span class="text-indigo-400 flex items-center gap-0.5"><i data-lucide="link" class="w-2.5 h-2.5"></i> 100G Stack Port</span>
                          <span class="text-emerald-400 font-bold">PSU OK</span>
                        </div>
                      </div>
                    `;
                    if (unitNum > 1) {
                      memberHTML += `
                        <div class="p-1.5 rounded bg-purple-950/50 border border-purple-700/50 flex items-center justify-between gap-2 text-[10px] font-mono shadow-inner my-1">
                          <div class="flex items-center gap-2">
                            <span class="text-purple-300 font-bold">U${ppU}</span>
                            <span class="text-purple-200 font-bold">1U 24P Patch Panel Rear (Cable Management Tie Bar)</span>
                          </div>
                          <span class="text-[9px] text-purple-400/80 font-mono">24x Keystone Cat6A / Fiber Pass-Through</span>
                        </div>
                      `;
                    }
                    return memberHTML;
                  }).join('')}
                </div>
              ` : `
                <div class="mt-1.5 pt-1.5 border-t border-slate-800 flex items-center justify-between text-[9px] font-mono text-slate-400">
                  <span class="text-indigo-400 font-semibold flex items-center gap-1">
                    <i data-lucide="link" class="w-2.5 h-2.5"></i> Dual 100G Direct-Attach Ring Cables
                  </span>
                  <span class="text-slate-500">${stackUnits}x Chassis Connected</span>
                </div>
              `}
            ` : ''}
          </div>
        `;
      }
    } else {
      rearRailHTML += `
        <div 
          class="h-8 border border-dashed border-slate-800/80 hover:border-indigo-500/50 hover:bg-indigo-950/10 rounded-lg px-3 flex items-center justify-between transition-colors select-none"
          ondragover="handleRackSlotDragOver(event)"
          ondrop="handleRackSlotDrop(event, ${u})"
        >
          <span class="text-[10px] font-mono text-slate-600 font-bold">U${u}</span>
          <span class="text-[9px] font-mono text-slate-700 uppercase tracking-wider">Empty Rear Slot</span>
        </div>
      `;
    }
  }

  const vertChannels = getRackVerticalChannels();
  const leftColHtml = renderVerticalChannelHtml("rearLeft", vertChannels.rearLeft, pduMetrics, true);
  const rightColHtml = renderVerticalChannelHtml("rearRight", vertChannels.rearRight, pduMetrics, true);

  const topHorizontalPduHtml = isHorizontalPdu ? `
    <!-- 1U Horizontal Rackmount PDU Strip Bar -->
    <div class="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-indigo-500/50 rounded-xl p-3 shadow-xl select-none mb-3">
      <div class="flex flex-wrap items-center justify-between gap-3 mb-2.5">
        <div class="flex items-center gap-2.5">
          <div class="p-2 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
            <i data-lucide="zap" class="w-4 h-4"></i>
          </div>
          <div>
            <div class="text-xs font-bold text-white flex items-center gap-2">
              <span>1U Horizontal Rackmount PDU</span>
              <span class="text-[9px] font-mono px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-600 font-bold">120V / 20A Dedicated</span>
              <span class="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-600 font-bold">8 Outlets</span>
            </div>
            <span class="text-[10px] text-slate-400 font-mono">19" EIA Rackmount Bar &bull; NEMA 5-20R Receptacles &bull; 16A Continuous NEC Max</span>
          </div>
        </div>

        <div class="flex items-center gap-4 text-right">
          <div>
            <span class="text-[9px] text-slate-400 uppercase font-mono block">Load Amps</span>
            <span class="text-xs font-mono font-bold ${pduMetrics.pduA.pct > 80 ? 'text-rose-400' : 'text-white'}">${pduMetrics.pduA.amps}A / 16.0A</span>
          </div>
          <div>
            <span class="text-[9px] text-slate-400 uppercase font-mono block">Power Draw</span>
            <span class="text-xs font-mono font-bold text-indigo-300">${pduMetrics.pduA.watts}W (${pduMetrics.pduA.pct}%)</span>
          </div>
          <div class="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[10px] font-mono font-bold text-emerald-400 flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>BREAKER OK</span>
          </div>
        </div>
      </div>

      <!-- Receptacle Grid across width -->
      <div class="grid grid-cols-8 gap-2 pt-2 border-t border-slate-800/80">
        ${Array.from({ length: 8 }, (_, rIdx) => {
          const isOccupied = rIdx < pduMetrics.pduA.outletsUsed;
          return `
            <div class="px-2 py-1.5 rounded-lg bg-slate-950 border ${isOccupied ? 'border-indigo-500/70 bg-indigo-950/40 text-indigo-300' : 'border-slate-800 text-slate-600'} text-center font-mono text-[9px] transition-all">
              <div class="text-[8px] text-slate-500 uppercase">Outlet ${rIdx + 1}</div>
              <div class="text-xs mt-0.5 ${isOccupied ? 'text-indigo-400 font-bold' : 'text-slate-700'}">● 5-20R</div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  ` : '';

  const targetEnc = activeEnc;
  const vendor = targetEnc?.catalogVendor || "EIA-310-D";
  const sku = targetEnc?.catalogSku || `${maxU}U Standard Rack`;
  const model = targetEnc?.catalogModel || "19\" Equipment Rack";
  const depth = targetEnc?.depthInches || 42;
  const maxWt = targetEnc?.maxWeightLbs || 3000;

  const topFasciaHtml = `
    <div class="px-3 py-1.5 mb-1.5 rounded-lg bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-700/80 shadow-md flex items-center justify-between text-xs select-none">
      <div class="flex items-center gap-2 min-w-0">
        <span class="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shrink-0"></span>
        <span class="font-mono font-bold text-slate-200 tracking-wide uppercase text-[11px] truncate">${escapeHTML(vendor)} &bull; ${escapeHTML(sku)} [REAR]</span>
        <span class="text-[10px] text-slate-400 hidden md:inline truncate max-w-[220px]">${escapeHTML(model)}</span>
      </div>
      <div class="flex items-center gap-2 font-mono text-[10px] text-slate-400 shrink-0">
        <span class="px-1.5 py-0.2 rounded bg-slate-950/80 border border-slate-700 text-cyan-300 font-bold">${depth}" Depth</span>
        <span class="px-1.5 py-0.2 rounded bg-slate-950/80 border border-slate-700 text-emerald-300 font-bold">${maxWt.toLocaleString()} lbs Max</span>
      </div>
    </div>
  `;

  frame.innerHTML = `
    ${topHorizontalPduHtml}
    <div class="flex gap-2 sm:gap-3 w-full items-stretch">
      ${leftColHtml}
      <div class="flex-1 min-w-0 space-y-1">
        ${topFasciaHtml}
        ${rearRailHTML}
      </div>
      ${rightColHtml}
    </div>
  `;
}

// -----------------------------------------------------------
// 2. Host Renderer: Security Cabinet (Trove / LSP Subplate Bays)
// -----------------------------------------------------------
function renderSecurityCabinetFrame(frame, assignedItems, unassignedItems, parsed, activeEnc) {
  const totalBays = (activeEnc && activeEnc.subplateBays) ? activeEnc.subplateBays : 8;
  const dcVoltage = (activeEnc && activeEnc.dcVoltage) ? activeEnc.dcVoltage : "dual_12_24";

  // Map assigned items into bays
  const baySlots = {};
  for (let b = 1; b <= totalBays; b++) baySlots[b] = null;

  assignedItems.forEach((item, idx) => {
    let bNum = parseInt(String(item.rackSlot).replace("Bay-", ""), 10);
    if (!bNum || bNum < 1 || bNum > totalBays || baySlots[bNum] !== null) {
      bNum = null;
      for (let b = 1; b <= totalBays; b++) {
        if (baySlots[b] === null) {
          bNum = b;
          break;
        }
      }
    }
    if (bNum) {
      item.rackSlot = `Bay-${bNum}`;
      baySlots[bNum] = item;
    }
  });

  let bayGridHTML = `
    <!-- Security Cabinet Subplate Header -->
    <div class="p-3 bg-slate-900 border border-emerald-900/60 rounded-xl mb-3 flex items-center justify-between">
      <div class="flex items-center gap-2.5">
        <div class="p-1.5 rounded-lg bg-emerald-950 border border-emerald-700/60 text-emerald-400">
          <i data-lucide="shield-check" class="w-4 h-4"></i>
        </div>
        <div>
          <span class="text-xs font-bold text-white block">${escapeHTML(activeEnc?.catalogVendor || 'Altronix')} ${escapeHTML(activeEnc?.catalogSku || 'Trove')} &bull; ${escapeHTML(activeEnc?.catalogModel || 'Access & Power Integration Enclosure')}</span>
          <span class="text-[10px] text-emerald-400 font-mono">${totalBays} Modular Subplate Bays &bull; ${dcVoltage === 'dual_12_24' ? 'Dual 12V / 24VDC Bus' : '24VDC Lock Power'} &bull; Max ${activeEnc?.maxWeightLbs || 150} lbs Rating</span>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">$${(activeEnc?.msrp || 0).toLocaleString()} MSRP</span>
        <span class="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">Tamper Monitored</span>
      </div>
    </div>

    <!-- Subplate Module Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3">
  `;

  for (let b = 1; b <= totalBays; b++) {
    const item = baySlots[b];
    if (item) {
      const compat = checkDeviceHostCompatibility(item, "security_cabinet");
      bayGridHTML += `
        <div 
          class="group bg-slate-900 border ${compat.compatible ? 'border-emerald-600/50 hover:border-emerald-400' : 'border-amber-500/50 hover:border-amber-400'} p-2.5 rounded-xl shadow-md flex flex-col justify-between select-none relative"
          draggable="true"
          ondragstart="handleRackItemDragStart(event, '${item.instanceId}')"
          ondragover="handleRackSlotDragOver(event)"
          ondrop="handleBaySlotDrop(event, ${b})"
        >
          <div class="flex items-center justify-between mb-1.5">
            <span class="text-[10px] font-mono font-bold text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/80">Bay ${b}</span>
            <div class="flex items-center gap-1">
              ${!compat.compatible ? `
                <span class="text-[9px] font-mono font-bold text-amber-400" title="${compat.advisory}">⚠️</span>
              ` : ''}
              <span class="text-[9px] font-mono font-bold text-slate-400 uppercase">${escapeHTML(item.category || item.role || 'Module')}</span>
              <button onclick="unmountRackItem('${item.instanceId}')" class="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-amber-300 transition-opacity" title="Unmount">
                <i data-lucide="inbox" class="w-3 h-3"></i>
              </button>
            </div>
          </div>
          <div>
            <div class="flex items-center gap-1.5 flex-wrap mb-0.5">
              ${item.deviceNumber ? `<span class="px-1.5 py-0.2 rounded bg-brand-900/60 border border-brand-500/40 text-[9px] font-mono font-bold text-brand-300">${escapeHTML(item.deviceNumber)}</span>` : ''}
              <span class="text-xs font-bold text-white truncate" title="${escapeHTML(item.friendlyName || item.model)}">${escapeHTML(item.friendlyName || item.model)}</span>
              <button type="button" onclick="event.stopPropagation(); promptEditDeviceFriendlyName('${item.instanceId}')" class="text-slate-400 hover:text-white p-0.5 rounded hover:bg-slate-800 transition-colors" title="Edit Friendly Name">
                <i data-lucide="pencil" class="w-2.5 h-2.5"></i>
              </button>
            </div>
            ${item.friendlyName && item.friendlyName !== item.model ? `<span class="text-[10px] text-slate-300 font-medium block truncate">${escapeHTML(item.model)}</span>` : ''}
            <span class="text-[10px] text-slate-400 font-mono block">${item.doorCapacity ? `${item.doorCapacity}-Door Controller` : (item.strikeOutputPower || `${item.baseWatts || 15}W DC Load`)}</span>
          </div>
        </div>
      `;
    } else {
      bayGridHTML += `
        <div 
          class="border border-dashed border-slate-800/90 hover:border-emerald-500/50 hover:bg-emerald-950/10 p-3 rounded-xl flex flex-col items-center justify-center text-center transition-colors min-h-[72px] cursor-pointer"
          ondragover="handleRackSlotDragOver(event)"
          ondrop="handleBaySlotDrop(event, ${b})"
        >
          <span class="text-[10px] font-mono text-slate-500 font-bold block mb-0.5">Bay ${b} Empty</span>
          <span class="text-[9px] text-slate-600 font-mono">Controller / PSU / Relay Slot</span>
        </div>
      `;
    }
  }

  bayGridHTML += `</div>`;

  // Lower Standby Battery Shelf Chamber
  bayGridHTML += `
    <div class="bg-slate-900 border border-slate-800 p-3 rounded-xl mb-3">
      <div class="flex items-center justify-between mb-2">
        <span class="text-[11px] font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wide">
          <i data-lucide="battery-charging" class="w-3.5 h-3.5 text-emerald-400"></i> Lower Standby Battery Shelf (UL 294 / NFPA 731)
        </span>
        <span class="text-[10px] font-mono text-emerald-400">24VDC 14Ah SLA</span>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div class="bg-slate-950 border border-slate-800 p-2 rounded-lg flex items-center gap-2.5">
          <div class="w-8 h-10 bg-slate-800 rounded border border-slate-700 flex flex-col items-center justify-center font-mono text-[9px] text-slate-400">
            <span>+</span><span>12V</span>
          </div>
          <div>
            <span class="text-xs font-bold text-slate-200 block">SLA AGM Battery #1</span>
            <span class="text-[10px] font-mono text-slate-400">12V 7Ah Standby</span>
          </div>
        </div>
        <div class="bg-slate-950 border border-slate-800 p-2 rounded-lg flex items-center gap-2.5">
          <div class="w-8 h-10 bg-slate-800 rounded border border-slate-700 flex flex-col items-center justify-center font-mono text-[9px] text-slate-400">
            <span>+</span><span>12V</span>
          </div>
          <div>
            <span class="text-xs font-bold text-slate-200 block">SLA AGM Battery #2</span>
            <span class="text-[10px] font-mono text-slate-400">12V 7Ah In Series (24V)</span>
          </div>
        </div>
      </div>
    </div>
  `;

  frame.innerHTML = bayGridHTML;

  const badgeEl = document.getElementById("rackUtilizationBadge");
  const occupiedBays = Object.values(baySlots).filter(Boolean).length;
  if (badgeEl) badgeEl.innerText = `${occupiedBays} / ${totalBays} Bays Used`;
}

// -----------------------------------------------------------
// 3. Host Renderer: Industrial DIN-Rail NEMA Enclosure (Wall or Pole Mount)
// -----------------------------------------------------------
function renderIndustrialDinFrame(frame, assignedItems, unassignedItems, parsed, activeEnc) {
  const numRails = (activeEnc && activeEnc.dinRails) ? activeEnc.dinRails : 2;
  const railLengthMm = (activeEnc && activeEnc.railLengthMm) ? activeEnc.railLengthMm : 350;
  const mounting = (activeEnc && activeEnc.mountingMethod) ? activeEnc.mountingMethod : (parsed.mountingMethod || "wall");
  const isPoleMounted = mounting === "pole";

  // Distribute items across DIN rails
  const railBuckets = {};
  for (let r = 1; r <= numRails; r++) railBuckets[r] = [];

  assignedItems.forEach((item, idx) => {
    let rNum = parseInt(String(item.rackSlot).replace("Rail-", ""), 10);
    if (!rNum || rNum < 1 || rNum > numRails) {
      rNum = (idx % numRails) + 1;
      item.rackSlot = `Rail-${rNum}`;
    }
    railBuckets[rNum].push(item);
  });

  let dinHTML = `
    <!-- Weatherproof NEMA Enclosure Outer Frame -->
    <div class="p-3 bg-slate-900 border ${isPoleMounted ? 'border-cyan-900/60' : 'border-amber-900/60'} rounded-xl mb-3 flex items-center justify-between">
      <div class="flex items-center gap-2.5">
        <div class="p-1.5 rounded-lg ${isPoleMounted ? 'bg-cyan-950 border border-cyan-700/60 text-cyan-400' : 'bg-amber-950 border border-amber-700/60 text-amber-400'}">
          <i data-lucide="${isPoleMounted ? 'radio-tower' : 'box'}" class="w-4 h-4"></i>
        </div>
        <div>
          <span class="text-xs font-bold text-white block">${escapeHTML(activeEnc?.catalogVendor || 'Altelix')} ${escapeHTML(activeEnc?.catalogSku || 'NEMA-4X')} &bull; ${escapeHTML(activeEnc?.catalogModel || 'Weatherproof Industrial Enclosure')}</span>
          <span class="text-[10px] ${isPoleMounted ? 'text-cyan-400' : 'text-amber-400'} font-mono">
            ${isPoleMounted ? 'Pole Mount (Stainless Steel Banding)' : 'Wall Mount (Heavy-Duty Strut Flanges)'} &bull; ${numRails}x 35mm Rails &bull; ${railLengthMm}mm Width &bull; Max ${activeEnc?.maxWeightLbs || 100} lbs
          </span>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-[10px] font-mono font-bold text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800">$${(activeEnc?.msrp || 0).toLocaleString()} MSRP</span>
        ${isPoleMounted ? `
          <button 
            onclick="switchActiveRackElevation('${parsed.space} • Pole Mount')"
            ondragover="handleLocationTransferDragOver(event)"
            ondragleave="handleLocationTransferDragLeave(event)"
            ondrop="handleLocationTransferDrop(event, '${parsed.space} • Pole Mount')"
            class="px-2 py-1 bg-cyan-950 hover:bg-cyan-900 border border-cyan-700/60 text-cyan-300 rounded text-[10px] font-bold flex items-center gap-1 transition-colors shadow-sm"
            title="View outer Structural Pole elevation or drop hardware here to mount onto pole mast"
          >
            <i data-lucide="radio-tower" class="w-3 h-3"></i> View Pole Elevation
          </button>
        ` : ''}
        <span class="text-[10px] font-mono ${isPoleMounted ? 'text-cyan-300 bg-cyan-950/60 border-cyan-800' : 'text-emerald-400 bg-emerald-950/60 border-emerald-800'} px-2 py-0.5 rounded border">
          ${isPoleMounted ? `Pole Strapped @ ${activeEnc?.mountHeightFt || 10}ft AGL` : 'Wall Flanged'}
        </span>
      </div>
    </div>
  `;

  // Render Each DIN Rail Track
  for (let r = 1; r <= numRails; r++) {
    const itemsOnRail = railBuckets[r];
    const usedMm = itemsOnRail.reduce((acc, it) => acc + (it.widthMm || 55), 0);
    const pctUsed = Math.min(100, Math.round((usedMm / railLengthMm) * 100));

    dinHTML += `
      <div 
        class="bg-slate-900 border border-slate-800 rounded-xl p-3 mb-3"
        ondragover="handleRackSlotDragOver(event)"
        ondrop="handleDinRailDrop(event, ${r})"
      >
        <div class="flex items-center justify-between mb-2">
          <span class="text-[11px] font-bold text-amber-400 font-mono flex items-center gap-1.5">
            <i data-lucide="layers" class="w-3.5 h-3.5"></i> DIN Rail ${r} (Top-Hat 35mm)
          </span>
          <span class="text-[10px] font-mono text-slate-400">${usedMm}mm / ${railLengthMm}mm (${pctUsed}%)</span>
        </div>

        <!-- Metallic Rail Graphic Track -->
        <div class="relative bg-slate-950 rounded-lg p-2.5 border border-slate-800 min-h-[90px] flex items-center gap-2 overflow-x-auto">
          <!-- Center rail horizontal line -->
          <div class="absolute left-2 right-2 top-1/2 -translate-y-1/2 h-2.5 bg-slate-800 border-y border-amber-500/20 rounded pointer-events-none"></div>

          ${itemsOnRail.length === 0 ? `
            <div class="w-full text-center text-[10px] text-slate-500 font-mono py-4 z-10">
              Empty DIN Rail Track. Drag DIN switches or power supplies here.
            </div>
          ` : itemsOnRail.map(it => `
            <div 
              class="group relative z-10 shrink-0 bg-slate-900 border border-amber-500/60 hover:border-amber-400 p-2 rounded-lg shadow select-none flex flex-col justify-between"
              style="width: ${Math.max(90, (it.widthMm || 55) * 1.5)}px; min-height: 75px;"
              draggable="true"
              ondragstart="handleRackItemDragStart(event, '${it.instanceId}')"
            >
              <div class="flex items-center justify-between mb-1">
                <span class="text-[9px] font-mono text-amber-400 font-bold">${it.widthMm || 55}mm</span>
                <button onclick="unmountRackItem('${it.instanceId}')" class="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-amber-300" title="Unmount">
                  <i data-lucide="inbox" class="w-3 h-3"></i>
                </button>
              </div>
              <div>
                <div class="flex items-center gap-1 flex-wrap mb-0.5">
                  ${it.deviceNumber ? `<span class="px-1 py-0.2 rounded bg-brand-900/60 border border-brand-500/40 text-[8px] font-mono font-bold text-brand-300">${escapeHTML(it.deviceNumber)}</span>` : ''}
                  <span class="text-[11px] font-bold text-white block truncate" title="${escapeHTML(it.friendlyName || it.model)}">${escapeHTML(it.friendlyName || it.model)}</span>
                  <button type="button" onclick="event.stopPropagation(); promptEditDeviceFriendlyName('${it.instanceId}')" class="text-slate-400 hover:text-white p-0.5 rounded hover:bg-slate-800 transition-colors" title="Edit Friendly Name">
                    <i data-lucide="pencil" class="w-2.5 h-2.5"></i>
                  </button>
                </div>
                ${it.friendlyName && it.friendlyName !== it.model ? `<span class="text-[9px] text-slate-300 font-medium block truncate">${escapeHTML(it.model)}</span>` : ''}
                <span class="text-[9px] font-mono text-slate-400 block truncate">${it.ports ? `${it.ports}-Port Switch` : (it.role || 'DIN Hardware')}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  frame.innerHTML = dinHTML;

  const badgeEl = document.getElementById("rackUtilizationBadge");
  const totalOccupiedMm = assignedItems.reduce((acc, it) => acc + (it.widthMm || 55), 0);
  const totalCapMm = numRails * railLengthMm;
  if (badgeEl) badgeEl.innerText = `${totalOccupiedMm}mm / ${totalCapMm}mm Used`;
}

// -----------------------------------------------------------
// 4. Host Renderer: Structural Pole / Mast Assembly (Dynamic Height)
// -----------------------------------------------------------
function renderStructuralMountFrame(frame, assignedItems, unassignedItems, parsed, activeEnc) {
  let currentSpace = null;
  if (parsed.spaceId) {
    currentSpace = FacilityStore.getSpaces().find(s => s.id === parsed.spaceId);
  }
  if (!currentSpace && parsed.space) {
    currentSpace = FacilityStore.getSpaces().find(s => s.name.toLowerCase() === parsed.space.toLowerCase());
  }

  const poleHeight = (currentSpace && currentSpace.poleHeightFt) ? currentSpace.poleHeightFt : ((activeEnc && activeEnc.poleHeightFt) ? activeEnc.poleHeightFt : (parsed.poleHeightFt || 25));
  const diam = (currentSpace && currentSpace.poleDiameterInches) ? currentSpace.poleDiameterInches : ((activeEnc && activeEnc.poleDiameterInches) ? activeEnc.poleDiameterInches : 4);
  const poleEnclosures = currentSpace ? FacilityStore.getEnclosures(currentSpace.id) : [];

  // Dynamic Height Elevations (Configurable per Zone)
  const topElevation = poleHeight;
  const upperElevation = (currentSpace && currentSpace.poleUpperHeightFt) ? currentSpace.poleUpperHeightFt : Math.max(8, Math.round(poleHeight * 0.8));
  const midElevation = (currentSpace && currentSpace.poleMidHeightFt) ? currentSpace.poleMidHeightFt : Math.max(4, Math.round(poleHeight * 0.4));
  const baseElevation = 2;

  const zones = [
    { id: "Top-Mast", heightFt: topElevation, label: `Zone 1: Top of Mast (${topElevation} ft AGL)`, desc: "High-elevation antennas, PTZ dome, wireless PtP dish", icon: "radio" },
    { id: "Upper-Pole", heightFt: upperElevation, label: `Zone 2: Upper Pole (${upperElevation} ft AGL)`, desc: "Fixed cameras, illuminators, floodlights", icon: "video" },
    { id: "Mid-Pole", heightFt: midElevation, label: `Zone 3: Mid Pole (${midElevation} ft AGL)`, desc: "Weatherproof NEMA Box with stainless steel banding", icon: "box" },
    { id: "Base-Handhole", heightFt: baseElevation, label: `Zone 4: Pole Base (${baseElevation} ft AGL)`, desc: "Handhole cover, conduit stub-ups, ground rod lug", icon: "zap" }
  ];

  const zoneBuckets = { "Top-Mast": [], "Upper-Pole": [], "Mid-Pole": [], "Base-Handhole": [] };
  assignedItems.forEach((item, idx) => {
    let z = item.rackSlot;
    if (!zoneBuckets[z]) {
      z = zones[idx % zones.length].id;
      item.rackSlot = z;
    }
    zoneBuckets[z].push(item);
  });

  let poleHTML = `
    <!-- Pole Mast Schematic Header -->
    <div class="p-3 bg-slate-900 border border-cyan-900/60 rounded-xl mb-3 flex items-center justify-between">
      <div class="flex items-center gap-2.5">
        <div class="p-1.5 rounded-lg bg-cyan-950 border border-cyan-700/60 text-cyan-400">
          <i data-lucide="radio-tower" class="w-4 h-4"></i>
        </div>
        <div>
          <span class="text-xs font-bold text-white block">Structural Steel Pole & Mast Assembly (${poleHeight} ft AGL)</span>
          <span class="text-[10px] text-cyan-400 font-mono">${diam}" O.D. Sch 40 Steel &bull; Stainless Steel Strapping Bands &bull; Base Flange</span>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800">120 MPH Wind Rated</span>
      </div>
    </div>

    <!-- Vertical Pole Graphic & Elevation Zones -->
    <div class="space-y-2.5 mb-3">
  `;

  zones.forEach(z => {
    const itemsInZone = zoneBuckets[z.id];
    const isMidPole = z.id === "Mid-Pole";

    poleHTML += `
      <div 
        class="bg-slate-900 border border-slate-800 rounded-xl p-3"
        ondragover="handleRackSlotDragOver(event)"
        ondrop="handlePoleZoneDrop(event, '${z.id}')"
      >
        <div class="flex items-center justify-between mb-1.5 flex-wrap gap-1">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-[11px] font-bold text-cyan-400 font-mono flex items-center gap-1.5">
              <i data-lucide="${z.icon}" class="w-3.5 h-3.5"></i> ${z.label}
            </span>
            ${z.id === "Mid-Pole" ? `
              <div class="flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded border border-cyan-800 text-[10px]">
                <span class="text-slate-400 font-medium">Height:</span>
                <select 
                  onchange="updatePoleZoneHeight('${currentSpace ? currentSpace.id : ''}', 'Mid-Pole', parseInt(this.value, 10))"
                  class="bg-slate-900 border border-slate-700 text-cyan-300 font-bold rounded px-1.5 py-0.2 text-[10px] font-mono focus:outline-none focus:border-cyan-500 cursor-pointer"
                  title="Adjust Mid-Pole mounting height AGL"
                >
                  ${[4, 6, 8, 10, 12, 14, 16, 18].filter(h => h < upperElevation).map(h => `
                    <option value="${h}" ${h === midElevation ? 'selected' : ''}>${h} ft AGL</option>
                  `).join('')}
                </select>
              </div>
            ` : (z.id === "Upper-Pole" ? `
              <div class="flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded border border-cyan-800 text-[10px]">
                <span class="text-slate-400 font-medium">Height:</span>
                <select 
                  onchange="updatePoleZoneHeight('${currentSpace ? currentSpace.id : ''}', 'Upper-Pole', parseInt(this.value, 10))"
                  class="bg-slate-900 border border-slate-700 text-cyan-300 font-bold rounded px-1.5 py-0.2 text-[10px] font-mono focus:outline-none focus:border-cyan-500 cursor-pointer"
                  title="Adjust Upper-Pole mounting height AGL"
                >
                  ${[10, 12, 14, 16, 18, 20, 22, 25, 28, 30, 32, 35].filter(h => h < poleHeight && h > midElevation).map(h => `
                    <option value="${h}" ${h === upperElevation ? 'selected' : ''}>${h} ft AGL</option>
                  `).join('')}
                </select>
              </div>
            ` : '')}
          </div>
          <span class="text-[9px] font-mono text-slate-500">${itemsInZone.length} Device${itemsInZone.length === 1 ? '' : 's'}</span>
        </div>
        <p class="text-[10px] text-slate-400 mb-2">${z.desc}</p>

        <!-- Mounted Enclosures on this Pole (Requirement 1) -->
        ${isMidPole && poleEnclosures.length > 0 ? `
          <div class="space-y-2 mb-2.5">
            ${poleEnclosures.map(enc => `
              <div 
                class="p-2.5 rounded-xl border border-cyan-500/50 hover:border-cyan-400 bg-slate-950/80 shadow-md flex items-center justify-between transition-all"
                ondragover="handleLocationTransferDragOver(event)"
                ondragleave="handleLocationTransferDragLeave(event)"
                ondrop="handleLocationTransferDrop(event, '${escapeHTML(parsed.space)} • ${escapeHTML(enc.name)}')"
                title="Drop hardware here to transfer and mount inside ${escapeHTML(enc.name)}"
              >
                <div class="flex items-center gap-2.5 min-w-0">
                  <div class="p-1.5 rounded-lg bg-cyan-950 border border-cyan-700/60 text-cyan-400 shrink-0">
                    <i data-lucide="box" class="w-4 h-4"></i>
                  </div>
                  <div class="min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="text-xs font-bold text-white truncate">${escapeHTML(enc.name)}</span>
                      <span class="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-500/50 text-cyan-300">
                        Banded @ ${enc.mountHeightFt || midElevation} ft AGL
                      </span>
                    </div>
                    <span class="text-[10px] text-slate-400 font-mono block truncate">
                      ${enc.dinRails || 2}x DIN Rails &bull; ${enc.railLengthMm || 350}mm &bull; Weatherproof NEMA 4X
                    </span>
                  </div>
                </div>
                <button 
                  onclick="switchActiveRackElevation('${parsed.space} • ${enc.name}')"
                  class="px-2.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow shrink-0 ml-2"
                  title="Open internal DIN rail visualizer for ${escapeHTML(enc.name)}"
                >
                  <i data-lucide="layout-grid" class="w-3.5 h-3.5"></i> Inspect Enclosure (DIN Rails) &rarr;
                </button>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <div class="space-y-1.5 min-h-[44px]">
          ${itemsInZone.length === 0 ? `
            <div class="border border-dashed border-slate-800 rounded-lg p-2 text-center text-[10px] text-slate-600 font-mono">
              Available mounting zone at ${z.heightFt} ft elevation. Drag cameras or radios here.
            </div>
          ` : itemsInZone.map(it => `
            <div 
              class="group bg-slate-950 border border-cyan-500/50 hover:border-cyan-400 p-2 rounded-lg flex items-center justify-between select-none"
              draggable="true"
              ondragstart="handleRackItemDragStart(event, '${it.instanceId}')"
            >
              <div class="flex items-center gap-1.5 min-w-0 flex-wrap">
                <span class="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-800/80">@ ${z.heightFt}ft</span>
                ${it.deviceNumber ? `<span class="px-1.5 py-0.5 rounded bg-brand-900/60 border border-brand-500/40 text-[9px] font-mono font-bold text-brand-300">${escapeHTML(it.deviceNumber)}</span>` : ''}
                <span class="text-xs font-bold text-white truncate" title="${escapeHTML(it.friendlyName || it.model)}">${escapeHTML(it.friendlyName || it.model)}</span>
                <button type="button" onclick="event.stopPropagation(); promptEditDeviceFriendlyName('${it.instanceId}')" class="text-slate-400 hover:text-white p-0.5 rounded hover:bg-slate-800 transition-colors" title="Edit Friendly Name">
                  <i data-lucide="pencil" class="w-2.5 h-2.5"></i>
                </button>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <span class="text-[10px] font-mono text-slate-400">${it.role || 'Edge'}</span>
                <button onclick="unmountRackItem('${it.instanceId}')" class="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-amber-300" title="Unmount">
                  <i data-lucide="inbox" class="w-3 h-3"></i>
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  });

  poleHTML += `</div>`;
  frame.innerHTML = poleHTML;

  const badgeEl = document.getElementById("rackUtilizationBadge");
  if (badgeEl) badgeEl.innerText = `${assignedItems.length} Devices @ ${poleHeight}ft`;
}

// -----------------------------------------------------------
// 5. Host Renderer: Architectural Backboard (Plywood Wallfield)
// -----------------------------------------------------------
function renderArchitecturalBackboardFrame(frame, assignedItems, unassignedItems, parsed, activeEnc) {
  const widthFt = (activeEnc && activeEnc.widthFt) ? activeEnc.widthFt : 4;
  const heightFt = (activeEnc && activeEnc.heightFt) ? activeEnc.heightFt : 8;
  const sqFt = widthFt * heightFt;

  const quadrants = [
    { id: "Demarc-NID", label: "Telco Demarc & ISP NID Zone", desc: "Fiber patch panels, demarc blocks", icon: "network" },
    { id: "Punchdown-Block", label: "66 / 110 Punchdown Field", desc: "Analog voice, paging cross-connects", icon: "phone" },
    { id: "Wall-Bracket", label: "Hinged Wall Brackets", desc: "Wall-mount patch panels, small switches", icon: "server" },
    { id: "Power-Zone", label: "Low Voltage Power Zone", desc: "LifeSafety / Altronix wall supplies", icon: "zap" }
  ];

  const quadBuckets = { "Demarc-NID": [], "Punchdown-Block": [], "Wall-Bracket": [], "Power-Zone": [] };
  assignedItems.forEach((item, idx) => {
    let q = item.rackSlot;
    if (!quadBuckets[q]) {
      q = quadrants[idx % quadrants.length].id;
      item.rackSlot = q;
    }
    quadBuckets[q].push(item);
  });

  let boardHTML = `
    <!-- Fire-Rated Plywood Backboard Header -->
    <div class="p-3 bg-slate-900 border border-purple-900/60 rounded-xl mb-3 flex items-center justify-between">
      <div class="flex items-center gap-2.5">
        <div class="p-1.5 rounded-lg bg-purple-950 border border-purple-700/60 text-purple-400">
          <i data-lucide="layers" class="w-4 h-4"></i>
        </div>
        <div>
          <span class="text-xs font-bold text-white block">${escapeHTML(activeEnc?.catalogVendor || 'Superior Telecom')} ${escapeHTML(activeEnc?.catalogSku || 'BB-4X8-FR')} &bull; ${escapeHTML(activeEnc?.catalogModel || 'Fire-Retardant Plywood Backboard')}</span>
          <span class="text-[10px] text-purple-400 font-mono">${widthFt}' x ${heightFt}' (${sqFt} sq ft) &bull; Fire-Marshal Rated Stamp &bull; NEC 110.26 Compliant</span>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-[10px] font-mono font-bold text-purple-400 bg-purple-950/80 px-2 py-0.5 rounded border border-purple-800">$${(activeEnc?.msrp || 0).toLocaleString()} MSRP</span>
        <span class="text-[10px] font-mono text-purple-400 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800">3/4" Thick Plywood</span>
      </div>
    </div>

    <!-- Wallfield Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
  `;

  quadrants.forEach(q => {
    const itemsInQuad = quadBuckets[q.id];
    boardHTML += `
      <div 
        class="bg-slate-900 border border-slate-800 rounded-xl p-3"
        ondragover="handleRackSlotDragOver(event)"
        ondrop="handleBackboardQuadDrop(event, '${q.id}')"
      >
        <div class="flex items-center justify-between mb-1.5">
          <span class="text-[11px] font-bold text-purple-400 font-mono flex items-center gap-1.5">
            <i data-lucide="${q.icon}" class="w-3.5 h-3.5"></i> ${q.label}
          </span>
          <span class="text-[9px] font-mono text-slate-500">${itemsInQuad.length} Item${itemsInQuad.length === 1 ? '' : 's'}</span>
        </div>
        <p class="text-[10px] text-slate-400 mb-2">${q.desc}</p>

        <div class="space-y-1.5 min-h-[44px]">
          ${itemsInQuad.length === 0 ? `
            <div class="border border-dashed border-slate-800 rounded-lg p-2 text-center text-[10px] text-slate-600 font-mono">
              Empty wall field zone.
            </div>
          ` : itemsInQuad.map(it => `
            <div 
              class="group bg-slate-950 border border-purple-500/50 hover:border-purple-400 p-2 rounded-lg flex items-center justify-between select-none"
              draggable="true"
              ondragstart="handleRackItemDragStart(event, '${it.instanceId}')"
            >
              <div class="flex items-center gap-1.5 min-w-0 flex-wrap">
                ${it.deviceNumber ? `<span class="px-1.5 py-0.5 rounded bg-brand-900/60 border border-brand-500/40 text-[9px] font-mono font-bold text-brand-300">${escapeHTML(it.deviceNumber)}</span>` : ''}
                <span class="text-xs font-bold text-white truncate" title="${escapeHTML(it.friendlyName || it.model)}">${escapeHTML(it.friendlyName || it.model)}</span>
                <button type="button" onclick="event.stopPropagation(); promptEditDeviceFriendlyName('${it.instanceId}')" class="text-slate-400 hover:text-white p-0.5 rounded hover:bg-slate-800 transition-colors" title="Edit Friendly Name">
                  <i data-lucide="pencil" class="w-2.5 h-2.5"></i>
                </button>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <span class="text-[10px] font-mono text-slate-400">${it.role || 'Module'}</span>
                <button onclick="unmountRackItem('${it.instanceId}')" class="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-amber-300" title="Unmount">
                  <i data-lucide="inbox" class="w-3 h-3"></i>
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  });

  boardHTML += `</div>`;
  frame.innerHTML = boardHTML;

  const badgeEl = document.getElementById("rackUtilizationBadge");
  if (badgeEl) badgeEl.innerText = `${assignedItems.length} Items Mounted`;
}

// -----------------------------------------------------------
// Dedicated Prominent Unassigned Staging Dock & Drawer (Requirement 2)
// -----------------------------------------------------------
function renderRackUnassignedStagingDock(unassignedItems, parsed, activeEnc) {
  const container = document.getElementById("rackUnassignedStagingDock");
  if (!container) return;

  const hostType = parsed.hostType || "equipment_rack";
  const hostLabel = FacilityStore.HOST_TYPES[hostType]?.label || "Mounting Host";

  if (!unassignedItems || unassignedItems.length === 0) {
    container.innerHTML = `
      <div 
        ondragover="handleLocationTransferDragOver(event)"
        ondragleave="handleLocationTransferDragLeave(event)"
        ondrop="handleLocationTransferDrop(event, 'Unassigned')"
        class="px-3 py-2 bg-slate-950/70 border border-dashed border-slate-800 rounded-xl flex items-center justify-between text-xs text-slate-400 select-none hover:border-slate-700 transition-colors"
        title="All project equipment is currently slotted or assigned. Drag any slotted item here to unmount back to Staging."
      >
        <span class="flex items-center gap-1.5 font-medium text-[11px] text-slate-300">
          <i data-lucide="check-circle" class="w-3.5 h-3.5 text-emerald-400"></i>
          <span>All Quote Equipment Housed</span>
        </span>
        <span class="text-[10px] text-slate-500 font-mono">
          Drag slotted item here to unmount
        </span>
      </div>
    `;
    return;
  }

  // Count compatible items for active host
  let compatCount = 0;
  unassignedItems.forEach(it => {
    const comp = checkDeviceHostCompatibility(it, hostType);
    if (comp.compatible) compatCount++;
  });

  container.innerHTML = `
    <div 
      ondragover="handleLocationTransferDragOver(event)"
      ondragleave="handleLocationTransferDragLeave(event)"
      ondrop="handleLocationTransferDrop(event, 'Unassigned')"
      class="p-3 bg-gradient-to-r from-amber-950/30 via-slate-950/80 to-indigo-950/30 border border-amber-500/40 rounded-xl space-y-2.5 shadow-lg select-none transition-all"
    >
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <div class="p-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 shadow-sm">
            <i data-lucide="inbox" class="w-3.5 h-3.5"></i>
          </div>
          <div>
            <span class="text-xs font-bold text-white flex items-center gap-1.5">
              <span>Unassigned Hardware Staging</span>
              <span class="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                ${unassignedItems.length} Waiting
              </span>
            </span>
          </div>
        </div>

        <div class="flex items-center gap-1.5">
          ${compatCount > 0 ? `
            <button 
              onclick="autoMountAllToActiveRack()" 
              class="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-bold shadow flex items-center gap-1 transition-colors cursor-pointer"
              title="Auto-slot ${compatCount} compatible item${compatCount === 1 ? '' : 's'} into this ${hostLabel}"
            >
              <i data-lucide="layout-grid" class="w-3 h-3"></i> Auto-Mount (${compatCount})
            </button>
          ` : ''}
          <span class="text-[10px] text-slate-400 font-mono hidden sm:inline">Drag down into slots</span>
        </div>
      </div>

      <!-- Horizontal Carousel of Staged Cards -->
      <div class="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
        ${unassignedItems.map(it => {
          const comp = checkDeviceHostCompatibility(it, hostType);
          const isCompatible = comp.compatible;

          return `
            <div 
              draggable="true"
              ondragstart="handleRackItemDragStart(event, '${it.instanceId}')"
              class="shrink-0 bg-slate-900 border ${isCompatible ? 'border-indigo-500/40 hover:border-indigo-400' : 'border-slate-800 hover:border-slate-700 opacity-80'} p-2 rounded-lg cursor-grab active:cursor-grabbing text-xs space-y-1 w-56 shadow transition-all group"
              title="${comp.advisory || 'Drag into empty slot or click Mount Here'}"
            >
              <div class="flex items-start justify-between gap-1">
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-1 flex-wrap">
                    ${it.deviceNumber ? `<span class="px-1 py-0.2 rounded bg-brand-900/60 border border-brand-500/40 text-[8.5px] font-mono font-bold text-brand-300">${escapeHTML(it.deviceNumber)}</span>` : ''}
                    <span class="font-bold text-white text-[11px] truncate block" title="${escapeHTML(it.friendlyName || it.model)}">${escapeHTML(it.friendlyName || it.model)}</span>
                    <button type="button" onclick="event.stopPropagation(); promptEditDeviceFriendlyName('${it.instanceId}')" class="text-slate-400 hover:text-white p-0.5 rounded hover:bg-slate-800 transition-colors" title="Edit Friendly Name">
                      <i data-lucide="pencil" class="w-2.5 h-2.5"></i>
                    </button>
                  </div>
                  ${it.friendlyName && it.friendlyName !== it.model ? `<span class="text-[9.5px] text-slate-300 font-medium block truncate">${escapeHTML(it.model)}</span>` : ''}
                </div>
                <span class="text-[8.5px] font-mono px-1 py-0.2 rounded font-bold shrink-0 ${isCompatible ? 'bg-emerald-950/80 border border-emerald-700/60 text-emerald-300' : 'bg-slate-800 border border-slate-700 text-slate-400'}">
                  ${comp.matchBadge || (isCompatible ? 'COMPATIBLE' : 'SECONDARY')}
                </span>
              </div>

              <div class="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>${escapeHTML(it.role || 'Hardware')}</span>
                <span class="text-amber-300 font-bold">${it.consumedPoEWatts || it.baseWatts || 0}W</span>
              </div>

              ${isStackableSwitch(it) ? `
                <div class="flex items-center justify-between gap-1 py-1 border-t border-slate-800/80 text-[9.5px] font-mono">
                  <span class="text-slate-400">Stack:</span>
                  ${(it.stackedUnits && it.stackedUnits >= 2) ? `
                    <div class="flex items-center gap-1 bg-slate-950 px-1 py-0.5 rounded border border-slate-800">
                      <button type="button" onclick="event.stopPropagation(); updateSwitchStackFromRack('${it.instanceId}', ${it.stackedUnits - 1})" class="w-4 h-4 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center font-bold" title="Decrease stack">-</button>
                      <span class="text-indigo-300 font-bold px-1">${it.stackedUnits}x</span>
                      <button type="button" onclick="event.stopPropagation(); updateSwitchStackFromRack('${it.instanceId}', ${it.stackedUnits + 1})" class="w-4 h-4 rounded bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center font-bold" title="Add stack member" ${it.stackedUnits >= 8 ? 'disabled' : ''}>+</button>
                    </div>
                  ` : `
                    <button type="button" onclick="event.stopPropagation(); updateSwitchStackFromRack('${it.instanceId}', 2)" class="px-1.5 py-0.5 rounded bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-300 hover:text-white flex items-center gap-1 transition-colors" title="Create 2-switch virtual stack">
                      <i data-lucide="layers" class="w-2.5 h-2.5"></i> + Stack
                    </button>
                  `}
                </div>
              ` : ''}

              <div class="pt-1 border-t border-slate-800 flex items-center justify-between gap-1">
                <button 
                  onclick="mountItemToFirstAvailableSlot('${it.instanceId}')" 
                  class="flex-1 px-1.5 py-0.5 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white rounded text-[9.5px] font-bold border border-indigo-500/40 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  title="Mount into first free slot of this host"
                >
                  <i data-lucide="arrow-down" class="w-2.5 h-2.5"></i> Mount Here
                </button>
                <button 
                  onclick="jumpToBomTarget('${it.instanceId}')" 
                  class="p-1 text-slate-400 hover:text-emerald-300 transition-colors"
                  title="Inspect in BOM"
                >
                  <i data-lucide="file-spreadsheet" class="w-3 h-3"></i>
                </button>
                <button 
                  type="button"
                  onclick="event.stopPropagation(); deleteDeviceFromBOM('${it.instanceId}')" 
                  class="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                  title="Delete from Quote BOM"
                >
                  <i data-lucide="trash-2" class="w-3 h-3"></i>
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function renderHostStagingDrawer(unassignedItems, parsed, activeEnc) {
  const container = document.getElementById("hostStagingDrawerContainer");
  const countBadge = document.getElementById("hostStagingCount");
  const tabBadge = document.getElementById("hostStagingTabBadge");

  const count = unassignedItems ? unassignedItems.length : 0;
  if (countBadge) countBadge.innerText = count;
  if (tabBadge) tabBadge.innerText = `${count} Device${count === 1 ? '' : 's'}`;

  if (!container) return;

  if (count === 0) {
    container.innerHTML = `
      <div class="py-8 text-center text-slate-500 text-xs bg-slate-950/60 rounded-xl border border-dashed border-slate-800">
        <i data-lucide="check-circle" class="w-6 h-6 mx-auto mb-1.5 text-emerald-400/60"></i>
        <p class="font-medium text-slate-300">All equipment is mounted or assigned.</p>
        <p class="text-[10px] text-slate-500 mt-0.5">Drag slotted items here to return to staging.</p>
      </div>
    `;
    return;
  }

  const hostType = parsed.hostType || "equipment_rack";

  container.innerHTML = unassignedItems.map(it => {
    const comp = checkDeviceHostCompatibility(it, hostType);
    return `
      <div 
        draggable="true"
        ondragstart="handleRackItemDragStart(event, '${it.instanceId}')"
        class="bg-slate-950 p-2.5 rounded-xl border ${comp.compatible ? 'border-indigo-500/40' : 'border-slate-800'} space-y-2 cursor-grab active:cursor-grabbing hover:border-indigo-400 transition-all shadow-sm"
      >
        <div class="flex items-start justify-between gap-1">
          <div class="min-w-0">
            <div class="flex items-center gap-1 flex-wrap">
              ${it.deviceNumber ? `<span class="px-1.5 py-0.2 rounded bg-brand-900/60 border border-brand-500/40 text-[8.5px] font-mono font-bold text-brand-300">${escapeHTML(it.deviceNumber)}</span>` : ''}
              <span class="font-bold text-white text-xs block truncate" title="${escapeHTML(it.friendlyName || it.model)}">${escapeHTML(it.friendlyName || it.model)}</span>
              <button type="button" onclick="event.stopPropagation(); promptEditDeviceFriendlyName('${it.instanceId}')" class="text-slate-400 hover:text-white p-0.5 rounded hover:bg-slate-800 transition-colors" title="Edit Friendly Name">
                <i data-lucide="pencil" class="w-2.5 h-2.5"></i>
              </button>
            </div>
            ${it.friendlyName && it.friendlyName !== it.model ? `<span class="text-[10px] text-slate-300 font-medium block truncate">${escapeHTML(it.model)}</span>` : ''}
            <span class="text-[10px] text-slate-400 font-mono">${escapeHTML(it.role || 'Hardware')} &bull; ${it.consumedPoEWatts || it.baseWatts || 0}W</span>
          </div>
          <span class="text-[9px] font-mono px-1.5 py-0.2 rounded font-bold shrink-0 ${comp.compatible ? 'bg-emerald-950/80 border border-emerald-700/60 text-emerald-300' : 'bg-slate-800 text-slate-400'}">
            ${comp.matchBadge || 'SECONDARY'}
          </span>
        </div>
        <div class="flex items-center gap-1.5 pt-1.5 border-t border-slate-900">
          <button 
            onclick="mountItemToFirstAvailableSlot('${it.instanceId}')"
            class="flex-1 py-1 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white rounded text-[10px] font-bold border border-indigo-500/40 transition-colors flex items-center justify-center gap-1 cursor-pointer"
          >
            <i data-lucide="plus" class="w-3 h-3"></i> Mount in this Host
          </button>
          <button 
            onclick="jumpToBomTarget('${it.instanceId}')"
            class="p-1 bg-slate-900 text-slate-400 hover:text-emerald-300 rounded border border-slate-800 transition-colors"
            title="View in BOM"
          >
            <i data-lucide="file-spreadsheet" class="w-3.5 h-3.5"></i>
          </button>
          <button 
            type="button"
            onclick="event.stopPropagation(); deleteDeviceFromBOM('${it.instanceId}')"
            class="p-1 bg-slate-900 text-slate-400 hover:text-rose-400 rounded border border-slate-800 transition-colors"
            title="Delete from Quote BOM"
          >
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function mountItemToFirstAvailableSlot(instanceId) {
  if (!instanceId || typeof projectBOM === "undefined") return;
  const parsed = FacilityStore.parse(activeRackId);
  const hostType = parsed.hostType || "equipment_rack";

  if (hostType === "equipment_rack") {
    const targetItem = projectBOM.find(i => i.instanceId === instanceId);
    if (!targetItem) return;

    // Assign active rack
    targetItem.closetName = activeRackId;
    targetItem.rackId = activeRackId;
    projectBOM.filter(ch => ch.parentInstanceId === targetItem.instanceId).forEach(ch => {
      ch.closetName = activeRackId;
      ch.rackId = activeRackId;
    });

    if (typeof autoSelectMountingForHost === "function") {
      autoSelectMountingForHost(targetItem, activeRackId, hostType);
    }

    // Collect all mountable items currently in active rack (including targetItem)
    const mountableItems = projectBOM.filter(item => {
      if (item.parentInstanceId) return false;
      if (item.role === "Optics & DAC" || item.role === "Mgmt License" || item.role === "Security License") return false;
      const itemLoc = FacilityStore.normalize(item.closetName || item.rackId);
      if (itemLoc !== activeRackId) return false;
      const compat = checkDeviceHostCompatibility(item, hostType);
      return compat.compatible;
    });

    // Calculate total required RU to ensure fit
    let totalRU = 0;
    mountableItems.forEach(item => {
      const rawRU = (item.rackUnits !== undefined && item.rackUnits !== null) ? parseInt(item.rackUnits, 10) : 1;
      if (rawRU === 0) return; // 0U items do not consume rack rail slots
      const stackUnits = (item.stackedUnits && item.stackedUnits >= 2) ? item.stackedUnits : 1;
      const ppOffset = (stackUnits >= 2 && item.patchPanelBetween) ? (stackUnits - 1) : 0;
      const h = (rawRU * stackUnits) + ppOffset;
      totalRU += h;
    });

    if (totalRU > activeRackHeight) {
      targetItem.rackSlot = null;
      if (typeof showToast === "function") {
        showToast(`Cannot mount ${targetItem.model}: rack capacity exceeded (${totalRU}U needed, ${activeRackHeight}U available in ${activeRackId}).`);
      }
      return;
    }

    // Sort according to Enterprise Priority matching autoMountAllToActiveRack:
    // ISP Equipment (1) > Firewalls (2) > Core (3) > Aggregation (4) > Access (5, ports desc) > Servers (6) > UPS (7) > Other (8)
    mountableItems.sort((a, b) => {
      const pA = getDeviceMountPriority(a);
      const pB = getDeviceMountPriority(b);
      if (pA.priority !== pB.priority) {
        return pA.priority - pB.priority;
      }
      if (pA.priority === 5 || pA.portCount || pB.portCount) {
        const portDiff = (pB.portCount || 0) - (pA.portCount || 0);
        if (portDiff !== 0) return portDiff;
      }
      return (a.model || "").localeCompare(b.model || "");
    });

    const slots = {};
    for (let u = 1; u <= activeRackHeight; u++) slots[u] = null;
    mountableItems.forEach(i => i.rackSlot = null);

    const upsItems = mountableItems.filter(i => getDeviceMountPriority(i).priority === 7);
    const nonUpsItems = mountableItems.filter(i => getDeviceMountPriority(i).priority !== 7);

    // 1. Mount network & server gear top-to-bottom: ISP > Firewalls > Core > Aggregation > Access > Servers
    nonUpsItems.forEach(item => {
      const rawRU = (item.rackUnits !== undefined && item.rackUnits !== null) ? parseInt(item.rackUnits, 10) : 1;
      if (rawRU === 0) return;
      const stackUnits = (item.stackedUnits && item.stackedUnits >= 2) ? item.stackedUnits : 1;
      const ppOffset = (stackUnits >= 2 && item.patchPanelBetween) ? (stackUnits - 1) : 0;
      const itemHeight = (rawRU * stackUnits) + ppOffset;
      const slot = findNextAvailableSlotFromTop(slots, itemHeight, activeRackHeight);
      if (slot) {
        item.rackSlot = slot;
        for (let offset = 0; offset < itemHeight; offset++) {
          slots[slot + offset] = item.instanceId;
        }
      }
    });

    // 2. Mount heavy UPS / battery backup systems at the bottom of the rack (U1+) ascending
    upsItems.forEach(item => {
      const rawRU = (item.rackUnits !== undefined && item.rackUnits !== null) ? parseInt(item.rackUnits, 10) : 2;
      if (rawRU === 0) return;
      const stackUnits = (item.stackedUnits && item.stackedUnits >= 2) ? item.stackedUnits : 1;
      const ppOffset = (stackUnits >= 2 && item.patchPanelBetween) ? (stackUnits - 1) : 0;
      const itemHeight = (rawRU * stackUnits) + ppOffset;
      const slot = findNextAvailableSlot(slots, itemHeight, activeRackHeight);
      if (slot) {
        item.rackSlot = slot;
        for (let offset = 0; offset < itemHeight; offset++) {
          slots[slot + offset] = item.instanceId;
        }
      }
    });

    FacilityStore.notifyWorkspaceChange();
    renderRackVisualizer();
    if (typeof updateBOMView === "function") updateBOMView();
    if (typeof renderTopology === "function") renderTopology();
    if (typeof StorageService !== "undefined" && typeof StorageService.queueAutoSave === "function") {
      StorageService.queueAutoSave();
    }
    if (typeof showToast === "function") {
      const uLabel = targetItem.rackSlot ? `U${targetItem.rackSlot}` : 'unslotted';
      showToast(`Mounted ${targetItem.model} at ${uLabel} in ${activeRackId} (auto-prioritized)`);
    }
  } else if (hostType === "security_cabinet") {
    const occupied = new Set();
    projectBOM.forEach(item => {
      const itemLoc = FacilityStore.normalize(item.closetName || item.rackId);
      if (itemLoc === activeRackId && item.rackSlot) {
        occupied.add(parseInt(item.rackSlot, 10));
      }
    });

    let targetBay = 1;
    for (let b = 1; b <= 16; b++) {
      if (!occupied.has(b)) {
        targetBay = b;
        break;
      }
    }

    const item = projectBOM.find(i => i.instanceId === instanceId);
    if (item) {
      item.rackSlot = targetBay;
      item.closetName = activeRackId;
      item.rackId = activeRackId;
      FacilityStore.notifyWorkspaceChange();
      renderRackVisualizer();
      if (typeof showToast === "function") {
        showToast(`Mounted ${item.model} in Bay ${targetBay}`);
      }
    }
  } else if (hostType === "industrial_din") {
    const item = projectBOM.find(i => i.instanceId === instanceId);
    if (item) {
      item.rackSlot = "Rail 1";
      item.closetName = activeRackId;
      item.rackId = activeRackId;
      FacilityStore.notifyWorkspaceChange();
      renderRackVisualizer();
      if (typeof showToast === "function") {
        showToast(`Mounted ${item.model} on DIN Rail`);
      }
    }
  } else if (hostType === "structural_mount") {
    const item = projectBOM.find(i => i.instanceId === instanceId);
    if (item) {
      item.rackSlot = "Mid-Pole";
      item.closetName = activeRackId;
      item.rackId = activeRackId;
      FacilityStore.notifyWorkspaceChange();
      renderRackVisualizer();
      if (typeof showToast === "function") {
        showToast(`Mounted ${item.model} on Pole Assembly`);
      }
    }
  } else {
    const item = projectBOM.find(i => i.instanceId === instanceId);
    if (item) {
      item.rackSlot = "Zone A";
      item.closetName = activeRackId;
      item.rackId = activeRackId;
      FacilityStore.notifyWorkspaceChange();
      renderRackVisualizer();
      if (typeof showToast === "function") {
        showToast(`Mounted ${item.model} on Backboard`);
      }
    }
  }
}

// -----------------------------------------------------------
// Drag & Drop Mechanics
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

function calculateRackBumpDisplacements(otherItems, newItemId, targetU, newItemHeight, maxU) {
  if (targetU + newItemHeight - 1 > maxU) {
    return { success: false, reason: "exceeds_top" };
  }
  if (targetU < 1) {
    return { success: false, reason: "exceeds_bottom" };
  }

  function getItemH(it) {
    if (!it) return newItemHeight;
    return getRackItemHeight(it);
  }

  // 1. Primary Strategy: Cascading Bump DOWN (pushes occupying & lower items down toward U1)
  const placementsDown = {};
  placementsDown[newItemId] = targetU;
  let currentCeiling = targetU - 1;
  const sortedDown = [...otherItems].sort((a, b) => parseInt(b.rackSlot, 10) - parseInt(a.rackSlot, 10));
  let canDown = true;
  let bumpedCountDown = 0;

  for (const it of sortedDown) {
    const origBase = parseInt(it.rackSlot, 10);
    const h = getItemH(it);
    const origTop = origBase + h - 1;

    // If strictly above new item's occupied span, it is unaffected by bump down
    if (origBase > (targetU + newItemHeight - 1)) {
      placementsDown[it.instanceId] = origBase;
      continue;
    }

    const overlapsNew = Math.max(origBase, targetU) <= Math.min(origTop, targetU + newItemHeight - 1);
    if (overlapsNew || origTop > currentCeiling) {
      const newTop = Math.min(origTop, currentCeiling);
      const newBase = newTop - h + 1;
      if (newBase < 1) {
        canDown = false;
        break;
      }
      placementsDown[it.instanceId] = newBase;
      currentCeiling = newBase - 1;
      if (newBase !== origBase) bumpedCountDown++;
    } else {
      placementsDown[it.instanceId] = origBase;
      currentCeiling = Math.min(currentCeiling, origBase - 1);
    }
  }

  // Check for pairwise collisions in placementsDown
  if (canDown) {
    const spans = [];
    for (const iId of Object.keys(placementsDown)) {
      const it = (iId === newItemId) ? null : otherItems.find(x => x.instanceId === iId);
      const h = getItemH(it);
      const slot = placementsDown[iId];
      spans.push({ id: iId, start: slot, end: slot + h - 1 });
    }
    for (let i = 0; i < spans.length; i++) {
      for (let j = i + 1; j < spans.length; j++) {
        if (Math.max(spans[i].start, spans[j].start) <= Math.min(spans[i].end, spans[j].end)) {
          canDown = false;
          break;
        }
      }
      if (!canDown) break;
    }
  }

  if (canDown) {
    return { success: true, placements: placementsDown, bumpedCount: bumpedCountDown, direction: "down" };
  }

  // 2. Secondary Strategy: If cascading bump DOWN hits bottom (U1), try Bump UPWARD
  const placementsUp = {};
  placementsUp[newItemId] = targetU;
  let currentFloor = targetU + newItemHeight;
  const sortedUp = [...otherItems].sort((a, b) => parseInt(a.rackSlot, 10) - parseInt(b.rackSlot, 10));
  let canUp = true;
  let bumpedCountUp = 0;

  for (const it of sortedUp) {
    const origBase = parseInt(it.rackSlot, 10);
    const h = getItemH(it);
    const origTop = origBase + h - 1;

    // If strictly below new item's bottom U, unaffected by bump up
    if (origTop < targetU) {
      placementsUp[it.instanceId] = origBase;
      continue;
    }

    const overlapsNew = Math.max(origBase, targetU) <= Math.min(origTop, targetU + newItemHeight - 1);
    if (overlapsNew || origBase < currentFloor) {
      const newBase = Math.max(origBase, currentFloor);
      const newTop = newBase + h - 1;
      if (newTop > maxU) {
        canUp = false;
        break;
      }
      placementsUp[it.instanceId] = newBase;
      currentFloor = newTop + 1;
      if (newBase !== origBase) bumpedCountUp++;
    } else {
      placementsUp[it.instanceId] = origBase;
      currentFloor = Math.max(currentFloor, origTop + 1);
    }
  }

  if (canUp) {
    const spans = [];
    for (const iId of Object.keys(placementsUp)) {
      const it = (iId === newItemId) ? null : otherItems.find(x => x.instanceId === iId);
      const h = getItemH(it);
      const slot = placementsUp[iId];
      spans.push({ id: iId, start: slot, end: slot + h - 1 });
    }
    for (let i = 0; i < spans.length; i++) {
      for (let j = i + 1; j < spans.length; j++) {
        if (Math.max(spans[i].start, spans[j].start) <= Math.min(spans[i].end, spans[j].end)) {
          canUp = false;
          break;
        }
      }
      if (!canUp) break;
    }
  }

  if (canUp) {
    return { success: true, placements: placementsUp, bumpedCount: bumpedCountUp, direction: "up" };
  }

  return { success: false, reason: "insufficient_space" };
}

function handleRackSlotDrop(e, targetU) {
  e.preventDefault();
  const instanceId = draggedRackItemInstanceId || e.dataTransfer.getData("text/plain");
  if (!instanceId || typeof projectBOM === "undefined") return;

  const item = projectBOM.find(i => i.instanceId === instanceId);
  if (!item) return;

  const dropHostType = (typeof FacilityStore !== "undefined" && typeof FacilityStore.parse === "function") 
    ? (FacilityStore.parse(activeRackId).hostType || "equipment_rack")
    : "equipment_rack";
  if (typeof autoSelectMountingForHost === "function") {
    autoSelectMountingForHost(item, activeRackId, dropHostType);
  }

  const stackUnits = (item.stackedUnits && item.stackedUnits >= 2) ? item.stackedUnits : 1;
  const itemHeight = getRackItemHeight(item);

  if (itemHeight > activeRackHeight) {
    if (typeof showToast === "function") {
      showToast(`Cannot place ${itemHeight}U (${item.model}): exceeds total cabinet height (${activeRackHeight}U).`);
    }
    draggedRackItemInstanceId = null;
    return;
  }

  // When dragging a multiple U device, targetU represents where the TOP of the unit should go.
  // Calculate base U: baseU = targetU - itemHeight + 1 (clamped so baseU >= 1 and top <= activeRackHeight).
  let effectiveBaseU = targetU - itemHeight + 1;
  if (effectiveBaseU < 1) effectiveBaseU = 1;
  if ((effectiveBaseU + itemHeight - 1) > activeRackHeight) {
    effectiveBaseU = Math.max(1, activeRackHeight - itemHeight + 1);
  }

  // 1. Collect other items mounted in this rack
  const otherItems = projectBOM.filter(other => {
    if (other.instanceId === item.instanceId || other.parentInstanceId) return false;
    const otherLoc = FacilityStore.normalize(other.closetName || other.rackId);
    if (otherLoc !== activeRackId) return false;
    const otherU = parseInt(other.rackSlot, 10);
    return !!(otherU && !isNaN(otherU) && otherU >= 1);
  });

  // 2. Calculate placements with intelligent cascading displacement ("bump down")
  const bumpRes = calculateRackBumpDisplacements(otherItems, item.instanceId, effectiveBaseU, itemHeight, activeRackHeight);

  if (!bumpRes.success) {
    if (typeof showToast === "function") {
      if (bumpRes.reason === "exceeds_top") {
        showToast(`Cannot place ${itemHeight}U device at U${targetU}: exceeds cabinet top (U${activeRackHeight}).`);
      } else {
        showToast(`Cannot place ${item.model} at U${targetU}: rack has insufficient space below U1 to bump occupying equipment down.`);
      }
    }
    draggedRackItemInstanceId = null;
    return;
  }

  // 3. Commit all displacements
  Object.keys(bumpRes.placements).forEach(instId => {
    const targetItem = projectBOM.find(x => x.instanceId === instId);
    if (targetItem) {
      targetItem.rackSlot = bumpRes.placements[instId];
      targetItem.closetName = activeRackId;
      targetItem.rackId = activeRackId;
      projectBOM.filter(ch => ch.parentInstanceId === targetItem.instanceId).forEach(ch => {
        ch.closetName = activeRackId;
        ch.rackId = activeRackId;
      });
    }
  });

  FacilityStore.notifyWorkspaceChange();
  renderRackVisualizer();
  if (typeof updateBOMView === "function") updateBOMView();
  if (typeof renderTopology === "function") renderTopology();
  if (typeof StorageService !== "undefined" && typeof StorageService.queueAutoSave === "function") {
    StorageService.queueAutoSave();
  }

  const topU = effectiveBaseU + itemHeight - 1;
  const slotLabel = itemHeight > 1 ? `U${topU}-U${effectiveBaseU}` : `U${effectiveBaseU}`;
  if (typeof showToast === "function") {
    if (bumpRes.bumpedCount > 0) {
      showToast(`Mounted ${item.model} at ${slotLabel} (bumped ${bumpRes.bumpedCount} item${bumpRes.bumpedCount === 1 ? '' : 's'} ${bumpRes.direction === 'down' ? 'down' : 'up'})`);
    } else {
      showToast(`Mounted ${item.model} into ${activeRackId} at ${slotLabel}`);
    }
  }
  draggedRackItemInstanceId = null;
}

function updateSwitchStackFromRack(instanceId, newCount) {
  if (typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) return;
  const item = projectBOM.find(i => i.instanceId === instanceId);
  if (!item) return;

  const targetCount = Math.max(1, Math.min(8, parseInt(newCount, 10) || 1));
  const currentAssignedU = parseInt(item.rackSlot, 10);
  const isMounted = currentAssignedU && !isNaN(currentAssignedU) && currentAssignedU >= 1;
  const baseRU = (item.rackUnits !== undefined && item.rackUnits !== null) ? (parseInt(item.rackUnits, 10) || 0) : 1;

  if (targetCount === 1) {
    item.stackedUnits = 0;
    item.qty = 1;
    item.patchPanelBetween = false;
    if (typeof PortEngine !== "undefined") {
      PortEngine.initSwitchPorts(item, true);
    }
    if (typeof applyStackCabling === "function") {
      applyStackCabling(item);
    }
    FacilityStore.notifyWorkspaceChange();
    renderRackVisualizer();
    if (typeof renderTopology === "function") renderTopology();
    if (typeof updateBOMView === "function") updateBOMView();
    if (typeof StorageService !== "undefined" && typeof StorageService.queueAutoSave === "function") {
      StorageService.queueAutoSave();
    }
    if (typeof showToast === "function") {
      showToast(`Configured ${item.model} as Standalone Chassis.`);
    }
    return;
  }

  const newHeight = getRackItemHeight({ ...item, stackedUnits: targetCount });

  if (isMounted) {
    let targetU = currentAssignedU;
    if (targetU + newHeight - 1 > activeRackHeight) {
      targetU = Math.max(1, activeRackHeight - newHeight + 1);
    }

    const otherItems = projectBOM.filter(other => {
      if (other.instanceId === item.instanceId || other.parentInstanceId) return false;
      const otherLoc = FacilityStore.normalize(other.closetName || other.rackId);
      if (otherLoc !== activeRackId) return false;
      const otherU = parseInt(other.rackSlot, 10);
      return !!(otherU && !isNaN(otherU) && otherU >= 1);
    });

    const bumpRes = calculateRackBumpDisplacements(otherItems, item.instanceId, targetU, newHeight, activeRackHeight);
    if (!bumpRes.success) {
      if (typeof showToast === "function") {
        showToast(`Cannot expand stack to ${targetCount}x (${newHeight}U): insufficient space in cabinet to bump equipment.`);
      }
      return;
    }

    // Apply displacements
    Object.keys(bumpRes.placements).forEach(instId => {
      const targetItem = projectBOM.find(x => x.instanceId === instId);
      if (targetItem) {
        targetItem.rackSlot = bumpRes.placements[instId];
        targetItem.closetName = activeRackId;
        targetItem.rackId = activeRackId;
        projectBOM.filter(ch => ch.parentInstanceId === targetItem.instanceId).forEach(ch => {
          ch.closetName = activeRackId;
          ch.rackId = activeRackId;
        });
      }
    });
  }

  item.canStack = true;
  item.stackedUnits = targetCount;
  item.qty = Math.max(item.qty || 1, targetCount);
  item.uplinkMode = "lag_dual";
  item.customLinkMultiplier = Math.max(item.customLinkMultiplier || 1, targetCount);

  if (typeof PortEngine !== "undefined") {
    PortEngine.initSwitchPorts(item, true);
  }
  if (typeof applyStackCabling === "function") {
    applyStackCabling(item);
  }

  // Keep child items synchronized
  projectBOM.filter(ch => ch.parentInstanceId === item.instanceId).forEach(ch => {
    ch.closetName = item.closetName;
    ch.rackId = item.rackId;
  });

  FacilityStore.notifyWorkspaceChange();
  renderRackVisualizer();
  if (typeof renderTopology === "function") renderTopology();
  if (typeof updateBOMView === "function") updateBOMView();
  if (typeof StorageService !== "undefined" && typeof StorageService.queueAutoSave === "function") {
    StorageService.queueAutoSave();
  }

  if (typeof showToast === "function") {
    showToast(`Configured ${item.model} as a ${targetCount}-Unit Virtual Stack${isMounted ? ` in ${activeRackId}` : ''}.`);
  }
}

function toggleStackPatchPanel(instanceId) {
  if (typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) return;
  const item = projectBOM.find(i => i.instanceId === instanceId);
  if (!item || !item.stackedUnits || item.stackedUnits < 2) return;

  const willEnable = !item.patchPanelBetween;
  const stackUnits = item.stackedUnits;
  const baseRU = (item.rackUnits !== undefined && item.rackUnits !== null) ? (parseInt(item.rackUnits, 10) || 0) : 1;
  const currentAssignedU = parseInt(item.rackSlot, 10);

  if (willEnable && currentAssignedU && currentAssignedU >= 1) {
    const newHeight = (baseRU * stackUnits) + (stackUnits - 1);
    const hostId = FacilityStore.normalize(item.closetName || item.rackId);
    let targetU = currentAssignedU;

    // Adjust targetU if it exceeds top
    if ((targetU + newHeight - 1) > activeRackHeight) {
      targetU = Math.max(1, activeRackHeight - newHeight + 1);
    }

    const otherItems = projectBOM.filter(other => {
      if (other.instanceId === item.instanceId || other.parentInstanceId) return false;
      const otherLoc = FacilityStore.normalize(other.closetName || other.rackId);
      if (otherLoc !== hostId) return false;
      const otherU = parseInt(other.rackSlot, 10);
      return !!(otherU && !isNaN(otherU) && otherU >= 1);
    });

    const bumpRes = calculateRackBumpDisplacements(otherItems, item.instanceId, targetU, newHeight, activeRackHeight);
    if (!bumpRes.success) {
      if (typeof showToast === "function") {
        showToast(`Cannot enable patch panels: expanding to ${newHeight}U exceeds available space in cabinet.`);
      }
      return;
    }

    // Apply displacements
    Object.keys(bumpRes.placements).forEach(instId => {
      const targetItem = projectBOM.find(x => x.instanceId === instId);
      if (targetItem) {
        targetItem.rackSlot = bumpRes.placements[instId];
        targetItem.closetName = hostId;
        targetItem.rackId = hostId;
        projectBOM.filter(ch => ch.parentInstanceId === targetItem.instanceId).forEach(ch => {
          ch.closetName = hostId;
          ch.rackId = hostId;
        });
      }
    });
  }

  item.patchPanelBetween = willEnable;

  if (typeof applyStackCabling === "function") {
    applyStackCabling(item);
  }

  // Keep child items synchronized in location
  projectBOM.filter(ch => ch.parentInstanceId === item.instanceId).forEach(ch => {
    ch.closetName = item.closetName;
    ch.rackId = item.rackId;
  });

  if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
    FacilityStore.notifyWorkspaceChange();
  }
  renderRackVisualizer();
  if (typeof updateBOMView === "function") updateBOMView();
  if (typeof renderBOM === "function") renderBOM();
  if (typeof renderTopology === "function") renderTopology();
  if (typeof StorageService !== "undefined" && typeof StorageService.queueAutoSave === "function") {
    StorageService.queueAutoSave();
  }

  if (typeof showToast === "function") {
    showToast(willEnable
      ? `Added 24-Port Patch Panel between stacked switches (${stackUnits - 1}x panel added)`
      : `Removed interleaved patch panels from switch stack.`);
  }
}

function toggleStackCableManager(instanceId) {
  if (typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) return;
  const item = projectBOM.find(i => i.instanceId === instanceId);
  if (!item || !item.stackedUnits || item.stackedUnits < 2) return;

  const willEnable = !item.cableManagerBetween;
  const stackUnits = item.stackedUnits;
  const currentAssignedU = parseInt(item.rackSlot, 10);

  if (willEnable && currentAssignedU && currentAssignedU >= 1) {
    const newHeight = getRackItemHeight({ ...item, cableManagerBetween: true });
    const hostId = FacilityStore.normalize(item.closetName || item.rackId);
    let targetU = currentAssignedU;

    if ((targetU + newHeight - 1) > activeRackHeight) {
      targetU = Math.max(1, activeRackHeight - newHeight + 1);
    }

    const otherItems = projectBOM.filter(other => {
      if (other.instanceId === item.instanceId || other.parentInstanceId) return false;
      const otherLoc = FacilityStore.normalize(other.closetName || other.rackId);
      if (otherLoc !== hostId) return false;
      const otherU = parseInt(other.rackSlot, 10);
      return !!(otherU && !isNaN(otherU) && otherU >= 1);
    });

    const bumpRes = calculateRackBumpDisplacements(otherItems, item.instanceId, targetU, newHeight, activeRackHeight);
    if (!bumpRes.success) {
      if (typeof showToast === "function") {
        showToast(`Cannot enable cable manager: expanding to ${newHeight}U exceeds available space in cabinet.`);
      }
      return;
    }

    Object.keys(bumpRes.placements).forEach(instId => {
      const targetItem = projectBOM.find(x => x.instanceId === instId);
      if (targetItem) {
        targetItem.rackSlot = bumpRes.placements[instId];
        targetItem.closetName = hostId;
        targetItem.rackId = hostId;
        projectBOM.filter(ch => ch.parentInstanceId === targetItem.instanceId).forEach(ch => {
          ch.closetName = hostId;
          ch.rackId = hostId;
        });
      }
    });
  }

  item.cableManagerBetween = willEnable;

  if (typeof applyStackCabling === "function") {
    applyStackCabling(item);
  }

  projectBOM.filter(ch => ch.parentInstanceId === item.instanceId).forEach(ch => {
    ch.closetName = item.closetName;
    ch.rackId = item.rackId;
  });

  if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
    FacilityStore.notifyWorkspaceChange();
  }
  renderRackVisualizer();
  if (typeof updateBOMView === "function") updateBOMView();
  if (typeof renderBOM === "function") renderBOM();
  if (typeof renderTopology === "function") renderTopology();
  if (typeof StorageService !== "undefined" && typeof StorageService.queueAutoSave === "function") {
    StorageService.queueAutoSave();
  }

  if (typeof showToast === "function") {
    showToast(willEnable
      ? `Added 1U Horizontal Cable Manager between stacked switches (${stackUnits - 1}x HCM added)`
      : `Removed in-stack cable managers from switch stack.`);
  }
}

function toggleSwitchStandardPod(instanceId) {
  if (typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) return;
  const item = projectBOM.find(i => i.instanceId === instanceId);
  if (!item) return;

  const willEnable = !item.standardPod;
  const stackUnits = (item.stackedUnits && item.stackedUnits >= 2) ? item.stackedUnits : 1;
  const currentAssignedU = parseInt(item.rackSlot, 10);

  if (willEnable && currentAssignedU && currentAssignedU >= 1) {
    const newHeight = getRackItemHeight({ ...item, standardPod: true });
    const hostId = FacilityStore.normalize(item.closetName || item.rackId);
    let targetU = currentAssignedU;

    if ((targetU + newHeight - 1) > activeRackHeight) {
      targetU = Math.max(1, activeRackHeight - newHeight + 1);
    }

    const otherItems = projectBOM.filter(other => {
      if (other.instanceId === item.instanceId || other.parentInstanceId) return false;
      const otherLoc = FacilityStore.normalize(other.closetName || other.rackId);
      if (otherLoc !== hostId) return false;
      const otherU = parseInt(other.rackSlot, 10);
      return !!(otherU && !isNaN(otherU) && otherU >= 1);
    });

    const bumpRes = calculateRackBumpDisplacements(otherItems, item.instanceId, targetU, newHeight, activeRackHeight);
    if (!bumpRes.success) {
      if (typeof showToast === "function") {
        showToast(`Cannot apply Standard Pod: expanding to ${newHeight}U exceeds available space in cabinet.`);
      }
      return;
    }

    Object.keys(bumpRes.placements).forEach(instId => {
      const targetItem = projectBOM.find(x => x.instanceId === instId);
      if (targetItem) {
        targetItem.rackSlot = bumpRes.placements[instId];
        targetItem.closetName = hostId;
        targetItem.rackId = hostId;
        projectBOM.filter(ch => ch.parentInstanceId === targetItem.instanceId).forEach(ch => {
          ch.closetName = hostId;
          ch.rackId = hostId;
        });
      }
    });
  }

  item.standardPod = willEnable;

  if (typeof applyStandardPodCabling === "function") {
    applyStandardPodCabling(item);
  }

  projectBOM.filter(ch => ch.parentInstanceId === item.instanceId).forEach(ch => {
    ch.closetName = item.closetName;
    ch.rackId = item.rackId;
  });

  if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
    FacilityStore.notifyWorkspaceChange();
  }
  renderRackVisualizer();
  if (typeof updateBOMView === "function") updateBOMView();
  if (typeof renderBOM === "function") renderBOM();
  if (typeof renderTopology === "function") renderTopology();
  if (typeof StorageService !== "undefined" && typeof StorageService.queueAutoSave === "function") {
    StorageService.queueAutoSave();
  }

  if (typeof showToast === "function") {
    const ports = (parseInt(item.ports, 10) || 24) * stackUnits;
    showToast(willEnable
      ? `Applied Standard Pod: 24P Patch Panels above & below with ${ports}x 6" Slim Patch Cords.`
      : `Removed Standard Pod configuration from ${item.model}.`);
  }
}

function applyStandardPodsToActiveRack() {
  if (typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) return;
  const hostId = FacilityStore.normalize(activeRackId);

  // 1. Remove previous auto-generated fiber/firewall HCMs so we can re-evaluate freshly without doubling up
  projectBOM = projectBOM.filter(it => !(it.source === "fiber_firewall_hcm" && FacilityStore.normalize(it.closetName || it.rackId) === hostId));

  // 2. Find all mounted items in active rack
  const mountedItems = projectBOM.filter(it => {
    if (it.parentInstanceId) return false;
    const loc = FacilityStore.normalize(it.closetName || it.rackId);
    if (loc !== hostId) return false;
    const u = parseInt(it.rackSlot, 10);
    return !!(u && !isNaN(u) && u >= 1);
  });

  if (mountedItems.length === 0) {
    if (typeof showToast === "function") {
      showToast(`No equipment mounted in ${activeRackId}.`);
    }
    return;
  }

  // 3. Apply standard pod to all copper switches (24P & 48P, standalone or stacked)
  let copperSwitchCount = 0;
  mountedItems.forEach(it => {
    if (isCopperSwitch(it)) {
      it.standardPod = true;
      if (typeof applyStandardPodCabling === "function") {
        applyStandardPodCabling(it);
      }
      copperSwitchCount++;
    } else if (isFiberSwitch(it) && it.stackedUnits >= 2) {
      // Stacked fiber switches get 1U in-stack cable management between units
      it.cableManagerBetween = true;
      if (typeof applyStackCabling === "function") {
        applyStackCabling(it);
      }
    }
  });

  // 4. Sort mounted items by enterprise priority:
  // ISP > Firewalls > Core > Aggregation > Access Switches (copper pods) > Servers > UPSes
  mountedItems.sort((a, b) => {
    const pA = getDeviceMountPriority(a);
    const pB = getDeviceMountPriority(b);
    if (pA.priority !== pB.priority) {
      return pA.priority - pB.priority;
    }
    if (pA.priority === 5 || pA.portCount || pB.portCount) {
      const portDiff = (pB.portCount || 0) - (pA.portCount || 0);
      if (portDiff !== 0) return portDiff;
    }
    return (a.model || "").localeCompare(b.model || "");
  });

  // 5. Interleave 1U Horizontal Cable Managers between adjacent fiber switches and firewalls
  // WITHOUT doubling up (shared single 1U HCM between any two adjacent fiber/firewall devices)
  const finalOrderedItems = [];
  let hcmCount = 0;

  for (let idx = 0; idx < mountedItems.length; idx++) {
    const currentItem = mountedItems[idx];
    finalOrderedItems.push(currentItem);

    if (idx < mountedItems.length - 1) {
      const nextItem = mountedItems[idx + 1];
      // Check if BOTH current and next items are fiber switches or firewalls
      if (isFiberOrFirewall(currentItem) && isFiberOrFirewall(nextItem)) {
        // Create exactly ONE shared 1U Horizontal Cable Manager between them (never doubled up)
        const hcmItem = {
          instanceId: `hcm-auto-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
          id: "HCM-1U",
          sku: "HCM-1U",
          model: "1U Horizontal Cable Manager with Dual-Hinged Cover",
          role: "Structured Cabling",
          category: "Infrastructure",
          vendor: "Panduit",
          msrp: 45,
          rackUnits: 1,
          ports: 0,
          poeBudget: 0,
          baseWatts: 0,
          weightLbs: 2.0,
          qty: 1,
          closetName: hostId,
          rackId: hostId,
          rackSlot: null,
          isPassive: true,
          source: "fiber_firewall_hcm"
        };
        finalOrderedItems.push(hcmItem);
        projectBOM.push(hcmItem);
        hcmCount++;
      }
    }
  }

  // 6. Separate UPS items (which go to bottom U1+) from top-down gear
  const upsItems = finalOrderedItems.filter(i => getDeviceMountPriority(i).priority === 7);
  const topDownItems = finalOrderedItems.filter(i => getDeviceMountPriority(i).priority !== 7);

  // Position UPSes from bottom U1+ ascending
  let upsCurrentFloor = 1;
  for (const it of upsItems) {
    const h = getRackItemHeight(it);
    it.rackSlot = upsCurrentFloor;
    upsCurrentFloor += h;
  }

  // Position network/server gear from activeRackHeight down
  let currentTop = activeRackHeight;
  for (const it of topDownItems) {
    const h = getRackItemHeight(it);
    let targetBase = currentTop - h + 1;
    if (targetBase < upsCurrentFloor) {
      targetBase = upsCurrentFloor;
    }
    it.rackSlot = targetBase;
    currentTop = targetBase - 1;
  }

  // Check if total U exceeds cabinet
  const totalRequiredU = finalOrderedItems.reduce((acc, it) => acc + getRackItemHeight(it), 0);
  if (totalRequiredU > activeRackHeight && typeof showToast === "function") {
    showToast(`Notice: Standard Pods & Cable Managers require ${totalRequiredU}U, which exceeds the ${activeRackHeight}U enclosure height.`);
  }

  // Synchronize child items
  projectBOM.filter(ch => ch.parentInstanceId).forEach(ch => {
    const parent = projectBOM.find(p => p.instanceId === ch.parentInstanceId);
    if (parent) {
      ch.closetName = parent.closetName;
      ch.rackId = parent.rackId;
    }
  });

  if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
    FacilityStore.notifyWorkspaceChange();
  }
  renderRackVisualizer();
  if (typeof updateBOMView === "function") updateBOMView();
  if (typeof renderBOM === "function") renderBOM();
  if (typeof renderTopology === "function") renderTopology();
  if (typeof StorageService !== "undefined" && typeof StorageService.queueAutoSave === "function") {
    StorageService.queueAutoSave();
  }

  if (typeof showToast === "function") {
    showToast(`Standard Pods Applied: ${copperSwitchCount} copper switch pods (24P above & below) + ${hcmCount} non-doubled 1U cable managers.`);
  }
}

function toggleFiberFirewallCableManager(instanceId) {
  if (typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) return;
  const item = projectBOM.find(i => i.instanceId === instanceId);
  if (!item) return;

  const hostId = FacilityStore.normalize(item.closetName || item.rackId);
  const currentAssignedU = parseInt(item.rackSlot, 10);
  if (!currentAssignedU || currentAssignedU < 1) return;

  // Check if there is already a cable manager immediately below this item
  const existingHcmBelow = projectBOM.find(other => {
    if (other.parentInstanceId) return false;
    const otherLoc = FacilityStore.normalize(other.closetName || other.rackId);
    if (otherLoc !== hostId) return false;
    const otherU = parseInt(other.rackSlot, 10);
    const otherH = getRackItemHeight(other);
    const otherTopU = otherU + otherH - 1;
    const isHcm = other.sku === "HCM-1U" || other.source === "fiber_firewall_hcm" || (other.model || "").includes("Cable Manager");
    return isHcm && otherTopU === (currentAssignedU - 1);
  });

  if (existingHcmBelow) {
    // Toggle OFF: Remove the 1U cable manager below
    projectBOM = projectBOM.filter(x => x.instanceId !== existingHcmBelow.instanceId && x.parentInstanceId !== existingHcmBelow.instanceId);

    // Bump items below back UP by 1U to fill the gap
    projectBOM.filter(other => {
      if (other.parentInstanceId) return false;
      const otherLoc = FacilityStore.normalize(other.closetName || other.rackId);
      if (otherLoc !== hostId) return false;
      const otherU = parseInt(other.rackSlot, 10);
      return otherU < currentAssignedU;
    }).forEach(other => {
      const u = parseInt(other.rackSlot, 10);
      other.rackSlot = u + 1;
    });

    FacilityStore.notifyWorkspaceChange();
    renderRackVisualizer();
    if (typeof updateBOMView === "function") updateBOMView();
    if (typeof renderBOM === "function") renderBOM();
    if (typeof showToast === "function") {
      showToast(`Removed 1U Cable Manager below ${item.model}.`);
    }
    return;
  }

  // Toggle ON: Insert 1U Cable Manager directly below this device
  const targetHcmU = currentAssignedU - 1;
  if (targetHcmU < 1) {
    if (typeof showToast === "function") {
      showToast(`Cannot place Cable Manager below U1.`);
    }
    return;
  }

  // Check if adding 1U will exceed cabinet space
  const allHostItems = projectBOM.filter(other => {
    if (other.parentInstanceId) return false;
    const otherLoc = FacilityStore.normalize(other.closetName || other.rackId);
    return otherLoc === hostId && other.rackSlot;
  });

  const totalUsedU = allHostItems.reduce((acc, x) => acc + getRackItemHeight(x), 0);
  if (totalUsedU + 1 > activeRackHeight) {
    if (typeof showToast === "function") {
      showToast(`Cannot add 1U Cable Manager: rack exceeds available space (${totalUsedU + 1}/${activeRackHeight}U).`);
    }
    return;
  }

  // Shift items at or below targetHcmU DOWN by 1
  const lowestU = Math.min(...allHostItems.map(x => parseInt(x.rackSlot, 10)));
  if (lowestU <= 1) {
    // If shifting down would push below U1, shift current item and all above items UP by 1
    allHostItems.filter(x => parseInt(x.rackSlot, 10) >= currentAssignedU).forEach(x => {
      x.rackSlot = parseInt(x.rackSlot, 10) + 1;
    });
  } else {
    allHostItems.filter(x => parseInt(x.rackSlot, 10) <= targetHcmU).forEach(x => {
      x.rackSlot = parseInt(x.rackSlot, 10) - 1;
    });
  }

  const hcmItem = {
    instanceId: `hcm-manual-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    id: "HCM-1U",
    sku: "HCM-1U",
    model: "1U Horizontal Cable Manager with Dual-Hinged Cover",
    role: "Structured Cabling",
    category: "Infrastructure",
    vendor: "Panduit",
    msrp: 45,
    rackUnits: 1,
    ports: 0,
    poeBudget: 0,
    baseWatts: 0,
    weightLbs: 2.0,
    qty: 1,
    closetName: hostId,
    rackId: hostId,
    rackSlot: targetHcmU,
    isPassive: true,
    source: "fiber_firewall_hcm"
  };

  projectBOM.push(hcmItem);

  FacilityStore.notifyWorkspaceChange();
  renderRackVisualizer();
  if (typeof updateBOMView === "function") updateBOMView();
  if (typeof renderBOM === "function") renderBOM();
  if (typeof showToast === "function") {
    showToast(`Placed 1U Horizontal Cable Manager below ${item.model} at U${targetHcmU}.`);
  }
}

function handleBaySlotDrop(e, bayNumber) {
  e.preventDefault();
  const instanceId = draggedRackItemInstanceId || e.dataTransfer.getData("text/plain");
  if (!instanceId || typeof projectBOM === "undefined") return;

  const item = projectBOM.find(i => i.instanceId === instanceId);
  if (!item) return;

  item.rackSlot = `Bay-${bayNumber}`;
  item.closetName = activeRackId;
  item.rackId = activeRackId;

  FacilityStore.notifyWorkspaceChange();
  renderRackVisualizer();
  if (typeof showToast === "function") {
    showToast(`Mounted ${item.model} into ${activeRackId} at Bay ${bayNumber}`);
  }
  draggedRackItemInstanceId = null;
}

function handleDinRailDrop(e, railNumber) {
  e.preventDefault();
  const instanceId = draggedRackItemInstanceId || e.dataTransfer.getData("text/plain");
  if (!instanceId || typeof projectBOM === "undefined") return;

  const item = projectBOM.find(i => i.instanceId === instanceId);
  if (!item) return;

  item.rackSlot = `Rail-${railNumber}`;
  item.closetName = activeRackId;
  item.rackId = activeRackId;

  FacilityStore.notifyWorkspaceChange();
  renderRackVisualizer();
  if (typeof showToast === "function") {
    showToast(`Mounted ${item.model} onto DIN Rail ${railNumber}`);
  }
  draggedRackItemInstanceId = null;
}

function handlePoleZoneDrop(e, zoneId) {
  e.preventDefault();
  const instanceId = draggedRackItemInstanceId || e.dataTransfer.getData("text/plain");
  if (!instanceId || typeof projectBOM === "undefined") return;

  const item = projectBOM.find(i => i.instanceId === instanceId);
  if (!item) return;

  item.rackSlot = zoneId;
  item.closetName = activeRackId;
  item.rackId = activeRackId;

  FacilityStore.notifyWorkspaceChange();
  renderRackVisualizer();
  if (typeof showToast === "function") {
    showToast(`Mounted ${item.model} at ${zoneId}`);
  }
  draggedRackItemInstanceId = null;
}

function handleBackboardQuadDrop(e, quadId) {
  e.preventDefault();
  const instanceId = draggedRackItemInstanceId || e.dataTransfer.getData("text/plain");
  if (!instanceId || typeof projectBOM === "undefined") return;

  const item = projectBOM.find(i => i.instanceId === instanceId);
  if (!item) return;

  item.rackSlot = quadId;
  item.closetName = activeRackId;
  item.rackId = activeRackId;

  FacilityStore.notifyWorkspaceChange();
  renderRackVisualizer();
  if (typeof showToast === "function") {
    showToast(`Positioned ${item.model} in ${quadId}`);
  }
  draggedRackItemInstanceId = null;
}

// -----------------------------------------------------------
// Telemetry & Engineering Calculations (Per Host Type)
// -----------------------------------------------------------
window.currentUpsTargetRuntime = window.currentUpsTargetRuntime || 15;
window.currentUpsSafetyMargin = window.currentUpsSafetyMargin || 0.75;
window.currentUpsVoltage = window.currentUpsVoltage || 120;
window.currentUpsModelSku = window.currentUpsModelSku || "auto";
window.currentUpsLoadMode = window.currentUpsLoadMode || "connected"; // "connected" | "nameplate"
window.currentUpsBatteryAging = window.currentUpsBatteryAging || 0.85; // 0.85 (IEEE 1188 End of Life) | 1.0 (New)
window.currentUpsComplianceStandard = window.currentUpsComplianceStandard || "ul294"; // "ul294" | "sla_60m" | "sla_30m" | "sla_15m" | "none"

window.handleUpsRuntimeChange = function(minutes) {
  window.currentUpsTargetRuntime = Number(minutes) || 15;
  renderRackVisualizer();
};

window.handleUpsMarginChange = function(margin) {
  window.currentUpsSafetyMargin = Number(margin) || 0.75;
  renderRackVisualizer();
};

window.handleUpsVoltageChange = function(volts) {
  window.currentUpsVoltage = Number(volts) || 120;
  renderRackVisualizer();
};

window.handleUpsModelChange = function(sku) {
  window.currentUpsModelSku = sku || "auto";
  renderRackVisualizer();
};

window.handleUpsLoadModeChange = function(mode) {
  window.currentUpsLoadMode = mode;
  renderRackVisualizer();
};

window.handleUpsAgingChange = function(aging) {
  window.currentUpsBatteryAging = Number(aging) || 0.85;
  renderRackVisualizer();
};

window.handleUpsComplianceStandardChange = function(std) {
  window.currentUpsComplianceStandard = std;
  if (std === "ul294") window.currentUpsTargetRuntime = 240;
  else if (std === "nfpa72") window.currentUpsTargetRuntime = 1440;
  else if (std === "sla_120m") window.currentUpsTargetRuntime = 120;
  else if (std === "sla_60m") window.currentUpsTargetRuntime = 60;
  else if (std === "sla_30m") window.currentUpsTargetRuntime = 30;
  else if (std === "sla_15m") window.currentUpsTargetRuntime = 15;
  renderRackVisualizer();
};

window.addSpecificEbpCountToRack = function(targetEbpCount) {
  if (!activeRackId || typeof projectBOM === "undefined") {
    if (typeof showToast === "function") showToast("Please select an active rack location first.");
    return;
  }
  const hostId = FacilityStore.normalize(activeRackId);
  const assignedItems = projectBOM.filter(i => FacilityStore.normalize(i.closetName || i.location || i.rackId) === hostId);
  let existingUps = assignedItems.find(i => i.role === "UPS" || i.category === "ups" || i.type === "ups");

  if (!existingUps) {
    window.addRecommendedUpsAndEbpToRack();
    return;
  }

  // Remove existing EBPs from this host so we set the exact count requested
  projectBOM = projectBOM.filter(i => !(FacilityStore.normalize(i.closetName || i.location || i.rackId) === hostId && (i.role === "Battery Pack" || i.type === "ebp" || i.isEbp)));

  if (targetEbpCount <= 0) {
    if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") FacilityStore.notifyWorkspaceChange();
    renderRackVisualizer();
    if (typeof updateBOMView === "function") updateBOMView();
    if (typeof renderBOM === "function") renderBOM();
    if (typeof showToast === "function") showToast("Configured UPS for internal battery only.");
    return;
  }

  // Determine compatible EBP model
  let ebpCatalog = [];
  if (typeof CatalogRegistry !== "undefined" && CatalogRegistry.infrastructure && Array.isArray(CatalogRegistry.infrastructure.ups)) {
    ebpCatalog = CatalogRegistry.infrastructure.ups.filter(a => a.type === "ebp" || a.isEbp);
  }
  if (ebpCatalog.length === 0 && typeof ACCESSORY_DATABASE !== "undefined") {
    ebpCatalog = ACCESSORY_DATABASE.filter(a => a.type === "ebp" || a.isEbp);
  }

  const ebpDef = ebpCatalog.find(e => e.compatibleUps?.includes(existingUps.sku) || (existingUps.ebpModel && e.sku === existingUps.ebpModel)) || ebpCatalog[0] || {
    id: "ebp-bp72vrm2u",
    sku: "BP72VRM2U",
    model: `${existingUps.vendor || 'Tripp Lite'} BP72VRM2U External Battery Pack (2U)`,
    vendor: existingUps.vendor || "Tripp Lite",
    rackUnits: 2,
    msrp: 899,
    weightLbs: 68
  };

  const occupiedSlots = new Set();
  projectBOM.filter(i => FacilityStore.normalize(i.closetName || i.location || i.rackId) === hostId).forEach(it => {
    if (it.rackSlot) {
      const u = it.rackSlot;
      const h = getRackItemHeight(it);
      for (let i = 0; i < h; i++) occupiedSlots.add(u + i);
    }
  });

  const locations = typeof FacilityStore !== "undefined" ? FacilityStore.getLocations() : [];
  const activeEnc = locations.find(l => l.name === activeRackId || l.id === activeRackId);
  const maxRU = (activeEnc && activeEnc.rackUnits) ? activeEnc.rackUnits : 42;

  function findSlot(neededRU) {
    for (let u = 1; u <= maxRU - neededRU + 1; u++) {
      let fits = true;
      for (let s = 0; s < neededRU; s++) {
        if (occupiedSlots.has(u + s)) { fits = false; break; }
      }
      if (fits) {
        for (let s = 0; s < neededRU; s++) occupiedSlots.add(u + s);
        return u;
      }
    }
    return null;
  }

  let added = 0;
  const ebpRU = ebpDef.rackUnits || 2;
  for (let q = 0; q < targetEbpCount; q++) {
    const slot = findSlot(ebpRU);
    if (!slot) {
      if (typeof showToast === "function") showToast(`Rack full: No continuous ${ebpRU}U slot available for EBP #${q + 1}.`);
      break;
    }
    const instId = "inst-ebp-" + Date.now() + "-" + Math.random().toString(36).substr(2, 6);
    projectBOM.push({
      instanceId: instId,
      id: ebpDef.id,
      sku: ebpDef.sku,
      model: ebpDef.model || ebpDef.name,
      name: ebpDef.name || ebpDef.model,
      vendor: ebpDef.vendor,
      category: "ups",
      type: "ebp",
      role: "Battery Pack",
      isEbp: true,
      rackUnits: ebpRU,
      rackSlot: slot,
      closetName: activeRackId,
      location: activeRackId,
      rackId: activeRackId,
      msrp: ebpDef.msrp || 899,
      qty: 1,
      baseWatts: 0,
      powerWatts: 0,
      weightLbs: ebpDef.weightLbs || 68
    });
    added++;
  }

  if (added > 0) {
    if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
      FacilityStore.notifyWorkspaceChange();
    }
    renderRackVisualizer();
    if (typeof updateBOMView === "function") updateBOMView();
    if (typeof renderBOM === "function") renderBOM();
    if (typeof StorageService !== "undefined" && typeof StorageService.queueAutoSave === "function") {
      StorageService.queueAutoSave();
    }
    if (typeof showToast === "function") showToast(`Added ${added}x ${ebpDef.sku} External Battery Pack(s) to ${activeRackId}.`);
  }
};

window.addRecommendedUpsAndEbpToRack = function() {
  if (!activeRackId || typeof projectBOM === "undefined") {
    if (typeof showToast === "function") showToast("Please select an active rack location first.");
    return;
  }

  const assignedItems = projectBOM.filter(i => (i.closetName === activeRackId || i.location === activeRackId || i.rackId === activeRackId));
  const plan = (typeof NetworkSizer !== "undefined" && typeof NetworkSizer.calculateUPSPlan === "function")
    ? NetworkSizer.calculateUPSPlan(assignedItems, {
        targetRuntimeMinutes: window.currentUpsTargetRuntime,
        safetyMargin: window.currentUpsSafetyMargin,
        preferredVoltage: window.currentUpsVoltage,
        selectedModelSku: window.currentUpsModelSku
      })
    : null;

  if (!plan || !plan.upsModel) {
    if (typeof showToast === "function") showToast("Unable to calculate UPS recommendation.");
    return;
  }

  // Scan occupied rack slots in the active rack
  const occupiedSlots = new Set();
  assignedItems.forEach(it => {
    if (it.rackSlot && typeof it.rackSlot === "number") {
      const u = it.rackSlot;
      const h = getRackItemHeight(it);
      for (let i = 0; i < h; i++) {
        occupiedSlots.add(u + i);
      }
    }
  });

  const locations = typeof FacilityStore !== "undefined" ? FacilityStore.getLocations() : [];
  const activeEnc = locations.find(l => l.name === activeRackId || l.id === activeRackId);
  const maxRU = (activeEnc && activeEnc.rackUnits) ? activeEnc.rackUnits : 42;

  // Helper to find lowest available continuous slot from bottom (U1+)
  function findLowestOpenSlot(neededRU) {
    for (let u = 1; u <= maxRU - neededRU + 1; u++) {
      let fits = true;
      for (let s = 0; s < neededRU; s++) {
        if (occupiedSlots.has(u + s)) {
          fits = false;
          break;
        }
      }
      if (fits) {
        for (let s = 0; s < neededRU; s++) occupiedSlots.add(u + s);
        return u;
      }
    }
    return null;
  }

  let unitsAdded = 0;
  const addedSkus = [];

  // Add Recommended UPS Units
  for (let q = 0; q < plan.upsQty; q++) {
    const upsRU = plan.upsModel.rackUnits || 2;
    const slot = findLowestOpenSlot(upsRU);
    if (!slot) {
      if (typeof showToast === "function") showToast(`Rack full: No continuous ${upsRU}U slot available at bottom for UPS.`);
      break;
    }
    const instId = "inst-ups-" + Date.now() + "-" + Math.random().toString(36).substr(2, 6);
    projectBOM.push({
      instanceId: instId,
      id: plan.upsModel.id || plan.upsModel.sku,
      sku: plan.upsModel.sku,
      model: plan.upsModel.model || plan.upsModel.name,
      name: plan.upsModel.name || plan.upsModel.model,
      vendor: plan.upsModel.vendor || "Tripp Lite",
      category: "ups",
      type: "ups",
      role: "UPS",
      rackUnits: upsRU,
      rackSlot: slot,
      closetName: activeRackId,
      location: activeRackId,
      rackId: activeRackId,
      msrp: plan.upsModel.msrp || 1199,
      qty: 1,
      baseWatts: plan.upsModel.baseWatts || 30,
      powerWatts: plan.upsModel.powerWatts || 1000,
      weightLbs: plan.upsModel.weightLbs || 60,
      receptacles: plan.upsModel.receptacles,
      inputConnector: plan.upsModel.inputConnector,
      keyFeatures: plan.upsModel.keyFeatures
    });
    unitsAdded++;
    addedSkus.push(`${plan.upsModel.sku} (U${slot})`);
  }

  // Add EBP Units if needed and supported
  if (plan.totalEbpQty > 0 && plan.hasEbpSupport) {
    let ebpCatalog = [];
    if (typeof CatalogRegistry !== "undefined" && CatalogRegistry.infrastructure && Array.isArray(CatalogRegistry.infrastructure.ups)) {
      ebpCatalog = CatalogRegistry.infrastructure.ups.filter(a => a.type === "ebp" || a.isEbp);
    }
    if (ebpCatalog.length === 0 && typeof ACCESSORY_DATABASE !== "undefined") {
      ebpCatalog = ACCESSORY_DATABASE.filter(a => a.type === "ebp" || a.isEbp);
    }
    const ebpDef = ebpCatalog.find(e => e.sku === plan.ebpModel || e.model?.includes(plan.ebpModel) || e.id?.includes(plan.ebpModel.toLowerCase())) || {
      id: "ebp-" + plan.ebpModel.toLowerCase(),
      sku: plan.ebpModel,
      model: `${plan.upsModel.vendor} ${plan.ebpModel} External Battery Module (${plan.ebpRackHeight || 2}U)`,
      name: `${plan.upsModel.vendor} ${plan.ebpModel} External Battery Module (${plan.ebpRackHeight || 2}U)`,
      vendor: plan.upsModel.vendor,
      rackUnits: plan.ebpRackHeight || 2,
      msrp: 899,
      weightLbs: 70
    };

    for (let eq = 0; eq < plan.totalEbpQty; eq++) {
      const ebpRU = ebpDef.rackUnits || plan.ebpRackHeight || 2;
      const slot = findLowestOpenSlot(ebpRU);
      if (!slot) {
        if (typeof showToast === "function") showToast(`Rack full: No continuous ${ebpRU}U slot available for EBP.`);
        break;
      }
      const instId = "inst-ebp-" + Date.now() + "-" + Math.random().toString(36).substr(2, 6);
      projectBOM.push({
        instanceId: instId,
        id: ebpDef.id,
        sku: ebpDef.sku,
        model: ebpDef.model || ebpDef.name,
        name: ebpDef.name || ebpDef.model,
        vendor: ebpDef.vendor,
        category: "ups",
        type: "ebp",
        role: "Battery Pack",
        isEbp: true,
        rackUnits: ebpRU,
        rackSlot: slot,
        closetName: activeRackId,
        location: activeRackId,
        rackId: activeRackId,
        msrp: ebpDef.msrp || 899,
        qty: 1,
        baseWatts: 0,
        powerWatts: 0,
        weightLbs: ebpDef.weightLbs || 70,
        keyFeatures: ebpDef.keyFeatures
      });
      unitsAdded++;
      addedSkus.push(`${ebpDef.sku} (U${slot})`);
    }
  }

  if (unitsAdded > 0) {
    if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
      FacilityStore.notifyWorkspaceChange();
    }
    renderRackVisualizer();
    if (typeof updateBOMView === "function") updateBOMView();
    if (typeof renderBOM === "function") renderBOM();
    if (typeof showToast === "function") {
      showToast(`Slotted power hardware into ${activeRackId}: ${addedSkus.join(", ")}`);
    }
  }
};

function renderHostTelemetry(assignedItems, parsed, activeEnc) {
  const hostType = parsed.hostType;
  const container = document.getElementById("hostTelemetryContainer");
  const auxContainer = document.getElementById("hostAuxContainer");
  const fieldContainer = document.getElementById("hostFieldSummaryContainer");
  if (!container) return;

  if (hostType === "security_cabinet") {
    // -------------------------------------------------------
    // Security Cabinet DC Power & UL 294 Battery Runtime
    // -------------------------------------------------------
    let totalDcCurrentAmps = 0;
    let lockCurrentAmps = 0;
    let doorCount = 0;

    assignedItems.forEach(it => {
      const pWatts = parseFloat(it.powerConsumptionWatts || it.baseWatts || 15);
      totalDcCurrentAmps += (pWatts / 24);
      if (it.doorCapacity) {
        doorCount += parseInt(it.doorCapacity, 10);
        lockCurrentAmps += (parseInt(it.doorCapacity, 10) * 0.5); // 500mA per lock @ 24VDC
      }
    });

    const standbyAmps = Math.round((totalDcCurrentAmps + 0.2) * 100) / 100;
    const alarmAmps = Math.round((standbyAmps + lockCurrentAmps) * 100) / 100;
    // NFPA 731 / UL 294: 4 Hours Standby + 15 Mins Alarm + 20% safety margin
    const requiredAh = Math.round(((standbyAmps * 4.0) + (alarmAmps * 0.25)) * 1.2 * 10) / 10;
    const installedAh = 14.0; // 2x 12V 7Ah (24V 7Ah or 14Ah)
    const runtimeHours = Math.round((installedAh / standbyAmps) * 10) / 10;

    container.innerHTML = `
      <h3 class="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between">
        <span class="flex items-center gap-1.5 text-emerald-400">
          <i data-lucide="shield-check" class="w-4 h-4"></i> Access Control Power & Battery Sizing
        </span>
        <span class="text-[10px] font-mono text-slate-500 uppercase font-normal">UL 294 / NFPA 731</span>
      </h3>
      <div class="space-y-2 text-xs">
        <div class="flex justify-between text-slate-400">
          <span>Supported Access Doors:</span>
          <span class="font-mono text-white font-semibold">${doorCount} Controlled Doors</span>
        </div>
        <div class="flex justify-between text-slate-400">
          <span>Standby Continuous Load:</span>
          <span class="font-mono text-emerald-300 font-semibold">${standbyAmps} A @ 24VDC (${Math.round(standbyAmps * 24)} W)</span>
        </div>
        <div class="flex justify-between text-slate-400">
          <span>Full Alarm / Strike Inrush:</span>
          <span class="font-mono text-amber-400 font-semibold">${alarmAmps} A @ 24VDC (${Math.round(alarmAmps * 24)} W)</span>
        </div>
        <div class="flex justify-between text-slate-300 font-bold pt-2 border-t border-slate-800">
          <span>Code Battery Capacity Req:</span>
          <span class="font-mono text-white">${requiredAh} Ah (4-Hr Standby)</span>
        </div>
        <div class="flex justify-between text-slate-400 text-[11px]">
          <span>Estimated Standby Runtime:</span>
          <span class="font-mono text-emerald-400 font-bold">${runtimeHours} Hours on Battery</span>
        </div>
        <div class="pt-2 border-t border-slate-800/80">
          <span class="text-[10px] text-slate-500 uppercase font-mono block mb-0.5">AC Primary Feed Requirement:</span>
          <span class="font-mono text-emerald-400 text-[11px] font-bold block">120VAC 15A Dedicated Branch Circuit</span>
        </div>
      </div>
    `;

    if (auxContainer) {
      auxContainer.innerHTML = `
        <h3 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
          <i data-lucide="battery" class="w-4 h-4 text-emerald-400"></i> Reserve Battery Health & Compliance
        </h3>
        <div class="text-xs text-slate-300 space-y-1">
          <div class="flex justify-between text-slate-400">
            <span>Installed Battery Bank:</span>
            <span class="font-mono text-emerald-300 font-semibold">2x 12V 7Ah AGM In Series</span>
          </div>
          <div class="flex justify-between text-slate-400">
            <span>Life Safety Status:</span>
            <span class="font-mono text-emerald-400 font-bold">${installedAh >= requiredAh ? 'PASSED (Compliant)' : 'ATTENTION: Add Battery'}</span>
          </div>
          <p class="text-[10px] text-slate-500 pt-1">Complies with NFPA 731 electronic security standards for commercial access control facilities.</p>
        </div>
      `;
    }

    if (fieldContainer) {
      fieldContainer.innerHTML = `
        <h3 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
          <i data-lucide="git-commit" class="w-4 h-4 text-amber-400"></i> Lock Output Channels
        </h3>
        <p class="text-[11px] text-slate-400">${doorCount * 2} reader ports and ${doorCount} heavy-duty Form-C fail-safe/fail-secure relay circuits.</p>
      `;
    }

  } else if (hostType === "industrial_din") {
    // -------------------------------------------------------
    // Industrial DIN NEMA Thermal & DC Power
    // -------------------------------------------------------
    const mounting = (activeEnc && activeEnc.mountingMethod) ? activeEnc.mountingMethod : (parsed.mountingMethod || "wall");
    let totalBaseWatts = 0;
    let totalPoEWatts = 0;
    assignedItems.forEach(it => {
      totalBaseWatts += parseFloat(it.baseWatts || 0);
      totalPoEWatts += parseFloat(it.poeBudget || 0);
    });

    const totalOperatingWatts = Math.round(totalBaseWatts + (totalPoEWatts * 0.5));
    const deltaT = Math.round(totalOperatingWatts * 0.15);
    const internalTemp = 25 + deltaT;

    container.innerHTML = `
      <h3 class="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between">
        <span class="flex items-center gap-1.5 text-amber-400">
          <i data-lucide="thermometer" class="w-4 h-4"></i> NEMA Thermal Dissipation & Power
        </span>
        <span class="text-[10px] font-mono text-slate-500 uppercase font-normal">NEMA 4X / IP66</span>
      </h3>
      <div class="space-y-2 text-xs">
        <div class="flex justify-between text-slate-400">
          <span>Mounting Configuration:</span>
          <span class="font-mono text-white font-semibold">${mounting === 'pole' ? 'Pole Mounted (Stainless Banding)' : 'Wall Mounted (Heavy Flanges)'}</span>
        </div>
        <div class="flex justify-between text-slate-400">
          <span>DIN Internal Heat Dissipation:</span>
          <span class="font-mono text-white font-semibold">${totalOperatingWatts} W (${Math.round(totalOperatingWatts * 3.412)} BTU/hr)</span>
        </div>
        <div class="flex justify-between text-slate-400">
          <span>Sealed Delta-T Rise:</span>
          <span class="font-mono text-amber-400 font-semibold">+${deltaT}°C Internal Rise</span>
        </div>
        <div class="flex justify-between text-slate-400">
          <span>Estimated Internal Temp:</span>
          <span class="font-mono text-emerald-400 font-semibold">${internalTemp}°C @ 25°C Ambient</span>
        </div>
        <div class="flex justify-between text-slate-300 font-bold pt-2 border-t border-slate-800">
          <span>PoE Budget Available:</span>
          <span class="font-mono text-white">${totalPoEWatts} W DC</span>
        </div>
        <div class="pt-2 border-t border-slate-800/80">
          <span class="text-[10px] text-slate-500 uppercase font-mono block mb-0.5">DC Supply Input:</span>
          <span class="font-mono text-amber-400 text-[11px] font-bold block">48-56VDC Redundant Terminal Blocks</span>
        </div>
      </div>
    `;

    if (auxContainer) {
      auxContainer.innerHTML = `
        <h3 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
          <i data-lucide="sun" class="w-4 h-4 text-emerald-400"></i> Environmental Ratings
        </h3>
        <div class="text-xs text-slate-300 space-y-1">
          <p class="text-[11px] text-slate-400">Substation-hardened electronics compliant with IEC 61850-3 / IEEE 1613 shock & vibration standards.</p>
        </div>
      `;
    }

    if (fieldContainer) {
      fieldContainer.innerHTML = `
        <h3 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
          <i data-lucide="shield" class="w-4 h-4 text-amber-400"></i> Mounting Hardware & Grounding
        </h3>
        <p class="text-[11px] text-slate-400">${mounting === 'pole' ? 'Stainless steel strapping clamps with rubber isolation pads for pole mounting.' : 'Heavy-duty 316 stainless wall-mount unistrut brackets.'}</p>
      `;
    }

  } else if (hostType === "structural_mount") {
    // -------------------------------------------------------
    // Structural Pole Mount Wind Load & Cables
    // -------------------------------------------------------
    const poleHeight = (activeEnc && activeEnc.poleHeightFt) ? activeEnc.poleHeightFt : (parsed.poleHeightFt || 20);
    const epaTotal = Math.round(assignedItems.length * 0.45 * 10) / 10;
    const cableDropCount = assignedItems.length * 2;
    // Bending moment: EPA * force_factor * height
    const windBendingMoment = Math.round(epaTotal * 25.6 * (poleHeight * 0.6));

    container.innerHTML = `
      <h3 class="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between">
        <span class="flex items-center gap-1.5 text-cyan-400">
          <i data-lucide="wind" class="w-4 h-4"></i> Wind Load EPA & Cable Loading
        </span>
        <span class="text-[10px] font-mono text-slate-500 uppercase font-normal">TIA-222-H</span>
      </h3>
      <div class="space-y-2 text-xs">
        <div class="flex justify-between text-slate-400">
          <span>Structural Height AGL:</span>
          <span class="font-mono text-white font-semibold">${poleHeight} ft Tower Elevation</span>
        </div>
        <div class="flex justify-between text-slate-400">
          <span>Effective Projected Area (EPA):</span>
          <span class="font-mono text-cyan-300 font-semibold">${epaTotal} sq ft</span>
        </div>
        <div class="flex justify-between text-slate-400">
          <span>Base Bending Moment:</span>
          <span class="font-mono text-white font-semibold">${windBendingMoment.toLocaleString()} ft-lbs @ 100 MPH</span>
        </div>
        <div class="flex justify-between text-slate-400">
          <span>Down-Mast Cable Drops:</span>
          <span class="font-mono text-cyan-300 font-semibold">${cableDropCount} Shielded OSP Cat6A</span>
        </div>
        <div class="pt-2 border-t border-slate-800/80">
          <span class="text-[10px] text-slate-500 uppercase font-mono block mb-0.5">Surge Arrestor Spec:</span>
          <span class="font-mono text-emerald-400 text-[11px] font-bold block">Gas Discharge Tube (GDT) at Base Handhole</span>
        </div>
      </div>
    `;

    if (auxContainer) {
      auxContainer.innerHTML = `
        <h3 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
          <i data-lucide="zap" class="w-4 h-4 text-cyan-400"></i> Grounding & Lightning
        </h3>
        <p class="text-[11px] text-slate-400">5/8" x 8ft copper-clad steel ground rod driven at pole foundation base with exothermic cadweld bond.</p>
      `;
    }

    if (fieldContainer) {
      fieldContainer.innerHTML = `
        <h3 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
          <i data-lucide="arrow-down" class="w-4 h-4 text-cyan-400"></i> Conduit Penetrations
        </h3>
        <p class="text-[11px] text-slate-400">2" Schedule 40 PVC sweep conduit stub-up through foundation center into base handhole at 2 ft AGL.</p>
      `;
    }

  } else if (hostType === "architectural_backboard") {
    // -------------------------------------------------------
    // Architectural Backboard Surface Utilization
    // -------------------------------------------------------
    const widthFt = (activeEnc && activeEnc.widthFt) ? activeEnc.widthFt : 4;
    const heightFt = (activeEnc && activeEnc.heightFt) ? activeEnc.heightFt : 8;
    const totalSqFt = widthFt * heightFt;
    const usedSqFt = Math.min(totalSqFt, Math.round(assignedItems.length * 3.5 * 10) / 10);
    const pct = Math.round((usedSqFt / totalSqFt) * 100);

    container.innerHTML = `
      <h3 class="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between">
        <span class="flex items-center gap-1.5 text-purple-400">
          <i data-lucide="layers" class="w-4 h-4"></i> Backboard Surface & Code Clearances
        </span>
        <span class="text-[10px] font-mono text-slate-500 uppercase font-normal">NEC 110.26 / BICSI</span>
      </h3>
      <div class="space-y-2 text-xs">
        <div class="flex justify-between text-slate-400">
          <span>Plywood Surface Usage:</span>
          <span class="font-mono text-purple-300 font-semibold">${usedSqFt} / ${totalSqFt} sq ft (${pct}%)</span>
        </div>
        <div class="flex justify-between text-slate-400">
          <span>Working Space Clearance:</span>
          <span class="font-mono text-emerald-400 font-semibold">36" Front Depth Maintained</span>
        </div>
        <div class="flex justify-between text-slate-400">
          <span>Wire Management Rings:</span>
          <span class="font-mono text-white font-semibold">2" D-Rings Included</span>
        </div>
      </div>
    `;

    if (auxContainer) {
      auxContainer.innerHTML = `
        <h3 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
          <i data-lucide="flame" class="w-4 h-4 text-rose-400"></i> Fire Marshal Stamp
        </h3>
        <p class="text-[11px] text-slate-400">AC-grade fire-retardant treated plywood with visible third-party listing agency stamp.</p>
      `;
    }

    if (fieldContainer) {
      fieldContainer.innerHTML = `
        <h3 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
          <i data-lucide="phone" class="w-4 h-4 text-purple-400"></i> Cross-Connects
        </h3>
        <p class="text-[11px] text-slate-400">Demarcation blocks cross-connected with 24 AWG Cat3/Cat5e cross-connect jumper wire.</p>
      `;
    }

  } else {
    // -------------------------------------------------------
    // Standard 19" EIA Rack Elevation Power & Thermal
    // -------------------------------------------------------
    let occupiedU = 0, totalPoE = 0, totalBaseWatts = 0, totalOutlets = 0;
    let totalEquipmentWeightLbs = 0;
    const cogAdvisories = [];

    assignedItems.forEach(it => {
      const units = (it.stackedUnits && it.stackedUnits >= 2) ? it.stackedUnits : 1;
      const ru = (it.rackUnits !== undefined && it.rackUnits !== null) ? (parseInt(it.rackUnits, 10) || 0) : 1;
      if (it.rackSlot) occupiedU += (ru * units);
      totalPoE += parseFloat(it.poeBudget || 0) * units;
      totalBaseWatts += parseFloat(it.baseWatts || 0) * units;
      totalOutlets += units;

      const role = it.role || "";
      const cat = (it.category || "").toLowerCase();
      let unitWeight = 8;
      if (it.weightLbs) unitWeight = parseFloat(it.weightLbs);
      else if (role === "Server" || cat.includes("server")) unitWeight = 36;
      else if (role === "UPS" || cat.includes("ups")) unitWeight = 48;
      else if (role === "Access" || role === "Core" || role === "Aggregation" || cat.includes("switch")) unitWeight = (it.poeBudget > 400 ? 18 : 12);
      else if (role === "Structured Cabling") unitWeight = (it.sku?.includes("48") ? 4.5 : 2.5);
      else unitWeight = 6 * ru;

      const itemTotalWeight = unitWeight * units;
      totalEquipmentWeightLbs += itemTotalWeight;

      if (it.rackSlot && it.rackSlot > 30 && itemTotalWeight >= 25) {
        cogAdvisories.push(`U${it.rackSlot}: ${it.model} (${Math.round(itemTotalWeight)} lbs) mounted high. Relocate to lower rack for stability.`);
      }
    });

    const operatingAcWatts = Math.round(totalBaseWatts + (totalPoE * 0.5));
    const worstCaseWatts = Math.round(totalBaseWatts + totalPoE);
    const worstCaseBTU = Math.round(worstCaseWatts * 3.412142);
    const tonsCooling = Math.round((worstCaseBTU / 12000) * 10) / 10;
    const operatingAmps = Math.round((operatingAcWatts / (120 * 0.92)) * 10) / 10;
    const worstCaseAmps = Math.round((worstCaseWatts / (120 * 0.92)) * 10) / 10;
    const circuitSpec = worstCaseWatts > 1440 ? "120V 20A Dedicated Circuit (NEMA 5-20R)" : "120V 15A Dedicated Circuit (NEMA 5-15R)";

    const tareWeight = (activeEnc && activeEnc.tareWeightLbs) ? activeEnc.tareWeightLbs : 160;
    const maxWeight = (activeEnc && activeEnc.maxWeightLbs) ? activeEnc.maxWeightLbs : 3000;
    const enclosureDepth = (activeEnc && activeEnc.depthInches) ? activeEnc.depthInches : 42;
    const grossWeightLbs = Math.round(tareWeight + totalEquipmentWeightLbs);
    const grossWeightKg = Math.round(grossWeightLbs * 0.453592);
    const isWeightOverload = totalEquipmentWeightLbs > maxWeight;
    const weightPct = Math.round((totalEquipmentWeightLbs / maxWeight) * 100);

    // Audit device depth compliance against physical enclosure depth
    const depthViolations = [];
    assignedItems.forEach(it => {
      let itemDepth = it.depthInches;
      if (!itemDepth) {
        const m = (it.model || '').toLowerCase();
        const r = (it.role || '').toLowerCase();
        if (r === "server" || m.includes("server") || m.includes("poweredge") || m.includes("proliant")) itemDepth = 29.5;
        else if (r === "ups" || m.includes("ups") || m.includes("smart-ups")) itemDepth = 24;
        else if (m.includes("ex4300") || m.includes("qfx") || m.includes("catalyst")) itemDepth = 18;
        else if (r === "structured cabling" || m.includes("patch panel")) itemDepth = 4;
        else itemDepth = 12;
      }
      if (itemDepth > enclosureDepth) {
        depthViolations.push(`${it.model || it.sku} (${itemDepth}" deep > ${enclosureDepth}" max)`);
      }
    });

    const upsMinVA = Math.round(worstCaseWatts / 0.90);
    const upsRecVA = Math.round((worstCaseWatts / 0.90) * 1.25);
    const upsModel = worstCaseWatts > 1200 ? "2200VA 2U Line-Interactive" : "1500VA 2U Line-Interactive";

    container.innerHTML = `
      <h3 class="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between">
        <span class="flex items-center gap-1.5 text-amber-400">
          <i data-lucide="zap" class="w-4 h-4"></i> Cabinet Electrical Load & Heat
        </span>
        <span class="text-[10px] font-mono text-slate-500 uppercase font-normal">NEC / IEEE 802.3</span>
      </h3>
      <div class="space-y-2 text-xs">
        <div class="flex justify-between text-slate-400">
          <span>Chassis Base Power:</span>
          <span class="font-mono text-white font-semibold">${Math.round(totalBaseWatts)} W</span>
        </div>
        <div class="flex justify-between text-slate-400">
          <span>Max PoE Capacity:</span>
          <span class="font-mono text-white font-semibold">${Math.round(totalPoE).toLocaleString()} W</span>
        </div>
        <div class="flex justify-between text-slate-400">
          <span>Chassis Power Feeds:</span>
          <span class="font-mono text-indigo-300 font-semibold">${totalOutlets}x AC Outlets (NEMA 5-15P)</span>
        </div>
        <div class="flex justify-between text-slate-400">
          <span>Operating Design Load:</span>
          <span class="font-mono text-sky-400 font-semibold">${operatingAcWatts} W (${operatingAmps} A @ 120V)</span>
        </div>
        <div class="flex justify-between text-slate-300 font-bold pt-2 border-t border-slate-800">
          <span>Worst-Case Nameplate:</span>
          <span class="font-mono text-amber-400">${worstCaseWatts.toLocaleString()} W (${worstCaseAmps} A)</span>
        </div>
        <div class="flex justify-between text-slate-400 text-[11px]">
          <span>BTU Heat Output:</span>
          <span class="font-mono text-slate-300 font-bold">${worstCaseBTU.toLocaleString()} BTU/hr (${tonsCooling} Tons AC)</span>
        </div>
        <div class="pt-2 border-t border-slate-800/80">
          <span class="text-[10px] text-slate-500 uppercase font-mono block mb-0.5">Required Branch Circuit:</span>
          <span class="font-mono text-emerald-400 text-[11px] font-bold block">${circuitSpec}</span>
        </div>
      </div>
    `;

    if (auxContainer) {
      // Calculate actual active field PoE draw homered to this rack
      const hostNorm = FacilityStore.normalize(activeRackId);
      let fieldPoEWatts = 0;
      let fieldDeviceCount = 0;

      if (typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) {
        projectBOM.forEach(item => {
          if (item.parentInstanceId) return;
          const itemLoc = FacilityStore.normalize(item.closetName || item.rackId);
          if (itemLoc === hostNorm && !isPassiveInfrastructure(item)) {
            const r = (item.role || "").toLowerCase();
            const c = (item.category || "").toLowerCase();
            const isField = r === "camera" || r === "access control" || r === "intercom" ||
                            c.includes("camera") || c.includes("access") || c.includes("intercom") ||
                            c.includes("wireless") || r === "wireless bridge" || r === "edge device";
            if (isField) {
              const pwr = (typeof PortEngine !== "undefined") ? PortEngine.getDevicePowerSource(item) : (item.powerSource || "poe_switch");
              if (pwr === "poe_switch") {
                const draw = parseFloat(item.poeWattsDrawn || item.powerConsumptionWatts || item.baseWatts || 15);
                fieldPoEWatts += draw * (parseInt(item.qty, 10) || 1);
                fieldDeviceCount += (parseInt(item.qty, 10) || 1);
              }
            }
          }
        });
      }

      if (typeof facilityFloors !== "undefined" && Array.isArray(facilityFloors)) {
        facilityFloors.forEach(floor => {
          if (!floor.nodes) return;
          const floorClosets = floor.nodes.filter(n => n.type === "closet");
          floor.nodes.filter(n => n.type === "device").forEach(dev => {
            let c = floorClosets.find(cl => cl.id === dev.assignedClosetId);
            if (!c && floorClosets.length > 0) c = floorClosets[0];
            const cNorm = c ? FacilityStore.normalize(c.name) : hostNorm;
            if (cNorm === hostNorm) {
              if (!dev.instanceId || !projectBOM.some(b => b.instanceId === dev.instanceId && FacilityStore.normalize(b.closetName) === hostNorm)) {
                const devWatts = parseFloat(dev.powerConsumptionWatts || dev.poeWattsDrawn || 15);
                fieldPoEWatts += devWatts;
                fieldDeviceCount++;
              }
            }
          });
        });
      }

      const totalConnectedPoEWithLoss = Math.round(fieldPoEWatts * 1.10);
      const effectiveConnectedPoE = fieldDeviceCount > 0 ? totalConnectedPoEWithLoss : Math.round(totalPoE * 0.40);
      const connectedAcWatts = Math.round(totalBaseWatts + effectiveConnectedPoE);

      // Sizing calculation powered by upgraded NetworkSizer engine
      const upsPlan = (typeof NetworkSizer !== "undefined" && typeof NetworkSizer.calculateUPSPlan === "function")
        ? NetworkSizer.calculateUPSPlan(assignedItems, {
            targetRuntimeMinutes: window.currentUpsTargetRuntime,
            safetyMargin: window.currentUpsSafetyMargin,
            preferredVoltage: window.currentUpsVoltage,
            selectedModelSku: window.currentUpsModelSku,
            loadMode: window.currentUpsLoadMode || "connected",
            connectedWatts: connectedAcWatts,
            agingFactor: window.currentUpsBatteryAging || 0.85,
            complianceStandard: window.currentUpsComplianceStandard || "ul294"
          })
        : null;

      let upsList = [];
      if (typeof CatalogRegistry !== "undefined" && CatalogRegistry.infrastructure && Array.isArray(CatalogRegistry.infrastructure.ups)) {
        upsList = CatalogRegistry.infrastructure.ups.filter(u => (u.type === "ups" || u.category === "ups") && !u.isEbp && !u.isPdu);
      }
      if (upsList.length === 0 && typeof ACCESSORY_DATABASE !== "undefined") {
        upsList = ACCESSORY_DATABASE.filter(u => (u.type === "ups" || u.category === "ups") && !u.isEbp && !u.isPdu);
      }

      const upsCatalogOptionsHtml = upsList.map(u => `
        <option value="${u.sku}" ${(window.currentUpsModelSku === u.sku) ? 'selected' : ''}>
          ${u.vendor} ${u.sku} (${u.va || 1500}VA / ${u.powerWatts || 1000}W &bull; ${u.rackUnits || 2}U)
        </option>
      `).join('');

      const planModelName = upsPlan ? upsPlan.upsModel.model : upsModel;
      const planCapWatts = upsPlan ? upsPlan.upsModel.powerWatts : 1500;
      const planLoadWatts = upsPlan ? upsPlan.runtimeLoadWatts : connectedAcWatts;
      const planLoadPct = upsPlan ? upsPlan.runtimeLoadPercent : 45;
      const planIntRuntime = upsPlan ? upsPlan.internalRuntime : 14;
      const planAchievedRuntime = upsPlan ? upsPlan.achievedRuntime : 14;
      const planTargetRuntime = upsPlan ? upsPlan.targetRuntime : window.currentUpsTargetRuntime;
      const planUpsQty = upsPlan ? upsPlan.upsQty : 1;
      const planEbpQty = upsPlan ? upsPlan.totalEbpQty : 0;
      const planEbpModel = upsPlan ? upsPlan.ebpModel : "BP72VRM2U";
      const planBreakerStatus = upsPlan ? upsPlan.feederCircuit.circuitStatus : "SAFE";
      const planLoadingPct = upsPlan ? upsPlan.feederCircuit.circuitLoadingPct : 65;
      const isConnectedMode = (window.currentUpsLoadMode || "connected") === "connected";
      const isUL294Passed = upsPlan ? upsPlan.ul294.compliant : (planAchievedRuntime >= 240);

      // Render Multi-EBP Runtime Curve Pills (0 to 4 EBPs)
      const curveHtml = (upsPlan && Array.isArray(upsPlan.runtimeCurve)) ? upsPlan.runtimeCurve.map(c => `
        <div class="p-1.5 rounded-lg border flex flex-col items-center justify-between transition-all ${c.ebpQty === planEbpQty ? 'bg-indigo-950/80 border-indigo-500 shadow-sm ring-1 ring-indigo-500/40' : (c.meetsUL294 ? 'bg-slate-900 border-emerald-800/60 hover:border-emerald-600' : 'bg-slate-900 border-slate-800 hover:border-slate-700')}">
          <div class="text-[9px] font-mono text-slate-400 font-semibold mb-0.5">${c.ebpQty === 0 ? 'Internal' : `+${c.ebpQty} EBP`}</div>
          <div class="text-xs font-mono font-bold ${c.meetsUL294 ? 'text-emerald-300' : (c.meetsTarget ? 'text-sky-300' : 'text-slate-300')}">
            ${c.runtimeMin >= 60 ? `${c.runtimeHours}h` : `${c.runtimeMin}m`}
          </div>
          <div class="text-[8.5px] font-mono text-slate-500 mt-0.5">
            ${c.meetsUL294 ? '<span class="text-emerald-400 font-bold">UL 294</span>' : (c.meetsTarget ? '<span class="text-sky-400">Target</span>' : `${c.runtimeMin}m`)}
          </div>
          <button 
            type="button" 
            onclick="window.addSpecificEbpCountToRack(${c.ebpQty})" 
            class="mt-1 w-full py-0.5 rounded text-[8.5px] font-mono font-bold transition-all cursor-pointer ${c.ebpQty === planEbpQty ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-indigo-700 hover:text-white'}"
            title="Configure rack with ${c.ebpQty}x external battery pack(s)"
          >
            ${c.ebpQty === planEbpQty ? 'Active' : 'Select'}
          </button>
        </div>
      `).join('') : '';

      auxContainer.innerHTML = `
        <div class="space-y-3">
          <!-- Interactive UPS Sizing Engine Panel -->
          <div class="p-3 rounded-xl bg-slate-950/90 border border-slate-800 shadow-xl">
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <i data-lucide="zap" class="w-4 h-4 text-amber-400"></i> UPS & Battery Standby Engine
              </h3>
              <span class="text-[9.5px] font-mono px-2 py-0.5 rounded-md font-bold ${isUL294Passed ? 'bg-emerald-950/90 border border-emerald-600/50 text-emerald-300' : (planBreakerStatus === 'SAFE' ? 'bg-sky-950/80 border border-sky-600/40 text-sky-400' : 'bg-amber-950/80 border border-amber-600/40 text-amber-300')}">
                ${isUL294Passed ? 'UL 294 OK' : `${planBreakerStatus} (${planLoadingPct}% Feeder)`}
              </span>
            </div>

            <!-- Active Connected Load vs Nameplate Capacity Toggle -->
            <div class="mb-2 p-1 bg-slate-900 border border-slate-800 rounded-xl grid grid-cols-2 gap-1 text-[11px] font-semibold select-none">
              <button 
                type="button" 
                onclick="window.handleUpsLoadModeChange('connected')" 
                class="py-1 px-2 rounded-lg transition-all flex flex-col items-center justify-center cursor-pointer ${isConnectedMode ? 'bg-indigo-600 text-white shadow-sm font-bold' : 'text-slate-400 hover:text-white'}"
                title="Calculate battery runtime based on actual headend equipment plus active connected edge PoE devices"
              >
                <span>Active Connected Load</span>
                <span class="font-mono text-[9px] opacity-80">${connectedAcWatts}W (${fieldDeviceCount} Drops)</span>
              </button>
              <button 
                type="button" 
                onclick="window.handleUpsLoadModeChange('nameplate')" 
                class="py-1 px-2 rounded-lg transition-all flex flex-col items-center justify-center cursor-pointer ${!isConnectedMode ? 'bg-indigo-600 text-white shadow-sm font-bold' : 'text-slate-400 hover:text-white'}"
                title="Calculate battery runtime assuming switches are running at 100% full maximum PoE nameplate budget"
              >
                <span>Full Nameplate Budget</span>
                <span class="font-mono text-[9px] opacity-80">${worstCaseWatts}W (100% Saturation)</span>
              </button>
            </div>

            <!-- Parameters Grid (Runtime, Safety Margin, Standards, Aging) -->
            <div class="grid grid-cols-2 gap-2 text-xs mb-2">
              <div>
                <label class="text-[10px] font-mono text-slate-400 block mb-0.5">Target Runtime</label>
                <select onchange="window.handleUpsRuntimeChange(this.value)" class="w-full bg-slate-900 border border-slate-700 text-amber-300 font-bold rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-amber-500">
                  <option value="5" ${window.currentUpsTargetRuntime === 5 ? 'selected' : ''}>5 Minutes</option>
                  <option value="15" ${window.currentUpsTargetRuntime === 15 ? 'selected' : ''}>15 Minutes (Standard)</option>
                  <option value="30" ${window.currentUpsTargetRuntime === 30 ? 'selected' : ''}>30 Minutes</option>
                  <option value="60" ${window.currentUpsTargetRuntime === 60 ? 'selected' : ''}>60 Minutes (1 Hour)</option>
                  <option value="120" ${window.currentUpsTargetRuntime === 120 ? 'selected' : ''}>120 Minutes (2 Hours)</option>
                  <option value="240" ${window.currentUpsTargetRuntime === 240 ? 'selected' : ''}>240 Minutes (4-Hr UL 294)</option>
                </select>
              </div>
              <div>
                <label class="text-[10px] font-mono text-slate-400 block mb-0.5">Standby Standard</label>
                <select onchange="window.handleUpsComplianceStandardChange(this.value)" class="w-full bg-slate-900 border border-slate-700 text-slate-200 font-medium rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-amber-500">
                  <option value="ul294" ${window.currentUpsComplianceStandard === 'ul294' ? 'selected' : ''}>UL 294 / NFPA 731 (4-Hr)</option>
                  <option value="sla_60m" ${window.currentUpsComplianceStandard === 'sla_60m' ? 'selected' : ''}>Enterprise SLA (60m)</option>
                  <option value="sla_30m" ${window.currentUpsComplianceStandard === 'sla_30m' ? 'selected' : ''}>Graceful Shutdown (30m)</option>
                  <option value="sla_15m" ${window.currentUpsComplianceStandard === 'sla_15m' ? 'selected' : ''}>Basic IT Backup (15m)</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2 text-xs mb-2">
              <div>
                <label class="text-[10px] font-mono text-slate-400 block mb-0.5">Battery Aging Factor</label>
                <select onchange="window.handleUpsAgingChange(this.value)" class="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-amber-500">
                  <option value="0.85" ${window.currentUpsBatteryAging === 0.85 ? 'selected' : ''}>85% (IEEE 1188 End-of-Life)</option>
                  <option value="1.0" ${window.currentUpsBatteryAging === 1.0 ? 'selected' : ''}>100% (Factory New Battery)</option>
                </select>
              </div>
              <div>
                <label class="text-[10px] font-mono text-slate-400 block mb-0.5">Safety Headroom</label>
                <select onchange="window.handleUpsMarginChange(this.value)" class="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-amber-500">
                  <option value="0.60" ${window.currentUpsSafetyMargin === 0.60 ? 'selected' : ''}>60% Max Load</option>
                  <option value="0.75" ${window.currentUpsSafetyMargin === 0.75 ? 'selected' : ''}>75% (Recommended)</option>
                  <option value="0.80" ${window.currentUpsSafetyMargin === 0.80 ? 'selected' : ''}>80% Standard</option>
                </select>
              </div>
            </div>

            <!-- UPS Model Selector -->
            <div class="mb-2">
              <label class="text-[10px] font-mono text-slate-400 block mb-0.5">UPS Hardware Selection</label>
              <select onchange="window.handleUpsModelChange(this.value)" class="w-full bg-slate-900 border border-slate-700 text-slate-200 font-medium rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-amber-500 truncate">
                <option value="auto" ${window.currentUpsModelSku === 'auto' ? 'selected' : ''}>⚡ Auto-Recommend Optimal (${upsPlan ? upsPlan.upsModel.sku : 'Best Fit'})</option>
                ${upsCatalogOptionsHtml}
              </select>
            </div>

            <!-- Scalable Multi-EBP Runtime Curve Matrix -->
            <div class="mb-2 p-2 rounded-xl bg-slate-900/90 border border-slate-800">
              <div class="flex items-center justify-between mb-1.5 text-[10px] font-mono">
                <span class="text-slate-400 font-bold uppercase">Scalable Runtime Curve:</span>
                <span class="text-indigo-300 font-bold">${planLoadWatts}W Active Load</span>
              </div>
              <div class="grid grid-cols-5 gap-1">
                ${curveHtml}
              </div>
            </div>

            <!-- UL 294 / NFPA 731 Life Safety Compliance Banner -->
            <div class="mb-2 p-2 rounded-xl border ${isUL294Passed ? 'bg-emerald-950/60 border-emerald-600/40 text-emerald-300' : 'bg-amber-950/60 border-amber-600/40 text-amber-200'} text-xs">
              <div class="flex items-center justify-between font-bold">
                <span class="flex items-center gap-1.5">
                  <i data-lucide="${isUL294Passed ? 'shield-check' : 'alert-triangle'}" class="w-4 h-4 ${isUL294Passed ? 'text-emerald-400' : 'text-amber-400'}"></i>
                  <span>${isUL294Passed ? 'UL 294 / NFPA 731: 4-Hour Standby PASSED' : 'UL 294 Standby Deficit: Needs EBP'}</span>
                </span>
                <span class="font-mono text-[11px]">${upsPlan ? upsPlan.ul294.achievedHours : (planAchievedRuntime / 60).toFixed(1)} / 4.0 Hrs</span>
              </div>
              <p class="text-[10px] opacity-90 mt-1">
                ${isUL294Passed 
                  ? `Rack backup system achieves ${upsPlan.ul294.achievedHours} hours continuous runtime, fully compliant with UL 294 access control standards.`
                  : `Current runtime is ${planAchievedRuntime} mins (-${upsPlan ? upsPlan.ul294.deficitMin : 0} min shortfall vs 4-Hour code requirement). Add ${upsPlan ? upsPlan.ul294.requiredEbpQty : 1}x ${planEbpModel} external battery pack to achieve compliance.`
                }
              </p>
              ${!isUL294Passed && upsPlan && upsPlan.ul294.requiredEbpQty > 0 ? `
                <button 
                  type="button" 
                  onclick="window.addSpecificEbpCountToRack(${upsPlan.ul294.requiredEbpQty})" 
                  class="mt-1.5 w-full py-1 px-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-[10.5px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow"
                >
                  <i data-lucide="plus-circle" class="w-3.5 h-3.5"></i>
                  <span>+ Add ${upsPlan.ul294.requiredEbpQty}x ${planEbpModel} for UL 294 4-Hour Compliance</span>
                </button>
              ` : ''}
            </div>

            <!-- Live Telemetry Readout -->
            <div class="bg-slate-900/90 rounded-lg p-2.5 border border-slate-800 space-y-1.5 text-xs font-mono">
              <div class="flex items-center justify-between">
                <span class="text-slate-400 font-sans">Required Sizing:</span>
                <span class="text-emerald-400 font-bold font-sans truncate max-w-[210px]">${planUpsQty}x ${upsPlan ? upsPlan.upsModel.sku : 'UPS'} (${upsPlan ? upsPlan.upsModel.va : 1500}VA / ${planCapWatts}W)</span>
              </div>

              <!-- Load Bar -->
              <div>
                <div class="flex justify-between text-[11px] mb-0.5">
                  <span class="text-slate-400 font-sans">Unit Load (${isConnectedMode ? 'Active PoE' : 'Peak'}):</span>
                  <span class="font-bold ${planLoadPct <= 75 ? 'text-emerald-300' : (planLoadPct <= 85 ? 'text-amber-300' : 'text-rose-400')}">
                    ${planLoadWatts}W / ${planCapWatts}W (${planLoadPct}%)
                  </span>
                </div>
                <div class="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div class="h-full rounded-full transition-all duration-300 ${planLoadPct <= 75 ? 'bg-emerald-500' : (planLoadPct <= 85 ? 'bg-amber-500' : 'bg-rose-500')}" style="width: ${Math.min(100, planLoadPct)}%"></div>
                </div>
              </div>

              <div class="flex items-center justify-between pt-1 border-t border-slate-800/80">
                <span class="text-slate-400 font-sans">Internal Battery:</span>
                <span class="text-sky-300 font-bold">${planIntRuntime} minutes</span>
              </div>

              <div class="flex items-center justify-between">
                <span class="text-slate-400 font-sans">Battery Modules:</span>
                <span class="${planEbpQty > 0 ? 'text-purple-300 font-bold' : 'text-slate-500'}">
                  ${planEbpQty > 0 ? `${planEbpQty}x ${planEbpModel} (${upsPlan.rackSpace.ebpRU}U)` : 'None (Internal Only)'}
                </span>
              </div>

              <div class="flex items-center justify-between pt-1 border-t border-slate-800/80 font-sans font-bold">
                <span class="text-slate-200">Achieved Runtime:</span>
                <span class="text-emerald-400 flex items-center gap-1 font-mono">
                  <i data-lucide="clock" class="w-3.5 h-3.5 text-emerald-400"></i> ${planAchievedRuntime} min (${(planAchievedRuntime / 60).toFixed(1)} hrs)
                </span>
              </div>

              <div class="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                <span class="font-sans">Branch Feeder:</span>
                <span class="text-slate-300 font-bold">${upsPlan ? upsPlan.feederCircuit.actualInputAmps : operatingAmps}A Continuous (${upsPlan ? upsPlan.feederCircuit.breakerAmps : 20}A Breaker)</span>
              </div>

              <div class="flex items-center justify-between text-[11px] text-slate-400">
                <span class="font-sans">Power Footprint:</span>
                <span class="text-indigo-300 font-bold">${upsPlan ? upsPlan.rackSpace.totalRU : 2}U Total Space</span>
              </div>
            </div>

            <!-- Auto-Slot Action Button -->
            <div class="pt-2">
              <button onclick="window.addRecommendedUpsAndEbpToRack()" class="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 cursor-pointer transition-all active:scale-[0.98]">
                <i data-lucide="zap" class="w-4 h-4 text-emerald-200"></i>
                <span>Slot ${planUpsQty}x UPS ${planEbpQty > 0 ? `+ ${planEbpQty}x EBP` : ''} to Rack (U1+)</span>
              </button>
            </div>
          </div>

          <div class="pt-2.5 border-t border-slate-800">
            <div class="flex items-center justify-between mb-1.5">
              <h3 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <i data-lucide="scale" class="w-4 h-4 text-purple-400"></i> Structural Load & Capacity
              </h3>
              <span class="text-[9.5px] font-mono px-2 py-0.5 rounded font-bold ${isWeightOverload ? 'bg-rose-950/80 border border-rose-600 text-rose-300' : 'bg-slate-900 border border-slate-700 text-slate-300'}">
                ${activeEnc?.catalogSku || 'Custom Frame'}
              </span>
            </div>
            <div class="space-y-1.5 text-xs">
              <div>
                <div class="flex justify-between text-slate-400 mb-1">
                  <span>Equipment Payload:</span>
                  <span class="font-mono font-bold ${isWeightOverload ? 'text-rose-400' : 'text-purple-300'}">
                    ${Math.round(totalEquipmentWeightLbs)} / ${maxWeight.toLocaleString()} lbs (${weightPct}%)
                  </span>
                </div>
                <div class="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div class="h-full rounded-full transition-all duration-300 ${weightPct > 100 ? 'bg-rose-500' : (weightPct > 80 ? 'bg-amber-500' : 'bg-purple-500')}" style="width: ${Math.min(100, weightPct)}%"></div>
                </div>
              </div>
              <div class="flex justify-between text-slate-400">
                <span>Frame Tare Weight:</span>
                <span class="font-mono text-slate-300">${tareWeight} lbs (${Math.round(tareWeight * 0.453592)} kg)</span>
              </div>
              <div class="flex justify-between text-slate-400">
                <span>Cabinet Gross Weight:</span>
                <span class="font-mono text-white font-bold">${grossWeightLbs} lbs (${grossWeightKg} kg)</span>
              </div>
              <div class="flex justify-between text-slate-400">
                <span>Rail Depth Clearance:</span>
                <span class="font-mono ${depthViolations.length > 0 ? 'text-amber-400 font-bold' : 'text-cyan-300'}">${enclosureDepth}" Usable Space</span>
              </div>

              <!-- Overload Alert -->
              ${isWeightOverload ? `
                <div class="p-2 rounded-lg bg-rose-950/80 border border-rose-500/80 text-[10.5px] text-rose-200 flex items-start gap-1.5 mt-1.5">
                  <i data-lucide="alert-octagon" class="w-4 h-4 text-rose-400 shrink-0 mt-0.5"></i>
                  <span><strong>STRUCTURAL OVERLOAD:</strong> Payload (${Math.round(totalEquipmentWeightLbs)} lbs) exceeds rated capacity (${maxWeight.toLocaleString()} lbs) for ${escapeHTML(activeEnc?.catalogModel || 'this enclosure')}.</span>
                </div>
              ` : ''}

              <!-- Depth Clearance Warning -->
              ${depthViolations.length > 0 ? `
                <div class="p-2 rounded-lg bg-amber-950/80 border border-amber-500/80 text-[10.5px] text-amber-200 flex items-start gap-1.5 mt-1.5">
                  <i data-lucide="alert-triangle" class="w-4 h-4 text-amber-400 shrink-0 mt-0.5"></i>
                  <span><strong>DEPTH CLEARANCE:</strong> ${escapeHTML(depthViolations[0])}</span>
                </div>
              ` : ''}

              <div class="pt-1">
                ${cogAdvisories.length > 0 ? `
                  <div class="p-1.5 rounded-lg bg-amber-950/60 border border-amber-600/40 text-[10.5px] text-amber-300 flex items-start gap-1.5">
                    <i data-lucide="alert-triangle" class="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5"></i>
                    <span>${escapeHTML(cogAdvisories[0])}</span>
                  </div>
                ` : (!isWeightOverload && depthViolations.length === 0 ? `
                  <div class="text-[10.5px] text-emerald-400 font-mono flex items-center gap-1">
                    <i data-lucide="check-circle" class="w-3.5 h-3.5"></i>
                    <span>Structural Capacity &amp; Clearances Compliant</span>
                  </div>
                ` : '')}
              </div>
            </div>
          </div>
        </div>
      `;
    }

    if (fieldContainer) {
      const fieldItems = assignedItems.filter(i => !i.rackSlot);
      fieldContainer.innerHTML = `
        <div class="flex items-center justify-between">
          <h3 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <i data-lucide="radio-tower" class="w-4 h-4 text-amber-400"></i> Unslotted Modules & Passive Infra
          </h3>
        </div>

        <!-- Quick-Add Passive Infrastructure Strip -->
        <div class="flex items-center gap-1 mt-2 mb-2.5 flex-wrap">
          <button onclick="addPassiveToActiveRack('pp24')" class="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-purple-500/60 rounded text-[10px] font-bold text-purple-300 flex items-center gap-1 transition-colors cursor-pointer" title="Add 1U 24-Port Modular Keystone Patch Panel">
            <i data-lucide="plus" class="w-3 h-3 text-purple-400"></i> 24P Panel
          </button>
          <button onclick="addPassiveToActiveRack('pp48')" class="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-purple-500/60 rounded text-[10px] font-bold text-purple-300 flex items-center gap-1 transition-colors cursor-pointer" title="Add 2U 48-Port Modular Keystone Patch Panel">
            <i data-lucide="plus" class="w-3 h-3 text-purple-400"></i> 48P Panel
          </button>
          <button onclick="addPassiveToActiveRack('hcm1u')" class="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-indigo-500/60 rounded text-[10px] font-bold text-indigo-300 flex items-center gap-1 transition-colors cursor-pointer" title="Add 1U Horizontal Cable Manager">
            <i data-lucide="plus" class="w-3 h-3 text-indigo-400"></i> 1U Cable Mgr
          </button>
          <button onclick="addPassiveToActiveRack('blank1u')" class="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-slate-500 rounded text-[10px] font-bold text-slate-300 flex items-center gap-1 transition-colors cursor-pointer" title="Add 1U Blank Panel">
            <i data-lucide="plus" class="w-3 h-3 text-slate-400"></i> Blank
          </button>
        </div>

        <div class="space-y-1.5 pt-1">
          ${fieldItems.length === 0 ? `
            <span class="text-slate-500 text-[11px] block py-1">All hardware is slotted into 19" EIA units.</span>
          ` : fieldItems.map(it => {
            const comp = checkDeviceHostCompatibility(it, hostType);
            return `
            <div 
              draggable="${comp.compatible ? 'true' : 'false'}"
              ondragstart="handleRackItemDragStart(event, '${it.instanceId}')"
              class="bg-slate-950 p-2 rounded-xl border ${comp.compatible ? 'border-indigo-500/40 hover:border-indigo-400 cursor-grab active:cursor-grabbing' : 'border-slate-800'} flex items-center justify-between text-xs transition-colors"
              title="${comp.compatible ? 'Drag to rack slot or click Mount' : (comp.advisory || 'Unslotted module')}"
            >
              <div class="min-w-0 pr-2">
                <span class="font-bold text-white block truncate max-w-[190px]">${escapeHTML(it.model)}</span>
                <span class="text-[10px] text-amber-400 font-mono">${it.role || 'Accessory'}</span>
              </div>
              <div class="flex items-center gap-1.5 shrink-0">
                ${comp.compatible ? `
                  <button 
                    onclick="mountItemToFirstAvailableSlot('${it.instanceId}')"
                    class="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-bold shadow transition-colors cursor-pointer"
                    title="Mount into first free slot"
                  >
                    Mount
                  </button>
                ` : ''}
                <span class="font-mono text-[11px] text-slate-400 font-bold">${it.qty || 1}x</span>
              </div>
            </div>
            `;
          }).join('')}
        </div>
      `;
    }
  }

  // Dual 0U PDU & Redundancy Card (equipment_rack only)
  const pduContainer = document.getElementById("hostPduContainer");
  if (pduContainer) {
    if (hostType === "equipment_rack" || (!hostType && !parsed.hostType)) {
      pduContainer.classList.remove("hidden");
      const pduMetrics = calculateRackPduMetrics(assignedItems, activeEnc);
      const pduConfig = getRackPduConfig();

      const pduAColor = pduMetrics.pduA.pct > 80 ? "text-rose-400" : (pduMetrics.pduA.pct > 70 ? "text-amber-400" : "text-emerald-400");
      const pduABarColor = pduMetrics.pduA.pct > 80 ? "bg-rose-500" : (pduMetrics.pduA.pct > 70 ? "bg-amber-500" : "bg-emerald-500");

      if (pduConfig === "horizontal") {
        pduContainer.innerHTML = `
          <h3 class="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between">
            <span class="flex items-center gap-1.5 text-indigo-400">
              <i data-lucide="zap" class="w-4 h-4"></i> Horizontal 1U Rackmount PDU
            </span>
            <span class="text-[10px] font-mono text-slate-500 uppercase font-normal">NEC 80% (16A / 20A)</span>
          </h3>

          <div class="space-y-3 pt-1">
            <div class="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <div class="flex items-center justify-between text-xs mb-1">
                <span class="font-bold text-indigo-300 flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full bg-indigo-400"></span> 1U PDU Load (120V Circuit)
                </span>
                <span class="font-mono font-bold ${pduAColor}">${pduMetrics.pduA.amps} A / 16.0 A</span>
              </div>
              <div class="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden mb-1.5">
                <div class="${pduABarColor} h-1.5 rounded-full transition-all" style="width: ${pduMetrics.pduA.pct}%"></div>
              </div>
              <div class="flex justify-between text-[10px] font-mono text-slate-400">
                <span>${pduMetrics.pduA.watts} W (${pduMetrics.pduA.pct}% continuous)</span>
                <span>${pduMetrics.pduA.outletsUsed} / 8 Receptacles</span>
              </div>
            </div>
          </div>

          <div class="pt-2 border-t border-slate-800 space-y-1.5 text-xs">
            <div class="flex items-center justify-between">
              <span class="text-slate-400 text-[11px]">Form Factor:</span>
              <span class="font-mono font-bold text-indigo-300 text-[11px]">1U Horizontal 19" Rackmount</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-400 text-[11px]">Input Plug:</span>
              <span class="font-mono text-slate-300 text-[11px]">NEMA 5-20P (120V 20A)</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-400 text-[11px]">Receptacles:</span>
              <span class="font-mono text-slate-300 text-[11px]">8x NEMA 5-20R Outlets</span>
            </div>
          </div>

          <div class="pt-2 border-t border-slate-800">
            <button onclick="switchRackOrientation('rear')" class="w-full py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all">
              <i data-lucide="rotate-cw" class="w-3.5 h-3.5 text-indigo-400"></i> View Rear Receptacles
            </button>
          </div>
        `;
      } else if (pduConfig === "single_vertical") {
        pduContainer.innerHTML = `
          <h3 class="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between">
            <span class="flex items-center gap-1.5 text-emerald-400">
              <i data-lucide="zap" class="w-4 h-4"></i> Single 0U Vertical PDU
            </span>
            <span class="text-[10px] font-mono text-slate-500 uppercase font-normal">NEC 80% (16A / 20A)</span>
          </h3>

          <div class="space-y-3 pt-1">
            <div class="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <div class="flex items-center justify-between text-xs mb-1">
                <span class="font-bold text-emerald-400 flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full bg-emerald-400"></span> Primary 0U PDU (Feed A)
                </span>
                <span class="font-mono font-bold ${pduAColor}">${pduMetrics.pduA.amps} A / 16.0 A</span>
              </div>
              <div class="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden mb-1.5">
                <div class="${pduABarColor} h-1.5 rounded-full transition-all" style="width: ${pduMetrics.pduA.pct}%"></div>
              </div>
              <div class="flex justify-between text-[10px] font-mono text-slate-400">
                <span>${pduMetrics.pduA.watts} W (${pduMetrics.pduA.pct}% continuous)</span>
                <span>${pduMetrics.pduA.outletsUsed} / 24 Receptacles</span>
              </div>
            </div>
          </div>

          <div class="pt-2 border-t border-slate-800 space-y-1.5 text-xs">
            <div class="flex items-center justify-between">
              <span class="text-slate-400 text-[11px]">Form Factor:</span>
              <span class="font-mono font-bold text-emerald-300 text-[11px]">Single 0U Vertical Strip</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-400 text-[11px]">Circuit:</span>
              <span class="font-mono text-slate-300 text-[11px]">1x 20A 120V Circuit</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-400 text-[11px]">Connected Units:</span>
              <span class="font-mono text-emerald-400 text-[11px]">${assignedItems.length} Mounted Units</span>
            </div>
          </div>

          <div class="pt-2 border-t border-slate-800">
            <button onclick="switchRackOrientation('rear')" class="w-full py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all">
              <i data-lucide="rotate-cw" class="w-3.5 h-3.5 text-emerald-400"></i> View Rear Channels
            </button>
          </div>
        `;
      } else {
        // Dual 0U PDUs (A+B)
        const spofCount = pduMetrics.redundancy.singlePointFailureCount;
        const redundantCount = pduMetrics.redundancy.redundantDeviceCount;
        const singleCount = pduMetrics.redundancy.singleCordedCount;

        const pduBColor = pduMetrics.pduB.pct > 80 ? "text-rose-400" : (pduMetrics.pduB.pct > 70 ? "text-amber-400" : "text-sky-400");
        const pduBBarColor = pduMetrics.pduB.pct > 80 ? "bg-rose-500" : (pduMetrics.pduB.pct > 70 ? "bg-amber-500" : "bg-sky-500");

        pduContainer.innerHTML = `
          <h3 class="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between">
            <span class="flex items-center gap-1.5 text-indigo-400">
              <i data-lucide="zap" class="w-4 h-4"></i> Dual 0U PDUs &amp; Power Feeds
            </span>
            <span class="text-[10px] font-mono text-slate-500 uppercase font-normal">NEC 80% (16A / 20A)</span>
          </h3>

          <!-- PDU Load Meters -->
          <div class="space-y-3 pt-1">
            <!-- Feed A (Utility) -->
            <div class="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <div class="flex items-center justify-between text-xs mb-1">
                <span class="font-bold text-emerald-400 flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full bg-emerald-400"></span> Feed A (Primary Utility)
                </span>
                <span class="font-mono font-bold ${pduAColor}">${pduMetrics.pduA.amps} A / 16.0 A</span>
              </div>
              <div class="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden mb-1.5">
                <div class="${pduABarColor} h-1.5 rounded-full transition-all" style="width: ${pduMetrics.pduA.pct}%"></div>
              </div>
              <div class="flex justify-between text-[10px] font-mono text-slate-400">
                <span>${pduMetrics.pduA.watts} W (${pduMetrics.pduA.pct}% continuous)</span>
                <span>${pduMetrics.pduA.outletsUsed} / 24 Receptacles</span>
              </div>
            </div>

            <!-- Feed B (UPS / Generator) -->
            <div class="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <div class="flex items-center justify-between text-xs mb-1">
                <span class="font-bold text-sky-400 flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full bg-sky-400"></span> Feed B (Secondary / UPS)
                </span>
                <span class="font-mono font-bold ${pduBColor}">${pduMetrics.pduB.amps} A / 16.0 A</span>
              </div>
              <div class="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden mb-1.5">
                <div class="${pduBBarColor} h-1.5 rounded-full transition-all" style="width: ${pduMetrics.pduB.pct}%"></div>
              </div>
              <div class="flex justify-between text-[10px] font-mono text-slate-400">
                <span>${pduMetrics.pduB.watts} W (${pduMetrics.pduB.pct}% continuous)</span>
                <span>${pduMetrics.pduB.outletsUsed} / 24 Receptacles</span>
              </div>
            </div>
          </div>

          <!-- A+B Redundancy Diagnostic Breakdown -->
          <div class="pt-2 border-t border-slate-800 space-y-1.5 text-xs">
            <div class="flex items-center justify-between">
              <span class="text-slate-400 text-[11px]">A+B Dual-Feed Redundant:</span>
              <span class="font-mono font-bold text-emerald-400 text-[11px]">${redundantCount} Unit${redundantCount === 1 ? '' : 's'}</span>
            </div>

            <div class="flex items-center justify-between">
              <span class="text-slate-400 text-[11px]">Single Point of Failure (SPOF):</span>
              <span class="font-mono font-bold ${spofCount > 0 ? 'text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/80' : 'text-slate-500'} text-[11px]">
                ${spofCount > 0 ? `⚠️ ${spofCount} Unit${spofCount === 1 ? '' : 's'}` : '0 None'}
              </span>
            </div>

            <div class="flex items-center justify-between">
              <span class="text-slate-400 text-[11px]">Single-Corded Devices:</span>
              <span class="font-mono text-slate-400 text-[11px]">${singleCount} Unit${singleCount === 1 ? '' : 's'}</span>
            </div>

            ${spofCount > 0 ? `
              <div class="text-[10px] text-amber-400/90 bg-amber-950/30 p-2 rounded-lg border border-amber-800/50 mt-1">
                <strong>SPOF Warning:</strong> ${spofCount} dual-PSU device(s) have both cords plugged into the same PDU feed. Use Auto-Balance to split across Feed A &amp; B.
              </div>
            ` : ''}
          </div>

          <!-- Auto-Balance Action & Orientation Link -->
          <div class="pt-2 border-t border-slate-800 space-y-1.5">
            <button onclick="autoBalanceRackPowerFeeds()" class="w-full py-1.5 px-3 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/50 hover:border-indigo-400 text-indigo-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm">
              <i data-lucide="scale" class="w-3.5 h-3.5 text-indigo-400"></i> Auto-Balance Power Feeds
            </button>
            <div class="text-center pt-0.5">
              <button onclick="switchRackOrientation('rear')" class="text-[10px] text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-1 mx-auto">
                <i data-lucide="rotate-cw" class="w-3 h-3 text-indigo-400"></i>
                <span>Inspect Receptacles in Rear Elevation</span>
              </button>
            </div>
          </div>
        `;
      }
    } else {
      pduContainer.classList.add("hidden");
      pduContainer.innerHTML = "";
    }
  }

  // Update legacy element IDs if still referenced elsewhere
  updateLegacyTelemetryElements(assignedItems);
}

function updateLegacyTelemetryElements(assignedItems) {
  const baseEl = document.getElementById("rackTotalBaseWatts");
  const poeEl = document.getElementById("rackTotalPoE");
  const operatingEl = document.getElementById("rackOperatingWatts");
  const worstEl = document.getElementById("rackTotalWorstCase");
  const btuEl = document.getElementById("rackTotalBTU");

  if (!baseEl && !poeEl) return;

  let totalBase = 0, totalPoE = 0;
  assignedItems.forEach(it => {
    const units = (it.stackedUnits && it.stackedUnits >= 2) ? it.stackedUnits : 1;
    totalBase += parseFloat(it.baseWatts || 0) * units;
    totalPoE += parseFloat(it.poeBudget || 0) * units;
  });
  const operatingWatts = Math.round(totalBase + (totalPoE * 0.5));
  const worstCaseWatts = Math.round(totalBase + totalPoE);

  if (baseEl) baseEl.innerText = `${Math.round(totalBase)} W`;
  if (poeEl) poeEl.innerText = `${Math.round(totalPoE)} W`;
  if (operatingEl) operatingEl.innerText = `${operatingWatts} W`;
  if (worstEl) worstEl.innerText = `${worstCaseWatts} W`;
  if (btuEl) btuEl.innerText = `${Math.round(worstCaseWatts * 3.412)} BTU/hr`;
}

// -----------------------------------------------------------
// Served Edge Endpoints & Drops Drag-and-Drop Handling
// -----------------------------------------------------------
function handleServedEndpointsDragOver(event) {
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
  event.currentTarget.classList.add("border-indigo-500", "bg-indigo-950/30");
}

function handleServedEndpointsDragLeave(event) {
  event.currentTarget.classList.remove("border-indigo-500", "bg-indigo-950/30");
}

function handleServedEndpointsDrop(event) {
  event.preventDefault();
  event.currentTarget.classList.remove("border-indigo-500", "bg-indigo-950/30");
  const instanceId = event.dataTransfer?.getData("text/plain") || 
                     event.dataTransfer?.getData("hardwareInstanceId") || 
                     draggedRackItemInstanceId;
  if (!instanceId || typeof projectBOM === "undefined") return;

  const item = projectBOM.find(i => i.instanceId === instanceId);
  if (!item) return;

  const isServer = typeof isServerDevice === "function" ? isServerDevice(item) : (item.role === "Server" || item.category === "servers" || /server/i.test(item.role || ''));
  if (isServer) {
    if (typeof showToast === "function") {
      showToast("Servers must be mounted directly into rack slots, not assigned as field drops.", 4000);
    }
    return;
  }

  delete item.rackSlot;
  item.closetName = activeRackId;
  item.rackId = activeRackId;

  FacilityStore.notifyWorkspaceChange();
  renderRackVisualizer();
  if (typeof showToast === "function") {
    showToast(`Homed ${item.model || 'Device'} as a drop to ${activeRackId}`);
  }
}
window.handleServedEndpointsDragOver = handleServedEndpointsDragOver;
window.handleServedEndpointsDragLeave = handleServedEndpointsDragLeave;
window.handleServedEndpointsDrop = handleServedEndpointsDrop;

function renderServedEndpoints(parsed, activeEnc) {
  const container = document.getElementById("hostEndpointsContainer");
  const countBadge = document.getElementById("hostEndpointsCount");
  if (!container) return;

  const endpoints = FacilityStore.getEndpoints();
  // Filter endpoints that home-run to this host or this space
  const servedEndpoints = endpoints.filter(ep => {
    if (ep.homeRunHostId && parsed.hostId && ep.homeRunHostId === parsed.hostId) return true;
    if (ep.homeRunHostName && FacilityStore.normalize(ep.homeRunHostName) === activeRackId) return true;
    return false;
  });

  // Query unenclosed field devices in projectBOM (cameras, radios, readers, sensors) homed to switches in this host or this location
  const assignedSwitches = (typeof projectBOM !== "undefined" && Array.isArray(projectBOM))
    ? projectBOM.filter(i => (i.closetName === activeRackId || i.rackId === activeRackId) && (i.role === "Access" || i.role === "Core" || i.role === "Aggregation" || i.role === "Industrial DIN-Rail Switch")).map(s => s.instanceId)
    : [];

  const bomFieldDevices = (typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) ? projectBOM.filter(dev => {
    if (dev.parentInstanceId) return false;
    if (dev.rackSlot) return false; // In a rack unit or bay, not a field device
    const isHomed = (dev.uplinkTargetId && assignedSwitches.includes(dev.uplinkTargetId)) ||
                    (FacilityStore.normalize(dev.closetName || dev.rackId) === activeRackId);
    return isHomed;
  }) : [];

  const totalDrops = servedEndpoints.length + bomFieldDevices.length;
  if (countBadge) countBadge.innerText = totalDrops.toString();

  // Field cabling rollups
  let totalCompositeCables = 0;
  let totalCat6aDrops = 0;
  let totalFiberRuns = 0;

  servedEndpoints.forEach(ep => {
    if (ep.endpointType === "door_portal") totalCompositeCables++;
    else if (ep.endpointType === "surveillance_point" || ep.endpointType === "wireless_node" || ep.endpointType === "telecom_outlet") totalCat6aDrops++;
    else if (ep.mediaType && ep.mediaType.includes("fiber")) totalFiberRuns++;
  });

  bomFieldDevices.forEach(dev => {
    if (dev.role === "Access Control" || dev.category?.includes("access")) totalCompositeCables += (dev.qty || 1);
    else if (dev.role === "Camera" || dev.role === "Edge Device" || dev.category?.includes("camera")) totalCat6aDrops += (dev.qty || 1);
    else if (dev.category?.includes("wireless") || dev.category?.includes("ptp")) totalCat6aDrops += (dev.qty || 1);
    else if (dev.role === "Optics & DAC" || dev.category?.includes("fiber")) totalFiberRuns += (dev.qty || 1);
  });

  const dropTiles = [];
  if (totalCompositeCables > 0) {
    dropTiles.push(`
      <div class="bg-slate-900 p-2 rounded-lg border border-slate-800">
        <span class="text-slate-400 block text-[9px] uppercase">Composite Banana</span>
        <span class="text-white font-bold">${totalCompositeCables} Run${totalCompositeCables === 1 ? '' : 's'}</span>
      </div>
    `);
  }
  if (totalCat6aDrops > 0) {
    dropTiles.push(`
      <div class="bg-slate-900 p-2 rounded-lg border border-slate-800">
        <span class="text-slate-400 block text-[9px] uppercase">Cat6A Plenum</span>
        <span class="text-white font-bold">${totalCat6aDrops} Drop${totalCat6aDrops === 1 ? '' : 's'}</span>
      </div>
    `);
  }
  if (totalFiberRuns > 0) {
    dropTiles.push(`
      <div class="bg-slate-900 p-2 rounded-lg border border-slate-800">
        <span class="text-slate-400 block text-[9px] uppercase">Fiber Optic</span>
        <span class="text-white font-bold">${totalFiberRuns} Run${totalFiberRuns === 1 ? '' : 's'}</span>
      </div>
    `);
  }

  const dropGridColsClass = dropTiles.length === 1 ? 'grid-cols-1' : (dropTiles.length === 2 ? 'grid-cols-2' : 'grid-cols-3');

  container.innerHTML = `
    <!-- Cabling Rollup Header Strip -->
    <div class="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
      <div class="flex items-center justify-between">
        <span class="text-xs font-bold text-white flex items-center gap-1.5">
          <i data-lucide="network" class="w-3.5 h-3.5 text-indigo-400"></i> Served Field Hardware & Cabling
        </span>
        <span class="text-[10px] font-mono text-emerald-400">${totalDrops} Active Drop${totalDrops === 1 ? '' : 's'}</span>
      </div>
      ${dropTiles.length > 0 ? `
        <div class="grid ${dropGridColsClass} gap-2 text-[11px] font-mono">
          ${dropTiles.join("")}
        </div>
      ` : ''}
    </div>

    <!-- Quick Add Endpoint Button -->
    <div class="flex items-center justify-between pt-1">
      <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Homed Field Devices (${totalDrops})</span>
      <button onclick="promptAddEndpointToActiveHost()" class="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-sm transition-colors">
        <i data-lucide="plus" class="w-3 h-3"></i> Add Drop
      </button>
    </div>

    <!-- Endpoints List (Supports drop targeting) -->
    <div 
      ondragover="handleServedEndpointsDragOver(event)"
      ondragleave="handleServedEndpointsDragLeave(event)"
      ondrop="handleServedEndpointsDrop(event)"
      class="space-y-2 max-h-64 overflow-y-auto pr-1 rounded-xl p-1 border border-transparent transition-all"
    >
      ${totalDrops === 0 ? `
        <div class="border border-dashed border-slate-800 rounded-xl p-4 text-center text-xs text-slate-500 hover:border-indigo-500/50 transition-colors">
          <i data-lucide="network" class="w-5 h-5 mx-auto mb-1 text-slate-600 opacity-60"></i>
          <span>No field drops are currently homed to ${escapeHTML(activeRackId)}.</span>
          <p class="text-[10px] text-slate-500 mt-0.5">Drag cameras, radios, or sensors here to home them to this enclosure.</p>
          <button onclick="promptAddEndpointToActiveHost()" class="mt-2 block mx-auto text-indigo-400 hover:underline text-[11px]">
            + Add Door, Camera, or Outlet
          </button>
        </div>
      ` : `
        <!-- Unenclosed BOM Field Hardware -->
        ${bomFieldDevices.map(dev => {
          const mountMethod = dev.mountMethod ? dev.mountMethod.toUpperCase() : "WALL";
          return `
            <div class="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs hover:border-slate-700 transition-colors group">
              <div class="flex items-center gap-2.5 min-w-0">
                <div class="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-cyan-400 shrink-0">
                  <i data-lucide="camera" class="w-3.5 h-3.5"></i>
                </div>
                <div class="min-w-0">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    ${dev.deviceNumber ? `<span class="px-1.5 py-0.2 rounded bg-brand-900/60 border border-brand-500/40 text-[9px] font-mono font-bold text-brand-300">${escapeHTML(dev.deviceNumber)}</span>` : ''}
                    <span class="font-bold text-white truncate" title="${escapeHTML(dev.friendlyName || dev.model)}">${escapeHTML(dev.friendlyName || dev.model)}</span>
                    <button type="button" onclick="event.stopPropagation(); promptEditDeviceFriendlyName('${dev.instanceId}')" class="text-slate-400 hover:text-white p-0.5 rounded hover:bg-slate-800 transition-colors" title="Edit Friendly Name">
                      <i data-lucide="pencil" class="w-2.5 h-2.5"></i>
                    </button>
                  </div>
                  ${dev.friendlyName && dev.friendlyName !== dev.model ? `<span class="text-[10px] text-slate-300 font-medium block truncate">${escapeHTML(dev.model)}</span>` : ''}
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="text-[9px] font-mono px-1 py-0.2 rounded bg-cyan-950/80 border border-cyan-800 text-cyan-300 font-bold">${mountMethod} MOUNT</span>
                    <span class="text-[10px] text-slate-400 font-mono">${escapeHTML(dev.role || 'Field Device')} &bull; ${dev.consumedPoEWatts || 15}W PoE</span>
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-1 shrink-0">
                <button onclick="jumpToTopologyTarget('node:${dev.instanceId}')" class="p-1 text-slate-400 hover:text-indigo-300 transition-colors" title="Jump to Topology">
                  <i data-lucide="network" class="w-3.5 h-3.5"></i>
                </button>
                <button onclick="jumpToPhysicalLayoutTarget('${dev.instanceId}')" class="p-1 text-slate-400 hover:text-amber-300 transition-colors" title="Jump to Physical Layout">
                  <i data-lucide="map" class="w-3.5 h-3.5"></i>
                </button>
                <button onclick="jumpToBomTarget('${dev.instanceId}')" class="p-1 text-slate-400 hover:text-emerald-300 transition-colors" title="Jump to BOM">
                  <i data-lucide="file-spreadsheet" class="w-3.5 h-3.5"></i>
                </button>
              </div>
            </div>
          `;
        }).join('')}

        <!-- Telecom / Facility Outlets -->
        ${servedEndpoints.map(ep => {
          const typeDef = FacilityStore.ENDPOINT_TYPES[ep.endpointType] || FacilityStore.ENDPOINT_TYPES.door_portal;
          return `
            <div class="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs hover:border-slate-700 transition-colors">
              <div class="flex items-center gap-2.5 min-w-0">
                <div class="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-indigo-400 shrink-0">
                  <i data-lucide="${typeDef.icon || 'circle'}" class="w-3.5 h-3.5"></i>
                </div>
                <div class="min-w-0">
                  <span class="font-bold text-white block truncate">${escapeHTML(ep.name)}</span>
                  <span class="text-[10px] text-slate-400 font-mono block">${typeDef.label} &bull; ${escapeHTML(ep.mediaType || 'Cat6A')}</span>
                </div>
              </div>
              <div class="flex items-center gap-1 shrink-0">
                <button onclick="unlinkEndpointFromHost('${ep.id}')" class="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors" title="Unlink from this host">
                  <i data-lucide="x" class="w-3.5 h-3.5"></i>
                </button>
              </div>
            </div>
          `;
        }).join('')}
      `}
    </div>
  `;
}

function promptAddEndpointToActiveHost() {
  const name = prompt("Enter Endpoint Name (e.g. Door 101 - Main Entrance, Cam-04 Exterior East, AP-12):", "Door 101");
  if (!name || !name.trim()) return;

  const lower = name.toLowerCase();
  let epType = "door_portal";
  if (lower.includes("cam") || lower.includes("cctv")) epType = "surveillance_point";
  else if (lower.includes("ap") || lower.includes("wifi") || lower.includes("wireless")) epType = "wireless_node";
  else if (lower.includes("drop") || lower.includes("outlet") || lower.includes("desk")) epType = "telecom_outlet";

  const parsed = FacilityStore.parse(activeRackId);
  FacilityStore.addEndpoint(name.trim(), epType, parsed.floorId || "floor-1", {
    homeRunHostId: parsed.hostId,
    homeRunHostName: activeRackId
  });

  renderServedEndpoints(parsed, null);
  if (typeof showToast === "function") {
    showToast(`Created & homed ${name.trim()} to ${activeRackId}`);
  }
}

function unlinkEndpointFromHost(endpointId) {
  FacilityStore.updateEndpoint(endpointId, { homeRunHostId: null, homeRunHostName: FacilityStore.UNASSIGNED });
  const parsed = FacilityStore.parse(activeRackId);
  renderServedEndpoints(parsed, null);
  if (typeof showToast === "function") {
    showToast("Unlinked endpoint from this host.");
  }
}

// -----------------------------------------------------------
// Helpers & Utilities
// -----------------------------------------------------------
function getItemPortCount(item) {
  if (item.ports && parseInt(item.ports, 10)) return parseInt(item.ports, 10);
  if (item.portCount && parseInt(item.portCount, 10)) return parseInt(item.portCount, 10);
  const text = `${item.model || ''} ${item.description || ''} ${item.name || ''}`;
  const match = text.match(/(?:^|\b|-)(\d{1,3})\s*(?:port|p\b)/i);
  if (match) return parseInt(match[1], 10);
  return 0;
}

function getDeviceMountPriority(item) {
  const role = (item.role || "").toLowerCase();
  const cat = (item.category || "").toLowerCase();
  const model = (item.model || "").toLowerCase();
  const desc = (item.description || "").toLowerCase();
  const allText = `${role} ${cat} ${model} ${desc}`;

  // 1. ISP Equipment (Carrier Demarc, NID, ISP Modems, ONT)
  if (role.includes("isp") || role.includes("demarc") || role.includes("nid") ||
      cat.includes("isp") || cat.includes("demarc") ||
      allText.includes("isp") || allText.includes("demarc") || allText.includes("nid") ||
      allText.includes("carrier") || allText.includes("modem") || allText.includes("ont")) {
    return { priority: 1, group: "isp", portCount: 0 };
  }

  // 2. Firewalls (Security WAN, NextGen Firewalls, Gateways, Threat Appliances)
  if (role.includes("security wan") || role.includes("firewall") || role.includes("utm") ||
      cat.includes("firewall") || cat.includes("security_appliance") ||
      allText.includes("firewall") || allText.includes("fortigate") || allText.includes("palo alto") ||
      allText.includes("meraki mx") || allText.includes("firepower") || allText.includes("sonicwall") ||
      allText.includes("udm-pro") || allText.includes("udm-se") || allText.includes("gateway")) {
    return { priority: 2, group: "firewall", portCount: 0 };
  }

  // 3. Core Switches
  if (role === "core" || role.includes("core & agg") || role.includes("core switch")) {
    return { priority: 3, group: "core", portCount: getItemPortCount(item) };
  }

  // 4. Aggregation Switches
  if (role.includes("aggregation") || role.includes("distribution") || role === "dist" || role.includes("agg switch")) {
    return { priority: 4, group: "aggregation", portCount: getItemPortCount(item) };
  }

  // 5. Access Switches (ordered descending by port count)
  if (role.includes("access") || cat.includes("switch") || allText.includes("switch")) {
    return { priority: 5, group: "access", portCount: getItemPortCount(item) };
  }

  // 6. Servers & Storage (Compute, NVRs, NAS, SAN, Appliances)
  if (role.includes("server") || role.includes("storage") || role.includes("nvr") || role.includes("compute") ||
      cat.includes("server") || cat.includes("storage") || cat.includes("nvr") ||
      allText.includes("server") || allText.includes("poweredge") || allText.includes("proliant") ||
      allText.includes("nvr") || allText.includes("storage") || allText.includes("nas")) {
    return { priority: 6, group: "server", portCount: 0 };
  }

  // 7. UPSes & Battery Units (Uninterruptible Power Supplies, battery backups placed at rack bottom U1+)
  if (role.includes("ups") || role.includes("power") || role.includes("battery") ||
      cat.includes("ups") || cat.includes("power") ||
      allText.includes("ups") || allText.includes("smart-ups") || allText.includes("battery") ||
      allText.includes("apc") || allText.includes("vertiv") || allText.includes("cyberpower") ||
      allText.includes("tripp lite") || allText.includes("eaton")) {
    return { priority: 7, group: "ups", portCount: 0 };
  }

  // 8. Other / Structured Cabling / Patch Panels / Accessories
  return { priority: 8, group: "other", portCount: getItemPortCount(item) };
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

function findNextAvailableSlotFromTop(slots, heightU, maxU) {
  for (let u = maxU - heightU + 1; u >= 1; u--) {
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
    case "Access Control":
      return "text-emerald-300";
    case "Surveillance":
    case "Video":
      return "text-sky-400";
    case "Wireless Bridge":
      return "text-cyan-400";
    default:
      return "text-slate-300";
  }
}

if (typeof window !== "undefined" && typeof window.escapeHTML !== "function") {
  window.escapeHTML = function(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };
}
var escapeHTML = (typeof window !== "undefined" && typeof window.escapeHTML === "function") ? window.escapeHTML : function(str) { return String(str || ''); };

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
    const parsed = FacilityStore.parse(activeRackId);
    const enclosures = FacilityStore.getEnclosures();
    const enc = enclosures.find(e => e.id === parsed.hostId) || enclosures.find(e => e.name.toLowerCase() === (parsed.hostName || '').toLowerCase());
    if (enc && enc.heightU && enc.hostType === "equipment_rack") {
      activeRackHeight = enc.heightU;
      return;
    }
    const val = localStorage.getItem(`netselect_rack_height_${projKey}_${activeRackId}`);
    activeRackHeight = val ? parseInt(val, 10) : 24;
  } catch (e) {
    activeRackHeight = 24;
  }
}

function addPassiveToActiveRack(type) {
  if (typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) return;
  const parsed = FacilityStore.parse(activeRackId);
  const targetLoc = activeRackId;

  let itemData = null;
  if (type === "pp24") {
    itemData = {
      sku: "PP-1U-24P-MOD",
      model: "1U 24-Port High-Density Modular Keystone Patch Panel",
      vendor: "Panduit",
      msrp: 68,
      rackUnits: 1,
      ports: 24,
      role: "Structured Cabling",
      weightLbs: 2.5
    };
  } else if (type === "pp48") {
    itemData = {
      sku: "PP-2U-48P-MOD",
      model: "2U 48-Port High-Density Modular Keystone Patch Panel",
      vendor: "Panduit",
      msrp: 115,
      rackUnits: 2,
      ports: 48,
      role: "Structured Cabling",
      weightLbs: 4.5
    };
  } else if (type === "hcm1u") {
    itemData = {
      sku: "HCM-1U",
      model: "1U Horizontal Cable Manager with Dual-Hinged Cover",
      vendor: "Panduit",
      msrp: 45,
      rackUnits: 1,
      ports: 0,
      role: "Structured Cabling",
      weightLbs: 2.0
    };
  } else if (type === "blank1u") {
    itemData = {
      sku: "PP-BLANK-1U",
      model: "1U Metal Snap-in Blank Filler Panel",
      vendor: "Panduit",
      msrp: 18,
      rackUnits: 1,
      ports: 0,
      role: "Structured Cabling",
      weightLbs: 1.0
    };
  }

  if (!itemData) return;

  const instanceId = `passive-${itemData.sku}-${Date.now()}`;
  const newItem = {
    instanceId: instanceId,
    id: itemData.sku,
    model: itemData.model,
    sku: itemData.sku,
    role: itemData.role,
    vendor: itemData.vendor,
    msrp: itemData.msrp,
    ports: itemData.ports,
    poeBudget: 0,
    baseWatts: 0,
    rackUnits: itemData.rackUnits,
    weightLbs: itemData.weightLbs,
    qty: 1,
    closetName: targetLoc,
    rackId: targetLoc,
    rackSlot: null,
    isPassive: true,
    deviceNumber: null,
    friendlyName: null,
    customFriendlyName: null
  };

  projectBOM.push(newItem);

  // Auto-mount into first free slot
  if (typeof mountItemToFirstAvailableSlot === "function") {
    mountItemToFirstAvailableSlot(instanceId);
  }

  if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
    FacilityStore.notifyWorkspaceChange();
  }
  renderRackVisualizer();
  if (typeof updateBOMView === "function") updateBOMView();
  if (typeof StorageService !== "undefined" && typeof StorageService.queueAutoSave === "function") {
    StorageService.queueAutoSave();
  }
  if (typeof showToast === "function") {
    showToast(`Added ${itemData.model} to ${parsed.space} • ${parsed.enclosure}`);
  }
}

// Window Compatibility Exports
if (typeof window !== "undefined") {
  window.isRackModalVisible = isRackModalVisible;
  window.toggleRackModal = toggleRackModal;
  window.switchActiveRackElevation = switchActiveRackElevation;
  window.renderRackVisualizer = renderRackVisualizer;
  window.renderRackLocationTransferBar = renderRackLocationTransferBar;
  window.handleLocationTransferDragOver = handleLocationTransferDragOver;
  window.handleLocationTransferDragLeave = handleLocationTransferDragLeave;
  window.handleLocationTransferDrop = handleLocationTransferDrop;
  window.handleRackItemDragStart = handleRackItemDragStart;
  window.handleRackSlotDragOver = handleRackSlotDragOver;
  window.handleRackSlotDrop = handleRackSlotDrop;
  window.handleBaySlotDrop = handleBaySlotDrop;
  window.handleDinRailDrop = handleDinRailDrop;
  window.handlePoleZoneDrop = handlePoleZoneDrop;
  window.handleBackboardQuadDrop = handleBackboardQuadDrop;
  window.unmountRackItem = unmountRackItem;
  window.autoMountAllToActiveRack = autoMountAllToActiveRack;
  window.unmountAllFromActiveRack = unmountAllFromActiveRack;
  window.promptCreateNewRack = promptCreateNewRack;
  window.deleteActiveRackElevation = deleteActiveRackElevation;
  window.setHostSidebarTab = setHostSidebarTab;
  window.updatePoleZoneHeight = updatePoleZoneHeight;
  window.renderRackUnassignedStagingDock = renderRackUnassignedStagingDock;
  window.renderHostStagingDrawer = renderHostStagingDrawer;
  window.mountItemToFirstAvailableSlot = mountItemToFirstAvailableSlot;
  window.addPassiveToActiveRack = addPassiveToActiveRack;
  window.toggleStackPatchPanel = toggleStackPatchPanel;
  window.toggleStackCableManager = toggleStackCableManager;
  window.toggleSwitchStandardPod = toggleSwitchStandardPod;
  window.toggleFiberFirewallCableManager = toggleFiberFirewallCableManager;
  window.applyStandardPodsToActiveRack = applyStandardPodsToActiveRack;
  window.isCopperSwitch = isCopperSwitch;
  window.isFiberSwitch = isFiberSwitch;
  window.isFirewallDevice = isFirewallDevice;
  window.isFiberOrFirewall = isFiberOrFirewall;
  window.getRackItemHeight = getRackItemHeight;
  window.updateSwitchStackFromRack = updateSwitchStackFromRack;
  window.isStackableSwitch = isStackableSwitch;
  window.calculateRackBumpDisplacements = calculateRackBumpDisplacements;
  window.isPassiveInfrastructure = isPassiveInfrastructure;
  window.toggleRackVerticalChannelsModal = toggleRackVerticalChannelsModal;
  window.closeRackVerticalChannelsModal = closeRackVerticalChannelsModal;
  window.openRackVerticalSlotPicker = openRackVerticalSlotPicker;
  window.applyRackVerticalPreset = applyRackVerticalPreset;
  window.getRackVerticalChannels = getRackVerticalChannels;
  window.setRackVerticalChannel = setRackVerticalChannel;
  window.setRackVerticalChannels = setRackVerticalChannels;
}