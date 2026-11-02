// SUBSYSTEM: Sizer UI — Milestone Husky IVO & XProtect 2026 R2 Licensing Studio UI (js/sizers/ui/milestone_builder_ui.js)

// =========================================================================
// MILESTONE HUSKY IVO APPLIANCE & XPROTECT 2026 R2 LICENSING CONTROLLERS
// =========================================================================

function setVmsLicensingVendor(vendor, skipConfirm = false) {
  const cleanVendor = vendor === "milestone" ? "milestone" : "genetec";
  const defs = (typeof StorageService !== "undefined" && typeof StorageService.getProjectDefaults === "function") ? StorageService.getProjectDefaults() : null;
  if (!skipConfirm && defs && typeof confirmProjectDefaultChange === "function" && !(typeof isProjectWizardOpen === "function" && isProjectWizardOpen())) {
    const defVendor = typeof mapProjectPlatformToVmsVendor === "function" ? mapProjectPlatformToVmsVendor(defs.vms?.platform) : "genetec";
    const defLicVendor = defVendor === "milestone" ? "milestone" : "genetec";
    if (cleanVendor !== defLicVendor && cleanVendor !== activeVmsLicensingVendor) {
      const defLbl = defs.vms?.platform || (defLicVendor === "milestone" ? "Milestone XProtect" : "Genetec");
      const newLbl = cleanVendor === "milestone" ? "Milestone XProtect" : "Genetec";
      confirmProjectDefaultChange({
        title: "Switch VMS Licensing & Appliance Ecosystem?",
        settingLabel: "VMS Software & Appliance Manufacturer",
        defaultLabel: defLbl,
        newLabel: newLbl,
        message: `Your Project Default VMS Platform is set to "${defLbl}". Are you sure you want to switch the VMS Licensing & Appliance Studio to "${newLbl}"?`,
        allowLocalOverride: true,
        localOverrideLabel: `Compare ${newLbl} Here Only`,
        updateDefaultLabel: `Update Project Default to ${newLbl}`,
        onLocalOverride: () => setVmsLicensingVendor(cleanVendor, true),
        onUpdateDefault: () => {
          if (typeof updateSingleProjectDefault === "function") {
            updateSingleProjectDefault(d => { if (!d.vms) d.vms = {}; d.vms.platform = newLbl; }, true);
          } else {
            setVmsLicensingVendor(cleanVendor, true);
          }
        },
        onCancel: () => { if (typeof buildCalculatorStrip === "function") buildCalculatorStrip(); }
      });
      return;
    }
  }
  activeVmsLicensingVendor = vendor === "milestone" ? "milestone" : "genetec";
  window.activeVmsLicensingVendor = activeVmsLicensingVendor;
  videoVmsVendor = activeVmsLicensingVendor;
  window.videoVmsVendor = activeVmsLicensingVendor;
  if (typeof VideoStorageSizer !== "undefined") {
    VideoStorageSizer.state.vmsVendor = activeVmsLicensingVendor;
  }
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
  if (typeof updateProjectHealthUI === "function") updateProjectHealthUI();
}
window.setVmsLicensingVendor = setVmsLicensingVendor;

function setMilestoneLicParam(key, val, skipConfirm = false) {
  const defs = (typeof StorageService !== "undefined" && typeof StorageService.getProjectDefaults === "function") ? StorageService.getProjectDefaults() : null;
  if (key === "careYears" && !skipConfirm && defs && typeof confirmProjectDefaultChange === "function" && !(typeof isProjectWizardOpen === "function" && isProjectWizardOpen())) {
    const defTerm = defs.licensing?.globalSelectedTerm || "1YR";
    const defYrs = typeof mapTermToMaintenanceYears === "function" ? mapTermToMaintenanceYears(defTerm) : 1;
    const newYrs = parseInt(val, 10) || 1;
    const curYrs = window.milestoneLicensingConfig?.careYears ?? MilestoneLicensingSizer?.state?.careYears ?? defYrs;
    if (newYrs !== defYrs && newYrs !== curYrs) {
      const newTerm = typeof mapYearsToTermString === "function" ? mapYearsToTermString(newYrs) : `${newYrs}YR`;
      confirmProjectDefaultChange({
        title: "Change Care Plus Maintenance Term?",
        settingLabel: "Milestone Care Plus Support Term",
        defaultLabel: `${defTerm} (${defYrs}-Year Default)`,
        newLabel: `${newYrs}-Year Care Plus`,
        message: `Your Project Default Software Licensing Term is set to "${defTerm}". Are you sure you want to change Milestone Care Plus to ${newYrs}-Year?`,
        allowLocalOverride: true,
        localOverrideLabel: `Use ${newYrs}-Year for Milestone Only`,
        updateDefaultLabel: `Update Project Default to ${newTerm}`,
        onLocalOverride: () => setMilestoneLicParam(key, newYrs, true),
        onUpdateDefault: () => {
          if (typeof updateSingleProjectDefault === "function") {
            updateSingleProjectDefault(d => { if (!d.licensing) d.licensing = {}; d.licensing.globalSelectedTerm = newTerm; }, true);
          }
          setMilestoneLicParam(key, newYrs, true);
        },
        onCancel: () => { if (typeof buildCalculatorStrip === "function") buildCalculatorStrip(); }
      });
      return;
    }
  } else if ((key === "tierMode" || key === "edition") && !skipConfirm && defs && typeof confirmProjectDefaultChange === "function" && !(typeof isProjectWizardOpen === "function" && isProjectWizardOpen())) {
    const defTier = defs.vms?.editionTier || "auto";
    const curTier = window.milestoneLicensingConfig?.tierMode || "auto";
    const tierLbl = (t) => t === "express_plus" ? "XProtect Express+" : (t === "professional_plus" ? "XProtect Professional+" : (t === "expert" ? "XProtect Expert" : (t === "corporate" ? "XProtect Corporate" : "Auto-Select Edition")));
    if (val !== defTier && val !== curTier) {
      confirmProjectDefaultChange({
        title: "Change Milestone XProtect Edition Tier?",
        settingLabel: "VMS Default Edition / Base Tier",
        defaultLabel: tierLbl(defTier),
        newLabel: tierLbl(val),
        message: `Your Project Default VMS Edition is set to "${tierLbl(defTier)}". Are you sure you want to change it to "${tierLbl(val)}"?`,
        allowLocalOverride: true,
        localOverrideLabel: `Override Here Only`,
        updateDefaultLabel: `Update Project Default to ${tierLbl(val)}`,
        onLocalOverride: () => setMilestoneLicParam(key, val, true),
        onUpdateDefault: () => {
          if (typeof updateSingleProjectDefault === "function") {
            updateSingleProjectDefault(d => { if (!d.vms) d.vms = {}; d.vms.editionTier = val; });
          }
          setMilestoneLicParam(key, val, true);
        },
        onCancel: () => { if (typeof buildCalculatorStrip === "function") buildCalculatorStrip(); }
      });
      return;
    }
  }
  if (typeof window.milestoneLicensingConfig !== "object" || !window.milestoneLicensingConfig) {
    window.milestoneLicensingConfig = (typeof MilestoneLicensingSizer !== "undefined")
      ? MilestoneLicensingSizer.getDefaultConfig()
      : {};
  }
  const cfg = window.milestoneLicensingConfig;
  cfg[key] = val;
  // Synchronize UI alias keys with MilestoneLicensingSizer engine keys
  if (key === "edition") cfg.tierMode = val;
  if (key === "tierMode") cfg.edition = val;
  if (key === "includeCarePremium") cfg.carePremium = Boolean(val);
  if (key === "carePremium") cfg.includeCarePremium = Boolean(val);
  if (key === "lprLanesOverride") cfg.lprCamerasOverride = val;
  if (key === "lprCountryModules") cfg.lprCountryLibs = val;
  if (key === "interconnectDevices") cfg.interconnectCameras = val;
  if (key === "transactConnectors") cfg.transactSources = val;
  if (key === "axisSecureEntryDoorsOverride") {
    cfg.accessMode = "axis_secure_entry";
    cfg.accessReadersOverride = val;
  }
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
  if (typeof updateProjectHealthUI === "function") updateProjectHealthUI();
}
window.setMilestoneLicParam = setMilestoneLicParam;

function toggleMilestoneFeature(toggleKey, enabled) {
  if (typeof window.milestoneLicensingConfig !== "object" || !window.milestoneLicensingConfig) {
    window.milestoneLicensingConfig = (typeof MilestoneLicensingSizer !== "undefined")
      ? MilestoneLicensingSizer.getDefaultConfig()
      : {};
  }
  const cfg = window.milestoneLicensingConfig;
  const isOn = Boolean(enabled);
  cfg[toggleKey] = isOn;

  if (toggleKey === "enableAxisSecureEntry") {
    cfg.enableAccessControl = isOn;
    cfg.accessMode = isOn ? "axis_secure_entry" : "xprotect_access";
    if (isOn && !(cfg.accessReadersOverride > 0)) {
      cfg.accessReadersOverride = 4;
      cfg.axisSecureEntryDoorsOverride = 4;
    }
  } else if (isOn) {
    if (toggleKey === "enableAccessControl") {
      cfg.accessMode = "xprotect_access";
      if (!(cfg.accessReadersOverride > 0)) cfg.accessReadersOverride = 4;
    } else if (toggleKey === "enableLpr" && !(cfg.lprCamerasOverride > 0)) {
      cfg.lprCamerasOverride = 1;
      cfg.lprLanesOverride = 1;
      cfg.lprCountryLibs = Math.max(1, cfg.lprCountryLibs || 1);
    } else if (toggleKey === "enableTransact" && !(cfg.transactSources > 0)) {
      cfg.transactSources = 2;
      cfg.transactConnectors = 2;
    } else if (toggleKey === "enableInterconnect" && !(cfg.interconnectCameras > 0)) {
      cfg.interconnectCameras = 8;
      cfg.interconnectDevices = 8;
    } else if (toggleKey === "enableRapidReview" && !(cfg.rapidReviewCameras > 0)) {
      cfg.rapidReviewCameras = 5;
    } else if (toggleKey === "enableHospitalAssist" && !(cfg.hospitalAssistCameras > 0)) {
      cfg.hospitalAssistCameras = 4;
    }
  }
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
  if (typeof updateProjectHealthUI === "function") updateProjectHealthUI();
}
window.toggleMilestoneFeature = toggleMilestoneFeature;

function autoFitHuskyToBom() {
  if (typeof MilestoneLicensingSizer === "undefined" || typeof addToBOM !== "function") return;
  const res = MilestoneLicensingSizer.calculate(projectBOM);
  const hp = res.huskyPlan;
  if (!hp || !hp.primaryAppliance) {
    if (typeof showToast === "function") showToast("Add cameras or set manual storage parameters to size a Milestone Husky IVO appliance.", "info");
    return;
  }

  let addedDesc = [];
  addToBOM(hp.primaryAppliance.id, hp.primaryQty);
  addedDesc.push(`${hp.primaryQty}x ${hp.primaryAppliance.model}`);

  if (hp.analyticsAppliance && hp.analyticsQty > 0) {
    addToBOM(hp.analyticsAppliance.id, hp.analyticsQty);
    addedDesc.push(`${hp.analyticsQty}x ${hp.analyticsAppliance.model}`);
  }
  if (hp.cloudGatewayAppliance && hp.cloudGatewayQty > 0) {
    addToBOM(hp.cloudGatewayAppliance.id, hp.cloudGatewayQty);
    addedDesc.push(`${hp.cloudGatewayQty}x ${hp.cloudGatewayAppliance.model}`);
  }

  if (typeof showToast === "function") {
    showToast(`Added Milestone Husky Hardware: ${addedDesc.join(" + ")}`, "success");
  }
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
  if (typeof updateProjectHealthUI === "function") updateProjectHealthUI();
}
window.autoFitHuskyToBom = autoFitHuskyToBom;

function addMilestoneLicensesToBom(skipConfirm = false) {
  if (typeof MilestoneLicensingSizer === "undefined" || typeof addToBOM !== "function") return;
  const defs = (typeof StorageService !== "undefined" && typeof StorageService.getProjectDefaults === "function") ? StorageService.getProjectDefaults() : null;
  if (!skipConfirm && defs && typeof confirmProjectDefaultChange === "function") {
    if ((defs.vms?.licensingInScope ?? defs.vms?.headEndInScope) === false) {
      confirmProjectDefaultChange({
        title: "Software Licensing Marked Out of Orion Scope",
        settingLabel: "Orion Scope of Work • Software Licensing",
        defaultLabel: "Excluded / Out of Scope",
        newLabel: "Milestone XProtect Licensing In Scope",
        message: `Your Project Scope currently marks Software Licensing as Out of Scope. Are you sure you want to quote Milestone XProtect licenses in this BOM?`,
        allowLocalOverride: true,
        localOverrideLabel: "Add Licenses Once",
        updateDefaultLabel: "Enable Software Licensing in Project Scope",
        onLocalOverride: () => addMilestoneLicensesToBom(true),
        onUpdateDefault: () => {
          if (typeof updateSingleProjectDefault === "function") {
            updateSingleProjectDefault(d => { if (!d.vms) d.vms = {}; d.vms.licensingInScope = true; d.vms.headEndInScope = true; d.vms.platform = "Milestone XProtect"; }, true);
          }
          addMilestoneLicensesToBom(true);
        }
      });
      return;
    }
    const defVms = typeof mapProjectPlatformToVmsVendor === "function" ? mapProjectPlatformToVmsVendor(defs.vms?.platform) : "genetec";
    if (defVms !== "milestone") {
      confirmProjectDefaultChange({
        title: "Project Default VMS is Not Milestone XProtect",
        settingLabel: "VMS Software Platform Mismatch",
        defaultLabel: defs.vms?.platform || "Genetec",
        newLabel: "Milestone XProtect 2026 R2",
        message: `Your Project Default VMS Platform is set to "${defs.vms?.platform || 'Genetec'}". Are you sure you want to add Milestone XProtect licenses to the BOM?`,
        allowLocalOverride: true,
        localOverrideLabel: "Add Milestone Licenses Only",
        updateDefaultLabel: "Switch Project Default to Milestone & Add",
        onLocalOverride: () => addMilestoneLicensesToBom(true),
        onUpdateDefault: () => {
          if (typeof updateSingleProjectDefault === "function") {
            updateSingleProjectDefault(d => { if (!d.vms) d.vms = {}; d.vms.platform = "Milestone XProtect"; }, true);
          }
          addMilestoneLicensesToBom(true);
        }
      });
      return;
    }
  }
  const res = MilestoneLicensingSizer.calculate(projectBOM);
  if (!res.lineItems || res.lineItems.length === 0) {
    if (typeof showToast === "function") showToast("No Milestone XProtect licenses needed yet — add cameras or access readers first.", "info");
    return;
  }

  // Remove any previously auto-added Milestone VMS software SKUs before re-adding updated quantities
  const milestoneSkus = new Set(res.lineItems.map(li => li.sku));
  if (Array.isArray(projectBOM)) {
    for (let i = projectBOM.length - 1; i >= 0; i--) {
      const entry = projectBOM[i];
      const item = entry && (entry.item || entry);
      if (item && (milestoneSkus.has(item.sku) || String(item.id || "").startsWith("milestone-xp") || String(item.id || "").startsWith("milestone-mc"))) {
        projectBOM.splice(i, 1);
      }
    }
  }

  let count = 0;
  window._bypassLicScopePromptOnce = true;
  try {
    res.lineItems.forEach(li => {
      if (li.qty > 0 && !li.isIncludedZeroCost && (li.unitMsrp || 0) > 0) {
        addToBOM(li.catalogId || li.id || li.sku, li.qty, null, true);
        count++;
      }
    });
  } finally {
    window._bypassLicScopePromptOnce = false;
  }

  if (typeof showToast === "function") {
    showToast(`Added ${count} Milestone XProtect 2026 R2 license SKU(s) ($${res.totalSoftwareMsrp.toLocaleString()} MSRP) to BOM.`, "success");
  }
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
  if (typeof updateProjectHealthUI === "function") updateProjectHealthUI();
}
window.addMilestoneLicensesToBom = addMilestoneLicensesToBom;

function addTurnkeyMilestonePackageToBom() {
  autoFitHuskyToBom();
  addMilestoneLicensesToBom();
}
window.addTurnkeyMilestonePackageToBom = addTurnkeyMilestonePackageToBom;

function renderMilestoneLicensingBuilderHtml(licRes, isCompactDrawer = false) {
  const cfg = licRes.config || {};
  const hp = licRes.huskyPlan || {};
  const prim = hp.primaryAppliance;
  const ed = licRes.editionInfo || licRes.tierDef || {};
  const isAxisMode = licRes.enableAccessControl && licRes.accessMode === "axis_secure_entry";
  const isXpAccessMode = licRes.enableAccessControl && licRes.accessMode !== "axis_secure_entry";

  return `
    <div class="bg-slate-900/95 border border-sky-500/40 rounded-2xl p-3.5 sm:p-4 space-y-3.5 shadow-xl">
      <!-- Top Header & Datasheets -->
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-800">
        <div class="flex items-start gap-2.5">
          <div class="p-2 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400 shrink-0">
            <i data-lucide="key" class="w-4 h-4"></i>
          </div>
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <h5 class="text-xs font-bold text-white uppercase tracking-wider">
                Milestone XProtect 2026 R2 &amp; Husky IVO Turnkey Sizer
              </h5>
              <span class="px-2 py-0.5 rounded bg-sky-500/15 border border-sky-500/30 text-sky-300 text-[10px] font-mono font-bold">
                Edition: ${ed.label || 'XProtect Corporate'} &bull; ${licRes.totalDeviceLicenses ?? licRes.cameraUnits ?? 0} Device Licenses &bull; ${licRes.careYears}Y Care Plus (${licRes.multiYearDiscountPct ?? licRes.careDiscountPct ?? 0}% Multi-Year Discount)
              </span>
              <a href="Datasheets/Milestone/Milestone_XProtect_VMS_Product_Comparison_Chart.pdf" target="_blank" class="text-[10px] text-sky-400 hover:text-sky-300 underline flex items-center gap-1">
                <i data-lucide="file-text" class="w-3 h-3"></i>
                <span>2026 R2 Comparison Chart</span>
              </a>
              <a href="Datasheets/Milestone/XProtect_Price List_USD-US_January 1_2027.xlsx" target="_blank" class="text-[10px] text-emerald-400 hover:text-emerald-300 underline flex items-center gap-1">
                <i data-lucide="dollar-sign" class="w-3 h-3"></i>
                <span>Official USD Price List (Jan 2027)</span>
              </a>
            </div>
            <p class="text-[11px] text-slate-400 mt-0.5">
              Automatic edition selection (<strong class="text-white">Express+</strong> &bull; <strong class="text-white">Professional+</strong> &bull; <strong class="text-white">Expert</strong> &bull; <strong class="text-white">Corporate</strong>), Care Plus multi-year discounts (10%–25%), XProtect Access, LPR, Smart Wall, BriefCam XA/XE, and Husky IVO sizing.
            </p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2 shrink-0">
          <div class="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-right">
            <div class="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Total Software + Husky IVO</div>
            <div class="text-xs font-mono font-bold text-emerald-400">
              $${(licRes.totalSoftwareMsrp || 0).toLocaleString()} Software <span class="text-slate-500">+</span> <span class="text-sky-300">$${(licRes.totalHardwareMsrp || 0).toLocaleString()} Hardware</span>
            </div>
          </div>
          <button
            type="button"
            onclick="addTurnkeyMilestonePackageToBom()"
            class="px-3 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-emerald-600 hover:from-sky-500 hover:to-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
          >
            <i data-lucide="sparkles" class="w-3.5 h-3.5"></i>
            <span>+ Quote Full Turnkey Milestone Package ($${(licRes.totalTurnkeyMsrp ?? licRes.combinedTurnkeyMsrp ?? 0).toLocaleString()})</span>
          </button>
        </div>
      </div>

      ${licRes.autoUpgradedReasons && licRes.autoUpgradedReasons.length > 0 ? `
        <div class="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/40 flex items-start gap-2 text-[11px] text-amber-200">
          <i data-lucide="info" class="w-4 h-4 text-amber-400 shrink-0 mt-0.5"></i>
          <div>
            <strong class="text-amber-300">Automatic Milestone XProtect Edition Promotion:</strong>
            ${licRes.autoUpgradedReasons.join(" • ")}
          </div>
        </div>
      ` : ''}

      <!-- 6-Card Configuration Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 text-xs">
        <!-- Card 1: XProtect Edition, Device Licenses & Care Plus Term -->
        <div class="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3 space-y-2.5">
          <div class="text-[10px] font-bold uppercase tracking-wider text-sky-400 flex items-center justify-between">
            <span>1. XProtect Edition &amp; Care Plus SMA</span>
            <span class="font-mono text-slate-400">${ed.baseSku || 'XPCOBT'} / ${ed.deviceSku || 'XPCODL'}</span>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div class="col-span-2">
              <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Select Milestone XProtect VMS Edition (Auto promotes to Professional+ >48 cameras, Expert for Failover, or Corporate for Smart Wall Included / Federation)">
                XProtect Edition Tier:
              </label>
              <select onchange="setMilestoneLicParam('tierMode', this.value)" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-white focus:outline-none">
                <option value="auto" ${(cfg.tierMode === 'auto' || !cfg.tierMode) ? 'selected' : ''}>Auto-Select Edition (${ed.shortLabel || 'Professional+'})</option>
                <option value="express_plus" ${cfg.tierMode === 'express_plus' ? 'selected' : ''}>XProtect Express+ (≤100 Cameras, 1 Server • $29 Base + $109 per Device)</option>
                <option value="professional_plus" ${cfg.tierMode === 'professional_plus' ? 'selected' : ''}>XProtect Professional+ (Unlimited Cameras • $566 Base + $192 per Device)</option>
                <option value="expert" ${cfg.tierMode === 'expert' ? 'selected' : ''}>XProtect Expert (Failover &amp; Encryption • $2,267 Base + $305 per Device)</option>
                <option value="corporate" ${cfg.tierMode === 'corporate' ? 'selected' : ''}>XProtect Corporate (Smart Wall &amp; Incident Manager Included • $3,610 Base + $373 per Device)</option>
              </select>
            </div>
            <div>
              <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Care Plus Multi-Year Discount: 2Y (-10%), 3Y (-15%), 4Y (-20%), 5Y (-25%). Mandatory at purchase for Expert and Corporate.">
                Care Plus Term:
              </label>
              <select onchange="setMilestoneLicParam('careYears', parseInt(this.value,10))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-emerald-300 focus:outline-none">
                <option value="1" ${licRes.careYears === 1 ? 'selected' : ''}>1 Year Care Plus (0% Discount)</option>
                <option value="2" ${licRes.careYears === 2 ? 'selected' : ''}>2 Years Care Plus (-10% Discount)</option>
                <option value="3" ${licRes.careYears === 3 ? 'selected' : ''}>3 Years Care Plus (-15% Discount)</option>
                <option value="4" ${licRes.careYears === 4 ? 'selected' : ''}>4 Years Care Plus (-20% Discount)</option>
                <option value="5" ${licRes.careYears === 5 ? 'selected' : ''}>5 Years Care Plus (-25% Discount)</option>
              </select>
            </div>
            <div>
              <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Milestone Smart Client Workstations (Unlimited $0 Smart Client licenses; sizes Husky IVO 150D-VS / 350T-VS Viewing Stations)">
                Viewing Stations:
              </label>
              <input type="number" min="0" max="500" value="${licRes.workstationClients ?? 2}" onchange="setMilestoneLicParam('workstationClients', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-white" />
            </div>
          </div>
          <label class="flex items-center justify-between gap-2 pt-1 cursor-pointer select-none">
            <span class="text-[11px] text-slate-300" title="Care Premium 24/7 direct Milestone technical support add-on (MCPR-* per device)">Include Care Premium 24/7 Direct Support</span>
            <input type="checkbox" ${licRes.carePremium ? 'checked' : ''} onchange="setMilestoneLicParam('carePremium', this.checked)" class="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-0" />
          </label>
        </div>

        <!-- Card 2: High Availability, Smart Wall & Incident Manager -->
        <div class="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3 space-y-2">
          <div class="text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center justify-between">
            <span>2. High Availability, Smart Wall &amp; SOC</span>
            <span class="font-mono text-slate-400">XPMSFSL / XPSWBL</span>
          </div>

          <label class="flex items-center justify-between gap-2 p-2 rounded-lg border ${licRes.managementServerFailover ? 'border-cyan-500/40 bg-cyan-950/20' : 'border-slate-800/90 bg-slate-900/50'} cursor-pointer select-none">
            <div>
              <div class="text-[11px] font-bold ${licRes.managementServerFailover ? 'text-cyan-300' : 'text-slate-300'}">Management Server Failover (<code class="text-cyan-400">XPMSFSL</code>)</div>
              <div class="text-[9.5px] text-slate-400">Zero-downtime Management Server HA cluster ($7,650)</div>
            </div>
            <input type="checkbox" ${licRes.managementServerFailover ? 'checked' : ''} onchange="setMilestoneLicParam('managementServerFailover', this.checked)" class="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0" />
          </label>

          <label class="flex items-center justify-between gap-2 p-2 rounded-lg border ${licRes.enableSmartWall || ed.includesSmartWall ? 'border-indigo-500/40 bg-indigo-950/20' : 'border-slate-800/90 bg-slate-900/50'} cursor-pointer select-none">
            <div>
              <div class="text-[11px] font-bold ${licRes.enableSmartWall || ed.includesSmartWall ? 'text-indigo-300' : 'text-slate-300'}">XProtect Smart Wall Video Wall (<code class="text-indigo-400">XPSWBL</code>)</div>
              <div class="text-[9.5px] text-slate-400">${ed.includesSmartWall ? 'Included FREE ($0) in XProtect Corporate ($15,799 Value)!' : 'Add-On for XProtect Expert ($15,799) — Auto-upgrades to Corporate'}</div>
            </div>
            <input type="checkbox" ${licRes.enableSmartWall || ed.includesSmartWall ? 'checked' : ''} onchange="setMilestoneLicParam('enableSmartWall', this.checked)" class="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-0" />
          </label>

          <label class="flex items-center justify-between gap-2 p-2 rounded-lg border ${licRes.enableIncidentManager || ed.includesIncidentManager ? 'border-purple-500/40 bg-purple-950/20' : 'border-slate-800/90 bg-slate-900/50'} cursor-pointer select-none">
            <div>
              <div class="text-[11px] font-bold ${licRes.enableIncidentManager || ed.includesIncidentManager ? 'text-purple-300' : 'text-slate-300'}">XProtect Incident Manager (<code class="text-purple-400">XPIMBL</code>)</div>
              <div class="text-[9.5px] text-slate-400">${ed.includesIncidentManager ? 'Included FREE ($0) in XProtect Corporate ($9,975 Value)!' : 'Case documentation &amp; video evidence packaging ($9,975)'}</div>
            </div>
            <input type="checkbox" ${licRes.enableIncidentManager || ed.includesIncidentManager ? 'checked' : ''} onchange="setMilestoneLicParam('enableIncidentManager', this.checked)" class="rounded border-slate-700 bg-slate-900 text-purple-500 focus:ring-0" />
          </label>
        </div>

        <!-- Card 3: Access Control (XProtect Access & AXIS Secure Entry) -->
        <div class="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3 space-y-2">
          <div class="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center justify-between">
            <span>3. Access Control &amp; Door Integration</span>
            <span class="font-mono text-slate-400">XPABL / XPSEADL</span>
          </div>

          <div class="rounded-lg border ${isXpAccessMode ? 'border-amber-500/40 bg-amber-950/20' : 'border-slate-800/90 bg-slate-900/50'} p-2 space-y-1.5">
            <div class="flex items-center justify-between gap-2">
              <label class="flex items-center gap-2 cursor-pointer select-none flex-1">
                <input type="checkbox" ${isXpAccessMode ? 'checked' : ''} onchange="toggleMilestoneFeature('enableAccessControl', this.checked)" class="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-0" />
                <span class="text-[11px] font-bold ${isXpAccessMode ? 'text-amber-300' : 'text-slate-300'}">XProtect Access (3rd-Party ACS Integration)</span>
              </label>
              <span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${isXpAccessMode ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-400'}">${isXpAccessMode ? `${licRes.effectiveAccessCount || 0} Readers` : 'OFF'}</span>
            </div>
            ${isXpAccessMode ? `
              <div class="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
                <span class="text-[10px] text-slate-300">Base ($129) + Access Door/Reader Licenses ($39 per Reader):</span>
                <input type="number" min="0" max="2000" value="${licRes.effectiveAccessCount || 0}" onchange="setMilestoneLicParam('accessReadersOverride', Math.max(0, parseInt(this.value,10)||0))" class="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-0.5 text-center font-mono font-bold text-amber-300" />
              </div>
            ` : ''}
          </div>

          <div class="rounded-lg border ${isAxisMode ? 'border-emerald-500/40 bg-emerald-950/20' : 'border-slate-800/90 bg-slate-900/50'} p-2 space-y-1.5">
            <div class="flex items-center justify-between gap-2">
              <label class="flex items-center gap-2 cursor-pointer select-none flex-1">
                <input type="checkbox" ${isAxisMode ? 'checked' : ''} onchange="toggleMilestoneFeature('enableAxisSecureEntry', this.checked)" class="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0" />
                <span class="text-[11px] font-bold ${isAxisMode ? 'text-emerald-300' : 'text-slate-300'}">XProtect AXIS Secure Entry (A1001 / A1610)</span>
              </label>
              <span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${isAxisMode ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'}">${isAxisMode ? `${licRes.effectiveAccessCount || 0} Doors` : 'OFF'}</span>
            </div>
            ${isAxisMode ? `
              <div class="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
                <span class="text-[10px] text-slate-300">Base ($0) + Axis Controller Door Licenses ($89 per Door):</span>
                <input type="number" min="0" max="500" value="${licRes.effectiveAccessCount || 0}" onchange="setMilestoneLicParam('axisSecureEntryDoorsOverride', Math.max(0, parseInt(this.value,10)||0))" class="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-0.5 text-center font-mono font-bold text-emerald-300" />
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Card 4: LPR, Rapid REVIEW, BriefCam XA/XE & Hospital Assist -->
        <div class="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3 space-y-2">
          <div class="text-[10px] font-bold uppercase tracking-wider text-purple-400 flex items-center justify-between">
            <span>4. LPR, Rapid REVIEW &amp; BriefCam Analytics</span>
            <a href="Datasheets/Milestone/8_Husky XA20T-XA20R Specification Sheet.pdf" target="_blank" class="text-[9px] text-purple-300 hover:underline">Husky XA PDF</a>
          </div>

          <div class="rounded-lg border ${licRes.enableLpr ? 'border-purple-500/40 bg-purple-950/20' : 'border-slate-800/90 bg-slate-900/50'} p-2 space-y-1.5">
            <div class="flex items-center justify-between gap-2">
              <label class="flex items-center gap-2 cursor-pointer select-none flex-1">
                <input type="checkbox" ${licRes.enableLpr ? 'checked' : ''} onchange="toggleMilestoneFeature('enableLpr', this.checked)" class="rounded border-slate-700 bg-slate-900 text-purple-500 focus:ring-0" />
                <span class="text-[11px] font-bold ${licRes.enableLpr ? 'text-purple-300' : 'text-slate-300'}">XProtect LPR License Plate Recognition</span>
              </label>
              <span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${licRes.enableLpr ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' : 'bg-slate-800 text-slate-400'}">${licRes.enableLpr ? `${licRes.effectiveLprCameras || 0} Lanes` : 'OFF'}</span>
            </div>
            ${licRes.enableLpr ? `
              <div class="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
                <div>
                  <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold">LPR Cameras ($1,295):</label>
                  <input type="number" min="1" max="200" value="${licRes.effectiveLprCameras || 1}" onchange="setMilestoneLicParam('lprCamerasOverride', Math.max(1, parseInt(this.value,10)||1))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-0.5 text-center font-mono font-bold text-purple-300" />
                </div>
                <div>
                  <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold">Country Packs ($645):</label>
                  <input type="number" min="1" max="20" value="${licRes.lprCountryLibs || 1}" onchange="setMilestoneLicParam('lprCountryLibs', Math.max(1, parseInt(this.value,10)||1))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-0.5 text-center font-mono font-bold text-white" />
                </div>
              </div>
            ` : ''}
          </div>

          <div class="rounded-lg border ${licRes.enableRapidReview ? 'border-sky-500/40 bg-sky-950/20' : 'border-slate-800/90 bg-slate-900/50'} p-2 space-y-1.5">
            <div class="flex items-center justify-between gap-2">
              <label class="flex items-center gap-2 cursor-pointer select-none flex-1">
                <input type="checkbox" ${licRes.enableRapidReview ? 'checked' : ''} onchange="toggleMilestoneFeature('enableRapidReview', this.checked)" class="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-0" />
                <span class="text-[11px] font-bold ${licRes.enableRapidReview ? 'text-sky-300' : 'text-slate-300'}">XProtect Rapid REVIEW / BriefCam Forensics</span>
              </label>
              <span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${licRes.enableRapidReview ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' : 'bg-slate-800 text-slate-400'}">${licRes.enableRapidReview ? `${licRes.rapidReviewCameras} Cameras` : 'OFF'}</span>
            </div>
            ${licRes.enableRapidReview ? `
              <div class="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
                <span class="text-[10px] text-slate-300">Rapid REVIEW Camera Licenses ($220 per Camera):</span>
                <input type="number" min="1" max="500" value="${licRes.rapidReviewCameras || 5}" onchange="setMilestoneLicParam('rapidReviewCameras', Math.max(1, parseInt(this.value,10)||1))" class="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-0.5 text-center font-mono font-bold text-sky-300" />
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Card 5: Transact POS, Interconnect & Arcules Hybrid Cloud -->
        <div class="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3 space-y-2">
          <div class="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center justify-between">
            <span>5. Interconnect, POS &amp; Arcules Cloud</span>
            <a href="Datasheets/Milestone/Husky GW Units Flyer.pdf" target="_blank" class="text-[9px] text-emerald-300 hover:underline">Husky GW PDF</a>
          </div>

          <div class="rounded-lg border ${licRes.enableInterconnect ? 'border-emerald-500/40 bg-emerald-950/20' : 'border-slate-800/90 bg-slate-900/50'} p-2 space-y-1.5">
            <div class="flex items-center justify-between gap-2">
              <label class="flex items-center gap-2 cursor-pointer select-none flex-1">
                <input type="checkbox" ${licRes.enableInterconnect ? 'checked' : ''} onchange="toggleMilestoneFeature('enableInterconnect', this.checked)" class="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0" />
                <span class="text-[11px] font-bold ${licRes.enableInterconnect ? 'text-emerald-300' : 'text-slate-300'}">Milestone Interconnect (<code class="text-emerald-400">XPCOMIDL</code> @ $77.76 per Camera)</span>
              </label>
              <span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${licRes.enableInterconnect ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'}">${licRes.enableInterconnect ? `${licRes.interconnectCameras || 0} Devices` : 'OFF'}</span>
            </div>
            ${licRes.enableInterconnect ? `
              <div class="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
                <span class="text-[10px] text-slate-300">Remote Interconnected Cameras (Corporate Required):</span>
                <input type="number" min="1" max="2000" value="${licRes.interconnectCameras || 8}" onchange="setMilestoneLicParam('interconnectCameras', Math.max(1, parseInt(this.value,10)||1))" class="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-0.5 text-center font-mono font-bold text-emerald-300" />
              </div>
            ` : ''}
          </div>

          <div class="rounded-lg border ${licRes.enableTransact ? 'border-amber-500/40 bg-amber-950/20' : 'border-slate-800/90 bg-slate-900/50'} p-2 space-y-1.5">
            <div class="flex items-center justify-between gap-2">
              <label class="flex items-center gap-2 cursor-pointer select-none flex-1">
                <input type="checkbox" ${licRes.enableTransact ? 'checked' : ''} onchange="toggleMilestoneFeature('enableTransact', this.checked)" class="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-0" />
                <span class="text-[11px] font-bold ${licRes.enableTransact ? 'text-amber-300' : 'text-slate-300'}">XProtect Transact POS / ATM (<code class="text-amber-400">XPTBS</code>)</span>
              </label>
              <span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${licRes.enableTransact ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-400'}">${licRes.enableTransact ? `${licRes.transactSources || 0} POS` : 'OFF'}</span>
            </div>
            ${licRes.enableTransact ? `
              <div class="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
                <span class="text-[10px] text-slate-300">POS / ATM Sources ($299 Base + $269/extra):</span>
                <input type="number" min="1" max="500" value="${licRes.transactSources || 2}" onchange="setMilestoneLicParam('transactSources', Math.max(1, parseInt(this.value,10)||1))" class="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-0.5 text-center font-mono font-bold text-amber-300" />
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Card 6: Milestone Husky IVO Turnkey Appliance Recommendation -->
        <div class="bg-slate-950/80 border border-sky-500/30 rounded-xl p-3 space-y-2">
          <div class="text-[10px] font-bold uppercase tracking-wider text-sky-400 flex items-center justify-between">
            <span>6. Milestone Husky IVO Appliance Fit</span>
            <select onchange="setMilestoneLicParam('applianceFormFactor', this.value)" class="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[10px] font-bold text-slate-200 focus:outline-none">
              <option value="rack" ${cfg.applianceFormFactor === 'rack' ? 'selected' : ''}>Rackmount (350R / 700R / 1000R / 1800R)</option>
              <option value="tower" ${cfg.applianceFormFactor === 'tower' ? 'selected' : ''}>Tower / Desktop (150D / 350T)</option>
              <option value="any" ${cfg.applianceFormFactor === 'any' ? 'selected' : ''}>Any Form Factor</option>
            </select>
          </div>
          ${prim ? `
            <div class="p-2 rounded-lg bg-sky-950/40 border border-sky-500/30 space-y-1.5">
              <div class="flex items-center justify-between">
                <span class="font-bold text-white text-[11px]">${hp.primaryQty}x ${prim.model} (${prim.sku})</span>
                <span class="font-mono font-bold text-sky-300 text-[11px]">$${(hp.primaryQty * (prim.msrp || 0)).toLocaleString()}</span>
              </div>
              <div class="text-[10px] text-slate-300 leading-snug">${hp.recordingReason || hp.recorderReason || ''}</div>
              ${typeof renderApplianceBuildOptionsAndAccessoriesHtml === 'function' ? renderApplianceBuildOptionsAndAccessoriesHtml(prim) : ''}
              <div class="flex items-center justify-between pt-1">
                <a href="${prim.datasheetPath}" target="_blank" class="text-[10px] text-sky-400 hover:underline flex items-center gap-1">
                  <i data-lucide="external-link" class="w-3 h-3"></i>
                  <span>Official Husky IVO Datasheet</span>
                </a>
                <button type="button" onclick="autoFitHuskyToBom()" class="px-2 py-0.5 rounded bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-bold cursor-pointer">
                  + Add Husky IVO to BOM
                </button>
              </div>
            </div>
          ` : `
            <div class="p-2 rounded-lg bg-slate-900/60 border border-slate-800 text-[10px] text-slate-400">
              Add cameras to the project or storage calculator to automatically size Milestone Husky IVO appliances.
            </div>
          `}
          ${hp.analyticsAppliance ? `
            <div class="p-1.5 rounded-lg bg-purple-950/30 border border-purple-500/30 flex items-center justify-between text-[10px]">
              <span class="text-purple-300 font-bold">+ ${hp.analyticsQty}x ${hp.analyticsAppliance.model} BriefCam Analytics</span>
              <span class="font-mono text-white">$${(hp.analyticsQty * (hp.analyticsAppliance.msrp || 0)).toLocaleString()}</span>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- Itemized Milestone XProtect License & Care Plus Breakdown Table -->
      <div class="bg-slate-950/90 border border-slate-800 rounded-xl overflow-hidden">
        <div class="px-3 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-300">
            Calculated Milestone XProtect 2026 R2 License &amp; Care Plus Bill of Materials (${licRes.lineItems.length} Line Items)
          </span>
          <span class="text-[11px] font-mono font-bold text-emerald-400">
            Total Software MSRP: $${(licRes.totalSoftwareMsrp || 0).toLocaleString()}
          </span>
        </div>
        ${licRes.lineItems.length > 0 ? `
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-[11px] font-mono">
              <thead>
                <tr class="border-b border-slate-800/80 text-[9px] uppercase text-slate-400">
                  <th class="py-1.5 px-3">Part Number (SKU)</th>
                  <th class="py-1.5 px-3">Full License Description</th>
                  <th class="py-1.5 px-3">Category</th>
                  <th class="py-1.5 px-3 text-center">Quantity</th>
                  <th class="py-1.5 px-3 text-right">Unit MSRP</th>
                  <th class="py-1.5 px-3 text-right">Extended MSRP</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800/50">
                ${licRes.lineItems.map(li => {
                  const isZero = Boolean(li.isIncludedZeroCost || (li.unitMsrp || 0) === 0);
                  return `
                  <tr class="${isZero ? 'bg-emerald-950/20' : 'hover:bg-slate-900/60'}">
                    <td class="py-1.5 px-3 font-bold ${isZero ? 'text-emerald-300' : 'text-sky-300'} whitespace-nowrap">${li.sku}</td>
                    <td class="py-1.5 px-3 font-sans text-slate-200">
                      <div class="font-semibold">${li.model}</div>
                      ${li.notes ? `<div class="text-[10px] ${isZero ? 'text-emerald-300/90' : 'text-slate-400'}">${escapeHTML(li.notes)}</div>` : ''}
                    </td>
                    <td class="py-1.5 px-3 text-[10px] text-slate-400 whitespace-nowrap">${li.categoryLabel || li.category || ''}</td>
                    <td class="py-1.5 px-3 text-center font-bold text-amber-300">${li.qty}</td>
                    <td class="py-1.5 px-3 text-right text-slate-300">${isZero ? '<span class="text-emerald-400 font-bold">INCLUDED ($0.00)</span>' : '$' + (li.unitMsrp || 0).toLocaleString()}</td>
                    <td class="py-1.5 px-3 text-right font-bold text-emerald-400">$${(li.extendedMsrp || 0).toLocaleString()}</td>
                  </tr>
                `;
                }).join('')}
              </tbody>
            </table>
          </div>
        ` : `
          <div class="p-4 text-center text-xs text-slate-400">
            No Milestone XProtect device licenses calculated yet. Add cameras in Initial/Quick Design, Power over Ethernet Calculator, or Physical Security.
          </div>
        `}
      </div>
    </div>
  `;
}
window.renderMilestoneLicensingBuilderHtml = renderMilestoneLicensingBuilderHtml;

function renderVmsLicensingStudioHtml(isCompactDrawer = false) {
  const isMilestone = activeVmsLicensingVendor === "milestone";
  const gRes = (typeof GenetecLicensingSizer !== "undefined") ? GenetecLicensingSizer.calculate(projectBOM) : null;
  const mRes = (typeof MilestoneLicensingSizer !== "undefined") ? MilestoneLicensingSizer.calculate(projectBOM) : null;

  return `
    <div class="space-y-3">
      <!-- Top Multi-Manufacturer VMS Licensing Switcher Bar -->
      <div class="bg-slate-900/95 border border-slate-800 rounded-2xl px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
        <div class="flex items-center gap-2.5">
          <span class="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <i data-lucide="layers" class="w-4 h-4 text-emerald-400"></i>
            <span>VMS Manufacturer &amp; Appliance Ecosystem:</span>
          </span>
          <div class="inline-flex items-center bg-slate-950 border border-slate-800 rounded-xl p-0.5 text-xs">
            <button
              type="button"
              onclick="setVmsLicensingVendor('genetec')"
              class="px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${!isMilestone ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}"
            >
              <i data-lucide="shield-check" class="w-3.5 h-3.5"></i>
              <span>Genetec Security Center 5.14 &amp; Streamvault</span>
              ${gRes ? `<span class="px-1.5 py-0.2 rounded text-[10px] font-mono ${!isMilestone ? 'bg-indigo-900/80 text-indigo-200' : 'bg-slate-900 text-slate-400'}">$${gRes.totalSoftwareMsrp.toLocaleString()}</span>` : ''}
            </button>
            <button
              type="button"
              onclick="setVmsLicensingVendor('milestone')"
              class="px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${isMilestone ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'}"
            >
              <i data-lucide="server" class="w-3.5 h-3.5"></i>
              <span>Milestone XProtect 2026 R2 &amp; Husky IVO</span>
              ${mRes ? `<span class="px-1.5 py-0.2 rounded text-[10px] font-mono ${isMilestone ? 'bg-sky-900/80 text-sky-200' : 'bg-slate-900 text-slate-400'}">$${mRes.totalSoftwareMsrp.toLocaleString()}</span>` : ''}
            </button>
          </div>
        </div>
        <div class="text-[11px] text-slate-400 font-mono">
          Compare software licensing, multi-year SMA/Care Plus, and turnkey appliances across manufacturers.
        </div>
      </div>

      ${isMilestone
        ? (mRes ? renderMilestoneLicensingBuilderHtml(mRes, isCompactDrawer) : '')
        : (gRes ? renderGenetecLicensingBuilderHtml(gRes, isCompactDrawer) : '')}
    </div>
  `;
}
window.renderVmsLicensingStudioHtml = renderVmsLicensingStudioHtml;

if (window.OSS && typeof window.OSS.register === "function") {
  window.OSS.register("Sizers.UI.Milestone", {
    setVmsLicensingVendor,
    setMilestoneLicParam,
    toggleMilestoneFeature,
    autoFitHuskyToBom,
    addMilestoneLicensesToBom,
    renderMilestoneLicensingBuilderHtml,
    renderVmsLicensingStudioHtml
  });
}
