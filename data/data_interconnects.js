// =========================================================================
// DATA: MODULAR SLEDS, LICENSES, POWER SUPPLIES, OPTICS & INTERCONNECTS
// =========================================================================

// ==========================================
// 1. MODULAR UPLINK EXPANSION SLEDS
// ==========================================
Object.assign(MODULAR_UPLINK_CATALOG, {
  // Cisco Catalyst Modular Sleds
  "C9300-NM-8X": { sku: "C9300-NM-8X", name: "Cisco 8x 10G SFP+ Network Module", speed: "10G", ports: 8, msrp: 2400 },
  "C9300-NM-2Q": { sku: "C9300-NM-2Q", name: "Cisco 2x 40G QSFP+ Network Module", speed: "40G", ports: 2, msrp: 3000 },
  "C9300X-NM-8Y": { sku: "C9300X-NM-8Y", name: "Cisco 8x 10G/25G SFP28 Network Module", speed: "25G", ports: 8, msrp: 3200 },
  "C9300X-NM-2C": { sku: "C9300X-NM-2C", name: "Cisco 2x 40G/100G QSFP28 Network Module", speed: "100G", ports: 2, msrp: 4500 },

  // Juniper EX4400 Extension Modules
  "EX4400-EM-4Y": { sku: "EX4400-EM-4Y", name: "Juniper 4x 10G/25G SFP28 Uplink Module", speed: "25G", ports: 4, msrp: 1850 },
  "EX4400-EM-1C": { sku: "EX4400-EM-1C", name: "Juniper 1x 100G QSFP28 Uplink Module", speed: "100G", ports: 1, msrp: 2400 },
  "EX4400-EM-4S": { sku: "EX4400-EM-4S", name: "Juniper 4x 1G/10G SFP+ Uplink Module", speed: "10G", ports: 4, msrp: 1200 },

  // Ruckus ICX 7650 Expansion Modules
  "ICX-4X10GF": { sku: "ICX-4X10GF", name: "Ruckus 4x 10G SFP+ Uplink Module", speed: "10G", ports: 4, msrp: 1100 },
  "ICX-2X100Q": { sku: "ICX-2X100Q", name: "Ruckus 2x 100G QSFP28 Uplink Module", speed: "100G", ports: 2, msrp: 3200 }
});

// ==========================================
// 2. HARDWARE FEATURE & PERPETUAL LICENSES
// ==========================================
Object.assign(FEATURE_LICENSE_CATALOG, {
  // Ruckus ICX FastIron Feature Licenses
  "ICX7850-PREM-LIC": { sku: "ICX7850-PREM-LIC", name: "Ruckus ICX 7850 Layer 3 Premium License (BGP, VRF-Lite)", msrp: 4500, category: "switch_feature" },
  "ICX7650-PREM-LIC": { sku: "ICX7650-PREM-LIC", name: "Ruckus ICX 7650 Advanced L3 License (OSPF, BGP, VRF, PIM)", msrp: 2800, category: "switch_feature" },
  "ICX7450-PREM-LIC": { sku: "ICX7450-PREM-LIC", name: "Ruckus ICX 7450 Layer 3 Premium Software License", msrp: 1400, category: "switch_feature" },
  "ICX7250-PREM-LIC": { sku: "ICX7250-PREM-LIC", name: "Ruckus ICX 7250 Layer 3 Premium License", msrp: 900, category: "switch_feature" },
  "ICX-MACSEC-LIC": { sku: "ICX-MACSEC-LIC", name: "Ruckus ICX 128/256-bit MACsec Hardware Encryption License", msrp: 1200, category: "switch_feature" },

  // Allied Telesis Feature Licenses
  "AT-FL-X530-CPOE": { sku: "AT-FL-X530-CPOE", name: "Allied Telesis Continuous PoE License (Zero-Drop Reboot)", msrp: 500, category: "switch_feature" },
  "AT-FL-X530-01": { sku: "AT-FL-X530-01", name: "Allied Telesis x530 Premium L3 Routing (OSPFv2, BGP4, VRF)", msrp: 1350, category: "switch_feature" },
  "AT-FL-IE340-01": { sku: "AT-IE340-FL01", name: "Allied Telesis IE340 Industrial Premium L3 Routing License", msrp: 650, category: "switch_feature" },
  "AT-IE220-FL01": { sku: "AT-IE220-FL01", name: "Allied Telesis IE220 10G Uplink & 95W PoE++ Sourcing License", msrp: 340, category: "switch_feature" },
  "AT-FL-X320-01": { sku: "AT-FL-x320-01", name: "Allied Telesis x320 Premium L3 & Continuous PoE License", msrp: 650, category: "switch_feature" },
  "AT-FL-AMF-NODE": { sku: "AT-FL-AMF-01", name: "Allied Telesis AMF-Plus Node Permanent License", msrp: 450, category: "switch_feature" },

  // Juniper Junos Feature Tiers
  "JUNIPER-S-EX-A": { sku: "S-EX-A-C1", name: "Juniper Advanced Junos L3 Routing License", msrp: 650, category: "switch_feature" },
  "JUNIPER-S-EX-P": { sku: "S-EX-P-C1", name: "Juniper Premium Junos EVPN-VXLAN License", msrp: 1250, category: "switch_feature" },

  // Firewall Threat Protection & UTM Subscriptions
  "LIC-MX67-SEC-1YR": { sku: "LIC-MX67-SEC-1YR", name: "Meraki MX67 Advanced Security License (1-Year)", msrp: 995, category: "firewall_utm" },
  "LIC-MX85-SEC-1YR": { sku: "LIC-MX85-SEC-1YR", name: "Meraki MX85 Advanced Security License (1-Year)", msrp: 2495, category: "firewall_utm" },
  "LIC-MX105-SEC-1YR": { sku: "LIC-MX105-SEC-1YR", name: "Meraki MX105 Advanced Security License (1-Year)", msrp: 4250, category: "firewall_utm" },
  "AT-FL-AR4-UTM-1YR": { sku: "AT-FL-AR4-UTM-1YR", name: "Allied Telesis AR4050S UTM Threat Protection (1-Year)", msrp: 650, category: "firewall_utm" },
  "AT-FL-AR3-UTM-1YR": { sku: "AT-FL-AR3-UTM-1YR", name: "Allied Telesis AR3050S UTM Threat Protection (1-Year)", msrp: 480, category: "firewall_utm" }
});

// ==========================================
// 3. MANAGEMENT SUBSCRIPTIONS (MULTI-YEAR TERMS)
// ==========================================
Object.assign(MGMT_SUBSCRIPTION_CATALOG, {
  "Meraki": {
    "cloud": {
      name: "Meraki Dashboard Enterprise License (Mandatory)",
      terms: {
        "1YR": { sku: "LIC-MS-1YR", msrp: 180 },
        "3YR": { sku: "LIC-MS-3YR", msrp: 360 },
        "5YR": { sku: "LIC-MS-5YR", msrp: 540 },
        "7YR": { sku: "LIC-MS-7YR", msrp: 756 },
        "10YR": { sku: "LIC-MS-10YR", msrp: 1080 }
      }
    }
  },
  "Ruckus": {
    "ruckus_one_prof": {
      name: "RUCKUS One Professional Cloud Subscription",
      terms: {
        "1YR": { sku: "CLD-PROF-APSW-REC1", msrp: 125 },
        "3YR": { sku: "CLD-PROF-APSW-REC3", msrp: 315 },
        "5YR": { sku: "CLD-PROF-APSW-REC5", msrp: 495 }
      }
    },
    "ruckus_one_esnt": {
      name: "RUCKUS One Essentials Cloud Subscription",
      terms: {
        "1YR": { sku: "CLD-ESNT-APSW-REC1", msrp: 85 },
        "3YR": { sku: "CLD-ESNT-APSW-REC3", msrp: 215 },
        "5YR": { sku: "CLD-ESNT-APSW-REC5", msrp: 340 }
      }
    },
    "smartzone": {
      name: "SmartZone ICX Switch Management License",
      terms: { "PERP": { sku: "L09-0001-SGCX", msrp: 145 } }
    },
    "standalone": {
      name: "FastIron Autonomous CLI (Included / $0)",
      terms: { "PERP": { sku: "FASTIRON-BASE", msrp: 0 } }
    }
  },
  "Juniper": {
    "mist_wired": {
      name: "Juniper Mist Wired Assurance Cloud",
      terms: {
        "1YR": { sku: "SUB-EX-1YR", msrp: 180 },
        "3YR": { sku: "SUB-EX-3YR", msrp: 480 },
        "5YR": { sku: "SUB-EX-5YR", msrp: 720 }
      }
    },
    "standalone": {
      name: "Autonomous Junos CLI (Perpetual / $0)",
      terms: { "PERP": { sku: "JUNOS-BASE", msrp: 0 } }
    }
  },
  "Allied Telesis": {
    "amf_plus": {
      name: "AMF-Plus Master Automation Subscription",
      terms: {
        "1YR": { sku: "AT-SW-APM10-1YR", msrp: 320 },
        "5YR": { sku: "AT-SW-APM10-5YR", msrp: 1280 }
      }
    },
    "standalone": {
      name: "AlliedWare Plus Autonomous CLI (Included / $0)",
      terms: { "PERP": { sku: "AW-BASE", msrp: 0 } }
    }
  },
  "UniFi": {
    "free_central": {
      name: "UniFi OS (Free Controller / $0)",
      terms: { "PERP": { sku: "UNIFI-OS-FREE", msrp: 0 } }
    }
  },
  "AMG": {
    "net_hawk": {
      name: "AMG Net-Hawk Unified Monitoring Platform",
      terms: {
        "1YR": { sku: "AMGHWK-25-P1", msrp: 650 },
        "2YR": { sku: "AMGHWK-25-P2", msrp: 1150 },
        "3YR": { sku: "AMGHWK-25-P3", msrp: 1550 }
      }
    },
    "standalone": {
      name: "Air-Gapped Embedded Linux Web/CLI ($0)",
      terms: { "PERP": { sku: "AMG-BASE", msrp: 0 } }
    }
  }
});

// ==========================================
// 4. POWER SUPPLIES & RPS MODULES
// ==========================================
Object.assign(POWER_SUPPLY_CATALOG, {
  "PWR-C1-1100WAC-P": { sku: "PWR-C1-1100WAC-P", name: "Cisco 1100W AC Platinum PSU (Catalyst 9300)", msrp: 1200, category: "internal_psu" },
  "PWR-C1-715WAC-P": { sku: "PWR-C1-715WAC-P", name: "Cisco 715W AC Platinum PSU (Catalyst 9300)", msrp: 850, category: "internal_psu" },
  "JPSU-920-AC-AFI": { sku: "JPSU-920-AC-AFI", name: "Juniper 920W AC Redundant PSU (EX4400)", msrp: 950, category: "internal_psu" },
  "RPS23-E": { sku: "RPS23-E", name: "Ruckus 1000W AC Redundant PSU (ICX 7650 / 8200)", msrp: 850, category: "internal_psu" },
  "AT-PWR800": { sku: "AT-PWR800-80", name: "Allied Telesis 800W AC Redundant PSU (x530 Series)", msrp: 750, category: "internal_psu" },
  "JPSU-H-340W-E-AC": { sku: "JPSU-H-340W-E-AC", name: "Juniper 340W External Hardened AC PSU (EX4100-H-12MP)", msrp: 650, category: "external_brick" },
  "JPSU-H-340W-AC": { sku: "JPSU-H-340W-AC", name: "Juniper 340W Internal Hardened AC PSU (EX4100-H-24MP)", msrp: 750, category: "internal_hardened" },
  "AT-PWR300": { sku: "AT-PWR300-30", name: "Allied Telesis 300W External PSU (x320 / GS980EM)", msrp: 380, category: "external_brick" },
  "AMGPSU-148-P240A": { sku: "AMGPSU-148-P240A", name: "AMG 240W Industrial DIN Rail PSU (48-56VDC)", msrp: 260, category: "din_psu" },
  "AMGPSU-148-P480A": { sku: "AMGPSU-148-P480A", name: "AMG 480W Industrial High-Power DIN Rail PSU (48-56VDC)", msrp: 420, category: "din_psu" },
  "USP-RPS": { sku: "USP-RPS", name: "UniFi SmartPower Redundant DC Power System", msrp: 399, category: "dc_rps" }
});

// ==========================================
// 5. MASTER OPTICS & INTERCONNECT DATABASE
// ==========================================
OPTICS_LIST.length = 0; // Clear and re-populate
OPTICS_LIST.push(
  // ----------------------------------------
  // A. Dedicated Proprietary Stacking Cables
  // ----------------------------------------
  { vendor: "Meraki", sku: "STACK-T1-50CM", name: "Cisco Catalyst StackWise-1T Dedicated Stacking Cable (0.5m)", speed: "1000G", speedRank: 1000, formFactor: "Stacking", medium: "stacking", msrp: 250, industrial: false },
  { vendor: "Meraki", sku: "STACK-T4-50CM", name: "Cisco Catalyst StackWise-80 Dedicated Stacking Cable (0.5m)", speed: "80G", speedRank: 80, formFactor: "Stacking", medium: "stacking", msrp: 180, industrial: false },
  { vendor: "Meraki", sku: "STACK-DAC-1M", name: "Meraki MS350/MS355 Hardware Stacking Cable (1m)", speed: "40G", speedRank: 40, formFactor: "Stacking", medium: "stacking", msrp: 180, industrial: false },
  { vendor: "Ruckus", sku: "ICX-STACK-1M", name: "Ruckus ICX QSFP+ Dedicated Hardware Stacking Cable (1m)", speed: "40G", speedRank: 40, formFactor: "Stacking", medium: "stacking", msrp: 145, industrial: false },
  { vendor: "Juniper", sku: "EX-QSFP-40GE-DAC-1M", name: "Juniper Virtual Chassis QSFP+ Dedicated Stacking Cable (1m)", speed: "40G", speedRank: 40, formFactor: "Stacking", medium: "stacking", msrp: 195, industrial: false },

  // ----------------------------------------
  // B. Direct Attach Copper (DAC) Cables
  // ----------------------------------------
  { vendor: "UniFi", sku: "UACC-DAC-SFP10-1M", name: "UniFi 10G SFP+ Direct Attach Copper Cable (1m)", speed: "10G", speedRank: 10, formFactor: "DAC", medium: "dac", msrp: 25, industrial: false },
  { vendor: "UniFi", sku: "UACC-DAC-SFP28-1M", name: "UniFi 25G SFP28 Direct Attach Copper Cable (1m)", speed: "25G", speedRank: 25, formFactor: "DAC", medium: "dac", msrp: 39, industrial: false },
  { vendor: "UniFi", sku: "UACC-DAC-QSFP28-1M", name: "UniFi 100G QSFP28 Direct Attach Copper Cable (1m)", speed: "100G", speedRank: 100, formFactor: "DAC", medium: "dac", msrp: 89, industrial: false },
  { vendor: "Meraki", sku: "MA-CBL-TA-1M", name: "Meraki 10G SFP+ Direct Attach Copper Cable (1m)", speed: "10G", speedRank: 10, formFactor: "DAC", medium: "dac", msrp: 120, industrial: false },
  { vendor: "Meraki", sku: "SFP-H25G-CU1M", name: "Cisco 25G SFP28 Direct Attach Copper Cable (1m)", speed: "25G", speedRank: 25, formFactor: "DAC", medium: "dac", msrp: 195, industrial: false },
  { vendor: "Meraki", sku: "MA-CBL-40G-1M", name: "Meraki 40G QSFP+ Direct Attach Copper Cable (1m)", speed: "40G", speedRank: 40, formFactor: "DAC", medium: "dac", msrp: 280, industrial: false },
  { vendor: "Meraki", sku: "QSFP-100G-CU1M", name: "Cisco 100G QSFP28 Direct Attach Copper Cable (1m)", speed: "100G", speedRank: 100, formFactor: "DAC", medium: "dac", msrp: 340, industrial: false },
  { vendor: "Ruckus", sku: "10G-SFPP-TWX-0101", name: "Ruckus 10G SFP+ Direct Attach Copper Cable (1m)", speed: "10G", speedRank: 10, formFactor: "DAC", medium: "dac", msrp: 95, industrial: false },
  { vendor: "Ruckus", sku: "25G-SFP28-TWX-0101", name: "Ruckus 25G SFP28 Direct Attach Copper Cable (1m)", speed: "25G", speedRank: 25, formFactor: "DAC", medium: "dac", msrp: 160, industrial: false },
  { vendor: "Ruckus", sku: "100G-QSFP28-TWX-0101", name: "Ruckus 100G QSFP28 Direct Attach Copper Cable (1m)", speed: "100G", speedRank: 100, formFactor: "DAC", medium: "dac", msrp: 290, industrial: false },
  { vendor: "Juniper", sku: "EX-SFP-10GE-DAC-1M", name: "Juniper 10G SFP+ Direct Attach Copper (1m)", speed: "10G", speedRank: 10, formFactor: "DAC", medium: "dac", msrp: 110, industrial: false },
  { vendor: "Juniper", sku: "JNP-25G-DAC-1M", name: "Juniper 25G SFP28 Direct Attach Copper (1m)", speed: "25G", speedRank: 25, formFactor: "DAC", medium: "dac", msrp: 175, industrial: false },
  { vendor: "Juniper", sku: "JNP-100G-DAC-1M", name: "Juniper 100G QSFP28 Direct Attach Copper (1m)", speed: "100G", speedRank: 100, formFactor: "DAC", medium: "dac", msrp: 310, industrial: false },
  { vendor: "AMG", sku: "AMG-DAC-10G-1M", name: "AMG Industrial 10G SFP+ DAC Cable (1m)", speed: "10G", speedRank: 10, formFactor: "DAC", medium: "dac", msrp: 85, industrial: true },
  { vendor: "Allied Telesis", sku: "AT-SP10TW1", name: "Allied Telesis 10G SFP+ Direct Attach Cable (1m)", speed: "10G", speedRank: 10, formFactor: "DAC", medium: "dac", msrp: 95, industrial: false },
  { vendor: "Allied Telesis", sku: "AT-QSFP28-1CU", name: "Allied Telesis 100G QSFP28 Direct Attach Cable (1m)", speed: "100G", speedRank: 100, formFactor: "DAC", medium: "dac", msrp: 290, industrial: false },

  // ----------------------------------------
  // C. Multimode Fiber (MMF) Transceivers
  // ----------------------------------------
  { vendor: "UniFi", sku: "UACC-OM-MM-1G-D", name: "UniFi 1G MMF SFP Transceiver (2-Pack)", speed: "1G", speedRank: 1, formFactor: "SFP", medium: "mmf", msrp: 38, industrial: false },
  { vendor: "UniFi", sku: "UACC-OM-MM-10G-D", name: "UniFi 10G MMF SFP+ Transceiver (2-Pack)", speed: "10G", speedRank: 10, formFactor: "SFP+", medium: "mmf", msrp: 76, industrial: false },
  { vendor: "UniFi", sku: "UACC-OM-MM-25G-D", name: "UniFi 25G MMF SFP28 Transceiver (2-Pack)", speed: "25G", speedRank: 25, formFactor: "SFP28", medium: "mmf", msrp: 120, industrial: false },
  { vendor: "UniFi", sku: "UACC-OM-MM-100G-D", name: "UniFi 100G MMF QSFP28 Transceiver", speed: "100G", speedRank: 100, formFactor: "QSFP28", medium: "mmf", msrp: 299, industrial: false },
  { vendor: "Meraki", sku: "MA-SFP-1GB-SX", name: "Meraki 1G Multi-Mode SFP (SX, 500m)", speed: "1G", speedRank: 1, formFactor: "SFP", medium: "mmf", msrp: 230, industrial: false },
  { vendor: "Meraki", sku: "MA-SFP-10GB-SR", name: "Meraki 10G Multi-Mode SFP+ (SR, 300m)", speed: "10G", speedRank: 10, formFactor: "SFP+", medium: "mmf", msrp: 750, industrial: false },
  { vendor: "Meraki", sku: "SFP-25G-SR-S", name: "Cisco 25G Multi-Mode SFP28 (SR, 100m)", speed: "25G", speedRank: 25, formFactor: "SFP28", medium: "mmf", msrp: 1100, industrial: false },
  { vendor: "Meraki", sku: "MA-QSFP-40G-SR4", name: "Meraki 40G Multi-Mode QSFP+ (SR4)", speed: "40G", speedRank: 40, formFactor: "QSFP+", medium: "mmf", msrp: 1900, industrial: false },
  { vendor: "Meraki", sku: "QSFP-100G-SR4-S", name: "Cisco 100G Multi-Mode QSFP28 (SR4)", speed: "100G", speedRank: 100, formFactor: "QSFP28", medium: "mmf", msrp: 2900, industrial: false },
  { vendor: "Ruckus", sku: "E1MG-SX-OM", name: "Ruckus 1G Multi-Mode SFP (SX, 500m)", speed: "1G", speedRank: 1, formFactor: "SFP", medium: "mmf", msrp: 180, industrial: false },
  { vendor: "Ruckus", sku: "10G-SFPP-SR", name: "Ruckus 10G Multi-Mode SFP+ (SR, 300m)", speed: "10G", speedRank: 10, formFactor: "SFP+", medium: "mmf", msrp: 550, industrial: false },
  { vendor: "Ruckus", sku: "25G-SFP28-SR", name: "Ruckus 25G Multi-Mode SFP28 (SR, 100m)", speed: "25G", speedRank: 25, formFactor: "SFP28", medium: "mmf", msrp: 850, industrial: false },
  { vendor: "Ruckus", sku: "40G-QSFP-SR4", name: "Ruckus 40G Multi-Mode QSFP+ (SR4)", speed: "40G", speedRank: 40, formFactor: "QSFP+", medium: "mmf", msrp: 1400, industrial: false },
  { vendor: "Ruckus", sku: "100G-QSFP28-SR4", name: "Ruckus 100G Multi-Mode QSFP28 (SR4)", speed: "100G", speedRank: 100, formFactor: "QSFP28", medium: "mmf", msrp: 2200, industrial: false },
  { vendor: "Juniper", sku: "EX-SFP-1GE-SX", name: "Juniper 1G Multi-Mode SFP (SX)", speed: "1G", speedRank: 1, formFactor: "SFP", medium: "mmf", msrp: 195, industrial: false },
  { vendor: "Juniper", sku: "EX-SFP-10GE-SR", name: "Juniper 10G Multi-Mode SFP+ (SR)", speed: "10G", speedRank: 10, formFactor: "SFP+", medium: "mmf", msrp: 620, industrial: false },
  { vendor: "Juniper", sku: "SFP-25G-SR", name: "Juniper 25G Multi-Mode SFP28 (SR)", speed: "25G", speedRank: 25, formFactor: "SFP28", medium: "mmf", msrp: 920, industrial: false },
  { vendor: "Juniper", sku: "JNP-QSFP-100G-SR4", name: "Juniper 100G Multi-Mode QSFP28 (SR4)", speed: "100G", speedRank: 100, formFactor: "QSFP28", medium: "mmf", msrp: 2400, industrial: false },
  { vendor: "AMG", sku: "SFP-MM-1G-SX05-85", name: "AMG Industrial 1G MMF SFP (-40°C to +85°C)", speed: "1G", speedRank: 1, formFactor: "SFP", medium: "mmf", msrp: 95, industrial: true },
  { vendor: "AMG", sku: "SFP-MM-10G-SR", name: "AMG Industrial 10G MMF SFP+ (-40°C to +85°C)", speed: "10G", speedRank: 10, formFactor: "SFP+", medium: "mmf", msrp: 220, industrial: true },
  { vendor: "Allied Telesis", sku: "AT-SPSX", name: "Allied Telesis 1G Multi-Mode SFP (SX, 550m)", speed: "1G", speedRank: 1, formFactor: "SFP", medium: "mmf", msrp: 160, industrial: false },
  { vendor: "Allied Telesis", sku: "AT-SP10SR", name: "Allied Telesis 10G Multi-Mode SFP+ (SR, 300m)", speed: "10G", speedRank: 10, formFactor: "SFP+", medium: "mmf", msrp: 490, industrial: false },
  { vendor: "Allied Telesis", sku: "AT-QSFP100-SR4", name: "Allied Telesis 100G Multi-Mode QSFP28 (SR4)", speed: "100G", speedRank: 100, formFactor: "QSFP28", medium: "mmf", msrp: 2400, industrial: false },

  // ----------------------------------------
  // D. Single Mode Fiber (SMF) Transceivers
  // ----------------------------------------
  { vendor: "UniFi", sku: "UACC-OM-SM-1G-D", name: "UniFi 1G Single-Mode SFP Transceiver (2-Pack)", speed: "1G", speedRank: 1, formFactor: "SFP", medium: "smf", msrp: 45, industrial: false },
  { vendor: "UniFi", sku: "UACC-OM-SM-10G-D", name: "UniFi 10G Single-Mode SFP+ Transceiver (2-Pack)", speed: "10G", speedRank: 10, formFactor: "SFP+", medium: "smf", msrp: 95, industrial: false },
  { vendor: "Meraki", sku: "MA-SFP-1GB-LX", name: "Meraki 1G Single-Mode SFP (LX, 10km)", speed: "1G", speedRank: 1, formFactor: "SFP", medium: "smf", msrp: 450, industrial: false },
  { vendor: "Meraki", sku: "MA-SFP-10GB-LR", name: "Meraki 10G Single-Mode SFP+ (LR, 10km)", speed: "10G", speedRank: 10, formFactor: "SFP+", medium: "smf", msrp: 1400, industrial: false },
  { vendor: "Meraki", sku: "SFP-25G-LR-S", name: "Cisco 25G Single-Mode SFP28 (LR, 10km)", speed: "25G", speedRank: 25, formFactor: "SFP28", medium: "smf", msrp: 2200, industrial: false },
  { vendor: "Ruckus", sku: "E1MG-LX-OM", name: "Ruckus 1G Single-Mode SFP (LX, 10km)", speed: "1G", speedRank: 1, formFactor: "SFP", medium: "smf", msrp: 350, industrial: false },
  { vendor: "Ruckus", sku: "10G-SFPP-LR", name: "Ruckus 10G Single-Mode SFP+ (LR, 10km)", speed: "10G", speedRank: 10, formFactor: "SFP+", medium: "smf", msrp: 1100, industrial: false },
  { vendor: "Ruckus", sku: "100G-QSFP28-LR4", name: "Ruckus 100G Single-Mode QSFP28 (LR4, 10km)", speed: "100G", speedRank: 100, formFactor: "QSFP28", medium: "smf", msrp: 3950, industrial: false },
  { vendor: "Juniper", sku: "EX-SFP-1GE-LX", name: "Juniper 1G Single-Mode SFP (LX)", speed: "1G", speedRank: 1, formFactor: "SFP", medium: "smf", msrp: 380, industrial: false },
  { vendor: "Juniper", sku: "EX-SFP-10GE-LR", name: "Juniper 10G Single-Mode SFP+ (LR)", speed: "10G", speedRank: 10, formFactor: "SFP+", medium: "smf", msrp: 1250, industrial: false },
  { vendor: "Juniper", sku: "JNP-QSFP-100G-LR4", name: "Juniper 100G Single-Mode QSFP28 (LR4, 10km)", speed: "100G", speedRank: 100, formFactor: "QSFP28", medium: "smf", msrp: 4200, industrial: false },
  { vendor: "AMG", sku: "SFP-SM-1G-LX20-31", name: "AMG Industrial 1G SMF SFP (-40°C to +85°C)", speed: "1G", speedRank: 1, formFactor: "SFP", medium: "smf", msrp: 140, industrial: true },
  { vendor: "AMG", sku: "SFP-SM-10G-LR", name: "AMG Industrial 10G SMF SFP+ (-40°C to +85°C)", speed: "10G", speedRank: 10, formFactor: "SFP+", medium: "smf", msrp: 360, industrial: true },
  { vendor: "Allied Telesis", sku: "AT-SPLX10", name: "Allied Telesis 1G Single-Mode SFP (LX, 10km)", speed: "1G", speedRank: 1, formFactor: "SFP", medium: "smf", msrp: 280, industrial: false },
  { vendor: "Allied Telesis", sku: "AT-SP10LR", name: "Allied Telesis 10G Single-Mode SFP+ (LR, 10km)", speed: "10G", speedRank: 10, formFactor: "SFP+", medium: "smf", msrp: 980, industrial: false }
);

// ==========================================
// 6. OPTICS MATRIX LOOKUP (AUTO-CALCULATOR)
// ==========================================
Object.assign(OPTICS_CATALOG, {
  "UniFi": {
    "1G": {
      "mmf": { sku: "UACC-OM-MM-1G-D", name: "UniFi 1G Multi-Mode SFP", msrp: 38 },
      "smf": { sku: "UACC-OM-SM-1G-D", name: "UniFi 1G Single-Mode SFP", msrp: 45 },
      "dac": null
    },
    "10G": {
      "mmf": { sku: "UACC-OM-MM-10G-D", name: "UniFi 10G Multi-Mode SFP+", msrp: 76 },
      "smf": { sku: "UACC-OM-SM-10G-D", name: "UniFi 10G Single-Mode SFP+", msrp: 95 },
      "dac": { sku: "UACC-DAC-SFP10-1M", name: "UniFi 10G Direct Attach Cable (1m)", msrp: 25 }
    },
    "25G": {
      "mmf": { sku: "UACC-OM-MM-25G-D", name: "UniFi 25G Multi-Mode SFP28", msrp: 120 },
      "smf": null,
      "dac": { sku: "UACC-DAC-SFP28-1M", name: "UniFi 25G Direct Attach Cable (1m)", msrp: 39 }
    },
    "100G": {
      "mmf": { sku: "UACC-OM-MM-100G-D", name: "UniFi 100G Multi-Mode QSFP28", msrp: 299 },
      "smf": null,
      "dac": { sku: "UACC-DAC-QSFP28-1M", name: "UniFi 100G Direct Attach Cable (1m)", msrp: 89 }
    }
  },
  "Meraki": {
    "1G": {
      "mmf": { sku: "MA-SFP-1GB-SX", name: "Meraki 1G Multi-Mode SFP", msrp: 230 },
      "smf": { sku: "MA-SFP-1GB-LX", name: "Meraki 1G Single-Mode SFP", msrp: 450 },
      "dac": null
    },
    "10G": {
      "mmf": { sku: "MA-SFP-10GB-SR", name: "Meraki 10G Multi-Mode SFP+", msrp: 750 },
      "smf": { sku: "MA-SFP-10GB-LR", name: "Meraki 10G Single-Mode SFP+", msrp: 1400 },
      "dac": { sku: "MA-CBL-TA-1M", name: "Meraki 10G Direct Attach Copper (1m)", msrp: 120 }
    },
    "25G": {
      "mmf": { sku: "SFP-25G-SR-S", name: "Cisco 25G Multi-Mode SFP28", msrp: 1100 },
      "smf": { sku: "SFP-25G-LR-S", name: "Cisco 25G Single-Mode SFP28", msrp: 2200 },
      "dac": { sku: "SFP-H25G-CU1M", name: "Cisco 25G Direct Attach Copper (1m)", msrp: 195 }
    },
    "40G": {
      "mmf": { sku: "MA-QSFP-40G-SR4", name: "Meraki 40G Multi-Mode QSFP+", msrp: 1900 },
      "smf": null,
      "dac": { sku: "MA-CBL-40G-1M", name: "Meraki 40G Direct Attach Copper (1m)", msrp: 280 }
    },
    "100G": {
      "mmf": { sku: "QSFP-100G-SR4-S", name: "Cisco 100G Multi-Mode QSFP28", msrp: 2900 },
      "smf": null,
      "dac": { sku: "QSFP-100G-CU1M", name: "Cisco 100G Direct Attach Copper (1m)", msrp: 340 }
    }
  },
  "Ruckus": {
    "1G": {
      "mmf": { sku: "E1MG-SX-OM", name: "Ruckus 1G Multi-Mode SFP", msrp: 180 },
      "smf": { sku: "E1MG-LX-OM", name: "Ruckus 1G Single-Mode SFP", msrp: 350 },
      "dac": null
    },
    "10G": {
      "mmf": { sku: "10G-SFPP-SR", name: "Ruckus 10G Multi-Mode SFP+", msrp: 550 },
      "smf": { sku: "10G-SFPP-LR", name: "Ruckus 10G Single-Mode SFP+", msrp: 1100 },
      "dac": { sku: "10G-SFPP-TWX-0101", name: "Ruckus 10G Direct Attach Copper (1m)", msrp: 95 }
    },
    "25G": {
      "mmf": { sku: "25G-SFP28-SR", name: "Ruckus 25G Multi-Mode SFP28", msrp: 850 },
      "smf": null,
      "dac": { sku: "25G-SFP28-TWX-0101", name: "Ruckus 25G Direct Attach Copper (1m)", msrp: 160 }
    },
    "40G": {
      "mmf": { sku: "40G-QSFP-SR4", name: "Ruckus 40G Multi-Mode QSFP+", msrp: 1400 },
      "smf": null,
      "dac": null
    },
    "100G": {
      "mmf": { sku: "100G-QSFP28-SR4", name: "Ruckus 100G Multi-Mode QSFP28", msrp: 2200 },
      "smf": { sku: "100G-QSFP28-LR4", name: "Ruckus 100G Single-Mode QSFP28 (10km)", msrp: 3950 },
      "dac": { sku: "100G-QSFP28-TWX-0101", name: "Ruckus 100G Direct Attach Copper (1m)", msrp: 290 }
    }
  },
  "Juniper": {
    "1G": {
      "mmf": { sku: "EX-SFP-1GE-SX", name: "Juniper 1G Multi-Mode SFP", msrp: 195 },
      "smf": { sku: "EX-SFP-1GE-LX", name: "Juniper 1G Single-Mode SFP", msrp: 380 },
      "dac": null
    },
    "10G": {
      "mmf": { sku: "EX-SFP-10GE-SR", name: "Juniper 10G Multi-Mode SFP+", msrp: 620 },
      "smf": { sku: "EX-SFP-10GE-LR", name: "Juniper 10G Single-Mode SFP+", msrp: 1250 },
      "dac": { sku: "EX-SFP-10GE-DAC-1M", name: "Juniper 10G Direct Attach Copper (1m)", msrp: 110 }
    },
    "25G": {
      "mmf": { sku: "SFP-25G-SR", name: "Juniper 25G Multi-Mode SFP28", msrp: 920 },
      "smf": null,
      "dac": { sku: "JNP-25G-DAC-1M", name: "Juniper 25G Direct Attach Copper (1m)", msrp: 175 }
    },
    "100G": {
      "mmf": { sku: "JNP-QSFP-100G-SR4", name: "Juniper 100G Multi-Mode QSFP28", msrp: 2400 },
      "smf": { sku: "JNP-QSFP-100G-LR4", name: "Juniper 100G Single-Mode QSFP28 (10km)", msrp: 4200 },
      "dac": { sku: "JNP-100G-DAC-1M", name: "Juniper 100G Direct Attach Copper (1m)", msrp: 310 }
    }
  },
  "AMG": {
    "1G": {
      "mmf": { sku: "SFP-MM-1G-SX05-85", name: "AMG Industrial 1G MMF SFP", msrp: 95 },
      "smf": { sku: "SFP-SM-1G-LX20-31", name: "AMG Industrial 1G SMF SFP", msrp: 140 },
      "dac": null
    },
    "10G": {
      "mmf": { sku: "SFP-MM-10G-SR", name: "AMG Industrial 10G MMF SFP+", msrp: 220 },
      "smf": { sku: "SFP-SM-10G-LR", name: "AMG Industrial 10G SMF SFP+", msrp: 360 },
      "dac": { sku: "AMG-DAC-10G-1M", name: "AMG Industrial 10G DAC Cable (1m)", msrp: 85 }
    }
  },
  "Allied Telesis": {
    "1G": {
      "mmf": { sku: "AT-SPSX", name: "Allied Telesis 1G Multi-Mode SFP", msrp: 160 },
      "smf": { sku: "AT-SPLX10", name: "Allied Telesis 1G Single-Mode SFP", msrp: 280 },
      "dac": null
    },
    "10G": {
      "mmf": { sku: "AT-SP10SR", name: "Allied Telesis 10G Multi-Mode SFP+", msrp: 490 },
      "smf": { sku: "AT-SP10LR", name: "Allied Telesis 10G Single-Mode SFP+", msrp: 980 },
      "dac": { sku: "AT-SP10TW1", name: "Allied Telesis 10G Direct Attach Cable (1m)", msrp: 95 }
    },
    "100G": {
      "mmf": { sku: "AT-QSFP100-SR4", name: "Allied Telesis 100G Multi-Mode QSFP28", msrp: 2400 },
      "smf": { sku: "AT-QSFP100-LR4", name: "Allied Telesis 100G Single-Mode QSFP28", msrp: 4100 },
      "dac": { sku: "AT-QSFP28-1CU", name: "Allied Telesis 100G Direct Attach Cable (1m)", msrp: 290 }
    }
  }
});