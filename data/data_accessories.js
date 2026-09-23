// ==========================================
// ACCESSORIES, MEDIA CONVERTERS & POWER SUPPLIES
// ==========================================

const ACCESSORY_DATABASE = [
  {
    id: "amg-eoc-7501",
    sku: "AMG7501-1C-1E",
    model: "AMG Industrial Ethernet over Coax (EoC) Converter",
    vendor: "AMG",
    category: "media_converter",
    mounting: "DIN-Rail / Wall",
    msrp: 245,
    description: "Transmits 100Mbps Ethernet + PoE over legacy RG59/RG6 coaxial cable up to 1,000m (3,280ft). Eliminates the need to re-pull fiber or Cat6.",
    baseWatts: 5,
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
    vendor: "AMG",
    category: "media_converter",
    mounting: "DIN-Rail",
    msrp: 195,
    description: "Industrial grade 10/100/1000Base-TX to 100/1000Base-X SFP media converter. Designed for extreme temperature NEMA pole boxes.",
    baseWatts: 4,
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
    vendor: "UniFi",
    category: "power_injector",
    mounting: "Wall",
    msrp: 19,
    description: "Gigabit 802.3at PoE+ midspan power injector delivering up to 30W. Suitable for standalone cameras, wireless links, or VoIP phones.",
    baseWatts: 0,
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
    vendor: "UniFi",
    category: "power_injector",
    mounting: "Wall",
    msrp: 35,
    description: "Multi-Gigabit 802.3bt (Type 3) power injector delivering up to 60W for multi-sensor panoramic cameras and 60GHz wireless backhaul radios.",
    baseWatts: 0,
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
    vendor: "Mean Well",
    category: "din_psu",
    mounting: "DIN-Rail",
    msrp: 58,
    description: "Universal 90-264VAC to 48VDC @ 2.5A industrial power supply. Ideal for powering DIN-rail PoE switches inside pole-mounted NEMA cabinets.",
    baseWatts: 0,
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
    vendor: "Mean Well",
    category: "din_psu",
    mounting: "DIN-Rail",
    msrp: 95,
    description: "High-capacity 240W 48VDC power supply for hardened field switches powering multiple high-draw PTZ cameras and illuminators.",
    baseWatts: 0,
    keyFeatures: [
      "48VDC Output @ 5.0A (240W Max)",
      "High 88.5% Efficiency",
      "-20°C to +70°C Operating Temperature",
      "Overload, Over-Voltage & Thermal Protection"
    ]
  }
];