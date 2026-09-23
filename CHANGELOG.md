# Changelog

All notable changes to the **NetSelect Enterprise** network & physical security infrastructure sizing engine will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

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