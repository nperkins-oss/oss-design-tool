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

  const isRackDev = (item.rackUnits && parseInt(item.rackUnits, 10) > 0) || 
                    role === "Access" || role === "Core" || role === "Aggregation" || 
                    role === "Server" || role === "Storage" || role === "UPS" || 
                    role === "Structured Cabling" || role === "Core & Agg" || 
                    cat === "switch" || cat === "server" || cat === "ups";

  const isSecurityDev = cat === "access_control" || role === "Access Control" || 
                        item.doorCapacity || item.controllerType || 
                        /lp1501|lp1502|lp2500|lp4502|mr52|mr50|mr16|trove|fpo|eflow/i.test(model);

  const isDinDev = item.isDinMounted || /din/i.test(model) || item.mounting === "DIN" || cat === "industrial_din";

  const isEdgeField = role === "Surveillance" || role === "Video" || role === "Camera" || 
                      role === "Wireless Bridge" || role === "Wireless" || role === "Access Point" || 
                      role === "Accessory" || role === "Field" || role === "Sensor" || 
                      role === "Audio/Intercom" || cat === "surveillance" || cat === "cameras" || 
                      cat === "wireless" || cat === "field_hardware" || item.isFieldDevice === true ||
                      /camera|cam|dome|bullet|ptz|turret|fisheye|multisensor|nanobeam|gigabeam|airmax|wave|unifi\s*ap|access\s*point|intercom|horn|sensor|reader|keypad/i.test(modelLower);

  if (hostType === "equipment_rack") {
    if (isEdgeField) {
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
// Rack PDU Configuration & Persistence (Dual 0U, Single 0U, Horizontal 1U)
// -----------------------------------------------------------
function getRackPduConfig() {
  const parsed = FacilityStore.parse(activeRackId);
  const enclosures = FacilityStore.getEnclosures();
  const activeEnc = enclosures.find(e => e.id === parsed.hostId) || enclosures.find(e => e.name.toLowerCase() === parsed.hostName.toLowerCase()) || null;
  const saved = localStorage.getItem(`rack_pdu_config_${activeRackId}`);
  if (saved) return saved;
  if (activeEnc && activeEnc.pduConfig) return activeEnc.pduConfig;
  return "dual_vertical";
}

function setRackPduConfig(val) {
  const parsed = FacilityStore.parse(activeRackId);
  localStorage.setItem(`rack_pdu_config_${activeRackId}`, val);
  if (parsed.hostId) {
    FacilityStore.updateHost(parsed.hostId, { pduConfig: val });
  }
  const sel = document.getElementById("rackPduConfigSelect");
  if (sel) sel.value = val;
  renderRackVisualizer();
  if (typeof showToast === "function") {
    const labels = {
      dual_vertical: "Dual 0U Vertical (A+B)",
      single_vertical: "Single 0U Vertical (Feed A)",
      horizontal: "Horizontal 1U Rackmount PDU"
    };
    showToast(`PDU configuration set to ${labels[val] || val}`);
  }
}
window.getRackPduConfig = getRackPduConfig;
window.setRackPduConfig = setRackPduConfig;

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
  const rackLocations = locations.filter(l => l.hostType !== "field" && !l.isField);
  const rackNames = rackLocations.map(l => l.name);

  activeRackId = FacilityStore.normalize(activeRackId);
  const parsedCheck = FacilityStore.parse(activeRackId);
  if (activeRackId === FacilityStore.UNASSIGNED || parsedCheck.isField || !rackNames.includes(activeRackId)) {
    activeRackId = rackNames[0] || "MDF • Rack-1";
  }

  const parsed = FacilityStore.parse(activeRackId);
  const enclosures = FacilityStore.getEnclosures();
  const activeEnc = enclosures.find(e => e.id === parsed.hostId) || enclosures.find(e => e.name.toLowerCase() === parsed.hostName.toLowerCase()) || null;

  // Populate Enclosure Dropdown with Type Badges
  if (sel) {
    sel.innerHTML = rackLocations.map(loc => {
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
      const stackUnits = (item.stackedUnits && item.stackedUnits >= 2) ? item.stackedUnits : 1;
      const itemHeight = parseInt(item.rackUnits || 1, 10) * stackUnits;
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
      const stackUnits = (item.stackedUnits && item.stackedUnits >= 2) ? item.stackedUnits : 1;
      const itemHeight = parseInt(item.rackUnits || 1, 10) * stackUnits;
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

  const locations = FacilityStore.getLocations(false);
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

  let html = `
    <div class="p-2.5 bg-slate-950/80 border border-slate-800 rounded-xl shadow-inner">
      <div class="flex items-center justify-between mb-2">
        <span class="text-[10px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <i data-lucide="arrow-left-right" class="w-3.5 h-3.5 text-indigo-400"></i>
          <span>Mounting Locations (Drag hardware here to transfer)</span>
        </span>
        <span class="text-[10px] font-mono text-slate-500">
          ${locations.length} Location${locations.length === 1 ? '' : 's'}
        </span>
      </div>
      <div class="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
  `;

  locations.forEach(loc => {
    const isCurrent = loc.name === activeRackId;
    const typeDef = FacilityStore.HOST_TYPES[loc.hostType] || FacilityStore.HOST_TYPES.equipment_rack;
    const count = counts[loc.name] || 0;

    if (isCurrent) {
      html += `
        <div class="shrink-0 px-3 py-1.5 rounded-lg bg-indigo-950/90 border-2 border-indigo-500 text-white flex items-center gap-2 shadow-sm select-none">
          <i data-lucide="${typeDef.icon || 'server'}" class="w-3.5 h-3.5 text-indigo-300"></i>
          <span class="text-xs font-bold font-mono">${escapeHTML(loc.name)}</span>
          <span class="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-800 text-indigo-200 font-bold">${count}</span>
          <span class="text-[9px] font-mono uppercase bg-indigo-500/30 text-indigo-200 px-1 rounded border border-indigo-400/40">Active</span>
        </div>
      `;
    } else {
      html += `
        <div 
          class="group shrink-0 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-700/80 text-slate-300 hover:text-white flex items-center gap-2 transition-all cursor-pointer shadow-sm select-none"
          title="Click to view or drag equipment here to transfer"
          onclick="switchActiveRackElevation('${escapeHTML(loc.name)}')"
          ondragover="handleLocationTransferDragOver(event)"
          ondragleave="handleLocationTransferDragLeave(event)"
          ondrop="handleLocationTransferDrop(event, '${escapeHTML(loc.name)}')"
        >
          <i data-lucide="${typeDef.icon || 'server'}" class="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-400 transition-colors"></i>
          <span class="text-xs font-medium font-mono">${escapeHTML(loc.name)}</span>
          <span class="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 group-hover:text-slate-200 font-bold">${count}</span>
        </div>
      `;
    }
  });

  html += `
        <div 
          class="shrink-0 px-3 py-1.5 rounded-lg bg-amber-950/30 hover:bg-amber-950/50 border border-dashed border-amber-600/50 text-amber-300 flex items-center gap-2 transition-all cursor-pointer shadow-sm select-none ml-auto"
          title="Drag equipment here to unmount and return to Unassigned shelf"
          ondragover="handleLocationTransferDragOver(event)"
          ondragleave="handleLocationTransferDragLeave(event)"
          ondrop="handleLocationTransferDrop(event, 'Unassigned')"
        >
          <i data-lucide="inbox" class="w-3.5 h-3.5 text-amber-400"></i>
          <span class="text-xs font-semibold font-mono">Unassigned Bin</span>
          <span class="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-900/60 text-amber-200 font-bold">${unassignedCount}</span>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;
}

// -----------------------------------------------------------
// Main Visualizer Router
// -----------------------------------------------------------
function renderRackVisualizer() {
  const frame = document.getElementById("rackElevationFrame");
  if (!frame) return;

  syncRackSelectorOptions();
  renderRackLocationTransferBar();

  const parsed = FacilityStore.parse(activeRackId);
  const hostType = parsed.hostType || "equipment_rack";
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
    const baseRU = parseInt(item.rackUnits || 1, 10);
    const itemHeight = baseRU * stackUnits;
    const assignedU = parseInt(item.rackSlot, 10);

    if (assignedU && assignedU >= 1 && (assignedU + itemHeight - 1) <= activeRackHeight) {
      if (!isCollision(slots, assignedU, itemHeight, item.instanceId)) {
        for (let offset = 0; offset < itemHeight; offset++) {
          slots[assignedU + offset] = {
            item,
            isBase: offset === 0,
            span: itemHeight,
            baseRU,
            stackUnits
          };
        }
      }
    }
  });

  if (rackViewOrientation === "rear") {
    renderEquipmentRackRearFrame(frame, assignedItems, slots, activeRackHeight, activeEnc);
  } else {
    renderEquipmentRackFrontFrame(frame, assignedItems, slots, activeRackHeight);
  }

  const badgeEl = document.getElementById("rackUtilizationBadge");
  const occupiedU = Object.values(slots).filter(s => s && s.isBase).reduce((acc, s) => acc + s.span, 0);
  if (badgeEl) badgeEl.innerText = `${occupiedU} / ${activeRackHeight} U Used`;
}

function renderEquipmentRackFrontFrame(frame, assignedItems, slots, maxU) {
  let railHTML = "";

  for (let u = maxU; u >= 1; u--) {
    const slotData = slots[u];

    if (slotData) {
      if (slotData.isBase) {
        const it = slotData.item;
        const compat = checkDeviceHostCompatibility(it, "equipment_rack");
        const stackUnits = (it.stackedUnits && it.stackedUnits >= 2) ? it.stackedUnits : 1;
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
            ondrop="handleRackSlotDrop(event, ${u})"
            style="min-height: ${Math.max(44, slotData.span * 46)}px;"
          >
            <div class="flex items-center justify-between w-full">
              <div class="flex items-center gap-3 min-w-0">
                <span class="text-[11px] font-mono font-bold text-indigo-400 w-14 shrink-0">${uLabel}</span>
                <div class="min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="text-xs font-bold text-white truncate">${escapeHTML(it.model)}</span>
                    <span class="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-950 text-slate-400 border border-slate-800">FRONT</span>
                    <!-- Status LEDs -->
                    <div class="flex items-center gap-1 text-[8px] font-mono">
                      <span class="px-1 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60 font-bold" title="Power Supply Good">PWR ●</span>
                      <span class="px-1 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60 font-bold" title="System Normal">SYS ●</span>
                      ${totalPoEWatts > 0 ? `<span class="px-1 py-0.2 rounded bg-sky-950 text-sky-400 border border-sky-800/60 font-bold" title="PoE Active">POE ●</span>` : ''}
                    </div>
                  </div>
                  <div class="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                    <span>${escapeHTML(it.vendor || 'Generic')}</span>
                    <span>&bull;</span>
                    <span>${slotData.span}U</span>
                    <span>&bull;</span>
                    ${portPreview ? `<span class="text-indigo-300 font-semibold">${portPreview}</span><span>&bull;</span>` : ''}
                    <span>${totalBaseWatts}W Base${totalPoEWatts > 0 ? ` + ${totalPoEWatts}W PoE` : ''}</span>
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-1.5 shrink-0">
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
                ${stackUnits >= 2 ? `
                  <span class="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-700/60 flex items-center gap-1" title="${stackUnits}-Switch Virtual Stack (${slotData.span}U total)">
                    <i data-lucide="layers" class="w-3 h-3"></i> ${stackUnits}x Stack
                  </span>
                ` : ''}
                ${!compat.compatible ? `
                  <span class="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800" title="${compat.advisory}">⚠️ Bracket Req</span>
                ` : ''}
                <span class="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 ${getRoleColor(it.role)}">${escapeHTML(it.role || 'Hardware')}</span>
                <button onclick="unmountRackItem('${it.instanceId}')" class="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-400 transition-opacity" title="Unmount to Staging">
                  <i data-lucide="inbox" class="w-3.5 h-3.5"></i>
                </button>
              </div>
            </div>

            ${stackUnits >= 2 ? `
              <!-- Multi-Chassis Stack Member Breakdown Bar -->
              <div class="mt-1.5 pt-1.5 border-t border-slate-800/80 flex items-center gap-1.5 flex-wrap text-[9px] font-mono text-slate-400">
                ${Array.from({ length: stackUnits }, (_, idx) => `
                  <span class="px-1.5 py-0.5 rounded bg-slate-950/90 border border-slate-800 ${idx === 0 ? 'text-sky-300 font-bold border-sky-500/40' : 'text-slate-300'}">
                    Unit ${idx + 1} (${idx === 0 ? 'Master Chassis' : 'Member Chassis'} &bull; ${parseInt(it.rackUnits || 1, 10)}U)
                  </span>
                `).join('')}
                <span class="text-indigo-400 font-semibold flex items-center gap-1">
                  <i data-lucide="link" class="w-2.5 h-2.5"></i> ${stackUnits === 2 ? '1x 100G Stack Link' : `${stackUnits}x Ring Stack Links`}
                </span>
              </div>
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

  frame.innerHTML = `<div class="space-y-1 w-full">${railHTML}</div>`;
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
            ondrop="handleRackSlotDrop(event, ${u})"
            style="min-height: ${Math.max(48, slotData.span * 48)}px;"
          >
            <div class="flex items-center justify-between w-full gap-2">
              <div class="flex items-center gap-2.5 min-w-0">
                <span class="text-[11px] font-mono font-bold text-slate-400 w-12 shrink-0">${uLabel}</span>
                <div class="min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="text-xs font-bold text-white truncate">${escapeHTML(it.model)}</span>
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

                <!-- Unmount Button -->
                <button onclick="unmountRackItem('${it.instanceId}')" class="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-400 transition-opacity ml-0.5" title="Unmount to Staging">
                  <i data-lucide="inbox" class="w-3.5 h-3.5"></i>
                </button>
              </div>
            </div>

            ${stackUnits >= 2 ? `
              <!-- Rear Stack Member Interconnect Bar -->
              <div class="mt-1.5 pt-1.5 border-t border-slate-800 flex items-center justify-between text-[9px] font-mono text-slate-400">
                <span class="text-indigo-400 font-semibold flex items-center gap-1">
                  <i data-lucide="link" class="w-2.5 h-2.5"></i> Dual 100G Direct-Attach Ring Cables
                </span>
                <span class="text-slate-500">${stackUnits}x Chassis Connected</span>
              </div>
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

  // Branch layout based on pduConfig:
  if (isHorizontalPdu) {
    // 1-Column Full-Width with Top 1U Horizontal PDU Bar
    frame.innerHTML = `
      <div class="w-full space-y-2">
        <!-- 1U Horizontal Rackmount PDU Strip Bar -->
        <div class="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-indigo-500/50 rounded-xl p-3 shadow-xl select-none">
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

        <!-- Center Rear 19" Equipment Rail (Full Width) -->
        <div class="space-y-1 w-full">
          ${rearRailHTML}
        </div>
      </div>
    `;
  } else if (isSinglePdu) {
    // 2-Column Layout: Left Single 0U Vertical PDU Strip | Center Rear Equipment Rails
    frame.innerHTML = `
      <div class="flex gap-2 sm:gap-3 w-full items-stretch">
        <!-- Single 0U Vertical PDU Channel -->
        <div class="w-24 sm:w-28 shrink-0 bg-slate-950 border border-slate-800 rounded-xl p-2.5 flex flex-col justify-between select-none shadow-md">
          <div class="space-y-1 border-b border-slate-800 pb-2 text-center">
            <div class="flex items-center justify-center gap-1 text-[11px] font-bold text-emerald-400">
              <i data-lucide="zap" class="w-3 h-3"></i> 0U PDU
            </div>
            <span class="text-[9px] text-slate-400 uppercase font-mono block">Single Feed A</span>
            <span class="text-[10px] font-mono font-bold text-white block">${pduMetrics.pduA.amps}A / 16A</span>
            <span class="text-[9px] font-mono text-slate-500 block">${pduMetrics.pduA.watts}W (${pduMetrics.pduA.pct}%)</span>
            <div class="w-full bg-slate-900 rounded-full h-1 mt-1 overflow-hidden">
              <div class="${pduMetrics.pduA.pct > 80 ? 'bg-rose-500' : 'bg-emerald-500'} h-1 rounded-full" style="width: ${pduMetrics.pduA.pct}%"></div>
            </div>
          </div>

          <!-- Vertical 24-Receptacle Visualizer -->
          <div class="py-2 space-y-1 flex-1 flex flex-col justify-around">
            ${Array.from({ length: 12 }, (_, oIdx) => {
              const isOccupied = (oIdx * 2) < pduMetrics.pduA.outletsUsed;
              return `
                <div class="flex items-center justify-between px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800/80 text-[8px] font-mono ${isOccupied ? 'border-emerald-500/50 bg-emerald-950/30' : ''}">
                  <span class="text-slate-500">${oIdx + 1}</span>
                  <span class="${isOccupied ? 'text-emerald-400 font-bold' : 'text-slate-700'}">●</span>
                </div>
              `;
            }).join('')}
          </div>

          <div class="pt-2 border-t border-slate-800 text-center">
            <span class="text-[8px] font-mono text-slate-400 block">${pduMetrics.pduA.outletsUsed}/24 Outlets</span>
            <span class="text-[8px] font-mono text-slate-500 block">NEMA 5-20R</span>
          </div>
        </div>

        <!-- Center Rear 19" Equipment Rail (Expanded) -->
        <div class="flex-1 min-w-0 space-y-1">
          ${rearRailHTML}
        </div>
      </div>
    `;
  } else {
    // 3-Column Layout: Left PDU-A Strip | Center Rear Equipment Rails | Right PDU-B Strip
    frame.innerHTML = `
      <div class="flex gap-2 sm:gap-3 w-full items-stretch">
        <!-- PDU-A Left Vertical 0U Channel -->
        <div class="w-20 sm:w-24 shrink-0 bg-slate-950 border border-slate-800 rounded-xl p-2 flex flex-col justify-between select-none shadow-md">
          <div class="space-y-1 border-b border-slate-800 pb-2 text-center">
            <div class="flex items-center justify-center gap-1 text-[11px] font-bold text-emerald-400">
              <i data-lucide="zap" class="w-3 h-3"></i> PDU-A
            </div>
            <span class="text-[9px] text-slate-400 uppercase font-mono block">Feed A (Util)</span>
            <span class="text-[10px] font-mono font-bold text-white block">${pduMetrics.pduA.amps}A / 16A</span>
            <span class="text-[9px] font-mono text-slate-500 block">${pduMetrics.pduA.watts}W (${pduMetrics.pduA.pct}%)</span>
            <div class="w-full bg-slate-900 rounded-full h-1 mt-1 overflow-hidden">
              <div class="${pduMetrics.pduA.pct > 80 ? 'bg-rose-500' : 'bg-emerald-500'} h-1 rounded-full" style="width: ${pduMetrics.pduA.pct}%"></div>
            </div>
          </div>

          <!-- Vertical 24-Receptacle Visualizer -->
          <div class="py-2 space-y-1 flex-1 flex flex-col justify-around">
            ${Array.from({ length: 12 }, (_, oIdx) => {
              const isOccupied = (oIdx * 2) < pduMetrics.pduA.outletsUsed;
              return `
                <div class="flex items-center justify-between px-1 py-0.5 rounded bg-slate-900 border border-slate-800/80 text-[8px] font-mono ${isOccupied ? 'border-emerald-500/50 bg-emerald-950/30' : ''}">
                  <span class="text-slate-500">${oIdx + 1}</span>
                  <span class="${isOccupied ? 'text-emerald-400 font-bold' : 'text-slate-700'}">●</span>
                </div>
              `;
            }).join('')}
          </div>

          <div class="pt-2 border-t border-slate-800 text-center">
            <span class="text-[8px] font-mono text-slate-400 block">${pduMetrics.pduA.outletsUsed}/24 Outlets</span>
            <span class="text-[8px] font-mono text-slate-500 block">NEMA 5-20R</span>
          </div>
        </div>

        <!-- Center Rear 19" Equipment Rail -->
        <div class="flex-1 min-w-0 space-y-1">
          ${rearRailHTML}
        </div>

        <!-- PDU-B Right Vertical 0U Channel -->
        <div class="w-20 sm:w-24 shrink-0 bg-slate-950 border border-slate-800 rounded-xl p-2 flex flex-col justify-between select-none shadow-md">
          <div class="space-y-1 border-b border-slate-800 pb-2 text-center">
            <div class="flex items-center justify-center gap-1 text-[11px] font-bold text-sky-400">
              <i data-lucide="zap" class="w-3 h-3"></i> PDU-B
            </div>
            <span class="text-[9px] text-slate-400 uppercase font-mono block">Feed B (UPS)</span>
            <span class="text-[10px] font-mono font-bold text-white block">${pduMetrics.pduB.amps}A / 16A</span>
            <span class="text-[9px] font-mono text-slate-500 block">${pduMetrics.pduB.watts}W (${pduMetrics.pduB.pct}%)</span>
            <div class="w-full bg-slate-900 rounded-full h-1 mt-1 overflow-hidden">
              <div class="${pduMetrics.pduB.pct > 80 ? 'bg-rose-500' : 'bg-sky-500'} h-1 rounded-full" style="width: ${pduMetrics.pduB.pct}%"></div>
            </div>
          </div>

          <!-- Vertical 24-Receptacle Visualizer -->
          <div class="py-2 space-y-1 flex-1 flex flex-col justify-around">
            ${Array.from({ length: 12 }, (_, oIdx) => {
              const isOccupied = (oIdx * 2) < pduMetrics.pduB.outletsUsed;
              return `
                <div class="flex items-center justify-between px-1 py-0.5 rounded bg-slate-900 border border-slate-800/80 text-[8px] font-mono ${isOccupied ? 'border-sky-500/50 bg-sky-950/30' : ''}">
                  <span class="text-slate-500">${oIdx + 1}</span>
                  <span class="${isOccupied ? 'text-sky-400 font-bold' : 'text-slate-700'}">●</span>
                </div>
              `;
            }).join('')}
          </div>

          <div class="pt-2 border-t border-slate-800 text-center">
            <span class="text-[8px] font-mono text-slate-400 block">${pduMetrics.pduB.outletsUsed}/24 Outlets</span>
            <span class="text-[8px] font-mono text-slate-500 block">NEMA 5-20R</span>
          </div>
        </div>
      </div>
    `;
  }
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
                <span class="text-[11px] font-bold text-white block truncate mb-0.5">${escapeHTML(it.model)}</span>
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
                <span class="font-bold text-white text-[11px] truncate block" title="${escapeHTML(it.model)}">${escapeHTML(it.model)}</span>
                <span class="text-[8.5px] font-mono px-1 py-0.2 rounded font-bold shrink-0 ${isCompatible ? 'bg-emerald-950/80 border border-emerald-700/60 text-emerald-300' : 'bg-slate-800 border border-slate-700 text-slate-400'}">
                  ${comp.matchBadge || (isCompatible ? 'COMPATIBLE' : 'SECONDARY')}
                </span>
              </div>

              <div class="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>${escapeHTML(it.role || 'Hardware')}</span>
                <span class="text-amber-300 font-bold">${it.consumedPoEWatts || it.baseWatts || 0}W</span>
              </div>

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
            <span class="font-bold text-white text-xs block truncate">${escapeHTML(it.model)}</span>
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
    // Determine occupied slots in active rack
    const occupied = new Set();
    projectBOM.forEach(item => {
      const itemLoc = FacilityStore.normalize(item.closetName || item.rackId);
      if (itemLoc === activeRackId && item.rackSlot) {
        const span = parseInt(item.rackUnits, 10) || 1;
        for (let u = item.rackSlot; u < item.rackSlot + span; u++) {
          occupied.add(u);
        }
      }
    });

    let targetU = null;
    for (let u = 1; u <= activeRackHeight; u++) {
      if (!occupied.has(u)) {
        targetU = u;
        break;
      }
    }

    if (targetU) {
      const item = projectBOM.find(i => i.instanceId === instanceId);
      if (item) {
        item.rackSlot = targetU;
        item.closetName = activeRackId;
        item.rackId = activeRackId;
        FacilityStore.notifyWorkspaceChange();
        renderRackVisualizer();
        if (typeof showToast === "function") {
          showToast(`Mounted ${item.model} at U${targetU} in ${activeRackId}`);
        }
      }
    } else {
      if (typeof showToast === "function") showToast("No free rack units available in this rack.");
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

function handleRackSlotDrop(e, targetU) {
  e.preventDefault();
  const instanceId = draggedRackItemInstanceId || e.dataTransfer.getData("text/plain");
  if (!instanceId || typeof projectBOM === "undefined") return;

  const item = projectBOM.find(i => i.instanceId === instanceId);
  if (!item) return;

  const stackUnits = (item.stackedUnits && item.stackedUnits >= 2) ? item.stackedUnits : 1;
  const itemHeight = (parseInt(item.rackUnits, 10) || 1) * stackUnits;
  if ((targetU + itemHeight - 1) > activeRackHeight) {
    if (typeof showToast === "function") {
      showToast(`Cannot place ${itemHeight}U (${stackUnits}x Stack) device at U${targetU}: exceeds cabinet top.`);
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
    let occupiedU = 0, totalPoE = 0, totalBaseWatts = 0, totalOutlets = 0;
    assignedItems.forEach(it => {
      const units = (it.stackedUnits && it.stackedUnits >= 2) ? it.stackedUnits : 1;
      if (it.rackSlot) occupiedU += (parseInt(it.rackUnits || 1, 10) * units);
      totalPoE += parseFloat(it.poeBudget || 0) * units;
      totalBaseWatts += parseFloat(it.baseWatts || 0) * units;
      totalOutlets += units;
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
                  <span class="font-bold text-white block truncate">${escapeHTML(dev.model)}</span>
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
}