// SUBSYSTEM: Engineering Sizers — Video Storage, RAID Matrix, 30TB Archiver & Failover Engine (js/sizers/sizer_video_storage.js)

// =========================================================================
// VIDEO RETENTION, BITRATE, RAID DRIVE MATRIX & GENETEC 5.14 ARCHIVER SIZER
// Note: Tunable math coefficients are isolated in VIDEO_STORAGE_CONSTANTS
// and GENETEC_514_REQUIREMENTS so custom values can be updated in one place.
// Reference: Genetec Security Center 5.14.1.0 System Requirements Guide
//            (Datasheets/Genetec/SystemRequirements.pdf)
// =========================================================================

const VIDEO_STORAGE_CONSTANTS = {
  // Baseline H.264 @ 30 FPS, Medium Scene Activity bitrate (Mbps per sensor head)
  // Calibrated to industry standards & Genetec 5.14 Guide (p.6 & p.12: 1080p=4.8 Mbps, 4K=19.0 Mbps)
  BASE_H264_30FPS_MBPS_BY_MP: {
    1: 2.4,   // 720p HD (1280x720)
    2: 4.8,   // 1080p Full HD (1920x1080) - Genetec 5.14 benchmark: 4.8 Mbps
    3: 6.8,   // 3MP (2048x1536)
    4: 8.8,   // 4MP 2K QHD (2560x1440)
    5: 10.5,  // 5MP (2592x1944)
    6: 12.8,  // 6MP (3072x2048)
    8: 19.0,  // 8MP 4K Ultra HD (3840x2160) - Genetec 5.14 benchmark: 19.0 Mbps
    12: 26.0, // 12MP Fisheye / Panoramic
    16: 35.0, // 16MP / Multi-Sensor (e.g. 4x4MP)
    20: 42.0, // 20MP Multi-Sensor (4x5MP)
    32: 76.0  // 32MP Multi-Sensor (4x8MP 4K)
  },

  // Codec compression multipliers relative to H.264 (1.00)
  // Calibrated to Genetec 5.14 Guide (p.6: 1080p H.264=4.8, H.265=3.2, AV1=3.1; 4K H.264=19.0, H.265=13.4, AV1=12.7)
  CODEC_MULTIPLIERS: {
    "H.264": 1.00,       // Standard H.264 / AVC
    "h264": 1.00,
    "H.265": 0.68,       // Standard H.265 / HEVC (~32% reduction vs H.264)
    "h265": 0.68,
    "H.265+": 0.45,      // Smart Codec (Zipstream / WiseStream / HDSM ~55% reduction)
    "h265_smart": 0.45,
    "AV1": 0.65,         // AV1 Codec (Genetec 5.14 benchmark ~35% reduction vs H.264)
    "av1": 0.65,
    "AVI": 3.50,         // Uncompressed / MJPEG / AVI stream (~3.5x H.264)
    "avi": 3.50
  },

  // Scene Activity / Complexity multipliers
  SCENE_ACTIVITY_MULTIPLIERS: {
    "low": { label: "Low (Hallway / Static)", mult: 0.65 },
    "medium": { label: "Medium (Standard Commercial)", mult: 1.00 },
    "high": { label: "High (Traffic / Crowds / Foliage)", mult: 1.40 },
    "ultra": { label: "Very High (Casino / High Detail)", mult: 1.75 }
  },

  REFERENCE_FPS: 30,
  FPS_SCALING_EXPONENT: 0.85, // Non-linear GOP I/P-frame scaling relative to 30 FPS

  // Standard Enterprise Surveillance / Enterprise SAS/SATA 3.5" HDD Capacities (TB)
  STANDARD_DRIVE_SIZES_TB: [4, 8, 12, 16, 18, 20, 22, 24],

  // RAID Level Definitions & Parity Rules
  RAID_LEVELS: {
    "RAID 5": {
      id: "RAID 5",
      label: "RAID 5 (Single Parity)",
      minDrives: 3,
      parityDrivesPerGroup: 1,
      maxDrivesPerGroup: 16,
      mirrorFactor: 1,
      approxRawMultiplier: 1.20,
      description: "1 parity drive per RAID group; tolerates 1 drive failure."
    },
    "RAID 6": {
      id: "RAID 6",
      label: "RAID 6 (Dual Parity)",
      minDrives: 4,
      parityDrivesPerGroup: 2,
      maxDrivesPerGroup: 24,
      mirrorFactor: 1,
      approxRawMultiplier: 1.33,
      description: "2 parity drives per RAID group; tolerates 2 simultaneous drive failures (Enterprise Standard)."
    },
    "RAID 10": {
      id: "RAID 10",
      label: "RAID 10 (Mirrored Stripes)",
      minDrives: 4,
      parityDrivesPerGroup: 0,
      maxDrivesPerGroup: 24,
      mirrorFactor: 2,
      approxRawMultiplier: 2.00,
      description: "50% usable capacity (mirrored pairs); fastest rebuild & write IOPS."
    },
    "RAID 50": {
      id: "RAID 50",
      label: "RAID 50 (Dual RAID-5 Spans)",
      minDrives: 6,
      parityDrivesPerGroup: 2,
      maxDrivesPerGroup: 24,
      mirrorFactor: 1,
      approxRawMultiplier: 1.25,
      description: "2 parity drives across dual RAID-5 spans; high write throughput."
    },
    "RAID 60": {
      id: "RAID 60",
      label: "RAID 60 (Dual RAID-6 Spans)",
      minDrives: 8,
      parityDrivesPerGroup: 4,
      maxDrivesPerGroup: 24,
      mirrorFactor: 1,
      approxRawMultiplier: 1.40,
      description: "4 parity drives across dual RAID-6 spans; recommended for 24-bay high-density SANs."
    },
    "JBOD": {
      id: "JBOD",
      label: "JBOD / RAID 0 (No Parity)",
      minDrives: 1,
      parityDrivesPerGroup: 0,
      maxDrivesPerGroup: 24,
      mirrorFactor: 1,
      approxRawMultiplier: 1.00,
      description: "100% raw capacity; zero fault tolerance (not recommended for critical video)."
    }
  },

  STORAGE_SAFETY_BUFFER: 1.10 // 10% filesystem, database index & pre-event buffer overhead
};

// Genetec Security Center 5.14.1.0 Official System Requirements (Datasheets/Genetec/SystemRequirements.pdf & Administrator Guide 5.14)
const GENETEC_514_REQUIREMENTS = {
  datasheetPath: "Datasheets/Genetec/SystemRequirements.pdf",
  adminGuidePath: "Datasheets/Genetec/EN.Security Center Administrator Guide 5.14.pdf",
  synergisHardwarePath: "Datasheets/Genetec/EN.Synergis Supported Hardware and Features 12.0_3.3_5.14.xlsx",
  missionControlGuidePath: "Datasheets/Genetec/Plugins/EN.Genetec Mission Control Deployment Guide 3.4.1.0.pdf",
  dmpGuidePath: "Datasheets/Genetec/Plugins/EN.DMP Intrusion Panel Extension Guide 4.5.0.pdf",
  sipeliaGuidePath: "Datasheets/Genetec/Plugins/EN.Sipelia User Guide 2.14.0.0.pdf",
  version: "5.14.1.0",
  maxLogicalVolumeSizeTb: 30,              // 30 TB max usable per Windows Volume (and each Archiver role requires separate Windows volumes)
  directoryIsolationThresholdCameras: 300, // Page 15 Sec 1.10: >300 cameras requires dedicated Directory server
  maxDirectoryLoadBalancedServers: 5,      // EN.Security Center Administrator Guide 5.14: Up to 5 load-balanced Directory servers via Directory Manager
  maxMediaGatewayConnections: 500,         // EN.Security Center Administrator Guide 5.14: ~500 stream cap per Media Gateway (never co-host with Archiver)
  maxAutoVuUnitsPerAlprManagerRole: 100,   // EN.Security Center Administrator Guide 5.14: Max 100 AutoVu units per ALPR Manager role
  maxFederationRolesPerGroup: 100,         // EN.Security Center Administrator Guide 5.14: Max 100 Federation roles per Federation Role Group (up to 500 sites/server, max 2 levels)
  maxPlaybackMbpsOnHighPerf: 100,

  // Synergis 12.0 / Cloud Link 3.3 / SC 5.14 Controller & Reader Capacity Rules (EN.Synergis Supported Hardware and Features 12.0_3.3_5.14.xlsx)
  SYNERGIS_CONTROLLER_RULES: {
    cloudLink: {
      model: "Synergis Cloud Link (SCL)",
      maxCardholders: 600000,
      maxOfflineEvents: 5000000,
      maxReadersTotal: 256,
      maxMercuryPanels: 32,          // LP1501, LP1502, LP2500, LP4502, MP1501, MP1502, MP2500, MP4502
      maxAxisNetworkControllers: 30, // Axis A1001, A1601 via Cloud Link
      maxHidVertxPanels: 32,         // HID V100, V200, V300
      maxAperioHubs: 32,             // 32 AH30 or 64 AH40
      maxSchlageEngageGateways: 32,  // Up to 10 locks per IP gateway
      maxSimonsVossNodes: 64
    },
    cloudLink312: {
      model: "Synergis Cloud Link-312 (12x RS-485 OSDP Appliance)",
      rs485Ports: 12,
      maxOsdpIoModules: 32,          // STid / phg OSDP I/O modules
      maxOsdpNonTransparentReaders: 48,
      maxOsdpTransparentReaders: 24
    },
    axisPoweredByGenetec: {
      model: "Axis Powered by Genetec (A1210 / A1210-B / A1610 / A1610-B / A1710-B / A1810-B)",
      requiresCloudLink: false,      // Connects directly to Security Center Access Manager over IP (0 Cloud Links required)
      maxCardholders: 250000,
      maxOfflineEvents: 150000,
      controllers: {
        "A1210": { onboardReaders: 1, maxReadersWithExpansion: 2, doors: 1 },
        "A1610": { onboardReaders: 2, maxReadersWithExpansion: 4, doors: 2 },
        "A1710-B": { onboardReaders: 4, maxReadersWithExpansion: 8, doors: 4 },
        "A1810-B": { onboardReaders: 8, maxReadersWithExpansion: 16, doors: 8 }
      }
    }
  },

  // DMP Intrusion Panel Extension 4.5.0 Rules (EN.DMP Intrusion Panel Extension Guide 4.5.0.pdf)
  DMP_INTRUSION_RULES: {
    version: "4.5.0",
    maxPanelsPerIntrusionManagerRole: 100,
    maxEntitiesPerIntrusionManagerRole: 8800,
    maxEventsPerSecSustained: 70,
    maxEventsPerSecBurst: 100,
    maxIntrusionManagerRolesPerDirectory: 20,
    maxPanelsPerDirectory: 2000,
    supportedPanels: ["XR500N", "XR500E", "XR150DN", "XR550DN", "XR550INT"],
    unsupportedPanels: ["XR150FC (FIRE Keypad Incompatible)", "XR550FC (FIRE Keypad Incompatible)"],
    networkPorts: "Integrator TCP 8011/8001, Receiver Failover TCP 21002"
  },

  // Genetec Mission Control 3.4.1.0 Rules (EN.Genetec Mission Control Deployment Guide 3.4.1.0.pdf)
  MISSION_CONTROL_RULES: {
    version: "3.4.1.0",
    requiresSecurityCenterEnterprise: "5.14",
    maxIncidentManagerRolesPerSystem: 1,
    mustNotCoHostOnDirectory: true,
    sqlStorageKbPerIncident: 150, // ~150 KB/incident in SQL Server (~150 GB/yr at 3,000-4,000 incidents/day -> requires SQL Standard)
    rabbitMqClusterMinNodes: 3,   // Minimum 3 standalone nodes on same LAN (Raft consensus (N/2)+1, TCP 5671 SSL)
    serverProfiles: {
      recommended_1_to_4_ops: { cpu: "Intel Xeon E-2434 3.4 GHz", ramGb: 16, nic: "1 GbE", maxOperators: 4 },
      high_perf_5_plus_ops: { cpu: "Dual Intel Xeon Silver 4416+ (40 Cores)", ramGb: 64, nic: "10 GbE", maxOperators: 300 }
    }
  },

  // Genetec Sipelia 2.14.0.0 Rules (EN.Sipelia User Guide 2.14.0.0.pdf)
  SIPELIA_RULES: {
    version: "2.14.0.0",
    maxSipeliaServerRolesPerDirectory: 1,
    unifiedSku511To514: "GSC-SIPELIA-1SIP",
    unifiedSkuMsrp: 250,
    maxNativeSipVideoResolution: "720p (1080p+ intercom cameras must be enrolled as Security Center video units and linked to the SIP entity)",
    networkPorts: "SIP UDP/TCP 5060, TLS 5061, Sipelia Client TCP 8202, RTP UDP 20000-20500"
  },

  // Server Profiles for Archiver Role (Pages 7, 8, 9, 15, 16, 17)
  // Note: Physical servers can host multiple Archiver roles within the server's total throughput & role limits,
  // provided each Archiver role is assigned its own separate Windows volume(s) (<= 30 TB per Windows volume).
  ARCHIVER_PROFILES: {
    "unified_min": {
      id: "unified_min",
      label: "Unified Directory + Archiver (Minimum Profile)",
      cpuSpec: "Intel Core i5-8500 3.0 GHz+",
      ramGb: 8,
      nicSpec: "1 GbE NIC",
      maxCamerasPerRole: 50,
      maxBitrateMbpsPerRole: 50,
      maxRolesPerServer: 1,
      maxServerBitrateMbps: 50,
      referencePage: "Page 7 & 9 (Sec 1.4 & 1.5)"
    },
    "unified_rec": {
      id: "unified_rec",
      label: "Unified Directory + Archiver (Recommended Profile)",
      cpuSpec: "Intel Xeon E-2434 3.4 GHz+",
      ramGb: 16,
      nicSpec: "1 GbE NIC (240GB SSD OS)",
      maxCamerasPerRole: 100,
      maxBitrateMbpsPerRole: 200,
      maxRolesPerServer: 1,
      maxServerBitrateMbps: 200,
      referencePage: "Page 7 & 9 (Sec 1.4 & 1.5)"
    },
    "dedicated_300": {
      id: "dedicated_300",
      label: "Dedicated Archiver Server — Standard (300 Mbps/Role, Multi-Role)",
      cpuSpec: "Intel Xeon Silver 4210+ / Dual-Socket",
      ramGb: 16,
      nicSpec: "1 GbE / 10 GbE NIC",
      maxCamerasPerRole: 300,
      maxBitrateMbpsPerRole: 300,
      maxRolesPerServer: 4, // Up to 4 Archiver roles / 1,200 Mbps per physical server (Page 7 & 16-17)
      maxServerBitrateMbps: 1200,
      referencePage: "Page 7 & 16 (Sec 1.4.1 & 1.11)"
    },
    "dedicated_500": {
      id: "dedicated_500",
      label: "Dedicated High-Perf Archiver Server (500 Mbps/Role, Multi-Role)",
      cpuSpec: "Intel Xeon Silver 4210+ / Gold",
      ramGb: 32,
      nicSpec: "10 GbE NIC",
      maxCamerasPerRole: 300,
      maxBitrateMbpsPerRole: 500,
      maxRolesPerServer: 4, // Up to 4 Archiver roles / 2,000 Mbps per physical server
      maxServerBitrateMbps: 2000,
      referencePage: "Page 8 (Sec 1.4.1)"
    },
    "high_perf_multi": {
      id: "high_perf_multi",
      label: "Enterprise Dual-Xeon / Streamvault (Up to 8 Roles / 4,000 Mbps)",
      cpuSpec: "2x Intel Xeon Silver 4416+ (40 Cores) / Streamvault 4000/7000",
      ramGb: 64,
      nicSpec: "10 GbE / 25 GbE NIC",
      maxCamerasPerRole: 300,
      maxBitrateMbpsPerRole: 500,
      maxRolesPerServer: 8, // High-density Dual-Xeon / Streamvault up to 4,135 Mbps (Page 8)
      maxServerBitrateMbps: 4000,
      referencePage: "Page 7 & 8 (Sec 1.4 & 1.4.1)"
    },
    "virtual_vm": {
      id: "virtual_vm",
      label: "Virtualized Archiver Host (ESXi / Hyper-V, -20% VM Derate)",
      cpuSpec: "8+ vCPUs per VM (Complete Logical Cores)",
      ramGb: 16,
      nicSpec: "10 GbE Host NIC (Dedicated 1GbE/VM)",
      maxCamerasPerRole: 240, // 300 cameras - 20% VM capacity loss (Page 15 Sec 1.10)
      maxBitrateMbpsPerRole: 300, // Page 17: 300 Mbps per archiving VM
      maxRolesPerServer: 4,   // Page 16 & 17: Max 4 video VMs / 1,200 Mbps per physical server module
      maxServerBitrateMbps: 1200,
      referencePage: "Page 15–17 (Sec 1.10 & 1.11)"
    }
  },

  // Page 10: Fusion Stream Encryption impact on Archiver camera capacity
  // 1st certificate reduces capacity by 30%; each additional certificate reduces by 4% (max 20)
  getEncryptionCapacityFactor(certCount = 0) {
    const certs = Math.max(0, Math.min(20, parseInt(certCount, 10) || 0));
    if (certs === 0) return 1.0;
    // Matches Genetec Page 10 table: 0->300 (1.0), 1->210 (0.70), 5->178 (0.593), 10->145 (0.483), 20->96 (0.32)
    return Math.max(0.25, 0.70 * Math.pow(0.96, certs - 1));
  },

  // Section 1.2 & 1.3 (Pages 5 & 6): Client Workstation Requirements & Decoding Benchmarks
  CLIENT_WORKSTATION_PROFILES: {
    minimum: {
      id: "minimum",
      tierOrder: 1,
      label: "Minimum Client Profile",
      shortLabel: "Minimum",
      badgeColor: "sky",
      cpuSpec: "Intel® Core™ i3-8100 3.6 GHz (Intel® Quick Sync Video)",
      ramGb: 8,
      ramSpec: "8 GB DDR4",
      osSpec: "64-bit Windows 11",
      osDriveSpec: "128 GB SATA / NVMe SSD",
      nicSpec: "Intel® I219-LM 1 GbE",
      gpuSpec: "Integrated Intel® Quick Sync Video (Motherboard Display Output)",
      gpuCount: 1,
      maxMonitors: 2,
      testedDisplaySpec: "1x–2x 1920 x 1200 (WUXGA / 1080p FHD)",
      supports4kMonitors: false,
      recommendedStreamvaultId: "genetec-svw-100e-micro",
      recommendedStreamvaultSku: "SVW-100E-MFF-U7",
      recommendedStreamvaultModel: "Genetec Streamvault SVW-100E Micro Workstation",
      referencePage: "Page 5 & 6 (Sec 1.2 & 1.3)",
      notes: "Monitor must be connected directly to the motherboard to enable Intel® Quick Sync Video hardware decoding."
    },
    recommended: {
      id: "recommended",
      tierOrder: 2,
      label: "Recommended Client Profile",
      shortLabel: "Recommended",
      badgeColor: "indigo",
      cpuSpec: "Intel® Core™ Ultra 7 Processor 265K",
      ramGb: 32,
      ramSpec: "32 GB DDR5",
      osSpec: "64-bit Windows 11 Enterprise 25H2",
      osDriveSpec: "1 TB NVMe SSD",
      nicSpec: "Intel® I219-LM 1 GbE",
      gpuSpec: "NVIDIA® GeForce RTX 5060 Ti (16 GB VRAM)",
      gpuCount: 1,
      maxMonitors: 4,
      testedDisplaySpec: "2x 4K UHD (3840 x 2160) Monitors (Up to 4 Displays)",
      supports4kMonitors: true,
      recommendedStreamvaultId: "genetec-svw-300e-t3",
      recommendedStreamvaultSku: "SVW-300E-T3-I7-2XT1000",
      recommendedStreamvaultModel: "Genetec Streamvault SVW-300E-T3 Tower Workstation",
      alternateCatalogId: "dell-precision-3680-soc-tower",
      referencePage: "Page 5 & 6 (Sec 1.2 & 1.3)",
      notes: "Tested on two 4K UHD monitors with CPU & GPU usage capped at 85%."
    },
    high_performance: {
      id: "high_performance",
      tierOrder: 3,
      label: "High-Performance (Video-Intensive) Profile",
      shortLabel: "High-Performance",
      badgeColor: "purple",
      cpuSpec: "Intel® Xeon® w5-2465X Processor 3.10 GHz (16C / 32T)",
      ramGb: 64,
      ramSpec: "64 GB DDR5 ECC",
      osSpec: "64-bit Windows 11 Enterprise 25H2",
      osDriveSpec: "240 GB+ SATA / NVMe SSD (512 GB NVMe Recommended)",
      nicSpec: "1 GbE / 10 GbE NIC",
      gpuSpec: "Dual NVIDIA® GeForce RTX 5070 Ti (2x 16 GB VRAM)",
      gpuCount: 2,
      maxMonitors: 8,
      testedDisplaySpec: "2x–8x 4K UHD (3840 x 2160) Monitors (Min 1 Display per GPU)",
      supports4kMonitors: true,
      recommendedStreamvaultId: "genetec-svw-502e-soc-workstation",
      recommendedStreamvaultSku: "SVW-500E-R-XEON-2XRTX4000",
      recommendedStreamvaultModel: "Genetec Streamvault SVW-500E High-Performance Workstation",
      alternateCatalogId: "bcd-aurora-rackmount-workstation-2u",
      referencePage: "Page 5 & 6 (Sec 1.2 & 1.3)",
      notes: "Dual GPU configuration: At least one monitor must be physically connected to each GPU card to utilize both hardware decoders."
    }
  },

  // Section 1.3 (Page 6): Maximum Number of Cameras Viewed Simultaneously @ 30 FPS (85% CPU/GPU Cap on 2x 4K UHD Monitors)
  CLIENT_DECODING_BENCHMARKS_30FPS: {
    // Full HD (1920 x 1080 / 2.0 MP) @ 30 FPS
    fhd_2mp: {
      resolutionMp: 2.0,
      label: "Full HD (1920 x 1080)",
      "H.264": { bitrateMbps: 4.8, minimum: 5, recommended: 64, high_performance: 104 },
      "H.265": { bitrateMbps: 3.2, minimum: 6, recommended: 64, high_performance: 102 },
      "H.265+": { bitrateMbps: 2.4, minimum: 6, recommended: 64, high_performance: 102 },
      "AV1":   { bitrateMbps: 3.1, minimum: 3, recommended: 56, high_performance: 100 },
      "AVI":   { bitrateMbps: 12.0, minimum: 3, recommended: 32, high_performance: 52 }
    },
    // Ultra HD (3840 x 2160 / 8.0 MP 4K) @ 30 FPS
    uhd_8mp: {
      resolutionMp: 8.0,
      label: "Ultra HD 4K (3840 x 2160)",
      "H.264": { bitrateMbps: 19.0, minimum: 1, recommended: 19, high_performance: 36 },
      "H.265": { bitrateMbps: 13.4, minimum: 1, recommended: 18, high_performance: 36 },
      "H.265+": { bitrateMbps: 9.8, minimum: 1, recommended: 18, high_performance: 36 },
      "AV1":   { bitrateMbps: 12.7, minimum: 0, recommended: 16, high_performance: 30 },
      "AVI":   { bitrateMbps: 45.0, minimum: 0, recommended: 10, high_performance: 18 }
    }
  }
};

// Milestone XProtect 2026 R1/R2 & Husky IVO Official System Requirements (Datasheets/Milestone/)
const MILESTONE_2026_REQUIREMENTS = {
  datasheetPath: "Datasheets/Milestone/Milestone_XProtect_VMS_Product_Comparison_Chart.pdf",
  huskyOverviewPath: "Datasheets/Milestone/Husky IVO Units flyer.pdf",
  viewingStationPath: "Datasheets/Milestone/7_Milestone Husky IVO Viewing Stations flyer.pdf",
  version: "XProtect 2026 R2 / Husky IVO (Jan 2026)",

  // Recording Server & Husky IVO Hardware Appliance Profiles
  RECORDING_SERVER_PROFILES: {
    husky_150d: {
      id: "husky_150d",
      label: "Milestone Husky IVO 150D Desktop (150 Mbps / 20 Channels)",
      shortLabel: "Husky IVO 150D",
      cpuSpec: "Intel® Pentium® Gold G7400 (Dual-Core 3.7 GHz)",
      ramGb: 16,
      nicSpec: "2x 1 GbE RJ45",
      maxCamerasPerRole: 20,
      maxBitrateMbpsPerRole: 150,
      maxRolesPerServer: 1,
      maxServerBitrateMbps: 150,
      maxRawStorageTb: 24,
      maxUsableStorageTb: 24,
      supportedRaid: "JBOD (1x 3.5\" Internal Bay: 4 / 8 / 12 / 16 / 20 / 24 TB)",
      catalogId: "milestone-husky-ivo-150d",
      catalogSku: "HIVO-150D-16TB",
      datasheet: "Datasheets/Milestone/1_Husky IVO 150D Specification Sheet.pdf"
    },
    husky_350: {
      id: "husky_350",
      label: "Milestone Husky IVO 350T Tower / 350R 1U Rack (360 Mbps / 50 Channels)",
      shortLabel: "Husky IVO 350T/350R",
      cpuSpec: "Intel® Core™ i3-12100 (350T) / Intel® Xeon® E-2434 (350R)",
      ramGb: 32,
      nicSpec: "2x 1 GbE RJ45 + 1x iDRAC Mgmt (Optional 4x 1GbE / 2x 10GbE)",
      maxCamerasPerRole: 50,
      maxBitrateMbpsPerRole: 360,
      maxRolesPerServer: 1,
      maxServerBitrateMbps: 360,
      maxRawStorageTb: 48,
      maxUsableStorageTb: 48,
      supportedRaid: "JBOD, RAID 1 (2x 3.5\" Bays: 4 / 8 / 16 / 24 / 32 / 40 / 48 TB, Single or Dual 600W PSU on 350R)",
      catalogId: "milestone-husky-ivo-350r",
      catalogSku: "HIVO-350R-32TB",
      towerCatalogId: "milestone-husky-ivo-350t",
      datasheet: "Datasheets/Milestone/3_Husky IVO 350R Specification Sheet.pdf"
    },
    husky_700r: {
      id: "husky_700r",
      label: "Milestone Husky IVO 700R 1U Rack (720 Mbps / 100 Channels)",
      shortLabel: "Husky IVO 700R",
      cpuSpec: "Intel® Xeon® E-2436 (Optional Intel® Xeon® E-2488)",
      ramGb: 32,
      nicSpec: "2x 1 GbE RJ45 + 1x iDRAC (Optional 4x 1GbE / 2x 10GbE Base-T or SFP+)",
      maxCamerasPerRole: 100,
      maxBitrateMbpsPerRole: 720,
      maxRolesPerServer: 1,
      maxServerBitrateMbps: 720,
      maxRawStorageTb: 96,
      maxUsableStorageTb: 72,
      supportedRaid: "JBOD, RAID 1, 5, 6, 10 (4x 3.5\" Hot-Swap Bays: 16–96 TB Raw, Dual 600W PSU)",
      catalogId: "milestone-husky-ivo-700r",
      catalogSku: "HIVO-700R-64TB",
      datasheet: "Datasheets/Milestone/4_Husky IVO 700R Specification Sheet.pdf"
    },
    husky_1000r: {
      id: "husky_1000r",
      label: "Milestone Husky IVO 1000R 2U Rack (1,080 Mbps / 150 Channels)",
      shortLabel: "Husky IVO 1000R",
      cpuSpec: "Intel® Xeon® Silver 4410Y 12C (Optional Dual Xeon Silver 4410Y 24C)",
      ramGb: 32,
      nicSpec: "2x 1 GbE RJ45 + 1x iDRAC (Optional 4x 1GbE / 2x 10GbE Base-T or SFP+)",
      maxCamerasPerRole: 150,
      maxBitrateMbpsPerRole: 1080,
      maxRolesPerServer: 1,
      maxServerBitrateMbps: 1080,
      maxRawStorageTb: 192,
      maxUsableStorageTb: 168,
      supportedRaid: "JBOD, RAID 1, 5, 6, 10 (8x 3.5\" Hot-Swap Bays: 16–192 TB Raw, Dual 800W PSU)",
      catalogId: "milestone-husky-ivo-1000r",
      catalogSku: "HIVO-1000R-128TB",
      datasheet: "Datasheets/Milestone/5_Husky IVO 1000R Specification Sheet.pdf"
    },
    husky_1800r: {
      id: "husky_1800r",
      label: "Milestone Husky IVO 1800R 2U Flagship (1,800 Mbps / 250 Channels)",
      shortLabel: "Husky IVO 1800R",
      cpuSpec: "Intel® Xeon® Silver 4410Y 12C (Optional Dual Xeon Silver 4410Y 24C)",
      ramGb: 32,
      nicSpec: "2x 10 GbE RJ45 + 2x 1 GbE + 1x iDRAC (Optional 2x 10GbE SFP+)",
      maxCamerasPerRole: 250,
      maxBitrateMbpsPerRole: 1800,
      maxRolesPerServer: 2,
      maxServerBitrateMbps: 1800,
      maxRawStorageTb: 384,
      maxUsableStorageTb: 352,
      supportedRaid: "RAID 5, 6, 10, 50, 60 (16x 3.5\" Bays: 32–384 TB Raw, Dual 1100W Hot-Swap PSU)",
      catalogId: "milestone-husky-ivo-1800r-192tb",
      catalogSku: "HIVO-1800R-192TB",
      highCapCatalogId: "milestone-husky-ivo-1800r-384tb",
      datasheet: "Datasheets/Milestone/6_Husky IVO 1800R Specification Sheet.pdf"
    },
    custom_enterprise: {
      id: "custom_enterprise",
      label: "Custom Enterprise Recording Server w/ NVIDIA VMD (Up to 3,100 Mbps / 300 Ch)",
      shortLabel: "Custom 3.1 Gbps Server",
      cpuSpec: "Dual Intel® Xeon® Gold + NVIDIA® T1000/A2 GPU VMD Offload",
      ramGb: 64,
      nicSpec: "Dual 10 GbE / 25 GbE SFP28",
      maxCamerasPerRole: 300,
      maxBitrateMbpsPerRole: 3100,
      maxRolesPerServer: 2,
      maxServerBitrateMbps: 3100,
      maxRawStorageTb: 480,
      maxUsableStorageTb: 400,
      supportedRaid: "Enterprise Hardware RAID 6 / RAID 60 (24-Bay 4U SAN)",
      catalogId: "bcd-224-enterprise-nvr",
      catalogSku: "BCD424-ESV-384T",
      datasheet: "Datasheets/Milestone/Milestone_XProtect_Corporate_Datasheet.pdf"
    }
  },

  // Milestone XProtect Smart Client & Husky IVO Viewing Station Profiles
  CLIENT_WORKSTATION_PROFILES: {
    minimum: {
      id: "minimum",
      tierOrder: 1,
      label: "Husky IVO 150D Viewing Station (Entry 1–2 Monitor Profile)",
      shortLabel: "Husky IVO 150D VS",
      badgeColor: "sky",
      cpuSpec: "Intel® Core™ i5 (12th/13th Gen) w/ Quick Sync Video",
      ramGb: 16,
      ramSpec: "16 GB DDR4",
      osSpec: "Windows 10/11 IoT Enterprise SAC",
      osDriveSpec: "256 GB M.2 NVMe SSD",
      nicSpec: "2x 1 GbE RJ45",
      gpuSpec: "NVIDIA® RTX™ A400 (4 GB GDDR6, 4x Mini-DP 1.4a) + Intel® Quick Sync",
      gpuCount: 1,
      maxMonitors: 2,
      testedDisplaySpec: "1x–2x 4K UHD (3840x2160 @ 60Hz) Monitors",
      supports4kMonitors: true,
      recommendedStreamvaultId: "milestone-husky-ivo-150d-vs",
      recommendedStreamvaultSku: "HIVO-150D-VS",
      recommendedStreamvaultModel: "Milestone Husky IVO 150D Viewing Station",
      alternateCatalogId: "dell-optiplex-7020-mff-client",
      referencePage: "Datasheets/Milestone/7_Milestone Husky IVO Viewing Stations flyer.pdf",
      notes: "Official Milestone benchmark: 1x 4K display = up to 16x 1080p (H.264/H.265) or 9x 4K (H.264) / 4x 4K (H.265); 2x 4K displays = up to 8x 1080p total (2x2 per monitor)."
    },
    recommended: {
      id: "recommended",
      tierOrder: 2,
      label: "Husky IVO 350T Viewing Station (Recommended 2–4 Monitor Profile)",
      shortLabel: "Husky IVO 350T VS",
      badgeColor: "indigo",
      cpuSpec: "Intel® Core™ i7 (12th/13th Gen) w/ Quick Sync Video",
      ramGb: 16,
      ramSpec: "16 GB DDR4",
      osSpec: "Windows 10/11 IoT Enterprise SAC",
      osDriveSpec: "256 GB M.2 NVMe SSD",
      nicSpec: "2x 1 GbE RJ45",
      gpuSpec: "NVIDIA® RTX™ A1000 (8 GB GDDR6, 4x Mini-DP 1.4a) + Intel® Quick Sync",
      gpuCount: 1,
      maxMonitors: 4,
      testedDisplaySpec: "Up to 4x 4K UHD (3840x2160 @ 60Hz) Monitors",
      supports4kMonitors: true,
      recommendedStreamvaultId: "milestone-husky-ivo-350t-vs",
      recommendedStreamvaultSku: "HIVO-350T-VS",
      recommendedStreamvaultModel: "Milestone Husky IVO 350T Viewing Station",
      alternateCatalogId: "dell-precision-3680-soc-tower",
      referencePage: "Datasheets/Milestone/7_Milestone Husky IVO Viewing Stations flyer.pdf",
      notes: "Official Milestone benchmark: 1x 4K display = up to 36x 1080p (H.264) or 25x 1080p (H.265) or 16x 4K (H.265); 2x 4K displays = up to 18x 1080p or 8x 4K; 3–4x 4K displays = 12–16x 1080p."
    },
    high_performance: {
      id: "high_performance",
      tierOrder: 3,
      label: "XProtect Smart Wall Multi-GPU Workstation (Up to 8x 4K Displays)",
      shortLabel: "Smart Wall Multi-GPU",
      badgeColor: "purple",
      cpuSpec: "Intel® Core™ i9-14900K / Xeon® W (24 Cores) + Multi-GPU NVDEC",
      ramGb: 64,
      ramSpec: "64 GB DDR5 ECC",
      osSpec: "Windows 11 Pro for Workstations",
      osDriveSpec: "1 TB NVMe PCIe Gen4 SSD",
      nicSpec: "10 GbE + 2.5 GbE RJ45",
      gpuSpec: "Dual NVIDIA® RTX™ 4000 Ada (2x 20 GB GDDR6, 8x DisplayPort 1.4a)",
      gpuCount: 2,
      maxMonitors: 8,
      testedDisplaySpec: "2x–8x 4K UHD (3840x2160) Monitors (XProtect Smart Wall)",
      supports4kMonitors: true,
      recommendedStreamvaultId: "bcd-aurora-rackmount-workstation-2u",
      recommendedStreamvaultSku: "BCD204-auw-r-8m",
      recommendedStreamvaultModel: "BCDVideo Aurora 2U 8-Monitor Video Wall Workstation",
      alternateCatalogId: "genetec-svw-502e-soc-workstation",
      referencePage: "XProtect Smart Client & Smart Wall Hardware Guide",
      notes: "Designed for high-density XProtect Smart Wall SOC deployments with Dual NVIDIA RTX 4000 Ada GPUs and Adaptive Streaming."
    }
  },

  // Milestone XProtect Smart Client Tested Decoding Benchmarks @ 30 FPS (Calibrated to Husky IVO Viewing Station Flyer)
  CLIENT_DECODING_BENCHMARKS_30FPS: {
    fhd_2mp: {
      resolutionMp: 2.0,
      label: "Full HD (1920 x 1080)",
      "H.264": { bitrateMbps: 4.5, minimum: 16, recommended: 36, high_performance: 100 },
      "H.265": { bitrateMbps: 3.0, minimum: 16, recommended: 25, high_performance: 92 },
      "H.265+": { bitrateMbps: 2.2, minimum: 16, recommended: 25, high_performance: 92 },
      "AV1":   { bitrateMbps: 2.9, minimum: 8,  recommended: 20, high_performance: 76 },
      "AVI":   { bitrateMbps: 12.0, minimum: 6, recommended: 16, high_performance: 48 }
    },
    uhd_8mp: {
      resolutionMp: 8.0,
      label: "Ultra HD 4K (3840 x 2160)",
      "H.264": { bitrateMbps: 18.0, minimum: 9, recommended: 16, high_performance: 36 },
      "H.265": { bitrateMbps: 12.0, minimum: 4, recommended: 16, high_performance: 36 },
      "H.265+": { bitrateMbps: 9.0, minimum: 4, recommended: 16, high_performance: 36 },
      "AV1":   { bitrateMbps: 11.5, minimum: 2, recommended: 12, high_performance: 28 },
      "AVI":   { bitrateMbps: 45.0, minimum: 2, recommended: 8,  high_performance: 18 }
    }
  }
};

const VideoStorageSizer = {
  state: {
    vmsVendor: "genetec",      // "genetec" (Genetec 5.14 / Streamvault) | "milestone" (Milestone XProtect 2026 R2 / Husky IVO) | "generic" (Open VMS)
    milestoneProfile: "husky_1000r", // Key in MILESTONE_2026_REQUIREMENTS.RECORDING_SERVER_PROFILES
    sourceMode: "auto",        // "auto" (uses BOM if >0 cams & !hasCustomGroups, else cameraGroups) | "manual" | "bom"
    hasCustomGroups: false,    // True once the user edits or adds rows in the multi-group calculator
    cameraGroups: [
      {
        id: "grp_1",
        name: "Camera Group 1",
        qty: 32,
        heads: 1,
        resolutionMp: 4,
        fps: 15,
        codec: "H.265",
        sceneActivity: "medium",
        motionDutyPct: 50,
        retentionDays: 30
      }
    ],
    manualCameraCount: 32,     // Default camera count for standalone planning
    resolutionMp: 4,           // Default 4MP (2K) when in manual mode or override
    useManualResolutionOnBom: false,
    retentionDays: 30,
    codec: "H.265",            // "H.264" | "H.265" | "H.265+" | "AV1" | "AVI"
    fps: 15,
    recordingMode: "motion",   // "continuous" (100%) | "motion"
    motionDutyPct: 50,         // % of 24-hr day recorded when in motion mode (or 100% if continuous)
    sceneActivity: "medium",   // "low" | "medium" | "high" | "ultra"
    raidLevel: "RAID 6",       // "RAID 5" | "RAID 6" | "RAID 10" | "RAID 50" | "RAID 60" | "JBOD"
    preferredDriveSizeTb: 16,  // Selected HDD size (TB) for detailed server mapping
    genetecProfile: "dedicated_300", // Key in GENETEC_514_REQUIREMENTS.ARCHIVER_PROFILES
    archiverRolesCount: 0,     // 0 = Auto-calculate minimum required Archiver roles; >0 = user-specified count to verify
    serverCountOverride: 0,    // 0 = Auto-calculate physical servers; >0 = user-specified physical server count
    encryptionCerts: 0,        // Fusion Stream Encryption certificates (Page 10)
    softwareMotionDetection: false, // Page 15: Software motion detection reduces Archiver capacity by up to 50%
    customBitratePerCamMbps: 0, // Optional custom per-camera bitrate override (0 = use standard math)
    lowFpsUntilMotion: false,  // Continuous low frame rate (e.g. 2 FPS) during idle hours, jumping to target FPS on motion/event
    idleFps: 2,                // Low frame rate (default 2 FPS) recorded continuously when no motion/event is active
    failoverStructure: "none", // "none" | "ring" (Dynamic N-Server Ring) | "dedicated" (Dedicated Failover Server(s) N+M)
    ringNodeCount: 0,          // 0 = Auto (dynamically uses actual server count N >= 2); >=2 = explicit number of ring servers
    dedicatedPrimaryCount: 0,  // 0 = Auto (uses primary server count N); >=1 = explicit number of main primary servers failing over into the dedicated pool
    dedicatedFailoverCount: 1, // Number of dedicated hot-standby failover servers (M in N+M)
    maxSimultaneousFailures: 1,// Number of main servers that can fail simultaneously onto the shared failover pool (default 1 = N+1 standard, or 2..N)
    failoverRetentionDays: 0,  // 0 = Full Retention Mirror (matches group retentionDays); >0 = specific failover buffer days (e.g. 7, 14, 30)
    failoverIncludeStorageBuffer: true // Provision RAID storage buffer for failover recording
  },

  /**
   * Evaluates a single camera group row and returns its calculated bitrate and storage metrics.
   */
  evaluateCameraGroup(group, fallbackDefaults = {}) {
    const qty = Math.max(0, parseInt(group.qty ?? 1, 10) || 0);
    const resolutionMp = Number(group.resolutionMp ?? fallbackDefaults.resolutionMp ?? 4) || 4;
    const heads = Math.max(1, parseInt(group.heads ?? 1, 10) || 1);
    const fps = Math.max(1, Number(group.fps ?? fallbackDefaults.fps ?? 15) || 15);
    const codec = this.normalizeCodec(group.codec ?? fallbackDefaults.codec ?? "H.265");
    const sceneActivity = group.sceneActivity || fallbackDefaults.sceneActivity || "medium";

    let rawMotion = group.motionDutyPct ?? group.motionDutyCycle ?? fallbackDefaults.motionDutyPct ?? 50;
    if (rawMotion > 0 && rawMotion <= 1) rawMotion = Math.round(rawMotion * 100);
    const motionDutyPct = Math.max(5, Math.min(100, Number(rawMotion) || 50));

    // Dual-Rate Recording: Low-FPS Continuous (e.g. 2 FPS) until motion/event jumps to high FPS
    const lowFpsUntilMotion = group.lowFpsUntilMotion !== undefined
      ? Boolean(group.lowFpsUntilMotion)
      : Boolean(fallbackDefaults.lowFpsUntilMotion ?? this.state.lowFpsUntilMotion);
    const idleFps = Math.max(1, Math.min(fps, Number(group.idleFps ?? fallbackDefaults.idleFps ?? this.state.idleFps ?? 2) || 2));

    // When Low-FPS Until Motion is enabled, if a group was previously set to 100% continuous, use 50% motion duty by default so idle vs boost split applies
    const effectiveMotionDutyPct = (lowFpsUntilMotion && motionDutyPct >= 100) ? 50 : motionDutyPct;
    const motionDutyCycle = effectiveMotionDutyPct / 100;
    const idleDutyCycle = lowFpsUntilMotion ? Math.max(0, 1 - motionDutyCycle) : 0;

    const retentionDays = Math.max(1, Number(group.retentionDays ?? fallbackDefaults.retentionDays ?? 30) || 30);
    const customBitrate = Number(group.customBitrateMbps ?? fallbackDefaults.customBitratePerCamMbps ?? 0) || 0;

    // High / Event Boost Bitrate (at target FPS)
    const perHeadMbps = this.calculateSingleStreamBitrateMbps(resolutionMp, codec, fps, sceneActivity, customBitrate);
    const perCameraMbps = Math.round(perHeadMbps * heads * 100) / 100;
    const totalStreams = qty * heads;
    const peakIngressMbps = Math.round(qty * perCameraMbps * 100) / 100;

    // Low / Idle Baseline Bitrate (at idleFps, e.g. 2 FPS)
    const idlePerHeadMbps = this.calculateSingleStreamBitrateMbps(resolutionMp, codec, idleFps, sceneActivity, 0);
    const idlePerCameraMbps = Math.round(idlePerHeadMbps * heads * 100) / 100;
    const idleIngressMbps = Math.round(qty * idlePerCameraMbps * 100) / 100;

    // Weighted Average Recording Bitrate (High FPS during motion/event + Low FPS during idle hours)
    const motionComponentMbps = peakIngressMbps * motionDutyCycle;
    const lowFpsAddedMbps = lowFpsUntilMotion ? Math.round(idleIngressMbps * idleDutyCycle * 100) / 100 : 0;
    const averageRecordingMbps = Math.round((motionComponentMbps + lowFpsAddedMbps) * 100) / 100;

    const dailyStorageGb = Math.round(averageRecordingMbps * 10.8 * 10) / 10;
    const netVideoStorageTb = (averageRecordingMbps * 86400 * retentionDays) / 8000000;
    const requiredUsableTb = Math.round(netVideoStorageTb * VIDEO_STORAGE_CONSTANTS.STORAGE_SAFETY_BUFFER * 100) / 100;
    const lowFpsAddedUsableTb = lowFpsUntilMotion
      ? Math.round(((lowFpsAddedMbps * 86400 * retentionDays) / 8000000) * VIDEO_STORAGE_CONSTANTS.STORAGE_SAFETY_BUFFER * 100) / 100
      : 0;

    return {
      id: group.id || `grp_${Math.random().toString(36).slice(2, 7)}`,
      name: group.name || "Camera Group",
      qty,
      heads,
      totalStreams,
      resolutionMp,
      fps,
      idleFps,
      lowFpsUntilMotion,
      codec,
      sceneActivity,
      motionDutyPct: effectiveMotionDutyPct,
      motionDutyCycle,
      idleDutyCycle,
      retentionDays,
      perHeadMbps,
      perCameraMbps,
      idlePerCameraMbps,
      peakIngressMbps,
      idleIngressMbps,
      lowFpsAddedMbps,
      lowFpsAddedUsableTb,
      averageRecordingMbps,
      dailyStorageGb,
      requiredUsableTb
    };
  },

  /**
   * Builds a list of camera groups from the active project BOM cameras (grouped by model/resolution).
   */
  buildCameraGroupsFromBom(bomList = [], fallbackDefaults = {}) {
    const map = new Map();
    (bomList || []).forEach(item => {
      if (!item || item.parentInstanceId) return;
      const cat = (item.category || "").toLowerCase();
      const role = (item.role || "").toLowerCase();
      if (cat === "cameras" || cat === "camera" || role === "camera" || (typeof isCameraDevice === "function" && isCameraDevice(item))) {
        const qty = parseInt(item.qty ?? item.quantity, 10) || 1;
        const catRef = (typeof CatalogRegistry !== "undefined" && typeof CatalogRegistry.get === "function")
          ? CatalogRegistry.get(item.id || item.sku)
          : null;
        const optics = this.parseCameraOptics(item, catRef);
        const itemFps = Number(item.defaultFps || catRef?.defaultFps || fallbackDefaults.fps || this.state.fps || 15) || 15;
        const itemCodec = this.normalizeCodec(item.compression || catRef?.compression || fallbackDefaults.codec || this.state.codec || "H.265");
        const key = `${item.sku || item.model || "CAM"}_${optics.mpPerHead}_${optics.heads}_${itemFps}`;
        if (map.has(key)) {
          map.get(key).qty += qty;
        } else {
          map.set(key, {
            id: `bom_${map.size + 1}`,
            name: item.model || item.sku || `BOM ${optics.totalMp}MP Camera`,
            qty,
            heads: optics.heads,
            resolutionMp: optics.mpPerHead,
            fps: itemFps,
            codec: itemCodec,
            sceneActivity: fallbackDefaults.sceneActivity || this.state.sceneActivity || "medium",
            motionDutyPct: fallbackDefaults.motionDutyPct || this.state.motionDutyPct || 50,
            retentionDays: fallbackDefaults.retentionDays || this.state.retentionDays || 30
          });
        }
      }
    });
    return Array.from(map.values());
  },

  /**
   * Normalizes codec strings from UI or legacy state into canonical keys.
   */
  normalizeCodec(rawCodec) {
    const c = String(rawCodec || "H.265").trim();
    const upper = c.toUpperCase();
    if (upper === "H.264" || upper === "H264" || upper === "AVC") return "H.264";
    if (upper === "H.265+" || upper === "H265_SMART" || upper.includes("ZIPSTREAM") || upper.includes("SMART")) return "H.265+";
    if (upper === "H.265" || upper === "H265" || upper === "HEVC") return "H.265";
    if (upper === "AV1") return "AV1";
    if (upper === "AVI" || upper === "MJPEG") return "AVI";
    return "H.265";
  },

  /**
   * Normalizes RAID strings from UI or legacy state into canonical keys.
   */
  normalizeRaid(rawRaid) {
    const r = String(rawRaid || "RAID 6").trim().toUpperCase().replace(/[-_]/g, " ");
    if (r.includes("RAID 60") || r === "RAID60") return "RAID 60";
    if (r.includes("RAID 50") || r === "RAID50") return "RAID 50";
    if (r.includes("RAID 10") || r === "RAID10") return "RAID 10";
    if (r.includes("RAID 6") || r === "RAID6") return "RAID 6";
    if (r.includes("RAID 5") || r === "RAID5") return "RAID 5";
    if (r.includes("JBOD") || r.includes("RAID 0") || r === "RAID0") return "JBOD";
    return "RAID 6";
  },

  /**
   * Parses sensor megapixels and sensor head count from a camera catalog/BOM item.
   */
  parseCameraOptics(item, catRef = null) {
    if (!item) return { mpPerHead: 4, heads: 1, totalMp: 4 };
    const ref = catRef || ((typeof CatalogRegistry !== "undefined" && typeof CatalogRegistry.get === "function") ? CatalogRegistry.get(item.id || item.sku) : null);

    // 1. Honor explicit heads & mpPerHead (used by Generic Camera Types and multi-sensor catalog entries)
    const explicitHeads = parseInt(item.heads ?? ref?.heads, 10) || 0;
    const explicitMpPerHead = parseFloat(item.mpPerHead ?? ref?.mpPerHead) || 0;
    const explicitTotalMp = parseFloat(item.sensorMegapixels ?? ref?.sensorMegapixels) || 0;
    if (explicitHeads > 0 && explicitMpPerHead > 0) {
      return {
        mpPerHead: explicitMpPerHead,
        heads: explicitHeads,
        totalMp: explicitTotalMp || (explicitHeads * explicitMpPerHead)
      };
    }

    const resStr = String(item.resolution || ref?.resolution || item.model || "");
    let totalMp = explicitTotalMp;
    if (!totalMp) {
      const m = resStr.match(/(\d+)\s*MP/i);
      if (m) totalMp = parseInt(m[1], 10);
      else if (/4K/i.test(resStr)) totalMp = 8;
      else if (/1080p/i.test(resStr)) totalMp = 2;
      else if (/720p/i.test(resStr)) totalMp = 1;
      else totalMp = 4;
    }

    let heads = explicitHeads || 1;
    if (!explicitHeads) {
      if (/5-sensor|4x.*ptz/i.test(resStr + " " + (item.formFactor || "") + " " + (item.model || ""))) heads = 5;
      else if (/4x|quad|multi-sensor.*4|360.*multi/i.test(resStr + " " + (item.formFactor || ""))) heads = 4;
      else if (/3x|triple|multi-sensor.*3/i.test(resStr + " " + (item.formFactor || ""))) heads = 3;
      else if (/2x|dual-head|dual-sensor|bi-directional/i.test(resStr + " " + (item.formFactor || ""))) heads = 2;
    }

    const mpPerHead = explicitMpPerHead || (heads > 1 && totalMp >= heads * 2 ? Math.round(totalMp / heads) : totalMp);
    return { mpPerHead, heads, totalMp };
  },

  /**
   * Calculates single-sensor bitrate (Mbps) based on resolution MP, codec, FPS, and scene activity.
   */
  calculateSingleStreamBitrateMbps(mpPerHead, codecKey, fps, sceneActivityKey, customBitrateOverride = 0) {
    if (customBitrateOverride > 0) {
      return customBitrateOverride;
    }
    const mp = Number(mpPerHead) || 4;
    // Lookup closest MP in BASE_H264_30FPS_MBPS_BY_MP or interpolate linearly (~2.35 Mbps per MP @ 30fps H.264)
    const baseTable = VIDEO_STORAGE_CONSTANTS.BASE_H264_30FPS_MBPS_BY_MP;
    const baseH264At30 = baseTable[mp] || (mp * 2.35);

    const codecMult = VIDEO_STORAGE_CONSTANTS.CODEC_MULTIPLIERS[codecKey] ?? 0.68;
    const activityObj = VIDEO_STORAGE_CONSTANTS.SCENE_ACTIVITY_MULTIPLIERS[sceneActivityKey] || VIDEO_STORAGE_CONSTANTS.SCENE_ACTIVITY_MULTIPLIERS.medium;
    const fpsMult = Math.pow(Math.max(1, fps) / VIDEO_STORAGE_CONSTANTS.REFERENCE_FPS, VIDEO_STORAGE_CONSTANTS.FPS_SCALING_EXPONENT);

    return Math.round(baseH264At30 * codecMult * activityObj.mult * fpsMult * 100) / 100;
  },

  /**
   * Computes exact RAID drive count, raw TB, usable TB, parity drives, Windows volumes (<=30TB, isolated per Archiver role),
   * and chassis fit across all standard enterprise hard drive sizes (4TB to 24TB).
   */
  calculateRaidDriveMatrix(requiredUsableTb, raidKey, numServers = 1, activeArchiverRoles = 1) {
    const raidDef = VIDEO_STORAGE_CONSTANTS.RAID_LEVELS[raidKey] || VIDEO_STORAGE_CONSTANTS.RAID_LEVELS["RAID 6"];
    const targetUsable = Math.max(0.1, Number(requiredUsableTb) || 0);
    const servers = Math.max(1, parseInt(numServers, 10) || 1);
    const roles = Math.max(1, parseInt(activeArchiverRoles, 10) || 1);
    const usablePerServer = targetUsable / servers;
    const maxVolTb = GENETEC_514_REQUIREMENTS.maxLogicalVolumeSizeTb || 30;

    return VIDEO_STORAGE_CONSTANTS.STANDARD_DRIVE_SIZES_TB.map(driveTb => {
      // Calculate drives required per server so every server has a valid, redundant RAID array
      let dataDrivesPerServer = Math.max(1, Math.ceil(usablePerServer / driveTb));
      let totalDrivesPerServer = 0;
      let parityDrivesPerServer = 0;

      if (raidDef.id === "RAID 10") {
        // Mirrored pairs: total = 2 * dataDrives, minimum 4 drives
        dataDrivesPerServer = Math.max(2, dataDrivesPerServer);
        totalDrivesPerServer = dataDrivesPerServer * 2;
        parityDrivesPerServer = dataDrivesPerServer;
      } else if (raidDef.id === "JBOD") {
        totalDrivesPerServer = Math.max(1, dataDrivesPerServer);
        parityDrivesPerServer = 0;
      } else {
        // RAID 5, RAID 6, RAID 50, RAID 60
        // If a single server needs more than maxDrivesPerGroup, split into multiple RAID groups
        const minData = Math.max(1, raidDef.minDrives - raidDef.parityDrivesPerGroup);
        dataDrivesPerServer = Math.max(minData, dataDrivesPerServer);
        const maxDataPerGroup = raidDef.maxDrivesPerGroup - raidDef.parityDrivesPerGroup;
        const raidGroupsPerServer = Math.max(1, Math.ceil(dataDrivesPerServer / maxDataPerGroup));
        parityDrivesPerServer = raidGroupsPerServer * raidDef.parityDrivesPerGroup;
        totalDrivesPerServer = dataDrivesPerServer + parityDrivesPerServer;

        // Enforce even drive count for spanned RAID 50 / RAID 60
        if ((raidDef.id === "RAID 50" || raidDef.id === "RAID 60") && (totalDrivesPerServer % 2 !== 0)) {
          totalDrivesPerServer += 1;
          dataDrivesPerServer += 1;
        }
      }

      const totalDrivesAllServers = totalDrivesPerServer * servers;
      const totalDataDrives = dataDrivesPerServer * servers;
      const totalParityDrives = parityDrivesPerServer * servers;
      const rawStorageTb = totalDrivesAllServers * driveTb;
      const usableStorageTb = totalDataDrives * driveTb;
      const usablePerServerTb = dataDrivesPerServer * driveTb;
      const efficiencyPct = Math.round((usableStorageTb / rawStorageTb) * 100);

      // Genetec Windows Volume Sizing:
      // 1) Each Archiver role MUST have its own separate Windows volume(s) (roles cannot share a volume).
      // 2) Each Windows volume is capped at <= 30 TB usable.
      const usablePerRoleTb = usableStorageTb / roles;
      const windowsVolumesPerRole = Math.max(1, Math.ceil(usablePerRoleTb / maxVolTb));
      const totalVolumes30Tb = roles * windowsVolumesPerRole;
      const volumesPerServer30Tb = Math.ceil(totalVolumes30Tb / servers);
      const sizePerVolumeTb = Math.round((usablePerRoleTb / windowsVolumesPerRole) * 10) / 10;

      // Chassis form factor recommendation per server
      let chassisFormFactor = "1U 4-Bay";
      if (totalDrivesPerServer > 24) chassisFormFactor = `${Math.ceil(totalDrivesPerServer / 24)}x 4U 24-Bay JBOD/SAN`;
      else if (totalDrivesPerServer > 12) chassisFormFactor = "4U 24-Bay Rack";
      else if (totalDrivesPerServer > 8) chassisFormFactor = "2U 12-Bay Rack";
      else if (totalDrivesPerServer > 4) chassisFormFactor = "2U 8-Bay Rack";

      return {
        driveSizeTb: driveTb,
        drivesPerServer: totalDrivesPerServer,
        dataDrivesPerServer,
        parityDrivesPerServer,
        totalDrives: totalDrivesAllServers,
        totalDataDrives,
        totalParityDrives,
        rawStorageTb,
        usableStorageTb,
        usablePerServerTb,
        efficiencyPct,
        windowsVolumesPerRole,
        volumesPerServer30Tb,
        totalVolumes30Tb,
        sizePerVolumeTb,
        chassisFormFactor
      };
    });
  },

  /**
   * Master calculation method used by both the Server/Camera Calculator Strip and DRC (project_health.js).
   */
  calculateProjectVideoLoad(bomList = [], overrides = {}) {
    const defaults = (typeof StorageService !== "undefined" && typeof StorageService.getProjectDefaults === "function")
      ? StorageService.getProjectDefaults()
      : null;

    // 1. Resolve inputs & normalize
    const retentionDays = Math.max(1, Number(overrides.retentionDays ?? this.state.retentionDays ?? defaults?.vms?.retentionDays ?? 30) || 30);
    const codec = this.normalizeCodec(overrides.codec ?? this.state.codec ?? "H.265");
    const fps = Math.max(1, Number(overrides.fps ?? this.state.fps ?? 15) || 15);

    // Support both 0..1 (motionDutyCycle) and 1..100 (motionDutyPct)
    let rawMotion = overrides.motionDutyPct ?? overrides.motionDutyCycle ?? this.state.motionDutyPct ?? 50;
    if (rawMotion > 0 && rawMotion <= 1) rawMotion = Math.round(rawMotion * 100);
    const recordingMode = overrides.recordingMode || this.state.recordingMode || (rawMotion >= 100 ? "continuous" : "motion");
    const motionDutyPct = recordingMode === "continuous" ? 100 : Math.max(5, Math.min(100, Number(rawMotion) || 50));
    const motionDutyCycle = motionDutyPct / 100;

    const sceneActivity = overrides.sceneActivity || this.state.sceneActivity || "medium";
    const raidLevel = this.normalizeRaid(overrides.raidLevel ?? overrides.raidType ?? this.state.raidLevel ?? "RAID 6");
    const raidDef = VIDEO_STORAGE_CONSTANTS.RAID_LEVELS[raidLevel] || VIDEO_STORAGE_CONSTANTS.RAID_LEVELS["RAID 6"];

    const resolutionMp = Number(overrides.resolutionMp ?? this.state.resolutionMp ?? 4) || 4;
    const customBitratePerCamMbps = Number(overrides.customBitratePerCamMbps ?? this.state.customBitratePerCamMbps ?? 0) || 0;
    const preferredDriveSizeTb = Number(overrides.preferredDriveSizeTb ?? this.state.preferredDriveSizeTb ?? 16) || 16;

    // Dual-Rate Recording: Low-FPS Continuous (default 2 FPS) until motion/event jumps to target FPS
    const lowFpsUntilMotionDefault = Boolean(overrides.lowFpsUntilMotion ?? this.state.lowFpsUntilMotion);
    const idleFps = Math.max(1, Math.min(30, Number(overrides.idleFps ?? this.state.idleFps ?? 2) || 2));

    // Archiver / NVR Failover Calculator Parameters ("none" | "ring" | "dedicated")
    const failoverStructure = String(overrides.failoverStructure ?? this.state.failoverStructure ?? "none").toLowerCase();
    const ringNodeCountOverride = Math.max(0, parseInt(overrides.ringNodeCount ?? this.state.ringNodeCount ?? 0, 10) || 0);
    const dedicatedPrimaryCountOverride = Math.max(0, parseInt(overrides.dedicatedPrimaryCount ?? this.state.dedicatedPrimaryCount ?? 0, 10) || 0);
    const dedicatedFailoverCount = Math.max(1, parseInt(overrides.dedicatedFailoverCount ?? this.state.dedicatedFailoverCount ?? 1, 10) || 1);
    const maxSimultaneousFailuresOverride = Math.max(1, parseInt(overrides.maxSimultaneousFailures ?? this.state.maxSimultaneousFailures ?? 1, 10) || 1);
    const rawFailoverRetDays = parseInt(overrides.failoverRetentionDays ?? this.state.failoverRetentionDays ?? 0, 10) || 0;
    const effectiveFailoverRetentionDays = rawFailoverRetDays > 0 ? rawFailoverRetDays : retentionDays;
    const failoverIncludeStorageBuffer = (overrides.failoverIncludeStorageBuffer ?? this.state.failoverIncludeStorageBuffer) !== false;

    // 2. Inspect BOM for cameras & quoted NVR/VMS servers
    let bomCameraUnits = 0;
    let bomSensorHeads = 0;
    let bomPeakIngressMbps = 0;

    let quotedUsableTb = 0;
    let quotedRawTb = 0;
    let quotedMaxIngestMbps = 0;
    let quotedServerCount = 0;

    (bomList || []).forEach(item => {
      if (!item || item.parentInstanceId) return;
      const qty = parseInt(item.qty ?? item.quantity, 10) || 1;
      const cat = (item.category || "").toLowerCase();
      const role = (item.role || "").toLowerCase();

      if (cat === "cameras" || role === "camera" || (typeof isCameraDevice === "function" && isCameraDevice(item))) {
        const optics = this.parseCameraOptics(item);
        const mpToUse = this.state.useManualResolutionOnBom ? resolutionMp : optics.mpPerHead;
        const perHeadMbps = this.calculateSingleStreamBitrateMbps(mpToUse, codec, fps, sceneActivity, customBitratePerCamMbps);
        const unitPeakMbps = perHeadMbps * optics.heads;

        bomCameraUnits += qty;
        bomSensorHeads += optics.heads * qty;
        bomPeakIngressMbps += unitPeakMbps * qty;
      } else if (cat === "servers" || cat === "storage" || role.includes("nvr") || role.includes("server") || role.includes("storage")) {
        quotedServerCount += qty;
        const usableTb = parseFloat(item.usableStorageTb ?? item.usableStorageTB ?? item.storageTb ?? 0);
        const rawTb = parseFloat(item.rawStorageTb ?? item.rawStorageTB ?? usableTb);
        const maxBw = parseFloat(item.maxIngestBandwidthMbps ?? item.maxThroughputMbps ?? 600);
        quotedUsableTb += usableTb * qty;
        quotedRawTb += rawTb * qty;
        quotedMaxIngestMbps += maxBw * qty;
      }
    });

    // 3. Determine active camera groups & aggregate bitrate/storage across all groups
    const sourceMode = overrides.sourceMode || this.state.sourceMode || "auto";
    const useBomCameras = (sourceMode === "bom") || (sourceMode === "auto" && bomCameraUnits > 0 && !this.state.hasCustomGroups && !overrides.forceManual);

    const fallbackDefaults = {
      resolutionMp,
      fps,
      idleFps,
      lowFpsUntilMotion: lowFpsUntilMotionDefault,
      codec,
      sceneActivity,
      motionDutyPct,
      retentionDays,
      customBitratePerCamMbps
    };

    let rawGroups = [];
    if (Array.isArray(overrides.cameraGroups) && overrides.cameraGroups.length > 0) {
      rawGroups = overrides.cameraGroups;
    } else if (useBomCameras && bomCameraUnits > 0) {
      rawGroups = this.buildCameraGroupsFromBom(bomList, fallbackDefaults);
    } else if (sourceMode === "bom" && bomCameraUnits === 0) {
      rawGroups = [];
    } else if (Array.isArray(this.state.cameraGroups) && this.state.cameraGroups.length > 0) {
      rawGroups = this.state.cameraGroups;
    } else {
      rawGroups = [{
        id: "grp_1",
        name: "Camera Group 1",
        qty: Math.max(0, parseInt(overrides.manualCameraCount ?? this.state.manualCameraCount ?? 32, 10) || 0),
        heads: 1,
        resolutionMp,
        fps,
        idleFps,
        lowFpsUntilMotion: lowFpsUntilMotionDefault,
        codec,
        sceneActivity,
        motionDutyPct,
        retentionDays
      }];
    }

    const evaluatedGroups = rawGroups.map(g => this.evaluateCameraGroup(g, fallbackDefaults));

    let cameraUnits = 0;
    let totalSensorHeads = 0;
    let peakIngressMbps = 0;
    let idleIngressMbps = 0;
    let lowFpsAddedMbps = 0;
    let lowFpsAddedUsableTb = 0;
    let averageRecordingMbps = 0;
    let dailyStorageGb = 0;
    let baseRequiredUsableTb = 0;
    let lowFpsGroupCount = 0;

    evaluatedGroups.forEach(eg => {
      cameraUnits += eg.qty;
      totalSensorHeads += eg.totalStreams;
      peakIngressMbps += eg.peakIngressMbps;
      if (eg.lowFpsUntilMotion) {
        lowFpsGroupCount += 1;
        idleIngressMbps += (eg.idleIngressMbps || 0);
        lowFpsAddedMbps += (eg.lowFpsAddedMbps || 0);
        lowFpsAddedUsableTb += (eg.lowFpsAddedUsableTb || 0);
      }
      averageRecordingMbps += eg.averageRecordingMbps;
      dailyStorageGb += eg.dailyStorageGb;
      baseRequiredUsableTb += eg.requiredUsableTb;
    });

    const anyLowFpsUntilMotion = lowFpsGroupCount > 0;
    const allLowFpsUntilMotion = evaluatedGroups.length > 0 && lowFpsGroupCount === evaluatedGroups.length;
    const lowFpsUntilMotion = anyLowFpsUntilMotion;

    peakIngressMbps = Math.round(peakIngressMbps * 100) / 100;
    idleIngressMbps = Math.round(idleIngressMbps * 100) / 100;
    lowFpsAddedMbps = Math.round(lowFpsAddedMbps * 100) / 100;
    lowFpsAddedUsableTb = Math.round(lowFpsAddedUsableTb * 100) / 100;
    averageRecordingMbps = Math.round(averageRecordingMbps * 100) / 100;
    dailyStorageGb = Math.round(dailyStorageGb * 10) / 10;
    baseRequiredUsableTb = Math.round(baseRequiredUsableTb * 100) / 100;

    const perCameraSingleStreamMbps = cameraUnits > 0
      ? Math.round((peakIngressMbps / cameraUnits) * 100) / 100
      : this.calculateSingleStreamBitrateMbps(resolutionMp, codec, fps, sceneActivity, customBitratePerCamMbps);

    // 5. Genetec Security Center 5.14.1.0 Archiver & Multi-Role Server Verification
    const genetecProfileKey = overrides.genetecProfile || this.state.genetecProfile || "dedicated_300";
    const profileDef = GENETEC_514_REQUIREMENTS.ARCHIVER_PROFILES[genetecProfileKey] || GENETEC_514_REQUIREMENTS.ARCHIVER_PROFILES.dedicated_300;
    const encryptionCerts = Math.max(0, parseInt(overrides.encryptionCerts ?? this.state.encryptionCerts ?? 0, 10) || 0);
    const softwareMotion = Boolean(overrides.softwareMotionDetection ?? this.state.softwareMotionDetection);

    const encFactor = GENETEC_514_REQUIREMENTS.getEncryptionCapacityFactor(encryptionCerts);
    const motionPenaltyFactor = softwareMotion ? 0.50 : 1.00; // Page 15: Software motion detection reduces capacity up to 50%
    const combinedCapacityFactor = encFactor * motionPenaltyFactor;

    const effectiveMaxCamerasPerArchiver = Math.max(1, Math.floor(profileDef.maxCamerasPerRole * combinedCapacityFactor));
    const effectiveMaxMbpsPerArchiver = Math.max(10, Math.floor(profileDef.maxBitrateMbpsPerRole * combinedCapacityFactor));

    const minArchiversByCameras = cameraUnits > 0 ? Math.ceil(totalSensorHeads / effectiveMaxCamerasPerArchiver) : 1;
    const minArchiversByBitrate = peakIngressMbps > 0 ? Math.ceil(peakIngressMbps / effectiveMaxMbpsPerArchiver) : 1;
    const minRequiredArchiverRoles = cameraUnits > 0 ? Math.max(minArchiversByCameras, minArchiversByBitrate) : 1;

    const userArchiverRoles = parseInt(overrides.archiverRolesCount ?? this.state.archiverRolesCount ?? 0, 10) || 0;
    let activeArchiverRoles = userArchiverRoles > 0 ? userArchiverRoles : minRequiredArchiverRoles;

    // How Multiple Archiver Roles map to physical servers (within Genetec server limits)
    const maxRolesPerPhysicalServer = profileDef.maxRolesPerServer || 4;
    const maxMbpsPerPhysicalServer = profileDef.maxServerBitrateMbps || (effectiveMaxMbpsPerArchiver * maxRolesPerPhysicalServer);
    const minServersByRoles = Math.ceil(activeArchiverRoles / maxRolesPerPhysicalServer);
    const minServersByThroughput = peakIngressMbps > 0 ? Math.ceil(peakIngressMbps / maxMbpsPerPhysicalServer) : 1;
    const minRequiredPrimaryServers = cameraUnits > 0 ? Math.max(1, minServersByRoles, minServersByThroughput) : 1;

    const userServerCount = parseInt(overrides.serverCountOverride ?? this.state.serverCountOverride ?? 0, 10) || 0;
    const basePrimaryServers = userServerCount > 0 ? userServerCount : Math.min(activeArchiverRoles, minRequiredPrimaryServers);

    // =========================================================================
    // 5B. ARCHIVER / NVR FAILOVER CALCULATOR (DYNAMIC N-SERVER RING vs DEDICATED N+M POOL)
    // =========================================================================
    const isRingFailover = failoverStructure === "ring";
    const isDedicatedFailover = failoverStructure === "dedicated";
    const failoverRetentionRatio = retentionDays > 0 ? (effectiveFailoverRetentionDays / retentionDays) : 1;

    // For Ring Failover (Dynamic N-Server Ring: S1 -> S2 -> ... -> SN -> S1):
    // When 1 server fails, its downstream neighbor handles 2x single-server load (its own cameras + failed neighbor's cameras).
    // The ring size dynamically matches the project's server count (minimum 2 servers to form a ring).
    const minRingNodesByThroughput = peakIngressMbps > 0 ? Math.ceil((2 * peakIngressMbps) / maxMbpsPerPhysicalServer) : 2;
    const minRingNodesByRoles = Math.ceil((2 * minRequiredArchiverRoles) / Math.max(2, maxRolesPerPhysicalServer));
    const minCompliantRingNodes = Math.max(2, minRequiredPrimaryServers, minRingNodesByThroughput, minRingNodesByRoles);
    const dynamicAutoRingNodes = Math.max(2, basePrimaryServers, minCompliantRingNodes);
    const activeRingNodes = isRingFailover
      ? (ringNodeCountOverride >= 2 ? ringNodeCountOverride : (userServerCount >= 2 ? userServerCount : dynamicAutoRingNodes))
      : 0;

    // Build Ring Topology Chain (e.g., A ➔ B ➔ A for 2 servers, A ➔ B ➔ C ➔ A for 3, A ➔ B ➔ C ➔ D ➔ A for 4, etc.)
    const getNodeLetter = (idx) => {
      if (idx < 26) return String.fromCharCode(65 + idx);
      return `S${idx + 1}`;
    };

    let primaryServersCount = basePrimaryServers;
    let dedicatedFailoverServersCount = 0;
    let simultaneousFailures = 1;
    let loadsPerFailoverServer = 1;
    let minFailoverServersForK = 1;
    let totalPhysicalServers = basePrimaryServers;
    let failoverAddedUsableTb = 0;
    let requiredUsableTb = baseRequiredUsableTb;
    let normalCamsPerServer = cameraUnits > 0 ? Math.ceil(totalSensorHeads / basePrimaryServers) : 0;
    let normalMbpsPerServer = cameraUnits > 0 ? Math.round((peakIngressMbps / basePrimaryServers) * 10) / 10 : 0;
    let failoverCamsOnSurvivor = normalCamsPerServer;
    let failoverMbpsOnSurvivor = normalMbpsPerServer;
    let primaryUsableTbPerServer = cameraUnits > 0 ? Math.round((baseRequiredUsableTb / basePrimaryServers) * 100) / 100 : 0;
    let failoverBufferTbPerServer = 0;
    let totalUsableTbPerRingServer = primaryUsableTbPerServer;
    let ringChainLabels = [];
    let ringChainText = "";
    let ringNodeSchedule = [];
    let dedicatedPoolSchedule = [];
    let isRingSurvivorVerified = true;
    let isDedicatedSurvivorVerified = true;

    if (isRingFailover) {
      primaryServersCount = activeRingNodes;
      totalPhysicalServers = activeRingNodes;
      if (userArchiverRoles === 0 && activeArchiverRoles < activeRingNodes) {
        activeArchiverRoles = activeRingNodes;
      }

      normalCamsPerServer = cameraUnits > 0 ? Math.ceil(totalSensorHeads / activeRingNodes) : 0;
      normalMbpsPerServer = cameraUnits > 0 ? Math.round((peakIngressMbps / activeRingNodes) * 10) / 10 : 0;
      // When upstream neighbor fails, survivor node records its own cameras + neighbor's cameras (2x node load)
      failoverCamsOnSurvivor = cameraUnits > 0 ? Math.min(totalSensorHeads, normalCamsPerServer * 2) : 0;
      failoverMbpsOnSurvivor = cameraUnits > 0 ? Math.round(Math.min(peakIngressMbps, normalMbpsPerServer * 2) * 10) / 10 : 0;
      isRingSurvivorVerified = failoverMbpsOnSurvivor <= maxMbpsPerPhysicalServer;

      primaryUsableTbPerServer = cameraUnits > 0 ? Math.round((baseRequiredUsableTb / activeRingNodes) * 100) / 100 : 0;
      failoverBufferTbPerServer = (cameraUnits > 0 && failoverIncludeStorageBuffer)
        ? Math.round(primaryUsableTbPerServer * failoverRetentionRatio * 100) / 100
        : 0;
      totalUsableTbPerRingServer = Math.round((primaryUsableTbPerServer + failoverBufferTbPerServer) * 100) / 100;
      failoverAddedUsableTb = Math.round(failoverBufferTbPerServer * activeRingNodes * 100) / 100;
      requiredUsableTb = Math.round((baseRequiredUsableTb + failoverAddedUsableTb) * 100) / 100;

      for (let i = 0; i < activeRingNodes; i++) {
        const currLetter = getNodeLetter(i);
        const prevLetter = getNodeLetter((i - 1 + activeRingNodes) % activeRingNodes);
        const nextLetter = getNodeLetter((i + 1) % activeRingNodes);
        ringChainLabels.push(currLetter);
        ringNodeSchedule.push({
          index: i + 1,
          letter: currLetter,
          nodeLabel: `Server ${currLetter}`,
          nodeName: `Server ${currLetter}`,
          protectsUpstream: `Server ${prevLetter}`,
          failsOverTo: `Server ${nextLetter}`,
          failsOverToDownstream: `Server ${nextLetter}`,
          normalCams: normalCamsPerServer,
          normalCameras: normalCamsPerServer,
          normalMbps: normalMbpsPerServer,
          survivorCams: failoverCamsOnSurvivor,
          failoverCameras: failoverCamsOnSurvivor,
          survivorMbps: failoverMbpsOnSurvivor,
          failoverMbps: failoverMbpsOnSurvivor,
          primaryUsableTb: primaryUsableTbPerServer,
          failoverBufferTb: failoverBufferTbPerServer,
          totalNodeUsableTb: totalUsableTbPerRingServer
        });
      }
      ringChainLabels.push(getNodeLetter(0));
      ringChainText = ringChainLabels.join(" ➔ ");
    } else if (isDedicatedFailover) {
      // Dedicated Failover Pool (N Main Servers failing over into M Shared Failover Server(s), covering K simultaneous Main Server failures)
      primaryServersCount = dedicatedPrimaryCountOverride >= 1
        ? dedicatedPrimaryCountOverride
        : (userServerCount >= 1 ? userServerCount : Math.max(1, basePrimaryServers));
      dedicatedFailoverServersCount = Math.max(1, dedicatedFailoverCount);
      simultaneousFailures = Math.max(1, Math.min(primaryServersCount, maxSimultaneousFailuresOverride));
      loadsPerFailoverServer = Math.max(1, Math.ceil(simultaneousFailures / dedicatedFailoverServersCount));
      totalPhysicalServers = primaryServersCount + dedicatedFailoverServersCount;

      if (userArchiverRoles === 0 && activeArchiverRoles < primaryServersCount) {
        activeArchiverRoles = primaryServersCount;
      }

      normalCamsPerServer = cameraUnits > 0 ? Math.ceil(totalSensorHeads / primaryServersCount) : 0;
      normalMbpsPerServer = cameraUnits > 0 ? Math.round((peakIngressMbps / primaryServersCount) * 10) / 10 : 0;

      // Each shared Failover Server is dynamically sized to absorb `loadsPerFailoverServer` Main Server(s) failing simultaneously
      failoverCamsOnSurvivor = cameraUnits > 0 ? Math.min(totalSensorHeads, normalCamsPerServer * loadsPerFailoverServer) : 0;
      failoverMbpsOnSurvivor = cameraUnits > 0 ? Math.round(Math.min(peakIngressMbps, normalMbpsPerServer * loadsPerFailoverServer) * 10) / 10 : 0;
      minFailoverServersForK = maxMbpsPerPhysicalServer > 0
        ? Math.max(1, Math.ceil((normalMbpsPerServer * simultaneousFailures) / maxMbpsPerPhysicalServer))
        : 1;
      isDedicatedSurvivorVerified = failoverMbpsOnSurvivor <= maxMbpsPerPhysicalServer;

      primaryUsableTbPerServer = cameraUnits > 0 ? Math.round((baseRequiredUsableTb / primaryServersCount) * 100) / 100 : 0;
      failoverBufferTbPerServer = (cameraUnits > 0 && failoverIncludeStorageBuffer)
        ? Math.round(primaryUsableTbPerServer * loadsPerFailoverServer * failoverRetentionRatio * 100) / 100
        : 0;
      totalUsableTbPerRingServer = primaryUsableTbPerServer;
      failoverAddedUsableTb = Math.round(failoverBufferTbPerServer * dedicatedFailoverServersCount * 100) / 100;
      requiredUsableTb = Math.round((baseRequiredUsableTb + failoverAddedUsableTb) * 100) / 100;

      // Build Many-to-One / Many-to-Many Shared Failover Pool Mapping
      const mainServerLabels = [];
      for (let p = 0; p < primaryServersCount; p++) {
        mainServerLabels.push(`Server ${getNodeLetter(p)}`);
      }
      for (let m = 0; m < dedicatedFailoverServersCount; m++) {
        const assignedPrimaries = mainServerLabels.filter((_, idx) => (idx % dedicatedFailoverServersCount) === m);
        const monitoredList = assignedPrimaries.length > 0 ? assignedPrimaries : mainServerLabels;
        dedicatedPoolSchedule.push({
          index: m + 1,
          failoverName: `Failover ${m + 1}`,
          monitorsMainServers: monitoredList,
          monitorsText: monitoredList.join(", "),
          monitoredCount: monitoredList.length,
          simultaneousAbsorbed: loadsPerFailoverServer,
          failoverCams: failoverCamsOnSurvivor,
          failoverMbps: failoverMbpsOnSurvivor,
          failoverBufferTb: failoverBufferTbPerServer
        });
      }
      ringChainText = `${primaryServersCount} Main (${mainServerLabels.slice(0, 4).join(", ")}${primaryServersCount > 4 ? "…" : ""}) ➔ ${dedicatedFailoverServersCount} Shared Failover (${simultaneousFailures} Simultaneous Failure${simultaneousFailures === 1 ? "" : "s"})`;
    }

    const theoreticalRawTb = Math.round(requiredUsableTb * raidDef.approxRawMultiplier * 100) / 100;
    const isArchiverCountVerified = activeArchiverRoles >= minRequiredArchiverRoles;
    const recommendedArchiverServers = totalPhysicalServers;
    const minRequiredServers = isRingFailover
      ? minCompliantRingNodes
      : (isDedicatedFailover ? (minRequiredPrimaryServers + Math.max(dedicatedFailoverServersCount, minFailoverServersForK)) : minRequiredPrimaryServers);
    const rolesPerServer = cameraUnits > 0 ? Math.ceil(activeArchiverRoles / primaryServersCount) : 1;
    const isServerCountVerified = recommendedArchiverServers >= minRequiredServers && rolesPerServer <= maxRolesPerPhysicalServer && isRingSurvivorVerified && isDedicatedSurvivorVerified;

    // Directory isolation rule (Page 15 Section 1.10: >300 cameras requires dedicated Directory server)
    const requiresDedicatedDirectoryServer = totalSensorHeads > GENETEC_514_REQUIREMENTS.directoryIsolationThresholdCameras;
    const directoryCoHostViolation = requiresDedicatedDirectoryServer && (genetecProfileKey === "unified_min" || genetecProfileKey === "unified_rec");

    // Per-Archiver & Per-Server Load Mapping
    const camerasPerArchiverRole = cameraUnits > 0 ? Math.ceil(totalSensorHeads / activeArchiverRoles) : 0;
    const bitratePerArchiverRoleMbps = cameraUnits > 0 ? Math.round((peakIngressMbps / activeArchiverRoles) * 10) / 10 : 0;
    const usableTbPerArchiverRole = cameraUnits > 0 ? Math.round((requiredUsableTb / activeArchiverRoles) * 100) / 100 : 0;

    const usableTbPerServer = cameraUnits > 0 ? Math.round((requiredUsableTb / recommendedArchiverServers) * 100) / 100 : 0;
    const bitratePerServerMbps = isRingFailover ? normalMbpsPerServer : (cameraUnits > 0 ? Math.round((peakIngressMbps / primaryServersCount) * 10) / 10 : 0);

    // 6. Compute Drive Size Matrix across recommendedArchiverServers & activeArchiverRoles
    const driveOptionsMatrix = this.calculateRaidDriveMatrix(requiredUsableTb, raidLevel, recommendedArchiverServers, activeArchiverRoles);
    const selectedDrivePlan = driveOptionsMatrix.find(d => d.driveSizeTb === preferredDriveSizeTb) || driveOptionsMatrix[3] || driveOptionsMatrix[0];

    // Use the exact RAID drive array raw TB when cameras > 0, or theoreticalRawTb
    const requiredRawTb = cameraUnits > 0 ? theoreticalRawTb : 0;
    const arrayRawTb = cameraUnits > 0 && selectedDrivePlan ? selectedDrivePlan.rawStorageTb : 0;
    const arrayUsableTb = cameraUnits > 0 && selectedDrivePlan ? selectedDrivePlan.usableStorageTb : 0;

    // 7. Genetec Windows Volume Mapping (<= 30 TB per Windows Volume, AND separate Windows volume(s) per Archiver Role)
    const maxVolTb = GENETEC_514_REQUIREMENTS.maxLogicalVolumeSizeTb || 30;
    const reqVolumesPerRole = cameraUnits > 0 ? Math.max(1, Math.ceil(usableTbPerArchiverRole / maxVolTb)) : 1;
    const volumesPerArchiverRole = (cameraUnits > 0 && selectedDrivePlan) ? selectedDrivePlan.windowsVolumesPerRole : reqVolumesPerRole;
    const totalLogicalVolumes = (cameraUnits > 0 && selectedDrivePlan) ? selectedDrivePlan.totalVolumes30Tb : (activeArchiverRoles * reqVolumesPerRole);
    const volumesPerServer = (cameraUnits > 0 && selectedDrivePlan) ? selectedDrivePlan.volumesPerServer30Tb : Math.ceil(totalLogicalVolumes / recommendedArchiverServers);
    const sizePerVolumeTb = (cameraUnits > 0 && selectedDrivePlan) ? selectedDrivePlan.sizePerVolumeTb : Math.round((usableTbPerArchiverRole / reqVolumesPerRole) * 10) / 10;

    // Warnings & Verification Findings for Genetec 5.14
    const genetecFindings = [];
    if (cameraUnits > 0) {
      if (!isArchiverCountVerified) {
        genetecFindings.push({
          severity: "critical",
          text: `${activeArchiverRoles} Archiver role(s) configured, but ${minRequiredArchiverRoles} required for ${totalSensorHeads} streams @ ${Math.round(peakIngressMbps)} Mbps (${bitratePerArchiverRoleMbps} Mbps/role exceeds ${effectiveMaxMbpsPerArchiver} Mbps/role limit).`
        });
      }
      if (isRingFailover && !isRingSurvivorVerified) {
        genetecFindings.push({
          severity: "critical",
          text: `Ring Failover Survivor Overload: In a ${activeRingNodes}-node ring (${ringChainText}), a single node failure places ${failoverMbpsOnSurvivor} Mbps (${failoverCamsOnSurvivor} streams) on the neighbor server, exceeding the ${maxMbpsPerPhysicalServer} Mbps/server limit. Increase Ring Servers to at least ${minCompliantRingNodes}.`
        });
      } else if (isDedicatedFailover && !isDedicatedSurvivorVerified) {
        genetecFindings.push({
          severity: "critical",
          text: `Dedicated Failover Overload: ${simultaneousFailures} simultaneous Main Server failure(s) across ${dedicatedFailoverServersCount} Failover Server(s) places ${failoverMbpsOnSurvivor} Mbps (${failoverCamsOnSurvivor} streams) on a single Failover Server, exceeding the ${maxMbpsPerPhysicalServer} Mbps/server limit. Increase Failover Servers (M) to at least ${minFailoverServersForK}.`
        });
      } else if (!isServerCountVerified) {
        genetecFindings.push({
          severity: "critical",
          text: `${recommendedArchiverServers} Server(s) configured (${rolesPerServer} roles per server @ ${bitratePerServerMbps} Mbps per server), but profile supports maximum ${maxRolesPerPhysicalServer} Archiver roles and ${maxMbpsPerPhysicalServer} Mbps per server (${minRequiredServers} server(s) needed).`
        });
      }
      if (directoryCoHostViolation) {
        genetecFindings.push({
          severity: "critical",
          text: `Genetec 5.14 Section 1.10 (p.15): Systems with >300 cameras (${totalSensorHeads} streams) must isolate the Directory role on a dedicated server (cannot use Unified Directory + Archiver).`
        });
      } else if (requiresDedicatedDirectoryServer) {
        genetecFindings.push({
          severity: "info",
          text: `Genetec 5.14 Section 1.10 (p.15): >300 cameras (${totalSensorHeads} streams) requires +1 Dedicated Directory Server alongside the ${recommendedArchiverServers} Archiver server(s).`
        });
      }
      if (isRingFailover) {
        genetecFindings.push({
          severity: "info",
          text: `Dynamic Ring Failover (${ringChainText}): Each of the ${activeRingNodes} servers hosts 1 Primary Archiver (${normalCamsPerServer} cameras / ${normalMbpsPerServer} Mbps / ${primaryUsableTbPerServer} TB) + 1 Standby Archiver for its upstream neighbor (${failoverMbpsOnSurvivor} Mbps survivor load / +${failoverBufferTbPerServer} TB buffer).`
        });
      } else if (isDedicatedFailover) {
        genetecFindings.push({
          severity: "info",
          text: `Shared Dedicated Failover (${primaryServersCount} Main Servers ➔ ${dedicatedFailoverServersCount} Shared Failover Server(s) = ${totalPhysicalServers} Total Servers): Covers up to ${simultaneousFailures} simultaneous Main Server failure(s) (${failoverCamsOnSurvivor} cameras / ${failoverMbpsOnSurvivor} Mbps / ${failoverBufferTbPerServer} TB per Failover Server).`
        });
      }
      if (totalLogicalVolumes > 1 || activeArchiverRoles > 1 || arrayUsableTb > maxVolTb) {
        genetecFindings.push({
          severity: "info",
          text: `Windows Volume Mapping (≤${maxVolTb} TB Cap & Separate Volumes per Role): Configure ${totalLogicalVolumes} separate Windows volume(s) across ${recommendedArchiverServers} server(s) — ${volumesPerArchiverRole} volume(s) per Archiver role (${volumesPerServer} volumes per server @ ~${sizePerVolumeTb} TB each) so no role shares a volume or exceeds ${maxVolTb} TB.`
        });
      }
    }

    // =========================================================================
    // 8. MILESTONE XPROTECT 2026 R2 & HUSKY IVO RECORDING SERVER VERIFICATION
    // =========================================================================
    const vmsVendor = String(overrides.vmsVendor || this.state.vmsVendor || "genetec").toLowerCase();
    const milestoneProfileKey = overrides.milestoneProfile || this.state.milestoneProfile || "husky_1000r";
    const msProfileDef = MILESTONE_2026_REQUIREMENTS.RECORDING_SERVER_PROFILES[milestoneProfileKey] || MILESTONE_2026_REQUIREMENTS.RECORDING_SERVER_PROFILES.husky_1000r;

    const msMaxCamsPerServer = msProfileDef.maxCamerasPerRole || 150;
    const msMaxMbpsPerServer = msProfileDef.maxServerBitrateMbps || 1080;
    const msMaxUsableTbPerServer = msProfileDef.maxUsableStorageTb || 112;

    const msMinServersByCameras = cameraUnits > 0 ? Math.ceil(totalSensorHeads / msMaxCamsPerServer) : 1;
    const msMinServersByBitrate = peakIngressMbps > 0 ? Math.ceil(peakIngressMbps / msMaxMbpsPerServer) : 1;
    const msMinServersByStorage = baseRequiredUsableTb > 0 ? Math.ceil(baseRequiredUsableTb / msMaxUsableTbPerServer) : 1;
    const msMinPrimaryServers = cameraUnits > 0 ? Math.max(1, msMinServersByCameras, msMinServersByBitrate, msMinServersByStorage) : 1;

    const msPrimaryServers = userServerCount > 0 ? userServerCount : msMinPrimaryServers;
    const msFailoverServers = isDedicatedFailover ? dedicatedFailoverServersCount : (isRingFailover ? 1 : 0);
    const msTotalServers = msPrimaryServers + (isDedicatedFailover ? dedicatedFailoverServersCount : 0);

    const msCamsPerServer = cameraUnits > 0 ? Math.ceil(totalSensorHeads / msPrimaryServers) : 0;
    const msMbpsPerServer = cameraUnits > 0 ? Math.round((peakIngressMbps / msPrimaryServers) * 10) / 10 : 0;
    const msUsableTbPerServer = cameraUnits > 0 ? Math.round((baseRequiredUsableTb / msPrimaryServers) * 100) / 100 : 0;
    const msIsServerVerified = msPrimaryServers >= msMinPrimaryServers;

    // Auto-recommend the smallest Husky IVO model that satisfies single-appliance or multi-appliance fit
    const huskyOrder = ["husky_150d", "husky_350", "husky_700r", "husky_1000r", "husky_1800r", "custom_enterprise"];
    let recommendedHuskyProfileKey = "husky_1800r";
    for (const hKey of huskyOrder) {
      const hDef = MILESTONE_2026_REQUIREMENTS.RECORDING_SERVER_PROFILES[hKey];
      if (hDef && totalSensorHeads <= hDef.maxCamerasPerRole && peakIngressMbps <= hDef.maxServerBitrateMbps && baseRequiredUsableTb <= hDef.maxUsableStorageTb) {
        recommendedHuskyProfileKey = hKey;
        break;
      }
    }
    const recommendedHuskyProfile = MILESTONE_2026_REQUIREMENTS.RECORDING_SERVER_PROFILES[recommendedHuskyProfileKey] || msProfileDef;

    // Recommended XProtect License Tier based on camera count, Recording Server count, and Failover
    let recommendedXProtectTier = "Professional+";
    let recommendedXProtectTierReason = "Unlimited cameras & Recording Servers";
    if (totalSensorHeads <= 100 && msPrimaryServers === 1 && failoverStructure === "none") {
      recommendedXProtectTier = "Express+";
      recommendedXProtectTierReason = "≤100 cameras on a single Recording Server without Failover";
    } else if (failoverStructure !== "none" || totalSensorHeads > 250 || baseRequiredUsableTb > 100) {
      recommendedXProtectTier = totalSensorHeads > 500 ? "Corporate" : "Expert";
      recommendedXProtectTierReason = failoverStructure !== "none"
        ? "Hot/Cold Failover Recording Servers require XProtect Expert or Corporate (included at $0 extra license cost)"
        : "Multi-Stage Storage Grooming, AES-256 DB Encryption & GPU Server-Side VMD";
    }

    const milestoneFindings = [];
    if (cameraUnits > 0) {
      if (!msIsServerVerified) {
        milestoneFindings.push({
          severity: "critical",
          text: `${msPrimaryServers}x ${msProfileDef.shortLabel} configured (${msCamsPerServer} channels / ${msMbpsPerServer} Mbps / ${msUsableTbPerServer} TB per unit), exceeding appliance limits (${msMaxCamsPerServer} channels / ${msMaxMbpsPerServer} Mbps / ${msMaxUsableTbPerServer} TB usable). Minimum ${msMinPrimaryServers}x ${msProfileDef.shortLabel} required.`
        });
      } else {
        milestoneFindings.push({
          severity: "info",
          text: `${msPrimaryServers}x ${msProfileDef.shortLabel} Verified: ${msCamsPerServer}/${msMaxCamsPerServer} channels, ${msMbpsPerServer}/${msMaxMbpsPerServer} Mbps, and ${msUsableTbPerServer}/${msMaxUsableTbPerServer} TB usable per appliance.`
        });
      }
      if (isDedicatedFailover) {
        const foModeLabel = dedicatedFailoverServersCount >= msPrimaryServers
          ? "Hot Standby 1:1 Failover Recording Server"
          : `Cold Standby N:1 Failover Group (${msPrimaryServers} Primary ➔ ${dedicatedFailoverServersCount} Failover Server)`;
        milestoneFindings.push({
          severity: "info",
          text: `Milestone ${foModeLabel}: Included at $0 additional software license cost in XProtect Expert and XProtect Corporate (not supported in Express+ or Professional+).`
        });
      } else if (isRingFailover) {
        milestoneFindings.push({
          severity: "warning",
          text: `Milestone Failover Architecture Note: Milestone XProtect uses dedicated Hot Standby (1:1) or Cold Standby (N:1 Failover Group) Recording Server roles rather than peer-to-peer Ring co-hosting. Switch Failover Mode to "Dedicated Failover Pool (N+M)" for native XProtect Cold Standby Failover Group sizing.`
        });
      }
      if (msPrimaryServers > 1 || totalSensorHeads > 100) {
        milestoneFindings.push({
          severity: "info",
          text: `XProtect Tier Requirement: ${totalSensorHeads} streams across ${msPrimaryServers} Recording Server(s) exceeds XProtect Express+ limits (max 100 cameras / 1 Recording Server). Recommended edition: XProtect ${recommendedXProtectTier}.`
        });
      }
      if (["husky_350", "husky_700r", "husky_1000r", "husky_1800r"].includes(milestoneProfileKey)) {
        milestoneFindings.push({
          severity: "info",
          text: `Husky IVO Rackmount VMD Benchmark Note: Max throughput (${msMaxMbpsPerServer} Mbps) is rated with camera-side motion detection or no server VMD. Because Intel Xeon CPUs lack Quick Sync iGPU, add an optional NVIDIA T400/T1000/A1000 GPU (requires XProtect Expert/Corporate) if server-side VMD is enabled.`
        });
      }
    }

    const storageDeficitTb = Math.max(0, Math.round((requiredUsableTb - quotedUsableTb) * 10) / 10);
    const bandwidthExceeded = quotedServerCount > 0 && peakIngressMbps > quotedMaxIngestMbps;

    return {
      // Core counts & parameters
      vmsVendor,
      sourceMode: useBomCameras ? "bom" : "manual",
      cameraGroups: evaluatedGroups,
      bomCameraUnits,
      cameraUnits,
      totalCameras: cameraUnits,
      totalSensorHeads,
      totalSensors: totalSensorHeads,
      resolutionMp,
      retentionDays,
      codec,
      fps,
      idleFps,
      lowFpsUntilMotion,
      anyLowFpsUntilMotion,
      allLowFpsUntilMotion,
      lowFpsGroupCount,
      idleIngressMbps,
      lowFpsAddedMbps,
      lowFpsAddedUsableTb,
      recordingMode,
      motionDutyPct,
      motionDutyCycle,
      sceneActivity,
      raidLevel,
      raidType: raidLevel,
      raidDescription: raidDef.description,
      preferredDriveSizeTb,

      // Bitrate & Storage outputs (both camelCase TB/Tb aliases for full cross-studio compatibility)
      perCameraMbps: perCameraSingleStreamMbps,
      peakIngressMbps: Math.round(peakIngressMbps * 10) / 10,
      averageRecordingMbps: Math.round(averageRecordingMbps * 10) / 10,
      totalBandwidthMbps: Math.round(peakIngressMbps * 10) / 10,
      dailyStorageGb,
      basePrimaryUsableTb: baseRequiredUsableTb,
      baseRequiredUsableTb,
      failoverAddedUsableTb,
      requiredUsableTb,
      requiredUsableTB: requiredUsableTb,
      requiredRawTb,
      requiredRawTB: requiredRawTb,
      arrayRawTb,
      arrayUsableTb,

      // Failover Calculator Telemetry (Dynamic N-Server Ring vs Shared Dedicated N+M Pool)
      failover: {
        structure: failoverStructure,
        isRing: isRingFailover,
        isDedicated: isDedicatedFailover,
        ringNodeCountOverride,
        ringNodes: activeRingNodes,
        activeRingNodes,
        dynamicAutoRingNodes,
        minCompliantRingNodes,
        ringChainText,
        ringNodeSchedule,
        dedicatedPoolSchedule,
        isRingSurvivorVerified,
        isDedicatedSurvivorVerified,
        dedicatedPrimaryCountOverride,
        dedicatedFailoverServers: dedicatedFailoverServersCount,
        dedicatedFailoverCount: dedicatedFailoverServersCount,
        simultaneousFailures,
        loadsPerFailoverServer,
        minFailoverServersForK,
        primaryServerCount: primaryServersCount,
        primaryServersCount,
        totalServersRequired: totalPhysicalServers,
        totalPhysicalServers,
        standbyArchiverRolesRequired: isRingFailover ? activeRingNodes : (isDedicatedFailover ? dedicatedFailoverServersCount : 0),
        failoverRetentionDays: effectiveFailoverRetentionDays,
        rawFailoverRetentionDays: rawFailoverRetDays,
        failoverIncludeStorageBuffer,
        normalCamsPerServer,
        normalMbpsPerServer,
        failoverCamsOnSurvivor,
        failoverMbpsOnSurvivor,
        primaryUsableTbPerServer,
        failoverBufferTbPerServer,
        totalUsableTbPerRingServer,
        failoverAddedUsableTb
      },

      // Drive Matrix & Selected Drive Plan
      driveOptionsMatrix,
      selectedDrivePlan,

      // Genetec Security Center 5.14 Verification & Mapping
      genetec: {
        version: GENETEC_514_REQUIREMENTS.version,
        datasheetPath: GENETEC_514_REQUIREMENTS.datasheetPath,
        maxVolumeSizeTb: maxVolTb,
        volumesPerArchiverRole,
        totalLogicalVolumes,
        volumesPerServer,
        sizePerVolumeTb,
        profileKey: genetecProfileKey,
        profile: profileDef,
        encryptionCerts,
        softwareMotion,
        effectiveMaxCamerasPerArchiver,
        effectiveMaxMbpsPerArchiver,
        maxRolesPerPhysicalServer,
        maxMbpsPerPhysicalServer,
        minArchiversByCameras,
        minArchiversByBitrate,
        minRequiredArchiverRoles,
        userArchiverRoles,
        activeArchiverRoles,
        isArchiverCountVerified,
        minRequiredServers,
        userServerCount,
        recommendedArchiverServers,
        primaryServersCount,
        dedicatedFailoverServersCount,
        rolesPerServer,
        isServerCountVerified,
        requiresDedicatedDirectoryServer,
        directoryCoHostViolation,
        totalServersIncludingDirectory: recommendedArchiverServers + (requiresDedicatedDirectoryServer ? 1 : 0),
        camerasPerArchiverRole,
        bitratePerArchiverRoleMbps,
        usableTbPerArchiverRole,
        usableTbPerServer,
        bitratePerServerMbps,
        findings: genetecFindings,
        isFullyCompliant: isArchiverCountVerified && isServerCountVerified && !directoryCoHostViolation
      },

      // Milestone XProtect 2026 R2 & Husky IVO Verification & Mapping
      milestone: {
        version: MILESTONE_2026_REQUIREMENTS.version,
        datasheetPath: MILESTONE_2026_REQUIREMENTS.datasheetPath,
        huskyOverviewPath: MILESTONE_2026_REQUIREMENTS.huskyOverviewPath,
        profileKey: milestoneProfileKey,
        profile: msProfileDef,
        recommendedHuskyProfileKey,
        recommendedHuskyProfile,
        recommendedXProtectTier,
        recommendedXProtectTierReason,
        maxCamerasPerServer: msMaxCamsPerServer,
        maxMbpsPerServer: msMaxMbpsPerServer,
        maxUsableTbPerServer: msMaxUsableTbPerServer,
        minServersByCameras: msMinServersByCameras,
        minServersByBitrate: msMinServersByBitrate,
        minServersByStorage: msMinServersByStorage,
        minRequiredPrimaryServers: msMinPrimaryServers,
        primaryServersCount: msPrimaryServers,
        failoverServersCount: msFailoverServers,
        totalServersCount: msTotalServers,
        camerasPerServer: msCamsPerServer,
        bitratePerServerMbps: msMbpsPerServer,
        usableTbPerServer: msUsableTbPerServer,
        isServerCountVerified: msIsServerVerified,
        findings: milestoneFindings,
        isFullyCompliant: msIsServerVerified
      },

      // Quoted BOM Server Comparison
      quotedUsableTb: Math.round(quotedUsableTb * 10) / 10,
      quotedUsableTB: Math.round(quotedUsableTb * 10) / 10,
      quotedRawTb: Math.round(quotedRawTb * 10) / 10,
      quotedMaxIngestMbps: Math.round(quotedMaxIngestMbps),
      serverCount: quotedServerCount,
      storageDeficitTb,
      bandwidthExceeded,
      isCompliant: cameraUnits === 0 || (quotedUsableTb >= requiredUsableTb && !bandwidthExceeded)
    };
  },

  /**
   * Alias for calculateProjectVideoLoad used by app.js and project_health.js.
   */
  calculateFromBOM(bomList = [], overrides = {}) {
    return this.calculateProjectVideoLoad(bomList, overrides);
  }
};

window.VIDEO_STORAGE_CONSTANTS = VIDEO_STORAGE_CONSTANTS;
window.GENETEC_514_REQUIREMENTS = GENETEC_514_REQUIREMENTS;
window.MILESTONE_2026_REQUIREMENTS = MILESTONE_2026_REQUIREMENTS;
window.VideoStorageSizer = VideoStorageSizer;
if (window.OSS && typeof window.OSS.register === "function") {
  window.OSS.register("Sizers.VideoStorage", {
    VIDEO_STORAGE_CONSTANTS,
    GENETEC_514_REQUIREMENTS,
    MILESTONE_2026_REQUIREMENTS,
    VideoStorageSizer
  });
}
