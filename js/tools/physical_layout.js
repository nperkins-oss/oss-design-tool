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
    <option value="${escapeHTML(r.id)}" ${activeRevisionCompareId === r.id ? 'selected' : ''}>${escapeHTML(r.code)}: ${escapeHTML(r.name || 'Snapshot')}</option>
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
    return `<option value="${escapeHTML(f.id)}" ${f.id === activeFloorId ? 'selected' : ''}>${escapeHTML(f.name)} (${closets} Racks, ${drops} Drops)</option>`;
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

function updateSelectedCableSpec(sku, skipConfirm = false) {
  const defs = (typeof StorageService !== "undefined" && typeof StorageService.getProjectDefaults === "function") ? StorageService.getProjectDefaults() : null;
  const normSpec = (s) => String(s || "").toUpperCase().replace(/-(YL|BL|WH|GN|OR|GY|BK|RD|PU)$/, "");
  const specLabel = (s) => {
    const n = normSpec(s);
    if (n.includes("C6A-OUTDOOR")) return "Cat6A OSP Outdoor";
    if (n.includes("C6A-CMR")) return "Cat6A F/UTP Riser (CMR)";
    if (n.includes("C6-CMP")) return "Cat6 U/UTP Plenum (CMP)";
    return "Cat6A F/UTP Plenum (CMP)";
  };
  const defCat = defs?.cabling?.standards?.defaultRunCategory || defs?.cabling?.horizontalCategories?.[0] || "C6A-CMP-1K-YL";
  if (!skipConfirm && defs && normSpec(sku) !== normSpec(defCat) && normSpec(sku) !== normSpec(activeCableSku) && typeof confirmProjectDefaultChange === "function" && !(typeof isProjectWizardOpen === "function" && isProjectWizardOpen())) {
    const selEl = document.getElementById("cableTypeSelector");
    confirmProjectDefaultChange({
      title: "Change Baseline Horizontal Cable Category?",
      settingLabel: "Horizontal Copper Cable Specification",
      defaultLabel: specLabel(defCat),
      newLabel: specLabel(sku),
      message: `Your Project Default Baseline Run Category is set to "${specLabel(defCat)}". Are you sure you want to change the floorplan cable specification to "${specLabel(sku)}"?`,
      allowLocalOverride: true,
      localOverrideLabel: "Use on This Floorplan Only",
      updateDefaultLabel: `Update Project Default to ${specLabel(sku)}`,
      onLocalOverride: () => updateSelectedCableSpec(sku, true),
      onUpdateDefault: () => {
        const mappedDefaultSku = sku.endsWith("-BL") && (defs.cabling?.standards?.defaultRunColor || "Yellow") === "Yellow"
          ? sku.replace(/-BL$/, "-YL")
          : sku;
        if (typeof updateSingleProjectDefault === "function") {
          updateSingleProjectDefault(d => {
            if (!d.cabling) d.cabling = {};
            d.cabling.horizontalCategories = [mappedDefaultSku];
            if (!d.cabling.standards) d.cabling.standards = {};
            d.cabling.standards.defaultRunCategory = mappedDefaultSku;
          });
        }
        updateSelectedCableSpec(sku, true);
      },
      onCancel: () => {
        if (selEl) {
          const curPrefix = normSpec(activeCableSku);
          const matchOpt = Array.from(selEl.options).find(o => normSpec(o.value) === curPrefix);
          if (matchOpt) selEl.value = matchOpt.value;
        }
      }
    });
    return;
  }
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
    const bomByInstanceId = new Map((typeof projectBOM !== "undefined" && Array.isArray(projectBOM) ? projectBOM : []).map(i => [i.instanceId, i]));
    const allClosets = getAllClosetsAcrossFacility();
    const closetById = new Map(allClosets.map(c => [c.id, c]));
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
          const item = bomByInstanceId.get(instId);
          if (item) {
            n.name = item.friendlyName || item.model;
            n.deviceNumber = item.deviceNumber;

            // Synchronize BOM location with terminating closet if item was unassigned or in virtual field
            if (n.assignedClosetId) {
              const closet = closetById.get(n.assignedClosetId);
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
    const bomByInstanceId = new Map((typeof projectBOM !== "undefined" && Array.isArray(projectBOM) ? projectBOM : []).map(i => [i.instanceId, i]));
    const allClosets = getAllClosetsAcrossFacility();
    const closetById = new Map(allClosets.map(c => [c.id, c]));
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
    const bomByInstanceId = new Map((typeof projectBOM !== "undefined" && Array.isArray(projectBOM) ? projectBOM : []).map(i => [i.instanceId, i]));
    const allClosets = getAllClosetsAcrossFacility();
    const closetById = new Map(allClosets.map(c => [c.id, c]));
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

