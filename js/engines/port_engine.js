// =========================================================================
// PORT & PHYSICAL INTERFACE ENGINE (NetSelect Enterprise)
// Master Engine for Switch Ports, Device Interfaces, Uplinks, and Power Delivery
// =========================================================================

/**
 * Standard Media Types & Maximum Theoretical Wire Speeds
 */
const PORT_MEDIA_TYPES = {
  rj45_1g: { id: "rj45_1g", label: "1G RJ-45 Copper", speed: "1G", speedMbps: 1000, connector: "RJ-45", defaultPoe: "at" },
  rj45_mgeg: { id: "rj45_mgig", label: "2.5G/5G Multi-Gig Copper", speed: "2.5G", speedMbps: 2500, connector: "RJ-45", defaultPoe: "bt60" },
  rj45_10g: { id: "rj45_10g", label: "10G RJ-45 Copper", speed: "10G", speedMbps: 10000, connector: "RJ-45", defaultPoe: "bt90" },
  sfp_1g: { id: "sfp_1g", label: "1G SFP Optical Cage", speed: "1G", speedMbps: 1000, connector: "SFP", defaultPoe: null },
  sfp_plus_10g: { id: "sfp_plus_10g", label: "10G SFP+ Optical Cage", speed: "10G", speedMbps: 10000, connector: "SFP+", defaultPoe: null },
  sfp28_25g: { id: "sfp28_25g", label: "25G SFP28 Optical Cage", speed: "25G", speedMbps: 25000, connector: "SFP28", defaultPoe: null },
  qsfp_plus_40g: { id: "qsfp_plus_40g", label: "40G QSFP+ Optical Cage", speed: "40G", speedMbps: 40000, connector: "QSFP+", defaultPoe: null },
  qsfp28_100g: { id: "qsfp28_100g", label: "100G QSFP28 Optical Cage", speed: "100G", speedMbps: 100000, connector: "QSFP28", defaultPoe: null },
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
  }
};

/**
 * Master Port Engine
 */
const PortEngine = {
  MEDIA: PORT_MEDIA_TYPES,
  POWER_MODES: POWER_SOURCE_MODES,

  /**
   * Initializes or normalizes physical ports on a switch item
   * @param {Object} item - BOM line item representing a switch or router
   * @returns {Array} Array of standardized port objects
   */
  initSwitchPorts(item) {
    if (!item) return [];
    if (Array.isArray(item.physicalPorts) && item.physicalPorts.length > 0) {
      return item.physicalPorts;
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

    // Detect optical uplink cages from uplinksSummary or SKU
    const uplinksText = (item.uplinksSummary || item.portFormFactorSummary || "").toLowerCase();
    let uplinkPortCount = 0;
    let uplinkSpeed = "10G";
    let uplinkMedia = "sfp_plus_10g";

    if (uplinksText.includes("100g") || (item.maxBackboneSpeed === "100G")) {
      uplinkPortCount = 4;
      uplinkSpeed = "100G";
      uplinkMedia = "qsfp28_100g";
    } else if (uplinksText.includes("40g") || (item.maxBackboneSpeed === "40G")) {
      uplinkPortCount = 2;
      uplinkSpeed = "40G";
      uplinkMedia = "qsfp_plus_40g";
    } else if (uplinksText.includes("25g") || (item.maxBackboneSpeed === "25G")) {
      uplinkPortCount = 4;
      uplinkSpeed = "25G";
      uplinkMedia = "sfp28_25g";
    } else if (uplinksText.includes("10g") || (item.maxBackboneSpeed === "10G") || totalPortCount >= 24) {
      uplinkPortCount = (totalPortCount === 52 || totalPortCount === 48) ? 4 : (totalPortCount === 28 ? 4 : 2);
      uplinkSpeed = "10G";
      uplinkMedia = "sfp_plus_10g";
    } else if (uplinksText.includes("sfp")) {
      uplinkPortCount = 2;
      uplinkSpeed = "1G";
      uplinkMedia = "sfp_1g";
    }

    // Determine access ports vs uplink cages
    const accessPortCount = Math.max(1, totalPortCount - uplinkPortCount);
    const ports = [];

    // 1. Generate Access / Downlink Ports (RJ-45)
    for (let i = 1; i <= accessPortCount; i++) {
      let poeStandard = null;
      let maxPoeWatts = 0;

      if (poeBudget > 0) {
        if (i <= poeBt90Count) {
          poeStandard = "bt90";
          maxPoeWatts = 90;
        } else if (i <= (poeBt90Count + poeBt60Count)) {
          poeStandard = "bt60";
          maxPoeWatts = 60;
        } else if (i <= poeAtCount) {
          poeStandard = "at";
          maxPoeWatts = 30;
        } else if (i <= poeAfCount) {
          poeStandard = "af";
          maxPoeWatts = 15.4;
        } else {
          poeStandard = "at";
          maxPoeWatts = 30;
        }
      }

      ports.push({
        portNumber: i,
        label: `Port ${i}`,
        mediaType: "rj45_1g",
        connector: "RJ-45",
        speed: item.portSpeed && item.portSpeed.includes("2.5G") ? "2.5G" : (item.portSpeed && item.portSpeed.includes("10G") ? "10G" : "1G"),
        poeStandard,
        maxPoeWatts,
        poeOutputWatts: 0,
        connectedDeviceId: null,
        connectedDeviceModel: null,
        connectedPortNumber: null,
        role: "access", // access, trunk, uplink, peer
        isUplink: false,
        linkStatus: "down",
        adminStatus: "up"
      });
    }

    // 2. Generate Uplink / Backbone Optical Cages
    for (let j = 1; j <= uplinkPortCount; j++) {
      const portNum = accessPortCount + j;
      ports.push({
        portNumber: portNum,
        label: `Uplink ${j} (${uplinkSpeed})`,
        mediaType: uplinkMedia,
        connector: uplinkMedia.includes("qsfp") ? "QSFP" : "SFP+",
        speed: uplinkSpeed,
        poeStandard: null,
        maxPoeWatts: 0,
        poeOutputWatts: 0,
        connectedDeviceId: null,
        connectedDeviceModel: null,
        connectedPortNumber: null,
        role: "uplink",
        isUplink: true,
        linkStatus: "down",
        adminStatus: "up"
      });
    }

    item.physicalPorts = ports;
    return ports;
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

    // If PoE is needed, filter for ports with PoE capability
    if (needsPoe) {
      const poeCandidates = candidates.filter(p => p.poeStandard !== null);
      if (poeCandidates.length > 0) {
        candidates = poeCandidates;
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
    if (deviceItem.powerSourceOverride && this.POWER_MODES[deviceItem.powerSourceOverride]) {
      return deviceItem.powerSourceOverride;
    }
    if (deviceItem.powerSource && this.POWER_MODES[deviceItem.powerSource]) {
      return deviceItem.powerSource;
    }
    if (deviceItem.interfaces && deviceItem.interfaces.length > 0 && deviceItem.interfaces[0].powerSource) {
      const ps = deviceItem.interfaces[0].powerSource;
      if (this.POWER_MODES[ps]) return ps;
    }

    const role = deviceItem.role;
    if (role === "Server" || role === "VMS Server" || role === "Compute & Storage") {
      return deviceItem.dualPsu !== false ? "dual_ac" : "dedicated_ac";
    }
    if (role === "Core" || role === "Core & Agg" || role === "Aggregation" || role === "Gateways & WAN" || role === "Security WAN") {
      return (deviceItem.dualPsu || deviceItem.psuSku) ? "dual_ac" : "internal_psu";
    }
    if (role === "Access") {
      if (deviceItem.isPoEPowered || deviceItem.powerSource === "poe_switch" || deviceItem.powerSource === "poe_in") {
        return "poe_switch";
      }
      if (deviceItem.directDc || (deviceItem.mounting && deviceItem.mounting.includes("DIN") && !deviceItem.mounting.includes("19\""))) {
        return "dedicated_dc";
      }
      return "internal_psu";
    }
    if (role === "Wireless Bridge" || deviceItem.category === "wireless") {
      if (deviceItem.directDc) return "dedicated_dc";
      return "poe_switch";
    }
    if (deviceItem.directDc) return "dedicated_dc";
    return "poe_switch";
  },

  /**
   * Returns human-readable power source badge info
   */
  getPowerBadge(deviceItem) {
    const mode = this.getDevicePowerSource(deviceItem);
    const def = this.POWER_MODES[mode] || this.POWER_MODES.poe_switch;
    return {
      mode,
      label: def.label,
      badgeLabel: def.badgeLabel,
      icon: def.icon,
      isExternal: !def.drawsFromSwitch
    };
  },

  /**
   * Provides comprehensive port utilization telemetry for a switch
   */
  getPortSummary(switchItem) {
    if (!switchItem) return { total: 0, used: 0, free: 0, poeLoad: 0, poeBudget: 0 };
    const ports = this.initSwitchPorts(switchItem);

    const total = ports.length;
    const used = ports.filter(p => p.connectedDeviceId).length;
    const free = total - used;
    const poeCapable = ports.filter(p => p.poeStandard !== null).length;
    const poeActive = ports.filter(p => (p.poeOutputWatts || 0) > 0).length;
    const poeLoad = switchItem.consumedPoEWatts || 0;
    const poeBudget = parseFloat(switchItem.poeBudget) || 0;

    return {
      total,
      used,
      free,
      poeCapable,
      poeActive,
      poeLoad,
      poeBudget,
      percentUsed: Math.round((used / (total || 1)) * 100),
      percentPoe: Math.round((poeLoad / (poeBudget || 1)) * 100)
    };
  }
};

// Export to Global Window scope
if (typeof window !== "undefined") {
  window.PortEngine = PortEngine;
  window.PORT_MEDIA_TYPES = PORT_MEDIA_TYPES;
  window.POWER_SOURCE_MODES = POWER_SOURCE_MODES;
}
