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
  setProjectDefaults(defaults, projId = null) {
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
      setProjectFiberType(defaults.cabling.fiberType);
    }
    if (defaults.cabling?.horizontalCategories?.length > 0 && typeof activeCableSku !== "undefined") {
      activeCableSku = defaults.cabling.horizontalCategories[0];
      const cSel = document.getElementById("cableSkuSelect");
      if (cSel) cSel.value = activeCableSku;
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

    // 8b. Restore Project Fiber Specification & Link Interconnect Overrides
    if (bundle.projectFiberType) {
      if (typeof setProjectFiberType === "function") {
        setProjectFiberType(bundle.projectFiberType);
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

    // 8c. Restore Project Technical Standards & Scope Defaults
    if (bundle.projectDefaults) {
      this.setProjectDefaults(bundle.projectDefaults, projId);
    } else {
      this.setProjectDefaults({
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
      }, projId);
    }

    // 9. Persist active state cache
    this.saveStateToLocalStorage();

    // 10. Trigger cross-modal and UI updates
    if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
      FacilityStore.notifyWorkspaceChange();
    }
    if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
    if (typeof runActiveFilter === "function") runActiveFilter();
    if (typeof updateBOMView === "function") updateBOMView();
    if (typeof updateProjectHealthUI === "function") updateProjectHealthUI();
    if (typeof renderCableCanvas === "function") renderCableCanvas();
    if (typeof renderTopology === "function") renderTopology();
    if (typeof renderRackVisualizer === "function") renderRackVisualizer();
    if (typeof applyProjectFocusMode === "function") applyProjectFocusMode();
    if (typeof renderProjectDefaultsSummary === "function") renderProjectDefaultsSummary();
  },

  /**
   * Internal helper to insert or update an entry in netselect_saved_quotes
   */
  _upsertSavedQuote(id, name, bundle) {
    let saved = [];
    try {
      saved = JSON.parse(localStorage.getItem("netselect_saved_quotes") || "[]");
    } catch (e) {
      saved = [];
    }

    let totalMsrp = 0;
    if (bundle.projectBOM && Array.isArray(bundle.projectBOM)) {
      bundle.projectBOM.forEach(i => totalMsrp += ((i.msrp || 0) * (i.qty || 1)));
    }

    const itemsCount = bundle.projectBOM ? bundle.projectBOM.reduce((acc, i) => acc + (i.qty || 1), 0) : 0;

    // Offload base64 floorplan images to IndexedDB before persisting quote snapshot in LocalStorage
    const compactBundle = JSON.parse(JSON.stringify(bundle));
    let compactFloors = [];
    if (compactBundle.physicalCanvas && Array.isArray(compactBundle.physicalCanvas.facilityFloors)) {
      compactFloors = this.offloadFloorBlueprints(compactBundle.physicalCanvas.facilityFloors);
      compactBundle.physicalCanvas.facilityFloors = compactFloors;
    }

    const entry = {
      id,
      name,
      date: new Date().toLocaleDateString(),
      updatedAt: Date.now(),
      itemsCount,
      totalMsrp,
      bom: compactBundle.projectBOM || [],
      demandCounts: compactBundle.calculator?.demandCounts || compactBundle.demandCounts || {},
      facilityFloors: compactFloors,
      bundle: compactBundle
    };

    const existingIdx = saved.findIndex(p => p.id === id);
    if (existingIdx >= 0) {
      saved[existingIdx] = entry;
    } else {
      saved.unshift(entry);
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
    // 1. Auto-save current work first
    this.saveCurrentProject(false);

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

    const baseStandards = typeof DEFAULT_PROJECT_STANDARDS !== "undefined"
      ? DEFAULT_PROJECT_STANDARDS
      : {
          metadata: { projectName: "New Project", jobOpportunityNumber: "", clientName: "", siteAddress: "", leadDesigner: "" },
          licensing: { globalSelectedTerm: "1YR" },
          accessControl: { enabled: true, engine: "Genetec", readerProtocol: "osdp" },
          vms: { enabled: true, platform: "Milestone XProtect", cameraVendors: ["Axis Communications", "Hanwha Vision", "Avigilon"], retentionDays: 30, promptAnalytics: true },
          cabling: { horizontalCategories: ["C6A-CMP-1K-BL"], compositeType: "AC-COMP-CMP-500", rackTermination: "patch_panels", patchCordLength: 0.5, patchCordColors: { security: "Yellow", data: "Blue" }, fiberType: "mmf" }
        };

    const mergedDefaults = JSON.parse(JSON.stringify(baseStandards));
    if (defaults.metadata) Object.assign(mergedDefaults.metadata, defaults.metadata);
    if (defaults.licensing) Object.assign(mergedDefaults.licensing, defaults.licensing);
    if (defaults.accessControl) Object.assign(mergedDefaults.accessControl, defaults.accessControl);
    if (defaults.vms) Object.assign(mergedDefaults.vms, defaults.vms);
    if (defaults.cabling) Object.assign(mergedDefaults.cabling, defaults.cabling);

    const safeName = ((mergedDefaults.metadata && mergedDefaults.metadata.projectName) || "New Project")
      .replace(/[<>"'/]/g, '').trim().slice(0, 80) || "New Project";
    const newId = `proj-${Date.now()}`;

    const primaryCable = (mergedDefaults.cabling?.horizontalCategories && mergedDefaults.cabling.horizontalCategories.length > 0)
      ? mergedDefaults.cabling.horizontalCategories[0]
      : "C6A-CMP-1K-BL";

    const blankBundle = {
      schemaVersion: "2.1.0",
      projectId: newId,
      projectName: safeName,
      createdAt: new Date().toISOString(),
      updatedAt: Date.now(),
      globalSelectedTerm: mergedDefaults.licensing?.globalSelectedTerm || "1YR",
      calculator: {
        demandCounts: { af: 0, at: 0, bt60: 0, bt90: 0 },
        extraHeadroomPercent: 20
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

    this.applyProjectBundle(blankBundle);
    this._upsertSavedQuote(newId, safeName, blankBundle);
    this.renderSavedProjectsList();
    if (typeof showToast === "function") showToast(`Created blank project: ${safeName}`);
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
   * Loads a saved snapshot into the active workspace with seamless backward-compatibility
   */
  loadProjectSnapshot(idx) {
    let saved = [];
    try {
      saved = JSON.parse(localStorage.getItem("netselect_saved_quotes") || "[]");
    } catch (e) { return; }

    const proj = saved[idx];
    if (!proj) return;

    // 1. Auto-save current work first so switching never drops dirty state
    this.saveCurrentProject(false);

    // 2. Extract or synthesize complete bundle
    const projId = (proj.id || `proj-${idx}`).replace(/[^a-zA-Z0-9_-]/g, '');
    let bundle = proj.bundle;
    if (!bundle) {
      bundle = {
        schemaVersion: "1.0.0",
        projectId: projId,
        projectName: proj.name || "Project",
        updatedAt: Date.now(),
        globalSelectedTerm: "1YR",
        calculator: {
          demandCounts: proj.demandCounts || { af: 0, at: 0, bt60: 0, bt90: 0 },
          extraHeadroomPercent: 20
        },
        projectBOM: Array.isArray(proj.bom) ? proj.bom : [],
        facilityHierarchy: {
          floors: (typeof FacilityStore !== "undefined") ? FacilityStore.getFloors() : [],
          spaces: (typeof FacilityStore !== "undefined") ? FacilityStore.getSpaces() : [],
          enclosures: (typeof FacilityStore !== "undefined") ? FacilityStore.getEnclosures() : [],
          endpoints: (typeof FacilityStore !== "undefined") ? FacilityStore.getEndpoints() : []
        },
        physicalCanvas: {
          facilityFloors: Array.isArray(proj.facilityFloors) ? proj.facilityFloors : []
        },
        topology: { positions: {} },
        rackSettings: { heights: {}, pdus: {} }
      };
      proj.bundle = bundle;
      this.safeSetItem("netselect_saved_quotes", JSON.stringify(saved));
    }

    // 3. Apply the project bundle
    this.applyProjectBundle(bundle);

    this.toggleProjectModal();
    if (typeof showToast === "function") showToast(`Loaded project: ${proj.name || "Project"}`);
  },

  /**
   * Deletes a saved project snapshot with confirmation and active project fallback
   */
  deleteProjectSnapshot(idx) {
    let saved = [];
    try {
      saved = JSON.parse(localStorage.getItem("netselect_saved_quotes") || "[]");
    } catch (e) { return; }

    const proj = saved[idx];
    if (!proj) return;

    const projName = proj.name || "Untitled Project";
    if (!confirm(`Are you sure you want to delete "${projName}"? This action cannot be undone.`)) {
      return;
    }

    const deletedId = proj.id;
    if (deletedId) {
      localStorage.removeItem(`netselect_facility_${deletedId}`);
      localStorage.removeItem(`netselect_active_state_${deletedId}`);
      localStorage.removeItem(`netselect_fac_floors_${deletedId}`);
      localStorage.removeItem(`netselect_fac_spaces_${deletedId}`);
      localStorage.removeItem(`netselect_fac_enclosures_${deletedId}`);
      localStorage.removeItem(`netselect_fac_endpoints_${deletedId}`);
      localStorage.removeItem(`netselect_topo_pos_${deletedId}`);

      try {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(`netselect_rack_height_${deletedId}_`)) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
      } catch (e) {}
    }

    saved.splice(idx, 1);
    this.safeSetItem("netselect_saved_quotes", JSON.stringify(saved));

    const activeId = this.getActiveProjectId();
    if (activeId === deletedId) {
      if (saved.length > 0) {
        this.loadProjectSnapshot(0);
      } else {
        this.createNewBlankProject();
      }
    } else {
      this.renderSavedProjectsList();
      if (typeof showToast === "function") showToast(`Deleted project: ${projName}`);
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
  exportProjectSnapshot(idx) {
    let saved = [];
    try {
      saved = JSON.parse(localStorage.getItem("netselect_saved_quotes") || "[]");
    } catch (e) { return; }

    const proj = saved[idx];
    if (!proj) return;

    let bundle = proj.bundle;
    if (!bundle) {
      bundle = {
        schemaVersion: "1.0.0",
        projectId: proj.id || `proj-${idx}`,
        projectName: proj.name || "Project",
        exportDate: new Date().toISOString(),
        projectBOM: proj.bom || [],
        demandCounts: proj.demandCounts || {},
        facilityFloors: proj.facilityFloors || []
      };
    }

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
          }
        };

        // 1. Auto-save outgoing project first
        this.saveCurrentProject(false);

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
   * Renders saved project snapshots with active highlighting and direct actions
   */
  renderSavedProjectsList() {
    const container = document.getElementById("savedProjectsList");
    if (!container) return;

    const activeId = this.getActiveProjectId();
    const activeName = this.getActiveProjectName();

    const modalActiveTitle = document.getElementById("modalActiveProjectTitle");
    if (modalActiveTitle) modalActiveTitle.innerText = activeName;

    let saved = [];
    try {
      saved = JSON.parse(localStorage.getItem("netselect_saved_quotes") || "[]");
    } catch (e) {
      saved = [];
    }

    if (saved.length === 0) {
      container.innerHTML = `
        <div class="text-center py-6 border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
          <i data-lucide="folder-open" class="w-8 h-8 text-slate-600 mx-auto mb-2"></i>
          <span class="text-xs text-slate-400 block font-medium">No saved project snapshots yet.</span>
          <span class="text-[11px] text-slate-500 block mt-0.5">Click "Save Changes" above to save your current work.</span>
        </div>
      `;
      safeCreateIcons(container);
      return;
    }

    container.innerHTML = saved.map((proj, idx) => {
      const safeName = escapeHTML(proj.name || "Untitled Snapshot");
      const safeDate = escapeHTML(proj.date || "");
      const itemsCount = parseInt(proj.itemsCount, 10) || 0;
      const totalMsrp = parseFloat(proj.totalMsrp) || 0;
      const isActive = (proj.id === activeId);

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
                ? '<button onclick="saveCurrentProject()" class="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg text-[11px] transition-all flex items-center gap-1 shadow-sm"><i data-lucide="check" class="w-3 h-3"></i> Saved</button>' 
                : `<button onclick="StorageService.loadProjectSnapshot(${idx})" class="px-2.5 py-1 bg-slate-800 hover:bg-brand-600 text-slate-200 hover:text-white font-semibold rounded-lg text-[11px] border border-slate-700 hover:border-transparent transition-all">Load</button>`
            }
            <button onclick="StorageService.exportProjectSnapshot(${idx})" class="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors" title="Export this Project JSON">
              <i data-lucide="download" class="w-3.5 h-3.5"></i>
            </button>
            <button onclick="StorageService.deleteProjectSnapshot(${idx})" class="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors" title="Delete Snapshot">
              <i data-lucide="trash" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');

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
window.loadProjectSnapshot = (idx) => StorageService.loadProjectSnapshot(idx);
window.deleteProjectSnapshot = (idx) => StorageService.deleteProjectSnapshot(idx);
window.exportProjectSnapshot = (idx) => StorageService.exportProjectSnapshot(idx);
window.exportCurrentProjectJSON = () => StorageService.exportCurrentProjectJSON();
window.importProjectJSON = (event) => StorageService.importProjectJSON(event);
window.createNewBlankProject = () => StorageService.createNewBlankProject();
window.renameActiveProject = () => StorageService.renameActiveProject();
