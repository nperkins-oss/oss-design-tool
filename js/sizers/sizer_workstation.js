// SUBSYSTEM: Engineering Sizers — Client Workstation Decoding & GPU Sizer (js/sizers/sizer_workstation.js)

// =========================================================================
// 8. MULTI-MANUFACTURER CLIENT WORKSTATION DECODING & HARDWARE SIZER
// Supports Genetec Security Desk 5.14.1.0 & Milestone XProtect Smart Client 2026
// =========================================================================

const ClientWorkstationSizer = {
  state: {
    vmsPlatform: "genetec",          // "genetec" (Genetec Security Desk 5.14) | "milestone" (Milestone XProtect Smart Client 2026 / Husky IVO VS)
    adaptiveStreaming: false,        // Milestone XProtect Smart Client Adaptive Streaming (reduces multi-tile decode load by ~35%)
    viewedGroups: [
      {
        id: "ws_grp_1",
        name: "Primary Camera Grid (1080p FHD)",
        qty: 16,
        viewedCameras: 16,
        heads: 1,
        resolutionMp: 2,
        fps: 15,
        codec: "H.265",
        dewarping: false
      },
      {
        id: "ws_grp_2",
        name: "Spot / Perimeter Tiles (4K UHD)",
        qty: 4,
        viewedCameras: 4,
        heads: 1,
        resolutionMp: 8,
        fps: 15,
        codec: "H.265",
        dewarping: false
      }
    ],
    syncAllColumns: {
      heads: false,
      resolutionMp: false,
      fps: false,
      codec: false,
      dewarping: false
    },
    usageMode: "active_operator",    // "active_operator" (80% cap / 20% headroom) | "video_wall" (85% cap / 15% headroom)
    scenarioMode: "active_operator",
    hwAccelDecode: true,
    hardwareAcceleration: true,      // Intel Quick Sync Video / NVIDIA NVDEC Hardware Decoding
    watermarking: false,             // Page 6: -10% max tiles with HW acceleration, -30% without HW acceleration
    encryptedStreams: false,         // Page 6: Up to +40% CPU usage on low-resolution streams (<=2MP)
    monitorCount: 2,
    monitorsPerWorkstation: 2,       // Tested baseline: 2x 4K UHD monitors (1..8 displays)
    displayResolution: "4k",         // "fhd" (1920x1080 / 1920x1200) | "4k" (3840x2160 UHD)
    workstationCount: 1,
    operatorStationsCount: 1,        // Number of operator desks / workstations viewing this layout
    preferredFormFactor: "any",      // "any" | "tower" | "rack"
    layoutDistributionMode: "per_station"
  },

  /**
   * Computes the benchmark maximum simultaneous streams at 30 FPS on a given profile
   * (Minimum, Recommended, High-Performance) for Genetec 5.14.1.0 or Milestone XProtect 2026.
   */
  getBenchmarkMaxStreamsAt30Fps(profileKey, rawCodec, resolutionMp, vmsPlatform = "genetec") {
    const reqObj = vmsPlatform === "milestone" ? MILESTONE_2026_REQUIREMENTS : GENETEC_514_REQUIREMENTS;
    const bench = reqObj.CLIENT_DECODING_BENCHMARKS_30FPS;
    const codec = VideoStorageSizer.normalizeCodec(rawCodec || "H.265");
    const mp = Math.max(0.4, Number(resolutionMp) || 2.0);

    const fhdRow = (bench.fhd_2mp && bench.fhd_2mp[codec]) || bench.fhd_2mp["H.265"];
    const uhdRow = (bench.uhd_8mp && bench.uhd_8mp[codec]) || bench.uhd_8mp["H.265"];

    const cap2Mp = Number(fhdRow[profileKey] ?? 0);
    const cap8Mp = Number(uhdRow[profileKey] ?? 0);

    if (cap8Mp <= 0 && mp >= 4.0) {
      return 0;
    }
    if (cap2Mp <= 0) {
      return 0;
    }

    if (mp <= 2.0) {
      return cap2Mp * (2.0 / mp);
    }
    if (mp >= 8.0) {
      if (cap8Mp <= 0) return 0;
      return cap8Mp * (8.0 / mp);
    }

    const t = (mp - 2.0) / (8.0 - 2.0);
    const mpBudget2 = 2.0 * cap2Mp;
    const mpBudget8 = 8.0 * (cap8Mp > 0 ? cap8Mp : (cap2Mp * 0.25));
    const interpolatedMpBudget = ((1 - t) * mpBudget2) + (t * mpBudget8);
    return interpolatedMpBudget / mp;
  },

  /**
   * Computes global capacity multiplier from Genetec Section 1.3 or Milestone Smart Client modifiers.
   */
  getModifierFactors(config = {}) {
    const vmsPlatform = String(config.vmsPlatform || this.state.vmsPlatform || "genetec").toLowerCase();
    const adaptiveStreaming = config.adaptiveStreaming !== undefined ? Boolean(config.adaptiveStreaming) : Boolean(this.state.adaptiveStreaming);
    const scenarioMode = config.usageMode || config.scenarioMode || this.state.usageMode || this.state.scenarioMode || "active_operator";
    const hwAccel = config.hwAccelDecode !== undefined
      ? Boolean(config.hwAccelDecode)
      : (config.hardwareAcceleration !== undefined ? Boolean(config.hardwareAcceleration) : Boolean(this.state.hwAccelDecode ?? this.state.hardwareAcceleration));
    const watermarking = config.watermarking !== undefined ? Boolean(config.watermarking) : Boolean(this.state.watermarking);
    const encrypted = config.encryptedStreams !== undefined ? Boolean(config.encryptedStreams) : Boolean(this.state.encryptedStreams);
    const monitors = Math.max(1, Math.min(16, parseInt(config.monitorCount ?? config.monitorsPerWorkstation ?? this.state.monitorCount ?? this.state.monitorsPerWorkstation ?? 2, 10) || 2));

    const scenarioFactor = scenarioMode === "video_wall" ? 1.0 : 0.80;

    let watermarkHwFactor = 1.0;
    if (watermarking && hwAccel) {
      watermarkHwFactor = 0.90;
    } else if (watermarking && !hwAccel) {
      watermarkHwFactor = 0.70;
    } else if (!watermarking && !hwAccel) {
      watermarkHwFactor = 0.75;
    }

    let monitorFactor = 1.0;
    if (vmsPlatform === "milestone") {
      if (monitors === 1) monitorFactor = 1.0;
      else if (monitors === 2) monitorFactor = 0.72;
      else monitorFactor = Math.max(0.55, 0.72 - ((monitors - 2) * 0.06));
    } else {
      const extraMonitors = Math.max(0, monitors - 2);
      monitorFactor = Math.max(0.75, 1.0 - (extraMonitors * 0.025));
    }

    const adaptiveFactor = adaptiveStreaming ? 1.35 : 1.0;
    const combinedCapacityFactor = Math.round(scenarioFactor * watermarkHwFactor * monitorFactor * adaptiveFactor * 1000) / 1000;

    return {
      vmsPlatform,
      adaptiveStreaming,
      adaptiveFactor,
      scenarioMode,
      usageMode: scenarioMode,
      scenarioFactor,
      hardwareAcceleration: hwAccel,
      hwAccelDecode: hwAccel,
      watermarking,
      watermarkHwFactor,
      encryptedStreams: encrypted,
      monitorsPerWorkstation: monitors,
      monitorCount: monitors,
      monitorFactor,
      combinedCapacityFactor
    };
  },

  /**
   * Evaluates a single viewed camera tile group across Minimum, Recommended, and High-Performance profiles.
   */
  evaluateViewedGroup(group, modifiers) {
    const qty = Math.max(0, parseInt(group.qty ?? group.viewedCameras ?? 1, 10) || 0);
    const viewedCameras = qty;
    const heads = Math.max(1, parseInt(group.heads ?? 1, 10) || 1);
    const viewedStreams = viewedCameras * heads;
    const resolutionMp = Math.max(0.4, Number(group.resolutionMp ?? 2) || 2);
    const fps = Math.max(1, Math.min(60, Number(group.fps ?? 15) || 15));
    const codec = VideoStorageSizer.normalizeCodec(group.codec || "H.265");
    const dewarping = Boolean(group.dewarping || resolutionMp >= 12);

    const dewarpLoadMultiplier = dewarping ? 1.25 : 1.0;
    const encryptionLoadMultiplier = modifiers.encryptedStreams
      ? (resolutionMp <= 2.0 ? 1.40 : 1.15)
      : 1.0;

    const fpsCapacityMultiplier = 30.0 / fps;
    const singleStreamMbps = VideoStorageSizer.calculateSingleStreamBitrateMbps(resolutionMp, codec, fps, "medium", 0);
    const groupClientBitrateMbps = Math.round(viewedStreams * singleStreamMbps * 100) / 100;
    const totalPixelsPerSecMp = Math.round(viewedStreams * resolutionMp * fps * 10) / 10;

    const profileLoads = {};
    ["minimum", "recommended", "high_performance"].forEach(profKey => {
      const base30FpsCap = this.getBenchmarkMaxStreamsAt30Fps(profKey, codec, resolutionMp, modifiers.vmsPlatform);
      const effectiveMaxStreams = base30FpsCap > 0
        ? (base30FpsCap * fpsCapacityMultiplier * modifiers.combinedCapacityFactor) / (dewarpLoadMultiplier * encryptionLoadMultiplier)
        : 0;

      const loadFraction = viewedStreams === 0
        ? 0
        : (effectiveMaxStreams > 0 ? (viewedStreams / effectiveMaxStreams) : 99.9);

      profileLoads[profKey] = {
        base30FpsMaxStreams: Math.floor(base30FpsCap),
        effectiveMaxStreams: Math.max(1, Math.floor(effectiveMaxStreams)),
        loadFraction: Math.round(loadFraction * 1000) / 1000,
        loadPct: Math.round(loadFraction * 1000) / 10
      };
    });

    return {
      id: group.id || `ws_grp_${Math.random().toString(36).slice(2, 7)}`,
      name: group.name || "Viewed Camera Group",
      qty,
      viewedCameras,
      heads,
      viewedStreams,
      resolutionMp,
      fps,
      codec,
      dewarping,
      singleStreamMbps,
      groupClientBitrateMbps,
      totalPixelsPerSecMp,
      profileLoads
    };
  },

  /**
   * Main calculation entry point for Client Workstation Decoding & Spec Sizer.
   */
  calculate(bomList = [], overrides = {}) {
    const cfg = Object.assign({}, this.state, overrides);
    const vmsPlatform = String(cfg.vmsPlatform || this.state.vmsPlatform || "genetec").toLowerCase();
    const isMilestone = vmsPlatform === "milestone";
    const reqObj = isMilestone ? MILESTONE_2026_REQUIREMENTS : GENETEC_514_REQUIREMENTS;
    const modifiers = this.getModifierFactors(cfg);
    const rawGroups = Array.isArray(cfg.viewedGroups) && cfg.viewedGroups.length > 0
      ? cfg.viewedGroups
      : this.state.viewedGroups;

    const evaluatedGroups = rawGroups.map(g => this.evaluateViewedGroup(g, modifiers));

    const totalViewedCameras = evaluatedGroups.reduce((s, g) => s + g.viewedCameras, 0);
    const totalViewedStreams = evaluatedGroups.reduce((s, g) => s + g.viewedStreams, 0);
    const totalClientBitrateMbps = Math.round(evaluatedGroups.reduce((s, g) => s + g.groupClientBitrateMbps, 0) * 10) / 10;
    const totalDecodedMpPerSec = Math.round(evaluatedGroups.reduce((s, g) => s + g.totalPixelsPerSecMp, 0) * 10) / 10;

    const workstationCount = Math.max(1, parseInt(cfg.workstationCount ?? cfg.operatorStationsCount ?? this.state.workstationCount ?? this.state.operatorStationsCount ?? 1, 10) || 1);
    const layoutDistributionMode = cfg.layoutDistributionMode || this.state.layoutDistributionMode || "per_station";
    const displayResolution = cfg.displayResolution || this.state.displayResolution || "4k";
    const monitorsPerWorkstation = modifiers.monitorsPerWorkstation;
    const preferredFormFactor = cfg.preferredFormFactor || this.state.preferredFormFactor || "any";
    const safeCapPct = modifiers.scenarioMode === "video_wall" ? 85 : 80;

    const stationLoadDivisor = layoutDistributionMode === "split_wall" ? Math.max(1, workstationCount) : 1;

    const profiles = reqObj.CLIENT_WORKSTATION_PROFILES;
    const benchTable = reqObj.CLIENT_DECODING_BENCHMARKS_30FPS;
    const profileEvaluationsMap = {};
    const profileEvaluationsArray = [];

    ["minimum", "recommended", "high_performance"].forEach(profKey => {
      const profDef = Object.assign({}, profiles[profKey], {
        monitorSpec: profiles[profKey].testedDisplaySpec || `Up to ${profiles[profKey].maxMonitors} Monitors`
      });
      const rawTotalLoadFraction = evaluatedGroups.reduce((s, g) => s + (g.profileLoads[profKey]?.loadFraction || 0), 0);
      const perStationLoadFraction = rawTotalLoadFraction / stationLoadDivisor;
      const loadPct = Math.round(perStationLoadFraction * 1000) / 10;
      const utilizationPct = Math.min(999, Math.round(perStationLoadFraction * safeCapPct * 10) / 10);

      const isMonitorCompliant = monitorsPerWorkstation <= profDef.maxMonitors && !(!isMilestone && profKey === "minimum" && displayResolution === "4k");
      const hasUnsupportedStream = evaluatedGroups.some(g => g.viewedStreams > 0 && g.profileLoads[profKey]?.base30FpsMaxStreams <= 0);
      const isDecodeCompliant = !hasUnsupportedStream && perStationLoadFraction <= 1.0;
      const isCompliant = isMonitorCompliant && isDecodeCompliant;

      const groupDetails = evaluatedGroups.map(g => {
        const pl = g.profileLoads[profKey] || {};
        return {
          streams: g.viewedStreams,
          pixelRateMpPerSec: g.totalPixelsPerSecMp,
          estimatedBandwidthMbps: g.groupClientBitrateMbps,
          effectiveMaxStreams: pl.effectiveMaxStreams || 0,
          groupLoadPct: Math.round((pl.loadFraction || 0) * safeCapPct * 10) / 10
        };
      });

      const benchmarks30Fps = {
        fhd1080p_h264: benchTable.fhd_2mp?.["H.264"]?.[profKey] ?? 0,
        uhd4k_h264: benchTable.uhd_8mp?.["H.264"]?.[profKey] ?? 0,
        fhd1080p_h265: benchTable.fhd_2mp?.["H.265"]?.[profKey] ?? 0,
        uhd4k_h265: benchTable.uhd_8mp?.["H.265"]?.[profKey] ?? 0,
        fhd1080p_av1: benchTable.fhd_2mp?.["AV1"]?.[profKey] ?? 0,
        uhd4k_av1: benchTable.uhd_8mp?.["AV1"]?.[profKey] ?? 0
      };

      const evObj = {
        profileKey: profKey,
        profile: profDef,
        rawTotalLoadFraction: Math.round(rawTotalLoadFraction * 1000) / 1000,
        perStationLoadFraction: Math.round(perStationLoadFraction * 1000) / 1000,
        loadPct,
        utilizationPct,
        safeCapPct,
        isDecodeCompliant,
        isMonitorCompliant,
        isCompliant,
        groupDetails,
        benchmarks30Fps
      };
      profileEvaluationsMap[profKey] = evObj;
      profileEvaluationsArray.push(evObj);
    });

    // Determine Recommended Profile Tier
    let recommendedProfileKey = "high_performance";
    let exceedsSingleHighPerfWorkstation = false;
    let workstationsNeededPerOperator = 1;

    if (totalViewedStreams === 0) {
      recommendedProfileKey = monitorsPerWorkstation > 4 ? "high_performance" : (monitorsPerWorkstation > 2 || (!isMilestone && displayResolution === "4k") ? "recommended" : "minimum");
    } else if (profileEvaluationsMap.minimum.isCompliant) {
      recommendedProfileKey = "minimum";
    } else if (profileEvaluationsMap.recommended.isCompliant) {
      recommendedProfileKey = "recommended";
    } else if (profileEvaluationsMap.high_performance.isCompliant) {
      recommendedProfileKey = "high_performance";
    } else {
      recommendedProfileKey = "high_performance";
      exceedsSingleHighPerfWorkstation = true;
      const wsForDecode = Math.ceil(profileEvaluationsMap.high_performance.rawTotalLoadFraction);
      const wsForMonitors = Math.ceil(monitorsPerWorkstation / profiles.high_performance.maxMonitors);
      workstationsNeededPerOperator = Math.max(1, wsForDecode, wsForMonitors);
    }

    const activeEvaluation = profileEvaluationsMap[recommendedProfileKey];
    const recommendedProfile = Object.assign({}, profiles[recommendedProfileKey], {
      monitorSpec: profiles[recommendedProfileKey].testedDisplaySpec || `Up to ${profiles[recommendedProfileKey].maxMonitors} Monitors`
    });

    // Match Catalog Workstations (Streamvault SVW, Milestone Husky IVO Viewing Station, Dell Precision, BCDVideo Aurora)
    const workstationsDb = (typeof window !== "undefined" && Array.isArray(window.WORKSTATIONS_DATABASE))
      ? window.WORKSTATIONS_DATABASE
      : [];

    const matchedCatalogWorkstations = workstationsDb
      .filter(w => {
        if (preferredFormFactor === "rack") return (w.rackUnits || 0) >= 1 || String(w.formFactor || "").toLowerCase().includes("rack");
        if (preferredFormFactor === "tower") return (w.rackUnits || 0) === 0 && !String(w.formFactor || "").toLowerCase().includes("rack");
        return true;
      })
      .map(w => {
        const wMaxMon = w.maxMonitors || 2;
        const wMaxStreams = w.maxDecodedStreams1080p || 16;
        const meetsSpec = wMaxMon >= monitorsPerWorkstation && wMaxStreams >= Math.min(64, totalViewedStreams);
        return Object.assign({}, w, { meetsSpec });
      })
      .sort((a, b) => {
        // Prioritize vendor match (Milestone Husky IVO VS when Milestone is active, Streamvault when Genetec is active)
        const aVendorMatch = isMilestone ? Boolean(a.isMilestoneHusky) : Boolean(a.isStreamvault);
        const bVendorMatch = isMilestone ? Boolean(b.isMilestoneHusky) : Boolean(b.isStreamvault);
        if (aVendorMatch !== bVendorMatch) return aVendorMatch ? -1 : 1;
        return (a.msrp || 0) - (b.msrp || 0);
      });

    const primaryCatalogWorkstation =
      matchedCatalogWorkstations.find(w => w.id === recommendedProfile.recommendedStreamvaultId) ||
      workstationsDb.find(w => w.id === recommendedProfile.recommendedStreamvaultId) ||
      matchedCatalogWorkstations.find(w => w.meetsSpec) ||
      matchedCatalogWorkstations[0] ||
      workstationsDb[0] ||
      null;

    // Build Engineering Findings & Advisory Notes
    const findings = [];
    if (isMilestone) {
      if (recommendedProfileKey === "minimum") {
        findings.push({
          severity: "info",
          text: "Milestone Husky IVO 150D Viewing Station (NVIDIA RTX A400 4GB + Intel Quick Sync): Supports up to 2x 4K displays (16x 1080p on 1x 4K display or 8x 1080p across 2x 4K displays)."
        });
      } else if (recommendedProfileKey === "recommended") {
        findings.push({
          severity: "info",
          text: "Milestone Husky IVO 350T Viewing Station (NVIDIA RTX A1000 8GB + Intel Quick Sync): Supports up to 4x 4K displays via 4x Mini-DP 1.4a (up to 36x 1080p H.264 / 25x 1080p H.265 on 1x 4K display or 18x 1080p across 2x 4K displays)."
        });
      } else {
        findings.push({
          severity: "info",
          text: "XProtect Smart Wall Multi-GPU Profile: Uses Dual NVIDIA RTX 4000 Ada GPUs + Intel Quick Sync. Connect displays across both GPU cards and enable Adaptive Streaming in XProtect Smart Client."
        });
      }
      if (modifiers.adaptiveStreaming) {
        findings.push({
          severity: "success",
          text: "Milestone Adaptive Streaming Active (+35% Multi-Tile Capacity): XProtect Smart Client automatically requests lower-resolution secondary streams from Recording Servers based on tile pixel dimensions."
        });
      } else if (totalViewedStreams >= 9) {
        findings.push({
          severity: "info",
          text: "Tip — Enable Milestone Adaptive Streaming: Configuring dual/multi-streams on cameras allows XProtect Smart Client to decode lower-resolution streams in multi-tile grids, reducing GPU/CPU load by ~30–35%."
        });
      }
    } else {
      if (recommendedProfileKey === "high_performance") {
        findings.push({
          severity: "info",
          text: "Dual-GPU Monitor Rule (SystemRequirements.pdf Page 5): The High-Performance profile uses 2x NVIDIA RTX 5070 Ti (16 GB) GPUs. At least one physical monitor must be connected to each GPU card to activate both hardware decoding engines."
        });
      }
      if (recommendedProfileKey === "minimum") {
        findings.push({
          severity: "info",
          text: "Intel Quick Sync Video Rule (SystemRequirements.pdf Page 5): On the Minimum profile (Intel Core i3-8100), the monitor must be connected directly to the motherboard display output to enable Intel Quick Sync hardware decoding."
        });
      }
    }
    if (modifiers.watermarking) {
      findings.push({
        severity: "warning",
        text: `Video Watermarking Active: Decreases maximum simultaneous viewed tiles by ${modifiers.hardwareAcceleration ? '10% (with Hardware Acceleration)' : '30% (without Hardware Acceleration)'}.`
      });
    }
    if (modifiers.encryptedStreams) {
      findings.push({
        severity: "warning",
        text: "Encrypted Video Streams Active: Viewing encrypted video streams increases client CPU usage by up to 40% on low-resolution (≤2MP) streams."
      });
    }
    if (exceedsSingleHighPerfWorkstation) {
      findings.push({
        severity: "warning",
        text: `Single-Workstation Ceiling Exceeded: Viewing ${totalViewedStreams} streams (${totalDecodedMpPerSec} MP/s) requires ${workstationsNeededPerOperator}x High-Performance Workstations per operator position.`
      });
    }

    return {
      vmsPlatform,
      adaptiveStreaming: modifiers.adaptiveStreaming,
      version: reqObj.version,
      datasheetPath: isMilestone ? MILESTONE_2026_REQUIREMENTS.viewingStationPath : GENETEC_514_REQUIREMENTS.datasheetPath,
      viewedGroups: evaluatedGroups,
      evaluatedGroups,
      modifiers,
      totalViewedCameras,
      totalViewedStreams,
      totalClientBitrateMbps,
      totalDecodedMpPerSec,
      totalPixelRateMpPerSec: totalDecodedMpPerSec,
      monitorsPerWorkstation,
      monitorCount: monitorsPerWorkstation,
      displayResolution,
      operatorStationsCount: workstationCount,
      workstationCount,
      usageMode: modifiers.scenarioMode,
      hwAccelDecode: modifiers.hardwareAcceleration,
      watermarking: modifiers.watermarking,
      encryptedStreams: modifiers.encryptedStreams,
      preferredFormFactor,
      layoutDistributionMode,
      recommendedProfileKey,
      recommendedProfile,
      activeEvaluation,
      recommendedProfileEvaluation: activeEvaluation,
      profileEvaluations: profileEvaluationsArray,
      profileEvaluationsMap,
      requiresMultipleWorkstations: exceedsSingleHighPerfWorkstation,
      exceedsSingleHighPerfWorkstation,
      workstationsNeededPerOperator,
      minRequiredWorkstations: workstationCount * workstationsNeededPerOperator,
      primaryCatalogWorkstation,
      recommendedCatalogWorkstation: primaryCatalogWorkstation,
      matchedCatalogWorkstations,
      allCatalogWorkstations: workstationsDb,
      findings
    };
  }
};

window.ClientWorkstationSizer = ClientWorkstationSizer;
if (window.OSS && typeof window.OSS.register === "function") {
  window.OSS.register("Sizers.Workstation", { ClientWorkstationSizer });
}
