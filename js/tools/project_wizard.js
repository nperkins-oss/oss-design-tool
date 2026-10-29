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

const ACS_HOST_CONTROLLER_MATRIX = {
  "Genetec": [
    {
      value: "mercury",
      label: "Mercury LP Series (LP1502 + Synergis Cloud Link + Trove2)",
      shortLabel: "Mercury LP",
      doorBuilderVendor: "mercury",
      hintHtml: '<strong class="text-emerald-300">Synergis + Mercury LP Architecture:</strong> Sizes Synergis Cloud Link gateway appliances paired with Mercury LP1502 intelligent controllers and MR52-S3B downstream sub-panels inside Altronix Trove2 enclosures.'
    },
    {
      value: "mercury_mp",
      label: "Mercury MP Series (MP1502 Native SC 5.12.1+ / Cloud Link)",
      shortLabel: "Mercury MP",
      doorBuilderVendor: "mercury_mp",
      hintHtml: '<strong class="text-emerald-300">Synergis + Mercury MP Architecture:</strong> Deploys next-gen Mercury MP1502 intelligent controllers (native Security Center 5.12.1+ or Synergis Cloud Link) with MR52-S3B sub-panels and Altronix Trove2 power.'
    },
    {
      value: "axis_pbg",
      label: "Axis Powered by Genetec (A1610 Network Door Controller)",
      shortLabel: "Axis PbG",
      doorBuilderVendor: "axis_pbg",
      hintHtml: '<strong class="text-emerald-300">Axis Powered by Genetec (PbG):</strong> Deploys Axis A1610 PoE+ network door controllers pre-loaded with native Genetec Synergis firmware—connects directly to Security Center with 0 Synergis Cloud Links required.'
    },
    {
      value: "axis",
      label: "Axis Network Controllers (A1610 / A1210 / A1001 PoE+)",
      shortLabel: "Axis IP",
      doorBuilderVendor: "axis",
      hintHtml: '<strong class="text-emerald-300">Synergis + Standard Axis IP Controllers:</strong> Integrates Axis A1610 / A1210 / A1001 PoE+ edge door controllers through Synergis Cloud Link appliances.'
    },
    {
      value: "scl312",
      label: "Synergis Cloud Link-312 (12x RS-485 Direct OSDP Doors)",
      shortLabel: "SCL-312",
      doorBuilderVendor: "scl312",
      hintHtml: '<strong class="text-emerald-300">Synergis Cloud Link-312 Direct OSDP:</strong> Connects OSDP Secure Channel readers and door I/O modules directly across the SCL-312\'s 12 onboard RS-485 ports without separate Mercury LP/MP intelligent boards.'
    }
  ],
  "Genetec SaaS": [
    {
      value: "mercury_mp",
      label: "Mercury MP Series + Synergis Cloud Link (Cloud-Managed)",
      shortLabel: "Mercury MP",
      doorBuilderVendor: "mercury_mp",
      hintHtml: '<strong class="text-emerald-300">Security Center SaaS + Mercury MP:</strong> Cloud-managed Synergis Cloud Link gateway polling Mercury MP1502 / MR52-S3B panels in Altronix Trove2 enclosures.'
    },
    {
      value: "mercury",
      label: "Mercury LP Series + Synergis Cloud Link (Cloud-Managed)",
      shortLabel: "Mercury LP",
      doorBuilderVendor: "mercury",
      hintHtml: '<strong class="text-emerald-300">Security Center SaaS + Mercury LP:</strong> Cloud-managed Synergis Cloud Link gateway polling Mercury LP1502 / MR52-S3B panels in Altronix Trove2 enclosures.'
    },
    {
      value: "axis_pbg",
      label: "Axis Powered by Genetec (A1610 Direct-to-Cloud)",
      shortLabel: "Axis PbG",
      doorBuilderVendor: "axis_pbg",
      hintHtml: '<strong class="text-emerald-300">Security Center SaaS + Axis PbG:</strong> Axis A1610 PoE+ controllers enroll directly into Genetec Security Center SaaS without a separate local appliance.'
    },
    {
      value: "scl312",
      label: "Synergis Cloud Link-312 (12x RS-485 Direct OSDP Doors)",
      shortLabel: "SCL-312",
      doorBuilderVendor: "scl312",
      hintHtml: '<strong class="text-emerald-300">Security Center SaaS + SCL-312:</strong> Direct cloud-enrolled SCL-312 appliance driving up to 12 RS-485 OSDP channels.'
    }
  ],
  "Milestone XProtect Access": [
    {
      value: "mercury",
      label: "Mercury LP Series (LP1502 + XProtect Access Bridge + Trove2)",
      shortLabel: "Mercury LP",
      doorBuilderVendor: "mercury",
      hintHtml: '<strong class="text-sky-300">XProtect Access + Mercury LP:</strong> Sizes Mercury LP1502 / MR52-S3B controller panels inside Altronix Trove2 enclosures licensed per reader in Milestone XProtect Access.'
    },
    {
      value: "mercury_mp",
      label: "Mercury MP Series (MP1502 + XProtect Access Bridge + Trove2)",
      shortLabel: "Mercury MP",
      doorBuilderVendor: "mercury_mp",
      hintHtml: '<strong class="text-sky-300">XProtect Access + Mercury MP:</strong> Sizes next-gen Mercury MP1502 / MR52-S3B controller panels inside Altronix Trove2 enclosures.'
    },
    {
      value: "axis",
      label: "Axis Network Controllers (A1610 / A1210 / A1001 PoE+)",
      shortLabel: "Axis IP",
      doorBuilderVendor: "axis",
      hintHtml: '<strong class="text-sky-300">XProtect Access + Axis IP Controllers:</strong> Deploys PoE+ Axis network door controllers integrated via the XProtect Access plugin.'
    }
  ],
  "Milestone AXIS Secure Entry": [
    {
      value: "axis",
      label: "Axis Network Door Controllers Only (A1610 / A1210 PoE+ Native)",
      shortLabel: "Axis Native",
      doorBuilderVendor: "axis",
      hintHtml: '<strong class="text-sky-300">Milestone AXIS Secure Entry:</strong> Exclusively uses native Axis A1610 and A1210 PoE+ network door controllers configured directly inside XProtect Management Client (Mercury panels and Synergis Cloud Links are not compatible).'
    }
  ],
  "LenelS2 OnGuard": [
    {
      value: "lenel_mercury",
      label: "LenelS2 X-Series / Mercury OEM (LNL-X2220 + LNL-1320 + Trove2)",
      shortLabel: "Lenel X-Series",
      doorBuilderVendor: "mercury",
      hintHtml: '<strong class="text-emerald-300">LenelS2 OnGuard X-Series Architecture:</strong> Sizes Mercury-OEM intelligent dual-reader controllers (LNL-X2220 / LP1502 class) and LNL-1320 (MR52 class) sub-panels inside Altronix Trove2M2 enclosures.'
    },
    {
      value: "mercury_mp",
      label: "LenelS2 MP-Series / Mercury MP OEM (MP1502 Class + Trove2)",
      shortLabel: "Lenel MP",
      doorBuilderVendor: "mercury_mp",
      hintHtml: '<strong class="text-emerald-300">LenelS2 OnGuard Next-Gen MP Architecture:</strong> Deploys MP-series intelligent dual-reader controllers with OSDP v2 Secure Channel readers inside Altronix Trove2M2 enclosures.'
    }
  ],
  "Lenel Elements": [
    {
      value: "lenel_mercury",
      label: "Elements Cloud Gateway + Lenel/Mercury Controllers (Trove2)",
      shortLabel: "Elements Mercury",
      doorBuilderVendor: "mercury",
      hintHtml: '<strong class="text-emerald-300">LenelS2 Elements Cloud Architecture:</strong> Pairs Elements cloud connector appliances with Mercury-OEM intelligent controllers and OSDP readers inside Altronix Trove2 enclosures.'
    }
  ],
  "Software House C•CURE 9000": [
    {
      value: "swh_istar",
      label: "Software House iSTAR Ultra G2 / iSTAR Edge G2 (Trove / Rack)",
      shortLabel: "iSTAR Ultra G2",
      doorBuilderVendor: "mercury",
      hintHtml: '<strong class="text-amber-300">Software House C•CURE 9000 Architecture:</strong> Sizes native Tyco / Software House iSTAR Ultra G2 and iSTAR Edge G2 door controllers (non-Mercury hardware) with OSDP readers and Altronix Trove power.'
    }
  ],
  "Avigilon Unity": [
    {
      value: "mercury",
      label: "Avigilon Mercury LP Series (AC-MER-CONT-LP1502 + Trove2)",
      shortLabel: "Mercury LP",
      doorBuilderVendor: "mercury",
      hintHtml: '<strong class="text-emerald-300">Avigilon Unity Access (ACM) + Mercury LP:</strong> Deploys authentic Avigilon-parted Mercury LP1502 and MR52-S3B panels inside Altronix Trove2M2 enclosures.'
    },
    {
      value: "mercury_mp",
      label: "Avigilon Mercury MP Series (AC-MER-MP1502 + Trove2)",
      shortLabel: "Mercury MP",
      doorBuilderVendor: "mercury_mp",
      hintHtml: '<strong class="text-emerald-300">Avigilon Unity Access (ACM) + Mercury MP:</strong> Deploys next-gen Avigilon-parted Mercury MP1502 and MR52-S3B panels inside Altronix Trove2M2 enclosures.'
    }
  ],
  "Avigilon Alta": [
    {
      value: "alta_cloud",
      label: "Avigilon Alta Smart Hub / Core Series Cloud ACU (4-Door / 8-Door)",
      shortLabel: "Alta Cloud ACU",
      doorBuilderVendor: "axis",
      hintHtml: '<strong class="text-purple-300">Avigilon Alta (Openpath) Cloud Architecture:</strong> Uses native Alta Smart Hub 4-Door / 8-Door Cloud Access Control Units (ACUs) and Smart Readers—no Mercury panels or on-prem ACS servers required.'
    }
  ]
};

function getCompatibleAcsControllersForHost(engine) {
  if (engine && ACS_HOST_CONTROLLER_MATRIX[engine]) {
    return ACS_HOST_CONTROLLER_MATRIX[engine];
  }
  const lower = String(engine || "").toLowerCase();
  const matchedKey = Object.keys(ACS_HOST_CONTROLLER_MATRIX).find(k => k.toLowerCase() === lower);
  return matchedKey ? ACS_HOST_CONTROLLER_MATRIX[matchedKey] : ACS_HOST_CONTROLLER_MATRIX["Genetec"];
}
window.getCompatibleAcsControllersForHost = getCompatibleAcsControllersForHost;

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
    controllerVendor: "mercury", // Filtered dynamically by ACS_HOST_CONTROLLER_MATRIX[engine]
    readerProtocol: "osdp"
  },
  vms: {
    enabled: true,
    cameraDesignMode: "generic", // "generic" (Initial/Quick Design) | "specific" (Full Engineering Design)
    platform: "Genetec",
    editionTier: "auto", // Genetec: "auto"|"aio"|"standard"|"enterprise"; Milestone: "auto"|"express_plus"|"professional_plus"|"expert"|"corporate"
    failoverMode: "none", // "none" | "dedicated" | "ring"
    cameraVendors: ["Axis Communications", "Hanwha Vision", "Avigilon"],
    retentionDays: 30,
    promptAnalytics: true,
    serversInScope: true,
    licensingInScope: true,
    headEndInScope: true
  },
  infrastructure: {
    racksInScope: true,
    powerInScope: true
  },
  cabling: {
    horizontalCategories: ["C6A-CMP-1K-YL"],
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
        cameras: { label: "IP Cameras & Video Sensors", runColor: "Yellow", runCategory: "C6A-CMP-1K-YL", patchColor: "Yellow", patchLength: 0.5, patchType: "slim", overriddenFields: {} },
        accessControl: { label: "Access Control & Door Controllers", runColor: "Yellow", runCategory: "C6A-CMP-1K-YL", patchColor: "Yellow", patchLength: 0.5, patchType: "slim", overriddenFields: {} },
        intercom: { label: "Audio & Intercom Stations", runColor: "Yellow", runCategory: "C6A-CMP-1K-YL", patchColor: "Yellow", patchLength: 0.5, patchType: "slim", overriddenFields: {} },
        wireless: { label: "Wireless APs & Radios", runColor: "Yellow", runCategory: "C6A-CMP-1K-YL", patchColor: "Yellow", patchLength: 0.5, patchType: "slim", overriddenFields: {} },
        data: { label: "Workstations & Office Data", runColor: "Yellow", runCategory: "C6A-CMP-1K-YL", patchColor: "Yellow", patchLength: 0.5, patchType: "slim", overriddenFields: {} },
        servers: { label: "Servers, Storage & NVRs", runColor: "Yellow", runCategory: "C6A-CMP-1K-YL", patchColor: "Yellow", patchLength: 0.5, patchType: "slim", overriddenFields: {} },
        uplinks: { label: "Inter-Switch & Network Uplinks", runColor: "Yellow", runCategory: "C6A-CMP-1K-YL", patchColor: "Yellow", patchLength: 0.5, patchType: "slim", overriddenFields: {} }
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
      projectBOM.filter(i => !i.parentInstanceId && i.stackedUnits && i.stackedUnits >= 2).forEach(sw => applyStackCabling(sw));
    }
    if (typeof autoSynthesizeInterconnects === "function") {
      autoSynthesizeInterconnects(true);
    }
    if (typeof renderBOM === "function") renderBOM();
    if (typeof updateBOMView === "function") updateBOMView();
    if (typeof updateBOMBadge === "function") updateBOMBadge();
    if (typeof updateProjectHealthUI === "function") updateProjectHealthUI();
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
      setTimeout(() => setProjectWizardStep(1), 60);
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
  const isDirectRj45 = (typeof StorageService !== "undefined" && typeof StorageService.getProjectDefaults === "function")
    ? (StorageService.getProjectDefaults()?.cabling?.rackTermination === "direct_rj45")
    : false;

  if (typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) {
    // 1. Re-apply stacking DAC cables & in-stack patch panels on stacked switches (bidirectional OFF <-> ON & OEM <-> 3rd-Party)
    if (typeof applyStackCabling === "function") {
      projectBOM
        .filter(i => !i.parentInstanceId && i.stackedUnits && i.stackedUnits >= 2)
        .forEach(sw => applyStackCabling(sw));
    }

    // 2. Re-apply standard pod cabling on standalone standard-pod switches (stacked standard-pod switches were handled inside applyStackCabling)
    if (typeof applyStandardPodCabling === "function") {
      projectBOM
        .filter(i => !i.parentInstanceId && i.standardPod && !(i.stackedUnits && i.stackedUnits >= 2))
        .forEach(sw => applyStandardPodCabling(sw));
    }

    // 3. Re-sync floorplan cabling if horizontal drops or fiber trunks exist
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
          else if ((!scope.rackPatchPanels || isDirectRj45) && (sku.startsWith("PP-") || sku.includes("KEY"))) projectBOM.splice(i, 1);
          else if (!scope.patchCords && (sku.includes("SLIM") || sku.includes("PATCH"))) projectBOM.splice(i, 1);
          else if (!scope.fiberBackbone && sku.startsWith("FIBER-O")) projectBOM.splice(i, 1);
        }
      }
    }

    // 4. Re-synthesize topology interconnects (DACs, SFPs, LC-LC fiber patches, RJ45 uplink cords) & 1U Fiber LIUs
    if (typeof autoSynthesizeInterconnects === "function") {
      autoSynthesizeInterconnects(true);
    }
  }

  if (typeof updateBOMView === "function") updateBOMView();
  if (typeof updateBOMBadge === "function") updateBOMBadge();
  if (!silent && typeof renderBOM === "function") renderBOM();
  if (typeof updateProjectHealthUI === "function") updateProjectHealthUI();
  if (typeof StorageService !== "undefined" && typeof StorageService.queueAutoSave === "function") {
    StorageService.queueAutoSave();
  }
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
  if (typeof item === "string") {
    if (CABLE_DEVICE_TYPES.some(dt => dt.id === item)) return item;
    item = { role: item };
  }

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
  const ov = (devConf && typeof devConf.overriddenFields === "object" && devConf.overriddenFields) ? devConf.overriddenFields : null;

  const defaultRunColor = standards.defaultRunColor || "Yellow";
  const defaultPatchColor = standards.defaultPatchColor || "Yellow";
  const defaultRunCategory = standards.defaultRunCategory || "C6A-CMP-1K-YL";
  const defaultPatchLength = standards.defaultPatchLength ?? 0.5;
  const defaultPatchType = standards.defaultPatchType || "slim";

  if (type === "run") {
    const color = ov ? (ov.runColor ? (devConf.runColor || defaultRunColor) : defaultRunColor) : (devConf.runColor || defaultRunColor);
    const category = ov ? (ov.runCategory ? (devConf.runCategory || defaultRunCategory) : defaultRunCategory) : (devConf.runCategory || defaultRunCategory);
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
    const color = ov ? (ov.patchColor ? (devConf.patchColor || defaultPatchColor) : defaultPatchColor) : (devConf.patchColor || defaultPatchColor);
    const lengthFt = ov ? (ov.patchLength ? (devConf.patchLength ?? defaultPatchLength) : defaultPatchLength) : (devConf.patchLength ?? defaultPatchLength);
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

let wizardSubsystemCableOverrides = {};

function getBaselineCableValuesFromUI() {
  return {
    runColor: document.getElementById("wizDefaultRunColor")?.value || "Yellow",
    patchColor: document.getElementById("wizDefaultPatchColor")?.value || "Yellow",
    runCategory: document.getElementById("wizDefaultRunCategory")?.value || "C6A-CMP-1K-YL",
    patchLength: parseFloat(document.getElementById("wizPatchLength")?.value) || 0.5
  };
}

function setSelectValueWithFallback(selectEl, val) {
  if (!selectEl) return;
  const strVal = String(val);
  const opts = Array.from(selectEl.options || []);
  if (opts.length === 0) {
    selectEl.value = strVal;
    return;
  }
  const hasExact = opts.some(o => o.value === strVal);
  if (hasExact) {
    selectEl.value = strVal;
  } else if (typeof val === "number" || !isNaN(parseFloat(strVal))) {
    const numVal = parseFloat(strVal);
    const matchNum = opts.find(o => parseFloat(o.value) === numVal);
    if (matchNum) selectEl.value = matchNum.value;
  }
}

function refreshSubsystemCableOverrideBadges() {
  let customRowCount = 0;
  CABLE_DEVICE_TYPES.forEach(dt => {
    const ov = wizardSubsystemCableOverrides[dt.id] || {};
    const isCustom = Boolean(ov.runColor || ov.runCategory || ov.patchColor || ov.patchLength);
    if (isCustom) customRowCount++;
    const rowBadge = document.getElementById(`wizCableRowBadge-${dt.id}`);
    const resetBtn = document.getElementById(`wizCableRowReset-${dt.id}`);
    if (rowBadge) {
      rowBadge.textContent = isCustom ? "CUSTOM" : "BASELINE";
      rowBadge.className = isCustom
        ? "text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30"
        : "text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700";
    }
    if (resetBtn) {
      resetBtn.classList.toggle("hidden", !isCustom);
    }
  });
  const countBadge = document.getElementById("wizCableOverrideCountBadge");
  if (countBadge) {
    if (customRowCount === 0) {
      countBadge.textContent = "ALL INHERITING BASELINE";
      countBadge.className = "text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30";
    } else {
      countBadge.textContent = `${customRowCount} CUSTOM OVERRIDE${customRowCount > 1 ? "S" : ""}`;
      countBadge.className = "text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30";
    }
  }
}

function onBaselineCableStandardChange() {
  const base = getBaselineCableValuesFromUI();
  updateCableColorPreviewDot("wizDefaultRunDot", base.runColor);
  updateCableColorPreviewDot("wizDefaultPatchDot", base.patchColor);

  CABLE_DEVICE_TYPES.forEach(dt => {
    if (!wizardSubsystemCableOverrides[dt.id]) wizardSubsystemCableOverrides[dt.id] = {};
    const ov = wizardSubsystemCableOverrides[dt.id];

    if (!ov.runColor) {
      setSelectValueWithFallback(document.getElementById(`wizCableRunColor-${dt.id}`), base.runColor);
      updateCableColorPreviewDot(`wizCableRunDot-${dt.id}`, base.runColor);
    }
    if (!ov.runCategory) {
      setSelectValueWithFallback(document.getElementById(`wizCableRunCategory-${dt.id}`), base.runCategory);
    }
    if (!ov.patchColor) {
      setSelectValueWithFallback(document.getElementById(`wizCablePatchColor-${dt.id}`), base.patchColor);
      updateCableColorPreviewDot(`wizCablePatchDot-${dt.id}`, base.patchColor);
    }
    if (!ov.patchLength) {
      setSelectValueWithFallback(document.getElementById(`wizCablePatchLength-${dt.id}`), base.patchLength);
    }
  });

  refreshSubsystemCableOverrideBadges();
  updateWizardStateFromUI();
}

function onSubsystemCableOverrideChange(devId, field) {
  if (!wizardSubsystemCableOverrides[devId]) wizardSubsystemCableOverrides[devId] = {};
  const base = getBaselineCableValuesFromUI();
  const ov = wizardSubsystemCableOverrides[devId];

  if (field === "runColor") {
    const val = document.getElementById(`wizCableRunColor-${devId}`)?.value || base.runColor;
    updateCableColorPreviewDot(`wizCableRunDot-${devId}`, val);
    ov.runColor = val !== base.runColor;
  } else if (field === "runCategory") {
    const val = document.getElementById(`wizCableRunCategory-${devId}`)?.value || base.runCategory;
    ov.runCategory = val !== base.runCategory;
  } else if (field === "patchColor") {
    const val = document.getElementById(`wizCablePatchColor-${devId}`)?.value || base.patchColor;
    updateCableColorPreviewDot(`wizCablePatchDot-${devId}`, val);
    ov.patchColor = val !== base.patchColor;
  } else if (field === "patchLength") {
    const val = parseFloat(document.getElementById(`wizCablePatchLength-${devId}`)?.value) || base.patchLength;
    ov.patchLength = Math.abs(val - base.patchLength) > 0.001;
  }

  refreshSubsystemCableOverrideBadges();
  updateWizardStateFromUI();
}

function resetSubsystemCablingToBaseline(devId) {
  const base = getBaselineCableValuesFromUI();
  wizardSubsystemCableOverrides[devId] = { runColor: false, runCategory: false, patchColor: false, patchLength: false };

  setSelectValueWithFallback(document.getElementById(`wizCableRunColor-${devId}`), base.runColor);
  updateCableColorPreviewDot(`wizCableRunDot-${devId}`, base.runColor);
  setSelectValueWithFallback(document.getElementById(`wizCableRunCategory-${devId}`), base.runCategory);
  setSelectValueWithFallback(document.getElementById(`wizCablePatchColor-${devId}`), base.patchColor);
  updateCableColorPreviewDot(`wizCablePatchDot-${devId}`, base.patchColor);
  setSelectValueWithFallback(document.getElementById(`wizCablePatchLength-${devId}`), base.patchLength);

  refreshSubsystemCableOverrideBadges();
  updateWizardStateFromUI();
}

function resetAllSubsystemCablingToBaseline(silent = false) {
  const base = getBaselineCableValuesFromUI();
  updateCableColorPreviewDot("wizDefaultRunDot", base.runColor);
  updateCableColorPreviewDot("wizDefaultPatchDot", base.patchColor);

  CABLE_DEVICE_TYPES.forEach(dt => {
    wizardSubsystemCableOverrides[dt.id] = { runColor: false, runCategory: false, patchColor: false, patchLength: false };
    setSelectValueWithFallback(document.getElementById(`wizCableRunColor-${dt.id}`), base.runColor);
    updateCableColorPreviewDot(`wizCableRunDot-${dt.id}`, base.runColor);
    setSelectValueWithFallback(document.getElementById(`wizCableRunCategory-${dt.id}`), base.runCategory);
    setSelectValueWithFallback(document.getElementById(`wizCablePatchColor-${dt.id}`), base.patchColor);
    updateCableColorPreviewDot(`wizCablePatchDot-${dt.id}`, base.patchColor);
    setSelectValueWithFallback(document.getElementById(`wizCablePatchLength-${dt.id}`), base.patchLength);
  });

  refreshSubsystemCableOverrideBadges();
  updateWizardStateFromUI();
  if (!silent && typeof showToast === "function") {
    showToast("All subsystems reset to inherit Baseline Cabling Standards.", "info");
  }
}

/**
 * Legacy helper: sets baseline color and resets all subsystems to match baseline
 */
function applyDefaultCableColorToAll(color = "Yellow") {
  const defRunEl = document.getElementById("wizDefaultRunColor");
  const defPatchEl = document.getElementById("wizDefaultPatchColor");
  if (defRunEl) defRunEl.value = color;
  if (defPatchEl) defPatchEl.value = color;
  resetAllSubsystemCablingToBaseline(true);
  if (typeof showToast === "function") {
    showToast(`Applied ${color} baseline across all cable runs and patch cords.`, "info");
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
const WIZARD_TOTAL_STEPS = 5;
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
 * Populates the Source Project dropdown for creating a Revision / Option from an existing saved project
 */
function populateWizardSourceProjectsDropdown(preferredProjId = null) {
  const sel = document.getElementById("wizSourceProjectSelect");
  if (!sel) return;
  const prevVal = preferredProjId || sel.value || "";
  const list = (typeof StorageService !== "undefined" && typeof StorageService.getAvailableProjectsForCloning === "function")
    ? StorageService.getAvailableProjectsForCloning()
    : [];

  let html = `<option value="">-- Select Former Saved Project --</option>`;
  list.forEach(p => {
    const jobTag = p.jobNumber ? ` [${escapeHTML(p.jobNumber)}]` : "";
    const activeTag = p.isActive ? " ★ Active" : "";
    html += `<option value="${escapeHTML(p.id)}">${escapeHTML(p.name)}${jobTag} (${p.itemCount || 0} items)${activeTag}</option>`;
  });
  sel.innerHTML = html;

  if (prevVal && list.some(p => p.id === prevVal)) {
    sel.value = prevVal;
  } else if (preferredProjId === "active") {
    const activeProj = list.find(p => p.isActive) || list[0];
    if (activeProj) sel.value = activeProj.id;
  }
}

function buildNextRevisionProjectName(baseName) {
  const clean = String(baseName || "Project").trim();
  const revMatch = clean.match(/^(.*?)\s*-\s*Rev\s*(\d+)$/i);
  if (revMatch) {
    return `${revMatch[1].trim()} - Rev ${parseInt(revMatch[2], 10) + 1}`;
  }
  return `${clean} - Rev 1`;
}

function selectWizardOriginMode(originMode, preferredProjId = null) {
  const cleanOrigin = originMode === "revision" ? "revision" : "blank";
  const hiddenEl = document.getElementById("wizCreateOriginMode");
  if (hiddenEl) hiddenEl.value = cleanOrigin;

  const blankCard = document.getElementById("wizOriginCard-blank");
  const revCard = document.getElementById("wizOriginCard-revision");
  const revRow = document.getElementById("wizRevisionSourceRow");
  const submitBtn = document.getElementById("wizardSubmitBtn");
  const quickBtn = document.getElementById("wizardQuickCreateBtn");

  if (blankCard) {
    blankCard.className = cleanOrigin === "blank"
      ? "text-left p-2.5 rounded-xl border border-emerald-500/60 bg-emerald-950/30 ring-1 ring-emerald-400 transition-all cursor-pointer"
      : "text-left p-2.5 rounded-xl border border-slate-800 bg-slate-950/70 hover:border-slate-700 transition-all cursor-pointer";
  }
  if (revCard) {
    revCard.className = cleanOrigin === "revision"
      ? "text-left p-2.5 rounded-xl border border-purple-500/60 bg-purple-500/10 ring-1 ring-purple-500/30 transition-all cursor-pointer"
      : "text-left p-2.5 rounded-xl border border-slate-800 bg-slate-950/70 hover:border-slate-700 transition-all cursor-pointer";
  }
  if (revRow) {
    revRow.classList.toggle("hidden", cleanOrigin !== "revision");
  }
  if (currentWizardMode === "create" && submitBtn) {
    submitBtn.innerHTML = cleanOrigin === "revision"
      ? '<i data-lucide="git-branch-plus" class="w-4 h-4"></i><span>Create Project Revision</span>'
      : '<i data-lucide="rocket" class="w-4 h-4"></i><span>Create Project</span>';
  }
  if (currentWizardMode === "create" && quickBtn) {
    quickBtn.textContent = cleanOrigin === "revision"
      ? "Create Revision Now (Clone Source & Defaults)"
      : "Create Now (Keep Standard Technical Defaults)";
  }

  if (cleanOrigin === "revision") {
    populateWizardSourceProjectsDropdown(preferredProjId || "active");
    const sel = document.getElementById("wizSourceProjectSelect");
    if (sel && sel.value) {
      onWizardSourceProjectSelect(sel.value);
    }
  }
}

function onWizardSourceProjectSelect(projId) {
  const sel = document.getElementById("wizSourceProjectSelect");
  if (sel) sel.classList.remove("border-rose-500", "ring-1", "ring-rose-500");
  if (!projId || typeof StorageService === "undefined" || typeof StorageService.getProjectBundleById !== "function") return;

  const bundle = StorageService.getProjectBundleById(projId);
  if (!bundle) return;

  const srcDefs = bundle.projectDefaults || {};
  const srcName = srcDefs.projectName || srcDefs.metadata?.projectName || "Project";

  wizardDraftState = JSON.parse(JSON.stringify(DEFAULT_PROJECT_STANDARDS));
  wizardDraftState.metadata = Object.assign({}, DEFAULT_PROJECT_STANDARDS.metadata, srcDefs.metadata || {}, {
    projectName: buildNextRevisionProjectName(srcName)
  });
  wizardDraftState.licensing = Object.assign({}, DEFAULT_PROJECT_STANDARDS.licensing, srcDefs.licensing || {});
  wizardDraftState.accessControl = Object.assign({}, DEFAULT_PROJECT_STANDARDS.accessControl, srcDefs.accessControl || {});
  wizardDraftState.vms = Object.assign({}, DEFAULT_PROJECT_STANDARDS.vms, srcDefs.vms || {});
  wizardDraftState.infrastructure = Object.assign({}, DEFAULT_PROJECT_STANDARDS.infrastructure, srcDefs.infrastructure || {});
  wizardDraftState.network = Object.assign({}, DEFAULT_PROJECT_STANDARDS.network, srcDefs.network || {});
  if (srcDefs.cabling) {
    wizardDraftState.cabling = Object.assign({}, DEFAULT_PROJECT_STANDARDS.cabling, JSON.parse(JSON.stringify(srcDefs.cabling)));
  }

  populateWizardUIFromState(wizardDraftState);
}

/**
 * Updates Camera Specification Workflow Mode card styling in Step 2
 */
function selectWizardCameraDesignMode(mode) {
  const cleanMode = mode === "specific" ? "specific" : "generic";
  const hiddenEl = document.getElementById("wizCameraDesignMode");
  if (hiddenEl) hiddenEl.value = cleanMode;

  const genCard = document.getElementById("wizCamModeCard-generic");
  const specCard = document.getElementById("wizCamModeCard-specific");
  if (genCard) {
    genCard.className = cleanMode === "generic"
      ? "text-left p-2.5 rounded-xl border border-emerald-500/60 bg-emerald-950/30 ring-1 ring-emerald-400 transition-all cursor-pointer"
      : "text-left p-2.5 rounded-xl border border-slate-800 bg-slate-950/70 hover:border-slate-700 transition-all cursor-pointer";
  }
  if (specCard) {
    specCard.className = cleanMode === "specific"
      ? "text-left p-2.5 rounded-xl border border-sky-500/60 bg-sky-950/30 ring-1 ring-sky-500/30 transition-all cursor-pointer"
      : "text-left p-2.5 rounded-xl border border-slate-800 bg-slate-950/70 hover:border-slate-700 transition-all cursor-pointer";
  }
}

/**
 * Dynamically populates Door Controller Architecture options & callout based on selected ACS Host Software
 */
function updateWizardAcsControllerOptions(engine, desiredVal = null) {
  const ctrlEl = document.getElementById("wizAcsControllerVendor");
  if (!ctrlEl) return;
  const prevVal = desiredVal !== null ? desiredVal : (ctrlEl.value || "mercury");
  const compatible = getCompatibleAcsControllersForHost(engine);

  ctrlEl.innerHTML = compatible.map(o => `<option value="${o.value}">${o.label}</option>`).join("");
  if (compatible.some(o => o.value === prevVal)) {
    ctrlEl.value = prevVal;
  } else {
    ctrlEl.value = compatible[0].value;
  }
  onWizardAcsControllerChange(ctrlEl.value);
}

function onWizardAcsControllerChange(controllerVal) {
  const hintEl = document.getElementById("wizAcsArchitectureHint");
  if (!hintEl) return;
  const engine = document.getElementById("wizAcsEngine")?.value || "Genetec";
  const compatible = getCompatibleAcsControllersForHost(engine);
  const selected = compatible.find(o => o.value === controllerVal) || compatible[0];
  if (selected && selected.hintHtml) {
    hintEl.innerHTML = selected.hintHtml;
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
 * Refreshes the Step 2 Video/VMS/Servers/Licensing summary badge & sub-section dimming from Step 1 independent scope toggles
 */
function refreshWizardVmsStep2Badge() {
  const vmsEnabled = document.getElementById("wizVmsToggle") ? document.getElementById("wizVmsToggle").checked : true;
  const serversInScope = document.getElementById("wizServersToggle") ? document.getElementById("wizServersToggle").checked : true;
  const licensingInScope = document.getElementById("wizLicensingToggle") ? document.getElementById("wizLicensingToggle").checked : true;

  const container = document.getElementById("wizVmsConfigContainer");
  const camWrap = document.getElementById("wizCameraWorkflowWrapper");
  const brandWrap = document.getElementById("wizCameraBrandsWrapper");
  const stRow = document.getElementById("wizVmsStorageRow");
  const edWrap = document.getElementById("wizVmsEditionWrapper");

  const anyVideoOrHeadEnd = vmsEnabled || serversInScope || licensingInScope;
  if (container) {
    container.classList.toggle("opacity-40", !anyVideoOrHeadEnd);
    container.classList.toggle("pointer-events-none", !anyVideoOrHeadEnd);
  }
  if (camWrap) camWrap.classList.toggle("opacity-50", !vmsEnabled);
  if (brandWrap) brandWrap.classList.toggle("opacity-50", !vmsEnabled);
  if (stRow) stRow.classList.toggle("opacity-50", !serversInScope);
  if (edWrap) edWrap.classList.toggle("opacity-50", !licensingInScope);

  const step2Badge = document.getElementById("wizVmsStep2Badge");
  if (!step2Badge) return;

  const activeParts = [];
  if (vmsEnabled) activeParts.push("CAMERAS");
  if (serversInScope) activeParts.push("SERVERS");
  if (licensingInScope) activeParts.push("LICENSING");

  if (activeParts.length === 0) {
    step2Badge.textContent = "EXCLUDED / OUT OF SCOPE";
    step2Badge.className = "text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700";
  } else if (activeParts.length === 3) {
    step2Badge.textContent = "CAMERAS + SERVERS + LICENSING";
    step2Badge.className = "text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30";
  } else {
    step2Badge.textContent = `${activeParts.join(" + ")} IN SCOPE`;
    step2Badge.className = "text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/30";
  }
}

/**
 * Backward-compatible alias that updates both Servers/Workstations and Software Licensing scopes
 */
function toggleWizardVmsHeadEndUI(headEndInScope) {
  const srvToggle = document.getElementById("wizServersToggle");
  const licToggle = document.getElementById("wizLicensingToggle");
  if (srvToggle) srvToggle.checked = headEndInScope;
  if (licToggle) licToggle.checked = headEndInScope;
  toggleServersScope(headEndInScope);
  toggleLicensingScope(headEndInScope);
}

/**
 * Convenience entry point for opening New Project Wizard in Blank or Revision mode
 */
function openNewProjectWizardModal(originMode = "blank", sourceProjId = null) {
  const revModal = document.getElementById("revisionModal");
  if (revModal) revModal.classList.add("hidden");
  openProjectWizardModal("create", { originMode, sourceProjId });
}

/**
 * Opens the Project Wizard modal in 'create' (blank or revision project) or 'edit' (active project defaults) mode
 */
function openProjectWizardModal(mode = "create", options = {}) {
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
    wizardDraftState.infrastructure = Object.assign({}, DEFAULT_PROJECT_STANDARDS.infrastructure, existing?.infrastructure || {});
    wizardDraftState.network = Object.assign({}, DEFAULT_PROJECT_STANDARDS.network, existing?.network || {});
  } else {
    wizardDraftState = JSON.parse(JSON.stringify(DEFAULT_PROJECT_STANDARDS));
    wizardDraftState.metadata.projectName = "New Security Design";
  }

  // Update Header UI elements & Start Mode Row
  const titleEl = document.getElementById("wizardModalTitle");
  const subTitleEl = document.getElementById("wizardModalSubtitle");
  const submitBtn = document.getElementById("wizardSubmitBtn");
  const originRow = document.getElementById("wizCreateOriginRow");
  const accordion = document.getElementById("wizDeviceCablingAccordion");
  if (accordion) accordion.open = false;
  if (originRow) originRow.classList.toggle("hidden", mode !== "create");

  if (titleEl) {
    titleEl.textContent = mode === "create" ? "Create New Project — Scope & Technical Defaults" : "Project Scope & Technical Defaults";
  }
  if (subTitleEl) {
    subTitleEl.textContent = mode === "create"
      ? "Configure Orion scope of work, video/VMS, access control, switching, DOR, optics sourcing, and cabling defaults."
      : "Review or update project-wide scope of work, security platforms, optics sourcing, and cabling standards.";
  }
  if (submitBtn) {
    submitBtn.innerHTML = mode === "create"
      ? '<i data-lucide="rocket" class="w-4 h-4"></i><span>Create Project</span>'
      : '<i data-lucide="save" class="w-4 h-4"></i><span>Save Project Defaults</span>';
  }

  populateWizardUIFromState(wizardDraftState);
  if (mode === "create") {
    const startOrigin = options?.originMode === "revision" ? "revision" : "blank";
    populateWizardSourceProjectsDropdown(options?.sourceProjId || null);
    selectWizardOriginMode(startOrigin, options?.sourceProjId || null);
  }
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

function validateWizardStep1Inputs() {
  if (currentWizardMode === "create" && document.getElementById("wizCreateOriginMode")?.value === "revision") {
    const srcSel = document.getElementById("wizSourceProjectSelect");
    if (srcSel && !srcSel.value) {
      srcSel.classList.add("border-rose-500", "ring-1", "ring-rose-500");
      srcSel.focus();
      if (typeof showToast === "function") showToast("Please select a former project to branch this revision from.", "warning");
      return false;
    } else if (srcSel) {
      srcSel.classList.remove("border-rose-500", "ring-1", "ring-rose-500");
    }
  }
  const nameInput = document.getElementById("wizProjectName");
  const nameVal = nameInput ? nameInput.value.trim() : "";
  if (!nameVal) {
    if (nameInput) {
      nameInput.classList.add("border-rose-500", "ring-1", "ring-rose-500");
      nameInput.focus();
    }
    if (typeof showToast === "function") showToast("Please enter a project name.", "warning");
    return false;
  } else if (nameInput) {
    nameInput.classList.remove("border-rose-500", "ring-1", "ring-rose-500");
  }
  return true;
}

/**
 * Transitions between wizard steps (1, 2, 3, 4, or 5)
 */
function setProjectWizardStep(step, skipSync = false) {
  // Validate step 1 before proceeding forward
  if (step > 1 && currentWizardStep === 1) {
    if (!validateWizardStep1Inputs()) return;
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
    quickBtn.classList.toggle("hidden", currentWizardMode !== "create" || currentWizardStep === WIZARD_TOTAL_STEPS);
  }
  if (backBtn) {
    backBtn.classList.toggle("hidden", currentWizardStep === 1);
  }
  if (nextBtn) {
    nextBtn.classList.toggle("hidden", currentWizardStep === WIZARD_TOTAL_STEPS);
    if (currentWizardStep === 1) {
      nextBtn.innerHTML = '<span>Next: Video &amp; VMS</span><i data-lucide="arrow-right" class="w-4 h-4"></i>';
    } else if (currentWizardStep === 2) {
      nextBtn.innerHTML = '<span>Next: Access Control</span><i data-lucide="arrow-right" class="w-4 h-4"></i>';
    } else if (currentWizardStep === 3) {
      nextBtn.innerHTML = '<span>Next: Switching &amp; VLANs</span><i data-lucide="arrow-right" class="w-4 h-4"></i>';
    } else if (currentWizardStep === 4) {
      nextBtn.innerHTML = '<span>Next: Cabling Standards</span><i data-lucide="arrow-right" class="w-4 h-4"></i>';
    }
  }
  if (submitBtn) {
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

  // Step 1: Project Identity
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

  // Step 1: 7 Independent Scope Toggles
  const legacyHeadEnd = state.vms?.headEndInScope !== false;
  const isVmsEnabled = state.vms?.enabled !== false;
  const isServersInScope = (state.vms?.serversInScope ?? legacyHeadEnd) !== false;
  const isLicensingInScope = (state.vms?.licensingInScope ?? legacyHeadEnd) !== false;
  const isAcsEnabled = state.accessControl?.enabled !== false;
  const net = state.network || DEFAULT_PROJECT_STANDARDS.network;
  const isNetSwitchesInScope = net.switchesInScope !== false;
  const infra = state.infrastructure || DEFAULT_PROJECT_STANDARDS.infrastructure;
  const isRacksInScope = infra.racksInScope !== false;
  const isPowerInScope = infra.powerInScope !== false;

  const vmsToggle = document.getElementById("wizVmsToggle");
  if (vmsToggle) vmsToggle.checked = isVmsEnabled;
  toggleVmsScope(isVmsEnabled);

  const srvToggle = document.getElementById("wizServersToggle");
  if (srvToggle) srvToggle.checked = isServersInScope;
  toggleServersScope(isServersInScope);

  const licToggle = document.getElementById("wizLicensingToggle");
  if (licToggle) licToggle.checked = isLicensingInScope;
  toggleLicensingScope(isLicensingInScope);

  const acsToggle = document.getElementById("wizAcsToggle");
  if (acsToggle) acsToggle.checked = isAcsEnabled;
  toggleAcsScope(isAcsEnabled);

  const netSwToggle = document.getElementById("wizNetworkSwitchesToggle");
  if (netSwToggle) netSwToggle.checked = isNetSwitchesInScope;
  toggleNetSwitchesScope(isNetSwitchesInScope);

  const racksToggle = document.getElementById("wizRacksToggle");
  if (racksToggle) racksToggle.checked = isRacksInScope;
  toggleRacksScope(isRacksInScope);

  const powerToggle = document.getElementById("wizPowerToggle");
  if (powerToggle) powerToggle.checked = isPowerInScope;
  togglePowerScope(isPowerInScope);

  // Step 2: Video Surveillance, VMS & Licensing Term
  selectWizardCameraDesignMode(state.vms?.cameraDesignMode || "generic");

  const termEl = document.getElementById("wizLicensingTerm");
  if (termEl) termEl.value = state.licensing?.globalSelectedTerm || "1YR";

  const vmsPlatformVal = state.vms?.platform || "Genetec";
  const vmsPlatform = document.getElementById("wizVmsPlatform");
  if (vmsPlatform) vmsPlatform.value = vmsPlatformVal;
  updateWizardVmsTierOptions(vmsPlatformVal, state.vms?.editionTier || "auto");

  const vmsRetention = document.getElementById("wizVmsRetention");
  if (vmsRetention) vmsRetention.value = String(state.vms?.retentionDays || 30);

  const vmsFailover = document.getElementById("wizVmsFailover");
  if (vmsFailover) vmsFailover.value = state.vms?.failoverMode || "none";

  const vmsAnalytics = document.getElementById("wizVmsPromptAnalytics");
  if (vmsAnalytics) vmsAnalytics.checked = state.vms?.promptAnalytics !== false;

  const vendors = Array.isArray(state.vms?.cameraVendors) ? state.vms.cameraVendors.map(canonicalWizardCameraVendorName) : [];
  ["Axis Communications", "Hanwha Vision", "Avigilon", "Bosch"].forEach(v => {
    const el = document.getElementById(`wizCamVendor-${v.replace(/\s+/g, '')}`);
    if (el) el.checked = vendors.includes(v);
  });

  // Step 3: Dedicated Access Control & Host-Driven Controller Architecture
  const acsEngineVal = state.accessControl?.engine || "Genetec";
  const acsEngine = document.getElementById("wizAcsEngine");
  if (acsEngine) acsEngine.value = acsEngineVal;
  updateWizardAcsControllerOptions(acsEngineVal, state.accessControl?.controllerVendor || "mercury");

  const acsReader = document.getElementById("wizAcsReaderProto");
  if (acsReader) acsReader.value = state.accessControl?.readerProtocol || "osdp";

  // Step 4: Active Network Switching, PoE Buffer & VLANs
  const poeHrEl = document.getElementById("wizPoeHeadroom");
  if (poeHrEl) poeHrEl.value = String(net.poeHeadroomPercent || 20);

  const prefSwVendors = Array.isArray(net.preferredSwitchVendors) ? net.preferredSwitchVendors : [];
  WIZARD_SWITCH_VENDORS.forEach(sv => {
    const swEl = document.getElementById(`wizSwVendor-${sv.replace(/\s+/g, '')}`);
    if (swEl) swEl.checked = prefSwVendors.includes(sv);
  });

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

  // Step 1 DOR & Step 5 Cabling Standards (Baseline + Per-Subsystem Overrides)
  const cabling = state.cabling || {};
  const stds = cabling.standards || {};
  const byDev = stds.byDeviceType || {};

  const defRunColor = stds.defaultRunColor || "Yellow";
  const defPatchColor = stds.defaultPatchColor || "Yellow";
  const defRunCat = stds.defaultRunCategory || (cabling.horizontalCategories?.[0] || "C6A-CMP-1K-YL");
  const defPatchLen = parseFloat(stds.defaultPatchLength ?? cabling.patchCordLength ?? 0.5) || 0.5;

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
  setSelectValueWithFallback(patchLenEl, defPatchLen);

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

  // Per-Subsystem Cabling Controls: inherit Baseline unless explicitly overridden
  wizardSubsystemCableOverrides = {};
  CABLE_DEVICE_TYPES.forEach(dt => {
    const devConf = byDev[dt.id] || {};
    const savedOv = (devConf && typeof devConf.overriddenFields === "object" && devConf.overriddenFields) ? devConf.overriddenFields : null;

    const ovRunCol = savedOv ? Boolean(savedOv.runColor) : Boolean(devConf.runColor && devConf.runColor !== defRunColor);
    const ovRunCat = savedOv ? Boolean(savedOv.runCategory) : Boolean(devConf.runCategory && devConf.runCategory !== defRunCat);
    const ovPatchCol = savedOv ? Boolean(savedOv.patchColor) : Boolean(devConf.patchColor && devConf.patchColor !== defPatchColor);
    const ovPatchLen = savedOv ? Boolean(savedOv.patchLength) : Boolean(devConf.patchLength !== undefined && Math.abs(parseFloat(devConf.patchLength) - defPatchLen) > 0.001);

    wizardSubsystemCableOverrides[dt.id] = {
      runColor: ovRunCol,
      runCategory: ovRunCat,
      patchColor: ovPatchCol,
      patchLength: ovPatchLen
    };

    const runCol = ovRunCol ? (devConf.runColor || defRunColor) : defRunColor;
    const runCat = ovRunCat ? (devConf.runCategory || defRunCat) : defRunCat;
    const patchCol = ovPatchCol ? (devConf.patchColor || defPatchColor) : defPatchColor;
    const patchLen = ovPatchLen ? (parseFloat(devConf.patchLength) || defPatchLen) : defPatchLen;
    const patchType = devConf.patchType || "slim";

    setSelectValueWithFallback(document.getElementById(`wizCableRunColor-${dt.id}`), runCol);
    updateCableColorPreviewDot(`wizCableRunDot-${dt.id}`, runCol);
    setSelectValueWithFallback(document.getElementById(`wizCableRunCategory-${dt.id}`), runCat);
    setSelectValueWithFallback(document.getElementById(`wizCablePatchColor-${dt.id}`), patchCol);
    updateCableColorPreviewDot(`wizCablePatchDot-${dt.id}`, patchCol);
    setSelectValueWithFallback(document.getElementById(`wizCablePatchLength-${dt.id}`), patchLen);

    const pTypeEl = document.getElementById(`wizCablePatchType-${dt.id}`);
    if (pTypeEl) pTypeEl.value = patchType;
  });

  refreshSubsystemCableOverrideBadges();
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
  const srvToggle = document.getElementById("wizServersToggle");
  const licToggle = document.getElementById("wizLicensingToggle");
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

  const serversInScope = srvToggle ? srvToggle.checked : true;
  const licensingInScope = licToggle ? licToggle.checked : true;

  wizardDraftState.vms = {
    enabled: vmsToggle ? vmsToggle.checked : true,
    cameraDesignMode: camModeEl?.value === "specific" ? "specific" : "generic",
    platform: vmsPlatform ? vmsPlatform.value : "Genetec",
    editionTier: vmsTier ? vmsTier.value : "auto",
    failoverMode: vmsFailover ? vmsFailover.value : "none",
    cameraVendors: checkedCamVendors.length > 0 ? checkedCamVendors : ["Axis Communications", "Hanwha Vision"],
    retentionDays: vmsRetention ? (parseInt(vmsRetention.value, 10) || 30) : 30,
    promptAnalytics: vmsAnalytics ? vmsAnalytics.checked : true,
    serversInScope,
    licensingInScope,
    headEndInScope: serversInScope || licensingInScope
  };

  wizardDraftState.infrastructure = {
    racksInScope: document.getElementById("wizRacksToggle") ? document.getElementById("wizRacksToggle").checked : true,
    powerInScope: document.getElementById("wizPowerToggle") ? document.getElementById("wizPowerToggle").checked : true
  };

  // Cabling & Standards (Baseline Inheritance + Per-Subsystem Overrides)
  const defRunCol = document.getElementById("wizDefaultRunColor")?.value || "Yellow";
  const defPatchCol = document.getElementById("wizDefaultPatchColor")?.value || "Yellow";
  const defRunCat = document.getElementById("wizDefaultRunCategory")?.value || "C6A-CMP-1K-YL";
  const compEl = document.getElementById("wizCompositeCable");
  const termMethodEl = document.getElementById("wizRackTermination");
  const patchLenEl = document.getElementById("wizPatchLength");
  const defPatchLen = patchLenEl ? (parseFloat(patchLenEl.value) || 0.5) : 0.5;
  const fiberEl = document.getElementById("wizFiberType");

  const byDeviceType = {};
  CABLE_DEVICE_TYPES.forEach(dt => {
    const ov = wizardSubsystemCableOverrides[dt.id] || {};
    const rCol = ov.runColor ? (document.getElementById(`wizCableRunColor-${dt.id}`)?.value || defRunCol) : defRunCol;
    const rCat = ov.runCategory ? (document.getElementById(`wizCableRunCategory-${dt.id}`)?.value || defRunCat) : defRunCat;
    const pCol = ov.patchColor ? (document.getElementById(`wizCablePatchColor-${dt.id}`)?.value || defPatchCol) : defPatchCol;
    const pLen = ov.patchLength ? (parseFloat(document.getElementById(`wizCablePatchLength-${dt.id}`)?.value) || defPatchLen) : defPatchLen;
    const pType = document.getElementById(`wizCablePatchType-${dt.id}`)?.value || "slim";

    byDeviceType[dt.id] = {
      label: dt.label,
      runColor: rCol,
      runCategory: rCat,
      patchColor: pCol,
      patchLength: pLen,
      patchType: pType,
      overriddenFields: {
        runColor: Boolean(ov.runColor),
        runCategory: Boolean(ov.runCategory),
        patchColor: Boolean(ov.patchColor),
        patchLength: Boolean(ov.patchLength)
      }
    };
  });

  wizardDraftState.cabling = {
    horizontalCategories: [defRunCat],
    compositeType: compEl ? compEl.value : "AC-COMP-CMP-500",
    rackTermination: termMethodEl ? termMethodEl.value : "patch_panels",
    patchCordLength: defPatchLen,
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
      defaultPatchLength: defPatchLen,
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

function setScopeBadgeAppearance(badgeEl, enabled, inLabel = "IN SCOPE", outLabel = "EXCLUDED") {
  if (!badgeEl) return;
  badgeEl.textContent = enabled ? inLabel : outLabel;
  badgeEl.className = enabled
    ? "text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
    : "text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700";
}

/**
 * 7 Completely Independent Step 1 Scope Toggles (No cross-greying between Step 1 scope cards!)
 */
function toggleVmsScope(enabled) {
  setScopeBadgeAppearance(document.getElementById("wizVmsScopeBadge"), enabled, "IN SCOPE", "EXCLUDED");
  refreshWizardVmsStep2Badge();
}

function toggleServersScope(enabled) {
  setScopeBadgeAppearance(document.getElementById("wizServersScopeBadge"), enabled, "IN SCOPE", "EXCLUDED");
  refreshWizardVmsStep2Badge();
}

function toggleLicensingScope(enabled) {
  setScopeBadgeAppearance(document.getElementById("wizLicensingScopeBadge"), enabled, "IN SCOPE", "EXCLUDED");
  const licCard = document.getElementById("wizLicensingConfigCard");
  const licStep2Badge = document.getElementById("wizLicStep2Badge");
  if (licCard) {
    licCard.classList.toggle("opacity-50", !enabled);
  }
  if (licStep2Badge) {
    licStep2Badge.textContent = enabled ? "LICENSING IN SCOPE" : "LICENSING EXCLUDED";
    licStep2Badge.className = enabled
      ? "text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
      : "text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700";
  }
  refreshWizardVmsStep2Badge();
}

function toggleAcsScope(enabled) {
  const container = document.getElementById("wizAcsConfigContainer");
  setScopeBadgeAppearance(document.getElementById("wizAcsScopeBadge"), enabled, "IN SCOPE", "EXCLUDED");
  const step3Badge = document.getElementById("wizAcsStep3Badge");
  if (container) {
    container.classList.toggle("opacity-40", !enabled);
    container.classList.toggle("pointer-events-none", !enabled);
  }
  if (step3Badge) {
    step3Badge.textContent = enabled ? "IN SCOPE" : "EXCLUDED / OUT OF SCOPE";
    step3Badge.className = enabled
      ? "text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
      : "text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700";
  }
}

function toggleNetSwitchesScope(enabled) {
  const container = document.getElementById("wizNetConfigContainer");
  setScopeBadgeAppearance(document.getElementById("wizNetScopeBadge"), enabled, "IN SCOPE", "CUSTOMER IT");
  const step4Badge = document.getElementById("wizNetStep4Badge");
  if (container) {
    container.classList.toggle("opacity-40", !enabled);
    container.classList.toggle("pointer-events-none", !enabled);
  }
  if (step4Badge) {
    step4Badge.textContent = enabled ? "ORION SWITCHES IN SCOPE" : "CUSTOMER IT / OFE";
    step4Badge.className = enabled
      ? "text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
      : "text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700";
  }
}

function toggleRacksScope(enabled) {
  setScopeBadgeAppearance(document.getElementById("wizRacksScopeBadge"), enabled, "IN SCOPE", "EXCLUDED");
}

function togglePowerScope(enabled) {
  setScopeBadgeAppearance(document.getElementById("wizPowerScopeBadge"), enabled, "IN SCOPE", "EXCLUDED");
}

/**
 * Quick create project directly from Step 1 with defaults
 */
function quickCreateProjectWithDefaults() {
  if (!validateWizardStep1Inputs()) return;
  updateWizardStateFromUI();
  executeWizardSubmission();
}

/**
 * Submits the completed wizard form
 */
function submitProjectWizard() {
  if (!validateWizardStep1Inputs()) return;
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
    const originMode = document.getElementById("wizCreateOriginMode")?.value || "blank";
    const sourceProjId = document.getElementById("wizSourceProjectSelect")?.value || "";
    const baselineCode = (document.getElementById("wizRevisionBaselineCode")?.value || "Rev 0").trim() || "Rev 0";

    if (typeof StorageService !== "undefined") {
      if (originMode === "revision" && sourceProjId && typeof StorageService.createProjectRevisionFromSource === "function") {
        StorageService.createProjectRevisionFromSource(sourceProjId, defaults, baselineCode);
      } else {
        StorageService.createNewBlankProject(defaults);
      }
    }
    closeProjectWizardModal();
    const projModal = document.getElementById("projectModal");
    if (projModal && !projModal.classList.contains("hidden")) {
      projModal.classList.add("hidden");
    }
  } else {
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
  const legacyHeadEnd = defaults.vms?.headEndInScope !== false;
  const serversInScope = (defaults.vms?.serversInScope ?? legacyHeadEnd) !== false;
  const licensingInScope = (defaults.vms?.licensingInScope ?? legacyHeadEnd) !== false;
  const netSwitchesInScope = defaults.network?.switchesInScope !== false;
  const racksInScope = defaults.infrastructure?.racksInScope !== false;
  const powerInScope = defaults.infrastructure?.powerInScope !== false;

  const netDomainBtn = document.getElementById("domain-tab-networking");
  if (netDomainBtn) {
    netDomainBtn.classList.toggle("opacity-40", !netSwitchesInScope);
    netDomainBtn.title = netSwitchesInScope ? "Networking & Switching" : "Networking (Customer-Furnished / Out of Scope in Project Defaults)";
  }

  const infraDomainBtn = document.getElementById("domain-tab-infrastructure");
  if (infraDomainBtn) {
    infraDomainBtn.classList.toggle("opacity-40", !racksInScope && !powerInScope);
    infraDomainBtn.title = (!racksInScope && !powerInScope)
      ? "Racks & Power (Marked Out of Scope in Project Defaults)"
      : "Infrastructure, Racks & Power";
  }

  const srvNavBtn = document.getElementById("nav-servers");
  if (srvNavBtn) {
    srvNavBtn.classList.toggle("opacity-30", !serversInScope);
    srvNavBtn.title = serversInScope ? "Servers & Workstations" : "Servers / Workstations (Marked Out of Scope in Project Defaults)";
  }
  const licNavBtn = document.getElementById("nav-vms_software");
  if (licNavBtn) {
    licNavBtn.classList.toggle("opacity-30", !licensingInScope);
    licNavBtn.title = licensingInScope ? "VMS & Software Licensing" : "Software Licensing (Marked Out of Scope in Project Defaults)";
  }
  const racksNavBtn = document.getElementById("nav-racks");
  if (racksNavBtn) {
    racksNavBtn.classList.toggle("opacity-30", !racksInScope);
    racksNavBtn.title = racksInScope ? "Racks & Enclosures" : "Racks & Enclosures (Marked Out of Scope in Project Defaults)";
  }
  const powerNavBtn = document.getElementById("nav-ups_pdu");
  if (powerNavBtn) {
    powerNavBtn.classList.toggle("opacity-30", !powerInScope);
    powerNavBtn.title = powerInScope ? "UPS & Rack Power" : "Rack Power / UPS & PDUs (Marked Out of Scope in Project Defaults)";
  }

  // Domain Nav Styling
  const physDomainBtn = document.getElementById("domain-tab-physical_security");
  if (physDomainBtn) {
    if (!acsEnabled && !vmsEnabled && !serversInScope && !licensingInScope) {
      physDomainBtn.classList.add("opacity-40");
      physDomainBtn.title = "Physical Security (All security scopes marked Out of Scope)";
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
        } else if (m.id === "servers") {
          btn.classList.toggle("opacity-30", !serversInScope);
        } else if (m.id === "vms_software") {
          btn.classList.toggle("opacity-30", !licensingInScope);
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
  const infra = defaults.infrastructure || DEFAULT_PROJECT_STANDARDS.infrastructure;
  const cabling = defaults.cabling || {};
  const lic = defaults.licensing || {};
  const net = defaults.network || DEFAULT_PROJECT_STANDARDS.network;

  const legacyHeadEnd = vms.headEndInScope !== false;
  const serversInScope = (vms.serversInScope ?? legacyHeadEnd) !== false;
  const licensingInScope = (vms.licensingInScope ?? legacyHeadEnd) !== false;
  const racksInScope = infra.racksInScope !== false;
  const powerInScope = infra.powerInScope !== false;

  const ctrlLabelMap = {
    mercury: "Mercury LP",
    mercury_mp: "Mercury MP",
    axis_pbg: "Axis PbG",
    axis: "Axis IP",
    scl312: "SCL-312",
    lenel_mercury: "Lenel X-Series",
    swh_istar: "iSTAR Ultra G2",
    alta_cloud: "Alta Cloud ACU"
  };
  const ctrlShort = ctrlLabelMap[acs.controllerVendor || "mercury"] || "Mercury LP";
  const acsBadge = acs.enabled !== false
    ? `<span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">ACS: ${escapeHTML(acs.engine || "Genetec")} • ${escapeHTML(ctrlShort)} (${escapeHTML(acs.readerProtocol?.toUpperCase() || "OSDP")})</span>`
    : `<span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-800 text-slate-500 border border-slate-700">ACS: Excluded</span>`;

  const poeHr = net.poeHeadroomPercent || 20;
  const swVendorSuffix = (Array.isArray(net.preferredSwitchVendors) && net.preferredSwitchVendors.length > 0)
    ? ` • ${net.preferredSwitchVendors.join("/")}`
    : "";
  const netScopeBadge = net.switchesInScope === false
    ? `<span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">Switches: Customer/OFE</span>`
    : `<span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">Switches: Orion (+${poeHr}% PoE${escapeHTML(swVendorSuffix)})</span>`;

  const camModeBadge = vms.enabled !== false
    ? `<span class="px-2 py-0.5 rounded-md text-[10px] font-semibold ${vms.cameraDesignMode === 'specific' ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30' : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'}">Cams: ${vms.cameraDesignMode === 'specific' ? 'Full Engineering' : 'Initial/Quick'}</span>`
    : `<span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-800 text-slate-500 border border-slate-700">Cams: Excluded</span>`;

  const tierLabel = vms.editionTier && vms.editionTier !== "auto" ? ` [${vms.editionTier.replace(/_/g, ' ').toUpperCase()}]` : "";
  const failoverSuffix = vms.failoverMode && vms.failoverMode !== "none" ? ` • ${vms.failoverMode === 'dedicated' ? 'N+1 Failover' : 'Ring Failover'}` : "";
  const vmsBadge = (vms.enabled !== false || serversInScope || licensingInScope)
    ? `<span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/30">VMS: ${escapeHTML(vms.platform || "Genetec")}${escapeHTML(tierLabel)}</span>`
    : `<span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-800 text-slate-500 border border-slate-700">VMS: None</span>`;

  const serversBadge = serversInScope
    ? `<span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">Servers/WS: In Scope (${vms.retentionDays || 30}D${escapeHTML(failoverSuffix)})</span>`
    : `<span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">Servers/WS: Excluded</span>`;

  const licensingBadge = licensingInScope
    ? `<span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/30">Licensing: In Scope (${escapeHTML(lic.globalSelectedTerm || "1YR")})</span>`
    : `<span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">Licensing: Excluded</span>`;

  const rackPowerBadge = `<span class="px-2 py-0.5 rounded-md text-[10px] font-semibold ${(racksInScope || powerInScope) ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700'}">Racks: ${racksInScope ? 'Yes' : 'OFE'} • Power: ${powerInScope ? 'Yes' : 'OFE'}</span>`;

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
      ${serversBadge}
      ${licensingBadge}
      ${acsBadge}
      ${netScopeBadge}
      ${rackPowerBadge}
      ${cableBadge}
      ${scopeBadge}
      ${opticsBadge}
      ${fiberBadge}
      ${vlanBadge}
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
window.ACS_HOST_CONTROLLER_MATRIX = ACS_HOST_CONTROLLER_MATRIX;
window.getCompatibleAcsControllersForHost = getCompatibleAcsControllersForHost;
window.DEFAULT_PROJECT_STANDARDS = DEFAULT_PROJECT_STANDARDS;
window.getDeviceCablingKey = getDeviceCablingKey;
window.getProjectCablingStandard = getProjectCablingStandard;
window.getProjectVlanDetailsForDevice = getProjectVlanDetailsForDevice;
window.getProjectVlanForDevice = getProjectVlanForDevice;
window.toggleWizardVlanConfigUI = toggleWizardVlanConfigUI;
window.applyDefaultCableColorToAll = applyDefaultCableColorToAll;
window.onBaselineCableStandardChange = onBaselineCableStandardChange;
window.onSubsystemCableOverrideChange = onSubsystemCableOverrideChange;
window.resetSubsystemCablingToBaseline = resetSubsystemCablingToBaseline;
window.resetAllSubsystemCablingToBaseline = resetAllSubsystemCablingToBaseline;
window.updateCableColorPreviewDot = updateCableColorPreviewDot;
window.openNewProjectWizardModal = openNewProjectWizardModal;
window.openProjectWizardModal = openProjectWizardModal;
window.closeProjectWizardModal = closeProjectWizardModal;
window.setProjectWizardStep = setProjectWizardStep;
window.selectWizardOriginMode = selectWizardOriginMode;
window.populateWizardSourceProjectsDropdown = populateWizardSourceProjectsDropdown;
window.onWizardSourceProjectSelect = onWizardSourceProjectSelect;
window.toggleAcsScope = toggleAcsScope;
window.toggleVmsScope = toggleVmsScope;
window.toggleServersScope = toggleServersScope;
window.toggleLicensingScope = toggleLicensingScope;
window.toggleRacksScope = toggleRacksScope;
window.togglePowerScope = togglePowerScope;
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
window.updateWizardAcsControllerOptions = updateWizardAcsControllerOptions;
window.onWizardAcsControllerChange = onWizardAcsControllerChange;
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
  if (typeof syncAllOpticsAndScopeUI === "function") syncAllOpticsAndScopeUI();
  if (typeof reconcileBOMForInfrastructureScope === "function") reconcileBOMForInfrastructureScope(true);
  if (typeof updateProjectHealthUI === "function") updateProjectHealthUI();
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

    const compatible = getCompatibleAcsControllersForHost(defs.accessControl.engine);
    const matchedCtrl = compatible.find(c => c.value === defs.accessControl.controllerVendor) || compatible[0];
    const ctrlVendor = matchedCtrl?.doorBuilderVendor || "mercury";
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
