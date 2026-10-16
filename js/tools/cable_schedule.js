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

      // Run Standards (Color & Category per TOW Structured Cabling: Cat6A CMP indoor, CMX/Gel-Filled outdoor, Composite for ACS Reader/Door)
      const isAcsCompositeDrop = devLayer === "access" && ((targetDev.role || "").toLowerCase() === "reader" || (targetDev.connectionType || "").toUpperCase().includes("OSDP") || (targetDev.model || "").toLowerCase().includes("signo"));
      let runCategory = isAcsCompositeDrop
        ? (isOutdoorDrop ? "ACS Composite OSP (22/6 Shielded + 18/4 + 22/4 + 22/2)" : "ACS Composite CMP Plenum (22/3P OSDP + 18/4 Lock + 22/4 REX + 22/2 DPS)")
        : (isOutdoorDrop ? "Cat6A OSP Direct Burial (Gel-Filled)" : "Cat6A CMP Plenum");
      let runColor = isAcsCompositeDrop ? "Orange / Yellow" : (isOutdoorDrop ? "Black" : "Yellow");
      let runHex = isAcsCompositeDrop ? "#f97316" : (isOutdoorDrop ? "#1e293b" : "#eab308");

      const runStd = (typeof getProjectCablingStandard === "function")
        ? getProjectCablingStandard(targetDev, "run")
        : null;

      if (runStd && !isOutdoorDrop && !isAcsCompositeDrop) {
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

      // Switch Port / ACS Panel Termination & Patch Panel Keystone Mapping
      let switchName = isAcsCompositeDrop ? "ACS Intelligent Panel (LP1502)" : "Unpatched";
      let switchPortNumber = null;
      let switchCode = isAcsCompositeDrop ? "ACP01" : "SW01";
      let portVlan = "Untagged (Flat)";
      let portPoe = isAcsCompositeDrop ? "12/24VDC Panel Feed + OSDP RS-485" : "PoE+";
      let resolvedPanelTag = isAcsCompositeDrop ? `TB${String(panelNum).padStart(2, "0")}-${String(panelPort).padStart(2, "0")}` : panelTag;
      let resolvedPatchPanelId = `${closetCode}-PP${String(panelNum).padStart(2, "0")}`;
      let resolvedPatchCordId = `PC-${closetCode}-${resolvedPanelTag}`;

      // Persist canonical OSS Cable ID on BOM item for cross-studio sync
      if (bom) bom.cableId = cableId;

      // Find switch port assignment if patched in Port Matrix
      const hostSw = projectBOM.find((sw, swIdx) => {
        if (typeof isNetworkSwitchItem === "function" && !isNetworkSwitchItem(sw)) return false;
        const ports = (typeof PortEngine !== "undefined" ? PortEngine.initSwitchPorts(sw) : null) || sw.physicalPorts || sw.portsList || [];
        const foundP = ports.find(p => p.connectedDeviceId === (bom ? bom.instanceId : (dev ? dev.instanceId : null)));
        if (foundP) {
          switchPortNumber = foundP.portNumber;
          switchCode = (sw.deviceNumber && String(sw.deviceNumber).startsWith("SW"))
            ? String(sw.deviceNumber).split("-")[0]
            : `SW${String(swIdx + 1).padStart(2, "0")}`;
          portVlan = foundP.vlan || (typeof getProjectVlanForDevice === "function" ? getProjectVlanForDevice(bom || dev, foundP) : "Untagged (Flat)");
          portPoe = (foundP.poeOutputWatts || foundP.allocatedWatts) ? `${foundP.poeOutputWatts || foundP.allocatedWatts}W (${foundP.poeStandard || foundP.poeType || '802.3at'})` : 'Data Only';
          return true;
        }
        return false;
      });
      if (!hostSw && typeof getProjectVlanForDevice === "function") {
        portVlan = getProjectVlanForDevice(bom || dev, null);
      }

      let switchPortTag = isAcsCompositeDrop
        ? `${switchCode}-DR${panelPort}`
        : (switchPortNumber ? `${switchCode}P${switchPortNumber}` : `${switchCode}P${panelPort}`);

      if (hostSw) {
        switchName = hostSw.friendlyName || hostSw.model;
        if (typeof PortEngine !== "undefined" && typeof PortEngine.resolveSwitchPatchMapping === "function" && switchPortNumber) {
          const patchData = PortEngine.resolveSwitchPatchMapping(hostSw);
          const pm = patchData && patchData.byPortNumber ? patchData.byPortNumber[switchPortNumber] : null;
          if (pm) {
            resolvedPanelTag = pm.panelTag || resolvedPanelTag;
            resolvedPatchPanelId = pm.patchPanelId || resolvedPatchPanelId;
            resolvedPatchCordId = pm.patchCordId || resolvedPatchCordId;
            switchPortTag = pm.switchPortTag || switchPortTag;
            switchCode = pm.switchCode || switchCode;
          }
        }
      }

      // =========================================================================
      // OSS STANDARD CABLE LABEL LEGEND (Docx & TOW Cabling Standard)
      // Rule 1: Always label both ends of ALL cables with the same cable label
      // Rule 2: Affix label within 6 inches of cable termination
      // Rule 3: Brady PN: M21-750-499 Black on White Nylon cloth tape (vinyl for outdoor/wet)
      // =========================================================================
      const headendLabelLine1 = cableId;
      const headendLabelLine2 = isAcsCompositeDrop
        ? `${deviceTag} → ${resolvedPanelTag} → ${switchPortTag}`
        : `${deviceTag} → ${resolvedPanelTag} → ${switchPortTag}`;

      const fieldLabelLine1 = cableId;
      const fieldLabelLine2 = `${deviceTag} → ${locationDesc}`;

      const labelTapePart = isOutdoorDrop ? "Brady Vinyl (Outdoor/Wet Rated)" : "Brady M21-750-499 (Nylon Cloth)";

      schedule.push({
        cableId,
        cableNumber,
        dropIndex,
        panelNum,
        panelPort,
        panelTag: resolvedPanelTag,
        patchPanelId: resolvedPatchPanelId,
        patchCordId: resolvedPatchCordId,
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
        patchLengthFt: patchStd.lengthFt || 0.5,
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
        isOverLimit: !isAcsCompositeDrop && measuredFt > 295,
        instanceId: bom ? bom.instanceId : (dev ? dev.instanceId : null),
        nodeId: dev ? dev.id : null
      });
    });
  });

  // 4. Append Inter-Closet Fiber Optic Backbones from facilityFloors
  if (typeof facilityFloors !== "undefined" && Array.isArray(facilityFloors)) {
    let fiberSeq = 1;
    facilityFloors.forEach(floor => {
      if (!Array.isArray(floor.fiberBackbones) || floor.fiberBackbones.length === 0) return;
      const closets = (floor.nodes || []).filter(n => n.type === "closet");
      floor.fiberBackbones.forEach(fb => {
        const fromCloset = closets.find(c => c.id === fb.fromClosetId);
        const toCloset = closets.find(c => c.id === fb.toClosetId);
        const fromName = fromCloset ? fromCloset.name : (fb.fromClosetName || "MDF");
        const toName = toCloset ? toCloset.name : (fb.toClosetName || "IDF");
        const fromCode = fromName.split(" • ")[0].replace(/[^a-zA-Z0-9]/g, "").toUpperCase() || "MDF";
        const toCode = toName.split(" • ")[0].replace(/[^a-zA-Z0-9]/g, "").toUpperCase() || "IDF";
        const fiberId = `FBR-${fromCode}-${toCode}-${String(fiberSeq).padStart(2, "0")}`;
        const fiberType = fb.fiberType || "OM4 Multimode";
        const strands = fb.strands || 12;
        const isSingleMode = String(fiberType).toUpperCase().includes("OS2") || String(fiberType).toUpperCase().includes("SINGLE");
        const measuredFt = Math.round(Number(fb.lengthFt || 250));
        const serviceLoopFt = 50; // 25ft service coil at each LIU enclosure
        const cutLengthFt = measuredFt + serviceLoopFt;

        schedule.push({
          cableId: fiberId,
          cableNumber: fiberSeq,
          dropIndex: fiberSeq,
          panelNum: 1,
          panelPort: fiberSeq,
          panelTag: `LIU01-${String(fiberSeq).padStart(2, "0")}`,
          closetName: fromName,
          closetCode: fromCode,
          floorName: floor.name || "Level 1",
          roomName: `${fromName} ↔ ${toName}`,
          deviceNum: String(fiberSeq).padStart(3, "0"),
          deviceTag: `${toCode}-LIU`,
          deviceName: `${strands}-Strand ${fiberType} Backbone (${fromCode} ↔ ${toCode})`,
          deviceModel: `${strands}F ${fiberType} Armored / Plenum Trunk`,
          subsystem: "Fiber Backbone",
          subsystemKey: "backbone",
          runCategory: `${strands}-Strand ${fiberType} Trunk`,
          runColor: isSingleMode ? "Yellow (OS2)" : "Aqua (OM4)",
          runHex: isSingleMode ? "#eab308" : "#06b6d4",
          patchColor: isSingleMode ? "Yellow" : "Aqua",
          patchHex: isSingleMode ? "#eab308" : "#06b6d4",
          patchLengthFt: 3,
          measuredFt,
          cutLengthFt,
          serviceLoopFt,
          switchName: `${fromName} LIU-01`,
          switchCode: fromCode,
          switchPortNumber: fiberSeq,
          switchPortTag: `${toCode}-LIU01`,
          portVlan: "Trunk (All VLANs)",
          portPoe: "Optical (SFP+ / SFP28)",
          headendLabelLine1: fiberId,
          headendLabelLine2: `${fromCode}-LIU01 → ${toCode}-LIU01`,
          fieldLabelLine1: fiberId,
          fieldLabelLine2: `${toCode}-LIU01 → ${fromCode}-LIU01`,
          labelTapePart: "Brady M21-750-499 (Nylon Cloth) + Fiber Sleeve",
          isOutdoorDrop: false,
          isOverLimit: false,
          instanceId: fb.id || `fiber-${fiberSeq}`,
          nodeId: fb.id || null
        });
        fiberSeq++;
      });
    });
  }

  return schedule;
}

/**
 * Opens the Cable Pull Schedule & Field Label Sheet modal
 */
function openCablePullScheduleModal() {
  let modal = document.getElementById("cableScheduleModal");
  const viewport = document.getElementById("workspaceMainViewport") || document.body;
  if (!modal) {
    createCableScheduleModalDOM();
    modal = document.getElementById("cableScheduleModal");
  } else if (modal.parentElement !== viewport) {
    viewport.appendChild(modal);
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
    <div id="cableScheduleModal" class="hidden absolute inset-0 z-30 bg-slate-950 flex flex-col p-1 sm:p-2 animate-fade-in">
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
          <div class="flex items-center gap-2 flex-wrap">
            <button onclick="if(window.TabManager) TabManager.openTab('physical_layout'); else if(typeof toggleCableLayoutModal==='function') toggleCableLayoutModal();" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer" title="Open Physical Layout &amp; Pathways Canvas">
              <i data-lucide="map" class="w-3.5 h-3.5 text-amber-400"></i> Physical Layout
            </button>
            <button onclick="if(window.TabManager) TabManager.openTab('port_matrix'); else if(typeof openPortMatrixStudio==='function') openPortMatrixStudio();" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer" title="Open Switch Port Matrix Studio">
              <i data-lucide="cpu" class="w-3.5 h-3.5 text-sky-400"></i> Port Matrix
            </button>
            <button onclick="exportCableScheduleCSV()" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer" title="Export complete cable schedule workbook to CSV for Brady / Brother label printers and Excel">
              <i data-lucide="download" class="w-3.5 h-3.5"></i> Export CSV (Labels)
            </button>
            <button onclick="printCableSchedule()" class="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer" title="Print formal field pull sheet for installation technicians">
              <i data-lucide="printer" class="w-3.5 h-3.5"></i> Print Pull Sheet
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

  const viewport = document.getElementById("workspaceMainViewport") || document.body;
  viewport.insertAdjacentHTML("beforeend", modalHtml);
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
            <th class="p-2.5">OSS Cable ID &amp; Patch Jack</th>
            <th class="p-2.5">Headend Label (2-Line)</th>
            <th class="p-2.5">Field End Label (2-Line)</th>
            <th class="p-2.5">Destination Device &amp; Area</th>
            <th class="p-2.5">Cable &amp; Patch Cord Spec</th>
            <th class="p-2.5">Cut Length</th>
            <th class="p-2.5">Switch Port</th>
            <th class="p-2.5 text-right">Floor Link</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-800/60">
          ${filtered.map(r => `
            <tr class="hover:bg-slate-900/60 transition-colors ${r.isOverLimit ? 'bg-rose-950/20' : ''}">
              <!-- OSS Cable ID & Patch Panel Port -->
              <td class="p-2.5 font-bold text-amber-400">
                <div class="flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full shrink-0 shadow-sm" style="background-color: ${r.runHex}; border: 1px solid rgba(255,255,255,0.3);"></span>
                  <span>${escapeHTML(r.cableId)}</span>
                  <span class="px-1.5 py-0.5 rounded bg-purple-950/90 border border-purple-700/70 text-purple-200 text-[10px] font-bold">${escapeHTML(r.panelTag || 'PP01-01')}</span>
                </div>
                <div class="text-[10px] text-slate-400 font-sans mt-0.5">${escapeHTML(r.closetName)} &bull; <span class="font-mono text-purple-300">${escapeHTML(r.patchPanelId || 'PP01')}</span></div>
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
                  <span class="px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-700/60 text-[9px] font-bold font-mono">${escapeHTML(r.deviceTag)}</span>
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
                <div class="text-[10px] text-slate-400">Patch: <span class="text-sky-300 font-semibold">${escapeHTML(r.patchCordId || 'PC')}</span> (${r.patchLengthFt === 0.5 ? '6" Slim' : `${r.patchLengthFt}ft`} ${escapeHTML(r.patchColor)})</div>
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
                  onclick="jumpToPhysicalLayoutTarget('${r.instanceId || r.nodeId}')"
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
