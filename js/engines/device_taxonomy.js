// =========================================================================
// DEVICE TAXONOMY & NUMBERING ENGINE (NetSelect Enterprise)
// Standardized Prefix Mapping, Dynamic Gap-Free Numbering & Friendly Names
// =========================================================================

const DeviceTaxonomy = {
  // 11 Designated Device Type Classifications
  PREFIXES: {
    SW: { prefix: "SW", label: "Switch" },
    FW: { prefix: "FW", label: "Firewall" },
    CAM: { prefix: "CAM", label: "Camera" },
    DR: { prefix: "DR", label: "Door" },
    P2P: { prefix: "P2P", label: "Wireless Radio" },
    SIP: { prefix: "SIP", label: "Intercom" },
    SVR: { prefix: "SVR", label: "Server" },
    CWS: { prefix: "CWS", label: "Client Machine" },
    LPR: { prefix: "LPR", label: "License Plate Reader" },
    BIO: { prefix: "BIO", label: "Biometric Reader" },
    ACS: { prefix: "ACS", label: "Access Control Panel" },
    UPS: { prefix: "UPS", label: "UPS / Power" },
    DEV: { prefix: "DEV", label: "Device" }
  },

  /**
   * Identifies the device type prefix and metadata for a BOM item
   */
  getDeviceType(item) {
    if (!item) return this.PREFIXES.DEV;
    const role = (item.role || "").trim();
    const cat = (item.category || "").toLowerCase().trim();
    const model = (item.model || "").toLowerCase();
    const desc = (item.description || "").toLowerCase();
    const allText = `${role} ${cat} ${model} ${desc}`.toLowerCase();

    // 1. License Plate Readers (LPR) - evaluated before generic cameras
    if (role === "LPR" || role.includes("License Plate") || allText.includes("license plate") || 
        allText.includes("anpr") || /\blpr\b/i.test(allText)) {
      return this.PREFIXES.LPR;
    }

    // 2. Biometric Readers (BIO)
    if (role === "Biometric" || role.includes("Biometric") || 
        allText.includes("biometric") || allText.includes("fingerprint") || 
        allText.includes("facial recognition") || allText.includes("iris") || 
        allText.includes("morpho") || allText.includes("suprema")) {
      return this.PREFIXES.BIO;
    }

    // 3. Doors (DR)
    if (role === "Door" || role.includes("Door") || cat === "door" || cat === "doors" || 
        allText.includes("single door") || allText.includes("double door") || 
        allText.includes("portal") || allText.includes("turnstile")) {
      return this.PREFIXES.DR;
    }

    // 4. Access Control Panels (ACS) (Cloudlinks, Mercury panels, iSTAR, Trove, etc.)
    if (cat === "access_control" || role === "Access Control" || item.doorCapacity || item.controllerType || 
        /cloudlink|mercury|istar|lp1501|lp1502|lp2500|lp4502|mr52|mr50|mr16|trove|fpo|eflow|subplate|controller|synergis/i.test(allText)) {
      return this.PREFIXES.ACS;
    }

    // 5. Cameras (CAM)
    if (role === "Camera" || role === "Surveillance" || role === "Video" || 
        cat === "camera" || cat === "cameras" || cat === "surveillance" ||
        /\b(camera|cams?|dome|bullet|ptz|turret|fisheye|multisensor)\b/i.test(allText)) {
      return this.PREFIXES.CAM;
    }

    // 6. Intercoms (SIP)
    if (role === "Intercom" || role === "Audio/Intercom" || cat.includes("intercom") || 
        /\b(intercom|doorbell|sip|horn speaker|talkswitch)\b/i.test(allText)) {
      return this.PREFIXES.SIP;
    }

    // 7. Wireless Radios (P2P)
    if (role === "Wireless Bridge" || role === "Wireless" || role === "P2P" || 
        cat.includes("wireless") || /\b(nanobeam|gigabeam|airmax|wave|bridge|p2p|ptmp)\b/i.test(allText)) {
      return this.PREFIXES.P2P;
    }

    // 8. Firewalls (FW)
    if (role === "Firewall" || role.includes("Firewall") || role.includes("Security WAN") || 
        cat === "firewall" || cat === "security_appliance" ||
        /\b(firewall|fortigate|palo alto|meraki mx|sonicwall|udm-pro|udm-se|gateway)\b/i.test(allText)) {
      return this.PREFIXES.FW;
    }

    // 9. Switches (SW)
    if (role === "Access" || role === "Core" || role === "Aggregation" || role === "Core & Agg" || 
        role.includes("Switch") || cat === "switch" || allText.includes("switch")) {
      return this.PREFIXES.SW;
    }

    // 10. Client Machines (CWS)
    if (role === "Client Machine" || role === "Workstation" || role === "Client" || 
        cat.includes("workstation") || cat.includes("client") || 
        /\b(workstation|client machine|viewing station|client pc)\b/i.test(allText)) {
      return this.PREFIXES.CWS;
    }

    // 11. Servers & Storage (SVR)
    if (role === "Server" || role === "Storage" || cat.includes("server") || cat.includes("storage") || 
        /\b(server|poweredge|proliant|nvr|nas|san|unvr)\b/i.test(allText)) {
      return this.PREFIXES.SVR;
    }

    // 12. Power / UPS
    if (role === "UPS" || cat.includes("ups") || /\b(ups|smart-ups|battery backup)\b/i.test(allText)) {
      return this.PREFIXES.UPS;
    }

    return this.PREFIXES.DEV;
  },

  /**
   * Helper classification methods for tools & facility analysis
   */
  isCamera(item) {
    if (!item) return false;
    const type = this.getDeviceType(item);
    return type.prefix === "CAM" || type.prefix === "LPR";
  },

  isAccessControl(item) {
    if (!item) return false;
    const type = this.getDeviceType(item);
    return type.prefix === "ACS" || type.prefix === "DR" || type.prefix === "BIO";
  },

  isIntercom(item) {
    if (!item) return false;
    const type = this.getDeviceType(item);
    return type.prefix === "SIP";
  },

  isWireless(item) {
    if (!item) return false;
    const type = this.getDeviceType(item);
    return type.prefix === "P2P";
  },

  isSwitch(item) {
    if (!item) return false;
    const type = this.getDeviceType(item);
    return type.prefix === "SW";
  },

  isServer(item) {
    if (!item) return false;
    const type = this.getDeviceType(item);
    return type.prefix === "SVR" || type.prefix === "CWS";
  },

  isFirewall(item) {
    if (!item) return false;
    const type = this.getDeviceType(item);
    return type.prefix === "FW";
  },

  isFieldDevice(item) {
    if (!item) return false;
    const type = this.getDeviceType(item);
    return ["CAM", "LPR", "DR", "ACS", "BIO", "SIP", "P2P", "DEV"].includes(type.prefix);
  },

  /**
   * Recalculates sequential device numbers by type without gaps
   * Format:
   *  < 100 devices: 01-99
   *  100-999 devices: 001-999
   *  1000-9999 devices: 0001-9999
   */
  recalculateNumbers(bom) {
    if (!Array.isArray(bom)) return;

    // Group items by prefix (ignore accessory/child items that have parentInstanceId)
    const groups = {};
    bom.forEach(item => {
      if (item.parentInstanceId) return;
      if (item.role === "Optics & DAC" || item.role === "Mgmt License" || item.role === "Security License" || item.role === "Stacking Cable" || item.role === "Structured Cabling" || item.isPassive || item.category === "Infrastructure" || item.category === "passive" || item.sku?.startsWith("PP-") || item.sku?.startsWith("HCM-") || item.sku?.startsWith("C6A-") || item.source?.includes("pod") || item.source?.includes("stack_")) {
        item.deviceNumber = null;
        item.friendlyName = null;
        item.customFriendlyName = null;
        return;
      }

      const typeInfo = this.getDeviceType(item);
      item.deviceTypePrefix = typeInfo.prefix;
      item.deviceTypeLabel = typeInfo.label;

      if (!groups[typeInfo.prefix]) groups[typeInfo.prefix] = [];
      groups[typeInfo.prefix].push(item);
    });

    // Number each group
    Object.entries(groups).forEach(([prefix, items]) => {
      const totalUnits = items.reduce((sum, it) => sum + (parseInt(it.qty, 10) || 1), 0);
      let padLength = 2;
      if (totalUnits >= 1000) padLength = 4;
      else if (totalUnits >= 100) padLength = 3;
      else padLength = 2;

      let currentNum = 1;
      items.forEach(item => {
        const qty = parseInt(item.qty, 10) || 1;
        item.deviceIndex = currentNum;
        if (qty === 1) {
          item.deviceNumber = `${prefix}${String(currentNum).padStart(padLength, '0')}`;
          currentNum++;
        } else {
          const startNum = `${prefix}${String(currentNum).padStart(padLength, '0')}`;
          const endNum = `${prefix}${String(currentNum + qty - 1).padStart(padLength, '0')}`;
          item.deviceNumber = `${startNum}-${endNum}`;
          currentNum += qty;
        }

        // If custom friendly name exists, ensure it is also sanitized without spaces
        if (item.customFriendlyName) {
          item.customFriendlyName = this.sanitizeSegment(item.customFriendlyName);
        }

        // Keep friendly name synchronized
        item.friendlyName = this.getFriendlyName(item);
      });
    });
  },

  /**
   * Sanitizes a string segment so it contains strictly NO whitespace
   * Converts separators (•, ·, /) and spaces into hyphens, collapses consecutive hyphens
   */
  sanitizeSegment(str) {
    if (!str) return "";
    return String(str)
      .replace(/[•·/\\|]/g, '-')
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9_.-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  },

  /**
   * Formats default friendly name: Location-SKU-Device Number (strictly no spaces)
   */
  getDefaultFriendlyName(item) {
    if (!item) return "";
    const isPassive = item.role === "Structured Cabling" || item.isPassive || item.category === "Infrastructure" || item.category === "passive" || item.sku?.startsWith("PP-") || item.sku?.startsWith("HCM-") || item.sku?.startsWith("C6A-") || item.source?.includes("pod") || item.source?.includes("stack_");
    if (isPassive) {
      return item.model;
    }
    let rawLoc = item.closetName || item.rackId || "Unassigned";
    if (typeof FacilityStore !== "undefined" && typeof FacilityStore.normalize === "function") {
      rawLoc = FacilityStore.normalize(rawLoc);
    }
    const cleanLoc = this.sanitizeSegment(rawLoc) || "Unassigned";
    const rawSku = item.sku || item.id || item.model || "Device";
    const cleanSku = this.sanitizeSegment(rawSku) || "DEV";
    const rawNum = item.deviceNumber || "";
    const cleanNum = this.sanitizeSegment(rawNum);

    const parts = [cleanLoc, cleanSku];
    if (cleanNum) parts.push(cleanNum);

    // Final safeguard: strictly guarantee zero spaces and clean hyphenation
    return parts.join('-').replace(/\s+/g, '').replace(/-+/g, '-');
  },

  /**
   * Gets effective friendly name (custom user override or default)
   */
  getFriendlyName(item) {
    if (!item) return "";
    if (item.customFriendlyName && item.customFriendlyName.trim()) {
      return this.sanitizeSegment(item.customFriendlyName.trim());
    }
    return this.getDefaultFriendlyName(item);
  },

  /**
   * Sets or clears custom friendly name (strictly sanitized with zero spaces)
   */
  setFriendlyName(item, newName) {
    if (!item) return;
    const defaultName = this.getDefaultFriendlyName(item);
    const sanitized = this.sanitizeSegment(newName || "");
    if (!sanitized || sanitized === defaultName) {
      delete item.customFriendlyName;
      item.friendlyName = defaultName;
    } else {
      item.customFriendlyName = sanitized;
      item.friendlyName = sanitized;
    }
  },

  /**
   * Prompts user from any screen to edit friendly name
   */
  promptEditDeviceFriendlyName(instanceId) {
    if (!instanceId || typeof projectBOM === "undefined") return;
    const item = projectBOM.find(i => i.instanceId === instanceId);
    if (!item) return;

    const currentName = item.customFriendlyName ? this.sanitizeSegment(item.customFriendlyName) : this.getDefaultFriendlyName(item);
    const defaultName = this.getDefaultFriendlyName(item);
    const input = prompt(
      `Edit Friendly Name for ${item.model} (${item.deviceNumber || ''}):\n(Format: Location-SKU-DeviceNumber, strictly no spaces)\n\n(Leave empty to reset to default: "${defaultName}")`,
      currentName
    );

    if (input === null) return; // User cancelled

    this.setFriendlyName(item, input);

    if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
      FacilityStore.notifyWorkspaceChange();
    }
    if (typeof showToast === "function") {
      showToast(item.customFriendlyName ? `Updated friendly name to "${item.friendlyName}"` : `Reset friendly name to default.`);
    }
  }
};

window.DeviceTaxonomy = DeviceTaxonomy;
window.promptEditDeviceFriendlyName = (instanceId) => DeviceTaxonomy.promptEditDeviceFriendlyName(instanceId);
