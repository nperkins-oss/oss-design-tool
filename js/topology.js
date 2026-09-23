// ==========================================
// INTERACTIVE TOPOLOGY & INTERCONNECT ENGINE
// ==========================================

let isCanvasDragging = false;
let draggedTopologyNode = null;
let dragOffset = { x: 0, y: 0 };
let topologyNodePositions = {};

function toggleTopologyModal() {
  const modal = document.getElementById("topologyModal");
  if (!modal) return;

  if (modal.classList.contains("hidden")) {
    modal.classList.remove("hidden");
    loadTopologyPositions();
    renderTopologyCanvas();
    window.addEventListener("resize", drawTopologyConnectors);
    setupCanvasDragListeners();
  } else {
    modal.classList.add("hidden");
    window.removeEventListener("resize", drawTopologyConnectors);
    removeCanvasDragListeners();
  }
}

function loadTopologyPositions() {
  try {
    const raw = localStorage.getItem("netselect_topology_positions");
    if (raw) {
      topologyNodePositions = JSON.parse(raw);
    } else {
      topologyNodePositions = {};
    }
  } catch(e) {
    topologyNodePositions = {};
  }
}

function saveTopologyPositions() {
  try {
    localStorage.setItem("netselect_topology_positions", JSON.stringify(topologyNodePositions));
  } catch(e) {}
}

function autoDefaultTopology() {
  const gateways = projectBOM.filter(i => !i.parentInstanceId && i.role === "Security WAN");
  const cores = projectBOM.filter(i => !i.parentInstanceId && (i.role === "Core" || i.role === "Aggregation"));
  const accessSwitches = projectBOM.filter(i => !i.parentInstanceId && i.role === "Access" && !i.isDinMounted);
  const poleSwitches = projectBOM.filter(i => !i.parentInstanceId && i.role === "Access" && i.isDinMounted);
  const radios = projectBOM.filter(i => !i.parentInstanceId && i.role === "Wireless Bridge");

  const rootNode = cores[0] || gateways[0] || accessSwitches[0];

  if (gateways.length > 0 && cores.length > 0) {
    cores.forEach(c => {
      c.uplinkTargetId = gateways[0].instanceId;
      c.uplinkMode = (c.stackedUnits >= 2 || c.qty >= 2) ? "lag_dual" : "single";
    });
  }

  if (rootNode) {
    accessSwitches.forEach(sw => {
      sw.uplinkTargetId = rootNode.instanceId;
      sw.powerSource = "internal_psu";
      sw.uplinkMode = (sw.stackedUnits >= 2 || sw.qty >= 2) ? "lag_dual" : "single";
    });
  }

  const masterRadios = radios.filter(r => (r.model || '').includes("Master") || !(r.model || '').includes("Remote"));
  const remoteRadios = radios.filter(r => (r.model || '').includes("Remote"));

  masterRadios.forEach((mRadio, idx) => {
    const hostSwitch = accessSwitches[0] || rootNode;
    if (hostSwitch) {
      mRadio.uplinkTargetId = hostSwitch.instanceId;
      mRadio.powerSource = "poe_switch";
      mRadio.uplinkMode = "single";
    }

    const rRadio = remoteRadios[idx];
    if (rRadio) {
      rRadio.uplinkTargetId = mRadio.instanceId;
      rRadio.uplinkMode = "single";

      const localPoleSwitch = poleSwitches.find(ps => ps.closetName === rRadio.closetName) || poleSwitches[0];
      if (localPoleSwitch) {
        rRadio.powerSource = "poe_switch";
        localPoleSwitch.uplinkTargetId = rRadio.instanceId;
        localPoleSwitch.powerSource = "internal_psu";
        localPoleSwitch.uplinkMode = "single";
      } else {
        rRadio.powerSource = "local_injector";
      }
    }
  });

  topologyNodePositions = {};
  localStorage.removeItem("netselect_topology_positions");
  renderTopologyCanvas();
  if (typeof updateBOMView === "function") updateBOMView();
  showToast("Auto-routed hierarchical network tree.");
}

function renderTopologyCanvas() {
  const container = document.getElementById("topologyNodesContainer");
  const svgOverlay = document.getElementById("topologySvgOverlay");
  const nodesCountEl = document.getElementById("topologyNodesCount");

  if (!container || !svgOverlay) return;

  const activeNodes = projectBOM.filter(i => !i.parentInstanceId);
  if (nodesCountEl) nodesCountEl.innerText = `${activeNodes.length} Network Nodes`;

  if (activeNodes.length === 0) {
    container.innerHTML = `
      <div class="m-auto text-center py-20 text-slate-500 space-y-2">
        <i data-lucide="network" class="w-12 h-12 mx-auto text-slate-600"></i>
        <p class="text-sm font-semibold text-slate-400">Project BOM is currently empty.</p>
        <p class="text-xs">Add switches, gateways, or wireless links to build your topology.</p>
      </div>
    `;
    svgOverlay.innerHTML = "";
    if (window.lucide) lucide.createIcons();
    return;
  }

  // Group hardware by physical location
  const locationGroups = {};
  activeNodes.forEach(node => {
    const locKey = `${(node.closetName || 'MDF').trim()} • ${(node.rackId || 'Rack-1').trim()}`;
    if (!locationGroups[locKey]) locationGroups[locKey] = [];
    locationGroups[locKey].push(node);
  });

  const keys = Object.keys(locationGroups);

  container.innerHTML = keys.map((locName, idx) => {
    const nodes = locationGroups[locName];
    const isPole = locName.toLowerCase().includes("pole") || locName.toLowerCase().includes("gate") || nodes.some(n => n.isDinMounted);
    
    const savedPos = topologyNodePositions[`cluster-${locName}`];
    // Default staggered grid layout with comfortable spacing
    const leftPos = (savedPos && typeof savedPos.x === 'number' && savedPos.x >= 30) 
      ? savedPos.x 
      : (idx * 400 + 50);
    const topPos = (savedPos && typeof savedPos.y === 'number' && savedPos.y >= 50) 
      ? savedPos.y 
      : 80;

    return `
      <div id="topo-cluster-${locName.replace(/[^a-zA-Z0-9]/g, '_')}" 
           class="topo-location-cluster absolute select-none w-88 bg-slate-900 border-2 border-slate-700/90 rounded-2xl shadow-2xl flex flex-col" 
           style="left: ${leftPos}px; top: ${topPos}px; width: 340px; min-height: 140px; z-index: 20;"
           data-cluster-key="${locName}">
        
        <!-- Draggable Cluster Header -->
        <div class="cluster-drag-handle flex items-center justify-between border-b border-slate-800 p-3 bg-slate-950/80 rounded-t-2xl cursor-grab active:cursor-grabbing shrink-0">
          <div class="flex items-center gap-2 min-w-0">
            <i data-lucide="${isPole ? 'radio-tower' : 'server'}" class="w-4 h-4 ${isPole ? 'text-amber-400' : 'text-indigo-400'} shrink-0"></i>
            <h3 class="font-bold text-xs text-white tracking-wide truncate max-w-[190px]">${locName}</h3>
          </div>
          <span class="text-[9px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 shrink-0 uppercase font-semibold">
            ${isPole ? 'Field Box' : 'Indoor Rack'}
          </span>
        </div>

        <!-- Node Stack Body -->
        <div class="p-3 space-y-3 flex-1">
          ${nodes.map(n => renderTopologyNodeCard(n)).join("")}
        </div>
      </div>
    `;
  }).join("");

  if (window.lucide) {
    try { lucide.createIcons(); } catch (e) {}
  }

  // Draw SVG lines after DOM has laid out
  setTimeout(() => {
    drawTopologyConnectors();
  }, 80);
}

function renderTopologyNodeCard(node) {
  const isSwitch = node.role === "Access" || node.role === "Core" || node.role === "Aggregation";
  const isRadio = node.role === "Wireless Bridge";
  const isFw = node.role === "Security WAN";
  const isStacked = (node.stackedUnits >= 2) || (node.qty >= 2 && node.canStack);
  const stackCount = Math.max(1, isStacked ? (node.stackedUnits || node.qty || 2) : 1);

  if (!node.uplinkMode) {
    node.uplinkMode = isStacked ? "lag_dual" : "single";
  }

  let badgeColor = "bg-slate-800 text-slate-300 border-slate-700";
  if (isFw) badgeColor = "bg-rose-500/20 text-rose-300 border-rose-500/40";
  else if (node.role === "Core") badgeColor = "bg-purple-500/20 text-purple-300 border-purple-500/40";
  else if (isRadio) badgeColor = "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
  else if (node.isDinMounted) badgeColor = "bg-amber-500/20 text-amber-300 border-amber-500/40";

  const potentialUplinks = projectBOM.filter(i => !i.parentInstanceId && i.instanceId !== node.instanceId);
  const allLocations = typeof getAllDefinedLocations === "function" ? getAllDefinedLocations() : ["MDF • Rack-1", "IDF-1 • Rack-1"];
  const currentLocation = `${(node.closetName || 'MDF').trim()} • ${(node.rackId || 'Rack-1').trim()}`;

  return `
    <div id="topo-card-${node.instanceId}" class="topo-node-card space-y-2 bg-slate-950 border border-slate-800 p-3 rounded-xl shadow-md" data-id="${node.instanceId}">
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0">
          <div class="flex items-center gap-1.5 flex-wrap mb-1">
            <span class="badge-chip border text-[9px] ${badgeColor}">${node.role || 'Node'}</span>
            ${isStacked ? `
              <span class="badge-chip border border-indigo-500/50 bg-indigo-500/20 text-indigo-300 font-mono text-[9px]">
                ${stackCount}x Stack
              </span>
            ` : ''}
          </div>
          <h4 class="font-bold text-xs text-white leading-tight truncate" title="${node.model}">${node.model || 'Unknown Device'}</h4>
          <span class="text-[10px] font-mono text-slate-400">SKU: ${node.sku || 'N/A'}</span>
        </div>
      </div>

      <!-- Quick Location Relocation Dropdown -->
      <div class="flex items-center justify-between text-[10px] text-slate-400 bg-slate-900/90 p-1.5 rounded-lg border border-slate-800">
        <span class="flex items-center gap-1 text-slate-400 font-medium">
          <i data-lucide="map-pin" class="w-3 h-3 text-indigo-400"></i> Location:
        </span>
        <select onchange="moveTopologyNodeLocation('${node.instanceId}', this.value)" class="bg-slate-950 border border-slate-700 text-slate-200 text-[10px] rounded px-1.5 py-0.5 max-w-[150px] truncate focus:outline-none focus:border-brand-500 font-medium">
          ${allLocations.map(loc => `
            <option value="${loc}" ${loc === currentLocation ? 'selected' : ''}>${loc}</option>
          `).join('')}
          <option value="new_location">+ Create Location...</option>
        </select>
      </div>

      <!-- Upstream & Redundancy Controls -->
      <div class="pt-1.5 border-t border-slate-800/80 space-y-1.5 text-[10px]">
        <div class="flex items-center justify-between text-slate-400 gap-2">
          <span class="shrink-0">Uplink Target:</span>
          <select onchange="setTopologyUplink('${node.instanceId}', this.value)" class="bg-slate-900 border border-slate-700 text-slate-200 text-[10px] rounded px-1.5 py-0.5 max-w-[150px] truncate focus:outline-none focus:border-indigo-500">
            <option value="none">-- Standalone / Root --</option>
            ${potentialUplinks.map(u => `
              <option value="${u.instanceId}" ${node.uplinkTargetId === u.instanceId ? 'selected' : ''}>
                ${u.model} (${u.closetName || 'Closet'})
              </option>
            `).join('')}
          </select>
        </div>

        ${(isSwitch && node.role !== "Core") ? `
          <div class="flex items-center justify-between text-slate-400 pt-1 border-t border-slate-850">
            <span class="shrink-0">Link Redundancy:</span>
            <div class="flex items-center gap-1">
              <button onclick="setTopologyUplinkMode('${node.instanceId}', 'single')" class="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border transition-colors ${node.uplinkMode !== 'lag_dual' ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'}">
                1x Link
              </button>
              <button onclick="setTopologyUplinkMode('${node.instanceId}', 'lag_dual')" class="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border transition-colors ${node.uplinkMode === 'lag_dual' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'}">
                2x LAG/LACP
              </button>
            </div>
          </div>
        ` : ''}

        ${isRadio ? `
          <div class="flex items-center justify-between text-slate-400">
            <span>Power Feed:</span>
            <select onchange="setTopologyPowerSource('${node.instanceId}', this.value)" class="bg-slate-900 border border-slate-700 text-amber-300 text-[10px] rounded px-1 py-0.5 focus:outline-none focus:border-amber-500">
              <option value="poe_switch" ${node.powerSource === 'poe_switch' ? 'selected' : ''}>PoE from Switch (${node.baseWatts || 24}W)</option>
              <option value="local_injector" ${node.powerSource === 'local_injector' ? 'selected' : ''}>Local Injector (0W Switch)</option>
              <option value="dc_terminal" ${node.powerSource === 'dc_terminal' ? 'selected' : ''}>Solar / DC Terminal</option>
            </select>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

function moveTopologyNodeLocation(instanceId, newLocation) {
  if (typeof setItemLocation === "function") {
    setItemLocation(instanceId, newLocation);
  }
  renderTopologyCanvas();
}

function setTopologyUplink(childId, targetId) {
  const child = projectBOM.find(i => i.instanceId === childId);
  if (child) {
    child.uplinkTargetId = targetId === "none" ? null : targetId;
  }
  if (typeof updateBOMView === "function") updateBOMView();
  renderTopologyCanvas();
}

function setTopologyUplinkMode(instanceId, mode) {
  const node = projectBOM.find(i => i.instanceId === instanceId);
  if (!node) return;

  node.uplinkMode = mode;
  if (typeof updateBOMView === "function") updateBOMView();
  renderTopologyCanvas();
  showToast(`Updated ${node.model} to ${mode === 'lag_dual' ? 'Dual 2x LAG/LACP' : 'Single 1x'} uplink.`);
}

function setTopologyPowerSource(childId, powerSource) {
  const child = projectBOM.find(i => i.instanceId === childId);
  if (child) {
    child.powerSource = powerSource;
  }
  if (typeof updateBOMView === "function") updateBOMView();
  renderTopologyCanvas();
}

// -----------------------------------------------------------
// Canvas Drag-and-Drop Interaction Engine
// -----------------------------------------------------------
function setupCanvasDragListeners() {
  const viewport = document.getElementById("topologyCanvasViewport");
  if (!viewport) return;

  viewport.addEventListener("mousedown", handleCanvasMouseDown);
  window.addEventListener("mousemove", handleCanvasMouseMove);
  window.addEventListener("mouseup", handleCanvasMouseUp);
}

function removeCanvasDragListeners() {
  const viewport = document.getElementById("topologyCanvasViewport");
  if (viewport) viewport.removeEventListener("mousedown", handleCanvasMouseDown);
  window.removeEventListener("mousemove", handleCanvasMouseMove);
  window.removeEventListener("mouseup", handleCanvasMouseUp);
}

function handleCanvasMouseDown(e) {
  const handle = e.target.closest(".cluster-drag-handle");
  if (!handle) return;

  const clusterEl = handle.closest(".topo-location-cluster");
  if (!clusterEl) return;

  isCanvasDragging = true;
  draggedTopologyNode = clusterEl;

  const rect = clusterEl.getBoundingClientRect();
  dragOffset.x = e.clientX - rect.left;
  dragOffset.y = e.clientY - rect.top;
}

function handleCanvasMouseMove(e) {
  if (!isCanvasDragging || !draggedTopologyNode) return;

  const container = document.getElementById("topologyNodesContainer");
  if (!container) return;
  const cRect = container.getBoundingClientRect();

  const newX = e.clientX - cRect.left - dragOffset.x;
  const newY = e.clientY - cRect.top - dragOffset.y;

  draggedTopologyNode.style.left = `${Math.max(30, newX)}px`;
  draggedTopologyNode.style.top = `${Math.max(50, newY)}px`;

  drawTopologyConnectors();
}

function handleCanvasMouseUp() {
  if (isCanvasDragging && draggedTopologyNode) {
    const clusterKey = draggedTopologyNode.getAttribute("data-cluster-key");
    if (clusterKey) {
      topologyNodePositions[`cluster-${clusterKey}`] = {
        x: Math.max(30, parseInt(draggedTopologyNode.style.left) || 30),
        y: Math.max(50, parseInt(draggedTopologyNode.style.top) || 50)
      };
      saveTopologyPositions();
    }
  }
  isCanvasDragging = false;
  draggedTopologyNode = null;
}

// -----------------------------------------------------------
// Real-Time SVG Connector Vector Engine
// -----------------------------------------------------------
function drawTopologyConnectors() {
  const svg = document.getElementById("topologySvgOverlay");
  const container = document.getElementById("topologyNodesContainer");
  const linksCountEl = document.getElementById("topologyLinksCount");
  if (!svg || !container) return;

  svg.innerHTML = "";
  const cRect = container.getBoundingClientRect();
  
  svg.setAttribute("width", container.scrollWidth || 2500);
  svg.setAttribute("height", container.scrollHeight || 1600);

  let linkCount = 0;

  projectBOM.filter(i => !i.parentInstanceId && i.uplinkTargetId).forEach(child => {
    const fromEl = document.getElementById(`topo-card-${child.instanceId}`);
    const toEl = document.getElementById(`topo-card-${child.uplinkTargetId}`);

    if (!fromEl || !toEl) return;

    const fromRect = fromEl.getBoundingClientRect();
    const toRect = toEl.getBoundingClientRect();

    if (fromRect.width === 0 || toRect.width === 0) return;

    // Calculate anchor points relative to coordinate plane
    const x1 = fromRect.left + (fromRect.width / 2) - cRect.left;
    const y1 = fromRect.top + (fromRect.height / 2) - cRect.top;
    const x2 = toRect.left + (toRect.width / 2) - cRect.left;
    const y2 = toRect.top + (toRect.height / 2) - cRect.top;

    const targetNode = projectBOM.find(i => i.instanceId === child.uplinkTargetId);
    const isWireless = child.role === "Wireless Bridge" || (targetNode && targetNode.role === "Wireless Bridge");
    const isPoEDrawn = child.powerSource === "poe_switch";
    const isDualLag = child.uplinkMode === "lag_dual";

    let strokeColor = "#10b981"; // Emerald: standard link
    let strokeDash = "none";
    let strokeWidth = "2.5";

    if (isWireless) {
      strokeColor = "#a855f7"; // Purple: RF bridge
      strokeDash = "6,4";
      strokeWidth = "3";
    }

    if (isDualLag) {
      [-6, 6].forEach(offset => {
        const dx = Math.abs(x2 - x1) * 0.5;
        const pathData = `M ${x1} ${y1 + offset} C ${x1 + dx} ${y1 + offset}, ${x2 - dx} ${y2 + offset}, ${x2} ${y2 + offset}`;

        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", pathData);
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", "#38bdf8");
        path.setAttribute("stroke-width", "2");
        path.setAttribute("opacity", "0.9");
        svg.appendChild(path);
      });

      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      const textBg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      textBg.setAttribute("x", midX - 25);
      textBg.setAttribute("y", midY - 9);
      textBg.setAttribute("width", "50");
      textBg.setAttribute("height", "18");
      textBg.setAttribute("rx", "4");
      textBg.setAttribute("fill", "#0369a1");
      svg.appendChild(textBg);

      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", midX);
      text.setAttribute("y", midY + 3.5);
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("fill", "#ffffff");
      text.setAttribute("font-size", "9");
      text.setAttribute("font-family", "monospace");
      text.setAttribute("font-weight", "bold");
      text.textContent = "2x LACP";
      svg.appendChild(text);

      linkCount += 2;
    } else {
      const dx = Math.abs(x2 - x1) * 0.5;
      const pathData = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", pathData);
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", strokeColor);
      path.setAttribute("stroke-width", strokeWidth);
      path.setAttribute("stroke-dasharray", strokeDash);
      path.setAttribute("opacity", "0.8");
      svg.appendChild(path);

      if (isPoEDrawn) {
        const poeHalo = document.createElementNS("http://www.w3.org/2000/svg", "path");
        poeHalo.setAttribute("d", pathData);
        poeHalo.setAttribute("fill", "none");
        poeHalo.setAttribute("stroke", "#f59e0b");
        poeHalo.setAttribute("stroke-width", "1.5");
        poeHalo.setAttribute("stroke-dasharray", "3,3");
        poeHalo.setAttribute("opacity", "0.9");
        svg.appendChild(poeHalo);
      }

      linkCount++;
    }
  });

  if (linksCountEl) linksCountEl.innerText = `${linkCount} Active Uplinks`;
}