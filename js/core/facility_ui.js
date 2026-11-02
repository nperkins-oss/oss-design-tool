// =========================================================================
// FACILITY HIERARCHY MANAGER UI & DRAG-AND-DROP CONTROLLER
// Separated from js/core/facility.js for modular maintainability
// =========================================================================

// -----------------------------------------------------------
// FACILITY HIERARCHY MANAGER MODAL CONTROLLER
// -----------------------------------------------------------
let activeFacilityFloorId = "floor-main";
let activeFacilitySpaceId = "space-mdf";
let facilityActiveForm = null; // null | "add_floor" | "add_space" | "add_host"
let facilityNewHostType = "equipment_rack";
let facilityActiveView = "hierarchy"; // "hierarchy" | "visualizer"
let previousFacilityFloorId = null;
let previousFacilitySpaceId = null;

function syncVisualizerBreadcrumbs() {
  const currentHost = (typeof activeRackId !== "undefined") ? activeRackId : "MDF • Rack-1";
  const parsed = FacilityStore.parse(currentHost);
  const floors = FacilityStore.getFloors();
  const spaces = FacilityStore.getSpaces();

  let floorObj = null;
  let spaceObj = null;

  if (parsed.spaceId) {
    spaceObj = spaces.find(s => s.id === parsed.spaceId);
  }
  if (!spaceObj && parsed.space) {
    spaceObj = spaces.find(s => s.name.toLowerCase() === parsed.space.toLowerCase());
  }

  if (spaceObj) {
    floorObj = floors.find(f => f.id === spaceObj.floorId);
  }
  if (!floorObj && parsed.floorId) {
    floorObj = floors.find(f => f.id === parsed.floorId);
  }
  if (!floorObj && floors.length > 0) {
    floorObj = floors[0];
  }

  const floorEl = document.getElementById("facilityBreadcrumbFloor");
  const spaceEl = document.getElementById("facilityBreadcrumbSpace");
  const hostEl = document.getElementById("facilityBreadcrumbHost");
  const badgeEl = document.getElementById("hostTypeBadge");
  const subtitleEl = document.getElementById("hostModalSubtitle");

  const floorName = floorObj ? floorObj.name : "Facility";
  const spaceName = spaceObj ? spaceObj.name : (parsed.space || "Telecom Space");
  const hostName = parsed.hostName || "Enclosure";

  if (floorEl) floorEl.textContent = floorName;
  if (spaceEl) spaceEl.textContent = spaceName;
  if (hostEl) hostEl.textContent = hostName;

  const hostTypeDef = FacilityStore.HOST_TYPES[parsed.hostType] || FacilityStore.HOST_TYPES.equipment_rack;
  if (badgeEl) {
    badgeEl.textContent = hostTypeDef.label;
    if (typeof getHostBadgeStyles === "function") {
      badgeEl.className = `text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${getHostBadgeStyles(parsed.hostType)} ml-1`;
    }
  }
  if (subtitleEl) {
    subtitleEl.textContent = `${hostTypeDef.label} • ${spaceName} • Level ${floorObj?.levelIndex || 1} (${floorName})`;
  }
}

function openPortMatrixForActiveRack() {
  const loc = typeof activeRackId !== "undefined" ? activeRackId : null;
  if (typeof openPortMatrixStudio === "function") {
    openPortMatrixStudio(loc);
  } else if (window.TabManager) {
    window.TabManager.openTab("port_matrix", { switchInstanceId: loc });
  }
}
window.openPortMatrixForActiveRack = openPortMatrixForActiveRack;

function switchFacilityView(viewName, targetLocName) {
  if (viewName === "port_matrix") {
    if (typeof openPortMatrixStudio === "function") {
      openPortMatrixStudio(targetLocName || (typeof activeRackId !== "undefined" ? activeRackId : null));
    } else if (window.TabManager) {
      window.TabManager.openTab("port_matrix", { switchInstanceId: targetLocName || (typeof activeRackId !== "undefined" ? activeRackId : null) });
    }
    return;
  }

  const targetTabKey = (viewName === "visualizer") ? "enclosures" : "facility";
  const facModal = document.getElementById("facilityModal");
  if (facModal && facModal.classList.contains("hidden") && window.TabManager && typeof window.TabManager.openTab === "function") {
    window.TabManager.openTab(targetTabKey, targetLocName ? { locationName: targetLocName } : null);
    return;
  }

  facilityActiveView = (viewName === "visualizer") ? "visualizer" : "hierarchy";
  window.facilityActiveView = facilityActiveView;
  const hierarchyView = document.getElementById("facilityHierarchyView");
  const visualizerView = document.getElementById("facilityVisualizerView");
  const titleHierarchy = document.getElementById("facilityTitleHierarchy");
  const titleVisualizer = document.getElementById("facilityTitleVisualizer");
  const visualizerControls = document.getElementById("facilityVisualizerControls");

  if (facilityActiveView === "visualizer") {
    // Record current position for smooth back button navigation
    if (activeFacilityFloorId) previousFacilityFloorId = activeFacilityFloorId;
    if (activeFacilitySpaceId) previousFacilitySpaceId = activeFacilitySpaceId;

    if (hierarchyView) hierarchyView.classList.add("hidden");
    if (visualizerView) visualizerView.classList.remove("hidden");
    if (titleHierarchy) titleHierarchy.classList.add("hidden");
    if (titleVisualizer) titleVisualizer.classList.remove("hidden");
    if (visualizerControls) visualizerControls.classList.remove("hidden");

    if (targetLocName && typeof switchActiveRackElevation === "function") {
      switchActiveRackElevation(targetLocName);
    } else {
      if (typeof syncRackSelectorOptions === "function") syncRackSelectorOptions();
      if (typeof loadRackSettings === "function") loadRackSettings();
      if (typeof renderRackVisualizer === "function") renderRackVisualizer();
    }
    syncVisualizerBreadcrumbs();
  } else {
    // Return to hierarchy & spaces
    if (hierarchyView) hierarchyView.classList.remove("hidden");
    if (visualizerView) visualizerView.classList.add("hidden");
    if (titleHierarchy) titleHierarchy.classList.remove("hidden");
    if (titleVisualizer) titleVisualizer.classList.add("hidden");
    if (visualizerControls) visualizerControls.classList.add("hidden");

    // Restore previous floor and space if set
    const floors = FacilityStore.getFloors();
    if (previousFacilityFloorId && floors.some(f => f.id === previousFacilityFloorId)) {
      activeFacilityFloorId = previousFacilityFloorId;
    }
    const spaces = FacilityStore.getSpaces();
    if (previousFacilitySpaceId && spaces.some(s => s.id === previousFacilitySpaceId)) {
      activeFacilitySpaceId = previousFacilitySpaceId;
    }

    renderFacilityManager();
  }

  if (window.TabManager && typeof window.TabManager.syncTabBarState === "function") {
    window.TabManager.syncTabBarState(targetTabKey);
  }
  if (typeof updateFacilitySubNavUI === "function") updateFacilitySubNavUI();
  if (window.lucide) lucide.createIcons();
}

function handleFacilityModalCloseOrBack() {
  if (facilityActiveView === "visualizer") {
    // Navigate back to spaces view without closing the modal
    switchFacilityView("hierarchy");
  } else {
    const modal = document.getElementById("facilityModal");
    if (modal) modal.classList.add("hidden");
  }
}

function toggleFacilityModal() {
  const modal = document.getElementById("facilityModal");
  if (!modal) return;

  if (modal.classList.contains("hidden")) {
    modal.classList.remove("hidden");
    facilityActiveForm = null;
    const floors = FacilityStore.getFloors();
    if (!floors.some(f => f.id === activeFacilityFloorId)) {
      activeFacilityFloorId = floors[0] ? floors[0].id : "floor-main";
    }
    const spaces = FacilityStore.getSpaces(activeFacilityFloorId);
    if (!spaces.some(s => s.id === activeFacilitySpaceId)) {
      activeFacilitySpaceId = spaces[0] ? spaces[0].id : (FacilityStore.getSpaces()[0] ? FacilityStore.getSpaces()[0].id : "space-mdf");
    }
    switchFacilityView("hierarchy");
  } else {
    modal.classList.add("hidden");
    facilityActiveForm = null;
  }
}

function openFacilityModal(view = "hierarchy") {
  const modal = document.getElementById("facilityModal");
  if (!modal) return;
  modal.classList.remove("hidden");
  facilityActiveForm = null;
  const floors = FacilityStore.getFloors();
  if (!floors.some(f => f.id === activeFacilityFloorId)) {
    activeFacilityFloorId = floors[0] ? floors[0].id : "floor-main";
  }
  const spaces = FacilityStore.getSpaces(activeFacilityFloorId);
  if (!spaces.some(s => s.id === activeFacilitySpaceId)) {
    activeFacilitySpaceId = spaces[0] ? spaces[0].id : (FacilityStore.getSpaces()[0] ? FacilityStore.getSpaces()[0].id : "space-mdf");
  }
  switchFacilityView(view);
}

function openFacilityAddForm(formType) {
  const floors = FacilityStore.getFloors();
  if ((formType === "add_space" || formType === "add_host") && floors.length === 0) {
    if (typeof showToast === "function") showToast("Please create a floor/building first.");
    facilityActiveForm = "add_floor";
  } else if (formType === "add_host") {
    const currentFloor = floors.find(f => f.id === activeFacilityFloorId) || floors[0];
    const spaces = currentFloor ? FacilityStore.getSpaces(currentFloor.id) : [];
    if (spaces.length === 0) {
      if (typeof showToast === "function") showToast("Please create a telecom space first.");
      facilityActiveForm = "add_space";
    } else {
      facilityActiveForm = formType;
    }
  } else {
    facilityActiveForm = formType;
  }
  renderFacilityManager();
  // Focus the first input of the open form
  setTimeout(() => {
    if (facilityActiveForm === "add_floor") {
      const el = document.getElementById("inlineFloorName");
      if (el) el.focus();
    } else if (facilityActiveForm === "add_space") {
      const el = document.getElementById("inlineSpaceName");
      if (el) el.focus();
    } else if (facilityActiveForm === "add_host") {
      const el = document.getElementById("inlineHostName");
      if (el) el.focus();
    }
  }, 50);
}

function closeFacilityAddForm() {
  facilityActiveForm = null;
  renderFacilityManager();
}

function setFacilityNewHostType(type) {
  facilityNewHostType = type;
  renderFacilityManager();
}

function saveInlineFloor() {
  const nameInput = document.getElementById("inlineFloorName");
  const heightInput = document.getElementById("inlineFloorHeight");
  const errEl = document.getElementById("inlineFloorError");
  const name = nameInput ? nameInput.value.trim() : "";
  const height = heightInput ? parseInt(heightInput.value, 10) : 14;

  if (errEl) errEl.classList.add("hidden");

  if (!name) {
    if (errEl) {
      errEl.textContent = "Please enter a floor/building name.";
      errEl.classList.remove("hidden");
    } else if (typeof showToast === "function") {
      showToast("Please enter a floor/building name");
    }
    return;
  }

  const floors = FacilityStore.getFloors();
  if (floors.some(f => f.name.trim().toLowerCase() === name.toLowerCase())) {
    if (errEl) {
      errEl.textContent = `A floor/building named "${name}" already exists.`;
      errEl.classList.remove("hidden");
    } else if (typeof showToast === "function") {
      showToast(`A floor/building named "${name}" already exists.`);
    }
    return;
  }

  const f = FacilityStore.addFloor(name, height || 14);
  if (!f) return;
  activeFacilityFloorId = f.id;
  facilityActiveForm = null;
  renderFacilityManager();
  if (typeof showToast === "function") showToast(`Added floor/building "${name}"`);
}

function saveInlineSpace() {
  const nameInput = document.getElementById("inlineSpaceName");
  const typeSelect = document.getElementById("inlineSpaceType");
  const pHeightInput = document.getElementById("inlineSpacePoleHeight");
  const errEl = document.getElementById("inlineSpaceError");
  const name = nameInput ? nameInput.value.trim() : "";
  const type = typeSelect ? typeSelect.value : "idf";

  if (errEl) errEl.classList.add("hidden");

  if (!name) {
    if (errEl) {
      errEl.textContent = "Please enter a space name.";
      errEl.classList.remove("hidden");
    } else if (typeof showToast === "function") {
      showToast("Please enter a space name");
    }
    return;
  }

  const floors = FacilityStore.getFloors();
  const currentFloor = floors.find(f => f.id === activeFacilityFloorId) || floors[0] || null;
  const targetFloorId = currentFloor ? currentFloor.id : (activeFacilityFloorId || "floor-1");
  activeFacilityFloorId = targetFloorId;

  const spaces = FacilityStore.getSpaces(targetFloorId);
  if (spaces.some(s => s.name.trim().toLowerCase() === name.toLowerCase())) {
    if (errEl) {
      errEl.textContent = `A space named "${name}" already exists in this area.`;
      errEl.classList.remove("hidden");
    } else if (typeof showToast === "function") {
      showToast(`A space named "${name}" already exists in this area.`);
    }
    return;
  }

  const poleHeightFt = pHeightInput ? parseInt(pHeightInput.value, 10) : 25;
  const s = FacilityStore.addSpace(name, type, targetFloorId, { poleHeightFt, poleDiameterInches: 4 });
  if (!s) return;
  activeFacilitySpaceId = s.id;
  facilityActiveForm = null;
  renderFacilityManager();

  const newLocKey = `${s.name} • Field`;
  const pendingCtx = (typeof getPendingFacilityLocationContext === "function") ? getPendingFacilityLocationContext() : null;
  if (pendingCtx) {
    if (typeof clearPendingFacilityLocationContext === "function") clearPendingFacilityLocationContext();

    if (pendingCtx.selectEl) {
      const opt = document.createElement("option");
      opt.value = newLocKey;
      opt.text = `${s.name} (Space / Field)`;
      pendingCtx.selectEl.insertBefore(opt, pendingCtx.selectEl.lastElementChild);
      pendingCtx.selectEl.value = newLocKey;
      pendingCtx.selectEl.setAttribute("data-previous-val", newLocKey);
    }
    if (typeof pendingCtx.callback === "function") {
      pendingCtx.callback(newLocKey);
    }
    if (typeof showToast === "function") {
      showToast(`Created space "${name}" and assigned equipment!`);
    }
  } else {
    if (typeof showToast === "function") showToast(`Added space "${name}"`);
  }
}

function saveInlineHost() {
  const typeSelect = document.getElementById("inlineHostType");
  const nameInput = document.getElementById("inlineHostName");
  const errEl = document.getElementById("inlineHostError");
  const hostType = typeSelect ? typeSelect.value : facilityNewHostType;
  const name = nameInput ? nameInput.value.trim() : "";

  if (errEl) errEl.classList.add("hidden");

  if (!name) {
    if (errEl) {
      errEl.textContent = "Please enter an enclosure name.";
      errEl.classList.remove("hidden");
    } else if (typeof showToast === "function") {
      showToast("Please enter an enclosure name");
    }
    return;
  }

  const encs = FacilityStore.getEnclosures(activeFacilitySpaceId);
  if (encs.some(e => e.name.trim().toLowerCase() === name.toLowerCase())) {
    if (errEl) {
      errEl.textContent = `An enclosure named "${name}" already exists in this space.`;
      errEl.classList.remove("hidden");
    } else if (typeof showToast === "function") {
      showToast(`An enclosure named "${name}" already exists in this space.`);
    }
    return;
  }

  const currentSpace = FacilityStore.getSpaces().find(s => s.id === activeFacilitySpaceId);
  const isPoleSpace = currentSpace && currentSpace.type === "pole";

  const options = {};
  if (isPoleSpace) {
    options.mountingMethod = "pole";
    const htSelect = document.getElementById("inlineHostMountHeight");
    options.mountHeightFt = htSelect ? parseInt(htSelect.value, 10) : 10;
  }

  if (hostType === "equipment_rack") {
    const hSelect = document.getElementById("inlineRackHeight");
    options.heightU = hSelect ? parseInt(hSelect.value, 10) : 24;
    const dSelect = document.getElementById("inlineRackDepth");
    options.depthInches = dSelect ? parseInt(dSelect.value, 10) : 36;
  } else if (hostType === "security_cabinet") {
    const bSelect = document.getElementById("inlineCabinetBays");
    options.subplateBays = bSelect ? parseInt(bSelect.value, 10) : 8;
    const vSelect = document.getElementById("inlineCabinetVoltage");
    options.dcVoltage = vSelect ? vSelect.value : "dual_12_24";
  } else if (hostType === "industrial_din") {
    const rSelect = document.getElementById("inlineDinRails");
    options.dinRails = rSelect ? parseInt(rSelect.value, 10) : 2;
    const mSelect = document.getElementById("inlineDinMounting");
    options.mountingMethod = isPoleSpace ? "pole" : (mSelect ? mSelect.value : "wall");
    options.railLengthMm = 350;
  } else if (hostType === "architectural_backboard") {
    const wSelect = document.getElementById("inlineBackboardSize");
    options.widthFt = wSelect ? parseInt(wSelect.value, 10) : 4;
    options.heightFt = 8;
  }

  FacilityStore.addHost(name, hostType, activeFacilitySpaceId, options);
  facilityActiveForm = null;
  renderFacilityManager();

  const hostLocKey = currentSpace ? `${currentSpace.name} • ${name}` : name;
  const pendingCtx = (typeof getPendingFacilityLocationContext === "function") ? getPendingFacilityLocationContext() : null;
  if (pendingCtx) {
    if (typeof clearPendingFacilityLocationContext === "function") clearPendingFacilityLocationContext();

    if (pendingCtx.selectEl) {
      const opt = document.createElement("option");
      opt.value = hostLocKey;
      opt.text = hostLocKey;
      pendingCtx.selectEl.insertBefore(opt, pendingCtx.selectEl.lastElementChild);
      pendingCtx.selectEl.value = hostLocKey;
      pendingCtx.selectEl.setAttribute("data-previous-val", hostLocKey);
    }
    if (typeof pendingCtx.callback === "function") {
      pendingCtx.callback(hostLocKey);
    }
    if (typeof showToast === "function") {
      showToast(`Created enclosure "${name}" and assigned equipment!`);
    }
  } else {
    if (typeof showToast === "function") {
      showToast(`Added ${name} (${FacilityStore.HOST_TYPES[hostType]?.label || hostType})`);
    }
  }
}

function updateSpacePoleHeight(spaceId, heightFt) {
  FacilityStore.updateSpace(spaceId, { poleHeightFt: heightFt });
  renderFacilityManager();
  if (typeof showToast === "function") {
    showToast(`Updated pole height to ${heightFt} ft AGL`);
  }
}

// -----------------------------------------------------------
// Drag & Drop Enclosures & Hardware Between Spaces (Requirement 2 & 5)
// -----------------------------------------------------------
let facilityDraggedEncId = null;
let facilityDraggedHardwareId = null;

function handleEnclosureDragStart(event, encId) {
  facilityDraggedEncId = encId;
  event.dataTransfer.setData("text/plain", encId);
  event.dataTransfer.effectAllowed = "move";
  const el = event.currentTarget;
  if (el) el.style.opacity = "0.4";
}

function handleEnclosureDragEnd(event) {
  facilityDraggedEncId = null;
  const el = event.currentTarget;
  if (el) el.style.opacity = "1";
  document.querySelectorAll(".space-drop-target, .enclosure-drop-target").forEach(card => {
    card.classList.remove("ring-2", "ring-indigo-400", "ring-amber-400", "ring-emerald-400", "bg-indigo-950/60", "border-indigo-400", "border-amber-400", "border-emerald-400");
  });
}

function handleHardwareStagingDragStart(event, instanceId) {
  facilityDraggedHardwareId = instanceId;
  event.dataTransfer.setData("hardwareInstanceId", instanceId);
  event.dataTransfer.setData("text/plain", instanceId);
  event.dataTransfer.effectAllowed = "move";
  const el = event.currentTarget;
  if (el) el.style.opacity = "0.4";
}

function handleHardwareStagingDragEnd(event) {
  facilityDraggedHardwareId = null;
  const el = event.currentTarget;
  if (el) el.style.opacity = "1";
  document.querySelectorAll(".space-drop-target, .enclosure-drop-target, .floor-field-drop-target, .floor-drop-target").forEach(card => {
    card.classList.remove("ring-2", "ring-indigo-400", "ring-amber-400", "ring-emerald-400", "bg-indigo-950/60", "border-indigo-400", "border-amber-400", "border-emerald-400", "bg-amber-950/40");
  });
}

function handleSpaceCardDragOver(event, spaceId) {
  if (!facilityDraggedEncId && !facilityDraggedHardwareId) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  const card = event.currentTarget;
  if (card && !card.classList.contains("ring-2")) {
    card.classList.add("ring-2", facilityDraggedHardwareId ? "ring-amber-400" : "ring-indigo-400", "bg-indigo-950/60", facilityDraggedHardwareId ? "border-amber-400" : "border-indigo-400");
  }
}

function handleSpaceCardDragLeave(event, spaceId) {
  const card = event.currentTarget;
  if (card) {
    card.classList.remove("ring-2", "ring-indigo-400", "ring-amber-400", "bg-indigo-950/60", "border-indigo-400", "border-amber-400");
  }
}

function handleFloorFieldDragOver(event) {
  if (!facilityDraggedHardwareId) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  const card = event.currentTarget;
  if (card && !card.classList.contains("ring-2")) {
    card.classList.add("ring-2", "ring-amber-400", "bg-amber-950/40", "border-amber-400");
  }
}

function handleFloorFieldDragLeave(event) {
  const card = event.currentTarget;
  if (card) {
    card.classList.remove("ring-2", "ring-amber-400", "bg-amber-950/40", "border-amber-400");
  }
}

function isServerDevice(item) {
  if (!item) return false;
  const role = (item.role || "").toLowerCase();
  const cat = (item.category || "").toLowerCase();
  const model = (item.model || "").toLowerCase();
  const desc = (item.description || "").toLowerCase();
  return role.includes("server") || 
         role.includes("compute") || 
         cat.includes("server") || 
         cat.includes("compute") || 
         Boolean(item.serverType) || 
         /poweredge|proliant|supermicro|thinksystem|hyperconverged/i.test(model) || 
         /poweredge|proliant|supermicro|thinksystem/i.test(desc);
}

function isFieldLocation(targetLoc) {
  if (!targetLoc) return false;
  const str = String(targetLoc).trim();
  return str.endsWith("• Field") || str.toLowerCase().includes("• field") || str.toLowerCase() === "field";
}

function handleFloorFieldDrop(event, floorName) {
  event.preventDefault();
  const card = event.currentTarget;
  if (card) {
    card.classList.remove("ring-2", "ring-amber-400", "bg-amber-950/40", "border-amber-400");
  }
  const hwId = event.dataTransfer.getData("hardwareInstanceId") || event.dataTransfer.getData("text/plain") || facilityDraggedHardwareId;
  facilityDraggedHardwareId = null;
  if (hwId && floorName) {
    const item = typeof projectBOM !== "undefined" ? projectBOM.find(i => i.instanceId === hwId) : null;
    if (item && isServerDevice(item)) {
      if (typeof showToast === "function") showToast("Servers cannot be added to field locations. Please mount in an enclosure or rack.", 4000);
      return;
    }
    assignHardwareToLocation(hwId, `${floorName} • Field`);
  }
}

function handleFloorCardDragOver(event, floorId) {
  if (!facilityDraggedHardwareId) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  const card = event.currentTarget;
  if (card && !card.classList.contains("ring-2")) {
    card.classList.add("ring-2", "ring-amber-400", "bg-amber-950/40", "border-amber-400");
  }
}

function handleFloorCardDragLeave(event, floorId) {
  const card = event.currentTarget;
  if (card) {
    card.classList.remove("ring-2", "ring-amber-400", "bg-amber-950/40", "border-amber-400");
  }
}

function handleFloorCardDrop(event, floorName) {
  event.preventDefault();
  const card = event.currentTarget;
  if (card) {
    card.classList.remove("ring-2", "ring-amber-400", "bg-amber-950/40", "border-amber-400");
  }
  const hwId = event.dataTransfer.getData("hardwareInstanceId") || event.dataTransfer.getData("text/plain") || facilityDraggedHardwareId;
  facilityDraggedHardwareId = null;
  if (hwId && floorName) {
    const item = typeof projectBOM !== "undefined" ? projectBOM.find(i => i.instanceId === hwId) : null;
    if (item && isServerDevice(item)) {
      if (typeof showToast === "function") showToast("Servers cannot be added to field locations. Please mount in an enclosure or rack.", 4000);
      return;
    }
    assignHardwareToLocation(hwId, `${floorName} • Field`);
  }
}

function handleEnclosureCardDragOver(event) {
  if (!facilityDraggedHardwareId) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  const card = event.currentTarget;
  if (card && !card.classList.contains("ring-2")) {
    card.classList.add("ring-2", "ring-emerald-400", "bg-emerald-950/40", "border-emerald-400");
  }
}

function handleEnclosureCardDragLeave(event) {
  const card = event.currentTarget;
  if (card) {
    card.classList.remove("ring-2", "ring-emerald-400", "bg-emerald-950/40", "border-emerald-400");
  }
}

function handleEnclosureCardDrop(event, encLocName) {
  event.preventDefault();
  const card = event.currentTarget;
  if (card) {
    card.classList.remove("ring-2", "ring-emerald-400", "bg-emerald-950/40", "border-emerald-400");
  }
  const hwId = event.dataTransfer.getData("hardwareInstanceId") || event.dataTransfer.getData("text/plain") || facilityDraggedHardwareId;
  facilityDraggedHardwareId = null;
  if (hwId && encLocName) {
    assignHardwareToLocation(hwId, encLocName);
  }
}

function assignHardwareToLocation(instanceId, targetLoc) {
  if (!instanceId || !targetLoc || typeof projectBOM === "undefined") return;
  const item = projectBOM.find(i => i.instanceId === instanceId);
  if (!item) return;

  const normalized = FacilityStore.normalize(targetLoc);

  if (isServerDevice(item) && isFieldLocation(normalized)) {
    if (typeof showToast === "function") {
      showToast("Servers cannot be added to field locations. Please mount in an enclosure or rack.", 4000);
    }
    return;
  }

  item.closetName = normalized;
  item.rackId = normalized;
  item.rackSlot = null;
  item.rackU = null;

  projectBOM.forEach(ch => {
    if (ch.parentInstanceId === instanceId) {
      ch.closetName = normalized;
      ch.rackId = normalized;
    }
  });

  if (typeof autoSelectMountingForHost === "function") {
    autoSelectMountingForHost(item, normalized);
  }

  FacilityStore.notifyWorkspaceChange();
  renderFacilityManager();
  if (typeof updateBOMView === "function") updateBOMView();
  if (typeof showToast === "function") {
    showToast(`Assigned ${item.model} to ${normalized}`);
  }
}

function assignAllUnassignedToSpace(spaceName) {
  if (!spaceName || typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) return;
  const targetLoc = `${spaceName} • Field`;
  let count = 0;

  projectBOM.forEach(item => {
    if (item.parentInstanceId) return;
    if (isServerDevice(item)) return; // Servers must be mounted in enclosures, not field drops
    const loc = FacilityStore.normalize(item.closetName || item.rackId);
    if (loc === FacilityStore.UNASSIGNED) {
      item.closetName = targetLoc;
      item.rackId = targetLoc;
      item.rackSlot = null;
      item.rackU = null;
      count++;
    }
  });

  if (count > 0) {
    FacilityStore.notifyWorkspaceChange();
    renderFacilityManager();
    if (typeof updateBOMView === "function") updateBOMView();
    if (typeof showToast === "function") {
      showToast(`Assigned ${count} device${count === 1 ? '' : 's'} to ${spaceName} Field`);
    }
  }
}

function handleSpaceCardDrop(event, targetSpaceId) {
  event.preventDefault();
  const card = event.currentTarget;
  if (card) {
    card.classList.remove("ring-2", "ring-indigo-400", "ring-amber-400", "bg-indigo-950/60", "border-indigo-400", "border-amber-400");
  }

  // Check if hardware drop from staging bin
  const hwId = event.dataTransfer.getData("hardwareInstanceId") || event.dataTransfer.getData("text/plain") || facilityDraggedHardwareId;
  facilityDraggedHardwareId = null;
  if (hwId) {
    const item = typeof projectBOM !== "undefined" ? projectBOM.find(i => i.instanceId === hwId) : null;
    if (item && isServerDevice(item)) {
      if (typeof showToast === "function") showToast("Servers cannot be added to field locations. Please mount in an enclosure or rack.", 4000);
      return;
    }
    const targetSpace = FacilityStore.getSpaces().find(s => s.id === targetSpaceId);
    if (targetSpace) {
      assignHardwareToLocation(hwId, `${targetSpace.name} • Field`);
    }
    return;
  }

  const encId = event.dataTransfer.getData("text/plain") || facilityDraggedEncId;
  facilityDraggedEncId = null;
  if (!encId) return;

  const encs = FacilityStore.getEnclosures();
  const enc = encs.find(e => e.id === encId);
  if (!enc) return;

  if (enc.spaceId === targetSpaceId) {
    return; // Dropped on current space, no change
  }

  const spaces = FacilityStore.getSpaces();
  const sourceSpace = spaces.find(s => s.id === enc.spaceId);
  const targetSpace = spaces.find(s => s.id === targetSpaceId);
  if (!targetSpace) return;

  // Duplicate name check in destination space (Requirement 4)
  const duplicate = encs.some(e => e.id !== enc.id && e.spaceId === targetSpaceId && e.name.trim().toLowerCase() === enc.name.trim().toLowerCase());
  if (duplicate) {
    const msg = `Cannot move: An enclosure named "${enc.name}" already exists in "${targetSpace.name}". Please rename it first.`;
    if (typeof showToast === "function") showToast(msg);
    else alert(msg);
    return;
  }

  const oldLoc = sourceSpace ? `${sourceSpace.name} • ${enc.name}` : enc.name;
  const newLoc = `${targetSpace.name} • ${enc.name}`;

  // Update enclosure spaceId and mountingMethod if moving to a pole
  const updates = { spaceId: targetSpaceId };
  if (targetSpace.type === "pole") {
    updates.mountingMethod = "pole";
    if (!enc.mountHeightFt) updates.mountHeightFt = 10;
  }
  FacilityStore.updateHost(enc.id, updates);

  // Update BOM items
  let remappedCount = 0;
  if (typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) {
    projectBOM.forEach(item => {
      if (item.closetName === oldLoc || item.rackId === oldLoc) {
        item.closetName = newLoc;
        item.rackId = newLoc;
        remappedCount++;
      }
    });
    if (remappedCount > 0 && typeof saveBOMToLocalStorage === "function") {
      saveBOMToLocalStorage();
    }
  }

  activeFacilitySpaceId = targetSpaceId;
  activeFacilityFloorId = targetSpace.floorId;

  FacilityStore.notifyWorkspaceChange();
  renderFacilityManager();

  if (typeof showToast === "function") {
    showToast(`Moved "${enc.name}" to "${targetSpace.name}" (${remappedCount} devices remapped)`);
  }
}

function renderFacilityManager() {
  const container = document.getElementById("facilityManagerContent");
  if (!container) return;

  try {
    const floors = FacilityStore.getFloors() || [];
    const spaces = FacilityStore.getSpaces() || [];
    const enclosures = FacilityStore.getEnclosures() || [];
    const locations = FacilityStore.getLocations() || [];

    // Selected floor & space
    const currentFloor = (floors && floors.length > 0) ? (floors.find(f => f && f.id === activeFacilityFloorId) || floors[0] || null) : null;
    if (currentFloor && activeFacilityFloorId !== currentFloor.id) {
      activeFacilityFloorId = currentFloor.id;
    }
    const currentFloorSpaces = currentFloor ? spaces.filter(s => s && s.floorId === currentFloor.id) : [];
    const currentSpace = currentFloor ? (currentFloorSpaces.find(s => s && s.id === activeFacilitySpaceId) || currentFloorSpaces[0] || null) : null;
    if (currentSpace && activeFacilitySpaceId !== currentSpace.id) {
      activeFacilitySpaceId = currentSpace.id;
    }
    const currentSpaceEncs = currentSpace ? enclosures.filter(e => e && e.spaceId === currentSpace.id) : [];

    // Facility-wide Rollups
    let totalProjectWatts = 0;
    let totalPoEWatts = 0;
    let totalEquipmentCount = 0;
    if (typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) {
      projectBOM.forEach(item => {
        if (!item) return;
        const qty = parseInt(item.qty, 10) || 1;
        const bWatts = parseFloat(item.baseWatts) || 0;
        const pWatts = parseFloat(item.consumedPoEWatts) || 0;
        totalProjectWatts += (bWatts + pWatts) * qty;
        totalPoEWatts += pWatts * qty;
        totalEquipmentCount += qty;
      });
    }

    // Calculate next collision-free space name for inline form
    const allExistingSpaces = spaces || [];
    let nextSpaceNum = 1;
    while (allExistingSpaces.some(s => s && s.name && String(s.name).trim().toLowerCase() === `idf-${nextSpaceNum}`)) {
      nextSpaceNum++;
    }
    const suggestedSpaceName = `IDF-${nextSpaceNum}`;

    container.innerHTML = `
    <!-- Top Facility Telemetry Header Strip -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 pb-6 mb-6 border-b border-slate-800">
      <div class="bg-slate-950 p-3.5 rounded-xl border border-slate-850">
        <span class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Facility Structure</span>
        <div class="flex items-baseline gap-2">
          <span class="text-xl font-extrabold text-white font-mono">${floors.length}</span>
          <span class="text-xs text-slate-400">${floors.length === 1 ? 'Floor/Building' : 'Floors/Buildings'} &bull; ${spaces.length} Spaces</span>
        </div>
      </div>

      <div class="bg-slate-950 p-3.5 rounded-xl border border-slate-850">
        <span class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Enclosures & Racks</span>
        <div class="flex items-baseline gap-2">
          <span class="text-xl font-extrabold text-indigo-400 font-mono">${enclosures.length}</span>
          <span class="text-xs text-slate-400">Enclosures Active</span>
        </div>
      </div>

      <div class="bg-slate-950 p-3.5 rounded-xl border border-slate-850">
        <span class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Assigned Hardware</span>
        <div class="flex items-baseline gap-2">
          <span class="text-xl font-extrabold text-emerald-400 font-mono">${totalEquipmentCount}</span>
          <span class="text-xs text-slate-400">BOM Units Housed</span>
        </div>
      </div>

      <div class="bg-slate-950 p-3.5 rounded-xl border border-slate-850">
        <span class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Total Electrical Load</span>
        <div class="flex items-baseline gap-2">
          <span class="text-xl font-extrabold text-amber-400 font-mono">${Math.round(totalProjectWatts)} W</span>
          <span class="text-xs text-slate-400">${Math.round(totalPoEWatts)}W PoE</span>
        </div>
      </div>
    </div>

    <!-- 3-Column Master Hierarchy View -->
    <div class="flex flex-col md:flex-row gap-4 items-stretch">
      
      <!-- Col 1: Floors/Buildings (3 cols) -->
      <div id="facilityColFloors" class="w-full md:w-[25%] md:min-w-[210px] md:max-w-[55%] md:shrink-0 relative md:pr-2 space-y-3" style="${window.ossPaneWidths && window.ossPaneWidths['facilityColFloors'] ? `width: ${window.ossPaneWidths['facilityColFloors']}px;` : ''}">
        <div class="oss-pane-resizer oss-pane-resizer-right hidden md:flex" data-resize-target="facilityColFloors" data-resize-edge="right" data-min-width="210" data-max-width="640" title="Drag to resize Floors/Buildings column • Double-click to reset"></div>
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <i data-lucide="layers" class="w-3.5 h-3.5 text-sky-400"></i> Floors/Buildings (${floors.length})
          </span>
          <button onclick="openFacilityAddForm('add_floor')" class="px-2 py-1 bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1">
            <i data-lucide="plus" class="w-3 h-3"></i> Add Floor/Building
          </button>
        </div>

        ${facilityActiveForm === 'add_floor' ? `
          <!-- Inline Add Floor Form -->
          <div class="p-3 bg-slate-900 border border-sky-500/60 rounded-xl space-y-2.5 shadow-lg">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-sky-400">New Floor/Building</span>
              <button onclick="closeFacilityAddForm()" class="text-slate-500 hover:text-slate-300"><i data-lucide="x" class="w-3.5 h-3.5"></i></button>
            </div>
            <div>
              <label class="text-[10px] text-slate-400 block mb-1">Floor/Building Name:</label>
              <input id="inlineFloorName" type="text" placeholder="e.g. Building A - Level 2" value="Level ${floors.length + 1}" class="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs focus:border-sky-500 focus:outline-none font-medium">
              <div id="inlineFloorError" class="hidden text-[10px] text-rose-400 font-medium mt-1"></div>
            </div>
            <div>
              <label class="text-[10px] text-slate-400 block mb-1">Ceiling Rise (ft):</label>
              <input id="inlineFloorHeight" type="number" value="14" min="8" max="50" class="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-2.5 py-1 text-xs focus:border-sky-500 focus:outline-none font-mono">
            </div>
            <div class="flex items-center justify-end gap-2 pt-1">
              <button onclick="closeFacilityAddForm()" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold">Cancel</button>
              <button onclick="saveInlineFloor()" class="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold shadow">Save Floor/Building</button>
            </div>
          </div>
        ` : ''}

        <div class="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
          ${floors.length === 0 ? `
            <div class="text-center py-8 text-slate-500 text-xs bg-slate-950/60 rounded-xl border border-slate-800 p-4">
              <p class="font-medium text-slate-400 mb-1">No Floors/Buildings Defined</p>
              <p class="text-[11px] text-slate-500 mb-3">Click "+ Add Floor/Building" above to create your first level or building.</p>
              <button onclick="openFacilityAddForm('add_floor')" class="px-2.5 py-1 bg-sky-600/30 hover:bg-sky-600/50 text-sky-200 border border-sky-500/40 rounded-lg text-xs font-semibold">
                + Add Floor/Building
              </button>
            </div>
          ` : floors.map(f => {
            const isSelected = currentFloor && f.id === currentFloor.id;
            const floorSpaces = spaces.filter(s => s.floorId === f.id);
            const dropSummary = FacilityStore.getFloorDropsSummary(f.name);
            return `
              <div 
                onclick="selectFacilityFloor('${f.id}')"
                ondragover="handleFloorCardDragOver(event, '${f.id}')"
                ondragleave="handleFloorCardDragLeave(event, '${f.id}')"
                ondrop="handleFloorCardDrop(event, '${escapeJSAttr(f.name)}')"
                class="floor-drop-target p-3 rounded-xl border ${isSelected ? 'border-sky-500 bg-sky-500/10' : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'} cursor-pointer transition-all flex items-center justify-between group"
              >
                <div class="min-w-0 pr-1">
                  <span class="text-xs font-bold text-white block truncate">${escapeHTML(f.name)}</span>
                  <span class="text-[10px] text-slate-400 font-mono block mt-0.5">${floorSpaces.length} Spaces &bull; ${f.heightFt || 14}' Rise</span>
                  <div class="mt-1 flex flex-wrap items-center gap-1.5">
                    <span class="text-[9px] font-mono px-1.5 py-0.2 rounded bg-sky-500/10 border border-sky-500/30 text-sky-300 font-bold">
                      ${dropSummary.dropCount} Drops (${dropSummary.totalWatts}W)
                    </span>
                    ${dropSummary.servingEnclosures.length > 0 ? `
                      <span class="text-[9px] font-mono text-slate-400 truncate max-w-full" title="Terminating Closets: ${escapeHTML(dropSummary.servingEnclosures.join(', '))}">
                        Fed by: ${escapeHTML(dropSummary.servingEnclosures.join(', '))}
                      </span>
                    ` : ''}
                  </div>
                </div>
                <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button onclick="event.stopPropagation(); renameFacilityFloor('${f.id}')" class="p-1 text-slate-400 hover:text-sky-400 transition-colors" title="Rename Floor/Building">
                    <i data-lucide="edit-2" class="w-3.5 h-3.5"></i>
                  </button>
                  <button onclick="event.stopPropagation(); deleteFacilityFloor('${f.id}')" class="p-1 text-slate-400 hover:text-rose-400 transition-colors" title="Delete Floor/Building">
                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Col 2: Spaces, Closets & Outdoor Poles (4 cols) -->
      <div id="facilityColSpaces" class="w-full md:w-[33%] md:min-w-[230px] md:max-w-[60%] md:shrink-0 relative md:pr-2 space-y-3" style="${window.ossPaneWidths && window.ossPaneWidths['facilityColSpaces'] ? `width: ${window.ossPaneWidths['facilityColSpaces']}px;` : ''}">
        <div class="oss-pane-resizer oss-pane-resizer-right hidden md:flex" data-resize-target="facilityColSpaces" data-resize-edge="right" data-min-width="230" data-max-width="680" title="Drag to resize Telecom Spaces column • Double-click to reset"></div>
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <i data-lucide="door-open" class="w-3.5 h-3.5 text-indigo-400"></i> Telecom Spaces & Poles (${currentFloorSpaces.length})
          </span>
          <button onclick="openFacilityAddForm('add_space')" class="px-2 py-1 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer">
            <i data-lucide="plus" class="w-3 h-3"></i> Add Space
          </button>
        </div>

        ${facilityActiveForm === 'add_space' && currentFloor ? `
          <!-- Inline Add Space Form -->
          <div class="p-3 bg-slate-900 border border-indigo-500/60 rounded-xl space-y-2.5 shadow-lg">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-indigo-400">New Space on ${escapeHTML(currentFloor.name)}</span>
              <button onclick="closeFacilityAddForm()" class="text-slate-500 hover:text-slate-300"><i data-lucide="x" class="w-3.5 h-3.5"></i></button>
            </div>
            <div>
              <label class="text-[10px] text-slate-400 block mb-1">Space Name:</label>
              <input id="inlineSpaceName" type="text" placeholder="e.g. IDF-2, Pole 2, East Gate Wallbox" value="${suggestedSpaceName}" class="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs focus:border-indigo-500 focus:outline-none font-medium">
              <div id="inlineSpaceError" class="hidden text-[10px] text-rose-400 font-medium mt-1"></div>
            </div>
            <div>
              <label class="text-[10px] text-slate-400 block mb-1">Space Type:</label>
              <select id="inlineSpaceType" onchange="const pF = document.getElementById('inlinePoleHeightRow'); if (pF) pF.style.display = this.value === 'pole' ? 'block' : 'none';" class="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs focus:border-indigo-500 focus:outline-none">
                <option value="idf">IDF (Telecommunications Closet)</option>
                <option value="mdf">MDF (Main Distribution Facility / Server Room)</option>
                <option value="pole">Exterior Structural Pole / Mast</option>
                <option value="wallbox">Gate / Wallbox Enclosure Station</option>
                <option value="security_room">Security Control & Access Room</option>
              </select>
            </div>
            <div id="inlinePoleHeightRow" style="display: none;">
              <label class="text-[10px] text-slate-400 block mb-1">Pole Height (ft AGL):</label>
              <select id="inlineSpacePoleHeight" class="w-full bg-slate-950 border border-slate-700 text-cyan-300 font-bold rounded-lg px-2.5 py-1.5 text-xs">
                <option value="12">12 ft AGL (Pedestal / Short Mast)</option>
                <option value="15">15 ft AGL (Perimeter Camera Pole)</option>
                <option value="20">20 ft AGL (Standard Light/Utility Pole)</option>
                <option value="25" selected>25 ft AGL (Commercial Security Pole)</option>
                <option value="30">30 ft AGL (High-Mast / Radio Mast)</option>
                <option value="40">40 ft AGL (Tower / Heavy Industrial)</option>
              </select>
            </div>
            <div class="flex items-center justify-end gap-2 pt-1">
              <button onclick="closeFacilityAddForm()" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold">Cancel</button>
              <button onclick="saveInlineSpace()" class="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow">Save Space</button>
            </div>
          </div>
        ` : ''}

        <div class="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
          ${!currentFloor ? `
            <div class="text-center py-8 text-slate-500 text-xs bg-slate-950/60 rounded-xl border border-slate-800 p-4">
              Add a floor/building first to define telecom spaces and closets.
            </div>
          ` : (currentFloorSpaces.length === 0 ? `
            <div class="text-center py-8 text-slate-500 text-xs bg-slate-950/60 rounded-xl border border-slate-800 p-4">
              <p class="font-medium text-slate-400 mb-1">No Spaces Defined on ${escapeHTML(currentFloor.name)}</p>
              <p class="text-[11px] text-slate-500 mb-3">Add an IDF, MDF closet, exterior pole, or wallbox.</p>
              <button onclick="openFacilityAddForm('add_space')" class="px-2.5 py-1 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 rounded-lg text-xs font-semibold">
                + Add Space
              </button>
            </div>
          ` : currentFloorSpaces.map(s => {
            if (!s) return '';
            const isSelected = currentSpace && s.id === currentSpace.id;
            const spaceEncs = enclosures.filter(e => e && e.spaceId === s.id);
            const isPole = s.type === "pole" || (s.name && String(s.name).toLowerCase().includes("pole"));
            const isMdf = s.type === "mdf";
            const spaceTypeLabel = isPole ? 'STRUCTURAL POLE' : (s.type || 'idf').toUpperCase();

            return `
              <div 
                onclick="selectFacilitySpace('${s.id}')"
                ondragover="handleSpaceCardDragOver(event, '${s.id}')"
                ondragleave="handleSpaceCardDragLeave(event, '${s.id}')"
                ondrop="handleSpaceCardDrop(event, '${s.id}')"
                data-space-id="${s.id}"
                class="space-drop-target p-3 rounded-xl border ${isSelected ? (isPole ? 'border-cyan-500 bg-cyan-950/40 ring-1 ring-cyan-500/40' : 'border-indigo-500 bg-indigo-950/40 ring-1 ring-indigo-500/40') : (isPole ? 'border-cyan-900/60 bg-slate-950/80 hover:border-cyan-700' : 'border-slate-800 bg-slate-950/60 hover:border-slate-700')} cursor-pointer transition-all flex items-center justify-between group"
              >
                <div class="min-w-0 pr-2">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="text-xs font-bold text-white truncate">${escapeHTML(s.name || 'Space')}</span>
                    <span class="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${isMdf ? 'border-rose-500/30 bg-rose-500/10 text-rose-300' : (isPole ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300' : 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300')}">
                      ${spaceTypeLabel}
                    </span>
                  </div>
                  <div class="mt-1 flex items-center gap-2 flex-wrap">
                    <span class="text-[10px] text-slate-400 font-mono">
                      ${spaceEncs.length} ${spaceEncs.length === 1 ? 'Enclosure' : 'Enclosures'}
                    </span>
                    ${isPole ? `
                      <span class="text-[10px] text-cyan-400 font-mono font-bold">
                        &bull; ${s.poleHeightFt || 25} ft AGL
                      </span>
                    ` : ''}
                  </div>
                </div>

                <div class="flex items-center gap-1.5 shrink-0">
                  ${isPole ? `
                    <button 
                      onclick="event.stopPropagation(); openRackViewerFor('${escapeJSAttr(s.name)} • Pole Mount')"
                      class="px-2 py-1 bg-cyan-600/30 hover:bg-cyan-600 text-cyan-200 hover:text-white text-[10px] font-bold rounded-lg border border-cyan-500/40 transition-all flex items-center gap-1 shadow-sm"
                      title="Open Pole Elevation Visualizer for ${escapeHTML(s.name)}"
                    >
                      <i data-lucide="radio-tower" class="w-3 h-3"></i> Pole Elevation
                    </button>
                    <select 
                      onclick="event.stopPropagation()"
                      onchange="updateSpacePoleHeight('${s.id}', parseInt(this.value, 10))" 
                      class="bg-slate-950 border border-slate-700 text-cyan-300 font-bold rounded px-1.5 py-1 text-[10px] focus:outline-none"
                      title="Adjust Pole Height"
                    >
                      <option value="12" ${s.poleHeightFt === 12 ? 'selected' : ''}>12ft</option>
                      <option value="15" ${s.poleHeightFt === 15 ? 'selected' : ''}>15ft</option>
                      <option value="20" ${s.poleHeightFt === 20 ? 'selected' : ''}>20ft</option>
                      <option value="25" ${(s.poleHeightFt || 25) === 25 ? 'selected' : ''}>25ft</option>
                      <option value="30" ${s.poleHeightFt === 30 ? 'selected' : ''}>30ft</option>
                      <option value="40" ${s.poleHeightFt === 40 ? 'selected' : ''}>40ft</option>
                    </select>
                  ` : ''}

                  <button onclick="event.stopPropagation(); renameFacilitySpace('${s.id}')" class="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-indigo-400 transition-opacity" title="Rename Space">
                    <i data-lucide="edit-2" class="w-3.5 h-3.5"></i>
                  </button>
                  <button onclick="event.stopPropagation(); deleteFacilitySpace('${s.id}')" class="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-400 transition-opacity" title="Delete Space">
                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                  </button>
                </div>
              </div>
            `;
          }).join(''))}
          ${currentFloor && currentFloorSpaces.length > 0 ? `
            <div class="pt-1.5">
              <button onclick="openFacilityAddForm('add_space')" class="w-full py-2 bg-slate-900/60 hover:bg-indigo-950/40 border border-dashed border-slate-800 hover:border-indigo-500/40 rounded-xl text-slate-400 hover:text-indigo-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer">
                <i data-lucide="plus" class="w-3.5 h-3.5 text-indigo-400"></i> + Add Another Space
              </button>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- Col 3: Mounting Hosts & Enclosures (5 cols) -->
      <div id="facilityColHosts" class="w-full md:flex-1 md:min-w-[260px] space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <i data-lucide="${currentSpace && currentSpace.type === 'pole' ? 'box' : 'server'}" class="w-3.5 h-3.5 ${currentSpace && currentSpace.type === 'pole' ? 'text-cyan-400' : 'text-emerald-400'}"></i>
            ${currentSpace && currentSpace.type === 'pole' ? `Enclosures on ${escapeHTML(currentSpace.name)}` : 'Mounting Hosts & Enclosures'} (${currentSpaceEncs.length})
          </span>
          ${currentSpace ? `
            <button onclick="openFacilityAddForm('add_host')" class="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1">
              <i data-lucide="plus" class="w-3 h-3"></i> Add Enclosure
            </button>
          ` : ''}
        </div>

        ${facilityActiveForm === 'add_host' && currentSpace ? `
          <!-- Inline Add Host Form -->
          <div class="p-3.5 bg-slate-900 border border-emerald-500/60 rounded-xl space-y-3 shadow-xl">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-emerald-400">Add Enclosure to ${escapeHTML(currentSpace.name)}</span>
              <button onclick="closeFacilityAddForm()" class="text-slate-500 hover:text-slate-300"><i data-lucide="x" class="w-3.5 h-3.5"></i></button>
            </div>

            <!-- Host Type Selector (Poles are managed at Space level) -->
            <div>
              <label class="text-[10px] text-slate-400 block mb-1">Enclosure Type:</label>
              <select id="inlineHostType" onchange="setFacilityNewHostType(this.value)" class="w-full bg-slate-950 border border-slate-700 text-emerald-300 font-bold rounded-lg px-2.5 py-1.5 text-xs focus:border-emerald-500 focus:outline-none">
                <option value="industrial_din" ${facilityNewHostType === 'industrial_din' || (currentSpace.type === 'pole' && facilityNewHostType === 'equipment_rack') ? 'selected' : ''}>Industrial Weatherproof NEMA Box (DIN Rail)</option>
                <option value="security_cabinet" ${facilityNewHostType === 'security_cabinet' ? 'selected' : ''}>Security & Access Cabinet (Altronix Trove / LSP)</option>
                <option value="equipment_rack" ${facilityNewHostType === 'equipment_rack' && currentSpace.type !== 'pole' ? 'selected' : ''}>19" EIA Equipment Rack (Switches, Servers, UPS)</option>
                <option value="architectural_backboard" ${facilityNewHostType === 'architectural_backboard' ? 'selected' : ''}>Architectural Telecom Backboard (Plywood)</option>
              </select>
            </div>

            <!-- Host Name Input -->
            <div>
              <label class="text-[10px] text-slate-400 block mb-1">Enclosure Name:</label>
              <input id="inlineHostName" type="text" value="${getSuggestedHostName(currentSpace.type === 'pole' && facilityNewHostType === 'equipment_rack' ? 'industrial_din' : facilityNewHostType, currentSpaceEncs.length)}" class="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs focus:border-emerald-500 focus:outline-none font-medium">
              <div id="inlineHostError" class="hidden text-[10px] text-rose-400 font-medium mt-1"></div>
            </div>

            <!-- Dynamic Form-Factor Fields -->
            <div class="grid grid-cols-2 gap-2 text-xs">
              ${renderInlineHostSpecificFields(currentSpace.type === 'pole' && facilityNewHostType === 'equipment_rack' ? 'industrial_din' : facilityNewHostType, currentSpace)}
            </div>

            <div class="flex items-center justify-end gap-2 pt-1 border-t border-slate-800">
              <button onclick="closeFacilityAddForm()" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold">Cancel</button>
              <button onclick="saveInlineHost()" class="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow">Create Enclosure</button>
            </div>
          </div>
        ` : ''}

        <div class="space-y-3 max-h-[500px] overflow-y-auto pr-1">
          ${!currentSpace ? `
            <div class="text-center py-8 text-slate-500 text-xs bg-slate-950/60 rounded-xl border border-slate-850 p-4">
              Select or create a telecom space above to view and add mounted enclosures.
            </div>
          ` : (currentSpaceEncs.length === 0 ? `
            <div class="text-center py-8 text-slate-500 text-xs bg-slate-950/60 rounded-xl border border-slate-850 p-4">
              <p class="font-medium text-slate-400 mb-1">No Enclosures in ${escapeHTML(currentSpace.name)}</p>
              <p class="text-[11px] text-slate-500 mb-3">Add a 19" rack, NEMA box, security cabinet, or backboard.</p>
              <button onclick="openFacilityAddForm('add_host')" class="px-2.5 py-1 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-500/40 rounded-lg text-xs font-semibold">
                + Add Enclosure
              </button>
            </div>
          ` : currentSpaceEncs.map(e => {
            const locName = `${currentSpace.name} • ${e.name}`;
            const telem = FacilityStore.getLocationTelemetry(locName);
            const hostType = e.hostType || (e.isDin ? "industrial_din" : "equipment_rack");
            const meta = MOUNTING_HOST_TYPES[hostType] || MOUNTING_HOST_TYPES.equipment_rack;
            const isPoleMounted = e.mountingMethod === "pole" || (currentSpace && currentSpace.type === "pole");

            return `
              <div 
                class="enclosure-drop-target p-3.5 rounded-xl border border-slate-800 bg-slate-950/90 space-y-2.5 hover:border-slate-700 transition-colors"
                draggable="true"
                ondragstart="handleEnclosureDragStart(event, '${e.id}')"
                ondragend="handleEnclosureDragEnd(event)"
                ondragover="handleEnclosureCardDragOver(event)"
                ondragleave="handleEnclosureCardDragLeave(event)"
                ondrop="handleEnclosureCardDrop(event, '${escapeJSAttr(locName)}')"
                data-enclosure-id="${e.id}"
              >
                <!-- Drag Handle Bar (Requirement 5) -->
                <div class="flex items-center justify-between text-[9px] text-slate-500 font-mono pb-1 border-b border-slate-850 cursor-grab active:cursor-grabbing select-none">
                  <span class="flex items-center gap-1 text-slate-400 hover:text-indigo-300 transition-colors">
                    <i data-lucide="grip-vertical" class="w-3 h-3 text-slate-500"></i> Drag to reassign space
                  </span>
                  <span class="text-slate-600">ID: ${escapeHTML(e.id)}</span>
                </div>

                <div class="flex items-start justify-between gap-2 pt-1">
                  <div class="min-w-0">
                    <span class="text-xs font-bold text-white block truncate">${escapeHTML(e.name)}</span>
                    <div class="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span class="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border border-indigo-500/40 bg-indigo-500/10 text-indigo-300 flex items-center gap-1">
                        <i data-lucide="${meta.icon || 'server'}" class="w-2.5 h-2.5"></i> ${meta.badgeLabel}
                      </span>
                      ${isPoleMounted ? `
                        <span class="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border border-cyan-500/40 bg-cyan-500/10 text-cyan-300">
                          Pole Banded @ ${e.mountHeightFt || 10} ft AGL
                        </span>
                      ` : (hostType === 'industrial_din' ? `
                        <span class="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border border-amber-500/40 bg-amber-500/10 text-amber-300">
                          Wall Mounted
                        </span>
                      ` : '')}
                      <span class="text-[10px] font-mono text-slate-400">
                        ${hostType === 'equipment_rack' ? `${e.heightU || 24}U EIA &bull; Max ${e.maxWatts || 3000}W` :
                          (hostType === 'security_cabinet' ? `${e.subplateBays || 8} Subplate Bays &bull; ${e.dcVoltage || '12/24V'}` :
                          (hostType === 'industrial_din' ? `${e.dinRails || 2}x DIN (${e.railLengthMm || 350}mm)` :
                          `${e.widthFt || 4}' x ${e.heightFt || 8}' Backboard`))}
                      </span>
                    </div>
                  </div>

                  <div class="flex items-center gap-1.5 shrink-0">
                    ${hostType === 'equipment_rack' ? `
                      <button 
                        onclick="window.TabManager ? TabManager.openTab('power_matrix', { targetRackId: '${escapeJSAttr(locName)}' }) : (typeof openRackPowerMatrixModal === 'function' && openRackPowerMatrixModal(null, null, null, '${escapeJSAttr(locName)}'))"
                        class="px-2.5 py-1.5 bg-emerald-600/25 hover:bg-emerald-600 text-emerald-200 hover:text-white text-[10px] font-bold rounded-xl border border-emerald-500/40 transition-all flex items-center gap-1.5 shadow-sm"
                        title="Open Power Matrix Studio for ${escapeHTML(e.name)}"
                      >
                        <i data-lucide="plug-zap" class="w-3.5 h-3.5"></i> Power Matrix
                      </button>
                    ` : ''}
                    <button 
                      onclick="openRackViewerFor('${escapeJSAttr(locName)}')"
                      class="px-2.5 py-1.5 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white text-[10px] font-bold rounded-xl border border-indigo-500/40 transition-all flex items-center gap-1.5 shadow-sm"
                      title="Open Elevation Visualizer for ${escapeHTML(e.name)}"
                    >
                      <i data-lucide="layout-grid" class="w-3.5 h-3.5"></i> Visualizer
                    </button>
                    <button onclick="event.stopPropagation(); renameFacilityEnclosure('${e.id}')" class="p-1.5 text-slate-400 hover:text-emerald-400 rounded-lg hover:bg-slate-800 transition-colors" title="Rename Enclosure">
                      <i data-lucide="edit-2" class="w-3.5 h-3.5"></i>
                    </button>
                    <button onclick="deleteFacilityEnclosure('${e.id}')" class="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors" title="Delete Enclosure">
                      <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                    </button>
                  </div>
                </div>

                <!-- Real Catalog Part & BOM Quote Bar -->
                <div class="flex items-center justify-between p-2 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px]">
                  <div class="flex items-center gap-2 min-w-0">
                    <span class="px-2 py-0.5 rounded font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-700/60 shadow-sm shrink-0">
                      ${escapeHTML(e.catalogVendor || '')} ${escapeHTML(e.catalogSku || 'Custom Hardware')}
                    </span>
                    <span class="text-slate-300 truncate max-w-[180px] sm:max-w-[240px]" title="${escapeHTML(e.catalogModel || '')}">${escapeHTML(e.catalogModel || '')}</span>
                    <span class="font-mono text-emerald-400 font-bold shrink-0">$${(e.msrp || 0).toLocaleString()} MSRP</span>
                  </div>
                  <div class="shrink-0 ml-2">
                    ${FacilityStore.isEnclosureInBOM(e.id) ? `
                      <button onclick="event.stopPropagation(); FacilityStore.syncEnclosureToBOM('${e.id}', false); renderFacilityManager(); if (typeof renderBOM === 'function') renderBOM(); if (typeof updateBOMView === 'function') updateBOMView();" class="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-600 flex items-center gap-1 transition-colors cursor-pointer" title="Enclosure frame included in project quote. Click to remove.">
                        <i data-lucide="check" class="w-3 h-3"></i> In Quote
                      </button>
                    ` : `
                      <button onclick="event.stopPropagation(); FacilityStore.syncEnclosureToBOM('${e.id}', true); renderFacilityManager(); if (typeof renderBOM === 'function') renderBOM(); if (typeof updateBOMView === 'function') updateBOMView();" class="px-2.5 py-0.5 rounded text-[10px] font-bold bg-slate-850 hover:bg-indigo-600 text-slate-300 hover:text-white border border-slate-700 flex items-center gap-1 transition-colors cursor-pointer" title="Add physical enclosure frame to project BOM and quote">
                        <i data-lucide="plus" class="w-3 h-3"></i> Add to Quote
                      </button>
                    `}
                  </div>
                </div>

                <!-- Telemetry Row -->
                <div class="grid grid-cols-4 gap-2 pt-2 border-t border-slate-850 text-[10px] font-mono">
                  <div class="bg-slate-900/80 p-1.5 rounded-lg border border-slate-800">
                    <span class="text-slate-500 block text-[9px]">Hardware:</span>
                    <span class="text-white font-bold">${telem.itemCount} Units</span>
                  </div>
                  <div class="bg-slate-900/80 p-1.5 rounded-lg border border-slate-800">
                    <span class="text-slate-500 block text-[9px]">
                      ${hostType === 'equipment_rack' ? 'RU Space:' :
                        (hostType === 'security_cabinet' ? 'Subplate Bays:' :
                        (hostType === 'industrial_din' ? 'DIN Rail:' : 'Backboard:'))}
                    </span>
                    <span class="text-indigo-300 font-bold">
                      ${hostType === 'equipment_rack' ? `${telem.totalRuOccupied}/${e.heightU || 24}U` :
                        (hostType === 'security_cabinet' ? `${e.subplateBays || 8} Bays` :
                        (hostType === 'industrial_din' ? `${e.dinRails || 2}x Rails` : `${e.widthFt || 4}x${e.heightFt || 8} Ft`))}
                    </span>
                  </div>
                  <div class="bg-slate-900/80 p-1.5 rounded-lg border border-slate-800">
                    <span class="text-slate-500 block text-[9px]">Power Draw:</span>
                    <span class="text-amber-400 font-bold">${telem.totalWatts || 0} W</span>
                  </div>
                  <div class="bg-slate-900/80 p-1.5 rounded-lg border border-slate-800">
                    <span class="text-slate-500 block text-[9px]">Thermal Heat:</span>
                    <span class="text-rose-400 font-bold">${(telem.btuPerHour || 0).toLocaleString()} BTU</span>
                  </div>
                </div>

                <!-- Served Field Drops Breakdown Panel -->
                ${(() => {
                  const servedDrops = FacilityStore.getEnclosureServedDrops(locName);
                  return `
                    <div class="bg-cyan-950/20 border border-cyan-800/40 rounded-lg p-2.5 space-y-1.5">
                      <div class="flex items-center justify-between">
                        <span class="text-[10px] font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1">
                          <i data-lucide="network" class="w-3 h-3 text-cyan-400"></i> Served Field Drops (${servedDrops.totalDrops})
                        </span>
                        <span class="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-900/40 px-1.5 py-0.2 rounded border border-cyan-700/50">
                          ${servedDrops.totalWatts}W PoE Delivered
                        </span>
                      </div>
                      ${servedDrops.totalDrops === 0 ? `
                        <p class="text-[10px] text-slate-500 font-mono italic">No edge field drops terminated in this enclosure (Core / Compute backbone).</p>
                      ` : `
                        <div class="flex flex-wrap gap-1.5 pt-0.5">
                          ${Object.entries(servedDrops.byFloor).map(([flName, stats]) => `
                            <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-200 flex items-center gap-1">
                              <span class="font-bold text-cyan-300">${stats.count}</span> drops from <span class="text-white">${escapeHTML(flName)}</span>
                              ${stats.cameras > 0 ? `<span class="text-slate-400">(${stats.cameras} Cams${stats.doors > 0 ? `, ${stats.doors} Doors` : ''})</span>` : ''}
                            </span>
                          `).join('')}
                        </div>
                      `}
                    </div>
                  `;
                })()}
              </div>
            `;
          }).join(''))}
        </div>

        <!-- Floor Field Hardware (Floors & Buildings, not spaces) -->
        ${currentFloor ? (() => {
          const floorFieldLoc = FacilityStore.normalize(`${currentFloor.name} • Field`);
          const floorFieldHardware = (typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) ? projectBOM.filter(item => {
            if (item.parentInstanceId) return false;
            if (item.rackSlot) return false;
            const loc = FacilityStore.normalize(item.closetName || item.location || item.rackId);
            return loc === floorFieldLoc;
          }) : [];

          return `
            <div 
              class="floor-field-drop-target p-3 bg-slate-900/90 border border-slate-800 rounded-xl space-y-2.5 shadow-md transition-all"
              ondragover="handleFloorFieldDragOver(event)"
              ondragleave="handleFloorFieldDragLeave(event)"
              ondrop="handleFloorFieldDrop(event, '${escapeJSAttr(currentFloor.name)}')"
            >
              <div class="flex items-center justify-between">
                <div>
                  <span class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <i data-lucide="radio" class="w-3.5 h-3.5 text-amber-400"></i>
                    Field Hardware on ${escapeHTML(currentFloor.name)} (${floorFieldHardware.length})
                  </span>
                  <span class="text-[10px] text-slate-400 font-mono block mt-0.5">
                    ${escapeHTML(currentFloor.name)} &bull; Field
                  </span>
                </div>
                <button 
                  type="button" 
                  onclick="promptAssignHardwareToFloorField('${escapeJSAttr(currentFloor.name)}')" 
                  class="px-2 py-0.5 bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 border border-amber-500/40 rounded text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer" 
                  title="Assign an unassigned camera, door, or sensor to this floor"
                >
                  <i data-lucide="plus" class="w-3 h-3"></i> Assign Device
                </button>
              </div>

              ${floorFieldHardware.length === 0 ? `
                <div class="p-3 bg-slate-950/60 rounded-lg border border-dashed border-slate-800 text-center text-xs text-slate-500">
                  <p>No field devices (cameras, door portals, wireless APs, drops) assigned to ${escapeHTML(currentFloor.name)}.</p>
                  <span class="block text-[10px] text-amber-400/80 font-mono mt-1">● Drag unassigned cameras, readers, or sensors here to assign</span>
                </div>
              ` : `
                <div class="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  ${floorFieldHardware.map(dev => {
                    const mountMethod = dev.mountMethod ? dev.mountMethod.toUpperCase() : "WALL";
                    const isCamera = dev.role === "Camera" || dev.category?.includes("camera");
                    const isDoor = dev.role === "Access Control" || dev.category?.includes("access");
                    const isRadio = dev.role === "Wireless Bridge" || dev.category?.includes("wireless");
                    const iconName = isCamera ? "camera" : (isDoor ? "door-closed" : (isRadio ? "radio" : "cpu"));
                    const hostSw = dev.uplinkTargetId && typeof projectBOM !== "undefined" ? projectBOM.find(s => s.instanceId === dev.uplinkTargetId) : null;
                    const hostCloset = hostSw ? (hostSw.closetName || hostSw.rackId) : null;

                    return `
                      <div class="bg-slate-950 p-2 rounded-lg border border-slate-800 flex items-center justify-between text-xs hover:border-slate-700 transition-colors">
                        <div class="flex items-center gap-2 min-w-0">
                          <div class="p-1 rounded bg-slate-900 border border-slate-800 text-amber-400 shrink-0">
                            <i data-lucide="${iconName}" class="w-3 h-3"></i>
                          </div>
                          <div class="min-w-0">
                            <span class="font-bold text-white block truncate">${escapeHTML(dev.model)}</span>
                            <div class="flex items-center gap-1.5 flex-wrap">
                              <span class="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-950/80 border border-amber-800/80 text-amber-300 font-bold">${mountMethod} MOUNT</span>
                              <span class="text-[10px] text-slate-400 font-mono">${escapeHTML(dev.role || 'Field Device')} &bull; ${dev.consumedPoEWatts || 15}W PoE</span>
                            </div>
                            ${hostSw ? `
                              <div class="mt-0.5 text-[9px] font-mono text-cyan-400 flex items-center gap-1">
                                <i data-lucide="network" class="w-2.5 h-2.5"></i>
                                <span>Home-Run: ${escapeHTML(hostCloset ? String(hostCloset).split('•')[0].trim() : '')} &bull; ${escapeHTML(hostSw.friendlyName || hostSw.model)}</span>
                              </div>
                            ` : ''}
                          </div>
                        </div>
                        <div class="flex items-center gap-1 shrink-0">
                          <button onclick="jumpToTopologyTarget('node:${dev.instanceId}')" class="p-1 text-slate-400 hover:text-indigo-300 transition-colors" title="View in Topology">
                            <i data-lucide="network" class="w-3.5 h-3.5"></i>
                          </button>
                          <button onclick="jumpToPhysicalLayoutTarget('${dev.instanceId}')" class="p-1 text-slate-400 hover:text-amber-300 transition-colors" title="View in Physical Layout">
                            <i data-lucide="map" class="w-3.5 h-3.5"></i>
                          </button>
                          <button onclick="jumpToBomTarget('${dev.instanceId}')" class="p-1 text-slate-400 hover:text-emerald-300 transition-colors" title="View in BOM Drawer">
                            <i data-lucide="file-spreadsheet" class="w-3.5 h-3.5"></i>
                          </button>
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              `}
            </div>
          `;
        })() : ''}
      </div>
    </div>

    <!-- Unassigned Quote Hardware Staging Bin (Requirement 2: Prominent Spaces Area Display) -->
    ${(() => {
      const unassignedItems = (typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) ? projectBOM.filter(item => {
        if (item.parentInstanceId) return false;
        const loc = FacilityStore.normalize(item.closetName || item.location || item.rackId);
        return loc === FacilityStore.UNASSIGNED;
      }) : [];

      const availableEnclosures = FacilityStore.getEnclosures();

      return `
        <div id="facilityUnassignedHardwareTray" class="w-full mt-6 p-4 rounded-2xl border ${unassignedItems.length > 0 ? 'border-amber-500/50 bg-amber-950/20 shadow-amber-950/20' : 'border-slate-800 bg-slate-950/60'} shadow-xl space-y-3 transition-all">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-850">
            <div class="flex items-center gap-2.5">
              <div class="p-2 rounded-xl ${unassignedItems.length > 0 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm' : 'bg-slate-900 text-slate-500 border border-slate-800'}">
                <i data-lucide="inbox" class="w-4 h-4"></i>
              </div>
              <div>
                <div class="flex items-center gap-2 flex-wrap">
                  <h3 class="text-xs font-bold text-white uppercase tracking-wider">Unassigned Quote Equipment Staging</h3>
                  <span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${unassignedItems.length > 0 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-400'}">
                    ${unassignedItems.length} Device${unassignedItems.length === 1 ? '' : 's'} Unassigned
                  </span>
                </div>
                <p class="text-[11px] text-slate-400 mt-0.5">
                  Hardware added to quote without an assigned space or rack. Drag onto spaces/enclosures above, or click below to assign.
                </p>
              </div>
            </div>

            ${unassignedItems.length > 0 && currentSpace ? `
              <div class="flex items-center gap-2 shrink-0">
                <button 
                  onclick="assignAllUnassignedToSpace('${escapeJSAttr(currentSpace.name)}')" 
                  class="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                  title="Assign all unassigned equipment to ${escapeHTML(currentSpace.name)} Field"
                >
                  <i data-lucide="check-check" class="w-3.5 h-3.5"></i>
                  <span>Assign All to ${escapeHTML(currentSpace.name)} Field</span>
                </button>
              </div>
            ` : ''}
          </div>

          ${unassignedItems.length === 0 ? `
            <div class="py-6 text-center text-slate-500 text-xs bg-slate-950/40 rounded-xl border border-dashed border-slate-850">
              <i data-lucide="check-circle-2" class="w-6 h-6 mx-auto mb-1.5 text-emerald-500/60"></i>
              <p class="font-medium text-slate-300">All quote equipment is assigned to a physical space or mounting enclosure.</p>
              <p class="text-[10px] text-slate-500 mt-0.5">New devices added from the Quote BOM or Catalog will appear here ready to assign.</p>
            </div>
          ` : `
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 max-h-72 overflow-y-auto pr-1">
              ${unassignedItems.map(item => {
                const mount = (item.mountMethod || "wall").toUpperCase();
                const isRadio = item.role === "Wireless Bridge" || item.category?.includes("wireless");
                const isCam = item.role === "Camera" || item.category?.includes("camera");
                const isDoor = item.role === "Access Control" || item.category?.includes("access");
                const isSwitch = item.role === "Access Switch" || item.role === "Core Switch" || item.role === "Distribution Switch";
                const isServer = item.role === "Server" || item.category === "servers";
                const iconName = isRadio ? "radio" : (isCam ? "camera" : (isDoor ? "door-closed" : (isSwitch ? "server" : (isServer ? "hard-drive" : "cpu"))));

                return `
                  <div 
                    class="bg-slate-950 p-2.5 rounded-xl border border-slate-800 hover:border-amber-500/60 transition-all flex flex-col justify-between gap-2 shadow-sm select-none"
                    draggable="true"
                    ondragstart="handleHardwareStagingDragStart(event, '${item.instanceId}')"
                    ondragend="handleHardwareStagingDragEnd(event)"
                  >
                    <div class="flex items-start justify-between gap-2">
                      <div class="flex items-center gap-2 min-w-0">
                        <div class="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-amber-400 shrink-0">
                          <i data-lucide="${iconName}" class="w-3.5 h-3.5"></i>
                        </div>
                        <div class="min-w-0">
                          <span class="font-bold text-white text-xs block truncate" title="${escapeHTML(item.model)}">${escapeHTML(item.model)}</span>
                          <span class="text-[10px] text-slate-400 font-mono">${escapeHTML(item.role || 'Hardware')} &bull; ${item.consumedPoEWatts || item.baseWatts || 0}W</span>
                        </div>
                      </div>
                      <span class="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-950/80 border border-amber-800/80 text-amber-300 font-bold shrink-0">
                        ${mount}
                      </span>
                    </div>

                    <div class="flex items-center justify-between gap-1 pt-1.5 border-t border-slate-900 text-xs">
                      ${(currentSpace && !(isServer || isServerDevice(item))) ? `
                        <button 
                          onclick="assignHardwareToLocation('${escapeJSAttr(item.instanceId)}', '${escapeJSAttr(currentSpace.name)} • Field')" 
                          class="flex-1 px-2 py-1 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white rounded text-[10px] font-bold border border-indigo-500/40 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                          title="Assign to ${escapeHTML(currentSpace.name)} (Field / Space Level)"
                        >
                          <i data-lucide="plus" class="w-3 h-3"></i> To ${escapeHTML(currentSpace.name)}
                        </button>
                      ` : ((isServer || isServerDevice(item)) ? `
                        <span class="flex-1 px-1.5 py-1 bg-purple-950/60 border border-purple-800/60 text-purple-300 rounded text-[9px] font-mono font-bold text-center truncate" title="Servers must be mounted into a rack/enclosure">
                          Enclosure Required
                        </span>
                      ` : '')}

                      <!-- Enclosure Quick Dropdown -->
                      <select 
                        onchange="if(this.value) assignHardwareToLocation('${item.instanceId}', this.value)" 
                        class="bg-slate-900 border border-slate-700 text-slate-300 text-[10px] rounded px-1.5 py-1 focus:outline-none focus:border-brand-500 max-w-[110px] truncate cursor-pointer"
                        title="Mount in a specific Enclosure"
                      >
                        <option value="">Mount in...</option>
                        ${availableEnclosures.map(enc => {
                          const sp = FacilityStore.getSpaces().find(s => s.id === enc.spaceId);
                          const encLoc = sp ? `${sp.name} • ${enc.name}` : enc.name;
                          return `<option value="${escapeHTML(encLoc)}">${escapeHTML(encLoc)}</option>`;
                        }).join('')}
                      </select>

                      <div class="flex items-center gap-0.5 shrink-0">
                        <button onclick="jumpToBomTarget('${item.instanceId}')" class="p-1 text-slate-400 hover:text-emerald-300 transition-colors" title="View in BOM">
                          <i data-lucide="file-spreadsheet" class="w-3 h-3"></i>
                        </button>
                        <button onclick="jumpToPhysicalLayoutTarget('${item.instanceId}')" class="p-1 text-slate-400 hover:text-amber-300 transition-colors" title="View in Physical Layout">
                          <i data-lucide="map" class="w-3 h-3"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>
      `;
    })()}
  `;

    if (window.lucide) lucide.createIcons();
  } catch (err) {
    console.error("Facility Manager Render Error:", err);
    container.innerHTML = `
      <div class="p-8 text-center text-rose-400 bg-rose-950/20 border border-rose-800/40 rounded-2xl max-w-xl mx-auto my-8">
        <i data-lucide="alert-triangle" class="w-8 h-8 mx-auto mb-3 text-rose-400"></i>
        <p class="font-bold text-base mb-1 text-white">Hierarchy & Spaces encountered a display issue</p>
        <p class="text-xs text-rose-300 font-mono mb-4">${escapeHTML(err.message || String(err))}</p>
        <div class="flex items-center justify-center gap-3">
          <button onclick="renderFacilityManager()" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all shadow cursor-pointer">
            Reload Hierarchy View
          </button>
        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
  }
}

function getSuggestedHostName(hostType, existingCount) {
  const num = existingCount + 1;
  switch (hostType) {
    case "security_cabinet":
      return `Security-Cab-${num}`;
    case "industrial_din":
      return `NEMA-Box-${num}`;
    case "architectural_backboard":
      return `Backboard-${num}`;
    default:
      return `Rack-${num}`;
  }
}

function renderInlineHostSpecificFields(hostType, currentSpace = null) {
  const isPoleSpace = currentSpace && currentSpace.type === "pole";

  if (hostType === "security_cabinet") {
    return `
      <div>
        <label class="text-[10px] text-slate-400 block mb-1">Subplate Bays:</label>
        <select id="inlineCabinetBays" class="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-2 py-1 text-xs">
          <option value="4">4 Bays (Trove 1 / Compact)</option>
          <option value="8" selected>8 Bays (Trove 2 / Standard)</option>
          <option value="12">12 Bays (Trove 3 / High Density)</option>
          <option value="16">16 Bays (LifeSafety ProWire)</option>
        </select>
      </div>
      <div>
        ${isPoleSpace ? `
          <label class="text-[10px] text-cyan-400 block mb-1">Mounting Height (ft AGL):</label>
          <select id="inlineHostMountHeight" class="w-full bg-slate-950 border border-slate-700 text-cyan-300 font-bold rounded-lg px-2 py-1 text-xs">
            <option value="6">6 ft AGL (Low Band)</option>
            <option value="8">8 ft AGL (Service Height)</option>
            <option value="10" selected>10 ft AGL (Standard)</option>
            <option value="12">12 ft AGL (Elevated)</option>
          </select>
        ` : `
          <label class="text-[10px] text-slate-400 block mb-1">DC Bus Voltage:</label>
          <select id="inlineCabinetVoltage" class="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-2 py-1 text-xs">
            <option value="dual_12_24" selected>Dual 12V / 24VDC</option>
            <option value="24vdc">24VDC Dedicated</option>
            <option value="12vdc">12VDC Dedicated</option>
          </select>
        `}
      </div>
    `;
  } else if (hostType === "industrial_din") {
    return `
      <div>
        <label class="text-[10px] text-slate-400 block mb-1">DIN Rails:</label>
        <select id="inlineDinRails" class="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-2 py-1 text-xs">
          <option value="1">1 Rail (Compact NEMA)</option>
          <option value="2" selected>2 Rails (Standard NEMA 4X)</option>
          <option value="3">3 Rails (Deep Industrial)</option>
          <option value="4">4 Rails (Full Control)</option>
        </select>
      </div>
      <div>
        ${isPoleSpace ? `
          <label class="text-[10px] text-cyan-400 block mb-1">Mounting Height (ft AGL):</label>
          <select id="inlineHostMountHeight" class="w-full bg-slate-950 border border-slate-700 text-cyan-300 font-bold rounded-lg px-2 py-1 text-xs">
            <option value="8">8 ft AGL (Accessible)</option>
            <option value="10" selected>10 ft AGL (Standard Banding)</option>
            <option value="12">12 ft AGL (High Clearance)</option>
            <option value="15">15 ft AGL (Mid-Pole)</option>
          </select>
        ` : `
          <label class="text-[10px] text-slate-400 block mb-1">Mounting Method:</label>
          <select id="inlineDinMounting" class="w-full bg-slate-950 border border-slate-700 text-amber-300 font-bold rounded-lg px-2 py-1 text-xs">
            <option value="wall" selected>Wall Mount (Flanges/Strut)</option>
            <option value="pole">Pole Mount (Stainless Banding)</option>
          </select>
        `}
      </div>
    `;
  } else if (hostType === "architectural_backboard") {
    return `
      <div>
        <label class="text-[10px] text-slate-400 block mb-1">Plywood Dimensions:</label>
        <select id="inlineBackboardSize" class="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-2 py-1 text-xs">
          <option value="4" selected>4' x 8' Sheet (32 sq ft)</option>
          <option value="8">8' x 8' Wallfield (64 sq ft)</option>
          <option value="12">12' x 8' Room Field (96 sq ft)</option>
        </select>
      </div>
      <div>
        <label class="text-[10px] text-slate-400 block mb-1">Rating Stamp:</label>
        <input type="text" disabled value="3/4\" AC Fire-Retardant" class="w-full bg-slate-950/60 border border-slate-800 text-slate-400 rounded-lg px-2 py-1 text-xs">
      </div>
    `;
  } else {
    // 19" Equipment Rack
    return `
      <div>
        <label class="text-[10px] text-slate-400 block mb-1">Rack Height:</label>
        <select id="inlineRackHeight" class="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-2 py-1 text-xs font-mono">
          <option value="12">12U Wallbox</option>
          <option value="18">18U Wallbox</option>
          <option value="24" selected>24U Half-Rack</option>
          <option value="42">42U Full-Rack</option>
          <option value="48">48U Enterprise</option>
        </select>
      </div>
      <div>
        <label class="text-[10px] text-slate-400 block mb-1">Frame Depth:</label>
        <select id="inlineRackDepth" class="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-2 py-1 text-xs font-mono">
          <option value="24">24" Shallow</option>
          <option value="36" selected>36" Standard</option>
          <option value="42">42" Deep Server</option>
        </select>
      </div>
    `;
  }
}

function selectFacilityFloor(floorId) {
  activeFacilityFloorId = floorId;
  const spaces = FacilityStore.getSpaces(floorId);
  activeFacilitySpaceId = spaces[0] ? spaces[0].id : null;
  facilityActiveForm = null;
  renderFacilityManager();
}

function selectFacilitySpace(spaceId) {
  activeFacilitySpaceId = spaceId;
  facilityActiveForm = null;
  renderFacilityManager();
}

// Backward-compatible Prompt Callbacks delegating to streamlined inline forms
function promptAddFloor() {
  openFacilityAddForm("add_floor");
}

function promptAddSpace(floorId) {
  if (floorId) activeFacilityFloorId = floorId;
  openFacilityAddForm("add_space");
}

function promptAddEnclosure(spaceId) {
  if (spaceId) activeFacilitySpaceId = spaceId;
  openFacilityAddForm("add_host");
}

function renameFacilityFloor(floorId, newName = null) {
  const floors = FacilityStore.getFloors();
  const floor = floors.find(f => f.id === floorId);
  if (!floor) return;
  const targetName = newName || prompt("Rename Floor/Building:", floor.name);
  if (!targetName || !targetName.trim() || targetName.trim() === floor.name) return;
  const result = FacilityStore.updateFloor(floorId, { name: targetName.trim() });
  if (result) {
    renderFacilityManager();
    if (typeof showToast === "function") showToast(`Floor/Building renamed to "${targetName.trim()}"`);
  }
}

function deleteFacilityFloor(floorId) {
  const floors = FacilityStore.getFloors();
  const floor = floors.find(f => f.id === floorId);
  if (!floor) return;
  if (confirm(`Delete floor/building "${floor.name}"? Associated spaces will be reassigned or unassigned.`)) {
    FacilityStore.deleteFloor(floorId);
    const remaining = FacilityStore.getFloors();
    activeFacilityFloorId = remaining.length > 0 ? remaining[0].id : null;
    facilityActiveForm = null;
    renderFacilityManager();
    if (typeof showToast === "function") showToast(`Deleted floor/building "${floor.name}"`);
  }
}

function renameFacilitySpace(spaceId, newName = null) {
  const spaces = FacilityStore.getSpaces();
  const space = spaces.find(s => s.id === spaceId);
  if (!space) return;
  const targetName = newName || prompt("Rename Telecom Space / Closet:", space.name);
  if (!targetName || !targetName.trim() || targetName.trim() === space.name) return;
  const result = FacilityStore.updateSpace(spaceId, { name: targetName.trim() });
  if (result) {
    renderFacilityManager();
    if (typeof showToast === "function") showToast(`Space renamed to "${targetName.trim()}"`);
  }
}

function deleteFacilitySpace(spaceId) {
  const spaces = FacilityStore.getSpaces();
  const space = spaces.find(s => s.id === spaceId);
  if (!space) return;
  if (confirm(`Delete telecom space "${space.name}"? All associated equipment will be unassigned.`)) {
    FacilityStore.deleteSpace(spaceId);
    const remaining = FacilityStore.getSpaces();
    activeFacilitySpaceId = remaining.length > 0 ? remaining[0].id : null;
    facilityActiveForm = null;
    renderFacilityManager();
    if (typeof showToast === "function") showToast(`Deleted space "${space.name}"`);
  }
}

function renameFacilityEnclosure(enclosureId, newName = null) {
  const encs = FacilityStore.getEnclosures();
  const enc = encs.find(e => e.id === enclosureId);
  if (!enc) return;
  const targetName = newName || prompt("Rename Enclosure / Rack:", enc.name);
  if (!targetName || !targetName.trim() || targetName.trim() === enc.name) return;
  const result = FacilityStore.updateHost(enclosureId, { name: targetName.trim() });
  if (result) {
    renderFacilityManager();
    if (typeof showToast === "function") showToast(`Enclosure renamed to "${targetName.trim()}"`);
  }
}

function deleteFacilityEnclosure(enclosureId) {
  const encs = FacilityStore.getEnclosures();
  const enc = encs.find(e => e.id === enclosureId);
  if (!enc) return;
  if (confirm(`Delete host / enclosure "${enc.name}"? Assigned hardware will be moved to Unassigned.`)) {
    FacilityStore.deleteEnclosure(enclosureId);
    facilityActiveForm = null;
    renderFacilityManager();
    if (typeof showToast === "function") showToast(`Deleted enclosure "${enc.name}"`);
  }
}

function openRackViewerFor(locationName) {
  if (typeof NavigationHistory !== "undefined") {
    const st = NavigationHistory.captureCurrentState();
    if (st && st.tool !== "facility") NavigationHistory.push(st);
  }
  previousFacilityFloorId = activeFacilityFloorId;
  previousFacilitySpaceId = activeFacilitySpaceId;
  facilityActiveForm = null;

  if (window.TabManager && typeof window.TabManager.openTab === "function") {
    window.TabManager.openTab("enclosures", locationName ? { locationName } : null);
    return;
  }

  const facModal = document.getElementById("facilityModal");
  if (facModal && facModal.classList.contains("hidden")) {
    facModal.classList.remove("hidden");
  }

  switchFacilityView("visualizer", locationName);
}

function jumpToFacilitySpace(target) {
  if (!target) return;
  if (typeof NavigationHistory !== "undefined") {
    const st = NavigationHistory.captureCurrentState();
    if (st && st.tool !== "facility") NavigationHistory.push(st);
  }

  const parsed = FacilityStore.parse(target);
  const spaces = FacilityStore.getSpaces();
  const space = spaces.find(s => 
    s.id === target || 
    s.name.toLowerCase() === target.toLowerCase() || 
    (parsed.space && s.name.toLowerCase() === parsed.space.toLowerCase())
  );

  if (space) {
    activeFacilityFloorId = space.floorId;
    activeFacilitySpaceId = space.id;
    previousFacilityFloorId = space.floorId;
    previousFacilitySpaceId = space.id;
  }

  if (window.TabManager && typeof window.TabManager.openTab === "function") {
    window.TabManager.openTab("facility");
    if (space) {
      activeFacilityFloorId = space.floorId;
      activeFacilitySpaceId = space.id;
      renderFacilityManager();
    }
    return;
  }

  const facModal = document.getElementById("facilityModal");
  if (facModal && facModal.classList.contains("hidden")) {
    facModal.classList.remove("hidden");
  }
  switchFacilityView("hierarchy");
  if (space) {
    activeFacilityFloorId = space.floorId;
    activeFacilitySpaceId = space.id;
    renderFacilityManager();
  }
}

// Window Compatibility Exports
if (typeof window !== "undefined") {
  window.MOUNTING_HOST_TYPES = MOUNTING_HOST_TYPES;
  window.EDGE_ENDPOINT_TYPES = EDGE_ENDPOINT_TYPES;
  window.FacilityStore = FacilityStore;
  window.facilityActiveView = facilityActiveView;
  window.switchFacilityView = switchFacilityView;
  window.syncVisualizerBreadcrumbs = syncVisualizerBreadcrumbs;
  window.handleFacilityModalCloseOrBack = handleFacilityModalCloseOrBack;
  window.toggleFacilityModal = toggleFacilityModal;
  window.toggleFacilityManager = toggleFacilityModal; // Alias for seamless navigation
  window.openFacilityModal = openFacilityModal;
  window.renderFacilityManager = renderFacilityManager;
  window.selectFacilityFloor = selectFacilityFloor;
  window.selectFacilitySpace = selectFacilitySpace;
  window.openFacilityAddForm = openFacilityAddForm;
  window.closeFacilityAddForm = closeFacilityAddForm;
  window.setFacilityNewHostType = setFacilityNewHostType;
  window.saveInlineFloor = saveInlineFloor;
  window.saveInlineSpace = saveInlineSpace;
  window.saveInlineHost = saveInlineHost;
  window.promptAddFloor = promptAddFloor;
  window.promptAddSpace = promptAddSpace;
  window.promptAddEnclosure = promptAddEnclosure;
  window.deleteFacilityFloor = deleteFacilityFloor;
  window.renameFacilityFloor = renameFacilityFloor;
  window.deleteFacilitySpace = deleteFacilitySpace;
  window.renameFacilitySpace = renameFacilitySpace;
  window.deleteFacilityEnclosure = deleteFacilityEnclosure;
  window.renameFacilityEnclosure = renameFacilityEnclosure;
  window.openRackViewerFor = openRackViewerFor;
  window.jumpToFacilitySpace = jumpToFacilitySpace;
  window.updateSpacePoleHeight = updateSpacePoleHeight;
  window.handleEnclosureDragStart = handleEnclosureDragStart;
  window.handleEnclosureDragEnd = handleEnclosureDragEnd;
  window.handleHardwareStagingDragStart = handleHardwareStagingDragStart;
  window.handleHardwareStagingDragEnd = handleHardwareStagingDragEnd;
  window.handleSpaceCardDragOver = handleSpaceCardDragOver;
  window.handleSpaceCardDragLeave = handleSpaceCardDragLeave;
  window.handleSpaceCardDrop = handleSpaceCardDrop;
  window.handleFloorFieldDragOver = handleFloorFieldDragOver;
  window.handleFloorFieldDragLeave = handleFloorFieldDragLeave;
  window.handleFloorFieldDrop = handleFloorFieldDrop;
  window.handleFloorCardDragOver = handleFloorCardDragOver;
  window.handleFloorCardDragLeave = handleFloorCardDragLeave;
  window.handleFloorCardDrop = handleFloorCardDrop;
  window.handleEnclosureCardDragOver = handleEnclosureCardDragOver;
  window.handleEnclosureCardDragLeave = handleEnclosureCardDragLeave;
  window.handleEnclosureCardDrop = handleEnclosureCardDrop;
  window.assignHardwareToLocation = assignHardwareToLocation;
  window.assignAllUnassignedToSpace = assignAllUnassignedToSpace;
  window.promptAssignHardwareToSpace = promptAssignHardwareToSpace;
  window.promptAssignHardwareToFloorField = promptAssignHardwareToFloorField;
  window.openQuickAddEnclosureModal = openQuickAddEnclosureModal;
  window.closeQuickAddEnclosureModal = closeQuickAddEnclosureModal;
  window.updateQuickAddTypeFields = updateQuickAddTypeFields;
  window.submitQuickAddEnclosure = submitQuickAddEnclosure;
  window.isServerDevice = isServerDevice;
  window.isFieldLocation = isFieldLocation;
}

function promptAssignHardwareToFloorField(floorName) {
  if (!floorName) return;
  const targetLoc = `${floorName} • Field`;
  const tray = document.getElementById("facilityUnassignedHardwareTray");
  if (tray) {
    tray.scrollIntoView({ behavior: "smooth", block: "center" });
    tray.classList.add("ring-2", "ring-amber-400");
    setTimeout(() => {
      tray.classList.remove("ring-2", "ring-amber-400");
    }, 2500);
    if (typeof showToast === "function") {
      showToast(`Select or drag a staged camera, door, or sensor below to assign to "${targetLoc}".`);
    }
  }
}

function promptAssignHardwareToSpace(spaceName) {
  if (!spaceName) return;
  promptAssignHardwareToFloorField(spaceName);
}

// -----------------------------------------------------------
// Quick Add Enclosure / Rack Modal Functions
// -----------------------------------------------------------
function handleQuickAddCatalogPartChange(sku) {
  const priceLabel = document.getElementById("quickAddPriceLabel");
  const nameInput = document.getElementById("quickAddHostNameInput");
  const typeSelect = document.getElementById("quickAddHostTypeSelect");
  const hostType = typeSelect ? typeSelect.value : "equipment_rack";

  if (!sku || sku === "custom") {
    if (priceLabel) priceLabel.textContent = "$0";
    return;
  }

  const part = (typeof CatalogRegistry !== "undefined" && typeof CatalogRegistry.getRack === "function")
    ? CatalogRegistry.getRack(sku)
    : null;

  if (!part) return;

  if (priceLabel) {
    priceLabel.textContent = `$${(part.msrp || 0).toLocaleString()}`;
  }

  if (nameInput) {
    const encCount = FacilityStore.getEnclosures().length;
    const prefix = hostType === "equipment_rack" ? "Rack" : (hostType === "security_cabinet" ? "Sec-Cab" : (hostType === "industrial_din" ? "NEMA" : "Backboard"));
    nameInput.value = `${prefix}-${encCount + 1} (${part.vendor} ${part.sku})`;
  }

  if (hostType === "equipment_rack") {
    const hSelect = document.getElementById("quickAddRackHeight");
    if (hSelect && part.rackUnits) hSelect.value = String(part.rackUnits);
    const dSelect = document.getElementById("quickAddRackDepth");
    if (dSelect && part.depthInches) {
      if (part.depthInches >= 40) dSelect.value = "42";
      else if (part.depthInches >= 30) dSelect.value = "36";
      else dSelect.value = "24";
    }
  } else if (hostType === "security_cabinet") {
    const bSelect = document.getElementById("quickAddCabinetBays");
    if (bSelect && part.subplateBays) bSelect.value = String(part.subplateBays);
  } else if (hostType === "industrial_din") {
    const rSelect = document.getElementById("quickAddDinRails");
    if (rSelect && part.dinRails) rSelect.value = String(part.dinRails);
  } else if (hostType === "architectural_backboard") {
    const wSelect = document.getElementById("quickAddBackboardSize");
    if (wSelect) {
      if (part.widthFt <= 4 && part.heightFt <= 4) wSelect.value = "4x4";
      else if (part.widthFt) wSelect.value = String(part.widthFt);
    }
  }
}
window.handleQuickAddCatalogPartChange = handleQuickAddCatalogPartChange;

function updateQuickAddTypeFields(hostType) {
  const container = document.getElementById("quickAddSpecificFields");
  const catSelect = document.getElementById("quickAddCatalogPartSelect");

  let availableRacks = [];
  if (typeof CatalogRegistry !== "undefined" && typeof CatalogRegistry.getRacks === "function") {
    availableRacks = CatalogRegistry.getRacks(hostType);
  } else if (typeof ACCESSORY_DATABASE !== "undefined") {
    availableRacks = ACCESSORY_DATABASE.filter(a => a.type === hostType || a.category === "racks");
  }

  if (catSelect) {
    catSelect.innerHTML = availableRacks.map(r => {
      const specSnippet = (hostType === "equipment_rack")
        ? `${r.rackUnits}U • ${r.depthInches ? `${r.depthInches}"D` : ''} • $${(r.msrp || 0).toLocaleString()}`
        : (hostType === "security_cabinet")
        ? `${r.subplateBays || 8} Bays • $${(r.msrp || 0).toLocaleString()}`
        : (hostType === "industrial_din")
        ? `${r.dinRails || 2}x DIN • $${(r.msrp || 0).toLocaleString()}`
        : `${r.widthFt || 4}'x${r.heightFt || 8}' • $${(r.msrp || 0).toLocaleString()}`;
      return `<option value="${r.sku}">${r.vendor} ${r.sku} (${r.model}) - $${(r.msrp || 0).toLocaleString()}</option>`;
    }).join('') + `<option value="custom">⚡ Custom / Unspecified Hardware ($0)</option>`;

    if (availableRacks.length > 0) {
      handleQuickAddCatalogPartChange(availableRacks[0].sku);
    } else {
      handleQuickAddCatalogPartChange("custom");
    }
  }

  if (!container) return;

  if (hostType === "equipment_rack") {
    container.innerHTML = `
      <div>
        <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Rack Height:</label>
        <select id="quickAddRackHeight" class="w-full bg-slate-950 border border-slate-700 text-white font-mono rounded-lg px-2 py-1.5 text-xs focus:border-indigo-500 focus:outline-none">
          <option value="6">6U Mini / Wallbox</option>
          <option value="12">12U Wallbox</option>
          <option value="18">18U Wallbox</option>
          <option value="24" selected>24U Half-Rack</option>
          <option value="42">42U Full-Rack</option>
          <option value="45">45U Relay / Open Frame</option>
          <option value="48">48U Enterprise</option>
        </select>
      </div>
      <div>
        <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Frame Depth:</label>
        <select id="quickAddRackDepth" class="w-full bg-slate-950 border border-slate-700 text-white font-mono rounded-lg px-2 py-1.5 text-xs focus:border-indigo-500 focus:outline-none">
          <option value="15">15" Relay Rack</option>
          <option value="21">21.6" Wallbox</option>
          <option value="24">24" Shallow</option>
          <option value="36" selected>36" Standard</option>
          <option value="42">42" Server Deep</option>
        </select>
      </div>
    `;
  } else if (hostType === "security_cabinet") {
    container.innerHTML = `
      <div>
        <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Subplate Bays:</label>
        <select id="quickAddCabinetBays" class="w-full bg-slate-950 border border-slate-700 text-emerald-300 font-bold rounded-lg px-2 py-1.5 text-xs focus:border-indigo-500 focus:outline-none">
          <option value="4">4 Bays (Trove1 / Small LSP)</option>
          <option value="8" selected>8 Bays (Trove2 / Medium LSP)</option>
          <option value="12">12 Bays (Trove3 High-Density)</option>
          <option value="16">16 Bays (Large Enterprise)</option>
        </select>
      </div>
      <div>
        <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">DC Bus Voltage:</label>
        <select id="quickAddCabinetVoltage" class="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-2 py-1.5 text-xs focus:border-indigo-500 focus:outline-none">
          <option value="dual_12_24" selected>Dual 12V / 24VDC</option>
          <option value="24vdc">24VDC Lock Power</option>
          <option value="12vdc">12VDC System</option>
        </select>
      </div>
    `;
  } else if (hostType === "industrial_din") {
    container.innerHTML = `
      <div>
        <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">DIN Rails:</label>
        <select id="quickAddDinRails" class="w-full bg-slate-950 border border-slate-700 text-amber-300 font-bold rounded-lg px-2 py-1.5 text-xs focus:border-indigo-500 focus:outline-none">
          <option value="1">1 Rail (Compact)</option>
          <option value="2" selected>2 Rails (Standard NEMA)</option>
          <option value="3">3 Rails (Deep Control)</option>
        </select>
      </div>
      <div>
        <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Mounting:</label>
        <select id="quickAddDinMounting" class="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-2 py-1.5 text-xs focus:border-indigo-500 focus:outline-none">
          <option value="wall" selected>Wall Mount Flanges</option>
          <option value="pole">Pole Banding Clamps</option>
        </select>
      </div>
    `;
  } else {
    // architectural_backboard
    container.innerHTML = `
      <div class="col-span-2">
        <label class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Plywood Field Size:</label>
        <select id="quickAddBackboardSize" class="w-full bg-slate-950 border border-slate-700 text-purple-300 font-bold rounded-lg px-2 py-1.5 text-xs focus:border-indigo-500 focus:outline-none">
          <option value="4" selected>4' x 8' Sheet (32 sq ft)</option>
          <option value="4x4">4' x 4' Sheet (16 sq ft)</option>
          <option value="8">8' x 8' Wallfield (64 sq ft)</option>
          <option value="12">12' x 8' Room Field (96 sq ft)</option>
        </select>
      </div>
    `;
  }
}

function openQuickAddEnclosureModal() {
  const modal = document.getElementById("quickAddEnclosureModal");
  if (!modal) return;

  const spaceSelect = document.getElementById("quickAddSpaceSelect");
  const spaces = FacilityStore.getSpaces();
  if (spaceSelect) {
    spaceSelect.innerHTML = spaces.map(s => {
      const isSel = (s.id === activeFacilitySpaceId) || (typeof activeRackId === "string" && activeRackId.startsWith(s.name));
      return `<option value="${s.id}" ${isSel ? 'selected' : ''}>${escapeHTML(s.name)} (${(s.type || 'idf').toUpperCase()})</option>`;
    }).join('');
  }

  const typeSelect = document.getElementById("quickAddHostTypeSelect");
  if (typeSelect) typeSelect.value = "equipment_rack";
  updateQuickAddTypeFields("equipment_rack");

  const nameInput = document.getElementById("quickAddHostNameInput");
  if (nameInput) {
    const encCount = FacilityStore.getEnclosures().length;
    nameInput.value = `Rack-${encCount + 1}`;
  }

  const addToBomCheck = document.getElementById("quickAddAddToBOMCheckbox");
  if (addToBomCheck) {
    const projDefs = (typeof StorageService !== "undefined" && typeof StorageService.getProjectDefaults === "function")
      ? StorageService.getProjectDefaults()
      : null;
    addToBomCheck.checked = projDefs?.infrastructure?.racksInScope !== false;
  }

  const err = document.getElementById("quickAddHostError");
  if (err) err.classList.add("hidden");

  modal.classList.remove("hidden");
  setTimeout(() => { if (nameInput) nameInput.focus(); }, 50);
  if (window.lucide) lucide.createIcons();
}

function closeQuickAddEnclosureModal() {
  const modal = document.getElementById("quickAddEnclosureModal");
  if (modal) modal.classList.add("hidden");
}

function submitQuickAddEnclosure() {
  const nameInput = document.getElementById("quickAddHostNameInput");
  const spaceSelect = document.getElementById("quickAddSpaceSelect");
  const typeSelect = document.getElementById("quickAddHostTypeSelect");
  const errEl = document.getElementById("quickAddHostError");

  const name = nameInput ? nameInput.value.trim() : "";
  const spaceId = spaceSelect ? spaceSelect.value : activeFacilitySpaceId;
  const hostType = typeSelect ? typeSelect.value : "equipment_rack";

  if (!name) {
    if (errEl) {
      errEl.textContent = "Please enter an enclosure name.";
      errEl.classList.remove("hidden");
    }
    return;
  }

  const encs = FacilityStore.getEnclosures(spaceId);
  if (encs.some(e => e.name.trim().toLowerCase() === name.toLowerCase())) {
    if (errEl) {
      errEl.textContent = `An enclosure named "${name}" already exists in this space.`;
      errEl.classList.remove("hidden");
    }
    return;
  }

  const catSelect = document.getElementById("quickAddCatalogPartSelect");
  const addToBomCheck = document.getElementById("quickAddAddToBOMCheckbox");
  const selectedSku = catSelect ? catSelect.value : null;
  const addToBOM = addToBomCheck ? addToBomCheck.checked : false;

  const options = {};
  if (hostType === "equipment_rack") {
    const hSelect = document.getElementById("quickAddRackHeight");
    options.heightU = hSelect ? parseInt(hSelect.value, 10) : 24;
    const dSelect = document.getElementById("quickAddRackDepth");
    options.depthInches = dSelect ? parseInt(dSelect.value, 10) : 36;
  } else if (hostType === "security_cabinet") {
    const bSelect = document.getElementById("quickAddCabinetBays");
    options.subplateBays = bSelect ? parseInt(bSelect.value, 10) : 8;
    const vSelect = document.getElementById("quickAddCabinetVoltage");
    options.dcVoltage = vSelect ? vSelect.value : "dual_12_24";
  } else if (hostType === "industrial_din") {
    const rSelect = document.getElementById("quickAddDinRails");
    options.dinRails = rSelect ? parseInt(rSelect.value, 10) : 2;
    const mSelect = document.getElementById("quickAddDinMounting");
    options.mountingMethod = mSelect ? mSelect.value : "wall";
    options.railLengthMm = 350;
  } else if (hostType === "architectural_backboard") {
    const wSelect = document.getElementById("quickAddBackboardSize");
    const val = wSelect ? wSelect.value : "4";
    if (val === "4x4") {
      options.widthFt = 4;
      options.heightFt = 4;
    } else {
      options.widthFt = parseInt(val, 10) || 4;
      options.heightFt = 8;
    }
  }

  if (selectedSku && selectedSku !== "custom") {
    options.catalogSku = selectedSku;
  }
  options.addToBOM = addToBOM;

  FacilityStore.addHost(name, hostType, spaceId, options);
  closeQuickAddEnclosureModal();

  const space = FacilityStore.getSpaces().find(s => s.id === spaceId);
  const newLoc = space ? `${space.name} • ${name}` : name;
  activeRackId = newLoc;

  if (typeof syncRackSelectorOptions === "function") syncRackSelectorOptions();
  if (typeof renderRackVisualizer === "function") renderRackVisualizer();
  if (typeof renderFacilityManager === "function") renderFacilityManager();

  if (typeof showToast === "function") {
    showToast(`Created ${newLoc} (${FacilityStore.HOST_TYPES[hostType].label})`);
  }
  if (window.lucide) lucide.createIcons();
}
