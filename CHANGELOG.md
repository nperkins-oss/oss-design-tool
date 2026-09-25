# Changelog

All notable changes to the **NetSelect Enterprise** network & physical security infrastructure sizing engine will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.10.10-alpha] - 2026-09-25

### Added
- **Adjustable Pole Zone Elevations (`js/tools/rack.js`)**:
  - Implemented interactive mounting elevation controls for Zone 2 (Upper Pole: fixed cameras, illuminators) and Zone 3 (Mid Pole: NEMA enclosure banding) directly inside the structural pole elevation visualizer.
  - Implemented `updatePoleZoneHeight(spaceId, zoneId, heightVal)` and exported to `window`.
  - Mid-pole elevation changes automatically update and synchronize the physical installation height (`mountHeightFt`) of all banded NEMA enclosures attached to that pole space.
- **Edge Device Physical Mounting Options (`js/tools/bom.js` & `js/tools/physical_layout.js`)**:
  - Built physical mounting method selector (`wall`, `ceiling`, `pole`, `parapet`, `corner`) across all edge devices (cameras, PtP radios, wireless APs, sensors, access readers).
  - Implemented `updateDeviceMountMethod(instanceId, method)` in `bom.js` and `updateNodeMountMethod(nodeId, method)` in `physical_layout.js`.
  - Added physical mounting dropdown to device inspectors on the Blueprint / Physical Layout canvas.
  - Automatic mounting detection on device creation: pole locations default to `"pole"`, dome cameras default to `"ceiling"`, and bullet/box cameras or wall drops default to `"wall"`.
- **Project Health & Validation Audit Engine (`js/tools/bom.js` & `index.html`)**:
  - Moved bulky PoE calculations table out of the Quote BOM drawer, reclaiming vertical space for streamlined quoting.
  - Built persistent top-bar **Project Health Pill** (`#projectHealthPill`) in the navigation bar, featuring dynamic status indicators (calm green `✓ System Healthy` vs pulsing red `⚠️ X Project Misses`).
  - Implemented `#bomDeficitAlertStrip` in the BOM drawer providing compact real-time notification alerts when engineering misses exist.
  - Built dedicated **Project Health & Engineering Validation Modal** (`#projectHealthModal`) scanning in real time for:
    - **PoE Power Deficits**: Compares switch PoE budgets against edge device loads and camera calculation targets.
    - **Unassigned Hardware**: Identifies staged equipment without assigned facilities, floors, or racks.
    - **Missing Software Licenses**: Audits cameras against perpetual VMS channel recording licenses.
    - **Missing Hardware & Interconnects**: Audits switch stacks for dedicated hardware DAC cables.
  - Added direct 1-click remediation actions for all deficits (`autoFixUnassignedGear`, `autoAddMissingLicenses`, `autoAddMissingDACCables`, `autoAddPoeSupplyOrSwitch`, and `autoFixAllProjectMisses`).
- **Switch Stacking Architecture Refactor (`js/tools/bom.js`, `js/tools/topology.js`, `js/tools/rack.js`)**:
  - Refactored switch cards in the Quote BOM drawer, replacing the clumsy editable stacking dropdown with a sleek read-only stack status badge and deep-link button (`Configure in Topology →`).
  - Switch stacking controls and hardware member adjustments centralized in Topology canvas (`updateSwitchStackFromTopology`) and Enclosure Visualizer (`renderEquipmentRackFrame`).
  - Added stacking member badges (`X-Switch Stack (+X DACs)`) to switch chassis in rack elevation views.

---

## [0.10.9-alpha] - 2026-09-25

### Added
- **Unified Enclosure Visualizer inside Facilities Tool (`index.html` & `js/core/facility.js`)**:
  - Moved the Rack Elevations visualizer directly inside the Facilities tool as the **"Enclosure Visualizer"**, replacing disjointed modal popups with a seamless unified dialog (`#facilityModal`).
  - Updated the top navbar navigation button from "Rack Elevations" to **"Enclosure Visualizer"**.
  - Added segmented view switcher (`[ Hierarchy & Spaces ]` vs `[ Enclosure Visualizer ]`) for instantaneous switching between taxonomy management and physical equipment elevation frames.
  - Added live dynamic breadcrumbs in the visualizer header (`[Back to Spaces] / Floor / Space / Host [Type Badge]`) showing exact hierarchical context.
- **Intuitive Back-to-Spaces Navigation on Exit/Close (`js/core/facility.js` & `js/core/app.js`)**:
  - Implemented `handleFacilityModalCloseOrBack()`: When navigating from a space or pole to a rack or enclosure visualizer, clicking the close button ("X"), the "Back to Spaces" breadcrumb button, or pressing `Escape` returns smoothly back to the exact floor and space previously viewed, without closing completely out of the tool.
  - Retained project-wide backward compatibility for `window.toggleRackModal()`, `window.switchActiveRackElevation()`, and `window.openRackViewerFor()`.
- **Cross-Location Hardware Drag-and-Drop (`js/tools/rack.js` & `index.html`)**:
  - Built interactive Quick Location Transfer Bar (`#rackLocationTransferBar`) in all elevation visualizers, rendering all project mounting locations (racks, cabinets, NEMA boxes, pole masts, backboards, and unassigned bin) as active drag-and-drop targets with live device counters.
  - Implemented `handleLocationTransferDragOver()`, `handleLocationTransferDragLeave()`, and `handleLocationTransferDrop()` enabling devices to be dragged and reassigned between any mounting locations or returned to the unassigned staging area in real time.
  - Added direct drop-mount targets on mid-pole mounted enclosure cards in `renderStructuralMountFrame()` (allowing devices to be dropped directly into pole-banded NEMA boxes).
  - Added direct drop-mount target on the "View Pole Elevation" banner in `renderIndustrialDinFrame()` (allowing devices to be moved from NEMA enclosures onto the pole mast).
- **Physical Layout Canvas Location & Floor Accuracy (`js/tools/physical_layout.js`)**:
  - Completely revamped `syncBOMClosetsToFloors()` to synchronize `facilityFloors` with `FacilityStore.getFloors()`, migrating legacy dummy floors to canonical floors (`floor-main`, `floor-exterior`).
  - Accurately routed all closets and enclosures to their real assigned floors (e.g. `Pole 1 • Pole Mount` and `Pole 1 • NEMA-Box` on the Exterior floor; `MDF • Rack-1` on Main Floor).
  - Added automatic purging of stale closet nodes whose locations no longer exist in `FacilityStore`.
  - Upgraded canvas rendering in `renderCableCanvas()` with distinctive, host-specific SVG geometry and colors:
    - **Structural Pole Mounts**: High-visibility cyan circular mast base (`#083344`, `#0284c7`, `#38bdf8`) with mast crosshairs, center dot, radar boundary ring, and `[POLE]` badge.
    - **Industrial Weatherproof NEMA Enclosures**: Industrial amber enclosure (`#451a03`, `#d97706`, `#fbbf24`) with dual DIN rail crossbars and `[NEMA]` badge.
    - **Security Cabinets**: Emerald access control cabinet (`#022c22`, `#059669`, `#34d399`) with Trove subplate quadrant grid and `[SEC-CAB]` badge.
    - **19" EIA Equipment Racks**: Indigo server chassis (`#1e1b4b`, `#6366f1`, `#a5b4fc`) with horizontal RU slot rails and `[RACK]` badge.
    - **Architectural Backboards**: Purple plywood wallfield (`#3b0764`, `#a855f7`, `#d8b4fe`) with punchblock dash grid and `[BOARD]` badge.
  - Synchronized `deepLinkToRackElevation()` to launch directly into the unified Enclosure Visualizer.
  - Bi-directionally synchronized floor reassignment (`moveClosetToFloor`) and location renaming (`updateNodeName`) with `FacilityStore`.

---

## [0.10.8-alpha] - 2026-09-25

### Added
- **Telecom Spaces & Poles Level Architecture (`js/core/facility.js` & `js/tools/rack.js`)**:
  - Moved Structural Poles exclusively to the **Telecom Spaces & Poles** level (Level 2), eliminating confusing duplicate pole entries at the Enclosure level.
  - Exterior poles feature configurable AGL heights (12, 15, 20, 25, 30, 40 ft), live AGL height badges, and dedicated **Pole Elevation** visualizer buttons.
  - Pole Elevation visualizer renders strapped enclosures (e.g. NEMA boxes at 10 ft AGL) directly in Zone 3 (Mid-Pole) with **"Inspect Enclosure (DIN Rails) →"** deep-links.
  - Enclosure visualizer includes bidirectional **"← View Pole Elevation"** quick-links for pole-banded enclosures.
- **Enclosure Drag-and-Drop Reassignment (`js/core/facility.js`)**:
  - Implemented HTML5 drag-and-drop across space cards in the Facility Manager.
  - Automatically updates `spaceId`, sets `mountingMethod: 'pole'` when dropped onto an exterior pole, and remaps all assigned BOM devices (`oldSpace • enc` to `newSpace • enc`).
- **Strict Name Uniqueness Enforcement (`js/core/facility.js`)**:
  - Enforced per-area name uniqueness across floors, spaces on the same floor, and enclosures in the same space.
  - Inline forms display real-time validation error alerts (`#inlineFloorError`, `#inlineSpaceError`, `#inlineHostError`).
  - Drag-and-drop target space drop handlers reject duplicate names with toast warnings.
- **Canonical Default Hierarchy & Project Auto-Migration (`js/core/facility.js`)**:
  - Defaults established: **Main Floor > MDF** (Rack-1), **Exterior > Pole 1** (NEMA-Box at 10ft AGL, 25ft mast), and **Unassigned**.
  - Auto-migrates legacy projects to ensure Exterior floor and Pole 1 are present without data loss.
- **Streamlined Facility, Floors, Spaces & Enclosures Management (`js/core/facility.js`)**:
  - Replaced browser `prompt()` dialogs with seamless, styled inline creation forms (`facilityActiveForm`: `add_floor`, `add_space`, `add_host`) embedded directly in the hierarchy management columns.
  - Added direct "Elevation Visualizer" action buttons on all mounting host cards.
- **NEMA Enclosure Wall and Pole Mounting Options (`js/core/facility.js` & `js/tools/rack.js`)**:
  - Added `mountingMethod` (`wall` | `pole`) configuration to Weatherproof NEMA (`industrial_din`) enclosures.
  - Visualizer renders heavy-duty unistrut wall flanges with anchor points for wall-mounted enclosures, or stainless steel banding straps and standoff brackets for pole-mounted enclosures.

### Fixed
- **Modal Layering on Visualizer Linking (`js/core/facility.js` & `js/tools/topology.js`)**:
  - Fixed an issue where opening the visualizer from `#facilityModal` left `#facilityModal` covering `#rackModal` in the background; `openRackViewerFor()` now explicitly hides `#facilityModal` and focuses `#rackModal` in the foreground.
- **Facility Modal ESC Key Navigation (`js/core/app.js`)**:
  - Registered `#facilityModal` in the universal keyboard ESC listener in `app.js` so pressing Escape smoothly closes the Facility, Floors, Spaces & Enclosures modal.
- **Rack Elevation Modal Header Layout & Overflow (`index.html` & `js/tools/rack.js`)**:
  - Moved dimension selectors (`#hostDimensionControl`) and mounting action buttons out of the top modal header into a dedicated, clean elevation toolbar directly above `#rackElevationFrame`.
  - Eliminated text wrapping, truncation, and control overflow in `#rackModal`.

---

## [0.10.7-alpha] - 2026-09-24

### Fixed
- **BOM "Inspect in Topology" Quick-Link Navigation (`js/tools/topology.js` & `js/tools/bom.js`)**:
  - Resolved an issue where clicking the "Inspect in Topology" button on equipment cards did not activate the canvas because the topology modal container remained hidden.
  - Automatically slides closed the BOM drawer (`#bomDrawer`) when launching topology navigation so the 500px drawer no longer covers the canvas or the slide-out Topology Inspector.
  - Added automatic closet assignment fallback for newly staged unassigned hardware (`FacilityStore.UNASSIGNED`) to default MDF/IDF locations so target devices are immediately rendered in a location cluster upon inspection.
  - Added visual highlight pulsing (`ring-4 ring-indigo-400 scale-[1.02]`) and centered smooth scrolling to target equipment cards.

### Added
- **Direct Physical Floor Plan & Cable Layout Launchers (`js/tools/physical_layout.js`, `js/tools/bom.js`, & `index.html`)**:
  - Implemented `jumpToPhysicalLayoutTarget(targetVal)` in `js/tools/physical_layout.js` to deep-link directly from BOM equipment cards and quick-action toolbars to floor drop nodes and closet enclosures in the physical floor plan.
  - Added "Physical" quick launcher button to the BOM drawer header quick-launch toolbar alongside Topology, Racks, and Licenses.
  - Added individual "Physical" launcher buttons (`jumpToPhysicalLayoutTarget('${item.instanceId}')`) on all equipment cards in the BOM drawer.
  - Automatically slides closed the BOM drawer when launching physical layout, switches the canvas to the item's target facility floor via `FacilityStore.parse()`, and highlights the corresponding drop node or closet enclosure.

- **Unified Virtual Chassis Stacking Accounting in Logical Topology (`js/engines/port_engine.js`, `js/tools/topology.js`, & `js/tools/bom.js`)**:
  - **Single Logical Stack Entity with Multi-Unit Accountability**: Stacked switches (e.g. 2, 3, or 4 units) are treated as a single unified logical chassis on the Topology canvas, eliminating duplicate node clutter while accurately accounting for all physical member units in:
    - **Port Matrix & Physical Interfaces**: `PortEngine.initSwitchPorts` generates discrete unit-indexed ports across all members (Unit 1: `1/1`..`1/24`, Unit 2: `2/1`..`2/24`), and the Topology Inspector divides the faceplate into distinct, labeled sub-matrices (`Unit 1 Master Chassis`, `Unit 2 Member Chassis`).
    - **Power & PoE Budget**: Node cards and Inspector telemetry denote total physical power supplies (`(2x PSUs)`), scaled chassis base draw (`2x Base Watts`), and aggregate PoE capacity (`(2x PoE Budget)`).
    - **Cross-Stack LACP LAG Uplinks**: Automatically provisions redundant cross-stack LACP LAG uplinks (`2x LAG Cross-Stack LACP`) with distinctive purple/indigo trunk styling (`#818cf8`) and automatic failover modeling.
    - **Chassis Stacking & Resiliency Controls**: Added stack member configuration dropdown (`updateSwitchStackFromTopology`) in the Topology Inspector, keeping stack settings, BOM quantities, and dedicated hardware stacking cables synchronized in real time.

---

## [0.10.6-alpha] - 2026-09-24

### Fixed
- **Catalog & "Add to BOM" Universal Lookup Resilience (`data/registry.js` & `js/tools/bom.js`)**:
  - Restored `CatalogRegistry.getSwitch(idOrSku)` and added `CatalogRegistry.getDevice(idOrSku)` universal lookup helpers in `data/registry.js`, resolving an unhandled `TypeError` that occurred when adding switches to the quote.
  - Hardened all equipment adder functions (`addToProjectBOM`, `addFirewallToBOM`, `addServerToBOM`, `addCameraToBOM`, `addAccessDeviceToBOM`, `addWirelessToBOM`) with defensive function checks (`typeof CatalogRegistry.get === "function"`) and database array fallbacks.
  - Attached all card renderers and adder callbacks explicitly to `window` across `render_cards.js` and `bom.js` to ensure reliable cross-script event handling.

### Changed
- **BOM Drawer & Specialized Engine Separation of Concerns (`index.html` & `js/tools/bom.js`)**:
  - **Replaced Legacy "Auto Uplinks" with Specialized Engine Launchers**: Replaced the legacy blind "Auto Uplinks" button (which inserted generic 0.5m DACs) in the BOM drawer header with dedicated 1-click launchers for **Topology** (`toggleTopologyModal()`), **Rack Elevations** (`toggleRackModal()`), and **Licensing Terms** (`toggleLicenseModal()`).
  - **Streamlined Commercial Quote Cards (`renderBomSingleItemHtml`)**: Removed redundant port utilization telemetry and duplicate warning boxes from individual equipment cards in the BOM drawer, returning the drawer to its core purpose: clean commercial pricing, quantities, location re-assignment, stacking, and hardware accessories.
  - **Direct "Inspect in Topology" Launcher**: Embedded a compact launcher on each equipment card in the BOM drawer, allowing instant in-viewport jumping to that device inside the Logical Topology engine.
  - **Power & Uplink Mutator Delegation**: Updated `setPowerSource` and `setUplinkTarget` in `bom.js` to automatically delegate to `PortEngine`, ensuring all power mode adjustments enforce hardware constraints and synchronize midspan injectors or DIN-rail supplies.

---

## [0.10.5-alpha] - 2026-09-24

### Added
- **Dynamic Hardware-Constrained Power Modes (`js/engines/port_engine.js` & `js/tools/topology.js`)**:
  - **Hardware Sizing Enforcement (`getSupportedPowerModes`)**: Power delivery modes dynamically adapt to hardware specifications. Core and spine switches and enterprise rackmount compute servers strictly permit `internal_psu` and `dual_ac`, eliminating impossible configurations such as solar or PoE-in on 100G core switches.
  - **Dynamic Power Selectors in Inspector**: Slide-out inspector cards for Core switches, Access switches, Servers, PtP Radios, and Edge Devices only render valid, supported power choices for the selected model.
- **Automated BoM Power Accessory Provisioning (`js/engines/port_engine.js`)**:
  - **Automatic PoE Injectors**: Switching an edge device or wireless radio to `poe_injector` automatically provisions and sizes the appropriate PoE midspan injector (`UACC-PoE-at` 30W or `UACC-PoE-bt-60` 60W) directly onto the Project BoM.
  - **Automatic Industrial DC Power Supplies**: Selecting `dedicated_dc` automatically provisions an industrial DIN-rail power supply (`NDR-120-48` 48V 120W) onto the BoM.
  - **Intelligent BoM Reconciliation**: Switching power modes back to `poe_switch` or `internal_psu` automatically reconciles and removes the associated accessory from the BoM in real time.
- **Facilities & Building-to-Building Master Auto-Linking (`js/tools/topology.js`)**:
  - **Automated Closet Device Onboarding (`autoResolveDeviceUplinks`)**: Building-to-building wireless bridge masters, IP cameras, and edge clients automatically discover and link to the primary switch in their designated closet or enclosure, auto-allocating switch ports at scale.
  - **Intra-Cluster Loop Routing**: Interconnections between devices within the same rack loop gracefully outside the equipment cards with a $45\text{px}$ offset, ensuring intra-rack patch cables are $100\%$ visible rather than hidden beneath card layers.
  - **Node Card Host Switch Badges**: Equipment cards inside location clusters display real-time host switch name and assigned port chips.
- **Dark Searchable Quick Jump Combobox (`js/tools/topology.js` & `index.html`)**:
  - **Custom Search Combobox (`#topologyQuickSearchContainer`)**: Replaced OS-native select input with a modern dark floating combobox. Features live real-time filtering, category groupings (Racks, Core, Access, Servers, Wireless, Clients), equipment status chips, and full keyboard navigation (Up, Down, Enter, Escape).
- **Network Layout Presets & Ring Topology Support (`js/tools/topology.js` & `index.html`)**:
  - **Multi-Layout Auto-Arrange Engine**: Added preset layout selector supporting **Tiered Tree** (hierarchical spine/leaf), **Hub & Spoke** (central core star layout), and **Resilient Ring** (circular loop/ERP layout).
  - **Ring Trunk & Loop Detection**: Access switch peer-to-peer trunks and ring topologies are automatically identified, rendered with amber/gold dashed vectors, and labeled `(Ring Trunk)`.

### Fixed
- **Optical Cages Overflow & Inspector Legend Clutter (`js/tools/topology.js`)**:
  - High-density QSFP28/SFP+ optical cages now use an 8-column and 6-column wrapping grid with compact identifiers (`Q1`..`Q32`), fully preventing inspector drawer overflow on 32-port 100G switches (`ECS-Core`).
  - Added responsive flex-wrapping to the inspector port legend to prevent overlapping port status chips.

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