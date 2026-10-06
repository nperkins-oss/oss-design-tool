// ==========================================
// SPEC COMPARISON MATRIX RENDERER (NetSelect Enterprise)
// Multi-Domain Side-by-Side Evaluation Engine
// Supports Switches, Cameras, Access Control, Firewalls & Servers
// ==========================================

let comparisonList = [];

function toggleCompareItem(id) {
  if (comparisonList.includes(id)) {
    comparisonList = comparisonList.filter(item => item !== id);
  } else {
    if (comparisonList.length >= 4) {
      if (typeof showToast === "function") showToast("Maximum 4 models can be compared simultaneously.");
      return;
    }
    comparisonList.push(id);
  }

  updateCompareBadge();
  if (typeof runActiveFilter === "function") runActiveFilter();
  renderCompareModalContent();
}

function updateCompareBadge() {
  const badge = document.getElementById("compareCountBadge");
  if (!badge) return;
  badge.innerText = comparisonList.length;
  if (comparisonList.length > 0) badge.classList.remove("hidden");
  else badge.classList.add("hidden");
}

function clearComparison() {
  comparisonList = [];
  updateCompareBadge();
  if (typeof runActiveFilter === "function") runActiveFilter();
  renderCompareModalContent();
  if (typeof showToast === "function") showToast("Comparison cleared.");
}

function toggleCompareModal() {
  const modal = document.getElementById("compareModal");
  if (!modal) return;
  if (modal.classList.contains("hidden")) {
    modal.classList.remove("hidden");
    renderCompareModalContent();
  } else {
    modal.classList.add("hidden");
  }
}

function resolveComparisonItem(id) {
  return (typeof CatalogRegistry !== "undefined" && typeof CatalogRegistry.get === "function" ? CatalogRegistry.get(id) : null) ||
         ((typeof SWITCH_DATABASE !== "undefined") ? SWITCH_DATABASE.find(s => s.id === id || s.sku === id) : null) ||
         ((typeof CAMERAS_DATABASE !== "undefined") ? CAMERAS_DATABASE.find(c => c.id === id || c.sku === id) : null) ||
         ((typeof ACCESS_CONTROL_DATABASE !== "undefined") ? ACCESS_CONTROL_DATABASE.find(a => a.id === id || a.sku === id) : null) ||
         ((typeof SERVERS_DATABASE !== "undefined") ? SERVERS_DATABASE.find(s => s.id === id || s.sku === id) : null) ||
         ((typeof FIREWALL_DATABASE !== "undefined") ? FIREWALL_DATABASE.find(f => f.sku === id || f.id === id) : null) ||
         ((typeof WIRELESS_DATABASE !== "undefined") ? WIRELESS_DATABASE.find(w => w.id === id || w.sku === id) : null) ||
         ((typeof ACCESSORY_DATABASE !== "undefined") ? ACCESSORY_DATABASE.find(a => a.id === id || a.sku === id) : null) ||
         ((typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) ? projectBOM.find(i => i.id === id || i.sku === id || i.instanceId === id) : null);
}

function detectItemDomain(item) {
  if (!item) return "general";
  const role = (item.role || "").toLowerCase();
  const cat = (item.category || "").toLowerCase();
  const model = (item.model || "").toLowerCase();

  if (role === "camera" || cat.includes("camera") || item.resolution || item.sensorMegapixels) return "camera";
  if (role === "access control" || cat.includes("access") || item.doorCapacity || item.readerCapacity) return "access";
  if (role === "server" || role === "compute & storage" || cat.includes("server") || item.usableStorageTb || item.rawCapacityTb) return "server";
  if (role.includes("wan") || role.includes("gateway") || cat.includes("firewall") || item.firewallThroughputGbps) return "firewall";
  if (role === "wireless bridge" || cat.includes("wireless") || item.frequency || item.maxRangeKm) return "wireless";
  if (role === "access" || role === "core" || role === "aggregation" || cat.includes("switch") || item.poeBudget !== undefined || item.ports) return "switch";
  return "general";
}

function renderCompareModalContent() {
  const container = document.getElementById("compareContent");
  if (!container) return;

  if (comparisonList.length === 0) {
    container.innerHTML = `
      <div class="py-20 text-center text-slate-500 space-y-2">
        <i data-lucide="columns-3" class="w-10 h-10 mx-auto text-slate-600"></i>
        <p class="text-sm font-semibold text-slate-400">Comparison Matrix is empty.</p>
        <p class="text-xs">Click "Compare" on up to 4 models across any domain to evaluate specs side-by-side.</p>
      </div>
    `;
    safeCreateIcons(container);
    return;
  }

  const items = comparisonList.map(resolveComparisonItem).filter(Boolean);

  if (items.length === 0) {
    container.innerHTML = `
      <div class="py-20 text-center text-slate-500 space-y-2">
        <p class="text-sm font-semibold text-slate-400">Selected models could not be resolved from active catalogs.</p>
        <button onclick="clearComparison()" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold">Clear Comparison</button>
      </div>
    `;
    return;
  }

  // Determine dominant domain
  const domainCounts = {};
  items.forEach(it => {
    const d = detectItemDomain(it);
    domainCounts[d] = (domainCounts[d] || 0) + 1;
  });
  let primaryDomain = "switch";
  let maxCount = 0;
  for (const [dom, cnt] of Object.entries(domainCounts)) {
    if (cnt > maxCount) {
      maxCount = cnt;
      primaryDomain = dom;
    }
  }

  // Domain Badge Title
  const domainTitles = {
    camera: "IP Surveillance Cameras & Sensors",
    access: "Access Control & Door Controllers",
    firewall: "Next-Gen Firewalls & Security Gateways",
    server: "Enterprise Compute & VMS Storage Appliances",
    wireless: "Wireless PtP / PtMP Radios",
    switch: "Network Core, Aggregation & PoE Switches",
    general: "Multi-Domain Hardware Evaluation"
  };

  // Build spec rows based on domain
  const rows = [];

  // Universal: MSRP
  rows.push({
    label: "MSRP Price",
    render: it => `<span class="text-emerald-400 font-bold">$${(it.msrp || 0).toLocaleString()}</span>`
  });

  if (primaryDomain === "camera") {
    rows.push({
      label: "Form Factor",
      render: it => `<span class="text-white">${escapeHTML(it.formFactor || "Dome / Eyeball")}</span>`
    });
    rows.push({
      label: "Resolution",
      render: it => `<span class="text-sky-300 font-bold">${escapeHTML(it.resolution || (it.sensorMegapixels ? `${it.sensorMegapixels} MP` : "2MP 1080p"))}</span>`
    });
    rows.push({
      label: "Lens & FOV",
      render: it => `<span class="text-slate-300">${escapeHTML(it.lens || "2.8-12mm Motorized")}${it.fovHorizontal ? ` (${it.fovHorizontal}° HFOV)` : ""}</span>`
    });
    rows.push({
      label: "IR Night Vision",
      render: it => `<span class="text-amber-300">${it.irIllumination ? (it.irRangeMeters ? `${it.irRangeMeters}m (${Math.round(it.irRangeMeters * 3.28)} ft)` : "Integrated IR LEDs") : "None (Low-Light Only)"}</span>`
    });
    rows.push({
      label: "WDR Dynamic Range",
      render: it => `<span class="text-cyan-300">${it.wdrDb ? `${it.wdrDb} dB Forensic WDR` : (it.wdr || "120 dB True WDR")}</span>`
    });
    rows.push({
      label: "Video Compression",
      render: it => `<span class="text-slate-300">${escapeHTML(it.compression || "H.265 / H.264 / MJPEG")}</span>`
    });
    rows.push({
      label: "Ratings (Ingress / IK)",
      render: it => `<span class="text-slate-300">${escapeHTML([it.environmentalRating, it.vandalRating].filter(Boolean).join(" • ") || "IP66 / IK10")}</span>`
    });
    rows.push({
      label: "PoE Power Draw",
      render: it => `<span class="text-amber-400 font-semibold">${it.poeStandard || "802.3af"} (${it.powerConsumptionWatts || it.baseWatts || 8}W Typ / ${it.maxPowerWatts || 15}W Max)</span>`
    });
    rows.push({
      label: "NDAA / TAA",
      render: it => `<span class="${it.taaCompliant || it.taa ? 'text-emerald-400 font-bold' : 'text-slate-500'}">${(it.taaCompliant || it.taa) ? 'NDAA & TAA Compliant' : 'Commercial'}</span>`
    });

  } else if (primaryDomain === "access") {
    rows.push({
      label: "Controlled Doors",
      render: it => `<span class="text-emerald-300 font-bold">${it.doorCapacity ? `${it.doorCapacity} Doors` : "1 Door"}</span>`
    });
    rows.push({
      label: "Reader Interfaces",
      render: it => `<span class="text-white">${it.readerCapacity ? `${it.readerCapacity} Readers` : "2 Readers"} (${Array.isArray(it.readerProtocols) ? it.readerProtocols.join(", ") : (it.readerProtocols || "OSDP v2 & Wiegand")})</span>`
    });
    rows.push({
      label: "Inputs & Relays",
      render: it => `<span class="text-slate-300">${it.supervisedInputs || 8} Supervised Inputs / ${it.relayOutputs || 4} Form-C Relays</span>`
    });
    rows.push({
      label: "Lock Power Output",
      render: it => `<span class="text-amber-300">${escapeHTML(it.strikeOutputPower || "12VDC @ 750mA Selectable")}</span>`
    });
    rows.push({
      label: "Power Source & PoE",
      render: it => `<span class="text-amber-400 font-semibold">${it.poeStandard || "802.3at"} (${it.powerConsumptionWatts || 25}W)</span>`
    });
    rows.push({
      label: "Mounting Enclosure",
      render: it => `<span class="text-slate-300">${escapeHTML(it.mounting || "DIN Rail / NEMA Cabinet")}</span>`
    });
    rows.push({
      label: "UL 294 / TAA",
      render: it => `<span class="${(it.ul294 || it.taaCompliant) ? 'text-emerald-400 font-bold' : 'text-slate-500'}">${(it.ul294 || it.taaCompliant) ? 'UL 294 Listed & TAA' : 'Commercial'}</span>`
    });

  } else if (primaryDomain === "firewall") {
    rows.push({
      label: "Stateful Firewall",
      render: it => `<span class="text-emerald-300 font-bold">${it.firewallThroughputGbps ? `${it.firewallThroughputGbps} Gbps` : (it.throughput || "Line-Rate")}</span>`
    });
    rows.push({
      label: "IPS / Threat Inspection",
      render: it => `<span class="text-sky-300 font-bold">${it.ipsThroughputGbps ? `${it.ipsThroughputGbps} Gbps` : (it.threatThroughput || "N/A")}</span>`
    });
    rows.push({
      label: "VPN Throughput",
      render: it => `<span class="text-slate-300">${it.vpnThroughputGbps ? `${it.vpnThroughputGbps} Gbps IPsec` : "Wire-Speed"}</span>`
    });
    rows.push({
      label: "Recommended Clients",
      render: it => `<span class="text-amber-300">${it.maxClients ? `${it.maxClients.toLocaleString()} Devices` : "Enterprise Scaled"}</span>`
    });
    rows.push({
      label: "WAN Interfaces",
      render: it => `<span class="text-white">${escapeHTML(it.wanPorts || it.wanInterfaces || "2x 10G SFP+ / 2.5G RJ45 (Dual-WAN Failover)")}</span>`
    });
    rows.push({
      label: "LAN Interfaces",
      render: it => `<span class="text-white">${escapeHTML(it.lanPorts || it.lanInterfaces || "8x GbE / 2x 10G SFP+")}</span>`
    });
    rows.push({
      label: "Form Factor",
      render: it => `<span class="text-slate-300">${it.rackUnits ? `${it.rackUnits}U Rackmount` : (it.formFactor || "1U Rackmount")}</span>`
    });

  } else if (primaryDomain === "server") {
    rows.push({
      label: "Usable / Raw Storage",
      render: it => `<span class="text-sky-300 font-bold">${it.usableStorageTb ? `${it.usableStorageTb} TB Usable (${it.rawCapacityTb || it.usableStorageTb} TB Raw)` : "Scalable Enterprise Storage"}</span>`
    });
    rows.push({
      label: "Drive Bays",
      render: it => `<span class="text-white">${escapeHTML(it.driveBays ? `${it.driveBays}x 3.5" Hot-Swap SAS/SATA` : "Hot-Swap Enterprise Bays")}</span>`
    });
    rows.push({
      label: "Hardware RAID",
      render: it => `<span class="text-slate-300">${escapeHTML(it.raidLevels || "RAID 0, 1, 5, 6, 10 (CacheVault NV)")}</span>`
    });
    rows.push({
      label: "VMS Channel Ingest",
      render: it => `<span class="text-emerald-300 font-bold">${it.maxCameras ? `Up to ${it.maxCameras} Cameras @ 4K` : (it.maxIngestBandwidthMbps ? `${it.maxIngestBandwidthMbps} Mbps Ingest` : "750 Mbps Sustained")}</span>`
    });
    rows.push({
      label: "Network Uplinks",
      render: it => `<span class="text-white">${escapeHTML(it.networkPorts || "2x 10G SFP+, 2x 1G RJ45")}</span>`
    });
    rows.push({
      label: "Power Supply",
      render: it => `<span class="text-amber-300">${it.dualPsu !== false ? "Dual Hot-Swap Redundant PSUs" : "Single High-Efficiency AC"}</span>`
    });
    rows.push({
      label: "Form Factor",
      render: it => `<span class="text-slate-300">${it.rackUnits ? `${it.rackUnits}U 19" EIA Rackmount` : "2U Rackmount"}</span>`
    });

  } else {
    // Default: Network Switch
    rows.push({
      label: "Port Density & Speed",
      render: it => `<span class="text-white">${escapeHTML(it.ports ? `${it.ports}x Ports` : (it.interfaces || it.category || "24x Ports"))}</span>`
    });
    rows.push({
      label: "PoE Power Budget",
      render: it => `<span class="text-amber-400 font-bold">${it.poeBudget ? `${it.poeBudget}W` : (it.powerWatts ? `${it.powerWatts}W` : "Non-PoE")}</span>`
    });
    rows.push({
      label: "PoE Standards",
      render: it => `<span class="text-slate-300">${escapeHTML(it.poeStandard || (it.poeBudget > 400 ? "802.3bt (60W/90W)" : (it.poeBudget > 0 ? "802.3at (PoE+ 30W)" : "N/A")))}</span>`
    });
    rows.push({
      label: "VMS Packet Buffer",
      render: it => `<span class="text-cyan-300 font-bold">${it.packetBufferMb ? `${it.packetBufferMb} MB Ultra-Deep` : "Standard"}</span>`
    });
    rows.push({
      label: "Uplinks & Speed",
      render: it => `<span class="text-white">${escapeHTML(it.uplinksSummary || it.maxThroughput || it.speed || "4x 10G SFP+")}</span>`
    });
    rows.push({
      label: "Switching Capacity",
      render: it => `<span class="text-slate-300">${it.switchingCapacityGbps ? `${it.switchingCapacityGbps} Gbps` : (it.capacity || "Wire-Speed L2/L3")}</span>`
    });
    rows.push({
      label: "Rack / Dimensions",
      render: it => `<span class="text-slate-300">${escapeHTML(it.rackUnits ? `${it.rackUnits}U 19" Rack` : (it.depthInches ? `${it.depthInches}" depth` : it.mounting || "1U"))}</span>`
    });
    rows.push({
      label: "Hardware Stacking",
      render: it => `<span class="${it.stacking ? 'text-emerald-400 font-bold' : 'text-slate-500'}">${it.stacking ? 'Supported (Virtual Ring)' : 'No'}</span>`
    });
    rows.push({
      label: "Dual / Redundant PSU",
      render: it => `<span class="${it.dualPsu ? 'text-emerald-400 font-bold' : 'text-slate-500'}">${it.dualPsu ? 'Modular Dual PSUs' : 'Fixed Internal PSU'}</span>`
    });
    rows.push({
      label: "TAA / Compliance",
      render: it => `<span class="${it.taa || it.taaCompliant ? 'text-emerald-400 font-bold' : 'text-slate-500'}">${(it.taa || it.taaCompliant) ? 'TAA Compliant' : 'Commercial'}</span>`
    });
  }

  container.innerHTML = `
    <div class="mb-3 px-1 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="text-xs font-bold text-white uppercase tracking-wider">${domainTitles[primaryDomain] || "Side-by-Side Spec Comparison"}</span>
        <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30 font-bold">${items.length} Models Selected</span>
      </div>
      <button onclick="clearComparison()" class="text-xs text-slate-400 hover:text-rose-400 font-medium transition-colors">Clear All</button>
    </div>

    <div class="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
      <table class="w-full text-xs text-left border-collapse">
        <thead>
          <tr class="border-b border-slate-800 bg-slate-900/90">
            <th class="p-3.5 text-slate-400 font-bold uppercase tracking-wider w-44">Specification</th>
            ${items.map(it => {
              const safeModel = escapeHTML(it.model || it.name || "Model");
              const safeVendor = escapeHTML(it.vendor || "Vendor");
              const safeSku = escapeHTML(it.sku || it.id || "");
              const safeId = escapeHTML(it.id || it.sku || "");
              const asset = (typeof CATALOG_ASSETS !== "undefined" ? (CATALOG_ASSETS[it.id] || CATALOG_ASSETS[it.sku]) : null) || {};
              const image = it.image || asset.image;
              const datasheet = it.datasheetPath || asset.datasheetPath;

              return `
                <th class="p-3.5 min-w-[230px] border-l border-slate-800/80 align-top">
                  ${image ? `
                    <div class="mb-2.5 w-full h-24 bg-slate-950/70 border border-slate-800/80 rounded-xl flex items-center justify-center p-2 relative overflow-hidden group/cmpimg cursor-pointer transition-all hover:border-brand-500/40" onclick="openProductImageModal('${image}', '${safeModel}', '${safeSku}')" title="Click to view full photo">
                      <img src="${image}" alt="${safeModel}" class="max-h-full max-w-full object-contain filter drop-shadow(0 4px 8px rgba(0,0,0,0.7)) transition-transform duration-300 group-hover/cmpimg:scale-105" loading="lazy" />
                      <div class="absolute bottom-1 right-1.5 opacity-0 group-hover/cmpimg:opacity-100 transition-opacity bg-slate-900/85 border border-slate-700/80 rounded px-1.5 py-0.5 text-[9px] text-slate-300 font-mono flex items-center gap-1">
                        <i data-lucide="zoom-in" class="w-2.5 h-2.5 text-brand-400"></i> Zoom
                      </div>
                    </div>
                  ` : ''}
                  <div class="flex items-start justify-between gap-2">
                    <span class="font-bold text-white text-sm leading-tight">${safeModel}</span>
                    <button onclick="toggleCompareItem('${safeId}')" class="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-slate-800 transition-colors" title="Remove"><i data-lucide="x" class="w-3.5 h-3.5"></i></button>
                  </div>
                  <div class="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span class="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">${safeVendor}</span>
                    <span class="text-[10px] font-mono text-slate-400">${safeSku}</span>
                  </div>
                  ${datasheet ? `
                    <div class="mt-2.5">
                      <button onclick="openDatasheetModal('${datasheet}', '${safeModel}', '${safeSku}')" class="w-full py-1.5 px-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm">
                        <i data-lucide="file-text" class="w-3.5 h-3.5 text-rose-400"></i>
                        <span>Engineering Datasheet</span>
                      </button>
                    </div>
                  ` : ''}
                </th>
              `;
            }).join('')}
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-800/80 font-mono">
          ${rows.map(row => `
            <tr class="hover:bg-slate-900/40 transition-colors">
              <td class="p-3 text-slate-400 font-semibold font-sans bg-slate-950/40">${row.label}</td>
              ${items.map(it => `<td class="p-3 border-l border-slate-800/60">${row.render(it)}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;

  safeCreateIcons(container);
}

// Global window bindings
window.comparisonList = comparisonList;
window.toggleCompareItem = toggleCompareItem;
window.updateCompareBadge = updateCompareBadge;
window.clearComparison = clearComparison;
window.toggleCompareModal = toggleCompareModal;
window.renderCompareModalContent = renderCompareModalContent;
window.resolveComparisonItem = resolveComparisonItem;
window.detectItemDomain = detectItemDomain;
