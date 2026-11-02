// =========================================================================
// FACILITY & LOCATION HIERARCHY ENGINE (NetSelect Enterprise)
// Single Source of Truth for Floors, Spaces/Closets/Poles, Enclosures & Event Dispatching
// =========================================================================

if (typeof window !== "undefined" && typeof window.escapeHTML !== "function") {
  window.escapeHTML = (str => String(str || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])));
}
var escapeHTML = (typeof window !== "undefined" && typeof window.escapeHTML === "function")
  ? window.escapeHTML
  : (str => String(str || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])));

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
  },
  field: {
    id: "field",
    label: "Field Drop / Unenclosed",
    badgeLabel: "Field Drop",
    icon: "map-pin",
    color: "cyan",
    unitOfMeasure: "Drops",
    defaultCapacity: 0,
    description: "Field devices (cameras, access points, door readers, drops) mounted in unenclosed spaces"
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

  // Canonical Default Hierarchy Structure (Blank for new projects)
  defaultFloors: [],
  defaultSpaces: [],
  defaultEnclosures: [],
  _cacheProjId: null,
  _floorsCache: null,
  _spacesCache: null,
  _enclosuresCache: null,

  invalidateCache() {
    this._floorsCache = null;
    this._spacesCache = null;
    this._enclosuresCache = null;
  },

  _safeSetItem(key, val) {
    if (typeof StorageService !== "undefined" && typeof StorageService.safeSetItem === "function") {
      StorageService.safeSetItem(key, val);
    } else {
      try { localStorage.setItem(key, val); } catch (e) {}
    }
  },

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
      this.invalidateCache();
      localStorage.setItem("netselect_active_project_id", projId);
    } catch (e) {}
  },

  // -----------------------------------------------------------
  // Hierarchy Data Accessors (Floors, Spaces, Enclosures)
  // -----------------------------------------------------------
  getFloors() {
    const reqProj = this.getProjectId();
    if (this._cacheProjId === reqProj && Array.isArray(this._floorsCache)) return this._floorsCache;
    const projKey = this.getProjectId();
    try {
      const raw = localStorage.getItem(`netselect_fac_floors_${projKey}`);
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          // Normalize old default name if present
          parsed.forEach(f => {
            if (f.name === "Level 1 - Main Floor") f.name = "Main Floor";
          });
          this._cacheProjId = projKey;
          this._floorsCache = parsed;
          return parsed;
        }
      }
    } catch (e) {}
    return JSON.parse(JSON.stringify(this.defaultFloors));
  },

  saveFloors(list) {
    try {
      const projKey = this.getProjectId();
      this._cacheProjId = projKey;
      this._floorsCache = Array.isArray(list) ? list : [];
      this._safeSetItem(`netselect_fac_floors_${projKey}`, JSON.stringify(list));
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
    const oldName = floor.name;
    if (updates.name) {
      const cleanName = updates.name.trim();
      if (list.some(f => f.id !== floorId && f.name.trim().toLowerCase() === cleanName.toLowerCase())) {
        if (typeof showToast === "function") showToast(`A floor named "${cleanName}" already exists.`);
        return false;
      }
      updates.name = cleanName;
    }
    const nameChanged = updates.name && updates.name !== oldName;
    const newName = updates.name || oldName;

    Object.assign(floor, updates);
    this.saveFloors(list);

    if (nameChanged) {
      // 1. Cascade to facilityFloors in physical layout
      if (typeof facilityFloors !== "undefined" && Array.isArray(facilityFloors)) {
        const fl = facilityFloors.find(f => f.id === floorId || f.name.toLowerCase() === oldName.toLowerCase());
        if (fl) {
          fl.name = newName;
        }
      }

      // 2. Cascade to Floor Field BOM items (e.g. "Main Floor • Field")
      if (typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) {
        const oldFieldLoc = this.normalize(`${oldName} • Field`);
        const newFieldLoc = `${newName} • Field`;
        projectBOM.forEach(item => {
          const loc = this.normalize(item.closetName || item.rackId);
          if (loc === oldFieldLoc) {
            if (item.closetName) item.closetName = newFieldLoc;
            if (item.rackId && item.rackId !== this.UNASSIGNED) item.rackId = newFieldLoc;
          }
        });
      }

      if (typeof renderFloorSelector === "function") renderFloorSelector();
      if (typeof renderCableCanvas === "function") renderCableCanvas();
      if (typeof renderBOM === "function") renderBOM();
      if (typeof StorageService !== "undefined" && typeof StorageService.queueAutoSave === "function") {
        StorageService.queueAutoSave();
      }
    }

    this.notifyWorkspaceChange();
    return floor;
  },

  deleteFloor(floorId) {
    let list = this.getFloors();
    const targetFloor = list.find(f => f.id === floorId);
    if (!targetFloor) return false;

    list = list.filter(f => f.id !== floorId);
    this.saveFloors(list);

    // Reassign orphan spaces to first remaining floor or null
    const fallbackFloor = list.length > 0 ? list[0].id : null;
    const spaces = this.getSpaces();
    spaces.forEach(s => {
      if (s.floorId === floorId) s.floorId = fallbackFloor;
    });
    this.saveSpaces(spaces);

    // Also remove from physical layout facilityFloors if present
    if (typeof facilityFloors !== "undefined" && Array.isArray(facilityFloors)) {
      const idx = facilityFloors.findIndex(f => f.id === floorId || f.name.toLowerCase() === targetFloor.name.toLowerCase());
      if (idx !== -1) {
        facilityFloors.splice(idx, 1);
        if (typeof activeFloorId !== "undefined" && activeFloorId === floorId) {
          activeFloorId = facilityFloors.length > 0 ? facilityFloors[0].id : null;
        }
      }
    }

    // Floor Field hardware on this floor unassigned
    if (typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) {
      const oldFieldLoc = this.normalize(`${targetFloor.name} • Field`);
      projectBOM.forEach(item => {
        const loc = this.normalize(item.closetName || item.rackId);
        if (loc === oldFieldLoc) {
          item.closetName = this.UNASSIGNED;
          item.rackId = this.UNASSIGNED;
          item.rackSlot = null;
        }
      });
    }

    if (typeof renderFloorSelector === "function") renderFloorSelector();
    if (typeof renderCableCanvas === "function") renderCableCanvas();
    if (typeof renderBOM === "function") renderBOM();
    if (typeof StorageService !== "undefined" && typeof StorageService.queueAutoSave === "function") {
      StorageService.queueAutoSave();
    }
    this.notifyWorkspaceChange();
    return true;
  },

  getSpaces(floorId = null) {
    const reqProj = this.getProjectId();
    if (this._cacheProjId === reqProj && Array.isArray(this._spacesCache)) return floorId ? this._spacesCache.filter(s => s.floorId === floorId) : this._spacesCache;
    const projKey = this.getProjectId();
    let list = [];
    try {
      const raw = localStorage.getItem(`netselect_fac_spaces_${projKey}`);
      list = raw !== null ? JSON.parse(raw) : JSON.parse(JSON.stringify(this.defaultSpaces));
      if (!Array.isArray(list)) list = [];
    } catch (e) {
      list = JSON.parse(JSON.stringify(this.defaultSpaces));
    }
    // Ensure all spaces have a type, and pole spaces have poleHeightFt and poleDiameterInches
    this._cacheProjId = projKey;
    this._spacesCache = list;
    list.forEach(s => {
      if (!s) return;
      if (!s.type) s.type = "idf";
      if (s.type === "pole" || (s.name && String(s.name).toLowerCase().includes("pole"))) {
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
      this._cacheProjId = projKey;
      this._spacesCache = Array.isArray(list) ? list : [];
      this._safeSetItem(`netselect_fac_spaces_${projKey}`, JSON.stringify(list));
    } catch (e) {}
  },

  addSpace(name, type = "idf", floorId = null, options = {}) {
    if (!name || !name.trim()) return null;
    const cleanName = name.trim();
    const floors = this.getFloors();
    const targetFloorId = floorId || (typeof activeFacilityFloorId !== "undefined" && activeFacilityFloorId) || (floors[0] ? floors[0].id : "floor-1");
    const list = this.getSpaces();
    // Validate uniqueness on this floor (Requirement 4)
    if (list.some(s => s.floorId === targetFloorId && s.name.trim().toLowerCase() === cleanName.toLowerCase())) {
      if (typeof showToast === "function") showToast(`A space named "${cleanName}" already exists on this floor.`);
      return null;
    }
    const id = `space-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    const isPole = type === "pole" || cleanName.toLowerCase().includes("pole");
    const newSpace = {
      id,
      name: cleanName,
      type: isPole ? "pole" : (type || "idf"),
      floorId: targetFloorId,
      description: options.description || "",
      poleHeightFt: isPole ? (options.poleHeightFt || 25) : null,
      poleDiameterInches: isPole ? (options.poleDiameterInches || 4) : null
    };
    list.push(newSpace);
    this.saveSpaces(list);

    // Create default host for this space (e.g. Rack-1, Wallbox, or Security Cabinet)
    // Only create a default host if:
    // 1. options.createDefaultHost is explicitly true, OR
    // 2. options.createDefaultHost !== false AND the space is a dedicated enclosure closet: "idf", "mdf", or "wallbox"
    // Spaces that are unenclosed (e.g. warehouse, room, field, exterior, zone, office) or poles (which already have Pole Mount)
    // must NEVER have fake 19" racks or enclosures created automatically!
    const isDedicatedCloset = newSpace.type === "idf" || newSpace.type === "mdf" || newSpace.type === "wallbox" || newSpace.type === "security_room";
    const shouldCreateHost = options.createDefaultHost === true || (options.createDefaultHost !== false && isDedicatedCloset);

    if (shouldCreateHost) {
      const isAccess = newSpace.type === "electrical_room" || newSpace.type === "security_room";
      let hostName = "Rack-1";
      let hostType = "equipment_rack";
      let heightU = 24;

      if (isAccess) {
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
        mountingMethod: "wall",
        mountHeightFt: null
      });
    }
    this.notifyWorkspaceChange();
    return newSpace;
  },

  updateSpace(spaceId, updates = {}) {
    const list = this.getSpaces();
    const space = list.find(s => s.id === spaceId);
    if (!space) return false;
    const oldName = space.name;

    if (updates.name) {
      const cleanName = updates.name.trim();
      const floorId = updates.floorId || space.floorId;
      if (list.some(s => s.id !== spaceId && s.floorId === floorId && s.name.trim().toLowerCase() === cleanName.toLowerCase())) {
        if (typeof showToast === "function") showToast(`A space named "${cleanName}" already exists on this floor.`);
        return false;
      }
      updates.name = cleanName;
    }

    const nameChanged = updates.name && updates.name !== oldName;
    const newName = updates.name || oldName;

    Object.assign(space, updates);
    this.saveSpaces(list);

    // CASCADE RENAMING
    if (nameChanged) {
      // 1. Cascade to Enclosures
      let encs = this.getEnclosures();
      const escapedOld = oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      encs.forEach(e => {
        if (e.spaceId === spaceId) {
          if (e.location && e.location.toLowerCase().includes(oldName.toLowerCase())) {
            e.location = e.location.replace(new RegExp(`^${escapedOld}`, 'i'), newName);
          }
        }
      });
      this.saveEnclosures(encs);

      // 2. Cascade to BOM items (closetName and rackId)
      if (typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) {
        projectBOM.forEach(item => {
          if (item.closetId === spaceId || (item.closetName && item.closetName.toLowerCase() === oldName.toLowerCase())) {
            item.closetName = newName;
          } else if (item.closetName && item.closetName.toLowerCase().startsWith(oldName.toLowerCase() + " • ")) {
            item.closetName = newName + item.closetName.substring(oldName.length);
          }
          if (item.rackId && item.rackId.toLowerCase().startsWith(oldName.toLowerCase() + " • ")) {
            item.rackId = newName + item.rackId.substring(oldName.length);
          }
        });
      }

      // 3. Cascade to Canvas floor nodes (MDF closet nodes and device assignedCloset)
      if (typeof facilityFloors !== "undefined" && Array.isArray(facilityFloors)) {
        facilityFloors.forEach(fl => {
          (fl.nodes || []).forEach(n => {
            if (n.type === "closet" && (n.id === spaceId || (n.name && n.name.toLowerCase() === oldName.toLowerCase()))) {
              n.name = newName;
            }
            if (n.assignedCloset && n.assignedCloset.toLowerCase() === oldName.toLowerCase()) {
              n.assignedCloset = newName;
            } else if (n.assignedCloset && n.assignedCloset.toLowerCase().startsWith(oldName.toLowerCase() + " • ")) {
              n.assignedCloset = newName + n.assignedCloset.substring(oldName.length);
            }
          });
          (fl.fiberBackbones || []).forEach(fb => {
            if (fb.fromClosetName && fb.fromClosetName.toLowerCase() === oldName.toLowerCase()) fb.fromClosetName = newName;
            if (fb.toClosetName && fb.toClosetName.toLowerCase() === oldName.toLowerCase()) fb.toClosetName = newName;
          });
        });
      }

      // 4. Cascade to Topology persisted coordinates in localStorage
      try {
        const projKey = this.getProjectId();
        const topoKey = `netselect_topo_pos_${projKey}`;
        const rawTopo = localStorage.getItem(topoKey);
        if (rawTopo) {
          const topoPos = JSON.parse(rawTopo);
          const oldClusterKey = `cluster:${oldName}`;
          const newClusterKey = `cluster:${newName}`;
          if (topoPos[oldClusterKey]) {
            topoPos[newClusterKey] = topoPos[oldClusterKey];
            delete topoPos[oldClusterKey];
            localStorage.setItem(topoKey, JSON.stringify(topoPos));
          }
        }
      } catch (err) {
        console.warn("Could not cascade topology cluster rename:", err);
      }

      // 5. Notify downstream renderers
      if (typeof renderBOM === "function") renderBOM();
      if (typeof renderCableCanvas === "function") renderCableCanvas();
      if (typeof renderTopology === "function") renderTopology();
      if (typeof renderFloorSelector === "function") renderFloorSelector();
      if (typeof StorageService !== "undefined" && typeof StorageService.queueAutoSave === "function") {
        StorageService.queueAutoSave();
      }
    }

    this.notifyWorkspaceChange();
    return space;
  },

  deleteSpace(spaceId, fallbackSpaceId = null) {
    let spaces = this.getSpaces();
    const targetSpace = spaces.find(s => s.id === spaceId);
    if (!targetSpace) return false;

    // Delete or reassign enclosures belonging to this space
    let encs = this.getEnclosures();
    const deletedEncIds = new Set();
    if (fallbackSpaceId) {
      encs.forEach(e => {
        if (e.spaceId === spaceId) e.spaceId = fallbackSpaceId;
      });
    } else {
      encs.forEach(e => {
        if (e.spaceId === spaceId) deletedEncIds.add(e.id);
      });
      encs = encs.filter(e => e.spaceId !== spaceId);
    }
    this.saveEnclosures(encs);

    spaces = spaces.filter(s => s.id !== spaceId);
    this.saveSpaces(spaces);

    // Reassign orphan hardware in this space to Unassigned and purge deleted enclosure frames
    if (typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) {
      for (let i = projectBOM.length - 1; i >= 0; i--) {
        const item = projectBOM[i];
        const itemLoc = this.normalize(item.closetName || item.rackId);
        if (item.isEnclosureFrame && (deletedEncIds.has(item.enclosureId) || (!fallbackSpaceId && (itemLoc.startsWith(`${targetSpace.name} •`) || itemLoc === targetSpace.name)))) {
          projectBOM.splice(i, 1);
          continue;
        }
        if (itemLoc.startsWith(`${targetSpace.name} •`) || itemLoc === targetSpace.name) {
          item.closetName = this.UNASSIGNED;
          item.rackId = this.UNASSIGNED;
          item.rackSlot = null;
        }
      }
    }

    if (typeof renderBOM === "function") renderBOM();
    if (typeof renderCableCanvas === "function") renderCableCanvas();
    if (typeof renderTopology === "function") renderTopology();
    if (typeof renderFloorSelector === "function") renderFloorSelector();
    if (typeof StorageService !== "undefined" && typeof StorageService.queueAutoSave === "function") {
      StorageService.queueAutoSave();
    }

    this.notifyWorkspaceChange();
    return true;
  },

  getEnclosures(spaceId = null) {
    const reqProj = this.getProjectId();
    if (this._cacheProjId === reqProj && Array.isArray(this._enclosuresCache)) return spaceId ? this._enclosuresCache.filter(e => e.spaceId === spaceId) : this._enclosuresCache;
    const projKey = this.getProjectId();
    let list = [];
    try {
      const raw = localStorage.getItem(`netselect_fac_enclosures_${projKey}`);
      list = raw !== null ? JSON.parse(raw) : JSON.parse(JSON.stringify(this.defaultEnclosures));
      if (!Array.isArray(list)) list = [];
    } catch (e) {
      list = JSON.parse(JSON.stringify(this.defaultEnclosures));
    }

    // Ensure all hosts have guaranteed hostType and catalog part specifications
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

      // Tie enclosure to real catalog hardware part if not already specified
      if (!e.catalogSku) {
        const best = this.getBestFitCatalogRack(e);
        if (best) {
          e.catalogSku = best.sku;
          e.catalogModel = best.model;
          e.catalogVendor = best.vendor;
          e.msrp = best.msrp || 0;
          e.maxWeightLbs = best.maxWeightLbs || (e.hostType === "equipment_rack" ? 3000 : 250);
          e.tareWeightLbs = best.tareWeightLbs || (e.hostType === "equipment_rack" ? 275 : 50);
          e.doorType = best.doorType || "Standard Doors";
          if (!e.depthInches && best.depthInches) e.depthInches = best.depthInches;
        }
      }
    });

    this._cacheProjId = projKey;
    this._enclosuresCache = list;
    if (spaceId) {
      return list.filter(e => e.spaceId === spaceId);
    }
    return list;
  },

  /**
   * Resolves the optimal real-world catalog hardware model for an enclosure
   */
  getBestFitCatalogRack(enc) {
    if (!enc) return null;
    if (enc.catalogSku) {
      const found = (typeof CatalogRegistry !== "undefined" && typeof CatalogRegistry.getRack === "function")
        ? CatalogRegistry.getRack(enc.catalogSku)
        : null;
      if (found) return found;
    }

    const hostType = enc.hostType || "equipment_rack";
    const nameLower = (enc.name || "").toLowerCase();
    const ru = parseInt(enc.heightU, 10) || 0;

    let available = [];
    if (typeof CatalogRegistry !== "undefined" && typeof CatalogRegistry.getRacks === "function") {
      available = CatalogRegistry.getRacks(hostType);
    } else if (typeof ACCESSORY_DATABASE !== "undefined") {
      available = ACCESSORY_DATABASE.filter(a => a.type === hostType || a.category === "racks");
    }

    if (available.length === 0) return null;

    if (hostType === "equipment_rack") {
      if (nameLower.includes("wall") || enc.mountingMethod === "wall") {
        if (ru >= 24) return available.find(r => r.sku === "DWR-24-26") || available.find(r => r.sku === "SRW26US") || available[0];
        if (ru >= 18) return available.find(r => r.sku === "DWR-18-26") || available.find(r => r.sku === "SRW18US") || available[0];
        if (ru >= 12) return available.find(r => r.sku === "SRW12US") || available.find(r => r.sku === "UACC-Rack-12U-Wall-SW-G") || available[0];
        return available.find(r => r.sku === "SRW6US") || available[0];
      }
      if (nameLower.includes("2-post") || nameLower.includes("relay")) {
        return available.find(r => r.sku === "CPI-55053-703") || available[0];
      }
      if (ru >= 48) return available.find(r => r.sku === "AR3107") || available[0];
      if (ru === 45) return available.find(r => r.sku === "CPI-55053-703") || available.find(r => r.sku === "CPI-50110-703") || available[0];
      if (ru >= 38) return available.find(r => r.sku === "AR3100") || available.find(r => r.sku === "SR42UB") || available[0];
      if (ru >= 20) return available.find(r => r.sku === "AR3104") || available.find(r => r.sku === "SR24UB") || available[0];
      if (ru >= 12) return available.find(r => r.sku === "SRW12US") || available[0];
      if (ru <= 8) return available.find(r => r.sku === "U-Rack-6U-TL") || available.find(r => r.sku === "SRW6US") || available[0];
      return available.find(r => r.sku === "AR3100") || available[0];
    }

    if (hostType === "security_cabinet") {
      if (enc.subplateBays >= 12 || nameLower.includes("24") || nameLower.includes("large")) {
        return available.find(r => r.sku === "T3KV712") || available.find(r => r.sku === "FPO150/250-4E4") || available[0];
      }
      if (enc.subplateBays >= 8 || nameLower.includes("16") || nameLower.includes("mid")) {
        return available.find(r => r.sku === "T2KV78") || available.find(r => r.sku === "FPO75/250-2E2") || available[0];
      }
      if (nameLower.includes("outdoor") || nameLower.includes("nema")) {
        return available.find(r => r.sku === "Trove1WP1") || available[0];
      }
      return available.find(r => r.sku === "T1KV14") || available.find(r => r.sku === "T2KV78") || available[0];
    }

    if (hostType === "industrial_din") {
      if (nameLower.includes("steel") || enc.railLengthMm >= 400) {
        return available.find(r => r.sku === "A242008LP") || available[0];
      }
      if (enc.dinRails >= 2 || nameLower.includes("dual")) {
        return available.find(r => r.sku === "NF171408") || available[0];
      }
      if (nameLower.includes("flex") || nameLower.includes("utility")) {
        return available.find(r => r.sku === "USW-Flex-Utility") || available[0];
      }
      return available.find(r => r.sku === "NF141208") || available[0];
    }

    if (hostType === "architectural_backboard") {
      if (enc.widthFt <= 4 && enc.heightFt <= 4) {
        return available.find(r => r.sku === "BB-4X4-FR") || available[0];
      }
      return available.find(r => r.sku === "BB-4X8-FR") || available[0];
    }

    return available[0] || null;
  },

  /**
   * Assigns a real catalog hardware product to an enclosure
   */
  setEnclosureCatalogPart(enclosureId, skuOrPart, autoSyncBOM = false) {
    const list = this.getEnclosures();
    const enc = list.find(e => e.id === enclosureId);
    if (!enc) return false;

    let part = null;
    if (skuOrPart && typeof skuOrPart === "object") {
      part = skuOrPart;
    } else if (skuOrPart && typeof skuOrPart === "string") {
      if (skuOrPart === "custom" || skuOrPart === "generic") {
        enc.catalogSku = null;
        enc.catalogModel = "Custom / Unspecified Hardware";
        enc.catalogVendor = "Custom";
        enc.msrp = 0;
        this.saveEnclosures(list);
        if (enc.bomInstanceId) this.syncEnclosureToBOM(enc.id, false);
        this.notifyWorkspaceChange();
        return true;
      }
      part = (typeof CatalogRegistry !== "undefined" && typeof CatalogRegistry.getRack === "function")
        ? CatalogRegistry.getRack(skuOrPart)
        : null;
    }

    if (!part) return false;

    enc.catalogSku = part.sku;
    enc.catalogModel = part.model || part.name;
    enc.catalogVendor = part.vendor;
    enc.msrp = part.msrp || 0;
    enc.depthInches = part.depthInches || enc.depthInches;
    enc.maxWeightLbs = part.maxWeightLbs || (enc.hostType === "equipment_rack" ? 3000 : 250);
    enc.tareWeightLbs = part.tareWeightLbs || (enc.hostType === "equipment_rack" ? 275 : 50);
    enc.doorType = part.doorType || "Standard Doors";
    enc.image = part.image || null;
    enc.datasheetPath = part.datasheetPath || null;

    if (enc.hostType === "equipment_rack" && part.rackUnits && part.rackUnits > 0) {
      enc.heightU = part.rackUnits;
    } else if (enc.hostType === "security_cabinet" && part.subplateBays) {
      enc.subplateBays = part.subplateBays;
    } else if (enc.hostType === "industrial_din" && part.dinRails) {
      enc.dinRails = part.dinRails;
      if (part.railLengthMm) enc.railLengthMm = part.railLengthMm;
    } else if (enc.hostType === "architectural_backboard" && part.widthFt) {
      enc.widthFt = part.widthFt;
      if (part.heightFt) enc.heightFt = part.heightFt;
    }

    this.saveEnclosures(list);

    if (enc.inBOM || autoSyncBOM) {
      this.syncEnclosureToBOM(enc.id, true);
    }

    this.notifyWorkspaceChange();
    return true;
  },

  /**
   * Adds or removes this enclosure hardware as a real priced line item in projectBOM
   */
  syncEnclosureToBOM(enclosureId, shouldBeInBOM = true) {
    if (typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) return false;
    const list = this.getEnclosures();
    const enc = list.find(e => e.id === enclosureId);
    if (!enc) return false;

    const spaces = this.getSpaces();
    const space = spaces.find(s => s.id === enc.spaceId);
    const fullLoc = space ? `${space.name} • ${enc.name}` : enc.name;

    let existingIndex = -1;
    if (enc.bomInstanceId) {
      existingIndex = projectBOM.findIndex(i => i.instanceId === enc.bomInstanceId);
    }
    if (existingIndex === -1) {
      existingIndex = projectBOM.findIndex(i => i.enclosureId === enc.id || (i.isEnclosureFrame && i.closetName === fullLoc));
    }

    if (shouldBeInBOM) {
      const catPart = this.getBestFitCatalogRack(enc);
      const sku = enc.catalogSku || catPart?.sku || "CUSTOM-RACK";
      const model = enc.catalogModel || catPart?.model || `${enc.name} (${enc.heightU || 24}U Enclosure)`;
      const vendor = enc.catalogVendor || catPart?.vendor || "Generic";
      const msrp = (enc.msrp !== undefined) ? enc.msrp : (catPart?.msrp || 0);
      const role = enc.hostType === "equipment_rack" ? "Equipment Rack" : 
                   (enc.hostType === "security_cabinet" ? "Security Cabinet" : 
                   (enc.hostType === "industrial_din" ? "Industrial NEMA Enclosure" : "Architectural Backboard"));

      const instanceId = (existingIndex >= 0 && projectBOM[existingIndex].instanceId) ? projectBOM[existingIndex].instanceId : `enc-bom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      const bomItem = {
        instanceId,
        enclosureId: enc.id,
        isEnclosureFrame: true,
        id: sku,
        sku: sku,
        model: model,
        vendor: vendor,
        role: role,
        category: "racks",
        msrp: msrp,
        rackUnits: enc.heightU || 0,
        depthInches: enc.depthInches || 0,
        baseWatts: 0,
        powerWatts: 0,
        poeBudget: 0,
        closetName: fullLoc,
        rackId: fullLoc,
        qty: 1
      };

      if (existingIndex >= 0) {
        projectBOM[existingIndex] = { ...projectBOM[existingIndex], ...bomItem };
      } else {
        projectBOM.push(bomItem);
      }

      enc.inBOM = true;
      enc.bomInstanceId = instanceId;
      enc.catalogSku = sku;
      enc.catalogModel = model;
      enc.catalogVendor = vendor;
      enc.msrp = msrp;
    } else {
      if (existingIndex >= 0) {
        projectBOM.splice(existingIndex, 1);
      }
      enc.inBOM = false;
      enc.bomInstanceId = null;
    }

    this.saveEnclosures(list);
    if (typeof updateBOMView === "function") updateBOMView();
    if (typeof renderBOM === "function") renderBOM();
    if (typeof StorageService !== "undefined" && typeof StorageService.queueAutoSave === "function") {
      StorageService.queueAutoSave();
    }
    this.notifyWorkspaceChange();
    return true;
  },

  isEnclosureInBOM(enclosureId) {
    if (typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) return false;
    const enc = this.getEnclosures().find(e => e.id === enclosureId);
    if (!enc) return false;
    if (enc.bomInstanceId) {
      return projectBOM.some(i => i.instanceId === enc.bomInstanceId);
    }
    return projectBOM.some(i => i.enclosureId === enc.id);
  },

  // Host Accessor Alias
  getHosts(spaceId = null) {
    return this.getEnclosures(spaceId);
  },

  saveEnclosures(list) {
    try {
      const projKey = this.getProjectId();
      this._cacheProjId = projKey;
      this._enclosuresCache = Array.isArray(list) ? list : [];
      this._safeSetItem(`netselect_fac_enclosures_${projKey}`, JSON.stringify(list));
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
      if (type === "industrial_din" || type === "nema_box" || type === "din_rail" || cleanName.toLowerCase().includes("nema") || cleanName.toLowerCase().includes("din")) {
        hostType = "industrial_din";
      } else if (type === "security_cabinet" || type === "wall_cabinet" || cleanName.toLowerCase().includes("panel") || cleanName.toLowerCase().includes("trove") || cleanName.toLowerCase().includes("ac-") || cleanName.toLowerCase().includes("enc")) {
        hostType = "security_cabinet";
      } else if (type === "structural_mount" || type === "pole" || cleanName.toLowerCase().includes("pole")) {
        hostType = "structural_mount";
      } else if (type === "architectural_backboard" || type === "backboard" || cleanName.toLowerCase().includes("backboard") || cleanName.toLowerCase().includes("plywood")) {
        hostType = "architectural_backboard";
      } else {
        hostType = "equipment_rack";
      }
    }

    const catPart = (options.catalogSku && typeof CatalogRegistry !== "undefined" && typeof CatalogRegistry.getRack === "function")
      ? CatalogRegistry.getRack(options.catalogSku)
      : null;

    const isDin = hostType === "industrial_din" || type === "din_rail" || type === "nema_box";
    const newEnc = {
      id,
      spaceId: spaceId || "space-mdf",
      name: cleanName,
      hostType,
      type: type || (isDin ? "nema_box" : "rack_4post"),
      heightU: parseInt(heightU, 10) || (catPart?.rackUnits !== undefined ? catPart.rackUnits : (hostType === "equipment_rack" ? 24 : 0)),
      isDin,
      maxWatts: parseInt(maxWatts, 10) || (hostType === "equipment_rack" ? 3000 : (hostType === "security_cabinet" ? 1200 : 800)),
      pduCount: hostType === "equipment_rack" ? 2 : 1,
      mountingMethod: options.mountingMethod || (hostType === "industrial_din" ? "wall" : null),
      mountHeightFt: options.mountHeightFt || null,
      // Real Catalog Hardware Integration:
      catalogSku: catPart?.sku || options.catalogSku || null,
      catalogModel: catPart?.model || options.catalogModel || null,
      catalogVendor: catPart?.vendor || options.catalogVendor || null,
      msrp: (catPart?.msrp !== undefined) ? catPart.msrp : (options.msrp || 0),
      maxWeightLbs: catPart?.maxWeightLbs || (hostType === "equipment_rack" ? 3000 : 250),
      tareWeightLbs: catPart?.tareWeightLbs || (hostType === "equipment_rack" ? 275 : 50),
      doorType: catPart?.doorType || "Standard Doors",
      inBOM: !!options.addToBOM,
      bomInstanceId: null,
      // Specific host parameters:
      subplateBays: options.subplateBays || (catPart?.subplateBays) || (hostType === "security_cabinet" ? 8 : null),
      dcVoltage: options.dcVoltage || (hostType === "security_cabinet" ? "dual_12_24" : null),
      dinRails: options.dinRails || (catPart?.dinRails) || (hostType === "industrial_din" ? 2 : null),
      railLengthMm: options.railLengthMm || (catPart?.railLengthMm) || (hostType === "industrial_din" ? 350 : null),
      depthInches: options.depthInches || (catPart?.depthInches) || (hostType === "equipment_rack" ? 36 : null),
      poleDiameterInches: options.poleDiameterInches || (hostType === "structural_mount" ? 4 : null),
      widthFt: options.widthFt || (catPart?.widthFt) || (hostType === "architectural_backboard" ? 4 : null),
      heightFt: options.heightFt || (catPart?.heightFt) || (hostType === "architectural_backboard" ? 8 : null),
      config: options.config || {}
    };
    list.push(newEnc);
    this.saveEnclosures(list);

    if (options.addToBOM) {
      this.syncEnclosureToBOM(newEnc.id, true);
    }

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
    const oldName = host.name;
    if (updates.name) {
      const cleanName = updates.name.trim();
      const spaceId = updates.spaceId || host.spaceId;
      if (list.some(e => e.id !== hostId && e.spaceId === spaceId && e.name.trim().toLowerCase() === cleanName.toLowerCase())) {
        if (typeof showToast === "function") showToast(`An enclosure named "${cleanName}" already exists in this space.`);
        return false;
      }
      updates.name = cleanName;
    }
    const nameChanged = updates.name && updates.name !== oldName;
    const newName = updates.name || oldName;

    Object.assign(host, updates);
    this.saveEnclosures(list);

    if (nameChanged) {
      const spaces = this.getSpaces();
      const space = spaces.find(s => s.id === host.spaceId);
      if (space) {
        const oldLoc = `${space.name} • ${oldName}`;
        const newLoc = `${space.name} • ${newName}`;
        // Cascade to BOM items
        if (typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) {
          projectBOM.forEach(item => {
            if (item.rackId === oldLoc || item.rackId === oldName) {
              item.rackId = newLoc;
            }
            if (item.closetName === oldLoc) {
              item.closetName = newLoc;
            }
          });
        }
      }
      if (typeof renderBOM === "function") renderBOM();
      if (typeof renderCableCanvas === "function") renderCableCanvas();
      if (typeof renderTopology === "function") renderTopology();
      if (typeof StorageService !== "undefined" && typeof StorageService.queueAutoSave === "function") {
        StorageService.queueAutoSave();
      }
    }

    this.notifyWorkspaceChange();
    return host;
  },

  updateEnclosure(enclosureId, updates = {}) {
    return this.updateHost(enclosureId, updates);
  },

  deleteEnclosure(enclosureId, fallbackEnclosureId = null) {
    let encs = this.getEnclosures();
    const targetEnc = encs.find(e => e.id === enclosureId);
    if (!targetEnc) return false;

    // Unassign hardware located in this enclosure and remove the enclosure's own BOM frame
    const spaces = this.getSpaces();
    const space = spaces.find(s => s.id === targetEnc.spaceId);
    const fullLoc = space ? `${space.name} • ${targetEnc.name}` : null;
    if (typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) {
      for (let i = projectBOM.length - 1; i >= 0; i--) {
        const item = projectBOM[i];
        const itemLoc = this.normalize(item.closetName || item.rackId);
        if (item.isEnclosureFrame && (item.enclosureId === enclosureId || (fullLoc && itemLoc === fullLoc))) {
          projectBOM.splice(i, 1);
          continue;
        }
        if ((fullLoc && itemLoc === fullLoc) || item.rackId === enclosureId || item.rackId === targetEnc.name) {
          item.closetName = this.UNASSIGNED;
          item.rackId = this.UNASSIGNED;
          item.rackSlot = null;
        }
      }
    }

    encs = encs.filter(e => e.id !== enclosureId);
    this.saveEnclosures(encs);

    if (typeof renderBOM === "function") renderBOM();
    if (typeof renderCableCanvas === "function") renderCableCanvas();
    if (typeof renderTopology === "function") renderTopology();
    if (typeof StorageService !== "undefined" && typeof StorageService.queueAutoSave === "function") {
      StorageService.queueAutoSave();
    }

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
      this._safeSetItem(`netselect_fac_endpoints_${projKey}`, JSON.stringify(list));
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
  // Canonical Location String Handlers ("Space • Enclosure" or "Floor • Field")
  // -----------------------------------------------------------
  normalize(str) {
    if (!str) return this.UNASSIGNED;
    const strVal = String(str).trim();
    if (!strVal || strVal === this.UNASSIGNED || strVal.toLowerCase() === "unassigned") {
      return this.UNASSIGNED;
    }
    const trimmed = strVal;

    if (trimmed.includes(" • ")) {
      const parts = trimmed.split(" • ");
      const prefix = parts[0].trim();
      const suffix = parts[1].trim();

      // Check if field hardware location
      if (suffix.toLowerCase() === "field" || suffix.toLowerCase() === "space" || suffix.toLowerCase() === "unenclosed") {
        const floors = this.getFloors();
        // If prefix matches a floor name
        const matchFloor = floors.find(f => f.name.toLowerCase() === prefix.toLowerCase());
        if (matchFloor) return `${matchFloor.name} • Field`;

        // If prefix matches a legacy space name, map to that space's floor
        const spaces = this.getSpaces();
        const matchSpace = spaces.find(s => s.name.toLowerCase() === prefix.toLowerCase());
        if (matchSpace) {
          const parentFloor = floors.find(f => f.id === matchSpace.floorId) || floors[0];
          if (parentFloor) return `${parentFloor.name} • Field`;
        }
        return `${prefix} • Field`;
      }
      return trimmed;
    }

    // Check if trimmed matches an existing floor name
    const floors = this.getFloors();
    const matchedFloor = floors.find(f => f.name.toLowerCase() === trimmed.toLowerCase());
    if (matchedFloor) {
      return `${matchedFloor.name} • Field`;
    }

    // Check if trimmed matches an existing space name
    const spaces = this.getSpaces();
    const matchedSpace = spaces.find(s => s.name.toLowerCase() === trimmed.toLowerCase());
    if (matchedSpace) {
      if (matchedSpace.type === "pole") {
        return `${matchedSpace.name} • Pole Mount`;
      }
      const encs = this.getEnclosures(matchedSpace.id);
      if (encs.length > 0) return `${matchedSpace.name} • ${encs[0].name}`;
      return `${matchedSpace.name} • Field`;
    }

    // Intelligent suffixing based on naming context
    const lower = trimmed.toLowerCase();
    if (lower.includes("exterior") || lower.includes("outdoor") || lower.includes("field")) return `Exterior • Field`;
    if (lower.includes("pole") || lower.includes("mast")) return `${trimmed} • Pole Mount`;
    if (lower.includes("wall") || lower.includes("gate")) return `${trimmed} • Wallbox`;
    if (lower.includes("rack") || lower.includes("cabinet") || lower.includes("mdf") || lower.includes("idf")) return `${trimmed} • Rack-1`;
    return `${trimmed} • Field`;
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
    const firstPart = parts[0];
    const secondPart = parts[1] || "Field";

    const floors = this.getFloors();
    const spaces = this.getSpaces();

    const isFieldHardware = secondPart.toLowerCase() === "field" || secondPart.toLowerCase() === "space" || secondPart.toLowerCase() === "field hardware" || secondPart.toLowerCase() === "unenclosed";

    if (isFieldHardware) {
      let floor = floors.find(f => f.name.toLowerCase() === firstPart.toLowerCase());
      const legSpace = spaces.find(s => s.name.toLowerCase() === firstPart.toLowerCase());
      if (!floor && legSpace) {
        floor = floors.find(f => f.id === legSpace.floorId);
      }
      if (!floor && floors.length > 0) floor = floors[0];

      return {
        fullName: normalized,
        space: legSpace ? legSpace.name : (floor ? floor.name : "Field"),
        enclosure: "Field",
        hostName: "Field Hardware",
        spaceId: legSpace ? legSpace.id : null,
        enclosureId: null,
        hostId: null,
        floorId: floor ? floor.id : "floor-1",
        floorName: floor ? floor.name : "Facility",
        heightU: 0,
        isDin: false,
        hostType: "field",
        isRack: false,
        isSecurityCabinet: false,
        isStructuralMount: false,
        isBackboard: false,
        isField: true,
        isUnassigned: false
      };
    }

    const spaceName = firstPart;
    const hostName = secondPart;

    const space = spaces.find(s => s.name.toLowerCase() === spaceName.toLowerCase());
    const encs = this.getEnclosures(space ? space.id : null);
    const enc = encs.find(e => e.name.toLowerCase() === hostName.toLowerCase());

    const isStructuralPole = (hostName.toLowerCase() === "pole mount") || 
      (space && space.type === "pole" && (hostName.toLowerCase().includes("pole") || hostName === "Pole Mount"));

    const hostType = enc ? (enc.hostType || (enc.isDin ? "industrial_din" : "equipment_rack")) : (
      isStructuralPole ? "structural_mount" :
      hostName.toLowerCase().includes("nema") || hostName.toLowerCase().includes("din") ? "industrial_din" :
      hostName.toLowerCase().includes("panel") || hostName.toLowerCase().includes("trove") || hostName.toLowerCase().includes("ac-") ? "security_cabinet" :
      hostName.toLowerCase().includes("backboard") ? "architectural_backboard" : "equipment_rack"
    );

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
      isField: false,
      isUnassigned: false
    };
  },

  // Returns all unified location entries for tool selectors
  getLocations() {
    const spaces = this.getSpaces();
    const enclosures = this.getEnclosures();
    const floors = this.getFloors();
    const list = [];

    // 1. Floor-level field hardware locations (cameras, doors, wireless APs, drops)
    floors.forEach(f => {
      list.push({
        id: `loc-floor-${f.id}-field`,
        name: `${f.name} • Field`,
        displayName: `${f.name} (Field / Unenclosed)`,
        floorId: f.id,
        floorName: f.name,
        space: "Field",
        spaceId: null,
        enclosure: "Field",
        hostName: "Field Hardware",
        enclosureId: null,
        hostId: null,
        hostType: "field",
        isField: true,
        isSpace: false,
        heightU: 0,
        isDin: false
      });
    });

    // 2. Spaces & Mounting Enclosures
    spaces.forEach(s => {
      const spaceEncs = enclosures.filter(e => e.spaceId === s.id);
      const floor = floors.find(f => f.id === s.floorId) || floors[0];
      const isPole = s.type === "pole" || (s.name && String(s.name).toLowerCase().includes("pole"));

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
          // Space with no enclosures is an unenclosed field space/zone
          list.push({
            id: `loc-${s.id}-field`,
            name: `${s.name} • Field`,
            displayName: `${s.name} (Field / Unenclosed)`,
            space: s.name,
            spaceId: s.id,
            enclosure: "Field",
            hostName: "Field Hardware",
            enclosureId: null,
            hostId: null,
            hostType: "field",
            isField: true,
            isSpace: true,
            floorId: s.floorId,
            floorName: floor ? floor.name : "Level 1",
            heightU: 0,
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
            displayName: parsed.isField ? `${parsed.floorName} (Field / Unenclosed)` : parsed.fullName,
            space: parsed.space,
            spaceId: parsed.spaceId,
            enclosure: parsed.enclosure,
            hostName: parsed.hostName,
            enclosureId: parsed.enclosureId,
            hostId: parsed.hostId,
            hostType: parsed.hostType,
            floorId: parsed.floorId || "floor-1",
            floorName: parsed.floorName || "Level 1",
            heightU: parsed.heightU || 24,
            isDin: parsed.isDin || false,
            isField: parsed.isField || false
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
    const fieldLocations = [];
    const enclosures = [];

    locs.forEach(l => {
      if (l.isField || l.hostType === "field") {
        if (!fieldLocations.some(s => s.name === l.name)) {
          fieldLocations.push(l);
        }
      } else {
        if (!enclosures.some(e => e.name === l.name)) {
          enclosures.push(l);
        }
      }
    });

    return {
      unassigned: includeUnassigned ? this.UNASSIGNED : null,
      field: fieldLocations,
      spaces: fieldLocations, // backward compat alias for BOM / other callers
      enclosures
    };
  },

  addLocation(rawInput, floorId = "floor-1") {
    const normalized = this.normalize(rawInput);
    if (normalized === this.UNASSIGNED) return this.UNASSIGNED;

    const parts = normalized.split(" • ");
    const spaceName = parts[0];
    const enclosureName = parts[1];

    if (enclosureName && (enclosureName.toLowerCase() === "field" || enclosureName.toLowerCase() === "space")) {
      const floors = this.getFloors();
      const floor = floors.find(f => f.name.toLowerCase() === spaceName.toLowerCase()) || floors.find(f => f.id === floorId) || floors[0];
      this.notifyWorkspaceChange();
      return `${floor.name} • Field`;
    }

    let spaces = this.getSpaces();
    let space = spaces.find(s => s.name.toLowerCase() === spaceName.toLowerCase());
    if (!space) {
      const isPole = spaceName.toLowerCase().includes("pole");
      const isWall = spaceName.toLowerCase().includes("wall");
      space = this.addSpace(spaceName, isPole ? "pole" : (isWall ? "wallbox" : "idf"), floorId);
    }

    if (enclosureName) {
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
    return `${space.name} • Rack-1`;
  },

  deleteLocation(locationName, fallbackName = this.UNASSIGNED) {
    const target = this.normalize(locationName);
    const fallback = this.normalize(fallbackName);
    const parsed = this.parse(target);

    if (parsed.enclosureId) {
      this.deleteEnclosure(parsed.enclosureId);
    } else if (parsed.isStructuralMount && parsed.spaceId) {
      this.deleteSpace(parsed.spaceId);
    }

    // If deleting an enclosure left a pole space with 0 enclosures, clean up pole space
    if (parsed.spaceId) {
      const remainingEncs = this.getEnclosures(parsed.spaceId);
      const spaceObj = this.getSpaces().find(s => s.id === parsed.spaceId);
      if (spaceObj && spaceObj.type === "pole" && remainingEncs.length === 0) {
        this.deleteSpace(parsed.spaceId);
      }
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

  renameLocation(oldName, newName) {
    if (!oldName || !newName || oldName === newName) return false;
    const oldNorm = this.normalize(oldName);
    const newClean = newName.trim();
    const parsedOld = this.parse(oldNorm);

    // If it's a space or closet name
    if (parsedOld.spaceId) {
      if (!parsedOld.enclosureId || parsedOld.isStructuralMount) {
        return this.updateSpace(parsedOld.spaceId, { name: newClean });
      } else {
        return this.updateEnclosure(parsedOld.enclosureId, { name: newClean });
      }
    }
    // If it matches a floor
    const floors = this.getFloors();
    const floor = floors.find(f => f.name.toLowerCase() === oldNorm.toLowerCase() || (oldNorm.startsWith(f.name + " •")));
    if (floor) {
      return this.updateFloor(floor.id, { name: newClean });
    }
    return false;
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
      const isStacked = item.stackedUnits && item.stackedUnits >= 2;
      const effectiveUnits = isStacked ? Math.max(item.stackedUnits, qty) : qty;
      const baseWatts = (parseFloat(item.baseWatts) || 0) * effectiveUnits;
      const poeBudget = (parseFloat(item.poeBudget) || 0) * effectiveUnits;
      const consumedPoE = parseFloat(item.consumedPoEWatts) || 0;
      const ru = (parseInt(item.rackUnits, 10) || 0) * effectiveUnits;

      totalWatts += baseWatts + consumedPoE;
      totalPoEBudget += poeBudget;
      totalPoEDelivered += consumedPoE;
      totalRuOccupied += ru;
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
  _notifyTimer: null,

  notifyWorkspaceChange(immediate = false) {
    try {
      // 1. Always run fast in-memory taxonomy & BOM normalization synchronously
      if (typeof unbundleMultiQtyCameras === "function" && typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) {
        unbundleMultiQtyCameras(projectBOM);
      }
      if (typeof DeviceTaxonomy !== "undefined" && typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) {
        DeviceTaxonomy.recalculateNumbers(projectBOM);
      }
      if (typeof syncRackInterconnectsAndCabling === "function") {
        syncRackInterconnectsAndCabling();
      }
      if (typeof syncBOMClosetsToFloors === "function") syncBOMClosetsToFloors();
      if (typeof syncBOMDevicesToFloors === "function") syncBOMDevicesToFloors();
      if (typeof saveBOMState === "function") saveBOMState();

      const flushUIRenders = () => {
        this._notifyTimer = null;
        try {
          if (typeof updateBOMView === "function") updateBOMView();

          // Only re-filter hardware catalog grid if none of the fullscreen studio modals are covering it
          const facModal = document.getElementById("facilityModal");
          const topoModal = document.getElementById("topologyModal");
          const cableModal = document.getElementById("cableLayoutModal");
          const facOpen = Boolean(facModal && !facModal.classList.contains("hidden"));
          const topoOpen = Boolean(topoModal && !topoModal.classList.contains("hidden"));
          const cableOpen = Boolean(cableModal && !cableModal.classList.contains("hidden"));

          if (!facOpen && !topoOpen && !cableOpen) {
            if (typeof runActiveFilter === "function") runActiveFilter();
          }

          // 1. Live update Facility Modal (Visualizer or Hierarchy) only if visible
          if (facOpen) {
            if (typeof facilityActiveView !== "undefined" && facilityActiveView === "visualizer") {
              if (typeof renderRackVisualizer === "function") renderRackVisualizer();
            } else {
              if (typeof renderFacilityManager === "function") renderFacilityManager();
            }
          }

          // 2. Live update Topology only if visible
          if (topoOpen) {
            if (typeof renderTopology === "function") renderTopology();
          }

          // 3. Live update Physical Layout Canvas & State only if visible
          if (cableOpen) {
            if (typeof recalculateCurrentFloorCables === "function") recalculateCurrentFloorCables();
            if (typeof renderCableCanvas === "function") renderCableCanvas();
            if (typeof renderSidebarTabContent === "function") renderSidebarTabContent();
            if (typeof renderInspector === "function") renderInspector();
          }
        } catch (innerErr) {
          console.error("Error in FacilityStore UI flush:", innerErr);
        }
      };

      if (immediate) {
        if (this._notifyTimer) clearTimeout(this._notifyTimer);
        flushUIRenders();
      } else {
        if (this._notifyTimer) clearTimeout(this._notifyTimer);
        this._notifyTimer = setTimeout(flushUIRenders, 16);
      }
    } catch (e) {
      console.error("Error in FacilityStore.notifyWorkspaceChange:", e);
    }
  },

  // -----------------------------------------------------------
  // Edge Device & Served Field Drops Analysis
  // -----------------------------------------------------------
  isFieldDevice(item) {
    if (!item) return false;
    if (item.isEnclosureFrame || item.isPassive) return false;
    const role = (item.role || "").trim();
    const cat = (item.category || "").toLowerCase().trim();

    const nonFieldRoles = [
      "Access", "Core", "Core & Agg", "Aggregation", "Gateways & WAN", "Security WAN", "Firewall",
      "Server", "VMS Server", "Compute & Storage", "Storage Drives & SAN",
      "UPS", "Rack UPS Power", "PDU", "Rackmount PDU",
      "Equipment Rack", "19\" Equipment Racks", "Cabinets & Enclosures",
      "Security Cabinet", "Industrial NEMA Enclosure", "Architectural Backboard",
      "Enclosure", "Patch Panel", "Structured Cabling", "Optics & DAC",
      "Mgmt License", "Security License", "Feature License", "Stacking Cable",
      "Accessory", "Power Jumper Cable", "Pathways & J-Hooks", "Mounting Hardware"
    ];
    if (nonFieldRoles.includes(role)) return false;

    const nonFieldCats = [
      "racks", "enclosures", "cabinets", "ups", "pdu", "rack_pdu", "power_distribution",
      "power_cords", "pathways", "mounting_hardware", "infrastructure", "passive",
      "cabling", "optics", "license", "switch", "switches", "firewall", "server", "storage"
    ];
    if (nonFieldCats.includes(cat)) return false;

    if (typeof DeviceTaxonomy !== "undefined") {
      if (typeof DeviceTaxonomy.isPassiveOrHostInfrastructure === "function" && DeviceTaxonomy.isPassiveOrHostInfrastructure(item)) return false;
      if (typeof DeviceTaxonomy.isPowerDistributionOrBackup === "function" && DeviceTaxonomy.isPowerDistributionOrBackup(item)) return false;
      if (typeof DeviceTaxonomy.isCamera === "function" && DeviceTaxonomy.isCamera(item)) return true;
      if (typeof DeviceTaxonomy.isAccessControl === "function" && DeviceTaxonomy.isAccessControl(item)) return true;
      if (typeof DeviceTaxonomy.isIntercom === "function" && DeviceTaxonomy.isIntercom(item)) return true;
      if (typeof DeviceTaxonomy.isWireless === "function" && DeviceTaxonomy.isWireless(item)) return true;
      if (typeof DeviceTaxonomy.isFieldDevice === "function" && DeviceTaxonomy.isFieldDevice(item)) return true;
    }
    if (role === "Camera" || role === "Access Control" || role === "Intercom" || role === "Field Drop") return true;
    if (cat.includes("camera") || cat.includes("access") || cat.includes("intercom") || cat.includes("sensor")) return true;
    const loc = item.closetName || item.rackId || "";
    if (typeof isFieldLocation === "function" && isFieldLocation(loc)) return true;
    if (loc.endsWith("• Field") || loc.toLowerCase().includes("field")) return true;
    return false;
  },

  getDevicePhysicalFloor(item) {
    if (!item) return "Main Floor";

    // 1. Check physical floor canvas placement in facilityFloors
    if (typeof facilityFloors !== "undefined" && Array.isArray(facilityFloors)) {
      for (const fl of facilityFloors) {
        const drop = (fl.nodes || []).find(n => 
          n.instanceId === item.instanceId || 
          n.id === `dev-${item.instanceId}` || 
          n.id === item.instanceId
        );
        if (drop) {
          return fl.name || "Main Floor";
        }
      }
    }

    // 2. Check explicit floor fields on item
    if (item.floorName && item.floorName.trim()) return item.floorName.trim();
    if (item.floor && item.floor.trim()) return item.floor.trim();
    if (item.floorId) {
      const fl = this.getFloors().find(f => f.id === item.floorId);
      if (fl && fl.name) return fl.name;
    }

    // 3. Check item.closetName or item.rackId for floor prefix (e.g. "First Floor • Field", "Exterior • Camera 1")
    const rawLoc = (item.closetName || item.rackId || "").trim();
    if (rawLoc) {
      const allFloors = this.getFloors();
      for (const fl of allFloors) {
        const fnLower = fl.name.toLowerCase();
        const rLower = rawLoc.toLowerCase();
        if (rLower === fnLower || rLower.startsWith(fnLower + " •") || rLower.startsWith(fnLower + " -") || rLower.startsWith(fnLower + " ")) {
          return fl.name;
        }
      }
      if (rawLoc.toLowerCase().includes("exterior") || rawLoc.toLowerCase().includes("outdoor") || rawLoc.toLowerCase().includes("perimeter") || rawLoc.toLowerCase().includes("gate")) {
        return "Exterior";
      }
    }

    // 4. Default fallback
    const floors = this.getFloors();
    if (floors.length > 0) {
      return floors[0].name || "Main Floor";
    }
    return "Main Floor";
  },

  getEnclosureServedDrops(locName) {
    if (typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) {
      return { totalDrops: 0, totalWatts: 0, byFloor: {}, items: [] };
    }

    const normLoc = this.normalize(locName);
    const parsed = this.parse(locName);
    const spaceNameLower = (parsed.space || "").toLowerCase();

    // Find all switches or hosts located in this enclosure
    const hostedUnits = projectBOM.filter(i => {
      if (i.parentInstanceId) return false;
      const iLoc = this.normalize(i.closetName || i.rackId);
      return iLoc === normLoc;
    });
    const hostedIds = new Set(hostedUnits.map(h => h.instanceId));

    const servedItems = [];
    const visitedIds = new Set();

    projectBOM.forEach(item => {
      if (item.parentInstanceId) return;
      if (visitedIds.has(item.instanceId)) return;
      if (!this.isFieldDevice(item)) return;

      let isServed = false;

      // 1. Direct uplink switch match
      if (item.uplinkTargetId && hostedIds.has(item.uplinkTargetId)) {
        isServed = true;
      }

      // 2. Physical layout canvas drop assigned closet match
      if (!isServed && typeof facilityFloors !== "undefined" && Array.isArray(facilityFloors)) {
        for (const fl of facilityFloors) {
          const drop = (fl.nodes || []).find(n => 
            n.instanceId === item.instanceId || 
            n.id === `dev-${item.instanceId}` || 
            n.id === item.instanceId
          );
          if (drop && drop.assignedClosetId) {
            const allClosets = (typeof getAllClosetsAcrossFacility === "function") ? getAllClosetsAcrossFacility() : [];
            const closet = allClosets.find(c => c.id === drop.assignedClosetId);
            if (closet && (this.normalize(closet.name) === normLoc || closet.name.toLowerCase().startsWith(spaceNameLower))) {
              isServed = true;
              break;
            }
          }
        }
      }

      // 3. Fallback: item's assigned location matches enclosure
      if (!isServed) {
        const itemLoc = this.normalize(item.closetName || item.rackId);
        if (itemLoc === normLoc) {
          isServed = true;
        }
      }

      if (isServed) {
        visitedIds.add(item.instanceId);
        servedItems.push(item);
      }
    });

    const byFloor = {};
    let totalWatts = 0;
    let totalDrops = 0;

    servedItems.forEach(dev => {
      const qty = parseInt(dev.qty, 10) || 1;
      const floor = this.getDevicePhysicalFloor(dev);
      const watts = (parseFloat(dev.consumedPoEWatts || dev.powerConsumptionWatts || dev.baseWatts || 0)) * qty;

      if (!byFloor[floor]) {
        byFloor[floor] = { count: 0, watts: 0, cameras: 0, doors: 0, other: 0 };
      }
      byFloor[floor].count += qty;
      byFloor[floor].watts += watts;
      totalDrops += qty;
      totalWatts += watts;

      if (dev.role === "Camera" || (dev.category && dev.category.includes("camera"))) {
        byFloor[floor].cameras += qty;
      } else if (dev.role === "Access Control" || (dev.category && dev.category.includes("access"))) {
        byFloor[floor].doors += qty;
      } else {
        byFloor[floor].other += qty;
      }
    });

    return { totalDrops, totalWatts: Math.round(totalWatts), byFloor, items: servedItems };
  },

  getFloorDropsSummary(floorName) {
    if (typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) {
      return { dropCount: 0, totalWatts: 0, servingEnclosures: [], servingDetails: {} };
    }

    const floorNameLower = (floorName || "").toLowerCase().trim();
    const floorDrops = projectBOM.filter(item => {
      if (item.parentInstanceId) return false;
      if (!this.isFieldDevice(item)) return false;
      return this.getDevicePhysicalFloor(item).toLowerCase().trim() === floorNameLower;
    });

    const servingCounts = {};
    let totalWatts = 0;
    let totalDrops = 0;

    floorDrops.forEach(dev => {
      const qty = parseInt(dev.qty, 10) || 1;
      totalDrops += qty;
      totalWatts += (parseFloat(dev.consumedPoEWatts || dev.powerConsumptionWatts || dev.baseWatts || 0)) * qty;

      let servingSpace = "Unassigned";
      if (dev.uplinkTargetId) {
        const sw = projectBOM.find(s => s.instanceId === dev.uplinkTargetId);
        if (sw && sw.closetName) {
          servingSpace = this.parse(sw.closetName).space;
        }
      }
      if (servingSpace === "Unassigned" && typeof facilityFloors !== "undefined" && Array.isArray(facilityFloors)) {
        for (const fl of facilityFloors) {
          const drop = (fl.nodes || []).find(n => n.instanceId === dev.instanceId || n.id === `dev-${dev.instanceId}` || n.id === dev.instanceId);
          if (drop && drop.assignedClosetId) {
            const allClosets = (typeof getAllClosetsAcrossFacility === "function") ? getAllClosetsAcrossFacility() : [];
            const closet = allClosets.find(c => c.id === drop.assignedClosetId);
            if (closet) {
              servingSpace = this.parse(closet.name).space;
              break;
            }
          }
        }
      }
      if (servingSpace === "Unassigned" && dev.closetName && !this.normalize(dev.closetName).endsWith("• Field")) {
        servingSpace = this.parse(dev.closetName).space;
      }
      servingCounts[servingSpace] = (servingCounts[servingSpace] || 0) + qty;
    });

    const servingList = Object.entries(servingCounts).map(([spaceName, count]) => `${count} to ${spaceName}`);
    return {
      dropCount: totalDrops,
      totalWatts: Math.round(totalWatts),
      servingEnclosures: servingList,
      servingDetails: servingCounts
    };
  }
};

