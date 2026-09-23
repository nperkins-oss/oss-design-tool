# Changelog

All notable changes to the **NetSelect Enterprise** network & physical security infrastructure sizing engine will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

You are completely right. The canvas engine, facility floorplan layout, and topology rendering subsystem received critical updates during this sprint that were completely left out of that draft.

Here is the updated, all-inclusive changelog reflecting the topology canvas, facility layouts, and UI engine changes alongside the data catalog calibrations.

Complete Changelog for v0.6.0-alpha
Markdown
# Release v0.6.0-alpha

## Summary
Comprehensive enterprise system update encompassing canvas engine enhancements, facility layout & spatial floorplan tools, topology link rendering fixes, full catalog datasheet calibrations, unified schema alignment, and critical runtime syntax repair.

---

### 1. Topology Canvas & Facility Layout Engine
* **Interactive Topology Canvas**:
  * Enhanced multi-tier link aggregation rendering between Core, Aggregation, Access, and Wireless bridge tiers.
  * Improved node dragging, hierarchical auto-layout recalculation, and dynamic port link status visualization.
  * Synchronized canvas device states directly with the dynamic Quote BOM and hardware port sizer.
* **Physical Layout & Facility Floorplan**:
  * Enhanced spatial placement tools for MDF/IDF closets, exterior pole mounts, and wireless PtP/PtMP path alignments.
  * Implemented scale-aware distance calculations between nodes, tie-ins to structured cabling run-length estimates, and rack elevation slotting.
  * Refined floorplan layer rendering to prevent device overlapping and drop-target misalignment.

---

### 2. Catalog Restoration & Schema Standardization
* **Unified Data Schema**:
  * Standardized all equipment records across vendors to support: `id`, `vendor`, `model`, `sku`, `role`, `ports`, `poeBudget`, `baseWatts`, `maxPowerWatts`, `depthInches`, `shallowDepth`, `fanless`, `acousticNoiseDb`, `operatingTempMinC`, `operatingTempMaxC`, and `mounting`.
  * Enforced true shallow-depth constraint ($\le 12.0''$) to safeguard wall-cabinet rail clearances.
* **Ubiquiti UniFi (`data_unifi.js`)**:
  * Restored 18 missing access switches previously truncated from the catalog (Pro Max, Enterprise, Standard, Flex 2.5G, Mission Critical, and Dream Wall).
  * Calibrated physical dimensions (e.g., `USW-48-PoE` and `USW-24-PoE` at shallow 11.2" and 7.9" depths).
  * Validated full PoE budgets, 802.3bt Type 3/4 support, and Etherlighting™ tags.
* **Ruckus CommScope (`data_ruckus.js`)**:
  * Restored the 3 missing models dropped during initial updates: `ICX8200-48NP2`, `ICX8200-24ZP`, and `ICX7550-48P`.
  * Corrected physical interface totals across the ICX line (accounting for 4x/8x 25G and 100G uplinks).
  * Mapped `RPS23-E` redundant PSU SKUs across all modular chassis to enable BOM redundant power supply calculations.
* **Allied Telesis (`data_allied.js`)**:
  * Calibrated access and hardened industrial switches (`x530`, `x530L`, `GS980EM`, `IE340`, `IE220`).
  * Added dedicated 1U fiber aggregation workhorse: `AT-x530-28SPXx` (24x SFP + 4x 10G SFP+) to resolve missing distribution capacity in the Core/Agg view.
* **AMG Systems (`data_amg.js`)**:
  * Calibrated interface counts on `AMG570-4GBT-4G-3S` (11 ports) and `AMG570-16GAT-8S` (24 ports).
  * Verified true shallow depth metrics on the 1U rackmount line (11.0" depth) and DIN units (4.5"–6.2").
  * Confirmed industrial operating boundaries (-40°C to +75°C fanless) and dual DC terminal power inputs.
* **Juniper Networks (`data_juniper.js`)**:
  * Corrected port math on `EX4100-H-12MP` (8 copper downlinks + 4 SFP+ uplinks/VC).
  * Calibrated chassis depths, confirming `EX4100-F-24P` (11.8") and `EX4100-F-12P` (10.2") as shallow-depth compliant.
  * Verified Virtual Chassis 100G stacking and EVPN-VXLAN campus fabric tags.
* **Cisco Meraki & Catalyst-M (`data_meraki.js` & `data_firewalls.js`)**:
  * Fixed chassis depth on `C9300LM-48UX-4Y-M` and `C9300LM-24U-4Y-M` from 11.8" to true 13.2" (removing incorrect shallow-depth flags).
  * Corrected `MS390-24UX` physical depth to 20.2".
  * Added missing `psuSku` mappings (`PWR-C1-1100WAC-P-M` / `PWR-C1-715WAC-P-M`) so secondary redundant PSU checkboxes render in the UI.
  * Added the outdoor IP67 `MG51-HW` 5G cellular gateway.
* **Wireless Backhaul & PtP (`data_wireless.js`)**:
  * Audited 60 GHz / 70–80 GHz platforms (Wave, airFiber 60 XR, Siklu Terragraph, Siklu EtherHaul, Cambium cnWave).
  * Added the UniFi Building Bridge pair (`UBB`) and airMAX NanoBeam 5AC Gen2 (`NBE-5AC-Gen2`).
  * Injected schema fallbacks (`distanceKm`, `rangeKm`, `distanceMiles`, `rangeMiles`, `throughputGbps`, `architecture`, `topology`) resolving distance display, calculator inputs, and card headers.

---

### 3. Structured Cabling, Interconnects & Accessories
* **Structured Cabling (`data_cabling.js`)**:
  * Verified Cat6/Cat6A bulk spools (CMP/CMR/OSP), modular keystone panels, toolless plugs, and armored pre-term fiber trunks (OM4/OS2).
* **Interconnects & Stacking (`data_interconnects.js`)**:
  * Added Cisco StackPower cables (`CAB-SPWR-30CM`, `CAB-SPWR-150CM`).
  * Added missing Cisco Meraki internal power supplies (`PWR-C1-1100WAC-P-M`, `PWR-C1-715WAC-P-M`, `MA-PWR-1100WAC`).
  * Verified multi-vendor DACs and optics cross-matrix lookup table.
* **Accessories (`data_accessories.js`)**:
  * Added `USP-PDU-Pro` (16-port managed 1U PDU).
  * Added `USW-Flex-Utility` (outdoor weatherproof enclosure with integrated 60W PoE injector).
  * Added `ETH-SP-G2` (outdoor in-line lightning and ESD surge arrestor).
  * Added `U-POE-++` (60W 802.3bt Gigabit PoE injector).
  * Added Mean Well industrial DIN-rail power supplies (`NDR-120-48`, `NDR-240-48`).

---

### 4. Critical Syntax & Runtime Fixes
* **`data_firewalls.js`**: Fixed 3 missing commas between gateway objects (`UXG-Enterprise`, `UDM-SE`, `UDM-Beast`, and `UDM-Pro-Max`) that threw `Uncaught SyntaxError: Unexpected token '{'`.
* **`data_cabling.js`**: Fixed fatal missing comma following the `patchCords` array on line 124 that crashed the browser JavaScript engine.

---

### 5. Known Issues
* **Wireless Card Power Display Fallback**: In the Wireless PtP/PtMP catalog view, radio power draw and PoE standards fall back to displaying `24 W (802.3at)` across cards due to card template property mapping in the UI rendering script. The underlying dataset contains verified per-model power metrics (`maxPowerWatts` / `poeStandardsSupported`); a template update is slated for v0.6.1-alpha.

## [0.5.0-alpha] - 2026-09-23

### Added
- **Accessories & Infrastructure Category (`data_accessories.js`):** Support for PoE midspan injectors, DIN-rail power supplies, and Ethernet-over-Coax (EoC) converters.
- **Dual-Homed Uplink / LAG Architecture:** Native 1x single vs. 2x LACP bundles in both the BOM sizing engine and interactive topology canvas.
- **Multi-Device PoE Sizer:** Dedicated inputs for 802.3af (15.4W), 802.3at (30W), 802.3bt Type 3 (60W), and 802.3bt Type 4 (90W) with selectable safety headroom margins (+15% to +30%).
- **Hardware Stacking Distinctions:** Physical dedicated stacking cables (Cisco StackWise, Juniper Virtual Chassis, Ruckus ICX QSFP) are now formally isolated from standard intra-rack DACs.
- **Topology Pre-Assignment Dropdowns:** Catalog cards now allow selecting target room/cabinet placement prior to adding to quote.

### Changed
- Converted Topology Canvas coordinate system to a scrollable surface with bounds checking to prevent card collapse.
- Reorganized `data_interconnects.js` with normalized medium definitions (`dac`, `stacking`, `mmf`, `smf`).
- Defaulted Direct Attach Copper (DAC) interconnects to 1x cable and optical transceivers to 2x (transceiver pair).

### Fixed
- Resolved `undefined` throughput and distance metrics on wireless PtP cards.
- Fixed string normalization for 60 GHz carrier filter matching.
- Restored missing chassis feature filters (hardware stacking, multi-gig, shallow depth, dual PSU).

---

## [0.4.0-alpha] - 2026-09-15

### Added
- **Interactive Topology Canvas (`js/topology.js`):** Freeform spatial layout of network nodes with live SVG vector interconnects and amber PoE path overlays.
- **Hierarchical Auto-Routing:** Algorithm to connect access switches to root cores/firewalls and route wireless master/remote link pairs.
- **Per-Device Uplink Sizing:** Automatic detection of DAC vs. Fiber pairs based on closet proximity and switch interface line rates.

---

## [0.3.0-alpha] - 2026-08-28

### Added
- **Rack Elevation Visualizer (`js/rack.js`):** Visual 12U to 48U rack builder with unit collision detection, depth compliance checking, and BTU/load estimations.
- **UPS Runtime Advisor:** Battery backup VA recommendations based on cumulative PoE and chassis base wattage.
- **Field / DIN Exclusion:** Non-rack equipment (pole radios, DIN power supplies) routed to separate cabinet enclosures.

---

## [0.2.0-alpha] - 2026-08-10

### Added
- **Cloud Licensing Compliance Engine:** Automated audit for Cisco Meraki mandatory cloud subscriptions with one-click bulk license remediations.
- **Global Term Management:** 1YR, 3YR, 5YR, 7YR, and 10YR multi-year term selectors with per-device overriding.
- **Local Quote Persistence:** Snapshot saving/loading via `localStorage` and full project JSON import/export.

---

## [0.1.0-alpha] - Initial Prototype

### Added
- Base product databases for UniFi, Ruckus, Meraki, Juniper, AMG Systems, and Allied Telesis.
- Side-by-side spec comparison matrix (up to 4 models).
- Basic Bill of Materials drawer with CSV export and clipboard copy.