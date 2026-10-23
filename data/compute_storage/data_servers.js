// =========================================================================
// DATA: ENTERPRISE COMPUTE, VMS RECORDING SERVERS & STORAGE APPLIANCES
// NetSelect Enterprise Architecture
// =========================================================================

const SERVERS_DATABASE = [
  {
    id: "dell-r760-vms-enterprise",
    vendor: "Dell Technologies",
    model: "Dell PowerEdge R760 2U Enterprise VMS Server",
    sku: "PE-R760-VMS-2U",
    role: "Server",
    category: "servers",
    serverType: "vms_recording",
    rackUnits: 2,
    formFactor: "2U Rackmount",
    cpu: "2x Intel Xeon Silver 4410Y (24 Cores / 48 Threads)",
    ramGb: 64,
    storageBays: "12x 3.5\" Hot-Swap SAS/SATA + 2x Rear M.2 BOSS NVMe",
    rawStorageTb: 120,
    usableStorageTb: 96,
    raidLevel: "RAID-6 Hardware (PERC H755)",
    ports: 4,
    portSpeed: "10G",
    portFormFactorSummary: "2x 10GbE SFP+ optical ports + 2x 1GbE RJ45 Base-T",
    uplinksSummary: "2x 10GbE SFP+ LACP Ingest Trunk",
    maxIngestBandwidthMbps: 850,
    supportedCameras: 128,
    dualPsu: true,
    psuWattage: 800,
    baseWatts: 320,
    maxPowerWatts: 550,
    heatOutputBtu: 1876,
    depthInches: 28.5,
    weightLbs: 65,
    mounting: "19\" Rackmount (2U)",
    msrp: 11450,
    hostedRoles: ["VMS Ingest & Recording", "AI Video Analytics"],
    supportedVmsEngines: ["Milestone XProtect Corporate", "Genetec Security Center Omnicast", "Hanwha WAVE", "ExacqVision"],
    keyFeatures: [
      "Enterprise dual-socket Intel Xeon platform with 96TB usable RAID-6 video storage",
      "Redundant 800W hot-plug Platinum power supplies with failover",
      "High-throughput 850 Mbps continuous recording ingress with dedicated OS SSDs",
      "Integrated Dell Remote Access Controller 9 (iDRAC9 Enterprise) with out-of-band IPMI"
    ],
        datasheetPath: "Datasheets/Compute/Dell/Dell PowerEdge R760 - Datasheet.pdf",
        image: "assets/images/products/dell_poweredge_r760.webp"
    },
  {
    id: "bcd-aurora-1u-nvr",
    vendor: "BCDVideo",
    model: "BCDVideo Aurora BCD104-E 1U Network Video Recorder",
    sku: "BCD-104-E-1U-32T",
    role: "Server",
    category: "servers",
    serverType: "vms_recording",
    rackUnits: 1,
    formFactor: "1U Rackmount",
    cpu: "Intel Core i7-13700E (16 Cores / 24 Threads)",
    ramGb: 32,
    storageBays: "4x 3.5\" Enterprise SATA Bays",
    rawStorageTb: 32,
    usableStorageTb: 24,
    raidLevel: "RAID-5 Hardware",
    ports: 2,
    portSpeed: "10G",
    portFormFactorSummary: "2x 10GbE RJ45 Multi-Gigabit Ports",
    uplinksSummary: "2x 10GbE LACP Trunk",
    maxIngestBandwidthMbps: 450,
    supportedCameras: 64,
    dualPsu: true,
    psuWattage: 500,
    baseWatts: 180,
    maxPowerWatts: 320,
    heatOutputBtu: 1092,
    depthInches: 21.5,
    weightLbs: 32,
    mounting: "19\" Rackmount (1U)",
    msrp: 6850,
    hostedRoles: ["VMS Ingest & Recording"],
    supportedVmsEngines: ["Milestone XProtect", "Hanwha WAVE", "Axis Camera Station", "Avigilon Unity"],
    keyFeatures: [
      "Compact 1U chassis optimized for edge IDF and branch video recording",
      "Dedicated 24TB RAID-5 video archive with 450 Mbps recording throughput",
      "Dual hot-swap 500W power supplies with active power factor correction",
      "5-Year Next Business Day on-site hardware warranty"
    ],
        datasheetPath: "Datasheets/Compute/BCDVideo/BCDVideo Aurora BCD104-E 1U NVR - Datasheet.pdf",
        image: "assets/images/products/bcdvideo_bcd104_1u.webp"
    },
  {
    id: "supermicro-4u-san-storage",
    vendor: "Supermicro",
    model: "Supermicro SuperServer 4U 24-Bay High-Density Storage",
    sku: "SS-6049P-E1CR24H",
    role: "Server",
    category: "servers",
    serverType: "high_density_storage",
    rackUnits: 4,
    formFactor: "4U Rackmount",
    cpu: "2x Intel Xeon Gold 5418Y (48 Cores)",
    ramGb: 128,
    storageBays: "24x 3.5\" Hot-Swap SAS-3 12Gb/s Bays + 2x Rear NVMe",
    rawStorageTb: 432,
    usableStorageTb: 360,
    raidLevel: "RAID-60 Hardware (MegaRAID 9560-8i)",
    ports: 4,
    portSpeed: "25G",
    portFormFactorSummary: "2x 25GbE SFP28 cages + 2x 10GbE SFP+ cages",
    uplinksSummary: "2x 25GbE SFP28 Campus Core Backbone",
    maxIngestBandwidthMbps: 2400,
    supportedCameras: 350,
    dualPsu: true,
    psuWattage: 1200,
    baseWatts: 550,
    maxPowerWatts: 980,
    heatOutputBtu: 3344,
    depthInches: 26.5,
    weightLbs: 110,
    mounting: "19\" Rackmount (4U)",
    msrp: 24900,
    hostedRoles: ["VMS Ingest & Recording", "Long-Term SAN Archive"],
    supportedVmsEngines: ["Milestone XProtect Corporate", "Genetec Security Center Archiver", "Qognify Ocularis"],
    keyFeatures: [
      "Massive 360TB usable long-term storage array for 90-180 day retention mandates",
      "High-speed 25G SFP28 redundant uplinks supporting up to 2.4 Gbps concurrent ingress",
      "Dual 1200W Titanium-Level (96% efficiency) redundant power supplies",
      "Integrated IPMI 2.0 with virtual media over LAN and KVM-over-LAN support"
    ],
        datasheetPath: "Datasheets/Compute/Supermicro/Supermicro SuperStorage 6049P-E1CR24H - Datasheet.pdf",
        image: "assets/images/products/supermicro_6049p.webp"
    },
  {
    id: "hpe-dl380-access-security-host",
    vendor: "HPE",
    model: "HPE ProLiant DL380 Gen11 Access & Identity Host",
    sku: "P52534-B21-AC",
    role: "Server",
    category: "servers",
    serverType: "access_security_host",
    rackUnits: 2,
    formFactor: "2U Rackmount",
    cpu: "1x Intel Xeon Silver 4410Y (12 Cores / 24 Threads)",
    ramGb: 32,
    storageBays: "8x 2.5\" SFF Enterprise SAS SSDs",
    rawStorageTb: 7.68,
    usableStorageTb: 3.84,
    raidLevel: "RAID-10 Solid State Array",
    ports: 4,
    portSpeed: "10G",
    portFormFactorSummary: "2x 10GbE SFP+ cages + 2x 1GbE RJ45",
    uplinksSummary: "2x 10GbE SFP+ Core Trunk",
    maxIngestBandwidthMbps: 200,
    supportedAccessDoors: 512,
    dualPsu: true,
    psuWattage: 800,
    baseWatts: 240,
    maxPowerWatts: 420,
    heatOutputBtu: 1433,
    depthInches: 28.0,
    weightLbs: 48,
    mounting: "19\" Rackmount (2U)",
    msrp: 8950,
    hostedRoles: ["Access Control Engine", "Directory / IAM Authentication"],
    supportedAccessEngines: ["Lenel OnGuard", "Software House C•CURE 9000", "Genetec Synergis", "Avigilon Unity Access"],
    keyFeatures: [
      "Enterprise SQL and transaction-optimized platform for mission-critical access control",
      "High-IOPS all-flash RAID-10 storage for sub-millisecond card badge authorization",
      "HPE iLO 6 Silicon Root of Trust security architecture preventing unauthorized firmware",
      "Dual redundant 800W Flex Slot Platinum hot-plug power supplies"
    ],
        datasheetPath: "Datasheets/Compute/HPE/HPE ProLiant DL380 Gen11 - Datasheet.pdf",
        image: "assets/images/products/hpe_dl380_gen11.webp"
    }
];

if (typeof window !== "undefined") {
  window.SERVERS_DATABASE = SERVERS_DATABASE;
}

// =========================================================================
// DATA: SOC OPERATOR WORKSTATIONS & VIDEO WALL CLIENT SYSTEMS
// =========================================================================
const WORKSTATIONS_DATABASE = [
  {
    id: "genetec-svw-502e-soc-workstation",
    vendor: "Genetec",
    model: "Genetec Streamvault SVW-502E Quad-Monitor SOC Workstation",
    sku: "SVW-502E-T-I9-RTX",
    role: "Workstation",
    category: "workstations",
    serverType: "soc_workstation",
    rackUnits: 0,
    formFactor: "Tower Workstation",
    cpu: "Intel Core i9-14900 (24 Cores / 32 Threads, up to 5.8 GHz)",
    ramGb: 32,
    gpu: "NVIDIA RTX A2000 12GB GDDR6 (4x Mini-DP 1.4a)",
    maxMonitors: 4,
    decodeStreams1080p: 64,
    storageBays: "512GB NVMe M.2 PCIe Gen4 OS SSD",
    ports: 2,
    portSpeed: "2.5G",
    portFormFactorSummary: "1x 2.5GbE RJ45 + 1x 1GbE RJ45",
    baseWatts: 180,
    maxPowerWatts: 500,
    heatOutputBtu: 1706,
    msrp: 4250,
    hostedRoles: ["Security Desk Client", "4-Monitor Video Wall Operator"],
    keyFeatures: [
      "Turnkey Genetec Streamvault appliance certified for Security Desk 5.13/5.14 high-density decoding",
      "Hardware-accelerated H.265/H.264 decoding via NVIDIA RTX A2000 12GB GPU across up to 4x 4K UHD displays",
      "Intel Core i9 24-Core processor with 32GB DDR5 ECC/non-ECC memory and 5-Year hardware warranty"
    ],
    datasheetPath: "Datasheets/Genetec/SystemRequirements.pdf",
    image: "assets/images/products/bcdvideo_bcd104_1u.webp"
  },
  {
    id: "dell-precision-3680-soc-tower",
    vendor: "Dell Technologies",
    model: "Dell Precision 3680 Tower Security Operator Workstation",
    sku: "PREC-3680-SOC-4M",
    role: "Workstation",
    category: "workstations",
    serverType: "soc_workstation",
    rackUnits: 0,
    formFactor: "Tower Workstation",
    cpu: "Intel Core i7-14700 (20 Cores / 28 Threads)",
    ramGb: 32,
    gpu: "NVIDIA T1000 8GB GDDR6 (4x Mini-DP 1.4)",
    maxMonitors: 4,
    decodeStreams1080p: 48,
    storageBays: "512GB M.2 PCIe NVMe SSD",
    ports: 2,
    portSpeed: "1G",
    portFormFactorSummary: "1x 1GbE RJ45 + Optional 2.5GbE NIC",
    baseWatts: 150,
    maxPowerWatts: 460,
    heatOutputBtu: 1569,
    msrp: 2890,
    hostedRoles: ["Security Desk Client", "Multi-Monitor Guard Station"],
    keyFeatures: [
      "Enterprise operator workstation engineered for 24/7 Security Operations Center (SOC) viewing",
      "NVIDIA T1000 8GB workstation graphics driving 4 independent 4K displays simultaneously",
      "Windows 11 Pro for Workstations with 3-Year Dell ProSupport Next Business Day On-Site"
    ],
    datasheetPath: "Datasheets/Genetec/SystemRequirements.pdf",
    image: "assets/images/products/dell_poweredge_r760.webp"
  },
  {
    id: "bcd-aurora-rackmount-workstation-2u",
    vendor: "BCDVideo",
    model: "BCDVideo Aurora 2U Rackmount Video Wall & Viewing Station",
    sku: "BCD204-VW-I9-A4000",
    role: "Workstation",
    category: "workstations",
    serverType: "video_wall_decoder",
    rackUnits: 2,
    formFactor: "2U Rackmount",
    cpu: "Intel Core i9-13900K (24 Cores / 32 Threads)",
    ramGb: 64,
    gpu: "2x NVIDIA RTX A4000 16GB (8x DisplayPort 1.4a)",
    maxMonitors: 8,
    decodeStreams1080p: 128,
    storageBays: "2x 1TB NVMe M.2 RAID-1 OS Array",
    ports: 2,
    portSpeed: "10G",
    portFormFactorSummary: "2x 10GbE RJ45 High-Bandwidth Client NICs",
    dualPsu: true,
    psuWattage: 800,
    baseWatts: 340,
    maxPowerWatts: 650,
    heatOutputBtu: 2218,
    msrp: 8450,
    hostedRoles: ["8-Display Video Wall Decoder", "Rackmount Command Center Client"],
    keyFeatures: [
      "2U rackmount video wall processor with dual NVIDIA RTX A4000 GPUs supporting up to 8x 4K displays",
      "Dual 10GbE network interfaces and redundant 800W hot-swap power supplies for 24/7 command centers",
      "Validated for Genetec Security Center Federation, Milestone XProtect Smart Wall, and KVM extension"
    ],
    datasheetPath: "Datasheets/Compute/BCDVideo/BCDVideo Aurora BCD104-E 1U NVR - Datasheet.pdf",
    image: "assets/images/products/bcdvideo_bcd104_1u.webp"
  }
];

// =========================================================================
// DATA: VMS SOFTWARE, CAMERA LICENSES & OS / VIRTUALIZATION
// =========================================================================
const SOFTWARE_DATABASE = {
  vms: [
    {
      id: "genetec-gsc-base-514",
      vendor: "Genetec",
      model: "Genetec Security Center 5.14 Enterprise Base Package (Omnicast)",
      sku: "GSC-BASE-5.14-ENT",
      role: "Software License",
      category: "vms_software",
      type: "license",
      licenseType: "Base Server License",
      msrp: 2450,
      description: "Core Genetec Security Center 5.14 directory, Archiver role orchestration, and unified VMS base platform license.",
      keyFeatures: [
        "Includes Directory Server, Archiver Role support, Media Router, and 5 Security Desk client connections",
        "Supports multi-role Archiver deployment up to 300 cameras / 600 Mbps per role (30 TB max per Windows volume)",
        "Native Active Directory SSO, TLS 1.3 stream encryption, and Federation readiness"
      ],
      datasheetPath: "Datasheets/Genetec/SystemRequirements.pdf"
    },
    {
      id: "genetec-gsc-1cam-lic",
      vendor: "Genetec",
      model: "Genetec Security Center Omnicast — 1 Camera Connection License",
      sku: "GSC-OM-E-1C",
      role: "Software License",
      category: "vms_software",
      type: "license",
      licenseType: "Per-Camera License",
      msrp: 235,
      description: "Single IP camera connection license for Genetec Security Center Omnicast Enterprise (supports single-sensor and multi-sensor IP heads under 1 MAC).",
      keyFeatures: [
        "Licenses 1 IP camera or multi-sensor device on Genetec Security Center Omnicast",
        "Supports H.264, H.265, and MJPEG multistreaming with dynamic keyframe recording",
        "Compatible with Edge Storage failover and Archiver standby failover"
      ],
      datasheetPath: "Datasheets/Genetec/SystemRequirements.pdf"
    },
    {
      id: "genetec-gsc-failover-1cam",
      vendor: "Genetec",
      model: "Genetec Omnicast Standby Archiver Failover — 1 Camera License",
      sku: "GSC-OM-E-1F",
      role: "Software License",
      category: "vms_software",
      type: "license",
      licenseType: "Failover Add-On",
      msrp: 65,
      description: "Hot-standby Archiver failover license per camera for mission-critical zero-downtime video retention.",
      keyFeatures: [
        "Enables automatic hot-standby Archiver takeover if primary Archiver server or volume goes offline",
        "Seamless timeline stitching inside Genetec Security Desk"
      ],
      datasheetPath: "Datasheets/Genetec/SystemRequirements.pdf"
    },
    {
      id: "genetec-advantage-1cam-1yr",
      vendor: "Genetec",
      model: "Genetec Advantage Software Maintenance — 1 Camera (1-Year)",
      sku: "ADV-CAM-E-1Y",
      role: "Software License",
      category: "vms_software",
      type: "license",
      licenseType: "Annual SMA",
      msrp: 42,
      description: "1-Year Genetec Advantage Software Maintenance Agreement (SMA) per camera connection.",
      keyFeatures: [
        "Includes major/minor Security Center version upgrades, firmware driver packs, and 24/7 technical support",
        "Access to Genetec System Availability Monitor (SAM) cloud health telemetry"
      ],
      datasheetPath: "Datasheets/Genetec/SystemRequirements.pdf"
    },
    {
      id: "milestone-xprotect-corp-dev",
      vendor: "Milestone Systems",
      model: "Milestone XProtect Corporate — 1 Device Channel License",
      sku: "XPCOBT-DL",
      role: "Software License",
      category: "vms_software",
      type: "license",
      licenseType: "Per-Camera License",
      msrp: 269,
      description: "Enterprise device license for Milestone XProtect Corporate VMS supporting distributed recording servers and Smart Wall.",
      keyFeatures: [
        "Supports unrestricted recording servers, failover recording servers, and XProtect Smart Wall",
        "Hardware-accelerated video motion detection and multi-layer interactive maps"
      ]
    }
  ],
  os: [
    {
      id: "ms-win-svr-2022-std-16c",
      vendor: "Microsoft",
      model: "Windows Server 2022 Standard Edition (16-Core License Pack)",
      sku: "9EM-00765",
      role: "OS / Hypervisor",
      category: "os_virtualization",
      type: "license",
      licenseType: "Server OS License",
      msrp: 1069,
      description: "Microsoft Windows Server 2022 Standard 16-Core base license for VMS Archiver and Directory hosts (certified for Genetec Security Center 5.14).",
      keyFeatures: [
        "Certified operating system for Genetec Security Center 5.14 Directory and Archiver roles",
        "Includes license rights for 2 Operating System Environments (OSEs / VMs) or 1 physical host",
        "Supports NTFS 64K allocation unit volumes up to 30 TB per Genetec Archiver role best practice"
      ],
      datasheetPath: "Datasheets/Genetec/SystemRequirements.pdf"
    },
    {
      id: "ms-sql-svr-2022-std-4c",
      vendor: "Microsoft",
      model: "Microsoft SQL Server 2022 Standard Edition (Server + 5 CALs)",
      sku: "7NQ-01025",
      role: "OS / Hypervisor",
      category: "os_virtualization",
      type: "license",
      licenseType: "Database License",
      msrp: 1418,
      description: "Production relational database license for high-scale Genetec Directory, ALPR reads, and enterprise audit trails (replaces SQL Express 10GB limit).",
      keyFeatures: [
        "Removes the 10 GB database size cap and 1 GB RAM limit of SQL Server Express",
        "Required for enterprise Genetec deployments with >100 cameras, AutoVu LPR, or long-term event retention"
      ],
      datasheetPath: "Datasheets/Genetec/SystemRequirements.pdf"
    },
    {
      id: "vmware-vsphere-8-std-1yr",
      vendor: "VMware by Broadcom",
      model: "VMware vSphere 8 Standard Subscription (Per Core, 1-Year)",
      sku: "VS8-STD-SUB-1Y",
      role: "OS / Hypervisor",
      category: "os_virtualization",
      type: "license",
      licenseType: "Hypervisor License",
      msrp: 95,
      description: "Enterprise Type-1 hypervisor license for virtualized VMS Directory, Media Router, and Failover Archiver clusters.",
      keyFeatures: [
        "Supports vMotion live migration and vSphere High Availability (HA) for virtualized VMS roles",
        "Validated with Genetec Security Center 5.14 virtualization guidelines"
      ],
      datasheetPath: "Datasheets/Genetec/SystemRequirements.pdf"
    }
  ]
};

if (typeof window !== "undefined") {
  window.WORKSTATIONS_DATABASE = WORKSTATIONS_DATABASE;
  window.SOFTWARE_DATABASE = SOFTWARE_DATABASE;
}
