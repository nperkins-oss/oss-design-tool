// =========================================================================
// PHYSICAL LAYOUT CANVAS ENGINE (v0.5.3 - FacilityStore & Dispatcher Aligned)
// =========================================================================

let activeCableTool = "select"; // "select" | "marquee" | "device" | "mdf" | "pathway" | "fiber"
let selectedNodeId = null;
let selectedNodeIds = new Set(); // Multi-select node ID set
let selectedFiberBackboneId = null;
let selectedPathwayTrunkId = null; // Active selected pathway corridor
let activeDrawingPathwayId = null; // Currently being drawn pathway
let activeSidebarTab = "runs";  // "runs" | "unplaced"

let activeCableSku = "C6A-CMP-1K-BL";
let useOrthogonalRouting = false;
let currentCanvasZoom = 1.0;
let isModalFullscreen = false;

let activeFloorId = null;
let facilityFloors = [];
try {
  Object.defineProperty(window, "facilityFloors", {
    get: () => facilityFloors,
    set: (val) => { facilityFloors = val; },
    configurable: true
  });
} catch(e) {}

let fiberFirstClosetId = null;

let isMarqueeSelecting = false;
let marqueeStart = { x: 0, y: 0 };
let marqueeCurrent = { x: 0, y: 0 };
let multiDragInitialPos = {};
let multiDragStartPos = { x: 0, y: 0 };

// Physical Layer Filtering & Inspector Visibility
let isPhysicalInspectorVisible = true;
let physicalLayerFilters = {
  cameras: true,
  access: true,
  wireless: true,
  closets: true,
  pathways: true
};

// Enhanced Physical Engineering State: Cable IDs, Camera FOV Cones, DORI Color Bands, DRC Distance Violations, and Revision Compare
let showPhysicalCableIds = false;
let showCameraFovCones = true;
let showDoriColorBands = true;
let isFieldWalkMode = false;
let isPhysSpacebarDown = false;
let isPhysKeyListenersInitialized = false;
let activeRevisionCompareId = null;
let currentDistanceViolationNodeIndex = -1;
let scaleCalibrationStartPoint = null;

// =========================================================================
// GRANULAR CANVAS UNDO / REDO ENGINE (40-Step Ring Buffer)
// =========================================================================
const CanvasHistory = {
  MAX_STEPS: 40,
  undoStack: [],
  redoStack: [],

  _cloneFloorGeometry(floor) {
    if (!floor) return null;
    return {
      floorId: floor.id,
      scaleFt: floor.scaleFt || 25,
      slackFt: floor.slackFt || 15,
      slabFt: floor.slabFt || 14,
      nodes: JSON.parse(JSON.stringify(floor.nodes || [])),
      pathwayTrunks: JSON.parse(JSON.stringify(floor.pathwayTrunks || [])),
      fiberBackbones: JSON.parse(JSON.stringify(floor.fiberBackbones || []))
    };
  },

  pushState(actionLabel = "Canvas Edit") {
    const floor = getActiveFloor();
    if (!floor) return;
    const snap = this._cloneFloorGeometry(floor);
    if (!snap) return;
    snap.label = actionLabel;
    this.undoStack.push(snap);
    if (this.undoStack.length > this.MAX_STEPS) {
      this.undoStack.shift();
    }
    this.redoStack = [];
    this.updateButtons();
  },

  _applySnapshot(snap) {
    if (!snap) return false;
    let floor = facilityFloors.find(f => f.id === snap.floorId);
    if (!floor) floor = getActiveFloor();
    if (!floor) return false;

    if (activeFloorId !== floor.id) {
      activeFloorId = floor.id;
      renderFloorSelector();
    }
    floor.scaleFt = snap.scaleFt;
    floor.slackFt = snap.slackFt;
    floor.slabFt = snap.slabFt;
    floor.nodes = JSON.parse(JSON.stringify(snap.nodes || []));
    floor.pathwayTrunks = JSON.parse(JSON.stringify(snap.pathwayTrunks || []));
    floor.fiberBackbones = JSON.parse(JSON.stringify(snap.fiberBackbones || []));

    syncFloorControlInputs();
    recalculateCurrentFloorCables();
    renderCableCanvas();
    updatePhysicalDrcPill();
    renderInspector();
    renderSidebarTabContent();
    saveFacilityState();
    return true;
  },

  undo() {
    if (this.undoStack.length === 0) return;
    const floor = getActiveFloor();
    const targetSnap = this.undoStack.pop();
    if (floor) {
      const currentSnap = this._cloneFloorGeometry(floor);
      currentSnap.label = targetSnap.label;
      this.redoStack.push(currentSnap);
    }
    this._applySnapshot(targetSnap);
    this.updateButtons();
    if (typeof showToast === "function") {
      showToast(`Undid: ${targetSnap.label || "Canvas Action"}`);
    }
  },

  redo() {
    if (this.redoStack.length === 0) return;
    const floor = getActiveFloor();
    const nextSnap = this.redoStack.pop();
    if (floor) {
      const currentSnap = this._cloneFloorGeometry(floor);
      currentSnap.label = nextSnap.label;
      this.undoStack.push(currentSnap);
    }
    this._applySnapshot(nextSnap);
    this.updateButtons();
    if (typeof showToast === "function") {
      showToast(`Redid: ${nextSnap.label || "Canvas Action"}`);
    }
  },

  updateButtons() {
    const undoBtn = document.getElementById("btnPhysUndo");
    const redoBtn = document.getElementById("btnPhysRedo");
    if (undoBtn) {
      undoBtn.disabled = this.undoStack.length === 0;
      const last = this.undoStack[this.undoStack.length - 1];
      undoBtn.title = last ? `Undo: ${last.label} (Ctrl+Z)` : "Undo Canvas Action (Ctrl+Z)";
    }
    if (redoBtn) {
      redoBtn.disabled = this.redoStack.length === 0;
      const next = this.redoStack[this.redoStack.length - 1];
      redoBtn.title = next ? `Redo: ${next.label} (Ctrl+Y)` : "Redo Canvas Action (Ctrl+Y)";
    }
  }
};
window.CanvasHistory = CanvasHistory;

// =========================================================================
// CAMERA FIELD-OF-VIEW (FOV) & IEC 62676-4 DORI / PPF COVERAGE ENGINE
// =========================================================================
function toggleCameraFovCones() {
  showCameraFovCones = !showCameraFovCones;
  const btn = document.getElementById("btnToggleCameraFov");
  if (btn) {
    if (showCameraFovCones) {
      btn.className = "p-1 rounded-lg border border-emerald-600/60 bg-emerald-950/70 text-emerald-300 hover:text-white text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer";
    } else {
      btn.className = "p-1 rounded-lg border border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer";
    }
  }
  renderCableCanvas();
  if (typeof showToast === "function") {
    showToast(showCameraFovCones ? "Camera FOV & DORI PPF coverage cones enabled." : "Camera FOV cones hidden.");
  }
}
window.toggleCameraFovCones = toggleCameraFovCones;

function toggleDoriColorBands() {
  showDoriColorBands = !showDoriColorBands;
  const btn = document.getElementById("btnToggleDoriBands");
  if (btn) {
    if (showDoriColorBands) {
      btn.className = "p-1 rounded-lg border border-sky-600/60 bg-sky-950/70 text-sky-300 hover:text-white text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer";
    } else {
      btn.className = "p-1 rounded-lg border border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer";
    }
  }
  if (!showCameraFovCones && showDoriColorBands) {
    showCameraFovCones = true;
  }
  renderCableCanvas();
  renderInspector();
  if (typeof showToast === "function") {
    showToast(showDoriColorBands ? "DORI Pixel-Per-Foot (PPF) multi-zone color bands enabled." : "Single-zone DORI FOV cones enabled.");
  }
}
window.toggleDoriColorBands = toggleDoriColorBands;

function ensureCameraFovDefaults(dev, bomItem = null) {
  if (!dev) return;
  if (typeof dev.fovEnabled !== "boolean") dev.fovEnabled = true;
  if (typeof dev.fovAngleDeg !== "number" || isNaN(dev.fovAngleDeg)) dev.fovAngleDeg = 0;

  const text = `${bomItem?.model || ""} ${bomItem?.description || ""} ${bomItem?.category || ""} ${bomItem?.formFactor || ""} ${dev.name || ""}`.toLowerCase();
  if ((typeof dev.fovSpanDeg !== "number" || isNaN(dev.fovSpanDeg)) && (typeof dev.fovApertureDeg !== "number" || isNaN(dev.fovApertureDeg))) {
    let defaultSpan = Number(bomItem?.fieldOfViewDeg) || 95;
    if (/fisheye|360|panoramic|multisensor|multi-sensor|quad/i.test(text)) {
      defaultSpan = 360;
    } else if (/180|panoramic-180|dualsensor/i.test(text)) {
      defaultSpan = 180;
    } else if (/lpr|anpr|telephoto|ptz/i.test(text)) {
      defaultSpan = 42;
    } else if (/bullet|varifocal/i.test(text)) {
      defaultSpan = 78;
    }
    dev.fovSpanDeg = defaultSpan;
    dev.fovApertureDeg = defaultSpan;
  } else if (typeof dev.fovApertureDeg === "number" && !isNaN(dev.fovApertureDeg)) {
    dev.fovSpanDeg = dev.fovApertureDeg;
  } else if (typeof dev.fovSpanDeg === "number" && !isNaN(dev.fovSpanDeg)) {
    dev.fovApertureDeg = dev.fovSpanDeg;
  }

  if (typeof dev.fovDistanceFt !== "number" || isNaN(dev.fovDistanceFt)) {
    if (/lpr|anpr|ptz/i.test(text)) {
      dev.fovDistanceFt = 85;
    } else if (/fisheye|360/i.test(text)) {
      dev.fovDistanceFt = 35;
    } else {
      dev.fovDistanceFt = 50;
    }
  }
}

function computeCameraDoriTelemetry(dev, bomItem = null, floor = null) {
  ensureCameraFovDefaults(dev, bomItem);
  const text = `${bomItem?.resolution || ""} ${bomItem?.model || ""} ${bomItem?.description || ""} ${bomItem?.formFactor || ""} ${dev.name || ""}`.toLowerCase();
  const isMultiSensor = /multisensor|multi-sensor|quad|4x|pnm-|q37/i.test(text);

  let horizPixels = 2560; // Default 4MP (2560x1440)
  let mpLabel = "4MP";
  const overrideMp = Number(dev.resolutionMP || bomItem?.sensorMegapixels);
  if (overrideMp >= 20) {
    horizPixels = 7680;
    mpLabel = `${overrideMp}MP Multi`;
  } else if (overrideMp >= 15) {
    horizPixels = 5120;
    mpLabel = `${overrideMp}MP Multi`;
  } else if (overrideMp === 12) {
    horizPixels = 4000;
    mpLabel = "12MP";
  } else if (overrideMp === 8) {
    horizPixels = 3840;
    mpLabel = "4K (8MP)";
  } else if (overrideMp === 6) {
    horizPixels = 3200;
    mpLabel = "6MP";
  } else if (overrideMp === 5) {
    horizPixels = 2592;
    mpLabel = "5MP";
  } else if (overrideMp === 2) {
    horizPixels = 1920;
    mpLabel = "2MP (1080p)";
  } else if (overrideMp === 4) {
    horizPixels = 2560;
    mpLabel = "4MP";
  } else if (/20\s*mp|4\s*x\s*5\s*mp/i.test(text)) {
    horizPixels = 7680;
    mpLabel = "20MP (4x5MP)";
  } else if (/15\s*mp|3\s*x\s*5\s*mp/i.test(text)) {
    horizPixels = 5120;
    mpLabel = "15MP";
  } else if (/12\s*mp|4000\s*x/i.test(text)) {
    horizPixels = 4000;
    mpLabel = "12MP";
  } else if (/4k|8\s*mp|3840\s*x|uhd/i.test(text)) {
    horizPixels = 3840;
    mpLabel = "4K (8MP)";
  } else if (/6\s*mp|3200\s*x/i.test(text)) {
    horizPixels = 3200;
    mpLabel = "6MP";
  } else if (/5\s*mp|2592\s*x/i.test(text)) {
    horizPixels = 2592;
    mpLabel = "5MP";
  } else if (/2\s*mp|1080p|1920\s*x|fhd/i.test(text)) {
    horizPixels = 1920;
    mpLabel = "2MP (1080p)";
  }

  const distFt = Math.max(5, Number(dev.fovDistanceFt) || 45);
  const spanDeg = Math.max(10, Math.min(360, Number(dev.fovApertureDeg || dev.fovSpanDeg) || 95));
  const activeFl = floor || (typeof getActiveFloor === "function" ? getActiveFloor() : null);
  const scaleFt = (activeFl && Number(activeFl.scaleFt) > 0) ? Number(activeFl.scaleFt) : 25;
  const radiusPx = Math.max(28, Math.round((distFt / scaleFt) * 100));

  // Scene horizontal width factor per foot of distance
  let widthFactorPerFt;
  if (spanDeg >= 360) {
    widthFactorPerFt = 2 * Math.PI;
  } else if (spanDeg >= 160) {
    widthFactorPerFt = (spanDeg * Math.PI) / 180;
  } else {
    const halfRad = (Math.min(150, spanDeg) / 2) * (Math.PI / 180);
    widthFactorPerFt = Math.max(0.15, 2 * Math.tan(halfRad));
  }

  const sceneWidthFt = Math.max(2, distFt * widthFactorPerFt);
  const ppf = Math.max(1, Math.round(horizPixels / sceneWidthFt));

  // Compute exact max distance (ft & px) for each DORI band (IEC 62676-4):
  // Identification >= 76 PPF, Recognition >= 38 PPF, Observation >= 19 PPF, Detection >= 8 PPF
  const identMaxFt = Math.max(4, Math.round(horizPixels / (76 * widthFactorPerFt)));
  const recogMaxFt = Math.max(identMaxFt + 2, Math.round(horizPixels / (38 * widthFactorPerFt)));
  const obsvMaxFt = Math.max(recogMaxFt + 4, Math.round(horizPixels / (19 * widthFactorPerFt)));
  const detMaxFt = Math.max(obsvMaxFt + 8, Math.round(horizPixels / (8 * widthFactorPerFt)));

  const ftToPx = (ft) => Math.max(12, Math.round((ft / scaleFt) * 100));

  let doriClass = "Detection";
  let doriShort = "DET";
  let strokeColor = "#f43f5e";
  let fillColor = "rgba(244, 63, 94, 0.16)";
  if (ppf >= 76) {
    doriClass = "Identification";
    doriShort = "IDENT";
    strokeColor = "#10b981";
    fillColor = "rgba(16, 185, 129, 0.18)";
  } else if (ppf >= 38) {
    doriClass = "Recognition";
    doriShort = "RECOG";
    strokeColor = "#0ea5e9";
    fillColor = "rgba(14, 165, 233, 0.18)";
  } else if (ppf >= 19) {
    doriClass = "Observation";
    doriShort = "OBSV";
    strokeColor = "#f59e0b";
    fillColor = "rgba(245, 158, 11, 0.18)";
  }

  return {
    horizPixels,
    mpLabel,
    isMultiSensor,
    distFt,
    spanDeg,
    angleDeg: Number(dev.fovAngleDeg) || 0,
    sceneWidthFt: Math.round(sceneWidthFt * 10) / 10,
    ppf,
    doriClass,
    doriShort,
    strokeColor,
    doriHex: strokeColor,
    fillColor,
    radiusPx,
    doriBands: {
      identFt: identMaxFt,
      recogFt: recogMaxFt,
      obsvFt: obsvMaxFt,
      detFt: detMaxFt,
      identPx: ftToPx(identMaxFt),
      recogPx: ftToPx(recogMaxFt),
      obsvPx: ftToPx(obsvMaxFt),
      detPx: ftToPx(detMaxFt)
    }
  };
}

function updateNodeFovSetting(nodeId, field, rawVal) {
  const floor = getActiveFloor();
  if (!floor) return;
  const node = (floor.nodes || []).find(n => n.id === nodeId);
  if (!node) return;
  CanvasHistory.pushState("Adjust Camera FOV");
  if (field === "fovEnabled") {
    node.fovEnabled = Boolean(rawVal);
  } else if (field === "fovAngleDeg") {
    node.fovAngleDeg = ((parseFloat(rawVal) || 0) % 360 + 360) % 360;
  } else if (field === "fovSpanDeg" || field === "fovApertureDeg") {
    const val = Math.max(10, Math.min(360, parseFloat(rawVal) || 90));
    node.fovSpanDeg = val;
    node.fovApertureDeg = val;
  } else if (field === "fovDistanceFt") {
    node.fovDistanceFt = Math.max(5, Math.min(400, parseFloat(rawVal) || 45));
  } else if (field === "resolutionMP") {
    node.resolutionMP = parseFloat(rawVal) || 4;
  }
  renderCableCanvas();
  renderInspector();
  saveFacilityState();
}
window.updateNodeFovSetting = updateNodeFovSetting;

function getDeviceCableId(dev) {
  if (!dev) return "";
  if (dev.cableId) return dev.cableId;
  if (typeof generateCableScheduleData === "function") {
    try {
      const sched = generateCableScheduleData();
      const match = sched.find(r => r.deviceId === dev.id || r.instanceId === dev.instanceId || r.nodeId === dev.id);
      if (match && match.cableId) return match.cableId;
    } catch (e) {}
  }
  const closetShort = (dev.assignedCloset || (dev.calculatedRun && dev.calculatedRun.closetName) || "MDF").split("•")[0].trim().replace(/\s+/g, "");
  const devNum = (dev.deviceNumber || dev.name || "01").replace(/\D/g, "") || "01";
  return `${closetShort}-${String(devNum).padStart(2, '0')}`;
}

function getFloorDistanceViolations(floor = null) {
  const fl = floor || getActiveFloor();
  if (!fl || !fl.nodes) return { cautions: [], violations: [] };
  const cautions = [];
  const violations = [];
  fl.nodes.filter(n => n.type === "device").forEach(dev => {
    const ft = (dev.calculatedRun && dev.calculatedRun.totalFt) ? dev.calculatedRun.totalFt : 0;
    if (ft > 328) {
      violations.push({ node: dev, ft });
    } else if (ft > 295) {
      cautions.push({ node: dev, ft });
    }
  });
  return { cautions, violations };
}

function updatePhysicalDrcPill() {
  const pill = document.getElementById("physLayoutDrcPill");
  if (!pill) return;
  const { cautions, violations } = getFloorDistanceViolations();
  if (violations.length > 0) {
    pill.className = "px-2.5 py-1.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-600/70 text-rose-300 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer animate-pulse";
    pill.innerHTML = `<i data-lucide="alert-triangle" class="w-3.5 h-3.5 text-rose-400"></i> <span>${violations.length} Violation${violations.length > 1 ? 's' : ''} (>328')</span>`;
    pill.title = `${violations.length} TIA-568 channel violations (>328 ft) and ${cautions.length} cautions (>295 ft). Click to cycle and zoom to violations.`;
  } else if (cautions.length > 0) {
    pill.className = "px-2.5 py-1.5 bg-amber-950/80 hover:bg-amber-900 border border-amber-600/70 text-amber-300 hover:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer";
    pill.innerHTML = `<i data-lucide="alert-circle" class="w-3.5 h-3.5 text-amber-400"></i> <span>${cautions.length} Caution${cautions.length > 1 ? 's' : ''} (>295')</span>`;
    pill.title = `${cautions.length} runs exceed 295 ft caution threshold. Click to cycle and zoom to cautions.`;
  } else {
    pill.className = "px-2.5 py-1.5 bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer";
    pill.innerHTML = `<i data-lucide="check-circle-2" class="w-3.5 h-3.5 text-emerald-400"></i> <span>Distances OK</span>`;
    pill.title = "All field drops within TIA-568 295 ft horizontal channel limit. Click to open DRC health audit.";
  }
  if (window.lucide) lucide.createIcons();
}

function handlePhysicalDrcPillClick() {
  const { cautions, violations } = getFloorDistanceViolations();
  const list = [...violations, ...cautions];
  if (list.length === 0) {
    if (typeof toggleProjectHealthModal === "function") toggleProjectHealthModal();
    return;
  }
  currentDistanceViolationNodeIndex = (currentDistanceViolationNodeIndex + 1) % list.length;
  const target = list[currentDistanceViolationNodeIndex].node;
  selectNode(target.id);
  centerPhysNodeInViewport(target.id);
  if (typeof showToast === "function") {
    showToast(`Focused on ${target.name} (${target.calculatedRun.totalFt} ft run - TIA-568 ${target.calculatedRun.totalFt > 328 ? 'Critical Channel Violation' : 'Caution'})`);
  }
}

function togglePhysicalCableIds() {
  showPhysicalCableIds = !showPhysicalCableIds;
  const btn = document.getElementById("btnTogglePhysicalCableIds");
  if (btn) {
    if (showPhysicalCableIds) {
      btn.classList.add("bg-brand-600", "text-white");
      btn.classList.remove("text-slate-300");
    } else {
      btn.classList.remove("bg-brand-600", "text-white");
      btn.classList.add("text-slate-300");
    }
  }
  renderCableCanvas();
  if (typeof showToast === "function") {
    showToast(showPhysicalCableIds ? "TIA-606-C Cable IDs displayed on floorplan." : "Cable ID tags hidden.");
  }
}

function toggleFieldWalkMode() {
  isFieldWalkMode = !isFieldWalkMode;
  const btn = document.getElementById("btnToggleWalkMode");
  if (btn) {
    if (isFieldWalkMode) {
      btn.classList.add("bg-amber-600", "text-white", "shadow");
      btn.classList.remove("text-slate-300", "hover:text-white");
    } else {
      btn.classList.remove("bg-amber-600", "text-white", "shadow");
      btn.classList.add("text-slate-300", "hover:text-white");
    }
  }
  renderCableCanvas();
  if (typeof showToast === "function") {
    showToast(isFieldWalkMode ? "Field Walk Mode Active: Enlarged touch hit areas enabled for tablet site audits." : "Field Walk Mode Deactivated.");
  }
}

function setPhysicalRevisionCompare(revId) {
  activeRevisionCompareId = (revId === "none" || !revId) ? null : revId;
  renderCableCanvas();
  if (typeof showToast === "function") {
    if (activeRevisionCompareId) {
      showToast(`Visual Revision Compare active: highlighting additions, deletions, and modifications.`);
    } else {
      showToast("Revision Compare turned off.");
    }
  }
}

function populateRevisionCompareDropdown() {
  const sel = document.getElementById("physRevisionCompareSelect");
  if (!sel) return;
  const revisions = (typeof RevisionEngine !== "undefined" && typeof RevisionEngine.getRevisions === "function") 
    ? RevisionEngine.getRevisions() 
    : [];
  
  sel.innerHTML = `<option value="none">Compare Rev: Off</option>` + revisions.map(r => `
    <option value="${r.id}" ${activeRevisionCompareId === r.id ? 'selected' : ''}>${r.code}: ${r.name || 'Snapshot'}</option>
  `).join('');
}

function exportFloorplanToSubmittal() {
  const floor = getActiveFloor();
  if (!floor) {
    if (typeof showToast === "function") showToast("No active floor to export.");
    return;
  }
  if (typeof openSubmittalModal === "function") {
    openSubmittalModal();
  }
  if (typeof showToast === "function") {
    showToast(`Floorplan layout for "${floor.name}" included in Engineering Submittal Package!`);
  }
}

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
let isDraggingFovHandle = false;
let draggedFovNode = null;
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
    updateUnplacedCountBadge();
    populateRevisionCompareDropdown();
    recalculateCurrentFloorCables();
    renderCableCanvas();
    updatePhysicalDrcPill();
    renderInspector();
    renderSidebarTabContent();
    CanvasHistory.updateButtons();
    setTimeout(() => {
      fitPhysicalLayoutToScreen();
    }, 60);
    if (window.lucide) lucide.createIcons();
  } else {
    modal.classList.add("hidden");
    isDraggingPhysNode = false;
    isDraggingPhysWaypoint = false;
    isDraggingFovHandle = false;
    isPhysViewportPanning = false;
    draggedPhysNode = null;
    draggedPhysWaypoint = null;
    draggedFovNode = null;
    const searchPopup = document.getElementById("physQuickSearchResults");
    if (searchPopup) searchPopup.classList.add("hidden");
  }
}

// -----------------------------------------------------------
// Project-Scoped Persistence (Debounced + IndexedDB Blueprint Offloading)
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
    const compactFloors = (typeof StorageService !== "undefined" && typeof StorageService.offloadFloorBlueprints === "function")
      ? StorageService.offloadFloorBlueprints(facilityFloors)
      : facilityFloors;
    const data = {
      activeFloorId,
      activeCableSku,
      useOrthogonalRouting,
      facilityFloors: compactFloors
    };
    const json = JSON.stringify(data);
    if (typeof StorageService !== "undefined" && typeof StorageService.safeSetItem === "function") {
      StorageService.safeSetItem(`netselect_facility_${projId}`, json);
    } else {
      localStorage.setItem(`netselect_facility_${projId}`, json);
    }
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
      if (typeof StorageService !== "undefined" && typeof StorageService.hydrateFloorBlueprints === "function") {
        StorageService.hydrateFloorBlueprints(facilityFloors, () => {
          if (typeof isPhysCanvasVisible === "function" && isPhysCanvasVisible()) {
            renderCableCanvas();
          }
        });
      }
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

function deleteSelectedPhysicalItems() {
  if (selectedNodeIds && selectedNodeIds.size > 1) {
    executeBulkDeleteNodes();
    return;
  }
  if (selectedNodeId) {
    const floor = getActiveFloor();
    const node = floor?.nodes?.find(n => n.id === selectedNodeId);
    if (node) {
      if (node.type === "closet") {
        deleteClosetWithReassignment(node.id);
      } else {
        deleteNode(node.id);
      }
      return;
    }
  }
  if (selectedPathwayTrunkId) {
    deletePathwayTrunk(selectedPathwayTrunkId);
    return;
  }
  if (selectedFiberBackboneId) {
    deleteFiberBackbone(selectedFiberBackboneId);
    return;
  }
}

function handlePhysKeyDown(e) {
  if (!isPhysCanvasVisible()) return;
  const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : "";
  if (activeTag === "input" || activeTag === "textarea" || activeTag === "select" || document.activeElement?.isContentEditable) {
    return;
  }

  // Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z Granular Canvas Undo & Redo
  if (e.ctrlKey || e.metaKey) {
    const k = e.key.toLowerCase();
    if (k === "z" && !e.shiftKey) {
      e.preventDefault();
      CanvasHistory.undo();
      return;
    }
    if (k === "y" || (k === "z" && e.shiftKey)) {
      e.preventDefault();
      CanvasHistory.redo();
      return;
    }
    return;
  }

  // Spacebar pan mode
  if (e.code === "Space" && !e.repeat) {
    isPhysSpacebarDown = true;
    const viewport = document.getElementById("cableCanvasViewport");
    if (viewport && !isPhysViewportPanning) {
      viewport.style.cursor = "grab";
    }
    e.preventDefault();
    return;
  }

  // Physical Layout Hotkeys
  const key = e.key.toUpperCase();
  if (key === "V") {
    setCableTool("select");
  } else if (key === "M") {
    setCableTool("marquee");
  } else if (key === "D") {
    setCableTool("device");
  } else if (key === "C") {
    setCableTool("mdf");
  } else if (key === "T") {
    setCableTool("pathway");
  } else if (key === "F") {
    setCableTool("fiber");
  } else if (key === "R") {
    setCableTool("calibrate");
  } else if (e.key === "Delete" || e.key === "Backspace") {
    deleteSelectedPhysicalItems();
    e.preventDefault();
  } else if (e.key === "Escape") {
    if (activeCableTool !== "select") {
      setCableTool("select");
    } else {
      selectedNodeId = null;
      selectedNodeIds.clear();
      selectedFiberBackboneId = null;
      selectedPathwayTrunkId = null;
      activeDrawingPathwayId = null;
      scaleCalibrationStartPoint = null;
      renderInspector();
      renderSidebarTabContent();
      renderCableCanvas();
    }
  }
}

function handlePhysKeyUp(e) {
  if (e.code === "Space") {
    isPhysSpacebarDown = false;
    const viewport = document.getElementById("cableCanvasViewport");
    if (viewport && !isPhysViewportPanning) {
      viewport.style.cursor = "default";
    }
  }
}

function initCableCanvas() {
  const svg = document.getElementById("cableSvgCanvas");
  const viewport = document.getElementById("cableCanvasViewport");
  if (!svg || svg.dataset.initialized === "true") return;

  svg.dataset.initialized = "true";
  svg.addEventListener("mousedown", handlePhysMouseDown);
  if (viewport) {
    viewport.addEventListener("mousedown", (e) => {
      if (e.button === 1 || isPhysSpacebarDown) {
        isPhysViewportPanning = true;
        physPanStart = {
          x: e.clientX,
          y: e.clientY,
          scrollLeft: viewport.scrollLeft,
          scrollTop: viewport.scrollTop
        };
        viewport.style.cursor = "grabbing";
        e.preventDefault();
      }
    });
    viewport.addEventListener("wheel", handlePhysWheel, { passive: false });
  }
  window.addEventListener("mousemove", handlePhysMouseMove);
  window.addEventListener("mouseup", handlePhysMouseUp);

  if (!isPhysKeyListenersInitialized) {
    isPhysKeyListenersInitialized = true;
    window.addEventListener("keydown", handlePhysKeyDown);
    window.addEventListener("keyup", handlePhysKeyUp);
  }
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

  // Spacebar pan mode or Middle-Click pan mode
  if (e.button === 1 || isPhysSpacebarDown) {
    const viewport = document.getElementById("cableCanvasViewport");
    if (viewport) {
      isPhysViewportPanning = true;
      physPanStart = {
        x: e.clientX,
        y: e.clientY,
        scrollLeft: viewport.scrollLeft,
        scrollTop: viewport.scrollTop
      };
      viewport.style.cursor = "grabbing";
      e.preventDefault();
      e.stopPropagation();
      return;
    }
  }

  const pos = getCanvasCoordinates(e);
  const floor = getActiveFloor();
  if (!floor) return;

  // 0. Interactive Camera FOV Aim / Range Grip Handle
  const fovHandleEl = e.target.closest(".draggable-fov-handle");
  if (fovHandleEl) {
    const nodeId = fovHandleEl.getAttribute("data-node-id");
    const camNode = (floor.nodes || []).find(n => n.id === nodeId);
    if (camNode) {
      CanvasHistory.pushState("Aim Camera FOV");
      selectedNodeId = camNode.id;
      selectedNodeIds.clear();
      selectedNodeIds.add(camNode.id);
      isDraggingFovHandle = true;
      draggedFovNode = camNode;
      e.preventDefault();
      e.stopPropagation();
      return;
    }
  }

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
          CanvasHistory.pushState("Link Fiber Backbone");
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
          selectedNodeIds.clear();
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

  // 1b. Floor Plan Scale Calibration Tool
  if (activeCableTool === "calibrate") {
    if (!scaleCalibrationStartPoint) {
      scaleCalibrationStartPoint = { x: pos.x, y: pos.y };
      renderCableCanvas();
      if (typeof showToast === "function") {
        showToast("Point 1 marked. Now click Point 2 at the other end of known distance.");
      }
    } else {
      const p1 = scaleCalibrationStartPoint;
      const p2 = { x: pos.x, y: pos.y };
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const distPx = Math.sqrt(dx * dx + dy * dy);
      scaleCalibrationStartPoint = null;

      if (distPx < 5) {
        if (typeof showToast === "function") showToast("Points too close together to calibrate scale.");
        renderCableCanvas();
        return;
      }

      const input = prompt(`Measured calibration vector: ${Math.round(distPx)} pixels.\nEnter real-world distance in feet (e.g. 10 for corridor, 3 for door opening, 30 for building bay):`, "10");
      if (input !== null) {
        const realFeet = parseFloat(input);
        if (realFeet > 0) {
          CanvasHistory.pushState("Calibrate Floor Scale");
          const scaleFtFor100Px = (realFeet / distPx) * 100;
          floor.scaleFt = Math.round(scaleFtFor100Px * 10) / 10;
          const scaleInput = document.getElementById("cableScaleFt");
          if (scaleInput) scaleInput.value = floor.scaleFt;
          syncFloorControlInputs();
          recalculateCurrentFloorCables();
          renderCableCanvas();
          saveFacilityState();
          setCableTool("select");
          if (typeof showToast === "function") {
            showToast(`Scale Calibrated! 100px = ${floor.scaleFt} ft (${Math.round((distPx / realFeet) * 10) / 10} px/ft)`);
          }
        }
      } else {
        renderCableCanvas();
      }
    }
    return;
  }

  // 1c. Main Pathway Trunk Corridor Tool
  if (activeCableTool === "pathway") {
    floor.pathwayTrunks = floor.pathwayTrunks || [];
    if (!activeDrawingPathwayId) {
      CanvasHistory.pushState("Draw Pathway Trunk");
      const newTrunk = {
        id: `pathway-${Date.now()}`,
        name: `Corridor Trunk #${floor.pathwayTrunks.length + 1}`,
        type: "tray",
        capacity: 80,
        points: [{ x: pos.x, y: pos.y }, { x: pos.x + 60, y: pos.y }]
      };
      floor.pathwayTrunks.push(newTrunk);
      activeDrawingPathwayId = newTrunk.id;
      selectedPathwayTrunkId = newTrunk.id;
      selectedNodeId = null;
      selectedNodeIds.clear();
      recalculateCurrentFloorCables();
      renderCableCanvas();
      renderInspector();
      saveFacilityState();
      if (typeof showToast === "function") {
        showToast("Pathway started! Click along corridor to add bends, or switch tool to finish.");
      }
    } else {
      const trunk = floor.pathwayTrunks.find(t => t.id === activeDrawingPathwayId);
      if (trunk) {
        CanvasHistory.pushState("Extend Pathway Trunk");
        trunk.points.push({ x: pos.x, y: pos.y });
        selectedPathwayTrunkId = trunk.id;
        recalculateCurrentFloorCables();
        renderCableCanvas();
        renderInspector();
        saveFacilityState();
      }
    }
    return;
  }

  // 1c. Click Pathway Corridor or Joint
  const jointEl = e.target.closest(".draggable-pathway-joint");
  if (jointEl) {
    const pId = jointEl.getAttribute("data-pathway-id");
    const jIdx = parseInt(jointEl.getAttribute("data-joint-idx"), 10);
    const trunk = (floor.pathwayTrunks || []).find(t => t.id === pId);
    if (trunk && trunk.points && trunk.points[jIdx]) {
      CanvasHistory.pushState("Modify Pathway Trunk");
      if (e.altKey && trunk.points.length > 2) {
        trunk.points.splice(jIdx, 1);
        recalculateCurrentFloorCables();
        renderCableCanvas();
        saveFacilityState();
        return;
      }
      isDraggingPhysWaypoint = true;
      draggedPhysWaypoint = trunk.points[jIdx];
      physDragOffset.x = pos.x - draggedPhysWaypoint.x;
      physDragOffset.y = pos.y - draggedPhysWaypoint.y;
      selectedPathwayTrunkId = trunk.id;
      selectedNodeId = null;
      selectedNodeIds.clear();
      renderInspector();
      e.stopPropagation();
      return;
    }
  }

  const corridorEl = e.target.closest(".pathway-corridor-interactive");
  if (corridorEl) {
    const pId = corridorEl.getAttribute("data-pathway-id");
    if (pId) {
      selectedPathwayTrunkId = pId;
      selectedNodeId = null;
      selectedNodeIds.clear();
      selectedFiberBackboneId = null;
      renderInspector();
      renderCableCanvas();
      e.stopPropagation();
      return;
    }
  }

  // 2. Add Drop
  if (activeCableTool === "device") {
    CanvasHistory.pushState("Place Drop");
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
    selectedNodeIds.clear();
    selectedNodeIds.add(newDrop.id);
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
    CanvasHistory.pushState("Place Closet");
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
    selectedNodeIds.clear();
    selectedNodeIds.add(newCloset.id);
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
      CanvasHistory.pushState("Adjust Cable Bend");
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
      CanvasHistory.pushState("Insert Cable Bend");
      if (!drop.waypoints) drop.waypoints = [];
      const newWp = { x: pos.x, y: pos.y };
      drop.waypoints.push(newWp);
      selectedNodeId = drop.id;
      selectedNodeIds.clear();
      selectedNodeIds.add(drop.id);
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
      CanvasHistory.pushState("Delete Fiber Backbone");
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
      if (typeof WalkReconciliationEngine !== "undefined" && WalkReconciliationEngine.isFieldAuditModeActive) {
        node.walkVerified = !node.walkVerified;
        node.walkDate = new Date().toISOString().split('T')[0];
        saveFacilityState();
        renderCableCanvas();
        if (typeof showToast === "function") {
          showToast(`${node.name}: Marked ${node.walkVerified ? "✓ VERIFIED" : "Unverified"}`);
        }
        return;
      }

      selectedPathwayTrunkId = null;
      selectedFiberBackboneId = null;

      if (e.shiftKey) {
        if (selectedNodeIds.has(nodeId)) {
          selectedNodeIds.delete(nodeId);
        } else {
          selectedNodeIds.add(nodeId);
        }
        selectedNodeId = selectedNodeIds.size === 1 ? Array.from(selectedNodeIds)[0] : null;
      } else {
        if (!selectedNodeIds.has(nodeId)) {
          selectedNodeIds.clear();
          selectedNodeIds.add(nodeId);
          selectedNodeId = nodeId;
        }
      }

      CanvasHistory.pushState(`Move ${node.name || "Node"}`);
      isDraggingPhysNode = true;
      draggedPhysNode = node;
      physDragOffset.x = pos.x - node.x;
      physDragOffset.y = pos.y - node.y;

      // Prepare multi-drag positions
      multiDragStartPos = { x: pos.x, y: pos.y };
      multiDragInitialPos = {};
      selectedNodeIds.forEach(id => {
        const n = floor.nodes.find(x => x.id === id);
        if (n) multiDragInitialPos[id] = { x: n.x, y: n.y };
      });

      renderInspector();
      renderSidebarTabContent();
      renderCableCanvas();
      e.stopPropagation();
      return;
    }
  }

  // 7. Marquee Selection on Empty Canvas
  if (activeCableTool === "marquee" || (e.shiftKey && activeCableTool === "select")) {
    isMarqueeSelecting = true;
    marqueeStart = { x: pos.x, y: pos.y };
    marqueeCurrent = { x: pos.x, y: pos.y };
    if (!e.shiftKey) {
      selectedNodeIds.clear();
      selectedNodeId = null;
    }
    selectedPathwayTrunkId = null;
    selectedFiberBackboneId = null;
    renderCableCanvas();
    return;
  }

  // Click empty canvas -> deselect node & fiber backbone & pathway
  selectedNodeId = null;
  selectedNodeIds.clear();
  selectedFiberBackboneId = null;
  selectedPathwayTrunkId = null;
  if (activeCableTool !== "pathway") {
    activeDrawingPathwayId = null;
  }
  renderInspector();
  renderSidebarTabContent();
  renderCableCanvas();

  // 8. Pan Viewport (Drag Canvas to Pan - identical to Topology Canvas)
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
    recalculateCurrentFloorCables(true);
    renderCableCanvas();
  });
}

/**
 * 4.2 Performance Optimization: 60 FPS Fast-Path DOM Updater during Active Node Dragging.
 * Updates node transforms, FOV cones, and affected cable run SVG groups in-place without
 * destroying and recreating the entire 2,000+ element `#cableSvgCanvas` on every mousemove frame.
 */
let _physFastDragRaf = false;
function requestPhysDragFastUpdate() {
  if (_physFastDragRaf) return;
  _physFastDragRaf = true;
  requestAnimationFrame(() => {
    _physFastDragRaf = false;
    const floor = getActiveFloor();
    const svg = document.getElementById("cableSvgCanvas");
    if (!floor || !svg) return;

    recalculateCurrentFloorCables(true);

    const movedIds = (selectedNodeIds && selectedNodeIds.size > 0)
      ? Array.from(selectedNodeIds)
      : (draggedPhysNode ? [draggedPhysNode.id] : []);

    const movedSet = new Set(movedIds);
    const allClosets = getAllClosetsAcrossFacility();

    // 1. Update moved node <g> and FOV <g> transforms in-place
    movedIds.forEach(id => {
      const n = floor.nodes.find(x => x.id === id);
      if (!n) return;
      const nodeG = svg.querySelector(`.draggable-canvas-node[data-node-id="${id}"]`);
      if (nodeG) {
        nodeG.setAttribute("transform", `translate(${n.x}, ${n.y})`);
      }
      const fovG = svg.querySelector(`.camera-fov-cone-group[data-fov-node-id="${id}"]`);
      if (fovG) {
        fovG.setAttribute("transform", `translate(${n.x}, ${n.y})`);
      }
    });

    // 2. Update affected horizontal cable groups in-place
    floor.nodes.filter(n => n.type === "device").forEach(dev => {
      if (!movedSet.has(dev.id) && !movedSet.has(dev.assignedClosetId)) return;
      const runG = svg.querySelector(`.device-cable-run-group[data-cable-group-id="${dev.id}"]`);
      if (!runG || !dev.calculatedRun) return;

      const run = dev.calculatedRun;
      const pts = run.points || [];
      const lines = runG.querySelectorAll(".cable-path-line");

      // If segment count matches, update line coordinates directly; otherwise rebuild only this single cable group
      if (lines.length === pts.length - 1) {
        for (let i = 0; i < pts.length - 1; i++) {
          lines[i].setAttribute("x1", pts[i].x);
          lines[i].setAttribute("y1", pts[i].y);
          lines[i].setAttribute("x2", pts[i + 1].x);
          lines[i].setAttribute("y2", pts[i + 1].y);
        }
      } else {
        const bomItem = (typeof projectBOM !== "undefined" && dev.instanceId) ? projectBOM.find(i => i.instanceId === dev.instanceId) : null;
        const runStd = (typeof getProjectCablingStandard === "function") ? getProjectCablingStandard(bomItem || dev, "run") : { hex: "#eab308" };
        const cableColorHex = runStd.hex || "#eab308";
        lines.forEach(l => l.remove());
        for (let i = pts.length - 2; i >= 0; i--) {
          const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
          line.setAttribute("class", "cable-path-line cursor-pointer");
          line.setAttribute("data-drop-id", dev.id);
          line.setAttribute("x1", pts[i].x);
          line.setAttribute("y1", pts[i].y);
          line.setAttribute("x2", pts[i + 1].x);
          line.setAttribute("y2", pts[i + 1].y);
          line.setAttribute("stroke", run.isExceeded ? "#f43f5e" : "#a855f7");
          line.setAttribute("stroke-width", "4");
          runG.insertBefore(line, runG.firstChild);
        }
      }

      const tag = runG.querySelector(".cable-footage-tag");
      if (tag && pts.length >= 2) {
        const midIdx = Math.floor(pts.length / 2);
        const midX = (pts[midIdx - 1].x + pts[midIdx].x) / 2;
        const midY = (pts[midIdx - 1].y + pts[midIdx].y) / 2;
        let closet = allClosets.find(c => c.id === dev.assignedClosetId) || allClosets[0];
        const isCrossFloor = closet && closet.floorId !== floor.id;
        const snappedCount = (run.traversedTrunks && run.traversedTrunks.length) ? ` [Tray]` : "";
        tag.setAttribute("x", midX);
        tag.setAttribute("y", midY - 6);
        tag.textContent = `${run.totalFt} ft ${isCrossFloor ? `(Riser)` : ''}${snappedCount}`;
      }
    });
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

  // Interactive Camera FOV Aim & Range Handle Dragging (60 FPS in-place update)
  if (isDraggingFovHandle && draggedFovNode) {
    const pos = getCanvasCoordinates(e);
    const floor = getActiveFloor();
    const dx = pos.x - draggedFovNode.x;
    const dy = pos.y - draggedFovNode.y;
    const angleDeg = ((Math.round((Math.atan2(dy, dx) * 180) / Math.PI) % 360) + 360) % 360;
    const distPx = Math.max(24, Math.hypot(dx, dy));
    const fPxToFt = ((floor && floor.scaleFt) ? floor.scaleFt : 25) / 100;
    const distFt = Math.max(10, Math.min(300, Math.round(distPx * fPxToFt)));

    draggedFovNode.fovAngleDeg = angleDeg;
    draggedFovNode.fovDistanceFt = distFt;

    const svg = document.getElementById("cableSvgCanvas");
    if (svg) {
      const fovG = svg.querySelector(`.camera-fov-cone-group[data-fov-node-id="${draggedFovNode.id}"]`);
      if (fovG) {
        const bomItem = (typeof projectBOM !== "undefined" && draggedFovNode.instanceId)
          ? projectBOM.find(i => i.instanceId === draggedFovNode.instanceId)
          : null;
        renderCameraFovGroupContent(fovG, draggedFovNode, bomItem, floor, true);
      }
    }
    return;
  }

  // Marquee Selection dragging
  if (isMarqueeSelecting) {
    const pos = getCanvasCoordinates(e);
    marqueeCurrent = { x: pos.x, y: pos.y };
    const svg = document.getElementById("cableSvgCanvas");
    if (svg) {
      let box = document.getElementById("svgMarqueeBox");
      if (!box) {
        box = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        box.setAttribute("id", "svgMarqueeBox");
        box.setAttribute("fill", "rgba(99, 102, 241, 0.18)");
        box.setAttribute("stroke", "#818cf8");
        box.setAttribute("stroke-width", "1.5");
        box.setAttribute("stroke-dasharray", "4 3");
        box.style.pointerEvents = "none";
        svg.appendChild(box);
      }
      const bx = Math.min(marqueeStart.x, marqueeCurrent.x);
      const by = Math.min(marqueeStart.y, marqueeCurrent.y);
      const bw = Math.abs(marqueeCurrent.x - marqueeStart.x);
      const bh = Math.abs(marqueeCurrent.y - marqueeStart.y);
      box.setAttribute("x", bx);
      box.setAttribute("y", by);
      box.setAttribute("width", bw);
      box.setAttribute("height", bh);
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
    // If multiple nodes selected, drag all selected together
    if (selectedNodeIds && selectedNodeIds.size > 1 && Object.keys(multiDragInitialPos).length > 1) {
      const floor = getActiveFloor();
      const dx = pos.x - multiDragStartPos.x;
      const dy = pos.y - multiDragStartPos.y;
      selectedNodeIds.forEach(id => {
        const n = floor.nodes.find(x => x.id === id);
        if (n && multiDragInitialPos[id]) {
          n.x = Math.max(30, multiDragInitialPos[id].x + dx);
          n.y = Math.max(30, multiDragInitialPos[id].y + dy);
        }
      });
      // If any closet is being dragged, use full redraw; otherwise 60fps fast-path
      const hasCloset = Array.from(selectedNodeIds).some(id => {
        const n = floor.nodes.find(x => x.id === id);
        return n && n.type === "closet";
      });
      if (hasCloset) requestPhysCanvasRedraw();
      else requestPhysDragFastUpdate();
      return;
    }

    draggedPhysNode.x = Math.max(30, pos.x - physDragOffset.x);
    draggedPhysNode.y = Math.max(30, pos.y - physDragOffset.y);
    if (draggedPhysNode.type === "closet") {
      requestPhysCanvasRedraw();
    } else {
      requestPhysDragFastUpdate();
    }
  }
}

function handlePhysMouseUp() {
  if (isPhysViewportPanning) {
    isPhysViewportPanning = false;
    const viewport = document.getElementById("cableCanvasViewport");
    if (viewport) viewport.style.cursor = isPhysSpacebarDown ? "grab" : "default";
  }

  if (isDraggingFovHandle) {
    isDraggingFovHandle = false;
    draggedFovNode = null;
    renderCableCanvas();
    renderInspector();
    saveFacilityState(true);
    return;
  }

  if (isMarqueeSelecting) {
    isMarqueeSelecting = false;
    const box = document.getElementById("svgMarqueeBox");
    if (box) box.remove();

    const floor = getActiveFloor();
    if (floor && floor.nodes) {
      const minX = Math.min(marqueeStart.x, marqueeCurrent.x);
      const maxX = Math.max(marqueeStart.x, marqueeCurrent.x);
      const minY = Math.min(marqueeStart.y, marqueeCurrent.y);
      const maxY = Math.max(marqueeStart.y, marqueeCurrent.y);

      if (Math.abs(maxX - minX) > 8 && Math.abs(maxY - minY) > 8) {
        const insideNodes = floor.nodes.filter(n => n.x >= minX && n.x <= maxX && n.y >= minY && n.y <= maxY);
        insideNodes.forEach(n => selectedNodeIds.add(n.id));
        selectedNodeId = selectedNodeIds.size === 1 ? Array.from(selectedNodeIds)[0] : null;
        if (selectedNodeIds.size > 0 && typeof showToast === "function") {
          showToast(`Selected ${selectedNodeIds.size} nodes. Configure bulk options in Inspector.`);
        }
      }
    }
    renderInspector();
    renderCableCanvas();
  }

  if (isDraggingPhysWaypoint || isDraggingPhysNode) {
    isDraggingPhysWaypoint = false;
    draggedPhysWaypoint = null;
    isDraggingPhysNode = false;
    draggedPhysNode = null;
    multiDragInitialPos = {};
    recalculateCurrentFloorCables();
    renderCableCanvas();
    renderInspector();
    renderSidebarTabContent();
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

function toggleFloorActionMenu(forceState) {
  const menu = document.getElementById("floorActionMenu");
  if (!menu) return;
  if (typeof forceState === "boolean") {
    if (forceState) menu.classList.remove("hidden");
    else menu.classList.add("hidden");
  } else {
    menu.classList.toggle("hidden");
  }
}

document.addEventListener("click", (e) => {
  const floorContainer = document.getElementById("floorActionsDropdownContainer");
  const floorMenu = document.getElementById("floorActionMenu");
  if (floorMenu && !floorMenu.classList.contains("hidden")) {
    if (floorContainer && !floorContainer.contains(e.target)) {
      floorMenu.classList.add("hidden");
    }
  }
});

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
  const scaleBadgeLabel = document.getElementById("physHeaderScaleLabel");

  const scaleFtVal = floor ? (floor.scaleFt || 25) : 25;
  if (scaleBadgeLabel) {
    scaleBadgeLabel.textContent = `Scale: 100px = ${scaleFtVal} ft`;
  }

  if (!floor) {
    if (scaleInput) scaleInput.value = 25;
    if (slackInput) slackInput.value = 15;
    if (slabInput) slackInput.value = 14;
    return;
  }

  if (scaleInput) scaleInput.value = floor.scaleFt || 25;
  if (slackInput) slackInput.value = floor.slackFt || 15;
  if (slabInput) slabInput.value = floor.slabFt || 14;
  if (cableSelect) cableSelect.value = activeCableSku;
}

/**
 * Downscales a canvas if its longest edge exceeds maxEdge (default 3840px 4K)
 * and encodes to compressed WebP (0.82 quality) to prevent 15MB PNG localStorage blowouts.
 */
function compressCanvasToWebpDataUrl(sourceCanvas, maxEdge = 3840, quality = 0.82) {
  let targetCanvas = sourceCanvas;
  const w = sourceCanvas.width || 1;
  const h = sourceCanvas.height || 1;
  const longest = Math.max(w, h);

  if (longest > maxEdge) {
    const ratio = maxEdge / longest;
    targetCanvas = document.createElement("canvas");
    targetCanvas.width = Math.round(w * ratio);
    targetCanvas.height = Math.round(h * ratio);
    const tCtx = targetCanvas.getContext("2d");
    tCtx.imageSmoothingEnabled = true;
    tCtx.imageSmoothingQuality = "high";
    tCtx.drawImage(sourceCanvas, 0, 0, targetCanvas.width, targetCanvas.height);
  }

  let dataUrl = targetCanvas.toDataURL("image/webp", quality);
  if (!dataUrl || !dataUrl.startsWith("data:image/webp")) {
    dataUrl = targetCanvas.toDataURL("image/jpeg", quality);
  }
  return dataUrl;
}

/**
 * Compresses an uploaded raster image file (PNG/JPG/WebP) to WebP (0.82, max 3840px).
 */
function compressImageFileToWebpDataUrl(file, maxEdge = 3840, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => resolve(e.target.result);
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth || img.width || 1920;
          canvas.height = img.naturalHeight || img.height || 1080;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0);
          resolve(compressCanvasToWebpDataUrl(canvas, maxEdge, quality));
        } catch (err) {
          resolve(e.target.result);
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Renders a specific 1-indexed page of a PDF.js document to a compressed WebP DataURL.
 */
async function renderPdfPageToWebp(pdf, pageNumber, renderScale = 2.0) {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale: renderScale });
  const offCanvas = document.createElement("canvas");
  const ctx = offCanvas.getContext("2d");
  offCanvas.width = viewport.width;
  offCanvas.height = viewport.height;
  await page.render({ canvasContext: ctx, viewport }).promise;
  return compressCanvasToWebpDataUrl(offCanvas, 3840, 0.82);
}

/**
 * Interactive Multi-Page PDF Blueprint Sheet Selector Modal.
 * Allows importing a single sheet onto the active floor or batch-creating floors from selected sheets.
 */
async function openPdfSheetSelectorModal(pdf, fileName) {
  let existing = document.getElementById("pdfSheetSelectorModal");
  if (existing) existing.remove();

  const activeFloor = getActiveFloor();
  const numPages = pdf.numPages;

  const modal = document.createElement("div");
  modal.id = "pdfSheetSelectorModal";
  modal.className = "fixed inset-0 z-[120] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4";

  const pageCardsHtml = [];
  for (let p = 1; p <= numPages; p++) {
    pageCardsHtml.push(`
      <label class="group relative flex flex-col bg-slate-900/90 hover:bg-slate-800/90 border border-slate-700/80 hover:border-brand-500 rounded-xl p-2.5 cursor-pointer transition-all shadow-sm">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <input type="checkbox" class="pdf-sheet-checkbox w-4 h-4 rounded accent-indigo-500 cursor-pointer" value="${p}" ${p === 1 ? "checked" : ""} />
            <span class="text-xs font-bold text-white font-mono">Sheet ${p} of ${numPages}</span>
          </div>
          <button type="button" data-single-page="${p}" class="pdf-single-import-btn px-2 py-0.5 rounded bg-brand-600/30 hover:bg-brand-600 text-brand-200 hover:text-white border border-brand-500/40 text-[10px] font-bold transition-colors cursor-pointer">
            Use on ${escapeHTML(activeFloor ? activeFloor.name : "Current Floor")}
          </button>
        </div>
        <div class="relative w-full h-36 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-center overflow-hidden">
          <canvas id="pdfThumbCanvas_${p}" class="max-w-full max-h-full object-contain"></canvas>
          <span id="pdfThumbLoader_${p}" class="text-[10px] font-mono text-slate-500 animate-pulse">Rendering preview...</span>
        </div>
        <input type="text" id="pdfSheetFloorName_${p}" value="${escapeHTML(fileName.replace(/\.pdf$/i, ""))} - Sheet ${p}" class="mt-2 w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded px-2 py-1 text-[11px] text-slate-200 font-medium" placeholder="Floor name for batch import..." onclick="event.stopPropagation();" />
      </label>
    `);
  }

  modal.innerHTML = `
    <div class="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden">
      <div class="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
        <div class="flex items-center gap-3">
          <div class="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
            <i data-lucide="layers" class="w-5 h-5"></i>
          </div>
          <div>
            <h3 class="text-sm font-bold text-white">Multi-Page Architectural PDF Detected (${numPages} Sheets)</h3>
            <p class="text-xs text-slate-400">Select a single sheet for <strong class="text-indigo-300">${escapeHTML(activeFloor ? activeFloor.name : "Active Floor")}</strong> or batch-import multiple sheets as separate floors.</p>
          </div>
        </div>
        <button type="button" id="btnClosePdfSheetModal" class="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer">
          <i data-lucide="x" class="w-4 h-4"></i>
        </button>
      </div>

      <div class="px-5 py-2.5 bg-slate-950/40 border-b border-slate-800 flex items-center justify-between text-xs">
        <div class="flex items-center gap-3">
          <button type="button" id="btnSelectAllPdfSheets" class="text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer">Select All (${numPages})</button>
          <span class="text-slate-700">|</span>
          <button type="button" id="btnClearAllPdfSheets" class="text-slate-400 hover:text-slate-200 font-semibold cursor-pointer">Clear Selection</button>
        </div>
        <span class="text-[11px] font-mono text-emerald-400">WebP 0.82 Compression + IndexedDB Offload Active</span>
      </div>

      <div class="p-5 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 flex-1">
        ${pageCardsHtml.join("")}
      </div>

      <div class="px-5 py-3.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between gap-3">
        <button type="button" id="btnCancelPdfSheetModal" class="px-3.5 py-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer">
          Cancel
        </button>
        <div class="flex items-center gap-2">
          <button type="button" id="btnBatchImportPdfSheets" class="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg flex items-center gap-1.5 cursor-pointer">
            <i data-lucide="folder-plus" class="w-3.5 h-3.5"></i>
            <span>Batch Import Checked Sheets as Floors</span>
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  if (window.lucide) lucide.createIcons();

  const closeModal = () => modal.remove();
  modal.querySelector("#btnClosePdfSheetModal")?.addEventListener("click", closeModal);
  modal.querySelector("#btnCancelPdfSheetModal")?.addEventListener("click", closeModal);

  modal.querySelector("#btnSelectAllPdfSheets")?.addEventListener("click", () => {
    modal.querySelectorAll(".pdf-sheet-checkbox").forEach(cb => { cb.checked = true; });
  });
  modal.querySelector("#btnClearAllPdfSheets")?.addEventListener("click", () => {
    modal.querySelectorAll(".pdf-sheet-checkbox").forEach(cb => { cb.checked = false; });
  });

  // Single-page import buttons
  modal.querySelectorAll(".pdf-single-import-btn").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const pageNum = parseInt(btn.getAttribute("data-single-page"), 10);
      if (!pageNum || !activeFloor) return;
      const spinner = document.getElementById("pdfRenderSpinner");
      if (spinner) spinner.classList.remove("hidden");
      closeModal();
      try {
        CanvasHistory.pushState("Upload Blueprint PDF");
        activeFloor.image = await renderPdfPageToWebp(pdf, pageNum, 2.0);
        renderCableCanvas();
        saveFacilityState(true);
        if (typeof showToast === "function") {
          showToast(`Imported Sheet ${pageNum} of ${numPages} to ${activeFloor.name}`);
        }
      } finally {
        if (spinner) spinner.classList.add("hidden");
      }
    });
  });

  // Batch import checked sheets
  modal.querySelector("#btnBatchImportPdfSheets")?.addEventListener("click", async () => {
    const checkedPages = Array.from(modal.querySelectorAll(".pdf-sheet-checkbox:checked"))
      .map(cb => parseInt(cb.value, 10))
      .filter(n => n > 0);

    if (checkedPages.length === 0) {
      if (typeof showToast === "function") showToast("Select at least one PDF sheet to import.", "warning");
      return;
    }

    const spinner = document.getElementById("pdfRenderSpinner");
    if (spinner) spinner.classList.remove("hidden");

    const customNames = {};
    checkedPages.forEach(p => {
      const inp = modal.querySelector(`#pdfSheetFloorName_${p}`);
      customNames[p] = (inp && inp.value.trim()) ? inp.value.trim() : `Sheet ${p}`;
    });

    closeModal();

    try {
      CanvasHistory.pushState("Batch Import PDF Sheets");
      let firstImportedFloorId = null;

      for (let i = 0; i < checkedPages.length; i++) {
        const pageNum = checkedPages[i];
        const webpDataUrl = await renderPdfPageToWebp(pdf, pageNum, 2.0);

        if (i === 0 && activeFloor && !activeFloor.image) {
          // Populate current active floor if it doesn't have an image yet
          activeFloor.image = webpDataUrl;
          firstImportedFloorId = activeFloor.id;
        } else {
          const floorTitle = customNames[pageNum];
          let newFloorId = `floor-pdf-${Date.now()}-${pageNum}`;
          if (typeof FacilityStore !== "undefined" && typeof FacilityStore.addFloor === "function") {
            const created = FacilityStore.addFloor(floorTitle, facilityFloors.length + 1, 14);
            if (created && created.id) newFloorId = created.id;
          }
          let targetFl = facilityFloors.find(f => f.id === newFloorId);
          if (!targetFl) {
            targetFl = {
              id: newFloorId,
              name: floorTitle,
              levelIndex: facilityFloors.length + 1,
              image: webpDataUrl,
              opacity: 0.7,
              scaleFt: 25,
              slackFt: 15,
              slabFt: 14,
              nodes: [],
              fiberBackbones: [],
              pathwayTrunks: []
            };
            facilityFloors.push(targetFl);
          } else {
            targetFl.image = webpDataUrl;
          }
          if (!firstImportedFloorId) firstImportedFloorId = targetFl.id;
        }
      }

      if (firstImportedFloorId) {
        activeFloorId = firstImportedFloorId;
      }
      renderFloorSelector();
      syncFloorControlInputs();
      recalculateCurrentFloorCables();
      renderCableCanvas();
      saveFacilityState(true);
      if (typeof showToast === "function") {
        showToast(`Batch imported ${checkedPages.length} blueprint sheet${checkedPages.length === 1 ? "" : "s"} (WebP compressed).`);
      }
    } finally {
      if (spinner) spinner.classList.add("hidden");
    }
  });

  // Render lightweight thumbnails asynchronously for each sheet
  for (let p = 1; p <= Math.min(numPages, 24); p++) {
    (async (pageIdx) => {
      try {
        const page = await pdf.getPage(pageIdx);
        const vp = page.getViewport({ scale: 0.35 });
        const thumbCanvas = document.getElementById(`pdfThumbCanvas_${pageIdx}`);
        const loader = document.getElementById(`pdfThumbLoader_${pageIdx}`);
        if (!thumbCanvas) return;
        thumbCanvas.width = vp.width;
        thumbCanvas.height = vp.height;
        await page.render({ canvasContext: thumbCanvas.getContext("2d"), viewport: vp }).promise;
        if (loader) loader.remove();
      } catch (e) {
        // Ignore thumbnail error if modal closed early
      }
    })(p);
  }
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

      if (pdf.numPages > 1) {
        if (spinner) spinner.classList.add("hidden");
        await openPdfSheetSelectorModal(pdf, file.name || "Blueprint.pdf");
        event.target.value = "";
        return;
      }

      CanvasHistory.pushState("Upload Blueprint PDF");
      floor.image = await renderPdfPageToWebp(pdf, 1, 2.0);
      if (spinner) spinner.classList.add("hidden");

      renderCableCanvas();
      saveFacilityState(true);
      if (typeof showToast === "function") {
        showToast(`Rendered PDF blueprint to ${floor.name} (WebP optimized)`);
      }
    } catch (err) {
      if (spinner) spinner.classList.add("hidden");
      alert("Could not render PDF blueprint. Ensure file is a valid document.");
    }
  } else {
    const spinner = document.getElementById("pdfRenderSpinner");
    if (spinner) spinner.classList.remove("hidden");
    try {
      CanvasHistory.pushState("Upload Blueprint Image");
      floor.image = await compressImageFileToWebpDataUrl(file, 3840, 0.82);
      renderCableCanvas();
      saveFacilityState(true);
      if (typeof showToast === "function") {
        showToast(`Uploaded & compressed blueprint to ${floor.name}`);
      }
    } catch (err) {
      console.warn("[PhysicalLayout] Image compression fallback:", err);
    } finally {
      if (spinner) spinner.classList.add("hidden");
    }
  }
  event.target.value = "";
}

// -----------------------------------------------------------
// Tools, Zoom, & Bends
// -----------------------------------------------------------
function setCableTool(tool) {
  activeCableTool = tool;
  fiberFirstClosetId = null;
  if (tool !== "pathway") {
    activeDrawingPathwayId = null;
  }

  const tools = ["select", "marquee", "device", "mdf", "pathway", "fiber", "calibrate"];
  tools.forEach(t => {
    const btn = document.getElementById(`tool-${t}`);
    if (!btn) return;
    if (t === tool) {
      btn.classList.add("bg-brand-600", "text-white", "shadow");
      btn.classList.remove("text-slate-300", "hover:text-white");
    } else {
      btn.classList.remove("bg-brand-600", "text-white", "shadow");
      btn.classList.add("text-slate-300", "hover:text-white");
    }
  });

  const svg = document.getElementById("cableSvgCanvas");
  if (svg) {
    if (tool === "select") svg.style.cursor = "default";
    else if (tool === "marquee") svg.style.cursor = "crosshair";
    else if (tool === "pathway") svg.style.cursor = "crosshair";
    else if (tool === "fiber") svg.style.cursor = "cell";
    else if (tool === "calibrate") svg.style.cursor = "crosshair";
    else svg.style.cursor = "crosshair";
  }

  if (tool === "fiber" && typeof showToast === "function") {
    showToast("Fiber Mode: Click closet A, then closet B to link backbone trunk.");
  } else if (tool === "pathway" && typeof showToast === "function") {
    showToast("Pathway Trunk Mode: Click to draw main cable tray / J-hook corridors.");
  } else if (tool === "marquee" && typeof showToast === "function") {
    showToast("Marquee Multi-Select: Click and drag a box across devices to bulk-select.");
  } else if (tool === "calibrate" && typeof showToast === "function") {
    showToast("Scale Calibration: Click Point 1, then Point 2 across a known distance (e.g. corridor or door).");
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
window.getAllClosetsAcrossFacility = getAllClosetsAcrossFacility;

/**
 * Renders the SVG child elements of a Camera FOV & DORI cone group in-place.
 * Supports standard directional wedges (<360°), full 360° fisheye/multi-sensor domes,
 * and IEC 62676-4 concentric DORI Pixel Density Color Bands (Identification, Recognition, Observation, Detection).
 */
function renderCameraFovGroupContent(fovG, dev, bomItem, floor, isSelected) {
  if (!fovG || !dev) return;
  fovG.innerHTML = "";

  const telem = computeCameraDoriTelemetry(dev, bomItem, floor);
  const radiusPx = Math.max(28, telem.radiusPx);
  const angleDeg = dev.fovAngleDeg || 0;
  const apertureDeg = dev.fovApertureDeg || dev.fovSpanDeg || 90;
  const doriColor = telem.doriHex || telem.strokeColor || "#10b981";
  const bands = telem.doriBands || { identPx: Math.round(radiusPx * 0.35), recogPx: Math.round(radiusPx * 0.6), obsvPx: Math.round(radiusPx * 0.85), detPx: radiusPx };

  const rad = (deg) => (deg * Math.PI) / 180;

  // Helper to build a sector path for a given radius r
  const buildWedgePath = (r, startDeg, endDeg, span) => {
    const x1 = r * Math.cos(rad(startDeg));
    const y1 = r * Math.sin(rad(startDeg));
    const x2 = r * Math.cos(rad(endDeg));
    const y2 = r * Math.sin(rad(endDeg));
    const largeArc = span > 180 ? 1 : 0;
    return `M 0 0 L ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r.toFixed(1)} ${r.toFixed(1)} 0 ${largeArc} 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z`;
  };

  const doriZones = [
    { key: "det", maxR: radiusPx, color: "#f43f5e", opacity: isSelected ? "0.18" : "0.11" },
    { key: "obsv", maxR: Math.min(radiusPx, bands.obsvPx), color: "#f59e0b", opacity: isSelected ? "0.20" : "0.13" },
    { key: "recog", maxR: Math.min(radiusPx, bands.recogPx), color: "#0ea5e9", opacity: isSelected ? "0.22" : "0.15" },
    { key: "ident", maxR: Math.min(radiusPx, bands.identPx), color: "#10b981", opacity: isSelected ? "0.26" : "0.18" }
  ];

  if (apertureDeg >= 359) {
    // 360° Fisheye / Multi-Sensor Dome Coverage Circle
    if (showDoriColorBands) {
      doriZones.forEach((zone, idx) => {
        if (zone.maxR < 8) return;
        if (idx > 0 && zone.maxR >= doriZones[idx - 1].maxR) return;
        const bandCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        bandCircle.setAttribute("cx", "0");
        bandCircle.setAttribute("cy", "0");
        bandCircle.setAttribute("r", zone.maxR.toFixed(1));
        bandCircle.setAttribute("fill", zone.color);
        bandCircle.setAttribute("fill-opacity", zone.opacity);
        bandCircle.setAttribute("stroke", zone.color);
        bandCircle.setAttribute("stroke-width", idx === 0 ? (isSelected ? "2" : "1.25") : "1");
        bandCircle.setAttribute("stroke-dasharray", idx === 0 ? "6 4" : "3 3");
        bandCircle.style.pointerEvents = "none";
        fovG.appendChild(bandCircle);
      });
    } else {
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", "0");
      circle.setAttribute("cy", "0");
      circle.setAttribute("r", radiusPx);
      circle.setAttribute("fill", doriColor);
      circle.setAttribute("fill-opacity", isSelected ? "0.22" : "0.13");
      circle.setAttribute("stroke", doriColor);
      circle.setAttribute("stroke-width", isSelected ? "2" : "1.25");
      circle.setAttribute("stroke-dasharray", "6 4");
      circle.style.pointerEvents = "none";
      fovG.appendChild(circle);
    }

    // If Multi-Sensor / Quad camera, render 4 quadrant lens divider rays
    if (telem.isMultiSensor) {
      [0, 90, 180, 270].forEach(qOffset => {
        const rayDeg = angleDeg + qOffset + 45;
        const rx = radiusPx * Math.cos(rad(rayDeg));
        const ry = radiusPx * Math.sin(rad(rayDeg));
        const qLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
        qLine.setAttribute("x1", "0");
        qLine.setAttribute("y1", "0");
        qLine.setAttribute("x2", rx.toFixed(1));
        qLine.setAttribute("y2", ry.toFixed(1));
        qLine.setAttribute("stroke", doriColor);
        qLine.setAttribute("stroke-width", "1");
        qLine.setAttribute("stroke-dasharray", "3 3");
        qLine.setAttribute("opacity", "0.55");
        qLine.style.pointerEvents = "none";
        fovG.appendChild(qLine);
      });
    }
  } else {
    // Directional Wedge Sector (<360°)
    const startAngle = angleDeg - apertureDeg / 2;
    const endAngle = angleDeg + apertureDeg / 2;

    if (showDoriColorBands) {
      doriZones.forEach((zone, idx) => {
        if (zone.maxR < 8) return;
        if (idx > 0 && zone.maxR >= doriZones[idx - 1].maxR) return;
        const bandWedge = document.createElementNS("http://www.w3.org/2000/svg", "path");
        bandWedge.setAttribute("d", buildWedgePath(zone.maxR, startAngle, endAngle, apertureDeg));
        bandWedge.setAttribute("fill", zone.color);
        bandWedge.setAttribute("fill-opacity", zone.opacity);
        bandWedge.setAttribute("stroke", zone.color);
        bandWedge.setAttribute("stroke-width", idx === 0 ? (isSelected ? "2" : "1.35") : "1");
        if (idx > 0) bandWedge.setAttribute("stroke-dasharray", "3 3");
        bandWedge.style.pointerEvents = "none";
        fovG.appendChild(bandWedge);
      });
    } else {
      const wedge = document.createElementNS("http://www.w3.org/2000/svg", "path");
      wedge.setAttribute("d", buildWedgePath(radiusPx, startAngle, endAngle, apertureDeg));
      wedge.setAttribute("fill", doriColor);
      wedge.setAttribute("fill-opacity", isSelected ? "0.24" : "0.14");
      wedge.setAttribute("stroke", doriColor);
      wedge.setAttribute("stroke-width", isSelected ? "2" : "1.25");
      wedge.style.pointerEvents = "none";
      fovG.appendChild(wedge);
    }
  }

  // Center Aim Axis Ray & Interactive Aim/Range Handle
  const handleX = radiusPx * Math.cos(rad(angleDeg));
  const handleY = radiusPx * Math.sin(rad(angleDeg));

  const axisLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
  axisLine.setAttribute("x1", "0");
  axisLine.setAttribute("y1", "0");
  axisLine.setAttribute("x2", handleX.toFixed(1));
  axisLine.setAttribute("y2", handleY.toFixed(1));
  axisLine.setAttribute("stroke", doriColor);
  axisLine.setAttribute("stroke-width", "1.25");
  axisLine.setAttribute("stroke-dasharray", "4 3");
  axisLine.setAttribute("opacity", isSelected ? "0.9" : "0.55");
  axisLine.style.pointerEvents = "none";
  fovG.appendChild(axisLine);

  // Telemetry Pill along the outer arc
  const labelDist = Math.max(38, radiusPx * 0.68);
  const lx = labelDist * Math.cos(rad(angleDeg));
  const ly = labelDist * Math.sin(rad(angleDeg));
  const pillTextStr = `${telem.doriShort} ${telem.ppf} PPF • ${dev.fovDistanceFt}'`;
  const pillW = Math.max(98, pillTextStr.length * 5.8 + 14);
  const pillH = 16;

  const pillBg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  pillBg.setAttribute("x", (lx - pillW / 2).toFixed(1));
  pillBg.setAttribute("y", (ly - pillH / 2).toFixed(1));
  pillBg.setAttribute("width", pillW);
  pillBg.setAttribute("height", pillH);
  pillBg.setAttribute("rx", "6");
  pillBg.setAttribute("fill", "#0f172a");
  pillBg.setAttribute("fill-opacity", "0.9");
  pillBg.setAttribute("stroke", doriColor);
  pillBg.setAttribute("stroke-width", "1");
  pillBg.style.pointerEvents = "none";
  fovG.appendChild(pillBg);

  const pillTxt = document.createElementNS("http://www.w3.org/2000/svg", "text");
  pillTxt.setAttribute("x", lx.toFixed(1));
  pillTxt.setAttribute("y", (ly + 3.5).toFixed(1));
  pillTxt.setAttribute("text-anchor", "middle");
  pillTxt.setAttribute("fill", doriColor);
  pillTxt.setAttribute("font-size", "8.5");
  pillTxt.setAttribute("font-family", "monospace");
  pillTxt.setAttribute("font-weight", "bold");
  pillTxt.style.pointerEvents = "none";
  pillTxt.textContent = pillTextStr;
  fovG.appendChild(pillTxt);

  // Interactive Drag Handle at tip of FOV cone to aim & resize range
  const grip = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  grip.setAttribute("class", "draggable-fov-handle cursor-grab");
  grip.setAttribute("data-node-id", dev.id);
  grip.setAttribute("cx", handleX.toFixed(1));
  grip.setAttribute("cy", handleY.toFixed(1));
  grip.setAttribute("r", isSelected ? "7.5" : "6");
  grip.setAttribute("fill", doriColor);
  grip.setAttribute("stroke", "#ffffff");
  grip.setAttribute("stroke-width", "2");
  fovG.appendChild(grip);
}
window.renderCameraFovGroupContent = renderCameraFovGroupContent;

/**
 * Projects a point P onto segment A->B and returns the closest point and distance.
 */
function _projectPointToSegment(p, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return { x: a.x, y: a.y, t: 0, dist: Math.hypot(p.x - a.x, p.y - a.y) };
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = a.x + t * dx;
  const projY = a.y + t * dy;
  return { x: projX, y: projY, t, dist: Math.hypot(p.x - projX, p.y - projY) };
}

/**
 * Helper: Appends vertices along a single trunk between projA and projB.
 */
function _traceSingleTrunkVertices(trunk, projA, projB, pts, useOrtho) {
  const entryPt = { x: Math.round(projA.x), y: Math.round(projA.y) };
  const exitPt = { x: Math.round(projB.x), y: Math.round(projB.y) };
  const lastPt = pts[pts.length - 1];

  if (lastPt && Math.hypot(entryPt.x - lastPt.x, entryPt.y - lastPt.y) > 8) {
    if (useOrtho && entryPt.x !== lastPt.x && entryPt.y !== lastPt.y) {
      pts.push({ x: entryPt.x, y: lastPt.y });
    }
    pts.push(entryPt);
  }

  if (projA.posAlong <= projB.posAlong) {
    for (let k = projA.segIdx + 1; k <= projB.segIdx; k++) {
      pts.push({ x: trunk.points[k].x, y: trunk.points[k].y });
    }
  } else {
    for (let k = projA.segIdx; k > projB.segIdx; k--) {
      pts.push({ x: trunk.points[k].x, y: trunk.points[k].y });
    }
  }

  if (Math.hypot(exitPt.x - entryPt.x, exitPt.y - entryPt.y) > 6) {
    pts.push(exitPt);
  }
}

/**
 * Projects a point onto a trunk polyline and returns best segment projection.
 */
function _projectPointOntoTrunk(pt, trunk) {
  if (!trunk || !trunk.points || trunk.points.length < 2) return null;
  let best = null;
  for (let i = 0; i < trunk.points.length - 1; i++) {
    const a = trunk.points[i];
    const b = trunk.points[i + 1];
    const pr = _projectPointToSegment(pt, a, b);
    if (!best || pr.dist < best.dist) {
      best = { ...pr, segIdx: i, posAlong: i + pr.t };
    }
  }
  return best;
}

/**
 * Computes deterministic horizontal cable routing along drawn Pathway Trunks (including multi-trunk intersections).
 * Returns { points: Array<{x,y}>, traversedTrunks: Array<string> }
 */
function computePathwayTrunkRoute(closetPt, devPt, floorTrunks, useOrtho, forceSnap = false) {
  const traversedTrunks = [];
  const validTrunks = Array.isArray(floorTrunks) ? floorTrunks.filter(t => t.points && t.points.length >= 2) : [];

  if (validTrunks.length > 0) {
    const maxDevSnapDist = forceSnap ? 1400 : 380;
    const maxClosetSnapDist = forceSnap ? 1400 : 520;

    // 1. Check single-trunk routing first
    let bestTrunk = null;
    let bestDevProj = null;
    let bestClosetProj = null;
    let bestScore = Infinity;

    // Also track closest trunk to closet and closest trunk to device for 2-trunk bridge routing
    let closestTrunkToCloset = null;
    let closestClosetProj = null;
    let closestTrunkToDev = null;
    let closestDevProj = null;

    validTrunks.forEach(trunk => {
      const minDev = _projectPointOntoTrunk(devPt, trunk);
      const minCloset = _projectPointOntoTrunk(closetPt, trunk);

      if (minCloset && (!closestClosetProj || minCloset.dist < closestClosetProj.dist)) {
        closestClosetProj = minCloset;
        closestTrunkToCloset = trunk;
      }
      if (minDev && (!closestDevProj || minDev.dist < closestDevProj.dist)) {
        closestDevProj = minDev;
        closestTrunkToDev = trunk;
      }

      if (minDev && minCloset && minDev.dist <= maxDevSnapDist && minCloset.dist <= maxClosetSnapDist) {
        const score = minDev.dist + minCloset.dist * 0.65;
        if (score < bestScore) {
          bestScore = score;
          bestTrunk = trunk;
          bestDevProj = minDev;
          bestClosetProj = minCloset;
        }
      }
    });

    // 2. Check if a 2-trunk connected corridor route (Closet -> Trunk A -> Trunk B -> Device) is closer
    if (
      closestTrunkToCloset &&
      closestTrunkToDev &&
      closestTrunkToCloset.id !== closestTrunkToDev.id &&
      closestClosetProj.dist <= maxClosetSnapDist &&
      closestDevProj.dist <= maxDevSnapDist
    ) {
      // Find closest junction between Trunk A and Trunk B
      let bestJunctionA = null;
      let bestJunctionB = null;
      let minJunctionDist = Infinity;

      closestTrunkToCloset.points.forEach((ptA, idxA) => {
        const projB = _projectPointOntoTrunk(ptA, closestTrunkToDev);
        if (projB && projB.dist < minJunctionDist) {
          minJunctionDist = projB.dist;
          bestJunctionA = { x: ptA.x, y: ptA.y, segIdx: Math.min(idxA, closestTrunkToCloset.points.length - 2), posAlong: idxA, dist: 0 };
          bestJunctionB = projB;
        }
      });
      closestTrunkToDev.points.forEach((ptB, idxB) => {
        const projA = _projectPointOntoTrunk(ptB, closestTrunkToCloset);
        if (projA && projA.dist < minJunctionDist) {
          minJunctionDist = projA.dist;
          bestJunctionA = projA;
          bestJunctionB = { x: ptB.x, y: ptB.y, segIdx: Math.min(idxB, closestTrunkToDev.points.length - 2), posAlong: idxB, dist: 0 };
        }
      });

      const twoTrunkScore = closestDevProj.dist + closestClosetProj.dist * 0.65 + minJunctionDist;
      if (minJunctionDist <= 180 && twoTrunkScore < bestScore) {
        traversedTrunks.push(closestTrunkToCloset.id, closestTrunkToDev.id);
        const pts = [{ x: closetPt.x, y: closetPt.y }];
        _traceSingleTrunkVertices(closestTrunkToCloset, closestClosetProj, bestJunctionA, pts, useOrtho);
        _traceSingleTrunkVertices(closestTrunkToDev, bestJunctionB, closestDevProj, pts, useOrtho);
        const lastPt = pts[pts.length - 1];
        if (useOrtho && lastPt.x !== devPt.x && lastPt.y !== devPt.y) {
          pts.push({ x: devPt.x, y: lastPt.y });
        }
        pts.push({ x: devPt.x, y: devPt.y });
        return { points: pts, traversedTrunks };
      }
    }

    if (bestTrunk && bestDevProj && bestClosetProj) {
      traversedTrunks.push(bestTrunk.id);
      const pts = [{ x: closetPt.x, y: closetPt.y }];
      _traceSingleTrunkVertices(bestTrunk, bestClosetProj, bestDevProj, pts, useOrtho);
      const lastPt = pts[pts.length - 1];
      if (useOrtho && lastPt.x !== devPt.x && lastPt.y !== devPt.y) {
        pts.push({ x: devPt.x, y: lastPt.y });
      }
      pts.push({ x: devPt.x, y: devPt.y });
      return { points: pts, traversedTrunks };
    }
  }

  // Fallback: direct or 90° orthogonal path
  const pts = [{ x: closetPt.x, y: closetPt.y }];
  if (useOrtho) {
    pts.push({ x: devPt.x, y: closetPt.y });
  }
  pts.push({ x: devPt.x, y: devPt.y });
  return { points: pts, traversedTrunks };
}

/**
 * 1-Click Deterministic Pathway Snap: Snaps all drops on the active floor (or drops near a specific trunk)
 * onto the drawn Pathway Trunk corridors, clearing stray manual waypoints.
 */
function snapAllFloorCablesToTrunks() {
  const floor = getActiveFloor();
  if (!floor) return;
  if (!Array.isArray(floor.pathwayTrunks) || floor.pathwayTrunks.length === 0) {
    if (typeof showToast === "function") {
      showToast("Draw a Pathway Corridor [Press T] first to snap horizontal cables.", "warning");
    }
    return;
  }

  CanvasHistory.pushState("Snap Cables to Pathway Trunks");
  let snappedCount = 0;
  (floor.nodes || []).filter(n => n.type === "device").forEach(dev => {
    dev.waypoints = [];
    dev.snapToPathway = true;
    snappedCount++;
  });

  recalculateCurrentFloorCables();
  renderCableCanvas();
  renderInspector();
  renderSidebarTabContent();
  saveFacilityState(true);

  if (typeof showToast === "function") {
    showToast(`Snapped ${snappedCount} floor cable run${snappedCount === 1 ? "" : "s"} to Pathway Corridors & recalculated NEC fill.`, "success");
  }
}
window.snapAllFloorCablesToTrunks = snapAllFloorCablesToTrunks;

function recalculateCurrentFloorCables(skipSidebarRebuild = false) {
  const floor = getActiveFloor();
  const scaleInput = document.getElementById("cableScaleFt");
  const slackInput = document.getElementById("cableSlackFt");
  const slabInput = document.getElementById("cableSlabFt");

  if (floor) {
    if (scaleInput) floor.scaleFt = parseFloat(scaleInput.value) || 25;
    if (slackInput) floor.slackFt = parseFloat(slackInput.value) || 15;
    if (slabInput) floor.slabFt = parseFloat(slabInput.value) || 14;
    const scaleBadgeLabel = document.getElementById("physHeaderScaleLabel");
    if (scaleBadgeLabel) {
      scaleBadgeLabel.textContent = `Scale: 100px = ${floor.scaleFt || 25} ft`;
    }
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
        let pts = [];
        let traversedTrunks = [];

        if (dev.waypoints && dev.waypoints.length > 0) {
          pts = [{ x: closet.x, y: closet.y }];
          dev.waypoints.forEach(wp => pts.push(wp));
          pts.push({ x: dev.x, y: dev.y });
        } else {
          const routed = computePathwayTrunkRoute(
            { x: closet.x, y: closet.y },
            { x: dev.x, y: dev.y },
            fl.pathwayTrunks || [],
            useOrthogonalRouting,
            dev.snapToPathway === true
          );
          pts = routed.points;
          traversedTrunks = routed.traversedTrunks;
        }

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
          points: pts,
          traversedTrunks
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
  if (countActiveEl && floor) countActiveEl.innerText = floor.nodes.filter(n => n.type === 'device').length;
  if (totalDropsEl) totalDropsEl.innerText = `${globalDropsCount} Drop${globalDropsCount === 1 ? '' : 's'}`;
  if (patchPanelsEl) {
    const panelsNeeded = Math.ceil(globalDropsCount / 24);
    patchPanelsEl.innerText = `${panelsNeeded} Panel${panelsNeeded === 1 ? '' : 's'} (${panelsNeeded * 24}P)`;
  }

  if (!skipSidebarRebuild) {
    renderSidebarTabContent();
  }
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
  if (item.isEnclosureFrame || item.isPassive) return false;
  if (typeof DeviceTaxonomy !== "undefined") {
    if (typeof DeviceTaxonomy.isPassiveOrHostInfrastructure === "function" && DeviceTaxonomy.isPassiveOrHostInfrastructure(item)) return false;
    if (typeof DeviceTaxonomy.isPowerDistributionOrBackup === "function" && DeviceTaxonomy.isPowerDistributionOrBackup(item)) return false;
  }

  // Structured Cabling spools, licenses, accessories, optics, cords, pathways, mounts do not get placed as camera/door drops
  if (item.role === "Structured Cabling" || item.role === "Optics & DAC") return false;
  if (item.role === "Mgmt License" || item.role === "Security License" || item.role === "Feature License") return false;
  if (item.role === "Accessory" || item.role === "Power Jumper Cable" || item.role === "Pathways & J-Hooks" || item.role === "Mounting Hardware") return false;

  // Infrastructure that lives inside racks / enclosures or IS a rack / enclosure
  const infraRoles = [
    "Access", "Core", "Core & Agg", "Aggregation", "Gateways & WAN", "Security WAN", "Firewall",
    "Server", "VMS Server", "Compute & Storage", "Storage Drives & SAN",
    "Rack UPS Power", "UPS", "Rackmount PDU", "PDU",
    "Equipment Rack", "19\" Equipment Racks", "Cabinets & Enclosures",
    "Security Cabinet", "Industrial NEMA Enclosure", "Architectural Backboard",
    "Enclosure", "Patch Panel"
  ];
  if (infraRoles.includes(item.role)) return false;

  const cat = (item.category || "").toLowerCase();
  const role = (item.role || "").toLowerCase();

  if (cat.includes("switch") || cat.includes("server") || cat.includes("storage") || 
      cat.includes("ups") || cat.includes("pdu") || cat.includes("rack") || 
      cat.includes("enclosure") || cat.includes("cabinet") || cat.includes("power_cord") ||
      cat.includes("pathway") || cat.includes("mounting") || cat.includes("passive")) {
    return false;
  }
  if (role.includes("switch") || role.includes("server") || role.includes("storage") || 
      role.includes("ups") || role.includes("pdu") || role.includes("gateway") ||
      role.includes("rack") || role.includes("enclosure") || role.includes("cabinet") ||
      role.includes("backboard")) {
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

function getUnplacedDevicesCount() {
  const placedInstanceIds = new Set();
  facilityFloors.forEach(fl => {
    (fl.nodes || []).forEach(n => {
      if (n.instanceId) placedInstanceIds.add(n.instanceId);
      if (n.id && n.id.startsWith("dev-")) placedInstanceIds.add(n.id.replace("dev-", ""));
      if (n.id) placedInstanceIds.add(n.id);
    });
  });

  const unplacedBOM = (typeof projectBOM !== "undefined" ? projectBOM : []).filter(item => {
    if (typeof isFieldDeviceForPhysicalLayout === "function") {
      if (!isFieldDeviceForPhysicalLayout(item)) return false;
    }
    return !placedInstanceIds.has(item.instanceId);
  });

  return unplacedBOM.length;
}

function updateUnplacedCountBadge() {
  const countBadge = document.getElementById("btnPlaceUnplacedCount");
  if (!countBadge) return;
  const count = getUnplacedDevicesCount();
  countBadge.textContent = count;
}

function renderSidebarTabContent() {
  updateUnplacedCountBadge();
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

  if (!selectedNodeId && !selectedFiberBackboneId && !selectedPathwayTrunkId && (!selectedNodeIds || selectedNodeIds.size === 0)) {
    container.innerHTML = `<span class="text-slate-500 text-[11px] block text-center py-2">Select a drop, closet, pathway corridor, or drag a selection box to view properties.</span>`;
    return;
  }

  const floor = getActiveFloor();
  if (!floor) {
    container.innerHTML = `<span class="text-slate-500 text-[11px] block text-center py-2">No active floor/building. Click "+ Floor/Building" to create one.</span>`;
    return;
  }

  // A. Bulk Operations Inspector (When 2+ Nodes Selected)
  if (selectedNodeIds && selectedNodeIds.size > 1) {
    const selectedNodes = floor.nodes.filter(n => selectedNodeIds.has(n.id));
    const dropNodes = selectedNodes.filter(n => n.type === "device");
    const closetNodes = selectedNodes.filter(n => n.type === "closet");

    let camCount = 0, acsCount = 0, apCount = 0, otherCount = 0;
    dropNodes.forEach(dev => {
      const bomItem = (typeof projectBOM !== "undefined" && dev.instanceId) ? projectBOM.find(i => i.instanceId === dev.instanceId) : null;
      const layerType = getDeviceLayerType(bomItem || dev);
      if (layerType === "cameras") camCount++;
      else if (layerType === "access") acsCount++;
      else if (layerType === "wireless") apCount++;
      else otherCount++;
    });

    const allClosets = getAllClosetsAcrossFacility();
    const closetOptions = allClosets.map(c => `<option value="${c.id}">${escapeHTML(c.name)}</option>`).join('');

    container.innerHTML = `
      <div class="space-y-4">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div class="flex items-center gap-2">
            <div class="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
              <i data-lucide="box-select" class="w-4 h-4"></i>
            </div>
            <div>
              <h4 class="text-xs font-bold text-white tracking-wide">Bulk Operations</h4>
              <p class="text-[10px] text-indigo-300 font-mono">${selectedNodeIds.size} Elements Multi-Selected</p>
            </div>
          </div>
          <button onclick="clearMultiSelection()" class="text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800 text-[10px] font-bold transition-colors">
            Clear
          </button>
        </div>

        <!-- Composition Card -->
        <div class="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
          <div class="text-[10px] uppercase font-bold text-slate-400 mb-1">Selected Composition</div>
          <div class="flex flex-wrap gap-1.5 text-[10px] font-mono">
            ${camCount > 0 ? `<span class="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">${camCount} Cameras</span>` : ''}
            ${acsCount > 0 ? `<span class="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-bold">${acsCount} Readers/Doors</span>` : ''}
            ${apCount > 0 ? `<span class="px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 font-bold">${apCount} Wireless APs</span>` : ''}
            ${closetNodes.length > 0 ? `<span class="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 font-bold">${closetNodes.length} Closets</span>` : ''}
            ${otherCount > 0 ? `<span class="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700">${otherCount} Other</span>` : ''}
          </div>
        </div>

        <!-- Bulk Reassign Closet -->
        ${dropNodes.length > 0 ? `
          <div class="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <label class="text-[10px] uppercase font-bold text-slate-400 block">Reassign Closet / Enclosure</label>
            <select id="bulkTargetClosetSelect" class="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs font-medium focus:border-indigo-500">
              ${closetOptions}
            </select>
            <button onclick="executeBulkReassignCloset(document.getElementById('bulkTargetClosetSelect').value)" class="w-full py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow">
              <i data-lucide="server" class="w-3.5 h-3.5"></i>
              <span>Reassign ${dropNodes.length} Drops to Selected Closet</span>
            </button>
          </div>

          <!-- Bulk Cable Spec -->
          <div class="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <label class="text-[10px] uppercase font-bold text-slate-400 block">Apply Cable Standard / Spec</label>
            <select id="bulkCableSkuSelect" class="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs font-medium focus:border-indigo-500">
              <option value="C6A-CMP-1K-BL">Cat6A CMP Plenum (Blue) - 10G Certified</option>
              <option value="C6A-CMR-1K-BL">Cat6A CMR Riser (Blue) - 10G Non-Plenum</option>
              <option value="C6-CMP-1K-BL">Cat6 CMP Plenum (Blue) - 1G/5G Baseline</option>
              <option value="C6A-OSP-SHLD">Cat6A OSP Outdoor Shielded Gel-Filled (Black)</option>
            </select>
            <button onclick="executeBulkChangeCableSpec(document.getElementById('bulkCableSkuSelect').value)" class="w-full py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors border border-slate-700">
              <i data-lucide="zap" class="w-3.5 h-3.5 text-amber-400"></i>
              <span>Update Cable Spec on ${dropNodes.length} Drops</span>
            </button>
          </div>
        ` : ''}

        <!-- Spatial Alignment Tools -->
        <div class="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
          <label class="text-[10px] uppercase font-bold text-slate-400 block">Spatial Alignment &amp; Clean Up</label>
          <div class="grid grid-cols-2 gap-1.5">
            <button onclick="executeBulkAlign('horizontal')" class="py-1.5 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1 border border-slate-800 transition-colors" title="Align nodes horizontally to average Y">
              <i data-lucide="align-horizontal-distribute-center" class="w-3.5 h-3.5 text-indigo-400"></i> Align Horiz
            </button>
            <button onclick="executeBulkAlign('vertical')" class="py-1.5 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1 border border-slate-800 transition-colors" title="Align nodes vertically to average X">
              <i data-lucide="align-vertical-distribute-center" class="w-3.5 h-3.5 text-indigo-400"></i> Align Vert
            </button>
          </div>
          <div class="grid grid-cols-2 gap-1.5">
            <button onclick="executeBulkDistribute()" class="py-1.5 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1 border border-slate-800 transition-colors" title="Space nodes out evenly along the line">
              <i data-lucide="distribute-horizontal" class="w-3.5 h-3.5 text-sky-400"></i> Distribute
            </button>
            <button onclick="executeBulkClearWaypoints()" class="py-1.5 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1 border border-slate-800 transition-colors" title="Remove all custom bends on selected cables">
              <i data-lucide="route-off" class="w-3.5 h-3.5 text-amber-400"></i> Clear Bends
            </button>
          </div>
        </div>

        <!-- Bulk Delete -->
        <div class="pt-1">
          <button onclick="executeBulkDeleteNodes()" class="w-full py-2 px-3 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-300 hover:text-white border border-rose-700/60 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
            <span>Delete All ${selectedNodeIds.size} Selected Items</span>
          </button>
        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
    return;
  }

  // B. Pathway Corridor Inspector
  if (selectedPathwayTrunkId) {
    const trunk = (floor.pathwayTrunks || []).find(t => t.id === selectedPathwayTrunkId);
    if (trunk) {
      let routedCount = 0;
      floor.nodes.filter(n => n.type === "device").forEach(d => {
        if (d.calculatedRun) {
          const snapped = Array.isArray(d.calculatedRun.traversedTrunks) && d.calculatedRun.traversedTrunks.includes(trunk.id);
          const isNear = !snapped && d.calculatedRun.points && d.calculatedRun.points.some(p => trunk.points.some(tp => Math.hypot(p.x - tp.x, p.y - tp.y) < 45));
          if (snapped || isNear) routedCount++;
        }
      });
      const capacity = trunk.capacity || 80;
      const fillPct = Math.round((routedCount / capacity) * 100);
      const maxFillPct = trunk.type === "conduit" ? 40 : 50;
      const isOverfilled = fillPct > maxFillPct;

      container.innerHTML = `
        <div class="space-y-4">
          <div class="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div class="flex items-center gap-2">
              <div class="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30">
                <i data-lucide="route" class="w-4 h-4"></i>
              </div>
              <div>
                <h4 class="text-xs font-bold text-white tracking-wide">Pathway Corridor</h4>
                <p class="text-[10px] text-amber-300 font-mono">Main Cable Pathway Trunk</p>
              </div>
            </div>
            <div class="flex items-center gap-1.5">
              <button onclick="deletePathwayTrunk('${escapeJSAttr(trunk.id)}')" class="px-2 py-1 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-700/60 rounded text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm">
                <i data-lucide="trash-2" class="w-3 h-3"></i> Delete
              </button>
              <button onclick="deselectPathwayTrunk()" class="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors">
                <i data-lucide="x" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </div>

          <!-- Name -->
          <div>
            <label class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Corridor Name / Label</label>
            <input type="text" value="${escapeHTML(trunk.name)}" onchange="updatePathwayTrunkName('${escapeJSAttr(trunk.id)}', this.value)" class="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs font-medium focus:border-amber-500" />
          </div>

          <!-- Type -->
          <div>
            <label class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Pathway Infrastructure Type</label>
            <select onchange="updatePathwayTrunkType('${escapeJSAttr(trunk.id)}', this.value)" class="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs font-medium focus:border-amber-500">
              <option value="tray" ${trunk.type === 'tray' ? 'selected' : ''}>Cable Tray (12" Wire Mesh Basket - 100 Cables)</option>
              <option value="ladder" ${trunk.type === 'ladder' ? 'selected' : ''}>Cable Runway / Ladder Rack (160 Cables)</option>
              <option value="jhook" ${trunk.type === 'jhook' ? 'selected' : ''}>J-Hook Tree Pathway (40 Cables)</option>
              <option value="conduit" ${trunk.type === 'conduit' ? 'selected' : ''}>2" EMT Steel Conduit (25 Cables)</option>
            </select>
          </div>

          <!-- Rated Capacity -->
          <div class="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Rated Capacity</label>
              <input type="number" min="10" max="500" step="10" value="${capacity}" onchange="updatePathwayTrunkCapacity('${escapeJSAttr(trunk.id)}', parseInt(this.value))" class="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold focus:border-amber-500" />
            </div>
            <div>
              <label class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Routed Cables</label>
              <div class="py-1.5 font-mono text-xs font-bold ${isOverfilled ? 'text-rose-400' : 'text-emerald-400'}">
                ${routedCount} / ${capacity} (${fillPct}%)
              </div>
            </div>
          </div>

          <!-- NEC 392 / Chapter 9 Fill Status -->
          <div class="p-2.5 rounded-xl border ${isOverfilled ? 'bg-rose-950/40 border-rose-600/50 text-rose-300' : 'bg-slate-950 border-slate-800 text-slate-300'} text-xs">
            <div class="flex items-center justify-between font-bold mb-1">
              <span>${trunk.type === 'conduit' ? 'NEC Ch. 9 Conduit Fill:' : 'NEC 392 / TIA-569 Fill:'}</span>
              <span class="font-mono text-[11px] ${isOverfilled ? 'text-rose-400' : 'text-emerald-400'}">${isOverfilled ? `WARNING: OVERFILLED (>${maxFillPct}%)` : `COMPLIANT (≤${maxFillPct}%)`}</span>
            </div>
            <div class="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div class="h-full rounded-full transition-all duration-300 ${isOverfilled ? 'bg-rose-500' : (fillPct > (maxFillPct - 10) ? 'bg-amber-500' : 'bg-emerald-500')}" style="width: ${Math.min(100, fillPct)}%"></div>
            </div>
            <p class="text-[10px] opacity-80 mt-1.5">
              ${isOverfilled 
                ? `Pathway exceeds the ${maxFillPct}% ${trunk.type === 'conduit' ? 'NEC Chapter 9 Table 1 conduit' : 'NEC Article 392 cable tray'} fill limit for data cables. Upgrade size or divide runs.`
                : `Drops within 280px automatically snap to this trunk spine (and connected corridor trunks). Maintains compliant ≤${maxFillPct}% cross-sectional fill.`}
            </p>
          </div>

          <!-- 1-Click Snap All Floor Cables to Pathways -->
          <div class="pt-1">
            <button onclick="snapAllFloorCablesToTrunks()" class="w-full py-2 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 hover:text-white border border-amber-500/40 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow">
              <i data-lucide="magnet" class="w-3.5 h-3.5 text-amber-400"></i>
              <span>Snap Floor Cables to Pathway Corridors</span>
            </button>
          </div>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }
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
              <button type="button" onclick="deleteFiberBackbone('${escapeJSAttr(fb.id)}', event)" class="px-2 py-1 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-700/60 rounded text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm" title="Delete this fiber backbone">
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
            <select onchange="updateFiberBackbone('${escapeJSAttr(fb.id)}', 'fiberType', this.value)" class="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-500 font-medium cursor-pointer">
              <option value="smf" ${fType === 'smf' ? 'selected' : ''}>OS2 Single-Mode (9/125&mu;m &bull; Yellow Jacket &bull; 1310/1550nm LR)</option>
              <option value="mmf" ${fType === 'mmf' ? 'selected' : ''}>OM4 Multi-Mode (50/125&mu;m &bull; Aqua Jacket &bull; 850nm SR)</option>
              <option value="om3" ${fType === 'om3' ? 'selected' : ''}>OM3 Multi-Mode (50/125&mu;m &bull; Aqua Jacket &bull; 850nm SR)</option>
            </select>
          </div>

          <!-- Strand Count -->
          <div>
            <label class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Strand Count / Core Capacity</label>
            <select onchange="updateFiberBackbone('${escapeJSAttr(fb.id)}', 'strandCount', parseInt(this.value))" class="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-medium cursor-pointer">
              <option value="6" ${strands === 6 ? 'selected' : ''}>6-Strand (3 Duplex Pairs)</option>
              <option value="12" ${strands === 12 ? 'selected' : ''}>12-Strand (6 Duplex Pairs &bull; Standard)</option>
              <option value="24" ${strands === 24 ? 'selected' : ''}>24-Strand (12 Duplex Pairs &bull; High-Density)</option>
              <option value="48" ${strands === 48 ? 'selected' : ''}>48-Strand (24 Duplex Pairs &bull; Core Spine)</option>
            </select>
          </div>

          <!-- Jacket Fire Rating -->
          <div>
            <label class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Jacket Fire Rating / Environment</label>
            <select onchange="updateFiberBackbone('${escapeJSAttr(fb.id)}', 'rating', this.value)" class="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-medium cursor-pointer">
              <option value="plenum" ${rating === 'plenum' ? 'selected' : ''}>OFNP - Plenum Rated (Air Return / Ceiling Plenums)</option>
              <option value="riser" ${rating === 'riser' ? 'selected' : ''}>OFNR - Riser Rated (Vertical Shafts / Conduits)</option>
              <option value="armored" ${rating === 'armored' ? 'selected' : ''}>Armored / OSP (Indoor/Outdoor Inter-Locking Armor)</option>
            </select>
          </div>

          <!-- Connector Termination -->
          <div>
            <label class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Pre-Terminated Connector End</label>
            <select onchange="updateFiberBackbone('${escapeJSAttr(fb.id)}', 'connectorType', this.value)" class="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-medium cursor-pointer">
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
                  <input type="number" min="0" max="200" step="5" value="${slack}" onchange="updateFiberBackbone('${escapeJSAttr(fb.id)}', 'slackFt', parseFloat(this.value) || 0)" class="w-16 bg-slate-900 border border-slate-700 text-white text-xs px-1.5 py-0.5 rounded font-mono focus:border-indigo-500" />
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
            <p class="text-[10px] font-mono text-slate-400">${trunkItem.sku} &bull; ${escapeHTML(fromName)} &rarr; ${escapeHTML(toName)}</p>
          </div>

          <!-- Actions -->
          <div class="pt-2 flex items-center gap-2">
            <button onclick="deleteFiberBackbone('${escapeJSAttr(fb.id)}', event)" class="flex-1 py-1.5 px-3 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/60 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer">
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
      if (item.baseWatts === 0 && (!item.ports || item.ports === 0) && item.role !== "Structured Cabling" && (!item.rackUnits || item.rackUnits === 0) && item.role !== "UPS" && item.category !== "ups") return false;

      const normItemLoc = FacilityStore.normalize(item.closetName || item.rackId).toLowerCase();
      const normNodeLoc = FacilityStore.normalize(node.name).toLowerCase();
      return normItemLoc === normNodeLoc;
    });

    const isZeroU = (it) => it.isDinMounted || (it.rackUnits !== undefined && parseInt(it.rackUnits, 10) === 0) || (it.mounting && it.mounting.toLowerCase().includes("din"));
    const rackMounted = cabinetItems.filter(i => !isZeroU(i) && i.role !== "Structured Cabling");
    const patchPanels = cabinetItems.filter(i => i.role === "Structured Cabling" && (i.model || '').includes("Patch Panel"));
    const fieldDevices = cabinetItems.filter(i => isZeroU(i) && i.role !== "Structured Cabling");

    container.innerHTML = `
      <div class="space-y-3">
        <div>
          <label class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Cabinet Name:</label>
          <input type="text" value="${escapeHTML(node.name)}" onchange="updateNodeName('${escapeJSAttr(node.id)}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-brand-500 font-semibold" />
        </div>

        <div>
          <label class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Assigned Floor/Building:</label>
          <select onchange="moveClosetToFloor('${escapeJSAttr(node.id)}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-amber-300 font-semibold rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-amber-500">
            ${facilityFloors.map(f => `
              <option value="${f.id}" ${f.id === node.floorId ? 'selected' : ''}>${escapeHTML(f.name)}</option>
            `).join('')}
          </select>
        </div>

        ${(() => {
          if (typeof FacilityStore === "undefined") return "";
          const parsed = FacilityStore.parse(node.name);
          const encs = FacilityStore.getEnclosures();
          const enc = encs.find(e => e.id === parsed.hostId) || encs.find(e => e.name.toLowerCase() === (parsed.hostName || node.name).toLowerCase()) || null;
          if (!enc) return "";
          const inBOM = FacilityStore.isEnclosureInBOM(enc.id);
          const formFactor = enc.heightU ? `${enc.heightU}U Rack` : (enc.subplateBays ? `${enc.subplateBays}-Bay Cabinet` : (enc.dinRails ? `${enc.dinRails}x DIN Enclosure` : `${enc.widthFt || 4}x${enc.heightFt || 8}' Backboard`));
          return `
            <!-- Real Hardware Part Spec Card -->
            <div class="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-2.5 rounded-xl border border-indigo-500/40 space-y-1.5 shadow-sm">
              <div class="flex items-center justify-between text-[10px]">
                <span class="font-mono font-bold text-indigo-300 px-1.5 py-0.5 rounded bg-indigo-950 border border-indigo-700/60">
                  ${escapeHTML(enc.catalogVendor || '')} ${escapeHTML(enc.catalogSku || 'Custom')}
                </span>
                <span class="font-mono font-bold text-emerald-400">$${(enc.msrp || 0).toLocaleString()} MSRP</span>
              </div>
              <div class="text-xs font-semibold text-white truncate" title="${escapeHTML(enc.catalogModel || '')}">
                ${escapeHTML(enc.catalogModel || enc.name)}
              </div>
              <div class="flex items-center justify-between text-[9.5px] font-mono text-slate-400 pt-1 border-t border-slate-800">
                <span>${formFactor} &bull; ${enc.depthInches ? enc.depthInches + '" Depth' : ''}</span>
                <span class="${inBOM ? 'text-emerald-400 font-bold' : 'text-slate-500'}">${inBOM ? '● In Project Quote' : '○ Not Quoted'}</span>
              </div>
            </div>
          `;
        })()}

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
              const itemRU = (it.rackUnits !== undefined && it.rackUnits !== null) ? (parseInt(it.rackUnits, 10) || 0) : 1;
              const stackSpan = itemRU * (isStack ? it.stackedUnits : (parseInt(it.qty, 10) || 1)) + ppSpan;
              return `
                <div class="bg-slate-950 px-2 py-1 rounded text-[10px] border border-slate-800 flex justify-between text-slate-200">
                  <span class="truncate"><strong class="text-indigo-400">[${isStack ? `Stack: ${it.stackedUnits}x` : 'Hardware'}]</strong> ${escapeHTML(it.model)}</span>
                  <span class="font-mono text-emerald-400 font-bold">${stackSpan}U (${it.qty || 1}x)</span>
                </div>
              `;
            }).join('')}
            ${fieldDevices.map(it => `
              <div class="bg-slate-950 px-2 py-1 rounded text-[10px] border border-sky-800/40 text-sky-300 flex justify-between">
                <span class="truncate"><strong class="text-sky-400">[0U / DIN / Field]</strong> ${escapeHTML(it.model)}</span>
                <span class="font-mono font-bold">${it.qty || 1}x</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="flex items-center justify-between gap-1.5 pt-1 border-t border-slate-800 flex-wrap">
          <button onclick="deepLinkToRackElevation('${escapeJSAttr(node.name)}')" class="flex-1 min-w-[90px] py-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer" title="Open Elevation Visualizer">
            <i data-lucide="server" class="w-3.5 h-3.5 text-indigo-400"></i> Elevation
          </button>
          <button onclick="jumpToFacilitySpace('${escapeJSAttr(node.name)}')" class="flex-1 min-w-[80px] py-1.5 bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-200 border border-cyan-500/40 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer" title="Open Space in Facility Manager">
            <i data-lucide="building-2" class="w-3.5 h-3.5 text-cyan-400"></i> Space
          </button>
          <button onclick="jumpToTopologyTarget('loc:${escapeJSAttr(node.name)}')" class="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer" title="View in Topology">
            <i data-lucide="network" class="w-3.5 h-3.5 text-indigo-400"></i>
          </button>
          <button onclick="deleteClosetWithReassignment('${escapeJSAttr(node.id)}')" class="p-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-800/60 rounded-lg cursor-pointer" title="Delete Closet">
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
    const isCameraNode = getDeviceLayerType(item || node) === "cameras";
    const showSpecificCameraOptics = typeof window.FEATURE_FLAGS === "undefined" || window.FEATURE_FLAGS.enableSpecificCameraDetails === true;
    const doriTelem = (isCameraNode && showSpecificCameraOptics) ? computeCameraDoriTelemetry(node, item) : null;

    let inspectorCameraSkuCardHtml = "";
    if (isCameraNode && item) {
      const allRealCams = typeof CAMERAS_DATABASE !== "undefined" ? CAMERAS_DATABASE : [];
      const allGenCams = typeof GENERIC_CAMERA_TYPES !== "undefined" ? GENERIC_CAMERA_TYPES : [];
      const genTypeId = item.genericCameraTypeId || item.originGenericTypeId || (item.isGenericCamera ? item.id : null);
      const genDef = genTypeId ? allGenCams.find(g => g.id === genTypeId || g.sku === genTypeId) : null;
      const recSkus = (item.recommendedUpgradeSkus && item.recommendedUpgradeSkus.length > 0)
        ? item.recommendedUpgradeSkus
        : (genDef && Array.isArray(genDef.recommendedUpgradeSkus) ? genDef.recommendedUpgradeSkus : []);
      const recCamObjs = recSkus.map(sku => allRealCams.find(c => c.sku === sku || c.id === sku)).filter(Boolean);
      const otherRealCams = allRealCams.filter(c => !recSkus.includes(c.sku) && !recSkus.includes(c.id));

      inspectorCameraSkuCardHtml = `
        <div class="bg-slate-950 p-2.5 rounded-xl border ${item.isGenericCamera ? 'border-emerald-500/40' : 'border-sky-500/40'} space-y-1.5 shadow-sm">
          <div class="flex items-center justify-between text-[10px]">
            <span class="font-mono font-bold ${item.isGenericCamera ? 'text-emerald-400' : 'text-sky-400'} uppercase flex items-center gap-1">
              <i data-lucide="camera" class="w-3 h-3"></i> ${item.isGenericCamera ? 'Generic Sizing Camera' : 'Assigned Camera Part'}
            </span>
            <span class="font-mono text-[9.5px] text-amber-300 font-bold">${item.powerConsumptionWatts || 8}W / ${item.maxPowerWatts || 15.4}W (${escapeHTML(item.poeStandard || '802.3af')})</span>
          </div>
          <select
            onchange="upgradeSingleCameraInstance('${escapeJSAttr(item.instanceId)}', this.value); renderInspector(); renderCableCanvas();"
            class="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-2 py-1 text-[11px] font-mono focus:outline-none focus:border-brand-500 cursor-pointer"
            title="Assign or override specific camera SKU for this individual drop"
          >
            ${recCamObjs.length > 0 ? `
              <optgroup label="Recommended Compatible Parts">
                ${recCamObjs.map(c => `<option value="${escapeHTML(c.sku)}" ${(item.sku === c.sku || item.id === c.id) ? 'selected' : ''}>★ ${escapeHTML(c.vendor)} ${escapeHTML(c.model)} (${escapeHTML(c.sku)})</option>`).join('')}
              </optgroup>
            ` : ''}
            <optgroup label="All Catalog Camera SKUs">
              ${otherRealCams.map(c => `<option value="${escapeHTML(c.sku)}" ${(item.sku === c.sku || item.id === c.id) ? 'selected' : ''}>${escapeHTML(c.vendor)} ${escapeHTML(c.model)} (${escapeHTML(c.sku)})</option>`).join('')}
            </optgroup>
            <optgroup label="Generic Sizing Types">
              ${allGenCams.map(g => `<option value="${escapeHTML(g.id)}" ${(item.id === g.id || item.sku === g.sku) ? 'selected' : ''}>[Generic] ${escapeHTML(g.model)} (${escapeHTML(g.poeStandard)})</option>`).join('')}
            </optgroup>
          </select>
          <div class="flex items-center justify-between text-[9.5px] font-mono text-slate-400">
            <span>Stream: <strong class="text-teal-300">${item.heads || 1}x ${item.mpPerHead || item.sensorMegapixels || 2}MP @ ${item.defaultFps || 15}fps</strong></span>
            <span>Bitrate: <strong class="text-sky-300">${item.streamBitrateMbps || 4} Mbps</strong></span>
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="space-y-2.5">
        <div>
          <label class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Device Label:</label>
          <input type="text" value="${escapeHTML(node.name)}" onchange="updateNodeName('${escapeJSAttr(node.id)}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-brand-500 font-semibold" />
        </div>

        ${inspectorCameraSkuCardHtml}

        <div>
          <label class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Terminating Enclosure / Space:</label>
          <select onchange="updateNodeCloset('${escapeJSAttr(node.id)}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-brand-500 font-mono">
            <optgroup label="Spaces & Zones (Field / Unenclosed)">
              ${allClosets.filter(c => c.name.endsWith(' • Field')).map(c => `
                <option value="${c.id}" ${node.assignedClosetId === c.id ? 'selected' : ''}>${escapeHTML(c.name.replace(' • Field', ''))} [Field Drop] (${escapeHTML(c.floorName)})</option>
              `).join('')}
            </optgroup>
            <optgroup label="Racks & Enclosures">
              ${allClosets.filter(c => !c.name.endsWith(' • Field')).map(c => `
                <option value="${c.id}" ${node.assignedClosetId === c.id ? 'selected' : ''}>${escapeHTML(c.name)} (${escapeHTML(c.floorName)})</option>
              `).join('')}
            </optgroup>
          </select>
        </div>

        ${isCameraNode && doriTelem ? `
          <!-- Camera Optical FOV & DORI / PPF Coverage Card -->
          <div class="bg-slate-950 p-2.5 rounded-xl border border-emerald-500/40 space-y-2 shadow-sm">
            <div class="flex items-center justify-between">
              <span class="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1 font-mono">
                <i data-lucide="eye" class="w-3 h-3 text-emerald-400"></i> Optical FOV &amp; DORI
              </span>
              <span class="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border" style="color:${doriTelem.doriHex}; border-color:${doriTelem.doriHex}66; background:${doriTelem.doriHex}1a;">
                ${doriTelem.doriClass} &bull; ${doriTelem.ppf} PPF
              </span>
            </div>

            <div class="grid grid-cols-2 gap-1.5 text-[10px]">
              <div>
                <label class="text-[9px] uppercase font-mono text-slate-400 block mb-0.5">Aim Angle (&deg;)</label>
                <input type="number" min="0" max="359" step="5" value="${node.fovAngleDeg}" onchange="updateNodeFovSetting('${escapeJSAttr(node.id)}', 'fovAngleDeg', this.value)" class="w-full bg-slate-900 border border-slate-700 text-white rounded px-2 py-1 text-xs font-mono focus:border-emerald-500" />
              </div>
              <div>
                <label class="text-[9px] uppercase font-mono text-slate-400 block mb-0.5">Target Range (ft)</label>
                <input type="number" min="10" max="300" step="5" value="${node.fovDistanceFt}" onchange="updateNodeFovSetting('${escapeJSAttr(node.id)}', 'fovDistanceFt', this.value)" class="w-full bg-slate-900 border border-slate-700 text-white rounded px-2 py-1 text-xs font-mono focus:border-emerald-500" />
              </div>
              <div>
                <label class="text-[9px] uppercase font-mono text-slate-400 block mb-0.5">HFOV Aperture</label>
                <select onchange="updateNodeFovSetting('${escapeJSAttr(node.id)}', 'fovApertureDeg', this.value)" class="w-full bg-slate-900 border border-slate-700 text-white rounded px-1.5 py-1 text-[11px] font-mono focus:border-emerald-500">
                  ${[30, 45, 60, 75, 90, 102, 110, 120, 180, 270, 360].map(ap => `
                    <option value="${ap}" ${node.fovApertureDeg === ap ? 'selected' : ''}>${ap}&deg; ${ap === 360 ? '(Fisheye)' : (ap === 180 ? '(Pano)' : (ap <= 45 ? '(Tele)' : '(Wide)'))}</option>
                  `).join('')}
                </select>
              </div>
              <div>
                <label class="text-[9px] uppercase font-mono text-slate-400 block mb-0.5">Sensor MP</label>
                <select onchange="updateNodeFovSetting('${escapeJSAttr(node.id)}', 'resolutionMP', this.value)" class="w-full bg-slate-900 border border-slate-700 text-white rounded px-1.5 py-1 text-[11px] font-mono focus:border-emerald-500">
                  ${[2, 4, 5, 6, 8, 12, 16, 20, 32].map(mp => `
                    <option value="${mp}" ${node.resolutionMP === mp ? 'selected' : ''}>${mp}MP ${mp === 8 ? '(4K)' : (mp === 2 ? '(1080p)' : '')}</option>
                  `).join('')}
                </select>
              </div>
            </div>

            <div class="pt-1 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span>Scene Width @ ${node.fovDistanceFt}': <strong class="text-slate-200">${doriTelem.sceneWidthFt} ft</strong></span>
              ${!showCameraFovCones ? `
                <button type="button" onclick="toggleCameraFovCones()" class="text-emerald-400 hover:text-emerald-300 underline cursor-pointer font-bold">Show Cone</button>
              ` : `<span class="text-emerald-400/90">Drag grip to aim</span>`}
            </div>
          </div>
        ` : ''}

        <!-- Host Switch & Port Assignment Card -->
        <div class="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-[10px] uppercase font-bold text-sky-400 flex items-center gap-1 font-mono">
              <i data-lucide="network" class="w-3 h-3 text-sky-400"></i> Host Switch & Port
            </span>
            ${hostSwitch ? `
              <button type="button" onclick="openPortMatrixStudio('${escapeJSAttr(hostSwitch.instanceId)}')" class="text-[9px] font-mono text-amber-400 hover:text-amber-300 underline cursor-pointer flex items-center gap-1" title="Open Port Matrix Studio">
                <i data-lucide="grid" class="w-2.5 h-2.5"></i> Matrix
              </button>
            ` : ''}
          </div>

          <!-- Switch Select -->
          <div>
            <label class="text-[9px] uppercase font-mono text-slate-400 block mb-0.5">Switch</label>
            <select onchange="updateNodeHostSwitch('${escapeJSAttr(node.id)}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-brand-500 font-mono">
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
              <select onchange="updateNodeSwitchPort('${escapeJSAttr(node.id)}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-brand-500 font-mono">
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
          <select onchange="updateNodeMountMethod('${escapeJSAttr(node.id)}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-cyan-300 font-mono text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-brand-500">
            <option value="wall" ${(!node.mountMethod || node.mountMethod === 'wall') ? 'selected' : ''}>Wall Mount (Façade / Surface)</option>
            <option value="ceiling" ${node.mountMethod === 'ceiling' ? 'selected' : ''}>Ceiling / Soffit Mount</option>
            <option value="pole" ${node.mountMethod === 'pole' ? 'selected' : ''}>Pole / Mast Mount</option>
            <option value="parapet" ${node.mountMethod === 'parapet' ? 'selected' : ''}>Parapet Roof Mount</option>
            <option value="corner" ${node.mountMethod === 'corner' ? 'selected' : ''}>Corner Mount Bracket</option>
          </select>
        </div>

        <!-- TIA-606-C Cable ID & Pull Schedule Link -->
        <div class="bg-slate-950 p-2.5 rounded-xl border border-blue-500/40 space-y-1.5 shadow-sm">
          <div class="flex items-center justify-between text-[10px]">
            <span class="font-mono font-bold text-blue-400 uppercase flex items-center gap-1">
              <i data-lucide="tag" class="w-3 h-3 text-blue-400"></i> TIA-606-C Cable ID
            </span>
            <button type="button" onclick="openCablePullScheduleModal('${escapeJSAttr(node.instanceId || node.id)}')" class="text-[9px] font-mono text-blue-300 hover:text-white underline flex items-center gap-1 cursor-pointer">
              <i data-lucide="file-spreadsheet" class="w-2.5 h-2.5"></i> Pull Schedule
            </button>
          </div>
          <div class="flex items-center justify-between text-xs font-mono font-bold">
            <span class="text-blue-300 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/60">${getDeviceCableId(node)}</span>
            <span class="text-[10px] text-slate-400 font-normal">Cut: ${(run?.totalFt || 0) + 25} ft</span>
          </div>
        </div>

        ${run ? `
          <div class="bg-slate-900/90 p-2.5 rounded-lg border ${run.totalFt > 328 ? 'border-rose-500 bg-rose-950/20' : (run.totalFt > 295 ? 'border-amber-500 bg-amber-950/20' : 'border-slate-800')} text-[11px] font-mono space-y-1.5">
            <div class="flex justify-between items-center">
              <span class="text-slate-400 font-medium">Measured Run:</span>
              <span class="font-bold ${run.totalFt > 328 ? 'text-rose-400 animate-pulse' : (run.totalFt > 295 ? 'text-amber-400' : 'text-emerald-300')}">${run.totalFt} ft (${run.totalMeters}m)</span>
            </div>
            ${run.riserFt > 0 ? `<div class="flex justify-between text-[10px] text-sky-400"><span>Vertical Riser:</span><span>+${run.riserFt} ft</span></div>` : ''}
            ${run.traversedTrunks && run.traversedTrunks.length > 0 ? `<div class="flex justify-between text-[10px] text-amber-300"><span>Pathway Trunk:</span><span>Snapped (${run.traversedTrunks.length})</span></div>` : ''}
            <div class="flex justify-between text-[10px] text-slate-400 border-t border-slate-800/60 pt-1">
              <span>Service Loops (+25'):</span>
              <span class="text-slate-300">${run.totalFt + 25} ft Cut Length</span>
            </div>
            ${run.totalFt > 328 ? `
              <div class="text-[9.5px] text-rose-300 bg-rose-950/60 p-1.5 rounded border border-rose-800/80 leading-tight space-y-1">
                <div class="font-bold flex items-center gap-1 text-rose-400">
                  <i data-lucide="alert-triangle" class="w-3 h-3 text-rose-400"></i> TIA-568 Channel Limit Exceeded
                </div>
                <div>Exceeds 328 ft (100m) maximum channel distance. Rehome to a nearer IDF or insert a hardened PoE repeater/extender.</div>
              </div>
            ` : (run.totalFt > 295 ? `
              <div class="text-[9.5px] text-amber-300 bg-amber-950/60 p-1.5 rounded border border-amber-800/80 leading-tight space-y-1">
                <div class="font-bold flex items-center gap-1 text-amber-400">
                  <i data-lucide="alert-circle" class="w-3 h-3 text-amber-400"></i> Permanent Link Caution
                </div>
                <div>Exceeds 295 ft (90m) permanent link guideline. Reserve remaining channel budget for short equipment patch cords.</div>
              </div>
            ` : `
              <div class="text-[9px] text-emerald-400 font-mono flex items-center gap-1">
                <span>✓</span> TIA-568 Channel Compliant (&le;328 ft)
              </div>
            `)}
          </div>
        ` : ''}

        <!-- 4-Way Omnipresent Cross-Navigation Action Buttons -->
        <div class="pt-1 flex items-center gap-1.5 flex-wrap">
          <button 
            type="button" 
            onclick="jumpToTopologyTarget('node:${escapeJSAttr(node.instanceId || node.id)}')"
            class="flex-1 min-w-[65px] py-1 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/40 rounded text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
            title="Inspect logical port and link status in Topology"
          >
            <i data-lucide="network" class="w-3 h-3 text-indigo-400"></i> Topology
          </button>
          <button 
            type="button" 
            onclick="if ('${escapeJSAttr(hostSwitch ? hostSwitch.instanceId : '')}') openPortMatrixStudio('${escapeJSAttr(hostSwitch ? hostSwitch.instanceId : '')}'); else showToast('Assign a host switch first', 'warning');"
            class="flex-1 min-w-[65px] py-1 bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 border border-amber-500/40 rounded text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
            title="Open Port Matrix Studio for this switch"
          >
            <i data-lucide="grid" class="w-3 h-3 text-amber-400"></i> Matrix
          </button>
          <button 
            type="button" 
            onclick="jumpToBomTarget('${escapeJSAttr(node.instanceId || node.id)}')"
            class="flex-1 min-w-[65px] py-1 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 rounded text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
            title="Inspect line item in BOM Drawer"
          >
            <i data-lucide="file-spreadsheet" class="w-3 h-3 text-emerald-400"></i> BOM
          </button>
          <button 
            type="button" 
            onclick="const cl = getAllClosetsAcrossFacility().find(c => c.id === '${escapeJSAttr(node.assignedClosetId || '')}'); if (cl) deepLinkToRackElevation(cl.name);"
            class="flex-1 min-w-[65px] py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
            title="Open Terminating Enclosure"
          >
            <i data-lucide="server" class="w-3 h-3 text-indigo-400"></i> Enclosure
          </button>
        </div>

        <div class="flex items-center justify-between gap-2 pt-1 border-t border-slate-800">
          <button onclick="clearNodeWaypoints('${escapeJSAttr(node.id)}')" class="px-2 py-1 bg-slate-800 text-slate-300 hover:text-white rounded border border-slate-700 text-[10px]">
            Reset Bends
          </button>
          <div class="flex items-center gap-1.5">
            <button onclick="deleteNode('${escapeJSAttr(node.id)}')" class="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer" title="Remove drop from canvas only">
              <span>Delete Drop</span>
            </button>
            <button onclick="deleteDropFromBOM('${escapeJSAttr(node.id)}')" class="px-2.5 py-1 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-700/80 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer" title="Delete device from Quote BOM and canvas">
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
  if (typeof openRackViewerFor === "function") {
    openRackViewerFor(closetName);
  } else if (window.TabManager && typeof window.TabManager.openTab === "function") {
    window.TabManager.openTab("enclosures", closetName ? { locationName: closetName } : null);
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
    ` : (!floor.nodes || floor.nodes.length === 0) ? `
      <g transform="translate(620, 380)" text-anchor="middle" class="opacity-80 select-none pointer-events-none">
        <rect x="-260" y="-100" width="520" height="200" rx="16" fill="#0f172a" fill-opacity="0.85" stroke="#334155" stroke-dasharray="6 6" stroke-width="1.5" />
        <circle cx="0" cy="-35" r="28" fill="#1e293b"/>
        <path d="M -10 -35 L 10 -35 M 0 -45 L 0 -25" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round"/>
        <text x="0" y="10" fill="#f1f5f9" font-size="16" font-weight="bold" font-family="system-ui, sans-serif">Upload Plan or Place Equipment</text>
        <text x="0" y="32" fill="#94a3b8" font-size="12" font-family="system-ui, sans-serif">Use "Upload Plan" for PDF/CAD or press [D] for Drop, [C] for Closet</text>
        <text x="0" y="52" fill="#64748b" font-size="11" font-family="system-ui, sans-serif">Press [V] Select • [M] Marquee • [T] Trunk • [F] Fiber • [R] Calibrate Scale</text>
      </g>
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

  // 1b. Main Pathway Corridors / Cable Trays / J-Hook Trunks
  if (physicalLayerFilters.pathways && floor.pathwayTrunks) {
    floor.pathwayTrunks.forEach(trunk => {
      if (!trunk.points || trunk.points.length < 2) return;
      const isSelected = trunk.id === selectedPathwayTrunkId;
      const pts = trunk.points;

      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("class", "pathway-corridor-interactive cursor-pointer group");
      g.setAttribute("data-pathway-id", trunk.id);

      // Count cables running near or snapped through this pathway trunk
      let routedCablesCount = 0;
      floor.nodes.filter(n => n.type === "device").forEach(d => {
        if (d.calculatedRun) {
          const snapped = Array.isArray(d.calculatedRun.traversedTrunks) && d.calculatedRun.traversedTrunks.includes(trunk.id);
          const isNear = !snapped && d.calculatedRun.points && d.calculatedRun.points.some(p => pts.some(tp => Math.hypot(p.x - tp.x, p.y - tp.y) < 45));
          if (snapped || isNear) routedCablesCount++;
        }
      });
      const capacity = trunk.capacity || 80;
      const fillPct = Math.round((routedCablesCount / capacity) * 100);
      const maxFillPct = trunk.type === "conduit" ? 40 : 50;
      const isOverfilled = fillPct > maxFillPct;

      let trunkColor = "#f59e0b"; // Amber for tray
      let strokeDash = "none";
      let strokeW = 10;
      if (trunk.type === "jhook") {
        trunkColor = "#06b6d4";
        strokeDash = "8 6";
        strokeW = 6;
      } else if (trunk.type === "conduit") {
        trunkColor = "#38bdf8";
        strokeW = 8;
      } else if (trunk.type === "ladder") {
        trunkColor = "#a855f7";
        strokeW = 12;
      }

      // Selection Halo
      if (isSelected) {
        for (let i = 0; i < pts.length - 1; i++) {
          const halo = document.createElementNS("http://www.w3.org/2000/svg", "line");
          halo.setAttribute("x1", pts[i].x);
          halo.setAttribute("y1", pts[i].y);
          halo.setAttribute("x2", pts[i + 1].x);
          halo.setAttribute("y2", pts[i + 1].y);
          halo.setAttribute("stroke", "#fde047");
          halo.setAttribute("stroke-width", strokeW + 10);
          halo.setAttribute("stroke-linecap", "round");
          halo.setAttribute("opacity", "0.35");
          g.appendChild(halo);
        }
      }

      // Draw Main Corridor Line
      for (let i = 0; i < pts.length - 1; i++) {
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", pts[i].x);
        line.setAttribute("y1", pts[i].y);
        line.setAttribute("x2", pts[i + 1].x);
        line.setAttribute("y2", pts[i + 1].y);
        line.setAttribute("stroke", trunkColor);
        line.setAttribute("stroke-width", strokeW);
        line.setAttribute("stroke-linecap", "round");
        line.setAttribute("stroke-dasharray", strokeDash);
        line.setAttribute("opacity", isSelected ? "1.0" : "0.85");
        g.appendChild(line);

        // Center stripe for cable tray appearance
        if (trunk.type === "tray" || trunk.type === "ladder" || !trunk.type) {
          const innerLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
          innerLine.setAttribute("x1", pts[i].x);
          innerLine.setAttribute("y1", pts[i].y);
          innerLine.setAttribute("x2", pts[i + 1].x);
          innerLine.setAttribute("y2", pts[i + 1].y);
          innerLine.setAttribute("stroke", "#0f172a");
          innerLine.setAttribute("stroke-width", Math.max(2, strokeW - 4));
          innerLine.setAttribute("stroke-linecap", "round");
          g.appendChild(innerLine);
        }
      }

      // Render Joints/Waypoint handles for moving corridor points
      pts.forEach((pt, pIdx) => {
        const joint = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        joint.setAttribute("class", "draggable-pathway-joint cursor-move");
        joint.setAttribute("data-pathway-id", trunk.id);
        joint.setAttribute("data-joint-idx", pIdx);
        joint.setAttribute("cx", pt.x);
        joint.setAttribute("cy", pt.y);
        joint.setAttribute("r", isSelected ? "7" : "5");
        joint.setAttribute("fill", trunkColor);
        joint.setAttribute("stroke", "#ffffff");
        joint.setAttribute("stroke-width", "2");
        g.appendChild(joint);
      });

      // Corridor Center Badge with fill count
      const midIdx = Math.floor(pts.length / 2);
      const midX = (pts[midIdx - 1].x + pts[midIdx].x) / 2;
      const midY = (pts[midIdx - 1].y + pts[midIdx].y) / 2;

      const badgeW = 158;
      const badgeH = 22;
      const bgRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      bgRect.setAttribute("x", midX - (badgeW / 2));
      bgRect.setAttribute("y", midY - (badgeH / 2));
      bgRect.setAttribute("width", badgeW);
      bgRect.setAttribute("height", badgeH);
      bgRect.setAttribute("rx", "11");
      bgRect.setAttribute("fill", "#0f172a");
      bgRect.setAttribute("stroke", isOverfilled ? "#f43f5e" : trunkColor);
      bgRect.setAttribute("stroke-width", "1.5");
      bgRect.setAttribute("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.5))");
      g.appendChild(bgRect);

      const bText = document.createElementNS("http://www.w3.org/2000/svg", "text");
      bText.setAttribute("x", midX);
      bText.setAttribute("y", midY + 4);
      bText.setAttribute("text-anchor", "middle");
      bText.setAttribute("fill", isOverfilled ? "#fb7185" : "#f8fafc");
      bText.setAttribute("font-size", "9.5");
      bText.setAttribute("font-family", "monospace");
      bText.setAttribute("font-weight", "bold");
      bText.textContent = `${trunk.name.slice(0, 11)}: ${routedCablesCount}/${capacity} (${fillPct}%)`;
      g.appendChild(bText);

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
      const isSelected = dev.id === selectedNodeId || closet.id === selectedNodeId || (selectedNodeIds && (selectedNodeIds.has(dev.id) || selectedNodeIds.has(closet.id)));
      const isCrossFloor = closet.floorId !== floor.id;
      const pts = run.points || [{ x: closet.x, y: closet.y }, { x: dev.x, y: dev.y }];

      const runStd = (typeof getProjectCablingStandard === "function")
        ? getProjectCablingStandard(bomItem || dev, "run")
        : { color: "Yellow", hex: "#eab308" };
      const cableColorHex = runStd.hex || "#eab308";

      const runG = document.createElementNS("http://www.w3.org/2000/svg", "g");
      runG.setAttribute("class", "device-cable-run-group");
      runG.setAttribute("data-cable-group-id", dev.id);

      for (let i = 0; i < pts.length - 1; i++) {
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("class", "cable-path-line cursor-pointer");
        line.setAttribute("data-drop-id", dev.id);
        line.setAttribute("x1", pts[i].x);
        line.setAttribute("y1", pts[i].y);
        line.setAttribute("x2", pts[i + 1].x);
        line.setAttribute("y2", pts[i + 1].y);
        line.setAttribute("stroke", run.isExceeded ? "#f43f5e" : isCrossFloor ? "#38bdf8" : isSelected ? "#a855f7" : cableColorHex);
        line.setAttribute("stroke-width", isSelected ? "4" : "2.5");
        line.setAttribute("stroke-dasharray", isCrossFloor ? "4,4" : run.isExceeded ? "6,4" : "none");
        line.setAttribute("opacity", isSelected ? "1.0" : "0.75");
        runG.appendChild(line);
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
          wpCircle.setAttribute("fill", cableColorHex);
          wpCircle.setAttribute("stroke", "#ffffff");
          wpCircle.setAttribute("stroke-width", "2");
          runG.appendChild(wpCircle);
        });
      }

      const midIdx = Math.floor(pts.length / 2);
      const midX = (pts[midIdx - 1].x + pts[midIdx].x) / 2;
      const midY = (pts[midIdx - 1].y + pts[midIdx].y) / 2;

      const tag = document.createElementNS("http://www.w3.org/2000/svg", "text");
      tag.setAttribute("class", "cable-footage-tag");
      tag.setAttribute("x", midX);
      tag.setAttribute("y", midY - 6);
      tag.setAttribute("text-anchor", "middle");
      tag.setAttribute("fill", run.isExceeded ? "#fb7185" : isCrossFloor ? "#7dd3fc" : "#cbd5e1");
      tag.setAttribute("font-size", "10");
      tag.setAttribute("font-family", "monospace");
      tag.setAttribute("font-weight", "bold");
      const snappedCount = (run.traversedTrunks && run.traversedTrunks.length) ? ` [Tray]` : "";
      tag.textContent = `${run.totalFt} ft ${isCrossFloor ? `(Riser)` : ''}${snappedCount}`;
      runG.appendChild(tag);

      svg.appendChild(runG);
    });
  }

  // 2b. Interactive Camera FOV & DORI / PPF Spatial Cones
  if (showCameraFovCones && physicalLayerFilters.cameras && (typeof window.FEATURE_FLAGS === "undefined" || window.FEATURE_FLAGS.enableSpecificCameraDetails === true)) {
    floor.nodes.filter(n => n.type === "device").forEach(dev => {
      const bomItem = (typeof projectBOM !== "undefined" && dev.instanceId) ? projectBOM.find(i => i.instanceId === dev.instanceId) : null;
      const layerType = getDeviceLayerType(bomItem || dev);
      if (layerType !== "cameras") return;

      const isSelected = (dev.id === selectedNodeId) || (selectedNodeIds && selectedNodeIds.has(dev.id));
      const fovG = document.createElementNS("http://www.w3.org/2000/svg", "g");
      fovG.setAttribute("class", "camera-fov-cone-group");
      fovG.setAttribute("data-fov-node-id", dev.id);
      fovG.setAttribute("transform", `translate(${dev.x}, ${dev.y})`);
      renderCameraFovGroupContent(fovG, dev, bomItem, floor, isSelected);
      svg.appendChild(fovG);
    });
  }

  // 3. Closets & Mounting Hosts (Poles, NEMA Boxes, Cabinets, Racks, Backboards)
  if (physicalLayerFilters.closets) {
    floor.nodes.filter(n => n.type === "closet").forEach(closet => {
      const isSelected = (closet.id === selectedNodeId) || (selectedNodeIds && selectedNodeIds.has(closet.id));
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

    const isSelected = (dev.id === selectedNodeId) || (selectedNodeIds && selectedNodeIds.has(dev.id));
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", "draggable-canvas-node cursor-pointer");
    g.setAttribute("data-node-id", dev.id);
    g.setAttribute("transform", `translate(${dev.x}, ${dev.y})`);

    // Multi-select / selection glowing halo
    if (isSelected) {
      const halo = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      halo.setAttribute("r", 20);
      halo.setAttribute("fill", "none");
      halo.setAttribute("stroke", "#38bdf8");
      halo.setAttribute("stroke-width", "2");
      halo.setAttribute("stroke-dasharray", "4 2");
      halo.setAttribute("opacity", "0.9");
      g.appendChild(halo);
    }

    // TIA-568 Horizontal Run Distance Violations (>328' Critical / >295' Caution)
    const runFt = (dev.calculatedRun && dev.calculatedRun.totalFt) ? dev.calculatedRun.totalFt : 0;
    const isChannelViolation = runFt > 328;
    const isDistanceCaution = runFt > 295 && !isChannelViolation;

    if (isChannelViolation) {
      const alertHalo = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      alertHalo.setAttribute("r", isSelected ? 24 : 20);
      alertHalo.setAttribute("fill", "none");
      alertHalo.setAttribute("stroke", "#ef4444");
      alertHalo.setAttribute("stroke-width", "3");
      alertHalo.setAttribute("stroke-dasharray", "4 2");
      alertHalo.setAttribute("opacity", "0.95");
      g.appendChild(alertHalo);

      const alertPill = document.createElementNS("http://www.w3.org/2000/svg", "g");
      alertPill.setAttribute("transform", "translate(0, -32)");
      const pillBg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      pillBg.setAttribute("x", "-48"); pillBg.setAttribute("y", "-8");
      pillBg.setAttribute("width", "96"); pillBg.setAttribute("height", "16");
      pillBg.setAttribute("rx", "8");
      pillBg.setAttribute("fill", "#7f1d1d");
      pillBg.setAttribute("stroke", "#f87171");
      pillBg.setAttribute("stroke-width", "1");
      alertPill.appendChild(pillBg);
      const pillTxt = document.createElementNS("http://www.w3.org/2000/svg", "text");
      pillTxt.setAttribute("x", "0"); pillTxt.setAttribute("y", "3.5");
      pillTxt.setAttribute("text-anchor", "middle");
      pillTxt.setAttribute("fill", "#fecaca");
      pillTxt.setAttribute("font-size", "8.5");
      pillTxt.setAttribute("font-weight", "bold");
      pillTxt.setAttribute("font-family", "monospace");
      pillTxt.textContent = `! >328' (${runFt}')`;
      alertPill.appendChild(pillTxt);
      g.appendChild(alertPill);
    } else if (isDistanceCaution) {
      const cautionHalo = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      cautionHalo.setAttribute("r", isSelected ? 22 : 18);
      cautionHalo.setAttribute("fill", "none");
      cautionHalo.setAttribute("stroke", "#f59e0b");
      cautionHalo.setAttribute("stroke-width", "2.5");
      cautionHalo.setAttribute("stroke-dasharray", "3 2");
      cautionHalo.setAttribute("opacity", "0.9");
      g.appendChild(cautionHalo);

      const cautionPill = document.createElementNS("http://www.w3.org/2000/svg", "g");
      cautionPill.setAttribute("transform", "translate(0, -32)");
      const pillBg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      pillBg.setAttribute("x", "-44"); pillBg.setAttribute("y", "-8");
      pillBg.setAttribute("width", "88"); pillBg.setAttribute("height", "16");
      pillBg.setAttribute("rx", "8");
      pillBg.setAttribute("fill", "#78350f");
      pillBg.setAttribute("stroke", "#fbbf24");
      pillBg.setAttribute("stroke-width", "1");
      cautionPill.appendChild(pillBg);
      const pillTxt = document.createElementNS("http://www.w3.org/2000/svg", "text");
      pillTxt.setAttribute("x", "0"); pillTxt.setAttribute("y", "3.5");
      pillTxt.setAttribute("text-anchor", "middle");
      pillTxt.setAttribute("fill", "#fef3c7");
      pillTxt.setAttribute("font-size", "8.5");
      pillTxt.setAttribute("font-weight", "bold");
      pillTxt.setAttribute("font-family", "monospace");
      pillTxt.textContent = `⚠ >295' (${runFt}')`;
      cautionPill.appendChild(pillTxt);
      g.appendChild(cautionPill);
    }

    // Visual Revision Compare Overlays
    let revStatus = null; // "added" | "modified"
    if (activeRevisionCompareId && typeof RevisionEngine !== "undefined") {
      const revisions = RevisionEngine.getRevisions();
      const rev = revisions.find(r => r.id === activeRevisionCompareId);
      const revFloors = (rev && rev.data && rev.data.facilityFloors) || (rev && rev.floors);
      if (revFloors) {
        const snapFloor = revFloors.find(f => f.id === floor.id);
        if (snapFloor && snapFloor.nodes) {
          const match = snapFloor.nodes.find(b => b.id === dev.id || (b.instanceId && b.instanceId === dev.instanceId));
          if (!match) {
            revStatus = "added";
          } else if (match.x !== dev.x || match.y !== dev.y || match.model !== dev.model) {
            revStatus = "modified";
          }
        }
      }
    }

    if (revStatus === "added") {
      const addHalo = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      addHalo.setAttribute("r", 22);
      addHalo.setAttribute("fill", "none");
      addHalo.setAttribute("stroke", "#10b981");
      addHalo.setAttribute("stroke-width", "2.5");
      addHalo.setAttribute("stroke-dasharray", "2 2");
      g.appendChild(addHalo);

      const addPill = document.createElementNS("http://www.w3.org/2000/svg", "text");
      addPill.setAttribute("x", 0);
      addPill.setAttribute("y", isChannelViolation || isDistanceCaution ? -46 : -30);
      addPill.setAttribute("text-anchor", "middle");
      addPill.setAttribute("fill", "#34d399");
      addPill.setAttribute("font-size", "8.5");
      addPill.setAttribute("font-weight", "bold");
      addPill.setAttribute("font-family", "monospace");
      addPill.textContent = "+ NEW ADD";
      g.appendChild(addPill);
    } else if (revStatus === "modified") {
      const modHalo = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      modHalo.setAttribute("r", 22);
      modHalo.setAttribute("fill", "none");
      modHalo.setAttribute("stroke", "#38bdf8");
      modHalo.setAttribute("stroke-width", "2");
      modHalo.setAttribute("stroke-dasharray", "3 2");
      g.appendChild(modHalo);

      const modPill = document.createElementNS("http://www.w3.org/2000/svg", "text");
      modPill.setAttribute("x", 0);
      modPill.setAttribute("y", isChannelViolation || isDistanceCaution ? -46 : -30);
      modPill.setAttribute("text-anchor", "middle");
      modPill.setAttribute("fill", "#7dd3fc");
      modPill.setAttribute("font-size", "8.5");
      modPill.setAttribute("font-weight", "bold");
      modPill.setAttribute("font-family", "monospace");
      modPill.textContent = "~ MODIFIED";
      g.appendChild(modPill);
    }

    const baseRadius = (isFieldWalkMode ? 17 : 12) + (isSelected ? 3 : 0);
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("r", baseRadius);
    circle.setAttribute("fill", isSelected ? "#047857" : "#064e3b");
    circle.setAttribute("stroke", isSelected ? "#34d399" : "#10b981");
    circle.setAttribute("stroke-width", isSelected ? "3.5" : "2");
    g.appendChild(circle);

    if (isFieldWalkMode) {
      const touchHit = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      touchHit.setAttribute("r", "28");
      touchHit.setAttribute("fill", "transparent");
      g.appendChild(touchHit);
    }

    const devNum = (bomItem && bomItem.deviceNumber) || dev.deviceNumber;
    if (devNum && !isChannelViolation && !isDistanceCaution && !revStatus) {
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

    // TIA-606-C Cable ID Tag
    if (showPhysicalCableIds) {
      const cableId = getDeviceCableId(dev);
      if (cableId) {
        const idG = document.createElementNS("http://www.w3.org/2000/svg", "g");
        idG.setAttribute("transform", "translate(0, 36)");
        const idBg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        const idLen = Math.max(76, cableId.length * 6.5 + 16);
        idBg.setAttribute("x", -idLen / 2);
        idBg.setAttribute("y", -7);
        idBg.setAttribute("width", idLen);
        idBg.setAttribute("height", 15);
        idBg.setAttribute("rx", "4");
        idBg.setAttribute("fill", "#0f172a");
        idBg.setAttribute("stroke", "#3b82f6");
        idBg.setAttribute("stroke-width", "1");
        idG.appendChild(idBg);

        const idTxt = document.createElementNS("http://www.w3.org/2000/svg", "text");
        idTxt.setAttribute("x", 0);
        idTxt.setAttribute("y", 4);
        idTxt.setAttribute("text-anchor", "middle");
        idTxt.setAttribute("fill", "#60a5fa");
        idTxt.setAttribute("font-size", "8.5");
        idTxt.setAttribute("font-weight", "bold");
        idTxt.setAttribute("font-family", "monospace");
        idTxt.textContent = cableId;
        idG.appendChild(idTxt);
        g.appendChild(idG);
      }
    }

    // Walk Audit Verified Badge
    if (dev.walkVerified) {
      const auditG = document.createElementNS("http://www.w3.org/2000/svg", "g");
      const yOffset = showPhysicalCableIds ? 50 : 34;
      auditG.setAttribute("transform", `translate(0, ${yOffset})`);
      const badgeBg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      badgeBg.setAttribute("x", "-32"); badgeBg.setAttribute("y", "-7");
      badgeBg.setAttribute("width", "64"); badgeBg.setAttribute("height", "14");
      badgeBg.setAttribute("rx", "4");
      badgeBg.setAttribute("fill", "#064e3b");
      badgeBg.setAttribute("stroke", "#10b981");
      badgeBg.setAttribute("stroke-width", "1");
      auditG.appendChild(badgeBg);

      const badgeTxt = document.createElementNS("http://www.w3.org/2000/svg", "text");
      badgeTxt.setAttribute("x", "0"); badgeTxt.setAttribute("y", "3.5");
      badgeTxt.setAttribute("text-anchor", "middle");
      badgeTxt.setAttribute("fill", "#a7f3d0");
      badgeTxt.setAttribute("font-size", "7.5");
      badgeTxt.setAttribute("font-weight", "bold");
      badgeTxt.setAttribute("font-family", "monospace");
      badgeTxt.textContent = "✓ VERIFIED";
      auditG.appendChild(badgeTxt);
      g.appendChild(auditG);
    }

    svg.appendChild(g);
  });

  // Scale Calibration In-Progress Marker
  if (scaleCalibrationStartPoint) {
    const calG = document.createElementNS("http://www.w3.org/2000/svg", "g");
    calG.setAttribute("transform", `translate(${scaleCalibrationStartPoint.x}, ${scaleCalibrationStartPoint.y})`);
    const cDot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    cDot.setAttribute("r", "8");
    cDot.setAttribute("fill", "#eab308");
    cDot.setAttribute("stroke", "#ffffff");
    cDot.setAttribute("stroke-width", "2");
    calG.appendChild(cDot);
    const cPulse = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    cPulse.setAttribute("r", "18");
    cPulse.setAttribute("fill", "none");
    cPulse.setAttribute("stroke", "#eab308");
    cPulse.setAttribute("stroke-width", "1.5");
    cPulse.setAttribute("stroke-dasharray", "3 3");
    calG.appendChild(cPulse);
    const cText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    cText.setAttribute("x", "0"); cText.setAttribute("y", "-14");
    cText.setAttribute("text-anchor", "middle");
    cText.setAttribute("fill", "#fef08a");
    cText.setAttribute("font-size", "9");
    cText.setAttribute("font-weight", "bold");
    cText.textContent = "Point 1 (Now Click Pt 2)";
    calG.appendChild(cText);
    svg.appendChild(calG);
  }

  // 5. Visual Revision Compare - Demolished / Removed Ghost Nodes
  if (activeRevisionCompareId && typeof RevisionEngine !== "undefined") {
    const revisions = RevisionEngine.getRevisions();
    const rev = revisions.find(r => r.id === activeRevisionCompareId);
    const revFloors = (rev && rev.data && rev.data.facilityFloors) || (rev && rev.floors);
    if (revFloors) {
      const snapFloor = revFloors.find(f => f.id === floor.id);
      if (snapFloor && snapFloor.nodes) {
        snapFloor.nodes.filter(n => n.type === "device").forEach(baseDev => {
          const stillExists = floor.nodes.some(cur => cur.id === baseDev.id || (cur.instanceId && cur.instanceId === baseDev.instanceId));
          if (!stillExists) {
            const ghostG = document.createElementNS("http://www.w3.org/2000/svg", "g");
            ghostG.setAttribute("class", "opacity-75");
            ghostG.setAttribute("transform", `translate(${baseDev.x}, ${baseDev.y})`);

            const ghostCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            ghostCircle.setAttribute("r", "13");
            ghostCircle.setAttribute("fill", "#450a0a");
            ghostCircle.setAttribute("stroke", "#f87171");
            ghostCircle.setAttribute("stroke-width", "2");
            ghostCircle.setAttribute("stroke-dasharray", "4 3");
            ghostG.appendChild(ghostCircle);

            const ghostBadge = document.createElementNS("http://www.w3.org/2000/svg", "text");
            ghostBadge.setAttribute("x", "0");
            ghostBadge.setAttribute("y", "-18");
            ghostBadge.setAttribute("text-anchor", "middle");
            ghostBadge.setAttribute("fill", "#f87171");
            ghostBadge.setAttribute("font-size", "8.5");
            ghostBadge.setAttribute("font-weight", "bold");
            ghostBadge.setAttribute("font-family", "monospace");
            ghostBadge.textContent = "✕ REMOVED";
            ghostG.appendChild(ghostBadge);

            const ghostName = document.createElementNS("http://www.w3.org/2000/svg", "text");
            ghostName.setAttribute("x", "0");
            ghostName.setAttribute("y", "22");
            ghostName.setAttribute("text-anchor", "middle");
            ghostName.setAttribute("fill", "#fca5a5");
            ghostName.setAttribute("font-size", "9.5");
            ghostName.setAttribute("font-family", "monospace");
            ghostName.setAttribute("text-decoration", "line-through");
            ghostName.textContent = baseDev.name;
            ghostG.appendChild(ghostName);

            svg.appendChild(ghostG);
          }
        });
      }
    }
  }

  // Update live Physical DRC Distance status pill and unplaced count badge
  updatePhysicalDrcPill();
  updateUnplacedCountBadge();
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

  // 2. Open physical layout tab via TabManager (or modal fallback)
  if (window.TabManager && typeof window.TabManager.openTab === "function") {
    window.TabManager.openTab("physical_layout");
  } else {
    const modal = document.getElementById("cableLayoutModal");
    if (modal && modal.classList.contains("hidden")) {
      toggleCableLayoutModal();
    }
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

// Bulk Operations & Pathway Corridor Handlers
// -----------------------------------------------------------
function clearMultiSelection() {
  selectedNodeIds.clear();
  selectedNodeId = null;
  renderInspector();
  renderCableCanvas();
}

function executeBulkReassignCloset(newClosetId) {
  const floor = getActiveFloor();
  if (!floor || !selectedNodeIds || selectedNodeIds.size === 0) return;
  const allClosets = getAllClosetsAcrossFacility();
  const targetCloset = allClosets.find(c => c.id === newClosetId);
  if (!targetCloset) return;

  let count = 0;
  floor.nodes.filter(n => selectedNodeIds.has(n.id) && n.type === "device").forEach(dev => {
    dev.assignedClosetId = targetCloset.id;
    dev.waypoints = [];
    if (typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) {
      const match = projectBOM.find(i => (i.instanceId && (i.instanceId === dev.instanceId || i.instanceId === dev.id)) || i.model === dev.name);
      if (match) {
        match.closetName = targetCloset.name;
        match.rackId = targetCloset.name;
        if (typeof PortEngine !== "undefined") {
          PortEngine.autoAssignDeviceToClosetSwitch(match, targetCloset.name);
        }
      }
    }
    count++;
  });

  if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
    FacilityStore.notifyWorkspaceChange();
  }
  recalculateCurrentFloorCables();
  renderCableCanvas();
  renderInspector();
  saveFacilityState(true);
  if (typeof updateBOMView === "function") updateBOMView();
  if (typeof showToast === "function") {
    showToast(`Reassigned ${count} drop${count === 1 ? '' : 's'} to ${targetCloset.name}.`);
  }
}

function executeBulkChangeCableSpec(newSku) {
  const floor = getActiveFloor();
  if (!floor || !selectedNodeIds || selectedNodeIds.size === 0) return;

  let count = 0;
  floor.nodes.filter(n => selectedNodeIds.has(n.id) && n.type === "device").forEach(dev => {
    dev.cableSku = newSku;
    count++;
  });

  recalculateCurrentFloorCables();
  renderCableCanvas();
  renderInspector();
  saveFacilityState(true);
  if (typeof showToast === "function") {
    showToast(`Updated cable specification to ${newSku} on ${count} drops.`);
  }
}

function executeBulkAlign(axis) {
  const floor = getActiveFloor();
  if (!floor || !selectedNodeIds || selectedNodeIds.size < 2) return;
  const nodes = floor.nodes.filter(n => selectedNodeIds.has(n.id));

  if (axis === "horizontal") {
    const avgY = Math.round(nodes.reduce((acc, n) => acc + n.y, 0) / nodes.length);
    nodes.forEach(n => { n.y = avgY; });
  } else {
    const avgX = Math.round(nodes.reduce((acc, n) => acc + n.x, 0) / nodes.length);
    nodes.forEach(n => { n.x = avgX; });
  }

  recalculateCurrentFloorCables();
  renderCableCanvas();
  saveFacilityState(true);
  if (typeof showToast === "function") {
    showToast(`Aligned ${nodes.length} nodes ${axis}ly.`);
  }
}

function executeBulkDistribute() {
  const floor = getActiveFloor();
  if (!floor || !selectedNodeIds || selectedNodeIds.size < 3) {
    if (typeof showToast === "function") showToast("Select at least 3 nodes to distribute.");
    return;
  }
  const nodes = floor.nodes.filter(n => selectedNodeIds.has(n.id));
  const spanX = Math.max(...nodes.map(n => n.x)) - Math.min(...nodes.map(n => n.x));
  const spanY = Math.max(...nodes.map(n => n.y)) - Math.min(...nodes.map(n => n.y));

  if (spanX >= spanY) {
    nodes.sort((a, b) => a.x - b.x);
    const startX = nodes[0].x;
    const endX = nodes[nodes.length - 1].x;
    const step = (endX - startX) / (nodes.length - 1);
    nodes.forEach((n, idx) => {
      n.x = Math.round(startX + (idx * step));
    });
  } else {
    nodes.sort((a, b) => a.y - b.y);
    const startY = nodes[0].y;
    const endY = nodes[nodes.length - 1].y;
    const step = (endY - startY) / (nodes.length - 1);
    nodes.forEach((n, idx) => {
      n.y = Math.round(startY + (idx * step));
    });
  }

  recalculateCurrentFloorCables();
  renderCableCanvas();
  saveFacilityState(true);
  if (typeof showToast === "function") {
    showToast(`Distributed ${nodes.length} nodes evenly along dominant span.`);
  }
}

function executeBulkClearWaypoints() {
  const floor = getActiveFloor();
  if (!floor || !selectedNodeIds || selectedNodeIds.size === 0) return;
  let count = 0;
  floor.nodes.filter(n => selectedNodeIds.has(n.id) && n.type === "device").forEach(d => {
    d.waypoints = [];
    count++;
  });
  recalculateCurrentFloorCables();
  renderCableCanvas();
  saveFacilityState(true);
  if (typeof showToast === "function") {
    showToast(`Reset cable routing & bend points on ${count} drops.`);
  }
}

function executeBulkDeleteNodes() {
  const floor = getActiveFloor();
  if (!floor || !selectedNodeIds || selectedNodeIds.size === 0) return;
  const count = selectedNodeIds.size;
  if (!confirm(`Are you sure you want to delete all ${count} selected elements?`)) return;

  const toDelete = new Set(selectedNodeIds);
  selectedNodeIds.clear();
  selectedNodeId = null;

  const closetCount = floor.nodes.filter(n => n.type === "closet" && toDelete.has(n.id)).length;
  const totalClosets = getAllClosetsAcrossFacility().length;
  if (closetCount > 0 && closetCount >= totalClosets) {
    alert("Cannot delete all closets. At least one closet must remain.");
    return;
  }

  floor.nodes = floor.nodes.filter(n => !toDelete.has(n.id));

  if (typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) {
    projectBOM = projectBOM.filter(i => !toDelete.has(i.instanceId));
  }

  recalculateCurrentFloorCables();
  renderCableCanvas();
  renderInspector();
  renderSidebarTabContent();
  saveFacilityState(true);
  if (typeof updateBOMView === "function") updateBOMView();
  if (typeof showToast === "function") {
    showToast(`Deleted ${count} elements from floor layout.`);
  }
}

function updatePathwayTrunkName(id, name) {
  const floor = getActiveFloor();
  if (!floor || !floor.pathwayTrunks) return;
  const trunk = floor.pathwayTrunks.find(t => t.id === id);
  if (trunk) {
    trunk.name = name;
    renderCableCanvas();
    saveFacilityState(true);
  }
}

function updatePathwayTrunkType(id, type) {
  const floor = getActiveFloor();
  if (!floor || !floor.pathwayTrunks) return;
  const trunk = floor.pathwayTrunks.find(t => t.id === id);
  if (trunk) {
    trunk.type = type;
    if (type === "tray") trunk.capacity = 100;
    else if (type === "ladder") trunk.capacity = 160;
    else if (type === "jhook") trunk.capacity = 40;
    else if (type === "conduit") trunk.capacity = 25;
    renderCableCanvas();
    renderInspector();
    saveFacilityState(true);
  }
}

function updatePathwayTrunkCapacity(id, cap) {
  const floor = getActiveFloor();
  if (!floor || !floor.pathwayTrunks) return;
  const trunk = floor.pathwayTrunks.find(t => t.id === id);
  if (trunk) {
    trunk.capacity = Number(cap) || 80;
    renderCableCanvas();
    renderInspector();
    saveFacilityState(true);
  }
}

function deletePathwayTrunk(id) {
  const floor = getActiveFloor();
  if (!floor || !floor.pathwayTrunks) return;
  floor.pathwayTrunks = floor.pathwayTrunks.filter(t => t.id !== id);
  selectedPathwayTrunkId = null;
  activeDrawingPathwayId = null;
  recalculateCurrentFloorCables();
  renderCableCanvas();
  renderInspector();
  saveFacilityState(true);
  if (typeof showToast === "function") {
    showToast("Deleted pathway corridor.");
  }
}

function deselectPathwayTrunk() {
  selectedPathwayTrunkId = null;
  activeDrawingPathwayId = null;
  renderInspector();
  renderCableCanvas();
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

  // Multi-Select & Pathway exports
  window.clearMultiSelection = clearMultiSelection;
  window.executeBulkReassignCloset = executeBulkReassignCloset;
  window.executeBulkChangeCableSpec = executeBulkChangeCableSpec;
  window.executeBulkAlign = executeBulkAlign;
  window.executeBulkDistribute = executeBulkDistribute;
  window.executeBulkClearWaypoints = executeBulkClearWaypoints;
  window.executeBulkDeleteNodes = executeBulkDeleteNodes;
  window.updatePathwayTrunkName = updatePathwayTrunkName;
  window.updatePathwayTrunkType = updatePathwayTrunkType;
  window.updatePathwayTrunkCapacity = updatePathwayTrunkCapacity;
  window.deletePathwayTrunk = deletePathwayTrunk;
  window.deselectPathwayTrunk = deselectPathwayTrunk;

  // Engineering View State exports
  window.togglePhysicalCableIds = togglePhysicalCableIds;
  window.toggleFieldWalkMode = toggleFieldWalkMode;
  window.updateUnplacedCountBadge = updateUnplacedCountBadge;
  window.deleteSelectedPhysicalItems = deleteSelectedPhysicalItems;
  window.stepToNextDistanceViolation = handlePhysicalDrcPillClick;
  window.handlePhysicalDrcPillClick = handlePhysicalDrcPillClick;
  window.getSelectedNodeId = () => selectedNodeId;
  window.setPhysicalRevisionCompare = setPhysicalRevisionCompare;
  window.populateRevisionCompareDropdown = populateRevisionCompareDropdown;
  window.exportFloorplanToSubmittal = exportFloorplanToSubmittal;
  window.getDeviceCableId = getDeviceCableId;
  window.getFloorDistanceViolations = getFloorDistanceViolations;
  window.toggleFloorActionMenu = toggleFloorActionMenu;
  window.toggleDoriColorBands = toggleDoriColorBands;
  window.snapAllFloorCablesToTrunks = snapAllFloorCablesToTrunks;
}