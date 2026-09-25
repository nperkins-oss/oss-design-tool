// =========================================================================
// LOGICAL SYSTEMS & NETWORK TOPOLOGY ENGINE (NetSelect Enterprise)
// L2/L3 Wire-Speed Transport, Dual-Plane Logical Services & Power Sizing
// Smooth Bézier Vector Links, Auto-Negotiated Speeds & Slide-Out Inspector
// =========================================================================

let isCanvasDragging = false;
let draggedTopologyNode = null;
let topoDragOffset = { x: 0, y: 0 };
let dragStartPos = { x: 0, y: 0 };
let isViewportPanning = false;
let panStart = { x: 0, y: 0, scrollLeft: 0, scrollTop: 0 };
let topologyLinks = [];

// Canvas Viewport & Selection State
let topologyZoomLevel = 1.0;
let activeTopologyViewPlane = "all"; // "all" | "backbone" | "power" | "vms" | "access"
let selectedTopologyNodeId = null;
let selectedTopologyRackLoc = null;
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
    setTimeout(() => {
      fitTopologyToScreen();
    }, 60);
    if (window.lucide) lucide.createIcons();
  } else {
    modal.classList.add("hidden");
    isCanvasDragging = false;
    isViewportPanning = false;
    draggedTopologyNode = null;
  }
}

function initTopologyCanvas() {
  const viewport = document.getElementById("topologyCanvasViewport");
  if (!viewport || viewport.dataset.initialized === "true") return;

  viewport.dataset.initialized = "true";
  viewport.addEventListener("mousedown", handleViewportMouseDown);
  viewport.addEventListener("wheel", handleViewportWheel, { passive: false });
  window.addEventListener("mousemove", handleTopologyMouseMove);
  window.addEventListener("mouseup", handleTopologyMouseUp);
}

function handleViewportMouseDown(e) {
  if (!isTopologyModalVisible()) return;
  // If clicked inside an interactive card or control, don't initiate viewport pan
  if (e.target.closest(".topo-location-cluster") || e.target.closest("button") || e.target.closest("select") || e.target.closest("input")) {
    return;
  }
  const viewport = document.getElementById("topologyCanvasViewport");
  if (!viewport) return;

  isViewportPanning = true;
  panStart = {
    x: e.clientX,
    y: e.clientY,
    scrollLeft: viewport.scrollLeft,
    scrollTop: viewport.scrollTop
  };
  viewport.style.cursor = "grabbing";
}

function handleViewportWheel(e) {
  if (!isTopologyModalVisible()) return;
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.08 : -0.08;
    zoomTopologyCanvas(delta);
  }
}

// -----------------------------------------------------------
// Canvas Zoom & Pan Controls
// -----------------------------------------------------------
function zoomTopologyCanvas(delta) {
  topologyZoomLevel = Math.max(0.4, Math.min(2.0, Math.round((topologyZoomLevel + delta) * 100) / 100));
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
    container.style.transformOrigin = "top left";
  }
  if (svg) {
    svg.style.transform = `scale(${topologyZoomLevel})`;
    svg.style.transformOrigin = "top left";
  }
  if (badge) {
    badge.innerText = `${Math.round(topologyZoomLevel * 100)}%`;
  }
  renderTopologyLinks();
}

function fitTopologyToScreen() {
  const clusters = document.querySelectorAll(".topo-location-cluster");
  const viewport = document.getElementById("topologyCanvasViewport");
  if (clusters.length === 0 || !viewport) return;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  clusters.forEach(c => {
    const l = c.offsetLeft;
    const t = c.offsetTop;
    const r = l + c.offsetWidth;
    const b = t + c.offsetHeight;
    if (l < minX) minX = l;
    if (t < minY) minY = t;
    if (r > maxX) maxX = r;
    if (b > maxY) maxY = b;
  });

  const inspectorPanel = document.getElementById("topologyInspectorPanel");
  const inspectorWidth = (inspectorPanel && !inspectorPanel.classList.contains("hidden")) ? inspectorPanel.offsetWidth : 0;
  const availW = Math.max(400, viewport.clientWidth - inspectorWidth - 100);
  const availH = Math.max(300, viewport.clientHeight - 100);

  const contentW = Math.max(100, maxX - minX + 80);
  const contentH = Math.max(100, maxY - minY + 80);

  const scaleW = availW / contentW;
  const scaleH = availH / contentH;
  const optimalZoom = Math.max(0.45, Math.min(1.15, Math.min(scaleW, scaleH)));

  topologyZoomLevel = Math.round(optimalZoom * 100) / 100;
  applyTopologyZoom();

  const centerX = (minX + (contentW / 2)) * topologyZoomLevel;
  const centerY = (minY + (contentH / 2)) * topologyZoomLevel;

  viewport.scrollTo({
    left: Math.max(0, centerX - (availW / 2)),
    top: Math.max(0, centerY - (availH / 2)),
    behavior: "smooth"
  });
}

function panClusterIntoView(loc) {
  if (!loc) return;
  const clusterEl = Array.from(document.querySelectorAll(".topo-location-cluster")).find(el => el.getAttribute("data-location") === loc);
  const viewport = document.getElementById("topologyCanvasViewport");
  if (!clusterEl || !viewport) return;

  const inspectorPanel = document.getElementById("topologyInspectorPanel");
  const inspectorWidth = (inspectorPanel && !inspectorPanel.classList.contains("hidden")) ? inspectorPanel.offsetWidth : 0;
  const visibleWidth = Math.max(400, viewport.clientWidth - inspectorWidth);
  const visibleHeight = viewport.clientHeight;

  const targetLeft = (clusterEl.offsetLeft * topologyZoomLevel) - (visibleWidth / 2) + ((clusterEl.offsetWidth * topologyZoomLevel) / 2);
  const targetTop = (clusterEl.offsetTop * topologyZoomLevel) - (visibleHeight / 2) + ((clusterEl.offsetHeight * topologyZoomLevel) / 2);

  viewport.scrollTo({
    left: Math.max(0, targetLeft),
    top: Math.max(0, targetTop),
    behavior: "smooth"
  });
}

function panNodeIntoView(instanceId) {
  const cardEl = document.getElementById(`topo-card-${instanceId}`);
  if (cardEl) {
    const cluster = cardEl.closest(".topo-location-cluster");
    if (cluster) {
      panClusterIntoView(cluster.getAttribute("data-location"));
    }
    cardEl.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    cardEl.classList.add("ring-4", "ring-indigo-400", "scale-[1.02]", "shadow-2xl");
    setTimeout(() => {
      cardEl.classList.remove("ring-4", "ring-indigo-400", "scale-[1.02]", "shadow-2xl");
    }, 1800);
  } else {
    // If it's a child/edge device, pan to its host switch
    const item = (typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) ? projectBOM.find(i => i.instanceId === instanceId) : null;
    if (item && item.uplinkTargetId) {
      selectTopologyNode(item.uplinkTargetId);
      panNodeIntoView(item.uplinkTargetId);
    }
  }
}


function setTopologyViewPlane(plane) {
  activeTopologyViewPlane = plane || "all";
  renderTopology();
  renderTopologyInspector();
}

function toggleTopologyInspector(forceState = null) {
  const panel = document.getElementById("topologyInspectorPanel");
  const openBtn = document.getElementById("topologyOpenInspectorBtn");
  const headerBtn = document.getElementById("topologyInspectorHeaderBtn");
  if (!panel) return;

  if (forceState !== null) {
    isTopologyInspectorVisible = forceState;
  } else {
    isTopologyInspectorVisible = !isTopologyInspectorVisible;
  }

  if (isTopologyInspectorVisible) {
    panel.classList.remove("hidden");
    if (openBtn) openBtn.classList.add("hidden");
    if (headerBtn) headerBtn.classList.add("border-brand-500", "text-brand-300");
  } else {
    panel.classList.add("hidden");
    if (openBtn) openBtn.classList.remove("hidden");
    if (headerBtn) headerBtn.classList.remove("border-brand-500", "text-brand-300");
  }
}

// -----------------------------------------------------------
// Facility & Device Auto-Linking Engine at Scale
// -----------------------------------------------------------
function autoResolveDeviceUplinks() {
  if (typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) return;

  const switches = projectBOM.filter(i => 
    !i.parentInstanceId && 
    (i.role === "Access" || i.role === "Core" || i.role === "Core & Agg" || i.role === "Aggregation")
  );

  if (switches.length === 0) return;

  projectBOM.forEach(item => {
    if (item.parentInstanceId) return;
    const isEdge = item.role === "Camera" || item.role === "Access Control" || 
      (item.category && (item.category.includes("camera") || item.category.includes("access")));
    const isRadio = item.role === "Wireless Bridge" || item.category === "wireless" || item.category === "ptp_60g";

    if (!isEdge && !isRadio) return;

    // Check if device currently has a valid uplink target
    const currentTarget = item.uplinkTargetId ? projectBOM.find(s => s.instanceId === item.uplinkTargetId) : null;
    if (!currentTarget) {
      const itemLoc = FacilityStore.normalize(item.closetName || item.rackId);
      
      // 1. First priority: Access switch in the exact same closet / enclosure
      let candidateSwitch = switches.find(s => 
        FacilityStore.normalize(s.closetName || s.rackId) === itemLoc && s.role === "Access"
      );

      // 2. Second priority: Core/Agg in the same closet
      if (!candidateSwitch) {
        candidateSwitch = switches.find(s => 
          FacilityStore.normalize(s.closetName || s.rackId) === itemLoc
        );
      }

      // 3. Fallback: If no switch in same location (e.g. outdoor pole), use primary Access switch
      if (!candidateSwitch) {
        candidateSwitch = switches.find(s => s.role === "Access") || switches[0];
      }

      if (candidateSwitch && candidateSwitch.instanceId !== item.instanceId) {
        item.uplinkTargetId = candidateSwitch.instanceId;
        if (typeof PortEngine !== "undefined") {
          PortEngine.allocatePort(candidateSwitch, item);
        }
      }
    } else {
      // Ensure port is allocated if missing
      if (typeof PortEngine !== "undefined" && !item.assignedSwitchPort) {
        PortEngine.allocatePort(currentTarget, item);
      }
    }
  });
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

  // Auto-resolve device uplinks to local switches in closets at scale
  autoResolveDeviceUplinks();

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

    const isClusterSelected = selectedTopologyRackLoc === loc;
    const clusterEl = document.createElement("div");
    clusterEl.className = `topo-location-cluster absolute select-none bg-slate-900/90 border ${isClusterSelected ? 'border-indigo-500 ring-2 ring-indigo-500/50 shadow-indigo-500/20' : 'border-slate-800 hover:border-slate-700/80'} rounded-2xl p-3.5 shadow-2xl backdrop-blur-md w-84 transition-all`;
    clusterEl.style.left = `${pos.x}px`;
    clusterEl.style.top = `${pos.y}px`;
    clusterEl.setAttribute("data-location", loc);

    clusterEl.innerHTML = `
      <!-- Cluster Header -->
      <div 
        class="flex items-center justify-between pb-2.5 mb-3 border-b border-slate-800 cursor-pointer topo-cluster-header group hover:border-indigo-500/40 transition-colors"
        onclick="selectTopologyRack('${escapeHTML(loc)}', event)"
        title="Click to inspect this rack enclosure (or drag to reposition)"
      >
        <div class="flex items-center gap-2.5">
          <div class="p-1.5 rounded-lg ${isClusterSelected ? 'bg-indigo-500 text-white shadow-md' : 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 group-hover:bg-indigo-500/20'} transition-all">
            <i data-lucide="server" class="w-4 h-4"></i>
          </div>
          <div>
            <span class="text-xs font-bold ${isClusterSelected ? 'text-indigo-300' : 'text-white'} tracking-wide block leading-none">${escapeHTML(parsed.space)}</span>
            <span class="text-[10px] font-mono text-indigo-400/90 block mt-1 leading-none">${escapeHTML(parsed.enclosure)}</span>
          </div>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800">
            ${items.length} ${items.length === 1 ? 'Chassis' : 'Chassis'}
          </span>
          ${isClusterSelected ? `
            <span class="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" title="Inspecting Enclosure"></span>
          ` : ''}
        </div>
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
          const isStacked = (item.stackedUnits && item.stackedUnits >= 2) || 
            (item.stackedUnits !== 0 && item.qty >= 2 && (item.canStack || item.role === "Access" || item.role === "Aggregation"));
          const stackUnits = isStacked ? (item.stackedUnits || item.qty) : 1;
          const basePortsPerUnit = item.ports || 24;
          const totalStackPorts = basePortsPerUnit * stackUnits;
          const totalStackPoE = (item.poeBudget || 0) * stackUnits;
          const totalStackBaseWatts = (item.baseWatts || 0) * stackUnits;

          return `
            <div 
              class="topo-node-card text-xs space-y-2 p-3 rounded-xl border ${isSelected ? 'border-brand-500 ring-2 ring-brand-500/40 bg-slate-850' : (isStacked ? 'border-indigo-500/50 bg-slate-950/90 hover:border-indigo-400' : 'border-slate-800 bg-slate-950/80 hover:border-slate-700')} transition-all cursor-pointer shadow-md ${isStacked ? 'shadow-indigo-950/30' : ''}" 
              id="topo-card-${item.instanceId}"
              onclick="selectTopologyNode('${item.instanceId}', event)"
            >
              <div class="flex items-start justify-between gap-1.5">
                <div class="min-w-0">
                  <span class="font-bold text-white truncate block text-xs" title="${escapeHTML(item.model)}">${escapeHTML(item.model)}</span>
                  <span class="text-[10px] text-slate-400 font-mono block">
                    ${escapeHTML(item.vendor || 'Generic')} &bull; ${isStacked ? `<span class="text-indigo-300 font-semibold">${stackUnits}x Member Virtual Chassis &bull; ${item.rackUnits * stackUnits}U</span>` : `SKU: ${escapeHTML(item.sku || 'N/A')}`}
                  </span>
                </div>
                <div class="flex items-center gap-1 shrink-0">
                  ${isStacked ? `
                    <span class="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border border-indigo-500/50 bg-indigo-500/20 text-indigo-300" title="Unified virtual chassis stack of ${stackUnits} physical units">
                      Stack (${stackUnits}U)
                    </span>
                  ` : ''}
                  <span class="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${getRoleBadgeStyle(item.role)}">
                    ${item.role}
                  </span>
                </div>
              </div>

              ${isStacked ? `
                <div class="flex items-center justify-between bg-indigo-950/40 border border-indigo-800/40 rounded-lg px-2 py-0.5 text-[9px] font-mono text-indigo-300">
                  <span class="flex items-center gap-1">
                    <i data-lucide="layers" class="w-3 h-3 text-indigo-400"></i>
                    <span>Single Logical Virtual Chassis</span>
                  </span>
                  <span class="text-indigo-400/90">${stackUnits} Physical Units</span>
                </div>
              ` : ''}

              <!-- Power & Port Telemetry -->
              <div class="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-slate-900 text-[10px] font-mono">
                <div class="flex items-center gap-1 text-slate-400">
                  <i data-lucide="zap" class="w-3 h-3 text-amber-400 shrink-0"></i>
                  <span class="truncate">${powerSourceLabel}${isStacked ? ` (${stackUnits}x PSUs &bull; ${totalStackBaseWatts}W)` : ''}</span>
                </div>
                <div class="flex items-center justify-end gap-1 text-slate-400">
                  <i data-lucide="layers" class="w-3 h-3 text-sky-400 shrink-0"></i>
                  <span>${totalStackPorts} Ports ${isStacked ? `(${stackUnits}x ${basePortsPerUnit}P)` : ''}</span>
                </div>
              </div>

              ${(item.uplinkTargetId && item.role !== "Access" && item.role !== "Core" && item.role !== "Core & Agg" && item.role !== "Aggregation") ? `
                <div class="flex items-center justify-between pt-1 border-t border-slate-900 text-[10px] font-mono">
                  <span class="text-slate-500">Host Switch:</span>
                  <span class="text-sky-300 font-bold truncate max-w-[160px]" title="Connected to ${escapeHTML((projectBOM.find(s => s.instanceId === item.uplinkTargetId) || {}).model || 'Switch')}">
                    ${escapeHTML((projectBOM.find(s => s.instanceId === item.uplinkTargetId) || {}).model || 'Switch')} (Port ${item.assignedSwitchPort || 'Auto'})
                  </span>
                </div>
              ` : ''}

              <!-- PoE Allocation Bar (for PoE Switches) -->
              ${totalStackPoE > 0 ? `
                <div class="space-y-1 pt-1 border-t border-slate-900">
                  <div class="flex justify-between text-[10px] font-mono">
                    <span class="text-slate-500">PoE Power:</span>
                    <span class="text-amber-300 font-bold">${item.consumedPoEWatts || 0}W / ${totalStackPoE}W ${isStacked ? `(${stackUnits}x ${item.poeBudget}W)` : ''}</span>
                  </div>
                  <div class="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                    <div 
                      class="h-full rounded-full transition-all ${((item.consumedPoEWatts || 0) > totalStackPoE) ? 'bg-rose-500' : 'bg-amber-400'}" 
                      style="width: ${Math.min(100, Math.round(((item.consumedPoEWatts || 0) / totalStackPoE) * 100))}%"
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
  populateTopologyQuickJump();

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

  // 2. Core/Aggregation -> Access Uplinks & Peer Cascades
  access.forEach(acc => {
    let target = null;
    const accLoc = FacilityStore.normalize(acc.closetName);

    if (acc.customUplinkTargetId) {
      target = nodes.find(n => n.instanceId === acc.customUplinkTargetId) || projectBOM.find(n => n.instanceId === acc.customUplinkTargetId);
    }
    if (!target) {
      // 1. Check if there is a core or aggregation switch in the same closet
      target = cores.find(c => FacilityStore.normalize(c.closetName) === accLoc);
    }
    if (!target) {
      // 2. Check if there is a local Wireless Bridge in the same closet/pole providing backhaul
      target = wireless.find(w => FacilityStore.normalize(w.closetName) === accLoc);
    }
    if (!target) {
      // 3. Fallback to primary core / gateway
      target = cores[0] || gateways[0];
    }

    if (target && target.instanceId !== acc.instanceId) {
      const isTargetRadio = target.role === "Wireless Bridge" || target.category === "wireless";
      const isTargetAccess = target.role === "Access";
      const isStacked = (acc.stackedUnits && acc.stackedUnits >= 2) || 
        (acc.stackedUnits !== 0 && acc.qty >= 2 && (acc.canStack || acc.role === "Access" || acc.role === "Aggregation"));
      const stackUnits = isStacked ? (acc.stackedUnits || acc.qty) : 1;
      const defaultMultiplier = isStacked ? Math.max(2, acc.customLinkMultiplier || 2) : (acc.customLinkMultiplier || 1);
      const multiplier = acc.customLinkMultiplier || defaultMultiplier;
      const speed = acc.customLinkSpeed || resolveNegotiatedSpeed(acc, target);
      const isLAG = (multiplier > 1 || isStacked) && !isTargetRadio;

      if (isTargetRadio) {
        // Reverse uplink pattern: Switch on pole uplinks through the P2P Radio Station
        const radioPowersFromSwitch = (target.powerSourceOverride === "poe_switch" || !target.powerSourceOverride);
        topologyLinks.push({
          id: `link-${acc.instanceId}-${target.instanceId}`,
          fromId: acc.instanceId,
          toId: target.instanceId,
          multiplier: 1,
          isLAG: false,
          speedLabel: `${speed} Wireless Uplink Handoff`,
          rawSpeed: speed,
          category: "wireless_handoff",
          isPoEDelivery: radioPowersFromSwitch
        });
      } else if (isTargetAccess) {
        // Access-to-Access daisy chain or ring cascade
        topologyLinks.push({
          id: `link-${target.instanceId}-${acc.instanceId}`,
          fromId: target.instanceId,
          toId: acc.instanceId,
          multiplier,
          isLAG,
          isCrossStack: isStacked,
          speedLabel: isLAG ? `${multiplier}x ${speed} Cascade LAG` : `${speed} Cascade Trunk`,
          rawSpeed: speed,
          category: "switch_trunk",
          isPoEDelivery: false
        });
      } else {
        // Standard Core/Gateway uplink
        const speedLabel = isStacked 
          ? `${multiplier}x ${speed} Cross-Stack LACP LAG (${stackUnits} Units)` 
          : (isLAG ? `${multiplier}x ${speed} LAG` : `${speed} Uplink`);

        topologyLinks.push({
          id: `link-${target.instanceId}-${acc.instanceId}`,
          fromId: target.instanceId,
          toId: acc.instanceId,
          multiplier,
          isLAG,
          isCrossStack: isStacked,
          speedLabel,
          rawSpeed: speed,
          category: "access",
          isPoEDelivery: false
        });
      }
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

  // 4. Wireless Bridge PtP / PtMP Links & Host Handoffs
  wireless.forEach(wb => {
    // A. Check for PtP paired radio link
    if (wb.linkPairId) {
      const partner = wireless.find(w => w.linkPairId === wb.linkPairId && w.instanceId !== wb.instanceId);
      if (partner && wb.instanceId < partner.instanceId) {
        topologyLinks.push({
          id: `link-rf-${wb.instanceId}-${partner.instanceId}`,
          fromId: wb.instanceId,
          toId: partner.instanceId,
          multiplier: 1,
          isLAG: false,
          speedLabel: wb.maxThroughput || "5.4 Gbps RF Bridge",
          rawSpeed: "2.5G",
          category: "wireless",
          isWireless: true,
          isPoEDelivery: false
        });
      }
    }

    // B. Check connection to host switch (data & PoE)
    let hostSwitch = null;
    if (wb.connectedHostSwitchId) {
      hostSwitch = nodes.find(n => n.instanceId === wb.connectedHostSwitchId);
    } else if (wb.uplinkTargetId) {
      hostSwitch = nodes.find(n => n.instanceId === wb.uplinkTargetId);
    } else {
      const wbLoc = FacilityStore.normalize(wb.closetName);
      hostSwitch = access.find(a => FacilityStore.normalize(a.closetName) === wbLoc) || cores.find(c => FacilityStore.normalize(c.closetName) === wbLoc);
    }

    if (hostSwitch && hostSwitch.instanceId !== wb.instanceId) {
      const alreadyLinked = topologyLinks.some(l => 
        (l.fromId === hostSwitch.instanceId && l.toId === wb.instanceId) ||
        (l.fromId === wb.instanceId && l.toId === hostSwitch.instanceId)
      );

      if (!alreadyLinked) {
        const isPoE = (wb.powerSourceOverride === "poe_switch" || wb.powerSource === "poe_switch" || (typeof PortEngine !== "undefined" && PortEngine.getDevicePowerSource(wb) === "poe_switch"));
        topologyLinks.push({
          id: `link-${hostSwitch.instanceId}-${wb.instanceId}`,
          fromId: hostSwitch.instanceId,
          toId: wb.instanceId,
          multiplier: 1,
          isLAG: false,
          speedLabel: isPoE ? "1G PoE Handoff" : "1G Data Handoff",
          rawSpeed: "1G",
          category: "wireless_handoff",
          isWireless: false,
          isPoEDelivery: isPoE
        });
      }
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

  // 7. Detect Resilient Ring Loops & Peer Links (e.g. Access switches connected in a loop)
  topologyLinks.forEach(link => {
    const nodeA = nodes.find(n => n.instanceId === link.fromId);
    const nodeB = nodes.find(n => n.instanceId === link.toId);
    // If two switches of Access tier are interconnected or loop back
    if (nodeA && nodeB && (nodeA.role === "Access" && nodeB.role === "Access")) {
      link.isRing = true;
      if (!link.speedLabel.includes("Ring")) {
        link.speedLabel = `${link.speedLabel} (Ring Trunk)`;
      }
    }
  });
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
    let cx1, cy1, cx2, cy2;
    let midX, midY;

    if (fromCluster === toCluster) {
      // Intra-cluster / Intra-rack patch connection:
      // Loop out from the right edge of both cards so the line curves gracefully outside the cluster
      x1 = fromBox.x + fromBox.w;
      y1 = fromBox.y + (fromBox.h / 2);
      x2 = toBox.x + toBox.w;
      y2 = toBox.y + (toBox.h / 2);

      const loopWidth = 45;
      cx1 = Math.max(x1, x2) + loopWidth;
      cy1 = y1;
      cx2 = Math.max(x1, x2) + loopWidth;
      cy2 = y2;

      midX = Math.max(x1, x2) + loopWidth + 10;
      midY = (y1 + y2) / 2;
    } else {
      // Inter-cluster orientation between boxes
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

      midX = (x1 + x2) / 2;
      midY = (y1 + y2) / 2;
    }

    // Color & Style by Speed and Role
    let strokeColor = "#38bdf8"; // Sky Blue: 10G / Default
    let strokeWidth = link.isLAG ? "3.5" : "2.5";
    let isDashed = false;

    if (link.isCrossStack) {
      strokeColor = "#818cf8"; // Indigo / Violet: Redundant Cross-Stack LACP LAG
      strokeWidth = "4.0";
    } else if (link.isRing) {
      strokeColor = "#f59e0b"; // Golden Amber: Resilient Ring Loop
      isDashed = true;
      strokeWidth = "3.5";
    } else if (link.category === "vms_stream") {
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
function selectTopologyRack(loc, e) {
  if (e) e.stopPropagation();
  selectedTopologyRackLoc = loc;
  selectedTopologyNodeId = null;
  selectedTopologyLinkId = null;
  toggleTopologyInspector(true);
  renderTopology();
  renderTopologyInspector();
}

function selectTopologyNode(instanceId, e) {
  if (e) e.stopPropagation();
  selectedTopologyNodeId = instanceId;
  selectedTopologyRackLoc = null;
  selectedTopologyLinkId = null;
  toggleTopologyInspector(true);
  renderTopology();
  renderTopologyInspector();
}

function selectTopologyLink(linkId, e) {
  if (e) e.stopPropagation();
  selectedTopologyLinkId = linkId;
  selectedTopologyNodeId = null;
  selectedTopologyRackLoc = null;
  toggleTopologyInspector(true);
  renderTopology();
  renderTopologyInspector();
}

function deselectTopologyNode() {
  selectedTopologyNodeId = null;
  selectedTopologyRackLoc = null;
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

  if (selectedTopologyRackLoc) {
    const loc = selectedTopologyRackLoc;
    const parsed = FacilityStore.parse(loc);
    const itemsInRack = projectBOM.filter(item => {
      if (item.parentInstanceId) return false;
      const itemLoc = FacilityStore.normalize(item.closetName || item.rackId);
      return itemLoc === loc;
    });

    let occupiedRU = 0;
    let totalWatts = 0;
    let totalPoEBudget = 0;
    let totalPoEConsumed = 0;

    itemsInRack.forEach(item => {
      const qty = parseInt(item.qty, 10) || 1;
      const ru = parseInt(item.rackUnits || item.ruHeight || (item.role === "Server" ? 2 : 1), 10) || 0;
      occupiedRU += ru * qty;

      const baseW = (parseFloat(item.baseWatts || item.powerConsumptionWatts || item.maxPowerWatts || 0)) * qty;
      totalWatts += baseW;

      if (item.poeBudget) {
        totalPoEBudget += (parseFloat(item.poeBudget) || 0) * qty;
      }
      if (item.consumedPoEWatts) {
        totalPoEConsumed += (parseFloat(item.consumedPoEWatts) || 0);
      }
    });

    const totalHeightU = parsed.heightU || (parsed.isDin ? 0 : 24);
    const ruPercent = totalHeightU > 0 ? Math.min(100, Math.round((occupiedRU / totalHeightU) * 100)) : 0;
    const btuPerHour = Math.round(totalWatts * 3.412142);

    const switchIds = itemsInRack.map(i => i.instanceId);
    const servedClients = projectBOM.filter(i => switchIds.includes(i.uplinkTargetId) && !itemsInRack.includes(i));
    const cameraCount = servedClients.filter(c => c.role === "Camera" || (c.category && c.category.includes("camera"))).reduce((sum, c) => sum + (parseInt(c.qty, 10) || 1), 0);
    const doorCount = servedClients.filter(d => d.role === "Access Control" || (d.category && d.category.includes("access"))).reduce((sum, d) => sum + (parseInt(d.qty, 10) || 1), 0);

    if (selectedNodeEl) selectedNodeEl.innerText = `${parsed.space} • ${parsed.enclosure}`;
    if (linkSpeedEl) linkSpeedEl.innerText = `${itemsInRack.length} Mounted Chassis`;
    if (powerSourceEl) powerSourceEl.innerText = `${Math.round(totalWatts)}W Total Load`;

    container.innerHTML = `
      <!-- Enclosure Header Card -->
      <div class="space-y-3 pb-3 border-b border-slate-800">
        <div class="flex items-start justify-between">
          <div>
            <span class="text-xs font-bold text-white block">${escapeHTML(parsed.space)}</span>
            <span class="text-[11px] font-mono text-indigo-300">${escapeHTML(parsed.enclosure)}</span>
          </div>
          <span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-indigo-500/40 bg-indigo-500/10 text-indigo-300">
            ${parsed.isDin ? 'NEMA / DIN Enclosure' : `${totalHeightU}U Rack Cabinet`}
          </span>
        </div>

        <!-- Action Buttons -->
        <div class="grid grid-cols-2 gap-2 pt-1">
          <button 
            onclick="openRackViewerFor('${escapeHTML(loc)}')"
            class="px-2.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/50 hover:border-indigo-400 text-indigo-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm group"
            title="Open this rack directly in the 2D Rack Elevation Tool"
          >
            <i data-lucide="server" class="w-3.5 h-3.5 group-hover:scale-110 transition-transform"></i>
            <span>Open Elevation</span>
          </button>
          <button 
            onclick="panClusterIntoView('${escapeHTML(loc)}')"
            class="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm"
            title="Center this enclosure cluster on the topology canvas"
          >
            <i data-lucide="focus" class="w-3.5 h-3.5"></i>
            <span>Center View</span>
          </button>
        </div>
      </div>

      <!-- Rack Space Occupancy (RU) -->
      ${!parsed.isDin && totalHeightU > 0 ? `
        <div class="space-y-2 pb-3 border-b border-slate-800">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
              <i data-lucide="layers" class="w-3.5 h-3.5"></i> Vertical Rack Space (RU)
            </span>
            <span class="font-mono text-[10px] text-white font-bold">
              ${occupiedRU}U / ${totalHeightU}U (${ruPercent}%)
            </span>
          </div>
          <div class="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800 p-0.5">
            <div 
              class="h-full rounded-full transition-all ${ruPercent > 90 ? 'bg-rose-500' : ruPercent > 70 ? 'bg-amber-400' : 'bg-sky-400'}" 
              style="width: ${ruPercent}%"
            ></div>
          </div>
          <div class="flex justify-between text-[9px] font-mono text-slate-400">
            <span>Available Space: <strong>${Math.max(0, totalHeightU - occupiedRU)}U Free</strong></span>
            <span>Standard 19" Mounting</span>
          </div>
        </div>
      ` : ''}

      <!-- Power & Thermal Telemetry -->
      <div class="space-y-2 pb-3 border-b border-slate-800">
        <span class="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
          <i data-lucide="zap" class="w-3.5 h-3.5"></i> Electrical & Thermal Load
        </span>
        <div class="space-y-1.5 text-xs bg-slate-950 p-2.5 rounded-xl border border-slate-850 font-mono">
          <div class="flex justify-between text-slate-400">
            <span>Enclosure Power Draw:</span>
            <span class="text-white font-bold">${Math.round(totalWatts)} W</span>
          </div>
          <div class="flex justify-between text-slate-400">
            <span>Heat Dissipation:</span>
            <span class="text-orange-400 font-bold">${btuPerHour.toLocaleString()} BTU/hr</span>
          </div>
          ${totalPoEBudget > 0 ? `
            <div class="flex justify-between text-slate-400 pt-1 border-t border-slate-900">
              <span>PoE Sourcing Budget:</span>
              <span class="text-amber-400 font-bold">${Math.round(totalPoEBudget)} W</span>
            </div>
            <div class="flex justify-between text-slate-400">
              <span>Delivered PoE Flow:</span>
              <span class="${totalPoEConsumed > totalPoEBudget ? 'text-rose-400 font-bold' : 'text-emerald-400'}">
                ${Math.round(totalPoEConsumed)} W (${Math.round((totalPoEConsumed / (totalPoEBudget || 1)) * 100)}%)
              </span>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- Installed Hardware Inventory List -->
      <div class="space-y-2 pb-3 border-b border-slate-800">
        <span class="text-[10px] font-bold uppercase tracking-wider text-indigo-300 flex items-center justify-between">
          <span>Mounted Chassis (${itemsInRack.length})</span>
          <span class="text-[9px] font-mono text-slate-500">Click to Inspect Chassis</span>
        </span>
        <div class="space-y-1.5 max-h-52 overflow-y-auto pr-1">
          ${itemsInRack.length === 0 ? `
            <div class="text-[11px] text-slate-500 py-3 text-center bg-slate-950 rounded-xl border border-slate-850">
              No equipment mounted in this rack yet.
            </div>
          ` : itemsInRack.map(item => `
            <div 
              onclick="selectTopologyNode('${item.instanceId}', event)"
              class="bg-slate-950 p-2 rounded-lg border border-slate-850 hover:border-indigo-500/60 hover:bg-slate-900 cursor-pointer flex items-center justify-between text-xs transition-colors group"
            >
              <div class="truncate max-w-[180px]">
                <span class="text-white block font-medium truncate group-hover:text-indigo-200">${escapeHTML(item.model)}</span>
                <span class="text-[10px] text-slate-400 font-mono">${escapeHTML(item.vendor || 'Generic')} &bull; ${item.rackUnits || 1}U &bull; ${escapeHTML(item.role)}</span>
              </div>
              <div class="text-right shrink-0">
                <span class="font-mono text-[10px] text-indigo-300 font-bold block">
                  ${item.ports ? `${item.ports}P` : (item.role === 'Server' ? 'SRV' : 'DEV')}
                </span>
                <span class="font-mono text-[9px] text-slate-500">
                  ${item.baseWatts || item.powerConsumptionWatts || 0}W
                </span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Served Downstream Edge Clients -->
      ${servedClients.length > 0 ? `
        <div class="space-y-2">
          <span class="text-[10px] font-bold uppercase tracking-wider text-teal-400 flex items-center justify-between">
            <span>Downstream Field Endpoints</span>
            <span class="font-mono text-[9px] text-slate-400">${servedClients.length} Total</span>
          </span>
          <div class="grid grid-cols-2 gap-2 text-xs font-mono">
            <div class="bg-slate-950 p-2 rounded-lg border border-slate-850 text-center">
              <span class="text-teal-400 font-bold block text-sm">${cameraCount}</span>
              <span class="text-[10px] text-slate-400">Cameras</span>
            </div>
            <div class="bg-slate-950 p-2 rounded-lg border border-slate-850 text-center">
              <span class="text-emerald-400 font-bold block text-sm">${doorCount}</span>
              <span class="text-[10px] text-slate-400">Access Doors</span>
            </div>
          </div>
        </div>
      ` : ''}
    `;

    if (typeof safeCreateIcons === "function") {
      safeCreateIcons(container);
    } else if (window.lucide) {
      lucide.createIcons();
    }
    return;
  } else if (selectedTopologyNodeId) {
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

    // Candidate uplink targets (Core, Agg, Peer Access switches, and Wireless Radios)
    const candidateTargets = projectBOM.filter(n => {
      if (n.instanceId === item.instanceId || n.parentInstanceId) return false;
      return n.role === "Core" || n.role === "Core & Agg" || n.role === "Aggregation" || n.role === "Gateways & WAN" || n.role === "Access" || n.role === "Wireless Bridge" || n.category === "wireless";
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
        if (!d.assignedAccessServerId && c.uplinkTargetId) {
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
      const serverSupportedModes = (typeof PortEngine !== "undefined") ? PortEngine.getSupportedPowerModes(item) : ["internal_psu", "dual_ac"];
      const serverPowerMode = (typeof PortEngine !== "undefined") ? PortEngine.getDevicePowerSource(item) : (item.dualPsu ? "dual_ac" : "internal_psu");

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
            <div class="pt-1 pb-1">
              <label class="text-[10px] text-slate-400 block mb-1 font-sans">Assigned Rack / Enclosure:</label>
              <select onchange="updateDeviceLocation('${item.instanceId}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-indigo-300 font-mono text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-500">
                ${FacilityStore.getLocationNames(false).map(l => `
                  <option value="${escapeHTML(l)}" ${FacilityStore.normalize(item.closetName || item.rackId) === l ? 'selected' : ''}>${escapeHTML(l)}</option>
                `).join('')}
              </select>
            </div>
            <div>Interfaces: <strong class="text-white">${item.ports || 2}x ${item.portSpeed || '10G'} High-Speed NICs</strong></div>
            ${item.usableStorageTb ? `<div>Video Storage: <strong class="text-emerald-400">${item.usableStorageTb} TB RAID Array</strong></div>` : ''}
          </div>
        </div>

        <!-- Electrical & Power Supply -->
        <div class="space-y-2 pb-3 border-b border-slate-800">
          <span class="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <i data-lucide="zap" class="w-3.5 h-3.5"></i> Electrical & Power Supply
          </span>
          <div class="space-y-2 bg-slate-950 p-2.5 rounded-xl border border-slate-850 text-xs">
            <div>
              <label class="text-[10px] text-slate-400 block mb-1">Power Architecture:</label>
              <select onchange="setDevicePowerSource('${item.instanceId}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-amber-300 font-mono text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-500">
                ${serverSupportedModes.map(m => {
                  const def = (typeof POWER_SOURCE_MODES !== "undefined" && POWER_SOURCE_MODES[m]) || { label: m };
                  return `<option value="${m}" ${serverPowerMode === m ? 'selected' : ''}>${def.label}</option>`;
                }).join('')}
              </select>
            </div>
            <div class="flex justify-between text-slate-400 text-xs font-mono pt-1">
              <span>Chassis Draw:</span>
              <span class="text-white font-bold">${item.baseWatts || item.powerWatts || 350} W</span>
            </div>
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

    const isRadio = item.role === "Wireless Bridge" || item.category === "wireless" || item.category === "ptp_60g" || item.topology === "PtP / PtMP";
    const isEdgeDevice = item.role === "Camera" || item.role === "Access Control" || (item.category && (item.category.includes("camera") || item.category.includes("access")));

    // If selected node is a WIRELESS RADIO / PTP BRIDGE
    if (isRadio) {
      const hostSwitch = item.uplinkTargetId ? projectBOM.find(s => s.instanceId === item.uplinkTargetId) : null;
      const currentPowerMode = (typeof PortEngine !== "undefined") ? PortEngine.getDevicePowerSource(item) : (item.powerSourceOverride || "poe_switch");
      const supportedModes = (typeof PortEngine !== "undefined") ? PortEngine.getSupportedPowerModes(item) : ["poe_switch", "poe_injector"];
      const peerRadios = projectBOM.filter(r => (r.category === "wireless" || r.role === "Wireless Bridge") && r.instanceId !== item.instanceId);

      container.innerHTML = `
        <!-- Wireless Overview Card -->
        <div class="space-y-2 pb-3 border-b border-slate-800">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-white truncate max-w-[200px]">${escapeHTML(item.model)}</span>
            <span class="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-purple-500/40 bg-purple-500/10 text-purple-300 shrink-0">
              Wireless RF
            </span>
          </div>
          <div class="text-[11px] text-slate-400 space-y-1 font-mono">
            <div>Throughput: <strong class="text-purple-300">${item.throughput || item.maxThroughput || '5.4 Gbps'}</strong></div>
            <div>Band: <strong class="text-white">${item.band || item.frequency || '60 GHz / 5 GHz Backup'}</strong></div>
            <div class="pt-1 pb-1">
              <label class="text-[10px] text-slate-400 block mb-1 font-sans">Assigned Location / Enclosure:</label>
              <select onchange="updateDeviceLocation('${item.instanceId}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-indigo-300 font-mono text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-500">
                ${FacilityStore.getLocationNames(false).map(l => `
                  <option value="${escapeHTML(l)}" ${FacilityStore.normalize(item.closetName || item.rackId) === l ? 'selected' : ''}>${escapeHTML(l)}</option>
                `).join('')}
              </select>
            </div>
          </div>
        </div>

        <!-- Power Delivery & Sourcing -->
        <div class="space-y-2 pb-3 border-b border-slate-800">
          <span class="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <i data-lucide="zap" class="w-3.5 h-3.5"></i> Power Delivery & Sourcing
          </span>
          <div class="space-y-2 bg-slate-950 p-2.5 rounded-xl border border-slate-850 text-xs">
            <div>
              <label class="text-[10px] text-slate-400 block mb-1">Power Sourcing Method:</label>
              <select onchange="setDevicePowerSource('${item.instanceId}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-amber-300 font-mono text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-500">
                ${supportedModes.map(m => {
                  const def = (typeof POWER_SOURCE_MODES !== "undefined" && POWER_SOURCE_MODES[m]) || { label: m };
                  return `<option value="${m}" ${currentPowerMode === m ? 'selected' : ''}>${def.label}</option>`;
                }).join('')}
              </select>
            </div>
            <div class="flex justify-between text-slate-400 text-xs font-mono pt-1">
              <span>Radio Power Consumption:</span>
              <span class="text-amber-400 font-bold">${item.powerWatts || item.maxPowerWatts || 24} W</span>
            </div>
          </div>
        </div>

        <!-- Reverse Uplink & Network Handoff -->
        <div class="space-y-2 pb-3 border-b border-slate-800">
          <span class="text-[10px] font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
            <i data-lucide="git-commit" class="w-3.5 h-3.5"></i> Host Switch Handoff & Uplink Role
          </span>
          <div class="space-y-2.5 bg-slate-950 p-2.5 rounded-xl border border-slate-850 text-xs">
            <div>
              <label class="text-[10px] text-slate-400 block mb-1">Connected Local Switch (e.g. Pole Switch):</label>
              <select onchange="setDeviceHostSwitch('${item.instanceId}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-500">
                <option value="">Unassigned</option>
                ${candidateTargets.filter(t => t.role === "Access" || t.role === "Core").map(sw => `
                  <option value="${sw.instanceId}" ${item.uplinkTargetId === sw.instanceId ? 'selected' : ''}>
                    ${sw.model} (${FacilityStore.normalize(sw.closetName)})
                  </option>
                `).join('')}
              </select>
            </div>

            <!-- Reverse Uplink Toggle -->
            <div 
              onclick="toggleRadioUplinkRole('${item.instanceId}', ${!item.isUplinkForSwitch})"
              class="flex items-start gap-2 p-2 rounded-xl border ${item.isUplinkForSwitch ? 'border-sky-500/50 bg-sky-500/10' : 'border-slate-800 bg-slate-900/60 opacity-60'} cursor-pointer hover:opacity-100 transition-all text-xs"
            >
              <input type="checkbox" ${item.isUplinkForSwitch ? 'checked' : ''} class="mt-0.5 rounded border-slate-700 bg-slate-900 text-sky-500 pointer-events-none" />
              <div>
                <span class="font-bold text-white block text-[11px]">Provides Network Uplink for Host Switch</span>
                <span class="text-[10px] text-slate-400 block">Switch routes all upstream traffic across this wireless backhaul</span>
              </div>
            </div>
          </div>
        </div>

        <!-- PtP Wireless Peer Link -->
        <div class="space-y-2">
          <span class="text-[10px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
            <i data-lucide="radio" class="w-3.5 h-3.5"></i> PtP Wireless Bridge Partner
          </span>
          <div class="space-y-2 bg-slate-950 p-2.5 rounded-xl border border-slate-850 text-xs">
            <div>
              <label class="text-[10px] text-slate-400 block mb-1">Target Radio (Opposite End of Link):</label>
              <select onchange="updateRadioPartner('${item.instanceId}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-purple-300 font-mono text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-500">
                <option value="">Auto-Pair or Standalone</option>
                ${peerRadios.map(p => `
                  <option value="${p.instanceId}" ${item.customUplinkTargetId === p.instanceId ? 'selected' : ''}>${p.model} (${FacilityStore.normalize(p.closetName)})</option>
                `).join('')}
              </select>
            </div>
          </div>
        </div>
      `;
      return;
    }

    // If selected node is an EDGE CLIENT (Camera, Access Reader, etc.)
    if (isEdgeDevice) {
      const hostSwitch = item.uplinkTargetId ? projectBOM.find(s => s.instanceId === item.uplinkTargetId) : null;
      const hostSwitchPorts = hostSwitch && typeof PortEngine !== "undefined" ? PortEngine.initSwitchPorts(hostSwitch) : [];
      const currentPowerMode = (typeof PortEngine !== "undefined") ? PortEngine.getDevicePowerSource(item) : (item.powerSourceOverride || "poe_switch");
      const supportedModes = (typeof PortEngine !== "undefined") ? PortEngine.getSupportedPowerModes(item) : ["poe_switch", "poe_injector"];
      const isCamera = item.role === "Camera" || (item.category && item.category.includes("camera"));

      container.innerHTML = `
        <!-- Device Overview Card -->
        <div class="space-y-2 pb-3 border-b border-slate-800">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-white truncate max-w-[200px]">${escapeHTML(item.model)}</span>
            <span class="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${getRoleBadgeStyle(item.role)} shrink-0">
              ${item.role}
            </span>
          </div>
          <div class="text-[11px] text-slate-400 space-y-1 font-mono">
            <div>Vendor: <strong class="text-slate-200">${escapeHTML(item.vendor || 'Generic')}</strong></div>
            <div class="pt-1 pb-1">
              <label class="text-[10px] text-slate-400 block mb-1 font-sans">Assigned Location / Enclosure:</label>
              <select onchange="updateDeviceLocation('${item.instanceId}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-indigo-300 font-mono text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-500">
                ${FacilityStore.getLocationNames(false).map(l => `
                  <option value="${escapeHTML(l)}" ${FacilityStore.normalize(item.closetName || item.rackId) === l ? 'selected' : ''}>${escapeHTML(l)}</option>
                `).join('')}
              </select>
            </div>
            <div>Hardware Interface: <strong class="text-white">1x 1G RJ-45 (100m Loop)</strong></div>
          </div>
        </div>

        <!-- Power Delivery & Sourcing -->
        <div class="space-y-2 pb-3 border-b border-slate-800">
          <span class="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <i data-lucide="zap" class="w-3.5 h-3.5"></i> Power Delivery & Sourcing
          </span>
          <div class="space-y-2 bg-slate-950 p-2.5 rounded-xl border border-slate-850 text-xs">
            <div>
              <label class="text-[10px] text-slate-400 block mb-1">Power Sourcing Method:</label>
              <select onchange="setDevicePowerSource('${item.instanceId}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-amber-300 font-mono text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-500">
                ${supportedModes.map(m => {
                  const def = (typeof POWER_SOURCE_MODES !== "undefined" && POWER_SOURCE_MODES[m]) || { label: m };
                  return `<option value="${m}" ${currentPowerMode === m ? 'selected' : ''}>${def.label}</option>`;
                }).join('')}
              </select>
            </div>

            <div class="flex justify-between items-center text-slate-400 text-xs font-mono pt-1">
              <span>Device Power Draw:</span>
              <span class="text-amber-400 font-bold">${item.powerConsumptionWatts || item.maxPowerWatts || 15} W</span>
            </div>

            ${currentPowerMode !== 'poe_switch' ? `
              <div class="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-300 flex items-start gap-1.5">
                <i data-lucide="info" class="w-3.5 h-3.5 shrink-0 mt-0.5"></i>
                <span>External power supply active. Switch port carries data only with 0W PoE load on switch budget.</span>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Network Switch & Port Mapping -->
        <div class="space-y-2 pb-3 border-b border-slate-800">
          <span class="text-[10px] font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
            <i data-lucide="git-commit" class="w-3.5 h-3.5"></i> Host Switch & Port Assignment
          </span>
          <div class="space-y-2 bg-slate-950 p-2.5 rounded-xl border border-slate-850 text-xs">
            <div>
              <label class="text-[10px] text-slate-400 block mb-1">Connected Host Switch:</label>
              <select onchange="setDeviceHostSwitch('${item.instanceId}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-500">
                <option value="">Unassigned</option>
                ${candidateTargets.filter(t => t.role === "Access" || t.role === "Core" || t.role === "Core & Agg").map(sw => `
                  <option value="${sw.instanceId}" ${item.uplinkTargetId === sw.instanceId ? 'selected' : ''}>
                    ${sw.model} (${FacilityStore.normalize(sw.closetName)})
                  </option>
                `).join('')}
              </select>
            </div>

            ${hostSwitch ? `
              <div>
                <label class="text-[10px] text-slate-400 block mb-1">Assigned Switch Port:</label>
                <select onchange="setDeviceSwitchPort('${item.instanceId}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-sky-300 font-mono text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-brand-500">
                  ${hostSwitchPorts.map(p => `
                    <option value="${p.portNumber}" ${(item.assignedSwitchPort === p.portNumber || p.connectedDeviceId === item.instanceId) ? 'selected' : ''}>
                      ${p.label} &bull; ${p.speed} ${p.poeStandard ? `(${p.poeStandard.toUpperCase()})` : ''} ${p.connectedDeviceId && p.connectedDeviceId !== item.instanceId ? `[In Use: ${p.connectedDeviceModel}]` : ''}
                    </option>
                  `).join('')}
                </select>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Application Specific Routing (Camera / Access) -->
        ${isCamera ? `
          <div class="space-y-2">
            <span class="text-[10px] font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
              <i data-lucide="video" class="w-3.5 h-3.5"></i> VMS Video Stream Routing
            </span>
            <div class="space-y-2 bg-slate-950 p-2.5 rounded-xl border border-slate-850 text-xs font-mono">
              <div class="flex justify-between">
                <span class="text-slate-400">Stream Bitrate:</span>
                <span class="text-teal-400 font-bold">${item.streamBitrateMbps || 4.0} Mbps Continuous</span>
              </div>
              <div>
                <label class="text-[10px] text-slate-400 block mb-1">Assigned Recording Server:</label>
                <select onchange="item.assignedRecordingServerId = this.value || null; FacilityStore.notifyWorkspaceChange(); renderTopology(); renderTopologyInspector();" class="w-full bg-slate-900 border border-slate-700 text-teal-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-500">
                  <option value="">Auto-Detect Primary VMS</option>
                  ${candidateServers.map(s => `
                    <option value="${s.instanceId}" ${item.assignedRecordingServerId === s.instanceId ? 'selected' : ''}>${s.model} (${FacilityStore.normalize(s.closetName)})</option>
                  `).join('')}
                </select>
              </div>
            </div>
          </div>
        ` : `
          <div class="space-y-2">
            <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <i data-lucide="shield" class="w-3.5 h-3.5"></i> Access Control Engine Routing
            </span>
            <div class="space-y-2 bg-slate-950 p-2.5 rounded-xl border border-slate-850 text-xs font-mono">
              <div class="flex justify-between">
                <span class="text-slate-400">Door Capacity:</span>
                <span class="text-emerald-400 font-bold">${item.doorCapacity || 2} Doors Managed</span>
              </div>
              <div>
                <label class="text-[10px] text-slate-400 block mb-1">Assigned Access Engine Server:</label>
                <select onchange="item.assignedAccessServerId = this.value || null; FacilityStore.notifyWorkspaceChange(); renderTopology(); renderTopologyInspector();" class="w-full bg-slate-900 border border-slate-700 text-emerald-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-500">
                  <option value="">Auto-Detect Primary Host</option>
                  ${candidateServers.map(s => `
                    <option value="${s.instanceId}" ${item.assignedAccessServerId === s.instanceId ? 'selected' : ''}>${s.model} (${FacilityStore.normalize(s.closetName)})</option>
                  `).join('')}
                </select>
              </div>
            </div>
          </div>
        `}
      `;
      return;
    }

    // Default Switch Inspector Card
    const switchPorts = typeof PortEngine !== "undefined" ? PortEngine.initSwitchPorts(item) : [];
    const portSummary = typeof PortEngine !== "undefined" ? PortEngine.getPortSummary(item) : null;
    const supportedModes = typeof PortEngine !== "undefined" ? PortEngine.getSupportedPowerModes(item) : ["internal_psu"];
    const currentPowerMode = typeof PortEngine !== "undefined" ? PortEngine.getDevicePowerSource(item) : (item.powerSource || "internal_psu");

    const isStacked = (item.stackedUnits && item.stackedUnits >= 2) || 
      (item.stackedUnits !== 0 && item.qty >= 2 && (item.canStack || item.role === "Access" || item.role === "Aggregation"));
    const stackUnits = isStacked ? (item.stackedUnits || item.qty) : 1;
    const basePortsPerUnit = item.ports || 24;
    const totalStackPorts = basePortsPerUnit * stackUnits;
    const totalStackPoE = (item.poeBudget || 0) * stackUnits;
    const totalStackBaseWatts = (item.baseWatts || 0) * stackUnits;

    const copperPorts = switchPorts.filter(p => p.connector === "RJ-45" && !p.isUplink);
    const opticalCages = switchPorts.filter(p => p.connector !== "RJ-45" || p.isUplink);
    const isAllOptical = copperPorts.length === 0 && opticalCages.length > 0;

    container.innerHTML = `
      <!-- Node Overview Card -->
      <div class="space-y-2 pb-3 border-b border-slate-800">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-white truncate max-w-[200px]">${escapeHTML(item.model)}</span>
          <div class="flex items-center gap-1 shrink-0">
            ${isStacked ? `
              <span class="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border border-indigo-500/50 bg-indigo-500/20 text-indigo-300">
                Stack (${stackUnits}U)
              </span>
            ` : ''}
            <span class="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${getRoleBadgeStyle(item.role)}">
              ${item.role}
            </span>
          </div>
        </div>
        <div class="text-[11px] text-slate-400 space-y-1 font-mono">
          <div>Vendor: <strong class="text-slate-200">${escapeHTML(item.vendor || 'Generic')}</strong></div>
          <div>Architecture: <strong class="${isStacked ? 'text-indigo-300 font-semibold' : 'text-slate-300'}">${isStacked ? `Single Logical Stack (${stackUnits}x Member Units &bull; ${item.rackUnits * stackUnits}U)` : 'Standalone Chassis'}</strong></div>
          <div class="pt-1 pb-1">
            <label class="text-[10px] text-slate-400 block mb-1 font-sans">Assigned Rack / Enclosure:</label>
            <select onchange="updateDeviceLocation('${item.instanceId}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-indigo-300 font-mono text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-500">
              ${FacilityStore.getLocationNames(false).map(l => `
                <option value="${escapeHTML(l)}" ${FacilityStore.normalize(item.closetName || item.rackId) === l ? 'selected' : ''}>${escapeHTML(l)}</option>
              `).join('')}
            </select>
          </div>
          <div>Interface: <strong class="text-white">${totalStackPorts} Ports ${isStacked ? `(${stackUnits}x ${basePortsPerUnit}P Stack)` : ''} (${escapeHTML(item.portSpeed || '1G/10G')})</strong></div>
        </div>
      </div>

      <!-- Chassis Stacking & Virtual Resiliency -->
      ${(item.canStack || item.role === "Access") ? `
        <div class="space-y-2 pb-3 border-b border-slate-800">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
              <i data-lucide="layers" class="w-3.5 h-3.5"></i> Chassis Stacking & Resiliency
            </span>
            <span class="text-[9px] font-mono ${isStacked ? 'text-indigo-400 font-bold bg-indigo-500/10 border border-indigo-500/30 px-1.5 py-0.5 rounded' : 'text-slate-500'}">
              ${isStacked ? `${stackUnits}-Switch Stack` : 'Standalone'}
            </span>
          </div>
          <div class="space-y-2 bg-slate-950 p-2.5 rounded-xl border border-slate-850 text-xs">
            <div>
              <label class="text-[10px] text-slate-400 block mb-1 font-sans">Stack Members (Treated as 1 Single Stack):</label>
              <select onchange="updateSwitchStackFromTopology('${item.instanceId}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-indigo-300 font-mono text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-500">
                <option value="0" ${!isStacked ? 'selected' : ''}>0 (Standalone - 1 Unit)</option>
                <option value="2" ${stackUnits === 2 ? 'selected' : ''}>2 Units (Dual-Chassis Stack - Recommended)</option>
                <option value="3" ${stackUnits === 3 ? 'selected' : ''}>3 Units (3-Chassis Stack)</option>
                <option value="4" ${stackUnits === 4 ? 'selected' : ''}>4 Units (4-Chassis Stack)</option>
              </select>
            </div>
            <div class="text-[10px] font-mono text-slate-400 space-y-1 pt-1 border-t border-slate-900">
              <div class="flex justify-between">
                <span>Hardware Stacking Cables:</span>
                <span class="text-white font-bold">${isStacked ? `${stackUnits}x Dedicated Cables (In BOM)` : 'None'}</span>
              </div>
              <div class="flex justify-between">
                <span>Uplink Architecture:</span>
                <span class="text-indigo-300 font-semibold">${isStacked ? 'Cross-Stack LACP LAG (Failover Protected)' : 'Standard Single Trunk'}</span>
              </div>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- Power & PoE Telemetry -->
      <div class="space-y-2 pb-3 border-b border-slate-800">
        <span class="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
          <i data-lucide="zap" class="w-3.5 h-3.5"></i> Electrical & PoE Telemetry
        </span>
        <div class="space-y-2 text-xs bg-slate-950 p-2.5 rounded-xl border border-slate-850">
          <div>
            <label class="text-[10px] text-slate-400 block mb-1 font-sans">Chassis Power Mode:</label>
            <select onchange="setDevicePowerSource('${item.instanceId}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-amber-300 font-mono text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-500">
              ${supportedModes.map(m => {
                const def = (typeof POWER_SOURCE_MODES !== "undefined" && POWER_SOURCE_MODES[m]) || { label: m };
                return `<option value="${m}" ${currentPowerMode === m ? 'selected' : ''}>${def.label}</option>`;
              }).join('')}
            </select>
          </div>
          <div class="flex justify-between text-slate-400">
            <span>Power Source:</span>
            <span class="text-amber-300 font-bold font-mono">${getPowerSourceLabel(item)}${isStacked ? ` (${stackUnits}x PSUs)` : ''}</span>
          </div>
          <div class="flex justify-between text-slate-400">
            <span>Chassis Base Draw:</span>
            <span class="font-mono text-white">${totalStackBaseWatts} W ${isStacked ? `(${stackUnits}x ${item.baseWatts || 0}W Chassis)` : ''}</span>
          </div>
          ${totalStackPoE > 0 ? `
            <div class="flex justify-between text-slate-400">
              <span>Total PoE Budget:</span>
              <span class="font-mono text-amber-400 font-bold">${totalStackPoE} W ${isStacked ? `(${stackUnits}x ${item.poeBudget}W PSUs)` : ''}</span>
            </div>
            <div class="flex justify-between text-slate-400">
              <span>Connected Load:</span>
              <span class="font-mono ${((item.consumedPoEWatts || 0) > totalStackPoE) ? 'text-rose-400 font-bold' : 'text-emerald-400'}">
                ${item.consumedPoEWatts || 0} W (${Math.round(((item.consumedPoEWatts || 0) / (totalStackPoE || 1)) * 100)}%)
              </span>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- Physical Port Matrix (Faceplate Status Grid) -->
      ${switchPorts.length > 0 ? `
        <div class="space-y-2 pb-3 border-b border-slate-800">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
              <i data-lucide="layout-grid" class="w-3.5 h-3.5"></i> Physical Port Matrix
            </span>
            <span class="font-mono text-[9px] text-slate-400">
              ${portSummary ? `${portSummary.used}/${portSummary.total} Used` : ''}
            </span>
          </div>

          <div class="p-2.5 bg-slate-950 rounded-xl border border-slate-850 space-y-2.5">
            ${isAllOptical ? `
              <!-- High-Density All-Optical Spine Matrix -->
              <div class="space-y-2">
                ${Array.from({ length: stackUnits }, (_, uIdx) => {
                  const u = uIdx + 1;
                  const unitCages = opticalCages.filter(p => (p.unitIndex || 1) === u);
                  return `
                    <div class="space-y-1.5 ${u > 1 ? 'pt-2 border-t border-slate-900' : ''}">
                      <div class="flex items-center justify-between text-[9px] font-mono text-cyan-400 uppercase font-semibold">
                        <span>${isStacked ? `Unit ${u} Optical Cages:` : 'QSFP/SFP Optical Transceiver Cages:'}</span>
                        <span class="text-slate-400">${unitCages.length}x ${unitCages[0]?.speed || '100G'}</span>
                      </div>
                      <div class="grid ${unitCages.length > 16 ? 'grid-cols-8' : (unitCages.length > 8 ? 'grid-cols-6' : 'grid-cols-4')} gap-1">
                        ${unitCages.map(p => {
                          const isConnected = !!p.connectedDeviceId;
                          let bg = "bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700";
                          if (isConnected) bg = "bg-cyan-500/20 border-cyan-500 text-cyan-300";
                          return `
                            <div 
                              class="h-7 rounded border ${bg} flex flex-col items-center justify-center font-mono text-[8px] font-bold cursor-pointer transition-all hover:scale-105"
                              title="${p.label}: ${p.connectedDeviceModel || 'Free / Unpopulated Cage'} (${p.speed})"
                              onclick="inspectSwitchPort('${item.instanceId}', ${p.portNumber})"
                            >
                              <span>${p.shortLabel || `Q${p.portNumber}`}</span>
                              <span class="text-[7px] font-normal opacity-70">${p.speed}</span>
                            </div>
                          `;
                        }).join('')}
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            ` : `
              <!-- Copper Access Ports Grid (per stack unit) -->
              <div class="space-y-2.5">
                ${Array.from({ length: stackUnits }, (_, uIdx) => {
                  const u = uIdx + 1;
                  const unitCopper = copperPorts.filter(p => (p.unitIndex || 1) === u);
                  const unitOptical = opticalCages.filter(p => (p.unitIndex || 1) === u);
                  return `
                    <div class="space-y-1.5 ${u > 1 ? 'pt-2.5 border-t border-slate-900' : ''}">
                      <div class="flex items-center justify-between text-[10px] font-mono font-bold ${u === 1 ? 'text-sky-400' : 'text-indigo-400'}">
                        <span class="flex items-center gap-1">
                          <i data-lucide="layers" class="w-3 h-3"></i>
                          ${isStacked ? `Unit ${u} (${u === 1 ? 'Master Chassis' : 'Member Chassis'} &bull; ${unitCopper.length} Ports)` : 'Access Ports Faceplate'}
                        </span>
                        <span class="text-slate-500 font-normal text-[9px]">${isStacked ? `Member ${u} Ports` : `${unitCopper.length}P`}</span>
                      </div>

                      <div class="grid grid-cols-12 gap-1">
                        ${unitCopper.map(p => {
                          const isPoEActive = (p.poeOutputWatts || 0) > 0;
                          const isUplink = p.isUplink || p.role === "uplink";
                          const isDataOnly = p.connectedDeviceId && !isPoEActive;
                          let bg = "bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700";
                          if (isUplink) bg = "bg-sky-500/20 border-sky-500/50 text-sky-300";
                          else if (isPoEActive) bg = "bg-emerald-500/20 border-emerald-500/50 text-emerald-300";
                          else if (isDataOnly) bg = "bg-amber-500/20 border-amber-500/50 text-amber-300";

                          return `
                            <div 
                              class="h-6 rounded border ${bg} flex items-center justify-center font-mono text-[9px] font-bold cursor-pointer transition-all hover:scale-105" 
                              title="${p.label}: ${p.connectedDeviceModel || 'Free'} ${isPoEActive ? `(${p.poeOutputWatts}W)` : ''}"
                              onclick="inspectSwitchPort('${item.instanceId}', ${p.portNumber})"
                            >
                              ${p.unitPortNumber || p.portNumber}
                            </div>
                          `;
                        }).join('')}
                      </div>

                      ${unitOptical.length > 0 ? `
                        <div class="pt-1.5 border-t border-slate-900 space-y-1">
                          <div class="flex items-center justify-between text-[9px] font-mono text-slate-400 uppercase">
                            <span>${isStacked ? `Unit ${u} Uplink Cages:` : 'Optical SFP/QSFP Cages:'}</span>
                            <span class="text-sky-400 font-bold">${unitOptical.length} Cages</span>
                          </div>
                          <div class="grid grid-cols-4 gap-1.5">
                            ${unitOptical.map((p, idx) => {
                              const isConnected = !!p.connectedDeviceId;
                              const bg = isConnected ? "bg-sky-500/20 border-sky-500 text-sky-300" : "bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700";
                              return `
                                <div 
                                  class="px-1.5 py-1 rounded border ${bg} font-mono text-[9px] font-bold cursor-pointer flex items-center justify-between transition-all hover:border-slate-600"
                                  title="${p.label}: ${p.connectedDeviceModel || 'Free'} (${p.speed})"
                                  onclick="inspectSwitchPort('${item.instanceId}', ${p.portNumber})"
                                >
                                  <span>${p.shortLabel || `U${idx + 1}`}</span>
                                  <span class="text-[8px] text-sky-400 font-normal">${p.speed}</span>
                                </div>
                              `;
                            }).join('')}
                          </div>
                        </div>
                      ` : ''}
                    </div>
                  `;
                }).join('')}
              </div>
            `}

            <!-- Legend strip -->
            <div class="flex flex-wrap items-center justify-between gap-1.5 text-[9px] font-mono text-slate-400 pt-2 border-t border-slate-900">
              <span class="flex items-center gap-1"><span class="w-2 h-2 rounded bg-emerald-500 inline-block"></span> PoE Active</span>
              <span class="flex items-center gap-1"><span class="w-2 h-2 rounded bg-sky-500 inline-block"></span> Uplink/LAG</span>
              <span class="flex items-center gap-1"><span class="w-2 h-2 rounded bg-amber-500 inline-block"></span> Data Only</span>
              <span class="flex items-center gap-1"><span class="w-2 h-2 rounded bg-slate-800 inline-block"></span> Free</span>
            </div>
          </div>
        </div>
      ` : ''}

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
          <span class="text-[9px] font-mono text-slate-500">Click to Inspect</span>
        </span>
        <div class="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          ${children.length === 0 ? `
            <div class="text-[11px] text-slate-500 py-3 text-center bg-slate-950 rounded-xl border border-slate-850">
              No field devices attached to this switch in quote.
            </div>
          ` : children.map(ch => {
            const chPowerBadge = (typeof PortEngine !== "undefined") ? PortEngine.getPowerBadge(ch) : { label: "PoE", badgeLabel: "PoE", isExternal: false };
            return `
              <div 
                onclick="selectTopologyNode('${ch.instanceId}', event)"
                class="bg-slate-950 p-2 rounded-lg border border-slate-850 hover:border-slate-700 cursor-pointer flex items-center justify-between text-xs transition-colors"
              >
                <div class="truncate max-w-[170px]">
                  <span class="text-white block font-medium truncate">${escapeHTML(ch.model)}</span>
                  <span class="text-[10px] text-slate-400 font-mono">${ch.role || 'Edge Device'} &bull; ${ch.qty || 1}x &bull; Port ${ch.assignedSwitchPort || 'Auto'}</span>
                </div>
                <div class="text-right shrink-0">
                  <span class="font-mono text-[10px] ${chPowerBadge.isExternal ? 'text-amber-400' : 'text-emerald-400'} font-bold block">
                    ${chPowerBadge.badgeLabel}
                  </span>
                  <span class="font-mono text-[9px] text-slate-500">
                    ${Math.round((ch.powerConsumptionWatts || ch.maxPowerWatts || 15) * (ch.qty || 1))}W
                  </span>
                </div>
              </div>
            `;
          }).join('')}
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
  if (typeof PortEngine !== "undefined") {
    const badge = PortEngine.getPowerBadge(item);
    if (badge && badge.label) {
      if (item.dualPsu && badge.mode === "dedicated_ac") return "Dual Hot-Swap AC";
      return badge.label;
    }
  }
  if (item.dualPsu) return "Dual Hot-Swap AC";
  if (item.powerSourceOverride) return item.powerSourceOverride;
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
// Drag & Drop & Viewport Movement Engine
// -----------------------------------------------------------
function handleClusterMouseDown(e, clusterEl, loc) {
  if (!isTopologyModalVisible()) return;
  if (e.target.closest("button") || e.target.closest("select") || e.target.closest("input")) {
    return;
  }

  isCanvasDragging = true;
  dragStartPos = { x: e.clientX, y: e.clientY };
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
  if (!isTopologyModalVisible()) return;

  const viewport = document.getElementById("topologyCanvasViewport");
  if (!viewport) return;

  // Mode 1: Viewport Canvas Panning
  if (isViewportPanning) {
    const dx = e.clientX - panStart.x;
    const dy = e.clientY - panStart.y;
    viewport.scrollLeft = panStart.scrollLeft - dx;
    viewport.scrollTop = panStart.scrollTop - dy;
    return;
  }

  // Mode 2: Dragging a location cluster
  if (isCanvasDragging && draggedTopologyNode) {
    const rect = viewport.getBoundingClientRect();
    const newX = Math.max(30, ((e.clientX - rect.left + viewport.scrollLeft) - topoDragOffset.x) / topologyZoomLevel);
    const newY = Math.max(30, ((e.clientY - rect.top + viewport.scrollTop) - topoDragOffset.y) / topologyZoomLevel);

    draggedTopologyNode.el.style.left = `${Math.round(newX)}px`;
    draggedTopologyNode.el.style.top = `${Math.round(newY)}px`;

    renderTopologyLinks();
  }
}

function handleTopologyMouseUp(e) {
  const viewport = document.getElementById("topologyCanvasViewport");
  if (isViewportPanning && viewport) {
    isViewportPanning = false;
    viewport.style.cursor = "grab";
  }

  if (isCanvasDragging && draggedTopologyNode) {
    isCanvasDragging = false;
    saveTopologyPosition(draggedTopologyNode.loc, draggedTopologyNode.el.offsetLeft, draggedTopologyNode.el.offsetTop);
    
    // If movement was minimal (< 5px), treat as a click to select the rack
    if (e && Math.hypot(e.clientX - dragStartPos.x, e.clientY - dragStartPos.y) < 5) {
      selectTopologyRack(draggedTopologyNode.loc);
    }
    draggedTopologyNode = null;
  }
}

// -----------------------------------------------------------
// Position State & Auto-Arrange Hierarchy
// -----------------------------------------------------------
function autoArrangeTopologyHierarchy(layoutMode = null) {
  if (typeof projectBOM === "undefined") return;

  if (!layoutMode) {
    const modeSelect = document.getElementById("topologyLayoutMode");
    layoutMode = modeSelect ? modeSelect.value : "tree";
  }

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

  const allLocs = Object.keys(locMap);
  if (allLocs.length === 0) return;

  if (layoutMode === "hub_spoke") {
    // Hub and Spoke Star Pattern
    const hubLoc = allLocs.find(loc => 
      locMap[loc].some(i => i.role === "Core" || i.role === "Core & Agg" || i.role === "Gateways & WAN")
    ) || allLocs[0];

    const spokes = allLocs.filter(l => l !== hubLoc);
    const centerX = 800;
    const centerY = 480;
    positions[hubLoc] = { x: centerX - 140, y: centerY - 80 };

    const spokeCount = spokes.length;
    const radiusX = Math.max(460, spokeCount * 80);
    const radiusY = Math.max(300, spokeCount * 55);

    spokes.forEach((loc, idx) => {
      const theta = (2 * Math.PI * idx) / (spokeCount || 1) - (Math.PI / 2);
      positions[loc] = {
        x: Math.round(centerX + radiusX * Math.cos(theta) - 140),
        y: Math.round(centerY + radiusY * Math.sin(theta) - 80)
      };
    });
  } else if (layoutMode === "ring") {
    // Resilient Circular / Perimeter Ring Loop
    const totalCount = allLocs.length;
    const centerX = 800;
    const centerY = 500;
    const radiusX = Math.max(500, totalCount * 95);
    const radiusY = Math.max(350, totalCount * 65);

    allLocs.forEach((loc, idx) => {
      const theta = (2 * Math.PI * idx) / totalCount - (Math.PI / 2);
      positions[loc] = {
        x: Math.round(centerX + radiusX * Math.cos(theta) - 140),
        y: Math.round(centerY + radiusY * Math.sin(theta) - 80)
      };
    });
  } else {
    // Default Tiered Tree Hierarchy
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
  }

  // Save to persistence
  try {
    const projKey = FacilityStore.getProjectId();
    localStorage.setItem(`netselect_topo_pos_${projKey}`, JSON.stringify(positions));
  } catch (e) {}

  renderTopology();
  renderTopologyInspector();
  if (typeof showToast === "function") {
    const label = layoutMode === "hub_spoke" ? "Hub & Spoke Star" : (layoutMode === "ring" ? "Resilient Ring Loop" : "Tiered Tree Hierarchy");
    showToast(`Arranged topology into clean ${label}.`);
  }
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

function setDevicePowerSource(deviceInstanceId, newPowerSource) {
  const item = projectBOM.find(i => i.instanceId === deviceInstanceId);
  if (!item) return;
  if (typeof PortEngine !== "undefined") {
    PortEngine.setPowerSource(item, newPowerSource);
  } else {
    item.powerSourceOverride = newPowerSource;
  }
  FacilityStore.notifyWorkspaceChange();
  renderTopology();
  renderTopologyInspector();
  if (typeof showToast === "function") {
    const modeDef = (typeof POWER_SOURCE_MODES !== "undefined" && POWER_SOURCE_MODES[newPowerSource]) || { label: newPowerSource };
    showToast(`Set ${item.model} power to ${modeDef.label}`);
  }
}

function setDeviceHostSwitch(deviceInstanceId, newSwitchId) {
  const item = projectBOM.find(i => i.instanceId === deviceInstanceId);
  if (!item) return;
  const oldSwitchId = item.uplinkTargetId;
  item.uplinkTargetId = newSwitchId || null;
  if (typeof PortEngine !== "undefined") {
    if (oldSwitchId) {
      const oldSw = projectBOM.find(i => i.instanceId === oldSwitchId);
      if (oldSw) PortEngine.disconnectPort(oldSw, item.assignedSwitchPort);
    }
    if (newSwitchId) {
      const newSw = projectBOM.find(i => i.instanceId === newSwitchId);
      if (newSw) PortEngine.allocatePort(newSw, item);
    }
  }
  FacilityStore.notifyWorkspaceChange();
  renderTopology();
  renderTopologyInspector();
  if (typeof showToast === "function") showToast(`Reassigned ${item.model} to new host switch`);
}

function setDeviceSwitchPort(deviceInstanceId, newPortNumber) {
  const item = projectBOM.find(i => i.instanceId === deviceInstanceId);
  if (!item || !item.uplinkTargetId) return;
  const sw = projectBOM.find(i => i.instanceId === item.uplinkTargetId);
  if (!sw) return;
  if (typeof PortEngine !== "undefined") {
    PortEngine.connect(sw, parseInt(newPortNumber, 10), item, 1);
  } else {
    item.assignedSwitchPort = parseInt(newPortNumber, 10);
  }
  FacilityStore.notifyWorkspaceChange();
  renderTopology();
  renderTopologyInspector();
  if (typeof showToast === "function") showToast(`Assigned ${item.model} to Port ${newPortNumber}`);
}

function toggleRadioUplinkRole(radioInstanceId, isUplink) {
  const radio = projectBOM.find(i => i.instanceId === radioInstanceId);
  if (!radio) return;
  radio.isUplinkForSwitch = isUplink;
  if (radio.uplinkTargetId) {
    const sw = projectBOM.find(i => i.instanceId === radio.uplinkTargetId);
    if (sw) {
      if (isUplink) {
        sw.customUplinkTargetId = radio.instanceId;
      } else if (sw.customUplinkTargetId === radio.instanceId) {
        sw.customUplinkTargetId = null;
      }
    }
  }
  FacilityStore.notifyWorkspaceChange();
  renderTopology();
  renderTopologyInspector();
  if (typeof showToast === "function") {
    showToast(isUplink ? `Set ${radio.model} as uplink for host switch` : `Cleared radio uplink role`);
  }
}

function updateRadioPartner(radioInstanceId, partnerInstanceId) {
  const radio = projectBOM.find(i => i.instanceId === radioInstanceId);
  if (radio) {
    radio.customUplinkTargetId = partnerInstanceId || null;
    FacilityStore.notifyWorkspaceChange();
    renderTopology();
    renderTopologyInspector();
  }
}

function inspectSwitchPort(switchInstanceId, portNum) {
  const sw = projectBOM.find(i => i.instanceId === switchInstanceId);
  if (!sw || typeof PortEngine === "undefined") return;
  const ports = PortEngine.initSwitchPorts(sw);
  const port = ports.find(p => p.portNumber === parseInt(portNum, 10));
  if (!port) return;

  if (port.connectedDeviceId) {
    selectTopologyNode(port.connectedDeviceId);
  } else {
    if (typeof showToast === "function") {
      showToast(`${port.label} (${port.speed}) is free.`);
    }
  }
}

// -----------------------------------------------------------
// Rack Enclosure & Navigation Helpers
// -----------------------------------------------------------
function updateDeviceLocation(instanceId, newLoc) {
  const item = projectBOM.find(i => i.instanceId === instanceId);
  if (!item || !newLoc) return;
  const parsed = FacilityStore.parse(newLoc);
  item.closetName = newLoc;
  item.rackId = parsed.enclosure || newLoc;
  if (parsed.space) item.spaceName = parsed.space;

  FacilityStore.notifyWorkspaceChange();
  renderTopology();
  renderTopologyInspector();
  panNodeIntoView(instanceId);
  if (typeof showToast === "function") {
    showToast(`Moved ${item.model} to ${newLoc}`);
  }
}

function openRackViewerFor(loc) {
  const facModal = document.getElementById("facilityModal");
  if (facModal && !facModal.classList.contains("hidden")) {
    facModal.classList.add("hidden");
    if (typeof facilityActiveForm !== "undefined") facilityActiveForm = null;
  }
  if (typeof toggleTopologyModal === "function" && isTopologyModalVisible()) {
    toggleTopologyModal();
  }
  if (typeof switchActiveRackElevation === "function") {
    switchActiveRackElevation(loc);
  }
  const rackModal = document.getElementById("rackModal");
  if (rackModal && rackModal.classList.contains("hidden")) {
    if (typeof toggleRackModal === "function") {
      toggleRackModal();
    } else {
      rackModal.classList.remove("hidden");
    }
  }
  if (typeof renderRackVisualizer === "function") {
    renderRackVisualizer();
  }
}

// -----------------------------------------------------------
// Searchable Quick Navigator (Combobox & Filter Engine)
// -----------------------------------------------------------
let topologySearchActiveIndex = -1;

function getTopologySearchItems() {
  const items = [];
  const groups = {};

  if (typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) {
    projectBOM.forEach(item => {
      if (item.parentInstanceId) return;
      if (item.role === "Structured Cabling" || item.role === "Optics & DAC") return;
      if (item.role === "Mgmt License" || item.role === "Security License" || item.role === "Feature License") return;
      if (item.role === "Accessory") return;

      const loc = FacilityStore.normalize(item.closetName || item.rackId);
      if (loc === FacilityStore.UNASSIGNED) return;
      if (!groups[loc]) groups[loc] = [];
      groups[loc].push(item);
    });
  }

  // 1. Racks & Enclosures
  Object.keys(groups).forEach(loc => {
    const chassisList = groups[loc];
    items.push({
      targetVal: `loc:${loc}`,
      name: loc,
      badge: `${chassisList.length} Chassis`,
      category: "Racks & Closets",
      icon: "🏢",
      searchText: `${loc} rack enclosure closet cabinet ${chassisList.map(c => c.model).join(' ')}`.toLowerCase()
    });
  });

  // 2. Chassis & Connected Devices by Category
  Object.keys(groups).forEach(loc => {
    groups[loc].forEach(item => {
      let category = "Connected Devices";
      let icon = "🔌";

      if (item.role === "Core" || item.role === "Core & Agg" || item.role === "Aggregation" || item.role === "Gateways & WAN") {
        category = "Core & Aggregation";
        icon = "🌐";
      } else if (item.role === "Access") {
        category = "Access Switches";
        icon = "⚡";
      } else if (item.role === "Server" || item.role === "VMS Server" || item.role === "Compute & Storage") {
        category = "Servers & Ingest";
        icon = "🖥️";
      } else if (item.role === "Wireless Bridge" || item.category === "wireless") {
        category = "Wireless Bridges";
        icon = "📡";
      } else if (item.category === "camera" || item.role === "Security Camera") {
        category = "IP Cameras & Video";
        icon = "📹";
      } else if (item.category === "access_control" || item.role === "Access Control") {
        category = "Access Control & Intercom";
        icon = "🔐";
      }

      const pwr = (typeof PortEngine !== "undefined") ? PortEngine.getDevicePowerSource(item) : (item.powerSource || "");

      items.push({
        targetVal: `node:${item.instanceId}`,
        name: item.model,
        badge: `${loc} • ${item.role || category}`,
        category: category,
        icon: icon,
        searchText: `${item.model} ${loc} ${item.role || ''} ${category} ${item.partNumber || ''} ${item.notes || ''} ${pwr}`.toLowerCase()
      });
    });
  });

  return items;
}

function openTopologySearchMenu() {
  const input = document.getElementById("topologyQuickSearchInput");
  const query = input ? input.value : "";
  filterTopologySearch(query);
}

function filterTopologySearch(query) {
  const resultsContainer = document.getElementById("topologyQuickSearchResults");
  const clearBtn = document.getElementById("topologySearchClearBtn");
  if (!resultsContainer) return;

  const q = (query || "").trim().toLowerCase();
  if (clearBtn) {
    if (q.length > 0) clearBtn.classList.remove("hidden");
    else clearBtn.classList.add("hidden");
  }

  const allItems = getTopologySearchItems();
  const filtered = q ? allItems.filter(i => i.searchText.includes(q)) : allItems;

  if (filtered.length === 0) {
    resultsContainer.innerHTML = `
      <div class="px-3 py-4 text-center text-xs text-slate-500 font-mono">
        No devices or racks matching "${escapeHTML(q)}"
      </div>
    `;
    resultsContainer.classList.remove("hidden");
    topologySearchActiveIndex = -1;
    return;
  }

  // Group by category
  const categories = {};
  filtered.forEach(item => {
    if (!categories[item.category]) categories[item.category] = [];
    categories[item.category].push(item);
  });

  let html = "";
  let itemCounter = 0;

  Object.keys(categories).forEach(cat => {
    html += `
      <div class="px-2 pt-1.5 pb-0.5 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center justify-between border-t border-slate-800/60 first:border-t-0">
        <span>${escapeHTML(cat)}</span>
        <span class="text-slate-500">${categories[cat].length}</span>
      </div>
    `;

    categories[cat].forEach(item => {
      const isSelected = (selectedTopologyRackLoc && item.targetVal === `loc:${selectedTopologyRackLoc}`) ||
                         (selectedTopologyNodeId && item.targetVal === `node:${selectedTopologyNodeId}`);
      
      html += `
        <button
          type="button"
          data-search-idx="${itemCounter}"
          data-target-val="${item.targetVal}"
          onclick="selectSearchItem('${item.targetVal}', '${escapeHTML(item.name)}')"
          class="w-full text-left px-2 py-1.5 rounded-lg flex items-center justify-between gap-2 text-xs transition-colors group cursor-pointer ${
            isSelected ? 'bg-indigo-950/70 border border-indigo-500/40 text-white' : 'text-slate-200 hover:bg-slate-850 hover:text-white'
          }"
        >
          <div class="flex items-center gap-2 min-w-0">
            <span class="text-sm shrink-0">${item.icon}</span>
            <div class="truncate">
              <div class="font-medium truncate group-hover:text-indigo-300 transition-colors">${escapeHTML(item.name)}</div>
              <div class="text-[10px] text-slate-400 font-mono truncate">${escapeHTML(item.badge)}</div>
            </div>
          </div>
          <i data-lucide="arrow-right" class="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"></i>
        </button>
      `;
      itemCounter++;
    });
  });

  resultsContainer.innerHTML = html;
  resultsContainer.classList.remove("hidden");
  topologySearchActiveIndex = -1;

  if (typeof safeCreateIcons === "function") {
    safeCreateIcons(resultsContainer);
  } else if (window.lucide) {
    lucide.createIcons();
  }
}

function selectSearchItem(targetVal, label) {
  const input = document.getElementById("topologyQuickSearchInput");
  const resultsContainer = document.getElementById("topologyQuickSearchResults");
  const clearBtn = document.getElementById("topologySearchClearBtn");

  if (input && label) {
    input.value = label;
  }
  if (resultsContainer) {
    resultsContainer.classList.add("hidden");
  }
  if (clearBtn) {
    clearBtn.classList.remove("hidden");
  }

  jumpToTopologyTarget(targetVal);
}

function clearTopologySearch() {
  const input = document.getElementById("topologyQuickSearchInput");
  const clearBtn = document.getElementById("topologySearchClearBtn");
  const resultsContainer = document.getElementById("topologyQuickSearchResults");

  if (input) {
    input.value = "";
    input.focus();
  }
  if (clearBtn) {
    clearBtn.classList.add("hidden");
  }
  if (resultsContainer) {
    resultsContainer.classList.add("hidden");
  }
}

function handleTopologySearchKey(e) {
  const resultsContainer = document.getElementById("topologyQuickSearchResults");
  if (!resultsContainer || resultsContainer.classList.contains("hidden")) {
    if (e.key === "ArrowDown" || e.key === "Enter") {
      openTopologySearchMenu();
    }
    return;
  }

  const buttons = Array.from(resultsContainer.querySelectorAll("button[data-search-idx]"));
  if (buttons.length === 0) return;

  if (e.key === "ArrowDown") {
    e.preventDefault();
    topologySearchActiveIndex = (topologySearchActiveIndex + 1) % buttons.length;
    highlightSearchItem(buttons);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    topologySearchActiveIndex = (topologySearchActiveIndex - 1 + buttons.length) % buttons.length;
    highlightSearchItem(buttons);
  } else if (e.key === "Enter") {
    e.preventDefault();
    if (topologySearchActiveIndex >= 0 && topologySearchActiveIndex < buttons.length) {
      buttons[topologySearchActiveIndex].click();
    } else if (buttons.length > 0) {
      buttons[0].click();
    }
  } else if (e.key === "Escape") {
    resultsContainer.classList.add("hidden");
  }
}

function highlightSearchItem(buttons) {
  buttons.forEach((btn, idx) => {
    if (idx === topologySearchActiveIndex) {
      btn.classList.add("bg-indigo-600", "text-white");
      btn.scrollIntoView({ block: "nearest", behavior: "smooth" });
    } else {
      btn.classList.remove("bg-indigo-600");
    }
  });
}

// Global click-outside listener to close quick search results menu
document.addEventListener("click", function(e) {
  const container = document.getElementById("topologyQuickSearchContainer");
  const results = document.getElementById("topologyQuickSearchResults");
  if (container && results && !container.contains(e.target)) {
    results.classList.add("hidden");
  }
});

function populateTopologyQuickJump() {
  const select = document.getElementById("topologyQuickJump");
  if (!select) return;

  const items = getTopologySearchItems();
  let html = `<option value="">Jump to Device / Rack...</option>`;
  items.forEach(item => {
    const isSel = (selectedTopologyRackLoc && item.targetVal === `loc:${selectedTopologyRackLoc}`) ||
                  (selectedTopologyNodeId && item.targetVal === `node:${selectedTopologyNodeId}`);
    html += `<option value="${item.targetVal}" ${isSel ? 'selected' : ''}>${item.icon} ${escapeHTML(item.name)} (${escapeHTML(item.badge)})</option>`;
  });
  select.innerHTML = html;
}

function updateSwitchStackFromTopology(instanceId, count) {
  if (typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) return;
  const item = projectBOM.find(i => i.instanceId === instanceId);
  if (!item) return;

  const val = parseInt(count, 10) || 0;
  if (val >= 2) {
    item.canStack = true;
    item.stackedUnits = val;
    item.qty = Math.max(item.qty || 1, val);
    item.uplinkMode = "lag_dual";
    item.customLinkMultiplier = Math.max(item.customLinkMultiplier || 1, val);
  } else {
    item.stackedUnits = 0;
  }

  if (typeof PortEngine !== "undefined") {
    PortEngine.initSwitchPorts(item, true);
  }

  if (typeof applyStackCabling === "function") {
    applyStackCabling(item);
  }

  if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
    FacilityStore.notifyWorkspaceChange();
  }

  renderTopology();
  renderTopologyInspector();
  if (typeof showToast === "function") {
    showToast(val >= 2 ? `Configured ${item.model} as a ${val}-Unit Switch Stack.` : `Configured ${item.model} as Standalone.`);
  }
}

function jumpToTopologyTarget(targetVal = null) {
  // 1. Close BOM drawer if open so full topology canvas and inspector are visible
  const drawer = document.getElementById("bomDrawer");
  if (drawer && !drawer.classList.contains("translate-x-full")) {
    if (typeof toggleBomDrawer === "function") toggleBomDrawer();
  }

  // 2. Open topology modal if hidden
  const wasHidden = !isTopologyModalVisible();
  if (wasHidden && typeof toggleTopologyModal === "function") {
    toggleTopologyModal();
  }

  // 3. Jump to target after delay to allow canvas rendering
  if (targetVal) {
    setTimeout(() => {
      if (targetVal.startsWith("loc:")) {
        const loc = targetVal.substring(4);
        selectTopologyRack(loc);
        panClusterIntoView(loc);
      } else if (targetVal.startsWith("node:")) {
        const nodeId = targetVal.substring(5);
        const item = (typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) ? projectBOM.find(i => i.instanceId === nodeId) : null;
        if (item) {
          // If node has no valid closet, assign default so it displays in a rack cluster
          if (!item.closetName || item.closetName === FacilityStore.UNASSIGNED) {
            const def = (item.role === "Core" || item.role === "Aggregation") ? "MDF • Rack-1" : "IDF-1 • Rack-1";
            item.closetName = def;
            item.rackId = def;
            if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
              FacilityStore.notifyWorkspaceChange();
            }
            renderTopology();
          }
        }
        selectTopologyNode(nodeId);
        panNodeIntoView(nodeId);
      }
    }, wasHidden ? 160 : 60);
  }
}

// Window Compatibility Exports
window.isTopologyModalVisible = isTopologyModalVisible;
window.toggleTopologyModal = toggleTopologyModal;
window.initTopologyCanvas = initTopologyCanvas;
window.renderTopology = renderTopology;
window.zoomTopologyCanvas = zoomTopologyCanvas;
window.resetTopologyZoom = resetTopologyZoom;
window.fitTopologyToScreen = fitTopologyToScreen;
window.panClusterIntoView = panClusterIntoView;
window.panNodeIntoView = panNodeIntoView;
window.setTopologyViewPlane = setTopologyViewPlane;
window.toggleTopologyInspector = toggleTopologyInspector;
window.selectTopologyNode = selectTopologyNode;
window.selectTopologyRack = selectTopologyRack;
window.selectTopologyLink = selectTopologyLink;
window.deselectTopologyNode = deselectTopologyNode;
window.openRackViewerFor = openRackViewerFor;
window.updateDeviceLocation = updateDeviceLocation;
window.populateTopologyQuickJump = populateTopologyQuickJump;
window.openTopologySearchMenu = openTopologySearchMenu;
window.filterTopologySearch = filterTopologySearch;
window.selectSearchItem = selectSearchItem;
window.clearTopologySearch = clearTopologySearch;
window.handleTopologySearchKey = handleTopologySearchKey;
window.jumpToTopologyTarget = jumpToTopologyTarget;
window.autoArrangeTopologyHierarchy = autoArrangeTopologyHierarchy;
window.autoDefaultTopology = autoDefaultTopology;
window.updateCustomUplink = updateCustomUplink;
window.updateCustomLinkMultiplier = updateCustomLinkMultiplier;
window.updateCustomLinkSpeed = updateCustomLinkSpeed;
window.updateSwitchVmsServer = updateSwitchVmsServer;
window.updateSwitchAccessServer = updateSwitchAccessServer;
window.toggleServerRole = toggleServerRole;
window.setDevicePowerSource = setDevicePowerSource;
window.setDeviceHostSwitch = setDeviceHostSwitch;
window.setDeviceSwitchPort = setDeviceSwitchPort;
window.toggleRadioUplinkRole = toggleRadioUplinkRole;
window.updateRadioPartner = updateRadioPartner;
window.inspectSwitchPort = inspectSwitchPort;
window.updateSwitchStackFromTopology = updateSwitchStackFromTopology;