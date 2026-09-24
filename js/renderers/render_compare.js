// ==========================================
// SPEC COMPARISON MATRIX RENDERER (NetSelect Enterprise)
// Multi-Domain Side-by-Side Evaluation Engine
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

  const items = comparisonList.map(id => {
    return (typeof CatalogRegistry !== "undefined" && CatalogRegistry.get(id)) ||
           ((typeof SWITCH_DATABASE !== "undefined") ? SWITCH_DATABASE.find(s => s.id === id) : null) ||
           ((typeof FIREWALL_DATABASE !== "undefined") ? FIREWALL_DATABASE.find(f => f.sku === id) : null) ||
           ((typeof WIRELESS_DATABASE !== "undefined") ? WIRELESS_DATABASE.find(w => w.id === id) : null) ||
           ((typeof ACCESSORY_DATABASE !== "undefined") ? ACCESSORY_DATABASE.find(a => a.id === id || a.sku === id) : null);
  }).filter(Boolean);

  container.innerHTML = `
    <div class="overflow-x-auto">
      <table class="w-full text-xs text-left border-collapse">
        <thead>
          <tr class="border-b border-slate-800">
            <th class="p-3 text-slate-400 font-bold uppercase tracking-wider w-44">Feature</th>
            ${items.map(it => {
              const safeModel = escapeHTML(it.model || it.name || "Model");
              const safeVendor = escapeHTML(it.vendor || "Vendor");
              const safeSku = escapeHTML(it.sku || it.id || "");
              const safeId = escapeHTML(it.id || it.sku || "");

              return `
                <th class="p-3 min-w-[200px]">
                  <div class="flex items-center justify-between gap-2">
                    <span class="font-bold text-white text-sm">${safeModel}</span>
                    <button onclick="toggleCompareItem('${safeId}')" class="text-slate-500 hover:text-rose-400 transition-colors" title="Remove"><i data-lucide="x" class="w-4 h-4"></i></button>
                  </div>
                  <span class="text-[10px] font-mono text-slate-400">${safeVendor} &bull; ${safeSku}</span>
                </th>
              `;
            }).join('')}
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-800 font-mono">
          <tr><td class="p-3 text-slate-400">MSRP</td>${items.map(it => `<td class="p-3 text-emerald-400 font-bold">$${(it.msrp || 0).toLocaleString()}</td>`).join('')}</tr>
          <tr><td class="p-3 text-slate-400">Form / Interfaces</td>${items.map(it => `<td class="p-3 text-white">${escapeHTML(it.ports ? `${it.ports}x Ports` : (it.interfaces || it.category || 'N/A'))}</td>`).join('')}</tr>
          <tr><td class="p-3 text-slate-400">Power / PoE Budget</td>${items.map(it => `<td class="p-3 text-amber-400">${it.poeBudget ? `${it.poeBudget}W` : (it.powerWatts ? `${it.powerWatts}W` : 'N/A')}</td>`).join('')}</tr>
          <tr><td class="p-3 text-slate-400">VMS Packet Buffer</td>${items.map(it => `<td class="p-3 text-cyan-300">${it.packetBufferMb ? `${it.packetBufferMb} MB` : 'N/A'}</td>`).join('')}</tr>
          <tr><td class="p-3 text-slate-400">Uplinks / Speed</td>${items.map(it => `<td class="p-3 text-slate-300">${escapeHTML(it.uplinksSummary || it.maxThroughput || it.speed || 'Standard')}</td>`).join('')}</tr>
          <tr><td class="p-3 text-slate-400">Rack / Dimensions</td>${items.map(it => `<td class="p-3 text-slate-300">${escapeHTML(it.rackUnits ? `${it.rackUnits}U` : (it.depthInches ? `${it.depthInches}" depth` : it.mounting || 'N/A'))}</td>`).join('')}</tr>
          <tr><td class="p-3 text-slate-400">Stackable</td>${items.map(it => `<td class="p-3 ${it.stacking ? 'text-emerald-400' : 'text-slate-500'}">${it.stacking ? 'Yes' : 'No'}</td>`).join('')}</tr>
          <tr><td class="p-3 text-slate-400">Dual PSU / Redundancy</td>${items.map(it => `<td class="p-3 ${it.dualPsu ? 'text-emerald-400' : 'text-slate-500'}">${it.dualPsu ? 'Yes' : 'No'}</td>`).join('')}</tr>
          <tr><td class="p-3 text-slate-400">TAA / Compliance</td>${items.map(it => `<td class="p-3 ${it.taa ? 'text-emerald-400' : 'text-slate-500'}">${it.taa ? 'Compliant' : 'Commercial'}</td>`).join('')}</tr>
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
