# Changelog

All notable changes to the **NetSelect Enterprise** network & physical security infrastructure sizing engine will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.10.4-alpha] - 2026-09-24

### Added
- **Enclosure & Rack Inspection in Topology (`js/tools/topology.js`)**:
  - **Click-to-Inspect Racks**: Clicking on any location cluster header (MDF, IDF, Pole, Wallbox) selects the enclosure and opens a comprehensive Enclosure Telemetry drawer.
  - **Physical Space & Thermal Audit**: Live calculation and rendering of vertical rack space occupancy (occupied RU vs total cabinet height with progress bar), total chassis power draw (Watts), thermal dissipation (BTU/hr), and total PoE sourcing capacity vs delivered load.
  - **Mounted Chassis Inventory**: Complete list of hardware installed inside the selected cabinet with 1-click inspection navigation directly to individual equipment cards.
  - **Seamless 2D Elevation Integration (`openRackViewerFor`)**: Direct 1-click action button in the rack inspector to launch the 2D Rack Elevation Visualizer scoped to that exact cabinet.
- **In-Viewport Location & Enclosure Reassignment (`js/tools/topology.js`)**:
  - **Direct Location Reassignment**: Every equipment inspector card (Switches, Servers, Wireless Bridges, Edge Devices) now includes an interactive **Assigned Rack / Enclosure** dropdown, enabling instantaneous location changes directly within the viewport.
  - **Dynamic Topology Realignment**: Reassigning a device immediately updates the cluster hierarchy, recalculates power and logical links, and smoothly pans to the target cluster without leaving the canvas.
- **Topology Canvas Usability & Navigation Overhaul (`js/tools/topology.js` & `index.html`)**:
  - **Expanded Canvas Dimensions**: Canvas enlarged to $4500\text{px} \times 2800\text{px}$ in a wide-aspect modal ($99\text{vw} \times 96\text{vh}$) providing massive room for large multi-building layouts.
  - **Click-and-Drag Canvas Panning**: Native mouse background dragging with grab/grabbing cursors and Ctrl/Meta-wheel zooming ($40\%$ to $200\%$).
  - **Quick Jump Navigator (`topologyQuickJump`)**: Categorized dropdown navigator in the toolbar jumping instantly to any Rack, Core switch, Access switch, Compute server, or Wireless Bridge.
  - **1-Click Fit to Screen (`fitTopologyToScreen`)**: Automatically calculates bounding boxes of all clusters and centers the network at optimal zoom accounting for inspector width.
  - **Collapsible Inspector Controls**: Inspector drawer can be collapsed to maximize viewport width, with an accessible floating reopen button.

### Fixed
- **Switch Internal Power Supply Modes (`js/engines/port_engine.js` & `js/tools/topology.js`)**:
  - Added `internal_psu` and `dual_ac` modes to `POWER_SOURCE_MODES` (`drawsFromSwitch: false`).
  - Switches, Gateways, and Servers now correctly display "Internal AC" or "Dual AC PSU" rather than erroneously inheriting "PoE from Switch".
- **Remote Wireless Radio Link Bleed**:
  - Removed erroneous cross-campus fallback in `generateTopologyLinks` that drew copper PoE links to MDF switches for remote exterior radios. Remote radios now exclusively establish RF bridge links and hand off only to local switches or explicit assignments.
- **Reverse Uplink on Pole Deployments**:
  - Access switches located in remote closures or exterior poles now automatically recognize local wireless bridge stations as their network uplink when no Core switch is co-located.
- **Default Interconnect LAG Multiplier**:
  - Normalized inter-closet switch trunk multiplier to default to `1x Link` instead of forcing `2x LAG`, giving users explicit control over LAG trunking via the inspector.

---

## [0.10.3-alpha] - 2026-09-24

### Added
- **Physical Port Engine & Interface Provisioning (`js/engines/port_engine.js`)**:
  - **Discrete Port Tracking**: Accurate tracking of individual switch ports (1G/2.5G/10G RJ45, 10G/25G SFP+, 40G/100G QSFP28) with per-port PoE capabilities (802.3af 15.4W, 802.3at 30W, 802.3bt 60W/90W).
  - **Automatic Port Allocation & Interfacing**: Automatically provisions client interfaces for IP cameras, door controllers, wireless bridge stations, and compute servers upon BOM additions or topology reassignment.
  - **Interactive 24/48-Port Switch Faceplate Grid**: Slide-out topology inspector displays a realistic switch port matrix with color-coded live port telemetry (Green = PoE active, Blue = Uplink trunk, Amber = Data-only, Gray = Free).
  - **Port Level Telemetry & Recalculation**: Live calculation of connected device IDs, allocated power draw, negotiated speeds, and aggregate switch PoE consumption.
- **Hierarchical Facility & Enclosure Engine (`js/core/facility.js`)**:
  - **Multi-Tier Spatial Modeling**: Structured hierarchy spanning Campus / Floors $\rightarrow$ Functional Spaces (MDF, IDF, Pole / Exterior, Wallbox) $\rightarrow$ Enclosures (19" Free-Standing Rack, Wall Cabinet, NEMA 4X Weatherproof Enclosure, DIN Rail).
  - **Facility Hierarchy Manager Modal (`facilityModal`)**: Interactive management modal accessible from top navigation bar with floor elevation rise tracking, space type badges, and enclosure management.
  - **Real-Time Thermal & Energy Rollups (`getLocationTelemetry`)**: Calculates equipment count, total power draw (Watts), total PoE output, total rack units (RU) occupied, and thermal dissipation (BTU/hr) per enclosure and space.
  - **100% Backward Compatibility**: Seamless normalization and string serialization preserving legacy closet and rack references across BOM, rack elevation, and physical layout tools.
- **Complex Uplink Logic & Field Topologies (`js/tools/topology.js`)**:
  - **Decoupled Power vs Dataflow Direction**: Supports non-hierarchical deployments where power and data flow in opposite directions (e.g. pole-mounted industrial switch powers a P2P wireless radio station via PoE, but the radio acts as the switch's uplink gateway to the network core).
  - **Peer Switch Cascades & Ring Topologies**: Support for access-to-access switch trunks and daisy-chain topology links alongside traditional Gateway $\rightarrow$ Core/Agg $\rightarrow$ Access trees.
  - **Paired Wireless Bridge Links**: Visual rendering of wireless RF bridge interconnects between Master and Station radio pairs with dedicated handoff and uplink roles.
- **Power Source Overrides on Topology Canvas (`js/tools/topology.js`)**:
  - **Independent Power Delivery Modes**: Dedicated configuration for `poe_switch` (Switch PSE), `poe_injector` (Midspan Injector), `dedicated_dc` (Pole/Cabinet DC Power Supply), `dedicated_ac` (Mains AC), and `solar_battery`.
  - **Dynamic PoE Rebalancing**: Overriding a radio, camera, or edge switch to use a local PoE injector or DC supply immediately reduces the switch port PoE load to 0W and credits the switch power budget while maintaining full logical data connectivity.
  - **Visual Power Mode Indicators**: Live badges and filter states distinguishing PoE-delivered devices from locally powered field endpoints.

### Fixed
- **Resolved "Add to BOM" Button Failure**: Restored the missing `FacilityStore.notifyWorkspaceChange()` cross-modal dispatcher method in `js/core/facility.js` that caused an unhandled `TypeError` preventing items from being added to the BOM.
- **Port Engine Array vs Integer Conflict**: Fixed `PortEngine.initSwitchPorts` to store discrete port models on `item.physicalPorts` rather than overwriting `item.ports`, preserving the numeric port count required by downstream PoE calculations, sizers, and rack elevations.
- **Resilient Catalog Lookups in Hardware Adders**: Enhanced `addToProjectBOM` and `addFirewallToBOM` to search by either `id` or `sku` across both `CatalogRegistry` and legacy databases.

---

## [0.10.2-alpha] - 2026-09-24

### Added
- **Logical Systems Architecture & Topology Canvas Overhaul (`js/tools/topology.js` & `index.html`)**:
  - **Smooth Cubic Bézier Vector Interconnects**: Snaps links to perimeter chassis borders with auto-calculated control points and interactive speed badge pills, preventing crossing lines over cards.
  - **Dynamic Wire-Speed Auto-Negotiation**: Automatically calculates mutual link speeds (100G, 40G, 25G, 10G, 2.5G, 1G) between network endpoints and displays configurable LAG trunking (1x/2x/4x LACP bundles).
  - **Dual-Plane & Service View Filters**: Added unified filter controls supporting `All Systems (Unified)`, `Backbone & Speeds`, `PoE & Power Delivery`, `VMS Video Recording & Ingest`, and `Access Control & Security Services`.
  - **Slide-Out Topology Inspector Drawer**: Deep inspection of switches, servers, and transport links with live configuration controls for custom uplink targets, LAG bundles, wire speed overrides, and service routing.
  - **Grouped Edge Client Pools**: Switch chassis cards display aggregated client pools for cameras, doors, and wireless APs with live power and bitrate rollups, preventing visual clutter while enabling full inspection on click.
  - **1-Click Hierarchical Auto-Layout (`autoArrangeTopologyHierarchy`)**: Automatically arranges complex topologies into standard Gateway $\rightarrow$ Core / Servers $\rightarrow$ Access Closets $\rightarrow$ Field tiers.
  - **Canvas Zoom & Viewport Controls**: Smooth zoom engine (50% to 200%) with zoom level badge and 1-click fit to screen.
- **Compute, VMS Servers & Security Integration**:
  - **Enterprise Server Catalog (`data/compute_storage/data_servers.js`)**: Ingested high-density VMS recording servers and identity hosts (Dell PowerEdge R760, BCDVideo Aurora 1U, Supermicro 4U 24-Bay, HPE ProLiant DL380).
  - **Enterprise IP Cameras Catalog (`data/physical_security/data_cameras.js`)**: Ingested surveillance cameras (Axis P3265-LVE 2MP, Axis Q3538-LVE 4K AI, Hanwha XNV-8081Z 4K PTRZ, Hanwha XNO-6080R, Avigilon 5MP) with PoE classes and stream bitrates.
  - **Enterprise Access Control Catalog (`data/physical_security/data_access.js`)**: Ingested door controllers and readers (Mercury LP1502 PoE+, Mercury MR52-S3, Axis A1001, HID Signo 40).
  - **Live VMS Ingest & Access Routing Engine**: Real-time video ingest bandwidth calculations (Mbps) and logical routing of camera streams and door controllers to assigned servers in the quote.
  - **Dedicated Line Item Creation (`js/tools/bom.js`)**: Added `addServerToBOM`, `addCameraToBOM`, and `addAccessDeviceToBOM`.

### Changed
- Strictly isolated physical cabling details (Cat6/fiber spools, run lengths) and physical rack U elevations to the Floor Plan Layout (`physical_layout.js`) and Rack Viewer (`rack.js`), keeping the Topology tool exclusively dedicated to logical network architecture, dataflows, and hosted services.
- Enhanced domain card rendering (`js/renderers/render_cards.js`) with specialized telemetry badges and direct BOM additions for servers, cameras, and access controllers.

---

## [0.10.1-alpha] - 2026-09-24

### Added
- **Centralized Network & PoE Sizing Engine (`js/engines/sizer_network.js`)**:
  - Full calibration against IEEE 802.3af (15.4W PSE / 12.95W PD), IEEE 802.3at (30W PSE / 25.5W PD), IEEE 802.3bt Type 3 (60W PSE / 51W PD), and IEEE 802.3bt Type 4 (90W PSE / 71.3W PD).
  - Ohmic cable heat dissipation math across worst-case 100m Cat5e/Cat6/Cat6A horizontal cable runs.
  - Continuous PSE wattage calculations with configurable engineering headroom buffer (+10%, +15%, +20%, +25%, +30%).
- **Edge PoE Sizing Strip Overhaul (`js/core/app.js`)**:
  - Telemetry breakdown showing total PSE continuous power, PD device consumption, and estimated cable heat loss.
  - Quick reset action (`resetDemandInputs()`) to instantly zero out demand targets.
  - Multi-tiered switch candidate auditing (`NetworkSizer.auditSwitchFit()`) validating PoE downlinks, total wattage, 90W bt port pools, and 60W/90W bt combinations.
- **Rack Elevation Power & Thermal Physics (`js/tools/rack.js` & `index.html`)**:
  - Distinct tracking between **Operating Design Load** (active connected devices with 90% PSU conversion efficiency) and **Worst-Case Nameplate Load** (100% capacity breaker sizing).
  - Thermal dissipation outputs in both BTU/hr ($1\text{ W} = 3.412142\text{ BTU/hr}$) and Tons of AC cooling ($1\text{ Ton} = 12,000\text{ BTU/hr}$).
  - NEC 80% continuous branch circuit sizing recommendations (120V 15A/20A/30A and 208V 20A/30A circuits with NEMA receptacles).
  - Intelligent UPS Advisor calculating required apparent power ($VA = \frac{\text{Watts}}{PF} \times 1.25$ with 25% safety margin), rackmount form factor, and estimated battery runtimes.
- **Bill of Materials Real-Time Capacity & Standard Auditing (`js/tools/bom.js`)**:
  - Connected child device power detection evaluating `powerConsumptionWatts`, `maxPowerWatts`, `powerWatts`, `poeWattsDrawn`, and `baseWatts` to prevent underestimating field loads.
  - Secondary power supply integration (`POWER_SUPPLY_CATALOG` in `data_interconnects.js`), allocating expanded PoE budgets in combined/sharing mode and setting accurate external brick/DIN budgets.
  - 60W/90W high-power port exhaustion tracking and passive PoE adapter mismatch warnings.
  - Real-time BOM headroom banner with live percentage coverage, surplus/deficit indicators, and active device draw metrics.

### Changed
- Upgraded switch card allocation pills in catalog view (`js/renderers/render_cards.js`) to display dynamic headroom percentage and secondary PSU indicators.
- Synchronized active BOM device PoE loads directly into Rack Elevation telemetry.

---

## [0.10.0-alpha] - 2026-09-24

### Added
- **Modular Domain Registry Architecture**:
  - Replaced monolithic single-file global data structures with an isolated multi-domain registry (`CatalogRegistry` in `data/registry.js`).
  - Modularized catalog datasets into category folders: `data/networking/`, `data/infrastructure/`, `data/physical_security/`, `data/compute_storage/`, and `data/software/`.
  - Introduced fast O(1) indexed lookups (`_byId` and `_bySku` HashMaps).
- **Decoupled Application Architecture**:
  - Separated core application into clean layer directories: `js/core/`, `js/engines/`, `js/renderers/`, and `js/tools/`.
  - Centralized single-source-of-truth state container (`AppState` in `js/core/app.js`).
  - Pluggable Strategy Pattern filter architecture (`FilterEngine` in `js/engines/search_filter.js`).
- **Security Hardening & Quota Resilience**:
  - Universal XSS sanitization via `escapeHTML()` across all catalog card templates, comparison matrices, and modal views.
  - Storage quota protection (`StorageService.safeSetItem`) with `QuotaExceededError` detection and defensive cleanup.
  - Secure JSON project import schema validation and sanitization (`StorageService.importProjectJSON`).
- **Performance Optimizations**:
  - 150ms debounced search runner to ensure smooth rendering during high-speed typing.
  - Scoped Lucide icon rendering (`safeCreateIcons(container)`) eliminating whole-page DOM icon re-scans.

---

## [0.6.1-alpha] - 2026-09-24

### Added
- **Interactive Sizing Strips Across All Domains**:
  - **Wireless PtP/PtMP**: Interactive Link Path Sizer calculating range (miles/km) and line-rate throughput targets.
  - **Gateways & WAN**: Firewall routing line-rate throughput and deep threat (IDS/IPS) inspection sizer.
  - **Optics & Interconnects**: One-click fast-select strip for 10G DAC, 10G SR/LR, 25G SFP28, 100G QSFP28, and dedicated stacking.
  - **Accessories**: Minimum output wattage filter for industrial DIN-rail power supplies and PoE midspans.
- **PtMP Topology & Station Compatibility Engine**:
  - Standardized `topologyRole` (`ap`, `ptp`, `station`), `maxStations`, and `ptmpFamily` across wireless models.
  - Introduced station compatibility filtering to verify subscriber association against chosen BaseStations.
- **Universal Filter Pills Bar**:
  - Removable tag chips above catalog grid allowing single-click removal of active query tokens, vendor filters, and hardware constraints without resetting the whole form.
- **Accessories Schema Expansion**:
  - Added explicit `type` classifications (`media_converter`, `poe_injector`, `power_supply`, `power_distribution`, `enclosure`, `surge_protector`) to support expanding industrial components.

### Changed
- **Tokenized & Hyphen-Agnostic Search**:
  - Replaced strict substring evaluation with whitespace-tokenized matching and alphanumeric normalization (e.g., searching `c9300l`, `c9300-l`, or `icx7150` matches accurately regardless of hyphenation or token order).
- **Faceted Port Density Filtering**:
  - Replaced strict interface equality checks (`ports === 48`) with categorical density buckets (`48`, `24`, `16`, `compact`) to support switches with modular/fixed uplink cages.
- **Multi-Gigabit Detection**:
  - Upgraded Multi-Gig filtering to dynamically evaluate `portSpeed`, `portFormFactorSummary`, and high-power PoE port pools.
- **Dynamic Facet Counts**:
  - Sidebar counts now calculate based on active filter intersections to prevent dead-end zero-result selections.

### Fixed
- Fixed script path loading mismatch for `data_firewalls.js`.
- Fixed inline JavaScript closure execution error on optics fast-select buttons.
- Fixed throughput string evaluation across firewalls containing comma separators and unit suffixes.


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