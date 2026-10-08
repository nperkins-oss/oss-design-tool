// =========================================================================
// DATA: ENTERPRISE ACCESS CONTROL HARDWARE & DOOR CONTROLLERS
// NetSelect Enterprise Architecture
// =========================================================================

const ACCESS_CONTROL_DATABASE = [
  {
    id: "mercury-lp1502-poe-controller",
    vendor: "Mercury Security",
    model: "Mercury LP1502 PoE+ Intelligent Controller (2-Door)",
    sku: "LP1502-POE",
    role: "Access Control",
    category: "access_control",
    controllerType: "intelligent_controller",
    doorCapacity: 2,
    readerCapacity: 4,
    readerProtocols: ["OSDP v2 Secure Channel", "Wiegand"],
    powerSource: "poe_switch",
    poeStandard: "802.3at",
    powerConsumptionWatts: 25.5,
    strikeOutputPower: "12VDC @ 750mA per door lock output",
    auxiliaryInputs: 8,
    relayOutputs: 4,
    onboardDatabase: "250,000 Cardholders / 50,000 Audit Events",
    mounting: "Trove / DIN / Backplate",
    supportedEngines: ["Lenel OnGuard", "Software House C•CURE", "Genetec Synergis", "Avigilon Unity", "Gallagher"],
    msrp: 1450,
    taa: true,
    keyFeatures: [
      "Open-architecture intelligent controller supporting industry-standard OSDP v2 secure readers",
      "Direct PoE+ (802.3at) powered: supplies power to logic board and 2x 12VDC electric door strikes",
      "Native TLS 1.2/1.3 encrypted Ethernet communication to host Access Control Engine",
      "Hardware cryptographic engine ensuring tamper-proof credentials and key storage"
    ]
  },
  {
    id: "mercury-mr52-s3-subcontroller",
    vendor: "Mercury Security",
    model: "Mercury MR52-S3 Serial Door Sub-Controller (2-Door)",
    sku: "MR52-S3",
    role: "Access Control",
    category: "access_control",
    controllerType: "sub_controller",
    doorCapacity: 2,
    readerCapacity: 4,
    readerProtocols: ["OSDP v2", "Wiegand"],
    powerSource: "external_dc",
    powerConsumptionWatts: 15.0,
    voltageVdc: "12-24VDC",
    auxiliaryInputs: 8,
    relayOutputs: 6,
    mounting: "Trove / DIN / Backplate",
    supportedEngines: ["Lenel OnGuard", "Software House C•CURE", "Genetec Synergis", "Avigilon Unity"],
    msrp: 680,
    taa: true,
    keyFeatures: [
      "2-Door / 4-Reader expansion sub-controller connecting via multi-drop RS-485 to LP1502/LP2500 master",
      "High-security OSDP v2 encrypted reader channels eliminating card skimming vulnerabilities",
      "Heavy-duty 5A Form-C relays for high-inrush magnetic locks and electric panic hardware"
    ]
  },
  {
    id: "axis-a1001-network-controller",
    vendor: "Axis Communications",
    model: "Axis A1001 Network Door Controller (2-Door PoE)",
    sku: "0540-001",
    role: "Access Control",
    category: "access_control",
    controllerType: "edge_controller",
    doorCapacity: 2,
    readerCapacity: 2,
    readerProtocols: ["OSDP", "Wiegand"],
    powerSource: "poe_switch",
    poeStandard: "802.3at",
    powerConsumptionWatts: 25.0,
    strikeOutputPower: "12VDC or 24VDC Lock Power",
    auxiliaryInputs: 4,
    relayOutputs: 2,
    mounting: "Wall / Plenum / DIN",
    supportedEngines: ["Axis Camera Station Access", "Genetec Synergis", "Milestone XProtect Access"],
    msrp: 890,
    taa: true,
    keyFeatures: [
      "Native IP-to-the-door edge controller powered completely over 802.3at PoE+",
      "Direct VMS integration: links video camera recordings with door access badge events in real-time",
      "UL 294 Listed for commercial security and life safety integration",
      "Plenum-rated compact housing suitable for above-ceiling deployment right at the doorway"
    ]
  },
  {
    id: "hid-signo-40-smart-reader",
    vendor: "HID Global",
    model: "HID Signo 40 Smart Card Wallswitch Reader",
    sku: "40NKS-00-000000",
    role: "Access Control",
    category: "access_control",
    controllerType: "reader",
    doorCapacity: 1,
    readerProtocols: ["OSDP v2 Secure Channel", "Wiegand"],
    powerSource: "controller_dc",
    powerConsumptionWatts: 2.5,
    supportedCredentials: ["iCLASS Seos", "iCLASS", "Mifare DESFire EV2/EV3", "HID Mobile Access (BLE/NFC)"],
    mounting: "Single Gang Wallbox",
    ipRating: "IP65 Weatherproof",
    msrp: 320,
    taa: true,
    keyFeatures: [
      "Universal smart card & mobile credential reader supporting Bluetooth Low Energy (BLE) and NFC",
      "Bi-directional OSDP v2 Secure Channel encryption prevents man-in-the-middle sniffing",
      "Intelligent power management saves up to 43% power during standby periods",
      "Rugged polycarbonate enclosure rated IP65 for indoor or outdoor perimeter gates"
    ]
  }
];

if (typeof window !== "undefined") {
  window.ACCESS_CONTROL_DATABASE = ACCESS_CONTROL_DATABASE;
}
