/**
 * OSS Design Tool - Revision Tracking & Change Order Engine
 * Manages project milestone snapshots (Rev 0, Rev A, CO-01), automated 
 * diff comparison between versions, net cost deltas, and client change orders.
 */

const RevisionEngine = {
  getStorageKey(projId = null) {
    const pId = projId || (typeof StorageService !== "undefined" ? StorageService.getActiveProjectId() : "default");
    return `netselect_project_revisions_${pId}`;
  },

  getRevisions(projId = null) {
    try {
      const raw = localStorage.getItem(this.getStorageKey(projId));
      if (!raw) return [];
      const list = JSON.parse(raw);
      return Array.isArray(list) ? list : [];
    } catch (e) {
      console.error("[RevisionEngine] Error reading revisions:", e);
      return [];
    }
  },

  saveRevisions(list, projId = null) {
    try {
      localStorage.setItem(this.getStorageKey(projId), JSON.stringify(list));
      return true;
    } catch (e) {
      console.error("[RevisionEngine] Error saving revisions:", e);
      if (typeof showToast === "function") {
        showToast("Storage quota warning: unable to save snapshot. Try pruning older revisions.");
      }
      return false;
    }
  },

  captureCurrentSnapshot(code, name, notes, author = "Lead Designer") {
    const projId = typeof StorageService !== "undefined" ? StorageService.getActiveProjectId() : "default";
    const projName = typeof StorageService !== "undefined" ? StorageService.getActiveProjectName() : "Project";

    const bomCopy = (typeof projectBOM !== "undefined" && Array.isArray(projectBOM))
      ? JSON.parse(JSON.stringify(projectBOM))
      : [];

    const floorsCopy = (typeof facilityFloors !== "undefined" && Array.isArray(facilityFloors))
      ? JSON.parse(JSON.stringify(facilityFloors))
      : [];

    const linksCopy = (typeof topologyLinks !== "undefined" && Array.isArray(topologyLinks))
      ? JSON.parse(JSON.stringify(topologyLinks))
      : [];

    // Compute key metrics at snapshot time
    let totalMSRP = 0;
    let cameraCount = 0;
    let readerCount = 0;
    let switchPortCount = 0;

    bomCopy.forEach(item => {
      const qty = Number(item.quantity || 1);
      const price = Number(item.unitMSRP || item.msrp || item.unitPrice || 0);
      totalMSRP += qty * price;

      const sub = (item.subsystem || item.category || "").toLowerCase();
      const model = (item.model || "").toLowerCase();
      if (sub.includes("video") || sub.includes("camera") || model.includes("cam") || model.includes("dome") || model.includes("bullet")) {
        cameraCount += qty;
      } else if (sub.includes("access") || sub.includes("reader") || model.includes("card") || model.includes("reader") || model.includes("door")) {
        readerCount += qty;
      } else if (sub.includes("network") || model.includes("switch")) {
        switchPortCount += (Number(item.rj45Ports || item.ports || 24) * qty);
      }
    });

    let totalFootage = 0;
    floorsCopy.forEach(fl => {
      (fl.nodes || []).filter(n => n.type === "device").forEach(d => {
        if (d.calculatedRun && d.calculatedRun.totalFt) {
          totalFootage += d.calculatedRun.totalFt;
        }
      });
    });

    const rev = {
      id: `rev-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      code: code || `Rev ${this.getRevisions(projId).length}`,
      name: name || `Milestone ${new Date().toLocaleDateString()}`,
      notes: notes || "",
      author: author || "Lead Designer",
      timestamp: Date.now(),
      dateFormatted: new Date().toLocaleString(),
      metrics: {
        totalMSRP: Math.round(totalMSRP),
        itemCount: bomCopy.reduce((sum, i) => sum + (Number(i.quantity) || 1), 0),
        cameraCount,
        readerCount,
        switchPortCount,
        totalFootage: Math.round(totalFootage)
      },
      data: {
        projectName: projName,
        projectBOM: bomCopy,
        facilityFloors: floorsCopy,
        topologyLinks: linksCopy
      }
    };

    const revisions = this.getRevisions(projId);
    revisions.unshift(rev); // newest first
    this.saveRevisions(revisions, projId);
    return rev;
  },

  deleteRevision(revId, projId = null) {
    const list = this.getRevisions(projId).filter(r => r.id !== revId);
    this.saveRevisions(list, projId);
  },

  restoreRevision(revId, projId = null) {
    const list = this.getRevisions(projId);
    const target = list.find(r => r.id === revId);
    if (!target || !target.data) return false;

    if (Array.isArray(target.data.projectBOM) && typeof projectBOM !== "undefined") {
      projectBOM.length = 0;
      projectBOM.push(...JSON.parse(JSON.stringify(target.data.projectBOM)));
    }

    if (Array.isArray(target.data.facilityFloors) && typeof facilityFloors !== "undefined") {
      facilityFloors.length = 0;
      facilityFloors.push(...JSON.parse(JSON.stringify(target.data.facilityFloors)));
    }

    if (Array.isArray(target.data.topologyLinks) && typeof topologyLinks !== "undefined") {
      topologyLinks.length = 0;
      topologyLinks.push(...JSON.parse(JSON.stringify(target.data.topologyLinks)));
    }

    if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
      FacilityStore.notifyWorkspaceChange();
    }

    if (typeof StorageService !== "undefined" && typeof StorageService.saveStateToLocalStorage === "function") {
      StorageService.saveStateToLocalStorage();
    }

    if (typeof updateBOMView === "function") updateBOMView();
    if (typeof renderBOMTable === "function") renderBOMTable();
    if (typeof renderCableCanvas === "function") renderCableCanvas();
    if (typeof auditProjectHealth === "function") auditProjectHealth();

    return true;
  },

  getCurrentWorkingStateAsRevision() {
    const projName = typeof StorageService !== "undefined" ? StorageService.getActiveProjectName() : "Project";
    const bomCopy = (typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) ? projectBOM : [];
    const floorsCopy = (typeof facilityFloors !== "undefined" && Array.isArray(facilityFloors)) ? facilityFloors : [];

    let totalMSRP = 0;
    bomCopy.forEach(item => {
      const qty = Number(item.quantity || 1);
      const price = Number(item.unitMSRP || item.msrp || item.unitPrice || 0);
      totalMSRP += qty * price;
    });

    let totalFootage = 0;
    floorsCopy.forEach(fl => {
      (fl.nodes || []).filter(n => n.type === "device").forEach(d => {
        if (d.calculatedRun && d.calculatedRun.totalFt) totalFootage += d.calculatedRun.totalFt;
      });
    });

    return {
      id: "working-draft",
      code: "Working Draft",
      name: "Current Canvas (Unsaved Changes)",
      notes: "Active working state currently in memory",
      author: "Active Session",
      timestamp: Date.now(),
      dateFormatted: "Current Working State",
      metrics: {
        totalMSRP: Math.round(totalMSRP),
        itemCount: bomCopy.reduce((sum, i) => sum + (Number(i.quantity) || 1), 0),
        totalFootage: Math.round(totalFootage)
      },
      data: {
        projectName: projName,
        projectBOM: bomCopy,
        facilityFloors: floorsCopy,
        topologyLinks: typeof topologyLinks !== "undefined" ? topologyLinks : []
      }
    };
  },

  /**
   * Computes a full BOM difference between baseRev and compareRev
   */
  diffRevisions(baseRev, compareRev) {
    const baseBOM = (baseRev && baseRev.data && Array.isArray(baseRev.data.projectBOM)) ? baseRev.data.projectBOM : [];
    const compBOM = (compareRev && compareRev.data && Array.isArray(compareRev.data.projectBOM)) ? compareRev.data.projectBOM : [];

    // Group both BOMs by unified Key: SKU + Closet
    const mapBase = new Map();
    baseBOM.forEach(item => {
      const key = `${item.sku || item.model}::${item.closetName || item.rackId || 'General'}`;
      if (!mapBase.has(key)) {
        mapBase.set(key, { ...item, quantity: 0 });
      }
      mapBase.get(key).quantity += (Number(item.quantity) || 1);
    });

    const mapComp = new Map();
    compBOM.forEach(item => {
      const key = `${item.sku || item.model}::${item.closetName || item.rackId || 'General'}`;
      if (!mapComp.has(key)) {
        mapComp.set(key, { ...item, quantity: 0 });
      }
      mapComp.get(key).quantity += (Number(item.quantity) || 1);
    });

    const added = [];
    const removed = [];
    const modified = [];
    const unchanged = [];

    // Check all in Compare against Base
    mapComp.forEach((compItem, key) => {
      const baseItem = mapBase.get(key);
      const unitPrice = Number(compItem.unitMSRP || compItem.msrp || compItem.unitPrice || 0);

      if (!baseItem) {
        // Completely New Item Added
        added.push({
          key,
          item: compItem,
          qtyDelta: compItem.quantity,
          baseQty: 0,
          compQty: compItem.quantity,
          unitPrice,
          costDelta: compItem.quantity * unitPrice,
          type: "added"
        });
      } else {
        const qtyDelta = compItem.quantity - baseItem.quantity;
        if (qtyDelta !== 0) {
          modified.push({
            key,
            item: compItem,
            qtyDelta,
            baseQty: baseItem.quantity,
            compQty: compItem.quantity,
            unitPrice,
            costDelta: qtyDelta * unitPrice,
            type: qtyDelta > 0 ? "qty_increase" : "qty_decrease"
          });
        } else {
          unchanged.push({
            key,
            item: compItem,
            qtyDelta: 0,
            baseQty: baseItem.quantity,
            compQty: compItem.quantity,
            unitPrice,
            costDelta: 0,
            type: "unchanged"
          });
        }
      }
    });

    // Check for Items Deleted from Base
    mapBase.forEach((baseItem, key) => {
      if (!mapComp.has(key)) {
        const unitPrice = Number(baseItem.unitMSRP || baseItem.msrp || baseItem.unitPrice || 0);
        removed.push({
          key,
          item: baseItem,
          qtyDelta: -baseItem.quantity,
          baseQty: baseItem.quantity,
          compQty: 0,
          unitPrice,
          costDelta: -(baseItem.quantity * unitPrice),
          type: "removed"
        });
      }
    });

    // Summary calculations
    const addedCost = added.reduce((sum, i) => sum + i.costDelta, 0);
    const modifiedCost = modified.reduce((sum, i) => sum + i.costDelta, 0);
    const removedCost = removed.reduce((sum, i) => sum + i.costDelta, 0);
    const netMSRPDelta = addedCost + modifiedCost + removedCost;

    const baseTotalMSRP = baseRev?.metrics?.totalMSRP || baseBOM.reduce((sum, i) => sum + ((Number(i.quantity) || 1) * Number(i.unitMSRP || i.msrp || 0)), 0);
    const compTotalMSRP = compareRev?.metrics?.totalMSRP || compBOM.reduce((sum, i) => sum + ((Number(i.quantity) || 1) * Number(i.unitMSRP || i.msrp || 0)), 0);

    const baseFt = baseRev?.metrics?.totalFootage || 0;
    const compFt = compareRev?.metrics?.totalFootage || 0;
    const footageDelta = compFt - baseFt;

    return {
      baseRev,
      compareRev,
      added,
      removed,
      modified,
      unchanged,
      stats: {
        addedCount: added.reduce((s, i) => s + i.qtyDelta, 0),
        removedCount: Math.abs(removed.reduce((s, i) => s + i.qtyDelta, 0)),
        modifiedCount: modified.length,
        baseTotalMSRP: Math.round(baseTotalMSRP),
        compTotalMSRP: Math.round(compTotalMSRP),
        netMSRPDelta: Math.round(netMSRPDelta),
        footageDelta: Math.round(footageDelta)
      }
    };
  }
};

// UI Rendering & Modal Controller
function openRevisionModal() {
  let modal = document.getElementById("revisionModal");
  if (!modal) {
    modal = createRevisionModalDOM();
    document.body.appendChild(modal);
  }
  modal.classList.remove("hidden");
  renderRevisionTimeline();
  initRevisionDiffDropdowns();
  if (window.lucide) lucide.createIcons();
}

function closeRevisionModal() {
  const modal = document.getElementById("revisionModal");
  if (modal) modal.classList.add("hidden");
}

function createRevisionModalDOM() {
  const div = document.createElement("div");
  div.id = "revisionModal";
  div.className = "hidden fixed top-[100px] inset-x-0 bottom-0 z-30 bg-slate-950 flex flex-col p-1 sm:p-2 animate-fade-in";
  div.innerHTML = `
    <div class="bg-slate-900 border border-slate-800 rounded-xl w-full h-full flex flex-col shadow-2xl overflow-hidden">
      <!-- Header -->
      <div class="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
        <div class="flex items-center gap-3">
          <div class="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <i data-lucide="git-branch" class="w-5 h-5"></i>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h3 class="text-base font-bold text-white tracking-wide">Revision Tracking &amp; Change Order Engine</h3>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">Enterprise Grade</span>
            </div>
            <p class="text-xs text-slate-400 mt-0.5">Capture milestone baselines, compare version deltas, and generate formal Change Orders.</p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <button onclick="promptCreateRevisionSnapshot()" class="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-purple-600/20 transition-all cursor-pointer">
            <i data-lucide="camera" class="w-4 h-4"></i>
            <span>Create Milestone Snapshot</span>
          </button>
          <button onclick="closeRevisionModal()" class="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>
      </div>

      <!-- Tabs Bar -->
      <div class="flex items-center justify-between border-b border-slate-800 bg-slate-900/60 px-6 py-2">
        <div class="flex gap-2">
          <button id="revTabTimelineBtn" onclick="switchRevisionTab('timeline')" class="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all bg-purple-600 text-white shadow">
            Milestone Timeline
          </button>
          <button id="revTabDiffBtn" onclick="switchRevisionTab('diff')" class="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all text-slate-400 hover:text-white">
            Change Order Comparator (Diff)
          </button>
        </div>

        <div id="diffActionButtons" class="hidden flex items-center gap-2">
          <button onclick="exportChangeOrderCSV()" class="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700 cursor-pointer">
            <i data-lucide="download" class="w-3.5 h-3.5 text-purple-400"></i>
            <span>Export Change Order CSV</span>
          </button>
          <button onclick="printChangeOrderReport()" class="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700 cursor-pointer">
            <i data-lucide="printer" class="w-3.5 h-3.5 text-slate-400"></i>
            <span>Print Report</span>
          </button>
        </div>
      </div>

      <!-- Tab Content: Timeline -->
      <div id="revTimelineView" class="p-6 overflow-y-auto flex-1 space-y-4">
        <div id="revTimelineContainer" class="space-y-3">
          <!-- Rendered dynamically -->
        </div>
      </div>

      <!-- Tab Content: Diff / Change Order -->
      <div id="revDiffView" class="hidden p-6 overflow-y-auto flex-1 flex flex-col space-y-4">
        <!-- Selector Bar -->
        <div class="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <div>
              <label class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Base Baseline (From)</label>
              <select id="revBaseSelect" onchange="runRevisionDiff()" class="bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-1.5 text-xs font-bold focus:border-purple-500">
              </select>
            </div>
            <div class="text-slate-500 pt-4 font-bold text-base">➔</div>
            <div>
              <label class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Target / Compare (To)</label>
              <select id="revCompareSelect" onchange="runRevisionDiff()" class="bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-1.5 text-xs font-bold focus:border-purple-500">
              </select>
            </div>
          </div>

          <div id="diffKpiPills" class="flex items-center gap-3">
            <!-- Dynamically populated KPI badges -->
          </div>
        </div>

        <!-- Diff Table Container -->
        <div class="flex-1 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
          <div class="overflow-x-auto overflow-y-auto flex-1 max-h-[500px]">
            <table class="w-full text-left text-xs text-slate-300 border-collapse">
              <thead class="bg-slate-900/90 text-slate-400 font-bold uppercase text-[10px] tracking-wider sticky top-0 border-b border-slate-800 z-10 backdrop-blur-sm">
                <tr>
                  <th class="py-2.5 px-3">Status</th>
                  <th class="py-2.5 px-3">Item Description / Model</th>
                  <th class="py-2.5 px-3">Location / Closet</th>
                  <th class="py-2.5 px-3 text-center">Base Qty</th>
                  <th class="py-2.5 px-3 text-center">New Qty</th>
                  <th class="py-2.5 px-3 text-center">Delta</th>
                  <th class="py-2.5 px-3 text-right">Unit MSRP</th>
                  <th class="py-2.5 px-3 text-right">Net Change ($)</th>
                </tr>
              </thead>
              <tbody id="revDiffTableBody" class="divide-y divide-slate-800/60 font-mono">
                <!-- Rendered dynamically -->
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;
  return div;
}

function switchRevisionTab(tab) {
  const timeBtn = document.getElementById("revTabTimelineBtn");
  const diffBtn = document.getElementById("revTabDiffBtn");
  const timeView = document.getElementById("revTimelineView");
  const diffView = document.getElementById("revDiffView");
  const diffActions = document.getElementById("diffActionButtons");

  if (tab === "timeline") {
    timeBtn.className = "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all bg-purple-600 text-white shadow";
    diffBtn.className = "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all text-slate-400 hover:text-white";
    timeView.classList.remove("hidden");
    diffView.classList.add("hidden");
    diffActions.classList.add("hidden");
    renderRevisionTimeline();
  } else {
    diffBtn.className = "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all bg-purple-600 text-white shadow";
    timeBtn.className = "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all text-slate-400 hover:text-white";
    diffView.classList.remove("hidden");
    timeView.classList.add("hidden");
    diffActions.classList.remove("hidden");
    initRevisionDiffDropdowns();
    runRevisionDiff();
  }
  if (window.lucide) lucide.createIcons();
}

function renderRevisionTimeline() {
  const container = document.getElementById("revTimelineContainer");
  if (!container) return;

  const revisions = RevisionEngine.getRevisions();

  if (revisions.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12 border-2 border-dashed border-slate-800 rounded-2xl bg-slate-950/40">
        <div class="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center mx-auto mb-3 border border-purple-500/20">
          <i data-lucide="history" class="w-6 h-6"></i>
        </div>
        <h4 class="text-white font-bold text-sm">No Milestone Snapshots Yet</h4>
        <p class="text-slate-400 text-xs max-w-md mx-auto mt-1 mb-4">
          Capture your first project baseline (e.g. "Rev 0 - Bid Set Baseline") to track additions, deletions, and cost variations as the design progresses.
        </p>
        <button onclick="promptCreateRevisionSnapshot()" class="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-600/20 cursor-pointer inline-flex items-center gap-2">
          <i data-lucide="plus" class="w-4 h-4"></i> Create Rev 0 Snapshot
        </button>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
    return;
  }

  container.innerHTML = revisions.map((rev, idx) => {
    const isLatest = idx === 0;
    return `
      <div class="p-4 rounded-xl bg-slate-950 border ${isLatest ? 'border-purple-500/40 shadow-lg shadow-purple-950/20' : 'border-slate-800'} flex items-center justify-between gap-4 transition-all">
        <div class="flex items-start gap-3.5">
          <div class="p-2.5 rounded-xl ${isLatest ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-300'} font-black text-xs min-w-[50px] text-center border border-purple-400/30">
            ${escapeHTML(rev.code)}
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h4 class="text-sm font-bold text-white">${escapeHTML(rev.name)}</h4>
              ${isLatest ? `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">Latest Baseline</span>` : ''}
            </div>
            <p class="text-xs text-slate-400 mt-0.5">${escapeHTML(rev.notes || 'No description notes provided.')}</p>
            <div class="flex items-center gap-4 mt-2 text-[11px] text-slate-500 font-mono">
              <span>Author: <strong class="text-slate-300">${escapeHTML(rev.author)}</strong></span>
              <span>•</span>
              <span>${rev.dateFormatted}</span>
              <span>•</span>
              <span class="text-emerald-400 font-bold">$${(rev.metrics.totalMSRP || 0).toLocaleString()} MSRP</span>
              <span>•</span>
              <span>${rev.metrics.itemCount || 0} Units</span>
              <span>•</span>
              <span>${rev.metrics.totalFootage || 0} ft Cabling</span>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button onclick="compareWithWorkingDraft('${rev.id}')" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 hover:text-white text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer">
            <i data-lucide="git-pull-request" class="w-3.5 h-3.5"></i>
            <span>Compare vs Working</span>
          </button>
          <button onclick="confirmRestoreRevision('${rev.id}')" class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-white text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer" title="Revert project to this milestone state">
            <i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i>
            <span>Revert</span>
          </button>
          <button onclick="deleteRevisionItem('${rev.id}')" class="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950 text-slate-500 hover:text-rose-400 border border-slate-800 transition-colors cursor-pointer" title="Delete snapshot">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();
}

function promptCreateRevisionSnapshot() {
  const revCount = RevisionEngine.getRevisions().length;
  const defaultCode = revCount === 0 ? "Rev 0" : `Rev ${String.fromCharCode(64 + revCount)}`;
  const code = prompt("Enter Revision / Milestone Code (e.g. Rev 0, Rev A, CO-01):", defaultCode);
  if (!code) return;

  const name = prompt("Milestone Name / Purpose (e.g. 50% DD Submittal, Client Value Engineering):", `${code} Submittal Baseline`);
  if (!name) return;

  const notes = prompt("Revision Notes / Scope Summary:", "Design milestone freeze snapshot.");
  const author = prompt("Author / Designer Name:", "Lead Systems Engineer") || "Lead Systems Engineer";

  RevisionEngine.captureCurrentSnapshot(code.trim(), name.trim(), (notes || '').trim(), author.trim());
  renderRevisionTimeline();
  if (typeof showToast === "function") {
    showToast(`Captured milestone snapshot: ${code}`);
  }
}

function deleteRevisionItem(revId) {
  if (!confirm("Are you sure you want to delete this revision milestone?")) return;
  RevisionEngine.deleteRevision(revId);
  renderRevisionTimeline();
}

function confirmRestoreRevision(revId) {
  if (!confirm("WARNING: Reverting will replace the current active BOM and physical layout with this historical snapshot. Continue?")) return;
  const ok = RevisionEngine.restoreRevision(revId);
  if (ok) {
    closeRevisionModal();
    if (typeof showToast === "function") {
      showToast("Workspace successfully restored to historical revision!");
    }
  }
}

function compareWithWorkingDraft(revId) {
  switchRevisionTab('diff');
  const baseSelect = document.getElementById("revBaseSelect");
  const compSelect = document.getElementById("revCompareSelect");
  if (baseSelect) baseSelect.value = revId;
  if (compSelect) compSelect.value = "working-draft";
  runRevisionDiff();
}

function initRevisionDiffDropdowns() {
  const baseSelect = document.getElementById("revBaseSelect");
  const compSelect = document.getElementById("revCompareSelect");
  if (!baseSelect || !compSelect) return;

  const revisions = RevisionEngine.getRevisions();

  let optionsHTML = `
    <option value="working-draft">★ Working Draft (Current Canvas)</option>
  `;
  revisions.forEach(r => {
    optionsHTML += `<option value="${r.id}">${escapeHTML(r.code)} • ${escapeHTML(r.name)}</option>`;
  });

  baseSelect.innerHTML = optionsHTML;
  compSelect.innerHTML = optionsHTML;

  // Defaults: base is oldest snapshot, comp is working draft
  if (revisions.length > 0) {
    baseSelect.value = revisions[revisions.length - 1].id;
    compSelect.value = "working-draft";
  }
}

let _lastDiffResult = null;

function runRevisionDiff() {
  const baseSelect = document.getElementById("revBaseSelect");
  const compSelect = document.getElementById("revCompareSelect");
  const tableBody = document.getElementById("revDiffTableBody");
  const kpiContainer = document.getElementById("diffKpiPills");
  if (!baseSelect || !compSelect || !tableBody) return;

  const baseId = baseSelect.value;
  const compId = compSelect.value;

  const revisions = RevisionEngine.getRevisions();
  const getRev = (id) => {
    if (id === "working-draft") return RevisionEngine.getCurrentWorkingStateAsRevision();
    return revisions.find(r => r.id === id) || RevisionEngine.getCurrentWorkingStateAsRevision();
  };

  const baseRev = getRev(baseId);
  const compRev = getRev(compId);

  const diff = RevisionEngine.diffRevisions(baseRev, compRev);
  _lastDiffResult = diff;

  // Update KPI Bar
  const stats = diff.stats;
  const isPositive = stats.netMSRPDelta >= 0;
  if (kpiContainer) {
    kpiContainer.innerHTML = `
      <div class="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-center">
        <span class="text-[9px] uppercase font-bold text-slate-400 block">Net Change</span>
        <span class="text-xs font-mono font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}">
          ${isPositive ? '+' : ''}$${stats.netMSRPDelta.toLocaleString()}
        </span>
      </div>
      <div class="px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800/60 text-center">
        <span class="text-[9px] uppercase font-bold text-emerald-400 block">Added</span>
        <span class="text-xs font-mono font-bold text-emerald-300">+${stats.addedCount} items</span>
      </div>
      <div class="px-3 py-1.5 rounded-lg bg-rose-950/60 border border-rose-800/60 text-center">
        <span class="text-[9px] uppercase font-bold text-rose-400 block">Removed</span>
        <span class="text-xs font-mono font-bold text-rose-300">-${stats.removedCount} items</span>
      </div>
      <div class="px-3 py-1.5 rounded-lg bg-sky-950/60 border border-sky-800/60 text-center">
        <span class="text-[9px] uppercase font-bold text-sky-400 block">Modified</span>
        <span class="text-xs font-mono font-bold text-sky-300">${stats.modifiedCount} items</span>
      </div>
    `;
  }

  // Populate Table rows
  const allRows = [...diff.added, ...diff.modified, ...diff.removed];
  if (allRows.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-10 text-slate-500 font-sans text-xs">
          No differences found between selected versions. The Bill of Materials is 100% identical.
        </td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = allRows.map(row => {
    let statusBadge = "";
    let rowBg = "";
    if (row.type === "added") {
      statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">+ ADDED</span>`;
      rowBg = "bg-emerald-950/15";
    } else if (row.type === "removed") {
      statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">- REMOVED</span>`;
      rowBg = "bg-rose-950/15 text-slate-400";
    } else if (row.type === "qty_increase") {
      statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">▲ QTY +</span>`;
      rowBg = "bg-sky-950/15";
    } else if (row.type === "qty_decrease") {
      statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">▼ QTY -</span>`;
      rowBg = "bg-amber-950/15";
    }

    const deltaSign = row.qtyDelta > 0 ? `+${row.qtyDelta}` : `${row.qtyDelta}`;
    const costSign = row.costDelta > 0 ? `+$${row.costDelta.toLocaleString()}` : (row.costDelta < 0 ? `-$${Math.abs(row.costDelta).toLocaleString()}` : '$0');

    return `
      <tr class="${rowBg} hover:bg-slate-800/40 transition-colors">
        <td class="py-2.5 px-3 whitespace-nowrap">${statusBadge}</td>
        <td class="py-2.5 px-3">
          <div class="font-bold text-white font-sans">${escapeHTML(row.item.model || row.item.sku || 'Item')}</div>
          <div class="text-[10px] text-slate-400 font-mono">${escapeHTML(row.item.sku || '')} • ${escapeHTML(row.item.category || row.item.subsystem || 'Equipment')}</div>
        </td>
        <td class="py-2.5 px-3 text-slate-300 font-sans text-xs">
          ${escapeHTML(row.item.closetName || row.item.rackId || 'General Facility')}
        </td>
        <td class="py-2.5 px-3 text-center text-slate-400">${row.baseQty}</td>
        <td class="py-2.5 px-3 text-center text-white font-bold">${row.compQty}</td>
        <td class="py-2.5 px-3 text-center font-bold ${row.qtyDelta > 0 ? 'text-emerald-400' : 'text-rose-400'}">${deltaSign}</td>
        <td class="py-2.5 px-3 text-right text-slate-300">$${(row.unitPrice || 0).toLocaleString()}</td>
        <td class="py-2.5 px-3 text-right font-bold ${row.costDelta > 0 ? 'text-emerald-400' : (row.costDelta < 0 ? 'text-rose-400' : 'text-slate-400')}">
          ${costSign}
        </td>
      </tr>
    `;
  }).join('');
}

function exportChangeOrderCSV() {
  if (!_lastDiffResult) {
    if (typeof showToast === "function") showToast("Please run a comparison first.");
    return;
  }

  const diff = _lastDiffResult;
  const rows = [
    ["Change Order Diff Summary"],
    ["Base Revision", diff.baseRev.code, diff.baseRev.name],
    ["Compare Revision", diff.compareRev.code, diff.compareRev.name],
    ["Export Date", new Date().toLocaleString()],
    [],
    ["Status", "SKU", "Model", "Subsystem", "Closet/Location", "Base Qty", "New Qty", "Delta Qty", "Unit MSRP", "Net Cost Delta"]
  ];

  const allItems = [...diff.added, ...diff.modified, ...diff.removed];
  allItems.forEach(i => {
    rows.push([
      i.type.toUpperCase(),
      `"${(i.item.sku || '').replace(/"/g, '""')}"`,
      `"${(i.item.model || '').replace(/"/g, '""')}"`,
      `"${(i.item.category || i.item.subsystem || '').replace(/"/g, '""')}"`,
      `"${(i.item.closetName || i.item.rackId || '').replace(/"/g, '""')}"`,
      i.baseQty,
      i.compQty,
      i.qtyDelta,
      i.unitPrice,
      i.costDelta
    ]);
  });

  rows.push([]);
  rows.push(["Summary Statistics"]);
  rows.push(["Net MSRP Delta", diff.stats.netMSRPDelta]);
  rows.push(["Added Items", diff.stats.addedCount]);
  rows.push(["Removed Items", diff.stats.removedCount]);
  rows.push(["Modified Lines", diff.stats.modifiedCount]);

  const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `ChangeOrder_${diff.baseRev.code}_vs_${diff.compareRev.code}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function printChangeOrderReport() {
  if (!_lastDiffResult) {
    if (typeof showToast === "function") showToast("Please run a comparison first.");
    return;
  }
  const diff = _lastDiffResult;
  const w = window.open("", "_blank");
  if (!w) return;

  const allItems = [...diff.added, ...diff.modified, ...diff.removed];
  const trs = allItems.map(i => `
    <tr>
      <td style="padding: 6px; border: 1px solid #ccc; font-weight: bold;">${i.type.toUpperCase()}</td>
      <td style="padding: 6px; border: 1px solid #ccc;">${escapeHTML(i.item.model || i.item.sku)}</td>
      <td style="padding: 6px; border: 1px solid #ccc;">${escapeHTML(i.item.closetName || 'General')}</td>
      <td style="padding: 6px; border: 1px solid #ccc; text-align: center;">${i.baseQty}</td>
      <td style="padding: 6px; border: 1px solid #ccc; text-align: center;">${i.compQty}</td>
      <td style="padding: 6px; border: 1px solid #ccc; text-align: center; font-weight: bold;">${i.qtyDelta > 0 ? `+${i.qtyDelta}` : i.qtyDelta}</td>
      <td style="padding: 6px; border: 1px solid #ccc; text-align: right;">$${i.unitPrice.toLocaleString()}</td>
      <td style="padding: 6px; border: 1px solid #ccc; text-align: right; font-weight: bold;">${i.costDelta > 0 ? `+$${i.costDelta.toLocaleString()}` : (i.costDelta < 0 ? `-$${Math.abs(i.costDelta).toLocaleString()}` : '$0')}</td>
    </tr>
  `).join('');

  w.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Engineering Change Order - ${escapeHTML(diff.baseRev.code)} to ${escapeHTML(diff.compareRev.code)}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 11pt; color: #111; margin: 30px; }
          h1 { margin: 0 0 4px 0; font-size: 18pt; }
          .header-meta { font-size: 9pt; color: #555; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; font-size: 9pt; margin-bottom: 25px; }
          th { background: #eee; padding: 6px; border: 1px solid #ccc; text-align: left; }
          .kpi-box { display: inline-block; padding: 10px 15px; background: #f4f4f4; border: 1px solid #ddd; border-radius: 6px; margin-right: 15px; margin-bottom: 20px; }
          .kpi-title { font-size: 8pt; text-transform: uppercase; color: #666; font-weight: bold; }
          .kpi-value { font-size: 14pt; font-weight: bold; color: #111; font-family: monospace; }
        </style>
      </head>
      <body>
        <h1>Formal Engineering Change Order Summary</h1>
        <div class="header-meta">
          <strong>Base Milestone:</strong> ${escapeHTML(diff.baseRev.code)} (${escapeHTML(diff.baseRev.name)}) &nbsp;|&nbsp;
          <strong>Comparison:</strong> ${escapeHTML(diff.compareRev.code)} (${escapeHTML(diff.compareRev.name)}) &nbsp;|&nbsp;
          <strong>Date Generated:</strong> ${new Date().toLocaleString()}
        </div>

        <div>
          <div class="kpi-box">
            <div class="kpi-title">Net MSRP Change</div>
            <div class="kpi-value">${diff.stats.netMSRPDelta >= 0 ? `+$${diff.stats.netMSRPDelta.toLocaleString()}` : `-$${Math.abs(diff.stats.netMSRPDelta).toLocaleString()}`}</div>
          </div>
          <div class="kpi-box">
            <div class="kpi-title">Added Equipment</div>
            <div class="kpi-value">+${diff.stats.addedCount}</div>
          </div>
          <div class="kpi-box">
            <div class="kpi-title">Removed Equipment</div>
            <div class="kpi-value">-${diff.stats.removedCount}</div>
          </div>
          <div class="kpi-box">
            <div class="kpi-title">Modified Line Items</div>
            <div class="kpi-value">${diff.stats.modifiedCount}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th>Item / Model</th>
              <th>Closet / Location</th>
              <th style="text-align: center;">Base Qty</th>
              <th style="text-align: center;">New Qty</th>
              <th style="text-align: center;">Delta</th>
              <th style="text-align: right;">Unit MSRP</th>
              <th style="text-align: right;">Net Change ($)</th>
            </tr>
          </thead>
          <tbody>
            ${trs}
          </tbody>
        </table>

        <div style="margin-top: 40px; border-top: 1px solid #ccc; padding-top: 20px; font-size: 9pt;">
          <div style="display: flex; justify-content: space-between;">
            <div>Prepared By: ____________________________________</div>
            <div>Approved By: ____________________________________</div>
            <div>Date: ________________________</div>
          </div>
        </div>
      </body>
    </html>
  `);
  w.document.close();
  w.focus();
  w.print();
}

// Window Compatibility Exports
if (typeof window !== "undefined") {
  window.RevisionEngine = RevisionEngine;
  window.openRevisionModal = openRevisionModal;
  window.closeRevisionModal = closeRevisionModal;
  window.switchRevisionTab = switchRevisionTab;
  window.renderRevisionTimeline = renderRevisionTimeline;
  window.promptCreateRevisionSnapshot = promptCreateRevisionSnapshot;
  window.deleteRevisionItem = deleteRevisionItem;
  window.confirmRestoreRevision = confirmRestoreRevision;
  window.compareWithWorkingDraft = compareWithWorkingDraft;
  window.runRevisionDiff = runRevisionDiff;
  window.exportChangeOrderCSV = exportChangeOrderCSV;
  window.printChangeOrderReport = printChangeOrderReport;
}
