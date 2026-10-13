// =========================================================================
// CENTRALIZED DESIGN RULE CHECKER (DRC / "DESIGN LINTER")
// Multi-Domain Engineering Validation & Quality Assurance Engine
// Checks: Distance Limits, PoE Classes, Closet Port Deficits, Scope & Licensing
// =========================================================================

let drcActiveFilter = "all"; // "all" | "critical" | "warning" | "distance" | "poe" | "capacity" | "hardware" | "scope"

/**
 * Runs a full, comprehensive Design Rule Check across the entire project
 * @returns {Object} DRC audit result containing telemetry, KPI stats, and issue cards
 */
function auditProjectHealth() {
  const issues = [];
  const stats = {
    distanceViolations: 0,
    totalMeasuredDrops: 0,
    poeDemandWatts: 0,
    poeSupplyWatts: 0,
    totalQuotedDrops: 0,
    totalSwitchCopperPorts: 0,
    totalPatchPanelPorts: 0,
    totalCameras: 0,
    totalLicenses: 0
  };

  if (typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) {
    return { isHealthy: true, issueCount: 0, criticalCount: 0, warningCount: 0, issues: [], stats };
  }

  // O(1) lookup index for BOM instances (eliminates O(N^2) scans across unbundled cameras/ports)
  const bomById = new Map();
  projectBOM.forEach(it => {
    if (it && it.instanceId) bomById.set(it.instanceId, it);
  });

  const safeJsArg = (val) => {
    if (typeof window.escapeJSAttr === "function") return window.escapeJSAttr(val);
    return String(val ?? "")
      .replace(/\\/g, "\\x5c")
      .replace(/'/g, "\\x27")
      .replace(/"/g, "\\x22")
      .replace(/</g, "\\x3c")
      .replace(/>/g, "\\x3e")
      .replace(/\r?\n/g, " ");
  };

  // =========================================================================
  // RULE 1: ETHERNET HORIZONTAL & CHANNEL DISTANCE LIMITS (TIA-568)
  // =========================================================================
  if (typeof facilityFloors !== "undefined" && Array.isArray(facilityFloors)) {
    facilityFloors.forEach(floor => {
      if (!floor.nodes || !Array.isArray(floor.nodes)) return;
      const allClosets = floor.nodes.filter(n => n.type === "closet");

      floor.nodes.filter(n => n.type === "device").forEach(dev => {
        stats.totalMeasuredDrops++;
        let closet = allClosets.find(c => c.id === dev.assignedClosetId);
        if (!closet && allClosets.length > 0) closet = allClosets[0];

        const run = dev.calculatedRun || { totalFt: 0 };
        const totalFt = Math.round(run.totalFt || 0);

        if (totalFt > 295) {
          stats.distanceViolations++;
          const isChannelExceeded = totalFt > 328;
          const bomItem = dev.instanceId ? bomById.get(dev.instanceId) : null;
          const devName = bomItem ? (bomItem.friendlyName || bomItem.model) : (dev.label || dev.name || "Field Device");
          const closetName = closet ? closet.name : "Unassigned Closet";

          issues.push({
            id: `distance_exceeded_${dev.id}`,
            category: "distance",
            severity: isChannelExceeded ? "critical" : "warning",
            priority: 1,
            standardsReference: isChannelExceeded ? "TIA-568-C/D (100m / 328ft Channel Max)" : "TIA-568-C/D (90m / 295ft Permanent Link)",
            title: isChannelExceeded
              ? `Ethernet Channel Limit Exceeded (${totalFt} ft)`
              : `Horizontal Run Exceeds Permanent Link Standard (${totalFt} ft)`,
            summary: `${devName} on ${floor.name || 'Floor'} is ${totalFt} ft from ${closetName} (TIA Limit: 295 ft permanent / 328 ft channel)`,
            details: isChannelExceeded
              ? `Exceeds the 100-meter (328 ft) maximum TIA-568 channel limit by ${totalFt - 328} ft. Signal attenuation, high packet loss, and severe PoE voltage drop will cause intermittent camera disconnects or failure to boot. Relocate drop to a closer IDF, deploy an intermediate fiber media converter, or install a PoE extender.`
              : `Exceeds the 90-meter (295 ft) horizontal permanent link recommendation by ${totalFt - 295} ft. Once 10-meter patch cords are included at the rack and wall drop, the total channel will exceed certification limits.`,
            actionLabel: `Locate Drop on Floorplan`,
            actionFn: `jumpToPhysicalLayoutFromHealth('${safeJsArg(dev.instanceId || dev.id)}')`,
            badgeText: `${totalFt} FT RUN`
          });
        }
      });
    });
  }

  // =========================================================================
  // RULE 2: POE POWER BUDGETS & 802.3bt CLASS COMPATIBILITY
  // =========================================================================
  let totalPoEAvailable = 0;
  let activeConnectedPoE = 0;
  let activeConnectedPorts = 0;

  projectBOM.forEach(item => {
    if (item.parentInstanceId) return;
    const isSw = (item.role === "Access" || item.role === "Aggregation" || item.role === "Industrial DIN-Rail Switch" || item.role === "Core / Spine" || (item.model || '').includes("Switch"));
    if (isSw) {
      const units = (item.stackedUnits && item.stackedUnits >= 2) ? item.stackedUnits : (item.qty || 1);
      totalPoEAvailable += (item.poeBudget || 0) * units;
    } else if (item.role !== "Structured Cabling" && item.role !== "Optics & DAC" && !item.role?.includes("License")) {
      const pwr = (typeof PortEngine !== "undefined") ? PortEngine.getDevicePowerSource(item) : (item.powerSource || "poe_switch");
      if (pwr === "poe_switch") {
        const draw = item.poeWattsDrawn || item.powerConsumptionWatts || item.baseWatts || 15;
        activeConnectedPoE += draw * (item.qty || 1);
        activeConnectedPorts += (item.ports || 1) * (item.qty || 1);
      }
    }
  });

  stats.poeSupplyWatts = totalPoEAvailable;
  stats.poeDemandWatts = activeConnectedPoE;

  // Global PoE capacity deficit
  if (activeConnectedPoE > totalPoEAvailable) {
    const deficitWatts = activeConnectedPoE - totalPoEAvailable;
    const poeRec = getContextAwarePoERecommendation();
    const closetShort = poeRec.targetCloset.split(' • ')[0];
    issues.push({
      id: "poe_deficit",
      category: "poe",
      severity: "critical",
      title: "PoE Power Budget Deficit",
      summary: `Total PoE Demand (${activeConnectedPoE}W) exceeds Total Switch Supply (${totalPoEAvailable}W) by ${deficitWatts}W`,
      details: `Active edge devices require ${activeConnectedPoE}W of PoE power, but total quoted switch PoE capacity is only ${totalPoEAvailable}W (${deficitWatts}W shortfall). Connected field hardware will suffer brownouts during high demand or IR activation.`,
      actionLabel: `+ Add ${poeRec.switchItem.vendor} ${poeRec.switchItem.sku} (${poeRec.switchItem.poeBudget}W) to ${closetShort}`,
      actionFn: "autoAddPoeSupplyOrSwitch()",
      badgeText: `-${deficitWatts}W SHORTFALL`
    });
  } else if (totalPoEAvailable > 0 && activeConnectedPoE > (totalPoEAvailable * 0.9)) {
    const freeWatts = totalPoEAvailable - activeConnectedPoE;
    issues.push({
      id: "poe_headroom_warning",
      category: "poe",
      severity: "warning",
      title: "PoE Headroom Below 10% Safety Buffer",
      summary: `PoE utilization is at ${Math.round((activeConnectedPoE / totalPoEAvailable) * 100)}% (${activeConnectedPoE}W of ${totalPoEAvailable}W), leaving only ${freeWatts}W spare`,
      details: `Industry best practice recommends maintaining at least 15-20% PoE budget buffer for temperature derating, cable resistance loss, and camera cold-start in-rush currents.`,
      actionLabel: `Review PoE Headroom in Port Matrix`,
      actionFn: "openPortMatrixFromHealth()",
      badgeText: `${freeWatts}W HEADROOM`
    });
  }

  // Per-Switch Port 802.3bt Class Mismatch and Switch Overcommit
  projectBOM.filter(item => !item.parentInstanceId && (item.role === "Access" || item.role === "Aggregation" || (item.model || '').includes("Switch"))).forEach(sw => {
    const ports = (typeof PortEngine !== "undefined" && typeof PortEngine.initSwitchPorts === "function")
      ? PortEngine.initSwitchPorts(sw)
      : (sw.portsList || []);

    let swActiveDraw = 0;
    ports.forEach(p => {
      if (!p.connectedDeviceId) return;
      const targetDev = bomById.get(p.connectedDeviceId);
      if (!targetDev) return;

      const devPwr = (typeof PortEngine !== "undefined") ? PortEngine.getDevicePowerSource(targetDev) : "poe_switch";
      if (devPwr !== "poe_switch") return;

      const devWatts = targetDev.poeWattsDrawn || targetDev.powerConsumptionWatts || targetDev.baseWatts || 15;
      swActiveDraw += devWatts;

      const isBtReq = devWatts > 30 || targetDev.poeStandard === "bt" || (targetDev.model || '').toLowerCase().includes("bt-90w") || (targetDev.model || '').toLowerCase().includes("ptz");
      const portMaxWatts = p.maxPoeWatts || (p.poeType === "bt90" ? 90 : (p.poeType === "bt60" ? 60 : 30));

      if (isBtReq && portMaxWatts <= 30) {
        issues.push({
          id: `poe_class_mismatch_${sw.instanceId}_${p.portNumber}`,
          category: "poe",
          severity: "critical",
          title: `PoE Class Mismatch on Port ${p.portNumber}`,
          summary: `${targetDev.friendlyName || targetDev.model} requires 802.3bt (${devWatts}W) but Port ${p.portNumber} on ${sw.friendlyName || sw.model} delivers max ${portMaxWatts}W (802.3at)`,
          details: `High-power field hardware (${targetDev.model}) connected to Port ${p.portNumber} on ${sw.friendlyName || sw.model} will fail to boot or power cycle during PTZ motor or IR heater operation. Connect to an 802.3bt (60W/90W) multi-gig port or insert a dedicated midspan injector.`,
          actionLabel: `Open Port Matrix (${sw.model})`,
          actionFn: `openPortMatrixFromHealth('${safeJsArg(sw.instanceId)}')`,
          badgeText: `PORT ${p.portNumber} MISMATCH`
        });
      }
    });

    if (sw.poeBudget > 0 && swActiveDraw > sw.poeBudget) {
      issues.push({
        id: `switch_poe_overcommit_${sw.instanceId}`,
        category: "poe",
        severity: "critical",
        title: `Switch PoE Budget Overcommitted: ${sw.friendlyName || sw.model}`,
        summary: `Connected ports draw ${swActiveDraw}W, exceeding switch hardware capacity of ${sw.poeBudget}W (${swActiveDraw - sw.poeBudget}W over)`,
        details: `Switch at ${(sw.closetName || sw.rackId || 'Closet')} is exceeding its internal PoE power supply budget. Field ports will shut down due to hardware power policing under full load.`,
        actionLabel: `Inspect in Port Matrix`,
        actionFn: `openPortMatrixFromHealth('${safeJsArg(sw.instanceId)}')`,
        badgeText: `-${swActiveDraw - sw.poeBudget}W OVER`
      });
    }
  });

  // =========================================================================
  // RULE 3: CLOSET & SPACE CAPACITY (SWITCH PORTS & PATCH PANELS)
  // =========================================================================
  if (typeof FacilityStore !== "undefined") {
    const locations = FacilityStore.getLocationNames(false);
    locations.forEach(loc => {
      if (loc.endsWith("• Field") || loc === FacilityStore.UNASSIGNED) return;
      const normLoc = FacilityStore.normalize(loc);

      let dropsInCloset = 0;
      if (typeof facilityFloors !== "undefined" && Array.isArray(facilityFloors)) {
        facilityFloors.forEach(fl => {
          if (!fl.nodes) return;
          const closetNode = fl.nodes.find(n => n.type === "closet" && FacilityStore.normalize(n.name) === normLoc);
          if (closetNode) {
            dropsInCloset += fl.nodes.filter(n => n.type === "device" && (n.assignedClosetId === closetNode.id || !n.assignedClosetId)).length;
          }
        });
      }

      const bomDrops = projectBOM.filter(i =>
        !i.parentInstanceId &&
        (i.role === "Camera" || i.role === "Access Control" || i.role === "Intercom" || i.category === "cameras" || i.category === "access_control") &&
        FacilityStore.normalize(i.closetName || i.rackId) === normLoc
      );
      const totalDrops = Math.max(dropsInCloset, bomDrops.length);
      stats.totalQuotedDrops += totalDrops;

      if (totalDrops > 0) {
        // Count switch RJ-45 copper ports in this closet
        const closetSwitches = projectBOM.filter(i =>
          (typeof isNetworkSwitchItem === "function" ? isNetworkSwitchItem(i) : (i.role === "Access" || (i.model || '').includes("Switch"))) &&
          FacilityStore.normalize(i.closetName || i.rackId) === normLoc
        );
        let totalSwitchPorts = 0;
        closetSwitches.forEach(sw => {
          const qty = sw.qty || 1;
          const stacked = (sw.stackedUnits && sw.stackedUnits >= 2) ? sw.stackedUnits : qty;
          totalSwitchPorts += (parseInt(sw.ports, 10) || 24) * stacked;
        });
        stats.totalSwitchCopperPorts += totalSwitchPorts;

        // Count patch panel ports in this closet
        const panels = projectBOM.filter(i =>
          (i.role === "Structured Cabling" || i.category === "cabling") &&
          (i.model || '').includes("Patch Panel") &&
          FacilityStore.normalize(i.closetName || i.rackId) === normLoc
        );
        let totalPanelPorts = 0;
        panels.forEach(p => {
          const pPorts = parseInt(p.ports, 10) || (p.model.includes("48") ? 48 : 24);
          totalPanelPorts += pPorts * (p.qty || 1);
        });
        stats.totalPatchPanelPorts += totalPanelPorts;

        if (totalSwitchPorts < totalDrops) {
          const deficit = totalDrops - totalSwitchPorts;
          issues.push({
            id: `closet_switch_deficit_${normLoc.replace(/[^a-zA-Z0-9]/g, '_')}`,
            category: "capacity",
            severity: "critical",
            title: `Switch Port Deficit in ${loc}`,
            summary: `${totalDrops} field drops homered to ${loc}, but only ${totalSwitchPorts} switch ports quoted (${deficit} unpatched drops)`,
            details: `The quoted network switches in ${loc} do not have enough physical RJ-45 ports to terminate all homered edge devices. Field devices will be left unpatched without an additional switch or stack unit.`,
            actionLabel: `+ Add 24-Port Switch to ${loc}`,
            actionFn: `quickAddSwitchToCloset('${safeJsArg(loc)}')`,
            badgeText: `${deficit} PORTS SHORT`
          });
        }

        if (totalPanelPorts < totalDrops) {
          const panelDeficit = totalDrops - totalPanelPorts;
          issues.push({
            id: `closet_panel_deficit_${normLoc.replace(/[^a-zA-Z0-9]/g, '_')}`,
            category: "capacity",
            severity: "warning",
            title: `Patch Panel Deficit in ${loc}`,
            summary: `${totalDrops} horizontal cable runs homered to ${loc}, but only ${totalPanelPorts} panel ports quoted (${panelDeficit} missing)`,
            details: `Building code and structured cabling standards require bulk cable runs to terminate on a modular patch panel before patching to switches. Quote additional patch panels to support all field runs.`,
            actionLabel: `+ Add 24-Port Patch Panel to ${loc}`,
            actionFn: `quickAddPatchPanelToCloset('${safeJsArg(loc)}')`,
            badgeText: `${panelDeficit} PORTS SHORT`
          });
        }
      }
    });
  }

  // =========================================================================
  // RULE 4: UNASSIGNED HARDWARE & ORPHANED FLOORPLAN DROPS
  // =========================================================================
  const unassignedBOM = projectBOM.filter(item => {
    if (item.parentInstanceId) return false;
    if (item.role === "Structured Cabling" || item.role === "Optics & DAC" || item.role?.includes("License")) return false;
    const loc = FacilityStore.normalize(item.closetName || item.rackId);
    return loc === FacilityStore.UNASSIGNED;
  });

  if (unassignedBOM.length > 0) {
    const totalQty = unassignedBOM.reduce((acc, i) => acc + (i.qty || 1), 0);
    issues.push({
      id: "unassigned_equipment",
      category: "hardware",
      severity: "critical",
      title: "Unassigned Equipment in BOM",
      summary: `${totalQty} device${totalQty === 1 ? '' : 's'} staged without assigned Facility Space, Floor, or Rack`,
      details: `${unassignedBOM.map(i => `${i.qty || 1}x ${i.model}`).join(', ')} currently have no mounting host assigned and cannot be routed or scheduled.`,
      actionLabel: "Auto-Assign All to MDF • Rack-1",
      actionFn: "autoFixUnassignedGear()",
      badgeText: `${totalQty} UNASSIGNED`
    });
  }

  // Orphaned Floorplan Drops (Nodes with no assigned closet)
  if (typeof facilityFloors !== "undefined" && Array.isArray(facilityFloors)) {
    facilityFloors.forEach(fl => {
      if (!fl.nodes) return;
      const allClosets = fl.nodes.filter(n => n.type === "closet");
      fl.nodes.filter(n => n.type === "device").forEach(dev => {
        const hasValidCloset = allClosets.some(c => c.id === dev.assignedClosetId);
        if (!hasValidCloset && allClosets.length > 0) {
          issues.push({
            id: `orphaned_floor_drop_${dev.id}`,
            category: "hardware",
            severity: "warning",
            title: `Unassigned Floorplan Drop: ${dev.label || dev.name || 'Device'}`,
            summary: `Device on ${fl.name || 'Floor'} has no assigned telecom closet or pathway`,
            details: `This field device is placed on the floor plan but has not been connected to an IDF/MDF closet enclosure. Pathway distance and patch cords cannot be determined.`,
            actionLabel: `Assign to Nearest Closet`,
            actionFn: `autoAssignFloorDropToNearestCloset('${safeJsArg(fl.id)}', '${safeJsArg(dev.id)}')`,
            badgeText: `NO CLOSET`
          });
        }
      });
    });
  }

  // =========================================================================
  // RULE 5: HARDWARE INTERCONNECTS & STACKING DACS
  // =========================================================================
  const stackedSwitches = projectBOM.filter(i => !i.parentInstanceId && i.stackedUnits >= 2);
  let requiredDACCables = 0;
  stackedSwitches.forEach(sw => { requiredDACCables += sw.stackedUnits; });

  const existingDACCables = projectBOM.filter(i =>
    i.role === "Stacking Cable" || (i.role === "Optics & DAC" && (i.sku === "STACK-DAC-1M" || (i.model || '').includes("DAC")))
  ).reduce((acc, i) => acc + (i.qty || 1), 0);

  if (requiredDACCables > 0 && existingDACCables < requiredDACCables) {
    const missingDAC = requiredDACCables - existingDACCables;
    issues.push({
      id: "missing_stack_dac",
      category: "hardware",
      severity: "critical",
      title: "Missing Switch Stacking DAC Cables",
      summary: `${missingDAC} Stacking DAC Cable${missingDAC === 1 ? '' : 's'} required for physical stacking ring`,
      details: `${stackedSwitches.map(s => `${s.model} (${s.stackedUnits}-unit stack)`).join(', ')} require dedicated direct-attach copper cables to form a resilient virtual stack ring.`,
      actionLabel: `+ Add ${missingDAC} Stacking DAC Cable${missingDAC === 1 ? '' : 's'}`,
      actionFn: "autoAddMissingDACCables()",
      badgeText: `${missingDAC} CABLES MISSING`
    });
  }

  // =========================================================================
  // RULE 6: SYSTEM SCOPE & LICENSING AUDIT (VMS & ACS)
  // =========================================================================
  const cameraItems = projectBOM.filter(i =>
    !i.parentInstanceId &&
    (i.category === "cameras" || i.role === "Camera" || i.deviceType === "camera" || (i.model || '').toLowerCase().includes("camera"))
  );
  const totalCameras = cameraItems.reduce((acc, i) => acc + (i.qty || 1), 0);
  stats.totalCameras = totalCameras;

  const licenseItems = projectBOM.filter(i =>
    i.role === "Mgmt License" || i.role === "Security License" || i.role === "Feature License" || (i.sku || '').startsWith("LIC-")
  );
  const totalLicenses = licenseItems.reduce((acc, i) => acc + (i.qty || 1), 0);
  stats.totalLicenses = totalLicenses;

  if (totalCameras > 0 && totalLicenses < totalCameras) {
    const missingLic = totalCameras - totalLicenses;
    issues.push({
      id: "missing_licenses",
      category: "scope",
      severity: "warning",
      title: "Missing VMS Camera Channel Licenses",
      summary: `${missingLic} Camera${missingLic === 1 ? '' : 's'} without VMS Core Channel Recording Licenses`,
      details: `Project contains ${totalCameras} IP camera(s) but only ${totalLicenses} VMS recording license(s) have been added to the BOM. Cameras cannot record without valid channel keys.`,
      actionLabel: `+ Add ${missingLic} Missing VMS License${missingLic === 1 ? '' : 's'}`,
      actionFn: "autoAddMissingLicenses()",
      badgeText: `${missingLic} LICENSES MISSING`
    });
  }

  // Check VMS Server/Storage presence
  if (typeof StorageService !== "undefined") {
    const defaults = StorageService.getProjectDefaults();
    if (defaults) {
      const vmsEnabled = defaults.vms?.enabled !== false;
      const acsEnabled = defaults.accessControl?.enabled !== false;

      if (vmsEnabled && totalCameras > 0) {
        const hasVmsServer = projectBOM.some(i =>
          !i.parentInstanceId &&
          (i.role === "Server" || i.role === "Compute & Storage" || i.role === "VMS Server" || (i.category || '').includes("server") || (i.model || '').toLowerCase().includes("nvr") || (i.model || '').toLowerCase().includes("server"))
        );
        if (!hasVmsServer) {
          issues.push({
            id: "missing_vms_server",
            category: "scope",
            severity: "warning",
            title: "Missing VMS Recording Server / NVR",
            summary: `${totalCameras} Camera(s) in scope, but no VMS Recording Server or NVR has been quoted`,
            details: `Video surveillance is in-scope with ${totalCameras} IP camera(s), but no enterprise server appliance, storage array, or NVR has been added to the BOM to record camera streams.`,
            actionLabel: "+ Add 2U NVR Recording Server",
            actionFn: "quickAddDefaultNvrServer()",
            badgeText: "NO SERVER"
          });
        }
      }

      // Check ACS Controller presence
      const readerCount = projectBOM.filter(i =>
        !i.parentInstanceId &&
        ((i.role || '').toLowerCase().includes("access") || (i.category || '').includes("access") || (i.model || '').toLowerCase().includes("reader"))
      ).reduce((a, b) => a + (b.qty || 1), 0);

      if (acsEnabled && readerCount > 0) {
        const hasController = projectBOM.some(i =>
          !i.parentInstanceId &&
          ((i.model || '').toLowerCase().includes("controller") || (i.model || '').toLowerCase().includes("subplate") || (i.model || '').toLowerCase().includes("trove") || (i.role || '').toLowerCase().includes("controller"))
        );
        if (!hasController) {
          issues.push({
            id: "missing_acs_controller",
            category: "scope",
            severity: "warning",
            title: "Missing Access Control Door Controller / Subplate",
            summary: `${readerCount} Door Reader(s) in scope, but no Door Controller or Enclosure is quoted`,
            details: `Access Control is in-scope with ${readerCount} card reader(s), but no Mercury/Synergis/Lenel intelligent door controller or power enclosure has been added to drive door strikes and monitor reader inputs.`,
            actionLabel: "+ Add 8-Door Access Controller",
            actionFn: "quickAddDefaultAcsController()",
            badgeText: "NO CONTROLLER"
          });
        }
      }
    }
  }

  // =========================================================================
  // RULE 7: TELECOM CLOSET & ENCLOSURE POWER CONTINUITY (UPS & STANDBY AUDIT)
  // =========================================================================
  const closetsToAudit = new Set();
  projectBOM.forEach(item => {
    if (item.parentInstanceId) return;
    const loc = FacilityStore.normalize(item.closetName || item.rackId);
    if (loc && loc !== FacilityStore.UNASSIGNED && !loc.endsWith("• Field")) {
      closetsToAudit.add(loc);
    }
  });

  closetsToAudit.forEach(normLoc => {
    const locLower = normLoc.toLowerCase();
    const parsedLoc = (typeof FacilityStore !== "undefined" && typeof FacilityStore.parse === "function")
      ? FacilityStore.parse(normLoc)
      : { hostType: "equipment_rack" };
    
    const isNemaEnclosure = parsedLoc.hostType === "industrial_din" ||
                            locLower.includes("nema") ||
                            locLower.includes("pole") ||
                            locLower.includes("weatherproof") ||
                            locLower.includes("din");

    const closetItems = projectBOM.filter(i => !i.parentInstanceId && FacilityStore.normalize(i.closetName || i.rackId) === normLoc);
    const activeElectronics = closetItems.filter(i => {
      const r = (i.role || "").toLowerCase();
      const c = (i.category || "").toLowerCase();
      return r === "access" || r === "aggregation" || r === "core" || r === "server" || r === "firewall" ||
             c.includes("switch") || c.includes("server") || c.includes("firewall") || (i.model || '').toLowerCase().includes("switch");
    });

    if (activeElectronics.length > 0) {
      const activeWatts = activeElectronics.reduce((acc, it) => acc + ((it.baseWatts || 40) * (it.qty || 1)), 0);
      const hasUps = closetItems.some(i => i.role === "UPS" || i.category === "ups" || i.type === "ups");
      const upsItem = closetItems.find(i => i.role === "UPS" || i.category === "ups" || i.type === "ups");

      if (isNemaEnclosure) {
        // NEMA / INDUSTRIAL ENCLOSURE POWER RULES
        if (hasUps && upsItem) {
          const upsModelLower = (upsItem.model || "").toLowerCase();
          const isStandardRackUps = !upsModelLower.includes("din") && !upsModelLower.includes("dc-ups") && !upsModelLower.includes("hardened");
          if (isStandardRackUps) {
            issues.push({
              id: `nema_commercial_ups_${normLoc.replace(/[^a-zA-Z0-9]/g, '_')}`,
              category: "power",
              severity: "critical",
              title: `Hazard: Indoor Rackmount UPS in NEMA Box (${normLoc})`,
              summary: `Commercial 120V rackmount UPS (${upsItem.model}) assigned to sealed outdoor NEMA enclosure`,
              details: `Standard commercial VRLA (lead-acid) UPS units cannot operate in sealed outdoor NEMA enclosures. Ambient solar heating degrades battery life rapidly, and charging lead-acid cells releases flammable hydrogen gas that accumulates without UL Type 4X breather vents. Replace with an industrial temperature-hardened DIN-Rail DC-UPS (e.g., Altronix NetWay / Phoenix Contact) or wide-temp LiFePO4 battery system.`,
              actionLabel: `View Enclosure in Rack Studio`,
              actionFn: `openRackFromHealth('${safeJsArg(normLoc)}')`,
              badgeText: "THERMAL/GAS HAZARD"
            });
          }
        } else {
          // Unbacked outdoor NEMA box: Provide non-blocking engineering advisory
          issues.push({
            id: `nema_unbacked_advisory_${normLoc.replace(/[^a-zA-Z0-9]/g, '_')}`,
            category: "power",
            severity: "warning",
            title: `Outdoor Standby Advisory: ${normLoc}`,
            summary: `Active hardware in outdoor NEMA enclosure has no auxiliary DC-UPS or battery backup`,
            details: `Network switches/cameras in ${normLoc} will drop offline instantly upon utility loss. If continuous uptime is required at this field/pole location, specify an industrial wide-temperature DIN-Rail DC-UPS with external weatherproof venting. (Do not install standard indoor 19" rackmount UPS units).`,
            actionLabel: `View Enclosure in Rack Studio`,
            actionFn: `openRackFromHealth('${safeJsArg(normLoc)}')`,
            badgeText: "NEMA STANDBY ADVISORY"
          });
        }
      } else {
        // STANDARD TELECOM ROOM / EQUIPMENT RACK POWER RULES
        if (!hasUps) {
          issues.push({
            id: `missing_ups_${normLoc.replace(/[^a-zA-Z0-9]/g, '_')}`,
            category: "power",
            severity: "warning",
            title: `Unprotected Network Equipment in ${normLoc}`,
            summary: `${normLoc} hosts ${activeElectronics.length} active network/server unit${activeElectronics.length === 1 ? '' : 's'} (${Math.round(activeWatts)}W) with NO battery backup quoted`,
            details: `Active core/access switches and headend servers in ${normLoc} will drop offline immediately during commercial power fluctuations or momentary outages without dedicated rackmount battery backup (UPS).`,
            actionLabel: `+ Add 2200VA UPS to ${normLoc}`,
            actionFn: `quickAddUpsToCloset('${safeJsArg(normLoc)}')`,
            badgeText: "NO UPS BACKUP"
          });
        } else {
          // If access control is present in this location, evaluate 4-hour standby compliance
          const hasAcs = closetItems.some(i => (i.role || '').toLowerCase().includes("access") || (i.category || '').toLowerCase().includes("access"));
          if (hasAcs) {
            const hasEbp = closetItems.some(i => i.role === "Battery Pack" || i.type === "ebp" || i.isEbp);
            if (!hasEbp) {
              issues.push({
                id: `ups_standby_deficit_${normLoc.replace(/[^a-zA-Z0-9]/g, '_')}`,
                category: "power",
                severity: "warning",
                title: `UL 294 4-Hour Standby Deficit in ${normLoc}`,
                summary: `Access control equipment in ${normLoc} requires 4.0 hours continuous standby backup per UL 294 / NFPA 731`,
                details: `Electronic life-safety and card access hardware in ${normLoc} requires 4 hours of reserve battery standby under power loss conditions. Quoted UPS without external battery packs will only provide standard 15-30 minute runtime.`,
                actionLabel: `+ Add External Battery Pack to ${normLoc}`,
                actionFn: `quickAddEbpToCloset('${safeJsArg(normLoc)}', 1)`,
                badgeText: "UL 294 STANDBY DEFICIT"
              });
            }
          }
        }
      }
    }

    // =========================================================================
    // RULE 8: 3-WAY POWER / UPS / PDU PLUG & VOLTAGE COMPATIBILITY AUDIT
    // =========================================================================
    const upsList = closetItems.filter(i => i.role === "UPS" || i.category === "ups" || i.type === "ups");
    const pduList = closetItems.filter(i => (i.role || '').toLowerCase().includes("pdu") || (i.category || '').toLowerCase().includes("pdu") || (i.model || '').toLowerCase().includes("pdu"));

    // 8A. UPS Input Plug vs Facility Branch Circuit
    upsList.forEach(ups => {
      const modelStr = (ups.model || '').toLowerCase();
      const is30AUps = modelStr.includes("3000") || modelStr.includes("3k") || modelStr.includes("5000") || modelStr.includes("5k");
      const is208VUps = modelStr.includes("208v") || modelStr.includes("230v") || modelStr.includes("srt");

      if (is30AUps) {
        const expectedPlug = is208VUps ? "NEMA L6-30P (208V 30A)" : "NEMA L5-30P (120V 30A)";
        issues.push({
          id: `ups_dedicated_circuit_${normLoc.replace(/[^a-zA-Z0-9]/g, '_')}`,
          category: "power",
          severity: "warning",
          title: `Dedicated 30A Circuit Required for ${ups.model}`,
          summary: `UPS in ${normLoc} requires a dedicated 30A locking wall receptacle (${expectedPlug})`,
          details: `High-capacity 3000VA+ UPS units cannot plug into standard 15A/20A commercial convenience outlets (NEMA 5-15R / 5-20R). Coordinate with the Electrical Contractor to rough-in a dedicated 30A branch circuit and matching locking receptacle.`,
          actionLabel: `View Electrical Specs in Rack Studio`,
          actionFn: `openRackFromHealth('${safeJsArg(normLoc)}')`,
          badgeText: "30A CIRCUIT REQ"
        });
      }
    });

    // 8B. UPS Output Receptacles ↔ PDU Input Plug Compatibility
    if (upsList.length > 0 && pduList.length > 0) {
      upsList.forEach(ups => {
        pduList.forEach(pdu => {
          const upsModelLower = (ups.model || '').toLowerCase();
          const pduModelLower = (pdu.model || '').toLowerCase();

          const isUps208V = upsModelLower.includes("208v") || upsModelLower.includes("240v") || upsModelLower.includes("srt");
          const isPdu208V = pduModelLower.includes("208v") || pduModelLower.includes("240v") || pduModelLower.includes("c13 & (4) c19") || pduModelLower.includes("l6-30");

          // Voltage Mismatch
          if (isUps208V !== isPdu208V) {
            issues.push({
              id: `power_voltage_mismatch_${normLoc.replace(/[^a-zA-Z0-9]/g, '_')}`,
              category: "power",
              severity: "critical",
              title: `Voltage Mismatch: PDU vs UPS in ${normLoc}`,
              summary: `Quoted PDU operates at ${isPdu208V ? '208V' : '120V'}, but quoted UPS supplies ${isUps208V ? '208V' : '120V'}!`,
              details: `Connecting a ${isPdu208V ? '208V' : '120V'} PDU (${pdu.model}) into a ${isUps208V ? '208V' : '120V'} UPS (${ups.model}) will cause severe electrical fault, component damage, or undervoltage failure. Ensure both UPS and PDU share the same nominal voltage.`,
              actionLabel: `Fix in Rack Studio`,
              actionFn: `openRackFromHealth('${safeJsArg(normLoc)}')`,
              badgeText: "VOLTAGE MISMATCH"
            });
          }

          // Plug Mismatch: 30A PDU on 15A/20A UPS
          const isPdu30A = pduModelLower.includes("30a") || pduModelLower.includes("l5-30") || pduModelLower.includes("l6-30");
          const isUps30A = upsModelLower.includes("3000") || upsModelLower.includes("3k") || upsModelLower.includes("5000") || upsModelLower.includes("5k");

          if (isPdu30A && !isUps30A) {
            issues.push({
              id: `pdu_plug_incompatible_${normLoc.replace(/[^a-zA-Z0-9]/g, '_')}`,
              category: "power",
              severity: "critical",
              title: `PDU Plug Incompatible with UPS in ${normLoc}`,
              summary: `30A Locking PDU (${pdu.model}) cannot plug into standard 15A/20A UPS (${ups.model})`,
              details: `The quoted PDU requires a 30A twist-lock receptacle (NEMA L5-30R / L6-30R), but the quoted UPS only provides standard straight-blade 15A/20A outlets. Upsize the UPS to a 3000VA unit with 30A locking output or select a 15A/20A straight-blade PDU.`,
              actionLabel: `Fix in Rack Studio`,
              actionFn: `openRackFromHealth('${safeJsArg(normLoc)}')`,
              badgeText: "PLUG MISMATCH"
            });
          }
        });
      });
    }

    // 8C. PDU Outlet Capacity vs Active Power Supplies
    if (pduList.length > 0) {
      let totalOutletsAvailable = 0;
      pduList.forEach(pdu => {
        const desc = (pdu.model || '') + ' ' + (pdu.description || '');
        const match = desc.match(/\((\d+)\)\s*c13/i) || desc.match(/(\d+)\s*outlets/i) || desc.match(/(\d+)x/i);
        const outlets = match ? parseInt(match[1], 10) : 8;
        totalOutletsAvailable += outlets * (pdu.qty || 1);
      });

      // Count required power cords (dual-PSU switches and servers require 2 outlets each)
      let requiredPowerCords = 0;
      closetItems.forEach(item => {
        if (item.role === "UPS" || item.role === "Battery Pack" || (item.role || '').toLowerCase().includes("pdu")) return;
        const qty = item.qty || 1;
        const isDualPsu = item.dualPowerSupply || item.dualPsu || (item.model || '').toLowerCase().includes("redundant");
        requiredPowerCords += (isDualPsu ? 2 : 1) * qty;
      });

      if (requiredPowerCords > totalOutletsAvailable && totalOutletsAvailable > 0) {
        issues.push({
          id: `pdu_outlets_deficit_${normLoc.replace(/[^a-zA-Z0-9]/g, '_')}`,
          category: "power",
          severity: "warning",
          title: `PDU Outlet Deficit in ${normLoc}`,
          summary: `${requiredPowerCords} power supply cords needed, but quoted PDU only provides ${totalOutletsAvailable} outlets`,
          details: `Active equipment in ${normLoc} requires ${requiredPowerCords} AC power cords. Add a secondary rack PDU (recommended for A/B redundant feed) or select a higher-density Zero-U vertical PDU.`,
          actionLabel: `+ Add Secondary PDU to ${normLoc}`,
          actionFn: `openRackFromHealth('${safeJsArg(normLoc)}')`,
          badgeText: `${requiredPowerCords - totalOutletsAvailable} OUTLETS SHORT`
        });
      }
    }
  });

  // =========================================================================
  // RULE 9: OUTDOOR & UNDERGROUND CABLE JACKET COMPLIANCE (NEC 300.9 / TOW)
  // Priority 1: NEC 300.5(B), 300.9 & Priority 2: TOW Structured Cabling Standards p. 1, 5
  // Prohibits indoor Plenum (CMP) or Riser (CMR) in outdoor or underground conduit
  // Highlights Conflict: Industry shortcut of using CMP everywhere vs National Code & Orion Standards
  // =========================================================================
  if (typeof facilityFloors !== "undefined" && Array.isArray(facilityFloors)) {
    facilityFloors.forEach(fl => {
      if (!fl.nodes || !Array.isArray(fl.nodes)) return;
      const flLower = (fl.name || "").toLowerCase();
      const isOutdoorFloor = flLower.includes("outdoor") || flLower.includes("exterior") || flLower.includes("perimeter") || flLower.includes("yard") || flLower.includes("roof") || flLower.includes("pole") || flLower.includes("parking");

      fl.nodes.filter(n => n.type === "device").forEach(dev => {
        const bomItem = dev.instanceId ? bomById.get(dev.instanceId) : null;
        const targetDev = bomItem || dev || {};
        const devName = bomItem ? (bomItem.friendlyName || bomItem.model) : (dev.label || dev.name || "Field Device");
        const devLocLower = ((dev.spaceName || "") + " " + (dev.label || "") + " " + (dev.name || "") + " " + (targetDev.model || "")).toLowerCase();

        const isOutdoor = isOutdoorFloor ||
                          targetDev.outdoor === true ||
                          targetDev.isOutdoor === true ||
                          devLocLower.includes("outdoor") ||
                          devLocLower.includes("pole") ||
                          devLocLower.includes("exterior") ||
                          devLocLower.includes("perimeter") ||
                          devLocLower.includes("parking") ||
                          devLocLower.includes("gate") ||
                          devLocLower.includes("roof") ||
                          devLocLower.includes("yard");

        if (isOutdoor) {
          const cableSku = dev.cableSku || targetDev.cableSku || "";
          const cableRating = (dev.cableRating || targetDev.cableRating || "").toUpperCase();
          const runCat = dev.runCategory || targetDev.runCategory || "";
          const isExplicitOutdoor = cableSku.includes("OUTDOOR") || cableSku.includes("OSP") || cableRating === "OSP" || cableRating === "CMX" || runCat.includes("OSP") || runCat.includes("Outdoor");

          if (!isExplicitOutdoor && (cableSku.includes("CMP") || cableSku.includes("CMR") || runCat.includes("CMP") || runCat.includes("Plenum") || runCat.includes("CMR") || !cableSku)) {
            issues.push({
              id: `outdoor_jacket_violation_${dev.id || (bomItem && bomItem.instanceId)}`,
              category: "cabling",
              severity: "critical",
              priority: 1,
              isConflict: true,
              conflictType: "INDUSTRY_NORM_CONFLICT",
              conflictBadge: "CODE & ORION CONFLICT",
              standardsReference: "NEC 300.9 & TOW Cabling p. 1, 5",
              title: `Code Violation: Indoor Cable in Outdoor / Wet Pathway (${devName})`,
              summary: `${devName} on ${fl.name || 'Site'} is assigned indoor Plenum (CMP) cable in an outdoor environment`,
              details: `Underground conduits and outdoor pathways are classified as wet locations under NEC 300.9. TOW Structured Cabling Standards (p. 1) explicitly state: 'At no time should plenum cable be used in outdoor locations exposed to the environment. Plenum cable should never be used in buried conduit. Moisture will penetrate the jacket and short the conductors.' Convert drop to CMX-Outdoor or Direct-Burial Gel-Filled PE jacket (C6A-OUTDOOR-1K).`,
              conflictDetails: `Industry Norm Shortcut: Installers commonly pull indoor Plenum (CMP) cable through underground PVC conduit or along building exteriors to avoid dedicated outdoor spools. However, underground conduit is defined by NEC 300.9 as a wet location. TOW Cabling Standards strictly prohibit CMP in buried conduit or outdoor locations due to moisture wicking.`,
              actionLabel: `Quick-Convert to Cat6A OSP Outdoor Cable`,
              actionFn: `quickConvertToOutdoorCable('${safeJsArg(dev.id || (bomItem && bomItem.instanceId))}')`,
              badgeText: "WET CONDUIT / CMP HAZARD"
            });
          }
        }
      });
    });
  }

  // =========================================================================
  // RULE 10: BUILDING ENTRY 50-FOOT OSP TRANSITION LIMIT (NEC 800.100)
  // Priority 1: NEC 800.48 / 800.100 & Priority 2: TOW Structured Cabling Standards p. 2, 8
  // Outside cabling must terminate within 50' of building entry or transition to indoor fire-rated cable
  // =========================================================================
  if (typeof facilityFloors !== "undefined" && Array.isArray(facilityFloors)) {
    facilityFloors.forEach(fl => {
      if (!fl.nodes || !Array.isArray(fl.nodes)) return;
      const outdoorDrops = fl.nodes.filter(n => {
        if (n.type !== "device") return false;
        const locLower = ((fl.name || '') + ' ' + (n.spaceName || '') + ' ' + (n.label || '')).toLowerCase();
        return locLower.includes("outdoor") || locLower.includes("exterior") || locLower.includes("pole") || locLower.includes("perimeter");
      });

      outdoorDrops.forEach(dev => {
        const runFt = (dev.calculatedRun && dev.calculatedRun.totalFt) ? Math.round(dev.calculatedRun.totalFt) : 0;
        if (runFt > 100) {
          const hasBet = projectBOM.some(i => (i.sku || '').includes("BET") || (i.model || '').toLowerCase().includes("entrance terminal") || (i.name || '').toLowerCase().includes("entrance terminal"));
          if (!hasBet) {
            issues.push({
              id: `osp_50ft_building_entry_limit_${dev.id}`,
              category: "cabling",
              severity: "warning",
              priority: 1,
              isConflict: true,
              conflictType: "CODE_VIOLATION",
              conflictBadge: "NEC 800.100 CODE VIOLATION",
              standardsReference: "NEC 800.100(B) / TOW Structured Cabling p. 8",
              title: `NEC 800.100: Outside Cable Exceeds 50' Transition Limit (${dev.label || dev.name || 'Drop'})`,
              summary: `Outdoor cable run (${runFt} ft) penetrates deep into building interior without listed building entrance transition`,
              details: `NEC Article 800.48 and TOW Structured Cabling Standards (p. 2, 8) mandate: 'Outside cabling must terminate within 50 ft of building entry; transition to interior-rated at listed entrance protector.' Unlisted outside plant PE cable produces toxic smoke and violates fire codes if run uncontained through building interiors. Add a Building Entrance Terminal (BET) or transition box near the point of entry.`,
              conflictDetails: `Industry Shortcut: Installers frequently run outdoor gel-filled PE cable hundreds of feet indoors directly to telecom racks to eliminate a transition splice. This directly violates NEC 800.48 fire spread codes.`,
              actionLabel: `+ Add Building Entrance Terminal (BET)`,
              actionFn: "quickAddBuildingEntranceTerminal()",
              badgeText: "NEC 50-FT RULE"
            });
          }
        }
      });
    });
  }

  // =========================================================================
  // RULE 11: LIFE SAFETY & SECURITY LEVEL EGRESS AUDIT (MAGLOCKS ON LEVEL 3)
  // Priority 1: NFPA 101 Life Safety Code 7.2.1.6 & Priority 2: TOW Fire Alarm Connections and Egress p. 2-3
  // Maglocks are strictly prohibited on Level 3 (Restricted Access & Egress) openings
  // =========================================================================
  projectBOM.forEach(item => {
    if (item.parentInstanceId) return;
    const modelLower = (item.model || '').toLowerCase();
    const descLower = (item.description || '').toLowerCase();
    const isMaglock = modelLower.includes("maglock") || modelLower.includes("magnetic lock") || modelLower.includes("m62") || modelLower.includes("m32") || descLower.includes("electromagnetic lock");

    const isLevel3 = item.securityLevel === 3 ||
                     item.level === 3 ||
                     modelLower.includes("level 3") ||
                     descLower.includes("level 3") ||
                     modelLower.includes("vault") ||
                     descLower.includes("vault") ||
                     modelLower.includes("scif") ||
                     descLower.includes("scif") ||
                     modelLower.includes("evidence") ||
                     descLower.includes("evidence") ||
                     modelLower.includes("cash room") ||
                     descLower.includes("cash room");

    if (isMaglock && isLevel3) {
      issues.push({
        id: `level3_maglock_violation_${item.instanceId}`,
        category: "egress",
        severity: "critical",
        priority: 1,
        isConflict: true,
        conflictType: "MANUFACTURER_CONFLICT",
        conflictBadge: "LIFE SAFETY & ORION CONFLICT",
        standardsReference: "NFPA 101 / TOW Fire Alarm Connections & Egress p. 2-3",
        title: `Life Safety & Security Conflict: Maglock on Level 3 Opening (${item.model})`,
        summary: `Magnetic lock specified for Security Level 3 restricted opening (vault / SCIF / evidence space)`,
        details: `TOW Fire Alarm Connections and Egress Standards (p. 2-3) strictly state: 'Hardware: Fail-secure strikes, bolts, or mortise only. Maglocks prohibited on Level 3 — they cannot fail secure.' Maglocks are inherently fail-safe and drop unlocked during power loss or fire alarm activation. High-security Level 3 openings must remain locked (fail-secure) through power outage and fire alarm. Replace with heavy-duty fail-secure electric strike or mortise lock with key override.`,
        conflictDetails: `Manufacturer Catalog Conflict: Hardware vendors frequently market electromagnetic locks as high-holding-force locks suitable for perimeter and security doors. However, per NFPA 101 and TOW Standards, maglocks cannot fail secure. Installing a maglock on a Level 3 opening compromises perimeter integrity during utility failure or alarm drop.`,
        actionLabel: `Switch to Fail-Secure Mortise Lock / Strike`,
        actionFn: `quickSwitchToFailSecureLock('${safeJsArg(item.instanceId)}')`,
        badgeText: "PROHIBITED ON LEVEL 3"
      });
    }
  });

  // Check floorplan nodes for Level 3 maglock doors
  if (typeof facilityFloors !== "undefined" && Array.isArray(facilityFloors)) {
    facilityFloors.forEach(fl => {
      if (!fl.nodes || !Array.isArray(fl.nodes)) return;
      fl.nodes.filter(n => n.type === "device").forEach(dev => {
        const labelLower = ((dev.label || '') + ' ' + (dev.name || '') + ' ' + (dev.spaceName || '')).toLowerCase();
        const isL3Dev = dev.securityLevel === 3 || labelLower.includes("vault") || labelLower.includes("scif") || labelLower.includes("evidence") || labelLower.includes("level 3");
        const isMag = dev.lockType === "maglock" || (dev.lockModel || '').toLowerCase().includes("maglock") || labelLower.includes("maglock");

        if (isL3Dev && isMag) {
          issues.push({
            id: `level3_maglock_violation_${dev.id}`,
            category: "egress",
            severity: "critical",
            priority: 1,
            isConflict: true,
            conflictType: "MANUFACTURER_CONFLICT",
            conflictBadge: "LIFE SAFETY & ORION CONFLICT",
            standardsReference: "NFPA 101 / TOW Fire Alarm Connections & Egress p. 2-3",
            title: `Life Safety & Security Conflict: Maglock on Level 3 Door (${dev.label || dev.name})`,
            summary: `Security Level 3 opening (${dev.label || dev.name} on ${fl.name || 'Floor'}) has a magnetic lock configured`,
            details: `Maglocks are strictly prohibited on Level 3 openings per TOW Fire Alarm Standards (p. 2-3) because maglocks drop open when power is lost. Level 3 openings must remain fail-secure through power outage. Replace with a heavy-duty fail-secure strike or mortise lock with key override.`,
            conflictDetails: `Manufacturer / Industry Norm Conflict: Lock catalogs promote maglocks for perimeter doors, but maglocks cannot fail secure on FAI drop or power loss.`,
            actionLabel: `Switch to Fail-Secure Mortise Lock`,
            actionFn: `quickSwitchToFailSecureLock('${safeJsArg(dev.id)}')`,
            badgeText: "PROHIBITED ON LEVEL 3"
          });
        }
      });
    });
  }

  // =========================================================================
  // RULE 12: OUTDOOR POE++ 802.3bt SURGE PROTECTOR POWER COMPATIBILITY
  // Priority 2: TOW Camera Installation Standards p. 7 & TOW Structured Cabling Standards p. 5
  // Outdoor high-power cameras (>30W, 802.3bt) require 802.3bt-certified surge protection
  // =========================================================================
  const outdoorBtCameras = [];
  if (typeof facilityFloors !== "undefined" && Array.isArray(facilityFloors)) {
    facilityFloors.forEach(fl => {
      if (!fl.nodes || !Array.isArray(fl.nodes)) return;
      const flLower = (fl.name || '').toLowerCase();
      const isOutdoorFloor = flLower.includes("outdoor") || flLower.includes("exterior") || flLower.includes("perimeter") || flLower.includes("roof") || flLower.includes("pole");

      fl.nodes.filter(n => n.type === "device").forEach(dev => {
        const bomItem = dev.instanceId ? bomById.get(dev.instanceId) : null;
        const target = bomItem || dev || {};
        const locLower = ((dev.spaceName || '') + ' ' + (dev.label || '') + ' ' + (target.model || '')).toLowerCase();
        const isOutdoor = isOutdoorFloor || target.outdoor || target.isOutdoor || locLower.includes("outdoor") || locLower.includes("pole") || locLower.includes("exterior");

        const watts = target.poeWattsDrawn || target.powerConsumptionWatts || target.baseWatts || 15;
        const isBt = watts > 30 || target.poeStandard === "bt" || (target.model || '').toLowerCase().includes("ptz") || (target.model || '').toLowerCase().includes("multi-sensor") || (target.model || '').toLowerCase().includes("bt-90w");

        if (isOutdoor && isBt) {
          outdoorBtCameras.push({ dev, bomItem, watts });
        }
      });
    });
  }

  // Also check BOM items for outdoor bt cameras
  projectBOM.forEach(item => {
    if (item.parentInstanceId) return;
    const modelLower = (item.model || '').toLowerCase();
    const isCam = item.category === "cameras" || item.role === "Camera" || modelLower.includes("camera") || modelLower.includes("ptz");
    const isOutdoor = item.outdoor === true || (item.closetName || '').toLowerCase().includes("pole") || (item.closetName || '').toLowerCase().includes("outdoor") || modelLower.includes("outdoor") || modelLower.includes("ptz");
    const watts = item.poeWattsDrawn || item.powerConsumptionWatts || item.baseWatts || 15;
    const isBt = watts > 30 || item.poeStandard === "bt" || modelLower.includes("ptz") || modelLower.includes("multi-sensor");

    if (isCam && isOutdoor && isBt) {
      if (!outdoorBtCameras.some(c => c.bomItem && c.bomItem.instanceId === item.instanceId)) {
        outdoorBtCameras.push({ dev: null, bomItem: item, watts });
      }
    }
  });

  if (outdoorBtCameras.length > 0) {
    const hasBtSurge = projectBOM.some(i =>
      (i.sku || '').includes("SURGE-POE-BT") ||
      (i.role === "Surge Protection" && (i.poeStandard === "bt" || i.poeWattsMax >= 60)) ||
      ((i.model || '').toLowerCase().includes("surge") && ((i.model || '').toLowerCase().includes("bt") || (i.model || '').toLowerCase().includes("90w")))
    );

    if (!hasBtSurge) {
      const topDev = outdoorBtCameras[0];
      const devName = topDev.bomItem ? (topDev.bomItem.friendlyName || topDev.bomItem.model) : (topDev.dev ? (topDev.dev.label || topDev.dev.name) : "Outdoor PTZ Camera");
      issues.push({
        id: `outdoor_surge_bt_mismatch_${topDev.dev ? topDev.dev.id : (topDev.bomItem ? topDev.bomItem.instanceId : 'bt')}`,
        category: "poe",
        severity: "critical",
        priority: 2,
        isConflict: true,
        conflictType: "EQUIPMENT_COMPATIBILITY_CONFLICT",
        conflictBadge: "EQUIPMENT COMPATIBILITY CONFLICT",
        standardsReference: "TOW Camera Standards p. 7 / TOW Cabling p. 5",
        title: `Surge Compatibility Conflict: 802.3bt High-Power Outdoor Camera (${devName})`,
        summary: `${outdoorBtCameras.length} outdoor 802.3bt device(s) drawing >30W require certified 802.3bt (up to 90W) surge suppressors`,
        details: `Per TOW Camera Installation Standards (p. 7) and TOW Structured Cabling Standards (p. 5), all external copper communication cables entering or leaving a building must pass through surge protection bonded to #10 AWG copper ground. For high-power PTZ and multi-sensor cameras drawing 60W-90W (802.3bt 4-pair), surge suppressors must be certified for 802.3bt power delivery. Standard 15W/30W suppressors falsely clamp voltages under 4-pair 54V-57V load, burning out suppressor diodes and causing cameras to power-cycle during PTZ motor or IR heater activation.`,
        conflictDetails: `Industry Norm Shortcut: Installers routinely deploy standard 30W PoE surge protectors on all outdoor drops. On 802.3bt high-power cameras, standard protectors clamp prematurely, causing intermittent reboot cycles or thermal burnout. Deploy an 802.3bt-certified surge suppressor (DITEK SURGE-POE-BT90).`,
        actionLabel: `+ Add 802.3bt 90W Outdoor Surge Protector`,
        actionFn: `quickAdd8023btSurgeProtector('${safeJsArg(topDev.dev ? topDev.dev.id : (topDev.bomItem ? topDev.bomItem.instanceId : ''))}')`,
        badgeText: "802.3bt SURGE REQ"
      });
    }
  }

  // =========================================================================
  // RULE 13: 10GBASE-T HIGH-SPEED CABLING COMPLIANCE (CAT6A MANDATORY)
  // Priority 2: TOW Switch Install & Configuration Guide p. 5 & TOW Structured Cabling Standards p. 5
  // Cat6 and Cat5e are strictly prohibited on 10GBASE-T links
  // =========================================================================
  projectBOM.forEach(item => {
    if (item.parentInstanceId) return;
    const is10G = item.uplinkSpeed === "10G" ||
                  (item.model || '').toLowerCase().includes("10g") ||
                  (item.name || '').toLowerCase().includes("10gbase-t") ||
                  (item.ports || '').toString().includes("10G");

    const isCat6 = item.standard === "Cat6" || (item.model || '').includes("Cat6 U/UTP") || (item.sku || '').startsWith("C6-");
    const isCat5 = item.standard === "Cat5e" || (item.model || '').includes("Cat5e");

    if (is10G && (isCat6 || isCat5)) {
      issues.push({
        id: `10g_cat6_violation_${item.instanceId}`,
        category: "cabling",
        severity: "warning",
        priority: 2,
        isConflict: true,
        conflictType: "ORION_STANDARD_CONFLICT",
        conflictBadge: "ORION STANDARD CONFLICT",
        standardsReference: "TOW Switch Guide p. 5 / TOW Cabling p. 5",
        title: `Orion Standard Conflict: Cat6 Specified on 10GBASE-T Link (${item.model})`,
        summary: `10G link is configured using standard Cat6 or Cat5e cabling instead of Cat6A`,
        details: `TOW Switch Install and Configuration Guide (p. 5) and TOW Structured Cabling Standards (p. 5) explicitly state: 'Category: Cat6 minimum. Cat6A for 10GBASE-T. Cat5e not permitted on new installs.' While standard Cat6 may run short distances in unbundled tests, real-world security conduit bundles induce heavy alien crosstalk (ANEXT), causing packet drops and CRC errors on high-bandwidth switch uplinks and VMS server streams. Upgrade to Cat6A F/UTP or 10G SFP+ DAC.`,
        conflictDetails: `Industry Norm Conflict: While commercial TIA standards allow short unbundled Cat6 runs (up to 37-55m) for 10Gbps, Orion Standards strictly prohibit Cat6 for 10G links because bundled cables in real-world security installations suffer catastrophic packet drops. Cat6A is mandatory.`,
        actionLabel: `Upgrade Link to Cat6A (10G Certified)`,
        actionFn: `quickUpgradeToCat6A('${safeJsArg(item.instanceId)}')`,
        badgeText: "CAT6A MANDATORY ON 10G"
      });
    }
  });

  // =========================================================================
  // RULE 14: SWITCH DUAL POWER SUPPLY A/B FEED REDUNDANCY
  // Priority 2: TOW Switch Install & Configuration Guide p. 2
  // Dual power supply switches must connect to separate independent power sources
  // =========================================================================
  closetsToAudit.forEach(normLoc => {
    const closetItems = projectBOM.filter(i => !i.parentInstanceId && FacilityStore.normalize(i.closetName || i.rackId) === normLoc);
    const dualPsuSwitches = closetItems.filter(i => {
      const isSw = (i.role === "Access" || i.role === "Aggregation" || i.role === "Core / Spine" || (i.model || '').includes("Switch"));
      return isSw && (i.dualPowerSupply || i.dualPsu || (i.model || '').toLowerCase().includes("redundant"));
    });

    if (dualPsuSwitches.length > 0) {
      const pduCount = closetItems.filter(i => (i.role || '').toLowerCase().includes("pdu") || (i.category || '').toLowerCase().includes("pdu") || (i.model || '').toLowerCase().includes("pdu")).reduce((acc, p) => acc + (p.qty || 1), 0);
      if (pduCount < 2) {
        issues.push({
          id: `switch_dual_psu_single_feed_${normLoc.replace(/[^a-zA-Z0-9]/g, '_')}`,
          category: "power",
          severity: "warning",
          priority: 2,
          isConflict: true,
          conflictType: "ORION_REDUNDANCY_WARNING",
          conflictBadge: "ORION REDUNDANCY WARNING",
          standardsReference: "TOW Switch Guide p. 2",
          closetName: normLoc,
          title: `Redundant Power Warning: Dual-PSU Switches on Single Circuit (${normLoc})`,
          summary: `${dualPsuSwitches.length} dual-power-supply switch(es) in ${normLoc} are fed by only a single PDU/circuit`,
          details: `TOW - OSS Switch Install and Configuration Guide (p. 2) mandates: 'Equipped with optional redundant power supplies (dual AC or DC inputs). OSS Technical Standards: Connect each power supply to a separate, independent power source when available (Circuit A / UPS A and Circuit B / UPS B).' Connecting both power supplies to the same single PDU defeats hardware redundancy and creates a single point of failure.`,
          conflictDetails: `Industry Shortcut: Installers routinely plug both power cords of redundant-supply switches into the same PDU strip. Adding a secondary PDU (Circuit B / UPS B) guarantees uninterrupted operation during branch circuit trips or PDU maintenance.`,
          actionLabel: `+ Add Secondary PDU (Circuit B) to ${normLoc}`,
          actionFn: `quickAddSecondaryPdu('${safeJsArg(normLoc)}')`,
          badgeText: "A/B POWER REQ"
        });
      }
    }
  });

  const criticalCount = issues.filter(i => i.severity === "critical").length;
  const warningCount = issues.filter(i => i.severity === "warning").length;
  const conflictCount = issues.filter(i => i.isConflict).length;
  const codeCount = issues.filter(i => i.priority === 1).length;
  const orionCount = issues.filter(i => i.priority === 2).length;

  return {
    isHealthy: issues.length === 0,
    issueCount: issues.length,
    criticalCount,
    warningCount,
    conflictCount,
    codeCount,
    orionCount,
    issues,
    stats
  };
}

/**
 * Updates the Top Header Bar Pill and BOM Drawer Alert Strip with real-time DRC results
 */
function updateProjectHealthUI() {
  const audit = auditProjectHealth();

  // 1. Persistent Top-Bar Alert Pill
  const pill = document.getElementById("projectHealthPill");
  const icon = document.getElementById("projectHealthPillIcon");
  const label = document.getElementById("projectHealthPillLabel");
  const countBadge = document.getElementById("projectHealthPillCount");

  if (pill) {
    if (audit.isHealthy) {
      pill.className = "px-2.5 py-2 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-400 border border-emerald-800/80 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer";
      if (icon) {
        icon.setAttribute("data-lucide", "check-circle-2");
        icon.className = "w-4 h-4 text-emerald-400";
      }
      if (label) label.innerText = "Design Validated";
      if (countBadge) {
        countBadge.classList.add("hidden");
        countBadge.innerText = "0";
      }
      pill.title = "DRC Audit: 100% Validated. No distance limits, PoE overcommit, or capacity deficits.";
    } else {
      const isCrit = audit.criticalCount > 0;
      pill.className = isCrit
        ? "px-2.5 py-2 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-600/80 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer animate-pulse"
        : "px-2.5 py-2 bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-600/80 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer";
      if (icon) {
        icon.setAttribute("data-lucide", isCrit ? "alert-octagon" : "alert-triangle");
        icon.className = `w-4 h-4 ${isCrit ? 'text-rose-400' : 'text-amber-400'}`;
      }
      if (label) {
        label.innerText = isCrit
          ? `${audit.criticalCount} Error${audit.criticalCount === 1 ? '' : 's'}`
          : `${audit.warningCount} Warning${audit.warningCount === 1 ? '' : 's'}`;
      }
      if (countBadge) {
        countBadge.classList.remove("hidden");
        countBadge.innerText = audit.issueCount;
        countBadge.className = `font-mono text-[10px] px-1.5 py-0.2 rounded-full font-bold ${isCrit ? 'bg-rose-500 text-white' : 'bg-amber-500 text-slate-950'}`;
      }
      pill.title = `DRC Audit: ${audit.issueCount} Findings (${audit.criticalCount} Critical, ${audit.warningCount} Warnings). Click to inspect and resolve.`;
    }
  }

  // 2. BOM Drawer Dynamic Alert Strip
  const strip = document.getElementById("bomDeficitAlertStrip");
  if (strip) {
    if (audit.isHealthy) {
      strip.innerHTML = `
        <div class="flex items-center justify-between text-[11px] text-slate-400">
          <span class="flex items-center gap-1.5 text-emerald-400 font-medium">
            <i data-lucide="check-circle-2" class="w-3.5 h-3.5"></i> Design Rules Validated (TIA-568 &amp; PoE Compliant)
          </span>
          <button onclick="toggleProjectHealthModal()" class="text-indigo-400 hover:text-indigo-300 font-mono text-[10px] hover:underline cursor-pointer">
            DRC Audit Details &rarr;
          </button>
        </div>
      `;
    } else {
      const isCrit = audit.criticalCount > 0;
      strip.innerHTML = `
        <div class="p-2.5 rounded-xl ${isCrit ? 'bg-rose-950/60 border border-rose-600/80' : 'bg-amber-950/60 border border-amber-600/80'} text-xs space-y-2">
          <div class="flex items-center justify-between">
            <span class="${isCrit ? 'text-rose-300' : 'text-amber-300'} font-bold flex items-center gap-1.5">
              <i data-lucide="${isCrit ? 'alert-octagon' : 'alert-triangle'}" class="w-4 h-4 ${isCrit ? 'text-rose-400' : 'text-amber-400'}"></i>
              ${audit.issueCount} Design Rule Finding${audit.issueCount === 1 ? '' : 's'} (${audit.criticalCount} Critical)
            </span>
            <button onclick="toggleProjectHealthModal()" class="px-2 py-0.5 ${isCrit ? 'bg-rose-600 hover:bg-rose-500' : 'bg-amber-600 hover:bg-amber-500'} text-white font-bold rounded text-[10px] shadow transition-all cursor-pointer">
              Review DRC Findings &rarr;
            </button>
          </div>
          <div class="text-[11px] ${isCrit ? 'text-rose-200/90' : 'text-amber-200/90'} space-y-0.5 font-mono">
            ${audit.issues.slice(0, 3).map(iss => `<div class="truncate">&bull; ${escapeHTML(iss.summary)}</div>`).join('')}
            ${audit.issues.length > 3 ? `<div class="text-[10px] opacity-75">+ ${audit.issues.length - 3} more finding(s)...</div>` : ''}
          </div>
        </div>
      `;
    }
  }

  // 3. Update Modal if already open
  const modal = document.getElementById("projectHealthModal");
  if (modal && !modal.classList.contains("hidden")) {
    renderProjectHealthModal();
  }

  if (window.lucide) {
    try { lucide.createIcons(); } catch(e) {}
  }
}

/**
 * Toggles the DRC Audit Modal open or closed
 */
function toggleProjectHealthModal() {
  const modal = document.getElementById("projectHealthModal");
  if (!modal) return;

  if (modal.classList.contains("hidden")) {
    modal.classList.remove("hidden");
    renderProjectHealthModal();
  } else {
    modal.classList.add("hidden");
  }
}

/**
 * Changes active filter category for DRC Modal
 */
function setDrcActiveFilter(category) {
  drcActiveFilter = category;
  renderProjectHealthModal();
}

/**
 * Renders the full Design Rule Checker Modal with KPI metrics, filter chips, and finding cards
 */
function renderProjectHealthModal() {
  const audit = auditProjectHealth();
  const content = document.getElementById("projectHealthModalContent");
  const badge = document.getElementById("projectHealthModalBadge");
  const iconBox = document.getElementById("projectHealthModalIcon");

  if (badge) {
    if (audit.isHealthy) {
      badge.innerText = "100% Validated";
      badge.className = "text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800";
    } else {
      const isCrit = audit.criticalCount > 0;
      badge.innerText = `${audit.issueCount} Finding${audit.issueCount === 1 ? '' : 's'} (${audit.criticalCount} Critical)`;
      badge.className = `text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${isCrit ? 'bg-rose-950 text-rose-300 border border-rose-700 animate-pulse' : 'bg-amber-950 text-amber-300 border border-amber-700'}`;
    }
  }

  if (iconBox) {
    if (audit.isHealthy) {
      iconBox.className = "p-2 rounded-xl bg-emerald-950/80 text-emerald-400 border border-emerald-800/80";
      iconBox.innerHTML = `<i data-lucide="shield-check" class="w-5 h-5"></i>`;
    } else {
      const isCrit = audit.criticalCount > 0;
      iconBox.className = `p-2 rounded-xl ${isCrit ? 'bg-rose-950/80 text-rose-400 border border-rose-700/80' : 'bg-amber-950/80 text-amber-400 border border-amber-700/80'}`;
      iconBox.innerHTML = `<i data-lucide="${isCrit ? 'alert-octagon' : 'alert-triangle'}" class="w-5 h-5"></i>`;
    }
  }

  if (!content) return;

  // Filter issues
  let filteredIssues = audit.issues;
  if (drcActiveFilter === "critical") filteredIssues = audit.issues.filter(i => i.severity === "critical");
  else if (drcActiveFilter === "warning") filteredIssues = audit.issues.filter(i => i.severity === "warning");
  else if (drcActiveFilter === "conflicts") filteredIssues = audit.issues.filter(i => i.isConflict);
  else if (drcActiveFilter !== "all") filteredIssues = audit.issues.filter(i => i.category === drcActiveFilter);

  const distCount = audit.issues.filter(i => i.category === "distance").length;
  const poeCount = audit.issues.filter(i => i.category === "poe").length;
  const capCount = audit.issues.filter(i => i.category === "capacity").length;
  const hwCount = audit.issues.filter(i => i.category === "hardware").length;
  const scopeCount = audit.issues.filter(i => i.category === "scope").length;
  const cableCount = audit.issues.filter(i => i.category === "cabling").length;
  const egressCount = audit.issues.filter(i => i.category === "egress").length;
  const conflictCount = audit.issues.filter(i => i.isConflict).length;

  content.innerHTML = `
    <!-- DRC Telemetry KPI Dashboard -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <!-- Distance KPI -->
      <div class="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
        <span class="text-slate-500 text-[10px] uppercase font-mono block flex items-center justify-between">
          <span>TIA-568 Distance</span>
          <i data-lucide="map-pin" class="w-3.5 h-3.5 ${distCount > 0 ? 'text-rose-400' : 'text-emerald-400'}"></i>
        </span>
        <div class="font-bold ${distCount > 0 ? 'text-rose-400' : 'text-emerald-400'} text-sm font-mono">
          ${distCount === 0 ? 'All Runs in Spec' : `${distCount} Over Limit`}
        </div>
        <div class="text-[10px] text-slate-400 font-mono">${audit.stats.totalMeasuredDrops} Measured Runs (295 ft Max)</div>
      </div>

      <!-- PoE Headroom KPI -->
      <div class="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
        <span class="text-slate-500 text-[10px] uppercase font-mono block flex items-center justify-between">
          <span>PoE Headroom</span>
          <i data-lucide="zap" class="w-3.5 h-3.5 ${poeCount > 0 ? 'text-rose-400' : 'text-amber-400'}"></i>
        </span>
        <div class="font-bold ${audit.stats.poeDemandWatts > audit.stats.poeSupplyWatts ? 'text-rose-400' : 'text-amber-400'} text-sm font-mono">
          ${audit.stats.poeDemandWatts}W / ${audit.stats.poeSupplyWatts}W
        </div>
        <div class="text-[10px] text-slate-400 font-mono">
          ${audit.stats.poeSupplyWatts >= audit.stats.poeDemandWatts ? `${audit.stats.poeSupplyWatts - audit.stats.poeDemandWatts}W Free Buffer` : 'Budget Deficit'}
        </div>
      </div>

      <!-- Code & Orion Conflicts KPI -->
      <div class="p-3 rounded-xl bg-slate-950 border ${conflictCount > 0 ? 'border-amber-600/80 bg-amber-950/20' : 'border-slate-800'} space-y-1">
        <span class="text-slate-500 text-[10px] uppercase font-mono block flex items-center justify-between">
          <span>Standards Conflicts</span>
          <i data-lucide="alert-triangle" class="w-3.5 h-3.5 ${conflictCount > 0 ? 'text-amber-400' : 'text-emerald-400'}"></i>
        </span>
        <div class="font-bold ${conflictCount > 0 ? 'text-amber-400' : 'text-emerald-400'} text-sm font-mono">
          ${conflictCount === 0 ? 'Fully Compliant' : `${conflictCount} Discrepanc${conflictCount === 1 ? 'y' : 'ies'}`}
        </div>
        <div class="text-[10px] text-slate-400 font-mono">${conflictCount > 0 ? 'Industry / OEM Conflict' : 'National Code & TOW'}</div>
      </div>

      <!-- Scope & Licensing KPI -->
      <div class="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
        <span class="text-slate-500 text-[10px] uppercase font-mono block flex items-center justify-between">
          <span>VMS Licensing</span>
          <i data-lucide="key" class="w-3.5 h-3.5 ${scopeCount > 0 ? 'text-amber-400' : 'text-purple-400'}"></i>
        </span>
        <div class="font-bold ${scopeCount > 0 ? 'text-amber-400' : 'text-purple-400'} text-sm font-mono">
          ${audit.stats.totalLicenses} / ${audit.stats.totalCameras} Channel Keys
        </div>
        <div class="text-[10px] text-slate-400 font-mono">
          ${audit.stats.totalLicenses >= audit.stats.totalCameras ? 'All Cameras Licensed' : `${audit.stats.totalCameras - audit.stats.totalLicenses} Unlicensed`}
        </div>
      </div>
    </div>

    <!-- Filter Category Chips with Dedicated Conflict Filter -->
    <div class="flex items-center gap-1.5 overflow-x-auto py-1 text-xs">
      <button onclick="setDrcActiveFilter('all')" class="px-2.5 py-1 rounded-lg font-semibold transition-all ${drcActiveFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}">
        All (${audit.issueCount})
      </button>

      <!-- Code & Orion Conflicts Filter (Primary Priority Filter) -->
      <button onclick="setDrcActiveFilter('conflicts')" class="px-2.5 py-1 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${drcActiveFilter === 'conflicts' ? 'bg-amber-600 text-white shadow-md' : (conflictCount > 0 ? 'bg-amber-950/60 text-amber-300 hover:text-white border border-amber-600/80' : 'bg-slate-800 text-slate-400 hover:text-white')}">
        <i data-lucide="alert-triangle" class="w-3.5 h-3.5 ${conflictCount > 0 ? 'text-amber-400' : 'text-slate-400'}"></i>
        <span>Code &amp; Standards Conflicts (${conflictCount})</span>
      </button>

      <button onclick="setDrcActiveFilter('critical')" class="px-2.5 py-1 rounded-lg font-semibold transition-all flex items-center gap-1 ${drcActiveFilter === 'critical' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-rose-300'}">
        <span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
        Critical (${audit.criticalCount})
      </button>
      <button onclick="setDrcActiveFilter('warning')" class="px-2.5 py-1 rounded-lg font-semibold transition-all flex items-center gap-1 ${drcActiveFilter === 'warning' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-amber-300'}">
        <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
        Warnings (${audit.warningCount})
      </button>
      <button onclick="setDrcActiveFilter('cabling')" class="px-2.5 py-1 rounded-lg font-semibold transition-all ${drcActiveFilter === 'cabling' ? 'bg-slate-700 text-amber-300 border border-amber-500' : 'bg-slate-800 text-slate-400 hover:text-white'}">
        Cabling &amp; Wet Conduit (${cableCount})
      </button>
      <button onclick="setDrcActiveFilter('egress')" class="px-2.5 py-1 rounded-lg font-semibold transition-all ${drcActiveFilter === 'egress' ? 'bg-slate-700 text-rose-300 border border-rose-500' : 'bg-slate-800 text-slate-400 hover:text-white'}">
        Life Safety &amp; Egress (${egressCount})
      </button>
      <button onclick="setDrcActiveFilter('distance')" class="px-2.5 py-1 rounded-lg font-semibold transition-all ${drcActiveFilter === 'distance' ? 'bg-slate-700 text-amber-300 border border-amber-500' : 'bg-slate-800 text-slate-400 hover:text-white'}">
        Distance (${distCount})
      </button>
      <button onclick="setDrcActiveFilter('poe')" class="px-2.5 py-1 rounded-lg font-semibold transition-all ${drcActiveFilter === 'poe' ? 'bg-slate-700 text-amber-300 border border-amber-500' : 'bg-slate-800 text-slate-400 hover:text-white'}">
        PoE &amp; Power (${poeCount})
      </button>
      <button onclick="setDrcActiveFilter('capacity')" class="px-2.5 py-1 rounded-lg font-semibold transition-all ${drcActiveFilter === 'capacity' ? 'bg-slate-700 text-sky-300 border border-sky-500' : 'bg-slate-800 text-slate-400 hover:text-white'}">
        Closet Capacity (${capCount})
      </button>
      <button onclick="setDrcActiveFilter('scope')" class="px-2.5 py-1 rounded-lg font-semibold transition-all ${drcActiveFilter === 'scope' ? 'bg-slate-700 text-purple-300 border border-purple-500' : 'bg-slate-800 text-slate-400 hover:text-white'}">
        Scope &amp; VMS (${scopeCount})
      </button>
    </div>

    ${audit.isHealthy ? `
      <div class="py-12 text-center space-y-3 bg-slate-950/60 rounded-2xl border border-slate-800/80 p-6">
        <div class="w-16 h-16 rounded-full bg-emerald-950 border border-emerald-700/80 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-900/30">
          <i data-lucide="check-check" class="w-8 h-8"></i>
        </div>
        <h3 class="text-base font-bold text-white">All Design Rule Checks Passed</h3>
        <p class="text-xs text-slate-300 max-w-lg mx-auto leading-relaxed">
          National &amp; local codes (NEC 300.9 / 800.100, NFPA 101, TIA-568) and Orion Internal Standards (TOW Structured Cabling, Life Safety Power, and Switch Configuration) are 100% verified. No manufacturer or industry discrepancies detected.
        </p>
        <div class="pt-2">
          <button onclick="toggleProjectHealthModal()" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold cursor-pointer">
            Return to Design Canvas
          </button>
        </div>
      </div>
    ` : `
      <div class="space-y-4">
        <!-- Action Summary Banner -->
        <div class="p-3.5 rounded-2xl ${audit.criticalCount > 0 ? 'bg-rose-950/40 border border-rose-800/80' : 'bg-amber-950/40 border border-amber-800/80'} flex items-center justify-between flex-wrap gap-3">
          <div class="flex items-center gap-3">
            <div class="p-2 rounded-xl ${audit.criticalCount > 0 ? 'bg-rose-900/60 text-rose-300 border border-rose-700/60' : 'bg-amber-900/60 text-amber-300 border border-amber-700/60'}">
              <i data-lucide="${audit.criticalCount > 0 ? 'alert-octagon' : 'alert-triangle'}" class="w-5 h-5"></i>
            </div>
            <div>
              <h3 class="text-xs font-bold text-white flex items-center gap-2">
                <span>${filteredIssues.length} Finding${filteredIssues.length === 1 ? '' : 's'} in Current Filter</span>
                ${conflictCount > 0 ? `<span class="text-[10px] font-mono font-bold px-2 py-0.2 rounded-full bg-amber-900 text-amber-200 border border-amber-600">${conflictCount} Code/Orion Conflict${conflictCount === 1 ? '' : 's'}</span>` : ''}
                ${audit.criticalCount > 0 ? `<span class="text-[10px] font-mono font-bold px-2 py-0.2 rounded-full bg-rose-900 text-rose-200 border border-rose-700">${audit.criticalCount} Critical</span>` : ''}
              </h3>
              <p class="text-[11px] text-slate-300">Priority order: 1. National/Local Code &rarr; 2. Orion Standards &rarr; 3. Manufacturer Best Practices / Industry Norms.</p>
            </div>
          </div>
          <button onclick="autoFixAllProjectMisses()" class="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-rose-900/40 flex items-center gap-1.5 cursor-pointer transition-all">
            <i data-lucide="wrench" class="w-3.5 h-3.5"></i>
            <span>Auto-Resolve Global Misses</span>
          </button>
        </div>

        <!-- Issue Findings Cards List with Priority and Conflict Badging -->
        <div class="space-y-2.5">
          ${filteredIssues.map(iss => `
            <div class="p-4 rounded-xl bg-slate-950 border ${iss.severity === 'critical' ? 'border-rose-700/80 hover:border-rose-500' : 'border-amber-700/80 hover:border-amber-500'} space-y-2.5 shadow-md transition-colors">
              <div class="flex items-center justify-between flex-wrap gap-2">
                <div class="flex items-center gap-2">
                  <span class="p-1 rounded-lg ${iss.severity === 'critical' ? 'bg-rose-950 text-rose-400 border border-rose-800' : 'bg-amber-950 text-amber-400 border border-amber-800'}">
                    <i data-lucide="${iss.severity === 'critical' ? 'alert-octagon' : 'alert-triangle'}" class="w-4 h-4"></i>
                  </span>
                  <span class="text-xs font-bold text-white">${escapeHTML(iss.title)}</span>
                </div>
                <div class="flex items-center gap-1.5 flex-wrap">
                  ${iss.priority === 1 ? `<span class="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-600 flex items-center gap-1"><i data-lucide="shield" class="w-2.5 h-2.5 text-blue-400"></i> PRIORITY 1: NATIONAL CODE</span>` : ''}
                  ${iss.priority === 2 ? `<span class="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-600 flex items-center gap-1"><i data-lucide="award" class="w-2.5 h-2.5 text-indigo-400"></i> PRIORITY 2: ORION STANDARD</span>` : ''}
                  ${iss.badgeText ? `<span class="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-900 text-slate-300 border border-slate-700">${escapeHTML(iss.badgeText)}</span>` : ''}
                  <span class="text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase ${iss.severity === 'critical' ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-amber-950 text-amber-300 border border-amber-800'}">
                    ${iss.severity === 'critical' ? 'Critical Deficit' : 'Engineering Warning'}
                  </span>
                </div>
              </div>

              <p class="text-xs text-slate-200 font-mono font-medium">${escapeHTML(iss.summary)}</p>
              <p class="text-[11px] text-slate-400 leading-relaxed">${escapeHTML(iss.details)}</p>

              <!-- Conflict Highlight Box: Flags discrepancies where manufacturer practice or industry shortcut conflicts with Code or Orion Standards -->
              ${iss.isConflict ? `
                <div class="p-2.5 rounded-lg bg-amber-950/40 border border-amber-500/60 space-y-1">
                  <div class="flex items-center justify-between text-xs font-bold text-amber-300 flex-wrap gap-1">
                    <span class="flex items-center gap-1.5">
                      <i data-lucide="alert-triangle" class="w-3.5 h-3.5 text-amber-400"></i>
                      <span>${escapeHTML(iss.conflictBadge || 'MANUFACTURER / INDUSTRY NORM CONFLICT')}</span>
                    </span>
                    ${iss.standardsReference ? `<span class="text-[10px] font-mono text-amber-400/90 font-semibold">[Governing Standard: ${escapeHTML(iss.standardsReference)}]</span>` : ''}
                  </div>
                  <div class="text-[11px] text-amber-200/90 leading-relaxed font-sans">
                    ${escapeHTML(iss.conflictDetails || '')}
                  </div>
                </div>
              ` : ''}

              <div class="pt-2 border-t border-slate-800 flex items-center justify-between flex-wrap gap-2">
                <span class="text-[10px] text-slate-500 uppercase tracking-wider font-mono">Remediation Action:</span>
                <button onclick="${iss.actionFn}" class="px-3 py-1.5 ${iss.severity === 'critical' ? 'bg-rose-600 hover:bg-rose-500' : 'bg-amber-600 hover:bg-amber-500'} text-white font-bold rounded-lg text-xs shadow flex items-center gap-1.5 cursor-pointer transition-all">
                  <i data-lucide="arrow-right-circle" class="w-3.5 h-3.5"></i>
                  <span>${escapeHTML(iss.actionLabel)}</span>
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `}
  `;

  if (window.lucide) {
    try { lucide.createIcons(); } catch(e) {}
  }
}

// =========================================================================
// CROSS-STUDIO DEEP-LINKING ACTION HELPERS
// =========================================================================

function jumpToPhysicalLayoutFromHealth(targetVal) {
  toggleProjectHealthModal();
  if (typeof jumpToPhysicalLayoutTarget === "function") {
    jumpToPhysicalLayoutTarget(targetVal);
  } else if (typeof toggleCableLayoutModal === "function") {
    toggleCableLayoutModal();
  }
}

function openPortMatrixFromHealth(switchId) {
  toggleProjectHealthModal();
  if (typeof openPortMatrixStudio === "function") {
    openPortMatrixStudio(switchId || null);
  }
}

function openRackFromHealth(closetName) {
  toggleProjectHealthModal();
  if (typeof deepLinkToRackElevation === "function") {
    deepLinkToRackElevation(closetName);
  } else if (typeof toggleFacilityModal === "function") {
    toggleFacilityModal();
  }
}

function autoAssignFloorDropToNearestCloset(floorId, devId) {
  if (typeof facilityFloors === "undefined" || !Array.isArray(facilityFloors)) return;
  const floor = facilityFloors.find(f => f.id === floorId);
  if (!floor || !floor.nodes) return;

  const closets = floor.nodes.filter(n => n.type === "closet");
  const dev = floor.nodes.find(n => n.id === devId);
  if (!dev || closets.length === 0) return;

  let nearest = closets[0];
  let minD = 999999;
  closets.forEach(c => {
    const d = Math.hypot(c.x - dev.x, c.y - dev.y);
    if (d < minD) {
      minD = d;
      nearest = c;
    }
  });

  dev.assignedClosetId = nearest.id;
  if (typeof calculateAllRunsOnFloor === "function") {
    calculateAllRunsOnFloor(floor);
  }

  updateProjectHealthUI();
  if (typeof showToast === "function") {
    showToast(`Assigned ${dev.label || dev.name || 'Drop'} to ${nearest.name}`);
  }
}

function quickAddSwitchToCloset(targetLoc) {
  if (typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) return;
  const rec = getContextAwarePoERecommendation();
  const sw = rec.switchItem;

  projectBOM.push({
    instanceId: `sw-cap-${Date.now()}`,
    id: sw.sku,
    model: sw.model,
    sku: sw.sku,
    role: "Access",
    vendor: sw.vendor,
    msrp: sw.msrp,
    ports: sw.ports || 24,
    poeBudget: sw.poeBudget || 370,
    baseWatts: sw.baseWatts || 45,
    rackUnits: 1,
    depthInches: 13.8,
    uplinkMode: "single",
    qty: 1,
    closetName: targetLoc,
    rackId: targetLoc,
    rackSlot: null
  });

  if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
    FacilityStore.notifyWorkspaceChange();
  }
  updateBOMView();
  updateProjectHealthUI();
  if (typeof showToast === "function") {
    showToast(`Added ${sw.vendor} 24-Port Switch to ${targetLoc}`);
  }
}

function quickAddPatchPanelToCloset(targetLoc) {
  if (typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) return;

  projectBOM.push({
    instanceId: `panel-${Date.now()}`,
    id: "PP-1U-24P-MOD",
    model: "1U 24-Port High-Density Modular Keystone Patch Panel",
    sku: "PP-1U-24P-MOD",
    role: "Structured Cabling",
    category: "cabling",
    vendor: "Panduit",
    msrp: 68,
    ports: 24,
    rackUnits: 1,
    qty: 1,
    closetName: targetLoc,
    rackId: targetLoc,
    rackSlot: null
  });

  if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
    FacilityStore.notifyWorkspaceChange();
  }
  updateBOMView();
  updateProjectHealthUI();
  if (typeof showToast === "function") {
    showToast(`Added 24-Port Modular Keystone Patch Panel to ${targetLoc}`);
  }
}

function quickAddDefaultNvrServer() {
  if (typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) return;
  const targetLoc = "MDF • Rack-1";

  projectBOM.push({
    instanceId: `nvr-${Date.now()}`,
    id: "SVR-2U-NVR-128CH",
    model: "2U Enterprise 128-Channel NVR Server Appliance (RAID-6, Redundant PSU)",
    sku: "SVR-2U-NVR-128CH",
    role: "Server",
    category: "servers",
    vendor: "BCDVideo / Dell",
    msrp: 4850,
    rackUnits: 2,
    baseWatts: 350,
    poeBudget: 0,
    qty: 1,
    closetName: targetLoc,
    rackId: targetLoc,
    rackSlot: null
  });

  if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
    FacilityStore.notifyWorkspaceChange();
  }
  updateBOMView();
  updateProjectHealthUI();
  if (typeof showToast === "function") {
    showToast(`Added 2U 128-Channel Enterprise NVR Server to ${targetLoc}`);
  }
}

function quickAddDefaultAcsController() {
  if (typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) return;
  const targetLoc = "MDF • Rack-1";

  projectBOM.push({
    instanceId: `acs-ctrl-${Date.now()}`,
    id: "ALTRONIX-TROVE2-8DR",
    model: "Trove2 Modular 8-Door Access Control Power Enclosure with Mercury Subplate",
    sku: "ALTRONIX-TROVE2-8DR",
    role: "Access Control",
    category: "access_control",
    vendor: "Altronix / Mercury",
    msrp: 1450,
    rackUnits: 0,
    baseWatts: 120,
    poeBudget: 0,
    qty: 1,
    closetName: targetLoc,
    rackId: targetLoc,
    rackSlot: null
  });

  if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
    FacilityStore.notifyWorkspaceChange();
  }
  updateBOMView();
  updateProjectHealthUI();
  if (typeof showToast === "function") {
    showToast(`Added 8-Door Trove Access Control Power Enclosure to ${targetLoc}`);
  }
}

function quickAddUpsToCloset(targetLoc) {
  if (typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) return;

  const instId = "inst-ups-" + Date.now();
  projectBOM.push({
    instanceId: instId,
    id: "tripplite-smart2200rmxl2u",
    sku: "SMART2200RMXL2U",
    model: "Tripp Lite SMART2200RMXL2U (2200VA/1950W Rack (2U))",
    name: "Tripp Lite SMART2200RMXL2U (2200VA/1950W Rack (2U))",
    vendor: "Tripp Lite",
    category: "ups",
    type: "ups",
    role: "UPS",
    rackUnits: 2,
    rackSlot: null,
    closetName: targetLoc,
    location: targetLoc,
    rackId: targetLoc,
    msrp: 1199,
    qty: 1,
    baseWatts: 58,
    powerWatts: 1950,
    weightLbs: 45
  });

  if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
    FacilityStore.notifyWorkspaceChange();
  }
  updateBOMView();
  updateProjectHealthUI();
  if (typeof showToast === "function") {
    showToast(`Added 2200VA Line-Interactive UPS to ${targetLoc}`);
  }
}

function quickAddEbpToCloset(targetLoc, count = 1) {
  if (typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) return;

  for (let i = 0; i < count; i++) {
    projectBOM.push({
      instanceId: `inst-ebp-${Date.now()}-${i}`,
      id: "tripplite-bp72vrm2u",
      sku: "BP72VRM2U",
      model: "Tripp Lite BP72VRM2U 72VDC 2U External Battery Pack",
      name: "Tripp Lite BP72VRM2U 72VDC 2U External Battery Pack",
      vendor: "Tripp Lite",
      category: "ups",
      type: "ebp",
      role: "Battery Pack",
      isEbp: true,
      rackUnits: 2,
      rackSlot: null,
      closetName: targetLoc,
      location: targetLoc,
      rackId: targetLoc,
      msrp: 899,
      qty: 1,
      baseWatts: 0,
      powerWatts: 0,
      weightLbs: 68
    });
  }

  if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
    FacilityStore.notifyWorkspaceChange();
  }
  updateBOMView();
  updateProjectHealthUI();
  if (typeof showToast === "function") {
    showToast(`Added ${count}x BP72VRM2U External Battery Pack(s) to ${targetLoc}`);
  }
}

// -----------------------------------------------------------
// 1-Click Project Health Resolution Handlers
// -----------------------------------------------------------
function autoFixUnassignedGear() {
  if (typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) return;
  const locations = typeof FacilityStore !== "undefined" ? FacilityStore.getLocationNames(false) : [];
  const targetLoc = locations.find(l => l.includes("MDF") || l.includes("Rack-1")) || locations[0] || "MDF • Rack-1";

  let fixedCount = 0;
  projectBOM.forEach(item => {
    if (item.parentInstanceId) return;
    if (item.role === "Structured Cabling" || item.role === "Optics & DAC" || item.role?.includes("License")) return;
    const loc = FacilityStore.normalize(item.closetName || item.rackId);
    if (loc === FacilityStore.UNASSIGNED) {
      item.closetName = targetLoc;
      item.rackId = targetLoc;
      item.rackSlot = null;
      fixedCount++;
    }
  });

  if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
    FacilityStore.notifyWorkspaceChange();
  }
  updateBOMView();
  updateProjectHealthUI();
  if (typeof showToast === "function") {
    showToast(`Assigned ${fixedCount} item${fixedCount === 1 ? '' : 's'} to ${targetLoc}`);
  }
}

function autoAddMissingLicenses() {
  if (typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) return;
  const cameraItems = projectBOM.filter(i =>
    !i.parentInstanceId &&
    (i.category === "cameras" || i.role === "Camera" || i.deviceType === "camera" || (i.model || '').toLowerCase().includes("camera"))
  );
  const totalCameras = cameraItems.reduce((acc, i) => acc + (i.qty || 1), 0);

  const licenseItems = projectBOM.filter(i =>
    i.role === "Mgmt License" || i.role === "Security License" || i.role === "Feature License" || (i.sku || '').startsWith("LIC-")
  );
  const totalLicenses = licenseItems.reduce((acc, i) => acc + (i.qty || 1), 0);
  const missing = Math.max(0, totalCameras - totalLicenses);

  if (missing > 0) {
    projectBOM.push({
      instanceId: `lic-cam-${Date.now()}`,
      id: "LIC-VMS-CAM-CORE",
      model: "VMS Enterprise Single Camera Channel Recording License (Perpetual)",
      sku: "LIC-VMS-CAM-CORE",
      role: "Security License",
      vendor: "Milestone / Network Optix",
      msrp: 180,
      poeBudget: 0,
      baseWatts: 0,
      qty: missing,
      closetName: "MDF • Rack-1",
      rackId: "MDF • Rack-1",
      rackSlot: null
    });
  }

  if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
    FacilityStore.notifyWorkspaceChange();
  }
  updateBOMView();
  updateProjectHealthUI();
  if (typeof showToast === "function") {
    showToast(`Added ${missing} VMS Camera Channel License${missing === 1 ? '' : 's'} to Quote BOM.`);
  }
}

function autoAddMissingDACCables() {
  if (typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) return;
  const stackedSwitches = projectBOM.filter(i => !i.parentInstanceId && i.stackedUnits >= 2);
  let required = 0;
  stackedSwitches.forEach(sw => { required += sw.stackedUnits; });

  const existing = projectBOM.filter(i => i.role === "Stacking Cable" || (i.role === "Optics & DAC" && (i.sku === "STACK-DAC-1M" || (i.model || '').includes("DAC")))).reduce((acc, i) => acc + (i.qty || 1), 0);
  const missing = Math.max(0, required - existing);

  if (missing > 0) {
    const existingEntry = projectBOM.find(i => i.sku === "STACK-DAC-1M");
    if (existingEntry) {
      existingEntry.qty += missing;
    } else {
      projectBOM.push({
        instanceId: `stack-dac-${Date.now()}`,
        id: "STACK-DAC-1M",
        model: "10G/25G Direct Attach Passive Copper Stacking Cable (1 Meter)",
        sku: "STACK-DAC-1M",
        role: "Optics & DAC",
        vendor: "Generic / OEM",
        msrp: 65,
        poeBudget: 0,
        baseWatts: 0,
        qty: missing,
        closetName: "MDF • Rack-1",
        rackId: "MDF • Rack-1",
        rackSlot: null
      });
    }
  }

  if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
    FacilityStore.notifyWorkspaceChange();
  }
  updateBOMView();
  updateProjectHealthUI();
  if (typeof showToast === "function") {
    showToast(`Added ${missing} Stacking DAC Cable${missing === 1 ? '' : 's'} to Quote BOM.`);
  }
}

function getContextAwarePoERecommendation() {
  if (typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) {
    return {
      switchItem: { sku: "CBS350-24FP-4X", vendor: "Cisco", msrp: 1150, poeBudget: 370 },
      targetCloset: "MDF • Rack-1"
    };
  }

  const vendorCounts = {};
  const closetBudgets = {};

  projectBOM.forEach(item => {
    if (item.parentInstanceId) return;
    const v = item.vendor;
    if (v) vendorCounts[v] = (vendorCounts[v] || 0) + (item.qty || 1);

    const loc = FacilityStore.normalize(item.closetName || item.rackId);
    if (!closetBudgets[loc]) closetBudgets[loc] = { supply: 0, demand: 0 };

    if (item.role === "Access" || item.role === "Aggregation" || (item.model || '').includes("Switch")) {
      const units = (item.stackedUnits && item.stackedUnits >= 2) ? item.stackedUnits : (item.qty || 1);
      closetBudgets[loc].supply += (item.poeBudget || 0) * units;
    } else if (item.role !== "Structured Cabling" && item.role !== "Optics & DAC" && !item.role?.includes("License")) {
      const pwr = (typeof PortEngine !== "undefined") ? PortEngine.getDevicePowerSource(item) : (item.powerSource || "poe_switch");
      if (pwr === "poe_switch") {
        const draw = item.poeWattsDrawn || item.powerConsumptionWatts || item.baseWatts || 15;
        closetBudgets[loc].demand += draw * (item.qty || 1);
      }
    }
  });

  let topVendor = "Cisco";
  let topCount = 0;
  for (const [vnd, count] of Object.entries(vendorCounts)) {
    if (count > topCount) {
      topCount = count;
      topVendor = vnd;
    }
  }

  let maxDeficit = -1;
  let targetCloset = "MDF • Rack-1";
  for (const [loc, b] of Object.entries(closetBudgets)) {
    const deficit = b.demand - b.supply;
    if (deficit > maxDeficit) {
      maxDeficit = deficit;
      targetCloset = loc;
    }
  }
  if (typeof FacilityStore !== "undefined" && targetCloset === FacilityStore.UNASSIGNED) {
    targetCloset = "MDF • Rack-1";
  }

  const catalog = {
    "UniFi": {
      sku: "USW-Enterprise-24-PoE",
      model: "UniFi Enterprise 24-PoE 2.5G Managed Switch (400W PoE+)",
      vendor: "UniFi",
      poeBudget: 400,
      baseWatts: 50,
      ports: 24,
      msrp: 799
    },
    "Meraki": {
      sku: "MS130-24P-HW",
      model: "Cisco Meraki MS130-24P Cloud-Managed 24-Port Switch (370W PoE+)",
      vendor: "Meraki",
      poeBudget: 370,
      baseWatts: 45,
      ports: 24,
      msrp: 1495
    },
    "Ruckus": {
      sku: "ICX7150-24P-4X1G",
      model: "Ruckus ICX 7150 24-Port PoE+ Gigabit Switch (370W)",
      vendor: "Ruckus",
      poeBudget: 370,
      baseWatts: 45,
      ports: 24,
      msrp: 1395
    },
    "Juniper": {
      sku: "EX2300-24P",
      model: "Juniper EX2300 24-Port PoE+ Managed Switch (370W)",
      vendor: "Juniper",
      poeBudget: 370,
      baseWatts: 50,
      ports: 24,
      msrp: 1450
    },
    "Allied Telesis": {
      sku: "AT-x530-28GPXm",
      model: "Allied Telesis x530 24-Port Multi-Gigabit PoE+ Switch (370W)",
      vendor: "Allied Telesis",
      poeBudget: 370,
      baseWatts: 50,
      ports: 24,
      msrp: 1650
    },
    "AMG": {
      sku: "AMG200-24GAT-4SFP",
      model: "AMG 24-Port Industrial Managed PoE+ Switch (370W)",
      vendor: "AMG",
      poeBudget: 370,
      baseWatts: 45,
      ports: 24,
      msrp: 1250
    },
    "Cisco": {
      sku: "CBS350-24FP-4X",
      model: "Cisco Business 350 24-Port Full PoE+ Gigabit Managed Switch (370W)",
      vendor: "Cisco",
      poeBudget: 370,
      baseWatts: 45,
      ports: 24,
      msrp: 1150
    }
  };

  const rec = catalog[topVendor] || catalog["Cisco"];
  return {
    switchItem: rec,
    targetCloset: targetCloset,
    dominantVendor: topVendor
  };
}

function autoAddPoeSupplyOrSwitch() {
  if (typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) return;
  const rec = getContextAwarePoERecommendation();
  const sw = rec.switchItem;
  const targetLoc = rec.targetCloset;

  projectBOM.push({
    instanceId: `sw-poe-high-${Date.now()}`,
    id: sw.sku,
    model: sw.model,
    sku: sw.sku,
    role: "Access",
    vendor: sw.vendor,
    msrp: sw.msrp,
    ports: sw.ports || 24,
    poeBudget: sw.poeBudget || 370,
    baseWatts: sw.baseWatts || 45,
    rackUnits: 1,
    depthInches: 13.8,
    uplinkMode: "single",
    qty: 1,
    closetName: targetLoc,
    rackId: targetLoc,
    rackSlot: null
  });

  if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
    FacilityStore.notifyWorkspaceChange();
  }
  updateBOMView();
  updateProjectHealthUI();
  if (typeof showToast === "function") {
    showToast(`Added ${sw.vendor} ${sw.sku} (${sw.poeBudget}W PoE) to ${targetLoc} to resolve power deficit.`);
  }
}

function autoFixAllProjectMisses() {
  const audit = auditProjectHealth();
  if (audit.isHealthy) return;

  const hasUnassigned = audit.issues.some(i => i.id === "unassigned_equipment");
  const hasLicenses = audit.issues.some(i => i.id === "missing_licenses");
  const hasDAC = audit.issues.some(i => i.id === "missing_stack_dac");
  const hasPoE = audit.issues.some(i => i.id === "poe_deficit");
  const hasOutdoorCmp = audit.issues.some(i => i.id.startsWith("outdoor_jacket_violation_"));
  const hasMaglock = audit.issues.some(i => i.id.startsWith("level3_maglock_violation_"));
  const hasBtSurge = audit.issues.some(i => i.id.startsWith("outdoor_surge_bt_mismatch_"));
  const has10gCat6 = audit.issues.some(i => i.id.startsWith("10g_cat6_violation_"));
  const hasBet = audit.issues.some(i => i.id.startsWith("osp_50ft_building_entry_limit"));

  if (hasUnassigned) autoFixUnassignedGear();
  if (hasLicenses) autoAddMissingLicenses();
  if (hasDAC) autoAddMissingDACCables();
  if (hasPoE) autoAddPoeSupplyOrSwitch();
  if (hasOutdoorCmp) quickConvertToOutdoorCable('all_outdoor');
  if (hasMaglock) {
    const magIssues = audit.issues.filter(i => i.id.startsWith("level3_maglock_violation_"));
    magIssues.forEach(mi => quickSwitchToFailSecureLock(mi.id.replace("level3_maglock_violation_", "")));
  }
  if (hasBtSurge) quickAdd8023btSurgeProtector();
  if (has10gCat6) {
    const cat6Issues = audit.issues.filter(i => i.id.startsWith("10g_cat6_violation_"));
    cat6Issues.forEach(ci => quickUpgradeToCat6A(ci.id.replace("10g_cat6_violation_", "")));
  }
  if (hasBet) quickAddBuildingEntranceTerminal();
  const hasDualPsu = audit.issues.some(i => i.id.startsWith("switch_dual_psu_single_feed_"));
  if (hasDualPsu) {
    const psuIssues = audit.issues.filter(i => i.id.startsWith("switch_dual_psu_single_feed_"));
    psuIssues.forEach(pi => {
      quickAddSecondaryPdu(pi.closetName || "MDF • Rack-1");
    });
  }

  updateBOMView();
  updateProjectHealthUI();
  if (typeof showToast === "function") {
    showToast("1-Click Remediation Complete: All National Code, Orion Standards, and Manufacturer Conflicts resolved!");
  }
}

function quickConvertToOutdoorCable(targetId) {
  if (typeof projectBOM === "undefined") return;
  let count = 0;

  if (typeof facilityFloors !== "undefined" && Array.isArray(facilityFloors)) {
    facilityFloors.forEach(floor => {
      (floor.nodes || []).filter(n => n.type === "device" && (n.id === targetId || n.instanceId === targetId || targetId === 'all_outdoor')).forEach(dev => {
        dev.cableSku = "C6A-OUTDOOR-1K";
        dev.cableCategory = "Cat6A OSP Direct Burial (Gel-Filled)";
        dev.cableRating = "OSP";
        count++;
      });
    });
  }

  projectBOM.forEach(item => {
    if (item.instanceId === targetId || (targetId === 'all_outdoor' && item.outdoor)) {
      item.cableSku = "C6A-OUTDOOR-1K";
      item.cableRating = "OSP";
      count++;
    }
  });

  const hasSpool = projectBOM.some(i => i.sku === "C6A-OUTDOOR-1K" || (i.model || '').includes("OSP Direct Burial"));
  if (!hasSpool) {
    projectBOM.push({
      instanceId: `spool-osp-${Date.now()}`,
      id: "C6A-OUTDOOR-1K",
      sku: "C6A-OUTDOOR-1K",
      model: "Cat6A Shielded OSP Direct Burial / UV Outdoor Cable (1,000 ft Spool)",
      name: "Cat6A Shielded OSP Direct Burial / UV Outdoor Cable (1,000 ft Spool)",
      role: "Structured Cabling",
      category: "cabling",
      vendor: "Superior Essex",
      rating: "OSP",
      standard: "Cat6A",
      jacketType: "Outdoor / Direct Burial",
      msrp: 495,
      qty: 1,
      closetName: "MDF • Rack-1",
      rackId: "MDF • Rack-1",
      rackSlot: null
    });
  }

  if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
    FacilityStore.notifyWorkspaceChange();
  }
  updateBOMView();
  updateProjectHealthUI();
  if (typeof showToast === "function") {
    showToast(`Converted drop to Cat6A OSP Outdoor Gel-Filled Cable (NEC 300.9 & TOW Compliant).`);
  }
}

function quickSwitchToFailSecureLock(targetId) {
  if (typeof projectBOM === "undefined") return;

  if (typeof facilityFloors !== "undefined" && Array.isArray(facilityFloors)) {
    facilityFloors.forEach(floor => {
      (floor.nodes || []).filter(n => n.type === "device" && (n.id === targetId || n.instanceId === targetId)).forEach(dev => {
        dev.lockType = "fail_secure_mortise";
        dev.lockModel = "HES 9600 Heavy-Duty Fail-Secure Surface Windstorm Strike";
      });
    });
  }

  projectBOM.forEach(item => {
    if (item.instanceId === targetId || (item.model || '').toLowerCase().includes("maglock")) {
      item.model = "HES 9600 Series Heavy-Duty Fail-Secure Electric Strike (Windstorm & Fire-Rated)";
      item.sku = "HES-9600-630";
      item.failSecure = true;
      item.securityLevel = 3;
    }
  });

  if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
    FacilityStore.notifyWorkspaceChange();
  }
  updateBOMView();
  updateProjectHealthUI();
  if (typeof showToast === "function") {
    showToast(`Replaced Maglock with Fail-Secure Strike (TOW Egress & NFPA 101 Level 3 Compliant).`);
  }
}

function quickAdd8023btSurgeProtector(targetId) {
  if (typeof projectBOM === "undefined") return;

  const instId = `inst-surge-bt-${Date.now()}`;
  projectBOM.push({
    instanceId: instId,
    id: "SURGE-POE-BT90",
    sku: "SURGE-POE-BT90",
    model: "DITEK 802.3bt 90W Industrial Gas Discharge PoE Surge Protector (DIN/Wall, #10 AWG Ground)",
    name: "DITEK 802.3bt 90W Industrial Gas Discharge PoE Surge Protector",
    vendor: "DITEK",
    category: "accessories",
    role: "Surge Protection",
    poeStandard: "802.3bt",
    poeWattsMax: 90,
    groundWire: "#10 AWG Stranded Green",
    msrp: 95,
    qty: 1,
    closetName: "MDF • Rack-1",
    rackId: "MDF • Rack-1",
    rackSlot: null
  });

  if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
    FacilityStore.notifyWorkspaceChange();
  }
  updateBOMView();
  updateProjectHealthUI();
  if (typeof showToast === "function") {
    showToast(`Added DITEK 802.3bt 90W High-PoE Surge Protector (TOW Camera Standards Compliant).`);
  }
}

function quickUpgradeToCat6A(targetId) {
  if (typeof projectBOM === "undefined") return;

  projectBOM.forEach(item => {
    if (item.instanceId === targetId || (item.role === "Structured Cabling" && item.standard === "Cat6")) {
      item.sku = "C6A-CMP-1K-BL";
      item.model = "Cat6A F/UTP Plenum (CMP) Solid Bulk Cable (1,000 ft Spool Box, Blue)";
      item.standard = "Cat6A";
      item.msrp = 410;
    }
  });

  if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
    FacilityStore.notifyWorkspaceChange();
  }
  updateBOMView();
  updateProjectHealthUI();
  if (typeof showToast === "function") {
    showToast(`Upgraded link to Cat6A 10G-Certified (TOW Switch & Cabling Standards Compliant).`);
  }
}

function quickAddBuildingEntranceTerminal() {
  if (typeof projectBOM === "undefined") return;

  projectBOM.push({
    instanceId: `inst-bet-${Date.now()}`,
    id: "CIRC-BET-24P",
    sku: "CIRC-BET-24P",
    model: "Circa Building Entrance Terminal (BET) 24-Pair Gas Tube Transition Protector Enclosure",
    name: "Circa Building Entrance Terminal (BET) 24-Pair Gas Tube Transition Protector Enclosure",
    vendor: "Circa Telecom",
    category: "cabling",
    role: "Structured Cabling",
    standard: "NEC 800.100 Building Entrance Terminal",
    msrp: 385,
    qty: 1,
    closetName: "MDF • Rack-1",
    rackId: "MDF • Rack-1",
    rackSlot: null
  });

  if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
    FacilityStore.notifyWorkspaceChange();
  }
  updateBOMView();
  updateProjectHealthUI();
  if (typeof showToast === "function") {
    showToast(`Added Building Entrance Terminal Enclosure (NEC 800.100 Compliant).`);
  }
}

function quickAddSecondaryPdu(closetName) {
  if (typeof projectBOM === "undefined") return;
  const targetLoc = closetName || "MDF • Rack-1";
  const normLoc = (typeof FacilityStore !== "undefined") ? FacilityStore.normalize(targetLoc) : targetLoc;
  const existingPdus = projectBOM.filter(i => {
    if (i.parentInstanceId) return false;
    const itemLoc = (typeof FacilityStore !== "undefined") ? FacilityStore.normalize(i.closetName || i.rackId) : (i.closetName || i.rackId);
    return itemLoc === normLoc && ((i.role || '').toLowerCase().includes("pdu") || (i.category || '').toLowerCase().includes("pdu") || (i.model || '').toLowerCase().includes("pdu"));
  }).reduce((acc, p) => acc + (p.qty || 1), 0);

  const needed = Math.max(1, 2 - existingPdus);
  for (let i = 0; i < needed; i++) {
    const circuitLetter = (existingPdus + i === 0) ? "A" : "B";
    projectBOM.push({
      instanceId: `inst-pdu-${circuitLetter.toLowerCase()}-${Date.now()}-${i}`,
      id: `AP7552-CIRCUIT-${circuitLetter}`,
      sku: `AP7552-CIRCUIT-${circuitLetter}`,
      model: `APC Basic Rack PDU 16A 120V (Circuit ${circuitLetter} / UPS ${circuitLetter} Feed)`,
      name: `APC Basic Rack PDU 16A 120V (Circuit ${circuitLetter} / UPS ${circuitLetter} Feed)`,
      vendor: "APC by Schneider Electric",
      category: "power",
      role: "PDU",
      voltage: "120V",
      circuit: `Circuit ${circuitLetter} / UPS ${circuitLetter}`,
      msrp: 295,
      qty: 1,
      closetName: targetLoc,
      rackId: targetLoc,
      rackSlot: null
    });
  }

  if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
    FacilityStore.notifyWorkspaceChange();
  }
  updateBOMView();
  updateProjectHealthUI();
  if (typeof showToast === "function") {
    showToast(`Added Redundant A/B PDU Feeds to ${targetLoc} (TOW Switch Redundancy Compliant).`);
  }
}

// Window Compatibility Exports
window.auditProjectHealth = auditProjectHealth;
window.updateProjectHealthUI = updateProjectHealthUI;
window.toggleProjectHealthModal = toggleProjectHealthModal;
window.renderProjectHealthModal = renderProjectHealthModal;
window.setDrcActiveFilter = setDrcActiveFilter;
window.autoFixUnassignedGear = autoFixUnassignedGear;
window.autoAddMissingLicenses = autoAddMissingLicenses;
window.autoAddMissingDACCables = autoAddMissingDACCables;
window.autoAddPoeSupplyOrSwitch = autoAddPoeSupplyOrSwitch;
window.getContextAwarePoERecommendation = getContextAwarePoERecommendation;
window.autoFixAllProjectMisses = autoFixAllProjectMisses;
window.jumpToPhysicalLayoutFromHealth = jumpToPhysicalLayoutFromHealth;
window.openPortMatrixFromHealth = openPortMatrixFromHealth;
window.openRackFromHealth = openRackFromHealth;
window.autoAssignFloorDropToNearestCloset = autoAssignFloorDropToNearestCloset;
window.quickAddSwitchToCloset = quickAddSwitchToCloset;
window.quickAddPatchPanelToCloset = quickAddPatchPanelToCloset;
window.quickAddDefaultNvrServer = quickAddDefaultNvrServer;
window.quickAddDefaultAcsController = quickAddDefaultAcsController;
window.quickAddUpsToCloset = quickAddUpsToCloset;
window.quickAddEbpToCloset = quickAddEbpToCloset;
window.quickConvertToOutdoorCable = quickConvertToOutdoorCable;
window.quickSwitchToFailSecureLock = quickSwitchToFailSecureLock;
window.quickAdd8023btSurgeProtector = quickAdd8023btSurgeProtector;
window.quickUpgradeToCat6A = quickUpgradeToCat6A;
window.quickAddBuildingEntranceTerminal = quickAddBuildingEntranceTerminal;
window.quickAddSecondaryPdu = quickAddSecondaryPdu;

