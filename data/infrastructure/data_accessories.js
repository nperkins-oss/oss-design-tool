// ==========================================
// DATA: ACCESSORIES, MEDIA CONVERTERS, MOUNTING & POWER SUPPLIES
// Standardized with explicit `type` classifications
// NetSelect Enterprise Architecture - Fully Calibrated
// ==========================================

const ACCESSORY_DATABASE = [
  // ==========================================
  // 1. INDUSTRIAL MEDIA CONVERTERS & BRIDGES
  // ==========================================
  {
    id: "amg-eoc-7501",
    sku: "AMG7501-1C-1E",
    model: "AMG Industrial Ethernet over Coax (EoC) Converter",
    name: "AMG Industrial Ethernet over Coax (EoC) Converter",
    vendor: "AMG",
    category: "media_converter",
    type: "media_converter",
    mounting: "DIN-Rail / Wall",
    msrp: 245,
    description: "Transmits 100Mbps Ethernet + PoE over legacy RG59/RG6 coaxial cable up to 1,000m (3,280ft). Eliminates the need to re-pull fiber or Cat6.",
    baseWatts: 5,
    powerWatts: 5,
    keyFeatures: [
      "1x 100Base-TX RJ45 + 1x 75Ω BNC Port",
      "Pass-through PoE to remote camera",
      "-40°C to +75°C Industrial Operating Temp",
      "DIN-Rail & Surface Mounting Brackets Included"
    ]
  },
  {
    id: "amg-sfp-conv-7111",
    sku: "AMG7111-1S-1C",
    model: "AMG Industrial 1G SFP Media Converter",
    name: "AMG Industrial 1G SFP Media Converter",
    vendor: "AMG",
    category: "media_converter",
    type: "media_converter",
    mounting: "DIN-Rail",
    msrp: 195,
    description: "Industrial grade 10/100/1000Base-TX to 100/1000Base-X SFP media converter. Designed for extreme temperature NEMA pole boxes.",
    baseWatts: 4,
    powerWatts: 4,
    keyFeatures: [
      "1x 1GbE RJ45 + 1x 1GbE SFP Slot",
      "12-48VDC Redundant Terminal Power Input",
      "-40°C to +75°C Industrial Operating Temp",
      "DIN-Rail Mountable"
    ]
  },
  {
    id: "amg-140-1gr",
    sku: "AMG140-1GR",
    model: "AMG Industrial Gigabit Media Converter",
    name: "AMG Industrial Gigabit Media Converter (-40°C to +75°C)",
    vendor: "AMG",
    category: "media_converter",
    type: "media_converter",
    mounting: "DIN-Rail / Wall",
    msrp: 185,
    description: "Hardened industrial grade 10/100/1000Base-T(x) to 100/1000Base-X SFP media converter. Features Link Fault Pass-Through (LFPT) and dual 12-48VDC inputs.",
    baseWatts: 3,
    powerWatts: 3,
    keyFeatures: [
      "1x 10/100/1000Base-T(x) RJ45 + 1x 100/1000Base-X SFP cage",
      "Link Fault Pass-Through (LFPT) for fast link loss notification",
      "-40°C to +75°C wide industrial operating temperature range",
      "Dual 12-48VDC redundant power inputs with reverse polarity protection"
    ]
  },
  {
    id: "amg-160-1f-1ec",
    sku: "AMG160-1F-1EC",
    model: "AMG Extend-Net Industrial Ethernet over Coax with PoE",
    name: "AMG Extend-Net Industrial EoC Transceiver (PoE Passthrough)",
    vendor: "AMG",
    category: "media_converter",
    type: "media_converter",
    mounting: "DIN-Rail / Wall",
    msrp: 235,
    description: "Industrial Ethernet and PoE over coaxial cable transceiver extending 100Mbps Ethernet + PoE up to 1,000m (3,280ft) over legacy RG59/RG6 cable.",
    baseWatts: 4,
    powerWatts: 4,
    keyFeatures: [
      "1x 10/100Base-TX RJ45 + 1x 75Ω BNC connector",
      "Pass-through IEEE 802.3af/at PoE to remote cameras",
      "-40°C to +75°C fanless hardened operation",
      "Plug-and-play installation without IP configuration"
    ]
  },
  {
    id: "amg-172-1g-1v",
    sku: "AMG172-1G-1V",
    model: "AMG Industrial Gigabit VDSL2 Long-Range Extender",
    name: "AMG Industrial Gigabit VDSL2 / 2-Wire Copper Extender",
    vendor: "AMG",
    category: "media_converter",
    type: "media_converter",
    mounting: "DIN-Rail / Wall",
    msrp: 275,
    description: "High-speed Gigabit Ethernet extender operating over single-pair twisted copper or 2-wire lines up to 3km (9,842ft) using advanced VDSL2 technology.",
    baseWatts: 5,
    powerWatts: 5,
    keyFeatures: [
      "1x 10/100/1000Base-T(x) RJ45 + 1x 2-wire terminal block / RJ11",
      "Up to 300Mbps aggregate bandwidth depending on wire gauge and distance",
      "-40°C to +75°C operating range for outdoor perimeter security",
      "DIP switches for Symmetric/Asymmetric and Master/Slave modes"
    ]
  },
  {
    id: "amg-210m-1g-1s",
    sku: "AMG210M-1G-1S",
    model: "AMG Micro Industrial Gigabit Media Converter",
    name: "AMG Micro Industrial Gigabit Media Converter (60x60mm)",
    vendor: "AMG",
    category: "media_converter",
    type: "media_converter",
    mounting: "DIN-Rail / Wall / Magnetic",
    msrp: 175,
    description: "Micro-sized hardened 10/100/1000Base-T(x) to 100/1000Base-X SFP media converter measuring just 60 x 60 x 25 mm. Ideal for camera backboxes.",
    baseWatts: 3,
    powerWatts: 3,
    keyFeatures: [
      "Ultra-mini 60x60x25mm form factor fits inside camera enclosures",
      "1x 1G RJ45 + 1x 100/1000M SFP slot",
      "-40°C to +75°C fanless operation",
      "12-48VDC terminal block power input"
    ]
  },
  {
    id: "amg-260m-1g-1s",
    sku: "AMG260M-1G-1S",
    model: "AMG Mini Industrial Gigabit Media Converter",
    name: "AMG Mini Industrial Gigabit Media Converter",
    vendor: "AMG",
    category: "media_converter",
    type: "media_converter",
    mounting: "DIN-Rail / Wall / Rack Blade",
    msrp: 210,
    description: "Miniature industrial media converter with hot-swap blade compatibility for AMG2036 1U chassis or standalone DIN rail mounting.",
    baseWatts: 4,
    powerWatts: 4,
    keyFeatures: [
      "Dual-use: Standalone DIN rail mount or hot-swappable in AMG2036 1U rack",
      "1x 10/100/1000Base-T(x) RJ45 + 1x 100/1000Base-X SFP slot",
      "-40°C to +75°C industrial operating temperature",
      "Link Fault Pass-Through (LFPT) and jumbo frame support"
    ]
  },
  {
    id: "amg-260m-1gbt-1s-p90",
    sku: "AMG260M-1GBT-1S-P90",
    model: "AMG Mini Industrial 90W PoE Media Converter",
    name: "AMG Mini Industrial 90W 802.3bt PoE Media Converter",
    vendor: "AMG",
    category: "media_converter",
    type: "media_converter",
    mounting: "DIN-Rail / Wall / Rack Blade",
    msrp: 320,
    description: "Miniature industrial media converter delivering up to 90W IEEE 802.3bt Type 4 PoE power over copper while linking over fiber SFP.",
    baseWatts: 5,
    powerWatts: 95,
    keyFeatures: [
      "Delivers up to 90W 802.3bt PoE power to PTZ cameras and perimeter sensors",
      "1x 1G RJ45 PoE + 1x 100/1000Base-X SFP slot",
      "-40°C to +75°C fanless passive cooling",
      "52-56VDC dual power inputs"
    ]
  },
  {
    id: "amg-265m-1g-1s",
    sku: "AMG265M-1G-1S",
    model: "AMG Mini AC-Powered Industrial Media Converter",
    name: "AMG Mini AC-Powered Industrial Media Converter (Direct Mains)",
    vendor: "AMG",
    category: "media_converter",
    type: "media_converter",
    mounting: "DIN-Rail / Wall",
    msrp: 245,
    description: "Compact industrial Gigabit media converter featuring an integrated 90-264VAC mains power supply eliminating the need for an external PSU.",
    baseWatts: 5,
    powerWatts: 5,
    keyFeatures: [
      "Direct 90-264VAC mains terminal input — no external power brick required",
      "1x 10/100/1000Base-T(x) RJ45 + 1x 100/1000Base-X SFP slot",
      "-40°C to +75°C fanless passive cooling",
      "Integrated surge and transient protection"
    ]
  },

  {
    id: "unifi-uacc-lre",
    sku: "UACC-LRE",
    model: "UniFi Long-Range Ethernet Repeater",
    name: "UniFi Long-Range Ethernet Repeater",
    vendor: "UniFi",
    category: "media_converter",
    type: "media_converter",
    mounting: "Wall / Pole / Outdoor",
    msrp: 29,
    description: "Gigabit PoE repeater extending Ethernet range up to 1 km (3,280 ft) by chaining repeaters. IPX6 weatherproof.",
    baseWatts: 1.5,
    powerWatts: 1.5,
    keyFeatures: [
      "Extends 10/100/1000 Mbps Ethernet link beyond 100m limit",
      "802.3af/at/bt PoE passthrough up to 43W",
      "IPX6 rated weatherproof housing",
      "10kA+ ESD and surge protection"
    ]
  },

  // ==========================================
  // 2. UNIFI POWER DISTRIBUTION & UPS (RACKMOUNT)
  // ==========================================
  {
    id: "unifi-usp-pdu-hd",
    sku: "USP-PDU-HD",
    model: "UniFi Power Distribution Hi-Density",
    name: "UniFi Power Distribution Hi-Density (28 Outlets)",
    vendor: "UniFi",
    category: "power_distribution",
    type: "power_distribution",
    mounting: "Rack (0U Vertical)",
    rackUnits: 0,
    msrp: 599,
    description: "High-density 0U vertical PDU with 28 individually metered and remote-controllable AC outlets and dual redundant utility inputs.",
    baseWatts: 25,
    powerWatts: 3840,
    heatBtuPerHour: 85,
    keyFeatures: [
      "28x individually controlled and metered NEMA 5-15R AC outlets",
      "Dual 120V AC utility inputs for automatic source transfer switching",
      "Per-outlet power usage analytics and remote power rebooting",
      "0U vertical mount optimized for 42U equipment racks"
    ]
  },
  {
    id: "unifi-usp-pdu-pro",
    sku: "USP-PDU-Pro",
    model: "UniFi SmartPower PDU Pro (16-Port Managed Power)",
    name: "UniFi SmartPower PDU Pro (16-Port Managed Power)",
    vendor: "UniFi",
    category: "power_distribution",
    type: "power_distribution",
    mounting: "Rack (2U)",
    rackUnits: 2,
    msrp: 349,
    description: "2U rack-mountable power distribution unit with 16 individually switchable and energy-monitored AC outlets and 4 USB-C power ports.",
    baseWatts: 15,
    powerWatts: 1875,
    heatBtuPerHour: 51,
    keyFeatures: [
      "16x individually controllable 120V AC outlets (1875W total capacity)",
      "4x 5V USB-C ports for charging or powering peripheral equipment",
      "Per-outlet power metering and remote reboot over UniFi Network",
      "Integrated 1.3-inch status touchscreen display"
    ]
  },
  {
    id: "unifi-ups-2u-pro",
    sku: "UPS-2U-Pro",
    model: "UniFi UPS 2U Pro (1500VA Online Double-Conversion)",
    name: "UniFi UPS 2U Pro (1500VA Online Double-Conversion)",
    vendor: "UniFi",
    category: "ups",
    type: "ups",
    mounting: "Rack (2U)",
    rackUnits: 2,
    msrp: 899,
    description: "2U enterprise online double-conversion UPS featuring LiFePO4 battery technology for long cycle life and zero transfer time power protection.",
    baseWatts: 45,
    powerWatts: 1350,
    heatBtuPerHour: 153,
    depthInches: 24.8,
    weightLbs: 48.5,
    keyFeatures: [
      "1500VA / 1350W pure sine wave online double-conversion topology",
      "Zero transfer time (0 ms) seamless utility-to-battery protection",
      "High-density Lithium Iron Phosphate (LiFePO4) battery chemistry",
      "Native UniFi Network integration with automatic graceful shutdown"
    ]
  },
  {
    id: "unifi-usw-mission-critical",
    sku: "USW-Mission-Critical",
    model: "UniFi Switch Mission Critical (PoE UPS)",
    name: "UniFi Switch Mission Critical (PoE UPS)",
    vendor: "UniFi",
    category: "ups",
    type: "ups",
    mounting: "Rack (1U)",
    rackUnits: 1,
    msrp: 999,
    description: "1U rack-mountable uninterruptible power supply switch with 368Wh internal battery, 4x PoE++ outputs, and 2x 120V AC backup outlets.",
    baseWatts: 20,
    powerWatts: 120,
    heatBtuPerHour: 68,
    keyFeatures: [
      "Internal 368Wh lithium-ion backup battery",
      "4x 802.3bt PoE++ output ports (up to 60W per port) to keep critical cameras running",
      "4x Gigabit Ethernet data ports and 2x 120V AC backup outlets",
      "Keeps core router, switches, and security cameras online through power outages"
    ]
  },
  {
    id: "unifi-usp-rps",
    sku: "USP-RPS",
    model: "UniFi SmartPower Redundant Power System",
    name: "UniFi SmartPower Redundant Power System",
    vendor: "UniFi",
    category: "power_supply",
    type: "power_supply",
    mounting: "Rack (1U)",
    rackUnits: 1,
    msrp: 399,
    description: "1U redundant power supply capable of backing up internal power failures on up to 6 UniFi switches and gateways simultaneously.",
    baseWatts: 25,
    powerWatts: 950,
    heatBtuPerHour: 85,
    keyFeatures: [
      "6x proprietary SmartPower DC output ports",
      "Zero interruption failover if an attached switch's internal PSU fails",
      "Supplies up to 950W of total DC power",
      "1.3-inch color touchscreen LCM management display"
    ]
  },
  {
    id: "unifi-usp-cable",
    sku: "USP-Cable",
    model: "UniFi SmartPower Cable (1.5m)",
    name: "UniFi SmartPower Cable (1.5m)",
    vendor: "UniFi",
    category: "power_cable",
    type: "accessory",
    mounting: "Chassis",
    msrp: 35,
    description: "1.5-meter heavy-gauge DC interconnect cable linking UniFi Pro and Enterprise switches to the USP-RPS redundant power system.",
    baseWatts: 0,
    powerWatts: 0
  },

  // ==========================================
  // 3. HOT-SWAPPABLE POWER SUPPLY MODULES
  // ==========================================
  {
    id: "unifi-uacc-psu-54v-1200w",
    sku: "UACC-PSU-54V-1200W",
    model: "UniFi Hot-Swappable Power Module (1,200W 54V)",
    name: "UniFi Hot-Swappable Power Module (1,200W 54V)",
    vendor: "UniFi",
    category: "power_supply",
    type: "power_supply",
    mounting: "Internal Bay",
    msrp: 299,
    description: "Hot-swappable 1,200W 54V AC/DC power supply module for UniFi Enterprise Campus switches (ECS-48-PoE) for full PoE++ 1,440W redundancy.",
    baseWatts: 0,
    powerWatts: 1200,
    keyFeatures: ["1,200W continuous DC output", "Hot-swappable tool-less sled insertion", "Enables full secondary PSU redundancy on ECS switches"]
  },
  {
    id: "unifi-uacc-psu-54v-600w",
    sku: "UACC-PSU-54V-600W",
    model: "UniFi Hot-Swappable Power Module (600W 54V)",
    name: "UniFi Hot-Swappable Power Module (600W 54V)",
    vendor: "UniFi",
    category: "power_supply",
    type: "power_supply",
    mounting: "Internal Bay",
    msrp: 199,
    description: "Hot-swappable 600W 54V AC/DC power supply module for UniFi Enterprise Campus switches (ECS-24-PoE, ECS-48S-PoE).",
    baseWatts: 0,
    powerWatts: 600,
    keyFeatures: ["600W continuous DC output", "Hot-swappable tool-less sled insertion"]
  },
  {
    id: "unifi-uacc-psu-12v-550w",
    sku: "UACC-PSU-12V-550W",
    model: "UniFi Hot-Swappable Power Module (550W 12V)",
    name: "UniFi Hot-Swappable Power Module (550W 12V)",
    vendor: "UniFi",
    category: "power_supply",
    type: "power_supply",
    mounting: "Internal Bay",
    msrp: 149,
    description: "Hot-swappable 550W 12V AC/DC power supply module for ECS-Core, ECS-Aggregation, and Enterprise Firewall Core appliances.",
    baseWatts: 0,
    powerWatts: 550
  },
  {
    id: "unifi-uacc-psu-12v-150w",
    sku: "UACC-PSU-12V-150W",
    model: "UniFi Hot-Swappable Power Module (150W 12V)",
    name: "UniFi Hot-Swappable Power Module (150W 12V)",
    vendor: "UniFi",
    category: "power_supply",
    type: "power_supply",
    mounting: "Internal Bay",
    msrp: 99,
    description: "Hot-swappable 150W 12V AC/DC power supply module for UniFi Enterprise Firewall (EFG).",
    baseWatts: 0,
    powerWatts: 150
  },
  {
    id: "unifi-uacc-adapter-210w",
    sku: "UACC-Adapter-210W",
    model: "UniFi 210W AC Power Adapter for USW-Ultra",
    name: "UniFi 210W AC Power Adapter for USW-Ultra",
    vendor: "UniFi",
    category: "power_supply",
    type: "power_supply",
    mounting: "Desktop / Wall",
    msrp: 89,
    description: "External 210W AC to 54V DC desktop power supply brick, upgrading the USW-Ultra switch to a 202W PoE budget.",
    baseWatts: 0,
    powerWatts: 210
  },
  {
    id: "unifi-uacc-adapter-60w",
    sku: "UACC-Adapter-60W",
    model: "UniFi 60W AC Power Adapter for USW-Ultra",
    name: "UniFi 60W AC Power Adapter for USW-Ultra",
    vendor: "UniFi",
    category: "power_supply",
    type: "power_supply",
    mounting: "Desktop / Wall",
    msrp: 39,
    description: "External 60W AC to 54V DC desktop power supply brick, providing a 52W PoE budget on USW-Ultra.",
    baseWatts: 0,
    powerWatts: 60
  },

  // ==========================================
  // 4. POE MIDSPAN ADAPTERS & INJECTORS
  // ==========================================
  {
    id: "unifi-uacc-poe-plus-plus-10g",
    sku: "UACC-PoE+++-10G",
    model: "UniFi 10G PoE+++ Midspan Injector (90W)",
    name: "UniFi 10G PoE+++ Midspan Injector (90W)",
    vendor: "UniFi",
    category: "power_injector",
    type: "poe_injector",
    mounting: "Wall / Desktop",
    msrp: 69,
    description: "Multi-Gigabit 10GbE 802.3bt Type 4 PoE injector delivering up to 90W for PTZ cameras and high-capacity wireless APs.",
    baseWatts: 0,
    powerWatts: 90,
    keyFeatures: ["1x 10GbE Data In + 1x 10GbE 90W PoE Out", "802.3bt Type 4 (90W) certified", "Integrated surge and ESD protection"]
  },
  {
    id: "unifi-uacc-poe-bt",
    sku: "U-PoE++",
    model: "UniFi PoE++ Midspan Injector (60W)",
    name: "UniFi PoE++ Midspan Injector (60W)",
    vendor: "UniFi",
    category: "power_injector",
    type: "poe_injector",
    mounting: "Wall",
    msrp: 35,
    description: "Gigabit 802.3bt (Type 3) power injector delivering up to 60W for multi-sensor cameras and 60GHz wireless backhaul radios.",
    baseWatts: 0,
    powerWatts: 60,
    keyFeatures: ["1x GbE Data In + 1x GbE PoE Out", "54VDC @ 1.2A (60W Output)", "802.3bt Type 3 Compliant"]
  },
  {
    id: "unifi-uacc-poe-at",
    sku: "U-PoE+",
    model: "UniFi PoE+ Midspan Injector (30W)",
    name: "UniFi PoE+ Midspan Injector (30W)",
    vendor: "UniFi",
    category: "power_injector",
    type: "poe_injector",
    mounting: "Wall",
    msrp: 19,
    description: "Gigabit 802.3at PoE+ midspan power injector delivering up to 30W. Suitable for standalone cameras, wireless links, or VoIP phones.",
    baseWatts: 0,
    powerWatts: 30,
    keyFeatures: ["1x GbE Data In + 1x GbE PoE Out", "48VDC @ 0.65A (30W Output)", "Integrated Grounding & Surge Protection"]
  },
  {
    id: "unifi-u-poe-af",
    sku: "U-PoE",
    model: "UniFi PoE Midspan Injector (15W)",
    name: "UniFi PoE Midspan Injector (15W)",
    vendor: "UniFi",
    category: "power_injector",
    type: "poe_injector",
    mounting: "Wall",
    msrp: 15,
    description: "Gigabit 802.3af PoE midspan power injector delivering up to 15W.",
    baseWatts: 0,
    powerWatts: 15
  },

  // ==========================================
  // 5. INDUSTRIAL DIN-RAIL POWER SUPPLIES
  // ==========================================
  {
    id: "meanwell-ndr-120-48",
    sku: "NDR-120-48",
    model: "Mean Well 120W Industrial DIN-Rail Power Supply",
    name: "Mean Well 120W Industrial DIN-Rail Power Supply",
    vendor: "Mean Well",
    category: "power_supply",
    type: "power_supply",
    mounting: "DIN-Rail",
    msrp: 58,
    description: "Universal 90-264VAC to 48VDC @ 2.5A industrial power supply. Ideal for powering DIN-rail PoE switches inside pole-mounted NEMA cabinets.",
    baseWatts: 0,
    powerWatts: 120,
    keyFeatures: ["48VDC Output @ 2.5A (120W Max)", "Slim 40mm DIN-Rail Form Factor", "-20°C to +70°C Operating Temperature"]
  },
  {
    id: "meanwell-ndr-240-48",
    sku: "NDR-240-48",
    model: "Mean Well 240W Industrial DIN-Rail Power Supply",
    name: "Mean Well 240W Industrial DIN-Rail Power Supply",
    vendor: "Mean Well",
    category: "power_supply",
    type: "power_supply",
    mounting: "DIN-Rail",
    msrp: 95,
    description: "High-capacity 240W 48VDC power supply for hardened field switches powering multiple high-draw PTZ cameras and illuminators.",
    baseWatts: 0,
    powerWatts: 240,
    keyFeatures: ["48VDC Output @ 5.0A (240W Max)", "High 88.5% Efficiency", "-20°C to +70°C Operating Temperature"]
  },

  // ==========================================
  // 6. RACKS, CABINETS & ENCLOSURES
  // ==========================================
  {
    id: "unifi-rack-42u-800-g",
    sku: "UACC-Rack-42U-800-G",
    model: "UniFi 42U Server Cabinet (800mm Depth, Glass Door)",
    name: "UniFi 42U Server Cabinet (800mm Depth, Glass Door)",
    vendor: "UniFi",
    category: "racks",
    type: "equipment_rack",
    mounting: "Floor",
    rackUnits: 42,
    depthInches: 31.5,
    msrp: 1499,
    description: "42U full-height server rack cabinet with tempered glass front door and integrated cable management.",
    keyFeatures: ["42U 19-inch EIA-310 compliant capacity", "800mm (31.5-inch) depth for deep enterprise switches and short-depth servers", "Tempered glass front door with key lock", "Removable locking side panels"]
  },
  {
    id: "unifi-rack-42u-1000-p",
    sku: "UACC-Rack-42U-1000-P",
    model: "UniFi 42U Server Cabinet (1000mm Depth, Perforated Door)",
    name: "UniFi 42U Server Cabinet (1000mm Depth, Perforated Door)",
    vendor: "UniFi",
    category: "racks",
    type: "equipment_rack",
    mounting: "Floor",
    rackUnits: 42,
    depthInches: 39.4,
    msrp: 1699,
    description: "42U full-depth datacenter server cabinet with high-airflow perforated doors front and rear.",
    keyFeatures: ["42U 19-inch EIA-310 capacity", "1,000mm (39.4-inch) extra-deep depth for high-density enterprise servers and storage", "75% open perforated airflow doors", "Integrated high-volume vertical cable management"]
  },
  {
    id: "unifi-rack-12u-wall-sw-g",
    sku: "UACC-Rack-12U-Wall-SW-G",
    model: "UniFi 12U Swing-Out Wall Cabinet (Glass Door)",
    name: "UniFi 12U Swing-Out Wall Cabinet (Glass Door)",
    vendor: "UniFi",
    category: "racks",
    type: "equipment_rack",
    mounting: "Wall",
    rackUnits: 12,
    depthInches: 23.6,
    msrp: 599,
    description: "12U dual-hinge swing-out wall-mount cabinet allowing full rear access to patch panels and switch cabling.",
    keyFeatures: ["12U capacity with dual-hinge rear swing-out design", "600mm (23.6-inch) depth accommodates full-depth switches and UPS units", "Locking front glass door and locking rear swing frame"]
  },
  {
    id: "unifi-rack-12u-wall-sw-p",
    sku: "UACC-Rack-12U-Wall-SW-P",
    model: "UniFi 12U Swing-Out Wall Cabinet (Perforated Door)",
    name: "UniFi 12U Swing-Out Wall Cabinet (Perforated Door)",
    vendor: "UniFi",
    category: "racks",
    type: "equipment_rack",
    mounting: "Wall",
    rackUnits: 12,
    depthInches: 23.6,
    msrp: 599,
    description: "12U dual-hinge swing-out wall cabinet with ventilated perforated front door for active equipment cooling."
  },
  {
    id: "unifi-u-rack-6u-tl",
    sku: "U-Rack-6U-TL",
    model: "UniFi 6U Toolless Mini Rack",
    name: "UniFi 6U Toolless Mini Rack",
    vendor: "UniFi",
    category: "racks",
    type: "equipment_rack",
    mounting: "Desktop / Floor",
    rackUnits: 6,
    depthInches: 18.1,
    msrp: 299,
    description: "6U open frame toolless equipment rack on lockable castors with 24-port blank patch panel included.",
    keyFeatures: ["6U tool-less cage nut free mounting", "Lockable smooth-rolling castor wheels and carry handles", "Built-in 24-port blank keystone patch panel"]
  },

  // ==========================================
  // 7. CABLE MANAGEMENT, RAILS, SHELVES & PANELS
  // ==========================================
  {
    id: "unifi-uacc-rack-rails-slide",
    sku: "UACC-Rack-Rails-Slide",
    model: "UniFi Sliding Rack Rails",
    name: "UniFi Sliding Rack Rails",
    vendor: "UniFi",
    category: "mounting",
    type: "accessory",
    mounting: "Rack",
    rackUnits: 1,
    msrp: 99,
    description: "Tool-less sliding rail kit for UniFi Enterprise switches, firewalls, and server appliances in 4-post racks."
  },
  {
    id: "unifi-uacc-rack-hcm",
    sku: "UACC-Rack-HCM",
    model: "UniFi 1U Horizontal Rack Cable Management",
    name: "UniFi 1U Horizontal Rack Cable Management",
    vendor: "UniFi",
    category: "cable_management",
    type: "accessory",
    mounting: "Rack",
    rackUnits: 1,
    msrp: 39,
    description: "1U horizontal rack cable manager with removable hinged cover and high-density passthrough fingers."
  },
  {
    id: "unifi-uacc-rack-42u-vcm",
    sku: "UACC-Rack-42U-VCM",
    model: "UniFi 42U Vertical Rack Cable Management",
    name: "UniFi 42U Vertical Rack Cable Management",
    vendor: "UniFi",
    category: "cable_management",
    type: "accessory",
    mounting: "Rack",
    rackUnits: 0,
    msrp: 149,
    description: "Full-height vertical cable management duct channel for 42U server cabinets."
  },
  {
    id: "unifi-uacc-rack-panel-ocd",
    sku: "UACC-Rack-Panel-OCD",
    model: "UniFi 1U Rack Mount OCD Blanking Panel",
    name: "UniFi 1U Rack Mount OCD Blanking Panel",
    vendor: "UniFi",
    category: "rack_panel",
    type: "accessory",
    mounting: "Rack",
    rackUnits: 1,
    msrp: 19,
    description: "1U silver powder-coated blanking panel matching the sleek industrial aesthetics of UniFi switches."
  },
  {
    id: "unifi-uacc-rack-panel-patch-blank-24",
    sku: "UACC-Rack-Panel-Patch-Blank-24",
    model: "UniFi 24-Port Blank Keystone Patch Panel",
    name: "UniFi 24-Port Blank Keystone Patch Panel",
    vendor: "UniFi",
    category: "patch_panel",
    type: "accessory",
    mounting: "Rack",
    rackUnits: 1,
    msrp: 29,
    description: "1U 24-port keystone patch panel with integrated rear cable management bar."
  },
  {
    id: "unifi-uacc-rack-shelf-fd",
    sku: "UACC-Rack-Shelf-FD",
    model: "UniFi 1U Full Depth Rack Shelf",
    name: "UniFi 1U Full Depth Rack Shelf",
    vendor: "UniFi",
    category: "shelf",
    type: "accessory",
    mounting: "Rack",
    rackUnits: 1,
    msrp: 79,
    description: "Heavy-duty vented 4-post rack shelf supporting up to 100 lbs of non-rackmount equipment."
  },
  {
    id: "unifi-uacc-rack-shelf-sd",
    sku: "UACC-Rack-Shelf-SD",
    model: "UniFi 1U Shallow Depth Rack Shelf",
    name: "UniFi 1U Shallow Depth Rack Shelf",
    vendor: "UniFi",
    category: "shelf",
    type: "accessory",
    mounting: "Rack",
    rackUnits: 1,
    msrp: 49,
    description: "Compact 2-post cantilever rack shelf ideal for shallow wall racks."
  },
  {
    id: "unifi-uacc-pro-max-16-rm",
    sku: "UACC-Pro-Max-16-RM",
    model: "UniFi Pro Max 16 Rack Mount Kit",
    name: "UniFi Pro Max 16 Rack Mount Kit",
    vendor: "UniFi",
    category: "mounting",
    type: "accessory",
    mounting: "Rack",
    rackUnits: 1,
    msrp: 29,
    description: "Custom 1U rackmount adapter shelf specifically contoured for the USW-Pro-Max-16 switch."
  },
  {
    id: "unifi-usw-flex-utility",
    sku: "USW-Flex-Utility",
    model: "UniFi Switch Flex Outdoor Weatherproof Enclosure",
    name: "UniFi Switch Flex Outdoor Weatherproof Enclosure",
    vendor: "UniFi",
    category: "outdoor_enclosure",
    type: "enclosure",
    mounting: "Pole / Wall",
    rackUnits: 0,
    msrp: 58,
    description: "Outdoor weatherproof enclosure for the USW-Flex switch. Includes an internal 60W PoE adapter delivering up to a 46W PoE budget.",
    baseWatts: 0,
    powerWatts: 60,
    keyFeatures: [
      "Weatherproof IPX5 enclosure for light poles and exterior walls",
      "Includes 60W internal power injector delivering 46W PoE output",
      "Tamper-resistant screw lock housing and cable management glands"
    ]
  },
  {
    id: "altelix-nf141208",
    sku: "NF141208",
    model: "Altelix 14x12x8 NEMA 4X Weatherproof Equipment Enclosure",
    name: "Altelix 14x12x8 NEMA 4X Weatherproof Equipment Enclosure",
    vendor: "Altelix",
    category: "outdoor_enclosure",
    type: "enclosure",
    mounting: "Pole / Wall",
    rackUnits: 0,
    msrp: 149,
    description: "Vented NEMA 4X / IP66 weatherproof fiberglass/polycarbonate enclosure with aluminum equipment mounting plate. Ideal for housing USW-Flex switches, fiber media converters, and surge suppressors outdoors.",
    baseWatts: 5,
    powerWatts: 5,
    keyFeatures: [
      "NEMA Type 4, 4X / IP66 rated for extreme outdoor weather resistance",
      "Finished aluminum equipment sub-plate for mounting switches and DIN rails",
      "Dual gasketed cable glands and lockable latch",
      "Universal pole and wall mount bracket included"
    ]
  },
  {
    id: "altronix-trove1wp1",
    sku: "Trove1WP1",
    model: "Altronix Trove1WP Outdoor NEMA 4/11 Security Enclosure",
    name: "Altronix Trove1WP Outdoor NEMA 4/11 Security Enclosure",
    vendor: "Altronix",
    category: "outdoor_enclosure",
    type: "enclosure",
    mounting: "Wall / Pole",
    rackUnits: 0,
    msrp: 289,
    description: "Outdoor weatherproof NEMA 4/11 rated access control & network power enclosure with customizable backplane. Houses access control boards, power supplies, and edge PoE switches like USW-Flex.",
    baseWatts: 0,
    powerWatts: 0,
    keyFeatures: [
      "NEMA 4 / IP66 rated weatherproof security cabinet",
      "Removable backplane for access controllers, power supplies, and network switches",
      "Accommodates up to two 12VDC/7AH batteries",
      "Cam lock and tamper switch included"
    ]
  },
  {
    id: "ubnt-eth-sp-g2",
    sku: "ETH-SP-G2",
    model: "Ubiquiti Outdoor Ethernet Surge Protector (Gen 2)",
    name: "Ubiquiti Outdoor Ethernet Surge Protector (Gen 2)",
    vendor: "UniFi",
    category: "surge_protector",
    type: "surge_protector",
    mounting: "Pole / Wall",
    msrp: 19,
    description: "Engineered to protect outdoor Ethernet devices from damaging electrostatic discharge (ESD) and surges up to 10kA.",
    baseWatts: 0,
    powerWatts: 0,
    keyFeatures: [
      "Protects exterior IP cameras and PtP wireless radios",
      "Low cost insurance against lightning strikes and ESD strikes",
      "Two passive RJ45 10/100/1000 ports with ground wire lead"
    ]
  },

  // ==========================================
  // 8. ENTERPRISE OPEN & ENCLOSED EQUIPMENT RACKS
  // ==========================================
  {
    id: "cpi-rack-45u-2post",
    sku: "CPI-55053-703",
    model: "CPI 45U Standard 2-Post Relay Rack (7-Foot, 19\" EIA)",
    name: "CPI 45U Standard 2-Post Relay Rack (7-Foot, 19\" EIA)",
    vendor: "Chatsworth",
    category: "racks",
    type: "equipment_rack",
    mounting: "Floor",
    rackUnits: 45,
    depthInches: 15.0,
    msrp: 389,
    description: "Industry-standard 45U 2-post aluminum open relay rack with double-sided universal 12-24 tapped hole pattern for MDF/IDF distribution.",
    keyFeatures: [
      "45U 19-inch EIA-310 compliant capacity (84\" high)",
      "High-strength extruded aluminum construction (1,000 lb static load rating)",
      "Integrated floor mounting holes and top cable runway brackets",
      "Double-sided 12-24 tapped holes on 5/8\"-5/8\"-1/2\" EIA universal spacing"
    ]
  },
  {
    id: "tripplite-srw12us-12u",
    sku: "SRW12US",
    model: "Tripp Lite 12U Wall-Mount Server Cabinet (Dual-Hinge)",
    name: "Tripp Lite 12U Wall-Mount Server Cabinet (Dual-Hinge)",
    vendor: "Tripp Lite",
    category: "racks",
    type: "equipment_rack",
    mounting: "Wall",
    rackUnits: 12,
    depthInches: 21.6,
    msrp: 429,
    description: "12U wall-mount server rack cabinet with dual-hinged swing design allowing easy rear access to patch cords and terminations.",
    keyFeatures: [
      "12U 19-inch EIA capacity with 20.5\" maximum equipment depth",
      "Dual-hinge chassis swings away from wall for full rear access",
      "Perforated locking front door and side panels for active airflow",
      "250 lb load rating for edge switches and network equipment"
    ]
  },
  {
    id: "middle-atlantic-dwr-18-26",
    sku: "DWR-18-26",
    model: "Middle Atlantic DWR 18U Wall Rack (26\" Deep, Dual Hinge)",
    name: "Middle Atlantic DWR 18U Wall Rack (26\" Deep, Dual Hinge)",
    vendor: "Middle Atlantic",
    category: "racks",
    type: "equipment_rack",
    mounting: "Wall",
    rackUnits: 18,
    depthInches: 26.0,
    msrp: 899,
    description: "18U heavy-duty dual-hinge sectional wall cabinet designed specifically for security headends, deeper switches, and NVRs.",
    keyFeatures: [
      "18U capacity accommodating deeper 24\" enterprise equipment",
      "Center sectional chassis swings open 90° for maintenance",
      "Solid steel construction supporting up to 300 lbs",
      "Laser knockouts for conduit and cable pass-throughs"
    ]
  },
  {
    id: "apc-netshelter-42u",
    sku: "AR3100",
    model: "APC NetShelter SX 42U Server Enclosure (1070mm Deep)",
    name: "APC NetShelter SX 42U Server Enclosure (1070mm Deep)",
    vendor: "APC",
    category: "racks",
    type: "equipment_rack",
    mounting: "Floor",
    rackUnits: 42,
    depthInches: 42.1,
    msrp: 1799,
    description: "World-standard 42U server enclosure optimized for high-density networking, storage, compute, and security headends.",
    keyFeatures: [
      "42U 19-inch EIA-310 capacity with massive 1070mm depth",
      "Perforated front and split-rear doors for maximum thermal management",
      "Toolless vertical zero-U PDU and cable mounting channels",
      "3,000 lb static / 2,250 lb dynamic load rating"
    ]
  },

  // ==========================================
  // 9. ENTERPRISE RACKMOUNT UPS POWER SYSTEMS
  // ==========================================
  {
    id: "apc-smt1500rm2uc",
    sku: "SMT1500RM2UC",
    model: "APC Smart-UPS 1500VA LCD 120V with SmartConnect (2U)",
    name: "APC Smart-UPS 1500VA LCD 120V with SmartConnect (2U)",
    vendor: "APC",
    category: "ups",
    type: "ups",
    mounting: "Rack (2U)",
    rackUnits: 2,
    msrp: 749,
    description: "2U rackmount line-interactive UPS delivering pure sine wave backup power for critical edge switches and access control panels.",
    baseWatts: 30,
    powerWatts: 1000,
    depthInches: 18.0,
    weightLbs: 58.6,
    keyFeatures: [
      "1440VA / 1000W Pure Sine Wave output (6x NEMA 5-15R outlets)",
      "Automated Voltage Regulation (AVR) protects against brownouts and surges",
      "APC SmartConnect cloud-enabled remote power monitoring",
      "Hot-swappable user-replaceable battery cartridges"
    ]
  },
  {
    id: "apc-smx3000rmlv2unc",
    sku: "SMX3000RMLV2UNC",
    model: "APC Smart-UPS X 3000VA Rack/Tower with Network Card (4U)",
    name: "APC Smart-UPS X 3000VA Rack/Tower with Network Card (4U)",
    vendor: "APC",
    category: "ups",
    type: "ups",
    mounting: "Rack (4U)",
    rackUnits: 4,
    msrp: 1999,
    description: "High-capacity 3000VA enterprise UPS with pre-installed Network Management Card for central MDF headends and multi-NVR racks.",
    baseWatts: 60,
    powerWatts: 2700,
    depthInches: 19.0,
    weightLbs: 85.0,
    keyFeatures: [
      "3000VA / 2700W high-density pure sine wave output",
      "Pre-installed AP9641 Gigabit Network Management Card",
      "Scalable runtime via external battery packs (SMX120BP)",
      "Switched outlet groups for non-critical load shedding"
    ]
  },
  {
    id: "tripplite-smart1500rmxl2ua",
    sku: "SMART1500RMXL2Ua",
    model: "Tripp Lite SmartPro 1500VA 2U Rackmount UPS",
    name: "Tripp Lite SmartPro 1500VA 2U Rackmount UPS",
    vendor: "Tripp Lite",
    category: "ups",
    type: "ups",
    mounting: "Rack (2U)",
    rackUnits: 2,
    msrp: 589,
    description: "2U expandable rackmount UPS providing 1500VA/1350W of battery backup for network closets and PoE switches.",
    baseWatts: 35,
    powerWatts: 1350,
    depthInches: 19.5,
    weightLbs: 47.0,
    keyFeatures: [
      "1500VA / 1350W output with 0.9 power factor",
      "External battery pack connector for extended runtime during long outages",
      "8x NEMA 5-15R outlets with 2 independently switchable banks",
      "Interactive LCD status screen"
    ]
  },

  // ==========================================
  // 10. PATHWAYS, J-HOOKS & CABLE SUPPORT
  // ==========================================
  {
    id: "erico-caddy-cat21hp",
    sku: "CAT21HP",
    model: "nVent CADDY Cat HP 1-5/16\" J-Hook",
    name: "nVent CADDY Cat HP 1-5/16\" J-Hook (50-Cable Capacity)",
    vendor: "CADDY",
    category: "pathways",
    type: "pathway",
    mounting: "Ceiling / Wall",
    rackUnits: 0,
    msrp: 4.50,
    description: "High-performance wide-base 1-5/16\" J-Hook engineered for Category 6A, fiber optic, and PoE structured cabling pathway support.",
    keyFeatures: [
      "Provides rounded bend radius compliance preventing cable pinch points",
      "Accommodates up to 50x 4-pair Cat6 or Cat6A cables",
      "TIA-569 and cULus listed pathway compliance",
      "Pre-galvanized finish with rounded burr-free edges"
    ]
  },
  {
    id: "erico-caddy-cat32hp-bat",
    sku: "CAT32HPBC200",
    model: "nVent CADDY Cat HP 2\" J-Hook with Beam Clamp",
    name: "nVent CADDY Cat HP 2\" J-Hook with Beam Clamp (90-Cable Capacity)",
    vendor: "CADDY",
    category: "pathways",
    type: "pathway",
    mounting: "Beam Clamp",
    rackUnits: 0,
    msrp: 6.20,
    description: "2\" J-hook with swivel beam clamp attaching directly to steel structural beams and bar joists without drilling.",
    keyFeatures: [
      "Supports up to 90x Cat6A horizontal network drops",
      "Rotates 360° for multi-directional pathway alignment",
      "Integral retainer strap keeps cables seated during pulling"
    ]
  },
  {
    id: "erico-caddy-cat64hp",
    sku: "CAT64HP",
    model: "nVent CADDY Cat HP 4\" High-Capacity J-Hook",
    name: "nVent CADDY Cat HP 4\" High-Capacity J-Hook (300-Cable Capacity)",
    vendor: "CADDY",
    category: "pathways",
    type: "pathway",
    mounting: "Ceiling / Wall",
    rackUnits: 0,
    msrp: 12.50,
    description: "Heavy-duty 4-inch extra-wide J-Hook supporting main trunk corridors and backbone bundles up to 300 cables.",
    keyFeatures: [
      "Accommodates up to 300x Cat6 cables or 200x shielded Cat6A cables",
      "Replaces expensive wire basket tray in secondary hallway corridors",
      "Heavy gauge galvanized steel with cable safety latch"
    ]
  },
  {
    id: "cablofil-cf54-300",
    sku: "CF54-300-EZ",
    model: "Legrand Cablofil 12\" W x 2\" D Wire Mesh Cable Tray (10-Foot)",
    name: "Legrand Cablofil 12\" W x 2\" D Wire Mesh Cable Tray (10-Foot)",
    vendor: "Legrand Cablofil",
    category: "pathways",
    type: "pathway",
    mounting: "Ceiling Trapeze / Wall",
    rackUnits: 0,
    msrp: 78.00,
    description: "10-foot section of 12-inch wide wire mesh cable tray for overhead MDF/IDF room cable management and distribution.",
    keyFeatures: [
      "Continuous steel wire mesh with safety-T welded edges",
      "Open airflow design dissipates PoE heat build-up",
      "Supports up to 600x Category 6A data drops per linear foot"
    ]
  },

  // ==========================================
  // AMG INDUSTRIAL POE INJECTORS & SPLITTERS
  // ==========================================
  {
    id: "amg-150-1gat-p30",
    sku: "AMG150-1GAT-P30",
    model: "AMG Industrial 1-Port Gigabit 30W PoE+ Injector",
    name: "AMG Industrial 1-Port Gigabit 30W PoE+ Injector DIN",
    vendor: "AMG",
    category: "power_distribution",
    type: "poe_injector",
    mounting: "DIN-Rail / Wall",
    msrp: 145,
    description: "Industrial DIN rail 1-port Gigabit 30W IEEE 802.3at PoE+ injector for powering IP cameras and access points in harsh outdoor enclosures.",
    baseWatts: 2,
    powerWatts: 34,
    keyFeatures: [
      "1x 1G Data In + 1x 1G Data & 30W PoE+ Out",
      "48-56VDC dual redundant terminal inputs",
      "-40°C to +75°C fanless passive cooling",
      "Integrated 6kV surge and ESD protection"
    ]
  },
  {
    id: "amg-150-1gbt-p90",
    sku: "AMG150-1GBT-P90",
    model: "AMG Industrial 1-Port Gigabit 90W 802.3bt PoE Injector",
    name: "AMG Industrial 1-Port Gigabit 90W 802.3bt PoE Injector DIN",
    vendor: "AMG",
    category: "power_distribution",
    type: "poe_injector",
    mounting: "DIN-Rail / Wall",
    msrp: 195,
    description: "Industrial DIN rail 1-port Gigabit 90W IEEE 802.3bt Type 4 PoE injector designed for high-power PTZ cameras, IR illuminators, and edge heaters.",
    baseWatts: 3,
    powerWatts: 95,
    keyFeatures: [
      "1x 1G Data In + 1x 1G Data & 90W 802.3bt PoE Out",
      "52-56VDC dual redundant terminal block power inputs",
      "-40°C to +75°C fanless passive cooling",
      "Hardware DIP switches for PoE standard and Legacy mode selection"
    ]
  },
  {
    id: "amg-150-1xbt-p90",
    sku: "AMG150-1XBT-P90",
    model: "AMG Industrial 1-Port 10G Multi-Gigabit 90W PoE Injector",
    name: "AMG Industrial 1-Port 10G Multi-Gigabit 90W PoE Injector DIN",
    vendor: "AMG",
    category: "power_distribution",
    type: "poe_injector",
    mounting: "DIN-Rail / Wall",
    msrp: 295,
    description: "Ultra high-speed 100M/1G/2.5G/5G/10GBase-T industrial 90W IEEE 802.3bt PoE injector for Multi-Gigabit Wi-Fi 7 APs and multi-sensor 4K camera arrays.",
    baseWatts: 5,
    powerWatts: 98,
    keyFeatures: [
      "1x 10G Data In + 1x 10G Data & 90W 802.3bt PoE Out (1/2.5/5/10Gbps)",
      "Supports latest Wi-Fi 6E/7 APs and Multi-Gigabit edge nodes",
      "-40°C to +75°C fanless operation",
      "Dual 52-56VDC terminal block inputs"
    ]
  },
  {
    id: "amg-150-2gbt-p180",
    sku: "AMG150-2GBT-P180",
    model: "AMG Industrial 2-Port Gigabit 90W PoE Injector (180W)",
    name: "AMG Industrial 2-Port Gigabit 90W 802.3bt PoE Injector DIN",
    vendor: "AMG",
    category: "power_distribution",
    type: "poe_injector",
    mounting: "DIN-Rail / Wall",
    msrp: 285,
    description: "Dual-channel industrial DIN rail Gigabit PoE injector providing up to 90W per port (180W total) for two high-draw edge devices.",
    baseWatts: 5,
    powerWatts: 190,
    keyFeatures: [
      "2x 1G Data In + 2x 1G Data & 90W 802.3bt PoE Out (180W total)",
      "Independent channel power isolation and surge protection",
      "-40°C to +75°C fanless passive cooling",
      "Dual 52-56VDC terminal inputs"
    ]
  },
  {
    id: "amg-150-4gat-p120",
    sku: "AMG150-4GAT-P120",
    model: "AMG Industrial 4-Port Gigabit 30W PoE+ Injector (120W)",
    name: "AMG Industrial 4-Port Gigabit 30W PoE+ Injector DIN",
    vendor: "AMG",
    category: "power_distribution",
    type: "poe_injector",
    mounting: "DIN-Rail / Wall",
    msrp: 345,
    description: "High-density 4-port industrial PoE+ injector hub providing 30W per port with 120W total budget on a single compact DIN rail footprint.",
    baseWatts: 6,
    powerWatts: 130,
    keyFeatures: [
      "4x 1G Data In + 4x 1G Data & 30W PoE+ Out (120W budget)",
      "Replaces multiple individual power injectors in pole cabinets",
      "-40°C to +75°C fanless passive cooling",
      "Dual 48-56VDC terminal inputs"
    ]
  },
  {
    id: "amg-150-8gat-p240",
    sku: "AMG150-8GAT-P240",
    model: "AMG Industrial 8-Port Gigabit 30W PoE+ Injector (240W)",
    name: "AMG Industrial 8-Port Gigabit 30W PoE+ Injector DIN",
    vendor: "AMG",
    category: "power_distribution",
    type: "poe_injector",
    mounting: "DIN-Rail / Wall",
    msrp: 495,
    description: "8-port industrial PoE+ injector hub providing 30W per port with 240W total power budget for edge surveillance headends.",
    baseWatts: 10,
    powerWatts: 255,
    keyFeatures: [
      "8x 1G Data In + 8x 1G Data & 30W PoE+ Out (240W budget)",
      "High density DIN mounting with dual DC power inputs",
      "-40°C to +75°C fanless operation",
      "Per-port LED status indicators and surge protection"
    ]
  },
  {
    id: "amg-150-1gbt-p90-lv",
    sku: "AMG150-1GBT-P90-LV",
    model: "AMG Industrial 1-Port 90W PoE Injector with 12-24VDC Boost",
    name: "AMG Industrial 90W PoE Injector (12-24VDC Low Voltage Boost)",
    vendor: "AMG",
    category: "power_distribution",
    type: "poe_injector",
    mounting: "DIN-Rail / Wall",
    msrp: 245,
    description: "Industrial 90W 802.3bt PoE injector with integrated step-up voltage converter boosting 9-36VDC / 20-60VDC vehicle or solar power to regulated 54VDC PoE.",
    baseWatts: 5,
    powerWatts: 98,
    keyFeatures: [
      "Integrated DC-to-DC boost circuit accepting 9-36VDC or 20-60VDC input",
      "Generates regulated 54VDC 90W 802.3bt PoE without separate power supply",
      "Essential for mobile surveillance trailers, solar poles, and transit vehicles",
      "-40°C to +75°C fanless passive cooling"
    ]
  },
  {
    id: "amg-155-1gat-p30",
    sku: "AMG155-1GAT-P30",
    model: "AMG Industrial 30W PoE+ Splitter (12/24VDC Out)",
    name: "AMG Industrial 30W PoE+ Splitter (12V/24VDC Regulated Output)",
    vendor: "AMG",
    category: "power_distribution",
    type: "poe_splitter",
    mounting: "DIN-Rail / Wall",
    msrp: 125,
    description: "Industrial DIN rail PoE+ splitter receiving 802.3at PoE power and splitting it into Gigabit Ethernet and selectable 12VDC or 24VDC output for non-PoE devices.",
    baseWatts: 1,
    powerWatts: 30,
    keyFeatures: [
      "Splits PoE+ into 1x 1G Ethernet + selectable 12VDC/24VDC terminal output",
      "Powers legacy non-PoE readers, sensors, and intercoms over standard Cat6",
      "-40°C to +75°C fanless operation",
      "Short-circuit and overload protection"
    ]
  },
  {
    id: "amg-156-1gbt-p90",
    sku: "AMG156-1GBT-P90",
    model: "AMG Industrial 90W 802.3bt PoE Splitter (12/24/48VDC Out)",
    name: "AMG Industrial 90W PoE Splitter (High-Power DC Output)",
    vendor: "AMG",
    category: "power_distribution",
    type: "poe_splitter",
    mounting: "DIN-Rail / Wall",
    msrp: 195,
    description: "Industrial 90W 802.3bt PoE splitter providing up to 80W of regulated 12V, 24V, or 48VDC power to non-PoE pan-tilt motors, heaters, and computing devices.",
    baseWatts: 2,
    powerWatts: 90,
    keyFeatures: [
      "Splits 90W 802.3bt PoE into 1G Ethernet + up to 80W DC power",
      "Selectable 12V, 24V, or 48VDC terminal block output",
      "-40°C to +75°C fanless passive cooling",
      "High EMI immunity for industrial automation"
    ]
  },

  // ==========================================
  // AMG INDUSTRIAL RACK CHASSIS & MOUNTING
  // ==========================================
  {
    id: "amg-2015-dr",
    sku: "AMG2015-DR",
    model: "AMG 19\\\" 3U DIN Rail Equipment Rackmount Shelf",
    name: "AMG 19\\\" 3U DIN Rail Equipment Rackmount Shelf",
    vendor: "AMG",
    category: "mounting",
    type: "rack_shelf",
    mounting: "Rack (3U)",
    rackUnits: 3,
    depthInches: 8.5,
    msrp: 260,
    description: "Heavy-duty 19-inch 3U rackmount shelf with integrated TS-35 DIN rail for installing DIN rail switches and power supplies into standard equipment racks.",
    keyFeatures: [
      "Integrated heavy-duty steel DIN rail (35mm standard)",
      "Recessed design allows ample space for cable bend radius and patch leads",
      "Rear cable tie-down points for organized loom management",
      "Rugged steel construction with durable powder coat finish"
    ]
  },
  {
    id: "amg-2031",
    sku: "AMG2031",
    model: "AMG 19\\\" 1U Shallow DIN Rail Rackmount Shelf",
    name: "AMG 19\\\" 1U Shallow DIN Rail Rackmount Shelf",
    vendor: "AMG",
    category: "mounting",
    type: "rack_shelf",
    mounting: "Rack (1U)",
    rackUnits: 1,
    depthInches: 5.5,
    msrp: 190,
    description: "Ultra-compact 1U 19-inch rackmount shelf with recessed DIN rail, designed for shallow wall-mount cabinets and telecom frames.",
    keyFeatures: [
      "1U height with recessed DIN rail saving vertical rack space",
      "Ultra-shallow 5.5\\\" depth fits standard 12\\\" wall cabinets",
      "Accommodates up to 3 AMG compact DIN switches or media converters",
      "Rigid steel chassis with cable management slots"
    ]
  },
  {
    id: "amg-2035",
    sku: "AMG2035",
    model: "AMG Universal Side Mounted Wall Bracket Adapter Kit",
    name: "AMG Universal Side Mounted Wall Bracket Adapter Kit",
    vendor: "AMG",
    category: "mounting",
    type: "wall_bracket",
    mounting: "Wall / Panel / DIN",
    rackUnits: 0,
    msrp: 35,
    description: "Side mounted wall bracket adapter kit for mounting AMG DIN rail switches and power supplies in depth-restricted enclosures and NEMA boxes.",
    keyFeatures: [
      "Rotates switch mounting by 90° to minimize depth in shallow enclosures",
      "Includes extension brackets to mount both a switch and DIN PSU together",
      "Anodized aluminum construction matching AMG industrial chassis",
      "Hardware kit includes all necessary mounting screws and clips"
    ]
  },
  {
    id: "amg-2036-rp-aa",
    sku: "AMG2036-RP-AA",
    model: "AMG 1U 18-Slot Blade Media Converter Chassis (Dual AC)",
    name: "AMG 1U 18-Slot Blade Media Converter Chassis (Dual AC)",
    vendor: "AMG",
    category: "mounting",
    type: "equipment_rack",
    mounting: "Rack (1U)",
    rackUnits: 1,
    depthInches: 12.0,
    msrp: 850,
    description: "Ultra high-density 1U 19-inch 18-slot rackmount blade chassis with dual redundant AC mains power supplies for AMG260B series blade media converters.",
    baseWatts: 30,
    powerWatts: 150,
    keyFeatures: [
      "Houses up to 18x AMG260B media converter blade cards in only 1U of rack space",
      "Dual hot-swappable redundant 100-240VAC power supplies",
      "Centralized power distribution eliminating individual power adapters",
      "Active fan cooling with smart speed control"
    ]
  },
  {
    id: "amg-mnt-mag-04",
    sku: "AMGMNT-MAG-04",
    model: "AMG Rear Heavy-Duty Magnetic Mounting Kit",
    name: "AMG Rear Heavy-Duty Magnetic Mounting Kit",
    vendor: "AMG",
    category: "mounting",
    type: "mounting",
    mounting: "Magnetic / Steel Enclosure",
    rackUnits: 0,
    msrp: 45,
    description: "4x rear-mounted heavy duty neodymium magnets and mounting plates for rapid tool-less attachment of AMG switches to steel cabinets.",
    keyFeatures: [
      "High-pull neodymium magnets secure devices firmly to steel backplanes",
      "Eliminates drilling or screw tapping into outdoor NEMA cabinets",
      "Rubberized magnet coating prevents cabinet scratch and corrosion",
      "Compatible with all AMG570, AMG560, and AMG350 series products"
    ]
  },
];

if (typeof window !== "undefined") {
  window.ACCESSORY_DATABASE = ACCESSORY_DATABASE;
}
