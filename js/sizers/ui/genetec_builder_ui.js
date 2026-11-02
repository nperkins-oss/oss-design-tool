// SUBSYSTEM: Sizer UI — Genetec Streamvault, Security Center 5.14 Licensing & Server Build Options UI (js/sizers/ui/genetec_builder_ui.js)

// =========================================================================
// GENETEC STREAMVAULT APPLIANCE & SECURITY CENTER LICENSING CONTROLLERS
// =========================================================================

function setGenetecLicParam(key, val, skipConfirm = false) {
  const defs = (typeof StorageService !== "undefined" && typeof StorageService.getProjectDefaults === "function") ? StorageService.getProjectDefaults() : null;
  if (key === "advantageYears" && !skipConfirm && defs && typeof confirmProjectDefaultChange === "function" && !(typeof isProjectWizardOpen === "function" && isProjectWizardOpen())) {
    const defTerm = defs.licensing?.globalSelectedTerm || "1YR";
    const defYrs = typeof mapTermToMaintenanceYears === "function" ? mapTermToMaintenanceYears(defTerm) : 1;
    const newYrs = parseInt(val, 10) || 1;
    const curYrs = window.genetecLicensingConfig?.advantageYears ?? GenetecLicensingSizer?.state?.advantageYears ?? defYrs;
    if (newYrs !== defYrs && newYrs !== curYrs) {
      const newTerm = typeof mapYearsToTermString === "function" ? mapYearsToTermString(newYrs) : `${newYrs}YR`;
      confirmProjectDefaultChange({
        title: "Change Software Maintenance & Licensing Term?",
        settingLabel: "Genetec Advantage Maintenance Term",
        defaultLabel: `${defTerm} (${defYrs}-Year Default)`,
        newLabel: `${newTerm} (${newYrs}-Year Advantage)`,
        message: `Your Project Default Software Licensing Term is set to "${defTerm}". Are you sure you want to change Genetec Advantage maintenance to ${newYrs}-Year?`,
        allowLocalOverride: true,
        localOverrideLabel: `Use ${newYrs}-Year for Genetec Only`,
        updateDefaultLabel: `Update Project Default to ${newTerm}`,
        onLocalOverride: () => setGenetecLicParam(key, newYrs, true),
        onUpdateDefault: () => {
          if (typeof updateSingleProjectDefault === "function") {
            updateSingleProjectDefault(d => { if (!d.licensing) d.licensing = {}; d.licensing.globalSelectedTerm = newTerm; }, true);
          }
          setGenetecLicParam(key, newYrs, true);
        },
        onCancel: () => { if (typeof buildCalculatorStrip === "function") buildCalculatorStrip(); }
      });
      return;
    }
  } else if (key === "tierMode" && !skipConfirm && defs && typeof confirmProjectDefaultChange === "function" && !(typeof isProjectWizardOpen === "function" && isProjectWizardOpen())) {
    const defTier = defs.vms?.editionTier || "auto";
    const curTier = window.genetecLicensingConfig?.tierMode || "auto";
    const tierLbl = (t) => t === "aio" ? "Streamvault All-in-One" : (t === "standard" ? "Base Standard (GSC-BASE-S)" : (t === "enterprise" ? "Base Enterprise (GSC-BASE-E)" : "Auto-Select Optimal Tier"));
    if (val !== defTier && val !== curTier) {
      confirmProjectDefaultChange({
        title: "Change Genetec Base Package Tier?",
        settingLabel: "VMS Default Edition / Base Tier",
        defaultLabel: tierLbl(defTier),
        newLabel: tierLbl(val),
        message: `Your Project Default VMS Base Tier is set to "${tierLbl(defTier)}". Are you sure you want to change it to "${tierLbl(val)}"?`,
        allowLocalOverride: true,
        localOverrideLabel: `Override Here Only`,
        updateDefaultLabel: `Update Project Default to ${tierLbl(val)}`,
        onLocalOverride: () => setGenetecLicParam(key, val, true),
        onUpdateDefault: () => {
          if (typeof updateSingleProjectDefault === "function") {
            updateSingleProjectDefault(d => { if (!d.vms) d.vms = {}; d.vms.editionTier = val; });
          }
          setGenetecLicParam(key, val, true);
        },
        onCancel: () => { if (typeof buildCalculatorStrip === "function") buildCalculatorStrip(); }
      });
      return;
    }
  }
  if (typeof window.genetecLicensingConfig !== "object" || !window.genetecLicensingConfig) {
    window.genetecLicensingConfig = (typeof GenetecLicensingSizer !== "undefined")
      ? GenetecLicensingSizer.getDefaultConfig()
      : {};
  }
  window.genetecLicensingConfig[key] = val;
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
  if (typeof updateProjectHealthUI === "function") updateProjectHealthUI();
}
window.setGenetecLicParam = setGenetecLicParam;

function toggleGenetecFeature(toggleKey, enabled) {
  if (typeof window.genetecLicensingConfig !== "object" || !window.genetecLicensingConfig) {
    window.genetecLicensingConfig = (typeof GenetecLicensingSizer !== "undefined")
      ? GenetecLicensingSizer.getDefaultConfig()
      : {};
  }
  const cfg = window.genetecLicensingConfig;
  const isOn = Boolean(enabled);
  cfg[toggleKey] = isOn;

  // When turning a feature toggle ON, seed a sensible default if all sub-counts are currently 0
  if (isOn) {
    if (toggleKey === "enableEncodersDvr" && !(cfg.analogEncoderChannels > 0) && !(cfg.dvrNvrChannels > 0)) {
      cfg.analogEncoderChannels = 4;
    } else if (toggleKey === "enableSipelia" && !(cfg.sipIntercomsOverride > 0) && !(cfg.sipTrunks > 0) && !(cfg.sipPublicAddress > 0)) {
      cfg.sipIntercomsOverride = 1;
    } else if (toggleKey === "enableLpr" && !(cfg.lprCamerasOverride > 0)) {
      cfg.lprCamerasOverride = 1;
    } else if (toggleKey === "enableVideoFailover" && (!cfg.failoverMode || cfg.failoverMode === "none") && !(cfg.standbyServerCount > 0)) {
      cfg.failoverMode = "all";
    } else if (toggleKey === "enableIntrusionPanels" && !(cfg.intrusionPanels > 0)) {
      cfg.intrusionPanels = 1;
    } else if (
      toggleKey === "enableBiometricsIdentity" &&
      !(cfg.supremaDevices > 0) &&
      !(cfg.supremaPluginServers > 0) &&
      !(cfg.supremaEndpoints > 0) &&
      !cfg.idemiaMorphoEnabled &&
      !(cfg.controlIdBridgeServers > 0) &&
      !(cfg.princetonIdentityServers > 0) &&
      !(cfg.idScannerClients > 0) &&
      !(cfg.xpressEntryServers > 0)
    ) {
      cfg.supremaDevices = 10;
      cfg.supremaPluginServers = 1;
    } else if (
      toggleKey === "enableCardholderSync" &&
      !(cfg.globalCardholderSystems > 0) &&
      !(cfg.cardSyncDataSources > 0)
    ) {
      cfg.globalCardholderSystems = 1;
      cfg.cardSyncDataSources = 2;
    } else if (
      toggleKey === "enableClearId" &&
      !(cfg.clearIdIdentities > 0) &&
      !(cfg.clearIdKiosks > 0)
    ) {
      cfg.clearIdIdentities = 500;
    } else if (toggleKey === "enableKeyManagement" && !(cfg.medecoXtLocks > 0) && !(cfg.keyCabinetCount > 0)) {
      cfg.medecoXtLocks = 10;
    } else if (
      toggleKey === "enableBuildingPsim" &&
      !(cfg.winGuardNodes > 0) &&
      !(cfg.elevatorDispatchSystems > 0) &&
      !(cfg.opcServerSystems > 0) &&
      !(cfg.missionControlOperators > 0)
    ) {
      cfg.winGuardNodes = 1;
    } else if (
      toggleKey === "enableRsa" &&
      (!cfg.rsaTier || cfg.rsaTier === "none") &&
      !(cfg.rsaShortRangeSensors > 0) &&
      !(cfg.rsaRadars > 0) &&
      !(cfg.rsaFenceControllers > 0) &&
      !(cfg.swmRpmUnits > 0)
    ) {
      cfg.rsaShortRangeSensors = 1;
    } else if (toggleKey === "enableFederation" && !(cfg.federationSites > 0) && !(cfg.federationSmallSites > 0)) {
      cfg.federationSites = 1;
    } else if (toggleKey === "enableIiot" && (!cfg.iiotMode || cfg.iiotMode === "none")) {
      cfg.iiotMode = "devices";
      cfg.iiotDevices = Math.max(1, cfg.iiotDevices || 1);
    } else if (toggleKey === "enableCloudServices" && !(cfg.cloudArchiveTb > 0) && !(cfg.clearanceCameras > 0)) {
      cfg.cloudArchiveTb = 2;
    }
  }

  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
  if (typeof updateProjectHealthUI === "function") updateProjectHealthUI();
}
window.toggleGenetecFeature = toggleGenetecFeature;

function toggleGenetecPartnerSdk(sdkKey, checked, defaultQty = 1) {
  if (typeof window.genetecLicensingConfig !== "object" || !window.genetecLicensingConfig) {
    window.genetecLicensingConfig = (typeof GenetecLicensingSizer !== "undefined")
      ? GenetecLicensingSizer.getDefaultConfig()
      : {};
  }
  const cfg = window.genetecLicensingConfig;
  if (typeof cfg.selectedPartnerSdks !== "object" || !cfg.selectedPartnerSdks) {
    cfg.selectedPartnerSdks = {};
  }
  if (checked) {
    cfg.enablePartnerSdks = true;
    cfg.selectedPartnerSdks[sdkKey] = Math.max(1, parseInt(defaultQty, 10) || 1);
  } else {
    delete cfg.selectedPartnerSdks[sdkKey];
    if (cfg.partnerSdkKey === sdkKey) {
      cfg.partnerSdkKey = "none";
    }
  }
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
  if (typeof updateProjectHealthUI === "function") updateProjectHealthUI();
}
window.toggleGenetecPartnerSdk = toggleGenetecPartnerSdk;

function setGenetecPartnerSdkQty(sdkKey, qty) {
  if (typeof window.genetecLicensingConfig !== "object" || !window.genetecLicensingConfig) {
    window.genetecLicensingConfig = (typeof GenetecLicensingSizer !== "undefined")
      ? GenetecLicensingSizer.getDefaultConfig()
      : {};
  }
  const cfg = window.genetecLicensingConfig;
  if (typeof cfg.selectedPartnerSdks !== "object" || !cfg.selectedPartnerSdks) {
    cfg.selectedPartnerSdks = {};
  }
  const n = Math.max(0, parseInt(qty, 10) || 0);
  if (n > 0) {
    cfg.enablePartnerSdks = true;
    cfg.selectedPartnerSdks[sdkKey] = n;
  } else {
    delete cfg.selectedPartnerSdks[sdkKey];
  }
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
  if (typeof updateProjectHealthUI === "function") updateProjectHealthUI();
}
window.setGenetecPartnerSdkQty = setGenetecPartnerSdkQty;

function autoFitStreamvaultToBom() {
  if (typeof GenetecLicensingSizer === "undefined" || typeof addToBOM !== "function") return;
  const licRes = GenetecLicensingSizer.calculate(projectBOM);
  const svPlan = licRes.streamvaultPlan || {};
  const addedModels = [];

  if (svPlan.primaryAppliance && svPlan.primaryQty > 0) {
    addToBOM(svPlan.primaryAppliance.id || svPlan.primaryAppliance.sku, svPlan.primaryQty);
    addedModels.push(`${svPlan.primaryQty}x ${svPlan.primaryAppliance.sku}`);
  }
  if (svPlan.directoryAppliance && svPlan.directoryQty > 0) {
    addToBOM(svPlan.directoryAppliance.id || svPlan.directoryAppliance.sku, svPlan.directoryQty);
    addedModels.push(`${svPlan.directoryQty}x ${svPlan.directoryAppliance.sku} (Directory)`);
  }
  if (svPlan.analyticsAppliance && svPlan.analyticsQty > 0) {
    addToBOM(svPlan.analyticsAppliance.id || svPlan.analyticsAppliance.sku, svPlan.analyticsQty);
    addedModels.push(`${svPlan.analyticsQty}x ${svPlan.analyticsAppliance.sku} (Analytics)`);
  }

  if (addedModels.length > 0 && typeof showToast === "function") {
    showToast(`Auto-Fitted Streamvault Hardware to BOM: ${addedModels.join(", ")}.`, "success");
  } else if (typeof showToast === "function") {
    showToast("Add cameras or set camera count first to auto-size Streamvault appliances.", "info");
  }
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
}
window.autoFitStreamvaultToBom = autoFitStreamvaultToBom;

function addGenetecLicensesToBom(skipConfirm = false) {
  if (typeof GenetecLicensingSizer === "undefined" || typeof addToBOM !== "function") return;
  const defs = (typeof StorageService !== "undefined" && typeof StorageService.getProjectDefaults === "function") ? StorageService.getProjectDefaults() : null;
  if (!skipConfirm && defs && typeof confirmProjectDefaultChange === "function") {
    if ((defs.vms?.licensingInScope ?? defs.vms?.headEndInScope) === false) {
      confirmProjectDefaultChange({
        title: "Software Licensing Marked Out of Orion Scope",
        settingLabel: "Orion Scope of Work • Software Licensing",
        defaultLabel: "Excluded / Out of Scope",
        newLabel: "Genetec 5.14 Software Licensing In Scope",
        message: `Your Project Scope currently marks Software Licensing as Out of Scope. Are you sure you want to quote Genetec software licenses in this BOM?`,
        allowLocalOverride: true,
        localOverrideLabel: "Add Licenses Once",
        updateDefaultLabel: "Enable Software Licensing in Project Scope",
        onLocalOverride: () => addGenetecLicensesToBom(true),
        onUpdateDefault: () => {
          if (typeof updateSingleProjectDefault === "function") {
            updateSingleProjectDefault(d => { if (!d.vms) d.vms = {}; d.vms.licensingInScope = true; d.vms.headEndInScope = true; d.vms.platform = "Genetec"; }, true);
          }
          addGenetecLicensesToBom(true);
        }
      });
      return;
    }
    const defVms = typeof mapProjectPlatformToVmsVendor === "function" ? mapProjectPlatformToVmsVendor(defs.vms?.platform) : "genetec";
    if (defVms !== "genetec") {
      confirmProjectDefaultChange({
        title: "Project Default VMS is Not Genetec",
        settingLabel: "VMS Software Platform Mismatch",
        defaultLabel: defs.vms?.platform || "Milestone XProtect",
        newLabel: "Genetec Security Center 5.14",
        message: `Your Project Default VMS Platform is set to "${defs.vms?.platform || 'Milestone XProtect'}". Are you sure you want to add Genetec Security Center licenses to the BOM?`,
        allowLocalOverride: true,
        localOverrideLabel: "Add Genetec Licenses Only",
        updateDefaultLabel: "Switch Project Default to Genetec & Add",
        onLocalOverride: () => addGenetecLicensesToBom(true),
        onUpdateDefault: () => {
          if (typeof updateSingleProjectDefault === "function") {
            updateSingleProjectDefault(d => { if (!d.vms) d.vms = {}; d.vms.platform = "Genetec"; }, true);
          }
          addGenetecLicensesToBom(true);
        }
      });
      return;
    }
  }
  const licRes = GenetecLicensingSizer.calculate(projectBOM);
  const items = licRes.lineItems || [];
  if (items.length === 0) {
    if (typeof showToast === "function") {
      showToast("Add cameras or configure client/add-on counts first to generate Genetec licenses.", "info");
    }
    return;
  }

  // Remove any previously added Genetec VMS software licenses to avoid duplicates when re-syncing
  const genetecCatalogIds = new Set(items.map(li => li.catalogId).filter(Boolean));
  [
    "genetec-gsc-base-s-513", "genetec-gsc-base-e-513",
    "genetec-gsc-om-s-base", "genetec-gsc-om-p-base", "genetec-gsc-base-514",
    "genetec-gsc-sv-aio-1c", "genetec-gsc-sv-aio-1pac", "genetec-gsc-sv-aio-1r",
    "genetec-gsc-om-s-1c", "genetec-gsc-om-p-1c", "genetec-gsc-1cam-lic",
    "genetec-gsc-om-s-1pac", "genetec-gsc-om-e-1pac", "genetec-gsc-om-e-1dv", "genetec-gsc-om-e-1bwc",
    "genetec-gsc-failover-1cam", "genetec-gsc-1fod", "genetec-gsc-standby-svr",
    "genetec-gsc-sy-s-1re", "genetec-gsc-sy-e-1re", "genetec-gsc-sy-s-1r", "genetec-gsc-sy-e-1r",
    "genetec-gsc-sy-e-1wr", "genetec-gsc-sy-s-vis", "genetec-gsc-sy-e-vis",
    "genetec-gsc-1u-client", "genetec-gsc-1stu-site", "genetec-gsc-1mobileu", "genetec-gsc-1mobilestu", "genetec-gsc-1wu",
    "genetec-pm-std-50", "genetec-pm-std-100", "genetec-pm-std-250", "genetec-pm-std-500", "genetec-pm-std-1000", "genetec-pm-std-site",
    "genetec-ad-integration", "genetec-federation", "genetec-federation-20", "genetec-stratocast-fed",
    "genetec-sy-e-1gchm", "genetec-sy-e-1gchmstu",
    "genetec-autovu-base", "genetec-autovu-1shp",
    "genetec-sipelia-base", "genetec-sipelia-1sip-std", "genetec-sipelia-1sip-adv",
    "genetec-adv-sip-s-1y", "genetec-adv-sip-s-3y", "genetec-adv-sip-s-5y",
    "genetec-adv-sip-a-1y", "genetec-adv-sip-a-3y", "genetec-adv-sip-a-5y",
    "genetec-sipelia-1sip", "genetec-sipelia-1trunk", "genetec-sipelia-1pa",
    "genetec-intrusion-1ap", "genetec-intrusion-dmp", "genetec-intrusion-dsc",
    "genetec-intrusion-honeywell", "genetec-intrusion-bosch-map5000", "genetec-intrusion-vanderbilt-spc",
    "genetec-gsc-1sdk", "genetec-sdk-lsp-netlink", "genetec-sdk-amg-ndm", "genetec-sdk-allied-streamconnect",
    "genetec-sdk-hid-is", "genetec-sdk-schlage-wifilock", "genetec-sdk-aa-accentra",
    "genetec-sdk-alcatraz-rock", "genetec-sdk-raptor-connect", "genetec-sdk-omnilert-gundetect",
    "genetec-sdk-senstar-nms", "genetec-sdk-commend-duetto",
    "genetec-sdk-suprema-biostar", "genetec-sdk-controlid-idbridge", "genetec-sdk-princeton-identity",
    "genetec-sdk-corsight-ai", "genetec-sdk-briefcam", "genetec-sdk-xpressentry", "genetec-sdk-advancis-winguard",
    "genetec-plugin-card-sync", "genetec-plugin-morpho-biometrics", "genetec-plugin-idscanner",
    "genetec-plugin-medeco-base", "genetec-plugin-offlinelock-1l",
    "genetec-clearid-id-1y-t1", "genetec-clearid-id-3y-t1", "genetec-clearid-id-5y-t1",
    "genetec-clearid-id-1y-t2", "genetec-clearid-id-3y-t2", "genetec-clearid-id-5y-t2",
    "genetec-clearid-id-1y-t3", "genetec-clearid-id-3y-t3", "genetec-clearid-id-5y-t3",
    "genetec-clearid-id-1y-t4", "genetec-clearid-id-3y-t4", "genetec-clearid-id-5y-t4",
    "genetec-clearid-kiosk-1y", "genetec-clearid-kiosk-3y", "genetec-clearid-kiosk-5y",
    "genetec-plugin-elevator-dispatch", "genetec-plugin-opc-server", "genetec-plugin-keycabinet-base",
    "genetec-plugin-keycabinet-1cab",
    "genetec-adv-mc-1opp-1y", "genetec-adv-mc-1opp-3y", "genetec-adv-mc-1opp-5y",
    "genetec-rsa-standard", "genetec-rsa-pro", "genetec-rsa-ent",
    "genetec-rsa-1srs", "genetec-rsa-1rad", "genetec-rsa-1fen",
    "genetec-rsa-1km", "genetec-rsa-10km", "genetec-rsa-100km", "genetec-plugin-swm-rpmii",
    "genetec-iiot-site", "genetec-iiot-1d",
    "genetec-cloud-perf-1tb", "genetec-cloud-lt-1tb", "genetec-clearance-1cam-1y",
    "genetec-adv-cam-aio-1y", "genetec-adv-cam-aio-3y", "genetec-adv-cam-aio-5y",
    "genetec-adv-cam-s-1y", "genetec-adv-cam-s-3y", "genetec-adv-cam-s-5y",
    "genetec-adv-cam-p-1y", "genetec-advantage-1cam-1yr", "genetec-adv-cam-e-3y", "genetec-adv-cam-e-5y",
    "genetec-adv-rdr-aio-1y", "genetec-adv-rdr-aio-3y", "genetec-adv-rdr-aio-5y",
    "genetec-adv-rdr-s-1y", "genetec-adv-rdr-s-3y", "genetec-adv-rdr-s-5y",
    "genetec-adv-rdr-e-1y", "genetec-adv-rdr-e-3y", "genetec-adv-rdr-e-5y",
    "genetec-adv-lpr-f-1y", "genetec-adv-lpr-f-3y", "genetec-adv-lpr-f-5y",
    "genetec-adv-sip-1y", "genetec-adv-sip-3y", "genetec-adv-sip-5y",
    "genetec-adv-1ap-1y", "genetec-adv-1ap-3y", "genetec-adv-1ap-5y",
    "genetec-adv-option-247-1y", "genetec-adv-option-247-3y", "genetec-adv-option-247-5y",
    "ms-sql-svr-2025-express", "ms-sql-svr-2022-std-4c"
  ].forEach(id => genetecCatalogIds.add(id));

  const genetecCatalogSkus = new Set(items.map(li => li.sku).filter(Boolean));
  if (Array.isArray(projectBOM)) {
    for (let i = projectBOM.length - 1; i >= 0; i--) {
      const bItem = projectBOM[i]?.item || projectBOM[i];
      if (!bItem) continue;
      const isGenetecVms = genetecCatalogIds.has(bItem.id) ||
        genetecCatalogSkus.has(bItem.sku) ||
        (bItem.vendor === "Genetec" && (bItem.category === "vms_software" || String(bItem.role || "").includes("License") || String(bItem.role || "").includes("Maintenance")));
      if (isGenetecVms) {
        projectBOM.splice(i, 1);
      }
    }
  }

  window._bypassLicScopePromptOnce = true;
  try {
    items.forEach(li => {
      if (li.catalogId && li.qty > 0) {
        addToBOM(li.catalogId, li.qty, null, true);
      }
    });
  } finally {
    window._bypassLicScopePromptOnce = false;
  }

  if (typeof updateBOMView === "function") updateBOMView();
  if (typeof updateProjectHealthUI === "function") updateProjectHealthUI();
  if (typeof showToast === "function") {
    showToast(`Synchronized ${items.length} Genetec Security Center License and Software Maintenance line item(s) ($${licRes.totalSoftwareMsrp.toLocaleString()} MSRP) to Bill of Materials.`, "success");
  }
  if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
}
window.addGenetecLicensesToBom = addGenetecLicensesToBom;

function addTurnkeyGenetecPackageToBom() {
  autoFitStreamvaultToBom();
  addGenetecLicensesToBom();
}
window.addTurnkeyGenetecPackageToBom = addTurnkeyGenetecPackageToBom;

function renderGenetecLicensingBuilderHtml(licRes, isEmbeddedInServers = false) {
  if (!licRes) return "";
  const cfg = licRes.config || {};
  const svPlan = licRes.streamvaultPlan || {};
  const prim = svPlan.primaryAppliance;
  const vLoad = licRes.videoLoad || {};
  const coreFailover = licRes.coreFailover || cfg.coreFailover || "none";
  const needsSqlStd = Boolean(licRes.needsSqlStandard);
  const mrSpec = licRes.multiRoleServerSpec || {};
  const partnerSdkOptions = (typeof GenetecLicensingSizer !== "undefined" && Array.isArray(GenetecLicensingSizer.PARTNER_SDK_OPTIONS))
    ? GenetecLicensingSizer.PARTNER_SDK_OPTIONS
    : [];

  const tierBadgeMap = {
    aio: {
      label: "Streamvault All-in-One Tier (Up to 32 Cameras • $0.00 Base)",
      color: "bg-sky-500/20 border-sky-500/40 text-sky-300"
    },
    standard: {
      label: "Security Center Base Standard Package — GSC-BASE-S ($0.00 Base • Up to 100 Cameras / 100 Readers / 25 Clients)",
      color: "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
    },
    enterprise: {
      label: "Security Center Base Enterprise Package — GSC-BASE-E ($0.00 Base • Unlimited Cameras, Readers & Clients)",
      color: "bg-indigo-500/20 border-indigo-500/40 text-indigo-300"
    }
  };
  const activeTierBadge = tierBadgeMap[licRes.effectiveTier] || tierBadgeMap.enterprise;

  return `
    <div class="${isEmbeddedInServers ? 'bg-slate-950/90 border border-indigo-500/30 rounded-xl p-3.5' : 'bg-slate-900/95 border border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-lg'} flex flex-col gap-3.5 max-h-[75vh] overflow-y-auto overscroll-contain custom-scrollbar">
      <!-- Header Row -->
      <div class="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pb-2.5 border-b border-slate-800/80">
        <div class="flex items-start sm:items-center gap-3">
          <div class="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 shrink-0">
            <i data-lucide="key" class="w-5 h-5"></i>
          </div>
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <h4 class="text-xs font-bold text-white uppercase tracking-wider">
                Genetec Security Center 5.13 / 5.14 Unified License &amp; Streamvault Designer
              </h4>
              <span class="px-2 py-0.5 rounded border text-[10px] font-bold ${activeTierBadge.color}">
                ${activeTierBadge.label}
              </span>
              <span class="px-2 py-0.5 rounded border text-[10px] font-bold ${needsSqlStd ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'}">
                ${needsSqlStd ? 'Database: Microsoft SQL Server Standard ($1,418 • Full Core Failover)' : 'Database: Microsoft SQL Server 2025 Express (50 GB Cap • Included Default, Not on BOM)'}
              </span>
              <a href="Datasheets/Genetec/ProductCompatability.pdf" target="_blank" class="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold flex items-center gap-1 transition">
                <i data-lucide="file-text" class="w-3 h-3 text-indigo-400"></i>
                <span>Product Compatibility</span>
              </a>
              <a href="Datasheets/Genetec/SystemRequirements.pdf" target="_blank" class="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold flex items-center gap-1 transition">
                <i data-lucide="file-text" class="w-3 h-3 text-purple-400"></i>
                <span>System Requirements</span>
              </a>
              <a href="Datasheets/Genetec/SupportedPlugins.pdf" target="_blank" class="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold flex items-center gap-1 transition">
                <i data-lucide="plug" class="w-3 h-3 text-emerald-400"></i>
                <span>Supported Plugins</span>
              </a>
            </div>
            <p class="text-[11px] text-slate-400 mt-0.5">
              Synchronized with <strong class="text-white">${licRes.cameraUnits} IP Camera Connections</strong>${licRes.totalSynergisReaders > 0 ? ` and <strong class="text-white">${licRes.totalSynergisReaders} Synergis Access Control Reader Connections</strong>` : ''} (${vLoad.requiredUsableTb || 0} TB Usable Storage / ${vLoad.peakIngressMbps || 0} Mbps Recording Bitrate / ${vLoad.genetec?.activeArchiverRoles || 1} Archiver Role${(vLoad.genetec?.activeArchiverRoles || 1) === 1 ? '' : 's'}).
            </p>
          </div>
        </div>

        <!-- Summary & One-Click Actions -->
        <div class="flex flex-wrap items-center gap-2 shrink-0">
          <div class="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-right">
            <div class="text-[9px] uppercase font-bold text-slate-400">Software + ${licRes.advantageYears}-Year Maintenance</div>
            <div class="text-sm font-mono font-extrabold text-emerald-400">$${licRes.totalSoftwareMsrp.toLocaleString()}</div>
          </div>
          <div class="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-right">
            <div class="text-[9px] uppercase font-bold text-slate-400">Streamvault Hardware</div>
            <div class="text-sm font-mono font-extrabold text-indigo-400">$${licRes.totalHardwareMsrp.toLocaleString()}</div>
          </div>
          <button
            type="button"
            onclick="addGenetecLicensesToBom()"
            class="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <i data-lucide="key" class="w-4 h-4"></i>
            <span>+ Synchronize Licenses to Bill of Materials</span>
          </button>
          <button
            type="button"
            onclick="addTurnkeyGenetecPackageToBom()"
            class="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            title="Adds both the recommended Streamvault Hardware Appliance(s) and all calculated Genetec Security Center Licenses to the Bill of Materials"
          >
            <i data-lucide="package-check" class="w-4 h-4"></i>
            <span>+ Add Turnkey Hardware + Licenses ($${licRes.combinedTurnkeyMsrp.toLocaleString()})</span>
          </button>
        </div>
      </div>

      <!-- Bundled Features Included at $0.00 in Security Center 5.13 / 5.14 Unified Base Package -->
      ${Array.isArray(licRes.includedBaseFeatures) && licRes.includedBaseFeatures.length > 0 ? `
        <div class="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-[11px] flex flex-col gap-1.5">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <span class="font-bold uppercase tracking-wider text-[10px] text-emerald-300 flex items-center gap-1.5">
              <i data-lucide="check-circle-2" class="w-3.5 h-3.5 text-emerald-400"></i>
              <span>Included at $0.00 in ${licRes.effectiveTier === 'standard' ? 'Security Center Base Standard Package (GSC-BASE-S)' : 'Security Center Base Enterprise Package (GSC-BASE-E)'}</span>
            </span>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-x-4 gap-y-1 text-slate-300 text-[10px]">
            ${licRes.includedBaseFeatures.map(f => `
              <div class="flex items-center gap-1.5">
                <span class="text-emerald-400 font-bold">&#10003;</span>
                <span>${f.label}</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Compatibility Warnings Banner (if any) -->
      ${licRes.compatibilityWarnings && licRes.compatibilityWarnings.length > 0 ? `
        <div class="p-2.5 rounded-xl bg-amber-950/50 border border-amber-500/40 text-amber-200 text-[11px] space-y-1">
          <div class="font-bold uppercase tracking-wider text-[10px] text-amber-400 flex items-center gap-1.5">
            <i data-lucide="alert-triangle" class="w-3.5 h-3.5"></i>
            <span>Genetec Tier Compatibility Notice (ProductCompatability.pdf)</span>
          </div>
          ${licRes.compatibilityWarnings.map(w => `<div class="pl-5">&bull; ${w}</div>`).join('')}
        </div>
      ` : ''}

      <!-- Configuration Controls Grid (6 Cards across 3 columns on XL) -->
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 text-xs">
        <!-- Card 1: Main System — Base Package, Core Failover, Clients, Federation & Global Cardholder / Card Sync -->
        <div class="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3 space-y-2">
          <div class="text-[10px] font-bold uppercase tracking-wider text-indigo-400 flex items-center justify-between">
            <span>1. Main System, Core, Federation &amp; Card Sync</span>
            <span class="font-mono text-emerald-400">${needsSqlStd ? 'SQL Standard ($1,418)' : 'SQL 2025 Express (50 GB)'}</span>
          </div>
          <div>
            <label class="text-[10px] text-slate-400 block mb-1">Security Center Base Package Tier:</label>
            <select onchange="setGenetecLicParam('tierMode', this.value)" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs font-bold text-white focus:outline-none">
              <option value="auto" ${cfg.tierMode === 'auto' ? 'selected' : ''}>Automatically Select Tier (${licRes.effectiveTier === 'aio' ? 'Streamvault All-in-One' : licRes.effectiveTier === 'standard' ? 'Standard Base Package' : 'Enterprise Base Package'})</option>
              <option value="aio" ${cfg.tierMode === 'aio' ? 'selected' : ''}>Streamvault All-in-One Tier (Up to 32 Cameras • $0.00 Base, $120/camera)</option>
              <option value="standard" ${cfg.tierMode === 'standard' ? 'selected' : ''}>Security Center Base Standard Package — GSC-BASE-S ($0.00 Base, $200/camera)</option>
              <option value="enterprise" ${cfg.tierMode === 'enterprise' ? 'selected' : ''}>Security Center Base Enterprise Package — GSC-BASE-E ($0.00 Base, $325/camera)</option>
            </select>
          </div>
          <div>
            <label class="text-[10px] text-slate-400 block mb-1" title="Microsoft SQL Server 2025 Express (50 GB Database Cap, Included Default, omitted from BOM) stays in play for None and Directory Only (Backup and Restore). Automatically switches to Microsoft SQL Server Standard ($1,418) only when Core Failover is set to Full.">
              Core Failover &amp; Microsoft SQL Server Edition:
            </label>
            <select onchange="setGenetecLicParam('coreFailover', this.value)" class="w-full bg-slate-900 border ${needsSqlStd ? 'border-amber-500/60 text-amber-300' : 'border-emerald-500/50 text-emerald-300'} rounded-lg px-2 py-1.5 text-xs font-bold focus:outline-none">
              <option value="none" ${coreFailover === 'none' ? 'selected' : ''}>None — Microsoft SQL Server 2025 Express (50 GB Cap • Not Listed on BOM)</option>
              <option value="directory_only" ${coreFailover === 'directory_only' ? 'selected' : ''}>Directory Only (Backup and Restore) — SQL 2025 Express (50 GB Cap • Not on BOM)</option>
              <option value="full" ${coreFailover === 'full' ? 'selected' : ''}>Full (Core + Database Failover) — Upgrades to SQL Server Standard ($1,418)</option>
            </select>
          </div>
          <div class="grid grid-cols-3 gap-2 pt-1 border-t border-slate-800/80">
            <div>
              <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Security Desk Operator Workstation Connections (25 included in Standard Base; Unlimited Site Login License included in Enterprise Base)">
                Workstations:
              </label>
              <input type="number" min="1" max="500" value="${licRes.workstationClients}" onchange="setGenetecLicParam('workstationClients', Math.max(1, parseInt(this.value,10)||5))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-white" />
            </div>
            <div>
              <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Genetec Mobile Application Connections ($250 per concurrent user via GSC-1MobileU, or $10,000 Unlimited Site License via GSC-1MobileSTU at 40+ users)">
                Mobile Users:
              </label>
              <input type="number" min="0" max="500" value="${licRes.mobileClients}" onchange="setGenetecLicParam('mobileClients', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-sky-300" />
            </div>
            <div>
              <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Security Center Web Client Connections ($200 per user via GSC-1WU; included at $0.00 in Enterprise Site Login License)">
                Web Clients:
              </label>
              <input type="number" min="0" max="500" value="${licRes.webClients || 0}" onchange="setGenetecLicParam('webClients', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-sky-300" />
            </div>
          </div>

          <!-- Feature Toggle: Multi-Site Security Center Federation (Moved to Main System & Core) -->
          <div class="rounded-lg border ${licRes.enableFederation ? 'border-indigo-500/40 bg-indigo-950/20' : 'border-slate-800/90 bg-slate-900/50'} p-2 space-y-1.5 transition-all">
            <div class="flex items-center justify-between gap-2">
              <label class="flex items-center gap-2 cursor-pointer select-none flex-1">
                <input type="checkbox" ${licRes.enableFederation ? 'checked' : ''} onchange="toggleGenetecFeature('enableFederation', this.checked)" class="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-0" />
                <span class="text-[11px] font-bold ${licRes.enableFederation ? 'text-indigo-300' : 'text-slate-300'}">Multi-Site Security Center Federation</span>
              </label>
              <span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${licRes.enableFederation ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40' : 'bg-slate-800 text-slate-400'}">${licRes.enableFederation ? 'ON' : 'OFF'}</span>
            </div>
            ${licRes.enableFederation ? `
              <div class="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
                <div>
                  <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Federated Remote Security Center Sites with Over 20 Entities (GSC-1SCFED @ $1,000 per site)">
                    Federated Sites (&gt;20 Entities • $1k):
                  </label>
                  <input type="number" min="0" max="100" value="${cfg.federationSites || 0}" onchange="setGenetecLicParam('federationSites', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-white" />
                </div>
                <div>
                  <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Federated Remote Security Center Sites with 20 Entities or Fewer (GSC-1SCFED-20 @ $600 per site)">
                    Small Federated Sites (&le;20 • $600):
                  </label>
                  <input type="number" min="0" max="100" value="${cfg.federationSmallSites || 0}" onchange="setGenetecLicParam('federationSmallSites', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-white" />
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Feature Toggle: Global Cardholder Synchronizer & Card Synchronization Plugin (Moved to Main System & Core) -->
          <div class="rounded-lg border ${licRes.enableCardholderSync ? 'border-emerald-500/40 bg-emerald-950/20' : 'border-slate-800/90 bg-slate-900/50'} p-2 space-y-1.5 transition-all">
            <div class="flex items-center justify-between gap-2">
              <label class="flex items-center gap-2 cursor-pointer select-none flex-1">
                <input type="checkbox" ${licRes.enableCardholderSync ? 'checked' : ''} onchange="toggleGenetecFeature('enableCardholderSync', this.checked)" class="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0" />
                <span class="text-[11px] font-bold ${licRes.enableCardholderSync ? 'text-emerald-300' : 'text-slate-300'}">Global Cardholder Synchronizer &amp; Card Sync Plugin</span>
              </label>
              <span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${licRes.enableCardholderSync ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'}">${licRes.enableCardholderSync ? 'ON' : 'OFF'}</span>
            </div>
            ${licRes.enableCardholderSync ? `
              <div class="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
                <div>
                  <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Global Cardholder Synchronizer / Management — Synchronizes cardholders & credentials across independent Security Center systems (GSC-Sy-E-1GCHM @ $1,950/remote system; Unlimited Site License GSC-SY-E-1GCHMSTU @ $78,000 at 40+ systems)">
                    Global Cardholder Systems ($1.95k):
                  </label>
                  <input type="number" min="0" max="200" value="${licRes.globalCardholderSystems || 0}" onchange="setGenetecLicParam('globalCardholderSystems', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-emerald-300" />
                </div>
                <div>
                  <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Card Synchronization Plugin External HR/SQL/CSV/Oracle Data Sources (GSC-1PSINGLECARD @ $4,000 per 2 data sources)">
                    Card Sync Data Sources ($4k/2):
                  </label>
                  <input type="number" min="0" max="50" value="${licRes.cardSyncDataSources || 0}" onchange="setGenetecLicParam('cardSyncDataSources', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-emerald-300" />
                </div>
              </div>
            ` : ''}
          </div>

          <div class="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
            <div>
              <label class="text-[10px] text-slate-400 block mb-1">Genetec Advantage Maintenance Term:</label>
              <select onchange="setGenetecLicParam('advantageYears', parseInt(this.value, 10) || 1)" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] font-bold text-emerald-300 focus:outline-none">
                <option value="1" ${licRes.advantageYears === 1 ? 'selected' : ''}>1-Year Software Maintenance</option>
                <option value="3" ${licRes.advantageYears === 3 ? 'selected' : ''}>3-Year Software Maintenance (Discounted)</option>
                <option value="5" ${licRes.advantageYears === 5 ? 'selected' : ''}>5-Year Software Maintenance (Matches 5-Year Hardware)</option>
              </select>
            </div>
            <div class="flex flex-col justify-end pb-1">
              <label class="flex items-center gap-1.5 text-[10px] text-slate-300 cursor-pointer" title="Genetec Advantage 24/7 Technical Assistance Center Support Upgrade (ADV-OPTION-247-1Y/3Y/5Y)">
                <input type="checkbox" ${cfg.advantage247 ? 'checked' : ''} onchange="setGenetecLicParam('advantage247', this.checked)" class="rounded border-slate-700 bg-slate-900 text-emerald-500" />
                <span>24/7 Technical Assistance Center Support</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Card 2: Omnicast Video, Sipelia Intercom, AutoVu LPR & Cloud Archives -->
        <div class="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3 space-y-2">
          <div class="text-[10px] font-bold uppercase tracking-wider text-sky-400 flex items-center justify-between">
            <span>2. Video, Sipelia Intercom, LPR &amp; Cloud Archives</span>
            <span class="font-mono text-white">${licRes.cameraUnits} IP Cameras ($${licRes.effectiveTier === 'aio' ? 120 : licRes.effectiveTier === 'standard' ? 200 : 325} per Camera)</span>
          </div>

          <!-- Feature Toggle: Sipelia Intercom (Standard / Advanced / Unified) -->
          <div class="rounded-lg border ${licRes.enableSipelia ? 'border-sky-500/40 bg-sky-950/20' : 'border-slate-800/90 bg-slate-900/50'} p-2 space-y-2 transition-all">
            <div class="flex items-center justify-between gap-2">
              <label class="flex items-center gap-2 cursor-pointer select-none flex-1">
                <input type="checkbox" ${licRes.enableSipelia ? 'checked' : ''} onchange="toggleGenetecFeature('enableSipelia', this.checked)" class="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-0" />
                <span class="text-[11px] font-bold ${licRes.enableSipelia ? 'text-sky-300' : 'text-slate-300'}">Sipelia SIP Intercom (Standard / Advanced / Unified)</span>
              </label>
              <div class="flex items-center gap-1.5">
                <a href="Datasheets/Genetec/Plugins/EN.Sipelia User Guide 2.14.0.0.pdf" target="_blank" class="text-[9px] text-sky-400 hover:underline">2.14 PDF</a>
                <span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${licRes.enableSipelia ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' : 'bg-slate-800 text-slate-400'}">${licRes.enableSipelia ? 'ON' : 'OFF'}</span>
              </div>
            </div>
            ${licRes.enableSipelia ? `
              <div class="space-y-1.5 pt-1 border-t border-slate-800/80">
                <select onchange="setGenetecLicParam('sipeliaMode', this.value)" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[10px] font-bold text-sky-300 focus:outline-none">
                  <option value="unified_513" ${licRes.sipeliaMode === 'unified_513' ? 'selected' : ''}>Unified SC 5.11–5.14 — GSC-SIPELIA-1SIP ($250/station • Base, Failover, Recording, Trunks &amp; PA Included)</option>
                  <option value="standard" ${licRes.sipeliaMode === 'standard' ? 'selected' : ''}>Sipelia Standard (Legacy) — GSC-Sipelia-Base ($1,500) + GSC-Sipelia-1SIP-STD ($160/station)</option>
                  <option value="advanced" ${licRes.sipeliaMode === 'advanced' ? 'selected' : ''}>Sipelia Advanced (Legacy) — Base ($1,500) + 1SIP-STD ($160) + 1SIP-ADV ($100 Failover &amp; Recording)</option>
                </select>
                <div class="grid grid-cols-3 gap-2">
                  <div>
                    <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Sipelia SIP Intercom Station Count">
                      SIP Stations:
                    </label>
                    <input type="number" min="0" max="500" value="${licRes.effectiveSipIntercoms || 0}" onchange="setGenetecLicParam('sipIntercomsOverride', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-sky-300" />
                  </div>
                  <div>
                    <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Sipelia SIP Trunk Connections to external VoIP PBX or Intercom Server (GSC-Sipelia-1Trunk $550)">
                      SIP Trunks ($550):
                    </label>
                    <input type="number" min="0" max="100" value="${licRes.sipTrunks || 0}" onchange="setGenetecLicParam('sipTrunks', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-sky-300" />
                  </div>
                  <div>
                    <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Sipelia Public Address (PA) Voice Paging Connections (GSC-SIPELIA-1PA $550)">
                      Public Address:
                    </label>
                    <input type="number" min="0" max="100" value="${licRes.sipPublicAddress || 0}" onchange="setGenetecLicParam('sipPublicAddress', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-sky-300" />
                  </div>
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Feature Toggle: AutoVu Fixed License Plate Recognition (LPR) -->
          <div class="rounded-lg border ${licRes.enableLpr ? 'border-amber-500/40 bg-amber-950/20' : 'border-slate-800/90 bg-slate-900/50'} p-2 space-y-1.5 transition-all">
            <div class="flex items-center justify-between gap-2">
              <label class="flex items-center gap-2 cursor-pointer select-none flex-1">
                <input type="checkbox" ${licRes.enableLpr ? 'checked' : ''} onchange="toggleGenetecFeature('enableLpr', this.checked)" class="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-0" />
                <span class="text-[11px] font-bold ${licRes.enableLpr ? 'text-amber-300' : 'text-slate-300'}">AutoVu Fixed License Plate Recognition (LPR)</span>
              </label>
              <span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${licRes.enableLpr ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-400'}">${licRes.enableLpr ? `${licRes.effectiveLprCameras} Camera(s)` : 'OFF'}</span>
            </div>
            ${licRes.enableLpr ? `
              <div class="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
                <label class="text-[10px] text-slate-300 font-semibold" title="AutoVu Fixed Sharp License Plate Recognition Camera Connections (GSC-Av-S-1SHP $500 + Advantage Maintenance; AutoVu Standard Base is included at $0.00)">
                  Fixed Sharp LPR Camera Connections (<code class="text-amber-300">GSC-Av-S-1SHP</code> @ $500):
                </label>
                <input type="number" min="0" max="200" value="${licRes.effectiveLprCameras}" onchange="setGenetecLicParam('lprCamerasOverride', Math.max(0, parseInt(this.value,10)||0))" class="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-amber-300" />
              </div>
            ` : ''}
          </div>

          <!-- Feature Toggle: Analog Video Encoders & 3rd-Party DVR/NVR -->
          <div class="rounded-lg border ${licRes.enableEncodersDvr ? 'border-sky-500/40 bg-sky-950/20' : 'border-slate-800/90 bg-slate-900/50'} p-2 space-y-1.5 transition-all">
            <div class="flex items-center justify-between gap-2">
              <label class="flex items-center gap-2 cursor-pointer select-none flex-1">
                <input type="checkbox" ${licRes.enableEncodersDvr ? 'checked' : ''} onchange="toggleGenetecFeature('enableEncodersDvr', this.checked)" class="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-0" />
                <span class="text-[11px] font-bold ${licRes.enableEncodersDvr ? 'text-sky-300' : 'text-slate-300'}">Analog Video Encoders &amp; 3rd-Party DVR/NVR Channels</span>
              </label>
              <span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${licRes.enableEncodersDvr ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' : 'bg-slate-800 text-slate-400'}">${licRes.enableEncodersDvr ? 'ON' : 'OFF'}</span>
            </div>
            ${licRes.enableEncodersDvr ? `
              <div class="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
                <div>
                  <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Analog Video Encoder Channel Connections (GSC-OM-S-1PAC $60 / GSC-OM-E-1PAC $100 / GSC-SV-AIO-1PAC $36)">
                    Analog Encoder Channels:
                  </label>
                  <input type="number" min="0" max="1000" value="${licRes.analogEncoderChannels || 0}" onchange="setGenetecLicParam('analogEncoderChannels', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-white" />
                </div>
                <div>
                  <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Third-Party Digital Video Recorder or Network Video Recorder Input Channels (GSC-Om-E-1DV $130)">
                    3rd-Party DVR/NVR Channels:
                  </label>
                  <input type="number" min="0" max="1000" value="${licRes.dvrNvrChannels || 0}" onchange="setGenetecLicParam('dvrNvrChannels', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-white" />
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Feature Toggle: Standby Archiver & High-Availability Clustering -->
          <div class="rounded-lg border ${licRes.enableVideoFailover ? 'border-indigo-500/40 bg-indigo-950/20' : 'border-slate-800/90 bg-slate-900/50'} p-2 space-y-1.5 transition-all">
            <div class="flex items-center justify-between gap-2">
              <label class="flex items-center gap-2 cursor-pointer select-none flex-1">
                <input type="checkbox" ${licRes.enableVideoFailover ? 'checked' : ''} onchange="toggleGenetecFeature('enableVideoFailover', this.checked)" class="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-0" />
                <span class="text-[11px] font-bold ${licRes.enableVideoFailover ? 'text-indigo-300' : 'text-slate-300'}">Standby Archiver &amp; 3rd-Party HA Standby Servers</span>
              </label>
              <span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${licRes.enableVideoFailover ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40' : 'bg-slate-800 text-slate-400'}">${licRes.enableVideoFailover ? 'ON' : 'OFF'}</span>
            </div>
            ${licRes.enableVideoFailover ? `
              <div class="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
                <div>
                  <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold">
                    Standby Archiver ${licRes.effectiveTier === 'enterprise' ? '<span class="text-emerald-400 font-bold">($0.00 Enterprise)</span>' : '($45 per Camera)'}:
                  </label>
                  <select onchange="setGenetecLicParam('failoverMode', this.value)" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-1.5 py-1 text-[10px] font-bold text-white focus:outline-none">
                    <option value="none" ${cfg.failoverMode === 'none' ? 'selected' : ''}>No Standby Archiver</option>
                    <option value="all" ${cfg.failoverMode === 'all' ? 'selected' : ''}>All ${licRes.cameraUnits} Cameras</option>
                    <option value="custom" ${cfg.failoverMode === 'custom' ? 'selected' : ''}>Custom Camera Count</option>
                  </select>
                </div>
                <div>
                  <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Third-Party High-Availability Clustering Standby Server License (GSC-StandbyServer @ $1,500 per server)">
                    3rd-Party HA Servers ($1.5k):
                  </label>
                  <input type="number" min="0" max="50" value="${cfg.standbyServerCount || 0}" onchange="setGenetecLicParam('standbyServerCount', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-white" />
                </div>
              </div>
              ${cfg.failoverMode === 'custom' ? `
                <div class="flex items-center justify-between gap-2 pt-1">
                  <label class="text-[10px] text-slate-300 font-semibold">Custom Failover Camera Channels:</label>
                  <input type="number" min="1" max="${Math.max(1, licRes.cameraUnits)}" value="${cfg.failoverCamerasCustom || licRes.cameraUnits || 1}" onchange="setGenetecLicParam('failoverCamerasCustom', Math.max(0, parseInt(this.value,10)||0))" class="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-indigo-300" />
                </div>
              ` : ''}
            ` : ''}
          </div>

          <!-- Feature Toggle: Cloud Archives & Genetec Clearance (Moved under Video) -->
          <div class="rounded-lg border ${licRes.enableCloudServices ? 'border-sky-500/40 bg-sky-950/20' : 'border-slate-800/90 bg-slate-900/50'} p-2 space-y-1.5 transition-all">
            <div class="flex items-center justify-between gap-2">
              <label class="flex items-center gap-2 cursor-pointer select-none flex-1">
                <input type="checkbox" ${licRes.enableCloudServices ? 'checked' : ''} onchange="toggleGenetecFeature('enableCloudServices', this.checked)" class="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-0" />
                <span class="text-[11px] font-bold ${licRes.enableCloudServices ? 'text-sky-300' : 'text-slate-300'}">Cloud Archives &amp; Genetec Clearance Evidence</span>
              </label>
              <span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${licRes.enableCloudServices ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' : 'bg-slate-800 text-slate-400'}">${licRes.enableCloudServices ? 'ON' : 'OFF'}</span>
            </div>
            ${licRes.enableCloudServices ? `
              <div class="grid grid-cols-3 gap-2 pt-1 border-t border-slate-800/80">
                <div>
                  <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold">Cloud Tier:</label>
                  <select onchange="setGenetecLicParam('cloudArchiveTier', this.value)" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-1 py-1 text-[10px] font-bold text-sky-300 focus:outline-none">
                    <option value="performance" ${cfg.cloudArchiveTier !== 'long_term' ? 'selected' : ''}>Performance ($257/TB)</option>
                    <option value="long_term" ${cfg.cloudArchiveTier === 'long_term' ? 'selected' : ''}>Long-Term ($122/TB)</option>
                  </select>
                </div>
                <div>
                  <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold">Archive TB:</label>
                  <input type="number" min="0" max="500" value="${cfg.cloudArchiveTb || 0}" onchange="setGenetecLicParam('cloudArchiveTb', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-sky-300" />
                </div>
                <div>
                  <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold">Clearance Cameras:</label>
                  <input type="number" min="0" max="1000" value="${cfg.clearanceCameras || 0}" onchange="setGenetecLicParam('clearanceCameras', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-sky-300" />
                </div>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Card 3: Synergis Access Control Readers, Biometrics, ClearID & Key Management -->
        <div class="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3 space-y-2">
          <div class="text-[10px] font-bold uppercase tracking-wider text-purple-400 flex items-center justify-between">
            <span>3. Synergis Access Readers, Biometrics &amp; Identity</span>
            <span class="font-mono text-purple-300">${licRes.totalSynergisReaders || 0} Readers</span>
          </div>
          <!-- Always-Visible Core Synergis Reader Counts -->
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Synergis Access Control Reader Connections for Hardware Purchased from Genetec — Cloud Link, Axis Powered by Genetec, and Mercury Panels (GSC-SY-S-1RE $65 / GSC-SY-E-1RE $125)">
                Genetec-Supplied Readers:
              </label>
              <input type="number" min="0" max="2000" value="${licRes.synergisGenetecReaders || 0}" onchange="setGenetecLicParam('synergisGenetecReaders', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-purple-300" />
            </div>
            <div>
              <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Synergis Access Control External Reader Connections when Controller Hardware is Not Purchased from Genetec (GSC-Sy-S-1R $175 / GSC-Sy-E-1R $260)">
                Third-Party Hardware Readers:
              </label>
              <input type="number" min="0" max="2000" value="${licRes.synergisExternalReaders || 0}" onchange="setGenetecLicParam('synergisExternalReaders', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-purple-300" />
            </div>
          </div>

          <!-- Feature Toggle: Biometrics (Suprema Plugin v1.00, IDEMIA, iDBridge, Princeton) & ID/XpressEntry -->
          <div class="rounded-lg border ${licRes.enableBiometricsIdentity ? 'border-purple-500/40 bg-purple-950/20' : 'border-slate-800/90 bg-slate-900/50'} p-2 space-y-1.5 transition-all">
            <div class="flex items-center justify-between gap-2">
              <label class="flex items-center gap-2 cursor-pointer select-none flex-1">
                <input type="checkbox" ${licRes.enableBiometricsIdentity ? 'checked' : ''} onchange="toggleGenetecFeature('enableBiometricsIdentity', this.checked)" class="rounded border-slate-700 bg-slate-900 text-purple-500 focus:ring-0" />
                <span class="text-[11px] font-bold ${licRes.enableBiometricsIdentity ? 'text-purple-300' : 'text-slate-300'}">Biometrics (Suprema, IDEMIA, iDBridge, Princeton) &amp; ID/XpressEntry</span>
              </label>
              <div class="flex items-center gap-1.5">
                <a href="Datasheets/Genetec/Plugins/Suprema_Genetec_Security_Center_Integration.pdf" target="_blank" class="text-[9px] text-purple-300 hover:underline">Suprema PDF</a>
                <span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${licRes.enableBiometricsIdentity ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' : 'bg-slate-800 text-slate-400'}">${licRes.enableBiometricsIdentity ? 'ON' : 'OFF'}</span>
              </div>
            </div>
            ${licRes.enableBiometricsIdentity ? `
              <div class="space-y-2 pt-1 border-t border-slate-800/80">
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Number of Suprema Biometric Readers/Devices (Each device assigned to a door requires 1x GSC-Sy-X-1R(E) door reader license; <=50 Suprema devices per dedicated Synergis Cloud Link with RIO enabled)">
                      Suprema Devices (Doors):
                    </label>
                    <input type="number" min="0" max="1000" value="${licRes.supremaDevices || 0}" onchange="setGenetecLicParam('supremaDevices', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-purple-300" />
                  </div>
                  <div>
                    <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Suprema Plugin Servers — Requires 3x GSC-1SDK-SUPREMA-READ ($250) per Server (1 license = 2 connections: 2 Config Tool + 1 Security Desk + 1 Suprema Extractor Plugin + 1 Suprema Device Plugin supporting up to 4 Cloud Links / 256 devices per Suprema Guide Page 16)">
                      Suprema Servers (3x SDK per Server):
                    </label>
                    <input type="number" min="0" max="50" value="${licRes.supremaPluginServers || 0}" onchange="setGenetecLicParam('supremaPluginServers', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-purple-300" />
                  </div>
                </div>
                ${licRes.supremaSdkConnections > 0 ? `
                  <div class="p-1.5 rounded bg-purple-950/40 border border-purple-500/30 text-[9px] text-purple-200 leading-tight">
                    <span class="font-bold text-purple-300">Suprema Licensing (Page 16):</span> <code class="text-white">${licRes.supremaSdkConnections}x GSC-1SDK-SUPREMA-READ</code> ($${(licRes.supremaSdkConnections * 250).toLocaleString()}) + Suprema <code class="text-white">INT_GEN_GSC</code> plugin license + <strong class="text-white">${licRes.supremaCloudLinksNeeded} Dedicated Cloud Link(s)</strong> (&le;50 Devices per Cloud Link, RIO enabled) + 1x <code class="text-white">GSC-Sy-X-1R(E)</code> per door.
                  </div>
                ` : ''}
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Control iD iDBridge Server Instances (GSC-1SDK-CONTROLID-IDBRIDGE @ $250/server)">
                      iDBridge Servers ($250):
                    </label>
                    <input type="number" min="0" max="50" value="${licRes.controlIdBridgeServers || 0}" onchange="setGenetecLicParam('controlIdBridgeServers', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-purple-300" />
                  </div>
                  <div>
                    <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Princeton Identity Access Control Suite Servers (GSC-1SDK-PRINCETONIDENTITY-ACS @ $250/server)">
                      Princeton Identity ($250):
                    </label>
                    <input type="number" min="0" max="50" value="${licRes.princetonIdentityServers || 0}" onchange="setGenetecLicParam('princetonIdentityServers', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-purple-300" />
                  </div>
                </div>
                <div class="grid grid-cols-3 gap-2 items-end">
                  <div>
                    <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Document / Passport / Driver's License ID Scanner Workstations (GSC-1PIDSCANNER @ $500/workstation)">
                      ID Scanner Clients:
                    </label>
                    <input type="number" min="0" max="100" value="${licRes.idScannerClients || 0}" onchange="setGenetecLicParam('idScannerClients', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-emerald-300" />
                  </div>
                  <div>
                    <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Telaeris XpressEntry Handheld Badge & Mustering Servers (GSC-1SDK-TELAERIS-XPRESSENTRY @ $250/server)">
                      XpressEntry Servers:
                    </label>
                    <input type="number" min="0" max="50" value="${licRes.xpressEntryServers || 0}" onchange="setGenetecLicParam('xpressEntryServers', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-emerald-300" />
                  </div>
                  <div class="pb-1">
                    <label class="flex items-center gap-1.5 text-[10px] text-slate-300 cursor-pointer" title="IDEMIA MorphoManager Biometrics Integration Plugin (GSC-1PMORPHOBIOMETRICS @ $2,500 per system)">
                      <input type="checkbox" ${licRes.idemiaMorphoEnabled ? 'checked' : ''} onchange="setGenetecLicParam('idemiaMorphoEnabled', this.checked)" class="rounded border-slate-700 bg-slate-900 text-purple-500" />
                      <span>IDEMIA ($2.5k)</span>
                    </label>
                  </div>
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Feature Toggle: ClearID Physical Identity & Visitor Self-Check-In Kiosks -->
          <div class="rounded-lg border ${licRes.enableClearId ? 'border-emerald-500/40 bg-emerald-950/20' : 'border-slate-800/90 bg-slate-900/50'} p-2 space-y-1.5 transition-all">
            <div class="flex items-center justify-between gap-2">
              <label class="flex items-center gap-2 cursor-pointer select-none flex-1">
                <input type="checkbox" ${licRes.enableClearId ? 'checked' : ''} onchange="toggleGenetecFeature('enableClearId', this.checked)" class="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0" />
                <span class="text-[11px] font-bold ${licRes.enableClearId ? 'text-emerald-300' : 'text-slate-300'}">ClearID Identity Governance &amp; Visitor Kiosks</span>
              </label>
              <div class="flex items-center gap-1.5">
                <a href="Datasheets/Genetec/Plugins/Genetec_ClearID_Plugin_Datasheet.pdf" target="_blank" class="text-[9px] text-emerald-300 hover:underline">PDF</a>
                <span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${licRes.enableClearId ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'}">${licRes.enableClearId ? 'ON' : 'OFF'}</span>
              </div>
            </div>
            ${licRes.enableClearId ? `
              <div class="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
                <div>
                  <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Genetec ClearID Active Identities (CID-IDENTITY-1Y/3Y/5Y tiered pricing: $7/$5/$4/$2.50 per identity/yr)">
                    ClearID Identities:
                  </label>
                  <input type="number" min="0" max="500000" step="100" value="${licRes.clearIdIdentities || 0}" onchange="setGenetecLicParam('clearIdIdentities', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-sky-300" />
                </div>
                <div>
                  <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Genetec ClearID Visitor Self-Check-In Kiosks (CID-KIOSK-LIC-1Y @ $2,000/yr)">
                    ClearID Kiosks ($2k/yr):
                  </label>
                  <input type="number" min="0" max="100" value="${licRes.clearIdKiosks || 0}" onchange="setGenetecLicParam('clearIdKiosks', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-sky-300" />
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Feature Toggle: Medeco XT Intelligent Keys & Key Cabinets -->
          <div class="rounded-lg border ${licRes.enableKeyManagement ? 'border-amber-500/40 bg-amber-950/20' : 'border-slate-800/90 bg-slate-900/50'} p-2 space-y-1.5 transition-all">
            <div class="flex items-center justify-between gap-2">
              <label class="flex items-center gap-2 cursor-pointer select-none flex-1">
                <input type="checkbox" ${licRes.enableKeyManagement ? 'checked' : ''} onchange="toggleGenetecFeature('enableKeyManagement', this.checked)" class="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-0" />
                <span class="text-[11px] font-bold ${licRes.enableKeyManagement ? 'text-amber-300' : 'text-slate-300'}">Medeco XT Intelligent Keys &amp; Key Cabinets</span>
              </label>
              <div class="flex items-center gap-1.5">
                <a href="Datasheets/Genetec/Plugins/Genetec_Medeco_Key_Asset_Management_Datasheet.pdf" target="_blank" class="text-[9px] text-amber-300 hover:underline">PDF</a>
                <span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${licRes.enableKeyManagement ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-400'}">${licRes.enableKeyManagement ? 'ON' : 'OFF'}</span>
              </div>
            </div>
            ${licRes.enableKeyManagement ? `
              <div class="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
                <div>
                  <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Medeco XT Intelligent Keys & Offline Cylinders — Automatically includes GSC-1PMEDECOBASE ($1,000) + GSC-1P-OFFLINELOCK-1L ($40/lock)">
                    Medeco XT Locks ($1k + $40/lock):
                  </label>
                  <input type="number" min="0" max="5000" value="${licRes.medecoXtLocks || 0}" onchange="setGenetecLicParam('medecoXtLocks', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-amber-300" />
                </div>
                <div>
                  <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Key & Asset Management Cabinets — Includes $1,500 Base Plugin (GSC-1P-KEYCABINETBASE) + $500 per Key Cabinet (Morse Watchmans, Traka, Deister)">
                    Key Cabinets ($1.5k + $500 per Cabinet):
                  </label>
                  <input type="number" min="0" max="100" value="${cfg.keyCabinetCount || 0}" onchange="setGenetecLicParam('keyCabinetCount', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-white" />
                </div>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Card 4: Multi-Select Certified Partner SDKs, PSIM & Industrial IoT -->
        <div class="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3 space-y-2">
          <div class="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center justify-between">
            <span>4. Multi-Select Partner SDKs, PSIM &amp; IIoT</span>
            <a href="Datasheets/Genetec/SupportedPlugins.pdf" target="_blank" class="text-[9px] text-emerald-300 hover:underline">Supported Plugins PDF</a>
          </div>

          <!-- Feature Toggle: Multi-Select Certified Partner SDKs (GSC-1SDK-* & GSC-1SDK) -->
          <div class="rounded-lg border ${licRes.enablePartnerSdks ? 'border-emerald-500/40 bg-emerald-950/20' : 'border-slate-800/90 bg-slate-900/50'} p-2 space-y-2 transition-all">
            <div class="flex items-center justify-between gap-2">
              <label class="flex items-center gap-2 cursor-pointer select-none flex-1">
                <input type="checkbox" ${licRes.enablePartnerSdks ? 'checked' : ''} onchange="toggleGenetecFeature('enablePartnerSdks', this.checked)" class="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0" />
                <span class="text-[11px] font-bold ${licRes.enablePartnerSdks ? 'text-emerald-300' : 'text-slate-300'}">Certified Partner SDK Connections (Select Multiple)</span>
              </label>
              <span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${licRes.enablePartnerSdks ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'}">
                ${licRes.enablePartnerSdks ? `${Object.values(licRes.selectedPartnerSdks || {}).filter(q => q > 0).length + ((licRes.genericSdkConnections || 0) > 0 ? 1 : 0)} Active` : 'OFF'}
              </span>
            </div>
            ${licRes.enablePartnerSdks ? `
              <div class="space-y-1.5 pt-1 border-t border-slate-800/80">
                <div class="text-[10px] text-slate-400 flex items-center justify-between">
                  <span>Check all Partner SDK integrations needed ($250 per Connection):</span>
                  <span class="font-mono text-emerald-300">Quantity</span>
                </div>
                <div class="max-h-48 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                  ${partnerSdkOptions.filter(opt => opt.key !== 'none').map(opt => {
                    const selectedQty = Number((licRes.selectedPartnerSdks || {})[opt.key]) || 0;
                    const isChecked = selectedQty > 0;
                    const defaultQty = opt.defaultQty || 1;
                    return `
                      <div class="flex items-center justify-between gap-1.5 p-1.5 rounded-lg border ${isChecked ? 'bg-emerald-950/40 border-emerald-500/40' : 'bg-slate-900/70 border-slate-800/80 hover:border-slate-700'} transition">
                        <label class="flex items-start gap-1.5 cursor-pointer select-none flex-1 min-w-0" title="${opt.ruleHint || opt.label}">
                          <input
                            type="checkbox"
                            ${isChecked ? 'checked' : ''}
                            onchange="toggleGenetecPartnerSdk('${opt.key}', this.checked, ${defaultQty})"
                            class="mt-0.5 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0 shrink-0"
                          />
                          <div class="min-w-0 leading-tight">
                            <div class="text-[10px] font-semibold ${isChecked ? 'text-white' : 'text-slate-300'} truncate">${opt.label}</div>
                            <div class="text-[9px] text-slate-400 flex items-center gap-1.5">
                              <code class="text-emerald-300">${opt.sku}</code>
                              ${opt.ruleHint ? `<span class="truncate">&bull; ${opt.ruleHint}</span>` : ''}
                              ${opt.datasheet ? `<a href="${opt.datasheet}" target="_blank" onclick="event.stopPropagation()" class="text-sky-400 hover:underline shrink-0">PDF</a>` : ''}
                            </div>
                          </div>
                        </label>
                        ${isChecked ? `
                          <input
                            type="number"
                            min="1"
                            max="200"
                            value="${selectedQty}"
                            onchange="setGenetecPartnerSdkQty('${opt.key}', this.value)"
                            class="w-14 bg-slate-950 border border-emerald-500/50 rounded px-1.5 py-0.5 text-center font-mono font-bold text-emerald-300 text-[11px] shrink-0"
                            title="Number of ${opt.sku} SDK Connection Licenses ($250 each)"
                          />
                        ` : `
                          <span class="text-[9px] font-mono text-slate-500 shrink-0">$250</span>
                        `}
                      </div>
                    `;
                  }).join('')}
                </div>
                <div class="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
                  <label class="text-[10px] text-slate-300 font-semibold" title="Generic Software Development Kit (SDK) Connections (GSC-1SDK @ $250/connection)">
                    Additional Generic SDK Connections (<code class="text-emerald-300">GSC-1SDK</code> @ $250):
                  </label>
                  <input type="number" min="0" max="200" value="${licRes.genericSdkConnections || 0}" onchange="setGenetecLicParam('genericSdkConnections', Math.max(0, parseInt(this.value,10)||0))" class="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-0.5 text-center font-mono font-bold text-emerald-300" />
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Feature Toggle: Building Automation, WinGuard PSIM & Mission Control -->
          <div class="rounded-lg border ${licRes.enableBuildingPsim ? 'border-sky-500/40 bg-sky-950/20' : 'border-slate-800/90 bg-slate-900/50'} p-2 space-y-1.5 transition-all">
            <div class="flex items-center justify-between gap-2">
              <label class="flex items-center gap-2 cursor-pointer select-none flex-1">
                <input type="checkbox" ${licRes.enableBuildingPsim ? 'checked' : ''} onchange="toggleGenetecFeature('enableBuildingPsim', this.checked)" class="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-0" />
                <span class="text-[11px] font-bold ${licRes.enableBuildingPsim ? 'text-sky-300' : 'text-slate-300'}">WinGuard PSIM, Mission Control, Elevator &amp; OPC</span>
              </label>
              <div class="flex items-center gap-1.5">
                <a href="Datasheets/Genetec/Plugins/Advancis_WinGuard_PSIM_Genetec_Integration.pdf" target="_blank" class="text-[9px] text-sky-300 hover:underline">PDF</a>
                <span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${licRes.enableBuildingPsim ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' : 'bg-slate-800 text-slate-400'}">${licRes.enableBuildingPsim ? 'ON' : 'OFF'}</span>
              </div>
            </div>
            ${licRes.enableBuildingPsim ? `
              <div class="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
                <div>
                  <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Advancis WinGuard Physical Security Information Management (PSIM) Interface Nodes (GSC-1SDK-ADVANCIS-WINGUARD @ $250/node)">
                    Advancis WinGuard Nodes:
                  </label>
                  <input type="number" min="0" max="50" value="${licRes.winGuardNodes || 0}" onchange="setGenetecLicParam('winGuardNodes', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-emerald-300" />
                </div>
                <div>
                  <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Genetec Mission Control Collaborative Decision Management Concurrent Operators ($0 Base + $3,000/yr Operator Maintenance)">
                    Mission Control Operators:
                  </label>
                  <input type="number" min="0" max="200" value="${cfg.missionControlOperators || 0}" onchange="setGenetecLicParam('missionControlOperators', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-white" />
                </div>
                <div>
                  <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Elevator Destination Dispatch Plugin — Otis Compass, KONE, ThyssenKrupp, or MCE Sentry ($8,000 per system)">
                    Elevator Dispatch ($8k):
                  </label>
                  <input type="number" min="0" max="50" value="${cfg.elevatorDispatchSystems || 0}" onchange="setGenetecLicParam('elevatorDispatchSystems', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-white" />
                </div>
                <div>
                  <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Open Platform Communications (OPC) Server Building Automation Plugin (GSC-1POPC-S @ $8,000)">
                    OPC Server Systems ($8k):
                  </label>
                  <input type="number" min="0" max="20" value="${cfg.opcServerSystems || 0}" onchange="setGenetecLicParam('opcServerSystems', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-white" />
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Feature Toggle: Industrial IoT (BACnet / Modbus / OPC / SNMP / MQTT) -->
          <div class="rounded-lg border ${licRes.enableIiot ? 'border-emerald-500/40 bg-emerald-950/20' : 'border-slate-800/90 bg-slate-900/50'} p-2 space-y-1.5 transition-all">
            <div class="flex items-center justify-between gap-2">
              <label class="flex items-center gap-2 cursor-pointer select-none flex-1">
                <input type="checkbox" ${licRes.enableIiot ? 'checked' : ''} onchange="toggleGenetecFeature('enableIiot', this.checked)" class="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0" />
                <span class="text-[11px] font-bold ${licRes.enableIiot ? 'text-emerald-300' : 'text-slate-300'}">Industrial IoT Plugin (BACnet, Modbus, SNMP, MQTT)</span>
              </label>
              <span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${licRes.enableIiot ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'}">${licRes.enableIiot ? 'ON' : 'OFF'}</span>
            </div>
            ${licRes.enableIiot ? `
              <div class="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
                <div>
                  <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold">IIoT Licensing Mode:</label>
                  <select onchange="setGenetecLicParam('iiotMode', this.value)" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-1.5 py-1 text-[10px] font-bold text-emerald-300 focus:outline-none">
                    <option value="devices" ${cfg.iiotMode !== 'site' ? 'selected' : ''}>Per Device ($149/device)</option>
                    <option value="site" ${cfg.iiotMode === 'site' ? 'selected' : ''}>Unlimited Site ($6,000)</option>
                  </select>
                </div>
                <div>
                  <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold">IIoT Devices ($149):</label>
                  <input type="number" min="1" max="500" value="${cfg.iiotDevices || 1}" onchange="setGenetecLicParam('iiotDevices', Math.max(1, parseInt(this.value,10)||1))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-white" />
                </div>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Card 5: Restricted Security Area (RSA) & Intrusion Alarm Panels -->
        <div class="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3 space-y-2">
          <div class="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center justify-between gap-2">
            <span>5. Restricted Security Area (RSA) &amp; Intrusion</span>
            <div class="flex items-center gap-2 shrink-0">
              <a href="Datasheets/Genetec/RSA.pdf" target="_blank" class="text-[9px] text-amber-300 hover:underline">RSA Guide PDF</a>
              <a href="Datasheets/Genetec/Plugins/Genetec_RSA_Surveillance_Plugin_Datasheet.pdf" target="_blank" class="text-[9px] text-amber-300 hover:underline">Plugin PDF</a>
            </div>
          </div>

          <!-- Feature Toggle: Restricted Security Area (RSA) — Quanergy, SpotterRF & Southwest Microwave -->
          <div class="rounded-lg border ${licRes.enableRsa ? 'border-amber-500/40 bg-amber-950/20' : 'border-slate-800/90 bg-slate-900/50'} p-2 space-y-2 transition-all">
            <div class="flex items-center justify-between gap-2">
              <label class="flex items-center gap-2 cursor-pointer select-none flex-1">
                <input type="checkbox" ${licRes.enableRsa ? 'checked' : ''} onchange="toggleGenetecFeature('enableRsa', this.checked)" class="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-0" />
                <span class="text-[11px] font-bold ${licRes.enableRsa ? 'text-amber-300' : 'text-slate-300'}">Restricted Security Area (Quanergy, SpotterRF, SW Microwave)</span>
              </label>
              <div class="flex items-center gap-1.5">
                <a href="Datasheets/Genetec/Plugins/Quanergy_Genetec_RSA_Integration.pdf" target="_blank" class="text-[9px] text-amber-300 hover:underline">LiDAR PDF</a>
                <span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${licRes.enableRsa ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-400'}">${licRes.enableRsa ? 'ON' : 'OFF'}</span>
              </div>
            </div>
            ${licRes.enableRsa ? `
              <div class="space-y-2 pt-1 border-t border-slate-800/80">
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Restricted Security Area (RSA) Base Package (Auto-upgrades to Pro or Enterprise when Quanergy LiDAR, SpotterRF Radar, or Southwest Microwave Fence sensors are added)">
                      RSA Base Package Tier:
                    </label>
                    <select onchange="setGenetecLicParam('rsaTier', this.value)" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-1.5 py-1 text-[10px] font-bold text-amber-300 focus:outline-none">
                      <option value="none" ${(cfg.rsaTier === 'none' || !cfg.rsaTier) ? 'selected' : ''}>Auto (${licRes.effectiveRsaTier !== 'none' ? licRes.effectiveRsaTier.toUpperCase() : 'PRO'})</option>
                      <option value="standard" ${cfg.rsaTier === 'standard' ? 'selected' : ''}>RSA Standard ($1,000)</option>
                      <option value="pro" ${cfg.rsaTier === 'pro' ? 'selected' : ''}>RSA Professional ($7,000)</option>
                      <option value="enterprise" ${cfg.rsaTier === 'enterprise' ? 'selected' : ''}>RSA Enterprise ($14,000)</option>
                    </select>
                  </div>
                  <div>
                    <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Southwest Microwave INTREPID RPM II Standalone Plugin (GSC-1PSWM-RPMII @ $6,500 per 5 RPM units)">
                      SWM RPM II Units ($6.5k/5):
                    </label>
                    <input type="number" min="0" max="100" value="${licRes.swmRpmUnits || 0}" onchange="setGenetecLicParam('swmRpmUnits', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-amber-300" />
                  </div>
                </div>
                <div class="grid grid-cols-4 gap-1.5">
                  <div>
                    <label class="text-[9px] text-slate-300 block mb-0.5 font-semibold" title="Short-Range Tracking Sensors — Quanergy M8 LiDAR (Qortex DTC), Optex PIE-1, Axis, SightLogix, Magos SR (GSC-GAP-RSA-1SRS @ $175/sensor)">
                      Quanergy/SRS:
                    </label>
                    <input type="number" min="0" max="500" value="${licRes.rsaShortRangeSensors || 0}" onchange="setGenetecLicParam('rsaShortRangeSensors', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-1.5 py-1 text-center font-mono font-bold text-amber-300" />
                  </div>
                  <div>
                    <label class="text-[9px] text-slate-300 block mb-0.5 font-semibold" title="Radar Tracking Connections — SpotterRF / Spotter Global (C20/C40/A-Series/3D), FLIR Ranger, Echodyne, Navtech (GSC-GAP-RSA-1RAD @ $1,000/radar)">
                      SpotterRF Radar:
                    </label>
                    <input type="number" min="0" max="200" value="${licRes.rsaRadars || 0}" onchange="setGenetecLicParam('rsaRadars', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-1.5 py-1 text-center font-mono font-bold text-amber-300" />
                  </div>
                  <div>
                    <label class="text-[9px] text-slate-300 block mb-0.5 font-semibold" title="Perimeter Fence Intrusion Detection Controllers — Southwest Microwave INTREPID (MicroPoint POE-S / 316 / 334 / 336 / 390), Senstar, FFT (GSC-GAP-RSA-1FEN @ $2,000/PIDS)">
                      SWM/Fence PIDS:
                    </label>
                    <input type="number" min="0" max="100" value="${licRes.rsaFenceControllers || 0}" onchange="setGenetecLicParam('rsaFenceControllers', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-1.5 py-1 text-center font-mono font-bold text-amber-300" />
                  </div>
                  <div>
                    <label class="text-[9px] text-slate-300 block mb-0.5 font-semibold" title="Monitored Perimeter Fence Distance in Kilometers (GSC-GAP-RSA-1KM $2,000 / 10KM $5,000 / 100KM $15,000)">
                      Fence (km):
                    </label>
                    <input type="number" min="0" max="500" value="${licRes.rsaFenceKm || 0}" onchange="setGenetecLicParam('rsaFenceKm', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-1.5 py-1 text-center font-mono font-bold text-amber-300" />
                  </div>
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Feature Toggle: Intrusion Alarm Panels (Moved alongside RSA) -->
          <div class="rounded-lg border ${licRes.enableIntrusionPanels ? 'border-amber-500/40 bg-amber-950/20' : 'border-slate-800/90 bg-slate-900/50'} p-2 space-y-1.5 transition-all">
            <div class="flex items-center justify-between gap-2">
              <label class="flex items-center gap-2 cursor-pointer select-none flex-1">
                <input type="checkbox" ${licRes.enableIntrusionPanels ? 'checked' : ''} onchange="toggleGenetecFeature('enableIntrusionPanels', this.checked)" class="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-0" />
                <span class="text-[11px] font-bold ${licRes.enableIntrusionPanels ? 'text-amber-300' : 'text-slate-300'}">Intrusion Alarm Panel Integration ($350/panel)</span>
              </label>
              <span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${licRes.enableIntrusionPanels ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-400'}">${licRes.enableIntrusionPanels ? `${licRes.intrusionPanels} Panel` : 'OFF'}</span>
            </div>
            ${licRes.enableIntrusionPanels ? `
              <div class="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
                <div>
                  <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold" title="Intrusion Alarm Panel Connections ($350.00 per panel + $65.00/year Advantage Maintenance)">
                    Intrusion Panels ($350):
                  </label>
                  <input type="number" min="0" max="200" value="${licRes.intrusionPanels || 0}" onchange="setGenetecLicParam('intrusionPanels', Math.max(0, parseInt(this.value,10)||0))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-amber-300" />
                </div>
                <div>
                  <label class="text-[10px] text-slate-300 block mb-0.5 font-semibold">Intrusion Panel Brand:</label>
                  <select onchange="setGenetecLicParam('intrusionPanelManufacturer', this.value)" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-1.5 py-1 text-[10px] font-bold text-white focus:outline-none">
                    <option value="bosch" ${licRes.intrusionPanelManufacturer === 'bosch' ? 'selected' : ''}>Bosch B/G (GSC-1AP-Bosch)</option>
                    <option value="dmp" ${licRes.intrusionPanelManufacturer === 'dmp' ? 'selected' : ''}>DMP (GSC-1AP-DMP)</option>
                    <option value="dsc" ${licRes.intrusionPanelManufacturer === 'dsc' ? 'selected' : ''}>DSC (GSC-1AP-DSC)</option>
                    <option value="honeywell" ${licRes.intrusionPanelManufacturer === 'honeywell' ? 'selected' : ''}>Honeywell (GSC-1AP-CDC3-HW)</option>
                    <option value="bosch_map5000" ${licRes.intrusionPanelManufacturer === 'bosch_map5000' ? 'selected' : ''}>Bosch MAP5000</option>
                    <option value="vanderbilt_spc" ${licRes.intrusionPanelManufacturer === 'vanderbilt_spc' ? 'selected' : ''}>Vanderbilt SPC</option>
                  </select>
                </div>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Card 6: Streamvault Turnkey Hardware Appliance Fit & Multi-Role Server Sharing Spec -->
        <div class="bg-slate-950/80 border border-indigo-500/30 rounded-xl p-3 space-y-2">
          <div class="text-[10px] font-bold uppercase tracking-wider text-sky-400 flex items-center justify-between">
            <span>6. Streamvault Hardware &amp; Multi-Role Server Sizing</span>
            <select onchange="setGenetecLicParam('applianceFormFactor', this.value)" class="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[10px] font-bold text-slate-200 focus:outline-none">
              <option value="rack" ${cfg.applianceFormFactor === 'rack' ? 'selected' : ''}>Rackmount (1U / 2U)</option>
              <option value="tower" ${cfg.applianceFormFactor === 'tower' ? 'selected' : ''}>Tower / Small Form Factor</option>
              <option value="any" ${cfg.applianceFormFactor === 'any' ? 'selected' : ''}>Any Form Factor</option>
            </select>
          </div>
          ${prim ? `
            <div class="p-2 rounded-lg bg-indigo-950/40 border border-indigo-500/30 space-y-1.5">
              <div class="flex items-center justify-between">
                <span class="font-bold text-white text-[11px]">${svPlan.primaryQty}x ${prim.applianceSeries} (${prim.sku})</span>
                <span class="font-mono font-bold text-indigo-300 text-[11px]">$${(svPlan.primaryQty * (prim.msrp || 0)).toLocaleString()}</span>
              </div>
              <div class="text-[10px] text-slate-300 leading-snug">${svPlan.archiverReason}</div>
              ${typeof renderApplianceBuildOptionsAndAccessoriesHtml === 'function' ? renderApplianceBuildOptionsAndAccessoriesHtml(prim) : ''}
              <div class="flex items-center justify-between pt-1">
                <a href="${prim.datasheetPath}" target="_blank" class="text-[10px] text-indigo-400 hover:underline flex items-center gap-1">
                  <i data-lucide="external-link" class="w-3 h-3"></i>
                  <span>Official Hardware Datasheet</span>
                </a>
                <button type="button" onclick="autoFitStreamvaultToBom()" class="px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold cursor-pointer">
                  + Add Hardware to Bill of Materials
                </button>
              </div>
            </div>
          ` : `
            <div class="p-2 rounded-lg bg-slate-900/60 border border-slate-800 text-[10px] text-slate-400">
              Add cameras to the project or storage calculator to automatically size Streamvault turnkey appliances.
            </div>
          `}
          ${svPlan.directoryAppliance ? `
            <div class="p-1.5 rounded-lg bg-amber-950/30 border border-amber-500/30 flex items-center justify-between text-[10px]">
              <span class="text-amber-300 font-bold">+ ${svPlan.directoryQty}x ${svPlan.directoryAppliance.applianceSeries} Dedicated Directory / Expansion Server</span>
              <span class="font-mono text-white">$${(svPlan.directoryQty * (svPlan.directoryAppliance.msrp || 0)).toLocaleString()}</span>
            </div>
          ` : ''}
          ${svPlan.analyticsAppliance ? `
            <div class="p-1.5 rounded-lg bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between text-[10px]">
              <span class="text-emerald-300 font-bold">+ ${svPlan.analyticsQty}x ${svPlan.analyticsAppliance.applianceSeries} Dedicated GPU Analytics Appliance</span>
              <span class="font-mono text-white">$${(svPlan.analyticsQty * (svPlan.analyticsAppliance.msrp || 0)).toLocaleString()}</span>
            </div>
          ` : ''}
          <!-- Multi-Role & Co-Hosted Plugin Server Resource Requirements -->
          <div class="p-2 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1">
            <div class="flex items-center justify-between text-[10px]">
              <span class="font-bold text-slate-300 uppercase tracking-wider">Shared Server Resource Specification:</span>
              <span class="font-mono font-bold text-emerald-400">${mrSpec.requiredServerCores || 4} Cores • ${mrSpec.requiredServerRamGb || 16} GB RAM • ~${licRes.estimatedSqlDbGb || 0.5} GB SQL</span>
            </div>
            ${Array.isArray(mrSpec.activeRolesAndPlugins) && mrSpec.activeRolesAndPlugins.length > 0 ? `
              <div class="space-y-1 pt-1 border-t border-slate-800/80 max-h-28 overflow-y-auto custom-scrollbar">
                ${mrSpec.activeRolesAndPlugins.map(rp => `
                  <div class="text-[9px] text-slate-300 leading-tight flex items-start justify-between gap-1">
                    <div>
                      <span class="font-bold text-indigo-300">${rp.name}</span> (+${rp.cores}C / +${rp.ramGb}GB): ${rp.rule}
                    </div>
                    ${rp.datasheet ? `<a href="${rp.datasheet}" target="_blank" class="text-sky-400 hover:underline shrink-0">PDF</a>` : ''}
                  </div>
                `).join('')}
              </div>
            ` : ''}
            ${Array.isArray(mrSpec.roleSharingRules) && mrSpec.roleSharingRules.length > 0 ? `
              <div class="text-[9px] text-amber-300/90 pt-0.5 leading-snug">
                ${mrSpec.roleSharingRules.map(r => `<div>&bull; ${r}</div>`).join('')}
              </div>
            ` : ''}
          </div>
        </div>
      </div>

      <!-- Plugin & Integration Engineering Datasheets Bar -->
      <div class="p-2 rounded-xl bg-slate-950/80 border border-slate-800/90 flex flex-wrap items-center justify-between gap-2 text-[10px]">
        <span class="font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <i data-lucide="book-open" class="w-3.5 h-3.5 text-indigo-400"></i>
          <span>Plugin &amp; Multi-Role Server Sizing Datasheets:</span>
        </span>
        <div class="flex flex-wrap items-center gap-1.5">
          <a href="Datasheets/Genetec/EN.Security Center Administrator Guide 5.14.pdf" target="_blank" class="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-indigo-500/50 text-indigo-300 font-semibold">SC 5.14 Admin Guide</a>
          <a href="Datasheets/Genetec/EN.Synergis Supported Hardware and Features 12.0_3.3_5.14.xlsx" target="_blank" class="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-purple-500/50 text-purple-300 font-semibold">Synergis 12.0 / SCL 3.3 Matrix</a>
          <a href="Datasheets/Genetec/Plugins/EN.Sipelia User Guide 2.14.0.0.pdf" target="_blank" class="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-sky-500/50 text-sky-300 font-semibold">Sipelia 2.14 User Guide</a>
          <a href="Datasheets/Genetec/Plugins/EN.DMP Intrusion Panel Extension Guide 4.5.0.pdf" target="_blank" class="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-amber-500/50 text-amber-300 font-semibold">DMP Intrusion 4.5.0 Guide</a>
          <a href="Datasheets/Genetec/Plugins/EN.Genetec Mission Control Deployment Guide 3.4.1.0.pdf" target="_blank" class="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-emerald-500/50 text-emerald-300 font-semibold">Mission Control 3.4.1.0 Guide</a>
          <a href="Datasheets/Genetec/Plugins/Genetec_RSA_Surveillance_Plugin_Datasheet.pdf" target="_blank" class="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-300 font-semibold">RSA / SpotterRF / SWM</a>
          <a href="Datasheets/Genetec/Plugins/Quanergy_Genetec_RSA_Integration.pdf" target="_blank" class="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-300 font-semibold">Quanergy LiDAR RSA</a>
          <a href="Datasheets/Genetec/Plugins/Suprema_Genetec_Security_Center_Integration.pdf" target="_blank" class="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-purple-300 font-semibold">Suprema Plugin v1.00</a>
          <a href="Datasheets/Genetec/Plugins/Corsight Syfty Genetec - User Guide 2026.pdf" target="_blank" class="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-indigo-300 font-semibold">Corsight Syfty 2026</a>
          <a href="Datasheets/Genetec/Plugins/StreamConnect_for_Genetec_v2_1_User_Guide.pdf" target="_blank" class="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-emerald-300 font-semibold">Allied Telesis StreamConnect v2.1</a>
          <a href="Datasheets/Genetec/Plugins/Genetec_Identity_Biometrics_Plugins_Datasheet.pdf" target="_blank" class="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-purple-300 font-semibold">IDEMIA / iDBridge / Princeton / ID Scanner</a>
          <a href="Datasheets/Genetec/Plugins/Genetec_ClearID_Plugin_Datasheet.pdf" target="_blank" class="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-emerald-300 font-semibold">ClearID &amp; Card Sync</a>
          <a href="Datasheets/Genetec/Plugins/Telaeris_XPressEntry_Genetec_Integration.pdf" target="_blank" class="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-emerald-300 font-semibold">Telaeris XpressEntry</a>
          <a href="Datasheets/Genetec/Plugins/Genetec_Medeco_Key_Asset_Management_Datasheet.pdf" target="_blank" class="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-300 font-semibold">Medeco XT &amp; Key Cabinets</a>
          <a href="Datasheets/Genetec/Plugins/BriefCam_Corsight_Video_Analytics_Genetec_Integration.pdf" target="_blank" class="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-indigo-300 font-semibold">BriefCam Analytics</a>
        </div>
      </div>

      <!-- Itemized Genetec License & Software Maintenance Breakdown Table -->
      <div class="bg-slate-950/90 border border-slate-800 rounded-xl overflow-hidden">
        <div class="px-3 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-300">
            Calculated Genetec Security Center License &amp; Software Maintenance Bill of Materials (${licRes.lineItems.length} Line Items)
          </span>
          <span class="text-[11px] font-mono font-bold text-emerald-400">
            Total Software MSRP: $${licRes.totalSoftwareMsrp.toLocaleString()}
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
                ${licRes.lineItems.map(li => `
                  <tr class="${li.isIncludedZeroCost ? 'bg-emerald-950/20' : 'hover:bg-slate-900/60'}">
                    <td class="py-1.5 px-3 font-bold ${li.isIncludedZeroCost ? 'text-emerald-300' : 'text-indigo-300'} whitespace-nowrap">${li.sku}</td>
                    <td class="py-1.5 px-3 font-sans text-slate-200">
                      <div class="font-semibold">${li.model}</div>
                      ${li.notes ? `<div class="text-[10px] ${li.isIncludedZeroCost ? 'text-emerald-300/90' : 'text-slate-400'}">${escapeHTML(li.notes)}</div>` : ''}
                    </td>
                    <td class="py-1.5 px-3 text-[10px] text-slate-400 whitespace-nowrap">${li.categoryLabel}</td>
                    <td class="py-1.5 px-3 text-center font-bold text-amber-300">${li.qty}</td>
                    <td class="py-1.5 px-3 text-right text-slate-300">${li.isIncludedZeroCost ? '<span class="text-emerald-400 font-bold">INCLUDED ($0.00)</span>' : '$' + li.unitMsrp.toLocaleString()}</td>
                    <td class="py-1.5 px-3 text-right font-bold text-emerald-400">$${li.extendedMsrp.toLocaleString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : `
          <div class="p-4 text-center text-xs text-slate-400">
            No camera, reader, or client licenses calculated yet. Add cameras in Initial/Quick Design, Power over Ethernet Calculator, or Physical Security, or enter reader/panel/plugin counts above.
          </div>
        `}
      </div>
    </div>
  `;
}
window.renderGenetecLicensingBuilderHtml = renderGenetecLicensingBuilderHtml;

// =========================================================================
// SERVER & WORKSTATION BUILD OPTIONS & ACCESSORY CONFIGURATOR
// =========================================================================

window.applianceBuildSelections = window.applianceBuildSelections || {};

function setApplianceBuildSelection(applianceId, optKey, val) {
  if (!applianceId) return;
  if (!window.applianceBuildSelections[applianceId]) {
    window.applianceBuildSelections[applianceId] = {};
  }
  window.applianceBuildSelections[applianceId][optKey] = val;
  if (typeof showToast === "function") {
    showToast(`Updated ${applianceId} build option (${optKey}: ${val}).`, "info");
  }
}
window.setApplianceBuildSelection = setApplianceBuildSelection;

function addServerAccessoryToBom(sku, labelOrQty, msrp, parentVendor) {
  if (!sku) return;
  const isNumericSecondArg = typeof labelOrQty === "number";
  const addQty = isNumericSecondArg ? Math.max(1, labelOrQty) : 1;
  // First check if SKU is in catalog (e.g. HEMS-* warranties or GPU kits)
  if (typeof addToBOM === "function") {
    const swDb = (typeof window !== "undefined" && window.SOFTWARE_DATABASE && Array.isArray(window.SOFTWARE_DATABASE.vms))
      ? window.SOFTWARE_DATABASE.vms
      : [];
    const matchedCatalogItem = swDb.find(s => s.sku === sku || s.id === sku) ||
      ((typeof CatalogRegistry !== "undefined" && typeof CatalogRegistry.get === "function") ? CatalogRegistry.get(sku) : null);
    if (matchedCatalogItem) {
      addToBOM(matchedCatalogItem.id || matchedCatalogItem.sku, addQty);
      if (typeof showToast === "function") {
        showToast(`Added ${matchedCatalogItem.sku} (${matchedCatalogItem.model}) to BOM.`, "success");
      }
      if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
      return;
    }
  }
  // Otherwise add as a canonical flat hardware accessory line item on projectBOM
  if (Array.isArray(projectBOM)) {
    const label = (!isNumericSecondArg && labelOrQty) ? String(labelOrQty) : sku;
    const existing = projectBOM.find(entry => entry && entry.sku === sku && !entry.parentInstanceId);
    if (existing) {
      existing.qty = (Number(existing.qty) || 1) + addQty;
    } else {
      const cleanId = `acc_${sku.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;
      projectBOM.push({
        instanceId: `inst-acc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        id: cleanId,
        sku: sku,
        vendor: parentVendor || (sku.toLowerCase().includes("husky") ? "Milestone" : "Genetec"),
        model: label,
        role: "Server Build Option / Accessory",
        category: "servers",
        subcategory: "Server Build Option / Accessory",
        qty: addQty,
        msrp: Number(msrp) || 0,
        description: label,
        closetName: "Unassigned",
        rackId: "Unassigned"
      });
    }
    if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
      FacilityStore.notifyWorkspaceChange();
    } else if (typeof updateBOMView === "function") {
      updateBOMView();
    }
    if (typeof updateProjectHealthUI === "function") updateProjectHealthUI();
    if (typeof showToast === "function") {
      showToast(`Added Server Accessory ${sku} (${label}${msrp ? ' • $' + Number(msrp).toLocaleString() : ''}) to BOM.`, "success");
    }
  }
}
window.addServerAccessoryToBom = addServerAccessoryToBom;

function renderApplianceBuildOptionsAndAccessoriesHtml(appliance) {
  if (!appliance) return "";
  const bo = appliance.buildOptions || {};
  const accs = Array.isArray(appliance.compatibleAccessories) ? appliance.compatibleAccessories : [];
  const hasBuildOpts = Object.keys(bo).length > 0;
  if (!hasBuildOpts && accs.length === 0) return "";

  const sel = (window.applianceBuildSelections && window.applianceBuildSelections[appliance.id]) || {};
  const storageList = Array.isArray(bo.storageCapacitiesTb) ? bo.storageCapacitiesTb : [];
  const raidList = Array.isArray(bo.raidOptions) ? bo.raidOptions : [];
  const cpuList = Array.isArray(bo.cpuOptions) ? bo.cpuOptions : [];
  const ramList = Array.isArray(bo.ramOptionsGb) ? bo.ramOptionsGb : [];
  const nicList = Array.isArray(bo.nicOptions) ? bo.nicOptions : [];
  const gpuList = Array.isArray(bo.gpuOptions) ? bo.gpuOptions : [];
  const psuList = Array.isArray(bo.powerSupplyOptions) ? bo.powerSupplyOptions : [];

  return `
    <details class="group rounded-lg bg-slate-950/90 border border-slate-800/90 px-2.5 py-1.5 text-[10px]">
      <summary class="cursor-pointer select-none font-bold text-amber-300 flex items-center justify-between gap-2">
        <span class="flex items-center gap-1.5">
          <i data-lucide="sliders" class="w-3 h-3 text-amber-400"></i>
          <span>Configure Factory Build Options &amp; Accessories (${accs.length} Add-Ons)</span>
        </span>
        <span class="text-[9px] font-mono text-slate-400 group-open:rotate-180 transition-transform">&#9660;</span>
      </summary>
      <div class="pt-2 mt-1.5 border-t border-slate-800/80 space-y-2">
        ${hasBuildOpts ? `
          <div class="grid grid-cols-2 gap-1.5">
            ${storageList.length > 0 ? `
              <div>
                <label class="text-[9px] text-slate-400 block mb-0.5">Raw Storage Build (TB):</label>
                <select onchange="setApplianceBuildSelection('${appliance.id}', 'storageTb', this.value)" class="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[9.5px] font-mono font-bold text-white">
                  ${storageList.map(tb => `<option value="${tb}" ${(sel.storageTb ? Number(sel.storageTb) === tb : Number(appliance.rawStorageTb) === tb) ? 'selected' : ''}>${tb} TB Raw Capacity</option>`).join('')}
                </select>
              </div>
            ` : ''}
            ${raidList.length > 0 ? `
              <div>
                <label class="text-[9px] text-slate-400 block mb-0.5">Factory RAID Level:</label>
                <select onchange="setApplianceBuildSelection('${appliance.id}', 'raid', this.value)" class="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[9.5px] font-mono font-bold text-emerald-300">
                  ${raidList.map(r => `<option value="${r}" ${sel.raid === r ? 'selected' : ''}>${r}</option>`).join('')}
                </select>
              </div>
            ` : ''}
            ${cpuList.length > 0 ? `
              <div class="col-span-2">
                <label class="text-[9px] text-slate-400 block mb-0.5">Processor (CPU) Build Option:</label>
                <select onchange="setApplianceBuildSelection('${appliance.id}', 'cpu', this.value)" class="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[9.5px] font-mono text-sky-300">
                  ${cpuList.map(c => `<option value="${String(c).replace(/"/g, '&quot;')}" ${sel.cpu === c ? 'selected' : ''}>${c}</option>`).join('')}
                </select>
              </div>
            ` : ''}
            ${ramList.length > 0 ? `
              <div>
                <label class="text-[9px] text-slate-400 block mb-0.5">System Memory (RAM):</label>
                <select onchange="setApplianceBuildSelection('${appliance.id}', 'ramGb', this.value)" class="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[9.5px] font-mono font-bold text-white">
                  ${ramList.map(g => `<option value="${g}" ${(sel.ramGb ? Number(sel.ramGb) === g : Number(appliance.ramGb) === g) ? 'selected' : ''}>${g} GB RAM</option>`).join('')}
                </select>
              </div>
            ` : ''}
            ${nicList.length > 0 ? `
              <div>
                <label class="text-[9px] text-slate-400 block mb-0.5">Network Interface (NIC):</label>
                <select onchange="setApplianceBuildSelection('${appliance.id}', 'nic', this.value)" class="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[9.5px] font-mono text-indigo-300">
                  ${nicList.map(n => `<option value="${String(n).replace(/"/g, '&quot;')}" ${sel.nic === n ? 'selected' : ''}>${n}</option>`).join('')}
                </select>
              </div>
            ` : ''}
            ${gpuList.length > 0 ? `
              <div class="col-span-2">
                <label class="text-[9px] text-slate-400 block mb-0.5">GPU / VMD Decoding Accelerator:</label>
                <select onchange="setApplianceBuildSelection('${appliance.id}', 'gpu', this.value)" class="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[9.5px] font-mono text-purple-300">
                  ${gpuList.map(g => `<option value="${String(g).replace(/"/g, '&quot;')}" ${sel.gpu === g ? 'selected' : ''}>${g}</option>`).join('')}
                </select>
              </div>
            ` : ''}
            ${psuList.length > 0 ? `
              <div class="col-span-2">
                <label class="text-[9px] text-slate-400 block mb-0.5">Power Supply Configuration:</label>
                <select onchange="setApplianceBuildSelection('${appliance.id}', 'psu', this.value)" class="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[9.5px] font-mono text-amber-300">
                  ${psuList.map(p => `<option value="${String(p).replace(/"/g, '&quot;')}" ${sel.psu === p ? 'selected' : ''}>${p}</option>`).join('')}
                </select>
              </div>
            ` : ''}
          </div>
        ` : ''}
        ${accs.length > 0 ? `
          <div class="space-y-1 pt-1 border-t border-slate-800/80">
            <div class="text-[9px] font-bold uppercase tracking-wider text-slate-400">Compatible Server Accessories &amp; Warranties:</div>
            <div class="space-y-1 max-h-28 overflow-y-auto custom-scrollbar pr-1">
              ${accs.map((acc, idx) => {
                const isObj = acc && typeof acc === 'object';
                const sku = isObj ? (acc.sku || `ACC-${idx+1}`) : String(acc).split(':')[0].trim();
                const label = isObj ? (acc.label || acc.sku) : String(acc);
                const msrp = isObj ? (Number(acc.msrp) || 0) : 0;
                const safeSku = String(sku).replace(/'/g, "\\'");
                const safeLabel = String(label).replace(/'/g, "\\'");
                const safeVendor = String(appliance.vendor || "Server Accessory").replace(/'/g, "\\'");
                return `
                  <div class="flex items-center justify-between gap-2 bg-slate-900/80 border border-slate-800 rounded px-2 py-1">
                    <div class="text-[9px] text-slate-200 leading-tight">
                      <span class="font-mono font-bold text-amber-300">${sku}</span>
                      <span class="text-slate-300"> — ${label}</span>
                      ${msrp > 0 ? `<span class="font-mono text-emerald-400 ml-1">($${msrp.toLocaleString()})</span>` : ''}
                    </div>
                    <button type="button" onclick="addServerAccessoryToBom('${safeSku}', '${safeLabel}', ${msrp}, '${safeVendor}')" class="px-1.5 py-0.5 rounded bg-amber-600/80 hover:bg-amber-500 text-white text-[9px] font-bold shrink-0 cursor-pointer">
                      + Add
                    </button>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    </details>
  `;
}
window.renderApplianceBuildOptionsAndAccessoriesHtml = renderApplianceBuildOptionsAndAccessoriesHtml;

if (window.OSS && typeof window.OSS.register === "function") {
  window.OSS.register("Sizers.UI.Genetec", {
    setGenetecLicParam,
    toggleGenetecFeature,
    autoFitStreamvaultToBom,
    addGenetecLicensesToBom,
    renderGenetecLicensingBuilderHtml,
    renderApplianceBuildOptionsAndAccessoriesHtml
  });
}
