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

var escapeHTML = (typeof window !== "undefined" && typeof window.escapeHTML === "function")
  ? window.escapeHTML
  : function(str) {
      if (str === null || str === undefined) return "";
      return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    };

let activeRackId = "MDF • Rack-1";
let activeRackHeight = 24;
let activeHostTab = "telemetry"; // "telemetry" | "endpoints"
let rackViewOrientation = "front"; // "front" | "rear"
let draggedRackItemInstanceId = null;
let showRackPatchJumpers = true;
window.showRackPatchJumpers = true;
let rackSidebarCollapsed = false;
window.rackAccordionOpenState = {
  electrical: true,
  pdu: false,
  ups: false,
  structural: false,
  passive: true
};

function toggleRackSidebarDrawer() {
  rackSidebarCollapsed = !rackSidebarCollapsed;
  const pane = document.getElementById("rackRightSidePane");
  const btn = document.getElementById("btnToggleRackSidebar");
  if (pane) {
    if (rackSidebarCollapsed) {
      pane.classList.add("hidden");
    } else {
      pane.classList.remove("hidden");
    }
  }
  if (btn) {
    btn.innerHTML = rackSidebarCollapsed
      ? `<i data-lucide="panel-right-open" class="w-3.5 h-3.5 text-indigo-400"></i><span id="lblToggleRackSidebar" class="hidden sm:inline">Show Pane</span>`
      : `<i data-lucide="panel-right-close" class="w-3.5 h-3.5 text-indigo-400"></i><span id="lblToggleRackSidebar" class="hidden sm:inline">Hide Pane</span>`;
  }
  if (window.lucide) lucide.createIcons();
}
window.toggleRackSidebarDrawer = toggleRackSidebarDrawer;

function toggleRackAccordionSection(sectionKey, isOpen) {
  if (!window.rackAccordionOpenState) window.rackAccordionOpenState = {};
  window.rackAccordionOpenState[sectionKey] = Boolean(isOpen);
}
window.toggleRackAccordionSection = toggleRackAccordionSection;

function toggleAllRackTelemetryAccordions() {
  if (!window.rackAccordionOpenState) window.rackAccordionOpenState = {};
  const keys = ["electrical", "pdu", "ups", "structural", "passive"];
  const anyClosed = keys.some(k => !window.rackAccordionOpenState[k]);
  keys.forEach(k => {
    window.rackAccordionOpenState[k] = anyClosed;
  });
  renderRackVisualizer();
}
window.toggleAllRackTelemetryAccordions = toggleAllRackTelemetryAccordions;

function toggleRackPatchJumpers() {
  showRackPatchJumpers = !showRackPatchJumpers;
  window.showRackPatchJumpers = showRackPatchJumpers;
  const btn = document.getElementById("btnRackPatchJumpers");
  if (btn) {
    if (showRackPatchJumpers) {
      btn.className = "px-2 py-0.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-600/70 text-cyan-300 font-bold text-[11px] rounded-lg flex items-center gap-1 shadow-sm transition-all cursor-pointer";
      btn.innerHTML = `<i data-lucide="git-commit" class="w-3 h-3 text-cyan-400"></i> <span>Patch Cords: ON</span>`;
    } else {
      btn.className = "px-2 py-0.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-[11px] rounded-lg flex items-center gap-1 transition-all cursor-pointer";
      btn.innerHTML = `<i data-lucide="git-commit" class="w-3 h-3 text-slate-500"></i> <span>Patch Cords: OFF</span>`;
    }
  }
  renderRackVisualizer();
  if (window.lucide) lucide.createIcons();
}
window.toggleRackPatchJumpers = toggleRackPatchJumpers;

/**
 * Renders an interactive, data-driven 24-Keystone Patch Panel row and paired Switch row
 * with live PortEngine occupancy, end-to-end trace tooltips, and 1-click Port Matrix navigation.
 */
function renderInteractiveRackKeystoneStripHTML(switchInstanceId, jacksArray, deck, patchMapping, stripOpts = {}) {
  const renderBlock = (slice) => slice.map(j => {
    const p = j.port;
    const isOccupied = Boolean(p && p.connectedDeviceId);
    const isPoe = Boolean(isOccupied && (p.poeOutputWatts || 0) > 0);
    const devLabel = j.device
      ? `${j.device.deviceNumber ? j.device.deviceNumber + ' • ' : ''}${j.device.friendlyName || j.device.model}`
      : (p?.connectedDeviceModel || "Unassigned / Spare");
    const portNum = p ? p.portNumber : j.jackNumber;
    const unitPort = p ? (p.unitPortNumber || p.portNumber) : j.jackNumber;
    const pm = (p && patchMapping?.byPortNumber?.[p.portNumber]) ? patchMapping.byPortNumber[p.portNumber] : null;
    const keystoneTag = j.fullTag || (pm ? `${pm.patchPanelId}:${pm.keystoneJackLabel}` : `Keystone ${j.jackLabel}`);
    const cableRunTag = pm && pm.horizontalCableId ? `Cable ${pm.horizontalCableId} • ` : "";
    const swPortTag = pm && pm.switchPortTag ? pm.switchPortTag : `Switch Port ${unitPort}`;

    let dotState = "";
    let cordState = "";
    if (isOccupied) {
      if (isPoe) {
        dotState = "occupied-poe";
        cordState = "poe";
      } else {
        dotState = "occupied-data";
        cordState = "data";
      }
    }

    const cordDesc = pm?.patchCordSpec || '6" Slim Cat6A';
    const tooltip = isOccupied
      ? `${keystoneTag} ⟷ ${cordDesc} ⟷ ${swPortTag} • ${cableRunTag}${devLabel}${isPoe ? ` (${p.poeOutputWatts}W PoE)` : ''} — Click to trace in Port Studio`
      : `${keystoneTag} (Open) ⟷ ${cordDesc} ⟷ Mapped to ${swPortTag} — Click to assign in Port Studio`;

    return `
      <button
        type="button"
        onclick="event.stopPropagation(); openPortMatrixStudio('${switchInstanceId}', ${portNum})"
        class="rack-kp-btn"
        title="${escapeHTML(tooltip)}"
      >
        ${showRackPatchJumpers && deck === "lower" ? `<span class="rack-kp-cord ${cordState}"></span>` : ''}
        <span class="rack-kp-dot ${dotState}">${j.jackNumber}</span>
        ${showRackPatchJumpers && deck === "upper" ? `<span class="rack-kp-cord ${cordState}"></span>` : ''}
      </button>
    `;
  }).join("");

  const renderRow = (rowJacks, showCordDown, showCordUp) => {
    const first12 = rowJacks.slice(0, 12);
    const second12 = rowJacks.slice(12, 24);
    const renderBlockForRow = (slice) => slice.map(j => {
      const p = j.port;
      const isOccupied = Boolean(p && p.connectedDeviceId);
      const isPoe = Boolean(isOccupied && (p.poeOutputWatts || 0) > 0);
      const devLabel = j.device
        ? `${j.device.deviceNumber ? j.device.deviceNumber + ' • ' : ''}${j.device.friendlyName || j.device.model}`
        : (p?.connectedDeviceModel || "Unassigned / Spare");
      const portNum = p ? p.portNumber : j.jackNumber;
      const unitPort = p ? (p.unitPortNumber || p.portNumber) : j.jackNumber;
      const pm = (p && patchMapping?.byPortNumber?.[p.portNumber]) ? patchMapping.byPortNumber[p.portNumber] : null;
      const keystoneTag = j.fullTag || (pm ? `${pm.patchPanelId}:${pm.keystoneJackLabel}` : `Keystone ${j.jackLabel}`);
      const cableRunTag = pm && pm.horizontalCableId ? `Cable ${pm.horizontalCableId} • ` : "";
      const swPortTag = pm && pm.switchPortTag ? pm.switchPortTag : `Switch Port ${unitPort}`;
      const dotState = isOccupied ? (isPoe ? "occupied-poe" : "occupied-data") : "";
      const cordState = isOccupied ? (isPoe ? "poe" : "data") : "";
      const cordDesc = pm?.patchCordSpec || '6" Slim Cat6A';
      const tooltip = isOccupied
        ? `${keystoneTag} ⟷ ${cordDesc} ⟷ ${swPortTag} • ${cableRunTag}${devLabel}${isPoe ? ` (${p.poeOutputWatts}W PoE)` : ''} — Click to trace in Port Studio`
        : `${keystoneTag} (Open) ⟷ ${cordDesc} ⟷ Mapped to ${swPortTag} — Click to assign in Port Studio`;
      return `
        <button
          type="button"
          onclick="event.stopPropagation(); openPortMatrixStudio('${switchInstanceId}', ${portNum})"
          class="rack-kp-btn"
          title="${escapeHTML(tooltip)}"
        >
          ${showRackPatchJumpers && showCordUp ? `<span class="rack-kp-cord ${cordState}"></span>` : ''}
          <span class="rack-kp-dot ${dotState}">${j.jackNumber}</span>
          ${showRackPatchJumpers && showCordDown ? `<span class="rack-kp-cord ${cordState}"></span>` : ''}
        </button>
      `;
    }).join("");

    return `
      <div class="rack-kp-strip">
        <div class="rack-kp-group">${renderBlockForRow(first12)}</div>
        <span class="w-1 h-2.5 bg-purple-900/40 rounded-full"></span>
        <div class="rack-kp-group">${renderBlockForRow(second12)}</div>
      </div>
    `;
  };

  if (jacksArray.length > 24) {
    const top24 = jacksArray.slice(0, 24);
    const bot24 = jacksArray.slice(24, 48);
    if (deck === "between") {
      // Shared In-Between 48P Panel: Top 24 jacks patch UP to upper switch (Ports 25-48), Bottom 24 jacks patch DOWN to lower switch (Ports 1-24)
      return `
        <div class="flex flex-col gap-0.5 items-end">
          ${renderRow(top24, false, true)}
          ${renderRow(bot24, true, false)}
        </div>
      `;
    }
    return `
      <div class="flex flex-col gap-0.5 items-end">
        ${renderRow(top24, false, deck === "lower")}
        ${renderRow(bot24, deck === "upper" || deck === "single", false)}
      </div>
    `;
  }

  if (stripOpts && stripOpts.isOffset48Frame) {
    // Half-populated 1U 48-Port Modular Frame (2x12 active jacks on Left or Right half + 24 blank modular slots on opposite half)
    const side = stripOpts.populatedSide === "right" ? "right" : "left";
    const top12 = jacksArray.slice(0, 12);
    const bot12 = jacksArray.slice(12, 24);
    const blankHalfHtml = `<span class="px-1.5 py-0.5 rounded bg-slate-900/90 border border-dashed border-slate-700/70 text-[8px] font-mono text-slate-500 select-none" title="24 Unpopulated Modular Keystone Slots (Spare Expansion Capacity)">24× Blank Slots</span>`;
    const activeHalfHtml = `
      <div class="flex flex-col gap-0.5">
        <div class="rack-kp-group">${renderBlock(top12)}</div>
        <div class="rack-kp-group">${renderBlock(bot12)}</div>
      </div>
    `;
    return `
      <div class="flex items-center gap-1.5">
        ${side === "left" ? `${activeHalfHtml}${blankHalfHtml}` : `${blankHalfHtml}${activeHalfHtml}`}
      </div>
    `;
  }

  return renderRow(jacksArray, deck === "upper" || deck === "single", deck === "lower");
}

function renderInteractiveRackSwitchFaceplateHTML(switchItem, unitNum, patchData) {
  const ports = (typeof PortEngine !== "undefined") ? PortEngine.initSwitchPorts(switchItem) : [];
  const unitPorts = ports.filter(p => (p.unitIndex || 1) === unitNum);
  const copperPorts = unitPorts.filter(p => !p.isUplink && p.role !== "uplink" && p.role !== "stack_interconnect" && String(p.connector || "RJ-45").includes("RJ"));
  const uplinkPorts = unitPorts.filter(p => p.isUplink || p.role === "uplink" || p.role === "stack_interconnect");
  const is48P = copperPorts.length > 24;

  const renderPortDot = (p) => {
    const isOccupied = Boolean(p.connectedDeviceId);
    const isPoe = Boolean(isOccupied && (p.poeOutputWatts || 0) > 0);
    const isStack = p.role === "stack_interconnect";
    const isUplink = p.isUplink || p.role === "uplink";
    const pm = patchData?.byPortNumber?.[p.portNumber];
    const patchCoord = pm ? pm.fullPatchCoordinate : "";

    let stateCls = "";
    if (isStack) {
      stateCls = "stack";
    } else if (isUplink && isOccupied) {
      stateCls = "uplink-active";
    } else if (isUplink) {
      stateCls = "uplink-idle";
    } else if (isOccupied && isPoe) {
      stateCls = "poe";
    } else if (isOccupied) {
      stateCls = "data";
    }

    const title = isOccupied
      ? `Switch Port ${p.unitPortNumber || p.portNumber}${patchCoord ? ` ⟷ ${patchCoord}` : ''} ⟷ ${p.connectedDeviceModel || 'Connected Device'}${isPoe ? ` (${p.poeOutputWatts}W PoE)` : ''} — Click to open Port Studio`
      : `Switch Port ${p.unitPortNumber || p.portNumber} (${p.speed || '1G'}${p.poeStandard ? ' PoE' : ''})${patchCoord ? ` ⟷ ${patchCoord}` : ''} — Available`;

    return `
      <button
        type="button"
        onclick="event.stopPropagation(); openPortMatrixStudio('${switchItem.instanceId}', ${p.portNumber})"
        class="rack-sw-dot ${stateCls}"
        title="${escapeHTML(title)}"
      ></button>
    `;
  };

  if (copperPorts.length === 0 && uplinkPorts.length > 0) {
    // All-optical switch faceplate
    return `
      <div class="rack-sw-strip">
        <div class="rack-sw-row flex-wrap">
          ${uplinkPorts.slice(0, 24).map(renderPortDot).join("")}
        </div>
      </div>
    `;
  }

  const topRow = is48P ? copperPorts.slice(0, 24) : copperPorts.slice(0, 12);
  const botRow = is48P ? copperPorts.slice(24, 48) : copperPorts.slice(12, 24);
  const offset24 = (!is48P && typeof resolveSwitch24PortOffset === "function")
    ? resolveSwitch24PortOffset(switchItem)
    : null;
  const offsetSide = offset24?.is24Class ? offset24.side : "full";

  return `
    <div class="rack-sw-strip">
      ${offsetSide === "right" ? `
        <span class="px-1 py-0.5 mr-1.5 rounded bg-cyan-950/90 border border-cyan-700/50 text-[7.5px] font-mono font-bold text-cyan-300 leading-none select-none" title="Left LCM Touchscreen &amp; Chassis Bezel — 24 RJ-45 Copper Ports Offset Right">LCM</span>
      ` : ''}
      <div class="rack-sw-rows" title="${offset24?.is24Class ? escapeHTML(offset24.description) : '48-Port Full-Width Copper Matrix'}">
        <div class="rack-sw-row">
          ${topRow.slice(0, 12).map(renderPortDot).join("")}
          ${topRow.length > 12 ? `<span class="w-1"></span>${topRow.slice(12, 24).map(renderPortDot).join("")}` : ''}
        </div>
        ${botRow.length > 0 ? `
          <div class="rack-sw-row">
            ${botRow.slice(0, 12).map(renderPortDot).join("")}
            ${botRow.length > 12 ? `<span class="w-1"></span>${botRow.slice(12, 24).map(renderPortDot).join("")}` : ''}
          </div>
        ` : ''}
      </div>
      ${offsetSide === "left" ? `
        <span class="w-5 sm:w-8 h-3 mx-1 rounded-sm bg-slate-950/80 border border-dashed border-slate-700/70 flex items-center justify-center text-[7px] font-mono text-slate-500 select-none" title="Left-Offset 2×12 Copper Block — Right Chassis Bezel Space">2×12L</span>
      ` : ''}
      ${uplinkPorts.length > 0 ? `
        <div class="pl-1.5 border-l border-slate-800 rack-sw-row" title="Optical Uplink / Stack Cages">
          ${uplinkPorts.map(renderPortDot).join("")}
        </div>
      ` : ''}
    </div>
  `;
}

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
      const itemHeight = getRackItemHeight(item);
      if (itemHeight <= 0) return; // 0U accessories or DIN devices do not consume vertical rack rail slots
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
      const itemHeight = getRackItemHeight(item);
      if (itemHeight <= 0) return;
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

function clearRackPodAdjacentRoles(hostLoc) {
  if (typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) return;
  const normTarget = hostLoc ? FacilityStore.normalize(hostLoc) : null;
  projectBOM.forEach(sw => {
    if (!sw || sw.parentInstanceId || !sw.podAdjacentRole) return;
    const swLoc = FacilityStore.normalize(sw.closetName || sw.rackId);
    if (!normTarget || swLoc === normTarget || swLoc === FacilityStore.UNASSIGNED) {
      delete sw.podAdjacentRole;
      if (sw.standardPod && typeof applyStandardPodCabling === "function") {
        applyStandardPodCabling(sw);
      }
    }
  });
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

  clearRackPodAdjacentRoles(activeRackId);
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
    const prevHost = item.closetName || item.rackId;
    item.rackSlot = null;
    item.closetName = FacilityStore.UNASSIGNED;
    item.rackId = FacilityStore.UNASSIGNED;
    clearRackPodAdjacentRoles(prevHost);
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

  container.innerHTML = `
    <div class="px-3 py-1.5 bg-slate-950/80 border border-slate-800/90 rounded-xl flex items-center justify-between gap-2 flex-wrap">
      <div class="flex items-center gap-2 flex-1 min-w-[240px]">
        <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 shrink-0">
          <i data-lucide="map-pin" class="w-3 h-3 text-indigo-400"></i>
          <span>Active Host:</span>
        </span>
        <select 
          id="rackLocationSearchSelect" 
          onchange="switchActiveRackElevation(this.value)" 
          class="flex-1 max-w-md bg-slate-900 border border-slate-700 hover:border-indigo-500 text-indigo-300 font-bold rounded-lg px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none cursor-pointer font-mono"
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

      <div class="flex items-center gap-1.5 shrink-0">
        <div 
          id="locationTransferDropTarget"
          class="px-2.5 py-1 rounded-lg border border-dashed border-indigo-500/50 bg-indigo-950/30 hover:bg-indigo-900/50 text-indigo-300 text-[11px] font-semibold flex items-center gap-1 transition-all select-none cursor-copy"
          title="Drag any equipment here to transfer into active location (${escapeHTML(activeNorm)})"
          ondragover="handleLocationTransferDragOver(event)"
          ondragleave="handleLocationTransferDragLeave(event)"
          ondrop="handleLocationTransferDrop(event, activeRackId)"
        >
          <i data-lucide="arrow-down-to-dot" class="w-3 h-3 text-indigo-400"></i>
          <span class="hidden sm:inline">Drop to Transfer Here</span>
        </div>

        <div 
          class="px-2.5 py-1 rounded-lg bg-amber-950/25 hover:bg-amber-950/50 border border-dashed border-amber-600/50 text-amber-300 text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer select-none"
          title="Drag equipment here to unmount and return to Unassigned shelf"
          ondragover="handleLocationTransferDragOver(event)"
          ondragleave="handleLocationTransferDragLeave(event)"
          ondrop="handleLocationTransferDrop(event, 'Unassigned')"
        >
          <i data-lucide="inbox" class="w-3 h-3 text-amber-400"></i>
          <span>Staging</span>
          <span class="text-[9.5px] font-mono px-1.5 py-0.2 rounded bg-amber-900/60 text-amber-200 font-bold">${unassignedCount}</span>
        </div>
      </div>
    </div>
  `;
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
  const depth = activeEnc.depthInches || (hostType === "equipment_rack" ? 42 : 12);
  const inBOM = (typeof FacilityStore !== "undefined" && typeof FacilityStore.isEnclosureInBOM === "function")
    ? FacilityStore.isEnclosureInBOM(activeEnc.id)
    : Boolean(activeEnc.inBOM);

  let formFactorBadge = "";
  if (hostType === "equipment_rack") {
    formFactorBadge = `${activeEnc.heightU || activeRackHeight || 24}U EIA`;
  } else if (hostType === "security_cabinet") {
    formFactorBadge = `${activeEnc.subplateBays || 8}-Bay Subplate`;
  } else if (hostType === "industrial_din") {
    formFactorBadge = `${activeEnc.dinRails || 2}x DIN (NEMA 4X)`;
  } else if (hostType === "architectural_backboard") {
    formFactorBadge = `${activeEnc.widthFt || 4}'x${activeEnc.heightFt || 8}' Plywood`;
  } else {
    formFactorBadge = "Structural Mount";
  }

  let optionsHtml = "";
  if (catalogRacks.length > 0) {
    optionsHtml = catalogRacks.map(r => {
      const isSelected = r.sku === sku || (r.sku && sku && r.sku.toLowerCase() === sku.toLowerCase());
      return `<option value="${escapeHTML(r.sku)}" ${isSelected ? 'selected' : ''}>${escapeHTML(r.vendor)} ${escapeHTML(r.sku)} - ${escapeHTML(r.model)} ($${(r.msrp || 0).toLocaleString()})</option>`;
    }).join('');
  }

  const matchInList = catalogRacks.some(r => r.sku === sku);
  if (!matchInList && sku) {
    optionsHtml = `<option value="${escapeHTML(sku)}" selected>${escapeHTML(vendor)} ${escapeHTML(sku)} (Custom Model)</option>` + optionsHtml;
  }

  container.innerHTML = `
    <div class="bg-slate-950/90 border border-slate-800 rounded-xl px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 select-none">
      <div class="flex items-center gap-2 min-w-0">
        <span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-700/60 shrink-0">
          ${escapeHTML(vendor)} &bull; ${escapeHTML(sku)}
        </span>
        <span class="text-xs font-bold text-slate-200 truncate max-w-[260px]" title="${escapeHTML(model)}">
          ${escapeHTML(model)}
        </span>
        <span class="px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300 font-semibold hidden md:inline">${formFactorBadge}</span>
        ${depth ? `<span class="px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-cyan-300 font-semibold hidden md:inline">${depth}"D</span>` : ''}
        <span class="px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-emerald-300 font-semibold hidden lg:inline">${maxWeight.toLocaleString()} lbs</span>
      </div>

      <div class="flex items-center gap-2 ml-auto">
        <select 
          id="enclosureModelSelect" 
          onchange="window.handleEnclosureHardwareChange('${activeEnc.id}', this.value)"
          class="bg-slate-900 border border-slate-700 hover:border-indigo-500 text-slate-200 text-[11px] rounded-lg px-2 py-1 font-medium focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer max-w-[220px] truncate"
          title="Select physical enclosure hardware from catalog"
        >
          ${optionsHtml}
        </select>
        <span class="text-[11px] font-mono font-bold text-emerald-400 px-1.5">$${msrp.toLocaleString()}</span>
        <button 
          type="button"
          onclick="window.toggleEnclosureBOM('${activeEnc.id}')"
          class="px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${inBOM ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white border border-slate-700'}"
          title="${inBOM ? 'Physical enclosure included in Project BOM Quote. Click to remove.' : 'Click to include physical enclosure frame in Project BOM & Quote'}"
        >
          <i data-lucide="${inBOM ? 'check' : 'plus'}" class="w-3 h-3"></i>
          <span>${inBOM ? 'In Quote' : '+ Quote'}</span>
        </button>
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
      frontBtn.className = "px-2 py-0.5 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 bg-indigo-600 text-white shadow-sm";
      rearBtn.className = "px-2 py-0.5 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 text-slate-400 hover:text-white";
    } else {
      frontBtn.className = "px-2 py-0.5 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 text-slate-400 hover:text-white";
      rearBtn.className = "px-2 py-0.5 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 bg-indigo-600 text-white shadow-sm";
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
      <span>${escapeHTML(activeRackId)} &bull; <span class="text-indigo-400 font-mono">${orientLabel}</span></span>
    `;
  }

  renderEnclosureHardwareBar(activeEnc, parsed);
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
    const baseRU = (item.rackUnits !== undefined && itRackUnits(item)) ? itRackUnits(item) : 1;
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

function itRackUnits(item) {
  return (item.rackUnits !== undefined && item.rackUnits !== null) ? (parseInt(item.rackUnits, 10) || 1) : 1;
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

function getRackSwitchPatchPanelMeta(it) {
  if (typeof window !== "undefined" && typeof window.resolveSwitchPatchPanelConfig === "function") {
    return window.resolveSwitchPatchPanelConfig(it);
  }
  const rawPorts = parseInt(it?.ports, 10) || 24;
  const copperPorts = rawPorts === 52 ? 48 : (rawPorts === 28 ? 24 : (rawPorts > 48 ? 48 : rawPorts));
  const isDual24 = it?.patchPanelSku === "DUAL-24P";
  const is2U48 = it?.patchPanelSku === "PP-2U-48P-MOD";
  const is1U24 = it?.patchPanelSku === "PP-1U-24P-MOD";
  const is48 = !isDual24 && !is1U24 && (is2U48 || it?.patchPanelSku === "PP-1U-48P-MOD" || copperPorts > 24);
  const rackUnits = is2U48 ? 2 : 1;
  const ports = isDual24 ? 24 : (is48 ? 48 : 24);
  const sku = isDual24 ? "PP-1U-24P-MOD" : (is2U48 ? "PP-2U-48P-MOD" : (is48 ? "PP-1U-48P-MOD" : "PP-1U-24P-MOD"));
  const shortLabel = isDual24 ? "2x24P" : (is2U48 ? "2U 48P" : (is48 ? "48P" : "24P"));
  const model = is2U48
    ? "2U 48-Port High-Density Modular Keystone Patch Panel"
    : (is48
      ? "1U 48-Port High-Density Modular Keystone Patch Panel"
      : "1U 24-Port High-Density Modular Keystone Patch Panel");
  return {
    sku,
    model,
    ports,
    rackUnits,
    panelsPerSwitch: isDual24 ? 2 : 1,
    isDual24,
    is48,
    shortLabel,
    copperPorts
  };
}

function getRackItemHeight(it) {
  if (!it) return 1;
  const isZeroU = (it.rackUnits !== undefined && it.rackUnits !== null && parseInt(it.rackUnits, 10) === 0) || it.isDinMounted || (it.mounting && it.mounting.toLowerCase() === "din");
  if (isZeroU) return 0;
  const stack = (it.stackedUnits && it.stackedUnits >= 2) ? it.stackedUnits : 1;
  const baseRU = (it.rackUnits !== undefined && it.rackUnits !== null) ? (parseInt(it.rackUnits, 10) || 0) : 1;
  const ppMeta = getRackSwitchPatchPanelMeta(it);

  if (it.standardPod) {
    if (ppMeta.isSandwich48) {
      // 48P Sandwich Pod: 2x 1U 24P Outer Caps (above top & below bottom) + (N-1)x 1U 48P Panels In-Between
      const outerU = ppMeta.outer24Count !== undefined ? ppMeta.outer24Count : 2;
      const innerU = (ppMeta.inner48Count !== undefined ? ppMeta.inner48Count : Math.max(0, stack - 1)) * (ppMeta.betweenRackUnits || 1);
      return (baseRU * stack) + outerU + innerU;
    }
    const podPanelU = ppMeta.isDual24 ? 2 : ppMeta.rackUnits;
    return (baseRU * stack) + (podPanelU * stack);
  }

  const hasPP = (stack >= 2 && !!it.patchPanelBetween);
  const hasHCM = (stack >= 2 && !!it.cableManagerBetween);
  const interleave = hasPP ? (ppMeta.rackUnits * (stack - 1)) : (hasHCM ? (stack - 1) : 0);
  return (baseRU * stack) + interleave;
}

function renderEquipmentRackFrontFrame(frame, assignedItems, slots, maxU, activeEnc) {
  let railHTML = "";

  // Ensure PortEngine is synced so rack faceplates and patch panels reflect real-time port occupancy
  if (typeof PortEngine !== "undefined" && typeof PortEngine.syncAllSwitchPorts === "function") {
    PortEngine.syncAllSwitchPorts();
  }

  for (let u = maxU; u >= 1; u--) {
    const slotData = slots[u];

    if (slotData) {
      if (slotData.isBase) {
        const it = slotData.item;
        const compat = checkDeviceHostCompatibility(it, "equipment_rack");
        const stackUnits = (it.stackedUnits && it.stackedUnits >= 2) ? it.stackedUnits : 1;
        const isSwitch = isStackableSwitch(it);
        const isCopper = isCopperSwitch(it);
        const isFirewall = isFirewallDevice(it);
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

        // Live Port & Patch Panel telemetry for switches/firewalls
        const portSummary = (isSwitch || isFirewall) && typeof PortEngine !== "undefined"
          ? PortEngine.getPortSummary(it)
          : null;
        const patchMapping = (isSwitch || isFirewall) && typeof PortEngine !== "undefined"
          ? PortEngine.resolveSwitchPatchMapping(it)
          : null;
        const ppMeta = getRackSwitchPatchPanelMeta(it);

        railHTML += `
          <div 
            class="group relative bg-slate-900 border ${compat.compatible ? 'border-indigo-500/60 hover:border-indigo-400' : 'border-amber-500/60 hover:border-amber-400'} rounded-lg px-2.5 py-1.5 flex flex-col justify-between cursor-move shadow-md transition-all select-none"
            draggable="true"
            ondragstart="handleRackItemDragStart(event, '${it.instanceId}')"
            ondragover="handleRackSlotDragOver(event)"
            ondrop="handleRackSlotDrop(event, ${u + slotData.span - 1})"
          >
            <!-- Compact Top Chassis Header Bar -->
            <div class="flex items-center justify-between w-full gap-2">
              <div class="flex items-center gap-2 min-w-0 flex-1">
                <span class="text-[11px] font-mono font-bold text-indigo-400 w-14 shrink-0">${uLabel}</span>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    ${(!isPassiveInfrastructure(it) && it.deviceNumber) ? `<span class="px-1.5 py-0.5 rounded bg-brand-900/60 border border-brand-500/40 text-[9px] font-mono font-bold text-brand-300 shrink-0" title="Device Sequence ID">${escapeHTML(it.deviceNumber)}</span>` : ''}
                    <span class="text-xs font-bold text-white truncate" title="${escapeHTML(isPassiveInfrastructure(it) ? it.model : (it.friendlyName || it.model))}">
                      ${escapeHTML(isPassiveInfrastructure(it) ? it.model : (it.friendlyName || it.model))}
                    </span>
                    ${!isPassiveInfrastructure(it) ? `
                      <button type="button" onclick="event.stopPropagation(); promptEditDeviceFriendlyName('${it.instanceId}')" class="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-white p-0.5 rounded hover:bg-slate-800 transition-all" title="Edit Friendly Name">
                        <i data-lucide="pencil" class="w-2.5 h-2.5"></i>
                      </button>
                    ` : ''}
                    <span class="text-[10px] text-slate-400 font-mono hidden sm:inline truncate">
                      &bull; ${escapeHTML(it.vendor || 'Generic')} &bull; ${slotData.span}U
                      ${portPreview ? ` &bull; <span class="text-indigo-300 font-semibold">${portPreview}</span>` : ''}
                      ${totalBaseWatts > 0 ? ` &bull; ${totalBaseWatts}W${totalPoEWatts > 0 ? `+${totalPoEWatts}W PoE` : ''}` : ''}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Right Side: Direct Faceplate Preview (for 1U Standalone Switch) + Compact Action Controls -->
              <div class="flex items-center gap-1.5 shrink-0">
                ${(isSwitch && !slotData.isStdPod && stackUnits === 1) ? renderInteractiveRackSwitchFaceplateHTML(it, 1, patchMapping) : ''}

                ${(isSwitch || isFirewall) ? `
                  <button
                    type="button"
                    onclick="event.stopPropagation(); openPortMatrixStudio('${it.instanceId}')"
                    class="px-2 py-0.5 rounded bg-sky-950/90 hover:bg-sky-900 border border-sky-500/60 text-sky-200 hover:text-white text-[10px] font-mono font-bold flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                    title="Open Switch Port Matrix &amp; Patch Panel Trace Studio (${portSummary ? `${portSummary.used}/${portSummary.total} ports active` : 'Inspect Ports'})"
                  >
                    <i data-lucide="cpu" class="w-2.5 h-2.5 text-sky-400"></i>
                    <span>Patch &amp; Ports${portSummary ? ` (${portSummary.used}/${portSummary.total})` : ''}</span>
                  </button>
                ` : ''}

                ${isSwitch ? `
                  <!-- Direct In-Rack Switch Stacking Controls -->
                  <div class="flex items-center gap-0.5 bg-slate-950/90 border border-slate-800 p-0.5 rounded-lg">
                    ${stackUnits >= 2 ? `
                      <button 
                        type="button" 
                        onclick="event.stopPropagation(); updateSwitchStackFromRack('${it.instanceId}', ${stackUnits - 1})"
                        class="w-4 h-4 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-bold transition-colors cursor-pointer"
                        title="Decrease stack size"
                      >-</button>
                      <span class="text-[9px] font-mono font-bold px-1 text-indigo-300" title="${stackUnits}-Chassis Virtual Stack">${stackUnits}x</span>
                      <button 
                        type="button" 
                        onclick="event.stopPropagation(); updateSwitchStackFromRack('${it.instanceId}', ${stackUnits + 1})"
                        class="w-4 h-4 flex items-center justify-center rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold transition-colors cursor-pointer"
                        title="Add stack member"
                        ${stackUnits >= 8 ? 'disabled class="opacity-50 cursor-not-allowed"' : ''}
                      >+</button>
                    ` : `
                      <button 
                        type="button" 
                        onclick="event.stopPropagation(); updateSwitchStackFromRack('${it.instanceId}', 2)"
                        class="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-300 hover:text-white flex items-center gap-1 transition-all cursor-pointer"
                        title="Configure as 2-Switch Virtual Stack"
                      >+Stack</button>
                    `}
                  </div>

                  ${(stackUnits >= 2 && it.stackPowerEnabled) ? `
                    <span class="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-950/90 text-amber-300 border border-amber-600/60 flex items-center gap-0.5" title="Cisco StackPower Shared Backplane Ring Enabled (${it.stackPowerMode === 'redundant' ? 'RPS Redundant' : 'Power Sharing'})">
                      <i data-lucide="zap" class="w-2.5 h-2.5 text-amber-400"></i> StackPower
                    </span>
                  ` : ''}

                  ${isCopper ? `
                    <button 
                      type="button" 
                      onclick="event.stopPropagation(); toggleSwitchStandardPod('${it.instanceId}')" 
                      class="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition-all flex items-center gap-1 cursor-pointer ${it.standardPod ? 'bg-purple-900/90 text-purple-200 border border-purple-500 hover:bg-purple-800' : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 hover:text-white'}" 
                      title="${it.standardPod ? `Remove ${ppMeta.shortLabel} Standard Pod patch panel(s)` : `Add ${ppMeta.shortLabel} (${ppMeta.sku}) patch panel pod with 6\" slim Cat6A patch cords`}"
                    >
                      <i data-lucide="layers" class="w-2.5 h-2.5 ${it.standardPod ? 'text-purple-300' : 'text-slate-400'}"></i>
                      <span>${it.standardPod ? `${ppMeta.shortLabel} Pod` : `+${ppMeta.shortLabel} Pod`}</span>
                    </button>
                  ` : ''}

                  ${(stackUnits >= 2 && !it.standardPod) ? `
                    ${isCopper ? `
                      <button 
                        type="button" 
                        onclick="event.stopPropagation(); toggleStackPatchPanel('${it.instanceId}')" 
                        class="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition-all flex items-center gap-1 cursor-pointer ${it.patchPanelBetween ? 'bg-purple-900/90 text-purple-200 border border-purple-500' : 'bg-slate-800 text-slate-300 border border-slate-700 hover:text-white'}" 
                        title="Toggle ${ppMeta.rackUnits}U ${ppMeta.ports}-Port Patch Panel (${ppMeta.sku}) in-between stacked switches"
                      >
                        <span>${it.patchPanelBetween ? `${ppMeta.shortLabel} Btwn` : `+${ppMeta.shortLabel} Btwn`}</span>
                      </button>
                    ` : ''}
                    <button 
                      type="button" 
                      onclick="event.stopPropagation(); toggleStackCableManager('${it.instanceId}')" 
                      class="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition-all flex items-center gap-1 cursor-pointer ${it.cableManagerBetween ? 'bg-amber-900/90 text-amber-200 border border-amber-500' : 'bg-slate-800 text-slate-300 border border-slate-700'}" 
                      title="Toggle 1U Horizontal Cable Manager between stacked switches"
                    >
                      <span>${it.cableManagerBetween ? '1U Mgr' : '+1U Mgr'}</span>
                    </button>
                  ` : ''}
                ` : ''}

                ${isFiberOrFirewall(it) ? `
                  <button 
                    type="button" 
                    onclick="event.stopPropagation(); toggleFiberFirewallCableManager('${it.instanceId}')" 
                    class="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition-all flex items-center gap-1 cursor-pointer ${hasHcmBelow ? 'bg-amber-900/90 text-amber-200 border border-amber-500' : 'bg-slate-800 text-slate-300 border border-slate-700'}" 
                    title="Toggle 1U Horizontal Cable Manager below device"
                  >
                    <span>${hasHcmBelow ? '1U Mgr' : '+1U Mgr'}</span>
                  </button>
                ` : ''}

                <!-- Cross-Navigation, Accessories/Swap & Unmount/Delete Icons -->
                <div class="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 bg-slate-950/90 border border-slate-800 rounded px-1 py-0.5 transition-opacity">
                  ${!isPassiveInfrastructure(it) ? `
                    <button onclick="event.stopPropagation(); if(typeof openBomItemAccessoriesModal==='function') openBomItemAccessoriesModal('${it.instanceId}')" class="p-0.5 text-slate-400 hover:text-cyan-300" title="Configure Accessories, Power Supplies, StackPower &amp; Patch Options">
                      <i data-lucide="sliders-horizontal" class="w-3 h-3"></i>
                    </button>
                    <button onclick="event.stopPropagation(); if(typeof openReplaceBomItemModal==='function') openReplaceBomItemModal('${it.instanceId}')" class="p-0.5 text-slate-400 hover:text-purple-300" title="Replace / Swap Hardware Model in Place">
                      <i data-lucide="repeat" class="w-3 h-3"></i>
                    </button>
                  ` : ''}
                  <button onclick="event.stopPropagation(); jumpToTopologyTarget('node:${it.instanceId}')" class="p-0.5 text-slate-400 hover:text-indigo-300" title="Jump to Logical Topology">
                    <i data-lucide="network" class="w-3 h-3"></i>
                  </button>
                  <button onclick="event.stopPropagation(); jumpToPhysicalLayoutTarget('${it.instanceId}')" class="p-0.5 text-slate-400 hover:text-amber-300" title="Jump to Physical Layout Canvas">
                    <i data-lucide="map" class="w-3 h-3"></i>
                  </button>
                  <button onclick="event.stopPropagation(); jumpToBomTarget('${it.instanceId}')" class="p-0.5 text-slate-400 hover:text-emerald-300" title="Jump to BOM Line Item">
                    <i data-lucide="file-spreadsheet" class="w-3 h-3"></i>
                  </button>
                  <button onclick="unmountRackItem('${it.instanceId}')" class="p-0.5 text-slate-400 hover:text-amber-400" title="Unmount to Staging">
                    <i data-lucide="inbox" class="w-3 h-3"></i>
                  </button>
                  <button onclick="event.stopPropagation(); deleteDeviceFromBOM('${it.instanceId}')" class="p-0.5 text-slate-400 hover:text-rose-400" title="Delete from Quote BOM">
                    <i data-lucide="trash-2" class="w-3 h-3"></i>
                  </button>
                </div>
              </div>
            </div>

            <!-- Standard Pod Layout: 48P Sandwich (24P Top/Bot + 48P In-Between), 24P Offset-Aware Pod, or Explicit Override -->
            ${(slotData.isStdPod && ppMeta.isSandwich48) ? `
              <div class="mt-1.5 space-y-1 border-t border-slate-800/80 pt-1.5 p-1 rounded-lg bg-slate-950/75">
                ${(() => {
                  const adjRole = it.podAdjacentRole || null;
                  const hasTopCap = adjRole !== "middle" && adjRole !== "bottom";
                  const hasBotCap = adjRole !== "top" && adjRole !== "middle";
                  const hasBotShared48 = adjRole === "top" || adjRole === "middle";
                  const betweenRU = ppMeta.betweenRackUnits || 1;
                  const floorOffset = hasBotCap ? 1 : (hasBotShared48 ? betweenRU : 0);
                  const getSwU = (uNum) => u + floorOffset + (uNum - 1) * (slotData.baseRU + betweenRU);
                  const rows = [];

                  if (hasTopCap) {
                    const topCapU = getSwU(stackUnits) + slotData.baseRU;
                    const topPanel = patchMapping?.panels?.find(p => p.deckKey === "SANDWICH-TOP") || patchMapping?.panels?.find(p => p.deck === "upper");
                    const topId = topPanel ? topPanel.panelId : "PP01";
                    const topJacks = topPanel ? topPanel.jacks : Array.from({ length: 24 }, (_, idx) => ({ jackNumber: idx + 1, jackLabel: `J${String(idx + 1).padStart(2, "0")}`, port: null }));
                    const topActive = topJacks.filter(j => j.port && j.port.connectedDeviceId).length;
                    rows.push(`
                      <div class="px-2 py-1 rounded bg-purple-950/45 border border-purple-500/40 flex items-center justify-between gap-2 text-[10px] font-mono">
                        <div class="flex items-center gap-2 min-w-0">
                          <span class="text-purple-300 font-bold w-10 shrink-0">U${topCapU}</span>
                          <span class="px-1.5 py-0.5 rounded bg-purple-900/80 text-purple-200 font-bold border border-purple-500/50 shrink-0">${topId}</span>
                          <span class="text-slate-300 truncate">1U 24P Top Cap (${stackUnits > 1 ? `U${stackUnits} ` : ''}Ports 1–24 ↓)</span>
                          <span class="text-[9px] px-1.5 py-0.5 rounded ${topActive > 0 ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-600/50' : 'bg-slate-900 text-slate-400 border border-slate-800'} font-bold shrink-0">${topActive}/24 Patched</span>
                        </div>
                        ${renderInteractiveRackKeystoneStripHTML(it.instanceId, topJacks, "upper", patchMapping)}
                      </div>
                    `);
                  }

                  for (let unitNum = stackUnits; unitNum >= 1; unitNum--) {
                    const isMaster = unitNum === 1;
                    const switchU = getSwU(unitNum);
                    rows.push(`
                      <div class="px-2 py-1 rounded bg-slate-900/95 border border-sky-500/40 flex items-center justify-between gap-2 text-[10px] font-mono">
                        <div class="flex items-center gap-2 min-w-0">
                          <span class="text-indigo-400 font-bold w-10 shrink-0">U${switchU}</span>
                          <span class="px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 font-bold border border-sky-700/60 shrink-0">
                            ${stackUnits > 1 ? `${patchMapping?.switchCode || 'SW'}-U${unitNum} (${isMaster ? 'Master' : 'Member'})` : (patchMapping?.switchCode || 'Switch Faceplate')}
                          </span>
                          <span class="text-slate-200 font-semibold truncate">${escapeHTML(it.model)}</span>
                          ${showRackPatchJumpers ? `<span class="text-[9px] text-cyan-300 bg-cyan-950/70 border border-cyan-700/50 px-1.5 py-0.5 rounded hidden md:inline shrink-0">6" Slim Cat6A ↑↓</span>` : ''}
                        </div>
                        ${renderInteractiveRackSwitchFaceplateHTML(it, unitNum, patchMapping)}
                      </div>
                    `);

                    if (unitNum > 1) {
                      const bIdx = unitNum - 1;
                      const btwnU = getSwU(bIdx) + slotData.baseRU;
                      const btwnPanel = patchMapping?.panels?.find(p => p.deckKey === `SANDWICH-BTWN-${bIdx}`);
                      const btwnId = btwnPanel ? btwnPanel.panelId : `PP${String(stackUnits - bIdx + 1).padStart(2, "0")}`;
                      const btwnJacks = btwnPanel ? btwnPanel.jacks : Array.from({ length: 48 }, (_, idx) => ({ jackNumber: idx + 1, jackLabel: `J${String(idx + 1).padStart(2, "0")}`, port: null }));
                      const btwnActive = btwnJacks.filter(j => j.port && j.port.connectedDeviceId).length;
                      rows.push(`
                        <div class="px-2 py-1 rounded bg-fuchsia-950/45 border border-fuchsia-500/50 flex items-center justify-between gap-2 text-[10px] font-mono">
                          <div class="flex items-center gap-2 min-w-0">
                            <span class="text-fuchsia-300 font-bold w-10 shrink-0">U${btwnU}</span>
                            <span class="px-1.5 py-0.5 rounded bg-fuchsia-900/80 text-fuchsia-100 font-bold border border-fuchsia-500/50 shrink-0">${btwnId}</span>
                            <span class="text-fuchsia-200 truncate">1U 48P Shared In-Between (↑ U${unitNum} P25–48 / ↓ U${bIdx} P1–24)</span>
                            <span class="text-[9px] px-1.5 py-0.5 rounded ${btwnActive > 0 ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-600/50' : 'bg-slate-900 text-slate-400 border border-slate-800'} font-bold shrink-0">${btwnActive}/48 Patched</span>
                          </div>
                          ${renderInteractiveRackKeystoneStripHTML(it.instanceId, btwnJacks, "between", patchMapping)}
                        </div>
                      `);
                    }
                  }

                  if (hasBotShared48) {
                    const botSharedPanel = patchMapping?.panels?.find(p => p.deckKey === "SANDWICH-BTWN-0");
                    const bsId = botSharedPanel ? botSharedPanel.panelId : "PP-SH";
                    const bsJacks = botSharedPanel ? botSharedPanel.jacks : Array.from({ length: 48 }, (_, idx) => ({ jackNumber: idx + 1, jackLabel: `J${String(idx + 1).padStart(2, "0")}`, port: null }));
                    const bsActive = bsJacks.filter(j => j.port && j.port.connectedDeviceId).length;
                    rows.push(`
                      <div class="px-2 py-1 rounded bg-fuchsia-950/45 border border-fuchsia-500/50 flex items-center justify-between gap-2 text-[10px] font-mono">
                        <div class="flex items-center gap-2 min-w-0">
                          <span class="text-fuchsia-300 font-bold w-10 shrink-0">U${u}</span>
                          <span class="px-1.5 py-0.5 rounded bg-fuchsia-900/80 text-fuchsia-100 font-bold border border-fuchsia-500/50 shrink-0">${bsId}</span>
                          <span class="text-fuchsia-200 truncate">1U 48P Shared In-Between (↑ P25–48 / ↓ Adjacent 48P P1–24)</span>
                          <span class="text-[9px] px-1.5 py-0.5 rounded ${bsActive > 0 ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-600/50' : 'bg-slate-900 text-slate-400 border border-slate-800'} font-bold shrink-0">${bsActive}/48 Patched</span>
                        </div>
                        ${renderInteractiveRackKeystoneStripHTML(it.instanceId, bsJacks, "between", patchMapping)}
                      </div>
                    `);
                  }

                  if (hasBotCap) {
                    const botPanel = patchMapping?.panels?.find(p => p.deckKey === "SANDWICH-BOT") || patchMapping?.panels?.find(p => p.deck === "lower");
                    const botId = botPanel ? botPanel.panelId : `PP${String(stackUnits + 1).padStart(2, "0")}`;
                    const botJacks = botPanel ? botPanel.jacks : Array.from({ length: 24 }, (_, idx) => ({ jackNumber: idx + 1, jackLabel: `J${String(idx + 1).padStart(2, "0")}`, port: null }));
                    const botActive = botJacks.filter(j => j.port && j.port.connectedDeviceId).length;
                    rows.push(`
                      <div class="px-2 py-1 rounded bg-purple-950/45 border border-purple-500/40 flex items-center justify-between gap-2 text-[10px] font-mono">
                        <div class="flex items-center gap-2 min-w-0">
                          <span class="text-purple-300 font-bold w-10 shrink-0">U${u}</span>
                          <span class="px-1.5 py-0.5 rounded bg-purple-900/80 text-purple-200 font-bold border border-purple-500/50 shrink-0">${botId}</span>
                          <span class="text-slate-300 truncate">1U 24P Bottom Cap (${stackUnits > 1 ? 'U1 ' : ''}Ports 25–48 ↑)</span>
                          <span class="text-[9px] px-1.5 py-0.5 rounded ${botActive > 0 ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-600/50' : 'bg-slate-900 text-slate-400 border border-slate-800'} font-bold shrink-0">${botActive}/24 Patched</span>
                        </div>
                        ${renderInteractiveRackKeystoneStripHTML(it.instanceId, botJacks, "lower", patchMapping)}
                      </div>
                    `);
                  }

                  return rows.join("");
                })()}
              </div>
            ` : slotData.isStdPod ? `
              <div class="mt-1.5 space-y-1 border-t border-slate-800/80 pt-1.5">
                ${Array.from({ length: stackUnits }, (_, sIdx) => {
                  const unitNum = stackUnits - sIdx;
                  const isMaster = unitNum === 1;

                  if (ppMeta.isDual24) {
                    const unitBaseU = u + (unitNum - 1) * (slotData.baseRU + 2);
                    const lowerPPU = unitBaseU;
                    const switchU = unitBaseU + 1;
                    const upperPPU = unitBaseU + slotData.baseRU + 1;

                    const is48P = ppMeta.copperPorts > 24;
                    const upperPortRange = is48P ? "Ports 1–24" : "Ports 1–12";
                    const lowerPortRange = is48P ? "Ports 25–48" : "Ports 13–24";

                    const upperPanelObj = patchMapping?.panels?.find(p => p.switchUnit === unitNum && p.deck === "upper");
                    const lowerPanelObj = patchMapping?.panels?.find(p => p.switchUnit === unitNum && p.deck === "lower");
                    const upperPanelId = upperPanelObj ? upperPanelObj.panelId : `PP${String((unitNum - 1) * 2 + 1).padStart(2, "0")}`;
                    const lowerPanelId = lowerPanelObj ? lowerPanelObj.panelId : `PP${String((unitNum - 1) * 2 + 2).padStart(2, "0")}`;

                    const upperJacks = upperPanelObj ? upperPanelObj.jacks : Array.from({ length: 24 }, (_, idx) => ({ jackNumber: idx + 1, jackLabel: `J${String(idx + 1).padStart(2, "0")}`, port: null }));
                    const lowerJacks = lowerPanelObj ? lowerPanelObj.jacks : Array.from({ length: 24 }, (_, idx) => ({ jackNumber: idx + 1, jackLabel: `J${String(idx + 1).padStart(2, "0")}`, port: null }));
                    const upperActiveCount = upperJacks.filter(j => j.port && j.port.connectedDeviceId).length;
                    const lowerActiveCount = lowerJacks.filter(j => j.port && j.port.connectedDeviceId).length;

                    return `
                      <div class="space-y-1 p-1 rounded-lg bg-slate-950/75 border border-slate-800/90">
                        <div class="px-2 py-1 rounded bg-purple-950/45 border border-purple-500/40 flex items-center justify-between gap-2 text-[10px] font-mono">
                          <div class="flex items-center gap-2 min-w-0">
                            <span class="text-purple-300 font-bold w-7 shrink-0">U${upperPPU}</span>
                            <span class="px-1.5 py-0.5 rounded bg-purple-900/80 text-purple-200 font-bold border border-purple-500/50 shrink-0">${upperPanelId}</span>
                            <span class="text-slate-300 truncate">24P Keystone (${upperPortRange})</span>
                            <span class="text-[9px] px-1.5 py-0.5 rounded ${upperActiveCount > 0 ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-600/50' : 'bg-slate-900 text-slate-400 border border-slate-800'} font-bold shrink-0">
                              ${upperActiveCount}/24 Patched
                            </span>
                          </div>
                          ${renderInteractiveRackKeystoneStripHTML(it.instanceId, upperJacks, "upper", patchMapping)}
                        </div>
                        <div class="px-2 py-1 rounded bg-slate-900/95 border border-sky-500/40 flex items-center justify-between gap-2 text-[10px] font-mono">
                          <div class="flex items-center gap-2 min-w-0">
                            <span class="text-indigo-400 font-bold w-7 shrink-0">U${switchU}</span>
                            <span class="px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 font-bold border border-sky-700/60 shrink-0">
                              ${stackUnits > 1 ? `${patchMapping?.switchCode || 'SW'}-U${unitNum} (${isMaster ? 'Master' : 'Member'})` : (patchMapping?.switchCode || 'Switch Faceplate')}
                            </span>
                            <span class="text-slate-200 font-semibold truncate">${escapeHTML(it.model)}</span>
                            ${showRackPatchJumpers ? `<span class="text-[9px] text-cyan-300 bg-cyan-950/70 border border-cyan-700/50 px-1.5 py-0.5 rounded hidden md:inline shrink-0">6" Slim Cat6A 1:1</span>` : ''}
                          </div>
                          ${renderInteractiveRackSwitchFaceplateHTML(it, unitNum, patchMapping)}
                        </div>
                        <div class="px-2 py-1 rounded bg-purple-950/45 border border-purple-500/40 flex items-center justify-between gap-2 text-[10px] font-mono">
                          <div class="flex items-center gap-2 min-w-0">
                            <span class="text-purple-300 font-bold w-7 shrink-0">U${lowerPPU}</span>
                            <span class="px-1.5 py-0.5 rounded bg-purple-900/80 text-purple-200 font-bold border border-purple-500/50 shrink-0">${lowerPanelId}</span>
                            <span class="text-slate-300 truncate">24P Keystone (${lowerPortRange})</span>
                            <span class="text-[9px] px-1.5 py-0.5 rounded ${lowerActiveCount > 0 ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-600/50' : 'bg-slate-900 text-slate-400 border border-slate-800'} font-bold shrink-0">
                              ${lowerActiveCount}/24 Patched
                            </span>
                          </div>
                          ${renderInteractiveRackKeystoneStripHTML(it.instanceId, lowerJacks, "lower", patchMapping)}
                        </div>
                      </div>
                    `;
                  }

                  // Unified Single 48-Port (1U/2U) or 24-Port (1U) Patch Panel directly above each Switch Unit
                  const unitBaseU = u + (unitNum - 1) * (slotData.baseRU + ppMeta.rackUnits);
                  const switchU = unitBaseU;
                  const upperPPU = unitBaseU + slotData.baseRU;
                  const upperPPULabel = ppMeta.rackUnits > 1 ? `U${upperPPU + ppMeta.rackUnits - 1}-U${upperPPU}` : `U${upperPPU}`;
                  const panelObj = patchMapping?.panels?.find(p => p.switchUnit === unitNum && p.deck === "single");
                  const panelId = panelObj ? panelObj.panelId : `PP${String(unitNum).padStart(2, "0")}`;
                  const panelJacks = panelObj ? panelObj.jacks : Array.from({ length: ppMeta.ports }, (_, idx) => ({ jackNumber: idx + 1, jackLabel: `J${String(idx + 1).padStart(2, "0")}`, port: null }));
                  const activeCount = panelJacks.filter(j => j.port && j.port.connectedDeviceId).length;
                  const portRangeLabel = `Ports 1–${Math.min(ppMeta.copperPorts || ppMeta.ports, ppMeta.ports)}`;

                  return `
                    <div class="space-y-1 p-1 rounded-lg bg-slate-950/75 border border-slate-800/90">
                      <!-- Unified 48P / 24P Keystone Patch Panel Row -->
                      <div class="px-2 py-1 rounded bg-purple-950/45 border border-purple-500/40 flex items-center justify-between gap-2 text-[10px] font-mono">
                        <div class="flex items-center gap-2 min-w-0">
                          <span class="text-purple-300 font-bold w-10 shrink-0">${upperPPULabel}</span>
                          <span class="px-1.5 py-0.5 rounded bg-purple-900/80 text-purple-200 font-bold border border-purple-500/50 shrink-0">${panelId}</span>
                          <span class="text-slate-300 truncate">${ppMeta.isOffset48Frame ? `1U 48P Half-Frame (${ppMeta.populatedSide === 'right' ? 'Right' : 'Left'} 2×12 • ${portRangeLabel})` : `${ppMeta.rackUnits}U ${ppMeta.ports}P Keystone (${portRangeLabel})`}</span>
                          <span class="text-[9px] px-1.5 py-0.5 rounded ${activeCount > 0 ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-600/50' : 'bg-slate-900 text-slate-400 border border-slate-800'} font-bold shrink-0">
                            ${activeCount}/${ppMeta.ports} Patched
                          </span>
                        </div>
                        ${renderInteractiveRackKeystoneStripHTML(it.instanceId, panelJacks, "single", patchMapping, { isOffset48Frame: Boolean(ppMeta.isOffset48Frame), populatedSide: ppMeta.populatedSide })}
                      </div>

                      <!-- Switch Chassis Row -->
                      <div class="px-2 py-1 rounded bg-slate-900/95 border border-sky-500/40 flex items-center justify-between gap-2 text-[10px] font-mono">
                        <div class="flex items-center gap-2 min-w-0">
                          <span class="text-indigo-400 font-bold w-10 shrink-0">U${switchU}</span>
                          <span class="px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 font-bold border border-sky-700/60 shrink-0">
                            ${stackUnits > 1 ? `${patchMapping?.switchCode || 'SW'}-U${unitNum} (${isMaster ? 'Master' : 'Member'})` : (patchMapping?.switchCode || 'Switch Faceplate')}
                          </span>
                          <span class="text-slate-200 font-semibold truncate">${escapeHTML(it.model)}</span>
                          ${showRackPatchJumpers ? `<span class="text-[9px] text-cyan-300 bg-cyan-950/70 border border-cyan-700/50 px-1.5 py-0.5 rounded hidden md:inline shrink-0">${escapeHTML(ppMeta.offset24?.is24Class ? ppMeta.offset24.shortBadge : '6" Slim Cat6A 1:1')}</span>` : ''}
                        </div>
                        ${renderInteractiveRackSwitchFaceplateHTML(it, unitNum, patchMapping)}
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            ` : (stackUnits >= 2) ? `
              <!-- Multi-Chassis Stack Member Breakdown Bar with Interactive Switch Faceplates -->
              <div class="mt-1.5 space-y-1 border-t border-slate-800/80 pt-1.5">
                ${Array.from({ length: stackUnits }, (_, sIdx) => {
                  const unitNum = stackUnits - sIdx;
                  const isMaster = unitNum === 1;
                  const interU = slotData.hasPPBetween ? ppMeta.rackUnits : (slotData.hasHCMBetween ? 1 : 0);
                  const stepU = slotData.baseRU + interU;
                  const memberU = u + (unitNum - 1) * stepU;
                  const betweenU = memberU - interU;
                  const hasModularUplinkOnThisUnit = (stackUnits <= 2 || (it.uplinkModuleStackPolicy || "first_last") === "all") || unitNum === 1 || unitNum === stackUnits;
                  let memberHTML = `
                    <div class="px-2 py-1 rounded bg-slate-950/90 border ${isMaster ? 'border-sky-500/40' : 'border-slate-800'} flex items-center justify-between gap-2 text-[10px] font-mono">
                      <div class="flex items-center gap-2 min-w-0">
                        <span class="text-indigo-400 font-bold w-10 shrink-0">U${memberU}</span>
                        <span class="px-1.5 py-0.5 rounded ${isMaster ? 'bg-sky-950 text-sky-300 font-bold border border-sky-800/60' : 'bg-slate-900 text-slate-300'} shrink-0">
                          Unit ${unitNum} (${isMaster ? 'Master' : (unitNum === stackUnits ? 'Last Member' : 'Member')})
                        </span>
                        <span class="text-slate-300 font-semibold truncate">${escapeHTML(it.model)}</span>
                        ${(it.selectedUplinkModule && stackUnits > 2 && hasModularUplinkOnThisUnit) ? `<span class="text-[8.5px] px-1 py-0.2 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-700/50 shrink-0" title="Modular Uplink Populated on Edge Stack Member">Uplink Mod</span>` : ''}
                      </div>
                      ${renderInteractiveRackSwitchFaceplateHTML(it, unitNum, patchMapping)}
                    </div>
                  `;
                  if (unitNum > 1 && slotData.hasHCMBetween) {
                    memberHTML += `
                      <div class="px-2 py-1 rounded bg-amber-950/40 border border-amber-600/50 flex items-center justify-between gap-2 text-[10px] font-mono">
                        <div class="flex items-center gap-2">
                          <span class="text-amber-300 font-bold w-10 shrink-0">U${betweenU}</span>
                          <span class="text-amber-200 font-bold">1U Horizontal Cable Manager (HCM-1U)</span>
                        </div>
                        <span class="text-[9px] text-amber-300/80">◄ Pass-Through Finger Duct ►</span>
                      </div>
                    `;
                  } else if (unitNum > 1 && slotData.hasPPBetween) {
                    const betweenULabel = ppMeta.rackUnits > 1 ? `U${betweenU + ppMeta.rackUnits - 1}-U${betweenU}` : `U${betweenU}`;
                    const btwnPanelObj = patchMapping?.panels?.find(p => p.switchUnit === (unitNum - 1) && p.deck === "single");
                    const btwnPanelId = btwnPanelObj ? btwnPanelObj.panelId : `PP${String(unitNum - 1).padStart(2, "0")}`;
                    const btwnJacks = btwnPanelObj ? btwnPanelObj.jacks : Array.from({ length: ppMeta.ports }, (_, idx) => ({ jackNumber: idx + 1, jackLabel: `J${String(idx + 1).padStart(2, "0")}`, port: null }));
                    const btwnActive = btwnJacks.filter(j => j.port && j.port.connectedDeviceId).length;
                    memberHTML += `
                      <div class="px-2 py-1 rounded bg-purple-950/40 border border-purple-600/50 flex items-center justify-between gap-2 text-[10px] font-mono">
                        <div class="flex items-center gap-2 min-w-0">
                          <span class="text-purple-300 font-bold w-10 shrink-0">${betweenULabel}</span>
                          <span class="px-1.5 py-0.5 rounded bg-purple-900/80 text-purple-200 font-bold border border-purple-500/50 shrink-0">${btwnPanelId}</span>
                          <span class="text-purple-200 font-bold truncate">${escapeHTML(ppMeta.model)} (${ppMeta.sku})</span>
                          <span class="text-[9px] px-1.5 py-0.5 rounded ${btwnActive > 0 ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-600/50' : 'bg-slate-900 text-slate-400 border border-slate-800'} font-bold shrink-0">
                            ${btwnActive}/${ppMeta.ports} Patched
                          </span>
                        </div>
                        ${renderInteractiveRackKeystoneStripHTML(it.instanceId, btwnJacks, "single", patchMapping)}
                      </div>
                    `;
                  }
                  return memberHTML;
                }).join('')}
              </div>
            ` : ''}
          </div>
        `;
      }
    } else {
      railHTML += `
        <div 
          class="h-7 border border-dashed border-slate-800/70 hover:border-indigo-500/50 hover:bg-indigo-950/10 rounded-lg px-3 flex items-center justify-between transition-colors select-none"
          ondragover="handleRackSlotDragOver(event)"
          ondrop="handleRackSlotDrop(event, ${u})"
        >
          <span class="text-[10px] font-mono text-slate-600 font-bold">U${u}</span>
          <span class="text-[9px] font-mono text-slate-700 uppercase tracking-wider">Empty Slot</span>
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
    <div class="px-3 py-1.5 mb-1.5 rounded-lg bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-700/80 shadow-md flex items-center justify-between text-xs select-none gap-2 flex-wrap">
      <div class="flex items-center gap-2 min-w-0">
        <span class="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shrink-0"></span>
        <span class="font-mono font-bold text-slate-200 tracking-wide uppercase text-[11px] truncate">${escapeHTML(vendor)} &bull; ${escapeHTML(sku)}</span>
        <span class="text-[10px] text-slate-400 hidden md:inline truncate max-w-[200px]">${escapeHTML(model)}</span>
      </div>
      
      <!-- PDU Power Distribution Telemetry Bar & Auto-Balancer -->
      <div class="flex items-center gap-2 font-mono text-[10px] shrink-0">
        ${pduMetrics ? `
          <span class="px-2 py-0.5 rounded bg-slate-950/90 border ${pduMetrics.pduA.pct > 80 ? 'border-rose-600 text-rose-300' : 'border-emerald-700/60 text-emerald-300'} font-bold flex items-center gap-1" title="Feed A 120V Circuit: ${pduMetrics.pduA.watts}W (${pduMetrics.pduA.pct}% of 16A NEC safe limit)">
            <i data-lucide="zap" class="w-2.5 h-2.5 ${pduMetrics.pduA.pct > 80 ? 'text-rose-400' : 'text-emerald-400'}"></i>
            <span>PDU-A: ${pduMetrics.pduA.amps}A (${pduMetrics.pduA.pct}%)</span>
          </span>
          ${pduMetrics.pduB ? `
            <span class="px-2 py-0.5 rounded bg-slate-950/90 border ${pduMetrics.pduB.pct > 80 ? 'border-rose-600 text-rose-300' : 'border-sky-700/60 text-sky-300'} font-bold flex items-center gap-1" title="Feed B 120V Circuit: ${pduMetrics.pduB.watts}W (${pduMetrics.pduB.pct}% of 16A NEC safe limit)">
              <i data-lucide="zap" class="w-2.5 h-2.5 ${pduMetrics.pduB.pct > 80 ? 'text-rose-400' : 'text-sky-400'}"></i>
              <span>PDU-B: ${pduMetrics.pduB.amps}A (${pduMetrics.pduB.pct}%)</span>
            </span>
          ` : ''}
          <button type="button" onclick="event.stopPropagation(); autoBalanceRackPowerFeeds()" class="px-2 py-0.5 rounded bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-600/70 text-emerald-300 hover:text-white font-bold text-[9.5px] flex items-center gap-1 transition-colors cursor-pointer" title="Auto-balance dual-corded devices evenly across PDU-A and PDU-B to eliminate single point of failure">
            <i data-lucide="scale" class="w-2.5 h-2.5 text-emerald-400"></i> Auto-Balance A+B
          </button>
        ` : ''}
        <span class="px-1.5 py-0.2 rounded bg-slate-950/80 border border-slate-700 text-cyan-300 font-bold hidden sm:inline">${depth}" Depth</span>
        <span class="px-1.5 py-0.2 rounded bg-slate-950/80 border border-slate-700 text-emerald-300 font-bold hidden sm:inline">${maxWt.toLocaleString()} lbs Max</span>
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
        const ppMeta = getRackSwitchPatchPanelMeta(it);
        const targetU = parseInt(it.rackSlot, 10);
        const hasHcmBelow = !!(targetU > 1 && slots[targetU - 1] && (
          slots[targetU - 1].item.sku === "HCM-1U" || 
          slots[targetU - 1].item.source === "fiber_firewall_hcm" || 
          (slots[targetU - 1].item.model || "").includes("Cable Manager")
        ));
        const uLabel = slotData.span > 1 ? `U${u + slotData.span - 1}-U${u}` : `U${u}`;
        const psuSpecs = getDevicePsuSpecs(it);
        const psuConns = getDevicePowerConnections(it);
        const devPowerInfo = pduMetrics?.byDeviceId?.[it.instanceId] || null;
        const psu1Assign = devPowerInfo?.psus?.psu1 || null;
        const psu2Assign = devPowerInfo?.psus?.psu2 || null;
        const isPassive = isPassiveInfrastructure(it);
        const isUps = isMountedUpsUnit(it);
        const upsRecord = isUps ? pduMetrics?.mountedUps?.find(uObj => uObj.instanceId === it.instanceId) : null;

        const isDualPsu = psuSpecs.psuCount >= 2;
        const isDualRedundant = isDualPsu && ((psuConns.psu1 === "PDU-A" && psuConns.psu2 === "PDU-B") || (psuConns.psu1 === "PDU-B" && psuConns.psu2 === "PDU-A"));
        const isSpof = isDualPsu && (psuConns.psu1 === psuConns.psu2) && (psuConns.psu1 === "PDU-A" || psuConns.psu1 === "PDU-B");

        const psu1Label = psu1Assign && psu1Assign.connected
          ? `${psu1Assign.devicePsuTag} → ${psu1Assign.pduShortReceptacle} (${psu1Assign.watts}W)`
          : `PSU 1: ${psuConns.psu1 || 'None'}`;
        const psu1Tip = psu1Assign && psu1Assign.connected
          ? `Brady L1: ${psu1Assign.bradyPsuLine1} | L2: ${psu1Assign.bradyPsuLine2} (${psu1Assign.cordSpec}) — Click to cycle feed`
          : `Click to cycle power feed (PDU-A -> PDU-B -> Unplugged)`;

        const psu2Label = psu2Assign && psu2Assign.connected
          ? `${psu2Assign.devicePsuTag} → ${psu2Assign.pduShortReceptacle} (${psu2Assign.watts}W)`
          : `PSU 2: ${psuConns.psu2 || 'None'}`;
        const psu2Tip = psu2Assign && psu2Assign.connected
          ? `Brady L1: ${psu2Assign.bradyPsuLine1} | L2: ${psu2Assign.bradyPsuLine2} (${psu2Assign.cordSpec}) — Click to cycle feed`
          : `Click to cycle power feed (PDU-A -> PDU-B -> Unplugged)`;

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
                    ${(!isPassive && (devPowerInfo?.deviceShortTag || it.deviceNumber)) ? `<span class="px-1.5 py-0.2 rounded bg-brand-900/60 border border-brand-500/40 text-[9px] font-mono font-bold text-brand-300" title="Orion Device Tag">${escapeHTML(devPowerInfo?.deviceShortTag || it.deviceNumber)}</span>` : ''}
                    <span class="text-xs font-bold text-white truncate" title="${escapeHTML(isPassive ? it.model : (it.friendlyName || it.model))}">${escapeHTML(isPassive ? it.model : (it.friendlyName || it.model))}</span>
                    ${!isPassive ? `
                      <button type="button" onclick="event.stopPropagation(); promptEditDeviceFriendlyName('${it.instanceId}')" class="text-slate-400 hover:text-white p-0.5 rounded hover:bg-slate-800 transition-colors" title="Edit Friendly Name">
                        <i data-lucide="pencil" class="w-2.5 h-2.5"></i>
                      </button>
                    ` : ''}
                    <span class="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-950 text-slate-400 border border-slate-800">REAR</span>
                    <!-- Redundancy Badge -->
                    ${isPassive ? `
                      <span class="text-[9px] font-mono text-purple-300 bg-purple-950/80 border border-purple-700/60 px-1.5 py-0.2 rounded">Passive Rear</span>
                    ` : isUps ? `
                      <span class="text-[9px] font-mono font-bold text-amber-300 bg-amber-950/80 border border-amber-700/60 px-1.5 py-0.2 rounded flex items-center gap-1">
                        <i data-lucide="battery-charging" class="w-2.5 h-2.5 text-amber-400"></i> ${escapeHTML(upsRecord ? upsRecord.upsTag : 'Standby UPS')}
                      </span>
                    ` : isHorizontalPdu ? `
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
                  ${isPassive ? `
                    <div class="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                      <span>Rear Cable Retention Bar</span>
                      <span>&bull;</span>
                      <span class="text-amber-400/90 flex items-center gap-0.5">⏚ Bonded to Rack Rail</span>
                    </div>
                  ` : `
                    <div class="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                      <span>Inlet: ${psuSpecs.inletType}</span>
                      ${psu1Assign && psu1Assign.connected ? `<span>&bull;</span><span class="text-amber-300 font-bold" title="Orion Power Cord Tag">${escapeHTML(psu1Assign.powerCordId)}${psu2Assign && psu2Assign.connected ? ` + ${escapeHTML(psu2Assign.powerCordId)}` : ''}</span>` : ''}
                      <span>&bull;</span>
                      <span class="text-cyan-400 flex items-center gap-0.5" title="Front-to-Back cooling exhaust"><i data-lucide="wind" class="w-3 h-3"></i> Exhaust</span>
                      <span>&bull;</span>
                      <span class="text-amber-400/90 flex items-center gap-0.5" title="Chassis Grounding Lug (TIA-607-C)">⏚ GND Lug</span>
                    </div>
                  `}
                </div>
              </div>

              <!-- Power Supply Cord Connectors & Receptacle Badges -->
              <div class="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                ${isPassive ? '' : isUps ? `
                  <span class="px-2 py-0.5 rounded bg-amber-950/80 border border-amber-600/60 text-amber-300 text-[10px] font-mono font-bold flex items-center gap-1" title="UPS Upstream Branch Circuit Input">
                    <i data-lucide="plug-zap" class="w-3 h-3 text-amber-400"></i>
                    <span>${escapeHTML(upsRecord ? `${upsRecord.inputCordId} → ${upsRecord.upstreamCircuit}` : 'Branch Circuit 120V/20A')}</span>
                  </span>
                ` : `
                  <!-- PSU 1 Inlet & Assigned PDU Receptacle Button -->
                  <button onclick="event.stopPropagation(); toggleDevicePsuFeed('${it.instanceId}', 1)" class="px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 border transition-all cursor-pointer ${getPsuBtnClass(psuConns.psu1, pduConfig)}" title="${escapeHTML(psu1Tip)}">
                    <i data-lucide="zap" class="w-3 h-3"></i>
                    <span>${escapeHTML(psu1Label)}</span>
                  </button>

                  <!-- PSU 2 Inlet & Assigned PDU Receptacle Button (for dual modular PSUs) -->
                  ${isDualPsu ? `
                    <button onclick="event.stopPropagation(); toggleDevicePsuFeed('${it.instanceId}', 2)" class="px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 border transition-all cursor-pointer ${getPsuBtnClass(psuConns.psu2, pduConfig)}" title="${escapeHTML(psu2Tip)}">
                      <i data-lucide="zap" class="w-3 h-3"></i>
                      <span>${escapeHTML(psu2Label)}</span>
                    </button>
                  ` : ''}

                  <!-- Inspect in Power Matrix Studio Button -->
                  <button
                    type="button"
                    onclick="event.stopPropagation(); openRackPowerMatrixModal(null, null, '${it.instanceId}')"
                    class="px-2 py-0.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500/60 text-slate-300 hover:text-emerald-300 text-[9.5px] font-mono font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    title="Inspect End-to-End Power Chain, Reassign PDU Outlet # &amp; View Orion 2-Line Brady Power Labels"
                  >
                    <i data-lucide="plug-zap" class="w-2.5 h-2.5 text-emerald-400"></i>
                    <span>Outlet &amp; Label</span>
                  </button>
                `}

                ${isSwitch ? `
                  ${isCopper ? `
                    <!-- Standard Pod Toggle -->
                    <button 
                      type="button" 
                      onclick="event.stopPropagation(); toggleSwitchStandardPod('${it.instanceId}')" 
                      class="px-2 py-0.5 rounded text-[9px] font-mono font-bold transition-all flex items-center gap-1 ${it.standardPod ? 'bg-emerald-900/90 text-emerald-200 border border-emerald-500 hover:bg-emerald-800 shadow-sm' : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 hover:text-white'}" 
                      title="${it.standardPod ? `Remove ${ppMeta.shortLabel} Standard Pod patch panel(s)` : `Standard Rack Design: Add ${ppMeta.shortLabel} (${ppMeta.sku}) patch panel pod with 6\" patch cables`}"
                    >
                      <i data-lucide="${it.standardPod ? 'check-circle-2' : 'panels-top-left'}" class="w-2.5 h-2.5 ${it.standardPod ? 'text-emerald-400' : 'text-slate-400'}"></i>
                      <span>${it.standardPod ? `Std ${ppMeta.shortLabel} Active` : `+ Std ${ppMeta.shortLabel}`}</span>
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

            <!-- Rear Standard Pod Layout: 48P Sandwich (24P Top/Bot + 48P In-Between) or 24P Pod -->
            ${(slotData.isStdPod && ppMeta.isSandwich48) ? `
              <div class="mt-2 space-y-1 p-1 rounded bg-slate-950/60 border border-purple-900/40">
                ${(() => {
                  const adjRole = it.podAdjacentRole || null;
                  const hasTopCap = adjRole !== "middle" && adjRole !== "bottom";
                  const hasBotCap = adjRole !== "top" && adjRole !== "middle";
                  const hasBotShared48 = adjRole === "top" || adjRole === "middle";
                  const betweenRU = ppMeta.betweenRackUnits || 1;
                  const floorOffset = hasBotCap ? 1 : (hasBotShared48 ? betweenRU : 0);
                  const getSwU = (uNum) => u + floorOffset + (uNum - 1) * (slotData.baseRU + betweenRU);
                  const rows = [];

                  if (hasTopCap) {
                    const topCapU = getSwU(stackUnits) + slotData.baseRU;
                    rows.push(`
                      <div class="p-1.5 rounded bg-purple-950/70 border border-purple-600/70 flex items-center justify-between gap-2 text-[10px] font-mono shadow-sm">
                        <div class="flex items-center gap-2">
                          <span class="text-purple-300 font-bold">U${topCapU}</span>
                          <span class="px-1.5 py-0.5 rounded bg-purple-900/90 text-purple-200 font-bold border border-purple-500/70">1U 24P Patch Panel Rear (Top Cap • PP-1U-24P-MOD)</span>
                          <span class="text-purple-400/80 text-[9px] font-semibold">24x Keystone Tie Bar</span>
                        </div>
                        <span class="text-[8.5px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 border border-emerald-600 text-emerald-300 font-bold">6" CORD DIRECT</span>
                      </div>
                    `);
                  }

                  for (let unitNum = stackUnits; unitNum >= 1; unitNum--) {
                    const switchU = getSwU(unitNum);
                    const unitLabel = stackUnits > 1 ? `Unit ${unitNum} ` : "";
                    rows.push(`
                      <div class="p-1.5 rounded bg-slate-950/90 border border-sky-500/40 flex items-center justify-between gap-2 text-[10px] font-mono">
                        <div class="flex items-center gap-2">
                          <span class="text-indigo-400 font-bold">U${switchU}</span>
                          <span class="text-slate-300 font-bold">${unitLabel}${escapeHTML(it.model)} Rear (${psuSpecs.inletType})</span>
                        </div>
                        <div class="text-[9px] text-slate-400 flex items-center gap-2">
                          <span class="text-cyan-400 flex items-center gap-0.5"><i data-lucide="wind" class="w-2.5 h-2.5"></i> Fan Exhaust</span>
                          ${stackUnits > 1 ? `<span class="text-indigo-400 flex items-center gap-0.5"><i data-lucide="link" class="w-2.5 h-2.5"></i> Stack Link</span>` : ''}
                          ${(stackUnits > 1 && it.stackPowerEnabled) ? `<span class="text-amber-300 flex items-center gap-0.5"><i data-lucide="zap" class="w-2.5 h-2.5"></i> StackPower</span>` : ''}
                          <span class="text-emerald-400 font-bold">PSU OK</span>
                        </div>
                      </div>
                    `);
                    if (unitNum > 1) {
                      const bIdx = unitNum - 1;
                      const btwnU = getSwU(bIdx) + slotData.baseRU;
                      rows.push(`
                        <div class="p-1.5 rounded bg-fuchsia-950/60 border border-fuchsia-600/70 flex items-center justify-between gap-2 text-[10px] font-mono shadow-sm">
                          <div class="flex items-center gap-2">
                            <span class="text-fuchsia-300 font-bold">U${btwnU}</span>
                            <span class="px-1.5 py-0.5 rounded bg-fuchsia-900/90 text-fuchsia-100 font-bold border border-fuchsia-500/70">1U 48P Shared Patch Panel Rear (In-Between • PP-1U-48P-MOD)</span>
                            <span class="text-fuchsia-300/80 text-[9px] font-semibold">48x Dual-Row Keystone Tie Bar</span>
                          </div>
                          <span class="text-[8.5px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 border border-emerald-600 text-emerald-300 font-bold">24↑ + 24↓ 6" CORDS</span>
                        </div>
                      `);
                    }
                  }

                  if (hasBotShared48) {
                    rows.push(`
                      <div class="p-1.5 rounded bg-fuchsia-950/60 border border-fuchsia-600/70 flex items-center justify-between gap-2 text-[10px] font-mono shadow-sm">
                        <div class="flex items-center gap-2">
                          <span class="text-fuchsia-300 font-bold">U${u}</span>
                          <span class="px-1.5 py-0.5 rounded bg-fuchsia-900/90 text-fuchsia-100 font-bold border border-fuchsia-500/70">1U 48P Shared Patch Panel Rear (Between Adjacent 48P Switches)</span>
                        </div>
                        <span class="text-[8.5px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 border border-emerald-600 text-emerald-300 font-bold">24↑ + 24↓ 6" CORDS</span>
                      </div>
                    `);
                  }

                  if (hasBotCap) {
                    rows.push(`
                      <div class="p-1.5 rounded bg-purple-950/70 border border-purple-600/70 flex items-center justify-between gap-2 text-[10px] font-mono shadow-sm">
                        <div class="flex items-center gap-2">
                          <span class="text-purple-300 font-bold">U${u}</span>
                          <span class="px-1.5 py-0.5 rounded bg-purple-900/90 text-purple-200 font-bold border border-purple-500/70">1U 24P Patch Panel Rear (Bottom Cap • PP-1U-24P-MOD)</span>
                          <span class="text-purple-400/80 text-[9px] font-semibold">24x Keystone Tie Bar</span>
                        </div>
                        <span class="text-[8.5px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 border border-emerald-600 text-emerald-300 font-bold">6" CORD DIRECT</span>
                      </div>
                    `);
                  }

                  return rows.join("");
                })()}
              </div>
            ` : slotData.isStdPod ? `
              <div class="mt-2 space-y-1.5 border-t border-slate-800/80 pt-2">
                ${Array.from({ length: stackUnits }, (_, sIdx) => {
                  const unitNum = stackUnits - sIdx;
                  const unitLabel = stackUnits > 1 ? `Unit ${unitNum} ` : "";
                  if (ppMeta.isDual24) {
                    const unitBaseU = u + (unitNum - 1) * (slotData.baseRU + 2);
                    const lowerPPU = unitBaseU;
                    const switchU = unitBaseU + 1;
                    const upperPPU = unitBaseU + slotData.baseRU + 1;
                    return `
                      <div class="space-y-1 p-1 rounded bg-slate-950/60 border border-purple-900/40">
                        <div class="p-1.5 rounded bg-purple-950/70 border border-purple-600/70 flex items-center justify-between gap-2 text-[10px] font-mono shadow-sm">
                          <div class="flex items-center gap-2">
                            <span class="text-purple-300 font-bold">U${upperPPU}</span>
                            <span class="px-1.5 py-0.5 rounded bg-purple-900/90 text-purple-200 font-bold border border-purple-500/70 flex items-center gap-1">
                              <i data-lucide="layers" class="w-3 h-3 text-purple-300"></i> 1U 24P Patch Panel Rear (${unitLabel}Upper)
                            </span>
                            <span class="text-purple-400/80 text-[9px] font-semibold">Cable Retention Tie Bar &amp; Keystone Sockets</span>
                          </div>
                          <span class="text-[8.5px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 border border-emerald-600 text-emerald-300 font-bold">6" CORD DIRECT TIE-OFF</span>
                        </div>
                        <div class="p-1.5 rounded bg-slate-950/90 border border-sky-500/40 flex items-center justify-between gap-2 text-[10px] font-mono">
                          <div class="flex items-center gap-2">
                            <span class="text-indigo-400 font-bold">U${switchU}</span>
                            <span class="text-slate-300 font-bold">${unitLabel}${escapeHTML(it.model)} Rear (${psuSpecs.inletType})</span>
                          </div>
                          <div class="text-[9px] text-slate-400 flex items-center gap-2">
                            <span class="text-cyan-400 flex items-center gap-0.5"><i data-lucide="wind" class="w-2.5 h-2.5"></i> Fan Exhaust</span>
                            ${stackUnits > 1 ? `<span class="text-indigo-400 flex items-center gap-0.5"><i data-lucide="link" class="w-2.5 h-2.5"></i> Stack Link</span>` : ''}
                            ${(stackUnits > 1 && it.stackPowerEnabled) ? `<span class="text-amber-300 flex items-center gap-0.5"><i data-lucide="zap" class="w-2.5 h-2.5"></i> StackPower</span>` : ''}
                            <span class="text-emerald-400 font-bold">PSU OK</span>
                          </div>
                        </div>
                        <div class="p-1.5 rounded bg-purple-950/70 border border-purple-600/70 flex items-center justify-between gap-2 text-[10px] font-mono shadow-sm">
                          <div class="flex items-center gap-2">
                            <span class="text-purple-300 font-bold">U${lowerPPU}</span>
                            <span class="px-1.5 py-0.5 rounded bg-purple-900/90 text-purple-200 font-bold border border-purple-500/70 flex items-center gap-1">
                              <i data-lucide="layers" class="w-3 h-3 text-purple-300"></i> 1U 24P Patch Panel Rear (${unitLabel}Lower)
                            </span>
                            <span class="text-purple-400/80 text-[9px] font-semibold">Cable Retention Tie Bar &amp; Keystone Sockets</span>
                          </div>
                          <span class="text-[8.5px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 border border-emerald-600 text-emerald-300 font-bold">6" CORD DIRECT TIE-OFF</span>
                        </div>
                      </div>
                    `;
                  }

                  const unitBaseU = u + (unitNum - 1) * (slotData.baseRU + ppMeta.rackUnits);
                  const switchU = unitBaseU;
                  const upperPPU = unitBaseU + slotData.baseRU;
                  const upperPPULabel = ppMeta.rackUnits > 1 ? `U${upperPPU + ppMeta.rackUnits - 1}-U${upperPPU}` : `U${upperPPU}`;
                  return `
                    <div class="space-y-1 p-1 rounded bg-slate-950/60 border border-purple-900/40">
                      <div class="p-1.5 rounded bg-purple-950/70 border border-purple-600/70 flex items-center justify-between gap-2 text-[10px] font-mono shadow-sm">
                        <div class="flex items-center gap-2">
                          <span class="text-purple-300 font-bold">${upperPPULabel}</span>
                          <span class="px-1.5 py-0.5 rounded bg-purple-900/90 text-purple-200 font-bold border border-purple-500/70 flex items-center gap-1">
                            <i data-lucide="layers" class="w-3 h-3 text-purple-300"></i> ${ppMeta.rackUnits}U ${ppMeta.ports}P Patch Panel Rear (${unitLabel}${ppMeta.sku})
                          </span>
                          <span class="text-purple-400/80 text-[9px] font-semibold">Cable Retention Tie Bar &amp; ${ppMeta.ports}x Keystone Sockets</span>
                        </div>
                        <span class="text-[8.5px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 border border-emerald-600 text-emerald-300 font-bold">
                          6" CORD DIRECT TIE-OFF
                        </span>
                      </div>
                      <div class="p-1.5 rounded bg-slate-950/90 border border-sky-500/40 flex items-center justify-between gap-2 text-[10px] font-mono">
                        <div class="flex items-center gap-2">
                          <span class="text-indigo-400 font-bold">U${switchU}</span>
                          <span class="text-slate-300 font-bold">${unitLabel}${escapeHTML(it.model)} Rear (${psuSpecs.inletType})</span>
                        </div>
                        <div class="text-[9px] text-slate-400 flex items-center gap-2">
                          <span class="text-cyan-400 flex items-center gap-0.5"><i data-lucide="wind" class="w-2.5 h-2.5"></i> Fan Exhaust</span>
                          ${stackUnits > 1 ? `<span class="text-indigo-400 flex items-center gap-0.5"><i data-lucide="link" class="w-2.5 h-2.5"></i> Stack Link</span>` : ''}
                          ${(stackUnits > 1 && it.stackPowerEnabled) ? `<span class="text-amber-300 flex items-center gap-0.5"><i data-lucide="zap" class="w-2.5 h-2.5"></i> StackPower</span>` : ''}
                          <span class="text-emerald-400 font-bold">PSU OK</span>
                        </div>
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
                    const stepU = slotData.baseRU + ppMeta.rackUnits;
                    const memberU = u + (unitNum - 1) * stepU;
                    const ppU = memberU - ppMeta.rackUnits;
                    const ppULabel = ppMeta.rackUnits > 1 ? `U${ppU + ppMeta.rackUnits - 1}-U${ppU}` : `U${ppU}`;
                    let memberHTML = `
                      <div class="p-1.5 rounded bg-slate-950/90 border ${isMaster ? 'border-sky-500/40' : 'border-slate-800'} flex items-center justify-between gap-2 text-[10px] font-mono">
                        <div class="flex items-center gap-2">
                          <span class="text-indigo-400 font-bold">U${memberU}</span>
                          <span class="text-slate-300 font-bold">Unit ${unitNum} Rear Chassis (${psuSpecs.inletType})</span>
                        </div>
                        <div class="text-[9px] text-slate-400 flex items-center gap-2">
                          <span class="text-indigo-400 flex items-center gap-0.5"><i data-lucide="link" class="w-2.5 h-2.5"></i> Stack Ring</span>
                          ${it.stackPowerEnabled ? `<span class="text-amber-300 flex items-center gap-0.5"><i data-lucide="zap" class="w-2.5 h-2.5"></i> StackPower</span>` : ''}
                          <span class="text-emerald-400 font-bold">PSU OK</span>
                        </div>
                      </div>
                    `;
                    if (unitNum > 1) {
                      memberHTML += `
                        <div class="p-1.5 rounded bg-purple-950/50 border border-purple-700/50 flex items-center justify-between gap-2 text-[10px] font-mono shadow-inner my-1">
                          <div class="flex items-center gap-2">
                            <span class="text-purple-300 font-bold">${ppULabel}</span>
                            <span class="text-purple-200 font-bold">${ppMeta.rackUnits}U ${ppMeta.ports}P Patch Panel Rear (${ppMeta.sku} • Cable Management Tie Bar)</span>
                          </div>
                          <span class="text-[9px] text-purple-400/80 font-mono">${ppMeta.ports}x Keystone Cat6A Pass-Through</span>
                        </div>
                      `;
                    }
                    return memberHTML;
                  }).join('')}
                </div>
              ` : `
                <div class="mt-1.5 pt-1.5 border-t border-slate-800 flex items-center justify-between text-[9px] font-mono text-slate-400">
                  <span class="text-indigo-400 font-semibold flex items-center gap-1">
                    <i data-lucide="link" class="w-2.5 h-2.5"></i> Direct-Attach Stack Ring${it.stackPowerEnabled ? ' + ⚡ Cisco StackPower Ring' : ''}
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

  const horizGridClass = (pduMetrics.pduA.totalOutlets === 9 || pduMetrics.pduA.totalOutlets === 10)
    ? "pdu-strip-10col"
    : ((pduMetrics.pduA.totalOutlets <= 8 || pduMetrics.pduA.totalOutlets === 16) ? "pdu-strip-8col" : "pdu-strip-12col");

  const topHorizontalPduHtml = isHorizontalPdu ? `
    <!-- ${pduMetrics.pduA.rackUnits || 1}U Horizontal Rackmount PDU Strip Bar -->
    <div class="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-indigo-500/50 rounded-xl p-3 shadow-xl select-none mb-3">
      <div class="flex flex-wrap items-center justify-between gap-3 mb-2.5">
        <div class="flex items-center gap-2.5">
          <div class="p-2 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
            <i data-lucide="zap" class="w-4 h-4"></i>
          </div>
          <div>
            <div class="text-xs font-bold text-white flex items-center gap-2 flex-wrap">
              <span>${pduMetrics.pduA.rackUnits || 1}U Horizontal Rackmount PDU (${escapeHTML(pduMetrics.pduA.fullId)})</span>
              <span class="text-[9px] font-mono px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-600 font-bold" title="${escapeHTML(pduMetrics.pduA.model)}">SKU: ${escapeHTML(pduMetrics.pduA.vendor)} ${escapeHTML(pduMetrics.pduA.sku)}</span>
              <span class="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-900 text-amber-300 border border-slate-700 font-bold">${escapeHTML(pduMetrics.pduA.upstreamFull)}</span>
              <span class="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-600 font-bold">${pduMetrics.pduA.outletsUsed}/${pduMetrics.pduA.totalOutlets} Outlets</span>
            </div>
            <span class="text-[10px] text-slate-400 font-mono">${escapeHTML(pduMetrics.pduA.receptaclesSummary)} &bull; Input: ${escapeHTML(pduMetrics.pduA.plugType)} &bull; ${pduMetrics.pduA.maxSafeAmps}A Continuous NEC Max</span>
          </div>
        </div>

        <div class="flex items-center gap-4 text-right">
          <div>
            <span class="text-[9px] text-slate-400 uppercase font-mono block">Load Amps</span>
            <span class="text-xs font-mono font-bold ${pduMetrics.pduA.pct > 80 ? 'text-rose-400' : 'text-white'}">${pduMetrics.pduA.amps}A / ${pduMetrics.pduA.maxSafeAmps}A</span>
          </div>
          <div>
            <span class="text-[9px] text-slate-400 uppercase font-mono block">Power Draw</span>
            <span class="text-xs font-mono font-bold text-indigo-300">${pduMetrics.pduA.watts}W (${pduMetrics.pduA.pct}%)</span>
          </div>
          <button
            type="button"
            onclick="openRackPowerMatrixModal('PDU-A', 1)"
            class="px-2.5 py-1 rounded-lg bg-emerald-950 hover:bg-emerald-900 border border-emerald-600 text-[10px] font-mono font-bold text-emerald-300 hover:text-white flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <i data-lucide="plug-zap" class="w-3 h-3 text-emerald-400"></i>
            <span>Power Matrix</span>
          </button>
        </div>
      </div>

      <!-- Interactive Receptacle Grid across width (R01-R${pduMetrics.pduA.totalOutlets}) -->
      <div class="${horizGridClass} pt-2 border-t border-slate-800/80">
        ${pduMetrics.pduA.outlets.map(o => {
          const isOccupied = Boolean(o.occupied && o.assignment);
          const a = o.assignment;
          return `
            <button
              type="button"
              onclick="openRackPowerMatrixModal('PDU-A', ${o.outletNumber})"
              class="px-2 py-1.5 rounded-lg bg-slate-950 border ${isOccupied ? 'border-indigo-500/70 bg-indigo-950/40 text-indigo-300 hover:border-indigo-400' : 'border-slate-800 text-slate-600 hover:border-slate-600'} text-center font-mono text-[9px] transition-all cursor-pointer"
              title="${escapeHTML(isOccupied ? `${a.pduReceptacleTag} (${o.socketType}) ⟷ ${a.powerCordId} [${a.cordSku}] ⟷ U${a.rackSlot} ${a.devicePsuTag} (${a.watts}W)` : `${o.receptacleTag} (${o.socketType}) — Open`)}"
            >
              <div class="text-[8px] text-slate-400 uppercase font-bold">${o.outletCode}</div>
              <div class="text-[10px] mt-0.5 truncate ${isOccupied ? 'text-white font-bold' : 'text-slate-600'}">${isOccupied ? escapeHTML(a.devicePsuTag) : 'OPEN'}</div>
              <div class="text-[8px] ${isOccupied ? 'text-indigo-300' : 'text-slate-700'}">${isOccupied ? `${a.watts}W` : escapeHTML(o.shortSocket || '5-20R')}</div>
            </button>
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
            onclick="switchActiveRackElevation('${escapeJSAttr(parsed.space)} • Pole Mount')"
            ondragover="handleLocationTransferDragOver(event)"
            ondragleave="handleLocationTransferDragLeave(event)"
            ondrop="handleLocationTransferDrop(event, '${escapeJSAttr(parsed.space)} • Pole Mount')"
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
                ondrop="handleLocationTransferDrop(event, '${escapeJSAttr(parsed.space)} • ${escapeJSAttr(enc.name)}')"
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
                  onclick="switchActiveRackElevation('${escapeJSAttr(parsed.space)} • ${escapeJSAttr(enc.name)}')"
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

    const itemHeight = getRackItemHeight(targetItem);
    if (itemHeight <= 0) {
      // 0U items (e.g. vertical PDUs) mount to 0U rail
      targetItem.rackSlot = "0U-Left";
      FacilityStore.notifyWorkspaceChange();
      renderRackVisualizer();
      if (typeof updateBOMView === "function") updateBOMView();
      if (typeof showToast === "function") showToast(`Mounted 0U ${targetItem.model} in ${activeRackId}`);
      return;
    }

    // Build map of currently occupied slots in activeRackId WITHOUT wiping existing manual placements
    const slots = {};
    for (let u = 1; u <= activeRackHeight; u++) slots[u] = null;
    projectBOM.forEach(item => {
      if (item.parentInstanceId || item.instanceId === targetItem.instanceId) return;
      const itemLoc = FacilityStore.normalize(item.closetName || item.rackId);
      if (itemLoc !== activeRackId) return;
      const assignedU = parseInt(item.rackSlot, 10);
      const h = getRackItemHeight(item);
      if (assignedU && assignedU >= 1 && h > 0) {
        for (let offset = 0; offset < h; offset++) {
          if (assignedU + offset <= activeRackHeight) {
            slots[assignedU + offset] = item.instanceId;
          }
        }
      }
    });

    const isUps = getDeviceMountPriority(targetItem).priority === 7;
    const slot = isUps
      ? findNextAvailableSlot(slots, itemHeight, activeRackHeight)
      : findNextAvailableSlotFromTop(slots, itemHeight, activeRackHeight);

    if (!slot) {
      targetItem.rackSlot = null;
      if (typeof showToast === "function") {
        showToast(`Cannot mount ${targetItem.model}: no continuous ${itemHeight}U space available in ${activeRackId}.`);
      }
      return;
    }

    targetItem.rackSlot = slot;

    FacilityStore.notifyWorkspaceChange();
    renderRackVisualizer();
    if (typeof updateBOMView === "function") updateBOMView();
    if (typeof renderTopology === "function") renderTopology();
    if (typeof StorageService !== "undefined" && typeof StorageService.queueAutoSave === "function") {
      StorageService.queueAutoSave();
    }
    if (typeof showToast === "function") {
      const uLabel = itemHeight > 1 ? `U${slot}-U${slot + itemHeight - 1}` : `U${slot}`;
      showToast(`Mounted ${targetItem.model} at ${uLabel} in ${activeRackId}`);
    }
  } else if (hostType === "security_cabinet") {
    const occupied = new Set();
    projectBOM.forEach(item => {
      const itemLoc = FacilityStore.normalize(item.closetName || item.rackId);
      if (itemLoc === activeRackId && item.rackSlot) {
        const m = String(item.rackSlot).match(/(\d+)/);
        if (m) occupied.add(parseInt(m[1], 10));
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
      item.rackSlot = `Bay-${targetBay}`;
      item.closetName = activeRackId;
      item.rackId = activeRackId;
      FacilityStore.notifyWorkspaceChange();
      renderRackVisualizer();
      if (typeof showToast === "function") {
        showToast(`Mounted ${item.model} in Bay-${targetBay}`);
      }
    }
  } else if (hostType === "industrial_din") {
    const item = projectBOM.find(i => i.instanceId === instanceId);
    if (item) {
      item.rackSlot = "Rail-1";
      item.closetName = activeRackId;
      item.rackId = activeRackId;
      FacilityStore.notifyWorkspaceChange();
      renderRackVisualizer();
      if (typeof showToast === "function") {
        showToast(`Mounted ${item.model} on DIN Rail-1`);
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
      item.rackSlot = "Wall-Bracket";
      item.closetName = activeRackId;
      item.rackId = activeRackId;
      FacilityStore.notifyWorkspaceChange();
      renderRackVisualizer();
      if (typeof showToast === "function") {
        showToast(`Mounted ${item.model} on Backboard (Wall-Bracket)`);
      }
    }
  }
}
