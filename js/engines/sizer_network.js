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
      if (item.rackSlot) {
        occupiedU += (parseInt(item.rackUnits, 10) || 1);
      }

      // Base internal chassis power draw (without PoE load)
      const base = parseFloat(item.baseWatts) || 0;
      chassisBaseWatts += (base * qty);

      // Maximum rated PoE power supply budget
      const poeBudget = parseFloat(item.poeBudget) || 0;
      nameplatePoEWatts += (poeBudget * qty);

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

    // 5. UPS Sizing Engine (VA = Watts / Power Factor, sized with growth margin)
    const minVA = Math.round(worstCaseAcWatts / powerFactor);
    const recommendedVA = Math.round(minVA * (1 + growthMargin));

    let upsRecommendation = "1000VA 1U Line-Interactive (NEMA 5-15P)";
    let upsFormFactor = "1U / 2U Rackmount";
    let batteryRuntimeEstimate = "12 - 18 minutes on internal battery";

    if (worstCaseAcWatts > 4500) {
      upsRecommendation = "6000VA (6kVA) 4U Online Double-Conversion (Hardwired / L6-30P)";
      upsFormFactor = "4U Modular";
      batteryRuntimeEstimate = "7 - 10 minutes at full load (~25 min with EBP battery pack)";
    } else if (worstCaseAcWatts > 2400) {
      upsRecommendation = "5000VA (5kVA) 3U/4U Online Double-Conversion (NEMA L6-30P 208V)";
      upsFormFactor = "3U / 4U Rackmount";
      batteryRuntimeEstimate = "8 - 12 minutes at full load (~30 min with EBP battery pack)";
    } else if (worstCaseAcWatts > 1600) {
      upsRecommendation = "3000VA 2U Online Double-Conversion (NEMA L5-30P 120V or L6-20P 208V)";
      upsFormFactor = "2U Rackmount";
      batteryRuntimeEstimate = "9 - 14 minutes at full load (~35 min with EBP battery pack)";
    } else if (worstCaseAcWatts > 1000) {
      upsRecommendation = "2200VA 2U Line-Interactive (NEMA 5-20P)";
      upsFormFactor = "2U Rackmount";
      batteryRuntimeEstimate = "10 - 15 minutes at typical operating load";
    } else if (worstCaseAcWatts > 550) {
      upsRecommendation = "1500VA 2U Line-Interactive (NEMA 5-15P)";
      upsFormFactor = "2U Rackmount";
      batteryRuntimeEstimate = "14 - 20 minutes at typical operating load";
    } else {
      upsRecommendation = "1000VA 1U Line-Interactive (NEMA 5-15P)";
      upsFormFactor = "1U Rackmount";
      batteryRuntimeEstimate = "18 - 25 minutes at typical operating load";
    }

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
        batteryRuntimeEstimate
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
  }
};

// Global Browser Exports
window.IEEE_POE_STANDARDS = IEEE_POE_STANDARDS;
window.ELECTRICAL_CONSTANTS = ELECTRICAL_CONSTANTS;
window.NetworkSizer = NetworkSizer;
