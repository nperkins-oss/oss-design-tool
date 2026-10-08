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

      // Track occupied RU
      const units = (item.stackedUnits && item.stackedUnits >= 2) ? item.stackedUnits : 1;
      if (item.rackSlot) {
        occupiedU += ((parseInt(item.rackUnits, 10) || 1) * units);
      }

      // Base internal chassis power draw (without PoE load)
      const base = parseFloat(item.baseWatts) || 0;
      chassisBaseWatts += (base * units * qty);

      // Maximum rated PoE power supply budget
      const poeBudget = parseFloat(item.poeBudget) || 0;
      nameplatePoEWatts += (poeBudget * units * qty);

      // Connected field devices PoE draw (if populated by BOM audit)
      const connectedPoE = parseFloat(item.consumedPoEWatts) || 0;
      connectedPoEWatts += connectedPoE;

      // Check if manufacturer specified an explicit maximum wall power draw (AC)
      if (item.maxPowerWatts && parseFloat(item.maxPowerWatts) > 0) {
        directAcNameplateWatts += (parseFloat(item.maxPowerWatts) * qty);
      } else {
        // Calculate AC draw incorporating internal PSU AC-to-DC conversion loss
        const calculatedAc = base + (poeBudget / psuEfficiency);
        directAcNameplateWatts += (calculatedAc * qty);
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

// Global Browser Exports
window.IEEE_POE_STANDARDS = IEEE_POE_STANDARDS;
window.ELECTRICAL_CONSTANTS = ELECTRICAL_CONSTANTS;
window.NetworkSizer = NetworkSizer;
