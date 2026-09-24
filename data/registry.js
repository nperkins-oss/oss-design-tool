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
    accessories: [],
    cabling: {},
    racks: [],
    ups: [],
    pathways: []
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
    if (mode === "accessories") return this.infrastructure.accessories || [];
    if (mode === "ups") return this.infrastructure.ups || [];
    if (mode === "racks") return this.infrastructure.racks || [];
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
      Object.values(this.infrastructure.cabling).forEach(cat => {
        if (Array.isArray(cat)) {
          allItems.push(...cat);
        }
      });
    }

    // Index modular expansion sleds, power supplies, and feature licenses
    if (this.networking.modularUplinks) {
      allItems.push(...Object.values(this.networking.modularUplinks));
    }
    if (this.networking.powerSupplies) {
      allItems.push(...Object.values(this.networking.powerSupplies));
    }
    if (this.networking.featureLicenses) {
      allItems.push(...Object.values(this.networking.featureLicenses));
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

    console.info(`[CatalogRegistry] Initialized: ${this.networking.switches.length} switches, ${this.networking.firewalls.length} firewalls, ${this.compute_storage.servers.length} servers, ${this.physical_security.cameras.length} cameras, ${this.physical_security.accessControl.length} access controllers. Indexed ${this._byId.size} unique IDs / ${this._bySku.size} SKUs.`);
  },

  /**
   * Universal Lookup: Find any item across all domains by ID or SKU
   */
  get(idOrSku) {
    if (!idOrSku) return null;
    return this._byId.get(idOrSku) || this._bySku.get(idOrSku) || null;
  }
};

window.CatalogRegistry = CatalogRegistry;
window.MASTER_CATALOG = CatalogRegistry;