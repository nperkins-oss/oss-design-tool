// SUBSYSTEM: Engineering Sizers — Milestone Husky IVO & XProtect 2026 R2 Sizer (js/sizers/sizer_milestone.js)

// =========================================================================
// 7B. MILESTONE XPROTECT 2026 R2 & HUSKY IVO LICENSING & APPLIANCE SIZER
// (XProtect_Price List_USD-US_January 1_2027.xlsx & 25 Milestone Datasheets)
// =========================================================================

const MilestoneLicensingSizer = {
  TIERS: {
    express_plus: {
      key: "express_plus",
      label: "XProtect Express+",
      shortLabel: "Express+",
      baseSku: "XPEXPLUSBL",
      baseCatalogId: "milestone-xpexplus-bl",
      baseMsrp: 29,
      deviceSku: "XPEXPLUSDL",
      deviceCatalogId: "milestone-xpexplus-dl",
      deviceMsrp: 109,
      carePlusSku: "MCPL-XPEXPLUSDL",
      carePlusCatalogId: "milestone-mcpl-xpexplus-1y",
      carePlusMonthlyMsrp: 1.65,
      carePlusAnnualMsrp: 19.80,
      carePremSku: "MCPR-XPEXPLUSDL",
      carePremCatalogId: "milestone-mcpr-xpexplus-1y",
      carePremMonthlyMsrp: 0.65,
      carePremAnnualMsrp: 7.80,
      maxCameras: 100,
      maxRecordingServers: 1,
      mandatoryCarePlus: false,
      includesSmartWall: false,
      includesIncidentManager: false,
      supportsFailoverRecording: false,
      supportsFederation: false,
      supportsInterconnectCentral: false,
      datasheet: "Datasheets/Milestone/Milestone_XProtect_Express_Plus_Datasheet.pdf",
      summary: "Single-server BMS/alarm-capable VMS for up to 100 cameras (1 Recording Server max)."
    },
    professional_plus: {
      key: "professional_plus",
      label: "XProtect Professional+",
      shortLabel: "Professional+",
      baseSku: "XPPPLUSBL",
      baseCatalogId: "milestone-xppplus-bl",
      baseMsrp: 566,
      deviceSku: "XPPPLUSDL",
      deviceCatalogId: "milestone-xppplus-dl",
      deviceMsrp: 192,
      carePlusSku: "MCPL-XPPPLUSDL",
      carePlusCatalogId: "milestone-mcpl-xppplus-1y",
      carePlusMonthlyMsrp: 2.97,
      carePlusAnnualMsrp: 35.64,
      carePremSku: "MCPR-XPPPLUSDL",
      carePremCatalogId: "milestone-mcpr-xppplus-1y",
      carePremMonthlyMsrp: 1.14,
      carePremAnnualMsrp: 13.68,
      maxCameras: 999999,
      maxRecordingServers: 9999,
      mandatoryCarePlus: false,
      includesSmartWall: false,
      includesIncidentManager: false,
      supportsFailoverRecording: false,
      supportsFederation: false,
      supportsInterconnectCentral: false,
      datasheet: "Datasheets/Milestone/Milestone_XProtect_Professional_Plus_Datasheet.pdf",
      summary: "Multi-site / multi-server VMS with unrestricted cameras, Smart Map, Access, LPR & Transact."
    },
    expert: {
      key: "expert",
      label: "XProtect Expert",
      shortLabel: "Expert",
      baseSku: "XPETBL",
      baseCatalogId: "milestone-xpet-bl",
      baseMsrp: 2267,
      deviceSku: "XPETDL",
      deviceCatalogId: "milestone-xpet-dl",
      deviceMsrp: 305,
      carePlusSku: "MCPL-XPETDL",
      carePlusCatalogId: "milestone-mcpl-xpet-1y",
      carePlusMonthlyMsrp: 4.59,
      carePlusAnnualMsrp: 55.08,
      carePremSku: "MCPR-XPETDL",
      carePremCatalogId: "milestone-mcpr-xpet-1y",
      carePremMonthlyMsrp: 1.79,
      carePremAnnualMsrp: 21.48,
      maxCameras: 999999,
      maxRecordingServers: 9999,
      mandatoryCarePlus: true,
      includesSmartWall: false,
      includesIncidentManager: false,
      supportsFailoverRecording: true,
      supportsFederation: false,
      supportsInterconnectCentral: false,
      datasheet: "Datasheets/Milestone/Milestone_XProtect_Expert_Datasheet.pdf",
      summary: "Enterprise VMS with Hot/Cold Failover Recording Servers ($0), Multi-Stage Grooming, AES-256 DB Encryption & GPU Server VMD."
    },
    corporate: {
      key: "corporate",
      label: "XProtect Corporate",
      shortLabel: "Corporate",
      baseSku: "XPCOBT",
      baseCatalogId: "milestone-xpcobt-bl",
      baseMsrp: 3610,
      deviceSku: "XPCODL",
      deviceCatalogId: "milestone-xprotect-corp-dev",
      deviceMsrp: 373,
      carePlusSku: "MCPL-XPCODL",
      carePlusCatalogId: "milestone-mcpl-xpco-1y",
      carePlusMonthlyMsrp: 5.67,
      carePlusAnnualMsrp: 68.04,
      carePremSku: "MCPR-XPCODL",
      carePremCatalogId: "milestone-mcpr-xpco-1y",
      carePremMonthlyMsrp: 2.22,
      carePremAnnualMsrp: 26.64,
      maxCameras: 999999,
      maxRecordingServers: 9999,
      mandatoryCarePlus: true,
      includesSmartWall: true,
      includesIncidentManager: true,
      supportsFailoverRecording: true,
      supportsFederation: true,
      supportsInterconnectCentral: true,
      datasheet: "Datasheets/Milestone/Milestone_XProtect_Corporate_Datasheet.pdf",
      summary: "Flagship mission-critical VMS: Includes Smart Wall ($15,799 value) & Incident Manager ($9,975 value) free, Federated Architecture, Interconnect, Evidence Lock & 2FA."
    }
  },

  // Official Milestone Care Multi-Year Pre-Paid Discounts (XProtect_Price List_USD-US_January 1_2027.xlsx)
  CARE_MULTI_YEAR_DISCOUNTS: {
    1: 0.00, // 1-Year = 0% discount
    2: 0.10, // 2-Year = 10% discount
    3: 0.15, // 3-Year = 15% discount
    4: 0.20, // 4-Year = 20% discount
    5: 0.25  // 5-Year = 25% discount
  },

  getDefaultConfig() {
    return {
      tierMode: "auto",                  // "auto" | "express_plus" | "professional_plus" | "expert" | "corporate"
      careYears: 3,                      // 1 | 2 | 3 | 4 | 5 (Multi-year Care Plus discount: 2Y=10%, 3Y=15%, 4Y=20%, 5Y=25%)
      carePremium: false,                // Milestone Care Premium 24/7 Support add-on
      failoverRecordingMode: "none",     // "none" | "cold_group" (N:1 Cold Standby Failover Group) | "hot_standby" (1:1 Hot Standby)
      managementServerFailover: false,   // XPMSFSL ($7,650) — High-Availability Management Server Failover
      enableSmartWall: false,            // XPSWBL ($15,799 on Expert; included $0 in Corporate)
      enableIncidentManager: false,      // XPIMBL ($9,975 on Express+/Pro+/Expert; included $0 in Corporate)
      enableAccessControl: false,        // Toggle: XProtect Access or AXIS Secure Entry
      accessMode: "xprotect_access",     // "xprotect_access" (XPABL $129 + XPADL $39/reader) | "axis_secure_entry" (XPSEABL $0 + XPSEADL $89/door)
      accessReadersOverride: null,       // null = auto-detect from BOM / Door Builder
      enableLpr: false,                  // Toggle: XProtect LPR (XPLPRBL $300 + XPLPRCL $1,295/cam)
      lprCamerasOverride: null,          // null = auto-detect from BOM
      lprCountryLibs: 1,                 // 1 country/state module included in XPLPRBL; extras use XPLPRLL ($645)
      enableTransact: false,             // Toggle: XProtect Transact POS/ATM (XPTBS $299 w/ 1 source + XPTC1 $269/extra)
      transactSources: 2,
      enableInterconnect: false,         // Toggle: Milestone Interconnect (XPCOMIDL $77.76/remote camera — Corporate central site)
      interconnectCameras: 0,
      enableFederated: false,            // Toggle: Milestone Federated Architecture (Included $0 in Corporate)
      enableRapidReview: false,          // Toggle: XProtect Rapid REVIEW powered by BriefCam (XPRRDL $220/cam + Husky XA/XE Server)
      rapidReviewCameras: 0,
      enableHospitalAssist: false,       // Toggle: XProtect Hospital Assist fall detection (XPHADL $499/cam — Expert/Corporate)
      hospitalAssistCameras: 0,
      enableArculesCloud: false,         // Toggle: Arcules Hybrid Cloud Gateway (Husky GW HGWD/HGWDE/HGWR/HGWRE)
      arculesChannels: 0,
      workstationClients: 2,             // Smart Client is $0 unlimited licenses; used to size Husky IVO 150D / 350T Viewing Stations
      applianceFormFactor: "rack"        // "rack" | "tower" | "desktop"
    };
  },

  recommendHuskyAppliances(videoLoad, licConfig) {
    const serversDb = (typeof window !== "undefined" && Array.isArray(window.SERVERS_DATABASE))
      ? window.SERVERS_DATABASE
      : [];
    const workstationsDb = (typeof window !== "undefined" && Array.isArray(window.WORKSTATIONS_DATABASE))
      ? window.WORKSTATIONS_DATABASE
      : [];

    const cams = videoLoad.totalSensorHeads || videoLoad.cameraUnits || 0;
    const reqTb = videoLoad.baseRequiredUsableTb || videoLoad.requiredUsableTb || 0;
    const reqMbps = videoLoad.peakIngressMbps || 0;
    const formPref = licConfig.applianceFormFactor || "rack";

    const huskyIvoList = serversDb.filter(s => (s.isMilestoneHusky || s.isHusky) && s.applianceSeries && s.applianceSeries.includes("Husky IVO"));
    let primaryAppliance = null;
    let primaryQty = 1;
    let recordingReason = "";

    if (cams > 0) {
      let pool = huskyIvoList.slice().sort((a, b) => (a.msrp || 0) - (b.msrp || 0));
      if (formPref === "desktop") {
        const d = pool.filter(s => String(s.formFactor || "").toLowerCase().includes("desktop"));
        if (d.length > 0) pool = d;
      } else if (formPref === "tower") {
        const t = pool.filter(s => String(s.formFactor || "").toLowerCase().includes("tower"));
        if (t.length > 0) pool = t;
      } else {
        const r = pool.filter(s => String(s.formFactor || "").toLowerCase().includes("rack"));
        if (r.length > 0) pool = r;
      }

      const singleFit = pool.find(s =>
        (s.maxCameraChannels || s.maxCameras || 150) >= cams &&
        (s.maxIngestBandwidthMbps || s.maxThroughputMbps || 720) >= reqMbps &&
        (s.usableStorageTb || 0) >= reqTb
      );

      if (singleFit) {
        primaryAppliance = singleFit;
        primaryQty = 1;
        recordingReason = `1x ${singleFit.model} satisfies ${cams} streams (${Math.round(reqMbps)} Mbps / ${reqTb} TB usable).`;
      } else {
        const largest = huskyIvoList.find(s => s.id === "milestone-husky-ivo-1800r-384tb")
          || huskyIvoList.find(s => s.id === "milestone-husky-ivo-1800r-192tb")
          || huskyIvoList.find(s => s.id === "milestone-husky-ivo-1000r")
          || pool[pool.length - 1];
        if (largest) {
          primaryAppliance = largest;
          const byCams = Math.ceil(cams / (largest.maxCameraChannels || largest.maxCameras || 250));
          const byMbps = Math.ceil(reqMbps / (largest.maxIngestBandwidthMbps || largest.maxThroughputMbps || 1800));
          const byTb = Math.ceil(reqTb / (largest.usableStorageTb || 160));
          primaryQty = Math.max(1, byCams, byMbps, byTb);
          recordingReason = `${primaryQty}x ${largest.model} scaled across ${cams} streams (${Math.round(reqMbps)} Mbps / ${reqTb} TB usable).`;
        }
      }
    }

    // Failover Recording Server appliance
    let failoverAppliance = null;
    let failoverQty = 0;
    if (licConfig.failoverRecordingMode === "cold_group" && primaryAppliance) {
      failoverAppliance = primaryAppliance;
      failoverQty = 1;
    } else if (licConfig.failoverRecordingMode === "hot_standby" && primaryAppliance) {
      failoverAppliance = primaryAppliance;
      failoverQty = primaryQty;
    }

    // BriefCam / Rapid REVIEW Analytics Server (Husky XA / XE)
    let analyticsAppliance = null;
    let analyticsQty = 0;
    if (licConfig.enableRapidReview && (licConfig.rapidReviewCameras || cams) > 0) {
      const rrCams = licConfig.rapidReviewCameras > 0 ? licConfig.rapidReviewCameras : Math.min(cams || 10, 50);
      if (rrCams <= 20) {
        analyticsAppliance = serversDb.find(s => s.id === "milestone-husky-xa-20r") || serversDb.find(s => s.id === "milestone-husky-xa-20t");
        analyticsQty = 1;
      } else if (rrCams <= 50) {
        analyticsAppliance = serversDb.find(s => s.id === "milestone-husky-xa-50r");
        analyticsQty = 1;
      } else {
        analyticsAppliance = serversDb.find(s => s.id === "milestone-husky-xe-700r") || serversDb.find(s => s.id === "milestone-husky-xa-50r");
        analyticsQty = Math.max(1, Math.ceil(rrCams / 100));
      }
    }

    // Arcules Cloud Gateway (Husky GW)
    let cloudGatewayAppliance = null;
    let cloudGatewayQty = 0;
    if (licConfig.enableArculesCloud) {
      const gwCh = licConfig.arculesChannels > 0 ? licConfig.arculesChannels : Math.max(16, cams);
      if (gwCh <= 25) {
        cloudGatewayAppliance = serversDb.find(s => s.id === "milestone-husky-gw-gwd-2tb");
        cloudGatewayQty = 1;
      } else if (gwCh <= 50) {
        cloudGatewayAppliance = serversDb.find(s => s.id === "milestone-husky-gw-gwde-8tb");
        cloudGatewayQty = 1;
      } else if (gwCh <= 110) {
        cloudGatewayAppliance = serversDb.find(s => s.id === "milestone-husky-gw-gwr-16tb");
        cloudGatewayQty = 1;
      } else {
        cloudGatewayAppliance = serversDb.find(s => s.id === "milestone-husky-gw-gwre-32tb");
        cloudGatewayQty = Math.max(1, Math.ceil(gwCh / 150));
      }
    }

    // Viewing Stations (Husky IVO 150D VS / 350T VS)
    const wsCount = Math.max(0, parseInt(licConfig.workstationClients ?? 2, 10) || 0);
    const viewingStation = (cams > 20 || licConfig.enableSmartWall)
      ? (workstationsDb.find(w => w.id === "milestone-husky-ivo-350t-vs") || workstationsDb[0])
      : (workstationsDb.find(w => w.id === "milestone-husky-ivo-150d-vs") || workstationsDb[0]);

    return {
      primaryAppliance,
      primaryQty,
      recordingReason,
      failoverAppliance,
      failoverQty,
      analyticsAppliance,
      analyticsQty,
      cloudGatewayAppliance,
      cloudGatewayQty,
      viewingStation,
      viewingStationQty: wsCount
    };
  },

  calculateFromBOM(bomList = [], customConfig = {}) {
    const baseConfig = Object.assign(this.getDefaultConfig(), customConfig);
    const videoLoad = VideoStorageSizer.calculateFromBOM(bomList, { vmsVendor: "milestone" });
    const cameraUnits = videoLoad.cameraUnits || 0;
    const totalSensorHeads = videoLoad.totalSensorHeads || cameraUnits;

    // Auto-detect LPR cameras & Access Control doors/readers from BOM & Door Builder
    let bomLprCameras = 0;
    let bomAccessReaders = 0;
    (Array.isArray(bomList) ? bomList : []).forEach(item => {
      if (!item || item.parentInstanceId) return;
      const qty = parseInt(item.qty ?? item.quantity, 10) || 1;
      const modelAndSub = `${item.model || ""} ${item.subcategory || ""} ${item.description || ""}`.toLowerCase();
      if (modelAndSub.includes("lpr") || modelAndSub.includes("anpr") || modelAndSub.includes("license plate")) {
        bomLprCameras += qty;
      }
      if (String(item.category || "").toLowerCase() === "access_control" && (modelAndSub.includes("reader") || modelAndSub.includes("door"))) {
        bomAccessReaders += qty;
      }
    });

    const careYears = Math.max(1, Math.min(5, parseInt(baseConfig.careYears, 10) || 3));
    const careDiscountFactor = 1.0 - (this.CARE_MULTI_YEAR_DISCOUNTS[careYears] || 0);
    const careDiscountPct = Math.round((this.CARE_MULTI_YEAR_DISCOUNTS[careYears] || 0) * 100);

    const enableSmartWall = Boolean(baseConfig.enableSmartWall);
    const enableIncidentManager = Boolean(baseConfig.enableIncidentManager);
    const enableAccessControl = Boolean(baseConfig.enableAccessControl);
    const accessMode = baseConfig.accessMode || "xprotect_access";
    const effectiveAccessCount = enableAccessControl
      ? (baseConfig.accessReadersOverride !== null && baseConfig.accessReadersOverride !== undefined
          ? Math.max(0, parseInt(baseConfig.accessReadersOverride, 10) || 0)
          : Math.max(2, bomAccessReaders))
      : 0;

    const enableLpr = Boolean(baseConfig.enableLpr) || bomLprCameras > 0;
    const effectiveLprCameras = enableLpr
      ? (baseConfig.lprCamerasOverride !== null && baseConfig.lprCamerasOverride !== undefined
          ? Math.max(0, parseInt(baseConfig.lprCamerasOverride, 10) || 0)
          : Math.max(1, bomLprCameras))
      : 0;
    const lprCountryLibs = Math.max(1, parseInt(baseConfig.lprCountryLibs, 10) || 1);

    const enableTransact = Boolean(baseConfig.enableTransact);
    const transactSources = enableTransact ? Math.max(1, parseInt(baseConfig.transactSources, 10) || 1) : 0;

    const enableInterconnect = Boolean(baseConfig.enableInterconnect);
    const interconnectCameras = enableInterconnect ? Math.max(1, parseInt(baseConfig.interconnectCameras, 10) || 1) : 0;

    const enableFederated = Boolean(baseConfig.enableFederated);
    const failoverRecordingMode = baseConfig.failoverRecordingMode || (videoLoad.failover?.structure === "dedicated" ? "cold_group" : "none");
    const managementServerFailover = Boolean(baseConfig.managementServerFailover);

    const enableRapidReview = Boolean(baseConfig.enableRapidReview);
    const rapidReviewCameras = enableRapidReview ? Math.max(1, parseInt(baseConfig.rapidReviewCameras, 10) || Math.min(Math.max(1, cameraUnits), 25)) : 0;

    const enableHospitalAssist = Boolean(baseConfig.enableHospitalAssist);
    const hospitalAssistCameras = enableHospitalAssist ? Math.max(1, parseInt(baseConfig.hospitalAssistCameras, 10) || 10) : 0;

    // Determine Effective XProtect Edition Tier ("express_plus" | "professional_plus" | "expert" | "corporate")
    let effectiveTierKey = baseConfig.tierMode === "auto" ? "professional_plus" : baseConfig.tierMode;
    const tierPromotionReasons = [];

    if (baseConfig.tierMode === "auto") {
      if (enableInterconnect || enableFederated) {
        effectiveTierKey = "corporate";
        tierPromotionReasons.push("Milestone Federated Architecture / Central Interconnect requires XProtect Corporate.");
      } else if (enableSmartWall || (enableSmartWall && enableIncidentManager)) {
        // Smart Wall add-on on Expert costs $15,799 (`XPSWBL`), whereas Corporate includes Smart Wall AND Incident Manager ($9,975) for free!
        effectiveTierKey = "corporate";
        tierPromotionReasons.push("XProtect Smart Wall ($15,799 add-on on Expert) is included free in XProtect Corporate — auto-selected Corporate for lower total cost.");
      } else if (failoverRecordingMode !== "none" || managementServerFailover || enableHospitalAssist || cameraUnits > 250) {
        effectiveTierKey = "expert";
        tierPromotionReasons.push("Hot/Cold Failover Recording Servers, Management Failover, and Hospital Assist require XProtect Expert or Corporate.");
      } else if (cameraUnits > 0 && cameraUnits <= 48 && (videoLoad.milestone?.primaryServersCount || 1) === 1 && !enableLpr && !enableTransact) {
        effectiveTierKey = "express_plus";
        tierPromotionReasons.push("Single Recording Server with ≤48 cameras qualifies for XProtect Express+.");
      } else {
        effectiveTierKey = "professional_plus";
        tierPromotionReasons.push("Multi-server / unrestricted camera scalability with XProtect Professional+.");
      }
    }

    const compatibilityWarnings = [];
    if (effectiveTierKey === "express_plus") {
      if (cameraUnits > 100) {
        compatibilityWarnings.push(`XProtect Express+ supports a maximum of 100 cameras (${cameraUnits} configured). Upgrade to Professional+, Expert, or Corporate.`);
      }
      if ((videoLoad.milestone?.primaryServersCount || 1) > 1) {
        compatibilityWarnings.push(`XProtect Express+ is restricted to 1 Recording Server (${videoLoad.milestone?.primaryServersCount} required). Upgrade to Professional+, Expert, or Corporate.`);
      }
      if (failoverRecordingMode !== "none") {
        compatibilityWarnings.push("XProtect Express+ does not support Failover Recording Servers. Upgrade to XProtect Expert or Corporate.");
      }
    }
    if (effectiveTierKey === "professional_plus" && failoverRecordingMode !== "none") {
      compatibilityWarnings.push("XProtect Professional+ does not include native Hot/Cold Standby Failover Recording Servers. Upgrade to XProtect Expert or Corporate (where Failover Recording Servers are included free).");
    }
    if ((effectiveTierKey === "express_plus" || effectiveTierKey === "professional_plus") && enableSmartWall) {
      compatibilityWarnings.push("XProtect Smart Wall is only supported on XProtect Expert ($15,799 add-on) or XProtect Corporate (included free).");
    }
    if (effectiveTierKey !== "corporate" && (enableInterconnect || enableFederated)) {
      compatibilityWarnings.push("Milestone Federated Architecture & Central Interconnect require XProtect Corporate at the central site.");
    }

    const tierDef = this.TIERS[effectiveTierKey] || this.TIERS.professional_plus;
    const deviceLicenseCount = Math.max(0, cameraUnits);

    const lineItems = [];
    const addLineItem = (sku, model, category, qty, unitMsrp, catalogId, notes) => {
      if (qty <= 0) return;
      const ext = Math.round(qty * unitMsrp * 100) / 100;
      lineItems.push({
        sku,
        model,
        category,
        qty,
        unitMsrp: Math.round(unitMsrp * 100) / 100,
        extendedMsrp: ext,
        catalogId,
        notes
      });
    };

    // 1. Base Server License
    addLineItem(
      tierDef.baseSku,
      `Milestone ${tierDef.label} — Base Server License`,
      "Milestone XProtect Base & Device Licenses",
      1,
      tierDef.baseMsrp,
      tierDef.baseCatalogId,
      tierDef.summary
    );

    // 2. Hardware Device Licenses (1 per multi-channel IP camera / encoder)
    if (deviceLicenseCount > 0) {
      addLineItem(
        tierDef.deviceSku,
        `Milestone ${tierDef.label} — Hardware Device License`,
        "Milestone XProtect Base & Device Licenses",
        deviceLicenseCount,
        tierDef.deviceMsrp,
        tierDef.deviceCatalogId,
        `1 Device License per IP camera (${deviceLicenseCount} cameras). Multi-sensor cameras Sharing 1 IP/MAC generally consume 1 hardware device license.`
      );

      // 3. Milestone Care Plus Maintenance (with Multi-Year Pre-Paid Discount: 1Y=0%, 2Y=10%, 3Y=15%, 4Y=20%, 5Y=25%)
      const discountedCarePlusUnit = tierDef.carePlusAnnualMsrp * careYears * careDiscountFactor;
      addLineItem(
        tierDef.carePlusSku,
        `Milestone Care Plus for ${tierDef.label} — ${careYears}-Year Term${careDiscountPct > 0 ? ` (${careDiscountPct}% Multi-Year Discount Applied)` : ""}`,
        "Milestone Care Plus & Care Premium",
        deviceLicenseCount,
        discountedCarePlusUnit,
        tierDef.carePlusCatalogId,
        `$${tierDef.carePlusMonthlyMsrp.toFixed(2)}/mo ($${tierDef.carePlusAnnualMsrp.toFixed(2)}/yr list) × ${careYears} yr${careYears > 1 ? "s" : ""}${careDiscountPct > 0 ? ` less ${careDiscountPct}% multi-year discount` : ""}. ${tierDef.mandatoryCarePlus ? "Mandatory minimum 1-Year Care Plus on Expert/Corporate." : "Includes 3x per year R1/R2/R3 software updates & Customer Dashboard."}`
      );

      if (baseConfig.carePremium) {
        const discountedCarePremUnit = tierDef.carePremAnnualMsrp * careYears * careDiscountFactor;
        addLineItem(
          tierDef.carePremSku,
          `Milestone Care Premium 24/7 Support for ${tierDef.label} — ${careYears}-Year Term${careDiscountPct > 0 ? ` (${careDiscountPct}% Discount)` : ""}`,
          "Milestone Care Plus & Care Premium",
          deviceLicenseCount,
          discountedCarePremUnit,
          tierDef.carePremCatalogId,
          `24/7/365 direct Milestone technical support Engineers ($${tierDef.carePremMonthlyMsrp.toFixed(2)}/mo list).`
        );
      }
    }

    // 4. Smart Wall & Incident Manager
    if (enableSmartWall) {
      if (effectiveTierKey === "corporate") {
        addLineItem(
          "XPSWBL-INC",
          "Milestone XProtect Smart Wall — Included Free with XProtect Corporate ($15,799 Value)",
          "Milestone XProtect Add-On Products",
          1,
          0,
          "milestone-xpswbl",
          "Unlimited Smart Wall video wall monitors & presets included at $0 in XProtect Corporate."
        );
      } else {
        addLineItem(
          "XPSWBL",
          "Milestone XProtect Smart Wall — Base License (For XProtect Expert)",
          "Milestone XProtect Add-On Products",
          1,
          15799,
          "milestone-xpswbl",
          "Unlocks Smart Wall dynamic video wall control on XProtect Expert (Included free in XProtect Corporate)."
        );
      }
    }

    if (enableIncidentManager) {
      if (effectiveTierKey === "corporate") {
        addLineItem(
          "XPIMBL-INC",
          "Milestone XProtect Incident Manager — Included Free with XProtect Corporate ($9,975 Value)",
          "Milestone XProtect Add-On Products",
          1,
          0,
          "milestone-xpimbl",
          "Incident documentation, sequence linking & case management included at $0 in XProtect Corporate."
        );
      } else {
        addLineItem(
          "XPIMBL",
          "Milestone XProtect Incident Manager — Base License",
          "Milestone XProtect Add-On Products",
          1,
          9975,
          "milestone-xpimbl",
          "Incident documentation & video evidence packaging (Included free in XProtect Corporate)."
        );
      }
    }

    if (managementServerFailover) {
      addLineItem(
        "XPMSFSL",
        "Milestone XProtect Management Server Failover — License",
        "Milestone XProtect Add-On Products",
        1,
        7650,
        "milestone-xpmsfsl",
        "Automated high-availability cluster failover for the XProtect Management Server role."
      );
    }

    // 5. Access Control (XProtect Access vs AXIS Secure Entry)
    if (enableAccessControl && effectiveAccessCount > 0) {
      if (accessMode === "axis_secure_entry") {
        addLineItem(
          "XPSEABL",
          "Milestone XProtect Access for AXIS Secure Entry — Base License ($0)",
          "Milestone XProtect Access Control",
          1,
          0,
          "milestone-xpseabl",
          "Free base license for native Axis A1610 / A1210 / A1001 network door controller management."
        );
        addLineItem(
          "XPSEADL",
          "Milestone XProtect Access for AXIS Secure Entry — Door License",
          "Milestone XProtect Access Control",
          effectiveAccessCount,
          89,
          "milestone-xpseadl",
          `1 Door License per controlled Axis door (${effectiveAccessCount} doors @ $89/door).`
        );
      } else {
        addLineItem(
          "XPABL",
          "Milestone XProtect Access — Base License",
          "Milestone XProtect Access Control",
          1,
          129,
          "milestone-xpabl",
          "Enables third-party access control integration (LenelS2, Genetec, Gallagher, Paxton, HID, ASSA ABLOY) in Smart Client."
        );
        addLineItem(
          "XPADL",
          "Milestone XProtect Access — Access Control Reader / Door License",
          "Milestone XProtect Access Control",
          effectiveAccessCount,
          39,
          "milestone-xpadl",
          `1 License per integrated reader/door (${effectiveAccessCount} readers @ $39/reader).`
        );
      }
    }

    // 6. XProtect LPR
    if (enableLpr && effectiveLprCameras > 0) {
      addLineItem(
        "XPLPRBL",
        "Milestone XProtect LPR — Base License (Includes 1 Country/State Library)",
        "Milestone XProtect LPR & Analytics",
        1,
        300,
        "milestone-xplprbl",
        "Base license for Milestone XProtect License Plate Recognition."
      );
      addLineItem(
        "XPLPRCL",
        "Milestone XProtect LPR — Camera License",
        "Milestone XProtect LPR & Analytics",
        effectiveLprCameras,
        1295,
        "milestone-xplprcl",
        `1 LPR Camera License per LPR lane camera (${effectiveLprCameras} cameras @ $1,295/cam).`
      );
      if (lprCountryLibs > 1) {
        addLineItem(
          "XPLPRLL",
          "Milestone XProtect LPR — Additional Country/Region Module License",
          "Milestone XProtect LPR & Analytics",
          lprCountryLibs - 1,
          645,
          "milestone-xplprll",
          "Additional country/region LPR recognition library."
        );
      }
    }

    // 7. XProtect Transact (POS / ATM)
    if (enableTransact && transactSources > 0) {
      addLineItem(
        "XPTBS",
        "Milestone XProtect Transact — Base License (Includes 1 Transaction Source)",
        "Milestone XProtect Add-On Products",
        1,
        299,
        "milestone-xptbs",
        "Links POS cash register / ATM / barcode receipts with video."
      );
      if (transactSources > 1) {
        addLineItem(
          "XPTC1",
          "Milestone XProtect Transact — Additional Transaction Source License",
          "Milestone XProtect Add-On Products",
          transactSources - 1,
          269,
          "milestone-xptc1",
          `${transactSources - 1} additional POS/ATM transaction source(s).`
        );
      }
    }

    // 8. Milestone Interconnect / Rapid REVIEW / Hospital Assist
    if (enableInterconnect && interconnectCameras > 0) {
      addLineItem(
        "XPCOMIDL",
        "Milestone Interconnect — Remote Site Camera License (Requires XProtect Corporate)",
        "Milestone XProtect Add-On Products",
        interconnectCameras,
        77.76,
        "milestone-xpcomidl",
        `Connects ${interconnectCameras} remote Express+/Professional+/Expert/Husky cameras into central XProtect Corporate.`
      );
    }

    if (enableRapidReview && rapidReviewCameras > 0) {
      addLineItem(
        "XPRRDL",
        "Milestone XProtect Rapid REVIEW (Powered by BriefCam) — Camera License",
        "Milestone XProtect LPR & Analytics",
        rapidReviewCameras,
        220,
        "milestone-xprrdl",
        `VIDEO SYNOPSIS® & cross-camera forensic search for ${rapidReviewCameras} cameras (Requires Husky XA / XE Analytics Server).`
      );
    }

    if (enableHospitalAssist && hospitalAssistCameras > 0) {
      addLineItem(
        "XPHADL",
        "Milestone XProtect Hospital Assist — Privacy & Fall Detection Camera License",
        "Milestone XProtect LPR & Analytics",
        hospitalAssistCameras,
        499,
        "milestone-xphadl",
        `Patient room live privacy blur & automatic fall detection for ${hospitalAssistCameras} cameras.`
      );
    }

    const totalSoftwareMsrp = Math.round(lineItems.reduce((sum, li) => sum + li.extendedMsrp, 0) * 100) / 100;
    const huskyPlan = this.recommendHuskyAppliances(videoLoad, Object.assign({}, baseConfig, {
      failoverRecordingMode,
      enableRapidReview,
      rapidReviewCameras,
      enableSmartWall
    }));

    const totalHardwareMsrp =
      ((huskyPlan.primaryAppliance?.msrp || 0) * (huskyPlan.primaryQty || 0)) +
      ((huskyPlan.failoverAppliance?.msrp || 0) * (huskyPlan.failoverQty || 0)) +
      ((huskyPlan.analyticsAppliance?.msrp || 0) * (huskyPlan.analyticsQty || 0)) +
      ((huskyPlan.cloudGatewayAppliance?.msrp || 0) * (huskyPlan.cloudGatewayQty || 0)) +
      ((huskyPlan.viewingStation?.msrp || 0) * (huskyPlan.viewingStationQty || 0));

    const combinedTurnkeyMsrp = Math.round((totalSoftwareMsrp + totalHardwareMsrp) * 100) / 100;

    return {
      config: baseConfig,
      videoLoad,
      cameraUnits,
      totalDeviceLicenses: deviceLicenseCount,
      totalSensorHeads,
      effectiveTierKey,
      tierDef,
      editionInfo: tierDef,
      tierPromotionReasons,
      autoUpgradedReasons: tierPromotionReasons,
      careYears,
      careDiscountPct,
      multiYearDiscountPct: careDiscountPct,
      carePremium: Boolean(baseConfig.carePremium),
      failoverRecordingMode,
      managementServerFailover,
      enableSmartWall,
      enableIncidentManager,
      enableAccessControl,
      accessMode,
      effectiveAccessCount,
      enableLpr,
      effectiveLprCameras,
      lprCountryLibs,
      enableTransact,
      transactSources,
      enableInterconnect,
      interconnectCameras,
      enableFederated,
      enableRapidReview,
      rapidReviewCameras,
      enableHospitalAssist,
      hospitalAssistCameras,
      enableArculesCloud: Boolean(baseConfig.enableArculesCloud),
      arculesChannels: parseInt(baseConfig.arculesChannels, 10) || 0,
      workstationClients: parseInt(baseConfig.workstationClients ?? 2, 10) || 0,
      compatibilityWarnings,
      lineItems,
      totalSoftwareMsrp,
      huskyPlan,
      totalHardwareMsrp,
      combinedTurnkeyMsrp,
      totalTurnkeyMsrp: combinedTurnkeyMsrp
    };
  },

  calculate(bomList = [], customConfig = {}) {
    const activeCfg = Object.assign(
      {},
      (typeof window !== "undefined" && window.milestoneLicensingConfig) ? window.milestoneLicensingConfig : {},
      customConfig
    );
    return this.calculateFromBOM(bomList, activeCfg);
  }
};

window.MilestoneLicensingSizer = MilestoneLicensingSizer;
if (window.OSS && typeof window.OSS.register === "function") {
  window.OSS.register("Sizers.Milestone", { MilestoneLicensingSizer });
}
