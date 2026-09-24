// =========================================================================
// FACILITY & LOCATION HIERARCHY ENGINE (NetSelect Enterprise)
// Single Source of Truth for Floors, Spaces/Closets/Poles, Enclosures & Event Dispatching
// =========================================================================

/**
 * 5 Canonical Physical Mounting Hosts (Where equipment is mounted & powered)
 */
const MOUNTING_HOST_TYPES = {
  equipment_rack: {
    id: "equipment_rack",
    label: "Equipment Rack",
    badgeLabel: "19\" Rack",
    icon: "server",
    color: "cyan",
    unitOfMeasure: "RU",
    defaultCapacity: 42,
    description: "Standard 19-inch EIA-310 open 2/4-post rack or enclosed server cabinet"
  },
  security_cabinet: {
    id: "security_cabinet",
    label: "Security & Control Cabinet",
    badgeLabel: "Security Can",
    icon: "shield-alert",
    color: "purple",
    unitOfMeasure: "Bays",
    defaultCapacity: 8,
    description: "Wall-mount access control & power cabinet with modular subplates (Altronix Trove, LSP ProWire)"
  },
  industrial_din: {
    id: "industrial_din",
    label: "Industrial NEMA / DIN Box",
    badgeLabel: "NEMA / DIN",
    icon: "box",
    color: "amber",
    unitOfMeasure: "mm Rail",
    defaultCapacity: 350,
    description: "Weatherproof NEMA 4X / IP66 enclosure with 35mm Top-Hat DIN-rails and DC power distribution"
  },
  structural_mount: {
    id: "structural_mount",
    label: "Structural Pole / Mast Mount",
    badgeLabel: "Pole Mount",
    icon: "navigation",
    color: "emerald",
    unitOfMeasure: "Points",
    defaultCapacity: 4,
    description: "Exterior utility pole, antenna mast, or parking gate pedestal with mounting bracket hardware"
  },
  architectural_backboard: {
    id: "architectural_backboard",
    label: "Architectural Backboard",
    badgeLabel: "Backboard",
    icon: "grid",
    color: "slate",
    unitOfMeasure: "Sq Ft",
    defaultCapacity: 32,
    description: "3/4-inch fire-retardant AC plywood telecom wall backboard for surface-mounted equipment"
  }
};

/**
 * 5 Canonical Edge Endpoints & Sub-Assemblies (Where field devices live & connect)
 */
const EDGE_ENDPOINT_TYPES = {
  door_portal: {
    id: "door_portal",
    label: "Access-Controlled Portal",
    badgeLabel: "Door Portal",
    icon: "door-open",
    defaultMedia: "composite_access",
    elements: ["Card Reader", "Electric Lock / Strike", "Door Position Switch (DPS)", "Request-to-Exit (REX)"],
    description: "Complete access-controlled doorway running on bundled 4-element composite cable"
  },
  surveillance_point: {
    id: "surveillance_point",
    label: "Surveillance Camera Station",
    badgeLabel: "Camera",
    icon: "video",
    defaultMedia: "cat6a_plenum",
    elements: ["IP Camera", "Mount Bracket / Pendant", "Junction Box", "Surge Protector"],
    description: "Fixed, multi-sensor, or PTZ camera location with mounting accessories and PoE power"
  },
  wireless_node: {
    id: "wireless_node",
    label: "Wireless Station / AP",
    badgeLabel: "Wireless",
    icon: "wifi",
    defaultMedia: "cat6a_plenum",
    elements: ["Access Point / PtP Radio", "Antenna", "Mounting Bracket"],
    description: "Indoor Wi-Fi AP or outdoor point-to-point wireless bridge endpoint"
  },
  telecom_outlet: {
    id: "telecom_outlet",
    label: "Workstation Telecom Outlet",
    badgeLabel: "Telecom Drop",
    icon: "network",
    defaultMedia: "cat6a_plenum",
    elements: ["Faceplate", "Keystone Jacks", "Station Patch Cord"],
    description: "Wall, floor, or ceiling outlet for desktop computing, VoIP phone, printer, or smart TV"
  },
  sensor_point: {
    id: "sensor_point",
    label: "Intrusion / Environmental Sensor",
    badgeLabel: "Sensor",
    icon: "activity",
    defaultMedia: "22_4_stranded",
    elements: ["Sensor Board", "Aux Power", "Supervised Zone Loop"],
    description: "Motion detector, glass break, emergency panic button, or environmental monitor"
  }
};

const FacilityStore = {
  UNASSIGNED: "Unassigned",
  HOST_TYPES: MOUNTING_HOST_TYPES,
  ENDPOINT_TYPES: EDGE_ENDPOINT_TYPES,

  // Canonical Default Hierarchy Structure
  defaultFloors: [
    { id: "floor-1", name: "Level 1 - Main Floor", levelIndex: 1, heightFt: 14, scaleFt: 25, slackFt: 15, slabFt: 10 }
  ],

  defaultSpaces: [
    { id: "space-mdf", name: "MDF", floorId: "floor-1", type: "mdf", description: "Main Data Center & Distribution" },
    { id: "space-idf1", name: "IDF-1", floorId: "floor-1", type: "idf", description: "Floor 1 Telecommunications Closet" },
    { id: "space-pole1", name: "Pole 1", floorId: "floor-1", type: "pole", description: "Perimeter Security & Wireless Pole" },
    { id: "space-guard", name: "Guard Shack", floorId: "floor-1", type: "guard_shack", description: "Entrance Security Station" }
  ],

  defaultEnclosures: [
    { id: "enc-mdf-rack1", spaceId: "space-mdf", name: "Rack-1", hostType: "equipment_rack", type: "rack_4post", heightU: 42, maxWatts: 4500, pduCount: 2, isDin: false, depthInches: 36 },
    { id: "enc-idf1-rack1", spaceId: "space-idf1", name: "Rack-1", hostType: "equipment_rack", type: "rack_4post", heightU: 24, maxWatts: 3000, pduCount: 2, isDin: false, depthInches: 24 },
    { id: "enc-pole1-nema", spaceId: "space-pole1", name: "NEMA-Box", hostType: "industrial_din", type: "nema_box", heightU: 0, isDin: true, maxWatts: 800, pduCount: 1, dinRails: 2, railLengthMm: 350 },
    { id: "enc-guard-rack1", spaceId: "space-guard", name: "Rack-1", hostType: "equipment_rack", type: "wall_cabinet", heightU: 12, maxWatts: 1500, pduCount: 1, isDin: false, depthInches: 18 }
  ],

  getProjectId() {
    try {
      return localStorage.getItem("netselect_active_project_id") || "default";
    } catch (e) {
      return "default";
    }
  },

  setProjectId(projId) {
    if (!projId) return;
    try {
      localStorage.setItem("netselect_active_project_id", projId);
    } catch (e) {}
  },

  // -----------------------------------------------------------
  // Hierarchy Data Accessors (Floors, Spaces, Enclosures)
  // -----------------------------------------------------------
  getFloors() {
    const projKey = this.getProjectId();
    try {
      const raw = localStorage.getItem(`netselect_fac_floors_${projKey}`);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return JSON.parse(JSON.stringify(this.defaultFloors));
  },

  saveFloors(list) {
    try {
      const projKey = this.getProjectId();
      localStorage.setItem(`netselect_fac_floors_${projKey}`, JSON.stringify(list));
    } catch (e) {}
  },

  addFloor(name, levelIndex = 1, options = {}) {
    const list = this.getFloors();
    const id = `floor-${Date.now()}`;
    const newFloor = {
      id,
      name: name || `Level ${list.length + 1}`,
      levelIndex: parseInt(levelIndex, 10) || (list.length + 1),
      heightFt: options.heightFt || 14,
      scaleFt: options.scaleFt || 25,
      slackFt: options.slackFt || 15,
      slabFt: options.slabFt || 10
    };
    list.push(newFloor);
    this.saveFloors(list);
    this.notifyWorkspaceChange();
    return newFloor;
  },

  deleteFloor(floorId) {
    let list = this.getFloors();
    if (list.length <= 1) {
      alert("At least one building floor level must remain in the project.");
      return false;
    }
    list = list.filter(f => f.id !== floorId);
    this.saveFloors(list);

    // Reassign orphan spaces to first floor
    const fallbackFloor = list[0].id;
    const spaces = this.getSpaces();
    spaces.forEach(s => {
      if (s.floorId === floorId) s.floorId = fallbackFloor;
    });
    this.saveSpaces(spaces);
    this.notifyWorkspaceChange();
    return true;
  },

  getSpaces(floorId = null) {
    const projKey = this.getProjectId();
    let list = [];
    try {
      const raw = localStorage.getItem(`netselect_fac_spaces_${projKey}`);
      list = raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(this.defaultSpaces));
    } catch (e) {
      list = JSON.parse(JSON.stringify(this.defaultSpaces));
    }
    if (floorId) {
      return list.filter(s => s.floorId === floorId);
    }
    return list;
  },

  saveSpaces(list) {
    try {
      const projKey = this.getProjectId();
      localStorage.setItem(`netselect_fac_spaces_${projKey}`, JSON.stringify(list));
    } catch (e) {}
  },

  addSpace(name, type = "idf", floorId = "floor-1", options = {}) {
    if (!name || !name.trim()) return null;
    const list = this.getSpaces();
    const id = `space-${Date.now()}`;
    const newSpace = {
      id,
      name: name.trim(),
      type: type || "idf",
      floorId: floorId || "floor-1",
      description: options.description || ""
    };
    list.push(newSpace);
    this.saveSpaces(list);

    // Create default host for this space (e.g. Rack-1, NEMA-Box, or Security Cabinet)
    const isOutdoor = type === "pole" || type === "exterior";
    const isAccess = type === "electrical_room" || type === "security_room";
    let hostName = "Rack-1";
    let hostType = "equipment_rack";
    let heightU = 24;

    if (isOutdoor) {
      hostName = "NEMA-Box";
      hostType = "industrial_din";
      heightU = 0;
    } else if (isAccess) {
      hostName = "AC-Cabinet-1";
      hostType = "security_cabinet";
      heightU = 0;
    } else if (type === "wallbox") {
      hostName = "Wallbox";
      hostType = "equipment_rack";
      heightU = 12;
    }

    this.addHost(hostName, hostType, id, { heightU });
    this.notifyWorkspaceChange();
    return newSpace;
  },

  deleteSpace(spaceId, fallbackSpaceId = null) {
    let spaces = this.getSpaces();
    if (spaces.length <= 1) {
      alert("At least one telecom space or closet must remain in the project.");
      return false;
    }
    const targetSpace = spaces.find(s => s.id === spaceId);
    if (!targetSpace) return false;

    spaces = spaces.filter(s => s.id !== spaceId);
    this.saveSpaces(spaces);

    // Reassign enclosures
    const fallback = fallbackSpaceId || spaces[0].id;
    const encs = this.getEnclosures();
    encs.forEach(e => {
      if (e.spaceId === spaceId) e.spaceId = fallback;
    });
    this.saveEnclosures(encs);
    this.notifyWorkspaceChange();
    return true;
  },

  getEnclosures(spaceId = null) {
    const projKey = this.getProjectId();
    let list = [];
    try {
      const raw = localStorage.getItem(`netselect_fac_enclosures_${projKey}`);
      list = raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(this.defaultEnclosures));
    } catch (e) {
      list = JSON.parse(JSON.stringify(this.defaultEnclosures));
    }

    // Ensure all hosts have guaranteed hostType
    list.forEach(e => {
      if (!e.hostType) {
        if (e.isDin || e.type === "nema_box" || (e.name && (e.name.toLowerCase().includes("nema") || e.name.toLowerCase().includes("din")))) {
          e.hostType = "industrial_din";
        } else if (e.name && (e.name.toLowerCase().includes("panel") || e.name.toLowerCase().includes("trove") || e.name.toLowerCase().includes("ac-"))) {
          e.hostType = "security_cabinet";
        } else if (e.name && e.name.toLowerCase().includes("pole")) {
          e.hostType = "structural_mount";
        } else if (e.name && (e.name.toLowerCase().includes("backboard") || e.name.toLowerCase().includes("plywood"))) {
          e.hostType = "architectural_backboard";
        } else {
          e.hostType = "equipment_rack";
        }
      }
    });

    if (spaceId) {
      return list.filter(e => e.spaceId === spaceId);
    }
    return list;
  },

  // Host Accessor Alias
  getHosts(spaceId = null) {
    return this.getEnclosures(spaceId);
  },

  saveEnclosures(list) {
    try {
      const projKey = this.getProjectId();
      localStorage.setItem(`netselect_fac_enclosures_${projKey}`, JSON.stringify(list));
    } catch (e) {}
  },

  addEnclosure(name, type = "rack_4post", spaceId = "space-mdf", heightU = 24, maxWatts = 3000, options = {}) {
    if (!name || !name.trim()) return null;
    const list = this.getEnclosures();
    const id = `enc-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    
    // Resolve hostType from options, type, or name context
    let hostType = options.hostType;
    if (!hostType) {
      if (type === "nema_box" || type === "din_rail" || name.toLowerCase().includes("nema") || name.toLowerCase().includes("din")) {
        hostType = "industrial_din";
      } else if (type === "wall_cabinet" || name.toLowerCase().includes("panel") || name.toLowerCase().includes("trove") || name.toLowerCase().includes("ac-")) {
        hostType = "security_cabinet";
      } else if (type === "pole" || name.toLowerCase().includes("pole")) {
        hostType = "structural_mount";
      } else if (type === "backboard" || name.toLowerCase().includes("backboard") || name.toLowerCase().includes("plywood")) {
        hostType = "architectural_backboard";
      } else {
        hostType = "equipment_rack";
      }
    }

    const isDin = hostType === "industrial_din" || type === "din_rail" || type === "nema_box";
    const newEnc = {
      id,
      spaceId: spaceId || "space-mdf",
      name: name.trim(),
      hostType,
      type: type || (isDin ? "nema_box" : "rack_4post"),
      heightU: parseInt(heightU, 10) || (hostType === "equipment_rack" ? 24 : 0),
      isDin,
      maxWatts: parseInt(maxWatts, 10) || (hostType === "equipment_rack" ? 3000 : (hostType === "security_cabinet" ? 1200 : 800)),
      pduCount: hostType === "equipment_rack" ? 2 : 1,
      // Specific host parameters:
      subplateBays: options.subplateBays || (hostType === "security_cabinet" ? 8 : null),
      dcVoltage: options.dcVoltage || (hostType === "security_cabinet" ? "dual_12_24" : null),
      dinRails: options.dinRails || (hostType === "industrial_din" ? 2 : null),
      railLengthMm: options.railLengthMm || (hostType === "industrial_din" ? 350 : null),
      depthInches: options.depthInches || (hostType === "equipment_rack" ? 24 : null),
      poleDiameterInches: options.poleDiameterInches || (hostType === "structural_mount" ? 4 : null),
      widthFt: options.widthFt || (hostType === "architectural_backboard" ? 4 : null),
      heightFt: options.heightFt || (hostType === "architectural_backboard" ? 8 : null),
      config: options.config || {}
    };
    list.push(newEnc);
    this.saveEnclosures(list);
    this.notifyWorkspaceChange();
    return newEnc;
  },

  addHost(name, hostType = "equipment_rack", spaceId = "space-mdf", options = {}) {
    return this.addEnclosure(name, hostType, spaceId, options.heightU || (hostType === "equipment_rack" ? 24 : 0), options.maxWatts || 3000, { ...options, hostType });
  },

  updateHost(hostId, updates = {}) {
    const list = this.getEnclosures();
    const host = list.find(h => h.id === hostId);
    if (!host) return false;
    Object.assign(host, updates);
    this.saveEnclosures(list);
    this.notifyWorkspaceChange();
    return host;
  },

  deleteEnclosure(enclosureId, fallbackEnclosureId = null) {
    let encs = this.getEnclosures();
    if (encs.length <= 1) {
      alert("At least one equipment enclosure / rack must remain in the project.");
      return false;
    }
    const targetEnc = encs.find(e => e.id === enclosureId);
    if (!targetEnc) return false;

    encs = encs.filter(e => e.id !== enclosureId);
    this.saveEnclosures(encs);
    this.notifyWorkspaceChange();
    return true;
  },

  deleteHost(hostId, fallbackHostId = null) {
    return this.deleteEnclosure(hostId, fallbackHostId);
  },

  // -----------------------------------------------------------
  // Edge Endpoints & Sub-Assemblies (Doors, Cameras, APs, Drops)
  // -----------------------------------------------------------
  getEndpoints(floorId = null) {
    const projKey = this.getProjectId();
    let list = [];
    try {
      const raw = localStorage.getItem(`netselect_fac_endpoints_${projKey}`);
      list = raw ? JSON.parse(raw) : [];
    } catch (e) {
      list = [];
    }
    if (floorId) {
      return list.filter(ep => ep.floorId === floorId);
    }
    return list;
  },

  saveEndpoints(list) {
    try {
      const projKey = this.getProjectId();
      localStorage.setItem(`netselect_fac_endpoints_${projKey}`, JSON.stringify(list));
    } catch (e) {}
  },

  addEndpoint(name, endpointType = "door_portal", floorId = "floor-1", options = {}) {
    if (!name || !name.trim()) return null;
    const list = this.getEndpoints();
    const id = `ep-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    const def = EDGE_ENDPOINT_TYPES[endpointType] || EDGE_ENDPOINT_TYPES.door_portal;

    const newEndpoint = {
      id,
      name: name.trim(),
      endpointType,
      floorId: floorId || "floor-1",
      mediaType: options.mediaType || def.defaultMedia || "cat6a_plenum",
      homeRunHostId: options.homeRunHostId || null,
      homeRunHostName: options.homeRunHostName || "MDF • Rack-1",
      coordinates: options.coordinates || { x: 300, y: 300 },
      // Sub-elements / components:
      components: options.components || {},
      status: "active",
      notes: options.notes || ""
    };
    list.push(newEndpoint);
    this.saveEndpoints(list);
    this.notifyWorkspaceChange();
    return newEndpoint;
  },

  updateEndpoint(endpointId, updates = {}) {
    const list = this.getEndpoints();
    const ep = list.find(e => e.id === endpointId);
    if (!ep) return false;
    Object.assign(ep, updates);
    this.saveEndpoints(list);
    this.notifyWorkspaceChange();
    return ep;
  },

  deleteEndpoint(endpointId) {
    let list = this.getEndpoints();
    list = list.filter(e => e.id !== endpointId);
    this.saveEndpoints(list);
    this.notifyWorkspaceChange();
    return true;
  },

  // -----------------------------------------------------------
  // Canonical Location String Handlers ("Space • Enclosure")
  // -----------------------------------------------------------
  normalize(str) {
    if (!str || !str.trim()) return this.UNASSIGNED;
    const trimmed = str.trim();
    if (trimmed === this.UNASSIGNED || trimmed.toLowerCase() === "unassigned") {
      return this.UNASSIGNED;
    }

    if (trimmed.includes(" • ")) return trimmed;

    // Intelligent suffixing based on naming context
    const lower = trimmed.toLowerCase();
    if (lower.includes("pole") || lower.includes("exterior")) return `${trimmed} • NEMA-Box`;
    if (lower.includes("wall") || lower.includes("gate")) return `${trimmed} • Wallbox`;
    return `${trimmed} • Rack-1`;
  },

  parse(str) {
    const normalized = this.normalize(str);
    if (normalized === this.UNASSIGNED) {
      return {
        fullName: this.UNASSIGNED,
        space: "Unassigned",
        enclosure: "Holding Bin",
        hostName: "Holding Bin",
        hostType: "holding_bin",
        isUnassigned: true,
        isRack: false,
        isSecurityCabinet: false,
        isDin: false,
        isStructuralMount: false,
        isBackboard: false
      };
    }
    const parts = normalized.split(" • ");
    const spaceName = parts[0];
    const hostName = parts[1] || "Rack-1";

    const spaces = this.getSpaces();
    const space = spaces.find(s => s.name.toLowerCase() === spaceName.toLowerCase());
    const encs = this.getEnclosures(space ? space.id : null);
    const enc = encs.find(e => e.name.toLowerCase() === hostName.toLowerCase());

    const hostType = enc ? (enc.hostType || (enc.isDin ? "industrial_din" : "equipment_rack")) : (
      hostName.toLowerCase().includes("nema") || hostName.toLowerCase().includes("din") ? "industrial_din" :
      hostName.toLowerCase().includes("panel") || hostName.toLowerCase().includes("trove") || hostName.toLowerCase().includes("ac-") ? "security_cabinet" :
      hostName.toLowerCase().includes("pole") ? "structural_mount" :
      hostName.toLowerCase().includes("backboard") ? "architectural_backboard" : "equipment_rack"
    );

    return {
      fullName: normalized,
      space: spaceName,
      enclosure: hostName,       // backward compat
      hostName: hostName,        // clean new naming
      spaceId: space ? space.id : null,
      enclosureId: enc ? enc.id : null, // backward compat
      hostId: enc ? enc.id : null,      // clean new naming
      floorId: space ? space.floorId : "floor-1",
      heightU: enc ? enc.heightU : 24,
      isDin: hostType === "industrial_din" || (enc && enc.isDin),
      hostType,
      hostConfig: enc ? (enc.config || {}) : {},
      isRack: hostType === "equipment_rack",
      isSecurityCabinet: hostType === "security_cabinet",
      isStructuralMount: hostType === "structural_mount",
      isBackboard: hostType === "architectural_backboard",
      isUnassigned: false
    };
  },

  // Returns all unified location entries for tool selectors
  getLocations() {
    const spaces = this.getSpaces();
    const enclosures = this.getEnclosures();
    const floors = this.getFloors();
    const list = [];

    spaces.forEach(s => {
      const spaceEncs = enclosures.filter(e => e.spaceId === s.id);
      const floor = floors.find(f => f.id === s.floorId) || floors[0];

      if (spaceEncs.length === 0) {
        // Fallback default enclosure if none exists
        list.push({
          id: `loc-${s.id}-default`,
          name: `${s.name} • Rack-1`,
          space: s.name,
          spaceId: s.id,
          enclosure: "Rack-1",
          hostName: "Rack-1",
          enclosureId: null,
          hostId: null,
          hostType: "equipment_rack",
          floorId: s.floorId,
          floorName: floor ? floor.name : "Level 1",
          heightU: 24,
          isDin: false
        });
      } else {
        spaceEncs.forEach(e => {
          const hostType = e.hostType || (e.isDin ? "industrial_din" : "equipment_rack");
          list.push({
            id: `loc-${s.id}-${e.id}`,
            name: `${s.name} • ${e.name}`,
            space: s.name,
            spaceId: s.id,
            enclosure: e.name,
            hostName: e.name,
            enclosureId: e.id,
            hostId: e.id,
            hostType,
            floorId: s.floorId,
            floorName: floor ? floor.name : "Level 1",
            heightU: e.heightU || (hostType === "equipment_rack" ? 24 : 0),
            isDin: hostType === "industrial_din" || e.isDin || false,
            maxWatts: e.maxWatts || 3000,
            subplateBays: e.subplateBays || null,
            dcVoltage: e.dcVoltage || null,
            dinRails: e.dinRails || null,
            railLengthMm: e.railLengthMm || null,
            depthInches: e.depthInches || null,
            config: e.config || {}
          });
        });
      }
    });

    // Auto-discover any locations stored on BOM items that may not be in hierarchy
    if (typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) {
      projectBOM.forEach(item => {
        const rawLoc = item.closetName || item.rackId;
        if (!rawLoc) return;
        const itemLoc = this.normalize(rawLoc);
        if (itemLoc !== this.UNASSIGNED && !list.some(l => l.name === itemLoc)) {
          const parsed = this.parse(itemLoc);
          list.push({
            id: `loc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: parsed.fullName,
            space: parsed.space,
            spaceId: null,
            enclosure: parsed.enclosure,
            hostName: parsed.hostName,
            enclosureId: null,
            hostId: null,
            hostType: parsed.hostType,
            floorId: "floor-1",
            floorName: "Level 1",
            heightU: parsed.heightU || 24,
            isDin: parsed.isDin || false
          });
        }
      });
    }

    return list;
  },

  getLocationNames(includeUnassigned = false) {
    const names = this.getLocations().map(l => l.name);
    if (includeUnassigned) {
      return [this.UNASSIGNED, ...names];
    }
    return names;
  },

  addLocation(rawInput, floorId = "floor-1") {
    const normalized = this.normalize(rawInput);
    if (normalized === this.UNASSIGNED) return this.UNASSIGNED;

    const parts = normalized.split(" • ");
    const spaceName = parts[0];
    const enclosureName = parts[1] || "Rack-1";

    let spaces = this.getSpaces();
    let space = spaces.find(s => s.name.toLowerCase() === spaceName.toLowerCase());
    if (!space) {
      const isPole = spaceName.toLowerCase().includes("pole");
      const isWall = spaceName.toLowerCase().includes("wall");
      space = this.addSpace(spaceName, isPole ? "pole" : (isWall ? "wallbox" : "idf"), floorId);
    }

    let encs = this.getEnclosures(space.id);
    let enc = encs.find(e => e.name.toLowerCase() === enclosureName.toLowerCase());
    if (!enc) {
      const isDin = enclosureName.toLowerCase().includes("nema") || enclosureName.toLowerCase().includes("din");
      this.addEnclosure(enclosureName, isDin ? "nema_box" : "rack_4post", space.id, isDin ? 0 : 24);
    }

    this.notifyWorkspaceChange();
    return normalized;
  },

  deleteLocation(locationName, fallbackName = this.UNASSIGNED) {
    const target = this.normalize(locationName);
    const fallback = this.normalize(fallbackName);
    const parsed = this.parse(target);

    if (parsed.enclosureId) {
      this.deleteEnclosure(parsed.enclosureId);
    }

    // Reassign orphan hardware in the project quote to Unassigned or fallback
    if (typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) {
      projectBOM.forEach(item => {
        if (this.normalize(item.closetName) === target || this.normalize(item.rackId) === target) {
          item.closetName = fallback;
          item.rackId = fallback;
          item.rackSlot = null;
        }
      });
    }

    this.notifyWorkspaceChange();
    return true;
  },

  // -----------------------------------------------------------
  // Equipment Aggregation & Telemetry per Enclosure / Location
  // -----------------------------------------------------------
  getEquipmentAtLocation(locationName) {
    if (typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) return [];
    const target = this.normalize(locationName);
    return projectBOM.filter(item => {
      const loc = this.normalize(item.closetName || item.rackId);
      return loc === target;
    });
  },

  getLocationTelemetry(locationName) {
    const items = this.getEquipmentAtLocation(locationName);
    let totalWatts = 0;
    let totalPoEBudget = 0;
    let totalPoEDelivered = 0;
    let totalRuOccupied = 0;

    items.forEach(item => {
      const qty = parseInt(item.qty, 10) || 1;
      const baseWatts = parseFloat(item.baseWatts) || 0;
      const poeBudget = parseFloat(item.poeBudget) || 0;
      const consumedPoE = parseFloat(item.consumedPoEWatts) || 0;
      const ru = parseInt(item.rackUnits, 10) || 0;

      totalWatts += (baseWatts + consumedPoE) * qty;
      totalPoEBudget += poeBudget * qty;
      totalPoEDelivered += consumedPoE * qty;
      totalRuOccupied += ru * qty;
    });

    const btuPerHour = Math.round(totalWatts * 3.412142);

    return {
      itemCount: items.length,
      totalWatts: Math.round(totalWatts),
      totalPoEBudget: Math.round(totalPoEBudget),
      totalPoEDelivered: Math.round(totalPoEDelivered),
      totalRuOccupied,
      btuPerHour
    };
  },

  // =========================================================================
  // UNIFIED WORKSPACE DISPATCHER (Cross-Modal Sync & Real-Time Recalculations)
  // =========================================================================
  notifyWorkspaceChange() {
    try {
      if (typeof saveBOMState === "function") saveBOMState();
      if (typeof updateBOMView === "function") updateBOMView();
      if (typeof runActiveFilter === "function") runActiveFilter();

      // 1. Live update Rack Visualizer if open
      const rackModal = document.getElementById("rackModal");
      if (rackModal && !rackModal.classList.contains("hidden")) {
        if (typeof renderRackVisualizer === "function") renderRackVisualizer();
      }

      // 2. Live update Topology if open
      const topoModal = document.getElementById("topologyModal");
      if (topoModal && !topoModal.classList.contains("hidden")) {
        if (typeof renderTopology === "function") renderTopology();
      }

      // 3. Live update Physical Layout Canvas if open
      const cableModal = document.getElementById("cableLayoutModal");
      if (cableModal && !cableModal.classList.contains("hidden")) {
        if (typeof syncBOMClosetsToFloors === "function") syncBOMClosetsToFloors();
        if (typeof recalculateCurrentFloorCables === "function") recalculateCurrentFloorCables();
        if (typeof renderCableCanvas === "function") renderCableCanvas();
        if (typeof renderSidebarTabContent === "function") renderSidebarTabContent();
      }

      // 4. Live update Facility Hierarchy Manager if open
      const facModal = document.getElementById("facilityModal");
      if (facModal && !facModal.classList.contains("hidden")) {
        if (typeof renderFacilityManager === "function") renderFacilityManager();
      }
    } catch (e) {
      console.error("Error in FacilityStore.notifyWorkspaceChange:", e);
    }
  }
};

// -----------------------------------------------------------
// FACILITY HIERARCHY MANAGER MODAL CONTROLLER
// -----------------------------------------------------------
let activeFacilityFloorId = "floor-1";
let activeFacilitySpaceId = "space-mdf";

function isFacilityModalVisible() {
  const modal = document.getElementById("facilityModal");
  return modal && !modal.classList.contains("hidden");
}

function toggleFacilityModal() {
  const modal = document.getElementById("facilityModal");
  if (!modal) return;

  if (modal.classList.contains("hidden")) {
    modal.classList.remove("hidden");
    const floors = FacilityStore.getFloors();
    if (!floors.some(f => f.id === activeFacilityFloorId)) {
      activeFacilityFloorId = floors[0] ? floors[0].id : "floor-1";
    }
    const spaces = FacilityStore.getSpaces(activeFacilityFloorId);
    if (!spaces.some(s => s.id === activeFacilitySpaceId)) {
      activeFacilitySpaceId = spaces[0] ? spaces[0].id : (FacilityStore.getSpaces()[0] ? FacilityStore.getSpaces()[0].id : "space-mdf");
    }
    renderFacilityManager();
    if (window.lucide) lucide.createIcons();
  } else {
    modal.classList.add("hidden");
  }
}

function renderFacilityManager() {
  const container = document.getElementById("facilityManagerContent");
  if (!container) return;

  const floors = FacilityStore.getFloors();
  const spaces = FacilityStore.getSpaces();
  const enclosures = FacilityStore.getEnclosures();
  const locations = FacilityStore.getLocations();

  // Selected floor & space
  const currentFloor = floors.find(f => f.id === activeFacilityFloorId) || floors[0];
  const currentFloorSpaces = spaces.filter(s => s.floorId === currentFloor.id);
  const currentSpace = currentFloorSpaces.find(s => s.id === activeFacilitySpaceId) || currentFloorSpaces[0] || spaces[0];
  const currentSpaceEncs = currentSpace ? enclosures.filter(e => e.spaceId === currentSpace.id) : [];

  // Facility-wide Rollups
  let totalProjectWatts = 0;
  let totalPoEWatts = 0;
  let totalEquipmentCount = 0;
  if (typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) {
    projectBOM.forEach(item => {
      const qty = parseInt(item.qty, 10) || 1;
      const bWatts = parseFloat(item.baseWatts) || 0;
      const pWatts = parseFloat(item.consumedPoEWatts) || 0;
      totalProjectWatts += (bWatts + pWatts) * qty;
      totalPoEWatts += pWatts * qty;
      totalEquipmentCount += qty;
    });
  }

  container.innerHTML = `
    <!-- Top Facility Telemetry Header Strip -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 pb-6 mb-6 border-b border-slate-800">
      <div class="bg-slate-950 p-3.5 rounded-xl border border-slate-850">
        <span class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Facility Structure</span>
        <div class="flex items-baseline gap-2">
          <span class="text-xl font-extrabold text-white font-mono">${floors.length}</span>
          <span class="text-xs text-slate-400">${floors.length === 1 ? 'Floor' : 'Floors'} &bull; ${spaces.length} Spaces</span>
        </div>
      </div>

      <div class="bg-slate-950 p-3.5 rounded-xl border border-slate-850">
        <span class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Racks & Enclosures</span>
        <div class="flex items-baseline gap-2">
          <span class="text-xl font-extrabold text-indigo-400 font-mono">${enclosures.length}</span>
          <span class="text-xs text-slate-400">Enclosures Active</span>
        </div>
      </div>

      <div class="bg-slate-950 p-3.5 rounded-xl border border-slate-850">
        <span class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Deployed Hardware</span>
        <div class="flex items-baseline gap-2">
          <span class="text-xl font-extrabold text-emerald-400 font-mono">${totalEquipmentCount}</span>
          <span class="text-xs text-slate-400">BOM Units Assigned</span>
        </div>
      </div>

      <div class="bg-slate-950 p-3.5 rounded-xl border border-slate-850">
        <span class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Total Electrical Load</span>
        <div class="flex items-baseline gap-2">
          <span class="text-xl font-extrabold text-amber-400 font-mono">${Math.round(totalProjectWatts)} W</span>
          <span class="text-xs text-slate-400">${Math.round(totalPoEWatts)}W PoE</span>
        </div>
      </div>
    </div>

    <!-- 3-Column Master Hierarchy View -->
    <div class="grid grid-cols-1 md:grid-cols-12 gap-5">
      
      <!-- Col 1: Floor Levels (3 cols) -->
      <div class="md:col-span-3 space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <i data-lucide="layers" class="w-3.5 h-3.5 text-sky-400"></i> Floor Levels (${floors.length})
          </span>
          <button onclick="promptAddFloor()" class="px-2 py-1 bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 rounded-lg text-[10px] font-bold transition-all">
            + Floor
          </button>
        </div>

        <div class="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
          ${floors.map(f => {
            const isSelected = f.id === currentFloor.id;
            const floorSpaces = spaces.filter(s => s.floorId === f.id);
            return `
              <div 
                onclick="selectFacilityFloor('${f.id}')"
                class="p-3 rounded-xl border ${isSelected ? 'border-sky-500 bg-sky-500/10' : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'} cursor-pointer transition-all flex items-center justify-between group"
              >
                <div class="min-w-0">
                  <span class="text-xs font-bold text-white block truncate">${escapeHTML(f.name)}</span>
                  <span class="text-[10px] text-slate-400 font-mono block mt-0.5">${floorSpaces.length} Spaces &bull; ${f.heightFt || 14}' Rise</span>
                </div>
                ${floors.length > 1 ? `
                  <button onclick="event.stopPropagation(); deleteFacilityFloor('${f.id}')" class="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-opacity">
                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                  </button>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Col 2: Spaces, Closets & Outdoor Poles (4 cols) -->
      <div class="md:col-span-4 space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <i data-lucide="door-open" class="w-3.5 h-3.5 text-indigo-400"></i> Telecom Spaces & Poles (${currentFloorSpaces.length})
          </span>
          <button onclick="promptAddSpace('${currentFloor.id}')" class="px-2 py-1 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-[10px] font-bold transition-all">
            + Space / Pole
          </button>
        </div>

        <div class="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
          ${currentFloorSpaces.length === 0 ? `
            <div class="text-center py-8 text-slate-500 text-xs bg-slate-950/60 rounded-xl border border-slate-850">
              No telecom spaces defined on this floor.
            </div>
          ` : currentFloorSpaces.map(s => {
            const isSelected = currentSpace && s.id === currentSpace.id;
            const spaceEncs = enclosures.filter(e => e.spaceId === s.id);
            const isPole = s.type === "pole" || s.name.toLowerCase().includes("pole");
            const isMdf = s.type === "mdf";
            return `
              <div 
                onclick="selectFacilitySpace('${s.id}')"
                class="p-3 rounded-xl border ${isSelected ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'} cursor-pointer transition-all flex items-center justify-between group"
              >
                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-white truncate">${escapeHTML(s.name)}</span>
                    <span class="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${isMdf ? 'border-rose-500/30 bg-rose-500/10 text-rose-300' : (isPole ? 'border-amber-500/30 bg-amber-500/10 text-amber-300' : 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300')}">
                      ${s.type.toUpperCase()}
                    </span>
                  </div>
                  <span class="text-[10px] text-slate-400 font-mono block mt-1">
                    ${spaceEncs.length} ${spaceEncs.length === 1 ? 'Enclosure' : 'Enclosures'}
                  </span>
                </div>
                ${spaces.length > 1 ? `
                  <button onclick="event.stopPropagation(); deleteFacilitySpace('${s.id}')" class="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-opacity">
                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                  </button>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Col 3: Enclosures & Racks with Live Telemetry (5 cols) -->
      <div class="md:col-span-5 space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <i data-lucide="server" class="w-3.5 h-3.5 text-emerald-400"></i> Mounting Hosts & Enclosures (${currentSpaceEncs.length})
          </span>
          ${currentSpace ? `
            <button onclick="promptAddEnclosure('${currentSpace.id}')" class="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-[10px] font-bold transition-all">
              + Host / Enclosure
            </button>
          ` : ''}
        </div>

        <div class="space-y-3 max-h-[500px] overflow-y-auto pr-1">
          ${currentSpaceEncs.length === 0 ? `
            <div class="text-center py-8 text-slate-500 text-xs bg-slate-950/60 rounded-xl border border-slate-850">
              No racks, security cabinets, or mounting hosts in this space yet.
            </div>
          ` : currentSpaceEncs.map(e => {
            const locName = `${currentSpace.name} • ${e.name}`;
            const telem = FacilityStore.getLocationTelemetry(locName);
            const hostType = e.hostType || (e.isDin ? "industrial_din" : "equipment_rack");
            const meta = MOUNTING_HOST_TYPES[hostType] || MOUNTING_HOST_TYPES.equipment_rack;

            return `
              <div class="p-3.5 rounded-xl border border-slate-800 bg-slate-950/90 space-y-2.5">
                <div class="flex items-start justify-between">
                  <div class="min-w-0">
                    <span class="text-xs font-bold text-white block truncate">${escapeHTML(e.name)}</span>
                    <div class="flex items-center gap-1.5 mt-0.5">
                      <span class="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border border-indigo-500/40 bg-indigo-500/10 text-indigo-300 flex items-center gap-1">
                        <i data-lucide="${meta.icon || 'server'}" class="w-2.5 h-2.5"></i> ${meta.badgeLabel}
                      </span>
                      <span class="text-[10px] font-mono text-slate-400">
                        ${hostType === 'equipment_rack' ? `${e.heightU || 24}U EIA &bull; Max ${e.maxWatts || 3000}W` :
                          (hostType === 'security_cabinet' ? `${e.subplateBays || 8} Subplate Bays &bull; ${e.dcVoltage || '12/24V'}` :
                          (hostType === 'industrial_din' ? `${e.dinRails || 2}x DIN (${e.railLengthMm || 350}mm)` :
                          (hostType === 'structural_mount' ? `${e.poleDiameterInches || 4}" Pole Mount` :
                          `${e.widthFt || 4}' x ${e.heightFt || 8}' Backboard`)))}
                      </span>
                    </div>
                  </div>
                  <div class="flex items-center gap-1 shrink-0">
                    <button 
                      onclick="openRackViewerFor('${locName}')"
                      class="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold rounded-lg border border-slate-700 transition-colors"
                      title="Inspect equipment in Visualizer"
                    >
                      Inspect
                    </button>
                    <button onclick="deleteFacilityEnclosure('${e.id}')" class="p-1 text-slate-500 hover:text-rose-400">
                      <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                    </button>
                  </div>
                </div>

                <!-- Telemetry Row -->
                <div class="grid grid-cols-4 gap-2 pt-2 border-t border-slate-850 text-[10px] font-mono">
                  <div class="bg-slate-900/80 p-1.5 rounded-lg border border-slate-800">
                    <span class="text-slate-500 block text-[9px]">Hardware:</span>
                    <span class="text-white font-bold">${telem.itemCount} Units</span>
                  </div>
                  <div class="bg-slate-900/80 p-1.5 rounded-lg border border-slate-800">
                    <span class="text-slate-500 block text-[9px]">
                      ${hostType === 'equipment_rack' ? 'RU Space:' :
                        (hostType === 'security_cabinet' ? 'Subplate Bays:' :
                        (hostType === 'industrial_din' ? 'DIN Rail:' :
                        (hostType === 'structural_mount' ? 'Mounting Points:' : 'Backboard:')))}
                    </span>
                    <span class="text-indigo-300 font-bold">
                      ${hostType === 'equipment_rack' ? `${telem.totalRuOccupied}/${e.heightU || 24}U` :
                        (hostType === 'security_cabinet' ? `${e.subplateBays || 8} Bays` :
                        (hostType === 'industrial_din' ? `${e.dinRails || 2}x Rails` :
                        (hostType === 'structural_mount' ? `${e.poleDiameterInches || 4}" Mast` : `${e.widthFt || 4}x${e.heightFt || 8} Ft`)))}
                    </span>
                  </div>
                  <div class="bg-slate-900/80 p-1.5 rounded-lg border border-slate-800">
                    <span class="text-slate-500 block text-[9px]">Power Draw:</span>
                    <span class="text-amber-400 font-bold">${telem.totalWatts} W</span>
                  </div>
                  <div class="bg-slate-900/80 p-1.5 rounded-lg border border-slate-800">
                    <span class="text-slate-500 block text-[9px]">Thermal Heat:</span>
                    <span class="text-rose-400 font-bold">${telem.btuPerHour.toLocaleString()} BTU</span>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

    </div>
  `;

  if (window.lucide) lucide.createIcons();
}

function selectFacilityFloor(floorId) {
  activeFacilityFloorId = floorId;
  const spaces = FacilityStore.getSpaces(floorId);
  activeFacilitySpaceId = spaces[0] ? spaces[0].id : null;
  renderFacilityManager();
}

function selectFacilitySpace(spaceId) {
  activeFacilitySpaceId = spaceId;
  renderFacilityManager();
}

function promptAddFloor() {
  const name = prompt("Enter Floor / Level Name (e.g. Level 2 - Corporate Offices, Campus Exterior):", `Level ${FacilityStore.getFloors().length + 1}`);
  if (!name || !name.trim()) return;
  const f = FacilityStore.addFloor(name.trim());
  activeFacilityFloorId = f.id;
  renderFacilityManager();
  if (typeof showToast === "function") showToast(`Added floor level "${name.trim()}"`);
}

function promptAddSpace(floorId) {
  const name = prompt("Enter Space / Room / Pole Name (e.g. IDF-2, Pole 2, East Gate Wallbox, Security Hub):", `IDF-${FacilityStore.getSpaces().length + 1}`);
  if (!name || !name.trim()) return;
  const lower = name.toLowerCase();
  const type = lower.includes("pole") ? "pole" : (lower.includes("wall") ? "wallbox" : (lower.includes("security") || lower.includes("access") ? "security_room" : "idf"));
  const s = FacilityStore.addSpace(name.trim(), type, floorId);
  activeFacilitySpaceId = s.id;
  renderFacilityManager();
  if (typeof showToast === "function") showToast(`Added space "${name.trim()}"`);
}

function promptAddEnclosure(spaceId) {
  const space = FacilityStore.getSpaces().find(s => s.id === spaceId);
  const isPole = space && (space.type === "pole" || space.name.toLowerCase().includes("pole"));
  const isSecurity = space && (space.type === "security_room" || space.name.toLowerCase().includes("security") || space.name.toLowerCase().includes("access"));

  const typeChoice = prompt(
    "Choose Mounting Host Type:\n1 = 19\" Equipment Rack (EIA RU)\n2 = Security & Control Cabinet (Altronix Trove / LSP)\n3 = Industrial Weatherproof NEMA Box (DIN Rail)\n4 = Structural Pole / Mast Mount\n5 = Architectural Backboard (Plywood)",
    isPole ? "3" : (isSecurity ? "2" : "1")
  );

  let hostType = "equipment_rack";
  let defaultName = `Rack-${FacilityStore.getEnclosures(spaceId).length + 1}`;
  let options = {};

  if (typeChoice === "2") {
    hostType = "security_cabinet";
    defaultName = `AC-Cabinet-${FacilityStore.getEnclosures(spaceId).length + 1}`;
    options.subplateBays = 8;
    options.dcVoltage = "dual_12_24";
  } else if (typeChoice === "3") {
    hostType = "industrial_din";
    defaultName = `NEMA-Box-${FacilityStore.getEnclosures(spaceId).length + 1}`;
    options.dinRails = 2;
    options.railLengthMm = 350;
  } else if (typeChoice === "4") {
    hostType = "structural_mount";
    defaultName = `Pole-${FacilityStore.getEnclosures(spaceId).length + 1}`;
    options.poleDiameterInches = 4;
  } else if (typeChoice === "5") {
    hostType = "architectural_backboard";
    defaultName = "Telecom-Backboard";
    options.widthFt = 4;
    options.heightFt = 8;
  }

  const name = prompt("Enter Name for this Mounting Host:", defaultName);
  if (!name || !name.trim()) return;

  if (hostType === "equipment_rack") {
    const heightStr = prompt("Enter Rack Height (e.g. 42, 24, 12, 6 RU):", "24");
    options.heightU = parseInt(heightStr, 10) || 24;
  }

  FacilityStore.addHost(name.trim(), hostType, spaceId, options);
  renderFacilityManager();
  if (typeof showToast === "function") showToast(`Added ${name.trim()} (${MOUNTING_HOST_TYPES[hostType]?.label || hostType})`);
}

function deleteFacilityFloor(floorId) {
  if (confirm("Delete this floor level? All associated spaces and equipment will be moved to Level 1.")) {
    FacilityStore.deleteFloor(floorId);
    activeFacilityFloorId = FacilityStore.getFloors()[0].id;
    renderFacilityManager();
  }
}

function deleteFacilitySpace(spaceId) {
  if (confirm("Delete this telecom space? All associated equipment will be unassigned.")) {
    FacilityStore.deleteSpace(spaceId);
    activeFacilitySpaceId = FacilityStore.getSpaces()[0].id;
    renderFacilityManager();
  }
}

function deleteFacilityEnclosure(enclosureId) {
  if (confirm("Delete this host / enclosure? Assigned hardware will be moved to Unassigned.")) {
    FacilityStore.deleteEnclosure(enclosureId);
    renderFacilityManager();
  }
}

function openRackViewerFor(locationName) {
  toggleFacilityModal(); // Close facility modal
  if (typeof switchActiveRackElevation === "function") {
    switchActiveRackElevation(locationName);
  }
  if (typeof toggleRackModal === "function") {
    const rackModal = document.getElementById("rackModal");
    if (!rackModal || rackModal.classList.contains("hidden")) {
      toggleRackModal();
    }
  }
}

// Window Compatibility Exports
if (typeof window !== "undefined") {
  window.MOUNTING_HOST_TYPES = MOUNTING_HOST_TYPES;
  window.EDGE_ENDPOINT_TYPES = EDGE_ENDPOINT_TYPES;
  window.FacilityStore = FacilityStore;
  window.toggleFacilityModal = toggleFacilityModal;
  window.renderFacilityManager = renderFacilityManager;
  window.selectFacilityFloor = selectFacilityFloor;
  window.selectFacilitySpace = selectFacilitySpace;
  window.promptAddFloor = promptAddFloor;
  window.promptAddSpace = promptAddSpace;
  window.promptAddEnclosure = promptAddEnclosure;
  window.deleteFacilityFloor = deleteFacilityFloor;
  window.deleteFacilitySpace = deleteFacilitySpace;
  window.deleteFacilityEnclosure = deleteFacilityEnclosure;
  window.openRackViewerFor = openRackViewerFor;
}