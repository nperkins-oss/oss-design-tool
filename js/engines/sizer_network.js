// =========================================================================
// NETWORK SIZING & POE ENGINE (NetSelect Enterprise)
// Calibrated to IEEE 802.3af, 802.3at, 802.3bt (Type 3 & Type 4) Standards
// Certified Thermal Dissipation (BTU/hr) & Electrical Sizing (NEC / UPS VA)
// =========================================================================

/**
 * IEEE 802.3 PoE Standards Specifications & Constants
 * Accounts for Worst-Case 100m Cat5e/Cat6 Ohmic Cable Resistance Losses
 */
const IEEE_POE_STANDARDS = {
  af: {
    key: "af",
    standard: "IEEE 802.3af (PoE Type 1)",
    type: 1,
    pseMaxWatts: 15.40,      // Max continuous power delivered at switch PSE port
    pdMaxWatts: 12.95,       // Max guaranteed power received at Powered Device after 100m loop
    cableLossWatts: 2.45,    // Worst-case Cat5e/Cat6 heat dissipation along run (15.4 - 12.95)
    minVoltage: 44.0,        // PSE minimum output voltage
    maxVoltage: 57.0,
    poweredPairs: 2,         // Uses 2 pairs (12/36 or 45/78)
    typicalDevices: "Basic VoIP phones, fixed indoor mini-domes, IoT sensors",
    classes: [0, 1, 2, 3]
  },
  at: {
    key: "at",
    standard: "IEEE 802.3at (PoE+ Type 2)",
    type: 2,
    pseMaxWatts: 30.00,      // Max power delivered at switch PSE port
    pdMaxWatts: 25.50,       // Max guaranteed power received at PD
    cableLossWatts: 4.50,    // Worst-case cable loss (30.0 - 25.5)
    minVoltage: 50.0,
    maxVoltage: 57.0,
    poweredPairs: 2,
    typicalDevices: "Outdoor IP cameras w/ IR LEDs, PTZ domes, Wi-Fi 6 APs, Video intercoms",
    classes: [4]
  },
  bt60: {
    key: "bt60",
    standard: "IEEE 802.3bt Type 3 (4PPoE 60W)",
    type: 3,
    pseMaxWatts: 60.00,      // Max power delivered at switch PSE port
    pdMaxWatts: 51.00,       // Max guaranteed power received at PD
    cableLossWatts: 9.00,    // Cable loss across all 4 pairs
    minVoltage: 50.0,
    maxVoltage: 57.0,
    poweredPairs: 4,         // Uses all 4 pairs
    typicalDevices: "Multi-sensor 180/360 panoramic cameras, Wi-Fi 6E/7 APs, Access controllers w/ strike locks",
    classes: [5, 6]
  },
  bt90: {
    key: "bt90",
    standard: "IEEE 802.3bt Type 4 (4PPoE 90W)",
    type: 4,
    pseMaxWatts: 90.00,      // Max power delivered at switch PSE port
    pdMaxWatts: 71.30,       // Max guaranteed power received at PD
    cableLossWatts: 18.70,   // Cable loss across all 4 pairs
    minVoltage: 52.0,
    maxVoltage: 57.0,
    poweredPairs: 4,
    typicalDevices: "High-speed outdoor PTZs with blowers/heaters, Smart digital signage, High-power PoE lighting",
    classes: [7, 8]
  }
};

/**
 * Universal Electrical & Thermal Conversion Constants
 */
const ELECTRICAL_CONSTANTS = {
  BTU_PER_WATT_HOUR: 3.412142,        // 1 Watt continuous = 3.412142 BTU/hr
  BTU_PER_COOLING_TON: 12000,         // 1 Ton of AC capacity = 12,000 BTU/hr
  DEFAULT_POWER_FACTOR: 0.92,         // Typical Active PFC IT Power Supply (0.90 - 0.95)
  DEFAULT_PSU_EFFICIENCY: 0.90,       // 80 PLUS Platinum / Gold efficiency (~90% efficient)
  NEC_CONTINUOUS_DERATING: 0.80,      // National Electrical Code continuous load limit (80% breaker rating)
  DEFAULT_HEADROOM_PERCENT: 20        // Standard 20% engineering buffer for growth & degradation
};

/**
 * Master Network Sizer & PoE Calculation Engine
 */
const NetworkSizer = {
  STANDARDS: IEEE_POE_STANDARDS,
  CONSTANTS: ELECTRICAL_CONSTANTS,

  /**
   * Calculates comprehensive PoE sizing targets and engineering metrics
   * @param {Object} demand - Count of connected devices by PoE standard { af, at, bt60, bt90 }
   * @param {Object} options - Sizing configuration { headroomPercent, diversityFactor }
   * @returns {Object} Comprehensive calculation model
   */
  calculatePoEPlan(demand = {}, options = {}) {
    const afCount = Math.max(0, parseInt(demand.af, 10) || 0);
    const atCount = Math.max(0, parseInt(demand.at, 10) || 0);
    const bt60Count = Math.max(0, parseInt(demand.bt60, 10) || 0);
    const bt90Count = Math.max(0, parseInt(demand.bt90, 10) || 0);

    const headroomPercent = typeof options.headroomPercent === "number" ? options.headroomPercent : ELECTRICAL_CONSTANTS.DEFAULT_HEADROOM_PERCENT;
    const diversityFactor = typeof options.diversityFactor === "number" ? options.diversityFactor : 1.0; // 100% duty cycle for security cameras

    // Total Port Demands
    const totalDevices = afCount + atCount + bt60Count + bt90Count;
    const totalBtDevices = bt60Count + bt90Count;
    const bt90Devices = bt90Count;

    // PSE Wattage Delivered by Switch
    const pseAf = afCount * IEEE_POE_STANDARDS.af.pseMaxWatts;
    const pseAt = atCount * IEEE_POE_STANDARDS.at.pseMaxWatts;
    const pseBt60 = bt60Count * IEEE_POE_STANDARDS.bt60.pseMaxWatts;
    const pseBt90 = bt90Count * IEEE_POE_STANDARDS.bt90.pseMaxWatts;
    const rawWattsPSE = pseAf + pseAt + pseBt60 + pseBt90;

    // PD Wattage Consumed at the End Devices
    const pdAf = afCount * IEEE_POE_STANDARDS.af.pdMaxWatts;
    const pdAt = atCount * IEEE_POE_STANDARDS.at.pdMaxWatts;
    const pdBt60 = bt60Count * IEEE_POE_STANDARDS.bt60.pdMaxWatts;
    const pdBt90 = bt90Count * IEEE_POE_STANDARDS.bt90.pdMaxWatts;
    const rawWattsPD = pdAf + pdAt + pdBt60 + pdBt90;

    // Estimated Ohmic Cable Heat Loss
    const estimatedCableLossWatts = Math.round((rawWattsPSE - rawWattsPD) * 10) / 10;

    // Continuous Operating PSE Wattage (incorporating diversity factor)
    const continuousWattsPSE = Math.round(rawWattsPSE * diversityFactor * 10) / 10;

    // Required Switch PoE Budget with Engineering Headroom
    const factor = 1 + (headroomPercent / 100);
    const budgetWithHeadroom = Math.ceil(continuousWattsPSE * factor);
    const headroomWatts = Math.max(0, budgetWithHeadroom - continuousWattsPSE);

    return {
      totalDevices,
      totalBtDevices,
      bt90Devices,
      rawWattsPSE: Math.round(rawWattsPSE * 10) / 10,
      rawWattsPD: Math.round(rawWattsPD * 10) / 10,
      estimatedCableLossWatts,
      continuousWattsPSE,
      budgetWithHeadroom,
      headroomWatts,
      headroomPercent,
      diversityFactor,
      demandCounts: {
        af: afCount,
        at: atCount,
        bt60: bt60Count,
        bt90: bt90Count
      },
      breakdown: {
        af: { count: afCount, pseWatts: pseAf, pdWatts: pdAf },
        at: { count: atCount, pseWatts: pseAt, pdWatts: pdAt },
        bt60: { count: bt60Count, pseWatts: pseBt60, pdWatts: pdBt60 },
        bt90: { count: bt90Count, pseWatts: pseBt90, pdWatts: pdBt90 }
      }
    };
  },

  /**
   * Audits whether a switch candidate satisfies a specified PoE plan
   * @param {Object} sw - Switch catalog item
   * @param {Object} poePlan - Result from calculatePoEPlan()
   * @returns {Object} { fits: boolean, reasons: string[] }
   */
  auditSwitchFit(sw, poePlan) {
    if (!sw || !poePlan) return { fits: true, reasons: [] };
    if (poePlan.totalDevices === 0) return { fits: true, reasons: [] };

    const reasons = [];

    // 1. Available Downlink PoE Ports Check
    let totalPoEPorts = 0;
    if (typeof sw.poePorts === "number" && sw.poePorts > 0) {
      totalPoEPorts = sw.poePorts;
    } else {
      const explicitSum = (sw.poeAfPorts || 0) + (sw.poeAtPorts || 0) + (sw.poeBt60Ports || 0) + (sw.poeBt90Ports || 0);
      if (explicitSum > 0) {
        totalPoEPorts = explicitSum;
      } else {
        // Fallback to switch copper downlink ports
        let downlinks = parseInt(sw.ports, 10) || 0;
        if (sw.portCategory === "48") downlinks = 48;
        else if (sw.portCategory === "24") downlinks = 24;
        else if (sw.portCategory === "16") downlinks = 16;
        else if (sw.portCategory === "compact") downlinks = Math.min(downlinks, 10);
        totalPoEPorts = downlinks;
      }
    }

    if (totalPoEPorts < poePlan.totalDevices) {
      reasons.push(`Insufficient PoE ports: Switch has ${totalPoEPorts} PoE ports, but demand requires ${poePlan.totalDevices} ports.`);
    }

    // 2. Continuous PoE Budget Check
    const switchPoEBudget = parseFloat(sw.poeBudget || 0);
    if (switchPoEBudget < poePlan.budgetWithHeadroom) {
      reasons.push(`Insufficient PoE budget: Switch provides ${switchPoEBudget}W, but demand requires ${poePlan.budgetWithHeadroom}W (incl. +${poePlan.headroomPercent}% headroom).`);
    }

    // 3. High-Power 90W bt (Type 4) Port Count Check
    if (poePlan.bt90Devices > 0) {
      const switchBt90Ports = parseInt(sw.poeBt90Ports, 10) || 0;
      if (switchBt90Ports < poePlan.bt90Devices) {
        reasons.push(`Insufficient 90W bt ports: Switch provides ${switchBt90Ports}x 90W ports, but demand requires ${poePlan.bt90Devices}x.`);
      }
    }

    // 4. Combined 60W / 90W bt Port Count Check
    if (poePlan.totalBtDevices > 0) {
      const switchTotalBt = (parseInt(sw.poeBt60Ports, 10) || 0) + (parseInt(sw.poeBt90Ports, 10) || 0);
      if (switchTotalBt < poePlan.totalBtDevices) {
        reasons.push(`Insufficient 60W/90W bt ports: Switch provides ${switchTotalBt}x bt ports, but demand requires ${poePlan.totalBtDevices}x.`);
      }
    }

    return {
      fits: reasons.length === 0,
      reasons
    };
  },

  /**
   * Calculates electrical load, thermal dissipation, circuit breaker rating, and UPS VA sizing
   * @param {Array} rackItems - Hardware items mounted or assigned to the rack
   * @param {Object} options - Configuration overrides
   * @returns {Object} Electrical and thermal audit report
   */
  calculateRackElectricalAndThermal(rackItems = [], options = {}) {
    const nominalVoltage = options.nominalVoltage || 120; // 120V or 208V
    const powerFactor = options.powerFactor || ELECTRICAL_CONSTANTS.DEFAULT_POWER_FACTOR;
    const psuEfficiency = options.psuEfficiency || ELECTRICAL_CONSTANTS.DEFAULT_PSU_EFFICIENCY;
    const growthMargin = typeof options.growthMargin === "number" ? options.growthMargin : 0.25; // 25% UPS runtime margin

    let occupiedU = 0;
    let chassisBaseWatts = 0;
    let nameplatePoEWatts = 0;
    let connectedPoEWatts = 0;
    let directAcNameplateWatts = 0;

    rackItems.forEach(item => {
      if (!item) return;
      const qty = parseInt(item.qty, 10) || 1;
      const isStacked = item.stackedUnits && item.stackedUnits >= 2;
      const effectiveUnits = isStacked ? Math.max(item.stackedUnits, qty) : qty;

      // Track occupied RU
      if (item.rackSlot) {
        occupiedU += ((parseInt(item.rackUnits, 10) || 1) * effectiveUnits);
      }

      // Base internal chassis power draw (without PoE load)
      const base = parseFloat(item.baseWatts) || 0;
      chassisBaseWatts += (base * effectiveUnits);

      // Maximum rated PoE power supply budget
      const poeBudget = parseFloat(item.poeBudget) || 0;
      nameplatePoEWatts += (poeBudget * effectiveUnits);

      // Connected field devices PoE draw (if populated by BOM audit)
      const connectedPoE = parseFloat(item.consumedPoEWatts) || 0;
      connectedPoEWatts += connectedPoE;

      // Check if manufacturer specified an explicit maximum wall power draw (AC)
      if (item.maxPowerWatts && parseFloat(item.maxPowerWatts) > 0) {
        directAcNameplateWatts += (parseFloat(item.maxPowerWatts) * effectiveUnits);
      } else {
        // Calculate AC draw incorporating internal PSU AC-to-DC conversion loss
        const calculatedAc = base + (poeBudget / psuEfficiency);
        directAcNameplateWatts += (calculatedAc * effectiveUnits);
      }
    });

    // 1. Worst-Case Nameplate Load (All switches operating at 100% full PoE budget capacity)
    const worstCaseAcWatts = Math.round(directAcNameplateWatts);

    // 2. Projected Design Operating Load (Base chassis power + actual connected PoE devices with PSU conversion loss)
    const operatingAcWatts = Math.round(chassisBaseWatts + (connectedPoEWatts > 0 ? (connectedPoEWatts / psuEfficiency) : 0));

    // 3. Thermal Dissipation (BTU/hr)
    const worstCaseBTU = Math.round(worstCaseAcWatts * ELECTRICAL_CONSTANTS.BTU_PER_WATT_HOUR);
    const operatingBTU = Math.round(operatingAcWatts * ELECTRICAL_CONSTANTS.BTU_PER_WATT_HOUR);
    const tonsCooling = Math.round((worstCaseBTU / ELECTRICAL_CONSTANTS.BTU_PER_COOLING_TON) * 10) / 10;

    // 4. Electrical Current & Circuit Breaker Amperage
    const worstCaseAmps120V = Math.round((worstCaseAcWatts / (120 * powerFactor)) * 10) / 10;
    const operatingAmps120V = Math.round((operatingAcWatts / (120 * powerFactor)) * 10) / 10;
    const worstCaseAmps208V = Math.round((worstCaseAcWatts / (208 * powerFactor)) * 10) / 10;
    const operatingAmps208V = Math.round((operatingAcWatts / (208 * powerFactor)) * 10) / 10;

    // Circuit Recommendation (NEC 80% continuous rule: Breaker Amps * 0.80)
    let recommendedCircuit = "120V 15A Dedicated Circuit (NEMA 5-15R)";
    let circuitUtilization = 0;

    if (worstCaseAcWatts > 3300) {
      recommendedCircuit = "208V 30A Dedicated Circuit (NEMA L6-30R)";
      circuitUtilization = Math.round((worstCaseAcWatts / (208 * 30 * ELECTRICAL_CONSTANTS.NEC_CONTINUOUS_DERATING)) * 100);
    } else if (worstCaseAcWatts > 1920) {
      recommendedCircuit = "120V 30A Dedicated Circuit (NEMA L5-30R) or 208V 20A";
      circuitUtilization = Math.round((worstCaseAcWatts / (120 * 30 * ELECTRICAL_CONSTANTS.NEC_CONTINUOUS_DERATING)) * 100);
    } else if (worstCaseAcWatts > 1440) {
      recommendedCircuit = "120V 20A Dedicated Circuit (NEMA 5-20R)";
      circuitUtilization = Math.round((worstCaseAcWatts / (120 * 20 * ELECTRICAL_CONSTANTS.NEC_CONTINUOUS_DERATING)) * 100);
    } else {
      recommendedCircuit = "120V 15A Dedicated Circuit (NEMA 5-15R)";
      circuitUtilization = Math.round((worstCaseAcWatts / (120 * 15 * ELECTRICAL_CONSTANTS.NEC_CONTINUOUS_DERATING)) * 100);
    }

    // 5. UPS Sizing Engine (calibrated with calculateUPSPlan)
    const minVA = Math.round(worstCaseAcWatts / powerFactor);
    const recommendedVA = Math.round(minVA * (1 + growthMargin));

    const upsPlan = this.calculateUPSPlan(rackItems, {
      targetRuntimeMinutes: options.targetRuntimeMinutes || 15,
      safetyMargin: options.safetyMargin || 0.75,
      preferredVoltage: nominalVoltage,
      selectedModelSku: options.selectedModelSku || "auto"
    });

    const upsRecommendation = `${upsPlan.upsQty}x ${upsPlan.upsModel.model}`;
    const upsFormFactor = `${upsPlan.rackSpace.totalRU}U Total (${upsPlan.upsQty}x ${upsPlan.upsModel.rackUnits || 2}U UPS${upsPlan.totalEbpQty > 0 ? ` + ${upsPlan.totalEbpQty}x ${upsPlan.upsModel.ebpRackHeight || 2}U EBP` : ''})`;
    const batteryRuntimeEstimate = `${upsPlan.achievedRuntime} minutes (${upsPlan.internalRuntime}m internal${upsPlan.totalEbpQty > 0 ? ` + ${upsPlan.totalEbpQty}x EBP` : ''})`;

    return {
      occupiedU,
      chassisBaseWatts: Math.round(chassisBaseWatts),
      nameplatePoEWatts: Math.round(nameplatePoEWatts),
      connectedPoEWatts: Math.round(connectedPoEWatts),
      worstCaseAcWatts,
      operatingAcWatts,
      worstCaseBTU,
      operatingBTU,
      tonsCooling,
      electrical: {
        voltage: nominalVoltage,
        powerFactor,
        worstCaseAmps120V,
        operatingAmps120V,
        worstCaseAmps208V,
        operatingAmps208V,
        recommendedCircuit,
        circuitUtilization
      },
      ups: {
        minVA,
        recommendedVA,
        recommendation: upsRecommendation,
        formFactor: upsFormFactor,
        batteryRuntimeEstimate,
        plan: upsPlan
      }
    };
  },

  /**
   * Rigorous BOM Switch Capacity & Downlink/PoE Auditing Engine
   * Validates port exhaustion, PoE budget overloads, secondary PSUs, and standard compatibility
   * @param {Array} projectBOM - Active project Bill of Materials
   * @param {Object} options - { extraHeadroomPercent }
   * @returns {Object} Map of switch audits indexed by switch instanceId
   */
  auditBOMCapacities(projectBOM = [], options = {}) {
    const switchAudits = {};
    if (!Array.isArray(projectBOM)) return switchAudits;

    const headroomPercent = typeof options.extraHeadroomPercent === "number" ? options.extraHeadroomPercent : ELECTRICAL_CONSTANTS.DEFAULT_HEADROOM_PERCENT;
    const headroomFactor = 1 + (headroomPercent / 100);

    // 1. Initialize Master Switch Hosts
    projectBOM.filter(i => i && !i.parentInstanceId && (i.role === "Access" || i.role === "Core" || i.role === "Aggregation")).forEach(sw => {
      let switchPorts = parseInt(sw.ports, 10);
      if (!switchPorts || isNaN(switchPorts)) {
        const dbEntry = (typeof CatalogRegistry !== "undefined" ? CatalogRegistry.get(sw.id || sw.sku) : null);
        switchPorts = dbEntry ? dbEntry.ports : 24;
        sw.ports = switchPorts;
      }

      let switchPoE = parseInt(sw.poeBudget, 10);
      if (isNaN(switchPoE)) {
        const dbEntry = (typeof CatalogRegistry !== "undefined" ? CatalogRegistry.get(sw.id || sw.sku) : null);
        switchPoE = dbEntry ? dbEntry.poeBudget : 0;
        sw.poeBudget = switchPoE;
      }

      // Check for attached child power supplies (2nd redundant PSU or external brick)
      let secondaryPsuInstalled = false;
      let externalPsuInstalled = false;
      let expandedPoEBudget = switchPoE;

      projectBOM.filter(ch => ch.parentInstanceId === sw.instanceId && ch.role === "Power Supply").forEach(psu => {
        if (psu.instanceId && psu.instanceId.startsWith("psu2-")) {
          secondaryPsuInstalled = true;
          // In modular combined/sharing mode, secondary PSU adds PoE headroom
          if (typeof POWER_SUPPLY_CATALOG !== "undefined" && POWER_SUPPLY_CATALOG[psu.sku]) {
            const psuDef = POWER_SUPPLY_CATALOG[psu.sku];
            if (psuDef.poeBudgetContribution) {
              expandedPoEBudget = Math.min(1440, switchPoE + psuDef.poeBudgetContribution);
            }
          }
        } else if (psu.instanceId && psu.instanceId.startsWith("psu-ext-")) {
          externalPsuInstalled = true;
          if (typeof POWER_SUPPLY_CATALOG !== "undefined" && POWER_SUPPLY_CATALOG[psu.sku]) {
            const psuDef = POWER_SUPPLY_CATALOG[psu.sku];
            if (psuDef.poeBudgetContribution) {
              expandedPoEBudget = psuDef.poeBudgetContribution;
              sw.poeBudget = expandedPoEBudget;
            }
          }
        }
      });

      // Standards normalization
      const standardsSupported = Array.isArray(sw.poeStandardsSupported) ? [...sw.poeStandardsSupported] : [];
      if (standardsSupported.length === 0 && switchPoE > 0) {
        standardsSupported.push("802.3af", "802.3at");
        if (sw.poeBt90Ports > 0) standardsSupported.push("802.3bt-Type4");
        else if (sw.poeBt60Ports > 0) standardsSupported.push("802.3bt-Type3");
      }

      const qty = parseInt(sw.qty, 10) || 1;

      switchAudits[sw.instanceId] = {
        instanceId: sw.instanceId,
        id: sw.id,
        sku: sw.sku,
        model: sw.model || "Unknown Switch",
        vendor: sw.vendor || "Generic",
        role: sw.role,
        totalPorts: switchPorts * qty,
        usedDownlinkPorts: 0,
        basePoEBudget: switchPoE * qty,
        totalPoEBudget: expandedPoEBudget * qty,
        consumedPoEWatts: 0,
        rawDeviceWatts: 0,
        poeStandardsSupported: standardsSupported,
        poeBt60Ports: (parseInt(sw.poeBt60Ports, 10) || 0) * qty,
        poeBt90Ports: (parseInt(sw.poeBt90Ports, 10) || 0) * qty,
        usedBt60Ports: 0,
        usedBt90Ports: 0,
        secondaryPsuInstalled,
        externalPsuInstalled,
        uplinkPortsTotal: (parseInt(sw.uplinkPortCount, 10) || 4) * qty,
        uplinkPortsUsed: 0,
        connectedDevices: [],
        alerts: []
      };
    });

    // 2. Map Connected Devices & Tally Real-World PoE Wattage
    projectBOM.forEach(item => {
      if (!item || item.parentInstanceId || !item.uplinkTargetId) return;

      const host = switchAudits[item.uplinkTargetId];
      if (!host) return;

      const qty = parseInt(item.qty, 10) || 1;

      if (item.role === "Access") {
        // Switch-to-switch aggregation or distribution uplink
        const isDual = item.uplinkMode === "lag_dual" || (item.stackedUnits && item.stackedUnits >= 2);
        const linksUsed = isDual ? 2 : 1;
        host.usedDownlinkPorts += linksUsed;
        host.connectedDevices.push(`${item.model} (${linksUsed}x ${isDual ? 'LACP LAG' : 'Uplink'})`);
      } else {
        // Edge client device (camera, AP, access controller, intercom)
        host.usedDownlinkPorts += qty;

        if (item.powerSource === "poe_switch" || (!item.powerSource && (item.poeStandard || item.poeWattsDrawn || item.powerConsumptionWatts))) {
          // Determine device rated maximum operating wattage
          let deviceWattage = 15.0; // default 802.3af baseline
          if (item.powerConsumptionWatts && parseFloat(item.powerConsumptionWatts) > 0) {
            deviceWattage = parseFloat(item.powerConsumptionWatts);
          } else if (item.maxPowerWatts && parseFloat(item.maxPowerWatts) > 0) {
            deviceWattage = parseFloat(item.maxPowerWatts);
          } else if (item.powerWatts && parseFloat(item.powerWatts) > 0) {
            deviceWattage = parseFloat(item.powerWatts);
          } else if (item.poeWattsDrawn && parseFloat(item.poeWattsDrawn) > 0) {
            deviceWattage = parseFloat(item.poeWattsDrawn);
          } else if (item.baseWatts && parseFloat(item.baseWatts) > 0) {
            deviceWattage = parseFloat(item.baseWatts);
          }

          const rawTotalItemWatts = deviceWattage * qty;
          host.rawDeviceWatts += rawTotalItemWatts;

          // Apply engineering headroom buffer
          const itemWattsWithHeadroom = Math.ceil(rawTotalItemWatts * headroomFactor);
          host.consumedPoEWatts += itemWattsWithHeadroom;

          // Standard compliance audit
          const reqStandard = item.poeStandardRequired || item.poeStandard || (deviceWattage > 30 ? (deviceWattage > 60 ? "802.3bt-Type4" : "802.3bt-Type3") : (deviceWattage > 15.4 ? "802.3at" : "802.3af"));

          if (reqStandard === "802.3bt-Type4" || reqStandard === "802.3bt-90") {
            host.usedBt90Ports += qty;
            if (host.poeBt90Ports > 0 && host.usedBt90Ports > host.poeBt90Ports) {
              host.alerts.push(`90W Port Exhaustion: ${host.usedBt90Ports}/${host.poeBt90Ports} 90W bt ports utilized.`);
            }
            if (!host.poeStandardsSupported.some(s => s.includes("bt-Type4") || s.includes("UPOE+") || s.includes("90W"))) {
              host.alerts.push(`Standard Mismatch: "${item.model}" requires 90W bt (Type 4), switch does not support 90W.`);
            }
          } else if (reqStandard === "802.3bt-Type3" || reqStandard === "802.3bt-60") {
            host.usedBt60Ports += qty;
            const availableBt = host.poeBt60Ports + host.poeBt90Ports;
            if (availableBt > 0 && (host.usedBt60Ports + host.usedBt90Ports) > availableBt) {
              host.alerts.push(`High-Power bt Port Exhaustion: ${host.usedBt60Ports + host.usedBt90Ports}/${availableBt} bt ports utilized.`);
            }
            if (!host.poeStandardsSupported.some(s => s.includes("bt") || s.includes("UPOE") || s.includes("PoH"))) {
              host.alerts.push(`Standard Mismatch: "${item.model}" requires 60W bt, switch only supports 30W at.`);
            }
          } else if (reqStandard && (reqStandard.includes("Passive") || reqStandard.includes("passive"))) {
            if (!host.poeStandardsSupported.some(s => s.toLowerCase().includes("passive"))) {
              host.alerts.push(`Passive PoE Alert: "${item.model}" requires passive PoE. Ensure passive PoE adapter/injector is quoted.`);
            }
          }

          host.connectedDevices.push(`${item.model} (${qty}x port &bull; ${Math.round(deviceWattage)}W)`);
        } else {
          host.connectedDevices.push(`${item.model} (${qty}x port &bull; Local Power)`);
        }
      }
    });

    // 3. Evaluate Overload Warnings
    Object.values(switchAudits).forEach(audit => {
      if (audit.totalPorts > 0 && audit.usedDownlinkPorts > audit.totalPorts) {
        audit.alerts.push(`Port Exhaustion: ${audit.usedDownlinkPorts}/${audit.totalPorts} ports assigned!`);
      }
      if (audit.totalPoEBudget > 0 && audit.consumedPoEWatts > audit.totalPoEBudget) {
        const overWatts = audit.consumedPoEWatts - audit.totalPoEBudget;
        audit.alerts.push(`PoE Overload: ${audit.consumedPoEWatts}W required (+${headroomPercent}% buffer), budget is ${audit.totalPoEBudget}W (+${overWatts}W overload)!`);
      }
    });

    return switchAudits;
  },

  /**
   * Enterprise UPS & Power Sizing Engine (derived from Orion Power Calculator v6.3)
   * Calibrated with 26 enterprise UPS models, Extended Battery Packs (EBPs), and Rack PDUs.
   *
   * @param {Array|number} rackItemsOrWatts - Rack BOM equipment or direct wattage
   * @param {Object} options - { targetRuntimeMinutes, safetyMargin, preferredVoltage, selectedModelSku }
   * @returns {Object} Comprehensive power sizing, runtime, circuit loading, and outlet plan
   */
  calculateUPSPlan(rackItemsOrWatts = [], options = {}) {
    let worstCaseWatts = 0;
    let operatingWatts = 0;
    let totalBaseWatts = 0;
    let totalPoEWatts = 0;
    const equipmentPlugs = [];

    if (typeof rackItemsOrWatts === "number") {
      worstCaseWatts = rackItemsOrWatts;
      operatingWatts = Math.round(rackItemsOrWatts * 0.85);
    } else if (Array.isArray(rackItemsOrWatts)) {
      rackItemsOrWatts.forEach(it => {
        if (!it) return;
        const units = (it.stackedUnits && it.stackedUnits >= 2) ? it.stackedUnits : (parseInt(it.qty, 10) || 1);
        const base = parseFloat(it.baseWatts || 0);
        const poe = parseFloat(it.poeBudget || it.consumedPoEWatts || 0);
        totalBaseWatts += (base * units);
        totalPoEWatts += (poe * units);

        // Detect equipment plug
        const plug = (it.equipmentPlug || it.plugType || (it.powerSupplyVoltages?.includes("240") ? "C14" : (base + poe > 1400 ? "5-20P" : "5-15P")));
        for (let u = 0; u < units; u++) {
          equipmentPlugs.push({ model: it.model || it.name, plug });
        }
      });
      worstCaseWatts = Math.round(totalBaseWatts + totalPoEWatts);
      operatingWatts = Math.round(totalBaseWatts + (totalPoEWatts * 0.5));
    }

    if (worstCaseWatts <= 0) worstCaseWatts = 300; // minimum baseline if empty
    if (operatingWatts <= 0) operatingWatts = Math.round(worstCaseWatts * 0.7);

    const targetRuntime = options.targetRuntimeMinutes || 15;
    const safetyMargin = options.safetyMargin || 0.75;
    const preferredVoltage = options.preferredVoltage || 120;
    const selectedModelSku = options.selectedModelSku || "auto";
    const loadMode = options.loadMode || "connected"; // "connected" | "nameplate"
    const agingFactor = typeof options.agingFactor === "number" ? options.agingFactor : 0.85; // IEEE 1188 battery end-of-life derate (0.85 default, 1.0 new)
    const connectedWatts = options.connectedWatts && options.connectedWatts > 0 ? Math.round(options.connectedWatts) : operatingWatts;

    // Determine load wattage used specifically for battery runtime curves
    const runtimeLoadWatts = (loadMode === "connected" && connectedWatts > 0) ? connectedWatts : worstCaseWatts;

    // Gather available enterprise UPS catalog
    let upsCatalog = [];
    if (typeof CatalogRegistry !== "undefined" && CatalogRegistry.infrastructure && Array.isArray(CatalogRegistry.infrastructure.ups)) {
      upsCatalog = CatalogRegistry.infrastructure.ups.filter(u => (u.type === "ups" || u.category === "ups") && !u.isEbp && !u.isPdu);
    }
    if (upsCatalog.length === 0 && typeof ACCESSORY_DATABASE !== "undefined") {
      upsCatalog = ACCESSORY_DATABASE.filter(u => (u.type === "ups" || u.category === "ups") && !u.isEbp && !u.isPdu);
    }

    // Candidate selection
    let selectedUnit = null;
    if (selectedModelSku !== "auto") {
      selectedUnit = upsCatalog.find(u => u.sku === selectedModelSku || u.id === selectedModelSku);
    }

    if (!selectedUnit) {
      // Auto-recommend optimal UPS based on preferred voltage and capacity
      const voltageCandidates = upsCatalog.filter(u => {
        const v = u.outputVoltage || u.inputVoltage || 120;
        return preferredVoltage >= 208 ? (v >= 200) : (v <= 130);
      });
      const pool = voltageCandidates.length > 0 ? voltageCandidates : upsCatalog;

      // Find smallest capacity unit that satisfies: capacity * safetyMargin >= worstCaseWatts
      const fitUnits = pool.filter(u => ((u.powerWatts || u.maxCapacityWatts || 1000) * safetyMargin) >= worstCaseWatts);
      if (fitUnits.length > 0) {
        fitUnits.sort((a, b) => (a.powerWatts || a.maxCapacityWatts || 1000) - (b.powerWatts || b.maxCapacityWatts || 1000));
        selectedUnit = fitUnits[0];
      } else {
        // Find highest capacity unit in pool to minimize unit count
        const sortedDesc = [...pool].sort((a, b) => (b.powerWatts || b.maxCapacityWatts || 1000) - (a.powerWatts || a.maxCapacityWatts || 1000));
        selectedUnit = sortedDesc[0] || pool[0];
      }
    }

    if (!selectedUnit) {
      // Absolute fallback if database somehow unavailable
      selectedUnit = {
        id: "tripplite-smart2200rmxl2u",
        sku: "SMART2200RMXL2U",
        model: "Tripp Lite SMART2200RMXL2U (2200VA/1950W 2U)",
        name: "Tripp Lite SMART2200RMXL2U (2200VA/1950W 2U)",
        vendor: "Tripp Lite",
        rackUnits: 2,
        msrp: 1199,
        va: 2200,
        powerWatts: 1950,
        maxCapacityWatts: 1950,
        inputVoltage: 120,
        outputVoltage: 120,
        inputCircuitAmps: 20,
        inputConnector: "L5-20P",
        receptacles: "4x 5-15R, 4x 5-20R",
        internalRuntimeFullLoad: 4.5,
        internalRuntimeHalfLoad: 12.0,
        ebpModel: "BP72VRM2U",
        ebpRackHeight: 2,
        ebpRuntimeFullLoad: 35.0,
        ebpRuntimeHalfLoad: 78.0,
        topology: "Line-Interactive Pure Sine Wave"
      };
    }

    const unitCapacity = selectedUnit.powerWatts || selectedUnit.maxCapacityWatts || 1000;
    const effectiveCapPerUnit = unitCapacity * safetyMargin;
    const upsQty = Math.max(1, Math.ceil(worstCaseWatts / effectiveCapPerUnit));

    // Electrical load fraction for breaker and capacity
    const loadPerUnit = Math.round(worstCaseWatts / upsQty);
    const loadFraction = Math.min(1.0, loadPerUnit / unitCapacity);
    const loadPercent = Math.round(loadFraction * 100);

    // Active load fraction specifically for battery discharge calculations
    const runtimeLoadPerUnit = Math.round(runtimeLoadWatts / upsQty);
    const runtimeLoadFraction = Math.min(1.0, Math.max(0.04, runtimeLoadPerUnit / unitCapacity));
    const runtimeLoadPercent = Math.round(runtimeLoadFraction * 100);

    // Internal Battery Runtime (Calibrated discharge curve with low-load Peukert expansion & IEEE aging derate)
    const rFull = selectedUnit.internalRuntimeFullLoad || 6.0;
    const rHalf = selectedUnit.internalRuntimeHalfLoad || 18.0;
    let baseInternalRuntime = 0;
    if (runtimeLoadFraction <= 0.5) {
      // Non-linear scaling for low discharge rates (Peukert's effect)
      const ratio = 0.5 / runtimeLoadFraction;
      baseInternalRuntime = rHalf * Math.pow(ratio, 0.72);
    } else {
      baseInternalRuntime = rFull + (rHalf - rFull) * ((1.0 - runtimeLoadFraction) / 0.5);
    }
    const internalRuntime = Math.round(baseInternalRuntime * agingFactor * 10) / 10;

    // Extended Battery Pack (EBP) Calculation
    const hasEbpSupport = selectedUnit.ebpModel && selectedUnit.ebpModel !== "None" && selectedUnit.ebpModel !== "N/A";
    let ebpQtyPerUps = 0;
    let addedPerEbp = 0;
    let achievedRuntime = internalRuntime;

    if (hasEbpSupport) {
      const ebpFull = selectedUnit.ebpRuntimeFullLoad || (rFull * 4);
      const ebpHalf = selectedUnit.ebpRuntimeHalfLoad || (ebpFull * 2.2);
      const deltaFull = Math.max(5, ebpFull - rFull);
      const deltaHalf = Math.max(10, ebpHalf - rHalf);

      let baseAddedEbp = 0;
      if (runtimeLoadFraction <= 0.5) {
        const ratio = 0.5 / runtimeLoadFraction;
        baseAddedEbp = deltaHalf * Math.pow(ratio, 0.72);
      } else {
        baseAddedEbp = deltaFull + (deltaHalf - deltaFull) * ((1.0 - runtimeLoadFraction) / 0.5);
      }
      addedPerEbp = Math.max(1, Math.round(baseAddedEbp * agingFactor * 10) / 10);

      if (targetRuntime > internalRuntime) {
        ebpQtyPerUps = Math.ceil((targetRuntime - internalRuntime) / addedPerEbp);
      }
      achievedRuntime = Math.round((internalRuntime + (ebpQtyPerUps * addedPerEbp)) * 10) / 10;
    }

    // Generate Scalable Multi-EBP Runtime Curve (0, 1, 2, 3, 4 EBPs)
    const runtimeCurve = [];
    const maxCurvePacks = hasEbpSupport ? 4 : 0;
    for (let p = 0; p <= maxCurvePacks; p++) {
      const packRuntimeMin = Math.round((internalRuntime + (p * addedPerEbp)) * 10) / 10;
      const packRuntimeHours = Math.round((packRuntimeMin / 60) * 10) / 10;
      runtimeCurve.push({
        ebpQty: p,
        totalEbpQty: p * upsQty,
        runtimeMin: packRuntimeMin,
        runtimeHours: packRuntimeHours,
        meetsTarget: packRuntimeMin >= targetRuntime,
        meetsUL294: packRuntimeMin >= 240, // 4-hour standby
        meetsNFPA72: packRuntimeMin >= 1440 // 24-hour standby
      });
    }

    // UL 294 / NFPA 731 Standby Compliance Evaluation (4-Hour = 240 minutes)
    const ul294TargetMin = 240;
    const isUL294Compliant = achievedRuntime >= ul294TargetMin;
    const ul294DeficitMin = Math.max(0, Math.round(ul294TargetMin - achievedRuntime));
    let ul294RequiredEbp = 0;
    if (hasEbpSupport && !isUL294Compliant && addedPerEbp > 0) {
      ul294RequiredEbp = Math.ceil((ul294TargetMin - internalRuntime) / addedPerEbp);
    }

    const totalEbpQty = upsQty * ebpQtyPerUps;
    const upsTotalRU = upsQty * (selectedUnit.rackUnits || 2);
    const ebpTotalRU = totalEbpQty * (selectedUnit.ebpRackHeight || 2);
    const totalPowerRU = upsTotalRU + ebpTotalRU;

    // Feeder Branch Circuit Loading (with 92% inverter efficiency derating)
    const inverterEfficiency = 0.92;
    const inputWattsTotal = Math.round(worstCaseWatts / inverterEfficiency);
    const inVolt = selectedUnit.inputVoltage || 120;
    const breakerAmps = selectedUnit.inputCircuitAmps || 20;
    const actualInputAmps = Math.round((inputWattsTotal / inVolt) * 10) / 10;
    const circuitCapacityWatts = Math.round(inVolt * breakerAmps);
    const circuitLoadingPct = Math.round((inputWattsTotal / circuitCapacityWatts) * 100);
    const circuitStatus = circuitLoadingPct <= 80 ? "SAFE" : (circuitLoadingPct <= 100 ? "WARNING" : "OVERLOADED");

    // Equipment Plug vs UPS/PDU Receptacle Audit
    const plugCounts = {};
    equipmentPlugs.forEach(p => {
      plugCounts[p.plug] = (plugCounts[p.plug] || 0) + 1;
    });

    return {
      worstCaseWatts,
      operatingWatts,
      connectedWatts,
      runtimeLoadWatts,
      loadMode,
      agingFactor,
      targetRuntime,
      safetyMargin,
      preferredVoltage,
      upsModel: selectedUnit,
      upsQty,
      loadPerUnit,
      loadFraction,
      loadPercent,
      runtimeLoadPerUnit,
      runtimeLoadFraction,
      runtimeLoadPercent,
      internalRuntime,
      hasEbpSupport,
      ebpModel: selectedUnit.ebpModel,
      ebpRackHeight: selectedUnit.ebpRackHeight,
      ebpQtyPerUps,
      totalEbpQty,
      addedTimePerEbp: addedPerEbp,
      achievedRuntime,
      runtimeMet: achievedRuntime >= targetRuntime,
      runtimeCurve,
      ul294: {
        targetMin: ul294TargetMin,
        achievedHours: Math.round((achievedRuntime / 60) * 10) / 10,
        compliant: isUL294Compliant,
        deficitMin: ul294DeficitMin,
        requiredEbpQty: ul294RequiredEbp
      },
      rackSpace: {
        upsRU: upsTotalRU,
        ebpRU: ebpTotalRU,
        totalRU: totalPowerRU
      },
      feederCircuit: {
        inputWattsTotal,
        inVolt,
        breakerAmps,
        actualInputAmps,
        circuitCapacityWatts,
        circuitLoadingPct,
        circuitStatus,
        spec: `${inVolt}V ${breakerAmps}A Dedicated Branch Circuit (${selectedUnit.inputConnector || 'NEMA'})`
      },
      outletAudit: {
        plugCount: equipmentPlugs.length,
        plugBreakdown: plugCounts,
        upsReceptacles: selectedUnit.receptacles || "Standard NEMA/IEC Outlets"
      }
    };
  }
};

// =========================================================================
// VIDEO RETENTION, BITRATE, RAID DRIVE MATRIX & GENETEC 5.14 ARCHIVER SIZER
// Note: Tunable math coefficients are isolated in VIDEO_STORAGE_CONSTANTS
// and GENETEC_514_REQUIREMENTS so custom values can be updated in one place.
// Reference: Genetec Security Center 5.14.1.0 System Requirements Guide
//            (Datasheets/Genetec/SystemRequirements.pdf)
// =========================================================================

const VIDEO_STORAGE_CONSTANTS = {
  // Baseline H.264 @ 30 FPS, Medium Scene Activity bitrate (Mbps per sensor head)
  // Calibrated to industry standards & Genetec 5.14 Guide (p.6 & p.12: 1080p=4.8 Mbps, 4K=19.0 Mbps)
  BASE_H264_30FPS_MBPS_BY_MP: {
    1: 2.4,   // 720p HD (1280x720)
    2: 4.8,   // 1080p Full HD (1920x1080) - Genetec 5.14 benchmark: 4.8 Mbps
    3: 6.8,   // 3MP (2048x1536)
    4: 8.8,   // 4MP 2K QHD (2560x1440)
    5: 10.5,  // 5MP (2592x1944)
    6: 12.8,  // 6MP (3072x2048)
    8: 19.0,  // 8MP 4K Ultra HD (3840x2160) - Genetec 5.14 benchmark: 19.0 Mbps
    12: 26.0, // 12MP Fisheye / Panoramic
    16: 35.0, // 16MP / Multi-Sensor (e.g. 4x4MP)
    20: 42.0, // 20MP Multi-Sensor (4x5MP)
    32: 76.0  // 32MP Multi-Sensor (4x8MP 4K)
  },

  // Codec compression multipliers relative to H.264 (1.00)
  // Calibrated to Genetec 5.14 Guide (p.6: 1080p H.264=4.8, H.265=3.2, AV1=3.1; 4K H.264=19.0, H.265=13.4, AV1=12.7)
  CODEC_MULTIPLIERS: {
    "H.264": 1.00,       // Standard H.264 / AVC
    "h264": 1.00,
    "H.265": 0.68,       // Standard H.265 / HEVC (~32% reduction vs H.264)
    "h265": 0.68,
    "H.265+": 0.45,      // Smart Codec (Zipstream / WiseStream / HDSM ~55% reduction)
    "h265_smart": 0.45,
    "AV1": 0.65,         // AV1 Codec (Genetec 5.14 benchmark ~35% reduction vs H.264)
    "av1": 0.65,
    "AVI": 3.50,         // Uncompressed / MJPEG / AVI stream (~3.5x H.264)
    "avi": 3.50
  },

  // Scene Activity / Complexity multipliers
  SCENE_ACTIVITY_MULTIPLIERS: {
    "low": { label: "Low (Hallway / Static)", mult: 0.65 },
    "medium": { label: "Medium (Standard Commercial)", mult: 1.00 },
    "high": { label: "High (Traffic / Crowds / Foliage)", mult: 1.40 },
    "ultra": { label: "Very High (Casino / High Detail)", mult: 1.75 }
  },

  REFERENCE_FPS: 30,
  FPS_SCALING_EXPONENT: 0.85, // Non-linear GOP I/P-frame scaling relative to 30 FPS

  // Standard Enterprise Surveillance / Enterprise SAS/SATA 3.5" HDD Capacities (TB)
  STANDARD_DRIVE_SIZES_TB: [4, 8, 12, 16, 18, 20, 22, 24],

  // RAID Level Definitions & Parity Rules
  RAID_LEVELS: {
    "RAID 5": {
      id: "RAID 5",
      label: "RAID 5 (Single Parity)",
      minDrives: 3,
      parityDrivesPerGroup: 1,
      maxDrivesPerGroup: 16,
      mirrorFactor: 1,
      approxRawMultiplier: 1.20,
      description: "1 parity drive per RAID group; tolerates 1 drive failure."
    },
    "RAID 6": {
      id: "RAID 6",
      label: "RAID 6 (Dual Parity)",
      minDrives: 4,
      parityDrivesPerGroup: 2,
      maxDrivesPerGroup: 24,
      mirrorFactor: 1,
      approxRawMultiplier: 1.33,
      description: "2 parity drives per RAID group; tolerates 2 simultaneous drive failures (Enterprise Standard)."
    },
    "RAID 10": {
      id: "RAID 10",
      label: "RAID 10 (Mirrored Stripes)",
      minDrives: 4,
      parityDrivesPerGroup: 0,
      maxDrivesPerGroup: 24,
      mirrorFactor: 2,
      approxRawMultiplier: 2.00,
      description: "50% usable capacity (mirrored pairs); fastest rebuild & write IOPS."
    },
    "RAID 50": {
      id: "RAID 50",
      label: "RAID 50 (Dual RAID-5 Spans)",
      minDrives: 6,
      parityDrivesPerGroup: 2,
      maxDrivesPerGroup: 24,
      mirrorFactor: 1,
      approxRawMultiplier: 1.25,
      description: "2 parity drives across dual RAID-5 spans; high write throughput."
    },
    "RAID 60": {
      id: "RAID 60",
      label: "RAID 60 (Dual RAID-6 Spans)",
      minDrives: 8,
      parityDrivesPerGroup: 4,
      maxDrivesPerGroup: 24,
      mirrorFactor: 1,
      approxRawMultiplier: 1.40,
      description: "4 parity drives across dual RAID-6 spans; recommended for 24-bay high-density SANs."
    },
    "JBOD": {
      id: "JBOD",
      label: "JBOD / RAID 0 (No Parity)",
      minDrives: 1,
      parityDrivesPerGroup: 0,
      maxDrivesPerGroup: 24,
      mirrorFactor: 1,
      approxRawMultiplier: 1.00,
      description: "100% raw capacity; zero fault tolerance (not recommended for critical video)."
    }
  },

  STORAGE_SAFETY_BUFFER: 1.10 // 10% filesystem, database index & pre-event buffer overhead
};

// Genetec Security Center 5.14.1.0 Official System Requirements (Datasheets/Genetec/SystemRequirements.pdf)
const GENETEC_514_REQUIREMENTS = {
  datasheetPath: "Datasheets/Genetec/SystemRequirements.pdf",
  version: "5.14.1.0",
  maxLogicalVolumeSizeTb: 30,              // 30 TB max usable per Windows Volume (and each Archiver role requires separate Windows volumes)
  directoryIsolationThresholdCameras: 300, // Page 15 Sec 1.10: >300 cameras requires dedicated Directory server
  maxPlaybackMbpsOnHighPerf: 100,

  // Server Profiles for Archiver Role (Pages 7, 8, 9, 15, 16, 17)
  // Note: Physical servers can host multiple Archiver roles within the server's total throughput & role limits,
  // provided each Archiver role is assigned its own separate Windows volume(s) (<= 30 TB per Windows volume).
  ARCHIVER_PROFILES: {
    "unified_min": {
      id: "unified_min",
      label: "Unified Directory + Archiver (Minimum Profile)",
      cpuSpec: "Intel Core i5-8500 3.0 GHz+",
      ramGb: 8,
      nicSpec: "1 GbE NIC",
      maxCamerasPerRole: 50,
      maxBitrateMbpsPerRole: 50,
      maxRolesPerServer: 1,
      maxServerBitrateMbps: 50,
      referencePage: "Page 7 & 9 (Sec 1.4 & 1.5)"
    },
    "unified_rec": {
      id: "unified_rec",
      label: "Unified Directory + Archiver (Recommended Profile)",
      cpuSpec: "Intel Xeon E-2434 3.4 GHz+",
      ramGb: 16,
      nicSpec: "1 GbE NIC (240GB SSD OS)",
      maxCamerasPerRole: 100,
      maxBitrateMbpsPerRole: 200,
      maxRolesPerServer: 1,
      maxServerBitrateMbps: 200,
      referencePage: "Page 7 & 9 (Sec 1.4 & 1.5)"
    },
    "dedicated_300": {
      id: "dedicated_300",
      label: "Dedicated Archiver Server — Standard (300 Mbps/Role, Multi-Role)",
      cpuSpec: "Intel Xeon Silver 4210+ / Dual-Socket",
      ramGb: 16,
      nicSpec: "1 GbE / 10 GbE NIC",
      maxCamerasPerRole: 300,
      maxBitrateMbpsPerRole: 300,
      maxRolesPerServer: 4, // Up to 4 Archiver roles / 1,200 Mbps per physical server (Page 7 & 16-17)
      maxServerBitrateMbps: 1200,
      referencePage: "Page 7 & 16 (Sec 1.4.1 & 1.11)"
    },
    "dedicated_500": {
      id: "dedicated_500",
      label: "Dedicated High-Perf Archiver Server (500 Mbps/Role, Multi-Role)",
      cpuSpec: "Intel Xeon Silver 4210+ / Gold",
      ramGb: 32,
      nicSpec: "10 GbE NIC",
      maxCamerasPerRole: 300,
      maxBitrateMbpsPerRole: 500,
      maxRolesPerServer: 4, // Up to 4 Archiver roles / 2,000 Mbps per physical server
      maxServerBitrateMbps: 2000,
      referencePage: "Page 8 (Sec 1.4.1)"
    },
    "high_perf_multi": {
      id: "high_perf_multi",
      label: "Enterprise Dual-Xeon / Streamvault (Up to 8 Roles / 4,000 Mbps)",
      cpuSpec: "2x Intel Xeon Silver 4416+ (40 Cores) / Streamvault 4000/7000",
      ramGb: 64,
      nicSpec: "10 GbE / 25 GbE NIC",
      maxCamerasPerRole: 300,
      maxBitrateMbpsPerRole: 500,
      maxRolesPerServer: 8, // High-density Dual-Xeon / Streamvault up to 4,135 Mbps (Page 8)
      maxServerBitrateMbps: 4000,
      referencePage: "Page 7 & 8 (Sec 1.4 & 1.4.1)"
    },
    "virtual_vm": {
      id: "virtual_vm",
      label: "Virtualized Archiver Host (ESXi / Hyper-V, -20% VM Derate)",
      cpuSpec: "8+ vCPUs per VM (Complete Logical Cores)",
      ramGb: 16,
      nicSpec: "10 GbE Host NIC (Dedicated 1GbE/VM)",
      maxCamerasPerRole: 240, // 300 cameras - 20% VM capacity loss (Page 15 Sec 1.10)
      maxBitrateMbpsPerRole: 300, // Page 17: 300 Mbps per archiving VM
      maxRolesPerServer: 4,   // Page 16 & 17: Max 4 video VMs / 1,200 Mbps per physical server module
      maxServerBitrateMbps: 1200,
      referencePage: "Page 15–17 (Sec 1.10 & 1.11)"
    }
  },

  // Page 10: Fusion Stream Encryption impact on Archiver camera capacity
  // 1st certificate reduces capacity by 30%; each additional certificate reduces by 4% (max 20)
  getEncryptionCapacityFactor(certCount = 0) {
    const certs = Math.max(0, Math.min(20, parseInt(certCount, 10) || 0));
    if (certs === 0) return 1.0;
    // Matches Genetec Page 10 table: 0->300 (1.0), 1->210 (0.70), 5->178 (0.593), 10->145 (0.483), 20->96 (0.32)
    return Math.max(0.25, 0.70 * Math.pow(0.96, certs - 1));
  }
};

const VideoStorageSizer = {
  state: {
    sourceMode: "auto",        // "auto" (uses BOM if >0 cams, else manual) | "manual" | "bom"
    manualCameraCount: 32,     // Default camera count for standalone planning
    resolutionMp: 4,           // Default 4MP (2K) when in manual mode or override
    useManualResolutionOnBom: false,
    retentionDays: 30,
    codec: "H.265",            // "H.264" | "H.265" | "H.265+" | "AV1" | "AVI"
    fps: 15,
    recordingMode: "motion",   // "continuous" (100%) | "motion"
    motionDutyPct: 50,         // % of 24-hr day recorded when in motion mode (or 100% if continuous)
    sceneActivity: "medium",   // "low" | "medium" | "high" | "ultra"
    raidLevel: "RAID 6",       // "RAID 5" | "RAID 6" | "RAID 10" | "RAID 50" | "RAID 60" | "JBOD"
    preferredDriveSizeTb: 16,  // Selected HDD size (TB) for detailed server mapping
    genetecProfile: "dedicated_300", // Key in GENETEC_514_REQUIREMENTS.ARCHIVER_PROFILES
    archiverRolesCount: 0,     // 0 = Auto-calculate minimum required Archiver roles; >0 = user-specified count to verify
    serverCountOverride: 0,    // 0 = Auto-calculate physical servers; >0 = user-specified physical server count
    encryptionCerts: 0,        // Fusion Stream Encryption certificates (Page 10)
    softwareMotionDetection: false, // Page 15: Software motion detection reduces Archiver capacity by up to 50%
    customBitratePerCamMbps: 0 // Optional custom per-camera bitrate override (0 = use standard math)
  },

  /**
   * Normalizes codec strings from UI or legacy state into canonical keys.
   */
  normalizeCodec(rawCodec) {
    const c = String(rawCodec || "H.265").trim();
    const upper = c.toUpperCase();
    if (upper === "H.264" || upper === "H264" || upper === "AVC") return "H.264";
    if (upper === "H.265+" || upper === "H265_SMART" || upper.includes("ZIPSTREAM") || upper.includes("SMART")) return "H.265+";
    if (upper === "H.265" || upper === "H265" || upper === "HEVC") return "H.265";
    if (upper === "AV1") return "AV1";
    if (upper === "AVI" || upper === "MJPEG") return "AVI";
    return "H.265";
  },

  /**
   * Normalizes RAID strings from UI or legacy state into canonical keys.
   */
  normalizeRaid(rawRaid) {
    const r = String(rawRaid || "RAID 6").trim().toUpperCase().replace(/[-_]/g, " ");
    if (r.includes("RAID 60") || r === "RAID60") return "RAID 60";
    if (r.includes("RAID 50") || r === "RAID50") return "RAID 50";
    if (r.includes("RAID 10") || r === "RAID10") return "RAID 10";
    if (r.includes("RAID 6") || r === "RAID6") return "RAID 6";
    if (r.includes("RAID 5") || r === "RAID5") return "RAID 5";
    if (r.includes("JBOD") || r.includes("RAID 0") || r === "RAID0") return "JBOD";
    return "RAID 6";
  },

  /**
   * Parses sensor megapixels and sensor head count from a camera catalog/BOM item.
   */
  parseCameraOptics(item) {
    if (!item) return { mpPerHead: 4, heads: 1, totalMp: 4 };
    const resStr = String(item.resolution || item.model || "");
    let totalMp = parseFloat(item.sensorMegapixels) || 0;
    if (!totalMp) {
      const m = resStr.match(/(\d+)\s*MP/i);
      if (m) totalMp = parseInt(m[1], 10);
      else if (/4K/i.test(resStr)) totalMp = 8;
      else if (/1080p/i.test(resStr)) totalMp = 2;
      else if (/720p/i.test(resStr)) totalMp = 1;
      else totalMp = 4;
    }

    let heads = 1;
    if (/4x|quad|multi-sensor.*4|360.*multi/i.test(resStr + " " + (item.formFactor || ""))) heads = 4;
    else if (/3x|triple|multi-sensor.*3/i.test(resStr + " " + (item.formFactor || ""))) heads = 3;
    else if (/2x|dual-head|dual-sensor|bi-directional/i.test(resStr + " " + (item.formFactor || ""))) heads = 2;

    const mpPerHead = heads > 1 && totalMp >= heads * 2 ? Math.round(totalMp / heads) : totalMp;
    return { mpPerHead, heads, totalMp };
  },

  /**
   * Calculates single-sensor bitrate (Mbps) based on resolution MP, codec, FPS, and scene activity.
   */
  calculateSingleStreamBitrateMbps(mpPerHead, codecKey, fps, sceneActivityKey, customBitrateOverride = 0) {
    if (customBitrateOverride > 0) {
      return customBitrateOverride;
    }
    const mp = Number(mpPerHead) || 4;
    // Lookup closest MP in BASE_H264_30FPS_MBPS_BY_MP or interpolate linearly (~2.35 Mbps per MP @ 30fps H.264)
    const baseTable = VIDEO_STORAGE_CONSTANTS.BASE_H264_30FPS_MBPS_BY_MP;
    const baseH264At30 = baseTable[mp] || (mp * 2.35);

    const codecMult = VIDEO_STORAGE_CONSTANTS.CODEC_MULTIPLIERS[codecKey] ?? 0.68;
    const activityObj = VIDEO_STORAGE_CONSTANTS.SCENE_ACTIVITY_MULTIPLIERS[sceneActivityKey] || VIDEO_STORAGE_CONSTANTS.SCENE_ACTIVITY_MULTIPLIERS.medium;
    const fpsMult = Math.pow(Math.max(1, fps) / VIDEO_STORAGE_CONSTANTS.REFERENCE_FPS, VIDEO_STORAGE_CONSTANTS.FPS_SCALING_EXPONENT);

    return Math.round(baseH264At30 * codecMult * activityObj.mult * fpsMult * 100) / 100;
  },

  /**
   * Computes exact RAID drive count, raw TB, usable TB, parity drives, Windows volumes (<=30TB, isolated per Archiver role),
   * and chassis fit across all standard enterprise hard drive sizes (4TB to 24TB).
   */
  calculateRaidDriveMatrix(requiredUsableTb, raidKey, numServers = 1, activeArchiverRoles = 1) {
    const raidDef = VIDEO_STORAGE_CONSTANTS.RAID_LEVELS[raidKey] || VIDEO_STORAGE_CONSTANTS.RAID_LEVELS["RAID 6"];
    const targetUsable = Math.max(0.1, Number(requiredUsableTb) || 0);
    const servers = Math.max(1, parseInt(numServers, 10) || 1);
    const roles = Math.max(1, parseInt(activeArchiverRoles, 10) || 1);
    const usablePerServer = targetUsable / servers;
    const maxVolTb = GENETEC_514_REQUIREMENTS.maxLogicalVolumeSizeTb || 30;

    return VIDEO_STORAGE_CONSTANTS.STANDARD_DRIVE_SIZES_TB.map(driveTb => {
      // Calculate drives required per server so every server has a valid, redundant RAID array
      let dataDrivesPerServer = Math.max(1, Math.ceil(usablePerServer / driveTb));
      let totalDrivesPerServer = 0;
      let parityDrivesPerServer = 0;

      if (raidDef.id === "RAID 10") {
        // Mirrored pairs: total = 2 * dataDrives, minimum 4 drives
        dataDrivesPerServer = Math.max(2, dataDrivesPerServer);
        totalDrivesPerServer = dataDrivesPerServer * 2;
        parityDrivesPerServer = dataDrivesPerServer;
      } else if (raidDef.id === "JBOD") {
        totalDrivesPerServer = Math.max(1, dataDrivesPerServer);
        parityDrivesPerServer = 0;
      } else {
        // RAID 5, RAID 6, RAID 50, RAID 60
        // If a single server needs more than maxDrivesPerGroup, split into multiple RAID groups
        const minData = Math.max(1, raidDef.minDrives - raidDef.parityDrivesPerGroup);
        dataDrivesPerServer = Math.max(minData, dataDrivesPerServer);
        const maxDataPerGroup = raidDef.maxDrivesPerGroup - raidDef.parityDrivesPerGroup;
        const raidGroupsPerServer = Math.max(1, Math.ceil(dataDrivesPerServer / maxDataPerGroup));
        parityDrivesPerServer = raidGroupsPerServer * raidDef.parityDrivesPerGroup;
        totalDrivesPerServer = dataDrivesPerServer + parityDrivesPerServer;

        // Enforce even drive count for spanned RAID 50 / RAID 60
        if ((raidDef.id === "RAID 50" || raidDef.id === "RAID 60") && (totalDrivesPerServer % 2 !== 0)) {
          totalDrivesPerServer += 1;
          dataDrivesPerServer += 1;
        }
      }

      const totalDrivesAllServers = totalDrivesPerServer * servers;
      const totalDataDrives = dataDrivesPerServer * servers;
      const totalParityDrives = parityDrivesPerServer * servers;
      const rawStorageTb = totalDrivesAllServers * driveTb;
      const usableStorageTb = totalDataDrives * driveTb;
      const usablePerServerTb = dataDrivesPerServer * driveTb;
      const efficiencyPct = Math.round((usableStorageTb / rawStorageTb) * 100);

      // Genetec Windows Volume Sizing:
      // 1) Each Archiver role MUST have its own separate Windows volume(s) (roles cannot share a volume).
      // 2) Each Windows volume is capped at <= 30 TB usable.
      const usablePerRoleTb = usableStorageTb / roles;
      const windowsVolumesPerRole = Math.max(1, Math.ceil(usablePerRoleTb / maxVolTb));
      const totalVolumes30Tb = roles * windowsVolumesPerRole;
      const volumesPerServer30Tb = Math.ceil(totalVolumes30Tb / servers);
      const sizePerVolumeTb = Math.round((usablePerRoleTb / windowsVolumesPerRole) * 10) / 10;

      // Chassis form factor recommendation per server
      let chassisFormFactor = "1U 4-Bay";
      if (totalDrivesPerServer > 24) chassisFormFactor = `${Math.ceil(totalDrivesPerServer / 24)}x 4U 24-Bay JBOD/SAN`;
      else if (totalDrivesPerServer > 12) chassisFormFactor = "4U 24-Bay Rack";
      else if (totalDrivesPerServer > 8) chassisFormFactor = "2U 12-Bay Rack";
      else if (totalDrivesPerServer > 4) chassisFormFactor = "2U 8-Bay Rack";

      return {
        driveSizeTb: driveTb,
        drivesPerServer: totalDrivesPerServer,
        dataDrivesPerServer,
        parityDrivesPerServer,
        totalDrives: totalDrivesAllServers,
        totalDataDrives,
        totalParityDrives,
        rawStorageTb,
        usableStorageTb,
        usablePerServerTb,
        efficiencyPct,
        windowsVolumesPerRole,
        volumesPerServer30Tb,
        totalVolumes30Tb,
        sizePerVolumeTb,
        chassisFormFactor
      };
    });
  },

  /**
   * Master calculation method used by both the Server/Camera Calculator Strip and DRC (project_health.js).
   */
  calculateProjectVideoLoad(bomList = [], overrides = {}) {
    const defaults = (typeof StorageService !== "undefined" && typeof StorageService.getProjectDefaults === "function")
      ? StorageService.getProjectDefaults()
      : null;

    // 1. Resolve inputs & normalize
    const retentionDays = Math.max(1, Number(overrides.retentionDays ?? this.state.retentionDays ?? defaults?.vms?.retentionDays ?? 30) || 30);
    const codec = this.normalizeCodec(overrides.codec ?? this.state.codec ?? "H.265");
    const fps = Math.max(1, Number(overrides.fps ?? this.state.fps ?? 15) || 15);

    // Support both 0..1 (motionDutyCycle) and 1..100 (motionDutyPct)
    let rawMotion = overrides.motionDutyPct ?? overrides.motionDutyCycle ?? this.state.motionDutyPct ?? 50;
    if (rawMotion > 0 && rawMotion <= 1) rawMotion = Math.round(rawMotion * 100);
    const recordingMode = overrides.recordingMode || this.state.recordingMode || (rawMotion >= 100 ? "continuous" : "motion");
    const motionDutyPct = recordingMode === "continuous" ? 100 : Math.max(5, Math.min(100, Number(rawMotion) || 50));
    const motionDutyCycle = motionDutyPct / 100;

    const sceneActivity = overrides.sceneActivity || this.state.sceneActivity || "medium";
    const raidLevel = this.normalizeRaid(overrides.raidLevel ?? overrides.raidType ?? this.state.raidLevel ?? "RAID 6");
    const raidDef = VIDEO_STORAGE_CONSTANTS.RAID_LEVELS[raidLevel] || VIDEO_STORAGE_CONSTANTS.RAID_LEVELS["RAID 6"];

    const resolutionMp = Number(overrides.resolutionMp ?? this.state.resolutionMp ?? 4) || 4;
    const customBitratePerCamMbps = Number(overrides.customBitratePerCamMbps ?? this.state.customBitratePerCamMbps ?? 0) || 0;
    const preferredDriveSizeTb = Number(overrides.preferredDriveSizeTb ?? this.state.preferredDriveSizeTb ?? 16) || 16;

    // 2. Inspect BOM for cameras & quoted NVR/VMS servers
    let bomCameraUnits = 0;
    let bomSensorHeads = 0;
    let bomPeakIngressMbps = 0;

    let quotedUsableTb = 0;
    let quotedRawTb = 0;
    let quotedMaxIngestMbps = 0;
    let quotedServerCount = 0;

    (bomList || []).forEach(item => {
      if (!item || item.parentInstanceId) return;
      const qty = parseInt(item.qty ?? item.quantity, 10) || 1;
      const cat = (item.category || "").toLowerCase();
      const role = (item.role || "").toLowerCase();

      if (cat === "cameras" || role === "camera" || (typeof isCameraDevice === "function" && isCameraDevice(item))) {
        const optics = this.parseCameraOptics(item);
        const mpToUse = this.state.useManualResolutionOnBom ? resolutionMp : optics.mpPerHead;
        const perHeadMbps = this.calculateSingleStreamBitrateMbps(mpToUse, codec, fps, sceneActivity, customBitratePerCamMbps);
        const unitPeakMbps = perHeadMbps * optics.heads;

        bomCameraUnits += qty;
        bomSensorHeads += optics.heads * qty;
        bomPeakIngressMbps += unitPeakMbps * qty;
      } else if (cat === "servers" || cat === "storage" || role.includes("nvr") || role.includes("server") || role.includes("storage")) {
        quotedServerCount += qty;
        const usableTb = parseFloat(item.usableStorageTb ?? item.usableStorageTB ?? item.storageTb ?? 0);
        const rawTb = parseFloat(item.rawStorageTb ?? item.rawStorageTB ?? usableTb);
        const maxBw = parseFloat(item.maxIngestBandwidthMbps ?? item.maxThroughputMbps ?? 600);
        quotedUsableTb += usableTb * qty;
        quotedRawTb += rawTb * qty;
        quotedMaxIngestMbps += maxBw * qty;
      }
    });

    // 3. Determine active camera count & bitrate (BOM vs Manual Planner)
    const sourceMode = overrides.sourceMode || this.state.sourceMode || "auto";
    const useBomCameras = (sourceMode === "bom") || (sourceMode === "auto" && bomCameraUnits > 0 && !overrides.forceManual);

    const perCameraSingleStreamMbps = this.calculateSingleStreamBitrateMbps(resolutionMp, codec, fps, sceneActivity, customBitratePerCamMbps);

    let cameraUnits = 0;
    let totalSensorHeads = 0;
    let peakIngressMbps = 0;

    if (useBomCameras && bomCameraUnits > 0) {
      cameraUnits = bomCameraUnits;
      totalSensorHeads = bomSensorHeads;
      peakIngressMbps = bomPeakIngressMbps;
    } else if (sourceMode === "bom" && bomCameraUnits === 0) {
      cameraUnits = 0;
      totalSensorHeads = 0;
      peakIngressMbps = 0;
    } else {
      cameraUnits = Math.max(0, parseInt(overrides.manualCameraCount ?? this.state.manualCameraCount ?? 32, 10) || 0);
      totalSensorHeads = cameraUnits;
      peakIngressMbps = cameraUnits * perCameraSingleStreamMbps;
    }

    const averageRecordingMbps = peakIngressMbps * motionDutyCycle;

    // 4. Storage Math (Industry-Standard Formula)
    // Daily GB = (averageRecordingMbps * 86,400 sec/day) / (8 bits/byte * 1000) = averageRecordingMbps * 10.8 GB/day
    const dailyStorageGb = Math.round(averageRecordingMbps * 10.8 * 10) / 10;
    const netVideoStorageTb = (averageRecordingMbps * 86400 * retentionDays) / 8000000;
    const requiredUsableTb = Math.round(netVideoStorageTb * VIDEO_STORAGE_CONSTANTS.STORAGE_SAFETY_BUFFER * 100) / 100;
    const theoreticalRawTb = Math.round(requiredUsableTb * raidDef.approxRawMultiplier * 100) / 100;

    // 5. Genetec Security Center 5.14.1.0 Archiver & Multi-Role Server Verification
    const genetecProfileKey = overrides.genetecProfile || this.state.genetecProfile || "dedicated_300";
    const profileDef = GENETEC_514_REQUIREMENTS.ARCHIVER_PROFILES[genetecProfileKey] || GENETEC_514_REQUIREMENTS.ARCHIVER_PROFILES.dedicated_300;
    const encryptionCerts = Math.max(0, parseInt(overrides.encryptionCerts ?? this.state.encryptionCerts ?? 0, 10) || 0);
    const softwareMotion = Boolean(overrides.softwareMotionDetection ?? this.state.softwareMotionDetection);

    const encFactor = GENETEC_514_REQUIREMENTS.getEncryptionCapacityFactor(encryptionCerts);
    const motionPenaltyFactor = softwareMotion ? 0.50 : 1.00; // Page 15: Software motion detection reduces capacity up to 50%
    const combinedCapacityFactor = encFactor * motionPenaltyFactor;

    const effectiveMaxCamerasPerArchiver = Math.max(1, Math.floor(profileDef.maxCamerasPerRole * combinedCapacityFactor));
    const effectiveMaxMbpsPerArchiver = Math.max(10, Math.floor(profileDef.maxBitrateMbpsPerRole * combinedCapacityFactor));

    const minArchiversByCameras = cameraUnits > 0 ? Math.ceil(totalSensorHeads / effectiveMaxCamerasPerArchiver) : 1;
    const minArchiversByBitrate = peakIngressMbps > 0 ? Math.ceil(peakIngressMbps / effectiveMaxMbpsPerArchiver) : 1;
    const minRequiredArchiverRoles = cameraUnits > 0 ? Math.max(minArchiversByCameras, minArchiversByBitrate) : 1;

    const userArchiverRoles = parseInt(overrides.archiverRolesCount ?? this.state.archiverRolesCount ?? 0, 10) || 0;
    const activeArchiverRoles = userArchiverRoles > 0 ? userArchiverRoles : minRequiredArchiverRoles;
    const isArchiverCountVerified = activeArchiverRoles >= minRequiredArchiverRoles;

    // How Multiple Archiver Roles map to physical servers (within Genetec server limits)
    const maxRolesPerPhysicalServer = profileDef.maxRolesPerServer || 4;
    const maxMbpsPerPhysicalServer = profileDef.maxServerBitrateMbps || (effectiveMaxMbpsPerArchiver * maxRolesPerPhysicalServer);
    const minServersByRoles = Math.ceil(activeArchiverRoles / maxRolesPerPhysicalServer);
    const minServersByThroughput = peakIngressMbps > 0 ? Math.ceil(peakIngressMbps / maxMbpsPerPhysicalServer) : 1;
    const minRequiredServers = cameraUnits > 0 ? Math.max(1, minServersByRoles, minServersByThroughput) : 1;

    const userServerCount = parseInt(overrides.serverCountOverride ?? this.state.serverCountOverride ?? 0, 10) || 0;
    // Do not assign more physical servers than active Archiver roles unless user explicitly asked
    const recommendedArchiverServers = userServerCount > 0 ? userServerCount : Math.min(activeArchiverRoles, minRequiredServers);
    const rolesPerServer = cameraUnits > 0 ? Math.ceil(activeArchiverRoles / recommendedArchiverServers) : 1;
    const isServerCountVerified = recommendedArchiverServers >= minRequiredServers && rolesPerServer <= maxRolesPerPhysicalServer;

    // Directory isolation rule (Page 15 Section 1.10: >300 cameras requires dedicated Directory server)
    const requiresDedicatedDirectoryServer = totalSensorHeads > GENETEC_514_REQUIREMENTS.directoryIsolationThresholdCameras;
    const directoryCoHostViolation = requiresDedicatedDirectoryServer && (genetecProfileKey === "unified_min" || genetecProfileKey === "unified_rec");

    // Per-Archiver & Per-Server Load Mapping
    const camerasPerArchiverRole = cameraUnits > 0 ? Math.ceil(totalSensorHeads / activeArchiverRoles) : 0;
    const bitratePerArchiverRoleMbps = cameraUnits > 0 ? Math.round((peakIngressMbps / activeArchiverRoles) * 10) / 10 : 0;
    const usableTbPerArchiverRole = cameraUnits > 0 ? Math.round((requiredUsableTb / activeArchiverRoles) * 100) / 100 : 0;

    const usableTbPerServer = cameraUnits > 0 ? Math.round((requiredUsableTb / recommendedArchiverServers) * 100) / 100 : 0;
    const bitratePerServerMbps = cameraUnits > 0 ? Math.round((peakIngressMbps / recommendedArchiverServers) * 10) / 10 : 0;

    // 6. Compute Drive Size Matrix across recommendedArchiverServers & activeArchiverRoles
    const driveOptionsMatrix = this.calculateRaidDriveMatrix(requiredUsableTb, raidLevel, recommendedArchiverServers, activeArchiverRoles);
    const selectedDrivePlan = driveOptionsMatrix.find(d => d.driveSizeTb === preferredDriveSizeTb) || driveOptionsMatrix[3] || driveOptionsMatrix[0];

    // Use the exact RAID drive array raw TB when cameras > 0, or theoreticalRawTb
    const requiredRawTb = cameraUnits > 0 ? theoreticalRawTb : 0;
    const arrayRawTb = cameraUnits > 0 && selectedDrivePlan ? selectedDrivePlan.rawStorageTb : 0;
    const arrayUsableTb = cameraUnits > 0 && selectedDrivePlan ? selectedDrivePlan.usableStorageTb : 0;

    // 7. Genetec Windows Volume Mapping (<= 30 TB per Windows Volume, AND separate Windows volume(s) per Archiver Role)
    const maxVolTb = GENETEC_514_REQUIREMENTS.maxLogicalVolumeSizeTb || 30;
    // Calculate both based on requiredUsableTb and based on the selected RAID array's usable TB
    const reqVolumesPerRole = cameraUnits > 0 ? Math.max(1, Math.ceil(usableTbPerArchiverRole / maxVolTb)) : 1;
    const volumesPerArchiverRole = (cameraUnits > 0 && selectedDrivePlan) ? selectedDrivePlan.windowsVolumesPerRole : reqVolumesPerRole;
    const totalLogicalVolumes = (cameraUnits > 0 && selectedDrivePlan) ? selectedDrivePlan.totalVolumes30Tb : (activeArchiverRoles * reqVolumesPerRole);
    const volumesPerServer = (cameraUnits > 0 && selectedDrivePlan) ? selectedDrivePlan.volumesPerServer30Tb : Math.ceil(totalLogicalVolumes / recommendedArchiverServers);
    const sizePerVolumeTb = (cameraUnits > 0 && selectedDrivePlan) ? selectedDrivePlan.sizePerVolumeTb : Math.round((usableTbPerArchiverRole / reqVolumesPerRole) * 10) / 10;

    // Warnings & Verification Findings for Genetec 5.14
    const genetecFindings = [];
    if (cameraUnits > 0) {
      if (!isArchiverCountVerified) {
        genetecFindings.push({
          severity: "critical",
          text: `${activeArchiverRoles} Archiver role(s) configured, but ${minRequiredArchiverRoles} required for ${totalSensorHeads} streams @ ${Math.round(peakIngressMbps)} Mbps (${bitratePerArchiverRoleMbps} Mbps/role exceeds ${effectiveMaxMbpsPerArchiver} Mbps/role limit).`
        });
      }
      if (!isServerCountVerified) {
        genetecFindings.push({
          severity: "critical",
          text: `${recommendedArchiverServers} Server(s) configured (${rolesPerServer} roles/srv @ ${bitratePerServerMbps} Mbps/srv), but profile supports max ${maxRolesPerPhysicalServer} Archiver roles and ${maxMbpsPerPhysicalServer} Mbps per server (${minRequiredServers} server(s) needed).`
        });
      }
      if (directoryCoHostViolation) {
        genetecFindings.push({
          severity: "critical",
          text: `Genetec 5.14 Sec 1.10 (p.15): Systems with >300 cameras (${totalSensorHeads} streams) must isolate the Directory role on a dedicated server (cannot use Unified Directory + Archiver).`
        });
      } else if (requiresDedicatedDirectoryServer) {
        genetecFindings.push({
          severity: "info",
          text: `Genetec 5.14 Sec 1.10 (p.15): >300 cameras (${totalSensorHeads} streams) requires +1 Dedicated Directory Server alongside the ${recommendedArchiverServers} Archiver server(s).`
        });
      }
      if (totalLogicalVolumes > 1 || activeArchiverRoles > 1 || arrayUsableTb > maxVolTb) {
        genetecFindings.push({
          severity: "info",
          text: `Windows Volume Mapping (≤${maxVolTb} TB Cap & Separate Volumes per Role): Configure ${totalLogicalVolumes} separate Windows volume(s) across ${recommendedArchiverServers} server(s) — ${volumesPerArchiverRole} volume(s) per Archiver role (${volumesPerServer} vol/server @ ~${sizePerVolumeTb} TB each) so no role shares a volume or exceeds ${maxVolTb} TB.`
        });
      }
    }

    const storageDeficitTb = Math.max(0, Math.round((requiredUsableTb - quotedUsableTb) * 10) / 10);
    const bandwidthExceeded = quotedServerCount > 0 && peakIngressMbps > quotedMaxIngestMbps;

    return {
      // Core counts & parameters
      sourceMode: useBomCameras ? "bom" : "manual",
      bomCameraUnits,
      cameraUnits,
      totalCameras: cameraUnits,
      totalSensorHeads,
      totalSensors: totalSensorHeads,
      resolutionMp,
      retentionDays,
      codec,
      fps,
      recordingMode,
      motionDutyPct,
      motionDutyCycle,
      sceneActivity,
      raidLevel,
      raidType: raidLevel,
      raidDescription: raidDef.description,
      preferredDriveSizeTb,

      // Bitrate & Storage outputs (both camelCase TB/Tb aliases for full cross-studio compatibility)
      perCameraMbps: perCameraSingleStreamMbps,
      peakIngressMbps: Math.round(peakIngressMbps * 10) / 10,
      averageRecordingMbps: Math.round(averageRecordingMbps * 10) / 10,
      totalBandwidthMbps: Math.round(peakIngressMbps * 10) / 10,
      dailyStorageGb,
      requiredUsableTb,
      requiredUsableTB: requiredUsableTb,
      requiredRawTb,
      requiredRawTB: requiredRawTb,
      arrayRawTb,
      arrayUsableTb,

      // Drive Matrix & Selected Drive Plan
      driveOptionsMatrix,
      selectedDrivePlan,

      // Genetec Security Center 5.14 Verification & Mapping
      genetec: {
        version: GENETEC_514_REQUIREMENTS.version,
        datasheetPath: GENETEC_514_REQUIREMENTS.datasheetPath,
        maxVolumeSizeTb: maxVolTb,
        volumesPerArchiverRole,
        totalLogicalVolumes,
        volumesPerServer,
        sizePerVolumeTb,
        profileKey: genetecProfileKey,
        profile: profileDef,
        encryptionCerts,
        softwareMotion,
        effectiveMaxCamerasPerArchiver,
        effectiveMaxMbpsPerArchiver,
        maxRolesPerPhysicalServer,
        maxMbpsPerPhysicalServer,
        minArchiversByCameras,
        minArchiversByBitrate,
        minRequiredArchiverRoles,
        userArchiverRoles,
        activeArchiverRoles,
        isArchiverCountVerified,
        minRequiredServers,
        userServerCount,
        recommendedArchiverServers,
        rolesPerServer,
        isServerCountVerified,
        requiresDedicatedDirectoryServer,
        directoryCoHostViolation,
        totalServersIncludingDirectory: recommendedArchiverServers + (requiresDedicatedDirectoryServer ? 1 : 0),
        camerasPerArchiverRole,
        bitratePerArchiverRoleMbps,
        usableTbPerArchiverRole,
        usableTbPerServer,
        bitratePerServerMbps,
        findings: genetecFindings,
        isFullyCompliant: isArchiverCountVerified && isServerCountVerified && !directoryCoHostViolation
      },

      // Quoted BOM Server Comparison
      quotedUsableTb: Math.round(quotedUsableTb * 10) / 10,
      quotedUsableTB: Math.round(quotedUsableTb * 10) / 10,
      quotedRawTb: Math.round(quotedRawTb * 10) / 10,
      quotedMaxIngestMbps: Math.round(quotedMaxIngestMbps),
      serverCount: quotedServerCount,
      storageDeficitTb,
      bandwidthExceeded,
      isCompliant: cameraUnits === 0 || (quotedUsableTb >= requiredUsableTb && !bandwidthExceeded)
    };
  },

  /**
   * Alias for calculateProjectVideoLoad used by app.js and project_health.js.
   */
  calculateFromBOM(bomList = [], overrides = {}) {
    return this.calculateProjectVideoLoad(bomList, overrides);
  }
};

// Global Browser Exports
window.IEEE_POE_STANDARDS = IEEE_POE_STANDARDS;
window.ELECTRICAL_CONSTANTS = ELECTRICAL_CONSTANTS;
window.NetworkSizer = NetworkSizer;
window.VIDEO_STORAGE_CONSTANTS = VIDEO_STORAGE_CONSTANTS;
window.GENETEC_514_REQUIREMENTS = GENETEC_514_REQUIREMENTS;
window.VideoStorageSizer = VideoStorageSizer;

