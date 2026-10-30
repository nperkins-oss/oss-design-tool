// =========================================================================
// PORT & PHYSICAL INTERFACE ENGINE (NetSelect Enterprise)
// Master Engine for Switch Ports, Device Interfaces, Uplinks, and Power Delivery
// =========================================================================

/**
 * Standard Media Types & Maximum Theoretical Wire Speeds
 */
const PORT_MEDIA_TYPES = {
  rj45_100m: { id: "rj45_100m", label: "100M Fast Ethernet Copper", speed: "100M", speedMbps: 100, connector: "RJ-45", defaultPoe: "af" },
  rj45_1g: { id: "rj45_1g", label: "1G RJ-45 Copper", speed: "1G", speedMbps: 1000, connector: "RJ-45", defaultPoe: "at" },
  rj45_mgig: { id: "rj45_mgig", label: "2.5G/5G Multi-Gig Copper", speed: "2.5G", speedMbps: 2500, connector: "RJ-45", defaultPoe: "bt60" },
  rj45_mgeg: { id: "rj45_mgig", label: "2.5G/5G Multi-Gig Copper", speed: "2.5G", speedMbps: 2500, connector: "RJ-45", defaultPoe: "bt60" },
  "rj45_2.5g": { id: "rj45_2.5g", label: "2.5G Multi-Gig Copper", speed: "2.5G", speedMbps: 2500, connector: "RJ-45", defaultPoe: "bt60" },
  rj45_2_5g: { id: "rj45_2.5g", label: "2.5G Multi-Gig Copper", speed: "2.5G", speedMbps: 2500, connector: "RJ-45", defaultPoe: "bt60" },
  rj45_5g: { id: "rj45_5g", label: "5G Multi-Gig Copper", speed: "5G", speedMbps: 5000, connector: "RJ-45", defaultPoe: "bt60" },
  rj45_10g: { id: "rj45_10g", label: "10G RJ-45 Copper", speed: "10G", speedMbps: 10000, connector: "RJ-45", defaultPoe: "bt90" },
  sfp_1g: { id: "sfp_1g", label: "1G SFP Optical Cage", speed: "1G", speedMbps: 1000, connector: "SFP", defaultPoe: null },
  "sfp_2.5g": { id: "sfp_2.5g", label: "2.5G SFP Optical Cage", speed: "2.5G", speedMbps: 2500, connector: "SFP", defaultPoe: null },
  sfp_2_5g: { id: "sfp_2.5g", label: "2.5G SFP Optical Cage", speed: "2.5G", speedMbps: 2500, connector: "SFP", defaultPoe: null },
  sfp_plus_10g: { id: "sfp_plus_10g", label: "10G SFP+ Optical Cage", speed: "10G", speedMbps: 10000, connector: "SFP+", defaultPoe: null },
  sfp28_25g: { id: "sfp28_25g", label: "25G SFP28 Optical Cage", speed: "25G", speedMbps: 25000, connector: "SFP28", defaultPoe: null },
  sfp56_50g: { id: "sfp56_50g", label: "50G SFP56 Optical Cage", speed: "50G", speedMbps: 50000, connector: "SFP56", defaultPoe: null },
  qsfp_plus_40g: { id: "qsfp_plus_40g", label: "40G QSFP+ Optical Cage", speed: "40G", speedMbps: 40000, connector: "QSFP+", defaultPoe: null },
  qsfp28_100g: { id: "qsfp28_100g", label: "100G QSFP28 Optical Cage", speed: "100G", speedMbps: 100000, connector: "QSFP28", defaultPoe: null },
  dac_copper: { id: "dac_copper", label: "Direct Attach Copper (DAC)", speed: "10G", speedMbps: 10000, connector: "SFP+ DAC", defaultPoe: null },
  terminal_block: { id: "terminal_block", label: "DC Terminal Block", speed: "0G", speedMbps: 0, connector: "Terminal", defaultPoe: null }
};

/**
 * Power Source Delivery Modes
 */
const POWER_SOURCE_MODES = {
  poe_switch: {
    id: "poe_switch",
    label: "PoE from Switch",
    badgeLabel: "PoE",
    icon: "zap",
    drawsFromSwitch: true,
    requiresExternalPsu: false,
    description: "Draws 802.3af/at/bt power directly from the host switch port budget"
  },
  internal_psu: {
    id: "internal_psu",
    label: "Internal AC Power Supply",
    badgeLabel: "Internal AC",
    icon: "power",
    drawsFromSwitch: false,
    requiresExternalPsu: false,
    description: "Built-in commercial 100-240V AC power supply plugged into PDU or wall outlet"
  },
  dual_ac: {
    id: "dual_ac",
    label: "Dual Redundant Hot-Swap AC",
    badgeLabel: "Dual AC",
    icon: "shield-check",
    drawsFromSwitch: false,
    requiresExternalPsu: false,
    description: "Dual 1+1 redundant hot-swap AC power supplies on separate circuit feeds"
  },
  poe_injector: {
    id: "poe_injector",
    label: "PoE Midspan / Injector",
    badgeLabel: "Injector",
    icon: "plug",
    drawsFromSwitch: false,
    requiresExternalPsu: true,
    description: "Data connects to switch; power delivered by dedicated external PoE injector"
  },
  dedicated_dc: {
    id: "dedicated_dc",
    label: "Dedicated DC Power Supply",
    badgeLabel: "DC PSU",
    icon: "battery-charging",
    drawsFromSwitch: false,
    requiresExternalPsu: true,
    description: "Powered by 12V / 24V / 48V DC power supply or DIN-rail converter"
  },
  dedicated_ac: {
    id: "dedicated_ac",
    label: "Direct AC Mains Supply",
    badgeLabel: "AC Mains",
    icon: "plug-zap",
    drawsFromSwitch: false,
    requiresExternalPsu: false,
    description: "Internal AC power supply plugged into commercial 120V / 240V circuit or PDU"
  },
  solar_battery: {
    id: "solar_battery",
    label: "Solar / Battery Enclosure",
    badgeLabel: "Solar",
    icon: "sun",
    drawsFromSwitch: false,
    requiresExternalPsu: true,
    description: "Off-grid 12V/24V solar array with battery backup storage"
  },
  passive: {
    id: "passive",
    label: "Passive Infrastructure",
    badgeLabel: "Passive",
    icon: "box",
    drawsFromSwitch: false,
    requiresExternalPsu: false,
    description: "Passive physical enclosure, rack frame, patch panel, cable, or mount requiring no power"
  }
};

/**
 * Master Port Engine
 */
const PortEngine = {
  MEDIA: PORT_MEDIA_TYPES,
  POWER_MODES: POWER_SOURCE_MODES,

  /**
   * Resolves the default and currently installed modular uplink module specification for a switch
   */
  resolveModularUplinkSpec(item) {
    if (!item || !item.modularUplink || !item.modularUplink.hasSlot) return null;
    const catalog = (typeof MODULAR_UPLINK_CATALOG !== "undefined" && MODULAR_UPLINK_CATALOG) ? MODULAR_UPLINK_CATALOG : {};
    const findMod = (skuOrKey) => {
      if (!skuOrKey || skuOrKey === "none") return null;
      if (catalog[skuOrKey]) return { key: skuOrKey, mod: catalog[skuOrKey] };
      const foundKey = Object.keys(catalog).find(k => catalog[k] && catalog[k].sku === skuOrKey);
      return foundKey ? { key: foundKey, mod: catalog[foundKey] } : null;
    };
    const inferCageSpec = (mod) => {
      if (!mod || !mod.ports || mod.ports <= 0) return null;
      const spd = (mod.speed || "10G").toUpperCase();
      const nm = (mod.name || "").toLowerCase();
      const isCopper = Boolean(mod.isCopperUplink || mod.connector === "RJ-45" || /rj-?45|copper|base-t|multi-?gig/i.test(nm));
      if (isCopper) {
        const mediaType = mod.mediaType || (spd.includes("10") ? "rj45_10g" : (spd.includes("5") ? "rj45_5g" : (spd.includes("2.5") ? "rj45_2.5g" : "rj45_1g")));
        return { count: parseInt(mod.ports, 10) || 0, speed: spd, connector: "RJ-45", mediaType, prefix: "MGig ", isCopperUplink: true };
      }
      if (mod.mediaType && mod.connector) {
        const pfx = mod.connector.startsWith("QSFP") ? "Q" : `${mod.connector} `;
        return { count: parseInt(mod.ports, 10) || 0, speed: spd, connector: mod.connector, mediaType: mod.mediaType, prefix: pfx, isCopperUplink: false };
      }
      if (spd.includes("100")) return { count: parseInt(mod.ports, 10) || 0, speed: "100G", connector: "QSFP28", mediaType: "qsfp28_100g", prefix: "Q", isCopperUplink: false };
      if (spd.includes("50")) return { count: parseInt(mod.ports, 10) || 0, speed: "50G", connector: "SFP56", mediaType: "sfp56_50g", prefix: "SFP56 ", isCopperUplink: false };
      if (spd.includes("40")) return { count: parseInt(mod.ports, 10) || 0, speed: "40G", connector: "QSFP+", mediaType: "qsfp_plus_40g", prefix: "Q", isCopperUplink: false };
      if (spd.includes("25")) return { count: parseInt(mod.ports, 10) || 0, speed: "25G", connector: "SFP28", mediaType: "sfp28_25g", prefix: "SFP28 ", isCopperUplink: false };
      if (spd.includes("10")) return { count: parseInt(mod.ports, 10) || 0, speed: "10G", connector: "SFP+", mediaType: "sfp_plus_10g", prefix: "SFP+ ", isCopperUplink: false };
      return { count: parseInt(mod.ports, 10) || 0, speed: "1G", connector: "SFP", mediaType: "sfp_1g", prefix: "SFP ", isCopperUplink: false };
    };

    const defaultLookup = findMod(item.modularUplink.defaultModuleSku);
    const defaultSpec = defaultLookup ? inferCageSpec(defaultLookup.mod) : null;

    let activeSku = item.installedUplinkModuleSku;
    if (activeSku === undefined && item.instanceId && typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) {
      const childMod = projectBOM.find(i => i && i.parentInstanceId === item.instanceId && i.role === "Uplink Module");
      if (childMod) {
        activeSku = childMod.id || childMod.sku;
      }
    }
    if (activeSku === undefined) {
      activeSku = item.modularUplink.defaultModuleSku || "none";
    }

    const activeLookup = findMod(activeSku);
    const activeSpec = activeLookup ? inferCageSpec(activeLookup.mod) : null;
    return {
      resolvedKey: activeLookup ? activeLookup.key : (activeSku || "none"),
      defaultSpec,
      activeSpec
    };
  },

  /**
   * Checks if switch has dedicated physical stacking hardware (e.g. Cisco StackWise)
   * vs using standard high-speed optical uplink cages for stacking (e.g. UniFi, Aruba VSF)
   */
  hasDedicatedStackPorts(item) {
    if (!item) return false;
    const v = (item.vendor || "").toLowerCase();
    const m = (item.model || "").toLowerCase();
    const s = (item.sku || "").toLowerCase();
    // UniFi switches do NOT have dedicated stacking ports - they stack via optical cages
    if (v === "unifi" || /unifi|ubiquiti/i.test(m)) return false;
    if (item.hasDedicatedStackPorts !== undefined) return !!item.hasDedicatedStackPorts;
    return /stackwise|stack-t1a|stack-t1|stack-t3|stack-t4|c9350|c9300|c9200|c3850|ms350|ms355|ms390|ms425/i.test(m + " " + s);
  },

  /**
   * Initializes or normalizes physical ports on a switch item
   * @param {Object} item - BOM line item representing a switch or router
   * @returns {Array} Array of standardized port objects
   */
  initSwitchPorts(item, forceReinit = false) {
    if (!item) return [];

    if (typeof enrichBOMItemFromCatalog === "function") {
      enrichBOMItemFromCatalog(item);
    }

    const isStacked = (item.stackedUnits && item.stackedUnits >= 2) || 
      (item.stackedUnits !== 0 && item.qty >= 2 && (item.canStack || item.role === "Access" || item.role === "Aggregation"));
    const stackUnits = isStacked ? (item.stackedUnits || item.qty) : 1;
    const modState = this.resolveModularUplinkSpec(item);
    const resolvedModKey = modState ? modState.resolvedKey : null;
    const uplinkPolicy = (item.uplinkModuleStackPolicy === "all") ? "all" : "first_last";

    if (!forceReinit && Array.isArray(item.physicalPorts) && item.physicalPorts.length > 0 && item._lastStackUnits === stackUnits && item._lastUplinkModuleSku === resolvedModKey && item._lastUplinkPolicy === uplinkPolicy) {
      return item.physicalPorts;
    }

    // Preserve existing connection metadata when resizing stack or reinitializing
    const existingConnections = {};
    if (Array.isArray(item.physicalPorts)) {
      item.physicalPorts.forEach(p => {
        if (p.connectedDeviceId) {
          existingConnections[p.portNumber] = {
            connectedDeviceId: p.connectedDeviceId,
            connectedDeviceModel: p.connectedDeviceModel,
            connectedPortNumber: p.connectedPortNumber,
            poeOutputWatts: p.poeOutputWatts,
            linkStatus: p.linkStatus
          };
        }
      });
    }

    // Backward compatibility: if item.ports was previously set to an array of port objects
    if (Array.isArray(item.ports) && item.ports.length > 0 && typeof item.ports[0] === "object") {
      item.physicalPorts = item.ports;
      item.ports = item.physicalPorts.filter(p => p.role === "access" || !p.isUplink).length || 24;
      return item.physicalPorts;
    }

    const totalPortCount = parseInt(item.portCount || item.ports, 10) || 24;
    const poeBudget = parseFloat(item.poeBudget) || 0;
    const poeAfCount = parseInt(item.poeAfPorts, 10) || 0;
    const poeAtCount = parseInt(item.poeAtPorts, 10) || (poeBudget > 0 ? totalPortCount : 0);
    const poeBt60Count = parseInt(item.poeBt60Ports, 10) || 0;
    const poeBt90Count = parseInt(item.poeBt90Ports, 10) || 0;

    // Detect optical uplink cages from uplinksSummary, SKU, or port descriptions
    const portDesc = `${item.portFormFactorSummary || ''} ${item.uplinksSummary || ''} ${item.description || ''}`.toLowerCase();
    const rawPb = (item.portsBreakdown && typeof item.portsBreakdown === "object") ? item.portsBreakdown : null;
    let pb = rawPb ? { ...rawPb } : null;
    if (pb && modState && modState.defaultSpec && !modState.defaultSpec.isCopperUplink) {
      const defKey = modState.defaultSpec.mediaType;
      if (pb[defKey] !== undefined) {
        pb[defKey] = Math.max(0, (parseInt(pb[defKey], 10) || 0) - modState.defaultSpec.count);
      }
    }
    const pbCopperCount = pb
      ? (parseInt(pb.rj45_100m, 10) || 0) +
        (parseInt(pb.rj45_1g, 10) || 0) +
        (parseInt(pb.rj45_2_5g || pb["rj45_2.5g"], 10) || 0) +
        (parseInt(pb.rj45_5g, 10) || 0) +
        (parseInt(pb.rj45_10g, 10) || 0)
      : 0;
    const pbOpticalCount = pb
      ? (parseInt(pb.sfp_1g, 10) || 0) +
        (parseInt(pb.sfp_2_5g || pb["sfp_2.5g"], 10) || 0) +
        (parseInt(pb.sfp_plus_10g, 10) || 0) +
        (parseInt(pb.sfp28_25g, 10) || 0) +
        (parseInt(pb.sfp56_50g, 10) || 0) +
        (parseInt(pb.qsfp_plus_40g, 10) || 0) +
        (parseInt(pb.qsfp28_100g, 10) || 0)
      : 0;

    // Check if device is an all-optical spine / aggregation switch (e.g. 32x 100G QSFP28 Core)
    const isAllOptical = (pb && pbOpticalCount > 0 && pbCopperCount === 0) || (
      !pb && (
        item.role === "Core" || 
        item.role === "Aggregation" || 
        item.role === "Core & Agg" || 
        portDesc.includes("qsfp") || 
        portDesc.includes("cage")
      ) && !portDesc.includes("rj-45") && !portDesc.includes("rj45") && !portDesc.includes("base-t") && poeBudget === 0
    );

    const ports = [];

    if (isAllOptical) {
      // Build exact optical cage list if portsBreakdown is available, else use primary speed
      const opticalCageDefs = [];
      const modularOpticalDefs = [];
      if (pb && pbOpticalCount > 0) {
        const pushCages = (cnt, speed, media, connector, prefix) => {
          for (let k = 0; k < (parseInt(cnt, 10) || 0); k++) {
            opticalCageDefs.push({ speed, media, connector, prefix });
          }
        };
        pushCages(pb.sfp_1g, "1G", "sfp_1g", "SFP", "SFP ");
        pushCages(pb.sfp_2_5g || pb["sfp_2.5g"], "2.5G", "sfp_2.5g", "SFP", "SFP ");
        pushCages(pb.sfp_plus_10g, "10G", "sfp_plus_10g", "SFP+", "SFP+ ");
        pushCages(pb.sfp28_25g, "25G", "sfp28_25g", "SFP28", "SFP28 ");
        pushCages(pb.sfp56_50g, "50G", "sfp56_50g", "SFP56", "SFP56 ");
        pushCages(pb.qsfp_plus_40g, "40G", "qsfp_plus_40g", "QSFP+", "Q");
        pushCages(pb.qsfp28_100g, "100G", "qsfp28_100g", "QSFP28", "Q");
      }
      if (modState && modState.activeSpec) {
        for (let k = 0; k < modState.activeSpec.count; k++) {
          modularOpticalDefs.push({
            speed: modState.activeSpec.speed,
            media: modState.activeSpec.mediaType,
            connector: modState.activeSpec.connector,
            prefix: modState.activeSpec.prefix,
            isModularSledPort: true
          });
        }
      }

      if (opticalCageDefs.length === 0) {
        let speed = "100G";
        let media = "qsfp28_100g";
        let connector = "QSFP28";
        let prefix = "Q";

        if (item.portSpeed === "25G" || portDesc.includes("25g") || portDesc.includes("sfp28")) {
          speed = "25G";
          media = "sfp28_25g";
          connector = "SFP28";
          prefix = "SFP28 ";
        } else if (item.portSpeed === "10G" || portDesc.includes("10g") || portDesc.includes("sfp+")) {
          speed = "10G";
          media = "sfp_plus_10g";
          connector = "SFP+";
          prefix = "SFP+ ";
        } else if (item.portSpeed === "40G" || portDesc.includes("40g")) {
          speed = "40G";
          media = "qsfp_plus_40g";
          connector = "QSFP+";
          prefix = "Q";
        }
        for (let k = 0; k < totalPortCount; k++) {
          opticalCageDefs.push({ speed, media, connector, prefix });
        }
      }

      let globalPortIdx = 1;
      for (let u = 1; u <= stackUnits; u++) {
        const unitHasMod = (stackUnits > 2 && uplinkPolicy === "first_last") ? (u === 1 || u === stackUnits) : true;
        const unitOpticalDefs = unitHasMod ? [...opticalCageDefs, ...modularOpticalDefs] : [...opticalCageDefs];
        for (let i = 1; i <= unitOpticalDefs.length; i++) {
          const portNum = globalPortIdx++;
          const conn = existingConnections[portNum] || {};
          const cDef = unitOpticalDefs[i - 1];
          ports.push({
            portNumber: portNum,
            unitIndex: u,
            unitPortNumber: i,
            label: stackUnits > 1 ? `Unit ${u} - ${cDef.prefix}${i} (${cDef.speed})` : `${cDef.prefix}${i} (${cDef.speed})`,
            shortLabel: stackUnits > 1 ? `U${u}:Q${i}` : `${cDef.prefix.trim()}${i}`,
            mediaType: cDef.media,
            connector: cDef.connector,
            speed: cDef.speed,
            isModular: Boolean(cDef.isModularSledPort),
            isModularSledPort: Boolean(cDef.isModularSledPort),
            poeStandard: null,
            maxPoeWatts: 0,
            poeOutputWatts: conn.poeOutputWatts || 0,
            connectedDeviceId: conn.connectedDeviceId || null,
            connectedDeviceModel: conn.connectedDeviceModel || null,
            connectedPortNumber: conn.connectedPortNumber || null,
            role: "uplink",
            isUplink: true,
            linkStatus: conn.linkStatus || (conn.connectedDeviceId ? "up" : "down"),
            adminStatus: "up"
          });
        }
      }

      item.physicalPorts = ports;
      item._lastStackUnits = stackUnits;
      item._lastUplinkModuleSku = resolvedModKey;
      item._lastUplinkPolicy = uplinkPolicy;
      this.syncSwitchUplinks(item);
      this.syncSwitchEdgePorts(item);
      return ports;
    }

    // Check if device has dedicated physical stacking hardware (e.g. Cisco StackWise)
    const hasDedicatedStack = this.hasDedicatedStackPorts(item);
    item.hasDedicatedStackPorts = hasDedicatedStack;

    // 1. Prefer structured item.portsBreakdown when available
    const copperTierMap = [];
    const parsedCages = [];
    const modularCages = [];

    if (pb && (pbCopperCount > 0 || pbOpticalCount > 0)) {
      if (parseInt(pb.rj45_10g, 10) > 0) copperTierMap.push({ count: parseInt(pb.rj45_10g, 10), speed: "10G" });
      if (parseInt(pb.rj45_5g, 10) > 0) copperTierMap.push({ count: parseInt(pb.rj45_5g, 10), speed: "5G" });
      const c25 = parseInt(pb.rj45_2_5g || pb["rj45_2.5g"], 10) || 0;
      if (c25 > 0) copperTierMap.push({ count: c25, speed: "2.5G" });
      if (parseInt(pb.rj45_1g, 10) > 0) copperTierMap.push({ count: parseInt(pb.rj45_1g, 10), speed: "1G" });
      if (parseInt(pb.rj45_100m, 10) > 0) copperTierMap.push({ count: parseInt(pb.rj45_100m, 10), speed: "100M" });

      const addOptCages = (cnt, speed, connector, mediaType) => {
        for (let c = 0; c < (parseInt(cnt, 10) || 0); c++) {
          parsedCages.push({ speed, connector, mediaType });
        }
      };
      addOptCages(pb.sfp_1g, "1G", "SFP", "sfp_1g");
      addOptCages(pb.sfp_2_5g || pb["sfp_2.5g"], "2.5G", "SFP", "sfp_2.5g");
      addOptCages(pb.sfp_plus_10g, "10G", "SFP+", "sfp_plus_10g");
      addOptCages(pb.sfp28_25g, "25G", "SFP28", "sfp28_25g");
      addOptCages(pb.sfp56_50g, "50G", "SFP56", "sfp56_50g");
      addOptCages(pb.qsfp_plus_40g, "40G", "QSFP+", "qsfp_plus_40g");
      addOptCages(pb.qsfp28_100g, "100G", "QSFP28", "qsfp28_100g");
      if (modState && modState.activeSpec) {
        for (let c = 0; c < modState.activeSpec.count; c++) {
          modularCages.push({
            speed: modState.activeSpec.speed,
            connector: modState.activeSpec.connector,
            mediaType: modState.activeSpec.mediaType,
            isModularSledPort: true
          });
        }
      }
    } else {
      // Fallback: Parse multi-tier copper port breakdown from portFormFactorSummary or interfaces
      const copperRegex = /(\d+)\s*x\s*([0-9.]+[MGKmgk]?)\s*(?:RJ-?45|copper|base-t|gbe)?/gi;
      let cMatch;
      const formSummary = `${item.portFormFactorSummary || ''} ${item.interfaces || ''}`;
      const hasCopper = formSummary.toLowerCase().includes("rj-45") || 
                        formSummary.toLowerCase().includes("rj45") || 
                        formSummary.toLowerCase().includes("copper") || 
                        formSummary.toLowerCase().includes("base-t") ||
                        formSummary.toLowerCase().includes("gbe");
      if (hasCopper) {
        while ((cMatch = copperRegex.exec(formSummary)) !== null) {
          const full = cMatch[0].toLowerCase();
          if (!full.includes("sfp") && !full.includes("qsfp") && !full.includes("cage")) {
            const count = parseInt(cMatch[1], 10);
            let spd = cMatch[2].toUpperCase();
            if (!spd.endsWith("G") && !spd.endsWith("M")) spd += "G";
            copperTierMap.push({ count, speed: spd });
          }
        }
      }

      if (modState && modState.activeSpec) {
        for (let c = 0; c < modState.activeSpec.count; c++) {
          modularCages.push({
            speed: modState.activeSpec.speed,
            connector: modState.activeSpec.connector,
            mediaType: modState.activeSpec.mediaType,
            isModularSledPort: true
          });
        }
      }
      // Parse fixed optical uplink cages from uplinksSummary, portFormFactorSummary or interfaces (skip when modular bay governs uplinks)
      const uplinkRegex = /(\d+)\s*x\s*([0-9.]+[MGKmgk]?)\s*(sfp28|qsfp28|sfp\+|qsfp\+|sfp|qsfp|cages?)/gi;
      let uMatch;
      const allOpticalText = modState ? '' : `${item.uplinksSummary || ''} ${item.portFormFactorSummary || ''} ${item.interfaces || ''}`;
      while ((uMatch = uplinkRegex.exec(allOpticalText)) !== null) {
        const count = parseInt(uMatch[1], 10);
        let spd = uMatch[2].toUpperCase();
        if (!spd.endsWith("G") && !spd.endsWith("M")) spd += "G";
        const typeStr = (uMatch[3] || '').toLowerCase();
        let conn = "SFP+";
        let media = "sfp_plus_10g";
        if (spd.includes("100") || typeStr.includes("qsfp28")) {
          conn = "QSFP28";
          media = "qsfp28_100g";
        } else if (spd.includes("40") || typeStr.includes("qsfp")) {
          conn = "QSFP+";
          media = "qsfp_plus_40g";
        } else if (spd.includes("25") || typeStr.includes("sfp28")) {
          conn = "SFP28";
          media = "sfp28_25g";
        } else if (spd.includes("10") || typeStr.includes("sfp+")) {
          conn = "SFP+";
          media = "sfp_plus_10g";
        } else if (spd.includes("2.5")) {
          conn = "SFP";
          media = "sfp_2.5g";
        } else if (spd.includes("1") || typeStr.includes("sfp")) {
          conn = "SFP";
          media = "sfp_1g";
        }
        for (let c = 0; c < count; c++) {
          parsedCages.push({ speed: spd, connector: conn, mediaType: media });
        }
      }
    }

    const allOpticalText = `${item.uplinksSummary || ''} ${item.portFormFactorSummary || ''} ${item.interfaces || ''}`;

    const hasOpticalExplicitly = /sfp28|qsfp28|sfp\+|qsfp\+|sfp|qsfp|optical|cage/i.test(allOpticalText);
    const isPureCopperSwitch = !hasOpticalExplicitly && (
      (item.uplinksSummary && /copper|rj45|rj-45|none/i.test(item.uplinksSummary)) ||
      (item.portFormFactorSummary && !/sfp|qsfp/i.test(item.portFormFactorSummary) && /rj45|rj-45|copper/i.test(item.portFormFactorSummary)) ||
      (item.maxBackboneSpeed === "1G" && totalPortCount <= 16) ||
      /flex|ultra|lite-8|lite-16|flex-mini|gs910|fs708/i.test(item.sku || item.model || '')
    );

    let uplinkPortCount = parsedCages.length + modularCages.length;
    if (uplinkPortCount === 0 && !isPureCopperSwitch && !modState) {
      if (portDesc.includes("100g") || (item.maxBackboneSpeed === "100G")) {
        uplinkPortCount = 4;
        for (let k = 0; k < 4; k++) parsedCages.push({ speed: "100G", connector: "QSFP28", mediaType: "qsfp28_100g" });
      } else if (portDesc.includes("40g") || (item.maxBackboneSpeed === "40G")) {
        uplinkPortCount = 2;
        for (let k = 0; k < 2; k++) parsedCages.push({ speed: "40G", connector: "QSFP+", mediaType: "qsfp_plus_40g" });
      } else if (portDesc.includes("25g") || (item.maxBackboneSpeed === "25G")) {
        uplinkPortCount = 4;
        for (let k = 0; k < 4; k++) parsedCages.push({ speed: "25G", connector: "SFP28", mediaType: "sfp28_25g" });
      } else if (portDesc.includes("10g") || (item.maxBackboneSpeed === "10G") || totalPortCount >= 24) {
        uplinkPortCount = (totalPortCount === 52 || totalPortCount === 48) ? 4 : (totalPortCount === 28 ? 4 : 2);
        for (let k = 0; k < uplinkPortCount; k++) parsedCages.push({ speed: "10G", connector: "SFP+", mediaType: "sfp_plus_10g" });
      } else if (portDesc.includes("sfp")) {
        uplinkPortCount = 2;
        for (let k = 0; k < 2; k++) parsedCages.push({ speed: "1G", connector: "SFP", mediaType: "sfp_1g" });
      }
    }

    // Determine access ports per unit
    let accessPortCount = totalPortCount;
    if (pb && pbCopperCount > 0) {
      accessPortCount = pbCopperCount;
    } else if (totalPortCount === 52) accessPortCount = 48;
    else if (totalPortCount === 28) accessPortCount = 24;
    else if (totalPortCount > uplinkPortCount && (totalPortCount === 24 || totalPortCount === 48)) {
      accessPortCount = totalPortCount;
    } else {
      accessPortCount = Math.max(1, totalPortCount - uplinkPortCount);
    }

    let globalPortIdx = 1;
    for (let u = 1; u <= stackUnits; u++) {
      const nextU = u === stackUnits ? 1 : u + 1;
      const prevU = u === 1 ? stackUnits : u - 1;

      // 1. Generate Access / Downlink Ports (RJ-45) for Unit u with accurate Multi-Gig speeds
      for (let i = 1; i <= accessPortCount; i++) {
        const portNum = globalPortIdx++;
        const conn = existingConnections[portNum] || {};
        let poeStandard = null;
        let maxPoeWatts = 0;

        if (poeBudget > 0) {
          const totalExplicitPoe = poeBt90Count + poeBt60Count + poeAtCount + poeAfCount;
          if (i <= poeBt90Count) {
            poeStandard = "bt90";
            maxPoeWatts = 90;
          } else if (i <= (poeBt90Count + poeBt60Count)) {
            poeStandard = "bt60";
            maxPoeWatts = 60;
          } else if (i <= (poeBt90Count + poeBt60Count + poeAtCount)) {
            poeStandard = "at";
            maxPoeWatts = 30;
          } else if (i <= totalExplicitPoe) {
            poeStandard = "af";
            maxPoeWatts = 15.4;
          } else if (totalExplicitPoe === 0) {
            // Default when no port breakdown was specified
            poeStandard = "at";
            maxPoeWatts = 30;
          } else {
            // Non-PoE copper port on a hybrid switch (e.g. USW-24-PoE ports 17-24)
            poeStandard = null;
            maxPoeWatts = 0;
          }
        }

        // Determine port speed from copper tier breakdown or item.portSpeed
        let portSpeed = "1G";
        let speedLabel = "10/100/1000 Base-T Gigabit";
        let mediaType = "rj45_1g";

        if (copperTierMap.length > 0) {
          let accum = 0;
          for (const tier of copperTierMap) {
            accum += tier.count;
            if (i <= accum) {
              portSpeed = tier.speed;
              break;
            }
          }
        } else if (item.portSpeed) {
          const ps = item.portSpeed.toUpperCase();
          if (ps.includes("10G")) portSpeed = "10G";
          else if (ps.includes("2.5G")) portSpeed = "2.5G";
          else if (ps.includes("5G")) portSpeed = "5G";
        }

        if (portSpeed === "10G") {
          speedLabel = "10G Base-T Multi-Gig (100M/1G/2.5G/5G/10G)";
          mediaType = "rj45_10g";
        } else if (portSpeed === "2.5G") {
          speedLabel = "2.5G Base-T Multi-Gig (100M/1G/2.5G)";
          mediaType = "rj45_2.5g";
        } else if (portSpeed === "5G") {
          speedLabel = "5G Base-T Multi-Gig (100M/1G/2.5G/5G)";
          mediaType = "rj45_5g";
        } else if (portSpeed === "100M") {
          speedLabel = "10/100 Base-TX Fast Ethernet";
          mediaType = "rj45_100m";
        }

        const isPoEIngest = (i === 1 && Boolean(
          (item.uplinksSummary && /ingest|poe-in|poe\s*in/i.test(item.uplinksSummary)) ||
          item.poePassThrough
        ));

        ports.push({
          portNumber: portNum,
          unitIndex: u,
          unitPortNumber: i,
          label: isPoEIngest ? (stackUnits > 1 ? `Unit ${u} - Port 1 (PoE Ingest)` : `Port 1 (PoE Ingest)`) : (stackUnits > 1 ? `Unit ${u} - Port ${i} (${u}/${i})` : `Port ${i}`),
          shortLabel: isPoEIngest ? (stackUnits > 1 ? `${u}/PoE-In` : `PoE-In`) : (stackUnits > 1 ? `${u}/${i}` : `P${i}`),
          mediaType: mediaType,
          connector: "RJ-45",
          speed: portSpeed,
          speedLabel: speedLabel,
          poeStandard,
          maxPoeWatts,
          poeOutputWatts: conn.poeOutputWatts || 0,
          connectedDeviceId: conn.connectedDeviceId || null,
          connectedDeviceModel: conn.connectedDeviceModel || null,
          connectedPortNumber: conn.connectedPortNumber || null,
          role: isPoEIngest ? "uplink" : "access",
          isUplink: isPoEIngest,
          isPoEIngest: isPoEIngest,
          linkStatus: conn.linkStatus || (conn.connectedDeviceId ? "up" : "down"),
          adminStatus: "up"
        });
      }

      // 2. Generate Uplink / Backbone Optical Cages for Unit u
      // When stacking > 2 switches, only 1st (Unit 1) and Last (Unit stackUnits) populate modular uplink modules unless policy === "all"!
      const unitHasModularSled = (stackUnits > 2 && uplinkPolicy === "first_last") ? (u === 1 || u === stackUnits) : true;
      const unitCages = (unitHasModularSled || (!hasDedicatedStack && parsedCages.length < 2))
        ? [...parsedCages, ...modularCages]
        : [...parsedCages];
      // If stacked without dedicated stack ports (e.g. UniFi), the last 2 cages act as the Stacking Interconnect Ring!
      for (let j = 1; j <= unitCages.length; j++) {
        const portNum = globalPortIdx++;
        const conn = existingConnections[portNum] || {};
        const cageDef = unitCages[j - 1];
        const isStackInterconnect = (isStacked && !hasDedicatedStack && j > (unitCages.length - 2));

        let role = isStackInterconnect ? "stack_interconnect" : "uplink";
        let isUplink = !isStackInterconnect;
        let speedLabel = isStackInterconnect 
          ? `${cageDef.speed} Stacking DAC Ring` 
          : (cageDef.connector === "RJ-45" ? `${cageDef.speed} RJ-45 Copper Uplink` : `${cageDef.speed} ${cageDef.connector} Optical Cage`);
        let label = isStackInterconnect
          ? (j === unitCages.length ? `Unit ${u} - Stk DAC 2 (${cageDef.speed}) ← Unit ${prevU}` : `Unit ${u} - Stk DAC 1 (${cageDef.speed}) → Unit ${nextU}`)
          : (stackUnits > 1 ? `Unit ${u} - Uplink ${j} (${cageDef.speed})` : `Uplink ${j} (${cageDef.speed})`);
        let shortLabel = isStackInterconnect
          ? `U${u}:Stk${j - (unitCages.length - 2)}`
          : (stackUnits > 1 ? `U${u}:${cageDef.connector === "RJ-45" ? "U" : "Q"}${j}` : `${cageDef.connector === "RJ-45" ? "U" : "Q"}${j}`);

        ports.push({
          portNumber: portNum,
          unitIndex: u,
          unitPortNumber: accessPortCount + j,
          label: label,
          shortLabel: shortLabel,
          mediaType: isStackInterconnect ? "dac_copper" : cageDef.mediaType,
          connector: cageDef.connector,
          speed: cageDef.speed,
          speedLabel: speedLabel,
          isStackPort: isStackInterconnect,
          isModular: Boolean(cageDef.isModularSledPort),
          isModularSledPort: Boolean(cageDef.isModularSledPort),
          poeStandard: null,
          maxPoeWatts: 0,
          poeOutputWatts: 0,
          connectedDeviceId: isStackInterconnect ? `stack-member-${nextU}` : (conn.connectedDeviceId || null),
          connectedDeviceModel: isStackInterconnect ? `Chassis Unit ${nextU} (Stack Interconnect Ring)` : (conn.connectedDeviceModel || null),
          connectedPortNumber: isStackInterconnect ? `Stk-${j}` : (conn.connectedPortNumber || null),
          role: role,
          isUplink: isUplink,
          linkStatus: isStackInterconnect ? "up" : (conn.linkStatus || (conn.connectedDeviceId ? "up" : "down")),
          adminStatus: "up"
        });
      }
    }

    item.physicalPorts = ports;
    item._lastStackUnits = stackUnits;
    item._lastUplinkModuleSku = resolvedModKey;
    item._lastUplinkPolicy = uplinkPolicy;
    this.syncSwitchUplinks(item);
    this.syncSwitchEdgePorts(item);
    return ports;
  },

  /**
   * Synchronizes backbone optical uplinks between access switches and core switches
   * Ensures uplink cages in the physical port matrix reflect live connected devices with deep-linking
   * @param {Object} item - Switch BOM item
   */
  syncSwitchUplinks(item, bomById = null) {
    if (!item || !Array.isArray(item.physicalPorts) || typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) return;

    const uplinkPorts = item.physicalPorts.filter(p => p.isUplink || p.role === "uplink");
    if (uplinkPorts.length === 0) return;

    const idMap = bomById || new Map(projectBOM.filter(Boolean).map(i => [i.instanceId, i]));
    const isCoreOrAgg = item.role === "Core" || item.role === "Core & Agg" || item.role === "Aggregation" || item.role === "Spine" || item.role === "Gateways & WAN" || item.role === "Security WAN" || item.role === "Firewall" || item.category === "firewall" || item.category === "Firewall";

    if (isCoreOrAgg) {
      // Find downstream access switches homing back to this core/aggregation switch
      const downstreamSwitches = projectBOM.filter(s => 
        s && (s.customUplinkTargetId === item.instanceId || s.uplinkTargetId === item.instanceId) && 
        s.instanceId !== item.instanceId
      );

      let portIdx = 0;
      downstreamSwitches.forEach(childSw => {
        const linkCount = Math.min(uplinkPorts.length - portIdx, parseInt(childSw.customLinkMultiplier || 1, 10));
        for (let k = 0; k < linkCount; k++) {
          if (portIdx < uplinkPorts.length) {
            const p = uplinkPorts[portIdx];
            p.connectedDeviceId = childSw.instanceId;
            p.connectedDeviceModel = childSw.model;
            p.connectedDeviceRole = childSw.role || "Access Switch";
            p.connectedLocation = childSw.closetName || childSw.rackId;
            p.connectedPortNumber = k === 0 ? "Uplink 1" : `Uplink ${k + 1}`;
            p.linkStatus = "up";
            portIdx++;
          }
        }
      });
      // Clear any remaining unassigned uplink cages on this core switch
      for (let m = portIdx; m < uplinkPorts.length; m++) {
        if (!uplinkPorts[m].connectedDeviceId || !idMap.has(uplinkPorts[m].connectedDeviceId)) {
          uplinkPorts[m].connectedDeviceId = null;
          uplinkPorts[m].connectedDeviceModel = null;
          uplinkPorts[m].connectedDeviceRole = null;
          uplinkPorts[m].connectedLocation = null;
          uplinkPorts[m].linkStatus = "down";
        }
      }
    } else {
      // Access Switch: Uplink homes to Core/Agg switch
      // Spread redundant uplinks across distinct stack members (1st member & Last member first!) for chassis diversity
      const targetId = item.customUplinkTargetId || item.uplinkTargetId;
      const targetSw = targetId ? (idMap.get(targetId) || null) : null;
      const linkCount = Math.min(uplinkPorts.length, parseInt(item.customLinkMultiplier || 1, 10));
      const byUnit = new Map();
      uplinkPorts.forEach(p => {
        const uKey = p.unitIndex || 1;
        if (!byUnit.has(uKey)) byUnit.set(uKey, []);
        byUnit.get(uKey).push(p);
      });
      const unitKeys = Array.from(byUnit.keys()).sort((a, b) => a - b);
      if (unitKeys.length > 2) {
        const firstU = unitKeys[0];
        const lastU = unitKeys[unitKeys.length - 1];
        const middleUs = unitKeys.slice(1, -1);
        unitKeys.splice(0, unitKeys.length, firstU, lastU, ...middleUs);
      }
      const selectedPortNums = new Set();
      if (targetSw && linkCount > 0 && unitKeys.length > 0) {
        let round = 0;
        while (selectedPortNums.size < linkCount) {
          let addedInRound = false;
          for (const uKey of unitKeys) {
            const list = byUnit.get(uKey);
            if (round < list.length && selectedPortNums.size < linkCount) {
              selectedPortNums.add(list[round].portNumber);
              addedInRound = true;
            }
          }
          if (!addedInRound) break;
          round++;
        }
      }
      let activeCageSeq = 0;
      uplinkPorts.forEach((p) => {
        if (targetSw && selectedPortNums.has(p.portNumber)) {
          activeCageSeq++;
          const idx = activeCageSeq - 1;
          p.connectedDeviceId = targetSw.instanceId;
          p.connectedDeviceModel = targetSw.model;
          p.connectedDeviceRole = targetSw.role || "Core / Aggregation Switch";
          p.connectedLocation = targetSw.closetName || targetSw.rackId;
          p.connectedPortNumber = `Cage ${idx + 1}`;
          p.linkStatus = "up";
        } else if (!p.connectedDeviceId || p.connectedDeviceId === targetId) {
          p.connectedDeviceId = null;
          p.connectedDeviceModel = null;
          p.connectedDeviceRole = null;
          p.connectedLocation = null;
          p.linkStatus = "down";
        }
      });
    }
  },

  /**
   * Builds an O(1) lookup map of device instanceId -> { normLoc, spaceLower } from placed floorplan nodes
   */
  _buildDropClosetIndex() {
    const dropMap = new Map();
    if (typeof facilityFloors === "undefined" || !Array.isArray(facilityFloors)) return dropMap;
    const allClosets = (typeof getAllClosetsAcrossFacility === "function") ? getAllClosetsAcrossFacility() : [];
    const closetById = new Map();
    allClosets.forEach(c => {
      if (!c || !c.id) return;
      const norm = (typeof FacilityStore !== "undefined") ? FacilityStore.normalize(c.name) : c.name;
      const spaceLower = (typeof FacilityStore !== "undefined") ? FacilityStore.parse(norm).space.toLowerCase() : "";
      closetById.set(c.id, { normLoc: norm, spaceLower });
    });

    for (const fl of facilityFloors) {
      if (!fl || !Array.isArray(fl.nodes)) continue;
      for (const n of fl.nodes) {
        if (!n || !n.assignedClosetId) continue;
        const clInfo = closetById.get(n.assignedClosetId);
        if (!clInfo) continue;
        if (n.instanceId) dropMap.set(n.instanceId, clInfo);
        if (n.id) {
          dropMap.set(n.id, clInfo);
          if (typeof n.id === "string" && n.id.startsWith("dev-")) {
            dropMap.set(n.id.slice(4), clInfo);
          }
        }
      }
    }
    return dropMap;
  },

  /**
   * Synchronizes edge client devices (Cameras, Access Control, APs, Intercoms) homed to this switch
   * Auto-allocates switch ports supporting the device's PoE standards and speed if unassigned
   * @param {Object} switchItem - Network switch BOM item
   * @param {Map} [precomputedDropMap] - Optional pre-indexed drop closet lookup map
   */
  syncSwitchEdgePorts(switchItem, precomputedDropMap = null) {
    if (!switchItem || !Array.isArray(switchItem.physicalPorts) || typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) return;

    const ports = switchItem.physicalPorts;
    const switchLoc = (typeof FacilityStore !== "undefined") ? FacilityStore.normalize(switchItem.closetName || switchItem.rackId) : (switchItem.closetName || switchItem.rackId);
    const switchSpace = (typeof FacilityStore !== "undefined") ? FacilityStore.parse(switchLoc).space.toLowerCase() : "";
    const dropClosetMap = precomputedDropMap || this._buildDropClosetIndex();

    // 1. Gather all field devices that are homed to this switch or in this switch's closet/rack
    const edgeDevices = projectBOM.filter(item => {
      if (!item || item.parentInstanceId || item.instanceId === switchItem.instanceId) return false;
      if (item.isEnclosureFrame || item.isPassive) {
        if (item.uplinkTargetId === switchItem.instanceId) {
          item.uplinkTargetId = null;
          item.assignedSwitchPort = null;
        }
        return false;
      }
      if (typeof DeviceTaxonomy !== "undefined") {
        if ((typeof DeviceTaxonomy.isPassiveOrHostInfrastructure === "function" && DeviceTaxonomy.isPassiveOrHostInfrastructure(item)) ||
            (typeof DeviceTaxonomy.isPowerDistributionOrBackup === "function" && DeviceTaxonomy.isPowerDistributionOrBackup(item))) {
          if (item.uplinkTargetId === switchItem.instanceId) {
            item.uplinkTargetId = null;
            item.assignedSwitchPort = null;
          }
          return false;
        }
      }
      const role = (item.role || "").toLowerCase();
      const cat = (item.category || "").toLowerCase();
      const isEdge = role === "camera" || role === "access control" || role === "intercom" || 
                     cat.includes("camera") || cat.includes("access") || cat.includes("intercom") ||
                     cat.includes("wireless") || role === "wireless bridge" || role === "edge device";
      if (!isEdge) return false;

      // Matches if explicitly homed to this switch
      if (item.uplinkTargetId === switchItem.instanceId) return true;

      // Or if not homed to ANY switch yet (and not explicitly unassigned by user), check if it terminates at this switch's closet / space
      if (!item.uplinkTargetId && !item.unassignedByUser) {
        // A. Check O(1) pre-indexed physical layout drop map
        const clInfo = dropClosetMap.get(item.instanceId);
        if (clInfo) {
          if (clInfo.normLoc === switchLoc || (switchSpace && clInfo.spaceLower === switchSpace)) {
            return true;
          }
        }

        // B. Check BOM closetName
        const devLoc = (typeof FacilityStore !== "undefined") ? FacilityStore.normalize(item.closetName || item.rackId) : (item.closetName || item.rackId);
        if (devLoc === switchLoc) return true;
        if (switchSpace && typeof FacilityStore !== "undefined" && FacilityStore.parse(devLoc).space.toLowerCase() === switchSpace) {
          return true;
        }
      }

      return false;
    });

    // 2. Track assigned ports and reconcile existing vs new connections
    const assignedDevIds = new Set();

    // First pass: Honor devices that already have an explicit assignedSwitchPort
    edgeDevices.forEach(dev => {
      if (dev.assignedSwitchPort) {
        const portNum = parseInt(dev.assignedSwitchPort, 10);
        const p = ports.find(pt => pt.portNumber === portNum && pt.role === "access" && !pt.isUplink);
        if (p) {
          dev.uplinkTargetId = switchItem.instanceId;
          const devPower = this.getDevicePowerSource(dev);
          const devWatts = parseFloat(dev.powerConsumptionWatts || dev.maxPowerWatts || 15.0) * (parseInt(dev.qty, 10) || 1);
          p.connectedDeviceId = dev.instanceId;
          p.connectedDeviceModel = dev.friendlyName || dev.model || "Device";
          p.connectedDeviceRole = dev.role || "Edge Device";
          p.connectedLocation = dev.closetName || dev.rackId || switchLoc;
          p.linkStatus = "up";
          if (devPower === "poe_switch" && p.poeStandard) {
            p.poeOutputWatts = Math.min(devWatts, p.maxPoeWatts);
          } else {
            p.poeOutputWatts = 0;
          }
          assignedDevIds.add(dev.instanceId);
        } else {
          dev.assignedSwitchPort = null;
        }
      }
    });

    // Second pass: For unassigned devices, find the best matching free port (PoE capable if needed, speed match)
    edgeDevices.forEach(dev => {
      if (assignedDevIds.has(dev.instanceId)) return;

      const devPower = this.getDevicePowerSource(dev);
      const needsPoe = (devPower === "poe_switch");
      const devWatts = parseFloat(dev.powerConsumptionWatts || dev.maxPowerWatts || 15.0) * (parseInt(dev.qty, 10) || 1);

      // Candidate free access ports
      const freePorts = ports.filter(p => p.role === "access" && !p.isUplink && !p.connectedDeviceId && p.adminStatus === "up");
      
      let chosenPort = null;
      if (needsPoe) {
        chosenPort = freePorts.find(p => p.poeStandard !== null) || freePorts[0];
      } else {
        chosenPort = freePorts.find(p => p.poeStandard === null) || freePorts[0];
      }

      if (chosenPort) {
        dev.uplinkTargetId = switchItem.instanceId;
        dev.assignedSwitchPort = chosenPort.portNumber;
        chosenPort.connectedDeviceId = dev.instanceId;
        chosenPort.connectedDeviceModel = dev.friendlyName || dev.model || "Device";
        chosenPort.connectedDeviceRole = dev.role || "Edge Device";
        chosenPort.connectedLocation = dev.closetName || dev.rackId || switchLoc;
        chosenPort.linkStatus = "up";
        if (needsPoe && chosenPort.poeStandard) {
          chosenPort.poeOutputWatts = Math.min(devWatts, chosenPort.maxPoeWatts);
        } else {
          chosenPort.poeOutputWatts = 0;
        }
        assignedDevIds.add(dev.instanceId);
      }
    });

    // Clear stale non-uplink port connections for devices no longer homed here
    ports.filter(p => p.role === "access" && !p.isUplink && p.connectedDeviceId).forEach(p => {
      if (!assignedDevIds.has(p.connectedDeviceId)) {
        p.connectedDeviceId = null;
        p.connectedDeviceModel = null;
        p.connectedDeviceRole = null;
        p.connectedLocation = null;
        p.poeOutputWatts = 0;
        p.linkStatus = "down";
      }
    });

    this.recalculateSwitchPoE(switchItem);
  },

  /**
   * Auto-assigns a field device (Camera, Access Control, AP, etc.) to the best matching
   * switch and port in its terminating closet/rack based on PoE and speed capabilities.
   * @param {Object} deviceItem - Device line item in BOM
   * @param {String} [targetClosetName] - Optional override closet/rack location
   * @returns {Object|null} { switchItem, port } or null
   */
  autoAssignDeviceToClosetSwitch(deviceItem, targetClosetName = null) {
    if (!deviceItem || typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) return null;
    if (deviceItem.isEnclosureFrame || deviceItem.isPassive) return null;
    if (typeof DeviceTaxonomy !== "undefined") {
      if ((typeof DeviceTaxonomy.isPassiveOrHostInfrastructure === "function" && DeviceTaxonomy.isPassiveOrHostInfrastructure(deviceItem)) ||
          (typeof DeviceTaxonomy.isPowerDistributionOrBackup === "function" && DeviceTaxonomy.isPowerDistributionOrBackup(deviceItem))) {
        return null;
      }
    }
    delete deviceItem.unassignedByUser;

    let targetLoc = targetClosetName || deviceItem.closetName || deviceItem.rackId || "MDF • Rack-1";
    if (typeof FacilityStore !== "undefined") {
      targetLoc = FacilityStore.normalize(targetLoc);
    }

    let searchSpace = (typeof FacilityStore !== "undefined") ? FacilityStore.parse(targetLoc).space.toLowerCase() : "";
    if (searchSpace === "field" || searchSpace === "unassigned" || !searchSpace) {
      const dropMap = this._buildDropClosetIndex();
      const clInfo = dropMap.get(deviceItem.instanceId);
      if (clInfo) {
        targetLoc = clInfo.normLoc;
        searchSpace = clInfo.spaceLower;
      }
    }

    const allSwitches = projectBOM.filter(i => {
      if (!i || i.parentInstanceId || i.instanceId === deviceItem.instanceId) return false;
      const role = String(i.role || "").toLowerCase();
      const cat = String(i.category || "").toLowerCase();
      return role === "access" || role === "core" || role === "aggregation" || role === "core & agg" || 
             role.includes("switch") || cat === "switch" || cat === "switches" || cat.includes("switch");
    });

    if (allSwitches.length === 0) return null;

    let candidateSwitches = allSwitches.filter(s => {
      const sLoc = (typeof FacilityStore !== "undefined") ? FacilityStore.normalize(s.closetName || s.rackId) : (s.closetName || s.rackId);
      if (sLoc === targetLoc) return true;
      if (searchSpace && searchSpace !== "field" && searchSpace !== "unassigned") {
        const sSpace = (typeof FacilityStore !== "undefined") ? FacilityStore.parse(sLoc).space.toLowerCase() : "";
        if (sSpace === searchSpace) return true;
      }
      return false;
    });

    if (candidateSwitches.length === 0) {
      candidateSwitches = allSwitches.filter(s => (s.role || "").toLowerCase() === "access");
      if (candidateSwitches.length === 0) candidateSwitches = allSwitches;
    }

    candidateSwitches.sort((a, b) => {
      const aIsAccess = (a.role || "").toLowerCase() === "access" ? 0 : 1;
      const bIsAccess = (b.role || "").toLowerCase() === "access" ? 0 : 1;
      if (aIsAccess !== bIsAccess) return aIsAccess - bIsAccess;
      return (a.portsTotal || a.ports || 24) - (b.portsTotal || b.ports || 24);
    });

    const devPower = this.getDevicePowerSource(deviceItem);
    const needsPoe = (devPower === "poe_switch");

    for (const sw of candidateSwitches) {
      const ports = this.initSwitchPorts(sw);
      // Check if sw already has deviceItem connected to a port (e.g. from syncSwitchEdgePorts or previous call)
      const existingPort = ports.find(p => p.connectedDeviceId === deviceItem.instanceId);
      if (existingPort) {
        deviceItem.uplinkTargetId = sw.instanceId;
        deviceItem.assignedSwitchPort = existingPort.portNumber;
        return { switchItem: sw, port: existingPort };
      }

      const freePorts = ports.filter(p => p.role === "access" && !p.isUplink && !p.connectedDeviceId && p.adminStatus === "up");
      if (freePorts.length === 0) continue;

      let port = null;
      if (needsPoe) {
        port = freePorts.find(p => p.poeStandard !== null);
      } else {
        port = freePorts.find(p => p.poeStandard === null) || freePorts[0];
      }

      if (port) {
        if (deviceItem.uplinkTargetId && deviceItem.uplinkTargetId !== sw.instanceId) {
          const oldSw = allSwitches.find(i => i.instanceId === deviceItem.uplinkTargetId);
          if (oldSw) this.disconnectPort(oldSw, deviceItem.assignedSwitchPort);
        }

        this.connect(sw, port.portNumber, deviceItem, 1);
        return { switchItem: sw, port: port };
      }
    }

    return null;
  },

  /**
   * Synchronizes all switches in the project for both uplinks and edge client devices
   */
  syncAllSwitchPorts() {
    if (typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) return;
    const bomById = new Map(projectBOM.filter(Boolean).map(i => [i.instanceId, i]));
    const dropClosetMap = this._buildDropClosetIndex();
    const switches = projectBOM.filter(i => i && !i.parentInstanceId && (
      (i.role || "").toLowerCase().includes("switch") || (i.category || "").toLowerCase().includes("switch") ||
      i.role === "Access" || i.role === "Core" || i.role === "Aggregation" || i.role === "Core & Agg" || i.role === "Security WAN"
    ));
    switches.forEach(sw => {
      this.initSwitchPorts(sw);
      this.syncSwitchUplinks(sw, bomById);
      this.syncSwitchEdgePorts(sw, dropClosetMap);
    });
  },

  autoSyncAllSwitchPorts() {
    this.syncAllSwitchPorts();
  },

  /**
   * Initializes or normalizes network interfaces on a client device (camera, radio, server, access controller)
   * @param {Object} item - BOM line item representing a field device or server
   * @returns {Array} Array of standardized interface objects
   */
  initDeviceInterfaces(item) {
    if (!item) return [];
    if (Array.isArray(item.interfaces) && item.interfaces.length > 0 && typeof item.interfaces[0] === "object") {
      return item.interfaces;
    }

    const interfaces = [];
    const isServer = item.role === "Server" || item.role === "VMS Server" || item.role === "Compute & Storage";
    const isRadio = item.category === "wireless" || item.category === "ptp_60g" || item.topology === "PtP / PtMP" || item.role === "Wireless";
    const isCamera = item.role === "Camera" || (item.category && item.category.includes("camera"));
    const isAccess = item.role === "Access Control" || (item.category && item.category.includes("access"));

    if (isServer) {
      const portCount = parseInt(item.ports, 10) || 2;
      const speed = item.portSpeed || "10G";
      for (let i = 1; i <= portCount; i++) {
        interfaces.push({
          portNumber: i,
          label: `NIC ${i} (${speed})`,
          mediaType: speed.includes("10G") ? "sfp_plus_10g" : (speed.includes("25G") ? "sfp28_25g" : "rj45_1g"),
          speed,
          powerSource: "dedicated_ac",
          connectedSwitchId: null,
          connectedPortNumber: null,
          isUplinkForSwitch: false
        });
      }
      // Out of band management
      interfaces.push({
        portNumber: portCount + 1,
        label: "MGMT / iDRAC (1G)",
        mediaType: "rj45_1g",
        speed: "1G",
        powerSource: "dedicated_ac",
        connectedSwitchId: null,
        connectedPortNumber: null,
        isUplinkForSwitch: false
      });
    } else if (isRadio) {
      // Primary Wireless Interface & PoE In
      interfaces.push({
        portNumber: 1,
        label: "ETH0 (Data & PoE In)",
        mediaType: "rj45_1g",
        speed: item.throughputGbps && item.throughputGbps > 1 ? "2.5G" : "1G",
        powerSource: item.powerSourceOverride || item.powerSource || "poe_switch",
        connectedSwitchId: item.uplinkTargetId || null,
        connectedPortNumber: item.assignedSwitchPort || 1,
        isUplinkForSwitch: item.isUplinkForSwitch !== undefined ? item.isUplinkForSwitch : (item.topologyRole === "ptp_station" || item.isStationUplink === true)
      });
      // Secondary / SFP port if supported
      if (item.interfaces && typeof item.interfaces === "string" && item.interfaces.includes("SFP")) {
        interfaces.push({
          portNumber: 2,
          label: "SFP+ Optical Port",
          mediaType: "sfp_plus_10g",
          speed: "10G",
          powerSource: "unpowered",
          connectedSwitchId: null,
          connectedPortNumber: null,
          isUplinkForSwitch: false
        });
      }
    } else {
      // Cameras, Access Controllers, APs
      const defaultPowerSource = item.powerSourceOverride || (item.poeStandard ? "poe_switch" : (item.directDc ? "dedicated_dc" : "poe_switch"));
      interfaces.push({
        portNumber: 1,
        label: "ETH0 (PoE In / Network)",
        mediaType: "rj45_1g",
        speed: "1G",
        powerSource: defaultPowerSource,
        connectedSwitchId: item.uplinkTargetId || null,
        connectedPortNumber: item.assignedSwitchPort || null,
        isUplinkForSwitch: false
      });
    }

    item.interfaces = interfaces;
    return interfaces;
  },

  /**
   * Allocates the next optimal free port on a switch for a given device
   * @param {Object} switchItem - Host switch BOM item
   * @param {Object} deviceItem - Client device BOM item
   * @param {Object} options - Allocation options { isUplink, preferSfp }
   * @returns {Object|null} Allocated port object or null if exhausted
   */
  allocatePort(switchItem, deviceItem, options = {}) {
    if (!switchItem || !deviceItem) return null;
    const ports = this.initSwitchPorts(switchItem);
    const devPowerSource = this.getDevicePowerSource(deviceItem);
    const needsPoe = (devPowerSource === "poe_switch");
    const isUplink = options.isUplink || deviceItem.isUplinkForSwitch || false;

    // Filter candidate ports
    let candidates = ports.filter(p => p.adminStatus === "up" && !p.connectedDeviceId);

    if (isUplink) {
      // For uplink connections, prefer dedicated uplink cages first, then highest speed port
      const uplinkCandidates = candidates.filter(p => p.role === "uplink" || p.isUplink);
      if (uplinkCandidates.length > 0) {
        candidates = uplinkCandidates;
      }
    } else {
      // For normal edge access devices, prefer access ports
      const accessCandidates = candidates.filter(p => p.role === "access" && !p.isUplink);
      if (accessCandidates.length > 0) {
        candidates = accessCandidates;
      }
    }

    // If PoE is needed, filter for ports with PoE capability and prioritize ports meeting device wattage demand
    if (needsPoe) {
      const poeCandidates = candidates.filter(p => p.poeStandard !== null);
      if (poeCandidates.length > 0) {
        const devWatts = parseFloat(deviceItem.powerConsumptionWatts || deviceItem.poeWattsDrawn || deviceItem.maxPowerWatts || 15.0);
        const sufficientPoeCandidates = poeCandidates.filter(p => (p.maxPoeWatts || 30) >= devWatts);
        candidates = sufficientPoeCandidates.length > 0 ? sufficientPoeCandidates : poeCandidates;
      }
    }

    if (candidates.length === 0) {
      return null; // All ports exhausted
    }

    const allocatedPort = candidates[0];
    this.connect(switchItem, allocatedPort.portNumber, deviceItem, 1, options);
    return allocatedPort;
  },

  /**
   * Connects a switch port to a device interface with full power & role tracking
   */
  connect(switchItem, switchPortNumber, deviceItem, devicePortNumber = 1, options = {}) {
    if (!switchItem || !deviceItem) return false;

    const switchPorts = this.initSwitchPorts(switchItem);
    const devInterfaces = this.initDeviceInterfaces(deviceItem);

    const sPort = switchPorts.find(p => p.portNumber === parseInt(switchPortNumber, 10));
    const dIntf = devInterfaces.find(i => i.portNumber === parseInt(devicePortNumber, 10)) || devInterfaces[0];

    if (!sPort) return false;

    // Disconnect any existing device on this switch port
    if (sPort.connectedDeviceId && sPort.connectedDeviceId !== deviceItem.instanceId) {
      this.disconnectPort(switchItem, sPort.portNumber);
    }

    // If device was previously connected to any other port on THIS switch, clear it first
    switchPorts.forEach(p => {
      if (p.connectedDeviceId === deviceItem.instanceId && p.portNumber !== sPort.portNumber) {
        p.connectedDeviceId = null;
        p.connectedDeviceModel = null;
        p.connectedDeviceRole = null;
        p.connectedLocation = null;
        p.poeOutputWatts = 0;
        p.linkStatus = "down";
      }
    });

    // Determine power delivery
    const devPowerSource = options.powerSource || this.getDevicePowerSource(deviceItem);
    const devWatts = parseFloat(deviceItem.powerConsumptionWatts || deviceItem.maxPowerWatts || 15.0) * (parseInt(deviceItem.qty, 10) || 1);

    sPort.connectedDeviceId = deviceItem.instanceId;
    sPort.connectedDeviceModel = deviceItem.model || "Device";
    sPort.connectedPortNumber = dIntf ? dIntf.portNumber : 1;
    sPort.linkStatus = "up";

    // Set uplink or access role
    const isUplink = options.isUplink !== undefined ? options.isUplink : (options.isUplinkForSwitch || deviceItem.isUplinkForSwitch || sPort.isUplink);
    sPort.isUplink = isUplink;
    if (isUplink) {
      sPort.role = "uplink";
      switchItem.customUplinkTargetId = deviceItem.instanceId;
    }

    // Configure PoE delivery
    if (devPowerSource === "poe_switch" && sPort.poeStandard) {
      sPort.poeOutputWatts = Math.min(devWatts, sPort.maxPoeWatts);
    } else {
      sPort.poeOutputWatts = 0; // External power: Injector, DC, or AC
    }

    // Synchronize client device interface
    if (dIntf) {
      dIntf.connectedSwitchId = switchItem.instanceId;
      dIntf.connectedPortNumber = sPort.portNumber;
      dIntf.powerSource = devPowerSource;
      dIntf.isUplinkForSwitch = isUplink;
    }

    deviceItem.uplinkTargetId = switchItem.instanceId;
    deviceItem.assignedSwitchPort = sPort.portNumber;
    deviceItem.powerSourceOverride = devPowerSource;
    delete deviceItem.unassignedByUser;

    this.recalculateSwitchPoE(switchItem);
    return true;
  },

  /**
   * Disconnects a switch port
   */
  disconnectPort(switchItem, portNumber) {
    if (!switchItem) return;
    const ports = this.initSwitchPorts(switchItem);
    const port = ports.find(p => p.portNumber === parseInt(portNumber, 10));
    if (!port) return;

    const oldDeviceId = port.connectedDeviceId;
    port.connectedDeviceId = null;
    port.connectedDeviceModel = null;
    port.connectedPortNumber = null;
    port.poeOutputWatts = 0;
    port.linkStatus = "down";
    if (port.role !== "uplink") {
      port.isUplink = false;
    }

    if (oldDeviceId && typeof projectBOM !== "undefined") {
      const dev = projectBOM.find(i => i.instanceId === oldDeviceId);
      if (dev) {
        dev.assignedSwitchPort = null;
        if (dev.uplinkTargetId === switchItem.instanceId) {
          dev.uplinkTargetId = null;
          dev.unassignedByUser = true;
        }
      }
    }

    this.recalculateSwitchPoE(switchItem);
  },

  /**
   * Overrides power delivery mode for a field device (Camera, Switch, Radio, Access Controller)
   * @param {Object} deviceItem - Device line item in BOM
   * @param {String} newPowerSource - 'poe_switch' | 'poe_injector' | 'dedicated_dc' | 'dedicated_ac' | 'solar_battery'
   * @param {Object} [hostSwitchItem] - Optional host switch reference
   */
  setPowerSource(deviceItem, newPowerSource, hostSwitchItem = null) {
    if (!deviceItem || !this.POWER_MODES[newPowerSource]) return false;

    deviceItem.powerSourceOverride = newPowerSource;
    const interfaces = this.initDeviceInterfaces(deviceItem);
    if (interfaces.length > 0) {
      interfaces[0].powerSource = newPowerSource;
    }

    // Find host switch if not provided
    let sw = hostSwitchItem;
    if (!sw && deviceItem.uplinkTargetId && typeof projectBOM !== "undefined") {
      sw = projectBOM.find(i => i.instanceId === deviceItem.uplinkTargetId);
    }

    if (sw) {
      const ports = this.initSwitchPorts(sw);
      const port = ports.find(p => p.connectedDeviceId === deviceItem.instanceId || p.portNumber === deviceItem.assignedSwitchPort);
      if (port) {
        if (newPowerSource === "poe_switch" && port.poeStandard) {
          const watts = parseFloat(deviceItem.powerConsumptionWatts || deviceItem.maxPowerWatts || 15.0) * (parseInt(deviceItem.qty, 10) || 1);
          port.poeOutputWatts = Math.min(watts, port.maxPoeWatts);
        } else {
          // PoE injector, DC, AC, or solar draws 0W from switch
          port.poeOutputWatts = 0;
        }
      }
      this.recalculateSwitchPoE(sw);
    }

    if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
      FacilityStore.notifyWorkspaceChange();
    }
    return true;
  },

  /**
   * Configures an explicit uplink route between two nodes (e.g. Switch on pole -> P2P Radio Station, or Switch A -> Switch B)
   * @param {Object} sourceNode - The node sending upstream traffic (e.g. Industrial Switch or Access Switch)
   * @param {Object} targetNode - The upstream gateway node (e.g. P2P Radio, Core Switch, or Peer Switch)
   * @param {Object} options - { linkSpeed, isLAG, multiplier, isRadioBridge }
   */
  configureUplink(sourceNode, targetNode, options = {}) {
    if (!sourceNode || !targetNode || sourceNode.instanceId === targetNode.instanceId) return false;

    sourceNode.customUplinkTargetId = targetNode.instanceId;
    if (options.linkSpeed) sourceNode.customLinkSpeed = options.linkSpeed;
    if (options.multiplier) sourceNode.customLinkMultiplier = options.multiplier;

    // Check if target is a P2P Radio Station (reverse uplink pattern)
    const isTargetRadio = targetNode.category === "wireless" || targetNode.category === "ptp_60g" || targetNode.topology === "PtP / PtMP";
    if (isTargetRadio) {
      targetNode.isUplinkForSwitch = true;
      targetNode.connectedHostSwitchId = sourceNode.instanceId;
      // Industrial switch powers the radio station
      this.connect(sourceNode, 1, targetNode, 1, {
        isUplink: true,
        powerSource: targetNode.powerSourceOverride || "poe_switch"
      });
    }

    if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
      FacilityStore.notifyWorkspaceChange();
    }
    return true;
  },

  /**
   * Recalculates total consumed PoE wattage across all active ports of a switch
   * @param {Object} switchItem - BOM line item
   */
  recalculateSwitchPoE(switchItem) {
    if (!switchItem) return;
    const ports = this.initSwitchPorts(switchItem);
    let totalPoEWatts = 0;

    ports.forEach(p => {
      totalPoEWatts += (p.poeOutputWatts || 0);
    });

    switchItem.consumedPoEWatts = Math.round(totalPoEWatts * 10) / 10;
  },

  /**
   * Returns current active power delivery mode of a device
   */
  getDevicePowerSource(deviceItem) {
    if (!deviceItem) return "internal_psu";
    const supported = this.getSupportedPowerModes(deviceItem);
    if (supported.length === 1 && (supported[0] === "passive" || supported[0] === "dedicated_ac")) {
      return supported[0];
    }

    let candidate = deviceItem.powerSourceOverride || deviceItem.powerSource;
    if (!candidate && deviceItem.interfaces && deviceItem.interfaces.length > 0 && deviceItem.interfaces[0].powerSource) {
      candidate = deviceItem.interfaces[0].powerSource;
    }
    if (candidate && supported.includes(candidate)) {
      return candidate;
    }

    const role = deviceItem.role;
    if (role === "Server" || role === "VMS Server" || role === "Compute & Storage") {
      const pref = deviceItem.dualPsu !== false ? "dual_ac" : "dedicated_ac";
      return supported.includes(pref) ? pref : (supported[0] || "internal_psu");
    }
    if (role === "Core" || role === "Core & Agg" || role === "Aggregation" || role === "Gateways & WAN" || role === "Security WAN" || role === "Firewall") {
      const pref = (deviceItem.dualPsu || deviceItem.psuSku) ? "dual_ac" : "internal_psu";
      return supported.includes(pref) ? pref : (supported[0] || "internal_psu");
    }
    if (role === "Access") {
      if (deviceItem.isPoEPowered || deviceItem.powerSource === "poe_switch" || deviceItem.powerSource === "poe_in") {
        return supported.includes("poe_switch") ? "poe_switch" : (supported[0] || "internal_psu");
      }
      if (deviceItem.directDc || (deviceItem.mounting && deviceItem.mounting.includes("DIN") && !deviceItem.mounting.includes("19\""))) {
        return supported.includes("dedicated_dc") ? "dedicated_dc" : (supported[0] || "internal_psu");
      }
      return supported.includes("internal_psu") ? "internal_psu" : (supported[0] || "internal_psu");
    }
    if (role === "Wireless Bridge" || deviceItem.category === "wireless") {
      if (deviceItem.directDc && supported.includes("dedicated_dc")) return "dedicated_dc";
      return supported.includes("poe_switch") ? "poe_switch" : (supported[0] || "poe_switch");
    }
    if (deviceItem.directDc && supported.includes("dedicated_dc")) return "dedicated_dc";
    return supported.includes("poe_switch") ? "poe_switch" : (supported[0] || "internal_psu");
  },

  /**
   * Returns human-readable power source badge info (or null for passive infrastructure)
   */
  getPowerBadge(deviceItem) {
    const mode = this.getDevicePowerSource(deviceItem);
    if (mode === "passive") return null;
    const def = this.POWER_MODES[mode] || this.POWER_MODES.internal_psu;
    return {
      mode,
      label: def.label,
      badgeLabel: def.badgeLabel,
      icon: def.icon,
      isExternal: !def.drawsFromSwitch
    };
  },

  /**
   * Returns valid power delivery modes supported by this specific hardware model
   * Prevents impossible configurations (e.g. PoE-in on Equipment Racks, Enclosures, UPSs, or Core switches)
   */
  getSupportedPowerModes(item) {
    if (!item) return ["internal_psu"];
    const role = (item.role || "").trim();
    const cat = (item.category || "").toLowerCase().trim();
    const model = (item.model || "").toLowerCase();

    // 0a. Passive Infrastructure (Equipment Racks, Enclosures, Patch Panels, Cables, Mounts, Licenses)
    if (item.isEnclosureFrame || item.isPassive ||
        (typeof DeviceTaxonomy !== "undefined" && typeof DeviceTaxonomy.isPassiveOrHostInfrastructure === "function" && DeviceTaxonomy.isPassiveOrHostInfrastructure(item))) {
      return ["passive"];
    }
    const passiveRoles = [
      "Equipment Rack", "19\" Equipment Racks", "Cabinets & Enclosures",
      "Security Cabinet", "Industrial NEMA Enclosure", "Architectural Backboard",
      "Enclosure", "Patch Panel", "Structured Cabling", "Optics & DAC",
      "Mgmt License", "Security License", "Feature License", "Stacking Cable",
      "Accessory", "Power Jumper Cable", "Pathways & J-Hooks", "Mounting Hardware"
    ];
    if (passiveRoles.includes(role) || cat === "racks" || cat === "enclosures" || cat === "power_cords" || cat === "pathways" || cat === "mounting_hardware" || cat === "passive") {
      return ["passive"];
    }

    // 0b. Electrical Backup & Power Distribution (Rack UPS, EBPs, Rackmount PDUs)
    if (role === "Rack UPS Power" || role === "UPS" || role === "Rackmount PDU" || role === "PDU" ||
        cat === "ups" || cat === "pdu" || cat === "rack_pdu" || cat === "power_distribution" ||
        (typeof DeviceTaxonomy !== "undefined" && typeof DeviceTaxonomy.isPowerDistributionOrBackup === "function" && DeviceTaxonomy.isPowerDistributionOrBackup(item))) {
      return ["dedicated_ac"];
    }

    const isDin = item.isDinMounted || (item.mounting && item.mounting.includes("DIN"));
    const isIndustrial = model.includes("industrial") || cat.includes("industrial") || isDin;
    const isHighPower = (item.baseWatts || 0) > 80 || (item.powerConsumptionWatts || 0) > 80;

    // 1. Core, Aggregation, Gateways, High-Power Enterprise Switches & Servers
    if (role === "Core" || role === "Core & Agg" || role === "Aggregation" || role === "Gateways & WAN" || role === "Security WAN" || role === "Firewall" || role === "Server" || role === "VMS Server" || role === "Compute & Storage") {
      const modes = ["internal_psu"];
      if (item.dualPsu !== false || item.psuSku || model.includes("enterprise") || model.includes("core") || model.includes("pro") || isHighPower) {
        modes.push("dual_ac");
      }
      return modes;
    }

    // 2. Standard Access Switches
    if (role === "Access") {
      const isPoePassthrough = item.isPoEPowered || item.powerSource === "poe_switch" || item.powerSource === "poe_in" || model.includes("flex");
      if (isPoePassthrough) {
        return ["poe_switch", "poe_injector", "dedicated_dc"];
      }
      if (isIndustrial) {
        return ["internal_psu", "dedicated_dc", "solar_battery"];
      }
      const modes = ["internal_psu"];
      if (item.dualPsu || (item.psuSlots && item.psuSlots > 1)) {
        modes.push("dual_ac");
      }
      return modes;
    }

    // 3. Wireless Bridges & PtP Radios
    if (role === "Wireless Bridge" || cat === "wireless" || cat === "ptp_60g") {
      const modes = ["poe_switch", "poe_injector"];
      if (item.directDc || isIndustrial || isDin) {
        modes.push("dedicated_dc");
      }
      modes.push("solar_battery");
      return modes;
    }

    // 4. IP Cameras, Access Control, Intercoms, Biometrics & LPR Endpoints
    if (role === "Camera" || role === "Access Control" || role === "Intercom" || role === "Door" || role === "Biometric" || role === "LPR" ||
        cat.includes("camera") || cat.includes("access") || cat.includes("intercom") || cat.includes("door")) {
      const modes = ["poe_switch", "poe_injector"];
      if (item.supportsAuxDc !== false && (item.auxPower || isIndustrial || model.includes("ptz") || model.includes("mercury") || model.includes("axis"))) {
        modes.push("dedicated_dc");
      }
      if (item.supportsAuxAc || model.includes("mercury") || model.includes("ac-")) {
        modes.push("dedicated_ac");
      }
      if (isIndustrial || (item.closetName && item.closetName.toLowerCase().includes("pole"))) {
        modes.push("solar_battery");
      }
      return modes;
    }

    if (item.isPoEPowered || item.poeClass || item.powerSource === "poe_switch") {
      return ["poe_switch", "poe_injector", "dedicated_dc"];
    }

    return ["internal_psu", "dedicated_dc"];
  },

  /**
   * Synchronizes BOM accessories when device power mode changes (e.g. adding PoE injector or DC PSU)
   */
  syncPowerAccessories(deviceItem, newPowerMode) {
    if (!deviceItem || typeof projectBOM === "undefined") return;

    // 1. Remove any previously auto-provisioned power accessories for this device
    const oldAccessories = projectBOM.filter(i => 
      i.parentInstanceId === deviceItem.instanceId && 
      (i.category === "power_injector" || i.category === "power_supply" || i.role === "Power Accessory")
    );
    oldAccessories.forEach(oldAcc => {
      const idx = projectBOM.findIndex(i => i.instanceId === oldAcc.instanceId);
      if (idx >= 0) projectBOM.splice(idx, 1);
    });

    // 2. If new mode is PoE Injector, auto-add matching midspan injector to quote BOM
    if (newPowerMode === "poe_injector") {
      const wattsNeeded = parseFloat(deviceItem.powerWatts || deviceItem.maxPowerWatts || deviceItem.powerConsumptionWatts || 15);
      const isBt = wattsNeeded > 30 || deviceItem.poeStandardRequired === "802.3bt-60" || deviceItem.poeStandardRequired === "802.3bt-90";
      
      const injectorSku = isBt ? "UACC-PoE-bt-60" : "UACC-PoE-at";
      const injectorModel = isBt ? "UniFi PoE++ Midspan Injector (60W)" : "UniFi PoE+ Midspan Injector (30W)";
      const injectorPrice = isBt ? 35 : 19;

      const injectorItem = {
        instanceId: `inj-${deviceItem.instanceId}`,
        parentInstanceId: deviceItem.instanceId,
        id: injectorSku,
        sku: injectorSku,
        model: injectorModel,
        name: injectorModel,
        role: "Power Accessory",
        category: "power_injector",
        vendor: "UniFi",
        msrp: injectorPrice,
        qty: deviceItem.qty || 1,
        closetName: deviceItem.closetName || "MDF",
        rackId: deviceItem.rackId || deviceItem.closetName || "MDF",
        baseWatts: 0,
        poeBudget: 0,
        description: `Dedicated ${isBt ? '60W PoE++ (802.3bt)' : '30W PoE+ (802.3at)'} injector powering ${deviceItem.model}`
      };

      projectBOM.push(injectorItem);
    }

    // 3. If new mode is Dedicated DC PSU, auto-add Mean Well DIN-rail supply if industrial
    if (newPowerMode === "dedicated_dc") {
      const dcSku = "NDR-120-48";
      const dcModel = "Mean Well 120W Industrial DIN-Rail Power Supply";
      const dcItem = {
        instanceId: `psu-${deviceItem.instanceId}`,
        parentInstanceId: deviceItem.instanceId,
        id: dcSku,
        sku: dcSku,
        model: dcModel,
        name: dcModel,
        role: "Power Accessory",
        category: "power_supply",
        vendor: "Mean Well",
        msrp: 45,
        qty: 1,
        closetName: deviceItem.closetName || "MDF",
        rackId: deviceItem.rackId || deviceItem.closetName || "MDF",
        baseWatts: 0,
        poeBudget: 0,
        description: `120W 48VDC industrial power supply powering ${deviceItem.model}`
      };

      projectBOM.push(dcItem);
    }
  },

  /**
   * Sets power delivery mode on device, updates host switch PoE load, and synchronizes BOM accessories
   */
  setPowerSource(deviceItem, newPowerMode, hostSwitchItem = null) {
    if (!deviceItem || !newPowerMode) return false;
    const supported = this.getSupportedPowerModes(deviceItem);
    if (!supported.includes(newPowerMode)) {
      newPowerMode = supported[0] || "internal_psu";
    }
    deviceItem.powerSourceOverride = newPowerMode;
    deviceItem.powerSource = newPowerMode;

    const interfaces = this.initDeviceInterfaces(deviceItem);
    if (interfaces.length > 0) {
      interfaces[0].powerSource = newPowerMode;
    }

    let sw = hostSwitchItem;
    if (!sw && deviceItem.uplinkTargetId && typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) {
      sw = projectBOM.find(i => i && i.instanceId === deviceItem.uplinkTargetId);
    }
    if (sw) {
      const ports = this.initSwitchPorts(sw);
      const port = ports.find(p => p.connectedDeviceId === deviceItem.instanceId || p.portNumber === deviceItem.assignedSwitchPort);
      if (port) {
        if (newPowerMode === "poe_switch" && port.poeStandard) {
          const watts = parseFloat(deviceItem.powerConsumptionWatts || deviceItem.maxPowerWatts || 15.0) * (parseInt(deviceItem.qty, 10) || 1);
          port.poeOutputWatts = Math.min(watts, port.maxPoeWatts);
        } else {
          port.poeOutputWatts = 0;
        }
      }
      this.recalculateSwitchPoE(sw);
    }

    this.syncPowerAccessories(deviceItem, newPowerMode);
    if (typeof updateBOMView === "function") {
      updateBOMView();
    }
    if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
      FacilityStore.notifyWorkspaceChange();
    }
    return true;
  },

  /**
   * Provides comprehensive port utilization telemetry for a switch
   */
  getPortSummary(switchItem) {
    if (!switchItem) return { total: 0, used: 0, free: 0, poeLoad: 0, poeBudget: 0 };
    const ports = this.initSwitchPorts(switchItem);

    const isStacked = (switchItem.stackedUnits && switchItem.stackedUnits >= 2) || 
      (switchItem.stackedUnits !== 0 && switchItem.qty >= 2 && (switchItem.canStack || switchItem.role === "Access" || switchItem.role === "Aggregation"));
    const stackUnits = isStacked ? (switchItem.stackedUnits || switchItem.qty) : 1;

    const total = ports.length;
    const used = ports.filter(p => p.connectedDeviceId).length;
    const free = total - used;
    const poeCapable = ports.filter(p => p.poeStandard !== null).length;
    const poeActive = ports.filter(p => (p.poeOutputWatts || 0) > 0).length;
    const poeLoad = switchItem.consumedPoEWatts || 0;
    const poeBudget = (parseFloat(switchItem.poeBudget) || 0) * stackUnits;

    return {
      total,
      used,
      free,
      poeCapable,
      poeActive,
      poeLoad,
      poeBudget,
      isStacked,
      stackUnits,
      percentUsed: Math.round((used / (total || 1)) * 100),
      percentPoe: Math.round((poeLoad / (poeBudget || 1)) * 100)
    };
  },

  /**
   * Resolves the end-to-end Patch Panel & Keystone Jack mapping for every physical port on a switch.
   * Supports:
   *  1. Standard Pod switches (1U 24P patch panels directly above & below each switch chassis unit with 6" Cat6A slim patch cords)
   *  2. In-stack interleaved patch panels (patchPanelBetween)
   *  3. Standalone rack-mounted patch panels (PP-1U-24P-MOD, PP-2U-48P-MOD) in the same closet/rack
   *  4. Custom per-port overrides (port.customPatchPanelId, port.customPatchJack)
   *
   * @param {Object} switchItem - Switch BOM line item
   * @returns {Object} { byPortNumber: { [portNum]: PatchMapping }, panels: Array<PanelSummary> }
   */
  resolveSwitchPatchMapping(switchItem) {
    if (!switchItem) return { byPortNumber: {}, panels: [] };
    const ports = this.initSwitchPorts(switchItem);
    const isStacked = (switchItem.stackedUnits && switchItem.stackedUnits >= 2) ||
      (switchItem.stackedUnits !== 0 && switchItem.qty >= 2 && (switchItem.canStack || switchItem.role === "Access" || switchItem.role === "Aggregation"));
    const stackUnits = isStacked ? (switchItem.stackedUnits || switchItem.qty) : 1;
    const baseRU = (switchItem.rackUnits !== undefined && switchItem.rackUnits !== null) ? (parseInt(switchItem.rackUnits, 10) || 1) : 1;
    const baseSlotU = parseInt(switchItem.rackSlot, 10) || 0;
    const isStdPod = !!switchItem.standardPod;

    // Normalize closet location and extract Orion Closet Code (e.g. "MDF", "IDF1", "IDFC")
    const switchLoc = (typeof FacilityStore !== "undefined")
      ? FacilityStore.normalize(switchItem.closetName || switchItem.rackId)
      : (switchItem.closetName || switchItem.rackId || "MDF");
    const closetCode = String(switchLoc || "MDF").split("•")[0].replace(/[^a-zA-Z0-9]/g, "").toUpperCase() || "MDF";

    // Determine Switch Code (e.g. SW01, SW02) from DeviceTaxonomy or BOM order
    let switchCode = (switchItem.deviceNumber && String(switchItem.deviceNumber).startsWith("SW"))
      ? String(switchItem.deviceNumber).split("-")[0]
      : "SW01";
    if (!switchItem.deviceNumber && typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) {
      const allSwitches = projectBOM.filter(i => i && !i.parentInstanceId && ((typeof DeviceTaxonomy !== "undefined" && DeviceTaxonomy.isSwitch && DeviceTaxonomy.isSwitch(i)) || i.category === "switch" || (i.role || "").includes("Switch") || i.role === "Access" || i.role === "Core"));
      const swIdx = allSwitches.findIndex(i => i.instanceId === switchItem.instanceId);
      if (swIdx >= 0) switchCode = `SW${String(swIdx + 1).padStart(2, "0")}`;
    }

    // Calculate closet-wide sequential starting Patch Panel number (so every patch panel in a closet has a unique PP01, PP02, PP03... ID)
    let basePanelSeq = 1;
    if (typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) {
      const closetSwitches = projectBOM.filter(it => {
        if (!it || it.parentInstanceId) return false;
        const loc = (typeof FacilityStore !== "undefined") ? FacilityStore.normalize(it.closetName || it.rackId) : (it.closetName || it.rackId || "MDF");
        if (loc !== switchLoc) return false;
        return (typeof DeviceTaxonomy !== "undefined" && DeviceTaxonomy.isSwitch && DeviceTaxonomy.isSwitch(it)) ||
          it.category === "switch" || (it.role || "").includes("Switch") || it.role === "Access" || it.role === "Core" || it.role === "Aggregation";
      }).sort((a, b) => {
        const slotA = parseInt(a.rackSlot, 10) || 0;
        const slotB = parseInt(b.rackSlot, 10) || 0;
        if (slotA !== slotB) return slotB - slotA; // Top-down in rack (U42 -> U1)
        return projectBOM.indexOf(a) - projectBOM.indexOf(b);
      });

      for (const cSw of closetSwitches) {
        if (cSw.instanceId === switchItem.instanceId) break;
        const cStacked = (cSw.stackedUnits && cSw.stackedUnits >= 2) ||
          (cSw.stackedUnits !== 0 && cSw.qty >= 2 && (cSw.canStack || cSw.role === "Access" || cSw.role === "Aggregation"));
        const cUnits = cStacked ? (cSw.stackedUnits || cSw.qty) : 1;
        const isDual24 = cSw.patchPanelSku === "DUAL-24P";
        const panelsPerUnit = cSw.standardPod ? (isDual24 ? 2 : 1) : ((cUnits >= 2 && cSw.patchPanelBetween) ? Math.max(1, cUnits - 1) / cUnits : 1);
        basePanelSeq += Math.max(1, Math.round(cUnits * panelsPerUnit));
      }
    }

    // Build OSS Standard Cable Label Legend map ([Building]-[Floor]-[Closet]-[Cable#]) for devices in this closet
    const ossCableLegendByDeviceId = {};
    if (typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) {
      const totalFloorCount = (typeof facilityFloors !== "undefined" && Array.isArray(facilityFloors)) ? facilityFloors.length : 1;
      const buildingSet = new Set();
      const floorNodeByInstanceId = {};
      if (typeof facilityFloors !== "undefined" && Array.isArray(facilityFloors)) {
        facilityFloors.forEach(fl => {
          const bMatch = (fl.name || "").match(/b(?:uildin)?g\s*([a-zA-Z0-9]+)/i);
          if (bMatch) buildingSet.add(bMatch[1].toUpperCase());
          (fl.nodes || []).filter(n => n.type === "device" && n.instanceId).forEach(n => {
            floorNodeByInstanceId[n.instanceId] = { node: n, floorName: fl.name || "Level 1" };
          });
        });
      }
      const isMultiBuilding = buildingSet.size > 1;
      const isMultiFloor = totalFloorCount > 1;

      const getSubPriority = (item) => {
        if (typeof DeviceTaxonomy !== "undefined") {
          if (DeviceTaxonomy.isAccessControl && DeviceTaxonomy.isAccessControl(item)) return 1;
          if (DeviceTaxonomy.isCamera && DeviceTaxonomy.isCamera(item)) return 2;
          if (DeviceTaxonomy.isIntercom && DeviceTaxonomy.isIntercom(item)) return 4;
          if (DeviceTaxonomy.isWireless && DeviceTaxonomy.isWireless(item)) return 5;
        }
        const r = (item.role || "").toLowerCase();
        if (r.includes("access") || r.includes("door") || r.includes("reader")) return 1;
        if (r.includes("camera") || r.includes("lpr")) return 2;
        if (r.includes("intrusion")) return 3;
        if (r.includes("intercom")) return 4;
        return 5;
      };

      const closetFieldDevices = projectBOM.filter(it => {
        if (!it || it.parentInstanceId) return false;
        const loc = (typeof FacilityStore !== "undefined") ? FacilityStore.normalize(it.closetName || it.rackId) : (it.closetName || it.rackId || "MDF");
        const normLoc = (loc === (FacilityStore && FacilityStore.UNASSIGNED) || String(loc).endsWith("• Field")) ? "MDF • Rack-1" : loc;
        if (normLoc !== switchLoc && loc !== switchLoc) return false;
        return typeof DeviceTaxonomy !== "undefined" && DeviceTaxonomy.isFieldDevice
          ? DeviceTaxonomy.isFieldDevice(it)
          : ["camera", "reader", "intercom", "wireless", "sensor", "door", "access"].some(k => (it.role || "").toLowerCase().includes(k) || (it.category || "").toLowerCase().includes(k));
      }).sort((a, b) => {
        const pDiff = getSubPriority(a) - getSubPriority(b);
        if (pDiff !== 0) return pDiff;
        return String(a.deviceNumber || "").localeCompare(String(b.deviceNumber || ""), undefined, { numeric: true });
      });

      closetFieldDevices.forEach((devItem, idx) => {
        const cableNumber = idx + 1;
        const flInfo = floorNodeByInstanceId[devItem.instanceId];
        const flName = flInfo ? flInfo.floorName : (devItem.floorName || "");
        let bldgToken = "";
        let floorToken = "";
        const bMatch = flName.match(/b(?:uildin)?g\s*([a-zA-Z0-9]+)/i);
        if (bMatch) bldgToken = bMatch[1].toUpperCase();
        else if (isMultiBuilding) bldgToken = "1";

        const fMatch = flName.match(/(?:level|floor|fl|lvl)\s*([a-zA-Z0-9]+)/i) || flName.match(/^([0-9]+)/);
        if (fMatch) floorToken = fMatch[1].toUpperCase();
        else if (isMultiFloor) floorToken = "1";

        let cId = "";
        if (bldgToken && floorToken) cId = `${bldgToken}-${floorToken}-${closetCode}-${cableNumber}`;
        else if (floorToken && isMultiFloor) cId = `${floorToken}-${closetCode}-${cableNumber}`;
        else if (bldgToken) cId = `${bldgToken}-${closetCode}-${cableNumber}`;
        else cId = `${closetCode}-${cableNumber}`;

        ossCableLegendByDeviceId[devItem.instanceId] = {
          cableId: cId,
          cableNumber,
          roomName: (flInfo && flInfo.node && flInfo.node.spaceName) ? flInfo.node.spaceName : (devItem.location || flName || closetCode)
        };
      });
    }

    const standalonePanels = (typeof projectBOM !== "undefined" && Array.isArray(projectBOM))
      ? projectBOM.filter(it => {
          if (!it || it.parentInstanceId) return false;
          const loc = (typeof FacilityStore !== "undefined") ? FacilityStore.normalize(it.closetName || it.rackId) : (it.closetName || it.rackId);
          if (loc !== switchLoc) return false;
          const sku = String(it.sku || it.id || "").toUpperCase();
          const mod = String(it.model || "").toLowerCase();
          return sku.startsWith("PP-") || mod.includes("patch panel") || mod.includes("keystone");
        }).sort((a, b) => (parseInt(b.rackSlot, 10) || 0) - (parseInt(a.rackSlot, 10) || 0))
      : [];

    const byPortNumber = {};
    const panelsMap = new Map();

    const isDual24Pod = switchItem.patchPanelSku === "DUAL-24P";
    const hasPPBetween = (stackUnits >= 2 && !!switchItem.patchPanelBetween && !isStdPod);
    const ppRackUnits = switchItem.patchPanelSku === "PP-2U-48P-MOD" ? 2 : 1;

    // Group access copper ports by unitIndex
    for (let u = 1; u <= stackUnits; u++) {
      const unitPorts = ports.filter(p => (p.unitIndex || 1) === u);
      const copperPorts = unitPorts.filter(p => !p.isUplink && p.role !== "uplink" && p.role !== "stack_interconnect" && String(p.connector || "RJ-45").includes("RJ"));
      const is48P = copperPorts.length > 24;
      const halfSplit = is48P ? 24 : 12;
      const singlePanelJacks = (switchItem.patchPanelSku === "PP-1U-24P-MOD") ? 24 : ((is48P || switchItem.patchPanelSku === "PP-1U-48P-MOD" || switchItem.patchPanelSku === "PP-2U-48P-MOD") ? 48 : 24);
      const singlePanelSku = switchItem.patchPanelSku === "PP-2U-48P-MOD" ? "PP-2U-48P-MOD" : (singlePanelJacks === 48 ? "PP-1U-48P-MOD" : "PP-1U-24P-MOD");

      // Compute RU positions if mounted in rack with Standard Pod or Interleaved Patch Panels
      let unitBaseU = 0, lowerPPU = 0, switchU = 0, upperPPU = 0;
      if (baseSlotU > 0) {
        if (isStdPod && isDual24Pod) {
          unitBaseU = baseSlotU + (u - 1) * (baseRU + 2);
          lowerPPU = unitBaseU;
          switchU = unitBaseU + 1;
          upperPPU = unitBaseU + baseRU + 1;
        } else if (isStdPod) {
          unitBaseU = baseSlotU + (u - 1) * (baseRU + ppRackUnits);
          switchU = unitBaseU;
          upperPPU = unitBaseU + baseRU;
        } else if (hasPPBetween) {
          const stepU = baseRU + ppRackUnits;
          switchU = baseSlotU + (u - 1) * stepU;
          upperPPU = u < stackUnits ? (switchU + baseRU) : (switchU - ppRackUnits);
        } else {
          const stepU = (stackUnits >= 2 && switchItem.cableManagerBetween) ? (baseRU + 1) : baseRU;
          switchU = baseSlotU + (u - 1) * stepU;
        }
      }

      // Globally unique Orion Patch Panel IDs per Closet & Switch Unit (e.g. MDF-PP01, MDF-PP02)
      const upperPanelSeqNum = isDual24Pod ? (basePanelSeq + (u - 1) * 2) : (hasPPBetween ? (basePanelSeq + Math.min(u - 1, stackUnits - 2)) : (basePanelSeq + (u - 1)));
      const lowerPanelSeqNum = basePanelSeq + (u - 1) * 2 + 1;
      const upperShortCode = `PP${String(upperPanelSeqNum).padStart(2, "0")}`;
      const lowerShortCode = `PP${String(lowerPanelSeqNum).padStart(2, "0")}`;
      const upperPanelId = `${closetCode}-${upperShortCode}`;
      const lowerPanelId = `${closetCode}-${lowerShortCode}`;

      if (isStdPod && isDual24Pod) {
        panelsMap.set(upperPanelId, {
          panelId: upperPanelId,
          shortCode: upperShortCode,
          panelSeqNum: upperPanelSeqNum,
          deckKey: `U${u}-TOP`,
          label: `${upperPanelId} • Upper 24P Keystone (${switchCode}${stackUnits > 1 ? `-U${u}` : ''})`,
          shortLabel: upperPanelId,
          sku: "PP-1U-24P-MOD",
          slotU: upperPPU > 0 ? `U${upperPPU}` : "Above Switch",
          switchUnit: u,
          switchSlotU: switchU > 0 ? `U${switchU}` : "",
          deck: "upper",
          totalJacks: 24,
          activePortRange: is48P ? "Ports 1–24" : "Ports 1–12",
          patchCordSpec: '6" Cat6A Slim',
          jacks: Array.from({ length: 24 }, (_, idx) => ({
            jackNumber: idx + 1,
            jackLabel: `J${String(idx + 1).padStart(2, "0")}`,
            panelTag: `${upperShortCode}-${String(idx + 1).padStart(2, "0")}`,
            fullTag: `${upperPanelId}-${String(idx + 1).padStart(2, "0")}`,
            port: null
          }))
        });

        panelsMap.set(lowerPanelId, {
          panelId: lowerPanelId,
          shortCode: lowerShortCode,
          panelSeqNum: lowerPanelSeqNum,
          deckKey: `U${u}-BOT`,
          label: `${lowerPanelId} • Lower 24P Keystone (${switchCode}${stackUnits > 1 ? `-U${u}` : ''})`,
          shortLabel: lowerPanelId,
          sku: "PP-1U-24P-MOD",
          slotU: lowerPPU > 0 ? `U${lowerPPU}` : "Below Switch",
          switchUnit: u,
          switchSlotU: switchU > 0 ? `U${switchU}` : "",
          deck: "lower",
          totalJacks: 24,
          activePortRange: is48P ? "Ports 25–48" : "Ports 13–24",
          patchCordSpec: '6" Cat6A Slim',
          jacks: Array.from({ length: 24 }, (_, idx) => ({
            jackNumber: idx + 1,
            jackLabel: `J${String(idx + 1).padStart(2, "0")}`,
            panelTag: `${lowerShortCode}-${String(idx + 1).padStart(2, "0")}`,
            fullTag: `${lowerPanelId}-${String(idx + 1).padStart(2, "0")}`,
            port: null
          }))
        });
      } else if (isStdPod || (hasPPBetween && u < stackUnits)) {
        if (!panelsMap.has(upperPanelId)) {
          panelsMap.set(upperPanelId, {
            panelId: upperPanelId,
            shortCode: upperShortCode,
            panelSeqNum: upperPanelSeqNum,
            deckKey: `U${u}-SINGLE`,
            label: `${upperPanelId} • ${ppRackUnits}U ${singlePanelJacks}P Keystone (${switchCode}${stackUnits > 1 ? `-U${u}` : ''})`,
            shortLabel: upperPanelId,
            sku: singlePanelSku,
            rackUnits: ppRackUnits,
            slotU: upperPPU > 0 ? (ppRackUnits > 1 ? `U${upperPPU + ppRackUnits - 1}-U${upperPPU}` : `U${upperPPU}`) : "Above Switch",
            switchUnit: u,
            switchSlotU: switchU > 0 ? `U${switchU}` : "",
            deck: "single",
            totalJacks: singlePanelJacks,
            activePortRange: `Ports 1–${Math.min(copperPorts.length || singlePanelJacks, singlePanelJacks)}`,
            patchCordSpec: '6" Cat6A Slim',
            jacks: Array.from({ length: singlePanelJacks }, (_, idx) => ({
              jackNumber: idx + 1,
              jackLabel: `J${String(idx + 1).padStart(2, "0")}`,
              panelTag: `${upperShortCode}-${String(idx + 1).padStart(2, "0")}`,
              fullTag: `${upperPanelId}-${String(idx + 1).padStart(2, "0")}`,
              port: null
            }))
          });
        }
      }

      unitPorts.forEach((p, idxInUnit) => {
        const dev = (p.connectedDeviceId && typeof projectBOM !== "undefined")
          ? projectBOM.find(i => i && i.instanceId === p.connectedDeviceId)
          : null;

        const isCopperAccess = !p.isUplink && p.role !== "uplink" && p.role !== "stack_interconnect" && String(p.connector || "RJ-45").includes("RJ");
        const localCopperIdx = copperPorts.indexOf(p); // 0-based within unit's copper ports

        // Look up Orion Project Cabling Standard (color & length) for this port's device
        const patchStd = (typeof getProjectCablingStandard === "function")
          ? getProjectCablingStandard(dev, "patch")
          : { color: "Yellow", lengthFt: 0.5, hex: "#eab308" };
        const runStd = (typeof getProjectCablingStandard === "function")
          ? getProjectCablingStandard(dev, "run")
          : { color: "Yellow", category: "Cat6A CMP", hex: "#eab308" };

        let panelId = p.customPatchPanelId || null;
        let panelShortCode = "";
        let panelLabel = "";
        let panelSlotU = "";
        let jackNum = p.customKeystoneJack || p.customPatchJack || null;
        let jackLabel = "";
        let panelTag = "";
        let patchCordSpec = `3ft Cat6A (${patchStd.color || "Yellow"})`;
        let deck = null;

        if (isCopperAccess && localCopperIdx >= 0) {
          if (isStdPod && isDual24Pod) {
            const isUpper = localCopperIdx < halfSplit;
            deck = isUpper ? "upper" : "lower";
            panelShortCode = isUpper ? upperShortCode : lowerShortCode;
            panelId = p.customPatchPanelId || (isUpper ? upperPanelId : lowerPanelId);
            panelLabel = isUpper ? `${panelId} (Upper 24P)` : `${panelId} (Lower 24P)`;
            panelSlotU = isUpper
              ? (upperPPU > 0 ? `U${upperPPU}` : "Upper 1U")
              : (lowerPPU > 0 ? `U${lowerPPU}` : "Lower 1U");
            jackNum = p.customKeystoneJack || p.customPatchJack || (isUpper ? (localCopperIdx + 1) : (localCopperIdx - halfSplit + 1));
            jackLabel = `J${String(jackNum).padStart(2, "0")}`;
            panelTag = `${panelShortCode}-${String(jackNum).padStart(2, "0")}`;
            patchCordSpec = `6" Cat6A Slim (${patchStd.color || "Yellow"})`;

            const panelObj = panelsMap.get(isUpper ? upperPanelId : lowerPanelId);
            if (panelObj && panelObj.jacks[jackNum - 1]) {
              panelObj.jacks[jackNum - 1].port = p;
              panelObj.jacks[jackNum - 1].device = dev;
            }
          } else if (isStdPod || hasPPBetween) {
            deck = "single";
            panelShortCode = upperShortCode;
            panelId = p.customPatchPanelId || upperPanelId;
            panelLabel = `${panelId} (${singlePanelJacks}P Keystone)`;
            panelSlotU = upperPPU > 0 ? `U${upperPPU}` : `${ppRackUnits}U Above`;
            jackNum = p.customKeystoneJack || p.customPatchJack || ((localCopperIdx % singlePanelJacks) + 1);
            jackLabel = `J${String(jackNum).padStart(2, "0")}`;
            panelTag = `${panelShortCode}-${String(jackNum).padStart(2, "0")}`;
            patchCordSpec = `6" Cat6A Slim (${patchStd.color || "Yellow"})`;

            const panelObj = panelsMap.get(upperPanelId);
            if (panelObj && panelObj.jacks[jackNum - 1] && !panelObj.jacks[jackNum - 1].port) {
              panelObj.jacks[jackNum - 1].port = p;
              panelObj.jacks[jackNum - 1].device = dev;
            }
          } else if (standalonePanels.length > 0) {
            // Map across standalone rack patch panels in this closet (respecting 48P vs 24P panels!)
            const firstCap = parseInt(standalonePanels[0].ports, 10) || (/48p/i.test(standalonePanels[0].sku || standalonePanels[0].model || "") ? 48 : 24);
            const ppIdx = Math.floor(localCopperIdx / firstCap) % standalonePanels.length;
            const ppItem = standalonePanels[ppIdx];
            const ppCap = parseInt(ppItem.ports, 10) || (/48p/i.test(ppItem.sku || ppItem.model || "") ? 48 : 24);
            panelShortCode = `PP${String(basePanelSeq + ppIdx).padStart(2, "0")}`;
            const ppSeq = ppItem.deviceNumber || `${closetCode}-${panelShortCode}`;
            panelId = p.customPatchPanelId || ppSeq;
            panelLabel = `${ppSeq} (${ppItem.friendlyName || ppItem.model || `${ppCap}P Patch Panel`})`;
            panelSlotU = ppItem.rackSlot ? `U${ppItem.rackSlot}` : "Rack";
            jackNum = p.customKeystoneJack || p.customPatchJack || ((localCopperIdx % ppCap) + 1);
            jackLabel = `J${String(jackNum).padStart(2, "0")}`;
            panelTag = `${panelShortCode}-${String(jackNum).padStart(2, "0")}`;
            patchCordSpec = `${patchStd.lengthFt || 3}ft Cat6A (${patchStd.color || "Yellow"})`;
          } else {
            // Standard Closet Patch Panel designation (48P panel for 48-port switches, 24P for <=24-port switches)
            const defCap = is48P ? 48 : 24;
            const ppBank = basePanelSeq + Math.floor(((u - 1) * copperPorts.length + localCopperIdx) / defCap);
            panelShortCode = `PP${String(ppBank).padStart(2, "0")}`;
            panelId = p.customPatchPanelId || `${closetCode}-${panelShortCode}`;
            panelLabel = `${panelId} (${defCap}P Keystone)`;
            panelSlotU = switchU > 0 ? `Near U${switchU}` : "Closet Patch Field";
            jackNum = p.customKeystoneJack || p.customPatchJack || ((localCopperIdx % defCap) + 1);
            jackLabel = `J${String(jackNum).padStart(2, "0")}`;
            panelTag = `${panelShortCode}-${String(jackNum).padStart(2, "0")}`;
            patchCordSpec = `${patchStd.lengthFt || 1}ft Cat6A (${patchStd.color || "Yellow"})`;
          }
        } else if (p.role === "stack_interconnect") {
          panelShortCode = "STACK";
          panelId = `${closetCode}-STACK`;
          panelLabel = "Direct-Attach Stack Ring";
          panelSlotU = switchU > 0 ? `U${switchU}` : "Rear/Front Cage";
          jackLabel = p.shortLabel || `Stk`;
          panelTag = `STACK-${p.unitPortNumber || p.portNumber}`;
          patchCordSpec = "100G/40G Stack DAC";
        } else {
          // Optical Uplink Cage
          panelShortCode = "LIU01";
          panelId = `${closetCode}-LIU01`;
          panelLabel = `${closetCode} Rack Fiber LIU`;
          panelSlotU = switchU > 0 ? `U${switchU}` : "Uplink Cage";
          jackLabel = p.shortLabel || `LC-${p.unitPortNumber || p.portNumber}`;
          panelTag = `LIU01-${String(p.unitPortNumber || p.portNumber).padStart(2, "0")}`;
          patchCordSpec = p.mediaType === "dac_copper" ? "SFP+ DAC Twinax" : "LC-LC Duplex Fiber Jumper (Aqua/Yellow)";
        }

        // Device Tag per Orion DeviceTaxonomy (e.g. CAM01, DR01, LPR01)
        const devSeq = dev
          ? (dev.deviceNumber || `${(dev.deviceTypePrefix || (dev.role || "DEV").slice(0, 3)).toUpperCase()}${String(p.portNumber).padStart(2, "0")}`)
          : null;

        // OSS Standard Cable Label Legend ID ([Building]-[Floor]-[Closet]-[Cable#])
        const legendEntry = (dev && ossCableLegendByDeviceId[dev.instanceId]) ? ossCableLegendByDeviceId[dev.instanceId] : null;
        const horizontalCableId = dev
          ? (dev.cableId || (legendEntry ? legendEntry.cableId : `${closetCode}-${p.portNumber}`))
          : null;

        // Switch Port Tag per Orion Cable Legend (e.g. SW01P1 or SW01-U2-P1)
        const switchPortTag = stackUnits > 1
          ? `${switchCode}-U${u}P${p.unitPortNumber || p.portNumber}`
          : `${switchCode}P${p.unitPortNumber || p.portNumber}`;

        // Unique Patch Cord ID connecting Patch Panel Jack <-> Switch Port
        const patchCordId = isCopperAccess
          ? `PC-${closetCode}-${panelTag}`
          : `FO-${closetCode}-${panelTag}`;

        // Orion 2-Line Brady M21-750-499 Labels (Headend & Field End)
        const roomOrZone = legendEntry ? legendEntry.roomName : (dev ? (dev.location || dev.closetName || closetCode) : closetCode);
        const headendLabelLine1 = horizontalCableId || `${closetCode}-UNASSIGNED`;
        const headendLabelLine2 = devSeq
          ? `${devSeq} → ${panelTag} → ${switchPortTag}`
          : `SPARE → ${panelTag} → ${switchPortTag}`;
        const fieldLabelLine1 = horizontalCableId || `${closetCode}-UNASSIGNED`;
        const fieldLabelLine2 = devSeq
          ? `${devSeq} → ${roomOrZone}`
          : `SPARE`;

        byPortNumber[p.portNumber] = {
          portNumber: p.portNumber,
          unitIndex: u,
          unitPortNumber: p.unitPortNumber || p.portNumber,
          switchCode,
          switchPortTag,
          switchSlotU: switchU > 0 ? `U${switchU}` : "",
          isCopperAccess,
          isStandardPod: isStdPod,
          deck,
          patchPanelId: panelId,
          patchPanelShortCode: panelShortCode,
          patchPanelLabel: panelLabel,
          patchPanelSlotU: panelSlotU,
          keystoneJackNumber: jackNum,
          keystoneJackLabel: jackLabel,
          panelTag,
          fullPatchCoordinate: isCopperAccess ? `${panelId}:${jackLabel}${panelSlotU ? ` [${panelSlotU}]` : ""}` : `${panelId} (${jackLabel})`,
          patchCordId,
          patchCordSpec,
          patchCordColor: patchStd.color || "Yellow",
          patchCordHex: patchStd.hex || "#eab308",
          runColor: runStd.color || "Yellow",
          runHex: runStd.hex || "#eab308",
          horizontalCableId,
          headendLabelLine1,
          headendLabelLine2,
          fieldLabelLine1,
          fieldLabelLine2,
          isPatched: !!p.connectedDeviceId,
          connectedDeviceId: p.connectedDeviceId || null,
          connectedDeviceName: dev ? (dev.friendlyName || dev.model) : (p.connectedDeviceModel || null),
          connectedDeviceNumber: devSeq,
          connectedDeviceRole: dev ? (dev.role || "Device") : (p.connectedDeviceRole || null),
          connectedLocation: roomOrZone,
          poeWatts: p.poeOutputWatts || 0
        };
      });
    }

    return {
      byPortNumber,
      mappings: byPortNumber,
      switchCode,
      closetCode,
      isStandardPod: isStdPod,
      panels: Array.from(panelsMap.values())
    };
  }
};

// Export to Global Window scope
if (typeof window !== "undefined") {
  window.PortEngine = PortEngine;
  window.PORT_MEDIA_TYPES = PORT_MEDIA_TYPES;
  window.POWER_SOURCE_MODES = POWER_SOURCE_MODES;
}
