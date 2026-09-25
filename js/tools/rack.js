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

function setHostSidebarTab(tabName) {
  activeHostTab = tabName === "endpoints" ? "endpoints" : "telemetry";
  
  const telBtn = document.getElementById("hostTabBtn-telemetry");
  const endBtn = document.getElementById("hostTabBtn-endpoints");
  const telContent = document.getElementById("hostTabContent-telemetry");
  const endContent = document.getElementById("hostTabContent-endpoints");

  if (activeHostTab === "endpoints") {
    if (endBtn) {
      endBtn.classList.replace("text-slate-400", "text-white");
      endBtn.classList.add("bg-indigo-600", "shadow");
    }
    if (telBtn) {
      telBtn.classList.replace("text-white", "text-slate-400");
      telBtn.classList.remove("bg-indigo-600", "shadow");
    }
    if (telContent) telContent.classList.add("hidden");
    if (endContent) endContent.classList.remove("hidden");
  } else {
    if (telBtn) {
      telBtn.classList.replace("text-slate-400", "text-white");
      telBtn.classList.add("bg-indigo-600", "shadow");
    }
    if (endBtn) {
      endBtn.classList.replace("text-white", "text-slate-400");
      endBtn.classList.remove("bg-indigo-600", "shadow");
    }
    if (telContent) telContent.classList.remove("hidden");
    if (endContent) endContent.classList.add("hidden");
  }

  if (window.lucide) lucide.createIcons();
}

// -----------------------------------------------------------
// Device & Form-Factor Compatibility Verification
// -----------------------------------------------------------
function checkDeviceHostCompatibility(item, hostType) {
  if (!item) return { compatible: true, matchBadge: "Universal", advisory: "" };

  const role = item.role || "";
  const cat = item.category || "";
  const model = item.model || "";
  const isRackDev = (item.rackUnits && parseInt(item.rackUnits, 10) > 0) || role === "Access" || role === "Core" || role === "Aggregation" || role === "Server" || role === "Storage" || role === "UPS" || role === "Structured Cabling" || role === "Core & Agg";
  const isSecurityDev = cat === "access_control" || role === "Access Control" || item.doorCapacity || item.controllerType || model.includes("LP") || model.includes("MR") || model.includes("Trove") || model.includes("FPO") || model.includes("eFlow");
  const isDinDev = item.isDinMounted || model.includes("DIN") || item.mounting === "DIN" || cat === "industrial_din";
  const isEdgeField = role === "Surveillance" || role === "Video" || role === "Wireless Bridge" || role === "Wireless" || role === "Accessory" || model.includes("Cam") || model.includes("Dome") || model.includes("Bullet") || model.includes("PTZ") || model.includes("NanoBeam") || model.includes("GigaBeam") || model.includes("AP");

  if (hostType === "equipment_rack") {
    if (isRackDev) return { compatible: true, matchBadge: "19\" EIA Match", advisory: "" };
    if (isDinDev) return { compatible: false, matchBadge: "DIN Form Factor", advisory: "Requires 19\" DIN bracket shelf to rack-mount" };
    if (isEdgeField) return { compatible: false, matchBadge: "Field Device", advisory: "Outdoor/Edge device — typically mounted on pole or wall" };
    return { compatible: true, matchBadge: "Hardware", advisory: "" };
  } else if (hostType === "security_cabinet") {
    if (isSecurityDev) return { compatible: true, matchBadge: "Subplate Match", advisory: "" };
    if (isRackDev) return { compatible: false, matchBadge: "Rackmount Chassis", advisory: "Large chassis requires 19\" EIA rack rails" };
    return { compatible: true, matchBadge: "Module", advisory: "" };
  } else if (hostType === "industrial_din") {
    if (isDinDev) return { compatible: true, matchBadge: "DIN-Rail Match", advisory: "" };
    if (isRackDev && (item.depthInches > 12 || parseInt(item.rackUnits, 10) > 1)) {
      return { compatible: false, matchBadge: "Exceeds Depth", advisory: "Full-depth 19\" unit exceeds NEMA box dimensions" };
    }
    return { compatible: true, matchBadge: "Hardened", advisory: "" };
  } else if (hostType === "structural_mount") {
    if (isEdgeField || isDinDev) return { compatible: true, matchBadge: "Pole Compatible", advisory: "" };
    if (isRackDev) return { compatible: false, matchBadge: "Indoor Rackmount", advisory: "Indoor chassis cannot withstand outdoor pole exposure" };
    return { compatible: true, matchBadge: "Edge Mount", advisory: "" };
  } else if (hostType === "architectural_backboard") {
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
// Host Selector & Taxonomy Synchronization
// -----------------------------------------------------------
function syncRackSelectorOptions() {
  const sel = document.getElementById("rackLocationSelector");
  const locations = FacilityStore.getLocations();
  const rackNames = locations.map(l => l.name);

  activeRackId = FacilityStore.normalize(activeRackId);
  if (activeRackId === FacilityStore.UNASSIGNED || !rackNames.includes(activeRackId)) {
    activeRackId = rackNames[0] || "MDF • Rack-1";
  }

  const parsed = FacilityStore.parse(activeRackId);
  const enclosures = FacilityStore.getEnclosures();
  const activeEnc = enclosures.find(e => e.id === parsed.hostId) || enclosures.find(e => e.name.toLowerCase() === parsed.hostName.toLowerCase()) || null;

  // Populate Host Dropdown with Host-Type Badges
  if (sel) {
    sel.innerHTML = locations.map(loc => {
      const typeDef = FacilityStore.HOST_TYPES[loc.hostType] || FacilityStore.HOST_TYPES.equipment_rack;
      const typeLabel = typeDef.badgeLabel || "Rack";
      const isSel = loc.name === activeRackId;
      return `<option value="${escapeHTML(loc.name)}" ${isSel ? 'selected' : ''}>[${typeLabel}] ${escapeHTML(loc.name)}</option>`;
    }).join('');
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
    const poleHeight = (activeEnc && activeEnc.poleHeightFt) ? activeEnc.poleHeightFt : (parsed.poleHeightFt || 20);
    const diam = (activeEnc && activeEnc.poleDiameterInches) ? activeEnc.poleDiameterInches : 4;
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
  }
  renderRackVisualizer();
  if (typeof showToast === "function") {
    showToast(`Updated ${parsed.hostName} ${propKey} to ${value}`);
  }
}

function switchActiveRackElevation(rackName) {
  activeRackId = FacilityStore.normalize(rackName);
  loadRackSettings();
  syncRackSelectorOptions();
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
  if (typeof openFacilityAddForm === "function") {
    openFacilityAddForm("add_host");
    if (typeof toggleFacilityModal === "function") {
      toggleFacilityModal();
    }
    return;
  }

  const currentCount = FacilityStore.getLocations().length;
  const name = prompt(
    "Enter new Mounting Host name (e.g. IDF-2 • Rack-1, MDF • Security-Cab-1, Pole 1 • NEMA-Box):",
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
    alert("You must retain at least one mounting host in the project.");
    return;
  }

  const fallbackRack = locations.find(r => r !== activeRackId) || "MDF • Rack-1";

  if (!confirm(`Delete "${activeRackId}"? All assigned hardware will be moved to "${fallbackRack}".`)) {
    return;
  }

  const success = FacilityStore.deleteLocation(activeRackId, fallbackRack);
  if (success) {
    activeRackId = fallbackRack;
    syncRackSelectorOptions();
    renderRackVisualizer();
    if (typeof showToast === "function") {
      showToast(`Mounting host removed. Hardware moved to ${fallbackRack}.`);
    }
  }
}

// -----------------------------------------------------------
// Auto-Mount & Unmount Actions (With Form-Factor Affinity)
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

  let mountedCount = 0;

  if (hostType === "equipment_rack") {
    // 19" Rack U-slot filling
    const slots = {};
    for (let u = 1; u <= activeRackHeight; u++) slots[u] = null;
    mountableItems.forEach(i => i.rackSlot = null);

    mountableItems.forEach(item => {
      const itemHeight = parseInt(item.rackUnits || 1, 10);
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
// Main Visualizer Router
// -----------------------------------------------------------
function renderRackVisualizer() {
  const frame = document.getElementById("rackElevationFrame");
  if (!frame) return;

  syncRackSelectorOptions();

  const parsed = FacilityStore.parse(activeRackId);
  const enclosures = FacilityStore.getEnclosures();
  const activeEnc = enclosures.find(e => e.id === parsed.hostId) || enclosures.find(e => e.name.toLowerCase() === parsed.hostName.toLowerCase()) || null;

  const assignedItems = [];
  const unassignedItems = [];

  if (typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) {
    projectBOM.forEach(item => {
      if (item.parentInstanceId) return;
      if (item.role === "Optics & DAC" || item.role === "Mgmt License" || item.role === "Security License") return;

      const rawLoc = item.closetName || item.rackId;
      const itemLoc = FacilityStore.normalize(rawLoc);

      if (itemLoc === FacilityStore.UNASSIGNED) {
        unassignedItems.push(item);
      } else if (itemLoc === activeRackId) {
        assignedItems.push(item);
      }
    });
  }

  // Branch rendering based on Host Type
  const hostType = parsed.hostType;
  const titleEl = document.getElementById("elevationFrameTitle");
  const hostTypeDef = FacilityStore.HOST_TYPES[hostType] || FacilityStore.HOST_TYPES.equipment_rack;

  if (titleEl) {
    titleEl.innerHTML = `
      <i data-lucide="${hostTypeDef.icon || 'server'}" class="w-3.5 h-3.5 text-indigo-400"></i>
      <span>${escapeHTML(activeRackId)} &bull; ${hostTypeDef.label}</span>
    `;
  }

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
// 1. Host Renderer: 19" EIA Equipment Rack
// -----------------------------------------------------------
function renderEquipmentRackFrame(frame, assignedItems, unassignedItems, parsed, activeEnc) {
  const slots = {};
  for (let u = 1; u <= activeRackHeight; u++) slots[u] = null;

  assignedItems.forEach(item => {
    const itemHeight = parseInt(item.rackUnits || 1, 10);
    const assignedU = parseInt(item.rackSlot, 10);

    if (assignedU && assignedU >= 1 && (assignedU + itemHeight - 1) <= activeRackHeight) {
      if (!isCollision(slots, assignedU, itemHeight, item.instanceId)) {
        for (let offset = 0; offset < itemHeight; offset++) {
          slots[assignedU + offset] = {
            item,
            isBase: offset === 0,
            span: itemHeight
          };
        }
      }
    }
  });

  let railHTML = "";

  for (let u = activeRackHeight; u >= 1; u--) {
    const slotData = slots[u];

    if (slotData) {
      if (slotData.isBase) {
        const it = slotData.item;
        const compat = checkDeviceHostCompatibility(it, "equipment_rack");
        railHTML += `
          <div 
            class="group relative bg-slate-900 border ${compat.compatible ? 'border-indigo-500/60 hover:border-indigo-400' : 'border-amber-500/60 hover:border-amber-400'} rounded-lg px-3 py-2 flex items-center justify-between cursor-move shadow-md transition-all select-none"
            draggable="true"
            ondragstart="handleRackItemDragStart(event, '${it.instanceId}')"
            ondragover="handleRackSlotDragOver(event)"
            ondrop="handleRackSlotDrop(event, ${u})"
            style="min-height: ${Math.max(40, slotData.span * 42)}px;"
          >
            <div class="flex items-center gap-3 min-w-0">
              <span class="text-[11px] font-mono font-bold text-indigo-400 w-7 shrink-0">U${u}</span>
              <div class="min-w-0">
                <span class="text-xs font-bold text-white block truncate">${escapeHTML(it.model)}</span>
                <span class="text-[10px] text-slate-400 font-mono block truncate">${escapeHTML(it.vendor || 'Generic')} &bull; ${slotData.span}U &bull; ${it.baseWatts || 0}W Base</span>
              </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              ${!compat.compatible ? `
                <span class="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800" title="${compat.advisory}">⚠️ Bracket Req</span>
              ` : ''}
              <span class="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 ${getRoleColor(it.role)}">${escapeHTML(it.role || 'Hardware')}</span>
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

  // Append Unassigned Staging Tray
  railHTML += renderUnassignedTrayHTML(unassignedItems, "equipment_rack", "Drag into empty U-slot above");
  frame.innerHTML = railHTML;

  const badgeEl = document.getElementById("rackUtilizationBadge");
  const occupiedU = Object.values(slots).filter(s => s && s.isBase).reduce((acc, s) => acc + s.span, 0);
  if (badgeEl) badgeEl.innerText = `${occupiedU} / ${activeRackHeight} U Used`;
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
          <span class="text-xs font-bold text-white block">Trove / LifeSafety Subplate Chassis</span>
          <span class="text-[10px] text-emerald-400 font-mono">${totalBays} Modular Bays &bull; ${dcVoltage === 'dual_12_24' ? 'Dual 12V / 24VDC Bus' : '24VDC Lock Power'}</span>
        </div>
      </div>
      <div class="flex items-center gap-2">
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
            <span class="text-xs font-bold text-white block truncate mb-0.5">${escapeHTML(item.model)}</span>
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

  // Append Unassigned Staging Tray
  bayGridHTML += renderUnassignedTrayHTML(unassignedItems, "security_cabinet", "Drag into empty Bay slot above");
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
          <span class="text-xs font-bold text-white block">NEMA 4X / IP66 Weatherproof Enclosure</span>
          <span class="text-[10px] ${isPoleMounted ? 'text-cyan-400' : 'text-amber-400'} font-mono">
            ${isPoleMounted ? 'Pole Mount (Stainless Steel Banding)' : 'Wall Mount (Heavy-Duty Strut Flanges)'} &bull; ${numRails}x 35mm Rails &bull; ${railLengthMm}mm Width
          </span>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-[10px] font-mono ${isPoleMounted ? 'text-cyan-300 bg-cyan-950/60 border-cyan-800' : 'text-emerald-400 bg-emerald-950/60 border-emerald-800'} px-2 py-0.5 rounded border">
          ${isPoleMounted ? 'Pole Strapped' : 'Wall Flanged'}
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
                <span class="text-[11px] font-bold text-white block truncate mb-0.5">${escapeHTML(it.model)}</span>
                <span class="text-[9px] font-mono text-slate-400 block truncate">${it.ports ? `${it.ports}-Port Switch` : (it.role || 'DIN Hardware')}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // Append Unassigned Staging Tray
  dinHTML += renderUnassignedTrayHTML(unassignedItems, "industrial_din", "Drag into empty DIN rail above");
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
  const poleHeight = (activeEnc && activeEnc.poleHeightFt) ? activeEnc.poleHeightFt : (parsed.poleHeightFt || 20);
  const diam = (activeEnc && activeEnc.poleDiameterInches) ? activeEnc.poleDiameterInches : (parsed.poleDiameterInches || 4);

  // Dynamic Height Elevations
  const topElevation = poleHeight;
  const upperElevation = Math.max(8, Math.round(poleHeight * 0.8));
  const midElevation = Math.max(4, Math.round(poleHeight * 0.4));
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
    poleHTML += `
      <div 
        class="bg-slate-900 border border-slate-800 rounded-xl p-3"
        ondragover="handleRackSlotDragOver(event)"
        ondrop="handlePoleZoneDrop(event, '${z.id}')"
      >
        <div class="flex items-center justify-between mb-1.5">
          <span class="text-[11px] font-bold text-cyan-400 font-mono flex items-center gap-1.5">
            <i data-lucide="${z.icon}" class="w-3.5 h-3.5"></i> ${z.label}
          </span>
          <span class="text-[9px] font-mono text-slate-500">${itemsInZone.length} Device${itemsInZone.length === 1 ? '' : 's'}</span>
        </div>
        <p class="text-[10px] text-slate-400 mb-2">${z.desc}</p>

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
              <div class="flex items-center gap-2 min-w-0">
                <span class="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-800/80">@ ${z.heightFt}ft</span>
                <span class="text-xs font-bold text-white truncate">${escapeHTML(it.model)}</span>
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

  // Append Unassigned Staging Tray
  poleHTML += renderUnassignedTrayHTML(unassignedItems, "structural_mount", "Drag into elevation zone above");
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
          <span class="text-xs font-bold text-white block">AC-Grade Fire-Rated Plywood Backboard</span>
          <span class="text-[10px] text-purple-400 font-mono">${widthFt}' x ${heightFt}' (${sqFt} sq ft) &bull; Fire-Marshal Rated Stamp &bull; NEC 110.26 Compliant</span>
        </div>
      </div>
      <div class="flex items-center gap-2">
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
              <div class="flex items-center gap-2 min-w-0">
                <span class="text-xs font-bold text-white truncate">${escapeHTML(it.model)}</span>
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

  // Append Unassigned Staging Tray
  boardHTML += renderUnassignedTrayHTML(unassignedItems, "architectural_backboard", "Drag into backboard quadrant above");
  frame.innerHTML = boardHTML;

  const badgeEl = document.getElementById("rackUtilizationBadge");
  if (badgeEl) badgeEl.innerText = `${assignedItems.length} Items Mounted`;
}

// -----------------------------------------------------------
// Shared Unassigned Staging Tray Component (With Compatibility Badges)
// -----------------------------------------------------------
function renderUnassignedTrayHTML(unassignedItems, activeHostType = "equipment_rack", instructionText = "Drag into empty slot above") {
  return `
    <div class="pt-3 mt-3 border-t border-slate-800">
      <div class="flex items-center justify-between mb-2">
        <span class="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
          <i data-lucide="inbox" class="w-3.5 h-3.5"></i> Unassigned Staging Area (${unassignedItems.length})
        </span>
        <span class="text-[9px] text-slate-500 font-mono">${instructionText}</span>
      </div>
      <div class="space-y-1.5 max-h-36 overflow-y-auto pr-1">
        ${unassignedItems.length === 0 ? `
          <div class="p-2.5 rounded-lg border border-dashed border-slate-800 text-center text-[10px] text-slate-500">
            No unassigned items. All hardware is currently mounted or mapped.
          </div>
        ` : unassignedItems.map(it => {
          const compat = checkDeviceHostCompatibility(it, activeHostType);
          return `
            <div 
              class="bg-slate-900/90 border ${compat.compatible ? 'border-amber-500/40 hover:border-amber-400' : 'border-slate-800 hover:border-slate-700 opacity-80'} p-2 rounded-lg flex items-center justify-between cursor-move shadow-sm select-none"
              draggable="true"
              ondragstart="handleRackItemDragStart(event, '${it.instanceId}')"
            >
              <div class="min-w-0 flex items-center gap-2">
                <span class="text-[10px] font-mono font-bold text-amber-400 bg-amber-950/40 px-1 py-0.5 rounded border border-amber-800/60 shrink-0">
                  ${it.rackUnits ? `${it.rackUnits}U` : (it.role || 'Device')}
                </span>
                <span class="text-xs font-bold text-slate-200 truncate block">${escapeHTML(it.model)}</span>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                ${compat.compatible ? `
                  <span class="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/80">● Form-Factor Match</span>
                ` : `
                  <span class="text-[9px] font-mono font-bold text-amber-300 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/80" title="${compat.advisory}">⚠️ ${compat.matchBadge}</span>
                `}
                <span class="text-[10px] font-mono text-slate-400">${escapeHTML(it.vendor || '')}</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
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

function handleRackSlotDrop(e, targetU) {
  e.preventDefault();
  const instanceId = draggedRackItemInstanceId || e.dataTransfer.getData("text/plain");
  if (!instanceId || typeof projectBOM === "undefined") return;

  const item = projectBOM.find(i => i.instanceId === instanceId);
  if (!item) return;

  const itemHeight = parseInt(item.rackUnits || 1, 10);
  if ((targetU + itemHeight - 1) > activeRackHeight) {
    if (typeof showToast === "function") {
      showToast(`Cannot place ${itemHeight}U device at U${targetU}: exceeds cabinet top.`);
    }
    return;
  }

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
    let occupiedU = 0, totalPoE = 0, totalBaseWatts = 0;
    assignedItems.forEach(it => {
      if (it.rackSlot) occupiedU += parseInt(it.rackUnits || 1, 10);
      totalPoE += parseFloat(it.poeBudget || 0);
      totalBaseWatts += parseFloat(it.baseWatts || 0);
    });

    const operatingAcWatts = Math.round(totalBaseWatts + (totalPoE * 0.5));
    const worstCaseWatts = Math.round(totalBaseWatts + totalPoE);
    const worstCaseBTU = Math.round(worstCaseWatts * 3.412142);
    const tonsCooling = Math.round((worstCaseBTU / 12000) * 10) / 10;
    const operatingAmps = Math.round((operatingAcWatts / (120 * 0.92)) * 10) / 10;
    const worstCaseAmps = Math.round((worstCaseWatts / (120 * 0.92)) * 10) / 10;
    const circuitSpec = worstCaseWatts > 1440 ? "120V 20A Dedicated Circuit (NEMA 5-20R)" : "120V 15A Dedicated Circuit (NEMA 5-15R)";

    const upsMinVA = Math.round(worstCaseWatts / 0.90);
    const upsRecVA = Math.round((worstCaseWatts / 0.90) * 1.25);
    const upsModel = worstCaseWatts > 1200 ? "2200VA 2U Line-Interactive" : "1500VA 2U Line-Interactive";

    container.innerHTML = `
      <h3 class="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between">
        <span class="flex items-center gap-1.5 text-amber-400">
          <i data-lucide="zap" class="w-4 h-4"></i> Cabinet Electrical Load
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
          <span>Operating Design Load:</span>
          <span class="font-mono text-sky-400 font-semibold">${operatingAcWatts} W (${operatingAmps} A @ 120V)</span>
        </div>
        <div class="flex justify-between text-slate-300 font-bold pt-2 border-t border-slate-800">
          <span>Worst-Case Nameplate:</span>
          <span class="font-mono text-amber-400">${worstCaseWatts.toLocaleString()} W (${worstCaseAmps} A)</span>
        </div>
        <div class="flex justify-between text-slate-400 text-[11px]">
          <span>BTU Heat Output:</span>
          <span class="font-mono text-slate-300">${worstCaseBTU.toLocaleString()} BTU/hr (${tonsCooling} Tons AC)</span>
        </div>
        <div class="pt-2 border-t border-slate-800/80">
          <span class="text-[10px] text-slate-500 uppercase font-mono block mb-0.5">Required Branch Circuit:</span>
          <span class="font-mono text-emerald-400 text-[11px] font-bold block">${circuitSpec}</span>
        </div>
      </div>
    `;

    if (auxContainer) {
      auxContainer.innerHTML = `
        <h3 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
          <i data-lucide="battery-charging" class="w-4 h-4 text-emerald-400"></i> UPS Sizing Recommendation
        </h3>
        <div class="text-xs text-slate-300 space-y-1">
          <div class="font-bold text-emerald-400 flex items-center justify-between">
            <span class="truncate max-w-[240px]">${upsModel}</span>
            <span class="font-mono text-[11px] text-emerald-300 font-bold shrink-0">${upsRecVA} VA</span>
          </div>
          <div class="text-[11px] text-slate-400">
            Minimum ${upsMinVA}VA load + 25% buffer &bull; 2U Rackmount
          </div>
          <div class="text-[10px] text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
            <i data-lucide="clock" class="w-3 h-3 text-slate-400 shrink-0"></i>
            <span>12 - 18 minutes on battery</span>
          </div>
        </div>
      `;
    }

    if (fieldContainer) {
      const fieldItems = assignedItems.filter(i => !i.rackSlot);
      fieldContainer.innerHTML = `
        <h3 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
          <i data-lucide="radio-tower" class="w-4 h-4 text-amber-400"></i> Unslotted / Side-Mounted Modules
        </h3>
        <div class="space-y-1.5 pt-1">
          ${fieldItems.length === 0 ? `
            <span class="text-slate-500 text-[11px] block py-1">All hardware is slotted into 19" EIA units.</span>
          ` : fieldItems.map(it => `
            <div class="bg-slate-950 p-2 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
              <div>
                <span class="font-bold text-white block truncate max-w-[200px]">${escapeHTML(it.model)}</span>
                <span class="text-[10px] text-amber-400 font-mono">${it.role || 'Accessory'}</span>
              </div>
              <span class="font-mono text-[11px] text-slate-400 font-bold">${it.qty || 1}x</span>
            </div>
          `).join('')}
        </div>
      `;
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
    totalBase += parseFloat(it.baseWatts || 0);
    totalPoE += parseFloat(it.poeBudget || 0);
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
// Served Edge Endpoints & Cabling Links
// -----------------------------------------------------------
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

  if (countBadge) countBadge.innerText = servedEndpoints.length.toString();

  // Also calculate field cabling rollups
  let totalCompositeCables = 0;
  let totalCat6aDrops = 0;
  let totalFiberRuns = 0;

  servedEndpoints.forEach(ep => {
    if (ep.endpointType === "door_portal") totalCompositeCables++;
    else if (ep.endpointType === "surveillance_point" || ep.endpointType === "wireless_node" || ep.endpointType === "telecom_outlet") totalCat6aDrops++;
    else if (ep.mediaType && ep.mediaType.includes("fiber")) totalFiberRuns++;
  });

  container.innerHTML = `
    <!-- Cabling Rollup Header Strip -->
    <div class="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
      <div class="flex items-center justify-between">
        <span class="text-xs font-bold text-white flex items-center gap-1.5">
          <i data-lucide="network" class="w-3.5 h-3.5 text-indigo-400"></i> Served Edge Cabling
        </span>
        <span class="text-[10px] font-mono text-emerald-400">${servedEndpoints.length} Active Drops</span>
      </div>
      <div class="grid grid-cols-2 gap-2 text-[11px] font-mono">
        <div class="bg-slate-900 p-2 rounded-lg border border-slate-800">
          <span class="text-slate-400 block text-[9px] uppercase">Composite Banana</span>
          <span class="text-white font-bold">${totalCompositeCables} Runs</span>
        </div>
        <div class="bg-slate-900 p-2 rounded-lg border border-slate-800">
          <span class="text-slate-400 block text-[9px] uppercase">Cat6A Plenum</span>
          <span class="text-white font-bold">${totalCat6aDrops} Drops</span>
        </div>
      </div>
    </div>

    <!-- Quick Add Endpoint Button -->
    <div class="flex items-center justify-between pt-1">
      <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Homed Field Devices</span>
      <button onclick="promptAddEndpointToActiveHost()" class="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-sm transition-colors">
        <i data-lucide="plus" class="w-3 h-3"></i> Add Drop
      </button>
    </div>

    <!-- Endpoints List -->
    <div class="space-y-2 max-h-64 overflow-y-auto pr-1">
      ${servedEndpoints.length === 0 ? `
        <div class="border border-dashed border-slate-800 rounded-xl p-4 text-center text-xs text-slate-500">
          <i data-lucide="network" class="w-5 h-5 mx-auto mb-1 text-slate-600 opacity-60"></i>
          <span>No field drops are currently homed to ${escapeHTML(activeRackId)}.</span>
          <button onclick="promptAddEndpointToActiveHost()" class="mt-2 block mx-auto text-indigo-400 hover:underline text-[11px]">
            + Add Door, Camera, or Outlet
          </button>
        </div>
      ` : servedEndpoints.map(ep => {
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

function escapeHTML(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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
    activeRackHeight = val ? parseInt(val, 10) : 24;
  } catch (e) {
    activeRackHeight = 24;
  }
}