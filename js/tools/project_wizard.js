// =========================================================================
// PROJECT CREATION & DEFAULTS WIZARD (NetSelect Enterprise v0.10.0-alpha)
// Multi-Step Technical Standards, Scope Toggles, Metadata, and Focus Mode
// =========================================================================

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
    readerProtocol: "osdp"
  },
  vms: {
    enabled: true,
    platform: "Milestone XProtect",
    cameraVendors: ["Axis Communications", "Hanwha Vision", "Avigilon"],
    retentionDays: 30,
    promptAnalytics: true
  },
  cabling: {
    horizontalCategories: ["C6A-CMP-1K-BL"],
    compositeType: "AC-COMP-CMP-500",
    rackTermination: "patch_panels",
    patchCordLength: 0.5,
    patchCordColors: {
      security: "Yellow",
      data: "Blue"
    },
    fiberType: "mmf"
  }
};

let currentWizardMode = "create"; // "create" | "edit"
let currentWizardStep = 1;
let wizardDraftState = JSON.parse(JSON.stringify(DEFAULT_PROJECT_STANDARDS));

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
    wizardDraftState = JSON.parse(JSON.stringify(existing));
    wizardDraftState.metadata.projectName = StorageService.getActiveProjectName();
  } else {
    wizardDraftState = JSON.parse(JSON.stringify(DEFAULT_PROJECT_STANDARDS));
    wizardDraftState.metadata.projectName = "New Security Design";
    wizardDraftState.licensing.globalSelectedTerm = typeof globalSelectedTerm !== "undefined" ? globalSelectedTerm : "1YR";
    if (typeof getProjectFiberType === "function") {
      wizardDraftState.cabling.fiberType = getProjectFiberType();
    }
  }

  // Update Header UI elements
  const titleEl = document.getElementById("wizardModalTitle");
  const subTitleEl = document.getElementById("wizardModalSubtitle");
  const submitBtn = document.getElementById("wizardSubmitBtn");
  const quickBtn = document.getElementById("wizardQuickCreateBtn");

  if (titleEl) {
    titleEl.textContent = mode === "create" ? "Create New Project" : "Project Scope & Technical Defaults";
  }
  if (subTitleEl) {
    subTitleEl.textContent = mode === "create"
      ? "Configure technical standards, vendor ecosystems, and proposal metadata for a clean slate design."
      : "Adjust project-wide technical standards, subsystem scope, and proposal metadata.";
  }
  if (submitBtn) {
    submitBtn.innerHTML = mode === "create"
      ? '<i data-lucide="rocket" class="w-4 h-4"></i><span>Create Blank Project</span>'
      : '<i data-lucide="save" class="w-4 h-4"></i><span>Save Project Defaults</span>';
  }
  if (quickBtn) {
    quickBtn.classList.toggle("hidden", mode !== "create");
  }

  populateWizardUIFromState(wizardDraftState);
  setProjectWizardStep(1);

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
 * Transitions between wizard steps (1, 2, or 3)
 */
function setProjectWizardStep(step) {
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
  updateWizardStateFromUI();

  currentWizardStep = Math.max(1, Math.min(3, step));

  // Update step indicators
  for (let i = 1; i <= 3; i++) {
    const pill = document.getElementById(`wizStepPill-${i}`);
    const checkIcon = document.getElementById(`wizStepCheck-${i}`);
    const numBadge = document.getElementById(`wizStepNum-${i}`);
    if (pill) {
      if (i === currentWizardStep) {
        pill.className = "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold bg-brand-600 text-white shadow-md shadow-brand-500/20 border border-brand-400/40 transition-all";
        if (checkIcon) checkIcon.classList.add("hidden");
        if (numBadge) numBadge.classList.remove("hidden");
      } else if (i < currentWizardStep) {
        pill.className = "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 transition-all cursor-pointer";
        if (checkIcon) checkIcon.classList.remove("hidden");
        if (numBadge) numBadge.classList.add("hidden");
      } else {
        pill.className = "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 text-slate-400 border border-slate-800 transition-all cursor-pointer";
        if (checkIcon) checkIcon.classList.add("hidden");
        if (numBadge) numBadge.classList.remove("hidden");
      }
    }

    const panel = document.getElementById(`wizStepContent-${i}`);
    if (panel) {
      panel.classList.toggle("hidden", i !== currentWizardStep);
    }
  }

  // Update navigation buttons
  const backBtn = document.getElementById("wizardBackBtn");
  const nextBtn = document.getElementById("wizardNextBtn");
  const submitBtn = document.getElementById("wizardSubmitBtn");

  if (backBtn) backBtn.classList.toggle("hidden", currentWizardStep === 1);
  if (nextBtn) {
    nextBtn.classList.toggle("hidden", currentWizardStep === 3);
    if (currentWizardStep === 1) {
      nextBtn.innerHTML = '<span>Next: Subsystems & Vendors</span><i data-lucide="arrow-right" class="w-4 h-4"></i>';
    } else if (currentWizardStep === 2) {
      nextBtn.innerHTML = '<span>Next: Cabling & Standards</span><i data-lucide="arrow-right" class="w-4 h-4"></i>';
    }
  }
  if (submitBtn) submitBtn.classList.toggle("hidden", currentWizardStep !== 3);

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

  // Step 1: Project Details
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

  const termEl = document.getElementById("wizLicensingTerm");
  if (termEl) termEl.value = state.licensing?.globalSelectedTerm || "1YR";

  // Step 2: Access Control
  const acsToggle = document.getElementById("wizAcsToggle");
  if (acsToggle) {
    acsToggle.checked = state.accessControl?.enabled !== false;
    toggleAcsScope(acsToggle.checked);
  }
  const acsEngine = document.getElementById("wizAcsEngine");
  if (acsEngine) acsEngine.value = state.accessControl?.engine || "Genetec";

  const acsReader = document.getElementById("wizAcsReaderProto");
  if (acsReader) acsReader.value = state.accessControl?.readerProtocol || "osdp";

  // Step 2: Video Surveillance
  const vmsToggle = document.getElementById("wizVmsToggle");
  if (vmsToggle) {
    vmsToggle.checked = state.vms?.enabled !== false;
    toggleVmsScope(vmsToggle.checked);
  }
  const vmsPlatform = document.getElementById("wizVmsPlatform");
  if (vmsPlatform) vmsPlatform.value = state.vms?.platform || "Milestone XProtect";

  const vmsRetention = document.getElementById("wizVmsRetention");
  if (vmsRetention) vmsRetention.value = String(state.vms?.retentionDays || 30);

  const vmsAnalytics = document.getElementById("wizVmsPromptAnalytics");
  if (vmsAnalytics) vmsAnalytics.checked = state.vms?.promptAnalytics !== false;

  // Camera Vendors Multi-Select
  const vendors = Array.isArray(state.vms?.cameraVendors) ? state.vms.cameraVendors : [];
  ["Axis Communications", "Hanwha Vision", "Avigilon", "Bosch"].forEach(v => {
    const el = document.getElementById(`wizCamVendor-${v.replace(/\s+/g, '')}`);
    if (el) el.checked = vendors.includes(v);
  });

  // Step 3: Cabling & Infrastructure
  const horiz = Array.isArray(state.cabling?.horizontalCategories) ? state.cabling.horizontalCategories : ["C6A-CMP-1K-BL"];
  ["C6A-CMP-1K-BL", "C6A-CMR-1K-BL", "C6-CMP-1K-BL", "C6A-OUTDOOR-1K"].forEach(sku => {
    const el = document.getElementById(`wizHorizCable-${sku}`);
    if (el) el.checked = horiz.includes(sku);
  });

  const compEl = document.getElementById("wizCompositeCable");
  if (compEl) compEl.value = state.cabling?.compositeType || "AC-COMP-CMP-500";

  const termMethodEl = document.getElementById("wizRackTermination");
  if (termMethodEl) termMethodEl.value = state.cabling?.rackTermination || "patch_panels";

  const patchLenEl = document.getElementById("wizPatchLength");
  if (patchLenEl) patchLenEl.value = String(state.cabling?.patchCordLength ?? 0.5);

  const fiberEl = document.getElementById("wizFiberType");
  if (fiberEl) fiberEl.value = state.cabling?.fiberType || "mmf";
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
  const acsReader = document.getElementById("wizAcsReaderProto");

  wizardDraftState.accessControl = {
    enabled: acsToggle ? acsToggle.checked : true,
    engine: acsEngine ? acsEngine.value : "Genetec",
    readerProtocol: acsReader ? acsReader.value : "osdp"
  };

  const vmsToggle = document.getElementById("wizVmsToggle");
  const vmsPlatform = document.getElementById("wizVmsPlatform");
  const vmsRetention = document.getElementById("wizVmsRetention");
  const vmsAnalytics = document.getElementById("wizVmsPromptAnalytics");

  const selectedCamVendors = [];
  ["Axis Communications", "Hanwha Vision", "Avigilon", "Bosch"].forEach(v => {
    const el = document.getElementById(`wizCamVendor-${v.replace(/\s+/g, '')}`);
    if (el && el.checked) selectedCamVendors.push(v);
  });

  wizardDraftState.vms = {
    enabled: vmsToggle ? vmsToggle.checked : true,
    platform: vmsPlatform ? vmsPlatform.value : "Milestone XProtect",
    cameraVendors: selectedCamVendors.length > 0 ? selectedCamVendors : ["Axis Communications", "Hanwha Vision"],
    retentionDays: vmsRetention ? (parseInt(vmsRetention.value, 10) || 30) : 30,
    promptAnalytics: vmsAnalytics ? vmsAnalytics.checked : true
  };

  const selectedHoriz = [];
  ["C6A-CMP-1K-BL", "C6A-CMR-1K-BL", "C6-CMP-1K-BL", "C6A-OUTDOOR-1K"].forEach(sku => {
    const el = document.getElementById(`wizHorizCable-${sku}`);
    if (el && el.checked) selectedHoriz.push(sku);
  });

  const compEl = document.getElementById("wizCompositeCable");
  const termMethodEl = document.getElementById("wizRackTermination");
  const patchLenEl = document.getElementById("wizPatchLength");
  const fiberEl = document.getElementById("wizFiberType");

  wizardDraftState.cabling = {
    horizontalCategories: selectedHoriz.length > 0 ? selectedHoriz : ["C6A-CMP-1K-BL"],
    compositeType: compEl ? compEl.value : "AC-COMP-CMP-500",
    rackTermination: termMethodEl ? termMethodEl.value : "patch_panels",
    patchCordLength: patchLenEl ? parseFloat(patchLenEl.value) : 0.5,
    patchCordColors: {
      security: "Yellow",
      data: "Blue"
    },
    fiberType: fiberEl ? fiberEl.value : "mmf"
  };
}

/**
 * Toggles the ACS sub-panel visibility and inputs
 */
function toggleAcsScope(enabled) {
  const container = document.getElementById("wizAcsConfigContainer");
  const badge = document.getElementById("wizAcsScopeBadge");
  if (container) {
    container.classList.toggle("opacity-40", !enabled);
    container.classList.toggle("pointer-events-none", !enabled);
  }
  if (badge) {
    badge.textContent = enabled ? "IN SCOPE" : "EXCLUDED / NONE";
    badge.className = enabled 
      ? "text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
      : "text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700";
  }
}

/**
 * Toggles the VMS sub-panel visibility and inputs
 */
function toggleVmsScope(enabled) {
  const container = document.getElementById("wizVmsConfigContainer");
  const badge = document.getElementById("wizVmsScopeBadge");
  if (container) {
    container.classList.toggle("opacity-40", !enabled);
    container.classList.toggle("pointer-events-none", !enabled);
  }
  if (badge) {
    badge.textContent = enabled ? "IN SCOPE" : "EXCLUDED / NONE";
    badge.className = enabled 
      ? "text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
      : "text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700";
  }
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
      StorageService.setProjectDefaults(defaults);
      StorageService.saveCurrentProject(false);
    }
    closeProjectWizardModal();
    renderProjectDefaultsSummary();
    if (typeof showToast === "function") {
      showToast(`Updated technical standards for: ${safeName}`);
    }
  }

  // Apply Focus Mode and refresh UI
  applyProjectFocusMode();
  if (typeof renderProjectDefaultsSummary === "function") {
    renderProjectDefaultsSummary();
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

  const acsBadge = acs.enabled !== false
    ? `<span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">ACS: ${escapeHTML(acs.engine || "Genetec")} (${escapeHTML(acs.readerProtocol?.toUpperCase() || "OSDP")})</span>`
    : `<span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-800 text-slate-500 border border-slate-700">ACS: None</span>`;

  const vmsBadge = vms.enabled !== false
    ? `<span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/30">VMS: ${escapeHTML(vms.platform || "Milestone")} (${vms.retentionDays || 30}D)</span>`
    : `<span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-800 text-slate-500 border border-slate-700">VMS: None</span>`;

  const cableBadge = `<span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">Cabling: ${cabling.horizontalCategories?.[0] ? cabling.horizontalCategories[0].slice(0, 10) : 'Cat6A'} (${cabling.rackTermination === 'direct_rj45' ? 'Direct RJ45' : 'Pods'})</span>`;

  const fiberBadge = `<span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">Fiber: ${cabling.fiberType === 'smf' ? 'OS2 Single-Mode' : 'OM4 Multi-Mode'}</span>`;

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
      ${acsBadge}
      ${vmsBadge}
      ${cableBadge}
      ${fiberBadge}
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
window.DEFAULT_PROJECT_STANDARDS = DEFAULT_PROJECT_STANDARDS;
window.openProjectWizardModal = openProjectWizardModal;
window.closeProjectWizardModal = closeProjectWizardModal;
window.setProjectWizardStep = setProjectWizardStep;
window.toggleAcsScope = toggleAcsScope;
window.toggleVmsScope = toggleVmsScope;
window.quickCreateProjectWithDefaults = quickCreateProjectWithDefaults;
window.submitProjectWizard = submitProjectWizard;
window.applyProjectFocusMode = applyProjectFocusMode;
window.renderProjectDefaultsSummary = renderProjectDefaultsSummary;
