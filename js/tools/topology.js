// =========================================================================
// LOGICAL SYSTEMS & NETWORK TOPOLOGY ENGINE (NetSelect Enterprise)
// L2/L3 Wire-Speed Transport, Dual-Plane Logical Services & Power Sizing
// Smooth Bézier Vector Links, Auto-Negotiated Speeds & Slide-Out Inspector
// =========================================================================

let isCanvasDragging = false;
let draggedTopologyNode = null;
let topoDragOffset = { x: 0, y: 0 };
let dragStartPos = { x: 0, y: 0 };
let isViewportPanning = false;
let panStart = { x: 0, y: 0, scrollLeft: 0, scrollTop: 0 };
let topologyLinks = [];

// Canvas Viewport & Selection State
let topologyZoomLevel = 1.0;
let activeTopologyViewPlane = "all"; // "all" | "backbone" | "power" | "vms" | "access"
let selectedTopologyNodeId = null;
let selectedTopologyRackLoc = null;
let selectedTopologyLinkId = null;
let isTopologyInspectorVisible = true;
let showTopologyFieldDevices = typeof localStorage !== "undefined" ? (localStorage.getItem("netselect_topology_show_field") === "true") : true;
let topologyGroupingMode = typeof localStorage !== "undefined" ? (localStorage.getItem("netselect_topology_grouping_mode") || "floor") : "floor";

// Project Fiber Specification & Link Interconnect Overrides
let projectDefaultFiberType = "mmf"; // "mmf" | "smf"
let linkInterconnectOverrides = {}; // linkId -> { medium, dacLength, fiberType }

// =========================================================================
// GRANULAR TOPOLOGY UNDO / REDO HISTORY STACK (Ctrl+Z / Ctrl+Y)
// =========================================================================
const TopologyHistory = {
  _undoStack: [],
  _redoStack: [],
  _maxSteps: 40,

  captureSnapshot(label = "Topology Edit") {
    const positions = typeof loadTopologyPositions === "function" ? loadTopologyPositions() : {};
    const overrides = linkInterconnectOverrides ? JSON.parse(JSON.stringify(linkInterconnectOverrides)) : {};
    const bomNodes = (typeof projectBOM !== "undefined" && Array.isArray(projectBOM))
      ? projectBOM.filter(i => !i.parentInstanceId).map(i => ({
          instanceId: i.instanceId,
          closetName: i.closetName,
          rackId: i.rackId,
          spaceName: i.spaceName,
          uplinkTargetId: i.uplinkTargetId || null,
          customUplinkTargetId: i.customUplinkTargetId || null,
          customLinkMultiplier: i.customLinkMultiplier || 1,
          customLinkSpeed: i.customLinkSpeed || null,
          assignedSwitchPort: i.assignedSwitchPort || null,
          powerSourceOverride: i.powerSourceOverride || null,
          assignedVmsServerId: i.assignedVmsServerId || null,
          assignedAccessServerId: i.assignedAccessServerId || null,
          isUplinkForSwitch: !!i.isUplinkForSwitch,
          unassignedByUser: !!i.unassignedByUser,
          stackedUnits: i.stackedUnits || 0,
          qty: i.qty || 1,
          hostedRoles: Array.isArray(i.hostedRoles) ? [...i.hostedRoles] : undefined
        }))
      : [];
    return {
      label,
      positions: JSON.parse(JSON.stringify(positions || {})),
      overrides,
      bomNodes
    };
  },

  pushState(label = "Topology Edit") {
    this._undoStack.push(this.captureSnapshot(label));
    if (this._undoStack.length > this._maxSteps) {
      this._undoStack.shift();
    }
    this._redoStack = [];
    this.updateToolbarButtons();
  },

  popSilent() {
    if (this._undoStack.length > 0) {
      this._undoStack.pop();
      this.updateToolbarButtons();
    }
  },

  applySnapshot(snap) {
    if (!snap) return;
    const projKey = (typeof FacilityStore !== "undefined" && typeof FacilityStore.getProjectId === "function")
      ? FacilityStore.getProjectId()
      : "default";
    try {
      localStorage.setItem(`netselect_topo_pos_${projKey}`, JSON.stringify(snap.positions || {}));
    } catch (e) {}

    linkInterconnectOverrides = JSON.parse(JSON.stringify(snap.overrides || {}));
    try {
      localStorage.setItem(`netselect_link_overrides_${projKey}`, JSON.stringify(linkInterconnectOverrides));
    } catch (e) {}

    if (typeof projectBOM !== "undefined" && Array.isArray(projectBOM) && Array.isArray(snap.bomNodes)) {
      snap.bomNodes.forEach(saved => {
        const item = projectBOM.find(i => i.instanceId === saved.instanceId);
        if (!item) return;
        item.closetName = saved.closetName;
        item.rackId = saved.rackId;
        if (saved.spaceName !== undefined) item.spaceName = saved.spaceName;
        item.uplinkTargetId = saved.uplinkTargetId;
        item.customUplinkTargetId = saved.customUplinkTargetId;
        item.customLinkMultiplier = saved.customLinkMultiplier;
        item.customLinkSpeed = saved.customLinkSpeed;
        item.assignedSwitchPort = saved.assignedSwitchPort;
        item.powerSourceOverride = saved.powerSourceOverride;
        item.assignedVmsServerId = saved.assignedVmsServerId;
        item.assignedAccessServerId = saved.assignedAccessServerId;
        item.isUplinkForSwitch = saved.isUplinkForSwitch;
        if (saved.unassignedByUser) item.unassignedByUser = true;
        else delete item.unassignedByUser;
        item.stackedUnits = saved.stackedUnits;
        item.qty = saved.qty;
        if (saved.hostedRoles !== undefined) item.hostedRoles = [...saved.hostedRoles];
      });
    }

    if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
      FacilityStore.notifyWorkspaceChange();
    }
    if (typeof renderTopology === "function") renderTopology();
    if (typeof renderTopologyInspector === "function") renderTopologyInspector();
    this.updateToolbarButtons();
  },

  undo() {
    if (this._undoStack.length === 0) return;
    const current = this.captureSnapshot("Current");
    const prev = this._undoStack.pop();
    this._redoStack.push({ ...current, label: prev.label });
    this.applySnapshot(prev);
    if (typeof showToast === "function") {
      showToast(`Undid: ${prev.label}`);
    }
  },

  redo() {
    if (this._redoStack.length === 0) return;
    const current = this.captureSnapshot("Current");
    const next = this._redoStack.pop();
    this._undoStack.push({ ...current, label: next.label });
    this.applySnapshot(next);
    if (typeof showToast === "function") {
      showToast(`Redid: ${next.label}`);
    }
  },

  updateToolbarButtons() {
    const undoBtn = document.getElementById("btnTopoUndo");
    const redoBtn = document.getElementById("btnTopoRedo");
    if (undoBtn) {
      undoBtn.disabled = this._undoStack.length === 0;
      const topLabel = this._undoStack.length > 0 ? this._undoStack[this._undoStack.length - 1].label : "";
      undoBtn.title = topLabel ? `Undo: ${topLabel} (Ctrl+Z)` : "Undo Topology Action (Ctrl+Z)";
    }
    if (redoBtn) {
      redoBtn.disabled = this._redoStack.length === 0;
      const topLabel = this._redoStack.length > 0 ? this._redoStack[this._redoStack.length - 1].label : "";
      redoBtn.title = topLabel ? `Redo: ${topLabel} (Ctrl+Y)` : "Redo Topology Action (Ctrl+Y)";
    }
  }
};
window.TopologyHistory = TopologyHistory;

function getProjectFiberType() {
  if (projectDefaultFiberType) return projectDefaultFiberType;
  const projKey = (typeof FacilityStore !== "undefined" && typeof FacilityStore.getProjectId === "function") 
    ? FacilityStore.getProjectId() 
    : "default";
  try {
    const saved = localStorage.getItem(`netselect_fiber_type_${projKey}`);
    if (saved === "smf" || saved === "mmf") {
      projectDefaultFiberType = saved;
      return saved;
    }
  } catch (e) {}
  return "mmf";
}

function setProjectFiberType(type, skipConfirm = false, silentLoad = false) {
  const targetFiber = (type === "smf") ? "smf" : "mmf";
  const currentFiber = getProjectFiberType();
  const labelForFiber = (f) => f === "smf" ? "OS2 Single-Mode (LR, 1310nm)" : "OM4 Multi-Mode (SR, 850nm)";
  if (!skipConfirm && targetFiber !== currentFiber && typeof confirmProjectDefaultChange === "function" && !(typeof isProjectWizardOpen === "function" && isProjectWizardOpen())) {
    const s1 = document.getElementById("topoProjectFiberSelect"); if (s1) s1.value = currentFiber;
    const s2 = document.getElementById("projectFiberSelect"); if (s2) s2.value = currentFiber;
    confirmProjectDefaultChange({
      title: "Change Inter-Rack Fiber Optic Standard?",
      settingLabel: "Inter-Closet Fiber Backbone & Optics Medium",
      defaultLabel: labelForFiber(currentFiber),
      newLabel: labelForFiber(targetFiber),
      message: `Your Project Default Inter-Rack Fiber Standard is set to "${labelForFiber(currentFiber)}". Are you sure you want to change it to "${labelForFiber(targetFiber)}"?`,
      allowLocalOverride: false,
      updateDefaultLabel: `Update Project Fiber to ${targetFiber === "smf" ? "OS2 Single-Mode" : "OM4 Multi-Mode"}`,
      onUpdateDefault: () => {
        if (typeof updateSingleProjectDefault === "function") {
          updateSingleProjectDefault(d => { if (!d.cabling) d.cabling = {}; d.cabling.fiberType = targetFiber; });
        }
        setProjectFiberType(targetFiber, true);
      },
      onCancel: () => {
        if (s1) s1.value = currentFiber;
        if (s2) s2.value = currentFiber;
      }
    });
    return;
  }
  projectDefaultFiberType = (type === "smf") ? "smf" : "mmf";
  const projKey = (typeof FacilityStore !== "undefined" && typeof FacilityStore.getProjectId === "function") 
    ? FacilityStore.getProjectId() 
    : "default";
  try {
    localStorage.setItem(`netselect_fiber_type_${projKey}`, projectDefaultFiberType);
  } catch (e) {}

  const sel1 = document.getElementById("topoProjectFiberSelect");
  if (sel1) sel1.value = projectDefaultFiberType;
  const sel2 = document.getElementById("projectFiberSelect");
  if (sel2) sel2.value = projectDefaultFiberType;

  // Real-time synchronization to Physical Layout fiber backbones that use project default
  if (silentLoad) return;
  if (typeof facilityFloors !== "undefined" && Array.isArray(facilityFloors)) {
    let changedAny = false;
    facilityFloors.forEach(fl => {
      if (Array.isArray(fl.fiberBackbones)) {
        fl.fiberBackbones.forEach(fb => {
          if (!fb.customOverride) {
            fb.fiberType = projectDefaultFiberType;
            changedAny = true;
          }
        });
      }
    });
    if (changedAny) {
      const physModal = document.getElementById("cableLayoutModal");
      const isPhysOpen = physModal && !physModal.classList.contains("hidden");
      if (isPhysOpen) {
        if (typeof recalculateCurrentFloorCables === "function") recalculateCurrentFloorCables();
        if (typeof renderCableCanvas === "function") renderCableCanvas();
        if (typeof renderInspector === "function") renderInspector();
        if (typeof renderSidebarTabContent === "function") renderSidebarTabContent();
      }
      if (typeof commitCablingToBOM === "function") commitCablingToBOM({ silent: true });
      if (typeof saveFacilityState === "function") saveFacilityState(true);
    }
  }

  if (typeof autoSynthesizeInterconnects === "function") {
    autoSynthesizeInterconnects();
  }
  if (typeof renderTopologyInspector === "function") {
    renderTopologyInspector();
  }
  if (typeof renderTopologyLinks === "function") {
    renderTopologyLinks();
  }
  if (typeof StorageService !== "undefined" && typeof StorageService.queueAutoSave === "function") {
    StorageService.queueAutoSave();
  }
  if (typeof showToast === "function") {
    showToast(`Project fiber specification set to ${projectDefaultFiberType.toUpperCase()} (${projectDefaultFiberType === "mmf" ? "OM4 Multi-Mode" : "OS2 Single-Mode"}).`);
  }
}

function isClosetNameMatch(nameA, nameB) {
  if (!nameA || !nameB) return false;
  const cleanA = (typeof FacilityStore !== "undefined" ? FacilityStore.normalize(nameA) : String(nameA))
    .split(" • ").pop().trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  const cleanB = (typeof FacilityStore !== "undefined" ? FacilityStore.normalize(nameB) : String(nameB))
    .split(" • ").pop().trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  if (cleanA === cleanB) return true;
  if (cleanA && cleanB && (cleanA.includes(cleanB) || cleanB.includes(cleanA))) return true;
  return false;
}

function syncTopologyLinkToPhysicalLayout(linkId, key, value) {
  if (typeof facilityFloors === "undefined" || !Array.isArray(facilityFloors)) return;
  const links = (typeof topologyLinks !== "undefined" && Array.isArray(topologyLinks)) ? topologyLinks : [];
  const link = links.find(l => l.id === linkId);
  if (!link) return;

  const nodeA = (typeof projectBOM !== "undefined") ? projectBOM.find(i => i.instanceId === link.fromId) : null;
  const nodeB = (typeof projectBOM !== "undefined") ? projectBOM.find(i => i.instanceId === link.toId) : null;
  if (!nodeA || !nodeB) return;

  const locA = (typeof FacilityStore !== "undefined") ? FacilityStore.normalize(nodeA.closetName || nodeA.rackId || "MDF") : (nodeA.closetName || "MDF");
  const locB = (typeof FacilityStore !== "undefined") ? FacilityStore.normalize(nodeB.closetName || nodeB.rackId || "MDF") : (nodeB.closetName || "MDF");
  if (locA === locB) return;

  let targetFiber = null;
  if (key === "fiberType") {
    targetFiber = (value === "auto" || !value) ? getProjectFiberType() : value;
  } else if (key === "medium") {
    if (value === "smf" || value === "mmf") {
      targetFiber = value;
    } else if (value === "auto") {
      targetFiber = getProjectFiberType();
    }
  }
  if (!targetFiber) return;

  let updatedAny = false;
  facilityFloors.forEach(fl => {
    if (!fl.fiberBackbones) return;
    fl.fiberBackbones.forEach(fb => {
      const c1 = (fl.nodes || []).find(n => n.id === fb.fromId);
      const c2 = (fl.nodes || []).find(n => n.id === fb.toId);
      const name1 = c1 ? c1.name : (fb.fromClosetName || "");
      const name2 = c2 ? c2.name : (fb.toClosetName || "");

      const match1 = isClosetNameMatch(name1, locA) && isClosetNameMatch(name2, locB);
      const match2 = isClosetNameMatch(name2, locA) && isClosetNameMatch(name1, locB);
      if (match1 || match2) {
        fb.fiberType = targetFiber;
        fb.customOverride = (key === "fiberType" && value !== "auto");
        updatedAny = true;
      }
    });
  });

  if (updatedAny) {
    const physModal = document.getElementById("cableLayoutModal");
    const isPhysOpen = physModal && !physModal.classList.contains("hidden");
    if (isPhysOpen) {
      if (typeof recalculateCurrentFloorCables === "function") recalculateCurrentFloorCables();
      if (typeof renderCableCanvas === "function") renderCableCanvas();
      if (typeof renderInspector === "function") renderInspector();
      if (typeof renderSidebarTabContent === "function") renderSidebarTabContent();
    }
    if (typeof saveFacilityState === "function") saveFacilityState(true);
    if (typeof commitCablingToBOM === "function") commitCablingToBOM({ silent: true });
  }
}

function getLinkInterconnectOverrides() {
  if (linkInterconnectOverrides && Object.keys(linkInterconnectOverrides).length > 0) {
    return linkInterconnectOverrides;
  }
  const projKey = (typeof FacilityStore !== "undefined" && typeof FacilityStore.getProjectId === "function") 
    ? FacilityStore.getProjectId() 
    : "default";
  try {
    const raw = localStorage.getItem(`netselect_link_overrides_${projKey}`);
    if (raw) linkInterconnectOverrides = JSON.parse(raw);
  } catch (e) {}
  return linkInterconnectOverrides || {};
}

function setLinkInterconnectOverrides(overrides) {
  linkInterconnectOverrides = (overrides && typeof overrides === "object") ? overrides : {};
  const projKey = (typeof FacilityStore !== "undefined" && typeof FacilityStore.getProjectId === "function") 
    ? FacilityStore.getProjectId() 
    : "default";
  try {
    localStorage.setItem(`netselect_link_overrides_${projKey}`, JSON.stringify(linkInterconnectOverrides));
  } catch (e) {}
}

function getLinkInterconnectOverride(linkId) {
  const all = getLinkInterconnectOverrides();
  return all[linkId] || {};
}

function updateLinkOverride(linkId, key, value) {
  TopologyHistory.pushState(`Update Link ${key}`);
  if (!linkInterconnectOverrides) linkInterconnectOverrides = {};
  if (!linkInterconnectOverrides[linkId]) linkInterconnectOverrides[linkId] = {};
  linkInterconnectOverrides[linkId][key] = value;

  const projKey = (typeof FacilityStore !== "undefined" && typeof FacilityStore.getProjectId === "function") 
    ? FacilityStore.getProjectId() 
    : "default";
  try {
    localStorage.setItem(`netselect_link_overrides_${projKey}`, JSON.stringify(linkInterconnectOverrides));
  } catch (e) {}

  if (key === "fiberType" || key === "medium") {
    syncTopologyLinkToPhysicalLayout(linkId, key, value);
  }

  autoSynthesizeInterconnects();
  renderTopologyInspector();
  renderTopologyLinks();
  if (typeof StorageService !== "undefined" && typeof StorageService.queueAutoSave === "function") {
    StorageService.queueAutoSave();
  }
}

function parseRackU(slot) {
  if (slot === null || slot === undefined) return null;
  if (typeof slot === "number") return slot >= 1 ? slot : null;
  const str = String(slot).trim();
  if (/^(Bay|Rail|Zone|Pole)/i.test(str)) return null;
  const m = str.match(/\bU?(\d+)/i);
  return m ? parseInt(m[1], 10) : null;
}

function calculateUDistance(nodeA, nodeB) {
  const uA = parseRackU(nodeA?.rackSlot);
  const uB = parseRackU(nodeB?.rackSlot);
  if (uA === null || uB === null) return 1; // Default to adjacent (1U) if either is unmounted
  const hA = Math.max(1, parseInt(nodeA?.rackUnits || nodeA?.ru, 10) || 1);
  const hB = Math.max(1, parseInt(nodeB?.rackUnits || nodeB?.ru, 10) || 1);
  
  // Center-to-center vertical RU separation
  const centerA = uA + (hA - 1) / 2;
  const centerB = uB + (hB - 1) / 2;
  return Math.max(1, Math.round(Math.abs(centerA - centerB)));
}

function getDacLengthForUDiff(uDiff, speed = "10G") {
  if (uDiff === null || uDiff === undefined) return "1m";
  if (uDiff <= 2) return "0.5m";
  if (uDiff <= 6) return "1m";
  if (uDiff <= 15) return "2m";
  if (uDiff <= 28) return "3m";
  // IEEE 802.3by / vendor passive twinax DACs at 25G/40G/100G max out at 3m
  if (speed === "25G" || speed === "40G" || speed === "100G") return "3m";
  return "5m";
}

function getPatchCordLengthForUDiff(uDiff) {
  if (uDiff === null || uDiff === undefined) return { lengthFt: 1, lengthMeters: 0.3, label: "1 ft (0.3m)" };
  if (uDiff <= 1) return { lengthFt: 0.5, lengthMeters: 0.15, label: "6 in (0.5 ft)" };
  if (uDiff <= 4) return { lengthFt: 1, lengthMeters: 0.3, label: "1 ft (0.3m)" };
  if (uDiff <= 7) return { lengthFt: 3, lengthMeters: 1.0, label: "3 ft (1m)" };
  if (uDiff <= 14) return { lengthFt: 5, lengthMeters: 1.5, label: "5 ft (1.5m)" };
  if (uDiff <= 22) return { lengthFt: 7, lengthMeters: 2.1, label: "7 ft (2.1m)" };
  if (uDiff <= 32) return { lengthFt: 10, lengthMeters: 3.0, label: "10 ft (3m)" };
  return { lengthFt: 15, lengthMeters: 4.6, label: "15 ft (4.6m)" };
}

function findDacItem(speed, preferredVendor, dacLength) {
  const targetMeters = parseFloat(dacLength);
  if (typeof OPTICS_LIST !== "undefined" && Array.isArray(OPTICS_LIST)) {
    // 1. Exact match on speed, vendor, and reach/lengthMeters
    let item = OPTICS_LIST.find(o => o.medium === "dac" && o.speed === speed && o.vendor === preferredVendor && (o.reach === dacLength || o.lengthMeters === targetMeters));
    if (item) return item;
    // 2. Match on speed and reach/lengthMeters (any vendor)
    item = OPTICS_LIST.find(o => o.medium === "dac" && o.speed === speed && (o.reach === dacLength || o.lengthMeters === targetMeters));
    if (item) return item;
    // 3. Fallback to vendor + speed
    item = OPTICS_LIST.find(o => o.medium === "dac" && o.speed === speed && o.vendor === preferredVendor);
    if (item) return item;
    // 4. Fallback to speed
    item = OPTICS_LIST.find(o => o.medium === "dac" && o.speed === speed);
    if (item) return item;
  }
  return null;
}

function findPatchCordItem(targetFt, preferredVendor, isEtherlighting, preferredColorOrDevice) {
  let targetColor = "Yellow";
  if (typeof preferredColorOrDevice === "string" && preferredColorOrDevice) {
    targetColor = preferredColorOrDevice;
  } else if (typeof getProjectCablingStandard === "function") {
    const std = getProjectCablingStandard(preferredColorOrDevice || null, "patch");
    if (std && std.color) targetColor = std.color;
  }

  if (typeof CABLING_CATALOG !== "undefined" && CABLING_CATALOG.patchCords) {
    const cords = CABLING_CATALOG.patchCords;
    const tol = targetFt <= 1.5 ? 0.24 : 0.6;
    const pickClosest = (pred) => {
      const matches = cords.filter(c => pred(c) && Math.abs((c.lengthFt || 0) - targetFt) <= tol);
      if (matches.length === 0) return null;
      matches.sort((a, b) => Math.abs((a.lengthFt || 0) - targetFt) - Math.abs((b.lengthFt || 0) - targetFt));
      return matches[0];
    };

    if (isEtherlighting) {
      const el = pickClosest(c => c.etherlighting);
      if (el) return el;
    }
    // 1. Preferred vendor + target color + length
    if (preferredVendor) {
      const match = pickClosest(c => (c.vendor || '').toLowerCase().includes(preferredVendor.toLowerCase()) &&
        (c.color || '').toLowerCase() === targetColor.toLowerCase());
      if (match) return match;
    }
    // 2. Target color + length
    const colorMatch = pickClosest(c => (c.color || '').toLowerCase() === targetColor.toLowerCase());
    if (colorMatch) return colorMatch;

    // 3. Preferred vendor + length fallback
    if (preferredVendor) {
      const match = pickClosest(c => (c.vendor || '').toLowerCase().includes(preferredVendor.toLowerCase()));
      if (match) return match;
    }
    // 4. Any length match
    const match = pickClosest(() => true);
    if (match) return match;
  }

  const colorCodeMap = {
    "Yellow": "YL",
    "Blue": "BL",
    "Green": "GN",
    "Orange": "OR",
    "Purple": "VT",
    "White": "WH",
    "Gray": "GY",
    "Red": "RD",
    "Black": "BK"
  };
  const cCode = colorCodeMap[targetColor] || "YL";
  const lenCode = targetFt === 0.5 ? "6IN" : `${targetFt}FT`;
  const lenName = targetFt === 0.5 ? "6-Inch" : `${targetFt}-Foot`;

  return {
    sku: `C6A-SLIM-${lenCode}-${cCode}`,
    name: `Cat6A Slim 28AWG Patch Cord (${lenName}, ${targetColor})`,
    vendor: preferredVendor || "Panduit",
    msrp: targetFt === 0.5 ? 6.20 : (targetFt === 1 ? 7.50 : (targetFt === 3 ? 8.50 : (targetFt === 5 ? 9.80 : (targetFt === 7 ? 11.00 : (targetFt === 10 ? 13.50 : 16.50))))),
    lengthFt: targetFt,
    color: targetColor
  };
}

function formatDacItem(baseSku, baseName, baseMsrp, lengthStr, speed, vendor) {
  const upperLen = lengthStr.toUpperCase();
  let sku = baseSku;
  const is50cmBase = /50CM/i.test(baseSku);
  if (is50cmBase) {
    const cmMap = { "0.5M": "50CM", "1M": "1M", "2M": "3M", "3M": "3M", "5M": "3M" };
    sku = sku.replace(/50CM/i, cmMap[upperLen] || upperLen);
  } else if (/1M/i.test(sku)) {
    sku = sku.replace(/1M/i, upperLen);
  } else if (/0101/.test(sku)) {
    const ruckusMap = { "0.5M": "0051", "1M": "0101", "2M": "0201", "3M": "0301", "5M": "0501" };
    sku = sku.replace("0101", ruckusMap[upperLen] || upperLen);
  } else {
    sku = `${sku}-${upperLen}`;
  }

  if (typeof OPTICS_LIST !== "undefined" && Array.isArray(OPTICS_LIST)) {
    const exactMatch = OPTICS_LIST.find(o => o && o.sku === sku);
    if (exactMatch) {
      return { sku: exactMatch.sku, name: exactMatch.name, msrp: exactMatch.msrp };
    }
  }

  const displayLen = (is50cmBase && (lengthStr === "2m" || lengthStr === "5m")) ? "3m" : lengthStr;
  let name = baseName;
  if (/\((?:0\.5m|50cm|1m)\)/i.test(name)) {
    name = name.replace(/\((?:0\.5m|50cm|1m)\)/i, `(${displayLen})`);
  } else if (!name.includes(displayLen)) {
    name = `${name} (${displayLen})`;
  }

  let msrp = baseMsrp;
  if (is50cmBase) {
    if (displayLen === "1m") msrp = baseMsrp + 40;
    else if (displayLen === "3m") msrp = baseMsrp + 120;
  } else {
    if (lengthStr === "0.5m") msrp = Math.max(15, Math.round(baseMsrp * 0.9));
    else if (lengthStr === "2m") msrp = baseMsrp + 10;
    else if (lengthStr === "3m") msrp = baseMsrp + 20;
    else if (lengthStr === "5m") msrp = baseMsrp + 35;
  }

  return { sku, name, msrp };
}

function syncRackInterconnectsAndCabling(targetRackId) {
  if (typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) return;

  // 1. Re-evaluate auto-synthesized topology DACs and Patch Cords
  if (typeof autoSynthesizeInterconnects === "function") {
    autoSynthesizeInterconnects(true); // silent = true
  }

  // 2. Re-evaluate switch-to-panel structured cabling patch cords for the rack(s)
  const closets = targetRackId ? [targetRackId] : [...new Set(projectBOM.map(i => i.closetName || i.rackId).filter(Boolean))];

  closets.forEach(closet => {
    const normLoc = (typeof FacilityStore !== "undefined") ? FacilityStore.normalize(closet) : closet;
    if (normLoc.endsWith("• Field") || (typeof FacilityStore !== "undefined" && normLoc === FacilityStore.UNASSIGNED)) return;

    const closetSwitches = projectBOM.filter(i => (typeof isNetworkSwitchItem === "function" ? isNetworkSwitchItem(i) : (i.role === "Access" || (i.model || '').includes("Switch"))) && ((typeof FacilityStore !== "undefined" ? FacilityStore.normalize(i.closetName || i.rackId) : (i.closetName || i.rackId)) === normLoc) && (parseRackU(i.rackSlot) !== null));
    const closetPanels = projectBOM.filter(i => (i.role === "Structured Cabling" || i.category === "cabling") && (i.model || '').includes("Patch Panel") && ((typeof FacilityStore !== "undefined" ? FacilityStore.normalize(i.closetName || i.rackId) : (i.closetName || i.rackId)) === normLoc) && (parseRackU(i.rackSlot) !== null));

    if (closetSwitches.length > 0 && closetPanels.length > 0) {
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
        const avgUDiff = Math.round(uDiffs.reduce((a, b) => a + b, 0) / uDiffs.length);
        const cordSpec = getPatchCordLengthForUDiff(avgUDiff);
        const matchedCord = findPatchCordItem(cordSpec.lengthFt, "Panduit");

        if (matchedCord) {
          projectBOM.forEach(item => {
            if (item.role === "Structured Cabling" && item.source === "cabling_sync" && (item.instanceId.startsWith("patch1ft-") || item.instanceId.startsWith("patch-")) && !item.instanceId.startsWith("patch7ft-")) {
              const itemLoc = (typeof FacilityStore !== "undefined") ? FacilityStore.normalize(item.closetName || item.rackId) : (item.closetName || item.rackId);
              if (itemLoc === normLoc && item.lengthFt !== cordSpec.lengthFt) {
                item.lengthFt = cordSpec.lengthFt;
                item.lengthMeters = cordSpec.lengthMeters;
                item.sku = matchedCord.sku;
                item.model = `${matchedCord.name} (${avgUDiff}U Separation in ${closet})`;
                item.msrp = matchedCord.msrp;
              }
            }
          });
        }
      }
    }
  });
}

// Dynamic Topology Layer Filters
let topologyLayerFilters = {
  network: true,
  servers: true,
  cameras: true,
  access: true,
  wireless: true,
  links: true
};

function getTopologyDeviceLayer(item) {
  if (!item) return "network";

  // 1. Prioritize canonical DeviceTaxonomy classification
  if (typeof DeviceTaxonomy !== "undefined" && typeof DeviceTaxonomy.getDeviceType === "function") {
    const tax = DeviceTaxonomy.getDeviceType(item);
    if (tax) {
      if (tax.prefix === "SW" || tax.prefix === "FW") return "network";
      if (tax.prefix === "SVR" || tax.prefix === "CWS" || tax.prefix === "UPS") return "servers";
      if (tax.prefix === "CAM" || tax.prefix === "LPR") return "cameras";
      if (tax.prefix === "DR" || tax.prefix === "ACS" || tax.prefix === "BIO" || tax.prefix === "SIP") return "access";
      if (tax.prefix === "P2P") return "wireless";
    }
  }

  // 2. Strict attribute and keyword fallback checks
  const role = (item.role || "").trim();
  const cat = (item.category || "").toLowerCase().trim();
  const model = (item.model || "").toLowerCase();
  const desc = (item.description || "").toLowerCase();
  const prefix = item.deviceTypePrefix || "";
  const allText = `${role} ${cat} ${model} ${desc}`.toLowerCase();

  // Network Switches & Firewalls (Check first: Access Switches must NEVER be treated as Access Control!)
  if (prefix === "SW" || prefix === "FW" ||
      role === "Access" || role === "Core" || role === "Aggregation" || role === "Core & Agg" ||
      role === "Switch" || role === "Access Switch" || role === "Core Switch" ||
      role === "Firewall" || role === "Gateways & WAN" || role === "Security WAN" ||
      cat === "switch" || cat === "switches" || cat === "firewall" || cat === "security_appliance" ||
      /\b(switch|catalyst|meraki ms|unifi.*switch|edge.*switch|fortigate|palo alto|udm-pro|udm-se|gateway|router)\b/i.test(allText)) {
    return "network";
  }

  // Servers & Storage
  if (prefix === "SVR" || prefix === "CWS" || prefix === "UPS" ||
      role === "Server" || role === "VMS Server" || role === "Compute & Storage" || role === "Storage" ||
      role === "Client Machine" || role === "Workstation" || role === "UPS" ||
      cat.includes("server") || cat.includes("storage") || cat.includes("workstation") || cat.includes("ups") ||
      /\b(server|nvr|san|nas|vms|poweredge|proliant|workstation|smart-ups|battery backup)\b/i.test(allText)) {
    return "servers";
  }

  // Cameras & Surveillance
  if (prefix === "CAM" || prefix === "LPR" ||
      role === "Camera" || role === "Surveillance" || role === "Video" || role === "LPR" ||
      cat.includes("camera") || cat.includes("surveillance") ||
      /\b(camera|cams?|dome|bullet|ptz|turret|fisheye|multisensor|lpr|anpr)\b/i.test(allText)) {
    return "cameras";
  }

  // Access Control & Doors (Must NOT match network Access switches!)
  if (prefix === "DR" || prefix === "ACS" || prefix === "BIO" || prefix === "SIP" ||
      role === "Access Control" || role === "Door" || role === "Biometric" || role === "Intercom" || role === "Audio/Intercom" ||
      cat.includes("access_control") || cat === "door" || cat === "doors" || cat.includes("intercom") ||
      /\b(door|reader|portal|turnstile|mercury|cloudlink|istar|intercom|doorbell|sip)\b/i.test(allText)) {
    return "access";
  }

  // Wireless Radios & P2P
  if (prefix === "P2P" || role === "Wireless Bridge" || role === "Wireless" || role === "P2P" ||
      cat.includes("wireless") || /\b(nanobeam|gigabeam|airmax|wave|bridge|p2p|ptmp|ubb)\b/i.test(allText)) {
    return "wireless";
  }

  return "network";
}

function toggleTopologyLayerMenu() {
  const menu = document.getElementById("topologyLayerMenu");
  if (!menu) return;
  menu.classList.toggle("hidden");
}

function syncTopologyLayerCheckboxesDom() {
  Object.keys(topologyLayerFilters).forEach(k => {
    const chk = document.getElementById(`topoLayer-${k}`);
    if (chk) chk.checked = !!topologyLayerFilters[k];
  });
  const hasAnyFieldLayer = !!(topologyLayerFilters.cameras || topologyLayerFilters.access);
  showTopologyFieldDevices = hasAnyFieldLayer;
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("netselect_topology_show_field", showTopologyFieldDevices ? "true" : "false");
  }
  updateTopologyLayerCountBadge();
  updateTopologyFieldDevicesButton();
}

function setTopologyLayerFilter(layer, enabled) {
  if (topologyLayerFilters.hasOwnProperty(layer)) {
    topologyLayerFilters[layer] = !!enabled;
  }
  // If user manually toggles cameras/access on while in 'backbone' plane, switch lens back to 'all' so they appear
  if (enabled && (layer === "cameras" || layer === "access" || layer === "servers") && activeTopologyViewPlane === "backbone") {
    activeTopologyViewPlane = "all";
  }
  syncTopologyLayerCheckboxesDom();
  renderTopology();
}

function toggleAllTopologyLayers(enableAll) {
  activeTopologyViewPlane = enableAll ? "all" : activeTopologyViewPlane;
  Object.keys(topologyLayerFilters).forEach(k => {
    topologyLayerFilters[k] = !!enableAll;
  });
  syncTopologyLayerCheckboxesDom();
  renderTopology();
}

function updateTopologyLayerCountBadge() {
  const badge = document.getElementById("badgeTopologyLayerCount");
  const planeLbl = document.getElementById("lblTopologyActivePlane");
  const planeLabels = {
    all: "View & Layers: Unified",
    backbone: "Lens: Backbone",
    power: "Lens: PoE & PDU Power",
    vms: "Lens: Video / VMS",
    access: "Lens: Access Control"
  };
  if (planeLbl) {
    planeLbl.textContent = planeLabels[activeTopologyViewPlane] || "View & Layers";
  }
  const presetBtns = document.querySelectorAll("#topoLensPresetButtons button[data-plane]");
  presetBtns.forEach(btn => {
    const isAct = btn.getAttribute("data-plane") === activeTopologyViewPlane;
    btn.className = isAct
      ? "px-2 py-1 rounded-lg bg-brand-600/20 border border-brand-500/50 text-brand-300 font-semibold text-left flex items-center justify-between cursor-pointer transition-colors"
      : "px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 text-left flex items-center justify-between cursor-pointer transition-colors";
  });
  if (!badge) return;
  const total = Object.keys(topologyLayerFilters).length;
  const active = Object.values(topologyLayerFilters).filter(Boolean).length;
  badge.textContent = active === total ? "All" : `${active}/${total}`;
  if (active < total || activeTopologyViewPlane !== "all") {
    badge.className = "text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500 text-slate-950 font-bold";
  } else {
    badge.className = "text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold";
  }
}

function toggleTopologyFieldDevices() {
  showTopologyFieldDevices = !showTopologyFieldDevices;
  if (typeof localStorage !== "undefined") {
    localStorage.setItem("netselect_topology_show_field", showTopologyFieldDevices ? "true" : "false");
  }
  if (showTopologyFieldDevices && activeTopologyViewPlane === "backbone") {
    activeTopologyViewPlane = "all";
  } else if (!showTopologyFieldDevices && (activeTopologyViewPlane === "vms" || activeTopologyViewPlane === "access")) {
    activeTopologyViewPlane = "backbone";
  }
  topologyLayerFilters.cameras = showTopologyFieldDevices;
  topologyLayerFilters.access = showTopologyFieldDevices;
  syncTopologyLayerCheckboxesDom();
  renderTopology();
  if (typeof showToast === "function") {
    showToast(showTopologyFieldDevices ? "Showing field devices & horizontal cable drops" : "Hiding field drops (showing rack & backbone infrastructure)");
  }
}

function updateTopologyFieldDevicesButton() {
  const btn = document.getElementById("btnToggleTopologyFieldDevices");
  const lbl = document.getElementById("lblTopologyFieldDevices");
  if (!btn) return;
  if (showTopologyFieldDevices) {
    btn.classList.add("bg-cyan-600/30", "border-cyan-500/60", "text-cyan-200");
    btn.classList.remove("bg-slate-900", "border-slate-800", "text-slate-300");
    if (lbl) lbl.textContent = "Hide Field Drops";
  } else {
    btn.classList.remove("bg-cyan-600/30", "border-cyan-500/60", "text-cyan-200");
    btn.classList.add("bg-slate-900", "border-slate-800", "text-slate-300");
    if (lbl) lbl.textContent = "Show Field Drops";
  }
}

function setTopologyGroupingMode(mode) {
  if (mode !== "floor" && mode !== "switch") mode = "floor";
  topologyGroupingMode = mode;
  try {
    localStorage.setItem("netselect_topology_grouping_mode", mode);
  } catch (e) {}
  const sel = document.getElementById("topologyGroupingSelector");
  if (sel) sel.value = mode;
  if (typeof renderTopology === "function") renderTopology();
  if (typeof renderTopologyInspector === "function") renderTopologyInspector();
  if (typeof showToast === "function") {
    showToast(mode === "floor" ? "Topology: Grouped by Physical Floor (Showing Cable Runs)" : "Topology: Grouped by Serving Switch Enclosure");
  }
}

function isTopologyModalVisible() {
  const modal = document.getElementById("topologyModal");
  return modal && !modal.classList.contains("hidden");
}

function toggleTopologyModal() {
  const modal = document.getElementById("topologyModal");
  if (!modal) return;

  if (modal.classList.contains("hidden")) {
    modal.classList.remove("hidden");
    initTopologyCanvas();
    renderTopology();
    renderTopologyInspector();
    TopologyHistory.updateToolbarButtons();
    setTimeout(() => {
      fitTopologyToScreen();
    }, 60);
    if (window.lucide) lucide.createIcons();
  } else {
    modal.classList.add("hidden");
    isCanvasDragging = false;
    isViewportPanning = false;
    draggedTopologyNode = null;
  }
}

function initTopologyCanvas() {
  const viewport = document.getElementById("topologyCanvasViewport");
  if (!viewport || viewport.dataset.initialized === "true") return;

  viewport.dataset.initialized = "true";
  viewport.addEventListener("mousedown", handleViewportMouseDown);
  viewport.addEventListener("wheel", handleViewportWheel, { passive: false });
  if (!window._topologyWindowEventsBound) {
    window._topologyWindowEventsBound = true;
    window.addEventListener("mousemove", handleTopologyMouseMove);
    window.addEventListener("mouseup", handleTopologyMouseUp);
  }
  if (false) window.addEventListener("mousemove", handleTopologyMouseMove);
  if (false) window.addEventListener("mouseup", handleTopologyMouseUp);
  window.addEventListener("keydown", (e) => {
    if (!isTopologyModalVisible()) return;
    if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT" || e.target.isContentEditable)) return;
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "z") {
      e.preventDefault();
      TopologyHistory.undo();
    } else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "y" || (e.shiftKey && e.key.toLowerCase() === "z"))) {
      e.preventDefault();
      TopologyHistory.redo();
    }
  });
}

function handleViewportMouseDown(e) {
  if (!isTopologyModalVisible()) return;
  // If clicked inside an interactive card or control, don't initiate viewport pan
  if (e.target.closest(".topo-location-cluster") || e.target.closest("button") || e.target.closest("select") || e.target.closest("input")) {
    return;
  }
  const viewport = document.getElementById("topologyCanvasViewport");
  if (!viewport) return;

  isViewportPanning = true;
  panStart = {
    x: e.clientX,
    y: e.clientY,
    scrollLeft: viewport.scrollLeft,
    scrollTop: viewport.scrollTop
  };
  viewport.style.cursor = "grabbing";
}

function handleViewportWheel(e) {
  if (!isTopologyModalVisible()) return;
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.08 : -0.08;
    zoomTopologyCanvas(delta);
  }
}

// -----------------------------------------------------------
// Canvas Zoom & Pan Controls
// -----------------------------------------------------------
function zoomTopologyCanvas(delta) {
  topologyZoomLevel = Math.max(0.4, Math.min(2.0, Math.round((topologyZoomLevel + delta) * 100) / 100));
  applyTopologyZoom();
}

function resetTopologyZoom() {
  topologyZoomLevel = 1.0;
  applyTopologyZoom();
  const viewport = document.getElementById("topologyCanvasViewport");
  if (viewport) {
    viewport.scrollTo({ left: 0, top: 0, behavior: "smooth" });
  }
}

function applyTopologyZoom() {
  const container = document.getElementById("topologyNodesContainer");
  const svg = document.getElementById("topologySvgOverlay");
  const badge = document.getElementById("topologyZoomLevelBadge");

  if (container) {
    container.style.transform = `scale(${topologyZoomLevel})`;
    container.style.transformOrigin = "top left";
  }
  if (svg) {
    svg.style.transform = `scale(${topologyZoomLevel})`;
    svg.style.transformOrigin = "top left";
  }
  if (badge) {
    badge.innerText = `${Math.round(topologyZoomLevel * 100)}%`;
  }
  renderTopologyLinks();
}

function fitTopologyToScreen() {
  const clusters = document.querySelectorAll(".topo-location-cluster");
  const viewport = document.getElementById("topologyCanvasViewport");
  if (clusters.length === 0 || !viewport) return;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  clusters.forEach(c => {
    const l = c.offsetLeft;
    const t = c.offsetTop;
    const r = l + c.offsetWidth;
    const b = t + c.offsetHeight;
    if (l < minX) minX = l;
    if (t < minY) minY = t;
    if (r > maxX) maxX = r;
    if (b > maxY) maxY = b;
  });

  const inspectorPanel = document.getElementById("topologyInspectorPanel");
  const inspectorWidth = (inspectorPanel && !inspectorPanel.classList.contains("hidden")) ? inspectorPanel.offsetWidth : 0;
  const availW = Math.max(400, viewport.clientWidth - inspectorWidth - 100);
  const availH = Math.max(300, viewport.clientHeight - 100);

  const contentW = Math.max(100, maxX - minX + 80);
  const contentH = Math.max(100, maxY - minY + 80);

  const scaleW = availW / contentW;
  const scaleH = availH / contentH;
  const optimalZoom = Math.max(0.45, Math.min(1.15, Math.min(scaleW, scaleH)));

  topologyZoomLevel = Math.round(optimalZoom * 100) / 100;
  applyTopologyZoom();

  const centerX = (minX + (contentW / 2)) * topologyZoomLevel;
  const centerY = (minY + (contentH / 2)) * topologyZoomLevel;

  viewport.scrollTo({
    left: Math.max(0, centerX - (availW / 2)),
    top: Math.max(0, centerY - (availH / 2)),
    behavior: "smooth"
  });
}

function panClusterIntoView(loc) {
  if (!loc) return;
  const clusterEl = Array.from(document.querySelectorAll(".topo-location-cluster")).find(el => el.getAttribute("data-location") === loc);
  const viewport = document.getElementById("topologyCanvasViewport");
  if (!clusterEl || !viewport) return;

  const inspectorPanel = document.getElementById("topologyInspectorPanel");
  const inspectorWidth = (inspectorPanel && !inspectorPanel.classList.contains("hidden")) ? inspectorPanel.offsetWidth : 0;
  const visibleWidth = Math.max(400, viewport.clientWidth - inspectorWidth);
  const visibleHeight = viewport.clientHeight;

  const targetLeft = (clusterEl.offsetLeft * topologyZoomLevel) - (visibleWidth / 2) + ((clusterEl.offsetWidth * topologyZoomLevel) / 2);
  const targetTop = (clusterEl.offsetTop * topologyZoomLevel) - (visibleHeight / 2) + ((clusterEl.offsetHeight * topologyZoomLevel) / 2);

  viewport.scrollTo({
    left: Math.max(0, targetLeft),
    top: Math.max(0, targetTop),
    behavior: "smooth"
  });
}

function panNodeIntoView(instanceId) {
  const cardEl = document.getElementById(`topo-card-${instanceId}`);
  if (cardEl) {
    const cluster = cardEl.closest(".topo-location-cluster");
    if (cluster) {
      panClusterIntoView(cluster.getAttribute("data-location"));
    }
    cardEl.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    cardEl.classList.add("ring-4", "ring-indigo-400", "scale-[1.02]", "shadow-2xl");
    setTimeout(() => {
      cardEl.classList.remove("ring-4", "ring-indigo-400", "scale-[1.02]", "shadow-2xl");
    }, 1800);
  } else {
    // If it's a child/edge device, pan to its host switch
    const item = (typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) ? projectBOM.find(i => i.instanceId === instanceId) : null;
    if (item && item.uplinkTargetId) {
      selectTopologyNode(item.uplinkTargetId);
      panNodeIntoView(item.uplinkTargetId);
    }
  }
}


function setTopologyViewPlane(plane) {
  activeTopologyViewPlane = plane || "all";
  const sel = document.getElementById("topologyPlaneSelector");
  if (sel && sel.value !== activeTopologyViewPlane) {
    sel.value = activeTopologyViewPlane;
  }
  if (activeTopologyViewPlane === "backbone") {
    topologyLayerFilters.network = true;
    topologyLayerFilters.wireless = true;
    topologyLayerFilters.links = true;
    topologyLayerFilters.servers = false;
    topologyLayerFilters.cameras = false;
    topologyLayerFilters.access = false;
  } else if (activeTopologyViewPlane === "vms") {
    topologyLayerFilters.network = true;
    topologyLayerFilters.servers = true;
    topologyLayerFilters.cameras = true;
    topologyLayerFilters.links = true;
    topologyLayerFilters.access = false;
  } else if (activeTopologyViewPlane === "access") {
    topologyLayerFilters.network = true;
    topologyLayerFilters.servers = true;
    topologyLayerFilters.access = true;
    topologyLayerFilters.links = true;
    topologyLayerFilters.cameras = false;
  } else {
    // "all" or "power"
    topologyLayerFilters.network = true;
    topologyLayerFilters.servers = true;
    topologyLayerFilters.cameras = true;
    topologyLayerFilters.access = true;
    topologyLayerFilters.wireless = true;
    topologyLayerFilters.links = true;
  }
  syncTopologyLayerCheckboxesDom();
  renderTopology();
  renderTopologyInspector();
}

function toggleTopologyInspector(forceState = null) {
  const panel = document.getElementById("topologyInspectorPanel");
  const openBtn = document.getElementById("topologyOpenInspectorBtn");
  const headerBtn = document.getElementById("topologyInspectorHeaderBtn");
  if (!panel) return;

  if (forceState !== null) {
    isTopologyInspectorVisible = forceState;
  } else {
    isTopologyInspectorVisible = !isTopologyInspectorVisible;
  }

  if (isTopologyInspectorVisible) {
    panel.classList.remove("hidden");
    if (openBtn) openBtn.classList.add("hidden");
    if (headerBtn) headerBtn.classList.add("border-brand-500", "text-brand-300");
  } else {
    panel.classList.add("hidden");
    if (openBtn) openBtn.classList.remove("hidden");
    if (headerBtn) headerBtn.classList.remove("border-brand-500", "text-brand-300");
  }
}

// -----------------------------------------------------------
// Canonical Active Topology Node Classifier
// Excludes Passive Enclosures, Equipment Racks, UPS, PDUs, Cords,
// Patch Panels, Pathways, Mounting Kits, Optics, and Licenses
// -----------------------------------------------------------
function isTopologyActiveNode(item) {
  if (!item || item.parentInstanceId) return false;
  if (item.isEnclosureFrame || item.isPassive) return false;

  if (typeof DeviceTaxonomy !== "undefined") {
    if (typeof DeviceTaxonomy.isPassiveOrHostInfrastructure === "function" && DeviceTaxonomy.isPassiveOrHostInfrastructure(item)) {
      return false;
    }
    if (typeof DeviceTaxonomy.isPowerDistributionOrBackup === "function" && DeviceTaxonomy.isPowerDistributionOrBackup(item)) {
      return false;
    }
  }

  const role = (item.role || "").trim();
  const cat = (item.category || "").toLowerCase().trim();

  const excludedRoles = [
    "Equipment Rack", "19\" Equipment Racks", "Cabinets & Enclosures",
    "Security Cabinet", "Industrial NEMA Enclosure", "Architectural Backboard",
    "Enclosure", "Rack UPS Power", "UPS", "Rackmount PDU", "PDU",
    "Patch Panel", "Structured Cabling", "Optics & DAC",
    "Mgmt License", "Security License", "Feature License", "Stacking Cable",
    "Accessory", "Power Jumper Cable", "Pathways & J-Hooks", "Mounting Hardware"
  ];
  if (excludedRoles.includes(role)) return false;

  const excludedCats = [
    "racks", "enclosures", "cabinets", "ups", "pdu", "rack_pdu", "power_distribution",
    "power_cords", "pathways", "mounting_hardware", "infrastructure", "passive",
    "cabling", "optics", "license"
  ];
  if (excludedCats.includes(cat)) return false;

  return true;
}

// -----------------------------------------------------------
// Facility & Device Auto-Linking Engine at Scale
// -----------------------------------------------------------
function autoResolveDeviceUplinks() {
  if (typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) return;

  const switches = projectBOM.filter(i => 
    !i.parentInstanceId && 
    (i.role === "Access" || i.role === "Core" || i.role === "Core & Agg" || i.role === "Aggregation")
  );

  // Self-heal any non-network items (Racks, Enclosures, UPS, PDUs, Patch Panels, Cords)
  // that may have stale uplinkTargetId, assignedSwitchPort, or poe_switch overrides
  const invalidLinkedIds = new Set();
  projectBOM.forEach(item => {
    if (!item || item.parentInstanceId) return;
    if (!isTopologyActiveNode(item)) {
      if (item.uplinkTargetId || item.assignedSwitchPort) {
        invalidLinkedIds.add(item.instanceId);
        item.uplinkTargetId = null;
        item.assignedSwitchPort = null;
      }
      if (item.powerSourceOverride === "poe_switch" || item.powerSource === "poe_switch") {
        delete item.powerSourceOverride;
        delete item.powerSource;
      }
    }
  });

  if (invalidLinkedIds.size > 0 && typeof PortEngine !== "undefined") {
    switches.forEach(sw => {
      if (Array.isArray(sw.switchPorts)) {
        let modified = false;
        sw.switchPorts.forEach(p => {
          if (p.connectedDeviceId && invalidLinkedIds.has(p.connectedDeviceId)) {
            p.connectedDeviceId = null;
            p.connectedDeviceModel = null;
            p.connectedDeviceRole = null;
            p.connectedLocation = null;
            p.poeOutputWatts = 0;
            p.linkStatus = "down";
            modified = true;
          }
        });
        if (modified && typeof PortEngine.recalculateSwitchPoE === "function") {
          PortEngine.recalculateSwitchPoE(sw);
        }
      }
    });
  }

  if (switches.length === 0) return;

  projectBOM.forEach(item => {
    if (item.parentInstanceId) return;
    if (!isTopologyActiveNode(item)) return;

    const isEdge = (typeof FacilityStore !== "undefined" && typeof FacilityStore.isFieldDevice === "function")
      ? FacilityStore.isFieldDevice(item)
      : (item.role === "Camera" || item.role === "Access Control" || item.role === "Intercom" ||
         (item.category && (item.category.includes("camera") || item.category.includes("access") || item.category.includes("intercom"))));
    const isRadio = item.role === "Wireless Bridge" || item.category === "wireless" || item.category === "ptp_60g";

    if (!isEdge && !isRadio) return;
    if (item.unassignedByUser) return;

    // Detect if this is a Remote Station radio in a PtP paired link
    const isRemoteRadio = isRadio && item.linkPairId && (
      (item.model && (item.model.includes("Remote") || item.model.includes("Station") || item.model.includes("Substation"))) ||
      (item.friendlyName && (item.friendlyName.includes("P2P02") || item.friendlyName.includes("Remote")))
    );

    // If both partner radios are accidentally plugged into the exact same switch, clear remote uplink
    if (isRemoteRadio) {
      const partner = projectBOM.find(p => p.linkPairId === item.linkPairId && p.instanceId !== item.instanceId);
      if (partner && partner.uplinkTargetId && item.uplinkTargetId === partner.uplinkTargetId) {
        item.uplinkTargetId = null;
        item.assignedSwitchPort = null;
      }
    }

    // Check if device currently has a valid uplink target
    const currentTarget = item.uplinkTargetId ? projectBOM.find(s => s.instanceId === item.uplinkTargetId) : null;
    if (!currentTarget) {
      const itemLoc = FacilityStore.normalize(item.closetName || item.rackId);
      
      // 1. First priority: Access switch in the exact same closet / enclosure
      let candidateSwitch = switches.find(s => 
        FacilityStore.normalize(s.closetName || s.rackId) === itemLoc && s.role === "Access"
      );

      // 1b. Check if there is an Access switch in the same Space (e.g. East Gate Pole)
      if (!candidateSwitch && typeof FacilityStore !== "undefined") {
        const itemSpace = FacilityStore.parse(itemLoc).space.toLowerCase();
        if (itemSpace && itemSpace !== "unassigned" && itemSpace !== "field") {
          candidateSwitch = switches.find(s => {
            const swLoc = FacilityStore.normalize(s.closetName || s.rackId);
            const swSpace = FacilityStore.parse(swLoc).space.toLowerCase();
            return swSpace === itemSpace && s.role === "Access";
          });
        }
      }

      // 2. Second priority: Core/Agg in the same closet or space
      if (!candidateSwitch) {
        candidateSwitch = switches.find(s => 
          FacilityStore.normalize(s.closetName || s.rackId) === itemLoc
        );
      }
      if (!candidateSwitch && typeof FacilityStore !== "undefined") {
        const itemSpace = FacilityStore.parse(itemLoc).space.toLowerCase();
        if (itemSpace && itemSpace !== "unassigned" && itemSpace !== "field") {
          candidateSwitch = switches.find(s => {
            const swLoc = FacilityStore.normalize(s.closetName || s.rackId);
            const swSpace = FacilityStore.parse(swLoc).space.toLowerCase();
            return swSpace === itemSpace;
          });
        }
      }

      // 3. Fallback: If no switch in same location (e.g. outdoor pole), use primary Access switch (unless remote radio)
      if (!candidateSwitch && !isRemoteRadio) {
        candidateSwitch = switches.find(s => s.role === "Access") || switches[0];
      }

      if (candidateSwitch && candidateSwitch.instanceId !== item.instanceId) {
        item.uplinkTargetId = candidateSwitch.instanceId;
        if (typeof PortEngine !== "undefined") {
          PortEngine.allocatePort(candidateSwitch, item);
        }
      }
    } else {
      // Ensure port is allocated if missing
      if (typeof PortEngine !== "undefined" && !item.assignedSwitchPort) {
        PortEngine.allocatePort(currentTarget, item);
      }
    }
  });
}

// -----------------------------------------------------------
// Master Topology Renderer
// -----------------------------------------------------------
function renderTopology() {
  const container = document.getElementById("topologyNodesContainer");
  if (!container) return;

  container.innerHTML = "";

  if (typeof projectBOM === "undefined" || projectBOM.length === 0) {
    container.innerHTML = `
      <div class="py-24 text-center text-slate-500 space-y-3">
        <div class="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-600">
          <i data-lucide="network" class="w-6 h-6"></i>
        </div>
        <p class="text-sm font-semibold text-slate-300">No active hardware in project quote.</p>
        <p class="text-xs text-slate-500 max-w-sm mx-auto">Add switches, gateways, servers, or wireless bridges from the catalog to visualize topology.</p>
      </div>
    `;
    updateTopologyCounters(0, 0, 0);
    renderTopologyLinks();
    if (window.lucide) lucide.createIcons();
    return;
  }

  // Auto-resolve device uplinks to local switches in closets at scale
  autoResolveDeviceUplinks();

  // Filter primary topology infrastructure nodes (exclude Racks, Enclosures, UPS, PDUs, Patch Panels, Cords, Licenses, and Accessories)
  const activeNodes = projectBOM.filter(item => {
    if (!isTopologyActiveNode(item)) return false;

    // Filter by view plane
    if (activeTopologyViewPlane === "backbone") {
      const isBackbone = item.role === "Core" || item.role === "Core & Agg" || item.role === "Aggregation" || item.role === "Gateways & WAN" || item.role === "Security WAN";
      if (!isBackbone && item.role !== "Access") return false;
    } else if (activeTopologyViewPlane === "vms") {
      const isVmsServer = item.role === "Server" || item.role === "VMS Server" || (item.hostedRoles && item.hostedRoles.includes("VMS Ingest & Recording"));
      const isCore = item.role === "Core" || item.role === "Core & Agg" || item.role === "Aggregation";
      const hasCameras = projectBOM.some(c => c.uplinkTargetId === item.instanceId && (c.role === "Camera" || (c.category && c.category.includes("camera"))));
      if (!isVmsServer && !isCore && !hasCameras) return false;
    } else if (activeTopologyViewPlane === "access") {
      const isAccessServer = item.role === "Server" || (item.hostedRoles && item.hostedRoles.includes("Access Control Engine"));
      const isCore = item.role === "Core" || item.role === "Core & Agg" || item.role === "Aggregation";
      const hasDoors = projectBOM.some(d => d.uplinkTargetId === item.instanceId && (d.role === "Access Control" || (d.category && d.category.includes("access"))));
      if (!isAccessServer && !isCore && !hasDoors) return false;
    }

    // Filter by Dynamic Layer Filters (Network, Servers, Cameras, Access, Wireless)
    const layer = getTopologyDeviceLayer(item);
    if (!topologyLayerFilters[layer]) return false;

    // Field Devices filter (Cameras, Access Readers, Door Controllers, Intercoms, and field drops)
    const isFieldDevice = (typeof FacilityStore !== "undefined" && typeof FacilityStore.isFieldDevice === "function")
      ? FacilityStore.isFieldDevice(item)
      : (item.role === "Camera" || item.role === "Access Control" || item.role === "Intercom" ||
         (item.category && (item.category.includes("camera") || item.category.includes("access") || item.category.includes("intercom"))));
    if (!showTopologyFieldDevices && isFieldDevice) {
      return false;
    }

    return true;
  });

  // Sync grouping selector in header if present
  const groupingSel = document.getElementById("topologyGroupingSelector");
  if (groupingSel && groupingSel.value !== topologyGroupingMode) {
    groupingSel.value = topologyGroupingMode;
  }

  // Group active hardware by normalized facility location
  const groups = {};
  activeNodes.forEach(item => {
    const isField = (typeof FacilityStore !== "undefined" && typeof FacilityStore.isFieldDevice === "function") 
      ? FacilityStore.isFieldDevice(item) 
      : (item.role === "Camera" || item.role === "Access Control" || item.role === "Intercom");
    let loc;

    if (topologyGroupingMode === "floor" && isField) {
      // In "floor" mode: Field devices (cameras, access readers, etc.) are grouped
      // into dedicated Physical Floor / Building containers, reflecting physical installation layout!
      const floorName = (typeof FacilityStore !== "undefined" && typeof FacilityStore.getDevicePhysicalFloor === "function")
        ? FacilityStore.getDevicePhysicalFloor(item)
        : "Main Floor";
      loc = `${floorName} • Field Drops`;
    } else {
      // In "switch" mode (or for telecom infrastructure): Group by serving equipment rack / switch pod
      loc = FacilityStore.normalize(item.closetName || item.rackId);
      const curLocLower = (loc || "").toLowerCase();
      if (curLocLower === "field" || curLocLower.endsWith("• field") || curLocLower === "unassigned") {
        // 1. Check if drop on physical canvas is assigned to a closet
        if (typeof facilityFloors !== "undefined") {
          for (const fl of facilityFloors) {
            const drop = (fl.nodes || []).find(n => n.instanceId === item.instanceId || n.id === `dev-${item.instanceId}` || n.id === item.instanceId);
            if (drop && drop.assignedClosetId) {
              const allClosets = (typeof getAllClosetsAcrossFacility === "function") ? getAllClosetsAcrossFacility() : [];
              const closet = allClosets.find(c => c.id === drop.assignedClosetId);
              if (closet) {
                loc = FacilityStore.normalize(closet.name);
                break;
              }
            }
          }
        }
        // 2. Check if uplink switch has a specific location
        if ((loc.toLowerCase() === "field" || loc.toLowerCase().endsWith("• field") || loc.toLowerCase() === "unassigned") && item.uplinkTargetId) {
          const sw = projectBOM.find(s => s.instanceId === item.uplinkTargetId);
          if (sw && sw.closetName && !sw.closetName.toLowerCase().endsWith("• field") && sw.closetName.toLowerCase() !== "field") {
            loc = FacilityStore.normalize(sw.closetName);
          }
        }
        // 3. Fallback for field devices if switch mode still has no closet
        if ((loc.toLowerCase() === "field" || loc.toLowerCase().endsWith("• field") || loc.toLowerCase() === "unassigned") && isField) {
          const floorName = (typeof FacilityStore !== "undefined" && typeof FacilityStore.getDevicePhysicalFloor === "function")
            ? FacilityStore.getDevicePhysicalFloor(item)
            : "Main Floor";
          loc = `${floorName} • Field Drops`;
        }
      }
    }

    if (!groups[loc]) groups[loc] = [];
    groups[loc].push(item);
  });

  const savedPositions = loadTopologyPositions();
  let groupIndex = 0;

  // Pre-calculate connected edge clients (cameras, APs, readers) per host switch
  const edgeDeviceMap = {};
  projectBOM.forEach(item => {
    if (!item.uplinkTargetId || !isTopologyActiveNode(item)) return;
    if (!edgeDeviceMap[item.uplinkTargetId]) {
      edgeDeviceMap[item.uplinkTargetId] = {
        cameras: 0,
        cameraWatts: 0,
        cameraMbps: 0,
        doors: 0,
        doorWatts: 0,
        wireless: 0,
        wirelessWatts: 0,
        items: []
      };
    }
    const bucket = edgeDeviceMap[item.uplinkTargetId];
    const qty = parseInt(item.qty, 10) || 1;
    const watts = (parseFloat(item.powerConsumptionWatts || item.maxPowerWatts || item.powerWatts || item.baseWatts || 15)) * qty;
    const mbps = (parseFloat(item.streamBitrateMbps) || 4.0) * qty;

    if (item.role === "Camera" || (item.category && item.category.includes("camera"))) {
      bucket.cameras += qty;
      bucket.cameraWatts += watts;
      bucket.cameraMbps += mbps;
    } else if (item.role === "Access Control" || (item.category && item.category.includes("access"))) {
      bucket.doors += qty;
      bucket.doorWatts += watts;
    } else if (item.role === "Wireless Bridge") {
      bucket.wireless += qty;
      bucket.wirelessWatts += watts;
    }
    bucket.items.push(item);
  });

  // Calculate live ingest load and client counts per server
  const serverMetricsMap = {};
  const servers = activeNodes.filter(n => n.role === "Server" || n.role === "VMS Server" || n.role === "Compute & Storage");
  servers.forEach(srv => {
    serverMetricsMap[srv.instanceId] = {
      ingestMbps: 0,
      cameraCount: 0,
      doorCount: 0
    };
  });

  // Route cameras to servers
  projectBOM.forEach(item => {
    if (!isTopologyActiveNode(item)) return;
    const qty = parseInt(item.qty, 10) || 1;
    if (item.role === "Camera" || (item.category && item.category.includes("camera"))) {
      let targetServerId = item.assignedRecordingServerId;
      if (!targetServerId && item.uplinkTargetId) {
        const hostSwitch = projectBOM.find(s => s.instanceId === item.uplinkTargetId);
        if (hostSwitch && hostSwitch.assignedVmsServerId) {
          targetServerId = hostSwitch.assignedVmsServerId;
        }
      }
      if (!targetServerId && servers.length > 0) {
        targetServerId = servers[0].instanceId;
      }
      if (targetServerId && serverMetricsMap[targetServerId]) {
        const mbps = (parseFloat(item.streamBitrateMbps) || 4.0) * qty;
        serverMetricsMap[targetServerId].ingestMbps += mbps;
        serverMetricsMap[targetServerId].cameraCount += qty;
      }
    } else if (item.role === "Access Control" || (item.category && item.category.includes("access"))) {
      let targetServerId = item.assignedAccessServerId;
      if (!targetServerId && item.uplinkTargetId) {
        const hostSwitch = projectBOM.find(s => s.instanceId === item.uplinkTargetId);
        if (hostSwitch && hostSwitch.assignedAccessServerId) {
          targetServerId = hostSwitch.assignedAccessServerId;
        }
      }
      if (!targetServerId && servers.length > 0) {
        targetServerId = servers[0].instanceId;
      }
      if (targetServerId && serverMetricsMap[targetServerId]) {
        serverMetricsMap[targetServerId].doorCount += qty;
      }
    }
  });

  // Pre-compute switch patch panel mappings and rack PDU metrics for fast lookup
  const switchPatchCache = {};
  const getCachedSwitchPatchMapping = (sw) => {
    if (!sw || typeof PortEngine === "undefined" || typeof PortEngine.resolveSwitchPatchMapping !== "function") return null;
    if (!switchPatchCache[sw.instanceId]) {
      switchPatchCache[sw.instanceId] = PortEngine.resolveSwitchPatchMapping(sw);
    }
    return switchPatchCache[sw.instanceId];
  };

  const resolveDevicePatchEntry = (dev, hostSw) => {
    if (!dev || !hostSw) return null;
    const pm = getCachedSwitchPatchMapping(hostSw);
    if (!pm || !pm.byPortNumber) return null;
    const entries = Object.values(pm.byPortNumber);
    let match = entries.find(e => e.connectedDeviceId === dev.instanceId);
    if (!match && dev.assignedSwitchPort) {
      match = pm.byPortNumber[parseInt(dev.assignedSwitchPort, 10)] || null;
    }
    return match || null;
  };

  // Render Location Clusters
  Object.keys(groups).forEach(loc => {
    const items = groups[loc] || [];
    const isClusterSelected = selectedTopologyRackLoc === loc;
    const isFieldCluster = loc.endsWith("• Field Drops") || loc.toLowerCase().includes("field drop");
    const clusterPduMetrics = (!isFieldCluster && typeof getRackPduMetricsForLocation === "function")
      ? getRackPduMetricsForLocation(loc)
      : null;

    // Look up physical Rack/Enclosure Frame SKU & Rack UPS assigned to this location in projectBOM
    const rackEnclosureBomItem = !isFieldCluster ? projectBOM.find(i =>
      !i.parentInstanceId &&
      (i.isEnclosureFrame || i.role === "Equipment Rack" || i.role === "19\" Equipment Racks" || i.role === "Cabinets & Enclosures" || i.role === "Security Cabinet" || i.role === "Industrial NEMA Enclosure" || i.category === "racks" || i.category === "enclosures") &&
      FacilityStore.normalize(i.closetName || i.rackId) === loc
    ) : null;
    const rackUpsBomItem = !isFieldCluster ? projectBOM.find(i =>
      !i.parentInstanceId &&
      (i.role === "Rack UPS Power" || i.role === "UPS" || i.category === "ups") &&
      FacilityStore.normalize(i.closetName || i.rackId) === loc
    ) : null;

    // Align rack preview inside cluster with Enclosure Visualizer top-to-bottom elevation order
    if (!isFieldCluster) {
      items.sort((a, b) => {
        const uA = parseInt(a.rackSlot, 10);
        const uB = parseInt(b.rackSlot, 10);
        if (!isNaN(uA) && !isNaN(uB)) return uB - uA;
        if (!isNaN(uA)) return -1;
        if (!isNaN(uB)) return 1;
        if (a.rackSlot && b.rackSlot) return String(a.rackSlot).localeCompare(String(b.rackSlot));
        const pA = (typeof getDeviceMountPriority === "function") ? getDeviceMountPriority(a).priority : 5;
        const pB = (typeof getDeviceMountPriority === "function") ? getDeviceMountPriority(b).priority : 5;
        return pA - pB;
      });
    }

    const isExteriorCluster = loc.toLowerCase().includes("exterior");
    const clusterWidthClass = isFieldCluster ? (items.length > 2 ? "w-96" : "w-88") : "w-88";
    const clusterBorderClass = isClusterSelected
      ? (isFieldCluster ? 'border-cyan-400 ring-2 ring-cyan-400/50 shadow-cyan-500/20' : 'border-indigo-500 ring-2 ring-indigo-500/50 shadow-indigo-500/20')
      : (isFieldCluster ? 'border-cyan-800/60 bg-slate-900/95 hover:border-cyan-600' : 'border-slate-800 bg-slate-900/90 hover:border-slate-700/80');

    const defaultPos = {
      x: 80 + (groupIndex * 410),
      y: isFieldCluster ? 480 : (90 + ((groupIndex % 2) * 60))
    };
    const pos = savedPositions[loc] || defaultPos;
    const parsed = FacilityStore.parse(loc);

    const clusterEl = document.createElement("div");
    clusterEl.className = `topo-location-cluster absolute select-none ${clusterBorderClass} rounded-2xl p-3.5 shadow-2xl backdrop-blur-md ${clusterWidthClass} transition-all`;
    clusterEl.style.left = `${pos.x}px`;
    clusterEl.style.top = `${pos.y}px`;
    clusterEl.setAttribute("data-location", loc);

    const headerIcon = isFieldCluster
      ? (isExteriorCluster ? 'trees' : 'building')
      : 'server';
    const iconColor = isFieldCluster
      ? (isExteriorCluster ? 'text-emerald-400' : 'text-cyan-400')
      : 'text-indigo-400';
    const iconBg = isClusterSelected
      ? (isFieldCluster ? 'bg-cyan-500 text-white shadow-md' : 'bg-indigo-500 text-white shadow-md')
      : (isFieldCluster ? (isExteriorCluster ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-cyan-500/10 border border-cyan-500/30') : 'bg-indigo-500/10 border border-indigo-500/30');

    const titleColor = isClusterSelected
      ? (isFieldCluster ? 'text-cyan-300' : 'text-indigo-300')
      : 'text-white';
    const subTitleText = isFieldCluster
      ? 'Physical Floor Drops & Endpoints'
      : (rackEnclosureBomItem ? `${escapeHTML(parsed.enclosure)} &bull; ${escapeHTML(rackEnclosureBomItem.sku)}` : escapeHTML(parsed.enclosure));
    const countBadge = isFieldCluster ? `${items.length} ${items.length === 1 ? 'Drop' : 'Drops'}` : `${items.length} Chassis`;

    clusterEl.innerHTML = `
      <!-- Cluster Header -->
      <div 
        class="flex items-center justify-between pb-2.5 mb-3 border-b ${isFieldCluster ? 'border-cyan-900/50' : 'border-slate-800'} cursor-pointer topo-cluster-header group hover:border-cyan-500/40 transition-colors"
        onclick="selectTopologyRack('${escapeJSAttr(loc)}', event)"
        title="Click to inspect this container (or drag to reposition)"
      >
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="p-1.5 rounded-lg ${iconBg} ${iconColor} transition-all shrink-0">
            <i data-lucide="${headerIcon}" class="w-4 h-4"></i>
          </div>
          <div class="min-w-0">
            <span class="text-xs font-bold ${titleColor} tracking-wide block leading-none truncate">${escapeHTML(parsed.space)}</span>
            <span class="text-[10px] font-mono ${isFieldCluster ? 'text-cyan-400/90' : 'text-indigo-400/90'} block mt-1 leading-none truncate" title="${rackEnclosureBomItem ? escapeHTML(rackEnclosureBomItem.model) : ''}">${subTitleText}</span>
          </div>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          ${rackUpsBomItem ? `
            <span
              class="text-[9px] font-mono text-emerald-300 bg-emerald-950/60 px-1.5 py-0.5 rounded-lg border border-emerald-700/50 flex items-center gap-1"
              title="Rack UPS Backup: ${escapeHTML(rackUpsBomItem.model)} (${escapeHTML(rackUpsBomItem.sku)})"
            >
              <i data-lucide="battery-charging" class="w-2.5 h-2.5 text-emerald-400"></i>
              <span>UPS</span>
            </span>
          ` : ''}
          ${clusterPduMetrics ? `
            <button
              type="button"
              onclick="event.stopPropagation(); openRackPowerMatrixModal(null, null, null, '${escapeJSAttr(loc)}')"
              class="text-[9px] font-mono text-amber-300 hover:text-white bg-amber-950/60 hover:bg-amber-900/80 px-1.5 py-0.5 rounded-lg border border-amber-700/50 flex items-center gap-1 transition-colors cursor-pointer"
              title="Rack PDUs: ${escapeHTML(clusterPduMetrics.pduA.sku)} (${clusterPduMetrics.pduA.amps}A${clusterPduMetrics.pduConfig === 'single_vertical' || clusterPduMetrics.pduConfig === 'horizontal' ? '' : ` + ${clusterPduMetrics.pduB.amps}A`}) — Click to open Power Matrix Studio"
            >
              <i data-lucide="zap" class="w-2.5 h-2.5 text-amber-400"></i>
              <span>${escapeHTML(clusterPduMetrics.pduA.sku)}</span>
            </button>
          ` : ''}
          <span class="text-[10px] font-mono text-slate-300 bg-slate-950 px-2 py-0.5 rounded-lg border ${isFieldCluster ? 'border-cyan-800/40 text-cyan-300' : 'border-slate-800'}">
            ${countBadge}
          </span>
          ${isClusterSelected ? `
            <span class="w-2 h-2 rounded-full ${isFieldCluster ? 'bg-cyan-400' : 'bg-indigo-400'} animate-pulse" title="Inspecting Container"></span>
          ` : ''}
        </div>
      </div>

      <!-- Equipment Nodes inside Cluster -->
      <div class="${isFieldCluster ? 'space-y-2 max-h-[580px] overflow-y-auto pr-1' : 'space-y-3'}" ${isFieldCluster ? 'onscroll="renderTopologyLinks()"' : ''}>
        ${items.map(item => {
          const isSelected = selectedTopologyNodeId === item.instanceId;
          const isServer = item.role === "Server" || item.role === "VMS Server" || item.role === "Compute & Storage";
          const edgeData = edgeDeviceMap[item.instanceId] || null;
          const srvMetrics = serverMetricsMap[item.instanceId] || null;
          const powerSourceLabel = getPowerSourceLabel(item);
          const hasEdgeDevices = edgeData && (edgeData.cameras > 0 || edgeData.doors > 0 || edgeData.wireless > 0);

          // Check 1:1 Rack PDU Receptacle assignment for this device
          const devPduRecord = (clusterPduMetrics && clusterPduMetrics.byDeviceId && clusterPduMetrics.byDeviceId[item.instanceId])
            ? clusterPduMetrics.byDeviceId[item.instanceId]
            : null;
          let pduFeedBadgeHtml = "";
          if (devPduRecord && devPduRecord.psus) {
            const connPsus = Object.values(devPduRecord.psus).filter(p => p && p.connected);
            if (connPsus.length > 0) {
              const shortFeeds = connPsus.map(p => p.pduShortReceptacle).join(" + ");
              const fullTip = connPsus.map(p => `${p.devicePsuTag} ➔ ${p.pduReceptacleTag} (${p.pduSku}) via ${p.powerCordId} [${p.cordSku}]`).join(" | ");
              const badgeColor = devPduRecord.isDualRedundant
                ? "bg-emerald-950/70 border-emerald-600/50 text-emerald-300"
                : (devPduRecord.isSpof ? "bg-rose-950/70 border-rose-600/50 text-rose-300" : "bg-amber-950/70 border-amber-600/50 text-amber-300");
              pduFeedBadgeHtml = `
                <button
                  type="button"
                  onclick="event.stopPropagation(); openRackPowerMatrixModal(null, null, '${escapeJSAttr(item.instanceId)}', '${escapeJSAttr(loc)}')"
                  class="px-1.5 py-0.2 rounded border ${badgeColor} text-[9px] font-mono font-bold hover:brightness-125 transition-all cursor-pointer truncate max-w-[165px]"
                  title="${escapeHTML(fullTip)} — Click to open in Power Matrix Studio"
                >
                  ${escapeHTML(shortFeeds)}
                </button>
              `;
            }
          }

          if (isServer) {
            // Render Server Chassis Node Card
            const maxCap = item.maxIngestBandwidthMbps || 750;
            const currentIngest = srvMetrics ? Math.round(srvMetrics.ingestMbps) : 0;
            const ingestPercent = Math.min(100, Math.round((currentIngest / maxCap) * 100));
            const hostedRoles = item.hostedRoles || ["VMS Ingest & Recording"];

            return `
              <div 
                class="topo-node-card text-xs space-y-2 p-3 rounded-xl border ${isSelected ? 'border-purple-500 ring-2 ring-purple-500/30 bg-slate-850' : 'border-slate-800 bg-slate-950/80 hover:border-slate-700'} transition-all cursor-pointer shadow-md" 
                id="topo-card-${item.instanceId}"
                onclick="selectTopologyNode('${item.instanceId}', event)"
              >
                <div class="flex items-start justify-between gap-1.5">
                  <div class="min-w-0">
                    <div class="flex items-center gap-1.5 flex-wrap">
                      ${item.rackSlot ? `<span class="px-1.5 py-0.2 rounded bg-indigo-950/90 border border-indigo-600/50 text-[9px] font-mono font-bold text-indigo-300" title="Mounted at Rack Slot U${escapeHTML(String(item.rackSlot))}">U${escapeHTML(String(item.rackSlot))}</span>` : ''}
                      ${item.deviceNumber ? `<span class="px-1.5 py-0.2 rounded bg-purple-900/60 border border-purple-500/40 text-[9px] font-mono font-bold text-purple-300">${escapeHTML(item.deviceNumber)}</span>` : ''}
                      <span class="font-bold text-white truncate block text-xs" title="${escapeHTML(item.friendlyName || item.model)}">${escapeHTML(item.friendlyName || item.model)}</span>
                      <button type="button" onclick="event.stopPropagation(); promptEditDeviceFriendlyName('${item.instanceId}')" class="text-slate-400 hover:text-white p-0.5 rounded hover:bg-slate-800 transition-colors" title="Edit Friendly Name">
                        <i data-lucide="pencil" class="w-2.5 h-2.5"></i>
                      </button>
                    </div>
                    ${item.friendlyName && item.friendlyName !== item.model ? `<span class="text-[10px] text-slate-300 font-medium block truncate">${escapeHTML(item.model)}</span>` : ''}
                    <span class="text-[10px] text-slate-400 font-mono block">${escapeHTML(item.vendor || 'Generic')} &bull; ${item.rackUnits || 2}U Appliance</span>
                  </div>
                  <span class="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-purple-500/40 bg-purple-500/10 text-purple-300 shrink-0">
                    Server
                  </span>
                </div>

                <!-- Hosted Software Roles -->
                <div class="flex flex-wrap gap-1 pt-1">
                  ${hostedRoles.map(role => `
                    <span class="text-[9px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-semibold">
                      ${escapeHTML(role)}
                    </span>
                  `).join('')}
                </div>

                <!-- Video Ingest Bandwidth Bar -->
                <div class="space-y-1 pt-1 border-t border-slate-900">
                  <div class="flex justify-between text-[10px] font-mono">
                    <span class="text-slate-500">Video Ingest:</span>
                    <span class="text-teal-300 font-bold">${currentIngest} Mbps / ${maxCap} Mbps (${srvMetrics ? srvMetrics.cameraCount : 0} Cams)</span>
                  </div>
                  <div class="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                    <div 
                      class="h-full rounded-full transition-all ${ingestPercent > 85 ? 'bg-rose-500' : 'bg-teal-400'}" 
                      style="width: ${ingestPercent}%"
                    ></div>
                  </div>
                </div>

                <!-- Power & Rack PDU Receptacle Telemetry -->
                <div class="flex items-center justify-between pt-1 border-t border-slate-900 text-[10px] font-mono text-slate-400 gap-1">
                  <div class="flex items-center gap-1 min-w-0">
                    <i data-lucide="zap" class="w-3 h-3 text-amber-400 shrink-0"></i>
                    ${pduFeedBadgeHtml || `<span class="truncate">${powerSourceLabel}</span>`}
                  </div>
                  <span class="text-slate-300 shrink-0">${item.baseWatts || 300}W Base</span>
                </div>
              </div>
            `;
          }

          // Render Field Device Card (Cameras, Access Readers, Intercoms)
          const isFieldDev = (typeof FacilityStore !== "undefined" && typeof FacilityStore.isFieldDevice === "function") 
            ? FacilityStore.isFieldDevice(item) 
            : (item.role === "Camera" || item.role === "Access Control" || item.role === "Intercom");
          if (isFieldDev) {
            const isCam = item.role === "Camera" || (item.category && item.category.includes("camera"));
            const hostSw = item.uplinkTargetId ? projectBOM.find(s => s.instanceId === item.uplinkTargetId) : null;
            const hostCloset = hostSw ? (hostSw.closetName || hostSw.rackId || "IDF/MDF") : null;
            const hostClosetShort = hostCloset ? hostCloset.split('•')[0].trim() : 'MDF/IDF';
            const pWatts = item.consumedPoEWatts || item.powerConsumptionWatts || item.baseWatts || 0;
            const patchEntry = resolveDevicePatchEntry(item, hostSw);
            return `
              <div 
                class="topo-node-card text-xs space-y-1.5 p-2.5 rounded-xl border ${isSelected ? 'border-cyan-400 ring-2 ring-cyan-400/50 bg-slate-850 shadow-cyan-900/30' : 'border-slate-800 bg-slate-950/80 hover:border-cyan-700/60'} transition-all cursor-pointer shadow-md select-none"
                id="topo-card-${item.instanceId}"
                onclick="selectTopologyNode('${item.instanceId}', event)"
              >
                <div class="flex items-start justify-between gap-1.5">
                  <div class="flex items-center gap-2 min-w-0">
                    <div class="p-1.5 rounded-lg bg-cyan-950/60 border border-cyan-800 text-cyan-400 shrink-0">
                      <i data-lucide="${isCam ? 'camera' : (item.role === 'Intercom' ? 'radio' : 'shield')}" class="w-3.5 h-3.5"></i>
                    </div>
                    <div class="min-w-0">
                      <div class="flex items-center gap-1.5 flex-wrap">
                        ${item.deviceNumber ? `<span class="px-1.5 py-0.2 rounded bg-cyan-900/60 border border-cyan-500/40 text-[9px] font-mono font-bold text-cyan-300">${escapeHTML(item.deviceNumber)}</span>` : ''}
                        ${patchEntry && patchEntry.horizontalCableId ? `<span class="px-1.5 py-0.2 rounded bg-amber-950/80 border border-amber-600/50 text-[9px] font-mono font-bold text-amber-300" title="Orion Horizontal Cable Run ID: ${escapeHTML(patchEntry.horizontalCableId)}">${escapeHTML(patchEntry.horizontalCableId)}</span>` : ''}
                        <span class="font-bold text-white truncate block text-xs" title="${escapeHTML(item.friendlyName || item.model)}">${escapeHTML(item.friendlyName || item.model)}</span>
                        <button type="button" onclick="event.stopPropagation(); promptEditDeviceFriendlyName('${item.instanceId}')" class="text-slate-400 hover:text-white p-0.5 rounded hover:bg-slate-800 transition-colors" title="Edit Friendly Name">
                          <i data-lucide="pencil" class="w-2.5 h-2.5"></i>
                        </button>
                      </div>
                      ${item.friendlyName && item.friendlyName !== item.model ? `<span class="text-[10px] text-slate-300 font-medium block truncate">${escapeHTML(item.model)}</span>` : ''}
                      <span class="text-[10px] text-slate-400 font-mono block">${escapeHTML(item.role || 'Field Drop')} &bull; ${pWatts}W PoE</span>
                    </div>
                  </div>
                  <span class="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border border-cyan-500/40 bg-cyan-500/10 text-cyan-300 shrink-0">
                    ${patchEntry ? escapeHTML(patchEntry.switchPortTag) : 'Field Drop'}
                  </span>
                </div>
                ${hostSw ? `
                  <div class="flex items-center justify-between pt-1 border-t border-slate-900 text-[10px] font-mono gap-1">
                    <span class="text-slate-400 shrink-0">Path:</span>
                    <span class="text-cyan-300 font-semibold truncate" title="Orion Path: ${patchEntry ? `${escapeHTML(patchEntry.horizontalCableId)} ➔ ${escapeHTML(patchEntry.patchPanelId)}:${escapeHTML(patchEntry.keystoneJackLabel)} ➔ ${escapeHTML(patchEntry.switchPortTag)}` : `${escapeHTML(hostCloset || '')} • ${escapeHTML(hostSw.friendlyName || hostSw.model)}`}">
                      ${patchEntry
                        ? `<span class="text-amber-300">${escapeHTML(patchEntry.panelTag)}</span> &rarr; <span class="text-sky-300">${escapeHTML(patchEntry.switchPortTag)}</span> <span class="text-slate-500">(${escapeHTML(hostClosetShort)})</span>`
                        : `<span class="text-sky-400">${escapeHTML(hostClosetShort)}</span>: ${escapeHTML(hostSw.friendlyName || hostSw.model)}`}
                    </span>
                  </div>
                ` : `
                  <div class="flex items-center justify-between pt-1 border-t border-slate-900 text-[10px] font-mono text-slate-500 italic">
                    <span>Home-Run:</span>
                    <span>Direct Local Feed</span>
                  </div>
                `}
              </div>
            `;
          }

          // Render Switch Chassis Node Card
          if (typeof enrichBOMItemFromCatalog === "function") enrichBOMItemFromCatalog(item);
          const isStacked = (item.stackedUnits && item.stackedUnits >= 2) || 
            (item.stackedUnits !== 0 && item.qty >= 2 && (item.canStack || item.role === "Access" || item.role === "Aggregation"));
          const stackUnits = isStacked ? (item.stackedUnits || item.qty) : 1;
          const basePortsPerUnit = item.ports || 24;
          const totalStackPorts = basePortsPerUnit * stackUnits;
          const totalStackPoE = (item.poeBudget || 0) * stackUnits;
          const totalStackBaseWatts = (item.baseWatts || 0) * stackUnits;
          const itemRU = (item.rackUnits !== undefined && item.rackUnits !== null) ? item.rackUnits : 1;

          return `
            <div 
              class="topo-node-card text-xs space-y-2 p-3 rounded-xl border ${isSelected ? 'border-brand-500 ring-2 ring-brand-500/40 bg-slate-850' : (isStacked ? 'border-indigo-500/50 bg-slate-950/90 hover:border-indigo-400' : 'border-slate-800 bg-slate-950/80 hover:border-slate-700')} transition-all cursor-pointer shadow-md ${isStacked ? 'shadow-indigo-950/30' : ''}" 
              id="topo-card-${item.instanceId}"
              onclick="selectTopologyNode('${item.instanceId}', event)"
            >
              <div class="flex items-start justify-between gap-1.5">
                <div class="min-w-0">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    ${item.rackSlot ? `<span class="px-1.5 py-0.2 rounded bg-indigo-950/90 border border-indigo-600/50 text-[9px] font-mono font-bold text-indigo-300" title="Mounted at Rack Slot U${escapeHTML(String(item.rackSlot))}">U${escapeHTML(String(item.rackSlot))}</span>` : ''}
                    ${item.deviceNumber ? `<span class="px-1.5 py-0.2 rounded bg-brand-900/60 border border-brand-500/40 text-[9px] font-mono font-bold text-brand-300">${escapeHTML(item.deviceNumber)}</span>` : ''}
                    <span class="font-bold text-white truncate block text-xs" title="${escapeHTML(item.friendlyName || item.model)}">${escapeHTML(item.friendlyName || item.model)}</span>
                    <button type="button" onclick="event.stopPropagation(); promptEditDeviceFriendlyName('${item.instanceId}')" class="text-slate-400 hover:text-white p-0.5 rounded hover:bg-slate-800 transition-colors" title="Edit Friendly Name">
                      <i data-lucide="pencil" class="w-2.5 h-2.5"></i>
                    </button>
                  </div>
                  ${item.friendlyName && item.friendlyName !== item.model ? `<span class="text-[10px] text-slate-300 font-medium block truncate">${escapeHTML(item.model)}</span>` : ''}
                  <span class="text-[10px] text-slate-400 font-mono block">
                    ${escapeHTML(item.vendor || 'Generic')} &bull; ${isStacked ? `<span class="text-indigo-300 font-semibold">${stackUnits}x Member Virtual Chassis &bull; ${itemRU * stackUnits}U</span>` : `${itemRU}U &bull; SKU: ${escapeHTML(item.sku || 'N/A')}`}
                  </span>
                </div>
                <div class="flex items-center gap-1 shrink-0">
                  ${isStacked ? `
                    <span class="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border border-indigo-500/50 bg-indigo-500/20 text-indigo-300" title="Unified virtual chassis stack of ${stackUnits} physical units">
                      Stack (${stackUnits}U)
                    </span>
                  ` : ''}
                  <span class="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${getRoleBadgeStyle(item.role)}">
                    ${item.role}
                  </span>
                </div>
              </div>

              ${isStacked ? `
                <div class="flex items-center justify-between bg-indigo-950/40 border border-indigo-800/40 rounded-lg px-2 py-0.5 text-[9px] font-mono text-indigo-300">
                  <span class="flex items-center gap-1">
                    <i data-lucide="layers" class="w-3 h-3 text-indigo-400"></i>
                    <span>Single Logical Virtual Chassis</span>
                  </span>
                  <span class="text-indigo-400/90">${stackUnits} Physical Units</span>
                </div>
              ` : ''}

              <!-- Power & Port Telemetry -->
              <div class="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-slate-900 text-[10px] font-mono">
                <div class="flex items-center gap-1 text-slate-400 min-w-0">
                  <i data-lucide="zap" class="w-3 h-3 text-amber-400 shrink-0"></i>
                  ${pduFeedBadgeHtml || `<span class="truncate">${powerSourceLabel}${isStacked ? ` (${stackUnits}x PSUs &bull; ${totalStackBaseWatts}W)` : ''}</span>`}
                </div>
                <div class="flex items-center justify-end gap-1 text-slate-400">
                  <i data-lucide="layers" class="w-3 h-3 text-sky-400 shrink-0"></i>
                  <span title="${escapeHTML(item.uplinksSummary || item.portFormFactorSummary || '')}">${totalStackPorts} Ports ${isStacked ? `(${stackUnits}x ${basePortsPerUnit}P)` : ''}${item.uplinksSummary ? ` &bull; ${escapeHTML(item.uplinksSummary.split('+')[0].trim())}` : ''}</span>
                </div>
              </div>

              ${(item.uplinkTargetId && item.role !== "Access" && item.role !== "Core" && item.role !== "Core & Agg" && item.role !== "Aggregation") ? `
                <div class="flex items-center justify-between pt-1 border-t border-slate-900 text-[10px] font-mono">
                  <span class="text-slate-500">Host Switch:</span>
                  <span class="text-sky-300 font-bold truncate max-w-[160px]" title="Connected to ${escapeHTML((projectBOM.find(s => s.instanceId === item.uplinkTargetId) || {}).model || 'Switch')}">
                    ${escapeHTML((projectBOM.find(s => s.instanceId === item.uplinkTargetId) || {}).model || 'Switch')} (Port ${item.assignedSwitchPort || 'Auto'})
                  </span>
                </div>
              ` : ''}

              <!-- PoE Allocation Bar (for PoE Switches) -->
              ${totalStackPoE > 0 ? `
                <div class="space-y-1 pt-1 border-t border-slate-900">
                  <div class="flex justify-between text-[10px] font-mono">
                    <span class="text-slate-500">PoE Power:</span>
                    <span class="text-amber-300 font-bold">${item.consumedPoEWatts || 0}W / ${totalStackPoE}W ${isStacked ? `(${stackUnits}x ${item.poeBudget}W)` : ''}</span>
                  </div>
                  <div class="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                    <div 
                      class="h-full rounded-full transition-all ${((item.consumedPoEWatts || 0) > totalStackPoE) ? 'bg-rose-500' : 'bg-amber-400'}" 
                      style="width: ${Math.min(100, Math.round(((item.consumedPoEWatts || 0) / totalStackPoE) * 100))}%"
                    ></div>
                  </div>
                </div>
              ` : ''}

              <!-- Connected Edge Client Pools (Cameras, Access, Wireless) -->
              ${hasEdgeDevices && activeTopologyViewPlane !== "backbone" ? `
                <div class="pt-1.5 border-t border-slate-900 space-y-1">
                  ${edgeData.cameras > 0 ? `
                    <div class="flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-lg px-2 py-1 text-[10px]">
                      <div class="flex items-center gap-1.5 text-teal-300">
                        <i data-lucide="video" class="w-3 h-3"></i>
                        <span class="font-bold">${edgeData.cameras}x Streams (${Math.round(edgeData.cameraMbps)} Mbps)</span>
                      </div>
                      <span class="font-mono text-amber-400 font-bold">${Math.round(edgeData.cameraWatts)}W PoE</span>
                    </div>
                  ` : ''}
                  ${edgeData.doors > 0 ? `
                    <div class="flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-lg px-2 py-1 text-[10px]">
                      <div class="flex items-center gap-1.5 text-emerald-300">
                        <i data-lucide="shield" class="w-3 h-3"></i>
                        <span class="font-bold">${edgeData.doors}x Access Readers</span>
                      </div>
                      <span class="font-mono text-emerald-400 font-bold">${Math.round(edgeData.doorWatts)}W</span>
                    </div>
                  ` : ''}
                </div>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>
    `;

    const header = clusterEl.querySelector(".topo-cluster-header");
    header.addEventListener("mousedown", (e) => handleClusterMouseDown(e, clusterEl, loc));

    container.appendChild(clusterEl);
    groupIndex++;
  });

  generateTopologyLinks(activeNodes, edgeDeviceMap);
  
  // Compute total project PoE delivery flow
  let totalPoEFlow = 0;
  activeNodes.forEach(n => {
    if (n.consumedPoEWatts) totalPoEFlow += parseFloat(n.consumedPoEWatts);
  });

  updateTopologyCounters(activeNodes.length, topologyLinks.length, Math.round(totalPoEFlow));
  renderTopologyLinks();
  applyTopologyZoom();
  populateTopologyQuickJump();

  if (typeof safeCreateIcons === "function") {
    safeCreateIcons(container);
  } else if (window.lucide) {
    lucide.createIcons();
  }
}

// -----------------------------------------------------------
// Link Determination & Wire-Speed Auto-Negotiation
// -----------------------------------------------------------
function generateTopologyLinks(nodes, edgeDeviceMap = {}) {
  topologyLinks = [];

  const gateways = nodes.filter(n => n.role === "Gateways & WAN" || n.role === "Security WAN" || n.role === "Firewall" || n.category === "firewall" || n.category === "Firewall");
  const cores = nodes.filter(n => n.role === "Core" || n.role === "Core & Agg" || n.role === "Aggregation");
  const access = nodes.filter(n => n.role === "Access");
  const wireless = nodes.filter(n => n.role === "Wireless Bridge");
  const servers = nodes.filter(n => n.role === "Server" || n.role === "Compute & Storage" || n.role === "VMS Server");

  // 1. Gateway -> Core/Aggregation Interconnects (or Gateway -> Access if no Core)
  gateways.forEach(gw => {
    if (cores.length > 0) {
      cores.forEach(c => {
        const speed = resolveNegotiatedSpeed(gw, c);
        topologyLinks.push({
          id: `link-${gw.instanceId}-${c.instanceId}`,
          fromId: gw.instanceId,
          toId: c.instanceId,
          multiplier: 2,
          isLAG: true,
          speedLabel: `2x ${speed} LAG`,
          rawSpeed: speed,
          category: "backbone",
          isPoEDelivery: false
        });
      });
    } else if (access.length > 0) {
      const primaryAccess = access[0];
      const speed = resolveNegotiatedSpeed(gw, primaryAccess);
      topologyLinks.push({
        id: `link-${gw.instanceId}-${primaryAccess.instanceId}`,
        fromId: gw.instanceId,
        toId: primaryAccess.instanceId,
        multiplier: 1,
        isLAG: false,
        speedLabel: `${speed} Gateway Uplink`,
        rawSpeed: speed,
        category: "backbone",
        isPoEDelivery: false
      });
    }
  });

  // 2. Core/Aggregation -> Access Uplinks & Peer Cascades
  access.forEach(acc => {
    let target = null;
    const accLoc = FacilityStore.normalize(acc.closetName);

    if (acc.customUplinkTargetId) {
      target = nodes.find(n => n.instanceId === acc.customUplinkTargetId) || projectBOM.find(n => n.instanceId === acc.customUplinkTargetId);
    }
    if (!target) {
      // 1. Check if there is a core or aggregation switch in the same closet
      target = cores.find(c => FacilityStore.normalize(c.closetName) === accLoc);
    }
    if (!target) {
      // 2. Check if there is a local Wireless Bridge in the same closet/pole providing backhaul
      target = wireless.find(w => FacilityStore.normalize(w.closetName) === accLoc);
    }
    if (!target && typeof FacilityStore !== "undefined") {
      // 2b. Check if there is a Wireless Bridge in the same Space / Pole (e.g. East Gate Pole)
      const accSpace = FacilityStore.parse(acc.closetName).space.toLowerCase();
      if (accSpace && accSpace !== "unassigned" && accSpace !== "field") {
        target = wireless.find(w => {
          const wSpace = FacilityStore.parse(w.closetName).space.toLowerCase();
          return wSpace === accSpace;
        });
      }
    }
    if (!target) {
      // 3. Fallback to primary core / gateway
      target = cores[0] || gateways[0];
    }

    if (target && target.instanceId !== acc.instanceId) {
      const isTargetRadio = target.role === "Wireless Bridge" || target.category === "wireless";
      const isTargetAccess = target.role === "Access";
      const isStacked = (acc.stackedUnits && acc.stackedUnits >= 2) || 
        (acc.stackedUnits !== 0 && acc.qty >= 2 && (acc.canStack || acc.role === "Access" || acc.role === "Aggregation"));
      const stackUnits = isStacked ? (acc.stackedUnits || acc.qty) : 1;
      const defaultMultiplier = isStacked ? Math.max(2, acc.customLinkMultiplier || 2) : (acc.customLinkMultiplier || 1);
      const multiplier = acc.customLinkMultiplier || defaultMultiplier;
      const speed = acc.customLinkSpeed || resolveNegotiatedSpeed(acc, target);
      const isLAG = (multiplier > 1 || isStacked) && !isTargetRadio;

      if (isTargetRadio) {
        // Reverse uplink pattern: Switch on pole uplinks through the P2P Radio Station
        const radioPowersFromSwitch = (target.powerSourceOverride === "poe_switch" || !target.powerSourceOverride);
        topologyLinks.push({
          id: `link-${acc.instanceId}-${target.instanceId}`,
          fromId: acc.instanceId,
          toId: target.instanceId,
          multiplier: 1,
          isLAG: false,
          speedLabel: `${speed} Wireless Uplink Handoff`,
          rawSpeed: speed,
          category: "wireless_handoff",
          isPoEDelivery: radioPowersFromSwitch
        });
      } else if (isTargetAccess) {
        // Access-to-Access daisy chain or ring cascade
        topologyLinks.push({
          id: `link-${target.instanceId}-${acc.instanceId}`,
          fromId: target.instanceId,
          toId: acc.instanceId,
          multiplier,
          isLAG,
          isCrossStack: isStacked,
          speedLabel: isLAG ? `${multiplier}x ${speed} Cascade LAG` : `${speed} Cascade Trunk`,
          rawSpeed: speed,
          category: "switch_trunk",
          isPoEDelivery: false
        });
      } else {
        // Standard Core/Gateway uplink
        const isGateway = target.role === "Gateways & WAN" || target.role === "Security WAN" || target.role === "Firewall" || target.category === "firewall";
        const speedLabel = isGateway
          ? (isLAG ? `${multiplier}x ${speed} Gateway LAG` : `${speed} Gateway Uplink`)
          : (isStacked 
              ? `${multiplier}x ${speed} Cross-Stack LACP LAG (${stackUnits} Units)` 
              : (isLAG ? `${multiplier}x ${speed} LAG` : `${speed} Uplink`));

        const linkId = `link-${target.instanceId}-${acc.instanceId}`;
        const alreadyLinked = topologyLinks.some(l => 
          (l.fromId === target.instanceId && l.toId === acc.instanceId) ||
          (l.fromId === acc.instanceId && l.toId === target.instanceId)
        );

        if (!alreadyLinked) {
          topologyLinks.push({
            id: linkId,
            fromId: target.instanceId,
            toId: acc.instanceId,
            multiplier,
            isLAG,
            isCrossStack: isStacked && !isGateway,
            speedLabel,
            rawSpeed: speed,
            category: isGateway ? "backbone" : "access",
            isPoEDelivery: false
          });
        }
      }
    }
  });

  // 3. Server / Compute Node Ingest Uplinks (Attached to Core or Access)
  servers.forEach(srv => {
    let target = null;
    if (srv.customUplinkTargetId) {
      target = nodes.find(n => n.instanceId === srv.customUplinkTargetId);
    }
    if (!target) {
      target = cores[0] || access[0] || gateways[0];
    }

    if (target && target.instanceId !== srv.instanceId) {
      const speed = resolveNegotiatedSpeed(srv, target);
      topologyLinks.push({
        id: `link-${target.instanceId}-${srv.instanceId}`,
        fromId: target.instanceId,
        toId: srv.instanceId,
        multiplier: 2,
        isLAG: true,
        speedLabel: `2x ${speed} Server Ingest`,
        rawSpeed: speed,
        category: "server",
        isPoEDelivery: false
      });
    }
  });

  // 4. Wireless Bridge PtP / PtMP Links & Host Handoffs
  wireless.forEach(wb => {
    // A. Check for PtP paired radio link
    if (wb.linkPairId) {
      const partner = wireless.find(w => w.linkPairId === wb.linkPairId && w.instanceId !== wb.instanceId);
      if (partner && wb.instanceId < partner.instanceId) {
        topologyLinks.push({
          id: `link-rf-${wb.instanceId}-${partner.instanceId}`,
          fromId: wb.instanceId,
          toId: partner.instanceId,
          multiplier: 1,
          isLAG: false,
          speedLabel: wb.maxThroughput || "5.4 Gbps RF Bridge",
          rawSpeed: "2.5G",
          category: "wireless",
          isWireless: true,
          isPoEDelivery: false
        });
      }
    }

    // B. Check connection to host switch (data & PoE)
    let hostSwitch = null;
    const isRemoteStation = wb.linkPairId && (
      (wb.model && (wb.model.includes("Remote") || wb.model.includes("Station") || wb.model.includes("Substation"))) ||
      (wb.friendlyName && (wb.friendlyName.includes("P2P02") || wb.friendlyName.includes("Remote")))
    );
    const partnerRadio = wb.linkPairId ? wireless.find(w => w.linkPairId === wb.linkPairId && w.instanceId !== wb.instanceId) : null;

    if (wb.connectedHostSwitchId) {
      hostSwitch = nodes.find(n => n.instanceId === wb.connectedHostSwitchId);
    } else if (wb.uplinkTargetId) {
      hostSwitch = nodes.find(n => n.instanceId === wb.uplinkTargetId);
    } else {
      const wbLoc = FacilityStore.normalize(wb.closetName);
      hostSwitch = access.find(a => FacilityStore.normalize(a.closetName) === wbLoc) || cores.find(c => FacilityStore.normalize(c.closetName) === wbLoc);
      if (!hostSwitch && typeof FacilityStore !== "undefined") {
        const wbSpace = FacilityStore.parse(wb.closetName).space.toLowerCase();
        if (wbSpace && wbSpace !== "unassigned" && wbSpace !== "field") {
          hostSwitch = access.find(a => FacilityStore.parse(a.closetName).space.toLowerCase() === wbSpace);
        }
      }
    }

    // A Remote Station radio must NOT connect to the same host switch that the Local Master is plugged into!
    // (This eliminates the double-line loop to MDF200)
    if (isRemoteStation && partnerRadio && hostSwitch) {
      const partnerHostId = partnerRadio.connectedHostSwitchId || partnerRadio.uplinkTargetId;
      if (partnerHostId === hostSwitch.instanceId) {
        hostSwitch = null;
      }
    }

    if (hostSwitch && hostSwitch.instanceId !== wb.instanceId) {
      const alreadyLinked = topologyLinks.some(l => 
        (l.fromId === hostSwitch.instanceId && l.toId === wb.instanceId) ||
        (l.fromId === wb.instanceId && l.toId === hostSwitch.instanceId)
      );

      if (!alreadyLinked) {
        const isPoE = (wb.powerSourceOverride === "poe_switch" || wb.powerSource === "poe_switch" || (typeof PortEngine !== "undefined" && PortEngine.getDevicePowerSource(wb) === "poe_switch"));
        topologyLinks.push({
          id: `link-${hostSwitch.instanceId}-${wb.instanceId}`,
          fromId: hostSwitch.instanceId,
          toId: wb.instanceId,
          multiplier: 1,
          isLAG: false,
          speedLabel: isPoE ? "1G PoE Handoff" : "1G Data Handoff",
          rawSpeed: "1G",
          category: "wireless_handoff",
          isWireless: false,
          isPoEDelivery: isPoE
        });
      }
    }
  });

  // 5. Logical VMS Video Recording Ingest Streams (Edge Switch -> VMS Server)
  if (activeTopologyViewPlane === "vms" || activeTopologyViewPlane === "all") {
    const vmsServers = servers.filter(s => (s.hostedRoles && s.hostedRoles.includes("VMS Ingest & Recording")) || s.serverType === "vms_recording" || s.role === "VMS Server" || s.role === "Server");

    if (vmsServers.length > 0) {
      access.forEach(acc => {
        const edgeData = edgeDeviceMap[acc.instanceId];
        if (edgeData && edgeData.cameras > 0 && edgeData.cameraMbps > 0) {
          let targetServer = null;
          if (acc.assignedVmsServerId) {
            targetServer = vmsServers.find(s => s.instanceId === acc.assignedVmsServerId);
          }
          if (!targetServer) {
            targetServer = vmsServers[0];
          }

          if (targetServer && targetServer.instanceId !== acc.instanceId) {
            topologyLinks.push({
              id: `vms-stream-${acc.instanceId}-${targetServer.instanceId}`,
              fromId: acc.instanceId,
              toId: targetServer.instanceId,
              multiplier: 1,
              isLAG: false,
              speedLabel: `${Math.round(edgeData.cameraMbps)} Mbps Video Ingest`,
              rawSpeed: `${Math.round(edgeData.cameraMbps)}M`,
              category: "vms_stream",
              isPoEDelivery: false
            });
          }
        }
      });
    }
  }

  // 6. Logical Access Control Engine Communication (Edge Switch -> Access Server)
  if (activeTopologyViewPlane === "access" || activeTopologyViewPlane === "all") {
    const accessServers = servers.filter(s => (s.hostedRoles && s.hostedRoles.includes("Access Control Engine")) || s.serverType === "access_security_host" || s.role === "Server");

    if (accessServers.length > 0) {
      access.forEach(acc => {
        const edgeData = edgeDeviceMap[acc.instanceId];
        if (edgeData && edgeData.doors > 0) {
          let targetServer = null;
          if (acc.assignedAccessServerId) {
            targetServer = accessServers.find(s => s.instanceId === acc.assignedAccessServerId);
          }
          if (!targetServer) {
            targetServer = accessServers[0];
          }

          if (targetServer && targetServer.instanceId !== acc.instanceId) {
            topologyLinks.push({
              id: `access-link-${acc.instanceId}-${targetServer.instanceId}`,
              fromId: acc.instanceId,
              toId: targetServer.instanceId,
              multiplier: 1,
              isLAG: false,
              speedLabel: `${edgeData.doors} Doors Engine Link`,
              rawSpeed: "Access",
              category: "access_link",
              isPoEDelivery: false
            });
          }
        }
      });
    }
  }

  // 7. Field Device Cable Drops (When Field Devices are toggled ON)
  if (showTopologyFieldDevices) {
    const fieldDevices = nodes.filter(n => 
      (n.role === "Camera" || (n.category && n.category.includes("camera")) ||
       n.role === "Access Control" || (n.category && n.category.includes("access")) ||
       n.role === "Intercom" || (n.category && n.category.includes("intercom")) ||
       (n.closetName && isFieldLocation(n.closetName))) &&
      n.role !== "Wireless Bridge" && n.category !== "wireless"
    );

    fieldDevices.forEach(dev => {
      let host = null;
      if (dev.uplinkTargetId) {
        host = nodes.find(n => n.instanceId === dev.uplinkTargetId) || projectBOM.find(n => n.instanceId === dev.uplinkTargetId);
      }
      if (!host && access.length > 0) {
        const devLoc = FacilityStore.normalize(dev.closetName || dev.rackId);
        host = access.find(a => FacilityStore.normalize(a.closetName || a.rackId) === devLoc);
        if (!host && typeof FacilityStore !== "undefined") {
          const devSpace = FacilityStore.parse(dev.closetName || dev.rackId).space.toLowerCase();
          if (devSpace && devSpace !== "unassigned" && devSpace !== "field") {
            host = access.find(a => FacilityStore.parse(a.closetName || a.rackId).space.toLowerCase() === devSpace);
          }
        }
        if (!host) host = access[0];
      }
      if (host && host.instanceId !== dev.instanceId) {
        const alreadyLinked = topologyLinks.some(l => 
          (l.fromId === host.instanceId && l.toId === dev.instanceId) ||
          (l.fromId === dev.instanceId && l.toId === host.instanceId)
        );
        if (alreadyLinked) return;

        const isPoE = (dev.consumedPoEWatts || dev.powerConsumptionWatts || dev.maxPowerWatts || 0) > 0;
        const watts = dev.consumedPoEWatts || dev.powerConsumptionWatts || dev.maxPowerWatts || 0;
        let patchInfo = null;
        if (typeof PortEngine !== "undefined" && typeof PortEngine.resolveSwitchPatchMapping === "function") {
          const patchData = PortEngine.resolveSwitchPatchMapping(host);
          if (patchData && patchData.byPortNumber && dev.assignedSwitchPort) {
            patchInfo = patchData.byPortNumber[dev.assignedSwitchPort];
          }
        }
        const orionRunTag = patchInfo
          ? `${patchInfo.horizontalCableId} • ${patchInfo.panelTag}-${String(patchInfo.jackNumber).padStart(2, '0')} ➔ ${patchInfo.switchPortTag}`
          : (dev.assignedSwitchPort ? `Port ${dev.assignedSwitchPort}` : "");
        const dropLabel = orionRunTag
          ? (isPoE ? `${orionRunTag} (${watts}W)` : orionRunTag)
          : (isPoE ? `Cat6 PoE Drop (${watts}W)` : "Cat6 Drop");
        topologyLinks.push({
          id: `link-field-${host.instanceId}-${dev.instanceId}`,
          fromId: host.instanceId,
          toId: dev.instanceId,
          multiplier: 1,
          isLAG: false,
          speedLabel: dropLabel,
          rawSpeed: "1G",
          category: "field_drop",
          isFieldDrop: true,
          isPoEDelivery: isPoE,
          orionPatchInfo: patchInfo
        });
      }
    });
  }

  // 8. Detect Resilient Ring Loops & Peer Links (e.g. Access switches connected in a loop)
  topologyLinks.forEach(link => {
    const nodeA = nodes.find(n => n.instanceId === link.fromId);
    const nodeB = nodes.find(n => n.instanceId === link.toId);
    // If two switches of Access tier are interconnected or loop back
    if (nodeA && nodeB && (nodeA.role === "Access" && nodeB.role === "Access")) {
      link.isRing = true;
      if (!link.speedLabel.includes("Ring")) {
        link.speedLabel = `${link.speedLabel} (Ring Trunk)`;
      }
    }
  });
}

/**
 * Auto-negotiates highest mutual link speed between two devices
 */
function resolveNegotiatedSpeed(nodeA, nodeB) {
  if (!nodeA || !nodeB) return "10G";

  const getSpeeds = (n) => {
    if (typeof enrichBOMItemFromCatalog === "function") {
      enrichBOMItemFromCatalog(n);
    }
    const supported = [1]; // Standard 1G baseline

    const s = `${n.maxBackboneSpeed || ''} ${n.portSpeed || ''} ${n.uplinksSummary || ''} ${n.interfaces || ''} ${n.portFormFactorSummary || ''}`.toUpperCase();
    const uplinks = (n.uplinksSummary || '').toUpperCase();
    const maxBb = (n.maxBackboneSpeed || '').toUpperCase();

    let maxBbNum = 1000;
    if (maxBb === "1G" || maxBb === "1GBE") maxBbNum = 1;
    else if (maxBb === "2.5G" || maxBb === "2.5GBE") maxBbNum = 2.5;
    else if (maxBb === "5G") maxBbNum = 5;
    else if (maxBb === "10G") maxBbNum = 10;
    else if (maxBb === "25G") maxBbNum = 25;
    else if (maxBb === "40G") maxBbNum = 40;
    else if (maxBb === "100G") maxBbNum = 100;

    const isPureGigabit = (maxBbNum === 1) || 
      (uplinks.includes("GIGABIT") && !uplinks.includes("10G") && !uplinks.includes("25G") && !uplinks.includes("40G") && !uplinks.includes("100G")) ||
      (uplinks.includes("1GBE") && !uplinks.includes("10G") && !uplinks.includes("2.5G"));

    if (!isPureGigabit) {
      if ((s.includes("100G") || s.includes("QSFP28")) && maxBbNum >= 100) supported.push(100);
      if ((s.includes("40G") || s.includes("QSFP+")) && maxBbNum >= 40) supported.push(40);
      if ((s.includes("25G") || s.includes("SFP28")) && maxBbNum >= 25) supported.push(25);
      if ((s.includes("10G") || s.includes("SFP+") || s.includes("10GBE")) && maxBbNum >= 10) supported.push(10);
      if ((s.includes("5G") || s.includes("5GBE")) && maxBbNum >= 5) supported.push(5);
      if ((s.includes("2.5G") || s.includes("MGIG") || s.includes("2.5GBE")) && maxBbNum >= 2.5) supported.push(2.5);
    }
    return supported;
  };

  const speedsA = getSpeeds(nodeA);
  const speedsB = getSpeeds(nodeB);

  const mutual = speedsA.filter(sp => speedsB.includes(sp)).sort((a, b) => b - a);
  const top = mutual[0] || 1;

  if (top === 100) return "100G";
  if (top === 40) return "40G";
  if (top === 25) return "25G";
  if (top === 10) return "10G";
  if (top === 5) return "5G";
  if (top === 2.5) return "2.5G";
  return "1G";
}

/**
 * Checks whether a device physically possesses optical transceiver cages (SFP/QSFP)
 */
function deviceHasOpticalCages(node) {
  if (!node) return false;
  if (typeof enrichBOMItemFromCatalog === "function") enrichBOMItemFromCatalog(node);
  const text = `${node.uplinksSummary || ''} ${node.portFormFactorSummary || ''} ${node.interfaces || ''}`.toLowerCase();
  
  if (/sfp28|qsfp28|sfp\+|qsfp\+|sfp|qsfp|optical|cage/i.test(text)) return true;
  if (Array.isArray(node.physicalPorts) && node.physicalPorts.length > 0) {
    return node.physicalPorts.some(p => p.connector && p.connector !== "RJ-45" && !p.mediaType?.includes("rj45"));
  }
  if ((node.maxBackboneSpeed === "10G" || node.maxBackboneSpeed === "25G" || node.maxBackboneSpeed === "40G" || node.maxBackboneSpeed === "100G") && 
      !text.includes("all copper") && !text.includes("only rj45")) {
    return true;
  }
  return false;
}

let isSynthesizingInterconnects = false;

// -----------------------------------------------------------
// Auto-Synthesize Interconnects (Optics & DAC Cables) into Quote BOM
// -----------------------------------------------------------
function autoSynthesizeInterconnects(silent = false) {
  if (isSynthesizingInterconnects) return;
  isSynthesizingInterconnects = true;

  try {
    if (typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) {
      if (!silent && typeof showToast === "function") showToast("Project BOM is empty.");
      return;
    }

    // Ensure topology links are up to date
    const nodes = projectBOM.filter(i => !i.parentInstanceId && (
      i.role === "Gateways & WAN" || i.role === "Security WAN" || i.role === "Firewall" || i.category === "firewall" ||
      i.role === "Core" || i.role === "Core & Agg" || i.role === "Aggregation" || 
      i.role === "Access" || i.role === "Wireless Bridge" || 
      i.role === "Server" || i.role === "Compute & Storage" || i.role === "VMS Server"
    ));

    if (typeof generateTopologyLinks === "function") {
      generateTopologyLinks(nodes);
    }

    const hasFloorFiberBackbones = (typeof facilityFloors !== "undefined" && Array.isArray(facilityFloors)) &&
      facilityFloors.some(fl => Array.isArray(fl.fiberBackbones) && fl.fiberBackbones.length > 0);
    const hasStaleAutoSync = projectBOM.some(it => it && (it.source === "topology_auto_sync" || it.role === "Uplink Interconnect"));

    if ((!topologyLinks || topologyLinks.length === 0) && !hasFloorFiberBackbones && !hasStaleAutoSync) {
      if (!silent && typeof showToast === "function") showToast("No inter-switch or core topology links found to synthesize.");
      return;
    }

    let synthesizedDACCables = 0;
    let synthesizedPatchCords = 0;
    let synthesizedTransceivers = 0;
    let synthesizedFiberPatchCords = 0;
    let synthesizedFiberLIUs = 0;
    const interRackFiberPortsByLoc = {};
    const newInterconnectItems = [];

    // Helper to normalize vendor
    const detectVendor = (item) => {
      const v = (item.vendor || "").toLowerCase();
      const m = (item.model || "").toLowerCase();
      if (v.includes("unifi") || m.includes("usw-") || m.includes("udm-") || m.includes("efg") || m.includes("uxg-")) return "UniFi";
      if (v.includes("meraki") || m.includes("ms") || m.includes("mx") || m.includes("mg")) return "Meraki";
      if (v.includes("fortinet") || m.includes("fortigate") || m.includes("fg-")) return "Fortinet";
      if (v.includes("palo") || m.includes("pa-")) return "Palo Alto";
      if (v.includes("ruckus") || m.includes("icx")) return "Ruckus";
      if (v.includes("juniper") || m.includes("ex")) return "Juniper";
      if (v.includes("allied") || m.includes("at-")) return "Allied Telesis";
      if (v.includes("amg")) return "AMG";
      return "Cisco";
    };

    (Array.isArray(topologyLinks) ? topologyLinks : []).forEach((link, idx) => {
      if (link.isWireless) return; // Skip wireless PtP links
      if (link.category === "wireless_handoff" && link.isPoEDelivery) return; // Skip copper PoE drops to radios

      const nodeA = nodes.find(n => n.instanceId === link.fromId);
      const nodeB = nodes.find(n => n.instanceId === link.toId);
      if (!nodeA || !nodeB) return;

      const locA = (typeof FacilityStore !== "undefined") ? FacilityStore.normalize(nodeA.closetName || nodeA.rackId || "MDF") : (nodeA.closetName || "MDF");
      const locB = (typeof FacilityStore !== "undefined") ? FacilityStore.normalize(nodeB.closetName || nodeB.rackId || "MDF") : (nodeB.closetName || "MDF");
      const speed = link.rawSpeed || "10G";
      const multiplier = Math.max(1, parseInt(link.multiplier, 10) || 1);

      // Exact same-rack determination: same rack enclosure and not loose field hardware
      const isSameRack = (locA === locB) && !locA.endsWith("• Field") && (typeof FacilityStore === "undefined" || locA !== FacilityStore.UNASSIGNED);
      const uDiff = calculateUDistance(nodeA, nodeB);

      const override = getLinkInterconnectOverride(link.id);
      const vendorA = detectVendor(nodeA);
      const vendorB = detectVendor(nodeB);
      const isCrossVendor = vendorA !== vendorB;
      const exceedsPassiveDacReach = (speed === "25G" || speed === "40G" || speed === "100G") && uDiff > 28;
      const infraScope = (typeof getProjectInfrastructureScope === "function")
        ? getProjectInfrastructureScope()
        : { horizontalCabling: true, rackPatchPanels: true, patchCords: true, fiberBackbone: true, sfpAndDac: true };
      const opticsVendorMode = (typeof getProjectOpticsVendorMode === "function") ? getProjectOpticsVendorMode() : "oem";
      const thirdPartyVendorName = opticsVendorMode === "ironlink" ? "IronLink" : (opticsVendorMode === "fs" ? "FS.com" : null);
      const preferredVendor = vendorA;

      const hasOpticsA = deviceHasOpticalCages(nodeA);
      const hasOpticsB = deviceHasOpticalCages(nodeB);
      const canUseOpticalOrDac = hasOpticsA && hasOpticsB;

      // Determine target medium:
      // 1. Explicit override on link (dac | patch | mmf | smf)
      // 2. If either endpoint lacks optical cages -> Cat6A RJ45 patch cord!
      // 3. Otherwise: if same rack -> dac, if between racks -> project fiber type default
      let chosenMedium = "dac";
      if (override.medium && override.medium !== "auto") {
        chosenMedium = override.medium; // "dac", "patch", "mmf", or "smf"
      } else if (!canUseOpticalOrDac) {
        chosenMedium = "patch";
      } else {
        chosenMedium = (isSameRack && !isCrossVendor && !exceedsPassiveDacReach) ? "dac" : getProjectFiberType(); // "dac", "mmf", or "smf"
      }

      if (chosenMedium === "dac") {
        // ----------------------------------------------------
        // CASE 1: Intra-Rack Link or Override -> Direct Attach Copper (DAC)
        // Length dynamically calculated from U separation (or explicit override)
        // ----------------------------------------------------
        const dacLength = (override.dacLength && override.dacLength !== "auto")
          ? override.dacLength
          : getDacLengthForUDiff(uDiff, speed);

        const dacVendor = thirdPartyVendorName || preferredVendor;
        let dacItem = findDacItem(speed, dacVendor, dacLength);
        if (!dacItem && typeof OPTICS_CATALOG !== "undefined" && OPTICS_CATALOG[dacVendor]?.[speed]?.dac) {
          dacItem = OPTICS_CATALOG[dacVendor][speed].dac;
        }
        if (!dacItem && typeof OPTICS_CATALOG !== "undefined" && OPTICS_CATALOG[preferredVendor]?.[speed]?.dac) {
          dacItem = OPTICS_CATALOG[preferredVendor][speed].dac;
        }

        const baseSku = dacItem?.sku || `${speed}-SFP-DAC-1M`;
        const baseName = dacItem?.name || `${preferredVendor} ${speed} SFP+ Direct Attach Copper Cable (1m)`;
        const baseMsrp = dacItem?.msrp || (speed === "25G" ? 55 : (speed === "100G" ? 120 : 35));

        const formattedDac = formatDacItem(baseSku, baseName, baseMsrp, dacLength, speed, dacVendor);
        if (thirdPartyVendorName) {
          const codeA = (typeof getVendorEepromCode === "function") ? getVendorEepromCode(vendorA) : "MSA";
          const codeB = (typeof getVendorEepromCode === "function") ? getVendorEepromCode(vendorB) : "MSA";
          formattedDac.sku = isCrossVendor ? `${formattedDac.sku}-${codeA}-${codeB}` : `${formattedDac.sku}-${codeA}`;
          formattedDac.name = `${formattedDac.name} [${isCrossVendor ? `${vendorA}<->${vendorB} Dual-Coded` : `${preferredVendor} Coded`}]`;
        }

        newInterconnectItems.push({
          instanceId: `dac-${link.id}-${idx}-${Date.now()}`,
          _skipByScope: (infraScope.sfpAndDac === false),
          vendorOverride: dacVendor,
          id: formattedDac.sku,
          model: `${formattedDac.name}${isCrossVendor ? ` [Multi-Vendor MSA: ${vendorA} <-> ${vendorB}]` : ''} (${nodeA.model} <-> ${nodeB.model}${isSameRack ? ` • ${uDiff}U Separation` : ''})`,
          sku: formattedDac.sku,
          role: "Optics & DAC",
          vendor: preferredVendor,
          msrp: formattedDac.msrp,
          poeBudget: 0,
          baseWatts: 0,
          qty: multiplier,
          closetName: locA,
          rackId: locA,
          rackSlot: null,
          source: "topology_auto_sync",
          linkId: link.id,
          medium: "dac",
          dacLength,
          uDiff: isSameRack ? uDiff : null
        });
        if (infraScope.sfpAndDac !== false) synthesizedDACCables += multiplier;

      } else if (chosenMedium === "patch" || chosenMedium === "cat6a") {
        // ----------------------------------------------------
        // CASE 2: Intra-Rack RJ45 Copper Patch Cord (Cat6A)
        // Length dynamically calculated from U separation (or explicit override)
        // ----------------------------------------------------
        const cordSpec = (override.patchLength && override.patchLength !== "auto")
          ? { lengthFt: parseFloat(override.patchLength), lengthMeters: parseFloat(override.patchLength) * 0.3048, label: `${override.patchLength} ft` }
          : getPatchCordLengthForUDiff(uDiff);

        const matchedCord = findPatchCordItem(cordSpec.lengthFt, preferredVendor, false, nodeB || nodeA);
        const cordSku = matchedCord.sku;
        const cordName = matchedCord.name;
        const cordMsrp = matchedCord.msrp;

        newInterconnectItems.push({
          instanceId: `patch-${link.id}-${idx}-${Date.now()}`,
          _skipByScope: (infraScope.patchCords === false),
          id: cordSku,
          model: `${cordName} (${nodeA.model} <-> ${nodeB.model}${isSameRack ? ` • ${uDiff}U Separation` : ''})`,
          sku: cordSku,
          role: "Structured Cabling",
          category: "cabling",
          vendor: matchedCord.vendor || "Panduit",
          msrp: cordMsrp,
          poeBudget: 0,
          baseWatts: 0,
          qty: multiplier,
          closetName: locA,
          rackId: locA,
          rackSlot: null,
          source: "topology_auto_sync",
          linkId: link.id,
          medium: "patch",
          lengthFt: cordSpec.lengthFt,
          lengthMeters: cordSpec.lengthMeters,
          uDiff: isSameRack ? uDiff : null
        });
        if (infraScope.patchCords !== false) synthesizedPatchCords += multiplier;

      } else {
        // ----------------------------------------------------
        // CASE 3: Inter-Rack / Backbone Link -> Transceivers + Duplex Fiber Patch
        // Fiber specification: override or project default (mmf vs smf)
        // ----------------------------------------------------
        const fiberType = (override.fiberType && override.fiberType !== "auto")
          ? override.fiberType
          : chosenMedium; // "mmf" or "smf"
        const isSMF = (fiberType === "smf");

        // Transceiver for End A
        const transAVendor = thirdPartyVendorName || vendorA;
        const eepromCodeA = (typeof getVendorEepromCode === "function") ? getVendorEepromCode(vendorA) : "MSA";
        let transA = (typeof OPTICS_CATALOG !== "undefined" && OPTICS_CATALOG[transAVendor]?.[speed]?.[isSMF ? 'smf' : 'mmf']) || null;
        if (!transA && typeof OPTICS_LIST !== "undefined") {
          transA = OPTICS_LIST.find(o => o.medium === (isSMF ? 'smf' : 'mmf') && o.speed === speed && o.vendor === vendorA) ||
                   OPTICS_LIST.find(o => o.medium === (isSMF ? 'smf' : 'mmf') && o.speed === speed);
        }
        const rawTransASku = transA?.sku || `${transAVendor}-${speed}-${isSMF ? 'SMF-LR' : 'MMF-SR'}`;
        const transASku = thirdPartyVendorName ? `${rawTransASku}-${eepromCodeA}` : rawTransASku;
        const rawTransAName = transA?.name || `${transAVendor} ${speed} ${isSMF ? 'Single-Mode SFP+ Transceiver (LR, 10km)' : 'Multi-Mode SFP+ Transceiver (SR, 300m)'}`;
        const transAName = thirdPartyVendorName ? `${rawTransAName} [${vendorA} Coded]` : rawTransAName;
        const transAMsrp = transA?.msrp || (speed === "25G" ? (isSMF ? 450 : 220) : (speed === "100G" ? (isSMF ? 850 : 450) : (isSMF ? 180 : 95)));

        newInterconnectItems.push({
          instanceId: `transA-${link.id}-${idx}-${Date.now()}`,
          _skipByScope: (infraScope.sfpAndDac === false),
          vendorOverride: transAVendor,
          id: transASku,
          model: `${transAName} (for ${nodeA.model} at ${locA})`,
          sku: transASku,
          role: "Optics & DAC",
          vendor: vendorA,
          msrp: transAMsrp,
          poeBudget: 0,
          baseWatts: 0,
          qty: multiplier,
          closetName: locA,
          rackId: locA,
          rackSlot: null,
          source: "topology_auto_sync",
          linkId: link.id,
          medium: isSMF ? "smf" : "mmf",
          fiberType
        });
        if (infraScope.sfpAndDac !== false) synthesizedTransceivers += multiplier;

        // Transceiver for End B
        const transBVendor = thirdPartyVendorName || vendorB;
        const eepromCodeB = (typeof getVendorEepromCode === "function") ? getVendorEepromCode(vendorB) : "MSA";
        let transB = (typeof OPTICS_CATALOG !== "undefined" && OPTICS_CATALOG[transBVendor]?.[speed]?.[isSMF ? 'smf' : 'mmf']) || null;
        if (!transB && typeof OPTICS_LIST !== "undefined") {
          transB = OPTICS_LIST.find(o => o.medium === (isSMF ? 'smf' : 'mmf') && o.speed === speed && o.vendor === vendorB) ||
                   OPTICS_LIST.find(o => o.medium === (isSMF ? 'smf' : 'mmf') && o.speed === speed);
        }
        const rawTransBSku = transB?.sku || `${transBVendor}-${speed}-${isSMF ? 'SMF-LR' : 'MMF-SR'}`;
        const transBSku = thirdPartyVendorName ? `${rawTransBSku}-${eepromCodeB}` : rawTransBSku;
        const rawTransBName = transB?.name || `${transBVendor} ${speed} ${isSMF ? 'Single-Mode SFP+ Transceiver (LR, 10km)' : 'Multi-Mode SFP+ Transceiver (SR, 300m)'}`;
        const transBName = thirdPartyVendorName ? `${rawTransBName} [${vendorB} Coded]` : rawTransBName;
        const transBMsrp = transB?.msrp || (speed === "25G" ? (isSMF ? 450 : 220) : (speed === "100G" ? (isSMF ? 850 : 450) : (isSMF ? 180 : 95)));

        newInterconnectItems.push({
          instanceId: `transB-${link.id}-${idx}-${Date.now()}`,
          _skipByScope: (infraScope.sfpAndDac === false),
          vendorOverride: transBVendor,
          id: transBSku,
          model: `${transBName} (for ${nodeB.model} at ${locB})`,
          sku: transBSku,
          role: "Optics & DAC",
          vendor: vendorB,
          msrp: transBMsrp,
          poeBudget: 0,
          baseWatts: 0,
          qty: multiplier,
          closetName: locB,
          rackId: locB,
          rackSlot: null,
          source: "topology_auto_sync",
          linkId: link.id,
          medium: isSMF ? "smf" : "mmf",
          fiberType
        });
        if (infraScope.sfpAndDac !== false) synthesizedTransceivers += multiplier;

        // Duplex Fiber Patch Cords (1 for Side A, 1 for Side B)
        const patchSku = isSMF ? "FIBER-LC-OS2-2M" : "FIBER-LC-OM4-2M";
        const patchName = isSMF ? "Corning OS2 Single-Mode Duplex LC-LC Fiber Patch Cord (2m)" : "Corning OM4 Duplex LC-LC Fiber Patch Cord (2m)";
        const patchMsrp = isSMF ? 28 : 22;

        newInterconnectItems.push({
          instanceId: `fiberpatchA-${link.id}-${idx}-${Date.now()}`,
          _skipByScope: (infraScope.sfpAndDac === false),
          id: patchSku,
          model: isSameRack ? `${patchName} (Intra-Rack Optical Jumper: ${nodeA.model} <-> ${nodeB.model})` : `${patchName} (${locA} Fiber LIU)`,
          sku: patchSku,
          role: "Optics & DAC",
          vendor: "Corning",
          msrp: patchMsrp,
          poeBudget: 0,
          baseWatts: 0,
          qty: multiplier,
          closetName: locA,
          rackId: locA,
          rackSlot: null,
          source: "topology_auto_sync",
          linkId: link.id,
          medium: isSMF ? "smf" : "mmf",
          fiberType
        });

        newInterconnectItems.push({
          instanceId: `fiberpatchB-${link.id}-${idx}-${Date.now()}`,
          _skipByScope: (infraScope.sfpAndDac === false),
          id: patchSku,
          model: `${patchName} (${locB} Fiber LIU)`,
          _skipIntraRack: isSameRack,
          sku: patchSku,
          role: "Optics & DAC",
          vendor: "Corning",
          msrp: patchMsrp,
          poeBudget: 0,
          baseWatts: 0,
          qty: multiplier,
          closetName: locB,
          rackId: locB,
          rackSlot: null,
          source: "topology_auto_sync",
          linkId: link.id,
          medium: isSMF ? "smf" : "mmf",
          fiberType
        });
        if (isSameRack) {
          if (infraScope.sfpAndDac !== false) synthesizedFiberPatchCords += multiplier;
        } else {
          if (infraScope.sfpAndDac !== false) synthesizedFiberPatchCords += (multiplier * 2);
          interRackFiberPortsByLoc[locA] = (interRackFiberPortsByLoc[locA] || 0) + multiplier;
          interRackFiberPortsByLoc[locB] = (interRackFiberPortsByLoc[locB] || 0) + multiplier;
        }
      }
    });

    // Preserve existing mounted Fiber LIU slots so re-synthesizing retains rack positions
    const existingMountedLiuByLoc = {};
    projectBOM.forEach(item => {
      if (item.source === "topology_auto_sync" && (item.sku === "LIU-1U-24LC" || (item.model || "").includes("Fiber LIU")) && item.rackSlot) {
        const loc = (typeof FacilityStore !== "undefined") ? FacilityStore.normalize(item.closetName || item.rackId || "MDF") : (item.closetName || "MDF");
        if (!existingMountedLiuByLoc[loc]) existingMountedLiuByLoc[loc] = [];
        existingMountedLiuByLoc[loc].push(item.rackSlot);
      }
    });

    // In-place update to projectBOM: remove previously auto-synthesized interconnects
    for (let i = projectBOM.length - 1; i >= 0; i--) {
      if (projectBOM[i].source === "topology_auto_sync" || projectBOM[i].role === "Uplink Interconnect") {
        projectBOM.splice(i, 1);
      }
    }

    // Also account for floorplan fiber backbones so closets with drawn fiber trunks receive a 1U Fiber LIU
    if (typeof facilityFloors !== "undefined" && Array.isArray(facilityFloors)) {
      facilityFloors.forEach(fl => {
        (fl.fiberBackbones || []).forEach(fb => {
          const fromLoc = (typeof FacilityStore !== "undefined") ? FacilityStore.normalize(fb.fromClosetName || "MDF") : (fb.fromClosetName || "MDF");
          const toLoc = (typeof FacilityStore !== "undefined") ? FacilityStore.normalize(fb.toClosetName || "IDF-1") : (fb.toClosetName || "IDF-1");
          const duplexPorts = Math.ceil((parseInt(fb.strandCount, 10) || 12) / 2);
          interRackFiberPortsByLoc[fromLoc] = Math.max(interRackFiberPortsByLoc[fromLoc] || 0, duplexPorts);
          interRackFiberPortsByLoc[toLoc] = Math.max(interRackFiberPortsByLoc[toLoc] || 0, duplexPorts);
        });
      });
    }

    // Auto-provision 1U 24-Fiber (12-Port Duplex LC) Rack-Mount Fiber LIU Enclosures per closet
    const liuCatalogItem = (typeof CABLING_CATALOG !== "undefined" && CABLING_CATALOG.patchPanels?.find(p => p.sku === "LIU-1U-24LC")) || {
      sku: "LIU-1U-24LC",
      name: "1U 24-Fiber (12-Port Duplex LC) Rack-Mount Fiber LIU Patch Enclosure",
      vendor: "Corning",
      msrp: 245,
      ports: 12,
      rackUnits: 1
    };

    Object.entries(interRackFiberPortsByLoc).forEach(([loc, duplexPortCount]) => {
      if (!loc || loc.endsWith("• Field") || duplexPortCount <= 0) return;

      // Deduct any manual Fiber LIU enclosures already present in this closet
      let existingManualLiuPorts = 0;
      projectBOM.forEach(item => {
        const itemLoc = (typeof FacilityStore !== "undefined") ? FacilityStore.normalize(item.closetName || item.rackId || "MDF") : (item.closetName || "MDF");
        if (itemLoc === loc && (item.sku === "LIU-1U-24LC" || (item.model || "").includes("Fiber LIU"))) {
          existingManualLiuPorts += (Number(item.ports) || 12) * (item.qty || 1);
        }
      });

      const netDuplexNeeded = Math.max(0, duplexPortCount - existingManualLiuPorts);
      const liuQty = Math.ceil(netDuplexNeeded / 12);
      const scopeForLiu = (typeof getProjectInfrastructureScope === "function") ? getProjectInfrastructureScope() : { fiberBackbone: true };
      if (liuQty > 0 && scopeForLiu.fiberBackbone !== false) {
        newInterconnectItems.push({
          instanceId: `liu-${loc.replace(/\W+/g, '_')}-${Date.now()}`,
          id: liuCatalogItem.sku,
          model: `${liuCatalogItem.name} (${loc})`,
          sku: liuCatalogItem.sku,
          role: "Structured Cabling",
          vendor: liuCatalogItem.vendor || "Corning",
          msrp: liuCatalogItem.msrp || 245,
          ports: 12,
          poeBudget: 0,
          baseWatts: 0,
          rackUnits: 1,
          weightLbs: 6.5,
          qty: liuQty,
          closetName: loc,
          rackId: loc,
          rackSlot: (existingMountedLiuByLoc[loc]?.length > 0) ? existingMountedLiuByLoc[loc].shift() : null,
          isPassive: true,
          source: "topology_auto_sync"
        });
        synthesizedFiberLIUs += liuQty;
      }
    });

    projectBOM.push(...newInterconnectItems.filter(item => !item._skipIntraRack && !item._skipByScope).map(item => {
      if (item.vendorOverride) item.vendor = item.vendorOverride;
      return item;
    }));

    if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
      FacilityStore.notifyWorkspaceChange();
    }
    if (typeof renderBOM === "function") renderBOM();
    if (typeof updateBOMView === "function") updateBOMView();
    if (typeof updateBOMBadge === "function") updateBOMBadge();
    if (typeof updateProjectHealthUI === "function") updateProjectHealthUI();
    if (typeof StorageService !== "undefined" && typeof StorageService.queueAutoSave === "function") {
      StorageService.queueAutoSave();
    }

    const totalAdded = synthesizedDACCables + synthesizedPatchCords + synthesizedTransceivers + synthesizedFiberPatchCords + synthesizedFiberLIUs;
    if (!silent && typeof showToast === "function") {
      if (totalAdded > 0) {
        const parts = [];
        if (synthesizedDACCables > 0) parts.push(`${synthesizedDACCables} DACs`);
        if (synthesizedPatchCords > 0) parts.push(`${synthesizedPatchCords} Patch Cords`);
        if (synthesizedTransceivers > 0) parts.push(`${synthesizedTransceivers} Transceivers`);
        if (synthesizedFiberPatchCords > 0) parts.push(`${synthesizedFiberPatchCords} Fiber Patches`);
        if (synthesizedFiberLIUs > 0) parts.push(`${synthesizedFiberLIUs} Fiber LIUs`);
        showToast(`Synthesized ${totalAdded} interconnect items (${parts.join(", ")}) into Quote BOM!`);
      } else {
        showToast("Reconciled interconnects against active Project Scope (excluded items suppressed).");
      }
    }
  } finally {
    isSynthesizingInterconnects = false;
  }
}

// -----------------------------------------------------------
// Smooth Bézier Curve Vector Link Renderer
// -----------------------------------------------------------
function renderTopologyLinks() {
  const svg = document.getElementById("topologySvgOverlay");
  if (!svg) return;

  svg.innerHTML = "";
  if (!topologyLayerFilters.links) return;

  topologyLinks.forEach(link => {
    const fromCard = document.getElementById(`topo-card-${link.fromId}`);
    const toCard = document.getElementById(`topo-card-${link.toId}`);
    if (!fromCard || !toCard) return;

    const fromCluster = fromCard.closest(".topo-location-cluster");
    const toCluster = toCard.closest(".topo-location-cluster");
    if (!fromCluster || !toCluster) return;

    // Calculate edge anchor points (snapping to border edges instead of centers)
    const container = document.getElementById("topologyNodesContainer");
    const zoom = topologyZoomLevel || 1.0;

    let fromBox, toBox;
    if (container) {
      const cRect = container.getBoundingClientRect();
      const fRect = fromCard.getBoundingClientRect();
      const tRect = toCard.getBoundingClientRect();
      fromBox = {
        x: (fRect.left - cRect.left) / zoom,
        y: (fRect.top - cRect.top) / zoom,
        w: fRect.width / zoom,
        h: fRect.height / zoom
      };
      toBox = {
        x: (tRect.left - cRect.left) / zoom,
        y: (tRect.top - cRect.top) / zoom,
        w: tRect.width / zoom,
        h: tRect.height / zoom
      };
    } else {
      fromBox = {
        x: fromCluster.offsetLeft + fromCard.offsetLeft,
        y: fromCluster.offsetTop + fromCard.offsetTop,
        w: fromCard.offsetWidth,
        h: fromCard.offsetHeight
      };
      toBox = {
        x: toCluster.offsetLeft + toCard.offsetLeft,
        y: toCluster.offsetTop + toCard.offsetTop,
        w: toCard.offsetWidth,
        h: toCard.offsetHeight
      };
    }

    let x1, y1, x2, y2;
    let cx1, cy1, cx2, cy2;
    let midX, midY;

    if (fromCluster === toCluster) {
      // Intra-cluster / Intra-rack patch connection:
      // Loop out from the right edge of both cards so the line curves gracefully outside the cluster
      x1 = fromBox.x + fromBox.w;
      y1 = fromBox.y + (fromBox.h / 2);
      x2 = toBox.x + toBox.w;
      y2 = toBox.y + (toBox.h / 2);

      const loopWidth = 45;
      cx1 = Math.max(x1, x2) + loopWidth;
      cy1 = y1;
      cx2 = Math.max(x1, x2) + loopWidth;
      cy2 = y2;

      midX = Math.max(x1, x2) + loopWidth + 10;
      midY = (y1 + y2) / 2;
    } else {
      // Inter-cluster orientation between boxes
      if (fromBox.x + fromBox.w < toBox.x) {
        // fromBox is to the LEFT of toBox
        x1 = fromBox.x + fromBox.w;
        y1 = fromBox.y + (fromBox.h / 2);
        x2 = toBox.x;
        y2 = toBox.y + (toBox.h / 2);
      } else if (fromBox.x > toBox.x + toBox.w) {
        // fromBox is to the RIGHT of toBox
        x1 = fromBox.x;
        y1 = fromBox.y + (fromBox.h / 2);
        x2 = toBox.x + toBox.w;
        y2 = toBox.y + (toBox.h / 2);
      } else {
        // Vertical stacking
        if (fromBox.y < toBox.y) {
          x1 = fromBox.x + (fromBox.w / 2);
          y1 = fromBox.y + fromBox.h;
          x2 = toBox.x + (toBox.w / 2);
          y2 = toBox.y;
        } else {
          x1 = fromBox.x + (fromBox.w / 2);
          y1 = fromBox.y;
          x2 = toBox.x + (toBox.w / 2);
          y2 = toBox.y + toBox.h;
        }
      }

      // Bézier Control Points for smooth S-curve flow
      const dx = Math.abs(x2 - x1) * 0.5;
      const dy = Math.abs(y2 - y1) * 0.5;

      if (Math.abs(x2 - x1) > Math.abs(y2 - y1)) {
        cx1 = x1 + (x2 > x1 ? dx : -dx);
        cy1 = y1;
        cx2 = x2 - (x2 > x1 ? dx : -dx);
        cy2 = y2;
      } else {
        cx1 = x1;
        cy1 = y1 + (y2 > y1 ? dy : -dy);
        cx2 = x2;
        cy2 = y2 - (y2 > y1 ? dy : -dy);
      }

      midX = (x1 + x2) / 2;
      midY = (y1 + y2) / 2;
    }

    // Color & Style by Speed and Role
    let strokeColor = "#38bdf8"; // Sky Blue: 10G / Default
    let strokeWidth = link.isLAG ? "3.5" : "2.5";
    let isDashed = false;

    if (link.isFieldDrop) {
      strokeColor = "#06b6d4"; // Cyan: Field Device Drop (PoE/Data)
      strokeWidth = "2.0";
      isDashed = true;
    } else if (link.isCrossStack) {
      strokeColor = "#818cf8"; // Indigo / Violet: Redundant Cross-Stack LACP LAG
      strokeWidth = "4.0";
    } else if (link.isRing) {
      strokeColor = "#f59e0b"; // Golden Amber: Resilient Ring Loop
      isDashed = true;
      strokeWidth = "3.5";
    } else if (link.category === "vms_stream") {
      strokeColor = "#2dd4bf"; // Teal: VMS Video Ingest Stream
      isDashed = true;
      strokeWidth = "2.5";
    } else if (link.category === "access_link") {
      strokeColor = "#818cf8"; // Indigo: Access Control Communication
      isDashed = true;
      strokeWidth = "2.0";
    } else if (link.isWireless) {
      strokeColor = "#c084fc"; // Purple: RF Bridge
      isDashed = true;
      strokeWidth = "2.5";
    } else if (link.isPoEDelivery && activeTopologyViewPlane === "power") {
      strokeColor = "#f59e0b"; // Amber: PoE Delivery
      strokeWidth = "3.0";
    } else if (link.rawSpeed === "100G" || link.rawSpeed === "25G") {
      strokeColor = "#06b6d4"; // Cyan: 100G/25G Campus Backbone
      strokeWidth = link.isLAG ? "4.0" : "3.0";
    } else if (link.rawSpeed === "1G") {
      strokeColor = "#10b981"; // Emerald: 1G Downlink
      strokeWidth = "2.0";
    }

    let displayLabel = link.speedLabel;
    if (!link.isFieldDrop && !link.isWireless && link.category !== "vms_stream" && link.category !== "access_link" && !link.isCrossStack && !link.isRing) {
      const nodeA = (typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) ? projectBOM.find(n => n.instanceId === link.fromId) : null;
      const nodeB = (typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) ? projectBOM.find(n => n.instanceId === link.toId) : null;
      if (nodeA && nodeB) {
        const locA = (typeof FacilityStore !== "undefined") ? FacilityStore.normalize(nodeA.closetName || nodeA.rackId || "MDF") : (nodeA.closetName || "MDF");
        const locB = (typeof FacilityStore !== "undefined") ? FacilityStore.normalize(nodeB.closetName || nodeB.rackId || "MDF") : (nodeB.closetName || "MDF");
        const isSameRack = (locA === locB) && !locA.endsWith("• Field") && (typeof FacilityStore === "undefined" || locA !== FacilityStore.UNASSIGNED);
        const override = getLinkInterconnectOverride(link.id);
        const med = (override.medium && override.medium !== "auto") ? override.medium : (isSameRack ? "dac" : getProjectFiberType());
        if (med === "dac") {
          strokeColor = "#f59e0b"; // Golden Amber: DAC Copper
          const uDiff = calculateUDistance(nodeA, nodeB);
          const dacLen = (override.dacLength && override.dacLength !== "auto") ? override.dacLength : getDacLengthForUDiff(uDiff);
          displayLabel = `${link.speedLabel} • DAC ${dacLen}`;
        } else if (med === "patch" || med === "cat6a") {
          strokeColor = "#38bdf8"; // Sky Blue: RJ45 Copper Patch Cord
          const uDiff = calculateUDistance(nodeA, nodeB);
          const cordSpec = (override.patchLength && override.patchLength !== "auto")
            ? { label: `${override.patchLength} ft` }
            : getPatchCordLengthForUDiff(uDiff);
          displayLabel = `${link.speedLabel} • ${cordSpec.label}`;
        } else if (med === "smf") {
          strokeColor = "#eab308"; // Gold/Yellow: OS2 Single-Mode Fiber
        } else {
          strokeColor = "#06b6d4"; // Aqua/Cyan: OM4 Multi-Mode Fiber
        }
      }
    }

    const isConnectedToSelectedNode = selectedTopologyNodeId && (link.fromId === selectedTopologyNodeId || link.toId === selectedTopologyNodeId);
    const isSelected = selectedTopologyLinkId === link.id || isConnectedToSelectedNode;

    const d = `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;

    // Invisible wide hit-area for effortless clicking of curved link vector
    const hitArea = document.createElementNS("http://www.w3.org/2000/svg", "path");
    hitArea.setAttribute("d", d);
    hitArea.setAttribute("fill", "none");
    hitArea.setAttribute("stroke", "transparent");
    hitArea.setAttribute("stroke-width", "26");
    hitArea.setAttribute("stroke-linecap", "round");
    hitArea.setAttribute("class", "cursor-pointer pointer-events-auto");
    hitArea.style.pointerEvents = "stroke";
    hitArea.onclick = (e) => selectTopologyLink(link.id, e);
    svg.appendChild(hitArea);

    // Render Visible Curved SVG Path
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", isSelected ? "#f59e0b" : strokeColor);
    path.setAttribute("stroke-width", isSelected ? (isConnectedToSelectedNode ? "3.5" : "4.5") : strokeWidth);
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("opacity", isSelected ? "1.0" : "0.85");
    if (isDashed) path.setAttribute("stroke-dasharray", "6,4");
    path.setAttribute("class", "cursor-pointer hover:opacity-100 transition-opacity pointer-events-auto");
    path.style.pointerEvents = "stroke";
    path.onclick = (e) => selectTopologyLink(link.id, e);
    svg.appendChild(path);

    // Midpoint Speed / Wire Pill Badge
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", "cursor-pointer select-none pointer-events-auto");
    g.style.pointerEvents = "auto";
    g.onclick = (e) => selectTopologyLink(link.id, e);

    const badgeWidth = Math.max(75, displayLabel.length * 7.5);
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", midX - (badgeWidth / 2));
    rect.setAttribute("y", midY - 9);
    rect.setAttribute("width", badgeWidth);
    rect.setAttribute("height", "18");
    rect.setAttribute("rx", "6");
    rect.setAttribute("fill", "#020617");
    rect.setAttribute("stroke", isSelected ? "#f59e0b" : strokeColor);
    rect.setAttribute("stroke-width", isSelected ? "1.5" : "1");
    rect.setAttribute("opacity", "0.95");
    rect.style.pointerEvents = "auto";
    g.appendChild(rect);

    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", midX);
    text.setAttribute("y", midY + 3.5);
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("fill", strokeColor);
    text.setAttribute("font-size", "9.5");
    text.setAttribute("font-family", "monospace");
    text.setAttribute("font-weight", "bold");
    text.textContent = displayLabel;
    text.style.pointerEvents = "auto";
    g.appendChild(text);

    svg.appendChild(g);
  });
}

