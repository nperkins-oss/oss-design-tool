// =========================================================================
// GLOBAL CATALOG SEARCH & OMNI-NAVIGATION ENGINE (NetSelect Enterprise)
// Cross-Domain Full-Catalog Search, Fuzzy Token Scoring, Command Palette (Ctrl+K)
// Precision Card Anchoring & Auto-Highlighting Navigation
// =========================================================================

const GlobalSearchEngine = {
  _index: [],
  _isInitialized: false,
  _selectedIndex: 0,
  _currentQuery: "",
  _currentCategory: "all",
  _activeDropdownMode: false,

  /**
   * Category display definitions with icon and accent colors
   */
  CATEGORY_CONFIG: {
    all: { label: "All Items", icon: "search", color: "indigo" },
    switches: { label: "Switches", icon: "layers", color: "indigo" },
    firewalls: { label: "Gateways & Firewalls", icon: "shield", color: "emerald" },
    wireless: { label: "Wireless PtP", icon: "radio", color: "cyan" },
    accessories: { label: "Power & Accessories", icon: "wrench", color: "amber" },
    racks_ups: { label: "Racks & UPS", icon: "server", color: "purple" },
    optics: { label: "Optics & DACs", icon: "cable", color: "sky" },
    cabling: { label: "Structured Cabling", icon: "git-commit", color: "teal" }
  },

  /**
   * Initializes the Global Search Engine and sets up global listeners
   */
  init() {
    if (this._isInitialized) return;
    this.buildIndex();
    this.setupKeyboardShortcuts();
    this.setupClickOutside();
    this._isInitialized = true;
    console.info(`[GlobalSearchEngine] Initialized with ${this._index.length} indexed catalog products.`);
  },

  /**
   * Maps an individual hardware item to its target domain and catalog mode
   */
  getItemTarget(item, sourceMode) {
    if (!item) return null;

    const id = item.id || item.sku || "";
    const sku = item.sku || item.id || "";
    const role = (item.role || "").toLowerCase();
    const cat = (item.category || "").toLowerCase();
    const type = (item.type || "").toLowerCase();

    // 1. Explicit or detected: Firewalls & Security Gateways
    if (sourceMode === "firewalls" || cat === "firewall" || cat === "cellular" || cat === "gateway" || cat === "teleworker" || role === "firewall" || role === "security wan" || role === "security" || (typeof FIREWALL_DATABASE !== "undefined" && FIREWALL_DATABASE.some(f => f.sku === sku || f.id === id))) {
      return {
        domain: "networking",
        mode: "firewalls",
        domainLabel: "Networking",
        modeLabel: "Gateways & Firewalls",
        icon: "shield",
        badgeColor: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
        searchCategory: "firewalls"
      };
    }

    // 2. Explicit or detected: Wireless PtP / PtMP Radios
    if (sourceMode === "wireless" || item.ptmpFamily || item.frequencyGhz || item.topologyRole === "ptp" || item.topologyRole === "ptmp" || cat.includes("ptp") || cat.includes("wireless") || cat.includes("radio") || (typeof WIRELESS_DATABASE !== "undefined" && WIRELESS_DATABASE.some(w => w.sku === sku || w.id === id))) {
      return {
        domain: "networking",
        mode: "wireless",
        domainLabel: "Networking",
        modeLabel: "Wireless PtP / PtMP",
        icon: "radio",
        badgeColor: "border-cyan-500/40 bg-cyan-500/10 text-cyan-300",
        searchCategory: "wireless"
      };
    }

    // 3. Explicit or detected: Optics, Transceivers & DACs
    if (sourceMode === "optics" || item.medium || cat === "optic" || cat === "dac" || (typeof OPTICS_LIST !== "undefined" && OPTICS_LIST.some(o => o.sku === sku)) || (item.speed && (item.reach || item.formFactor))) {
      return {
        domain: "networking",
        mode: "optics",
        domainLabel: "Networking",
        modeLabel: "Optics & DACs",
        icon: "cable",
        badgeColor: "border-sky-500/40 bg-sky-500/10 text-sky-300",
        searchCategory: "optics"
      };
    }

    // 4. Power Cords & Jumpers
    if (sourceMode === "power_cords" || cat === "power_cords" || type === "power_cord") {
      return {
        domain: "infrastructure",
        mode: "power_cords",
        domainLabel: "Infrastructure",
        modeLabel: "Power Cords & Jumpers",
        icon: "plug",
        badgeColor: "border-teal-500/40 bg-teal-500/10 text-teal-300",
        searchCategory: "accessories"
      };
    }

    // 4b. Rackmount PDUs
    if (sourceMode === "pdus" || cat === "pdus" || cat === "pdu" || type === "pdu" || item.isPdu) {
      return {
        domain: "infrastructure",
        mode: "pdus",
        domainLabel: "Infrastructure",
        modeLabel: "Rackmount PDU",
        icon: "zap",
        badgeColor: "border-sky-500/40 bg-sky-500/10 text-sky-300",
        searchCategory: "accessories"
      };
    }

    // 4c. UPS Power Systems & EBPs
    if (sourceMode === "ups" || cat === "ups" || type === "ups" || type === "ebp" || item.isEbp) {
      const modeLabel = (type === "ebp" || item.isEbp) ? "Extended Battery Pack (EBP)" : "Rack UPS Power";
      return {
        domain: "infrastructure",
        mode: "ups",
        domainLabel: "Infrastructure",
        modeLabel: modeLabel,
        icon: "battery-charging",
        badgeColor: "border-amber-500/40 bg-amber-500/10 text-amber-300",
        searchCategory: "racks_ups"
      };
    }

    // 5. Racks, Cabinets & Enclosures
    if (sourceMode === "racks" || cat === "racks" || cat === "rack" || type === "equipment_rack" || cat === "enclosure" || type === "enclosure") {
      return {
        domain: "infrastructure",
        mode: "racks",
        domainLabel: "Infrastructure",
        modeLabel: "19\" Equipment Racks",
        icon: "server",
        badgeColor: "border-purple-500/40 bg-purple-500/10 text-purple-300",
        searchCategory: "racks_ups"
      };
    }

    // 6. Pathways & Cable Management
    if (sourceMode === "pathways" || cat === "pathways" || type === "pathway" || cat === "cable_management" || type === "cable_management") {
      return {
        domain: "infrastructure",
        mode: "pathways",
        domainLabel: "Infrastructure",
        modeLabel: "Pathways & J-Hooks",
        icon: "route",
        badgeColor: "border-teal-500/40 bg-teal-500/10 text-teal-300",
        searchCategory: "accessories"
      };
    }

    // 7. Structured Cabling & Patch Hardware
    if (sourceMode === "cabling" || cat === "cabling" || type === "patch_cord" || type === "patch_panel" || type === "bulk_cable" || type === "fiber_trunk" || type === "connector") {
      return {
        domain: "infrastructure",
        mode: "cabling",
        domainLabel: "Infrastructure",
        modeLabel: "Structured Cabling",
        icon: "git-commit",
        badgeColor: "border-teal-500/40 bg-teal-500/10 text-teal-300",
        searchCategory: "cabling"
      };
    }

    // 8. Hardware Accessories (Power, Injectors, NTP Server, Brackets)
    if (sourceMode === "accessories" || cat === "time_server" || type === "time_server" || cat === "power_supply" || cat === "poe_injector" || cat === "media_converter" || cat === "power_distribution" || cat === "mounting" || cat === "surge_protector" || (typeof ACCESSORY_DATABASE !== "undefined" && ACCESSORY_DATABASE.some(a => a.sku === sku || a.id === id))) {
      return {
        domain: "infrastructure",
        mode: "accessories",
        domainLabel: "Infrastructure",
        modeLabel: "Power & Accessories",
        icon: "wrench",
        badgeColor: "border-amber-500/40 bg-amber-500/10 text-amber-300",
        searchCategory: "accessories"
      };
    }

    // 9. Core / Aggregation Backbone Switches
    if (sourceMode === "backbone" || role === "core" || role === "aggregation" || cat === "core" || cat === "aggregation") {
      return {
        domain: "networking",
        mode: "backbone",
        domainLabel: "Networking",
        modeLabel: "Core & Aggregation",
        icon: "cpu",
        badgeColor: "border-purple-500/40 bg-purple-500/10 text-purple-300",
        searchCategory: "switches"
      };
    }

    // 10. Access Switches (Default)
    return {
      domain: "networking",
      mode: "access",
      domainLabel: "Networking",
      modeLabel: "Access & Edge Switches",
      icon: "layers",
      badgeColor: "border-indigo-500/40 bg-indigo-500/10 text-indigo-300",
      searchCategory: "switches"
    };
  },

  /**
   * Generates a concise specification string for search preview
   */
  generateSpecSnippet(item) {
    if (!item) return "";
    const parts = [];

    // Switch specs
    if (item.ports) {
      let pStr = `${item.ports} Ports`;
      if (item.poeBudget) pStr += ` (${item.poeBudget}W PoE)`;
      parts.push(pStr);
    }
    if (item.uplinksSummary) parts.push(item.uplinksSummary);

    // Firewall specs
    if (item.statefulThroughput) parts.push(`FW: ${item.statefulThroughput}`);
    if (item.threatThroughput) parts.push(`IPS: ${item.threatThroughput}`);
    if (item.interfaces && !item.ports) parts.push(item.interfaces);

    // Wireless specs
    if (item.throughput || item.maxThroughput) parts.push(item.throughput || item.maxThroughput);
    if (item.rangeKm || item.distanceKm) parts.push(`${item.rangeKm || item.distanceKm} km Range`);
    if (item.frequency || item.band) parts.push(item.frequency || item.band);

    // Optic specs
    if (item.speed && item.medium) parts.push(`${item.speed} ${item.medium.toUpperCase()}`);
    if (item.reach) parts.push(item.reach);

    // PDU specs
    if (item.type === "pdu" || item.category === "pdus" || item.isPdu) {
      parts.push(`${item.inputVoltage || 120}V ${item.inputCircuitAmps || 15}A PDU`);
      const rec = (typeof formatReceptaclesSummary === "function") ? formatReceptaclesSummary(item) : (item.receptacles || '');
      if (rec) parts.push(rec);
      else if (item.outletsCount || item.portCount) parts.push(`${item.outletsCount || item.portCount} Outlets`);
      if (item.networkType) parts.push(item.networkType);
      if (item.plugType) parts.push(item.plugType);
    }

    // Power Cord specs
    if (item.type === "power_cord" || item.category === "power_cords") {
      if (item.plugPairing) parts.push(item.plugPairing);
      if (item.lengthFt) parts.push(`${item.lengthFt} ft`);
      if (item.color) parts.push(item.color);
      if (item.wireGauge) parts.push(item.wireGauge);
    }

    // UPS specs
    if ((item.type === "ups" || item.category === "ups") && !item.isEbp && !item.isPdu && item.type !== "power_cord") {
      parts.push(`${item.va ? `${item.va}VA / ` : ''}${item.powerWatts || 1000}W UPS`);
      if (item.plugType) parts.push(item.plugType);
      const rec = (typeof formatReceptaclesSummary === "function") ? formatReceptaclesSummary(item) : (item.receptacles || '');
      if (rec) parts.push(rec);
      if (item.isNetworked) parts.push("Networked");
    }

    // Accessory specs
    if (item.powerWatts && item.type !== "pdu" && item.type !== "ups" && !item.isPdu) parts.push(`${item.powerWatts}W Output`);
    if (item.rackUnits && item.rackUnits > 0) parts.push(`${item.rackUnits}U`);
    if (item.category === "time_server") parts.push("Stratum 1 GPS NTP");

    // Cabling specs
    if (item.lengthFt && item.type !== "power_cord") parts.push(`${item.lengthFt} ft`);
    if (item.rating) parts.push(item.rating);
    if (item.standard) parts.push(item.standard);

    return parts.join(" • ") || (item.keyFeatures ? item.keyFeatures[0] : (item.description || ""));
  },

  /**
   * Builds the comprehensive index across all active data stores
   */
  buildIndex() {
    this._index = [];
    const seenIds = new Set();

    const addEntry = (item, sourceMode) => {
      if (!item) return;
      const id = String(item.id || item.sku || "");
      if (!id || seenIds.has(id)) return;
      seenIds.add(id);

      const target = this.getItemTarget(item, sourceMode);
      const sku = String(item.sku || item.id || "");
      const model = String(item.model || item.name || "");
      const vendor = String(item.vendor || "");
      const msrp = parseFloat(item.msrp) || 0;
      const image = item.image || "";
      const specs = this.generateSpecSnippet(item);

      const recepStr = (typeof item.receptacles === "string" ? item.receptacles : "") + " " +
        (Array.isArray(item.receptacleBreakdown) ? item.receptacleBreakdown.map(r => `${r.count || ''} ${r.type || ''} ${r.label || ''}`).join(" ") : "");

      // Create normalized searchable string
      const rawText = [
        sku,
        model,
        vendor,
        target.modeLabel,
        target.domainLabel,
        target.searchCategory,
        item.role,
        item.category,
        item.type,
        specs,
        recepStr,
        item.description,
        ...(item.keyFeatures || [])
      ].filter(Boolean).join(" ").toLowerCase();

      const normalizedAlphaNum = rawText.replace(/[^a-z0-9]/g, "");

      this._index.push({
        id,
        sku,
        model,
        vendor,
        msrp,
        image,
        specs,
        target,
        rawText,
        normalizedAlphaNum,
        item
      });
    };

    // 1. Gather switches
    const switches = (typeof SWITCH_DATABASE !== "undefined" ? SWITCH_DATABASE : []);
    switches.forEach(i => {
      const mode = (i.role === "core" || i.role === "aggregation" || i.category === "core" || i.category === "aggregation") ? "backbone" : "access";
      addEntry(i, mode);
    });

    // 2. Gather firewalls
    const firewalls = (typeof FIREWALL_DATABASE !== "undefined" ? FIREWALL_DATABASE : []);
    firewalls.forEach(i => addEntry(i, "firewalls"));

    // 3. Gather wireless
    const wireless = (typeof WIRELESS_DATABASE !== "undefined" ? WIRELESS_DATABASE : []);
    wireless.forEach(i => addEntry(i, "wireless"));

    // 4. Gather optics
    const optics = (typeof OPTICS_LIST !== "undefined" ? OPTICS_LIST : []);
    optics.forEach(i => addEntry(i, "optics"));

    // 5. Gather accessories, racks, ups, pathways, pdus, power cords
    const accessories = (typeof ACCESSORY_DATABASE !== "undefined" ? ACCESSORY_DATABASE : []);
    accessories.forEach(i => {
      const cat = (i.category || "").toLowerCase();
      const type = (i.type || "").toLowerCase();
      let mode = "accessories";
      if (cat === "power_cords" || type === "power_cord") mode = "power_cords";
      else if (cat === "pdus" || cat === "pdu" || type === "pdu" || i.isPdu) mode = "pdus";
      else if (cat === "ups" || type === "ups" || type === "ebp" || i.isEbp) mode = "ups";
      else if (cat === "racks" || cat === "rack" || cat === "enclosure") mode = "racks";
      else if (cat === "pathways" || cat === "cable_management") mode = "pathways";
      addEntry(i, mode);
    });

    // 5b. Gather standalone PDUs, Power Cords, and UPS datasets if available
    if (typeof PDUS_DATABASE !== "undefined" && Array.isArray(PDUS_DATABASE)) {
      PDUS_DATABASE.forEach(i => addEntry(i, "pdus"));
    }
    if (typeof POWER_CORDS_DATABASE !== "undefined" && Array.isArray(POWER_CORDS_DATABASE)) {
      POWER_CORDS_DATABASE.forEach(i => addEntry(i, "power_cords"));
    }
    if (typeof UPS_DATABASE !== "undefined" && Array.isArray(UPS_DATABASE)) {
      UPS_DATABASE.forEach(i => addEntry(i, "ups"));
    }

    // 6. Gather cabling
    let cabling = [];
    if (typeof CABLING_CATALOG !== "undefined" && CABLING_CATALOG) {
      if (Array.isArray(CABLING_CATALOG)) cabling = CABLING_CATALOG;
      else cabling = Object.values(CABLING_CATALOG).flat();
    }
    cabling.forEach(i => addEntry(i, "cabling"));
  },

  /**
   * Performs real-time fuzzy & token-scored search across the index
   * @param {string} query
   * @param {string} categoryFilter - 'all' or one of CATEGORY_CONFIG keys
   * @param {number} maxResults
   */
  search(query, categoryFilter = "all", maxResults = 30) {
    if (!this._index || this._index.length === 0) {
      this.buildIndex();
    }

    const cleanQ = (query || "").trim().toLowerCase();
    const normalizedQ = cleanQ.replace(/[^a-z0-9]/g, "");
    const tokens = cleanQ.split(/\s+/).filter(Boolean);

    // If query is empty, return popular / featured items
    if (tokens.length === 0) {
      let filtered = this._index;
      if (categoryFilter !== "all") {
        filtered = filtered.filter(entry => entry.target.searchCategory === categoryFilter);
      }
      return {
        query: "",
        totalCount: filtered.length,
        results: filtered.slice(0, maxResults),
        categoryCounts: this.computeCategoryCounts(this._index)
      };
    }

    const scored = [];

    for (let i = 0; i < this._index.length; i++) {
      const entry = this._index[i];

      // Check category filter
      if (categoryFilter !== "all" && entry.target.searchCategory !== categoryFilter) {
        continue;
      }

      let score = 0;
      const skuLower = entry.sku.toLowerCase();
      const modelLower = entry.model.toLowerCase();
      const vendorLower = entry.vendor.toLowerCase();
      const skuNorm = entry.sku.toLowerCase().replace(/[^a-z0-9]/g, "");

      // 1. Exact SKU matches (Top Priority)
      if (skuLower === cleanQ || skuNorm === normalizedQ) {
        score += 1500;
      } else if (skuLower.startsWith(cleanQ) || skuNorm.startsWith(normalizedQ)) {
        score += 800;
      } else if (skuLower.includes(cleanQ) || skuNorm.includes(normalizedQ)) {
        score += 400;
      }

      // 2. Model matches
      if (modelLower.startsWith(cleanQ)) {
        score += 500;
      } else if (modelLower.includes(cleanQ)) {
        score += 250;
      }

      // 3. Vendor match
      if (vendorLower.startsWith(cleanQ)) {
        score += 150;
      } else if (vendorLower.includes(cleanQ)) {
        score += 80;
      }

      // 4. Token-based full match
      let allTokensMatch = true;
      for (let t = 0; t < tokens.length; t++) {
        const token = tokens[t];
        const tokenNorm = token.replace(/[^a-z0-9]/g, "");

        const inRaw = entry.rawText.includes(token);
        const inNorm = tokenNorm.length > 0 && entry.normalizedAlphaNum.includes(tokenNorm);

        if (!inRaw && !inNorm) {
          allTokensMatch = false;
          break;
        } else {
          score += 40;
        }
      }

      if (allTokensMatch) {
        scored.push({ entry, score });
      }
    }

    // Sort by descending score
    scored.sort((a, b) => b.score - a.score);

    const results = scored.slice(0, maxResults).map(s => s.entry);

    // Compute category counts for tab badges
    const allMatches = [];
    for (let i = 0; i < this._index.length; i++) {
      const entry = this._index[i];
      let matches = true;
      for (let t = 0; t < tokens.length; t++) {
        const token = tokens[t];
        const tokenNorm = token.replace(/[^a-z0-9]/g, "");
        if (!entry.rawText.includes(token) && (!tokenNorm || !entry.normalizedAlphaNum.includes(tokenNorm))) {
          matches = false;
          break;
        }
      }
      if (matches) allMatches.push(entry);
    }

    return {
      query: cleanQ,
      totalCount: allMatches.length,
      results,
      categoryCounts: this.computeCategoryCounts(allMatches)
    };
  },

  /**
   * Computes match counts grouped by searchCategory
   */
  computeCategoryCounts(items) {
    const counts = {
      all: items.length,
      switches: 0,
      firewalls: 0,
      wireless: 0,
      accessories: 0,
      racks_ups: 0,
      optics: 0,
      cabling: 0
    };

    items.forEach(item => {
      const cat = item.target?.searchCategory;
      if (counts[cat] !== undefined) {
        counts[cat]++;
      }
    });

    return counts;
  },

  /**
   * THE CORE NAVIGATION ACTION:
   * Smoothly navigates user to the exact category in the catalog, renders and highlights the target card
   * @param {string} idOrSku
   */
  navigateTo(idOrSku) {
    if (!idOrSku) return;

    if (!this._index || this._index.length === 0) {
      this.buildIndex();
    }

    const clean = String(idOrSku).trim().toLowerCase();
    const cleanAlpha = clean.replace(/[^a-z0-9]/g, '');
    let found = this._index.find(e => 
      e.id.toLowerCase() === clean || 
      e.sku.toLowerCase() === clean ||
      e.id.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanAlpha ||
      e.sku.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanAlpha ||
      e.sku.toLowerCase().includes(clean) ||
      e.id.toLowerCase().includes(clean)
    );

    // If not found by direct ID/SKU check, use search engine to resolve top match
    if (!found) {
      const searchRes = this.search(String(idOrSku));
      if (searchRes && searchRes.results && searchRes.results.length > 0) {
        found = searchRes.results[0];
      }
    }

    if (!found) {
      console.warn(`[GlobalSearchEngine] Item not found for ID/SKU: ${idOrSku}`);
      if (typeof showToast === "function") showToast(`Hardware item '${idOrSku}' not found in catalog.`);
      return;
    }

    const target = found.target;
    const item = found.item;

    // 1. Close search overlays and all modal dialogs
    this.closeDropdown();
    this.closeModal();
    this.closeAllBlockingModals();

    // 2. Clear conflicting search queries and sidebar filter states
    if (typeof activeSearchQuery !== "undefined") activeSearchQuery = "";
    const filterInput = document.getElementById("filterSearch");
    if (filterInput) filterInput.value = "";

    // Reset current filters so the target card is never hidden by previous filter checkboxes
    if (typeof resetCurrentFilters === "function") {
      resetCurrentFilters();
    }

    // 3. Switch domain & mode if necessary
    const isModeChange = (typeof currentMode === "undefined" || currentMode !== target.mode);

    if (isModeChange) {
      if (typeof switchMode === "function") {
        switchMode(target.mode);
      }
    } else {
      // Re-run filter in current mode to ensure clean view
      if (typeof runActiveFilter === "function") {
        runActiveFilter();
      }
    }

    // 4. Scroll to target card and trigger luminous pulse animation
    const tryScroll = (attemptsLeft = 6) => {
      const safeId = item.id || item.sku;
      const safeSku = item.sku || item.id;

      const card = document.getElementById(`product-card-${safeId}`) ||
                   document.getElementById(`product-card-${safeSku}`) ||
                   document.querySelector(`[data-item-id="${safeId}"]`) ||
                   document.querySelector(`[data-item-sku="${safeSku}"]`) ||
                   document.querySelector(`[data-item-sku="${safeSku.toUpperCase()}"]`);

      if (card) {
        card.scrollIntoView({ behavior: "smooth", block: "center" });

        // Apply glowing pulse animation
        card.classList.remove("global-search-highlight");
        // Force reflow
        void card.offsetWidth;
        card.classList.add("global-search-highlight");

        setTimeout(() => {
          card.classList.remove("global-search-highlight");
        }, 3200);

        if (typeof showToast === "function") {
          showToast(`Navigated to ${target.domainLabel} › ${target.modeLabel}: ${found.model} (${found.sku})`);
        }
      } else if (attemptsLeft > 0) {
        setTimeout(() => tryScroll(attemptsLeft - 1), 80);
      } else {
        console.warn(`[GlobalSearchEngine] Could not locate rendered card for ${found.sku}`);
        if (typeof showToast === "function") {
          showToast(`Navigated to ${target.modeLabel} for ${found.model}`);
        }
      }
    };

    setTimeout(() => tryScroll(6), 60);
  },

  /**
   * Helper to close all potentially blocking flyouts or modals
   */
  closeAllBlockingModals() {
    const modalsToClose = [
      { id: "datasheetViewerModal", func: "closeDatasheetModal" },
      { id: "productImageModal", func: "closeProductImageModal" },
      { id: "facilityModal", func: "toggleFacilityModal" },
      { id: "topologyModal", func: "toggleTopologyModal" },
      { id: "cableLayoutModal", func: "toggleCableLayoutModal" },
      { id: "compareModal", func: "toggleCompareModal" },
      { id: "projectHealthModal", func: "toggleProjectHealthModal" },
      { id: "rackElevationModal", func: "toggleRackModal" },
      { id: "licensingTermsModal", func: "toggleLicenseModal" }
    ];

    modalsToClose.forEach(m => {
      const el = document.getElementById(m.id);
      if (el && !el.classList.contains("hidden")) {
        if (typeof window[m.func] === "function") {
          window[m.func]();
        } else {
          el.classList.add("hidden");
        }
      }
    });

    const bomDrawer = document.getElementById("bomDrawer");
    if (bomDrawer && !bomDrawer.classList.contains("translate-x-full")) {
      if (typeof toggleBomDrawer === "function") toggleBomDrawer();
    }
  },

  // =========================================================================
  // HEADER DROPDOWN UI INTERACTION
  // =========================================================================

  handleInput(val) {
    this._currentQuery = val || "";
    this._selectedIndex = 0;
    const clearBtn = document.getElementById("globalSearchClearBtn");
    if (clearBtn) {
      clearBtn.classList.toggle("hidden", !val);
    }
    this.renderDropdown();
  },

  handleFocus(val) {
    this._currentQuery = val || "";
    this._selectedIndex = 0;
    this.renderDropdown();
  },

  clearSearch() {
    this._currentQuery = "";
    const input = document.getElementById("globalSearchInput");
    if (input) {
      input.value = "";
      input.focus();
    }
    const clearBtn = document.getElementById("globalSearchClearBtn");
    if (clearBtn) clearBtn.classList.add("hidden");
    this.renderDropdown();
  },

  closeDropdown() {
    const dropdown = document.getElementById("globalSearchDropdown");
    if (dropdown) dropdown.classList.add("hidden");
    this._activeDropdownMode = false;
  },

  handleKeydown(e) {
    const dropdown = document.getElementById("globalSearchDropdown");
    const isVisible = dropdown && !dropdown.classList.contains("hidden");

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isVisible) {
        this.renderDropdown();
        return;
      }
      this._selectedIndex = Math.min(this._selectedIndex + 1, (this._currentResults?.length || 1) - 1);
      this.updateSelectionHighlight("globalDropdownResultsList");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!isVisible) return;
      this._selectedIndex = Math.max(this._selectedIndex - 1, 0);
      this.updateSelectionHighlight("globalDropdownResultsList");
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (this._currentResults && this._currentResults[this._selectedIndex]) {
        this.navigateTo(this._currentResults[this._selectedIndex].sku);
      }
    } else if (e.key === "Escape") {
      this.closeDropdown();
      const input = document.getElementById("globalSearchInput");
      if (input) input.blur();
    }
  },

  renderDropdown() {
    const dropdown = document.getElementById("globalSearchDropdown");
    if (!dropdown) return;

    dropdown.classList.remove("hidden");
    this._activeDropdownMode = true;

    const data = this.search(this._currentQuery, this._currentCategory, 12);
    this._currentResults = data.results;

    // Render Category Filter Tabs
    const tabsContainer = document.getElementById("globalDropdownCategoryTabs");
    if (tabsContainer) {
      tabsContainer.innerHTML = Object.entries(this.CATEGORY_CONFIG).map(([catKey, config]) => {
        const count = data.categoryCounts[catKey] || 0;
        const isActive = this._currentCategory === catKey;
        return `
          <button onclick="GlobalSearchEngine.setCategoryFilter('${catKey}')" class="px-2 py-0.5 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition-colors whitespace-nowrap cursor-pointer ${isActive ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800'}">
            <span>${config.label}</span>
            <span class="text-[9px] font-mono ${isActive ? 'text-indigo-200' : 'text-slate-500'}">(${count})</span>
          </button>
        `;
      }).join('');
    }

    // Update match count badge
    const countBadge = document.getElementById("globalDropdownCountBadge");
    if (countBadge) {
      countBadge.textContent = `${data.totalCount} match${data.totalCount === 1 ? '' : 'es'}`;
    }

    // Render Result Items
    const listContainer = document.getElementById("globalDropdownResultsList");
    if (listContainer) {
      if (data.results.length === 0) {
        listContainer.innerHTML = `
          <div class="py-8 text-center space-y-2">
            <i data-lucide="search-x" class="w-8 h-8 text-slate-600 mx-auto"></i>
            <p class="text-xs font-semibold text-slate-300">No hardware found matching "${escapeHTML(this._currentQuery)}"</p>
            <p class="text-[11px] text-slate-500">Try searching by partial model (e.g. MX85, V5000, 8010FX, EX4100) or SKU.</p>
          </div>
        `;
      } else {
        listContainer.innerHTML = data.results.map((entry, idx) => {
          const isSel = idx === this._selectedIndex;
          const imgHtml = entry.image ? `
            <img src="${entry.image}" alt="${escapeHTML(entry.model)}" class="max-h-full max-w-full object-contain filter drop-shadow(0 2px 4px rgba(0,0,0,0.6))" />
          ` : `
            <i data-lucide="${entry.target.icon}" class="w-4 h-4 text-slate-500"></i>
          `;

          return `
            <div
              id="search-item-${idx}"
              onclick="GlobalSearchEngine.navigateTo('${escapeHTML(entry.sku)}')"
              class="group flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all ${isSel ? 'bg-brand-600/20 border border-brand-500/40 text-white' : 'hover:bg-slate-800/80 text-slate-200 border border-transparent'}"
            >
              <div class="flex items-center gap-2.5 min-w-0 flex-1">
                <div class="w-10 h-10 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center p-1 shrink-0 overflow-hidden">
                  ${imgHtml}
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="text-[9px] font-mono px-1.5 py-0.2 rounded border ${entry.target.badgeColor} font-bold">${escapeHTML(entry.target.modeLabel)}</span>
                    <span class="text-[9px] font-semibold text-slate-400">${escapeHTML(entry.vendor)}</span>
                  </div>
                  <h4 class="text-xs font-bold truncate group-hover:text-brand-300 transition-colors">${escapeHTML(entry.model)}</h4>
                  <div class="flex items-center gap-2 text-[10px] text-slate-400 font-mono truncate">
                    <span class="text-slate-300 font-semibold">SKU: ${escapeHTML(entry.sku)}</span>
                    <span>•</span>
                    <span class="truncate">${escapeHTML(entry.specs)}</span>
                  </div>
                </div>
              </div>

              <div class="text-right shrink-0 pl-3">
                <div class="font-mono text-xs font-bold text-emerald-400">$${entry.msrp.toLocaleString()}</div>
                <span class="text-[9px] text-brand-400 flex items-center gap-0.5 justify-end font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                  Jump <i data-lucide="arrow-right" class="w-2.5 h-2.5"></i>
                </span>
              </div>
            </div>
          `;
        }).join('');
      }

      if (typeof safeCreateIcons === "function") safeCreateIcons(dropdown);
    }
  },

  setCategoryFilter(catKey) {
    this._currentCategory = catKey;
    this._selectedIndex = 0;
    this.renderDropdown();
    this.renderModal();
  },

  updateSelectionHighlight(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const items = container.querySelectorAll("[id^='search-item-'], [id^='modal-search-item-']");
    items.forEach((item, idx) => {
      if (idx === this._selectedIndex) {
        item.classList.add("bg-brand-600/20", "border-brand-500/40");
        item.scrollIntoView({ behavior: "smooth", block: "nearest" });
      } else {
        item.classList.remove("bg-brand-600/20", "border-brand-500/40");
      }
    });
  },

  // =========================================================================
  // FULL COMMAND PALETTE MODAL (Ctrl+K)
  // =========================================================================

  openModal(initialQuery = "") {
    this.closeDropdown();
    const modal = document.getElementById("globalSearchModal");
    if (!modal) return;

    modal.classList.remove("hidden");
    const input = document.getElementById("modalGlobalSearchInput");
    if (input) {
      input.value = initialQuery || this._currentQuery || "";
      this._currentQuery = input.value;
      setTimeout(() => input.focus(), 50);
    }

    this._selectedIndex = 0;
    this.renderModal();
  },

  closeModal() {
    const modal = document.getElementById("globalSearchModal");
    if (modal) modal.classList.add("hidden");
  },

  toggleModal() {
    const modal = document.getElementById("globalSearchModal");
    if (modal && !modal.classList.contains("hidden")) {
      this.closeModal();
    } else {
      this.openModal();
    }
  },

  handleModalInput(val) {
    this._currentQuery = val || "";
    this._selectedIndex = 0;
    this.renderModal();
  },

  handleModalKeydown(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      this._selectedIndex = Math.min(this._selectedIndex + 1, (this._currentResults?.length || 1) - 1);
      this.updateSelectionHighlight("modalGlobalSearchResultsList");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      this._selectedIndex = Math.max(this._selectedIndex - 1, 0);
      this.updateSelectionHighlight("modalGlobalSearchResultsList");
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (this._currentResults && this._currentResults[this._selectedIndex]) {
        this.navigateTo(this._currentResults[this._selectedIndex].sku);
      }
    } else if (e.key === "Escape") {
      this.closeModal();
    }
  },

  renderModal() {
    const modal = document.getElementById("globalSearchModal");
    if (!modal || modal.classList.contains("hidden")) return;

    const data = this.search(this._currentQuery, this._currentCategory, 35);
    this._currentResults = data.results;

    // Render Filter Chips
    const chipsContainer = document.getElementById("modalCategoryFilterChips");
    if (chipsContainer) {
      chipsContainer.innerHTML = Object.entries(this.CATEGORY_CONFIG).map(([catKey, config]) => {
        const count = data.categoryCounts[catKey] || 0;
        const isActive = this._currentCategory === catKey;
        return `
          <button onclick="GlobalSearchEngine.setCategoryFilter('${catKey}')" class="px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer border ${isActive ? 'bg-brand-600 text-white border-brand-500 shadow-md shadow-brand-500/30' : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border-slate-800'}">
            <i data-lucide="${config.icon}" class="w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-500'}"></i>
            <span>${config.label}</span>
            <span class="text-[10px] font-mono ${isActive ? 'text-indigo-200' : 'text-slate-500'}">(${count})</span>
          </button>
        `;
      }).join('');
    }

    // Update match count badge
    const badge = document.getElementById("modalMatchCountBadge");
    if (badge) {
      badge.textContent = `${data.totalCount} match${data.totalCount === 1 ? '' : 'es'}`;
    }

    // Render Results List
    const list = document.getElementById("modalGlobalSearchResultsList");
    if (list) {
      if (data.results.length === 0) {
        list.innerHTML = `
          <div class="py-16 text-center space-y-3">
            <div class="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
              <i data-lucide="search-x" class="w-6 h-6"></i>
            </div>
            <h3 class="text-sm font-bold text-slate-300">No hardware found matching "${escapeHTML(this._currentQuery)}"</h3>
            <p class="text-xs text-slate-500 max-w-sm mx-auto">Try searching by partial model, vendor, or general category. You can also press Escape to return to the catalog.</p>
          </div>
        `;
      } else {
        list.innerHTML = data.results.map((entry, idx) => {
          const isSel = idx === this._selectedIndex;
          const imgHtml = entry.image ? `
            <img src="${entry.image}" alt="${escapeHTML(entry.model)}" class="max-h-full max-w-full object-contain filter drop-shadow(0 2px 6px rgba(0,0,0,0.7))" />
          ` : `
            <i data-lucide="${entry.target.icon}" class="w-5 h-5 text-slate-500"></i>
          `;

          return `
            <div
              id="modal-search-item-${idx}"
              onclick="GlobalSearchEngine.navigateTo('${escapeHTML(entry.sku)}')"
              class="group flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all border ${isSel ? 'bg-brand-600/20 border-brand-500/50 shadow-lg text-white' : 'bg-slate-950/60 hover:bg-slate-800/80 border-slate-800/80 text-slate-200'}"
            >
              <div class="flex items-center gap-3.5 min-w-0 flex-1">
                <div class="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center p-1.5 shrink-0 overflow-hidden">
                  ${imgHtml}
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2 mb-1 flex-wrap">
                    <span class="text-[9.5px] font-mono px-2 py-0.5 rounded-full border ${entry.target.badgeColor} font-bold">${escapeHTML(entry.target.domainLabel)} › ${escapeHTML(entry.target.modeLabel)}</span>
                    <span class="text-[10px] font-bold text-slate-400">${escapeHTML(entry.vendor)}</span>
                  </div>
                  <h4 class="text-sm font-bold truncate group-hover:text-brand-300 transition-colors">${escapeHTML(entry.model)}</h4>
                  <div class="flex items-center gap-2 text-xs text-slate-400 font-mono truncate">
                    <span class="text-slate-300 font-semibold">SKU: ${escapeHTML(entry.sku)}</span>
                    <span>•</span>
                    <span class="truncate text-slate-400">${escapeHTML(entry.specs)}</span>
                  </div>
                </div>
              </div>

              <div class="text-right shrink-0 pl-4 flex items-center gap-3">
                <div>
                  <span class="text-[10px] text-slate-400 block">Est. MSRP</span>
                  <div class="font-mono text-sm font-bold text-emerald-400">$${entry.msrp.toLocaleString()}</div>
                </div>
                <button onclick="event.stopPropagation(); GlobalSearchEngine.navigateTo('${escapeHTML(entry.sku)}')" class="px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold flex items-center gap-1 shadow-md transition-colors">
                  <span>Jump</span> <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
                </button>
              </div>
            </div>
          `;
        }).join('');
      }

      if (typeof safeCreateIcons === "function") safeCreateIcons(modal);
    }
  },

  // =========================================================================
  // SETUP SHORTCUTS & EVENT LISTENERS
  // =========================================================================

  setupKeyboardShortcuts() {
    window.addEventListener("keydown", (e) => {
      // Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        this.toggleModal();
        return;
      }

      // Quick slash / shortcut when not in input
      if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        const headerInput = document.getElementById("globalSearchInput");
        if (headerInput && headerInput.offsetParent !== null) {
          headerInput.focus();
        } else {
          this.openModal();
        }
        return;
      }

      // Global Escape
      if (e.key === "Escape") {
        const modal = document.getElementById("globalSearchModal");
        if (modal && !modal.classList.contains("hidden")) {
          this.closeModal();
          return;
        }
        this.closeDropdown();
      }
    });
  },

  setupClickOutside() {
    document.addEventListener("click", (e) => {
      const wrapper = document.getElementById("headerGlobalSearchWrapper");
      if (wrapper && !wrapper.contains(e.target)) {
        this.closeDropdown();
      }
    });
  }
};

// Global Exports
window.GlobalSearchEngine = GlobalSearchEngine;
window.navigateToCatalogItem = (skuOrId) => GlobalSearchEngine.navigateTo(skuOrId);
window.openGlobalSearch = (query) => GlobalSearchEngine.openModal(query);

// Auto-initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => GlobalSearchEngine.init());
} else {
  setTimeout(() => GlobalSearchEngine.init(), 100);
}
