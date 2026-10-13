/**
 * OSS Design Tool - Onsite Camera Walk Audit & Reconciliation Engine
 * Reconciles field walk audit data (Excel, CSV, Bluebeam markups) with project BOM
 * and Physical Layout floor plan drops. Identifies mated devices, field discoveries,
 * missing design drops, and mounting/lens discrepancies.
 */

const WalkReconciliationEngine = {
  // Current audit state
  activeAuditFilter: "all", // "all" | "mated" | "unmapped" | "missing" | "discrepancy"
  activeSearchTerm: "",
  walkRecords: [],
  reconciledResults: [],
  isFieldAuditModeActive: false,

  init() {
    this.loadStoredAudit();
    return this;
  },

  get auditRecords() {
    return this.walkRecords;
  },

  set auditRecords(val) {
    this.walkRecords = val;
  },

  /**
   * Initializes local storage or retrieves stored audit session
   */
  getStorageKey() {
    const projId = typeof StorageService !== "undefined" ? StorageService.getActiveProjectId() : "default";
    return `netselect_walk_audit_${projId}`;
  },

  loadStoredAudit() {
    try {
      const raw = localStorage.getItem(this.getStorageKey());
      if (raw) {
        this.walkRecords = JSON.parse(raw);
        this.runReconciliation();
      }
    } catch (e) {
      console.warn("[WalkAudit] Could not load stored audit:", e);
    }
  },

  saveAuditState() {
    try {
      localStorage.setItem(this.getStorageKey(), JSON.stringify(this.walkRecords));
    } catch (e) {
      console.warn("[WalkAudit] Could not save audit state:", e);
    }
  },

  /**
   * Normalizes camera tags for robust matching (e.g. "CAM-01", "Cam 01", "Camera01", "C01")
   */
  normalizeTag(tag) {
    if (!tag) return "";
    return String(tag)
      .trim()
      .toLowerCase()
      .replace(/[\s\-_]+/g, "")
      .replace(/^camera/, "cam");
  },

  /**
   * Reconciles walk records against projectBOM and facilityFloors drops
   */
  runReconciliation() {
    const bom = (typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) ? projectBOM : [];
    const floors = (typeof facilityFloors !== "undefined" && Array.isArray(facilityFloors)) ? facilityFloors : [];

    // 1. Collect all design camera drops from floors & BOM
    const designDrops = [];
    floors.forEach(fl => {
      (fl.nodes || []).filter(n => n.type === "device").forEach(dev => {
        const bomItem = dev.instanceId ? bom.find(i => i.instanceId === dev.instanceId) : null;
        const role = (dev.role || (bomItem && bomItem.role) || "Camera").toLowerCase();
        const cat = (dev.category || (bomItem && bomItem.category) || "").toLowerCase();
        const isCam = role.includes("camera") || role.includes("surveillance") || role.includes("video") ||
                      cat.includes("camera") || dev.name?.toLowerCase().includes("cam");

        if (isCam) {
          designDrops.push({
            nodeId: dev.id,
            floorId: fl.id,
            floorName: fl.name || "Floor Plan",
            name: dev.name || "Camera Drop",
            model: dev.model || (bomItem && bomItem.model) || "IP Camera",
            sku: (bomItem && bomItem.sku) || dev.sku || "",
            instanceId: dev.instanceId || null,
            assignedCloset: dev.assignedCloset || (bomItem && bomItem.closetName) || "MDF",
            cableId: dev.cableId || (bomItem && bomItem.cableId) || "",
            walkVerified: !!dev.walkVerified,
            walkNotes: dev.walkNotes || "",
            normTag: this.normalizeTag(dev.name)
          });
        }
      });
    });

    // Also include any BOM cameras not yet placed on floor plans
    bom.forEach(b => {
      const role = (b.role || "").toLowerCase();
      const cat = (b.category || "").toLowerCase();
      if ((role.includes("camera") || cat.includes("camera") || b.model?.toLowerCase().includes("cam")) && !b.parentInstanceId) {
        const alreadyIn = designDrops.some(d => d.instanceId === b.instanceId);
        if (!alreadyIn) {
          designDrops.push({
            nodeId: null,
            floorId: null,
            floorName: "Unplaced in BOM",
            name: b.friendlyName || b.model,
            model: b.model,
            sku: b.sku || "",
            instanceId: b.instanceId,
            assignedCloset: b.closetName || b.rackId || "Unassigned",
            cableId: b.cableId || "",
            walkVerified: false,
            walkNotes: "",
            normTag: this.normalizeTag(b.friendlyName || b.model)
          });
        }
      }
    });

    const results = [];
    const matchedDesignDropIds = new Set();

    // 2. Iterate through walked items and find matches
    this.walkRecords.forEach(walkItem => {
      const walkNorm = this.normalizeTag(walkItem.tag || walkItem.name);
      
      // Match attempt 1: exact normalized tag
      let match = designDrops.find(d => !matchedDesignDropIds.has(d.nodeId || d.instanceId) && d.normTag === walkNorm);

      // Match attempt 2: numeric suffix matching (e.g. "CAM 04" -> 4)
      if (!match && walkNorm) {
        const numMatch = walkNorm.match(/\d+/);
        if (numMatch) {
          const targetNum = parseInt(numMatch[0], 10);
          match = designDrops.find(d => {
            if (matchedDesignDropIds.has(d.nodeId || d.instanceId)) return false;
            const dNum = d.normTag.match(/\d+/);
            return dNum && parseInt(dNum[0], 10) === targetNum;
          });
        }
      }

      if (match) {
        matchedDesignDropIds.add(match.nodeId || match.instanceId);
        const hasModelVariance = walkItem.model && match.model && 
          !match.model.toLowerCase().includes(walkItem.model.toLowerCase().replace(/camera|dome|bullet/g, '').trim());

        const status = (walkItem.status && walkItem.status.toLowerCase().includes("relocat")) 
          ? "discrepancy" 
          : (hasModelVariance ? "discrepancy" : "mated");

        results.push({
          status: status,
          walkTag: walkItem.tag || walkItem.name || "Walk Drop",
          walkModel: walkItem.model || "Observed Unit",
          walkLocation: walkItem.location || "Field",
          walkNotes: walkItem.notes || "",
          designName: match.name,
          designModel: match.model,
          designFloor: match.floorName,
          designCloset: match.assignedCloset,
          designDrop: match,
          varianceNote: hasModelVariance ? `Model mismatch: Field observes ${walkItem.model}` : ""
        });
      } else {
        // Discovered in field walk, but not present in drawings/BOM
        results.push({
          status: "unmapped",
          walkTag: walkItem.tag || walkItem.name || "Field Discovery",
          walkModel: walkItem.model || "Axis / Hanwha Camera",
          walkLocation: walkItem.location || "Field Location",
          walkNotes: walkItem.notes || "Discovered on site walk; not currently in design BOM",
          designName: "— Missing in Design —",
          designModel: "—",
          designFloor: "—",
          designCloset: "—",
          designDrop: null,
          varianceNote: "Unmapped field discovery"
        });
      }
    });

    // 3. Any design drops not matched are "Missing from Walk"
    designDrops.forEach(d => {
      if (!matchedDesignDropIds.has(d.nodeId || d.instanceId)) {
        results.push({
          status: "missing",
          walkTag: "— Not Observed —",
          walkModel: "—",
          walkLocation: "—",
          walkNotes: d.walkVerified ? "Previously marked verified" : "Planned in design, not logged during onsite walk",
          designName: d.name,
          designModel: d.model,
          designFloor: d.floorName,
          designCloset: d.assignedCloset,
          designDrop: d,
          varianceNote: "Drop planned in design but absent from walk log"
        });
      }
    });

    this.reconciledResults = results;
    return results;
  },

  /**
   * Parses CSV, TSV, or Bluebeam annotation paste
   */
  parseInputText(text) {
    if (!text || !text.trim()) return [];
    const lines = text.trim().split(/\r?\n/);
    if (lines.length === 0) return [];

    const parsed = [];
    let delimiter = "\t"; // default TSV for copy-pasting from Excel
    if (lines[0].includes(",") && !lines[0].includes("\t")) {
      delimiter = ",";
    }

    // Check if first line is a header
    const firstLineLower = lines[0].toLowerCase();
    const hasHeader = firstLineLower.includes("tag") || firstLineLower.includes("cam") || 
                      firstLineLower.includes("name") || firstLineLower.includes("model") ||
                      firstLineLower.includes("label") || firstLineLower.includes("subject");

    const startIdx = hasHeader ? 1 : 0;

    for (let i = startIdx; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      let cols = [];
      if (delimiter === ",") {
        // Regex parse CSV handling quotes
        const re = /(?:,|\n|^)("(?:(?:"")*[^"]*)*"|[^",\n]*|(?:\n|$))/g;
        let match;
        while ((match = re.exec(line)) !== null) {
          let val = match[1] || "";
          if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1).replace(/""/g, '"');
          cols.push(val.trim());
          if (re.lastIndex >= line.length) break;
        }
      } else {
        cols = line.split("\t").map(s => s.trim());
      }

      if (cols.length === 0 || !cols.some(c => c)) continue;

      // Extract columns: Col 0: Tag/Name, Col 1: Model, Col 2: Location/Room, Col 3: Notes/Status
      const tag = cols[0] || `CAM-${parsed.length + 1}`;
      const model = cols[1] || "Fixed Dome Camera";
      const location = cols[2] || "Main Building";
      const notes = cols.slice(3).join(" • ") || "Onsite Walk Verified";

      parsed.push({
        tag: tag,
        name: tag,
        model: model,
        location: location,
        notes: notes,
        status: notes.toLowerCase().includes("relocat") ? "relocate" : "verified"
      });
    }

    return parsed;
  },

  /**
   * Loads sample walk data for instant demonstration
   */
  loadSampleWalkData() {
    const sample = [
      { tag: "CAM-01", model: "Axis P3265-LVE", location: "Main Lobby Entrance", notes: "Verified. Mounted at 10ft AGL above double vestibule doors.", status: "verified" },
      { tag: "CAM-02", model: "Axis P3265-LVE", location: "Corridor 101 East", notes: "Verified. T-bar ceiling grid clip secure.", status: "verified" },
      { tag: "CAM-03", model: "Axis Q3538-LVE 4K", location: "Loading Dock North", notes: "Relocate 8ft West to clear overhead rolling door track.", status: "relocate" },
      { tag: "CAM-04", model: "Hanwha XNV-8081Z", location: "Parking Lot West Pole", notes: "Verified. 1.5\" rigid conduit mast mounted.", status: "verified" },
      { tag: "CAM-05", model: "Avigilon 5.0C-H5A", location: "Server Room Entry", notes: "Lens dusty. Needs 10ft A-frame ladder for servicing.", status: "verified" },
      { tag: "CAM-99", model: "Hanwha XNO-6080R Bullet", location: "Dumpster Enclosure Fence", notes: "Existing unmapped camera discovered on perimeter fence line. Add to project.", status: "unmapped" }
    ];
    this.walkRecords = sample;
    this.saveAuditState();
    this.runReconciliation();
    this.renderModal();
    if (typeof showToast === "function") {
      showToast("Loaded 6 sample onsite camera walk records!");
    }
  },

  /**
   * Sets verification flag on all matched floor drops
   */
  applyVerificationToDesign() {
    const floors = (typeof facilityFloors !== "undefined" && Array.isArray(facilityFloors)) ? facilityFloors : [];
    let count = 0;

    this.reconciledResults.filter(r => r.status === "mated" && r.designDrop && r.designDrop.nodeId).forEach(r => {
      floors.forEach(fl => {
        const node = (fl.nodes || []).find(n => n.id === r.designDrop.nodeId);
        if (node) {
          node.walkVerified = true;
          node.walkDate = new Date().toISOString().split('T')[0];
          node.walkNotes = r.walkNotes;
          count++;
        }
      });
    });

    if (typeof saveFacilityState === "function") saveFacilityState();
    if (typeof renderCableCanvas === "function") renderCableCanvas();
    this.renderModal();

    if (typeof showToast === "function") {
      showToast(`Successfully verified ${count} blueprint camera drops!`);
    }
  },

  /**
   * Adds an unmapped field discovery directly to projectBOM
   */
  addUnmappedToBOM(walkTag, walkModel, walkNotes) {
    if (typeof projectBOM === "undefined") return;

    // Pick camera from database or create generic
    let catalogMatch = null;
    if (typeof CAMERAS_DATABASE !== "undefined" && Array.isArray(CAMERAS_DATABASE)) {
      catalogMatch = CAMERAS_DATABASE.find(c => c.model.toLowerCase().includes(walkModel.toLowerCase().split(' ')[0])) || CAMERAS_DATABASE[0];
    }

    const newItem = {
      instanceId: `inst-cam-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      id: catalogMatch ? catalogMatch.id : "field-walk-camera",
      model: walkModel || (catalogMatch ? catalogMatch.model : "IP Surveillance Camera"),
      sku: catalogMatch ? catalogMatch.sku : "CAM-FIELD-WALK",
      role: "Camera",
      category: "cameras",
      vendor: catalogMatch ? catalogMatch.vendor : "Enterprise Video",
      friendlyName: walkTag,
      unitMSRP: catalogMatch ? catalogMatch.msrp : 799,
      quantity: 1,
      poeBudget: catalogMatch ? catalogMatch.powerConsumptionWatts : 12.0,
      baseWatts: 0,
      closetName: "MDF • Main Telecom",
      rackId: "MDF • Main Telecom",
      walkVerified: true,
      walkNotes: walkNotes || "Added from onsite field walk audit"
    };

    projectBOM.push(newItem);
    if (typeof saveBOMState === "function") saveBOMState();
    if (typeof renderBOMTable === "function") renderBOMTable();

    // Re-run reconciliation so this now counts as Mated
    this.runReconciliation();
    this.renderModal();

    if (typeof showToast === "function") {
      showToast(`Added ${walkTag} (${newItem.model}) to project BOM!`);
    }
  },

  /**
   * Exports reconciliation results as clean CSV
   */
  exportReconciliationCSV() {
    const headers = [
      "Status",
      "Field Walk Tag",
      "Field Observed Model",
      "Field Location",
      "Field Notes",
      "Design Name",
      "Design Model",
      "Floor Plan",
      "Assigned Telecom Closet",
      "Variance / Action"
    ];

    const rows = this.reconciledResults.map(r => [
      r.status.toUpperCase(),
      `"${(r.walkTag || '').replace(/"/g, '""')}"`,
      `"${(r.walkModel || '').replace(/"/g, '""')}"`,
      `"${(r.walkLocation || '').replace(/"/g, '""')}"`,
      `"${(r.walkNotes || '').replace(/"/g, '""')}"`,
      `"${(r.designName || '').replace(/"/g, '""')}"`,
      `"${(r.designModel || '').replace(/"/g, '""')}"`,
      `"${(r.designFloor || '').replace(/"/g, '""')}"`,
      `"${(r.designCloset || '').replace(/"/g, '""')}"`,
      `"${(r.varianceNote || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Camera_Walk_Audit_Reconciliation_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (typeof showToast === "function") {
      showToast("Exported camera walk reconciliation CSV!");
    }
  },

  /**
   * Toggles the Field Audit Mode on the Physical Layout Canvas
   */
  toggleFieldAuditMode() {
    this.isFieldAuditModeActive = !this.isFieldAuditModeActive;
    const btn = document.getElementById("btnCanvasFieldAudit");
    if (btn) {
      if (this.isFieldAuditModeActive) {
        btn.className = "px-2.5 py-1.5 rounded-xl border border-emerald-500 bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 shadow animate-pulse";
        btn.innerHTML = `<i data-lucide="check-square" class="w-3.5 h-3.5"></i> <span>Walk Audit: ACTIVE</span>`;
      } else {
        btn.className = "px-2.5 py-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors";
        btn.innerHTML = `<i data-lucide="clipboard-check" class="w-3.5 h-3.5 text-emerald-400"></i> <span>Walk Audit</span>`;
      }
      if (window.lucide) lucide.createIcons();
    }
    if (typeof showToast === "function") {
      showToast(this.isFieldAuditModeActive ? "Field Audit Mode ON: Click any camera drop on canvas to verify." : "Field Audit Mode OFF.");
    }
  },

  /**
   * Opens the Walk Audit & Reconciliation Modal
   */
  openModal() {
    let modal = document.getElementById("walkAuditModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "walkAuditModal";
      modal.className = "fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md";
      document.body.appendChild(modal);
    }
    modal.classList.remove("hidden");
    this.loadStoredAudit();
    this.runReconciliation();
    this.renderModal();
    if (window.lucide) lucide.createIcons();
  },

  closeModal() {
    const modal = document.getElementById("walkAuditModal");
    if (modal) modal.classList.add("hidden");
  },

  /**
   * Renders the complete Reconciliation Studio Modal
   */
  renderModal() {
    const modal = document.getElementById("walkAuditModal");
    if (!modal) return;

    const totalWalk = this.walkRecords.length;
    const matedCount = this.reconciledResults.filter(r => r.status === "mated").length;
    const unmappedCount = this.reconciledResults.filter(r => r.status === "unmapped").length;
    const missingCount = this.reconciledResults.filter(r => r.status === "missing").length;
    const discrepancyCount = this.reconciledResults.filter(r => r.status === "discrepancy").length;

    const filtered = this.reconciledResults.filter(r => {
      if (this.activeAuditFilter === "mated" && r.status !== "mated") return false;
      if (this.activeAuditFilter === "unmapped" && r.status !== "unmapped") return false;
      if (this.activeAuditFilter === "missing" && r.status !== "missing") return false;
      if (this.activeAuditFilter === "discrepancy" && r.status !== "discrepancy") return false;

      if (this.activeSearchTerm) {
        const q = this.activeSearchTerm.toLowerCase();
        const str = `${r.walkTag} ${r.walkModel} ${r.walkLocation} ${r.designName} ${r.designModel} ${r.walkNotes}`.toLowerCase();
        return str.includes(q);
      }
      return true;
    });

    modal.innerHTML = `
      <div class="bg-slate-900 border border-slate-700/80 w-full max-w-6xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-200">
        <!-- Header -->
        <div class="px-6 py-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <i data-lucide="clipboard-check" class="w-5 h-5"></i>
            </div>
            <div>
              <h2 class="text-base font-bold text-white flex items-center gap-2">
                Onsite Camera Walk Audit & Blueprint Reconciliation Studio
                <span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-700/60 text-emerald-300">ACC & Bluebeam Aligned</span>
              </h2>
              <p class="text-xs text-slate-400 mt-0.5">Reconcile field walk audits with project BOM and blueprint drops. Mates cameras, uncovers unmapped devices, and catches discrepancies.</p>
            </div>
          </div>
          <button onclick="WalkReconciliationEngine.closeModal()" class="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors">
            <i data-lucide="x" class="w-4 h-4"></i>
          </button>
        </div>

        <!-- Telemetry Banners & Filters -->
        <div class="px-6 py-3 bg-slate-950/40 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <!-- Metric Badges -->
          <div class="flex items-center gap-2 flex-wrap text-xs">
            <button onclick="WalkReconciliationEngine.setFilter('all')" class="px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 ${this.activeAuditFilter === 'all' ? 'bg-indigo-600 text-white border-indigo-500 shadow' : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'}">
              <span>All Items</span>
              <span class="px-1.5 py-0.2 rounded-md bg-slate-950 text-[10px] font-bold">${this.reconciledResults.length}</span>
            </button>
            <button onclick="WalkReconciliationEngine.setFilter('mated')" class="px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 ${this.activeAuditFilter === 'mated' ? 'bg-emerald-600 text-white border-emerald-500 shadow' : 'bg-slate-900 text-emerald-400 border-emerald-900/50 hover:bg-slate-800'}">
              <i data-lucide="check-circle-2" class="w-3.5 h-3.5 text-emerald-400"></i>
              <span>Mated / Verified</span>
              <span class="px-1.5 py-0.2 rounded-md bg-emerald-950 text-[10px] font-bold text-emerald-300">${matedCount}</span>
            </button>
            <button onclick="WalkReconciliationEngine.setFilter('unmapped')" class="px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 ${this.activeAuditFilter === 'unmapped' ? 'bg-amber-600 text-white border-amber-500 shadow' : 'bg-slate-900 text-amber-400 border-amber-900/50 hover:bg-slate-800'}">
              <i data-lucide="alert-circle" class="w-3.5 h-3.5 text-amber-400"></i>
              <span>Field Discoveries (Unmapped)</span>
              <span class="px-1.5 py-0.2 rounded-md bg-amber-950 text-[10px] font-bold text-amber-300">${unmappedCount}</span>
            </button>
            <button onclick="WalkReconciliationEngine.setFilter('missing')" class="px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 ${this.activeAuditFilter === 'missing' ? 'bg-rose-600 text-white border-rose-500 shadow' : 'bg-slate-900 text-rose-400 border-rose-900/50 hover:bg-slate-800'}">
              <i data-lucide="help-circle" class="w-3.5 h-3.5 text-rose-400"></i>
              <span>Missing from Walk</span>
              <span class="px-1.5 py-0.2 rounded-md bg-rose-950 text-[10px] font-bold text-rose-300">${missingCount}</span>
            </button>
            ${discrepancyCount > 0 ? `
              <button onclick="WalkReconciliationEngine.setFilter('discrepancy')" class="px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 ${this.activeAuditFilter === 'discrepancy' ? 'bg-cyan-600 text-white border-cyan-500 shadow' : 'bg-slate-900 text-cyan-400 border-cyan-900/50 hover:bg-slate-800'}">
                <i data-lucide="shuffle" class="w-3.5 h-3.5 text-cyan-400"></i>
                <span>Variance / Relocated</span>
                <span class="px-1.5 py-0.2 rounded-md bg-cyan-950 text-[10px] font-bold text-cyan-300">${discrepancyCount}</span>
              </button>
            ` : ''}
          </div>

          <!-- Search Bar -->
          <div class="relative flex items-center">
            <i data-lucide="search" class="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none"></i>
            <input 
              type="text" 
              placeholder="Search cameras, notes, rooms..." 
              value="${escapeHTML(this.activeSearchTerm)}"
              oninput="WalkReconciliationEngine.setSearch(this.value)"
              class="bg-slate-900 border border-slate-700/80 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-56"
            />
          </div>
        </div>

        <!-- Body: Reconciliation Table -->
        <div class="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
          <!-- Quick Action Banner -->
          <div class="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div class="flex items-center gap-3">
              <span class="font-bold text-slate-300">Automated Actions:</span>
              <button onclick="WalkReconciliationEngine.applyVerificationToDesign()" class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer">
                <i data-lucide="badge-check" class="w-4 h-4"></i> Apply Verification to Blueprint Drops
              </button>
              <button onclick="WalkReconciliationEngine.promptPasteImport()" class="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer">
                <i data-lucide="upload" class="w-4 h-4"></i> Import / Paste Walk Log
              </button>
              <button onclick="WalkReconciliationEngine.loadSampleWalkData()" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer">
                <i data-lucide="sparkles" class="w-3.5 h-3.5 text-amber-400"></i> Load Demo Walk Data
              </button>
            </div>
            <div class="flex items-center gap-2">
              <button onclick="WalkReconciliationEngine.exportReconciliationCSV()" class="px-3 py-1.5 rounded-lg bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-700 font-semibold flex items-center gap-1.5 transition-all cursor-pointer">
                <i data-lucide="download" class="w-4 h-4 text-cyan-400"></i> Export Audit CSV
              </button>
            </div>
          </div>

          <!-- Data Grid -->
          <div class="border border-slate-800 rounded-xl overflow-hidden shadow-lg bg-slate-950/70">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="bg-slate-900/90 border-b border-slate-800 font-mono text-[11px] text-slate-400 uppercase tracking-wider">
                  <th class="py-3 px-4 w-32">Status</th>
                  <th class="py-3 px-4 w-52">Field Walk Observation</th>
                  <th class="py-3 px-4 w-60">Design Drop / BOM Item</th>
                  <th class="py-3 px-4 w-40">Location / Closet</th>
                  <th class="py-3 px-4">Field Notes & Variances</th>
                  <th class="py-3 px-4 w-32 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800/60 font-sans">
                ${filtered.length === 0 ? `
                  <tr>
                    <td colspan="6" class="py-12 text-center text-slate-500">
                      <div class="flex flex-col items-center justify-center gap-2">
                        <i data-lucide="inbox" class="w-8 h-8 opacity-40"></i>
                        <span>No reconciliation records found matching criteria.</span>
                        <button onclick="WalkReconciliationEngine.loadSampleWalkData()" class="mt-2 text-xs text-indigo-400 hover:underline">Click here to load demo walk data</button>
                      </div>
                    </td>
                  </tr>
                ` : filtered.map((r, idx) => `
                  <tr class="hover:bg-slate-900/60 transition-colors">
                    <!-- Status Badge -->
                    <td class="py-3 px-4 align-top">
                      ${r.status === 'mated' ? `
                        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/60">
                          <i data-lucide="check" class="w-3 h-3"></i> Mated
                        </span>
                      ` : (r.status === 'unmapped' ? `
                        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-700/60">
                          <i data-lucide="alert-circle" class="w-3 h-3"></i> Unmapped
                        </span>
                      ` : (r.status === 'missing' ? `
                        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-700/60">
                          <i data-lucide="x" class="w-3 h-3"></i> Missing
                        </span>
                      ` : `
                        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-700/60">
                          <i data-lucide="shuffle" class="w-3 h-3"></i> Relocated
                        </span>
                      `))}
                    </td>

                    <!-- Walk Observation -->
                    <td class="py-3 px-4 align-top">
                      <div class="font-bold text-white flex items-center gap-1.5">
                        <span class="font-mono text-cyan-300">${escapeHTML(r.walkTag)}</span>
                      </div>
                      <div class="text-[11px] text-slate-400 mt-0.5">${escapeHTML(r.walkModel)}</div>
                      <div class="text-[10px] text-slate-500 font-mono mt-0.5">${escapeHTML(r.walkLocation)}</div>
                    </td>

                    <!-- Design Drop -->
                    <td class="py-3 px-4 align-top">
                      <div class="font-bold ${r.designDrop ? 'text-white' : 'text-slate-500 italic'}">
                        ${escapeHTML(r.designName)}
                      </div>
                      <div class="text-[11px] text-slate-400 mt-0.5">${escapeHTML(r.designModel)}</div>
                      ${r.designDrop && r.designDrop.cableId ? `
                        <div class="text-[10px] text-brand-300 font-mono mt-0.5">Cable: ${escapeHTML(r.designDrop.cableId)}</div>
                      ` : ''}
                    </td>

                    <!-- Location / Closet -->
                    <td class="py-3 px-4 align-top">
                      <div class="text-xs text-slate-300">${escapeHTML(r.designFloor || '—')}</div>
                      <div class="text-[11px] text-slate-500 mt-0.5">${escapeHTML(r.designCloset || '—')}</div>
                    </td>

                    <!-- Notes & Variances -->
                    <td class="py-3 px-4 align-top">
                      <div class="text-xs text-slate-300">${escapeHTML(r.walkNotes || '—')}</div>
                      ${r.varianceNote ? `
                        <div class="text-[11px] text-amber-400 font-medium mt-1 flex items-center gap-1">
                          <i data-lucide="alert-triangle" class="w-3 h-3 shrink-0"></i>
                          <span>${escapeHTML(r.varianceNote)}</span>
                        </div>
                      ` : ''}
                    </td>

                    <!-- Actions -->
                    <td class="py-3 px-4 align-top text-right">
                      ${r.status === 'unmapped' ? `
                        <button
                          data-walk-tag="${escapeHTML(r.walkTag)}"
                          data-walk-model="${escapeHTML(r.walkModel)}"
                          data-walk-notes="${escapeHTML(r.walkNotes)}"
                          onclick="WalkReconciliationEngine.addUnmappedToBOM(this.dataset.walkTag, this.dataset.walkModel, this.dataset.walkNotes)"
                          class="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold text-[11px] transition-all cursor-pointer"
                          title="Add this discovered camera to project BOM"
                        >
                          + Add to BOM
                        </button>
                      ` : (r.designDrop && r.designDrop.nodeId ? `
                        <span class="text-[11px] font-mono text-emerald-400 font-bold">✓ Aligned</span>
                      ` : `
                        <span class="text-[11px] text-slate-500">—</span>
                      `)}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs shrink-0">
          <div class="text-slate-400">
            Total Reconciled Items: <span class="font-bold text-white">${this.reconciledResults.length}</span> (Mated: <span class="text-emerald-400 font-bold">${matedCount}</span>, Unmapped: <span class="text-amber-400 font-bold">${unmappedCount}</span>, Missing: <span class="text-rose-400 font-bold">${missingCount}</span>)
          </div>
          <button onclick="WalkReconciliationEngine.closeModal()" class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-white font-semibold transition-colors">
            Close
          </button>
        </div>
      </div>
    `;

    if (window.lucide) lucide.createIcons();
  },

  setFilter(filter) {
    this.activeAuditFilter = filter;
    this.renderModal();
  },

  setSearch(q) {
    this.activeSearchTerm = q;
    this.renderModal();
  },

  /**
   * Prompts user to paste walk data (CSV / TSV)
   */
  promptPasteImport() {
    const raw = prompt("Paste your camera walk audit table (from Excel, CSV, or Bluebeam):\nExpected columns: Tag / Name [tab or comma] Model [tab] Location [tab] Notes / Status");
    if (!raw) return;

    const parsed = this.parseInputText(raw);
    if (parsed.length === 0) {
      alert("No valid camera records detected. Please ensure lines have at least a camera tag or name.");
      return;
    }

    this.walkRecords = parsed;
    this.saveAuditState();
    this.runReconciliation();
    this.renderModal();

    if (typeof showToast === "function") {
      showToast(`Imported ${parsed.length} camera records from walk audit!`);
    }
  }
};

window.WalkReconciliationEngine = WalkReconciliationEngine;
window.openWalkReconciliationModal = () => WalkReconciliationEngine.openModal();
window.closeWalkReconciliationModal = () => WalkReconciliationEngine.closeModal();
window.toggleCanvasFieldAuditMode = () => WalkReconciliationEngine.toggleFieldAuditMode();
