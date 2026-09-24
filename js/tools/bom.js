// ==========================================
// BILL OF MATERIALS (BOM) & LICENSING ENGINE (NetSelect Enterprise)
// Integrated with FacilityStore & Universal Workspace Dispatcher
// ==========================================

let projectBOM = [];
let bomViewMode = "grouped";
let globalSelectedTerm = "1YR";

function saveBOMState() {
  if (typeof queueAutoSave === "function") {
    queueAutoSave();
  } else if (typeof saveStateToLocalStorage === "function") {
    saveStateToLocalStorage();
  }
}

// -----------------------------------------------------------
// Meraki License Compliance
// -----------------------------------------------------------
function checkMerakiCompliance() {
  const merakiDevices = projectBOM.filter(i => !i.parentInstanceId && i.vendor === "Meraki");
  if (!merakiDevices || merakiDevices.length === 0) return { compliant: true, missingCount: 0 };

  let unmanagedCount = 0;
  merakiDevices.forEach(dev => {
    const hasLicense = projectBOM.some(i => i.parentInstanceId === dev.instanceId && (i.role === "Mgmt License" || i.role === "Security License"));
    if (!hasLicense) unmanagedCount++;
  });

  return {
    compliant: unmanagedCount === 0,
    missingCount: unmanagedCount
  };
}

function autoFixMerakiLicenses() {
  const merakiDevices = projectBOM.filter(i => !i.parentInstanceId && i.vendor === "Meraki");
  merakiDevices.forEach(dev => {
    dev.selectedMgmtProfile = "cloud";
    const term = dev.individualTerm || globalSelectedTerm || "1YR";
    applyManagementSubscription(dev.instanceId, "cloud", term);
  });

  FacilityStore.notifyWorkspaceChange();
  showToast(`Attached ${globalSelectedTerm || '1YR'} Meraki Enterprise licenses.`);
}

// -----------------------------------------------------------
// View Mode Switcher
// -----------------------------------------------------------
function setBomViewMode(mode) {
  bomViewMode = mode;
  const grpBtn = document.getElementById("bomViewMode-grouped");
  const fltBtn = document.getElementById("bomViewMode-flat");

  if (mode === "grouped") {
    if (grpBtn) {
      grpBtn.classList.replace("text-slate-400", "text-white");
      grpBtn.classList.replace("bg-slate-950", "bg-brand-600");
    }
    if (fltBtn) {
      fltBtn.classList.replace("text-white", "text-slate-400");
      fltBtn.classList.replace("bg-brand-600", "bg-slate-950");
    }
  } else {
    if (fltBtn) {
      fltBtn.classList.replace("text-slate-400", "text-white");
      fltBtn.classList.replace("bg-slate-950", "bg-brand-600");
    }
    if (grpBtn) {
      grpBtn.classList.replace("text-white", "text-slate-400");
      grpBtn.classList.replace("bg-brand-600", "bg-slate-950");
    }
  }

  updateBOMView();
}

// -----------------------------------------------------------
// Locations & Holding Bin Connectors
// -----------------------------------------------------------
function getAllDefinedLocations() {
  if (typeof FacilityStore !== "undefined") {
    return FacilityStore.getLocationNames(true); // Includes "Unassigned"
  }
  return ["Unassigned", "MDF • Rack-1", "IDF-1 • Rack-1", "Exterior Pole • NEMA-Box"];
}

function handleLocationDropdownChange(selectEl, callback) {
  if (!selectEl) return;
  if (selectEl.value === "new_location") {
    const c = prompt("Enter New Room / Space Name (e.g. IDF-2, Gate Pole, Server Room):", "IDF-2");
    if (!c || !c.trim()) {
      selectEl.value = selectEl.getAttribute("data-previous-val") || "MDF • Rack-1";
      return;
    }
    const r = prompt("Enter Cabinet / Enclosure (e.g. Rack-1, NEMA-Box, Wallbox):", "Rack-1");
    if (!r || !r.trim()) {
      selectEl.value = selectEl.getAttribute("data-previous-val") || "MDF • Rack-1";
      return;
    }

    const newKey = typeof FacilityStore !== "undefined"
      ? FacilityStore.addLocation(`${c.trim()} • ${r.trim()}`)
      : `${c.trim()} • ${r.trim()}`;

    const opt = document.createElement("option");
    opt.value = newKey;
    opt.text = newKey;
    selectEl.insertBefore(opt, selectEl.lastElementChild);
    selectEl.value = newKey;
    selectEl.setAttribute("data-previous-val", newKey);

    if (typeof callback === "function") callback(newKey);
    showToast(`Created new location: ${newKey}`);
  } else {
    selectEl.setAttribute("data-previous-val", selectEl.value);
    if (typeof callback === "function") callback(selectEl.value);
  }
}

function setItemLocation(instanceId, combinedKey) {
  if (combinedKey === "new_location") return;

  const normalized = typeof FacilityStore !== "undefined" ? FacilityStore.normalize(combinedKey) : combinedKey;
  const item = projectBOM.find(i => i.instanceId === instanceId);
  
  if (item) {
    item.closetName = normalized;
    item.rackId = normalized;
    item.rackSlot = null; // Unslot from physical rail to avoid collisions in the new rack
    item.rackU = null;

    FacilityStore.notifyWorkspaceChange();
    showToast(normalized === FacilityStore.UNASSIGNED ? `Moved ${item.model} to Unassigned Staging` : `Moved ${item.model} to ${normalized}`);
  }
}

// -----------------------------------------------------------
// Hardware Line Item Creation
// -----------------------------------------------------------
function addToProjectBOM(id, targetLocation = null) {
  const sw = (typeof CatalogRegistry !== "undefined" && typeof CatalogRegistry.getSwitch === "function" ? CatalogRegistry.getSwitch(id) : null) ||
             (typeof CatalogRegistry !== "undefined" && typeof CatalogRegistry.get === "function" ? CatalogRegistry.get(id) : null) ||
             (typeof SWITCH_DATABASE !== "undefined" ? SWITCH_DATABASE.find(s => s.id === id || s.sku === id) : null);
  if (!sw) {
    console.error("addToProjectBOM: Switch not found in catalog for id:", id);
    return;
  }

  const qtyToAdd = 1;
  const sledSelect = document.getElementById(`sled-${sw.id}`);
  const selectedSledSku = sledSelect ? sledSelect.value : (sw.modularUplink ? sw.modularUplink.defaultModuleSku : null);

  const instanceId = `inst-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  
  // Resolve destination through FacilityStore
  let assignedLoc = (sw.role === "Core" || sw.role === "Aggregation") ? "MDF • Rack-1" : "IDF-1 • Rack-1";
  if (targetLocation && targetLocation !== "new_location") {
    assignedLoc = typeof FacilityStore !== "undefined" ? FacilityStore.normalize(targetLocation) : targetLocation;
  }

  const isDinOnly = sw.mounting && sw.mounting.includes("DIN") && !sw.mounting.includes("19\"");
  let initialMgmtProfile = sw.defaultMgmtProfile || (sw.vendor === "Meraki" ? "cloud" : "standalone");
  const baseWatts = sw.role === "Core" ? 250 : (sw.role === "Aggregation" ? 150 : (sw.ports >= 48 ? 65 : 35));

  const newParent = {
    instanceId: instanceId,
    id: sw.id,
    model: sw.model,
    sku: sw.sku,
    role: sw.role,
    vendor: sw.vendor,
    msrp: sw.msrp,
    ports: parseInt(sw.ports) || 0,
    poeStandard: sw.poeStandard || "802.3at",
    poeBudget: parseInt(sw.poeBudget) || 0,
    baseWatts: baseWatts,
    rackUnits: sw.rackUnits || 1,
    depthInches: sw.depthInches || 12,
    shallowDepth: sw.shallowDepth || false,
    qty: qtyToAdd,
    canStack: (sw.stacking !== undefined ? sw.stacking : (sw.canStack !== undefined ? sw.canStack : (sw.role === "Access" || sw.role === "Aggregation"))),
    closetName: assignedLoc,
    rackId: assignedLoc,
    rackSlot: null,
    rackU: null,
    isDinMounted: isDinOnly,
    stackedUnits: 0,
    stackCableSku: sw.stackCableSku || null,
    portSpeed: sw.portSpeed || "10G",
    maxBackboneSpeed: sw.maxBackboneSpeed || "10G",
    selectedMgmtProfile: initialMgmtProfile,
    uplinkTargetId: null,
    uplinkMode: "single",
    powerSource: "internal_psu"
  };

  projectBOM.push(newParent);
  if (typeof PortEngine !== "undefined") {
    PortEngine.initSwitchPorts(newParent);
  }

  // Modular Sled Addition
  if (selectedSledSku && MODULAR_UPLINK_CATALOG[selectedSledSku]) {
    const mod = MODULAR_UPLINK_CATALOG[selectedSledSku];
    projectBOM.push({
      instanceId: `mod-${instanceId}`,
      parentInstanceId: instanceId,
      id: mod.sku,
      model: mod.name,
      sku: mod.sku,
      role: "Uplink Module",
      vendor: sw.vendor,
      msrp: mod.msrp,
      poeBudget: 0,
      baseWatts: 15,
      qty: qtyToAdd
    });
  }

  // Feature Licenses
  const selectedLicCheckboxes = document.querySelectorAll(`input[name="featLic-${sw.id}"]:checked`);
  selectedLicCheckboxes.forEach(cb => {
    const licSku = cb.value;
    const lic = FEATURE_LICENSE_CATALOG[licSku];
    if (lic) {
      projectBOM.push({
        instanceId: `lic-${licSku}-${instanceId}`,
        parentInstanceId: instanceId,
        id: lic.sku,
        model: lic.name,
        sku: lic.sku,
        role: "Feature License",
        vendor: sw.vendor,
        msrp: lic.msrp,
        poeBudget: 0,
        baseWatts: 0,
        qty: qtyToAdd
      });
    }
  });

  // Redundant & External PSUs
  const redundantPsuChecked = document.getElementById(`psuRedundant-${sw.id}`)?.checked;
  if (redundantPsuChecked && sw.psuSku && POWER_SUPPLY_CATALOG[sw.psuSku]) {
    const psu = POWER_SUPPLY_CATALOG[sw.psuSku];
    projectBOM.push({
      instanceId: `psu2-${instanceId}`,
      parentInstanceId: instanceId,
      id: psu.sku,
      model: `2nd Redundant PSU: ${psu.name}`,
      sku: psu.sku,
      role: "Power Supply",
      vendor: sw.vendor,
      msrp: psu.msrp,
      poeBudget: 0,
      baseWatts: 0,
      qty: 1
    });
  }

  if (sw.needsExternalPsu && sw.psuSku && POWER_SUPPLY_CATALOG[sw.psuSku]) {
    const psu = POWER_SUPPLY_CATALOG[sw.psuSku];
    projectBOM.push({
      instanceId: `psu-ext-${instanceId}`,
      parentInstanceId: instanceId,
      id: psu.sku,
      model: `Primary Power Supply: ${psu.name}`,
      sku: psu.sku,
      role: "Power Supply",
      vendor: sw.vendor,
      msrp: psu.msrp,
      poeBudget: 0,
      baseWatts: 0,
      qty: 1
    });
  }

  if (sw.vendor === "Meraki") {
    applyManagementSubscription(instanceId, "cloud", globalSelectedTerm || "1YR");
  }

  FacilityStore.notifyWorkspaceChange();
  showToast(`Added ${sw.model} to ${assignedLoc}`);
}

function applyManagementSubscription(instanceId, profileKey, term) {
  const sw = projectBOM.find(i => i.instanceId === instanceId);
  if (!sw) return;

  projectBOM = projectBOM.filter(i => !(i.parentInstanceId === instanceId && (i.role === "Mgmt License" || i.role === "Security License")));
  sw.selectedMgmtProfile = profileKey;

  if (!profileKey || profileKey === "standalone") return;

  const profile = MGMT_SUBSCRIPTION_CATALOG[sw.vendor]?.[profileKey];
  if (profile && profile.terms) {
    const termEntry = profile.terms[term] || profile.terms["1YR"] || profile.terms["PERP"] || Object.values(profile.terms)[0];
    if (termEntry && termEntry.msrp > 0) {
      projectBOM.push({
        instanceId: `mgmt-${instanceId}`,
        parentInstanceId: instanceId,
        id: termEntry.sku,
        model: `${profile.name} (${term || '1YR'})`,
        sku: termEntry.sku,
        role: "Mgmt License",
        vendor: sw.vendor,
        msrp: termEntry.msrp,
        poeBudget: 0,
        baseWatts: 0,
        qty: sw.qty || 1
      });
    }
  }
}

function updateStackedCount(instanceId, count) {
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

  applyStackCabling(item);
  FacilityStore.notifyWorkspaceChange();
  updateBOMView();
}

function applyStackCabling(item) {
  const cableSku = item.stackCableSku || "STACK-DAC-1M";
  projectBOM = projectBOM.filter(i => !(i.role === "Stacking Cable" && i.parentInstanceId === item.instanceId));

  if (item.stackedUnits >= 2) {
    projectBOM.push({
      instanceId: `cable-${item.instanceId}`,
      parentInstanceId: item.instanceId,
      id: `${item.id}-stack-cable`,
      model: `${item.vendor} Dedicated Hardware Stacking Cable (${item.closetName})`,
      sku: cableSku,
      role: "Stacking Cable",
      vendor: item.vendor,
      msrp: 180,
      poeBudget: 0,
      baseWatts: 0,
      qty: item.stackedUnits
    });
  }
}

// -----------------------------------------------------------
// Dynamic Auto-Uplinks
// -----------------------------------------------------------
function autoResolveUplinks() {
  const coreSwitches = projectBOM.filter(i => (i.role === "Core" || i.role === "Aggregation") && !i.parentInstanceId);
  const accessSwitches = projectBOM.filter(i => i.role === "Access" && !i.parentInstanceId && !i.isDinMounted);

  if (coreSwitches.length === 0) {
    showToast("Please add at least one Core or Aggregation switch to the BOM first.");
    return;
  }
  if (accessSwitches.length === 0) {
    showToast("No standard Access switches found in BOM to calculate uplinks for.");
    return;
  }

  const core = coreSwitches[0];
  projectBOM = projectBOM.filter(i => i.role !== "Uplink Interconnect");

  let dacCount = 0;
  let opticPairsCount = 0;
  let highestSpeedResolved = "10G";

  accessSwitches.forEach(sw => {
    sw.uplinkTargetId = core.instanceId;

    const isDual = sw.uplinkMode === "lag_dual" || sw.stackedUnits >= 2;
    const linksNeeded = isDual ? 2 : 1;

    let accessUplinkSpeed = "10G";
    const attachedSled = projectBOM.find(i => i.parentInstanceId === sw.instanceId && i.role === "Uplink Module");
    const sledData = attachedSled ? (MODULAR_UPLINK_CATALOG[attachedSled.id] || MODULAR_UPLINK_CATALOG[attachedSled.sku]) : null;

    if (sledData) {
      accessUplinkSpeed = sledData.speed;
    } else if (sw.portSpeed === "25G" || (sw.uplinksSummary && sw.uplinksSummary.includes("25G"))) {
      accessUplinkSpeed = "25G";
    } else if (sw.portSpeed === "100G" || (sw.uplinksSummary && sw.uplinksSummary.includes("100G"))) {
      accessUplinkSpeed = "100G";
    } else if (sw.maxBackboneSpeed && sw.maxBackboneSpeed !== "100G") {
      accessUplinkSpeed = sw.maxBackboneSpeed;
    }

    const coreSpeed = core.maxBackboneSpeed || "10G";

    let linkSpeed = "10G";
    if (accessUplinkSpeed === "100G" && coreSpeed === "100G") {
      linkSpeed = "100G";
    } else if ((accessUplinkSpeed === "25G" || accessUplinkSpeed === "100G") && (coreSpeed === "25G" || coreSpeed === "100G")) {
      linkSpeed = "25G";
    } else if (accessUplinkSpeed === "1G" || coreSpeed === "1G") {
      linkSpeed = "1G";
    }
    highestSpeedResolved = linkSpeed;

    const isSameCloset = (sw.closetName || "IDF-1 • Rack-1").trim().toUpperCase() === (core.closetName || "MDF • Rack-1").trim().toUpperCase();

    if (isSameCloset) {
      const dacData = OPTICS_CATALOG[sw.vendor]?.[linkSpeed]?.["dac"] || OPTICS_CATALOG["Meraki"]?.[linkSpeed]?.["dac"] || OPTICS_CATALOG["UniFi"]?.[linkSpeed]?.["dac"];
      if (dacData) {
        projectBOM.push({
          instanceId: `uplink-dac-${sw.instanceId}`,
          parentInstanceId: sw.instanceId,
          id: dacData.sku,
          model: `${sw.vendor} ${linkSpeed} Direct Attach Copper (DAC) Cable ${isDual ? '(2x LACP Bundle)' : '(Single Link)'}`,
          sku: dacData.sku,
          role: "Uplink Interconnect",
          vendor: sw.vendor,
          msrp: dacData.msrp,
          poeBudget: 0,
          baseWatts: 0,
          qty: linksNeeded
        });
        dacCount += linksNeeded;
      }
    } else {
      const medium = "smf";
      let opticData = OPTICS_CATALOG[sw.vendor]?.[linkSpeed]?.[medium] || OPTICS_CATALOG["Meraki"]?.[linkSpeed]?.[medium] || OPTICS_CATALOG["UniFi"]?.[linkSpeed]?.[medium];

      if (opticData) {
        const transceiversQty = linksNeeded * 2;
        projectBOM.push({
          instanceId: `uplink-opt-${sw.instanceId}`,
          parentInstanceId: sw.instanceId,
          id: opticData.sku,
          model: `${sw.vendor} ${linkSpeed} ${medium.toUpperCase()} Optical Transceiver Pair ${isDual ? '(2x LAG)' : ''} (${sw.closetName} -> ${core.closetName})`,
          sku: opticData.sku,
          role: "Uplink Interconnect",
          vendor: sw.vendor,
          msrp: opticData.msrp,
          poeBudget: 0,
          baseWatts: 2,
          qty: transceiversQty
        });
        opticPairsCount += linksNeeded;
      }
    }
  });

  FacilityStore.notifyWorkspaceChange();
  showToast(`Auto Uplinks resolved at ${highestSpeedResolved}: Added ${dacCount}x DAC cables and ${opticPairsCount * 2}x transceivers.`);
}

function addFirewallToBOM(sku, targetLocation = null) {
  const fw = (typeof CatalogRegistry !== "undefined" && CatalogRegistry.get(sku)) ||
             (typeof FIREWALL_DATABASE !== "undefined" ? FIREWALL_DATABASE.find(f => f.sku === sku || f.id === sku) : null);
  if (!fw) return;

  const qtyToAdd = 1;
  const instanceId = `fw-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const defaultLoc = typeof FacilityStore !== "undefined"
    ? (targetLocation ? FacilityStore.normalize(targetLocation) : "MDF • Rack-1")
    : "MDF • Rack-1";

  projectBOM.push({
    instanceId: instanceId,
    id: fw.sku,
    model: fw.model,
    sku: fw.sku,
    role: "Security WAN",
    vendor: fw.vendor,
    msrp: fw.msrp,
    ports: fw.ports || 4,
    poeBudget: 0,
    baseWatts: 45,
    rackUnits: fw.rackUnits || 1,
    depthInches: 17.5,
    shallowDepth: false,
    qty: qtyToAdd,
    closetName: defaultLoc,
    rackId: defaultLoc,
    rackSlot: null,
    rackU: null,
    isDinMounted: fw.category === "cellular",
    selectedMgmtProfile: fw.category === "cellular" ? "standalone" : (fw.vendor === "Meraki" ? "cloud" : "standalone"),
    uplinkTargetId: null,
    powerSource: "internal_psu"
  });

  FacilityStore.notifyWorkspaceChange();
  showToast(`Added ${fw.model} Gateway to ${defaultLoc}`);
}

function addOpticsToBOM(sku, name, msrp, qty, vendor) {
  const instanceId = `opt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  projectBOM.push({
    instanceId: instanceId,
    id: sku,
    model: name,
    sku: sku,
    role: "Optics / Interconnect",
    vendor: vendor,
    msrp: msrp,
    poeBudget: 0,
    baseWatts: 1,
    qty: qty
  });

  FacilityStore.notifyWorkspaceChange();
  showToast(`Added ${qty}x ${sku} to Project BOM.`);
}

function addServerToBOM(serverId, targetLocation = null) {
  const srv = (typeof CatalogRegistry !== "undefined" && typeof CatalogRegistry.get === "function" ? CatalogRegistry.get(serverId) : null) ||
              (typeof SERVERS_DATABASE !== "undefined" ? SERVERS_DATABASE : []).find(s => s.id === serverId || s.sku === serverId);
  if (!srv) return;

  const instanceId = `srv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  let assignedLoc = "MDF • Rack-1";
  if (targetLocation && targetLocation !== "new_location") {
    assignedLoc = typeof FacilityStore !== "undefined" ? FacilityStore.normalize(targetLocation) : targetLocation;
  }

  projectBOM.push({
    instanceId: instanceId,
    id: srv.id,
    model: srv.model,
    sku: srv.sku,
    role: "Server",
    serverType: srv.serverType || "vms_recording",
    vendor: srv.vendor,
    msrp: srv.msrp,
    ports: srv.ports || 2,
    portSpeed: srv.portSpeed || "10G",
    maxBackboneSpeed: srv.portSpeed || "10G",
    baseWatts: srv.baseWatts || 300,
    maxPowerWatts: srv.maxPowerWatts || 500,
    rackUnits: srv.rackUnits || 2,
    depthInches: srv.depthInches || 28,
    dualPsu: srv.dualPsu !== false,
    qty: 1,
    closetName: assignedLoc,
    rackId: assignedLoc,
    rackSlot: null,
    rackU: null,
    isDinMounted: false,
    hostedRoles: [...(srv.hostedRoles || ["VMS Ingest & Recording"])],
    maxIngestBandwidthMbps: srv.maxIngestBandwidthMbps || 750,
    powerSource: "dual_ac",
    uplinkTargetId: null
  });

  FacilityStore.notifyWorkspaceChange();
  showToast(`Added ${srv.model} to ${assignedLoc}`);
}

function addCameraToBOM(cameraId, targetLocation = null, uplinkTargetId = null) {
  const cam = (typeof CatalogRegistry !== "undefined" && typeof CatalogRegistry.get === "function" ? CatalogRegistry.get(cameraId) : null) ||
              (typeof CAMERAS_DATABASE !== "undefined" ? CAMERAS_DATABASE : []).find(c => c.id === cameraId || c.sku === cameraId);
  if (!cam) return;

  const instanceId = `cam-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  let assignedLoc = "IDF-1 • Rack-1";
  if (targetLocation && targetLocation !== "new_location") {
    assignedLoc = typeof FacilityStore !== "undefined" ? FacilityStore.normalize(targetLocation) : targetLocation;
  }

  // Auto-resolve uplink switch if not explicitly provided
  let targetSwitchId = uplinkTargetId;
  if (!targetSwitchId) {
    const sw = projectBOM.find(i => !i.parentInstanceId && (i.role === "Access" || i.role === "Core") && FacilityStore.normalize(i.closetName) === assignedLoc);
    if (sw) targetSwitchId = sw.instanceId;
  }

  const newCam = {
    instanceId: instanceId,
    id: cam.id,
    model: cam.model,
    sku: cam.sku,
    role: "Camera",
    category: "camera",
    vendor: cam.vendor,
    msrp: cam.msrp,
    ports: 1,
    powerConsumptionWatts: cam.powerConsumptionWatts || 8,
    maxPowerWatts: cam.maxPowerWatts || 15,
    poeStandard: cam.poeStandard || "802.3af",
    streamBitrateMbps: cam.streamBitrateMbps || 4.0,
    resolution: cam.resolution || "2MP",
    qty: 1,
    closetName: assignedLoc,
    rackId: assignedLoc,
    rackSlot: null,
    rackU: null,
    isDinMounted: false,
    uplinkTargetId: targetSwitchId,
    assignedRecordingServerId: null
  };

  projectBOM.push(newCam);

  if (typeof PortEngine !== "undefined") {
    PortEngine.initDeviceInterfaces(newCam);
    if (targetSwitchId) {
      const sw = projectBOM.find(i => i.instanceId === targetSwitchId);
      if (sw) PortEngine.allocatePort(sw, newCam);
    }
  }

  FacilityStore.notifyWorkspaceChange();
  showToast(`Added ${cam.model} to quote`);
}

function addAccessDeviceToBOM(accessId, targetLocation = null, uplinkTargetId = null) {
  const dev = (typeof CatalogRegistry !== "undefined" && typeof CatalogRegistry.get === "function" ? CatalogRegistry.get(accessId) : null) ||
              (typeof ACCESS_CONTROL_DATABASE !== "undefined" ? ACCESS_CONTROL_DATABASE : []).find(a => a.id === accessId || a.sku === accessId);
  if (!dev) return;

  const instanceId = `acc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  let assignedLoc = "IDF-1 • Rack-1";
  if (targetLocation && targetLocation !== "new_location") {
    assignedLoc = typeof FacilityStore !== "undefined" ? FacilityStore.normalize(targetLocation) : targetLocation;
  }

  let targetSwitchId = uplinkTargetId;
  if (!targetSwitchId) {
    const sw = projectBOM.find(i => !i.parentInstanceId && (i.role === "Access" || i.role === "Core") && FacilityStore.normalize(i.closetName) === assignedLoc);
    if (sw) targetSwitchId = sw.instanceId;
  }

  const newAcc = {
    instanceId: instanceId,
    id: dev.id,
    model: dev.model,
    sku: dev.sku,
    role: "Access Control",
    category: "access_control",
    vendor: dev.vendor,
    msrp: dev.msrp,
    ports: 1,
    powerConsumptionWatts: dev.powerConsumptionWatts || 15,
    poeStandard: dev.poeStandard || "802.3at",
    doorCapacity: dev.doorCapacity || 2,
    readerCapacity: dev.readerCapacity || 4,
    qty: 1,
    closetName: assignedLoc,
    rackId: assignedLoc,
    rackSlot: null,
    rackU: null,
    isDinMounted: dev.mounting && dev.mounting.includes("DIN"),
    uplinkTargetId: targetSwitchId,
    assignedAccessServerId: null
  };

  projectBOM.push(newAcc);

  if (typeof PortEngine !== "undefined") {
    PortEngine.initDeviceInterfaces(newAcc);
    if (targetSwitchId) {
      const sw = projectBOM.find(i => i.instanceId === targetSwitchId);
      if (sw) PortEngine.allocatePort(sw, newAcc);
    }
  }

  FacilityStore.notifyWorkspaceChange();
  showToast(`Added ${dev.model} to quote`);
}

function addWirelessToBOM(radioId, isMatchedPair = false) {
  const radio = (typeof CatalogRegistry !== "undefined" && typeof CatalogRegistry.get === "function" ? CatalogRegistry.get(radioId) : null) ||
                (typeof WIRELESS_DATABASE !== "undefined" ? WIRELESS_DATABASE : []).find(r => r.id === radioId || r.sku === radioId);
  if (!radio) return;

  const precChecked = document.getElementById(`wl-prec-${radio.id}`)?.checked;
  const surgeChecked = document.getElementById(`wl-surge-${radio.id}`)?.checked;
  const antSelect = document.getElementById(`wl-ant-${radio.id}`);
  const licChecked = document.getElementById(`wl-lic-${radio.id}`)?.checked;

  const rolesToCreate = isMatchedPair 
    ? [
        { label: "PtP Local Master", defaultCloset: "MDF • Rack-1", defaultPower: "poe_switch" },
        { label: "PtP Remote Substation", defaultCloset: "Exterior Pole • NEMA-Box", defaultPower: "local_injector" }
      ]
    : [
        { label: radio.topology === "PtMP-AP" ? "PtMP BaseStation AP" : "Wireless Radio", defaultCloset: "Exterior Pole • NEMA-Box", defaultPower: "poe_switch" }
      ];

  const linkPairId = `link-${Date.now()}`;

  rolesToCreate.forEach(roleConfig => {
    const instanceId = `wl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    projectBOM.push({
      instanceId: instanceId,
      linkPairId: isMatchedPair ? linkPairId : null,
      id: radio.sku,
      model: `${radio.model} (${roleConfig.label})`,
      sku: radio.sku,
      role: "Wireless Bridge",
      vendor: radio.vendor,
      msrp: radio.msrp,
      ports: 1,
      poeBudget: 0,
      baseWatts: radio.powerWatts,
      poeWattsDrawn: radio.powerWatts,
      poeStandardRequired: radio.powerWatts > 30 ? "802.3bt-60" : "802.3at",
      powerSource: roleConfig.defaultPower,
      uplinkTargetId: null,
      uplinkMode: "single",
      depthInches: 4,
      shallowDepth: true,
      qty: 1,
      closetName: roleConfig.defaultCloset,
      rackId: roleConfig.defaultCloset,
      rackSlot: null,
      rackU: null,
      isDinMounted: true
    });

    if (precChecked && radio.precisionMountSku && WIRELESS_ACCESSORY_CATALOG[radio.precisionMountSku]) {
      const acc = WIRELESS_ACCESSORY_CATALOG[radio.precisionMountSku];
      projectBOM.push({
        instanceId: `mnt-${instanceId}`,
        parentInstanceId: instanceId,
        id: acc.sku,
        model: acc.name,
        sku: acc.sku,
        role: "Mounting Bracket",
        vendor: radio.vendor,
        msrp: acc.msrp,
        poeBudget: 0,
        baseWatts: 0,
        qty: 1
      });
    }

    if (surgeChecked && radio.surgeSku && WIRELESS_ACCESSORY_CATALOG[radio.surgeSku]) {
      const acc = WIRELESS_ACCESSORY_CATALOG[radio.surgeSku];
      projectBOM.push({
        instanceId: `srg-${instanceId}`,
        parentInstanceId: instanceId,
        id: acc.sku,
        model: acc.name,
        sku: acc.sku,
        role: "Surge Protection",
        vendor: radio.vendor,
        msrp: acc.msrp,
        poeBudget: 0,
        baseWatts: 0,
        qty: 1
      });
    }

    if (antSelect && WIRELESS_ACCESSORY_CATALOG[antSelect.value]) {
      const ant = WIRELESS_ACCESSORY_CATALOG[antSelect.value];
      projectBOM.push({
        instanceId: `ant-${instanceId}`,
        parentInstanceId: instanceId,
        id: ant.sku,
        model: ant.name,
        sku: ant.sku,
        role: "Antenna Assembly",
        vendor: radio.vendor,
        msrp: ant.msrp,
        poeBudget: 0,
        baseWatts: 0,
        qty: 1
      });
    }

    if (licChecked && radio.licenseSku && WIRELESS_LICENSE_CATALOG[radio.licenseSku]) {
      const lic = WIRELESS_LICENSE_CATALOG[radio.licenseSku];
      projectBOM.push({
        instanceId: `lic-${instanceId}`,
        parentInstanceId: instanceId,
        id: lic.sku,
        model: lic.name,
        sku: lic.sku,
        role: "Feature License",
        vendor: radio.vendor,
        msrp: lic.msrp,
        poeBudget: 0,
        baseWatts: 0,
        qty: 1
      });
    }
  });

  FacilityStore.notifyWorkspaceChange();
  showToast(isMatchedPair ? `Added 2-Radio Link Pair (${radio.model}) with split endpoints.` : `Added ${radio.model} to BOM.`);
}

function changeBomQty(instanceId, delta) {
  const item = projectBOM.find(i => i.instanceId === instanceId);
  if (!item) return;

  item.qty += delta;

  if (item.qty <= 0) {
    projectBOM = projectBOM.filter(i => i.instanceId !== instanceId && i.parentInstanceId !== instanceId);
  } else {
    if (item.stackedUnits > item.qty) {
      item.stackedUnits = item.qty >= 2 ? item.qty : 0;
    }
    projectBOM.filter(i => i.parentInstanceId === instanceId && i.role !== "Stacking Cable" && i.role !== "Uplink Interconnect").forEach(child => {
      child.qty = item.qty;
    });
    applyStackCabling(item);
    if (typeof PortEngine !== "undefined" && (item.canStack || item.ports)) {
      PortEngine.initSwitchPorts(item, true);
    }
  }

  FacilityStore.notifyWorkspaceChange();
}

function removeBomItem(instanceId) {
  projectBOM = projectBOM.filter(i => i.instanceId !== instanceId && i.parentInstanceId !== instanceId);
  FacilityStore.notifyWorkspaceChange();
  showToast("Item removed from BOM.");
}

function clearBom() {
  if (projectBOM.length === 0) return;
  if (!confirm("Are you sure you want to clear the entire Project BOM?")) return;
  projectBOM = [];
  FacilityStore.notifyWorkspaceChange();
  showToast("Project BOM reset.");
}

function toggleBomDrawer() {
  const drawer = document.getElementById("bomDrawer");
  if (drawer) drawer.classList.toggle("translate-x-full");
}

// -----------------------------------------------------------
// Real-Time Capacity & PoE Auditing
// -----------------------------------------------------------
function auditSwitchCapacities() {
  if (typeof NetworkSizer !== "undefined" && typeof NetworkSizer.auditBOMCapacities === "function") {
    return NetworkSizer.auditBOMCapacities(projectBOM, {
      extraHeadroomPercent: typeof extraHeadroomPercent !== "undefined" ? extraHeadroomPercent : 20
    });
  }

  // Graceful fallback
  const switchAudits = {};
  if (!Array.isArray(projectBOM)) return switchAudits;

  projectBOM.filter(i => i && !i.parentInstanceId && (i.role === "Access" || i.role === "Core" || i.role === "Aggregation")).forEach(sw => {
    let switchPorts = parseInt(sw.ports, 10);
    if (!switchPorts || isNaN(switchPorts)) {
      const dbEntry = typeof SWITCH_DATABASE !== "undefined" ? SWITCH_DATABASE.find(s => s.id === sw.id || s.sku === sw.sku) : null;
      switchPorts = dbEntry ? dbEntry.ports : 24;
      sw.ports = switchPorts;
    }

    let switchPoE = parseInt(sw.poeBudget, 10);
    if (isNaN(switchPoE)) {
      const dbEntry = typeof SWITCH_DATABASE !== "undefined" ? SWITCH_DATABASE.find(s => s.id === sw.id || s.sku === sw.sku) : null;
      switchPoE = dbEntry ? dbEntry.poeBudget : 0;
      sw.poeBudget = switchPoE;
    }

    switchAudits[sw.instanceId] = {
      instanceId: sw.instanceId,
      model: sw.model || "Unknown Switch",
      totalPorts: switchPorts * (sw.qty || 1),
      usedDownlinkPorts: 0,
      totalPoEBudget: switchPoE * (sw.qty || 1),
      consumedPoEWatts: 0,
      poeStandard: sw.poeStandard || "802.3at",
      uplinkPortsTotal: (sw.uplinkPortCount || 4) * (sw.qty || 1),
      uplinkPortsUsed: 0,
      connectedDevices: [],
      alerts: []
    };
  });

  const factor = 1 + ((typeof extraHeadroomPercent !== "undefined" ? extraHeadroomPercent : 20) / 100);

  projectBOM.forEach(item => {
    if (!item || item.parentInstanceId || !item.uplinkTargetId) return;

    const host = switchAudits[item.uplinkTargetId];
    if (!host) return;

    const qty = item.qty || 1;

    if (item.role === "Access") {
      const isDual = item.uplinkMode === "lag_dual" || item.stackedUnits >= 2;
      const linksUsed = isDual ? 2 : 1;

      host.usedDownlinkPorts += linksUsed;
      host.connectedDevices.push(`${item.model} (${linksUsed}x ${isDual ? 'LAG Uplinks' : 'Uplink'})`);
    } else {
      host.usedDownlinkPorts += qty;

      if (item.powerSource === "poe_switch" || (!item.powerSource && (item.poeStandard || item.poeWattsDrawn))) {
        const itemWatts = (item.powerConsumptionWatts || item.maxPowerWatts || item.powerWatts || item.baseWatts || item.poeWattsDrawn || 15) * qty;
        host.consumedPoEWatts += Math.ceil(itemWatts * factor);

        if (item.poeStandardRequired === "802.3bt-60" && host.poeStandard === "802.3at") {
          host.alerts.push(`Device "${item.model}" requires 60W bt, but switch only supports 30W at.`);
        }
      }
      host.connectedDevices.push(`${item.model} (${qty}x port)`);
    }
  });

  Object.values(switchAudits).forEach(audit => {
    if (audit.totalPorts > 0 && audit.usedDownlinkPorts > audit.totalPorts) {
      audit.alerts.push(`Port Exhaustion: ${audit.usedDownlinkPorts}/${audit.totalPorts} ports assigned!`);
    }
    if (audit.consumedPoEWatts > audit.totalPoEBudget && audit.totalPoEBudget > 0) {
      audit.alerts.push(`PoE Overload: ${audit.consumedPoEWatts}W required, budget is ${audit.totalPoEBudget}W!`);
    }
  });

  return switchAudits;
}

function setUplinkTarget(childInstanceId, targetSwitchId) {
  const child = projectBOM.find(i => i.instanceId === childInstanceId);
  if (!child) return;

  child.uplinkTargetId = targetSwitchId === "none" ? null : targetSwitchId;
  child.hostSwitchId = child.uplinkTargetId;
  FacilityStore.notifyWorkspaceChange();
}

function setPowerSource(childInstanceId, powerType) {
  const child = projectBOM.find(i => i.instanceId === childInstanceId);
  if (!child) return;

  if (typeof PortEngine !== "undefined" && typeof PortEngine.setPowerSource === "function") {
    PortEngine.setPowerSource(child, powerType);
  } else {
    child.powerSource = powerType;
    FacilityStore.notifyWorkspaceChange();
  }
}

// -----------------------------------------------------------
// BOM View HTML Renderers
// -----------------------------------------------------------
function updateBOMView() {
  const merakiAlertEl = document.getElementById("merakiLicenseAlert");
  if (merakiAlertEl) {
    const compliance = checkMerakiCompliance();
    if (!compliance.compliant) {
      merakiAlertEl.classList.remove("hidden");
    } else {
      merakiAlertEl.classList.add("hidden");
    }
  }

  let totalUnits = 0, totalPoE = 0, totalMSRP = 0;
  projectBOM.forEach(item => {
    totalUnits += item.qty;
    totalPoE += ((item.poeBudget || 0) * item.qty);
    totalMSRP += (item.msrp * item.qty);
  });

  const targetPoE = typeof calculatePoETarget === "function" ? calculatePoETarget() : { budgetWithHeadroom: 0, totalCameras: 0 };
  const budgetWithHeadroom = targetPoE.budgetWithHeadroom || 0;
  const totalCameras = targetPoE.totalCameras || 0;

  // Tally active connected devices power from switch audits
  let activeConnectedPoE = 0;
  let activeConnectedPorts = 0;
  if (typeof auditSwitchCapacities === "function") {
    const audits = auditSwitchCapacities();
    Object.values(audits).forEach(a => {
      activeConnectedPoE += (a.consumedPoEWatts || 0);
      activeConnectedPorts += (a.usedDownlinkPorts || 0);
    });
  }

  const auditContainer = document.getElementById("bomPoEHeadroomAudit");
  if (auditContainer) {
    if (totalCameras === 0 && activeConnectedPoE === 0) {
      auditContainer.innerHTML = `
        <div class="flex items-center justify-between text-slate-400">
          <span>Calculator Demand: <strong class="text-white">0 Devices</strong></span>
          <span class="font-mono text-slate-500 text-[11px]">No Target Specified</span>
        </div>
      `;
    } else if (totalCameras > 0) {
      const delta = totalPoE - budgetWithHeadroom;
      const isSurplus = delta >= 0;
      const pctCoverage = Math.round((totalPoE / (budgetWithHeadroom || 1)) * 100);

      auditContainer.innerHTML = `
        <div class="space-y-1.5">
          <div class="flex items-center justify-between">
            <span class="text-slate-400">Calculator Target (${totalCameras} Ports, +${extraHeadroomPercent}%):</span>
            <span class="font-mono font-bold text-white">${budgetWithHeadroom} W</span>
          </div>
          <div class="flex items-center justify-between pt-1 border-t border-slate-800">
            <span class="${isSurplus ? 'text-emerald-400' : 'text-rose-400'} font-bold flex items-center gap-1">
              <i data-lucide="${isSurplus ? 'check-circle-2' : 'alert-octagon'}" class="w-3.5 h-3.5"></i>
              ${isSurplus ? 'PoE Capacity Surplus' : 'PoE Deficit Alert'}:
            </span>
            <span class="font-mono font-bold ${isSurplus ? 'text-emerald-300' : 'text-rose-400'}">
              ${isSurplus ? '+' : ''}${delta} W (${pctCoverage}% coverage)
            </span>
          </div>
          ${activeConnectedPoE > 0 ? `
            <div class="flex items-center justify-between text-[11px] text-slate-400 pt-0.5 border-t border-slate-900">
              <span>BOM Device Draw (${activeConnectedPorts} Ports):</span>
              <span class="font-mono font-bold text-sky-400">${activeConnectedPoE} W (${Math.round((activeConnectedPoE / (totalPoE || 1)) * 100)}% utilized)</span>
            </div>
          ` : ''}
        </div>
      `;
    } else {
      // totalCameras === 0 but devices are connected in BOM
      const pctUtil = Math.round((activeConnectedPoE / (totalPoE || 1)) * 100);
      const isOver = activeConnectedPoE > totalPoE;
      auditContainer.innerHTML = `
        <div class="space-y-1">
          <div class="flex items-center justify-between">
            <span class="text-slate-400">Connected Edge Devices (${activeConnectedPorts} Ports):</span>
            <span class="font-mono font-bold text-sky-400">${activeConnectedPoE} W</span>
          </div>
          <div class="flex items-center justify-between pt-1 border-t border-slate-800">
            <span class="${isOver ? 'text-rose-400' : 'text-emerald-400'} font-bold flex items-center gap-1 text-[11px]">
              <i data-lucide="${isOver ? 'alert-octagon' : 'check-circle-2'}" class="w-3.5 h-3.5"></i>
              ${isOver ? 'PoE Capacity Exceeded' : 'Active Quoted PoE Headroom'}:
            </span>
            <span class="font-mono font-bold ${isOver ? 'text-rose-400' : 'text-emerald-300'}">
              ${totalPoE - activeConnectedPoE} W Free (${pctUtil}% loaded)
            </span>
          </div>
        </div>
      `;
    }

    if (typeof safeCreateIcons === "function") {
      safeCreateIcons(auditContainer);
    } else if (window.lucide) {
      lucide.createIcons();
    }
  }

  const badge = document.getElementById("bomCountBadge");
  if (badge) badge.innerText = totalUnits;
  const totalUnitsEl = document.getElementById("bomTotalUnits");
  if (totalUnitsEl) totalUnitsEl.innerText = totalUnits;
  const totalPoEEl = document.getElementById("bomTotalPoE");
  if (totalPoEEl) totalPoEEl.innerText = `${totalPoE.toLocaleString()} W`;
  const totalMSRPEl = document.getElementById("bomTotalMSRP");
  if (totalMSRPEl) totalMSRPEl.innerText = `$${totalMSRP.toLocaleString()}`;

  const listContainer = document.getElementById("bomItemsList");
  if (!listContainer) return;

  if (projectBOM.length === 0) {
    listContainer.innerHTML = `<div class="py-12 text-center text-slate-500"><p class="text-xs font-semibold text-slate-400">Your Project BOM is empty</p></div>`;
    return;
  }

  if (bomViewMode === "flat") {
    listContainer.innerHTML = projectBOM.map(item => renderBomSingleItemHtml(item)).join("");
  } else {
    const groups = {};
    projectBOM.forEach(item => {
      if (item.parentInstanceId) return;
      const rawLoc = item.closetName || item.rackId || FacilityStore.UNASSIGNED;
      const key = typeof FacilityStore !== "undefined" ? FacilityStore.normalize(rawLoc) : rawLoc;
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });

    let groupedHtml = "";
    Object.entries(groups).forEach(([locKey, items]) => {
      let locWatts = 0, locCost = 0;
      items.forEach(it => {
        locWatts += ((it.poeBudget || 0) + (it.baseWatts || 0)) * it.qty;
        locCost += it.msrp * it.qty;
        projectBOM.filter(ch => ch.parentInstanceId === it.instanceId).forEach(ch => {
          locCost += ch.msrp * ch.qty;
          locWatts += (ch.baseWatts || 0) * ch.qty;
        });
      });

      const isUnassignedGroup = locKey === FacilityStore.UNASSIGNED;

      groupedHtml += `
        <div class="space-y-2 pt-1">
          <div class="${isUnassignedGroup ? 'bg-amber-950/25 border-amber-800/40' : 'bg-slate-850 border-slate-750'} px-3 py-1.5 rounded-lg border flex items-center justify-between text-xs">
            <span class="font-bold ${isUnassignedGroup ? 'text-amber-300' : 'text-indigo-300'} flex items-center gap-1.5">
              <i data-lucide="${isUnassignedGroup ? 'inbox' : 'map-pin'}" class="w-3.5 h-3.5 ${isUnassignedGroup ? 'text-amber-400' : 'text-indigo-400'}"></i>
              ${isUnassignedGroup ? 'Unassigned Equipment (Staging)' : locKey}
            </span>
            <span class="font-mono text-slate-400 text-[11px]">${locWatts}W Load &bull; $${locCost.toLocaleString()}</span>
          </div>
          <div class="space-y-2">
            ${items.map(it => renderBomSingleItemHtml(it)).join("")}
          </div>
        </div>
      `;
    });

    listContainer.innerHTML = groupedHtml;
  }

  if (window.lucide) {
    try { lucide.createIcons(); } catch(e) {}
  }
}

function renderBomSingleItemHtml(item) {
  if (item.parentInstanceId) {
    return `
      <div class="ml-4 bg-slate-950/70 p-2 rounded-lg border border-slate-800/60 flex items-center justify-between text-xs">
        <div>
          <span class="text-slate-300 font-medium">${item.model}</span>
          <div class="text-[10px] font-mono text-slate-500">${item.role} &bull; SKU: ${item.sku}</div>
        </div>
        <div class="text-right">
          <span class="font-mono text-emerald-400 font-semibold">$${(item.msrp * item.qty).toLocaleString()}</span>
          <span class="text-[10px] text-slate-400 block">${item.qty}x @ $${item.msrp}</span>
        </div>
      </div>
    `;
  }

  const allLocations = getAllDefinedLocations();
  const rawLoc = item.closetName || item.rackId || FacilityStore.UNASSIGNED;
  const currentLocationKey = typeof FacilityStore !== "undefined" ? FacilityStore.normalize(rawLoc) : rawLoc;
  const pwr = (typeof PortEngine !== "undefined") ? PortEngine.getDevicePowerSource(item) : (item.powerSource || "internal_psu");
  const pwrBadge = (typeof PortEngine !== "undefined" && PortEngine.POWER_MODES[pwr]) ? PortEngine.POWER_MODES[pwr] : null;

  return `
    <div class="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2.5 shadow-sm hover:border-slate-700 transition-colors">
      
      <!-- Location & Rack Fast-Move Header -->
      <div class="flex items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
        <div class="flex items-center gap-1.5 flex-1 min-w-0">
          <i data-lucide="${currentLocationKey === FacilityStore.UNASSIGNED ? 'inbox' : 'map-pin'}" class="w-3.5 h-3.5 ${currentLocationKey === FacilityStore.UNASSIGNED ? 'text-amber-400' : 'text-indigo-400'} shrink-0"></i>
          <select onchange="handleLocationDropdownChange(this, (newLoc) => setItemLocation('${item.instanceId}', newLoc))" data-previous-val="${currentLocationKey}" class="bg-slate-900 border border-slate-700 text-slate-200 text-[11px] font-bold rounded px-2 py-0.5 focus:outline-none focus:border-brand-500 max-w-[220px] truncate" title="Change Assigned Rack / Location">
            ${allLocations.map(loc => `
              <option value="${escapeHTML(loc)}" ${loc === currentLocationKey ? 'selected' : ''}>${escapeHTML(loc)}</option>
            `).join('')}
            <option value="new_location">+ Create New Location...</option>
          </select>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          ${item.isDinMounted ? `
            <span class="text-[10px] text-amber-400 border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 rounded font-mono uppercase">
              Field/DIN
            </span>
          ` : `
            <span class="text-[10px] text-slate-400 font-mono uppercase">
              ${escapeHTML(item.role || 'Hardware')}
            </span>
          `}
        </div>
      </div>

      <!-- Device Info & Quantity Controls -->
      <div class="flex items-center justify-between gap-3">
        <div class="flex-1 min-w-0">
          <span class="text-xs font-bold text-white truncate block">${escapeHTML(item.model)}</span>
          <div class="text-[10px] font-mono text-slate-400">SKU: ${escapeHTML(item.sku)}</div>
          <div class="text-[11px] text-emerald-400 font-mono mt-0.5 font-semibold">$${(item.msrp * item.qty).toLocaleString()} <span class="text-slate-500 font-normal">($${item.msrp.toLocaleString()} ea)</span></div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <div class="flex items-center bg-slate-900 border border-slate-700 rounded-lg">
            <button onclick="changeBomQty('${item.instanceId}', -1)" class="px-2 py-1 text-slate-400 hover:text-white font-bold transition-colors" title="Decrease Quantity">-</button>
            <span class="px-2 text-xs font-mono font-bold text-white">${item.qty}</span>
            <button onclick="changeBomQty('${item.instanceId}', 1)" class="px-2 py-1 text-slate-400 hover:text-white font-bold transition-colors" title="Increase Quantity">+</button>
          </div>
          <button onclick="removeBomItem('${item.instanceId}')" class="text-slate-500 hover:text-rose-400 p-1 transition-colors" title="Remove from BOM">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
      </div>

      <!-- Streamlined Technical & Power Badge Footer -->
      <div class="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs gap-2">
        <div class="flex items-center gap-1.5 min-w-0 flex-wrap">
          <button 
            type="button" 
            onclick="jumpToTopologyTarget('node:${item.instanceId}')" 
            class="text-[10px] text-indigo-300 hover:text-white flex items-center gap-1 bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-800/40 px-2 py-0.5 rounded transition-all shrink-0 cursor-pointer" 
            title="Inspect ports, wire speeds, and logical uplinks in Topology"
          >
            <i data-lucide="network" class="w-3 h-3 text-indigo-400"></i>
            <span>Topology</span>
          </button>
          <button 
            type="button" 
            onclick="jumpToPhysicalLayoutTarget('${item.instanceId}')" 
            class="text-[10px] text-amber-300 hover:text-white flex items-center gap-1 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/40 px-2 py-0.5 rounded transition-all shrink-0 cursor-pointer" 
            title="Inspect blueprint, floor drops, and cable pathways in Physical Layout"
          >
            <i data-lucide="map" class="w-3 h-3 text-amber-400"></i>
            <span>Physical</span>
          </button>
          ${item.uplinkTargetId ? `
            <span class="text-[10px] text-slate-400 font-mono truncate" title="Uplink configured">
              Linked
            </span>
          ` : ''}
        </div>

        <div class="flex items-center gap-1.5 shrink-0">
          ${pwrBadge ? `
            <span class="text-[9px] ${pwrBadge.badgeClass || 'bg-slate-800 text-slate-300 border-slate-700'} border px-1.5 py-0.5 rounded font-mono font-semibold flex items-center gap-1">
              <span>${pwrBadge.icon}</span>
              <span>${pwrBadge.badgeLabel}</span>
            </span>
          ` : ''}
        </div>
      </div>

      <!-- Stacking Controls for Stackable Access/Aggregation Switches -->
      ${(item.canStack || item.role === "Access" || item.role === "Aggregation") ? `
        <div class="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
          <span class="text-slate-400">Units in stack:</span>
          <div class="flex items-center gap-2">
            <select onchange="updateStackedCount('${item.instanceId}', this.value)" class="bg-slate-900 border border-slate-700 text-xs text-white rounded px-2 py-0.5 focus:outline-none focus:border-brand-500 font-mono">
              <option value="0" ${(!item.stackedUnits || item.stackedUnits === 0) ? 'selected' : ''}>0 (Standalone)</option>
              <option value="2" ${item.stackedUnits === 2 ? 'selected' : ''}>2 Stacked Units</option>
              <option value="3" ${item.stackedUnits === 3 ? 'selected' : ''}>3 Stacked Units</option>
              <option value="4" ${item.stackedUnits === 4 ? 'selected' : ''}>4 Stacked Units</option>
            </select>
            <span class="text-[10px] font-mono ${item.stackedUnits >= 2 ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30' : 'text-slate-500 bg-slate-900 border-slate-800'} px-1.5 py-0.5 rounded border">
              ${item.stackedUnits >= 2 ? `+${item.stackedUnits}x Cables` : '0 Cables'}
            </span>
          </div>
        </div>
      ` : ''}

      <!-- Nested Sub-Items (Modular Sleds, Power Supplies, Feature Licenses, Injectors) -->
      <div class="space-y-1.5">
        ${projectBOM.filter(ch => ch.parentInstanceId === item.instanceId).map(ch => `
          <div class="bg-slate-900/70 p-2 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
            <div>
              <span class="text-slate-300 font-medium">${escapeHTML(ch.model)}</span>
              <div class="text-[10px] font-mono text-slate-500">${escapeHTML(ch.role)} &bull; SKU: ${escapeHTML(ch.sku)}</div>
            </div>
            <div class="text-right">
              <span class="font-mono text-emerald-400 font-semibold">$${(ch.msrp * ch.qty).toLocaleString()}</span>
              <span class="text-[10px] text-slate-400 block">${ch.qty}x @ $${ch.msrp}</span>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// -----------------------------------------------------------
// Cloud Licensing Manager Modal
// -----------------------------------------------------------
function toggleLicenseModal() {
  const modal = document.getElementById("licenseModal");
  if (!modal) return;

  if (modal.classList.contains("hidden")) {
    modal.classList.remove("hidden");
    renderLicenseManagerContent();
  } else {
    modal.classList.add("hidden");
  }
}

function getAvailableTermsInBOM() {
  const parentItems = projectBOM.filter(i => !i.parentInstanceId && (i.role === "Access" || i.role === "Core" || i.role === "Aggregation" || i.role === "Security WAN"));
  const termSet = new Set();

  parentItems.forEach(item => {
    const vendorCatalog = MGMT_SUBSCRIPTION_CATALOG[item.vendor] || {};
    Object.values(vendorCatalog).forEach(profile => {
      if (profile && profile.terms) {
        Object.keys(profile.terms).forEach(termKey => {
          if (termKey !== "PERP") termSet.add(termKey);
        });
      }
    });
  });

  const standardOrder = ["1YR", "2YR", "3YR", "5YR", "7YR", "10YR"];
  return standardOrder.filter(t => termSet.has(t));
}

function renderLicenseManagerContent() {
  const container = document.getElementById("licenseManagerContent");
  if (!container) return;

  const parentDevices = projectBOM.filter(i => !i.parentInstanceId && (i.role === "Access" || i.role === "Core" || i.role === "Aggregation" || i.role === "Security WAN"));

  if (parentDevices.length === 0) {
    container.innerHTML = `
      <div class="py-12 text-center text-slate-500 text-xs">
        <p class="font-semibold text-slate-400">No manageable devices in the BOM.</p>
        <p class="mt-1">Add switches or firewalls to configure licensing terms.</p>
      </div>`;
    return;
  }

  const availableTerms = getAvailableTermsInBOM();
  if (availableTerms.length > 0 && !availableTerms.includes(globalSelectedTerm)) {
    globalSelectedTerm = availableTerms[0];
  }

  const deployedVendors = [...new Set(parentDevices.map(d => d.vendor))];

  container.innerHTML = `
    <div class="space-y-4 text-xs">
      <div class="bg-slate-900 p-3.5 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span class="font-bold text-white text-sm block">Global Subscription Duration:</span>
          <span class="text-slate-400 text-[11px]">Only durations supported by your quoted hardware are shown.</span>
        </div>
        <div class="flex items-center gap-1.5">
          ${availableTerms.map(term => `
            <button onclick="setGlobalTerm('${term}')" class="px-2.5 py-1 rounded text-xs font-mono font-bold border transition-all ${globalSelectedTerm === term ? 'bg-purple-600 border-purple-400 text-white shadow-md' : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-white'}">
              ${term}
            </button>
          `).join('')}
        </div>
      </div>

      <div class="bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-2">
        <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Batch Assign Management by Manufacturer:</span>
        <div class="flex flex-wrap gap-2">
          ${deployedVendors.map(vendor => {
            const vendorProfiles = MGMT_SUBSCRIPTION_CATALOG[vendor] || {};
            const profileKeys = Object.keys(vendorProfiles);
            if (profileKeys.length === 0) return '';

            return profileKeys.map(pKey => `
              <button onclick="setVendorManagementProfile('${vendor}', '${pKey}')" class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-purple-900/40 border border-slate-700 hover:border-purple-500/50 text-[11px] text-slate-300 hover:text-purple-200 transition-colors flex items-center gap-1.5">
                <span class="font-bold text-white">${vendor}:</span>
                <span>${vendorProfiles[pKey].name}</span>
              </button>
            `).join('');
          }).join('')}
          <button onclick="clearAllManagementLicenses()" class="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-400 hover:text-rose-300 transition-colors">
            Set All to Standalone ($0)
          </button>
        </div>
      </div>

      <div class="space-y-2">
        <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Individual Device Management Routing:</span>
        ${parentDevices.map(dev => {
          const vendorProfiles = MGMT_SUBSCRIPTION_CATALOG[dev.vendor] || {};
          const currentMgmtItem = projectBOM.find(i => i.parentInstanceId === dev.instanceId && (i.role === "Mgmt License" || i.role === "Security License"));
          
          let activeKey = dev.selectedMgmtProfile;
          if (!activeKey || (!vendorProfiles[activeKey] && activeKey !== "standalone")) {
            activeKey = dev.vendor === "Meraki" ? "cloud" : "standalone";
            dev.selectedMgmtProfile = activeKey;
          }

          const activeProfile = vendorProfiles[activeKey];
          const deviceSupportedTerms = (activeProfile && activeProfile.terms) ? Object.keys(activeProfile.terms).filter(t => t !== "PERP") : [];
          const rawLoc = dev.closetName || dev.rackId || FacilityStore.UNASSIGNED;
          const locationLabel = typeof FacilityStore !== "undefined" ? FacilityStore.normalize(rawLoc) : rawLoc;

          return `
            <div class="bg-slate-900 p-3 rounded-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <span class="font-bold text-white truncate">${dev.model}</span>
                  <span class="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 border border-slate-700 text-slate-400 font-mono">${dev.vendor}</span>
                </div>
                <span class="text-[10px] text-slate-400 font-mono">${dev.qty}x units &bull; Location: [${locationLabel}]</span>
              </div>

              <div class="flex flex-wrap items-center gap-3">
                <select onchange="updateSwitchMgmtProfile('${dev.instanceId}', this.value)" class="bg-slate-950 border border-slate-700 text-purple-300 font-semibold rounded px-2.5 py-1 text-xs focus:outline-none focus:border-purple-500">
                  ${Object.entries(vendorProfiles).map(([pKey, pData]) => `
                    <option value="${pKey}" ${activeKey === pKey ? 'selected' : ''}>${pData.name}</option>
                  `).join('')}
                  ${dev.vendor !== "Meraki" ? `
                    <option value="standalone" ${activeKey === 'standalone' ? 'selected' : ''}>Standalone / Air-Gapped CLI ($0)</option>
                  ` : ''}
                </select>

                ${deviceSupportedTerms.length > 1 ? `
                  <div class="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                    ${deviceSupportedTerms.map(t => `
                      <button onclick="setIndividualDeviceTerm('${dev.instanceId}', '${t}')" class="px-1.5 py-0.5 text-[10px] font-mono rounded font-bold ${dev.individualTerm === t || (!dev.individualTerm && globalSelectedTerm === t) ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}">
                        ${t}
                      </button>
                    `).join('')}
                  </div>
                ` : ''}

                <div class="w-24 text-right font-mono text-emerald-400 font-bold text-xs">
                  ${currentMgmtItem ? `$${(currentMgmtItem.msrp * currentMgmtItem.qty).toLocaleString()}` : '$0'}
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  if (window.lucide) {
    try { lucide.createIcons(); } catch(e) {}
  }
}

function setGlobalTerm(term) {
  globalSelectedTerm = term;
  const parentDevices = projectBOM.filter(i => !i.parentInstanceId && (i.role === "Access" || i.role === "Core" || i.role === "Aggregation" || i.role === "Security WAN"));

  parentDevices.forEach(dev => {
    dev.individualTerm = null;
    if (dev.selectedMgmtProfile && dev.selectedMgmtProfile !== "standalone") {
      applyManagementSubscription(dev.instanceId, dev.selectedMgmtProfile, globalSelectedTerm);
    }
  });

  FacilityStore.notifyWorkspaceChange();
  renderLicenseManagerContent();
  showToast(`Updated all cloud subscriptions to ${term} terms.`);
}

function setIndividualDeviceTerm(instanceId, term) {
  const dev = projectBOM.find(i => i.instanceId === instanceId);
  if (!dev) return;

  dev.individualTerm = term;
  applyManagementSubscription(instanceId, dev.selectedMgmtProfile, term);

  FacilityStore.notifyWorkspaceChange();
  renderLicenseManagerContent();
  showToast(`Updated ${dev.model} to ${term} term.`);
}

function setVendorManagementProfile(vendor, profileKey) {
  const devices = projectBOM.filter(i => !i.parentInstanceId && i.vendor === vendor);
  devices.forEach(dev => {
    dev.selectedMgmtProfile = profileKey;
    const term = dev.individualTerm || globalSelectedTerm;
    applyManagementSubscription(dev.instanceId, profileKey, term);
  });

  FacilityStore.notifyWorkspaceChange();
  renderLicenseManagerContent();
  showToast(`Applied ${profileKey} across all ${vendor} devices.`);
}

function clearAllManagementLicenses() {
  const parentDevices = projectBOM.filter(i => !i.parentInstanceId);
  parentDevices.forEach(dev => {
    if (dev.vendor === "Meraki") {
      dev.selectedMgmtProfile = "cloud";
      applyManagementSubscription(dev.instanceId, "cloud", globalSelectedTerm || "1YR");
    } else {
      dev.selectedMgmtProfile = "standalone";
      applyManagementSubscription(dev.instanceId, "standalone", "PERP");
    }
  });

  FacilityStore.notifyWorkspaceChange();
  renderLicenseManagerContent();
  showToast("Cleared non-mandatory subscriptions. Meraki retained required licenses.");
}

function updateSwitchMgmtProfile(instanceId, profileKey) {
  const dev = projectBOM.find(i => i.instanceId === instanceId);
  const term = (dev && dev.individualTerm) ? dev.individualTerm : globalSelectedTerm;
  applyManagementSubscription(instanceId, profileKey, term);

  FacilityStore.notifyWorkspaceChange();
  renderLicenseManagerContent();
  showToast("Updated management subscription.");
}

// -----------------------------------------------------------
// Quote Export & Clipboard
// -----------------------------------------------------------
function copyBomSummary() {
  if (projectBOM.length === 0) { showToast("Cannot export empty BOM."); return; }

  const compliance = checkMerakiCompliance();
  if (!compliance.compliant) {
    showToast("Compliance Alert: Configure Meraki licensing before copying.");
    toggleLicenseModal();
    return;
  }

  let txt = `SECURITY NETWORK INFRASTRUCTURE BOM\n\n`;
  let totalMSRP = 0;
  projectBOM.forEach(i => {
    totalMSRP += (i.msrp * i.qty);
    const rawLoc = i.closetName || i.rackId || FacilityStore.UNASSIGNED;
    const loc = `[${typeof FacilityStore !== "undefined" ? FacilityStore.normalize(rawLoc) : rawLoc}] `;
    const lagStr = i.uplinkMode === 'lag_dual' ? ' (2x LAG Uplink)' : '';
    txt += `${loc}[${i.qty}x] ${i.vendor} ${i.model}${lagStr} (SKU: ${i.sku}) - $${(i.msrp * i.qty).toLocaleString()}\n`;
  });
  txt += `\nTotal Estimated Hardware MSRP: $${totalMSRP.toLocaleString()}\n`;
  navigator.clipboard.writeText(txt).then(() => showToast("BOM copied to clipboard!"));
}

function exportBomCSV() {
  if (projectBOM.length === 0) { showToast("Cannot export empty BOM."); return; }

  const compliance = checkMerakiCompliance();
  if (!compliance.compliant) {
    showToast("Compliance Alert: Configure Meraki licensing before exporting.");
    toggleLicenseModal();
    return;
  }

  let csv = "Location,Rack,Role,Vendor,Model,SKU,Quantity,Uplink Mode,Unit MSRP,Total MSRP,PoE Budget,Power Watts\n";
  projectBOM.forEach(i => {
    const rawLoc = i.closetName || i.rackId || FacilityStore.UNASSIGNED;
    const normalizedLoc = typeof FacilityStore !== "undefined" ? FacilityStore.normalize(rawLoc) : rawLoc;
    const parsed = typeof FacilityStore !== "undefined" ? FacilityStore.parse(normalizedLoc) : { space: "General", enclosure: "General" };
    const totalW = ((i.poeBudget || 0) + (i.baseWatts || 0)) * i.qty;
    csv += `"${parsed.space}","${parsed.enclosure}","${i.role || 'Accessory'}","${i.vendor}","${i.model}","${i.sku}",${i.qty},"${i.uplinkMode || 'single'}",${i.msrp},${i.msrp * i.qty},${i.poeBudget || 0},${totalW}\n`;
  });
  const link = document.createElement("a");
  link.href = "data:text/csv;charset=utf-8," + encodeURI(csv);
  link.download = `Security_Infrastructure_BOM_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  showToast("Exported BOM CSV.");
}

// Window Compatibility Exports
window.addToProjectBOM = addToProjectBOM;
window.addFirewallToBOM = addFirewallToBOM;
window.addOpticsToBOM = addOpticsToBOM;
window.addWirelessToBOM = addWirelessToBOM;
window.addServerToBOM = addServerToBOM;
window.addCameraToBOM = addCameraToBOM;
window.addAccessDeviceToBOM = addAccessDeviceToBOM;
window.handleLocationDropdownChange = handleLocationDropdownChange;
window.setItemLocation = setItemLocation;
window.updateBOMView = updateBOMView;
window.removeBomItem = removeBomItem;
window.clearBom = clearBom;
window.changeBomQty = changeBomQty;
window.toggleBomDrawer = toggleBomDrawer;
window.exportBomCSV = exportBomCSV;
window.auditSwitchCapacities = auditSwitchCapacities;
window.autoResolveUplinks = autoResolveUplinks;
window.updateStackedCount = updateStackedCount;
window.applyStackCabling = applyStackCabling;
window.jumpToPhysicalLayoutTarget = typeof jumpToPhysicalLayoutTarget !== "undefined" ? jumpToPhysicalLayoutTarget : (typeof window !== "undefined" ? window.jumpToPhysicalLayoutTarget : null);