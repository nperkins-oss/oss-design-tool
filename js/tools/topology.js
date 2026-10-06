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

function setProjectFiberType(type) {
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

function getDacLengthForUDiff(uDiff) {
  if (uDiff === null || uDiff === undefined) return "1m";
  if (uDiff <= 2) return "0.5m";
  if (uDiff <= 6) return "1m";
  if (uDiff <= 15) return "2m";
  if (uDiff <= 28) return "3m";
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

function findPatchCordItem(targetFt, preferredVendor, isEtherlighting) {
  if (typeof CABLING_CATALOG !== "undefined" && CABLING_CATALOG.patchCords) {
    const cords = CABLING_CATALOG.patchCords;
    if (isEtherlighting) {
      const el = cords.find(c => c.etherlighting && Math.abs((c.lengthFt || 0) - targetFt) < 0.6);
      if (el) return el;
    }
    if (preferredVendor) {
      const match = cords.find(c => (c.vendor || '').toLowerCase().includes(preferredVendor.toLowerCase()) && Math.abs((c.lengthFt || 0) - targetFt) < 0.6);
      if (match) return match;
    }
    const match = cords.find(c => Math.abs((c.lengthFt || 0) - targetFt) < 0.6);
    if (match) return match;
  }
  return {
    sku: targetFt === 0.5 ? "C6A-SLIM-6IN-BL" : (targetFt === 1 ? "C6A-SLIM-1FT-BL" : (targetFt === 3 ? "C6A-SLIM-3FT-BL" : (targetFt === 5 ? "C6A-SLIM-5FT-BL" : (targetFt === 7 ? "C6A-SLIM-7FT-BL" : (targetFt === 10 ? "C6A-SLIM-10FT-BL" : "C6A-SLIM-15FT-BL"))))),
    name: `Cat6A Slim 28AWG Patch Cord (${targetFt === 0.5 ? '6-Inch' : targetFt + '-Foot'}, Blue)`,
    vendor: "Panduit",
    msrp: targetFt === 0.5 ? 6.20 : (targetFt === 1 ? 7.50 : (targetFt === 3 ? 8.50 : (targetFt === 5 ? 9.80 : (targetFt === 7 ? 11.00 : (targetFt === 10 ? 13.50 : 16.50))))),
    lengthFt: targetFt
  };
}

function formatDacItem(baseSku, baseName, baseMsrp, lengthStr, speed, vendor) {
  const upperLen = lengthStr.toUpperCase();
  let sku = baseSku;
  if (/1M/i.test(sku)) {
    sku = sku.replace(/1M/i, upperLen);
  } else if (/0101/.test(sku)) {
    const ruckusMap = { "0.5M": "0051", "1M": "0101", "2M": "0201", "3M": "0301", "5M": "0501" };
    sku = sku.replace("0101", ruckusMap[upperLen] || upperLen);
  } else {
    sku = `${sku}-${upperLen}`;
  }

  let name = baseName;
  if (/\(1m\)/i.test(name)) {
    name = name.replace(/\(1m\)/i, `(${lengthStr})`);
  } else if (!name.includes(lengthStr)) {
    name = `${name} (${lengthStr})`;
  }

  let msrp = baseMsrp;
  if (lengthStr === "0.5m") msrp = Math.max(15, Math.round(baseMsrp * 0.9));
  else if (lengthStr === "2m") msrp = baseMsrp + 10;
  else if (lengthStr === "3m") msrp = baseMsrp + 20;
  else if (lengthStr === "5m") msrp = baseMsrp + 35;

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

function setTopologyLayerFilter(layer, enabled) {
  if (topologyLayerFilters.hasOwnProperty(layer)) {
    topologyLayerFilters[layer] = !!enabled;
  }
  updateTopologyLayerCountBadge();
  renderTopology();
}

function toggleAllTopologyLayers(enableAll) {
  Object.keys(topologyLayerFilters).forEach(k => {
    topologyLayerFilters[k] = !!enableAll;
    const chk = document.getElementById(`topoLayer-${k}`);
    if (chk) chk.checked = !!enableAll;
  });
  updateTopologyLayerCountBadge();
  renderTopology();
}

function updateTopologyLayerCountBadge() {
  const badge = document.getElementById("badgeTopologyLayerCount");
  if (!badge) return;
  const total = Object.keys(topologyLayerFilters).length;
  const active = Object.values(topologyLayerFilters).filter(Boolean).length;
  badge.textContent = active === total ? "All" : `${active}/${total}`;
  if (active < total) {
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
  topologyLayerFilters.cameras = showTopologyFieldDevices;
  topologyLayerFilters.access = showTopologyFieldDevices;
  topologyLayerFilters.wireless = showTopologyFieldDevices;
  const chkCam = document.getElementById("topoLayer-cameras");
  const chkAcc = document.getElementById("topoLayer-access");
  const chkWire = document.getElementById("topoLayer-wireless");
  if (chkCam) chkCam.checked = showTopologyFieldDevices;
  if (chkAcc) chkAcc.checked = showTopologyFieldDevices;
  if (chkWire) chkWire.checked = showTopologyFieldDevices;
  updateTopologyLayerCountBadge();
  updateTopologyFieldDevicesButton();
  renderTopology();
  if (typeof showToast === "function") {
    showToast(showTopologyFieldDevices ? "Showing field devices & drops" : "Hiding field devices (showing backbone infrastructure)");
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
  renderTopologyStudio();
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
  window.addEventListener("mousemove", handleTopologyMouseMove);
  window.addEventListener("mouseup", handleTopologyMouseUp);
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
// Facility & Device Auto-Linking Engine at Scale
// -----------------------------------------------------------
function autoResolveDeviceUplinks() {
  if (typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) return;

  const switches = projectBOM.filter(i => 
    !i.parentInstanceId && 
    (i.role === "Access" || i.role === "Core" || i.role === "Core & Agg" || i.role === "Aggregation")
  );

  if (switches.length === 0) return;

  projectBOM.forEach(item => {
    if (item.parentInstanceId) return;
    const isEdge = item.role === "Camera" || item.role === "Access Control" || 
      (item.category && (item.category.includes("camera") || item.category.includes("access")));
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

  // Filter primary topology infrastructure nodes (exclude internal licenses, accessories, and unassigned staging items)
  const activeNodes = projectBOM.filter(item => {
    if (item.parentInstanceId) return false;
    if (item.role === "Structured Cabling" || item.role === "Optics & DAC") return false;
    if (item.role === "Mgmt License" || item.role === "Security License" || item.role === "Feature License") return false;
    if (item.role === "Accessory") return false;

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
    const itemLoc = item.closetName || item.rackId || "";
    const isFieldDevice = item.role === "Camera" || item.role === "Access Control" || item.role === "Intercom" ||
                          (item.category && (item.category.includes("camera") || item.category.includes("access") || item.category.includes("intercom"))) ||
                          (typeof isFieldLocation === "function" ? isFieldLocation(itemLoc) : (itemLoc.endsWith("• Field") || itemLoc.toLowerCase().includes("field")));
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
    if (!item.uplinkTargetId) return;
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

  // Render Location Clusters
  Object.keys(groups).forEach(loc => {
    const items = groups[loc] || [];
    const isClusterSelected = selectedTopologyRackLoc === loc;
    const isFieldCluster = loc.endsWith("• Field Drops") || loc.toLowerCase().includes("field drop");

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
    const clusterWidthClass = isFieldCluster ? (items.length > 2 ? "w-96" : "w-88") : "w-84";
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
    const subTitleText = isFieldCluster ? 'Physical Floor Drops & Endpoints' : escapeHTML(parsed.enclosure);
    const countBadge = isFieldCluster ? `${items.length} ${items.length === 1 ? 'Drop' : 'Drops'}` : `${items.length} Chassis`;

    clusterEl.innerHTML = `
      <!-- Cluster Header -->
      <div 
        class="flex items-center justify-between pb-2.5 mb-3 border-b ${isFieldCluster ? 'border-cyan-900/50' : 'border-slate-800'} cursor-pointer topo-cluster-header group hover:border-cyan-500/40 transition-colors"
        onclick="selectTopologyRack('${escapeHTML(loc)}', event)"
        title="Click to inspect this container (or drag to reposition)"
      >
        <div class="flex items-center gap-2.5">
          <div class="p-1.5 rounded-lg ${iconBg} ${iconColor} transition-all">
            <i data-lucide="${headerIcon}" class="w-4 h-4"></i>
          </div>
          <div>
            <span class="text-xs font-bold ${titleColor} tracking-wide block leading-none">${escapeHTML(parsed.space)}</span>
            <span class="text-[10px] font-mono ${isFieldCluster ? 'text-cyan-400/90' : 'text-indigo-400/90'} block mt-1 leading-none">${subTitleText}</span>
          </div>
        </div>
        <div class="flex items-center gap-1.5">
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

                <!-- Power Telemetry -->
                <div class="flex items-center justify-between pt-1 border-t border-slate-900 text-[10px] font-mono text-slate-400">
                  <div class="flex items-center gap-1">
                    <i data-lucide="zap" class="w-3 h-3 text-amber-400 shrink-0"></i>
                    <span>${powerSourceLabel}</span>
                  </div>
                  <span class="text-slate-300">${item.baseWatts || 300}W Base</span>
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
                    Field Drop
                  </span>
                </div>
                ${hostSw ? `
                  <div class="flex items-center justify-between pt-1 border-t border-slate-900 text-[10px] font-mono">
                    <span class="text-slate-400">Home-Run:</span>
                    <span class="text-cyan-300 font-semibold truncate max-w-[180px]" title="Terminates at ${escapeHTML(hostCloset || '')} &bull; ${escapeHTML(hostSw.friendlyName || hostSw.model)}">
                      <span class="text-sky-400">${escapeHTML(hostClosetShort)}</span>: ${escapeHTML(hostSw.friendlyName || hostSw.model)}
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
          const isStacked = (item.stackedUnits && item.stackedUnits >= 2) || 
            (item.stackedUnits !== 0 && item.qty >= 2 && (item.canStack || item.role === "Access" || item.role === "Aggregation"));
          const stackUnits = isStacked ? (item.stackedUnits || item.qty) : 1;
          const basePortsPerUnit = item.ports || 24;
          const totalStackPorts = basePortsPerUnit * stackUnits;
          const totalStackPoE = (item.poeBudget || 0) * stackUnits;
          const totalStackBaseWatts = (item.baseWatts || 0) * stackUnits;

          return `
            <div 
              class="topo-node-card text-xs space-y-2 p-3 rounded-xl border ${isSelected ? 'border-brand-500 ring-2 ring-brand-500/40 bg-slate-850' : (isStacked ? 'border-indigo-500/50 bg-slate-950/90 hover:border-indigo-400' : 'border-slate-800 bg-slate-950/80 hover:border-slate-700')} transition-all cursor-pointer shadow-md ${isStacked ? 'shadow-indigo-950/30' : ''}" 
              id="topo-card-${item.instanceId}"
              onclick="selectTopologyNode('${item.instanceId}', event)"
            >
              <div class="flex items-start justify-between gap-1.5">
                <div class="min-w-0">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    ${item.deviceNumber ? `<span class="px-1.5 py-0.2 rounded bg-brand-900/60 border border-brand-500/40 text-[9px] font-mono font-bold text-brand-300">${escapeHTML(item.deviceNumber)}</span>` : ''}
                    <span class="font-bold text-white truncate block text-xs" title="${escapeHTML(item.friendlyName || item.model)}">${escapeHTML(item.friendlyName || item.model)}</span>
                    <button type="button" onclick="event.stopPropagation(); promptEditDeviceFriendlyName('${item.instanceId}')" class="text-slate-400 hover:text-white p-0.5 rounded hover:bg-slate-800 transition-colors" title="Edit Friendly Name">
                      <i data-lucide="pencil" class="w-2.5 h-2.5"></i>
                    </button>
                  </div>
                  ${item.friendlyName && item.friendlyName !== item.model ? `<span class="text-[10px] text-slate-300 font-medium block truncate">${escapeHTML(item.model)}</span>` : ''}
                  <span class="text-[10px] text-slate-400 font-mono block">
                    ${escapeHTML(item.vendor || 'Generic')} &bull; ${isStacked ? `<span class="text-indigo-300 font-semibold">${stackUnits}x Member Virtual Chassis &bull; ${item.rackUnits * stackUnits}U</span>` : `SKU: ${escapeHTML(item.sku || 'N/A')}`}
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
                <div class="flex items-center gap-1 text-slate-400">
                  <i data-lucide="zap" class="w-3 h-3 text-amber-400 shrink-0"></i>
                  <span class="truncate">${powerSourceLabel}${isStacked ? ` (${stackUnits}x PSUs &bull; ${totalStackBaseWatts}W)` : ''}</span>
                </div>
                <div class="flex items-center justify-end gap-1 text-slate-400">
                  <i data-lucide="layers" class="w-3 h-3 text-sky-400 shrink-0"></i>
                  <span>${totalStackPorts} Ports ${isStacked ? `(${stackUnits}x ${basePortsPerUnit}P)` : ''}</span>
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
        topologyLinks.push({
          id: `link-field-${host.instanceId}-${dev.instanceId}`,
          fromId: host.instanceId,
          toId: dev.instanceId,
          multiplier: 1,
          isLAG: false,
          speedLabel: isPoE ? `Cat6 PoE Drop (${watts}W)` : "Cat6 Drop",
          rawSpeed: "1G",
          category: "field_drop",
          isFieldDrop: true,
          isPoEDelivery: isPoE
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
    const s = `${n.maxBackboneSpeed || ''} ${n.portSpeed || ''} ${n.uplinksSummary || ''} ${n.interfaces || ''} ${n.portFormFactorSummary || ''}`.toUpperCase();
    const supported = [];
    if (s.includes("100G") || s.includes("QSFP28")) supported.push(100);
    if (s.includes("40G") || s.includes("QSFP+")) supported.push(40);
    if (s.includes("25G") || s.includes("SFP28")) supported.push(25);
    if (s.includes("10G") || s.includes("SFP+")) supported.push(10);
    if (s.includes("2.5G") || s.includes("MGIG") || s.includes("2.5GBE")) supported.push(2.5);
    supported.push(1); // Standard 1G baseline
    return supported;
  };

  const speedsA = getSpeeds(nodeA);
  const speedsB = getSpeeds(nodeB);

  const mutual = speedsA.filter(sp => speedsB.includes(sp)).sort((a, b) => b - a);
  const top = mutual[0] || 10;

  if (top === 100) return "100G";
  if (top === 40) return "40G";
  if (top === 25) return "25G";
  if (top === 10) return "10G";
  if (top === 2.5) return "2.5G";
  return "1G";
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

    if (!topologyLinks || topologyLinks.length === 0) {
      if (!silent && typeof showToast === "function") showToast("No inter-switch or core topology links found to synthesize.");
      return;
    }

    let synthesizedDACCables = 0;
    let synthesizedPatchCords = 0;
    let synthesizedTransceivers = 0;
    let synthesizedFiberPatchCords = 0;
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

    topologyLinks.forEach((link, idx) => {
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
      const preferredVendor = (vendorA === vendorB) ? vendorA : vendorA;

      // Determine target medium:
      // 1. Explicit override on link (dac | patch | mmf | smf)
      // 2. Otherwise: if same rack -> dac, if between racks -> project fiber type default
      let chosenMedium = "dac";
      if (override.medium && override.medium !== "auto") {
        chosenMedium = override.medium; // "dac", "patch", "mmf", or "smf"
      } else {
        chosenMedium = isSameRack ? "dac" : getProjectFiberType(); // "dac", "mmf", or "smf"
      }

      if (chosenMedium === "dac") {
        // ----------------------------------------------------
        // CASE 1: Intra-Rack Link or Override -> Direct Attach Copper (DAC)
        // Length dynamically calculated from U separation (or explicit override)
        // ----------------------------------------------------
        const dacLength = (override.dacLength && override.dacLength !== "auto")
          ? override.dacLength
          : getDacLengthForUDiff(uDiff);

        let dacItem = findDacItem(speed, preferredVendor, dacLength);
        if (!dacItem && typeof OPTICS_CATALOG !== "undefined" && OPTICS_CATALOG[preferredVendor]?.[speed]?.dac) {
          dacItem = OPTICS_CATALOG[preferredVendor][speed].dac;
        }

        const baseSku = dacItem?.sku || `${speed}-SFP-DAC-1M`;
        const baseName = dacItem?.name || `${preferredVendor} ${speed} SFP+ Direct Attach Copper Cable (1m)`;
        const baseMsrp = dacItem?.msrp || (speed === "25G" ? 55 : (speed === "100G" ? 120 : 35));

        const formattedDac = formatDacItem(baseSku, baseName, baseMsrp, dacLength, speed, preferredVendor);

        newInterconnectItems.push({
          instanceId: `dac-${link.id}-${idx}-${Date.now()}`,
          id: formattedDac.sku,
          model: `${formattedDac.name} (${nodeA.model} <-> ${nodeB.model}${isSameRack ? ` • ${uDiff}U Separation` : ''})`,
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
        synthesizedDACCables += multiplier;

      } else if (chosenMedium === "patch" || chosenMedium === "cat6a") {
        // ----------------------------------------------------
        // CASE 2: Intra-Rack RJ45 Copper Patch Cord (Cat6A)
        // Length dynamically calculated from U separation (or explicit override)
        // ----------------------------------------------------
        const cordSpec = (override.patchLength && override.patchLength !== "auto")
          ? { lengthFt: parseFloat(override.patchLength), lengthMeters: parseFloat(override.patchLength) * 0.3048, label: `${override.patchLength} ft` }
          : getPatchCordLengthForUDiff(uDiff);

        const matchedCord = findPatchCordItem(cordSpec.lengthFt, preferredVendor);
        const cordSku = matchedCord.sku;
        const cordName = matchedCord.name;
        const cordMsrp = matchedCord.msrp;

        newInterconnectItems.push({
          instanceId: `patch-${link.id}-${idx}-${Date.now()}`,
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
        synthesizedPatchCords += multiplier;

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
        let transA = (typeof OPTICS_CATALOG !== "undefined" && OPTICS_CATALOG[vendorA]?.[speed]?.[isSMF ? 'smf' : 'mmf']) || null;
        if (!transA && typeof OPTICS_LIST !== "undefined") {
          transA = OPTICS_LIST.find(o => o.medium === (isSMF ? 'smf' : 'mmf') && o.speed === speed && o.vendor === vendorA) ||
                   OPTICS_LIST.find(o => o.medium === (isSMF ? 'smf' : 'mmf') && o.speed === speed);
        }
        const transASku = transA?.sku || `${vendorA}-${speed}-${isSMF ? 'SMF-LR' : 'MMF-SR'}`;
        const transAName = transA?.name || `${vendorA} ${speed} ${isSMF ? 'Single-Mode SFP+ Transceiver (LR, 10km)' : 'Multi-Mode SFP+ Transceiver (SR, 300m)'}`;
        const transAMsrp = transA?.msrp || (speed === "25G" ? (isSMF ? 450 : 220) : (speed === "100G" ? (isSMF ? 850 : 450) : (isSMF ? 180 : 95)));

        newInterconnectItems.push({
          instanceId: `transA-${link.id}-${idx}-${Date.now()}`,
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
        synthesizedTransceivers += multiplier;

        // Transceiver for End B
        let transB = (typeof OPTICS_CATALOG !== "undefined" && OPTICS_CATALOG[vendorB]?.[speed]?.[isSMF ? 'smf' : 'mmf']) || null;
        if (!transB && typeof OPTICS_LIST !== "undefined") {
          transB = OPTICS_LIST.find(o => o.medium === (isSMF ? 'smf' : 'mmf') && o.speed === speed && o.vendor === vendorB) ||
                   OPTICS_LIST.find(o => o.medium === (isSMF ? 'smf' : 'mmf') && o.speed === speed);
        }
        const transBSku = transB?.sku || `${vendorB}-${speed}-${isSMF ? 'SMF-LR' : 'MMF-SR'}`;
        const transBName = transB?.name || `${vendorB} ${speed} ${isSMF ? 'Single-Mode SFP+ Transceiver (LR, 10km)' : 'Multi-Mode SFP+ Transceiver (SR, 300m)'}`;
        const transBMsrp = transB?.msrp || (speed === "25G" ? (isSMF ? 450 : 220) : (speed === "100G" ? (isSMF ? 850 : 450) : (isSMF ? 180 : 95)));

        newInterconnectItems.push({
          instanceId: `transB-${link.id}-${idx}-${Date.now()}`,
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
        synthesizedTransceivers += multiplier;

        // Duplex Fiber Patch Cords (1 for Side A, 1 for Side B)
        const patchSku = isSMF ? "FIBER-LC-OS2-2M" : "FIBER-LC-OM4-2M";
        const patchName = isSMF ? "Corning OS2 Single-Mode Duplex LC-LC Fiber Patch Cord (2m)" : "Corning OM4 Duplex LC-LC Fiber Patch Cord (2m)";
        const patchMsrp = isSMF ? 28 : 22;

        newInterconnectItems.push({
          instanceId: `fiberpatchA-${link.id}-${idx}-${Date.now()}`,
          id: patchSku,
          model: `${patchName} (${locA} Patch Panel)`,
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
          id: patchSku,
          model: `${patchName} (${locB} Patch Panel)`,
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
        synthesizedFiberPatchCords += (multiplier * 2);
      }
    });

    // In-place update to projectBOM: remove previously auto-synthesized interconnects
    for (let i = projectBOM.length - 1; i >= 0; i--) {
      if (projectBOM[i].source === "topology_auto_sync") {
        projectBOM.splice(i, 1);
      }
    }

    projectBOM.push(...newInterconnectItems);

    if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
      FacilityStore.notifyWorkspaceChange();
    }
    if (typeof renderBOM === "function") renderBOM();
    if (typeof updateBOMBadge === "function") updateBOMBadge();
    if (typeof StorageService !== "undefined" && typeof StorageService.queueAutoSave === "function") {
      StorageService.queueAutoSave();
    }

    const totalAdded = synthesizedDACCables + synthesizedPatchCords + synthesizedTransceivers + synthesizedFiberPatchCords;
    if (!silent && typeof showToast === "function") {
      const parts = [];
      if (synthesizedDACCables > 0) parts.push(`${synthesizedDACCables} DACs`);
      if (synthesizedPatchCords > 0) parts.push(`${synthesizedPatchCords} Patch Cords`);
      if (synthesizedTransceivers > 0) parts.push(`${synthesizedTransceivers} Transceivers`);
      if (synthesizedFiberPatchCords > 0) parts.push(`${synthesizedFiberPatchCords} Fiber Patches`);
      showToast(`Synthesized ${totalAdded} interconnect items (${parts.join(", ")}) into Quote BOM!`);
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

// -----------------------------------------------------------
// Slide-Out Topology Inspector
// -----------------------------------------------------------
function selectTopologyRack(loc, e) {
  if (e) e.stopPropagation();
  selectedTopologyRackLoc = loc;
  selectedTopologyNodeId = null;
  selectedTopologyLinkId = null;
  toggleTopologyInspector(true);
  renderTopology();
  renderTopologyInspector();
}

function selectTopologyNode(instanceId, e) {
  if (e) e.stopPropagation();
  selectedTopologyNodeId = instanceId;
  selectedTopologyRackLoc = null;
  selectedTopologyLinkId = null;
  toggleTopologyInspector(true);
  renderTopology();
  renderTopologyInspector();
}

function selectTopologyLink(linkId, e) {
  if (e) {
    if (typeof e.stopPropagation === "function") e.stopPropagation();
    if (typeof e.preventDefault === "function") e.preventDefault();
  }
  selectedTopologyLinkId = linkId;
  selectedTopologyNodeId = null;
  selectedTopologyRackLoc = null;
  toggleTopologyInspector(true);
  renderTopologyLinks();
  renderTopologyInspector();
}

function deselectTopologyNode() {
  selectedTopologyNodeId = null;
  selectedTopologyRackLoc = null;
  selectedTopologyLinkId = null;
  renderTopology();
  renderTopologyInspector();
}

function renderTopologyLocationOptions(currentLoc) {
  if (typeof FacilityStore === "undefined") return "";
  const groups = FacilityStore.getLocationGroups(false);
  const normalizedCurrent = FacilityStore.normalize(currentLoc);
  let html = "";

  if (groups.spaces.length > 0) {
    html += `<optgroup label="Spaces & Zones (Field / Unenclosed)">`;
    groups.spaces.forEach(s => {
      const isSel = normalizedCurrent === s.name;
      html += `<option value="${escapeHTML(s.name)}" ${isSel ? 'selected' : ''}>${escapeHTML(s.displayName || s.name)}</option>`;
    });
    html += `</optgroup>`;
  }

  if (groups.enclosures.length > 0) {
    html += `<optgroup label="Racks & Enclosures">`;
    groups.enclosures.forEach(e => {
      const isSel = normalizedCurrent === e.name;
      html += `<option value="${escapeHTML(e.name)}" ${isSel ? 'selected' : ''}>${escapeHTML(e.displayName || e.name)}</option>`;
    });
    html += `</optgroup>`;
  }

  return html;
}

function renderTopologyInspector() {
  const container = document.getElementById("topologyInspectorContent");
  const selectedNodeEl = document.getElementById("topoInspectorSelectedNode");
  const linkSpeedEl = document.getElementById("topoInspectorLinkSpeed");
  const powerSourceEl = document.getElementById("topoInspectorPowerSource");

  if (!container) return;

  if (selectedTopologyRackLoc) {
    const loc = selectedTopologyRackLoc;
    const isFieldCluster = loc.endsWith("• Field Drops") || loc.toLowerCase().includes("field drop");
    const parsed = FacilityStore.parse(loc);

    let itemsInRack;
    if (isFieldCluster) {
      const floorNameLower = parsed.space.toLowerCase();
      itemsInRack = projectBOM.filter(item => {
        if (item.parentInstanceId) return false;
        if (typeof FacilityStore !== "undefined" && typeof FacilityStore.isFieldDevice === "function" && !FacilityStore.isFieldDevice(item)) return false;
        const fl = (typeof FacilityStore !== "undefined" && typeof FacilityStore.getDevicePhysicalFloor === "function") 
          ? FacilityStore.getDevicePhysicalFloor(item).toLowerCase() 
          : "main floor";
        return fl === floorNameLower;
      });
    } else {
      itemsInRack = projectBOM.filter(item => {
        if (item.parentInstanceId) return false;
        const itemLoc = FacilityStore.normalize(item.closetName || item.rackId);
        return itemLoc === loc;
      });

      // Align Mounted Chassis order with Enclosure Visualizer (top U down to bottom U1)
      itemsInRack.sort((a, b) => {
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

    if (isFieldCluster) {
      const floorName = parsed.space;
      let totalPoEWatts = 0;
      let cams = 0;
      let doors = 0;
      let intercoms = 0;
      const servingMap = {};

      itemsInRack.forEach(item => {
        const qty = parseInt(item.qty, 10) || 1;
        const w = (parseFloat(item.consumedPoEWatts || item.powerConsumptionWatts || item.baseWatts || 0)) * qty;
        totalPoEWatts += w;
        if (item.role === "Camera" || (item.category && item.category.includes("camera"))) cams += qty;
        else if (item.role === "Access Control" || (item.category && item.category.includes("access"))) doors += qty;
        else if (item.role === "Intercom" || (item.category && item.category.includes("intercom"))) intercoms += qty;

        let hostName = "Unassigned";
        if (item.uplinkTargetId) {
          const sw = projectBOM.find(s => s.instanceId === item.uplinkTargetId);
          if (sw) {
            const closet = sw.closetName ? sw.closetName.split('•')[0].trim() : "IDF/MDF";
            hostName = `${closet} (${sw.friendlyName || sw.model})`;
          }
        }
        servingMap[hostName] = (servingMap[hostName] || 0) + qty;
      });

      if (selectedNodeEl) selectedNodeEl.innerText = `${floorName} • Field Drops`;
      if (linkSpeedEl) linkSpeedEl.innerText = `${itemsInRack.length} Field Drops`;
      if (powerSourceEl) powerSourceEl.innerText = `${Math.round(totalPoEWatts)}W PoE Ingest`;

      container.innerHTML = `
        <!-- Floor Field Drops Header Card -->
        <div class="space-y-3 pb-3 border-b border-cyan-900/40">
          <div class="flex items-start justify-between">
            <div>
              <span class="text-xs font-bold text-white block">${escapeHTML(floorName)}</span>
              <span class="text-[11px] font-mono text-cyan-300">Physical Floor Field Endpoints</span>
            </div>
            <span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-cyan-500/40 bg-cyan-500/10 text-cyan-300">
              ${itemsInRack.length} Drops
            </span>
          </div>

          <!-- Action Buttons -->
          <div class="grid grid-cols-2 gap-2 pt-1">
            <button 
              onclick="if (typeof openCableLayoutModal === 'function') { toggleTopologyModal(); openCableLayoutModal(); }"
              class="px-2.5 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/50 hover:border-cyan-400 text-cyan-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm group"
              title="Open Floor in Physical Layout Tool"
            >
              <i data-lucide="map" class="w-3.5 h-3.5 group-hover:scale-110 transition-transform"></i>
              <span>Physical Layout</span>
            </button>
            <button 
              onclick="panClusterIntoView('${escapeHTML(loc)}')"
              class="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm"
              title="Center this floor container on the topology canvas"
            >
              <i data-lucide="focus" class="w-3.5 h-3.5"></i>
              <span>Center View</span>
            </button>
          </div>
        </div>

        <!-- Telemetry Breakdown -->
        <div class="space-y-2 pb-3 border-b border-slate-800">
          <span class="text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
            <i data-lucide="zap" class="w-3.5 h-3.5"></i> PoE Load & Device Mix
          </span>
          <div class="space-y-1.5 text-xs bg-slate-950 p-2.5 rounded-xl border border-slate-850 font-mono">
            <div class="flex justify-between text-slate-400">
              <span>Total Field Drops:</span>
              <span class="text-white font-bold">${itemsInRack.length} Devices</span>
            </div>
            <div class="flex justify-between text-slate-400">
              <span>PoE Power Delivered:</span>
              <span class="text-cyan-400 font-bold">${Math.round(totalPoEWatts)} W</span>
            </div>
            <div class="grid grid-cols-3 gap-1 pt-1.5 border-t border-slate-900 text-center">
              <div class="bg-slate-900/60 p-1 rounded">
                <span class="text-[9px] text-slate-500 block">Cameras</span>
                <span class="font-bold text-teal-400">${cams}</span>
              </div>
              <div class="bg-slate-900/60 p-1 rounded">
                <span class="text-[9px] text-slate-500 block">Doors</span>
                <span class="font-bold text-cyan-400">${doors}</span>
              </div>
              <div class="bg-slate-900/60 p-1 rounded">
                <span class="text-[9px] text-slate-500 block">Other</span>
                <span class="font-bold text-slate-300">${intercoms + Math.max(0, itemsInRack.length - cams - doors - intercoms)}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Home-Run Serving Switches Breakdown -->
        <div class="space-y-2 pb-3 border-b border-slate-800">
          <span class="text-[10px] font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
            <i data-lucide="network" class="w-3.5 h-3.5"></i> Home-Run Terminating Switches
          </span>
          <div class="space-y-1 text-xs">
            ${Object.keys(servingMap).length === 0 ? `
              <div class="text-[11px] text-slate-500 py-1.5 text-center font-mono">Direct local drops</div>
            ` : Object.entries(servingMap).map(([targetName, count]) => `
              <div class="bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-850 flex items-center justify-between text-[11px] font-mono">
                <span class="text-slate-300 truncate max-w-[200px]" title="${escapeHTML(targetName)}">${escapeHTML(targetName)}</span>
                <span class="text-cyan-300 font-bold shrink-0">${count} ${count === 1 ? 'drop' : 'drops'}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Field Endpoints in this Zone -->
        <div class="space-y-2 pb-3">
          <span class="text-[10px] font-bold uppercase tracking-wider text-cyan-300 flex items-center justify-between">
            <span>Devices in Floor Zone (${itemsInRack.length})</span>
            <span class="text-[9px] font-mono text-slate-500">Click to Trace Cable</span>
          </span>
          <div class="space-y-1.5 max-h-60 overflow-y-auto pr-1">
            ${itemsInRack.map(item => `
              <div 
                onclick="selectTopologyNode('${item.instanceId}', event)"
                class="bg-slate-950 p-2 rounded-lg border border-slate-850 hover:border-cyan-500/60 hover:bg-slate-900 cursor-pointer flex items-center justify-between text-xs transition-colors group"
              >
                <div class="truncate max-w-[190px]">
                  <div class="flex items-center gap-1.5">
                    ${item.deviceNumber ? `<span class="px-1 py-0.2 rounded bg-cyan-900/60 border border-cyan-500/40 text-[9px] font-mono font-bold text-cyan-300">${escapeHTML(item.deviceNumber)}</span>` : ''}
                    <span class="text-white font-medium truncate block">${escapeHTML(item.friendlyName || item.model)}</span>
                  </div>
                  <span class="text-[10px] text-slate-400 font-mono block">${escapeHTML(item.role || 'Drop')} &bull; ${item.consumedPoEWatts || 15}W</span>
                </div>
                <i data-lucide="chevron-right" class="w-3.5 h-3.5 text-slate-600 group-hover:text-cyan-400 transition-colors"></i>
              </div>
            `).join('')}
          </div>
        </div>
      `;
      if (typeof safeCreateIcons === "function") safeCreateIcons(container);
      else if (window.lucide) lucide.createIcons();
      return;
    }

    let occupiedRU = 0;
    let totalWatts = 0;
    let totalPoEBudget = 0;
    let totalPoEConsumed = 0;

    itemsInRack.forEach(item => {
      const qty = parseInt(item.qty, 10) || 1;
      const ru = parseInt(item.rackUnits || item.ruHeight || (item.role === "Server" ? 2 : 1), 10) || 0;
      occupiedRU += ru * qty;

      const baseW = (parseFloat(item.baseWatts || item.powerConsumptionWatts || item.maxPowerWatts || 0)) * qty;
      totalWatts += baseW;

      if (item.poeBudget) {
        totalPoEBudget += (parseFloat(item.poeBudget) || 0) * qty;
      }
      if (item.consumedPoEWatts) {
        totalPoEConsumed += (parseFloat(item.consumedPoEWatts) || 0);
      }
    });

    const totalHeightU = parsed.heightU || (parsed.isDin ? 0 : 24);
    const ruPercent = totalHeightU > 0 ? Math.min(100, Math.round((occupiedRU / totalHeightU) * 100)) : 0;
    const btuPerHour = Math.round(totalWatts * 3.412142);

    const switchIds = itemsInRack.map(i => i.instanceId);
    const servedClients = projectBOM.filter(i => switchIds.includes(i.uplinkTargetId) && !itemsInRack.includes(i));
    const cameraCount = servedClients.filter(c => c.role === "Camera" || (c.category && c.category.includes("camera"))).reduce((sum, c) => sum + (parseInt(c.qty, 10) || 1), 0);
    const doorCount = servedClients.filter(d => d.role === "Access Control" || (d.category && d.category.includes("access"))).reduce((sum, d) => sum + (parseInt(d.qty, 10) || 1), 0);

    if (selectedNodeEl) selectedNodeEl.innerText = `${parsed.space} • ${parsed.enclosure}`;
    if (linkSpeedEl) linkSpeedEl.innerText = `${itemsInRack.length} Mounted Chassis`;
    if (powerSourceEl) powerSourceEl.innerText = `${Math.round(totalWatts)}W Total Load`;

    container.innerHTML = `
      <!-- Enclosure Header Card -->
      <div class="space-y-3 pb-3 border-b border-slate-800">
        <div class="flex items-start justify-between">
          <div>
            <span class="text-xs font-bold text-white block">${escapeHTML(parsed.space)}</span>
            <span class="text-[11px] font-mono text-indigo-300">${escapeHTML(parsed.enclosure)}</span>
          </div>
          <span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-indigo-500/40 bg-indigo-500/10 text-indigo-300">
            ${parsed.isDin ? 'NEMA / DIN Enclosure' : `${totalHeightU}U Rack Cabinet`}
          </span>
        </div>

        <!-- Action Buttons -->
        <div class="grid grid-cols-2 gap-2 pt-1">
          <button 
            onclick="openRackViewerFor('${escapeHTML(loc)}')"
            class="px-2.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/50 hover:border-indigo-400 text-indigo-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm group"
            title="Open this rack directly in the 2D Rack Elevation Tool"
          >
            <i data-lucide="server" class="w-3.5 h-3.5 group-hover:scale-110 transition-transform"></i>
            <span>Open Elevation</span>
          </button>
          <button 
            onclick="panClusterIntoView('${escapeHTML(loc)}')"
            class="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm"
            title="Center this enclosure cluster on the topology canvas"
          >
            <i data-lucide="focus" class="w-3.5 h-3.5"></i>
            <span>Center View</span>
          </button>
        </div>
      </div>

      <!-- Rack Space Occupancy (RU) -->
      ${!parsed.isDin && totalHeightU > 0 ? `
        <div class="space-y-2 pb-3 border-b border-slate-800">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
              <i data-lucide="layers" class="w-3.5 h-3.5"></i> Vertical Rack Space (RU)
            </span>
            <span class="font-mono text-[10px] text-white font-bold">
              ${occupiedRU}U / ${totalHeightU}U (${ruPercent}%)
            </span>
          </div>
          <div class="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800 p-0.5">
            <div 
              class="h-full rounded-full transition-all ${ruPercent > 90 ? 'bg-rose-500' : ruPercent > 70 ? 'bg-amber-400' : 'bg-sky-400'}" 
              style="width: ${ruPercent}%"
            ></div>
          </div>
          <div class="flex justify-between text-[9px] font-mono text-slate-400">
            <span>Available Space: <strong>${Math.max(0, totalHeightU - occupiedRU)}U Free</strong></span>
            <span>Standard 19" Mounting</span>
          </div>
        </div>
      ` : ''}

      <!-- Power & Thermal Telemetry -->
      <div class="space-y-2 pb-3 border-b border-slate-800">
        <span class="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
          <i data-lucide="zap" class="w-3.5 h-3.5"></i> Electrical & Thermal Load
        </span>
        <div class="space-y-1.5 text-xs bg-slate-950 p-2.5 rounded-xl border border-slate-850 font-mono">
          <div class="flex justify-between text-slate-400">
            <span>Enclosure Power Draw:</span>
            <span class="text-white font-bold">${Math.round(totalWatts)} W</span>
          </div>
          <div class="flex justify-between text-slate-400">
            <span>Heat Dissipation:</span>
            <span class="text-orange-400 font-bold">${btuPerHour.toLocaleString()} BTU/hr</span>
          </div>
          ${totalPoEBudget > 0 ? `
            <div class="flex justify-between text-slate-400 pt-1 border-t border-slate-900">
              <span>PoE Sourcing Budget:</span>
              <span class="text-amber-400 font-bold">${Math.round(totalPoEBudget)} W</span>
            </div>
            <div class="flex justify-between text-slate-400">
              <span>Delivered PoE Flow:</span>
              <span class="${totalPoEConsumed > totalPoEBudget ? 'text-rose-400 font-bold' : 'text-emerald-400'}">
                ${Math.round(totalPoEConsumed)} W (${Math.round((totalPoEConsumed / (totalPoEBudget || 1)) * 100)}%)
              </span>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- Installed Hardware Inventory List -->
      <div class="space-y-2 pb-3 border-b border-slate-800">
        <span class="text-[10px] font-bold uppercase tracking-wider text-indigo-300 flex items-center justify-between">
          <span>Mounted Chassis (${itemsInRack.length})</span>
          <span class="text-[9px] font-mono text-slate-500">Click to Inspect Chassis</span>
        </span>
        <div class="space-y-1.5 max-h-52 overflow-y-auto pr-1">
          ${itemsInRack.length === 0 ? `
            <div class="text-[11px] text-slate-500 py-3 text-center bg-slate-950 rounded-xl border border-slate-850">
              No equipment mounted in this rack yet.
            </div>
          ` : itemsInRack.map(item => `
            <div 
              onclick="selectTopologyNode('${item.instanceId}', event)"
              class="bg-slate-950 p-2 rounded-lg border border-slate-850 hover:border-indigo-500/60 hover:bg-slate-900 cursor-pointer flex items-center justify-between text-xs transition-colors group"
            >
              <div class="truncate max-w-[180px]">
                <div class="flex items-center gap-1.5">
                  ${item.rackSlot ? `<span class="px-1.5 py-0.2 rounded bg-indigo-950/80 border border-indigo-700/60 text-[9px] font-mono font-bold text-indigo-300">U${item.rackSlot}</span>` : ''}
                  <span class="text-white block font-medium truncate group-hover:text-indigo-200">${escapeHTML(item.model)}</span>
                </div>
                <span class="text-[10px] text-slate-400 font-mono">${escapeHTML(item.vendor || 'Generic')} &bull; ${item.rackUnits || 1}U &bull; ${escapeHTML(item.role)}</span>
              </div>
              <div class="flex items-center gap-1.5 shrink-0">
                <div class="text-right">
                  <span class="font-mono text-[10px] text-indigo-300 font-bold block">
                    ${item.ports ? `${item.ports}P` : (item.role === 'Server' ? 'SRV' : 'DEV')}
                  </span>
                  <span class="font-mono text-[9px] text-slate-500">
                    ${item.baseWatts || item.powerConsumptionWatts || 0}W
                  </span>
                </div>
                <button 
                  type="button" 
                  onclick="event.stopPropagation(); deleteDeviceFromBOM('${item.instanceId}')"
                  class="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-opacity"
                  title="Delete from Quote BOM"
                >
                  <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Served Downstream Edge Clients -->
      ${servedClients.length > 0 ? `
        <div class="space-y-2">
          <span class="text-[10px] font-bold uppercase tracking-wider text-teal-400 flex items-center justify-between">
            <span>Downstream Field Endpoints</span>
            <span class="font-mono text-[9px] text-slate-400">${servedClients.length} Total</span>
          </span>
          <div class="grid grid-cols-2 gap-2 text-xs font-mono">
            <div class="bg-slate-950 p-2 rounded-lg border border-slate-850 text-center">
              <span class="text-teal-400 font-bold block text-sm">${cameraCount}</span>
              <span class="text-[10px] text-slate-400">Cameras</span>
            </div>
            <div class="bg-slate-950 p-2 rounded-lg border border-slate-850 text-center">
              <span class="text-emerald-400 font-bold block text-sm">${doorCount}</span>
              <span class="text-[10px] text-slate-400">Access Doors</span>
            </div>
          </div>
        </div>
      ` : ''}
    `;

    if (typeof safeCreateIcons === "function") {
      safeCreateIcons(container);
    } else if (window.lucide) {
      lucide.createIcons();
    }
    return;
  } else if (selectedTopologyNodeId) {
    const item = projectBOM.find(i => i.instanceId === selectedTopologyNodeId);
    if (!item) {
      deselectTopologyNode();
      return;
    }

    if (selectedNodeEl) selectedNodeEl.innerText = item.model;
    if (powerSourceEl) powerSourceEl.innerText = getPowerSourceLabel(item);

    // Find upstream link
    const upstreamLink = topologyLinks.find(l => l.toId === item.instanceId);
    if (linkSpeedEl) linkSpeedEl.innerText = upstreamLink ? upstreamLink.speedLabel : (item.role === "Server" ? "Server Ingest" : "Host Core");

    // Candidate uplink targets (Core, Agg, Peer Access switches, Wireless Radios, Gateways and Firewalls)
    const candidateTargets = projectBOM.filter(n => {
      if (n.instanceId === item.instanceId || n.parentInstanceId) return false;
      return n.role === "Core" || n.role === "Core & Agg" || n.role === "Aggregation" || 
             n.role === "Gateways & WAN" || n.role === "Security WAN" || n.role === "Firewall" || n.category === "firewall" ||
             n.role === "Access" || n.role === "Wireless Bridge" || n.category === "wireless";
    });

    // Candidate servers in quote
    const candidateServers = projectBOM.filter(n => !n.parentInstanceId && (n.role === "Server" || n.role === "VMS Server" || n.role === "Compute & Storage"));

    // Connected downstream devices
    const children = projectBOM.filter(ch => ch.uplinkTargetId === item.instanceId && !ch.parentInstanceId);

    // If selected node is a SERVER
    if (item.role === "Server" || item.role === "VMS Server" || item.role === "Compute & Storage") {
      // Find all cameras assigned to this server
      const assignedCameras = projectBOM.filter(c => {
        if (c.parentInstanceId) return false;
        if (c.role !== "Camera" && !(c.category && c.category.includes("camera"))) return false;
        if (c.assignedRecordingServerId === item.instanceId) return true;
        if (!c.assignedRecordingServerId && c.uplinkTargetId) {
          const sw = projectBOM.find(s => s.instanceId === c.uplinkTargetId);
          if (sw && sw.assignedVmsServerId === item.instanceId) return true;
        }
        const firstServer = candidateServers[0];
        return (!c.assignedRecordingServerId && firstServer && firstServer.instanceId === item.instanceId);
      });

      // Find all access doors assigned to this server
      const assignedDoors = projectBOM.filter(d => {
        if (d.parentInstanceId) return false;
        if (d.role !== "Access Control" && !(d.category && d.category.includes("access"))) return false;
        if (d.assignedAccessServerId === item.instanceId) return true;
        if (!d.assignedAccessServerId && c.uplinkTargetId) {
          const sw = projectBOM.find(s => s.instanceId === d.uplinkTargetId);
          if (sw && sw.assignedAccessServerId === item.instanceId) return true;
        }
        const firstServer = candidateServers[0];
        return (!d.assignedAccessServerId && firstServer && firstServer.instanceId === item.instanceId);
      });

      let totalIngestMbps = 0;
      let totalCameraCount = 0;
      assignedCameras.forEach(c => {
        const qty = parseInt(c.qty, 10) || 1;
        totalIngestMbps += (parseFloat(c.streamBitrateMbps) || 4.0) * qty;
        totalCameraCount += qty;
      });

      let totalDoorCount = 0;
      assignedDoors.forEach(d => {
        totalDoorCount += (parseInt(d.qty, 10) || 1) * (parseInt(d.doorCapacity, 10) || 2);
      });

      const maxCap = item.maxIngestBandwidthMbps || 750;
      const ingestPercent = Math.min(100, Math.round((totalIngestMbps / maxCap) * 100));
      const hostedRoles = item.hostedRoles || ["VMS Ingest & Recording"];
      const serverSupportedModes = (typeof PortEngine !== "undefined") ? PortEngine.getSupportedPowerModes(item) : ["internal_psu", "dual_ac"];
      const serverPowerMode = (typeof PortEngine !== "undefined") ? PortEngine.getDevicePowerSource(item) : (item.dualPsu ? "dual_ac" : "internal_psu");

      container.innerHTML = `
        <!-- Server Overview Card -->
        <div class="space-y-2 pb-3 border-b border-slate-800">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5 flex-wrap">
              ${item.deviceNumber ? `<span class="px-1.5 py-0.5 rounded bg-purple-900/60 border border-purple-500/40 text-[9px] font-mono font-bold text-purple-300">${escapeHTML(item.deviceNumber)}</span>` : ''}
              <span class="text-xs font-bold text-white">${escapeHTML(item.friendlyName || item.model)}</span>
              <button type="button" onclick="promptEditDeviceFriendlyName('${item.instanceId}')" class="text-slate-400 hover:text-white p-0.5 rounded hover:bg-slate-800 transition-colors" title="Edit Friendly Name">
                <i data-lucide="pencil" class="w-3 h-3"></i>
              </button>
            </div>
            <span class="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-purple-500/40 bg-purple-500/10 text-purple-300">
              Server / Appliance
            </span>
          </div>
          ${item.friendlyName && item.friendlyName !== item.model ? `<div class="text-[11px] text-slate-300 font-medium">${escapeHTML(item.model)}</div>` : ''}
          <div class="text-[11px] text-slate-400 space-y-1 font-mono">
            <div>Vendor: <strong class="text-slate-200">${escapeHTML(item.vendor || 'Generic')}</strong></div>
            <div class="pt-1 pb-1">
              <label class="text-[10px] text-slate-400 block mb-1 font-sans">Assigned Rack / Enclosure:</label>
              <select onchange="updateDeviceLocation('${item.instanceId}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-indigo-300 font-mono text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-500 cursor-pointer">
                ${renderTopologyLocationOptions(item.closetName || item.rackId)}
              </select>
            </div>
            <!-- 4-Way Omnipresent Cross-Navigation Action Buttons -->
            <div class="pt-1 pb-1.5 flex items-center gap-1.5 flex-wrap">
              <button 
                type="button" 
                onclick="openRackViewerFor('${item.closetName || item.rackId}')"
                class="flex-1 min-w-[105px] px-2 py-1 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-200 border border-indigo-500/40 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
                title="Open Enclosure Visualizer at this rack"
              >
                <i data-lucide="server" class="w-3 h-3 text-indigo-400"></i> Enclosure
              </button>
              <button 
                type="button" 
                onclick="jumpToFacilitySpace('${item.closetName || item.rackId}')"
                class="flex-1 min-w-[105px] px-2 py-1 bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-200 border border-cyan-500/40 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
                title="View Space Hierarchy & Unenclosed Devices"
              >
                <i data-lucide="building-2" class="w-3 h-3 text-cyan-400"></i> Space
              </button>
              <button 
                type="button" 
                onclick="jumpToBomTarget('${item.instanceId}')"
                class="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
                title="Locate item in BOM Drawer"
              >
                <i data-lucide="file-spreadsheet" class="w-3 h-3 text-emerald-400"></i> BOM
              </button>
              <button 
                type="button" 
                onclick="jumpToPhysicalLayoutTarget('${item.instanceId}')"
                class="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
                title="View in Physical Layout Canvas"
              >
                <i data-lucide="map-pin" class="w-3 h-3 text-amber-400"></i> Physical
              </button>
              <button 
                type="button" 
                onclick="deleteDeviceFromBOM('${item.instanceId}')"
                class="px-2 py-1 bg-rose-950/40 hover:bg-rose-900/70 text-rose-300 border border-rose-800/60 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                title="Permanently remove device from Project Quote BOM"
              >
                <i data-lucide="trash-2" class="w-3 h-3 text-rose-400"></i> Delete
              </button>
            </div>
            <div>Interfaces: <strong class="text-white">${item.ports || 2}x ${item.portSpeed || '10G'} High-Speed NICs</strong></div>
            ${item.usableStorageTb ? `<div>Video Storage: <strong class="text-emerald-400">${item.usableStorageTb} TB RAID Array</strong></div>` : ''}
          </div>
        </div>

        <!-- Electrical & Power Supply -->
        <div class="space-y-2 pb-3 border-b border-slate-800">
          <span class="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <i data-lucide="zap" class="w-3.5 h-3.5"></i> Electrical & Power Supply
          </span>
          <div class="space-y-2 bg-slate-950 p-2.5 rounded-xl border border-slate-850 text-xs">
            <div>
              <label class="text-[10px] text-slate-400 block mb-1">Power Architecture:</label>
              <select onchange="setDevicePowerSource('${item.instanceId}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-amber-300 font-mono text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-500">
                ${serverSupportedModes.map(m => {
                  const def = (typeof POWER_SOURCE_MODES !== "undefined" && POWER_SOURCE_MODES[m]) || { label: m };
                  return `<option value="${m}" ${serverPowerMode === m ? 'selected' : ''}>${def.label}</option>`;
                }).join('')}
              </select>
            </div>
            <div class="flex justify-between text-slate-400 text-xs font-mono pt-1">
              <span>Chassis Draw:</span>
              <span class="text-white font-bold">${item.baseWatts || item.powerWatts || 350} W</span>
            </div>
          </div>
        </div>

        <!-- Hosted Software Services & Roles -->
        <div class="space-y-2 pb-3 border-b border-slate-800">
          <span class="text-[10px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
            <i data-lucide="cpu" class="w-3.5 h-3.5"></i> Hosted Software Roles
          </span>
          <div class="space-y-1.5">
            ${[
              { name: "VMS Ingest & Recording", desc: "Real-time camera stream ingestion & archiving" },
              { name: "Access Control Engine", desc: "Cardholder validation & door access engine" },
              { name: "AI Video Analytics", desc: "Object recognition & vehicle LPR processing" },
              { name: "Directory / IAM Authentication", desc: "LDAP / SSO enterprise user sync" }
            ].map(r => {
              const active = hostedRoles.includes(r.name);
              return `
                <div 
                  onclick="toggleServerRole('${item.instanceId}', '${r.name}')" 
                  class="flex items-start gap-2 p-2 rounded-xl border ${active ? 'border-purple-500/50 bg-purple-500/10' : 'border-slate-800 bg-slate-950/60 opacity-60'} cursor-pointer hover:opacity-100 transition-all text-xs"
                >
                  <input type="checkbox" ${active ? 'checked' : ''} class="mt-0.5 rounded border-slate-700 bg-slate-900 text-purple-500 pointer-events-none" />
                  <div class="min-w-0">
                    <span class="font-bold text-white block text-[11px]">${r.name}</span>
                    <span class="text-[10px] text-slate-400 block">${r.desc}</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Video Ingest Telemetry -->
        <div class="space-y-2 pb-3 border-b border-slate-800">
          <span class="text-[10px] font-bold uppercase tracking-wider text-teal-400 flex items-center justify-between">
            <span class="flex items-center gap-1.5"><i data-lucide="video" class="w-3.5 h-3.5"></i> Video Ingest Pipeline</span>
            <span class="font-mono text-[9px] text-slate-400">${totalCameraCount} Streams</span>
          </span>
          <div class="space-y-2 bg-slate-950 p-2.5 rounded-xl border border-slate-850 text-xs font-mono">
            <div class="flex justify-between">
              <span class="text-slate-400">Total Ingest Load:</span>
              <span class="text-teal-300 font-bold">${Math.round(totalIngestMbps)} Mbps / ${maxCap} Mbps</span>
            </div>
            <div class="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
              <div class="h-full rounded-full transition-all ${ingestPercent > 85 ? 'bg-rose-500' : 'bg-teal-400'}" style="width: ${ingestPercent}%"></div>
            </div>
            <div class="flex justify-between text-[10px] text-slate-500">
              <span>Ingress Utilization:</span>
              <span class="${ingestPercent > 85 ? 'text-rose-400 font-bold' : 'text-slate-300'}">${ingestPercent}% Capacity</span>
            </div>
          </div>

          <!-- Ingest Stream Breakdown -->
          <div class="space-y-1 max-h-36 overflow-y-auto pr-1">
            ${assignedCameras.length === 0 ? `
              <div class="text-[11px] text-slate-500 py-2 text-center bg-slate-950 rounded-lg">No camera streams assigned to this host yet.</div>
            ` : assignedCameras.map(c => `
              <div class="bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-850 flex items-center justify-between text-xs">
                <span class="text-slate-200 font-medium truncate max-w-[170px]">${escapeHTML(c.model)}</span>
                <span class="font-mono text-teal-400 text-[10px] shrink-0">${(parseFloat(c.streamBitrateMbps) || 4.0) * (c.qty || 1)} Mbps</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Access Control Pipeline -->
        <div class="space-y-2 pb-3 border-b border-slate-800">
          <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center justify-between">
            <span class="flex items-center gap-1.5"><i data-lucide="shield" class="w-3.5 h-3.5"></i> Access Control Pipeline</span>
            <span class="font-mono text-[9px] text-slate-400">${totalDoorCount} Doors</span>
          </span>
          <div class="space-y-1.5 bg-slate-950 p-2.5 rounded-xl border border-slate-850 text-xs font-mono">
            <div class="flex justify-between">
              <span class="text-slate-400">Managed Doors:</span>
              <span class="text-emerald-400 font-bold">${totalDoorCount} Access Readers Online</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Security Protocol:</span>
              <span class="text-slate-300">OSDP v2 Secure Channel</span>
            </div>
          </div>
        </div>

        <!-- Core Uplink Interconnect -->
        <div class="space-y-2">
          <span class="text-[10px] font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
            <i data-lucide="git-commit" class="w-3.5 h-3.5"></i> Core Switch Uplink
          </span>
          <div class="space-y-2 bg-slate-950 p-2.5 rounded-xl border border-slate-850 text-xs">
            <div>
              <label class="text-[10px] text-slate-400 block mb-1">Target Core / Aggregation Switch:</label>
              <select onchange="updateCustomUplink('${item.instanceId}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-brand-500">
                <option value="">Auto-Assign (Nearest Core)</option>
                ${candidateTargets.map(t => `
                  <option value="${t.instanceId}" ${item.customUplinkTargetId === t.instanceId ? 'selected' : ''}>${t.model} (${FacilityStore.normalize(t.closetName)})</option>
                `).join('')}
              </select>
            </div>
          </div>
        </div>
      `;
      return;
    }

    const isRadio = item.role === "Wireless Bridge" || item.category === "wireless" || item.category === "ptp_60g" || item.topology === "PtP / PtMP";
    const isEdgeDevice = item.role === "Camera" || item.role === "Access Control" || (item.category && (item.category.includes("camera") || item.category.includes("access")));

    // If selected node is a WIRELESS RADIO / PTP BRIDGE
    if (isRadio) {
      const hostSwitch = item.uplinkTargetId ? projectBOM.find(s => s.instanceId === item.uplinkTargetId) : null;
      const currentPowerMode = (typeof PortEngine !== "undefined") ? PortEngine.getDevicePowerSource(item) : (item.powerSourceOverride || "poe_switch");
      const supportedModes = (typeof PortEngine !== "undefined") ? PortEngine.getSupportedPowerModes(item) : ["poe_switch", "poe_injector"];
      const peerRadios = projectBOM.filter(r => (r.category === "wireless" || r.role === "Wireless Bridge") && r.instanceId !== item.instanceId);

      container.innerHTML = `
        <!-- Wireless Overview Card -->
        <div class="space-y-2 pb-3 border-b border-slate-800">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5 flex-wrap">
              ${item.deviceNumber ? `<span class="px-1.5 py-0.5 rounded bg-purple-900/60 border border-purple-500/40 text-[9px] font-mono font-bold text-purple-300">${escapeHTML(item.deviceNumber)}</span>` : ''}
              <span class="text-xs font-bold text-white truncate max-w-[180px]">${escapeHTML(item.friendlyName || item.model)}</span>
              <button type="button" onclick="promptEditDeviceFriendlyName('${item.instanceId}')" class="text-slate-400 hover:text-white p-0.5 rounded hover:bg-slate-800 transition-colors" title="Edit Friendly Name">
                <i data-lucide="pencil" class="w-3 h-3"></i>
              </button>
            </div>
            <span class="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-purple-500/40 bg-purple-500/10 text-purple-300 shrink-0">
              Wireless RF
            </span>
          </div>
          ${item.friendlyName && item.friendlyName !== item.model ? `<div class="text-[11px] text-slate-300 font-medium">${escapeHTML(item.model)}</div>` : ''}
          <div class="text-[11px] text-slate-400 space-y-1 font-mono">
            <div>Throughput: <strong class="text-purple-300">${item.throughput || item.maxThroughput || '5.4 Gbps'}</strong></div>
            <div>Band: <strong class="text-white">${item.band || item.frequency || '60 GHz / 5 GHz Backup'}</strong></div>
            <div class="pt-1 pb-1">
              <label class="text-[10px] text-slate-400 block mb-1 font-sans">Assigned Location / Enclosure:</label>
              <select onchange="updateDeviceLocation('${item.instanceId}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-indigo-300 font-mono text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-500 cursor-pointer">
                ${renderTopologyLocationOptions(item.closetName || item.rackId)}
              </select>
            </div>
            <!-- 4-Way Omnipresent Cross-Navigation Action Buttons -->
            <div class="pt-1 pb-1.5 flex items-center gap-1.5 flex-wrap">
              <button 
                type="button" 
                onclick="openRackViewerFor('${item.closetName || item.rackId}')"
                class="flex-1 min-w-[105px] px-2 py-1 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-200 border border-indigo-500/40 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
                title="Open Enclosure Visualizer at this rack"
              >
                <i data-lucide="server" class="w-3 h-3 text-indigo-400"></i> Enclosure
              </button>
              <button 
                type="button" 
                onclick="jumpToFacilitySpace('${item.closetName || item.rackId}')"
                class="flex-1 min-w-[105px] px-2 py-1 bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-200 border border-cyan-500/40 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
                title="View Space Hierarchy & Unenclosed Devices"
              >
                <i data-lucide="building-2" class="w-3 h-3 text-cyan-400"></i> Space
              </button>
              <button 
                type="button" 
                onclick="jumpToBomTarget('${item.instanceId}')"
                class="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
                title="Locate item in BOM Drawer"
              >
                <i data-lucide="file-spreadsheet" class="w-3 h-3 text-emerald-400"></i> BOM
              </button>
              <button 
                type="button" 
                onclick="jumpToPhysicalLayoutTarget('${item.instanceId}')"
                class="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
                title="View in Physical Layout Canvas"
              >
                <i data-lucide="map-pin" class="w-3 h-3 text-amber-400"></i> Physical
              </button>
              <button 
                type="button" 
                onclick="deleteDeviceFromBOM('${item.instanceId}')"
                class="px-2 py-1 bg-rose-950/40 hover:bg-rose-900/70 text-rose-300 border border-rose-800/60 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                title="Permanently remove device from Project Quote BOM"
              >
                <i data-lucide="trash-2" class="w-3 h-3 text-rose-400"></i> Delete
              </button>
            </div>
          </div>
        </div>

        <!-- Power Delivery & Sourcing -->
        <div class="space-y-2 pb-3 border-b border-slate-800">
          <span class="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <i data-lucide="zap" class="w-3.5 h-3.5"></i> Power Delivery & Sourcing
          </span>
          <div class="space-y-2 bg-slate-950 p-2.5 rounded-xl border border-slate-850 text-xs">
            <div>
              <label class="text-[10px] text-slate-400 block mb-1">Power Sourcing Method:</label>
              <select onchange="setDevicePowerSource('${item.instanceId}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-amber-300 font-mono text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-500">
                ${supportedModes.map(m => {
                  const def = (typeof POWER_SOURCE_MODES !== "undefined" && POWER_SOURCE_MODES[m]) || { label: m };
                  return `<option value="${m}" ${currentPowerMode === m ? 'selected' : ''}>${def.label}</option>`;
                }).join('')}
              </select>
            </div>
            <div class="flex justify-between text-slate-400 text-xs font-mono pt-1">
              <span>Radio Power Consumption:</span>
              <span class="text-amber-400 font-bold">${item.powerWatts || item.maxPowerWatts || 24} W</span>
            </div>
          </div>
        </div>

        <!-- Reverse Uplink & Network Handoff -->
        <div class="space-y-2 pb-3 border-b border-slate-800">
          <span class="text-[10px] font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
            <i data-lucide="git-commit" class="w-3.5 h-3.5"></i> Host Switch Handoff & Uplink Role
          </span>
          <div class="space-y-2.5 bg-slate-950 p-2.5 rounded-xl border border-slate-850 text-xs">
            <div>
              <label class="text-[10px] text-slate-400 block mb-1">Connected Local Switch (e.g. Pole Switch):</label>
              <select onchange="setDeviceHostSwitch('${item.instanceId}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-500">
                <option value="">Unassigned</option>
                ${candidateTargets.filter(t => t.role === "Access" || t.role === "Core").map(sw => `
                  <option value="${sw.instanceId}" ${item.uplinkTargetId === sw.instanceId ? 'selected' : ''}>
                    ${sw.model} (${FacilityStore.normalize(sw.closetName)})
                  </option>
                `).join('')}
              </select>
            </div>

            <!-- Reverse Uplink Toggle -->
            <div 
              onclick="toggleRadioUplinkRole('${item.instanceId}', ${!item.isUplinkForSwitch})"
              class="flex items-start gap-2 p-2 rounded-xl border ${item.isUplinkForSwitch ? 'border-sky-500/50 bg-sky-500/10' : 'border-slate-800 bg-slate-900/60 opacity-60'} cursor-pointer hover:opacity-100 transition-all text-xs"
            >
              <input type="checkbox" ${item.isUplinkForSwitch ? 'checked' : ''} class="mt-0.5 rounded border-slate-700 bg-slate-900 text-sky-500 pointer-events-none" />
              <div>
                <span class="font-bold text-white block text-[11px]">Provides Network Uplink for Host Switch</span>
                <span class="text-[10px] text-slate-400 block">Switch routes all upstream traffic across this wireless backhaul</span>
              </div>
            </div>
          </div>
        </div>

        <!-- PtP Wireless Peer Link -->
        <div class="space-y-2">
          <span class="text-[10px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
            <i data-lucide="radio" class="w-3.5 h-3.5"></i> PtP Wireless Bridge Partner
          </span>
          <div class="space-y-2 bg-slate-950 p-2.5 rounded-xl border border-slate-850 text-xs">
            <div>
              <label class="text-[10px] text-slate-400 block mb-1">Target Radio (Opposite End of Link):</label>
              <select onchange="updateRadioPartner('${item.instanceId}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-purple-300 font-mono text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-500">
                <option value="">Auto-Pair or Standalone</option>
                ${peerRadios.map(p => `
                  <option value="${p.instanceId}" ${item.customUplinkTargetId === p.instanceId ? 'selected' : ''}>${p.model} (${FacilityStore.normalize(p.closetName)})</option>
                `).join('')}
              </select>
            </div>
          </div>
        </div>
      `;
      return;
    }

    // If selected node is an EDGE CLIENT (Camera, Access Reader, etc.)
    if (isEdgeDevice) {
      const hostSwitch = item.uplinkTargetId ? projectBOM.find(s => s.instanceId === item.uplinkTargetId) : null;
      const hostSwitchPorts = hostSwitch && typeof PortEngine !== "undefined" ? PortEngine.initSwitchPorts(hostSwitch) : [];
      const currentPowerMode = (typeof PortEngine !== "undefined") ? PortEngine.getDevicePowerSource(item) : (item.powerSourceOverride || "poe_switch");
      const supportedModes = (typeof PortEngine !== "undefined") ? PortEngine.getSupportedPowerModes(item) : ["poe_switch", "poe_injector"];
      const isCamera = item.role === "Camera" || (item.category && item.category.includes("camera"));

      container.innerHTML = `
        <!-- Device Overview Card -->
        <div class="space-y-2 pb-3 border-b border-slate-800">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5 flex-wrap">
              ${item.deviceNumber ? `<span class="px-1.5 py-0.5 rounded bg-brand-900/60 border border-brand-500/40 text-[9px] font-mono font-bold text-brand-300">${escapeHTML(item.deviceNumber)}</span>` : ''}
              <span class="text-xs font-bold text-white truncate max-w-[180px]">${escapeHTML(item.friendlyName || item.model)}</span>
              <button type="button" onclick="promptEditDeviceFriendlyName('${item.instanceId}')" class="text-slate-400 hover:text-white p-0.5 rounded hover:bg-slate-800 transition-colors" title="Edit Friendly Name">
                <i data-lucide="pencil" class="w-3 h-3"></i>
              </button>
            </div>
            <span class="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${getRoleBadgeStyle(item.role)} shrink-0">
              ${item.role}
            </span>
          </div>
          ${item.friendlyName && item.friendlyName !== item.model ? `<div class="text-[11px] text-slate-300 font-medium">${escapeHTML(item.model)}</div>` : ''}
          <div class="text-[11px] text-slate-400 space-y-1 font-mono">
            <div>Vendor: <strong class="text-slate-200">${escapeHTML(item.vendor || 'Generic')}</strong></div>
            <div class="pt-1 pb-1">
              <label class="text-[10px] text-slate-400 block mb-1 font-sans">Assigned Location / Enclosure:</label>
              <select onchange="updateDeviceLocation('${item.instanceId}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-indigo-300 font-mono text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-500 cursor-pointer">
                ${renderTopologyLocationOptions(item.closetName || item.rackId)}
              </select>
            </div>
            <!-- 4-Way Omnipresent Cross-Navigation Action Buttons -->
            <div class="pt-1 pb-1.5 flex items-center gap-1.5 flex-wrap">
              <button 
                type="button" 
                onclick="openRackViewerFor('${item.closetName || item.rackId}')"
                class="flex-1 min-w-[105px] px-2 py-1 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-200 border border-indigo-500/40 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
                title="Open Enclosure Visualizer at this rack"
              >
                <i data-lucide="server" class="w-3 h-3 text-indigo-400"></i> Enclosure
              </button>
              <button 
                type="button" 
                onclick="jumpToFacilitySpace('${item.closetName || item.rackId}')"
                class="flex-1 min-w-[105px] px-2 py-1 bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-200 border border-cyan-500/40 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
                title="View Space Hierarchy & Unenclosed Devices"
              >
                <i data-lucide="building-2" class="w-3 h-3 text-cyan-400"></i> Space
              </button>
              <button 
                type="button" 
                onclick="jumpToBomTarget('${item.instanceId}')"
                class="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
                title="Locate item in BOM Drawer"
              >
                <i data-lucide="file-spreadsheet" class="w-3 h-3 text-emerald-400"></i> BOM
              </button>
              <button 
                type="button" 
                onclick="jumpToPhysicalLayoutTarget('${item.instanceId}')"
                class="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
                title="View in Physical Layout Canvas"
              >
                <i data-lucide="map-pin" class="w-3 h-3 text-amber-400"></i> Physical
              </button>
              <button 
                type="button" 
                onclick="deleteDeviceFromBOM('${item.instanceId}')"
                class="px-2 py-1 bg-rose-950/40 hover:bg-rose-900/70 text-rose-300 border border-rose-800/60 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                title="Permanently remove device from Project Quote BOM"
              >
                <i data-lucide="trash-2" class="w-3 h-3 text-rose-400"></i> Delete
              </button>
            </div>
            <div>Hardware Interface: <strong class="text-white">1x 1G RJ-45 (100m Loop)</strong></div>
          </div>
        </div>

        <!-- Power Delivery & Sourcing -->
        <div class="space-y-2 pb-3 border-b border-slate-800">
          <span class="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <i data-lucide="zap" class="w-3.5 h-3.5"></i> Power Delivery & Sourcing
          </span>
          <div class="space-y-2 bg-slate-950 p-2.5 rounded-xl border border-slate-850 text-xs">
            <div>
              <label class="text-[10px] text-slate-400 block mb-1">Power Sourcing Method:</label>
              <select onchange="setDevicePowerSource('${item.instanceId}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-amber-300 font-mono text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-500">
                ${supportedModes.map(m => {
                  const def = (typeof POWER_SOURCE_MODES !== "undefined" && POWER_SOURCE_MODES[m]) || { label: m };
                  return `<option value="${m}" ${currentPowerMode === m ? 'selected' : ''}>${def.label}</option>`;
                }).join('')}
              </select>
            </div>

            <div class="flex justify-between items-center text-slate-400 text-xs font-mono pt-1">
              <span>Device Power Draw:</span>
              <span class="text-amber-400 font-bold">${item.powerConsumptionWatts || item.maxPowerWatts || 15} W</span>
            </div>

            ${currentPowerMode !== 'poe_switch' ? `
              <div class="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-300 flex items-start gap-1.5">
                <i data-lucide="info" class="w-3.5 h-3.5 shrink-0 mt-0.5"></i>
                <span>External power supply active. Switch port carries data only with 0W PoE load on switch budget.</span>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Network Switch & Port Mapping -->
        <div class="space-y-2 pb-3 border-b border-slate-800">
          <span class="text-[10px] font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
            <i data-lucide="git-commit" class="w-3.5 h-3.5"></i> Host Switch & Port Assignment
          </span>
          <div class="space-y-2 bg-slate-950 p-2.5 rounded-xl border border-slate-850 text-xs">
            <div>
              <label class="text-[10px] text-slate-400 block mb-1">Connected Host Switch:</label>
              <select onchange="setDeviceHostSwitch('${item.instanceId}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-500">
                <option value="">Unassigned</option>
                ${candidateTargets.filter(t => t.role === "Access" || t.role === "Core" || t.role === "Core & Agg" || t.role === "Gateways & WAN" || t.role === "Security WAN" || t.role === "Firewall").map(sw => `
                  <option value="${sw.instanceId}" ${item.uplinkTargetId === sw.instanceId ? 'selected' : ''}>
                    ${sw.model} (${FacilityStore.normalize(sw.closetName)})
                  </option>
                `).join('')}
              </select>
            </div>

            ${hostSwitch ? `
              <div>
                <label class="text-[10px] text-slate-400 block mb-1">Assigned Switch Port:</label>
                <select onchange="setDeviceSwitchPort('${item.instanceId}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-sky-300 font-mono text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-brand-500">
                  ${hostSwitchPorts.map(p => `
                    <option value="${p.portNumber}" ${(item.assignedSwitchPort === p.portNumber || p.connectedDeviceId === item.instanceId) ? 'selected' : ''}>
                      ${p.label} &bull; ${p.speed} ${p.poeStandard ? `(${p.poeStandard.toUpperCase()})` : ''} ${p.connectedDeviceId && p.connectedDeviceId !== item.instanceId ? `[In Use: ${p.connectedDeviceModel}]` : ''}
                    </option>
                  `).join('')}
                </select>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Application Specific Routing (Camera / Access) -->
        ${isCamera ? `
          <div class="space-y-2">
            <span class="text-[10px] font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
              <i data-lucide="video" class="w-3.5 h-3.5"></i> VMS Video Stream Routing
            </span>
            <div class="space-y-2 bg-slate-950 p-2.5 rounded-xl border border-slate-850 text-xs font-mono">
              <div class="flex justify-between">
                <span class="text-slate-400">Stream Bitrate:</span>
                <span class="text-teal-400 font-bold">${item.streamBitrateMbps || 4.0} Mbps Continuous</span>
              </div>
              <div>
                <label class="text-[10px] text-slate-400 block mb-1">Assigned Recording Server:</label>
                <select onchange="item.assignedRecordingServerId = this.value || null; FacilityStore.notifyWorkspaceChange(); renderTopology(); renderTopologyInspector();" class="w-full bg-slate-900 border border-slate-700 text-teal-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-500">
                  <option value="">Auto-Detect Primary VMS</option>
                  ${candidateServers.map(s => `
                    <option value="${s.instanceId}" ${item.assignedRecordingServerId === s.instanceId ? 'selected' : ''}>${s.model} (${FacilityStore.normalize(s.closetName)})</option>
                  `).join('')}
                </select>
              </div>
            </div>
          </div>
        ` : `
          <div class="space-y-2">
            <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <i data-lucide="shield" class="w-3.5 h-3.5"></i> Access Control Engine Routing
            </span>
            <div class="space-y-2 bg-slate-950 p-2.5 rounded-xl border border-slate-850 text-xs font-mono">
              <div class="flex justify-between">
                <span class="text-slate-400">Door Capacity:</span>
                <span class="text-emerald-400 font-bold">${item.doorCapacity || 2} Doors Managed</span>
              </div>
              <div>
                <label class="text-[10px] text-slate-400 block mb-1">Assigned Access Engine Server:</label>
                <select onchange="item.assignedAccessServerId = this.value || null; FacilityStore.notifyWorkspaceChange(); renderTopology(); renderTopologyInspector();" class="w-full bg-slate-900 border border-slate-700 text-emerald-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-500">
                  <option value="">Auto-Detect Primary Host</option>
                  ${candidateServers.map(s => `
                    <option value="${s.instanceId}" ${item.assignedAccessServerId === s.instanceId ? 'selected' : ''}>${s.model} (${FacilityStore.normalize(s.closetName)})</option>
                  `).join('')}
                </select>
              </div>
            </div>
          </div>
        `}
      `;
      return;
    }

    // Default Switch Inspector Card
    const switchPorts = typeof PortEngine !== "undefined" ? PortEngine.initSwitchPorts(item) : [];
    const portSummary = typeof PortEngine !== "undefined" ? PortEngine.getPortSummary(item) : null;
    const supportedModes = typeof PortEngine !== "undefined" ? PortEngine.getSupportedPowerModes(item) : ["internal_psu"];
    const currentPowerMode = typeof PortEngine !== "undefined" ? PortEngine.getDevicePowerSource(item) : (item.powerSource || "internal_psu");

    const isStacked = (item.stackedUnits && item.stackedUnits >= 2) || 
      (item.stackedUnits !== 0 && item.qty >= 2 && (item.canStack || item.role === "Access" || item.role === "Aggregation"));
    const stackUnits = isStacked ? (item.stackedUnits || item.qty) : 1;
    const basePortsPerUnit = item.ports || 24;
    const totalStackPorts = basePortsPerUnit * stackUnits;
    const totalStackPoE = (item.poeBudget || 0) * stackUnits;
    const totalStackBaseWatts = (item.baseWatts || 0) * stackUnits;

    const copperPorts = switchPorts.filter(p => p.connector === "RJ-45" && !p.isUplink);
    const opticalCages = switchPorts.filter(p => p.connector !== "RJ-45" || p.isUplink);
    const isAllOptical = copperPorts.length === 0 && opticalCages.length > 0;

    container.innerHTML = `
      <!-- Node Overview Card -->
      <div class="space-y-2 pb-3 border-b border-slate-800">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1.5 flex-wrap">
            ${item.deviceNumber ? `<span class="px-1.5 py-0.5 rounded bg-brand-900/60 border border-brand-500/40 text-[9px] font-mono font-bold text-brand-300">${escapeHTML(item.deviceNumber)}</span>` : ''}
            <span class="text-xs font-bold text-white truncate max-w-[180px]">${escapeHTML(item.friendlyName || item.model)}</span>
            <button type="button" onclick="promptEditDeviceFriendlyName('${item.instanceId}')" class="text-slate-400 hover:text-white p-0.5 rounded hover:bg-slate-800 transition-colors" title="Edit Friendly Name">
              <i data-lucide="pencil" class="w-3 h-3"></i>
            </button>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            ${isStacked ? `
              <span class="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border border-indigo-500/50 bg-indigo-500/20 text-indigo-300">
                Stack (${stackUnits}U)
              </span>
            ` : ''}
            <span class="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${getRoleBadgeStyle(item.role)}">
              ${item.role}
            </span>
          </div>
        </div>
        ${item.friendlyName && item.friendlyName !== item.model ? `<div class="text-[11px] text-slate-300 font-medium">${escapeHTML(item.model)}</div>` : ''}
        <div class="text-[11px] text-slate-400 space-y-1 font-mono">
          <div>Vendor: <strong class="text-slate-200">${escapeHTML(item.vendor || 'Generic')}</strong></div>
          <div>Architecture: <strong class="${isStacked ? 'text-indigo-300 font-semibold' : 'text-slate-300'}">${isStacked ? `Single Logical Stack (${stackUnits}x Member Units &bull; ${item.rackUnits * stackUnits}U)` : 'Standalone Chassis'}</strong></div>
          <div class="pt-1 pb-1">
            <label class="text-[10px] text-slate-400 block mb-1 font-sans">Assigned Rack / Enclosure:</label>
            <select onchange="updateDeviceLocation('${item.instanceId}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-indigo-300 font-mono text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-500 cursor-pointer">
              ${renderTopologyLocationOptions(item.closetName || item.rackId)}
            </select>
          </div>
          <!-- 4-Way Omnipresent Cross-Navigation Action Buttons -->
          <div class="pt-1 pb-1.5 flex items-center gap-1.5 flex-wrap">
            <button 
              type="button" 
              onclick="openRackViewerFor('${item.closetName || item.rackId}')"
              class="flex-1 min-w-[105px] px-2 py-1 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-200 border border-indigo-500/40 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
              title="Open Enclosure Visualizer at this rack"
            >
              <i data-lucide="server" class="w-3 h-3 text-indigo-400"></i> Enclosure
            </button>
            <button 
              type="button" 
              onclick="jumpToFacilitySpace('${item.closetName || item.rackId}')"
              class="flex-1 min-w-[105px] px-2 py-1 bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-200 border border-cyan-500/40 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
              title="View Space Hierarchy & Unenclosed Devices"
            >
              <i data-lucide="building-2" class="w-3 h-3 text-cyan-400"></i> Space
            </button>
            <button 
              type="button" 
              onclick="jumpToBomTarget('${item.instanceId}')"
              class="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
              title="Locate item in BOM Drawer"
            >
              <i data-lucide="file-spreadsheet" class="w-3 h-3 text-emerald-400"></i> BOM
            </button>
            <button 
              type="button" 
              onclick="jumpToPhysicalLayoutTarget('${item.instanceId}')"
              class="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
              title="View in Physical Layout Canvas"
            >
              <i data-lucide="map-pin" class="w-3 h-3 text-amber-400"></i> Physical
            </button>
            <button 
              type="button" 
              onclick="deleteDeviceFromBOM('${item.instanceId}')"
              class="px-2 py-1 bg-rose-950/40 hover:bg-rose-900/70 text-rose-300 border border-rose-800/60 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
              title="Permanently remove device from Project Quote BOM"
            >
              <i data-lucide="trash-2" class="w-3 h-3 text-rose-400"></i> Delete
            </button>
          </div>
          <div>Interface: <strong class="text-white">${totalStackPorts} Ports ${isStacked ? `(${stackUnits}x ${basePortsPerUnit}P Stack)` : ''} (${escapeHTML(item.portSpeed || '1G/10G')})</strong></div>
        </div>
      </div>

      <!-- Chassis Stacking & Virtual Resiliency -->
      ${(item.canStack || item.role === "Access") ? `
        <div class="space-y-2 pb-3 border-b border-slate-800">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
              <i data-lucide="layers" class="w-3.5 h-3.5"></i> Chassis Stacking & Resiliency
            </span>
            <span class="text-[9px] font-mono ${isStacked ? 'text-indigo-400 font-bold bg-indigo-500/10 border border-indigo-500/30 px-1.5 py-0.5 rounded' : 'text-slate-500'}">
              ${isStacked ? `${stackUnits}-Switch Stack` : 'Standalone'}
            </span>
          </div>
          <div class="space-y-2 bg-slate-950 p-2.5 rounded-xl border border-slate-850 text-xs">
            <div>
              <label class="text-[10px] text-slate-400 block mb-1 font-sans">Stack Members (Treated as 1 Single Stack):</label>
              <select onchange="updateSwitchStackFromTopology('${item.instanceId}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-indigo-300 font-mono text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-500">
                <option value="0" ${!isStacked ? 'selected' : ''}>0 (Standalone - 1 Unit)</option>
                <option value="2" ${stackUnits === 2 ? 'selected' : ''}>2 Units (Dual-Chassis Stack - Recommended)</option>
                <option value="3" ${stackUnits === 3 ? 'selected' : ''}>3 Units (3-Chassis Stack)</option>
                <option value="4" ${stackUnits === 4 ? 'selected' : ''}>4 Units (4-Chassis Stack)</option>
              </select>
            </div>
            <div class="text-[10px] font-mono text-slate-400 space-y-1 pt-1 border-t border-slate-900">
              <div class="flex justify-between">
                <span>Hardware Stacking Cables:</span>
                <span class="text-white font-bold">${isStacked ? `${stackUnits}x Dedicated Cables (In BOM)` : 'None'}</span>
              </div>
              <div class="flex justify-between">
                <span>Uplink Architecture:</span>
                <span class="text-indigo-300 font-semibold">${isStacked ? 'Cross-Stack LACP LAG (Failover Protected)' : 'Standard Single Trunk'}</span>
              </div>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- Power & PoE Telemetry -->
      <div class="space-y-2 pb-3 border-b border-slate-800">
        <span class="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
          <i data-lucide="zap" class="w-3.5 h-3.5"></i> Electrical & PoE Telemetry
        </span>
        <div class="space-y-2 text-xs bg-slate-950 p-2.5 rounded-xl border border-slate-850">
          <div>
            <label class="text-[10px] text-slate-400 block mb-1 font-sans">Chassis Power Mode:</label>
            <select onchange="setDevicePowerSource('${item.instanceId}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-amber-300 font-mono text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-500">
              ${supportedModes.map(m => {
                const def = (typeof POWER_SOURCE_MODES !== "undefined" && POWER_SOURCE_MODES[m]) || { label: m };
                return `<option value="${m}" ${currentPowerMode === m ? 'selected' : ''}>${def.label}</option>`;
              }).join('')}
            </select>
          </div>
          <div class="flex justify-between text-slate-400">
            <span>Power Source:</span>
            <span class="text-amber-300 font-bold font-mono">${getPowerSourceLabel(item)}${isStacked ? ` (${stackUnits}x PSUs)` : ''}</span>
          </div>
          <div class="flex justify-between text-slate-400">
            <span>Chassis Base Draw:</span>
            <span class="font-mono text-white">${totalStackBaseWatts} W ${isStacked ? `(${stackUnits}x ${item.baseWatts || 0}W Chassis)` : ''}</span>
          </div>
          ${totalStackPoE > 0 ? `
            <div class="flex justify-between text-slate-400">
              <span>Total PoE Budget:</span>
              <span class="font-mono text-amber-400 font-bold">${totalStackPoE} W ${isStacked ? `(${stackUnits}x ${item.poeBudget}W PSUs)` : ''}</span>
            </div>
            <div class="flex justify-between text-slate-400">
              <span>Connected Load:</span>
              <span class="font-mono ${((item.consumedPoEWatts || 0) > totalStackPoE) ? 'text-rose-400 font-bold' : 'text-emerald-400'}">
                ${item.consumedPoEWatts || 0} W (${Math.round(((item.consumedPoEWatts || 0) / (totalStackPoE || 1)) * 100)}%)
              </span>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- Physical Port Matrix (Faceplate Status Grid) -->
      ${switchPorts.length > 0 ? `
        <div class="space-y-2 pb-3 border-b border-slate-800">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
              <i data-lucide="layout-grid" class="w-3.5 h-3.5"></i> Physical Port Matrix
            </span>
            <div class="flex items-center gap-2">
              <span class="font-mono text-[9px] text-slate-400">
                ${portSummary ? `${portSummary.used}/${portSummary.total} Used` : ''}
              </span>
              <button 
                type="button" 
                onclick="openPortMatrixStudio('${item.instanceId}')"
                class="px-1.5 py-0.5 bg-sky-950/60 hover:bg-sky-900/80 text-sky-300 border border-sky-700/60 rounded text-[9px] font-mono font-bold flex items-center gap-1 cursor-pointer transition-colors"
                title="Open Dedicated Widescreen Port Studio"
              >
                <i data-lucide="maximize-2" class="w-2.5 h-2.5"></i> Studio
              </button>
            </div>
          </div>

          <div class="p-2.5 bg-slate-950 rounded-xl border border-slate-850 space-y-2.5">
            ${isAllOptical ? `
              <!-- High-Density All-Optical Spine Matrix -->
              <div class="space-y-2">
                ${Array.from({ length: stackUnits }, (_, uIdx) => {
                  const u = uIdx + 1;
                  const unitCages = opticalCages.filter(p => (p.unitIndex || 1) === u);
                  return `
                    <div class="space-y-1.5 ${u > 1 ? 'pt-2 border-t border-slate-900' : ''}">
                      <div class="flex items-center justify-between text-[9px] font-mono text-cyan-400 uppercase font-semibold">
                        <span>${isStacked ? `Unit ${u} Optical Cages:` : 'QSFP/SFP Optical Transceiver Cages:'}</span>
                        <span class="text-slate-400">${unitCages.length}x ${unitCages[0]?.speed || '100G'}</span>
                      </div>
                      <div class="grid ${unitCages.length > 16 ? 'grid-cols-8' : (unitCages.length > 8 ? 'grid-cols-6' : 'grid-cols-4')} gap-1">
                        ${unitCages.map(p => {
                          const isConnected = !!p.connectedDeviceId;
                          let bg = "bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700";
                          if (isConnected) bg = "bg-cyan-500/20 border-cyan-500 text-cyan-300";
                          return `
                            <div 
                              class="h-7 rounded border ${bg} flex flex-col items-center justify-center font-mono text-[8px] font-bold cursor-pointer transition-all hover:scale-105"
                              title="${p.label}: ${p.connectedDeviceModel || 'Free / Unpopulated Cage'} (${p.speed})"
                              onclick="inspectSwitchPort('${item.instanceId}', ${p.portNumber})"
                            >
                              <span>${p.shortLabel || `Q${p.portNumber}`}</span>
                              <span class="text-[7px] font-normal opacity-70">${p.speed}</span>
                            </div>
                          `;
                        }).join('')}
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            ` : `
              <!-- Copper Access Ports Grid (per stack unit) -->
              <div class="space-y-2.5">
                ${Array.from({ length: stackUnits }, (_, uIdx) => {
                  const u = uIdx + 1;
                  const unitCopper = copperPorts.filter(p => (p.unitIndex || 1) === u);
                  const unitOptical = opticalCages.filter(p => (p.unitIndex || 1) === u);
                  return `
                    <div class="space-y-1.5 ${u > 1 ? 'pt-2.5 border-t border-slate-900' : ''}">
                      <div class="flex items-center justify-between text-[10px] font-mono font-bold ${u === 1 ? 'text-sky-400' : 'text-indigo-400'}">
                        <span class="flex items-center gap-1">
                          <i data-lucide="layers" class="w-3 h-3"></i>
                          ${isStacked ? `Unit ${u} (${u === 1 ? 'Master Chassis' : 'Member Chassis'} &bull; ${unitCopper.length} Ports)` : 'Access Ports Faceplate'}
                        </span>
                        <span class="text-slate-500 font-normal text-[9px]">${isStacked ? `Member ${u} Ports` : `${unitCopper.length}P`}</span>
                      </div>

                      <div class="grid grid-cols-12 gap-1">
                        ${unitCopper.map(p => {
                          const isPoEActive = (p.poeOutputWatts || 0) > 0;
                          const isUplink = p.isUplink || p.role === "uplink";
                          const isDataOnly = p.connectedDeviceId && !isPoEActive;
                          let bg = "bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700";
                          if (isUplink) bg = "bg-sky-500/20 border-sky-500/50 text-sky-300";
                          else if (isPoEActive) bg = "bg-emerald-500/20 border-emerald-500/50 text-emerald-300";
                          else if (isDataOnly) bg = "bg-amber-500/20 border-amber-500/50 text-amber-300";

                          return `
                            <div 
                              class="h-6 rounded border ${bg} flex items-center justify-center font-mono text-[9px] font-bold cursor-pointer transition-all hover:scale-105" 
                              title="${p.label}: ${p.connectedDeviceModel || 'Free'} ${isPoEActive ? `(${p.poeOutputWatts}W)` : ''}"
                              onclick="inspectSwitchPort('${item.instanceId}', ${p.portNumber})"
                            >
                              ${p.unitPortNumber || p.portNumber}
                            </div>
                          `;
                        }).join('')}
                      </div>

                      ${unitOptical.length > 0 ? `
                        <div class="pt-1.5 border-t border-slate-900 space-y-1">
                          <div class="flex items-center justify-between text-[9px] font-mono text-slate-400 uppercase">
                            <span>${isStacked ? `Unit ${u} Uplink Cages:` : 'Optical SFP/QSFP Cages:'}</span>
                            <span class="text-sky-400 font-bold">${unitOptical.length} Cages</span>
                          </div>
                          <div class="grid grid-cols-4 gap-1.5">
                            ${unitOptical.map((p, idx) => {
                              const isConnected = !!p.connectedDeviceId;
                              const bg = isConnected ? "bg-sky-500/20 border-sky-500 text-sky-300" : "bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700";
                              return `
                                <div 
                                  class="px-1.5 py-1 rounded border ${bg} font-mono text-[9px] font-bold cursor-pointer flex items-center justify-between transition-all hover:border-slate-600"
                                  title="${p.label}: ${p.connectedDeviceModel || 'Free'} (${p.speed})"
                                  onclick="inspectSwitchPort('${item.instanceId}', ${p.portNumber})"
                                >
                                  <span>${p.shortLabel || `U${idx + 1}`}</span>
                                  <span class="text-[8px] text-sky-400 font-normal">${p.speed}</span>
                                </div>
                              `;
                            }).join('')}
                          </div>
                        </div>
                      ` : ''}
                    </div>
                  `;
                }).join('')}
              </div>
            `}

            <!-- Legend strip -->
            <div class="flex flex-wrap items-center justify-between gap-1.5 text-[9px] font-mono text-slate-400 pt-2 border-t border-slate-900">
              <span class="flex items-center gap-1"><span class="w-2 h-2 rounded bg-emerald-500 inline-block"></span> PoE Active</span>
              <span class="flex items-center gap-1"><span class="w-2 h-2 rounded bg-sky-500 inline-block"></span> Uplink/LAG</span>
              <span class="flex items-center gap-1"><span class="w-2 h-2 rounded bg-amber-500 inline-block"></span> Data Only</span>
              <span class="flex items-center gap-1"><span class="w-2 h-2 rounded bg-slate-800 inline-block"></span> Free</span>
            </div>

            <!-- Active Backbone Uplinks & Interconnects (Requirement 3) -->
            ${opticalCages.some(p => p.connectedDeviceId) ? `
              <div class="pt-2 border-t border-slate-900 space-y-1.5">
                <div class="flex items-center justify-between text-[10px] font-mono font-bold text-sky-400 uppercase">
                  <span class="flex items-center gap-1"><i data-lucide="git-commit" class="w-3 h-3"></i> Uplinks in Use & Trunks</span>
                  <span class="text-slate-500 font-normal">${opticalCages.filter(p => p.connectedDeviceId).length} Connected</span>
                </div>
                <div class="space-y-1">
                  ${opticalCages.filter(p => p.connectedDeviceId).map(p => {
                    const targetDev = projectBOM.find(i => i.instanceId === p.connectedDeviceId);
                    const targetModel = targetDev ? targetDev.model : (p.connectedDeviceModel || 'Connected Switch');
                    const targetLoc = targetDev ? (targetDev.closetName || targetDev.rackId || 'Space') : (p.connectedLocation || 'Rack');
                    return `
                      <div class="p-1.5 rounded-lg bg-slate-900 border border-sky-500/40 flex items-center justify-between text-xs">
                        <div class="flex items-center gap-2 min-w-0">
                          <span class="px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 font-mono font-bold text-[9px] border border-sky-800 shrink-0">${p.shortLabel || `Port ${p.portNumber}`}</span>
                          <div class="min-w-0">
                            <span class="font-bold text-white block truncate text-[11px]">${escapeHTML(targetModel)}</span>
                            <span class="text-[9px] text-slate-400 font-mono block truncate">${escapeHTML(targetLoc)} &bull; ${p.speed} Trunk</span>
                          </div>
                        </div>
                        <div class="flex items-center gap-1 shrink-0">
                          <button onclick="selectTopologyNode('${p.connectedDeviceId}'); panNodeIntoView('${p.connectedDeviceId}')" class="px-2 py-0.5 bg-sky-600/30 hover:bg-sky-600 text-sky-200 hover:text-white rounded border border-sky-500/40 text-[10px] font-bold transition-all flex items-center gap-1 shadow-sm" title="Jump to ${escapeHTML(targetModel)} in Topology">
                            <span>Link</span> &rarr;
                          </button>
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            ` : `
              <div class="pt-2 border-t border-slate-900 text-[10px] font-mono text-slate-500 flex items-center justify-between">
                <span>Backbone Optical Uplinks:</span>
                <span class="text-slate-400">Auto-Homed / Standby</span>
              </div>
            `}
          </div>
        </div>
      ` : ''}

      <!-- Uplink & Interconnect Settings -->
      ${item.role !== "Core" && item.role !== "Core & Agg" && item.role !== "Aggregation" && item.role !== "Gateways & WAN" && item.role !== "Security WAN" && item.role !== "Firewall" ? `
        <div class="space-y-2 pb-3 border-b border-slate-800">
          <span class="text-[10px] font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
            <i data-lucide="git-commit" class="w-3.5 h-3.5"></i> Uplink Configuration
          </span>
          <div class="space-y-2 bg-slate-950 p-2.5 rounded-xl border border-slate-850 text-xs">
            <div>
              <label class="text-[10px] text-slate-400 block mb-1">Target Core / Aggregation Switch:</label>
              <select onchange="updateCustomUplink('${item.instanceId}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-brand-500">
                <option value="">Auto-Assign (Nearest Core)</option>
                ${candidateTargets.map(t => `
                  <option value="${t.instanceId}" ${item.customUplinkTargetId === t.instanceId ? 'selected' : ''}>${t.model} (${FacilityStore.normalize(t.closetName)})</option>
                `).join('')}
              </select>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="text-[10px] text-slate-400 block mb-1">Trunk LAG:</label>
                <select onchange="updateCustomLinkMultiplier('${item.instanceId}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-sky-300 font-mono font-bold rounded-lg px-2 py-1 text-xs">
                  <option value="1" ${(item.customLinkMultiplier || 1) == 1 ? 'selected' : ''}>1x Link</option>
                  <option value="2" ${item.customLinkMultiplier == 2 ? 'selected' : ''}>2x LACP LAG</option>
                  <option value="4" ${item.customLinkMultiplier == 4 ? 'selected' : ''}>4x LACP LAG</option>
                </select>
              </div>

              <div>
                <label class="text-[10px] text-slate-400 block mb-1">Speed Override:</label>
                <select onchange="updateCustomLinkSpeed('${item.instanceId}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-amber-300 font-mono font-bold rounded-lg px-2 py-1 text-xs">
                  <option value="">Auto-Detect</option>
                  <option value="100G" ${item.customLinkSpeed === '100G' ? 'selected' : ''}>100G</option>
                  <option value="40G" ${item.customLinkSpeed === '40G' ? 'selected' : ''}>40G</option>
                  <option value="25G" ${item.customLinkSpeed === '25G' ? 'selected' : ''}>25G</option>
                  <option value="10G" ${item.customLinkSpeed === '10G' ? 'selected' : ''}>10G</option>
                  <option value="1G" ${item.customLinkSpeed === '1G' ? 'selected' : ''}>1G</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- Logical Services Routing (VMS & Access) -->
      ${candidateServers.length > 0 ? `
        <div class="space-y-2 pb-3 border-b border-slate-800">
          <span class="text-[10px] font-bold uppercase tracking-wider text-brand-400 flex items-center gap-1.5">
            <i data-lucide="route" class="w-3.5 h-3.5"></i> Logical Services Routing
          </span>
          <div class="space-y-2 bg-slate-950 p-2.5 rounded-xl border border-slate-850 text-xs">
            <div>
              <label class="text-[10px] text-slate-400 block mb-1">Assigned VMS Recording Server:</label>
              <select onchange="updateSwitchVmsServer('${item.instanceId}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-teal-300 font-mono text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-500">
                <option value="">Auto-Detect Primary VMS</option>
                ${candidateServers.map(s => `
                  <option value="${s.instanceId}" ${item.assignedVmsServerId === s.instanceId ? 'selected' : ''}>${s.model} (${FacilityStore.normalize(s.closetName)})</option>
                `).join('')}
              </select>
            </div>

            <div>
              <label class="text-[10px] text-slate-400 block mb-1">Assigned Access Control Engine:</label>
              <select onchange="updateSwitchAccessServer('${item.instanceId}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-emerald-300 font-mono text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-500">
                <option value="">Auto-Detect Primary Host</option>
                ${candidateServers.map(s => `
                  <option value="${s.instanceId}" ${item.assignedAccessServerId === s.instanceId ? 'selected' : ''}>${s.model} (${FacilityStore.normalize(s.closetName)})</option>
                `).join('')}
              </select>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- Connected Downstream Devices List -->
      <div class="space-y-2">
        <span class="text-[10px] font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
          <span>Downlink Clients (${children.length})</span>
          <span class="text-[9px] font-mono text-slate-500">Click to Inspect</span>
        </span>
        <div class="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          ${children.length === 0 ? `
            <div class="text-[11px] text-slate-500 py-3 text-center bg-slate-950 rounded-xl border border-slate-850">
              No field devices attached to this switch in quote.
            </div>
          ` : children.map(ch => {
            const chPowerBadge = (typeof PortEngine !== "undefined") ? PortEngine.getPowerBadge(ch) : { label: "PoE", badgeLabel: "PoE", isExternal: false };
            return `
              <div 
                onclick="selectTopologyNode('${ch.instanceId}', event)"
                class="bg-slate-950 p-2 rounded-lg border border-slate-850 hover:border-slate-700 cursor-pointer flex items-center justify-between text-xs transition-colors"
              >
                <div class="truncate max-w-[170px]">
                  <span class="text-white block font-medium truncate">${escapeHTML(ch.model)}</span>
                  <span class="text-[10px] text-slate-400 font-mono">${ch.role || 'Edge Device'} &bull; ${ch.qty || 1}x &bull; Port ${ch.assignedSwitchPort || 'Auto'}</span>
                </div>
                <div class="text-right shrink-0">
                  <span class="font-mono text-[10px] ${chPowerBadge.isExternal ? 'text-amber-400' : 'text-emerald-400'} font-bold block">
                    ${chPowerBadge.badgeLabel}
                  </span>
                  <span class="font-mono text-[9px] text-slate-500">
                    ${Math.round((ch.powerConsumptionWatts || ch.maxPowerWatts || 15) * (ch.qty || 1))}W
                  </span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  } else if (selectedTopologyLinkId) {
    const link = topologyLinks.find(l => l.id === selectedTopologyLinkId);
    if (!link) {
      deselectTopologyNode();
      return;
    }

    const fromNode = projectBOM.find(i => i.instanceId === link.fromId);
    const toNode = projectBOM.find(i => i.instanceId === link.toId);

    if (selectedNodeEl) selectedNodeEl.innerText = link.speedLabel;
    if (linkSpeedEl) linkSpeedEl.innerText = link.speedLabel;
    if (powerSourceEl) powerSourceEl.innerText = link.isPoEDelivery ? "PoE Delivery" : "Data / Signal Only";

    if (link.category === "vms_stream") {
      container.innerHTML = `
        <div class="space-y-3">
          <div class="pb-2 border-b border-slate-800">
            <span class="text-xs font-bold text-white block">${link.speedLabel}</span>
            <span class="text-[10px] font-mono text-teal-400">Logical Video Stream Ingest Pipe</span>
          </div>

          <div class="space-y-2 text-xs bg-slate-950 p-3 rounded-xl border border-slate-850 font-mono">
            <div class="flex justify-between">
              <span class="text-slate-400">Edge Switch:</span>
              <span class="text-white font-bold truncate max-w-[150px]">${escapeHTML(fromNode ? fromNode.model : 'Switch')}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Recording Server:</span>
              <span class="text-teal-300 font-bold truncate max-w-[150px]">${escapeHTML(toNode ? toNode.model : 'VMS Server')}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Continuous Ingress:</span>
              <span class="text-teal-400 font-bold">${link.speedLabel}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Compression:</span>
              <span class="text-slate-300">H.265 / SmartCodec</span>
            </div>
          </div>
        </div>
      `;
    } else if (link.category === "access_link") {
      container.innerHTML = `
        <div class="space-y-3">
          <div class="pb-2 border-b border-slate-800">
            <span class="text-xs font-bold text-white block">${link.speedLabel}</span>
            <span class="text-[10px] font-mono text-indigo-400">Access Control Communication Pipe</span>
          </div>

          <div class="space-y-2 text-xs bg-slate-950 p-3 rounded-xl border border-slate-850 font-mono">
            <div class="flex justify-between">
              <span class="text-slate-400">Edge Switch:</span>
              <span class="text-white font-bold truncate max-w-[150px]">${escapeHTML(fromNode ? fromNode.model : 'Switch')}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Access Engine Host:</span>
              <span class="text-indigo-300 font-bold truncate max-w-[150px]">${escapeHTML(toNode ? toNode.model : 'Access Server')}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Managed Capacity:</span>
              <span class="text-emerald-400 font-bold">${link.speedLabel}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Encryption:</span>
              <span class="text-slate-300">TLS 1.3 / OSDP v2</span>
            </div>
          </div>
        </div>
      `;
    } else {
      const fromLoc = (typeof FacilityStore !== "undefined") ? FacilityStore.normalize(fromNode?.closetName || fromNode?.rackId || "MDF") : (fromNode?.closetName || "MDF");
      const toLoc = (typeof FacilityStore !== "undefined") ? FacilityStore.normalize(toNode?.closetName || toNode?.rackId || "MDF") : (toNode?.closetName || "MDF");
      const isSameRack = (fromLoc === toLoc) && !fromLoc.endsWith("• Field") && (typeof FacilityStore === "undefined" || fromLoc !== FacilityStore.UNASSIGNED);
      const uDiff = calculateUDistance(fromNode, toNode);
      const calcDacLen = getDacLengthForUDiff(uDiff);
      const calcPatchCord = getPatchCordLengthForUDiff(uDiff);
      const projectFiber = getProjectFiberType();
      const override = getLinkInterconnectOverride(link.id);

      const activeMedium = (override.medium && override.medium !== "auto") ? override.medium : (isSameRack ? "dac" : projectFiber);

      container.innerHTML = `
        <div class="space-y-3">
          <div class="pb-2 border-b border-slate-800 flex items-center justify-between">
            <div>
              <span class="text-xs font-bold text-white block">${link.speedLabel}</span>
              <span class="text-[10px] font-mono text-slate-400">Logical Transport Interconnect</span>
            </div>
            <span class="px-2 py-0.5 rounded text-[9px] font-mono font-bold border ${activeMedium === 'dac' ? 'bg-amber-950/80 text-amber-300 border-amber-600/60' : ((activeMedium === 'patch' || activeMedium === 'cat6a') ? 'bg-sky-950/80 text-sky-300 border-sky-600/60' : (activeMedium === 'smf' ? 'bg-yellow-950/80 text-yellow-300 border-yellow-600/60' : 'bg-cyan-950/80 text-cyan-300 border-cyan-600/60'))}">
              ${activeMedium === 'dac' ? `DAC (${override.dacLength && override.dacLength !== 'auto' ? override.dacLength : calcDacLen})` : ((activeMedium === 'patch' || activeMedium === 'cat6a') ? `Patch (${override.patchLength && override.patchLength !== 'auto' ? override.patchLength + ' ft' : calcPatchCord.label})` : (activeMedium === 'smf' ? 'OS2 SMF' : 'OM4 MMF'))}
            </span>
          </div>

          <!-- Physical Placement & Endpoints -->
          <div class="space-y-2 text-xs bg-slate-950 p-3 rounded-xl border border-slate-850 font-mono">
            <div class="flex justify-between items-center">
              <span class="text-slate-400">Host A:</span>
              <span class="text-white font-bold truncate max-w-[170px]" title="${escapeHTML(fromNode ? fromNode.model : 'Core')}">${escapeHTML(fromNode ? fromNode.model : 'Core')}</span>
            </div>
            <div class="flex justify-between items-center text-[11px] text-slate-400">
              <span>Location A:</span>
              <span class="text-sky-300 truncate max-w-[170px]">${escapeHTML(fromLoc)} ${fromNode?.rackSlot ? `@ U${fromNode.rackSlot}` : ''}</span>
            </div>
            <div class="flex justify-between items-center mt-1 pt-1 border-t border-slate-900">
              <span class="text-slate-400">Host B:</span>
              <span class="text-indigo-300 font-bold truncate max-w-[170px]" title="${escapeHTML(toNode ? toNode.model : 'Access')}">${escapeHTML(toNode ? toNode.model : 'Access')}</span>
            </div>
            <div class="flex justify-between items-center text-[11px] text-slate-400">
              <span>Location B:</span>
              <span class="text-sky-300 truncate max-w-[170px]">${escapeHTML(toLoc)} ${toNode?.rackSlot ? `@ U${toNode.rackSlot}` : ''}</span>
            </div>
            <div class="flex justify-between items-center mt-1 pt-1 border-t border-slate-900">
              <span class="text-slate-400">Placement:</span>
              <span class="${isSameRack ? 'text-emerald-400 font-bold' : 'text-cyan-300'}">
                ${isSameRack ? `Same Rack (${uDiff}U Separation)` : 'Inter-Rack / Backbone'}
              </span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-slate-400">Port Speed & LAG:</span>
              <span class="text-cyan-400 font-bold">${link.rawSpeed} &bull; ${link.multiplier}x ${link.isLAG ? '(LACP)' : ''}</span>
            </div>
          </div>

          <!-- Interconnect Auto-Calculation & Overrides -->
          <div class="space-y-2.5 pt-2 border-t border-slate-800">
            <div class="flex items-center justify-between">
              <label class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Interconnect Medium</label>
              <span class="text-[9px] font-mono text-slate-500">${override.medium && override.medium !== 'auto' ? 'Overridden' : 'Auto-Calculated'}</span>
            </div>

            <div>
              <label class="text-[11px] text-slate-400 block mb-1">Medium Specification:</label>
              <select 
                onchange="updateLinkOverride('${link.id}', 'medium', this.value)"
                class="w-full bg-slate-950 border border-slate-700 text-white text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-brand-500 font-mono"
              >
                <option value="auto" ${(!override.medium || override.medium === 'auto') ? 'selected' : ''}>Auto-Calculate (${isSameRack ? 'Same Rack: DAC' : `Inter-Rack: ${projectFiber.toUpperCase()} SFP`})</option>
                <option value="dac" ${override.medium === 'dac' ? 'selected' : ''}>Direct Attach Copper (DAC)</option>
                <option value="patch" ${(override.medium === 'patch' || override.medium === 'cat6a') ? 'selected' : ''}>RJ45 Copper Patch Cord (Cat6A)</option>
                <option value="mmf" ${override.medium === 'mmf' ? 'selected' : ''}>Multi-Mode Fiber (MMF / OM4 SR Optics)</option>
                <option value="smf" ${override.medium === 'smf' ? 'selected' : ''}>Single-Mode Fiber (SMF / OS2 LR Optics)</option>
              </select>
            </div>

            ${activeMedium === 'dac' ? `
              <div>
                <div class="flex justify-between items-center mb-1">
                  <label class="text-[11px] text-slate-400">DAC Cable Length:</label>
                  <span class="text-[10px] font-mono text-amber-400">Span: ${uDiff}U</span>
                </div>
                <select 
                  onchange="updateLinkOverride('${link.id}', 'dacLength', this.value)"
                  class="w-full bg-slate-950 border border-slate-700 text-amber-200 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-brand-500 font-mono"
                >
                  <option value="auto" ${(!override.dacLength || override.dacLength === 'auto') ? 'selected' : ''}>Auto (${calcDacLen} based on ${uDiff}U separation)</option>
                  <option value="0.5m" ${override.dacLength === '0.5m' ? 'selected' : ''}>0.5m (~1.6 ft &bull; Adjacent / 1-2U)</option>
                  <option value="1m" ${override.dacLength === '1m' ? 'selected' : ''}>1.0m (~3.3 ft &bull; 3-6U)</option>
                  <option value="2m" ${override.dacLength === '2m' ? 'selected' : ''}>2.0m (~6.6 ft &bull; 7-15U)</option>
                  <option value="3m" ${override.dacLength === '3m' ? 'selected' : ''}>3.0m (~10 ft &bull; 16-28U)</option>
                  <option value="5m" ${override.dacLength === '5m' ? 'selected' : ''}>5.0m (~16.4 ft &bull; 28U+ Top-to-Bottom)</option>
                </select>
              </div>
            ` : ((activeMedium === 'patch' || activeMedium === 'cat6a') ? `
              <div>
                <div class="flex justify-between items-center mb-1">
                  <label class="text-[11px] text-slate-400">RJ45 Patch Cord Length:</label>
                  <span class="text-[10px] font-mono text-sky-400">Span: ${uDiff}U</span>
                </div>
                <select 
                  onchange="updateLinkOverride('${link.id}', 'patchLength', this.value)"
                  class="w-full bg-slate-950 border border-slate-700 text-sky-200 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-brand-500 font-mono"
                >
                  <option value="auto" ${(!override.patchLength || override.patchLength === 'auto') ? 'selected' : ''}>Auto (${calcPatchCord.label} based on ${uDiff}U separation)</option>
                  <option value="0.5" ${override.patchLength === '0.5' ? 'selected' : ''}>0.5 ft (6-Inch &bull; Adjacent / 0-1U)</option>
                  <option value="1" ${override.patchLength === '1' ? 'selected' : ''}>1.0 ft (~0.3m &bull; 2-4U)</option>
                  <option value="3" ${override.patchLength === '3' ? 'selected' : ''}>3.0 ft (~1.0m &bull; 5-7U)</option>
                  <option value="5" ${override.patchLength === '5' ? 'selected' : ''}>5.0 ft (~1.5m &bull; 8-14U)</option>
                  <option value="7" ${override.patchLength === '7' ? 'selected' : ''}>7.0 ft (~2.1m &bull; 15-22U)</option>
                  <option value="10" ${override.patchLength === '10' ? 'selected' : ''}>10.0 ft (~3.0m &bull; 23-32U)</option>
                  <option value="15" ${override.patchLength === '15' ? 'selected' : ''}>15.0 ft (~4.6m &bull; 33U+ Top-to-Bottom)</option>
                </select>
              </div>
            ` : `
              <div>
                <label class="text-[11px] text-slate-400 block mb-1">Optical Transceiver & Fiber Type:</label>
                <select 
                  onchange="updateLinkOverride('${link.id}', 'fiberType', this.value)"
                  class="w-full bg-slate-950 border border-slate-700 text-cyan-200 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-brand-500 font-mono"
                >
                  <option value="auto" ${(!override.fiberType || override.fiberType === 'auto') ? 'selected' : ''}>Project Default (${projectFiber.toUpperCase()} / ${projectFiber === 'smf' ? 'OS2 Single-Mode' : 'OM4 Multi-Mode'})</option>
                  <option value="mmf" ${override.fiberType === 'mmf' ? 'selected' : ''}>Multi-Mode (OM4 Duplex LC &bull; SR Optics 850nm)</option>
                  <option value="smf" ${override.fiberType === 'smf' ? 'selected' : ''}>Single-Mode (OS2 Duplex LC &bull; LR Optics 1310nm)</option>
                </select>
              </div>
            `)}

            <button 
              type="button" 
              onclick="autoSynthesizeInterconnects()"
              class="w-full mt-2 py-2 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-500/40 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow"
            >
              <i data-lucide="cpu" class="w-3.5 h-3.5 text-emerald-400"></i>
              <span>Re-Synthesize Interconnects to BOM</span>
            </button>
          </div>
        </div>
      `;
    }
  } else {
    // Project-wide Topology Summary when nothing is selected
    if (selectedNodeEl) selectedNodeEl.innerText = "Project Overview";
    if (linkSpeedEl) linkSpeedEl.innerText = "Unified";
    if (powerSourceEl) powerSourceEl.innerText = "All Sources";

    const totalSwitches = projectBOM.filter(i => !i.parentInstanceId && (i.role === "Access" || i.role === "Core" || i.role === "Aggregation")).length;
    const totalGateways = projectBOM.filter(i => !i.parentInstanceId && (i.role === "Gateways & WAN" || i.role === "Security WAN")).length;
    const totalEdge = projectBOM.filter(i => i.uplinkTargetId && !i.parentInstanceId).length;

    container.innerHTML = `
      <div class="space-y-4">
        <div class="text-slate-400 text-xs">
          Select any switch, server, or interconnect link on the canvas to configure uplinks, adjust LAG trunking, or inspect connected field devices.
        </div>

        <div class="space-y-2 pt-2 border-t border-slate-800">
          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Project Systems Telemetry</span>
          <div class="space-y-2 text-xs bg-slate-950 p-3 rounded-xl border border-slate-850 font-mono">
            <div class="flex justify-between">
              <span class="text-slate-400">Security Gateways:</span>
              <span class="text-white font-bold">${totalGateways} Units</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Distribution Switches:</span>
              <span class="text-white font-bold">${totalSwitches} Units</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Connected Edge Devices:</span>
              <span class="text-sky-400 font-bold">${totalEdge} Devices</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Active Interconnects:</span>
              <span class="text-emerald-400 font-bold">${topologyLinks.length} Trunks</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  if (typeof safeCreateIcons === "function") {
    safeCreateIcons(container);
  } else if (window.lucide) {
    lucide.createIcons();
  }
}

function getPowerSourceLabel(item) {
  if (typeof PortEngine !== "undefined") {
    const badge = PortEngine.getPowerBadge(item);
    if (badge && badge.label) {
      if (item.dualPsu && badge.mode === "dedicated_ac") return "Dual Hot-Swap AC";
      return badge.label;
    }
  }
  if (item.dualPsu) return "Dual Hot-Swap AC";
  if (item.powerSourceOverride) return item.powerSourceOverride;
  if (item.powerSource === "poe_switch" || item.poeStandardRequired) return "PoE-In Powered";
  if (item.isDinMounted || (item.model && item.model.includes("DIN"))) return "48-56VDC Terminal";
  return "Internal AC";
}

function getRoleBadgeStyle(role) {
  switch (role) {
    case "Core":
    case "Core & Agg":
    case "Aggregation":
      return "border-purple-500/40 bg-purple-500/10 text-purple-300";
    case "Access":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
    case "Gateways & WAN":
    case "Security WAN":
      return "border-rose-500/40 bg-rose-500/10 text-rose-300";
    case "Wireless Bridge":
      return "border-sky-500/40 bg-sky-500/10 text-sky-300";
    case "Server":
    case "Compute & Storage":
      return "border-amber-500/40 bg-amber-500/10 text-amber-300";
    default:
      return "border-slate-700 bg-slate-800 text-slate-300";
  }
}

// -----------------------------------------------------------
// Interactive Custom Link Controls
// -----------------------------------------------------------
function updateCustomUplink(nodeInstanceId, targetInstanceId) {
  const item = projectBOM.find(i => i.instanceId === nodeInstanceId);
  if (item) {
    item.customUplinkTargetId = targetInstanceId || null;
    FacilityStore.notifyWorkspaceChange();
    renderTopology();
    renderTopologyInspector();
  }
}

function updateCustomLinkMultiplier(nodeInstanceId, multiplierVal) {
  const item = projectBOM.find(i => i.instanceId === nodeInstanceId);
  if (item) {
    item.customLinkMultiplier = parseInt(multiplierVal, 10) || 1;
    FacilityStore.notifyWorkspaceChange();
    renderTopology();
    renderTopologyInspector();
  }
}

function updateCustomLinkSpeed(nodeInstanceId, speedVal) {
  const item = projectBOM.find(i => i.instanceId === nodeInstanceId);
  if (item) {
    item.customLinkSpeed = speedVal || null;
    FacilityStore.notifyWorkspaceChange();
    renderTopology();
    renderTopologyInspector();
  }
}

// -----------------------------------------------------------
// Drag & Drop & Viewport Movement Engine
// -----------------------------------------------------------
function handleClusterMouseDown(e, clusterEl, loc) {
  if (!isTopologyModalVisible()) return;
  if (e.target.closest("button") || e.target.closest("select") || e.target.closest("input")) {
    return;
  }

  isCanvasDragging = true;
  dragStartPos = { x: e.clientX, y: e.clientY };
  draggedTopologyNode = {
    el: clusterEl,
    loc: loc
  };

  const viewport = document.getElementById("topologyCanvasViewport");
  const rect = viewport.getBoundingClientRect();
  topoDragOffset.x = (e.clientX - rect.left + viewport.scrollLeft) - (clusterEl.offsetLeft * topologyZoomLevel);
  topoDragOffset.y = (e.clientY - rect.top + viewport.scrollTop) - (clusterEl.offsetTop * topologyZoomLevel);

  e.stopPropagation();
}

function handleTopologyMouseMove(e) {
  if (!isTopologyModalVisible()) return;

  const viewport = document.getElementById("topologyCanvasViewport");
  if (!viewport) return;

  // Mode 1: Viewport Canvas Panning
  if (isViewportPanning) {
    const dx = e.clientX - panStart.x;
    const dy = e.clientY - panStart.y;
    viewport.scrollLeft = panStart.scrollLeft - dx;
    viewport.scrollTop = panStart.scrollTop - dy;
    return;
  }

  // Mode 2: Dragging a location cluster
  if (isCanvasDragging && draggedTopologyNode) {
    const rect = viewport.getBoundingClientRect();
    const newX = Math.max(30, ((e.clientX - rect.left + viewport.scrollLeft) - topoDragOffset.x) / topologyZoomLevel);
    const newY = Math.max(30, ((e.clientY - rect.top + viewport.scrollTop) - topoDragOffset.y) / topologyZoomLevel);

    draggedTopologyNode.el.style.left = `${Math.round(newX)}px`;
    draggedTopologyNode.el.style.top = `${Math.round(newY)}px`;

    renderTopologyLinks();
  }
}

function handleTopologyMouseUp(e) {
  const viewport = document.getElementById("topologyCanvasViewport");
  if (isViewportPanning && viewport) {
    isViewportPanning = false;
    viewport.style.cursor = "grab";
  }

  if (isCanvasDragging && draggedTopologyNode) {
    isCanvasDragging = false;
    saveTopologyPosition(draggedTopologyNode.loc, draggedTopologyNode.el.offsetLeft, draggedTopologyNode.el.offsetTop);
    
    // If movement was minimal (< 5px), treat as a click to select the rack
    if (e && Math.hypot(e.clientX - dragStartPos.x, e.clientY - dragStartPos.y) < 5) {
      selectTopologyRack(draggedTopologyNode.loc);
    }
    draggedTopologyNode = null;
  }
}

// -----------------------------------------------------------
// Position State & Auto-Arrange Hierarchy
// -----------------------------------------------------------
function autoArrangeTopologyHierarchy(layoutMode = null) {
  if (typeof projectBOM === "undefined") return;

  if (!layoutMode) {
    const modeSelect = document.getElementById("topologyLayoutMode");
    layoutMode = modeSelect ? modeSelect.value : "tree";
  }

  const positions = {};
  const activeNodes = projectBOM.filter(item => {
    if (item.parentInstanceId) return false;
    const loc = FacilityStore.normalize(item.closetName || item.rackId);
    return loc !== FacilityStore.UNASSIGNED;
  });

  // Collect unique locations and categorize by primary role
  const locMap = {};
  activeNodes.forEach(item => {
    let loc;
    const isField = (typeof FacilityStore !== "undefined" && typeof FacilityStore.isFieldDevice === "function") 
      ? FacilityStore.isFieldDevice(item) 
      : (item.role === "Camera" || item.role === "Access Control" || item.role === "Intercom");

    if (topologyGroupingMode === "floor" && isField) {
      const floorName = (typeof FacilityStore !== "undefined" && typeof FacilityStore.getDevicePhysicalFloor === "function")
        ? FacilityStore.getDevicePhysicalFloor(item)
        : "Main Floor";
      loc = `${floorName} • Field Drops`;
    } else {
      loc = FacilityStore.normalize(item.closetName || item.rackId);
      const curLocLower = (loc || "").toLowerCase();
      if ((curLocLower === "field" || curLocLower.endsWith("• field") || curLocLower === "unassigned") && isField) {
        const floorName = (typeof FacilityStore !== "undefined" && typeof FacilityStore.getDevicePhysicalFloor === "function")
          ? FacilityStore.getDevicePhysicalFloor(item)
          : "Main Floor";
        loc = `${floorName} • Field Drops`;
      }
    }

    if (!locMap[loc]) locMap[loc] = [];
    locMap[loc].push(item);
  });

  const allLocs = Object.keys(locMap);
  if (allLocs.length === 0) return;

  if (layoutMode === "hub_spoke") {
    // Hub and Spoke Star Pattern
    const hubLoc = allLocs.find(loc => 
      locMap[loc].some(i => i.role === "Core" || i.role === "Core & Agg" || i.role === "Gateways & WAN")
    ) || allLocs[0];

    const spokes = allLocs.filter(l => l !== hubLoc);
    const centerX = 800;
    const centerY = 480;
    positions[hubLoc] = { x: centerX - 140, y: centerY - 80 };

    const spokeCount = spokes.length;
    const radiusX = Math.max(460, spokeCount * 80);
    const radiusY = Math.max(300, spokeCount * 55);

    spokes.forEach((loc, idx) => {
      const theta = (2 * Math.PI * idx) / (spokeCount || 1) - (Math.PI / 2);
      positions[loc] = {
        x: Math.round(centerX + radiusX * Math.cos(theta) - 140),
        y: Math.round(centerY + radiusY * Math.sin(theta) - 80)
      };
    });
  } else if (layoutMode === "ring") {
    // Resilient Circular / Perimeter Ring Loop
    const totalCount = allLocs.length;
    const centerX = 800;
    const centerY = 500;
    const radiusX = Math.max(500, totalCount * 95);
    const radiusY = Math.max(350, totalCount * 65);

    allLocs.forEach((loc, idx) => {
      const theta = (2 * Math.PI * idx) / totalCount - (Math.PI / 2);
      positions[loc] = {
        x: Math.round(centerX + radiusX * Math.cos(theta) - 140),
        y: Math.round(centerY + radiusY * Math.sin(theta) - 80)
      };
    });
  } else {
    // Default Tiered Tree Hierarchy
    const gateways = [];
    const coreAgg = [];
    const access = [];
    const others = [];

    Object.entries(locMap).forEach(([loc, items]) => {
      if (items.some(i => i.role === "Gateways & WAN" || i.role === "Security WAN")) {
        gateways.push(loc);
      } else if (items.some(i => i.role === "Core" || i.role === "Core & Agg" || i.role === "Aggregation" || i.role === "Server")) {
        coreAgg.push(loc);
      } else if (items.some(i => i.role === "Access")) {
        access.push(loc);
      } else {
        others.push(loc);
      }
    });

    // Layout Tier 1: Gateways (Top)
    gateways.forEach((loc, idx) => {
      positions[loc] = { x: 80 + (idx * 400), y: 80 };
    });

    // Layout Tier 2: Core & Distribution Aggregation (Middle)
    const coreY = gateways.length > 0 ? 320 : 80;
    coreAgg.forEach((loc, idx) => {
      positions[loc] = { x: 80 + (idx * 400), y: coreY };
    });

    // Layout Tier 3: Access Closets (Lower Tier)
    const accessY = coreY + (coreAgg.length > 0 ? 340 : 0);
    access.forEach((loc, idx) => {
      positions[loc] = { x: 80 + (idx * 400), y: accessY };
    });

    // Layout Tier 4: Field & Wireless (Bottom)
    const othersY = accessY + (access.length > 0 ? 360 : 0);
    others.forEach((loc, idx) => {
      positions[loc] = { x: 80 + (idx * 420), y: othersY };
    });
  }

  // Save to persistence
  try {
    const projKey = FacilityStore.getProjectId();
    localStorage.setItem(`netselect_topo_pos_${projKey}`, JSON.stringify(positions));
  } catch (e) {}

  renderTopology();
  renderTopologyInspector();
  if (typeof showToast === "function") {
    const label = layoutMode === "hub_spoke" ? "Hub & Spoke Star" : (layoutMode === "ring" ? "Resilient Ring Loop" : "Tiered Tree Hierarchy");
    showToast(`Arranged topology into clean ${label}.`);
  }
}

function saveTopologyPosition(loc, x, y) {
  try {
    const projKey = FacilityStore.getProjectId();
    const positions = loadTopologyPositions();
    positions[loc] = { x, y };
    localStorage.setItem(`netselect_topo_pos_${projKey}`, JSON.stringify(positions));
  } catch (e) {}
}

function loadTopologyPositions() {
  try {
    const projKey = FacilityStore.getProjectId();
    const raw = localStorage.getItem(`netselect_topo_pos_${projKey}`);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function autoDefaultTopology() {
  autoArrangeTopologyHierarchy();
}

function updateTopologyCounters(nodesCount, linksCount, poeFlowWatts = 0) {
  const nEl = document.getElementById("topologyNodesCount");
  const lEl = document.getElementById("topologyLinksCount");
  const pEl = document.getElementById("topologyTotalPoEFlow");
  if (nEl) nEl.innerText = `${nodesCount} Nodes`;
  if (lEl) lEl.innerText = `${linksCount} Trunks`;
  if (pEl) pEl.innerText = `${poeFlowWatts.toLocaleString()}W PoE Flow`;
}

// -----------------------------------------------------------
// Logical Services & Routing Helpers
// -----------------------------------------------------------
function updateSwitchVmsServer(switchInstanceId, serverInstanceId) {
  const item = projectBOM.find(i => i.instanceId === switchInstanceId);
  if (item) {
    item.assignedVmsServerId = serverInstanceId || null;
    FacilityStore.notifyWorkspaceChange();
    renderTopology();
    renderTopologyInspector();
  }
}

function updateSwitchAccessServer(switchInstanceId, serverInstanceId) {
  const item = projectBOM.find(i => i.instanceId === switchInstanceId);
  if (item) {
    item.assignedAccessServerId = serverInstanceId || null;
    FacilityStore.notifyWorkspaceChange();
    renderTopology();
    renderTopologyInspector();
  }
}

function toggleServerRole(serverInstanceId, roleName) {
  const item = projectBOM.find(i => i.instanceId === serverInstanceId);
  if (item) {
    if (!item.hostedRoles) item.hostedRoles = [];
    const idx = item.hostedRoles.indexOf(roleName);
    if (idx >= 0) {
      item.hostedRoles.splice(idx, 1);
    } else {
      item.hostedRoles.push(roleName);
    }
    FacilityStore.notifyWorkspaceChange();
    renderTopology();
    renderTopologyInspector();
  }
}

function setDevicePowerSource(deviceInstanceId, newPowerSource) {
  const item = projectBOM.find(i => i.instanceId === deviceInstanceId);
  if (!item) return;
  if (typeof PortEngine !== "undefined") {
    PortEngine.setPowerSource(item, newPowerSource);
  } else {
    item.powerSourceOverride = newPowerSource;
  }
  FacilityStore.notifyWorkspaceChange();
  renderTopology();
  renderTopologyInspector();
  if (typeof showToast === "function") {
    const modeDef = (typeof POWER_SOURCE_MODES !== "undefined" && POWER_SOURCE_MODES[newPowerSource]) || { label: newPowerSource };
    showToast(`Set ${item.model} power to ${modeDef.label}`);
  }
}

function setDeviceHostSwitch(deviceInstanceId, newSwitchId) {
  const item = projectBOM.find(i => i.instanceId === deviceInstanceId);
  if (!item) return;
  const oldSwitchId = item.uplinkTargetId;
  item.uplinkTargetId = newSwitchId || null;
  if (typeof PortEngine !== "undefined") {
    if (oldSwitchId) {
      const oldSw = projectBOM.find(i => i.instanceId === oldSwitchId);
      if (oldSw) PortEngine.disconnectPort(oldSw, item.assignedSwitchPort);
    }
    if (newSwitchId) {
      delete item.unassignedByUser;
      const newSw = projectBOM.find(i => i.instanceId === newSwitchId);
      if (newSw) {
        PortEngine.allocatePort(newSw, item);
        const swLoc = newSw.closetName || newSw.rackId;
        if (swLoc) {
          item.closetName = swLoc;
          item.rackId = swLoc;
          if (typeof facilityFloors !== "undefined" && Array.isArray(facilityFloors)) {
            const allClosets = (typeof getAllClosetsAcrossFacility === "function") ? getAllClosetsAcrossFacility() : [];
            const matchCl = allClosets.find(c => c.name === swLoc || swLoc.startsWith(c.name));
            facilityFloors.forEach(fl => {
              const drop = (fl.nodes || []).find(n => n.instanceId === item.instanceId || n.id === `dev-${item.instanceId}` || n.id === item.instanceId);
              if (drop && matchCl) {
                drop.assignedClosetId = matchCl.id;
              }
            });
          }
        }
      }
    } else {
      item.assignedSwitchPort = null;
    }
  }
  FacilityStore.notifyWorkspaceChange();
  if (typeof recalculateCurrentFloorCables === "function") recalculateCurrentFloorCables();
  if (typeof renderCableCanvas === "function") renderCableCanvas();
  renderTopology();
  renderTopologyInspector();
  if (typeof showToast === "function") showToast(`Reassigned ${item.model} to new host switch`);
}

function setDeviceSwitchPort(deviceInstanceId, newPortNumber) {
  const item = projectBOM.find(i => i.instanceId === deviceInstanceId);
  if (!item || !item.uplinkTargetId) return;
  const sw = projectBOM.find(i => i.instanceId === item.uplinkTargetId);
  if (!sw) return;
  if (typeof PortEngine !== "undefined") {
    PortEngine.connect(sw, parseInt(newPortNumber, 10), item, 1);
  } else {
    item.assignedSwitchPort = parseInt(newPortNumber, 10);
  }
  FacilityStore.notifyWorkspaceChange();
  renderTopology();
  renderTopologyInspector();
  if (typeof showToast === "function") showToast(`Assigned ${item.model} to Port ${newPortNumber}`);
}

function toggleRadioUplinkRole(radioInstanceId, isUplink) {
  const radio = projectBOM.find(i => i.instanceId === radioInstanceId);
  if (!radio) return;
  radio.isUplinkForSwitch = isUplink;
  if (radio.uplinkTargetId) {
    const sw = projectBOM.find(i => i.instanceId === radio.uplinkTargetId);
    if (sw) {
      if (isUplink) {
        sw.customUplinkTargetId = radio.instanceId;
      } else if (sw.customUplinkTargetId === radio.instanceId) {
        sw.customUplinkTargetId = null;
      }
    }
  }
  FacilityStore.notifyWorkspaceChange();
  renderTopology();
  renderTopologyInspector();
  if (typeof showToast === "function") {
    showToast(isUplink ? `Set ${radio.model} as uplink for host switch` : `Cleared radio uplink role`);
  }
}

function updateRadioPartner(radioInstanceId, partnerInstanceId) {
  const radio = projectBOM.find(i => i.instanceId === radioInstanceId);
  if (radio) {
    radio.customUplinkTargetId = partnerInstanceId || null;
    FacilityStore.notifyWorkspaceChange();
    renderTopology();
    renderTopologyInspector();
  }
}

function inspectSwitchPort(switchInstanceId, portNum) {
  const sw = projectBOM.find(i => i.instanceId === switchInstanceId);
  if (!sw || typeof PortEngine === "undefined") return;
  const ports = PortEngine.initSwitchPorts(sw);
  const port = ports.find(p => p.portNumber === parseInt(portNum, 10));
  if (!port) return;

  if (port.connectedDeviceId) {
    const targetDev = projectBOM.find(i => i.instanceId === port.connectedDeviceId);
    const targetName = targetDev ? targetDev.model : (port.connectedDeviceModel || "Connected Device");
    const targetLoc = targetDev ? (targetDev.closetName || targetDev.rackId || "Space") : "Location";
    selectTopologyNode(port.connectedDeviceId);
    panNodeIntoView(port.connectedDeviceId);
    if (typeof showToast === "function") {
      showToast(`${port.label} &rarr; Navigated to ${targetName} (${targetLoc})`);
    }
  } else {
    if (typeof showToast === "function") {
      showToast(`${port.label} (${port.speed}) is free / unpopulated.`);
    }
  }
}

// -----------------------------------------------------------
// Rack Enclosure & Navigation Helpers
// -----------------------------------------------------------
function updateDeviceLocation(instanceId, newLoc) {
  const item = projectBOM.find(i => i.instanceId === instanceId);
  if (!item || !newLoc) return;
  const parsed = FacilityStore.parse(newLoc);
  item.closetName = newLoc;
  item.rackId = parsed.enclosure || newLoc;
  if (parsed.space) item.spaceName = parsed.space;

  FacilityStore.notifyWorkspaceChange();
  renderTopology();
  renderTopologyInspector();
  panNodeIntoView(instanceId);
  if (typeof showToast === "function") {
    showToast(`Moved ${item.model} to ${newLoc}`);
  }
}

// -----------------------------------------------------------
// Searchable Quick Navigator (Combobox & Filter Engine)
// -----------------------------------------------------------
let topologySearchActiveIndex = -1;

function getTopologySearchItems() {
  const items = [];
  const groups = {};

  if (typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) {
    projectBOM.forEach(item => {
      if (item.parentInstanceId) return;
      if (item.role === "Structured Cabling" || item.role === "Optics & DAC") return;
      if (item.role === "Mgmt License" || item.role === "Security License" || item.role === "Feature License") return;
      if (item.role === "Accessory") return;

      const loc = FacilityStore.normalize(item.closetName || item.rackId);
      if (loc === FacilityStore.UNASSIGNED) return;
      if (!groups[loc]) groups[loc] = [];
      groups[loc].push(item);
    });
  }

  // 1. Racks & Enclosures
  Object.keys(groups).forEach(loc => {
    const chassisList = groups[loc];
    items.push({
      targetVal: `loc:${loc}`,
      name: loc,
      badge: `${chassisList.length} Chassis`,
      category: "Racks & Closets",
      icon: "🏢",
      searchText: `${loc} rack enclosure closet cabinet ${chassisList.map(c => c.model).join(' ')}`.toLowerCase()
    });
  });

  // 2. Chassis & Connected Devices by Category
  Object.keys(groups).forEach(loc => {
    groups[loc].forEach(item => {
      let category = "Connected Devices";
      let icon = "🔌";

      if (item.role === "Core" || item.role === "Core & Agg" || item.role === "Aggregation" || item.role === "Gateways & WAN") {
        category = "Core & Aggregation";
        icon = "🌐";
      } else if (item.role === "Access") {
        category = "Access Switches";
        icon = "⚡";
      } else if (item.role === "Server" || item.role === "VMS Server" || item.role === "Compute & Storage") {
        category = "Servers & Ingest";
        icon = "🖥️";
      } else if (item.role === "Wireless Bridge" || item.category === "wireless") {
        category = "Wireless Bridges";
        icon = "📡";
      } else if (item.category === "camera" || item.role === "Security Camera") {
        category = "IP Cameras & Video";
        icon = "📹";
      } else if (item.category === "access_control" || item.role === "Access Control") {
        category = "Access Control & Intercom";
        icon = "🔐";
      }

      const pwr = (typeof PortEngine !== "undefined") ? PortEngine.getDevicePowerSource(item) : (item.powerSource || "");

      items.push({
        targetVal: `node:${item.instanceId}`,
        name: item.model,
        badge: `${loc} • ${item.role || category}`,
        category: category,
        icon: icon,
        searchText: `${item.model} ${loc} ${item.role || ''} ${category} ${item.partNumber || ''} ${item.notes || ''} ${pwr}`.toLowerCase()
      });
    });
  });

  return items;
}

function openTopologySearchMenu() {
  const input = document.getElementById("topologyQuickSearchInput");
  const query = input ? input.value : "";
  filterTopologySearch(query);
}

function filterTopologySearch(query) {
  const resultsContainer = document.getElementById("topologyQuickSearchResults");
  const clearBtn = document.getElementById("topologySearchClearBtn");
  if (!resultsContainer) return;

  const q = (query || "").trim().toLowerCase();
  if (clearBtn) {
    if (q.length > 0) clearBtn.classList.remove("hidden");
    else clearBtn.classList.add("hidden");
  }

  const allItems = getTopologySearchItems();
  const filtered = q ? allItems.filter(i => i.searchText.includes(q)) : allItems;

  if (filtered.length === 0) {
    resultsContainer.innerHTML = `
      <div class="px-3 py-4 text-center text-xs text-slate-500 font-mono">
        No devices or racks matching "${escapeHTML(q)}"
      </div>
    `;
    resultsContainer.classList.remove("hidden");
    topologySearchActiveIndex = -1;
    return;
  }

  // Group by category
  const categories = {};
  filtered.forEach(item => {
    if (!categories[item.category]) categories[item.category] = [];
    categories[item.category].push(item);
  });

  let html = "";
  let itemCounter = 0;

  Object.keys(categories).forEach(cat => {
    html += `
      <div class="px-2 pt-1.5 pb-0.5 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center justify-between border-t border-slate-800/60 first:border-t-0">
        <span>${escapeHTML(cat)}</span>
        <span class="text-slate-500">${categories[cat].length}</span>
      </div>
    `;

    categories[cat].forEach(item => {
      const isSelected = (selectedTopologyRackLoc && item.targetVal === `loc:${selectedTopologyRackLoc}`) ||
                         (selectedTopologyNodeId && item.targetVal === `node:${selectedTopologyNodeId}`);
      
      html += `
        <button
          type="button"
          data-search-idx="${itemCounter}"
          data-target-val="${item.targetVal}"
          onclick="selectSearchItem('${item.targetVal}', '${escapeHTML(item.name)}')"
          class="w-full text-left px-2 py-1.5 rounded-lg flex items-center justify-between gap-2 text-xs transition-colors group cursor-pointer ${
            isSelected ? 'bg-indigo-950/70 border border-indigo-500/40 text-white' : 'text-slate-200 hover:bg-slate-850 hover:text-white'
          }"
        >
          <div class="flex items-center gap-2 min-w-0">
            <span class="text-sm shrink-0">${item.icon}</span>
            <div class="truncate">
              <div class="font-medium truncate group-hover:text-indigo-300 transition-colors">${escapeHTML(item.name)}</div>
              <div class="text-[10px] text-slate-400 font-mono truncate">${escapeHTML(item.badge)}</div>
            </div>
          </div>
          <i data-lucide="arrow-right" class="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"></i>
        </button>
      `;
      itemCounter++;
    });
  });

  resultsContainer.innerHTML = html;
  resultsContainer.classList.remove("hidden");
  topologySearchActiveIndex = -1;

  if (typeof safeCreateIcons === "function") {
    safeCreateIcons(resultsContainer);
  } else if (window.lucide) {
    lucide.createIcons();
  }
}

function selectSearchItem(targetVal, label) {
  const input = document.getElementById("topologyQuickSearchInput");
  const resultsContainer = document.getElementById("topologyQuickSearchResults");
  const clearBtn = document.getElementById("topologySearchClearBtn");

  if (input && label) {
    input.value = label;
  }
  if (resultsContainer) {
    resultsContainer.classList.add("hidden");
  }
  if (clearBtn) {
    clearBtn.classList.remove("hidden");
  }

  jumpToTopologyTarget(targetVal);
}

function clearTopologySearch() {
  const input = document.getElementById("topologyQuickSearchInput");
  const clearBtn = document.getElementById("topologySearchClearBtn");
  const resultsContainer = document.getElementById("topologyQuickSearchResults");

  if (input) {
    input.value = "";
    input.focus();
  }
  if (clearBtn) {
    clearBtn.classList.add("hidden");
  }
  if (resultsContainer) {
    resultsContainer.classList.add("hidden");
  }
  deselectTopologyNode();
}

function handleTopologySearchKey(e) {
  const resultsContainer = document.getElementById("topologyQuickSearchResults");
  if (!resultsContainer || resultsContainer.classList.contains("hidden")) {
    if (e.key === "ArrowDown" || e.key === "Enter") {
      openTopologySearchMenu();
    }
    return;
  }

  const buttons = Array.from(resultsContainer.querySelectorAll("button[data-search-idx]"));
  if (buttons.length === 0) return;

  if (e.key === "ArrowDown") {
    e.preventDefault();
    topologySearchActiveIndex = (topologySearchActiveIndex + 1) % buttons.length;
    highlightSearchItem(buttons);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    topologySearchActiveIndex = (topologySearchActiveIndex - 1 + buttons.length) % buttons.length;
    highlightSearchItem(buttons);
  } else if (e.key === "Enter") {
    e.preventDefault();
    if (topologySearchActiveIndex >= 0 && topologySearchActiveIndex < buttons.length) {
      buttons[topologySearchActiveIndex].click();
    } else if (buttons.length > 0) {
      buttons[0].click();
    }
  } else if (e.key === "Escape") {
    resultsContainer.classList.add("hidden");
  }
}

function highlightSearchItem(buttons) {
  buttons.forEach((btn, idx) => {
    if (idx === topologySearchActiveIndex) {
      btn.classList.add("bg-indigo-600", "text-white");
      btn.scrollIntoView({ block: "nearest", behavior: "smooth" });
    } else {
      btn.classList.remove("bg-indigo-600");
    }
  });
}

// Global click-outside listener to close quick search results menu
document.addEventListener("click", function(e) {
  const container = document.getElementById("topologyQuickSearchContainer");
  const results = document.getElementById("topologyQuickSearchResults");
  if (container && results && !container.contains(e.target)) {
    results.classList.add("hidden");
  }
});

function populateTopologyQuickJump() {
  const select = document.getElementById("topologyQuickJump");
  if (!select) return;

  const items = getTopologySearchItems();
  let html = `<option value="">Jump to Device / Rack...</option>`;
  items.forEach(item => {
    const isSel = (selectedTopologyRackLoc && item.targetVal === `loc:${selectedTopologyRackLoc}`) ||
                  (selectedTopologyNodeId && item.targetVal === `node:${selectedTopologyNodeId}`);
    html += `<option value="${item.targetVal}" ${isSel ? 'selected' : ''}>${item.icon} ${escapeHTML(item.name)} (${escapeHTML(item.badge)})</option>`;
  });
  select.innerHTML = html;
}

function updateSwitchStackFromTopology(instanceId, count) {
  if (typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) return;
  const item = projectBOM.find(i => i.instanceId === instanceId);
  if (!item) return;

  const val = parseInt(count, 10) || 0;
  if (val >= 2) {
    item.canStack = true;
    item.stackedUnits = val;
    item.qty = Math.max(item.qty || 1, val);
    item.uplinkMode = "lag_dual";
    item.customLinkMultiplier = Math.max(item.customLinkMultiplier || 1, val);
  } else {
    item.stackedUnits = 0;
  }

  if (typeof PortEngine !== "undefined") {
    PortEngine.initSwitchPorts(item, true);
  }

  if (typeof applyStackCabling === "function") {
    applyStackCabling(item);
  }

  if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
    FacilityStore.notifyWorkspaceChange();
  }

  renderTopology();
  renderTopologyInspector();
  if (typeof showToast === "function") {
    showToast(val >= 2 ? `Configured ${item.model} as a ${val}-Unit Switch Stack.` : `Configured ${item.model} as Standalone.`);
  }
}

function jumpToTopologyTarget(targetVal = null) {
  // 1. Capture navigation history before switching tools
  if (typeof NavigationHistory !== "undefined") {
    const st = NavigationHistory.captureCurrentState();
    if (st && st.tool !== "topology") NavigationHistory.push(st);
  }

  // 2. Close physical layout modal if open
  const physModal = document.getElementById("cableLayoutModal");
  if (physModal && !physModal.classList.contains("hidden")) {
    if (typeof toggleCableLayoutModal === "function") toggleCableLayoutModal();
  }

  // 3. Close facility modal if open
  const facModal = document.getElementById("facilityModal");
  if (facModal && !facModal.classList.contains("hidden")) {
    if (typeof toggleFacilityModal === "function") toggleFacilityModal();
  }

  // 4. Close BOM drawer if open so full topology canvas and inspector are visible
  const drawer = document.getElementById("bomDrawer");
  if (drawer && !drawer.classList.contains("translate-x-full")) {
    if (typeof toggleBomDrawer === "function") toggleBomDrawer();
  }

  // 5. Open topology modal if hidden
  const wasHidden = !isTopologyModalVisible();
  if (wasHidden && typeof toggleTopologyModal === "function") {
    toggleTopologyModal();
  }

  // 3. Jump to target after delay to allow canvas rendering
  if (targetVal) {
    setTimeout(() => {
      if (targetVal.startsWith("loc:")) {
        const loc = targetVal.substring(4);
        selectTopologyRack(loc);
        panClusterIntoView(loc);
      } else if (targetVal.startsWith("node:")) {
        const nodeId = targetVal.substring(5);
        const item = (typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) ? projectBOM.find(i => i.instanceId === nodeId) : null;
        if (item) {
          // If node has no valid closet, assign default so it displays in a rack cluster
          if (!item.closetName || item.closetName === FacilityStore.UNASSIGNED) {
            const def = (item.role === "Core" || item.role === "Aggregation") ? "MDF • Rack-1" : "IDF-1 • Rack-1";
            item.closetName = def;
            item.rackId = def;
            if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
              FacilityStore.notifyWorkspaceChange();
            }
            renderTopology();
          }
        }
        selectTopologyNode(nodeId);
        panNodeIntoView(nodeId);
      }
    }, wasHidden ? 160 : 60);
  }
}

// Window Compatibility Exports
window.isTopologyModalVisible = isTopologyModalVisible;
window.toggleTopologyModal = toggleTopologyModal;
window.initTopologyCanvas = initTopologyCanvas;
window.renderTopology = renderTopology;
window.zoomTopologyCanvas = zoomTopologyCanvas;
window.resetTopologyZoom = resetTopologyZoom;
window.fitTopologyToScreen = fitTopologyToScreen;
window.panClusterIntoView = panClusterIntoView;
window.panNodeIntoView = panNodeIntoView;
window.setTopologyViewPlane = setTopologyViewPlane;
window.toggleTopologyInspector = toggleTopologyInspector;
window.selectTopologyNode = selectTopologyNode;
window.selectTopologyRack = selectTopologyRack;
window.selectTopologyLink = selectTopologyLink;
window.deselectTopologyNode = deselectTopologyNode;
window.updateDeviceLocation = updateDeviceLocation;
window.populateTopologyQuickJump = populateTopologyQuickJump;
window.openTopologySearchMenu = openTopologySearchMenu;
window.filterTopologySearch = filterTopologySearch;
window.selectSearchItem = selectSearchItem;
window.clearTopologySearch = clearTopologySearch;
window.handleTopologySearchKey = handleTopologySearchKey;
window.jumpToTopologyTarget = jumpToTopologyTarget;
window.autoArrangeTopologyHierarchy = autoArrangeTopologyHierarchy;
window.autoDefaultTopology = autoDefaultTopology;
window.updateCustomUplink = updateCustomUplink;
window.updateCustomLinkMultiplier = updateCustomLinkMultiplier;
window.updateCustomLinkSpeed = updateCustomLinkSpeed;
window.updateSwitchVmsServer = updateSwitchVmsServer;
window.updateSwitchAccessServer = updateSwitchAccessServer;
window.toggleServerRole = toggleServerRole;
window.setDevicePowerSource = setDevicePowerSource;
window.setDeviceHostSwitch = setDeviceHostSwitch;
window.setDeviceSwitchPort = setDeviceSwitchPort;
window.toggleRadioUplinkRole = toggleRadioUplinkRole;
window.updateRadioPartner = updateRadioPartner;
window.inspectSwitchPort = inspectSwitchPort;
window.updateSwitchStackFromTopology = updateSwitchStackFromTopology;
window.toggleTopologyFieldDevices = toggleTopologyFieldDevices;
window.updateTopologyFieldDevicesButton = updateTopologyFieldDevicesButton;
window.autoSynthesizeInterconnects = autoSynthesizeInterconnects;
window.toggleTopologyLayerMenu = toggleTopologyLayerMenu;
window.setTopologyLayerFilter = setTopologyLayerFilter;
window.toggleAllTopologyLayers = toggleAllTopologyLayers;
window.updateTopologyLayerCountBadge = updateTopologyLayerCountBadge;
window.getTopologyDeviceLayer = getTopologyDeviceLayer;
window.setTopologyGroupingMode = setTopologyGroupingMode;
window.getProjectFiberType = getProjectFiberType;
window.setProjectFiberType = setProjectFiberType;
window.getLinkInterconnectOverrides = getLinkInterconnectOverrides;
window.setLinkInterconnectOverrides = setLinkInterconnectOverrides;
window.getLinkInterconnectOverride = getLinkInterconnectOverride;
window.updateLinkOverride = updateLinkOverride;
window.getDacLengthForUDiff = getDacLengthForUDiff;
window.getPatchCordLengthForUDiff = getPatchCordLengthForUDiff;
window.parseRackU = parseRackU;
window.calculateUDistance = calculateUDistance;
window.findDacItem = findDacItem;
window.findPatchCordItem = findPatchCordItem;
window.formatDacItem = formatDacItem;
window.syncRackInterconnectsAndCabling = syncRackInterconnectsAndCabling;
window.syncTopologyLinkToPhysicalLayout = syncTopologyLinkToPhysicalLayout;
window.isClosetNameMatch = isClosetNameMatch;
window.topologyLinks = topologyLinks;
window.linkInterconnectOverrides = linkInterconnectOverrides;

// Close menus when clicking outside
if (typeof document !== "undefined") {
  document.addEventListener("click", (e) => {
    const topoContainer = document.getElementById("topologyLayerFilterContainer");
    const topoMenu = document.getElementById("topologyLayerMenu");
    if (topoMenu && !topoMenu.classList.contains("hidden")) {
      if (topoContainer && !topoContainer.contains(e.target)) {
        topoMenu.classList.add("hidden");
      }
    }
    const physContainer = document.getElementById("physicalLayerFilterContainer");
    const physMenu = document.getElementById("physicalLayerMenu");
    if (physMenu && !physMenu.classList.contains("hidden")) {
      if (physContainer && !physContainer.contains(e.target)) {
        physMenu.classList.add("hidden");
      }
    }
  });
}
