// ==========================================
// MASTER HARDWARE & SOFTWARE REGISTRY
// Central aggregator and indexed lookup engine
// NetSelect Enterprise Architecture
// ==========================================

const CatalogRegistry = {
  // --- Raw Domains ---
  networking: {
    switches: [],
    firewalls: [],
    wireless: [],
    optics: [],
    accessories: [],
    modularUplinks: {},
    powerSupplies: {},
    featureLicenses: {},
    mgmtSubscriptions: {},
    opticsMatrix: {}
  },
  physical_security: {
    cameras: [],
    cameraAccessories: [],
    accessControl: [],
    powerEnclosures: []
  },
  compute_storage: {
    servers: [],
    storageDrives: [],
    workstations: []
  },
  infrastructure: {
    racks: [],
    enclosures: [],
    ups: [],
    pdus: [],
    powerCords: [],
    cabling: {},
    pathways: [],
    accessories: []
  },
  software: {
    vms: [],
    access: [],
    os: []
  },

  // Fast hash lookups (O(1))
  _byId: new Map(),
  _bySku: new Map(),

  /**
   * Retrieves dataset for a specific hardware mode / category
   */
  getDatasetForMode(mode) {
    if (!mode) return [];
    if (mode === "access") {
      return (this.networking.switches || []).filter(s => s.role === "Access");
    }
    if (mode === "backbone") {
      return (this.networking.switches || []).filter(s => s.role === "Core" || s.role === "Aggregation");
    }
    if (mode === "firewalls") return this.networking.firewalls || [];
    if (mode === "optics") return this.networking.optics || [];
    if (mode === "wireless") return this.networking.wireless || [];
    if (mode === "accessories" || mode === "net_accessories" || mode === "networking_accessories") {
      return this.networking.accessories || [];
    }
    if (mode === "racks") return this.infrastructure.racks || [];
    if (mode === "enclosures") return this.infrastructure.enclosures || [];
    if (mode === "ups") return this.infrastructure.ups || [];
    if (mode === "pdus") return this.infrastructure.pdus || [];
    if (mode === "power_cords" || mode === "power_cord") return this.infrastructure.powerCords || [];
    if (mode === "cabling") {
      if (Array.isArray(this.infrastructure.cabling)) return this.infrastructure.cabling;
      if (this.infrastructure.cabling && typeof this.infrastructure.cabling === "object") {
        return Object.values(this.infrastructure.cabling).flat();
      }
      return [];
    }
    if (mode === "pathways") return this.infrastructure.pathways || [];
    if (mode === "cameras") return this.physical_security.cameras || [];
    if (mode === "camera_accessories") return this.physical_security.cameraAccessories || [];
    if (mode === "access_control") return this.physical_security.accessControl || [];
    if (mode === "power_enclosures") return this.physical_security.powerEnclosures || [];
    if (mode === "servers") return this.compute_storage.servers || [];
    if (mode === "storage") return this.compute_storage.storageDrives || [];
    if (mode === "workstations") return this.compute_storage.workstations || [];
    if (mode === "vms_software") return (this.software && this.software.vms) || [];
    if (mode === "access_software") return (this.software && this.software.access) || [];
    if (mode === "os_virtualization") return (this.software && this.software.os) || [];
    return [];
  },

  /**
   * Initializes the registry by gathering all loaded data payloads
   */
  init() {
    this.domains = this;

    // 1. Ingest Networking Switches
    this.networking.switches = [
      ...(typeof UNIFI_SWITCHES !== "undefined" ? UNIFI_SWITCHES : []),
      ...(typeof RUCKUS_SWITCHES !== "undefined" ? RUCKUS_SWITCHES : []),
      ...(typeof MERAKI_SWITCHES !== "undefined" ? MERAKI_SWITCHES : []),
      ...(typeof JUNIPER_SWITCHES !== "undefined" ? JUNIPER_SWITCHES : []),
      ...(typeof AMG_SWITCHES !== "undefined" ? AMG_SWITCHES : []),
      ...(typeof ALLIED_SWITCHES !== "undefined" ? ALLIED_SWITCHES : [])
    ];

    // 2. Ingest Other Loaded Datasets
    this.networking.firewalls = typeof FIREWALL_DATABASE !== "undefined" ? FIREWALL_DATABASE : [];
    this.networking.wireless = typeof WIRELESS_DATABASE !== "undefined" ? WIRELESS_DATABASE : [];
    this.networking.optics = typeof OPTICS_LIST !== "undefined" ? OPTICS_LIST : [];
    this.networking.modularUplinks = typeof MODULAR_UPLINK_CATALOG !== "undefined" ? MODULAR_UPLINK_CATALOG : {};
    this.networking.powerSupplies = typeof POWER_SUPPLY_CATALOG !== "undefined" ? POWER_SUPPLY_CATALOG : {};
    this.networking.featureLicenses = typeof FEATURE_LICENSE_CATALOG !== "undefined" ? FEATURE_LICENSE_CATALOG : {};
    this.networking.mgmtSubscriptions = typeof MGMT_SUBSCRIPTION_CATALOG !== "undefined" ? MGMT_SUBSCRIPTION_CATALOG : {};
    this.networking.opticsMatrix = typeof OPTICS_CATALOG !== "undefined" ? OPTICS_CATALOG : {};

    this.infrastructure.accessories = typeof ACCESSORY_DATABASE !== "undefined" ? ACCESSORY_DATABASE : [];
    this.infrastructure.cabling = typeof CABLING_CATALOG !== "undefined" ? CABLING_CATALOG : (typeof CABLING_DATABASE !== "undefined" ? CABLING_DATABASE : {});

    // Populate Networking Accessories (Mounts, Media Converters, Licenses, Modular Uplinks, Power Supplies, PoE Midspans)
    const netMounts = Object.values(typeof MOUNTING_CATALOG !== "undefined" ? MOUNTING_CATALOG : {});
    const netLicenses = [
      ...Object.values(typeof FEATURE_LICENSE_CATALOG !== "undefined" ? FEATURE_LICENSE_CATALOG : {}),
      ...Object.values(typeof MGMT_SUBSCRIPTION_CATALOG !== "undefined" ? MGMT_SUBSCRIPTION_CATALOG : {})
    ];
    const netUplinks = Object.values(typeof MODULAR_UPLINK_CATALOG !== "undefined" ? MODULAR_UPLINK_CATALOG : {});
    const netPsus = Object.values(typeof POWER_SUPPLY_CATALOG !== "undefined" ? POWER_SUPPLY_CATALOG : {});

    const netFromAccDb = this.infrastructure.accessories.filter(a =>
      a.category === "media_converter" || a.type === "media_converter" ||
      a.category === "mounting" || a.type === "mounting" || a.type === "rack_kit" ||
      a.category === "power_injector" || a.type === "poe_injector" || a.type === "poe_splitter" ||
      (a.category === "power_supply" && !a.isPdu) ||
      a.type === "time_server" ||
      a.category === "network_card" || a.type === "network_card" ||
      a.category === "environmental_sensor" || a.type === "environmental_probe" ||
      a.category === "licenses" || a.type === "license"
    );

    const rawNetAccessories = [
      ...netFromAccDb.map(item => ({
        ...item,
        domain: "networking",
        subCategory: item.type === "media_converter" || item.category === "media_converter" ? "media_converters" :
                     (item.type === "mounting" || item.category === "mounting" || item.type === "rack_kit" ? "mounts" :
                     (item.type === "license" || item.category === "licenses" ? "licenses" :
                     (item.type === "network_card" || item.category === "network_card" ? "modular_uplinks" :
                     (item.type === "poe_injector" || item.category === "power_injector" || item.type === "poe_splitter" ? "poe_injectors" :
                     (item.type === "power_supply" || item.category === "power_supply" ? "power_supplies" : "other")))))
      })),
      ...netMounts.map(item => ({
        ...item,
        domain: "networking",
        category: "mounting",
        type: "mounting",
        subCategory: "mounts",
        role: "Mounting Kit"
      })),
      ...netLicenses.map(item => ({
        ...item,
        domain: "networking",
        category: "licenses",
        type: "license",
        subCategory: "licenses",
        role: item.role || "Software License"
      })),
      ...netUplinks.map(item => ({
        ...item,
        domain: "networking",
        category: "modular_uplinks",
        type: "modular_uplink",
        subCategory: "modular_uplinks",
        role: "Modular Expansion"
      })),
      ...netPsus.map(item => ({
        ...item,
        domain: "networking",
        category: "power_supplies",
        type: "power_supply",
        subCategory: "power_supplies",
        role: "Power Supply"
      }))
    ];

    const seenNetAcc = new Set();
    this.networking.accessories = [];
    rawNetAccessories.forEach(item => {
      const key = item.sku || item.id;
      if (key && !seenNetAcc.has(key)) {
        seenNetAcc.add(key);
        this.networking.accessories.push(item);
      }
    });

    // Populate Infrastructure Collections
    // 1. 19" Equipment Racks (Open-frame racks, server cabinets, wall-mount swing racks)
    this.infrastructure.racks = this.infrastructure.accessories.filter(a =>
      (a.type === "equipment_rack" || a.category === "racks") &&
      a.category !== "mounting" && a.type !== "mounting" && a.type !== "rack_shelf" && a.type !== "rack_kit" &&
      a.type !== "media_converter" && a.category !== "media_converter" &&
      !a.type?.includes("security") && !a.type?.includes("din") && !a.type?.includes("backboard") && a.type !== "enclosure" &&
      !a.model?.toLowerCase().includes("media converter") && !a.description?.toLowerCase().includes("media converter")
    );

    // 2. Cabinets & Enclosures (Weatherproof NEMA 4X, Security Subplate Trove/LSP, DIN rail, Architectural Plywood Backboard)
    this.infrastructure.enclosures = this.infrastructure.accessories.filter(a =>
      a.type === "security_cabinet" || a.category === "security_cabinet" ||
      a.type === "enclosure" || a.category === "enclosure" || a.category === "outdoor_enclosure" ||
      a.type === "industrial_din" || a.category === "industrial_din" ||
      a.type === "architectural_backboard" || a.category === "architectural_backboard"
    );

    // 3. UPS & Battery Backup (strictly UPS & EBPs, excluding PDUs and power cords)
    this.infrastructure.ups = this.infrastructure.accessories.filter(a =>
      (a.category === "ups" || a.type === "ups" || a.type === "ebp" || a.isEbp) &&
      !a.isPdu && a.type !== "pdu" && a.category !== "pdus" && a.type !== "power_cord" && a.category !== "power_cords"
    ).map(u => {
      if (u.portCount === undefined && u.outletsCount !== undefined) u.portCount = u.outletsCount;
      if (u.outletsCount === undefined && u.portCount !== undefined) u.outletsCount = u.portCount;
      if (!u.receptacles && Array.isArray(u.receptacleBreakdown)) {
        u.receptacles = u.receptacleBreakdown.map(r => r.label || (r.count && r.type ? `${r.count}x ${r.type}` : r.type || '')).filter(Boolean).join(', ');
      }
      return u;
    });

    // 4. Rackmount PDUs & Power Distribution (strictly PDUs, excluding UPS and power cords)
    this.infrastructure.pdus = this.infrastructure.accessories.filter(a =>
      (a.type === "pdu" || a.isPdu || a.category === "pdus" || a.category === "pdu" || (a.category === "power_distribution" && !a.type?.includes("poe") && !a.model?.toLowerCase().includes("poe"))) &&
      a.type !== "ups" && a.type !== "ebp" && !a.isEbp && a.type !== "power_cord" && a.category !== "power_cords" &&
      a.type !== "poe_injector" && a.type !== "poe_splitter" && a.category !== "power_injector" && a.category !== "media_converter" && a.type !== "media_converter"
    ).map(p => {
      if (p.portCount === undefined && p.outletsCount !== undefined) p.portCount = p.outletsCount;
      if (p.outletsCount === undefined && p.portCount !== undefined) p.outletsCount = p.portCount;
      if (!p.receptacles && Array.isArray(p.receptacleBreakdown)) {
        p.receptacles = p.receptacleBreakdown.map(r => r.label || (r.count && r.type ? `${r.count}x ${r.type}` : r.type || '')).filter(Boolean).join(', ');
      }
      return p;
    });

    // 4B. Power Cords & Infrastructure Jumpers (dedicated catalog for power cords)
    this.infrastructure.powerCords = this.infrastructure.accessories.filter(a =>
      a.type === "power_cord" || a.category === "power_cords" || a.category === "power_cable"
    ).map(c => {
      if (!c.plugPairing && c.plugType) c.plugPairing = c.plugType;
      if (!c.wireGauge && c.gauge) c.wireGauge = c.gauge;
      if (c.locking === undefined && c.isLocking !== undefined) c.locking = c.isLocking;
      return c;
    });

    this.infrastructure.ebps = this.infrastructure.accessories.filter(a =>
      a.type === "ebp" || a.isEbp || a.category === "ebp"
    );

    // 5. Pathways & Cable Tray
    this.infrastructure.pathways = this.infrastructure.accessories.filter(a =>
      a.category === "pathways" || a.type === "pathway" || a.category === "cable_management"
    );

    // Ingest Physical Security & Compute
    this.physical_security.cameras = typeof CAMERAS_DATABASE !== "undefined" ? CAMERAS_DATABASE : [];
    this.physical_security.accessControl = typeof ACCESS_CONTROL_DATABASE !== "undefined" ? ACCESS_CONTROL_DATABASE : [];
    this.compute_storage.servers = typeof SERVERS_DATABASE !== "undefined" ? SERVERS_DATABASE : [];

    // 3. Build Lookup Indexes
    this._byId.clear();
    this._bySku.clear();

    const allItems = [
      ...this.networking.switches,
      ...this.networking.firewalls,
      ...this.networking.wireless,
      ...this.networking.optics,
      ...this.infrastructure.accessories,
      ...this.physical_security.cameras,
      ...this.physical_security.accessControl,
      ...this.compute_storage.servers
    ];

    // Index structured cabling items
    if (this.infrastructure.cabling && typeof this.infrastructure.cabling === "object") {
      Object.entries(this.infrastructure.cabling).forEach(([catKey, catList]) => {
        if (Array.isArray(catList)) {
          catList.forEach(cItem => {
            if (!cItem.id) cItem.id = cItem.sku;
            if (!cItem.model) cItem.model = cItem.name;
            if (!cItem.category) cItem.category = "cabling";
            if (!cItem.type) cItem.type = catKey === "patchPanels" ? "patch_panel" : (catKey === "fiberBackbone" ? "fiber_trunk" : (catKey === "patchCords" ? "patch_cord" : (catKey === "connectors" ? "connector" : "bulk_cable")));
            allItems.push(cItem);
          });
        }
      });
    }

    // Index modular expansion sleds, power supplies, mounting hardware, and feature licenses
    if (this.networking.modularUplinks) {
      allItems.push(...Object.values(this.networking.modularUplinks));
    }
    if (this.networking.powerSupplies) {
      allItems.push(...Object.values(this.networking.powerSupplies));
    }
    if (typeof MOUNTING_CATALOG !== "undefined") {
      allItems.push(...Object.values(MOUNTING_CATALOG));
    }
    if (this.networking.featureLicenses) {
      allItems.push(...Object.values(this.networking.featureLicenses));
    }
    if (this.networking.mgmtSubscriptions) {
      allItems.push(...Object.values(this.networking.mgmtSubscriptions));
    }
    if (this.networking.accessories) {
      allItems.push(...this.networking.accessories);
    }

    // Enrich with Datasheet and Product Image Assets if available
    if (typeof CATALOG_ASSETS !== "undefined") {
      for (let i = 0; i < allItems.length; i++) {
        const item = allItems[i];
        if (!item) continue;
        const asset = (item.id && CATALOG_ASSETS[item.id]) || (item.sku && CATALOG_ASSETS[item.sku]);
        if (asset) {
          if (!item.datasheetPath && asset.datasheetPath) item.datasheetPath = asset.datasheetPath;
          if (!item.image && asset.image) item.image = asset.image;
        }
      }
    }

    for (let i = 0; i < allItems.length; i++) {
      const item = allItems[i];
      if (!item) continue;
      if (item.id) this._byId.set(item.id, item);
      if (item.sku) this._bySku.set(item.sku, item);
    }

    // 4. Backwards-Compatibility Global Aliases (Keeps legacy tools working)
    window.SWITCH_DATABASE = this.networking.switches;
    window.FIREWALL_DATABASE = this.networking.firewalls;
    window.WIRELESS_DATABASE = this.networking.wireless;
    window.OPTICS_LIST = this.networking.optics;
    window.ACCESSORY_DATABASE = this.infrastructure.accessories;
    window.CABLING_CATALOG = this.infrastructure.cabling;
    window.RACKS_DATABASE = this.infrastructure.racks;
    window.ENCLOSURES_DATABASE = this.infrastructure.enclosures;
    window.UPS_DATABASE = this.infrastructure.ups;
    window.PDUS_DATABASE = this.infrastructure.pdus;
    window.POWER_CORDS_DATABASE = this.infrastructure.powerCords;
    window.PATHWAYS_DATABASE = this.infrastructure.pathways;
    window.NETWORKING_ACCESSORIES = this.networking.accessories;
    window.CAMERAS_DATABASE = this.physical_security.cameras;
    window.ACCESS_CONTROL_DATABASE = this.physical_security.accessControl;
    window.SERVERS_DATABASE = this.compute_storage.servers;
    window.MODULAR_UPLINK_CATALOG = this.networking.modularUplinks;
    window.POWER_SUPPLY_CATALOG = this.networking.powerSupplies;
    window.FEATURE_LICENSE_CATALOG = this.networking.featureLicenses;
    window.MGMT_SUBSCRIPTION_CATALOG = this.networking.mgmtSubscriptions;
    window.OPTICS_CATALOG = this.networking.opticsMatrix;
    window.CatalogRegistry = this;
    window.MASTER_CATALOG = this;

    console.info(`[CatalogRegistry] Initialized: ${this.networking.switches.length} switches, ${this.networking.firewalls.length} firewalls, ${this.infrastructure.racks.length} racks, ${this.infrastructure.ups.length} UPS, ${this.compute_storage.servers.length} servers, ${this.physical_security.cameras.length} cameras, ${this.physical_security.accessControl.length} access controllers. Indexed ${this._byId.size} unique IDs / ${this._bySku.size} SKUs.`);
  },

  /**
   * Universal Lookup: Find any item across all domains by ID or SKU
   */
  get(idOrSku) {
    if (!idOrSku) return null;
    return this._byId.get(idOrSku) || this._bySku.get(idOrSku) || null;
  },

  /**
   * Retrieves switch by ID or SKU across all switch vendors
   */
  getSwitch(idOrSku) {
    if (!idOrSku) return null;
    const item = this.get(idOrSku);
    if (item && (item.ports !== undefined || item.role === "Access" || item.role === "Core" || item.role === "Aggregation")) return item;
    return (this.networking.switches || []).find(s => s.id === idOrSku || s.sku === idOrSku) || null;
  },

  /**
   * Retrieves racks, cabinets, and enclosures, optionally filtered by hostType
   */
  getRacks(hostType = null) {
    const all = this.infrastructure.racks || [];
    if (!hostType) return all;
    return all.filter(r => {
      if (hostType === "equipment_rack") return r.type === "equipment_rack" || r.category === "racks";
      if (hostType === "security_cabinet") return r.type === "security_cabinet" || r.category === "security_cabinet" || /trove|lsp|prowire/i.test(r.model || '');
      if (hostType === "industrial_din") return r.type === "industrial_din" || r.category === "industrial_din" || r.category === "outdoor_enclosure" || /nema|altelix|hoffman/i.test(r.model || '');
      if (hostType === "architectural_backboard") return r.type === "architectural_backboard" || r.category === "architectural_backboard" || /backboard|plywood/i.test(r.model || '');
      return true;
    });
  },

  /**
   * Retrieves a specific rack or enclosure by SKU or ID
   */
  getRack(idOrSku) {
    if (!idOrSku) return null;
    const s = String(idOrSku).toLowerCase();
    const item = this.get(idOrSku);
    if (item && (item.type === "equipment_rack" || item.type === "security_cabinet" || item.type === "industrial_din" || item.type === "architectural_backboard" || item.category === "racks" || item.category === "security_cabinet" || item.category === "industrial_din")) {
      return item;
    }
    return (this.infrastructure.racks || []).find(r => r.sku?.toLowerCase() === s || r.id?.toLowerCase() === s) || null;
  },

  /**
   * Retrieves equipment across all domains by ID or SKU
   */
  getDevice(idOrSku) {
    return this.get(idOrSku);
  },

  getDeviceById(id) {
    if (!id) return null;
    return this._byId.get(id) || null;
  },

  getDeviceBySku(sku) {
    if (!sku) return null;
    return this._bySku.get(sku) || null;
  },

  getSwitches() {
    return this.networking.switches || [];
  },

  openDatasheet(idOrSku) {
    const item = this.get(idOrSku);
    const path = item?.datasheetPath;
    if (path) {
      if (typeof window.openDatasheetModal === "function") {
        window.openDatasheetModal(path, item.model || item.name, item.sku);
      } else {
        window.open(path, "_blank");
      }
      return true;
    }
    return false;
  }
};

window.CatalogRegistry = CatalogRegistry;
window.MASTER_CATALOG = CatalogRegistry;