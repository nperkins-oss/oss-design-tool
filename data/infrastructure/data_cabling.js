// ==========================================
// DATA: STRUCTURED CABLING, PANELS & CONNECTIVITY
// ==========================================

const CABLING_CATALOG = {
  bulkCable: [
    {
      sku: "C6A-CMP-1K-BL",
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
      sku: "C6A-OUTDOOR-1K",
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
      msrp: 68
    },
    {
      sku: "PP-2U-48P-MOD",
      name: "2U 48-Port High-Density Modular Keystone Patch Panel",
      vendor: "Panduit",
      ports: 48,
      rackUnits: 2,
      msrp: 115
    },
    {
      sku: "PP-BLANK-1U",
      name: "1U Metal Snap-in Blank Filler Panel",
      vendor: "Panduit",
      ports: 0,
      rackUnits: 1,
      msrp: 18
    }
  ],
  connectors: [
    {
      sku: "C6A-KEY-SLD-24",
      name: "Cat6A Shielded Toolless Keystone Jacks (Pack of 24)",
      vendor: "Panduit",
      standard: "Cat6A",
      packQty: 24,
      msrp: 145
    },
    {
      sku: "C6-KEY-UTP-24",
      name: "Cat6 Unshielded 90-Degree Keystone Jacks (Pack of 24)",
      vendor: "Panduit",
      standard: "Cat6",
      packQty: 24,
      msrp: 75
    },
    {
      sku: "C6A-FIELD-PLUG",
      name: "Cat6A Toolless Industrial Field-Term RJ45 Plug (10-Pack)",
      vendor: "Leviton",
      packQty: 10,
      msrp: 95
    }
  ],
  patchCords: [
    // Panduit 28AWG Slim High-Density Cat6A Patch Cords
    {
      sku: "C6A-SLIM-6IN-BL",
      name: "Cat6A 28AWG Slim High-Density Patch Cord (6-Inch / 0.5-Foot, Blue)",
      vendor: "Panduit",
      standard: "Cat6A",
      lengthFt: 0.5,
      lengthMeters: 0.15,
      msrp: 6.20
    },
    {
      sku: "C6A-SLIM-1FT-BL",
      name: "Cat6A 28AWG Slim High-Density Patch Cord (1-Foot, Blue)",
      vendor: "Panduit",
      standard: "Cat6A",
      lengthFt: 1,
      lengthMeters: 0.3,
      msrp: 7.50
    },
    {
      sku: "C6A-SLIM-2FT-BL",
      name: "Cat6A 28AWG Slim High-Density Patch Cord (2-Foot, Blue)",
      vendor: "Panduit",
      standard: "Cat6A",
      lengthFt: 2,
      lengthMeters: 0.6,
      msrp: 7.90
    },
    {
      sku: "C6A-SLIM-3FT-BL",
      name: "Cat6A 28AWG Slim High-Density Patch Cord (3-Foot, Blue)",
      vendor: "Panduit",
      standard: "Cat6A",
      lengthFt: 3,
      lengthMeters: 1.0,
      msrp: 8.50
    },
    {
      sku: "C6A-SLIM-5FT-BL",
      name: "Cat6A 28AWG Slim High-Density Patch Cord (5-Foot, Blue)",
      vendor: "Panduit",
      standard: "Cat6A",
      lengthFt: 5,
      lengthMeters: 1.5,
      msrp: 9.80
    },
    {
      sku: "C6A-SLIM-7FT-BL",
      name: "Cat6A 28AWG Slim Patch Cord (7-Foot, Blue)",
      vendor: "Panduit",
      standard: "Cat6A",
      lengthFt: 7,
      lengthMeters: 2.1,
      msrp: 11.00
    },
    {
      sku: "C6A-SLIM-10FT-BL",
      name: "Cat6A 28AWG Slim Patch Cord (10-Foot, Blue)",
      vendor: "Panduit",
      standard: "Cat6A",
      lengthFt: 10,
      lengthMeters: 3.0,
      msrp: 13.50
    },
    {
      sku: "C6A-SLIM-15FT-BL",
      name: "Cat6A 28AWG Slim Patch Cord (15-Foot, Blue)",
      vendor: "Panduit",
      standard: "Cat6A",
      lengthFt: 15,
      lengthMeters: 4.6,
      msrp: 16.50
    },
    {
      sku: "C6A-SLIM-25FT-BL",
      name: "Cat6A 28AWG Slim Patch Cord (25-Foot, Blue)",
      vendor: "Panduit",
      standard: "Cat6A",
      lengthFt: 25,
      lengthMeters: 7.6,
      msrp: 22.00
    },

    // UniFi Etherlighting™ Ultra-Thin RJ45 Patch Cords
    {
      sku: "UACC-Cable-Patch-EL-0.15M-W",
      name: "UniFi Etherlighting™ Ultra-Thin Patch Cable (0.15m / 6-Inch, White)",
      vendor: "UniFi",
      standard: "Cat6",
      etherlighting: true,
      lengthFt: 0.5,
      lengthMeters: 0.15,
      msrp: 4.50
    },
    {
      sku: "UACC-Cable-Patch-EL-0.3M-W",
      name: "UniFi Etherlighting™ Ultra-Thin Patch Cable (0.3m / 1-Foot, White)",
      vendor: "UniFi",
      standard: "Cat6",
      etherlighting: true,
      lengthFt: 1,
      lengthMeters: 0.3,
      msrp: 5.00
    },
    {
      sku: "UACC-Cable-Patch-EL-1M-W",
      name: "UniFi Etherlighting™ Ultra-Thin Patch Cable (1m / 3.3-Foot, White)",
      vendor: "UniFi",
      standard: "Cat6",
      etherlighting: true,
      lengthFt: 3.3,
      lengthMeters: 1.0,
      msrp: 6.50
    },
    {
      sku: "UACC-Cable-Patch-EL-2M-W",
      name: "UniFi Etherlighting™ Ultra-Thin Patch Cable (2m / 6.6-Foot, White)",
      vendor: "UniFi",
      standard: "Cat6",
      etherlighting: true,
      lengthFt: 6.6,
      lengthMeters: 2.0,
      msrp: 8.00
    },
    {
      sku: "UACC-Cable-Patch-EL-3M-W",
      name: "UniFi Etherlighting™ Ultra-Thin Patch Cable (3m / 9.8-Foot, White)",
      vendor: "UniFi",
      standard: "Cat6",
      etherlighting: true,
      lengthFt: 9.8,
      lengthMeters: 3.0,
      msrp: 9.50
    },
    {
      sku: "UACC-Cable-Patch-EL-5M-W",
      name: "UniFi Etherlighting™ Ultra-Thin Patch Cable (5m / 16.4-Foot, White)",
      vendor: "UniFi",
      standard: "Cat6",
      etherlighting: true,
      lengthFt: 16.4,
      lengthMeters: 5.0,
      msrp: 12.50
    },

    // Standard Snagless Molded RJ45 Patch Cords
    {
      sku: "C6-PATCH-1FT-BL",
      name: "Cat6 Snagless RJ45 Patch Cord (1-Foot, Blue)",
      vendor: "Superior Essex",
      standard: "Cat6",
      lengthFt: 1,
      lengthMeters: 0.3,
      msrp: 3.50
    },
    {
      sku: "C6-PATCH-3FT-BL",
      name: "Cat6 Snagless RJ45 Patch Cord (3-Foot, Blue)",
      vendor: "Superior Essex",
      standard: "Cat6",
      lengthFt: 3,
      lengthMeters: 1.0,
      msrp: 4.50
    },
    {
      sku: "C6-PATCH-5FT-BL",
      name: "Cat6 Snagless RJ45 Patch Cord (5-Foot, Blue)",
      vendor: "Superior Essex",
      standard: "Cat6",
      lengthFt: 5,
      lengthMeters: 1.5,
      msrp: 5.50
    },
    {
      sku: "C6-PATCH-7FT-BL",
      name: "Cat6 Snagless RJ45 Patch Cord (7-Foot, Blue)",
      vendor: "Superior Essex",
      standard: "Cat6",
      lengthFt: 7,
      lengthMeters: 2.1,
      msrp: 6.50
    },
    {
      sku: "C6-PATCH-10FT-BL",
      name: "Cat6 Snagless RJ45 Patch Cord (10-Foot, Blue)",
      vendor: "Superior Essex",
      standard: "Cat6",
      lengthFt: 10,
      lengthMeters: 3.0,
      msrp: 8.00
    },
    {
      sku: "C6-PATCH-15FT-BL",
      name: "Cat6 Snagless RJ45 Patch Cord (15-Foot, Blue)",
      vendor: "Superior Essex",
      standard: "Cat6",
      lengthFt: 15,
      lengthMeters: 4.6,
      msrp: 10.50
    },
    {
      sku: "C6-PATCH-25FT-BL",
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
      name: "24-Strand OS2 Single-Mode Armored Pre-Term LC Fiber Trunk Assembly",
      vendor: "Corning / Panduit",
      medium: "smf",
      strands: 24,
      speed: "10G/25G/100G",
      msrpPerFt: 4.10,
      baseTerminationMsrp: 420
    }
  ],
};