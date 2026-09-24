// =========================================================================
// LOGICAL SYSTEMS & NETWORK TOPOLOGY ENGINE (NetSelect Enterprise)
// L2/L3 Wire-Speed Transport, Dual-Plane Logical Services & Power Sizing
// Smooth Bézier Vector Links, Auto-Negotiated Speeds & Slide-Out Inspector
// =========================================================================

let isCanvasDragging = false;
let draggedTopologyNode = null;
let topoDragOffset = { x: 0, y: 0 };
let topologyLinks = [];

// Canvas Viewport State
let topologyZoomLevel = 1.0;
let activeTopologyViewPlane = "all"; // "all" | "backbone" | "power"
let selectedTopologyNodeId = null;
let selectedTopologyLinkId = null;
let isTopologyInspectorVisible = true;

function isTopologyModalVisible() {
  const modal = document.getElementById("topologyModal");
  return modal && !modal.classList.contains("hidden");
}

function toggleTopologyModal() {
  const modal = document.getElementById("topologyModal");
  if (!modal) return;

  if (modal.classList.contains("hidden")) {
    modal.classList.remove("hidden");
    initTopologyCanvas();
    renderTopology();
    renderTopologyInspector();
    if (window.lucide) lucide.createIcons();
  } else {
    modal.classList.add("hidden");
    isCanvasDragging = false;
    draggedTopologyNode = null;
  }
}

function initTopologyCanvas() {
  const viewport = document.getElementById("topologyCanvasViewport");
  if (!viewport || viewport.dataset.initialized === "true") return;

  viewport.dataset.initialized = "true";
  window.addEventListener("mousemove", handleTopologyMouseMove);
  window.addEventListener("mouseup", handleTopologyMouseUp);
}

// -----------------------------------------------------------
// Canvas Zoom & Pan Controls
// -----------------------------------------------------------
function zoomTopologyCanvas(delta) {
  topologyZoomLevel = Math.max(0.5, Math.min(2.0, Math.round((topologyZoomLevel + delta) * 100) / 100));
  applyTopologyZoom();
}

function resetTopologyZoom() {
  topologyZoomLevel = 1.0;
  applyTopologyZoom();
  const viewport = document.getElementById("topologyCanvasViewport");
  if (viewport) {
    viewport.scrollTo({ left: 0, top: 0, behavior: "smooth" });
  }
}

function applyTopologyZoom() {
  const container = document.getElementById("topologyNodesContainer");
  const svg = document.getElementById("topologySvgOverlay");
  const badge = document.getElementById("topologyZoomLevelBadge");

  if (container) {
    container.style.transform = `scale(${topologyZoomLevel})`;
  }
  if (svg) {
    svg.style.transform = `scale(${topologyZoomLevel})`;
    svg.style.transformOrigin = "top left";
  }
  if (badge) {
    badge.innerText = `${Math.round(topologyZoomLevel * 100)}%`;
  }
}

function setTopologyViewPlane(plane) {
  activeTopologyViewPlane = plane || "all";
  renderTopology();
  renderTopologyInspector();
}

function toggleTopologyInspector() {
  const panel = document.getElementById("topologyInspectorPanel");
  if (!panel) return;
  isTopologyInspectorVisible = !isTopologyInspectorVisible;
  if (isTopologyInspectorVisible) {
    panel.classList.remove("hidden");
  } else {
    panel.classList.add("hidden");
  }
}

// -----------------------------------------------------------
// Master Topology Renderer
// -----------------------------------------------------------
function renderTopology() {
  const container = document.getElementById("topologyNodesContainer");
  if (!container) return;

  container.innerHTML = "";

  if (typeof projectBOM === "undefined" || projectBOM.length === 0) {
    container.innerHTML = `
      <div class="py-24 text-center text-slate-500 space-y-3">
        <div class="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-600">
          <i data-lucide="network" class="w-6 h-6"></i>
        </div>
        <p class="text-sm font-semibold text-slate-300">No active hardware in project quote.</p>
        <p class="text-xs text-slate-500 max-w-sm mx-auto">Add switches, gateways, servers, or wireless bridges from the catalog to visualize topology.</p>
      </div>
    `;
    updateTopologyCounters(0, 0, 0);
    renderTopologyLinks();
    if (window.lucide) lucide.createIcons();
    return;
  }

  // Filter primary topology infrastructure nodes (exclude internal licenses, accessories, and unassigned staging items)
  const activeNodes = projectBOM.filter(item => {
    if (item.parentInstanceId) return false;
    if (item.role === "Structured Cabling" || item.role === "Optics & DAC") return false;
    if (item.role === "Mgmt License" || item.role === "Security License" || item.role === "Feature License") return false;
    if (item.role === "Accessory") return false;

    // Filter by view plane
    if (activeTopologyViewPlane === "backbone") {
      const isBackbone = item.role === "Core" || item.role === "Core & Agg" || item.role === "Aggregation" || item.role === "Gateways & WAN" || item.role === "Security WAN";
      if (!isBackbone && item.role !== "Access") return false;
    } else if (activeTopologyViewPlane === "vms") {
      const isVmsServer = item.role === "Server" || item.role === "VMS Server" || (item.hostedRoles && item.hostedRoles.includes("VMS Ingest & Recording"));
      const isCore = item.role === "Core" || item.role === "Core & Agg" || item.role === "Aggregation";
      const hasCameras = projectBOM.some(c => c.uplinkTargetId === item.instanceId && (c.role === "Camera" || (c.category && c.category.includes("camera"))));
      if (!isVmsServer && !isCore && !hasCameras) return false;
    } else if (activeTopologyViewPlane === "access") {
      const isAccessServer = item.role === "Server" || (item.hostedRoles && item.hostedRoles.includes("Access Control Engine"));
      const isCore = item.role === "Core" || item.role === "Core & Agg" || item.role === "Aggregation";
      const hasDoors = projectBOM.some(d => d.uplinkTargetId === item.instanceId && (d.role === "Access Control" || (d.category && d.category.includes("access"))));
      if (!isAccessServer && !isCore && !hasDoors) return false;
    }

    const loc = FacilityStore.normalize(item.closetName || item.rackId);
    if (loc === FacilityStore.UNASSIGNED) return false; // Staging items are mapped only once assigned
    return true;
  });

  // Group active hardware by normalized facility location
  const groups = {};
  activeNodes.forEach(item => {
    const loc = FacilityStore.normalize(item.closetName || item.rackId);
    if (!groups[loc]) groups[loc] = [];
    groups[loc].push(item);
  });

  const savedPositions = loadTopologyPositions();
  let groupIndex = 0;

  // Pre-calculate connected edge clients (cameras, APs, readers) per host switch
  const edgeDeviceMap = {};
  projectBOM.forEach(item => {
    if (!item.uplinkTargetId) return;
    if (!edgeDeviceMap[item.uplinkTargetId]) {
      edgeDeviceMap[item.uplinkTargetId] = {
        cameras: 0,
        cameraWatts: 0,
        cameraMbps: 0,
        doors: 0,
        doorWatts: 0,
        wireless: 0,
        wirelessWatts: 0,
        items: []
      };
    }
    const bucket = edgeDeviceMap[item.uplinkTargetId];
    const qty = parseInt(item.qty, 10) || 1;
    const watts = (parseFloat(item.powerConsumptionWatts || item.maxPowerWatts || item.powerWatts || item.baseWatts || 15)) * qty;
    const mbps = (parseFloat(item.streamBitrateMbps) || 4.0) * qty;

    if (item.role === "Camera" || (item.category && item.category.includes("camera"))) {
      bucket.cameras += qty;
      bucket.cameraWatts += watts;
      bucket.cameraMbps += mbps;
    } else if (item.role === "Access Control" || (item.category && item.category.includes("access"))) {
      bucket.doors += qty;
      bucket.doorWatts += watts;
    } else if (item.role === "Wireless Bridge") {
      bucket.wireless += qty;
      bucket.wirelessWatts += watts;
    }
    bucket.items.push(item);
  });

  // Calculate live ingest load and client counts per server
  const serverMetricsMap = {};
  const servers = activeNodes.filter(n => n.role === "Server" || n.role === "VMS Server" || n.role === "Compute & Storage");
  servers.forEach(srv => {
    serverMetricsMap[srv.instanceId] = {
      ingestMbps: 0,
      cameraCount: 0,
      doorCount: 0
    };
  });

  // Route cameras to servers
  projectBOM.forEach(item => {
    const qty = parseInt(item.qty, 10) || 1;
    if (item.role === "Camera" || (item.category && item.category.includes("camera"))) {
      let targetServerId = item.assignedRecordingServerId;
      if (!targetServerId && item.uplinkTargetId) {
        const hostSwitch = projectBOM.find(s => s.instanceId === item.uplinkTargetId);
        if (hostSwitch && hostSwitch.assignedVmsServerId) {
          targetServerId = hostSwitch.assignedVmsServerId;
        }
      }
      if (!targetServerId && servers.length > 0) {
        targetServerId = servers[0].instanceId;
      }
      if (targetServerId && serverMetricsMap[targetServerId]) {
        const mbps = (parseFloat(item.streamBitrateMbps) || 4.0) * qty;
        serverMetricsMap[targetServerId].ingestMbps += mbps;
        serverMetricsMap[targetServerId].cameraCount += qty;
      }
    } else if (item.role === "Access Control" || (item.category && item.category.includes("access"))) {
      let targetServerId = item.assignedAccessServerId;
      if (!targetServerId && item.uplinkTargetId) {
        const hostSwitch = projectBOM.find(s => s.instanceId === item.uplinkTargetId);
        if (hostSwitch && hostSwitch.assignedAccessServerId) {
          targetServerId = hostSwitch.assignedAccessServerId;
        }
      }
      if (!targetServerId && servers.length > 0) {
        targetServerId = servers[0].instanceId;
      }
      if (targetServerId && serverMetricsMap[targetServerId]) {
        serverMetricsMap[targetServerId].doorCount += qty;
      }
    }
  });

  // Render Location Clusters
  Object.keys(groups).forEach(loc => {
    const items = groups[loc];
    const defaultPos = {
      x: 80 + (groupIndex * 390),
      y: 90 + ((groupIndex % 2) * 60)
    };
    const pos = savedPositions[loc] || defaultPos;
    const parsed = FacilityStore.parse(loc);

    const clusterEl = document.createElement("div");
    clusterEl.className = "topo-location-cluster absolute select-none bg-slate-900/90 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-3.5 shadow-2xl backdrop-blur-md w-84";
    clusterEl.style.left = `${pos.x}px`;
    clusterEl.style.top = `${pos.y}px`;
    clusterEl.setAttribute("data-location", loc);

    clusterEl.innerHTML = `
      <!-- Cluster Header -->
      <div class="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-800 cursor-move topo-cluster-header">
        <div class="flex items-center gap-2.5">
          <div class="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
            <i data-lucide="server" class="w-4 h-4"></i>
          </div>
          <div>
            <span class="text-xs font-bold text-white tracking-wide block leading-none">${escapeHTML(parsed.space)}</span>
            <span class="text-[10px] font-mono text-indigo-300 block mt-1 leading-none">${escapeHTML(parsed.enclosure)}</span>
          </div>
        </div>
        <span class="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800">
          ${items.length} ${items.length === 1 ? 'Chassis' : 'Chassis'}
        </span>
      </div>

      <!-- Equipment Nodes inside Cluster -->
      <div class="space-y-3">
        ${items.map(item => {
          const isSelected = selectedTopologyNodeId === item.instanceId;
          const isServer = item.role === "Server" || item.role === "VMS Server" || item.role === "Compute & Storage";
          const edgeData = edgeDeviceMap[item.instanceId] || null;
          const srvMetrics = serverMetricsMap[item.instanceId] || null;
          const powerSourceLabel = getPowerSourceLabel(item);
          const hasEdgeDevices = edgeData && (edgeData.cameras > 0 || edgeData.doors > 0 || edgeData.wireless > 0);

          if (isServer) {
            // Render Server Chassis Node Card
            const maxCap = item.maxIngestBandwidthMbps || 750;
            const currentIngest = srvMetrics ? Math.round(srvMetrics.ingestMbps) : 0;
            const ingestPercent = Math.min(100, Math.round((currentIngest / maxCap) * 100));
            const hostedRoles = item.hostedRoles || ["VMS Ingest & Recording"];

            return `
              <div 
                class="topo-node-card text-xs space-y-2 p-3 rounded-xl border ${isSelected ? 'border-purple-500 ring-2 ring-purple-500/30 bg-slate-850' : 'border-slate-800 bg-slate-950/80 hover:border-slate-700'} transition-all cursor-pointer shadow-md" 
                id="topo-card-${item.instanceId}"
                onclick="selectTopologyNode('${item.instanceId}', event)"
              >
                <div class="flex items-start justify-between gap-1.5">
                  <div class="min-w-0">
                    <span class="font-bold text-white truncate block text-xs" title="${escapeHTML(item.model)}">${escapeHTML(item.model)}</span>
                    <span class="text-[10px] text-slate-400 font-mono block">${escapeHTML(item.vendor || 'Generic')} &bull; ${item.rackUnits || 2}U Appliance</span>
                  </div>
                  <span class="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-purple-500/40 bg-purple-500/10 text-purple-300 shrink-0">
                    Server
                  </span>
                </div>

                <!-- Hosted Software Roles -->
                <div class="flex flex-wrap gap-1 pt-1">
                  ${hostedRoles.map(role => `
                    <span class="text-[9px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-semibold">
                      ${escapeHTML(role)}
                    </span>
                  `).join('')}
                </div>

                <!-- Video Ingest Bandwidth Bar -->
                <div class="space-y-1 pt-1 border-t border-slate-900">
                  <div class="flex justify-between text-[10px] font-mono">
                    <span class="text-slate-500">Video Ingest:</span>
                    <span class="text-teal-300 font-bold">${currentIngest} Mbps / ${maxCap} Mbps (${srvMetrics ? srvMetrics.cameraCount : 0} Cams)</span>
                  </div>
                  <div class="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                    <div 
                      class="h-full rounded-full transition-all ${ingestPercent > 85 ? 'bg-rose-500' : 'bg-teal-400'}" 
                      style="width: ${ingestPercent}%"
                    ></div>
                  </div>
                </div>

                <!-- Power Telemetry -->
                <div class="flex items-center justify-between pt-1 border-t border-slate-900 text-[10px] font-mono text-slate-400">
                  <div class="flex items-center gap-1">
                    <i data-lucide="zap" class="w-3 h-3 text-amber-400 shrink-0"></i>
                    <span>${powerSourceLabel}</span>
                  </div>
                  <span class="text-slate-300">${item.baseWatts || 300}W Base</span>
                </div>
              </div>
            `;
          }

          // Render Switch Chassis Node Card
          return `
            <div 
              class="topo-node-card text-xs space-y-2 p-3 rounded-xl border ${isSelected ? 'border-brand-500 ring-2 ring-brand-500/30 bg-slate-850' : 'border-slate-800 bg-slate-950/80 hover:border-slate-700'} transition-all cursor-pointer shadow-md" 
              id="topo-card-${item.instanceId}"
              onclick="selectTopologyNode('${item.instanceId}', event)"
            >
              <div class="flex items-start justify-between gap-1.5">
                <div class="min-w-0">
                  <span class="font-bold text-white truncate block text-xs" title="${escapeHTML(item.model)}">${escapeHTML(item.model)}</span>
                  <span class="text-[10px] text-slate-400 font-mono block">${escapeHTML(item.vendor || 'Generic')} &bull; SKU: ${escapeHTML(item.sku || 'N/A')}</span>
                </div>
                <span class="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${getRoleBadgeStyle(item.role)} shrink-0">
                  ${item.role}
                </span>
              </div>

              <!-- Power & Port Telemetry -->
              <div class="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-slate-900 text-[10px] font-mono">
                <div class="flex items-center gap-1 text-slate-400">
                  <i data-lucide="zap" class="w-3 h-3 text-amber-400 shrink-0"></i>
                  <span class="truncate">${powerSourceLabel}</span>
                </div>
                <div class="flex items-center justify-end gap-1 text-slate-400">
                  <i data-lucide="layers" class="w-3 h-3 text-sky-400 shrink-0"></i>
                  <span>${item.ports ? `${item.ports} Ports` : 'Chassis'}</span>
                </div>
              </div>

              <!-- PoE Allocation Bar (for PoE Switches) -->
              ${item.poeBudget && item.poeBudget > 0 ? `
                <div class="space-y-1 pt-1 border-t border-slate-900">
                  <div class="flex justify-between text-[10px] font-mono">
                    <span class="text-slate-500">PoE Power:</span>
                    <span class="text-amber-300 font-bold">${item.consumedPoEWatts || 0}W / ${item.poeBudget}W</span>
                  </div>
                  <div class="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                    <div 
                      class="h-full rounded-full transition-all ${((item.consumedPoEWatts || 0) > item.poeBudget) ? 'bg-rose-500' : 'bg-amber-400'}" 
                      style="width: ${Math.min(100, Math.round(((item.consumedPoEWatts || 0) / item.poeBudget) * 100))}%"
                    ></div>
                  </div>
                </div>
              ` : ''}

              <!-- Connected Edge Client Pools (Cameras, Access, Wireless) -->
              ${hasEdgeDevices && activeTopologyViewPlane !== "backbone" ? `
                <div class="pt-1.5 border-t border-slate-900 space-y-1">
                  ${edgeData.cameras > 0 ? `
                    <div class="flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-lg px-2 py-1 text-[10px]">
                      <div class="flex items-center gap-1.5 text-teal-300">
                        <i data-lucide="video" class="w-3 h-3"></i>
                        <span class="font-bold">${edgeData.cameras}x Streams (${Math.round(edgeData.cameraMbps)} Mbps)</span>
                      </div>
                      <span class="font-mono text-amber-400 font-bold">${Math.round(edgeData.cameraWatts)}W PoE</span>
                    </div>
                  ` : ''}
                  ${edgeData.doors > 0 ? `
                    <div class="flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-lg px-2 py-1 text-[10px]">
                      <div class="flex items-center gap-1.5 text-emerald-300">
                        <i data-lucide="shield" class="w-3 h-3"></i>
                        <span class="font-bold">${edgeData.doors}x Access Readers</span>
                      </div>
                      <span class="font-mono text-emerald-400 font-bold">${Math.round(edgeData.doorWatts)}W</span>
                    </div>
                  ` : ''}
                </div>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>
    `;

    const header = clusterEl.querySelector(".topo-cluster-header");
    header.addEventListener("mousedown", (e) => handleClusterMouseDown(e, clusterEl, loc));

    container.appendChild(clusterEl);
    groupIndex++;
  });

  generateTopologyLinks(activeNodes, edgeDeviceMap);
  
  // Compute total project PoE delivery flow
  let totalPoEFlow = 0;
  activeNodes.forEach(n => {
    if (n.consumedPoEWatts) totalPoEFlow += parseFloat(n.consumedPoEWatts);
  });

  updateTopologyCounters(activeNodes.length, topologyLinks.length, Math.round(totalPoEFlow));
  renderTopologyLinks();
  applyTopologyZoom();

  if (typeof safeCreateIcons === "function") {
    safeCreateIcons(container);
  } else if (window.lucide) {
    lucide.createIcons();
  }
}

// -----------------------------------------------------------
// Link Determination & Wire-Speed Auto-Negotiation
// -----------------------------------------------------------
function generateTopologyLinks(nodes, edgeDeviceMap = {}) {
  topologyLinks = [];

  const gateways = nodes.filter(n => n.role === "Gateways & WAN" || n.role === "Security WAN");
  const cores = nodes.filter(n => n.role === "Core" || n.role === "Core & Agg" || n.role === "Aggregation");
  const access = nodes.filter(n => n.role === "Access");
  const wireless = nodes.filter(n => n.role === "Wireless Bridge");
  const servers = nodes.filter(n => n.role === "Server" || n.role === "Compute & Storage" || n.role === "VMS Server");

  // 1. Gateway -> Core/Aggregation Interconnects
  gateways.forEach(gw => {
    cores.forEach(c => {
      const speed = resolveNegotiatedSpeed(gw, c);
      topologyLinks.push({
        id: `link-${gw.instanceId}-${c.instanceId}`,
        fromId: gw.instanceId,
        toId: c.instanceId,
        multiplier: 2,
        isLAG: true,
        speedLabel: `2x ${speed} LAG`,
        rawSpeed: speed,
        category: "backbone",
        isPoEDelivery: false
      });
    });
  });

  // 2. Core/Aggregation -> Access Uplinks
  access.forEach(acc => {
    let target = null;
    if (acc.customUplinkTargetId) {
      target = nodes.find(n => n.instanceId === acc.customUplinkTargetId);
    }
    if (!target) {
      const accLoc = FacilityStore.normalize(acc.closetName);
      target = cores.find(c => FacilityStore.normalize(c.closetName) === accLoc) || cores[0] || gateways[0];
    }

    if (target && target.instanceId !== acc.instanceId) {
      const isInterCloset = FacilityStore.normalize(target.closetName) !== FacilityStore.normalize(acc.closetName);
      const multiplier = acc.customLinkMultiplier || (isInterCloset ? 2 : 1);
      const speed = acc.customLinkSpeed || resolveNegotiatedSpeed(acc, target);
      const isLAG = multiplier > 1;

      topologyLinks.push({
        id: `link-${target.instanceId}-${acc.instanceId}`,
        fromId: target.instanceId,
        toId: acc.instanceId,
        multiplier,
        isLAG,
        speedLabel: isLAG ? `${multiplier}x ${speed} LAG` : `${speed} Uplink`,
        rawSpeed: speed,
        category: "access",
        isPoEDelivery: false
      });
    }
  });

  // 3. Server / Compute Node Ingest Uplinks (Attached to Core or Access)
  servers.forEach(srv => {
    let target = null;
    if (srv.customUplinkTargetId) {
      target = nodes.find(n => n.instanceId === srv.customUplinkTargetId);
    }
    if (!target) {
      target = cores[0] || access[0] || gateways[0];
    }

    if (target && target.instanceId !== srv.instanceId) {
      const speed = resolveNegotiatedSpeed(srv, target);
      topologyLinks.push({
        id: `link-${target.instanceId}-${srv.instanceId}`,
        fromId: target.instanceId,
        toId: srv.instanceId,
        multiplier: 2,
        isLAG: true,
        speedLabel: `2x ${speed} Server Ingest`,
        rawSpeed: speed,
        category: "server",
        isPoEDelivery: false
      });
    }
  });

  // 4. Wireless Bridge PtP / PtMP Links
  wireless.forEach(wb => {
    let target = null;
    if (wb.customUplinkTargetId) {
      target = nodes.find(n => n.instanceId === wb.customUplinkTargetId);
    }
    if (!target) {
      const wbLoc = FacilityStore.normalize(wb.closetName);
      target = access.find(a => FacilityStore.normalize(a.closetName) === wbLoc) || access[0] || cores[0];
    }

    if (target && target.instanceId !== wb.instanceId) {
      topologyLinks.push({
        id: `link-${target.instanceId}-${wb.instanceId}`,
        fromId: target.instanceId,
        toId: wb.instanceId,
        multiplier: 1,
        isLAG: false,
        speedLabel: wb.maxThroughput || "RF Bridge",
        rawSpeed: "1G",
        category: "wireless",
        isWireless: true,
        isPoEDelivery: true
      });
    }
  });

  // 5. Logical VMS Video Recording Ingest Streams (Edge Switch -> VMS Server)
  if (activeTopologyViewPlane === "vms" || activeTopologyViewPlane === "all") {
    const vmsServers = servers.filter(s => (s.hostedRoles && s.hostedRoles.includes("VMS Ingest & Recording")) || s.serverType === "vms_recording" || s.role === "VMS Server" || s.role === "Server");

    if (vmsServers.length > 0) {
      access.forEach(acc => {
        const edgeData = edgeDeviceMap[acc.instanceId];
        if (edgeData && edgeData.cameras > 0 && edgeData.cameraMbps > 0) {
          let targetServer = null;
          if (acc.assignedVmsServerId) {
            targetServer = vmsServers.find(s => s.instanceId === acc.assignedVmsServerId);
          }
          if (!targetServer) {
            targetServer = vmsServers[0];
          }

          if (targetServer && targetServer.instanceId !== acc.instanceId) {
            topologyLinks.push({
              id: `vms-stream-${acc.instanceId}-${targetServer.instanceId}`,
              fromId: acc.instanceId,
              toId: targetServer.instanceId,
              multiplier: 1,
              isLAG: false,
              speedLabel: `${Math.round(edgeData.cameraMbps)} Mbps Video Ingest`,
              rawSpeed: `${Math.round(edgeData.cameraMbps)}M`,
              category: "vms_stream",
              isPoEDelivery: false
            });
          }
        }
      });
    }
  }

  // 6. Logical Access Control Engine Communication (Edge Switch -> Access Server)
  if (activeTopologyViewPlane === "access" || activeTopologyViewPlane === "all") {
    const accessServers = servers.filter(s => (s.hostedRoles && s.hostedRoles.includes("Access Control Engine")) || s.serverType === "access_security_host" || s.role === "Server");

    if (accessServers.length > 0) {
      access.forEach(acc => {
        const edgeData = edgeDeviceMap[acc.instanceId];
        if (edgeData && edgeData.doors > 0) {
          let targetServer = null;
          if (acc.assignedAccessServerId) {
            targetServer = accessServers.find(s => s.instanceId === acc.assignedAccessServerId);
          }
          if (!targetServer) {
            targetServer = accessServers[0];
          }

          if (targetServer && targetServer.instanceId !== acc.instanceId) {
            topologyLinks.push({
              id: `access-link-${acc.instanceId}-${targetServer.instanceId}`,
              fromId: acc.instanceId,
              toId: targetServer.instanceId,
              multiplier: 1,
              isLAG: false,
              speedLabel: `${edgeData.doors} Doors Engine Link`,
              rawSpeed: "Access",
              category: "access_link",
              isPoEDelivery: false
            });
          }
        }
      });
    }
  }
}

/**
 * Auto-negotiates highest mutual link speed between two devices
 */
function resolveNegotiatedSpeed(nodeA, nodeB) {
  if (!nodeA || !nodeB) return "10G";

  const getSpeeds = (n) => {
    const s = `${n.maxBackboneSpeed || ''} ${n.portSpeed || ''} ${n.uplinksSummary || ''}`.toUpperCase();
    const supported = [];
    if (s.includes("100G") || s.includes("QSFP28")) supported.push(100);
    if (s.includes("40G") || s.includes("QSFP+")) supported.push(40);
    if (s.includes("25G") || s.includes("SFP28")) supported.push(25);
    if (s.includes("10G") || s.includes("SFP+")) supported.push(10);
    if (s.includes("2.5G") || s.includes("MGIG")) supported.push(2.5);
    supported.push(1); // Standard 1G baseline
    return supported;
  };

  const speedsA = getSpeeds(nodeA);
  const speedsB = getSpeeds(nodeB);

  const mutual = speedsA.filter(sp => speedsB.includes(sp)).sort((a, b) => b - a);
  const top = mutual[0] || 10;

  if (top === 100) return "100G";
  if (top === 40) return "40G";
  if (top === 25) return "25G";
  if (top === 10) return "10G";
  if (top === 2.5) return "2.5G";
  return "1G";
}

// -----------------------------------------------------------
// Smooth Bézier Curve Vector Link Renderer
// -----------------------------------------------------------
function renderTopologyLinks() {
  const svg = document.getElementById("topologySvgOverlay");
  if (!svg) return;

  svg.innerHTML = "";

  topologyLinks.forEach(link => {
    const fromCard = document.getElementById(`topo-card-${link.fromId}`);
    const toCard = document.getElementById(`topo-card-${link.toId}`);
    if (!fromCard || !toCard) return;

    const fromCluster = fromCard.closest(".topo-location-cluster");
    const toCluster = toCard.closest(".topo-location-cluster");
    if (!fromCluster || !toCluster) return;

    // Calculate edge anchor points (snapping to border edges instead of centers)
    const fromBox = {
      x: fromCluster.offsetLeft + fromCard.offsetLeft,
      y: fromCluster.offsetTop + fromCard.offsetTop,
      w: fromCard.offsetWidth,
      h: fromCard.offsetHeight
    };
    const toBox = {
      x: toCluster.offsetLeft + toCard.offsetLeft,
      y: toCluster.offsetTop + toCard.offsetTop,
      w: toCard.offsetWidth,
      h: toCard.offsetHeight
    };

    let x1, y1, x2, y2;

    // Determine clean orientation between boxes
    if (fromBox.x + fromBox.w < toBox.x) {
      // fromBox is to the LEFT of toBox
      x1 = fromBox.x + fromBox.w;
      y1 = fromBox.y + (fromBox.h / 2);
      x2 = toBox.x;
      y2 = toBox.y + (toBox.h / 2);
    } else if (fromBox.x > toBox.x + toBox.w) {
      // fromBox is to the RIGHT of toBox
      x1 = fromBox.x;
      y1 = fromBox.y + (fromBox.h / 2);
      x2 = toBox.x + toBox.w;
      y2 = toBox.y + (toBox.h / 2);
    } else {
      // Vertical stacking
      if (fromBox.y < toBox.y) {
        x1 = fromBox.x + (fromBox.w / 2);
        y1 = fromBox.y + fromBox.h;
        x2 = toBox.x + (toBox.w / 2);
        y2 = toBox.y;
      } else {
        x1 = fromBox.x + (fromBox.w / 2);
        y1 = fromBox.y;
        x2 = toBox.x + (toBox.w / 2);
        y2 = toBox.y + toBox.h;
      }
    }

    // Bézier Control Points for smooth S-curve flow
    const dx = Math.abs(x2 - x1) * 0.5;
    const dy = Math.abs(y2 - y1) * 0.5;

    let cx1, cy1, cx2, cy2;
    if (Math.abs(x2 - x1) > Math.abs(y2 - y1)) {
      cx1 = x1 + (x2 > x1 ? dx : -dx);
      cy1 = y1;
      cx2 = x2 - (x2 > x1 ? dx : -dx);
      cy2 = y2;
    } else {
      cx1 = x1;
      cy1 = y1 + (y2 > y1 ? dy : -dy);
      cx2 = x2;
      cy2 = y2 - (y2 > y1 ? dy : -dy);
    }

    // Color & Style by Speed and Role
    let strokeColor = "#38bdf8"; // Sky Blue: 10G / Default
    let strokeWidth = link.isLAG ? "3.5" : "2.5";
    let isDashed = false;

    if (link.category === "vms_stream") {
      strokeColor = "#2dd4bf"; // Teal: VMS Video Ingest Stream
      isDashed = true;
      strokeWidth = "2.5";
    } else if (link.category === "access_link") {
      strokeColor = "#818cf8"; // Indigo: Access Control Communication
      isDashed = true;
      strokeWidth = "2.0";
    } else if (link.isWireless) {
      strokeColor = "#c084fc"; // Purple: RF Bridge
      isDashed = true;
      strokeWidth = "2.5";
    } else if (link.isPoEDelivery && activeTopologyViewPlane === "power") {
      strokeColor = "#f59e0b"; // Amber: PoE Delivery
      strokeWidth = "3.0";
    } else if (link.rawSpeed === "100G" || link.rawSpeed === "25G") {
      strokeColor = "#06b6d4"; // Cyan: 100G/25G Campus Backbone
      strokeWidth = link.isLAG ? "4.0" : "3.0";
    } else if (link.rawSpeed === "1G") {
      strokeColor = "#10b981"; // Emerald: 1G Downlink
      strokeWidth = "2.0";
    }

    const isSelected = selectedTopologyLinkId === link.id;

    // Render Curved SVG Path
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const d = `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
    path.setAttribute("d", d);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", isSelected ? "#f59e0b" : strokeColor);
    path.setAttribute("stroke-width", isSelected ? "4.5" : strokeWidth);
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("opacity", isSelected ? "1.0" : "0.85");
    if (isDashed) path.setAttribute("stroke-dasharray", "6,4");
    path.setAttribute("class", "cursor-pointer hover:opacity-100 transition-opacity");
    path.onclick = (e) => selectTopologyLink(link.id, e);
    svg.appendChild(path);

    // Midpoint Speed / Wire Pill Badge
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;

    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", "cursor-pointer select-none");
    g.onclick = (e) => selectTopologyLink(link.id, e);

    const badgeWidth = Math.max(75, link.speedLabel.length * 7.5);
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", midX - (badgeWidth / 2));
    rect.setAttribute("y", midY - 9);
    rect.setAttribute("width", badgeWidth);
    rect.setAttribute("height", "18");
    rect.setAttribute("rx", "6");
    rect.setAttribute("fill", "#020617");
    rect.setAttribute("stroke", strokeColor);
    rect.setAttribute("stroke-width", isSelected ? "1.5" : "1");
    rect.setAttribute("opacity", "0.95");
    g.appendChild(rect);

    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", midX);
    text.setAttribute("y", midY + 3.5);
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("fill", strokeColor);
    text.setAttribute("font-size", "9.5");
    text.setAttribute("font-family", "monospace");
    text.setAttribute("font-weight", "bold");
    text.textContent = link.speedLabel;
    g.appendChild(text);

    svg.appendChild(g);
  });
}

// -----------------------------------------------------------
// Slide-Out Topology Inspector
// -----------------------------------------------------------
function selectTopologyNode(instanceId, e) {
  if (e) e.stopPropagation();
  selectedTopologyNodeId = instanceId;
  selectedTopologyLinkId = null;
  renderTopology();
  renderTopologyInspector();
}

function selectTopologyLink(linkId, e) {
  if (e) e.stopPropagation();
  selectedTopologyLinkId = linkId;
  selectedTopologyNodeId = null;
  renderTopology();
  renderTopologyInspector();
}

function deselectTopologyNode() {
  selectedTopologyNodeId = null;
  selectedTopologyLinkId = null;
  renderTopology();
  renderTopologyInspector();
}

function renderTopologyInspector() {
  const container = document.getElementById("topologyInspectorContent");
  const selectedNodeEl = document.getElementById("topoInspectorSelectedNode");
  const linkSpeedEl = document.getElementById("topoInspectorLinkSpeed");
  const powerSourceEl = document.getElementById("topoInspectorPowerSource");

  if (!container) return;

  if (selectedTopologyNodeId) {
    const item = projectBOM.find(i => i.instanceId === selectedTopologyNodeId);
    if (!item) {
      deselectTopologyNode();
      return;
    }

    if (selectedNodeEl) selectedNodeEl.innerText = item.model;
    if (powerSourceEl) powerSourceEl.innerText = getPowerSourceLabel(item);

    // Find upstream link
    const upstreamLink = topologyLinks.find(l => l.toId === item.instanceId);
    if (linkSpeedEl) linkSpeedEl.innerText = upstreamLink ? upstreamLink.speedLabel : (item.role === "Server" ? "Server Ingest" : "Host Core");

    // Candidate uplink switches
    const candidateTargets = projectBOM.filter(n => {
      if (n.instanceId === item.instanceId || n.parentInstanceId) return false;
      return n.role === "Core" || n.role === "Core & Agg" || n.role === "Aggregation" || n.role === "Gateways & WAN";
    });

    // Candidate servers in quote
    const candidateServers = projectBOM.filter(n => !n.parentInstanceId && (n.role === "Server" || n.role === "VMS Server" || n.role === "Compute & Storage"));

    // Connected downstream devices
    const children = projectBOM.filter(ch => ch.uplinkTargetId === item.instanceId && !ch.parentInstanceId);

    // If selected node is a SERVER
    if (item.role === "Server" || item.role === "VMS Server" || item.role === "Compute & Storage") {
      // Find all cameras assigned to this server
      const assignedCameras = projectBOM.filter(c => {
        if (c.parentInstanceId) return false;
        if (c.role !== "Camera" && !(c.category && c.category.includes("camera"))) return false;
        if (c.assignedRecordingServerId === item.instanceId) return true;
        if (!c.assignedRecordingServerId && c.uplinkTargetId) {
          const sw = projectBOM.find(s => s.instanceId === c.uplinkTargetId);
          if (sw && sw.assignedVmsServerId === item.instanceId) return true;
        }
        const firstServer = candidateServers[0];
        return (!c.assignedRecordingServerId && firstServer && firstServer.instanceId === item.instanceId);
      });

      // Find all access doors assigned to this server
      const assignedDoors = projectBOM.filter(d => {
        if (d.parentInstanceId) return false;
        if (d.role !== "Access Control" && !(d.category && d.category.includes("access"))) return false;
        if (d.assignedAccessServerId === item.instanceId) return true;
        if (!d.assignedAccessServerId && d.uplinkTargetId) {
          const sw = projectBOM.find(s => s.instanceId === d.uplinkTargetId);
          if (sw && sw.assignedAccessServerId === item.instanceId) return true;
        }
        const firstServer = candidateServers[0];
        return (!d.assignedAccessServerId && firstServer && firstServer.instanceId === item.instanceId);
      });

      let totalIngestMbps = 0;
      let totalCameraCount = 0;
      assignedCameras.forEach(c => {
        const qty = parseInt(c.qty, 10) || 1;
        totalIngestMbps += (parseFloat(c.streamBitrateMbps) || 4.0) * qty;
        totalCameraCount += qty;
      });

      let totalDoorCount = 0;
      assignedDoors.forEach(d => {
        totalDoorCount += (parseInt(d.qty, 10) || 1) * (parseInt(d.doorCapacity, 10) || 2);
      });

      const maxCap = item.maxIngestBandwidthMbps || 750;
      const ingestPercent = Math.min(100, Math.round((totalIngestMbps / maxCap) * 100));
      const hostedRoles = item.hostedRoles || ["VMS Ingest & Recording"];

      container.innerHTML = `
        <!-- Server Overview Card -->
        <div class="space-y-2 pb-3 border-b border-slate-800">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-white">${escapeHTML(item.model)}</span>
            <span class="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-purple-500/40 bg-purple-500/10 text-purple-300">
              Server / Appliance
            </span>
          </div>
          <div class="text-[11px] text-slate-400 space-y-1 font-mono">
            <div>Vendor: <strong class="text-slate-200">${escapeHTML(item.vendor || 'Generic')}</strong></div>
            <div>Location: <strong class="text-indigo-300">${escapeHTML(FacilityStore.normalize(item.closetName || 'MDF'))}</strong></div>
            <div>Interfaces: <strong class="text-white">${item.ports || 2}x ${item.portSpeed || '10G'} High-Speed NICs</strong></div>
            ${item.usableStorageTb ? `<div>Video Storage: <strong class="text-emerald-400">${item.usableStorageTb} TB RAID Array</strong></div>` : ''}
          </div>
        </div>

        <!-- Hosted Software Services & Roles -->
        <div class="space-y-2 pb-3 border-b border-slate-800">
          <span class="text-[10px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
            <i data-lucide="cpu" class="w-3.5 h-3.5"></i> Hosted Software Roles
          </span>
          <div class="space-y-1.5">
            ${[
              { name: "VMS Ingest & Recording", desc: "Real-time camera stream ingestion & archiving" },
              { name: "Access Control Engine", desc: "Cardholder validation & door access engine" },
              { name: "AI Video Analytics", desc: "Object recognition & vehicle LPR processing" },
              { name: "Directory / IAM Authentication", desc: "LDAP / SSO enterprise user sync" }
            ].map(r => {
              const active = hostedRoles.includes(r.name);
              return `
                <div 
                  onclick="toggleServerRole('${item.instanceId}', '${r.name}')" 
                  class="flex items-start gap-2 p-2 rounded-xl border ${active ? 'border-purple-500/50 bg-purple-500/10' : 'border-slate-800 bg-slate-950/60 opacity-60'} cursor-pointer hover:opacity-100 transition-all text-xs"
                >
                  <input type="checkbox" ${active ? 'checked' : ''} class="mt-0.5 rounded border-slate-700 bg-slate-900 text-purple-500 pointer-events-none" />
                  <div class="min-w-0">
                    <span class="font-bold text-white block text-[11px]">${r.name}</span>
                    <span class="text-[10px] text-slate-400 block">${r.desc}</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Video Ingest Telemetry -->
        <div class="space-y-2 pb-3 border-b border-slate-800">
          <span class="text-[10px] font-bold uppercase tracking-wider text-teal-400 flex items-center justify-between">
            <span class="flex items-center gap-1.5"><i data-lucide="video" class="w-3.5 h-3.5"></i> Video Ingest Pipeline</span>
            <span class="font-mono text-[9px] text-slate-400">${totalCameraCount} Streams</span>
          </span>
          <div class="space-y-2 bg-slate-950 p-2.5 rounded-xl border border-slate-850 text-xs font-mono">
            <div class="flex justify-between">
              <span class="text-slate-400">Total Ingest Load:</span>
              <span class="text-teal-300 font-bold">${Math.round(totalIngestMbps)} Mbps / ${maxCap} Mbps</span>
            </div>
            <div class="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
              <div class="h-full rounded-full transition-all ${ingestPercent > 85 ? 'bg-rose-500' : 'bg-teal-400'}" style="width: ${ingestPercent}%"></div>
            </div>
            <div class="flex justify-between text-[10px] text-slate-500">
              <span>Ingress Utilization:</span>
              <span class="${ingestPercent > 85 ? 'text-rose-400 font-bold' : 'text-slate-300'}">${ingestPercent}% Capacity</span>
            </div>
          </div>

          <!-- Ingest Stream Breakdown -->
          <div class="space-y-1 max-h-36 overflow-y-auto pr-1">
            ${assignedCameras.length === 0 ? `
              <div class="text-[11px] text-slate-500 py-2 text-center bg-slate-950 rounded-lg">No camera streams assigned to this host yet.</div>
            ` : assignedCameras.map(c => `
              <div class="bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-850 flex items-center justify-between text-xs">
                <span class="text-slate-200 font-medium truncate max-w-[170px]">${escapeHTML(c.model)}</span>
                <span class="font-mono text-teal-400 text-[10px] shrink-0">${(parseFloat(c.streamBitrateMbps) || 4.0) * (c.qty || 1)} Mbps</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Access Control Pipeline -->
        <div class="space-y-2 pb-3 border-b border-slate-800">
          <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center justify-between">
            <span class="flex items-center gap-1.5"><i data-lucide="shield" class="w-3.5 h-3.5"></i> Access Control Pipeline</span>
            <span class="font-mono text-[9px] text-slate-400">${totalDoorCount} Doors</span>
          </span>
          <div class="space-y-1.5 bg-slate-950 p-2.5 rounded-xl border border-slate-850 text-xs font-mono">
            <div class="flex justify-between">
              <span class="text-slate-400">Managed Doors:</span>
              <span class="text-emerald-400 font-bold">${totalDoorCount} Access Readers Online</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Security Protocol:</span>
              <span class="text-slate-300">OSDP v2 Secure Channel</span>
            </div>
          </div>
        </div>

        <!-- Core Uplink Interconnect -->
        <div class="space-y-2">
          <span class="text-[10px] font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
            <i data-lucide="git-commit" class="w-3.5 h-3.5"></i> Core Switch Uplink
          </span>
          <div class="space-y-2 bg-slate-950 p-2.5 rounded-xl border border-slate-850 text-xs">
            <div>
              <label class="text-[10px] text-slate-400 block mb-1">Target Core / Aggregation Switch:</label>
              <select onchange="updateCustomUplink('${item.instanceId}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-brand-500">
                <option value="">Auto-Assign (Nearest Core)</option>
                ${candidateTargets.map(t => `
                  <option value="${t.instanceId}" ${item.customUplinkTargetId === t.instanceId ? 'selected' : ''}>${t.model} (${FacilityStore.normalize(t.closetName)})</option>
                `).join('')}
              </select>
            </div>
          </div>
        </div>
      `;
      return;
    }

    // Default Switch Inspector Card
    container.innerHTML = `
      <!-- Node Overview Card -->
      <div class="space-y-2 pb-3 border-b border-slate-800">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-white">${escapeHTML(item.model)}</span>
          <span class="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${getRoleBadgeStyle(item.role)}">
            ${item.role}
          </span>
        </div>
        <div class="text-[11px] text-slate-400 space-y-1 font-mono">
          <div>Vendor: <strong class="text-slate-200">${escapeHTML(item.vendor || 'Generic')}</strong></div>
          <div>Location: <strong class="text-indigo-300">${escapeHTML(FacilityStore.normalize(item.closetName || 'MDF'))}</strong></div>
          <div>Interface: <strong class="text-white">${item.ports || 24} Ports (${escapeHTML(item.portSpeed || '1G/10G')})</strong></div>
        </div>
      </div>

      <!-- Power & PoE Telemetry -->
      <div class="space-y-2 pb-3 border-b border-slate-800">
        <span class="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
          <i data-lucide="zap" class="w-3.5 h-3.5"></i> Electrical & PoE Telemetry
        </span>
        <div class="space-y-1.5 text-xs bg-slate-950 p-2.5 rounded-xl border border-slate-850">
          <div class="flex justify-between text-slate-400">
            <span>Power Source:</span>
            <span class="text-amber-300 font-bold font-mono">${getPowerSourceLabel(item)}</span>
          </div>
          <div class="flex justify-between text-slate-400">
            <span>Chassis Base Draw:</span>
            <span class="font-mono text-white">${item.baseWatts || 0} W</span>
          </div>
          ${item.poeBudget > 0 ? `
            <div class="flex justify-between text-slate-400">
              <span>Total PoE Budget:</span>
              <span class="font-mono text-amber-400 font-bold">${item.poeBudget} W</span>
            </div>
            <div class="flex justify-between text-slate-400">
              <span>Connected Load:</span>
              <span class="font-mono ${((item.consumedPoEWatts || 0) > item.poeBudget) ? 'text-rose-400 font-bold' : 'text-emerald-400'}">
                ${item.consumedPoEWatts || 0} W (${Math.round(((item.consumedPoEWatts || 0) / (item.poeBudget || 1)) * 100)}%)
              </span>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- Uplink & Interconnect Settings -->
      ${item.role !== "Core" && item.role !== "Core & Agg" && item.role !== "Aggregation" && item.role !== "Gateways & WAN" ? `
        <div class="space-y-2 pb-3 border-b border-slate-800">
          <span class="text-[10px] font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
            <i data-lucide="git-commit" class="w-3.5 h-3.5"></i> Uplink Configuration
          </span>
          <div class="space-y-2 bg-slate-950 p-2.5 rounded-xl border border-slate-850 text-xs">
            <div>
              <label class="text-[10px] text-slate-400 block mb-1">Target Core / Aggregation Switch:</label>
              <select onchange="updateCustomUplink('${item.instanceId}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-brand-500">
                <option value="">Auto-Assign (Nearest Core)</option>
                ${candidateTargets.map(t => `
                  <option value="${t.instanceId}" ${item.customUplinkTargetId === t.instanceId ? 'selected' : ''}>${t.model} (${FacilityStore.normalize(t.closetName)})</option>
                `).join('')}
              </select>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="text-[10px] text-slate-400 block mb-1">Trunk LAG:</label>
                <select onchange="updateCustomLinkMultiplier('${item.instanceId}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-sky-300 font-mono font-bold rounded-lg px-2 py-1 text-xs">
                  <option value="1" ${(item.customLinkMultiplier || 1) == 1 ? 'selected' : ''}>1x Link</option>
                  <option value="2" ${item.customLinkMultiplier == 2 ? 'selected' : ''}>2x LACP LAG</option>
                  <option value="4" ${item.customLinkMultiplier == 4 ? 'selected' : ''}>4x LACP LAG</option>
                </select>
              </div>

              <div>
                <label class="text-[10px] text-slate-400 block mb-1">Speed Override:</label>
                <select onchange="updateCustomLinkSpeed('${item.instanceId}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-amber-300 font-mono font-bold rounded-lg px-2 py-1 text-xs">
                  <option value="">Auto-Detect</option>
                  <option value="100G" ${item.customLinkSpeed === '100G' ? 'selected' : ''}>100G</option>
                  <option value="40G" ${item.customLinkSpeed === '40G' ? 'selected' : ''}>40G</option>
                  <option value="25G" ${item.customLinkSpeed === '25G' ? 'selected' : ''}>25G</option>
                  <option value="10G" ${item.customLinkSpeed === '10G' ? 'selected' : ''}>10G</option>
                  <option value="1G" ${item.customLinkSpeed === '1G' ? 'selected' : ''}>1G</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- Logical Services Routing (VMS & Access) -->
      ${candidateServers.length > 0 ? `
        <div class="space-y-2 pb-3 border-b border-slate-800">
          <span class="text-[10px] font-bold uppercase tracking-wider text-brand-400 flex items-center gap-1.5">
            <i data-lucide="route" class="w-3.5 h-3.5"></i> Logical Services Routing
          </span>
          <div class="space-y-2 bg-slate-950 p-2.5 rounded-xl border border-slate-850 text-xs">
            <div>
              <label class="text-[10px] text-slate-400 block mb-1">Assigned VMS Recording Server:</label>
              <select onchange="updateSwitchVmsServer('${item.instanceId}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-teal-300 font-mono text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-500">
                <option value="">Auto-Detect Primary VMS</option>
                ${candidateServers.map(s => `
                  <option value="${s.instanceId}" ${item.assignedVmsServerId === s.instanceId ? 'selected' : ''}>${s.model} (${FacilityStore.normalize(s.closetName)})</option>
                `).join('')}
              </select>
            </div>

            <div>
              <label class="text-[10px] text-slate-400 block mb-1">Assigned Access Control Engine:</label>
              <select onchange="updateSwitchAccessServer('${item.instanceId}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-emerald-300 font-mono text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-500">
                <option value="">Auto-Detect Primary Host</option>
                ${candidateServers.map(s => `
                  <option value="${s.instanceId}" ${item.assignedAccessServerId === s.instanceId ? 'selected' : ''}>${s.model} (${FacilityStore.normalize(s.closetName)})</option>
                `).join('')}
              </select>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- Connected Downstream Devices List -->
      <div class="space-y-2">
        <span class="text-[10px] font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
          <span>Downlink Clients (${children.length})</span>
          <span class="text-[9px] font-mono text-slate-500">Auto-Mapped</span>
        </span>
        <div class="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          ${children.length === 0 ? `
            <div class="text-[11px] text-slate-500 py-3 text-center bg-slate-950 rounded-xl border border-slate-850">
              No field devices attached to this switch in quote.
            </div>
          ` : children.map(ch => `
            <div class="bg-slate-950 p-2 rounded-lg border border-slate-850 flex items-center justify-between text-xs">
              <div class="truncate max-w-[170px]">
                <span class="text-white block font-medium truncate">${escapeHTML(ch.model)}</span>
                <span class="text-[10px] text-slate-400 font-mono">${ch.role || 'Edge Device'} &bull; ${ch.qty || 1}x</span>
              </div>
              <span class="font-mono text-[10px] text-amber-400 font-bold shrink-0">
                ${Math.round((ch.powerConsumptionWatts || ch.maxPowerWatts || 15) * (ch.qty || 1))}W PoE
              </span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } else if (selectedTopologyLinkId) {
    const link = topologyLinks.find(l => l.id === selectedTopologyLinkId);
    if (!link) {
      deselectTopologyNode();
      return;
    }

    const fromNode = projectBOM.find(i => i.instanceId === link.fromId);
    const toNode = projectBOM.find(i => i.instanceId === link.toId);

    if (selectedNodeEl) selectedNodeEl.innerText = link.speedLabel;
    if (linkSpeedEl) linkSpeedEl.innerText = link.speedLabel;
    if (powerSourceEl) powerSourceEl.innerText = link.isPoEDelivery ? "PoE Delivery" : "Data / Signal Only";

    if (link.category === "vms_stream") {
      container.innerHTML = `
        <div class="space-y-3">
          <div class="pb-2 border-b border-slate-800">
            <span class="text-xs font-bold text-white block">${link.speedLabel}</span>
            <span class="text-[10px] font-mono text-teal-400">Logical Video Stream Ingest Pipe</span>
          </div>

          <div class="space-y-2 text-xs bg-slate-950 p-3 rounded-xl border border-slate-850 font-mono">
            <div class="flex justify-between">
              <span class="text-slate-400">Edge Switch:</span>
              <span class="text-white font-bold truncate max-w-[150px]">${escapeHTML(fromNode ? fromNode.model : 'Switch')}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Recording Server:</span>
              <span class="text-teal-300 font-bold truncate max-w-[150px]">${escapeHTML(toNode ? toNode.model : 'VMS Server')}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Continuous Ingress:</span>
              <span class="text-teal-400 font-bold">${link.speedLabel}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Compression:</span>
              <span class="text-slate-300">H.265 / SmartCodec</span>
            </div>
          </div>
        </div>
      `;
    } else if (link.category === "access_link") {
      container.innerHTML = `
        <div class="space-y-3">
          <div class="pb-2 border-b border-slate-800">
            <span class="text-xs font-bold text-white block">${link.speedLabel}</span>
            <span class="text-[10px] font-mono text-indigo-400">Access Control Communication Pipe</span>
          </div>

          <div class="space-y-2 text-xs bg-slate-950 p-3 rounded-xl border border-slate-850 font-mono">
            <div class="flex justify-between">
              <span class="text-slate-400">Edge Switch:</span>
              <span class="text-white font-bold truncate max-w-[150px]">${escapeHTML(fromNode ? fromNode.model : 'Switch')}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Access Engine Host:</span>
              <span class="text-indigo-300 font-bold truncate max-w-[150px]">${escapeHTML(toNode ? toNode.model : 'Access Server')}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Managed Capacity:</span>
              <span class="text-emerald-400 font-bold">${link.speedLabel}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Encryption:</span>
              <span class="text-slate-300">TLS 1.3 / OSDP v2</span>
            </div>
          </div>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div class="space-y-3">
          <div class="pb-2 border-b border-slate-800">
            <span class="text-xs font-bold text-white block">${link.speedLabel}</span>
            <span class="text-[10px] font-mono text-slate-400">Logical Transport Interconnect</span>
          </div>

          <div class="space-y-2 text-xs bg-slate-950 p-3 rounded-xl border border-slate-850 font-mono">
            <div class="flex justify-between">
              <span class="text-slate-400">Upstream Host:</span>
              <span class="text-white font-bold truncate max-w-[150px]">${escapeHTML(fromNode ? fromNode.model : 'Core')}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Downstream Node:</span>
              <span class="text-indigo-300 font-bold truncate max-w-[150px]">${escapeHTML(toNode ? toNode.model : 'Access')}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Port Speed:</span>
              <span class="text-cyan-400 font-bold">${link.rawSpeed}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Link Bundle:</span>
              <span class="text-sky-300 font-bold">${link.multiplier}x ${link.isLAG ? '(LACP LAG)' : '(Single)'}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Energy Delivery:</span>
              <span class="${link.isPoEDelivery ? 'text-amber-400 font-bold' : 'text-slate-500'}">${link.isPoEDelivery ? 'PoE Powered' : 'Local Power'}</span>
            </div>
          </div>
        </div>
      `;
    }
  } else {
    // Project-wide Topology Summary when nothing is selected
    if (selectedNodeEl) selectedNodeEl.innerText = "Project Overview";
    if (linkSpeedEl) linkSpeedEl.innerText = "Unified";
    if (powerSourceEl) powerSourceEl.innerText = "All Sources";

    const totalSwitches = projectBOM.filter(i => !i.parentInstanceId && (i.role === "Access" || i.role === "Core" || i.role === "Aggregation")).length;
    const totalGateways = projectBOM.filter(i => !i.parentInstanceId && (i.role === "Gateways & WAN" || i.role === "Security WAN")).length;
    const totalEdge = projectBOM.filter(i => i.uplinkTargetId && !i.parentInstanceId).length;

    container.innerHTML = `
      <div class="space-y-4">
        <div class="text-slate-400 text-xs">
          Select any switch, server, or interconnect link on the canvas to configure uplinks, adjust LAG trunking, or inspect connected field devices.
        </div>

        <div class="space-y-2 pt-2 border-t border-slate-800">
          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Project Systems Telemetry</span>
          <div class="space-y-2 text-xs bg-slate-950 p-3 rounded-xl border border-slate-850 font-mono">
            <div class="flex justify-between">
              <span class="text-slate-400">Security Gateways:</span>
              <span class="text-white font-bold">${totalGateways} Units</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Distribution Switches:</span>
              <span class="text-white font-bold">${totalSwitches} Units</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Connected Edge Devices:</span>
              <span class="text-sky-400 font-bold">${totalEdge} Devices</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Active Interconnects:</span>
              <span class="text-emerald-400 font-bold">${topologyLinks.length} Trunks</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  if (typeof safeCreateIcons === "function") {
    safeCreateIcons(container);
  } else if (window.lucide) {
    lucide.createIcons();
  }
}

function getPowerSourceLabel(item) {
  if (item.dualPsu) return "Dual Hot-Swap AC";
  if (item.powerSource === "poe_switch" || item.poeStandardRequired) return "PoE-In Powered";
  if (item.isDinMounted || (item.model && item.model.includes("DIN"))) return "48-56VDC Terminal";
  return "Internal AC";
}

function getRoleBadgeStyle(role) {
  switch (role) {
    case "Core":
    case "Core & Agg":
    case "Aggregation":
      return "border-purple-500/40 bg-purple-500/10 text-purple-300";
    case "Access":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
    case "Gateways & WAN":
    case "Security WAN":
      return "border-rose-500/40 bg-rose-500/10 text-rose-300";
    case "Wireless Bridge":
      return "border-sky-500/40 bg-sky-500/10 text-sky-300";
    case "Server":
    case "Compute & Storage":
      return "border-amber-500/40 bg-amber-500/10 text-amber-300";
    default:
      return "border-slate-700 bg-slate-800 text-slate-300";
  }
}

// -----------------------------------------------------------
// Interactive Custom Link Controls
// -----------------------------------------------------------
function updateCustomUplink(nodeInstanceId, targetInstanceId) {
  const item = projectBOM.find(i => i.instanceId === nodeInstanceId);
  if (item) {
    item.customUplinkTargetId = targetInstanceId || null;
    FacilityStore.notifyWorkspaceChange();
    renderTopology();
    renderTopologyInspector();
  }
}

function updateCustomLinkMultiplier(nodeInstanceId, multiplierVal) {
  const item = projectBOM.find(i => i.instanceId === nodeInstanceId);
  if (item) {
    item.customLinkMultiplier = parseInt(multiplierVal, 10) || 1;
    FacilityStore.notifyWorkspaceChange();
    renderTopology();
    renderTopologyInspector();
  }
}

function updateCustomLinkSpeed(nodeInstanceId, speedVal) {
  const item = projectBOM.find(i => i.instanceId === nodeInstanceId);
  if (item) {
    item.customLinkSpeed = speedVal || null;
    FacilityStore.notifyWorkspaceChange();
    renderTopology();
    renderTopologyInspector();
  }
}

// -----------------------------------------------------------
// Drag & Drop Movement Engine
// -----------------------------------------------------------
function handleClusterMouseDown(e, clusterEl, loc) {
  if (!isTopologyModalVisible()) return;

  isCanvasDragging = true;
  draggedTopologyNode = {
    el: clusterEl,
    loc: loc
  };

  const viewport = document.getElementById("topologyCanvasViewport");
  const rect = viewport.getBoundingClientRect();
  topoDragOffset.x = (e.clientX - rect.left + viewport.scrollLeft) - (clusterEl.offsetLeft * topologyZoomLevel);
  topoDragOffset.y = (e.clientY - rect.top + viewport.scrollTop) - (clusterEl.offsetTop * topologyZoomLevel);

  e.stopPropagation();
}

function handleTopologyMouseMove(e) {
  if (!isTopologyModalVisible() || !isCanvasDragging || !draggedTopologyNode) return;

  const viewport = document.getElementById("topologyCanvasViewport");
  const rect = viewport.getBoundingClientRect();

  const newX = Math.max(30, ((e.clientX - rect.left + viewport.scrollLeft) - topoDragOffset.x) / topologyZoomLevel);
  const newY = Math.max(30, ((e.clientY - rect.top + viewport.scrollTop) - topoDragOffset.y) / topologyZoomLevel);

  draggedTopologyNode.el.style.left = `${Math.round(newX)}px`;
  draggedTopologyNode.el.style.top = `${Math.round(newY)}px`;

  renderTopologyLinks();
}

function handleTopologyMouseUp() {
  if (isCanvasDragging && draggedTopologyNode) {
    isCanvasDragging = false;
    saveTopologyPosition(draggedTopologyNode.loc, draggedTopologyNode.el.offsetLeft, draggedTopologyNode.el.offsetTop);
    draggedTopologyNode = null;
  }
}

// -----------------------------------------------------------
// Position State & Auto-Arrange Hierarchy
// -----------------------------------------------------------
function autoArrangeTopologyHierarchy() {
  if (typeof projectBOM === "undefined") return;

  const positions = {};
  const activeNodes = projectBOM.filter(item => {
    if (item.parentInstanceId) return false;
    const loc = FacilityStore.normalize(item.closetName || item.rackId);
    return loc !== FacilityStore.UNASSIGNED;
  });

  // Collect unique locations and categorize by primary role
  const locMap = {};
  activeNodes.forEach(item => {
    const loc = FacilityStore.normalize(item.closetName || item.rackId);
    if (!locMap[loc]) locMap[loc] = [];
    locMap[loc].push(item);
  });

  const gateways = [];
  const coreAgg = [];
  const access = [];
  const others = [];

  Object.entries(locMap).forEach(([loc, items]) => {
    if (items.some(i => i.role === "Gateways & WAN" || i.role === "Security WAN")) {
      gateways.push(loc);
    } else if (items.some(i => i.role === "Core" || i.role === "Core & Agg" || i.role === "Aggregation" || i.role === "Server")) {
      coreAgg.push(loc);
    } else if (items.some(i => i.role === "Access")) {
      access.push(loc);
    } else {
      others.push(loc);
    }
  });

  // Layout Tier 1: Gateways (Top)
  gateways.forEach((loc, idx) => {
    positions[loc] = { x: 80 + (idx * 400), y: 80 };
  });

  // Layout Tier 2: Core & Distribution Aggregation (Middle)
  const coreY = gateways.length > 0 ? 320 : 80;
  coreAgg.forEach((loc, idx) => {
    positions[loc] = { x: 80 + (idx * 400), y: coreY };
  });

  // Layout Tier 3: Access Closets (Lower Tier)
  const accessY = coreY + (coreAgg.length > 0 ? 340 : 0);
  access.forEach((loc, idx) => {
    positions[loc] = { x: 80 + (idx * 400), y: accessY };
  });

  // Layout Tier 4: Field & Wireless (Bottom)
  const othersY = accessY + (access.length > 0 ? 340 : 0);
  others.forEach((loc, idx) => {
    positions[loc] = { x: 80 + (idx * 400), y: othersY };
  });

  // Save to persistence
  try {
    const projKey = FacilityStore.getProjectId();
    localStorage.setItem(`netselect_topo_pos_${projKey}`, JSON.stringify(positions));
  } catch (e) {}

  renderTopology();
  renderTopologyInspector();
  if (typeof showToast === "function") showToast("Arranged topology into clean Gateways > Core > Access hierarchy.");
}

function saveTopologyPosition(loc, x, y) {
  try {
    const projKey = FacilityStore.getProjectId();
    const positions = loadTopologyPositions();
    positions[loc] = { x, y };
    localStorage.setItem(`netselect_topo_pos_${projKey}`, JSON.stringify(positions));
  } catch (e) {}
}

function loadTopologyPositions() {
  try {
    const projKey = FacilityStore.getProjectId();
    const raw = localStorage.getItem(`netselect_topo_pos_${projKey}`);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function autoDefaultTopology() {
  autoArrangeTopologyHierarchy();
}

function updateTopologyCounters(nodesCount, linksCount, poeFlowWatts = 0) {
  const nEl = document.getElementById("topologyNodesCount");
  const lEl = document.getElementById("topologyLinksCount");
  const pEl = document.getElementById("topologyTotalPoEFlow");
  if (nEl) nEl.innerText = `${nodesCount} Nodes`;
  if (lEl) lEl.innerText = `${linksCount} Trunks`;
  if (pEl) pEl.innerText = `${poeFlowWatts.toLocaleString()}W PoE Flow`;
}

// -----------------------------------------------------------
// Logical Services & Routing Helpers
// -----------------------------------------------------------
function updateSwitchVmsServer(switchInstanceId, serverInstanceId) {
  const item = projectBOM.find(i => i.instanceId === switchInstanceId);
  if (item) {
    item.assignedVmsServerId = serverInstanceId || null;
    FacilityStore.notifyWorkspaceChange();
    renderTopology();
    renderTopologyInspector();
  }
}

function updateSwitchAccessServer(switchInstanceId, serverInstanceId) {
  const item = projectBOM.find(i => i.instanceId === switchInstanceId);
  if (item) {
    item.assignedAccessServerId = serverInstanceId || null;
    FacilityStore.notifyWorkspaceChange();
    renderTopology();
    renderTopologyInspector();
  }
}

function toggleServerRole(serverInstanceId, roleName) {
  const item = projectBOM.find(i => i.instanceId === serverInstanceId);
  if (item) {
    if (!item.hostedRoles) item.hostedRoles = [];
    const idx = item.hostedRoles.indexOf(roleName);
    if (idx >= 0) {
      item.hostedRoles.splice(idx, 1);
    } else {
      item.hostedRoles.push(roleName);
    }
    FacilityStore.notifyWorkspaceChange();
    renderTopology();
    renderTopologyInspector();
  }
}

// Window Compatibility Exports
window.isTopologyModalVisible = isTopologyModalVisible;
window.toggleTopologyModal = toggleTopologyModal;
window.initTopologyCanvas = initTopologyCanvas;
window.renderTopology = renderTopology;
window.zoomTopologyCanvas = zoomTopologyCanvas;
window.resetTopologyZoom = resetTopologyZoom;
window.setTopologyViewPlane = setTopologyViewPlane;
window.toggleTopologyInspector = toggleTopologyInspector;
window.selectTopologyNode = selectTopologyNode;
window.selectTopologyLink = selectTopologyLink;
window.deselectTopologyNode = deselectTopologyNode;
window.autoArrangeTopologyHierarchy = autoArrangeTopologyHierarchy;
window.autoDefaultTopology = autoDefaultTopology;
window.updateCustomUplink = updateCustomUplink;
window.updateCustomLinkMultiplier = updateCustomLinkMultiplier;
window.updateCustomLinkSpeed = updateCustomLinkSpeed;
window.updateSwitchVmsServer = updateSwitchVmsServer;
window.updateSwitchAccessServer = updateSwitchAccessServer;
window.toggleServerRole = toggleServerRole;