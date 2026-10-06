// =========================================================================
// PHYSICAL LAYOUT CANVAS ENGINE (v0.5.3 - FacilityStore & Dispatcher Aligned)
// =========================================================================

let activeCableTool = "select"; // "select" | "device" | "mdf" | "fiber"
let selectedNodeId = null;
let selectedFiberBackboneId = null;
let activeSidebarTab = "runs";  // "runs" | "unplaced"

let activeCableSku = "C6A-CMP-1K-BL";
let useOrthogonalRouting = false;
let currentCanvasZoom = 1.0;
let isModalFullscreen = false;

let activeFloorId = null;
let facilityFloors = [];

let fiberFirstClosetId = null;

// Physical Layer Filtering & Inspector Visibility
let isPhysicalInspectorVisible = true;
let physicalLayerFilters = {
  cameras: true,
  access: true,
  wireless: true,
  closets: true,
  pathways: true
};

function getDeviceLayerType(item) {
  if (!item) return "cameras";
  if (item.type === "closet" || item.hostType || item.enclosureId) return "closets";

  // 1. Prioritize canonical DeviceTaxonomy classification
  if (typeof DeviceTaxonomy !== "undefined" && typeof DeviceTaxonomy.getDeviceType === "function") {
    const tax = DeviceTaxonomy.getDeviceType(item);
    if (tax) {
      if (tax.prefix === "CAM" || tax.prefix === "LPR") return "cameras";
      if (tax.prefix === "DR" || tax.prefix === "ACS" || tax.prefix === "BIO" || tax.prefix === "SIP") return "access";
      if (tax.prefix === "P2P") return "wireless";
    }
  }

  const role = (item.role || "").trim();
  const cat = (item.category || "").toLowerCase().trim();
  const model = (item.model || "").toLowerCase();
  const desc = (item.description || "").toLowerCase();
  const prefix = item.deviceTypePrefix || "";
  const allText = `${role} ${cat} ${model} ${desc}`.toLowerCase();

  if (prefix === "CAM" || prefix === "LPR" ||
      role === "Camera" || role === "Surveillance" || role === "Video" || role === "LPR" ||
      cat.includes("camera") || cat.includes("surveillance") ||
      /\b(camera|cams?|dome|bullet|ptz|turret|fisheye|multisensor|lpr|anpr)\b/i.test(allText)) {
    return "cameras";
  }

  if (prefix === "DR" || prefix === "ACS" || prefix === "BIO" || prefix === "SIP" ||
      role === "Access Control" || role === "Door" || role === "Biometric" || role === "Intercom" || role === "Audio/Intercom" ||
      cat.includes("access_control") || cat === "door" || cat === "doors" || cat.includes("intercom") ||
      /\b(door|reader|portal|turnstile|mercury|cloudlink|istar|intercom|doorbell|sip)\b/i.test(allText)) {
    return "access";
  }

  if (prefix === "P2P" || role === "Wireless Bridge" || role === "Wireless" || role === "P2P" ||
      cat.includes("wireless") || /\b(nanobeam|gigabeam|airmax|wave|bridge|p2p|ptmp|ubb)\b/i.test(allText)) {
    return "wireless";
  }

  if (role.includes("cabling") || role.includes("pathway") || role.includes("patch") || role === "Structured Cabling") {
    return "pathways";
  }

  return "cameras";
}

function togglePhysicalInspector(forceState = null) {
  const sidebar = document.getElementById("cableSidebar");
  const openBtn = document.getElementById("cableOpenInspectorBtn");
  const headerBtn = document.getElementById("cableInspectorHeaderBtn");
  if (!sidebar) return;

  if (forceState !== null) {
    isPhysicalInspectorVisible = forceState;
  } else {
    isPhysicalInspectorVisible = !isPhysicalInspectorVisible;
  }

  if (isPhysicalInspectorVisible) {
    sidebar.classList.remove("hidden");
    if (openBtn) openBtn.classList.add("hidden");
    if (headerBtn) headerBtn.classList.add("border-amber-500", "text-amber-300");
  } else {
    sidebar.classList.add("hidden");
    if (openBtn) openBtn.classList.remove("hidden");
    if (headerBtn) headerBtn.classList.remove("border-amber-500", "text-amber-300");
  }
}

function togglePhysicalLayerMenu() {
  const menu = document.getElementById("physicalLayerMenu");
  if (!menu) return;
  menu.classList.toggle("hidden");
}

function setPhysicalLayerFilter(layer, enabled) {
  if (physicalLayerFilters.hasOwnProperty(layer)) {
    physicalLayerFilters[layer] = !!enabled;
  }
  updatePhysicalLayerCountBadge();
  renderCableCanvas();
  renderSidebarTabContent();
}

function toggleAllPhysicalLayers(enableAll) {
  Object.keys(physicalLayerFilters).forEach(k => {
    physicalLayerFilters[k] = !!enableAll;
    const chk = document.getElementById(`physLayer-${k}`);
    if (chk) chk.checked = !!enableAll;
  });
  updatePhysicalLayerCountBadge();
  renderCableCanvas();
  renderSidebarTabContent();
}

function updatePhysicalLayerCountBadge() {
  const badge = document.getElementById("badgePhysicalLayerCount");
  if (!badge) return;
  const total = Object.keys(physicalLayerFilters).length;
  const active = Object.values(physicalLayerFilters).filter(Boolean).length;
  badge.textContent = active === total ? "All" : `${active}/${total}`;
  if (active < total) {
    badge.className = "text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500 text-slate-950 font-bold";
  } else {
    badge.className = "text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold";
  }
}

// Isolated Dragging State
let isDraggingPhysNode = false;
let draggedPhysNode = null;
let isDraggingPhysWaypoint = false;
let draggedPhysWaypoint = null;
let physDragOffset = { x: 0, y: 0 };

function isPhysCanvasVisible() {
  const modal = document.getElementById("cableLayoutModal");
  return modal && !modal.classList.contains("hidden");
}

function getActiveFloor() {
  if (facilityFloors.length === 0) {
    activeFloorId = null;
    return null;
  }
  let floor = facilityFloors.find(f => f.id === activeFloorId);
  if (!floor) {
    floor = facilityFloors[0];
    activeFloorId = floor.id;
  }
  if (!floor.nodes) floor.nodes = [];
  if (!floor.fiberBackbones) floor.fiberBackbones = [];
  return floor;
}

function toggleCableLayoutModal() {
  const modal = document.getElementById("cableLayoutModal");
  if (!modal) return;

  if (modal.classList.contains("hidden")) {
    modal.classList.remove("hidden");
    loadFacilityState();
    initCableCanvas();
    syncBOMClosetsToFloors();
    const curFl = getActiveFloor();
    if (curFl) {
      autoSyncFiberBackbonesFromTopology(curFl, false);
    }
    renderFloorSelector();
    syncFloorControlInputs();
    recalculateCurrentFloorCables();
    renderCableCanvas();
    renderInspector();
    renderSidebarTabContent();
    setTimeout(() => {
      fitPhysicalLayoutToScreen();
    }, 60);
    if (window.lucide) lucide.createIcons();
  } else {
    modal.classList.add("hidden");
    isDraggingPhysNode = false;
    isDraggingPhysWaypoint = false;
    isPhysViewportPanning = false;
    draggedPhysNode = null;
    draggedPhysWaypoint = null;
    const searchPopup = document.getElementById("physQuickSearchResults");
    if (searchPopup) searchPopup.classList.add("hidden");
  }
}

// -----------------------------------------------------------
// Project-Scoped Persistence (Debounced to protect 60fps canvas)
// -----------------------------------------------------------
let _facilitySaveTimer = null;
function saveFacilityState(immediate = false) {
  if (immediate) {
    if (_facilitySaveTimer) {
      clearTimeout(_facilitySaveTimer);
      _facilitySaveTimer = null;
    }
    _doSaveFacilityState();
    return;
  }
  if (_facilitySaveTimer) clearTimeout(_facilitySaveTimer);
  _facilitySaveTimer = setTimeout(() => {
    _facilitySaveTimer = null;
    _doSaveFacilityState();
  }, 250);
}

function _doSaveFacilityState() {
  try {
    const projId = (typeof FacilityStore !== "undefined" && typeof FacilityStore.getProjectId === "function") 
      ? FacilityStore.getProjectId() : "default";
    const data = {
      activeFloorId,
      activeCableSku,
      useOrthogonalRouting,
      facilityFloors
    };
    localStorage.setItem(`netselect_facility_${projId}`, JSON.stringify(data));
  } catch (e) {}
}

function loadFacilityState() {
  try {
    const projId = (typeof FacilityStore !== "undefined" && typeof FacilityStore.getProjectId === "function") 
      ? FacilityStore.getProjectId() : "default";
    const raw = localStorage.getItem(`netselect_facility_${projId}`);
    if (!raw) {
      const storeFloors = (typeof FacilityStore !== "undefined" && typeof FacilityStore.getFloors === "function") 
        ? FacilityStore.getFloors() : [];
      if (storeFloors.length > 0) {
        facilityFloors = storeFloors.map(sf => ({
          id: sf.id,
          name: sf.name,
          levelIndex: sf.levelIndex || 1,
          image: null,
          opacity: 0.7,
          scaleFt: sf.scaleFt || 25,
          slackFt: sf.slackFt || 15,
          slabFt: sf.slabFt || 14,
          nodes: [],
          fiberBackbones: []
        }));
        activeFloorId = facilityFloors[0].id;
      } else {
        facilityFloors = [];
        activeFloorId = null;
      }
      return;
    }
    const data = JSON.parse(raw);
    if (Array.isArray(data.facilityFloors)) {
      facilityFloors = data.facilityFloors;
    } else {
      facilityFloors = [];
    }
    activeFloorId = data.activeFloorId || (facilityFloors.length > 0 ? facilityFloors[0].id : null);
    if (data.activeCableSku) activeCableSku = data.activeCableSku;
    if (typeof data.useOrthogonalRouting === "boolean") useOrthogonalRouting = data.useOrthogonalRouting;
  } catch (e) {}
}

// -----------------------------------------------------------
// Canvas Interaction & Reliable Drag Engine
// -----------------------------------------------------------
let isPhysViewportPanning = false;
let physPanStart = { x: 0, y: 0, scrollLeft: 0, scrollTop: 0 };

function initCableCanvas() {
  const svg = document.getElementById("cableSvgCanvas");
  const viewport = document.getElementById("cableCanvasViewport");
  if (!svg || svg.dataset.initialized === "true") return;

  svg.dataset.initialized = "true";
  svg.addEventListener("mousedown", handlePhysMouseDown);
  if (viewport) {
    viewport.addEventListener("wheel", handlePhysWheel, { passive: false });
  }
  window.addEventListener("mousemove", handlePhysMouseMove);
  window.addEventListener("mouseup", handlePhysMouseUp);
}

function handlePhysWheel(e) {
  if (!isPhysCanvasVisible()) return;
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.08 : -0.08;
    adjustCanvasZoom(delta);
  }
}

function getCanvasCoordinates(e) {
  const svg = document.getElementById("cableSvgCanvas");
  const rect = svg.getBoundingClientRect();
  return {
    x: Math.round((e.clientX - rect.left) / currentCanvasZoom),
    y: Math.round((e.clientY - rect.top) / currentCanvasZoom)
  };
}

function handlePhysMouseDown(e) {
  if (!isPhysCanvasVisible()) return;
  const pos = getCanvasCoordinates(e);
  const floor = getActiveFloor();
  if (!floor) return;

  // 1. Fiber Backbone Tool
  if (activeCableTool === "fiber") {
    const closetEl = e.target.closest(".draggable-canvas-node");
    if (closetEl) {
      const nodeId = closetEl.getAttribute("data-node-id");
      const closetNode = floor.nodes.find(n => n.id === nodeId && n.type === "closet");
      if (closetNode) {
        if (!fiberFirstClosetId) {
          fiberFirstClosetId = closetNode.id;
          if (typeof showToast === "function") {
            showToast(`Selected ${closetNode.name}. Now click target closet.`);
          }
        } else if (fiberFirstClosetId !== closetNode.id) {
          const projFiber = (typeof getProjectFiberType === "function") ? getProjectFiberType() : "mmf";
          const newFb = {
            id: `fiber-${Date.now()}`,
            fromId: fiberFirstClosetId,
            toId: closetNode.id,
            fiberType: projFiber,
            strandCount: 12,
            rating: "plenum",
            connectorType: "lc",
            slackFt: 40,
            waypoints: []
          };
          floor.fiberBackbones.push(newFb);
          fiberFirstClosetId = null;
          selectedFiberBackboneId = newFb.id;
          selectedNodeId = null;
          setCableTool("select");
          recalculateCurrentFloorCables();
          renderCableCanvas();
          renderInspector();
          renderSidebarTabContent();
          saveFacilityState();
          if (typeof commitCablingToBOM === "function") commitCablingToBOM();
          if (typeof renderBOMTable === "function") renderBOMTable();
          if (typeof showToast === "function") {
            showToast(`Linked ${closetNode.name} via ${newFb.fiberType.toUpperCase()} fiber backbone.`);
          }
        }
      }
    }
    return;
  }

  // 2. Add Drop
  if (activeCableTool === "device") {
    const allClosets = getAllClosetsAcrossFacility();
    const newDrop = {
      id: `drop-${Date.now()}`,
      name: `Drop #${floor.nodes.filter(n => n.type === "device").length + 1}`,
      type: "device",
      floorId: floor.id,
      x: pos.x,
      y: pos.y,
      assignedClosetId: allClosets[0] ? allClosets[0].id : null,
      waypoints: []
    };
    floor.nodes.push(newDrop);
    selectedNodeId = newDrop.id;
    setCableTool("select");
    recalculateCurrentFloorCables();
    renderCableCanvas();
    renderInspector();
    renderSidebarTabContent();
    saveFacilityState();
    return;
  }

  // 3. Add Closet
  if (activeCableTool === "mdf") {
    const allClosets = getAllClosetsAcrossFacility();
    const newClosetName = `IDF-${allClosets.length + 1} • Wallbox`;
    FacilityStore.addLocation(newClosetName);

    const newCloset = {
      id: `closet-${Date.now()}`,
      name: newClosetName,
      type: "closet",
      floorId: floor.id,
      x: pos.x,
      y: pos.y
    };
    floor.nodes.push(newCloset);
    selectedNodeId = newCloset.id;
    setCableTool("select");
    recalculateCurrentFloorCables();
    renderCableCanvas();
    renderInspector();
    saveFacilityState();
    return;
  }

  // 4. Click Waypoint Handle
  const wpEl = e.target.closest(".draggable-waypoint-handle");
  if (wpEl) {
    const dropId = wpEl.getAttribute("data-drop-id");
    const wpIdx = parseInt(wpEl.getAttribute("data-waypoint-idx"));
    const drop = floor.nodes.find(n => n.id === dropId);

    if (drop && drop.waypoints && drop.waypoints[wpIdx]) {
      if (e.altKey) {
        drop.waypoints.splice(wpIdx, 1);
        recalculateCurrentFloorCables();
        renderCableCanvas();
        saveFacilityState();
        if (typeof showToast === "function") {
          showToast("Removed bend point.");
        }
        return;
      }
      isDraggingPhysWaypoint = true;
      draggedPhysWaypoint = drop.waypoints[wpIdx];
      physDragOffset.x = pos.x - draggedPhysWaypoint.x;
      physDragOffset.y = pos.y - draggedPhysWaypoint.y;
      e.stopPropagation();
      return;
    }
  }

  // 5. Click Line -> Insert Bend Point
  const lineTarget = e.target.closest(".cable-path-line");
  if (lineTarget) {
    const dropId = lineTarget.getAttribute("data-drop-id");
    const drop = floor.nodes.find(n => n.id === dropId);
    if (drop) {
      if (!drop.waypoints) drop.waypoints = [];
      const newWp = { x: pos.x, y: pos.y };
      drop.waypoints.push(newWp);
      selectedNodeId = drop.id;
      isDraggingPhysWaypoint = true;
      draggedPhysWaypoint = newWp;
      physDragOffset.x = 0;
      physDragOffset.y = 0;
      recalculateCurrentFloorCables();
      renderCableCanvas();
      renderInspector();
      saveFacilityState();
      e.stopPropagation();
      return;
    }
  }

  // Fiber Backbone Delete Button Click (floating pill or on-badge circle X)
  const delBtn = e.target.closest("[data-action='delete-fiber']") || e.target.closest(".fiber-link-delete-btn");
  if (delBtn) {
    const fiberId = delBtn.getAttribute("data-fiber-id") || (delBtn.closest(".fiber-backbone-link") ? delBtn.closest(".fiber-backbone-link").getAttribute("data-fiber-id") : null);
    if (fiberId) {
      e.preventDefault();
      e.stopPropagation();
      deleteFiberBackbone(fiberId, e);
      return;
    }
  }

  // Fiber Backbone Click
  const fiberEl = e.target.closest(".fiber-backbone-link");
  if (fiberEl) {
    const fiberId = fiberEl.getAttribute("data-fiber-id");
    if (fiberId) {
      selectFiberBackbone(fiberId, e);
      return;
    }
  }

  // 6. Click & Drag Node (Drop or Closet)
  const nodeEl = e.target.closest(".draggable-canvas-node");
  if (nodeEl) {
    const nodeId = nodeEl.getAttribute("data-node-id");
    const node = floor.nodes.find(n => n.id === nodeId);
    if (node) {
      selectedNodeId = nodeId;
      selectedFiberBackboneId = null;
      isDraggingPhysNode = true;
      draggedPhysNode = node;
      physDragOffset.x = pos.x - node.x;
      physDragOffset.y = pos.y - node.y;
      renderInspector();
      renderSidebarTabContent();
      renderCableCanvas();
      e.stopPropagation();
      return;
    }
  }

  // Click empty canvas -> deselect node & fiber backbone
  selectedNodeId = null;
  selectedFiberBackboneId = null;
  renderInspector();
  renderSidebarTabContent();
  renderCableCanvas();

  // 7. Pan Viewport (Drag Canvas to Pan - identical to Topology Canvas)
  const viewport = document.getElementById("cableCanvasViewport");
  if (viewport && activeCableTool === "select") {
    isPhysViewportPanning = true;
    physPanStart = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: viewport.scrollLeft,
      scrollTop: viewport.scrollTop
    };
    viewport.style.cursor = "grabbing";
  }
}

let _physRafPending = false;
function requestPhysCanvasRedraw() {
  if (_physRafPending) return;
  _physRafPending = true;
  requestAnimationFrame(() => {
    _physRafPending = false;
    recalculateCurrentFloorCables();
    renderCableCanvas();
  });
}

function handlePhysMouseMove(e) {
  if (!isPhysCanvasVisible()) return;

  if (isPhysViewportPanning) {
    const viewport = document.getElementById("cableCanvasViewport");
    if (viewport) {
      viewport.scrollLeft = physPanStart.scrollLeft - (e.clientX - physPanStart.x);
      viewport.scrollTop = physPanStart.scrollTop - (e.clientY - physPanStart.y);
    }
    return;
  }

  if (!isDraggingPhysWaypoint && !isDraggingPhysNode) return;
  const pos = getCanvasCoordinates(e);

  if (isDraggingPhysWaypoint && draggedPhysWaypoint) {
    draggedPhysWaypoint.x = Math.max(20, pos.x - physDragOffset.x);
    draggedPhysWaypoint.y = Math.max(20, pos.y - physDragOffset.y);
    requestPhysCanvasRedraw();
    return;
  }

  if (isDraggingPhysNode && draggedPhysNode) {
    draggedPhysNode.x = Math.max(30, pos.x - physDragOffset.x);
    draggedPhysNode.y = Math.max(30, pos.y - physDragOffset.y);
    requestPhysCanvasRedraw();
  }
}

function handlePhysMouseUp() {
  if (isPhysViewportPanning) {
    isPhysViewportPanning = false;
    const viewport = document.getElementById("cableCanvasViewport");
    if (viewport) viewport.style.cursor = "default";
  }
  if (isDraggingPhysWaypoint || isDraggingPhysNode) {
    isDraggingPhysWaypoint = false;
    draggedPhysWaypoint = null;
    isDraggingPhysNode = false;
    draggedPhysNode = null;
    recalculateCurrentFloorCables();
    renderCableCanvas();
    saveFacilityState(true);
  }
}

// -----------------------------------------------------------
// Closet / Rack Deletion with Safe Orphan Reassignment
// -----------------------------------------------------------
function deleteClosetWithReassignment(closetId) {
  const allClosets = getAllClosetsAcrossFacility();
  if (allClosets.length <= 1) {
    alert("You must retain at least one telecommunications closet/cabinet.");
    return;
  }

  const closetToDelete = allClosets.find(c => c.id === closetId);
  const remainingCloset = allClosets.find(c => c.id !== closetId);

  if (!confirm(`Delete "${closetToDelete?.name}"? All drops terminating here will be re-routed to "${remainingCloset?.name}".`)) {
    return;
  }

  facilityFloors.forEach(f => {
    f.nodes.filter(n => n.type === "device" && n.assignedClosetId === closetId).forEach(d => {
      d.assignedClosetId = remainingCloset.id;
      d.waypoints = [];
    });
    f.nodes = f.nodes.filter(n => n.id !== closetId);
    if (f.fiberBackbones) {
      f.fiberBackbones = f.fiberBackbones.filter(fb => fb.fromId !== closetId && fb.toId !== closetId);
    }
  });

  if (closetToDelete) {
    FacilityStore.deleteLocation(closetToDelete.name, remainingCloset.name);
  }

  selectedNodeId = null;
  recalculateCurrentFloorCables();
  renderCableCanvas();
  renderInspector();
  renderFloorSelector();
  saveFacilityState();
  if (typeof showToast === "function") {
    showToast(`Deleted closet and re-routed drops to ${remainingCloset.name}`);
  }
}

// -----------------------------------------------------------
// Floor Navigation & Blueprint Upload
// -----------------------------------------------------------
function renderFloorSelector() {
  const sel = document.getElementById("floorSelector");
  if (!sel) return;

  if (facilityFloors.length === 0) {
    sel.innerHTML = '<option value="">(No Floors/Buildings - Click + to Add)</option>';
    return;
  }

  sel.innerHTML = facilityFloors.map(f => {
    const drops = (f.nodes || []).filter(n => n.type === 'device').length;
    const closets = (f.nodes || []).filter(n => n.type === 'closet').length;
    return `<option value="${f.id}" ${f.id === activeFloorId ? 'selected' : ''}>${f.name} (${closets} Racks, ${drops} Drops)</option>`;
  }).join('');
}

function switchActiveFloor(floorId) {
  activeFloorId = floorId;
  selectedNodeId = null;
  selectedFiberBackboneId = null;
  const floor = getActiveFloor();
  if (floor) {
    autoSyncFiberBackbonesFromTopology(floor, false);
  }
  syncFloorControlInputs();
  recalculateCurrentFloorCables();
  renderCableCanvas();
  renderInspector();
  renderSidebarTabContent();
  saveFacilityState();
}

function promptAddNewFloor() {
  const nextNum = facilityFloors.length + 1;
  const name = prompt(`Enter Floor / Building Name:`, `Level ${nextNum}`);
  if (!name || !name.trim()) return;

  const newFloor = {
    id: `floor-${Date.now()}`,
    name: name.trim(),
    levelIndex: nextNum,
    image: null,
    opacity: 0.7,
    scaleFt: 25,
    slackFt: 15,
    slabFt: 14,
    nodes: [],
    fiberBackbones: []
  };

  facilityFloors.push(newFloor);
  activeFloorId = newFloor.id;

  // Also add to FacilityStore so it stays synchronized
  if (typeof FacilityStore !== "undefined" && typeof FacilityStore.addFloor === "function") {
    const existing = FacilityStore.getFloors().find(f => f.name.toLowerCase() === newFloor.name.toLowerCase());
    if (!existing) {
      FacilityStore.addFloor(newFloor.name, nextNum, {
        scaleFt: newFloor.scaleFt,
        slackFt: newFloor.slackFt,
        slabFt: newFloor.slabFt
      });
    }
  }

  renderFloorSelector();
  switchActiveFloor(newFloor.id);
  if (typeof showToast === "function") {
    showToast(`Created ${newFloor.name}`);
  }
}

function promptRenameActiveFloor() {
  const floor = getActiveFloor();
  if (!floor) {
    if (typeof showToast === "function") showToast("No floor/building level available to rename.");
    return;
  }
  const newName = prompt("Rename Floor/Building:", floor.name);
  if (!newName || !newName.trim() || newName.trim() === floor.name) return;
  const cleanName = newName.trim();
  
  if (facilityFloors.some(f => f.id !== floor.id && f.name.toLowerCase() === cleanName.toLowerCase())) {
    if (typeof showToast === "function") showToast(`A floor/building named "${cleanName}" already exists.`);
    return;
  }
  const oldName = floor.name;
  floor.name = cleanName;

  // Also sync with FacilityStore
  if (typeof FacilityStore !== "undefined" && typeof FacilityStore.updateFloor === "function") {
    const sf = FacilityStore.getFloors().find(f => f.id === floor.id || f.name.toLowerCase() === oldName.toLowerCase());
    if (sf) {
      FacilityStore.updateFloor(sf.id, { name: cleanName });
    }
  }

  renderFloorSelector();
  renderCableCanvas();
  saveFacilityState();
  if (typeof showToast === "function") showToast(`Renamed floor/building to "${cleanName}"`);
}

function promptDeleteActiveFloor() {
  const floor = getActiveFloor();
  if (!floor) {
    if (typeof showToast === "function") showToast("No floor/building level available to delete.");
    return;
  }
  if (!confirm(`Delete floor/building "${floor.name}" and all associated cable runs/nodes?`)) {
    return;
  }
  const deletedFloorId = floor.id;
  const deletedFloorName = floor.name;

  facilityFloors = facilityFloors.filter(f => f.id !== deletedFloorId);
  activeFloorId = facilityFloors.length > 0 ? facilityFloors[0].id : null;
  selectedNodeId = null;

  // Also sync to FacilityStore
  if (typeof FacilityStore !== "undefined" && typeof FacilityStore.deleteFloor === "function") {
    const sf = FacilityStore.getFloors().find(f => f.id === deletedFloorId || f.name.toLowerCase() === deletedFloorName.toLowerCase());
    if (sf) {
      FacilityStore.deleteFloor(sf.id);
    }
  }

  renderFloorSelector();
  syncFloorControlInputs();
  recalculateCurrentFloorCables();
  renderCableCanvas();
  renderInspector();
  renderSidebarTabContent();
  saveFacilityState();
  if (typeof showToast === "function") showToast(`Deleted floor/building "${deletedFloorName}"`);
}

function syncFloorControlInputs() {
  const floor = getActiveFloor();
  const scaleInput = document.getElementById("cableScaleFt");
  const slackInput = document.getElementById("cableSlackFt");
  const slabInput = document.getElementById("cableSlabFt");
  const cableSelect = document.getElementById("cableTypeSelector");

  if (!floor) {
    if (scaleInput) scaleInput.value = 25;
    if (slackInput) slackInput.value = 15;
    if (slabInput) slabInput.value = 14;
    return;
  }

  if (scaleInput) scaleInput.value = floor.scaleFt || 25;
  if (slackInput) slackInput.value = floor.slackFt || 15;
  if (slabInput) slabInput.value = floor.slabFt || 14;
  if (cableSelect) cableSelect.value = activeCableSku;
}

async function handleUniversalPlanUpload(event) {
  const file = event.target?.files?.[0];
  if (!file) return;

  const floor = getActiveFloor();
  if (!floor) {
    if (typeof showToast === "function") showToast("Please add a floor/building first.", "warning");
    return;
  }

  if (file.type === "application/pdf") {
    const spinner = document.getElementById("pdfRenderSpinner");
    if (spinner) spinner.classList.remove("hidden");

    try {
      if (typeof pdfjsLib === "undefined") throw new Error("PDF.js library is not loaded.");
      const fileData = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: fileData }).promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 2.0 });

      const offCanvas = document.createElement("canvas");
      const ctx = offCanvas.getContext("2d");
      offCanvas.width = viewport.width;
      offCanvas.height = viewport.height;

      await page.render({ canvasContext: ctx, viewport: viewport }).promise;

      floor.image = offCanvas.toDataURL("image/png");
      if (spinner) spinner.classList.add("hidden");

      renderCableCanvas();
      saveFacilityState();
      if (typeof showToast === "function") {
        showToast(`Rendered PDF blueprint to ${floor.name}`);
      }
    } catch (err) {
      if (spinner) spinner.classList.add("hidden");
      alert("Could not render PDF blueprint. Ensure file is a valid document.");
    }
  } else {
    const reader = new FileReader();
    reader.onload = (e) => {
      floor.image = e.target.result;
      renderCableCanvas();
      saveFacilityState();
      if (typeof showToast === "function") {
        showToast(`Uploaded blueprint to ${floor.name}`);
      }
    };
    reader.readAsDataURL(file);
  }
}

// -----------------------------------------------------------
// Tools, Zoom, & Bends
// -----------------------------------------------------------
function setCableTool(tool) {
  activeCableTool = tool;
  fiberFirstClosetId = null;

  const tools = ["select", "device", "mdf", "fiber"];
  tools.forEach(t => {
    const btn = document.getElementById(`tool-${t}`);
    if (!btn) return;
    if (t === tool) {
      btn.className = "px-2.5 py-1 rounded-lg bg-brand-600 text-white font-medium flex items-center gap-1 shadow";
    } else {
      btn.className = "px-2.5 py-1 rounded-lg text-slate-300 hover:text-white flex items-center gap-1";
    }
  });

  const svg = document.getElementById("cableSvgCanvas");
  if (svg) {
    if (tool === "select") svg.style.cursor = "default";
    else if (tool === "fiber") svg.style.cursor = "cell";
    else svg.style.cursor = "crosshair";
  }

  if (tool === "fiber" && typeof showToast === "function") {
    showToast("Fiber Mode: Click closet A, then closet B to link backbone trunk.");
  }
}

function updateSelectedCableSpec(sku) {
  activeCableSku = sku;
  const label = document.getElementById("activeCableLabel");
  if (label && typeof CABLING_CATALOG !== "undefined") {
    const item = CABLING_CATALOG.bulkCable?.find(c => c.sku === sku);
    if (item) label.innerText = `${item.standard} ${item.jacketType || item.rating}`;
  }
  recalculateCurrentFloorCables();
  saveFacilityState();
  if (typeof showToast === "function") {
    showToast(`Cable Spec updated to ${sku}`);
  }
}

function toggleOrthogonalMode() {
  useOrthogonalRouting = !useOrthogonalRouting;
  const btn = document.getElementById("btnOrthogonalToggle");
  const label = document.getElementById("orthoLabel");

  if (useOrthogonalRouting) {
    btn.className = "px-2.5 py-1.5 rounded-xl border border-indigo-500 bg-indigo-600 text-white text-xs font-semibold flex items-center gap-1.5 shadow";
    if (label) label.innerText = "90° Bends: ON";
  } else {
    btn.className = "px-2.5 py-1.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5";
    if (label) label.innerText = "90° Bends: OFF";
  }

  recalculateCurrentFloorCables();
  renderCableCanvas();
}

function adjustCanvasZoom(delta) {
  currentCanvasZoom = Math.max(0.4, Math.min(2.5, currentCanvasZoom + delta));
  applyCanvasZoom();
}

function resetCanvasZoom() {
  currentCanvasZoom = 1.0;
  applyCanvasZoom();
}

function applyCanvasZoom() {
  const svg = document.getElementById("cableSvgCanvas");
  const label = document.getElementById("canvasZoomLabel");
  if (svg) {
    svg.style.transform = `scale(${currentCanvasZoom})`;
    svg.style.transformOrigin = "0 0";
  }
  if (label) {
    label.innerText = `${Math.round(currentCanvasZoom * 100)}%`;
  }
}

function toggleModalFullscreen() {
  const card = document.getElementById("cableModalCard");
  const icon = document.getElementById("iconFullscreen");
  isModalFullscreen = !isModalFullscreen;

  if (isModalFullscreen) {
    card.classList.replace("max-w-7xl", "max-w-full");
    card.classList.replace("h-[95vh]", "h-screen");
    card.classList.replace("rounded-2xl", "rounded-none");
    if (icon) icon.setAttribute("data-lucide", "minimize-2");
  } else {
    card.classList.replace("max-w-full", "max-w-7xl");
    card.classList.replace("h-screen", "h-[95vh]");
    card.classList.replace("rounded-none", "rounded-2xl");
    if (icon) icon.setAttribute("data-lucide", "maximize-2");
  }
  if (window.lucide) lucide.createIcons();
}

// -----------------------------------------------------------
// Telemetry & Calculations
// -----------------------------------------------------------
function syncBOMClosetsToFloors() {
  if (typeof FacilityStore === "undefined") return;

  // 1. Synchronize facilityFloors with FacilityStore floors
  const storeFloors = FacilityStore.getFloors();
  if (Array.isArray(storeFloors) && storeFloors.length > 0) {
    // If we have legacy floor-1, migrate it to floor-main
    const legacyFloor1 = facilityFloors.find(f => f.id === "floor-1");
    const hasMainInStore = storeFloors.some(sf => sf.id === "floor-main");
    if (legacyFloor1 && hasMainInStore) {
      legacyFloor1.id = "floor-main";
      legacyFloor1.name = "Main Floor";
      legacyFloor1.nodes.forEach(n => { n.floorId = "floor-main"; });
      if (activeFloorId === "floor-1") activeFloorId = "floor-main";
    }

    // Ensure all store floors exist in facilityFloors
    storeFloors.forEach(sf => {
      let existingFloor = facilityFloors.find(f => f.id === sf.id);
      if (!existingFloor) {
        existingFloor = {
          id: sf.id,
          name: sf.name,
          levelIndex: typeof sf.levelIndex === "number" ? sf.levelIndex : (sf.id === "floor-exterior" ? 0 : 1),
          image: null,
          opacity: 0.7,
          scaleFt: sf.id === "floor-exterior" ? 50 : 25,
          slackFt: 15,
          slabFt: sf.ceilingHeightFt || 14,
          nodes: [],
          fiberBackbones: []
        };
        facilityFloors.push(existingFloor);
      } else {
        existingFloor.name = sf.name;
        if (typeof sf.levelIndex === "number") existingFloor.levelIndex = sf.levelIndex;
      }
    });

    // Remove any floors that no longer exist in FacilityStore
    const validFloorIds = new Set(storeFloors.map(sf => sf.id));
    const fallbackFloor = facilityFloors.find(f => validFloorIds.has(f.id)) || facilityFloors[0];

    facilityFloors = facilityFloors.filter(f => {
      if (!validFloorIds.has(f.id)) {
        if (f.nodes && f.nodes.length > 0 && fallbackFloor) {
          f.nodes.forEach(n => {
            n.floorId = fallbackFloor.id;
            fallbackFloor.nodes.push(n);
          });
        }
        return false;
      }
      return true;
    });

    if (!facilityFloors.some(f => f.id === activeFloorId)) {
      activeFloorId = facilityFloors[0] ? facilityFloors[0].id : "floor-main";
    }
  }

  // 2. Synchronize active physical host enclosures with accurate floors (excluding pure field hardware spaces)
  const activeLocations = FacilityStore.getLocations(false).filter(loc => 
    loc.hostType !== "field" && !loc.isSpace && !(loc.name && loc.name.endsWith(" • Field"))
  );
  const validLocMap = new Map();
  activeLocations.forEach(loc => validLocMap.set(loc.name, loc));

  // A. Purge stale closet nodes across all floors and remove any field nodes
  const allCurrentClosets = getAllClosetsAcrossFacility();
  const validRemainingCloset = allCurrentClosets.find(c => validLocMap.has(c.name));

  facilityFloors.forEach(fl => {
    fl.nodes = fl.nodes.filter(n => {
      if (n.type === "closet") {
        const isFieldNode = n.hostType === "field" || (n.name && n.name.endsWith(" • Field"));
        if (isFieldNode || !validLocMap.has(n.name)) {
          // Re-route devices on this closet to a valid remaining closet
          if (validRemainingCloset && validRemainingCloset.id !== n.id) {
            fl.nodes.filter(d => d.type === "device" && d.assignedClosetId === n.id).forEach(d => {
              d.assignedClosetId = validRemainingCloset.id;
            });
          }
          return false;
        }
      }
      return true;
    });
  });

  // B. Ensure each active location exists on its correct floor
  activeLocations.forEach((loc, idx) => {
    // Determine accurate target floor
    let targetFloor = null;
    if (loc.floorId) {
      targetFloor = facilityFloors.find(f => f.id === loc.floorId);
    }
    if (!targetFloor && loc.spaceId) {
      const spaceObj = FacilityStore.getSpaces().find(s => s.id === loc.spaceId);
      if (spaceObj && spaceObj.floorId) {
        targetFloor = facilityFloors.find(f => f.id === spaceObj.floorId);
      }
    }
    if (!targetFloor) {
      if (loc.name.toLowerCase().includes("exterior") || loc.name.toLowerCase().includes("pole")) {
        targetFloor = facilityFloors.find(f => f.id === "floor-exterior");
      }
    }
    if (!targetFloor) {
      targetFloor = facilityFloors[0];
    }
    if (!targetFloor) return;

    // Check if closet node already exists anywhere
    let existingNode = null;
    let currentFloor = null;
    for (const fl of facilityFloors) {
      const found = fl.nodes.find(n => n.type === "closet" && n.name === loc.name);
      if (found) {
        existingNode = found;
        currentFloor = fl;
        break;
      }
    }

    if (existingNode) {
      existingNode.hostType = loc.hostType || "equipment_rack";
      // If node is on the wrong floor, move it to the accurate floor
      if (currentFloor.id !== targetFloor.id) {
        currentFloor.nodes = currentFloor.nodes.filter(n => n.id !== existingNode.id);
        existingNode.floorId = targetFloor.id;
        targetFloor.nodes.push(existingNode);
      }
    } else {
      // Create new closet node accurately on targetFloor
      const closetsOnTarget = targetFloor.nodes.filter(n => n.type === "closet");
      const col = closetsOnTarget.length % 3;
      const row = Math.floor(closetsOnTarget.length / 3);
      const x = 200 + (col * 280);
      const y = 180 + (row * 180);

      targetFloor.nodes.push({
        id: `closet-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        name: loc.name,
        type: "closet",
        hostType: loc.hostType || "equipment_rack",
        floorId: targetFloor.id,
        x,
        y
      });
    }
  });

  // C. Synchronize placed equipment drops with Project BOM
  syncBOMDevicesToFloors();
}

/**
 * Synchronizes placed physical equipment drops with the Project BOM.
 * Drops whose BOM equipment was deleted or cleared are automatically purged from all floors.
 */
function syncBOMDevicesToFloors() {
  if (typeof facilityFloors === "undefined" || !Array.isArray(facilityFloors)) return;
  if (typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) return;

  const validInstanceIds = new Set(projectBOM.filter(i => !i.parentInstanceId).map(i => i.instanceId));
  let didRemove = false;

  facilityFloors.forEach(fl => {
    if (!fl.nodes) fl.nodes = [];
    const before = fl.nodes.length;
    fl.nodes = fl.nodes.filter(n => {
      if (n.type === "device") {
        // If BOM was cleared (empty), remove all placed BOM drops
        if (validInstanceIds.size === 0) {
          return false;
        }
        // If drop is linked to a BOM instance, keep only if instance still exists in projectBOM
        const instId = n.instanceId || (n.id && n.id.startsWith("dev-") ? n.id.replace("dev-", "") : null);
        if (instId) {
          if (!validInstanceIds.has(instId)) return false;
          // Synchronize name and deviceNumber with current BOM item!
          const item = projectBOM.find(i => i.instanceId === instId);
          if (item) {
            n.name = item.friendlyName || item.model;
            n.deviceNumber = item.deviceNumber;

            // Synchronize BOM location with terminating closet if item was unassigned or in virtual field
            if (n.assignedClosetId) {
              const allClosets = getAllClosetsAcrossFacility();
              const closet = allClosets.find(c => c.id === n.assignedClosetId);
              if (closet) {
                const cur = (item.closetName || "").toLowerCase().trim();
                if (!item.closetName || cur === "unassigned" || cur === "field" || cur.endsWith("• field") || cur.endsWith("-field")) {
                  item.closetName = closet.name;
                  item.rackId = closet.name;
                }
              }
            }
          }
          return true;
        }
      }
      return true;
    });
    if (fl.nodes.length !== before) didRemove = true;
  });

  if (didRemove) {
    if (typeof selectedNodeId !== "undefined" && selectedNodeId) {
      const floor = getActiveFloor();
      if (floor && Array.isArray(floor.nodes) && !floor.nodes.some(n => n.id === selectedNodeId)) {
        selectedNodeId = null;
      }
    }
    recalculateCurrentFloorCables();
    if (typeof isPhysCanvasVisible === "function" && isPhysCanvasVisible()) {
      renderCableCanvas();
      renderInspector();
      renderSidebarTabContent();
    }
    saveFacilityState(true);
  }
}

/**
 * Clears all placed equipment drops across all floors when BOM is cleared.
 */
function clearPhysicalLayoutDrops() {
  if (typeof facilityFloors === "undefined" || !Array.isArray(facilityFloors)) return;
  facilityFloors.forEach(fl => {
    if (!fl.nodes) fl.nodes = [];
    fl.nodes = fl.nodes.filter(n => n.type !== "device");
  });
  selectedNodeId = null;
  recalculateCurrentFloorCables();
  if (typeof isPhysCanvasVisible === "function" && isPhysCanvasVisible()) {
    renderCableCanvas();
    renderInspector();
    renderSidebarTabContent();
  }
  saveFacilityState(true);
}

/**
 * Removes a specific placed equipment drop when its item is deleted from BOM.
 */
function removePhysicalLayoutDropByInstanceId(instanceId) {
  if (!instanceId || typeof facilityFloors === "undefined" || !Array.isArray(facilityFloors)) return;
  let didRemove = false;
  facilityFloors.forEach(fl => {
    if (!fl.nodes) fl.nodes = [];
    const before = fl.nodes.length;
    fl.nodes = fl.nodes.filter(n => {
      if (n.type === "device") {
        if (n.instanceId === instanceId) return false;
        if (n.id === `dev-${instanceId}` || n.id === instanceId) return false;
      }
      return true;
    });
    if (fl.nodes.length !== before) didRemove = true;
  });

  if (didRemove) {
    if (selectedNodeId && (selectedNodeId === `dev-${instanceId}` || selectedNodeId === instanceId)) {
      selectedNodeId = null;
    }
    recalculateCurrentFloorCables();
    if (typeof isPhysCanvasVisible === "function" && isPhysCanvasVisible()) {
      renderCableCanvas();
      renderInspector();
      renderSidebarTabContent();
    }
    saveFacilityState(true);
  }
}

function getAllClosetsAcrossFacility() {
  const closets = [];
  facilityFloors.forEach(f => {
    (f.nodes || []).filter(n => n.type === "closet" && n.hostType !== "field" && !(n.name && n.name.endsWith(" • Field"))).forEach(c => {
      closets.push({ ...c, floorName: f.name, floorLevel: f.levelIndex || 1 });
    });
  });
  return closets;
}

function recalculateCurrentFloorCables() {
  const floor = getActiveFloor();
  const scaleInput = document.getElementById("cableScaleFt");
  const slackInput = document.getElementById("cableSlackFt");
  const slabInput = document.getElementById("cableSlabFt");

  if (floor) {
    if (scaleInput) floor.scaleFt = parseFloat(scaleInput.value) || 25;
    if (slackInput) floor.slackFt = parseFloat(slackInput.value) || 15;
    if (slabInput) floor.slabFt = parseFloat(slabInput.value) || 14;
  }

  const allClosets = getAllClosetsAcrossFacility();

  let globalFootage = 0;
  let globalDropsCount = 0;

  facilityFloors.forEach(fl => {
    const fPxToFt = (fl.scaleFt || 25) / 100;
    const fSlack = fl.slackFt || 15;
    const fSlab = fl.slabFt || 14;

    fl.nodes.filter(n => n.type === "device").forEach(dev => {
      globalDropsCount++;

      let closet = allClosets.find(c => c.id === dev.assignedClosetId);
      if (!closet && allClosets.length > 0) {
        closet = allClosets[0];
        dev.assignedClosetId = closet.id;
      }

      if (closet) {
        let horizontalPixelDist = 0;
        const pts = [{ x: closet.x, y: closet.y }];

        if (dev.waypoints && dev.waypoints.length > 0) {
          dev.waypoints.forEach(wp => pts.push(wp));
        } else if (useOrthogonalRouting) {
          pts.push({ x: dev.x, y: closet.y });
        }
        pts.push({ x: dev.x, y: dev.y });

        for (let i = 0; i < pts.length - 1; i++) {
          horizontalPixelDist += Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
        }

        const horizontalFt = Math.round(horizontalPixelDist * fPxToFt);
        const floorsTraversed = Math.abs((fl.levelIndex || 1) - (closet.floorLevel || 1));
        const interFloorRiserFt = floorsTraversed * fSlab;

        const totalRunFt = horizontalFt + fSlack + interFloorRiserFt;
        const totalRunMeters = Math.round(totalRunFt * 0.3048);

        dev.calculatedRun = {
          totalFt: totalRunFt,
          totalMeters: totalRunMeters,
          horizontalFt,
          slackFt: fSlack,
          riserFt: interFloorRiserFt,
          closetName: closet.name,
          closetFloorName: closet.floorName,
          isExceeded: totalRunMeters > 90,
          points: pts
        };

        globalFootage += totalRunFt;
      }
    });

    (fl.fiberBackbones || []).forEach(fb => {
      const c1 = fl.nodes.find(n => n.id === fb.fromId);
      const c2 = fl.nodes.find(n => n.id === fb.toId);
      if (c1 && c2) {
        fb.fromClosetName = c1.name;
        fb.toClosetName = c2.name;
        const pxDist = Math.hypot(c2.x - c1.x, c2.y - c1.y);
        const slack = (typeof fb.slackFt === "number") ? fb.slackFt : (fSlack * 2);
        fb.measuredFt = Math.round(pxDist * fPxToFt);
        fb.totalFt = fb.measuredFt + slack;
      }
    });
  });

  const spoolBoxes = Math.ceil(globalFootage / 1000);
  const footageEl = document.getElementById("cableTotalFootage");
  const spoolEl = document.getElementById("cableSpoolCount");
  const countActiveEl = document.getElementById("countActiveDrops");
  const totalDropsEl = document.getElementById("cableTotalDrops");
  const patchPanelsEl = document.getElementById("cablePatchPanels");

  if (footageEl) footageEl.innerText = `${globalFootage.toLocaleString()} ft`;
  if (spoolEl) spoolEl.innerText = `${spoolBoxes} Box${spoolBoxes === 1 ? '' : 'es'}`;
  if (countActiveEl) countActiveEl.innerText = floor.nodes.filter(n => n.type === 'device').length;
  if (totalDropsEl) totalDropsEl.innerText = `${globalDropsCount} Drop${globalDropsCount === 1 ? '' : 's'}`;
  if (patchPanelsEl) {
    const panelsNeeded = Math.ceil(globalDropsCount / 24);
    patchPanelsEl.innerText = `${panelsNeeded} Panel${panelsNeeded === 1 ? '' : 's'} (${panelsNeeded * 24}P)`;
  }

  renderSidebarTabContent();
}

// -----------------------------------------------------------
// Sidebar Tabs & Unplaced Devices Tray
// -----------------------------------------------------------
function switchSidebarTab(tab) {
  activeSidebarTab = tab;
  const btnRuns = document.getElementById("tab-btn-runs");
  const btnUnplaced = document.getElementById("tab-btn-unplaced");

  if (tab === "runs") {
    btnRuns.className = "flex-1 py-1.5 text-center font-bold text-white border-b-2 border-brand-500";
    btnUnplaced.className = "flex-1 py-1.5 text-center font-bold text-slate-400 hover:text-white border-b-2 border-transparent";
  } else {
    btnUnplaced.className = "flex-1 py-1.5 text-center font-bold text-white border-b-2 border-brand-500";
    btnRuns.className = "flex-1 py-1.5 text-center font-bold text-slate-400 hover:text-white border-b-2 border-transparent";
  }
  renderSidebarTabContent();
}

// -----------------------------------------------------------
// Field Device Classifier for Physical Floor Drops
// -----------------------------------------------------------
function isFieldDeviceForPhysicalLayout(item) {
  if (!item || item.parentInstanceId) return false;

  // Structured Cabling spools, licenses, accessories, optics do not get placed as camera/door drops
  if (item.role === "Structured Cabling" || item.role === "Optics & DAC") return false;
  if (item.role === "Mgmt License" || item.role === "Security License" || item.role === "Feature License") return false;
  if (item.role === "Accessory") return false;

  // Infrastructure that lives inside racks / enclosures
  const infraRoles = [
    "Access", "Core", "Core & Agg", "Aggregation", "Gateways & WAN", "Security WAN",
    "Server", "VMS Server", "Compute & Storage", "Storage Drives & SAN",
    "Rack UPS Power", "UPS", "PDU", "19\" Equipment Racks", "Enclosure", "Patch Panel"
  ];
  if (infraRoles.includes(item.role)) return false;

  const cat = (item.category || "").toLowerCase();
  const role = (item.role || "").toLowerCase();

  if (cat.includes("switch") || cat.includes("server") || cat.includes("storage") || 
      cat.includes("ups") || cat.includes("pdu") || cat.includes("rack") || 
      cat.includes("enclosure") || cat.includes("cabinet")) {
    return false;
  }
  if (role.includes("switch") || role.includes("server") || role.includes("storage") || 
      role.includes("ups") || role.includes("pdu") || role.includes("gateway")) {
    return false;
  }

  // Edge / Field devices that get placed on physical blueprints
  const isEdge = role.includes("camera") || role.includes("access") || role.includes("door") || 
                 role.includes("wireless") || role.includes("radio") || role.includes("intercom") ||
                 role.includes("sensor") || role.includes("drop") ||
                 cat.includes("camera") || cat.includes("access") || cat.includes("wireless") ||
                 cat.includes("door") || cat.includes("sensor") || cat.includes("intercom") ||
                 cat.includes("ptp") || cat.includes("endpoint");

  return isEdge || item.isFieldDevice === true;
}

function renderSidebarTabContent() {
  const container = document.getElementById("sidebarTabContent");
  if (!container) return;

  const floor = getActiveFloor();
  if (!floor) {
    container.innerHTML = `
      <div class="py-12 px-4 text-center text-slate-500 text-xs">
        <i data-lucide="layers" class="w-8 h-8 mx-auto mb-2 text-slate-600 opacity-50"></i>
        <p class="font-medium text-slate-400">No Floor/Building Active</p>
        <p class="mt-1 text-[11px] text-slate-500">Create or select a floor/building to view runs, paths, and closets.</p>
        <button onclick="promptAddNewFloor()" class="mt-3 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-medium text-[11px] inline-flex items-center gap-1.5 transition-colors cursor-pointer">
          <i data-lucide="plus" class="w-3.5 h-3.5"></i> Add First Floor/Building
        </button>
      </div>`;
    if (window.lucide) lucide.createIcons();
    return;
  }

  if (activeSidebarTab === "runs") {
    const allDrops = floor.nodes.filter(n => n.type === "device");
    const drops = allDrops.filter(dev => {
      const bomItem = (typeof projectBOM !== "undefined" && dev.instanceId) ? projectBOM.find(i => i.instanceId === dev.instanceId) : null;
      const layerType = getDeviceLayerType(bomItem || dev);
      return physicalLayerFilters[layerType] !== false;
    });

    const countDropsEl = document.getElementById("countActiveDrops");
    if (countDropsEl) {
      countDropsEl.innerText = drops.length === allDrops.length ? drops.length : `${drops.length}/${allDrops.length}`;
    }

    const fiberLinks = floor.fiberBackbones || [];
    let fiberSectionHtml = "";
    if (fiberLinks.length > 0) {
      fiberSectionHtml = `
        <div class="mb-3 space-y-1.5">
          <div class="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 px-0.5">
            <span>Inter-Closet Fiber Links (${fiberLinks.length})</span>
            <span class="text-cyan-400 font-mono text-[9px]">Optical Trunks</span>
          </div>
          <div class="space-y-1.5">
            ${fiberLinks.map(fb => {
              const c1 = floor.nodes.find(n => n.id === fb.fromId);
              const c2 = floor.nodes.find(n => n.id === fb.toId);
              const fromName = c1 ? c1.name : (fb.fromClosetName || "MDF");
              const toName = c2 ? c2.name : (fb.toClosetName || "IDF");
              const isSMF = (fb.fiberType === "smf");
              const isSel = (fb.id === selectedFiberBackboneId);
              return `
                <div onclick="selectFiberBackbone('${fb.id}')" class="bg-slate-950 p-2.5 rounded-xl border ${isSel ? (isSMF ? 'border-amber-500 bg-amber-500/10' : 'border-cyan-500 bg-cyan-500/10') : 'border-slate-800'} text-xs space-y-1 cursor-pointer hover:border-slate-700 transition-all">
                  <div class="flex items-center justify-between">
                    <span class="font-bold text-white flex items-center gap-1.5 truncate">
                      <span class="px-1.5 py-0.5 rounded text-[9px] font-bold ${isSMF ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'}">${isSMF ? 'OS2 SMF' : 'OM4 MMF'}</span>
                      <span class="truncate">${escapeHTML(fromName)} &harr; ${escapeHTML(toName)}</span>
                    </span>
                    <div class="flex items-center gap-2 shrink-0">
                      <span class="font-mono font-bold ${isSMF ? 'text-amber-300' : 'text-cyan-300'}">${fb.totalFt || 100} ft</span>
                      <button type="button" onclick="deleteFiberBackbone('${fb.id}', event)" title="Delete Fiber Backbone" class="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-950/60 border border-transparent hover:border-rose-800/60 transition-colors cursor-pointer">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                      </button>
                    </div>
                  </div>
                  <div class="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>${fb.strandCount || 12}-Strand &bull; ${(fb.rating || 'plenum').toUpperCase()}</span>
                    <span>${(fb.connectorType || 'lc').toUpperCase()} Duplex</span>
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        </div>
      `;
    }

    if (drops.length === 0 && fiberLinks.length === 0) {
      container.innerHTML = `<div class="py-12 text-center text-slate-500 text-xs"><p>${allDrops.length === 0 ? 'No drops or fiber links on this level.' : 'No drops match the active layer filters.'}</p></div>`;
      return;
    }

    const dropsHtml = (drops.length === 0) ? '' : `
      <div class="space-y-1.5">
        ${fiberLinks.length > 0 ? `
          <div class="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 px-0.5 pt-1">
            <span>Horizontal Station Drops (${drops.length})</span>
            <span class="text-amber-400 font-mono text-[9px]">Copper</span>
          </div>
        ` : ''}
        ${drops.map(dev => {
          const run = dev.calculatedRun || { totalFt: 0, closetName: 'Unassigned', isExceeded: false };
          return `
            <div onclick="selectNode('${dev.id}')" class="bg-slate-950 p-2.5 rounded-xl border ${dev.id === selectedNodeId ? 'border-brand-500 bg-brand-500/10' : run.isExceeded ? 'border-rose-500/60 bg-rose-950/20' : 'border-slate-800'} text-xs space-y-1 cursor-pointer hover:border-slate-700 transition-all">
              <div class="flex items-center justify-between">
                <span class="font-bold text-white flex items-center gap-1.5 truncate">
                  ${(() => {
                    const bomItem = (typeof projectBOM !== "undefined" && dev.instanceId) ? projectBOM.find(i => i.instanceId === dev.instanceId) : null;
                    const devNum = (bomItem && bomItem.deviceNumber) ? `<span class="px-1 py-0.2 rounded bg-brand-900/60 border border-brand-500/40 text-[8.5px] font-mono font-bold text-brand-300">${escapeHTML(bomItem.deviceNumber)}</span>` : '';
                    return `${devNum}<span>${escapeHTML(dev.name)}</span>`;
                  })()}
                </span>
                <span class="font-mono font-bold shrink-0 ${run.isExceeded ? 'text-rose-400' : 'text-amber-300'}">
                  ${run.totalFt} ft (${run.totalMeters}m)
                </span>
              </div>
              <div class="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>To: ${run.closetName}</span>
                <span>${(dev.waypoints || []).length} Bends</span>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `;

    container.innerHTML = fiberSectionHtml + dropsHtml;
  } else {
    // Unplaced devices: edge/field hardware in quote not currently placed on canvas
    // Devices in racks/enclosures (switches, servers, storage, UPS, PDU) already live inside their enclosures
    const placedInstanceIds = new Set();
    facilityFloors.forEach(fl => {
      (fl.nodes || []).forEach(n => {
        if (n.instanceId) placedInstanceIds.add(n.instanceId);
        if (n.id && n.id.startsWith("dev-")) placedInstanceIds.add(n.id.replace("dev-", ""));
        if (n.id) placedInstanceIds.add(n.id);
      });
    });

    const unplacedBOM = (typeof projectBOM !== "undefined" ? projectBOM : []).filter(item => {
      if (!isFieldDeviceForPhysicalLayout(item)) return false;
      const isPlaced = placedInstanceIds.has(item.instanceId);
      if (isPlaced) return false;
      const layerType = getDeviceLayerType(item);
      return physicalLayerFilters[layerType] !== false;
    });

    const countUnplacedEl = document.getElementById("countUnplacedDevices");
    if (countUnplacedEl) countUnplacedEl.innerText = unplacedBOM.length;

    if (unplacedBOM.length === 0) {
      container.innerHTML = `<div class="py-8 text-center text-slate-500 text-xs"><p>No unplaced field hardware matching active filters.</p></div>`;
      return;
    }

    const unplacedThisLocation = getUnplacedDevicesForFloor(floor);
    const countThisLocation = unplacedThisLocation.length;

    container.innerHTML = `
      <div class="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 shrink-0">
        <div>
          <span class="text-[11px] font-bold text-slate-300">Level: ${escapeHTML(floor.name)}</span>
          <span class="text-[10px] text-slate-500 block">${countThisLocation} for this location (${unplacedBOM.length} total)</span>
        </div>
        ${countThisLocation > 0 ? `
          <button onclick="placeAllUnplacedOnActiveFloor()" class="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[10px] font-bold shadow flex items-center gap-1 transition-colors cursor-pointer" title="Place all ${countThisLocation} unplaced devices for this location">
            <i data-lucide="layout-grid" class="w-3 h-3"></i> Place All (${countThisLocation})
          </button>
        ` : ''}
      </div>
    ` + unplacedBOM.map(item => {
      const rawLoc = item.closetName || item.rackId;
      const isUnassigned = FacilityStore.normalize(rawLoc) === FacilityStore.UNASSIGNED;
      const mount = (item.mountMethod || "wall").toUpperCase();

      return `
        <div class="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs space-y-1 hover:border-slate-700 transition-colors">
          <div class="min-w-0 pr-2">
            <div class="flex items-center gap-1.5 flex-wrap">
              ${item.deviceNumber ? `<span class="px-1.5 py-0.2 rounded bg-brand-900/60 border border-brand-500/40 text-[9px] font-mono font-bold text-brand-300">${escapeHTML(item.deviceNumber)}</span>` : ''}
              <span class="font-bold text-white truncate max-w-[160px]" title="${escapeHTML(item.friendlyName || item.model)}">${escapeHTML(item.friendlyName || item.model)}</span>
              <button type="button" onclick="event.stopPropagation(); promptEditDeviceFriendlyName('${item.instanceId}')" class="text-slate-400 hover:text-white p-0.5 rounded hover:bg-slate-800 transition-colors" title="Edit Friendly Name">
                <i data-lucide="pencil" class="w-2.5 h-2.5"></i>
              </button>
            </div>
            ${item.friendlyName && item.friendlyName !== item.model ? `<span class="text-[10px] text-slate-300 font-medium block truncate max-w-[160px]">${escapeHTML(item.model)}</span>` : ''}
            <div class="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span class="text-[9px] font-mono px-1 py-0.2 rounded font-bold ${isUnassigned ? 'bg-amber-950/80 border border-amber-800/80 text-amber-300' : 'bg-indigo-950/80 border border-indigo-800/80 text-indigo-300'}">
                ${isUnassigned ? 'Unassigned' : escapeHTML(item.closetName)}
              </span>
              <span class="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-900 border border-slate-800 text-slate-300">
                ${mount}
              </span>
              <span class="text-[10px] text-slate-400 font-mono">${escapeHTML(item.role || 'Hardware')} &bull; ${item.consumedPoEWatts || item.baseWatts || 0}W</span>
            </div>
          </div>
          <button onclick="placeBomItemOnFloor('${item.instanceId}')" class="px-2.5 py-1 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-[10px] font-bold shadow shrink-0 flex items-center gap-1 transition-colors cursor-pointer">
            <i data-lucide="plus" class="w-3 h-3"></i> Place
          </button>
        </div>
      `;
    }).join("");
  }

  if (window.lucide) lucide.createIcons();
}

function findNextAvailableGridSpot(floor, startIndex = 0) {
  const cols = 12;
  const startX = 350;
  const startY = 420;
  const stepX = 180;
  const stepY = 140;

  let index = startIndex;
  while (index < 600) {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = startX + (col * stepX);
    const y = startY + (row * stepY);

    const collides = (floor.nodes || []).some(n => {
      const dx = n.x - x;
      const dy = n.y - y;
      return (dx * dx + dy * dy) < (65 * 65);
    });

    if (!collides) {
      return { x, y, nextIndex: index + 1 };
    }
    index++;
  }
  return { x: startX + (index % cols) * stepX, y: startY + Math.floor(index / cols) * stepY, nextIndex: index + 1 };
}

function getUnplacedDevicesForFloor(floor) {
  if (!floor) floor = getActiveFloor();
  if (!floor) return [];

  const placedInstanceIds = new Set();
  facilityFloors.forEach(fl => {
    (fl.nodes || []).forEach(n => {
      if (n.instanceId) placedInstanceIds.add(n.instanceId);
      if (n.id && n.id.startsWith("dev-")) placedInstanceIds.add(n.id.replace("dev-", ""));
      if (n.id) placedInstanceIds.add(n.id);
    });
  });

  const allUnplaced = (typeof projectBOM !== "undefined" ? projectBOM : []).filter(item => {
    if (!isFieldDeviceForPhysicalLayout(item)) return false;
    return !placedInstanceIds.has(item.instanceId);
  });

  if (allUnplaced.length === 0) return [];

  // Gather identifiers for this floor
  const spacesThisFloor = (typeof FacilityStore !== "undefined" && typeof FacilityStore.getSpaces === "function")
    ? FacilityStore.getSpaces().filter(s => s.floorId === floor.id)
    : [];
  const spaceIdsThisFloor = new Set(spacesThisFloor.map(s => s.id));
  const spaceNamesThisFloor = new Set(spacesThisFloor.map(s => s.name.toLowerCase()));

  const encsThisFloor = (typeof FacilityStore !== "undefined" && typeof FacilityStore.getEnclosures === "function")
    ? FacilityStore.getEnclosures().filter(e => spaceIdsThisFloor.has(e.spaceId))
    : [];
  const encNamesThisFloor = new Set(encsThisFloor.map(e => e.name.toLowerCase()));

  const allClosets = getAllClosetsAcrossFacility();
  const closetsThisFloor = allClosets.filter(c => c.floorId === floor.id);
  const closetNamesThisFloor = new Set(closetsThisFloor.map(c => c.name.toLowerCase()));

  // Other floors
  const otherFloors = facilityFloors.filter(f => f.id !== floor.id);
  const otherFloorNames = otherFloors.map(f => f.name.toLowerCase());
  const floorNameLower = (floor.name || "").toLowerCase();

  function belongsToThisFloor(item) {
    if (item.floorId && item.floorId === floor.id) return true;
    if (item.floor && item.floor.toLowerCase() === floorNameLower) return true;

    const loc = (item.closetName || item.rackId || "").trim();
    if (!loc || loc === FacilityStore.UNASSIGNED) return false;
    const locLower = loc.toLowerCase();

    // Check if explicitly on another floor
    for (const ofn of otherFloorNames) {
      if (locLower === ofn || locLower.startsWith(ofn + " •") || locLower.startsWith(ofn + " -") || locLower.startsWith(ofn + " ")) {
        return false;
      }
    }

    // Check if on this floor
    if (locLower === floorNameLower || locLower.startsWith(floorNameLower + " •") || locLower.startsWith(floorNameLower + " -") || locLower.startsWith(floorNameLower + " ")) {
      return true;
    }

    // Check space, enclosure, or closet name
    const parts = locLower.split("•").map(p => p.trim());
    for (const p of parts) {
      if (spaceNamesThisFloor.has(p) || encNamesThisFloor.has(p) || closetNamesThisFloor.has(p)) {
        return true;
      }
    }

    return false;
  }

  function belongsToOtherFloor(item) {
    if (item.floorId && item.floorId !== floor.id) return true;
    const loc = (item.closetName || item.rackId || "").trim();
    if (!loc || loc === FacilityStore.UNASSIGNED) return false;
    const locLower = loc.toLowerCase();

    for (const ofn of otherFloorNames) {
      if (locLower === ofn || locLower.startsWith(ofn + " •") || locLower.startsWith(ofn + " -") || locLower.startsWith(ofn + " ")) {
        return true;
      }
    }
    return false;
  }

  // 1. If items explicitly match this floor, return those
  const thisFloorMatches = allUnplaced.filter(item => belongsToThisFloor(item));
  if (thisFloorMatches.length > 0) {
    return thisFloorMatches;
  }

  // 2. If no items explicitly belong to this floor, include items not explicitly assigned to another floor (unassigned)
  return allUnplaced.filter(item => !belongsToOtherFloor(item));
}

function placeAllUnplacedOnActiveFloor() {
  const floor = getActiveFloor();
  if (!floor) {
    if (typeof showToast === "function") showToast("No active floor found to place devices.", "warning");
    return;
  }

  const unplacedForFloor = getUnplacedDevicesForFloor(floor);
  if (!unplacedForFloor || unplacedForFloor.length === 0) {
    if (typeof showToast === "function") {
      showToast(`No unplaced field devices found for ${floor.name}.`, "info");
    }
    return;
  }

  const allClosets = getAllClosetsAcrossFacility();
  let nextGridIndex = (floor.nodes || []).filter(n => n.type === "device").length;
  let placedCount = 0;
  let didUpdateWorkspace = false;

  unplacedForFloor.forEach(item => {
    // Find matching closet on this floor if item already has a location assigned
    let matchingCloset = null;
    if (item.closetName && item.closetName !== FacilityStore.UNASSIGNED) {
      matchingCloset = allClosets.find(c => c.name === item.closetName && c.floorId === floor.id);
      if (!matchingCloset) {
        const prefix = item.closetName.split("•")[0].trim();
        matchingCloset = allClosets.find(c => (c.name === prefix || item.closetName.startsWith(c.name)) && c.floorId === floor.id);
      }
      if (!matchingCloset) {
        matchingCloset = allClosets.find(c => c.name === item.closetName);
      }
    }
    if (!matchingCloset) {
      matchingCloset = allClosets.find(c => c.floorId === floor.id) || allClosets[0] || null;
    }

    const spot = findNextAvailableGridSpot(floor, nextGridIndex);
    nextGridIndex = spot.nextIndex;

    const newDrop = {
      id: `dev-${item.instanceId}`,
      instanceId: item.instanceId,
      name: item.friendlyName || item.model,
      deviceNumber: item.deviceNumber,
      type: "device",
      floorId: floor.id,
      x: spot.x,
      y: spot.y,
      assignedClosetId: matchingCloset ? matchingCloset.id : null,
      mountMethod: item.mountMethod || "wall",
      waypoints: []
    };

    floor.nodes.push(newDrop);
    placedCount++;

    // If item was unassigned or in virtual field, assign it to the matching closet's location
    const curLoc = (item.closetName || "").toLowerCase().trim();
    const isFieldOrUnassigned = !item.closetName || curLoc === "unassigned" || curLoc === "field" || curLoc.endsWith("• field") || curLoc.endsWith("-field");
    if (isFieldOrUnassigned && matchingCloset) {
      item.closetName = matchingCloset.name;
      item.rackId = matchingCloset.name;
      didUpdateWorkspace = true;
      if (typeof autoSelectMountingForHost === "function") {
        autoSelectMountingForHost(item, matchingCloset.name);
      }
    }
    if (newDrop.mountMethod === "pole" && typeof autoSelectMountingForHost === "function") {
      autoSelectMountingForHost(item, "Pole Assembly", "structural_mount");
    }
    // Auto-home field device to the access switch in the matching closet
    if (typeof PortEngine !== "undefined" && matchingCloset) {
      PortEngine.autoAssignDeviceToClosetSwitch(item, matchingCloset.name);
      didUpdateWorkspace = true;
    }
  });

  if (didUpdateWorkspace) {
    FacilityStore.notifyWorkspaceChange();
  }

  selectedNodeId = null;
  recalculateCurrentFloorCables();
  renderCableCanvas();
  renderInspector();
  renderSidebarTabContent();
  switchSidebarTab("runs");
  saveFacilityState();

  if (typeof showToast === "function") {
    showToast(`Successfully placed ${placedCount} devices onto ${floor.name}!`);
  }
}

function placeBomItemOnFloor(instanceId) {
  const item = projectBOM.find(i => i.instanceId === instanceId);
  if (!item) return;

  const floor = getActiveFloor();
  if (!floor) {
    if (typeof showToast === "function") showToast("Please add or select a floor/building before placing devices.", "warning");
    return;
  }
  const allClosets = getAllClosetsAcrossFacility();

  // Find matching closet on this floor if item already has a location assigned
  let matchingCloset = null;
  if (item.closetName && item.closetName !== FacilityStore.UNASSIGNED) {
    matchingCloset = allClosets.find(c => c.name === item.closetName && c.floorId === floor.id);
    if (!matchingCloset) {
      const prefix = item.closetName.split("•")[0].trim();
      matchingCloset = allClosets.find(c => (c.name === prefix || item.closetName.startsWith(c.name)) && c.floorId === floor.id);
    }
    if (!matchingCloset) {
      matchingCloset = allClosets.find(c => c.name === item.closetName);
    }
  }
  if (!matchingCloset) {
    matchingCloset = allClosets.find(c => c.floorId === floor.id) || allClosets[0] || null;
  }

  const spot = findNextAvailableGridSpot(floor);

  const newDrop = {
    id: `dev-${item.instanceId}`,
    instanceId: item.instanceId,
    name: item.friendlyName || item.model,
    deviceNumber: item.deviceNumber,
    type: "device",
    floorId: floor.id,
    x: spot.x,
    y: spot.y,
    assignedClosetId: matchingCloset ? matchingCloset.id : null,
    mountMethod: item.mountMethod || "wall",
    waypoints: []
  };

  floor.nodes.push(newDrop);
  selectedNodeId = newDrop.id;

  // If item was unassigned or in virtual field, assign it to the matching closet's location
  const curLocSingle = (item.closetName || "").toLowerCase().trim();
  const isFieldOrUnassignedSingle = !item.closetName || curLocSingle === "unassigned" || curLocSingle === "field" || curLocSingle.endsWith("• field") || curLocSingle.endsWith("-field");
  if (isFieldOrUnassignedSingle && matchingCloset) {
    item.closetName = matchingCloset.name;
    item.rackId = matchingCloset.name;
    if (typeof autoSelectMountingForHost === "function") {
      autoSelectMountingForHost(item, matchingCloset.name);
    }
    FacilityStore.notifyWorkspaceChange();
  }
  if (newDrop.mountMethod === "pole" && typeof autoSelectMountingForHost === "function") {
    autoSelectMountingForHost(item, "Pole Assembly", "structural_mount");
  }
  // Auto-home field device to the access switch in the matching closet
  if (typeof PortEngine !== "undefined" && matchingCloset) {
    PortEngine.autoAssignDeviceToClosetSwitch(item, matchingCloset.name);
    FacilityStore.notifyWorkspaceChange();
  }

  recalculateCurrentFloorCables();
  renderCableCanvas();
  renderInspector();
  renderSidebarTabContent();
  switchSidebarTab("runs");
  saveFacilityState();
  if (typeof showToast === "function") {
    showToast(`Placed ${item.model} on ${floor.name}`);
  }
}

// -----------------------------------------------------------
// Inspector & Physical-Only Cabinet Peek
// -----------------------------------------------------------
function selectNode(id) {
  selectedNodeId = id;
  selectedFiberBackboneId = null;
  renderInspector();
  renderCableCanvas();
  renderSidebarTabContent();
}

function deselectNode() {
  selectedNodeId = null;
  renderInspector();
  renderCableCanvas();
  renderSidebarTabContent();
}

function isClosetMatch(nameA, nameB) {
  if (!nameA || !nameB) return false;
  const normA = (typeof FacilityStore !== "undefined" ? FacilityStore.normalize(nameA) : String(nameA)).trim().toLowerCase();
  const normB = (typeof FacilityStore !== "undefined" ? FacilityStore.normalize(nameB) : String(nameB)).trim().toLowerCase();
  if (normA === normB) return true;

  // Compare clean full strings
  const cleanFullA = normA.replace(/[^a-z0-9]/g, "");
  const cleanFullB = normB.replace(/[^a-z0-9]/g, "");
  if (cleanFullA && cleanFullB && cleanFullA === cleanFullB) return true;

  // Compare space names (before the " • ")
  const spaceA = normA.split(" • ")[0].trim();
  const spaceB = normB.split(" • ")[0].trim();
  const cleanSpaceA = spaceA.replace(/[^a-z0-9]/g, "");
  const cleanSpaceB = spaceB.replace(/[^a-z0-9]/g, "");
  if (cleanSpaceA && cleanSpaceB && cleanSpaceA === cleanSpaceB) return true;

  return false;
}

function getInterClosetConnections() {
  const pairMap = new Map();

  // 1. Try topologyLinks if available
  let tLinks = (typeof topologyLinks !== "undefined" && Array.isArray(topologyLinks)) ? topologyLinks : [];
  if (tLinks.length === 0 && typeof generateTopologyLinks === "function" && typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) {
    generateTopologyLinks(projectBOM.filter(i => !i.parentInstanceId));
    tLinks = (typeof topologyLinks !== "undefined" && Array.isArray(topologyLinks)) ? topologyLinks : [];
  }

  const overrides = (typeof getLinkInterconnectOverrides === "function") 
    ? getLinkInterconnectOverrides() 
    : ((typeof linkInterconnectOverrides !== "undefined") ? linkInterconnectOverrides : {});

  const projFiber = (typeof getProjectFiberType === "function") ? getProjectFiberType() : "mmf";

  if (tLinks.length > 0 && typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) {
    tLinks.forEach(link => {
      if (link.isWireless) return;
      if (link.isPoEDelivery) return;

      const nodeA = projectBOM.find(i => i.instanceId === link.fromId);
      const nodeB = projectBOM.find(i => i.instanceId === link.toId);
      if (!nodeA || !nodeB) return;

      const locA = (typeof FacilityStore !== "undefined") ? FacilityStore.normalize(nodeA.closetName || nodeA.rackId || "MDF") : (nodeA.closetName || "MDF");
      const locB = (typeof FacilityStore !== "undefined") ? FacilityStore.normalize(nodeB.closetName || nodeB.rackId || "MDF") : (nodeB.closetName || "MDF");

      if (locA === locB) return;
      if (locA.endsWith("• Field") || locB.endsWith("• Field")) return;
      if (typeof FacilityStore !== "undefined" && (locA === FacilityStore.UNASSIGNED || locB === FacilityStore.UNASSIGNED)) return;

      const normA = locA.trim().toLowerCase();
      const normB = locB.trim().toLowerCase();
      const pairKey = [normA.replace(/[^a-z0-9]/g, ""), normB.replace(/[^a-z0-9]/g, "")].sort().join("___");

      const override = overrides[link.id] || {};
      let fiberType = projFiber;
      if (override.fiberType && override.fiberType !== "auto") {
        fiberType = override.fiberType;
      } else if (override.medium && (override.medium === "smf" || override.medium === "mmf")) {
        fiberType = override.medium;
      }

      if (!pairMap.has(pairKey)) {
        pairMap.set(pairKey, {
          locA,
          locB,
          fiberType,
          speed: link.rawSpeed || "10G",
          linkId: link.id
        });
      }
    });
  }

  // 2. Direct BOM inspection fallback if topologyLinks yielded nothing
  if (pairMap.size === 0 && typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) {
    const switches = projectBOM.filter(i => !i.parentInstanceId && (i.role === "Access" || i.role === "Core" || i.role === "Aggregation" || i.role === "Core & Agg" || i.role === "Switch"));
    const coreSwitch = switches.find(s => s.role === "Core" || s.role === "Core & Agg" || s.role === "Aggregation") || switches[0];

    switches.forEach(sw => {
      let targetSw = null;
      if (sw.customUplinkTargetId) {
        targetSw = switches.find(s => s.instanceId === sw.customUplinkTargetId);
      } else if (sw.uplinkTargetId) {
        targetSw = switches.find(s => s.instanceId === sw.uplinkTargetId);
      } else if (coreSwitch && sw.instanceId !== coreSwitch.instanceId) {
        targetSw = coreSwitch;
      }

      if (targetSw && targetSw.instanceId !== sw.instanceId) {
        const locA = (typeof FacilityStore !== "undefined") ? FacilityStore.normalize(sw.closetName || sw.rackId || "MDF") : (sw.closetName || "MDF");
        const locB = (typeof FacilityStore !== "undefined") ? FacilityStore.normalize(targetSw.closetName || targetSw.rackId || "MDF") : (targetSw.closetName || "MDF");

        if (locA !== locB && !locA.endsWith("• Field") && !locB.endsWith("• Field")) {
          const normA = locA.trim().toLowerCase();
          const normB = locB.trim().toLowerCase();
          const pairKey = [normA.replace(/[^a-z0-9]/g, ""), normB.replace(/[^a-z0-9]/g, "")].sort().join("___");
          if (!pairMap.has(pairKey)) {
            pairMap.set(pairKey, {
              locA,
              locB,
              fiberType: projFiber,
              speed: "10G",
              linkId: `link-${sw.instanceId}-${targetSw.instanceId}`
            });
          }
        }
      }
    });
  }

  return Array.from(pairMap.values());
}

function autoSyncFiberBackbonesFromTopology(floor, force = false) {
  if (!floor || !Array.isArray(floor.nodes)) return 0;
  if (!floor.fiberBackbones) floor.fiberBackbones = [];
  if (!floor.deletedFiberLinks) floor.deletedFiberLinks = [];

  const connections = getInterClosetConnections();
  if (!connections || connections.length === 0) return 0;

  const closetsOnFloor = floor.nodes.filter(n => n.type === "closet");
  if (closetsOnFloor.length < 2) return 0;

  let createdCount = 0;

  connections.forEach(conn => {
    const c1 = closetsOnFloor.find(c => isClosetMatch(c.name, conn.locA));
    const c2 = closetsOnFloor.find(c => isClosetMatch(c.name, conn.locB));

    if (c1 && c2 && c1.id !== c2.id) {
      const normA = (typeof FacilityStore !== "undefined" ? FacilityStore.normalize(c1.name || "") : String(c1.name || "")).trim().toLowerCase();
      const normB = (typeof FacilityStore !== "undefined" ? FacilityStore.normalize(c2.name || "") : String(c2.name || "")).trim().toLowerCase();
      const fullKey = [normA.replace(/[^a-z0-9]/g, ""), normB.replace(/[^a-z0-9]/g, "")].sort().join("___");
      const spaceA = normA.split(" • ")[0].trim().replace(/[^a-z0-9]/g, "");
      const spaceB = normB.split(" • ")[0].trim().replace(/[^a-z0-9]/g, "");
      const spaceKey = [spaceA, spaceB].sort().join("___");
      const idKey = [c1.id, c2.id].sort().join("___");

      const existing = floor.fiberBackbones.find(fb => 
        (fb.fromId === c1.id && fb.toId === c2.id) || (fb.fromId === c2.id && fb.toId === c1.id)
      );

      if (existing) {
        if (!existing.customOverride && conn.fiberType && existing.fiberType !== conn.fiberType) {
          existing.fiberType = conn.fiberType;
        }
      } else {
        if (!force && (
          floor.deletedFiberLinks.includes(fullKey) || 
          floor.deletedFiberLinks.includes(spaceKey) || 
          floor.deletedFiberLinks.includes(idKey)
        )) {
          return;
        }

        const newFb = {
          id: `fiber-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          fromId: c1.id,
          toId: c2.id,
          fromClosetName: c1.name,
          toClosetName: c2.name,
          fiberType: conn.fiberType || ((typeof getProjectFiberType === "function") ? getProjectFiberType() : "mmf"),
          strandCount: 12,
          rating: "plenum",
          connectorType: "lc",
          slackFt: 40,
          waypoints: [],
          autoCreatedFromTopology: true
        };
        floor.fiberBackbones.push(newFb);
        createdCount++;
      }
    }
  });

  return createdCount;
}

function manualAutoLinkTopology() {
  const floor = getActiveFloor();
  if (!floor) return;
  floor.deletedFiberLinks = [];
  const count = autoSyncFiberBackbonesFromTopology(floor, true);
  recalculateCurrentFloorCables();
  renderCableCanvas();
  renderInspector();
  renderSidebarTabContent();
  saveFacilityState();
  if (typeof commitCablingToBOM === "function") commitCablingToBOM();
  if (typeof renderBOMTable === "function") renderBOMTable();

  if (count > 0) {
    if (typeof showToast === "function") {
      showToast(`Auto-linked ${count} fiber backbone${count > 1 ? 's' : ''} based on Topology.`);
    }
  } else {
    if (typeof showToast === "function") {
      showToast("All closet uplinks from Topology are already linked.");
    }
  }
}

function syncFiberBackboneToTopology(fb, newFiberType) {
  if (!fb || !newFiberType) return;
  const floor = getActiveFloor();
  if (!floor) return;
  const c1 = (floor.nodes || []).find(n => n.id === fb.fromId);
  const c2 = (floor.nodes || []).find(n => n.id === fb.toId);
  const name1 = c1 ? c1.name : (fb.fromClosetName || "");
  const name2 = c2 ? c2.name : (fb.toClosetName || "");
  if (!name1 || !name2) return;

  const overrides = (typeof getLinkInterconnectOverrides === "function") 
    ? getLinkInterconnectOverrides() 
    : ((typeof linkInterconnectOverrides !== "undefined") ? linkInterconnectOverrides : {});

  if ((typeof topologyLinks === "undefined" || topologyLinks.length === 0) && typeof generateTopologyLinks === "function" && typeof projectBOM !== "undefined") {
    generateTopologyLinks(projectBOM.filter(i => !i.parentInstanceId));
  }

  const links = (typeof topologyLinks !== "undefined" && Array.isArray(topologyLinks)) ? topologyLinks : [];
  let updatedCount = 0;

  links.forEach(lnk => {
    const s1 = (typeof projectBOM !== "undefined") ? projectBOM.find(i => i.instanceId === lnk.fromId) : null;
    const s2 = (typeof projectBOM !== "undefined") ? projectBOM.find(i => i.instanceId === lnk.toId) : null;
    if (s1 && s2) {
      const loc1 = (typeof FacilityStore !== "undefined") ? FacilityStore.normalize(s1.closetName || s1.rackId || "") : (s1.closetName || "");
      const loc2 = (typeof FacilityStore !== "undefined") ? FacilityStore.normalize(s2.closetName || s2.rackId || "") : (s2.closetName || "");
      const match1 = isClosetMatch(loc1, name1) && isClosetMatch(loc2, name2);
      const match2 = isClosetMatch(loc1, name2) && isClosetMatch(loc2, name1);
      if (match1 || match2) {
        if (!overrides[lnk.id]) overrides[lnk.id] = {};
        overrides[lnk.id].fiberType = newFiberType;
        overrides[lnk.id].medium = newFiberType;
        updatedCount++;
      }
    }
  });

  if (typeof setLinkInterconnectOverrides === "function") {
    setLinkInterconnectOverrides(overrides);
  } else if (typeof linkInterconnectOverrides !== "undefined") {
    linkInterconnectOverrides = overrides;
  }

  if (updatedCount > 0) {
    if (typeof autoSynthesizeInterconnects === "function") autoSynthesizeInterconnects();
    if (typeof renderTopologyInspector === "function") renderTopologyInspector();
    if (typeof renderTopologyLinks === "function") renderTopologyLinks();
  }
}

function selectFiberBackbone(fiberId, e) {
  if (e && typeof e.stopPropagation === "function") {
    e.stopPropagation();
  }
  if (selectedFiberBackboneId === fiberId) return;
  selectedFiberBackboneId = fiberId;
  selectedNodeId = null;
  const inspectorPanel = document.getElementById("inspectorPanel");
  if (inspectorPanel && inspectorPanel.classList.contains("hidden")) {
    inspectorPanel.classList.remove("hidden");
  }
  renderInspector();
  renderSidebarTabContent();
  renderCableCanvas();
}

function deselectFiberBackbone() {
  selectedFiberBackboneId = null;
  renderInspector();
  renderSidebarTabContent();
  renderCableCanvas();
}

function updateFiberBackbone(fiberId, field, value) {
  const floor = getActiveFloor();
  if (!floor || !floor.fiberBackbones) return;
  const fb = floor.fiberBackbones.find(f => f.id === fiberId);
  if (!fb) return;
  fb[field] = value;

  // Real-time synchronization to Topology if changing fiber type
  if (field === "fiberType") {
    fb.customOverride = true;
    syncFiberBackboneToTopology(fb, value);
  }

  recalculateCurrentFloorCables();
  renderCableCanvas();
  renderInspector();
  renderSidebarTabContent();
  saveFacilityState(true);
  if (typeof commitCablingToBOM === "function") {
    commitCablingToBOM({ silent: true });
  }
  if (typeof renderBOMTable === "function") {
    renderBOMTable();
  }
}

function deleteFiberBackbone(fiberId, e) {
  if (e && typeof e.stopPropagation === "function") {
    e.stopPropagation();
  }
  const floor = getActiveFloor();
  if (!floor || !floor.fiberBackbones) return;
  const targetFb = floor.fiberBackbones.find(f => f.id === fiberId);
  if (targetFb) {
    const c1 = (floor.nodes || []).find(n => n.id === targetFb.fromId);
    const c2 = (floor.nodes || []).find(n => n.id === targetFb.toId);
    const name1 = c1 ? c1.name : (targetFb.fromClosetName || "");
    const name2 = c2 ? c2.name : (targetFb.toClosetName || "");
    const norm1 = (typeof FacilityStore !== "undefined" ? FacilityStore.normalize(name1) : String(name1)).trim().toLowerCase();
    const norm2 = (typeof FacilityStore !== "undefined" ? FacilityStore.normalize(name2) : String(name2)).trim().toLowerCase();
    const fullKey = [norm1.replace(/[^a-z0-9]/g, ""), norm2.replace(/[^a-z0-9]/g, "")].sort().join("___");
    const space1 = norm1.split(" • ")[0].trim().replace(/[^a-z0-9]/g, "");
    const space2 = norm2.split(" • ")[0].trim().replace(/[^a-z0-9]/g, "");
    const spaceKey = [space1, space2].sort().join("___");

    if (!floor.deletedFiberLinks) floor.deletedFiberLinks = [];
    if (!floor.deletedFiberLinks.includes(fullKey)) {
      floor.deletedFiberLinks.push(fullKey);
    }
    if (!floor.deletedFiberLinks.includes(spaceKey)) {
      floor.deletedFiberLinks.push(spaceKey);
    }
    if (targetFb.fromId && targetFb.toId) {
      const idKey = [targetFb.fromId, targetFb.toId].sort().join("___");
      if (!floor.deletedFiberLinks.includes(idKey)) {
        floor.deletedFiberLinks.push(idKey);
      }
    }
    if (!floor.deletedFiberLinks.includes(fiberId)) {
      floor.deletedFiberLinks.push(fiberId);
    }
  }

  floor.fiberBackbones = floor.fiberBackbones.filter(f => f.id !== fiberId);
  if (selectedFiberBackboneId === fiberId) {
    selectedFiberBackboneId = null;
  }
  recalculateCurrentFloorCables();
  renderCableCanvas();
  renderInspector();
  renderSidebarTabContent();
  saveFacilityState(true);
  if (typeof commitCablingToBOM === "function") {
    commitCablingToBOM({ silent: true });
  }
  if (typeof renderBOMTable === "function") {
    renderBOMTable();
  }
  if (typeof showToast === "function") {
    showToast("Fiber backbone link deleted.");
  }
}

function renderInspector() {
  const container = document.getElementById("inspectorContent");
  if (!container) return;

  if (!selectedNodeId && !selectedFiberBackboneId) {
    container.innerHTML = `<span class="text-slate-500 text-[11px] block text-center py-2">Select a drop, closet, or fiber link to view properties or rack contents.</span>`;
    return;
  }

  const floor = getActiveFloor();
  if (!floor) {
    container.innerHTML = `<span class="text-slate-500 text-[11px] block text-center py-2">No active floor/building. Click "+ Floor/Building" to create one.</span>`;
    return;
  }

  // Fiber Backbone Inspector
  if (selectedFiberBackboneId) {
    const fb = (floor && floor.fiberBackbones) ? floor.fiberBackbones.find(f => f.id === selectedFiberBackboneId) : null;
    if (fb) {
      const c1 = floor.nodes.find(n => n.id === fb.fromId);
      const c2 = floor.nodes.find(n => n.id === fb.toId);
      const fromName = c1 ? c1.name : (fb.fromClosetName || "MDF");
      const toName = c2 ? c2.name : (fb.toClosetName || "IDF");
      const fType = (fb.fiberType || (typeof getProjectFiberType === "function" ? getProjectFiberType() : "mmf")).toLowerCase();
      const strands = parseInt(fb.strandCount) || 12;
      const rating = fb.rating || "plenum";
      const conn = fb.connectorType || "lc";
      const slack = (typeof fb.slackFt === "number") ? fb.slackFt : 40;
      const measured = fb.measuredFt || Math.max(10, (fb.totalFt || 100) - slack);
      const totalFt = measured + slack;

      // Price estimation preview
      const catalogList = (typeof CABLING_CATALOG !== "undefined" && CABLING_CATALOG.fiberBackbone) ? CABLING_CATALOG.fiberBackbone : [];
      const trunkItem = catalogList.find(i => i.medium === fType && i.strands === strands) ||
        catalogList.find(i => i.medium === fType) ||
        catalogList[0] ||
        { sku: "FIBER-TRUNK", name: "Fiber Trunk", msrpPerFt: 2.50, baseTerminationMsrp: 250 };
      const estPrice = Math.round((totalFt * (trunkItem.msrpPerFt || 2.5)) + (trunkItem.baseTerminationMsrp || 250));

      container.innerHTML = `
        <div class="space-y-4">
          <div class="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div class="flex items-center gap-2">
              <div class="p-1.5 rounded-lg ${fType === 'smf' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'}">
                <i data-lucide="network" class="w-4 h-4"></i>
              </div>
              <div>
                <h4 class="text-xs font-bold text-white tracking-wide">Fiber Backbone Link</h4>
                <p class="text-[10px] text-slate-400 font-mono">Inter-Enclosure Optical Trunk</p>
              </div>
            </div>
            <div class="flex items-center gap-1.5">
              <button type="button" onclick="deleteFiberBackbone('${fb.id}', event)" class="px-2 py-1 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-700/60 rounded text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm" title="Delete this fiber backbone">
                <i data-lucide="trash-2" class="w-3 h-3"></i> Delete
              </button>
              <button onclick="deselectFiberBackbone()" class="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer" title="Deselect">
                <i data-lucide="x" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </div>

          <!-- Locations Span -->
          <div class="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
            <label class="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">Connected Enclosures / Closets</label>
            <div class="flex items-center justify-between text-xs font-semibold gap-2">
              <span class="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-indigo-300 truncate max-w-[110px]" title="${escapeHTML(fromName)}">${escapeHTML(fromName)}</span>
              <span class="text-slate-500 font-mono text-[11px]">&harr;</span>
              <span class="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-indigo-300 truncate max-w-[110px]" title="${escapeHTML(toName)}">${escapeHTML(toName)}</span>
            </div>
          </div>

          <!-- Optical Medium / Fiber Type -->
          <div>
            <label class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Optical Fiber Medium</label>
            <select onchange="updateFiberBackbone('${fb.id}', 'fiberType', this.value)" class="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-500 font-medium cursor-pointer">
              <option value="smf" ${fType === 'smf' ? 'selected' : ''}>OS2 Single-Mode (9/125&mu;m &bull; Yellow Jacket &bull; 1310/1550nm LR)</option>
              <option value="mmf" ${fType === 'mmf' ? 'selected' : ''}>OM4 Multi-Mode (50/125&mu;m &bull; Aqua Jacket &bull; 850nm SR)</option>
              <option value="om3" ${fType === 'om3' ? 'selected' : ''}>OM3 Multi-Mode (50/125&mu;m &bull; Aqua Jacket &bull; 850nm SR)</option>
            </select>
          </div>

          <!-- Strand Count -->
          <div>
            <label class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Strand Count / Core Capacity</label>
            <select onchange="updateFiberBackbone('${fb.id}', 'strandCount', parseInt(this.value))" class="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-medium cursor-pointer">
              <option value="6" ${strands === 6 ? 'selected' : ''}>6-Strand (3 Duplex Pairs)</option>
              <option value="12" ${strands === 12 ? 'selected' : ''}>12-Strand (6 Duplex Pairs &bull; Standard)</option>
              <option value="24" ${strands === 24 ? 'selected' : ''}>24-Strand (12 Duplex Pairs &bull; High-Density)</option>
              <option value="48" ${strands === 48 ? 'selected' : ''}>48-Strand (24 Duplex Pairs &bull; Core Spine)</option>
            </select>
          </div>

          <!-- Jacket Fire Rating -->
          <div>
            <label class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Jacket Fire Rating / Environment</label>
            <select onchange="updateFiberBackbone('${fb.id}', 'rating', this.value)" class="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-medium cursor-pointer">
              <option value="plenum" ${rating === 'plenum' ? 'selected' : ''}>OFNP - Plenum Rated (Air Return / Ceiling Plenums)</option>
              <option value="riser" ${rating === 'riser' ? 'selected' : ''}>OFNR - Riser Rated (Vertical Shafts / Conduits)</option>
              <option value="armored" ${rating === 'armored' ? 'selected' : ''}>Armored / OSP (Indoor/Outdoor Inter-Locking Armor)</option>
            </select>
          </div>

          <!-- Connector Termination -->
          <div>
            <label class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Pre-Terminated Connector End</label>
            <select onchange="updateFiberBackbone('${fb.id}', 'connectorType', this.value)" class="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-medium cursor-pointer">
              <option value="lc" ${conn === 'lc' ? 'selected' : ''}>LC Duplex (Staggered Breakout Kits)</option>
              <option value="sc" ${conn === 'sc' ? 'selected' : ''}>SC Duplex</option>
              <option value="mpo" ${conn === 'mpo' ? 'selected' : ''}>MTP / MPO High-Density Cassette</option>
            </select>
          </div>

          <!-- Length & Slack -->
          <div class="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-2">
            <label class="text-[10px] uppercase font-bold text-slate-400 block">Footage &amp; Service Loops</label>
            <div class="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span class="text-slate-500 block text-[10px]">Measured Span:</span>
                <span class="font-mono font-bold text-slate-200">${measured} ft</span>
              </div>
              <div>
                <span class="text-slate-500 block text-[10px]">Service Loops:</span>
                <div class="flex items-center gap-1">
                  <input type="number" min="0" max="200" step="5" value="${slack}" onchange="updateFiberBackbone('${fb.id}', 'slackFt', parseFloat(this.value) || 0)" class="w-16 bg-slate-900 border border-slate-700 text-white text-xs px-1.5 py-0.5 rounded font-mono focus:border-indigo-500" />
                  <span class="text-[10px] text-slate-400">ft</span>
                </div>
              </div>
            </div>
            <div class="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span class="text-slate-400 font-medium">Total Assembly Run:</span>
              <span class="font-mono font-bold text-amber-300">${totalFt} ft (${Math.round(totalFt * 0.3048)}m)</span>
            </div>
          </div>

          <!-- Live BOM Line Item Preview -->
          <div class="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 text-[11px] space-y-1">
            <div class="flex items-center justify-between">
              <span class="text-[10px] uppercase font-bold text-indigo-400">Quote BOM Item</span>
              <span class="font-mono font-bold text-emerald-400">$${estPrice.toLocaleString()} MSRP</span>
            </div>
            <p class="font-semibold text-white leading-tight text-xs">${strands}-Strand ${fType === 'smf' ? 'OS2 Single-Mode' : 'OM4 Multi-Mode'} Pre-Term Trunk</p>
            <p class="text-[10px] font-mono text-slate-400">${trunkItem.sku} &bull; ${fromName} &rarr; ${toName}</p>
          </div>

          <!-- Actions -->
          <div class="pt-2 flex items-center gap-2">
            <button onclick="deleteFiberBackbone('${fb.id}', event)" class="flex-1 py-1.5 px-3 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/60 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Delete Fiber Link
            </button>
          </div>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }
  }

  const node = (floor.nodes || []).find(n => n.id === selectedNodeId);
  if (!node) {
    container.innerHTML = `<span class="text-slate-500 text-[11px] block text-center py-2">No element selected.</span>`;
    return;
  }

  const isCloset = node.type === "closet";
  const allClosets = getAllClosetsAcrossFacility();
  const run = node.calculatedRun;

  if (isCloset) {
    const cabinetItems = (typeof projectBOM !== "undefined" ? projectBOM : []).filter(item => {
      if (item.role === "Mgmt License" || item.role === "Security License" || item.role === "Feature License") return false;
      if (item.baseWatts === 0 && (!item.ports || item.ports === 0) && item.role !== "Structured Cabling") return false;

      const normItemLoc = FacilityStore.normalize(item.closetName || item.rackId).toLowerCase();
      const normNodeLoc = FacilityStore.normalize(node.name).toLowerCase();
      return normItemLoc === normNodeLoc;
    });

    const rackMounted = cabinetItems.filter(i => !i.isDinMounted && i.role !== "Structured Cabling");
    const patchPanels = cabinetItems.filter(i => i.role === "Structured Cabling" && (i.model || '').includes("Patch Panel"));
    const fieldDevices = cabinetItems.filter(i => i.isDinMounted);

    container.innerHTML = `
      <div class="space-y-3">
        <div>
          <label class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Cabinet Name:</label>
          <input type="text" value="${node.name}" onchange="updateNodeName('${node.id}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-brand-500 font-semibold" />
        </div>

        <div>
          <label class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Assigned Floor/Building:</label>
          <select onchange="moveClosetToFloor('${node.id}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-amber-300 font-semibold rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-amber-500">
            ${facilityFloors.map(f => `
              <option value="${f.id}" ${f.id === node.floorId ? 'selected' : ''}>${f.name}</option>
            `).join('')}
          </select>
        </div>

        <div class="bg-slate-900 p-2.5 rounded-xl border border-slate-800 space-y-2">
          ${(() => {
            const telem = (typeof FacilityStore !== "undefined") ? FacilityStore.getLocationTelemetry(node.name) : { totalWatts: 0, totalRuOccupied: 0, totalPoEWatts: 0 };
            return `
              <div class="flex items-center justify-between text-[11px]">
                <span class="font-bold text-indigo-300">Physical Hardware Load</span>
                <span class="font-mono text-slate-400">${telem.totalRuOccupied} RU &bull; ${telem.totalWatts}W (${telem.totalPoEWatts}W PoE)</span>
              </div>
            `;
          })()}
          
          <div class="space-y-1 max-h-36 overflow-y-auto pr-1">
            ${patchPanels.map(it => `
              <div class="bg-slate-950 px-2 py-1 rounded text-[10px] border border-amber-500/30 flex justify-between text-amber-200">
                <span class="truncate"><strong class="text-amber-400">[1U Panel]</strong> ${escapeHTML(it.model)}</span>
                <span class="font-mono font-bold">${it.qty}x</span>
              </div>
            `).join('')}
            ${rackMounted.map(it => {
              const isStack = it.stackedUnits && it.stackedUnits >= 2;
              const ppSpan = (isStack && it.patchPanelBetween) ? (it.stackedUnits - 1) : 0;
              const stackSpan = (parseInt(it.rackUnits, 10) || 1) * (isStack ? it.stackedUnits : (parseInt(it.qty, 10) || 1)) + ppSpan;
              return `
                <div class="bg-slate-950 px-2 py-1 rounded text-[10px] border border-slate-800 flex justify-between text-slate-200">
                  <span class="truncate"><strong class="text-indigo-400">[${isStack ? `Stack: ${it.stackedUnits}x` : 'Hardware'}]</strong> ${escapeHTML(it.model)}</span>
                  <span class="font-mono text-emerald-400 font-bold">${stackSpan}U (${it.qty || 1}x)</span>
                </div>
              `;
            }).join('')}
            ${fieldDevices.map(it => `
              <div class="bg-slate-950 px-2 py-1 rounded text-[10px] border border-sky-800/40 text-sky-300 flex justify-between">
                <span class="truncate"><strong class="text-sky-400">[DIN/Field]</strong> ${escapeHTML(it.model)}</span>
                <span class="font-mono font-bold">${it.qty}x</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="flex items-center justify-between gap-1.5 pt-1 border-t border-slate-800 flex-wrap">
          <button onclick="deepLinkToRackElevation('${node.name}')" class="flex-1 min-w-[90px] py-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer" title="Open Elevation Visualizer">
            <i data-lucide="server" class="w-3.5 h-3.5 text-indigo-400"></i> Elevation
          </button>
          <button onclick="jumpToFacilitySpace('${node.name}')" class="flex-1 min-w-[80px] py-1.5 bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-200 border border-cyan-500/40 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer" title="Open Space in Facility Manager">
            <i data-lucide="building-2" class="w-3.5 h-3.5 text-cyan-400"></i> Space
          </button>
          <button onclick="jumpToTopologyTarget('loc:${node.name}')" class="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer" title="View in Topology">
            <i data-lucide="network" class="w-3.5 h-3.5 text-indigo-400"></i>
          </button>
          <button onclick="deleteClosetWithReassignment('${node.id}')" class="p-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-800/60 rounded-lg cursor-pointer" title="Delete Closet">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      </div>
    `;
  } else {
    // Look up BOM item
    const item = (typeof projectBOM !== "undefined" && Array.isArray(projectBOM))
      ? projectBOM.find(i => (i.instanceId && (i.instanceId === node.instanceId || i.instanceId === node.id || ('dev-' + i.instanceId) === node.id)) || i.model === node.name)
      : null;

    // Get all switches across BOM
    const allSwitches = (typeof projectBOM !== "undefined" && Array.isArray(projectBOM))
      ? projectBOM.filter(i => !i.parentInstanceId && (
          (i.role || "").toLowerCase().includes("switch") || (i.category || "").toLowerCase().includes("switch") ||
          i.role === "Access" || i.role === "Core" || i.role === "Aggregation" || i.role === "Core & Agg" || i.role === "Security WAN"
        ))
      : [];

    const hostSwitch = (item && item.uplinkTargetId) ? allSwitches.find(s => s.instanceId === item.uplinkTargetId) : null;
    const hostSwitchPorts = (hostSwitch && typeof PortEngine !== "undefined") ? PortEngine.initSwitchPorts(hostSwitch) : [];
    const pwrBadge = (item && typeof PortEngine !== "undefined") ? PortEngine.getPowerBadge(item) : { label: "PoE", badgeLabel: "PoE", isExternal: false };
    const pwrWatts = item ? (parseFloat(item.powerConsumptionWatts || item.maxPowerWatts || 15.0) * (parseInt(item.qty, 10) || 1)) : 15.0;

    container.innerHTML = `
      <div class="space-y-2.5">
        <div>
          <label class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Device Label:</label>
          <input type="text" value="${escapeHTML(node.name)}" onchange="updateNodeName('${node.id}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-brand-500 font-semibold" />
        </div>

        <div>
          <label class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Terminating Enclosure / Space:</label>
          <select onchange="updateNodeCloset('${node.id}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-brand-500 font-mono">
            <optgroup label="Spaces & Zones (Field / Unenclosed)">
              ${allClosets.filter(c => c.name.endsWith(' • Field')).map(c => `
                <option value="${c.id}" ${node.assignedClosetId === c.id ? 'selected' : ''}>${c.name.replace(' • Field', '')} [Field Drop] (${c.floorName})</option>
              `).join('')}
            </optgroup>
            <optgroup label="Racks & Enclosures">
              ${allClosets.filter(c => !c.name.endsWith(' • Field')).map(c => `
                <option value="${c.id}" ${node.assignedClosetId === c.id ? 'selected' : ''}>${c.name} (${c.floorName})</option>
              `).join('')}
            </optgroup>
          </select>
        </div>

        <!-- Host Switch & Port Assignment Card -->
        <div class="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-[10px] uppercase font-bold text-sky-400 flex items-center gap-1 font-mono">
              <i data-lucide="network" class="w-3 h-3 text-sky-400"></i> Host Switch & Port
            </span>
            ${hostSwitch ? `
              <button type="button" onclick="openPortMatrixStudio('${hostSwitch.instanceId}')" class="text-[9px] font-mono text-amber-400 hover:text-amber-300 underline cursor-pointer flex items-center gap-1" title="Open Port Matrix Studio">
                <i data-lucide="grid" class="w-2.5 h-2.5"></i> Matrix
              </button>
            ` : ''}
          </div>

          <!-- Switch Select -->
          <div>
            <label class="text-[9px] uppercase font-mono text-slate-400 block mb-0.5">Switch</label>
            <select onchange="updateNodeHostSwitch('${node.id}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-brand-500 font-mono">
              <option value="">-- No Switch Assigned --</option>
              ${allSwitches.map(sw => {
                const swLoc = sw.closetName || sw.rackId || "Rack";
                const isSelected = hostSwitch && hostSwitch.instanceId === sw.instanceId;
                return `<option value="${sw.instanceId}" ${isSelected ? 'selected' : ''}>${escapeHTML(sw.friendlyName || sw.model)} (${escapeHTML(swLoc)})</option>`;
              }).join('')}
            </select>
          </div>

          <!-- Port Select -->
          ${hostSwitch ? `
            <div>
              <div class="flex items-center justify-between mb-0.5">
                <label class="text-[9px] uppercase font-mono text-slate-400">Switch Port</label>
                <span class="text-[9px] font-mono ${pwrBadge.isExternal ? 'text-amber-400' : 'text-emerald-400'}">${pwrBadge.badgeLabel || 'PoE'} (${pwrWatts}W)</span>
              </div>
              <select onchange="updateNodeSwitchPort('${node.id}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-brand-500 font-mono">
                ${hostSwitchPorts.filter(p => p.role === "access" && !p.isUplink).map(p => {
                  const isCurPort = (item && item.assignedSwitchPort === p.portNumber);
                  const isOcc = p.connectedDeviceId && !isCurPort;
                  const poeDesc = p.poeStandard ? `[${p.poeStandard.toUpperCase()} PoE]` : '[Data Only]';
                  return `
                    <option value="${p.portNumber}" ${isCurPort ? 'selected' : ''} ${isOcc ? 'class="text-slate-500"' : ''}>
                      ${p.shortLabel || `Port ${p.portNumber}`} (${p.speed || '1G'}) ${poeDesc} - ${isCurPort ? 'Current' : (isOcc ? `Occupied: ${escapeHTML(p.connectedDeviceModel || 'Other')}` : 'Free')}
                    </option>
                  `;
                }).join('')}
              </select>
            </div>
          ` : `
            <div class="text-[10px] text-amber-400/90 font-mono bg-amber-950/20 p-1.5 rounded border border-amber-800/40">
              Not connected to any switch. Select a switch above or auto-link from rack.
            </div>
          `}
        </div>

        <div>
          <label class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Mounting Architecture:</label>
          <select onchange="updateNodeMountMethod('${node.id}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-cyan-300 font-mono text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-brand-500">
            <option value="wall" ${(!node.mountMethod || node.mountMethod === 'wall') ? 'selected' : ''}>Wall Mount (Façade / Surface)</option>
            <option value="ceiling" ${node.mountMethod === 'ceiling' ? 'selected' : ''}>Ceiling / Soffit Mount</option>
            <option value="pole" ${node.mountMethod === 'pole' ? 'selected' : ''}>Pole / Mast Mount</option>
            <option value="parapet" ${node.mountMethod === 'parapet' ? 'selected' : ''}>Parapet Roof Mount</option>
            <option value="corner" ${node.mountMethod === 'corner' ? 'selected' : ''}>Corner Mount Bracket</option>
          </select>
        </div>

        ${run ? `
          <div class="bg-slate-900/90 p-2 rounded-lg border ${run.isExceeded ? 'border-rose-500/60' : 'border-slate-800'} text-[11px] font-mono space-y-1">
            <div class="flex justify-between">
              <span class="text-slate-400">Total Run:</span>
              <span class="font-bold ${run.isExceeded ? 'text-rose-400' : 'text-amber-300'}">${run.totalFt} ft (${run.totalMeters}m)</span>
            </div>
            ${run.riserFt > 0 ? `<div class="flex justify-between text-[10px] text-sky-400"><span>Vertical Riser:</span><span>+${run.riserFt} ft</span></div>` : ''}
          </div>
        ` : ''}

        <!-- 4-Way Omnipresent Cross-Navigation Action Buttons -->
        <div class="pt-1 flex items-center gap-1.5 flex-wrap">
          <button 
            type="button" 
            onclick="jumpToTopologyTarget('node:${node.instanceId || node.id}')"
            class="flex-1 min-w-[65px] py-1 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/40 rounded text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
            title="Inspect logical port and link status in Topology"
          >
            <i data-lucide="network" class="w-3 h-3 text-indigo-400"></i> Topology
          </button>
          <button 
            type="button" 
            onclick="if ('${hostSwitch ? hostSwitch.instanceId : ''}') openPortMatrixStudio('${hostSwitch ? hostSwitch.instanceId : ''}'); else showToast('Assign a host switch first', 'warning');"
            class="flex-1 min-w-[65px] py-1 bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 border border-amber-500/40 rounded text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
            title="Open Port Matrix Studio for this switch"
          >
            <i data-lucide="grid" class="w-3 h-3 text-amber-400"></i> Matrix
          </button>
          <button 
            type="button" 
            onclick="jumpToBomTarget('${node.instanceId || node.id}')"
            class="flex-1 min-w-[65px] py-1 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 rounded text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
            title="Inspect line item in BOM Drawer"
          >
            <i data-lucide="file-spreadsheet" class="w-3 h-3 text-emerald-400"></i> BOM
          </button>
          <button 
            type="button" 
            onclick="const cl = allClosets.find(c => c.id === '${node.assignedClosetId}'); if (cl) deepLinkToRackElevation(cl.name);"
            class="flex-1 min-w-[65px] py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
            title="Open Terminating Enclosure"
          >
            <i data-lucide="server" class="w-3 h-3 text-indigo-400"></i> Enclosure
          </button>
        </div>

        <div class="flex items-center justify-between gap-2 pt-1 border-t border-slate-800">
          <button onclick="clearNodeWaypoints('${node.id}')" class="px-2 py-1 bg-slate-800 text-slate-300 hover:text-white rounded border border-slate-700 text-[10px]">
            Reset Bends
          </button>
          <div class="flex items-center gap-1.5">
            <button onclick="deleteNode('${node.id}')" class="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer" title="Remove drop from canvas only">
              <span>Delete Drop</span>
            </button>
            <button onclick="deleteDropFromBOM('${node.id}')" class="px-2.5 py-1 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-700/80 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer" title="Delete device from Quote BOM and canvas">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Delete from BOM
            </button>
          </div>
        </div>
      </div>
    `;
  }

  if (window.lucide) lucide.createIcons();
}

function clearNodeWaypoints(id) {
  const floor = getActiveFloor();
  if (!floor) return;
  const node = (floor.nodes || []).find(n => n.id === id);
  if (node) {
    node.waypoints = [];
    recalculateCurrentFloorCables();
    renderCableCanvas();
    renderInspector();
    saveFacilityState();
  }
}

function deepLinkToRackElevation(closetName) {
  if (typeof NavigationHistory !== "undefined") {
    const st = NavigationHistory.captureCurrentState();
    if (st && st.tool !== "facility") NavigationHistory.push(st);
  }
  toggleCableLayoutModal();
  if (typeof openRackViewerFor === "function") {
    openRackViewerFor(closetName);
  } else if (typeof toggleRackModal === "function") {
    toggleRackModal();
    if (typeof switchActiveRackElevation === "function") switchActiveRackElevation(closetName);
  }
}

function updateNodeName(id, val) {
  const floor = getActiveFloor();
  if (!floor) return;
  const node = (floor.nodes || []).find(n => n.id === id);
  if (node && val && val.trim()) {
    const oldName = node.name;
    const newName = val.trim();
    node.name = newName;
    if (node.type === "closet" && typeof FacilityStore !== "undefined") {
      FacilityStore.renameLocation(oldName, newName);
    } else if (node.type === "device" && node.instanceId && typeof projectBOM !== "undefined") {
      const item = projectBOM.find(i => i.instanceId === node.instanceId);
      if (item && typeof DeviceTaxonomy !== "undefined") {
        DeviceTaxonomy.setFriendlyName(item, newName);
        if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
          FacilityStore.notifyWorkspaceChange();
        }
      }
    }
    recalculateCurrentFloorCables();
    renderCableCanvas();
    renderFloorSelector();
    saveFacilityState();
  }
}

function updateNodeCloset(id, closetId) {
  const floor = getActiveFloor();
  if (!floor) return;
  const node = (floor.nodes || []).find(n => n.id === id);
  if (node) {
    node.assignedClosetId = closetId;

    // Find the name of the assigned closet across all facility floors
    let targetClosetName = "";
    if (closetId) {
      for (const fl of facilityFloors) {
        const found = (fl.nodes || []).find(n => n.id === closetId);
        if (found) {
          targetClosetName = found.name;
          break;
        }
      }
    }

    // Synchronize underlying BOM item
    if (typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) {
      const match = projectBOM.find(i => (i.instanceId && (i.instanceId === node.instanceId || i.instanceId === node.id || ('dev-' + i.instanceId) === node.id)) || i.model === node.name);
      if (match && targetClosetName) {
        match.closetName = targetClosetName;
        match.rackId = targetClosetName;
        if (typeof PortEngine !== "undefined") {
          PortEngine.autoAssignDeviceToClosetSwitch(match, targetClosetName);
        }
      }
    }
    if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
      FacilityStore.notifyWorkspaceChange();
    }

    recalculateCurrentFloorCables();
    renderCableCanvas();
    renderInspector();
    saveFacilityState();
  }
}

function updateNodeMountMethod(id, method) {
  const floor = getActiveFloor();
  if (!floor) return;
  const node = (floor.nodes || []).find(n => n.id === id);
  if (node) {
    node.mountMethod = method;
    if (typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) {
      const match = projectBOM.find(i => (i.instanceId && (i.instanceId === node.instanceId || i.instanceId === node.id || ('dev-' + i.instanceId) === node.id)) || i.model === node.name);
      if (match) match.mountMethod = method;
    }
    if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
      FacilityStore.notifyWorkspaceChange();
    }
    saveFacilityState();
    renderCableCanvas();
    renderInspector();
    if (typeof showToast === "function") {
      showToast(`Updated mounting for ${node.name} to ${method}`);
    }
  }
}

function updateNodeHostSwitch(nodeId, newSwitchId) {
  const floor = getActiveFloor();
  if (!floor) return;
  const node = (floor.nodes || []).find(n => n.id === nodeId);
  if (!node) return;

  const item = projectBOM.find(i => (i.instanceId && (i.instanceId === node.instanceId || i.instanceId === node.id || ('dev-' + i.instanceId) === node.id)) || i.model === node.name);
  if (!item) return;

  const oldSwitchId = item.uplinkTargetId;

  if (typeof PortEngine !== "undefined") {
    if (oldSwitchId) {
      const oldSw = projectBOM.find(i => i.instanceId === oldSwitchId);
      if (oldSw && item.assignedSwitchPort) {
        PortEngine.disconnectPort(oldSw, item.assignedSwitchPort);
      }
    }
    if (newSwitchId) {
      const newSw = projectBOM.find(i => i.instanceId === newSwitchId);
      if (newSw) {
        PortEngine.allocatePort(newSw, item);
        // Also sync node's closet to match the switch's closet if possible
        const swClosetName = newSw.closetName || newSw.rackId;
        if (swClosetName) {
          const allClosets = getAllClosetsAcrossFacility();
          const targetCloset = allClosets.find(c => c.name === swClosetName || swClosetName.startsWith(c.name));
          if (targetCloset) {
            node.assignedClosetId = targetCloset.id;
          }
          item.closetName = swClosetName;
          item.rackId = swClosetName;
        }
      }
    } else {
      item.uplinkTargetId = null;
      item.assignedSwitchPort = null;
    }
  }

  FacilityStore.notifyWorkspaceChange();
  recalculateCurrentFloorCables();
  renderCableCanvas();
  renderInspector();
  saveFacilityState();
  if (typeof showToast === "function") {
    const sw = newSwitchId ? projectBOM.find(i => i.instanceId === newSwitchId) : null;
    showToast(sw ? `Connected ${item.model} to ${sw.friendlyName || sw.model} Port ${item.assignedSwitchPort || ''}` : `Disconnected ${item.model}`);
  }
}

function updateNodeSwitchPort(nodeId, newPortNumber) {
  const floor = getActiveFloor();
  if (!floor) return;
  const node = (floor.nodes || []).find(n => n.id === nodeId);
  if (!node) return;

  const item = projectBOM.find(i => (i.instanceId && (i.instanceId === node.instanceId || i.instanceId === node.id || ('dev-' + i.instanceId) === node.id)) || i.model === node.name);
  if (!item || !item.uplinkTargetId) return;

  const sw = projectBOM.find(i => i.instanceId === item.uplinkTargetId);
  if (!sw) return;

  const portNum = parseInt(newPortNumber, 10);
  if (typeof PortEngine !== "undefined") {
    PortEngine.connect(sw, portNum, item, 1);
  } else {
    item.assignedSwitchPort = portNum;
  }

  FacilityStore.notifyWorkspaceChange();
  renderInspector();
  saveFacilityState();
  if (typeof showToast === "function") {
    showToast(`Assigned ${item.model} to ${sw.friendlyName || sw.model} Port ${portNum}`);
  }
}

function moveClosetToFloor(closetId, newFloorId) {
  let foundCloset = null;
  facilityFloors.forEach(fl => {
    if (!fl.nodes) fl.nodes = [];
    const idx = fl.nodes.findIndex(n => n.id === closetId);
    if (idx !== -1) {
      foundCloset = fl.nodes.splice(idx, 1)[0];
    }
  });

  if (foundCloset) {
    foundCloset.floorId = newFloorId;
    const destFloor = facilityFloors.find(f => f.id === newFloorId);
    if (destFloor) {
      destFloor.nodes.push(foundCloset);
      if (typeof FacilityStore !== "undefined") {
        const parsed = FacilityStore.parse(foundCloset.name);
        if (parsed.spaceId) {
          FacilityStore.updateSpace(parsed.spaceId, { floorId: newFloorId });
        }
      }
      recalculateCurrentFloorCables();
      renderCableCanvas();
      renderInspector();
      saveFacilityState();
      if (typeof showToast === "function") {
        showToast(`Moved ${foundCloset.name} to ${destFloor.name}`);
      }
    }
  }
}

function deleteNode(id) {
  const floor = getActiveFloor();
  if (floor) {
    floor.nodes = (floor.nodes || []).filter(n => n.id !== id);
  }
  selectedNodeId = null;
  recalculateCurrentFloorCables();
  renderCableCanvas();
  renderInspector();
  renderFloorSelector();
  renderSidebarTabContent();
  saveFacilityState();
}

function deleteDropFromBOM(id) {
  const floor = getActiveFloor();
  const node = floor ? (floor.nodes || []).find(n => n.id === id) : null;
  let instanceId = id;
  if (node) {
    instanceId = node.instanceId || (node.id && node.id.startsWith("dev-") ? node.id.replace("dev-", "") : node.id);
  }

  // Delete from Quote BOM and all dependent subsystems
  if (typeof deleteDeviceFromBOM === "function") {
    deleteDeviceFromBOM(instanceId);
  } else if (typeof removeBomItem === "function") {
    removeBomItem(instanceId);
  }
  // Ensure canvas node is removed
  deleteNode(id);
}

// -----------------------------------------------------------
// SVG Vector Rendering
// -----------------------------------------------------------
function renderCableCanvas() {
  const svg = document.getElementById("cableSvgCanvas");
  if (!svg) return;

  const floor = getActiveFloor();
  if (!floor) {
    svg.innerHTML = `
      <defs>
        <pattern id="cableGrid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(51, 65, 85, 0.15)" stroke-width="1"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#cableGrid)" />
      <g transform="translate(450, 300)" text-anchor="middle" class="cursor-pointer" onclick="promptAddNewFloor()">
        <rect x="-180" y="-80" width="360" height="160" rx="16" fill="#0f172a" stroke="#334155" stroke-dasharray="6,6" stroke-width="2"/>
        <circle cx="0" cy="-20" r="28" fill="#1e293b"/>
        <path d="M -12 -20 L 12 -20 M 0 -32 L 0 -8" stroke="#f59e0b" stroke-width="3" stroke-linecap="round"/>
        <text x="0" y="25" fill="#f8fafc" font-size="16" font-weight="bold" font-family="system-ui, sans-serif">No Floors/Buildings Defined</text>
        <text x="0" y="48" fill="#94a3b8" font-size="12" font-family="system-ui, sans-serif">Click here or "+ Floor/Building" to create your first plan</text>
      </g>
    `;
    return;
  }
  const allClosets = getAllClosetsAcrossFacility();

  svg.innerHTML = `
    <defs>
      <pattern id="cableGrid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(51, 65, 85, 0.15)" stroke-width="1"/>
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#cableGrid)" />

    ${floor.image ? `
      <image id="svgFloorPlanImage" href="${floor.image}" x="0" y="0" width="4500" height="2800" preserveAspectRatio="xMidYMid meet" opacity="${floor.opacity || 0.7}" />
    ` : ''}
  `;

  // 1. Fiber Backbones
  if (physicalLayerFilters.pathways) {
    const sortedFbs = [...(floor.fiberBackbones || [])].sort((a, b) => {
      if (a.id === selectedFiberBackboneId) return 1;
      if (b.id === selectedFiberBackboneId) return -1;
      return 0;
    });
    sortedFbs.forEach(fb => {
      const c1 = floor.nodes.find(n => n.id === fb.fromId);
      const c2 = floor.nodes.find(n => n.id === fb.toId);
      if (!c1 || !c2) return;

      const isSelected = (fb.id === selectedFiberBackboneId);
      const fType = (fb.fiberType || (typeof getProjectFiberType === "function" ? getProjectFiberType() : "mmf")).toLowerCase();
      const isSMF = (fType === "smf");
      const strands = fb.strandCount || 12;
      const strokeColor = isSMF ? "#eab308" : "#06b6d4"; // Gold for SMF, Cyan for MMF
      const textColor = isSMF ? "#fde047" : "#67e8f9";
      const badgeBorder = isSMF ? "#ca8a04" : "#0891b2";
      const typeLabel = isSMF ? "OS2 SMF" : "OM4 MMF";

      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("class", "fiber-backbone-link cursor-pointer group");
      g.setAttribute("data-fiber-id", fb.id);
      g.onclick = (e) => {
        selectFiberBackbone(fb.id, e);
      };

      // Selection Halo / Glow
      if (isSelected) {
        const halo = document.createElementNS("http://www.w3.org/2000/svg", "line");
        halo.setAttribute("x1", c1.x);
        halo.setAttribute("y1", c1.y);
        halo.setAttribute("x2", c2.x);
        halo.setAttribute("y2", c2.y);
        halo.setAttribute("stroke", isSMF ? "#fef08a" : "#a5f3fc");
        halo.setAttribute("stroke-width", "14");
        halo.setAttribute("stroke-linecap", "round");
        halo.setAttribute("opacity", "0.4");
        g.appendChild(halo);
      }

      // Invisible wider hit area for easy clicking
      const hitArea = document.createElementNS("http://www.w3.org/2000/svg", "line");
      hitArea.setAttribute("x1", c1.x);
      hitArea.setAttribute("y1", c1.y);
      hitArea.setAttribute("x2", c2.x);
      hitArea.setAttribute("y2", c2.y);
      hitArea.setAttribute("stroke", "transparent");
      hitArea.setAttribute("stroke-width", "24");
      hitArea.setAttribute("cursor", "pointer");
      g.appendChild(hitArea);

      // Main dashed fiber line
      const path = document.createElementNS("http://www.w3.org/2000/svg", "line");
      path.setAttribute("x1", c1.x);
      path.setAttribute("y1", c1.y);
      path.setAttribute("x2", c2.x);
      path.setAttribute("y2", c2.y);
      path.setAttribute("stroke", strokeColor);
      path.setAttribute("stroke-width", isSelected ? "5" : "4");
      path.setAttribute("stroke-dasharray", "8,4");
      path.setAttribute("stroke-linecap", "round");
      path.setAttribute("opacity", isSelected ? "1.0" : "0.9");
      g.appendChild(path);

      // Midpoint badge
      const midX = (c1.x + c2.x) / 2;
      const midY = (c1.y + c2.y) / 2;

      // Badge background rect
      const labelText = `${strands}F ${typeLabel} • ${fb.totalFt || 100} ft`;
      const badgeWidth = Math.max(140, labelText.length * 7.5 + 44);
      const badgeHeight = 24;

      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("x", midX - (badgeWidth / 2));
      rect.setAttribute("y", midY - 12);
      rect.setAttribute("width", badgeWidth);
      rect.setAttribute("height", badgeHeight);
      rect.setAttribute("rx", "12");
      rect.setAttribute("fill", isSelected ? (isSMF ? "#854d0e" : "#0e7490") : "#090d16");
      rect.setAttribute("stroke", isSelected ? (isSMF ? "#fef08a" : "#67e8f9") : badgeBorder);
      rect.setAttribute("stroke-width", isSelected ? "2" : "1.5");
      rect.setAttribute("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.5))");
      g.appendChild(rect);

      const tag = document.createElementNS("http://www.w3.org/2000/svg", "text");
      tag.setAttribute("x", midX - 9);
      tag.setAttribute("y", midY + 4);
      tag.setAttribute("text-anchor", "middle");
      tag.setAttribute("fill", textColor);
      tag.setAttribute("font-size", "10");
      tag.setAttribute("font-family", "ui-monospace, SFMono-Regular, monospace");
      tag.setAttribute("font-weight", "bold");
      tag.textContent = labelText;
      g.appendChild(tag);

      // On-canvas delete button (circle + ✕) on the right edge of badge
      const delCircleX = midX + (badgeWidth / 2) - 13;
      const delCircleY = midY;
      
      const delG = document.createElementNS("http://www.w3.org/2000/svg", "g");
      delG.setAttribute("class", "cursor-pointer fiber-link-delete-btn fiber-link-badge-delete-circle");
      delG.setAttribute("role", "button");
      delG.setAttribute("data-action", "delete-fiber");
      delG.setAttribute("data-fiber-id", fb.id);
      delG.setAttribute("aria-label", "Delete fiber backbone");
      delG.style.pointerEvents = "all";

      const onDelTrigger = (e) => {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
          if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
        }
        deleteFiberBackbone(fb.id, e);
      };
      delG.onpointerdown = (e) => e.stopPropagation();
      delG.onmousedown = onDelTrigger;
      delG.onclick = onDelTrigger;

      const delCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      delCircle.setAttribute("cx", delCircleX);
      delCircle.setAttribute("cy", delCircleY);
      delCircle.setAttribute("r", "8");
      delCircle.setAttribute("fill", "#be123c");
      delCircle.setAttribute("stroke", "#fda4af");
      delCircle.setAttribute("stroke-width", "1");
      delCircle.style.pointerEvents = "all";
      delG.appendChild(delCircle);

      const delCross = document.createElementNS("http://www.w3.org/2000/svg", "text");
      delCross.setAttribute("x", delCircleX);
      delCross.setAttribute("y", delCircleY + 3.5);
      delCross.setAttribute("text-anchor", "middle");
      delCross.setAttribute("fill", "#ffffff");
      delCross.setAttribute("font-size", "10");
      delCross.setAttribute("font-family", "sans-serif");
      delCross.setAttribute("font-weight", "bold");
      delCross.style.pointerEvents = "none";
      delCross.textContent = "✕";
      delG.appendChild(delCross);

      g.appendChild(delG);

      // When selected, also draw a floating action button above the badge: [ Delete Link ✕ ]
      if (isSelected) {
        const actionG = document.createElementNS("http://www.w3.org/2000/svg", "g");
        actionG.setAttribute("class", "cursor-pointer fiber-link-delete-btn fiber-link-floating-delete-pill");
        actionG.setAttribute("role", "button");
        actionG.setAttribute("data-action", "delete-fiber");
        actionG.setAttribute("data-fiber-id", fb.id);
        actionG.style.pointerEvents = "all";

        const onActionTrigger = (e) => {
          if (e) {
            e.preventDefault();
            e.stopPropagation();
            if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
          }
          deleteFiberBackbone(fb.id, e);
        };
        actionG.onpointerdown = (e) => e.stopPropagation();
        actionG.onmousedown = onActionTrigger;
        actionG.onclick = onActionTrigger;

        const pillW = 114;
        const pillH = 22;
        const pillX = midX - (pillW / 2);
        const pillY = midY - 38;

        const pillRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        pillRect.setAttribute("x", pillX);
        pillRect.setAttribute("y", pillY);
        pillRect.setAttribute("width", pillW);
        pillRect.setAttribute("height", pillH);
        pillRect.setAttribute("rx", "11");
        pillRect.setAttribute("fill", "#be123c");
        pillRect.setAttribute("stroke", "#ffffff");
        pillRect.setAttribute("stroke-width", "1.5");
        pillRect.setAttribute("filter", "drop-shadow(0 4px 6px rgba(0,0,0,0.6))");
        pillRect.style.pointerEvents = "all";
        actionG.appendChild(pillRect);

        const pillText = document.createElementNS("http://www.w3.org/2000/svg", "text");
        pillText.setAttribute("x", midX);
        pillText.setAttribute("y", pillY + 14);
        pillText.setAttribute("text-anchor", "middle");
        pillText.setAttribute("fill", "#ffffff");
        pillText.setAttribute("font-size", "10");
        pillText.setAttribute("font-family", "ui-sans-serif, system-ui, sans-serif");
        pillText.setAttribute("font-weight", "bold");
        pillText.style.pointerEvents = "none";
        pillText.textContent = "🗑 Delete Link ✕";
        actionG.appendChild(pillText);

        g.appendChild(actionG);
      }

      svg.appendChild(g);
    });
  }

  // 2. Horizontal Cable Pathways
  if (physicalLayerFilters.pathways) {
    floor.nodes.filter(n => n.type === "device").forEach(dev => {
      const bomItem = (typeof projectBOM !== "undefined" && dev.instanceId) ? projectBOM.find(i => i.instanceId === dev.instanceId) : null;
      const layerType = getDeviceLayerType(bomItem || dev);
      if (!physicalLayerFilters[layerType]) return;

      let closet = allClosets.find(c => c.id === dev.assignedClosetId);
      if (!closet && allClosets.length > 0) closet = allClosets[0];
      if (!closet) return;

      const run = dev.calculatedRun || { totalFt: 0, points: [{ x: closet.x, y: closet.y }, { x: dev.x, y: dev.y }] };
    const isSelected = dev.id === selectedNodeId || closet.id === selectedNodeId;
    const isCrossFloor = closet.floorId !== floor.id;
    const pts = run.points || [{ x: closet.x, y: closet.y }, { x: dev.x, y: dev.y }];

    for (let i = 0; i < pts.length - 1; i++) {
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("class", "cable-path-line cursor-pointer");
      line.setAttribute("data-drop-id", dev.id);
      line.setAttribute("x1", pts[i].x);
      line.setAttribute("y1", pts[i].y);
      line.setAttribute("x2", pts[i + 1].x);
      line.setAttribute("y2", pts[i + 1].y);
      line.setAttribute("stroke", run.isExceeded ? "#f43f5e" : isCrossFloor ? "#38bdf8" : isSelected ? "#a855f7" : "#f59e0b");
      line.setAttribute("stroke-width", isSelected ? "4" : "2.5");
      line.setAttribute("stroke-dasharray", isCrossFloor ? "4,4" : run.isExceeded ? "6,4" : "none");
      line.setAttribute("opacity", isSelected ? "1.0" : "0.75");
      svg.appendChild(line);
    }

    if (dev.waypoints && dev.waypoints.length > 0) {
      dev.waypoints.forEach((wp, idx) => {
        const wpCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        wpCircle.setAttribute("class", "draggable-waypoint-handle cursor-move");
        wpCircle.setAttribute("data-drop-id", dev.id);
        wpCircle.setAttribute("data-waypoint-idx", idx);
        wpCircle.setAttribute("cx", wp.x);
        wpCircle.setAttribute("cy", wp.y);
        wpCircle.setAttribute("r", 7);
        wpCircle.setAttribute("fill", "#f59e0b");
        wpCircle.setAttribute("stroke", "#ffffff");
        wpCircle.setAttribute("stroke-width", "2");
        svg.appendChild(wpCircle);
      });
    }

    const midIdx = Math.floor(pts.length / 2);
    const midX = (pts[midIdx - 1].x + pts[midIdx].x) / 2;
    const midY = (pts[midIdx - 1].y + pts[midIdx].y) / 2;

    const tag = document.createElementNS("http://www.w3.org/2000/svg", "text");
    tag.setAttribute("x", midX);
    tag.setAttribute("y", midY - 6);
    tag.setAttribute("text-anchor", "middle");
    tag.setAttribute("fill", run.isExceeded ? "#fb7185" : isCrossFloor ? "#7dd3fc" : "#cbd5e1");
    tag.setAttribute("font-size", "10");
    tag.setAttribute("font-family", "monospace");
    tag.setAttribute("font-weight", "bold");
    tag.textContent = `${run.totalFt} ft ${isCrossFloor ? `(Riser)` : ''}`;
    svg.appendChild(tag);
    });
  }

  // 3. Closets & Mounting Hosts (Poles, NEMA Boxes, Cabinets, Racks, Backboards)
  if (physicalLayerFilters.closets) {
    floor.nodes.filter(n => n.type === "closet").forEach(closet => {
      const isSelected = closet.id === selectedNodeId;
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("class", "draggable-canvas-node cursor-pointer");
      g.setAttribute("data-node-id", closet.id);
      g.setAttribute("transform", `translate(${closet.x}, ${closet.y})`);

      let hostType = closet.hostType;
      if (!hostType && typeof FacilityStore !== "undefined") {
        const parsed = FacilityStore.parse(closet.name);
        hostType = parsed.hostType;
      }
      hostType = hostType || "equipment_rack";
      const isFieldSpace = (hostType === "field") || (closet.name && closet.name.endsWith(" • Field"));

      if (isFieldSpace) {
        // 0. Field Space / Unenclosed Area Boundary
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("x", "-24"); rect.setAttribute("y", "-24");
        rect.setAttribute("width", "48"); rect.setAttribute("height", "48");
        rect.setAttribute("rx", "12");
        rect.setAttribute("fill", isSelected ? "#451a03" : "#1c1917");
        rect.setAttribute("stroke", isSelected ? "#fbbf24" : "#f59e0b");
        rect.setAttribute("stroke-width", isSelected ? "3.5" : "2.5");
        rect.setAttribute("stroke-dasharray", "4 3");
        g.appendChild(rect);

        const centerCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        centerCircle.setAttribute("r", "8");
        centerCircle.setAttribute("fill", "#d97706");
        centerCircle.setAttribute("opacity", "0.4");
        g.appendChild(centerCircle);

        const centerDot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        centerDot.setAttribute("r", "3.5");
        centerDot.setAttribute("fill", "#fbbf24");
        g.appendChild(centerDot);

      } else if (hostType === "structural_mount") {
        // 1. Structural Pole Mast (Circular Base with Mast Crosshairs & Radar Boundary)
        const outerCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        outerCircle.setAttribute("r", isSelected ? "32" : "28");
        outerCircle.setAttribute("fill", "none");
        outerCircle.setAttribute("stroke", isSelected ? "#38bdf8" : "#0284c7");
        outerCircle.setAttribute("stroke-width", "1.5");
        outerCircle.setAttribute("stroke-dasharray", "4 2");
        g.appendChild(outerCircle);

        const mastCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        mastCircle.setAttribute("r", "20");
        mastCircle.setAttribute("fill", isSelected ? "#0c4a6e" : "#082f49");
        mastCircle.setAttribute("stroke", isSelected ? "#38bdf8" : "#0284c7");
        mastCircle.setAttribute("stroke-width", isSelected ? "3.5" : "2.5");
        g.appendChild(mastCircle);

        const lineH = document.createElementNS("http://www.w3.org/2000/svg", "line");
        lineH.setAttribute("x1", "-12"); lineH.setAttribute("y1", "0");
        lineH.setAttribute("x2", "12"); lineH.setAttribute("y2", "0");
        lineH.setAttribute("stroke", "#38bdf8"); lineH.setAttribute("stroke-width", "1.5");
        g.appendChild(lineH);

        const lineV = document.createElementNS("http://www.w3.org/2000/svg", "line");
        lineV.setAttribute("x1", "0"); lineV.setAttribute("y1", "-12");
        lineV.setAttribute("x2", "0"); lineV.setAttribute("y2", "12");
        lineV.setAttribute("stroke", "#38bdf8"); lineV.setAttribute("stroke-width", "1.5");
        g.appendChild(lineV);

        const centerDot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        centerDot.setAttribute("r", "3.5");
        centerDot.setAttribute("fill", "#38bdf8");
        g.appendChild(centerDot);

      } else if (hostType === "industrial_din") {
        // 2. Weatherproof DIN / NEMA Box (Industrial Enclosure with Dual Rails)
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("x", "-24"); rect.setAttribute("y", "-24");
        rect.setAttribute("width", "48"); rect.setAttribute("height", "48");
        rect.setAttribute("rx", "8");
        rect.setAttribute("fill", isSelected ? "#78350f" : "#451a03");
        rect.setAttribute("stroke", isSelected ? "#fbbf24" : "#d97706");
        rect.setAttribute("stroke-width", isSelected ? "3.5" : "2.5");
        g.appendChild(rect);

        const r1 = document.createElementNS("http://www.w3.org/2000/svg", "line");
        r1.setAttribute("x1", "-16"); r1.setAttribute("y1", "-8");
        r1.setAttribute("x2", "16"); r1.setAttribute("y2", "-8");
        r1.setAttribute("stroke", "#fbbf24"); r1.setAttribute("stroke-width", "2.5");
        g.appendChild(r1);

        const r2 = document.createElementNS("http://www.w3.org/2000/svg", "line");
        r2.setAttribute("x1", "-16"); r2.setAttribute("y1", "8");
        r2.setAttribute("x2", "16"); r2.setAttribute("y2", "8");
        r2.setAttribute("stroke", "#fbbf24"); r2.setAttribute("stroke-width", "2.5");
        g.appendChild(r2);

      } else if (hostType === "security_cabinet") {
        // 3. Security Cabinet (Trove Subplate Bay Grid)
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("x", "-24"); rect.setAttribute("y", "-24");
        rect.setAttribute("width", "48"); rect.setAttribute("height", "48");
        rect.setAttribute("rx", "8");
        rect.setAttribute("fill", isSelected ? "#064e3b" : "#022c22");
        rect.setAttribute("stroke", isSelected ? "#34d399" : "#059669");
        rect.setAttribute("stroke-width", isSelected ? "3.5" : "2.5");
        g.appendChild(rect);

        [[-16, -16], [2, -16], [-16, 2], [2, 2]].forEach(([bx, by]) => {
          const bay = document.createElementNS("http://www.w3.org/2000/svg", "rect");
          bay.setAttribute("x", bx); bay.setAttribute("y", by);
          bay.setAttribute("width", "14"); bay.setAttribute("height", "14");
          bay.setAttribute("rx", "2");
          bay.setAttribute("fill", "#047857");
          bay.setAttribute("opacity", "0.7");
          g.appendChild(bay);
        });

      } else if (hostType === "architectural_backboard") {
        // 4. Architectural Backboard (Plywood Wallfield)
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("x", "-26"); rect.setAttribute("y", "-20");
        rect.setAttribute("width", "52"); rect.setAttribute("height", "40");
        rect.setAttribute("rx", "4");
        rect.setAttribute("fill", isSelected ? "#581c87" : "#3b0764");
        rect.setAttribute("stroke", isSelected ? "#d8b4fe" : "#a855f7");
        rect.setAttribute("stroke-width", isSelected ? "3.5" : "2.5");
        g.appendChild(rect);

        [-6, 6].forEach(py => {
          const pb = document.createElementNS("http://www.w3.org/2000/svg", "line");
          pb.setAttribute("x1", "-18"); pb.setAttribute("y1", py);
          pb.setAttribute("x2", "18"); pb.setAttribute("y2", py);
          pb.setAttribute("stroke", "#e9d5ff");
          pb.setAttribute("stroke-width", "1.5");
          pb.setAttribute("stroke-dasharray", "4 2");
          g.appendChild(pb);
        });

      } else {
        // 5. Standard 19" EIA Rack Chassis
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("x", "-22"); rect.setAttribute("y", "-26");
        rect.setAttribute("width", "44"); rect.setAttribute("height", "52");
        rect.setAttribute("rx", "6");
        rect.setAttribute("fill", isSelected ? "#312e81" : "#1e1b4b");
        rect.setAttribute("stroke", isSelected ? "#a5b4fc" : "#6366f1");
        rect.setAttribute("stroke-width", isSelected ? "3.5" : "2.5");
        g.appendChild(rect);

        [-16, -7, 2, 11].forEach(ry => {
          const ru = document.createElementNS("http://www.w3.org/2000/svg", "rect");
          ru.setAttribute("x", "-15"); ru.setAttribute("y", ry);
          ru.setAttribute("width", "30"); ru.setAttribute("height", "5");
          ru.setAttribute("rx", "1");
          ru.setAttribute("fill", "#4338ca");
          ru.setAttribute("opacity", "0.8");
          g.appendChild(ru);
        });
      }

      // Host Type Badge
      const typeLabel = isFieldSpace ? "FIELD" : (hostType === "structural_mount" ? "POLE" : (hostType === "industrial_din" ? "NEMA" : (hostType === "security_cabinet" ? "SEC-CAB" : (hostType === "architectural_backboard" ? "BOARD" : "RACK"))));
      const badgeColor = isFieldSpace ? "#fbbf24" : (hostType === "structural_mount" ? "#38bdf8" : (hostType === "industrial_din" ? "#fbbf24" : (hostType === "security_cabinet" ? "#34d399" : (hostType === "architectural_backboard" ? "#d8b4fe" : "#a5b4fc"))));

      const badgeTxt = document.createElementNS("http://www.w3.org/2000/svg", "text");
      badgeTxt.setAttribute("x", 0);
      badgeTxt.setAttribute("y", -30);
      badgeTxt.setAttribute("text-anchor", "middle");
      badgeTxt.setAttribute("fill", badgeColor);
      badgeTxt.setAttribute("font-size", "9");
      badgeTxt.setAttribute("font-weight", "bold");
      badgeTxt.setAttribute("font-family", "monospace");
      badgeTxt.textContent = `[${typeLabel}]`;
      g.appendChild(badgeTxt);

      // Label with clean styling
      const txt = document.createElementNS("http://www.w3.org/2000/svg", "text");
      txt.setAttribute("x", 0);
      txt.setAttribute("y", 38);
      txt.setAttribute("text-anchor", "middle");
      txt.setAttribute("fill", "#ffffff");
      txt.setAttribute("font-size", "11");
      txt.setAttribute("font-weight", "bold");
      txt.textContent = closet.name;
      g.appendChild(txt);

      svg.appendChild(g);
    });
  }

  // 4. Drops
  floor.nodes.filter(n => n.type === "device").forEach(dev => {
    const bomItem = (typeof projectBOM !== "undefined" && dev.instanceId) ? projectBOM.find(i => i.instanceId === dev.instanceId) : null;
    const layerType = getDeviceLayerType(bomItem || dev);
    if (!physicalLayerFilters[layerType]) return;

    const isSelected = dev.id === selectedNodeId;
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", "draggable-canvas-node cursor-pointer");
    g.setAttribute("data-node-id", dev.id);
    g.setAttribute("transform", `translate(${dev.x}, ${dev.y})`);

    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("r", isSelected ? 15 : 12);
    circle.setAttribute("fill", isSelected ? "#047857" : "#064e3b");
    circle.setAttribute("stroke", isSelected ? "#34d399" : "#10b981");
    circle.setAttribute("stroke-width", isSelected ? "3.5" : "2");
    g.appendChild(circle);

    const devNum = (bomItem && bomItem.deviceNumber) || dev.deviceNumber;
    if (devNum) {
      const numTag = document.createElementNS("http://www.w3.org/2000/svg", "text");
      numTag.setAttribute("x", 0);
      numTag.setAttribute("y", -18);
      numTag.setAttribute("text-anchor", "middle");
      numTag.setAttribute("fill", "#34d399");
      numTag.setAttribute("font-size", "9");
      numTag.setAttribute("font-weight", "bold");
      numTag.setAttribute("font-family", "monospace");
      numTag.textContent = `[${devNum}]`;
      g.appendChild(numTag);
    }

    const txt = document.createElementNS("http://www.w3.org/2000/svg", "text");
    txt.setAttribute("x", 0);
    txt.setAttribute("y", 22);
    txt.setAttribute("text-anchor", "middle");
    txt.setAttribute("fill", "#cbd5e1");
    txt.setAttribute("font-size", "10");
    txt.setAttribute("font-family", "monospace");
    txt.textContent = dev.name;
    g.appendChild(txt);

    svg.appendChild(g);
  });
}

// -----------------------------------------------------------
// BOM Commit with Per-Closet Allocation & Fiber Backbone Sizing
// -----------------------------------------------------------
function commitCablingToBOM(options = {}) {
  let grossFootage = 0;
  let totalDrops = 0;
  const dropsByCloset = {}; // key: closetName -> { name, drops, footage, closetId }

  facilityFloors.forEach(fl => {
    (fl.nodes || []).filter(n => n.type === "device").forEach(dev => {
      totalDrops++;
      const runFt = (dev.calculatedRun && dev.calculatedRun.totalFt) ? dev.calculatedRun.totalFt : 0;
      grossFootage += runFt;

      const closetName = dev.assignedCloset || (dev.calculatedRun && dev.calculatedRun.closetName) || "MDF • Rack-1";
      const normalizedCloset = (typeof FacilityStore !== "undefined") ? FacilityStore.normalize(closetName) : closetName;
      if (!dropsByCloset[normalizedCloset]) {
        dropsByCloset[normalizedCloset] = { name: normalizedCloset, drops: 0, footage: 0, closetId: dev.assignedClosetId || dev.closetId };
      }
      dropsByCloset[normalizedCloset].drops++;
      dropsByCloset[normalizedCloset].footage += runFt;
    });
  });

  const orderedFootage = Math.ceil(grossFootage * 1.15); // 15% slack & waste buffer
  const spoolCount = Math.max(1, Math.ceil(orderedFootage / 1000));

  const selectedCable = (typeof CABLING_CATALOG !== "undefined" && CABLING_CATALOG.bulkCable?.find(c => c.sku === activeCableSku)) || {
    sku: activeCableSku,
    name: "Cat6A Plenum F/UTP Solid Bulk Cable (1,000 ft Spool Box)",
    vendor: "Superior Essex",
    msrp: 410
  };

  const defaultJack = (typeof CABLING_CATALOG !== "undefined" && CABLING_CATALOG.connectors?.[0]) || {
    sku: "C6A-KEY-SLD-24",
    name: "Cat6A Shielded Keystone Jacks (Pack of 24)",
    vendor: "Panduit",
    msrp: 145
  };

  const defaultPanel24 = (typeof CABLING_CATALOG !== "undefined" && CABLING_CATALOG.patchPanels?.[0]) || {
    sku: "PP-1U-24P-MOD",
    name: "1U 24-Port Modular Keystone Patch Panel",
    vendor: "Panduit",
    msrp: 68
  };

  const defaultPanel48 = (typeof CABLING_CATALOG !== "undefined" && CABLING_CATALOG.patchPanels?.[1]) || {
    sku: "PP-2U-48P-MOD",
    name: "2U 48-Port Modular Keystone Patch Panel",
    vendor: "Panduit",
    msrp: 115
  };

  const defaultCord1ft = (typeof CABLING_CATALOG !== "undefined" && CABLING_CATALOG.patchCords?.find(c => c.lengthFt === 1)) || {
    sku: "C6A-SLIM-1FT-BL",
    name: "Cat6A Slim 28AWG 1-Foot Patch Cords",
    vendor: "Panduit",
    msrp: 7.50,
    lengthFt: 1,
    lengthMeters: 0.3
  };

  const defaultCord7ft = (typeof CABLING_CATALOG !== "undefined" && CABLING_CATALOG.patchCords?.find(c => c.lengthFt === 7)) || {
    sku: "C6A-SLIM-7FT-BL",
    name: "Cat6A Slim 28AWG 7-Foot Patch Cords (Field Device)",
    vendor: "Panduit",
    msrp: 11.00,
    lengthFt: 7,
    lengthMeters: 2.1
  };

  if (typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) {
    // Preserve existing mounted patch panel slots per closet so re-generated panels keep their rack positions
    const existingMountedPanelsByCloset = {};
    projectBOM.forEach(i => {
      if ((i.role === "Structured Cabling" || i.category === "cabling") && (i.model || '').includes("Patch Panel") && i.rackSlot) {
        const c = (typeof FacilityStore !== "undefined") ? FacilityStore.normalize(i.closetName || i.rackId) : (i.closetName || i.rackId);
        if (!existingMountedPanelsByCloset[c]) existingMountedPanelsByCloset[c] = [];
        existingMountedPanelsByCloset[c].push(i.rackSlot);
      }
    });

    // 1. Remove previously committed structured cabling items in-place
    for (let i = projectBOM.length - 1; i >= 0; i--) {
      if (projectBOM[i].role === "Structured Cabling" || projectBOM[i].source === "cabling_sync") {
        projectBOM.splice(i, 1);
      }
    }

    // Determine primary closet for bulk spools
    const closetKeys = Object.keys(dropsByCloset);
    const primaryCloset = closetKeys.find(k => k.toLowerCase().includes("mdf")) || closetKeys[0] || "MDF • Rack-1";

    // 2. Add Bulk Cable Spools (Allocated to primary MDF or bulk pool)
    projectBOM.push({
      instanceId: `spool-${Date.now()}`,
      id: selectedCable.sku,
      model: `${selectedCable.name} (${spoolCount}x 1,000' Spools for ${grossFootage.toLocaleString()} ft run)`,
      sku: selectedCable.sku,
      role: "Structured Cabling",
      vendor: selectedCable.vendor,
      msrp: selectedCable.msrp,
      poeBudget: 0,
      baseWatts: 0,
      qty: spoolCount,
      closetName: primaryCloset,
      rackId: primaryCloset,
      rackSlot: null,
      source: "cabling_sync"
    });

    // 3. For each telecom closet with drops, allocate dedicated patch panels, keystone packs, and patch cords
    Object.values(dropsByCloset).forEach((cd, idx) => {
      const closetDropsCount = cd.drops;
      if (closetDropsCount === 0) return;

      const p48 = Math.floor(closetDropsCount / 48);
      const rem = closetDropsCount % 48;
      const p24 = rem > 0 ? (rem <= 24 ? 1 : 2) : (closetDropsCount === 0 ? 0 : 0);
      const keystonePacks = Math.ceil(closetDropsCount / 24);

      if (p48 > 0) {
        projectBOM.push({
          instanceId: `pp48-${cd.name.replace(/\W+/g, '_')}-${Date.now()}-${idx}`,
          id: defaultPanel48.sku,
          model: defaultPanel48.name,
          sku: defaultPanel48.sku,
          role: "Structured Cabling",
          vendor: defaultPanel48.vendor,
          msrp: defaultPanel48.msrp,
          poeBudget: 0,
          baseWatts: 0,
          rackUnits: 2,
          qty: p48,
          closetName: cd.name,
          rackId: cd.name,
          rackSlot: (existingMountedPanelsByCloset[cd.name]?.length > 0) ? existingMountedPanelsByCloset[cd.name].shift() : null,
          source: "cabling_sync"
        });
      }

      if (p24 > 0 || (p48 === 0 && closetDropsCount > 0)) {
        const qty24 = p24 > 0 ? p24 : 1;
        projectBOM.push({
          instanceId: `pp24-${cd.name.replace(/\W+/g, '_')}-${Date.now()}-${idx}`,
          id: defaultPanel24.sku,
          model: defaultPanel24.name,
          sku: defaultPanel24.sku,
          role: "Structured Cabling",
          vendor: defaultPanel24.vendor,
          msrp: defaultPanel24.msrp,
          poeBudget: 0,
          baseWatts: 0,
          rackUnits: 1,
          qty: qty24,
          closetName: cd.name,
          rackId: cd.name,
          rackSlot: (existingMountedPanelsByCloset[cd.name]?.length > 0) ? existingMountedPanelsByCloset[cd.name].shift() : null,
          source: "cabling_sync"
        });
      }

      // Keystone packs for this closet
      projectBOM.push({
        instanceId: `jacks-${cd.name.replace(/\W+/g, '_')}-${Date.now()}-${idx}`,
        id: defaultJack.sku,
        model: defaultJack.name,
        sku: defaultJack.sku,
        role: "Structured Cabling",
        vendor: defaultJack.vendor,
        msrp: defaultJack.msrp,
        poeBudget: 0,
        baseWatts: 0,
        qty: keystonePacks,
        closetName: cd.name,
        rackId: cd.name,
        rackSlot: null,
        source: "cabling_sync"
      });

      // Dynamic switch-to-panel patch cord calculation based on U-separation in this closet
      let closetPatchCord = defaultCord1ft;
      let closetUDiff = 1;
      const normLoc = (typeof FacilityStore !== "undefined") ? FacilityStore.normalize(cd.name) : cd.name;
      const closetSwitches = projectBOM.filter(i => 
        (typeof isNetworkSwitchItem === "function" ? isNetworkSwitchItem(i) : (i.role === "Access" || (i.model || '').includes("Switch"))) &&
        ((typeof FacilityStore !== "undefined" ? FacilityStore.normalize(i.closetName || i.rackId) : (i.closetName || i.rackId)) === normLoc) &&
        (typeof parseRackU === "function" ? parseRackU(i.rackSlot) !== null : i.rackSlot)
      );
      const closetPanels = projectBOM.filter(i => 
        (i.role === "Structured Cabling" || i.category === "cabling") && 
        (i.model || '').includes("Patch Panel") && 
        ((typeof FacilityStore !== "undefined" ? FacilityStore.normalize(i.closetName || i.rackId) : (i.closetName || i.rackId)) === normLoc) &&
        (typeof parseRackU === "function" ? parseRackU(i.rackSlot) !== null : i.rackSlot)
      );

      if (closetSwitches.length > 0 && closetPanels.length > 0 && typeof getPatchCordLengthForUDiff === "function" && typeof findPatchCordItem === "function") {
        const uDiffs = [];
        closetSwitches.forEach(sw => {
          const swU = parseRackU(sw.rackSlot);
          if (swU !== null) {
            let minD = 999;
            closetPanels.forEach(pp => {
              const ppU = parseRackU(pp.rackSlot);
              if (ppU !== null) {
                const dist = Math.abs(swU - ppU);
                if (dist < minD) minD = dist;
              }
            });
            if (minD < 999) uDiffs.push(minD);
          }
        });
        if (uDiffs.length > 0) {
          closetUDiff = Math.round(uDiffs.reduce((a, b) => a + b, 0) / uDiffs.length);
          const cordSpec = getPatchCordLengthForUDiff(closetUDiff);
          const matched = findPatchCordItem(cordSpec.lengthFt, "Panduit");
          if (matched) {
            closetPatchCord = {
              sku: matched.sku,
              name: `${matched.name} (${closetUDiff}U Separation)`,
              vendor: matched.vendor || "Panduit",
              msrp: matched.msrp,
              lengthFt: cordSpec.lengthFt,
              lengthMeters: cordSpec.lengthMeters
            };
          }
        }
      }

      // Patch cords for this closet (dynamic switch-to-panel + 7ft field end)
      projectBOM.push({
        instanceId: `patch1ft-${cd.name.replace(/\W+/g, '_')}-${Date.now()}-${idx}`,
        id: closetPatchCord.sku,
        model: closetPatchCord.name,
        sku: closetPatchCord.sku,
        role: "Structured Cabling",
        vendor: closetPatchCord.vendor,
        msrp: closetPatchCord.msrp,
        poeBudget: 0,
        baseWatts: 0,
        qty: closetDropsCount,
        closetName: cd.name,
        rackId: cd.name,
        rackSlot: null,
        source: "cabling_sync",
        lengthFt: closetPatchCord.lengthFt || 1,
        lengthMeters: closetPatchCord.lengthMeters || 0.3,
        uDiff: closetUDiff
      });

      projectBOM.push({
        instanceId: `patch7ft-${cd.name.replace(/\W+/g, '_')}-${Date.now()}-${idx}`,
        id: defaultCord7ft.sku,
        model: defaultCord7ft.name,
        sku: defaultCord7ft.sku,
        role: "Structured Cabling",
        vendor: defaultCord7ft.vendor,
        msrp: defaultCord7ft.msrp,
        poeBudget: 0,
        baseWatts: 0,
        qty: closetDropsCount,
        closetName: cd.name,
        rackId: cd.name,
        rackSlot: null,
        source: "cabling_sync"
      });
    });

    // 4. Fiber Trunks between closets
    facilityFloors.forEach(fl => {
      (fl.fiberBackbones || []).forEach(fb => {
        const fType = (fb.fiberType || (typeof getProjectFiberType === "function" ? getProjectFiberType() : "mmf")).toLowerCase();
        const strands = parseInt(fb.strandCount) || 12;
        const catalogList = (typeof CABLING_CATALOG !== "undefined" && CABLING_CATALOG.fiberBackbone) ? CABLING_CATALOG.fiberBackbone : [];
        const trunkItem = catalogList.find(i => i.medium === fType && i.strands === strands) ||
          catalogList.find(i => i.medium === fType) ||
          catalogList[0] || {
            sku: fType === "smf" ? "FIBER-OS2-12STRAND" : "FIBER-OM4-12STRAND",
            name: `${strands}-Strand ${fType === "smf" ? "OS2 Single-Mode" : "OM4 Multi-Mode"} Armored Pre-Term LC Fiber Trunk Assembly`,
            msrpPerFt: fType === "smf" ? 2.60 : 2.45,
            baseTerminationMsrp: 280
          };

        const trunkPrice = Math.round((fb.totalFt * trunkItem.msrpPerFt) + trunkItem.baseTerminationMsrp);
        const fromName = fb.fromClosetName || "MDF";
        const toName = fb.toClosetName || "IDF-1";
        const ratingLabel = (fb.rating || "plenum").toUpperCase();

        projectBOM.push({
          instanceId: `trunk-${fb.id || Date.now()}`,
          id: trunkItem.sku,
          model: `${trunkItem.name} (${fromName} to ${toName}, ${fb.totalFt} ft, ${ratingLabel})`,
          sku: trunkItem.sku,
          role: "Structured Cabling",
          vendor: "Corning / Panduit",
          msrp: trunkPrice,
          poeBudget: 0,
          baseWatts: 0,
          qty: 1,
          closetName: fromName,
          rackId: fromName,
          rackSlot: null,
          source: "cabling_sync"
        });
      });
    });
  }

  if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
    FacilityStore.notifyWorkspaceChange();
  }
  if (typeof renderBOM === "function") renderBOM();
  if (typeof updateBOMBadge === "function") updateBOMBadge();
  if (typeof StorageService !== "undefined" && typeof StorageService.queueAutoSave === "function") {
    StorageService.queueAutoSave();
  }
  if (options && options.userInitiated) {
    if (typeof showToast === "function") {
      showToast(`Committed structured cabling (${totalDrops} drops, ${spoolCount} spools, per-closet panels & patch cords) to Quote BOM!`);
    }
  }
}

// -----------------------------------------------------------
// Canvas Intelligence, Auto-Fit & Viewport Centering
// -----------------------------------------------------------
function fitPhysicalLayoutToScreen() {
  const viewport = document.getElementById("cableCanvasViewport");
  const floor = getActiveFloor();
  if (!viewport || !floor) return;

  const nodes = floor.nodes || [];
  if (nodes.length === 0) {
    currentCanvasZoom = 1.0;
    applyCanvasZoom();
    viewport.scrollTo({ left: 0, top: 0, behavior: "smooth" });
    return;
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  nodes.forEach(n => {
    const w = n.type === "closet" ? 180 : 50;
    const h = n.type === "closet" ? 100 : 50;
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + w);
    maxY = Math.max(maxY, n.y + h);

    if (n.waypoints && Array.isArray(n.waypoints)) {
      n.waypoints.forEach(wp => {
        minX = Math.min(minX, wp.x);
        minY = Math.min(minY, wp.y);
        maxX = Math.max(maxX, wp.x);
        maxY = Math.max(maxY, wp.y);
      });
    }
  });

  // Check if background floor plan image exists
  const imgEl = document.getElementById("canvasFloorPlanImage");
  if (imgEl) {
    const iw = parseFloat(imgEl.getAttribute("width")) || 0;
    const ih = parseFloat(imgEl.getAttribute("height")) || 0;
    if (iw > 0 && ih > 0) {
      minX = Math.min(minX, 0);
      minY = Math.min(minY, 0);
      maxX = Math.max(maxX, iw);
      maxY = Math.max(maxY, ih);
    }
  }

  if (minX === Infinity) {
    minX = 0; minY = 0; maxX = 1200; maxY = 800;
  }

  const availW = Math.max(300, viewport.clientWidth - 80);
  const availH = Math.max(300, viewport.clientHeight - 80);
  const contentW = Math.max(100, maxX - minX + 120);
  const contentH = Math.max(100, maxY - minY + 120);

  const scaleW = availW / contentW;
  const scaleH = availH / contentH;
  const optimalZoom = Math.max(0.35, Math.min(1.25, Math.min(scaleW, scaleH)));

  currentCanvasZoom = Math.round(optimalZoom * 100) / 100;
  applyCanvasZoom();

  const centerX = (minX + (contentW / 2)) * currentCanvasZoom;
  const centerY = (minY + (contentH / 2)) * currentCanvasZoom;

  viewport.scrollTo({
    left: Math.max(0, centerX - (viewport.clientWidth / 2)),
    top: Math.max(0, centerY - (viewport.clientHeight / 2)),
    behavior: "smooth"
  });
}

function centerPhysNodeInViewport(nodeId) {
  const viewport = document.getElementById("cableCanvasViewport");
  const floor = getActiveFloor();
  if (!viewport || !floor) return;

  const node = (floor.nodes || []).find(n => n.id === nodeId);
  if (!node) return;

  const nodeCenterX = (node.x + (node.type === "closet" ? 90 : 25)) * currentCanvasZoom;
  const nodeCenterY = (node.y + (node.type === "closet" ? 50 : 25)) * currentCanvasZoom;

  viewport.scrollTo({
    left: Math.max(0, nodeCenterX - (viewport.clientWidth / 2)),
    top: Math.max(0, nodeCenterY - (viewport.clientHeight / 2)),
    behavior: "smooth"
  });
}

// -----------------------------------------------------------
// Searchable Quick Navigator (Matches Topology Canvas UX)
// -----------------------------------------------------------
function getPhysSearchItems() {
  const items = [];
  
  // 1. Closets / Racks
  facilityFloors.forEach(f => {
    (f.nodes || []).filter(n => n.type === "closet" && n.hostType !== "field" && !(n.name && n.name.endsWith(" • Field"))).forEach(c => {
      items.push({
        id: c.id,
        floorId: f.id,
        name: c.name,
        badge: `${f.name} • Enclosure`,
        category: "Racks & Closets",
        icon: "🏢",
        searchText: `${c.name} ${f.name} rack enclosure closet cabinet`.toLowerCase()
      });
    });
  });

  // 2. Placed Drops
  facilityFloors.forEach(f => {
    (f.nodes || []).filter(n => n.type === "device").forEach(d => {
      const isCam = (d.name || '').toLowerCase().includes('cam') || (d.mountMethod || '').toLowerCase().includes('camera');
      const isDoor = (d.name || '').toLowerCase().includes('door') || (d.name || '').toLowerCase().includes('portal') || (d.name || '').toLowerCase().includes('card');
      const icon = isCam ? "📹" : (isDoor ? "🔐" : "🔌");
      items.push({
        id: d.id,
        floorId: f.id,
        name: d.name,
        badge: `${f.name} • Drop`,
        category: "Placed Drops",
        icon,
        searchText: `${d.name} ${f.name} drop camera door sensor`.toLowerCase()
      });
    });
  });

  // 3. Unplaced Field BOM Hardware
  const placedIds = new Set();
  facilityFloors.forEach(f => (f.nodes || []).forEach(n => {
    if (n.instanceId) placedIds.add(n.instanceId);
    if (n.id) placedIds.add(n.id);
  }));

  if (typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) {
    projectBOM.filter(i => isFieldDeviceForPhysicalLayout(i) && !placedIds.has(i.instanceId)).forEach(item => {
      items.push({
        id: item.instanceId,
        isUnplaced: true,
        name: item.model,
        badge: "Quote BOM • Unplaced",
        category: "Unplaced Devices",
        icon: "📦",
        searchText: `${item.model} ${item.role || ''} ${item.category || ''} unplaced quote`.toLowerCase()
      });
    });
  }

  return items;
}

function filterPhysCanvasSearch(query) {
  const container = document.getElementById("physQuickSearchResults");
  if (!container) return;

  const q = (query || "").trim().toLowerCase();
  if (!q) {
    container.classList.add("hidden");
    return;
  }

  const allItems = getPhysSearchItems();
  const filtered = allItems.filter(i => i.searchText.includes(q));

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="px-3 py-3 text-center text-xs text-slate-500 font-mono">
        No devices or racks matching "${escapeHTML(q)}"
      </div>
    `;
    container.classList.remove("hidden");
    return;
  }

  // Group by category
  const categories = {};
  filtered.forEach(item => {
    if (!categories[item.category]) categories[item.category] = [];
    categories[item.category].push(item);
  });

  let html = "";
  Object.keys(categories).forEach(cat => {
    html += `
      <div class="px-2 pt-1.5 pb-0.5 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center justify-between border-t border-slate-800/60 first:border-t-0">
        <span>${escapeHTML(cat)}</span>
        <span class="text-slate-500">${categories[cat].length}</span>
      </div>
    `;

    categories[cat].forEach(item => {
      html += `
        <button
          type="button"
          onclick="selectAndCenterPhysNode('${item.id}', '${item.floorId || ''}', ${item.isUnplaced ? 'true' : 'false'})"
          class="w-full text-left px-2 py-1.5 rounded-lg flex items-center justify-between gap-2 text-xs transition-colors hover:bg-slate-850 hover:text-white text-slate-200 group cursor-pointer"
        >
          <div class="flex items-center gap-2 min-w-0">
            <span class="text-sm shrink-0">${item.icon}</span>
            <div class="truncate">
              <div class="font-medium truncate group-hover:text-amber-300 transition-colors">${escapeHTML(item.name)}</div>
              <div class="text-[10px] text-slate-400 font-mono truncate">${escapeHTML(item.badge)}</div>
            </div>
          </div>
          <i data-lucide="arrow-right" class="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"></i>
        </button>
      `;
    });
  });

  container.innerHTML = html;
  container.classList.remove("hidden");
  if (typeof safeCreateIcons === "function") {
    safeCreateIcons(container);
  } else if (window.lucide) {
    lucide.createIcons();
  }
}

function selectAndCenterPhysNode(nodeId, floorId = null, isUnplaced = false) {
  const container = document.getElementById("physQuickSearchResults");
  const input = document.getElementById("physCanvasSearchInput");
  if (container) container.classList.add("hidden");
  if (input) input.value = "";

  if (isUnplaced) {
    switchSidebarTab("unplaced");
    return;
  }

  if (floorId && floorId !== activeFloorId && typeof switchActiveFloor === "function") {
    switchActiveFloor(floorId);
  }

  setTimeout(() => {
    selectNode(nodeId);
    centerPhysNodeInViewport(nodeId);
  }, 40);
}

// -----------------------------------------------------------
// Deep Linking & Navigation Launcher
// -----------------------------------------------------------
function jumpToPhysicalLayoutTarget(targetVal) {
  // 1. Capture navigation history before switching views
  if (typeof NavigationHistory !== "undefined") {
    const st = NavigationHistory.captureCurrentState();
    if (st && st.tool !== "physical") NavigationHistory.push(st);
  }

  // 2. Close other open modals
  const topoModal = document.getElementById("topologyModal");
  if (topoModal && !topoModal.classList.contains("hidden")) {
    if (typeof toggleTopologyModal === "function") toggleTopologyModal();
  }
  const facModal = document.getElementById("facilityModal");
  if (facModal && !facModal.classList.contains("hidden")) {
    if (typeof toggleFacilityModal === "function") toggleFacilityModal();
  }
  if (typeof toggleBomDrawer === "function") {
    const drawer = document.getElementById("bomDrawer");
    if (drawer && !drawer.classList.contains("translate-x-full")) {
      toggleBomDrawer();
    }
  }

  // 3. Open physical layout modal if hidden
  const modal = document.getElementById("cableLayoutModal");
  if (modal && modal.classList.contains("hidden")) {
    toggleCableLayoutModal();
  }

  // 4. Resolve target floor and enclosure node
  if (targetVal) {
    setTimeout(() => {
      let targetLoc = null;
      let targetDevice = null;
      if (typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) {
        const item = projectBOM.find(i => i.instanceId === targetVal);
        if (item) {
          targetDevice = item;
          targetLoc = item.closetName || item.rackId;
        }
      }
      if (!targetLoc && typeof targetVal === "string") {
        targetLoc = targetVal;
      }
      if (targetLoc && typeof FacilityStore !== "undefined") {
        const parsed = FacilityStore.parse(targetLoc);
        if (parsed.floorId && typeof switchActiveFloor === "function") {
          switchActiveFloor(parsed.floorId);
        }
        // Highlight closet or drop node on active floor
        const currentFloor = typeof getActiveFloor === "function" ? getActiveFloor() : null;
        if (currentFloor && Array.isArray(currentFloor.nodes)) {
          const match = currentFloor.nodes.find(n => 
            n.name.toLowerCase().includes((parsed.space || '').toLowerCase()) || 
            (targetDevice && (n.instanceId === targetDevice.instanceId || n.name.toLowerCase().includes(targetDevice.model.toLowerCase())))
          );
          if (match) {
            selectedNodeId = match.id;
            recalculateCurrentFloorCables();
            renderCableCanvas();
            renderInspector();
            centerPhysNodeInViewport(match.id);
          }
        }
      }
    }, 100);
  }
}

// Window Compatibility Exports
if (typeof window !== "undefined") {
  window.toggleCableLayoutModal = toggleCableLayoutModal;
  window.jumpToPhysicalLayoutTarget = jumpToPhysicalLayoutTarget;
  window.deepLinkToRackElevation = deepLinkToRackElevation;
  window.switchActiveFloor = switchActiveFloor;
  window.promptAddNewFloor = promptAddNewFloor;
  window.promptRenameActiveFloor = promptRenameActiveFloor;
  window.promptDeleteActiveFloor = promptDeleteActiveFloor;
  window.deleteFloorLevel = promptDeleteActiveFloor;
  window.initCableCanvas = initCableCanvas;
  window.renderCableCanvas = renderCableCanvas;
  window.updateNodeMountMethod = updateNodeMountMethod;
  window.updateNodeHostSwitch = updateNodeHostSwitch;
  window.updateNodeSwitchPort = updateNodeSwitchPort;
  window.deselectNode = deselectNode;
  window.fitPhysicalLayoutToScreen = fitPhysicalLayoutToScreen;
  window.centerPhysNodeInViewport = centerPhysNodeInViewport;
  window.filterPhysCanvasSearch = filterPhysCanvasSearch;
  window.selectAndCenterPhysNode = selectAndCenterPhysNode;
  window.isFieldDeviceForPhysicalLayout = isFieldDeviceForPhysicalLayout;
  window.findNextAvailableGridSpot = findNextAvailableGridSpot;
  window.getUnplacedDevicesForFloor = getUnplacedDevicesForFloor;
  window.placeAllUnplacedOnActiveFloor = placeAllUnplacedOnActiveFloor;
  window.placeBomItemOnFloor = placeBomItemOnFloor;
  window.syncBOMDevicesToFloors = syncBOMDevicesToFloors;
  window.clearPhysicalLayoutDrops = clearPhysicalLayoutDrops;
  window.removePhysicalLayoutDropByInstanceId = removePhysicalLayoutDropByInstanceId;
  window.commitCablingToBOM = commitCablingToBOM;
  window.syncCablingToBOM = commitCablingToBOM;
  window.togglePhysicalInspector = togglePhysicalInspector;
  window.togglePhysicalLayerMenu = togglePhysicalLayerMenu;
  window.setPhysicalLayerFilter = setPhysicalLayerFilter;
  window.toggleAllPhysicalLayers = toggleAllPhysicalLayers;
  window.updatePhysicalLayerCountBadge = updatePhysicalLayerCountBadge;
  window.getDeviceLayerType = getDeviceLayerType;
  window.getAllClosetsAcrossFacility = getAllClosetsAcrossFacility;
  window.selectFiberBackbone = selectFiberBackbone;
  window.deselectFiberBackbone = deselectFiberBackbone;
  window.updateFiberBackbone = updateFiberBackbone;
  window.deleteFiberBackbone = deleteFiberBackbone;
  window.manualAutoLinkTopology = manualAutoLinkTopology;
  window.deleteNode = deleteNode;
  window.deleteDropFromBOM = deleteDropFromBOM;
  window.isClosetMatch = isClosetMatch;
  window.getInterClosetConnections = getInterClosetConnections;
}