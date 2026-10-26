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
    sourceMode: "auto",        // "auto" (uses BOM if >0 cams & !hasCustomGroups, else cameraGroups) | "manual" | "bom"
    hasCustomGroups: false,    // True once the user edits or adds rows in the multi-group calculator
    cameraGroups: [
      {
        id: "grp_1",
        name: "Camera Group 1",
        qty: 32,
        heads: 1,
        resolutionMp: 4,
        fps: 15,
        codec: "H.265",
        sceneActivity: "medium",
        motionDutyPct: 50,
        retentionDays: 30
      }
    ],
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
   * Evaluates a single camera group row and returns its calculated bitrate and storage metrics.
   */
  evaluateCameraGroup(group, fallbackDefaults = {}) {
    const qty = Math.max(0, parseInt(group.qty ?? 1, 10) || 0);
    const resolutionMp = Number(group.resolutionMp ?? fallbackDefaults.resolutionMp ?? 4) || 4;
    const heads = Math.max(1, parseInt(group.heads ?? 1, 10) || 1);
    const fps = Math.max(1, Number(group.fps ?? fallbackDefaults.fps ?? 15) || 15);
    const codec = this.normalizeCodec(group.codec ?? fallbackDefaults.codec ?? "H.265");
    const sceneActivity = group.sceneActivity || fallbackDefaults.sceneActivity || "medium";

    let rawMotion = group.motionDutyPct ?? group.motionDutyCycle ?? fallbackDefaults.motionDutyPct ?? 50;
    if (rawMotion > 0 && rawMotion <= 1) rawMotion = Math.round(rawMotion * 100);
    const motionDutyPct = Math.max(5, Math.min(100, Number(rawMotion) || 50));
    const motionDutyCycle = motionDutyPct / 100;

    const retentionDays = Math.max(1, Number(group.retentionDays ?? fallbackDefaults.retentionDays ?? 30) || 30);
    const customBitrate = Number(group.customBitrateMbps ?? fallbackDefaults.customBitratePerCamMbps ?? 0) || 0;

    // If heads > 1 and resolutionMp is per-head, or if resolutionMp is a single/multi value
    const perHeadMbps = this.calculateSingleStreamBitrateMbps(resolutionMp, codec, fps, sceneActivity, customBitrate);
    const perCameraMbps = Math.round(perHeadMbps * heads * 100) / 100;
    const totalStreams = qty * heads;
    const peakIngressMbps = Math.round(qty * perCameraMbps * 100) / 100;
    const averageRecordingMbps = Math.round(peakIngressMbps * motionDutyCycle * 100) / 100;
    const dailyStorageGb = Math.round(averageRecordingMbps * 10.8 * 10) / 10;
    const netVideoStorageTb = (averageRecordingMbps * 86400 * retentionDays) / 8000000;
    const requiredUsableTb = Math.round(netVideoStorageTb * VIDEO_STORAGE_CONSTANTS.STORAGE_SAFETY_BUFFER * 100) / 100;

    return {
      id: group.id || `grp_${Math.random().toString(36).slice(2, 7)}`,
      name: group.name || "Camera Group",
      qty,
      heads,
      totalStreams,
      resolutionMp,
      fps,
      codec,
      sceneActivity,
      motionDutyPct,
      motionDutyCycle,
      retentionDays,
      perHeadMbps,
      perCameraMbps,
      peakIngressMbps,
      averageRecordingMbps,
      dailyStorageGb,
      requiredUsableTb
    };
  },

  /**
   * Builds a list of camera groups from the active project BOM cameras (grouped by model/resolution).
   */
  buildCameraGroupsFromBom(bomList = [], fallbackDefaults = {}) {
    const map = new Map();
    (bomList || []).forEach(item => {
      if (!item || item.parentInstanceId) return;
      const cat = (item.category || "").toLowerCase();
      const role = (item.role || "").toLowerCase();
      if (cat === "cameras" || cat === "camera" || role === "camera" || (typeof isCameraDevice === "function" && isCameraDevice(item))) {
        const qty = parseInt(item.qty ?? item.quantity, 10) || 1;
        const catRef = (typeof CatalogRegistry !== "undefined" && typeof CatalogRegistry.get === "function")
          ? CatalogRegistry.get(item.id || item.sku)
          : null;
        const optics = this.parseCameraOptics(item, catRef);
        const itemFps = Number(item.defaultFps || catRef?.defaultFps || fallbackDefaults.fps || this.state.fps || 15) || 15;
        const itemCodec = this.normalizeCodec(item.compression || catRef?.compression || fallbackDefaults.codec || this.state.codec || "H.265");
        const key = `${item.sku || item.model || "CAM"}_${optics.mpPerHead}_${optics.heads}_${itemFps}`;
        if (map.has(key)) {
          map.get(key).qty += qty;
        } else {
          map.set(key, {
            id: `bom_${map.size + 1}`,
            name: item.model || item.sku || `BOM ${optics.totalMp}MP Camera`,
            qty,
            heads: optics.heads,
            resolutionMp: optics.mpPerHead,
            fps: itemFps,
            codec: itemCodec,
            sceneActivity: fallbackDefaults.sceneActivity || this.state.sceneActivity || "medium",
            motionDutyPct: fallbackDefaults.motionDutyPct || this.state.motionDutyPct || 50,
            retentionDays: fallbackDefaults.retentionDays || this.state.retentionDays || 30
          });
        }
      }
    });
    return Array.from(map.values());
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
  parseCameraOptics(item, catRef = null) {
    if (!item) return { mpPerHead: 4, heads: 1, totalMp: 4 };
    const ref = catRef || ((typeof CatalogRegistry !== "undefined" && typeof CatalogRegistry.get === "function") ? CatalogRegistry.get(item.id || item.sku) : null);

    // 1. Honor explicit heads & mpPerHead (used by Generic Camera Types and multi-sensor catalog entries)
    const explicitHeads = parseInt(item.heads ?? ref?.heads, 10) || 0;
    const explicitMpPerHead = parseFloat(item.mpPerHead ?? ref?.mpPerHead) || 0;
    const explicitTotalMp = parseFloat(item.sensorMegapixels ?? ref?.sensorMegapixels) || 0;
    if (explicitHeads > 0 && explicitMpPerHead > 0) {
      return {
        mpPerHead: explicitMpPerHead,
        heads: explicitHeads,
        totalMp: explicitTotalMp || (explicitHeads * explicitMpPerHead)
      };
    }

    const resStr = String(item.resolution || ref?.resolution || item.model || "");
    let totalMp = explicitTotalMp;
    if (!totalMp) {
      const m = resStr.match(/(\d+)\s*MP/i);
      if (m) totalMp = parseInt(m[1], 10);
      else if (/4K/i.test(resStr)) totalMp = 8;
      else if (/1080p/i.test(resStr)) totalMp = 2;
      else if (/720p/i.test(resStr)) totalMp = 1;
      else totalMp = 4;
    }

    let heads = explicitHeads || 1;
    if (!explicitHeads) {
      if (/5-sensor|4x.*ptz/i.test(resStr + " " + (item.formFactor || "") + " " + (item.model || ""))) heads = 5;
      else if (/4x|quad|multi-sensor.*4|360.*multi/i.test(resStr + " " + (item.formFactor || ""))) heads = 4;
      else if (/3x|triple|multi-sensor.*3/i.test(resStr + " " + (item.formFactor || ""))) heads = 3;
      else if (/2x|dual-head|dual-sensor|bi-directional/i.test(resStr + " " + (item.formFactor || ""))) heads = 2;
    }

    const mpPerHead = explicitMpPerHead || (heads > 1 && totalMp >= heads * 2 ? Math.round(totalMp / heads) : totalMp);
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

    // 3. Determine active camera groups & aggregate bitrate/storage across all groups
    const sourceMode = overrides.sourceMode || this.state.sourceMode || "auto";
    const useBomCameras = (sourceMode === "bom") || (sourceMode === "auto" && bomCameraUnits > 0 && !this.state.hasCustomGroups && !overrides.forceManual);

    const fallbackDefaults = {
      resolutionMp,
      fps,
      codec,
      sceneActivity,
      motionDutyPct,
      retentionDays,
      customBitratePerCamMbps
    };

    let rawGroups = [];
    if (Array.isArray(overrides.cameraGroups) && overrides.cameraGroups.length > 0) {
      rawGroups = overrides.cameraGroups;
    } else if (useBomCameras && bomCameraUnits > 0) {
      rawGroups = this.buildCameraGroupsFromBom(bomList, fallbackDefaults);
    } else if (sourceMode === "bom" && bomCameraUnits === 0) {
      rawGroups = [];
    } else if (Array.isArray(this.state.cameraGroups) && this.state.cameraGroups.length > 0) {
      rawGroups = this.state.cameraGroups;
    } else {
      rawGroups = [{
        id: "grp_1",
        name: "Camera Group 1",
        qty: Math.max(0, parseInt(overrides.manualCameraCount ?? this.state.manualCameraCount ?? 32, 10) || 0),
        heads: 1,
        resolutionMp,
        fps,
        codec,
        sceneActivity,
        motionDutyPct,
        retentionDays
      }];
    }

    const evaluatedGroups = rawGroups.map(g => this.evaluateCameraGroup(g, fallbackDefaults));

    let cameraUnits = 0;
    let totalSensorHeads = 0;
    let peakIngressMbps = 0;
    let averageRecordingMbps = 0;
    let dailyStorageGb = 0;
    let requiredUsableTb = 0;

    evaluatedGroups.forEach(eg => {
      cameraUnits += eg.qty;
      totalSensorHeads += eg.totalStreams;
      peakIngressMbps += eg.peakIngressMbps;
      averageRecordingMbps += eg.averageRecordingMbps;
      dailyStorageGb += eg.dailyStorageGb;
      requiredUsableTb += eg.requiredUsableTb;
    });

    peakIngressMbps = Math.round(peakIngressMbps * 100) / 100;
    averageRecordingMbps = Math.round(averageRecordingMbps * 100) / 100;
    dailyStorageGb = Math.round(dailyStorageGb * 10) / 10;
    requiredUsableTb = Math.round(requiredUsableTb * 100) / 100;
    const theoreticalRawTb = Math.round(requiredUsableTb * raidDef.approxRawMultiplier * 100) / 100;
    const perCameraSingleStreamMbps = cameraUnits > 0
      ? Math.round((peakIngressMbps / cameraUnits) * 100) / 100
      : this.calculateSingleStreamBitrateMbps(resolutionMp, codec, fps, sceneActivity, customBitratePerCamMbps);

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
      cameraGroups: evaluatedGroups,
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

// =========================================================================
// 7. GENETEC STREAMVAULT APPLIANCE & SECURITY CENTER LICENSING SIZER
// =========================================================================

const GenetecLicensingSizer = {
  /**
   * Official Partner Software Development Kit (SDK) Integrations from Genetec Licensing.xls
   * Supports multi-selection of any combination of Partner SDKs simultaneously.
   */
  PARTNER_SDK_OPTIONS: [
    { key: 'corsight_ai', sku: 'GSC-1SDK-BAPS-SYFTYCORSIGHTAI', label: 'Corsight AI Fortify Facial Recognition (Syfty Suite v1.1)', ruleHint: 'Default 2 connections: 1 Syfty Event Processor + 1 Overlay Service / Plugin Role ($250/conn • Requires H.264 & Media Gateway RTSPS Off)', defaultQty: 2, catalogId: 'genetec-sdk-corsight-ai', msrp: 250, datasheet: 'Datasheets/Genetec/Plugins/Corsight Syfty Genetec - User Guide 2026.pdf' },
    { key: 'briefcam', sku: 'GSC-1SDK-BRIEFCAM', label: 'BriefCam Video Synopsis & Analytics (REVIEW / RESPOND / RESEARCH)', ruleHint: 'Default 4 connections: 1 VSServer + Fetch/GPU + Embedded Clients + 1 Spare ($250/conn)', defaultQty: 4, catalogId: 'genetec-sdk-briefcam', msrp: 250, datasheet: 'Datasheets/Genetec/Plugins/BriefCam_Corsight_Video_Analytics_Genetec_Integration.pdf' },
    { key: 'allied_streamconnect', sku: 'GSC-1SDK-ALLIEDTELESIS-STREAMC', label: 'Allied Telesis StreamConnect v2.1 PoE Switch Integration', ruleHint: 'Default 4 instances: 1 per Main/Archiver Server + 1 per open Switch Mgmt task / Security Desk tile widget ($250/instance)', defaultQty: 4, catalogId: 'genetec-sdk-allied-streamconnect', msrp: 250, datasheet: 'Datasheets/Genetec/Plugins/StreamConnect_for_Genetec_v2_1_User_Guide.pdf' },
    { key: 'lsp_netlink', sku: 'GSC-1SDK-LSP-NETLINK', label: 'LifeSafety Power NetLink Power Monitoring', ruleHint: '1 SDK connection per NetLink server instance ($250/conn)', defaultQty: 1, catalogId: 'genetec-sdk-lsp-netlink', msrp: 250, datasheet: 'Datasheets/Genetec/SupportedPlugins.pdf' },
    { key: 'amg_ndm', sku: 'GSC-1SDK-AMG-NDM', label: 'AMG Systems Network Device Management', ruleHint: '1 SDK connection per AMG NDM instance ($250/conn)', defaultQty: 1, catalogId: 'genetec-sdk-amg-ndm', msrp: 250, datasheet: 'Datasheets/Genetec/SupportedPlugins.pdf' },
    { key: 'hid_is', sku: 'GSC-1SDK-HID-IS', label: 'HID Integration Services / Origo Mobile / FARGO Connect', ruleHint: '1 SDK connection per HID Integration Service ($250/conn)', defaultQty: 1, catalogId: 'genetec-sdk-hid-is', msrp: 250, datasheet: 'Datasheets/Genetec/SupportedPlugins.pdf' },
    { key: 'schlage_wifilock', sku: 'GSC-1SDK-SCHLAGE-WIFILOCK', label: 'Schlage NDE / LE Wi-Fi Lock Server', ruleHint: '1 SDK connection per Schlage Engage server ($250/conn)', defaultQty: 1, catalogId: 'genetec-sdk-schlage-wifilock', msrp: 250, datasheet: 'Datasheets/Genetec/SupportedPlugins.pdf' },
    { key: 'aa_accentra', sku: 'GSC-1SDK-AA-ACCENTRA', label: 'Assa Abloy Accentra Lock Integration', ruleHint: '1 SDK connection per Accentra sync service ($250/conn)', defaultQty: 1, catalogId: 'genetec-sdk-aa-accentra', msrp: 250, datasheet: 'Datasheets/Genetec/SupportedPlugins.pdf' },
    { key: 'alcatraz_rock', sku: 'GSC-1SDK-ALCATRAZ-ROCK', label: 'Alcatraz AI The Rock Facial Authentication', ruleHint: '1 SDK connection per Alcatraz AI Cloud/On-Prem bridge ($250/conn)', defaultQty: 1, catalogId: 'genetec-sdk-alcatraz-rock', msrp: 250, datasheet: 'Datasheets/Genetec/SupportedPlugins.pdf' },
    { key: 'raptor_connect', sku: 'GSC-1SDK-RAPTOR-CONNECT', label: 'Raptor Connect / Envoy / iLobby Visitor Management', ruleHint: '1 SDK connection per visitor management gateway ($250/conn)', defaultQty: 1, catalogId: 'genetec-sdk-raptor-connect', msrp: 250, datasheet: 'Datasheets/Genetec/SupportedPlugins.pdf' },
    { key: 'omnilert_gundetect', sku: 'GSC-1SDK-OMNILERT-GUNDETECT', label: 'Omnilert / Amberbox / EAGL Gunshot Detection', ruleHint: '1 SDK connection per gunshot detection server ($250/conn)', defaultQty: 1, catalogId: 'genetec-sdk-omnilert-gundetect', msrp: 250, datasheet: 'Datasheets/Genetec/SupportedPlugins.pdf' },
    { key: 'senstar_nms', sku: 'GSC-1SDK-SENSTAR-NMS', label: 'Senstar Network Manager Perimeter Intrusion', ruleHint: '1 SDK connection per Senstar NMS gateway ($250/conn)', defaultQty: 1, catalogId: 'genetec-sdk-senstar-nms', msrp: 250, datasheet: 'Datasheets/Genetec/SupportedPlugins.pdf' },
    { key: 'commend_duetto', sku: 'GSC-1SDK-COMMEND-DUETTO', label: 'Commend Duetto / Symphony Intercom Interface', ruleHint: '1 SDK connection per Commend interface ($250/conn)', defaultQty: 1, catalogId: 'genetec-sdk-commend-duetto', msrp: 250, datasheet: 'Datasheets/Genetec/SupportedPlugins.pdf' }
  ],

  /**
   * Official Intrusion Alarm Panel Manufacturer SKUs from Genetec Licensing.xls
   */
  INTRUSION_PANEL_BRANDS: {
    bosch: { sku: 'GSC-1AP-Bosch', model: 'Genetec Security Center — 1 Bosch B/G Series Intrusion Alarm Panel Connection', catalogId: 'genetec-intrusion-1ap' },
    dmp: { sku: 'GSC-1AP-DMP', model: 'Genetec Security Center — 1 Digital Monitoring Products (DMP) Intrusion Alarm Panel Connection', catalogId: 'genetec-intrusion-dmp' },
    dsc: { sku: 'GSC-1AP-DSC', model: 'Genetec Security Center — 1 Digital Security Controls (DSC PowerSeries) Intrusion Alarm Panel Connection', catalogId: 'genetec-intrusion-dsc' },
    honeywell: { sku: 'GSC-1AP-CDC3-HW', model: 'Genetec Security Center — 1 Honeywell Vista / Dimension Intrusion Alarm Panel Connection', catalogId: 'genetec-intrusion-honeywell' },
    bosch_map5000: { sku: 'GSC-1AP-BOSCHMAP5000', model: 'Genetec Security Center — 1 Bosch MAP5000 Intrusion Alarm Panel Connection', catalogId: 'genetec-intrusion-bosch-map5000' },
    vanderbilt_spc: { sku: 'GSC-1AP-CDC2-SPC', model: 'Genetec Security Center — 1 Vanderbilt SPC Intrusion Alarm Panel Connection', catalogId: 'genetec-intrusion-vanderbilt-spc' }
  },

  /**
   * Default configuration for the Genetec Security Center 5.13 / 5.14 License & Appliance Designer
   */
  getDefaultConfig() {
    return {
      tierMode: 'auto',                        // 'auto' | 'aio' | 'standard' | 'enterprise'
      advantageYears: 1,                       // 1 | 3 | 5
      advantage247: false,                     // ADV-OPTION-247-1Y ($6,000) / 3Y ($14,400) / 5Y ($21,000)
      coreFailover: 'none',                    // 'none' | 'directory_only' (Backup and Restore) | 'full' (Triggers SQL Standard)
      // Client Connections (in Main Area)
      workstationClients: 5,                   // 25 free in GSC-BASE-S, Unlimited free in GSC-BASE-E
      mobileClients: 0,                        // GSC-1MobileU ($250/user) or GSC-1MobileSTU ($10,000 site license at 40+ users)
      webClients: 0,                           // GSC-1WU ($200/user; included free in GSC-BASE-E Site Login)
      // Feature Toggles (hide extra licenses for each feature until turned ON)
      enableFederation: false,                 // Toggle (Card 1): Multi-Site Security Center Federation
      enableCardholderSync: false,             // Toggle (Card 1): Global Cardholder Synchronizer & Card Sync Plugin
      enableEncodersDvr: false,                // Toggle (Card 2): Analog Video Encoders & Third-Party DVR/NVR Channels
      enableSipelia: false,                    // Toggle (Card 2): Sipelia Intercom Communications (Standard / Advanced / Unified)
      enableLpr: false,                        // Toggle (Card 2): AutoVu Fixed License Plate Recognition (LPR)
      enableCloudServices: false,              // Toggle (Card 2): Omnicast Cloud Archives & Genetec Clearance
      enableVideoFailover: false,              // Toggle (Card 2): Standby Archiver Failover & 3rd-Party Standby Clustering
      enableBiometricsIdentity: false,         // Toggle (Card 3): Biometrics (Suprema, IDEMIA, iDBridge, Princeton), ID Scanners & Mustering
      enableClearId: false,                    // Toggle (Card 3): Genetec ClearID Self-Service Access & Visitor Management
      enableKeyManagement: false,              // Toggle (Card 3): Medeco XT Intelligent Keys & Key Management Cabinets
      enablePartnerSdks: false,                // Toggle (Card 4): Multi-Select Partner SDKs (Corsight AI, BriefCam, StreamConnect, etc.)
      enableBuildingPsim: false,               // Toggle (Card 4): WinGuard PSIM, Elevator Dispatch, OPC Server & Mission Control
      enableIiot: false,                       // Toggle (Card 4): Industrial Internet of Things (BACnet, Modbus, SNMP, MQTT)
      enableIntrusionPanels: false,            // Toggle (Card 5): Intrusion Alarm Panels (Bosch, DMP, DSC, Honeywell, Vanderbilt)
      enableRsa: false,                        // Toggle (Card 5): Restricted Security Area (RSA) — Quanergy, SpotterRF, Southwest Microwave
      // Main System Multi-Site Federation, Global Cardholder Synchronizer & Card Sync Plugin
      federationSites: 0,                      // GSC-1SCFED ($1,000/site >20 entities)
      federationSmallSites: 0,                 // GSC-1SCFED-20 ($600/site <=20 entities)
      stratocastFedSites: 0,                   // GSC-Om-E-1CCFED ($125/site)
      globalCardholderSystems: 0,              // GSC-Sy-E-1GCHM ($1,950/remote system) or GSC-SY-E-1GCHMSTU ($78,000 Site License at 40+ systems)
      cardSyncDataSources: 0,                  // Card Synchronization Plugin external HR/SQL/LDAP sources (GSC-1PSINGLECARD @ $4,000 per 2 sources)
      // Omnicast Video, Sipelia Intercom (Standard vs Advanced vs Unified 5.13), AutoVu LPR & Cloud Archives
      analogEncoderChannels: 0,                // GSC-OM-S-1PAC ($60) / GSC-OM-E-1PAC ($100) / GSC-SV-AIO-1PAC ($36)
      dvrNvrChannels: 0,                       // GSC-Om-E-1DV ($130)
      sipeliaMode: 'unified_513',              // 'unified_513' ($295/station) | 'standard' ($1,500 Base + $160/station) | 'advanced' ($1,500 Base + $160 STD + $100 ADV/station)
      sipIntercomsOverride: null,              // null = auto-detect from BOM
      sipTrunks: 0,                            // GSC-Sipelia-1Trunk ($550)
      sipPublicAddress: 0,                     // GSC-SIPELIA-1PA ($550)
      lprCamerasOverride: null,                // null = auto-detect from BOM (GSC-Av-S-1SHP $500 + ADV-LPR-F)
      cloudArchiveTb: 0,
      cloudArchiveTier: 'performance',         // 'performance' ($257/TB/yr) | 'long_term' ($122/TB/yr)
      clearanceCameras: 0,                     // CLR-1CCST1-US-1Y ($24/cam/yr)
      failoverMode: 'none',                    // 'none' | 'all' | 'custom' (Included $0 in GSC-BASE-E)
      customFailoverCameras: 0,
      standbyServerCount: 0,                   // GSC-StandbyServer ($1,500/server for 3rd-party Windows/NEC clustering)
      // Synergis Access Control Readers
      synergisGenetecReaders: 0,               // GSC-SY-S-1RE ($65) / GSC-SY-E-1RE ($125) / GSC-SV-AIO-1R ($175) + ADV-RDR
      synergisExternalReaders: 0,              // GSC-Sy-S-1R ($175) / GSC-Sy-E-1R ($260) / GSC-SV-AIO-1R ($175) + ADV-RDR
      // Biometrics (Suprema Plugin for Genetec v1.00 EN 102.00.SPG), Identity, ClearID & Medeco XT
      supremaDevices: 0,                       // Suprema Biometric Readers/Devices (Up to 256 per Suprema Device Plugin; up to 50 per Dedicated Cloud Link)
      supremaPluginServers: 0,                 // Suprema Plugin Servers (Requires 3x GSC-1SDK-SUPREMA-READ @ $250 = $750 per Server per Page 16)
      supremaEndpoints: 0,                     // Legacy compatibility alias
      idemiaMorphoEnabled: false,              // IDEMIA MorphoManager Biometrics Integration (GSC-1PMORPHOBIOMETRICS @ $2,500/system)
      controlIdBridgeServers: 0,               // Control iD iDBridge Servers (GSC-1SDK-CONTROLID-IDBRIDGE @ $250/server)
      princetonIdentityServers: 0,             // Princeton Identity Access Control Suite Servers (GSC-1SDK-PRINCETONIDENTITY-ACS @ $250/server)
      clearIdIdentities: 0,                    // Genetec ClearID Active Identities (CID-IDENTITY-1Y/3Y/5Y tiered pricing)
      clearIdKiosks: 0,                        // Genetec ClearID Visitor Self-Check-In Kiosks (CID-KIOSK-LIC-1Y/3Y/5Y)
      idScannerClients: 0,                     // Document/Passport/Driver's License ID Scanner Workstations (GSC-1PIDSCANNER @ $500/workstation)
      xpressEntryServers: 0,                   // Telaeris XpressEntry Handheld Badge & Mustering Servers (GSC-1SDK-TELAERIS-XPRESSENTRY @ $250/server)
      medecoXtLocks: 0,                        // Medeco XT Intelligent Keys & Offline Locks (GSC-1PMEDECOBASE $1,000 + GSC-1P-OFFLINELOCK-1L $40/lock)
      keyCabinetCount: 0,                      // GSC-1P-KEYCABINETBASE ($1,500) + GSC-1PKEYWATCHER ($500/cabinet)
      // Multi-Select Software Development Kit (SDK) Connections, PSIM & IIoT
      genericSdkConnections: 0,                // GSC-1SDK ($250/connection)
      selectedPartnerSdks: {},                 // Multi-select map: { [sdkKey]: connectionQty }
      partnerSdkKey: 'none',                   // Legacy single-select compatibility
      partnerSdkConnections: 0,                // Legacy single-select compatibility
      briefCamConnections: 0,                  // Legacy compatibility (mapped into selectedPartnerSdks.briefcam)
      corsightAiBridges: 0,                    // Legacy compatibility (mapped into selectedPartnerSdks.corsight_ai)
      winGuardNodes: 0,                        // Advancis WinGuard PSIM Interface Nodes (GSC-1SDK-ADVANCIS-WINGUARD @ $250/node)
      elevatorDispatchSystems: 0,              // GSC-1POTIS-COMPASS / KONE / TKE / MCE ($8,000)
      opcServerSystems: 0,                     // GSC-1POPC-S ($8,000)
      missionControlOperators: 0,              // GSC-MC-1Opp ($0) + ADV-MC-1OPP-1Y/3Y/5Y ($3,000 / $7,200 / $10,500)
      iiotMode: 'none',                        // 'none' | 'devices' ($149/device) | 'site' ($6,000 Unlimited Site)
      iiotDevices: 0,
      // Dedicated Intrusion Alarm Panels & Restricted Security Area (RSA) Surveillance
      intrusionPanels: 0,                      // GSC-1AP-* ($350/panel + ADV-1AP)
      intrusionPanelManufacturer: 'bosch',     // 'bosch' | 'dmp' | 'dsc' | 'honeywell' | 'bosch_map5000' | 'vanderbilt_spc'
      rsaTier: 'none',                         // 'none' | 'standard' ($1,000) | 'pro' ($7,000) | 'enterprise' ($14,000)
      rsaShortRangeSensors: 0,                 // GSC-GAP-RSA-1SRS ($175/sensor — Quanergy M8 LiDAR, Optex PIE-1, Axis, Magos SR)
      rsaRadars: 0,                            // GSC-GAP-RSA-1RAD ($1,000/radar — SpotterRF, FLIR Ranger, Echodyne, Navtech)
      rsaFenceControllers: 0,                  // GSC-GAP-RSA-1FEN ($2,000/PIDS — Southwest Microwave INTREPID, Senstar, FFT)
      rsaFenceKm: 0,                           // GSC-GAP-RSA-1KM ($2,000) / 10KM ($5,000) / 100KM ($15,000)
      swmRpmUnits: 0,                          // Southwest Microwave INTREPID RPM II Standalone Plugin (GSC-1PSWM-RPMII @ $6,500 per 5 units)
      applianceFormFactor: 'rack'              // 'rack' | 'tower' | 'any'
    };
  },

  /**
   * Recommends the optimal Streamvault Server and Workstation appliances
   * based on storage, bitrate, camera count, RAID level, and Core Failover mode.
   */
  recommendStreamvaultAppliances(videoLoad, licConfig, bomMeta) {
    const serversDb = (typeof window !== 'undefined' && Array.isArray(window.SERVERS_DATABASE))
      ? window.SERVERS_DATABASE
      : [];
    const workstationsDb = (typeof window !== 'undefined' && Array.isArray(window.WORKSTATIONS_DATABASE))
      ? window.WORKSTATIONS_DATABASE
      : [];

    const cams = videoLoad.cameraUnits || 0;
    const reqTb = videoLoad.requiredUsableTb || 0;
    const reqMbps = videoLoad.peakIngressMbps || 0;
    const raid = videoLoad.raidLevel || 'RAID5';
    const formPref = licConfig.applianceFormFactor || 'rack';

    // Filter Streamvault Network Video Recorder / Archiver appliances
    const svServers = serversDb.filter(s => s.isStreamvault && s.serverType === 'nvr_vms');

    let primaryAppliance = null;
    let primaryQty = 1;
    let archiverReason = '';

    if (cams > 0) {
      let candidates = svServers.slice().sort((a, b) => (a.msrp || 0) - (b.msrp || 0));
      const standardCandidates = candidates.filter(s => !String(s.applianceSeries || '').startsWith('SVR-') && s.applianceSeries !== 'SV-7000EX');

      if (formPref === 'rack') {
        const rackOnly = standardCandidates.filter(s => (s.rackUnits || 0) >= 1);
        if (rackOnly.length > 0) candidates = rackOnly;
      } else if (formPref === 'tower') {
        const towerOnly = standardCandidates.filter(s => (s.rackUnits || 0) === 0);
        if (towerOnly.length > 0) candidates = towerOnly;
      } else {
        candidates = standardCandidates;
      }

      if (raid === 'RAID6') {
        const raid6Pool = candidates.filter(s => String(s.raidSupport || '').includes('RAID 6'));
        if (raid6Pool.length > 0) candidates = raid6Pool;
      } else if (raid === 'RAID5') {
        const raid5Pool = candidates.filter(s => String(s.raidSupport || '').includes('RAID 5') || String(s.raidSupport || '').includes('RAID 6'));
        if (raid5Pool.length > 0) candidates = raid5Pool;
      }

      const singleFit = candidates.find(s =>
        (s.usableStorageTb || 0) >= reqTb &&
        (s.maxRecordMbps || s.maxThroughputMbps || 300) >= reqMbps &&
        (s.maxCameras || 300) >= cams
      );

      if (singleFit) {
        primaryAppliance = singleFit;
        primaryQty = 1;
        archiverReason = `Single ${singleFit.sku} satisfies ${reqTb} TB usable storage (${singleFit.usableStorageTb} TB capacity) and ${reqMbps} Mbps recording throughput (${singleFit.maxThroughputMbps} Mbps maximum).`;
      } else {
        const scaleTarget = candidates.find(s => s.id === 'genetec-sv-2041e-r15' && reqTb <= 600)
          || candidates[candidates.length - 1]
          || svServers[0];
        if (scaleTarget) {
          const qtyByTb = scaleTarget.usableStorageTb > 0 ? Math.ceil(reqTb / scaleTarget.usableStorageTb) : 1;
          const recCapMbps = scaleTarget.maxRecordMbps || scaleTarget.maxThroughputMbps || 600;
          const qtyByMbps = recCapMbps > 0 ? Math.ceil(reqMbps / recCapMbps) : 1;
          const qtyByCams = scaleTarget.maxCameras > 0 ? Math.ceil(cams / scaleTarget.maxCameras) : 1;
          primaryAppliance = scaleTarget;
          primaryQty = Math.max(1, qtyByTb, qtyByMbps, qtyByCams);
          archiverReason = `${primaryQty}x ${scaleTarget.sku} provides ${(primaryQty * scaleTarget.usableStorageTb).toFixed(1)} TB usable storage and ${primaryQty * scaleTarget.maxThroughputMbps} Mbps throughput across ${videoLoad.genetec?.activeArchiverRoles || 1} Archiver role(s).`;
        }
      }
    }

    // Check if Dedicated Directory / Core Failover Server is needed (>300 cameras or Core Failover enabled)
    let directoryAppliance = null;
    let directoryQty = 0;
    const hasCoreFailover = licConfig.coreFailover === 'directory_only' || licConfig.coreFailover === 'full';
    if (cams > 300 || hasCoreFailover) {
      directoryAppliance = serversDb.find(s => s.id === 'genetec-sv-7041ex-r6s') || serversDb.find(s => s.id === 'genetec-sv-1041e-rs2');
      directoryQty = (cams > 300 && hasCoreFailover) ? 2 : 1;
    }

    // Recommend Streamvault Workstation (SVW-100E, SVW-300E-T3, SVW-500E-R)
    let workstationAppliance = null;
    if (cams > 64) {
      workstationAppliance = workstationsDb.find(w => w.id === 'genetec-svw-502e-soc-workstation') || workstationsDb[0];
    } else if (cams > 16) {
      workstationAppliance = workstationsDb.find(w => w.id === 'genetec-svw-300e-t3') || workstationsDb[0];
    } else {
      workstationAppliance = workstationsDb.find(w => w.id === 'genetec-svw-100e-micro') || workstationsDb[0];
    }

    return {
      primaryAppliance,
      primaryQty,
      archiverReason,
      directoryAppliance,
      directoryQty,
      analyticsAppliance: null,
      analyticsQty: 0,
      workstationAppliance,
      recommendedWorkstationQty: Math.max(1, bomMeta.quotedWorkstationUnits || 1),
      allStreamvaultServers: svServers
    };
  },

  /**
   * Calculates the complete Genetec Security Center 5.13/5.14 License & Advantage Maintenance BOM,
   * enforces SQL Server 2025 Express (50 GB Cap) vs SQL Server Standard (when Core Failover = Full),
   * and returns recommended Streamvault appliances.
   */
  calculate(bomList = [], customConfig = {}) {
    const baseConfig = Object.assign(
      this.getDefaultConfig(),
      (typeof window !== 'undefined' && window.genetecLicensingConfig) ? window.genetecLicensingConfig : {},
      customConfig
    );

    const videoLoad = VideoStorageSizer.calculateFromBOM(bomList);
    const cameraUnits = videoLoad.cameraUnits || 0;
    const activeArchiverRoles = videoLoad.genetec?.activeArchiverRoles || 1;

    // Inspect BOM for specialized devices
    let bomLprCameras = 0;
    let bomIntercoms = 0;
    let bomWorkstations = 0;
    let hasSv300AioInBom = false;

    if (Array.isArray(bomList)) {
      bomList.forEach(entry => {
        const item = entry.item || {};
        const qty = Number(entry.qty) || 0;
        if (qty <= 0) return;
        const text = `${item.id || ''} ${item.sku || ''} ${item.model || ''} ${item.subcategory || ''}`.toLowerCase();
        if (item.category === 'cameras' && (text.includes('lpr') || text.includes('anpr') || text.includes('autovu') || text.includes('sharp'))) {
          bomLprCameras += qty;
        }
        if (text.includes('intercom') || text.includes('sipelia') || text.includes('door station')) {
          bomIntercoms += qty;
        }
        if (item.category === 'workstations' || item.role === 'Workstation') {
          bomWorkstations += qty;
        }
        if (item.id === 'genetec-sv-300e-sff' || String(item.applianceSeries || '') === 'SV-300E') {
          hasSv300AioInBom = true;
        }
      });
    }

    // Feature Toggle States (auto-enable if BOM has matching devices or if user already set non-zero values)
    const enableFederation = baseConfig.enableFederation !== undefined
      ? Boolean(baseConfig.enableFederation)
      : ((Number(baseConfig.federationSites) || 0) > 0 || (Number(baseConfig.federationSmallSites) || 0) > 0 || (Number(baseConfig.stratocastFedSites) || 0) > 0);

    const enableCardholderSync = baseConfig.enableCardholderSync !== undefined
      ? Boolean(baseConfig.enableCardholderSync)
      : ((Number(baseConfig.globalCardholderSystems) || 0) > 0 || (Number(baseConfig.cardSyncDataSources) || 0) > 0);

    const enableEncodersDvr = baseConfig.enableEncodersDvr !== undefined
      ? Boolean(baseConfig.enableEncodersDvr)
      : ((Number(baseConfig.analogEncoderChannels) || 0) > 0 || (Number(baseConfig.dvrNvrChannels) || 0) > 0);

    const enableSipelia = baseConfig.enableSipelia !== undefined
      ? Boolean(baseConfig.enableSipelia)
      : (bomIntercoms > 0 || (Number(baseConfig.sipIntercomsOverride) || 0) > 0 || (Number(baseConfig.sipTrunks) || 0) > 0 || (Number(baseConfig.sipPublicAddress) || 0) > 0);

    const enableLpr = baseConfig.enableLpr !== undefined
      ? Boolean(baseConfig.enableLpr)
      : (bomLprCameras > 0 || (Number(baseConfig.lprCamerasOverride) || 0) > 0);

    const enableCloudServices = baseConfig.enableCloudServices !== undefined
      ? Boolean(baseConfig.enableCloudServices)
      : ((Number(baseConfig.cloudArchiveTb) || 0) > 0 || (Number(baseConfig.clearanceCameras) || 0) > 0);

    const enableVideoFailover = baseConfig.enableVideoFailover !== undefined
      ? Boolean(baseConfig.enableVideoFailover)
      : ((baseConfig.failoverMode && baseConfig.failoverMode !== 'none') || (Number(baseConfig.standbyServerCount) || 0) > 0);

    const enableBiometricsIdentity = baseConfig.enableBiometricsIdentity !== undefined
      ? Boolean(baseConfig.enableBiometricsIdentity)
      : (
          (Number(baseConfig.supremaDevices) || 0) > 0 ||
          (Number(baseConfig.supremaPluginServers) || 0) > 0 ||
          (Number(baseConfig.supremaEndpoints) || 0) > 0 ||
          Boolean(baseConfig.idemiaMorphoEnabled) ||
          (Number(baseConfig.controlIdBridgeServers) || 0) > 0 ||
          (Number(baseConfig.princetonIdentityServers) || 0) > 0 ||
          (Number(baseConfig.idScannerClients) || 0) > 0 ||
          (Number(baseConfig.xpressEntryServers) || 0) > 0
        );

    const enableClearId = baseConfig.enableClearId !== undefined
      ? Boolean(baseConfig.enableClearId)
      : ((Number(baseConfig.clearIdIdentities) || 0) > 0 || (Number(baseConfig.clearIdKiosks) || 0) > 0);

    const enableKeyManagement = baseConfig.enableKeyManagement !== undefined
      ? Boolean(baseConfig.enableKeyManagement)
      : ((Number(baseConfig.medecoXtLocks) || 0) > 0 || (Number(baseConfig.keyCabinetCount) || 0) > 0);

    const enableBuildingPsim = baseConfig.enableBuildingPsim !== undefined
      ? Boolean(baseConfig.enableBuildingPsim)
      : (
          (Number(baseConfig.winGuardNodes) || 0) > 0 ||
          (Number(baseConfig.elevatorDispatchSystems) || 0) > 0 ||
          (Number(baseConfig.opcServerSystems) || 0) > 0 ||
          (Number(baseConfig.missionControlOperators) || 0) > 0
        );

    const rawPartnerSdkMap = (baseConfig.selectedPartnerSdks && typeof baseConfig.selectedPartnerSdks === 'object')
      ? Object.assign({}, baseConfig.selectedPartnerSdks)
      : {};
    if (baseConfig.partnerSdkKey && baseConfig.partnerSdkKey !== 'none' && (Number(baseConfig.partnerSdkConnections) || 0) > 0) {
      if (!rawPartnerSdkMap[baseConfig.partnerSdkKey]) {
        rawPartnerSdkMap[baseConfig.partnerSdkKey] = Math.max(1, Number(baseConfig.partnerSdkConnections) || 1);
      }
    }
    if ((Number(baseConfig.briefCamConnections) || 0) > 0 && !rawPartnerSdkMap.briefcam) {
      rawPartnerSdkMap.briefcam = Number(baseConfig.briefCamConnections);
    }
    if ((Number(baseConfig.corsightAiBridges) || 0) > 0 && !rawPartnerSdkMap.corsight_ai) {
      rawPartnerSdkMap.corsight_ai = Number(baseConfig.corsightAiBridges);
    }
    const hasAnyPartnerSdkSelected = Object.values(rawPartnerSdkMap).some(v => (Number(v) || 0) > 0) || (Number(baseConfig.genericSdkConnections) || 0) > 0;
    const enablePartnerSdks = baseConfig.enablePartnerSdks !== undefined
      ? Boolean(baseConfig.enablePartnerSdks)
      : hasAnyPartnerSdkSelected;

    const enableIiot = baseConfig.enableIiot !== undefined
      ? Boolean(baseConfig.enableIiot)
      : (Boolean(baseConfig.iiotMode && baseConfig.iiotMode !== 'none'));

    const enableIntrusionPanels = baseConfig.enableIntrusionPanels !== undefined
      ? Boolean(baseConfig.enableIntrusionPanels)
      : ((Number(baseConfig.intrusionPanels) || 0) > 0);

    const enableRsa = baseConfig.enableRsa !== undefined
      ? Boolean(baseConfig.enableRsa)
      : (
          (baseConfig.rsaTier && baseConfig.rsaTier !== 'none') ||
          (Number(baseConfig.rsaShortRangeSensors) || 0) > 0 ||
          (Number(baseConfig.rsaRadars) || 0) > 0 ||
          (Number(baseConfig.rsaFenceControllers) || 0) > 0 ||
          (Number(baseConfig.rsaFenceKm) || 0) > 0 ||
          (Number(baseConfig.swmRpmUnits) || 0) > 0
        );

    // Gated effective quantities based on Feature Toggles
    const effectiveLprCameras = enableLpr
      ? (baseConfig.lprCamerasOverride !== null && baseConfig.lprCamerasOverride !== undefined
          ? Math.max(0, Number(baseConfig.lprCamerasOverride) || 0)
          : Math.max(1, bomLprCameras))
      : 0;

    const rawSipOverride = baseConfig.sipIntercomsOverride !== null && baseConfig.sipIntercomsOverride !== undefined
      ? baseConfig.sipIntercomsOverride
      : baseConfig.sipeliaOverride;
    const effectiveSipIntercoms = enableSipelia
      ? (rawSipOverride !== null && rawSipOverride !== undefined
          ? Math.max(0, Number(rawSipOverride) || 0)
          : Math.max(1, bomIntercoms))
      : 0;
    const sipeliaMode = ['unified_513', 'standard', 'advanced'].includes(baseConfig.sipeliaMode)
      ? baseConfig.sipeliaMode
      : 'unified_513';
    const sipTrunks = enableSipelia ? Math.max(0, Number(baseConfig.sipTrunks) || 0) : 0;
    const sipPublicAddress = enableSipelia ? Math.max(0, Number(baseConfig.sipPublicAddress) || 0) : 0;

    const analogEncoderChannels = enableEncodersDvr ? Math.max(0, Number(baseConfig.analogEncoderChannels ?? baseConfig.analogCameras) || 0) : 0;
    const dvrNvrChannels = enableEncodersDvr ? Math.max(0, Number(baseConfig.dvrNvrChannels ?? baseConfig.dvrNvrCameras) || 0) : 0;
    const totalVideoConnections = cameraUnits + analogEncoderChannels + dvrNvrChannels;

    // Access Control: Only Readers (Genetec-Supplied Hardware Readers + Third-Party Hardware Readers)
    const synergisGenetecReaders = Math.max(0, Number(baseConfig.synergisGenetecReaders) || 0);
    const synergisExternalReaders = Math.max(0, Number(baseConfig.synergisExternalReaders) || 0);
    const totalSynergisReaders = synergisGenetecReaders + synergisExternalReaders;

    const workstationClients = Math.max(1, Number(baseConfig.workstationClients) || Math.max(5, bomWorkstations));
    const mobileClients = Math.max(0, Number(baseConfig.mobileClients) || 0);
    const webClients = Math.max(0, Number(baseConfig.webClients) || 0);
    const advantageYears = [1, 3, 5].includes(Number(baseConfig.advantageYears)) ? Number(baseConfig.advantageYears) : 1;

    const coreFailover = ['none', 'directory_only', 'full'].includes(baseConfig.coreFailover)
      ? baseConfig.coreFailover
      : 'none';

    const failoverMode = enableVideoFailover && ['none', 'all', 'custom'].includes(baseConfig.failoverMode)
      ? baseConfig.failoverMode
      : 'none';
    const failoverCameraQty = failoverMode === 'all'
      ? cameraUnits
      : failoverMode === 'custom'
        ? Math.min(cameraUnits, Math.max(0, Number(baseConfig.customFailoverCameras) || 0))
        : 0;
    const standbyServerCount = enableVideoFailover ? Math.max(0, Number(baseConfig.standbyServerCount) || 0) : 0;

    // Card 1: Federation, Global Cardholder Synchronizer (GSC-Sy-E-1GCHM) & Card Synchronization Plugin (GSC-1PSINGLECARD)
    const federationSites = enableFederation ? Math.max(0, Number(baseConfig.federationSites) || 0) : 0;
    const federationSmallSites = enableFederation ? Math.max(0, Number(baseConfig.federationSmallSites) || 0) : 0;
    const stratocastFedSites = enableFederation ? Math.max(0, Number(baseConfig.stratocastFedSites) || 0) : 0;
    const globalCardholderSystems = enableCardholderSync ? Math.max(0, Number(baseConfig.globalCardholderSystems) || 0) : 0;
    const cardSyncDataSources = enableCardholderSync ? Math.max(0, Number(baseConfig.cardSyncDataSources) || 0) : 0;
    const cardSyncLicenseBlocks = cardSyncDataSources > 0 ? Math.ceil(cardSyncDataSources / 2) : 0;

    const intrusionPanels = enableIntrusionPanels ? Math.max(0, Number(baseConfig.intrusionPanels) || 0) : 0;
    const intrusionPanelManufacturer = this.INTRUSION_PANEL_BRANDS[baseConfig.intrusionPanelManufacturer]
      ? baseConfig.intrusionPanelManufacturer
      : 'bosch';

    // Biometrics (Suprema Plugin for Genetec v1.00 EN 102.00.SPG Page 16: 3x GSC-1SDK-SUPREMA-READ per Server)
    const activePartnerSdks = enablePartnerSdks ? rawPartnerSdkMap : {};
    const supremaDevices = enableBiometricsIdentity
      ? Math.max(0, Number(baseConfig.supremaDevices ?? baseConfig.supremaEndpoints) || 0)
      : 0;
    // Per Suprema User Guide Page 4 & 16:
    // - 1 Suprema Device Plugin supports up to 4 Cloud Links (256 Suprema devices)
    // - Recommended additional plugin server when >100 devices
    // - Needs total 3 GSC-1SDK-SUPREMA-READ per Server (1 license supports 2 connections)
    const autoSupremaServers = supremaDevices > 100
      ? Math.max(2, Math.ceil(supremaDevices / 256))
      : supremaDevices > 0
        ? 1
        : 0;
    const supremaPluginServers = enableBiometricsIdentity
      ? Math.max(autoSupremaServers, Number(baseConfig.supremaPluginServers) || 0)
      : 0;
    const supremaSdkConnections = supremaPluginServers * 3; // 3x GSC-1SDK-SUPREMA-READ per Server (Page 16)
    const supremaCloudLinksNeeded = supremaDevices > 0 ? Math.ceil(supremaDevices / 50) : 0; // Up to 50 Suprema devices per dedicated Cloud Link (Page 4)

    const idemiaMorphoEnabled = enableBiometricsIdentity ? Boolean(baseConfig.idemiaMorphoEnabled) : false;
    const controlIdBridgeServers = enableBiometricsIdentity ? Math.max(0, Number(baseConfig.controlIdBridgeServers) || 0) : 0;
    const princetonIdentityServers = enableBiometricsIdentity ? Math.max(0, Number(baseConfig.princetonIdentityServers) || 0) : 0;
    const clearIdIdentities = enableClearId ? Math.max(0, Number(baseConfig.clearIdIdentities) || 0) : 0;
    const clearIdKiosks = enableClearId ? Math.max(0, Number(baseConfig.clearIdKiosks) || 0) : 0;
    const idScannerClients = enableBiometricsIdentity ? Math.max(0, Number(baseConfig.idScannerClients) || 0) : 0;
    const xpressEntryServers = enableBiometricsIdentity ? Math.max(0, Number(baseConfig.xpressEntryServers) || 0) : 0;
    const medecoXtLocks = enableKeyManagement ? Math.max(0, Number(baseConfig.medecoXtLocks) || 0) : 0;
    const keyCabinetCount = enableKeyManagement ? Math.max(0, Number(baseConfig.keyCabinetCount) || 0) : 0;

    // BriefCam & Corsight AI (from Multi-Select Partner SDKs in Card 4)
    const briefCamConnections = Math.max(0, Number(activePartnerSdks.briefcam) || 0);
    const corsightAiBridges = Math.max(0, Number(activePartnerSdks.corsight_ai) || 0);
    const alliedStreamConnectInstances = Math.max(0, Number(activePartnerSdks.allied_streamconnect) || 0);
    const winGuardNodes = enableBuildingPsim ? Math.max(0, Number(baseConfig.winGuardNodes) || 0) : 0;

    // Restricted Security Area (RSA) Surveillance — Quanergy LiDAR, SpotterRF Radar, Southwest Microwave INTREPID
    const rsaTier = enableRsa && ['none', 'standard', 'pro', 'enterprise'].includes(baseConfig.rsaTier) ? baseConfig.rsaTier : 'none';
    const rsaShortRangeSensors = enableRsa ? Math.max(0, Number(baseConfig.rsaShortRangeSensors) || 0) : 0; // GSC-GAP-RSA-1SRS ($175)
    const rsaRadars = enableRsa ? Math.max(0, Number(baseConfig.rsaRadars) || 0) : 0;                       // GSC-GAP-RSA-1RAD ($1,000)
    const rsaFenceControllers = enableRsa ? Math.max(0, Number(baseConfig.rsaFenceControllers) || 0) : 0;   // GSC-GAP-RSA-1FEN ($2,000)
    const rsaFenceKm = enableRsa ? Math.max(0, Number(baseConfig.rsaFenceKm) || 0) : 0;                     // GSC-GAP-RSA-100KM / 10KM / 1KM
    const swmRpmUnits = enableRsa ? Math.max(0, Number(baseConfig.swmRpmUnits) || 0) : 0;                   // GSC-1PSWM-RPMII ($6,500 per 5 units)
    const swmRpmBlocks = swmRpmUnits > 0 ? Math.ceil(swmRpmUnits / 5) : 0;

    // Auto-escalate RSA Base Tier if RSA tracking sensors are specified with rsaTier === 'none'
    let effectiveRsaTier = rsaTier;
    const hasRsaSensors = rsaShortRangeSensors > 0 || rsaRadars > 0 || rsaFenceControllers > 0 || rsaFenceKm > 0;
    if (hasRsaSensors && (effectiveRsaTier === 'none' || effectiveRsaTier === 'standard')) {
      if (rsaShortRangeSensors <= 20 && rsaRadars <= 5 && rsaFenceControllers <= 1 && rsaFenceKm <= 10) {
        effectiveRsaTier = 'pro';
      } else {
        effectiveRsaTier = 'enterprise';
      }
    } else if (
      effectiveRsaTier === 'pro' &&
      (rsaShortRangeSensors > 20 || rsaRadars > 5 || rsaFenceControllers > 1 || rsaFenceKm > 10)
    ) {
      effectiveRsaTier = 'enterprise';
    }

    const genericSdkConnections = enablePartnerSdks ? Math.max(0, Number(baseConfig.genericSdkConnections) || 0) : 0;
    const elevatorDispatchSystems = enableBuildingPsim ? Math.max(0, Number(baseConfig.elevatorDispatchSystems) || 0) : 0;
    const opcServerSystems = enableBuildingPsim ? Math.max(0, Number(baseConfig.opcServerSystems) || 0) : 0;
    const missionControlOperators = enableBuildingPsim ? Math.max(0, Number(baseConfig.missionControlOperators) || 0) : 0;

    // Determine effective Security Center 5.13 / 5.14 Unified Base Tier
    let effectiveTier = baseConfig.tierMode || 'auto';
    const requiresEnterpriseFeatures =
      coreFailover !== 'none' ||
      failoverCameraQty > 0 ||
      standbyServerCount > 0 ||
      federationSites > 0 ||
      federationSmallSites > 0 ||
      stratocastFedSites > 0 ||
      globalCardholderSystems > 0 ||
      dvrNvrChannels > 0 ||
      elevatorDispatchSystems > 0 ||
      opcServerSystems > 0 ||
      keyCabinetCount > 0 ||
      missionControlOperators > 0 ||
      cardSyncLicenseBlocks > 0 ||
      idemiaMorphoEnabled ||
      medecoXtLocks > 0 ||
      swmRpmBlocks > 0 ||
      effectiveRsaTier === 'pro' ||
      effectiveRsaTier === 'enterprise';

    if (effectiveTier === 'auto') {
      if (
        totalVideoConnections > 0 &&
        totalVideoConnections <= 32 &&
        totalSynergisReaders <= 32 &&
        hasSv300AioInBom &&
        !requiresEnterpriseFeatures &&
        activeArchiverRoles <= 1
      ) {
        effectiveTier = 'aio';
      } else if (
        (totalVideoConnections > 0 || totalSynergisReaders > 0) &&
        totalVideoConnections <= 100 &&
        totalSynergisReaders <= 100 &&
        activeArchiverRoles <= 1 &&
        workstationClients <= 25 &&
        !requiresEnterpriseFeatures
      ) {
        effectiveTier = 'standard';
      } else {
        effectiveTier = 'enterprise';
      }
    }

    // Compatibility & Tier Constraint Warnings (ProductCompatability.pdf & Genetec Licensing.xls)
    const compatibilityWarnings = [];
    if (effectiveTier === 'aio') {
      if (totalVideoConnections > 32) {
        compatibilityWarnings.push(`Streamvault All-in-One Tier (GSC-SV-AIO-1C) is capped at 32 camera connections maximum (current: ${totalVideoConnections}). Switch to Standard (GSC-BASE-S) or Enterprise (GSC-BASE-E).`);
      }
      if (requiresEnterpriseFeatures) {
        compatibilityWarnings.push(`Streamvault All-in-One Tier does not support Core Failover, Standby Archiver Failover, Federation, or Enterprise Plugins. Enterprise Base Package (GSC-BASE-E) is required.`);
      }
    } else if (effectiveTier === 'standard') {
      if (totalVideoConnections > 100) {
        compatibilityWarnings.push(`Security Center Base Standard Package (GSC-BASE-S) is capped at 100 camera connections maximum (current: ${totalVideoConnections}). Switch to Enterprise (GSC-BASE-E).`);
      }
      if (totalSynergisReaders > 100) {
        compatibilityWarnings.push(`Security Center Base Standard Package (GSC-BASE-S) is capped at 100 reader connections maximum (current: ${totalSynergisReaders}). Switch to Enterprise (GSC-BASE-E).`);
      }
      if (activeArchiverRoles > 1) {
        compatibilityWarnings.push(`Security Center Base Standard Package (GSC-BASE-S) supports 1 Archiver role maximum (current design requires ${activeArchiverRoles} Archiver roles). Switch to Enterprise (GSC-BASE-E) for multi-Archiver support.`);
      }
      if (workstationClients > 25) {
        compatibilityWarnings.push(`Security Center Base Standard Package (GSC-BASE-S) includes 25 concurrent client connections (requested: ${workstationClients}). Switch to Enterprise (GSC-BASE-E) for Unlimited Client Site Login License at $0.00.`);
      }
      if (requiresEnterpriseFeatures) {
        compatibilityWarnings.push(`Security Center Base Standard Package (GSC-BASE-S) does not support Core Failover, Standby Archiver Failover, Digital Video Recorder inputs, Federation, or Enterprise Plugins. Switch to Enterprise (GSC-BASE-E).`);
      }
    }

    // SQL Server 2025 Express (50 GB Cap, Included Default, Not on BOM) vs SQL Server Standard (Triggered ONLY when Core Failover = Full)
    const sqlExpressMaxGb = 50;
    const estimatedSqlDbGb = Math.round(
      (0.5 + (totalVideoConnections * 0.03) + (totalSynergisReaders * 0.06) + (effectiveLprCameras * 0.45) + (clearIdIdentities * 0.0005) + (supremaDevices * 0.02)) * 10
    ) / 10;
    const needsSqlStandard = coreFailover === 'full';
    if (!needsSqlStandard && estimatedSqlDbGb > sqlExpressMaxGb) {
      compatibilityWarnings.push(`Estimated Microsoft SQL Server database footprint (~${estimatedSqlDbGb} GB) approaches or exceeds the 50 GB SQL Server 2025 Express cap. Consider setting Core Failover to Full (Microsoft SQL Server Standard) or reducing event retention.`);
    }
    if (supremaDevices > 0 && totalSynergisReaders < supremaDevices) {
      compatibilityWarnings.push(`Suprema Integration Rule (Page 16): Each Suprema device assigned to a door as a reader requires 1 Synergis Reader License (GSC-Sy-X-1R or GSC-Sy-X-1RE). You have ${supremaDevices} Suprema device(s) configured alongside ${totalSynergisReaders} total Synergis reader license(s).`);
    }

    // Bundled Features Included at $0.00 in Security Center 5.13 / 5.14 Unified Base Package
    const includedBaseFeatures = effectiveTier === 'standard'
      ? [
          { label: 'Omnicast Standard Video Base Package (Up to 100 Cameras, 1 Archiver Role)' },
          { label: 'Synergis Standard Access Control Base Package (Up to 100 Readers, 1 Access Manager, Badge Designer)' },
          { label: 'AutoVu Standard License Plate Recognition Base Package & Sipelia Communications Base' },
          { label: '25 Concurrent Security Desk Client Connections & Plan Manager Basic Interactive Maps' },
          { label: '1 Active Directory Single Sign-On Connection & Microsoft SQL Server 2025 Express (50 GB Cap)' }
        ]
      : [
          { label: 'Omnicast Enterprise Video Base Package (Unlimited Cameras, Multi-Archiver, Auxiliary Archiving, Media Router)' },
          { label: 'Synergis Enterprise Access Control Base Package (Unlimited Readers, Access Managers & Badge Designer)' },
          { label: 'AutoVu Standard License Plate Recognition Base Package & Sipelia Communications Base' },
          { label: 'Unlimited Security Desk & Web Client Site Login License (GSC-1STU Included at $0.00)' },
          { label: 'Standby Archiver Failover Camera Connections (GSC-Om-E-1FC Included at $0.00)' },
          { label: 'Failover Directory Role (GSC-1FOD Included at $0.00) & Threat Level Management Module' },
          { label: 'Plan Manager Advanced Geographic Information System (GIS) Maps with Unlimited Entities' },
          { label: 'Unlimited Active Directory & Active Directory Federation Services (ADFS) Single Sign-On' }
        ];

    // Build Itemized License Bill of Materials
    const lineItems = [];
    const addLineItem = (sku, model, categoryLabel, qty, unitMsrp, catalogId, notes, isIncludedZeroCost = false) => {
      if (qty <= 0) return;
      lineItems.push({
        sku,
        model,
        categoryLabel,
        qty,
        unitMsrp,
        extendedMsrp: qty * unitMsrp,
        catalogId,
        notes: notes || '',
        isIncludedZeroCost
      });
    };

    const hasAnySystemEntities =
      totalVideoConnections > 0 ||
      totalSynergisReaders > 0 ||
      effectiveLprCameras > 0 ||
      effectiveSipIntercoms > 0 ||
      sipTrunks > 0 ||
      intrusionPanels > 0 ||
      supremaSdkConnections > 0 ||
      idemiaMorphoEnabled ||
      controlIdBridgeServers > 0 ||
      princetonIdentityServers > 0 ||
      cardSyncLicenseBlocks > 0 ||
      globalCardholderSystems > 0 ||
      federationSites > 0 ||
      federationSmallSites > 0 ||
      stratocastFedSites > 0 ||
      clearIdIdentities > 0 ||
      clearIdKiosks > 0 ||
      idScannerClients > 0 ||
      xpressEntryServers > 0 ||
      medecoXtLocks > 0 ||
      briefCamConnections > 0 ||
      corsightAiBridges > 0 ||
      winGuardNodes > 0 ||
      hasRsaSensors ||
      swmRpmBlocks > 0 ||
      genericSdkConnections > 0 ||
      Object.values(activePartnerSdks).some(v => (Number(v) || 0) > 0);

    // 1. Unified Base Package (GSC-BASE-S or GSC-BASE-E at $0.00), Core Failover, Clients, Federation & Cardholder Sync
    if (hasAnySystemEntities) {
      if (effectiveTier === 'standard') {
        addLineItem(
          'GSC-BASE-S',
          'Genetec Security Center Unified Base Standard Package (Version 5.13 / 5.14)',
          'Base Package, Federation & Cardholder Sync',
          1,
          0,
          'genetec-gsc-base-s-513',
          'Includes Omnicast Standard (up to 100 cameras, 1 Archiver), Synergis Standard (up to 100 readers, 1 Access Manager, Badge Designer), AutoVu Standard Base, 25 Clients, 1 Active Directory connection, and Plan Manager Basic Maps',
          true
        );
      } else if (effectiveTier === 'enterprise') {
        addLineItem(
          'GSC-BASE-E',
          'Genetec Security Center Unified Base Enterprise Package (Version 5.13 / 5.14)',
          'Base Package, Federation & Cardholder Sync',
          1,
          0,
          'genetec-gsc-base-e-513',
          'Includes Omnicast Enterprise, Synergis Enterprise, AutoVu Standard Base, Standby Failover Cameras, Failover Directory Role, Unlimited Client Site Login License, Unlimited Active Directory, Plan Manager Advanced Maps, and Threat Level Module',
          true
        );
      }
    }

    // Core Failover & Microsoft SQL Server Database Edition
    // NOTE: SQL Server 2025 Express is NOT listed on the BOM; only SQL Server Standard (7NQ-01025) is added when Core Failover = Full.
    if (coreFailover === 'directory_only') {
      addLineItem(
        'GSC-1FOD',
        'Genetec Security Center Failover Directory Role (Directory Only — Backup and Restore)',
        'Core Failover & SQL Server Database',
        1,
        0,
        'genetec-gsc-1fod',
        'Included at $0.00 in Enterprise Base Package (GSC-BASE-E) — Automated Directory Backup and Restore synchronization; Microsoft SQL Server 2025 Express (50 GB Cap) stays in play (not listed on BOM)',
        true
      );
    } else if (coreFailover === 'full') {
      addLineItem(
        'GSC-1FOD',
        'Genetec Security Center Failover Directory Role (Full Core High Availability)',
        'Core Failover & SQL Server Database',
        1,
        0,
        'genetec-gsc-1fod',
        'Included at $0.00 in Enterprise Base Package (GSC-BASE-E) — Full Core Directory and Microsoft SQL Server Standard High-Availability failover',
        true
      );
    }

    if (needsSqlStandard) {
      addLineItem(
        '7NQ-01025',
        'Microsoft SQL Server Standard Edition (Server + 5 Client Access Licenses — Full Core Failover)',
        'Core Failover & SQL Server Database',
        1,
        1418,
        'ms-sql-svr-2022-std-4c',
        `Required because Core Failover is set to Full (Estimated database size: ~${estimatedSqlDbGb} GB; unlocks SQL High-Availability Clustering and removes 50 GB Express cap)`
      );
    }

    // Operator Workstation, Web & Mobile Application Client Connections
    const freeClientsIncluded = effectiveTier === 'enterprise' ? 999999 : effectiveTier === 'standard' ? 25 : 5;
    const extraClients = Math.max(0, workstationClients - freeClientsIncluded);
    if (extraClients > 0) {
      if (extraClients >= 40) {
        addLineItem(
          'GSC-1STU',
          'Genetec Security Center — Unlimited Security Desk & Web Client Site Login License',
          'Base Package, Federation & Cardholder Sync',
          1,
          12000,
          'genetec-gsc-1stu-site',
          `Site license is more cost-effective than ${extraClients} individual $300 client licenses`
        );
      } else {
        addLineItem(
          'GSC-1U',
          'Genetec Security Desk Workstation — 1 Additional Concurrent User Connection',
          'Base Package, Federation & Cardholder Sync',
          extraClients,
          300,
          'genetec-gsc-1u-client',
          `${workstationClients} total Security Desk workstations requested (first ${freeClientsIncluded} included in Base Package)`
        );
      }
    }

    if (webClients > 0 && effectiveTier !== 'enterprise') {
      addLineItem(
        'GSC-1WU',
        'Genetec Security Center Web Client — 1 Concurrent User Connection',
        'Base Package, Federation & Cardholder Sync',
        webClients,
        200,
        'genetec-gsc-1wu',
        'Browser-based Security Center Web Client connection (included at $0.00 in Enterprise Site Login License)'
      );
    }

    if (mobileClients > 0) {
      if (mobileClients >= 40) {
        addLineItem(
          'GSC-1MobileSTU',
          'Genetec Security Center — Unlimited Mobile Application Site License',
          'Base Package, Federation & Cardholder Sync',
          1,
          10000,
          'genetec-gsc-1mobilestu',
          `Unlimited Genetec Mobile iOS/Android connections (${mobileClients} users requested; Site License caps cost at $10,000)`
        );
      } else {
        addLineItem(
          'GSC-1MobileU',
          'Genetec Mobile Application — 1 Concurrent User Connection',
          'Base Package, Federation & Cardholder Sync',
          mobileClients,
          250,
          'genetec-gsc-1mobileu',
          'iOS and Android Genetec Mobile application connection ($250.00 per concurrent user)'
        );
      }
    }

    // Multi-Site Federation & Global Cardholder Synchronizer / Card Synchronization Plugin (Main System & Core)
    if (federationSites > 0) {
      addLineItem(
        'GSC-1SCFED',
        'Genetec Security Center Federation Remote Site Connection (Over 20 Entities)',
        'Base Package, Federation & Cardholder Sync',
        federationSites,
        1000,
        'genetec-federation',
        'Federated remote Security Center Directory connection with more than 20 cameras or readers'
      );
    }
    if (federationSmallSites > 0) {
      addLineItem(
        'GSC-1SCFED-20',
        'Genetec Security Center Federation Remote Site Connection (20 Entities or Fewer)',
        'Base Package, Federation & Cardholder Sync',
        federationSmallSites,
        600,
        'genetec-federation-20',
        'Federated remote Security Center Directory connection with 20 or fewer cameras or readers'
      );
    }
    if (stratocastFedSites > 0) {
      addLineItem(
        'GSC-Om-E-1CCFED',
        'Genetec Omnicast Stratocast Hybrid Cloud Site Federation Connection',
        'Base Package, Federation & Cardholder Sync',
        stratocastFedSites,
        125,
        'genetec-stratocast-fed',
        'Federation connection for a remote site using Stratocast cloud-connected cameras'
      );
    }
    if (globalCardholderSystems > 0) {
      if (globalCardholderSystems >= 40) {
        addLineItem(
          'GSC-SY-E-1GCHMSTU',
          'Genetec Synergis Enterprise — Global Cardholder Synchronizer Unlimited Site License',
          'Base Package, Federation & Cardholder Sync',
          1,
          78000,
          'genetec-sy-e-1gchmstu',
          `Unlimited Global Cardholder Management site license (${globalCardholderSystems} remote systems requested; caps cost at $78,000)`
        );
      } else {
        addLineItem(
          'GSC-Sy-E-1GCHM',
          'Genetec Synergis Enterprise — Global Cardholder Synchronizer (1 Remote Security Center System)',
          'Base Package, Federation & Cardholder Sync',
          globalCardholderSystems,
          1950,
          'genetec-sy-e-1gchm',
          'Synchronizes cardholders, credentials, and access groups across independent Security Center systems ($1,950.00 per remote system)'
        );
      }
    }
    if (cardSyncLicenseBlocks > 0) {
      addLineItem(
        'GSC-1PSINGLECARD',
        'Genetec Security Center — Card Synchronization Plugin (Per 2 External Data Sources)',
        'Base Package, Federation & Cardholder Sync',
        cardSyncLicenseBlocks,
        4000,
        'genetec-plugin-card-sync',
        `Synchronizes cardholders, credentials, and access rules from ${cardSyncDataSources} external SQL/CSV/Oracle/Active Directory/HR data source(s) (1 license per 2 data sources)`
      );
    }

    // 2. Omnicast Video, Sipelia Intercom, AutoVu LPR & Cloud Archives
    if (cameraUnits > 0) {
      if (effectiveTier === 'aio') {
        addLineItem(
          'GSC-SV-AIO-1C',
          'Genetec Streamvault All-in-One — 1 IP Camera Connection License',
          'Video, Intercom, LPR & Cloud Archives',
          cameraUnits,
          120,
          'genetec-gsc-sv-aio-1c',
          'Streamvault SV-100E / SV-300E All-in-One IP camera connection (up to 32 cameras)'
        );
      } else if (effectiveTier === 'standard') {
        addLineItem(
          'GSC-Om-S-1C',
          'Genetec Omnicast Standard — 1 IP Camera Connection License',
          'Video, Intercom, LPR & Cloud Archives',
          cameraUnits,
          200,
          'genetec-gsc-om-s-1c',
          '1 license per IP camera or single-IP multi-sensor camera'
        );
      } else {
        addLineItem(
          'GSC-Om-E-1C',
          'Genetec Omnicast Enterprise — 1 IP Camera Connection License',
          'Video, Intercom, LPR & Cloud Archives',
          cameraUnits,
          325,
          'genetec-gsc-1cam-lic',
          '1 license per IP camera or single-IP multi-sensor camera'
        );
      }
    }

    if (analogEncoderChannels > 0) {
      if (effectiveTier === 'aio') {
        addLineItem(
          'GSC-SV-AIO-1PAC',
          'Genetec Streamvault All-in-One — 1 Analog Video Encoder Channel Connection',
          'Video, Intercom, LPR & Cloud Archives',
          analogEncoderChannels,
          36,
          'genetec-gsc-sv-aio-1pac',
          '1 license per analog camera channel on a supported encoder (Streamvault All-in-One)'
        );
      } else if (effectiveTier === 'standard') {
        addLineItem(
          'GSC-OM-S-1PAC',
          'Genetec Omnicast Standard — 1 Analog Video Encoder Channel Connection',
          'Video, Intercom, LPR & Cloud Archives',
          analogEncoderChannels,
          60,
          'genetec-gsc-om-s-1pac',
          '1 license per analog camera channel on a supported encoder'
        );
      } else {
        addLineItem(
          'GSC-OM-E-1PAC',
          'Genetec Omnicast Enterprise — 1 Analog Video Encoder Channel Connection',
          'Video, Intercom, LPR & Cloud Archives',
          analogEncoderChannels,
          100,
          'genetec-gsc-om-e-1pac',
          '1 license per analog camera channel on a supported encoder'
        );
      }
    }

    if (dvrNvrChannels > 0) {
      addLineItem(
        'GSC-Om-E-1DV',
        'Genetec Omnicast Enterprise — 1 Digital Video Recorder / Network Video Recorder Input Channel',
        'Video, Intercom, LPR & Cloud Archives',
        dvrNvrChannels,
        130,
        'genetec-gsc-om-e-1dv',
        'Third-party Digital Video Recorder or Network Video Recorder camera channel ingestion'
      );
    }

    if (failoverCameraQty > 0) {
      addLineItem(
        'GSC-Om-E-1FC',
        'Genetec Omnicast Enterprise — Standby Archiver Failover Camera Connections',
        'Video, Intercom, LPR & Cloud Archives',
        failoverCameraQty,
        0,
        'genetec-gsc-failover-1cam',
        'Included at $0.00 in Enterprise Base Package (GSC-BASE-E) — Hot-standby Archiver failover across camera channels',
        true
      );
    }

    if (standbyServerCount > 0) {
      addLineItem(
        'GSC-StandbyServer',
        'Genetec Security Center — Standby Server License (Third-Party High-Availability Clustering)',
        'Video, Intercom, LPR & Cloud Archives',
        standbyServerCount,
        1500,
        'genetec-gsc-standby-svr',
        'Required when deploying Security Center with third-party Windows Failover Clustering or NEC ExpressCluster'
      );
    }

    // Sipelia Communications Management (Standard vs Advanced vs Unified 5.13)
    if (effectiveSipIntercoms > 0 || (sipTrunks > 0 && sipeliaMode !== 'unified_513')) {
      if (sipeliaMode === 'standard') {
        addLineItem(
          'GSC-Sipelia-Base',
          'Genetec Sipelia Communications Management — Base Package',
          'Video, Intercom, LPR & Cloud Archives',
          1,
          1500,
          'genetec-sipelia-base',
          'Sipelia Communications Management Base Package ($1,500.00)'
        );
        if (effectiveSipIntercoms > 0) {
          addLineItem(
            'GSC-Sipelia-1SIP-STD',
            'Genetec Sipelia Standard — 1 Session Initiation Protocol (SIP) Intercom Station Connection',
            'Video, Intercom, LPR & Cloud Archives',
            effectiveSipIntercoms,
            160,
            'genetec-sipelia-1sip-std',
            'Sipelia Standard SIP intercom station connection ($160.00 per station)'
          );
        }
      } else if (sipeliaMode === 'advanced') {
        addLineItem(
          'GSC-Sipelia-Base',
          'Genetec Sipelia Communications Management — Base Package',
          'Video, Intercom, LPR & Cloud Archives',
          1,
          1500,
          'genetec-sipelia-base',
          'Sipelia Communications Management Base Package ($1,500.00)'
        );
        if (effectiveSipIntercoms > 0) {
          addLineItem(
            'GSC-Sipelia-1SIP-STD',
            'Genetec Sipelia Standard — 1 Session Initiation Protocol (SIP) Intercom Station Connection',
            'Video, Intercom, LPR & Cloud Archives',
            effectiveSipIntercoms,
            160,
            'genetec-sipelia-1sip-std',
            'Required base intercom connection for Sipelia Advanced (STD and ADV counts must match per Sipelia User Guide Page 10)'
          );
          addLineItem(
            'GSC-Sipelia-1SIP-ADV',
            'Genetec Sipelia Advanced — 1 Intercom Station Add-On (Failover & Call Recording)',
            'Video, Intercom, LPR & Cloud Archives',
            effectiveSipIntercoms,
            100,
            'genetec-sipelia-1sip-adv',
            'Unlocks Sipelia server failover and bidirectional audio/video intercom call recording ($100.00 per station)'
          );
        }
      } else if (effectiveSipIntercoms > 0) {
        addLineItem(
          'GSC-SIPELIA-1SIP',
          'Genetec Sipelia Communications Management — 1 Unified 5.13 SIP Intercom Station Connection',
          'Video, Intercom, LPR & Cloud Archives',
          effectiveSipIntercoms,
          295,
          'genetec-sipelia-1sip',
          'Includes Sipelia Standard + Advanced failover & bidirectional audio/video call recording (Sipelia Base included in 5.13+)'
        );
      }
    }

    if (sipTrunks > 0) {
      addLineItem(
        'GSC-Sipelia-1Trunk',
        'Genetec Sipelia Communications Management — 1 Session Initiation Protocol (SIP) Trunk Connection',
        'Video, Intercom, LPR & Cloud Archives',
        sipTrunks,
        550,
        'genetec-sipelia-1trunk',
        'SIP Trunk connection to external VoIP PBX or hardware intercom server'
      );
    }

    if (sipPublicAddress > 0) {
      addLineItem(
        'GSC-SIPELIA-1PA',
        'Genetec Sipelia Communications Management — 1 Public Address (PA) System Connection',
        'Video, Intercom, LPR & Cloud Archives',
        sipPublicAddress,
        550,
        'genetec-sipelia-1pa',
        'Public Address voice paging connection per system'
      );
    }

    if (effectiveLprCameras > 0) {
      addLineItem(
        'GSC-Av-S-1SHP',
        'Genetec AutoVu Fixed Sharp License Plate Recognition — 1 Camera Connection License',
        'Video, Intercom, LPR & Cloud Archives',
        effectiveLprCameras,
        500,
        'genetec-autovu-1shp',
        'Fixed License Plate Recognition camera stream connection (AutoVu Standard Base included at $0.00 in Base Package)'
      );
    }

    if (enableCloudServices) {
      if (Number(baseConfig.cloudArchiveTb) > 0) {
        const caTb = Number(baseConfig.cloudArchiveTb);
        if (baseConfig.cloudArchiveTier === 'long_term' || baseConfig.cloudArchiveTier === 'longterm') {
          addLineItem('SCS-CSA-USA-1TB-1Y', 'Genetec Omnicast Cloud Archive Storage — 1 TB Long-Term Tier (1-Year Subscription)', 'Video, Intercom, LPR & Cloud Archives', caTb, 122, 'genetec-cloud-lt-1tb', 'Long-term cloud video archive storage (minimum 180 days retention)');
        } else {
          addLineItem('SCS-CSP-USA-1TB-1Y', 'Genetec Omnicast Cloud Archive Storage — 1 TB Performance Tier (1-Year Subscription)', 'Video, Intercom, LPR & Cloud Archives', caTb, 257, 'genetec-cloud-perf-1tb', 'Performance tier cloud video archive storage (minimum 30 days retention)');
        }
      }
      const clearanceQty = Number(baseConfig.clearanceCameras) || (baseConfig.clearanceEnabled ? cameraUnits : 0);
      if (clearanceQty > 0) {
        addLineItem('CLR-1CCST1-US-1Y', 'Genetec Clearance Digital Evidence Management — 1 Camera Subscription (1-Year)', 'Video, Intercom, LPR & Cloud Archives', clearanceQty, 24, 'genetec-clearance-1cam-1y', 'Includes unlimited user accounts, unlimited cases, and 1 GB cloud storage per camera');
      }
    }

    // 3. Synergis Access Control Readers, Biometrics, ClearID & Key Management
    if (synergisGenetecReaders > 0) {
      if (effectiveTier === 'aio') {
        addLineItem(
          'GSC-SV-AIO-1R',
          'Genetec Streamvault All-in-One — 1 Synergis Access Control Reader Connection',
          'Synergis Access Control, Biometrics & Identity',
          synergisGenetecReaders,
          175,
          'genetec-gsc-sv-aio-1r',
          'Synergis reader connection for Streamvault All-in-One Appliances (SV-100E & SV-300E)'
        );
      } else if (effectiveTier === 'standard') {
        addLineItem(
          'GSC-SY-S-1RE',
          'Genetec Synergis Standard — 1 Reader Connection (Hardware Purchased from Genetec)',
          'Synergis Access Control, Biometrics & Identity',
          synergisGenetecReaders,
          65,
          'genetec-gsc-sy-s-1re',
          'Discounted reader connection for Synergis Cloud Link, Axis Powered by Genetec, and Mercury hardware sold by Genetec'
        );
      } else {
        addLineItem(
          'GSC-SY-E-1RE',
          'Genetec Synergis Enterprise — 1 Reader Connection (Hardware Purchased from Genetec)',
          'Synergis Access Control, Biometrics & Identity',
          synergisGenetecReaders,
          125,
          'genetec-gsc-sy-e-1re',
          'Discounted reader connection for Synergis Cloud Link, Axis Powered by Genetec, and Mercury hardware sold by Genetec'
        );
      }
    }

    if (synergisExternalReaders > 0) {
      if (effectiveTier === 'aio') {
        addLineItem(
          'GSC-SV-AIO-1R',
          'Genetec Streamvault All-in-One — 1 Synergis Access Control Reader Connection (Third-Party Hardware)',
          'Synergis Access Control, Biometrics & Identity',
          synergisExternalReaders,
          175,
          'genetec-gsc-sv-aio-1r',
          'Synergis reader connection for Streamvault All-in-One Appliances'
        );
      } else if (effectiveTier === 'standard') {
        addLineItem(
          'GSC-Sy-S-1R',
          'Genetec Synergis Standard — 1 External Reader Connection (Third-Party Hardware)',
          'Synergis Access Control, Biometrics & Identity',
          synergisExternalReaders,
          175,
          'genetec-gsc-sy-s-1r',
          'External reader connection when controller hardware is not purchased from Genetec'
        );
      } else {
        addLineItem(
          'GSC-Sy-E-1R',
          'Genetec Synergis Enterprise — 1 External Reader Connection (Third-Party Hardware)',
          'Synergis Access Control, Biometrics & Identity',
          synergisExternalReaders,
          260,
          'genetec-gsc-sy-e-1r',
          'External reader connection when controller hardware is not purchased from Genetec'
        );
      }
    }

    if (supremaSdkConnections > 0) {
      addLineItem(
        'GSC-1SDK-SUPREMA-READ',
        'Genetec Software Development Kit Connection — Suprema Plugin for Genetec (Biometric Reader & Device Integration)',
        'Synergis Access Control, Biometrics & Identity',
        supremaSdkConnections,
        250,
        'genetec-sdk-suprema-biostar',
        `Requires 3x GSC-1SDK-SUPREMA-READ per Server (${supremaPluginServers} server(s) × 3 = ${supremaSdkConnections} licenses; 1 license = 2 connections covering 2 Config Tool + 1 Security Desk + 1 Suprema Extractor Plugin + 1 Suprema Device Plugin supporting up to 4 Cloud Links / 256 devices per Suprema Guide Page 16). Also requires Suprema INT_GEN_GSC plugin license, 1x GSC-Sy-X-1R(E) per door reader (${supremaDevices} Suprema devices), and ${supremaCloudLinksNeeded} dedicated Synergis Cloud Link(s) (<=50 Suprema devices per Cloud Link with RIO enabled).`
      );
    }

    if (idemiaMorphoEnabled) {
      addLineItem(
        'GSC-1PMORPHOBIOMETRICS',
        'Genetec Security Center — IDEMIA MorphoManager Biometrics Integration Plugin',
        'Synergis Access Control, Biometrics & Identity',
        1,
        2500,
        'genetec-plugin-morpho-biometrics',
        'Native cardholder & biometric template synchronization for IDEMIA MorphoWave Compact/XP, Sigma, and VisionPass ($2,500.00 per system)'
      );
    }

    if (controlIdBridgeServers > 0) {
      addLineItem(
        'GSC-1SDK-CONTROLID-IDBRIDGE',
        'Genetec Software Development Kit Connection — Control iD iDBridge Access & Biometric Integration',
        'Synergis Access Control, Biometrics & Identity',
        controlIdBridgeServers,
        250,
        'genetec-sdk-controlid-idbridge',
        '1 SDK connection per Control iD iDBridge middleware server synchronizing iDFace / iDAccess Pro / iDBlock readers'
      );
    }

    if (princetonIdentityServers > 0) {
      addLineItem(
        'GSC-1SDK-PRINCETONIDENTITY-ACS',
        'Genetec Software Development Kit Connection — Princeton Identity Access Control Suite (Iris & Face)',
        'Synergis Access Control, Biometrics & Identity',
        princetonIdentityServers,
        250,
        'genetec-sdk-princeton-identity',
        '1 SDK connection per Princeton Identity Access Control Suite server managing IOM Access200 iris/face readers'
      );
    }

    if (clearIdIdentities > 0) {
      let cidTier = 't1';
      if (clearIdIdentities >= 100000) cidTier = 't4';
      else if (clearIdIdentities >= 50000) cidTier = 't3';
      else if (clearIdIdentities >= 20000) cidTier = 't2';

      const cidTable = {
        t1: {
          1: { sku: 'CID-IDENTITY-1Y', msrp: 7, id: 'genetec-clearid-id-1y-t1', range: '1–19,999 Identities' },
          3: { sku: 'CID-IDENTITY-3Y', msrp: 18.06, id: 'genetec-clearid-id-3y-t1', range: '1–19,999 Identities' },
          5: { sku: 'CID-IDENTITY-5Y', msrp: 28, id: 'genetec-clearid-id-5y-t1', range: '1–19,999 Identities' }
        },
        t2: {
          1: { sku: 'CID-IDENTITY-1Y', msrp: 5, id: 'genetec-clearid-id-1y-t2', range: '20,000–49,999 Identities' },
          3: { sku: 'CID-IDENTITY-3Y', msrp: 12.90, id: 'genetec-clearid-id-3y-t2', range: '20,000–49,999 Identities' },
          5: { sku: 'CID-IDENTITY-5Y', msrp: 20, id: 'genetec-clearid-id-5y-t2', range: '20,000–49,999 Identities' }
        },
        t3: {
          1: { sku: 'CID-IDENTITY-1Y', msrp: 4, id: 'genetec-clearid-id-1y-t3', range: '50,000–99,999 Identities' },
          3: { sku: 'CID-IDENTITY-3Y', msrp: 10.32, id: 'genetec-clearid-id-3y-t3', range: '50,000–99,999 Identities' },
          5: { sku: 'CID-IDENTITY-5Y', msrp: 16, id: 'genetec-clearid-id-5y-t3', range: '50,000–99,999 Identities' }
        },
        t4: {
          1: { sku: 'CID-IDENTITY-1Y', msrp: 2.50, id: 'genetec-clearid-id-1y-t4', range: '100,000+ Identities' },
          3: { sku: 'CID-IDENTITY-3Y', msrp: 6.45, id: 'genetec-clearid-id-3y-t4', range: '100,000+ Identities' },
          5: { sku: 'CID-IDENTITY-5Y', msrp: 10, id: 'genetec-clearid-id-5y-t4', range: '100,000+ Identities' }
        }
      }[cidTier][advantageYears];

      addLineItem(
        cidTable.sku,
        `Genetec ClearID Physical Identity & Access Management — 1 Identity Subscription (${advantageYears}-Year • ${cidTable.range})`,
        'Synergis Access Control, Biometrics & Identity',
        clearIdIdentities,
        cidTable.msrp,
        cidTable.id,
        `Automated self-service access requests, area owner approvals, and visitor management (${cidTable.range} volume tier)`
      );
    }

    if (clearIdKiosks > 0) {
      const kioskTable = {
        1: { sku: 'CID-KIOSK-LIC-1Y', msrp: 2000, id: 'genetec-clearid-kiosk-1y' },
        3: { sku: 'CID-KIOSK-LIC-3Y', msrp: 5100, id: 'genetec-clearid-kiosk-3y' },
        5: { sku: 'CID-KIOSK-LIC-5Y', msrp: 8000, id: 'genetec-clearid-kiosk-5y' }
      }[advantageYears];
      addLineItem(
        kioskTable.sku,
        `Genetec ClearID Visitor Self-Check-In Kiosk License (${advantageYears}-Year Subscription)`,
        'Synergis Access Control, Biometrics & Identity',
        clearIdKiosks,
        kioskTable.msrp,
        kioskTable.id,
        'Visitor self-service check-in kiosk application, NDA signing, and badge printing'
      );
    }

    if (idScannerClients > 0) {
      addLineItem(
        'GSC-1PIDSCANNER',
        'Genetec Security Center — 1 Document / Passport / Driver\'s License ID Scanner Workstation Connection',
        'Synergis Access Control, Biometrics & Identity',
        idScannerClients,
        500,
        'genetec-plugin-idscanner',
        '1 license per Security Desk workstation with an attached optical/barcode/MRZ ID scanner for visitor and cardholder enrollment'
      );
    }

    if (xpressEntryServers > 0) {
      addLineItem(
        'GSC-1SDK-TELAERIS-XPRESSENTRY',
        'Genetec Software Development Kit Connection — Telaeris XpressEntry Handheld Badge & Mustering',
        'Synergis Access Control, Biometrics & Identity',
        xpressEntryServers,
        250,
        'genetec-sdk-xpressentry',
        '1 SDK connection per XpressEntry Server synchronizing cardholders, credentials, areas, and live occupancy for handheld XPID200 badge readers'
      );
    }

    if (medecoXtLocks > 0) {
      addLineItem(
        'GSC-1PMEDECOBASE',
        'Genetec Security Center — Medeco XT Intelligent Key System Base Plugin',
        'Synergis Access Control, Biometrics & Identity',
        1,
        1000,
        'genetec-plugin-medeco-base',
        'Required 1 per Security Center system when integrating Medeco XT Web Manager and programmable intelligent keys'
      );
      addLineItem(
        'GSC-1P-OFFLINELOCK-1L',
        'Genetec Security Center — 1 Offline Lock / Medeco XT Intelligent Cylinder Connection',
        'Synergis Access Control, Biometrics & Identity',
        medecoXtLocks,
        40,
        'genetec-plugin-offlinelock-1l',
        '1 license per Medeco XT electronic cylinder, padlock, or offline lock managed in Security Center ($40.00 per lock)'
      );
    }

    if (keyCabinetCount > 0) {
      addLineItem(
        'GSC-1P-KEYCABINETBASE',
        'Genetec Security Center — Key and Asset Management Base Plugin',
        'Synergis Access Control, Biometrics & Identity',
        1,
        1500,
        'genetec-plugin-keycabinet-base',
        'Required 1 per Security Center system when integrating Morse Watchmans, Traka, Deister, or SAM key cabinets'
      );
      addLineItem(
        'GSC-1PKEYWATCHER',
        'Genetec Security Center — Key Cabinet Connection (Morse Watchmans / Traka / Deister / SAM)',
        'Synergis Access Control, Biometrics & Identity',
        keyCabinetCount,
        500,
        'genetec-plugin-keycabinet-1cab',
        '1 license per intelligent key cabinet'
      );
    }

    // 4. Multi-Select Certified Partner SDKs, Video Analytics, Building/PSIM & Industrial IoT
    if (briefCamConnections > 0) {
      addLineItem(
        'GSC-1SDK-BRIEFCAM',
        'Genetec Software Development Kit Connection — BriefCam Video Synopsis & Analytics (REVIEW / RESPOND / RESEARCH)',
        'Partner SDKs, Video Analytics, PSIM & IIoT',
        briefCamConnections,
        250,
        'genetec-sdk-briefcam',
        'Per-connection BriefCam SDK license (Default: 4 connections = 1 VSServer + 1 per Fetching/GPU node + 1 per concurrent Security Desk Embedded Client + 1 Spare)'
      );
    }

    if (corsightAiBridges > 0) {
      addLineItem(
        'GSC-1SDK-BAPS-SYFTYCORSIGHTAI',
        'Genetec Software Development Kit Connection — Corsight AI Syfty Suite (Event Processor & Overlay Service)',
        'Partner SDKs, Video Analytics, PSIM & IIoT',
        corsightAiBridges,
        250,
        'genetec-sdk-corsight-ai',
        'Requires 2 SDK connections by default (1 for Syfty Event Processor Windows service + 1 for Syfty Overlay Service / Syfty AI Plugin role in Config Tool per Corsight Syfty Guide 2026). Camera stream MUST be H.264 and requires Media Gateway with RTSPS disabled.'
      );
    }

    if (genericSdkConnections > 0) {
      addLineItem(
        'GSC-1SDK',
        'Genetec Security Center — 1 Generic Software Development Kit (SDK) Connection',
        'Partner SDKs, Video Analytics, PSIM & IIoT',
        genericSdkConnections,
        250,
        'genetec-gsc-1sdk',
        'Standard per-connection Software Development Kit (SDK) license for custom or third-party integrations'
      );
    }

    // Add all remaining Multi-Select Partner SDKs (excluding briefcam and corsight_ai which were emitted above)
    const handledSdkKeys = new Set([
      'briefcam',
      'corsight_ai'
    ]);
    this.PARTNER_SDK_OPTIONS.forEach(pOpt => {
      if (!pOpt || !pOpt.sku || handledSdkKeys.has(pOpt.key)) return;
      const sdkQty = Math.max(0, Number(activePartnerSdks[pOpt.key]) || 0);
      if (sdkQty > 0) {
        addLineItem(
          pOpt.sku,
          `Genetec Software Development Kit Connection — ${pOpt.label}`,
          'Partner SDKs, Video Analytics, PSIM & IIoT',
          sdkQty,
          pOpt.msrp || 250,
          pOpt.catalogId,
          pOpt.ruleHint || 'Certified third-party partner Software Development Kit (SDK) integration connection'
        );
      }
    });

    if (winGuardNodes > 0) {
      addLineItem(
        'GSC-1SDK-ADVANCIS-WINGUARD',
        'Genetec Software Development Kit Connection — Advancis WinGuard PSIM Integration',
        'Partner SDKs, Video Analytics, PSIM & IIoT',
        winGuardNodes,
        250,
        'genetec-sdk-advancis-winguard',
        '1 SDK connection per Advancis WinGuard interface server or redundancy node'
      );
    }

    if (elevatorDispatchSystems > 0) {
      addLineItem(
        'GSC-1POTIS-COMPASS',
        'Genetec Security Center — Elevator Destination Dispatch Plugin (Otis Compass / KONE / ThyssenKrupp / MCE Sentry)',
        'Partner SDKs, Video Analytics, PSIM & IIoT',
        elevatorDispatchSystems,
        8000,
        'genetec-plugin-elevator-dispatch',
        'Native high-rise elevator destination dispatch system integration ($8,000.00 per elevator system)'
      );
    }

    if (opcServerSystems > 0) {
      addLineItem(
        'GSC-1POPC-S',
        'Genetec Security Center — Open Platform Communications (OPC) Server Plugin',
        'Partner SDKs, Video Analytics, PSIM & IIoT',
        opcServerSystems,
        8000,
        'genetec-plugin-opc-server',
        'Exposes Security Center entities and alarm states to Building Management and SCADA systems'
      );
    }

    if (missionControlOperators > 0) {
      const mcTable = {
        1: { sku: 'ADV-MC-1OPP-1Y', msrp: 3000, id: 'genetec-adv-mc-1opp-1y' },
        3: { sku: 'ADV-MC-1OPP-3Y', msrp: 7200, id: 'genetec-adv-mc-1opp-3y' },
        5: { sku: 'ADV-MC-1OPP-5Y', msrp: 10500, id: 'genetec-adv-mc-1opp-5y' }
      }[advantageYears];
      addLineItem(
        mcTable.sku,
        `Genetec Mission Control Collaborative Decision Management — Concurrent Operator (${advantageYears}-Year)`,
        'Partner SDKs, Video Analytics, PSIM & IIoT',
        missionControlOperators,
        mcTable.msrp,
        mcTable.id,
        'Includes GSC-MC-1Opp ($0.00 Base) + mandatory Mission Control Operator Advantage maintenance'
      );
    }

    if (enableIiot) {
      if (baseConfig.iiotMode === 'site') {
        addLineItem('GSC-IIOT', 'Genetec Industrial Internet of Things (IIoT) Plugin — Unlimited Site License', 'Partner SDKs, Video Analytics, PSIM & IIoT', 1, 6000, 'genetec-iiot-site', 'Unlimited BACnet, Modbus, OPC, SNMP, MQTT, and HTTP device and data-point connections');
      } else if (baseConfig.iiotMode === 'devices' && Number(baseConfig.iiotDevices) > 0) {
        addLineItem('GSC-IIOT-1D', 'Genetec Industrial Internet of Things (IIoT) Plugin — 1 Device Connection', 'Partner SDKs, Video Analytics, PSIM & IIoT', Number(baseConfig.iiotDevices), 149, 'genetec-iiot-1d', 'Individual BACnet, Modbus, SNMP, or MQTT device connection');
      }
    }

    // 5. Restricted Security Area (RSA) Perimeter Surveillance & Intrusion Alarm Panels
    if (intrusionPanels > 0) {
      const panelBrand = this.INTRUSION_PANEL_BRANDS[intrusionPanelManufacturer] || this.INTRUSION_PANEL_BRANDS.bosch;
      addLineItem(
        panelBrand.sku,
        panelBrand.model,
        'Restricted Security Area (RSA) & Intrusion Panels',
        intrusionPanels,
        350,
        panelBrand.catalogId,
        '1 connection per intrusion alarm panel (no separate Intrusion Base license required in Security Center 5.13+)'
      );
    }

    if (effectiveRsaTier === 'standard') {
      addLineItem('GSC-GAP-RSA-STA', 'Genetec Restricted Security Area (RSA) Perimeter Surveillance — Standard Package', 'Restricted Security Area (RSA) & Intrusion Panels', 1, 1000, 'genetec-rsa-standard', 'Perimeter radar, LiDAR, and fence intrusion event integration');
    } else if (effectiveRsaTier === 'pro') {
      addLineItem('GSC-GAP-RSA-PRO', 'Genetec Restricted Security Area (RSA) Perimeter Surveillance — Professional Package', 'Restricted Security Area (RSA) & Intrusion Panels', 1, 7000, 'genetec-rsa-pro', 'Supports up to 20 short-range sensors (Quanergy LiDAR), 5 radars (SpotterRF), 1 fence controller (Southwest Microwave), and 10 km perimeter fence');
    } else if (effectiveRsaTier === 'enterprise') {
      addLineItem('GSC-GAP-RSA-ENT', 'Genetec Restricted Security Area (RSA) Perimeter Surveillance — Enterprise Package', 'Restricted Security Area (RSA) & Intrusion Panels', 1, 14000, 'genetec-rsa-ent', 'Unrestricted enterprise perimeter radar (SpotterRF), 3D LiDAR (Quanergy), and multi-zone fence target tracking (Southwest Microwave)');
    }

    if (rsaShortRangeSensors > 0) {
      addLineItem(
        'GSC-GAP-RSA-1SRS',
        'Genetec Restricted Security Area (RSA) — 1 Short-Range Tracking Sensor (Quanergy M8 LiDAR / Optex / Axis / Magos SR)',
        'Restricted Security Area (RSA) & Intrusion Panels',
        rsaShortRangeSensors,
        175,
        'genetec-rsa-1srs',
        '1 connection per short-range tracking sensor: Quanergy M8 3D LiDAR (Qortex DTC Server), Optex Redscan PIE-1, Axis Perimeter Defender, Bosch IVA, SightLogix, Ouster, or Magos SR-150/250/500'
      );
    }

    if (rsaRadars > 0) {
      addLineItem(
        'GSC-GAP-RSA-1RAD',
        'Genetec Restricted Security Area (RSA) — 1 Radar Tracking Unit (SpotterRF / FLIR Ranger / Echodyne / Navtech)',
        'Restricted Security Area (RSA) & Intrusion Panels',
        rsaRadars,
        1000,
        'genetec-rsa-1rad',
        '1 connection per medium/long-range tracking radar: SpotterRF / Spotter Global (C20/C40/A-Series/3D-Series/NetworkedIO), Teledyne FLIR Ranger, Echodyne EchoGuard, Navtech AdvanceGuard, or Magos SR-1000'
      );
    }

    if (rsaFenceControllers > 0) {
      addLineItem(
        'GSC-GAP-RSA-1FEN',
        'Genetec Restricted Security Area (RSA) — 1 Perimeter Fence Intrusion Detection System (Southwest Microwave INTREPID / Senstar / FFT)',
        'Restricted Security Area (RSA) & Intrusion Panels',
        rsaFenceControllers,
        2000,
        'genetec-rsa-1fen',
        '1 connection per perimeter fence controller: Southwest Microwave INTREPID (MicroPoint POE-S, Microwave 316/334/336-POE-S, Model 390/395), Senstar FiberPatrol/OmniTrax/FlexZone, Fiber SenSys, or FFT'
      );
    }

    if (rsaFenceKm > 0) {
      // Decompose rsaFenceKm into optimal 100km ($15,000), 10km ($5,000), and 1km ($2,000) licenses
      let remKm = Math.ceil(rsaFenceKm);
      const km100 = Math.floor(remKm / 100);
      remKm = remKm % 100;
      const km10 = Math.floor(remKm / 10);
      remKm = remKm % 10;
      // Note: 3x 1km ($6,000) is more expensive than 1x 10km ($5,000), so upgrade >=3 km to 10km block
      let finalKm10 = km10;
      let finalKm1 = remKm;
      if (finalKm1 >= 3) {
        finalKm10 += 1;
        finalKm1 = 0;
      }
      if (km100 > 0) {
        addLineItem('GSC-GAP-RSA-100KM', 'Genetec Restricted Security Area (RSA) — 100 km Perimeter Fence Tracking License', 'Restricted Security Area (RSA) & Intrusion Panels', km100, 15000, 'genetec-rsa-100km', 'Covers up to 100 km of monitored perimeter fence intrusion zones');
      }
      if (finalKm10 > 0) {
        addLineItem('GSC-GAP-RSA-10KM', 'Genetec Restricted Security Area (RSA) — 10 km Perimeter Fence Tracking License', 'Restricted Security Area (RSA) & Intrusion Panels', finalKm10, 5000, 'genetec-rsa-10km', 'Covers up to 10 km of monitored perimeter fence intrusion zones');
      }
      if (finalKm1 > 0) {
        addLineItem('GSC-GAP-RSA-1KM', 'Genetec Restricted Security Area (RSA) — 1 km Perimeter Fence Tracking License', 'Restricted Security Area (RSA) & Intrusion Panels', finalKm1, 2000, 'genetec-rsa-1km', 'Covers up to 1 km of monitored perimeter fence intrusion zones');
      }
    }

    if (swmRpmBlocks > 0) {
      addLineItem(
        'GSC-1PSWM-RPMII',
        'Genetec Security Center — Southwest Microwave INTREPID RPM II Standalone Plugin (Per 5 RPM Units)',
        'Restricted Security Area (RSA) & Intrusion Panels',
        swmRpmBlocks,
        6500,
        'genetec-plugin-swm-rpmii',
        `Dedicated Southwest Microwave INTREPID Remote Polling Module II (RPM II) integration (${swmRpmUnits} RPM unit(s) across ${swmRpmBlocks} block(s) of 5 units)`
      );
    }

    // 6. Mandatory Genetec Advantage Software Maintenance Agreement (1-Year / 3-Year / 5-Year)
    if (totalVideoConnections > 0) {
      const advTierTable = {
        aio: {
          1: { sku: 'ADV-CAM-AIO-1Y', model: 'Genetec Advantage Software Maintenance — 1 Streamvault All-in-One Camera (1-Year)', msrp: 25, id: 'genetec-adv-cam-aio-1y' },
          3: { sku: 'ADV-CAM-AIO-3Y', model: 'Genetec Advantage Software Maintenance — 1 Streamvault All-in-One Camera (3-Year)', msrp: 60, id: 'genetec-adv-cam-aio-3y' },
          5: { sku: 'ADV-CAM-AIO-5Y', model: 'Genetec Advantage Software Maintenance — 1 Streamvault All-in-One Camera (5-Year)', msrp: 85, id: 'genetec-adv-cam-aio-5y' }
        },
        standard: {
          1: { sku: 'ADV-CAM-S-1Y', model: 'Genetec Advantage Software Maintenance — 1 Omnicast Standard Camera (1-Year)', msrp: 35, id: 'genetec-adv-cam-s-1y' },
          3: { sku: 'ADV-CAM-S-3Y', model: 'Genetec Advantage Software Maintenance — 1 Omnicast Standard Camera (3-Year)', msrp: 85, id: 'genetec-adv-cam-s-3y' },
          5: { sku: 'ADV-CAM-S-5Y', model: 'Genetec Advantage Software Maintenance — 1 Omnicast Standard Camera (5-Year)', msrp: 130, id: 'genetec-adv-cam-s-5y' }
        },
        enterprise: {
          1: { sku: 'ADV-CAM-E-1Y', model: 'Genetec Advantage Software Maintenance — 1 Omnicast Enterprise Camera (1-Year)', msrp: 55, id: 'genetec-advantage-1cam-1yr' },
          3: { sku: 'ADV-CAM-E-3Y', model: 'Genetec Advantage Software Maintenance — 1 Omnicast Enterprise Camera (3-Year)', msrp: 135, id: 'genetec-adv-cam-e-3y' },
          5: { sku: 'ADV-CAM-E-5Y', model: 'Genetec Advantage Software Maintenance — 1 Omnicast Enterprise Camera (5-Year)', msrp: 190, id: 'genetec-adv-cam-e-5y' }
        }
      };
      const advEntry = (advTierTable[effectiveTier] || advTierTable.enterprise)[advantageYears];
      addLineItem(
        advEntry.sku,
        advEntry.model,
        'Genetec Advantage Software Maintenance',
        totalVideoConnections,
        advEntry.msrp,
        advEntry.id,
        `Mandatory ${advantageYears}-Year Genetec Advantage Software Maintenance Agreement`
      );
    }

    if (totalSynergisReaders > 0) {
      const rdrAdvTable = {
        aio: {
          1: { sku: 'ADV-RDR-AIO-1Y', model: 'Genetec Advantage Software Maintenance — 1 Streamvault All-in-One Reader (1-Year)', msrp: 9, id: 'genetec-adv-rdr-aio-1y' },
          3: { sku: 'ADV-RDR-AIO-3Y', model: 'Genetec Advantage Software Maintenance — 1 Streamvault All-in-One Reader (3-Year)', msrp: 22, id: 'genetec-adv-rdr-aio-3y' },
          5: { sku: 'ADV-RDR-AIO-5Y', model: 'Genetec Advantage Software Maintenance — 1 Streamvault All-in-One Reader (5-Year)', msrp: 30, id: 'genetec-adv-rdr-aio-5y' }
        },
        standard: {
          1: { sku: 'ADV-RDR-S-1Y', model: 'Genetec Advantage Software Maintenance — 1 Synergis Standard Reader (1-Year)', msrp: 15, id: 'genetec-adv-rdr-s-1y' },
          3: { sku: 'ADV-RDR-S-3Y', model: 'Genetec Advantage Software Maintenance — 1 Synergis Standard Reader (3-Year)', msrp: 35, id: 'genetec-adv-rdr-s-3y' },
          5: { sku: 'ADV-RDR-S-5Y', model: 'Genetec Advantage Software Maintenance — 1 Synergis Standard Reader (5-Year)', msrp: 55, id: 'genetec-adv-rdr-s-5y' }
        },
        enterprise: {
          1: { sku: 'ADV-RDR-E-1Y', model: 'Genetec Advantage Software Maintenance — 1 Synergis Enterprise Reader (1-Year)', msrp: 25, id: 'genetec-adv-rdr-e-1y' },
          3: { sku: 'ADV-RDR-E-3Y', model: 'Genetec Advantage Software Maintenance — 1 Synergis Enterprise Reader (3-Year)', msrp: 60, id: 'genetec-adv-rdr-e-3y' },
          5: { sku: 'ADV-RDR-E-5Y', model: 'Genetec Advantage Software Maintenance — 1 Synergis Enterprise Reader (5-Year)', msrp: 90, id: 'genetec-adv-rdr-e-5y' }
        }
      };
      const rdrKey = rdrAdvTable[effectiveTier] ? effectiveTier : 'enterprise';
      const rdrEntry = rdrAdvTable[rdrKey][advantageYears];
      addLineItem(
        rdrEntry.sku,
        rdrEntry.model,
        'Genetec Advantage Software Maintenance',
        totalSynergisReaders,
        rdrEntry.msrp,
        rdrEntry.id,
        `Mandatory ${advantageYears}-Year Synergis Reader Software Maintenance Agreement`
      );
    }

    if (effectiveLprCameras > 0) {
      const lprAdvTable = {
        1: { sku: 'ADV-LPR-F-1Y', msrp: 80, id: 'genetec-adv-lpr-f-1y' },
        3: { sku: 'ADV-LPR-F-3Y', msrp: 192, id: 'genetec-adv-lpr-f-3y' },
        5: { sku: 'ADV-LPR-F-5Y', msrp: 280, id: 'genetec-adv-lpr-f-5y' }
      }[advantageYears];
      addLineItem(
        lprAdvTable.sku,
        `Genetec Advantage Software Maintenance — 1 Fixed Sharp License Plate Recognition Camera (${advantageYears}-Year)`,
        'Genetec Advantage Software Maintenance',
        effectiveLprCameras,
        lprAdvTable.msrp,
        lprAdvTable.id,
        `Mandatory ${advantageYears}-Year AutoVu License Plate Recognition Software Maintenance Agreement`
      );
    }

    if (effectiveSipIntercoms > 0) {
      if (sipeliaMode === 'standard') {
        const sipStdAdvTable = {
          1: { sku: 'ADV-SIP-S-1Y', msrp: 25, id: 'genetec-adv-sip-s-1y' },
          3: { sku: 'ADV-SIP-S-3Y', msrp: 60, id: 'genetec-adv-sip-s-3y' },
          5: { sku: 'ADV-SIP-S-5Y', msrp: 87.50, id: 'genetec-adv-sip-s-5y' }
        }[advantageYears];
        addLineItem(
          sipStdAdvTable.sku,
          `Genetec Advantage Software Maintenance — 1 Sipelia Standard Intercom Station (${advantageYears}-Year)`,
          'Genetec Advantage Software Maintenance',
          effectiveSipIntercoms,
          sipStdAdvTable.msrp,
          sipStdAdvTable.id,
          `Mandatory ${advantageYears}-Year Sipelia Standard Intercom Software Maintenance Agreement`
        );
      } else if (sipeliaMode === 'advanced') {
        const sipStdAdvTable = {
          1: { sku: 'ADV-SIP-S-1Y', msrp: 25, id: 'genetec-adv-sip-s-1y' },
          3: { sku: 'ADV-SIP-S-3Y', msrp: 60, id: 'genetec-adv-sip-s-3y' },
          5: { sku: 'ADV-SIP-S-5Y', msrp: 87.50, id: 'genetec-adv-sip-s-5y' }
        }[advantageYears];
        const sipAdvAddTable = {
          1: { sku: 'ADV-SIP-A-1Y', msrp: 15, id: 'genetec-adv-sip-a-1y' },
          3: { sku: 'ADV-SIP-A-3Y', msrp: 36, id: 'genetec-adv-sip-a-3y' },
          5: { sku: 'ADV-SIP-A-5Y', msrp: 52.50, id: 'genetec-adv-sip-a-5y' }
        }[advantageYears];
        addLineItem(
          sipStdAdvTable.sku,
          `Genetec Advantage Software Maintenance — 1 Sipelia Standard Intercom Station (${advantageYears}-Year)`,
          'Genetec Advantage Software Maintenance',
          effectiveSipIntercoms,
          sipStdAdvTable.msrp,
          sipStdAdvTable.id,
          `Mandatory ${advantageYears}-Year Sipelia Standard Intercom Software Maintenance Agreement`
        );
        addLineItem(
          sipAdvAddTable.sku,
          `Genetec Advantage Software Maintenance — 1 Sipelia Advanced Intercom Add-On (${advantageYears}-Year)`,
          'Genetec Advantage Software Maintenance',
          effectiveSipIntercoms,
          sipAdvAddTable.msrp,
          sipAdvAddTable.id,
          `Mandatory ${advantageYears}-Year Sipelia Advanced Intercom Software Maintenance Agreement`
        );
      } else {
        const sipAdvTable = {
          1: { sku: 'ADV-SIP-1Y', msrp: 40, id: 'genetec-adv-sip-1y' },
          3: { sku: 'ADV-SIP-3Y', msrp: 95, id: 'genetec-adv-sip-3y' },
          5: { sku: 'ADV-SIP-5Y', msrp: 140, id: 'genetec-adv-sip-5y' }
        }[advantageYears];
        addLineItem(
          sipAdvTable.sku,
          `Genetec Advantage Software Maintenance — 1 Sipelia Unified Intercom Station (${advantageYears}-Year)`,
          'Genetec Advantage Software Maintenance',
          effectiveSipIntercoms,
          sipAdvTable.msrp,
          sipAdvTable.id,
          `Mandatory ${advantageYears}-Year Sipelia Intercom Software Maintenance Agreement`
        );
      }
    }

    if (intrusionPanels > 0) {
      const apAdvTable = {
        1: { sku: 'ADV-1AP-1Y', msrp: 65, id: 'genetec-adv-1ap-1y' },
        3: { sku: 'ADV-1AP-3Y', msrp: 160, id: 'genetec-adv-1ap-3y' },
        5: { sku: 'ADV-1AP-5Y', msrp: 230, id: 'genetec-adv-1ap-5y' }
      }[advantageYears];
      addLineItem(
        apAdvTable.sku,
        `Genetec Advantage Software Maintenance — 1 Intrusion Alarm Panel Connection (${advantageYears}-Year)`,
        'Genetec Advantage Software Maintenance',
        intrusionPanels,
        apAdvTable.msrp,
        apAdvTable.id,
        `Mandatory ${advantageYears}-Year Intrusion Alarm Panel Software Maintenance Agreement`
      );
    }

    if (baseConfig.advantage247) {
      const tacTable = {
        1: { sku: 'ADV-OPTION-247-1Y', msrp: 6000, id: 'genetec-adv-option-247-1y' },
        3: { sku: 'ADV-OPTION-247-3Y', msrp: 14400, id: 'genetec-adv-option-247-3y' },
        5: { sku: 'ADV-OPTION-247-5Y', msrp: 21000, id: 'genetec-adv-option-247-5y' }
      }[advantageYears];
      addLineItem(
        tacTable.sku,
        `Genetec Advantage 24/7 Technical Assistance Center Support Option (${advantageYears}-Year)`,
        'Genetec Advantage Software Maintenance',
        1,
        tacTable.msrp,
        tacTable.id,
        '24/7/365 Technical Assistance Center telephone support with 30-minute callback service level agreement'
      );
    }

    // 7. Multi-Role & Plugin Server Resource Sizing (SystemRequirements.pdf & Plugin Datasheets)
    const activeRolesAndPlugins = [];
    let requiredServerRamGb = 16; // Baseline Security Center Recommended Profile (Page 9)
    let requiredServerCores = 4;  // Baseline Intel Xeon E-2434 (4C/8T)

    if (totalVideoConnections > 100 || totalSynergisReaders > 200) {
      requiredServerRamGb = 32;
      requiredServerCores = 8;
    }
    if (totalVideoConnections > 300 || totalSynergisReaders > 1000) {
      requiredServerRamGb = 64;
      requiredServerCores = 16;
    }

    const roleSharingRules = [];
    const exceedsUnifiedServerCap = totalVideoConnections > 100 || (videoLoad.peakIngressMbps || 0) > 200 || totalSynergisReaders > 200;
    const requiresDedicatedDirectory = totalVideoConnections > 300 || totalSynergisReaders > 1000 || coreFailover !== 'none';

    if (exceedsUnifiedServerCap) {
      roleSharingRules.push('Exceeds Unified Single-Server Cap (100 cameras / 200 Mbps / 200 readers per SystemRequirements.pdf Page 9): Separate Archiver and Directory/Plugin roles or scale out to High-Performance 32–64 GB server.');
    } else if (hasAnySystemEntities) {
      roleSharingRules.push('Within Unified Single-Server Cap (<=100 cameras, <=200 Mbps, <=200 readers): Directory, Archiver, and Access Manager can share 1 Streamvault server.');
    }

    if (requiresDedicatedDirectory) {
      roleSharingRules.push('Dedicated Directory Server Required (>300 cameras, >1,000 readers, or Core Failover active per SystemRequirements.pdf Page 15): Host Directory and Plugin Manager roles on a dedicated server (SV-1041E / SV-7041EX).');
    }

    if (effectiveSipIntercoms > 0 || sipTrunks > 0) {
      requiredServerRamGb += 4;
      requiredServerCores += 2;
      activeRolesAndPlugins.push({
        name: `Sipelia Communications Role (${effectiveSipIntercoms} stations, ${sipTrunks} trunks)`,
        ramGb: 4,
        cores: 2,
        rule: 'Can co-host on Directory/Expansion server up to 250 SIP endpoints; requires Media Gateway for video calls.',
        datasheet: 'Datasheets/Genetec/Plugins/Genetec_Sipelia_User_Guide.pdf'
      });
    }

    if (effectiveRsaTier !== 'none' || swmRpmBlocks > 0) {
      const totalRsaTrackers = rsaShortRangeSensors + rsaRadars + rsaFenceControllers + swmRpmUnits;
      const rsaRam = totalRsaTrackers > 5 ? 8 : 4;
      const rsaCores = totalRsaTrackers > 5 ? 4 : 2;
      requiredServerRamGb += rsaRam;
      requiredServerCores += rsaCores;
      activeRolesAndPlugins.push({
        name: `Restricted Security Area & IS Gateway (${rsaShortRangeSensors} LiDAR/SRS, ${rsaRadars} Radar, ${rsaFenceControllers} Fence, ${swmRpmUnits} RPM II)`,
        ramGb: rsaRam,
        cores: rsaCores,
        rule: totalRsaTrackers > 5
          ? 'IS Gateway 1.4+ Windows Containers with >5 tracking sensors: Isolate on dedicated expansion server (never co-host on high-load Archiver).'
          : 'IS Gateway 1.4+ Windows Containers: Add +4 GB RAM / +2 CPU cores for Quanergy Qortex / SpotterRF / Southwest Microwave INTREPID polling.',
        datasheet: 'Datasheets/Genetec/Plugins/Genetec_RSA_Surveillance_Plugin_Datasheet.pdf'
      });
    }

    if (supremaSdkConnections > 0) {
      // Suprema Plugin for Genetec User Guide v1.00 (Pages 3-4):
      // <=50 devices: 8 Core CPU / 32 GB RAM; 51-100 devices: 16 Core CPU / 64 GB RAM; >100 devices: additional plugin server
      const supremaRam = supremaDevices > 50 ? 64 : 32;
      const supremaCores = supremaDevices > 50 ? 16 : 8;
      if (supremaDevices <= 20) {
        requiredServerRamGb = Math.max(requiredServerRamGb, 32);
        requiredServerCores = Math.max(requiredServerCores, 8);
      } else {
        requiredServerRamGb = Math.max(requiredServerRamGb, supremaRam);
        requiredServerCores = Math.max(requiredServerCores, supremaCores);
      }
      activeRolesAndPlugins.push({
        name: `Suprema Plugin for Genetec (${supremaDevices} Readers, ${supremaPluginServers} Server(s), ${supremaSdkConnections}x GSC-1SDK-SUPREMA-READ)`,
        ramGb: supremaRam,
        cores: supremaCores,
        rule: `Requires 3x GSC-1SDK-SUPREMA-READ per Server (1 license = 2 connections) + Suprema INT_GEN_GSC plugin license + ${supremaCloudLinksNeeded} dedicated Synergis Cloud Link(s) (<=50 Suprema devices/Cloud Link with RIO enabled). Server spec: ${supremaDevices <= 20 ? '0-20 devices can share existing server (8C / 32 GB RAM)' : supremaDevices <= 50 ? 'Dedicated Plugin Server recommended (8C / 32 GB RAM)' : 'Dedicated Plugin Server required (16C / 64 GB RAM; >100 devices requires additional Plugin Server)'}. SQL DB reserves ~400 KB per face template.`,
        datasheet: 'Datasheets/Genetec/Plugins/Suprema_Genetec_Security_Center_Integration.pdf'
      });
    }

    if (idemiaMorphoEnabled || controlIdBridgeServers > 0 || princetonIdentityServers > 0) {
      const bioCount = (idemiaMorphoEnabled ? 1 : 0) + (controlIdBridgeServers > 0 ? 1 : 0) + (princetonIdentityServers > 0 ? 1 : 0);
      const bioRam = bioCount * 6;
      const bioCores = bioCount * 2;
      requiredServerRamGb += bioRam;
      requiredServerCores += bioCores;
      activeRolesAndPlugins.push({
        name: `Biometric Server Integration (${[
          idemiaMorphoEnabled ? 'IDEMIA MorphoManager' : '',
          controlIdBridgeServers > 0 ? `Control iD iDBridge (${controlIdBridgeServers})` : '',
          princetonIdentityServers > 0 ? `Princeton Identity (${princetonIdentityServers})` : ''
        ].filter(Boolean).join(', ')})`,
        ramGb: bioRam,
        cores: bioCores,
        rule: 'Co-hosting MorphoManager / iDBridge / Princeton Identity middleware requires +6 GB RAM & +2 cores per biometric service; isolate on dedicated VM when >10,000 biometric templates.',
        datasheet: 'Datasheets/Genetec/Plugins/Genetec_Identity_Biometrics_Plugins_Datasheet.pdf'
      });
    }

    if (globalCardholderSystems > 0 || cardSyncLicenseBlocks > 0 || clearIdIdentities > 0 || clearIdKiosks > 0) {
      requiredServerRamGb += 4;
      requiredServerCores += 2;
      activeRolesAndPlugins.push({
        name: `Global Cardholder Sync, Card Sync & ClearID (${[
          globalCardholderSystems > 0 ? `${globalCardholderSystems} GCHM System(s)` : '',
          cardSyncDataSources > 0 ? `${cardSyncDataSources} HR/SQL Source(s)` : '',
          clearIdIdentities > 0 ? `${clearIdIdentities.toLocaleString()} ClearID Identities` : ''
        ].filter(Boolean).join(' + ')})`,
        ramGb: 4,
        cores: 2,
        rule: 'Global Cardholder Synchronizer, Card Synchronization & ClearID Bridge Role: Co-host on Directory server (+4 GB RAM, +2 CPU cores).',
        datasheet: 'Datasheets/Genetec/Plugins/Genetec_ClearID_Plugin_Datasheet.pdf'
      });
    }

    if (alliedStreamConnectInstances > 0) {
      requiredServerRamGb += 2;
      requiredServerCores += 1;
      activeRolesAndPlugins.push({
        name: `Allied Telesis StreamConnect v2.1 (${alliedStreamConnectInstances} SDK Instance Pool)`,
        ramGb: 2,
        cores: 1,
        rule: 'Shared SDK pool (Default: 4 instances): 1 per Main Server + 1 per Expansion Archiver connected to ATI PoE switch + 1 per open ATI Switch Mgmt task + 1 per open StreamConnect tile widget. Requires GSC 5.13.2+ & AW+ 5.5.4+; switches in VCS stacking unsupported.',
        datasheet: 'Datasheets/Genetec/Plugins/StreamConnect_for_Genetec_v2_1_User_Guide.pdf'
      });
    }

    if (xpressEntryServers > 0) {
      requiredServerRamGb += 8;
      requiredServerCores += 4;
      activeRolesAndPlugins.push({
        name: `Telaeris XpressEntry Server (${xpressEntryServers} server${xpressEntryServers > 1 ? 's' : ''})`,
        ramGb: 8,
        cores: 4,
        rule: 'XpressEntry Server requires +8 GB RAM and +4 CPU cores when co-hosted; dedicate server for >10 handheld readers or >25,000 cardholders.',
        datasheet: 'Datasheets/Genetec/Plugins/Telaeris_XPressEntry_Genetec_Integration.pdf'
      });
    }

    if (medecoXtLocks > 0 || keyCabinetCount > 0) {
      requiredServerRamGb += 4;
      requiredServerCores += 2;
      activeRolesAndPlugins.push({
        name: `Medeco XT & Key Management (${medecoXtLocks} Medeco XT locks, ${keyCabinetCount} Key Cabinets)`,
        ramGb: 4,
        cores: 2,
        rule: 'Medeco XT Plugin Role + IIS Web Manager service adds +4 GB RAM & +2 CPU cores on Directory/Expansion server.',
        datasheet: 'Datasheets/Genetec/Plugins/Genetec_Medeco_Key_Asset_Management_Datasheet.pdf'
      });
    }

    if (winGuardNodes > 0 || elevatorDispatchSystems > 0 || opcServerSystems > 0 || missionControlOperators > 0) {
      requiredServerRamGb += 8;
      requiredServerCores += 4;
      activeRolesAndPlugins.push({
        name: `PSIM / Building / Mission Control (${[
          winGuardNodes > 0 ? `${winGuardNodes} WinGuard Node(s)` : '',
          elevatorDispatchSystems > 0 ? `${elevatorDispatchSystems} Elevator Dispatch` : '',
          opcServerSystems > 0 ? `${opcServerSystems} OPC Server` : '',
          missionControlOperators > 0 ? `${missionControlOperators} Mission Control Operators` : ''
        ].filter(Boolean).join(', ')})`,
        ramGb: 8,
        cores: 4,
        rule: 'Mission Control / WinGuard / OPC / Elevator Dispatch: Requires +8 GB RAM, +4 CPU cores, and dedicated SQL database instance.',
        datasheet: 'Datasheets/Genetec/Plugins/Advancis_WinGuard_PSIM_Genetec_Integration.pdf'
      });
    }

    // Media Gateway & GPU Analytics Isolation Check (SystemRequirements.pdf Page 12 & BriefCam/Corsight Guide)
    const mediaGatewayStreams = (webClients * 4) + (mobileClients * 2) + (briefCamConnections > 0 ? Math.min(cameraUnits || 16, 32) : 0) + (corsightAiBridges > 0 ? Math.max(1, Math.ceil(corsightAiBridges / 2)) * 15 : 0) + (effectiveSipIntercoms > 0 ? Math.min(effectiveSipIntercoms, 10) : 0);
    const needsDedicatedMediaGateway = mediaGatewayStreams > 0 && totalVideoConnections > 32;
    const needsDedicatedGpuAnalyticsServer = briefCamConnections > 0 || corsightAiBridges > 0;

    if (needsDedicatedMediaGateway) {
      roleSharingRules.push(`Media Gateway Isolation Rule (SystemRequirements.pdf Page 12): Do NOT co-host Media Gateway (~${mediaGatewayStreams} RTSP/WebRTC streams for Web/Mobile/Analytics/Sipelia) on the same server as an Archiver.`);
    }
    if (needsDedicatedGpuAnalyticsServer) {
      activeRolesAndPlugins.push({
        name: `GPU Video Analytics (${briefCamConnections > 0 ? `BriefCam: ${briefCamConnections} SDK` : ''}${briefCamConnections > 0 && corsightAiBridges > 0 ? ' + ' : ''}${corsightAiBridges > 0 ? `Corsight AI Syfty Suite: ${corsightAiBridges} SDK` : ''})`,
        ramGb: 64,
        cores: 16,
        rule: 'MANDATORY ISOLATION: BriefCam & Corsight AI require a dedicated NVIDIA GPU server (e.g., Streamvault SVA-1000E, 64 GB RAM). Corsight Syfty Suite v1.1 requires H.264 camera streams and Media Gateway role with RTSPS (Require TLS) DISABLED.',
        datasheet: corsightAiBridges > 0
          ? 'Datasheets/Genetec/Plugins/Corsight Syfty Genetec - User Guide 2026.pdf'
          : 'Datasheets/Genetec/Plugins/BriefCam_Corsight_Video_Analytics_Genetec_Integration.pdf'
      });
      roleSharingRules.push('GPU Analytics Isolation Rule: BriefCam Video Synopsis and Corsight AI Facial Recognition must run on a dedicated GPU appliance (Streamvault SVA-1000E) and pull H.264 streams via Media Gateway RTSP (with RTSPS disabled for Corsight Fortify).');
    }

    const multiRoleServerSpec = {
      requiredServerCores,
      requiredServerRamGb,
      mediaGatewayStreams,
      needsDedicatedMediaGateway,
      needsDedicatedGpuAnalyticsServer,
      requiresDedicatedDirectory,
      exceedsUnifiedServerCap,
      activeRolesAndPlugins,
      roleSharingRules
    };

    const totalSoftwareMsrp = lineItems.reduce((sum, li) => sum + li.extendedMsrp, 0);
    const streamvaultPlan = this.recommendStreamvaultAppliances(videoLoad, baseConfig, {
      quotedWorkstationUnits: bomWorkstations
    });

    // Attach SVA-1000E Analytics Appliance recommendation when BriefCam or Corsight AI is enabled
    if (needsDedicatedGpuAnalyticsServer) {
      const serversDb = (typeof window !== 'undefined' && Array.isArray(window.SERVERS_DATABASE)) ? window.SERVERS_DATABASE : [];
      const svaAppliance = serversDb.find(s => s.id === 'genetec-sva-1000e-r2') || serversDb.find(s => String(s.applianceSeries || '').startsWith('SVA-'));
      if (svaAppliance) {
        streamvaultPlan.analyticsAppliance = svaAppliance;
        streamvaultPlan.analyticsQty = Math.max(1, Math.ceil(corsightAiBridges / 2));
      }
    }

    const totalHardwareMsrp =
      ((streamvaultPlan.primaryAppliance?.msrp || 0) * (streamvaultPlan.primaryQty || 0)) +
      ((streamvaultPlan.directoryAppliance?.msrp || 0) * (streamvaultPlan.directoryQty || 0)) +
      ((streamvaultPlan.analyticsAppliance?.msrp || 0) * (streamvaultPlan.analyticsQty || 0));

    return {
      config: baseConfig,
      videoLoad,
      cameraUnits,
      // Feature Toggle Flags
      enableFederation,
      enableCardholderSync,
      enableEncodersDvr,
      enableSipelia,
      enableLpr,
      enableVideoFailover,
      enableCloudServices,
      enableBiometricsIdentity,
      enableClearId,
      enableKeyManagement,
      enablePartnerSdks,
      enableBuildingPsim,
      enableIiot,
      enableIntrusionPanels,
      enableRsa,
      // Calculated Counts
      analogEncoderChannels,
      dvrNvrChannels,
      totalVideoConnections,
      synergisGenetecReaders,
      synergisExternalReaders,
      totalSynergisReaders,
      effectiveTier,
      advantageYears,
      coreFailover,
      failoverMode,
      failoverCameraQty,
      standbyServerCount,
      sqlExpressMaxGb,
      estimatedSqlDbGb,
      needsSqlStandard,
      includedBaseFeatures,
      freeClientsIncluded,
      workstationClients,
      extraClients,
      mobileClients,
      webClients,
      federationSites,
      federationSmallSites,
      stratocastFedSites,
      globalCardholderSystems,
      cardSyncDataSources,
      cardSyncLicenseBlocks,
      effectiveLprCameras,
      sipeliaMode,
      effectiveSipIntercoms,
      sipTrunks,
      sipPublicAddress,
      intrusionPanels,
      intrusionPanelManufacturer,
      supremaDevices,
      supremaPluginServers,
      supremaEndpoints: supremaPluginServers,
      supremaSdkConnections,
      supremaCloudLinksNeeded,
      idemiaMorphoEnabled,
      controlIdBridgeServers,
      princetonIdentityServers,
      clearIdIdentities,
      clearIdKiosks,
      idScannerClients,
      xpressEntryServers,
      medecoXtLocks,
      keyCabinetCount,
      briefCamConnections,
      corsightAiBridges,
      alliedStreamConnectInstances,
      winGuardNodes,
      effectiveRsaTier,
      rsaShortRangeSensors,
      rsaRadars,
      rsaFenceControllers,
      rsaFenceKm,
      swmRpmUnits,
      swmRpmBlocks,
      genericSdkConnections,
      selectedPartnerSdks: activePartnerSdks,
      multiRoleServerSpec,
      compatibilityWarnings,
      lineItems,
      totalSoftwareMsrp,
      streamvaultPlan,
      totalHardwareMsrp,
      combinedTurnkeyMsrp: totalSoftwareMsrp + totalHardwareMsrp
    };
  }
};

// Global Browser Exports
window.IEEE_POE_STANDARDS = IEEE_POE_STANDARDS;
window.ELECTRICAL_CONSTANTS = ELECTRICAL_CONSTANTS;
window.NetworkSizer = NetworkSizer;
window.VIDEO_STORAGE_CONSTANTS = VIDEO_STORAGE_CONSTANTS;
window.GENETEC_514_REQUIREMENTS = GENETEC_514_REQUIREMENTS;
window.VideoStorageSizer = VideoStorageSizer;
window.GenetecLicensingSizer = GenetecLicensingSizer;


