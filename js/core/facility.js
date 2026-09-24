// =========================================================================
// FACILITY & LOCATION STORE (NetSelect Enterprise)
// Single Source of Truth for Floors, Rooms, Enclosures & Event Dispatching
// =========================================================================

const FacilityStore = {
  UNASSIGNED: "Unassigned",

  // Standardized Canonical Default Locations
  defaults: [
    { id: "loc-mdf", name: "MDF • Rack-1", space: "MDF", enclosure: "Rack-1", floorId: "floor-1" },
    { id: "loc-idf1", name: "IDF-1 • Rack-1", space: "IDF-1", enclosure: "Rack-1", floorId: "floor-1" },
    { id: "loc-pole1", name: "Pole 1 • NEMA-Box", space: "Pole 1", enclosure: "NEMA-Box", floorId: "floor-1" },
    { id: "loc-guard", name: "Guard Shack • Rack-1", space: "Guard Shack", enclosure: "Rack-1", floorId: "floor-1" }
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

  // Standardize any arbitrary or legacy location string into "Space • Enclosure"
  normalize(str) {
    if (!str || !str.trim()) return this.UNASSIGNED;
    const trimmed = str.trim();

    // Preserve the clean Unassigned holding bin
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

  // Parse location into display components
  parse(str) {
    const normalized = this.normalize(str);
    if (normalized === this.UNASSIGNED) {
      return {
        fullName: this.UNASSIGNED,
        space: "Unassigned",
        enclosure: "Holding Bin"
      };
    }
    const parts = normalized.split(" • ");
    return {
      fullName: normalized,
      space: parts[0],
      enclosure: parts[1] || "Rack-1"
    };
  },

  // Retrieve all active locations for the current project
  getLocations() {
    const projKey = this.getProjectId();
    let list = [];
    try {
      const raw = localStorage.getItem(`netselect_facility_locations_${projKey}`);
      list = raw ? JSON.parse(raw) : [...this.defaults];
    } catch (e) {
      list = [...this.defaults];
    }

    // Auto-discover and index any new locations stored directly on BOM hardware items
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
            enclosure: parsed.enclosure,
            floorId: "floor-1"
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

    const parsed = this.parse(normalized);
    const list = this.getLocations();

    if (!list.some(l => l.name === normalized)) {
      list.push({
        id: `loc-${Date.now()}`,
        name: normalized,
        space: parsed.space,
        enclosure: parsed.enclosure,
        floorId
      });
      this.saveLocations(list);
    }
    return normalized;
  },

  deleteLocation(locationName, fallbackName = this.UNASSIGNED) {
    const target = this.normalize(locationName);
    const fallback = this.normalize(fallbackName);
    let list = this.getLocations();

    if (list.length <= 1) {
      alert("At least one telecommunications enclosure/cabinet must remain in the project.");
      return false;
    }

    list = list.filter(l => l.name !== target);
    this.saveLocations(list);

    // Reassign orphan hardware in the project quote to Unassigned or fallback
    if (typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) {
      projectBOM.forEach(item => {
        if (this.normalize(item.closetName) === target || this.normalize(item.rackId) === target) {
          item.closetName = fallback;
          item.rackId = fallback;
          item.rackSlot = null;
        }
      });
      this.notifyWorkspaceChange();
    }

    return true;
  },

  saveLocations(list) {
    try {
      const projKey = this.getProjectId();
      localStorage.setItem(`netselect_facility_locations_${projKey}`, JSON.stringify(list));
    } catch (e) {}
  },

  // =========================================================================
  // UNIFIED WORKSPACE DISPATCHER (Fixes Item A: Cross-Modal Sync Drift)
  // =========================================================================
  notifyWorkspaceChange() {
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
  }
};