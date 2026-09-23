// =========================================================================
// DATA: FIREWALLS, ENTERPRISE GATEWAYS & CELLULAR ROUTERS
// =========================================================================

FIREWALL_DATABASE.push(
  // ==========================================
  // UBIQUITI UNIFI GATEWAYS & CLOUD CONSOLES
  // ==========================================
  {
    vendor: "UniFi",
    model: "UniFi Enterprise Fortress Gateway (EFG)",
    sku: "EFG",
    clients: 5000,
    fwThroughput: "25 Gbps",
    ipsThroughput: "12.5 Gbps",
    vpnThroughput: "8 Gbps",
    wanPorts: "2x 25G SFP28 + 2x 10G SFP+",
    dualPsu: true,
    msrp: 1999,
    category: "firewall",
    keyFeatures: [
      "Enterprise Next-Gen Gateway with NeXT AI inspection",
      "25 Gbps routing with 12.5 Gbps full IPS/IDS filtering",
      "Dual hot-swappable 1+1 redundant power supplies",
      "Shadow Mode High Availability support"
    ]
  },
  {
    vendor: "UniFi",
    model: "UniFi Dream Machine Beast",
    sku: "UDM-Beast",
    clients: 7500,
    fwThroughput: "25 Gbps",
    ipsThroughput: "25 Gbps",
    vpnThroughput: "12 Gbps",
    wanPorts: "1x 10GbE WAN + 2x 25G SFP28",
    dualPsu: true,
    msrp: 1499,
    category: "firewall",
    keyFeatures: [
      "Ultra-high density campus core console",
      "Wire-speed 25 Gbps full IDS/IPS inspection",
      "Integrated SSD storage for UniFi Protect NVR camera recording",
      "Hot-swap redundant power architecture"
    ]
  },
  {
    vendor: "UniFi",
    model: "UniFi Dream Machine Pro Max",
    sku: "UDM-Pro-Max",
    clients: 2000,
    fwThroughput: "10 Gbps",
    ipsThroughput: "5 Gbps",
    vpnThroughput: "3.5 Gbps",
    wanPorts: "2x 10G SFP+ + 1x 2.5G RJ45",
    dualPsu: true,
    msrp: 599,
    category: "firewall",
    keyFeatures: [
      "5 Gbps IPS/IDS threat management throughput",
      "Dual 3.5\" HDD bays for high-retention NVR surveillance video",
      "SmartPower RPS DC failover support",
      "Integrated Network & Protect application server"
    ]
  },
  {
    vendor: "UniFi",
    model: "UniFi Dream Machine Pro",
    sku: "UDM-Pro",
    clients: 1000,
    fwThroughput: "3.5 Gbps",
    ipsThroughput: "3.5 Gbps",
    vpnThroughput: "2.5 Gbps",
    wanPorts: "1x 10G SFP+ + 1x 1G RJ45",
    dualPsu: false,
    msrp: 379,
    category: "firewall",
    keyFeatures: [
      "Standard enterprise branch security gateway & controller",
      "Single 3.5\" HDD bay for UniFi Protect CCTV cameras",
      "10G SFP+ LAN & WAN uplink interfaces",
      "Full DPI application traffic filtering"
    ]
  },
  {
    vendor: "UniFi",
    model: "UniFi Gateway Pro",
    sku: "UXG-Pro",
    role: "Gateway Only",
    clients: 1000,
    fwThroughput: "5 Gbps",
    ipsThroughput: "3.5 Gbps",
    vpnThroughput: "2.5 Gbps",
    wanPorts: "2x 10G SFP+ + 2x 1G RJ45",
    dualPsu: true,
    msrp: 499,
    category: "firewall",
    keyFeatures: [
      "Dedicated standalone enterprise gateway (no integrated NVR)",
      "Adopts into self-hosted, cloud-hosted, or CloudKey controllers",
      "SmartPower RPS redundant DC backup input",
      "Multi-WAN load balancing and failover"
    ]
  },
  {
    vendor: "UniFi",
    model: "UniFi Cloud Gateway Max (NVMe Bay)",
    sku: "UCG-Max",
    clients: 600,
    fwThroughput: "1.5 Gbps",
    ipsThroughput: "1.5 Gbps",
    vpnThroughput: "1 Gbps",
    wanPorts: "1x 2.5GbE WAN + 4x 2.5GbE LAN",
    dualPsu: false,
    msrp: 199,
    category: "firewall",
    keyFeatures: [
      "Compact desktop multi-gigabit security gateway",
      "Internal NVMe M.2 SSD bay for local Protect camera storage",
      "1.5 Gbps line-rate IPS/IDS routing",
      "All 2.5GbE RJ-45 copper interfaces"
    ]
  },
  {
    vendor: "UniFi",
    model: "UniFi Cloud Gateway Ultra",
    sku: "UCG-Ultra",
    clients: 300,
    fwThroughput: "1 Gbps",
    ipsThroughput: "1 Gbps",
    vpnThroughput: "800 Mbps",
    wanPorts: "1x 1GbE WAN + 4x 1GbE LAN",
    dualPsu: false,
    msrp: 129,
    category: "firewall",
    keyFeatures: [
      "Ultra-compact entry security gateway & controller",
      "1 Gbps line-rate IDS/IPS threat protection",
      "Dual WAN failover and traffic steering",
      "Runs full UniFi Network application"
    ]
  },

  // ==========================================
  // CISCO MERAKI MX & TELEWORKER SECURITY
  // ==========================================
  {
    vendor: "Meraki",
    model: "Meraki MX450 Campus Firewall",
    sku: "MX450-HW",
    clients: 10000,
    fwThroughput: "10 Gbps",
    ipsThroughput: "5 Gbps",
    vpnThroughput: "6.5 Gbps",
    wanPorts: "2x 10G SFP+ + 2x 1G SFP",
    dualPsu: true,
    msrp: 27995,
    category: "firewall",
    keyFeatures: [
      "Enterprise campus headend supporting 10,000 active clients",
      "5 Gbps Advanced Threat Protection (Snort IDS/AMP)",
      "Dual hot-swappable 1+1 redundant power supplies",
      "High-speed 10G SFP+ WAN and LAN interfaces"
    ]
  },
  {
    vendor: "Meraki",
    model: "Meraki MX250 Mid-Campus Firewall",
    sku: "MX250-HW",
    clients: 2000,
    fwThroughput: "7.5 Gbps",
    ipsThroughput: "2 Gbps",
    vpnThroughput: "4 Gbps",
    wanPorts: "2x 10G SFP+ + 2x 1G SFP",
    dualPsu: true,
    msrp: 14995,
    category: "firewall",
    keyFeatures: [
      "2,000 client capacity with 4 Gbps Site-to-Site Auto VPN",
      "Dual hot-swappable load-sharing power supplies",
      "Active-Passive High Availability pairing",
      "Automated cloud firmware management"
    ]
  },
  {
    vendor: "Meraki",
    model: "Meraki MX105 Branch Firewall",
    sku: "MX105-HW",
    clients: 750,
    fwThroughput: "5 Gbps",
    ipsThroughput: "2 Gbps",
    vpnThroughput: "3.5 Gbps",
    wanPorts: "2x 10G SFP+ + 2x 2.5G RJ45",
    dualPsu: true,
    msrp: 8495,
    category: "firewall",
    keyFeatures: [
      "Dual hot-swap power supplies standard in a 1U chassis",
      "2.5G mGig copper + 10G SFP+ WAN fiber connectivity",
      "2 Gbps Snort IPS/IDS throughput",
      "Zero-touch SD-WAN interconnectivity"
    ]
  },
  {
    vendor: "Meraki",
    model: "Meraki MX95 Branch Firewall",
    sku: "MX95-HW",
    clients: 500,
    fwThroughput: "3 Gbps",
    ipsThroughput: "1.5 Gbps",
    vpnThroughput: "2.5 Gbps",
    wanPorts: "2x 10G SFP+ + 2x 2.5G RJ45",
    dualPsu: false,
    msrp: 4995,
    category: "firewall",
    keyFeatures: [
      "Standard medium branch gateway supporting 500 endpoints",
      "1.5 Gbps threat inspection throughput",
      "Native 10G SFP+ uplinks into IDF core switches",
      "Dynamic path selection with performance failover"
    ]
  },
  {
    vendor: "Meraki",
    model: "Meraki MX85 Small Branch Firewall",
    sku: "MX85-HW",
    clients: 250,
    fwThroughput: "1 Gbps",
    ipsThroughput: "500 Mbps",
    vpnThroughput: "1 Gbps",
    wanPorts: "2x 1G SFP + 2x 1G RJ45",
    dualPsu: false,
    msrp: 2495,
    category: "firewall",
    keyFeatures: [
      "1U fixed-mount gateway for small security command posts",
      "500 Mbps IPS throughput with Snort & Cisco Talos rules",
      "SFP fiber WAN interfaces for direct metro fiber handoff",
      "Integrated SD-WAN traffic steering"
    ]
  },
  {
    vendor: "Meraki",
    model: "Meraki MX75 Desktop Firewall",
    sku: "MX75-HW",
    clients: 200,
    fwThroughput: "1 Gbps",
    ipsThroughput: "500 Mbps",
    vpnThroughput: "1 Gbps",
    wanPorts: "1x 1G SFP + 1x 1G RJ45",
    dualPsu: false,
    msrp: 1695,
    category: "firewall",
    keyFeatures: [
      "Compact form factor with 1G SFP fiber WAN",
      "500 Mbps Advanced Threat Protection throughput",
      "Internal power supply (standard IEC power cord, no brick)",
      "Automated Auto VPN mesh connectivity"
    ]
  },
  {
    vendor: "Meraki",
    model: "Meraki MX68CW Cellular & Wi-Fi Gateway",
    sku: "MX68CW-HW",
    clients: 50,
    fwThroughput: "700 Mbps",
    ipsThroughput: "300 Mbps",
    vpnThroughput: "400 Mbps",
    wanPorts: "2x 1G RJ45 + Integrated Cat 6 LTE + Wi-Fi 5",
    dualPsu: false,
    msrp: 1695,
    category: "cellular",
    keyFeatures: [
      "Embedded Cat 6 LTE modem for primary or failover WAN",
      "Integrated dual-band 802.11ac Wave 2 Wi-Fi",
      "2x 802.3at PoE+ ports on local LAN to power cameras/phones",
      "Ideal for remote guard shacks, kiosks, and trailer offices"
    ]
  },
  {
    vendor: "Meraki",
    model: "Meraki MX67 Desktop Firewall",
    sku: "MX67-HW",
    clients: 50,
    fwThroughput: "700 Mbps",
    ipsThroughput: "300 Mbps",
    vpnThroughput: "400 Mbps",
    wanPorts: "2x 1G RJ45",
    dualPsu: false,
    msrp: 995,
    category: "firewall",
    keyFeatures: [
      "Ultra-compact fanless desktop branch security gateway",
      "300 Mbps IPS throughput with Cisco Talos threat intelligence",
      "Dual WAN Ethernet ports for dual-ISP failover",
      "Centralized cloud configuration and firmware pushes"
    ]
  },
  {
    vendor: "Meraki",
    model: "Meraki Z4C Teleworker Security Gateway",
    sku: "Z4C-HW",
    clients: 5,
    fwThroughput: "500 Mbps",
    ipsThroughput: "200 Mbps",
    vpnThroughput: "250 Mbps",
    wanPorts: "1x 1G WAN + 4x 1G LAN (1x PoE) + Cellular",
    dualPsu: false,
    msrp: 595,
    category: "cellular",
    keyFeatures: [
      "Dedicated gateway for remote security directors and operators",
      "Integrated cellular failover modem",
      "1x 802.3at PoE+ port to power a VoIP phone or security camera",
      "Zero-touch Auto VPN tunnel back to the physical security headend"
    ]
  },

  // ==========================================
  // ALLIED TELESIS AR-SERIES SECURE ROUTERS
  // ==========================================
  {
    vendor: "Allied Telesis",
    model: "Allied Telesis AR4050S Secure Enterprise Router",
    sku: "AT-AR4050S-10",
    clients: 500,
    fwThroughput: "500 Mbps",
    ipsThroughput: "250 Mbps",
    vpnThroughput: "250 Mbps",
    wanPorts: "2x 1G WAN + 6x 1G LAN",
    dualPsu: false,
    msrp: 1187,
    category: "firewall",
    keyFeatures: [
      "Enterprise Next-Gen secure VPN firewall router",
      "Deep packet inspection with application control and web filtering",
      "Autonomous Management Framework (AMF) node support",
      "BGP, OSPF, and hardware-accelerated IPsec encryption"
    ]
  },
  {
    vendor: "Allied Telesis",
    model: "Allied Telesis AR4050S-5G Cellular Router",
    sku: "AT-AR4050S-5G-10",
    clients: 500,
    fwThroughput: "500 Mbps",
    ipsThroughput: "250 Mbps",
    vpnThroughput: "250 Mbps",
    wanPorts: "1x 1G WAN + 6x 1G LAN + Embedded 5G Cellular",
    dualPsu: false,
    msrp: 2486,
    category: "cellular",
    keyFeatures: [
      "Integrated high-speed 5G Sub-6GHz cellular connectivity",
      "Failover between physical fiber/copper and 5G wireless",
      "IPsec & OpenVPN remote operator access",
      "Ruggedized design for industrial branches and substation perimeters"
    ]
  },
  {
    vendor: "Allied Telesis",
    model: "Allied Telesis AR3050S Branch Router",
    sku: "AT-AR3050S-10",
    clients: 200,
    fwThroughput: "250 Mbps",
    ipsThroughput: "100 Mbps",
    vpnThroughput: "100 Mbps",
    wanPorts: "2x 1G WAN + 6x 1G LAN",
    dualPsu: false,
    msrp: 922,
    category: "firewall",
    keyFeatures: [
      "Compact secure VPN router for branch offices and utility closets",
      "Hardware-based AES-256 encryption engine",
      "Stateful firewall inspection with NAT and QoS",
      "Managed via AlliedWare Plus CLI or Vista Manager"
    ]
  },
  {
    vendor: "Allied Telesis",
    model: "Allied Telesis AR2050V Compact Branch Gateway",
    sku: "AT-AR2050V-10",
    clients: 100,
    fwThroughput: "100 Mbps",
    ipsThroughput: "50 Mbps",
    vpnThroughput: "50 Mbps",
    wanPorts: "1x 1G WAN + 4x 1G LAN",
    dualPsu: false,
    msrp: 761,
    category: "firewall",
    keyFeatures: [
      "Cost-optimized branch security gateway",
      "Fanless silent operation",
      "Dynamic routing and VPN tunneling",
      "Supports AMF centralized zero-touch recovery"
    ]
  },

  // ==========================================
  // AMG SYSTEMS INDUSTRIAL & SPECIALTY
  // ==========================================
  {
    vendor: "AMG",
    model: "AMG 4G/LTE Industrial PoE Router (Dual SIM)",
    sku: "AMG750-1G-4GAT-104-P120",
    clients: 100,
    fwThroughput: "150 Mbps (Cat4 LTE)",
    ipsThroughput: "N/A",
    vpnThroughput: "100 Mbps",
    wanPorts: "1x 1G WAN + 4x PoE+ LAN + Dual SIM LTE + Wi-Fi",
    dualPsu: false,
    msrp: 1450,
    category: "cellular",
    keyFeatures: [
      "Hardened industrial DIN rail 4G LTE gateway (-40°C to +75°C)",
      "Dual SIM auto-failover between cellular carriers (AT&T/Verizon)",
      "4x 802.3at PoE+ ports (120W budget) to directly power cameras",
      "Direct 12-56VDC terminal block inputs for solar/battery systems"
    ]
  },
  {
    vendor: "AMG",
    model: "AMG Industrial NTP Network Time Server (1U)",
    sku: "AMG816-1F-RP-AD",
    clients: 10000,
    fwThroughput: "Sub-1ms GPS NTP",
    ipsThroughput: "N/A",
    vpnThroughput: "N/A",
    wanPorts: "1x 10/100 RJ45 + GPS Antenna Port",
    dualPsu: true,
    msrp: 2800,
    category: "specialty",
    keyFeatures: [
      "Stratum 1 GPS hardware master clock for air-gapped security VMS",
      "Guarantees legal admissibility of CCTV timestamps across systems",
      "Dual hot-swappable AC/DC redundant power supplies",
      "Eliminates reliance on external public internet NTP servers"
    ]
  },
  {
    vendor: "AMG",
    model: "AMG Extend-Net Ethernet Over Coax (30W PoE)",
    sku: "AMG160-1F-1EC",
    clients: 1,
    fwThroughput: "100 Mbps up to 1Km",
    ipsThroughput: "N/A",
    vpnThroughput: "N/A",
    wanPorts: "1x BNC Coax + 1x RJ45 PoE Out",
    dualPsu: false,
    msrp: 320,
    category: "specialty",
    keyFeatures: [
      "Transmits IP video and 30W PoE over legacy RG59/RG6 coaxial cable",
      "Reaches up to 1 km without requiring intermediate repeaters",
      "Eliminates the cost of pulling new Cat6 or fiber to retrofit cameras",
      "Plug-and-play installation with zero software setup required"
    ]
  }
);