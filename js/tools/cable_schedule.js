/**
 * OSS Design Tool - Cable Pull Schedule & Field Label Generator
 * Complies with Orion Security Solutions Structured Cabling Standards (TOW_Structured Cabling Standards):
 * - T568-B horizontal termination, 100m (328ft) channel max.
 * - Indoor Plenum-grade (CMP) standard; OSP/direct-burial for exterior/wet conduit.
 * - Orion 2-Line Labeling Standard for Switch End and Device End.
 * - Dedicated pathway support every 5' single / 4' trunks (max 50% J-hook fill).
 */

let cableScheduleFilterCloset = "all";
let cableScheduleFilterSubsystem = "all";
let cableScheduleSearchTerm = "";

/**
 * Generates unified cable pull schedule and 2-line label data adhering to Orion Standards
 */
function generateCableScheduleData() {
  const schedule = [];

  if (typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) {
    return schedule;
  }

  // 1. Group drops by Telecom Closet / Mounting Host
  const dropsByCloset = {};

  if (typeof facilityFloors !== "undefined" && Array.isArray(facilityFloors)) {
    facilityFloors.forEach(floor => {
      if (!floor.nodes || !Array.isArray(floor.nodes)) return;
      const allClosets = floor.nodes.filter(n => n.type === "closet");

      floor.nodes.filter(n => n.type === "device").forEach(dev => {
        let closet = allClosets.find(c => c.id === dev.assignedClosetId);
        if (!closet && allClosets.length > 0) closet = allClosets[0];
        const closetName = closet ? closet.name : "MDF • Main Telecom";

        const normCloset = (typeof FacilityStore !== "undefined")
          ? FacilityStore.normalize(closetName)
          : closetName;

        if (!dropsByCloset[normCloset]) dropsByCloset[normCloset] = [];

        const bomItem = dev.instanceId ? projectBOM.find(i => i.instanceId === dev.instanceId) : null;

        dropsByCloset[normCloset].push({
          devNode: dev,
          bomItem: bomItem,
          floorName: floor.name || "Level 1",
          closetName: closetName,
          normCloset: normCloset
        });
      });
    });
  }

  // Include any quoted BOM items that are unplaced on floor plans
  const cableableRoles = ["camera", "reader", "intercom", "wireless", "sensor", "display", "controller"];
  projectBOM.forEach(bomItem => {
    const role = (bomItem.role || "").toLowerCase();
    const sub = (bomItem.subsystem || bomItem.category || "").toLowerCase();
    const isCableable = cableableRoles.some(r => role.includes(r) || sub.includes(r));
    if (!isCableable) return;

    let alreadyAdded = false;
    for (const drops of Object.values(dropsByCloset)) {
      if (drops.some(d => d.bomItem && d.bomItem.instanceId === bomItem.instanceId)) {
        alreadyAdded = true;
        break;
      }
    }
    if (!alreadyAdded) {
      const loc = (typeof FacilityStore !== "undefined") ? FacilityStore.normalize(bomItem.closetName || bomItem.rackId) : (bomItem.closetName || "MDF • Rack-1");
      const normLoc = (loc === FacilityStore.UNASSIGNED || loc.endsWith("• Field")) ? "MDF • Rack-1" : loc;
      if (!dropsByCloset[normLoc]) dropsByCloset[normLoc] = [];
      dropsByCloset[normLoc].push({
        devNode: null,
        bomItem: bomItem,
        floorName: "Unassigned Plan",
        closetName: normLoc,
        normCloset: normLoc
      });
    }
  });

  // 2. Determine project-wide Building and Floor counts for standard legend formatting
  const totalFloorCount = (typeof facilityFloors !== "undefined" && Array.isArray(facilityFloors)) ? facilityFloors.length : 1;
  const buildingSet = new Set();
  if (typeof facilityFloors !== "undefined" && Array.isArray(facilityFloors)) {
    facilityFloors.forEach(fl => {
      const bMatch = (fl.name || "").match(/b(?:uildin)?g\s*([a-zA-Z0-9]+)/i);
      if (bMatch) buildingSet.add(bMatch[1].toUpperCase());
    });
  }
  const isMultiBuilding = buildingSet.size > 1;
  const isMultiFloor = totalFloorCount > 1;

  // Subsystem Sort Hierarchy per Orion Legend: 1. ACS Doors -> 2. Cameras (VMS) -> 3. Intrusion -> 4. Intercom/Data
  const getSubsystemPriority = (layer) => {
    if (layer === "access") return 1;
    if (layer === "cameras") return 2;
    if (layer === "intrusion") return 3;
    if (layer === "intercom") return 4;
    return 5;
  };

  // 3. Iterate through each closet and assign sequential cable numbers per OSS Standard Cable Label Legend
  Object.keys(dropsByCloset).sort().forEach(closetKey => {
    const rawDrops = dropsByCloset[closetKey];
    const closetCode = closetKey.split(" • ")[0].replace(/[^a-zA-Z0-9]/g, "").toUpperCase() || "MDF";

    // Sort drops by Orion Subsystem Order, then by device tag/number
    const drops = [...rawDrops].sort((a, b) => {
      const devLayerA = (typeof getDeviceLayerType === "function") ? getDeviceLayerType(a.bomItem || a.devNode) : "cameras";
      const devLayerB = (typeof getDeviceLayerType === "function") ? getDeviceLayerType(b.bomItem || b.devNode) : "cameras";
      const pDiff = getSubsystemPriority(devLayerA) - getSubsystemPriority(devLayerB);
      if (pDiff !== 0) return pDiff;

      const numA = (a.bomItem && a.bomItem.deviceNumber) ? a.bomItem.deviceNumber : (a.devNode ? a.devNode.deviceNumber : "");
      const numB = (b.bomItem && b.bomItem.deviceNumber) ? b.bomItem.deviceNumber : (b.devNode ? b.devNode.deviceNumber : "");
      return String(numA).localeCompare(String(numB), undefined, { numeric: true });
    });

    drops.forEach((entry, idx) => {
      // Sequential unique cable number per closet per OSS Standard Cable Label Legend
      const cableNumber = idx + 1;
      const dropIndex = cableNumber;
      const panelNum = Math.ceil(dropIndex / 24);
      const panelPort = ((dropIndex - 1) % 24) + 1;
      const panelTag = `PP${String(panelNum).padStart(2, "0")}-${String(panelPort).padStart(2, "0")}`;

      const dev = entry.devNode;
      const bom = entry.bomItem;
      const targetDev = bom || dev || {};

      // Parse Building and Floor tokens for Legend: [Building]-[Floor]-[Closet]-[CableNumber]
      let bldgToken = "";
      let floorToken = "";
      const flName = entry.floorName || "";
      const bMatch = flName.match(/b(?:uildin)?g\s*([a-zA-Z0-9]+)/i);
      if (bMatch) {
        bldgToken = bMatch[1].toUpperCase();
      } else if (isMultiBuilding) {
        bldgToken = "1";
      }

      const fMatch = flName.match(/(?:level|floor|fl|lvl)\s*([a-zA-Z0-9]+)/i) || flName.match(/^([0-9]+)/);
      if (fMatch) {
        floorToken = fMatch[1].toUpperCase();
      } else if (isMultiFloor) {
        floorToken = "1";
      }

      // Format Cable ID per OSS Standard Cable Label Legend:
      // Multi-building & Multi-floor: 1-2-IDFC-11
      // Multi-floor standalone: 2-IDFA-11
      // Single-story standalone: IDFC-11 or IDF2-26
      let cableId = "";
      if (bldgToken && floorToken) {
        cableId = `${bldgToken}-${floorToken}-${closetCode}-${cableNumber}`;
      } else if (floorToken && isMultiFloor) {
        cableId = `${floorToken}-${closetCode}-${cableNumber}`;
      } else if (bldgToken) {
        cableId = `${bldgToken}-${closetCode}-${cableNumber}`;
      } else {
        cableId = `${closetCode}-${cableNumber}`;
      }

      // Device Naming and Tag
      let deviceNum = (bom && bom.deviceNumber) ? bom.deviceNumber : (dev && dev.deviceNumber ? dev.deviceNumber : null);
      if (!deviceNum) {
        deviceNum = String(cableNumber).padStart(3, '0');
      }

      let deviceTag = (bom && bom.deviceNumber) ? bom.deviceNumber : (dev ? (dev.label || dev.name) : null);
      if (!deviceTag) {
        const prefix = (typeof DeviceTaxonomy !== "undefined" && typeof DeviceTaxonomy.getDeviceType === "function")
          ? DeviceTaxonomy.getDeviceType(targetDev)?.prefix
          : "DEV";
        deviceTag = `${prefix || 'DEV'}-${String(cableNumber).padStart(2, '0')}`;
      }

      const deviceName = bom ? (bom.friendlyName || bom.model) : (dev ? (dev.label || dev.name || "Edge Device") : "Field Drop");
      const deviceModel = bom ? bom.model : (dev ? (dev.model || dev.type || "IP Device") : "Field Device");

      // Subsystem Category
      const devLayer = (typeof getDeviceLayerType === "function") ? getDeviceLayerType(bom || dev) : "cameras";
      const subsystemLabel = devLayer === "cameras" ? "Surveillance (VMS)" :
                             devLayer === "access" ? "Access Control (ACS)" :
                             devLayer === "intrusion" ? "Intrusion (IDS)" :
                             devLayer === "intercom" ? "Video Intercom" :
                             devLayer === "wireless" ? "Wireless / PtP" : "Data Network";

      // Environmental Detection: Indoor vs. Outdoor/Burial
      const locationDesc = dev && dev.spaceName ? dev.spaceName : (entry.floorName || "Field");
      const locLower = (locationDesc + " " + (entry.closetName || "") + " " + (targetDev.model || "")).toLowerCase();
      const isOutdoorDrop = targetDev.outdoor === true ||
                            targetDev.isOutdoor === true ||
                            locLower.includes("outdoor") ||
                            locLower.includes("pole") ||
                            locLower.includes("exterior") ||
                            locLower.includes("perimeter") ||
                            locLower.includes("yard") ||
                            locLower.includes("parking") ||
                            locLower.includes("roof") ||
                            targetDev.cableSku === "C6A-OUTDOOR-1K";

      // Run Standards (Color & Category per TOW Structured Cabling: Cat6A CMP indoor, CMX/Gel-Filled outdoor)
      let runCategory = isOutdoorDrop ? "Cat6A OSP Direct Burial (Gel-Filled)" : "Cat6A CMP Plenum";
      let runColor = isOutdoorDrop ? "Black" : "Yellow";
      let runHex = isOutdoorDrop ? "#1e293b" : "#eab308";

      const runStd = (typeof getProjectCablingStandard === "function")
        ? getProjectCablingStandard(targetDev, "run")
        : null;

      if (runStd && !isOutdoorDrop) {
        runCategory = runStd.category || runCategory;
        runColor = runStd.color || runColor;
        runHex = runStd.hex || runHex;
      }

      const patchStd = (typeof getProjectCablingStandard === "function")
        ? getProjectCablingStandard(targetDev, "patch")
        : { color: "Yellow", lengthFt: 1, hex: "#eab308" };

      // Measured Length & Cut Length (Footage + Service Loops: 10ft at device, 15ft in closet per TOW standard p. 8)
      const measuredFt = dev && dev.calculatedRun ? Math.round(dev.calculatedRun.totalFt || 0) : 125;
      const serviceLoopFt = 25; // 10ft at drop + 15ft at telecom rack dressing
      const cutLengthFt = measuredFt > 0 ? measuredFt + serviceLoopFt : 150;

      // Switch Port Termination
      let switchName = "Unpatched";
      let switchPortNumber = null;
      let switchCode = "SW1";
      let portVlan = "VLAN 1";
      let portPoe = "PoE+";

      // Find switch port assignment if patched in Port Matrix
      const hostSw = projectBOM.find((sw, swIdx) => {
        if (!sw.portsList && typeof PortEngine !== "undefined") PortEngine.initSwitchPorts(sw);
        const ports = sw.portsList || [];
        const foundP = ports.find(p => p.connectedDeviceId === (bom ? bom.instanceId : (dev ? dev.instanceId : null)));
        if (foundP) {
          switchPortNumber = foundP.portNumber;
          switchCode = `SW${swIdx + 1}`;
          portVlan = foundP.vlan || (devLayer === "cameras" ? "VLAN 10 (CCTV)" : devLayer === "access" ? "VLAN 20 (ACS)" : "VLAN 1");
          portPoe = foundP.poeOutputWatts ? `${foundP.poeOutputWatts}W (${foundP.poeType || 'at'})` : 'Data Only';
          return true;
        }
        return false;
      });

      if (hostSw) {
        switchName = hostSw.friendlyName || hostSw.model;
      }

      const switchPortTag = switchPortNumber ? `${switchCode}P${switchPortNumber}` : `${switchCode}P${panelPort}`;

      // =========================================================================
      // OSS STANDARD CABLE LABEL LEGEND (Docx & TOW Cabling Standard)
      // Rule 1: Always label both ends of ALL cables with the same cable label
      // Rule 2: Affix label within 6 inches of cable termination
      // Rule 3: Brady PN: M21-750-499 Black on White Nylon cloth tape (vinyl for outdoor/wet)
      // =========================================================================
      const headendLabelLine1 = cableId;
      const headendLabelLine2 = `${deviceTag} → ${switchPortTag}`;

      const fieldLabelLine1 = cableId;
      const fieldLabelLine2 = `${deviceTag} → ${locationDesc}`;

      const labelTapePart = isOutdoorDrop ? "Brady Vinyl (Outdoor/Wet Rated)" : "Brady M21-750-499 (Nylon Cloth)";

      schedule.push({
        cableId,
        cableNumber,
        dropIndex,
        panelNum,
        panelPort,
        panelTag,
        closetName: entry.closetName,
        closetCode,
        floorName: entry.floorName,
        roomName: locationDesc,
        deviceNum,
        deviceTag,
        deviceName,
        deviceModel,
        subsystem: subsystemLabel,
        subsystemKey: devLayer,
        runCategory,
        runColor,
        runHex,
        patchColor: patchStd.color || "Yellow",
        patchHex: patchStd.hex || "#eab308",
        patchLengthFt: patchStd.lengthFt || 1,
        measuredFt,
        cutLengthFt,
        serviceLoopFt,
        switchName,
        switchCode,
        switchPortNumber,
        switchPortTag,
        portVlan,
        portPoe,
        headendLabelLine1,
        headendLabelLine2,
        fieldLabelLine1,
        fieldLabelLine2,
        labelTapePart,
        isOutdoorDrop,
        isOverLimit: measuredFt > 295,
        instanceId: bom ? bom.instanceId : (dev ? dev.instanceId : null),
        nodeId: dev ? dev.id : null
      });
    });
  });

  return schedule;
}

/**
 * Opens the Cable Pull Schedule & Field Label Sheet modal
 */
function openCablePullScheduleModal() {
  let modal = document.getElementById("cableScheduleModal");
  if (!modal) {
    createCableScheduleModalDOM();
    modal = document.getElementById("cableScheduleModal");
  }
  if (!modal) return;

  modal.classList.remove("hidden");
  renderCablePullScheduleContent();
}

/**
 * Closes the Cable Pull Schedule modal
 */
function closeCablePullScheduleModal() {
  const modal = document.getElementById("cableScheduleModal");
  if (modal) modal.classList.add("hidden");
}

/**
 * Creates the modal markup if not already present in DOM
 */
function createCableScheduleModalDOM() {
  if (document.getElementById("cableScheduleModal")) return;

  const modalHtml = `
    <div id="cableScheduleModal" class="hidden fixed top-[100px] inset-x-0 bottom-0 z-30 bg-slate-950 flex flex-col p-1 sm:p-2 animate-fade-in">
      <div class="bg-slate-900 border border-slate-800 rounded-xl w-full h-full flex flex-col shadow-2xl overflow-hidden">
        
        <!-- Header -->
        <div class="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/90 shrink-0">
          <div class="flex items-center gap-2.5">
            <div class="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <i data-lucide="tag" class="w-5 h-5"></i>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h2 class="text-sm font-bold text-white tracking-wide">Structured Cabling Pull Schedule &amp; Field Label Sheets</h2>
                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">Orion Standard</span>
              </div>
              <p class="text-[11px] text-slate-400">TOW_Structured Cabling Standards: 2-Line Field Labels, T568-B Solid-Core, CMP Plenum, and 90° Pathway Routing.</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="exportCableScheduleCSV()" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer" title="Export complete cable schedule workbook to CSV for Brady / Brother label printers and Excel">
              <i data-lucide="download" class="w-3.5 h-3.5"></i> Export CSV (Labels)
            </button>
            <button onclick="printCableSchedule()" class="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer" title="Print formal field pull sheet for installation technicians">
              <i data-lucide="printer" class="w-3.5 h-3.5"></i> Print Pull Sheet
            </button>
            <button onclick="closeCablePullScheduleModal()" class="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer" title="Close (Esc)">
              <i data-lucide="x" class="w-4 h-4"></i>
            </button>
          </div>
        </div>

        <!-- Orion Engineering Standards Notification Bar -->
        <div class="px-5 py-2 bg-amber-950/30 border-b border-amber-800/40 text-[11px] text-amber-300 flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <i data-lucide="info" class="w-4 h-4 shrink-0 text-amber-400"></i>
            <span><strong>Orion Mandatory Standards:</strong> OSS Cable Label Legend (Building-Floor-Location-Cable#) &bull; Brady PN: M21-750-499 Black on White Nylon cloth tape affixed within 6" of termination &bull; T568-B horizontal terminations (100m / 328ft max channel) &bull; CMP Plenum indoors / CMX-Gel-Filled outdoor &bull; 90° pathway routing &bull; 6" power separation.</span>
          </div>
          <div class="flex items-center gap-3 text-slate-300 font-mono text-[10px]">
            <span>Tape: Brady M21-750-499 Nylon (Vinyl Wet/Outdoor) | Separation: 6" from power</span>
          </div>
        </div>

        <!-- Filter & Summary Bar -->
        <div class="px-5 py-2.5 border-b border-slate-800 bg-slate-950/70 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div class="flex flex-wrap items-center gap-2 text-xs">
            <!-- Closet Filter -->
            <div class="flex items-center gap-1.5">
              <span class="text-slate-400 text-[11px] font-semibold">Closet:</span>
              <select id="cableScheduleClosetFilter" onchange="filterCableSchedule(this.value, null, null)" class="bg-slate-900 border border-slate-700 text-white rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-amber-500">
                <option value="all">All Telecom Closets</option>
              </select>
            </div>

            <!-- Subsystem Filter -->
            <div class="flex items-center gap-1.5">
              <span class="text-slate-400 text-[11px] font-semibold">Subsystem:</span>
              <select id="cableScheduleSubsystemFilter" onchange="filterCableSchedule(null, this.value, null)" class="bg-slate-900 border border-slate-700 text-white rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-amber-500">
                <option value="all">All Subsystems</option>
                <option value="cameras">Video Surveillance (CCTV)</option>
                <option value="access">Access Control &amp; Alarm</option>
                <option value="wireless">Wireless &amp; PtP</option>
                <option value="data">Data Network</option>
              </select>
            </div>

            <!-- Search -->
            <div class="relative">
              <input 
                type="text" 
                id="cableScheduleSearchInput"
                placeholder="Search Cable ID, device, or room..." 
                oninput="filterCableSchedule(null, null, this.value)"
                class="bg-slate-900 border border-slate-700 rounded-lg pl-7 pr-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 w-48 sm:w-60"
              />
              <i data-lucide="search" class="w-3.5 h-3.5 text-slate-500 absolute left-2 top-2"></i>
            </div>
          </div>

          <!-- Quick Metrics Bar -->
          <div id="cableScheduleKpiBar" class="flex items-center gap-4 text-xs font-mono text-slate-300">
            <!-- Rendered by renderCablePullScheduleContent() -->
          </div>
        </div>

        <!-- Schedule Table Body -->
        <div id="cableScheduleTableContainer" class="flex-1 overflow-y-auto p-4 sm:p-5">
          <!-- Rendered by renderCablePullScheduleContent() -->
        </div>

        <!-- Footer -->
        <div class="px-5 py-2.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span class="font-mono text-[11px]">Standards: TOW_Structured Cabling Standards &bull; TIA-568-D.2 &bull; TIA-606-C &bull; NFPA 70 (NEC)</span>
          <div class="flex items-center gap-3">
            <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-yellow-400"></span> Default Run: Yellow (Cat6A CMP)</span>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modalHtml);
  if (window.lucide) lucide.createIcons();
}

/**
 * Filters the cable schedule view
 */
function filterCableSchedule(closet, subsystem, search) {
  if (closet !== null) cableScheduleFilterCloset = closet;
  if (subsystem !== null) cableScheduleFilterSubsystem = subsystem;
  if (search !== null) cableScheduleSearchTerm = (search || "").toLowerCase().trim();
  renderCablePullScheduleContent();
}

/**
 * Renders the table content and KPI telemetry inside the modal
 */
function renderCablePullScheduleContent() {
  const container = document.getElementById("cableScheduleTableContainer");
  const kpiBar = document.getElementById("cableScheduleKpiBar");
  const totalBadge = document.getElementById("cableScheduleTotalBadge");
  const closetSelect = document.getElementById("cableScheduleClosetFilter");

  if (!container) return;

  const allRuns = generateCableScheduleData();

  // Populate closet dropdown options once
  if (closetSelect && closetSelect.options.length <= 1) {
    const closetNames = [...new Set(allRuns.map(r => r.closetName))].sort();
    closetNames.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      closetSelect.appendChild(opt);
    });
  }

  // Filter runs
  let filtered = allRuns;
  if (cableScheduleFilterCloset !== "all") {
    filtered = filtered.filter(r => r.closetName === cableScheduleFilterCloset);
  }
  if (cableScheduleFilterSubsystem !== "all") {
    filtered = filtered.filter(r => r.subsystemKey === cableScheduleFilterSubsystem);
  }
  if (cableScheduleSearchTerm) {
    filtered = filtered.filter(r => 
      r.cableId.toLowerCase().includes(cableScheduleSearchTerm) ||
      r.headendLabelLine1.toLowerCase().includes(cableScheduleSearchTerm) ||
      r.fieldLabelLine1.toLowerCase().includes(cableScheduleSearchTerm) ||
      r.deviceTag.toLowerCase().includes(cableScheduleSearchTerm) ||
      r.deviceName.toLowerCase().includes(cableScheduleSearchTerm) ||
      r.roomName.toLowerCase().includes(cableScheduleSearchTerm) ||
      (r.switchName && r.switchName.toLowerCase().includes(cableScheduleSearchTerm))
    );
  }

  // Calculate telemetry
  const totalRuns = filtered.length;
  const totalLinearFt = filtered.reduce((acc, r) => acc + r.cutLengthFt, 0);
  const spools1K = Math.ceil(totalLinearFt / 1000);

  if (totalBadge) totalBadge.textContent = `${totalRuns} Cable Runs`;

  if (kpiBar) {
    kpiBar.innerHTML = `
      <div class="flex items-center gap-1.5">
        <span class="text-slate-500 uppercase text-[10px]">Total Pull Footage:</span>
        <span class="font-bold text-amber-400">${totalLinearFt.toLocaleString()} ft</span>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="text-slate-500 uppercase text-[10px]">1,000' Spool Boxes:</span>
        <span class="font-bold text-sky-400">${spools1K} Box${spools1K === 1 ? '' : 'es'}</span>
      </div>
    `;
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="py-16 text-center space-y-3">
        <div class="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
          <i data-lucide="tag" class="w-6 h-6"></i>
        </div>
        <h4 class="text-sm font-bold text-white">No Cable Runs Found in Current Filter</h4>
        <p class="text-xs text-slate-400 max-w-sm mx-auto">Add edge devices on the Physical Layout canvas or in Quote BOM to generate structured cabling run schedules.</p>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
    return;
  }

  container.innerHTML = `
    <div class="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
      <table class="w-full text-left text-xs font-mono">
        <thead class="bg-slate-900 border-b border-slate-800 text-[10px] uppercase text-slate-400 select-none">
          <tr>
            <th class="p-2.5">Patch Panel Port</th>
            <th class="p-2.5">Headend Label (2-Line)</th>
            <th class="p-2.5">Field End Label (2-Line)</th>
            <th class="p-2.5">Destination Device &amp; Area</th>
            <th class="p-2.5">Cable Spec &amp; Rating</th>
            <th class="p-2.5">Cut Length</th>
            <th class="p-2.5">Switch Port</th>
            <th class="p-2.5 text-right">Floor Link</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-800/60">
          ${filtered.map(r => `
            <tr class="hover:bg-slate-900/60 transition-colors ${r.isOverLimit ? 'bg-rose-950/20' : ''}">
              <!-- Patch Panel Port -->
              <td class="p-2.5 font-bold text-amber-400">
                <div class="flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full shrink-0 shadow-sm" style="background-color: ${r.runHex}; border: 1px solid rgba(255,255,255,0.3);"></span>
                  <span>${escapeHTML(r.cableId)}</span>
                </div>
                <div class="text-[10px] text-slate-400 font-sans">${escapeHTML(r.closetName)}</div>
              </td>

              <!-- Headend Label (2-Line per Orion Standard) -->
              <td class="p-2.5">
                <div class="p-1.5 rounded-lg bg-slate-900 border border-slate-700/80 font-mono text-[11px] leading-tight">
                  <div class="text-white font-bold tracking-wider">${escapeHTML(r.headendLabelLine1)}</div>
                  <div class="text-amber-400 text-[10px]">${escapeHTML(r.headendLabelLine2)}</div>
                </div>
              </td>

              <!-- Field End Label (2-Line per Orion Standard) -->
              <td class="p-2.5">
                <div class="p-1.5 rounded-lg bg-slate-900 border border-slate-700/80 font-mono text-[11px] leading-tight">
                  <div class="text-white font-bold tracking-wider">${escapeHTML(r.fieldLabelLine1)}</div>
                  <div class="text-cyan-400 text-[10px] truncate max-w-[200px]" title="${escapeHTML(r.fieldLabelLine2)}">${escapeHTML(r.fieldLabelLine2)}</div>
                </div>
              </td>

              <!-- Destination & Device -->
              <td class="p-2.5 font-sans">
                <div class="font-bold text-white flex items-center gap-1.5">
                  <span class="px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-700/60 text-[9px] font-bold font-mono">${escapeHTML(r.deviceTag)}</span>
                  <span>${escapeHTML(r.deviceName)}</span>
                </div>
                <div class="text-[10px] text-slate-400">${escapeHTML(r.floorName)} &bull; ${escapeHTML(r.roomName)} (${escapeHTML(r.subsystem)})</div>
              </td>

              <!-- Cable Specification -->
              <td class="p-2.5">
                <div class="flex items-center gap-1.5 text-slate-200">
                  <span class="font-bold text-emerald-400">${escapeHTML(r.runCategory)}</span>
                  <span class="text-slate-400">(${escapeHTML(r.runColor)})</span>
                </div>
                <div class="text-[10px] text-slate-400">Patch: ${r.patchLengthFt}ft (${escapeHTML(r.patchColor)})</div>
              </td>

              <!-- Length -->
              <td class="p-2.5 font-mono">
                <div class="font-bold ${r.isOverLimit ? 'text-rose-400' : 'text-slate-200'}">
                  ${r.cutLengthFt} ft
                </div>
                <div class="text-[10px] text-slate-500">${r.measuredFt}ft + 25ft loop</div>
              </td>

              <!-- Switch & Port -->
              <td class="p-2.5">
                ${r.switchPortNumber ? `
                  <div class="font-bold text-sky-300">${r.switchCode}: Port ${r.switchPortNumber}</div>
                  <div class="text-[10px] text-slate-400 truncate max-w-[130px] font-sans">${escapeHTML(r.portVlan)}</div>
                ` : `
                  <span class="text-slate-600 italic">Unpatched in Switch</span>
                `}
              </td>

              <!-- Quick Action Jump Button -->
              <td class="p-2.5 text-right font-sans">
                <button 
                  onclick="closeCablePullScheduleModal(); jumpToPhysicalLayoutTarget('${r.instanceId || r.nodeId}')"
                  class="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[10px] cursor-pointer transition-colors"
                  title="Locate drop on floor plan"
                >
                  Locate
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  if (window.lucide) lucide.createIcons();
}

/**
 * Exports the Cable Pull Schedule to CSV formatted for automated label makers & Excel
 */
function exportCableScheduleCSV() {
  const allRuns = generateCableScheduleData();
  if (allRuns.length === 0) {
    if (typeof showToast === "function") showToast("No cable runs available to export.");
    return;
  }

  const headers = [
    "OSS Cable Label (Legend)",
    "Origin Closet",
    "Patch Panel Port",
    "Headend Label L1",
    "Headend Label L2",
    "Field Label L1",
    "Field Label L2",
    "Brady Label Tape Spec",
    "Termination Offset",
    "Floor",
    "Room / Space",
    "Device Tag",
    "Device Name",
    "Device Model",
    "Subsystem",
    "Cable Category",
    "Cable Color",
    "Measured Run (ft)",
    "Cut Length (ft)",
    "Service Loop (ft)",
    "Connected Switch",
    "Switch Port",
    "VLAN",
    "PoE Output",
    "Orion Standard Compliance"
  ];

  const rows = allRuns.map(r => [
    r.cableId,
    r.closetName,
    r.panelTag || `PP-${r.panelNum}`,
    r.headendLabelLine1,
    r.headendLabelLine2,
    r.fieldLabelLine1,
    r.fieldLabelLine2,
    r.labelTapePart || "Brady M21-750-499 Nylon Cloth",
    "Within 6 inches of termination",
    r.floorName,
    r.roomName,
    r.deviceTag,
    r.deviceName,
    r.deviceModel,
    r.subsystem,
    r.runCategory,
    r.runColor,
    r.measuredFt,
    r.cutLengthFt,
    r.serviceLoopFt,
    r.switchName,
    r.switchPortNumber ? `Port ${r.switchPortNumber}` : "Unpatched",
    r.portVlan,
    r.portPoe,
    "OSS Standard Cable Label Legend & TOW Structured Cabling"
  ]);

  const csvContent = [
    headers.map(h => `"${h}"`).join(","),
    ...rows.map(row => row.map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(","))
  ].join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const projName = (typeof StorageService !== "undefined" ? StorageService.getActiveProjectName() : "Project").replace(/[^a-zA-Z0-9_-]/g, "_");
  link.setAttribute("href", url);
  link.setAttribute("download", `${projName}_Orion_Cable_Pull_Labels.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  if (typeof showToast === "function") {
    showToast("Exported Orion standard Cable Pull & Label CSV.");
  }
}

/**
 * Triggers clean print view formatted to Orion specifications
 */
function printCableSchedule() {
  const allRuns = generateCableScheduleData();
  const projName = typeof StorageService !== "undefined" ? StorageService.getActiveProjectName() : "Structured Cabling Project";
  const w = window.open("", "_blank");
  if (!w) return;

  const trs = allRuns.map(r => `
    <tr>
      <td style="padding: 5px; border: 1px solid #ccc; font-weight: bold; font-family: monospace;">${escapeHTML(r.cableId)}</td>
      <td style="padding: 5px; border: 1px solid #ccc; font-family: monospace;">
        <strong>${escapeHTML(r.headendLabelLine1)}</strong><br>
        <span style="font-size: 8pt; color: #555;">${escapeHTML(r.headendLabelLine2)}</span>
      </td>
      <td style="padding: 5px; border: 1px solid #ccc; font-family: monospace;">
        <strong>${escapeHTML(r.fieldLabelLine1)}</strong><br>
        <span style="font-size: 8pt; color: #555;">${escapeHTML(r.fieldLabelLine2)}</span>
      </td>
      <td style="padding: 5px; border: 1px solid #ccc;">
        <strong>${escapeHTML(r.deviceTag)}</strong> - ${escapeHTML(r.deviceName)}<br>
        <span style="font-size: 8pt; color: #555;">${escapeHTML(r.floorName)} • ${escapeHTML(r.roomName)}</span>
      </td>
      <td style="padding: 5px; border: 1px solid #ccc; text-align: center;">${escapeHTML(r.runCategory)} (${escapeHTML(r.runColor)})</td>
      <td style="padding: 5px; border: 1px solid #ccc; text-align: center; font-family: monospace; font-weight: bold;">${r.cutLengthFt} ft</td>
      <td style="padding: 5px; border: 1px solid #ccc; font-family: monospace;">${r.switchPortNumber ? `${r.switchCode}: Port ${r.switchPortNumber}` : 'Unpatched'}</td>
    </tr>
  `).join('');

  w.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Orion Cable Pull Schedule - ${escapeHTML(projName)}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 9pt; color: #111; margin: 25px; }
          h1 { margin: 0 0 4px 0; font-size: 16pt; }
          .header-meta { font-size: 8.5pt; color: #444; margin-bottom: 15px; border-bottom: 2px solid #222; padding-bottom: 8px; }
          .spec-box { background: #f8fafc; border: 1px solid #cbd5e1; padding: 10px; border-radius: 4px; font-size: 8pt; margin-bottom: 15px; line-height: 1.4; }
          table { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
          th { background: #e2e8f0; padding: 5px; border: 1px solid #94a3b8; text-align: left; font-size: 8pt; text-transform: uppercase; }
        </style>
      </head>
      <body>
        <h1>Orion Security Solutions — Structured Cabling Pull Schedule &amp; Labels</h1>
        <div class="header-meta">
          <strong>Project:</strong> ${escapeHTML(projName)} &nbsp;|&nbsp;
          <strong>Standard:</strong> TOW_Structured Cabling Standards &nbsp;|&nbsp;
          <strong>Generated:</strong> ${new Date().toLocaleString()}
        </div>

        <div class="spec-box">
          <strong>Orion Installation &amp; Commissioning Parameters:</strong><br>
          • <strong>Termination &amp; Channel:</strong> T568-B solid-core horizontal runs (100m / 328ft max channel, 90m / 295ft permanent link).<br>
          • <strong>Labeling Standard (OSS Cable Legend):</strong> Affix uniform labels within 6" of termination at both ends using Brady M21-750-499 Black on White Nylon cloth tape (vinyl for outdoor/wet). Unique sequential numbering per closet (ACS → Cameras → IDS → Network). Both ends carry identical Cable ID.<br>
          • <strong>Cabling Route:</strong> Route through spaces using 90° corners, not diagonally. Outside cabling must terminate within 50' of building entry (NEC 800.100).<br>
          • <strong>Pathway Support:</strong> Supported every 5' minimum for single runs, every 4' minimum for trunks (≥5 cables). Max 50% visual J-hook fill.<br>
          • <strong>Separation from Power:</strong> 6" from power line conduits; 12" from unshielded lines/lighting; 24" for communications; 90° crossing only.
        </div>

        <table>
          <thead>
            <tr>
              <th>OSS Cable ID</th>
              <th>Headend Label (2-Line)</th>
              <th>Field Device Label (2-Line)</th>
              <th>Destination Device &amp; Room</th>
              <th style="text-align: center;">Cable Spec &amp; Tape</th>
              <th style="text-align: center;">Cut Length</th>
              <th>Switch Port</th>
            </tr>
          </thead>
          <tbody>
            ${trs}
          </tbody>
        </table>
      </body>
    </html>
  `);
  w.document.close();
  w.focus();
  w.print();
}

// Window Compatibility Exports
if (typeof window !== "undefined") {
  window.generateCableScheduleData = generateCableScheduleData;
  window.openCablePullScheduleModal = openCablePullScheduleModal;
  window.closeCablePullScheduleModal = closeCablePullScheduleModal;
  window.filterCableSchedule = filterCableSchedule;
  window.renderCablePullScheduleContent = renderCablePullScheduleContent;
  window.renderCablePullSchedule = renderCablePullScheduleContent;
  window.exportCableScheduleCSV = exportCableScheduleCSV;
  window.printCableSchedule = printCableSchedule;
}
