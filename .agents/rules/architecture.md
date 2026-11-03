---
trigger: always_on
---

# OSS Design Tool — Modular Architecture & Codebase Navigation Map

Use this index to immediately locate files, global objects, UI modals, and CLI tools without scanning unrelated files.

## 1. Fast Symbol, Line-Range & Call-Site Lookup CLI
To locate any function, store method, global variable, or HTML `#id` with its exact `#Lstart-Lend` line range or all cross-file call sites in <50ms:
```powershell
$env:ELECTRON_RUN_AS_NODE = "1"; & "C:\Users\nperkins\AppData\Local\Programs\antigravity\Antigravity.exe" scripts/code_index.js lookup <symbol_or_id> 2>&1 | Out-String
$env:ELECTRON_RUN_AS_NODE = "1"; & "C:\Users\nperkins\AppData\Local\Programs\antigravity\Antigravity.exe" scripts/code_index.js refs <symbol_or_id> 2>&1 | Out-String
$env:ELECTRON_RUN_AS_NODE = "1"; & "C:\Users\nperkins\AppData\Local\Programs\antigravity\Antigravity.exe" scripts/code_index.js file <relative_file_path> 2>&1 | Out-String
$env:ELECTRON_RUN_AS_NODE = "1"; & "C:\Users\nperkins\AppData\Local\Programs\antigravity\Antigravity.exe" scripts/code_index.js audit 2>&1 | Out-String
```
*(Note: Always append `2>&1 | Out-String` when invoking `Antigravity.exe` in PowerShell so GUI-subsystem stdout flushes back to the terminal immediately).*

---

## 2. Application Layer & File Map

### A. Stylesheets & Entry HTML
- `index.html`: Main single-page application shell, 5-step `#newProjectModal`, `#returningUserModal`, and studio modal containers.
- `assets/css/tailwind.min.css`: Pre-compiled Tailwind v3.4.17 stylesheet.
- `assets/css/app.css`: Custom scrollbars, topology clusters, interactive rack/keystone/PDU strips, table/pane resizers, and `@media print` submittal stylesheet.

### B. Core Subsystems (`js/core/`)
- `js/core/namespace.js`: `window.OSS` root namespace & event bus.
- `js/core/storage.js`: `StorageService` (`localStorage` persistence, multi-project save/load, JSON import/export, first-time vs. returning user startup prompt).
- `js/core/facility.js`: `FacilityStore`, `MOUNTING_HOST_TYPES`, `EDGE_ENDPOINT_TYPES`, floor/space/enclosure state & cascading workspace event dispatcher.
- `js/core/facility_ui.js`: Facility Manager modal UI (`renderFacilityManager`), drag-and-drop hardware assignment, and Quick-Add Enclosure modal.
- `js/core/app.js`: `APP_VERSION`, `BUILD_NUMBER`, `SCHEMA_VERSION`, `DOMContentLoaded` bootstrap, global state, and catalog view orchestrator.
- `js/core/tab_manager.js`: `TabManager` workspace tab navigation engine.
- `js/core/changelog.js`: Live `CHANGELOG.md` parser, unread badge dot, and `#changelogModal` UI.
- `js/core/ui_resizers.js`: Interactive table column and split-pane drag resizers.
- `js/core/auth.js`: Azure Static Web Apps corporate authentication & domain guard.

### C. Engineering & Filtering Engines (`js/engines/` & `js/sizers/`)
- `js/engines/device_taxonomy.js`: `DeviceTaxonomy` canonical role/category classification and friendly naming (`IDF-1-SW01`).
- `js/engines/port_engine.js`: `PortEngine` physical port allocation, 48P Sandwich / 24P Offset patch panel mapping (`resolveSwitchPatchMapping`), and PoE/uplink port state.
- `js/engines/search_filter.js`: `FilterEngine` multi-facet catalog filtering.
- `js/engines/global_search.js`: `Ctrl+K` / `Cmd+K` Omnisearch modal across catalog, BOM, racks, and canvas drops.
- `js/sizers/sizer_network_ups.js`: Network switch & UPS/battery runtime sizing math.
- `js/sizers/sizer_video_storage.js`: Camera bitrate, RAID storage, and NVR throughput math.
- `js/sizers/sizer_genetec.js` & `js/sizers/ui/genetec_builder_ui.js`: Genetec Security Center / Streamvault sizing & UI.
- `js/sizers/sizer_milestone.js` & `js/sizers/ui/milestone_builder_ui.js`: Milestone XProtect / Husky IVO sizing & UI.
- `js/sizers/sizer_workstation.js` & `js/sizers/ui/workstation_sizer_ui.js`: Security operator workstation GPU/CPU decoding sizer & UI.
- `js/sizers/ui/calculator_strip_ui.js`: Top engineering calculator strip & studio drawers.
- `js/sizers/ui/door_schedule_ui.js`: Access control door schedule builder & lock power/compliance UI.

### D. Catalog Card & Sidebar Renderers (`js/renderers/`)
- `js/renderers/render_cards.js`: Hardware product cards, spec badges, datasheet links, and quick-add buttons.
- `js/renderers/render_sidebar.js`: Left filter sidebar facets for each hardware domain.
- `js/renderers/render_compare.js`: Side-by-side hardware comparison tray & modal.

### E. Interactive Engineering Studios (`js/tools/`)
- **BOM & Licensing (`3 files`)**:
  - `js/tools/bom.js`: `projectBOM` state, Meraki compliance, 24P/48P patch panel & StackPower sizing, `applyBomItemPsuConfig`, and `addToProjectBOM` / `add*ToBOM` APIs.
  - `js/tools/bom_views.js`: `updateBOMView`, Grouped/Category/Flat BOM tables, `#licenseModal` (`renderLicenseManagerContent`), and `compileProjectEngineeringData` CSV export.
  - `js/tools/bom_configurator.js`: `#bomItemAccessoriesModal` (`openBomItemAccessoriesModal`) and in-place Hardware Swap `#bomReplaceItemModal` (`replaceBomHardwareItem`).
- **Rack & Enclosure Elevation (`3 files`)**:
  - `js/tools/rack.js`: Active host state, interactive faceplate/keystone strips, `autoMountAllToActiveRack`, and 5 Host Frame Renderers (`renderEquipmentRackFrontFrame`, `renderEquipmentRackRearFrame`, Cabinet, DIN, Pole, Backboard).
  - `js/tools/rack_power.js`: 0U vertical channels, PDU/power cord resolution, feed balancing, `calculateRackPduMetrics`, and `#rackPowerMatrixModal`.
  - `js/tools/rack_telemetry.js`: Drag-and-drop bump displacement (`calculateRackBumpDisplacements`), 48P/24P Standard Pod builders (`applyStandardPodsToActiveRack`), `renderHostTelemetry`, and `renderServedEndpoints`.
- **Physical Floorplan Layout (`3 files`)**:
  - `js/tools/physical_layout.js`: `facilityFloors` state, `CanvasHistory`, Camera FOV/DORI telemetry (`computeCameraDoriTelemetry`), PDF.js blueprint ingestion, and mouse/keyboard handlers.
  - `js/tools/physical_layout_routing.js`: Camera FOV SVG cone renderer, pathway trunk corridor routing (`computePathwayTrunkRoute`), unplaced device staging, and `renderInspector`.
  - `js/tools/physical_layout_canvas.js`: `renderCableCanvas`, `commitCablingToBOM`, viewport search, and multi-select bulk alignment/distribution.
- **Logical Topology (`2 files`)**:
  - `js/tools/topology.js`: `topologyLinks`, `TopologyHistory`, DAC/patch/fiber auto-synthesis (`autoSynthesizeInterconnects`), `renderTopology` cluster cards, and `renderTopologyLinks` SVG Bézier links.
  - `js/tools/topology_inspector.js`: Slide-out `renderTopologyInspector`, `autoArrangeTopologyHierarchy`, and quick-jump search.
- **Other Specialized Tools**:
  - `js/tools/port_matrix.js`: Interactive Port Matrix & Patch Panel Studio (`#portMatrixStudioModal`).
  - `js/tools/project_wizard.js`: 5-Step Guided Project Setup Wizard (`#newProjectModal`).
  - `js/tools/project_health.js`: Design Rule Checker (DRC) & Project Health Audit engine (`#projectHealthModal`).
  - `js/tools/cable_schedule.js`, `js/tools/revisions.js`, `js/tools/submittal_generator.js`, `js/tools/walk_reconciliation.js`, `js/tools/engineering_workbook_export.js`.

### F. Hardware Catalog Databases (`data/`)
- `data/registry.js`: `CatalogRegistry` central indexer (`_byId`, `_bySku`) and global backwards-compatible aliases.
- `data/data_assets.js`: `CATALOG_ASSETS` master map of device IDs/SKUs to `datasheetPath` and `.webp` `image`.
- `data/infrastructure/`: `data_ups_pdu.js` (`UPS_PDU_DATABASE`), `data_racks_mounts.js` (`RACKS_MOUNTS_DATABASE`), `data_media_poe.js` (`MEDIA_POE_DATABASE`), `data_accessories.js` (`ACCESSORY_DATABASE` aggregator), `data_cabling.js` (`CABLING_CATALOG`).
- `data/networking/`: `data_allied.js`, `data_amg.js`, `data_cisco.js`, `data_firewalls.js`, `data_interconnects.js` (`OPTICS_LIST`, `POWER_SUPPLY_CATALOG`, `MODULAR_UPLINK_CATALOG`, `MOUNTING_CATALOG`, `FEATURE_LICENSE_CATALOG`, `MGMT_SUBSCRIPTION_CATALOG`), `data_juniper.js`, `data_meraki.js`, `data_ruckus.js`, `data_unifi.js`, `data_wireless.js`.
- `data/compute_storage/data_servers.js` & `data/physical_security/`: `data_cameras.js`, `data_access.js`.
