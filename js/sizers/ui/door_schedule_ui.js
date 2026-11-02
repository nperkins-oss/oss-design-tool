// SUBSYSTEM: Sizer UI — Doors & Access Control Schedule Builder Studio UI (js/sizers/ui/door_schedule_ui.js)

function addDoorPackageToBom(skipConfirm = false) {
  const defs = (typeof StorageService !== "undefined" && typeof StorageService.getProjectDefaults === "function") ? StorageService.getProjectDefaults() : null;
  if (!skipConfirm && defs && defs.accessControl?.enabled === false && typeof confirmProjectDefaultChange === "function") {
    confirmProjectDefaultChange({
      title: "Access Control Marked Out of Orion Scope",
      settingLabel: "Orion Scope of Work • Access Control System (ACS)",
      defaultLabel: "Excluded / Out of Scope",
      newLabel: "Access Control In Scope",
      message: "Your Project Scope & Defaults currently mark Access Control (ACS) as Excluded / Out of Scope. Are you sure you want to add this Door Package to the BOM?",
      allowLocalOverride: true,
      localOverrideLabel: "Add Door Package Once",
      updateDefaultLabel: "Enable Access Control in Project Scope",
      onLocalOverride: () => { window._bypassAcsScopePromptOnce = true; try { addDoorPackageToBom(true); } finally { window._bypassAcsScopePromptOnce = false; } },
      onUpdateDefault: () => {
        if (typeof updateSingleProjectDefault === "function") {
          updateSingleProjectDefault(d => { if (!d.accessControl) d.accessControl = {}; d.accessControl.enabled = true; });
        }
        addDoorPackageToBom(true);
      }
    });
    return;
  }
  const doors = Math.max(1, parseInt(doorPkgQty, 10) || 1);
  const preset = doorPkgPreset || "standard_strike";
  if (typeof addToBOM !== "function") return;

  if (preset === "ip_edge_door") {
    addToBOM("axis-a1001", doors);
    addToBOM("hid-signo-40", doors);
    addToBOM("hes-1006-electric-strike", doors);
    addToBOM("bosch-ds160-rex", doors);
    addToBOM("gri-180-12-dps", doors);
  } else {
    const controllersNeeded = Math.ceil(doors / 2);
    addToBOM("mercury-lp1502", controllersNeeded);
    if (controllersNeeded >= 2) {
      addToBOM("altronix-trove2m2", Math.ceil(controllersNeeded / 4));
    }
    addToBOM("hid-signo-40", doors);
    if (preset === "rim_exit_strike") {
      addToBOM("hes-9600-surface-strike", doors);
      addToBOM("gri-180-12-dps", doors);
    } else if (preset === "perimeter_maglock") {
      addToBOM("securitron-m62-maglock", doors);
      addToBOM("sentrol-1078c-dps", doors);
    } else {
      addToBOM("hes-1006-electric-strike", doors);
      addToBOM("gri-180-12-dps", doors);
    }
    addToBOM("bosch-ds160-rex", doors);
  }

  if (typeof showToast === "function") {
    showToast(`Added ${doors}-Door Access Control Package (${preset.replace(/_/g, " ")}) to BOM.`, "success");
  }
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
  if (typeof updateProjectHealthUI === "function") updateProjectHealthUI();
}
window.addDoorPackageToBom = addDoorPackageToBom;


// =========================================================================
// DOORS & ACCESS CONTROL SCHEDULE BUILDER STUDIO
// (EN.Synergis Supported Hardware and Features 12.0_3.3_5.14.xlsx & Milestone XProtect Access)
// =========================================================================

const DOOR_BUILDER_PRESETS = {
  standard_strike: {
    id: "standard_strike",
    vendor: "mercury",
    label: "Mercury LP1502 • Standard Interior / Mortise Strike Door (2-Door Panel)",
    controllerId: "mercury-lp1502",
    controllerLabel: "Mercury LP1502 (2-Door Intelligent Controller via Cloud Link)",
    doorsPerController: 2,
    requiresCloudLink: true,
    isGenetecSuppliedHardware: true,
    readerId: "hid-signo-40",
    readerLabel: "HID Signo 40 OSDP/BLE Wall Reader",
    lockId: "hes-1006-electric-strike",
    lockLabel: "HES 1006 Series Heavy-Duty Electric Strike",
    rexId: "bosch-ds160-rex",
    rexLabel: "Bosch DS160 Request-to-Exit PIR Sensor",
    dpsId: "gri-180-12-dps",
    dpsLabel: "GRI 180-12 Recessed Door Position Switch",
    enclosureId: "altronix-trove2m2",
    enclosureLabel: "Altronix Trove2M2 Enclosure (Up to 8 Doors / 4 Panels)",
    lockMilliamps12v: 450
  },
  rim_exit_strike: {
    id: "rim_exit_strike",
    vendor: "mercury",
    label: "Mercury LP1502 • Crash-Bar Rim Exit Device Door (2-Door Panel)",
    controllerId: "mercury-lp1502",
    controllerLabel: "Mercury LP1502 (2-Door Intelligent Controller via Cloud Link)",
    doorsPerController: 2,
    requiresCloudLink: true,
    isGenetecSuppliedHardware: true,
    readerId: "hid-signo-40",
    readerLabel: "HID Signo 40 OSDP/BLE Wall Reader",
    lockId: "hes-9600-surface-strike",
    lockLabel: "HES 9600 Surface-Mount Rim Exit Strike",
    rexId: "bosch-ds160-rex",
    rexLabel: "Bosch DS160 Request-to-Exit PIR Sensor",
    dpsId: "gri-180-12-dps",
    dpsLabel: "GRI 180-12 Recessed Door Position Switch",
    enclosureId: "altronix-trove2m2",
    enclosureLabel: "Altronix Trove2M2 Enclosure (Up to 8 Doors / 4 Panels)",
    lockMilliamps12v: 450
  },
  perimeter_maglock: {
    id: "perimeter_maglock",
    vendor: "mercury",
    label: "Mercury LP1502 • Perimeter / Double-Glass Maglock Door (1200 lb)",
    controllerId: "mercury-lp1502",
    controllerLabel: "Mercury LP1502 (2-Door Intelligent Controller via Cloud Link)",
    doorsPerController: 2,
    requiresCloudLink: true,
    isGenetecSuppliedHardware: true,
    readerId: "hid-signo-40",
    readerLabel: "HID Signo 40 OSDP/BLE Wall Reader",
    lockId: "securitron-m62-maglock",
    lockLabel: "Securitron M62 1200lb Weatherproof Maglock",
    rexId: "bosch-ds160-rex",
    rexLabel: "Bosch DS160 Request-to-Exit PIR Sensor",
    dpsId: "sentrol-1078c-dps",
    dpsLabel: "Sentrol 1078C Armored Steel Door Contact",
    enclosureId: "altronix-trove2m2",
    enclosureLabel: "Altronix Trove2M2 Enclosure (Up to 8 Doors / 4 Panels)",
    lockMilliamps12v: 250
  },
  mercury_mp1502_strike: {
    id: "mercury_mp1502_strike",
    vendor: "mercury_mp",
    label: "Mercury MP1502 (SC 5.12.1+ Native) • Next-Gen 2-Door OSDP Controller Kit",
    controllerId: "mercury-lp1502",
    controllerLabel: "Mercury MP1502 Next-Gen 2-Door Controller (Up to 32/Cloud Link)",
    doorsPerController: 2,
    requiresCloudLink: true,
    isGenetecSuppliedHardware: true,
    readerId: "hid-signo-40",
    readerLabel: "HID Signo 40 OSDP Secure Channel Reader",
    lockId: "hes-1006-electric-strike",
    lockLabel: "HES 1006 Series Heavy-Duty Electric Strike",
    rexId: "bosch-ds160-rex",
    rexLabel: "Bosch DS160 Request-to-Exit PIR Sensor",
    dpsId: "gri-180-12-dps",
    dpsLabel: "GRI 180-12 Recessed Door Position Switch",
    enclosureId: "altronix-trove2m2",
    enclosureLabel: "Altronix Trove2M2 Enclosure (Up to 8 Doors / 4 MP Panels)",
    lockMilliamps12v: 450
  },
  axis_pbg_a1610: {
    id: "axis_pbg_a1610",
    vendor: "axis_pbg",
    label: "Axis A1610 Powered by Genetec • 2-Door PoE+ Direct IP (0 Cloud Links Needed!)",
    controllerId: "axis-a1001",
    controllerLabel: "Axis A1610 Powered by Genetec (2-Door • 250k Cardholders • Direct to Access Mgr)",
    doorsPerController: 2,
    requiresCloudLink: false,
    isGenetecSuppliedHardware: true,
    readerId: "hid-signo-40",
    readerLabel: "HID Signo 40 OSDP/BLE Wall Reader",
    lockId: "hes-1006-electric-strike",
    lockLabel: "HES 1006 Series Heavy-Duty Electric Strike",
    rexId: "bosch-ds160-rex",
    rexLabel: "Bosch DS160 Request-to-Exit PIR Sensor",
    dpsId: "gri-180-12-dps",
    dpsLabel: "GRI 180-12 Recessed Door Position Switch",
    enclosureId: null,
    enclosureLabel: "Plenum PoE+ Edge Mount (Direct IP to Security Center — 0 Cloud Links)",
    lockMilliamps12v: 450
  },
  ip_edge_door: {
    id: "ip_edge_door",
    vendor: "axis",
    label: "Axis A1001 • Single-Door PoE+ IP Edge Controller Kit",
    controllerId: "axis-a1001",
    controllerLabel: "Axis A1001 Network PoE+ Door Controller (30/Cloud Link or Milestone Secure Entry)",
    doorsPerController: 1,
    requiresCloudLink: true,
    isGenetecSuppliedHardware: false,
    readerId: "hid-signo-40",
    readerLabel: "HID Signo 40 OSDP/BLE Wall Reader",
    lockId: "hes-1006-electric-strike",
    lockLabel: "HES 1006 Series Heavy-Duty Electric Strike",
    rexId: "bosch-ds160-rex",
    rexLabel: "Bosch DS160 Request-to-Exit PIR Sensor",
    dpsId: "gri-180-12-dps",
    dpsLabel: "GRI 180-12 Recessed Door Position Switch",
    enclosureId: null,
    enclosureLabel: "Plenum Above-Door PoE+ Edge Mount",
    lockMilliamps12v: 450
  },
  axis_rim_exit: {
    id: "axis_rim_exit",
    vendor: "axis",
    label: "Axis A1001 • Crash-Bar Rim Exit PoE+ IP Edge Door Kit",
    controllerId: "axis-a1001",
    controllerLabel: "Axis A1001 Network PoE+ Door Controller",
    doorsPerController: 1,
    requiresCloudLink: true,
    isGenetecSuppliedHardware: false,
    readerId: "hid-signo-40",
    readerLabel: "HID Signo 40 OSDP/BLE Wall Reader",
    lockId: "hes-9600-surface-strike",
    lockLabel: "HES 9600 Surface-Mount Rim Exit Strike",
    rexId: "bosch-ds160-rex",
    rexLabel: "Bosch DS160 Request-to-Exit PIR Sensor",
    dpsId: "gri-180-12-dps",
    dpsLabel: "GRI 180-12 Recessed Door Position Switch",
    enclosureId: null,
    enclosureLabel: "Plenum Above-Door PoE+ Edge Mount",
    lockMilliamps12v: 450
  },
  scl312_osdp_direct: {
    id: "scl312_osdp_direct",
    vendor: "scl312",
    label: "Synergis Cloud Link-312 • 12x RS-485 Direct OSDP Bus (Up to 48 Readers / 24 Doors)",
    controllerId: "genetec-synergis-cloudlink",
    controllerLabel: "Synergis Cloud Link-312 (12x RS-485 Ports • 32 OSDP I/O • 48 OSDP Readers)",
    doorsPerController: 24,
    requiresCloudLink: false,
    isGenetecSuppliedHardware: true,
    readerId: "hid-signo-40",
    readerLabel: "HID Signo 40 OSDP Direct RS-485 Bus Reader",
    lockId: "hes-1006-electric-strike",
    lockLabel: "HES 1006 Series Heavy-Duty Electric Strike",
    rexId: "bosch-ds160-rex",
    rexLabel: "Bosch DS160 Request-to-Exit PIR Sensor",
    dpsId: "gri-180-12-dps",
    dpsLabel: "GRI 180-12 Recessed Door Position Switch",
    enclosureId: "altronix-trove2m2",
    enclosureLabel: "Synergis Cloud Link-312 Direct RS-485 OSDP Architecture",
    lockMilliamps12v: 450
  }
};

const DOOR_PLATFORM_COMPATIBLE_CONTROLLERS = {
  genetec_synergis: [
    { value: "mercury", label: "Mercury LP Series (LP1502 + Cloud Link + Trove2)" },
    { value: "mercury_mp", label: "Mercury MP Series (MP1502 SC 5.12.1+ Native)" },
    { value: "axis_pbg", label: "Axis Powered by Genetec (A1610 — 0 Cloud Links!)" },
    { value: "axis", label: "Axis Network Controllers (A1001 PoE+)" },
    { value: "scl312", label: "Synergis Cloud Link-312 (12x RS-485 Direct OSDP)" }
  ],
  milestone_xpaccess: [
    { value: "mercury", label: "Mercury LP Series (LP1502 + Trove2 Enclosure)" },
    { value: "mercury_mp", label: "Mercury MP Series (MP1502 Intelligent Controller)" },
    { value: "axis", label: "Axis Network Controllers (A1001 / A1610 PoE+)" }
  ],
  milestone_axis_secure_entry: [
    { value: "axis", label: "Axis Network Controllers (A1001 / A1610 PoE+ Required)" }
  ],
  standalone: [
    { value: "mercury", label: "Mercury LP Series (LP1502 + Trove2 Enclosure)" },
    { value: "mercury_mp", label: "Mercury MP Series (MP1502 Intelligent Controller)" },
    { value: "axis", label: "Axis Network Controllers (A1001 / A1610 PoE+)" },
    { value: "swh_istar", label: "Software House iSTAR Ultra / Edge G2" },
    { value: "alta_cloud", label: "Avigilon Alta Smart Hub / Cloud ACU" }
  ]
};

function getDoorBuilderCompatibleControllers(platformKey) {
  if (platformKey === "standalone" && typeof StorageService !== "undefined" && typeof getCompatibleAcsControllersForHost === "function") {
    const defs = StorageService.getProjectDefaults?.();
    const eng = defs?.accessControl?.engine;
    if (eng && !["Genetec", "Milestone XProtect Access", "Milestone AXIS Secure Entry"].includes(eng)) {
      const hostList = getCompatibleAcsControllersForHost(eng);
      if (Array.isArray(hostList) && hostList.length > 0) return hostList;
    }
  }
  return DOOR_PLATFORM_COMPATIBLE_CONTROLLERS[platformKey] || DOOR_PLATFORM_COMPATIBLE_CONTROLLERS.genetec_synergis;
}
window.getDoorBuilderCompatibleControllers = getDoorBuilderCompatibleControllers;

function applyDoorBuilderControllerPreset(ctrlVal) {
  doorBuilderControllerVendor = ctrlVal;
  window.doorBuilderControllerVendor = ctrlVal;
  const defaultPresetMap = {
    mercury: "standard_strike",
    mercury_mp: "mercury_mp1502_strike",
    axis_pbg: "axis_pbg_a1610",
    axis: "ip_edge_door",
    scl312: "scl312_osdp_direct",
    swh_istar: "standard_strike",
    alta_cloud: "ip_edge_door"
  };
  const targetPreset = defaultPresetMap[ctrlVal] || "standard_strike";
  doorScheduleGroups.forEach(g => {
    g.preset = targetPreset;
  });
}

function setDoorBuilderParam(key, val, skipConfirm = false) {
  const defs = (typeof StorageService !== "undefined" && typeof StorageService.getProjectDefaults === "function") ? StorageService.getProjectDefaults() : null;
  if (key === "acsPlatform" && !skipConfirm && defs && typeof confirmProjectDefaultChange === "function" && !(typeof isProjectWizardOpen === "function" && isProjectWizardOpen())) {
    const defDoorPlat = typeof mapProjectAcsEngineToDoorPlatform === "function" ? mapProjectAcsEngineToDoorPlatform(defs.accessControl?.engine) : "genetec_synergis";
    if (val !== defDoorPlat && val !== doorBuilderAcsPlatform) {
      const defLbl = defs.accessControl?.engine || "Genetec";
      const newLbl = typeof mapDoorPlatformToEngineLabel === "function" ? mapDoorPlatformToEngineLabel(val) : val;
      confirmProjectDefaultChange({
        title: "Change Access Control Host Platform?",
        settingLabel: "Access Control System (ACS) Engine",
        defaultLabel: defLbl,
        newLabel: newLbl,
        message: `Your Project Default ACS Engine is set to "${defLbl}". Are you sure you want to change the Door Schedule Builder to "${newLbl}"?`,
        allowLocalOverride: true,
        localOverrideLabel: "Override in Door Builder Only",
        updateDefaultLabel: `Update Project Default to ${newLbl}`,
        onLocalOverride: () => setDoorBuilderParam(key, val, true),
        onUpdateDefault: () => {
          if (typeof updateSingleProjectDefault === "function") {
            updateSingleProjectDefault(d => {
              if (!d.accessControl) d.accessControl = {};
              d.accessControl.engine = newLbl;
              const compat = getDoorBuilderCompatibleControllers(val);
              if (compat.length > 0 && !compat.some(c => c.value === d.accessControl.controllerVendor)) {
                d.accessControl.controllerVendor = compat[0].value;
              }
            }, true);
          } else {
            setDoorBuilderParam(key, val, true);
          }
        },
        onCancel: () => { if (typeof buildCalculatorStrip === "function") buildCalculatorStrip(); }
      });
      return;
    }
  } else if (key === "controllerVendor" && !skipConfirm && defs && typeof confirmProjectDefaultChange === "function" && !(typeof isProjectWizardOpen === "function" && isProjectWizardOpen())) {
    const defCtrl = defs.accessControl?.controllerVendor || "mercury";
    const ctrlLabels = {
      mercury: "Mercury LP Series (LP1502 + Cloud Link + Trove2)",
      mercury_mp: "Mercury MP Series (MP1502 Native SC 5.12.1+)",
      axis_pbg: "Axis Powered by Genetec (A1610 Network Controller)",
      axis: "Axis Network Controllers (A1001 / A1610 PoE+)",
      scl312: "Synergis Cloud Link-312 (12x RS-485 Direct OSDP)",
      swh_istar: "Software House iSTAR Ultra / Edge G2",
      alta_cloud: "Avigilon Alta Smart Hub / Cloud ACU"
    };
    if (val !== defCtrl && val !== doorBuilderControllerVendor) {
      confirmProjectDefaultChange({
        title: "Change Door Controller Hardware Architecture?",
        settingLabel: "Access Control Door Controller Family",
        defaultLabel: ctrlLabels[defCtrl] || defCtrl,
        newLabel: ctrlLabels[val] || val,
        message: `Your Project Default Door Controller Architecture is set to "${ctrlLabels[defCtrl] || defCtrl}". Are you sure you want to switch to "${ctrlLabels[val] || val}"?`,
        allowLocalOverride: true,
        localOverrideLabel: "Override in Door Builder Only",
        updateDefaultLabel: "Update Project Default",
        onLocalOverride: () => setDoorBuilderParam(key, val, true),
        onUpdateDefault: () => {
          if (typeof updateSingleProjectDefault === "function") {
            updateSingleProjectDefault(d => { if (!d.accessControl) d.accessControl = {}; d.accessControl.controllerVendor = val; });
          }
          setDoorBuilderParam(key, val, true);
        },
        onCancel: () => { if (typeof buildCalculatorStrip === "function") buildCalculatorStrip(); }
      });
      return;
    }
  }
  if (key === "acsPlatform") {
    doorBuilderAcsPlatform = val;
    window.doorBuilderAcsPlatform = val;
    const compat = getDoorBuilderCompatibleControllers(val);
    if (compat.length > 0 && !compat.some(c => c.value === doorBuilderControllerVendor)) {
      applyDoorBuilderControllerPreset(compat[0].value);
    }
  } else if (key === "controllerVendor") {
    const compat = getDoorBuilderCompatibleControllers(doorBuilderAcsPlatform);
    const validCtrl = compat.some(c => c.value === val) ? val : (compat[0]?.value || "mercury");
    applyDoorBuilderControllerPreset(validCtrl);
  }
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
  if (typeof updateProjectHealthUI === "function") updateProjectHealthUI();
}
window.setDoorBuilderParam = setDoorBuilderParam;

let doorScheduleGroups = [
  { id: "door_grp_1", name: "Main Lobby & Perimeter Entrances", preset: "rim_exit_strike", doorQty: 4, readersPerDoor: 1 },
  { id: "door_grp_2", name: "Interior Office & IDF/MDF Doors", preset: "standard_strike", doorQty: 8, readersPerDoor: 1 }
];
window.doorScheduleGroups = doorScheduleGroups;

function addDoorScheduleGroup() {
  const nextIdx = doorScheduleGroups.length + 1;
  doorScheduleGroups.push({
    id: `door_grp_${Date.now()}_${nextIdx}`,
    name: `Door Group ${nextIdx}`,
    preset: "standard_strike",
    doorQty: 2,
    readersPerDoor: 1
  });
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
}
window.addDoorScheduleGroup = addDoorScheduleGroup;

function duplicateDoorScheduleGroup(index) {
  const src = doorScheduleGroups[index];
  if (!src) return;
  doorScheduleGroups.splice(index + 1, 0, {
    ...src,
    id: `door_grp_${Date.now()}_${index + 2}`,
    name: `${src.name || "Door Group"} (Copy)`
  });
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
}
window.duplicateDoorScheduleGroup = duplicateDoorScheduleGroup;

function removeDoorScheduleGroup(index) {
  if (doorScheduleGroups.length <= 1) return;
  doorScheduleGroups.splice(index, 1);
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
}
window.removeDoorScheduleGroup = removeDoorScheduleGroup;

function updateDoorScheduleGroup(index, field, val) {
  if (!doorScheduleGroups[index]) return;
  doorScheduleGroups[index][field] = val;
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
}
window.updateDoorScheduleGroup = updateDoorScheduleGroup;

function calculateDoorScheduleRollup() {
  let totalDoors = 0;
  let totalReaders = 0;
  let genetecSuppliedReaders = 0;
  let externalReaders = 0;
  let mercuryDoors = 0;
  let mercuryReaders = 0;
  let axisPbgDoors = 0;
  let axisStandardDoors = 0;
  let scl312Doors = 0;
  let scl312Readers = 0;
  let edgePoEDoors = 0;
  let totalLockCurrentMa = 0;
  const partTotals = {};

  const addPart = (id, qty) => {
    if (!id || !(qty > 0)) return;
    partTotals[id] = (partTotals[id] || 0) + qty;
  };

  const rows = doorScheduleGroups.map(grp => {
    const p = DOOR_BUILDER_PRESETS[grp.preset] || DOOR_BUILDER_PRESETS.standard_strike;
    const doors = Math.max(1, parseInt(grp.doorQty, 10) || 1);
    const rdrPerDoor = Math.max(1, Math.min(2, parseInt(grp.readersPerDoor, 10) || 1));
    const readers = doors * rdrPerDoor;
    const controllers = Math.ceil(doors / (p.doorsPerController || 2));
    const lockMa = doors * (p.lockMilliamps12v || 450) + readers * 180;

    totalDoors += doors;
    totalReaders += readers;
    totalLockCurrentMa += lockMa;

    if (p.isGenetecSuppliedHardware) {
      genetecSuppliedReaders += readers;
    } else {
      externalReaders += readers;
    }

    if (p.vendor === "axis_pbg") {
      axisPbgDoors += doors;
      edgePoEDoors += doors;
      addPart("axis-a1001", controllers);
    } else if (p.vendor === "axis" || p.id === "ip_edge_door" || p.id === "axis_rim_exit") {
      axisStandardDoors += doors;
      edgePoEDoors += doors;
      addPart("axis-a1001", controllers);
    } else if (p.vendor === "scl312") {
      scl312Doors += doors;
      scl312Readers += readers;
    } else {
      mercuryDoors += doors;
      mercuryReaders += readers;
    }

    addPart(p.readerId, readers);
    addPart(p.lockId, doors);
    addPart(p.rexId, doors);
    addPart(p.dpsId, doors);

    return {
      ...grp,
      presetObj: p,
      doors,
      readersPerDoor: rdrPerDoor,
      readers,
      controllers,
      lockMa
    };
  });

  const totalMercuryControllers = mercuryDoors > 0 ? Math.ceil(mercuryDoors / 2) : 0;
  const totalTroveEnclosures = totalMercuryControllers > 0 ? Math.ceil(totalMercuryControllers / 4) : 0;
  if (totalMercuryControllers > 0) addPart("mercury-lp1502", totalMercuryControllers);
  if (totalTroveEnclosures > 0) addPart("altronix-trove2m2", totalTroveEnclosures);

  // Synergis Cloud Link Sizing (EN.Synergis Supported Hardware and Features 12.0_3.3_5.14.xlsx):
  // - Standard Synergis Cloud Link: max 32 Mercury LP/MP panels, max 30 Axis A1001/A1601, max 256 readers
  // - Axis Powered by Genetec (A1210/A1610/A1710-B/A1810-B): connects directly to Access Manager (0 Cloud Links!)
  // - Synergis Cloud Link-312: 12x RS-485 ports, max 48 OSDP non-transparent readers / 24 doors
  const sclForMercuryAndAxis = (totalMercuryControllers > 0 || axisStandardDoors > 0)
    ? Math.max(
        Math.ceil(totalMercuryControllers / 32),
        Math.ceil(axisStandardDoors / 30),
        Math.ceil((mercuryReaders + axisStandardDoors) / 256)
      )
    : 0;
  const scl312Units = scl312Readers > 0 ? Math.ceil(Math.max(scl312Readers / 48, scl312Doors / 24)) : 0;
  const totalCloudLinksRequired = doorBuilderAcsPlatform === "genetec_synergis"
    ? (sclForMercuryAndAxis + scl312Units)
    : 0;
  if (totalCloudLinksRequired > 0) {
    addPart("genetec-synergis-cloudlink", totalCloudLinksRequired);
  }

  return {
    rows,
    totalDoors,
    totalReaders,
    genetecSuppliedReaders,
    externalReaders,
    mercuryDoors,
    axisPbgDoors,
    axisStandardDoors,
    scl312Doors,
    edgePoEDoors,
    totalMercuryControllers,
    totalTroveEnclosures,
    totalCloudLinksRequired,
    scl312Units,
    totalLockCurrentAmps: Math.round((totalLockCurrentMa / 1000) * 100) / 100,
    partTotals
  };
}

function addFullDoorScheduleToBom(skipConfirm = false) {
  if (typeof addToBOM !== "function") return;
  const defs = (typeof StorageService !== "undefined" && typeof StorageService.getProjectDefaults === "function") ? StorageService.getProjectDefaults() : null;
  if (!skipConfirm && defs && defs.accessControl?.enabled === false && typeof confirmProjectDefaultChange === "function") {
    confirmProjectDefaultChange({
      title: "Access Control Marked Out of Orion Scope",
      settingLabel: "Orion Scope of Work • Access Control System (ACS)",
      defaultLabel: "Excluded / Out of Scope",
      newLabel: "Access Control In Scope",
      message: "Your Project Scope & Defaults currently mark Access Control (ACS) as Excluded / Out of Scope. Are you sure you want to commit this Door Schedule to the BOM?",
      allowLocalOverride: true,
      localOverrideLabel: "Add Door Schedule Once",
      updateDefaultLabel: "Enable Access Control in Project Scope",
      onLocalOverride: () => { window._bypassAcsScopePromptOnce = true; try { addFullDoorScheduleToBom(true); } finally { window._bypassAcsScopePromptOnce = false; } },
      onUpdateDefault: () => {
        if (typeof updateSingleProjectDefault === "function") {
          updateSingleProjectDefault(d => { if (!d.accessControl) d.accessControl = {}; d.accessControl.enabled = true; });
        }
        addFullDoorScheduleToBom(true);
      }
    });
    return;
  }
  const rollup = calculateDoorScheduleRollup();
  Object.entries(rollup.partTotals).forEach(([partId, qty]) => {
    addToBOM(partId, qty);
  });
  if (doorBuilderAcsPlatform === "milestone_xpaccess" && typeof setMilestoneLicParam === "function") {
    setMilestoneLicParam("enableAccessControl", true);
    setMilestoneLicParam("accessReadersOverride", rollup.totalReaders);
  } else if (doorBuilderAcsPlatform === "milestone_axis_secure_entry" && typeof setMilestoneLicParam === "function") {
    toggleMilestoneFeature("enableAxisSecureEntry", true);
    setMilestoneLicParam("axisSecureEntryDoorsOverride", rollup.totalDoors);
  } else if (typeof setGenetecLicParam === "function") {
    setGenetecLicParam("synergisGenetecReaders", rollup.genetecSuppliedReaders);
    setGenetecLicParam("synergisExternalReaders", rollup.externalReaders);
  }
  if (typeof showToast === "function") {
    showToast(`Added ${rollup.totalDoors}-Door Schedule (${rollup.totalReaders} Readers, ${rollup.totalMercuryControllers} Mercury LP/MP Panels, ${rollup.edgePoEDoors} Axis Controllers, ${rollup.totalCloudLinksRequired} Synergis Cloud Links) to Project BOM.`, "success");
  }
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
  if (typeof updateProjectHealthUI === "function") updateProjectHealthUI();
}
window.addFullDoorScheduleToBom = addFullDoorScheduleToBom;

function renderDoorBuilderStudioHtml(isFullStudio = true) {
  const compatCtrls = getDoorBuilderCompatibleControllers(doorBuilderAcsPlatform);
  if (compatCtrls.length > 0 && !compatCtrls.some(c => c.value === doorBuilderControllerVendor)) {
    applyDoorBuilderControllerPreset(compatCtrls[0].value);
  }
  const rollup = calculateDoorScheduleRollup();
  return `
    <div class="bg-slate-900/95 border border-slate-800 rounded-2xl p-3.5 sm:p-4 flex flex-col gap-3.5 shadow-lg">
      <!-- Header, Multi-Vendor Controller & ACS Head-End Selector, and KPI Rollup -->
      <div class="flex flex-col xl:flex-row xl:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div class="flex items-start sm:items-center gap-3">
          <div class="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shrink-0">
            <i data-lucide="door-open" class="w-5 h-5"></i>
          </div>
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <h4 class="text-xs font-bold text-white uppercase tracking-wider">
                Access Control Door Schedule &amp; Multi-Manufacturer Kit Builder
              </h4>
              <span class="px-2 py-0.5 rounded-md bg-amber-950/80 border border-amber-700/50 text-[10px] font-mono font-bold text-amber-300">
                ${rollup.totalDoors} Doors &bull; ${rollup.totalReaders} OSDP Readers &bull; ${rollup.totalMercuryControllers} Mercury LP/MP &bull; ${rollup.edgePoEDoors} Axis PoE+ &bull; ${rollup.totalCloudLinksRequired} Cloud Link(s)
              </span>
              <a href="Datasheets/Genetec/EN.Synergis Supported Hardware and Features 12.0_3.3_5.14.xlsx" target="_blank" class="text-[10px] text-purple-400 hover:underline flex items-center gap-1">
                <i data-lucide="file-spreadsheet" class="w-3 h-3"></i>
                <span>Synergis 12.0 / SCL 3.3 Hardware Matrix</span>
              </a>
            </div>
            <p class="text-[11px] text-slate-400 mt-0.5">
              Controller architectures are automatically filtered by the selected <strong class="text-sky-300">ACS Host Software</strong> across <strong class="text-white">Mercury LP/MP</strong>, <strong class="text-emerald-300">Axis Powered by Genetec (0 Cloud Links)</strong>, <strong class="text-sky-300">Axis PoE+</strong>, and <strong class="text-purple-300">Synergis Cloud Link-312</strong>.
            </p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2.5 shrink-0">
          <!-- ACS Head-End Software Platform Selector (Drives Compatible Controller Architectures) -->
          <div class="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5">
            <span class="text-[9px] font-bold uppercase text-slate-400">ACS Host Software:</span>
            <select onchange="setDoorBuilderParam('acsPlatform', this.value)" class="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-sky-300 font-bold text-xs focus:outline-none cursor-pointer">
              <option value="genetec_synergis" class="bg-slate-900" ${doorBuilderAcsPlatform === 'genetec_synergis' ? 'selected' : ''}>Genetec Synergis (Security Center 5.14)</option>
              <option value="milestone_xpaccess" class="bg-slate-900" ${doorBuilderAcsPlatform === 'milestone_xpaccess' ? 'selected' : ''}>Milestone XProtect Access ($129 + $39 per Reader)</option>
              <option value="milestone_axis_secure_entry" class="bg-slate-900" ${doorBuilderAcsPlatform === 'milestone_axis_secure_entry' ? 'selected' : ''}>Milestone AXIS Secure Entry ($89 per Door)</option>
              <option value="standalone" class="bg-slate-900" ${doorBuilderAcsPlatform === 'standalone' ? 'selected' : ''}>Standalone / Other ACS Head-End</option>
            </select>
          </div>

          <!-- Controller Ecosystem Quick Switcher (Filtered by ACS Host Software) -->
          <div class="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5">
            <span class="text-[9px] font-bold uppercase text-slate-400">Controller Architecture:</span>
            <select onchange="setDoorBuilderParam('controllerVendor', this.value)" class="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-amber-300 font-bold text-xs focus:outline-none cursor-pointer">
              ${compatCtrls.map(opt => `<option value="${opt.value}" class="bg-slate-900" ${doorBuilderControllerVendor === opt.value ? 'selected' : ''}>${opt.label}</option>`).join("")}
            </select>
          </div>

          <button onclick="addFullDoorScheduleToBom()" class="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer">
            <i data-lucide="package-plus" class="w-4 h-4"></i>
            <span>+ Add Full ${rollup.totalDoors}-Door Schedule to BOM</span>
          </button>
        </div>
      </div>

      <!-- Multi-Group Door Schedule Table -->
      <div class="bg-slate-950/90 border border-slate-800 rounded-xl p-3 flex flex-col gap-2.5">
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
          <div class="flex items-center gap-2">
            <span class="text-[11px] font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
              <i data-lucide="list-checks" class="w-3.5 h-3.5 text-amber-400"></i>
              <span>Project Door Schedule Groups (${rollup.rows.length})</span>
            </span>
            <button onclick="addDoorScheduleGroup()" class="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold flex items-center gap-1 shadow-sm transition-all cursor-pointer">
              <i data-lucide="plus" class="w-3.5 h-3.5"></i>
              <span>Add Door Group</span>
            </button>
          </div>
          <span class="text-[10px] font-mono text-slate-400">
            Synergis Cloud Link: 32 Mercury LP/MP panels / 256 readers / 600k cardholders &bull; Axis Powered by Genetec (A1610): Direct IP to Access Manager (0 Cloud Links) &bull; SCL-312: 12x RS-485 / 48 OSDP Readers
          </span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="border-b border-slate-800 text-[9px] uppercase font-bold text-slate-400">
                <th class="py-1.5 px-2 min-w-[180px]">Door Zone / Group Name</th>
                <th class="py-1.5 px-2 min-w-[260px]">Door Hardware Kit Preset</th>
                <th class="py-1.5 px-1.5 w-24 text-center">Door Quantity</th>
                <th class="py-1.5 px-1.5 w-36">Readers per Door</th>
                <th class="py-1.5 px-2">Included Lock &amp; Peripherals</th>
                <th class="py-1.5 px-2 text-right">Controllers</th>
                <th class="py-1.5 px-2 text-right">12V Load</th>
                <th class="py-1.5 px-1.5 text-center w-16">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/60">
              ${rollup.rows.map((row, idx) => `
                <tr class="hover:bg-slate-900/50 transition-colors">
                  <td class="py-1.5 px-2">
                    <input type="text" value="${escapeHTML(row.name || `Door Group ${idx + 1}`)}" onchange="updateDoorScheduleGroup(${idx}, 'name', this.value)" class="w-full bg-slate-900 border border-slate-700/80 rounded px-2 py-1 text-xs font-semibold text-white focus:outline-none focus:border-amber-500" />
                  </td>
                  <td class="py-1.5 px-2">
                    <select onchange="updateDoorScheduleGroup(${idx}, 'preset', this.value)" class="w-full bg-slate-900 border border-slate-700/80 rounded px-2 py-1 text-amber-300 font-bold text-xs focus:outline-none cursor-pointer">
                      ${Object.values(DOOR_BUILDER_PRESETS).map(p => `<option value="${p.id}" class="bg-slate-900" ${row.preset === p.id ? 'selected' : ''}>${p.label}</option>`).join('')}
                    </select>
                  </td>
                  <td class="py-1.5 px-1.5">
                    <input type="number" min="1" max="128" value="${row.doors}" onchange="updateDoorScheduleGroup(${idx}, 'doorQty', Math.max(1, parseInt(this.value, 10) || 1))" class="w-full bg-slate-900 border border-slate-700/80 rounded px-2 py-1 text-xs font-mono font-bold text-white text-center focus:outline-none focus:border-amber-500" />
                  </td>
                  <td class="py-1.5 px-1.5">
                    <select onchange="updateDoorScheduleGroup(${idx}, 'readersPerDoor', Number(this.value))" class="w-full bg-slate-900 border border-slate-700/80 rounded px-1.5 py-1 text-slate-200 font-mono text-xs focus:outline-none cursor-pointer">
                      <option value="1" class="bg-slate-900" ${row.readersPerDoor === 1 ? 'selected' : ''}>1x In + REX Out</option>
                      <option value="2" class="bg-slate-900" ${row.readersPerDoor === 2 ? 'selected' : ''}>2x In/Out Readers</option>
                    </select>
                  </td>
                  <td class="py-1.5 px-2 text-[10px] text-slate-300 font-mono">
                    ${row.presetObj.lockLabel} + ${row.presetObj.rexLabel} + ${row.presetObj.dpsLabel}
                  </td>
                  <td class="py-1.5 px-2 text-right font-mono text-sky-300 font-bold">
                    ${row.controllers}x ${row.presetObj.vendor === 'axis_pbg' ? 'Axis A1610 (Direct IP)' : row.presetObj.vendor === 'axis' ? 'Axis A1001' : row.presetObj.vendor === 'scl312' ? 'SCL-312' : row.presetObj.vendor === 'mercury_mp' ? 'MP1502' : 'LP1502'}
                  </td>
                  <td class="py-1.5 px-2 text-right font-mono text-emerald-400">
                    ${Math.round((row.lockMa / 1000) * 100) / 100} A
                  </td>
                  <td class="py-1.5 px-1.5 text-center">
                    <div class="flex items-center justify-center gap-1">
                      <button onclick="duplicateDoorScheduleGroup(${idx})" class="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-amber-300 transition-colors cursor-pointer" title="Duplicate door group">
                        <i data-lucide="copy" class="w-3.5 h-3.5"></i>
                      </button>
                      ${rollup.rows.length > 1 ? `
                        <button onclick="removeDoorScheduleGroup(${idx})" class="p-1 rounded hover:bg-rose-950/80 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer" title="Remove door group">
                          <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                        </button>
                      ` : ''}
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}
window.renderDoorBuilderStudioHtml = renderDoorBuilderStudioHtml;

if (window.OSS && typeof window.OSS.register === "function") {
  window.OSS.register("Sizers.UI.DoorSchedule", {
    addDoorPackageToBom,
    setDoorBuilderParam,
    addFullDoorScheduleToBom,
    renderDoorBuilderStudioHtml
  });
}
