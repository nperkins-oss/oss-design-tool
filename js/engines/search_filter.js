// ==========================================
// SEARCH & ATTRIBUTE FILTER ENGINE (NetSelect Enterprise)
// Pluggable Strategy Architecture, Multi-Attribute Runner & Filter Pills
// ==========================================

// Global safe icon & string fallback
if (typeof window.escapeHTML !== "function") {
  window.escapeHTML = function(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };
}

if (typeof window.safeCreateIcons !== "function") {
  window.safeCreateIcons = function(rootElement) {
    if (typeof lucide !== "undefined" && typeof lucide.createIcons === "function") {
      try {
        if (rootElement && rootElement instanceof Element) {
          lucide.createIcons({ root: rootElement });
        } else {
          lucide.createIcons();
        }
      } catch (e) {
        try { lucide.createIcons(); } catch (err) {}
      }
    }
  };
}

function matchesSearchTokens(item, query) {
  if (!query) return true;
  const cleanQ = query.toLowerCase().trim();
  const tokens = cleanQ.split(/\s+/).filter(Boolean);

  const rawFields = [
    item.model,
    item.sku,
    item.name,
    item.vendor,
    item.role,
    item.category,
    item.type,
    item.portFormFactorSummary,
    item.uplinksSummary,
    item.frequency,
    item.band,
    item.architecture,
    item.mounting,
    item.description,
    ...(item.keyFeatures || [])
  ].filter(Boolean).join(" ").toLowerCase();

  const normalizedFields = rawFields.replace(/[^a-z0-9]/g, "");

  return tokens.every(token => {
    if (rawFields.includes(token)) return true;
    const cleanToken = token.replace(/[^a-z0-9]/g, "");
    return cleanToken.length > 0 && normalizedFields.includes(cleanToken);
  });
}

function checkSwitchPortCategory(sw, targetCategories) {
  if (!targetCategories || targetCategories.length === 0) return true;
  return targetCategories.some(cat => {
    if (cat === 48) {
      return sw.portCategory === "48" || (sw.ports >= 48 && sw.ports <= 56);
    }
    if (cat === 24) {
      return sw.portCategory === "24" || (sw.ports >= 24 && sw.ports <= 32);
    }
    if (cat === 16) {
      return sw.portCategory === "16" || (sw.ports >= 14 && sw.ports <= 20);
    }
    if (cat === 8 || cat === 10) {
      return sw.portCategory === "compact" || sw.ports < 16;
    }
    return sw.ports === cat;
  });
}

function checkSwitchMultiGig(sw) {
  if (sw.hasMultiGig === true) return true;
  if (sw.portSpeed === "mGig" || sw.portSpeed === "2.5G" || sw.portSpeed === "5G") return true;

  const summary = (sw.portFormFactorSummary || "").toLowerCase();
  const model = (sw.model || "").toLowerCase();

  return summary.includes("mgig") ||
         summary.includes("2.5g") ||
         summary.includes("5g") ||
         summary.includes("100m/1g/2.5g") ||
         summary.includes("10gbase-t") ||
         model.includes("multigig") ||
         model.includes("multi-gig") ||
         model.includes("mgig");
}

function checkSwitchDemandFit(sw) {
  if (typeof calculatePoETarget !== "function") return true;
  const target = calculatePoETarget();
  if (!target || target.totalCameras === 0) return true;

  if (typeof NetworkSizer !== "undefined" && typeof NetworkSizer.auditSwitchFit === "function") {
    const plan = target.plan || NetworkSizer.calculatePoEPlan(target.demandCounts, {
      headroomPercent: target.headroomPercent || (typeof extraHeadroomPercent !== "undefined" ? extraHeadroomPercent : 20)
    });
    return NetworkSizer.auditSwitchFit(sw, plan).fits;
  }

  // Graceful fallback
  let downlinks = sw.ports;
  if (sw.portCategory === "48") downlinks = 48;
  else if (sw.portCategory === "24") downlinks = 24;
  else if (sw.portCategory === "16") downlinks = 16;
  else if (sw.portCategory === "compact") downlinks = 8;

  const { budgetWithHeadroom, totalCameras, demandCounts: dc } = target;
  if (downlinks < totalCameras) return false;
  if ((sw.poeBudget || 0) < budgetWithHeadroom) return false;

  if (dc && dc.bt90 > 0 && (sw.poeBt90Ports || 0) < dc.bt90) return false;
  const totalBt = (sw.poeBt60Ports || 0) + (sw.poeBt90Ports || 0);
  const requiredBt = dc ? (dc.bt60 + dc.bt90) : 0;
  if (requiredBt > 0 && totalBt < requiredBt) return false;

  return true;
}

// ==========================================
// PLUGGABLE FILTER ENGINE (Strategy Pattern)
// ==========================================
const FilterEngine = {
  _strategies: new Map(),

  /**
   * Registers a domain or sub-mode filtering strategy
   * @param {string} mode - e.g. "access", "backbone", "firewalls", "optics", "wireless", "accessories"
   * @param {Function} strategyFn - (items, context) => filteredItems
   */
  register(mode, strategyFn) {
    if (typeof strategyFn === "function") {
      this._strategies.set(mode, strategyFn);
    }
  },

  /**
   * Retrieves a registered strategy
   */
  get(mode) {
    return this._strategies.get(mode);
  },

  /**
   * Executes the matching strategy against a collection of hardware items
   */
  apply(mode, items, context = {}) {
    if (!Array.isArray(items)) return [];

    let filtered = items;
    const query = context.searchQuery || (typeof activeSearchQuery !== "undefined" ? activeSearchQuery : "");
    if (query && typeof matchesSearchTokens === "function") {
      filtered = filtered.filter(item => matchesSearchTokens(item, query));
    }

    const strategy = this._strategies.get(mode);
    if (typeof strategy === "function") {
      try {
        return strategy(filtered, context);
      } catch (err) {
        console.error(`[FilterEngine] Strategy for mode '${mode}' threw:`, err);
        return filtered;
      }
    }

    return filtered;
  }
};

// -----------------------------------------------------------
// REGISTER CORE DOMAIN STRATEGIES
// -----------------------------------------------------------

// 1. Networking Switch Strategy (Access & Backbone)
function filterSwitchesStrategy(items, ctx) {
  let results = items;
  const vendors = ctx.selectedVendors || (typeof selectedVendors !== "undefined" ? selectedVendors : []);
  const portCounts = ctx.selectedPortCounts || (typeof selectedPortCounts !== "undefined" ? selectedPortCounts : []);
  const uplinkSpeed = ctx.selectedUplinkSpeed || (typeof selectedUplinkSpeed !== "undefined" ? selectedUplinkSpeed : "all");
  const poeClasses = ctx.selectedPoEClasses || (typeof selectedPoEClasses !== "undefined" ? selectedPoEClasses : []);
  const isDemandFit = typeof ctx.requireDemandFit !== "undefined" ? ctx.requireDemandFit : (typeof requireDemandFit !== "undefined" && requireDemandFit);
  const activeMode = ctx.currentMode || (typeof currentMode !== "undefined" ? currentMode : "access");

  if (vendors.length > 0) results = results.filter(s => vendors.includes(s.vendor));
  if (portCounts.length > 0 && typeof checkSwitchPortCategory === "function") {
    results = results.filter(s => checkSwitchPortCategory(s, portCounts));
  }
  if (isDemandFit && activeMode === "access" && typeof checkSwitchDemandFit === "function") {
    results = results.filter(s => checkSwitchDemandFit(s));
  }

  if (uplinkSpeed && uplinkSpeed !== "all") {
    const sp = uplinkSpeed.toUpperCase();
    results = results.filter(s => {
      const bb = (s.maxBackboneSpeed || "").toUpperCase();
      const up = (s.uplinksSummary || "").toUpperCase();
      return bb === sp || up.includes(sp);
    });
  }

  if (typeof requireShallowDepth !== "undefined" && requireShallowDepth) {
    results = results.filter(s => s.shallowDepth === true || (s.depthInches > 0 && s.depthInches <= 12.0));
  }
  if (typeof requireDualPsu !== "undefined" && requireDualPsu) results = results.filter(s => s.dualPsu);
  if (typeof requireStacking !== "undefined" && requireStacking) results = results.filter(s => s.stacking);
  if (typeof requireTAA !== "undefined" && requireTAA) results = results.filter(s => s.taa);
  if (typeof requireSubstation !== "undefined" && requireSubstation) results = results.filter(s => s.substationCertified);
  if (typeof requirePerpetualPoE !== "undefined" && requirePerpetualPoE) results = results.filter(s => s.perpetualPoE);
  if (typeof requireDinMount !== "undefined" && requireDinMount) {
    results = results.filter(s => s.isDinMounted === true || (s.mounting && s.mounting.includes("DIN")));
  }
  if (typeof requireMultiGig !== "undefined" && requireMultiGig && typeof checkSwitchMultiGig === "function") {
    results = results.filter(s => checkSwitchMultiGig(s));
  }

  if (poeClasses.includes("at")) {
    results = results.filter(s => (s.poeAtPorts || 0) > 0 || (s.poeBt60Ports || 0) > 0 || (s.poeBt90Ports || 0) > 0 || (s.poeStandardsSupported && s.poeStandardsSupported.includes("802.3at")));
  }
  if (poeClasses.includes("bt60")) {
    results = results.filter(s => (s.poeBt60Ports || 0) > 0 || (s.poeBt90Ports || 0) > 0 || (s.poeStandardsSupported && s.poeStandardsSupported.includes("802.3bt-Type3")));
  }
  if (poeClasses.includes("bt90")) {
    results = results.filter(s => (s.poeBt90Ports || 0) > 0 || (s.poeStandardsSupported && (s.poeStandardsSupported.includes("802.3bt-Type4") || s.poeStandardsSupported.includes("PoH"))));
  }

  return results;
}
FilterEngine.register("access", filterSwitchesStrategy);
FilterEngine.register("backbone", filterSwitchesStrategy);

// 2. Gateway & Firewall Strategy
function filterFirewallsStrategy(items, ctx) {
  let results = items;
  const vendors = ctx.selectedFwVendors || (typeof selectedFwVendors !== "undefined" ? selectedFwVendors : []);
  const categories = ctx.selectedFwCategories || (typeof selectedFwCategories !== "undefined" ? selectedFwCategories : []);
  const tpGbps = typeof ctx.fwTargetThroughputGbps !== "undefined" ? ctx.fwTargetThroughputGbps : (typeof fwTargetThroughputGbps !== "undefined" ? fwTargetThroughputGbps : 0);
  const threatMbps = typeof ctx.fwTargetThreatMbps !== "undefined" ? ctx.fwTargetThreatMbps : (typeof fwTargetThreatMbps !== "undefined" ? fwTargetThreatMbps : 0);

  if (vendors.length > 0) results = results.filter(f => vendors.includes((f.vendor || '').trim()));
  if (categories.length > 0) results = results.filter(f => categories.includes((f.category || '').toLowerCase().trim()));

  if (tpGbps > 0) {
    results = results.filter(f => {
      const str = (f.statefulThroughput || "").toLowerCase().replace(/,/g, '');
      let val = parseFloat(str) || 0;
      if (str.includes("mbps")) val = val / 1000;
      return val >= tpGbps;
    });
  }

  if (threatMbps > 0) {
    results = results.filter(f => {
      const str = (f.threatThroughput || "").toLowerCase().replace(/,/g, '');
      let val = parseFloat(str) || 0;
      if (str.includes("gbps")) val = val * 1000;
      return val >= threatMbps;
    });
  }

  if (typeof requireFwRackmount !== "undefined" && requireFwRackmount) results = results.filter(f => (parseInt(f.rackUnits) || 0) >= 1);
  if (typeof requireFwCellular !== "undefined" && requireFwCellular) {
    results = results.filter(f => f.category === "cellular" || (f.keyFeatures || []).some(k => k.toLowerCase().includes("lte") || k.toLowerCase().includes("5g")));
  }
  if (typeof requireFwDualPsu !== "undefined" && requireFwDualPsu) results = results.filter(f => f.dualPsu === true);
  if (typeof requireFw10GWan !== "undefined" && requireFw10GWan) {
    results = results.filter(f => (f.interfaces || '').includes('10G') || (f.interfaces || '').includes('25G') || (f.wanPorts || '').includes('10G') || (f.wanPorts || '').includes('25G'));
  }
  if (typeof requireFwPoePorts !== "undefined" && requireFwPoePorts) {
    results = results.filter(f => (f.poeBudget || 0) > 0 || (f.interfaces || '').includes('PoE'));
  }

  return results;
}
FilterEngine.register("firewalls", filterFirewallsStrategy);

// 3. Optics & DACs Strategy
function filterOpticsStrategy(items, ctx) {
  let results = items;
  const mediums = ctx.selectedOpticMediums || (typeof selectedOpticMediums !== "undefined" ? selectedOpticMediums : []);
  const speeds = ctx.selectedOpticSpeeds || (typeof selectedOpticSpeeds !== "undefined" ? selectedOpticSpeeds : []);
  const vendors = ctx.selectedOpticVendors || (typeof selectedOpticVendors !== "undefined" ? selectedOpticVendors : []);
  const formFactor = ctx.selectedOpticFormFactor || (typeof selectedOpticFormFactor !== "undefined" ? selectedOpticFormFactor : "all");

  if (mediums.length > 0) results = results.filter(o => mediums.includes((o.medium || '').toLowerCase().trim()));
  if (speeds.length > 0) results = results.filter(o => speeds.includes((o.speed || '').trim()));
  if (vendors.length > 0) results = results.filter(o => vendors.includes((o.vendor || '').trim()));
  if (formFactor !== "all") results = results.filter(o => (o.formFactor || '').toLowerCase() === formFactor.toLowerCase());
  if (typeof requireOpticIndustrial !== "undefined" && requireOpticIndustrial) results = results.filter(o => o.industrial === true);

  return results;
}
FilterEngine.register("optics", filterOpticsStrategy);

// 4. Wireless PtP / PtMP Strategy
function filterWirelessStrategy(items, ctx) {
  let results = items;
  const distMiles = typeof ctx.wlTargetDistanceMiles !== "undefined" ? ctx.wlTargetDistanceMiles : (typeof wlTargetDistanceMiles !== "undefined" ? wlTargetDistanceMiles : 0);
  const tpMbps = typeof ctx.wlTargetThroughputMbps !== "undefined" ? ctx.wlTargetThroughputMbps : (typeof wlTargetThroughputMbps !== "undefined" ? wlTargetThroughputMbps : 0);
  const role = ctx.selectedWlTopologyRole || (typeof selectedWlTopologyRole !== "undefined" ? selectedWlTopologyRole : "all");
  const masterSku = ctx.selectedCompatibleMasterSku || (typeof selectedCompatibleMasterSku !== "undefined" ? selectedCompatibleMasterSku : "all");
  const stations = typeof ctx.minWlStations !== "undefined" ? ctx.minWlStations : (typeof minWlStations !== "undefined" ? minWlStations : 0);
  const vendors = ctx.selectedWlVendors || (typeof selectedWlVendors !== "undefined" ? selectedWlVendors : []);
  const freqs = ctx.selectedWlFrequencies || (typeof selectedWlFrequencies !== "undefined" ? selectedWlFrequencies : []);

  if (distMiles > 0) {
    results = results.filter(w => {
      const maxMiles = w.distanceMiles || w.rangeMiles || w.maxRangeMiles || ((w.distanceKm || 0) * 0.621371);
      return maxMiles >= distMiles;
    });
  }

  if (tpMbps > 0) {
    results = results.filter(w => {
      const mbps = w.maxThroughputMbps || ((w.throughputGbps || 0) * 1000);
      return mbps >= tpMbps;
    });
  }

  if (role !== "all") {
    results = results.filter(w => {
      const r = (w.topologyRole || "").toLowerCase();
      const top = (w.topology || w.type || "").toLowerCase();
      if (role === "ap") return r === "ap" || top.includes("ap") || top.includes("distribution");
      if (role === "ptp") return r === "ptp" || (top.includes("ptp") && !top.includes("ptmp ap"));
      if (role === "station") return r === "station" || top.includes("station") || top.includes("client");
      return true;
    });
  }

  if (masterSku !== "all") {
    results = results.filter(w => (w.sku === masterSku) || (w.compatibleMasterSkus || []).includes(masterSku));
  }

  if (stations > 0) {
    results = results.filter(w => (w.maxStations || 0) >= stations);
  }

  if (vendors.length > 0) {
    results = results.filter(w => {
      const v = (w.vendor || '').trim().toLowerCase();
      return vendors.some(sel => {
        const s = sel.trim().toLowerCase();
        return v === s || (s === 'unifi' && v === 'ubiquiti') || (s === 'ubiquiti' && v === 'unifi');
      });
    });
  }

  if (freqs.length > 0) {
    results = results.filter(w => {
      const cleanFreq = (w.frequency || '').toLowerCase().replace(/\s+/g, '');
      const band = (w.band || '').toLowerCase();
      return freqs.some(f => {
        const cleanF = f.toLowerCase().replace(/\s+/g, '');
        return cleanFreq.includes(cleanF) || band.includes(cleanF);
      });
    });
  }

  if (typeof requireWlBackup5G !== "undefined" && requireWlBackup5G) {
    results = results.filter(w => {
      const freq = (w.frequency || '').toLowerCase();
      const arch = (w.architecture || '').toLowerCase();
      return w.backup5GHz === true || freq.includes("5 ghz") || arch.includes("5ghz");
    });
  }

  return results;
}
FilterEngine.register("wireless", filterWirelessStrategy);

// 5. Infrastructure Accessories Strategy
function filterAccessoriesStrategy(items, ctx) {
  let results = items;
  const vendors = ctx.selectedAccVendors || (typeof selectedAccVendors !== "undefined" ? selectedAccVendors : []);
  const types = ctx.selectedAccTypes || (typeof selectedAccTypes !== "undefined" ? selectedAccTypes : []);
  const mounting = ctx.selectedAccMounting || (typeof selectedAccMounting !== "undefined" ? selectedAccMounting : "all");
  const minWatts = typeof ctx.accMinPowerWatts !== "undefined" ? ctx.accMinPowerWatts : (typeof accMinPowerWatts !== "undefined" ? accMinPowerWatts : 0);

  if (vendors.length > 0) results = results.filter(a => vendors.includes((a.vendor || '').trim()));
  if (types.length > 0) results = results.filter(a => types.includes(a.type) || types.includes(a.category));
  if (mounting !== "all") {
    results = results.filter(a => (a.mounting || "").toLowerCase().includes(mounting.toLowerCase()));
  }
  if (minWatts > 0) {
    results = results.filter(a => (a.powerWatts || 0) >= minWatts);
  }

  return results;
}
FilterEngine.register("accessories", filterAccessoriesStrategy);

// ==========================================
// ACTIVE FILTER PILLS DISPLAY
// ==========================================
function renderActiveFilterPills() {
  const container = document.getElementById("activeFilterPillsContainer");
  if (!container) return;

  const pills = [];

  if (typeof activeSearchQuery !== "undefined" && activeSearchQuery) {
    pills.push({
      label: `Search: "${activeSearchQuery}"`,
      onRemove: () => {
        if (typeof activeSearchQuery !== "undefined") activeSearchQuery = "";
        const el = document.getElementById("filterSearch");
        if (el) el.value = "";
      }
    });
  }

  // Switch Pills
  if (typeof currentMode !== "undefined" && (currentMode === "access" || currentMode === "backbone")) {
    if (typeof selectedVendors !== "undefined") {
      selectedVendors.forEach(v => pills.push({ label: `Vendor: ${v}`, onRemove: () => toggleFilterItem('vendor', v) }));
    }
    if (typeof selectedPortCounts !== "undefined") {
      selectedPortCounts.forEach(p => {
        const name = p === 48 ? "48-Port" : p === 24 ? "24-Port" : p === 16 ? "16-Port" : "Compact";
        pills.push({ label: `Density: ${name}`, onRemove: () => toggleFilterItem('ports', p) });
      });
    }
    if (typeof selectedUplinkSpeed !== "undefined" && selectedUplinkSpeed && selectedUplinkSpeed !== "all") {
      pills.push({ label: `Uplink: ${selectedUplinkSpeed}`, onRemove: () => setUplinkSpeedFilter('all') });
    }
    if (typeof requireDemandFit !== "undefined" && requireDemandFit) {
      pills.push({ label: `Fit: Security Demand`, onRemove: () => { requireDemandFit = false; } });
    }
    if (typeof selectedPoEClasses !== "undefined") {
      selectedPoEClasses.forEach(c => pills.push({ label: `PoE: ${c.toUpperCase()}`, onRemove: () => toggleFilterItem('poeClass', c) }));
    }
    if (typeof requireMultiGig !== "undefined" && requireMultiGig) pills.push({ label: "Multi-Gig", onRemove: () => { requireMultiGig = false; } });
    if (typeof requireShallowDepth !== "undefined" && requireShallowDepth) pills.push({ label: "Shallow Depth", onRemove: () => { requireShallowDepth = false; } });
    if (typeof requireStacking !== "undefined" && requireStacking) pills.push({ label: "Stackable", onRemove: () => { requireStacking = false; } });
    if (typeof requireDualPsu !== "undefined" && requireDualPsu) pills.push({ label: "Dual PSU", onRemove: () => { requireDualPsu = false; } });
    if (typeof requireDinMount !== "undefined" && requireDinMount) pills.push({ label: "DIN Mount", onRemove: () => { requireDinMount = false; } });
    if (typeof requirePerpetualPoE !== "undefined" && requirePerpetualPoE) pills.push({ label: "Perpetual PoE", onRemove: () => { requirePerpetualPoE = false; } });
    if (typeof requireTAA !== "undefined" && requireTAA) pills.push({ label: "TAA Compliant", onRemove: () => { requireTAA = false; } });
    if (typeof requireSubstation !== "undefined" && requireSubstation) pills.push({ label: "Substation", onRemove: () => { requireSubstation = false; } });
  }

  // Firewall Pills
  if (typeof currentMode !== "undefined" && currentMode === "firewalls") {
    if (typeof selectedFwVendors !== "undefined") {
      selectedFwVendors.forEach(v => pills.push({ label: `Vendor: ${v}`, onRemove: () => toggleFilterItem('fwVendor', v) }));
    }
    if (typeof selectedFwCategories !== "undefined") {
      selectedFwCategories.forEach(c => pills.push({ label: `Type: ${c}`, onRemove: () => toggleFilterItem('fwCategory', c) }));
    }
    if (typeof fwTargetThroughputGbps !== "undefined" && fwTargetThroughputGbps > 0) {
      pills.push({ label: `Routing: ${fwTargetThroughputGbps}+ Gbps`, onRemove: () => { fwTargetThroughputGbps = 0; if (typeof buildCalculatorStrip === "function") buildCalculatorStrip(); } });
    }
    if (typeof fwTargetThreatMbps !== "undefined" && fwTargetThreatMbps > 0) {
      pills.push({ label: `Threat: ${fwTargetThreatMbps >= 1000 ? (fwTargetThreatMbps/1000) + ' Gbps' : fwTargetThreatMbps + ' Mbps'}`, onRemove: () => { fwTargetThreatMbps = 0; if (typeof buildCalculatorStrip === "function") buildCalculatorStrip(); } });
    }
    if (typeof requireFwRackmount !== "undefined" && requireFwRackmount) pills.push({ label: "1U Rackmount", onRemove: () => { requireFwRackmount = false; } });
    if (typeof requireFwCellular !== "undefined" && requireFwCellular) pills.push({ label: "LTE/5G Failover", onRemove: () => { requireFwCellular = false; } });
    if (typeof requireFwDualPsu !== "undefined" && requireFwDualPsu) pills.push({ label: "Dual PSU", onRemove: () => { requireFwDualPsu = false; } });
    if (typeof requireFw10GWan !== "undefined" && requireFw10GWan) pills.push({ label: "10G/25G WAN", onRemove: () => { requireFw10GWan = false; } });
    if (typeof requireFwPoePorts !== "undefined" && requireFwPoePorts) pills.push({ label: "PoE Switch Ports", onRemove: () => { requireFwPoePorts = false; } });
  }

  // Optics Pills
  if (typeof currentMode !== "undefined" && currentMode === "optics") {
    if (typeof selectedOpticVendors !== "undefined") {
      selectedOpticVendors.forEach(v => pills.push({ label: `Vendor: ${v}`, onRemove: () => toggleFilterItem('opticVendor', v) }));
    }
    if (typeof selectedOpticMediums !== "undefined") {
      selectedOpticMediums.forEach(m => pills.push({ label: `Medium: ${m.toUpperCase()}`, onRemove: () => toggleFilterItem('opticMedium', m) }));
    }
    if (typeof selectedOpticSpeeds !== "undefined") {
      selectedOpticSpeeds.forEach(s => pills.push({ label: `Speed: ${s}`, onRemove: () => toggleFilterItem('opticSpeed', s) }));
    }
    if (typeof selectedOpticFormFactor !== "undefined" && selectedOpticFormFactor !== "all") {
      pills.push({ label: `Form: ${selectedOpticFormFactor}`, onRemove: () => { selectedOpticFormFactor = "all"; } });
    }
    if (typeof requireOpticIndustrial !== "undefined" && requireOpticIndustrial) pills.push({ label: "Industrial (-40°C)", onRemove: () => { requireOpticIndustrial = false; } });
  }

  // Wireless Pills
  if (typeof currentMode !== "undefined" && currentMode === "wireless") {
    if (typeof selectedWlVendors !== "undefined") {
      selectedWlVendors.forEach(v => pills.push({ label: `Vendor: ${v}`, onRemove: () => toggleFilterItem('wlVendor', v) }));
    }
    if (typeof selectedWlFrequencies !== "undefined") {
      selectedWlFrequencies.forEach(f => pills.push({ label: `Freq: ${f} GHz`, onRemove: () => toggleFilterItem('wlFreq', f) }));
    }
    if (typeof wlTargetDistanceMiles !== "undefined" && wlTargetDistanceMiles > 0) {
      pills.push({ label: `Min Range: ${wlTargetDistanceMiles} mi`, onRemove: () => { wlTargetDistanceMiles = 0; if (typeof buildCalculatorStrip === "function") buildCalculatorStrip(); } });
    }
    if (typeof wlTargetThroughputMbps !== "undefined" && wlTargetThroughputMbps > 0) {
      pills.push({ label: `Min Speed: ${wlTargetThroughputMbps >= 1000 ? (wlTargetThroughputMbps/1000) + ' Gbps' : wlTargetThroughputMbps + ' Mbps'}`, onRemove: () => { wlTargetThroughputMbps = 0; if (typeof buildCalculatorStrip === "function") buildCalculatorStrip(); } });
    }
    if (typeof selectedWlTopologyRole !== "undefined" && selectedWlTopologyRole !== "all") {
      pills.push({ label: `Role: ${selectedWlTopologyRole.toUpperCase()}`, onRemove: () => { selectedWlTopologyRole = "all"; } });
    }
    if (typeof selectedCompatibleMasterSku !== "undefined" && selectedCompatibleMasterSku !== "all") {
      pills.push({ label: `Master: ${selectedCompatibleMasterSku}`, onRemove: () => { selectedCompatibleMasterSku = "all"; } });
    }
    if (typeof minWlStations !== "undefined" && minWlStations > 0) {
      pills.push({ label: `Min Stations: ${minWlStations}+`, onRemove: () => { minWlStations = 0; } });
    }
    if (typeof requireWlBackup5G !== "undefined" && requireWlBackup5G) pills.push({ label: "5GHz Backup", onRemove: () => { requireWlBackup5G = false; } });
  }

  // Accessories Pills
  if (typeof currentMode !== "undefined" && currentMode === "accessories") {
    if (typeof selectedAccVendors !== "undefined") {
      selectedAccVendors.forEach(v => pills.push({ label: `Vendor: ${v}`, onRemove: () => toggleFilterItem('accVendor', v) }));
    }
    if (typeof selectedAccTypes !== "undefined") {
      selectedAccTypes.forEach(t => pills.push({ label: `Type: ${t.replace('_', ' ')}`, onRemove: () => toggleFilterItem('accType', t) }));
    }
    if (typeof selectedAccMounting !== "undefined" && selectedAccMounting !== "all") {
      pills.push({ label: `Mount: ${selectedAccMounting}`, onRemove: () => { selectedAccMounting = "all"; } });
    }
    if (typeof accMinPowerWatts !== "undefined" && accMinPowerWatts > 0) {
      pills.push({ label: `Min Power: ${accMinPowerWatts}W`, onRemove: () => { accMinPowerWatts = 0; if (typeof buildCalculatorStrip === "function") buildCalculatorStrip(); } });
    }
  }

  if (pills.length === 0) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = `
    <div class="flex flex-wrap items-center gap-1.5 py-1">
      <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1">Active:</span>
      ${pills.map((pill, idx) => `
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 shadow-sm">
          <span>${escapeHTML(pill.label)}</span>
          <button onclick="removeFilterPill(${idx})" class="text-slate-400 hover:text-rose-400 font-bold ml-0.5">&times;</button>
        </span>
      `).join('')}
      <button onclick="resetCurrentFilters()" class="text-xs text-indigo-400 hover:text-indigo-300 font-semibold px-2 py-0.5 ml-1">Clear All</button>
    </div>
  `;

  window._activePillRemovers = pills.map(p => p.onRemove);
  safeCreateIcons(container);
}

function removeFilterPill(idx) {
  if (window._activePillRemovers && window._activePillRemovers[idx]) {
    window._activePillRemovers[idx]();
    if (typeof buildSidebarFilters === "function") buildSidebarFilters();
    if (typeof runActiveFilter === "function") runActiveFilter();
  }
}

// Global Exports
window.FilterEngine = FilterEngine;
window.matchesSearchTokens = matchesSearchTokens;
window.checkSwitchPortCategory = checkSwitchPortCategory;
window.checkSwitchMultiGig = checkSwitchMultiGig;
window.checkSwitchDemandFit = checkSwitchDemandFit;
window.renderActiveFilterPills = renderActiveFilterPills;
window.removeFilterPill = removeFilterPill;