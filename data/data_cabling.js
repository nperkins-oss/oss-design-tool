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
    {
      sku: "C6A-SLIM-1FT-BL",
      name: "Cat6A 28AWG Slim High-Density Patch Cord (1-Foot, Blue)",
      vendor: "Panduit",
      lengthFt: 1,
      msrp: 7.50
    },
    {
      sku: "C6A-SLIM-3FT-BL",
      name: "Cat6A 28AWG Slim High-Density Patch Cord (3-Foot, Blue)",
      vendor: "Panduit",
      lengthFt: 3,
      msrp: 8.50
    },
    {
      sku: "C6A-SLIM-7FT-BL",
      name: "Cat6A 28AWG Slim Patch Cord (7-Foot, Blue)",
      vendor: "Panduit",
      lengthFt: 7,
      msrp: 11.00
    }
  ],
  
  fiberBackbone: [
    {
      sku: "FIBER-OM4-6STRAND",
      name: "6-Strand OM4 Armored Indoor/Outdoor Pre-Term LC Fiber Trunk Assembly",
      vendor: "Corning / Panduit",
      medium: "mmf",
      speed: "10G/40G/100G",
      msrpPerFt: 1.85,
      baseTerminationMsrp: 180
    },
    {
      sku: "FIBER-OS2-12STRAND",
      name: "12-Strand OS2 Single-Mode Armored Pre-Term LC Fiber Trunk Assembly",
      vendor: "Corning / Panduit",
      medium: "smf",
      speed: "10G/25G/100G",
      msrpPerFt: 2.20,
      baseTerminationMsrp: 260
    }
  ],
};