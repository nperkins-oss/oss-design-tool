// ==========================================
// STORAGE & PROJECT PERSISTENCE SERVICE (NetSelect Enterprise)
// Isolated LocalStorage, Multi-Project Snapshots, JSON Import/Export
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

const StorageService = {
  AUTO_SAVE_DEBOUNCE_MS: 300,
  _autoSaveTimer: null,

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
      const projId = typeof FacilityStore !== "undefined" ? FacilityStore.getProjectId() : "default";
      const state = {
        projectBOM: (typeof projectBOM !== "undefined") ? projectBOM : [],
        demandCounts: (typeof demandCounts !== "undefined") ? demandCounts : {},
        extraHeadroomPercent: (typeof extraHeadroomPercent !== "undefined") ? extraHeadroomPercent : 20,
        globalSelectedTerm: typeof globalSelectedTerm !== "undefined" ? globalSelectedTerm : "1YR",
        timestamp: Date.now()
      };
      this.safeSetItem(`netselect_active_state_${projId}`, JSON.stringify(state));
    } catch (e) {
      console.warn("[StorageService] Failed to save active state:", e);
    }
  },

  /**
   * Restores workspace state from LocalStorage
   */
  restoreStateFromLocalStorage() {
    try {
      const projId = typeof FacilityStore !== "undefined" ? FacilityStore.getProjectId() : "default";
      const raw = localStorage.getItem(`netselect_active_state_${projId}`) || localStorage.getItem("netselect_active_state_v1");
      if (!raw) return;
      const parsed = JSON.parse(raw);

      if (Array.isArray(parsed.projectBOM) && typeof projectBOM !== "undefined") {
        projectBOM.length = 0;
        projectBOM.push(...parsed.projectBOM);
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
    }
  },

  /**
   * Renders saved project quote snapshots into the modal
   */
  renderSavedProjectsList() {
    const container = document.getElementById("savedProjectsList");
    if (!container) return;

    let saved = [];
    try {
      saved = JSON.parse(localStorage.getItem("netselect_saved_quotes") || "[]");
    } catch (e) {
      saved = [];
    }

    if (saved.length === 0) {
      container.innerHTML = `<span class="text-xs text-slate-500 italic block py-2">No saved quote snapshots found.</span>`;
      return;
    }

    container.innerHTML = saved.map((proj, idx) => {
      const safeName = escapeHTML(proj.name || "Untitled Snapshot");
      const safeDate = escapeHTML(proj.date || "");
      const itemsCount = parseInt(proj.itemsCount, 10) || 0;
      const totalMsrp = parseFloat(proj.totalMsrp) || 0;

      return `
        <div class="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs hover:border-slate-700 transition-colors">
          <div class="truncate mr-2">
            <span class="font-bold text-white block truncate">${safeName}</span>
            <span class="text-[10px] text-slate-500 font-mono">${safeDate} &bull; ${itemsCount} items &bull; $${totalMsrp.toLocaleString()}</span>
          </div>
          <div class="flex items-center gap-1.5 shrink-0">
            <button onclick="StorageService.loadProjectSnapshot(${idx})" class="px-2.5 py-1 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-lg text-[10px] transition-all">Load</button>
            <button onclick="StorageService.deleteProjectSnapshot(${idx})" class="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors" title="Delete Snapshot"><i data-lucide="trash" class="w-3.5 h-3.5"></i></button>
          </div>
        </div>
      `;
    }).join('');

    safeCreateIcons(container);
  },

  /**
   * Saves active quote as a new named snapshot
   */
  saveCurrentAsNewProject() {
    const nameInput = document.getElementById("newProjectNameInput");
    const name = nameInput ? nameInput.value.trim() : null;
    if (!name) {
      if (typeof showToast === "function") showToast("Please enter a project name.");
      return;
    }

    const safeName = name.replace(/[<>"'/]/g, '').trim().slice(0, 80) || "Untitled Project";
    const projId = `proj-${Date.now()}`;
    if (typeof FacilityStore !== "undefined") {
      FacilityStore.setProjectId(projId);
    }

    let saved = [];
    try {
      saved = JSON.parse(localStorage.getItem("netselect_saved_quotes") || "[]");
    } catch (e) {
      saved = [];
    }

    let totalMsrp = 0;
    if (typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) {
      projectBOM.forEach(i => totalMsrp += ((i.msrp || 0) * (i.qty || 1)));
    }

    let facilityFloors = [];
    try {
      const rawFac = localStorage.getItem(`netselect_facility_${projId}`);
      if (rawFac) facilityFloors = JSON.parse(rawFac);
    } catch (e) {}

    saved.push({
      id: projId,
      name: safeName,
      date: new Date().toLocaleDateString(),
      itemsCount: (typeof projectBOM !== "undefined") ? projectBOM.reduce((acc, i) => acc + (i.qty || 1), 0) : 0,
      totalMsrp,
      bom: (typeof projectBOM !== "undefined") ? projectBOM : [],
      demandCounts: (typeof demandCounts !== "undefined") ? demandCounts : {},
      facilityFloors
    });

    const success = this.safeSetItem("netselect_saved_quotes", JSON.stringify(saved));
    if (!success) return;

    if (nameInput) nameInput.value = "";
    const label = document.getElementById("activeProjectLabel");
    if (label) label.innerText = safeName;

    this.saveStateToLocalStorage();
    if (typeof saveFacilityState === "function") saveFacilityState();

    this.renderSavedProjectsList();
    if (typeof showToast === "function") showToast(`Saved project: ${safeName}`);
  },

  /**
   * Loads a saved snapshot into the active workspace
   */
  loadProjectSnapshot(idx) {
    let saved = [];
    try {
      saved = JSON.parse(localStorage.getItem("netselect_saved_quotes") || "[]");
    } catch (e) { return; }

    const proj = saved[idx];
    if (!proj) return;

    const projId = (proj.id || `proj-${idx}`).replace(/[^a-zA-Z0-9_-]/g, '');
    if (typeof FacilityStore !== "undefined") {
      FacilityStore.setProjectId(projId);
    }

    if (typeof projectBOM !== "undefined") {
      projectBOM.length = 0;
      if (Array.isArray(proj.bom)) projectBOM.push(...proj.bom);
    }
    if (proj.demandCounts && typeof demandCounts !== "undefined") {
      Object.assign(demandCounts, proj.demandCounts);
    }

    const label = document.getElementById("activeProjectLabel");
    if (label) label.innerText = proj.name || "Project";

    if (typeof loadFacilityState === "function") {
      loadFacilityState();
    }

    if (typeof FacilityStore !== "undefined") {
      FacilityStore.notifyWorkspaceChange();
    }
    if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
    if (typeof runActiveFilter === "function") runActiveFilter();
    if (typeof updateBOMView === "function") updateBOMView();

    this.toggleProjectModal();
    if (typeof showToast === "function") showToast(`Loaded snapshot: ${proj.name}`);
  },

  /**
   * Deletes a saved project snapshot
   */
  deleteProjectSnapshot(idx) {
    let saved = [];
    try {
      saved = JSON.parse(localStorage.getItem("netselect_saved_quotes") || "[]");
    } catch (e) { return; }

    const proj = saved[idx];
    if (proj && proj.id) {
      localStorage.removeItem(`netselect_facility_${proj.id}`);
      localStorage.removeItem(`netselect_active_state_${proj.id}`);
      localStorage.removeItem(`netselect_topo_pos_${proj.id}`);
    }

    saved.splice(idx, 1);
    this.safeSetItem("netselect_saved_quotes", JSON.stringify(saved));
    this.renderSavedProjectsList();
    if (typeof showToast === "function") showToast("Snapshot deleted.");
  },

  /**
   * Exports full project configuration to a downloadable JSON file
   */
  exportCurrentProjectJSON() {
    const projId = typeof FacilityStore !== "undefined" ? FacilityStore.getProjectId() : "default";
    let facilityData = null;
    try {
      const rawFac = localStorage.getItem(`netselect_facility_${projId}`);
      if (rawFac) facilityData = JSON.parse(rawFac);
    } catch (e) {}

    const data = {
      projectId: projId,
      projectName: document.getElementById("activeProjectLabel")?.innerText || "Project",
      projectBOM: (typeof projectBOM !== "undefined") ? projectBOM : [],
      demandCounts: (typeof demandCounts !== "undefined") ? demandCounts : {},
      extraHeadroomPercent: (typeof extraHeadroomPercent !== "undefined") ? extraHeadroomPercent : 20,
      facilityData,
      exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `NetSelect_${data.projectName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    if (typeof showToast === "function") showToast("Exported project JSON.");
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
        const parsed = JSON.parse(e.target.result);
        if (!parsed || typeof parsed !== "object") {
          throw new Error("Invalid project structure");
        }

        if (Array.isArray(parsed.projectBOM)) {
          const rawId = parsed.projectId ? String(parsed.projectId) : `proj-${Date.now()}`;
          const projId = rawId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 50) || `proj-${Date.now()}`;
          
          if (typeof FacilityStore !== "undefined") {
            FacilityStore.setProjectId(projId);
          }

          // Deep sanitize and validate each BOM item against injection
          const sanitizedBOM = parsed.projectBOM.map(item => {
            if (!item || typeof item !== "object") return null;
            return {
              id: String(item.id || '').replace(/[<>"'/]/g, '').slice(0, 100),
              instanceId: String(item.instanceId || `inst-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`),
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
              parentInstanceId: item.parentInstanceId ? String(item.parentInstanceId).replace(/[<>"']/g, '').slice(0, 100) : null,
              closetName: item.closetName ? String(item.closetName).replace(/[<>"']/g, '').slice(0, 60) : "Unassigned",
              rackId: item.rackId ? String(item.rackId).replace(/[<>"']/g, '').slice(0, 60) : null,
              notes: item.notes ? String(item.notes).replace(/[<>"']/g, '').slice(0, 255) : ""
            };
          }).filter(Boolean);

          if (typeof projectBOM !== "undefined") {
            projectBOM.length = 0;
            projectBOM.push(...sanitizedBOM);
          }

          if (parsed.demandCounts && typeof demandCounts !== "undefined") {
            demandCounts.af = Math.max(0, parseInt(parsed.demandCounts.af, 10) || 0);
            demandCounts.at = Math.max(0, parseInt(parsed.demandCounts.at, 10) || 0);
            demandCounts.bt60 = Math.max(0, parseInt(parsed.demandCounts.bt60, 10) || 0);
            demandCounts.bt90 = Math.max(0, parseInt(parsed.demandCounts.bt90, 10) || 0);
          }

          if (typeof parsed.extraHeadroomPercent !== "undefined" && typeof extraHeadroomPercent !== "undefined") {
            extraHeadroomPercent = Math.min(100, Math.max(0, parseFloat(parsed.extraHeadroomPercent) || 20));
          }

          if (parsed.facilityData && typeof parsed.facilityData === "object") {
            this.safeSetItem(`netselect_facility_${projId}`, JSON.stringify(parsed.facilityData));
          }

          const rawName = parsed.projectName ? String(parsed.projectName) : "Project";
          const safeProjectName = rawName.replace(/[<>"']/g, '').trim().slice(0, 80) || "Project";
          const label = document.getElementById("activeProjectLabel");
          if (label) label.innerText = safeProjectName;

          if (typeof loadFacilityState === "function") loadFacilityState();

          if (typeof FacilityStore !== "undefined") {
            FacilityStore.notifyWorkspaceChange();
          }
          if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
          if (typeof runActiveFilter === "function") runActiveFilter();
          if (typeof updateBOMView === "function") updateBOMView();

          this.toggleProjectModal();
          if (typeof showToast === "function") showToast("Project JSON successfully loaded!");
        } else {
          throw new Error("Missing or invalid projectBOM array");
        }
      } catch (err) {
        console.error("[StorageService] JSON Import failed:", err);
        if (typeof showToast === "function") showToast("Invalid or corrupted project JSON file.");
      } finally {
        if (event.target) event.target.value = "";
      }
    };
    reader.readAsText(file);
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
window.saveCurrentAsNewProject = () => StorageService.saveCurrentAsNewProject();
window.loadProjectSnapshot = (idx) => StorageService.loadProjectSnapshot(idx);
window.deleteProjectSnapshot = (idx) => StorageService.deleteProjectSnapshot(idx);
window.exportCurrentProjectJSON = () => StorageService.exportCurrentProjectJSON();
window.importProjectJSON = (event) => StorageService.importProjectJSON(event);
