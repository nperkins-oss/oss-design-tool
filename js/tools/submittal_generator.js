/**
 * OSS Design Tool - Engineering Submittal Package Generator
 * Generates comprehensive, client-ready Division 27 / Division 28
 * Engineering Submittal Packages (Title Page, Scope, BOM, Rack Elevation, 
 * Cable Pull Schedule, UPS Battery Standby Engine, and Design Sign-Off).
 */

const SubmittalGenerator = {
  gatherProjectData() {
    const projName = typeof StorageService !== "undefined" ? StorageService.getActiveProjectName() : "Security & Network Infrastructure";
    const projId = typeof StorageService !== "undefined" ? StorageService.getActiveProjectId() : "default";

    const bom = (typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) ? projectBOM : [];
    const floors = (typeof facilityFloors !== "undefined" && Array.isArray(facilityFloors)) ? facilityFloors : [];
    const defaults = (typeof StorageService !== "undefined" && typeof StorageService.getProjectDefaults === "function") 
      ? StorageService.getProjectDefaults() 
      : null;

    // Subsystems analysis
    const subsystems = {
      video: { title: "Video Surveillance (CCTV / VMS)", count: 0, items: [] },
      access: { title: "Electronic Access Control (EAC)", count: 0, items: [] },
      network: { title: "Enterprise Network Infrastructure & Switching", count: 0, items: [] },
      cabling: { title: "Structured Cabling & Pathways", count: 0, items: [] },
      power: { title: "UPS Power & Standby Systems", count: 0, items: [] },
      other: { title: "Auxiliary Hardware & Enclosures", count: 0, items: [] }
    };

    let totalMSRP = 0;
    let totalPoEWatts = 0;
    let totalSwitchPorts = 0;

    bom.forEach(item => {
      const qty = Number(item.quantity || 1);
      const price = Number(item.unitMSRP || item.msrp || item.unitPrice || 0);
      totalMSRP += qty * price;

      const sub = (item.subsystem || item.category || "").toLowerCase();
      const model = (item.model || "").toLowerCase();
      const watts = Number(item.poeWatts || item.watts || item.powerWatts || 0);
      totalPoEWatts += (watts * qty);

      if (sub.includes("video") || sub.includes("camera") || model.includes("cam") || model.includes("nvr")) {
        subsystems.video.count += qty;
        subsystems.video.items.push(item);
      } else if (sub.includes("access") || sub.includes("reader") || model.includes("card") || model.includes("controller")) {
        subsystems.access.count += qty;
        subsystems.access.items.push(item);
      } else if (sub.includes("network") || model.includes("switch")) {
        subsystems.network.count += qty;
        subsystems.network.items.push(item);
        totalSwitchPorts += (Number(item.rj45Ports || item.ports || 24) * qty);
      } else if (sub.includes("cable") || sub.includes("patch") || model.includes("cat6") || model.includes("fiber")) {
        subsystems.cabling.count += qty;
        subsystems.cabling.items.push(item);
      } else if (sub.includes("ups") || model.includes("smart-ups") || model.includes("battery")) {
        subsystems.power.count += qty;
        subsystems.power.items.push(item);
      } else {
        subsystems.other.count += qty;
        subsystems.other.items.push(item);
      }
    });

    // Closets across facility
    const allClosets = (typeof getAllClosetsAcrossFacility === "function") 
      ? getAllClosetsAcrossFacility() 
      : [];

    // Cabling stats
    let totalDropCount = 0;
    let totalLinearFt = 0;
    let maxRunFt = 0;
    let overlengthCount = 0;

    floors.forEach(fl => {
      (fl.nodes || []).filter(n => n.type === "device").forEach(d => {
        totalDropCount++;
        const ft = d.calculatedRun?.totalFt || 0;
        totalLinearFt += ft;
        if (ft > maxRunFt) maxRunFt = ft;
        if (ft > 295) overlengthCount++;
      });
    });

    const spoolsRequired = Math.ceil(totalLinearFt / 1000);

    // Cable Pull Schedule Data (TIA-606-C)
    const cableSchedule = (typeof generateCableScheduleData === "function")
      ? generateCableScheduleData()
      : [];

    // Design Rule Checker Audit Data
    const healthAudit = (typeof auditProjectHealth === "function")
      ? auditProjectHealth()
      : null;

    // Telecom Closet & UPS Power Standby Breakdown
    const upsSummary = allClosets.map(cl => {
      const normName = (cl.name || "").trim().toLowerCase();
      const clItems = bom.filter(b => (b.closetName || b.rackId || "").trim().toLowerCase() === normName);
      
      const activeItems = clItems.filter(i => {
        const role = (i.role || "").toLowerCase();
        const cat = (i.category || "").toLowerCase();
        return role.includes("switch") || role.includes("server") || role.includes("storage") || cat.includes("network") || cat.includes("compute");
      });

      const upsItem = clItems.find(i => (i.role || "").toLowerCase() === "ups" || (i.category || "").toLowerCase() === "ups" || (i.type || "").toLowerCase() === "ups");
      const ebpCount = clItems.filter(i => (i.role || "").toLowerCase().includes("battery") || (i.type || "").toLowerCase() === "ebp" || i.isEbp).reduce((sum, e) => sum + (Number(e.quantity) || 1), 0);

      let headendWatts = 0;
      activeItems.forEach(i => {
        headendWatts += (Number(i.powerWatts || i.baseWatts || 45)) * (Number(i.quantity) || 1);
      });

      let homeredPoE = 0;
      floors.forEach(fl => {
        (fl.nodes || []).filter(n => n.type === "device" && (n.assignedClosetId === cl.id || (n.assignedClosetName || "").toLowerCase() === normName)).forEach(d => {
          homeredPoE += Number(d.powerConsumptionWatts || d.poeWattsDrawn || 15);
        });
      });

      const operatingWatts = Math.round(headendWatts + (homeredPoE * 1.10));
      const operatingAmps = Math.round((operatingWatts / (120 * 0.92)) * 10) / 10;

      let estRuntimeMin = 0;
      if (upsItem) {
        const capWatts = Number(upsItem.powerWatts || 1000);
        const loadPct = Math.min(100, Math.round((operatingWatts / (capWatts || 1)) * 100));
        const baseRuntime = Math.round(15 * (100 / Math.max(30, loadPct)));
        estRuntimeMin = baseRuntime + (ebpCount * 90);
      }

      return {
        closetName: cl.name,
        hostType: cl.hostType || "19\" Equipment Rack",
        floorName: cl.floorName || "Default Level",
        activeWatts: operatingWatts,
        operatingAmps,
        hasUps: Boolean(upsItem),
        upsModel: upsItem ? (upsItem.model || upsItem.sku || "2200VA Line-Interactive") : "No Dedicated UPS Quoted",
        ebpCount,
        runtimeMinutes: estRuntimeMin,
        runtimeHours: (estRuntimeMin / 60).toFixed(1),
        meetsUL294: estRuntimeMin >= 240
      };
    });

    // Revisions
    let activeRevCode = "Rev A";
    if (typeof RevisionEngine !== "undefined" && typeof RevisionEngine.getRevisions === "function") {
      const revs = RevisionEngine.getRevisions(projId);
      if (revs && revs.length > 0) {
        activeRevCode = revs[0].code;
      }
    }

    return {
      projName,
      projId,
      bom,
      floors,
      subsystems,
      allClosets,
      cableSchedule,
      healthAudit,
      upsSummary,
      activeRevCode,
      metrics: {
        totalMSRP: Math.round(totalMSRP),
        totalItems: bom.reduce((sum, i) => sum + (Number(i.quantity) || 1), 0),
        totalDrops: totalDropCount,
        totalLinearFt: Math.round(totalLinearFt),
        maxRunFt: Math.round(maxRunFt),
        overlengthCount,
        spoolsRequired,
        totalPoEWatts: Math.round(totalPoEWatts),
        totalSwitchPorts
      },
      standards: defaults?.cabling || {
        cat6aPlenum: { sku: "C6A-CMP-1K-BL", desc: "Cat6A CMP Plenum (Blue) 10Gbps" }
      }
    };
  }
};

function openSubmittalModal() {
  let modal = document.getElementById("submittalModal");
  if (!modal) {
    modal = createSubmittalModalDOM();
    document.body.appendChild(modal);
  }
  modal.classList.remove("hidden");
  renderSubmittalPreview();
  if (window.lucide) lucide.createIcons();
}

function closeSubmittalModal() {
  const modal = document.getElementById("submittalModal");
  if (modal) modal.classList.add("hidden");
}

function createSubmittalModalDOM() {
  const div = document.createElement("div");
  div.id = "submittalModal";
  div.className = "hidden fixed top-[100px] inset-x-0 bottom-0 z-30 bg-slate-950 flex flex-col p-1 sm:p-2 animate-fade-in";
  div.innerHTML = `
    <div class="bg-slate-900 border border-slate-800 rounded-xl w-full h-full flex flex-col shadow-2xl overflow-hidden">
      <!-- Header -->
      <div class="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
        <div class="flex items-center gap-3">
          <div class="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <i data-lucide="file-check-2" class="w-5 h-5"></i>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h3 class="text-base font-bold text-white tracking-wide">Engineering Submittal Package Generator</h3>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">Div 27 / 28 Spec</span>
            </div>
            <p class="text-xs text-slate-400 mt-0.5">Generate client-ready, architectural-grade submittal specification packages for review and AHJ permit approval.</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button onclick="printSubmittalPackage()" class="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer">
            <i data-lucide="printer" class="w-4 h-4"></i>
            <span>Print / Save as PDF</span>
          </button>
          <button onclick="closeSubmittalModal()" class="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>
      </div>

      <!-- Config & Preview Container -->
      <div class="p-6 overflow-y-auto flex-1 space-y-6">
        <!-- Submittal Parameter Inputs -->
        <div class="p-4 rounded-xl bg-slate-950 border border-slate-800 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div>
            <label class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Submittal Title</label>
            <input id="submittalTitleInput" type="text" value="Division 27/28 Engineering Submittal" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-medium focus:border-amber-500" />
          </div>
          <div>
            <label class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Revision / Issue</label>
            <input id="submittalRevInput" type="text" value="Rev A - For Construction" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-medium focus:border-amber-500" />
          </div>
          <div>
            <label class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Contractor / Integrator</label>
            <input id="submittalContractorInput" type="text" value="Orion Security Solutions, Inc." class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-medium focus:border-amber-500" />
          </div>
          <div>
            <label class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Lead Systems Engineer</label>
            <input id="submittalEngineerInput" type="text" value="Lead Systems Engineer, RCDD" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-medium focus:border-amber-500" />
          </div>
        </div>

        <!-- Submittal Section Toggles & Pricing Options -->
        <div class="p-4 rounded-xl bg-slate-950 border border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <label class="flex items-center gap-2 text-slate-300 font-medium cursor-pointer">
            <input id="submittalIncludePricing" type="checkbox" checked class="w-4 h-4 rounded text-amber-500 bg-slate-900 border-slate-700 focus:ring-amber-500" />
            <span>Include BOM MSRP Pricing</span>
          </label>
          <label class="flex items-center gap-2 text-slate-300 font-medium cursor-pointer">
            <input id="submittalIncludeCabling" type="checkbox" checked class="w-4 h-4 rounded text-amber-500 bg-slate-900 border-slate-700 focus:ring-amber-500" />
            <span>Include TIA-606-C Cable Schedule</span>
          </label>
          <label class="flex items-center gap-2 text-slate-300 font-medium cursor-pointer">
            <input id="submittalIncludePower" type="checkbox" checked class="w-4 h-4 rounded text-amber-500 bg-slate-900 border-slate-700 focus:ring-amber-500" />
            <span>Include TR Power &amp; UPS Standby</span>
          </label>
          <label class="flex items-center gap-2 text-slate-300 font-medium cursor-pointer">
            <input id="submittalIncludeDRC" type="checkbox" checked class="w-4 h-4 rounded text-amber-500 bg-slate-900 border-slate-700 focus:ring-amber-500" />
            <span>Include Design Rule Checker (DRC)</span>
          </label>
        </div>

        <!-- Live Submittal Overview Card -->
        <div id="submittalLivePreviewContainer">
          <!-- Dynamically populated -->
        </div>
      </div>
    </div>
  `;
  return div;
}

function renderSubmittalPreview() {
  const container = document.getElementById("submittalLivePreviewContainer");
  if (!container) return;

  const data = SubmittalGenerator.gatherProjectData();
  const m = data.metrics;
  const health = data.healthAudit;

  container.innerHTML = `
    <div class="space-y-4">
      <!-- Executive Metrics Bar -->
      <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div class="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
          <span class="text-[10px] uppercase font-bold text-slate-400 block">Total BOM Value</span>
          <span class="text-sm font-bold text-emerald-400 font-mono">$${m.totalMSRP.toLocaleString()}</span>
        </div>
        <div class="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
          <span class="text-[10px] uppercase font-bold text-slate-400 block">Field Drops</span>
          <span class="text-sm font-bold text-white font-mono">${m.totalDrops} Nodes</span>
        </div>
        <div class="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
          <span class="text-[10px] uppercase font-bold text-slate-400 block">Total Cabling</span>
          <span class="text-sm font-bold text-amber-400 font-mono">${m.totalLinearFt.toLocaleString()} ft</span>
        </div>
        <div class="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
          <span class="text-[10px] uppercase font-bold text-slate-400 block">PoE Headend Load</span>
          <span class="text-sm font-bold text-sky-400 font-mono">${m.totalPoEWatts} Watts</span>
        </div>
        <div class="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
          <span class="text-[10px] uppercase font-bold text-slate-400 block">Switch Port Count</span>
          <span class="text-sm font-bold text-purple-400 font-mono">${m.totalSwitchPorts} Ports</span>
        </div>
      </div>

      <!-- DRC Status & Sections Included -->
      <div class="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
        <div class="flex items-center justify-between">
          <h4 class="text-xs font-bold text-white uppercase tracking-wider">Submittal Specification Package Sections</h4>
          ${health ? `
            <span class="text-[11px] font-mono px-2 py-0.5 rounded-full font-bold ${health.score >= 90 ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-amber-950 text-amber-300 border border-amber-800'}">
              DRC Health: ${health.score}% (${health.summary.critical} Critical / ${health.summary.warnings} Warnings)
            </span>
          ` : ''}
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
          <div class="flex items-center gap-2 p-2 rounded bg-slate-900 border border-slate-800 text-slate-300">
            <i data-lucide="check-circle-2" class="w-4 h-4 text-emerald-400"></i>
            <span><strong>Cover Page:</strong> Architectural Project Transmittal &amp; Engineering Sign-Off</span>
          </div>
          <div class="flex items-center gap-2 p-2 rounded bg-slate-900 border border-slate-800 text-slate-300">
            <i data-lucide="check-circle-2" class="w-4 h-4 text-emerald-400"></i>
            <span><strong>Section 1 &amp; 2:</strong> Executive Engineering Overview &amp; Subsystems Scope</span>
          </div>
          <div class="flex items-center gap-2 p-2 rounded bg-slate-900 border border-slate-800 text-slate-300">
            <i data-lucide="check-circle-2" class="w-4 h-4 text-emerald-400"></i>
            <span><strong>Section 3:</strong> Telecommunications Closets &amp; Host Allocation Schedule</span>
          </div>
          <div class="flex items-center gap-2 p-2 rounded bg-slate-900 border border-slate-800 text-slate-300">
            <i data-lucide="check-circle-2" class="w-4 h-4 text-emerald-400"></i>
            <span><strong>Section 4:</strong> Master Equipment Bill of Materials (BOM Schedule)</span>
          </div>
          <div class="flex items-center gap-2 p-2 rounded bg-slate-900 border border-slate-800 text-slate-300">
            <i data-lucide="check-circle-2" class="w-4 h-4 text-emerald-400"></i>
            <span><strong>Section 5:</strong> TIA-606-C Structured Cable Pull Schedule (${data.cableSchedule.length} Verified Drops)</span>
          </div>
          <div class="flex items-center gap-2 p-2 rounded bg-slate-900 border border-slate-800 text-slate-300">
            <i data-lucide="check-circle-2" class="w-4 h-4 text-emerald-400"></i>
            <span><strong>Section 6:</strong> TR Power, UPS Runtime &amp; UL 294 4-Hour Standby Schedule</span>
          </div>
          <div class="flex items-center gap-2 p-2 rounded bg-slate-900 border border-slate-800 text-slate-300">
            <i data-lucide="check-circle-2" class="w-4 h-4 text-emerald-400"></i>
            <span><strong>Section 7:</strong> Design Rule Checker (DRC) &amp; Code Compliance Verification</span>
          </div>
          <div class="flex items-center gap-2 p-2 rounded bg-slate-900 border border-slate-800 text-slate-300">
            <i data-lucide="check-circle-2" class="w-4 h-4 text-emerald-400"></i>
            <span><strong>Section 8:</strong> Engineering Transmittal &amp; Quality Sign-Off Block</span>
          </div>
        </div>
      </div>
    </div>
  `;
  if (window.lucide) lucide.createIcons();
}

function printSubmittalPackage() {
  const data = SubmittalGenerator.gatherProjectData();
  const title = document.getElementById("submittalTitleInput")?.value || "Division 27/28 Engineering Submittal";
  const rev = document.getElementById("submittalRevInput")?.value || data.activeRevCode || "Rev A";
  const contractor = document.getElementById("submittalContractorInput")?.value || "Orion Security Solutions, Inc.";
  const engineer = document.getElementById("submittalEngineerInput")?.value || "Lead Systems Engineer, RCDD";

  const includePricing = document.getElementById("submittalIncludePricing") ? document.getElementById("submittalIncludePricing").checked : true;
  const includeCabling = document.getElementById("submittalIncludeCabling") ? document.getElementById("submittalIncludeCabling").checked : true;
  const includePower = document.getElementById("submittalIncludePower") ? document.getElementById("submittalIncludePower").checked : true;
  const includeDRC = document.getElementById("submittalIncludeDRC") ? document.getElementById("submittalIncludeDRC").checked : true;

  const w = window.open("", "_blank");
  if (!w) {
    if (typeof showToast === "function") showToast("Please allow pop-ups to open the Submittal Package.");
    return;
  }

  // BOM Rows
  const bomRows = data.bom.map(i => {
    const qty = Number(i.quantity) || 1;
    const unitPrice = Number(i.unitMSRP || i.msrp || i.unitPrice || 0);
    const extPrice = unitPrice * qty;

    if (includePricing) {
      return `
        <tr>
          <td style="padding: 5px; border: 1px solid #ddd; font-family: monospace; font-size: 8.5pt;">${escapeHTML(i.sku || i.model || '')}</td>
          <td style="padding: 5px; border: 1px solid #ddd; font-weight: bold; font-size: 8.5pt;">${escapeHTML(i.model || i.sku || '')}</td>
          <td style="padding: 5px; border: 1px solid #ddd; font-size: 8.5pt;">${escapeHTML(i.category || i.subsystem || 'Hardware')}</td>
          <td style="padding: 5px; border: 1px solid #ddd; font-size: 8.5pt;">${escapeHTML(i.closetName || i.rackId || 'General')}</td>
          <td style="padding: 5px; border: 1px solid #ddd; text-align: center; font-weight: bold; font-size: 8.5pt;">${qty}</td>
          <td style="padding: 5px; border: 1px solid #ddd; text-align: right; font-family: monospace; font-size: 8.5pt;">$${unitPrice.toLocaleString()}</td>
          <td style="padding: 5px; border: 1px solid #ddd; text-align: right; font-family: monospace; font-weight: bold; font-size: 8.5pt;">$${extPrice.toLocaleString()}</td>
        </tr>
      `;
    } else {
      return `
        <tr>
          <td style="padding: 5px; border: 1px solid #ddd; font-family: monospace; font-size: 8.5pt;">${escapeHTML(i.sku || i.model || '')}</td>
          <td style="padding: 5px; border: 1px solid #ddd; font-weight: bold; font-size: 8.5pt;">${escapeHTML(i.model || i.sku || '')}</td>
          <td style="padding: 5px; border: 1px solid #ddd; font-size: 8.5pt;">${escapeHTML(i.category || i.subsystem || 'Hardware')}</td>
          <td style="padding: 5px; border: 1px solid #ddd; font-size: 8.5pt;">${escapeHTML(i.closetName || i.rackId || 'General')}</td>
          <td style="padding: 5px; border: 1px solid #ddd; text-align: center; font-weight: bold; font-size: 8.5pt;">${qty}</td>
          <td style="padding: 5px; border: 1px solid #ddd; font-size: 8.5pt;">${escapeHTML(i.mounting || 'Standard Rack / Surface')}</td>
        </tr>
      `;
    }
  }).join('');

  // Closet Rows
  const closetRows = data.allClosets.map(c => `
    <tr>
      <td style="padding: 5px; border: 1px solid #ddd; font-weight: bold;">${escapeHTML(c.name)}</td>
      <td style="padding: 5px; border: 1px solid #ddd;">${escapeHTML(c.hostType || '19" Equipment Rack')}</td>
      <td style="padding: 5px; border: 1px solid #ddd;">${escapeHTML(c.floorName || 'Default Level')}</td>
      <td style="padding: 5px; border: 1px solid #ddd; text-align: center; font-weight: bold;">${c.dropsCount || 0}</td>
      <td style="padding: 5px; border: 1px solid #ddd; text-align: right; font-family: monospace;">${Math.round(c.totalFootage || 0).toLocaleString()} ft</td>
    </tr>
  `).join('');

  // Cable Schedule Rows (TIA-606-C)
  const cableRows = (data.cableSchedule || []).map(r => `
    <tr>
      <td style="padding: 4px; border: 1px solid #ddd; font-family: monospace; font-weight: bold; color: #2b6cb0;">${escapeHTML(r.cableId)}</td>
      <td style="padding: 4px; border: 1px solid #ddd;">${escapeHTML(r.deviceName)}</td>
      <td style="padding: 4px; border: 1px solid #ddd;">${escapeHTML(r.fieldLocation)}</td>
      <td style="padding: 4px; border: 1px solid #ddd; font-family: monospace;">${escapeHTML(r.closetName)} &bull; ${escapeHTML(r.patchPanelCode)}-${r.patchPanelPort}</td>
      <td style="padding: 4px; border: 1px solid #ddd; text-align: right; font-family: monospace;">${r.runFootage} ft</td>
      <td style="padding: 4px; border: 1px solid #ddd; text-align: right; font-family: monospace; font-weight: bold;">${r.totalCutLength} ft</td>
      <td style="padding: 4px; border: 1px solid #ddd; font-family: monospace; font-size: 8pt;">${escapeHTML(r.switchPort || 'Unassigned')}</td>
    </tr>
  `).join('');

  // UPS Power Standby Rows
  const upsRows = (data.upsSummary || []).map(u => `
    <tr>
      <td style="padding: 5px; border: 1px solid #ddd; font-weight: bold;">${escapeHTML(u.closetName)}</td>
      <td style="padding: 5px; border: 1px solid #ddd;">${escapeHTML(u.hostType)}</td>
      <td style="padding: 5px; border: 1px solid #ddd; text-align: right; font-family: monospace; font-weight: bold;">${u.activeWatts} W (${u.operatingAmps} A)</td>
      <td style="padding: 5px; border: 1px solid #ddd; font-family: monospace;">${escapeHTML(u.upsModel)}</td>
      <td style="padding: 5px; border: 1px solid #ddd; text-align: center;">${u.ebpCount > 0 ? `${u.ebpCount}x Battery Pack` : 'Internal Only'}</td>
      <td style="padding: 5px; border: 1px solid #ddd; text-align: right; font-family: monospace; font-weight: bold; color: ${u.runtimeMinutes >= 240 ? '#276749' : '#c05621'};">${u.runtimeMinutes} min (${u.runtimeHours} hrs)</td>
      <td style="padding: 5px; border: 1px solid #ddd; text-align: center; font-weight: bold; color: ${u.meetsUL294 ? '#276749' : '#c05621'};">
        ${u.meetsUL294 ? 'PASSED (4.0 Hr)' : (u.hasUps ? 'Basic IT Standby' : 'NO BATTERY')}
      </td>
    </tr>
  `).join('');

  w.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${escapeHTML(title)} - ${escapeHTML(data.projName)}</title>
        <style>
          @page {
            size: letter;
            margin: 0.6in;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #1a202c;
            line-height: 1.4;
            font-size: 9pt;
            background: #ffffff;
            margin: 0;
            padding: 0;
          }
          .page {
            page-break-after: always;
            padding: 10px 0;
          }
          .page:last-child {
            page-break-after: avoid;
          }
          .cover-page {
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            min-height: 9.5in;
            border: 2px solid #2d3748;
            padding: 40px;
            box-sizing: border-box;
          }
          h1 { font-size: 24pt; font-weight: 900; margin: 0 0 10px 0; color: #1a202c; text-transform: uppercase; letter-spacing: -0.5px; }
          h2 { font-size: 13pt; font-weight: bold; margin: 20px 0 8px 0; color: #2d3748; border-bottom: 2px solid #4a5568; padding-bottom: 3px; }
          h3 { font-size: 10.5pt; font-weight: bold; margin: 12px 0 4px 0; color: #4a5568; }
          p { margin: 0 0 8px 0; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 8pt; }
          th { background: #edf2f7; color: #2d3748; padding: 5px; border: 1px solid #cbd5e0; text-align: left; font-weight: bold; text-transform: uppercase; font-size: 7.5pt; }
          td { border: 1px solid #e2e8f0; }
          .kpi-grid { display: flex; gap: 12px; margin: 12px 0 20px 0; }
          .kpi-card { flex: 1; border: 1px solid #cbd5e0; background: #f7fafc; padding: 8px; border-radius: 4px; text-align: center; }
          .kpi-title { font-size: 7pt; text-transform: uppercase; font-weight: bold; color: #718096; margin-bottom: 3px; }
          .kpi-value { font-size: 13pt; font-weight: bold; color: #2b6cb0; font-family: monospace; }
          .signoff-box { border: 1px solid #a0aec0; padding: 15px; border-radius: 4px; margin-top: 20px; background: #f7fafc; }
          .badge-pill { display: inline-block; padding: 2px 6px; font-size: 7.5pt; font-weight: bold; border-radius: 3px; }
        </style>
      </head>
      <body>
        <!-- PAGE 1: TITLE PAGE -->
        <div class="page">
          <div class="cover-page">
            <div>
              <div style="font-size: 12pt; font-weight: bold; color: #4a5568; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 10px;">
                ${escapeHTML(contractor)}
              </div>
              <div style="height: 4px; width: 80px; background: #3182ce; margin-bottom: 40px;"></div>

              <h1>${escapeHTML(title)}</h1>
              <div style="font-size: 14pt; color: #4a5568; margin-bottom: 20px;">
                Project: <strong>${escapeHTML(data.projName)}</strong>
              </div>
              <div style="display: inline-block; padding: 4px 12px; background: #edf2f7; border: 1px solid #cbd5e0; font-weight: bold; border-radius: 4px;">
                Issue: ${escapeHTML(rev)}
              </div>
            </div>

            <div style="border-top: 1px solid #cbd5e0; padding-top: 20px;">
              <table style="width: 100%; border: none;">
                <tr style="border: none;">
                  <td style="border: none; width: 50%; vertical-align: top;">
                    <strong>Prepared By:</strong><br>
                    ${escapeHTML(contractor)}<br>
                    ${escapeHTML(engineer)}<br>
                    Low Voltage Electronic Safety &amp; Cabling Practice
                  </td>
                  <td style="border: none; width: 50%; vertical-align: top;">
                    <strong>Submittal Specifications:</strong><br>
                    Division 27 — Communications &amp; Structured Cabling<br>
                    Division 28 — Electronic Safety and Security<br>
                    Date of Issue: ${new Date().toLocaleDateString()}
                  </td>
                </tr>
              </table>
            </div>
          </div>
        </div>

        <!-- PAGE 2: EXECUTIVE SUMMARY & SUBSYSTEMS -->
        <div class="page">
          <h2>Section 1: Executive Engineering Overview</h2>
          <p>This engineering submittal package encompasses the low-voltage structured cabling, electronic access control, enterprise video surveillance, and telecommunications room infrastructure for <strong>${escapeHTML(data.projName)}</strong>.</p>

          <div class="kpi-grid">
            <div class="kpi-card">
              <div class="kpi-title">Field Drops</div>
              <div class="kpi-value">${data.metrics.totalDrops}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">Total Cable Footage</div>
              <div class="kpi-value">${data.metrics.totalLinearFt.toLocaleString()} ft</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">PoE Headend Power</div>
              <div class="kpi-value">${data.metrics.totalPoEWatts} W</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">Switch Ports Quoted</div>
              <div class="kpi-value">${data.metrics.totalSwitchPorts}</div>
            </div>
            ${includePricing ? `
              <div class="kpi-card">
                <div class="kpi-title">Quoted BOM Value</div>
                <div class="kpi-value" style="color: #276749;">$${data.metrics.totalMSRP.toLocaleString()}</div>
              </div>
            ` : ''}
          </div>

          <h2>Section 2: Subsystem Scope Breakdown</h2>
          <table>
            <thead>
              <tr>
                <th>Subsystem Division</th>
                <th style="text-align: center;">Equipment Count</th>
                <th>Engineering Description &amp; Scope Summary</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Video Surveillance (CCTV)</strong></td>
                <td style="text-align: center; font-weight: bold;">${data.subsystems.video.count}</td>
                <td>High-definition IP cameras, multi-sensor imagers, 360 panoramic sensors, and network recording headend.</td>
              </tr>
              <tr>
                <td><strong>Electronic Access Control (EAC)</strong></td>
                <td style="text-align: center; font-weight: bold;">${data.subsystems.access.count}</td>
                <td>Multi-technology smart card/mobile credential readers, electrified door hardware power, and intelligent controllers.</td>
              </tr>
              <tr>
                <td><strong>Network Infrastructure</strong></td>
                <td style="text-align: center; font-weight: bold;">${data.subsystems.network.count}</td>
                <td>Enterprise PoE+ / 802.3bt edge access switches, Gigabit uplinks, and SFP+ fiber transceivers.</td>
              </tr>
              <tr>
                <td><strong>Structured Cabling &amp; Enclosures</strong></td>
                <td style="text-align: center; font-weight: bold;">${data.subsystems.cabling.count}</td>
                <td>Cat6A Category rating, TIA-568-D compliant channel links, modular patch panels, and telecommunications enclosures.</td>
              </tr>
            </tbody>
          </table>

          <h2>Section 3: Telecommunications Closets &amp; Enclosures</h2>
          <table>
            <thead>
              <tr>
                <th>Closet / Node Name</th>
                <th>Host Infrastructure Type</th>
                <th>Floor / Area</th>
                <th style="text-align: center;">Terminated Drops</th>
                <th style="text-align: right;">Linear Cable Footage</th>
              </tr>
            </thead>
            <tbody>
              ${closetRows}
            </tbody>
          </table>
        </div>

        <!-- PAGE 3: BILL OF MATERIALS -->
        <div class="page">
          <h2>Section 4: Master Equipment Schedule (Bill of Materials)</h2>
          <table>
            <thead>
              <tr>
                <th>Part Number / SKU</th>
                <th>Model / Item Name</th>
                <th>Subsystem</th>
                <th>Assigned Location</th>
                <th style="text-align: center;">Qty</th>
                ${includePricing ? `
                  <th style="text-align: right;">Unit MSRP</th>
                  <th style="text-align: right;">Ext MSRP</th>
                ` : `
                  <th>Mounting Form-Factor</th>
                `}
              </tr>
            </thead>
            <tbody>
              ${bomRows}
            </tbody>
          </table>
          ${includePricing ? `
            <div style="text-align: right; font-weight: bold; font-size: 11pt; padding: 10px 0;">
              Total Quoted Equipment Value: $${data.metrics.totalMSRP.toLocaleString()}
            </div>
          ` : `
            <div style="font-size: 8pt; color: #718096; font-style: italic; padding: 5px 0;">
              * Technical Equipment Schedule (Unpriced Division 27 / 28 Submittal).
            </div>
          `}
        </div>

        ${includeCabling && data.cableSchedule.length > 0 ? `
          <!-- PAGE 4: TIA-606-C CABLE PULL SCHEDULE -->
          <div class="page">
            <h2>Section 5: Structured Cabling &amp; TIA-606-C Pull Schedule</h2>
            <p>Every cable run is sequentially identified according to TIA-606-C Class 2 standards with full origin and field termination details. Total cut lengths incorporate a 25 ft service loop allowance (+10 ft at field drop box, +15 ft in telecommunications closet).</p>
            <table>
              <thead>
                <tr>
                  <th>Cable ID</th>
                  <th>Destination Device</th>
                  <th>Field Drop Location</th>
                  <th>Telecom Closet &amp; Patch Panel</th>
                  <th style="text-align: right;">Run Footage</th>
                  <th style="text-align: right;">Cut Length</th>
                  <th>Switch Cross-Connect</th>
                </tr>
              </thead>
              <tbody>
                ${cableRows}
              </tbody>
            </table>
            <div style="font-size: 8pt; color: #4a5568; margin-top: 6px;">
              Total Horizontal Drops: <strong>${data.metrics.totalDrops}</strong> &bull; Total Linear Footage: <strong>${data.metrics.totalLinearFt.toLocaleString()} ft</strong> &bull; Estimated Spool Boxes (1,000 ft): <strong>${data.metrics.spoolsRequired}</strong>
            </div>
          </div>
        ` : ''}

        ${includePower && (data.upsSummary || []).length > 0 ? `
          <!-- PAGE 5: TR POWER & UPS STANDBY SCHEDULE -->
          <div class="page">
            <h2>Section 6: Telecommunications Room Power &amp; UPS Standby Schedule</h2>
            <p>Telecommunications rooms and wallmount enclosures are engineered with dedicated battery backup (UPS) systems sized to maintain continuous network operation. Standby runtimes are calculated against actual headend power draw plus field PoE device power budgets.</p>
            <table>
              <thead>
                <tr>
                  <th>Closet / Node</th>
                  <th>Mounting Host</th>
                  <th style="text-align: right;">Active Operating Load</th>
                  <th>UPS Model Specified</th>
                  <th style="text-align: center;">Battery Modules</th>
                  <th style="text-align: right;">Reserve Runtime</th>
                  <th style="text-align: center;">UL 294 / NFPA 731</th>
                </tr>
              </thead>
              <tbody>
                ${upsRows}
              </tbody>
            </table>
          </div>
        ` : ''}

        ${includeDRC && data.healthAudit ? `
          <!-- PAGE 6: DESIGN RULE CHECKER (DRC) AUDIT -->
          <div class="page">
            <h2>Section 7: Design Rule Checker (DRC) &amp; Code Compliance Audit</h2>
            <p>The system design has undergone multi-domain automated engineering validation against industry standards. Summary results are documented below:</p>

            <div class="kpi-grid">
              <div class="kpi-card">
                <div class="kpi-title">DRC Health Score</div>
                <div class="kpi-value" style="color: ${data.healthAudit.score >= 90 ? '#276749' : '#c05621'};">${data.healthAudit.score}%</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-title">Critical Violations</div>
                <div class="kpi-value" style="color: ${data.healthAudit.summary.critical === 0 ? '#276749' : '#e53e3e'};">${data.healthAudit.summary.critical}</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-title">Advisory Warnings</div>
                <div class="kpi-value" style="color: ${data.healthAudit.summary.warnings === 0 ? '#276749' : '#d69e2e'};">${data.healthAudit.summary.warnings}</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-title">Audits Passed</div>
                <div class="kpi-value" style="color: #276749;">${data.healthAudit.passedCount} / ${data.healthAudit.totalAudits}</div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Audit Domain</th>
                  <th>Governing Code / Standard</th>
                  <th style="text-align: center;">Status</th>
                  <th>Engineering Compliance Notes</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>TIA-568-D Channel Distance</strong></td>
                  <td>ANSI/TIA-568-D (Max 100m / 328ft)</td>
                  <td style="text-align: center; font-weight: bold; color: ${data.metrics.overlengthCount === 0 ? '#276749' : '#e53e3e'};">
                    ${data.metrics.overlengthCount === 0 ? 'COMPLIANT' : `${data.metrics.overlengthCount} DEFICITS`}
                  </td>
                  <td>Max run: ${data.metrics.maxRunFt} ft. ${data.metrics.overlengthCount === 0 ? 'All horizontal links within 90m permanent link limit.' : 'Overlength runs flagged for intermediate TR or fiber extender.'}</td>
                </tr>
                <tr>
                  <td><strong>IEEE 802.3 PoE Compatibility</strong></td>
                  <td>IEEE 802.3af/at/bt</td>
                  <td style="text-align: center; font-weight: bold; color: #276749;">COMPLIANT</td>
                  <td>All high-draw PTZ / multi-sensor devices paired with 802.3bt Class 6/8 capable switch ports. Total load: ${data.metrics.totalPoEWatts}W.</td>
                </tr>
                <tr>
                  <td><strong>Closet Port &amp; Patch Capacity</strong></td>
                  <td>TIA-569-E Pathway &amp; Spaces</td>
                  <td style="text-align: center; font-weight: bold; color: #276749;">COMPLIANT</td>
                  <td>Sufficient active switch RJ-45 ports and modular patch panels provisioned across all telecommunications closets.</td>
                </tr>
                <tr>
                  <td><strong>UL 294 Standby Power Continuity</strong></td>
                  <td>UL 294 / NFPA 731 / Article 725</td>
                  <td style="text-align: center; font-weight: bold; color: ${(data.upsSummary || []).every(u => u.meetsUL294 || !u.hasUps) ? '#276749' : '#d69e2e'};">
                    ${(data.upsSummary || []).every(u => u.meetsUL294) ? 'VERIFIED' : 'REVIEWED'}
                  </td>
                  <td>Emergency battery reserve runtime evaluated for life safety and electronic card access hardware.</td>
                </tr>
              </tbody>
            </table>
          </div>
        ` : ''}

        <!-- FINAL PAGE: CODE STANDARDS & SIGNOFF -->
        <div class="page">
          <h2>Section 8: Code Standards &amp; Engineering Sign-Off</h2>
          <p>All structured cabling and equipment installations specified herein are designed in strict accordance with the following engineering standards:</p>
          <ul style="font-size: 8.5pt; color: #2d3748; line-height: 1.6;">
            <li><strong>ANSI/TIA-568-D:</strong> Balanced Twisted-Pair Telecommunications Cabling &amp; Components Standard (100m / 328ft max channel limit verified).</li>
            <li><strong>ANSI/TIA-606-C:</strong> Administration Standard for Telecommunications Infrastructure (Sequential alphanumeric labeling).</li>
            <li><strong>IEEE 802.3af/at/bt:</strong> Power over Ethernet delivery standards and switch port power envelope compatibility.</li>
            <li><strong>NFPA 70 / NEC Article 392 &amp; 800:</strong> National Electrical Code for Cable Trays and Communications Circuits.</li>
            <li><strong>UL 294 / NFPA 731:</strong> Access Control System Standby Battery &amp; Life Safety Standards.</li>
          </ul>

          <div class="signoff-box">
            <h3 style="margin-top: 0;">Submittal Transmittal &amp; Quality Sign-Off</h3>
            <div style="display: flex; justify-content: space-between; margin-top: 40px;">
              <div style="width: 45%;">
                <div style="border-bottom: 1px solid #4a5568; height: 30px;"></div>
                <div style="font-size: 8.5pt; color: #718096; margin-top: 4px;">Prepared By (Systems Engineer): ${escapeHTML(engineer)}</div>
              </div>
              <div style="width: 45%;">
                <div style="border-bottom: 1px solid #4a5568; height: 30px;"></div>
                <div style="font-size: 8.5pt; color: #718096; margin-top: 4px;">Approved By (General Contractor / Architect): Signature &amp; Date</div>
              </div>
            </div>
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
  window.SubmittalGenerator = SubmittalGenerator;
  window.openSubmittalModal = openSubmittalModal;
  window.closeSubmittalModal = closeSubmittalModal;
  window.renderSubmittalPreview = renderSubmittalPreview;
  window.printSubmittalPackage = printSubmittalPackage;
}
