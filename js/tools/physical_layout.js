// =========================================================================
// PHYSICAL LAYOUT CANVAS ENGINE (v0.5.3 - FacilityStore & Dispatcher Aligned)
// =========================================================================

let activeCableTool = "select"; // "select" | "device" | "mdf" | "fiber"
let selectedNodeId = null;
let activeSidebarTab = "runs";  // "runs" | "unplaced"

let activeCableSku = "C6A-CMP-1K-BL";
let useOrthogonalRouting = false;
let currentCanvasZoom = 1.0;
let isModalFullscreen = false;

let activeFloorId = "floor-1";
let facilityFloors = [
  {
    id: "floor-1",
    name: "Level 1 - Main Floor",
    levelIndex: 1,
    image: null,
    opacity: 0.7,
    scaleFt: 25,
    slackFt: 15,
    slabFt: 14,
    nodes: [],
    fiberBackbones: []
  }
];

let fiberFirstClosetId = null;

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
  let floor = facilityFloors.find(f => f.id === activeFloorId);
  if (!floor) {
    if (facilityFloors.length === 0) {
      facilityFloors.push({
        id: "floor-1",
        name: "Level 1 - Main Floor",
        levelIndex: 1,
        image: null,
        opacity: 0.7,
        scaleFt: 25,
        slackFt: 15,
        slabFt: 14,
        nodes: [],
        fiberBackbones: []
      });
    }
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
    renderFloorSelector();
    syncFloorControlInputs();
    recalculateCurrentFloorCables();
    renderCableCanvas();
    renderInspector();
    renderSidebarTabContent();
    if (window.lucide) lucide.createIcons();
  } else {
    modal.classList.add("hidden");
    isDraggingPhysNode = false;
    isDraggingPhysWaypoint = false;
    draggedPhysNode = null;
    draggedPhysWaypoint = null;
  }
}

// -----------------------------------------------------------
// Project-Scoped Persistence
// -----------------------------------------------------------
function saveFacilityState() {
  try {
    const projId = FacilityStore.getProjectId();
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
    const projId = FacilityStore.getProjectId();
    const raw = localStorage.getItem(`netselect_facility_${projId}`);
    if (!raw) {
      facilityFloors = [
        {
          id: "floor-1",
          name: "Level 1 - Main Floor",
          levelIndex: 1,
          image: null,
          opacity: 0.7,
          scaleFt: 25,
          slackFt: 15,
          slabFt: 14,
          nodes: [],
          fiberBackbones: []
        }
      ];
      activeFloorId = "floor-1";
      return;
    }
    const data = JSON.parse(raw);
    if (Array.isArray(data.facilityFloors) && data.facilityFloors.length > 0) {
      facilityFloors = data.facilityFloors;
    }
    if (data.activeFloorId) activeFloorId = data.activeFloorId;
    if (data.activeCableSku) activeCableSku = data.activeCableSku;
    if (typeof data.useOrthogonalRouting === "boolean") useOrthogonalRouting = data.useOrthogonalRouting;
  } catch (e) {}
}

// -----------------------------------------------------------
// Canvas Interaction & Reliable Drag Engine
// -----------------------------------------------------------
function initCableCanvas() {
  const svg = document.getElementById("cableSvgCanvas");
  if (!svg || svg.dataset.initialized === "true") return;

  svg.dataset.initialized = "true";
  svg.addEventListener("mousedown", handlePhysMouseDown);
  window.addEventListener("mousemove", handlePhysMouseMove);
  window.addEventListener("mouseup", handlePhysMouseUp);
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
          floor.fiberBackbones.push({
            id: `fiber-${Date.now()}`,
            fromId: fiberFirstClosetId,
            toId: closetNode.id,
            waypoints: []
          });
          fiberFirstClosetId = null;
          recalculateCurrentFloorCables();
          renderCableCanvas();
          saveFacilityState();
          if (typeof showToast === "function") {
            showToast("Fiber Backbone linked.");
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

  // 6. Click & Drag Node (Drop or Closet)
  const nodeEl = e.target.closest(".draggable-canvas-node");
  if (nodeEl) {
    const nodeId = nodeEl.getAttribute("data-node-id");
    const node = floor.nodes.find(n => n.id === nodeId);
    if (node) {
      selectedNodeId = nodeId;
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

  // Click empty canvas -> deselect
  selectedNodeId = null;
  renderInspector();
  renderCableCanvas();
}

function handlePhysMouseMove(e) {
  if (!isPhysCanvasVisible()) return;
  if (!isDraggingPhysWaypoint && !isDraggingPhysNode) return;
  const pos = getCanvasCoordinates(e);

  if (isDraggingPhysWaypoint && draggedPhysWaypoint) {
    draggedPhysWaypoint.x = Math.max(20, pos.x - physDragOffset.x);
    draggedPhysWaypoint.y = Math.max(20, pos.y - physDragOffset.y);
    recalculateCurrentFloorCables();
    renderCableCanvas();
    return;
  }

  if (isDraggingPhysNode && draggedPhysNode) {
    draggedPhysNode.x = Math.max(30, pos.x - physDragOffset.x);
    draggedPhysNode.y = Math.max(30, pos.y - physDragOffset.y);
    recalculateCurrentFloorCables();
    renderCableCanvas();
  }
}

function handlePhysMouseUp() {
  if (isDraggingPhysWaypoint || isDraggingPhysNode) {
    isDraggingPhysWaypoint = false;
    draggedPhysWaypoint = null;
    isDraggingPhysNode = false;
    draggedPhysNode = null;
    saveFacilityState();
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

  sel.innerHTML = facilityFloors.map(f => {
    const drops = f.nodes.filter(n => n.type === 'device').length;
    const closets = f.nodes.filter(n => n.type === 'closet').length;
    return `<option value="${f.id}" ${f.id === activeFloorId ? 'selected' : ''}>${f.name} (${closets} Racks, ${drops} Drops)</option>`;
  }).join('');
}

function switchActiveFloor(floorId) {
  activeFloorId = floorId;
  selectedNodeId = null;
  syncFloorControlInputs();
  recalculateCurrentFloorCables();
  renderCableCanvas();
  renderInspector();
  renderSidebarTabContent();
  saveFacilityState();
}

function promptAddNewFloor() {
  const nextNum = facilityFloors.length + 1;
  const name = prompt(`Enter Level / Floor Name:`, `Level ${nextNum}`);
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
  renderFloorSelector();
  switchActiveFloor(newFloor.id);
  if (typeof showToast === "function") {
    showToast(`Created ${newFloor.name}`);
  }
}

function syncFloorControlInputs() {
  const floor = getActiveFloor();
  const scaleInput = document.getElementById("cableScaleFt");
  const slackInput = document.getElementById("cableSlackFt");
  const slabInput = document.getElementById("cableSlabFt");
  const cableSelect = document.getElementById("cableTypeSelector");

  if (scaleInput) scaleInput.value = floor.scaleFt || 25;
  if (slackInput) slackInput.value = floor.slackFt || 15;
  if (slabInput) slabInput.value = floor.slabFt || 14;
  if (cableSelect) cableSelect.value = activeCableSku;
}

async function handleUniversalPlanUpload(event) {
  const file = event.target?.files?.[0];
  if (!file) return;

  const floor = getActiveFloor();

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

  // 2. Synchronize active locations with accurate floors
  const activeLocations = FacilityStore.getLocations(false); // excludes Unassigned
  const validLocMap = new Map();
  activeLocations.forEach(loc => validLocMap.set(loc.name, loc));

  // A. Purge stale closet nodes across all floors
  const allCurrentClosets = getAllClosetsAcrossFacility();
  const validRemainingCloset = allCurrentClosets.find(c => validLocMap.has(c.name));

  facilityFloors.forEach(fl => {
    fl.nodes = fl.nodes.filter(n => {
      if (n.type === "closet" && !validLocMap.has(n.name)) {
        // Re-route devices on this closet to a valid remaining closet
        if (validRemainingCloset) {
          fl.nodes.filter(d => d.type === "device" && d.assignedClosetId === n.id).forEach(d => {
            d.assignedClosetId = validRemainingCloset.id;
          });
        }
        return false;
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
}

function getAllClosetsAcrossFacility() {
  const closets = [];
  facilityFloors.forEach(f => {
    f.nodes.filter(n => n.type === "closet").forEach(c => {
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

  if (scaleInput) floor.scaleFt = parseFloat(scaleInput.value) || 25;
  if (slackInput) floor.slackFt = parseFloat(slackInput.value) || 15;
  if (slabInput) floor.slabFt = parseFloat(slabInput.value) || 14;

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
        const pxDist = Math.hypot(c2.x - c1.x, c2.y - c1.y);
        fb.totalFt = Math.round(pxDist * fPxToFt) + (fSlack * 2);
      }
    });
  });

  const spoolBoxes = Math.ceil(globalFootage / 1000);
  const footageEl = document.getElementById("cableTotalFootage");
  const spoolEl = document.getElementById("cableSpoolCount");
  const countActiveEl = document.getElementById("countActiveDrops");

  if (footageEl) footageEl.innerText = `${globalFootage.toLocaleString()} ft`;
  if (spoolEl) spoolEl.innerText = `${spoolBoxes} Box${spoolBoxes === 1 ? '' : 'es'}`;
  if (countActiveEl) countActiveEl.innerText = floor.nodes.filter(n => n.type === 'device').length;

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

function renderSidebarTabContent() {
  const container = document.getElementById("sidebarTabContent");
  if (!container) return;

  const floor = getActiveFloor();

  if (activeSidebarTab === "runs") {
    const drops = floor.nodes.filter(n => n.type === "device");
    if (drops.length === 0) {
      container.innerHTML = `<div class="py-12 text-center text-slate-500 text-xs"><p>No drops placed on this level.</p></div>`;
      return;
    }

    container.innerHTML = drops.map(dev => {
      const run = dev.calculatedRun || { totalFt: 0, closetName: 'Unassigned', isExceeded: false };
      return `
        <div onclick="selectNode('${dev.id}')" class="bg-slate-950 p-2.5 rounded-xl border ${dev.id === selectedNodeId ? 'border-brand-500 bg-brand-500/10' : run.isExceeded ? 'border-rose-500/60 bg-rose-950/20' : 'border-slate-800'} text-xs space-y-1 cursor-pointer hover:border-slate-700 transition-all">
          <div class="flex items-center justify-between">
            <span class="font-bold text-white">${dev.name}</span>
            <span class="font-mono font-bold ${run.isExceeded ? 'text-rose-400' : 'text-amber-300'}">
              ${run.totalFt} ft (${run.totalMeters}m)
            </span>
          </div>
          <div class="flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>To: ${run.closetName}</span>
            <span>${(dev.waypoints || []).length} Bends</span>
          </div>
        </div>
      `;
    }).join("");
  } else {
    // Unplaced devices: any hardware in quote not currently placed on canvas or marked unassigned
    const placedInstanceIds = new Set();
    facilityFloors.forEach(fl => {
      (fl.nodes || []).forEach(n => {
        if (n.instanceId) placedInstanceIds.add(n.instanceId);
        if (n.id && n.id.startsWith("dev-")) placedInstanceIds.add(n.id.replace("dev-", ""));
        if (n.id) placedInstanceIds.add(n.id);
      });
    });

    const unplacedBOM = (typeof projectBOM !== "undefined" ? projectBOM : []).filter(item => {
      if (item.parentInstanceId) return false;
      if (item.role === "Structured Cabling" || item.role === "Mgmt License" || item.role === "Security License" || item.role === "Feature License") return false;

      const rawLoc = item.closetName || item.rackId;
      const isUnassigned = FacilityStore.normalize(rawLoc) === FacilityStore.UNASSIGNED;
      const isPlaced = placedInstanceIds.has(item.instanceId);

      return isUnassigned || !isPlaced;
    });

    const countUnplacedEl = document.getElementById("countUnplacedDevices");
    if (countUnplacedEl) countUnplacedEl.innerText = unplacedBOM.length;

    if (unplacedBOM.length === 0) {
      container.innerHTML = `<div class="py-8 text-center text-slate-500 text-xs"><p>No unplaced field hardware or unassigned items in quote.</p></div>`;
      return;
    }

    container.innerHTML = unplacedBOM.map(item => {
      const rawLoc = item.closetName || item.rackId;
      const isUnassigned = FacilityStore.normalize(rawLoc) === FacilityStore.UNASSIGNED;
      const mount = (item.mountMethod || "wall").toUpperCase();

      return `
        <div class="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs space-y-1 hover:border-slate-700 transition-colors">
          <div class="min-w-0 pr-2">
            <span class="font-bold text-white block truncate max-w-[160px]" title="${escapeHTML(item.model)}">${escapeHTML(item.model)}</span>
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

function placeBomItemOnFloor(instanceId) {
  const item = projectBOM.find(i => i.instanceId === instanceId);
  if (!item) return;

  const floor = getActiveFloor();
  const allClosets = getAllClosetsAcrossFacility();

  // Find matching closet on this floor if item already has a location assigned
  let matchingCloset = null;
  if (item.closetName && item.closetName !== FacilityStore.UNASSIGNED) {
    matchingCloset = allClosets.find(c => c.name === item.closetName && c.floorId === floor.id);
    if (!matchingCloset) {
      matchingCloset = allClosets.find(c => c.name === item.closetName);
    }
  }
  if (!matchingCloset) {
    matchingCloset = allClosets.find(c => c.floorId === floor.id) || allClosets[0] || null;
  }

  const newDrop = {
    id: `dev-${item.instanceId}`,
    instanceId: item.instanceId,
    name: item.model,
    type: "device",
    floorId: floor.id,
    x: 350 + (Math.random() * 150),
    y: 350 + (Math.random() * 150),
    assignedClosetId: matchingCloset ? matchingCloset.id : null,
    mountMethod: item.mountMethod || "wall",
    waypoints: []
  };

  floor.nodes.push(newDrop);
  selectedNodeId = newDrop.id;

  // If item was unassigned, assign it to the matching closet's location
  if ((!item.closetName || item.closetName === FacilityStore.UNASSIGNED) && matchingCloset) {
    item.closetName = matchingCloset.name;
    item.rackId = matchingCloset.name;
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
  renderInspector();
  renderCableCanvas();
  renderSidebarTabContent();
}

function deselectNode() {
  selectedNodeId = null;
  renderInspector();
  renderCableCanvas();
}

function renderInspector() {
  const container = document.getElementById("inspectorContent");
  if (!container) return;

  if (!selectedNodeId) {
    container.innerHTML = `<span class="text-slate-500 text-[11px] block text-center py-2">Select a drop or closet to view properties or rack contents.</span>`;
    return;
  }

  const floor = getActiveFloor();
  const node = floor.nodes.find(n => n.id === selectedNodeId);
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
          <label class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Assigned Floor / Level:</label>
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
              const stackSpan = (parseInt(it.rackUnits, 10) || 1) * (isStack ? it.stackedUnits : (parseInt(it.qty, 10) || 1));
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
    container.innerHTML = `
      <div class="space-y-2.5">
        <div>
          <label class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Device Label:</label>
          <input type="text" value="${node.name}" onchange="updateNodeName('${node.id}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-brand-500 font-semibold" />
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
          <button 
            type="button" 
            onclick="const cl = allClosets.find(c => c.id === '${node.assignedClosetId}'); if (cl) jumpToFacilitySpace(cl.name);"
            class="flex-1 min-w-[65px] py-1 bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-700/60 rounded text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
            title="Open Space in Facility Manager"
          >
            <i data-lucide="building-2" class="w-3 h-3 text-cyan-400"></i> Space
          </button>
        </div>

        <div class="flex items-center justify-between gap-2 pt-1 border-t border-slate-800">
          <button onclick="clearNodeWaypoints('${node.id}')" class="px-2 py-1 bg-slate-800 text-slate-300 hover:text-white rounded border border-slate-700 text-[10px]">
            Reset Bends
          </button>
          <button onclick="deleteNode('${node.id}')" class="px-2.5 py-1 bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-800/60 rounded-lg text-xs font-semibold flex items-center gap-1">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Delete
          </button>
        </div>
      </div>
    `;
  }

  if (window.lucide) lucide.createIcons();
}

function clearNodeWaypoints(id) {
  const floor = getActiveFloor();
  const node = floor.nodes.find(n => n.id === id);
  if (node) {
    node.waypoints = [];
    recalculateCurrentFloorCables();
    renderCableCanvas();
    renderInspector();
    saveFacilityState();
  }
}

function deepLinkToRackElevation(closetName) {
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
  const node = floor.nodes.find(n => n.id === id);
  if (node && val && val.trim()) {
    const oldName = node.name;
    const newName = val.trim();
    node.name = newName;
    if (node.type === "closet" && typeof FacilityStore !== "undefined") {
      FacilityStore.renameLocation(oldName, newName);
    }
    recalculateCurrentFloorCables();
    renderCableCanvas();
    renderFloorSelector();
    saveFacilityState();
  }
}

function updateNodeCloset(id, closetId) {
  const floor = getActiveFloor();
  const node = floor.nodes.find(n => n.id === id);
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
  const node = floor.nodes.find(n => n.id === id);
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

function moveClosetToFloor(closetId, newFloorId) {
  let foundCloset = null;
  facilityFloors.forEach(fl => {
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
  floor.nodes = floor.nodes.filter(n => n.id !== id);
  selectedNodeId = null;
  recalculateCurrentFloorCables();
  renderCableCanvas();
  renderInspector();
  renderFloorSelector();
  renderSidebarTabContent();
  saveFacilityState();
}

// -----------------------------------------------------------
// SVG Vector Rendering
// -----------------------------------------------------------
function renderCableCanvas() {
  const svg = document.getElementById("cableSvgCanvas");
  if (!svg) return;

  const floor = getActiveFloor();
  const allClosets = getAllClosetsAcrossFacility();

  svg.innerHTML = `
    <defs>
      <pattern id="cableGrid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(51, 65, 85, 0.15)" stroke-width="1"/>
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#cableGrid)" />

    ${floor.image ? `
      <image id="svgFloorPlanImage" href="${floor.image}" x="0" y="0" width="2800" height="2000" preserveAspectRatio="xMidYMid meet" opacity="${floor.opacity || 0.7}" />
    ` : ''}
  `;

  // 1. Fiber Backbones
  (floor.fiberBackbones || []).forEach(fb => {
    const c1 = floor.nodes.find(n => n.id === fb.fromId);
    const c2 = floor.nodes.find(n => n.id === fb.toId);
    if (!c1 || !c2) return;

    const path = document.createElementNS("http://www.w3.org/2000/svg", "line");
    path.setAttribute("x1", c1.x);
    path.setAttribute("y1", c1.y);
    path.setAttribute("x2", c2.x);
    path.setAttribute("y2", c2.y);
    path.setAttribute("stroke", "#06b6d4");
    path.setAttribute("stroke-width", "4");
    path.setAttribute("stroke-dasharray", "8,4");
    path.setAttribute("opacity", "0.9");
    svg.appendChild(path);

    const midX = (c1.x + c2.x) / 2;
    const midY = (c1.y + c2.y) / 2;
    const tag = document.createElementNS("http://www.w3.org/2000/svg", "text");
    tag.setAttribute("x", midX);
    tag.setAttribute("y", midY - 8);
    tag.setAttribute("text-anchor", "middle");
    tag.setAttribute("fill", "#67e8f9");
    tag.setAttribute("font-size", "11");
    tag.setAttribute("font-family", "monospace");
    tag.setAttribute("font-weight", "bold");
    tag.textContent = `Fiber Backbone: ${fb.totalFt || 100} ft`;
    svg.appendChild(tag);
  });

  // 2. Horizontal Cable Pathways
  floor.nodes.filter(n => n.type === "device").forEach(dev => {
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

  // 3. Closets & Mounting Hosts (Poles, NEMA Boxes, Cabinets, Racks, Backboards)
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

  // 4. Drops
  floor.nodes.filter(n => n.type === "device").forEach(dev => {
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
// BOM Commit with Fiber Backbone Sizing
// -----------------------------------------------------------
function commitCablingToBOM() {
  let grossFootage = 0;
  let totalDrops = 0;

  facilityFloors.forEach(fl => {
    fl.nodes.filter(n => n.type === "device").forEach(dev => {
      totalDrops++;
      if (dev.calculatedRun) grossFootage += dev.calculatedRun.totalFt;
    });
  });

  const orderedFootage = Math.ceil(grossFootage * 1.1);
  const spoolCount = Math.max(1, Math.ceil(orderedFootage / 1000));
  const patchPanelCount = Math.max(1, Math.ceil(totalDrops / 24));

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

  const defaultPanel = (typeof CABLING_CATALOG !== "undefined" && CABLING_CATALOG.patchPanels?.[0]) || {
    sku: "PP-1U-24P-MOD",
    name: "1U 24-Port Modular Keystone Patch Panel",
    vendor: "Panduit",
    msrp: 68
  };

  const defaultCord = (typeof CABLING_CATALOG !== "undefined" && CABLING_CATALOG.patchCords?.[0]) || {
    sku: "C6A-SLIM-1FT-BL",
    name: "Cat6A Slim 28AWG 1-Foot Patch Cords",
    vendor: "Panduit",
    msrp: 7.50
  };

  if (typeof projectBOM !== "undefined") {
    projectBOM = projectBOM.filter(i => i.role !== "Structured Cabling");

    projectBOM.push({
      instanceId: `spool-${Date.now()}`,
      id: selectedCable.sku,
      model: selectedCable.name,
      sku: selectedCable.sku,
      role: "Structured Cabling",
      vendor: selectedCable.vendor,
      msrp: selectedCable.msrp,
      poeBudget: 0,
      baseWatts: 0,
      qty: spoolCount,
      closetName: "MDF • Rack-1",
      rackId: "MDF • Rack-1",
      rackSlot: null
    });

    projectBOM.push({
      instanceId: `jacks-${Date.now()}`,
      id: defaultJack.sku,
      model: defaultJack.name,
      sku: defaultJack.sku,
      role: "Structured Cabling",
      vendor: defaultJack.vendor,
      msrp: defaultJack.msrp,
      poeBudget: 0,
      baseWatts: 0,
      qty: patchPanelCount,
      closetName: "MDF • Rack-1",
      rackId: "MDF • Rack-1",
      rackSlot: null
    });

    projectBOM.push({
      instanceId: `pp-${Date.now()}`,
      id: defaultPanel.sku,
      model: defaultPanel.name,
      sku: defaultPanel.sku,
      role: "Structured Cabling",
      vendor: defaultPanel.vendor,
      msrp: defaultPanel.msrp,
      poeBudget: 0,
      baseWatts: 0,
      rackUnits: 1,
      qty: patchPanelCount,
      closetName: "MDF • Rack-1",
      rackId: "MDF • Rack-1",
      rackSlot: null
    });

    projectBOM.push({
      instanceId: `patch-${Date.now()}`,
      id: defaultCord.sku,
      model: defaultCord.name,
      sku: defaultCord.sku,
      role: "Structured Cabling",
      vendor: defaultCord.vendor,
      msrp: defaultCord.msrp,
      poeBudget: 0,
      baseWatts: 0,
      qty: totalDrops * 2,
      closetName: "MDF • Rack-1",
      rackId: "MDF • Rack-1",
      rackSlot: null
    });

    facilityFloors.forEach(fl => {
      (fl.fiberBackbones || []).forEach(fb => {
        const trunkItem = (typeof CABLING_CATALOG !== "undefined" && CABLING_CATALOG.fiberBackbone?.[0]) || {
          sku: "FIBER-OM4-6STRAND",
          name: "6-Strand OM4 Armored Pre-Term Fiber Trunk",
          msrpPerFt: 1.85,
          baseTerminationMsrp: 180
        };

        const trunkPrice = Math.round((fb.totalFt * trunkItem.msrpPerFt) + trunkItem.baseTerminationMsrp);

        projectBOM.push({
          instanceId: `trunk-${fb.id}`,
          id: trunkItem.sku,
          model: `${trunkItem.name} (${fb.totalFt} ft)`,
          sku: trunkItem.sku,
          role: "Structured Cabling",
          vendor: "Corning",
          msrp: trunkPrice,
          poeBudget: 0,
          baseWatts: 0,
          qty: 1,
          closetName: "MDF • Rack-1",
          rackId: "MDF • Rack-1",
          rackSlot: null
        });
      });
    });
  }

  FacilityStore.notifyWorkspaceChange();
  if (typeof showToast === "function") {
    showToast(`Committed structured cabling and fiber trunks to Quote BOM!`);
  }
  toggleCableLayoutModal();
}

// -----------------------------------------------------------
// Deep Linking & Navigation Launcher
// -----------------------------------------------------------
function jumpToPhysicalLayoutTarget(targetVal) {
  // 1. Close BOM drawer if open so full blueprint canvas is visible
  if (typeof toggleBomDrawer === "function") {
    const drawer = document.getElementById("bomDrawer");
    if (drawer && !drawer.classList.contains("translate-x-full")) {
      toggleBomDrawer();
    }
  }

  // 2. Open physical layout modal if hidden
  const modal = document.getElementById("cableLayoutModal");
  if (modal && modal.classList.contains("hidden")) {
    toggleCableLayoutModal();
  }

  // 3. Resolve target floor and enclosure node
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
            (targetDevice && n.name.toLowerCase().includes(targetDevice.model.toLowerCase()))
          );
          if (match) {
            selectedNodeId = match.id;
            recalculateCurrentFloorCables();
            renderCableCanvas();
            renderInspector();
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
  window.initCableCanvas = initCableCanvas;
  window.renderCableCanvas = renderCableCanvas;
  window.updateNodeMountMethod = updateNodeMountMethod;
}