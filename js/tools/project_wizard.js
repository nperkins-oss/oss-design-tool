// =========================================================================
// PROJECT CREATION & DEFAULTS WIZARD (NetSelect Enterprise v0.10.0-alpha)
// Multi-Step Technical Standards, Scope Toggles, Metadata, and Focus Mode
// =========================================================================

const CABLE_COLOR_PALETTE = {
  Yellow: { name: "Yellow", hex: "#eab308", border: "#ca8a04", dotClass: "bg-yellow-400", textClass: "text-yellow-400" },
  Blue: { name: "Blue", hex: "#3b82f6", border: "#2563eb", dotClass: "bg-blue-500", textClass: "text-blue-400" },
  Green: { name: "Green", hex: "#22c55e", border: "#16a34a", dotClass: "bg-emerald-500", textClass: "text-emerald-400" },
  Orange: { name: "Orange", hex: "#f97316", border: "#ea580c", dotClass: "bg-orange-500", textClass: "text-orange-400" },
  Purple: { name: "Purple", hex: "#a855f7", border: "#9333ea", dotClass: "bg-purple-500", textClass: "text-purple-400" },
  White: { name: "White", hex: "#f8fafc", border: "#cbd5e1", dotClass: "bg-white", textClass: "text-slate-200" },
  Gray: { name: "Gray", hex: "#94a3b8", border: "#64748b", dotClass: "bg-slate-400", textClass: "text-slate-400" },
  Black: { name: "Black", hex: "#334155", border: "#1e293b", dotClass: "bg-slate-700", textClass: "text-slate-300" },
  Red: { name: "Red", hex: "#ef4444", border: "#dc2626", dotClass: "bg-rose-500", textClass: "text-rose-400" }
};

const CABLE_DEVICE_TYPES = [
  { id: "cameras", label: "IP Cameras & Video Sensors", prefix: "CAM", icon: "video", defaultRun: "Yellow", defaultPatch: "Yellow" },
  { id: "accessControl", label: "Access Control & Door Controllers", prefix: "ACS", icon: "door-closed", defaultRun: "Yellow", defaultPatch: "Yellow" },
  { id: "intercom", label: "Audio & Intercom Stations", prefix: "SIP", icon: "phone-call", defaultRun: "Yellow", defaultPatch: "Yellow" },
  { id: "wireless", label: "Wireless APs & Radios", prefix: "P2P", icon: "wifi", defaultRun: "Yellow", defaultPatch: "Yellow" },
  { id: "data", label: "Workstations & Office Data", prefix: "CWS", icon: "monitor", defaultRun: "Yellow", defaultPatch: "Yellow" },
  { id: "servers", label: "Servers, Storage & NVRs", prefix: "SVR", icon: "server", defaultRun: "Yellow", defaultPatch: "Yellow" },
  { id: "uplinks", label: "Inter-Switch & Network Uplinks", prefix: "SW", icon: "network", defaultRun: "Yellow", defaultPatch: "Yellow" }
];

const WIZARD_SWITCH_VENDORS = ["Meraki", "Cisco", "UniFi", "Ruckus", "Juniper", "Allied Telesis", "AMG"];

const DEFAULT_PROJECT_STANDARDS = {
  metadata: {
    projectName: "New Security Infrastructure Project",
    jobOpportunityNumber: "",
    clientName: "",
    siteAddress: "",
    leadDesigner: ""
  },
  licensing: {
    globalSelectedTerm: "1YR"
  },
  accessControl: {
    enabled: true,
    engine: "Genetec",
    controllerVendor: "mercury", // "mercury" | "mercury_mp" | "axis_pbg" | "axis" | "scl312"
    readerProtocol: "osdp"
  },
  vms: {
    enabled: true,
    cameraDesignMode: "generic", // "generic" (Initial Design / ROM) | "specific" (Full Catalog SKUs)
    platform: "Milestone XProtect",
    editionTier: "auto", // Milestone: "auto"|"express_plus"|"professional_plus"|"expert"|"corporate"; Genetec: "auto"|"aio"|"standard"|"enterprise"
    failoverMode: "none", // "none" | "dedicated" | "ring"
    cameraVendors: ["Axis Communications", "Hanwha Vision", "Avigilon"],
    retentionDays: 30,
    promptAnalytics: true,
    headEndInScope: true
  },
  cabling: {
    horizontalCategories: ["C6A-CMP-1K-YL", "C6A-CMP-1K-BL"],
    compositeType: "AC-COMP-CMP-500",
    rackTermination: "patch_panels",
    patchCordLength: 0.5,
    fiberType: "mmf",
    opticsVendorMode: "oem", // "oem" (1st-Party Native) | "ironlink" (3rd-Party IronLink MSA) | "fs" (3rd-Party FS.com MSA)
    scope: {
      preset: "full_turnkey", // "full_turnkey" | "no_fiber" | "hardware_and_patch" | "active_hardware_only" | "custom"
      horizontalCabling: true, // Bulk Cat6A / Composite cable spools
      rackPatchPanels: true,   // Modular patch panels & keystone jacks
      patchCords: true,        // Headend switch-to-panel & field equipment patch cords
      fiberBackbone: true,     // Inter-closet fiber trunks & 1U Fiber LIU enclosures
      sfpAndDac: true          // Switch/Firewall SFP transceivers, DACs & LC-LC fiber jumpers
    },
    standards: {
      defaultRunColor: "Yellow",
      defaultRunCategory: "C6A-CMP-1K-YL",
      defaultPatchColor: "Yellow",
      defaultPatchLength: 0.5,
      defaultPatchType: "slim",
      byDeviceType: {
        cameras: { label: "IP Cameras & Video Sensors", runColor: "Yellow", runCategory: "C6A-CMP-1K-YL", patchColor: "Yellow", patchLength: 0.5, patchType: "slim" },
        accessControl: { label: "Access Control & Door Controllers", runColor: "Yellow", runCategory: "C6A-CMP-1K-YL", patchColor: "Yellow", patchLength: 0.5, patchType: "slim" },
        intercom: { label: "Audio & Intercom Stations", runColor: "Yellow", runCategory: "C6A-CMP-1K-YL", patchColor: "Yellow", patchLength: 0.5, patchType: "slim" },
        wireless: { label: "Wireless APs & Radios", runColor: "Yellow", runCategory: "C6A-CMP-1K-YL", patchColor: "Yellow", patchLength: 0.5, patchType: "slim" },
        data: { label: "Workstations & Office Data", runColor: "Yellow", runCategory: "C6A-CMP-1K-BL", patchColor: "Yellow", patchLength: 1.0, patchType: "slim" },
        servers: { label: "Servers, Storage & NVRs", runColor: "Yellow", runCategory: "C6A-CMP-1K-BL", patchColor: "Yellow", patchLength: 3.0, patchType: "slim" },
        uplinks: { label: "Inter-Switch & Network Uplinks", runColor: "Yellow", runCategory: "C6A-CMP-1K-BL", patchColor: "Yellow", patchLength: 1.0, patchType: "slim" }
      }
    }
  },
  network: {
    switchesInScope: true, // Active PoE switches, core aggregation & firewalls in Orion scope (false = Customer-Furnished IT Network)
    poeHeadroomPercent: 20, // +10% | +15% | +20% | +25% | +30% engineering reserve buffer
    preferredSwitchVendors: [], // Empty = All Switch Manufacturers; or subset of WIZARD_SWITCH_VENDORS
    vlanMode: "none", // "none" (Flat / Untagged Default) | "segmented" (802.1Q Segmented VLANs)
    cameraVlan: 20,
    accessVlan: 30,
    voiceVlan: 40,
    wirelessVlan: 50,
    dataVlan: 10,
    mgmtVlan: 99,
    nativeVlan: 1
  }
};

/**
 * Resolves the structured VLAN ID and Label for a device or switch port based on project standards.
 * By default, projects use `vlanMode: "none"` (No VLANs / Flat Untagged Network).
 */
const INFRA_SCOPE_PRESETS = {
  full_turnkey: {
    label: "Full Turnkey Infrastructure",
    shortLabel: "Full Turnkey",
    horizontalCabling: true,
    rackPatchPanels: true,
    patchCords: true,
    fiberBackbone: true,
    sfpAndDac: true
  },
  no_fiber: {
    label: "Switches, Edge & Copper Cabling (No Fiber)",
    shortLabel: "Copper & Gear (No Fiber)",
    horizontalCabling: true,
    rackPatchPanels: true,
    patchCords: true,
    fiberBackbone: false,
    sfpAndDac: true
  },
  hardware_and_patch: {
    label: "Hardware, Optics & Patch Cords Only (Cable by EC)",
    shortLabel: "Gear + Patch Cords",
    horizontalCabling: false,
    rackPatchPanels: false,
    patchCords: true,
    fiberBackbone: false,
    sfpAndDac: true
  },
  active_hardware_only: {
    label: "Active Hardware & Optics Only (No Passive Cabling)",
    shortLabel: "Active Gear Only",
    horizontalCabling: false,
    rackPatchPanels: false,
    patchCords: false,
    fiberBackbone: false,
    sfpAndDac: true
  }
};

function getProjectInfrastructureScope() {
  const defaults = (typeof StorageService !== "undefined" && typeof StorageService.getProjectDefaults === "function")
    ? StorageService.getProjectDefaults()
    : DEFAULT_PROJECT_STANDARDS;
  const raw = defaults?.cabling?.scope || DEFAULT_PROJECT_STANDARDS.cabling.scope || {};
  return {
    preset: raw.preset || "full_turnkey",
    horizontalCabling: raw.horizontalCabling !== false,
    rackPatchPanels: raw.rackPatchPanels !== false,
    patchCords: raw.patchCords !== false,
    fiberBackbone: raw.fiberBackbone !== false,
    sfpAndDac: raw.sfpAndDac !== false
  };
}

function getProjectOpticsVendorMode() {
  const defaults = (typeof StorageService !== "undefined" && typeof StorageService.getProjectDefaults === "function")
    ? StorageService.getProjectDefaults()
    : DEFAULT_PROJECT_STANDARDS;
  const mode = (defaults?.cabling?.opticsVendorMode || "oem").toLowerCase();
  if (mode === "ironlink" || mode === "fs") return mode;
  return "oem";
}

function getVendorEepromCode(vendor) {
  const v = String(vendor || "").toLowerCase();
  if (v.includes("meraki")) return "MER";
  if (v.includes("cisco")) return "CIS";
  if (v.includes("fortinet") || v.includes("fortigate")) return "FTN";
  if (v.includes("palo")) return "PAN";
  if (v.includes("juniper")) return "JNP";
  if (v.includes("ruckus")) return "RUK";
  if (v.includes("unifi") || v.includes("ubiquiti")) return "UBI";
  if (v.includes("allied")) return "ATI";
  if (v.includes("amg")) return "AMG";
  return "MSA";
}

function syncAllOpticsAndScopeUI() {
  const mode = getProjectOpticsVendorMode();
  ["wizOpticsVendorMode", "projectOpticsVendorSelect", "topoOpticsVendorSelect"].forEach(id => {
    const el = document.getElementById(id);
    if (el && el.value !== mode) el.value = mode;
  });

  const scope = getProjectInfrastructureScope();
  const presetEl = document.getElementById("physInfraScopeSelect");
  if (presetEl && presetEl.value !== scope.preset) presetEl.value = scope.preset;

  const defaults = (typeof StorageService !== "undefined" && typeof StorageService.getProjectDefaults === "function") ? StorageService.getProjectDefaults() : DEFAULT_PROJECT_STANDARDS;
  const fiberVal = defaults?.cabling?.fiberType || (typeof getProjectFiberType === "function" ? getProjectFiberType() : "mmf");
  ["topoProjectFiberSelect", "projectFiberSelect"].forEach(id => {
    const fEl = document.getElementById(id);
    if (fEl && fEl.value !== fiberVal) fEl.value = fiberVal;
  });
  const cTypeSel = document.getElementById("cableTypeSelector");
  if (cTypeSel) {
    const defCat = String(defaults?.cabling?.standards?.defaultRunCategory || defaults?.cabling?.horizontalCategories?.[0] || "C6A-CMP-1K-YL").toUpperCase().replace(/-(YL|BL|WH|GN|OR|GY|BK|RD|PU)$/, "");
    const matchOpt = Array.from(cTypeSel.options).find(o => o.value.toUpperCase().replace(/-(YL|BL|WH|GN|OR|GY|BK|RD|PU)$/, "") === defCat);
    if (matchOpt && cTypeSel.value !== matchOpt.value) cTypeSel.value = matchOpt.value;
  }
}

function setProjectOpticsVendorMode(mode, syncNow = true, skipConfirm = false) {
  const cleanMode = (mode === "ironlink" || mode === "fs") ? mode : "oem";
  const currentMode = getProjectOpticsVendorMode();
  const labelFor = (m) => m === "ironlink" ? "3rd-Party: IronLink MSA" : (m === "fs" ? "3rd-Party: FS.com MSA" : "1st-Party Native OEM");

  if (syncNow && !skipConfirm && !isProjectWizardOpen() && cleanMode !== currentMode && typeof confirmProjectDefaultChange === "function") {
    syncAllOpticsAndScopeUI(); // Hold UI at current default until confirmed
    confirmProjectDefaultChange({
      title: "Change SFP / DAC Sourcing Standard?",
      settingLabel: "Optics & DAC Sourcing Mode",
      defaultLabel: labelFor(currentMode),
      newLabel: labelFor(cleanMode),
      message: `Your Project Default for SFP transceivers and DAC cables is currently set to "${labelFor(currentMode)}". Are you sure you want to change it to "${labelFor(cleanMode)}" and re-synthesize project interconnects?`,
      allowLocalOverride: false,
      updateDefaultLabel: `Change to ${labelFor(cleanMode)}`,
      onUpdateDefault: () => setProjectOpticsVendorMode(cleanMode, true, true),
      onCancel: () => syncAllOpticsAndScopeUI()
    });
    return;
  }
  if (typeof StorageService !== "undefined" && typeof StorageService.getProjectDefaults === "function") {
    const defaults = StorageService.getProjectDefaults() || JSON.parse(JSON.stringify(DEFAULT_PROJECT_STANDARDS));
    if (!defaults.cabling) defaults.cabling = {};
    defaults.cabling.opticsVendorMode = cleanMode;
    StorageService.setProjectDefaults(defaults, null, { skipEngineSync: true });
    StorageService.saveCurrentProject(false);
  }
  if (wizardDraftState && wizardDraftState.cabling) {
    wizardDraftState.cabling.opticsVendorMode = cleanMode;
  }
  syncAllOpticsAndScopeUI();
  if (typeof renderProjectDefaultsSummary === "function") renderProjectDefaultsSummary();

  if (syncNow) {
    // Re-evaluate switch stack cables and topology interconnects
    if (typeof projectBOM !== "undefined" && Array.isArray(projectBOM) && typeof applyStackCabling === "function") {
      projectBOM.filter(i => i.stackedUnits && i.stackedUnits >= 2).forEach(sw => applyStackCabling(sw));
    }
    if (typeof autoSynthesizeInterconnects === "function") {
      autoSynthesizeInterconnects(true);
    }
    if (typeof renderBOM === "function") renderBOM();
    if (typeof updateBOMView === "function") updateBOMView();
    if (typeof showToast === "function") {
      const label = cleanMode === "ironlink" ? "3rd-Party Coded (IronLink MSA)" : (cleanMode === "fs" ? "3rd-Party Coded (FS.com MSA)" : "1st-Party Native OEM");
      showToast(`Optics & DAC Sourcing updated to: ${label}`);
    }
  }
}

function applyWizardInfraScopePreset(preset, syncNow = false, skipConfirm = false) {
  const cfg = INFRA_SCOPE_PRESETS[preset];
  const currentScope = getProjectInfrastructureScope();
  if (syncNow && !skipConfirm && !isProjectWizardOpen() && preset !== currentScope.preset && typeof confirmProjectDefaultChange === "function") {
    syncAllOpticsAndScopeUI(); // Hold UI at current default until confirmed
    const curLabel = INFRA_SCOPE_PRESETS[currentScope.preset]?.label || "Custom DOR Scope";
    const newLabel = cfg ? cfg.label : "Custom DOR Scope";
    if (preset === "custom") {
      openProjectWizardModal("edit");
      setTimeout(() => setProjectWizardStep(3), 60);
      return;
    }
    confirmProjectDefaultChange({
      title: "Change Orion Infrastructure Scope (DOR)?",
      settingLabel: "Division of Responsibility (Cabling & Passive Infra)",
      defaultLabel: curLabel,
      newLabel: newLabel,
      message: `Your Project Scope & Defaults currently set Infrastructure Responsibility to "${curLabel}". Are you sure you want to change Orion's scope to "${newLabel}" and reconcile the BOM?`,
      allowLocalOverride: false,
      updateDefaultLabel: `Update Scope to ${cfg?.shortLabel || preset}`,
      onUpdateDefault: () => applyWizardInfraScopePreset(preset, true, true),
      onCancel: () => syncAllOpticsAndScopeUI()
    });
    return;
  }
  if (cfg) {
    const map = {
      wizScopeHorizontal: cfg.horizontalCabling,
      wizScopePanels: cfg.rackPatchPanels,
      wizScopePatchCords: cfg.patchCords,
      wizScopeFiberBackbone: cfg.fiberBackbone,
      wizScopeSfpDac: cfg.sfpAndDac
    };
    Object.entries(map).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.checked = val;
    });
  }
  const sel = document.getElementById("wizInfraScopePreset");
  if (sel && sel.value !== preset) sel.value = preset;
  updateWizardInfraScopeBadge();

  if (syncNow && cfg && typeof StorageService !== "undefined" && typeof StorageService.getProjectDefaults === "function") {
    const defaults = StorageService.getProjectDefaults() || JSON.parse(JSON.stringify(DEFAULT_PROJECT_STANDARDS));
    if (!defaults.cabling) defaults.cabling = {};
    defaults.cabling.scope = {
      preset,
      horizontalCabling: cfg.horizontalCabling,
      rackPatchPanels: cfg.rackPatchPanels,
      patchCords: cfg.patchCords,
      fiberBackbone: cfg.fiberBackbone,
      sfpAndDac: cfg.sfpAndDac
    };
    StorageService.setProjectDefaults(defaults, null, { skipEngineSync: true });
    StorageService.saveCurrentProject(false);
    syncAllOpticsAndScopeUI();
    if (typeof renderProjectDefaultsSummary === "function") renderProjectDefaultsSummary();
    reconcileBOMForInfrastructureScope(true);
    if (typeof showToast === "function") {
      showToast(`Infrastructure Responsibility updated: ${cfg.label}`);
    }
  }
}

function onWizardInfraScopeCheckboxChange() {
  const h = document.getElementById("wizScopeHorizontal")?.checked !== false;
  const p = document.getElementById("wizScopePanels")?.checked !== false;
  const c = document.getElementById("wizScopePatchCords")?.checked !== false;
  const f = document.getElementById("wizScopeFiberBackbone")?.checked !== false;
  const s = document.getElementById("wizScopeSfpDac")?.checked !== false;

  let matchedPreset = "custom";
  Object.entries(INFRA_SCOPE_PRESETS).forEach(([key, cfg]) => {
    if (cfg.horizontalCabling === h && cfg.rackPatchPanels === p && cfg.patchCords === c && cfg.fiberBackbone === f && cfg.sfpAndDac === s) {
      matchedPreset = key;
    }
  });
  const sel = document.getElementById("wizInfraScopePreset");
  if (sel) sel.value = matchedPreset;
  updateWizardInfraScopeBadge();
}

function updateWizardInfraScopeBadge() {
  const badge = document.getElementById("wizInfraScopeBadge");
  const sel = document.getElementById("wizInfraScopePreset");
  if (!badge) return;
  const preset = sel ? sel.value : "full_turnkey";
  const cfg = INFRA_SCOPE_PRESETS[preset];
  badge.textContent = cfg ? cfg.shortLabel.toUpperCase() : "CUSTOM DOR SCOPE";
}

function reconcileBOMForInfrastructureScope(silent = true) {
  const scope = getProjectInfrastructureScope();
  if (typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) {
    // Re-apply standard pod cabling on switches so panels/cords reflect current scope
    if (typeof applyStandardPodCabling === "function") {
      projectBOM.filter(i => i.standardPod).forEach(sw => applyStandardPodCabling(sw));
    }
    // Re-sync floorplan cabling if horizontal drops or fiber trunks exist
    if (typeof commitCablingToBOM === "function") {
      const hasFloorItems = typeof facilityFloors !== "undefined" && Array.isArray(facilityFloors) &&
        facilityFloors.some(f => (f.nodes || []).some(n => n.type === "device") || (f.fiberBackbones || []).length > 0);
      if (hasFloorItems) {
        commitCablingToBOM({ silent: true });
      } else {
        // Remove any lingering cabling_sync items that are now out of scope
        for (let i = projectBOM.length - 1; i >= 0; i--) {
          const it = projectBOM[i];
          if (it.source !== "cabling_sync") continue;
          const sku = (it.sku || "").toUpperCase();
          if (!scope.horizontalCabling && (sku.includes("-1K") || sku.includes("-500"))) projectBOM.splice(i, 1);
          else if (!scope.rackPatchPanels && (sku.startsWith("PP-") || sku.includes("KEY"))) projectBOM.splice(i, 1);
          else if (!scope.patchCords && (sku.includes("SLIM") || sku.includes("PATCH"))) projectBOM.splice(i, 1);
          else if (!scope.fiberBackbone && sku.startsWith("FIBER-O")) projectBOM.splice(i, 1);
        }
      }
    }
    // Re-synthesize topology interconnects & Fiber LIUs
    if (typeof autoSynthesizeInterconnects === "function") {
      autoSynthesizeInterconnects(true);
    }
  }
  if (!silent && typeof renderBOM === "function") renderBOM();
}

function getProjectVlanDetailsForDevice(item, portObj = null, isUplink = false) {
  if (portObj && portObj.vlan && portObj.vlan !== "auto") {
    const rawVlan = String(portObj.vlan).trim();
    if (rawVlan.toLowerCase() === "untagged" || rawVlan.toLowerCase() === "none" || rawVlan === "1") {
      return { vlanId: 1, vlanName: "Untagged (Flat)", formatted: "Untagged (Flat)" };
    }
    if (rawVlan.toLowerCase() === "trunk") {
      return { vlanId: 1, vlanName: "802.1Q Trunk", formatted: "802.1Q Trunk" };
    }
    const num = parseInt(rawVlan, 10);
    if (!isNaN(num)) {
      return { vlanId: num, vlanName: `Custom VLAN ${num}`, formatted: `VLAN ${num}` };
    }
    return { vlanId: 1, vlanName: rawVlan, formatted: rawVlan };
  }

  const defaults = (typeof StorageService !== "undefined" && typeof StorageService.getProjectDefaults === "function")
    ? StorageService.getProjectDefaults()
    : DEFAULT_PROJECT_STANDARDS;
  const net = defaults?.network || DEFAULT_PROJECT_STANDARDS.network;

  // Default behavior: No VLANs ("none") -> Flat / Untagged Network
  if (!net || net.vlanMode !== "segmented") {
    return {
      vlanId: net?.nativeVlan || 1,
      vlanName: isUplink ? "Untagged Uplink (Flat)" : "Untagged (Flat Network)",
      formatted: "Untagged (Flat)"
    };
  }

  if (isUplink) {
    return {
      vlanId: net.nativeVlan || 1,
      vlanName: "802.1Q Infrastructure Trunk",
      formatted: `Trunk (Native ${net.nativeVlan || 1})`
    };
  }

  const key = getDeviceCablingKey(item);
  if (key === "cameras") {
    const id = parseInt(net.cameraVlan, 10) || 20;
    return { vlanId: id, vlanName: "Surveillance (CCTV)", formatted: `VLAN ${id} (CCTV)` };
  }
  if (key === "accessControl") {
    const id = parseInt(net.accessVlan, 10) || 30;
    return { vlanId: id, vlanName: "Access Control (ACS)", formatted: `VLAN ${id} (ACS)` };
  }
  if (key === "intercom") {
    const id = parseInt(net.voiceVlan, 10) || 40;
    return { vlanId: id, vlanName: "Intercom / SIP (VOIP)", formatted: `VLAN ${id} (SIP)` };
  }
  if (key === "wireless") {
    const id = parseInt(net.wirelessVlan, 10) || 50;
    return { vlanId: id, vlanName: "Wireless (WLAN)", formatted: `VLAN ${id} (WLAN)` };
  }
  if (key === "servers" || key === "uplinks") {
    const id = parseInt(net.mgmtVlan, 10) || 99;
    return { vlanId: id, vlanName: "Security Compute / MGMT", formatted: `VLAN ${id} (MGMT)` };
  }
  const id = parseInt(net.dataVlan, 10) || 10;
  return { vlanId: id, vlanName: "Corporate Data", formatted: `VLAN ${id} (DATA)` };
}

/**
 * Returns the formatted VLAN string for a device/port (e.g., "Untagged (Flat)" by default, or "VLAN 20 (CCTV)" when segmented)
 */
function getProjectVlanForDevice(item, portObj = null, isUplink = false) {
  return getProjectVlanDetailsForDevice(item, portObj, isUplink).formatted;
}

function toggleWizardVlanConfigUI(vlanMode) {
  const segGrid = document.getElementById("wizVlanSegmentGrid");
  const badge = document.getElementById("wizVlanModeBadge");
  const isSeg = vlanMode === "segmented";
  if (segGrid) {
    segGrid.classList.toggle("hidden", !isSeg);
  }
  if (badge) {
    badge.textContent = isSeg ? "802.1Q SEGMENTED" : "NO VLANS (DEFAULT)";
    badge.className = isSeg
      ? "text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30"
      : "text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30";
  }
}

/**
 * Maps any hardware device or taxonomy node to one of the 7 cabling subsystem keys
 */
function getDeviceCablingKey(item) {
  if (!item) return "default";

  let prefix = item.deviceTypePrefix || item.prefix;
  if (!prefix && typeof DeviceTaxonomy !== "undefined" && typeof DeviceTaxonomy.getDeviceType === "function") {
    prefix = DeviceTaxonomy.getDeviceType(item)?.prefix;
  }

  if (prefix === "CAM" || prefix === "LPR") return "cameras";
  if (prefix === "DR" || prefix === "ACS" || prefix === "BIO") return "accessControl";
  if (prefix === "SIP") return "intercom";
  if (prefix === "P2P" || prefix === "WAP") return "wireless";
  if (prefix === "CWS") return "data";
  if (prefix === "SVR") return "servers";
  if (prefix === "SW" || prefix === "FW") return "uplinks";

  const role = (item.role || "").toLowerCase();
  const cat = (item.category || "").toLowerCase();
  const model = (item.model || "").toLowerCase();
  const allText = `${role} ${cat} ${model}`;

  if (allText.includes("camera") || allText.includes("surveillance") || allText.includes("cctv") || allText.includes("dome") || allText.includes("bullet") || allText.includes("ptz")) return "cameras";
  if (allText.includes("access") || allText.includes("door") || allText.includes("reader") || allText.includes("trove") || allText.includes("mercury")) return "accessControl";
  if (allText.includes("intercom") || allText.includes("sip") || allText.includes("speaker") || allText.includes("audio")) return "intercom";
  if (allText.includes("wireless") || allText.includes("nanobeam") || allText.includes("wifi") || allText.includes("radio")) return "wireless";
  if (allText.includes("workstation") || allText.includes("client") || allText.includes("pc")) return "data";
  if (allText.includes("server") || allText.includes("nvr") || allText.includes("storage")) return "servers";
  if (allText.includes("switch") || allText.includes("router") || allText.includes("firewall") || allText.includes("uplink")) return "uplinks";

  return "default";
}

/**
 * Retrieves the project-wide cabling standard for a given device and mode ('run' or 'patch')
 */
function getProjectCablingStandard(item, type = "run") {
  const defaults = (typeof StorageService !== "undefined" && typeof StorageService.getProjectDefaults === "function")
    ? StorageService.getProjectDefaults()
    : (typeof DEFAULT_PROJECT_STANDARDS !== "undefined" ? DEFAULT_PROJECT_STANDARDS : null);

  const cabling = defaults?.cabling || {};
  const standards = cabling.standards || {};
  const byDev = standards.byDeviceType || {};
  const key = getDeviceCablingKey(item);
  const devConf = byDev[key] || {};

  const defaultRunColor = standards.defaultRunColor || "Yellow";
  const defaultPatchColor = standards.defaultPatchColor || "Yellow";
  const defaultRunCategory = standards.defaultRunCategory || "C6A-CMP-1K-YL";
  const defaultPatchLength = standards.defaultPatchLength ?? 0.5;
  const defaultPatchType = standards.defaultPatchType || "slim";

  if (type === "run") {
    const color = devConf.runColor || defaultRunColor;
    const category = devConf.runCategory || defaultRunCategory;
    const palette = CABLE_COLOR_PALETTE[color] || CABLE_COLOR_PALETTE.Yellow;
    return {
      color,
      category,
      hex: palette.hex,
      border: palette.border,
      dotClass: palette.dotClass,
      textClass: palette.textClass
    };
  } else {
    const color = devConf.patchColor || defaultPatchColor;
    const lengthFt = devConf.patchLength ?? defaultPatchLength;
    const patchType = devConf.patchType || defaultPatchType;
    const palette = CABLE_COLOR_PALETTE[color] || CABLE_COLOR_PALETTE.Yellow;
    return {
      color,
      lengthFt,
      patchType,
      hex: palette.hex,
      border: palette.border,
      dotClass: palette.dotClass,
      textClass: palette.textClass
    };
  }
}

/**
 * Quick action to apply a specific color to all device types (both runs and patch cords)
 */
function applyDefaultCableColorToAll(color = "Yellow") {
  const defRunEl = document.getElementById("wizDefaultRunColor");
  const defPatchEl = document.getElementById("wizDefaultPatchColor");
  if (defRunEl) defRunEl.value = color;
  if (defPatchEl) defPatchEl.value = color;

  CABLE_DEVICE_TYPES.forEach(dt => {
    const runEl = document.getElementById(`wizCableRunColor-${dt.id}`);
    const patchEl = document.getElementById(`wizCablePatchColor-${dt.id}`);
    if (runEl) runEl.value = color;
    if (patchEl) patchEl.value = color;
    updateCableColorPreviewDot(`wizCableRunDot-${dt.id}`, color);
    updateCableColorPreviewDot(`wizCablePatchDot-${dt.id}`, color);
  });
  updateCableColorPreviewDot("wizDefaultRunDot", color);
  updateCableColorPreviewDot("wizDefaultPatchDot", color);

  updateWizardStateFromUI();
  if (typeof showToast === "function") {
    showToast(`Applied ${color} as default across all cable runs and patch cords.`, "info");
  }
}

function updateCableColorPreviewDot(elementId, color) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const pal = CABLE_COLOR_PALETTE[color] || CABLE_COLOR_PALETTE.Yellow;
  el.style.backgroundColor = pal.hex;
  el.title = `${pal.name} (${pal.hex})`;
}

let currentWizardMode = "create"; // "create" | "edit"
let currentWizardStep = 1;
const WIZARD_TOTAL_STEPS = 4;
let wizardDraftState = JSON.parse(JSON.stringify(DEFAULT_PROJECT_STANDARDS));

/**
 * Handles Enter key inside Step 1 text inputs so pressing Enter advances step-by-step
 * through the default questions rather than skipping them.
 */
function handleWizardInputKeydown(event) {
  if (!event || event.key !== "Enter") return;
  event.preventDefault();
  if (currentWizardStep < WIZARD_TOTAL_STEPS) {
    setProjectWizardStep(currentWizardStep + 1);
  } else {
    submitProjectWizard();
  }
}

/**
 * Updates Camera Specification Workflow Mode card styling in Step 1
 */
function selectWizardCameraDesignMode(mode) {
  const cleanMode = mode === "specific" ? "specific" : "generic";
  const hiddenEl = document.getElementById("wizCameraDesignMode");
  if (hiddenEl) hiddenEl.value = cleanMode;

  const genCard = document.getElementById("wizCamModeCard-generic");
  const specCard = document.getElementById("wizCamModeCard-specific");
  if (genCard) {
    genCard.className = cleanMode === "generic"
      ? "text-left p-2.5 rounded-xl border border-emerald-500/60 bg-emerald-950/30 ring-1 ring-emerald-500/30 transition-all cursor-pointer"
      : "text-left p-2.5 rounded-xl border border-slate-800 bg-slate-950/70 hover:border-slate-700 transition-all cursor-pointer";
  }
  if (specCard) {
    specCard.className = cleanMode === "specific"
      ? "text-left p-2.5 rounded-xl border border-sky-500/60 bg-sky-950/30 ring-1 ring-sky-500/30 transition-all cursor-pointer"
      : "text-left p-2.5 rounded-xl border border-slate-800 bg-slate-950/70 hover:border-slate-700 transition-all cursor-pointer";
  }
}

/**
 * Dynamically populates the VMS Edition / Base Package Tier dropdown based on selected VMS Platform
 */
function updateWizardVmsTierOptions(platform, desiredVal = null) {
  const tierEl = document.getElementById("wizVmsEditionTier");
  if (!tierEl) return;
  const prevVal = desiredVal !== null ? desiredVal : (tierEl.value || "auto");
  const p = String(platform || "").toLowerCase();

  let options = [];
  if (p.includes("milestone") || p.includes("xprotect")) {
    options = [
      { value: "auto", label: "Auto-Select Edition (Express+ / Professional+ / Expert / Corporate)" },
      { value: "express_plus", label: "XProtect Express+ (≤100 Cameras, 1 Server • $29 Base + $109/cam)" },
      { value: "professional_plus", label: "XProtect Professional+ (Unlimited Cameras • $566 Base + $192/cam)" },
      { value: "expert", label: "XProtect Expert (Failover & Encryption • $2,267 Base + $305/cam)" },
      { value: "corporate", label: "XProtect Corporate (Smart Wall & Federation • $3,610 Base + $373/cam)" }
    ];
  } else if (p.includes("genetec") && !p.includes("saas")) {
    options = [
      { value: "auto", label: "Auto-Select Tier (Streamvault AIO / Standard / Enterprise)" },
      { value: "aio", label: "Streamvault All-in-One Tier (≤32 Cameras • $120/camera)" },
      { value: "standard", label: "Security Center Base Standard — GSC-BASE-S ($200/camera)" },
      { value: "enterprise", label: "Security Center Base Enterprise — GSC-BASE-E ($325/camera)" }
    ];
  } else {
    options = [
      { value: "auto", label: "Standard Platform Channel Licensing (Auto)" }
    ];
  }

  tierEl.innerHTML = options.map(o => `<option value="${o.value}">${o.label}</option>`).join("");
  if (options.some(o => o.value === prevVal)) {
    tierEl.value = prevVal;
  } else {
    tierEl.value = "auto";
  }
}

/**
 * Refreshes the Step 2 Video/VMS summary badge from Step 1 scope toggles
 */
function refreshWizardVmsStep2Badge() {
  const step2Badge = document.getElementById("wizVmsStep2Badge");
  if (!step2Badge) return;
  const vmsEnabled = document.getElementById("wizVmsToggle") ? document.getElementById("wizVmsToggle").checked : true;
  const headEndInScope = document.getElementById("wizVmsHeadEndInScope") ? document.getElementById("wizVmsHeadEndInScope").checked : true;

  if (!vmsEnabled) {
    step2Badge.textContent = "EXCLUDED / OUT OF SCOPE";
    step2Badge.className = "text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700";
  } else if (headEndInScope) {
    step2Badge.textContent = "CAMERAS + VMS TURNKEY";
    step2Badge.className = "text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30";
  } else {
    step2Badge.textContent = "CAMERAS ONLY • EXISTING VMS";
    step2Badge.className = "text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/30";
  }
}

/**
 * Visually dims VMS Server/Edition/Retention controls when head-end is Customer-Furnished (OFE)
 */
function toggleWizardVmsHeadEndUI(headEndInScope) {
  const edWrap = document.getElementById("wizVmsEditionWrapper");
  const stRow = document.getElementById("wizVmsStorageRow");
  [edWrap, stRow].forEach(el => {
    if (el) {
      el.classList.toggle("opacity-45", !headEndInScope);
    }
  });

  const heBadge = document.getElementById("wizVmsHeadEndBadge");
  if (heBadge) {
    heBadge.textContent = headEndInScope ? "TURNKEY" : "EXISTING VMS";
    heBadge.className = headEndInScope
      ? "text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
      : "text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700";
  }
  refreshWizardVmsStep2Badge();
}

/**
 * Opens the Project Wizard modal in 'create' (blank project) or 'edit' (active project defaults) mode
 */
function openProjectWizardModal(mode = "create") {
  currentWizardMode = mode;
  currentWizardStep = 1;

  const modal = document.getElementById("newProjectModal");
  if (!modal) return;

  // Load existing defaults if in edit mode, or fresh defaults for create
  if (mode === "edit" && typeof StorageService !== "undefined") {
    const existing = StorageService.getProjectDefaults();
    wizardDraftState = Object.assign(JSON.parse(JSON.stringify(DEFAULT_PROJECT_STANDARDS)), JSON.parse(JSON.stringify(existing || {})));
    wizardDraftState.metadata = Object.assign({}, DEFAULT_PROJECT_STANDARDS.metadata, existing?.metadata || {}, {
      projectName: StorageService.getActiveProjectName()
    });
    wizardDraftState.accessControl = Object.assign({}, DEFAULT_PROJECT_STANDARDS.accessControl, existing?.accessControl || {});
    wizardDraftState.vms = Object.assign({}, DEFAULT_PROJECT_STANDARDS.vms, existing?.vms || {});
    wizardDraftState.network = Object.assign({}, DEFAULT_PROJECT_STANDARDS.network, existing?.network || {});
  } else {
    wizardDraftState = JSON.parse(JSON.stringify(DEFAULT_PROJECT_STANDARDS));
    wizardDraftState.metadata.projectName = "New Security Design";
  }

  // Update Header UI elements
  const titleEl = document.getElementById("wizardModalTitle");
  const subTitleEl = document.getElementById("wizardModalSubtitle");
  const submitBtn = document.getElementById("wizardSubmitBtn");
  const accordion = document.getElementById("wizDeviceCablingAccordion");
  if (accordion) accordion.open = false;

  if (titleEl) {
    titleEl.textContent = mode === "create" ? "Create New Project — Scope & Technical Defaults" : "Project Scope & Technical Defaults";
  }
  if (subTitleEl) {
    subTitleEl.textContent = mode === "create"
      ? "Step through Orion scope of work, VMS/ACS platforms, switching, DOR, 1st/3rd-party optics, and cabling defaults."
      : "Review or update project-wide scope of work, security platforms, optics sourcing, and cabling standards.";
  }
  if (submitBtn) {
    submitBtn.innerHTML = mode === "create"
      ? '<i data-lucide="rocket" class="w-4 h-4"></i><span>Create Project</span>'
      : '<i data-lucide="save" class="w-4 h-4"></i><span>Save Project Defaults</span>';
  }

  populateWizardUIFromState(wizardDraftState);
  setProjectWizardStep(1, true);

  modal.classList.remove("hidden");

  // Focus Project Name Input
  setTimeout(() => {
    const nameInput = document.getElementById("wizProjectName");
    if (nameInput) {
      nameInput.focus();
      nameInput.select();
    }
    if (typeof lucide !== "undefined" && typeof lucide.createIcons === "function") {
      lucide.createIcons({ root: modal });
    }
  }, 50);
}

/**
 * Closes the Project Wizard modal
 */
function closeProjectWizardModal() {
  const modal = document.getElementById("newProjectModal");
  if (!modal) return;
  modal.classList.add("hidden");
}

/**
 * Transitions between wizard steps (1, 2, 3, or 4)
 */
function setProjectWizardStep(step, skipSync = false) {
  // Validate step 1 before proceeding forward
  if (step > 1 && currentWizardStep === 1) {
    const nameInput = document.getElementById("wizProjectName");
    const nameVal = nameInput ? nameInput.value.trim() : "";
    if (!nameVal) {
      if (nameInput) {
        nameInput.classList.add("border-rose-500", "ring-1", "ring-rose-500");
        nameInput.focus();
      }
      if (typeof showToast === "function") showToast("Please enter a project name.", "warning");
      return;
    } else if (nameInput) {
      nameInput.classList.remove("border-rose-500", "ring-1", "ring-rose-500");
    }
  }

  // Synchronize state before moving steps
  if (!skipSync) {
    updateWizardStateFromUI();
  }

  currentWizardStep = Math.max(1, Math.min(WIZARD_TOTAL_STEPS, step));

  // Update step indicators
  for (let i = 1; i <= WIZARD_TOTAL_STEPS; i++) {
    const pill = document.getElementById(`wizStepPill-${i}`);
    const checkIcon = document.getElementById(`wizStepCheck-${i}`);
    const numBadge = document.getElementById(`wizStepNum-${i}`);
    if (pill) {
      if (i === currentWizardStep) {
        pill.className = "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-brand-600 text-white shadow-md shadow-brand-500/20 border border-brand-400/40 transition-all shrink-0";
        if (checkIcon) checkIcon.classList.add("hidden");
        if (numBadge) numBadge.classList.remove("hidden");
      } else if (i < currentWizardStep) {
        pill.className = "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 transition-all cursor-pointer shrink-0";
        if (checkIcon) checkIcon.classList.remove("hidden");
        if (numBadge) numBadge.classList.add("hidden");
      } else {
        pill.className = "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 text-slate-400 border border-slate-800 transition-all cursor-pointer shrink-0";
        if (checkIcon) checkIcon.classList.add("hidden");
        if (numBadge) numBadge.classList.remove("hidden");
      }
    }

    const panel = document.getElementById(`wizStepContent-${i}`);
    if (panel) {
      panel.classList.toggle("hidden", i !== currentWizardStep);
      if (i === currentWizardStep && panel.parentElement) {
        panel.parentElement.scrollTop = 0;
      }
    }
  }

  // Update navigation buttons
  const stepCounter = document.getElementById("wizardStepCounter");
  const quickBtn = document.getElementById("wizardQuickCreateBtn");
  const backBtn = document.getElementById("wizardBackBtn");
  const nextBtn = document.getElementById("wizardNextBtn");
  const submitBtn = document.getElementById("wizardSubmitBtn");

  if (stepCounter) {
    stepCounter.textContent = `Step ${currentWizardStep} of ${WIZARD_TOTAL_STEPS}`;
  }
  if (quickBtn) {
    // Only show subtle "Skip & Use Standard Defaults" link during 'create' mode before the final step
    quickBtn.classList.toggle("hidden", currentWizardMode !== "create" || currentWizardStep === WIZARD_TOTAL_STEPS);
  }
  if (backBtn) {
    backBtn.classList.toggle("hidden", currentWizardStep === 1);
  }
  if (nextBtn) {
    nextBtn.classList.toggle("hidden", currentWizardStep === WIZARD_TOTAL_STEPS);
    if (currentWizardStep === 1) {
      nextBtn.innerHTML = '<span>Next: Video, VMS &amp; ACS</span><i data-lucide="arrow-right" class="w-4 h-4"></i>';
    } else if (currentWizardStep === 2) {
      nextBtn.innerHTML = '<span>Next: Switching &amp; VLANs</span><i data-lucide="arrow-right" class="w-4 h-4"></i>';
    } else if (currentWizardStep === 3) {
      nextBtn.innerHTML = '<span>Next: Cabling Standards</span><i data-lucide="arrow-right" class="w-4 h-4"></i>';
    }
  }
  if (submitBtn) {
    // In 'create' mode, guide through all 4 steps before showing 'Create Project'.
    // In 'edit' mode, allow 1-click 'Save Project Defaults' from any tab!
    const showSubmit = currentWizardMode === "edit" || currentWizardStep === WIZARD_TOTAL_STEPS;
    submitBtn.classList.toggle("hidden", !showSubmit);
  }

  const modal = document.getElementById("newProjectModal");
  if (modal && typeof lucide !== "undefined" && typeof lucide.createIcons === "function") {
    lucide.createIcons({ root: modal });
  }
}

/**
 * Populates form inputs and toggle pills from a given defaults state
 */
function populateWizardUIFromState(state) {
  if (!state) return;

  // Step 1: Project Details, Camera Workflow Mode & Licensing Term
  const nameEl = document.getElementById("wizProjectName");
  if (nameEl) nameEl.value = state.metadata?.projectName || "";

  const jobEl = document.getElementById("wizJobOpp");
  if (jobEl) jobEl.value = state.metadata?.jobOpportunityNumber || "";

  const clientEl = document.getElementById("wizClientName");
  if (clientEl) clientEl.value = state.metadata?.clientName || "";

  const addrEl = document.getElementById("wizSiteAddress");
  if (addrEl) addrEl.value = state.metadata?.siteAddress || "";

  const designerEl = document.getElementById("wizLeadDesigner");
  if (designerEl) designerEl.value = state.metadata?.leadDesigner || "";

  selectWizardCameraDesignMode(state.vms?.cameraDesignMode || "generic");

  const termEl = document.getElementById("wizLicensingTerm");
  if (termEl) termEl.value = state.licensing?.globalSelectedTerm || "1YR";

  // Step 2: Video Surveillance & VMS
  const vmsToggle = document.getElementById("wizVmsToggle");
  if (vmsToggle) {
    vmsToggle.checked = state.vms?.enabled !== false;
    toggleVmsScope(vmsToggle.checked);
  }
  const vmsHeadEnd = document.getElementById("wizVmsHeadEndInScope");
  const isHeadEndInScope = state.vms?.headEndInScope !== false;
  if (vmsHeadEnd) vmsHeadEnd.checked = isHeadEndInScope;
  toggleWizardVmsHeadEndUI(isHeadEndInScope);

  const vmsPlatformVal = state.vms?.platform || "Milestone XProtect";
  const vmsPlatform = document.getElementById("wizVmsPlatform");
  if (vmsPlatform) vmsPlatform.value = vmsPlatformVal;
  updateWizardVmsTierOptions(vmsPlatformVal, state.vms?.editionTier || "auto");

  const vmsRetention = document.getElementById("wizVmsRetention");
  if (vmsRetention) vmsRetention.value = String(state.vms?.retentionDays || 30);

  const vmsFailover = document.getElementById("wizVmsFailover");
  if (vmsFailover) vmsFailover.value = state.vms?.failoverMode || "none";

  const vmsAnalytics = document.getElementById("wizVmsPromptAnalytics");
  if (vmsAnalytics) vmsAnalytics.checked = state.vms?.promptAnalytics !== false;

  // Camera Vendors Multi-Select
  const vendors = Array.isArray(state.vms?.cameraVendors) ? state.vms.cameraVendors.map(canonicalWizardCameraVendorName) : [];
  ["Axis Communications", "Hanwha Vision", "Avigilon", "Bosch"].forEach(v => {
    const el = document.getElementById(`wizCamVendor-${v.replace(/\s+/g, '')}`);
    if (el) el.checked = vendors.includes(v);
  });

  // Step 2: Access Control
  const acsToggle = document.getElementById("wizAcsToggle");
  if (acsToggle) {
    acsToggle.checked = state.accessControl?.enabled !== false;
    toggleAcsScope(acsToggle.checked);
  }
  const acsEngine = document.getElementById("wizAcsEngine");
  if (acsEngine) acsEngine.value = state.accessControl?.engine || "Genetec";

  const acsCtrl = document.getElementById("wizAcsControllerVendor");
  if (acsCtrl) acsCtrl.value = state.accessControl?.controllerVendor || "mercury";

  const acsReader = document.getElementById("wizAcsReaderProto");
  if (acsReader) acsReader.value = state.accessControl?.readerProtocol || "osdp";

  // Step 3: Active Network Switching, PoE Buffer, Cabling DOR, Fiber & SFP/DAC Sourcing
  const net = state.network || DEFAULT_PROJECT_STANDARDS.network;
  const netSwToggle = document.getElementById("wizNetworkSwitchesToggle");
  if (netSwToggle) {
    netSwToggle.checked = net.switchesInScope !== false;
    toggleNetSwitchesScope(netSwToggle.checked);
  }
  const poeHrEl = document.getElementById("wizPoeHeadroom");
  if (poeHrEl) poeHrEl.value = String(net.poeHeadroomPercent || 20);

  const prefSwVendors = Array.isArray(net.preferredSwitchVendors) ? net.preferredSwitchVendors : [];
  WIZARD_SWITCH_VENDORS.forEach(sv => {
    const swEl = document.getElementById(`wizSwVendor-${sv.replace(/\s+/g, '')}`);
    if (swEl) swEl.checked = prefSwVendors.includes(sv);
  });

  // Step 3 & Step 4: Cabling & Infrastructure Standards
  const cabling = state.cabling || {};
  const stds = cabling.standards || {};
  const byDev = stds.byDeviceType || {};

  const defRunColor = stds.defaultRunColor || "Yellow";
  const defPatchColor = stds.defaultPatchColor || "Yellow";
  const defRunCat = stds.defaultRunCategory || (cabling.horizontalCategories?.[0] || "C6A-CMP-1K-YL");
  const defPatchLen = stds.defaultPatchLength ?? (cabling.patchCordLength ?? 0.5);

  const defRunEl = document.getElementById("wizDefaultRunColor");
  if (defRunEl) defRunEl.value = defRunColor;
  updateCableColorPreviewDot("wizDefaultRunDot", defRunColor);

  const defPatchEl = document.getElementById("wizDefaultPatchColor");
  if (defPatchEl) defPatchEl.value = defPatchColor;
  updateCableColorPreviewDot("wizDefaultPatchDot", defPatchColor);

  const defCatEl = document.getElementById("wizDefaultRunCategory");
  if (defCatEl) defCatEl.value = defRunCat;

  const compEl = document.getElementById("wizCompositeCable");
  if (compEl) compEl.value = cabling.compositeType || "AC-COMP-CMP-500";

  const termMethodEl = document.getElementById("wizRackTermination");
  if (termMethodEl) termMethodEl.value = cabling.rackTermination || "patch_panels";

  const patchLenEl = document.getElementById("wizPatchLength");
  if (patchLenEl) patchLenEl.value = String(defPatchLen);

  const fiberEl = document.getElementById("wizFiberType");
  if (fiberEl) fiberEl.value = cabling.fiberType || "mmf";

  const opticsVendorEl = document.getElementById("wizOpticsVendorMode");
  if (opticsVendorEl) opticsVendorEl.value = cabling.opticsVendorMode || "oem";

  const scope = cabling.scope || DEFAULT_PROJECT_STANDARDS.cabling.scope;
  const scopePresetEl = document.getElementById("wizInfraScopePreset");
  if (scopePresetEl) scopePresetEl.value = scope.preset || "full_turnkey";
  const scopeHorizEl = document.getElementById("wizScopeHorizontal");
  if (scopeHorizEl) scopeHorizEl.checked = scope.horizontalCabling !== false;
  const scopePanelsEl = document.getElementById("wizScopePanels");
  if (scopePanelsEl) scopePanelsEl.checked = scope.rackPatchPanels !== false;
  const scopeCordsEl = document.getElementById("wizScopePatchCords");
  if (scopeCordsEl) scopeCordsEl.checked = scope.patchCords !== false;
  const scopeFiberEl = document.getElementById("wizScopeFiberBackbone");
  if (scopeFiberEl) scopeFiberEl.checked = scope.fiberBackbone !== false;
  const scopeSfpEl = document.getElementById("wizScopeSfpDac");
  if (scopeSfpEl) scopeSfpEl.checked = scope.sfpAndDac !== false;
  updateWizardInfraScopeBadge();

  // Network VLAN Architecture (Default: "none" / No VLANs)
  const vlanMode = net.vlanMode || "none";
  const vlanModeEl = document.getElementById("wizVlanMode");
  if (vlanModeEl) vlanModeEl.value = vlanMode;
  toggleWizardVlanConfigUI(vlanMode);

  const vlanCamEl = document.getElementById("wizVlanCamera");
  if (vlanCamEl) vlanCamEl.value = String(net.cameraVlan || 20);
  const vlanAcsEl = document.getElementById("wizVlanAccess");
  if (vlanAcsEl) vlanAcsEl.value = String(net.accessVlan || 30);
  const vlanVoiceEl = document.getElementById("wizVlanVoice");
  if (vlanVoiceEl) vlanVoiceEl.value = String(net.voiceVlan || 40);
  const vlanMgmtEl = document.getElementById("wizVlanMgmt");
  if (vlanMgmtEl) vlanMgmtEl.value = String(net.mgmtVlan || 99);

  // Per-Device Type Controls
  CABLE_DEVICE_TYPES.forEach(dt => {
    const devConf = byDev[dt.id] || {};
    const runCol = devConf.runColor || defRunColor;
    const patchCol = devConf.patchColor || defPatchColor;
    const runCat = devConf.runCategory || defRunCat;
    const patchLen = devConf.patchLength ?? defPatchLen;
    const patchType = devConf.patchType || "slim";

    const rColEl = document.getElementById(`wizCableRunColor-${dt.id}`);
    if (rColEl) rColEl.value = runCol;
    updateCableColorPreviewDot(`wizCableRunDot-${dt.id}`, runCol);

    const rCatEl = document.getElementById(`wizCableRunCategory-${dt.id}`);
    if (rCatEl) rCatEl.value = runCat;

    const pColEl = document.getElementById(`wizCablePatchColor-${dt.id}`);
    if (pColEl) pColEl.value = patchCol;
    updateCableColorPreviewDot(`wizCablePatchDot-${dt.id}`, patchCol);

    const pLenEl = document.getElementById(`wizCablePatchLength-${dt.id}`);
    if (pLenEl) pLenEl.value = String(patchLen);

    const pTypeEl = document.getElementById(`wizCablePatchType-${dt.id}`);
    if (pTypeEl) pTypeEl.value = patchType;
  });
}

/**
 * Extracts inputs from wizard UI and saves into wizardDraftState
 */
function updateWizardStateFromUI() {
  const nameEl = document.getElementById("wizProjectName");
  const jobEl = document.getElementById("wizJobOpp");
  const clientEl = document.getElementById("wizClientName");
  const addrEl = document.getElementById("wizSiteAddress");
  const designerEl = document.getElementById("wizLeadDesigner");
  const termEl = document.getElementById("wizLicensingTerm");

  wizardDraftState.metadata = {
    projectName: (nameEl ? nameEl.value.trim() : "") || "New Project",
    jobOpportunityNumber: jobEl ? jobEl.value.trim() : "",
    clientName: clientEl ? clientEl.value.trim() : "",
    siteAddress: addrEl ? addrEl.value.trim() : "",
    leadDesigner: designerEl ? designerEl.value.trim() : ""
  };

  wizardDraftState.licensing = {
    globalSelectedTerm: termEl ? termEl.value : "1YR"
  };

  const acsToggle = document.getElementById("wizAcsToggle");
  const acsEngine = document.getElementById("wizAcsEngine");
  const acsCtrl = document.getElementById("wizAcsControllerVendor");
  const acsReader = document.getElementById("wizAcsReaderProto");

  wizardDraftState.accessControl = {
    enabled: acsToggle ? acsToggle.checked : true,
    engine: acsEngine ? acsEngine.value : "Genetec",
    controllerVendor: acsCtrl ? acsCtrl.value : "mercury",
    readerProtocol: acsReader ? acsReader.value : "osdp"
  };

  const vmsToggle = document.getElementById("wizVmsToggle");
  const camModeEl = document.getElementById("wizCameraDesignMode");
  const vmsPlatform = document.getElementById("wizVmsPlatform");
  const vmsTier = document.getElementById("wizVmsEditionTier");
  const vmsRetention = document.getElementById("wizVmsRetention");
  const vmsFailover = document.getElementById("wizVmsFailover");
  const vmsAnalytics = document.getElementById("wizVmsPromptAnalytics");

  const checkedCamVendors = [];
  ["Axis Communications", "Hanwha Vision", "Avigilon", "Bosch"].forEach(v => {
    const el = document.getElementById(`wizCamVendor-${v.replace(/\s+/g, '')}`);
    if (el && el.checked) checkedCamVendors.push(v);
  });

  wizardDraftState.vms = {
    enabled: vmsToggle ? vmsToggle.checked : true,
    cameraDesignMode: camModeEl?.value === "specific" ? "specific" : "generic",
    platform: vmsPlatform ? vmsPlatform.value : "Milestone XProtect",
    editionTier: vmsTier ? vmsTier.value : "auto",
    failoverMode: vmsFailover ? vmsFailover.value : "none",
    cameraVendors: checkedCamVendors.length > 0 ? checkedCamVendors : ["Axis Communications", "Hanwha Vision"],
    retentionDays: vmsRetention ? (parseInt(vmsRetention.value, 10) || 30) : 30,
    promptAnalytics: vmsAnalytics ? vmsAnalytics.checked : true,
    headEndInScope: document.getElementById("wizVmsHeadEndInScope") ? document.getElementById("wizVmsHeadEndInScope").checked : true
  };

  // Cabling & Standards
  const defRunCol = document.getElementById("wizDefaultRunColor")?.value || "Yellow";
  const defPatchCol = document.getElementById("wizDefaultPatchColor")?.value || "Yellow";
  const defRunCat = document.getElementById("wizDefaultRunCategory")?.value || "C6A-CMP-1K-YL";
  const compEl = document.getElementById("wizCompositeCable");
  const termMethodEl = document.getElementById("wizRackTermination");
  const patchLenEl = document.getElementById("wizPatchLength");
  const fiberEl = document.getElementById("wizFiberType");

  const byDeviceType = {};
  CABLE_DEVICE_TYPES.forEach(dt => {
    const rCol = document.getElementById(`wizCableRunColor-${dt.id}`)?.value || defRunCol;
    const rCat = document.getElementById(`wizCableRunCategory-${dt.id}`)?.value || defRunCat;
    const pCol = document.getElementById(`wizCablePatchColor-${dt.id}`)?.value || defPatchCol;
    const pLen = parseFloat(document.getElementById(`wizCablePatchLength-${dt.id}`)?.value) || 0.5;
    const pType = document.getElementById(`wizCablePatchType-${dt.id}`)?.value || "slim";

    byDeviceType[dt.id] = {
      label: dt.label,
      runColor: rCol,
      runCategory: rCat,
      patchColor: pCol,
      patchLength: pLen,
      patchType: pType
    };
  });

  wizardDraftState.cabling = {
    horizontalCategories: [defRunCat],
    compositeType: compEl ? compEl.value : "AC-COMP-CMP-500",
    rackTermination: termMethodEl ? termMethodEl.value : "patch_panels",
    patchCordLength: patchLenEl ? parseFloat(patchLenEl.value) : 0.5,
    fiberType: fiberEl ? fiberEl.value : "mmf",
    opticsVendorMode: document.getElementById("wizOpticsVendorMode")?.value || "oem",
    scope: {
      preset: document.getElementById("wizInfraScopePreset")?.value || "full_turnkey",
      horizontalCabling: document.getElementById("wizScopeHorizontal") ? document.getElementById("wizScopeHorizontal").checked : true,
      rackPatchPanels: document.getElementById("wizScopePanels") ? document.getElementById("wizScopePanels").checked : true,
      patchCords: document.getElementById("wizScopePatchCords") ? document.getElementById("wizScopePatchCords").checked : true,
      fiberBackbone: document.getElementById("wizScopeFiberBackbone") ? document.getElementById("wizScopeFiberBackbone").checked : true,
      sfpAndDac: document.getElementById("wizScopeSfpDac") ? document.getElementById("wizScopeSfpDac").checked : true
    },
    standards: {
      defaultRunColor: defRunCol,
      defaultRunCategory: defRunCat,
      defaultPatchColor: defPatchCol,
      defaultPatchLength: patchLenEl ? parseFloat(patchLenEl.value) : 0.5,
      defaultPatchType: "slim",
      byDeviceType
    }
  };

  // Active Network Switching, PoE Buffer, Preferred Switch Brands & VLAN Architecture
  const checkedSwVendors = [];
  WIZARD_SWITCH_VENDORS.forEach(sv => {
    const swEl = document.getElementById(`wizSwVendor-${sv.replace(/\s+/g, '')}`);
    if (swEl && swEl.checked) checkedSwVendors.push(sv);
  });

  const vlanModeVal = document.getElementById("wizVlanMode")?.value || "none";
  wizardDraftState.network = {
    switchesInScope: document.getElementById("wizNetworkSwitchesToggle") ? document.getElementById("wizNetworkSwitchesToggle").checked : true,
    poeHeadroomPercent: parseInt(document.getElementById("wizPoeHeadroom")?.value, 10) || 20,
    preferredSwitchVendors: checkedSwVendors,
    vlanMode: vlanModeVal,
    cameraVlan: parseInt(document.getElementById("wizVlanCamera")?.value, 10) || 20,
    accessVlan: parseInt(document.getElementById("wizVlanAccess")?.value, 10) || 30,
    voiceVlan: parseInt(document.getElementById("wizVlanVoice")?.value, 10) || 40,
    wirelessVlan: 50,
    dataVlan: 10,
    mgmtVlan: parseInt(document.getElementById("wizVlanMgmt")?.value, 10) || 99,
    nativeVlan: 1
  };
}

/**
 * Toggles the ACS sub-panel visibility and inputs
 */
function toggleAcsScope(enabled) {
  const container = document.getElementById("wizAcsConfigContainer");
  const badge = document.getElementById("wizAcsScopeBadge");
  const step2Badge = document.getElementById("wizAcsStep2Badge");
  if (container) {
    container.classList.toggle("opacity-40", !enabled);
    container.classList.toggle("pointer-events-none", !enabled);
  }
  if (badge) {
    badge.textContent = enabled ? "IN SCOPE" : "EXCLUDED";
    badge.className = enabled 
      ? "text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
      : "text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700";
  }
  if (step2Badge) {
    step2Badge.textContent = enabled ? "IN SCOPE" : "EXCLUDED / OUT OF SCOPE";
    step2Badge.className = enabled
      ? "text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
      : "text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700";
  }
}

/**
 * Toggles the Active Network Switching sub-panel visibility and badge
 */
function toggleNetSwitchesScope(enabled) {
  const container = document.getElementById("wizNetConfigContainer");
  const badge = document.getElementById("wizNetScopeBadge");
  const step3Badge = document.getElementById("wizNetStep3Badge");
  if (container) {
    container.classList.toggle("opacity-40", !enabled);
    container.classList.toggle("pointer-events-none", !enabled);
  }
  if (badge) {
    badge.textContent = enabled ? "IN SCOPE" : "CUSTOMER IT";
    badge.className = enabled
      ? "text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
      : "text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700";
  }
  if (step3Badge) {
    step3Badge.textContent = enabled ? "ORION SWITCHES IN SCOPE" : "CUSTOMER IT / OFE";
    step3Badge.className = enabled
      ? "text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
      : "text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700";
  }
}

function toggleVmsScope(enabled) {
  const container = document.getElementById("wizVmsConfigContainer");
  const badge = document.getElementById("wizVmsScopeBadge");
  const heCard = document.getElementById("wizVmsHeadEndCard");
  if (container) {
    container.classList.toggle("opacity-40", !enabled);
    container.classList.toggle("pointer-events-none", !enabled);
  }
  if (heCard) {
    heCard.classList.toggle("opacity-40", !enabled);
    heCard.classList.toggle("pointer-events-none", !enabled);
  }
  if (badge) {
    badge.textContent = enabled ? "IN SCOPE" : "EXCLUDED";
    badge.className = enabled 
      ? "text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
      : "text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700";
  }
  refreshWizardVmsStep2Badge();
}

/**
 * Quick create project directly from Step 1 with defaults
 */
function quickCreateProjectWithDefaults() {
  const nameInput = document.getElementById("wizProjectName");
  const nameVal = nameInput ? nameInput.value.trim() : "";
  if (!nameVal) {
    if (nameInput) {
      nameInput.classList.add("border-rose-500", "ring-1", "ring-rose-500");
      nameInput.focus();
    }
    if (typeof showToast === "function") showToast("Please enter a project name.", "warning");
    return;
  }

  updateWizardStateFromUI();
  executeWizardSubmission();
}

/**
 * Submits the completed wizard form
 */
function submitProjectWizard() {
  updateWizardStateFromUI();
  executeWizardSubmission();
}

/**
 * Internal executor that delegates to StorageService
 */
function executeWizardSubmission() {
  const defaults = JSON.parse(JSON.stringify(wizardDraftState));
  const safeName = (defaults.metadata?.projectName || "New Project").replace(/[<>"'/]/g, '').slice(0, 80);

  if (currentWizardMode === "create") {
    if (typeof StorageService !== "undefined") {
      StorageService.createNewBlankProject(defaults);
    }
    closeProjectWizardModal();
    // Close parent project manager modal if open
    const projModal = document.getElementById("projectModal");
    if (projModal && !projModal.classList.contains("hidden")) {
      projModal.classList.add("hidden");
    }
  } else {
    // Edit mode: Update active project defaults
    if (typeof StorageService !== "undefined") {
      StorageService.setProjectDefaults(defaults, null, { skipEngineSync: true });
      StorageService.saveCurrentProject(false);
    }
    closeProjectWizardModal();
    renderProjectDefaultsSummary();
    if (typeof showToast === "function") {
      showToast(`Updated technical standards for: ${safeName}`);
    }
  }

  // Apply Focus Mode and refresh UI
  syncRuntimeEnginesFromProjectDefaults(defaults);
  applyProjectFocusMode();
  syncAllOpticsAndScopeUI();
  reconcileBOMForInfrastructureScope(true);
  if (typeof renderProjectDefaultsSummary === "function") {
    renderProjectDefaultsSummary();
  }

  // Live propagate cable standards changes to Physical Layout, Topology, and Port Matrix
  if (typeof renderCableCanvas === "function") {
    renderCableCanvas();
  }
  if (typeof syncRackInterconnectsAndCabling === "function") {
    syncRackInterconnectsAndCabling();
  }
  if (typeof renderPortMatrixStudioContent === "function" && typeof activePortMatrixSwitchId !== "undefined" && activePortMatrixSwitchId) {
    renderPortMatrixStudioContent(activePortMatrixSwitchId);
  }
  if (typeof renderTopologyLinks === "function") {
    renderTopologyLinks();
  }
}

/**
 * Dynamic Focus Mode: De-prioritizes or filters catalog modes based on project scope
 */
function applyProjectFocusMode() {
  const defaults = (typeof StorageService !== "undefined" && typeof StorageService.getProjectDefaults === "function")
    ? StorageService.getProjectDefaults()
    : wizardDraftState;

  if (!defaults) return;

  const acsEnabled = defaults.accessControl?.enabled !== false;
  const vmsEnabled = defaults.vms?.enabled !== false;
  const vmsHeadEndInScope = defaults.vms?.headEndInScope !== false;
  const netSwitchesInScope = defaults.network?.switchesInScope !== false;
  const netDomainBtn = document.getElementById("domain-tab-networking");
  if (netDomainBtn) {
    netDomainBtn.classList.toggle("opacity-40", !netSwitchesInScope);
    netDomainBtn.title = netSwitchesInScope ? "Networking & Switching" : "Networking (Customer-Furnished / Out of Scope in Project Defaults)";
  }
  const srvNavBtn = document.getElementById("nav-servers");
  if (srvNavBtn) srvNavBtn.classList.toggle("opacity-30", !vmsEnabled || !vmsHeadEndInScope);
  const licNavBtn = document.getElementById("nav-vms_software");
  if (licNavBtn) licNavBtn.classList.toggle("opacity-30", !vmsEnabled || !vmsHeadEndInScope);

  // Domain Nav Styling
  const physDomainBtn = document.getElementById("domain-tab-physical_security");
  if (physDomainBtn) {
    if (!acsEnabled && !vmsEnabled) {
      physDomainBtn.classList.add("opacity-40");
      physDomainBtn.title = "Physical Security (Both ACS and VMS marked Out of Scope)";
    } else {
      physDomainBtn.classList.remove("opacity-40");
      physDomainBtn.title = "Physical Security";
    }
  }

  // SubMode Navigation Visibility
  if (typeof DOMAIN_DEFINITIONS !== "undefined" && DOMAIN_DEFINITIONS.physical_security) {
    const modes = DOMAIN_DEFINITIONS.physical_security.modes;
    modes.forEach(m => {
      const btn = document.getElementById(`nav-${m.id}`);
      if (btn) {
        if (m.id === "cameras" && !vmsEnabled) {
          btn.classList.add("opacity-30");
          btn.title = "Video Surveillance Cameras (Marked Out of Scope in Project Defaults)";
        } else if ((m.id === "access_control" || m.id === "power_enclosures") && !acsEnabled) {
          btn.classList.add("opacity-30");
          btn.title = "Access Control (Marked Out of Scope in Project Defaults)";
        } else {
          btn.classList.remove("opacity-30");
        }
      }
    });
  }

  // Active Cable SKU in Physical Layout Canvas
  if (defaults.cabling?.horizontalCategories && defaults.cabling.horizontalCategories.length > 0) {
    const primarySku = defaults.cabling.horizontalCategories[0];
    if (typeof activeCableSku !== "undefined" && activeCableSku !== primarySku) {
      activeCableSku = primarySku;
      const cSelect = document.getElementById("cableSkuSelect");
      if (cSelect) cSelect.value = primarySku;
    }
  }
}

/**
 * Renders the compact Scope & Defaults Summary Widget in #projectModal
 */
function renderProjectDefaultsSummary() {
  const container = document.getElementById("projectDefaultsSummaryWidget");
  if (!container) return;

  const defaults = (typeof StorageService !== "undefined" && typeof StorageService.getProjectDefaults === "function")
    ? StorageService.getProjectDefaults()
    : DEFAULT_PROJECT_STANDARDS;

  const meta = defaults.metadata || {};
  const acs = defaults.accessControl || {};
  const vms = defaults.vms || {};
  const cabling = defaults.cabling || {};
  const lic = defaults.licensing || {};
  const net = defaults.network || DEFAULT_PROJECT_STANDARDS.network;

  const ctrlLabelMap = {
    mercury: "Mercury LP",
    mercury_mp: "Mercury MP",
    axis_pbg: "Axis PbG",
    axis: "Axis IP",
    scl312: "SCL-312"
  };
  const ctrlShort = ctrlLabelMap[acs.controllerVendor || "mercury"] || "Mercury LP";
  const acsBadge = acs.enabled !== false
    ? `<span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">ACS: ${escapeHTML(acs.engine || "Genetec")} • ${escapeHTML(ctrlShort)} (${escapeHTML(acs.readerProtocol?.toUpperCase() || "OSDP")})</span>`
    : `<span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-800 text-slate-500 border border-slate-700">ACS: None</span>`;

  const poeHr = net.poeHeadroomPercent || 20;
  const swVendorSuffix = (Array.isArray(net.preferredSwitchVendors) && net.preferredSwitchVendors.length > 0)
    ? ` • ${net.preferredSwitchVendors.join("/")}`
    : "";
  const netScopeBadge = net.switchesInScope === false
    ? `<span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">Switches: Customer/OFE</span>`
    : `<span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">Switches: Orion (+${poeHr}% PoE${escapeHTML(swVendorSuffix)})</span>`;

  const camModeBadge = vms.enabled !== false
    ? `<span class="px-2 py-0.5 rounded-md text-[10px] font-semibold ${vms.cameraDesignMode === 'specific' ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30' : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'}">Cams: ${vms.cameraDesignMode === 'specific' ? 'Exact SKUs' : 'Initial Generic'}</span>`
    : '';

  const tierLabel = vms.editionTier && vms.editionTier !== "auto" ? ` [${vms.editionTier.replace(/_/g, ' ').toUpperCase()}]` : "";
  const failoverSuffix = vms.failoverMode && vms.failoverMode !== "none" ? ` • ${vms.failoverMode === 'dedicated' ? 'N+1 Failover' : 'Ring Failover'}` : "";
  const vmsHeadEndSuffix = vms.headEndInScope === false ? " • Cams Only (OFE VMS)" : `${tierLabel} (${vms.retentionDays || 30}D${failoverSuffix})`;
  const vmsBadge = vms.enabled !== false
    ? `<span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/30">VMS: ${escapeHTML(vms.platform || "Milestone")}${escapeHTML(vmsHeadEndSuffix)}</span>`
    : `<span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-800 text-slate-500 border border-slate-700">VMS: None</span>`;

  const stds = cabling.standards || {};
  const defRunCol = stds.defaultRunColor || "Yellow";
  const defPatchCol = stds.defaultPatchColor || "Yellow";
  const defPal = CABLE_COLOR_PALETTE[defRunCol] || CABLE_COLOR_PALETTE.Yellow;
  const patchPal = CABLE_COLOR_PALETTE[defPatchCol] || CABLE_COLOR_PALETTE.Yellow;

  const cableBadge = `<span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-900 text-slate-300 border border-slate-750 flex items-center gap-1.5"><span class="w-2 h-2 rounded-full" style="background-color: ${defPal.hex};"></span><span>Run: ${escapeHTML(defRunCol)}</span><span class="text-slate-500">|</span><span class="w-2 h-2 rounded-full" style="background-color: ${patchPal.hex};"></span><span>Patch: ${escapeHTML(defPatchCol)}</span></span>`;

  const scopeObj = cabling.scope || DEFAULT_PROJECT_STANDARDS.cabling.scope;
  const scopePresetCfg = INFRA_SCOPE_PRESETS[scopeObj.preset];
  const scopeShort = scopePresetCfg ? scopePresetCfg.shortLabel : "Custom DOR";
  const scopeBadge = `<span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30">Infra Scope: ${escapeHTML(scopeShort)}</span>`;

  const opticsMode = (cabling.opticsVendorMode || "oem").toLowerCase();
  const opticsLabel = opticsMode === "ironlink" ? "3rd-Party (IronLink)" : (opticsMode === "fs" ? "3rd-Party (FS.com)" : "1st-Party OEM");
  const opticsBadge = `<span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">Optics/DAC: ${escapeHTML(opticsLabel)}</span>`;

  const fiberBadge = scopeObj.fiberBackbone === false
    ? `<span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">Fiber Trunks: Excluded (Existing/OFE)</span>`
    : `<span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">Fiber: ${cabling.fiberType === 'smf' ? 'OS2 Single-Mode' : 'OM4 Multi-Mode'}</span>`;

  const vlanBadge = net.vlanMode === "segmented"
    ? `<span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">VLANs: Segmented (${net.cameraVlan || 20}/${net.accessVlan || 30}/${net.voiceVlan || 40})</span>`
    : `<span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">VLANs: None (Flat / Untagged)</span>`;

  container.innerHTML = `
    <div class="flex items-center justify-between pb-1.5 border-b border-slate-800/80">
      <div class="flex items-center gap-1.5">
        <i data-lucide="sliders" class="w-3.5 h-3.5 text-indigo-400"></i>
        <span class="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Project Scope & Standards</span>
      </div>
      <button onclick="openProjectWizardModal('edit')" class="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 hover:underline cursor-pointer">
        <i data-lucide="edit-2" class="w-3 h-3"></i>
        <span>Configure Defaults</span>
      </button>
    </div>
    
    <div class="flex flex-wrap items-center gap-1.5 pt-0.5">
      ${camModeBadge}
      ${vmsBadge}
      ${acsBadge}
      ${netScopeBadge}
      ${cableBadge}
      ${scopeBadge}
      ${opticsBadge}
      ${fiberBadge}
      ${vlanBadge}
      <span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/30">Term: ${escapeHTML(lic.globalSelectedTerm || "1YR")}</span>
    </div>

    ${meta.jobOpportunityNumber || meta.clientName || meta.leadDesigner ? `
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-1 pt-1.5 text-[10px] font-mono text-slate-400 border-t border-slate-850">
        ${meta.jobOpportunityNumber ? `<div>Job #: <span class="text-white font-semibold">${escapeHTML(meta.jobOpportunityNumber)}</span></div>` : ''}
        ${meta.clientName ? `<div>Client: <span class="text-white font-semibold">${escapeHTML(meta.clientName)}</span></div>` : ''}
        ${meta.leadDesigner ? `<div>Designer: <span class="text-white font-semibold">${escapeHTML(meta.leadDesigner)}</span></div>` : ''}
      </div>
    ` : ''}
  `;

  if (typeof lucide !== "undefined" && typeof lucide.createIcons === "function") {
    lucide.createIcons({ root: container });
  }
}

// Global exports
window.CABLE_COLOR_PALETTE = CABLE_COLOR_PALETTE;
window.CABLE_DEVICE_TYPES = CABLE_DEVICE_TYPES;
window.DEFAULT_PROJECT_STANDARDS = DEFAULT_PROJECT_STANDARDS;
window.getDeviceCablingKey = getDeviceCablingKey;
window.getProjectCablingStandard = getProjectCablingStandard;
window.getProjectVlanDetailsForDevice = getProjectVlanDetailsForDevice;
window.getProjectVlanForDevice = getProjectVlanForDevice;
window.toggleWizardVlanConfigUI = toggleWizardVlanConfigUI;
window.applyDefaultCableColorToAll = applyDefaultCableColorToAll;
window.updateCableColorPreviewDot = updateCableColorPreviewDot;
window.openProjectWizardModal = openProjectWizardModal;
window.closeProjectWizardModal = closeProjectWizardModal;
window.setProjectWizardStep = setProjectWizardStep;
window.toggleAcsScope = toggleAcsScope;
window.toggleVmsScope = toggleVmsScope;
window.quickCreateProjectWithDefaults = quickCreateProjectWithDefaults;
window.submitProjectWizard = submitProjectWizard;
window.applyProjectFocusMode = applyProjectFocusMode;
window.renderProjectDefaultsSummary = renderProjectDefaultsSummary;
window.INFRA_SCOPE_PRESETS = INFRA_SCOPE_PRESETS;
window.getProjectInfrastructureScope = getProjectInfrastructureScope;
window.getProjectOpticsVendorMode = getProjectOpticsVendorMode;
window.getVendorEepromCode = getVendorEepromCode;
window.setProjectOpticsVendorMode = setProjectOpticsVendorMode;
window.applyWizardInfraScopePreset = applyWizardInfraScopePreset;
window.onWizardInfraScopeCheckboxChange = onWizardInfraScopeCheckboxChange;
window.reconcileBOMForInfrastructureScope = reconcileBOMForInfrastructureScope;
window.syncAllOpticsAndScopeUI = syncAllOpticsAndScopeUI;
window.toggleNetSwitchesScope = toggleNetSwitchesScope;
window.WIZARD_SWITCH_VENDORS = WIZARD_SWITCH_VENDORS;
window.handleWizardInputKeydown = handleWizardInputKeydown;
window.selectWizardCameraDesignMode = selectWizardCameraDesignMode;
window.updateWizardVmsTierOptions = updateWizardVmsTierOptions;
window.toggleWizardVmsHeadEndUI = toggleWizardVmsHeadEndUI;
window.updateWizardStateFromUI = updateWizardStateFromUI;

// =========================================================================
// PROJECT DEFAULT OVERRIDE CONFIRMATION & RUNTIME ENGINE SYNCHRONIZATION
// =========================================================================

let _pendingProjectDefaultConfirm = null;

function isProjectWizardOpen() {
  const modal = document.getElementById("newProjectModal");
  return Boolean(modal && !modal.classList.contains("hidden"));
}

function confirmProjectDefaultChange(opts = {}) {
  const modal = document.getElementById("projectDefaultConfirmModal");
  if (!modal) {
    // Fallback if DOM modal is unavailable
    const ok = window.confirm(`${opts.message || `Project default was set to "${opts.defaultLabel}". Are you sure you want to change it to "${opts.newLabel}"?`}`);
    if (ok) {
      if (typeof opts.onUpdateDefault === "function") opts.onUpdateDefault();
      else if (typeof opts.onLocalOverride === "function") opts.onLocalOverride();
    } else if (typeof opts.onCancel === "function") {
      opts.onCancel();
    }
    return;
  }

  _pendingProjectDefaultConfirm = opts;

  const titleEl = document.getElementById("projDefConfirmTitle");
  const settingEl = document.getElementById("projDefConfirmSetting");
  const msgEl = document.getElementById("projDefConfirmMessage");
  const curBadge = document.getElementById("projDefConfirmCurrentBadge");
  const newBadge = document.getElementById("projDefConfirmNewBadge");
  const cancelBtn = document.getElementById("projDefConfirmCancelBtn");
  const localBtn = document.getElementById("projDefConfirmLocalBtn");
  const updateBtn = document.getElementById("projDefConfirmUpdateBtn");

  if (titleEl) titleEl.textContent = opts.title || "Project Default Change Confirmation";
  if (settingEl) settingEl.textContent = opts.settingLabel || "Project Scope & Technical Defaults";
  if (msgEl) {
    msgEl.textContent = opts.message ||
      `The Project Scope & Defaults menu currently sets this to "${opts.defaultLabel}". Are you sure you want to change it to "${opts.newLabel}"?`;
  }
  if (curBadge) curBadge.textContent = opts.defaultLabel || "Current Default";
  if (newBadge) newBadge.textContent = opts.newLabel || "New Value";
  if (cancelBtn) cancelBtn.textContent = opts.cancelLabel || `Keep Default (${opts.defaultLabel || "Cancel"})`;

  if (localBtn) {
    const showLocal = Boolean(opts.allowLocalOverride && typeof opts.onLocalOverride === "function");
    localBtn.classList.toggle("hidden", !showLocal);
    if (showLocal) {
      localBtn.textContent = opts.localOverrideLabel || "Override Here Only";
    }
  }
  if (updateBtn) {
    updateBtn.textContent = opts.updateDefaultLabel || "Change & Update Project Default";
  }

  modal.classList.remove("hidden");
  if (typeof lucide !== "undefined" && typeof lucide.createIcons === "function") {
    try { lucide.createIcons({ root: modal }); } catch (e) {}
  }
}

function resolveProjectDefaultConfirm(choice) {
  const modal = document.getElementById("projectDefaultConfirmModal");
  if (modal) modal.classList.add("hidden");

  const pending = _pendingProjectDefaultConfirm;
  _pendingProjectDefaultConfirm = null;
  if (!pending) return;

  if (choice === "update_default") {
    if (typeof pending.onUpdateDefault === "function") pending.onUpdateDefault();
  } else if (choice === "local") {
    if (typeof pending.onLocalOverride === "function") pending.onLocalOverride();
  } else {
    if (typeof pending.onCancel === "function") pending.onCancel();
  }
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && _pendingProjectDefaultConfirm) {
    resolveProjectDefaultConfirm("cancel");
  }
});

function mapProjectPlatformToVmsVendor(platform) {
  const p = String(platform || "").toLowerCase();
  if (p.includes("milestone") || p.includes("xprotect")) return "milestone";
  if (p.includes("genetec") || p.includes("omnicast")) return "genetec";
  return "generic";
}

function mapVmsVendorToPlatformLabel(vendor) {
  const v = String(vendor || "").toLowerCase();
  if (v === "milestone") return "Milestone XProtect";
  if (v === "genetec") return "Genetec";
  return "Generic / Third-Party VMS";
}

function mapTermToMaintenanceYears(termStr) {
  const t = String(termStr || "1YR").toUpperCase();
  if (t.startsWith("5")) return 5;
  if (t.startsWith("4")) return 4;
  if (t.startsWith("3")) return 3;
  if (t.startsWith("2")) return 2;
  return 1;
}

function mapYearsToTermString(years) {
  const y = parseInt(years, 10) || 1;
  if (y >= 5) return "5YR";
  if (y >= 3) return "3YR";
  return "1YR";
}

function mapProjectAcsEngineToDoorPlatform(engine) {
  const e = String(engine || "").toLowerCase();
  if (e.includes("genetec") || e.includes("synergis")) return "genetec_synergis";
  if (e.includes("axis secure entry")) return "milestone_axis_secure_entry";
  if (e.includes("milestone") || e.includes("xprotect access")) return "milestone_xpaccess";
  return "standalone";
}

function mapDoorPlatformToEngineLabel(plat) {
  if (plat === "genetec_synergis") return "Genetec";
  if (plat === "milestone_xpaccess") return "Milestone XProtect Access";
  if (plat === "milestone_axis_secure_entry") return "Milestone AXIS Secure Entry";
  return "LenelS2 OnGuard";
}

function normalizeCameraVendorName(v) {
  const s = String(v || "").trim();
  if (/^bosch/i.test(s)) return "Bosch Security";
  if (/^axis/i.test(s)) return "Axis Communications";
  if (/^hanwha/i.test(s)) return "Hanwha Vision";
  if (/^avigilon/i.test(s)) return "Avigilon";
  return s;
}

function canonicalWizardCameraVendorName(v) {
  const s = String(v || "").trim();
  if (/^bosch/i.test(s)) return "Bosch";
  if (/^axis/i.test(s)) return "Axis Communications";
  if (/^hanwha/i.test(s)) return "Hanwha Vision";
  if (/^avigilon/i.test(s)) return "Avigilon";
  return s;
}

function updateSingleProjectDefault(mutatorFn, syncEngines = false) {
  if (typeof StorageService === "undefined" || typeof StorageService.getProjectDefaults !== "function") return null;
  const defs = StorageService.getProjectDefaults() || JSON.parse(JSON.stringify(DEFAULT_PROJECT_STANDARDS));
  mutatorFn(defs);
  StorageService.setProjectDefaults(defs, null, { skipEngineSync: !syncEngines });
  StorageService.saveCurrentProject(false);
  if (typeof renderProjectDefaultsSummary === "function") renderProjectDefaultsSummary();
  if (typeof applyProjectFocusMode === "function") applyProjectFocusMode();
  return defs;
}

/**
 * Synchronizes all runtime sizers, licensing studios, catalog filters, and toolbar selectors
 * from the active project's Project Scope & Technical Defaults.
 */
function syncRuntimeEnginesFromProjectDefaults(defaults = null) {
  const defs = defaults || ((typeof StorageService !== "undefined" && typeof StorageService.getProjectDefaults === "function")
    ? StorageService.getProjectDefaults()
    : DEFAULT_PROJECT_STANDARDS);
  if (!defs) return;

  // 1. VMS Platform, Edition Tier, Retention, Failover, Camera Workflow Mode & Camera Manufacturers
  if (defs.vms) {
    const camMode = defs.vms.cameraDesignMode === "specific" ? "specific" : "generic";
    if (typeof cameraDesignMode !== "undefined") cameraDesignMode = camMode;
    window.cameraDesignMode = camMode;
    if (camMode === "generic") {
      if (typeof poeCalcInputMode !== "undefined") poeCalcInputMode = "camera_types";
      window.poeCalcInputMode = "camera_types";
    }
    if (typeof renderGlobalDesignModeToggle === "function") {
      renderGlobalDesignModeToggle();
    }

    const mappedVms = mapProjectPlatformToVmsVendor(defs.vms.platform);
    const licVendor = mappedVms === "milestone" ? "milestone" : "genetec";

    if (typeof videoVmsVendor !== "undefined") videoVmsVendor = mappedVms;
    window.videoVmsVendor = mappedVms;
    if (typeof VideoStorageSizer !== "undefined" && VideoStorageSizer.state) {
      VideoStorageSizer.state.vmsVendor = mappedVms;
    }

    if (typeof activeVmsLicensingVendor !== "undefined") activeVmsLicensingVendor = licVendor;
    window.activeVmsLicensingVendor = licVendor;

    if (typeof ClientWorkstationSizer !== "undefined" && ClientWorkstationSizer.state) {
      ClientWorkstationSizer.state.vmsPlatform = licVendor;
    }

    // VMS Edition / Base Package Tier
    const edTier = defs.vms.editionTier || "auto";
    if (mappedVms === "milestone") {
      const validMileTiers = ["auto", "express_plus", "professional_plus", "expert", "corporate"];
      const resolvedMileTier = validMileTiers.includes(edTier) ? edTier : "auto";
      if (typeof window.milestoneLicensingConfig !== "object" || !window.milestoneLicensingConfig) {
        window.milestoneLicensingConfig = (typeof MilestoneLicensingSizer !== "undefined" && typeof MilestoneLicensingSizer.getDefaultConfig === "function")
          ? MilestoneLicensingSizer.getDefaultConfig()
          : {};
      }
      window.milestoneLicensingConfig.tierMode = resolvedMileTier;
      window.milestoneLicensingConfig.edition = resolvedMileTier;
      if (typeof MilestoneLicensingSizer !== "undefined" && MilestoneLicensingSizer.state) {
        MilestoneLicensingSizer.state.tierMode = resolvedMileTier;
        MilestoneLicensingSizer.state.edition = resolvedMileTier;
      }
    } else if (mappedVms === "genetec") {
      const validGenTiers = ["auto", "aio", "standard", "enterprise"];
      const resolvedGenTier = validGenTiers.includes(edTier) ? edTier : "auto";
      if (typeof window.genetecLicensingConfig !== "object" || !window.genetecLicensingConfig) {
        window.genetecLicensingConfig = (typeof GenetecLicensingSizer !== "undefined" && typeof GenetecLicensingSizer.getDefaultConfig === "function")
          ? GenetecLicensingSizer.getDefaultConfig()
          : {};
      }
      window.genetecLicensingConfig.tierMode = resolvedGenTier;
      if (typeof GenetecLicensingSizer !== "undefined" && GenetecLicensingSizer.state) {
        GenetecLicensingSizer.state.tierMode = resolvedGenTier;
      }
    }

    // 2. Default Retention Days & Recording Failover -> Video Storage Sizer
    const retDays = parseInt(defs.vms.retentionDays, 10) || 30;
    if (typeof videoRetentionDays !== "undefined") videoRetentionDays = retDays;
    window.videoRetentionDays = retDays;
    if (typeof VideoStorageSizer !== "undefined" && VideoStorageSizer.state) {
      VideoStorageSizer.state.retentionDays = retDays;
    }

    const failoverStruct = ["none", "dedicated", "ring"].includes(defs.vms.failoverMode) ? defs.vms.failoverMode : "none";
    if (typeof videoFailoverStructure !== "undefined") videoFailoverStructure = failoverStruct;
    window.videoFailoverStructure = failoverStruct;
    if (typeof VideoStorageSizer !== "undefined" && VideoStorageSizer.state) {
      VideoStorageSizer.state.failoverStructure = failoverStruct;
    }
    if (typeof window.genetecLicensingConfig === "object" && window.genetecLicensingConfig) {
      window.genetecLicensingConfig.enableVideoFailover = failoverStruct !== "none";
      if (failoverStruct !== "none" && (!window.genetecLicensingConfig.failoverMode || window.genetecLicensingConfig.failoverMode === "none")) {
        window.genetecLicensingConfig.failoverMode = "all";
      } else if (failoverStruct === "none") {
        window.genetecLicensingConfig.failoverMode = "none";
      }
    }

    // 3. Preferred Camera Manufacturers -> Camera Catalog Filter (active in Full Design / SKU mode)
    if (Array.isArray(defs.vms.cameraVendors) && defs.vms.cameraVendors.length > 0) {
      const mappedCamVendors = camMode === "specific" ? defs.vms.cameraVendors.map(normalizeCameraVendorName) : [];
      if (typeof selectedCamVendors !== "undefined") {
        selectedCamVendors = [...mappedCamVendors];
      }
      window.selectedCamVendors = [...mappedCamVendors];
    }
  }

  // 4. Software Licensing & Maintenance Term -> Meraki Cloud, Genetec Advantage, Milestone Care Plus
  const termStr = defs.licensing?.globalSelectedTerm || "1YR";
  if (typeof globalSelectedTerm !== "undefined") {
    globalSelectedTerm = termStr;
  }
  window.globalSelectedTerm = termStr;
  const maintYears = mapTermToMaintenanceYears(termStr);
  const genetecAdvYears = [1, 3, 5].includes(maintYears) ? maintYears : 1;

  if (typeof GenetecLicensingSizer !== "undefined" && GenetecLicensingSizer.state) {
    GenetecLicensingSizer.state.advantageYears = genetecAdvYears;
  }
  if (typeof window.genetecLicensingConfig === "object" && window.genetecLicensingConfig) {
    window.genetecLicensingConfig.advantageYears = genetecAdvYears;
  }

  if (typeof MilestoneLicensingSizer !== "undefined" && MilestoneLicensingSizer.state) {
    MilestoneLicensingSizer.state.careYears = maintYears;
  }
  if (typeof window.milestoneLicensingConfig === "object" && window.milestoneLicensingConfig) {
    window.milestoneLicensingConfig.careYears = maintYears;
  }

  // 5. Access Control Engine, Door Controller Architecture & Reader Protocol -> Door Package Builder & OSDP Filter
  if (defs.accessControl) {
    const mappedDoorPlat = mapProjectAcsEngineToDoorPlatform(defs.accessControl.engine);
    if (typeof doorBuilderAcsPlatform !== "undefined") {
      doorBuilderAcsPlatform = mappedDoorPlat;
    }
    window.doorBuilderAcsPlatform = mappedDoorPlat;

    const validCtrlVendors = ["mercury", "mercury_mp", "axis_pbg", "axis", "scl312"];
    const ctrlVendor = validCtrlVendors.includes(defs.accessControl.controllerVendor)
      ? defs.accessControl.controllerVendor
      : "mercury";
    if (typeof doorBuilderControllerVendor !== "undefined") {
      doorBuilderControllerVendor = ctrlVendor;
    }
    window.doorBuilderControllerVendor = ctrlVendor;

    const defaultPresetMap = {
      mercury: "standard_strike",
      mercury_mp: "mercury_mp1502_strike",
      axis_pbg: "axis_pbg_a1610",
      axis: "ip_edge_door",
      scl312: "scl312_osdp_direct"
    };
    const targetDoorPreset = defaultPresetMap[ctrlVendor] || "standard_strike";
    if (typeof doorPkgPreset !== "undefined") doorPkgPreset = targetDoorPreset;
    if (typeof doorScheduleGroups !== "undefined" && Array.isArray(doorScheduleGroups)) {
      doorScheduleGroups.forEach(g => {
        if (g && (!g.preset || Object.values(defaultPresetMap).includes(g.preset))) {
          g.preset = targetDoorPreset;
        }
      });
    }

    const isOsdp = (defs.accessControl.readerProtocol || "osdp").toLowerCase() === "osdp";
    if (typeof requireAcsOsdp !== "undefined") {
      requireAcsOsdp = isOsdp;
    }
    window.requireAcsOsdp = isOsdp;
  }

  // 5b. Active Network Switching Headroom Buffer & Preferred Switch Manufacturers
  if (defs.network) {
    const poeHr = Math.min(100, Math.max(0, parseInt(defs.network.poeHeadroomPercent, 10) || 20));
    if (typeof extraHeadroomPercent !== "undefined") {
      extraHeadroomPercent = poeHr;
    }
    window.extraHeadroomPercent = poeHr;
    if (typeof AppState !== "undefined" && AppState) {
      AppState.extraHeadroomPercent = poeHr;
    }

    if (Array.isArray(defs.network.preferredSwitchVendors)) {
      if (typeof selectedVendors !== "undefined") {
        selectedVendors = [...defs.network.preferredSwitchVendors];
      }
      window.selectedVendors = [...defs.network.preferredSwitchVendors];
    }
  }

  // 6. Cabling, Fiber, Optics Sourcing & DOR Scope Selectors
  syncAllOpticsAndScopeUI();
  applyProjectFocusMode();

  if (typeof buildSidebarFilters === "function") buildSidebarFilters();
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
  if (typeof runActiveFilter === "function") runActiveFilter();
  if (typeof updateProjectHealthUI === "function") updateProjectHealthUI();
}

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    syncRuntimeEnginesFromProjectDefaults();
  }, 80);
});

window.isProjectWizardOpen = isProjectWizardOpen;
window.confirmProjectDefaultChange = confirmProjectDefaultChange;
window.resolveProjectDefaultConfirm = resolveProjectDefaultConfirm;
window.mapProjectPlatformToVmsVendor = mapProjectPlatformToVmsVendor;
window.mapVmsVendorToPlatformLabel = mapVmsVendorToPlatformLabel;
window.mapTermToMaintenanceYears = mapTermToMaintenanceYears;
window.mapYearsToTermString = mapYearsToTermString;
window.mapProjectAcsEngineToDoorPlatform = mapProjectAcsEngineToDoorPlatform;
window.mapDoorPlatformToEngineLabel = mapDoorPlatformToEngineLabel;
window.normalizeCameraVendorName = normalizeCameraVendorName;
window.canonicalWizardCameraVendorName = canonicalWizardCameraVendorName;
window.updateSingleProjectDefault = updateSingleProjectDefault;
window.syncRuntimeEnginesFromProjectDefaults = syncRuntimeEnginesFromProjectDefaults;
