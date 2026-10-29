// ==========================================
// STORAGE & PROJECT PERSISTENCE SERVICE (NetSelect Enterprise)
// Isolated LocalStorage, Multi-Project Snapshots, Unified Manifest Schema v2, JSON Import/Export
// ==========================================

// Global Security Utilities
if (typeof window.escapeHTML !== "function") {
  window.escapeHTML = function(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };
}

if (typeof window.escapeJSAttr !== "function") {
  window.escapeJSAttr = function(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/\\/g, "\\x5c")
      .replace(/'/g, "\\x27")
      .replace(/"/g, "\\x22")
      .replace(/`/g, "\\x60")
      .replace(/</g, "\\x3c")
      .replace(/>/g, "\\x3e")
      .replace(/&/g, "\\x26")
      .replace(/\r/g, "\\r")
      .replace(/\n/g, "\\n");
  };
}

if (typeof window.escapeCSVCell !== "function") {
  window.escapeCSVCell = function(val) {
    if (val === null || val === undefined) return '""';
    let str = String(val);
    if (/^[=+\-@\t\r]/.test(str) && !/^-[0-9]+(\.[0-9]+)?$/.test(str)) {
      str = "'" + str;
    }
    return '"' + str.replace(/"/g, '""') + '"';
  };
}

if (typeof window.safeJsonParse !== "function") {
  window.safeJsonParse = function(raw, fallback = null) {
    if (!raw || typeof raw !== "string") return fallback;
    try {
      return JSON.parse(raw, (key, value) => {
        if (key === "__proto__" || key === "constructor" || key === "prototype") return undefined;
        return value;
      });
    } catch (e) {
      return fallback;
    }
  };
}

if (typeof window.safeCreateIcons !== "function") {
  window.safeCreateIcons = function(rootElement) {
    if (typeof lucide !== "undefined" && typeof lucide.createIcons === "function") {
      try {
        if (rootElement && rootElement instanceof Element) {
          lucide.createIcons({ root: rootElement });
        } else {
          lucide.createIcons();
        }
      } catch (e) {
        try { lucide.createIcons(); } catch (err) {}
      }
    }
  };
}

// ==========================================
// INDEXED-DB BLUEPRINT & BLOB OFFLOAD ENGINE
// Offloads and deduplicates heavy base64 floorplan rasters out of 5MB LocalStorage
// ==========================================
const BlueprintCache = new Map();

const NetSelectIDB = {
  DB_NAME: "netselect_enterprise_db",
  DB_VERSION: 1,
  STORE_BLUEPRINTS: "blueprints",
  _dbPromise: null,

  open() {
    if (this._dbPromise) return this._dbPromise;
    if (typeof indexedDB === "undefined") return Promise.resolve(null);
    this._dbPromise = new Promise((resolve) => {
      try {
        const req = indexedDB.open(this.DB_NAME, this.DB_VERSION);
        req.onupgradeneeded = (ev) => {
          const db = ev.target.result;
          if (!db.objectStoreNames.contains(this.STORE_BLUEPRINTS)) {
            db.createObjectStore(this.STORE_BLUEPRINTS, { keyPath: "ref" });
          }
        };
        req.onsuccess = (ev) => resolve(ev.target.result);
        req.onerror = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    });
    return this._dbPromise;
  },

  computeBlueprintRef(dataUrl) {
    let h1 = 0x811c9dc5;
    let h2 = 0x01000193;
    const len = dataUrl.length;
    const step = len > 16384 ? Math.floor(len / 8192) : 1;
    for (let i = 0; i < len; i += step) {
      const c = dataUrl.charCodeAt(i);
      h1 ^= c;
      h1 = Math.imul(h1, 0x01000193);
      h2 ^= (c + (i & 0xff));
      h2 = Math.imul(h2, 0x85ebca6b);
    }
    const hex1 = (h1 >>> 0).toString(16).padStart(8, "0");
    const hex2 = (h2 >>> 0).toString(16).padStart(8, "0");
    return `idb://bp_${hex1}${hex2}_${len}`;
  },

  async putBlueprint(ref, dataUrl) {
    if (!ref || !dataUrl) return false;
    BlueprintCache.set(ref, dataUrl);
    const db = await this.open();
    if (!db) return false;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(this.STORE_BLUEPRINTS, "readwrite");
        const store = tx.objectStore(this.STORE_BLUEPRINTS);
        store.put({ ref, dataUrl, updatedAt: Date.now() });
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch (e) {
        resolve(false);
      }
    });
  },

  async getBlueprint(ref) {
    if (!ref) return null;
    if (BlueprintCache.has(ref)) return BlueprintCache.get(ref);
    const db = await this.open();
    if (!db) return null;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(this.STORE_BLUEPRINTS, "readonly");
        const store = tx.objectStore(this.STORE_BLUEPRINTS);
        const req = store.get(ref);
        req.onsuccess = () => {
          const val = req.result ? req.result.dataUrl : null;
          if (val) BlueprintCache.set(ref, val);
          resolve(val);
        };
        req.onerror = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    });
  },

  async preloadAllToCache() {
    const db = await this.open();
    if (!db) return;
    try {
      const tx = db.transaction(this.STORE_BLUEPRINTS, "readonly");
      const store = tx.objectStore(this.STORE_BLUEPRINTS);
      const req = store.getAll();
      req.onsuccess = () => {
        const rows = req.result || [];
        rows.forEach((r) => {
          if (r && r.ref && r.dataUrl) {
            BlueprintCache.set(r.ref, r.dataUrl);
          }
        });
        if (typeof facilityFloors !== "undefined" && Array.isArray(facilityFloors)) {
          let hydratedAny = false;
          facilityFloors.forEach((f) => {
            if (f && typeof f.image === "string" && f.image.startsWith("idb://") && BlueprintCache.has(f.image)) {
              f.image = BlueprintCache.get(f.image);
              hydratedAny = true;
            }
          });
          if (hydratedAny && typeof renderCableCanvas === "function") {
            renderCableCanvas();
          }
        }
      };
    } catch (e) {}
  }
};

window.NetSelectIDB = NetSelectIDB;
window.BlueprintCache = BlueprintCache;
NetSelectIDB.preloadAllToCache();

const StorageService = {
  AUTO_SAVE_DEBOUNCE_MS: 300,
  _autoSaveTimer: null,
  _pendingDeleteProjectId: null,
  _pendingClearAllProjects: false,

  /**
   * Offloads heavy base64 floorplan images into IndexedDB + BlueprintCache,
   * returning a lightweight cloned floors array safe for LocalStorage serialization.
   */
  offloadFloorBlueprints(floors) {
    if (!Array.isArray(floors)) return [];
    return floors.map((f) => {
      if (!f || typeof f !== "object") return f;
      const copy = JSON.parse(JSON.stringify(f));
      if (typeof copy.image === "string" && copy.image.startsWith("data:image/") && copy.image.length > 2048) {
        const ref = NetSelectIDB.computeBlueprintRef(copy.image);
        NetSelectIDB.putBlueprint(ref, copy.image);
        copy.image = ref;
      }
      return copy;
    });
  },

  /**
   * Restores idb:// blueprint references on a floor array from BlueprintCache (sync)
   * or IndexedDB (async fallback with optional re-render callback).
   */
  hydrateFloorBlueprints(floors, onAsyncHydrated = null) {
    if (!Array.isArray(floors)) return floors;
    let pendingAsync = 0;
    floors.forEach((f) => {
      if (!f || typeof f.image !== "string" || !f.image.startsWith("idb://")) return;
      const ref = f.image;
      if (BlueprintCache.has(ref)) {
        f.image = BlueprintCache.get(ref);
      } else {
        pendingAsync++;
        NetSelectIDB.getBlueprint(ref).then((dataUrl) => {
          if (dataUrl) {
            f.image = dataUrl;
          }
          pendingAsync--;
          if (pendingAsync === 0) {
            if (typeof onAsyncHydrated === "function") onAsyncHydrated();
            else if (typeof renderCableCanvas === "function") renderCableCanvas();
          }
        });
      }
    });
    return floors;
  },

  /**
   * Safely writes to LocalStorage with QuotaExceededError protection
   */
  safeSetItem(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      if (e.name === "QuotaExceededError" || e.code === 22 || e.code === 1014) {
        console.error("[StorageService] LocalStorage quota exceeded:", e);
        if (typeof showToast === "function") {
          showToast("Storage quota limit reached! Please export or delete older project snapshots.");
        }
      } else {
        console.error("[StorageService] LocalStorage write error:", e);
      }
      return false;
    }
  },

  /**
   * Returns the active project identifier
   */
  getActiveProjectId() {
    if (typeof FacilityStore !== "undefined" && typeof FacilityStore.getProjectId === "function") {
      return FacilityStore.getProjectId();
    }
    try {
      return localStorage.getItem("netselect_active_project_id") || "default";
    } catch (e) {
      return "default";
    }
  },

  /**
   * Returns the user-friendly name of the currently active project
   */
  getActiveProjectName() {
    try {
      const stored = localStorage.getItem("netselect_active_project_name");
      if (stored && stored.trim()) return stored.trim();
    } catch (e) {}
    const label = document.getElementById("activeProjectLabel");
    if (label && label.innerText && label.innerText.trim()) {
      return label.innerText.trim();
    }
    return "Default Project";
  },

  /**
   * Updates the active project name in storage and header UI
   */
  setActiveProjectName(name) {
    const clean = (name || "Project").replace(/[<>"'/]/g, '').trim().slice(0, 80) || "Project";
    this.safeSetItem("netselect_active_project_name", clean);
    const label = document.getElementById("activeProjectLabel");
    if (label) label.innerText = clean;
    const modalTitle = document.getElementById("modalActiveProjectTitle");
    if (modalTitle) modalTitle.innerText = clean;
    return clean;
  },

  /**
   * Schedules a debounced snapshot save
   */
  queueAutoSave() {
    clearTimeout(this._autoSaveTimer);
    this._autoSaveTimer = setTimeout(() => {
      this.saveStateToLocalStorage();
    }, this.AUTO_SAVE_DEBOUNCE_MS);
  },

  /**
   * Persists active workspace state to LocalStorage (project-isolated)
   */
  saveStateToLocalStorage() {
    try {
      const projId = this.getActiveProjectId();
      const projName = this.getActiveProjectName();
      const state = {
        projectName: projName,
        projectBOM: (typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) ? projectBOM : [],
        demandCounts: (typeof demandCounts !== "undefined") ? demandCounts : {},
        extraHeadroomPercent: (typeof extraHeadroomPercent !== "undefined") ? extraHeadroomPercent : 20,
        globalSelectedTerm: typeof globalSelectedTerm !== "undefined" ? globalSelectedTerm : "1YR",
        timestamp: Date.now()
      };
      this.safeSetItem(`netselect_active_state_${projId}`, JSON.stringify(state));
      this.safeSetItem("netselect_active_project_id", projId);
      this.safeSetItem("netselect_active_project_name", projName);
    } catch (e) {
      console.warn("[StorageService] Failed to save active state:", e);
    }
  },

  /**
   * Restores workspace state from LocalStorage on page initialization
   */
  restoreStateFromLocalStorage() {
    try {
      const projId = localStorage.getItem("netselect_active_project_id") || "default";
      const projName = localStorage.getItem("netselect_active_project_name") || "Default Project";

      if (typeof FacilityStore !== "undefined" && typeof FacilityStore.setProjectId === "function") {
        FacilityStore.setProjectId(projId);
      }

      this.setActiveProjectName(projName);

      const raw = localStorage.getItem(`netselect_active_state_${projId}`) || localStorage.getItem("netselect_active_state_v1");
      if (!raw) return;
      const parsed = JSON.parse(raw);

      if (Array.isArray(parsed.projectBOM) && typeof projectBOM !== "undefined") {
        projectBOM.length = 0;
        projectBOM.push(...parsed.projectBOM);
        if (typeof unbundleMultiQtyCameras === "function") {
          unbundleMultiQtyCameras(projectBOM);
        }
      }
      if (parsed.demandCounts && typeof demandCounts !== "undefined") {
        Object.assign(demandCounts, parsed.demandCounts);
      }
      if (typeof parsed.extraHeadroomPercent !== "undefined" && typeof extraHeadroomPercent !== "undefined") {
        extraHeadroomPercent = parsed.extraHeadroomPercent;
      }
      if (parsed.globalSelectedTerm && typeof globalSelectedTerm !== "undefined") {
        globalSelectedTerm = parsed.globalSelectedTerm;
      }
    } catch (e) {
      console.warn("[StorageService] Failed to restore active state:", e);
    }
  },

  /**
   * Toggles the project manager modal
   */
  toggleProjectModal() {
    const modal = document.getElementById("projectModal");
    if (!modal) return;
    modal.classList.toggle("hidden");
    if (!modal.classList.contains("hidden")) {
      this._pendingDeleteProjectId = null;
      this._pendingClearAllProjects = false;
      this.renderSavedProjectsList();
      if (typeof renderProjectDefaultsSummary === "function") {
        renderProjectDefaultsSummary();
      }
    }
  },

  /**
   * Retrieves the technical standards & subsystem defaults for a project
   */
  getProjectDefaults(projId = null) {
    const pId = projId || this.getActiveProjectId();
    try {
      const raw = localStorage.getItem(`netselect_project_defaults_${pId}`);
      if (raw) return JSON.parse(raw);
    } catch (e) {}

    if (typeof DEFAULT_PROJECT_STANDARDS !== "undefined") {
      const copy = JSON.parse(JSON.stringify(DEFAULT_PROJECT_STANDARDS));
      copy.metadata.projectName = this.getActiveProjectName();
      return copy;
    }

    return {
      metadata: {
        projectName: this.getActiveProjectName() || "New Project",
        jobOpportunityNumber: "",
        clientName: "",
        siteAddress: "",
        leadDesigner: ""
      },
      licensing: {
        globalSelectedTerm: typeof globalSelectedTerm !== "undefined" ? globalSelectedTerm : "1YR"
      },
      accessControl: {
        enabled: true,
        engine: "Genetec",
        readerProtocol: "osdp"
      },
      vms: {
        enabled: true,
        platform: "Milestone XProtect",
        cameraVendors: ["Axis Communications", "Hanwha Vision", "Avigilon"],
        retentionDays: 30,
        promptAnalytics: true
      },
      cabling: {
        horizontalCategories: ["C6A-CMP-1K-BL"],
        compositeType: "AC-COMP-CMP-500",
        rackTermination: "patch_panels",
        patchCordLength: 0.5,
        patchCordColors: { security: "Yellow", data: "Blue" },
        fiberType: (typeof getProjectFiberType === "function") ? getProjectFiberType() : "mmf"
      }
    };
  },

  /**
   * Persists project-wide technical defaults and synchronizes runtime engines
   */
  setProjectDefaults(defaults, projId = null, opts = {}) {
    if (!defaults) return;
    const pId = projId || this.getActiveProjectId();
    this.safeSetItem(`netselect_project_defaults_${pId}`, JSON.stringify(defaults));

    if (defaults.metadata?.projectName) {
      this.setActiveProjectName(defaults.metadata.projectName);
    }
    if (defaults.licensing?.globalSelectedTerm && typeof globalSelectedTerm !== "undefined") {
      globalSelectedTerm = defaults.licensing.globalSelectedTerm;
      const tSel = document.getElementById("globalLicTermSelect");
      if (tSel) tSel.value = globalSelectedTerm;
    }
    if (defaults.cabling?.fiberType && typeof setProjectFiberType === "function") {
      setProjectFiberType(defaults.cabling.fiberType, true, true);
    }
    if (defaults.cabling?.horizontalCategories?.length > 0 && typeof activeCableSku !== "undefined") {
      activeCableSku = defaults.cabling.horizontalCategories[0];
      const cSel = document.getElementById("cableSkuSelect");
      if (cSel) cSel.value = activeCableSku;
    }
    if (!opts.skipEngineSync && typeof syncRuntimeEnginesFromProjectDefaults === "function") {
      syncRuntimeEnginesFromProjectDefaults(defaults);
    }
    return defaults;
  },

  /**
   * Gathers all subsystem data for the active project into a complete, portable bundle
   */
  bundleCurrentProject(nameOverride = null) {
    const projId = this.getActiveProjectId();
    const projName = nameOverride || this.getActiveProjectName();

    let facilityHierarchy = {
      floors: [],
      spaces: [],
      enclosures: [],
      endpoints: []
    };

    if (typeof FacilityStore !== "undefined") {
      try {
        if (typeof FacilityStore.getFloors === "function") facilityHierarchy.floors = FacilityStore.getFloors();
        if (typeof FacilityStore.getSpaces === "function") facilityHierarchy.spaces = FacilityStore.getSpaces();
        if (typeof FacilityStore.getEnclosures === "function") facilityHierarchy.enclosures = FacilityStore.getEnclosures();
        if (typeof FacilityStore.getEndpoints === "function") facilityHierarchy.endpoints = FacilityStore.getEndpoints();
      } catch (e) {}
    }

    let physicalCanvas = null;
    if (typeof facilityFloors !== "undefined" && Array.isArray(facilityFloors)) {
      physicalCanvas = {
        activeFloorId: typeof activeFloorId !== "undefined" ? activeFloorId : "floor-1",
        activeCableSku: typeof activeCableSku !== "undefined" ? activeCableSku : "CAT6A-UTP-PLEN",
        useOrthogonalRouting: typeof useOrthogonalRouting !== "undefined" ? useOrthogonalRouting : false,
        facilityFloors: JSON.parse(JSON.stringify(facilityFloors))
      };
    } else {
      try {
        const rawFac = localStorage.getItem(`netselect_facility_${projId}`);
        if (rawFac) physicalCanvas = JSON.parse(rawFac);
      } catch (e) {}
    }

    if (physicalCanvas && Array.isArray(physicalCanvas.facilityFloors)) {
      this.hydrateFloorBlueprints(physicalCanvas.facilityFloors);
    }

    let topologyPositions = {};
    try {
      const rawTopo = localStorage.getItem(`netselect_topo_pos_${projId}`);
      if (rawTopo) topologyPositions = JSON.parse(rawTopo);
    } catch (e) {}

    const rackHeights = {};
    const rackPdus = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(`netselect_rack_height_${projId}_`)) {
          const rackId = k.replace(`netselect_rack_height_${projId}_`, '');
          rackHeights[rackId] = parseInt(localStorage.getItem(k), 10) || 42;
        } else if (k && k.startsWith("rack_pdu_config_")) {
          const rackId = k.replace("rack_pdu_config_", '');
          rackPdus[rackId] = localStorage.getItem(k);
        }
      }
    } catch (e) {}

    return {
      schemaVersion: window.SCHEMA_VERSION || "2.1.0",
      appVersion: window.APP_VERSION || "0.11.0-beta.1",
      projectId: projId,
      projectName: projName,
      createdAt: new Date().toISOString(),
      updatedAt: Date.now(),
      globalSelectedTerm: typeof globalSelectedTerm !== "undefined" ? globalSelectedTerm : "1YR",
      calculator: {
        demandCounts: typeof demandCounts !== "undefined" ? JSON.parse(JSON.stringify(demandCounts)) : { af: 0, at: 0, bt60: 0, bt90: 0 },
        extraHeadroomPercent: typeof extraHeadroomPercent !== "undefined" ? extraHeadroomPercent : 20
      },
      projectBOM: (typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) ? JSON.parse(JSON.stringify(projectBOM)) : [],
      facilityHierarchy,
      physicalCanvas,
      topology: {
        positions: topologyPositions
      },
      rackSettings: {
        heights: rackHeights,
        pdus: rackPdus
      },
      projectFiberType: (typeof getProjectFiberType === "function") ? getProjectFiberType() : "mmf",
      linkInterconnectOverrides: (typeof getLinkInterconnectOverrides === "function") ? getLinkInterconnectOverrides() : {},
      projectDefaults: this.getProjectDefaults(projId)
    };
  },

  /**
   * Applies a complete project bundle to active memory and storage
   */
  applyProjectBundle(bundle) {
    if (!bundle || typeof bundle !== "object") return;

    clearTimeout(this._autoSaveTimer);
    if (typeof FacilityStore !== "undefined" && FacilityStore._notifyTimer) {
      clearTimeout(FacilityStore._notifyTimer);
      FacilityStore._notifyTimer = null;
    }

    const projId = bundle.projectId || `proj-${Date.now()}`;
    const projName = bundle.projectName || "Project";

    // 1. Update Project ID and Name in FacilityStore and LocalStorage
    if (typeof FacilityStore !== "undefined" && typeof FacilityStore.setProjectId === "function") {
      FacilityStore.setProjectId(projId);
    }
    this.safeSetItem("netselect_active_project_id", projId);
    this.setActiveProjectName(projName);

    // 2. Restore BOM
    const bomData = Array.isArray(bundle.projectBOM) ? bundle.projectBOM : (Array.isArray(bundle.bom) ? bundle.bom : []);
    if (typeof projectBOM !== "undefined") {
      projectBOM.length = 0;
      projectBOM.push(...bomData);
    }

    // 3. Restore Calculator Demands & Headroom
    const demands = bundle.calculator?.demandCounts || bundle.demandCounts;
    if (demands && typeof demandCounts !== "undefined") {
      Object.assign(demandCounts, {
        af: Math.max(0, parseInt(demands.af, 10) || 0),
        at: Math.max(0, parseInt(demands.at, 10) || 0),
        bt60: Math.max(0, parseInt(demands.bt60, 10) || 0),
        bt90: Math.max(0, parseInt(demands.bt90, 10) || 0)
      });
    }

    const hr = bundle.calculator?.extraHeadroomPercent ?? bundle.extraHeadroomPercent;
    if (typeof hr !== "undefined" && typeof extraHeadroomPercent !== "undefined") {
      extraHeadroomPercent = Math.min(100, Math.max(0, parseFloat(hr) || 20));
    }

    // 4. Restore Global Selected Term (Licensing)
    const term = bundle.globalSelectedTerm || bundle.metadata?.globalSelectedTerm;
    if (term && typeof globalSelectedTerm !== "undefined") {
      globalSelectedTerm = term;
    }

    // 5. Restore Facility Hierarchy (Floors, Spaces, Enclosures, Endpoints)
    if (bundle.facilityHierarchy) {
      if (Array.isArray(bundle.facilityHierarchy.floors)) {
        this.safeSetItem(`netselect_fac_floors_${projId}`, JSON.stringify(bundle.facilityHierarchy.floors));
      }
      if (Array.isArray(bundle.facilityHierarchy.spaces)) {
        this.safeSetItem(`netselect_fac_spaces_${projId}`, JSON.stringify(bundle.facilityHierarchy.spaces));
      }
      if (Array.isArray(bundle.facilityHierarchy.enclosures)) {
        this.safeSetItem(`netselect_fac_enclosures_${projId}`, JSON.stringify(bundle.facilityHierarchy.enclosures));
      }
      if (Array.isArray(bundle.facilityHierarchy.endpoints)) {
        this.safeSetItem(`netselect_fac_endpoints_${projId}`, JSON.stringify(bundle.facilityHierarchy.endpoints));
      }
    }

    // 6. Restore Physical Canvas Data (offloading blueprints before LocalStorage write)
    const physData = bundle.physicalCanvas || bundle.facilityData;
    if (physData) {
      const physForStorage = JSON.parse(JSON.stringify(physData));
      if (Array.isArray(physForStorage.facilityFloors)) {
        physForStorage.facilityFloors = this.offloadFloorBlueprints(physForStorage.facilityFloors);
      }
      this.safeSetItem(`netselect_facility_${projId}`, JSON.stringify(physForStorage));
    }
    if (typeof loadFacilityState === "function") {
      loadFacilityState();
    }

    // 7. Restore Topology Positions
    if (bundle.topology?.positions) {
      this.safeSetItem(`netselect_topo_pos_${projId}`, JSON.stringify(bundle.topology.positions));
    }

    // 8. Restore Rack Settings
    if (bundle.rackSettings?.heights) {
      Object.entries(bundle.rackSettings.heights).forEach(([rackId, h]) => {
        this.safeSetItem(`netselect_rack_height_${projId}_${rackId}`, String(h));
      });
    }
    if (bundle.rackSettings?.pdus) {
      Object.entries(bundle.rackSettings.pdus).forEach(([rackId, pdu]) => {
        this.safeSetItem(`rack_pdu_config_${rackId}`, String(pdu));
      });
    }

    // 8b. Restore Project Fiber Specification & Link Interconnect Overrides (silent during bundle load)
    if (bundle.projectFiberType) {
      if (typeof setProjectFiberType === "function") {
        setProjectFiberType(bundle.projectFiberType, true, true);
      } else {
        this.safeSetItem(`netselect_fiber_type_${projId}`, String(bundle.projectFiberType));
      }
    }
    if (bundle.linkInterconnectOverrides) {
      if (typeof setLinkInterconnectOverrides === "function") {
        setLinkInterconnectOverrides(bundle.linkInterconnectOverrides);
      } else {
        this.safeSetItem(`netselect_link_overrides_${projId}`, JSON.stringify(bundle.linkInterconnectOverrides));
      }
    }

    // 8c. Restore Project Technical Standards & Scope Defaults (defer engine sync until step 10)
    const resolvedDefaults = bundle.projectDefaults || {
      metadata: {
        projectName: projName,
        jobOpportunityNumber: "",
        clientName: "",
        siteAddress: "",
        leadDesigner: ""
      },
      licensing: {
        globalSelectedTerm: bundle.globalSelectedTerm || "1YR"
      },
      accessControl: {
        enabled: true,
        engine: "Genetec",
        readerProtocol: "osdp"
      },
      vms: {
        enabled: true,
        platform: "Milestone XProtect",
        cameraVendors: ["Axis Communications", "Hanwha Vision", "Avigilon"],
        retentionDays: 30,
        promptAnalytics: true
      },
      cabling: (typeof DEFAULT_PROJECT_STANDARDS !== "undefined")
        ? JSON.parse(JSON.stringify(DEFAULT_PROJECT_STANDARDS.cabling))
        : {
            horizontalCategories: ["C6A-CMP-1K-YL", "C6A-CMP-1K-BL"],
            compositeType: "AC-COMP-CMP-500",
            rackTermination: "patch_panels",
            patchCordLength: 0.5,
            fiberType: bundle.projectFiberType || "mmf",
            standards: {
              defaultRunColor: "Yellow",
              defaultRunCategory: "C6A-CMP-1K-YL",
              defaultPatchColor: "Yellow",
              defaultPatchLength: 0.5,
              defaultPatchType: "slim",
              byDeviceType: {}
            }
          }
    };
    this.setProjectDefaults(resolvedDefaults, projId, { skipEngineSync: true });

    // 9. Persist active state cache
    this.saveStateToLocalStorage();

    // 10. Single-pass UI & runtime engine synchronization (avoids redundant hidden-modal redraws)
    if (typeof syncRuntimeEnginesFromProjectDefaults === "function") {
      syncRuntimeEnginesFromProjectDefaults(resolvedDefaults);
    } else {
      if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
      if (typeof runActiveFilter === "function") runActiveFilter();
      if (typeof applyProjectFocusMode === "function") applyProjectFocusMode();
      if (typeof updateProjectHealthUI === "function") updateProjectHealthUI();
    }

    if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
      FacilityStore.notifyWorkspaceChange(true);
    } else if (typeof updateBOMView === "function") {
      updateBOMView();
    }

    if (typeof renderProjectDefaultsSummary === "function") {
      renderProjectDefaultsSummary();
    }
  },

  /**
   * Reads the lightweight project library index (`netselect_saved_quotes`),
   * transparently migrating any legacy monolithic embedded bundles into isolated
   * `netselect_bundle_<id>` keys so project listing and deletion are O(1) and instant.
   */
  _getSavedProjectsIndex() {
    let rawList = [];
    try {
      rawList = JSON.parse(localStorage.getItem("netselect_saved_quotes") || "[]");
      if (!Array.isArray(rawList)) rawList = [];
    } catch (e) {
      rawList = [];
    }

    let needsIndexMigration = false;
    const usedIds = new Set();

    const slimList = rawList.map((entry, idx) => {
      if (!entry || typeof entry !== "object") {
        needsIndexMigration = true;
        return null;
      }

      let cleanId = String(entry.id || `proj-legacy-${idx}`).replace(/[^a-zA-Z0-9_-]/g, '');
      if (!cleanId || usedIds.has(cleanId)) {
        cleanId = `${cleanId || 'proj'}-${idx}-${Date.now()}`;
        needsIndexMigration = true;
      }
      usedIds.add(cleanId);

      // Migrate heavy embedded bundle / bom / facilityFloors out of the shared index key
      if (entry.bundle || entry.bom || entry.facilityFloors) {
        needsIndexMigration = true;
        const bundleKey = `netselect_bundle_${cleanId}`;
        if (!localStorage.getItem(bundleKey)) {
          let migratedBundle = entry.bundle;
          if (!migratedBundle) {
            migratedBundle = {
              schemaVersion: "1.0.0",
              projectId: cleanId,
              projectName: entry.name || "Project",
              updatedAt: entry.updatedAt || Date.now(),
              globalSelectedTerm: "1YR",
              calculator: {
                demandCounts: entry.demandCounts || { af: 0, at: 0, bt60: 0, bt90: 0 },
                extraHeadroomPercent: 20
              },
              projectBOM: Array.isArray(entry.bom) ? entry.bom : [],
              physicalCanvas: {
                facilityFloors: Array.isArray(entry.facilityFloors) ? entry.facilityFloors : []
              },
              topology: { positions: {} },
              rackSettings: { heights: {}, pdus: {} }
            };
          } else {
            migratedBundle.projectId = cleanId;
          }
          if (migratedBundle.physicalCanvas && Array.isArray(migratedBundle.physicalCanvas.facilityFloors)) {
            migratedBundle.physicalCanvas.facilityFloors = this.offloadFloorBlueprints(migratedBundle.physicalCanvas.facilityFloors);
          }
          this.safeSetItem(bundleKey, JSON.stringify(migratedBundle));
        }
      }

      return {
        id: cleanId,
        name: entry.name || "Untitled Project",
        date: entry.date || new Date(entry.updatedAt || Date.now()).toLocaleDateString(),
        updatedAt: entry.updatedAt || Date.now(),
        itemsCount: parseInt(entry.itemsCount, 10) || 0,
        totalMsrp: parseFloat(entry.totalMsrp) || 0
      };
    }).filter(Boolean);

    if (needsIndexMigration) {
      this.safeSetItem("netselect_saved_quotes", JSON.stringify(slimList));
    }

    return slimList;
  },

  /**
   * Retrieves the stored full bundle for a project metadata entry
   */
  _getStoredBundleForEntry(proj) {
    if (!proj) return null;
    const projId = String(proj.id || "default").replace(/[^a-zA-Z0-9_-]/g, '');
    try {
      const rawBundle = localStorage.getItem(`netselect_bundle_${projId}`);
      if (rawBundle) {
        const parsed = JSON.parse(rawBundle);
        if (parsed && typeof parsed === "object") {
          parsed.projectId = projId;
          if (!parsed.projectName && proj.name) parsed.projectName = proj.name;
          return parsed;
        }
      }
    } catch (e) {
      console.warn(`[StorageService] Failed reading netselect_bundle_${projId}:`, e);
    }

    if (proj.bundle && typeof proj.bundle === "object") {
      return proj.bundle;
    }

    // Fallback: synthesize from per-project active state if present
    let fallbackBom = Array.isArray(proj.bom) ? proj.bom : [];
    let fallbackDemands = proj.demandCounts || { af: 0, at: 0, bt60: 0, bt90: 0 };
    try {
      const rawActive = localStorage.getItem(`netselect_active_state_${projId}`);
      if (rawActive) {
        const st = JSON.parse(rawActive);
        if (Array.isArray(st.projectBOM)) fallbackBom = st.projectBOM;
        if (st.demandCounts) fallbackDemands = st.demandCounts;
      }
    } catch (e) {}

    return {
      schemaVersion: "2.1.0",
      projectId: projId,
      projectName: proj.name || "Project",
      updatedAt: proj.updatedAt || Date.now(),
      globalSelectedTerm: "1YR",
      calculator: {
        demandCounts: fallbackDemands,
        extraHeadroomPercent: 20
      },
      projectBOM: fallbackBom,
      facilityHierarchy: { floors: [], spaces: [], enclosures: [], endpoints: [] },
      physicalCanvas: { facilityFloors: Array.isArray(proj.facilityFloors) ? proj.facilityFloors : [] },
      topology: { positions: {} },
      rackSettings: { heights: {}, pdus: {} },
      projectDefaults: this.getProjectDefaults(projId)
    };
  },

  /**
   * Purges all isolated LocalStorage keys belonging to a deleted project ID
   */
  _purgeProjectStorageKeys(deletedId) {
    if (!deletedId) return;
    clearTimeout(this._autoSaveTimer);
    if (typeof FacilityStore !== "undefined" && FacilityStore._notifyTimer) {
      clearTimeout(FacilityStore._notifyTimer);
      FacilityStore._notifyTimer = null;
    }

    const directKeys = [
      `netselect_bundle_${deletedId}`,
      `netselect_facility_${deletedId}`,
      `netselect_active_state_${deletedId}`,
      `netselect_fac_floors_${deletedId}`,
      `netselect_fac_spaces_${deletedId}`,
      `netselect_fac_enclosures_${deletedId}`,
      `netselect_fac_endpoints_${deletedId}`,
      `netselect_topo_pos_${deletedId}`,
      `netselect_project_defaults_${deletedId}`,
      `netselect_fiber_type_${deletedId}`,
      `netselect_link_overrides_${deletedId}`,
      `netselect_project_revisions_${deletedId}`,
      `netselect_walk_audit_${deletedId}`
    ];
    directKeys.forEach((k) => {
      try { localStorage.removeItem(k); } catch (e) {}
    });

    try {
      const prefix = `netselect_rack_height_${deletedId}_`;
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(prefix)) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch (e) {}
  },

  /**
   * Builds a clean blank project bundle object without mutating saved snapshots
   */
  _buildBlankProjectBundle(customDefaults = null, defaultName = "New Project") {
    const baseStandards = typeof DEFAULT_PROJECT_STANDARDS !== "undefined"
      ? DEFAULT_PROJECT_STANDARDS
      : {
          metadata: { projectName: defaultName, jobOpportunityNumber: "", clientName: "", siteAddress: "", leadDesigner: "" },
          licensing: { globalSelectedTerm: "1YR" },
          accessControl: { enabled: true, engine: "Genetec", readerProtocol: "osdp" },
          vms: { enabled: true, platform: "Milestone XProtect", cameraVendors: ["Axis Communications", "Hanwha Vision", "Avigilon"], retentionDays: 30, promptAnalytics: true, headEndInScope: true },
          cabling: { horizontalCategories: ["C6A-CMP-1K-BL"], compositeType: "AC-COMP-CMP-500", rackTermination: "patch_panels", patchCordLength: 0.5, patchCordColors: { security: "Yellow", data: "Blue" }, fiberType: "mmf" },
          network: { switchesInScope: true, vlanMode: "none" }
        };

    const mergedDefaults = JSON.parse(JSON.stringify(baseStandards));
    if (customDefaults && typeof customDefaults === "object") {
      if (customDefaults.metadata) Object.assign(mergedDefaults.metadata, customDefaults.metadata);
      if (customDefaults.licensing) Object.assign(mergedDefaults.licensing, customDefaults.licensing);
      if (customDefaults.accessControl) Object.assign(mergedDefaults.accessControl, customDefaults.accessControl);
      if (customDefaults.vms) Object.assign(mergedDefaults.vms, customDefaults.vms);
      if (customDefaults.cabling) Object.assign(mergedDefaults.cabling, customDefaults.cabling);
      if (customDefaults.network) mergedDefaults.network = Object.assign(mergedDefaults.network || {}, customDefaults.network);
    } else {
      mergedDefaults.metadata.projectName = defaultName;
    }

    const safeName = ((mergedDefaults.metadata && mergedDefaults.metadata.projectName) || defaultName)
      .replace(/[<>"'/]/g, '').trim().slice(0, 80) || defaultName;
    mergedDefaults.metadata.projectName = safeName;

    const newId = `proj-${Date.now()}`;
    const primaryCable = (mergedDefaults.cabling?.horizontalCategories && mergedDefaults.cabling.horizontalCategories.length > 0)
      ? mergedDefaults.cabling.horizontalCategories[0]
      : "C6A-CMP-1K-BL";

    return {
      schemaVersion: "2.1.0",
      projectId: newId,
      projectName: safeName,
      createdAt: new Date().toISOString(),
      updatedAt: Date.now(),
      globalSelectedTerm: mergedDefaults.licensing?.globalSelectedTerm || "1YR",
      calculator: {
        demandCounts: { af: 0, at: 0, bt60: 0, bt90: 0 },
        extraHeadroomPercent: parseInt(mergedDefaults.network?.poeHeadroomPercent, 10) || 20
      },
      projectBOM: [],
      facilityHierarchy: {
        floors: [],
        spaces: [],
        enclosures: [],
        endpoints: []
      },
      physicalCanvas: {
        activeFloorId: null,
        activeCableSku: primaryCable,
        useOrthogonalRouting: false,
        facilityFloors: []
      },
      topology: {
        positions: {}
      },
      rackSettings: {
        heights: {},
        pdus: {}
      },
      projectFiberType: mergedDefaults.cabling?.fiberType || "mmf",
      linkInterconnectOverrides: {},
      projectDefaults: mergedDefaults
    };
  },

  /**
   * Resets active workspace to a fresh unsaved blank state (used when the last saved project is deleted)
   */
  _resetToCleanBlankWorkspace() {
    const freshBundle = this._buildBlankProjectBundle(null, "Default Project");
    this.applyProjectBundle(freshBundle);
    return freshBundle;
  },

  /**
   * Internal helper to insert or update an entry in netselect_saved_quotes + netselect_bundle_<id>
   */
  _upsertSavedQuote(id, name, bundle) {
    const cleanId = String(id || `proj-${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '');
    const saved = this._getSavedProjectsIndex();

    let totalMsrp = 0;
    if (bundle.projectBOM && Array.isArray(bundle.projectBOM)) {
      bundle.projectBOM.forEach(i => totalMsrp += ((i.msrp || 0) * (i.qty || 1)));
    }

    const itemsCount = bundle.projectBOM ? bundle.projectBOM.reduce((acc, i) => acc + (i.qty || 1), 0) : 0;

    // Offload base64 floorplan images to IndexedDB before persisting isolated project bundle
    const compactBundle = JSON.parse(JSON.stringify(bundle));
    compactBundle.projectId = cleanId;
    compactBundle.projectName = name;
    if (compactBundle.physicalCanvas && Array.isArray(compactBundle.physicalCanvas.facilityFloors)) {
      compactBundle.physicalCanvas.facilityFloors = this.offloadFloorBlueprints(compactBundle.physicalCanvas.facilityFloors);
    }

    // Write ONLY this project's bundle (O(1), never re-serializes other projects!)
    this.safeSetItem(`netselect_bundle_${cleanId}`, JSON.stringify(compactBundle));

    const metaEntry = {
      id: cleanId,
      name,
      date: new Date().toLocaleDateString(),
      updatedAt: Date.now(),
      itemsCount,
      totalMsrp
    };

    const existingIdx = saved.findIndex(p => p.id === cleanId);
    if (existingIdx >= 0) {
      saved[existingIdx] = metaEntry;
    } else {
      saved.unshift(metaEntry);
    }

    this.safeSetItem("netselect_saved_quotes", JSON.stringify(saved));
  },

  /**
   * Saves or updates the currently active project snapshot in place
   */
  saveCurrentProject(showNotification = true) {
    const projId = this.getActiveProjectId();
    const projName = this.getActiveProjectName();
    const bundle = this.bundleCurrentProject(projName);

    this.saveStateToLocalStorage();
    if (typeof saveFacilityState === "function") saveFacilityState(true);

    this._upsertSavedQuote(projId, projName, bundle);
    this.renderSavedProjectsList();

    if (showNotification && typeof showToast === "function") {
      showToast(`Saved changes to project: ${projName}`);
    }
  },

  /**
   * Saves active project state as a brand new named snapshot / project
   */
  saveCurrentAsNewProject() {
    const nameInput = document.getElementById("newProjectNameInput");
    const name = nameInput ? nameInput.value.trim() : null;
    if (!name) {
      if (typeof showToast === "function") showToast("Please enter a project name.");
      return;
    }

    const safeName = name.replace(/[<>"'/]/g, '').trim().slice(0, 80) || "Untitled Project";

    // 1. Capture current workspace state under the CURRENT project ID first
    const currentBundle = this.bundleCurrentProject(safeName);

    // 2. Assign the new project ID and update timestamps
    const newProjId = `proj-${Date.now()}`;
    currentBundle.projectId = newProjId;
    currentBundle.projectName = safeName;
    currentBundle.createdAt = new Date().toISOString();
    currentBundle.updatedAt = Date.now();

    // 3. Apply this bundle under the NEW project ID
    this.applyProjectBundle(currentBundle);

    // 4. Save to project snapshots library
    this._upsertSavedQuote(newProjId, safeName, currentBundle);

    if (nameInput) nameInput.value = "";
    this.renderSavedProjectsList();
    if (typeof showToast === "function") showToast(`Saved new project: ${safeName}`);
  },

  /**
   * Creates a fresh blank project and activates it
   * Supports interactive launch of the Project Wizard, or direct invocation with custom defaults
   */
  createNewBlankProject(customDefaults = null) {
    let defaults = customDefaults;

    // Backward-compatibility: if called with string as first arg (e.g. from tests)
    if (typeof customDefaults === "string") {
      defaults = {
        metadata: {
          projectName: customDefaults,
          jobOpportunityNumber: "",
          clientName: (arguments.length > 1 && typeof arguments[1] === "string") ? arguments[1] : "",
          siteAddress: "",
          leadDesigner: ""
        }
      };
    } else if (!defaults) {
      // If called interactively with no arguments, open the wizard!
      if (typeof openProjectWizardModal === "function") {
        openProjectWizardModal("create");
        return;
      }
      defaults = this.getProjectDefaults();
    }

    // 1. Auto-save outgoing project only if it already exists in saved library or has BOM items
    const hasOutgoingWork = (typeof projectBOM !== "undefined" && Array.isArray(projectBOM) && projectBOM.length > 0) ||
      this._getSavedProjectsIndex().some(p => p.id === this.getActiveProjectId());
    if (hasOutgoingWork) {
      this.saveCurrentProject(false);
    }

    const blankBundle = this._buildBlankProjectBundle(defaults, "New Project");
    this.applyProjectBundle(blankBundle);
    this._upsertSavedQuote(blankBundle.projectId, blankBundle.projectName, blankBundle);
    this.renderSavedProjectsList();
    if (typeof showToast === "function") showToast(`Created blank project: ${blankBundle.projectName}`);
    return blankBundle;
  },

  /**
   * Renames the currently active project
   */
  renameActiveProject() {
    const currentName = this.getActiveProjectName();
    const newName = prompt("Rename active project:", currentName);
    if (!newName || !newName.trim() || newName.trim() === currentName) return;
    const safeName = this.setActiveProjectName(newName);
    this.saveCurrentProject(false);
    if (typeof showToast === "function") showToast(`Project renamed to: ${safeName}`);
  },

  /**
   * Resolves a project index entry by either project ID string or numeric array index
   */
  _resolveProjectEntry(saved, idOrIdx) {
    if (!Array.isArray(saved) || saved.length === 0) return { idx: -1, proj: null };
    if (typeof idOrIdx === "string" && isNaN(Number(idOrIdx))) {
      const foundIdx = saved.findIndex(p => p.id === idOrIdx);
      return { idx: foundIdx, proj: foundIdx >= 0 ? saved[foundIdx] : null };
    }
    const numIdx = parseInt(idOrIdx, 10);
    if (!isNaN(numIdx) && numIdx >= 0 && numIdx < saved.length) {
      return { idx: numIdx, proj: saved[numIdx] };
    }
    const fallbackIdx = saved.findIndex(p => String(p.id) === String(idOrIdx));
    return { idx: fallbackIdx, proj: fallbackIdx >= 0 ? saved[fallbackIdx] : null };
  },

  /**
   * Loads a saved snapshot into the active workspace with seamless backward-compatibility
   */
  loadProjectSnapshot(idOrIdx, opts = {}) {
    const saved = this._getSavedProjectsIndex();
    const { proj } = this._resolveProjectEntry(saved, idOrIdx);
    if (!proj) return;

    // 1. Auto-save outgoing work ONLY if not switching away from a just-deleted project
    if (!opts.skipSaveOutgoing) {
      const activeId = this.getActiveProjectId();
      const outgoingIsSavedOrDirty = saved.some(p => p.id === activeId) ||
        (typeof projectBOM !== "undefined" && Array.isArray(projectBOM) && projectBOM.length > 0);
      if (outgoingIsSavedOrDirty) {
        this.saveCurrentProject(false);
      }
    }

    // 2. Load isolated project bundle
    const bundle = this._getStoredBundleForEntry(proj);
    if (!bundle) return;

    // 3. Apply the project bundle
    this.applyProjectBundle(bundle);

    if (opts.keepModalOpen) {
      this.renderSavedProjectsList();
      if (typeof renderProjectDefaultsSummary === "function") {
        renderProjectDefaultsSummary();
      }
    } else {
      this.toggleProjectModal();
    }

    if (!opts.suppressToast && typeof showToast === "function") {
      showToast(`Loaded project: ${proj.name || "Project"}`);
    }
  },

  /**
   * Arms inline two-click deletion confirmation on a specific project card
   */
  requestDeleteProjectSnapshot(idOrIdx) {
    const saved = this._getSavedProjectsIndex();
    const { proj } = this._resolveProjectEntry(saved, idOrIdx);
    if (!proj) return;
    this._pendingClearAllProjects = false;
    this._pendingDeleteProjectId = proj.id;
    this.renderSavedProjectsList();
  },

  /**
   * Cancels pending inline project deletion confirmation
   */
  cancelDeleteProjectSnapshot() {
    this._pendingDeleteProjectId = null;
    this._pendingClearAllProjects = false;
    this.renderSavedProjectsList();
  },

  /**
   * Deletes a saved project snapshot instantly without resurrecting deleted active workspaces
   */
  deleteProjectSnapshot(idOrIdx, skipConfirm = false) {
    const saved = this._getSavedProjectsIndex();
    const { idx, proj } = this._resolveProjectEntry(saved, idOrIdx);
    if (!proj || idx < 0) return;

    const projName = proj.name || "Untitled Project";
    const deletedId = proj.id;

    if (!skipConfirm && this._pendingDeleteProjectId !== deletedId) {
      const modal = document.getElementById("projectModal");
      const isModalOpen = modal && !modal.classList.contains("hidden");
      if (isModalOpen) {
        this._pendingDeleteProjectId = deletedId;
        this.renderSavedProjectsList();
        return;
      }
      if (typeof confirm === "function" && !confirm(`Are you sure you want to delete "${projName}"? This action cannot be undone.`)) {
        return;
      }
    }

    this._pendingDeleteProjectId = null;
    this._pendingClearAllProjects = false;

    const activeId = this.getActiveProjectId();
    const wasActive = (activeId === deletedId);

    // 1. Purge all isolated LocalStorage keys for this project and cancel pending auto-save timers
    this._purgeProjectStorageKeys(deletedId);

    // 2. Remove from lightweight saved index immediately
    saved.splice(idx, 1);
    this.safeSetItem("netselect_saved_quotes", JSON.stringify(saved));

    // 3. Handle active workspace fallback WITHOUT saving the deleted project back into storage
    if (wasActive) {
      if (saved.length > 0) {
        this.loadProjectSnapshot(saved[0].id, {
          skipSaveOutgoing: true,
          keepModalOpen: true,
          suppressToast: true
        });
      } else {
        this._resetToCleanBlankWorkspace();
      }
    }

    this.renderSavedProjectsList();
    if (typeof renderProjectDefaultsSummary === "function") {
      renderProjectDefaultsSummary();
    }
    if (typeof showToast === "function") {
      showToast(`Deleted project: ${projName}`);
    }
  },

  /**
   * Arms inline confirmation to delete all saved project snapshots
   */
  requestClearAllProjects() {
    this._pendingDeleteProjectId = null;
    this._pendingClearAllProjects = true;
    this.renderSavedProjectsList();
  },

  /**
   * Deletes all saved project snapshots and resets to a fresh blank workspace
   */
  clearAllSavedProjects() {
    const saved = this._getSavedProjectsIndex();
    const count = saved.length;
    saved.forEach((p) => {
      if (p && p.id) this._purgeProjectStorageKeys(p.id);
    });
    this._purgeProjectStorageKeys(this.getActiveProjectId());

    this._pendingDeleteProjectId = null;
    this._pendingClearAllProjects = false;
    this.safeSetItem("netselect_saved_quotes", "[]");

    this._resetToCleanBlankWorkspace();
    this.renderSavedProjectsList();
    if (typeof renderProjectDefaultsSummary === "function") {
      renderProjectDefaultsSummary();
    }
    if (typeof showToast === "function") {
      showToast(`Deleted all ${count} saved project${count === 1 ? "" : "s"}.`);
    }
  },

  /**
   * Helper to trigger a browser JSON file download
   */
  _downloadJSON(data, name) {
    const cleanName = (name || "Project").replace(/[^a-zA-Z0-9_-]/g, '_');
    const dateStr = new Date().toISOString().slice(0, 10);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `OSS_Project_${cleanName}_${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if (typeof showToast === "function") showToast(`Exported ${name} JSON.`);
  },

  /**
   * Exports full project configuration to a downloadable JSON file
   */
  exportCurrentProjectJSON() {
    this.saveStateToLocalStorage();
    if (typeof saveFacilityState === "function") saveFacilityState(true);
    const projName = this.getActiveProjectName();
    const bundle = this.bundleCurrentProject(projName);
    this._downloadJSON(bundle, projName);
  },

  /**
   * Exports an arbitrary project snapshot directly from the list without activating it
   */
  exportProjectSnapshot(idOrIdx) {
    const saved = this._getSavedProjectsIndex();
    const { proj } = this._resolveProjectEntry(saved, idOrIdx);
    if (!proj) return;

    const bundle = this._getStoredBundleForEntry(proj);
    if (!bundle) return;

    const exportCopy = JSON.parse(JSON.stringify(bundle));
    if (exportCopy.physicalCanvas && Array.isArray(exportCopy.physicalCanvas.facilityFloors)) {
      this.hydrateFloorBlueprints(exportCopy.physicalCanvas.facilityFloors);
    }
    if (Array.isArray(exportCopy.facilityFloors)) {
      this.hydrateFloorBlueprints(exportCopy.facilityFloors);
    }

    this._downloadJSON(exportCopy, exportCopy.projectName || proj.name || "Project");
  },

  /**
   * Imports a project configuration JSON file with schema validation and sanitization
   */
  importProjectJSON(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = window.safeJsonParse ? window.safeJsonParse(e.target.result, null) : JSON.parse(e.target.result);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          throw new Error("Invalid project structure: file does not contain a JSON object");
        }

        const rawBOM = Array.isArray(parsed.projectBOM) ? parsed.projectBOM : (Array.isArray(parsed.bom) ? parsed.bom : []);

        // Deep sanitize and validate each BOM item against injection
        const sanitizedBOM = rawBOM.map(item => {
          if (!item || typeof item !== "object" || Array.isArray(item)) return null;
          return {
            id: String(item.id || '').replace(/[<>"'/]/g, '').slice(0, 100),
            ...item,
            instanceId: String(item.instanceId || `inst-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`).replace(/[^a-zA-Z0-9_\-:.]/g, '_').slice(0, 80),
            sku: String(item.sku || '').replace(/[<>"'/]/g, '').slice(0, 100),
            model: String(item.model || '').replace(/[<>"']/g, '').slice(0, 120),
            vendor: String(item.vendor || '').replace(/[<>"']/g, '').slice(0, 60),
            role: String(item.role || '').replace(/[<>"']/g, '').slice(0, 60),
            category: String(item.category || '').replace(/[<>"']/g, '').slice(0, 60),
            type: String(item.type || '').replace(/[<>"']/g, '').slice(0, 60),
            description: String(item.description || '').replace(/[<>"']/g, '').slice(0, 255),
            msrp: Math.max(0, parseFloat(item.msrp) || 0),
            qty: Math.max(1, parseInt(item.qty, 10) || 1),
            ports: parseInt(item.ports, 10) || 0,
            poeBudget: parseFloat(item.poeBudget) || 0,
            parentInstanceId: item.parentInstanceId ? String(item.parentInstanceId).replace(/[^a-zA-Z0-9_\-:.]/g, '_').slice(0, 100) : null,
            friendlyName: item.friendlyName ? String(item.friendlyName).replace(/[<>"'`]/g, '').slice(0, 120) : undefined,
            deviceNumber: item.deviceNumber ? String(item.deviceNumber).replace(/[<>"'`]/g, '').slice(0, 60) : undefined,
            closetName: item.closetName ? String(item.closetName).replace(/[<>"']/g, '').slice(0, 60) : "Unassigned",
            rackId: item.rackId ? String(item.rackId).replace(/[<>"']/g, '').slice(0, 60) : null,
            mountMethod: item.mountMethod ? String(item.mountMethod).replace(/[<>"']/g, '').slice(0, 60) : null,
            slotNumber: typeof item.slotNumber !== "undefined" ? parseInt(item.slotNumber, 10) : null,
            rackUnit: typeof item.rackUnit !== "undefined" ? parseInt(item.rackUnit, 10) : null,
            notes: item.notes ? String(item.notes).replace(/[<>"']/g, '').slice(0, 255) : ""
          };
        }).filter(Boolean);

        const rawName = parsed.projectName || parsed.name || file.name.replace(/\.json$/i, '') || "Imported Project";
        const safeProjectName = String(rawName).replace(/[<>"']/g, '').trim().slice(0, 80) || "Imported Project";
        const newProjId = `proj-${Date.now()}`;

        // Construct complete bundle
        const importedBundle = {
          schemaVersion: parsed.schemaVersion || "2.0.0",
          projectId: newProjId,
          projectName: safeProjectName,
          createdAt: parsed.createdAt || new Date().toISOString(),
          updatedAt: Date.now(),
          globalSelectedTerm: parsed.globalSelectedTerm || parsed.metadata?.globalSelectedTerm || "1YR",
          calculator: {
            demandCounts: {
              af: Math.max(0, parseInt(parsed.calculator?.demandCounts?.af ?? parsed.demandCounts?.af, 10) || 0),
              at: Math.max(0, parseInt(parsed.calculator?.demandCounts?.at ?? parsed.demandCounts?.at, 10) || 0),
              bt60: Math.max(0, parseInt(parsed.calculator?.demandCounts?.bt60 ?? parsed.demandCounts?.bt60, 10) || 0),
              bt90: Math.max(0, parseInt(parsed.calculator?.demandCounts?.bt90 ?? parsed.demandCounts?.bt90, 10) || 0)
            },
            extraHeadroomPercent: Math.min(100, Math.max(0, parseFloat(parsed.calculator?.extraHeadroomPercent ?? parsed.extraHeadroomPercent) || 20))
          },
          projectBOM: sanitizedBOM,
          facilityHierarchy: parsed.facilityHierarchy || {
            floors: (typeof FacilityStore !== "undefined") ? JSON.parse(JSON.stringify(FacilityStore.defaultFloors)) : [],
            spaces: (typeof FacilityStore !== "undefined") ? JSON.parse(JSON.stringify(FacilityStore.defaultSpaces)) : [],
            enclosures: (typeof FacilityStore !== "undefined") ? JSON.parse(JSON.stringify(FacilityStore.defaultEnclosures)) : [],
            endpoints: []
          },
          physicalCanvas: parsed.physicalCanvas || parsed.facilityData || {
            activeFloorId: "floor-1",
            activeCableSku: "CAT6A-UTP-PLEN",
            useOrthogonalRouting: false,
            facilityFloors: Array.isArray(parsed.facilityFloors) ? parsed.facilityFloors : []
          },
          topology: parsed.topology || {
            positions: parsed.topologyPositions || {}
          },
          rackSettings: parsed.rackSettings || {
            heights: {},
            pdus: {}
          },
          projectDefaults: parsed.projectDefaults || undefined
        };

        // 1. Auto-save outgoing project first if it has work or is already saved
        const hasOutgoing = this._getSavedProjectsIndex().some(p => p.id === this.getActiveProjectId()) ||
          (typeof projectBOM !== "undefined" && Array.isArray(projectBOM) && projectBOM.length > 0);
        if (hasOutgoing) {
          this.saveCurrentProject(false);
        }

        // 2. Apply bundle to active workspace
        this.applyProjectBundle(importedBundle);

        // 3. Add to saved quotes library!
        this._upsertSavedQuote(newProjId, safeProjectName, importedBundle);

        this.renderSavedProjectsList();
        this.toggleProjectModal();
        if (typeof showToast === "function") showToast(`Imported project: ${safeProjectName}`);
      } catch (err) {
        console.error("[StorageService] JSON Import failed:", err);
        if (typeof showToast === "function") showToast(`Import failed: ${err.message || "Invalid or corrupted JSON file."}`);
      } finally {
        if (event.target) event.target.value = "";
      }
    };
    reader.readAsText(file);
  },

  /**
   * Renders saved project snapshots with active highlighting and instant inline deletion controls
   */
  renderSavedProjectsList() {
    const container = document.getElementById("savedProjectsList");
    if (!container) return;

    const activeId = this.getActiveProjectId();
    const activeName = this.getActiveProjectName();

    const modalActiveTitle = document.getElementById("modalActiveProjectTitle");
    if (modalActiveTitle) modalActiveTitle.innerText = activeName;

    const saved = this._getSavedProjectsIndex();

    if (saved.length === 0) {
      container.innerHTML = `
        <div class="text-center py-6 px-4 border border-dashed border-slate-800 rounded-xl bg-slate-950/40 space-y-2.5">
          <i data-lucide="folder-open" class="w-8 h-8 text-slate-600 mx-auto"></i>
          <div>
            <span class="text-xs text-slate-300 block font-semibold">No saved project snapshots yet.</span>
            <span class="text-[11px] text-slate-400 block mt-0.5">Start a fresh guided project to configure Scope, VMS/ACS, DOR &amp; Optics defaults, or click "Save Changes" above.</span>
          </div>
          <button type="button" onclick="openProjectWizardModal('create')" class="mx-auto px-3.5 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-md shadow-brand-500/20 cursor-pointer">
            <i data-lucide="sparkles" class="w-3.5 h-3.5"></i>
            <span>Start New Project Wizard</span>
          </button>
        </div>
      `;
      safeCreateIcons(container);
      return;
    }

    const clearAllBanner = saved.length >= 2 ? (
      this._pendingClearAllProjects ? `
        <div class="px-3 py-2 rounded-xl bg-rose-950/50 border border-rose-500/50 flex items-center justify-between gap-2 text-[11px]">
          <span class="text-rose-200 font-semibold">Delete all ${saved.length} saved projects?</span>
          <div class="flex items-center gap-1.5 shrink-0">
            <button type="button" onclick="StorageService.clearAllSavedProjects()" class="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg cursor-pointer transition-colors">Confirm Delete All</button>
            <button type="button" onclick="StorageService.cancelDeleteProjectSnapshot()" class="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 cursor-pointer transition-colors">Cancel</button>
          </div>
        </div>
      ` : `
        <div class="flex items-center justify-between px-1 pb-0.5 text-[10px] text-slate-500">
          <span>${saved.length} saved projects</span>
          <button type="button" onclick="StorageService.requestClearAllProjects()" class="text-slate-400 hover:text-rose-400 font-semibold transition-colors cursor-pointer">Delete All...</button>
        </div>
      `
    ) : "";

    const rowsHtml = saved.map((proj) => {
      const safeName = escapeHTML(proj.name || "Untitled Snapshot");
      const safeDate = escapeHTML(proj.date || "");
      const safeIdAttr = escapeJSAttr(proj.id);
      const itemsCount = parseInt(proj.itemsCount, 10) || 0;
      const totalMsrp = parseFloat(proj.totalMsrp) || 0;
      const isActive = (proj.id === activeId);
      const isPendingDelete = (this._pendingDeleteProjectId === proj.id);

      if (isPendingDelete) {
        return `
          <div class="p-3 rounded-xl border bg-rose-950/35 border-rose-500/60 ring-1 ring-rose-500/30 flex items-center justify-between gap-3 text-xs transition-all">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <span class="font-bold text-rose-200 truncate text-xs">Delete "${safeName}"?</span>
                ${isActive ? '<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 shrink-0">ACTIVE</span>' : ''}
              </div>
              <div class="text-[10px] text-rose-300/80 mt-0.5">
                This permanently removes this project snapshot from browser storage.
              </div>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
              <button type="button" onclick="StorageService.deleteProjectSnapshot('${safeIdAttr}', true)" class="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-[11px] shadow-sm transition-colors cursor-pointer">
                Delete
              </button>
              <button type="button" onclick="StorageService.cancelDeleteProjectSnapshot()" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg text-[11px] border border-slate-700 transition-colors cursor-pointer">
                Cancel
              </button>
            </div>
          </div>
        `;
      }

      return `
        <div class="p-3 rounded-xl border transition-all ${
          isActive 
            ? 'bg-indigo-950/30 border-indigo-500/50 shadow-sm shadow-indigo-500/10 ring-1 ring-indigo-500/30' 
            : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700'
        } flex items-center justify-between gap-3 text-xs">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <span class="font-bold text-white truncate text-xs">${safeName}</span>
              ${isActive ? '<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shrink-0">ACTIVE</span>' : ''}
            </div>
            <div class="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-2">
              <span>${safeDate}</span>
              <span>&bull;</span>
              <span>${itemsCount} item${itemsCount === 1 ? '' : 's'}</span>
              <span>&bull;</span>
              <span class="text-emerald-400 font-semibold">$${totalMsrp.toLocaleString()}</span>
            </div>
          </div>
          <div class="flex items-center gap-1.5 shrink-0">
            ${
              isActive 
                ? '<button type="button" onclick="saveCurrentProject()" class="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg text-[11px] transition-all flex items-center gap-1 shadow-sm cursor-pointer"><i data-lucide="check" class="w-3 h-3"></i> Saved</button>' 
                : `<button type="button" onclick="StorageService.loadProjectSnapshot('${safeIdAttr}')" class="px-2.5 py-1 bg-slate-800 hover:bg-brand-600 text-slate-200 hover:text-white font-semibold rounded-lg text-[11px] border border-slate-700 hover:border-transparent transition-all cursor-pointer">Load</button>`
            }
            <button type="button" onclick="StorageService.exportProjectSnapshot('${safeIdAttr}')" class="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer" title="Export this Project JSON">
              <i data-lucide="download" class="w-3.5 h-3.5"></i>
            </button>
            <button type="button" onclick="StorageService.requestDeleteProjectSnapshot('${safeIdAttr}')" class="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer" title="Delete Project">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = clearAllBanner + rowsHtml;
    safeCreateIcons(container);
  }
};

// Global compatibility bindings for existing HTML event listeners
window.StorageService = StorageService;
window.ProjectStore = StorageService;
window.queueAutoSave = () => StorageService.queueAutoSave();
window.saveStateToLocalStorage = () => StorageService.saveStateToLocalStorage();
window.restoreStateFromLocalStorage = () => StorageService.restoreStateFromLocalStorage();
window.toggleProjectModal = () => StorageService.toggleProjectModal();
window.renderSavedProjectsList = () => StorageService.renderSavedProjectsList();
window.saveCurrentProject = (showNotification) => StorageService.saveCurrentProject(showNotification);
window.saveCurrentAsNewProject = () => StorageService.saveCurrentAsNewProject();
window.loadProjectSnapshot = (idOrIdx, opts) => StorageService.loadProjectSnapshot(idOrIdx, opts);
window.deleteProjectSnapshot = (idOrIdx, skipConfirm) => StorageService.deleteProjectSnapshot(idOrIdx, skipConfirm);
window.exportProjectSnapshot = (idOrIdx) => StorageService.exportProjectSnapshot(idOrIdx);
window.exportCurrentProjectJSON = () => StorageService.exportCurrentProjectJSON();
window.importProjectJSON = (event) => StorageService.importProjectJSON(event);
window.createNewBlankProject = (customDefaults) => StorageService.createNewBlankProject(customDefaults);
window.renameActiveProject = () => StorageService.renameActiveProject();
