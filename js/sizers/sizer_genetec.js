// SUBSYSTEM: Engineering Sizers — Genetec Streamvault & Security Center 5.13/5.14 Sizer (js/sizers/sizer_genetec.js)

// =========================================================================
// 7. GENETEC STREAMVAULT APPLIANCE & SECURITY CENTER LICENSING SIZER
// =========================================================================

const GenetecLicensingSizer = {
  /**
   * Official Partner Software Development Kit (SDK) Integrations from Genetec Licensing.xls
   * Supports multi-selection of any combination of Partner SDKs simultaneously.
   */
  PARTNER_SDK_OPTIONS: [
    { key: 'corsight_ai', sku: 'GSC-1SDK-BAPS-SYFTYCORSIGHTAI', label: 'Corsight AI Fortify Facial Recognition (Syfty Suite v1.1)', ruleHint: 'Default 2 connections: 1 Syfty Event Processor + 1 Overlay Service / Plugin Role ($250 per connection • Requires H.264 & Media Gateway RTSPS Off)', defaultQty: 2, catalogId: 'genetec-sdk-corsight-ai', msrp: 250, datasheet: 'Datasheets/Genetec/Plugins/Corsight Syfty Genetec - User Guide 2026.pdf' },
    { key: 'briefcam', sku: 'GSC-1SDK-BRIEFCAM', label: 'BriefCam Video Synopsis & Analytics (REVIEW / RESPOND / RESEARCH)', ruleHint: 'Default 4 connections: 1 VSServer + Fetch/GPU + Embedded Clients + 1 Spare ($250 per connection)', defaultQty: 4, catalogId: 'genetec-sdk-briefcam', msrp: 250, datasheet: 'Datasheets/Genetec/Plugins/BriefCam_Corsight_Video_Analytics_Genetec_Integration.pdf' },
    { key: 'allied_streamconnect', sku: 'GSC-1SDK-ALLIEDTELESIS-STREAMC', label: 'Allied Telesis StreamConnect v2.1 PoE Switch Integration', ruleHint: 'Default 4 instances: 1 per Main/Archiver Server + 1 per open Switch Management task / Security Desk tile widget ($250 per instance)', defaultQty: 4, catalogId: 'genetec-sdk-allied-streamconnect', msrp: 250, datasheet: 'Datasheets/Genetec/Plugins/StreamConnect_for_Genetec_v2_1_User_Guide.pdf' },
    { key: 'lsp_netlink', sku: 'GSC-1SDK-LSP-NETLINK', label: 'LifeSafety Power NetLink Power Monitoring', ruleHint: '1 SDK connection per NetLink server instance ($250 per connection)', defaultQty: 1, catalogId: 'genetec-sdk-lsp-netlink', msrp: 250, datasheet: 'Datasheets/Genetec/SupportedPlugins.pdf' },
    { key: 'amg_ndm', sku: 'GSC-1SDK-AMG-NDM', label: 'AMG Systems Network Device Management', ruleHint: '1 SDK connection per AMG NDM instance ($250 per connection)', defaultQty: 1, catalogId: 'genetec-sdk-amg-ndm', msrp: 250, datasheet: 'Datasheets/Genetec/SupportedPlugins.pdf' },
    { key: 'hid_is', sku: 'GSC-1SDK-HID-IS', label: 'HID Integration Services / Origo Mobile / FARGO Connect', ruleHint: '1 SDK connection per HID Integration Service ($250 per connection)', defaultQty: 1, catalogId: 'genetec-sdk-hid-is', msrp: 250, datasheet: 'Datasheets/Genetec/SupportedPlugins.pdf' },
    { key: 'schlage_wifilock', sku: 'GSC-1SDK-SCHLAGE-WIFILOCK', label: 'Schlage NDE / LE Wi-Fi Lock Server', ruleHint: '1 SDK connection per Schlage Engage server ($250 per connection)', defaultQty: 1, catalogId: 'genetec-sdk-schlage-wifilock', msrp: 250, datasheet: 'Datasheets/Genetec/SupportedPlugins.pdf' },
    { key: 'aa_accentra', sku: 'GSC-1SDK-AA-ACCENTRA', label: 'Assa Abloy Accentra Lock Integration', ruleHint: '1 SDK connection per Accentra sync service ($250 per connection)', defaultQty: 1, catalogId: 'genetec-sdk-aa-accentra', msrp: 250, datasheet: 'Datasheets/Genetec/SupportedPlugins.pdf' },
    { key: 'alcatraz_rock', sku: 'GSC-1SDK-ALCATRAZ-ROCK', label: 'Alcatraz AI The Rock Facial Authentication', ruleHint: '1 SDK connection per Alcatraz AI Cloud/On-Premise bridge ($250 per connection)', defaultQty: 1, catalogId: 'genetec-sdk-alcatraz-rock', msrp: 250, datasheet: 'Datasheets/Genetec/SupportedPlugins.pdf' },
    { key: 'raptor_connect', sku: 'GSC-1SDK-RAPTOR-CONNECT', label: 'Raptor Connect / Envoy / iLobby Visitor Management', ruleHint: '1 SDK connection per visitor management gateway ($250 per connection)', defaultQty: 1, catalogId: 'genetec-sdk-raptor-connect', msrp: 250, datasheet: 'Datasheets/Genetec/SupportedPlugins.pdf' },
    { key: 'omnilert_gundetect', sku: 'GSC-1SDK-OMNILERT-GUNDETECT', label: 'Omnilert / Amberbox / EAGL Gunshot Detection', ruleHint: '1 SDK connection per gunshot detection server ($250 per connection)', defaultQty: 1, catalogId: 'genetec-sdk-omnilert-gundetect', msrp: 250, datasheet: 'Datasheets/Genetec/SupportedPlugins.pdf' },
    { key: 'senstar_nms', sku: 'GSC-1SDK-SENSTAR-NMS', label: 'Senstar Network Manager Perimeter Intrusion', ruleHint: '1 SDK connection per Senstar NMS gateway ($250 per connection)', defaultQty: 1, catalogId: 'genetec-sdk-senstar-nms', msrp: 250, datasheet: 'Datasheets/Genetec/SupportedPlugins.pdf' },
    { key: 'commend_duetto', sku: 'GSC-1SDK-COMMEND-DUETTO', label: 'Commend Duetto / Symphony Intercom Interface', ruleHint: '1 SDK connection per Commend interface ($250 per connection)', defaultQty: 1, catalogId: 'genetec-sdk-commend-duetto', msrp: 250, datasheet: 'Datasheets/Genetec/SupportedPlugins.pdf' }
  ],

  /**
   * Official Intrusion Alarm Panel Manufacturer SKUs from Genetec Licensing.xls
   */
  INTRUSION_PANEL_BRANDS: {
    bosch: { sku: 'GSC-1AP-Bosch', model: 'Genetec Security Center — 1 Bosch B/G Series Intrusion Alarm Panel Connection', catalogId: 'genetec-intrusion-1ap' },
    dmp: { sku: 'GSC-1AP-DMP', model: 'Genetec Security Center — 1 Digital Monitoring Products (DMP) Intrusion Alarm Panel Connection', catalogId: 'genetec-intrusion-dmp' },
    dsc: { sku: 'GSC-1AP-DSC', model: 'Genetec Security Center — 1 Digital Security Controls (DSC PowerSeries) Intrusion Alarm Panel Connection', catalogId: 'genetec-intrusion-dsc' },
    honeywell: { sku: 'GSC-1AP-CDC3-HW', model: 'Genetec Security Center — 1 Honeywell Vista / Dimension Intrusion Alarm Panel Connection', catalogId: 'genetec-intrusion-honeywell' },
    bosch_map5000: { sku: 'GSC-1AP-BOSCHMAP5000', model: 'Genetec Security Center — 1 Bosch MAP5000 Intrusion Alarm Panel Connection', catalogId: 'genetec-intrusion-bosch-map5000' },
    vanderbilt_spc: { sku: 'GSC-1AP-CDC2-SPC', model: 'Genetec Security Center — 1 Vanderbilt SPC Intrusion Alarm Panel Connection', catalogId: 'genetec-intrusion-vanderbilt-spc' }
  },

  /**
   * Default configuration for the Genetec Security Center 5.13 / 5.14 License & Appliance Designer
   */
  getDefaultConfig() {
    return {
      tierMode: 'auto',                        // 'auto' | 'aio' | 'standard' | 'enterprise'
      advantageYears: 1,                       // 1 | 3 | 5
      advantage247: false,                     // ADV-OPTION-247-1Y ($6,000) / 3Y ($14,400) / 5Y ($21,000)
      coreFailover: 'none',                    // 'none' | 'directory_only' (Backup and Restore) | 'full' (Triggers SQL Standard)
      // Client Connections (in Main Area)
      workstationClients: 5,                   // 25 free in GSC-BASE-S, Unlimited free in GSC-BASE-E
      mobileClients: 0,                        // GSC-1MobileU ($250/user) or GSC-1MobileSTU ($10,000 site license at 40+ users)
      webClients: 0,                           // GSC-1WU ($200/user; included free in GSC-BASE-E Site Login)
      // Feature Toggles (hide extra licenses for each feature until turned ON)
      enableFederation: false,                 // Toggle (Card 1): Multi-Site Security Center Federation
      enableCardholderSync: false,             // Toggle (Card 1): Global Cardholder Synchronizer & Card Sync Plugin
      enableEncodersDvr: false,                // Toggle (Card 2): Analog Video Encoders & Third-Party DVR/NVR Channels
      enableSipelia: false,                    // Toggle (Card 2): Sipelia Intercom Communications (Standard / Advanced / Unified)
      enableLpr: false,                        // Toggle (Card 2): AutoVu Fixed License Plate Recognition (LPR)
      enableCloudServices: false,              // Toggle (Card 2): Omnicast Cloud Archives & Genetec Clearance
      enableVideoFailover: false,              // Toggle (Card 2): Standby Archiver Failover & 3rd-Party Standby Clustering
      enableBiometricsIdentity: false,         // Toggle (Card 3): Biometrics (Suprema, IDEMIA, iDBridge, Princeton), ID Scanners & Mustering
      enableClearId: false,                    // Toggle (Card 3): Genetec ClearID Self-Service Access & Visitor Management
      enableKeyManagement: false,              // Toggle (Card 3): Medeco XT Intelligent Keys & Key Management Cabinets
      enablePartnerSdks: false,                // Toggle (Card 4): Multi-Select Partner SDKs (Corsight AI, BriefCam, StreamConnect, etc.)
      enableBuildingPsim: false,               // Toggle (Card 4): WinGuard PSIM, Elevator Dispatch, OPC Server & Mission Control
      enableIiot: false,                       // Toggle (Card 4): Industrial Internet of Things (BACnet, Modbus, SNMP, MQTT)
      enableIntrusionPanels: false,            // Toggle (Card 5): Intrusion Alarm Panels (Bosch, DMP, DSC, Honeywell, Vanderbilt)
      enableRsa: false,                        // Toggle (Card 5): Restricted Security Area (RSA) — Quanergy, SpotterRF, Southwest Microwave
      // Main System Multi-Site Federation, Global Cardholder Synchronizer & Card Sync Plugin
      federationSites: 0,                      // GSC-1SCFED ($1,000/site >20 entities)
      federationSmallSites: 0,                 // GSC-1SCFED-20 ($600/site <=20 entities)
      stratocastFedSites: 0,                   // GSC-Om-E-1CCFED ($125/site)
      globalCardholderSystems: 0,              // GSC-Sy-E-1GCHM ($1,950/remote system) or GSC-SY-E-1GCHMSTU ($78,000 Site License at 40+ systems)
      cardSyncDataSources: 0,                  // Card Synchronization Plugin external HR/SQL/LDAP sources (GSC-1PSINGLECARD @ $4,000 per 2 sources)
      // Omnicast Video, Sipelia Intercom (Standard vs Advanced vs Unified 5.13), AutoVu LPR & Cloud Archives
      analogEncoderChannels: 0,                // GSC-OM-S-1PAC ($60) / GSC-OM-E-1PAC ($100) / GSC-SV-AIO-1PAC ($36)
      dvrNvrChannels: 0,                       // GSC-Om-E-1DV ($130)
      sipeliaMode: 'unified_513',              // 'unified_513' ($295/station) | 'standard' ($1,500 Base + $160/station) | 'advanced' ($1,500 Base + $160 STD + $100 ADV/station)
      sipIntercomsOverride: null,              // null = auto-detect from BOM
      sipTrunks: 0,                            // GSC-Sipelia-1Trunk ($550)
      sipPublicAddress: 0,                     // GSC-SIPELIA-1PA ($550)
      lprCamerasOverride: null,                // null = auto-detect from BOM (GSC-Av-S-1SHP $500 + ADV-LPR-F)
      cloudArchiveTb: 0,
      cloudArchiveTier: 'performance',         // 'performance' ($257/TB/yr) | 'long_term' ($122/TB/yr)
      clearanceCameras: 0,                     // CLR-1CCST1-US-1Y ($24/cam/yr)
      failoverMode: 'none',                    // 'none' | 'all' | 'custom' (Included $0 in GSC-BASE-E)
      customFailoverCameras: 0,
      standbyServerCount: 0,                   // GSC-StandbyServer ($1,500/server for 3rd-party Windows/NEC clustering)
      // Synergis Access Control Readers
      synergisGenetecReaders: 0,               // GSC-SY-S-1RE ($65) / GSC-SY-E-1RE ($125) / GSC-SV-AIO-1R ($175) + ADV-RDR
      synergisExternalReaders: 0,              // GSC-Sy-S-1R ($175) / GSC-Sy-E-1R ($260) / GSC-SV-AIO-1R ($175) + ADV-RDR
      // Biometrics (Suprema Plugin for Genetec v1.00 EN 102.00.SPG), Identity, ClearID & Medeco XT
      supremaDevices: 0,                       // Suprema Biometric Readers/Devices (Up to 256 per Suprema Device Plugin; up to 50 per Dedicated Cloud Link)
      supremaPluginServers: 0,                 // Suprema Plugin Servers (Requires 3x GSC-1SDK-SUPREMA-READ @ $250 = $750 per Server per Page 16)
      supremaEndpoints: 0,                     // Legacy compatibility alias
      idemiaMorphoEnabled: false,              // IDEMIA MorphoManager Biometrics Integration (GSC-1PMORPHOBIOMETRICS @ $2,500/system)
      controlIdBridgeServers: 0,               // Control iD iDBridge Servers (GSC-1SDK-CONTROLID-IDBRIDGE @ $250/server)
      princetonIdentityServers: 0,             // Princeton Identity Access Control Suite Servers (GSC-1SDK-PRINCETONIDENTITY-ACS @ $250/server)
      clearIdIdentities: 0,                    // Genetec ClearID Active Identities (CID-IDENTITY-1Y/3Y/5Y tiered pricing)
      clearIdKiosks: 0,                        // Genetec ClearID Visitor Self-Check-In Kiosks (CID-KIOSK-LIC-1Y/3Y/5Y)
      idScannerClients: 0,                     // Document/Passport/Driver's License ID Scanner Workstations (GSC-1PIDSCANNER @ $500/workstation)
      xpressEntryServers: 0,                   // Telaeris XpressEntry Handheld Badge & Mustering Servers (GSC-1SDK-TELAERIS-XPRESSENTRY @ $250/server)
      medecoXtLocks: 0,                        // Medeco XT Intelligent Keys & Offline Locks (GSC-1PMEDECOBASE $1,000 + GSC-1P-OFFLINELOCK-1L $40/lock)
      keyCabinetCount: 0,                      // GSC-1P-KEYCABINETBASE ($1,500) + GSC-1PKEYWATCHER ($500/cabinet)
      // Multi-Select Software Development Kit (SDK) Connections, PSIM & IIoT
      genericSdkConnections: 0,                // GSC-1SDK ($250/connection)
      selectedPartnerSdks: {},                 // Multi-select map: { [sdkKey]: connectionQty }
      partnerSdkKey: 'none',                   // Legacy single-select compatibility
      partnerSdkConnections: 0,                // Legacy single-select compatibility
      briefCamConnections: 0,                  // Legacy compatibility (mapped into selectedPartnerSdks.briefcam)
      corsightAiBridges: 0,                    // Legacy compatibility (mapped into selectedPartnerSdks.corsight_ai)
      winGuardNodes: 0,                        // Advancis WinGuard PSIM Interface Nodes (GSC-1SDK-ADVANCIS-WINGUARD @ $250/node)
      elevatorDispatchSystems: 0,              // GSC-1POTIS-COMPASS / KONE / TKE / MCE ($8,000)
      opcServerSystems: 0,                     // GSC-1POPC-S ($8,000)
      missionControlOperators: 0,              // GSC-MC-1Opp ($0) + ADV-MC-1OPP-1Y/3Y/5Y ($3,000 / $7,200 / $10,500)
      iiotMode: 'none',                        // 'none' | 'devices' ($149/device) | 'site' ($6,000 Unlimited Site)
      iiotDevices: 0,
      // Dedicated Intrusion Alarm Panels & Restricted Security Area (RSA) Surveillance
      intrusionPanels: 0,                      // GSC-1AP-* ($350/panel + ADV-1AP)
      intrusionPanelManufacturer: 'bosch',     // 'bosch' | 'dmp' | 'dsc' | 'honeywell' | 'bosch_map5000' | 'vanderbilt_spc'
      rsaTier: 'none',                         // 'none' | 'standard' ($1,000) | 'pro' ($7,000) | 'enterprise' ($14,000)
      rsaShortRangeSensors: 0,                 // GSC-GAP-RSA-1SRS ($175/sensor — Quanergy M8 LiDAR, Optex PIE-1, Axis, Magos SR)
      rsaRadars: 0,                            // GSC-GAP-RSA-1RAD ($1,000/radar — SpotterRF, FLIR Ranger, Echodyne, Navtech)
      rsaFenceControllers: 0,                  // GSC-GAP-RSA-1FEN ($2,000/PIDS — Southwest Microwave INTREPID, Senstar, FFT)
      rsaFenceKm: 0,                           // GSC-GAP-RSA-1KM ($2,000) / 10KM ($5,000) / 100KM ($15,000)
      swmRpmUnits: 0,                          // Southwest Microwave INTREPID RPM II Standalone Plugin (GSC-1PSWM-RPMII @ $6,500 per 5 units)
      applianceFormFactor: 'rack'              // 'rack' | 'tower' | 'any'
    };
  },

  /**
   * Recommends the optimal Streamvault Server and Workstation appliances
   * based on storage, bitrate, camera count, RAID level, and Core Failover mode.
   */
  recommendStreamvaultAppliances(videoLoad, licConfig, bomMeta) {
    const serversDb = (typeof window !== 'undefined' && Array.isArray(window.SERVERS_DATABASE))
      ? window.SERVERS_DATABASE
      : [];
    const workstationsDb = (typeof window !== 'undefined' && Array.isArray(window.WORKSTATIONS_DATABASE))
      ? window.WORKSTATIONS_DATABASE
      : [];

    const cams = videoLoad.cameraUnits || 0;
    const reqTb = videoLoad.requiredUsableTb || 0;
    const reqMbps = videoLoad.peakIngressMbps || 0;
    const raid = videoLoad.raidLevel || 'RAID5';
    const formPref = licConfig.applianceFormFactor || 'rack';

    // Filter Streamvault Network Video Recorder / Archiver appliances
    const svServers = serversDb.filter(s => s.isStreamvault && s.serverType === 'nvr_vms');

    let primaryAppliance = null;
    let primaryQty = 1;
    let archiverReason = '';

    if (cams > 0) {
      let candidates = svServers.slice().sort((a, b) => (a.msrp || 0) - (b.msrp || 0));
      const standardCandidates = candidates.filter(s => !String(s.applianceSeries || '').startsWith('SVR-') && s.applianceSeries !== 'SV-7000EX');

      if (formPref === 'rack') {
        const rackOnly = standardCandidates.filter(s => (s.rackUnits || 0) >= 1);
        if (rackOnly.length > 0) candidates = rackOnly;
      } else if (formPref === 'tower') {
        const towerOnly = standardCandidates.filter(s => (s.rackUnits || 0) === 0);
        if (towerOnly.length > 0) candidates = towerOnly;
      } else {
        candidates = standardCandidates;
      }

      if (raid === 'RAID6') {
        const raid6Pool = candidates.filter(s => String(s.raidSupport || '').includes('RAID 6'));
        if (raid6Pool.length > 0) candidates = raid6Pool;
      } else if (raid === 'RAID5') {
        const raid5Pool = candidates.filter(s => String(s.raidSupport || '').includes('RAID 5') || String(s.raidSupport || '').includes('RAID 6'));
        if (raid5Pool.length > 0) candidates = raid5Pool;
      }

      const failoverInfo = videoLoad.failover || null;
      const isRingFailover = failoverInfo && failoverInfo.structure === 'ring' && (failoverInfo.ringNodes || 0) >= 2;
      const isDedicatedFailover = failoverInfo && failoverInfo.structure === 'dedicated' && (failoverInfo.dedicatedFailoverServers || 0) >= 1;

      if (isRingFailover) {
        const ringNodes = failoverInfo.ringNodes;
        const perNodeReqTb = failoverInfo.totalUsableTbPerRingServer || Math.ceil((reqTb / ringNodes) * 10) / 10;
        const survivorMbps = failoverInfo.failoverMbpsOnSurvivor || reqMbps;
        const survivorCams = failoverInfo.failoverCamsOnSurvivor || cams;
        const ringFit = candidates.find(s =>
          (s.usableStorageTb || 0) >= perNodeReqTb &&
          (s.maxRecordMbps || s.maxThroughputMbps || 300) >= survivorMbps &&
          (s.maxCameras || 300) >= survivorCams
        ) || candidates[candidates.length - 1] || svServers[0];
        if (ringFit) {
          primaryAppliance = ringFit;
          primaryQty = ringNodes;
          archiverReason = `Ring Failover (${failoverInfo.ringChainText}): ${ringNodes}x ${ringFit.sku} (${perNodeReqTb} TB req / ${ringFit.usableStorageTb} TB cap per node; handles ${survivorCams} cams & ${survivorMbps} Mbps during 2x neighbor failover).`;
        }
      } else if (isDedicatedFailover) {
        const primaryCount = Math.max(1, failoverInfo.primaryServerCount || 1);
        const dedicatedCount = Math.max(1, failoverInfo.dedicatedFailoverServers || 1);
        const totalCount = primaryCount + dedicatedCount;
        const perNodeReqTb = Math.max(failoverInfo.primaryUsableTbPerServer || 0, failoverInfo.failoverBufferTbPerServer || 0);
        const perNodeReqMbps = Math.max(failoverInfo.normalMbpsPerServer || reqMbps, failoverInfo.failoverMbpsOnSurvivor || 0);
        const perNodeReqCams = Math.max(failoverInfo.normalCamsPerServer || cams, failoverInfo.failoverCamsOnSurvivor || 0);
        const dedFit = candidates.find(s =>
          (s.usableStorageTb || 0) >= perNodeReqTb &&
          (s.maxRecordMbps || s.maxThroughputMbps || 300) >= perNodeReqMbps &&
          (s.maxCameras || 300) >= perNodeReqCams
        ) || candidates[candidates.length - 1] || svServers[0];
        if (dedFit) {
          primaryAppliance = dedFit;
          primaryQty = totalCount;
          archiverReason = `Dedicated Failover (${primaryCount} Main + ${dedicatedCount} Shared Failover = ${totalCount} Servers): ${totalCount}x ${dedFit.sku} (${perNodeReqTb} TB & ${perNodeReqMbps} Mbps per server, covering ${failoverInfo.simultaneousFailures || 1} simultaneous failure(s)).`;
        }
      } else {
        const singleFit = candidates.find(s =>
          (s.usableStorageTb || 0) >= reqTb &&
          (s.maxRecordMbps || s.maxThroughputMbps || 300) >= reqMbps &&
          (s.maxCameras || 300) >= cams
        );

        if (singleFit) {
          primaryAppliance = singleFit;
          primaryQty = 1;
          archiverReason = `Single ${singleFit.sku} satisfies ${reqTb} TB usable storage (${singleFit.usableStorageTb} TB capacity) and ${reqMbps} Mbps recording throughput (${singleFit.maxThroughputMbps} Mbps maximum).`;
        } else {
          const scaleTarget = candidates.find(s => s.id === 'genetec-sv-2041e-r15' && reqTb <= 600)
            || candidates[candidates.length - 1]
            || svServers[0];
          if (scaleTarget) {
            const qtyByTb = scaleTarget.usableStorageTb > 0 ? Math.ceil(reqTb / scaleTarget.usableStorageTb) : 1;
            const recCapMbps = scaleTarget.maxRecordMbps || scaleTarget.maxThroughputMbps || 600;
            const qtyByMbps = recCapMbps > 0 ? Math.ceil(reqMbps / recCapMbps) : 1;
            const qtyByCams = scaleTarget.maxCameras > 0 ? Math.ceil(cams / scaleTarget.maxCameras) : 1;
            primaryAppliance = scaleTarget;
            primaryQty = Math.max(1, qtyByTb, qtyByMbps, qtyByCams);
            archiverReason = `${primaryQty}x ${scaleTarget.sku} provides ${(primaryQty * scaleTarget.usableStorageTb).toFixed(1)} TB usable storage and ${primaryQty * scaleTarget.maxThroughputMbps} Mbps throughput across ${videoLoad.genetec?.activeArchiverRoles || 1} Archiver role(s).`;
          }
        }
      }
    }

    // Check if Dedicated Directory / Core Failover / Mission Control Expansion Server is needed
    // (>300 cameras, Core Failover enabled, or Mission Control Incident Manager active which MUST NOT co-host on Directory)
    let directoryAppliance = null;
    let directoryQty = 0;
    const hasCoreFailover = licConfig.coreFailover === 'directory_only' || licConfig.coreFailover === 'full';
    const mcOps = Number(licConfig.missionControlOperators) || 0;
    if (cams > 300 || hasCoreFailover || mcOps > 0) {
      directoryAppliance = (mcOps >= 5 || cams > 300)
        ? (serversDb.find(s => s.id === 'genetec-sv-7041ex-r6s') || serversDb.find(s => s.id === 'genetec-sv-1041e-rs2'))
        : (serversDb.find(s => s.id === 'genetec-sv-1041e-rs2') || serversDb.find(s => s.id === 'genetec-sv-7041ex-r6s'));
      directoryQty = ((cams > 300 && hasCoreFailover) || (mcOps > 0 && hasCoreFailover)) ? 2 : 1;
    }

    // Recommend Streamvault Workstation (SVW-100E, SVW-300E-SF1, SVW-300E-T3, SVW-500E-R)
    let workstationAppliance = null;
    if (cams > 64) {
      workstationAppliance = workstationsDb.find(w => w.id === 'genetec-svw-502e-soc-workstation') || workstationsDb[0];
    } else if (cams > 24) {
      workstationAppliance = workstationsDb.find(w => w.id === 'genetec-svw-300e-t3') || workstationsDb[0];
    } else if (cams > 8) {
      workstationAppliance = workstationsDb.find(w => w.id === 'genetec-svw-300e-sf1') || workstationsDb.find(w => w.id === 'genetec-svw-300e-t3') || workstationsDb[0];
    } else {
      workstationAppliance = workstationsDb.find(w => w.id === 'genetec-svw-100e-micro') || workstationsDb[0];
    }

    return {
      primaryAppliance,
      primaryQty,
      archiverReason,
      directoryAppliance,
      directoryQty,
      analyticsAppliance: null,
      analyticsQty: 0,
      workstationAppliance,
      recommendedWorkstationQty: Math.max(1, bomMeta.quotedWorkstationUnits || 1),
      allStreamvaultServers: svServers
    };
  },

  /**
   * Calculates the complete Genetec Security Center 5.13/5.14 License & Advantage Maintenance BOM,
   * enforces SQL Server 2025 Express (50 GB Cap) vs SQL Server Standard (when Core Failover = Full),
   * and returns recommended Streamvault appliances.
   */
  calculate(bomList = [], customConfig = {}) {
    const baseConfig = Object.assign(
      this.getDefaultConfig(),
      (typeof window !== 'undefined' && window.genetecLicensingConfig) ? window.genetecLicensingConfig : {},
      customConfig
    );

    const videoLoad = VideoStorageSizer.calculateFromBOM(bomList);
    const cameraUnits = videoLoad.cameraUnits || 0;
    const activeArchiverRoles = videoLoad.genetec?.activeArchiverRoles || 1;

    // Inspect BOM for specialized devices
    let bomLprCameras = 0;
    let bomIntercoms = 0;
    let bomWorkstations = 0;
    let hasSv300AioInBom = false;

    if (Array.isArray(bomList)) {
      bomList.forEach(entry => {
        const item = entry.item || {};
        const qty = Number(entry.qty) || 0;
        if (qty <= 0) return;
        const text = `${item.id || ''} ${item.sku || ''} ${item.model || ''} ${item.subcategory || ''}`.toLowerCase();
        if (item.category === 'cameras' && (text.includes('lpr') || text.includes('anpr') || text.includes('autovu') || text.includes('sharp'))) {
          bomLprCameras += qty;
        }
        if (text.includes('intercom') || text.includes('sipelia') || text.includes('door station')) {
          bomIntercoms += qty;
        }
        if (item.category === 'workstations' || item.role === 'Workstation') {
          bomWorkstations += qty;
        }
        if (item.id === 'genetec-sv-300e-sff' || String(item.applianceSeries || '') === 'SV-300E') {
          hasSv300AioInBom = true;
        }
      });
    }

    // Feature Toggle States (auto-enable if BOM has matching devices or if user already set non-zero values)
    const enableFederation = baseConfig.enableFederation !== undefined
      ? Boolean(baseConfig.enableFederation)
      : ((Number(baseConfig.federationSites) || 0) > 0 || (Number(baseConfig.federationSmallSites) || 0) > 0 || (Number(baseConfig.stratocastFedSites) || 0) > 0);

    const enableCardholderSync = baseConfig.enableCardholderSync !== undefined
      ? Boolean(baseConfig.enableCardholderSync)
      : ((Number(baseConfig.globalCardholderSystems) || 0) > 0 || (Number(baseConfig.cardSyncDataSources) || 0) > 0);

    const enableEncodersDvr = baseConfig.enableEncodersDvr !== undefined
      ? Boolean(baseConfig.enableEncodersDvr)
      : ((Number(baseConfig.analogEncoderChannels) || 0) > 0 || (Number(baseConfig.dvrNvrChannels) || 0) > 0);

    const enableSipelia = baseConfig.enableSipelia !== undefined
      ? Boolean(baseConfig.enableSipelia)
      : (bomIntercoms > 0 || (Number(baseConfig.sipIntercomsOverride) || 0) > 0 || (Number(baseConfig.sipTrunks) || 0) > 0 || (Number(baseConfig.sipPublicAddress) || 0) > 0);

    const enableLpr = baseConfig.enableLpr !== undefined
      ? Boolean(baseConfig.enableLpr)
      : (bomLprCameras > 0 || (Number(baseConfig.lprCamerasOverride) || 0) > 0);

    const enableCloudServices = baseConfig.enableCloudServices !== undefined
      ? Boolean(baseConfig.enableCloudServices)
      : ((Number(baseConfig.cloudArchiveTb) || 0) > 0 || (Number(baseConfig.clearanceCameras) || 0) > 0);

    const hasStorageFailoverActive = Boolean(videoLoad.failover && videoLoad.failover.structure && videoLoad.failover.structure !== 'none');
    const enableVideoFailover = baseConfig.enableVideoFailover !== undefined
      ? (Boolean(baseConfig.enableVideoFailover) || hasStorageFailoverActive)
      : (hasStorageFailoverActive || (baseConfig.failoverMode && baseConfig.failoverMode !== 'none') || (Number(baseConfig.standbyServerCount) || 0) > 0);

    const enableBiometricsIdentity = baseConfig.enableBiometricsIdentity !== undefined
      ? Boolean(baseConfig.enableBiometricsIdentity)
      : (
          (Number(baseConfig.supremaDevices) || 0) > 0 ||
          (Number(baseConfig.supremaPluginServers) || 0) > 0 ||
          (Number(baseConfig.supremaEndpoints) || 0) > 0 ||
          Boolean(baseConfig.idemiaMorphoEnabled) ||
          (Number(baseConfig.controlIdBridgeServers) || 0) > 0 ||
          (Number(baseConfig.princetonIdentityServers) || 0) > 0 ||
          (Number(baseConfig.idScannerClients) || 0) > 0 ||
          (Number(baseConfig.xpressEntryServers) || 0) > 0
        );

    const enableClearId = baseConfig.enableClearId !== undefined
      ? Boolean(baseConfig.enableClearId)
      : ((Number(baseConfig.clearIdIdentities) || 0) > 0 || (Number(baseConfig.clearIdKiosks) || 0) > 0);

    const enableKeyManagement = baseConfig.enableKeyManagement !== undefined
      ? Boolean(baseConfig.enableKeyManagement)
      : ((Number(baseConfig.medecoXtLocks) || 0) > 0 || (Number(baseConfig.keyCabinetCount) || 0) > 0);

    const enableBuildingPsim = baseConfig.enableBuildingPsim !== undefined
      ? Boolean(baseConfig.enableBuildingPsim)
      : (
          (Number(baseConfig.winGuardNodes) || 0) > 0 ||
          (Number(baseConfig.elevatorDispatchSystems) || 0) > 0 ||
          (Number(baseConfig.opcServerSystems) || 0) > 0 ||
          (Number(baseConfig.missionControlOperators) || 0) > 0
        );

    const rawPartnerSdkMap = (baseConfig.selectedPartnerSdks && typeof baseConfig.selectedPartnerSdks === 'object')
      ? Object.assign({}, baseConfig.selectedPartnerSdks)
      : {};
    if (baseConfig.partnerSdkKey && baseConfig.partnerSdkKey !== 'none' && (Number(baseConfig.partnerSdkConnections) || 0) > 0) {
      if (!rawPartnerSdkMap[baseConfig.partnerSdkKey]) {
        rawPartnerSdkMap[baseConfig.partnerSdkKey] = Math.max(1, Number(baseConfig.partnerSdkConnections) || 1);
      }
    }
    if ((Number(baseConfig.briefCamConnections) || 0) > 0 && !rawPartnerSdkMap.briefcam) {
      rawPartnerSdkMap.briefcam = Number(baseConfig.briefCamConnections);
    }
    if ((Number(baseConfig.corsightAiBridges) || 0) > 0 && !rawPartnerSdkMap.corsight_ai) {
      rawPartnerSdkMap.corsight_ai = Number(baseConfig.corsightAiBridges);
    }
    const hasAnyPartnerSdkSelected = Object.values(rawPartnerSdkMap).some(v => (Number(v) || 0) > 0) || (Number(baseConfig.genericSdkConnections) || 0) > 0;
    const enablePartnerSdks = baseConfig.enablePartnerSdks !== undefined
      ? Boolean(baseConfig.enablePartnerSdks)
      : hasAnyPartnerSdkSelected;

    const enableIiot = baseConfig.enableIiot !== undefined
      ? Boolean(baseConfig.enableIiot)
      : (Boolean(baseConfig.iiotMode && baseConfig.iiotMode !== 'none'));

    const enableIntrusionPanels = baseConfig.enableIntrusionPanels !== undefined
      ? Boolean(baseConfig.enableIntrusionPanels)
      : ((Number(baseConfig.intrusionPanels) || 0) > 0);

    const enableRsa = baseConfig.enableRsa !== undefined
      ? Boolean(baseConfig.enableRsa)
      : (
          (baseConfig.rsaTier && baseConfig.rsaTier !== 'none') ||
          (Number(baseConfig.rsaShortRangeSensors) || 0) > 0 ||
          (Number(baseConfig.rsaRadars) || 0) > 0 ||
          (Number(baseConfig.rsaFenceControllers) || 0) > 0 ||
          (Number(baseConfig.rsaFenceKm) || 0) > 0 ||
          (Number(baseConfig.swmRpmUnits) || 0) > 0
        );

    // Gated effective quantities based on Feature Toggles
    const effectiveLprCameras = enableLpr
      ? (baseConfig.lprCamerasOverride !== null && baseConfig.lprCamerasOverride !== undefined
          ? Math.max(0, Number(baseConfig.lprCamerasOverride) || 0)
          : Math.max(1, bomLprCameras))
      : 0;

    const rawSipOverride = baseConfig.sipIntercomsOverride !== null && baseConfig.sipIntercomsOverride !== undefined
      ? baseConfig.sipIntercomsOverride
      : baseConfig.sipeliaOverride;
    const effectiveSipIntercoms = enableSipelia
      ? (rawSipOverride !== null && rawSipOverride !== undefined
          ? Math.max(0, Number(rawSipOverride) || 0)
          : Math.max(1, bomIntercoms))
      : 0;
    const sipeliaMode = ['unified_513', 'standard', 'advanced'].includes(baseConfig.sipeliaMode)
      ? baseConfig.sipeliaMode
      : 'unified_513';
    const sipTrunks = enableSipelia ? Math.max(0, Number(baseConfig.sipTrunks) || 0) : 0;
    const sipPublicAddress = enableSipelia ? Math.max(0, Number(baseConfig.sipPublicAddress) || 0) : 0;

    const analogEncoderChannels = enableEncodersDvr ? Math.max(0, Number(baseConfig.analogEncoderChannels ?? baseConfig.analogCameras) || 0) : 0;
    const dvrNvrChannels = enableEncodersDvr ? Math.max(0, Number(baseConfig.dvrNvrChannels ?? baseConfig.dvrNvrCameras) || 0) : 0;
    const totalVideoConnections = cameraUnits + analogEncoderChannels + dvrNvrChannels;

    // Access Control: Only Readers (Genetec-Supplied Hardware Readers + Third-Party Hardware Readers)
    const synergisGenetecReaders = Math.max(0, Number(baseConfig.synergisGenetecReaders) || 0);
    const synergisExternalReaders = Math.max(0, Number(baseConfig.synergisExternalReaders) || 0);
    const totalSynergisReaders = synergisGenetecReaders + synergisExternalReaders;

    const workstationClients = Math.max(1, Number(baseConfig.workstationClients) || Math.max(5, bomWorkstations));
    const mobileClients = Math.max(0, Number(baseConfig.mobileClients) || 0);
    const webClients = Math.max(0, Number(baseConfig.webClients) || 0);
    const advantageYears = [1, 3, 5].includes(Number(baseConfig.advantageYears)) ? Number(baseConfig.advantageYears) : 1;

    const coreFailover = ['none', 'directory_only', 'full'].includes(baseConfig.coreFailover)
      ? baseConfig.coreFailover
      : 'none';

    const failoverMode = enableVideoFailover
      ? (['all', 'custom'].includes(baseConfig.failoverMode)
          ? baseConfig.failoverMode
          : (hasStorageFailoverActive ? 'all' : 'none'))
      : 'none';
    const failoverCameraQty = failoverMode === 'all'
      ? cameraUnits
      : failoverMode === 'custom'
        ? Math.min(cameraUnits, Math.max(0, Number(baseConfig.customFailoverCameras) || 0))
        : 0;
    const standbyServerCount = enableVideoFailover
      ? Math.max(
          Number(baseConfig.standbyServerCount) || 0,
          hasStorageFailoverActive ? (videoLoad.failover.standbyArchiverRolesRequired || 0) : 0
        )
      : 0;

    // Card 1: Federation, Global Cardholder Synchronizer (GSC-Sy-E-1GCHM) & Card Synchronization Plugin (GSC-1PSINGLECARD)
    const federationSites = enableFederation ? Math.max(0, Number(baseConfig.federationSites) || 0) : 0;
    const federationSmallSites = enableFederation ? Math.max(0, Number(baseConfig.federationSmallSites) || 0) : 0;
    const stratocastFedSites = enableFederation ? Math.max(0, Number(baseConfig.stratocastFedSites) || 0) : 0;
    const globalCardholderSystems = enableCardholderSync ? Math.max(0, Number(baseConfig.globalCardholderSystems) || 0) : 0;
    const cardSyncDataSources = enableCardholderSync ? Math.max(0, Number(baseConfig.cardSyncDataSources) || 0) : 0;
    const cardSyncLicenseBlocks = cardSyncDataSources > 0 ? Math.ceil(cardSyncDataSources / 2) : 0;

    const intrusionPanels = enableIntrusionPanels ? Math.max(0, Number(baseConfig.intrusionPanels) || 0) : 0;
    const intrusionPanelManufacturer = this.INTRUSION_PANEL_BRANDS[baseConfig.intrusionPanelManufacturer]
      ? baseConfig.intrusionPanelManufacturer
      : 'bosch';

    // Biometrics (Suprema Plugin for Genetec v1.00 EN 102.00.SPG Page 16: 3x GSC-1SDK-SUPREMA-READ per Server)
    const activePartnerSdks = enablePartnerSdks ? rawPartnerSdkMap : {};
    const supremaDevices = enableBiometricsIdentity
      ? Math.max(0, Number(baseConfig.supremaDevices ?? baseConfig.supremaEndpoints) || 0)
      : 0;
    // Per Suprema User Guide Page 4 & 16:
    // - 1 Suprema Device Plugin supports up to 4 Cloud Links (256 Suprema devices)
    // - Recommended additional plugin server when >100 devices
    // - Needs total 3 GSC-1SDK-SUPREMA-READ per Server (1 license supports 2 connections)
    const autoSupremaServers = supremaDevices > 100
      ? Math.max(2, Math.ceil(supremaDevices / 256))
      : supremaDevices > 0
        ? 1
        : 0;
    const supremaPluginServers = enableBiometricsIdentity
      ? Math.max(autoSupremaServers, Number(baseConfig.supremaPluginServers) || 0)
      : 0;
    const supremaSdkConnections = supremaPluginServers * 3; // 3x GSC-1SDK-SUPREMA-READ per Server (Page 16)
    const supremaCloudLinksNeeded = supremaDevices > 0 ? Math.ceil(supremaDevices / 50) : 0; // Up to 50 Suprema devices per dedicated Cloud Link (Page 4)

    const idemiaMorphoEnabled = enableBiometricsIdentity ? Boolean(baseConfig.idemiaMorphoEnabled) : false;
    const controlIdBridgeServers = enableBiometricsIdentity ? Math.max(0, Number(baseConfig.controlIdBridgeServers) || 0) : 0;
    const princetonIdentityServers = enableBiometricsIdentity ? Math.max(0, Number(baseConfig.princetonIdentityServers) || 0) : 0;
    const clearIdIdentities = enableClearId ? Math.max(0, Number(baseConfig.clearIdIdentities) || 0) : 0;
    const clearIdKiosks = enableClearId ? Math.max(0, Number(baseConfig.clearIdKiosks) || 0) : 0;
    const idScannerClients = enableBiometricsIdentity ? Math.max(0, Number(baseConfig.idScannerClients) || 0) : 0;
    const xpressEntryServers = enableBiometricsIdentity ? Math.max(0, Number(baseConfig.xpressEntryServers) || 0) : 0;
    const medecoXtLocks = enableKeyManagement ? Math.max(0, Number(baseConfig.medecoXtLocks) || 0) : 0;
    const keyCabinetCount = enableKeyManagement ? Math.max(0, Number(baseConfig.keyCabinetCount) || 0) : 0;

    // BriefCam & Corsight AI (from Multi-Select Partner SDKs in Card 4)
    const briefCamConnections = Math.max(0, Number(activePartnerSdks.briefcam) || 0);
    const corsightAiBridges = Math.max(0, Number(activePartnerSdks.corsight_ai) || 0);
    const alliedStreamConnectInstances = Math.max(0, Number(activePartnerSdks.allied_streamconnect) || 0);
    const winGuardNodes = enableBuildingPsim ? Math.max(0, Number(baseConfig.winGuardNodes) || 0) : 0;

    // Restricted Security Area (RSA) Surveillance — Quanergy LiDAR, SpotterRF Radar, Southwest Microwave INTREPID
    const rsaTier = enableRsa && ['none', 'standard', 'pro', 'enterprise'].includes(baseConfig.rsaTier) ? baseConfig.rsaTier : 'none';
    const rsaShortRangeSensors = enableRsa ? Math.max(0, Number(baseConfig.rsaShortRangeSensors) || 0) : 0; // GSC-GAP-RSA-1SRS ($175)
    const rsaRadars = enableRsa ? Math.max(0, Number(baseConfig.rsaRadars) || 0) : 0;                       // GSC-GAP-RSA-1RAD ($1,000)
    const rsaFenceControllers = enableRsa ? Math.max(0, Number(baseConfig.rsaFenceControllers) || 0) : 0;   // GSC-GAP-RSA-1FEN ($2,000)
    const rsaFenceKm = enableRsa ? Math.max(0, Number(baseConfig.rsaFenceKm) || 0) : 0;                     // GSC-GAP-RSA-100KM / 10KM / 1KM
    const swmRpmUnits = enableRsa ? Math.max(0, Number(baseConfig.swmRpmUnits) || 0) : 0;                   // GSC-1PSWM-RPMII ($6,500 per 5 units)
    const swmRpmBlocks = swmRpmUnits > 0 ? Math.ceil(swmRpmUnits / 5) : 0;

    // Auto-escalate RSA Base Tier if RSA tracking sensors are specified with rsaTier === 'none'
    let effectiveRsaTier = rsaTier;
    const hasRsaSensors = rsaShortRangeSensors > 0 || rsaRadars > 0 || rsaFenceControllers > 0 || rsaFenceKm > 0;
    if (hasRsaSensors && (effectiveRsaTier === 'none' || effectiveRsaTier === 'standard')) {
      if (rsaShortRangeSensors <= 20 && rsaRadars <= 5 && rsaFenceControllers <= 1 && rsaFenceKm <= 10) {
        effectiveRsaTier = 'pro';
      } else {
        effectiveRsaTier = 'enterprise';
      }
    } else if (
      effectiveRsaTier === 'pro' &&
      (rsaShortRangeSensors > 20 || rsaRadars > 5 || rsaFenceControllers > 1 || rsaFenceKm > 10)
    ) {
      effectiveRsaTier = 'enterprise';
    }

    const genericSdkConnections = enablePartnerSdks ? Math.max(0, Number(baseConfig.genericSdkConnections) || 0) : 0;
    const elevatorDispatchSystems = enableBuildingPsim ? Math.max(0, Number(baseConfig.elevatorDispatchSystems) || 0) : 0;
    const opcServerSystems = enableBuildingPsim ? Math.max(0, Number(baseConfig.opcServerSystems) || 0) : 0;
    const missionControlOperators = enableBuildingPsim ? Math.max(0, Number(baseConfig.missionControlOperators) || 0) : 0;

    // Determine effective Security Center 5.13 / 5.14 Unified Base Tier
    let effectiveTier = baseConfig.tierMode || 'auto';
    const requiresEnterpriseFeatures =
      coreFailover !== 'none' ||
      failoverCameraQty > 0 ||
      standbyServerCount > 0 ||
      federationSites > 0 ||
      federationSmallSites > 0 ||
      stratocastFedSites > 0 ||
      globalCardholderSystems > 0 ||
      dvrNvrChannels > 0 ||
      elevatorDispatchSystems > 0 ||
      opcServerSystems > 0 ||
      keyCabinetCount > 0 ||
      missionControlOperators > 0 ||
      cardSyncLicenseBlocks > 0 ||
      idemiaMorphoEnabled ||
      medecoXtLocks > 0 ||
      swmRpmBlocks > 0 ||
      effectiveRsaTier === 'pro' ||
      effectiveRsaTier === 'enterprise';

    if (effectiveTier === 'auto') {
      if (
        totalVideoConnections > 0 &&
        totalVideoConnections <= 32 &&
        totalSynergisReaders <= 32 &&
        hasSv300AioInBom &&
        !requiresEnterpriseFeatures &&
        activeArchiverRoles <= 1
      ) {
        effectiveTier = 'aio';
      } else if (
        (totalVideoConnections > 0 || totalSynergisReaders > 0) &&
        totalVideoConnections <= 100 &&
        totalSynergisReaders <= 100 &&
        activeArchiverRoles <= 1 &&
        workstationClients <= 25 &&
        !requiresEnterpriseFeatures
      ) {
        effectiveTier = 'standard';
      } else {
        effectiveTier = 'enterprise';
      }
    }

    // Compatibility & Tier Constraint Warnings (ProductCompatability.pdf & Genetec Licensing.xls)
    const compatibilityWarnings = [];
    if (effectiveTier === 'aio') {
      if (totalVideoConnections > 32) {
        compatibilityWarnings.push(`Streamvault All-in-One Tier (GSC-SV-AIO-1C) is capped at 32 camera connections maximum (current: ${totalVideoConnections}). Switch to Standard (GSC-BASE-S) or Enterprise (GSC-BASE-E).`);
      }
      if (requiresEnterpriseFeatures) {
        compatibilityWarnings.push(`Streamvault All-in-One Tier does not support Core Failover, Standby Archiver Failover, Federation, or Enterprise Plugins. Enterprise Base Package (GSC-BASE-E) is required.`);
      }
    } else if (effectiveTier === 'standard') {
      if (totalVideoConnections > 100) {
        compatibilityWarnings.push(`Security Center Base Standard Package (GSC-BASE-S) is capped at 100 camera connections maximum (current: ${totalVideoConnections}). Switch to Enterprise (GSC-BASE-E).`);
      }
      if (totalSynergisReaders > 100) {
        compatibilityWarnings.push(`Security Center Base Standard Package (GSC-BASE-S) is capped at 100 reader connections maximum (current: ${totalSynergisReaders}). Switch to Enterprise (GSC-BASE-E).`);
      }
      if (activeArchiverRoles > 1) {
        compatibilityWarnings.push(`Security Center Base Standard Package (GSC-BASE-S) supports 1 Archiver role maximum (current design requires ${activeArchiverRoles} Archiver roles). Switch to Enterprise (GSC-BASE-E) for multi-Archiver support.`);
      }
      if (workstationClients > 25) {
        compatibilityWarnings.push(`Security Center Base Standard Package (GSC-BASE-S) includes 25 concurrent client connections (requested: ${workstationClients}). Switch to Enterprise (GSC-BASE-E) for Unlimited Client Site Login License at $0.00.`);
      }
      if (requiresEnterpriseFeatures) {
        compatibilityWarnings.push(`Security Center Base Standard Package (GSC-BASE-S) does not support Core Failover, Standby Archiver Failover, Digital Video Recorder inputs, Federation, or Enterprise Plugins. Switch to Enterprise (GSC-BASE-E).`);
      }
    }

    // SQL Server 2025 Express (50 GB Cap, Included Default, Not on BOM) vs SQL Server Standard
    // Triggered when Core Failover = Full OR Mission Control 3.4.1.0 is active (Incident Document Service migrated to SQL Server: ~150 KB/incident = ~150 GB/yr)
    const sqlExpressMaxGb = 50;
    const missionControlSqlFootprintGb = missionControlOperators > 0 ? 55 : 0;
    const estimatedSqlDbGb = Math.round(
      (0.5 + (totalVideoConnections * 0.03) + (totalSynergisReaders * 0.06) + (effectiveLprCameras * 0.45) + (clearIdIdentities * 0.0005) + (supremaDevices * 0.02) + (intrusionPanels * 0.15) + missionControlSqlFootprintGb) * 10
    ) / 10;
    const needsSqlStandard = coreFailover === 'full' || missionControlOperators > 0;
    if (!needsSqlStandard && estimatedSqlDbGb > sqlExpressMaxGb) {
      compatibilityWarnings.push(`Estimated Microsoft SQL Server database footprint (~${estimatedSqlDbGb} GB) approaches or exceeds the 50 GB SQL Server 2025 Express cap. Consider setting Core Failover to Full (Microsoft SQL Server Standard) or reducing event retention.`);
    }
    if (supremaDevices > 0 && totalSynergisReaders < supremaDevices) {
      compatibilityWarnings.push(`Suprema Integration Rule (Page 16): Each Suprema device assigned to a door as a reader requires 1 Synergis Reader License (GSC-Sy-X-1R or GSC-Sy-X-1RE). You have ${supremaDevices} Suprema device(s) configured alongside ${totalSynergisReaders} total Synergis reader license(s).`);
    }
    // DMP Intrusion Panel Extension 4.5.0 Rules (EN.DMP Intrusion Panel Extension Guide 4.5.0.pdf)
    const intrusionManagerRolesRequired = intrusionPanels > 0 ? Math.ceil(intrusionPanels / 100) : 0;
    if (intrusionPanels > 2000) {
      compatibilityWarnings.push(`DMP Intrusion Panel Extension 4.5.0 Limit: Maximum 2,000 DMP panels (20 Intrusion Manager roles × 100 panels/role) supported per Security Center Directory (${intrusionPanels} panels configured).`);
    }
    if (intrusionPanelManufacturer === 'dmp' && intrusionPanels > 0 && totalSynergisReaders === 0) {
      compatibilityWarnings.push(`DMP Intrusion Panel Extension 4.5.0 Advisory: Synchronizing Security Center cardholders/credentials to DMP panels (via Wiegand H10302 37-bit format) requires Synergis Access Control; linking cameras to DMP intrusion areas requires Omnicast Pro/Enterprise. Note: DMP XR150FC/XR550FC FIRE keypads are incompatible.`);
    }
    // AutoVu ALPR Manager Role Limit (EN.Security Center Administrator Guide 5.14.pdf: max 100 AutoVu units per ALPR Manager role)
    const alprManagerRolesRequired = effectiveLprCameras > 0 ? Math.ceil(effectiveLprCameras / 100) : 0;
    // Federation Role Group Limit (EN.Security Center Administrator Guide 5.14.pdf: max 100 Federation roles per group, up to 500 sites/server)
    const totalFederatedSites = federationSites + federationSmallSites + stratocastFedSites;
    const federationRoleGroupsRequired = totalFederatedSites > 0 ? Math.ceil(totalFederatedSites / 100) : 0;
    if (totalFederatedSites > 500) {
      compatibilityWarnings.push(`Security Center 5.14 Federation Limit (Administrator Guide 5.14): A single High-Capacity Federation host supports up to 500 federated remote sites across 5 Federation Role Groups (${totalFederatedSites} remote sites configured).`);
    }

    // Bundled Features Included at $0.00 in Security Center 5.13 / 5.14 Unified Base Package
    const includedBaseFeatures = effectiveTier === 'standard'
      ? [
          { label: 'Omnicast Standard Video Base Package (Up to 100 Cameras, 1 Archiver Role)' },
          { label: 'Synergis Standard Access Control Base Package (Up to 100 Readers, 1 Access Manager, Badge Designer)' },
          { label: 'AutoVu Standard License Plate Recognition Base Package & Sipelia Communications Base' },
          { label: '25 Concurrent Security Desk Client Connections & Plan Manager Basic Interactive Maps' },
          { label: '1 Active Directory Single Sign-On Connection & Microsoft SQL Server 2025 Express (50 GB Cap)' }
        ]
      : [
          { label: 'Omnicast Enterprise Video Base Package (Unlimited Cameras, Multi-Archiver, Auxiliary Archiving, Media Router)' },
          { label: 'Synergis Enterprise Access Control Base Package (Unlimited Readers, Access Managers & Badge Designer)' },
          { label: 'AutoVu Standard License Plate Recognition Base Package & Sipelia Communications Base' },
          { label: 'Unlimited Security Desk & Web Client Site Login License (GSC-1STU Included at $0.00)' },
          { label: 'Standby Archiver Failover Camera Connections (GSC-Om-E-1FC Included at $0.00)' },
          { label: 'Failover Directory Role (GSC-1FOD Included at $0.00) & Threat Level Management Module' },
          { label: 'Plan Manager Advanced Geographic Information System (GIS) Maps with Unlimited Entities' },
          { label: 'Unlimited Active Directory & Active Directory Federation Services (ADFS) Single Sign-On' }
        ];

    // Build Itemized License Bill of Materials
    const lineItems = [];
    const addLineItem = (sku, model, categoryLabel, qty, unitMsrp, catalogId, notes, isIncludedZeroCost = false) => {
      if (qty <= 0) return;
      lineItems.push({
        sku,
        model,
        categoryLabel,
        qty,
        unitMsrp,
        extendedMsrp: qty * unitMsrp,
        catalogId,
        notes: notes || '',
        isIncludedZeroCost
      });
    };

    const hasAnySystemEntities =
      totalVideoConnections > 0 ||
      totalSynergisReaders > 0 ||
      effectiveLprCameras > 0 ||
      effectiveSipIntercoms > 0 ||
      sipTrunks > 0 ||
      intrusionPanels > 0 ||
      supremaSdkConnections > 0 ||
      idemiaMorphoEnabled ||
      controlIdBridgeServers > 0 ||
      princetonIdentityServers > 0 ||
      cardSyncLicenseBlocks > 0 ||
      globalCardholderSystems > 0 ||
      federationSites > 0 ||
      federationSmallSites > 0 ||
      stratocastFedSites > 0 ||
      clearIdIdentities > 0 ||
      clearIdKiosks > 0 ||
      idScannerClients > 0 ||
      xpressEntryServers > 0 ||
      medecoXtLocks > 0 ||
      briefCamConnections > 0 ||
      corsightAiBridges > 0 ||
      winGuardNodes > 0 ||
      hasRsaSensors ||
      swmRpmBlocks > 0 ||
      genericSdkConnections > 0 ||
      Object.values(activePartnerSdks).some(v => (Number(v) || 0) > 0);

    // 1. Unified Base Package (GSC-BASE-S or GSC-BASE-E at $0.00), Core Failover, Clients, Federation & Cardholder Sync
    if (hasAnySystemEntities) {
      if (effectiveTier === 'standard') {
        addLineItem(
          'GSC-BASE-S',
          'Genetec Security Center Unified Base Standard Package (Version 5.13 / 5.14)',
          'Base Package, Federation & Cardholder Sync',
          1,
          0,
          'genetec-gsc-base-s-513',
          'Includes Omnicast Standard (up to 100 cameras, 1 Archiver), Synergis Standard (up to 100 readers, 1 Access Manager, Badge Designer), AutoVu Standard Base, 25 Clients, 1 Active Directory connection, and Plan Manager Basic Maps',
          true
        );
      } else if (effectiveTier === 'enterprise') {
        addLineItem(
          'GSC-BASE-E',
          'Genetec Security Center Unified Base Enterprise Package (Version 5.13 / 5.14)',
          'Base Package, Federation & Cardholder Sync',
          1,
          0,
          'genetec-gsc-base-e-513',
          'Includes Omnicast Enterprise, Synergis Enterprise, AutoVu Standard Base, Standby Failover Cameras, Failover Directory Role, Unlimited Client Site Login License, Unlimited Active Directory, Plan Manager Advanced Maps, and Threat Level Module',
          true
        );
      }
    }

    // Core Failover & Microsoft SQL Server Database Edition
    // NOTE: SQL Server 2025 Express is NOT listed on the BOM; only SQL Server Standard (7NQ-01025) is added when Core Failover = Full.
    if (coreFailover === 'directory_only') {
      addLineItem(
        'GSC-1FOD',
        'Genetec Security Center Failover Directory Role (Directory Only — Backup and Restore)',
        'Core Failover & SQL Server Database',
        1,
        0,
        'genetec-gsc-1fod',
        'Included at $0.00 in Enterprise Base Package (GSC-BASE-E) — Automated Directory Backup and Restore synchronization; Microsoft SQL Server 2025 Express (50 GB Cap) stays in play (not listed on BOM)',
        true
      );
    } else if (coreFailover === 'full') {
      addLineItem(
        'GSC-1FOD',
        'Genetec Security Center Failover Directory Role (Full Core High Availability)',
        'Core Failover & SQL Server Database',
        1,
        0,
        'genetec-gsc-1fod',
        'Included at $0.00 in Enterprise Base Package (GSC-BASE-E) — Full Core Directory and Microsoft SQL Server Standard High-Availability failover',
        true
      );
    }

    if (needsSqlStandard) {
      addLineItem(
        '7NQ-01025',
        'Microsoft SQL Server Standard Edition (Server + 5 Client Access Licenses — Full Core Failover)',
        'Core Failover & SQL Server Database',
        1,
        1418,
        'ms-sql-svr-2022-std-4c',
        `Required because Core Failover is set to Full (Estimated database size: ~${estimatedSqlDbGb} GB; unlocks SQL High-Availability Clustering and removes 50 GB Express cap)`
      );
    }

    // Operator Workstation, Web & Mobile Application Client Connections
    const freeClientsIncluded = effectiveTier === 'enterprise' ? 999999 : effectiveTier === 'standard' ? 25 : 5;
    const extraClients = Math.max(0, workstationClients - freeClientsIncluded);
    if (extraClients > 0) {
      if (extraClients >= 40) {
        addLineItem(
          'GSC-1STU',
          'Genetec Security Center — Unlimited Security Desk & Web Client Site Login License',
          'Base Package, Federation & Cardholder Sync',
          1,
          12000,
          'genetec-gsc-1stu-site',
          `Site license is more cost-effective than ${extraClients} individual $300 client licenses`
        );
      } else {
        addLineItem(
          'GSC-1U',
          'Genetec Security Desk Workstation — 1 Additional Concurrent User Connection',
          'Base Package, Federation & Cardholder Sync',
          extraClients,
          300,
          'genetec-gsc-1u-client',
          `${workstationClients} total Security Desk workstations requested (first ${freeClientsIncluded} included in Base Package)`
        );
      }
    }

    if (webClients > 0 && effectiveTier !== 'enterprise') {
      addLineItem(
        'GSC-1WU',
        'Genetec Security Center Web Client — 1 Concurrent User Connection',
        'Base Package, Federation & Cardholder Sync',
        webClients,
        200,
        'genetec-gsc-1wu',
        'Browser-based Security Center Web Client connection (included at $0.00 in Enterprise Site Login License)'
      );
    }

    if (mobileClients > 0) {
      if (mobileClients >= 40) {
        addLineItem(
          'GSC-1MobileSTU',
          'Genetec Security Center — Unlimited Mobile Application Site License',
          'Base Package, Federation & Cardholder Sync',
          1,
          10000,
          'genetec-gsc-1mobilestu',
          `Unlimited Genetec Mobile iOS/Android connections (${mobileClients} users requested; Site License caps cost at $10,000)`
        );
      } else {
        addLineItem(
          'GSC-1MobileU',
          'Genetec Mobile Application — 1 Concurrent User Connection',
          'Base Package, Federation & Cardholder Sync',
          mobileClients,
          250,
          'genetec-gsc-1mobileu',
          'iOS and Android Genetec Mobile application connection ($250.00 per concurrent user)'
        );
      }
    }

    // Multi-Site Federation & Global Cardholder Synchronizer / Card Synchronization Plugin (Main System & Core)
    if (federationSites > 0) {
      addLineItem(
        'GSC-1SCFED',
        'Genetec Security Center Federation Remote Site Connection (Over 20 Entities)',
        'Base Package, Federation & Cardholder Sync',
        federationSites,
        1000,
        'genetec-federation',
        'Federated remote Security Center Directory connection with more than 20 cameras or readers'
      );
    }
    if (federationSmallSites > 0) {
      addLineItem(
        'GSC-1SCFED-20',
        'Genetec Security Center Federation Remote Site Connection (20 Entities or Fewer)',
        'Base Package, Federation & Cardholder Sync',
        federationSmallSites,
        600,
        'genetec-federation-20',
        'Federated remote Security Center Directory connection with 20 or fewer cameras or readers'
      );
    }
    if (stratocastFedSites > 0) {
      addLineItem(
        'GSC-Om-E-1CCFED',
        'Genetec Omnicast Stratocast Hybrid Cloud Site Federation Connection',
        'Base Package, Federation & Cardholder Sync',
        stratocastFedSites,
        125,
        'genetec-stratocast-fed',
        'Federation connection for a remote site using Stratocast cloud-connected cameras'
      );
    }
    if (globalCardholderSystems > 0) {
      if (globalCardholderSystems >= 40) {
        addLineItem(
          'GSC-SY-E-1GCHMSTU',
          'Genetec Synergis Enterprise — Global Cardholder Synchronizer Unlimited Site License',
          'Base Package, Federation & Cardholder Sync',
          1,
          78000,
          'genetec-sy-e-1gchmstu',
          `Unlimited Global Cardholder Management site license (${globalCardholderSystems} remote systems requested; caps cost at $78,000)`
        );
      } else {
        addLineItem(
          'GSC-Sy-E-1GCHM',
          'Genetec Synergis Enterprise — Global Cardholder Synchronizer (1 Remote Security Center System)',
          'Base Package, Federation & Cardholder Sync',
          globalCardholderSystems,
          1950,
          'genetec-sy-e-1gchm',
          'Synchronizes cardholders, credentials, and access groups across independent Security Center systems ($1,950.00 per remote system)'
        );
      }
    }
    if (cardSyncLicenseBlocks > 0) {
      addLineItem(
        'GSC-1PSINGLECARD',
        'Genetec Security Center — Card Synchronization Plugin (Per 2 External Data Sources)',
        'Base Package, Federation & Cardholder Sync',
        cardSyncLicenseBlocks,
        4000,
        'genetec-plugin-card-sync',
        `Synchronizes cardholders, credentials, and access rules from ${cardSyncDataSources} external SQL/CSV/Oracle/Active Directory/HR data source(s) (1 license per 2 data sources)`
      );
    }

    // 2. Omnicast Video, Sipelia Intercom, AutoVu LPR & Cloud Archives
    if (cameraUnits > 0) {
      if (effectiveTier === 'aio') {
        addLineItem(
          'GSC-SV-AIO-1C',
          'Genetec Streamvault All-in-One — 1 IP Camera Connection License',
          'Video, Intercom, LPR & Cloud Archives',
          cameraUnits,
          120,
          'genetec-gsc-sv-aio-1c',
          'Streamvault SV-100E / SV-300E All-in-One IP camera connection (up to 32 cameras)'
        );
      } else if (effectiveTier === 'standard') {
        addLineItem(
          'GSC-Om-S-1C',
          'Genetec Omnicast Standard — 1 IP Camera Connection License',
          'Video, Intercom, LPR & Cloud Archives',
          cameraUnits,
          200,
          'genetec-gsc-om-s-1c',
          '1 license per IP camera or single-IP multi-sensor camera'
        );
      } else {
        addLineItem(
          'GSC-Om-E-1C',
          'Genetec Omnicast Enterprise — 1 IP Camera Connection License',
          'Video, Intercom, LPR & Cloud Archives',
          cameraUnits,
          325,
          'genetec-gsc-1cam-lic',
          '1 license per IP camera or single-IP multi-sensor camera'
        );
      }
    }

    if (analogEncoderChannels > 0) {
      if (effectiveTier === 'aio') {
        addLineItem(
          'GSC-SV-AIO-1PAC',
          'Genetec Streamvault All-in-One — 1 Analog Video Encoder Channel Connection',
          'Video, Intercom, LPR & Cloud Archives',
          analogEncoderChannels,
          36,
          'genetec-gsc-sv-aio-1pac',
          '1 license per analog camera channel on a supported encoder (Streamvault All-in-One)'
        );
      } else if (effectiveTier === 'standard') {
        addLineItem(
          'GSC-OM-S-1PAC',
          'Genetec Omnicast Standard — 1 Analog Video Encoder Channel Connection',
          'Video, Intercom, LPR & Cloud Archives',
          analogEncoderChannels,
          60,
          'genetec-gsc-om-s-1pac',
          '1 license per analog camera channel on a supported encoder'
        );
      } else {
        addLineItem(
          'GSC-OM-E-1PAC',
          'Genetec Omnicast Enterprise — 1 Analog Video Encoder Channel Connection',
          'Video, Intercom, LPR & Cloud Archives',
          analogEncoderChannels,
          100,
          'genetec-gsc-om-e-1pac',
          '1 license per analog camera channel on a supported encoder'
        );
      }
    }

    if (dvrNvrChannels > 0) {
      addLineItem(
        'GSC-Om-E-1DV',
        'Genetec Omnicast Enterprise — 1 Digital Video Recorder / Network Video Recorder Input Channel',
        'Video, Intercom, LPR & Cloud Archives',
        dvrNvrChannels,
        130,
        'genetec-gsc-om-e-1dv',
        'Third-party Digital Video Recorder or Network Video Recorder camera channel ingestion'
      );
    }

    if (failoverCameraQty > 0) {
      addLineItem(
        'GSC-Om-E-1FC',
        'Genetec Omnicast Enterprise — Standby Archiver Failover Camera Connections',
        'Video, Intercom, LPR & Cloud Archives',
        failoverCameraQty,
        0,
        'genetec-gsc-failover-1cam',
        'Included at $0.00 in Enterprise Base Package (GSC-BASE-E) — Hot-standby Archiver failover across camera channels',
        true
      );
    }

    if (standbyServerCount > 0) {
      addLineItem(
        'GSC-StandbyServer',
        'Genetec Security Center — Standby Server License (Third-Party High-Availability Clustering)',
        'Video, Intercom, LPR & Cloud Archives',
        standbyServerCount,
        1500,
        'genetec-gsc-standby-svr',
        'Required when deploying Security Center with third-party Windows Failover Clustering or NEC ExpressCluster'
      );
    }

    // Sipelia Communications Management (Standard vs Advanced vs Unified 5.13)
    if (effectiveSipIntercoms > 0 || (sipTrunks > 0 && sipeliaMode !== 'unified_513')) {
      if (sipeliaMode === 'standard') {
        addLineItem(
          'GSC-Sipelia-Base',
          'Genetec Sipelia Communications Management — Base Package',
          'Video, Intercom, LPR & Cloud Archives',
          1,
          1500,
          'genetec-sipelia-base',
          'Sipelia Communications Management Base Package ($1,500.00)'
        );
        if (effectiveSipIntercoms > 0) {
          addLineItem(
            'GSC-Sipelia-1SIP-STD',
            'Genetec Sipelia Standard — 1 Session Initiation Protocol (SIP) Intercom Station Connection',
            'Video, Intercom, LPR & Cloud Archives',
            effectiveSipIntercoms,
            160,
            'genetec-sipelia-1sip-std',
            'Sipelia Standard SIP intercom station connection ($160.00 per station)'
          );
        }
      } else if (sipeliaMode === 'advanced') {
        addLineItem(
          'GSC-Sipelia-Base',
          'Genetec Sipelia Communications Management — Base Package',
          'Video, Intercom, LPR & Cloud Archives',
          1,
          1500,
          'genetec-sipelia-base',
          'Sipelia Communications Management Base Package ($1,500.00)'
        );
        if (effectiveSipIntercoms > 0) {
          addLineItem(
            'GSC-Sipelia-1SIP-STD',
            'Genetec Sipelia Standard — 1 Session Initiation Protocol (SIP) Intercom Station Connection',
            'Video, Intercom, LPR & Cloud Archives',
            effectiveSipIntercoms,
            160,
            'genetec-sipelia-1sip-std',
            'Required base intercom connection for Sipelia Advanced (STD and ADV counts must match per Sipelia User Guide Page 10)'
          );
          addLineItem(
            'GSC-Sipelia-1SIP-ADV',
            'Genetec Sipelia Advanced — 1 Intercom Station Add-On (Failover & Call Recording)',
            'Video, Intercom, LPR & Cloud Archives',
            effectiveSipIntercoms,
            100,
            'genetec-sipelia-1sip-adv',
            'Unlocks Sipelia server failover and bidirectional audio/video intercom call recording ($100.00 per station)'
          );
        }
      } else if (effectiveSipIntercoms > 0) {
        addLineItem(
          'GSC-SIPELIA-1SIP',
          'Genetec Sipelia Communications Management — 1 Unified 5.11–5.14 SIP Intercom Station Connection',
          'Video, Intercom, LPR & Cloud Archives',
          effectiveSipIntercoms,
          250,
          'genetec-sipelia-1sip',
          'Unified SC 5.11–5.14 Sipelia SKU ($250/SIP device per Sipelia User Guide 2.14.0.0): Includes Sipelia Base plugin, bidirectional audio/video call recording, failover, SIP trunking, and Public Address (PA) without separate legacy SKUs. Native SIP video max 720p (enroll 1080p+ intercom cameras as Security Center video units).'
        );
      }
    }

    if (sipTrunks > 0) {
      if (sipeliaMode === 'unified_513') {
        addLineItem(
          'GSC-Sipelia-1Trunk',
          'Genetec Sipelia Communications Management — SIP Trunk Connection (Included in Unified GSC-SIPELIA-1SIP)',
          'Video, Intercom, LPR & Cloud Archives',
          sipTrunks,
          0,
          'genetec-sipelia-1trunk',
          'Included at $0.00 in Unified SC 5.11–5.14 Sipelia licensing (GSC-SIPELIA-1SIP per Sipelia User Guide 2.14.0.0)',
          true
        );
      } else {
        addLineItem(
          'GSC-Sipelia-1Trunk',
          'Genetec Sipelia Communications Management — 1 Session Initiation Protocol (SIP) Trunk Connection',
          'Video, Intercom, LPR & Cloud Archives',
          sipTrunks,
          550,
          'genetec-sipelia-1trunk',
          'SIP Trunk connection to external VoIP PBX or hardware intercom server (Legacy SC 5.10 / Standard-Advanced licensing)'
        );
      }
    }

    if (sipPublicAddress > 0) {
      if (sipeliaMode === 'unified_513') {
        addLineItem(
          'GSC-SIPELIA-1PA',
          'Genetec Sipelia Communications Management — Public Address (PA) Connection (Included in Unified GSC-SIPELIA-1SIP)',
          'Video, Intercom, LPR & Cloud Archives',
          sipPublicAddress,
          0,
          'genetec-sipelia-1pa',
          'Included at $0.00 in Unified SC 5.11–5.14 Sipelia licensing (GSC-SIPELIA-1SIP per Sipelia User Guide 2.14.0.0)',
          true
        );
      } else {
        addLineItem(
          'GSC-SIPELIA-1PA',
          'Genetec Sipelia Communications Management — 1 Public Address (PA) System Connection',
          'Video, Intercom, LPR & Cloud Archives',
          sipPublicAddress,
          550,
          'genetec-sipelia-1pa',
          'Public Address voice paging connection per system (Legacy SC 5.10 / Standard-Advanced licensing)'
        );
      }
    }

    if (effectiveLprCameras > 0) {
      addLineItem(
        'GSC-Av-S-1SHP',
        'Genetec AutoVu Fixed Sharp License Plate Recognition — 1 Camera Connection License',
        'Video, Intercom, LPR & Cloud Archives',
        effectiveLprCameras,
        500,
        'genetec-autovu-1shp',
        'Fixed License Plate Recognition camera stream connection (AutoVu Standard Base included at $0.00 in Base Package)'
      );
    }

    if (enableCloudServices) {
      if (Number(baseConfig.cloudArchiveTb) > 0) {
        const caTb = Number(baseConfig.cloudArchiveTb);
        if (baseConfig.cloudArchiveTier === 'long_term' || baseConfig.cloudArchiveTier === 'longterm') {
          addLineItem('SCS-CSA-USA-1TB-1Y', 'Genetec Omnicast Cloud Archive Storage — 1 TB Long-Term Tier (1-Year Subscription)', 'Video, Intercom, LPR & Cloud Archives', caTb, 122, 'genetec-cloud-lt-1tb', 'Long-term cloud video archive storage (minimum 180 days retention)');
        } else {
          addLineItem('SCS-CSP-USA-1TB-1Y', 'Genetec Omnicast Cloud Archive Storage — 1 TB Performance Tier (1-Year Subscription)', 'Video, Intercom, LPR & Cloud Archives', caTb, 257, 'genetec-cloud-perf-1tb', 'Performance tier cloud video archive storage (minimum 30 days retention)');
        }
      }
      const clearanceQty = Number(baseConfig.clearanceCameras) || (baseConfig.clearanceEnabled ? cameraUnits : 0);
      if (clearanceQty > 0) {
        addLineItem('CLR-1CCST1-US-1Y', 'Genetec Clearance Digital Evidence Management — 1 Camera Subscription (1-Year)', 'Video, Intercom, LPR & Cloud Archives', clearanceQty, 24, 'genetec-clearance-1cam-1y', 'Includes unlimited user accounts, unlimited cases, and 1 GB cloud storage per camera');
      }
    }

    // 3. Synergis Access Control Readers, Biometrics, ClearID & Key Management
    if (synergisGenetecReaders > 0) {
      if (effectiveTier === 'aio') {
        addLineItem(
          'GSC-SV-AIO-1R',
          'Genetec Streamvault All-in-One — 1 Synergis Access Control Reader Connection',
          'Synergis Access Control, Biometrics & Identity',
          synergisGenetecReaders,
          175,
          'genetec-gsc-sv-aio-1r',
          'Synergis reader connection for Streamvault All-in-One Appliances (SV-100E & SV-300E)'
        );
      } else if (effectiveTier === 'standard') {
        addLineItem(
          'GSC-SY-S-1RE',
          'Genetec Synergis Standard — 1 Reader Connection (Hardware Purchased from Genetec)',
          'Synergis Access Control, Biometrics & Identity',
          synergisGenetecReaders,
          65,
          'genetec-gsc-sy-s-1re',
          'Discounted reader connection for Synergis Cloud Link, Axis Powered by Genetec, and Mercury hardware sold by Genetec'
        );
      } else {
        addLineItem(
          'GSC-SY-E-1RE',
          'Genetec Synergis Enterprise — 1 Reader Connection (Hardware Purchased from Genetec)',
          'Synergis Access Control, Biometrics & Identity',
          synergisGenetecReaders,
          125,
          'genetec-gsc-sy-e-1re',
          'Discounted reader connection for Synergis Cloud Link, Axis Powered by Genetec, and Mercury hardware sold by Genetec'
        );
      }
    }

    if (synergisExternalReaders > 0) {
      if (effectiveTier === 'aio') {
        addLineItem(
          'GSC-SV-AIO-1R',
          'Genetec Streamvault All-in-One — 1 Synergis Access Control Reader Connection (Third-Party Hardware)',
          'Synergis Access Control, Biometrics & Identity',
          synergisExternalReaders,
          175,
          'genetec-gsc-sv-aio-1r',
          'Synergis reader connection for Streamvault All-in-One Appliances'
        );
      } else if (effectiveTier === 'standard') {
        addLineItem(
          'GSC-Sy-S-1R',
          'Genetec Synergis Standard — 1 External Reader Connection (Third-Party Hardware)',
          'Synergis Access Control, Biometrics & Identity',
          synergisExternalReaders,
          175,
          'genetec-gsc-sy-s-1r',
          'External reader connection when controller hardware is not purchased from Genetec'
        );
      } else {
        addLineItem(
          'GSC-Sy-E-1R',
          'Genetec Synergis Enterprise — 1 External Reader Connection (Third-Party Hardware)',
          'Synergis Access Control, Biometrics & Identity',
          synergisExternalReaders,
          260,
          'genetec-gsc-sy-e-1r',
          'External reader connection when controller hardware is not purchased from Genetec'
        );
      }
    }

    if (supremaSdkConnections > 0) {
      addLineItem(
        'GSC-1SDK-SUPREMA-READ',
        'Genetec Software Development Kit Connection — Suprema Plugin for Genetec (Biometric Reader & Device Integration)',
        'Synergis Access Control, Biometrics & Identity',
        supremaSdkConnections,
        250,
        'genetec-sdk-suprema-biostar',
        `Requires 3x GSC-1SDK-SUPREMA-READ per Server (${supremaPluginServers} server(s) × 3 = ${supremaSdkConnections} licenses; 1 license = 2 connections covering 2 Config Tool + 1 Security Desk + 1 Suprema Extractor Plugin + 1 Suprema Device Plugin supporting up to 4 Cloud Links / 256 devices per Suprema Guide Page 16). Also requires Suprema INT_GEN_GSC plugin license, 1x GSC-Sy-X-1R(E) per door reader (${supremaDevices} Suprema devices), and ${supremaCloudLinksNeeded} dedicated Synergis Cloud Link(s) (<=50 Suprema devices per Cloud Link with RIO enabled).`
      );
    }

    if (idemiaMorphoEnabled) {
      addLineItem(
        'GSC-1PMORPHOBIOMETRICS',
        'Genetec Security Center — IDEMIA MorphoManager Biometrics Integration Plugin',
        'Synergis Access Control, Biometrics & Identity',
        1,
        2500,
        'genetec-plugin-morpho-biometrics',
        'Native cardholder & biometric template synchronization for IDEMIA MorphoWave Compact/XP, Sigma, and VisionPass ($2,500.00 per system)'
      );
    }

    if (controlIdBridgeServers > 0) {
      addLineItem(
        'GSC-1SDK-CONTROLID-IDBRIDGE',
        'Genetec Software Development Kit Connection — Control iD iDBridge Access & Biometric Integration',
        'Synergis Access Control, Biometrics & Identity',
        controlIdBridgeServers,
        250,
        'genetec-sdk-controlid-idbridge',
        '1 SDK connection per Control iD iDBridge middleware server synchronizing iDFace / iDAccess Pro / iDBlock readers'
      );
    }

    if (princetonIdentityServers > 0) {
      addLineItem(
        'GSC-1SDK-PRINCETONIDENTITY-ACS',
        'Genetec Software Development Kit Connection — Princeton Identity Access Control Suite (Iris & Face)',
        'Synergis Access Control, Biometrics & Identity',
        princetonIdentityServers,
        250,
        'genetec-sdk-princeton-identity',
        '1 SDK connection per Princeton Identity Access Control Suite server managing IOM Access200 iris/face readers'
      );
    }

    if (clearIdIdentities > 0) {
      let cidTier = 't1';
      if (clearIdIdentities >= 100000) cidTier = 't4';
      else if (clearIdIdentities >= 50000) cidTier = 't3';
      else if (clearIdIdentities >= 20000) cidTier = 't2';

      const cidTable = {
        t1: {
          1: { sku: 'CID-IDENTITY-1Y', msrp: 7, id: 'genetec-clearid-id-1y-t1', range: '1–19,999 Identities' },
          3: { sku: 'CID-IDENTITY-3Y', msrp: 18.06, id: 'genetec-clearid-id-3y-t1', range: '1–19,999 Identities' },
          5: { sku: 'CID-IDENTITY-5Y', msrp: 28, id: 'genetec-clearid-id-5y-t1', range: '1–19,999 Identities' }
        },
        t2: {
          1: { sku: 'CID-IDENTITY-1Y', msrp: 5, id: 'genetec-clearid-id-1y-t2', range: '20,000–49,999 Identities' },
          3: { sku: 'CID-IDENTITY-3Y', msrp: 12.90, id: 'genetec-clearid-id-3y-t2', range: '20,000–49,999 Identities' },
          5: { sku: 'CID-IDENTITY-5Y', msrp: 20, id: 'genetec-clearid-id-5y-t2', range: '20,000–49,999 Identities' }
        },
        t3: {
          1: { sku: 'CID-IDENTITY-1Y', msrp: 4, id: 'genetec-clearid-id-1y-t3', range: '50,000–99,999 Identities' },
          3: { sku: 'CID-IDENTITY-3Y', msrp: 10.32, id: 'genetec-clearid-id-3y-t3', range: '50,000–99,999 Identities' },
          5: { sku: 'CID-IDENTITY-5Y', msrp: 16, id: 'genetec-clearid-id-5y-t3', range: '50,000–99,999 Identities' }
        },
        t4: {
          1: { sku: 'CID-IDENTITY-1Y', msrp: 2.50, id: 'genetec-clearid-id-1y-t4', range: '100,000+ Identities' },
          3: { sku: 'CID-IDENTITY-3Y', msrp: 6.45, id: 'genetec-clearid-id-3y-t4', range: '100,000+ Identities' },
          5: { sku: 'CID-IDENTITY-5Y', msrp: 10, id: 'genetec-clearid-id-5y-t4', range: '100,000+ Identities' }
        }
      }[cidTier][advantageYears];

      addLineItem(
        cidTable.sku,
        `Genetec ClearID Physical Identity & Access Management — 1 Identity Subscription (${advantageYears}-Year • ${cidTable.range})`,
        'Synergis Access Control, Biometrics & Identity',
        clearIdIdentities,
        cidTable.msrp,
        cidTable.id,
        `Automated self-service access requests, area owner approvals, and visitor management (${cidTable.range} volume tier)`
      );
    }

    if (clearIdKiosks > 0) {
      const kioskTable = {
        1: { sku: 'CID-KIOSK-LIC-1Y', msrp: 2000, id: 'genetec-clearid-kiosk-1y' },
        3: { sku: 'CID-KIOSK-LIC-3Y', msrp: 5100, id: 'genetec-clearid-kiosk-3y' },
        5: { sku: 'CID-KIOSK-LIC-5Y', msrp: 8000, id: 'genetec-clearid-kiosk-5y' }
      }[advantageYears];
      addLineItem(
        kioskTable.sku,
        `Genetec ClearID Visitor Self-Check-In Kiosk License (${advantageYears}-Year Subscription)`,
        'Synergis Access Control, Biometrics & Identity',
        clearIdKiosks,
        kioskTable.msrp,
        kioskTable.id,
        'Visitor self-service check-in kiosk application, NDA signing, and badge printing'
      );
    }

    if (idScannerClients > 0) {
      addLineItem(
        'GSC-1PIDSCANNER',
        'Genetec Security Center — 1 Document / Passport / Driver\'s License ID Scanner Workstation Connection',
        'Synergis Access Control, Biometrics & Identity',
        idScannerClients,
        500,
        'genetec-plugin-idscanner',
        '1 license per Security Desk workstation with an attached optical/barcode/MRZ ID scanner for visitor and cardholder enrollment'
      );
    }

    if (xpressEntryServers > 0) {
      addLineItem(
        'GSC-1SDK-TELAERIS-XPRESSENTRY',
        'Genetec Software Development Kit Connection — Telaeris XpressEntry Handheld Badge & Mustering',
        'Synergis Access Control, Biometrics & Identity',
        xpressEntryServers,
        250,
        'genetec-sdk-xpressentry',
        '1 SDK connection per XpressEntry Server synchronizing cardholders, credentials, areas, and live occupancy for handheld XPID200 badge readers'
      );
    }

    if (medecoXtLocks > 0) {
      addLineItem(
        'GSC-1PMEDECOBASE',
        'Genetec Security Center — Medeco XT Intelligent Key System Base Plugin',
        'Synergis Access Control, Biometrics & Identity',
        1,
        1000,
        'genetec-plugin-medeco-base',
        'Required 1 per Security Center system when integrating Medeco XT Web Manager and programmable intelligent keys'
      );
      addLineItem(
        'GSC-1P-OFFLINELOCK-1L',
        'Genetec Security Center — 1 Offline Lock / Medeco XT Intelligent Cylinder Connection',
        'Synergis Access Control, Biometrics & Identity',
        medecoXtLocks,
        40,
        'genetec-plugin-offlinelock-1l',
        '1 license per Medeco XT electronic cylinder, padlock, or offline lock managed in Security Center ($40.00 per lock)'
      );
    }

    if (keyCabinetCount > 0) {
      addLineItem(
        'GSC-1P-KEYCABINETBASE',
        'Genetec Security Center — Key and Asset Management Base Plugin',
        'Synergis Access Control, Biometrics & Identity',
        1,
        1500,
        'genetec-plugin-keycabinet-base',
        'Required 1 per Security Center system when integrating Morse Watchmans, Traka, Deister, or SAM key cabinets'
      );
      addLineItem(
        'GSC-1PKEYWATCHER',
        'Genetec Security Center — Key Cabinet Connection (Morse Watchmans / Traka / Deister / SAM)',
        'Synergis Access Control, Biometrics & Identity',
        keyCabinetCount,
        500,
        'genetec-plugin-keycabinet-1cab',
        '1 license per intelligent key cabinet'
      );
    }

    // 4. Multi-Select Certified Partner SDKs, Video Analytics, Building/PSIM & Industrial IoT
    if (briefCamConnections > 0) {
      addLineItem(
        'GSC-1SDK-BRIEFCAM',
        'Genetec Software Development Kit Connection — BriefCam Video Synopsis & Analytics (REVIEW / RESPOND / RESEARCH)',
        'Partner SDKs, Video Analytics, PSIM & IIoT',
        briefCamConnections,
        250,
        'genetec-sdk-briefcam',
        'Per-connection BriefCam SDK license (Default: 4 connections = 1 VSServer + 1 per Fetching/GPU node + 1 per concurrent Security Desk Embedded Client + 1 Spare)'
      );
    }

    if (corsightAiBridges > 0) {
      addLineItem(
        'GSC-1SDK-BAPS-SYFTYCORSIGHTAI',
        'Genetec Software Development Kit Connection — Corsight AI Syfty Suite (Event Processor & Overlay Service)',
        'Partner SDKs, Video Analytics, PSIM & IIoT',
        corsightAiBridges,
        250,
        'genetec-sdk-corsight-ai',
        'Requires 2 SDK connections by default (1 for Syfty Event Processor Windows service + 1 for Syfty Overlay Service / Syfty AI Plugin role in Config Tool per Corsight Syfty Guide 2026). Camera stream MUST be H.264 and requires Media Gateway with RTSPS disabled.'
      );
    }

    if (genericSdkConnections > 0) {
      addLineItem(
        'GSC-1SDK',
        'Genetec Security Center — 1 Generic Software Development Kit (SDK) Connection',
        'Partner SDKs, Video Analytics, PSIM & IIoT',
        genericSdkConnections,
        250,
        'genetec-gsc-1sdk',
        'Standard per-connection Software Development Kit (SDK) license for custom or third-party integrations'
      );
    }

    // Add all remaining Multi-Select Partner SDKs (excluding briefcam and corsight_ai which were emitted above)
    const handledSdkKeys = new Set([
      'briefcam',
      'corsight_ai'
    ]);
    this.PARTNER_SDK_OPTIONS.forEach(pOpt => {
      if (!pOpt || !pOpt.sku || handledSdkKeys.has(pOpt.key)) return;
      const sdkQty = Math.max(0, Number(activePartnerSdks[pOpt.key]) || 0);
      if (sdkQty > 0) {
        addLineItem(
          pOpt.sku,
          `Genetec Software Development Kit Connection — ${pOpt.label}`,
          'Partner SDKs, Video Analytics, PSIM & IIoT',
          sdkQty,
          pOpt.msrp || 250,
          pOpt.catalogId,
          pOpt.ruleHint || 'Certified third-party partner Software Development Kit (SDK) integration connection'
        );
      }
    });

    if (winGuardNodes > 0) {
      addLineItem(
        'GSC-1SDK-ADVANCIS-WINGUARD',
        'Genetec Software Development Kit Connection — Advancis WinGuard PSIM Integration',
        'Partner SDKs, Video Analytics, PSIM & IIoT',
        winGuardNodes,
        250,
        'genetec-sdk-advancis-winguard',
        '1 SDK connection per Advancis WinGuard interface server or redundancy node'
      );
    }

    if (elevatorDispatchSystems > 0) {
      addLineItem(
        'GSC-1POTIS-COMPASS',
        'Genetec Security Center — Elevator Destination Dispatch Plugin (Otis Compass / KONE / ThyssenKrupp / MCE Sentry)',
        'Partner SDKs, Video Analytics, PSIM & IIoT',
        elevatorDispatchSystems,
        8000,
        'genetec-plugin-elevator-dispatch',
        'Native high-rise elevator destination dispatch system integration ($8,000.00 per elevator system)'
      );
    }

    if (opcServerSystems > 0) {
      addLineItem(
        'GSC-1POPC-S',
        'Genetec Security Center — Open Platform Communications (OPC) Server Plugin',
        'Partner SDKs, Video Analytics, PSIM & IIoT',
        opcServerSystems,
        8000,
        'genetec-plugin-opc-server',
        'Exposes Security Center entities and alarm states to Building Management and SCADA systems'
      );
    }

    if (missionControlOperators > 0) {
      const mcTable = {
        1: { sku: 'ADV-MC-1OPP-1Y', msrp: 3000, id: 'genetec-adv-mc-1opp-1y' },
        3: { sku: 'ADV-MC-1OPP-3Y', msrp: 7200, id: 'genetec-adv-mc-1opp-3y' },
        5: { sku: 'ADV-MC-1OPP-5Y', msrp: 10500, id: 'genetec-adv-mc-1opp-5y' }
      }[advantageYears];
      addLineItem(
        mcTable.sku,
        `Genetec Mission Control Collaborative Decision Management — Concurrent Operator (${advantageYears}-Year)`,
        'Partner SDKs, Video Analytics, PSIM & IIoT',
        missionControlOperators,
        mcTable.msrp,
        mcTable.id,
        'Includes GSC-MC-1Opp ($0.00 Base) + mandatory Mission Control Operator Advantage maintenance'
      );
    }

    if (enableIiot) {
      if (baseConfig.iiotMode === 'site') {
        addLineItem('GSC-IIOT', 'Genetec Industrial Internet of Things (IIoT) Plugin — Unlimited Site License', 'Partner SDKs, Video Analytics, PSIM & IIoT', 1, 6000, 'genetec-iiot-site', 'Unlimited BACnet, Modbus, OPC, SNMP, MQTT, and HTTP device and data-point connections');
      } else if (baseConfig.iiotMode === 'devices' && Number(baseConfig.iiotDevices) > 0) {
        addLineItem('GSC-IIOT-1D', 'Genetec Industrial Internet of Things (IIoT) Plugin — 1 Device Connection', 'Partner SDKs, Video Analytics, PSIM & IIoT', Number(baseConfig.iiotDevices), 149, 'genetec-iiot-1d', 'Individual BACnet, Modbus, SNMP, or MQTT device connection');
      }
    }

    // 5. Restricted Security Area (RSA) Perimeter Surveillance & Intrusion Alarm Panels
    if (intrusionPanels > 0) {
      const panelBrand = this.INTRUSION_PANEL_BRANDS[intrusionPanelManufacturer] || this.INTRUSION_PANEL_BRANDS.bosch;
      addLineItem(
        panelBrand.sku,
        panelBrand.model,
        'Restricted Security Area (RSA) & Intrusion Panels',
        intrusionPanels,
        350,
        panelBrand.catalogId,
        '1 connection per intrusion alarm panel (no separate Intrusion Base license required in Security Center 5.13+)'
      );
    }

    if (effectiveRsaTier === 'standard') {
      addLineItem('GSC-GAP-RSA-STA', 'Genetec Restricted Security Area (RSA) Perimeter Surveillance — Standard Package', 'Restricted Security Area (RSA) & Intrusion Panels', 1, 1000, 'genetec-rsa-standard', 'Perimeter radar, LiDAR, and fence intrusion event integration');
    } else if (effectiveRsaTier === 'pro') {
      addLineItem('GSC-GAP-RSA-PRO', 'Genetec Restricted Security Area (RSA) Perimeter Surveillance — Professional Package', 'Restricted Security Area (RSA) & Intrusion Panels', 1, 7000, 'genetec-rsa-pro', 'Supports up to 20 short-range sensors (Quanergy LiDAR), 5 radars (SpotterRF), 1 fence controller (Southwest Microwave), and 10 km perimeter fence');
    } else if (effectiveRsaTier === 'enterprise') {
      addLineItem('GSC-GAP-RSA-ENT', 'Genetec Restricted Security Area (RSA) Perimeter Surveillance — Enterprise Package', 'Restricted Security Area (RSA) & Intrusion Panels', 1, 14000, 'genetec-rsa-ent', 'Unrestricted enterprise perimeter radar (SpotterRF), 3D LiDAR (Quanergy), and multi-zone fence target tracking (Southwest Microwave)');
    }

    if (rsaShortRangeSensors > 0) {
      addLineItem(
        'GSC-GAP-RSA-1SRS',
        'Genetec Restricted Security Area (RSA) — 1 Short-Range Tracking Sensor (Quanergy M8 LiDAR / Optex / Axis / Magos SR)',
        'Restricted Security Area (RSA) & Intrusion Panels',
        rsaShortRangeSensors,
        175,
        'genetec-rsa-1srs',
        '1 connection per short-range tracking sensor: Quanergy M8 3D LiDAR (Qortex DTC Server), Optex Redscan PIE-1, Axis Perimeter Defender, Bosch IVA, SightLogix, Ouster, or Magos SR-150/250/500'
      );
    }

    if (rsaRadars > 0) {
      addLineItem(
        'GSC-GAP-RSA-1RAD',
        'Genetec Restricted Security Area (RSA) — 1 Radar Tracking Unit (SpotterRF / FLIR Ranger / Echodyne / Navtech)',
        'Restricted Security Area (RSA) & Intrusion Panels',
        rsaRadars,
        1000,
        'genetec-rsa-1rad',
        '1 connection per medium/long-range tracking radar: SpotterRF / Spotter Global (C20/C40/A-Series/3D-Series/NetworkedIO), Teledyne FLIR Ranger, Echodyne EchoGuard, Navtech AdvanceGuard, or Magos SR-1000'
      );
    }

    if (rsaFenceControllers > 0) {
      addLineItem(
        'GSC-GAP-RSA-1FEN',
        'Genetec Restricted Security Area (RSA) — 1 Perimeter Fence Intrusion Detection System (Southwest Microwave INTREPID / Senstar / FFT)',
        'Restricted Security Area (RSA) & Intrusion Panels',
        rsaFenceControllers,
        2000,
        'genetec-rsa-1fen',
        '1 connection per perimeter fence controller: Southwest Microwave INTREPID (MicroPoint POE-S, Microwave 316/334/336-POE-S, Model 390/395), Senstar FiberPatrol/OmniTrax/FlexZone, Fiber SenSys, or FFT'
      );
    }

    if (rsaFenceKm > 0) {
      // Decompose rsaFenceKm into optimal 100km ($15,000), 10km ($5,000), and 1km ($2,000) licenses
      let remKm = Math.ceil(rsaFenceKm);
      const km100 = Math.floor(remKm / 100);
      remKm = remKm % 100;
      const km10 = Math.floor(remKm / 10);
      remKm = remKm % 10;
      // Note: 3x 1km ($6,000) is more expensive than 1x 10km ($5,000), so upgrade >=3 km to 10km block
      let finalKm10 = km10;
      let finalKm1 = remKm;
      if (finalKm1 >= 3) {
        finalKm10 += 1;
        finalKm1 = 0;
      }
      if (km100 > 0) {
        addLineItem('GSC-GAP-RSA-100KM', 'Genetec Restricted Security Area (RSA) — 100 km Perimeter Fence Tracking License', 'Restricted Security Area (RSA) & Intrusion Panels', km100, 15000, 'genetec-rsa-100km', 'Covers up to 100 km of monitored perimeter fence intrusion zones');
      }
      if (finalKm10 > 0) {
        addLineItem('GSC-GAP-RSA-10KM', 'Genetec Restricted Security Area (RSA) — 10 km Perimeter Fence Tracking License', 'Restricted Security Area (RSA) & Intrusion Panels', finalKm10, 5000, 'genetec-rsa-10km', 'Covers up to 10 km of monitored perimeter fence intrusion zones');
      }
      if (finalKm1 > 0) {
        addLineItem('GSC-GAP-RSA-1KM', 'Genetec Restricted Security Area (RSA) — 1 km Perimeter Fence Tracking License', 'Restricted Security Area (RSA) & Intrusion Panels', finalKm1, 2000, 'genetec-rsa-1km', 'Covers up to 1 km of monitored perimeter fence intrusion zones');
      }
    }

    if (swmRpmBlocks > 0) {
      addLineItem(
        'GSC-1PSWM-RPMII',
        'Genetec Security Center — Southwest Microwave INTREPID RPM II Standalone Plugin (Per 5 RPM Units)',
        'Restricted Security Area (RSA) & Intrusion Panels',
        swmRpmBlocks,
        6500,
        'genetec-plugin-swm-rpmii',
        `Dedicated Southwest Microwave INTREPID Remote Polling Module II (RPM II) integration (${swmRpmUnits} RPM unit(s) across ${swmRpmBlocks} block(s) of 5 units)`
      );
    }

    // 6. Mandatory Genetec Advantage Software Maintenance Agreement (1-Year / 3-Year / 5-Year)
    if (totalVideoConnections > 0) {
      const advTierTable = {
        aio: {
          1: { sku: 'ADV-CAM-AIO-1Y', model: 'Genetec Advantage Software Maintenance — 1 Streamvault All-in-One Camera (1-Year)', msrp: 25, id: 'genetec-adv-cam-aio-1y' },
          3: { sku: 'ADV-CAM-AIO-3Y', model: 'Genetec Advantage Software Maintenance — 1 Streamvault All-in-One Camera (3-Year)', msrp: 60, id: 'genetec-adv-cam-aio-3y' },
          5: { sku: 'ADV-CAM-AIO-5Y', model: 'Genetec Advantage Software Maintenance — 1 Streamvault All-in-One Camera (5-Year)', msrp: 85, id: 'genetec-adv-cam-aio-5y' }
        },
        standard: {
          1: { sku: 'ADV-CAM-S-1Y', model: 'Genetec Advantage Software Maintenance — 1 Omnicast Standard Camera (1-Year)', msrp: 35, id: 'genetec-adv-cam-s-1y' },
          3: { sku: 'ADV-CAM-S-3Y', model: 'Genetec Advantage Software Maintenance — 1 Omnicast Standard Camera (3-Year)', msrp: 85, id: 'genetec-adv-cam-s-3y' },
          5: { sku: 'ADV-CAM-S-5Y', model: 'Genetec Advantage Software Maintenance — 1 Omnicast Standard Camera (5-Year)', msrp: 130, id: 'genetec-adv-cam-s-5y' }
        },
        enterprise: {
          1: { sku: 'ADV-CAM-E-1Y', model: 'Genetec Advantage Software Maintenance — 1 Omnicast Enterprise Camera (1-Year)', msrp: 55, id: 'genetec-advantage-1cam-1yr' },
          3: { sku: 'ADV-CAM-E-3Y', model: 'Genetec Advantage Software Maintenance — 1 Omnicast Enterprise Camera (3-Year)', msrp: 135, id: 'genetec-adv-cam-e-3y' },
          5: { sku: 'ADV-CAM-E-5Y', model: 'Genetec Advantage Software Maintenance — 1 Omnicast Enterprise Camera (5-Year)', msrp: 190, id: 'genetec-adv-cam-e-5y' }
        }
      };
      const advEntry = (advTierTable[effectiveTier] || advTierTable.enterprise)[advantageYears];
      addLineItem(
        advEntry.sku,
        advEntry.model,
        'Genetec Advantage Software Maintenance',
        totalVideoConnections,
        advEntry.msrp,
        advEntry.id,
        `Mandatory ${advantageYears}-Year Genetec Advantage Software Maintenance Agreement`
      );
    }

    if (totalSynergisReaders > 0) {
      const rdrAdvTable = {
        aio: {
          1: { sku: 'ADV-RDR-AIO-1Y', model: 'Genetec Advantage Software Maintenance — 1 Streamvault All-in-One Reader (1-Year)', msrp: 9, id: 'genetec-adv-rdr-aio-1y' },
          3: { sku: 'ADV-RDR-AIO-3Y', model: 'Genetec Advantage Software Maintenance — 1 Streamvault All-in-One Reader (3-Year)', msrp: 22, id: 'genetec-adv-rdr-aio-3y' },
          5: { sku: 'ADV-RDR-AIO-5Y', model: 'Genetec Advantage Software Maintenance — 1 Streamvault All-in-One Reader (5-Year)', msrp: 30, id: 'genetec-adv-rdr-aio-5y' }
        },
        standard: {
          1: { sku: 'ADV-RDR-S-1Y', model: 'Genetec Advantage Software Maintenance — 1 Synergis Standard Reader (1-Year)', msrp: 15, id: 'genetec-adv-rdr-s-1y' },
          3: { sku: 'ADV-RDR-S-3Y', model: 'Genetec Advantage Software Maintenance — 1 Synergis Standard Reader (3-Year)', msrp: 35, id: 'genetec-adv-rdr-s-3y' },
          5: { sku: 'ADV-RDR-S-5Y', model: 'Genetec Advantage Software Maintenance — 1 Synergis Standard Reader (5-Year)', msrp: 55, id: 'genetec-adv-rdr-s-5y' }
        },
        enterprise: {
          1: { sku: 'ADV-RDR-E-1Y', model: 'Genetec Advantage Software Maintenance — 1 Synergis Enterprise Reader (1-Year)', msrp: 25, id: 'genetec-adv-rdr-e-1y' },
          3: { sku: 'ADV-RDR-E-3Y', model: 'Genetec Advantage Software Maintenance — 1 Synergis Enterprise Reader (3-Year)', msrp: 60, id: 'genetec-adv-rdr-e-3y' },
          5: { sku: 'ADV-RDR-E-5Y', model: 'Genetec Advantage Software Maintenance — 1 Synergis Enterprise Reader (5-Year)', msrp: 90, id: 'genetec-adv-rdr-e-5y' }
        }
      };
      const rdrKey = rdrAdvTable[effectiveTier] ? effectiveTier : 'enterprise';
      const rdrEntry = rdrAdvTable[rdrKey][advantageYears];
      addLineItem(
        rdrEntry.sku,
        rdrEntry.model,
        'Genetec Advantage Software Maintenance',
        totalSynergisReaders,
        rdrEntry.msrp,
        rdrEntry.id,
        `Mandatory ${advantageYears}-Year Synergis Reader Software Maintenance Agreement`
      );
    }

    if (effectiveLprCameras > 0) {
      const lprAdvTable = {
        1: { sku: 'ADV-LPR-F-1Y', msrp: 80, id: 'genetec-adv-lpr-f-1y' },
        3: { sku: 'ADV-LPR-F-3Y', msrp: 192, id: 'genetec-adv-lpr-f-3y' },
        5: { sku: 'ADV-LPR-F-5Y', msrp: 280, id: 'genetec-adv-lpr-f-5y' }
      }[advantageYears];
      addLineItem(
        lprAdvTable.sku,
        `Genetec Advantage Software Maintenance — 1 Fixed Sharp License Plate Recognition Camera (${advantageYears}-Year)`,
        'Genetec Advantage Software Maintenance',
        effectiveLprCameras,
        lprAdvTable.msrp,
        lprAdvTable.id,
        `Mandatory ${advantageYears}-Year AutoVu License Plate Recognition Software Maintenance Agreement`
      );
    }

    if (effectiveSipIntercoms > 0) {
      if (sipeliaMode === 'standard') {
        const sipStdAdvTable = {
          1: { sku: 'ADV-SIP-S-1Y', msrp: 25, id: 'genetec-adv-sip-s-1y' },
          3: { sku: 'ADV-SIP-S-3Y', msrp: 60, id: 'genetec-adv-sip-s-3y' },
          5: { sku: 'ADV-SIP-S-5Y', msrp: 87.50, id: 'genetec-adv-sip-s-5y' }
        }[advantageYears];
        addLineItem(
          sipStdAdvTable.sku,
          `Genetec Advantage Software Maintenance — 1 Sipelia Standard Intercom Station (${advantageYears}-Year)`,
          'Genetec Advantage Software Maintenance',
          effectiveSipIntercoms,
          sipStdAdvTable.msrp,
          sipStdAdvTable.id,
          `Mandatory ${advantageYears}-Year Sipelia Standard Intercom Software Maintenance Agreement`
        );
      } else if (sipeliaMode === 'advanced') {
        const sipStdAdvTable = {
          1: { sku: 'ADV-SIP-S-1Y', msrp: 25, id: 'genetec-adv-sip-s-1y' },
          3: { sku: 'ADV-SIP-S-3Y', msrp: 60, id: 'genetec-adv-sip-s-3y' },
          5: { sku: 'ADV-SIP-S-5Y', msrp: 87.50, id: 'genetec-adv-sip-s-5y' }
        }[advantageYears];
        const sipAdvAddTable = {
          1: { sku: 'ADV-SIP-A-1Y', msrp: 15, id: 'genetec-adv-sip-a-1y' },
          3: { sku: 'ADV-SIP-A-3Y', msrp: 36, id: 'genetec-adv-sip-a-3y' },
          5: { sku: 'ADV-SIP-A-5Y', msrp: 52.50, id: 'genetec-adv-sip-a-5y' }
        }[advantageYears];
        addLineItem(
          sipStdAdvTable.sku,
          `Genetec Advantage Software Maintenance — 1 Sipelia Standard Intercom Station (${advantageYears}-Year)`,
          'Genetec Advantage Software Maintenance',
          effectiveSipIntercoms,
          sipStdAdvTable.msrp,
          sipStdAdvTable.id,
          `Mandatory ${advantageYears}-Year Sipelia Standard Intercom Software Maintenance Agreement`
        );
        addLineItem(
          sipAdvAddTable.sku,
          `Genetec Advantage Software Maintenance — 1 Sipelia Advanced Intercom Add-On (${advantageYears}-Year)`,
          'Genetec Advantage Software Maintenance',
          effectiveSipIntercoms,
          sipAdvAddTable.msrp,
          sipAdvAddTable.id,
          `Mandatory ${advantageYears}-Year Sipelia Advanced Intercom Software Maintenance Agreement`
        );
      } else {
        const sipAdvTable = {
          1: { sku: 'ADV-SIP-1Y', msrp: 40, id: 'genetec-adv-sip-1y' },
          3: { sku: 'ADV-SIP-3Y', msrp: 95, id: 'genetec-adv-sip-3y' },
          5: { sku: 'ADV-SIP-5Y', msrp: 140, id: 'genetec-adv-sip-5y' }
        }[advantageYears];
        addLineItem(
          sipAdvTable.sku,
          `Genetec Advantage Software Maintenance — 1 Sipelia Unified Intercom Station (${advantageYears}-Year)`,
          'Genetec Advantage Software Maintenance',
          effectiveSipIntercoms,
          sipAdvTable.msrp,
          sipAdvTable.id,
          `Mandatory ${advantageYears}-Year Sipelia Intercom Software Maintenance Agreement`
        );
      }
    }

    if (intrusionPanels > 0) {
      const apAdvTable = {
        1: { sku: 'ADV-1AP-1Y', msrp: 65, id: 'genetec-adv-1ap-1y' },
        3: { sku: 'ADV-1AP-3Y', msrp: 160, id: 'genetec-adv-1ap-3y' },
        5: { sku: 'ADV-1AP-5Y', msrp: 230, id: 'genetec-adv-1ap-5y' }
      }[advantageYears];
      addLineItem(
        apAdvTable.sku,
        `Genetec Advantage Software Maintenance — 1 Intrusion Alarm Panel Connection (${advantageYears}-Year)`,
        'Genetec Advantage Software Maintenance',
        intrusionPanels,
        apAdvTable.msrp,
        apAdvTable.id,
        `Mandatory ${advantageYears}-Year Intrusion Alarm Panel Software Maintenance Agreement`
      );
    }

    if (baseConfig.advantage247) {
      const tacTable = {
        1: { sku: 'ADV-OPTION-247-1Y', msrp: 6000, id: 'genetec-adv-option-247-1y' },
        3: { sku: 'ADV-OPTION-247-3Y', msrp: 14400, id: 'genetec-adv-option-247-3y' },
        5: { sku: 'ADV-OPTION-247-5Y', msrp: 21000, id: 'genetec-adv-option-247-5y' }
      }[advantageYears];
      addLineItem(
        tacTable.sku,
        `Genetec Advantage 24/7 Technical Assistance Center Support Option (${advantageYears}-Year)`,
        'Genetec Advantage Software Maintenance',
        1,
        tacTable.msrp,
        tacTable.id,
        '24/7/365 Technical Assistance Center telephone support with 30-minute callback service level agreement'
      );
    }

    // 7. Multi-Role & Plugin Server Resource Sizing (SystemRequirements.pdf & Plugin Datasheets)
    const activeRolesAndPlugins = [];
    let requiredServerRamGb = 16; // Baseline Security Center Recommended Profile (Page 9)
    let requiredServerCores = 4;  // Baseline Intel Xeon E-2434 (4C/8T)

    if (totalVideoConnections > 100 || totalSynergisReaders > 200) {
      requiredServerRamGb = 32;
      requiredServerCores = 8;
    }
    if (totalVideoConnections > 300 || totalSynergisReaders > 1000) {
      requiredServerRamGb = 64;
      requiredServerCores = 16;
    }

    const roleSharingRules = [];
    const exceedsUnifiedServerCap = totalVideoConnections > 100 || (videoLoad.peakIngressMbps || 0) > 200 || totalSynergisReaders > 200;
    const requiresDedicatedDirectory = totalVideoConnections > 300 || totalSynergisReaders > 1000 || coreFailover !== 'none' || missionControlOperators > 0;

    if (exceedsUnifiedServerCap) {
      roleSharingRules.push('Exceeds Unified Single-Server Cap (100 cameras / 200 Mbps / 200 readers per SystemRequirements.pdf Page 9): Separate Archiver and Directory/Plugin roles or scale out to High-Performance 32–64 GB server.');
    } else if (hasAnySystemEntities) {
      roleSharingRules.push('Within Unified Single-Server Cap (<=100 cameras, <=200 Mbps, <=200 readers): Directory, Archiver, and Access Manager can share 1 Streamvault server.');
    }

    if (requiresDedicatedDirectory) {
      roleSharingRules.push('Dedicated Directory / Expansion Server Required (>300 cameras, >1,000 readers, Core Failover active, or Mission Control Incident Manager deployed per SystemRequirements.pdf Page 15 & Mission Control Guide 3.4.1.0): Host Directory and isolated roles on SV-1041E / SV-7041EX.');
    }

    if (effectiveSipIntercoms > 0 || sipTrunks > 0 || sipPublicAddress > 0) {
      requiredServerRamGb += 4;
      requiredServerCores += 2;
      activeRolesAndPlugins.push({
        name: `Sipelia 2.14.0.0 Communications Role (${effectiveSipIntercoms} SIP stations, ${sipTrunks} trunks, ${sipPublicAddress} PA)`,
        ramGb: 4,
        cores: 2,
        rule: 'Max 1 Sipelia Server role per Directory (dedicated expansion server recommended; failover requires centralized shared SQL DB + shared network drive for call recordings/PA audio). Unified SC 5.11–5.14 SKU GSC-SIPELIA-1SIP ($250) includes Base, call recording, failover, SIP trunking & PA. Native SIP video max 720p (1080p+ intercom cameras must be enrolled as Security Center video units and linked to the SIP intercom entity). Ports: UDP/TCP 5060, TLS 5061, TCP 8202, RTP UDP 20000–20500.',
        datasheet: 'Datasheets/Genetec/Plugins/EN.Sipelia User Guide 2.14.0.0.pdf'
      });
    }

    if (intrusionPanels > 0) {
      const dmpRam = Math.max(4, intrusionManagerRolesRequired * 4);
      const dmpCores = Math.max(2, intrusionManagerRolesRequired * 2);
      requiredServerRamGb += dmpRam;
      requiredServerCores += dmpCores;
      activeRolesAndPlugins.push({
        name: `Intrusion Manager Role (${intrusionPanels} ${intrusionPanelManufacturer.toUpperCase()} Panel(s) • ${intrusionManagerRolesRequired} Role(s))`,
        ramGb: dmpRam,
        cores: dmpCores,
        rule: intrusionPanelManufacturer === 'dmp'
          ? `DMP Intrusion Panel Extension 4.5.0: Max 100 DMP panels / 8,800 entities / 70 events/sec sustained (100 burst) per Intrusion Manager role (up to 20 roles / 2,000 panels per Directory). GSC-AP-BASE included at $0 in SC 5.11+; requires Synergis for DMP user/cardholder sync (Wiegand H10302 37-bit) and Omnicast Pro/Enterprise for camera-to-area linking. Supported: XR500N, XR500E, XR150DN, XR550DN, XR550INT (XR150FC/XR550FC FIRE keypads incompatible). Ports: TCP 8011/8001, Receiver Failover TCP 21002.`
          : `Intrusion Manager Role (${intrusionPanels} panels across ${intrusionManagerRolesRequired} role(s)): Max 100 panels per Intrusion Manager role; GSC-AP-BASE included at $0 in SC 5.11+.`,
        datasheet: 'Datasheets/Genetec/Plugins/EN.DMP Intrusion Panel Extension Guide 4.5.0.pdf'
      });
    }

    if (effectiveLprCameras > 0) {
      activeRolesAndPlugins.push({
        name: `AutoVu ALPR Manager Role (${effectiveLprCameras} Sharp LPR Camera(s) • ${alprManagerRolesRequired} Role(s))`,
        ramGb: alprManagerRolesRequired * 4,
        cores: alprManagerRolesRequired * 2,
        rule: `Security Center 5.14 Administrator Guide: Maximum 100 AutoVu units per ALPR Manager role (${alprManagerRolesRequired} role(s) required for ${effectiveLprCameras} LPR cameras).`,
        datasheet: 'Datasheets/Genetec/EN.Security Center Administrator Guide 5.14.pdf'
      });
    }

    if (totalFederatedSites > 0) {
      activeRolesAndPlugins.push({
        name: `Security Center Federation (${totalFederatedSites} Remote Site(s) • ${federationRoleGroupsRequired} Role Group(s))`,
        ramGb: federationRoleGroupsRequired * 4,
        cores: federationRoleGroupsRequired * 2,
        rule: `Security Center 5.14 Administrator Guide: Max 100 Federation roles per Federation Role Group, up to 500 federated sites per High-Capacity server, and max 2 federation levels.`,
        datasheet: 'Datasheets/Genetec/EN.Security Center Administrator Guide 5.14.pdf'
      });
    }

    if (effectiveRsaTier !== 'none' || swmRpmBlocks > 0) {
      const totalRsaTrackers = rsaShortRangeSensors + rsaRadars + rsaFenceControllers + swmRpmUnits;
      const rsaRam = totalRsaTrackers > 5 ? 8 : 4;
      const rsaCores = totalRsaTrackers > 5 ? 4 : 2;
      requiredServerRamGb += rsaRam;
      requiredServerCores += rsaCores;
      activeRolesAndPlugins.push({
        name: `Restricted Security Area & IS Gateway (${rsaShortRangeSensors} LiDAR/SRS, ${rsaRadars} Radar, ${rsaFenceControllers} Fence, ${swmRpmUnits} RPM II)`,
        ramGb: rsaRam,
        cores: rsaCores,
        rule: totalRsaTrackers > 5
          ? 'IS Gateway 1.4+ Windows Containers with >5 tracking sensors: Isolate on dedicated expansion server (never co-host on high-load Archiver).'
          : 'IS Gateway 1.4+ Windows Containers: Add +4 GB RAM / +2 CPU cores for Quanergy Qortex / SpotterRF / Southwest Microwave INTREPID polling.',
        datasheet: 'Datasheets/Genetec/Plugins/Genetec_RSA_Surveillance_Plugin_Datasheet.pdf'
      });
    }

    if (supremaSdkConnections > 0) {
      // Suprema Plugin for Genetec User Guide v1.00 (Pages 3-4):
      // <=50 devices: 8 Core CPU / 32 GB RAM; 51-100 devices: 16 Core CPU / 64 GB RAM; >100 devices: additional plugin server
      const supremaRam = supremaDevices > 50 ? 64 : 32;
      const supremaCores = supremaDevices > 50 ? 16 : 8;
      if (supremaDevices <= 20) {
        requiredServerRamGb = Math.max(requiredServerRamGb, 32);
        requiredServerCores = Math.max(requiredServerCores, 8);
      } else {
        requiredServerRamGb = Math.max(requiredServerRamGb, supremaRam);
        requiredServerCores = Math.max(requiredServerCores, supremaCores);
      }
      activeRolesAndPlugins.push({
        name: `Suprema Plugin for Genetec (${supremaDevices} Readers, ${supremaPluginServers} Server(s), ${supremaSdkConnections}x GSC-1SDK-SUPREMA-READ)`,
        ramGb: supremaRam,
        cores: supremaCores,
        rule: `Requires 3x GSC-1SDK-SUPREMA-READ per Server (1 license = 2 connections) + Suprema INT_GEN_GSC plugin license + ${supremaCloudLinksNeeded} dedicated Synergis Cloud Link(s) (<=50 Suprema devices/Cloud Link with RIO enabled). Server spec: ${supremaDevices <= 20 ? '0-20 devices can share existing server (8C / 32 GB RAM)' : supremaDevices <= 50 ? 'Dedicated Plugin Server recommended (8C / 32 GB RAM)' : 'Dedicated Plugin Server required (16C / 64 GB RAM; >100 devices requires additional Plugin Server)'}. SQL DB reserves ~400 KB per face template.`,
        datasheet: 'Datasheets/Genetec/Plugins/Suprema_Genetec_Security_Center_Integration.pdf'
      });
    }

    if (idemiaMorphoEnabled || controlIdBridgeServers > 0 || princetonIdentityServers > 0) {
      const bioCount = (idemiaMorphoEnabled ? 1 : 0) + (controlIdBridgeServers > 0 ? 1 : 0) + (princetonIdentityServers > 0 ? 1 : 0);
      const bioRam = bioCount * 6;
      const bioCores = bioCount * 2;
      requiredServerRamGb += bioRam;
      requiredServerCores += bioCores;
      activeRolesAndPlugins.push({
        name: `Biometric Server Integration (${[
          idemiaMorphoEnabled ? 'IDEMIA MorphoManager' : '',
          controlIdBridgeServers > 0 ? `Control iD iDBridge (${controlIdBridgeServers})` : '',
          princetonIdentityServers > 0 ? `Princeton Identity (${princetonIdentityServers})` : ''
        ].filter(Boolean).join(', ')})`,
        ramGb: bioRam,
        cores: bioCores,
        rule: 'Co-hosting MorphoManager / iDBridge / Princeton Identity middleware requires +6 GB RAM & +2 cores per biometric service; isolate on dedicated VM when >10,000 biometric templates.',
        datasheet: 'Datasheets/Genetec/Plugins/Genetec_Identity_Biometrics_Plugins_Datasheet.pdf'
      });
    }

    if (globalCardholderSystems > 0 || cardSyncLicenseBlocks > 0 || clearIdIdentities > 0 || clearIdKiosks > 0) {
      requiredServerRamGb += 4;
      requiredServerCores += 2;
      activeRolesAndPlugins.push({
        name: `Global Cardholder Sync, Card Sync & ClearID (${[
          globalCardholderSystems > 0 ? `${globalCardholderSystems} GCHM System(s)` : '',
          cardSyncDataSources > 0 ? `${cardSyncDataSources} HR/SQL Source(s)` : '',
          clearIdIdentities > 0 ? `${clearIdIdentities.toLocaleString()} ClearID Identities` : ''
        ].filter(Boolean).join(' + ')})`,
        ramGb: 4,
        cores: 2,
        rule: 'Global Cardholder Synchronizer, Card Synchronization & ClearID Bridge Role: Co-host on Directory server (+4 GB RAM, +2 CPU cores).',
        datasheet: 'Datasheets/Genetec/Plugins/Genetec_ClearID_Plugin_Datasheet.pdf'
      });
    }

    if (alliedStreamConnectInstances > 0) {
      requiredServerRamGb += 2;
      requiredServerCores += 1;
      activeRolesAndPlugins.push({
        name: `Allied Telesis StreamConnect v2.1 (${alliedStreamConnectInstances} SDK Instance Pool)`,
        ramGb: 2,
        cores: 1,
        rule: 'Shared SDK pool (Default: 4 instances): 1 per Main Server + 1 per Expansion Archiver connected to ATI PoE switch + 1 per open ATI Switch Mgmt task + 1 per open StreamConnect tile widget. Requires GSC 5.13.2+ & AW+ 5.5.4+; switches in VCS stacking unsupported.',
        datasheet: 'Datasheets/Genetec/Plugins/StreamConnect_for_Genetec_v2_1_User_Guide.pdf'
      });
    }

    if (xpressEntryServers > 0) {
      requiredServerRamGb += 8;
      requiredServerCores += 4;
      activeRolesAndPlugins.push({
        name: `Telaeris XpressEntry Server (${xpressEntryServers} server${xpressEntryServers > 1 ? 's' : ''})`,
        ramGb: 8,
        cores: 4,
        rule: 'XpressEntry Server requires +8 GB RAM and +4 CPU cores when co-hosted; dedicate server for >10 handheld readers or >25,000 cardholders.',
        datasheet: 'Datasheets/Genetec/Plugins/Telaeris_XPressEntry_Genetec_Integration.pdf'
      });
    }

    if (medecoXtLocks > 0 || keyCabinetCount > 0) {
      requiredServerRamGb += 4;
      requiredServerCores += 2;
      activeRolesAndPlugins.push({
        name: `Medeco XT & Key Management (${medecoXtLocks} Medeco XT locks, ${keyCabinetCount} Key Cabinets)`,
        ramGb: 4,
        cores: 2,
        rule: 'Medeco XT Plugin Role + IIS Web Manager service adds +4 GB RAM & +2 CPU cores on Directory/Expansion server.',
        datasheet: 'Datasheets/Genetec/Plugins/Genetec_Medeco_Key_Asset_Management_Datasheet.pdf'
      });
    }

    if (winGuardNodes > 0 || elevatorDispatchSystems > 0 || opcServerSystems > 0) {
      requiredServerRamGb += 8;
      requiredServerCores += 4;
      activeRolesAndPlugins.push({
        name: `PSIM / Building Automation (${[
          winGuardNodes > 0 ? `${winGuardNodes} WinGuard Node(s)` : '',
          elevatorDispatchSystems > 0 ? `${elevatorDispatchSystems} Elevator Dispatch` : '',
          opcServerSystems > 0 ? `${opcServerSystems} OPC Server` : ''
        ].filter(Boolean).join(', ')})`,
        ramGb: 8,
        cores: 4,
        rule: 'WinGuard / OPC / Elevator Dispatch: Requires +8 GB RAM, +4 CPU cores, and dedicated SQL database instance.',
        datasheet: 'Datasheets/Genetec/Plugins/Advancis_WinGuard_PSIM_Genetec_Integration.pdf'
      });
    }

    if (missionControlOperators > 0) {
      const mcHighPerf = missionControlOperators >= 5;
      const mcRam = mcHighPerf ? 64 : 16;
      const mcCores = mcHighPerf ? 40 : 4;
      requiredServerRamGb = Math.max(requiredServerRamGb, mcRam);
      requiredServerCores = Math.max(requiredServerCores, mcCores);
      activeRolesAndPlugins.push({
        name: `Genetec Mission Control 3.4.1.0 (${missionControlOperators} Concurrent Operator(s) • ${mcHighPerf ? 'High-Performance 40C/64GB' : 'Recommended 4C/16GB'})`,
        ramGb: mcRam,
        cores: mcCores,
        rule: `Mission Control Deployment Guide 3.4.1.0 (Requires SC Enterprise 5.14): ${mcHighPerf ? '5+ concurrent operators (up to 300 max) requires High-Performance Server (Dual Xeon Silver 4416+ 40-Core, 64 GB RAM, 10 GbE)' : '1–4 concurrent operators requires Recommended Server (Xeon E-2434, 16 GB RAM)'}. MANDATORY ISOLATION: Incident Manager role (max 1 per system) MUST NOT be co-hosted on the Directory server. Incident Document Service migrated to SQL Server in 3.4.1.0 (~150 KB/incident = ~150 GB/yr at 3,000–4,000 incidents/day, requiring SQL Server Standard). RabbitMQ 3.13.7.19 HA cluster requires minimum 3 standalone nodes on the same LAN (Raft consensus (N/2)+1, TCP 5671 SSL).${sipPublicAddress > 0 ? ' Sipelia Client must be installed on the Mission Control server for PA workflow actions.' : ''}`,
        datasheet: 'Datasheets/Genetec/Plugins/EN.Genetec Mission Control Deployment Guide 3.4.1.0.pdf'
      });
      roleSharingRules.push(`Mission Control 3.4.1.0 Isolation Rule: Incident Manager role (max 1 per system) MUST NOT be co-hosted on the Directory server; Incident Document Service requires SQL Server Standard (~150 KB/incident); RabbitMQ 3.13.7.19 HA requires min 3 standalone nodes on the same LAN.`);
    }

    // Media Gateway & GPU Analytics Isolation Check (SystemRequirements.pdf Page 12 & BriefCam/Corsight Guide)
    const mediaGatewayStreams = (webClients * 4) + (mobileClients * 2) + (briefCamConnections > 0 ? Math.min(cameraUnits || 16, 32) : 0) + (corsightAiBridges > 0 ? Math.max(1, Math.ceil(corsightAiBridges / 2)) * 15 : 0) + (effectiveSipIntercoms > 0 ? Math.min(effectiveSipIntercoms, 10) : 0);
    const needsDedicatedMediaGateway = mediaGatewayStreams > 0 && totalVideoConnections > 32;
    const needsDedicatedGpuAnalyticsServer = briefCamConnections > 0 || corsightAiBridges > 0;

    if (needsDedicatedMediaGateway) {
      roleSharingRules.push(`Media Gateway Isolation Rule (SystemRequirements.pdf Page 12): Do NOT co-host Media Gateway (~${mediaGatewayStreams} RTSP/WebRTC streams for Web/Mobile/Analytics/Sipelia) on the same server as an Archiver.`);
    }
    if (needsDedicatedGpuAnalyticsServer) {
      activeRolesAndPlugins.push({
        name: `GPU Video Analytics (${briefCamConnections > 0 ? `BriefCam: ${briefCamConnections} SDK` : ''}${briefCamConnections > 0 && corsightAiBridges > 0 ? ' + ' : ''}${corsightAiBridges > 0 ? `Corsight AI Syfty Suite: ${corsightAiBridges} SDK` : ''})`,
        ramGb: 64,
        cores: 16,
        rule: 'MANDATORY ISOLATION: BriefCam & Corsight AI require a dedicated NVIDIA GPU server (e.g., Streamvault SVA-1000E, 64 GB RAM). Corsight Syfty Suite v1.1 requires H.264 camera streams and Media Gateway role with RTSPS (Require TLS) DISABLED.',
        datasheet: corsightAiBridges > 0
          ? 'Datasheets/Genetec/Plugins/Corsight Syfty Genetec - User Guide 2026.pdf'
          : 'Datasheets/Genetec/Plugins/BriefCam_Corsight_Video_Analytics_Genetec_Integration.pdf'
      });
      roleSharingRules.push('GPU Analytics Isolation Rule: BriefCam Video Synopsis and Corsight AI Facial Recognition must run on a dedicated GPU appliance (Streamvault SVA-1000E) and pull H.264 streams via Media Gateway RTSP (with RTSPS disabled for Corsight Fortify).');
    }

    const multiRoleServerSpec = {
      requiredServerCores,
      requiredServerRamGb,
      mediaGatewayStreams,
      needsDedicatedMediaGateway,
      needsDedicatedGpuAnalyticsServer,
      requiresDedicatedDirectory,
      exceedsUnifiedServerCap,
      activeRolesAndPlugins,
      roleSharingRules
    };

    const totalSoftwareMsrp = lineItems.reduce((sum, li) => sum + li.extendedMsrp, 0);
    const streamvaultPlan = this.recommendStreamvaultAppliances(videoLoad, baseConfig, {
      quotedWorkstationUnits: bomWorkstations
    });

    // Attach SVA-1000E Analytics Appliance recommendation when BriefCam or Corsight AI is enabled
    if (needsDedicatedGpuAnalyticsServer) {
      const serversDb = (typeof window !== 'undefined' && Array.isArray(window.SERVERS_DATABASE)) ? window.SERVERS_DATABASE : [];
      const svaAppliance = serversDb.find(s => s.id === 'genetec-sva-1000e-r2') || serversDb.find(s => String(s.applianceSeries || '').startsWith('SVA-'));
      if (svaAppliance) {
        streamvaultPlan.analyticsAppliance = svaAppliance;
        streamvaultPlan.analyticsQty = Math.max(1, Math.ceil(corsightAiBridges / 2));
      }
    }

    const totalHardwareMsrp =
      ((streamvaultPlan.primaryAppliance?.msrp || 0) * (streamvaultPlan.primaryQty || 0)) +
      ((streamvaultPlan.directoryAppliance?.msrp || 0) * (streamvaultPlan.directoryQty || 0)) +
      ((streamvaultPlan.analyticsAppliance?.msrp || 0) * (streamvaultPlan.analyticsQty || 0));

    return {
      config: baseConfig,
      videoLoad,
      cameraUnits,
      // Feature Toggle Flags
      enableFederation,
      enableCardholderSync,
      enableEncodersDvr,
      enableSipelia,
      enableLpr,
      enableVideoFailover,
      enableCloudServices,
      enableBiometricsIdentity,
      enableClearId,
      enableKeyManagement,
      enablePartnerSdks,
      enableBuildingPsim,
      enableIiot,
      enableIntrusionPanels,
      enableRsa,
      // Calculated Counts
      analogEncoderChannels,
      dvrNvrChannels,
      totalVideoConnections,
      synergisGenetecReaders,
      synergisExternalReaders,
      totalSynergisReaders,
      effectiveTier,
      advantageYears,
      coreFailover,
      failoverMode,
      failoverCameraQty,
      standbyServerCount,
      sqlExpressMaxGb,
      estimatedSqlDbGb,
      needsSqlStandard,
      includedBaseFeatures,
      freeClientsIncluded,
      workstationClients,
      extraClients,
      mobileClients,
      webClients,
      federationSites,
      federationSmallSites,
      stratocastFedSites,
      globalCardholderSystems,
      cardSyncDataSources,
      cardSyncLicenseBlocks,
      effectiveLprCameras,
      sipeliaMode,
      effectiveSipIntercoms,
      sipTrunks,
      sipPublicAddress,
      intrusionPanels,
      intrusionPanelManufacturer,
      supremaDevices,
      supremaPluginServers,
      supremaEndpoints: supremaPluginServers,
      supremaSdkConnections,
      supremaCloudLinksNeeded,
      idemiaMorphoEnabled,
      controlIdBridgeServers,
      princetonIdentityServers,
      clearIdIdentities,
      clearIdKiosks,
      idScannerClients,
      xpressEntryServers,
      medecoXtLocks,
      keyCabinetCount,
      briefCamConnections,
      corsightAiBridges,
      alliedStreamConnectInstances,
      winGuardNodes,
      effectiveRsaTier,
      rsaShortRangeSensors,
      rsaRadars,
      rsaFenceControllers,
      rsaFenceKm,
      swmRpmUnits,
      swmRpmBlocks,
      genericSdkConnections,
      selectedPartnerSdks: activePartnerSdks,
      multiRoleServerSpec,
      compatibilityWarnings,
      lineItems,
      totalSoftwareMsrp,
      streamvaultPlan,
      totalHardwareMsrp,
      combinedTurnkeyMsrp: totalSoftwareMsrp + totalHardwareMsrp
    };
  }
};

window.GenetecLicensingSizer = GenetecLicensingSizer;
if (window.OSS && typeof window.OSS.register === "function") {
  window.OSS.register("Sizers.Genetec", { GenetecLicensingSizer });
}
