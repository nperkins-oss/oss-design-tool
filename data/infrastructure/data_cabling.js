// ==========================================
// DATA: STRUCTURED CABLING, PANELS & CONNECTIVITY
// ==========================================

const CABLING_CATALOG = {
  bulkCable: [
    {
      sku: "C6A-CMP-1K-BL",
      weightLbs: 28.0,
      depthInches: 14.0,
      name: "Cat6A F/UTP Plenum (CMP) Solid Bulk Cable (1,000 ft Spool Box)",
      vendor: "Superior Essex",
      rating: "CMP",
      standard: "Cat6A",
      ftPerBox: 1000,
      msrp: 410,
      color: "Blue",
      jacketType: "Plenum"
    },
    {
      sku: "C6A-CMR-1K-BL",
      weightLbs: 28.0,
      depthInches: 14.0,
      name: "Cat6A F/UTP Riser (CMR) Solid Bulk Cable (1,000 ft Spool Box)",
      vendor: "Superior Essex",
      rating: "CMR",
      standard: "Cat6A",
      ftPerBox: 1000,
      msrp: 340,
      color: "Blue",
      jacketType: "Riser"
    },
    {
      sku: "C6-CMP-1K-BL",
      weightLbs: 28.0,
      depthInches: 14.0,
      name: "Cat6 U/UTP Plenum (CMP) Solid Bulk Cable (1,000 ft Spool Box)",
      vendor: "Superior Essex",
      rating: "CMP",
      standard: "Cat6",
      ftPerBox: 1000,
      msrp: 290,
      color: "Blue",
      jacketType: "Plenum"
    },
    {
      sku: "C6A-CMP-1K-YL",
      weightLbs: 28.0,
      depthInches: 14.0,
      name: "Cat6A F/UTP Plenum (CMP) Solid Bulk Cable (1,000 ft Spool Box, Yellow)",
      vendor: "Superior Essex",
      rating: "CMP",
      standard: "Cat6A",
      ftPerBox: 1000,
      msrp: 410,
      color: "Yellow",
      jacketType: "Plenum"
    },
    {
      sku: "C6A-CMR-1K-YL",
      weightLbs: 28.0,
      depthInches: 14.0,
      name: "Cat6A F/UTP Riser (CMR) Solid Bulk Cable (1,000 ft Spool Box, Yellow)",
      vendor: "Superior Essex",
      rating: "CMR",
      standard: "Cat6A",
      ftPerBox: 1000,
      msrp: 340,
      color: "Yellow",
      jacketType: "Riser"
    },
    {
      sku: "C6-CMP-1K-YL",
      weightLbs: 28.0,
      depthInches: 14.0,
      name: "Cat6 U/UTP Plenum (CMP) Solid Bulk Cable (1,000 ft Spool Box, Yellow)",
      vendor: "Superior Essex",
      rating: "CMP",
      standard: "Cat6",
      ftPerBox: 1000,
      msrp: 290,
      color: "Yellow",
      jacketType: "Plenum"
    },
    {
      sku: "C6A-CMP-1K-GN",
      weightLbs: 28.0,
      depthInches: 14.0,
      name: "Cat6A F/UTP Plenum (CMP) Solid Bulk Cable (1,000 ft Spool Box, Green)",
      vendor: "Superior Essex",
      rating: "CMP",
      standard: "Cat6A",
      ftPerBox: 1000,
      msrp: 410,
      color: "Green",
      jacketType: "Plenum"
    },
    {
      sku: "C6A-CMP-1K-OR",
      weightLbs: 28.0,
      depthInches: 14.0,
      name: "Cat6A F/UTP Plenum (CMP) Solid Bulk Cable (1,000 ft Spool Box, Orange)",
      vendor: "Superior Essex",
      rating: "CMP",
      standard: "Cat6A",
      ftPerBox: 1000,
      msrp: 410,
      color: "Orange",
      jacketType: "Plenum"
    },
    {
      sku: "C6A-CMP-1K-VT",
      weightLbs: 28.0,
      depthInches: 14.0,
      name: "Cat6A F/UTP Plenum (CMP) Solid Bulk Cable (1,000 ft Spool Box, Violet/Purple)",
      vendor: "Superior Essex",
      rating: "CMP",
      standard: "Cat6A",
      ftPerBox: 1000,
      msrp: 410,
      color: "Purple",
      jacketType: "Plenum"
    },
    {
      sku: "C6A-CMP-1K-WH",
      weightLbs: 28.0,
      depthInches: 14.0,
      name: "Cat6A F/UTP Plenum (CMP) Solid Bulk Cable (1,000 ft Spool Box, White)",
      vendor: "Superior Essex",
      rating: "CMP",
      standard: "Cat6A",
      ftPerBox: 1000,
      msrp: 410,
      color: "White",
      jacketType: "Plenum"
    },
    {
      sku: "C6A-CMP-1K-GY",
      weightLbs: 28.0,
      depthInches: 14.0,
      name: "Cat6A F/UTP Plenum (CMP) Solid Bulk Cable (1,000 ft Spool Box, Gray)",
      vendor: "Superior Essex",
      rating: "CMP",
      standard: "Cat6A",
      ftPerBox: 1000,
      msrp: 410,
      color: "Gray",
      jacketType: "Plenum"
    },
    {
      sku: "C6A-CMP-1K-RD",
      weightLbs: 28.0,
      depthInches: 14.0,
      name: "Cat6A F/UTP Plenum (CMP) Solid Bulk Cable (1,000 ft Spool Box, Red)",
      vendor: "Superior Essex",
      rating: "CMP",
      standard: "Cat6A",
      ftPerBox: 1000,
      msrp: 410,
      color: "Red",
      jacketType: "Plenum"
    },
    {
      sku: "C6A-OUTDOOR-1K",
      weightLbs: 28.0,
      depthInches: 14.0,
      name: "Cat6A Shielded OSP Direct Burial / UV Outdoor Cable (1,000 ft Spool)",
      vendor: "Superior Essex",
      rating: "OSP",
      standard: "Cat6A",
      ftPerBox: 1000,
      msrp: 495,
      color: "Black",
      jacketType: "Outdoor / Direct Burial"
    },
    {
      sku: "AC-COMP-CMP-500",
      weightLbs: 28.0,
      depthInches: 14.0,
      name: "Access Control Composite Cable (4-Element Banana Cable, CMP Plenum, 500 ft Spool)",
      vendor: "Superior Essex / Belden",
      rating: "CMP",
      standard: "Access Composite (18/4 Lock, 22/4 Reader OAS, 22/2 Contact, 22/4 REX)",
      ftPerBox: 500,
      msrp: 460,
      color: "Yellow / Multi",
      jacketType: "Plenum Composite"
    },
    {
      sku: "AC-COMP-CMR-500",
      weightLbs: 28.0,
      depthInches: 14.0,
      name: "Access Control Composite Cable (4-Element Banana Cable, CMR Riser, 500 ft Spool)",
      vendor: "Superior Essex / Belden",
      rating: "CMR",
      standard: "Access Composite (18/4 Lock, 22/4 Reader OAS, 22/2 Contact, 22/4 REX)",
      ftPerBox: 500,
      msrp: 380,
      color: "Yellow / Multi",
      jacketType: "Riser Composite"
    },
    {
      sku: "LV-22-4-CMP-1K",
      weightLbs: 28.0,
      depthInches: 14.0,
      name: "22 AWG 4-Conductor Shielded OAS Low-Voltage Cable (CMP Plenum, 1,000 ft Spool)",
      vendor: "Superior Essex / Belden",
      rating: "CMP",
      standard: "22/4 Shielded OAS (OSDP / RS-485 / Readers)",
      ftPerBox: 1000,
      msrp: 210,
      color: "Gray",
      jacketType: "Plenum Shielded"
    },
    {
      sku: "LV-18-2-CMP-1K",
      weightLbs: 28.0,
      depthInches: 14.0,
      name: "18 AWG 2-Conductor Stranded Low-Voltage Lock Power Cable (CMP Plenum, 1,000 ft Spool)",
      vendor: "Superior Essex / Belden",
      rating: "CMP",
      standard: "18/2 Stranded (12VDC / 24VDC Lock Power)",
      ftPerBox: 1000,
      msrp: 190,
      color: "White",
      jacketType: "Plenum"
    },
    {
      sku: "LV-18-4-CMP-1K",
      weightLbs: 28.0,
      depthInches: 14.0,
      name: "18 AWG 4-Conductor Shielded Low-Voltage Cable (CMP Plenum, 1,000 ft Spool)",
      vendor: "Superior Essex / Belden",
      rating: "CMP",
      standard: "18/4 Shielded (Motorized Crash Bars / High Inrush Locks)",
      ftPerBox: 1000,
      msrp: 250,
      color: "White",
      jacketType: "Plenum Shielded"
    }
  ],
  patchPanels: [
    {
      sku: "PP-1U-24P-MOD",
      name: "1U 24-Port High-Density Modular Keystone Patch Panel",
      vendor: "Panduit",
      ports: 24,
      rackUnits: 1,
      weightLbs: 1.8,
      depthInches: 1.5,
      msrp: 68
    },
    {
      sku: "PP-2U-48P-MOD",
      name: "2U 48-Port High-Density Modular Keystone Patch Panel",
      vendor: "Panduit",
      ports: 48,
      rackUnits: 2,
      weightLbs: 3.2,
      depthInches: 1.5,
      msrp: 115
    },
    {
      sku: "PP-BLANK-1U",
      name: "1U Metal Snap-in Blank Filler Panel",
      vendor: "Panduit",
      ports: 0,
      rackUnits: 1,
      weightLbs: 0.5,
      depthInches: 0.5,
      msrp: 18
    }
  ],
  connectors: [
    {
      sku: "C6A-KEY-SLD-24",
      weightLbs: 0.85,
      depthInches: 1.2,
      name: "Cat6A Shielded Toolless Keystone Jacks (Pack of 24)",
      vendor: "Panduit",
      standard: "Cat6A",
      packQty: 24,
      msrp: 145
    },
    {
      sku: "C6-KEY-UTP-24",
      weightLbs: 0.85,
      depthInches: 1.2,
      name: "Cat6 Unshielded 90-Degree Keystone Jacks (Pack of 24)",
      vendor: "Panduit",
      standard: "Cat6",
      packQty: 24,
      msrp: 75
    },
    {
      sku: "C6A-FIELD-PLUG",
      weightLbs: 0.85,
      depthInches: 1.2,
      name: "Cat6A Toolless Industrial Field-Term RJ45 Plug (10-Pack)",
      vendor: "Leviton",
      packQty: 10,
      msrp: 95
    }
  ],
  patchCords: [
    // Panduit 28AWG Slim High-Density Cat6A Patch Cords (Yellow - Security Default)
    {
      sku: "C6A-SLIM-6IN-YL",
      weightLbs: 0.85,
      depthInches: 1.2,
      name: "Cat6A 28AWG Slim High-Density Patch Cord (6-Inch / 0.5-Foot, Yellow)",
      vendor: "Panduit",
      standard: "Cat6A",
      color: "Yellow",
      lengthFt: 0.5,
      lengthMeters: 0.15,
      msrp: 6.20
    },
    {
      sku: "C6A-SLIM-1FT-YL",
      weightLbs: 0.85,
      depthInches: 1.2,
      name: "Cat6A 28AWG Slim High-Density Patch Cord (1-Foot, Yellow)",
      vendor: "Panduit",
      standard: "Cat6A",
      color: "Yellow",
      lengthFt: 1,
      lengthMeters: 0.3,
      msrp: 7.50
    },
    {
      sku: "C6A-SLIM-2FT-YL",
      weightLbs: 0.85,
      depthInches: 1.2,
      name: "Cat6A 28AWG Slim High-Density Patch Cord (2-Foot, Yellow)",
      vendor: "Panduit",
      standard: "Cat6A",
      color: "Yellow",
      lengthFt: 2,
      lengthMeters: 0.6,
      msrp: 7.90
    },
    {
      sku: "C6A-SLIM-3FT-YL",
      weightLbs: 0.85,
      depthInches: 1.2,
      name: "Cat6A 28AWG Slim High-Density Patch Cord (3-Foot, Yellow)",
      vendor: "Panduit",
      standard: "Cat6A",
      color: "Yellow",
      lengthFt: 3,
      lengthMeters: 1.0,
      msrp: 8.50
    },
    {
      sku: "C6A-SLIM-5FT-YL",
      weightLbs: 0.85,
      depthInches: 1.2,
      name: "Cat6A 28AWG Slim High-Density Patch Cord (5-Foot, Yellow)",
      vendor: "Panduit",
      standard: "Cat6A",
      color: "Yellow",
      lengthFt: 5,
      lengthMeters: 1.5,
      msrp: 9.80
    },
    {
      sku: "C6A-SLIM-7FT-YL",
      weightLbs: 0.85,
      depthInches: 1.2,
      name: "Cat6A 28AWG Slim Patch Cord (7-Foot, Yellow)",
      vendor: "Panduit",
      standard: "Cat6A",
      color: "Yellow",
      lengthFt: 7,
      lengthMeters: 2.1,
      msrp: 11.00
    },
    {
      sku: "C6A-SLIM-10FT-YL",
      weightLbs: 0.85,
      depthInches: 1.2,
      name: "Cat6A 28AWG Slim Patch Cord (10-Foot, Yellow)",
      vendor: "Panduit",
      standard: "Cat6A",
      color: "Yellow",
      lengthFt: 10,
      lengthMeters: 3.0,
      msrp: 13.50
    },

    // Panduit 28AWG Slim High-Density Cat6A Patch Cords (Blue - Data)
    {
      sku: "C6A-SLIM-6IN-BL",
      weightLbs: 0.85,
      depthInches: 1.2,
      name: "Cat6A 28AWG Slim High-Density Patch Cord (6-Inch / 0.5-Foot, Blue)",
      vendor: "Panduit",
      standard: "Cat6A",
      color: "Blue",
      lengthFt: 0.5,
      lengthMeters: 0.15,
      msrp: 6.20
    },
    {
      sku: "C6A-SLIM-1FT-BL",
      weightLbs: 0.85,
      depthInches: 1.2,
      name: "Cat6A 28AWG Slim High-Density Patch Cord (1-Foot, Blue)",
      vendor: "Panduit",
      standard: "Cat6A",
      lengthFt: 1,
      lengthMeters: 0.3,
      msrp: 7.50
    },
    {
      sku: "C6A-SLIM-2FT-BL",
      weightLbs: 0.85,
      depthInches: 1.2,
      name: "Cat6A 28AWG Slim High-Density Patch Cord (2-Foot, Blue)",
      vendor: "Panduit",
      standard: "Cat6A",
      lengthFt: 2,
      lengthMeters: 0.6,
      msrp: 7.90
    },
    {
      sku: "C6A-SLIM-3FT-BL",
      weightLbs: 0.85,
      depthInches: 1.2,
      name: "Cat6A 28AWG Slim High-Density Patch Cord (3-Foot, Blue)",
      vendor: "Panduit",
      standard: "Cat6A",
      lengthFt: 3,
      lengthMeters: 1.0,
      msrp: 8.50
    },
    {
      sku: "C6A-SLIM-5FT-BL",
      weightLbs: 0.85,
      depthInches: 1.2,
      name: "Cat6A 28AWG Slim High-Density Patch Cord (5-Foot, Blue)",
      vendor: "Panduit",
      standard: "Cat6A",
      lengthFt: 5,
      lengthMeters: 1.5,
      msrp: 9.80
    },
    {
      sku: "C6A-SLIM-7FT-BL",
      weightLbs: 0.85,
      depthInches: 1.2,
      name: "Cat6A 28AWG Slim Patch Cord (7-Foot, Blue)",
      vendor: "Panduit",
      standard: "Cat6A",
      lengthFt: 7,
      lengthMeters: 2.1,
      msrp: 11.00
    },
    {
      sku: "C6A-SLIM-10FT-BL",
      weightLbs: 0.85,
      depthInches: 1.2,
      name: "Cat6A 28AWG Slim Patch Cord (10-Foot, Blue)",
      vendor: "Panduit",
      standard: "Cat6A",
      lengthFt: 10,
      lengthMeters: 3.0,
      msrp: 13.50
    },
    {
      sku: "C6A-SLIM-15FT-BL",
      weightLbs: 0.85,
      depthInches: 1.2,
      name: "Cat6A 28AWG Slim Patch Cord (15-Foot, Blue)",
      vendor: "Panduit",
      standard: "Cat6A",
      lengthFt: 15,
      lengthMeters: 4.6,
      msrp: 16.50
    },
    {
      sku: "C6A-SLIM-25FT-BL",
      weightLbs: 0.85,
      depthInches: 1.2,
      name: "Cat6A 28AWG Slim Patch Cord (25-Foot, Blue)",
      vendor: "Panduit",
      standard: "Cat6A",
      color: "Blue",
      lengthFt: 25,
      lengthMeters: 7.6,
      msrp: 22.00
    },

    // Panduit 28AWG Slim High-Density Cat6A Patch Cords (Green - Environmental/Audio)
    { sku: "C6A-SLIM-6IN-GN", name: "Cat6A 28AWG Slim Patch Cord (6-Inch, Green)", vendor: "Panduit", standard: "Cat6A", color: "Green", lengthFt: 0.5, lengthMeters: 0.15, msrp: 6.20 },
    { sku: "C6A-SLIM-1FT-GN", name: "Cat6A 28AWG Slim Patch Cord (1-Foot, Green)", vendor: "Panduit", standard: "Cat6A", color: "Green", lengthFt: 1, lengthMeters: 0.3, msrp: 7.50 },
    { sku: "C6A-SLIM-3FT-GN", name: "Cat6A 28AWG Slim Patch Cord (3-Foot, Green)", vendor: "Panduit", standard: "Cat6A", color: "Green", lengthFt: 3, lengthMeters: 1.0, msrp: 8.50 },
    { sku: "C6A-SLIM-7FT-GN", name: "Cat6A 28AWG Slim Patch Cord (7-Foot, Green)", vendor: "Panduit", standard: "Cat6A", color: "Green", lengthFt: 7, lengthMeters: 2.1, msrp: 11.00 },

    // Panduit 28AWG Slim High-Density Cat6A Patch Cords (Orange - Access Control / PoE+)
    { sku: "C6A-SLIM-6IN-OR", name: "Cat6A 28AWG Slim Patch Cord (6-Inch, Orange)", vendor: "Panduit", standard: "Cat6A", color: "Orange", lengthFt: 0.5, lengthMeters: 0.15, msrp: 6.20 },
    { sku: "C6A-SLIM-1FT-OR", name: "Cat6A 28AWG Slim Patch Cord (1-Foot, Orange)", vendor: "Panduit", standard: "Cat6A", color: "Orange", lengthFt: 1, lengthMeters: 0.3, msrp: 7.50 },
    { sku: "C6A-SLIM-3FT-OR", name: "Cat6A 28AWG Slim Patch Cord (3-Foot, Orange)", vendor: "Panduit", standard: "Cat6A", color: "Orange", lengthFt: 3, lengthMeters: 1.0, msrp: 8.50 },
    { sku: "C6A-SLIM-7FT-OR", name: "Cat6A 28AWG Slim Patch Cord (7-Foot, Orange)", vendor: "Panduit", standard: "Cat6A", color: "Orange", lengthFt: 7, lengthMeters: 2.1, msrp: 11.00 },

    // Panduit 28AWG Slim High-Density Cat6A Patch Cords (Violet/Purple - Intercom/AV)
    { sku: "C6A-SLIM-6IN-VT", name: "Cat6A 28AWG Slim Patch Cord (6-Inch, Purple)", vendor: "Panduit", standard: "Cat6A", color: "Purple", lengthFt: 0.5, lengthMeters: 0.15, msrp: 6.20 },
    { sku: "C6A-SLIM-1FT-VT", name: "Cat6A 28AWG Slim Patch Cord (1-Foot, Purple)", vendor: "Panduit", standard: "Cat6A", color: "Purple", lengthFt: 1, lengthMeters: 0.3, msrp: 7.50 },
    { sku: "C6A-SLIM-3FT-VT", name: "Cat6A 28AWG Slim Patch Cord (3-Foot, Purple)", vendor: "Panduit", standard: "Cat6A", color: "Purple", lengthFt: 3, lengthMeters: 1.0, msrp: 8.50 },
    { sku: "C6A-SLIM-7FT-VT", name: "Cat6A 28AWG Slim Patch Cord (7-Foot, Purple)", vendor: "Panduit", standard: "Cat6A", color: "Purple", lengthFt: 7, lengthMeters: 2.1, msrp: 11.00 },

    // Panduit 28AWG Slim High-Density Cat6A Patch Cords (White - Wireless / APs)
    { sku: "C6A-SLIM-6IN-WH", name: "Cat6A 28AWG Slim Patch Cord (6-Inch, White)", vendor: "Panduit", standard: "Cat6A", color: "White", lengthFt: 0.5, lengthMeters: 0.15, msrp: 6.20 },
    { sku: "C6A-SLIM-1FT-WH", name: "Cat6A 28AWG Slim Patch Cord (1-Foot, White)", vendor: "Panduit", standard: "Cat6A", color: "White", lengthFt: 1, lengthMeters: 0.3, msrp: 7.50 },
    { sku: "C6A-SLIM-3FT-WH", name: "Cat6A 28AWG Slim Patch Cord (3-Foot, White)", vendor: "Panduit", standard: "Cat6A", color: "White", lengthFt: 3, lengthMeters: 1.0, msrp: 8.50 },
    { sku: "C6A-SLIM-7FT-WH", name: "Cat6A 28AWG Slim Patch Cord (7-Foot, White)", vendor: "Panduit", standard: "Cat6A", color: "White", lengthFt: 7, lengthMeters: 2.1, msrp: 11.00 },

    // Panduit 28AWG Slim High-Density Cat6A Patch Cords (Red - Critical / Duress / Life Safety)
    { sku: "C6A-SLIM-6IN-RD", name: "Cat6A 28AWG Slim Patch Cord (6-Inch, Red)", vendor: "Panduit", standard: "Cat6A", color: "Red", lengthFt: 0.5, lengthMeters: 0.15, msrp: 6.20 },
    { sku: "C6A-SLIM-1FT-RD", name: "Cat6A 28AWG Slim Patch Cord (1-Foot, Red)", vendor: "Panduit", standard: "Cat6A", color: "Red", lengthFt: 1, lengthMeters: 0.3, msrp: 7.50 },
    { sku: "C6A-SLIM-3FT-RD", name: "Cat6A 28AWG Slim Patch Cord (3-Foot, Red)", vendor: "Panduit", standard: "Cat6A", color: "Red", lengthFt: 3, lengthMeters: 1.0, msrp: 8.50 },
    { sku: "C6A-SLIM-7FT-RD", name: "Cat6A 28AWG Slim Patch Cord (7-Foot, Red)", vendor: "Panduit", standard: "Cat6A", color: "Red", lengthFt: 7, lengthMeters: 2.1, msrp: 11.00 },

    // UniFi Etherlighting™ Ultra-Thin RJ45 Patch Cords
    {
      sku: "UACC-Cable-Patch-EL-0.15M-W",
      weightLbs: 0.15,
      depthInches: 1.2,
      name: "UniFi Etherlighting™ Ultra-Thin Patch Cable (0.15m / 6-Inch, White)",
      vendor: "UniFi",
      standard: "Cat6",
      etherlighting: true,
      lengthFt: 0.5,
      lengthMeters: 0.15,
      msrp: 4.50,
      datasheetPath: "Datasheets/Network/Ubiquiti/UniFi Etherlighting Patch Cable - Tech Specs.pdf"
    },
    {
      sku: "UACC-Cable-Patch-EL-0.3M-W",
      weightLbs: 0.15,
      depthInches: 1.2,
      name: "UniFi Etherlighting™ Ultra-Thin Patch Cable (0.3m / 1-Foot, White)",
      vendor: "UniFi",
      standard: "Cat6",
      etherlighting: true,
      lengthFt: 1,
      lengthMeters: 0.3,
      msrp: 5.00,
      datasheetPath: "Datasheets/Network/Ubiquiti/UniFi Etherlighting Patch Cable - Tech Specs.pdf"
    },
    {
      sku: "UACC-Cable-Patch-EL-1M-W",
      weightLbs: 0.15,
      depthInches: 1.2,
      name: "UniFi Etherlighting™ Ultra-Thin Patch Cable (1m / 3.3-Foot, White)",
      vendor: "UniFi",
      standard: "Cat6",
      etherlighting: true,
      lengthFt: 3.3,
      lengthMeters: 1.0,
      msrp: 6.50,
      datasheetPath: "Datasheets/Network/Ubiquiti/UniFi Etherlighting Patch Cable - Tech Specs.pdf"
    },
    {
      sku: "UACC-Cable-Patch-EL-2M-W",
      weightLbs: 0.15,
      depthInches: 1.2,
      name: "UniFi Etherlighting™ Ultra-Thin Patch Cable (2m / 6.6-Foot, White)",
      vendor: "UniFi",
      standard: "Cat6",
      etherlighting: true,
      lengthFt: 6.6,
      lengthMeters: 2.0,
      msrp: 8.00,
      datasheetPath: "Datasheets/Network/Ubiquiti/UniFi Etherlighting Patch Cable - Tech Specs.pdf"
    },
    {
      sku: "UACC-Cable-Patch-EL-3M-W",
      weightLbs: 0.15,
      depthInches: 1.2,
      name: "UniFi Etherlighting™ Ultra-Thin Patch Cable (3m / 9.8-Foot, White)",
      vendor: "UniFi",
      standard: "Cat6",
      etherlighting: true,
      lengthFt: 9.8,
      lengthMeters: 3.0,
      msrp: 9.50,
      datasheetPath: "Datasheets/Network/Ubiquiti/UniFi Etherlighting Patch Cable - Tech Specs.pdf"
    },
    {
      sku: "UACC-Cable-Patch-EL-5M-W",
      weightLbs: 0.15,
      depthInches: 1.2,
      name: "UniFi Etherlighting™ Ultra-Thin Patch Cable (5m / 16.4-Foot, White)",
      vendor: "UniFi",
      standard: "Cat6",
      etherlighting: true,
      lengthFt: 16.4,
      lengthMeters: 5.0,
      msrp: 12.50,
      datasheetPath: "Datasheets/Network/Ubiquiti/UniFi Etherlighting Patch Cable - Tech Specs.pdf"
    },

    // Standard Snagless Molded RJ45 Patch Cords
    {
      sku: "C6-PATCH-1FT-BL",
      weightLbs: 0.85,
      depthInches: 1.2,
      name: "Cat6 Snagless RJ45 Patch Cord (1-Foot, Blue)",
      vendor: "Superior Essex",
      standard: "Cat6",
      lengthFt: 1,
      lengthMeters: 0.3,
      msrp: 3.50
    },
    {
      sku: "C6-PATCH-3FT-BL",
      weightLbs: 0.85,
      depthInches: 1.2,
      name: "Cat6 Snagless RJ45 Patch Cord (3-Foot, Blue)",
      vendor: "Superior Essex",
      standard: "Cat6",
      lengthFt: 3,
      lengthMeters: 1.0,
      msrp: 4.50
    },
    {
      sku: "C6-PATCH-5FT-BL",
      weightLbs: 0.85,
      depthInches: 1.2,
      name: "Cat6 Snagless RJ45 Patch Cord (5-Foot, Blue)",
      vendor: "Superior Essex",
      standard: "Cat6",
      lengthFt: 5,
      lengthMeters: 1.5,
      msrp: 5.50
    },
    {
      sku: "C6-PATCH-7FT-BL",
      weightLbs: 0.85,
      depthInches: 1.2,
      name: "Cat6 Snagless RJ45 Patch Cord (7-Foot, Blue)",
      vendor: "Superior Essex",
      standard: "Cat6",
      lengthFt: 7,
      lengthMeters: 2.1,
      msrp: 6.50
    },
    {
      sku: "C6-PATCH-10FT-BL",
      weightLbs: 0.85,
      depthInches: 1.2,
      name: "Cat6 Snagless RJ45 Patch Cord (10-Foot, Blue)",
      vendor: "Superior Essex",
      standard: "Cat6",
      lengthFt: 10,
      lengthMeters: 3.0,
      msrp: 8.00
    },
    {
      sku: "C6-PATCH-15FT-BL",
      weightLbs: 0.85,
      depthInches: 1.2,
      name: "Cat6 Snagless RJ45 Patch Cord (15-Foot, Blue)",
      vendor: "Superior Essex",
      standard: "Cat6",
      lengthFt: 15,
      lengthMeters: 4.6,
      msrp: 10.50
    },
    {
      sku: "C6-PATCH-25FT-BL",
      weightLbs: 0.85,
      depthInches: 1.2,
      name: "Cat6 Snagless RJ45 Patch Cord (25-Foot, Blue)",
      vendor: "Superior Essex",
      standard: "Cat6",
      lengthFt: 25,
      lengthMeters: 7.6,
      msrp: 14.00
    }
  ],
  
  fiberBackbone: [
    {
      sku: "FIBER-OM4-6STRAND",
      weightLbs: 0.85,
      depthInches: 1.2,
      name: "6-Strand OM4 Armored Indoor/Outdoor Pre-Term LC Fiber Trunk Assembly",
      vendor: "Corning / Panduit",
      medium: "mmf",
      strands: 6,
      speed: "10G/40G/100G",
      msrpPerFt: 1.85,
      baseTerminationMsrp: 180
    },
    {
      sku: "FIBER-OM4-12STRAND",
      weightLbs: 0.85,
      depthInches: 1.2,
      name: "12-Strand OM4 Armored Indoor/Outdoor Pre-Term LC Fiber Trunk Assembly",
      vendor: "Corning / Panduit",
      medium: "mmf",
      strands: 12,
      speed: "10G/40G/100G",
      msrpPerFt: 2.45,
      baseTerminationMsrp: 240
    },
    {
      sku: "FIBER-OM4-24STRAND",
      weightLbs: 0.85,
      depthInches: 1.2,
      name: "24-Strand OM4 Armored Indoor/Outdoor Pre-Term LC Fiber Trunk Assembly",
      vendor: "Corning / Panduit",
      medium: "mmf",
      strands: 24,
      speed: "10G/40G/100G",
      msrpPerFt: 3.85,
      baseTerminationMsrp: 360
    },
    {
      sku: "FIBER-OS2-6STRAND",
      weightLbs: 0.85,
      depthInches: 1.2,
      name: "6-Strand OS2 Single-Mode Armored Pre-Term LC Fiber Trunk Assembly",
      vendor: "Corning / Panduit",
      medium: "smf",
      strands: 6,
      speed: "10G/25G/100G",
      msrpPerFt: 1.95,
      baseTerminationMsrp: 200
    },
    {
      sku: "FIBER-OS2-12STRAND",
      weightLbs: 0.85,
      depthInches: 1.2,
      name: "12-Strand OS2 Single-Mode Armored Pre-Term LC Fiber Trunk Assembly",
      vendor: "Corning / Panduit",
      medium: "smf",
      strands: 12,
      speed: "10G/25G/100G",
      msrpPerFt: 2.60,
      baseTerminationMsrp: 280
    },
    {
      sku: "FIBER-OS2-24STRAND",
      weightLbs: 0.85,
      depthInches: 1.2,
      name: "24-Strand OS2 Single-Mode Armored Pre-Term LC Fiber Trunk Assembly",
      vendor: "Corning / Panduit",
      medium: "smf",
      strands: 24,
      speed: "10G/25G/100G",
      msrpPerFt: 4.10,
      baseTerminationMsrp: 420
    }
  ]
};

if (typeof window !== "undefined") {
  window.CABLING_CATALOG = CABLING_CATALOG;
}
if (typeof module !== "undefined") {
  module.exports = { CABLING_CATALOG };
}