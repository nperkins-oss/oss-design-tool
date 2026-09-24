// =========================================================================
// TOPOLOGY & INTERCONNECT CANVAS ENGINE (NetSelect Enterprise)
// Integrated with FacilityStore & Universal Workspace Dispatcher
// =========================================================================

let isCanvasDragging = false;
let draggedTopologyNode = null;
let topoDragOffset = { x: 0, y: 0 };
let topologyLinks = [];

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
// Render Topology Nodes & Interactive Cards
// -----------------------------------------------------------
function renderTopology() {
  const container = document.getElementById("topologyNodesContainer");
  if (!container) return;

  container.innerHTML = "";

  if (typeof projectBOM === "undefined" || projectBOM.length === 0) {
    container.innerHTML = `
      <div class="py-24 text-center text-slate-500 space-y-2">
        <i data-lucide="network" class="w-8 h-8 mx-auto text-slate-600"></i>
        <p class="text-sm font-semibold">No active hardware in project quote.</p>
        <p class="text-xs text-slate-600">Add switches, gateways, or radios to view network topology.</p>
      </div>
    `;
    updateTopologyCounters(0, 0);
    renderTopologyLinks();
    if (window.lucide) lucide.createIcons();
    return;
  }

  // Filter hardware rows (exclude licenses, cabling, optics, and unassigned staging items)
  const activeNodes = projectBOM.filter(item => {
    if (item.parentInstanceId) return false;
    if (item.role === "Structured Cabling" || item.role === "Optics & DAC") return false;
    if (item.role === "Mgmt License" || item.role === "Security License" || item.role === "Feature License") return false;
    const loc = FacilityStore.normalize(item.closetName || item.rackId);
    if (loc === FacilityStore.UNASSIGNED) return false; // Staging items are not mapped in topology
    return true;
  });

  // Group active hardware by normalized location
  const groups = {};
  activeNodes.forEach(item => {
    const loc = FacilityStore.normalize(item.closetName || item.rackId);
    if (!groups[loc]) groups[loc] = [];
    groups[loc].push(item);
  });

  const savedPositions = loadTopologyPositions();
  let groupIndex = 0;

  const candidateTargets = activeNodes.map(n => ({
    id: n.instanceId,
    label: `${n.model} (${FacilityStore.normalize(n.closetName || 'MDF')})`
  }));

  Object.keys(groups).forEach(loc => {
    const items = groups[loc];
    const defaultPos = {
      x: 80 + (groupIndex * 380),
      y: 80 + ((groupIndex % 2) * 50)
    };
    const pos = savedPositions[loc] || defaultPos;
    const parsed = FacilityStore.parse(loc);

    const clusterEl = document.createElement("div");
    clusterEl.className = "topo-location-cluster absolute select-none";
    clusterEl.style.left = `${pos.x}px`;
    clusterEl.style.top = `${pos.y}px`;
    clusterEl.setAttribute("data-location", loc);

    clusterEl.innerHTML = `
      <div class="flex items-center justify-between pb-2 mb-3 border-b border-slate-700/80 cursor-move topo-cluster-header">
        <div class="flex items-center gap-2">
          <i data-lucide="server" class="w-4 h-4 text-indigo-400"></i>
          <div>
            <span class="text-xs font-bold text-white tracking-wide block leading-none">${parsed.space}</span>
            <span class="text-[9px] font-mono text-indigo-300 block mt-0.5 leading-none">${parsed.enclosure}</span>
          </div>
        </div>
        <span class="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
          ${items.length} ${items.length === 1 ? 'Unit' : 'Units'}
        </span>
      </div>
      <div class="space-y-3">
        ${items.map(item => {
          const isUplinkCapable = item.role !== "Core" && item.role !== "Core & Agg" && item.role !== "Aggregation" && item.role !== "Gateways & WAN" && item.role !== "Security WAN";
          return `
            <div class="topo-node-card text-xs space-y-2 p-2.5 rounded-xl border border-slate-800 bg-slate-900" id="topo-card-${item.instanceId}">
              <div class="flex items-center justify-between">
                <span class="font-bold text-white truncate max-w-[190px]">${item.model}</span>
                <span class="text-[10px] font-mono font-bold ${getRoleBadgeClass(item.role)}">${item.role}</span>
              </div>
              
              <div class="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>${item.vendor || 'Generic'}</span>
                <span>${item.ports ? `${item.ports} Ports` : ''} ${item.poeBudget ? `• ${item.poeBudget}W` : ''}</span>
              </div>

              <!-- Interactive Uplink Switch & Link Type Controls -->
              ${isUplinkCapable ? `
                <div class="pt-2 border-t border-slate-800/80 space-y-1.5 text-[11px]">
                  <div class="flex items-center justify-between gap-1">
                    <span class="text-slate-400 text-[10px]">Uplink To:</span>
                    <select onchange="updateCustomUplink('${item.instanceId}', this.value)" class="bg-slate-950 border border-slate-700 text-white rounded px-1.5 py-0.5 text-[10px] max-w-[170px] truncate focus:outline-none focus:border-brand-500">
                      <option value="">Auto-Assign</option>
                      ${candidateTargets.filter(t => t.id !== item.instanceId).map(t => `
                        <option value="${t.id}" ${item.customUplinkTargetId === t.id ? 'selected' : ''}>${t.label}</option>
                      `).join('')}
                    </select>
                  </div>
                  
                  <div class="flex items-center justify-between gap-1">
                    <span class="text-slate-400 text-[10px]">Link Config:</span>
                    <div class="flex items-center gap-1">
                      <select onchange="updateCustomLinkMultiplier('${item.instanceId}', this.value)" class="bg-slate-950 border border-slate-700 text-sky-400 font-mono font-bold rounded px-1 py-0.5 text-[10px]">
                        <option value="1" ${(item.customLinkMultiplier || 1) == 1 ? 'selected' : ''}>1x</option>
                        <option value="2" ${item.customLinkMultiplier == 2 ? 'selected' : ''}>2x LAG</option>
                      </select>
                      <select onchange="updateCustomLinkMedium('${item.instanceId}', this.value)" class="bg-slate-950 border border-slate-700 text-amber-300 font-mono rounded px-1 py-0.5 text-[10px]">
                        <option value="auto" ${!item.customLinkMedium || item.customLinkMedium === 'auto' ? 'selected' : ''}>Auto</option>
                        <option value="fiber" ${item.customLinkMedium === 'fiber' ? 'selected' : ''}>Fiber</option>
                        <option value="copper" ${item.customLinkMedium === 'copper' ? 'selected' : ''}>Copper</option>
                      </select>
                    </div>
                  </div>
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

  generateTopologyLinks(activeNodes);
  updateTopologyCounters(activeNodes.length, topologyLinks.length);
  renderTopologyLinks();

  if (window.lucide) lucide.createIcons();
}

function getRoleBadgeClass(role) {
  switch (role) {
    case "Core":
    case "Core & Agg":
    case "Aggregation":
      return "text-purple-400";
    case "Access":
      return "text-emerald-400";
    case "Gateways & WAN":
    case "Security WAN":
      return "text-rose-400";
    case "Wireless Bridge":
      return "text-sky-400";
    default:
      return "text-slate-400";
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
  }
}

function updateCustomLinkMultiplier(nodeInstanceId, multiplierVal) {
  const item = projectBOM.find(i => i.instanceId === nodeInstanceId);
  if (item) {
    item.customLinkMultiplier = parseInt(multiplierVal) || 1;
    FacilityStore.notifyWorkspaceChange();
  }
}

function updateCustomLinkMedium(nodeInstanceId, mediumVal) {
  const item = projectBOM.find(i => i.instanceId === nodeInstanceId);
  if (item) {
    item.customLinkMedium = mediumVal;
    FacilityStore.notifyWorkspaceChange();
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
  topoDragOffset.x = (e.clientX - rect.left + viewport.scrollLeft) - clusterEl.offsetLeft;
  topoDragOffset.y = (e.clientY - rect.top + viewport.scrollTop) - clusterEl.offsetTop;

  e.stopPropagation();
}

function handleTopologyMouseMove(e) {
  if (!isTopologyModalVisible() || !isCanvasDragging || !draggedTopologyNode) return;

  const viewport = document.getElementById("topologyCanvasViewport");
  const rect = viewport.getBoundingClientRect();

  const newX = Math.max(30, (e.clientX - rect.left + viewport.scrollLeft) - topoDragOffset.x);
  const newY = Math.max(30, (e.clientY - rect.top + viewport.scrollTop) - topoDragOffset.y);

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
// Link Determination
// -----------------------------------------------------------
function generateTopologyLinks(nodes) {
  topologyLinks = [];

  const gateways = nodes.filter(n => n.role === "Gateways & WAN" || n.role === "Security WAN");
  const cores = nodes.filter(n => n.role === "Core" || n.role === "Core & Agg" || n.role === "Aggregation");
  const access = nodes.filter(n => n.role === "Access");
  const wireless = nodes.filter(n => n.role === "Wireless Bridge");

  // 1. Gateway -> Core/Aggregation Interconnects
  gateways.forEach(gw => {
    cores.forEach(c => {
      const gwLoc = FacilityStore.normalize(gw.closetName);
      const cLoc = FacilityStore.normalize(c.closetName);
      topologyLinks.push({
        fromId: gw.instanceId,
        toId: c.instanceId,
        multiplier: 2,
        isLAG: true,
        medium: (gwLoc === cLoc) ? "dac" : "fiber"
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
      const accLoc = FacilityStore.normalize(acc.closetName);
      const targetLoc = FacilityStore.normalize(target.closetName);
      const isInterCloset = targetLoc !== accLoc;
      const multiplier = acc.customLinkMultiplier || (isInterCloset ? 2 : 1);
      const medium = acc.customLinkMedium && acc.customLinkMedium !== "auto" 
        ? acc.customLinkMedium 
        : (isInterCloset ? "fiber" : "copper");

      topologyLinks.push({
        fromId: target.instanceId,
        toId: acc.instanceId,
        multiplier: multiplier,
        isLAG: multiplier > 1,
        medium: medium
      });
    }
  });

  // 3. Wireless Bridge Links
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
        fromId: target.instanceId,
        toId: wb.instanceId,
        multiplier: 1,
        isWireless: true,
        isPoEDelivery: true,
        medium: "copper"
      });
    }
  });
}

// -----------------------------------------------------------
// SVG Vector Link Renderer
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

    const x1 = fromCluster.offsetLeft + fromCard.offsetLeft + (fromCard.offsetWidth / 2);
    const y1 = fromCluster.offsetTop + fromCard.offsetTop + (fromCard.offsetHeight / 2);
    const x2 = toCluster.offsetLeft + toCard.offsetLeft + (toCard.offsetWidth / 2);
    const y2 = toCluster.offsetTop + toCard.offsetTop + (toCard.offsetHeight / 2);

    let strokeColor = "#10b981"; // Emerald: 1x Link
    let strokeWidth = "2.5";
    let isDashed = false;

    if (link.isWireless) {
      strokeColor = "#c084fc"; // Purple: Wireless RF
      isDashed = true;
      strokeWidth = "2.5";
    } else if (link.isPoEDelivery && !link.isLAG) {
      strokeColor = "#f59e0b"; // Amber: PoE Delivery
      strokeWidth = "2.5";
    } else if (link.isLAG || link.multiplier === 2) {
      strokeColor = "#38bdf8"; // Sky Blue: 2x LACP LAG
      strokeWidth = "3.5";
    } else if (link.medium === "fiber") {
      strokeColor = "#06b6d4"; // Cyan: Fiber
      strokeWidth = "2.5";
    }

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", x1);
    line.setAttribute("y1", y1);
    line.setAttribute("x2", x2);
    line.setAttribute("y2", y2);
    line.setAttribute("stroke", strokeColor);
    line.setAttribute("stroke-width", strokeWidth);
    if (isDashed) line.setAttribute("stroke-dasharray", "6,4");
    line.setAttribute("opacity", "0.9");
    svg.appendChild(line);

    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;

    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", midX);
    label.setAttribute("y", midY - 6);
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("fill", strokeColor);
    label.setAttribute("font-size", "10");
    label.setAttribute("font-family", "monospace");
    label.setAttribute("font-weight", "bold");
    label.textContent = link.isWireless ? "RF Bridge" : (link.multiplier > 1 ? `${link.multiplier}x LAG` : "1x Link");
    svg.appendChild(label);
  });
}

// -----------------------------------------------------------
// Position State Management
// -----------------------------------------------------------
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
  try {
    const projKey = FacilityStore.getProjectId();
    localStorage.removeItem(`netselect_topo_pos_${projKey}`);
    if (typeof projectBOM !== "undefined") {
      projectBOM.forEach(i => {
        i.customUplinkTargetId = null;
        i.customLinkMultiplier = null;
        i.customLinkMedium = null;
      });
      FacilityStore.notifyWorkspaceChange();
    }
  } catch (e) {}
  renderTopology();
  if (typeof showToast === "function") showToast("Topology links and positions auto-routed.");
}

function updateTopologyCounters(nodesCount, linksCount) {
  const nEl = document.getElementById("topologyNodesCount");
  const lEl = document.getElementById("topologyLinksCount");
  if (nEl) nEl.innerText = `${nodesCount} Nodes`;
  if (lEl) lEl.innerText = `${linksCount} Uplinks`;
}