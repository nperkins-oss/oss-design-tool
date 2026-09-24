// ==========================================
// DATA: ACCESSORIES, MEDIA CONVERTERS, MOUNTING & POWER SUPPLIES
// Standardized with explicit `type` classifications
// ==========================================

const ACCESSORY_DATABASE = [
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
    id: "unifi-uacc-poe-at",
    sku: "UACC-PoE-at",
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
    keyFeatures: [
      "1x GbE Data In + 1x GbE PoE Out",
      "48VDC @ 0.65A (30W Output)",
      "Integrated Grounding & Surge Protection"
    ]
  },
  {
    id: "unifi-uacc-poe-bt",
    sku: "UACC-PoE-bt-60",
    model: "UniFi PoE++ Midspan Injector (60W)",
    name: "UniFi PoE++ Midspan Injector (60W)",
    vendor: "UniFi",
    category: "power_injector",
    type: "poe_injector",
    mounting: "Wall",
    msrp: 35,
    description: "Multi-Gigabit 802.3bt (Type 3) power injector delivering up to 60W for multi-sensor panoramic cameras and 60GHz wireless backhaul radios.",
    baseWatts: 0,
    powerWatts: 60,
    keyFeatures: [
      "1x 2.5GbE Data In + 1x 2.5GbE PoE Out",
      "54VDC @ 1.2A (60W Output)",
      "802.3bt Type 3 Compliant"
    ]
  },
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
    keyFeatures: [
      "48VDC Output @ 2.5A (120W Max)",
      "Slim 40mm DIN-Rail Form Factor",
      "-20°C to +70°C Operating Temperature",
      "UL 508 (Industrial Control Equipment) Listed"
    ]
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
    keyFeatures: [
      "48VDC Output @ 5.0A (240W Max)",
      "High 88.5% Efficiency",
      "-20°C to +70°C Operating Temperature",
      "Overload, Over-Voltage & Thermal Protection"
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
    mounting: "Rack",
    rackUnits: 1,
    msrp: 342,
    description: "1U rack-mountable power distribution unit with 16 individually switchable and energy-monitored AC outlets and 4 USB-C power ports.",
    baseWatts: 15,
    powerWatts: 1875,
    keyFeatures: [
      "16x individually controllable 120V AC outlets (1875W total capacity)",
      "4x 5V USB-C ports for charging or powering peripheral equipment",
      "Per-outlet power metering and remote reboot over UniFi Network",
      "Integrated 1.3\" status touchscreen"
    ]
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
    description: "Outdoor weatherproof enclosure for the USW-Flex switch. Includes an internal 60W PoE adapter providing up to a 46W PoE budget.",
    baseWatts: 0,
    powerWatts: 60,
    keyFeatures: [
      "Weatherproof IPX5 enclosure for light poles and exterior walls",
      "Includes 60W internal power injector delivering 46W PoE output",
      "Tamper-resistant screw lock housing and cable management glands"
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
  }
];