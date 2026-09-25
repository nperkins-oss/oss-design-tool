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
    { id: "floor-1", name: "Main Floor", levelIndex: 1, heightFt: 14, scaleFt: 25, slackFt: 15, slabFt: 10 },
    { id: "floor-exterior", name: "Exterior", levelIndex: 0, heightFt: 0, scaleFt: 50, slackFt: 25, slabFt: 0 }
  ],

  defaultSpaces: [
    { id: "space-mdf", name: "MDF", floorId: "floor-1", type: "mdf", description: "Main Equipment Room / Server Room" },
    { id: "space-exterior-pole1", name: "Pole 1", floorId: "floor-exterior", type: "pole", description: "Perimeter Security & Wireless Pole", poleHeightFt: 25, poleDiameterInches: 4 }
  ],

  defaultEnclosures: [
    { id: "enc-mdf-rack1", spaceId: "space-mdf", name: "Rack-1", hostType: "equipment_rack", type: "rack_4post", heightU: 42, maxWatts: 4500, pduCount: 2, isDin: false, depthInches: 36 },
    { id: "enc-pole1-nema", spaceId: "space-exterior-pole1", name: "NEMA-Box", hostType: "industrial_din", type: "nema_box", mountingMethod: "pole", mountHeightFt: 10, heightU: 0, isDin: true, maxWatts: 800, pduCount: 1, dinRails: 2, railLengthMm: 350 }
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
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Normalize old default name if present
          parsed.forEach(f => {
            if (f.name === "Level 1 - Main Floor") f.name = "Main Floor";
          });
          // Ensure Exterior floor exists if only Level 1 was stored
          if (!parsed.some(f => f.name.toLowerCase().includes("exterior"))) {
            parsed.push({ id: "floor-exterior", name: "Exterior", levelIndex: 0, heightFt: 0, scaleFt: 50, slackFt: 25, slabFt: 0 });
            this.saveFloors(parsed);
          }
          return parsed;
        }
      }
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
    const cleanName = (name || `Level ${list.length + 1}`).trim();
    if (list.some(f => f.name.trim().toLowerCase() === cleanName.toLowerCase())) {
      if (typeof showToast === "function") showToast(`A floor named "${cleanName}" already exists.`);
      return null;
    }
    const id = `floor-${Date.now()}`;
    const newFloor = {
      id,
      name: cleanName,
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

  updateFloor(floorId, updates = {}) {
    const list = this.getFloors();
    const floor = list.find(f => f.id === floorId);
    if (!floor) return false;
    if (updates.name) {
      const cleanName = updates.name.trim();
      if (list.some(f => f.id !== floorId && f.name.trim().toLowerCase() === cleanName.toLowerCase())) {
        if (typeof showToast === "function") showToast(`A floor named "${cleanName}" already exists.`);
        return false;
      }
      updates.name = cleanName;
    }
    Object.assign(floor, updates);
    this.saveFloors(list);
    this.notifyWorkspaceChange();
    return floor;
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
    // Ensure Exterior pole exists if absent (Requirement 6)
    if (!list.some(s => s.type === "pole" || (s.name && s.name.toLowerCase().includes("pole")))) {
      list.push({ id: "space-exterior-pole1", name: "Pole 1", floorId: "floor-exterior", type: "pole", description: "Perimeter Security & Wireless Pole", poleHeightFt: 25, poleDiameterInches: 4 });
      this.saveSpaces(list);
    }
    // Ensure all pole spaces have poleHeightFt and poleDiameterInches
    list.forEach(s => {
      if (s.type === "pole" || (s.name && s.name.toLowerCase().includes("pole"))) {
        s.type = "pole";
        if (!s.poleHeightFt) s.poleHeightFt = 25;
        if (!s.poleDiameterInches) s.poleDiameterInches = 4;
      }
    });
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
    const cleanName = name.trim();
    const list = this.getSpaces();
    // Validate uniqueness on this floor (Requirement 4)
    if (list.some(s => s.floorId === floorId && s.name.trim().toLowerCase() === cleanName.toLowerCase())) {
      if (typeof showToast === "function") showToast(`A space named "${cleanName}" already exists on this floor.`);
      return null;
    }
    const id = `space-${Date.now()}`;
    const isPole = type === "pole" || cleanName.toLowerCase().includes("pole");
    const newSpace = {
      id,
      name: cleanName,
      type: isPole ? "pole" : (type || "idf"),
      floorId: floorId || "floor-1",
      description: options.description || "",
      poleHeightFt: isPole ? (options.poleHeightFt || 25) : null,
      poleDiameterInches: isPole ? (options.poleDiameterInches || 4) : null
    };
    list.push(newSpace);
    this.saveSpaces(list);

    // Create default host for this space (e.g. Rack-1, NEMA-Box, or Security Cabinet)
    const isOutdoor = newSpace.type === "pole" || newSpace.type === "exterior";
    const isAccess = newSpace.type === "electrical_room" || newSpace.type === "security_room";
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
    } else if (newSpace.type === "wallbox") {
      hostName = "Wallbox";
      hostType = "equipment_rack";
      heightU = 12;
    }

    this.addHost(hostName, hostType, id, { 
      heightU,
      mountingMethod: isOutdoor ? "pole" : "wall",
      mountHeightFt: isOutdoor ? 10 : null
    });
    this.notifyWorkspaceChange();
    return newSpace;
  },

  updateSpace(spaceId, updates = {}) {
    const list = this.getSpaces();
    const space = list.find(s => s.id === spaceId);
    if (!space) return false;
    if (updates.name) {
      const cleanName = updates.name.trim();
      const floorId = updates.floorId || space.floorId;
      if (list.some(s => s.id !== spaceId && s.floorId === floorId && s.name.trim().toLowerCase() === cleanName.toLowerCase())) {
        if (typeof showToast === "function") showToast(`A space named "${cleanName}" already exists on this floor.`);
        return false;
      }
      updates.name = cleanName;
    }
    Object.assign(space, updates);
    this.saveSpaces(list);
    this.notifyWorkspaceChange();
    return space;
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

    // Ensure NEMA-Box exists on Pole 1 if absent (Requirement 6)
    if (!list.some(e => e.spaceId === "space-exterior-pole1")) {
      list.push({ id: "enc-pole1-nema", spaceId: "space-exterior-pole1", name: "NEMA-Box", hostType: "industrial_din", type: "nema_box", mountingMethod: "pole", mountHeightFt: 10, heightU: 0, isDin: true, maxWatts: 800, pduCount: 1, dinRails: 2, railLengthMm: 350 });
      this.saveEnclosures(list);
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
    const cleanName = name.trim();
    const list = this.getEnclosures();
    // Validate uniqueness in this space (Requirement 4)
    if (list.some(e => e.spaceId === spaceId && e.name.trim().toLowerCase() === cleanName.toLowerCase())) {
      if (typeof showToast === "function") showToast(`An enclosure named "${cleanName}" already exists in this space.`);
      return null;
    }
    const id = `enc-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    
    // Resolve hostType from options, type, or name context
    let hostType = options.hostType;
    if (!hostType) {
      if (type === "nema_box" || type === "din_rail" || cleanName.toLowerCase().includes("nema") || cleanName.toLowerCase().includes("din")) {
        hostType = "industrial_din";
      } else if (type === "wall_cabinet" || cleanName.toLowerCase().includes("panel") || cleanName.toLowerCase().includes("trove") || cleanName.toLowerCase().includes("ac-")) {
        hostType = "security_cabinet";
      } else if (type === "pole" || cleanName.toLowerCase().includes("pole")) {
        hostType = "structural_mount";
      } else if (type === "backboard" || cleanName.toLowerCase().includes("backboard") || cleanName.toLowerCase().includes("plywood")) {
        hostType = "architectural_backboard";
      } else {
        hostType = "equipment_rack";
      }
    }

    const isDin = hostType === "industrial_din" || type === "din_rail" || type === "nema_box";
    const newEnc = {
      id,
      spaceId: spaceId || "space-mdf",
      name: cleanName,
      hostType,
      type: type || (isDin ? "nema_box" : "rack_4post"),
      heightU: parseInt(heightU, 10) || (hostType === "equipment_rack" ? 24 : 0),
      isDin,
      maxWatts: parseInt(maxWatts, 10) || (hostType === "equipment_rack" ? 3000 : (hostType === "security_cabinet" ? 1200 : 800)),
      pduCount: hostType === "equipment_rack" ? 2 : 1,
      mountingMethod: options.mountingMethod || (hostType === "industrial_din" ? "wall" : null),
      mountHeightFt: options.mountHeightFt || null,
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
    if (updates.name) {
      const cleanName = updates.name.trim();
      const spaceId = updates.spaceId || host.spaceId;
      if (list.some(e => e.id !== hostId && e.spaceId === spaceId && e.name.trim().toLowerCase() === cleanName.toLowerCase())) {
        if (typeof showToast === "function") showToast(`An enclosure named "${cleanName}" already exists in this space.`);
        return false;
      }
      updates.name = cleanName;
    }
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

    // Check if trimmed matches an existing space name
    const spaces = this.getSpaces();
    const matchedSpace = spaces.find(s => s.name.toLowerCase() === trimmed.toLowerCase());
    if (matchedSpace) {
      if (matchedSpace.type === "pole") {
        return `${matchedSpace.name} • Pole Mount`;
      }
      return `${matchedSpace.name} • Field`;
    }

    // Intelligent suffixing based on naming context
    const lower = trimmed.toLowerCase();
    if (lower.includes("pole") || lower.includes("exterior")) return `${trimmed} • Pole Mount`;
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
        isBackboard: false,
        isField: false
      };
    }
    const parts = normalized.split(" • ");
    const spaceName = parts[0];
    const hostName = parts[1] || "Field";

    const spaces = this.getSpaces();
    const space = spaces.find(s => s.name.toLowerCase() === spaceName.toLowerCase());
    const encs = this.getEnclosures(space ? space.id : null);
    const enc = encs.find(e => e.name.toLowerCase() === hostName.toLowerCase());

    const isFieldHardware = hostName.toLowerCase() === "field" || hostName.toLowerCase() === "space" || hostName.toLowerCase() === "field hardware" || hostName.toLowerCase() === "unenclosed";
    const isStructuralPole = (hostName.toLowerCase() === "pole mount") || 
      (space && space.type === "pole" && (hostName.toLowerCase().includes("pole") || hostName === "Pole Mount"));

    const hostType = isFieldHardware ? "field" : (enc ? (enc.hostType || (enc.isDin ? "industrial_din" : "equipment_rack")) : (
      isStructuralPole ? "structural_mount" :
      hostName.toLowerCase().includes("nema") || hostName.toLowerCase().includes("din") ? "industrial_din" :
      hostName.toLowerCase().includes("panel") || hostName.toLowerCase().includes("trove") || hostName.toLowerCase().includes("ac-") ? "security_cabinet" :
      hostName.toLowerCase().includes("backboard") ? "architectural_backboard" : "equipment_rack"
    ));

    const isPoleSpace = space && (space.type === "pole" || space.name.toLowerCase().includes("pole"));
    const poleHeightFt = isPoleSpace ? (space.poleHeightFt || 25) : ((enc && enc.poleHeightFt) ? enc.poleHeightFt : 25);
    const poleDiameterInches = isPoleSpace ? (space.poleDiameterInches || 4) : ((enc && enc.poleDiameterInches) ? enc.poleDiameterInches : 4);
    const mountingMethod = enc ? (enc.mountingMethod || (isPoleSpace ? "pole" : "wall")) : (isPoleSpace ? "pole" : "wall");
    const mountHeightFt = enc ? (enc.mountHeightFt || (isPoleSpace ? 10 : null)) : (isPoleSpace ? 10 : null);

    return {
      fullName: normalized,
      space: spaceName,
      enclosure: hostName,       // backward compat
      hostName: hostName,        // clean new naming
      spaceId: space ? space.id : null,
      enclosureId: enc ? enc.id : null, // backward compat
      hostId: enc ? enc.id : null,      // clean new naming
      floorId: space ? space.floorId : "floor-1",
      heightU: enc ? enc.heightU : (hostType === "equipment_rack" ? 24 : 0),
      isDin: hostType === "industrial_din" || (enc && enc.isDin),
      hostType,
      poleHeightFt,
      poleDiameterInches,
      mountingMethod,
      mountHeightFt,
      hostConfig: enc ? (enc.config || {}) : {},
      isRack: hostType === "equipment_rack",
      isSecurityCabinet: hostType === "security_cabinet",
      isStructuralMount: hostType === "structural_mount",
      isBackboard: hostType === "architectural_backboard",
      isField: isFieldHardware,
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
      const isPole = s.type === "pole" || s.name.toLowerCase().includes("pole");

      // Space-level field hardware location (unenclosed devices: PtP radios, cameras, sensors, doors)
      list.push({
        id: `loc-space-${s.id}`,
        name: `${s.name} • Field`,
        displayName: `${s.name} (Space / Field)`,
        space: s.name,
        spaceId: s.id,
        enclosure: "Field",
        hostName: "Field Hardware",
        enclosureId: null,
        hostId: null,
        hostType: "field",
        isSpace: true,
        floorId: s.floorId,
        floorName: floor ? floor.name : "Level 1",
        heightU: 0,
        isDin: false
      });

      if (isPole) {
        // Structural Pole Mounting Host at the Space level
        list.push({
          id: `loc-${s.id}-pole`,
          name: `${s.name} • Pole Mount`,
          displayName: `${s.name} • Pole Mount`,
          space: s.name,
          spaceId: s.id,
          enclosure: "Pole Mount",
          hostName: "Pole Mount",
          enclosureId: null,
          hostId: null,
          hostType: "structural_mount",
          floorId: s.floorId,
          floorName: floor ? floor.name : "Exterior",
          heightU: 0,
          isDin: false,
          poleHeightFt: s.poleHeightFt || 25,
          poleDiameterInches: s.poleDiameterInches || 4
        });
      }

      if (spaceEncs.length === 0) {
        if (!isPole) {
          // Fallback default enclosure if none exists
          list.push({
            id: `loc-${s.id}-default`,
            name: `${s.name} • Rack-1`,
            displayName: `${s.name} • Rack-1`,
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
        }
      } else {
        spaceEncs.forEach(e => {
          const hostType = e.hostType || (e.isDin ? "industrial_din" : (isPole ? "industrial_din" : "equipment_rack"));
          list.push({
            id: `loc-${s.id}-${e.id}`,
            name: `${s.name} • ${e.name}`,
            displayName: `${s.name} • ${e.name}`,
            space: s.name,
            spaceId: s.id,
            enclosure: e.name,
            hostName: e.name,
            enclosureId: e.id,
            hostId: e.id,
            hostType,
            mountingMethod: e.mountingMethod || (isPole ? "pole" : "wall"),
            mountHeightFt: e.mountHeightFt || (isPole ? 10 : null),
            parentPoleHeightFt: isPole ? (s.poleHeightFt || 25) : null,
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
            displayName: parsed.fullName.endsWith(" • Field") ? `${parsed.space} (Space / Field)` : parsed.fullName,
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

  getLocationGroups(includeUnassigned = true) {
    const locs = this.getLocations();
    const spaces = [];
    const enclosures = [];

    locs.forEach(l => {
      if (l.isSpace || l.hostType === "field") {
        if (!spaces.some(s => s.name === l.name)) {
          spaces.push(l);
        }
      } else {
        if (!enclosures.some(e => e.name === l.name)) {
          enclosures.push(l);
        }
      }
    });

    return {
      unassigned: includeUnassigned ? this.UNASSIGNED : null,
      spaces,
      enclosures
    };
  },

  addLocation(rawInput, floorId = "floor-1") {
    const normalized = this.normalize(rawInput);
    if (normalized === this.UNASSIGNED) return this.UNASSIGNED;

    const parts = normalized.split(" • ");
    const spaceName = parts[0];
    const enclosureName = parts[1];

    let spaces = this.getSpaces();
    let space = spaces.find(s => s.name.toLowerCase() === spaceName.toLowerCase());
    if (!space) {
      const isPole = spaceName.toLowerCase().includes("pole");
      const isWall = spaceName.toLowerCase().includes("wall");
      space = this.addSpace(spaceName, isPole ? "pole" : (isWall ? "wallbox" : "idf"), floorId);
    }

    if (enclosureName && enclosureName.toLowerCase() !== "field" && enclosureName.toLowerCase() !== "space") {
      let encs = this.getEnclosures(space.id);
      let enc = encs.find(e => e.name.toLowerCase() === enclosureName.toLowerCase());
      if (!enc) {
        const isDin = enclosureName.toLowerCase().includes("nema") || enclosureName.toLowerCase().includes("din");
        this.addEnclosure(enclosureName, isDin ? "nema_box" : "rack_4post", space.id, isDin ? 0 : 24);
      }
      this.notifyWorkspaceChange();
      return `${space.name} • ${enclosureName}`;
    }

    this.notifyWorkspaceChange();
    return `${space.name} • Field`;
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
      const units = (item.stackedUnits && item.stackedUnits >= 2) ? item.stackedUnits : 1;
      const baseWatts = (parseFloat(item.baseWatts) || 0) * units;
      const poeBudget = (parseFloat(item.poeBudget) || 0) * units;
      const consumedPoE = parseFloat(item.consumedPoEWatts) || 0;
      const ru = (parseInt(item.rackUnits, 10) || 0) * units;

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

      // 1. Live update Facility Modal (Visualizer or Hierarchy)
      const facModal = document.getElementById("facilityModal");
      if (facModal && !facModal.classList.contains("hidden")) {
        if (typeof facilityActiveView !== "undefined" && facilityActiveView === "visualizer") {
          if (typeof renderRackVisualizer === "function") renderRackVisualizer();
        } else {
          if (typeof renderFacilityManager === "function") renderFacilityManager();
        }
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
    } catch (e) {
      console.error("Error in FacilityStore.notifyWorkspaceChange:", e);
    }
  }
};

// -----------------------------------------------------------
// FACILITY HIERARCHY MANAGER MODAL CONTROLLER
// -----------------------------------------------------------
let activeFacilityFloorId = "floor-main";
let activeFacilitySpaceId = "space-mdf";
let facilityActiveForm = null; // null | "add_floor" | "add_space" | "add_host"
let facilityNewHostType = "equipment_rack";
let facilityActiveView = "hierarchy"; // "hierarchy" | "visualizer"
let previousFacilityFloorId = null;
let previousFacilitySpaceId = null;

function isFacilityModalVisible() {
  const modal = document.getElementById("facilityModal");
  return modal && !modal.classList.contains("hidden");
}

function syncVisualizerBreadcrumbs() {
  const currentHost = (typeof activeRackId !== "undefined") ? activeRackId : "MDF • Rack-1";
  const parsed = FacilityStore.parse(currentHost);
  const floors = FacilityStore.getFloors();
  const spaces = FacilityStore.getSpaces();

  let floorObj = null;
  let spaceObj = null;

  if (parsed.spaceId) {
    spaceObj = spaces.find(s => s.id === parsed.spaceId);
  }
  if (!spaceObj && parsed.space) {
    spaceObj = spaces.find(s => s.name.toLowerCase() === parsed.space.toLowerCase());
  }

  if (spaceObj) {
    floorObj = floors.find(f => f.id === spaceObj.floorId);
  }
  if (!floorObj && parsed.floorId) {
    floorObj = floors.find(f => f.id === parsed.floorId);
  }
  if (!floorObj && floors.length > 0) {
    floorObj = floors[0];
  }

  const floorEl = document.getElementById("facilityBreadcrumbFloor");
  const spaceEl = document.getElementById("facilityBreadcrumbSpace");
  const hostEl = document.getElementById("facilityBreadcrumbHost");
  const badgeEl = document.getElementById("hostTypeBadge");
  const subtitleEl = document.getElementById("hostModalSubtitle");

  const floorName = floorObj ? floorObj.name : "Facility";
  const spaceName = spaceObj ? spaceObj.name : (parsed.space || "Telecom Space");
  const hostName = parsed.hostName || "Enclosure";

  if (floorEl) floorEl.textContent = floorName;
  if (spaceEl) spaceEl.textContent = spaceName;
  if (hostEl) hostEl.textContent = hostName;

  const hostTypeDef = FacilityStore.HOST_TYPES[parsed.hostType] || FacilityStore.HOST_TYPES.equipment_rack;
  if (badgeEl) {
    badgeEl.textContent = hostTypeDef.label;
    if (typeof getHostBadgeStyles === "function") {
      badgeEl.className = `text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${getHostBadgeStyles(parsed.hostType)} ml-1`;
    }
  }
  if (subtitleEl) {
    subtitleEl.textContent = `${hostTypeDef.label} • ${spaceName} • Level ${floorObj?.levelIndex || 1} (${floorName})`;
  }
}

function switchFacilityView(viewName, targetLocName) {
  facilityActiveView = viewName === "visualizer" ? "visualizer" : "hierarchy";
  const hierarchyView = document.getElementById("facilityHierarchyView");
  const visualizerView = document.getElementById("facilityVisualizerView");
  const titleHierarchy = document.getElementById("facilityTitleHierarchy");
  const titleVisualizer = document.getElementById("facilityTitleVisualizer");
  const tabBtnHierarchy = document.getElementById("facilityTabBtnHierarchy");
  const tabBtnVisualizer = document.getElementById("facilityTabBtnVisualizer");
  const visualizerControls = document.getElementById("facilityVisualizerControls");

  if (facilityActiveView === "visualizer") {
    // Record current position for smooth back button navigation
    if (activeFacilityFloorId) previousFacilityFloorId = activeFacilityFloorId;
    if (activeFacilitySpaceId) previousFacilitySpaceId = activeFacilitySpaceId;

    if (hierarchyView) hierarchyView.classList.add("hidden");
    if (visualizerView) visualizerView.classList.remove("hidden");
    if (titleHierarchy) titleHierarchy.classList.add("hidden");
    if (titleVisualizer) titleVisualizer.classList.remove("hidden");
    if (visualizerControls) visualizerControls.classList.remove("hidden");

    if (tabBtnHierarchy) {
      tabBtnHierarchy.className = "px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 transition-all flex items-center gap-1.5";
    }
    if (tabBtnVisualizer) {
      tabBtnVisualizer.className = "px-3 py-1.5 rounded-lg text-white bg-indigo-600 transition-all flex items-center gap-1.5 shadow";
    }

    if (targetLocName && typeof switchActiveRackElevation === "function") {
      switchActiveRackElevation(targetLocName);
    } else {
      if (typeof syncRackSelectorOptions === "function") syncRackSelectorOptions();
      if (typeof loadRackSettings === "function") loadRackSettings();
      if (typeof renderRackVisualizer === "function") renderRackVisualizer();
    }
    syncVisualizerBreadcrumbs();
  } else {
    // Return to hierarchy & spaces
    if (hierarchyView) hierarchyView.classList.remove("hidden");
    if (visualizerView) visualizerView.classList.add("hidden");
    if (titleHierarchy) titleHierarchy.classList.remove("hidden");
    if (titleVisualizer) titleVisualizer.classList.add("hidden");
    if (visualizerControls) visualizerControls.classList.add("hidden");

    if (tabBtnHierarchy) {
      tabBtnHierarchy.className = "px-3 py-1.5 rounded-lg text-white bg-sky-600 transition-all flex items-center gap-1.5 shadow";
    }
    if (tabBtnVisualizer) {
      tabBtnVisualizer.className = "px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 transition-all flex items-center gap-1.5";
    }

    // Restore previous floor and space if set
    const floors = FacilityStore.getFloors();
    if (previousFacilityFloorId && floors.some(f => f.id === previousFacilityFloorId)) {
      activeFacilityFloorId = previousFacilityFloorId;
    }
    const spaces = FacilityStore.getSpaces();
    if (previousFacilitySpaceId && spaces.some(s => s.id === previousFacilitySpaceId)) {
      activeFacilitySpaceId = previousFacilitySpaceId;
    }

    renderFacilityManager();
  }

  if (window.lucide) lucide.createIcons();
}

function handleFacilityModalCloseOrBack() {
  if (facilityActiveView === "visualizer") {
    // Navigate back to spaces view without closing the modal
    switchFacilityView("hierarchy");
  } else {
    const modal = document.getElementById("facilityModal");
    if (modal) modal.classList.add("hidden");
  }
}

function toggleFacilityModal() {
  const modal = document.getElementById("facilityModal");
  if (!modal) return;

  if (modal.classList.contains("hidden")) {
    modal.classList.remove("hidden");
    facilityActiveForm = null;
    const floors = FacilityStore.getFloors();
    if (!floors.some(f => f.id === activeFacilityFloorId)) {
      activeFacilityFloorId = floors[0] ? floors[0].id : "floor-main";
    }
    const spaces = FacilityStore.getSpaces(activeFacilityFloorId);
    if (!spaces.some(s => s.id === activeFacilitySpaceId)) {
      activeFacilitySpaceId = spaces[0] ? spaces[0].id : (FacilityStore.getSpaces()[0] ? FacilityStore.getSpaces()[0].id : "space-mdf");
    }
    switchFacilityView("hierarchy");
  } else {
    modal.classList.add("hidden");
    facilityActiveForm = null;
  }
}

function openFacilityAddForm(formType) {
  facilityActiveForm = formType;
  renderFacilityManager();
  // Focus the first input of the open form
  setTimeout(() => {
    if (formType === "add_floor") {
      const el = document.getElementById("inlineFloorName");
      if (el) el.focus();
    } else if (formType === "add_space") {
      const el = document.getElementById("inlineSpaceName");
      if (el) el.focus();
    } else if (formType === "add_host") {
      const el = document.getElementById("inlineHostName");
      if (el) el.focus();
    }
  }, 50);
}

function closeFacilityAddForm() {
  facilityActiveForm = null;
  renderFacilityManager();
}

function setFacilityNewHostType(type) {
  facilityNewHostType = type;
  renderFacilityManager();
}

function saveInlineFloor() {
  const nameInput = document.getElementById("inlineFloorName");
  const heightInput = document.getElementById("inlineFloorHeight");
  const errEl = document.getElementById("inlineFloorError");
  const name = nameInput ? nameInput.value.trim() : "";
  const height = heightInput ? parseInt(heightInput.value, 10) : 14;

  if (errEl) errEl.classList.add("hidden");

  if (!name) {
    if (errEl) {
      errEl.textContent = "Please enter a floor name.";
      errEl.classList.remove("hidden");
    } else if (typeof showToast === "function") {
      showToast("Please enter a floor name");
    }
    return;
  }

  const floors = FacilityStore.getFloors();
  if (floors.some(f => f.name.trim().toLowerCase() === name.toLowerCase())) {
    if (errEl) {
      errEl.textContent = `A floor named "${name}" already exists.`;
      errEl.classList.remove("hidden");
    } else if (typeof showToast === "function") {
      showToast(`A floor named "${name}" already exists.`);
    }
    return;
  }

  const f = FacilityStore.addFloor(name, height || 14);
  if (!f) return;
  activeFacilityFloorId = f.id;
  facilityActiveForm = null;
  renderFacilityManager();
  if (typeof showToast === "function") showToast(`Added floor level "${name}"`);
}

function saveInlineSpace() {
  const nameInput = document.getElementById("inlineSpaceName");
  const typeSelect = document.getElementById("inlineSpaceType");
  const pHeightInput = document.getElementById("inlineSpacePoleHeight");
  const errEl = document.getElementById("inlineSpaceError");
  const name = nameInput ? nameInput.value.trim() : "";
  const type = typeSelect ? typeSelect.value : "idf";

  if (errEl) errEl.classList.add("hidden");

  if (!name) {
    if (errEl) {
      errEl.textContent = "Please enter a space name.";
      errEl.classList.remove("hidden");
    } else if (typeof showToast === "function") {
      showToast("Please enter a space name");
    }
    return;
  }

  const spaces = FacilityStore.getSpaces(activeFacilityFloorId);
  if (spaces.some(s => s.name.trim().toLowerCase() === name.toLowerCase())) {
    if (errEl) {
      errEl.textContent = `A space named "${name}" already exists in this area.`;
      errEl.classList.remove("hidden");
    } else if (typeof showToast === "function") {
      showToast(`A space named "${name}" already exists in this area.`);
    }
    return;
  }

  const poleHeightFt = pHeightInput ? parseInt(pHeightInput.value, 10) : 25;
  const s = FacilityStore.addSpace(name, type, activeFacilityFloorId, { poleHeightFt, poleDiameterInches: 4 });
  if (!s) return;
  activeFacilitySpaceId = s.id;
  facilityActiveForm = null;
  renderFacilityManager();

  const newLocKey = `${s.name} • Field`;
  const pendingCtx = (typeof getPendingFacilityLocationContext === "function") ? getPendingFacilityLocationContext() : null;
  if (pendingCtx) {
    if (typeof clearPendingFacilityLocationContext === "function") clearPendingFacilityLocationContext();

    if (pendingCtx.selectEl) {
      const opt = document.createElement("option");
      opt.value = newLocKey;
      opt.text = `${s.name} (Space / Field)`;
      pendingCtx.selectEl.insertBefore(opt, pendingCtx.selectEl.lastElementChild);
      pendingCtx.selectEl.value = newLocKey;
      pendingCtx.selectEl.setAttribute("data-previous-val", newLocKey);
    }
    if (typeof pendingCtx.callback === "function") {
      pendingCtx.callback(newLocKey);
    }
    if (typeof showToast === "function") {
      showToast(`Created space "${name}" and assigned equipment!`);
    }
  } else {
    if (typeof showToast === "function") showToast(`Added space "${name}"`);
  }
}

function saveInlineHost() {
  const typeSelect = document.getElementById("inlineHostType");
  const nameInput = document.getElementById("inlineHostName");
  const errEl = document.getElementById("inlineHostError");
  const hostType = typeSelect ? typeSelect.value : facilityNewHostType;
  const name = nameInput ? nameInput.value.trim() : "";

  if (errEl) errEl.classList.add("hidden");

  if (!name) {
    if (errEl) {
      errEl.textContent = "Please enter an enclosure name.";
      errEl.classList.remove("hidden");
    } else if (typeof showToast === "function") {
      showToast("Please enter an enclosure name");
    }
    return;
  }

  const encs = FacilityStore.getEnclosures(activeFacilitySpaceId);
  if (encs.some(e => e.name.trim().toLowerCase() === name.toLowerCase())) {
    if (errEl) {
      errEl.textContent = `An enclosure named "${name}" already exists in this space.`;
      errEl.classList.remove("hidden");
    } else if (typeof showToast === "function") {
      showToast(`An enclosure named "${name}" already exists in this space.`);
    }
    return;
  }

  const currentSpace = FacilityStore.getSpaces().find(s => s.id === activeFacilitySpaceId);
  const isPoleSpace = currentSpace && currentSpace.type === "pole";

  const options = {};
  if (isPoleSpace) {
    options.mountingMethod = "pole";
    const htSelect = document.getElementById("inlineHostMountHeight");
    options.mountHeightFt = htSelect ? parseInt(htSelect.value, 10) : 10;
  }

  if (hostType === "equipment_rack") {
    const hSelect = document.getElementById("inlineRackHeight");
    options.heightU = hSelect ? parseInt(hSelect.value, 10) : 24;
    const dSelect = document.getElementById("inlineRackDepth");
    options.depthInches = dSelect ? parseInt(dSelect.value, 10) : 36;
  } else if (hostType === "security_cabinet") {
    const bSelect = document.getElementById("inlineCabinetBays");
    options.subplateBays = bSelect ? parseInt(bSelect.value, 10) : 8;
    const vSelect = document.getElementById("inlineCabinetVoltage");
    options.dcVoltage = vSelect ? vSelect.value : "dual_12_24";
  } else if (hostType === "industrial_din") {
    const rSelect = document.getElementById("inlineDinRails");
    options.dinRails = rSelect ? parseInt(rSelect.value, 10) : 2;
    const mSelect = document.getElementById("inlineDinMounting");
    options.mountingMethod = isPoleSpace ? "pole" : (mSelect ? mSelect.value : "wall");
    options.railLengthMm = 350;
  } else if (hostType === "architectural_backboard") {
    const wSelect = document.getElementById("inlineBackboardSize");
    options.widthFt = wSelect ? parseInt(wSelect.value, 10) : 4;
    options.heightFt = 8;
  }

  FacilityStore.addHost(name, hostType, activeFacilitySpaceId, options);
  facilityActiveForm = null;
  renderFacilityManager();

  const hostLocKey = currentSpace ? `${currentSpace.name} • ${name}` : name;
  const pendingCtx = (typeof getPendingFacilityLocationContext === "function") ? getPendingFacilityLocationContext() : null;
  if (pendingCtx) {
    if (typeof clearPendingFacilityLocationContext === "function") clearPendingFacilityLocationContext();

    if (pendingCtx.selectEl) {
      const opt = document.createElement("option");
      opt.value = hostLocKey;
      opt.text = hostLocKey;
      pendingCtx.selectEl.insertBefore(opt, pendingCtx.selectEl.lastElementChild);
      pendingCtx.selectEl.value = hostLocKey;
      pendingCtx.selectEl.setAttribute("data-previous-val", hostLocKey);
    }
    if (typeof pendingCtx.callback === "function") {
      pendingCtx.callback(hostLocKey);
    }
    if (typeof showToast === "function") {
      showToast(`Created enclosure "${name}" and assigned equipment!`);
    }
  } else {
    if (typeof showToast === "function") {
      showToast(`Added ${name} (${FacilityStore.HOST_TYPES[hostType]?.label || hostType})`);
    }
  }
}

function updateSpacePoleHeight(spaceId, heightFt) {
  FacilityStore.updateSpace(spaceId, { poleHeightFt: heightFt });
  renderFacilityManager();
  if (typeof showToast === "function") {
    showToast(`Updated pole height to ${heightFt} ft AGL`);
  }
}

// -----------------------------------------------------------
// Drag & Drop Enclosures & Hardware Between Spaces (Requirement 2 & 5)
// -----------------------------------------------------------
let facilityDraggedEncId = null;
let facilityDraggedHardwareId = null;

function handleEnclosureDragStart(event, encId) {
  facilityDraggedEncId = encId;
  event.dataTransfer.setData("text/plain", encId);
  event.dataTransfer.effectAllowed = "move";
  const el = event.currentTarget;
  if (el) el.style.opacity = "0.4";
}

function handleEnclosureDragEnd(event) {
  facilityDraggedEncId = null;
  const el = event.currentTarget;
  if (el) el.style.opacity = "1";
  document.querySelectorAll(".space-drop-target, .enclosure-drop-target").forEach(card => {
    card.classList.remove("ring-2", "ring-indigo-400", "ring-amber-400", "ring-emerald-400", "bg-indigo-950/60", "border-indigo-400", "border-amber-400", "border-emerald-400");
  });
}

function handleHardwareStagingDragStart(event, instanceId) {
  facilityDraggedHardwareId = instanceId;
  event.dataTransfer.setData("hardwareInstanceId", instanceId);
  event.dataTransfer.effectAllowed = "move";
  const el = event.currentTarget;
  if (el) el.style.opacity = "0.4";
}

function handleHardwareStagingDragEnd(event) {
  facilityDraggedHardwareId = null;
  const el = event.currentTarget;
  if (el) el.style.opacity = "1";
  document.querySelectorAll(".space-drop-target, .enclosure-drop-target").forEach(card => {
    card.classList.remove("ring-2", "ring-indigo-400", "ring-amber-400", "ring-emerald-400", "bg-indigo-950/60", "border-indigo-400", "border-amber-400", "border-emerald-400");
  });
}

function handleSpaceCardDragOver(event, spaceId) {
  if (!facilityDraggedEncId && !facilityDraggedHardwareId) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  const card = event.currentTarget;
  if (card && !card.classList.contains("ring-2")) {
    card.classList.add("ring-2", facilityDraggedHardwareId ? "ring-amber-400" : "ring-indigo-400", "bg-indigo-950/60", facilityDraggedHardwareId ? "border-amber-400" : "border-indigo-400");
  }
}

function handleSpaceCardDragLeave(event, spaceId) {
  const card = event.currentTarget;
  if (card) {
    card.classList.remove("ring-2", "ring-indigo-400", "ring-amber-400", "bg-indigo-950/60", "border-indigo-400", "border-amber-400");
  }
}

function handleEnclosureCardDragOver(event) {
  if (!facilityDraggedHardwareId) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  const card = event.currentTarget;
  if (card && !card.classList.contains("ring-2")) {
    card.classList.add("ring-2", "ring-emerald-400", "bg-emerald-950/40", "border-emerald-400");
  }
}

function handleEnclosureCardDragLeave(event) {
  const card = event.currentTarget;
  if (card) {
    card.classList.remove("ring-2", "ring-emerald-400", "bg-emerald-950/40", "border-emerald-400");
  }
}

function handleEnclosureCardDrop(event, encLocName) {
  event.preventDefault();
  const card = event.currentTarget;
  if (card) {
    card.classList.remove("ring-2", "ring-emerald-400", "bg-emerald-950/40", "border-emerald-400");
  }
  const hwId = event.dataTransfer.getData("hardwareInstanceId") || facilityDraggedHardwareId;
  facilityDraggedHardwareId = null;
  if (hwId && encLocName) {
    assignHardwareToLocation(hwId, encLocName);
  }
}

function assignHardwareToLocation(instanceId, targetLoc) {
  if (!instanceId || !targetLoc || typeof projectBOM === "undefined") return;
  const item = projectBOM.find(i => i.instanceId === instanceId);
  if (!item) return;

  const normalized = FacilityStore.normalize(targetLoc);
  item.closetName = normalized;
  item.rackId = normalized;
  item.rackSlot = null;
  item.rackU = null;

  FacilityStore.notifyWorkspaceChange();
  renderFacilityManager();
  if (typeof updateBOMView === "function") updateBOMView();
  if (typeof showToast === "function") {
    showToast(`Assigned ${item.model} to ${normalized}`);
  }
}

function assignAllUnassignedToSpace(spaceName) {
  if (!spaceName || typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) return;
  const targetLoc = `${spaceName} • Field`;
  let count = 0;

  projectBOM.forEach(item => {
    if (item.parentInstanceId) return;
    const loc = FacilityStore.normalize(item.closetName || item.rackId);
    if (loc === FacilityStore.UNASSIGNED) {
      item.closetName = targetLoc;
      item.rackId = targetLoc;
      item.rackSlot = null;
      item.rackU = null;
      count++;
    }
  });

  if (count > 0) {
    FacilityStore.notifyWorkspaceChange();
    renderFacilityManager();
    if (typeof updateBOMView === "function") updateBOMView();
    if (typeof showToast === "function") {
      showToast(`Assigned ${count} device${count === 1 ? '' : 's'} to ${spaceName} Field`);
    }
  }
}

function handleSpaceCardDrop(event, targetSpaceId) {
  event.preventDefault();
  const card = event.currentTarget;
  if (card) {
    card.classList.remove("ring-2", "ring-indigo-400", "ring-amber-400", "bg-indigo-950/60", "border-indigo-400", "border-amber-400");
  }

  // Check if hardware drop from staging bin
  const hwId = event.dataTransfer.getData("hardwareInstanceId") || facilityDraggedHardwareId;
  facilityDraggedHardwareId = null;
  if (hwId) {
    const targetSpace = FacilityStore.getSpaces().find(s => s.id === targetSpaceId);
    if (targetSpace) {
      assignHardwareToLocation(hwId, `${targetSpace.name} • Field`);
    }
    return;
  }

  const encId = event.dataTransfer.getData("text/plain") || facilityDraggedEncId;
  facilityDraggedEncId = null;
  if (!encId) return;

  const encs = FacilityStore.getEnclosures();
  const enc = encs.find(e => e.id === encId);
  if (!enc) return;

  if (enc.spaceId === targetSpaceId) {
    return; // Dropped on current space, no change
  }

  const spaces = FacilityStore.getSpaces();
  const sourceSpace = spaces.find(s => s.id === enc.spaceId);
  const targetSpace = spaces.find(s => s.id === targetSpaceId);
  if (!targetSpace) return;

  // Duplicate name check in destination space (Requirement 4)
  const duplicate = encs.some(e => e.id !== enc.id && e.spaceId === targetSpaceId && e.name.trim().toLowerCase() === enc.name.trim().toLowerCase());
  if (duplicate) {
    const msg = `Cannot move: An enclosure named "${enc.name}" already exists in "${targetSpace.name}". Please rename it first.`;
    if (typeof showToast === "function") showToast(msg);
    else alert(msg);
    return;
  }

  const oldLoc = sourceSpace ? `${sourceSpace.name} • ${enc.name}` : enc.name;
  const newLoc = `${targetSpace.name} • ${enc.name}`;

  // Update enclosure spaceId and mountingMethod if moving to a pole
  const updates = { spaceId: targetSpaceId };
  if (targetSpace.type === "pole") {
    updates.mountingMethod = "pole";
    if (!enc.mountHeightFt) updates.mountHeightFt = 10;
  }
  FacilityStore.updateHost(enc.id, updates);

  // Update BOM items
  let remappedCount = 0;
  if (typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) {
    projectBOM.forEach(item => {
      if (item.closetName === oldLoc || item.rackId === oldLoc) {
        item.closetName = newLoc;
        item.rackId = newLoc;
        remappedCount++;
      }
    });
    if (remappedCount > 0 && typeof saveBOMToLocalStorage === "function") {
      saveBOMToLocalStorage();
    }
  }

  activeFacilitySpaceId = targetSpaceId;
  activeFacilityFloorId = targetSpace.floorId;

  FacilityStore.notifyWorkspaceChange();
  renderFacilityManager();

  if (typeof showToast === "function") {
    showToast(`Moved "${enc.name}" to "${targetSpace.name}" (${remappedCount} devices remapped)`);
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
        <span class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Mounting Hosts</span>
        <div class="flex items-baseline gap-2">
          <span class="text-xl font-extrabold text-indigo-400 font-mono">${enclosures.length}</span>
          <span class="text-xs text-slate-400">Hosts Active</span>
        </div>
      </div>

      <div class="bg-slate-950 p-3.5 rounded-xl border border-slate-850">
        <span class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Assigned Hardware</span>
        <div class="flex items-baseline gap-2">
          <span class="text-xl font-extrabold text-emerald-400 font-mono">${totalEquipmentCount}</span>
          <span class="text-xs text-slate-400">BOM Units Housed</span>
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
          <button onclick="openFacilityAddForm('add_floor')" class="px-2 py-1 bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1">
            <i data-lucide="plus" class="w-3 h-3"></i> Add Floor
          </button>
        </div>

        ${facilityActiveForm === 'add_floor' ? `
          <!-- Inline Add Floor Form -->
          <div class="p-3 bg-slate-900 border border-sky-500/60 rounded-xl space-y-2.5 shadow-lg">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-sky-400">New Floor Level</span>
              <button onclick="closeFacilityAddForm()" class="text-slate-500 hover:text-slate-300"><i data-lucide="x" class="w-3.5 h-3.5"></i></button>
            </div>
            <div>
              <label class="text-[10px] text-slate-400 block mb-1">Floor Name:</label>
              <input id="inlineFloorName" type="text" placeholder="e.g. Level 2 - Corporate Offices" value="Level ${floors.length + 1}" class="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs focus:border-sky-500 focus:outline-none font-medium">
              <div id="inlineFloorError" class="hidden text-[10px] text-rose-400 font-medium mt-1"></div>
            </div>
            <div>
              <label class="text-[10px] text-slate-400 block mb-1">Ceiling Rise (ft):</label>
              <input id="inlineFloorHeight" type="number" value="14" min="8" max="50" class="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-2.5 py-1 text-xs focus:border-sky-500 focus:outline-none font-mono">
            </div>
            <div class="flex items-center justify-end gap-2 pt-1">
              <button onclick="closeFacilityAddForm()" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold">Cancel</button>
              <button onclick="saveInlineFloor()" class="px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold shadow">Save Floor</button>
            </div>
          </div>
        ` : ''}

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
                  <button onclick="event.stopPropagation(); deleteFacilityFloor('${f.id}')" class="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-opacity" title="Delete Floor">
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
          <button onclick="openFacilityAddForm('add_space')" class="px-2 py-1 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1">
            <i data-lucide="plus" class="w-3 h-3"></i> Add Space
          </button>
        </div>

        ${facilityActiveForm === 'add_space' ? `
          <!-- Inline Add Space Form -->
          <div class="p-3 bg-slate-900 border border-indigo-500/60 rounded-xl space-y-2.5 shadow-lg">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-indigo-400">New Space on ${escapeHTML(currentFloor.name)}</span>
              <button onclick="closeFacilityAddForm()" class="text-slate-500 hover:text-slate-300"><i data-lucide="x" class="w-3.5 h-3.5"></i></button>
            </div>
            <div>
              <label class="text-[10px] text-slate-400 block mb-1">Space Name:</label>
              <input id="inlineSpaceName" type="text" placeholder="e.g. IDF-2, Pole 2, East Gate Wallbox" value="IDF-${currentFloorSpaces.length + 1}" class="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs focus:border-indigo-500 focus:outline-none font-medium">
              <div id="inlineSpaceError" class="hidden text-[10px] text-rose-400 font-medium mt-1"></div>
            </div>
            <div>
              <label class="text-[10px] text-slate-400 block mb-1">Space Type:</label>
              <select id="inlineSpaceType" onchange="const pF = document.getElementById('inlinePoleHeightRow'); if (pF) pF.style.display = this.value === 'pole' ? 'block' : 'none';" class="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs focus:border-indigo-500 focus:outline-none">
                <option value="idf">IDF (Telecommunications Closet)</option>
                <option value="mdf">MDF (Main Distribution Facility / Server Room)</option>
                <option value="pole">Exterior Structural Pole / Mast</option>
                <option value="wallbox">Gate / Wallbox Enclosure Station</option>
                <option value="security_room">Security Control & Access Room</option>
              </select>
            </div>
            <div id="inlinePoleHeightRow" style="display: none;">
              <label class="text-[10px] text-slate-400 block mb-1">Pole Height (ft AGL):</label>
              <select id="inlineSpacePoleHeight" class="w-full bg-slate-950 border border-slate-700 text-cyan-300 font-bold rounded-lg px-2.5 py-1.5 text-xs">
                <option value="12">12 ft AGL (Pedestal / Short Mast)</option>
                <option value="15">15 ft AGL (Perimeter Camera Pole)</option>
                <option value="20">20 ft AGL (Standard Light/Utility Pole)</option>
                <option value="25" selected>25 ft AGL (Commercial Security Pole)</option>
                <option value="30">30 ft AGL (High-Mast / Radio Mast)</option>
                <option value="40">40 ft AGL (Tower / Heavy Industrial)</option>
              </select>
            </div>
            <div class="flex items-center justify-end gap-2 pt-1">
              <button onclick="closeFacilityAddForm()" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold">Cancel</button>
              <button onclick="saveInlineSpace()" class="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow">Save Space</button>
            </div>
          </div>
        ` : ''}

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
            const spaceFieldHardware = (typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) ? projectBOM.filter(item => {
              if (item.parentInstanceId) return false;
              if (item.rackSlot) return false;
              const loc = FacilityStore.normalize(item.closetName || item.location || item.rackId);
              return loc === FacilityStore.normalize(s.name) || loc.startsWith(FacilityStore.normalize(s.name) + ' •');
            }) : [];

            return `
              <div 
                onclick="selectFacilitySpace('${s.id}')"
                ondragover="handleSpaceCardDragOver(event, '${s.id}')"
                ondragleave="handleSpaceCardDragLeave(event, '${s.id}')"
                ondrop="handleSpaceCardDrop(event, '${s.id}')"
                data-space-id="${s.id}"
                class="space-drop-target p-3 rounded-xl border ${isSelected ? (isPole ? 'border-cyan-500 bg-cyan-950/40 ring-1 ring-cyan-500/40' : 'border-indigo-500 bg-indigo-950/40 ring-1 ring-indigo-500/40') : (isPole ? 'border-cyan-900/60 bg-slate-950/80 hover:border-cyan-700' : 'border-slate-800 bg-slate-950/60 hover:border-slate-700')} cursor-pointer transition-all flex items-center justify-between group"
              >
                <div class="min-w-0 pr-2">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="text-xs font-bold text-white truncate">${escapeHTML(s.name)}</span>
                    <span class="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${isMdf ? 'border-rose-500/30 bg-rose-500/10 text-rose-300' : (isPole ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300' : 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300')}">
                      ${isPole ? 'STRUCTURAL POLE' : s.type.toUpperCase()}
                    </span>
                  </div>
                  <div class="mt-1 flex items-center gap-2 flex-wrap">
                    <span class="text-[10px] text-slate-400 font-mono">
                      ${spaceEncs.length} ${spaceEncs.length === 1 ? 'Enclosure' : 'Enclosures'}
                    </span>
                    ${spaceFieldHardware.length > 0 ? `
                      <span class="text-[10px] text-amber-400 font-mono font-bold">
                        &bull; ${spaceFieldHardware.length} Field Device${spaceFieldHardware.length === 1 ? '' : 's'}
                      </span>
                    ` : ''}
                    ${isPole ? `
                      <span class="text-[10px] text-cyan-400 font-mono font-bold">
                        &bull; ${s.poleHeightFt || 25} ft AGL
                      </span>
                    ` : ''}
                  </div>
                </div>

                <div class="flex items-center gap-1.5 shrink-0">
                  ${isPole ? `
                    <button 
                      onclick="event.stopPropagation(); openRackViewerFor('${s.name} • Pole Mount')"
                      class="px-2 py-1 bg-cyan-600/30 hover:bg-cyan-600 text-cyan-200 hover:text-white text-[10px] font-bold rounded-lg border border-cyan-500/40 transition-all flex items-center gap-1 shadow-sm"
                      title="Open Pole Elevation Visualizer for ${escapeHTML(s.name)}"
                    >
                      <i data-lucide="radio-tower" class="w-3 h-3"></i> Pole Elevation
                    </button>
                    <select 
                      onclick="event.stopPropagation()"
                      onchange="updateSpacePoleHeight('${s.id}', parseInt(this.value, 10))" 
                      class="bg-slate-950 border border-slate-700 text-cyan-300 font-bold rounded px-1.5 py-1 text-[10px] focus:outline-none"
                      title="Adjust Pole Height"
                    >
                      <option value="12" ${s.poleHeightFt === 12 ? 'selected' : ''}>12ft</option>
                      <option value="15" ${s.poleHeightFt === 15 ? 'selected' : ''}>15ft</option>
                      <option value="20" ${s.poleHeightFt === 20 ? 'selected' : ''}>20ft</option>
                      <option value="25" ${(s.poleHeightFt || 25) === 25 ? 'selected' : ''}>25ft</option>
                      <option value="30" ${s.poleHeightFt === 30 ? 'selected' : ''}>30ft</option>
                      <option value="40" ${s.poleHeightFt === 40 ? 'selected' : ''}>40ft</option>
                    </select>
                  ` : ''}

                  ${spaces.length > 1 ? `
                    <button onclick="event.stopPropagation(); deleteFacilitySpace('${s.id}')" class="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-opacity" title="Delete Space">
                      <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                    </button>
                  ` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Col 3: Mounting Hosts & Enclosures (5 cols) -->
      <div class="md:col-span-5 space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <i data-lucide="${currentSpace && currentSpace.type === 'pole' ? 'box' : 'server'}" class="w-3.5 h-3.5 ${currentSpace && currentSpace.type === 'pole' ? 'text-cyan-400' : 'text-emerald-400'}"></i>
            ${currentSpace && currentSpace.type === 'pole' ? `Enclosures on ${escapeHTML(currentSpace.name)}` : 'Mounting Hosts & Enclosures'} (${currentSpaceEncs.length})
          </span>
          ${currentSpace ? `
            <button onclick="openFacilityAddForm('add_host')" class="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1">
              <i data-lucide="plus" class="w-3 h-3"></i> Add Enclosure
            </button>
          ` : ''}
        </div>

        ${facilityActiveForm === 'add_host' && currentSpace ? `
          <!-- Inline Add Host Form -->
          <div class="p-3.5 bg-slate-900 border border-emerald-500/60 rounded-xl space-y-3 shadow-xl">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-emerald-400">Add Enclosure to ${escapeHTML(currentSpace.name)}</span>
              <button onclick="closeFacilityAddForm()" class="text-slate-500 hover:text-slate-300"><i data-lucide="x" class="w-3.5 h-3.5"></i></button>
            </div>

            <!-- Host Type Selector (Poles are managed at Space level) -->
            <div>
              <label class="text-[10px] text-slate-400 block mb-1">Enclosure Type:</label>
              <select id="inlineHostType" onchange="setFacilityNewHostType(this.value)" class="w-full bg-slate-950 border border-slate-700 text-emerald-300 font-bold rounded-lg px-2.5 py-1.5 text-xs focus:border-emerald-500 focus:outline-none">
                <option value="industrial_din" ${facilityNewHostType === 'industrial_din' || (currentSpace.type === 'pole' && facilityNewHostType === 'equipment_rack') ? 'selected' : ''}>Industrial Weatherproof NEMA Box (DIN Rail)</option>
                <option value="security_cabinet" ${facilityNewHostType === 'security_cabinet' ? 'selected' : ''}>Security & Access Cabinet (Altronix Trove / LSP)</option>
                <option value="equipment_rack" ${facilityNewHostType === 'equipment_rack' && currentSpace.type !== 'pole' ? 'selected' : ''}>19" EIA Equipment Rack (Switches, Servers, UPS)</option>
                <option value="architectural_backboard" ${facilityNewHostType === 'architectural_backboard' ? 'selected' : ''}>Architectural Telecom Backboard (Plywood)</option>
              </select>
            </div>

            <!-- Host Name Input -->
            <div>
              <label class="text-[10px] text-slate-400 block mb-1">Enclosure Name:</label>
              <input id="inlineHostName" type="text" value="${getSuggestedHostName(currentSpace.type === 'pole' && facilityNewHostType === 'equipment_rack' ? 'industrial_din' : facilityNewHostType, currentSpaceEncs.length)}" class="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs focus:border-emerald-500 focus:outline-none font-medium">
              <div id="inlineHostError" class="hidden text-[10px] text-rose-400 font-medium mt-1"></div>
            </div>

            <!-- Dynamic Form-Factor Fields -->
            <div class="grid grid-cols-2 gap-2 text-xs">
              ${renderInlineHostSpecificFields(currentSpace.type === 'pole' && facilityNewHostType === 'equipment_rack' ? 'industrial_din' : facilityNewHostType, currentSpace)}
            </div>

            <div class="flex items-center justify-end gap-2 pt-1 border-t border-slate-800">
              <button onclick="closeFacilityAddForm()" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold">Cancel</button>
              <button onclick="saveInlineHost()" class="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow">Create Enclosure</button>
            </div>
          </div>
        ` : ''}

        <div class="space-y-3 max-h-[500px] overflow-y-auto pr-1">
          ${currentSpaceEncs.length === 0 ? `
            <div class="text-center py-8 text-slate-500 text-xs bg-slate-950/60 rounded-xl border border-slate-850">
              No racks or enclosures mounted in this space yet.
            </div>
          ` : currentSpaceEncs.map(e => {
            const locName = `${currentSpace.name} • ${e.name}`;
            const telem = FacilityStore.getLocationTelemetry(locName);
            const hostType = e.hostType || (e.isDin ? "industrial_din" : "equipment_rack");
            const meta = MOUNTING_HOST_TYPES[hostType] || MOUNTING_HOST_TYPES.equipment_rack;
            const isPoleMounted = e.mountingMethod === "pole" || (currentSpace && currentSpace.type === "pole");

            return `
              <div 
                class="enclosure-drop-target p-3.5 rounded-xl border border-slate-800 bg-slate-950/90 space-y-2.5 hover:border-slate-700 transition-colors"
                draggable="true"
                ondragstart="handleEnclosureDragStart(event, '${e.id}')"
                ondragend="handleEnclosureDragEnd(event)"
                ondragover="handleEnclosureCardDragOver(event)"
                ondragleave="handleEnclosureCardDragLeave(event)"
                ondrop="handleEnclosureCardDrop(event, '${locName}')"
                data-enclosure-id="${e.id}"
              >
                <!-- Drag Handle Bar (Requirement 5) -->
                <div class="flex items-center justify-between text-[9px] text-slate-500 font-mono pb-1 border-b border-slate-850 cursor-grab active:cursor-grabbing select-none">
                  <span class="flex items-center gap-1 text-slate-400 hover:text-indigo-300 transition-colors">
                    <i data-lucide="grip-vertical" class="w-3 h-3 text-slate-500"></i> Drag to reassign space
                  </span>
                  <span class="text-slate-600">ID: ${escapeHTML(e.id)}</span>
                </div>

                <div class="flex items-start justify-between gap-2 pt-1">
                  <div class="min-w-0">
                    <span class="text-xs font-bold text-white block truncate">${escapeHTML(e.name)}</span>
                    <div class="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span class="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border border-indigo-500/40 bg-indigo-500/10 text-indigo-300 flex items-center gap-1">
                        <i data-lucide="${meta.icon || 'server'}" class="w-2.5 h-2.5"></i> ${meta.badgeLabel}
                      </span>
                      ${isPoleMounted ? `
                        <span class="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border border-cyan-500/40 bg-cyan-500/10 text-cyan-300">
                          Pole Banded @ ${e.mountHeightFt || 10} ft AGL
                        </span>
                      ` : (hostType === 'industrial_din' ? `
                        <span class="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border border-amber-500/40 bg-amber-500/10 text-amber-300">
                          Wall Mounted
                        </span>
                      ` : '')}
                      <span class="text-[10px] font-mono text-slate-400">
                        ${hostType === 'equipment_rack' ? `${e.heightU || 24}U EIA &bull; Max ${e.maxWatts || 3000}W` :
                          (hostType === 'security_cabinet' ? `${e.subplateBays || 8} Subplate Bays &bull; ${e.dcVoltage || '12/24V'}` :
                          (hostType === 'industrial_din' ? `${e.dinRails || 2}x DIN (${e.railLengthMm || 350}mm)` :
                          `${e.widthFt || 4}' x ${e.heightFt || 8}' Backboard`))}
                      </span>
                    </div>
                  </div>

                  <div class="flex items-center gap-1.5 shrink-0">
                    <button 
                      onclick="openRackViewerFor('${locName}')"
                      class="px-2.5 py-1.5 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white text-[10px] font-bold rounded-xl border border-indigo-500/40 transition-all flex items-center gap-1.5 shadow-sm"
                      title="Open Elevation Visualizer for ${escapeHTML(e.name)}"
                    >
                      <i data-lucide="layout-grid" class="w-3.5 h-3.5"></i> Visualizer
                    </button>
                    <button onclick="deleteFacilityEnclosure('${e.id}')" class="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors" title="Delete Enclosure">
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
                        (hostType === 'industrial_din' ? 'DIN Rail:' : 'Backboard:'))}
                    </span>
                    <span class="text-indigo-300 font-bold">
                      ${hostType === 'equipment_rack' ? `${telem.totalRuOccupied}/${e.heightU || 24}U` :
                        (hostType === 'security_cabinet' ? `${e.subplateBays || 8} Bays` :
                        (hostType === 'industrial_din' ? `${e.dinRails || 2}x Rails` : `${e.widthFt || 4}x${e.heightFt || 8} Ft`))}
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

        <!-- Unenclosed Field Hardware in this Space (Requirement 5) -->
        ${currentSpace ? (() => {
          const fieldHardware = (typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) ? projectBOM.filter(item => {
            if (item.parentInstanceId) return false;
            if (item.rackSlot) return false;
            const loc = FacilityStore.normalize(item.closetName || item.location || item.rackId);
            return loc === FacilityStore.normalize(currentSpace.name) || loc.startsWith(FacilityStore.normalize(currentSpace.name) + ' •');
          }) : [];

          return `
            <div class="p-3 bg-slate-900/90 border border-slate-800 rounded-xl space-y-2.5 shadow-md">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <i data-lucide="radio" class="w-3.5 h-3.5 text-amber-400"></i>
                  Unenclosed Field Hardware in ${escapeHTML(currentSpace.name)} (${fieldHardware.length})
                </span>
                <button 
                  type="button" 
                  onclick="promptAssignHardwareToSpace('${escapeHTML(currentSpace.name)}')" 
                  class="px-2 py-0.5 bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 border border-amber-500/40 rounded text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer" 
                  title="Assign an unassigned P2P radio, camera, or sensor directly to this space"
                >
                  <i data-lucide="plus" class="w-3 h-3"></i> Assign Staged Device
                </button>
              </div>

              ${fieldHardware.length === 0 ? `
                <div class="p-3 bg-slate-950/60 rounded-lg border border-dashed border-slate-800 text-center text-xs text-slate-500">
                  No unenclosed field devices (cameras, doors, wall radios) assigned directly to this space.
                </div>
              ` : `
                <div class="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  ${fieldHardware.map(dev => {
                    const mountMethod = dev.mountMethod ? dev.mountMethod.toUpperCase() : "WALL";
                    const isCamera = dev.role === "Camera" || dev.category?.includes("camera");
                    const isDoor = dev.role === "Access Control" || dev.category?.includes("access");
                    const isRadio = dev.role === "Wireless Bridge" || dev.category?.includes("wireless");
                    const iconName = isCamera ? "camera" : (isDoor ? "door-closed" : (isRadio ? "radio" : "cpu"));

                    return `
                      <div class="bg-slate-950 p-2 rounded-lg border border-slate-800 flex items-center justify-between text-xs hover:border-slate-700 transition-colors">
                        <div class="flex items-center gap-2 min-w-0">
                          <div class="p-1 rounded bg-slate-900 border border-slate-800 text-amber-400 shrink-0">
                            <i data-lucide="${iconName}" class="w-3 h-3"></i>
                          </div>
                          <div class="min-w-0">
                            <span class="font-bold text-white block truncate">${escapeHTML(dev.model)}</span>
                            <div class="flex items-center gap-1.5 flex-wrap">
                              <span class="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-950/80 border border-amber-800/80 text-amber-300 font-bold">${mountMethod} MOUNT</span>
                              <span class="text-[10px] text-slate-400 font-mono">${escapeHTML(dev.role || 'Field Device')} &bull; ${dev.consumedPoEWatts || 15}W PoE</span>
                            </div>
                          </div>
                        </div>
                        <div class="flex items-center gap-1 shrink-0">
                          <button onclick="jumpToTopologyTarget('node:${dev.instanceId}')" class="p-1 text-slate-400 hover:text-indigo-300 transition-colors" title="View in Topology">
                            <i data-lucide="network" class="w-3.5 h-3.5"></i>
                          </button>
                          <button onclick="jumpToPhysicalLayoutTarget('${dev.instanceId}')" class="p-1 text-slate-400 hover:text-amber-300 transition-colors" title="View in Physical Layout">
                            <i data-lucide="map" class="w-3.5 h-3.5"></i>
                          </button>
                          <button onclick="jumpToBomTarget('${dev.instanceId}')" class="p-1 text-slate-400 hover:text-emerald-300 transition-colors" title="View in BOM Drawer">
                            <i data-lucide="file-spreadsheet" class="w-3.5 h-3.5"></i>
                          </button>
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              `}
            </div>
          `;
        })() : ''}
      </div>
    </div>

    <!-- Unassigned Quote Hardware Staging Bin (Requirement 2: Prominent Spaces Area Display) -->
    ${(() => {
      const unassignedItems = (typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) ? projectBOM.filter(item => {
        if (item.parentInstanceId) return false;
        const loc = FacilityStore.normalize(item.closetName || item.location || item.rackId);
        return loc === FacilityStore.UNASSIGNED;
      }) : [];

      const availableEnclosures = FacilityStore.getEnclosures();

      return `
        <div id="facilityUnassignedHardwareTray" class="w-full mt-6 p-4 rounded-2xl border ${unassignedItems.length > 0 ? 'border-amber-500/50 bg-amber-950/20 shadow-amber-950/20' : 'border-slate-800 bg-slate-950/60'} shadow-xl space-y-3 transition-all">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-850">
            <div class="flex items-center gap-2.5">
              <div class="p-2 rounded-xl ${unassignedItems.length > 0 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm' : 'bg-slate-900 text-slate-500 border border-slate-800'}">
                <i data-lucide="inbox" class="w-4 h-4"></i>
              </div>
              <div>
                <div class="flex items-center gap-2 flex-wrap">
                  <h3 class="text-xs font-bold text-white uppercase tracking-wider">Unassigned Quote Equipment Staging</h3>
                  <span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${unassignedItems.length > 0 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-400'}">
                    ${unassignedItems.length} Device${unassignedItems.length === 1 ? '' : 's'} Unassigned
                  </span>
                </div>
                <p class="text-[11px] text-slate-400 mt-0.5">
                  Hardware added to quote without an assigned space or rack. Drag onto spaces/enclosures above, or click below to assign.
                </p>
              </div>
            </div>

            ${unassignedItems.length > 0 && currentSpace ? `
              <div class="flex items-center gap-2 shrink-0">
                <button 
                  onclick="assignAllUnassignedToSpace('${escapeHTML(currentSpace.name)}')" 
                  class="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                  title="Assign all unassigned equipment to ${escapeHTML(currentSpace.name)} Field"
                >
                  <i data-lucide="check-check" class="w-3.5 h-3.5"></i>
                  <span>Assign All to ${escapeHTML(currentSpace.name)} Field</span>
                </button>
              </div>
            ` : ''}
          </div>

          ${unassignedItems.length === 0 ? `
            <div class="py-6 text-center text-slate-500 text-xs bg-slate-950/40 rounded-xl border border-dashed border-slate-850">
              <i data-lucide="check-circle-2" class="w-6 h-6 mx-auto mb-1.5 text-emerald-500/60"></i>
              <p class="font-medium text-slate-300">All quote equipment is assigned to a physical space or mounting enclosure.</p>
              <p class="text-[10px] text-slate-500 mt-0.5">New devices added from the Quote BOM or Catalog will appear here ready to assign.</p>
            </div>
          ` : `
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 max-h-72 overflow-y-auto pr-1">
              ${unassignedItems.map(item => {
                const mount = (item.mountMethod || "wall").toUpperCase();
                const isRadio = item.role === "Wireless Bridge" || item.category?.includes("wireless");
                const isCam = item.role === "Camera" || item.category?.includes("camera");
                const isDoor = item.role === "Access Control" || item.category?.includes("access");
                const isSwitch = item.role === "Access Switch" || item.role === "Core Switch" || item.role === "Distribution Switch";
                const isServer = item.role === "Server" || item.category === "servers";
                const iconName = isRadio ? "radio" : (isCam ? "camera" : (isDoor ? "door-closed" : (isSwitch ? "server" : (isServer ? "hard-drive" : "cpu"))));

                return `
                  <div 
                    class="bg-slate-950 p-2.5 rounded-xl border border-slate-800 hover:border-amber-500/60 transition-all flex flex-col justify-between gap-2 shadow-sm select-none"
                    draggable="true"
                    ondragstart="handleHardwareStagingDragStart(event, '${item.instanceId}')"
                    ondragend="handleHardwareStagingDragEnd(event)"
                  >
                    <div class="flex items-start justify-between gap-2">
                      <div class="flex items-center gap-2 min-w-0">
                        <div class="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-amber-400 shrink-0">
                          <i data-lucide="${iconName}" class="w-3.5 h-3.5"></i>
                        </div>
                        <div class="min-w-0">
                          <span class="font-bold text-white text-xs block truncate" title="${escapeHTML(item.model)}">${escapeHTML(item.model)}</span>
                          <span class="text-[10px] text-slate-400 font-mono">${escapeHTML(item.role || 'Hardware')} &bull; ${item.consumedPoEWatts || item.baseWatts || 0}W</span>
                        </div>
                      </div>
                      <span class="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-950/80 border border-amber-800/80 text-amber-300 font-bold shrink-0">
                        ${mount}
                      </span>
                    </div>

                    <div class="flex items-center justify-between gap-1 pt-1.5 border-t border-slate-900 text-xs">
                      ${currentSpace ? `
                        <button 
                          onclick="assignHardwareToLocation('${item.instanceId}', '${escapeHTML(currentSpace.name)} • Field')" 
                          class="flex-1 px-2 py-1 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-200 hover:text-white rounded text-[10px] font-bold border border-indigo-500/40 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                          title="Assign to ${escapeHTML(currentSpace.name)} (Field / Space Level)"
                        >
                          <i data-lucide="plus" class="w-3 h-3"></i> To ${escapeHTML(currentSpace.name)}
                        </button>
                      ` : ''}

                      <!-- Enclosure Quick Dropdown -->
                      <select 
                        onchange="if(this.value) assignHardwareToLocation('${item.instanceId}', this.value)" 
                        class="bg-slate-900 border border-slate-700 text-slate-300 text-[10px] rounded px-1.5 py-1 focus:outline-none focus:border-brand-500 max-w-[110px] truncate cursor-pointer"
                        title="Mount in a specific Enclosure"
                      >
                        <option value="">Mount in...</option>
                        ${availableEnclosures.map(enc => {
                          const sp = FacilityStore.getSpaces().find(s => s.id === enc.spaceId);
                          const encLoc = sp ? `${sp.name} • ${enc.name}` : enc.name;
                          return `<option value="${escapeHTML(encLoc)}">${escapeHTML(encLoc)}</option>`;
                        }).join('')}
                      </select>

                      <div class="flex items-center gap-0.5 shrink-0">
                        <button onclick="jumpToBomTarget('${item.instanceId}')" class="p-1 text-slate-400 hover:text-emerald-300 transition-colors" title="View in BOM">
                          <i data-lucide="file-spreadsheet" class="w-3 h-3"></i>
                        </button>
                        <button onclick="jumpToPhysicalLayoutTarget('${item.instanceId}')" class="p-1 text-slate-400 hover:text-amber-300 transition-colors" title="View in Physical Layout">
                          <i data-lucide="map" class="w-3 h-3"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>
      `;
    })()}
  `;

  if (window.lucide) lucide.createIcons();
}

function getSuggestedHostName(hostType, existingCount) {
  const num = existingCount + 1;
  switch (hostType) {
    case "security_cabinet":
      return `Security-Cab-${num}`;
    case "industrial_din":
      return `NEMA-Box-${num}`;
    case "architectural_backboard":
      return `Backboard-${num}`;
    default:
      return `Rack-${num}`;
  }
}

function renderInlineHostSpecificFields(hostType, currentSpace = null) {
  const isPoleSpace = currentSpace && currentSpace.type === "pole";

  if (hostType === "security_cabinet") {
    return `
      <div>
        <label class="text-[10px] text-slate-400 block mb-1">Subplate Bays:</label>
        <select id="inlineCabinetBays" class="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-2 py-1 text-xs">
          <option value="4">4 Bays (Trove 1 / Compact)</option>
          <option value="8" selected>8 Bays (Trove 2 / Standard)</option>
          <option value="12">12 Bays (Trove 3 / High Density)</option>
          <option value="16">16 Bays (LifeSafety ProWire)</option>
        </select>
      </div>
      <div>
        ${isPoleSpace ? `
          <label class="text-[10px] text-cyan-400 block mb-1">Mounting Height (ft AGL):</label>
          <select id="inlineHostMountHeight" class="w-full bg-slate-950 border border-slate-700 text-cyan-300 font-bold rounded-lg px-2 py-1 text-xs">
            <option value="6">6 ft AGL (Low Band)</option>
            <option value="8">8 ft AGL (Service Height)</option>
            <option value="10" selected>10 ft AGL (Standard)</option>
            <option value="12">12 ft AGL (Elevated)</option>
          </select>
        ` : `
          <label class="text-[10px] text-slate-400 block mb-1">DC Bus Voltage:</label>
          <select id="inlineCabinetVoltage" class="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-2 py-1 text-xs">
            <option value="dual_12_24" selected>Dual 12V / 24VDC</option>
            <option value="24vdc">24VDC Dedicated</option>
            <option value="12vdc">12VDC Dedicated</option>
          </select>
        `}
      </div>
    `;
  } else if (hostType === "industrial_din") {
    return `
      <div>
        <label class="text-[10px] text-slate-400 block mb-1">DIN Rails:</label>
        <select id="inlineDinRails" class="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-2 py-1 text-xs">
          <option value="1">1 Rail (Compact NEMA)</option>
          <option value="2" selected>2 Rails (Standard NEMA 4X)</option>
          <option value="3">3 Rails (Deep Industrial)</option>
          <option value="4">4 Rails (Full Control)</option>
        </select>
      </div>
      <div>
        ${isPoleSpace ? `
          <label class="text-[10px] text-cyan-400 block mb-1">Mounting Height (ft AGL):</label>
          <select id="inlineHostMountHeight" class="w-full bg-slate-950 border border-slate-700 text-cyan-300 font-bold rounded-lg px-2 py-1 text-xs">
            <option value="8">8 ft AGL (Accessible)</option>
            <option value="10" selected>10 ft AGL (Standard Banding)</option>
            <option value="12">12 ft AGL (High Clearance)</option>
            <option value="15">15 ft AGL (Mid-Pole)</option>
          </select>
        ` : `
          <label class="text-[10px] text-slate-400 block mb-1">Mounting Method:</label>
          <select id="inlineDinMounting" class="w-full bg-slate-950 border border-slate-700 text-amber-300 font-bold rounded-lg px-2 py-1 text-xs">
            <option value="wall" selected>Wall Mount (Flanges/Strut)</option>
            <option value="pole">Pole Mount (Stainless Banding)</option>
          </select>
        `}
      </div>
    `;
  } else if (hostType === "architectural_backboard") {
    return `
      <div>
        <label class="text-[10px] text-slate-400 block mb-1">Plywood Dimensions:</label>
        <select id="inlineBackboardSize" class="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-2 py-1 text-xs">
          <option value="4" selected>4' x 8' Sheet (32 sq ft)</option>
          <option value="8">8' x 8' Wallfield (64 sq ft)</option>
          <option value="12">12' x 8' Room Field (96 sq ft)</option>
        </select>
      </div>
      <div>
        <label class="text-[10px] text-slate-400 block mb-1">Rating Stamp:</label>
        <input type="text" disabled value="3/4\" AC Fire-Retardant" class="w-full bg-slate-950/60 border border-slate-800 text-slate-400 rounded-lg px-2 py-1 text-xs">
      </div>
    `;
  } else {
    // 19" Equipment Rack
    return `
      <div>
        <label class="text-[10px] text-slate-400 block mb-1">Rack Height:</label>
        <select id="inlineRackHeight" class="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-2 py-1 text-xs font-mono">
          <option value="12">12U Wallbox</option>
          <option value="18">18U Wallbox</option>
          <option value="24" selected>24U Half-Rack</option>
          <option value="42">42U Full-Rack</option>
          <option value="48">48U Enterprise</option>
        </select>
      </div>
      <div>
        <label class="text-[10px] text-slate-400 block mb-1">Frame Depth:</label>
        <select id="inlineRackDepth" class="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-2 py-1 text-xs font-mono">
          <option value="24">24" Shallow</option>
          <option value="36" selected>36" Standard</option>
          <option value="42">42" Deep Server</option>
        </select>
      </div>
    `;
  }
}

function selectFacilityFloor(floorId) {
  activeFacilityFloorId = floorId;
  const spaces = FacilityStore.getSpaces(floorId);
  activeFacilitySpaceId = spaces[0] ? spaces[0].id : null;
  facilityActiveForm = null;
  renderFacilityManager();
}

function selectFacilitySpace(spaceId) {
  activeFacilitySpaceId = spaceId;
  facilityActiveForm = null;
  renderFacilityManager();
}

// Backward-compatible Prompt Callbacks delegating to streamlined inline forms
function promptAddFloor() {
  openFacilityAddForm("add_floor");
}

function promptAddSpace(floorId) {
  if (floorId) activeFacilityFloorId = floorId;
  openFacilityAddForm("add_space");
}

function promptAddEnclosure(spaceId) {
  if (spaceId) activeFacilitySpaceId = spaceId;
  openFacilityAddForm("add_host");
}

function deleteFacilityFloor(floorId) {
  if (confirm("Delete this floor level? All associated spaces and equipment will be moved to Main Floor.")) {
    FacilityStore.deleteFloor(floorId);
    activeFacilityFloorId = FacilityStore.getFloors()[0].id;
    facilityActiveForm = null;
    renderFacilityManager();
  }
}

function deleteFacilitySpace(spaceId) {
  if (confirm("Delete this telecom space? All associated equipment will be unassigned.")) {
    FacilityStore.deleteSpace(spaceId);
    activeFacilitySpaceId = FacilityStore.getSpaces()[0].id;
    facilityActiveForm = null;
    renderFacilityManager();
  }
}

function deleteFacilityEnclosure(enclosureId) {
  if (confirm("Delete this host / enclosure? Assigned hardware will be moved to Unassigned.")) {
    FacilityStore.deleteEnclosure(enclosureId);
    facilityActiveForm = null;
    renderFacilityManager();
  }
}

function openRackViewerFor(locationName) {
  if (typeof NavigationHistory !== "undefined") {
    const st = NavigationHistory.captureCurrentState();
    if (st && st.tool !== "facility") NavigationHistory.push(st);
  }
  const physModal = document.getElementById("cableLayoutModal");
  if (physModal && !physModal.classList.contains("hidden")) {
    if (typeof toggleCableLayoutModal === "function") toggleCableLayoutModal();
  }
  const topoModal = document.getElementById("topologyModal");
  if (topoModal && !topoModal.classList.contains("hidden")) {
    if (typeof toggleTopologyModal === "function") toggleTopologyModal();
  }

  previousFacilityFloorId = activeFacilityFloorId;
  previousFacilitySpaceId = activeFacilitySpaceId;
  facilityActiveForm = null;

  const facModal = document.getElementById("facilityModal");
  if (facModal && facModal.classList.contains("hidden")) {
    facModal.classList.remove("hidden");
  }

  switchFacilityView("visualizer", locationName);
}

function jumpToFacilitySpace(target) {
  if (!target) return;
  if (typeof NavigationHistory !== "undefined") {
    const st = NavigationHistory.captureCurrentState();
    if (st && st.tool !== "facility") NavigationHistory.push(st);
  }
  const physModal = document.getElementById("cableLayoutModal");
  if (physModal && !physModal.classList.contains("hidden")) {
    if (typeof toggleCableLayoutModal === "function") toggleCableLayoutModal();
  }
  const topoModal = document.getElementById("topologyModal");
  if (topoModal && !topoModal.classList.contains("hidden")) {
    if (typeof toggleTopologyModal === "function") toggleTopologyModal();
  }

  const parsed = FacilityStore.parse(target);
  const spaces = FacilityStore.getSpaces();
  const space = spaces.find(s => 
    s.id === target || 
    s.name.toLowerCase() === target.toLowerCase() || 
    (parsed.space && s.name.toLowerCase() === parsed.space.toLowerCase())
  );

  const facModal = document.getElementById("facilityModal");
  if (facModal && facModal.classList.contains("hidden")) {
    toggleFacilityModal();
  }
  switchFacilityView("hierarchy");
  if (space) {
    activeFacilityFloorId = space.floorId;
    activeFacilitySpaceId = space.id;
    renderFacilityManager();
  }
}

// Window Compatibility Exports
if (typeof window !== "undefined") {
  window.MOUNTING_HOST_TYPES = MOUNTING_HOST_TYPES;
  window.EDGE_ENDPOINT_TYPES = EDGE_ENDPOINT_TYPES;
  window.FacilityStore = FacilityStore;
  window.facilityActiveView = facilityActiveView;
  window.switchFacilityView = switchFacilityView;
  window.syncVisualizerBreadcrumbs = syncVisualizerBreadcrumbs;
  window.handleFacilityModalCloseOrBack = handleFacilityModalCloseOrBack;
  window.toggleFacilityModal = toggleFacilityModal;
  window.toggleFacilityManager = toggleFacilityModal; // Alias for seamless navigation
  window.renderFacilityManager = renderFacilityManager;
  window.selectFacilityFloor = selectFacilityFloor;
  window.selectFacilitySpace = selectFacilitySpace;
  window.openFacilityAddForm = openFacilityAddForm;
  window.closeFacilityAddForm = closeFacilityAddForm;
  window.setFacilityNewHostType = setFacilityNewHostType;
  window.saveInlineFloor = saveInlineFloor;
  window.saveInlineSpace = saveInlineSpace;
  window.saveInlineHost = saveInlineHost;
  window.promptAddFloor = promptAddFloor;
  window.promptAddSpace = promptAddSpace;
  window.promptAddEnclosure = promptAddEnclosure;
  window.deleteFacilityFloor = deleteFacilityFloor;
  window.deleteFacilitySpace = deleteFacilitySpace;
  window.deleteFacilityEnclosure = deleteFacilityEnclosure;
  window.openRackViewerFor = openRackViewerFor;
  window.jumpToFacilitySpace = jumpToFacilitySpace;
  window.updateSpacePoleHeight = updateSpacePoleHeight;
  window.handleEnclosureDragStart = handleEnclosureDragStart;
  window.handleEnclosureDragEnd = handleEnclosureDragEnd;
  window.handleHardwareStagingDragStart = handleHardwareStagingDragStart;
  window.handleHardwareStagingDragEnd = handleHardwareStagingDragEnd;
  window.handleSpaceCardDragOver = handleSpaceCardDragOver;
  window.handleSpaceCardDragLeave = handleSpaceCardDragLeave;
  window.handleSpaceCardDrop = handleSpaceCardDrop;
  window.handleEnclosureCardDragOver = handleEnclosureCardDragOver;
  window.handleEnclosureCardDragLeave = handleEnclosureCardDragLeave;
  window.handleEnclosureCardDrop = handleEnclosureCardDrop;
  window.assignHardwareToLocation = assignHardwareToLocation;
  window.assignAllUnassignedToSpace = assignAllUnassignedToSpace;
  window.promptAssignHardwareToSpace = promptAssignHardwareToSpace;
}

function promptAssignHardwareToSpace(spaceName) {
  if (!spaceName) return;
  const tray = document.getElementById("facilityUnassignedHardwareTray");
  if (tray) {
    tray.scrollIntoView({ behavior: "smooth", block: "center" });
    tray.classList.add("ring-2", "ring-amber-400");
    setTimeout(() => {
      tray.classList.remove("ring-2", "ring-amber-400");
    }, 2500);
    if (typeof showToast === "function") {
      showToast(`Select or drag a staged device below to assign to "${spaceName}".`);
    }
  }
}