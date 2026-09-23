// ==========================================
// WIRELESS PTP / PTMP BRIDGING DATABASE
// Ubiquiti, Siklu, Cambium, & AMG Systems
// ==========================================

const WIRELESS_ACCESSORY_CATALOG = {
  // Mounts & Hardware
  "UBI-PREC-MNT": { sku: "UBI-PREC-MNT", name: "Ubiquiti Precision Alignment Mount (Wave/airFiber)", msrp: 99, category: "mount" },
  "SIK-EH-MK-SM": { sku: "SIK-EH-MK-SM", name: "Siklu Standard Small Pole Mount Bracket", msrp: 185, category: "mount" },
  "SIK-EH-MK-PREC": { sku: "SIK-EH-MK-PREC", name: "Siklu High-Precision Directional Axis Mount", msrp: 350, category: "mount" },
  "CAM-N000045L002A": { sku: "CAM-N000045L002A", name: "Cambium Tilt Bracket Assembly", msrp: 75, category: "mount" },
  "AMG-BRK-WL01": { sku: "AMG-BRK-WL01", name: "AMG Heavy-Duty Industrial Swivel Pole Mount", msrp: 120, category: "mount" },

  // Antennas
  "CAM-C050900D021A": { sku: "CAM-C050900D021A", name: "Cambium 5GHz 90-deg 4x4 Sector Antenna (17 dBi)", msrp: 410, category: "antenna" },
  "CAM-RD-5G30": { sku: "CAM-RD-5G30", name: "Cambium 5GHz 30 dBi High-Gain Dish Antenna", msrp: 260, category: "antenna" },
  "SIK-ANT-1FT": { sku: "SIK-ANT-1FT", name: "Siklu 1-Foot High-Gain 70/80GHz Antenna (43 dBi)", msrp: 520, category: "antenna" },
  "SIK-ANT-2FT": { sku: "SIK-ANT-2FT", name: "Siklu 2-Foot Ultra-Gain 70/80GHz Antenna (50 dBi)", msrp: 950, category: "antenna" },

  // Surge Suppressors & Power
  "ETH-SP-G2": { sku: "ETH-SP-G2", name: "Ubiquiti Outdoor Gigabit PoE Surge Protector", msrp: 19, category: "surge" },
  "CAM-C000065L007B": { sku: "CAM-C000065L007B", name: "Cambium Gigabit Outdoor Surge Suppressor (600SS)", msrp: 85, category: "surge" },
  "SIK-PoE-60W": { sku: "SIK-PoE-60W", name: "Siklu 60W Outdoor Hardened Passive PoE Injector", msrp: 145, category: "psu" }
};

const WIRELESS_LICENSE_CATALOG = {
  "SIK-LIC-1G-2.5G": { sku: "SIK-LIC-1G-2.5G", name: "Siklu EH-1200 Capacity Upgrade (1Gbps to 2.5Gbps)", msrp: 850 },
  "SIK-LIC-10G": { sku: "SIK-LIC-10G", name: "Siklu EH-8010 Capacity Key (Full 10Gbps Uncapped)", msrp: 1600 },
  "CAM-LIC-EPMP-FULL": { sku: "CAM-LIC-EPMP-FULL", name: "Cambium Full-Rate AP Client License (Uncapped)", msrp: 250 },
  "AMG-LIC-AES256": { sku: "AMG-LIC-AES256", name: "AMG Industrial FIPS 140-2 AES-256 Encryption License", msrp: 320 }
};

const WIRELESS_DATABASE = [
  // --- UBIQUITI 60GHz / 5GHz ---
  {
    id: "ubi-wave-pro",
    vendor: "Ubiquiti",
    model: "Wave Pro (60 GHz / 5 GHz Backup)",
    sku: "Wave-Pro",
    topology: "PtP",
    band: "60 GHz mmWave",
    maxThroughput: "5.4 Gbps",
    maxRangeKm: 15,
    recommendedMinKm: 1.0,
    frequency: "57 - 71 GHz",
    integratedAntenna: "46 dBi (Integrated)",
    poeRequired: "48V Passive / 802.3at",
    powerWatts: 24,
    integrated5gBackup: true,
    msrp: 499,
    mountingIncluded: "Standard Pole Clamp",
    precisionMountSku: "UBI-PREC-MNT",
    surgeSku: "ETH-SP-G2",
    features: ["5.4 Gbps aggregate throughput", "Automatic 5 GHz failover radio", "Built-in GPS sync", "Long-range PtP/PtMP station"]
  },
  {
    id: "ubi-wave-nano",
    vendor: "Ubiquiti",
    model: "Wave Nano (60 GHz / 5 GHz Backup)",
    sku: "Wave-Nano",
    topology: "PtP",
    band: "60 GHz mmWave",
    maxThroughput: "2.0 Gbps",
    maxRangeKm: 5,
    recommendedMinKm: 0.1,
    frequency: "57 - 71 GHz",
    integratedAntenna: "41 dBi (Integrated)",
    poeRequired: "24V/48V Passive PoE",
    powerWatts: 18,
    integrated5gBackup: true,
    msrp: 299,
    mountingIncluded: "Ball-Joint Mount",
    precisionMountSku: "UBI-PREC-MNT",
    surgeSku: "ETH-SP-G2",
    features: ["Compact client or short PtP", "2 Gbps aggregate link", "Integrated 5GHz backup", "Weather-resistant IPX6"]
  },
  {
    id: "ubi-wave-ap",
    vendor: "Ubiquiti",
    model: "Wave AP 30-deg (PtMP BaseStation)",
    sku: "Wave-AP",
    topology: "PtMP-AP",
    band: "60 GHz mmWave",
    maxThroughput: "5.4 Gbps",
    maxRangeKm: 8,
    recommendedMinKm: 0.1,
    frequency: "57 - 71 GHz",
    integratedAntenna: "24 dBi 30-deg Sector",
    poeRequired: "48V Passive / 802.3at",
    powerWatts: 26,
    integrated5gBackup: true,
    msrp: 799,
    mountingIncluded: "Heavy Duty Pole Clamp",
    precisionMountSku: "UBI-PREC-MNT",
    surgeSku: "ETH-SP-G2",
    features: ["Connects up to 15 Wave Stations", "30-deg beam coverage", "Integrated 5GHz backup radio", "2.5G SFP port + 1G RJ45"]
  },

  // --- SIKLU BY CERAGON (E-BAND & V-BAND) ---
  {
    id: "siklu-eh-8010fx",
    vendor: "Siklu",
    model: "EtherHaul 8010FX 10G Carrier Link",
    sku: "EH-8010FX-ODU",
    topology: "PtP",
    band: "70/80 GHz E-Band",
    maxThroughput: "10.0 Gbps",
    maxRangeKm: 7,
    recommendedMinKm: 0.5,
    frequency: "71 - 86 GHz",
    integratedAntenna: "Modular (Requires External Antenna)",
    poeRequired: "50-57V DC / PoE++ (60W)",
    powerWatts: 50,
    integrated5gBackup: false,
    msrp: 4850,
    needsExternalAntenna: true,
    supportedAntennaSkus: ["SIK-ANT-1FT", "SIK-ANT-2FT"],
    mountingIncluded: "None",
    precisionMountSku: "SIK-EH-MK-PREC",
    licenseSku: "SIK-LIC-10G",
    surgeSku: "CAM-C000065L007B",
    features: ["Full 10 Gbps full-duplex FDD", "Interference-free E-Band pencil beam", "Zero frame delay for mission-critical video", "SFP+ 10G optical interface"]
  },
  {
    id: "siklu-mh-n366",
    vendor: "Siklu",
    model: "MultiHaul TG Node N366 (360-deg Mesh Base)",
    sku: "MH-N366-CCP-PoE",
    topology: "PtMP-AP",
    band: "60 GHz V-Band",
    maxThroughput: "3.8 Gbps",
    maxRangeKm: 0.8,
    recommendedMinKm: 0.05,
    frequency: "57 - 66 GHz",
    integratedAntenna: "360-deg Beamforming Array",
    poeRequired: "PoE++ (60W) or Direct DC",
    powerWatts: 55,
    integrated5gBackup: false,
    msrp: 2950,
    mountingIncluded: "Wall / Pole Mount Included",
    precisionMountSku: "SIK-EH-MK-SM",
    surgeSku: "CAM-C000065L007B",
    features: ["Autonomous Terragraph mesh node", "360-degree coverage array", "Connects up to 30 terminal units", "Ideal for downtown smart surveillance"]
  },

  // --- CAMBIUM NETWORKS (EPMP & 60GHz) ---
  {
    id: "cam-epmp-force425",
    vendor: "Cambium",
    model: "ePMP Force 425 (5 GHz High-Gain PtP)",
    sku: "C050940M001A",
    topology: "PtP",
    band: "5 GHz Sub-6",
    maxThroughput: "1.0 Gbps",
    maxRangeKm: 32,
    recommendedMinKm: 2.0,
    frequency: "4.9 - 6.1 GHz",
    integratedAntenna: "25 dBi Integrated Dish",
    poeRequired: "56V Gigabit Passive PoE",
    powerWatts: 28,
    integrated5gBackup: false,
    msrp: 395,
    mountingIncluded: "Integrated Dish Pole Clamp",
    precisionMountSku: "CAM-N000045L002A",
    surgeSku: "CAM-C000065L007B",
    features: ["Extreme distance resilience (>30 km)", "Immune to heavy rain fade (5 GHz)", "802.11ax / Wi-Fi 6 radio architecture", "1 Gbps throughput"]
  },
  {
    id: "cam-epmp-3000",
    vendor: "Cambium",
    model: "ePMP 3000 4x4 MU-MIMO Access Point",
    sku: "C050900A011A",
    topology: "PtMP-AP",
    band: "5 GHz Sub-6",
    maxThroughput: "1.2 Gbps",
    maxRangeKm: 16,
    recommendedMinKm: 0.5,
    frequency: "4.9 - 5.9 GHz",
    integratedAntenna: "Connectorized (Requires Sector)",
    poeRequired: "56V Gigabit Passive PoE",
    powerWatts: 30,
    integrated5gBackup: false,
    msrp: 895,
    needsExternalAntenna: true,
    supportedAntennaSkus: ["CAM-C050900D021A"],
    mountingIncluded: "Pole Mount Included",
    precisionMountSku: "CAM-N000045L002A",
    licenseSku: "CAM-LIC-EPMP-FULL",
    surgeSku: "CAM-C000065L007B",
    features: ["4x4 MU-MIMO serves 2 stations simultaneously", "Frequency-reuse with integrated GPS sync", "Supports up to 120 client subscriber modules", "Best for multi-site perimeter gates"]
  },

  // --- AMG SYSTEMS (INDUSTRIAL SECURITY HARDENED) ---
  {
    id: "amg-wl-ptp-ind",
    vendor: "AMG",
    model: "AMG-WL-5G Industrial Substation PtP Link",
    sku: "AMG9024M-PTP",
    topology: "PtP",
    band: "5 GHz Sub-6",
    maxThroughput: "867 Mbps",
    maxRangeKm: 12,
    recommendedMinKm: 0.2,
    frequency: "5.1 - 5.8 GHz",
    integratedAntenna: "19 dBi Dual-Pol Panel",
    poeRequired: "48V 802.3af/at PoE",
    powerWatts: 12,
    integrated5gBackup: false,
    msrp: 680,
    mountingIncluded: "Cast-Aluminum Ball Mount",
    precisionMountSku: "AMG-BRK-WL01",
    licenseSku: "AMG-LIC-AES256",
    surgeSku: "CAM-C000065L007B",
    features: ["-40C to +75C operating temperature", "Substation IEC 61850-3 certified", "FIPS 140-2 ready with license", "Direct 802.3af standard PoE"]
  }
];