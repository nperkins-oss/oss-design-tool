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

function checkSwitchFormFactor(sw, selectedForms) {
  if (!selectedForms || selectedForms.length === 0) return true;
  return selectedForms.some(form => {
    if (form === "rackmount") {
      return (sw.rackUnits && sw.rackUnits > 0) || (sw.mounting && sw.mounting.toLowerCase().includes("rack"));
    }
    if (form === "desktop") {
      return sw.rackUnits === 0 || (sw.mounting && (sw.mounting.toLowerCase().includes("desktop") || sw.mounting.toLowerCase().includes("wall")));
    }
    if (form === "outdoor") {
      return sw.outdoor === true || 
             (sw.ipRating && /ip55|ip6|nema/i.test(sw.ipRating)) ||
             (sw.mounting && /outdoor|pole|nema/i.test(sw.mounting)) ||
             sw.sku === "USW-Flex" || sw.sku === "USW-Ultra" || (sw.model && (sw.model.toLowerCase().includes("outdoor") || sw.model.toLowerCase().includes("hardened")));
    }
    if (form === "din") {
      return sw.isDinMounted === true || (sw.mounting && /din/i.test(sw.mounting));
    }
    return true;
  });
}
window.checkSwitchFormFactor = checkSwitchFormFactor;

function checkSwitchFanless(sw) {
  if (sw.fanless === true || sw.acousticNoiseDba === 0 || sw.fans === 0) return true;
  const kf = (sw.keyFeatures || []).join(" ").toLowerCase();
  const desc = (sw.description || "").toLowerCase();
  const model = (sw.model || "").toLowerCase();
  return /fanless|silent|passive cooling|passively cooled|0 db/i.test(kf) ||
         /fanless|silent|0 db/i.test(desc) ||
         /fanless/i.test(model) ||
         sw.sku === "USW-Flex" || sw.sku === "USW-Ultra" || sw.sku === "USW-Flex-Mini" ||
         sw.sku === "USW-Lite-8-PoE" || sw.sku === "USW-Lite-16-PoE" || sw.sku === "USW-24" ||
         sw.sku === "USW-Industrial" || sw.sku === "ICX7150-C12P" || sw.sku === "ICX7150-C08PT" ||
         sw.sku === "EX2300-C-12P" || sw.sku === "EX2300-C-12T" || sw.sku === "EX2300-24T" ||
         sw.sku === "MS120-8" || sw.sku === "MS120-8FP";
}
window.checkSwitchFanless = checkSwitchFanless;

function checkSwitchPoEPowered(sw) {
  if (sw.poePowered === true || sw.poePassthrough === true) return true;
  const kf = (sw.keyFeatures || []).join(" ").toLowerCase();
  const desc = (sw.description || "").toLowerCase();
  return /powered by poe|poe passthrough|poe in|poe input/i.test(kf) ||
         /poe-powered|poe passthrough/i.test(desc) ||
         sw.sku === "USW-Flex" || sw.sku === "USW-Ultra" || sw.sku === "USW-Flex-Mini" ||
         sw.sku === "ICX7150-C08PT" || sw.sku === "UACC-LRE";
}
window.checkSwitchPoEPowered = checkSwitchPoEPowered;

function checkSwitchDcPower(sw) {
  if (sw.dcPowered === true || sw.powerInput === "DC" || sw.isDinMounted === true) return true;
  const kf = (sw.keyFeatures || []).join(" ").toLowerCase();
  const desc = (sw.description || "").toLowerCase();
  return /12-48vdc|48-56vdc|12-56vdc|dc terminal|terminal block|redundant terminal/i.test(kf) ||
         /dc power|terminal block/i.test(desc) ||
         sw.vendor === "AMG";
}
window.checkSwitchDcPower = checkSwitchDcPower;

function checkSwitchLayer3(sw) {
  if (sw.layer3 === true || sw.routing === true || sw.l3 === true) return true;
  if (sw.role === "Core" || sw.role === "Aggregation") return true;
  const kf = (sw.keyFeatures || []).join(" ").toLowerCase();
  const desc = (sw.description || "").toLowerCase();
  const model = (sw.model || "").toLowerCase();
  return /layer 3|inter-vlan routing|static routing|ospf|dhcp server|dynamic routing/i.test(kf) ||
         /layer 3/i.test(desc) ||
         /pro-max|enterprise|icx 7650|icx 8200|ex4100|ex4400|x530/i.test(model) ||
         (sw.sku && (sw.sku.includes("Pro-") || sw.sku.includes("Enterprise-") || sw.sku.includes("Pro-Max-") || sw.sku.includes("XG-")));
}
window.checkSwitchLayer3 = checkSwitchLayer3;

function getSwitchManagementLayer(sw) {
  const mgmt = (sw.mgmtLabel || "").toLowerCase();
  const desc = (sw.description || "").toLowerCase();
  const model = (sw.model || "").toLowerCase();
  const kf = (sw.keyFeatures || []).join(" ").toLowerCase();

  if (sw.unmanaged === true || mgmt.includes("unmanaged") || model.includes("unmanaged") || desc.includes("unmanaged") || kf.includes("unmanaged")) {
    return "unmanaged";
  }
  if (typeof checkSwitchLayer3 === "function" && checkSwitchLayer3(sw)) {
    return "l3";
  }
  return "l2";
}
window.getSwitchManagementLayer = getSwitchManagementLayer;

function checkOpticReach(opt, reach) {
  if (!reach || reach === "all") return true;
  const name = (opt.name || "").toLowerCase();
  const desc = (opt.description || "").toLowerCase();
  const sku = (opt.sku || "").toLowerCase();
  const medium = (opt.medium || "").toLowerCase();
  const optReach = (opt.reach || "").toLowerCase();
  const combined = `${sku} ${name} ${desc} ${optReach}`;

  if (reach === "patch") {
    return medium === "dac" || medium === "stacking" || /\b(0\.5|1|2|3|5)m\b/i.test(name) || (optReach.includes("m") && !optReach.includes("km"));
  }
  if (reach === "short") {
    return (medium === "mmf" || /sr\b|sx\b|100m|300m|500m|550m|multimode/i.test(combined)) && !/\b(10km|20km|40km|80km|lr|lx|er|zr)\b/i.test(combined);
  }
  if (reach === "long") {
    return (/\b(10km|20km|3km|lr|lx)\b/i.test(combined) || optReach === "10km" || (medium === "smf" && !/40km|80km|er|zr/i.test(combined))) && !/\b(40km|80km|er|zr)\b/i.test(combined);
  }
  if (reach === "extended") {
    return /\b(40km|80km|er|zr)\b/i.test(combined) || optReach === "40km" || optReach === "80km";
  }
  return true;
}
window.checkOpticReach = checkOpticReach;

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
  const isModularUplink = typeof ctx.requireModularUplink !== "undefined" 
    ? ctx.requireModularUplink 
    : ((typeof requireModularUplink !== "undefined" && requireModularUplink) || (typeof window.requireModularUplink !== "undefined" && window.requireModularUplink));
  if (isModularUplink) {
    results = results.filter(s => s.modularUplink && s.modularUplink.hasSlot);
  }
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

  const switchLayers = ctx.selectedSwitchLayers || (typeof selectedSwitchLayers !== "undefined" ? selectedSwitchLayers : []);
  if (switchLayers.length > 0 && typeof getSwitchManagementLayer === "function") {
    results = results.filter(s => {
      const lay = getSwitchManagementLayer(s);
      return switchLayers.includes(lay);
    });
  }

  if (poeClasses.includes("at")) {
    results = results.filter(s => (s.poeAtPorts || 0) > 0 || (s.poeBt60Ports || 0) > 0 || (s.poeBt90Ports || 0) > 0 || (s.poeStandardsSupported && s.poeStandardsSupported.includes("802.3at")));
  }
  if (poeClasses.includes("bt60")) {
    results = results.filter(s => (s.poeBt60Ports || 0) > 0 || (s.poeBt90Ports || 0) > 0 || (s.poeStandardsSupported && s.poeStandardsSupported.includes("802.3bt-Type3")));
  }
  const isPoEBt90Req = typeof ctx.requirePoEBt90 !== "undefined" ? ctx.requirePoEBt90 : (typeof requirePoEBt90 !== "undefined" && requirePoEBt90);
  if (poeClasses.includes("bt90") || isPoEBt90Req) {
    results = results.filter(s => 
      (s.poeBt90Ports || 0) > 0 || 
      (s.poeStandardsSupported && (s.poeStandardsSupported.includes("802.3bt-Type4") || s.poeStandardsSupported.includes("PoH") || s.poeStandardsSupported.includes("bt90"))) ||
      (s.keyFeatures || []).some(k => /90w|95w|poh|bt\s*type\s*4|class\s*8/i.test(k)) ||
      /90w|95w|poh/i.test(s.description || "") ||
      /bt-90|bt90/i.test(s.sku || "")
    );
  }

  const isIndustrialReq = typeof ctx.requireIndustrialHardened !== "undefined" ? ctx.requireIndustrialHardened : (typeof requireIndustrialHardened !== "undefined" && requireIndustrialHardened);
  if (isIndustrialReq) {
    results = results.filter(s => 
      s.isDinMounted === true || 
      (s.operatingTempMinC !== undefined && s.operatingTempMinC <= -20) || 
      (s.keyFeatures || []).some(k => /hardened|industrial|substation/i.test(k)) ||
      s.substationCertified === true
    );
  }

  const formFactors = ctx.selectedFormFactors || (typeof selectedFormFactors !== "undefined" ? selectedFormFactors : []);
  if (formFactors.length > 0 && typeof checkSwitchFormFactor === "function") {
    results = results.filter(s => checkSwitchFormFactor(s, formFactors));
  }

  const isFanlessReq = typeof ctx.requireFanless !== "undefined" ? ctx.requireFanless : (typeof requireFanless !== "undefined" && requireFanless);
  if (isFanlessReq && typeof checkSwitchFanless === "function") {
    results = results.filter(s => checkSwitchFanless(s));
  }

  const isPoEPoweredReq = typeof ctx.requirePoEPowered !== "undefined" ? ctx.requirePoEPowered : (typeof requirePoEPowered !== "undefined" && requirePoEPowered);
  if (isPoEPoweredReq && typeof checkSwitchPoEPowered === "function") {
    results = results.filter(s => checkSwitchPoEPowered(s));
  }

  const isDcPowerReq = typeof ctx.requireDcPower !== "undefined" ? ctx.requireDcPower : (typeof requireDcPower !== "undefined" && requireDcPower);
  if (isDcPowerReq && typeof checkSwitchDcPower === "function") {
    results = results.filter(s => checkSwitchDcPower(s));
  }

  const isLayer3Req = typeof ctx.requireLayer3 !== "undefined" ? ctx.requireLayer3 : (typeof requireLayer3 !== "undefined" && requireLayer3);
  if (isLayer3Req && typeof checkSwitchLayer3 === "function") {
    results = results.filter(s => checkSwitchLayer3(s));
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

  const isRackReq = typeof ctx.requireFwRackmount !== "undefined" ? ctx.requireFwRackmount : (typeof requireFwRackmount !== "undefined" && requireFwRackmount);
  if (isRackReq) results = results.filter(f => (parseInt(f.rackUnits) || 0) >= 1);

  const isCellReq = typeof ctx.requireFwCellular !== "undefined" ? ctx.requireFwCellular : (typeof requireFwCellular !== "undefined" && requireFwCellular);
  if (isCellReq) {
    results = results.filter(f => f.category === "cellular" || (f.keyFeatures || []).some(k => k.toLowerCase().includes("lte") || k.toLowerCase().includes("5g")));
  }

  const isDualPsuReq = typeof ctx.requireFwDualPsu !== "undefined" ? ctx.requireFwDualPsu : (typeof requireFwDualPsu !== "undefined" && requireFwDualPsu);
  if (isDualPsuReq) results = results.filter(f => f.dualPsu === true);

  const is10GWanReq = typeof ctx.requireFw10GWan !== "undefined" ? ctx.requireFw10GWan : (typeof requireFw10GWan !== "undefined" && requireFw10GWan);
  if (is10GWanReq) {
    results = results.filter(f => (f.interfaces || '').includes('10G') || (f.interfaces || '').includes('25G') || (f.wanPorts || '').includes('10G') || (f.wanPorts || '').includes('25G'));
  }

  const isPoeReq = typeof ctx.requireFwPoePorts !== "undefined" ? ctx.requireFwPoePorts : (typeof requireFwPoePorts !== "undefined" && requireFwPoePorts);
  if (isPoeReq) {
    results = results.filter(f => (f.poeBudget || 0) > 0 || (f.interfaces || '').includes('PoE'));
  }

  const isHaReq = typeof ctx.requireFwHA !== "undefined" ? ctx.requireFwHA : (typeof requireFwHA !== "undefined" && requireFwHA);
  if (isHaReq) {
    results = results.filter(f => (f.keyFeatures || []).some(k => /shadow\s*mode|high\s*availability|\bha\b|vrrp/i.test(k)) || /shadow\s*mode|high\s*availability|\bha\b|vrrp/i.test(f.description || ''));
  }

  const is25GWanReq = typeof ctx.requireFw25GWan !== "undefined" ? ctx.requireFw25GWan : (typeof requireFw25GWan !== "undefined" && requireFw25GWan);
  if (is25GWanReq) {
    results = results.filter(f => (f.interfaces || '').includes('25G') || (f.wanPorts || '').includes('25G') || (f.uplinksSummary || '').includes('25G') || f.maxBackboneSpeed === '25G' || f.portSpeed === '25G');
  }

  const isStorageReq = typeof ctx.requireFwStorage !== "undefined" ? ctx.requireFwStorage : (typeof requireFwStorage !== "undefined" && requireFwStorage);
  if (isStorageReq) {
    results = results.filter(f => (f.keyFeatures || []).some(k => /3\.5"|hdd|ssd|nvr|storage/i.test(k)) || /nvr|storage/i.test(f.description || ''));
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
  const reach = ctx.selectedOpticReach || (typeof selectedOpticReach !== "undefined" ? selectedOpticReach : "all");

  if (mediums.length > 0) results = results.filter(o => mediums.includes((o.medium || '').toLowerCase().trim()));
  if (speeds.length > 0) results = results.filter(o => speeds.includes((o.speed || '').trim()));
  if (vendors.length > 0) results = results.filter(o => vendors.includes((o.vendor || '').trim()));
  if (formFactor !== "all") results = results.filter(o => (o.formFactor || '').toLowerCase() === formFactor.toLowerCase());
  if (reach !== "all" && typeof checkOpticReach === "function") results = results.filter(o => checkOpticReach(o, reach));

  const isIndReq = typeof ctx.requireOpticIndustrial !== "undefined" ? ctx.requireOpticIndustrial : (typeof requireOpticIndustrial !== "undefined" && requireOpticIndustrial);
  if (isIndReq) results = results.filter(o => o.industrial === true);

  const isBiDiReq = typeof ctx.requireOpticBiDi !== "undefined" ? ctx.requireOpticBiDi : (typeof requireOpticBiDi !== "undefined" && requireOpticBiDi);
  if (isBiDiReq) {
    results = results.filter(o => o.bidi === true || /bidi|simplex|single[\s-]strand|wdm/i.test((o.name || '') + ' ' + (o.description || '') + ' ' + (o.sku || '')));
  }

  const dacLength = ctx.selectedDacLength || (typeof selectedDacLength !== "undefined" ? selectedDacLength : "all");
  if (dacLength !== "all") {
    results = results.filter(o => {
      const isDac = (o.medium || '').toLowerCase() === 'dac';
      const isStacking = (o.medium || '').toLowerCase() === 'stacking';
      if (!isDac && !isStacking) return false;
      const targetLen = parseFloat(dacLength);
      if (o.lengthMeters !== undefined && Math.abs(o.lengthMeters - targetLen) < 0.05) return true;
      const combined = `${o.sku} ${o.name} ${o.reach || ''}`.toLowerCase();
      if (dacLength === "0.5m" || dacLength === "0.5") {
        return /0\.5m|50cm/i.test(combined);
      }
      return combined.includes(dacLength.toLowerCase()) || (combined.includes(`${targetLen}m`) && !combined.includes(`${targetLen}0m`));
    });
  }

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
  const rangeTier = ctx.selectedWlRangeTier || (typeof selectedWlRangeTier !== "undefined" ? selectedWlRangeTier : "all");

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

  if (rangeTier !== "all") {
    results = results.filter(w => {
      const km = parseFloat(w.distanceKm || w.rangeKm || w.maxRangeKm || ((w.distanceMiles || w.rangeMiles || 0) * 1.60934) || 0);
      if (rangeTier === "short") return km > 0 && km <= 1.0;
      if (rangeTier === "medium") return km > 1.0 && km <= 5.0;
      if (rangeTier === "long") return km > 5.0;
      return true;
    });
  }

  const is60GReq = typeof ctx.requireWl60GHz !== "undefined" ? ctx.requireWl60GHz : (typeof requireWl60GHz !== "undefined" && requireWl60GHz);
  if (is60GReq) {
    results = results.filter(w => (w.frequency || '').includes('60') || (w.band || '').includes('60') || (w.keyFeatures || []).some(k => k.includes('60 GHz')));
  }

  const isBackupReq = typeof ctx.requireWlBackup5G !== "undefined" ? ctx.requireWlBackup5G : (typeof requireWlBackup5G !== "undefined" && requireWlBackup5G);
  if (isBackupReq) {
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
  const subCategory = ctx.selectedAccSubCategory || (typeof selectedAccSubCategory !== "undefined" ? selectedAccSubCategory : "all");
  const vendors = ctx.selectedAccVendors || (typeof selectedAccVendors !== "undefined" ? selectedAccVendors : []);
  const types = ctx.selectedAccTypes || (typeof selectedAccTypes !== "undefined" ? selectedAccTypes : []);
  const mounting = ctx.selectedAccMounting || (typeof selectedAccMounting !== "undefined" ? selectedAccMounting : "all");
  const minWatts = typeof ctx.accMinPowerWatts !== "undefined" ? ctx.accMinPowerWatts : (typeof accMinPowerWatts !== "undefined" ? accMinPowerWatts : 0);
  const pwrCat = ctx.selectedUpsCategory || (typeof selectedUpsCategory !== "undefined" ? selectedUpsCategory : "all");
  const pwrVolt = ctx.selectedUpsVoltage || (typeof selectedUpsVoltage !== "undefined" ? selectedUpsVoltage : "all");

  if (subCategory && subCategory !== "all") {
    results = results.filter(a => {
      if (a.subCategory === subCategory) return true;
      if (subCategory === "mounts" && (a.type === "mounting" || a.category === "mounting" || a.type === "rack_kit" || a.type === "wall_bracket" || (a.role && (a.role.toLowerCase().includes("mount") || a.role.toLowerCase().includes("rail"))))) return true;
      if (subCategory === "media_converters" && (a.type === "media_converter" || a.category === "media_converter")) return true;
      if (subCategory === "licenses" && (a.type === "license" || a.category === "licenses" || a.type === "feature_license" || a.type === "cloud_subscription" || (a.role && a.role.toLowerCase().includes("license")))) return true;
      if (subCategory === "modular_uplinks" && (a.type === "modular_uplink" || a.category === "modular_uplinks" || a.type === "network_card" || a.category === "network_card" || (a.role && (a.role.toLowerCase().includes("modular") || a.role.toLowerCase().includes("expansion") || a.role.toLowerCase().includes("network card"))))) return true;
      if (subCategory === "power_supplies" && (a.type === "power_supply" || a.category === "power_supplies" || (a.role && a.role.toLowerCase().includes("power supply")))) return true;
      if (subCategory === "poe_injectors" && (a.type === "poe_injector" || a.type === "poe_splitter" || a.category === "power_injector" || (a.role && a.role.toLowerCase().includes("injector")))) return true;
      if (subCategory === "environmental" && (a.type === "environmental_probe" || a.category === "environmental_sensor" || (a.role && (a.role.toLowerCase().includes("environmental") || a.role.toLowerCase().includes("sensor"))))) return true;
      return false;
    });
  }

  if (vendors.length > 0) results = results.filter(a => vendors.includes((a.vendor || '').trim()));
  if (types.length > 0) results = results.filter(a => types.includes(a.type) || types.includes(a.category));
  if (mounting !== "all") {
    results = results.filter(a => (a.mounting || "").toLowerCase().includes(mounting.toLowerCase()));
  }
  if (minWatts > 0) {
    results = results.filter(a => (a.powerWatts || 0) >= minWatts);
  }

  if (pwrCat !== "all") {
    if (pwrCat === "ups") {
      results = results.filter(a => (a.type === "ups" || a.category === "ups") && !a.isEbp && !a.isPdu && a.type !== "power_cord");
    } else if (pwrCat === "ebp") {
      results = results.filter(a => a.type === "ebp" || a.isEbp);
    } else if (pwrCat === "pdu") {
      results = results.filter(a => a.type === "pdu" || a.isPdu);
    } else if (pwrCat === "power_cord") {
      results = results.filter(a => a.type === "power_cord");
    }
  }

  if (pwrVolt !== "all") {
    const vNum = parseInt(pwrVolt, 10);
    results = results.filter(a => {
      const inV = a.inputVoltage || 0;
      const outV = a.outputVoltage || 0;
      if (vNum === 120) return inV === 120 || outV === 120;
      if (vNum === 240) return inV >= 200 || outV >= 200;
      return true;
    });
  }

  const isSineReq = typeof ctx.requireUpsSineWave !== "undefined" ? ctx.requireUpsSineWave : (typeof requireUpsSineWave !== "undefined" && requireUpsSineWave);
  if (isSineReq) {
    results = results.filter(a => (a.keyFeatures || []).some(k => /pure\s*sine/i.test(k)) || /pure\s*sine/i.test((a.model || '') + ' ' + (a.name || '') + ' ' + (a.description || '')));
  }

  const isOnlineReq = typeof ctx.requireUpsOnline !== "undefined" ? ctx.requireUpsOnline : (typeof requireUpsOnline !== "undefined" && requireUpsOnline);
  if (isOnlineReq) {
    results = results.filter(a => (a.keyFeatures || []).some(k => /online\s*double|double-conversion|0\s*ms/i.test(k)) || /online/i.test((a.model || '') + ' ' + (a.name || '')));
  }

  const isEbmReq = typeof ctx.requireUpsEbm !== "undefined" ? ctx.requireUpsEbm : (typeof requireUpsEbm !== "undefined" && requireUpsEbm);
  if (isEbmReq) {
    results = results.filter(a => (a.keyFeatures || []).some(k => /external\s*battery|scalable\s*runtime|battery\s*pack|ebm/i.test(k)));
  }

  return results;
}

FilterEngine.register("accessories", filterAccessoriesStrategy);
FilterEngine.register("racks", filterAccessoriesStrategy);
FilterEngine.register("enclosures", filterAccessoriesStrategy);
FilterEngine.register("pathways", filterAccessoriesStrategy);

// 6. UPS Power Systems Strategy
function filterUpsStrategy(items, ctx) {
  let results = items;
  const vendors = ctx.selectedAccVendors || (typeof selectedAccVendors !== "undefined" ? selectedAccVendors : []);
  const category = ctx.selectedUpsCategory || (typeof selectedUpsCategory !== "undefined" ? selectedUpsCategory : "all");
  const voltage = ctx.selectedUpsVoltage || (typeof selectedUpsVoltage !== "undefined" ? selectedUpsVoltage : "all");
  const inputPlug = ctx.selectedUpsInputPlug || (typeof selectedUpsInputPlug !== "undefined" ? selectedUpsInputPlug : "all");
  const minWatts = typeof ctx.accMinPowerWatts !== "undefined" ? ctx.accMinPowerWatts : (typeof accMinPowerWatts !== "undefined" ? accMinPowerWatts : 0);
  const isSineWave = typeof ctx.requireUpsSineWave !== "undefined" ? ctx.requireUpsSineWave : (typeof requireUpsSineWave !== "undefined" && requireUpsSineWave);
  const isOnline = typeof ctx.requireUpsOnline !== "undefined" ? ctx.requireUpsOnline : (typeof requireUpsOnline !== "undefined" && requireUpsOnline);
  const isEbm = typeof ctx.requireUpsEbm !== "undefined" ? ctx.requireUpsEbm : (typeof requireUpsEbm !== "undefined" && requireUpsEbm);
  const isNetworked = typeof ctx.requireUpsNetworked !== "undefined" ? ctx.requireUpsNetworked : (typeof requireUpsNetworked !== "undefined" && requireUpsNetworked);

  if (vendors.length > 0) {
    results = results.filter(u => vendors.includes((u.vendor || '').trim()));
  }

  if (category !== "all") {
    if (category === "ups") {
      results = results.filter(u => (u.type === "ups" || u.category === "ups") && !u.isEbp);
    } else if (category === "ebp") {
      results = results.filter(u => u.type === "ebp" || u.isEbp === true);
    }
  }

  if (voltage !== "all") {
    const vNum = parseInt(voltage, 10);
    results = results.filter(u => {
      const inV = u.inputVoltage || 0;
      const outV = u.outputVoltage || 0;
      if (vNum === 120) return inV === 120 || outV === 120;
      if (vNum === 240) return inV >= 200 || outV >= 200;
      return true;
    });
  }

  if (inputPlug !== "all") {
    results = results.filter(u => {
      const plug = (u.plugType || u.inputConnector || "").toUpperCase();
      return plug.includes(inputPlug.toUpperCase());
    });
  }

  if (minWatts > 0) {
    results = results.filter(u => (u.powerWatts || 0) >= minWatts);
  }

  if (isSineWave) {
    results = results.filter(u => 
      u.waveForm === "Sine Wave" || 
      (u.keyFeatures || []).some(k => /pure\s*sine/i.test(k)) || 
      /pure\s*sine/i.test((u.model || '') + ' ' + (u.name || '') + ' ' + (u.description || ''))
    );
  }

  if (isOnline) {
    results = results.filter(u => 
      u.topology === "Double-Conversion Online" || 
      (u.keyFeatures || []).some(k => /online\s*double|double-conversion|0\s*ms/i.test(k)) || 
      /online/i.test((u.model || '') + ' ' + (u.name || ''))
    );
  }

  if (isEbm) {
    results = results.filter(u => 
      u.ebmSupport === true || 
      u.isEbp === true || 
      (u.keyFeatures || []).some(k => /external\s*battery|scalable\s*runtime|battery\s*pack|ebm/i.test(k))
    );
  }

  if (isNetworked) {
    results = results.filter(u => 
      u.isNetworked === true || 
      u.networkManaged === true || 
      (u.networkType && u.networkType !== "Unmanaged" && u.networkType !== "None") || 
      (u.managementProtocols && u.managementProtocols.length > 0) ||
      (u.keyFeatures || []).some(k => /network\s*card|snmp|cloud\s*monitoring|smartconnect/i.test(k))
    );
  }

  return results;
}
FilterEngine.register("ups", filterUpsStrategy);

// 7. Rackmount PDU Strategy
function filterPduStrategy(items, ctx) {
  let results = items;
  const vendors = ctx.selectedAccVendors || (typeof selectedAccVendors !== "undefined" ? selectedAccVendors : []);
  const netType = ctx.selectedPduNetworkType || (typeof selectedPduNetworkType !== "undefined" ? selectedPduNetworkType : "all");
  const voltage = ctx.selectedUpsVoltage || (typeof selectedUpsVoltage !== "undefined" ? selectedUpsVoltage : "all");
  const plugType = ctx.selectedPduPlugType || (typeof selectedPduPlugType !== "undefined" ? selectedPduPlugType : "all");
  const mounting = ctx.selectedAccMounting || (typeof selectedAccMounting !== "undefined" ? selectedAccMounting : "all");
  const recepType = ctx.selectedPduReceptacleType || (typeof selectedPduReceptacleType !== "undefined" ? selectedPduReceptacleType : "all");
  const minOutlets = typeof ctx.selectedPduMinOutlets !== "undefined" ? ctx.selectedPduMinOutlets : (typeof selectedPduMinOutlets !== "undefined" ? selectedPduMinOutlets : 0);
  const isManaged = typeof ctx.requirePduManaged !== "undefined" ? ctx.requirePduManaged : (typeof requirePduManaged !== "undefined" && requirePduManaged);
  const isDisplay = typeof ctx.requirePduDisplay !== "undefined" ? ctx.requirePduDisplay : (typeof requirePduDisplay !== "undefined" && requirePduDisplay);

  if (vendors.length > 0) {
    results = results.filter(p => vendors.includes((p.vendor || '').trim()));
  }

  if (netType !== "all") {
    results = results.filter(p => {
      const t = (p.networkType || p.pduType || "").toLowerCase();
      const n = (p.name || "").toLowerCase();
      const m = (p.model || "").toLowerCase();
      if (netType === "switched") return t.includes("switched") || n.includes("switched") || m.includes("switched");
      if (netType === "metered") return t.includes("metered") || n.includes("metered") || m.includes("metered");
      if (netType === "basic") return t.includes("basic") || (!p.isNetworked && !t.includes("switched") && !t.includes("metered") && !t.includes("ats"));
      if (netType === "ats") return p.isAts === true || t.includes("ats") || n.includes("ats") || m.includes("ats") || (p.plugType || "").toLowerCase().includes("dual");
      return true;
    });
  }

  if (voltage !== "all") {
    const vNum = parseInt(voltage, 10);
    results = results.filter(p => {
      const inV = p.inputVoltage || p.voltage || 0;
      if (vNum === 120) return inV === 120;
      if (vNum === 240) return inV >= 200;
      return true;
    });
  }

  if (plugType !== "all") {
    results = results.filter(p => {
      const pPlug = (p.plugType || p.inputConnector || "").toUpperCase();
      if (plugType === "dual") return pPlug.includes("DUAL") || p.isAts === true;
      return pPlug.includes(plugType.toUpperCase());
    });
  }

  if (mounting !== "all") {
    results = results.filter(p => {
      const m = (p.mounting || p.formFactor || "").toUpperCase();
      const ru = p.rackUnits || 0;
      if (mounting === "0U") return m.includes("0U") || m.includes("VERTICAL") || ru === 0;
      if (mounting === "1U") return m.includes("1U") || ru === 1;
      if (mounting === "2U") return m.includes("2U") || ru === 2;
      return true;
    });
  }

  if (recepType !== "all") {
    results = results.filter(p => {
      const recSummary = (typeof window !== "undefined" && typeof window.formatReceptaclesSummary === "function") 
        ? window.formatReceptaclesSummary(p) 
        : (typeof p.receptacles === "string" ? p.receptacles : "");
      const r = (recSummary + " " + (p.description || "")).toUpperCase();
      if (recepType === "5-15") return r.includes("5-15");
      if (recepType === "5-20") return r.includes("5-20");
      if (recepType === "c13") return r.includes("C13");
      if (recepType === "c19") return r.includes("C19");
      return true;
    });
  }

  if (minOutlets > 0) {
    results = results.filter(p => (p.outletsCount || p.portCount || p.outlets || 0) >= minOutlets);
  }

  if (isManaged) {
    results = results.filter(p => p.isNetworked === true || (p.networkType && p.networkType.toLowerCase().includes("switched")));
  }

  if (isDisplay) {
    results = results.filter(p => 
      p.hasDisplay === true || 
      (p.keyFeatures || []).some(k => /display|ammeter|meter/i.test(k)) || 
      /metered|display|ammeter/i.test((p.name || '') + ' ' + (p.description || ''))
    );
  }

  return results;
}
FilterEngine.register("pdus", filterPduStrategy);

// 8. Power Cords & Jumpers Strategy
function filterPowerCordsStrategy(items, ctx) {
  let results = items;
  const vendors = ctx.selectedAccVendors || (typeof selectedAccVendors !== "undefined" ? selectedAccVendors : []);
  const plugPairing = ctx.selectedCordPlugType || (typeof selectedCordPlugType !== "undefined" ? selectedCordPlugType : "all");
  const lengthFt = ctx.selectedCordLength || (typeof selectedCordLength !== "undefined" ? selectedCordLength : "all");
  const color = ctx.selectedCordColor || (typeof selectedCordColor !== "undefined" ? selectedCordColor : "all");
  const gauge = ctx.selectedCordGauge || (typeof selectedCordGauge !== "undefined" ? selectedCordGauge : "all");
  const isLocking = typeof ctx.requireCordLocking !== "undefined" ? ctx.requireCordLocking : (typeof requireCordLocking !== "undefined" && requireCordLocking);

  if (vendors.length > 0) {
    results = results.filter(c => vendors.includes((c.vendor || '').trim()));
  }

  if (plugPairing !== "all") {
    if (plugPairing === "Locking") {
      results = results.filter(c => c.locking === true || c.isLocking === true || /lock/i.test(c.plugPairing || c.plugType || c.name || ""));
    } else {
      results = results.filter(c => {
        const pairing = (c.plugPairing || c.plugType || "").toLowerCase();
        const name = (c.name || "").toLowerCase();
        const target = plugPairing.toLowerCase();
        return pairing.includes(target) || name.includes(target);
      });
    }
  }

  if (lengthFt !== "all") {
    const targetLen = parseFloat(lengthFt);
    results = results.filter(c => {
      const len = c.lengthFt || 0;
      return Math.abs(len - targetLen) < 0.25;
    });
  }

  if (color !== "all") {
    results = results.filter(c => (c.color || "").toLowerCase() === color.toLowerCase());
  }

  if (gauge !== "all") {
    results = results.filter(c => {
      const g = (c.wireGauge || c.gauge || "").toLowerCase();
      return g.includes(gauge.toLowerCase());
    });
  }

  if (isLocking) {
    results = results.filter(c => c.locking === true || c.isLocking === true || /lock/i.test(c.plugPairing || c.plugType || c.name || ""));
  }

  return results;
}
FilterEngine.register("power_cords", filterPowerCordsStrategy);

// 6. Structured Cabling Strategy
function filterCablingStrategy(items, ctx) {
  let results = items;
  const vendors = ctx.selectedAccVendors || (typeof selectedAccVendors !== "undefined" ? selectedAccVendors : []);
  const types = ctx.selectedAccTypes || (typeof selectedAccTypes !== "undefined" ? selectedAccTypes : []);
  const ratings = ctx.selectedCableRatings || (typeof selectedCableRatings !== "undefined" ? selectedCableRatings : []);

  if (vendors.length > 0) results = results.filter(c => vendors.some(v => (c.vendor || '').toLowerCase().includes(v.toLowerCase())));
  if (types.length > 0) results = results.filter(c => types.includes(c.type) || types.includes(c.rating) || types.includes(c.standard));
  if (ratings.length > 0) {
    results = results.filter(c => {
      const r = (c.rating || '').toUpperCase();
      const s = (c.standard || '').toUpperCase();
      const n = (c.name || '').toUpperCase();
      return ratings.some(cr => r.includes(cr.toUpperCase()) || s.includes(cr.toUpperCase()) || n.includes(cr.toUpperCase()));
    });
  }

  const isShieldedReq = typeof ctx.requireCableShielded !== "undefined" ? ctx.requireCableShielded : (typeof requireCableShielded !== "undefined" && requireCableShielded);
  if (isShieldedReq) {
    results = results.filter(c => /shielded|f\/utp|stp|oas/i.test((c.name || '') + ' ' + (c.standard || '') + ' ' + (c.jacketType || '')));
  }

  const patchLength = ctx.selectedPatchCordLength || (typeof selectedPatchCordLength !== "undefined" ? selectedPatchCordLength : "all");
  if (patchLength !== "all") {
    results = results.filter(c => {
      const isPatch = c.type === 'patch_cord' || (c.category === 'cabling' && c.lengthFt !== undefined);
      if (!isPatch) return false;
      const ft = c.lengthFt || 0;
      if (patchLength === "0.5") return Math.abs(ft - 0.5) < 0.25;
      if (patchLength === "1") return Math.abs(ft - 1.0) < 0.35;
      if (patchLength === "2") return Math.abs(ft - 2.0) < 0.4;
      if (patchLength === "3") return Math.abs(ft - 3.0) < 0.5;
      if (patchLength === "5") return Math.abs(ft - 5.0) < 0.6;
      if (patchLength === "7") return Math.abs(ft - 7.0) < 0.6;
      if (patchLength === "10") return Math.abs(ft - 10.0) < 0.6;
      if (patchLength === "15") return ft >= 14.5;
      return Math.abs(ft - parseFloat(patchLength)) < 0.5;
    });
  }

  const isEtherlightingReq = typeof ctx.requireEtherlighting !== "undefined" ? ctx.requireEtherlighting : (typeof requireEtherlighting !== "undefined" && requireEtherlighting);
  if (isEtherlightingReq) {
    results = results.filter(c => c.etherlighting === true || /etherlighting/i.test((c.name || '') + ' ' + (c.sku || '')));
  }

  return results;
}
FilterEngine.register("cabling", filterCablingStrategy);

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
  const activeMode = (typeof currentMode !== "undefined") ? currentMode : (typeof window.currentMode !== "undefined" ? window.currentMode : "access");
  if (activeMode === "access" || activeMode === "backbone") {
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
    const hasModularFilter = (typeof requireModularUplink !== "undefined" && requireModularUplink) || (typeof window.requireModularUplink !== "undefined" && window.requireModularUplink);
    if (hasModularFilter) pills.push({ label: "Modular Uplinks", onRemove: () => { if (typeof requireModularUplink !== "undefined") requireModularUplink = false; window.requireModularUplink = false; } });
    if (typeof requireDinMount !== "undefined" && requireDinMount) pills.push({ label: "DIN Mount", onRemove: () => { requireDinMount = false; } });
    if (typeof requirePerpetualPoE !== "undefined" && requirePerpetualPoE) pills.push({ label: "Perpetual PoE", onRemove: () => { requirePerpetualPoE = false; } });
    if (typeof requireTAA !== "undefined" && requireTAA) pills.push({ label: "TAA Compliant", onRemove: () => { requireTAA = false; } });
    if (typeof requireSubstation !== "undefined" && requireSubstation) pills.push({ label: "Substation", onRemove: () => { requireSubstation = false; } });
    if (typeof selectedFormFactors !== "undefined") {
      selectedFormFactors.forEach(f => {
        const name = f === "rackmount" ? "19\" Rack" : f === "desktop" ? "0U Desktop" : f === "outdoor" ? "Outdoor" : "DIN-Rail";
        pills.push({ label: `Form: ${name}`, onRemove: () => toggleFilterItem('formFactor', f) });
      });
    }
    if (typeof requireFanless !== "undefined" && requireFanless) pills.push({ label: "Fanless (0 dB)", onRemove: () => { requireFanless = false; } });
    if (typeof requirePoEPowered !== "undefined" && requirePoEPowered) pills.push({ label: "PoE-Powered In", onRemove: () => { requirePoEPowered = false; } });
    if (typeof requireDcPower !== "undefined" && requireDcPower) pills.push({ label: "DC Terminal (12-48V)", onRemove: () => { requireDcPower = false; } });
    if (typeof requireLayer3 !== "undefined" && requireLayer3) pills.push({ label: "Layer 3 Routing", onRemove: () => { requireLayer3 = false; } });
    if (typeof selectedSwitchLayers !== "undefined" && selectedSwitchLayers.length > 0) {
      const layerNames = { l3: "Layer 3 Routing", l2: "Layer 2 Managed", unmanaged: "Unmanaged" };
      selectedSwitchLayers.forEach(l => {
        pills.push({ label: `Layer: ${layerNames[l] || l}`, onRemove: () => toggleFilterItem('switchLayer', l) });
      });
    }
    if (typeof requirePoEBt90 !== "undefined" && requirePoEBt90) pills.push({ label: "90W 802.3bt / PoH", onRemove: () => { requirePoEBt90 = false; } });
    if (typeof requireIndustrialHardened !== "undefined" && requireIndustrialHardened) pills.push({ label: "Industrial Hardened", onRemove: () => { requireIndustrialHardened = false; } });
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
    if (typeof requireFwHA !== "undefined" && requireFwHA) pills.push({ label: "Shadow Mode HA", onRemove: () => { requireFwHA = false; } });
    if (typeof requireFw25GWan !== "undefined" && requireFw25GWan) pills.push({ label: "25G SFP28 WAN", onRemove: () => { requireFw25GWan = false; } });
    if (typeof requireFwStorage !== "undefined" && requireFwStorage) pills.push({ label: "NVR Storage Bay", onRemove: () => { requireFwStorage = false; } });
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
    if (typeof selectedOpticReach !== "undefined" && selectedOpticReach !== "all") {
      const reachName = selectedOpticReach === "patch" ? "Patch (≤5m)" : selectedOpticReach === "short" ? "Short (≤300m)" : selectedOpticReach === "long" ? "Long (10km)" : "Extended (≥40km)";
      pills.push({ label: `Reach: ${reachName}`, onRemove: () => { selectedOpticReach = "all"; } });
    }
    if (typeof selectedDacLength !== "undefined" && selectedDacLength !== "all") {
      pills.push({ label: `DAC Length: ${selectedDacLength}`, onRemove: () => { selectedDacLength = "all"; } });
    }
    if (typeof requireOpticIndustrial !== "undefined" && requireOpticIndustrial) pills.push({ label: "Industrial (-40°C)", onRemove: () => { requireOpticIndustrial = false; } });
    if (typeof requireOpticBiDi !== "undefined" && requireOpticBiDi) pills.push({ label: "BiDi (Simplex LC)", onRemove: () => { requireOpticBiDi = false; } });
  }

  // Wireless Pills
  if (typeof currentMode !== "undefined" && currentMode === "wireless") {
    if (typeof selectedWlVendors !== "undefined") {
      selectedWlVendors.forEach(v => pills.push({ label: `Vendor: ${v}`, onRemove: () => toggleFilterItem('wlVendor', v) }));
    }
    if (typeof selectedWlFrequencies !== "undefined") {
      selectedWlFrequencies.forEach(f => pills.push({ label: `Freq: ${f} GHz`, onRemove: () => toggleFilterItem('wlFreq', f) }));
    }
    if (typeof selectedWlRangeTier !== "undefined" && selectedWlRangeTier !== "all") {
      const rName = selectedWlRangeTier === "short" ? "Short (≤1km)" : selectedWlRangeTier === "medium" ? "Medium (1-5km)" : "Long (>5km)";
      pills.push({ label: `Range: ${rName}`, onRemove: () => { selectedWlRangeTier = "all"; } });
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
    if (typeof requireWl60GHz !== "undefined" && requireWl60GHz) pills.push({ label: "60 GHz Multi-Gig", onRemove: () => { requireWl60GHz = false; } });
    if (typeof requireWlBackup5G !== "undefined" && requireWlBackup5G) pills.push({ label: "5GHz Backup", onRemove: () => { requireWlBackup5G = false; } });
  }

  // UPS Infrastructure Pills
  if (typeof currentMode !== "undefined" && currentMode === "ups") {
    if (typeof selectedAccVendors !== "undefined") {
      selectedAccVendors.forEach(v => pills.push({ label: `Vendor: ${v}`, onRemove: () => toggleFilterItem('accVendor', v) }));
    }
    if (typeof selectedUpsCategory !== "undefined" && selectedUpsCategory !== "all") {
      pills.push({ label: `Category: ${selectedUpsCategory === 'ebp' ? 'EBP Battery Packs' : 'UPS Systems'}`, onRemove: () => { selectedUpsCategory = "all"; } });
    }
    if (typeof selectedUpsVoltage !== "undefined" && selectedUpsVoltage !== "all") {
      pills.push({ label: `Voltage: ${selectedUpsVoltage === '240' ? '208V/240V' : '120V'}`, onRemove: () => { selectedUpsVoltage = "all"; } });
    }
    if (typeof selectedUpsInputPlug !== "undefined" && selectedUpsInputPlug !== "all") {
      pills.push({ label: `Plug: ${selectedUpsInputPlug}`, onRemove: () => { selectedUpsInputPlug = "all"; } });
    }
    if (typeof accMinPowerWatts !== "undefined" && accMinPowerWatts > 0) {
      pills.push({ label: `Min Power: ${accMinPowerWatts}W`, onRemove: () => { accMinPowerWatts = 0; if (typeof buildCalculatorStrip === "function") buildCalculatorStrip(); } });
    }
    if (typeof requireUpsSineWave !== "undefined" && requireUpsSineWave) pills.push({ label: "Pure Sine Wave", onRemove: () => { requireUpsSineWave = false; } });
    if (typeof requireUpsOnline !== "undefined" && requireUpsOnline) pills.push({ label: "Online Double-Conversion", onRemove: () => { requireUpsOnline = false; } });
    if (typeof requireUpsEbm !== "undefined" && requireUpsEbm) pills.push({ label: "EBM Battery Support", onRemove: () => { requireUpsEbm = false; } });
    if (typeof requireUpsNetworked !== "undefined" && requireUpsNetworked) pills.push({ label: "Networked / SmartConnect", onRemove: () => { requireUpsNetworked = false; } });
  }

  // PDU Infrastructure Pills
  if (typeof currentMode !== "undefined" && currentMode === "pdus") {
    if (typeof selectedAccVendors !== "undefined") {
      selectedAccVendors.forEach(v => pills.push({ label: `Vendor: ${v}`, onRemove: () => toggleFilterItem('accVendor', v) }));
    }
    if (typeof selectedPduNetworkType !== "undefined" && selectedPduNetworkType !== "all") {
      const typeLabels = { switched: "Switched PDU", metered: "Metered PDU", basic: "Basic PDU", ats: "ATS Dual-Feed" };
      pills.push({ label: `Type: ${typeLabels[selectedPduNetworkType] || selectedPduNetworkType}`, onRemove: () => { selectedPduNetworkType = "all"; } });
    }
    if (typeof selectedUpsVoltage !== "undefined" && selectedUpsVoltage !== "all") {
      pills.push({ label: `Voltage: ${selectedUpsVoltage === '240' ? '208V/240V' : '120V'}`, onRemove: () => { selectedUpsVoltage = "all"; } });
    }
    if (typeof selectedPduPlugType !== "undefined" && selectedPduPlugType !== "all") {
      pills.push({ label: `Input: ${selectedPduPlugType}`, onRemove: () => { selectedPduPlugType = "all"; } });
    }
    if (typeof selectedAccMounting !== "undefined" && selectedAccMounting !== "all") {
      pills.push({ label: `Form: ${selectedAccMounting}`, onRemove: () => { selectedAccMounting = "all"; } });
    }
    if (typeof selectedPduReceptacleType !== "undefined" && selectedPduReceptacleType !== "all") {
      pills.push({ label: `Receptacle: ${selectedPduReceptacleType.toUpperCase()}`, onRemove: () => { selectedPduReceptacleType = "all"; } });
    }
    if (typeof selectedPduMinOutlets !== "undefined" && selectedPduMinOutlets > 0) {
      pills.push({ label: `Outlets: ≥${selectedPduMinOutlets}`, onRemove: () => { selectedPduMinOutlets = 0; } });
    }
    if (typeof requirePduManaged !== "undefined" && requirePduManaged) pills.push({ label: "Network Managed", onRemove: () => { requirePduManaged = false; } });
    if (typeof requirePduDisplay !== "undefined" && requirePduDisplay) pills.push({ label: "Ammeter Display", onRemove: () => { requirePduDisplay = false; } });
  }

  // Power Cords & Jumpers Pills
  if (typeof currentMode !== "undefined" && currentMode === "power_cords") {
    if (typeof selectedAccVendors !== "undefined") {
      selectedAccVendors.forEach(v => pills.push({ label: `Vendor: ${v}`, onRemove: () => toggleFilterItem('accVendor', v) }));
    }
    if (typeof selectedCordPlugType !== "undefined" && selectedCordPlugType !== "all") {
      pills.push({ label: `Connectors: ${selectedCordPlugType}`, onRemove: () => { selectedCordPlugType = "all"; } });
    }
    if (typeof selectedCordLength !== "undefined" && selectedCordLength !== "all") {
      pills.push({ label: `Length: ${selectedCordLength} ft`, onRemove: () => { selectedCordLength = "all"; if (typeof buildCalculatorStrip === "function") buildCalculatorStrip(); } });
    }
    if (typeof selectedCordColor !== "undefined" && selectedCordColor !== "all") {
      pills.push({ label: `Color: ${selectedCordColor}`, onRemove: () => { selectedCordColor = "all"; if (typeof buildCalculatorStrip === "function") buildCalculatorStrip(); } });
    }
    if (typeof selectedCordGauge !== "undefined" && selectedCordGauge !== "all") {
      pills.push({ label: `Gauge: ${selectedCordGauge}`, onRemove: () => { selectedCordGauge = "all"; } });
    }
    if (typeof requireCordLocking !== "undefined" && requireCordLocking) pills.push({ label: "Dual-Locking Only", onRemove: () => { requireCordLocking = false; } });
  }

  // Accessories & Supporting Hardware Pills
  if (typeof currentMode !== "undefined" && (currentMode === "accessories" || currentMode === "racks" || currentMode === "enclosures" || currentMode === "pathways")) {
    if (typeof selectedAccSubCategory !== "undefined" && selectedAccSubCategory !== "all") {
      const subLabels = {
        mounts: "Mounts & Brackets",
        media_converters: "Media Converters",
        licenses: "Licenses & Cloud Subs",
        modular_uplinks: "Modular Uplinks & Expansion",
        power_supplies: "Power Supplies",
        poe_injectors: "PoE Midspans",
        environmental: "Environmental Probes"
      };
      pills.push({
        label: `Category: ${subLabels[selectedAccSubCategory] || selectedAccSubCategory}`,
        onRemove: () => {
          if (typeof setAccSubCategory === "function") {
            setAccSubCategory("all");
          } else {
            selectedAccSubCategory = "all";
            if (typeof buildCalculatorStrip === "function") buildCalculatorStrip();
            if (typeof buildSidebarFilters === "function") buildSidebarFilters();
            if (typeof runActiveFilter === "function") runActiveFilter();
          }
        }
      });
    }
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

  // Structured Cabling Pills
  if (typeof currentMode !== "undefined" && currentMode === "cabling") {
    if (typeof selectedAccVendors !== "undefined") {
      selectedAccVendors.forEach(v => pills.push({ label: `Vendor: ${v}`, onRemove: () => toggleFilterItem('accVendor', v) }));
    }
    if (typeof selectedCableRatings !== "undefined") {
      selectedCableRatings.forEach(r => pills.push({ label: `Rating: ${r}`, onRemove: () => toggleFilterItem('cableRating', r) }));
    }
    if (typeof selectedPatchCordLength !== "undefined" && selectedPatchCordLength !== "all") {
      const pLabel = selectedPatchCordLength === "0.5" ? "6 in (0.5 ft)" : (selectedPatchCordLength === "15" ? "15+ ft" : `${selectedPatchCordLength} ft`);
      pills.push({ label: `Patch Length: ${pLabel}`, onRemove: () => { selectedPatchCordLength = "all"; } });
    }
    if (typeof requireCableShielded !== "undefined" && requireCableShielded) pills.push({ label: "Shielded Cable", onRemove: () => { requireCableShielded = false; } });
    if (typeof requireEtherlighting !== "undefined" && requireEtherlighting) pills.push({ label: "Etherlighting™", onRemove: () => { requireEtherlighting = false; } });
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