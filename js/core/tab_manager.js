// =========================================================================
// WORKSPACE TAB-BASED NAVIGATION ENGINE (NetSelect Enterprise)
// Persistent Multi-Studio Tab Manager for Physical Layout, Topology,
// Facility & Enclosures, Port Matrix, BOM, Cable Schedule, and Catalog Domains
// =========================================================================

const TabManager = (() => {
  // Capture raw original window functions to prevent recursive call stack loops
  const _rawOrigOpenPortMatrixStudio = window.openPortMatrixStudio;
  const _rawOrigClosePortMatrixStudio = window.closePortMatrixStudio;
  const _rawOrigOpenFacilityModal = window.openFacilityModal;
  const _rawOrigOpenRackViewerFor = window.openRackViewerFor;

  // Master Registry of Workspace Views
  const STUDIO_REGISTRY = {
    catalog_networking: {
      id: "catalog_networking",
      domainKey: "networking",
      title: "Networking",
      icon: "network",
      color: "indigo",
      closable: true,
      modalId: null,
      openFn: () => {
        closeAllToolModals();
        if (typeof switchDomain === "function") switchDomain("networking", false);
        if (typeof toggleCatalogExpand === "function") toggleCatalogExpand(true);
        if (typeof toggleFacilityExpand === "function") toggleFacilityExpand(false);
      },
      closeFn: null
    },
    catalog_physical_security: {
      id: "catalog_physical_security",
      domainKey: "physical_security",
      title: "Physical Security",
      icon: "video",
      color: "emerald",
      closable: true,
      modalId: null,
      openFn: () => {
        closeAllToolModals();
        if (typeof switchDomain === "function") switchDomain("physical_security", false);
        if (typeof toggleCatalogExpand === "function") toggleCatalogExpand(true);
        if (typeof toggleFacilityExpand === "function") toggleFacilityExpand(false);
      },
      closeFn: null
    },
    catalog_compute_storage: {
      id: "catalog_compute_storage",
      domainKey: "compute_storage",
      title: "Compute & Storage",
      icon: "hard-drive",
      color: "purple",
      closable: true,
      modalId: null,
      openFn: () => {
        closeAllToolModals();
        if (typeof switchDomain === "function") switchDomain("compute_storage", false);
        if (typeof toggleCatalogExpand === "function") toggleCatalogExpand(true);
        if (typeof toggleFacilityExpand === "function") toggleFacilityExpand(false);
      },
      closeFn: null
    },
    catalog_infrastructure: {
      id: "catalog_infrastructure",
      domainKey: "infrastructure",
      title: "Infrastructure",
      icon: "hammer",
      color: "amber",
      closable: true,
      modalId: null,
      openFn: () => {
        closeAllToolModals();
        if (typeof switchDomain === "function") switchDomain("infrastructure", false);
        if (typeof toggleCatalogExpand === "function") toggleCatalogExpand(true);
        if (typeof toggleFacilityExpand === "function") toggleFacilityExpand(false);
      },
      closeFn: null
    },
    catalog_software: {
      id: "catalog_software",
      domainKey: "software",
      title: "Software & Cloud",
      icon: "key",
      color: "sky",
      closable: true,
      modalId: null,
      openFn: () => {
        closeAllToolModals();
        if (typeof switchDomain === "function") switchDomain("software", false);
        if (typeof toggleCatalogExpand === "function") toggleCatalogExpand(true);
        if (typeof toggleFacilityExpand === "function") toggleFacilityExpand(false);
      },
      closeFn: null
    },
    catalog: {
      id: "catalog",
      title: "Product Catalog",
      icon: "layers",
      color: "brand",
      closable: true,
      modalId: null,
      openFn: () => {
        closeAllToolModals();
        if (typeof toggleCatalogExpand === "function") toggleCatalogExpand(true);
        if (typeof toggleFacilityExpand === "function") toggleFacilityExpand(false);
      },
      closeFn: () => {
        if (typeof toggleCatalogExpand === "function") toggleCatalogExpand(false);
      }
    },
    physical_layout: {
      id: "physical_layout",
      title: "Physical Layout",
      icon: "map",
      color: "amber",
      closable: true,
      modalId: "cableLayoutModal",
      openFn: () => {
        const m = document.getElementById("cableLayoutModal");
        if (m) {
          m.classList.remove("hidden");
          if (typeof loadFacilityState === "function") loadFacilityState();
          if (typeof initCableCanvas === "function") initCableCanvas();
          if (typeof syncBOMClosetsToFloors === "function") syncBOMClosetsToFloors();
          const curFl = typeof getActiveFloor === "function" ? getActiveFloor() : null;
          if (curFl && typeof autoSyncFiberBackbonesFromTopology === "function") {
            autoSyncFiberBackbonesFromTopology(curFl, false);
          }
          if (typeof renderFloorSelector === "function") renderFloorSelector();
          if (typeof syncFloorControlInputs === "function") syncFloorControlInputs();
          if (typeof recalculateCurrentFloorCables === "function") recalculateCurrentFloorCables();
          if (typeof renderCableCanvas === "function") renderCableCanvas();
          if (typeof renderInspector === "function") renderInspector();
          if (typeof renderSidebarTabContent === "function") renderSidebarTabContent();
          setTimeout(() => {
            if (typeof fitPhysicalLayoutToScreen === "function") fitPhysicalLayoutToScreen();
            if (window.lucide) lucide.createIcons();
          }, 60);
        }
      },
      closeFn: () => {
        const m = document.getElementById("cableLayoutModal");
        if (m) m.classList.add("hidden");
        if (typeof isDraggingPhysNode !== "undefined") window.isDraggingPhysNode = false;
        if (typeof isDraggingPhysWaypoint !== "undefined") window.isDraggingPhysWaypoint = false;
        if (typeof isPhysViewportPanning !== "undefined") window.isPhysViewportPanning = false;
        if (typeof draggedPhysNode !== "undefined") window.draggedPhysNode = null;
        if (typeof draggedPhysWaypoint !== "undefined") window.draggedPhysWaypoint = null;
      }
    },
    topology: {
      id: "topology",
      title: "Network Topology",
      icon: "network",
      color: "emerald",
      closable: true,
      modalId: "topologyModal",
      openFn: () => {
        const m = document.getElementById("topologyModal");
        if (m) {
          m.classList.remove("hidden");
          if (typeof initTopologyCanvas === "function") initTopologyCanvas();
          if (typeof renderTopology === "function") renderTopology();
          if (typeof renderTopologyInspector === "function") renderTopologyInspector();
          setTimeout(() => {
            if (typeof fitTopologyToScreen === "function") fitTopologyToScreen();
            if (window.lucide) lucide.createIcons();
          }, 60);
        }
      },
      closeFn: () => {
        const m = document.getElementById("topologyModal");
        if (m) m.classList.add("hidden");
        if (typeof isCanvasDragging !== "undefined") window.isCanvasDragging = false;
        if (typeof isViewportPanning !== "undefined") window.isViewportPanning = false;
        if (typeof draggedTopologyNode !== "undefined") window.draggedTopologyNode = null;
      }
    },
    facility: {
      id: "facility",
      title: "Hierarchy & Spaces",
      icon: "building-2",
      color: "sky",
      closable: true,
      modalId: "facilityModal",
      openFn: (ctx) => {
        const m = document.getElementById("facilityModal");
        if (m) {
          m.classList.remove("hidden");
          if (typeof switchFacilityView === "function") {
            switchFacilityView("hierarchy");
          } else if (typeof renderFacilityStudio === "function") {
            renderFacilityStudio();
          }
          if (window.lucide) lucide.createIcons();
        }
      },
      closeFn: () => {
        const m = document.getElementById("facilityModal");
        if (m) m.classList.add("hidden");
      }
    },
    enclosures: {
      id: "enclosures",
      title: "Enclosure Visualizer",
      icon: "server",
      color: "indigo",
      closable: true,
      modalId: "facilityModal",
      openFn: (ctx) => {
        const m = document.getElementById("facilityModal");
        if (m) {
          m.classList.remove("hidden");
          if (ctx && ctx.locationName && typeof openRackViewerFor === "function") {
            if (typeof _rawOrigOpenRackViewerFor === "function") {
              _rawOrigOpenRackViewerFor(ctx.locationName);
            } else {
              openRackViewerFor(ctx.locationName);
            }
          } else if (typeof switchFacilityView === "function") {
            switchFacilityView("visualizer");
          }
          if (window.lucide) lucide.createIcons();
        }
      },
      closeFn: () => {
        const m = document.getElementById("facilityModal");
        if (m) m.classList.add("hidden");
      }
    },
    port_matrix: {
      id: "port_matrix",
      title: "Port Matrix Studio",
      icon: "cpu",
      color: "indigo",
      closable: true,
      modalId: "portMatrixStudioModal",
      openFn: (ctx) => {
        const swId = ctx ? ctx.switchInstanceId : null;
        if (typeof _rawOrigOpenPortMatrixStudio === "function") {
          _rawOrigOpenPortMatrixStudio(swId);
        } else {
          const m = document.getElementById("portMatrixStudioModal");
          if (m) m.classList.remove("hidden");
        }
        if (window.lucide) lucide.createIcons();
      },
      closeFn: () => {
        const m = document.getElementById("portMatrixStudioModal");
        if (m) m.classList.add("hidden");
        if (typeof _rawClosePortMatrixStudio === "function") _rawClosePortMatrixStudio();
      }
    },
    bom: {
      id: "bom",
      title: "Quote BOM",
      icon: "shopping-bag",
      color: "brand",
      closable: true,
      modalId: "bomModal",
      openFn: () => {
        const m = document.getElementById("bomModal");
        if (m) {
          m.classList.remove("hidden");
          if (typeof renderBom === "function") renderBom();
          if (window.lucide) lucide.createIcons();
        }
      },
      closeFn: () => {
        const m = document.getElementById("bomModal");
        if (m) m.classList.add("hidden");
      }
    },
    cable_schedule: {
      id: "cable_schedule",
      title: "Cable Pull Schedule",
      icon: "file-spreadsheet",
      color: "amber",
      closable: true,
      modalId: "cableScheduleModal",
      openFn: () => {
        let m = document.getElementById("cableScheduleModal");
        if (!m) {
          if (typeof createCableScheduleModalDOM === "function") {
            const el = createCableScheduleModalDOM();
            if (el && !document.getElementById("cableScheduleModal")) document.body.appendChild(el);
          }
          m = document.getElementById("cableScheduleModal");
        }
        if (m) {
          m.classList.remove("hidden");
          if (typeof renderCablePullSchedule === "function") renderCablePullSchedule();
          if (window.lucide) lucide.createIcons();
        }
      },
      closeFn: () => {
        const m = document.getElementById("cableScheduleModal");
        if (m) m.classList.add("hidden");
      }
    },
    drc: {
      id: "drc",
      title: "Design Rule Checker (DRC)",
      icon: "check-circle-2",
      color: "emerald",
      closable: true,
      modalId: "projectHealthModal",
      openFn: () => {
        const m = document.getElementById("projectHealthModal");
        if (m) {
          m.classList.remove("hidden");
          if (typeof renderProjectHealthModal === "function") renderProjectHealthModal();
          if (window.lucide) lucide.createIcons();
        }
      },
      closeFn: () => {
        const m = document.getElementById("projectHealthModal");
        if (m) m.classList.add("hidden");
      }
    },
    submittal: {
      id: "submittal",
      title: "Engineering Submittal",
      icon: "file-text",
      color: "purple",
      closable: true,
      modalId: "submittalModal",
      openFn: () => {
        let m = document.getElementById("submittalModal");
        if (!m) {
          if (typeof createSubmittalModalDOM === "function") {
            const el = createSubmittalModalDOM();
            if (el && !document.getElementById("submittalModal")) document.body.appendChild(el);
          }
          m = document.getElementById("submittalModal");
        }
        if (m) {
          m.classList.remove("hidden");
          if (typeof renderSubmittalPreview === "function") renderSubmittalPreview();
          if (window.lucide) lucide.createIcons();
        }
      },
      closeFn: () => {
        const m = document.getElementById("submittalModal");
        if (m) m.classList.add("hidden");
      }
    },
    revisions: {
      id: "revisions",
      title: "Revisions & Change Orders",
      icon: "git-branch",
      color: "emerald",
      closable: true,
      modalId: "revisionModal",
      openFn: () => {
        let m = document.getElementById("revisionModal");
        if (!m) {
          if (typeof createRevisionModalDOM === "function") {
            const el = createRevisionModalDOM();
            if (el && !document.getElementById("revisionModal")) document.body.appendChild(el);
          }
          m = document.getElementById("revisionModal");
        }
        if (m) {
          m.classList.remove("hidden");
          if (typeof renderRevisionTimeline === "function") renderRevisionTimeline();
          if (typeof initRevisionDiffDropdowns === "function") initRevisionDiffDropdowns();
          if (window.lucide) lucide.createIcons();
        }
      },
      closeFn: () => {
        const m = document.getElementById("revisionModal");
        if (m) m.classList.add("hidden");
      }
    }
  };

  // Initial State: Start with Networking Catalog active
  let openTabs = [
    { id: "catalog_networking", title: "Networking", icon: "network", closable: true, context: null }
  ];
  let activeTabId = "catalog_networking";

  function closeAllToolModals() {
    const modalIds = [
      "cableLayoutModal",
      "topologyModal",
      "facilityModal",
      "portMatrixStudioModal",
      "bomModal",
      "cableScheduleModal",
      "projectHealthModal",
      "submittalModal",
      "revisionModal"
    ];
    modalIds.forEach(id => {
      const el = document.getElementById(id);
      if (el && !el.classList.contains("hidden")) {
        el.classList.add("hidden");
      }
    });
  }

  function init() {
    renderTabBar();
    setupGlobalSyncHooks();
    if (activeTabId.startsWith("catalog") && typeof toggleCatalogExpand === "function") {
      toggleCatalogExpand(true);
    }
  }

  function openTab(studioKey, context = null) {
    const studio = STUDIO_REGISTRY[studioKey];
    if (!studio) return;

    // Check if already in openTabs
    const existing = openTabs.find(t => t.id === studioKey);
    if (!existing) {
      openTabs.push({
        id: studioKey,
        title: studio.title,
        icon: studio.icon,
        closable: studio.closable,
        context: context
      });
    } else if (context) {
      existing.context = context;
    }

    activateTab(studioKey, context);
  }

  function activateTab(tabId, context = null) {
    const tab = openTabs.find(t => t.id === tabId);
    if (!tab) return;

    const prevTabId = activeTabId;
    if (prevTabId && prevTabId !== tabId) {
      const prevStudio = STUDIO_REGISTRY[prevTabId];
      if (prevStudio && prevStudio.closeFn) {
        try {
          prevStudio.closeFn();
        } catch (err) {
          console.warn("Error in studio closeFn:", prevTabId, err);
        }
      }
    }

    // Ensure all tool modals are hidden
    closeAllToolModals();

    activeTabId = tabId;
    const studio = STUDIO_REGISTRY[tabId];

    // If opening a studio tab, invoke its openFn
    if (studio && studio.openFn) {
      try {
        studio.openFn(context || tab.context);
      } catch (err) {
        console.error("Error in studio openFn:", tabId, err);
      }
    }

    // Auto-expand/collapse catalog and facility sub-views depending on active tab
    if (tabId.startsWith("catalog")) {
      if (typeof toggleCatalogExpand === "function") toggleCatalogExpand(true);
      if (typeof toggleFacilityExpand === "function") toggleFacilityExpand(false);
    } else if (tabId === "facility" || tabId === "enclosures" || tabId === "port_matrix") {
      if (typeof toggleFacilityExpand === "function") toggleFacilityExpand(true);
      if (typeof toggleCatalogExpand === "function") toggleCatalogExpand(false);
      if (typeof updateFacilitySubNavUI === "function") updateFacilitySubNavUI();
    } else {
      if (typeof toggleCatalogExpand === "function") toggleCatalogExpand(false);
      if (typeof toggleFacilityExpand === "function") toggleFacilityExpand(false);
    }

    renderTabBar();
  }

  function closeTab(tabId, e = null) {
    if (e) {
      if (typeof e.stopPropagation === "function") e.stopPropagation();
      if (typeof e.preventDefault === "function") e.preventDefault();
    }
    const idx = openTabs.findIndex(t => t.id === tabId);
    if (idx === -1) return;

    // Do not allow closing if it's the only tab open
    if (openTabs.length <= 1) return;

    const tab = openTabs[idx];
    const studio = STUDIO_REGISTRY[tabId];
    if (studio && studio.closeFn) {
      try {
        studio.closeFn();
      } catch (err) {
        console.warn("Error in studio closeFn:", tabId, err);
      }
    }

    openTabs.splice(idx, 1);

    // If we closed the active tab, switch to an adjacent tab
    if (activeTabId === tabId) {
      const nextTab = openTabs[Math.max(0, idx - 1)] || openTabs[0];
      if (nextTab) {
        activateTab(nextTab.id, nextTab.context);
      }
    } else {
      renderTabBar();
    }
  }

  function renderTabBar() {
    const container = document.getElementById("workspaceTabsList");
    if (!container) return;

    container.innerHTML = openTabs.map(tab => {
      const isActive = tab.id === activeTabId;
      const activeClasses = isActive
        ? "bg-slate-950 text-white font-bold border-t border-x border-slate-700/80 border-b-2 border-b-brand-500 shadow-sm"
        : "bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border-t border-x border-transparent border-b-2 border-b-transparent";

      const canClose = (tab.closable !== false) && openTabs.length > 1;

      return `
        <div onclick="TabManager.activateTab('${tab.id}')" 
             onauxclick="if(event.button === 1) TabManager.closeTab('${tab.id}', event)"
             id="workspace-tab-${tab.id}" 
             class="group px-3.5 py-2 rounded-t-xl text-xs flex items-center gap-2 transition-all cursor-pointer select-none shrink-0 ${activeClasses}">
          <i data-lucide="${tab.icon}" class="w-3.5 h-3.5 ${isActive ? 'text-brand-400' : 'text-slate-500 group-hover:text-slate-400'}"></i>
          <span class="truncate max-w-[140px] sm:max-w-[180px]">${tab.title}</span>
          ${canClose ? `
            <button type="button" onclick="TabManager.closeTab('${tab.id}', event)" class="p-0.5 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 opacity-70 group-hover:opacity-100 transition-all ml-0.5" title="Close Tab (Ctrl+W / Middle-Click)">
              <i data-lucide="x" class="w-3 h-3"></i>
            </button>
          ` : ''}
        </div>
      `;
    }).join('');

    if (window.lucide) {
      lucide.createIcons();
    }
  }

  function toggleNewTabMenu(e) {
    if (e && typeof e.stopPropagation === "function") {
      e.stopPropagation();
    }
    const dropdown = document.getElementById("newTabMenuDropdown");
    if (!dropdown) return;
    const isOpening = dropdown.classList.contains("hidden");
    dropdown.classList.toggle("hidden");
    if (isOpening) {
      renderNewTabMenuContent();
    }
  }

  function closeNewTabMenu() {
    const dropdown = document.getElementById("newTabMenuDropdown");
    if (dropdown) dropdown.classList.add("hidden");
  }

  function renderNewTabMenuContent() {
    const dropdown = document.getElementById("newTabMenuDropdown");
    if (!dropdown) return;

    const sections = [
      {
        title: "Catalogs",
        keys: ["catalog_networking", "catalog_physical_security", "catalog_compute_storage", "catalog_infrastructure", "catalog_software"]
      },
      {
        title: "Layout & Infrastructure",
        keys: ["physical_layout", "topology", "facility", "enclosures", "port_matrix"]
      },
      {
        title: "Project Delivery & Engineering",
        keys: ["bom", "cable_schedule", "drc", "submittal", "revisions"]
      }
    ];

    dropdown.innerHTML = `
      <div class="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 flex items-center justify-between">
        <span>Open Workspace Tab</span>
        <span class="text-[9px] font-mono text-slate-500">Esc to close</span>
      </div>
      <div class="py-1 space-y-2 max-h-80 overflow-y-auto pr-1">
        ${sections.map(sec => `
          <div>
            <div class="px-2 pt-1 pb-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">${sec.title}</div>
            <div class="space-y-0.5">
              ${sec.keys.map(k => {
                const s = STUDIO_REGISTRY[k];
                if (!s) return "";
                const isOpen = openTabs.some(t => t.id === s.id);
                return `
                  <button type="button" onclick="TabManager.openTab('${s.id}'); TabManager.closeNewTabMenu();" class="w-full text-left px-2 py-1 rounded-lg text-xs flex items-center justify-between hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer">
                    <div class="flex items-center gap-2">
                      <i data-lucide="${s.icon}" class="w-3.5 h-3.5 text-brand-400"></i>
                      <span class="font-medium text-[11px]">${s.title}</span>
                    </div>
                    ${isOpen ? '<span class="text-[9px] text-brand-400 font-mono">Open</span>' : ''}
                  </button>
                `;
              }).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;

    if (window.lucide) {
      lucide.createIcons();
    }
  }

  // Intercept existing tool open functions so clicking nav buttons opens/activates tabs cleanly
  function setupGlobalSyncHooks() {
    // Physical Layout
    window.toggleCableLayoutModal = function() {
      openTab("physical_layout");
    };

    // Topology
    window.toggleTopologyModal = function() {
      openTab("topology");
    };

    // Facility & Enclosures
    window.toggleFacilityModal = function(view, loc) {
      if (view === "visualizer" || loc) {
        openTab("enclosures", loc ? { locationName: loc } : null);
      } else {
        openTab("facility", loc ? { locationName: loc } : null);
      }
    };
    window.openFacilityModal = function(view = "hierarchy") {
      if (view === "visualizer") {
        openTab("enclosures");
      } else {
        openTab("facility");
      }
    };
    window.openRackViewerFor = function(locationName) {
      openTab("enclosures", { locationName });
    };

    // BOM
    window.toggleBomModal = function() {
      openTab("bom");
    };

    // DRC Health
    window.toggleProjectHealthModal = function() {
      openTab("drc");
    };

    // Cable Schedule
    window.openCablePullScheduleModal = function() {
      openTab("cable_schedule");
    };
    window.closeCablePullScheduleModal = function() {
      if (activeTabId === "cable_schedule") {
        closeTab("cable_schedule");
      } else {
        const m = document.getElementById("cableScheduleModal");
        if (m) m.classList.add("hidden");
      }
    };

    // Submittal
    window.openEngineeringSubmittalModal = function() {
      openTab("submittal");
    };
    window.openSubmittalModal = window.openEngineeringSubmittalModal;
    window.closeSubmittalModal = function() {
      if (activeTabId === "submittal") {
        closeTab("submittal");
      } else {
        const m = document.getElementById("submittalModal");
        if (m) m.classList.add("hidden");
      }
    };

    // Revisions
    window.openRevisionModal = function() {
      openTab("revisions");
    };
    window.closeRevisionModal = function() {
      if (activeTabId === "revisions") {
        closeTab("revisions");
      } else {
        const m = document.getElementById("revisionModal");
        if (m) m.classList.add("hidden");
      }
    };

    // Port Matrix Studio
    window.openPortMatrixStudio = function(swId) {
      openTab("port_matrix", { switchInstanceId: swId });
    };
    window.closePortMatrixStudio = function() {
      if (activeTabId === "port_matrix") {
        closeTab("port_matrix");
      } else {
        const m = document.getElementById("portMatrixStudioModal");
        if (m) m.classList.add("hidden");
        if (typeof _rawClosePortMatrixStudio === "function") _rawClosePortMatrixStudio();
      }
    };
  }

  // Keyboard shortcut for tab navigation (Ctrl+W closes active tab, Ctrl+T opens new tab menu)
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.key === "w") {
      if (openTabs.length > 1) {
        e.preventDefault();
        closeTab(activeTabId);
      }
    } else if (e.ctrlKey && e.key === "t") {
      e.preventDefault();
      toggleNewTabMenu();
    } else if (e.key === "Escape") {
      const dropdown = document.getElementById("newTabMenuDropdown");
      if (dropdown && !dropdown.classList.contains("hidden")) {
        e.preventDefault();
        closeNewTabMenu();
      }
    }
  });

  // Click outside to close '+' dropdown
  document.addEventListener("click", (e) => {
    const wrapper = document.getElementById("newTabMenuWrapper");
    const dropdown = document.getElementById("newTabMenuDropdown");
    if (dropdown && !dropdown.classList.contains("hidden")) {
      if (wrapper && !wrapper.contains(e.target)) {
        closeNewTabMenu();
      }
    }
  });

  return {
    init,
    openTab,
    activateTab,
    closeTab,
    toggleNewTabMenu,
    closeNewTabMenu,
    getActiveTabId: () => activeTabId,
    getOpenTabs: () => [...openTabs]
  };
})();

window.TabManager = TabManager;

// Self-initializing: works whether script loads before or after DOM ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    TabManager.init();
  });
} else {
  TabManager.init();
}
