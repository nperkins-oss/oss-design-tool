// =========================================================================
// RACK DRAG-AND-DROP DISPLACEMENT, STANDARD PODS & HOST TELEMETRY ENGINE
// Separated from js/tools/rack.js for modular maintainability
// =========================================================================


// -----------------------------------------------------------
// Drag & Drop Mechanics
// -----------------------------------------------------------
function handleRackItemDragStart(e, instanceId) {
  draggedRackItemInstanceId = instanceId;
  e.dataTransfer.setData("text/plain", instanceId);
  e.dataTransfer.effectAllowed = "move";
}

function handleRackSlotDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
}

function calculateRackBumpDisplacements(otherItems, newItemId, targetU, newItemHeight, maxU) {
  if (targetU + newItemHeight - 1 > maxU) {
    return { success: false, reason: "exceeds_top" };
  }
  if (targetU < 1) {
    return { success: false, reason: "exceeds_bottom" };
  }

  function getItemH(it) {
    if (!it) return newItemHeight;
    return getRackItemHeight(it);
  }

  // 1. Primary Strategy: Cascading Bump DOWN (pushes occupying & lower items down toward U1)
  const placementsDown = {};
  placementsDown[newItemId] = targetU;
  let currentCeiling = targetU - 1;
  const sortedDown = [...otherItems].sort((a, b) => parseInt(b.rackSlot, 10) - parseInt(a.rackSlot, 10));
  let canDown = true;
  let bumpedCountDown = 0;

  for (const it of sortedDown) {
    const origBase = parseInt(it.rackSlot, 10);
    const h = getItemH(it);
    const origTop = origBase + h - 1;

    // If strictly above new item's occupied span, it is unaffected by bump down
    if (origBase > (targetU + newItemHeight - 1)) {
      placementsDown[it.instanceId] = origBase;
      continue;
    }

    const overlapsNew = Math.max(origBase, targetU) <= Math.min(origTop, targetU + newItemHeight - 1);
    if (overlapsNew || origTop > currentCeiling) {
      const newTop = Math.min(origTop, currentCeiling);
      const newBase = newTop - h + 1;
      if (newBase < 1) {
        canDown = false;
        break;
      }
      placementsDown[it.instanceId] = newBase;
      currentCeiling = newBase - 1;
      if (newBase !== origBase) bumpedCountDown++;
    } else {
      placementsDown[it.instanceId] = origBase;
      currentCeiling = Math.min(currentCeiling, origBase - 1);
    }
  }

  // Check for pairwise collisions in placementsDown
  if (canDown) {
    const spans = [];
    for (const iId of Object.keys(placementsDown)) {
      const it = (iId === newItemId) ? null : otherItems.find(x => x.instanceId === iId);
      const h = getItemH(it);
      const slot = placementsDown[iId];
      spans.push({ id: iId, start: slot, end: slot + h - 1 });
    }
    for (let i = 0; i < spans.length; i++) {
      for (let j = i + 1; j < spans.length; j++) {
        if (Math.max(spans[i].start, spans[j].start) <= Math.min(spans[i].end, spans[j].end)) {
          canDown = false;
          break;
        }
      }
      if (!canDown) break;
    }
  }

  if (canDown) {
    return { success: true, placements: placementsDown, bumpedCount: bumpedCountDown, direction: "down" };
  }

  // 2. Secondary Strategy: If cascading bump DOWN hits bottom (U1), try Bump UPWARD
  const placementsUp = {};
  placementsUp[newItemId] = targetU;
  let currentFloor = targetU + newItemHeight;
  const sortedUp = [...otherItems].sort((a, b) => parseInt(a.rackSlot, 10) - parseInt(b.rackSlot, 10));
  let canUp = true;
  let bumpedCountUp = 0;

  for (const it of sortedUp) {
    const origBase = parseInt(it.rackSlot, 10);
    const h = getItemH(it);
    const origTop = origBase + h - 1;

    // If strictly below new item's bottom U, unaffected by bump up
    if (origTop < targetU) {
      placementsUp[it.instanceId] = origBase;
      continue;
    }

    const overlapsNew = Math.max(origBase, targetU) <= Math.min(origTop, targetU + newItemHeight - 1);
    if (overlapsNew || origBase < currentFloor) {
      const newBase = Math.max(origBase, currentFloor);
      const newTop = newBase + h - 1;
      if (newTop > maxU) {
        canUp = false;
        break;
      }
      placementsUp[it.instanceId] = newBase;
      currentFloor = newTop + 1;
      if (newBase !== origBase) bumpedCountUp++;
    } else {
      placementsUp[it.instanceId] = origBase;
      currentFloor = Math.max(currentFloor, origTop + 1);
    }
  }

  if (canUp) {
    const spans = [];
    for (const iId of Object.keys(placementsUp)) {
      const it = (iId === newItemId) ? null : otherItems.find(x => x.instanceId === iId);
      const h = getItemH(it);
      const slot = placementsUp[iId];
      spans.push({ id: iId, start: slot, end: slot + h - 1 });
    }
    for (let i = 0; i < spans.length; i++) {
      for (let j = i + 1; j < spans.length; j++) {
        if (Math.max(spans[i].start, spans[j].start) <= Math.min(spans[i].end, spans[j].end)) {
          canUp = false;
          break;
        }
      }
      if (!canUp) break;
    }
  }

  if (canUp) {
    return { success: true, placements: placementsUp, bumpedCount: bumpedCountUp, direction: "up" };
  }

  return { success: false, reason: "insufficient_space" };
}

function handleRackSlotDrop(e, targetU) {
  e.preventDefault();
  const instanceId = draggedRackItemInstanceId || e.dataTransfer.getData("text/plain");
  if (!instanceId || typeof projectBOM === "undefined") return;

  const item = projectBOM.find(i => i.instanceId === instanceId);
  if (!item) return;

  const dropHostType = (typeof FacilityStore !== "undefined" && typeof FacilityStore.parse === "function") 
    ? (FacilityStore.parse(activeRackId).hostType || "equipment_rack")
    : "equipment_rack";
  if (typeof autoSelectMountingForHost === "function") {
    autoSelectMountingForHost(item, activeRackId, dropHostType);
  }

  const stackUnits = (item.stackedUnits && item.stackedUnits >= 2) ? item.stackedUnits : 1;
  const itemHeight = getRackItemHeight(item);

  if (itemHeight > activeRackHeight) {
    if (typeof showToast === "function") {
      showToast(`Cannot place ${itemHeight}U (${item.model}): exceeds total cabinet height (${activeRackHeight}U).`);
    }
    draggedRackItemInstanceId = null;
    return;
  }

  // When dragging a multiple U device, targetU represents where the TOP of the unit should go.
  // Calculate base U: baseU = targetU - itemHeight + 1 (clamped so baseU >= 1 and top <= activeRackHeight).
  let effectiveBaseU = targetU - itemHeight + 1;
  if (effectiveBaseU < 1) effectiveBaseU = 1;
  if ((effectiveBaseU + itemHeight - 1) > activeRackHeight) {
    effectiveBaseU = Math.max(1, activeRackHeight - itemHeight + 1);
  }

  // 1. Collect other items mounted in this rack
  const otherItems = projectBOM.filter(other => {
    if (other.instanceId === item.instanceId || other.parentInstanceId) return false;
    const otherLoc = FacilityStore.normalize(other.closetName || other.rackId);
    if (otherLoc !== activeRackId) return false;
    const otherU = parseInt(other.rackSlot, 10);
    return !!(otherU && !isNaN(otherU) && otherU >= 1);
  });

  // 2. Calculate placements with intelligent cascading displacement ("bump down")
  const bumpRes = calculateRackBumpDisplacements(otherItems, item.instanceId, effectiveBaseU, itemHeight, activeRackHeight);

  if (!bumpRes.success) {
    if (typeof showToast === "function") {
      if (bumpRes.reason === "exceeds_top") {
        showToast(`Cannot place ${itemHeight}U device at U${targetU}: exceeds cabinet top (U${activeRackHeight}).`);
      } else {
        showToast(`Cannot place ${item.model} at U${targetU}: rack has insufficient space below U1 to bump occupying equipment down.`);
      }
    }
    draggedRackItemInstanceId = null;
    return;
  }

  // 3. Commit all displacements (and restore self-contained 2x24P pods if manually rearranging unstacked 48P switches)
  clearRackPodAdjacentRoles(activeRackId);
  Object.keys(bumpRes.placements).forEach(instId => {
    const targetItem = projectBOM.find(x => x.instanceId === instId);
    if (targetItem) {
      targetItem.rackSlot = bumpRes.placements[instId];
      targetItem.closetName = activeRackId;
      targetItem.rackId = activeRackId;
      projectBOM.filter(ch => ch.parentInstanceId === targetItem.instanceId).forEach(ch => {
        ch.closetName = activeRackId;
        ch.rackId = activeRackId;
      });
    }
  });

  FacilityStore.notifyWorkspaceChange();
  renderRackVisualizer();
  if (typeof updateBOMView === "function") updateBOMView();
  if (typeof renderTopology === "function") renderTopology();
  if (typeof StorageService !== "undefined" && typeof StorageService.queueAutoSave === "function") {
    StorageService.queueAutoSave();
  }

  const topU = effectiveBaseU + itemHeight - 1;
  const slotLabel = itemHeight > 1 ? `U${topU}-U${effectiveBaseU}` : `U${effectiveBaseU}`;
  if (typeof showToast === "function") {
    if (bumpRes.bumpedCount > 0) {
      showToast(`Mounted ${item.model} at ${slotLabel} (bumped ${bumpRes.bumpedCount} item${bumpRes.bumpedCount === 1 ? '' : 's'} ${bumpRes.direction === 'down' ? 'down' : 'up'})`);
    } else {
      showToast(`Mounted ${item.model} into ${activeRackId} at ${slotLabel}`);
    }
  }
  draggedRackItemInstanceId = null;
}

function updateSwitchStackFromRack(instanceId, newCount) {
  if (typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) return;
  const item = projectBOM.find(i => i.instanceId === instanceId);
  if (!item) return;

  const targetCount = Math.max(1, Math.min(8, parseInt(newCount, 10) || 1));
  const currentAssignedU = parseInt(item.rackSlot, 10);
  const isMounted = currentAssignedU && !isNaN(currentAssignedU) && currentAssignedU >= 1;
  const baseRU = (item.rackUnits !== undefined && item.rackUnits !== null) ? (parseInt(item.rackUnits, 10) || 0) : 1;

  if (targetCount === 1) {
    item.stackedUnits = 0;
    item.qty = 1;
    item.patchPanelBetween = false;
    if (typeof syncPerChassisChildQuantities === "function") syncPerChassisChildQuantities(item);
    if (typeof PortEngine !== "undefined") {
      PortEngine.initSwitchPorts(item, true);
    }
    if (typeof applyStackCabling === "function") {
      applyStackCabling(item);
    }
    FacilityStore.notifyWorkspaceChange();
    renderRackVisualizer();
    if (typeof renderTopology === "function") renderTopology();
    if (typeof updateBOMView === "function") updateBOMView();
    if (typeof StorageService !== "undefined" && typeof StorageService.queueAutoSave === "function") {
      StorageService.queueAutoSave();
    }
    if (typeof showToast === "function") {
      showToast(`Configured ${item.model} as Standalone Chassis.`);
    }
    return;
  }

  const newHeight = getRackItemHeight({ ...item, stackedUnits: targetCount });

  if (isMounted) {
    let targetU = currentAssignedU;
    if (targetU + newHeight - 1 > activeRackHeight) {
      targetU = Math.max(1, activeRackHeight - newHeight + 1);
    }

    const otherItems = projectBOM.filter(other => {
      if (other.instanceId === item.instanceId || other.parentInstanceId) return false;
      const otherLoc = FacilityStore.normalize(other.closetName || other.rackId);
      if (otherLoc !== activeRackId) return false;
      const otherU = parseInt(other.rackSlot, 10);
      return !!(otherU && !isNaN(otherU) && otherU >= 1);
    });

    const bumpRes = calculateRackBumpDisplacements(otherItems, item.instanceId, targetU, newHeight, activeRackHeight);
    if (!bumpRes.success) {
      if (typeof showToast === "function") {
        showToast(`Cannot expand stack to ${targetCount}x (${newHeight}U): insufficient space in cabinet to bump equipment.`);
      }
      return;
    }

    // Apply displacements
    Object.keys(bumpRes.placements).forEach(instId => {
      const targetItem = projectBOM.find(x => x.instanceId === instId);
      if (targetItem) {
        targetItem.rackSlot = bumpRes.placements[instId];
        targetItem.closetName = activeRackId;
        targetItem.rackId = activeRackId;
        projectBOM.filter(ch => ch.parentInstanceId === targetItem.instanceId).forEach(ch => {
          ch.closetName = activeRackId;
          ch.rackId = activeRackId;
        });
      }
    });
  }

  const prevStacked = parseInt(item.stackedUnits, 10) || 0;
  item.canStack = true;
  item.stackedUnits = targetCount;
  item.qty = (prevStacked >= 2 && item.qty === prevStacked) ? targetCount : Math.max(item.qty || 1, targetCount);
  item.uplinkMode = "lag_dual";
  item.customLinkMultiplier = Math.max(item.customLinkMultiplier || 1, 2);
  if (typeof syncPerChassisChildQuantities === "function") syncPerChassisChildQuantities(item);

  if (typeof PortEngine !== "undefined") {
    PortEngine.initSwitchPorts(item, true);
  }
  if (typeof applyStackCabling === "function") {
    applyStackCabling(item);
  }

  // Keep child items synchronized
  projectBOM.filter(ch => ch.parentInstanceId === item.instanceId).forEach(ch => {
    ch.closetName = item.closetName;
    ch.rackId = item.rackId;
  });

  FacilityStore.notifyWorkspaceChange();
  renderRackVisualizer();
  if (typeof renderTopology === "function") renderTopology();
  if (typeof updateBOMView === "function") updateBOMView();
  if (typeof StorageService !== "undefined" && typeof StorageService.queueAutoSave === "function") {
    StorageService.queueAutoSave();
  }

  if (typeof showToast === "function") {
    showToast(`Configured ${item.model} as a ${targetCount}-Unit Virtual Stack${isMounted ? ` in ${activeRackId}` : ''}.`);
  }
}

function toggleStackPatchPanel(instanceId) {
  if (typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) return;
  const item = projectBOM.find(i => i.instanceId === instanceId);
  if (!item || !item.stackedUnits || item.stackedUnits < 2) return;

  const willEnable = !item.patchPanelBetween;
  const stackUnits = item.stackedUnits;
  const ppMeta = getRackSwitchPatchPanelMeta(item);
  const currentAssignedU = parseInt(item.rackSlot, 10);

  if (willEnable && currentAssignedU && currentAssignedU >= 1) {
    const newHeight = getRackItemHeight({ ...item, patchPanelBetween: true, cableManagerBetween: false });
    const hostId = FacilityStore.normalize(item.closetName || item.rackId);
    let targetU = currentAssignedU;

    // Adjust targetU if it exceeds top
    if ((targetU + newHeight - 1) > activeRackHeight) {
      targetU = Math.max(1, activeRackHeight - newHeight + 1);
    }

    const otherItems = projectBOM.filter(other => {
      if (other.instanceId === item.instanceId || other.parentInstanceId) return false;
      const otherLoc = FacilityStore.normalize(other.closetName || other.rackId);
      if (otherLoc !== hostId) return false;
      const otherU = parseInt(other.rackSlot, 10);
      return !!(otherU && !isNaN(otherU) && otherU >= 1);
    });

    const bumpRes = calculateRackBumpDisplacements(otherItems, item.instanceId, targetU, newHeight, activeRackHeight);
    if (!bumpRes.success) {
      if (typeof showToast === "function") {
        showToast(`Cannot enable patch panels: expanding to ${newHeight}U exceeds available space in cabinet.`);
      }
      return;
    }

    // Apply displacements
    Object.keys(bumpRes.placements).forEach(instId => {
      const targetItem = projectBOM.find(x => x.instanceId === instId);
      if (targetItem) {
        targetItem.rackSlot = bumpRes.placements[instId];
        targetItem.closetName = hostId;
        targetItem.rackId = hostId;
        projectBOM.filter(ch => ch.parentInstanceId === targetItem.instanceId).forEach(ch => {
          ch.closetName = hostId;
          ch.rackId = hostId;
        });
      }
    });
  }

  item.patchPanelBetween = willEnable;
  if (willEnable) {
    item.cableManagerBetween = false;
  }

  if (typeof applyStackCabling === "function") {
    applyStackCabling(item);
  }

  // Keep child items synchronized in location
  projectBOM.filter(ch => ch.parentInstanceId === item.instanceId).forEach(ch => {
    ch.closetName = item.closetName;
    ch.rackId = item.rackId;
  });

  if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
    FacilityStore.notifyWorkspaceChange();
  }
  renderRackVisualizer();
  if (typeof updateBOMView === "function") updateBOMView();
  if (typeof renderBOM === "function") renderBOM();
  if (typeof renderTopology === "function") renderTopology();
  if (typeof StorageService !== "undefined" && typeof StorageService.queueAutoSave === "function") {
    StorageService.queueAutoSave();
  }

  if (typeof showToast === "function") {
    showToast(willEnable
      ? `Added ${ppMeta.rackUnits}U ${ppMeta.ports}-Port Patch Panel between stacked switches (${stackUnits - 1}x ${ppMeta.sku} added)`
      : `Removed interleaved patch panels from switch stack.`);
  }
}

function toggleStackCableManager(instanceId) {
  if (typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) return;
  const item = projectBOM.find(i => i.instanceId === instanceId);
  if (!item || !item.stackedUnits || item.stackedUnits < 2) return;

  const willEnable = !item.cableManagerBetween;
  const stackUnits = item.stackedUnits;
  const currentAssignedU = parseInt(item.rackSlot, 10);

  if (willEnable && currentAssignedU && currentAssignedU >= 1) {
    const newHeight = getRackItemHeight({ ...item, cableManagerBetween: true });
    const hostId = FacilityStore.normalize(item.closetName || item.rackId);
    let targetU = currentAssignedU;

    if ((targetU + newHeight - 1) > activeRackHeight) {
      targetU = Math.max(1, activeRackHeight - newHeight + 1);
    }

    const otherItems = projectBOM.filter(other => {
      if (other.instanceId === item.instanceId || other.parentInstanceId) return false;
      const otherLoc = FacilityStore.normalize(other.closetName || other.rackId);
      if (otherLoc !== hostId) return false;
      const otherU = parseInt(other.rackSlot, 10);
      return !!(otherU && !isNaN(otherU) && otherU >= 1);
    });

    const bumpRes = calculateRackBumpDisplacements(otherItems, item.instanceId, targetU, newHeight, activeRackHeight);
    if (!bumpRes.success) {
      if (typeof showToast === "function") {
        showToast(`Cannot enable cable manager: expanding to ${newHeight}U exceeds available space in cabinet.`);
      }
      return;
    }

    Object.keys(bumpRes.placements).forEach(instId => {
      const targetItem = projectBOM.find(x => x.instanceId === instId);
      if (targetItem) {
        targetItem.rackSlot = bumpRes.placements[instId];
        targetItem.closetName = hostId;
        targetItem.rackId = hostId;
        projectBOM.filter(ch => ch.parentInstanceId === targetItem.instanceId).forEach(ch => {
          ch.closetName = hostId;
          ch.rackId = hostId;
        });
      }
    });
  }

  item.cableManagerBetween = willEnable;

  if (typeof applyStackCabling === "function") {
    applyStackCabling(item);
  }

  projectBOM.filter(ch => ch.parentInstanceId === item.instanceId).forEach(ch => {
    ch.closetName = item.closetName;
    ch.rackId = item.rackId;
  });

  if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
    FacilityStore.notifyWorkspaceChange();
  }
  renderRackVisualizer();
  if (typeof updateBOMView === "function") updateBOMView();
  if (typeof renderBOM === "function") renderBOM();
  if (typeof renderTopology === "function") renderTopology();
  if (typeof StorageService !== "undefined" && typeof StorageService.queueAutoSave === "function") {
    StorageService.queueAutoSave();
  }

  if (typeof showToast === "function") {
    showToast(willEnable
      ? `Added 1U Horizontal Cable Manager between stacked switches (${stackUnits - 1}x HCM added)`
      : `Removed in-stack cable managers from switch stack.`);
  }
}

function toggleSwitchStandardPod(instanceId) {
  if (typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) return;
  const item = projectBOM.find(i => i.instanceId === instanceId);
  if (!item) return;

  const willEnable = !item.standardPod;
  const stackUnits = (item.stackedUnits && item.stackedUnits >= 2) ? item.stackedUnits : 1;
  const currentAssignedU = parseInt(item.rackSlot, 10);

  if (willEnable && currentAssignedU && currentAssignedU >= 1) {
    const newHeight = getRackItemHeight({ ...item, standardPod: true });
    const hostId = FacilityStore.normalize(item.closetName || item.rackId);
    let targetU = currentAssignedU;

    if ((targetU + newHeight - 1) > activeRackHeight) {
      targetU = Math.max(1, activeRackHeight - newHeight + 1);
    }

    const otherItems = projectBOM.filter(other => {
      if (other.instanceId === item.instanceId || other.parentInstanceId) return false;
      const otherLoc = FacilityStore.normalize(other.closetName || other.rackId);
      if (otherLoc !== hostId) return false;
      const otherU = parseInt(other.rackSlot, 10);
      return !!(otherU && !isNaN(otherU) && otherU >= 1);
    });

    const bumpRes = calculateRackBumpDisplacements(otherItems, item.instanceId, targetU, newHeight, activeRackHeight);
    if (!bumpRes.success) {
      if (typeof showToast === "function") {
        showToast(`Cannot apply Standard Pod: expanding to ${newHeight}U exceeds available space in cabinet.`);
      }
      return;
    }

    Object.keys(bumpRes.placements).forEach(instId => {
      const targetItem = projectBOM.find(x => x.instanceId === instId);
      if (targetItem) {
        targetItem.rackSlot = bumpRes.placements[instId];
        targetItem.closetName = hostId;
        targetItem.rackId = hostId;
        projectBOM.filter(ch => ch.parentInstanceId === targetItem.instanceId).forEach(ch => {
          ch.closetName = hostId;
          ch.rackId = hostId;
        });
      }
    });
  }

  item.standardPod = willEnable;
  delete item.podAdjacentRole;

  if (typeof applyStandardPodCabling === "function") {
    applyStandardPodCabling(item);
    if (typeof commitCablingToBOM === "function" && typeof facilityFloors !== "undefined" && facilityFloors.some(f => (f.nodes || []).some(n => n.type === "device"))) {
      commitCablingToBOM({ silent: true });
    }
  }

  projectBOM.filter(ch => ch.parentInstanceId === item.instanceId).forEach(ch => {
    ch.closetName = item.closetName;
    ch.rackId = item.rackId;
  });

  if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
    FacilityStore.notifyWorkspaceChange();
  }
  renderRackVisualizer();
  if (typeof updateBOMView === "function") updateBOMView();
  if (typeof renderBOM === "function") renderBOM();
  if (typeof renderTopology === "function") renderTopology();
  if (typeof StorageService !== "undefined" && typeof StorageService.queueAutoSave === "function") {
    StorageService.queueAutoSave();
  }

  if (typeof showToast === "function") {
    const ppMeta = getRackSwitchPatchPanelMeta(item);
    const ports = (ppMeta.copperPorts || parseInt(item.ports, 10) || 24) * stackUnits;
    showToast(willEnable
      ? (ppMeta.isSandwich48
        ? `Applied 48P Sandwich Pod: ${ppMeta.outer24Count}x 24P Outer Panels${ppMeta.inner48Count > 0 ? ` + ${ppMeta.inner48Count}x 48P In-Between` : ' (Above & Below)'} with ${ports}x 6" Slim Cords.`
        : `Applied Standard Pod: ${ppMeta.sku} (${ppMeta.offset24?.is24Class ? ppMeta.offset24.shortBadge : `${ports}x 6" Slim Cords`}).`)
      : `Removed Standard Pod configuration from ${item.model}.`);
  }
}

function applyStandardPodsToActiveRack() {
  if (typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) return;
  const hostId = FacilityStore.normalize(activeRackId);

  // 1. Remove previous auto-generated fiber/firewall HCMs so we can re-evaluate freshly without doubling up
  projectBOM = projectBOM.filter(it => !((it.source === "fiber_firewall_hcm" || (it.source === "cabling_sync" && (it.sku || "").startsWith("PP-"))) && FacilityStore.normalize(it.closetName || it.rackId) === hostId));

  // 2. Find all mounted items in active rack
  const mountedItems = projectBOM.filter(it => {
    if (it.parentInstanceId) return false;
    const loc = FacilityStore.normalize(it.closetName || it.rackId);
    if (loc !== hostId) return false;
    const u = parseInt(it.rackSlot, 10);
    return !!(u && !isNaN(u) && u >= 1);
  });

  if (mountedItems.length === 0) {
    if (typeof showToast === "function") {
      showToast(`No equipment mounted in ${activeRackId}.`);
    }
    return;
  }

  // 3. Sort mounted items by enterprise priority first so adjacent standalone 48P switches can share 1U 48P in-between panels:
  // ISP > Firewalls > Core > Aggregation > Access Switches (copper pods) > Servers > UPSes
  mountedItems.sort((a, b) => {
    const pA = getDeviceMountPriority(a);
    const pB = getDeviceMountPriority(b);
    if (pA.priority !== pB.priority) {
      return pA.priority - pB.priority;
    }
    if (pA.priority === 5 || pA.portCount || pB.portCount) {
      const portDiff = (pB.portCount || 0) - (pA.portCount || 0);
      if (portDiff !== 0) return portDiff;
    }
    return (a.model || "").localeCompare(b.model || "");
  });

  // 4. Detect consecutive unstacked 48P copper switches so they form a unified [24P Top + 48P Switches w/ 48P In-Between + 24P Bottom] Sandwich
  mountedItems.forEach(it => { delete it.podAdjacentRole; });
  const isUnstacked48Copper = (it) => {
    if (!isCopperSwitch(it)) return false;
    const st = (it.stackedUnits && it.stackedUnits >= 2) ? it.stackedUnits : 1;
    if (st >= 2) return false;
    if (it.patchPanelSku && it.patchPanelSku !== "auto" && it.patchPanelSku !== "SANDWICH-48") return false;
    const cp = (typeof getSwitchCopperPortCount === "function") ? getSwitchCopperPortCount(it) : (parseInt(it.ports, 10) || 24);
    return cp > 24;
  };

  let runStart = -1;
  for (let i = 0; i <= mountedItems.length; i++) {
    const match = i < mountedItems.length && isUnstacked48Copper(mountedItems[i]);
    if (match && runStart === -1) {
      runStart = i;
    } else if (!match && runStart !== -1) {
      const runLen = i - runStart;
      if (runLen >= 2) {
        for (let k = runStart; k < i; k++) {
          mountedItems[k].podAdjacentRole = (k === runStart) ? "top" : ((k === i - 1) ? "bottom" : "middle");
        }
      }
      runStart = -1;
    }
  }

  let copperSwitchCount = 0;
  mountedItems.forEach(it => {
    if (isCopperSwitch(it)) {
      it.standardPod = true;
      if (typeof applyStandardPodCabling === "function") {
        applyStandardPodCabling(it);
      }
      copperSwitchCount++;
    } else if (isFiberSwitch(it) && it.stackedUnits >= 2) {
      // Stacked fiber switches get 1U in-stack cable management between units
      it.cableManagerBetween = true;
      if (typeof applyStackCabling === "function") {
        applyStackCabling(it);
      }
    }
  });

  // 5. Interleave 1U Horizontal Cable Managers between adjacent fiber switches and firewalls
  // WITHOUT doubling up (shared single 1U HCM between any two adjacent fiber/firewall devices)
  const finalOrderedItems = [];
  let hcmCount = 0;

  for (let idx = 0; idx < mountedItems.length; idx++) {
    const currentItem = mountedItems[idx];
    finalOrderedItems.push(currentItem);

    if (idx < mountedItems.length - 1) {
      const nextItem = mountedItems[idx + 1];
      // Check if BOTH current and next items are fiber switches or firewalls
      if (isFiberOrFirewall(currentItem) && isFiberOrFirewall(nextItem)) {
        // Create exactly ONE shared 1U Horizontal Cable Manager between them (never doubled up)
        const hcmItem = {
          instanceId: `hcm-auto-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
          id: "HCM-1U",
          sku: "HCM-1U",
          model: "1U Horizontal Cable Manager with Dual-Hinged Cover",
          role: "Structured Cabling",
          category: "Infrastructure",
          vendor: "Panduit",
          msrp: 45,
          rackUnits: 1,
          ports: 0,
          poeBudget: 0,
          baseWatts: 0,
          weightLbs: 2.0,
          qty: 1,
          closetName: hostId,
          rackId: hostId,
          rackSlot: null,
          isPassive: true,
          source: "fiber_firewall_hcm"
        };
        finalOrderedItems.push(hcmItem);
        projectBOM.push(hcmItem);
        hcmCount++;
      }
    }
  }

  // 6. Separate UPS items (which go to bottom U1+) from top-down gear
  const upsItems = finalOrderedItems.filter(i => getDeviceMountPriority(i).priority === 7);
  const topDownItems = finalOrderedItems.filter(i => getDeviceMountPriority(i).priority !== 7);

  // Position UPSes from bottom U1+ ascending
  let upsCurrentFloor = 1;
  for (const it of upsItems) {
    const h = getRackItemHeight(it);
    it.rackSlot = upsCurrentFloor;
    upsCurrentFloor += h;
  }

  // Position network/server gear from activeRackHeight down
  let currentTop = activeRackHeight;
  for (const it of topDownItems) {
    const h = getRackItemHeight(it);
    let targetBase = currentTop - h + 1;
    if (targetBase < upsCurrentFloor) {
      targetBase = upsCurrentFloor;
    }
    it.rackSlot = targetBase;
    currentTop = targetBase - 1;
  }

  // Check if total U exceeds cabinet
  const totalRequiredU = finalOrderedItems.reduce((acc, it) => acc + getRackItemHeight(it), 0);
  if (totalRequiredU > activeRackHeight && typeof showToast === "function") {
    showToast(`Notice: Standard Pods & Cable Managers require ${totalRequiredU}U, which exceeds the ${activeRackHeight}U enclosure height.`);
  }

  // Reconcile floorplan cabling_sync items so standalone patch panels/keystones/cords deduct the new Standard Pods
  if (typeof commitCablingToBOM === "function" && typeof facilityFloors !== "undefined" && facilityFloors.some(f => (f.nodes || []).some(n => n.type === "device"))) {
    commitCablingToBOM({ silent: true });
  }

  // Synchronize child items
  projectBOM.filter(ch => ch.parentInstanceId).forEach(ch => {
    const parent = projectBOM.find(p => p.instanceId === ch.parentInstanceId);
    if (parent) {
      ch.closetName = parent.closetName;
      ch.rackId = parent.rackId;
    }
  });

  if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
    FacilityStore.notifyWorkspaceChange();
  }
  renderRackVisualizer();
  if (typeof updateBOMView === "function") updateBOMView();
  if (typeof renderBOM === "function") renderBOM();
  if (typeof renderTopology === "function") renderTopology();
  if (typeof StorageService !== "undefined" && typeof StorageService.queueAutoSave === "function") {
    StorageService.queueAutoSave();
  }

  if (typeof showToast === "function") {
    showToast(`Standard Pods Applied: ${copperSwitchCount} copper switch pods (24P above & below) + ${hcmCount} non-doubled 1U cable managers.`);
  }
}

function toggleFiberFirewallCableManager(instanceId) {
  if (typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) return;
  const item = projectBOM.find(i => i.instanceId === instanceId);
  if (!item) return;

  const hostId = FacilityStore.normalize(item.closetName || item.rackId);
  const currentAssignedU = parseInt(item.rackSlot, 10);
  if (!currentAssignedU || currentAssignedU < 1) return;

  // Check if there is already a cable manager immediately below this item
  const existingHcmBelow = projectBOM.find(other => {
    if (other.parentInstanceId) return false;
    const otherLoc = FacilityStore.normalize(other.closetName || other.rackId);
    if (otherLoc !== hostId) return false;
    const otherU = parseInt(other.rackSlot, 10);
    const otherH = getRackItemHeight(other);
    const otherTopU = otherU + otherH - 1;
    const isHcm = other.sku === "HCM-1U" || other.source === "fiber_firewall_hcm" || (other.model || "").includes("Cable Manager");
    return isHcm && otherTopU === (currentAssignedU - 1);
  });

  if (existingHcmBelow) {
    // Toggle OFF: Remove the 1U cable manager below
    projectBOM = projectBOM.filter(x => x.instanceId !== existingHcmBelow.instanceId && x.parentInstanceId !== existingHcmBelow.instanceId);

    // Bump items below back UP by 1U to fill the gap
    projectBOM.filter(other => {
      if (other.parentInstanceId) return false;
      const otherLoc = FacilityStore.normalize(other.closetName || other.rackId);
      if (otherLoc !== hostId) return false;
      const otherU = parseInt(other.rackSlot, 10);
      return otherU < currentAssignedU;
    }).forEach(other => {
      const u = parseInt(other.rackSlot, 10);
      other.rackSlot = u + 1;
    });

    FacilityStore.notifyWorkspaceChange();
    renderRackVisualizer();
    if (typeof updateBOMView === "function") updateBOMView();
    if (typeof renderBOM === "function") renderBOM();
    if (typeof showToast === "function") {
      showToast(`Removed 1U Cable Manager below ${item.model}.`);
    }
    return;
  }

  // Toggle ON: Insert 1U Cable Manager directly below this device
  const targetHcmU = currentAssignedU - 1;
  if (targetHcmU < 1) {
    if (typeof showToast === "function") {
      showToast(`Cannot place Cable Manager below U1.`);
    }
    return;
  }

  // Check if adding 1U will exceed cabinet space
  const allHostItems = projectBOM.filter(other => {
    if (other.parentInstanceId) return false;
    const otherLoc = FacilityStore.normalize(other.closetName || other.rackId);
    return otherLoc === hostId && other.rackSlot;
  });

  const totalUsedU = allHostItems.reduce((acc, x) => acc + getRackItemHeight(x), 0);
  if (totalUsedU + 1 > activeRackHeight) {
    if (typeof showToast === "function") {
      showToast(`Cannot add 1U Cable Manager: rack exceeds available space (${totalUsedU + 1}/${activeRackHeight}U).`);
    }
    return;
  }

  // Shift items at or below targetHcmU DOWN by 1
  const lowestU = Math.min(...allHostItems.map(x => parseInt(x.rackSlot, 10)));
  if (lowestU <= 1) {
    // If shifting down would push below U1, shift current item and all above items UP by 1
    allHostItems.filter(x => parseInt(x.rackSlot, 10) >= currentAssignedU).forEach(x => {
      x.rackSlot = parseInt(x.rackSlot, 10) + 1;
    });
  } else {
    allHostItems.filter(x => parseInt(x.rackSlot, 10) <= targetHcmU).forEach(x => {
      x.rackSlot = parseInt(x.rackSlot, 10) - 1;
    });
  }

  const hcmItem = {
    instanceId: `hcm-manual-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    id: "HCM-1U",
    sku: "HCM-1U",
    model: "1U Horizontal Cable Manager with Dual-Hinged Cover",
    role: "Structured Cabling",
    category: "Infrastructure",
    vendor: "Panduit",
    msrp: 45,
    rackUnits: 1,
    ports: 0,
    poeBudget: 0,
    baseWatts: 0,
    weightLbs: 2.0,
    qty: 1,
    closetName: hostId,
    rackId: hostId,
    rackSlot: targetHcmU,
    isPassive: true,
    source: "fiber_firewall_hcm"
  };

  projectBOM.push(hcmItem);

  FacilityStore.notifyWorkspaceChange();
  renderRackVisualizer();
  if (typeof updateBOMView === "function") updateBOMView();
  if (typeof renderBOM === "function") renderBOM();
  if (typeof showToast === "function") {
    showToast(`Placed 1U Horizontal Cable Manager below ${item.model} at U${targetHcmU}.`);
  }
}

function handleBaySlotDrop(e, bayNumber) {
  e.preventDefault();
  const instanceId = draggedRackItemInstanceId || e.dataTransfer.getData("text/plain");
  if (!instanceId || typeof projectBOM === "undefined") return;

  const item = projectBOM.find(i => i.instanceId === instanceId);
  if (!item) return;

  item.rackSlot = `Bay-${bayNumber}`;
  item.closetName = activeRackId;
  item.rackId = activeRackId;

  FacilityStore.notifyWorkspaceChange();
  renderRackVisualizer();
  if (typeof showToast === "function") {
    showToast(`Mounted ${item.model} into ${activeRackId} at Bay ${bayNumber}`);
  }
  draggedRackItemInstanceId = null;
}

function handleDinRailDrop(e, railNumber) {
  e.preventDefault();
  const instanceId = draggedRackItemInstanceId || e.dataTransfer.getData("text/plain");
  if (!instanceId || typeof projectBOM === "undefined") return;

  const item = projectBOM.find(i => i.instanceId === instanceId);
  if (!item) return;

  item.rackSlot = `Rail-${railNumber}`;
  item.closetName = activeRackId;
  item.rackId = activeRackId;

  FacilityStore.notifyWorkspaceChange();
  renderRackVisualizer();
  if (typeof showToast === "function") {
    showToast(`Mounted ${item.model} onto DIN Rail ${railNumber}`);
  }
  draggedRackItemInstanceId = null;
}

function handlePoleZoneDrop(e, zoneId) {
  e.preventDefault();
  const instanceId = draggedRackItemInstanceId || e.dataTransfer.getData("text/plain");
  if (!instanceId || typeof projectBOM === "undefined") return;

  const item = projectBOM.find(i => i.instanceId === instanceId);
  if (!item) return;

  item.rackSlot = zoneId;
  item.closetName = activeRackId;
  item.rackId = activeRackId;

  FacilityStore.notifyWorkspaceChange();
  renderRackVisualizer();
  if (typeof showToast === "function") {
    showToast(`Mounted ${item.model} at ${zoneId}`);
  }
  draggedRackItemInstanceId = null;
}

function handleBackboardQuadDrop(e, quadId) {
  e.preventDefault();
  const instanceId = draggedRackItemInstanceId || e.dataTransfer.getData("text/plain");
  if (!instanceId || typeof projectBOM === "undefined") return;

  const item = projectBOM.find(i => i.instanceId === instanceId);
  if (!item) return;

  item.rackSlot = quadId;
  item.closetName = activeRackId;
  item.rackId = activeRackId;

  FacilityStore.notifyWorkspaceChange();
  renderRackVisualizer();
  if (typeof showToast === "function") {
    showToast(`Positioned ${item.model} in ${quadId}`);
  }
  draggedRackItemInstanceId = null;
}

// -----------------------------------------------------------
// Telemetry & Engineering Calculations (Per Host Type)
// -----------------------------------------------------------
window.currentUpsTargetRuntime = window.currentUpsTargetRuntime || 15;
window.currentUpsSafetyMargin = window.currentUpsSafetyMargin || 0.75;
window.currentUpsVoltage = window.currentUpsVoltage || 120;
window.currentUpsModelSku = window.currentUpsModelSku || "auto";
window.currentUpsLoadMode = window.currentUpsLoadMode || "connected"; // "connected" | "nameplate"
window.currentUpsBatteryAging = window.currentUpsBatteryAging || 0.85; // 0.85 (IEEE 1188 End of Life) | 1.0 (New)
window.currentUpsComplianceStandard = window.currentUpsComplianceStandard || "ul294"; // "ul294" | "sla_60m" | "sla_30m" | "sla_15m" | "none"

window.handleUpsRuntimeChange = function(minutes) {
  window.currentUpsTargetRuntime = Number(minutes) || 15;
  renderRackVisualizer();
};

window.handleUpsMarginChange = function(margin) {
  window.currentUpsSafetyMargin = Number(margin) || 0.75;
  renderRackVisualizer();
};

window.handleUpsVoltageChange = function(volts) {
  window.currentUpsVoltage = Number(volts) || 120;
  renderRackVisualizer();
};

window.handleUpsModelChange = function(sku) {
  window.currentUpsModelSku = sku || "auto";
  renderRackVisualizer();
};

window.handleUpsLoadModeChange = function(mode) {
  window.currentUpsLoadMode = mode;
  renderRackVisualizer();
};

window.handleUpsAgingChange = function(aging) {
  window.currentUpsBatteryAging = Number(aging) || 0.85;
  renderRackVisualizer();
};

window.handleUpsComplianceStandardChange = function(std) {
  window.currentUpsComplianceStandard = std;
  if (std === "ul294") window.currentUpsTargetRuntime = 240;
  else if (std === "nfpa72") window.currentUpsTargetRuntime = 1440;
  else if (std === "sla_120m") window.currentUpsTargetRuntime = 120;
  else if (std === "sla_60m") window.currentUpsTargetRuntime = 60;
  else if (std === "sla_30m") window.currentUpsTargetRuntime = 30;
  else if (std === "sla_15m") window.currentUpsTargetRuntime = 15;
  renderRackVisualizer();
};

window.addSpecificEbpCountToRack = function(targetEbpCount) {
  if (!activeRackId || typeof projectBOM === "undefined") {
    if (typeof showToast === "function") showToast("Please select an active rack location first.");
    return;
  }
  const hostId = FacilityStore.normalize(activeRackId);
  const assignedItems = projectBOM.filter(i => FacilityStore.normalize(i.closetName || i.location || i.rackId) === hostId);
  let existingUps = assignedItems.find(i => i.role === "UPS" || i.category === "ups" || i.type === "ups");

  if (!existingUps) {
    window.addRecommendedUpsAndEbpToRack();
    return;
  }

  // Remove existing EBPs from this host so we set the exact count requested
  projectBOM = projectBOM.filter(i => !(FacilityStore.normalize(i.closetName || i.location || i.rackId) === hostId && (i.role === "Battery Pack" || i.type === "ebp" || i.isEbp)));

  if (targetEbpCount <= 0) {
    if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") FacilityStore.notifyWorkspaceChange();
    renderRackVisualizer();
    if (typeof updateBOMView === "function") updateBOMView();
    if (typeof renderBOM === "function") renderBOM();
    if (typeof showToast === "function") showToast("Configured UPS for internal battery only.");
    return;
  }

  // Determine compatible EBP model
  let ebpCatalog = [];
  if (typeof CatalogRegistry !== "undefined" && CatalogRegistry.infrastructure && Array.isArray(CatalogRegistry.infrastructure.ups)) {
    ebpCatalog = CatalogRegistry.infrastructure.ups.filter(a => a.type === "ebp" || a.isEbp);
  }
  if (ebpCatalog.length === 0 && typeof ACCESSORY_DATABASE !== "undefined") {
    ebpCatalog = ACCESSORY_DATABASE.filter(a => a.type === "ebp" || a.isEbp);
  }

  const ebpDef = ebpCatalog.find(e => e.compatibleUps?.includes(existingUps.sku) || (existingUps.ebpModel && e.sku === existingUps.ebpModel)) || ebpCatalog[0] || {
    id: "ebp-bp72vrm2u",
    sku: "BP72VRM2U",
    model: `${existingUps.vendor || 'Tripp Lite'} BP72VRM2U External Battery Pack (2U)`,
    vendor: existingUps.vendor || "Tripp Lite",
    rackUnits: 2,
    msrp: 899,
    weightLbs: 68
  };

  const occupiedSlots = new Set();
  projectBOM.filter(i => FacilityStore.normalize(i.closetName || i.location || i.rackId) === hostId).forEach(it => {
    if (it.rackSlot) {
      const u = it.rackSlot;
      const h = getRackItemHeight(it);
      for (let i = 0; i < h; i++) occupiedSlots.add(u + i);
    }
  });

  const locations = typeof FacilityStore !== "undefined" ? FacilityStore.getLocations() : [];
  const activeEnc = locations.find(l => l.name === activeRackId || l.id === activeRackId);
  const maxRU = (activeEnc && (activeEnc.heightU || activeEnc.rackUnits)) ? (activeEnc.heightU || activeEnc.rackUnits) : (activeRackHeight || 42);

  function findSlot(neededRU) {
    for (let u = 1; u <= maxRU - neededRU + 1; u++) {
      let fits = true;
      for (let s = 0; s < neededRU; s++) {
        if (occupiedSlots.has(u + s)) { fits = false; break; }
      }
      if (fits) {
        for (let s = 0; s < neededRU; s++) occupiedSlots.add(u + s);
        return u;
      }
    }
    return null;
  }

  let added = 0;
  const ebpRU = ebpDef.rackUnits || 2;
  for (let q = 0; q < targetEbpCount; q++) {
    const slot = findSlot(ebpRU);
    if (!slot) {
      if (typeof showToast === "function") showToast(`Rack full: No continuous ${ebpRU}U slot available for EBP #${q + 1}.`);
      break;
    }
    const instId = "inst-ebp-" + Date.now() + "-" + Math.random().toString(36).substr(2, 6);
    projectBOM.push({
      instanceId: instId,
      id: ebpDef.id,
      sku: ebpDef.sku,
      model: ebpDef.model || ebpDef.name,
      name: ebpDef.name || ebpDef.model,
      vendor: ebpDef.vendor,
      category: "ups",
      type: "ebp",
      role: "Battery Pack",
      isEbp: true,
      rackUnits: ebpRU,
      rackSlot: slot,
      closetName: activeRackId,
      location: activeRackId,
      rackId: activeRackId,
      msrp: ebpDef.msrp || 899,
      qty: 1,
      baseWatts: 0,
      powerWatts: 0,
      weightLbs: ebpDef.weightLbs || 68
    });
    added++;
  }

  if (added > 0) {
    if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
      FacilityStore.notifyWorkspaceChange();
    }
    renderRackVisualizer();
    if (typeof updateBOMView === "function") updateBOMView();
    if (typeof renderBOM === "function") renderBOM();
    if (typeof StorageService !== "undefined" && typeof StorageService.queueAutoSave === "function") {
      StorageService.queueAutoSave();
    }
    if (typeof showToast === "function") showToast(`Added ${added}x ${ebpDef.sku} External Battery Pack(s) to ${activeRackId}.`);
  }
};

window.addRecommendedUpsAndEbpToRack = function() {
  if (!activeRackId || typeof projectBOM === "undefined") {
    if (typeof showToast === "function") showToast("Please select an active rack location first.");
    return;
  }

  const hostNorm = typeof FacilityStore !== "undefined" ? FacilityStore.normalize(activeRackId) : activeRackId;
  // Remove existing UPS and EBP units in this rack before slotting recommended units
  for (let i = projectBOM.length - 1; i >= 0; i--) {
    const it = projectBOM[i];
    const itNorm = typeof FacilityStore !== "undefined" ? FacilityStore.normalize(it.closetName || it.location || it.rackId) : (it.closetName || it.location || it.rackId);
    if (itNorm === hostNorm && !it.isPdu && (it.category === "ups" || it.type === "ups" || it.role === "UPS" || it.type === "ebp" || it.isEbp || it.role === "Battery Pack")) {
      projectBOM.splice(i, 1);
    }
  }

  const assignedItems = projectBOM.filter(i => {
    const itNorm = typeof FacilityStore !== "undefined" ? FacilityStore.normalize(i.closetName || i.location || i.rackId) : (i.closetName || i.location || i.rackId);
    return itNorm === hostNorm;
  });
  const plan = (typeof NetworkSizer !== "undefined" && typeof NetworkSizer.calculateUPSPlan === "function")
    ? NetworkSizer.calculateUPSPlan(assignedItems, {
        targetRuntimeMinutes: window.currentUpsTargetRuntime,
        safetyMargin: window.currentUpsSafetyMargin,
        preferredVoltage: window.currentUpsVoltage,
        selectedModelSku: window.currentUpsModelSku,
        loadMode: window.currentUpsLoadMode || "connected",
        connectedWatts: window._lastRackConnectedAcWatts || 0,
        agingFactor: window.currentUpsBatteryAging || 0.85,
        complianceStandard: window.currentUpsComplianceStandard || "ul294"
      })
    : null;

  if (!plan || !plan.upsModel) {
    if (typeof showToast === "function") showToast("Unable to calculate UPS recommendation.");
    return;
  }

  // Scan occupied rack slots in the active rack
  const occupiedSlots = new Set();
  assignedItems.forEach(it => {
    if (it.rackSlot && typeof it.rackSlot === "number") {
      const u = it.rackSlot;
      const h = getRackItemHeight(it);
      for (let i = 0; i < h; i++) {
        occupiedSlots.add(u + i);
      }
    }
  });

  const locations = typeof FacilityStore !== "undefined" ? FacilityStore.getLocations() : [];
  const activeEnc = locations.find(l => l.name === activeRackId || l.id === activeRackId);
  const maxRU = (activeEnc && (activeEnc.heightU || activeEnc.rackUnits)) ? (activeEnc.heightU || activeEnc.rackUnits) : (activeRackHeight || 42);

  // Helper to find lowest available continuous slot from bottom (U1+)
  function findLowestOpenSlot(neededRU) {
    for (let u = 1; u <= maxRU - neededRU + 1; u++) {
      let fits = true;
      for (let s = 0; s < neededRU; s++) {
        if (occupiedSlots.has(u + s)) {
          fits = false;
          break;
        }
      }
      if (fits) {
        for (let s = 0; s < neededRU; s++) occupiedSlots.add(u + s);
        return u;
      }
    }
    return null;
  }

  let unitsAdded = 0;
  const addedSkus = [];

  // Add Recommended UPS Units
  for (let q = 0; q < plan.upsQty; q++) {
    const upsRU = plan.upsModel.rackUnits || 2;
    const slot = findLowestOpenSlot(upsRU);
    if (!slot) {
      if (typeof showToast === "function") showToast(`Rack full: No continuous ${upsRU}U slot available at bottom for UPS.`);
      break;
    }
    const instId = "inst-ups-" + Date.now() + "-" + Math.random().toString(36).substr(2, 6);
    projectBOM.push({
      instanceId: instId,
      id: plan.upsModel.id || plan.upsModel.sku,
      sku: plan.upsModel.sku,
      model: plan.upsModel.model || plan.upsModel.name,
      name: plan.upsModel.name || plan.upsModel.model,
      vendor: plan.upsModel.vendor || "Tripp Lite",
      category: "ups",
      type: "ups",
      role: "UPS",
      rackUnits: upsRU,
      rackSlot: slot,
      closetName: activeRackId,
      location: activeRackId,
      rackId: activeRackId,
      msrp: plan.upsModel.msrp || 1199,
      qty: 1,
      baseWatts: plan.upsModel.baseWatts || 30,
      powerWatts: plan.upsModel.powerWatts || 1000,
      weightLbs: plan.upsModel.weightLbs || 60,
      receptacles: plan.upsModel.receptacles,
      inputConnector: plan.upsModel.inputConnector,
      keyFeatures: plan.upsModel.keyFeatures
    });
    unitsAdded++;
    addedSkus.push(`${plan.upsModel.sku} (U${slot})`);
  }

  // Add EBP Units if needed and supported
  if (plan.totalEbpQty > 0 && plan.hasEbpSupport) {
    let ebpCatalog = [];
    if (typeof CatalogRegistry !== "undefined" && CatalogRegistry.infrastructure && Array.isArray(CatalogRegistry.infrastructure.ups)) {
      ebpCatalog = CatalogRegistry.infrastructure.ups.filter(a => a.type === "ebp" || a.isEbp);
    }
    if (ebpCatalog.length === 0 && typeof ACCESSORY_DATABASE !== "undefined") {
      ebpCatalog = ACCESSORY_DATABASE.filter(a => a.type === "ebp" || a.isEbp);
    }
    const ebpDef = ebpCatalog.find(e => e.sku === plan.ebpModel || e.model?.includes(plan.ebpModel) || e.id?.includes(plan.ebpModel.toLowerCase())) || {
      id: "ebp-" + plan.ebpModel.toLowerCase(),
      sku: plan.ebpModel,
      model: `${plan.upsModel.vendor} ${plan.ebpModel} External Battery Module (${plan.ebpRackHeight || 2}U)`,
      name: `${plan.upsModel.vendor} ${plan.ebpModel} External Battery Module (${plan.ebpRackHeight || 2}U)`,
      vendor: plan.upsModel.vendor,
      rackUnits: plan.ebpRackHeight || 2,
      msrp: 899,
      weightLbs: 70
    };

    for (let eq = 0; eq < plan.totalEbpQty; eq++) {
      const ebpRU = ebpDef.rackUnits || plan.ebpRackHeight || 2;
      const slot = findLowestOpenSlot(ebpRU);
      if (!slot) {
        if (typeof showToast === "function") showToast(`Rack full: No continuous ${ebpRU}U slot available for EBP.`);
        break;
      }
      const instId = "inst-ebp-" + Date.now() + "-" + Math.random().toString(36).substr(2, 6);
      projectBOM.push({
        instanceId: instId,
        id: ebpDef.id,
        sku: ebpDef.sku,
        model: ebpDef.model || ebpDef.name,
        name: ebpDef.name || ebpDef.model,
        vendor: ebpDef.vendor,
        category: "ups",
        type: "ebp",
        role: "Battery Pack",
        isEbp: true,
        rackUnits: ebpRU,
        rackSlot: slot,
        closetName: activeRackId,
        location: activeRackId,
        rackId: activeRackId,
        msrp: ebpDef.msrp || 899,
        qty: 1,
        baseWatts: 0,
        powerWatts: 0,
        weightLbs: ebpDef.weightLbs || 70,
        keyFeatures: ebpDef.keyFeatures
      });
      unitsAdded++;
      addedSkus.push(`${ebpDef.sku} (U${slot})`);
    }
  }

  if (unitsAdded > 0) {
    if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
      FacilityStore.notifyWorkspaceChange();
    }
    renderRackVisualizer();
    if (typeof updateBOMView === "function") updateBOMView();
    if (typeof renderBOM === "function") renderBOM();
    if (typeof showToast === "function") {
      showToast(`Slotted power hardware into ${activeRackId}: ${addedSkus.join(", ")}`);
    }
  }
};

function renderHostTelemetry(assignedItems, parsed, activeEnc) {
  const hostType = parsed.hostType;
  const container = document.getElementById("hostTelemetryContainer");
  const auxContainer = document.getElementById("hostAuxContainer");
  const fieldContainer = document.getElementById("hostFieldSummaryContainer");
  if (!container) return;

  if (hostType === "security_cabinet") {
    // -------------------------------------------------------
    // Security Cabinet DC Power & UL 294 Battery Runtime
    // -------------------------------------------------------
    let totalDcCurrentAmps = 0;
    let lockCurrentAmps = 0;
    let doorCount = 0;

    assignedItems.forEach(it => {
      const pWatts = parseFloat(it.powerConsumptionWatts || it.baseWatts || 15);
      totalDcCurrentAmps += (pWatts / 24);
      if (it.doorCapacity) {
        doorCount += parseInt(it.doorCapacity, 10);
        lockCurrentAmps += (parseInt(it.doorCapacity, 10) * 0.5); // 500mA per lock @ 24VDC
      }
    });

    const standbyAmps = Math.round((totalDcCurrentAmps + 0.2) * 100) / 100;
    const alarmAmps = Math.round((standbyAmps + lockCurrentAmps) * 100) / 100;
    // NFPA 731 / UL 294: 4 Hours Standby + 15 Mins Alarm + 20% safety margin
    const requiredAh = Math.round(((standbyAmps * 4.0) + (alarmAmps * 0.25)) * 1.2 * 10) / 10;
    const installedAh = 14.0; // 2x 12V 7Ah (24V 7Ah or 14Ah)
    const runtimeHours = Math.round((installedAh / standbyAmps) * 10) / 10;

    container.innerHTML = `
      <h3 class="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between">
        <span class="flex items-center gap-1.5 text-emerald-400">
          <i data-lucide="shield-check" class="w-4 h-4"></i> Access Control Power & Battery Sizing
        </span>
        <span class="text-[10px] font-mono text-slate-500 uppercase font-normal">UL 294 / NFPA 731</span>
      </h3>
      <div class="space-y-2 text-xs">
        <div class="flex justify-between text-slate-400">
          <span>Supported Access Doors:</span>
          <span class="font-mono text-white font-semibold">${doorCount} Controlled Doors</span>
        </div>
        <div class="flex justify-between text-slate-400">
          <span>Standby Continuous Load:</span>
          <span class="font-mono text-emerald-300 font-semibold">${standbyAmps} A @ 24VDC (${Math.round(standbyAmps * 24)} W)</span>
        </div>
        <div class="flex justify-between text-slate-400">
          <span>Full Alarm / Strike Inrush:</span>
          <span class="font-mono text-amber-400 font-semibold">${alarmAmps} A @ 24VDC (${Math.round(alarmAmps * 24)} W)</span>
        </div>
        <div class="flex justify-between text-slate-300 font-bold pt-2 border-t border-slate-800">
          <span>Code Battery Capacity Req:</span>
          <span class="font-mono text-white">${requiredAh} Ah (4-Hr Standby)</span>
        </div>
        <div class="flex justify-between text-slate-400 text-[11px]">
          <span>Estimated Standby Runtime:</span>
          <span class="font-mono text-emerald-400 font-bold">${runtimeHours} Hours on Battery</span>
        </div>
        <div class="pt-2 border-t border-slate-800/80">
          <span class="text-[10px] text-slate-500 uppercase font-mono block mb-0.5">AC Primary Feed Requirement:</span>
          <span class="font-mono text-emerald-400 text-[11px] font-bold block">120VAC 15A Dedicated Branch Circuit</span>
        </div>
      </div>
    `;

    if (auxContainer) {
      auxContainer.innerHTML = `
        <h3 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
          <i data-lucide="battery" class="w-4 h-4 text-emerald-400"></i> Reserve Battery Health & Compliance
        </h3>
        <div class="text-xs text-slate-300 space-y-1">
          <div class="flex justify-between text-slate-400">
            <span>Installed Battery Bank:</span>
            <span class="font-mono text-emerald-300 font-semibold">2x 12V 7Ah AGM In Series</span>
          </div>
          <div class="flex justify-between text-slate-400">
            <span>Life Safety Status:</span>
            <span class="font-mono text-emerald-400 font-bold">${installedAh >= requiredAh ? 'PASSED (Compliant)' : 'ATTENTION: Add Battery'}</span>
          </div>
          <p class="text-[10px] text-slate-500 pt-1">Complies with NFPA 731 electronic security standards for commercial access control facilities.</p>
        </div>
      `;
    }

    if (fieldContainer) {
      fieldContainer.innerHTML = `
        <h3 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
          <i data-lucide="git-commit" class="w-4 h-4 text-amber-400"></i> Lock Output Channels
        </h3>
        <p class="text-[11px] text-slate-400">${doorCount * 2} reader ports and ${doorCount} heavy-duty Form-C fail-safe/fail-secure relay circuits.</p>
      `;
    }

  } else if (hostType === "industrial_din") {
    // -------------------------------------------------------
    // Industrial DIN NEMA Thermal & DC Power
    // -------------------------------------------------------
    const mounting = (activeEnc && activeEnc.mountingMethod) ? activeEnc.mountingMethod : (parsed.mountingMethod || "wall");
    let totalBaseWatts = 0;
    let totalPoEWatts = 0;
    assignedItems.forEach(it => {
      totalBaseWatts += parseFloat(it.baseWatts || 0);
      totalPoEWatts += parseFloat(it.poeBudget || 0);
    });

    const totalOperatingWatts = Math.round(totalBaseWatts + (totalPoEWatts * 0.5));
    const deltaT = Math.round(totalOperatingWatts * 0.15);
    const internalTemp = 25 + deltaT;

    container.innerHTML = `
      <h3 class="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between">
        <span class="flex items-center gap-1.5 text-amber-400">
          <i data-lucide="thermometer" class="w-4 h-4"></i> NEMA Thermal Dissipation & Power
        </span>
        <span class="text-[10px] font-mono text-slate-500 uppercase font-normal">NEMA 4X / IP66</span>
      </h3>
      <div class="space-y-2 text-xs">
        <div class="flex justify-between text-slate-400">
          <span>Mounting Configuration:</span>
          <span class="font-mono text-white font-semibold">${mounting === 'pole' ? 'Pole Mounted (Stainless Banding)' : 'Wall Mounted (Heavy Flanges)'}</span>
        </div>
        <div class="flex justify-between text-slate-400">
          <span>DIN Internal Heat Dissipation:</span>
          <span class="font-mono text-white font-semibold">${totalOperatingWatts} W (${Math.round(totalOperatingWatts * 3.412)} BTU/hr)</span>
        </div>
        <div class="flex justify-between text-slate-400">
          <span>Sealed Delta-T Rise:</span>
          <span class="font-mono text-amber-400 font-semibold">+${deltaT}°C Internal Rise</span>
        </div>
        <div class="flex justify-between text-slate-400">
          <span>Estimated Internal Temp:</span>
          <span class="font-mono text-emerald-400 font-semibold">${internalTemp}°C @ 25°C Ambient</span>
        </div>
        <div class="flex justify-between text-slate-300 font-bold pt-2 border-t border-slate-800">
          <span>PoE Budget Available:</span>
          <span class="font-mono text-white">${totalPoEWatts} W DC</span>
        </div>
        <div class="pt-2 border-t border-slate-800/80">
          <span class="text-[10px] text-slate-500 uppercase font-mono block mb-0.5">DC Supply Input:</span>
          <span class="font-mono text-amber-400 text-[11px] font-bold block">48-56VDC Redundant Terminal Blocks</span>
        </div>
      </div>
    `;

    if (auxContainer) {
      auxContainer.innerHTML = `
        <h3 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
          <i data-lucide="sun" class="w-4 h-4 text-emerald-400"></i> Environmental Ratings
        </h3>
        <div class="text-xs text-slate-300 space-y-1">
          <p class="text-[11px] text-slate-400">Substation-hardened electronics compliant with IEC 61850-3 / IEEE 1613 shock & vibration standards.</p>
        </div>
      `;
    }

    if (fieldContainer) {
      fieldContainer.innerHTML = `
        <h3 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
          <i data-lucide="shield" class="w-4 h-4 text-amber-400"></i> Mounting Hardware & Grounding
        </h3>
        <p class="text-[11px] text-slate-400">${mounting === 'pole' ? 'Stainless steel strapping clamps with rubber isolation pads for pole mounting.' : 'Heavy-duty 316 stainless wall-mount unistrut brackets.'}</p>
      `;
    }

  } else if (hostType === "structural_mount") {
    // -------------------------------------------------------
    // Structural Pole Mount Wind Load & Cables
    // -------------------------------------------------------
    const poleHeight = (activeEnc && activeEnc.poleHeightFt) ? activeEnc.poleHeightFt : (parsed.poleHeightFt || 20);
    const epaTotal = Math.round(assignedItems.length * 0.45 * 10) / 10;
    const cableDropCount = assignedItems.length * 2;
    // Bending moment: EPA * force_factor * height
    const windBendingMoment = Math.round(epaTotal * 25.6 * (poleHeight * 0.6));

    container.innerHTML = `
      <h3 class="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between">
        <span class="flex items-center gap-1.5 text-cyan-400">
          <i data-lucide="wind" class="w-4 h-4"></i> Wind Load EPA & Cable Loading
        </span>
        <span class="text-[10px] font-mono text-slate-500 uppercase font-normal">TIA-222-H</span>
      </h3>
      <div class="space-y-2 text-xs">
        <div class="flex justify-between text-slate-400">
          <span>Structural Height AGL:</span>
          <span class="font-mono text-white font-semibold">${poleHeight} ft Tower Elevation</span>
        </div>
        <div class="flex justify-between text-slate-400">
          <span>Effective Projected Area (EPA):</span>
          <span class="font-mono text-cyan-300 font-semibold">${epaTotal} sq ft</span>
        </div>
        <div class="flex justify-between text-slate-400">
          <span>Base Bending Moment:</span>
          <span class="font-mono text-white font-semibold">${windBendingMoment.toLocaleString()} ft-lbs @ 100 MPH</span>
        </div>
        <div class="flex justify-between text-slate-400">
          <span>Down-Mast Cable Drops:</span>
          <span class="font-mono text-cyan-300 font-semibold">${cableDropCount} Shielded OSP Cat6A</span>
        </div>
        <div class="pt-2 border-t border-slate-800/80">
          <span class="text-[10px] text-slate-500 uppercase font-mono block mb-0.5">Surge Arrestor Spec:</span>
          <span class="font-mono text-emerald-400 text-[11px] font-bold block">Gas Discharge Tube (GDT) at Base Handhole</span>
        </div>
      </div>
    `;

    if (auxContainer) {
      auxContainer.innerHTML = `
        <h3 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
          <i data-lucide="zap" class="w-4 h-4 text-cyan-400"></i> Grounding & Lightning
        </h3>
        <p class="text-[11px] text-slate-400">5/8" x 8ft copper-clad steel ground rod driven at pole foundation base with exothermic cadweld bond.</p>
      `;
    }

    if (fieldContainer) {
      fieldContainer.innerHTML = `
        <h3 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
          <i data-lucide="arrow-down" class="w-4 h-4 text-cyan-400"></i> Conduit Penetrations
        </h3>
        <p class="text-[11px] text-slate-400">2" Schedule 40 PVC sweep conduit stub-up through foundation center into base handhole at 2 ft AGL.</p>
      `;
    }

  } else if (hostType === "architectural_backboard") {
    // -------------------------------------------------------
    // Architectural Backboard Surface Utilization
    // -------------------------------------------------------
    const widthFt = (activeEnc && activeEnc.widthFt) ? activeEnc.widthFt : 4;
    const heightFt = (activeEnc && activeEnc.heightFt) ? activeEnc.heightFt : 8;
    const totalSqFt = widthFt * heightFt;
    const usedSqFt = Math.min(totalSqFt, Math.round(assignedItems.length * 3.5 * 10) / 10);
    const pct = Math.round((usedSqFt / totalSqFt) * 100);

    container.innerHTML = `
      <h3 class="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between">
        <span class="flex items-center gap-1.5 text-purple-400">
          <i data-lucide="layers" class="w-4 h-4"></i> Backboard Surface & Code Clearances
        </span>
        <span class="text-[10px] font-mono text-slate-500 uppercase font-normal">NEC 110.26 / BICSI</span>
      </h3>
      <div class="space-y-2 text-xs">
        <div class="flex justify-between text-slate-400">
          <span>Plywood Surface Usage:</span>
          <span class="font-mono text-purple-300 font-semibold">${usedSqFt} / ${totalSqFt} sq ft (${pct}%)</span>
        </div>
        <div class="flex justify-between text-slate-400">
          <span>Working Space Clearance:</span>
          <span class="font-mono text-emerald-400 font-semibold">36" Front Depth Maintained</span>
        </div>
        <div class="flex justify-between text-slate-400">
          <span>Wire Management Rings:</span>
          <span class="font-mono text-white font-semibold">2" D-Rings Included</span>
        </div>
      </div>
    `;

    if (auxContainer) {
      auxContainer.innerHTML = `
        <h3 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
          <i data-lucide="flame" class="w-4 h-4 text-rose-400"></i> Fire Marshal Stamp
        </h3>
        <p class="text-[11px] text-slate-400">AC-grade fire-retardant treated plywood with visible third-party listing agency stamp.</p>
      `;
    }

    if (fieldContainer) {
      fieldContainer.innerHTML = `
        <h3 class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
          <i data-lucide="phone" class="w-4 h-4 text-purple-400"></i> Cross-Connects
        </h3>
        <p class="text-[11px] text-slate-400">Demarcation blocks cross-connected with 24 AWG Cat3/Cat5e cross-connect jumper wire.</p>
      `;
    }

  } else {
    // -------------------------------------------------------
    // Standard 19" EIA Rack Elevation Power & Thermal
    // -------------------------------------------------------
    let occupiedU = 0, totalPoE = 0, totalBaseWatts = 0, totalOutlets = 0;
    let totalEquipmentWeightLbs = 0;
    const cogAdvisories = [];

    assignedItems.forEach(it => {
      const units = (it.stackedUnits && it.stackedUnits >= 2) ? it.stackedUnits : (parseInt(it.qty, 10) || 1);
      const ru = (it.rackUnits !== undefined && it.rackUnits !== null) ? (parseInt(it.rackUnits, 10) || 0) : 1;
      if (it.rackSlot) occupiedU += getRackItemHeight(it);
      totalPoE += parseFloat(it.poeBudget || 0) * units;
      totalBaseWatts += parseFloat(it.baseWatts || 0) * units;
      totalOutlets += units;

      const role = it.role || "";
      const cat = (it.category || "").toLowerCase();
      let unitWeight = 8;
      if (it.weightLbs) unitWeight = parseFloat(it.weightLbs);
      else if (role === "Server" || cat.includes("server")) unitWeight = 36;
      else if (role === "UPS" || cat.includes("ups")) unitWeight = 48;
      else if (role === "Access" || role === "Core" || role === "Aggregation" || cat.includes("switch")) unitWeight = (it.poeBudget > 400 ? 18 : 12);
      else if (role === "Structured Cabling") unitWeight = (it.sku?.includes("48") ? 4.5 : 2.5);
      else unitWeight = 6 * ru;

      const itemTotalWeight = unitWeight * units;
      totalEquipmentWeightLbs += itemTotalWeight;

      if (it.rackSlot && it.rackSlot > 30 && itemTotalWeight >= 25) {
        cogAdvisories.push(`U${it.rackSlot}: ${it.model} (${Math.round(itemTotalWeight)} lbs) mounted high. Relocate to lower rack for stability.`);
      }
    });

    const operatingAcWatts = Math.round(totalBaseWatts + (totalPoE * 0.5));
    const worstCaseWatts = Math.round(totalBaseWatts + totalPoE);
    const worstCaseBTU = Math.round(worstCaseWatts * 3.412142);
    const tonsCooling = Math.round((worstCaseBTU / 12000) * 10) / 10;
    const operatingAmps = Math.round((operatingAcWatts / (120 * 0.92)) * 10) / 10;
    const worstCaseAmps = Math.round((worstCaseWatts / (120 * 0.92)) * 10) / 10;
    const circuitSpec = worstCaseWatts > 1440 ? "120V 20A Dedicated Circuit (NEMA 5-20R)" : "120V 15A Dedicated Circuit (NEMA 5-15R)";

    const tareWeight = (activeEnc && activeEnc.tareWeightLbs) ? activeEnc.tareWeightLbs : 160;
    const maxWeight = (activeEnc && activeEnc.maxWeightLbs) ? activeEnc.maxWeightLbs : 3000;
    const enclosureDepth = (activeEnc && activeEnc.depthInches) ? activeEnc.depthInches : 42;
    const grossWeightLbs = Math.round(tareWeight + totalEquipmentWeightLbs);
    const grossWeightKg = Math.round(grossWeightLbs * 0.453592);
    const isWeightOverload = totalEquipmentWeightLbs > maxWeight;
    const weightPct = Math.round((totalEquipmentWeightLbs / maxWeight) * 100);

    // Audit device depth compliance against physical enclosure depth
    const depthViolations = [];
    assignedItems.forEach(it => {
      let itemDepth = it.depthInches;
      if (!itemDepth) {
        const m = (it.model || '').toLowerCase();
        const r = (it.role || '').toLowerCase();
        if (r === "server" || m.includes("server") || m.includes("poweredge") || m.includes("proliant")) itemDepth = 29.5;
        else if (r === "ups" || m.includes("ups") || m.includes("smart-ups")) itemDepth = 24;
        else if (m.includes("ex4300") || m.includes("qfx") || m.includes("catalyst")) itemDepth = 18;
        else if (r === "structured cabling" || m.includes("patch panel")) itemDepth = 4;
        else itemDepth = 12;
      }
      if (itemDepth > enclosureDepth) {
        depthViolations.push(`${it.model || it.sku} (${itemDepth}" deep > ${enclosureDepth}" max)`);
      }
    });

    const upsMinVA = Math.round(worstCaseWatts / 0.90);
    const upsRecVA = Math.round((worstCaseWatts / 0.90) * 1.25);
    const upsModel = worstCaseWatts > 1200 ? "2200VA 2U Line-Interactive" : "1500VA 2U Line-Interactive";

    const accState = window.rackAccordionOpenState || { electrical: true, pdu: false, ups: true, structural: false, passive: false };

    container.innerHTML = `
      <details ${accState.electrical ? 'open' : ''} ontoggle="toggleRackAccordionSection('electrical', this.open)" class="group">
        <summary class="list-none cursor-pointer select-none flex items-center justify-between gap-2 py-0.5">
          <span class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 text-amber-400">
            <i data-lucide="zap" class="w-4 h-4"></i> Electrical &amp; Thermal Load
          </span>
          <div class="flex items-center gap-1.5">
            <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-sky-400 font-bold">${operatingAcWatts}W &bull; ${worstCaseBTU.toLocaleString()} BTU</span>
            <i data-lucide="chevron-down" class="w-3.5 h-3.5 text-slate-400 rack-acc-chevron"></i>
          </div>
        </summary>
        <div class="space-y-1.5 text-xs pt-2.5 mt-2 border-t border-slate-800/80">
          <div class="flex justify-between text-slate-400">
            <span>Chassis Base Power:</span>
            <span class="font-mono text-white font-semibold">${Math.round(totalBaseWatts)} W</span>
          </div>
          <div class="flex justify-between text-slate-400">
            <span>Max PoE Capacity:</span>
            <span class="font-mono text-white font-semibold">${Math.round(totalPoE).toLocaleString()} W</span>
          </div>
          <div class="flex justify-between text-slate-400">
            <span>Chassis Power Feeds:</span>
            <span class="font-mono text-indigo-300 font-semibold">${totalOutlets}x AC Outlets (NEMA 5-15P)</span>
          </div>
          <div class="flex justify-between text-slate-400">
            <span>Operating Design Load:</span>
            <span class="font-mono text-sky-400 font-semibold">${operatingAcWatts} W (${operatingAmps} A @ 120V)</span>
          </div>
          <div class="flex justify-between text-slate-300 font-bold pt-1.5 border-t border-slate-800">
            <span>Worst-Case Nameplate:</span>
            <span class="font-mono text-amber-400">${worstCaseWatts.toLocaleString()} W (${worstCaseAmps} A)</span>
          </div>
          <div class="flex justify-between text-slate-400 text-[11px]">
            <span>BTU Heat Output:</span>
            <span class="font-mono text-slate-300 font-bold">${worstCaseBTU.toLocaleString()} BTU/hr (${tonsCooling} Tons AC)</span>
          </div>
          <div class="pt-1.5 border-t border-slate-800/80 flex items-center justify-between gap-2">
            <span class="text-[10px] text-slate-500 uppercase font-mono">Branch Circuit:</span>
            <span class="font-mono text-emerald-400 text-[10px] font-bold truncate">${circuitSpec}</span>
          </div>
        </div>
      </details>
    `;

    if (auxContainer) {
      // Calculate actual active field PoE draw homered to this rack
      const hostNorm = FacilityStore.normalize(activeRackId);
      let fieldPoEWatts = 0;
      let fieldDeviceCount = 0;

      if (typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) {
        projectBOM.forEach(item => {
          if (item.parentInstanceId) return;
          const itemLoc = FacilityStore.normalize(item.closetName || item.rackId);
          if (itemLoc === hostNorm && !isPassiveInfrastructure(item)) {
            const r = (item.role || "").toLowerCase();
            const c = (item.category || "").toLowerCase();
            const isField = r === "camera" || r === "access control" || r === "intercom" ||
                            c.includes("camera") || c.includes("access") || c.includes("intercom") ||
                            c.includes("wireless") || r === "wireless bridge" || r === "edge device";
            if (isField) {
              const pwr = (typeof PortEngine !== "undefined") ? PortEngine.getDevicePowerSource(item) : (item.powerSource || "poe_switch");
              if (pwr === "poe_switch") {
                const draw = parseFloat(item.poeWattsDrawn || item.powerConsumptionWatts || item.baseWatts || 15);
                fieldPoEWatts += draw * (parseInt(item.qty, 10) || 1);
                fieldDeviceCount += (parseInt(item.qty, 10) || 1);
              }
            }
          }
        });
      }

      if (typeof facilityFloors !== "undefined" && Array.isArray(facilityFloors)) {
        facilityFloors.forEach(floor => {
          if (!floor.nodes) return;
          const floorClosets = floor.nodes.filter(n => n.type === "closet");
          floor.nodes.filter(n => n.type === "device").forEach(dev => {
            let c = floorClosets.find(cl => cl.id === dev.assignedClosetId);
            if (!c && floorClosets.length > 0) c = floorClosets[0];
            const cNorm = c ? FacilityStore.normalize(c.name) : hostNorm;
            if (cNorm === hostNorm) {
              if (!dev.instanceId || !projectBOM.some(b => b.instanceId === dev.instanceId && FacilityStore.normalize(b.closetName) === hostNorm)) {
                const devWatts = parseFloat(dev.powerConsumptionWatts || dev.poeWattsDrawn || 15);
                fieldPoEWatts += devWatts;
                fieldDeviceCount++;
              }
            }
          });
        });
      }

      const totalConnectedPoEWithLoss = Math.round(fieldPoEWatts * 1.10);
      const effectiveConnectedPoE = fieldDeviceCount > 0 ? totalConnectedPoEWithLoss : Math.round(totalPoE * 0.40);
      const connectedAcWatts = Math.round(totalBaseWatts + effectiveConnectedPoE);
      window._lastRackConnectedAcWatts = connectedAcWatts;

      // Sizing calculation powered by upgraded NetworkSizer engine
      const upsPlan = (typeof NetworkSizer !== "undefined" && typeof NetworkSizer.calculateUPSPlan === "function")
        ? NetworkSizer.calculateUPSPlan(assignedItems, {
            targetRuntimeMinutes: window.currentUpsTargetRuntime,
            safetyMargin: window.currentUpsSafetyMargin,
            preferredVoltage: window.currentUpsVoltage,
            selectedModelSku: window.currentUpsModelSku,
            loadMode: window.currentUpsLoadMode || "connected",
            connectedWatts: connectedAcWatts,
            agingFactor: window.currentUpsBatteryAging || 0.85,
            complianceStandard: window.currentUpsComplianceStandard || "ul294"
          })
        : null;

      let upsList = [];
      if (typeof CatalogRegistry !== "undefined" && CatalogRegistry.infrastructure && Array.isArray(CatalogRegistry.infrastructure.ups)) {
        upsList = CatalogRegistry.infrastructure.ups.filter(u => (u.type === "ups" || u.category === "ups") && !u.isEbp && !u.isPdu);
      }
      if (upsList.length === 0 && typeof ACCESSORY_DATABASE !== "undefined") {
        upsList = ACCESSORY_DATABASE.filter(u => (u.type === "ups" || u.category === "ups") && !u.isEbp && !u.isPdu);
      }

      const upsCatalogOptionsHtml = upsList.map(u => `
        <option value="${u.sku}" ${(window.currentUpsModelSku === u.sku) ? 'selected' : ''}>
          ${u.vendor} ${u.sku} (${u.va || 1500}VA / ${u.powerWatts || 1000}W &bull; ${u.rackUnits || 2}U)
        </option>
      `).join('');

      const planModelName = upsPlan ? upsPlan.upsModel.model : upsModel;
      const planCapWatts = upsPlan ? upsPlan.upsModel.powerWatts : 1500;
      const planLoadWatts = upsPlan ? upsPlan.runtimeLoadWatts : connectedAcWatts;
      const planLoadPct = upsPlan ? upsPlan.runtimeLoadPercent : 45;
      const planIntRuntime = upsPlan ? upsPlan.internalRuntime : 14;
      const planAchievedRuntime = upsPlan ? upsPlan.achievedRuntime : 14;
      const planTargetRuntime = upsPlan ? upsPlan.targetRuntime : window.currentUpsTargetRuntime;
      const planUpsQty = upsPlan ? upsPlan.upsQty : 1;
      const planEbpQty = upsPlan ? upsPlan.totalEbpQty : 0;
      const planEbpModel = upsPlan ? upsPlan.ebpModel : "BP72VRM2U";
      const planBreakerStatus = upsPlan ? upsPlan.feederCircuit.circuitStatus : "SAFE";
      const planLoadingPct = upsPlan ? upsPlan.feederCircuit.circuitLoadingPct : 65;
      const isConnectedMode = (window.currentUpsLoadMode || "connected") === "connected";
      const isUL294Passed = upsPlan ? upsPlan.ul294.compliant : (planAchievedRuntime >= 240);

      // Render Multi-EBP Runtime Curve Pills (0 to 4 EBPs)
      const curveHtml = (upsPlan && Array.isArray(upsPlan.runtimeCurve)) ? upsPlan.runtimeCurve.map(c => `
        <div class="p-1.5 rounded-lg border flex flex-col items-center justify-between transition-all ${c.ebpQty === planEbpQty ? 'bg-indigo-950/80 border-indigo-500 shadow-sm ring-1 ring-indigo-500/40' : (c.meetsUL294 ? 'bg-slate-900 border-emerald-800/60 hover:border-emerald-600' : 'bg-slate-900 border-slate-800 hover:border-slate-700')}">
          <div class="text-[9px] font-mono text-slate-400 font-semibold mb-0.5">${c.ebpQty === 0 ? 'Internal' : `+${c.ebpQty} EBP`}</div>
          <div class="text-xs font-mono font-bold ${c.meetsUL294 ? 'text-emerald-300' : (c.meetsTarget ? 'text-sky-300' : 'text-slate-300')}">
            ${c.runtimeMin >= 60 ? `${c.runtimeHours}h` : `${c.runtimeMin}m`}
          </div>
          <div class="text-[9px] font-mono text-slate-500 mt-0.5">
            ${c.meetsUL294 ? '<span class="text-emerald-400 font-bold">UL 294</span>' : (c.meetsTarget ? '<span class="text-sky-400">Target</span>' : `${c.runtimeMin}m`)}
          </div>
          <button 
            type="button" 
            onclick="window.addSpecificEbpCountToRack(${c.ebpQty})" 
            class="mt-1 w-full py-0.5 rounded text-[9px] font-mono font-bold transition-all cursor-pointer ${c.ebpQty === planEbpQty ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-indigo-700 hover:text-white'}"
            title="Configure rack with ${c.ebpQty}x external battery pack(s)"
          >
            ${c.ebpQty === planEbpQty ? 'Active' : 'Select'}
          </button>
        </div>
      `).join('') : '';

      auxContainer.innerHTML = `
        <div class="space-y-3">
          <!-- Collapsible UPS Sizing Engine Panel -->
          <details ${accState.ups ? 'open' : ''} ontoggle="toggleRackAccordionSection('ups', this.open)" class="group p-3.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
            <summary class="list-none cursor-pointer select-none flex items-center justify-between gap-2 py-0.5">
              <span class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <i data-lucide="battery-charging" class="w-4 h-4 text-amber-400"></i> UPS &amp; Standby Engine
              </span>
              <div class="flex items-center gap-1.5">
                <span class="text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${isUL294Passed ? 'bg-emerald-950/90 border border-emerald-600/50 text-emerald-300' : (planBreakerStatus === 'SAFE' ? 'bg-sky-950/80 border border-sky-600/40 text-sky-400' : 'bg-amber-950/80 border border-amber-600/40 text-amber-300')}">
                  ${planAchievedRuntime}m &bull; ${isUL294Passed ? 'UL 294 OK' : `${planLoadPct}% Load`}
                </span>
                <i data-lucide="chevron-down" class="w-3.5 h-3.5 text-slate-400 rack-acc-chevron"></i>
              </div>
            </summary>

            <div class="pt-2.5 mt-2 border-t border-slate-800/80">
              <!-- Active Connected Load vs Nameplate Capacity Toggle -->
              <div class="mb-2 p-1 bg-slate-950 border border-slate-800 rounded-xl grid grid-cols-2 gap-1 text-[11px] font-semibold select-none">
                <button 
                  type="button" 
                  onclick="window.handleUpsLoadModeChange('connected')" 
                  class="py-1 px-2 rounded-lg transition-all flex flex-col items-center justify-center cursor-pointer ${isConnectedMode ? 'bg-indigo-600 text-white shadow-sm font-bold' : 'text-slate-400 hover:text-white'}"
                  title="Calculate battery runtime based on actual headend equipment plus active connected edge PoE devices"
                >
                  <span>Active Connected Load</span>
                  <span class="font-mono text-[9px] opacity-80">${connectedAcWatts}W (${fieldDeviceCount} Drops)</span>
                </button>
                <button 
                  type="button" 
                  onclick="window.handleUpsLoadModeChange('nameplate')" 
                  class="py-1 px-2 rounded-lg transition-all flex flex-col items-center justify-center cursor-pointer ${!isConnectedMode ? 'bg-indigo-600 text-white shadow-sm font-bold' : 'text-slate-400 hover:text-white'}"
                  title="Calculate battery runtime assuming switches are running at 100% full maximum PoE nameplate budget"
                >
                  <span>Full Nameplate Budget</span>
                  <span class="font-mono text-[9px] opacity-80">${worstCaseWatts}W (100% Saturation)</span>
                </button>
              </div>

              <!-- Parameters Grid (Runtime, Safety Margin, Standards, Aging) -->
              <div class="grid grid-cols-2 gap-2 text-xs mb-2">
                <div>
                  <label class="text-[10px] font-mono text-slate-400 block mb-0.5">Target Runtime</label>
                  <select onchange="window.handleUpsRuntimeChange(this.value)" class="w-full bg-slate-950 border border-slate-700 text-amber-300 font-bold rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-amber-500">
                    <option value="5" ${window.currentUpsTargetRuntime === 5 ? 'selected' : ''}>5 Minutes</option>
                    <option value="15" ${window.currentUpsTargetRuntime === 15 ? 'selected' : ''}>15 Minutes (Standard)</option>
                    <option value="30" ${window.currentUpsTargetRuntime === 30 ? 'selected' : ''}>30 Minutes</option>
                    <option value="60" ${window.currentUpsTargetRuntime === 60 ? 'selected' : ''}>60 Minutes (1 Hour)</option>
                    <option value="120" ${window.currentUpsTargetRuntime === 120 ? 'selected' : ''}>120 Minutes (2 Hours)</option>
                    <option value="240" ${window.currentUpsTargetRuntime === 240 ? 'selected' : ''}>240 Minutes (4-Hr UL 294)</option>
                  </select>
                </div>
                <div>
                  <label class="text-[10px] font-mono text-slate-400 block mb-0.5">Standby Standard</label>
                  <select onchange="window.handleUpsComplianceStandardChange(this.value)" class="w-full bg-slate-950 border border-slate-700 text-slate-200 font-medium rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-amber-500">
                    <option value="ul294" ${window.currentUpsComplianceStandard === 'ul294' ? 'selected' : ''}>UL 294 / NFPA 731 (4-Hr)</option>
                    <option value="sla_60m" ${window.currentUpsComplianceStandard === 'sla_60m' ? 'selected' : ''}>Enterprise SLA (60m)</option>
                    <option value="sla_30m" ${window.currentUpsComplianceStandard === 'sla_30m' ? 'selected' : ''}>Graceful Shutdown (30m)</option>
                    <option value="sla_15m" ${window.currentUpsComplianceStandard === 'sla_15m' ? 'selected' : ''}>Basic IT Backup (15m)</option>
                  </select>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-2 text-xs mb-2">
                <div>
                  <label class="text-[10px] font-mono text-slate-400 block mb-0.5">Battery Aging Factor</label>
                  <select onchange="window.handleUpsAgingChange(this.value)" class="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-amber-500">
                    <option value="0.85" ${window.currentUpsBatteryAging === 0.85 ? 'selected' : ''}>85% (IEEE 1188 End-of-Life)</option>
                    <option value="1.0" ${window.currentUpsBatteryAging === 1.0 ? 'selected' : ''}>100% (Factory New Battery)</option>
                  </select>
                </div>
                <div>
                  <label class="text-[10px] font-mono text-slate-400 block mb-0.5">Safety Headroom</label>
                  <select onchange="window.handleUpsMarginChange(this.value)" class="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-amber-500">
                    <option value="0.60" ${window.currentUpsSafetyMargin === 0.60 ? 'selected' : ''}>60% Max Load</option>
                    <option value="0.75" ${window.currentUpsSafetyMargin === 0.75 ? 'selected' : ''}>75% (Recommended)</option>
                    <option value="0.80" ${window.currentUpsSafetyMargin === 0.80 ? 'selected' : ''}>80% Standard</option>
                  </select>
                </div>
              </div>

              <!-- UPS Model Selector -->
              <div class="mb-2">
                <label class="text-[10px] font-mono text-slate-400 block mb-0.5">UPS Hardware Selection</label>
                <select onchange="window.handleUpsModelChange(this.value)" class="w-full bg-slate-950 border border-slate-700 text-slate-200 font-medium rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-amber-500 truncate">
                  <option value="auto" ${window.currentUpsModelSku === 'auto' ? 'selected' : ''}>⚡ Auto-Recommend Optimal (${upsPlan ? upsPlan.upsModel.sku : 'Best Fit'})</option>
                  ${upsCatalogOptionsHtml}
                </select>
              </div>

              <!-- Scalable Multi-EBP Runtime Curve Matrix -->
              <div class="mb-2 p-2 rounded-xl bg-slate-950 border border-slate-800">
                <div class="flex items-center justify-between mb-1.5 text-[10px] font-mono">
                  <span class="text-slate-400 font-bold uppercase">Scalable Runtime Curve:</span>
                  <span class="text-indigo-300 font-bold">${planLoadWatts}W Active Load</span>
                </div>
                <div class="grid grid-cols-5 gap-1">
                  ${curveHtml}
                </div>
              </div>

              <!-- UL 294 / NFPA 731 Life Safety Compliance Banner -->
              <div class="mb-2 p-2 rounded-xl border ${isUL294Passed ? 'bg-emerald-950/60 border-emerald-600/40 text-emerald-300' : 'bg-amber-950/60 border-amber-600/40 text-amber-200'} text-xs">
                <div class="flex items-center justify-between font-bold">
                  <span class="flex items-center gap-1.5">
                    <i data-lucide="${isUL294Passed ? 'shield-check' : 'alert-triangle'}" class="w-4 h-4 ${isUL294Passed ? 'text-emerald-400' : 'text-amber-400'}"></i>
                    <span>${isUL294Passed ? 'UL 294 / NFPA 731: 4-Hour PASSED' : 'UL 294 Standby Deficit: Needs EBP'}</span>
                  </span>
                  <span class="font-mono text-[11px]">${upsPlan ? upsPlan.ul294.achievedHours : (planAchievedRuntime / 60).toFixed(1)} / 4.0 Hrs</span>
                </div>
                ${!isUL294Passed && upsPlan && upsPlan.ul294.requiredEbpQty > 0 ? `
                  <button 
                    type="button" 
                    onclick="window.addSpecificEbpCountToRack(${upsPlan.ul294.requiredEbpQty})" 
                    class="mt-1.5 w-full py-1 px-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-[10px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow"
                  >
                    <i data-lucide="plus-circle" class="w-3.5 h-3.5"></i>
                    <span>+ Add ${upsPlan.ul294.requiredEbpQty}x ${planEbpModel} for UL 294 4-Hr</span>
                  </button>
                ` : ''}
              </div>

              <!-- Live Telemetry Readout -->
              <div class="bg-slate-950 rounded-lg p-2 border border-slate-800 space-y-1 text-xs font-mono">
                <div class="flex items-center justify-between gap-2">
                  <span class="text-slate-400 font-sans shrink-0">Required Sizing:</span>
                  <span class="text-emerald-400 font-bold font-sans truncate">${planUpsQty}x ${upsPlan ? upsPlan.upsModel.sku : 'UPS'} (${upsPlan ? upsPlan.upsModel.va : 1500}VA / ${planCapWatts}W)</span>
                </div>

                <div>
                  <div class="flex justify-between text-[11px] mb-0.5">
                    <span class="text-slate-400 font-sans">Unit Load (${isConnectedMode ? 'Active PoE' : 'Peak'}):</span>
                    <span class="font-bold ${planLoadPct <= 75 ? 'text-emerald-300' : (planLoadPct <= 85 ? 'text-amber-300' : 'text-rose-400')}">
                      ${planLoadWatts}W / ${planCapWatts}W (${planLoadPct}%)
                    </span>
                  </div>
                  <div class="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div class="h-full rounded-full transition-all duration-300 ${planLoadPct <= 75 ? 'bg-emerald-500' : (planLoadPct <= 85 ? 'bg-amber-500' : 'bg-rose-500')}" style="width: ${Math.min(100, planLoadPct)}%"></div>
                  </div>
                </div>

                <div class="flex items-center justify-between pt-1 border-t border-slate-800/80 font-sans font-bold">
                  <span class="text-slate-200">Achieved Runtime:</span>
                  <span class="text-emerald-400 flex items-center gap-1 font-mono">
                    <i data-lucide="clock" class="w-3.5 h-3.5 text-emerald-400"></i> ${planAchievedRuntime} min (${(planAchievedRuntime / 60).toFixed(1)} hrs)
                  </span>
                </div>
              </div>

              <!-- Auto-Slot Action Button -->
              <div class="pt-2">
                <button onclick="window.addRecommendedUpsAndEbpToRack()" class="w-full py-1.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 cursor-pointer transition-all">
                  <i data-lucide="zap" class="w-3.5 h-3.5 text-emerald-200"></i>
                  <span>Slot ${planUpsQty}x UPS ${planEbpQty > 0 ? `+ ${planEbpQty}x EBP` : ''} to Rack (U1+)</span>
                </button>
              </div>
            </div>
          </details>

          <!-- Collapsible Structural Load & Capacity Panel -->
          <details ${accState.structural ? 'open' : ''} ontoggle="toggleRackAccordionSection('structural', this.open)" class="group p-3.5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
            <summary class="list-none cursor-pointer select-none flex items-center justify-between gap-2 py-0.5">
              <span class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <i data-lucide="scale" class="w-4 h-4 text-purple-400"></i> Structural Load &amp; Clearances
              </span>
              <div class="flex items-center gap-1.5">
                <span class="text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${isWeightOverload || depthViolations.length > 0 ? 'bg-rose-950/80 border border-rose-600 text-rose-300' : 'bg-slate-950 border border-slate-800 text-purple-300'}">
                  ${Math.round(totalEquipmentWeightLbs)} lbs (${weightPct}%)
                </span>
                <i data-lucide="chevron-down" class="w-3.5 h-3.5 text-slate-400 rack-acc-chevron"></i>
              </div>
            </summary>
            <div class="space-y-1.5 text-xs pt-2.5 mt-2 border-t border-slate-800/80">
              <div>
                <div class="flex justify-between text-slate-400 mb-1">
                  <span>Equipment Payload:</span>
                  <span class="font-mono font-bold ${isWeightOverload ? 'text-rose-400' : 'text-purple-300'}">
                    ${Math.round(totalEquipmentWeightLbs)} / ${maxWeight.toLocaleString()} lbs (${weightPct}%)
                  </span>
                </div>
                <div class="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div class="h-full rounded-full transition-all duration-300 ${weightPct > 100 ? 'bg-rose-500' : (weightPct > 80 ? 'bg-amber-500' : 'bg-purple-500')}" style="width: ${Math.min(100, weightPct)}%"></div>
                </div>
              </div>
              <div class="flex justify-between text-slate-400">
                <span>Frame Tare Weight:</span>
                <span class="font-mono text-slate-300">${tareWeight} lbs (${Math.round(tareWeight * 0.453592)} kg)</span>
              </div>
              <div class="flex justify-between text-slate-400">
                <span>Cabinet Gross Weight:</span>
                <span class="font-mono text-white font-bold">${grossWeightLbs} lbs (${grossWeightKg} kg)</span>
              </div>
              <div class="flex justify-between text-slate-400">
                <span>Rail Depth Clearance:</span>
                <span class="font-mono ${depthViolations.length > 0 ? 'text-amber-400 font-bold' : 'text-cyan-300'}">${enclosureDepth}" Usable Space</span>
              </div>

              ${isWeightOverload ? `
                <div class="p-2 rounded-lg bg-rose-950/80 border border-rose-500/80 text-[10px] text-rose-200 flex items-start gap-1.5 mt-1.5">
                  <i data-lucide="alert-octagon" class="w-4 h-4 text-rose-400 shrink-0 mt-0.5"></i>
                  <span><strong>STRUCTURAL OVERLOAD:</strong> Payload (${Math.round(totalEquipmentWeightLbs)} lbs) exceeds rated capacity (${maxWeight.toLocaleString()} lbs).</span>
                </div>
              ` : ''}

              ${depthViolations.length > 0 ? `
                <div class="p-2 rounded-lg bg-amber-950/80 border border-amber-500/80 text-[10px] text-amber-200 flex items-start gap-1.5 mt-1.5">
                  <i data-lucide="alert-triangle" class="w-4 h-4 text-amber-400 shrink-0 mt-0.5"></i>
                  <span><strong>DEPTH CLEARANCE:</strong> ${escapeHTML(depthViolations[0])}</span>
                </div>
              ` : ''}

              <div class="pt-1">
                ${cogAdvisories.length > 0 ? `
                  <div class="p-1.5 rounded-lg bg-amber-950/60 border border-amber-600/40 text-[10px] text-amber-300 flex items-start gap-1.5">
                    <i data-lucide="alert-triangle" class="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5"></i>
                    <span>${escapeHTML(cogAdvisories[0])}</span>
                  </div>
                ` : (!isWeightOverload && depthViolations.length === 0 ? `
                  <div class="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                    <i data-lucide="check-circle" class="w-3.5 h-3.5"></i>
                    <span>Structural Capacity &amp; Clearances Compliant</span>
                  </div>
                ` : '')}
              </div>
            </div>
          </details>
        </div>
      `;
    }

    if (fieldContainer) {
      const fieldItems = assignedItems.filter(i => !i.rackSlot);
      fieldContainer.innerHTML = `
        <details ${(accState.passive || fieldItems.length > 0) ? 'open' : ''} ontoggle="toggleRackAccordionSection('passive', this.open)" class="group">
          <summary class="list-none cursor-pointer select-none flex items-center justify-between gap-2 py-0.5">
            <span class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <i data-lucide="layers" class="w-4 h-4 text-amber-400"></i> Passive Infra &amp; Unslotted
            </span>
            <div class="flex items-center gap-1.5">
              <span class="text-[10px] font-mono px-1.5 py-0.5 rounded ${fieldItems.length > 0 ? 'bg-amber-950/80 border border-amber-600/60 text-amber-300 font-bold' : 'bg-slate-950 border border-slate-800 text-slate-400'}">${fieldItems.length} Unslotted</span>
              <i data-lucide="chevron-down" class="w-3.5 h-3.5 text-slate-400 rack-acc-chevron"></i>
            </div>
          </summary>

          <div class="pt-2.5 mt-2 border-t border-slate-800/80">
            <!-- Quick-Add Passive Infrastructure Strip -->
            <div class="flex items-center gap-1 mb-2.5 flex-wrap">
              <button onclick="addPassiveToActiveRack('pp24')" class="px-2 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-700 hover:border-purple-500/60 rounded text-[10px] font-bold text-purple-300 flex items-center gap-1 transition-colors cursor-pointer" title="Add 1U 24-Port Modular Keystone Patch Panel (PP-1U-24P-MOD)">
                <i data-lucide="plus" class="w-3 h-3 text-purple-400"></i> 1U 24P Panel
              </button>
              <button onclick="addPassiveToActiveRack('pp48_1u')" class="px-2 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-700 hover:border-purple-500/60 rounded text-[10px] font-bold text-purple-300 flex items-center gap-1 transition-colors cursor-pointer" title="Add 1U 48-Port High-Density Modular Keystone Patch Panel (PP-1U-48P-MOD)">
                <i data-lucide="plus" class="w-3 h-3 text-purple-400"></i> 1U 48P Panel
              </button>
              <button onclick="addPassiveToActiveRack('pp48')" class="px-2 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-700 hover:border-purple-500/60 rounded text-[10px] font-bold text-purple-300 flex items-center gap-1 transition-colors cursor-pointer" title="Add 2U 48-Port Modular Keystone Patch Panel (PP-2U-48P-MOD)">
                <i data-lucide="plus" class="w-3 h-3 text-purple-400"></i> 2U 48P Panel
              </button>
              <button onclick="addPassiveToActiveRack('liu24')" class="px-2 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/60 rounded text-[10px] font-bold text-cyan-300 flex items-center gap-1 transition-colors cursor-pointer" title="Add 1U 24-Fiber (12-Port Duplex LC) Rack-Mount Fiber LIU Enclosure">
                <i data-lucide="plus" class="w-3 h-3 text-cyan-400"></i> 1U Fiber LIU
              </button>
              <button onclick="addPassiveToActiveRack('hcm1u')" class="px-2 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-700 hover:border-indigo-500/60 rounded text-[10px] font-bold text-indigo-300 flex items-center gap-1 transition-colors cursor-pointer" title="Add 1U Horizontal Cable Manager">
                <i data-lucide="plus" class="w-3 h-3 text-indigo-400"></i> 1U Cable Mgr
              </button>
              <button onclick="addPassiveToActiveRack('blank1u')" class="px-2 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-700 hover:border-slate-500 rounded text-[10px] font-bold text-slate-300 flex items-center gap-1 transition-colors cursor-pointer" title="Add 1U Blank Panel">
                <i data-lucide="plus" class="w-3 h-3 text-slate-400"></i> Blank
              </button>
            </div>

            <div class="space-y-1.5">
              ${fieldItems.length === 0 ? `
                <span class="text-slate-500 text-[11px] block py-1">All hardware is slotted into 19" EIA units.</span>
              ` : fieldItems.map(it => {
                const comp = checkDeviceHostCompatibility(it, hostType);
                return `
                <div 
                  draggable="${comp.compatible ? 'true' : 'false'}"
                  ondragstart="handleRackItemDragStart(event, '${it.instanceId}')"
                  class="bg-slate-950 p-2 rounded-xl border ${comp.compatible ? 'border-indigo-500/40 hover:border-indigo-400 cursor-grab active:cursor-grabbing' : 'border-slate-800'} flex items-center justify-between text-xs transition-colors"
                  title="${comp.compatible ? 'Drag to rack slot or click Mount' : (comp.advisory || 'Unslotted module')}"
                >
                  <div class="min-w-0 pr-2 flex-1">
                    <span class="font-bold text-white block truncate">${escapeHTML(it.model)}</span>
                    <span class="text-[10px] text-amber-400 font-mono">${it.role || 'Accessory'}</span>
                  </div>
                  <div class="flex items-center gap-1.5 shrink-0">
                    ${comp.compatible ? `
                      <button 
                        onclick="mountItemToFirstAvailableSlot('${it.instanceId}')"
                        class="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-bold shadow transition-colors cursor-pointer"
                        title="Mount into first free slot"
                      >
                        Mount
                      </button>
                    ` : ''}
                    <span class="font-mono text-[11px] text-slate-400 font-bold">${it.qty || 1}x</span>
                  </div>
                </div>
                `;
              }).join('')}
            </div>
          </div>
        </details>
      `;
    }
  }

  // Dual 0U PDU & Redundancy Card (equipment_rack only)
  const pduContainer = document.getElementById("hostPduContainer");
  if (pduContainer) {
    if (hostType === "equipment_rack" || (!hostType && !parsed.hostType)) {
      pduContainer.classList.remove("hidden");
      const pduMetrics = calculateRackPduMetrics(assignedItems, activeEnc);
      const pduConfig = getRackPduConfig();
      const accState = window.rackAccordionOpenState || { pdu: false };
      const isHorizPduMode = (pduConfig === "horizontal");
      const allCatalogPdus = getCatalogPdusList().filter(p => isHorizPduMode ? (parseInt(p.rackUnits, 10) || 0) >= 1 : (parseInt(p.rackUnits, 10) || 0) === 0);

      const pduAColor = pduMetrics.pduA.pct > 80 ? "text-rose-400" : (pduMetrics.pduA.pct > 70 ? "text-amber-400" : "text-emerald-400");
      const pduABarColor = pduMetrics.pduA.pct > 80 ? "bg-rose-500" : (pduMetrics.pduA.pct > 70 ? "bg-amber-500" : "bg-emerald-500");

      const pduSkuSelectHtml = `
        <div class="p-2 rounded-xl bg-slate-950 border border-indigo-500/30 space-y-1.5">
          <div class="flex items-center justify-between text-[10px] font-mono">
            <span class="text-slate-400 uppercase font-bold">Catalog PDU Model</span>
            <span class="${pduMetrics.isSyncedInBom ? 'text-emerald-400' : 'text-amber-400'} font-bold">${pduMetrics.isSyncedInBom ? '✓ In BOM' : 'Unsynced'}</span>
          </div>
          <select
            onchange="setRackPduCatalogSku('BOTH', this.value)"
            class="w-full bg-slate-900 border border-slate-700 text-slate-200 font-mono text-[10px] font-bold rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-500 truncate cursor-pointer"
          >
            ${allCatalogPdus.map(p => `<option value="${escapeHTML(p.sku)}" ${p.sku === pduMetrics.pduA.sku ? 'selected' : ''}>${escapeHTML(p.vendor)} ${escapeHTML(p.sku)} (${p.outletsCount}x • ${p.inputVoltage}V/${p.inputCircuitAmps}A)</option>`).join("")}
          </select>
          <div class="text-[9px] font-mono text-slate-400 truncate" title="${escapeHTML(pduMetrics.pduA.receptaclesSummary)}">
            Sockets: <strong class="text-slate-200">${escapeHTML(pduMetrics.pduA.receptaclesSummary)}</strong> &bull; Plug: <strong class="text-amber-300">${escapeHTML(pduMetrics.pduA.inputConnector)}</strong>
          </div>
          <button
            type="button"
            onclick="syncRackPdusAndCordsToBom()"
            class="w-full py-1 px-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 hover:text-white text-[10px] font-mono font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
            title="Add/update selected Catalog PDU SKUs and active Power Jumper Cord SKUs in Project BOM"
          >
            <i data-lucide="package-check" class="w-3 h-3 text-amber-400"></i>
            <span>Sync PDU &amp; ${pduMetrics.powerCords.length} Cords to BOM</span>
          </button>
        </div>
      `;

      const cordPreviewHtml = (pduMetrics.powerCords && pduMetrics.powerCords.length > 0) ? `
        <div class="pt-2 border-t border-slate-800 space-y-1">
          <div class="flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span class="uppercase font-bold">Assigned Power Cords (${pduMetrics.powerCords.length})</span>
            <button type="button" onclick="openRackPowerMatrixModal()" class="text-emerald-400 hover:underline font-bold cursor-pointer">Full Matrix ➔</button>
          </div>
          <div class="max-h-36 overflow-y-auto space-y-1 pr-1">
            ${pduMetrics.powerCords.slice(0, 8).map(c => `
              <button
                type="button"
                onclick="openRackPowerMatrixModal('${c.feed}', ${c.outletNumber})"
                class="w-full px-2 py-1 rounded bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/50 flex items-center justify-between text-[10px] font-mono transition-colors cursor-pointer"
                title="Cord SKU: ${escapeHTML(c.cordSku)} | Brady L1: ${escapeHTML(c.bradyPsuLine1)} | L2: ${escapeHTML(c.bradyPsuLine2)}"
              >
                <span class="text-amber-300 font-bold truncate">${escapeHTML(c.powerCordId)} <span class="text-indigo-300">[${escapeHTML(c.cordSku)}]</span></span>
                <span class="text-slate-300 truncate">${escapeHTML(c.devicePsuTag)} ➔ <strong class="${c.feed === 'PDU-A' ? 'text-emerald-400' : 'text-sky-400'}">${escapeHTML(c.pduShortReceptacle)}</strong></span>
              </button>
            `).join("")}
          </div>
        </div>
      ` : '';

      if (pduConfig === "horizontal") {
        pduContainer.innerHTML = `
          <details ${accState.pdu ? 'open' : ''} ontoggle="toggleRackAccordionSection('pdu', this.open)" class="group">
            <summary class="list-none cursor-pointer select-none flex items-center justify-between gap-2 py-0.5">
              <span class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 text-indigo-400">
                <i data-lucide="plug-zap" class="w-4 h-4"></i> ${pduMetrics.pduA.rackUnits || 1}U PDU (${escapeHTML(pduMetrics.pduA.sku)})
              </span>
              <div class="flex items-center gap-1.5">
                <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 ${pduAColor} font-bold">${pduMetrics.pduA.amps}A / ${pduMetrics.pduA.maxSafeAmps}A (${pduMetrics.pduA.outletsUsed}/${pduMetrics.pduA.totalOutlets})</span>
                <i data-lucide="chevron-down" class="w-3.5 h-3.5 text-slate-400 rack-acc-chevron"></i>
              </div>
            </summary>
            <div class="space-y-2.5 pt-2.5 mt-2 border-t border-slate-800/80">
              ${pduSkuSelectHtml}
              <div class="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <div class="flex items-center justify-between text-xs mb-1">
                  <span class="font-bold text-indigo-300 flex items-center gap-1.5 font-mono">
                    <span class="w-2 h-2 rounded-full bg-indigo-400"></span> ${escapeHTML(pduMetrics.pduA.fullId)} (${escapeHTML(pduMetrics.pduA.sku)})
                  </span>
                  <span class="font-mono font-bold ${pduAColor}">${pduMetrics.pduA.amps} A / ${pduMetrics.pduA.maxSafeAmps} A</span>
                </div>
                <div class="text-[10px] font-mono text-slate-400 mb-1.5">Upstream: <strong class="text-slate-200">${escapeHTML(pduMetrics.pduA.upstreamFull)}</strong></div>
                <div class="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden mb-1.5">
                  <div class="${pduABarColor} h-1.5 rounded-full transition-all" style="width: ${pduMetrics.pduA.pct}%"></div>
                </div>
                <div class="flex justify-between text-[10px] font-mono text-slate-400">
                  <span>${pduMetrics.pduA.watts} W (${pduMetrics.pduA.pct}% continuous)</span>
                  <span>${pduMetrics.pduA.outletsUsed} / ${pduMetrics.pduA.totalOutlets} Receptacles</span>
                </div>
              </div>
              ${cordPreviewHtml}
              <div class="grid grid-cols-2 gap-1.5">
                <button onclick="openRackPowerMatrixModal()" class="py-1.5 px-2 rounded-xl bg-emerald-950 hover:bg-emerald-900 border border-emerald-600/70 text-emerald-300 hover:text-white text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer">
                  <i data-lucide="plug-zap" class="w-3.5 h-3.5 text-emerald-400"></i> Power Matrix
                </button>
                <button onclick="switchRackOrientation('rear')" class="py-1.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer">
                  <i data-lucide="rotate-cw" class="w-3.5 h-3.5 text-indigo-400"></i> Rear View
                </button>
              </div>
            </div>
          </details>
        `;
      } else if (pduConfig === "single_vertical") {
        pduContainer.innerHTML = `
          <details ${accState.pdu ? 'open' : ''} ontoggle="toggleRackAccordionSection('pdu', this.open)" class="group">
            <summary class="list-none cursor-pointer select-none flex items-center justify-between gap-2 py-0.5">
              <span class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 text-emerald-400">
                <i data-lucide="plug-zap" class="w-4 h-4"></i> 0U PDU (${escapeHTML(pduMetrics.pduA.sku)})
              </span>
              <div class="flex items-center gap-1.5">
                <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 ${pduAColor} font-bold">${pduMetrics.pduA.amps}A / ${pduMetrics.pduA.maxSafeAmps}A (${pduMetrics.pduA.outletsUsed}/${pduMetrics.pduA.totalOutlets})</span>
                <i data-lucide="chevron-down" class="w-3.5 h-3.5 text-slate-400 rack-acc-chevron"></i>
              </div>
            </summary>
            <div class="space-y-2.5 pt-2.5 mt-2 border-t border-slate-800/80">
              ${pduSkuSelectHtml}
              <div class="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <div class="flex items-center justify-between text-xs mb-1">
                  <span class="font-bold text-emerald-400 flex items-center gap-1.5 font-mono">
                    <span class="w-2 h-2 rounded-full bg-emerald-400"></span> ${escapeHTML(pduMetrics.pduA.fullId)} (${escapeHTML(pduMetrics.pduA.sku)})
                  </span>
                  <span class="font-mono font-bold ${pduAColor}">${pduMetrics.pduA.amps} A / ${pduMetrics.pduA.maxSafeAmps} A</span>
                </div>
                <div class="text-[10px] font-mono text-slate-400 mb-1.5">Upstream: <strong class="text-slate-200">${escapeHTML(pduMetrics.pduA.upstreamFull)}</strong></div>
                <div class="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden mb-1.5">
                  <div class="${pduABarColor} h-1.5 rounded-full transition-all" style="width: ${pduMetrics.pduA.pct}%"></div>
                </div>
                <div class="flex justify-between text-[10px] font-mono text-slate-400">
                  <span>${pduMetrics.pduA.watts} W (${pduMetrics.pduA.pct}% continuous)</span>
                  <span>${pduMetrics.pduA.outletsUsed} / ${pduMetrics.pduA.totalOutlets} Receptacles</span>
                </div>
              </div>
              ${cordPreviewHtml}
              <div class="grid grid-cols-2 gap-1.5">
                <button onclick="openRackPowerMatrixModal()" class="py-1.5 px-2 rounded-xl bg-emerald-950 hover:bg-emerald-900 border border-emerald-600/70 text-emerald-300 hover:text-white text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer">
                  <i data-lucide="plug-zap" class="w-3.5 h-3.5 text-emerald-400"></i> Power Matrix
                </button>
                <button onclick="switchRackOrientation('rear')" class="py-1.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer">
                  <i data-lucide="rotate-cw" class="w-3.5 h-3.5 text-emerald-400"></i> Rear View
                </button>
              </div>
            </div>
          </details>
        `;
      } else {
        // Dual 0U PDUs (A+B)
        const spofCount = pduMetrics.redundancy.singlePointFailureCount;
        const redundantCount = pduMetrics.redundancy.redundantDeviceCount;
        const singleCount = pduMetrics.redundancy.singleCordedCount;

        const pduBColor = pduMetrics.pduB.pct > 80 ? "text-rose-400" : (pduMetrics.pduB.pct > 70 ? "text-amber-400" : "text-sky-400");
        const pduBBarColor = pduMetrics.pduB.pct > 80 ? "bg-rose-500" : (pduMetrics.pduB.pct > 70 ? "bg-amber-500" : "bg-sky-500");

        pduContainer.innerHTML = `
          <details ${accState.pdu ? 'open' : ''} ontoggle="toggleRackAccordionSection('pdu', this.open)" class="group">
            <summary class="list-none cursor-pointer select-none flex items-center justify-between gap-2 py-0.5">
              <span class="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 text-indigo-400">
                <i data-lucide="plug-zap" class="w-4 h-4"></i> Dual 0U PDUs (${escapeHTML(pduMetrics.pduA.sku)})
              </span>
              <div class="flex items-center gap-1.5">
                <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-emerald-400 font-bold">A:${pduMetrics.pduA.amps}A &bull; B:${pduMetrics.pduB.amps}A</span>
                <i data-lucide="chevron-down" class="w-3.5 h-3.5 text-slate-400 rack-acc-chevron"></i>
              </div>
            </summary>

            <div class="space-y-2.5 pt-2.5 mt-2 border-t border-slate-800/80">
              ${pduSkuSelectHtml}

              <!-- PDU Load Meters -->
              <div class="space-y-2">
                <!-- Feed A (Utility) -->
                <div class="p-2 rounded-xl bg-slate-950 border border-slate-800">
                  <div class="flex items-center justify-between text-xs mb-0.5">
                    <span class="font-bold text-emerald-400 flex items-center gap-1.5 font-mono">
                      <span class="w-2 h-2 rounded-full bg-emerald-400"></span> ${escapeHTML(pduMetrics.pduA.fullId)} (${escapeHTML(pduMetrics.pduA.sku)})
                    </span>
                    <span class="font-mono font-bold ${pduAColor}">${pduMetrics.pduA.amps} A / ${pduMetrics.pduA.maxSafeAmps} A</span>
                  </div>
                  <div class="text-[9.5px] font-mono text-slate-400 mb-1 truncate">Feed: <strong class="text-slate-300">${escapeHTML(pduMetrics.pduA.upstreamFull)}</strong></div>
                  <div class="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden mb-1">
                    <div class="${pduABarColor} h-1.5 rounded-full transition-all" style="width: ${pduMetrics.pduA.pct}%"></div>
                  </div>
                  <div class="flex justify-between text-[10px] font-mono text-slate-400">
                    <span>${pduMetrics.pduA.watts} W (${pduMetrics.pduA.pct}%)</span>
                    <span>${pduMetrics.pduA.outletsUsed} / ${pduMetrics.pduA.totalOutlets} Outlets (Black)</span>
                  </div>
                </div>

                <!-- Feed B (UPS / Generator) -->
                <div class="p-2 rounded-xl bg-slate-950 border border-slate-800">
                  <div class="flex items-center justify-between text-xs mb-0.5">
                    <span class="font-bold text-sky-400 flex items-center gap-1.5 font-mono">
                      <span class="w-2 h-2 rounded-full bg-sky-400"></span> ${escapeHTML(pduMetrics.pduB.fullId)} (${escapeHTML(pduMetrics.pduB.sku)})
                    </span>
                    <span class="font-mono font-bold ${pduBColor}">${pduMetrics.pduB.amps} A / ${pduMetrics.pduB.maxSafeAmps} A</span>
                  </div>
                  <div class="text-[9.5px] font-mono text-slate-400 mb-1 truncate">Feed: <strong class="text-slate-300">${escapeHTML(pduMetrics.pduB.upstreamFull)}</strong></div>
                  <div class="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden mb-1">
                    <div class="${pduBBarColor} h-1.5 rounded-full transition-all" style="width: ${pduMetrics.pduB.pct}%"></div>
                  </div>
                  <div class="flex justify-between text-[10px] font-mono text-slate-400">
                    <span>${pduMetrics.pduB.watts} W (${pduMetrics.pduB.pct}%)</span>
                    <span>${pduMetrics.pduB.outletsUsed} / ${pduMetrics.pduB.totalOutlets} Outlets (Blue)</span>
                  </div>
                </div>
              </div>

              <!-- A+B Redundancy Diagnostic Breakdown -->
              <div class="pt-2 border-t border-slate-800 space-y-1 text-xs">
                <div class="flex items-center justify-between">
                  <span class="text-slate-400 text-[11px]">A+B Dual-Feed Redundant:</span>
                  <span class="font-mono font-bold text-emerald-400 text-[11px]">${redundantCount} Unit${redundantCount === 1 ? '' : 's'}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-slate-400 text-[11px]">Single Point of Failure (SPOF):</span>
                  <span class="font-mono font-bold ${spofCount > 0 ? 'text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/80' : 'text-slate-500'} text-[11px]">
                    ${spofCount > 0 ? `⚠️ ${spofCount} Unit${spofCount === 1 ? '' : 's'}` : '0 None'}
                  </span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-slate-400 text-[11px]">Single-Corded Devices:</span>
                  <span class="font-mono text-slate-400 text-[11px]">${singleCount} Unit${singleCount === 1 ? '' : 's'}</span>
                </div>
              </div>

              ${cordPreviewHtml}

              <!-- Power Matrix, Auto-Balance Action & Orientation Link -->
              <div class="pt-2 border-t border-slate-800 space-y-1.5">
                <button onclick="openRackPowerMatrixModal()" class="w-full py-1.5 px-3 rounded-xl bg-emerald-950 hover:bg-emerald-900 border border-emerald-600/70 text-emerald-300 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer">
                  <i data-lucide="plug-zap" class="w-3.5 h-3.5 text-emerald-400"></i> Open Power &amp; PDU Matrix
                </button>
                <button onclick="autoBalanceRackPowerFeeds()" class="w-full py-1.5 px-3 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/50 hover:border-indigo-400 text-indigo-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer">
                  <i data-lucide="scale" class="w-3.5 h-3.5 text-indigo-400"></i> Auto-Balance &amp; Align A+B
                </button>
                <div class="text-center pt-0.5">
                  <button onclick="switchRackOrientation('rear')" class="text-[10px] text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-1 mx-auto cursor-pointer">
                    <i data-lucide="rotate-cw" class="w-3 h-3 text-indigo-400"></i>
                    <span>Inspect Receptacles in Rear Elevation</span>
                  </button>
                </div>
              </div>
            </div>
          </details>
        `;
      }
    } else {
      pduContainer.classList.add("hidden");
      pduContainer.innerHTML = "";
    }
  }

  // Update legacy element IDs if still referenced elsewhere
  updateLegacyTelemetryElements(assignedItems);
}

function updateLegacyTelemetryElements(assignedItems) {
  const baseEl = document.getElementById("rackTotalBaseWatts");
  const poeEl = document.getElementById("rackTotalPoE");
  const operatingEl = document.getElementById("rackOperatingWatts");
  const worstEl = document.getElementById("rackTotalWorstCase");
  const btuEl = document.getElementById("rackTotalBTU");

  if (!baseEl && !poeEl) return;

  let totalBase = 0, totalPoE = 0;
  assignedItems.forEach(it => {
    const units = (it.stackedUnits && it.stackedUnits >= 2) ? it.stackedUnits : 1;
    totalBase += parseFloat(it.baseWatts || 0) * units;
    totalPoE += parseFloat(it.poeBudget || 0) * units;
  });
  const operatingWatts = Math.round(totalBase + (totalPoE * 0.5));
  const worstCaseWatts = Math.round(totalBase + totalPoE);

  if (baseEl) baseEl.innerText = `${Math.round(totalBase)} W`;
  if (poeEl) poeEl.innerText = `${Math.round(totalPoE)} W`;
  if (operatingEl) operatingEl.innerText = `${operatingWatts} W`;
  if (worstEl) worstEl.innerText = `${worstCaseWatts} W`;
  if (btuEl) btuEl.innerText = `${Math.round(worstCaseWatts * 3.412)} BTU/hr`;
}

// -----------------------------------------------------------
// Served Edge Endpoints & Drops Drag-and-Drop Handling
// -----------------------------------------------------------
function handleServedEndpointsDragOver(event) {
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
  event.currentTarget.classList.add("border-indigo-500", "bg-indigo-950/30");
}

function handleServedEndpointsDragLeave(event) {
  event.currentTarget.classList.remove("border-indigo-500", "bg-indigo-950/30");
}

function handleServedEndpointsDrop(event) {
  event.preventDefault();
  event.currentTarget.classList.remove("border-indigo-500", "bg-indigo-950/30");
  const instanceId = event.dataTransfer?.getData("text/plain") || 
                     event.dataTransfer?.getData("hardwareInstanceId") || 
                     draggedRackItemInstanceId;
  if (!instanceId || typeof projectBOM === "undefined") return;

  const item = projectBOM.find(i => i.instanceId === instanceId);
  if (!item) return;

  const isServer = typeof isServerDevice === "function" ? isServerDevice(item) : (item.role === "Server" || item.category === "servers" || /server/i.test(item.role || ''));
  if (isServer) {
    if (typeof showToast === "function") {
      showToast("Servers must be mounted directly into rack slots, not assigned as field drops.", 4000);
    }
    return;
  }

  delete item.rackSlot;
  item.closetName = activeRackId;
  item.rackId = activeRackId;

  FacilityStore.notifyWorkspaceChange();
  renderRackVisualizer();
  if (typeof showToast === "function") {
    showToast(`Homed ${item.model || 'Device'} as a drop to ${activeRackId}`);
  }
}
window.handleServedEndpointsDragOver = handleServedEndpointsDragOver;
window.handleServedEndpointsDragLeave = handleServedEndpointsDragLeave;
window.handleServedEndpointsDrop = handleServedEndpointsDrop;

function renderServedEndpoints(parsed, activeEnc) {
  const container = document.getElementById("hostEndpointsContainer");
  const countBadge = document.getElementById("hostEndpointsCount");
  if (!container) return;

  const endpoints = FacilityStore.getEndpoints();
  // Filter endpoints that home-run to this host or this space
  const servedEndpoints = endpoints.filter(ep => {
    if (ep.homeRunHostId && parsed.hostId && ep.homeRunHostId === parsed.hostId) return true;
    if (ep.homeRunHostName && FacilityStore.normalize(ep.homeRunHostName) === activeRackId) return true;
    return false;
  });

  // Query unenclosed field devices in projectBOM (cameras, radios, readers, sensors) homed to switches in this host or this location
  const assignedSwitches = (typeof projectBOM !== "undefined" && Array.isArray(projectBOM))
    ? projectBOM.filter(i => (i.closetName === activeRackId || i.rackId === activeRackId) && (i.role === "Access" || i.role === "Core" || i.role === "Aggregation" || i.role === "Industrial DIN-Rail Switch")).map(s => s.instanceId)
    : [];

  const bomFieldDevices = (typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) ? projectBOM.filter(dev => {
    if (dev.parentInstanceId) return false;
    if (dev.rackSlot) return false; // In a rack unit or bay, not a field device
    const isHomed = (dev.uplinkTargetId && assignedSwitches.includes(dev.uplinkTargetId)) ||
                    (FacilityStore.normalize(dev.closetName || dev.rackId) === activeRackId);
    return isHomed;
  }) : [];

  const totalDrops = servedEndpoints.length + bomFieldDevices.length;
  if (countBadge) countBadge.innerText = totalDrops.toString();

  // Field cabling rollups
  let totalCompositeCables = 0;
  let totalCat6aDrops = 0;
  let totalFiberRuns = 0;

  servedEndpoints.forEach(ep => {
    if (ep.endpointType === "door_portal") totalCompositeCables++;
    else if (ep.endpointType === "surveillance_point" || ep.endpointType === "wireless_node" || ep.endpointType === "telecom_outlet") totalCat6aDrops++;
    else if (ep.mediaType && ep.mediaType.includes("fiber")) totalFiberRuns++;
  });

  bomFieldDevices.forEach(dev => {
    if (dev.role === "Access Control" || dev.category?.includes("access")) totalCompositeCables += (dev.qty || 1);
    else if (dev.role === "Camera" || dev.role === "Edge Device" || dev.category?.includes("camera")) totalCat6aDrops += (dev.qty || 1);
    else if (dev.category?.includes("wireless") || dev.category?.includes("ptp")) totalCat6aDrops += (dev.qty || 1);
    else if (dev.role === "Optics & DAC" || dev.category?.includes("fiber")) totalFiberRuns += (dev.qty || 1);
  });

  const dropTiles = [];
  if (totalCompositeCables > 0) {
    dropTiles.push(`
      <div class="bg-slate-900 p-2 rounded-lg border border-slate-800">
        <span class="text-slate-400 block text-[9px] uppercase">Composite Banana</span>
        <span class="text-white font-bold">${totalCompositeCables} Run${totalCompositeCables === 1 ? '' : 's'}</span>
      </div>
    `);
  }
  if (totalCat6aDrops > 0) {
    dropTiles.push(`
      <div class="bg-slate-900 p-2 rounded-lg border border-slate-800">
        <span class="text-slate-400 block text-[9px] uppercase">Cat6A Plenum</span>
        <span class="text-white font-bold">${totalCat6aDrops} Drop${totalCat6aDrops === 1 ? '' : 's'}</span>
      </div>
    `);
  }
  if (totalFiberRuns > 0) {
    dropTiles.push(`
      <div class="bg-slate-900 p-2 rounded-lg border border-slate-800">
        <span class="text-slate-400 block text-[9px] uppercase">Fiber Optic</span>
        <span class="text-white font-bold">${totalFiberRuns} Run${totalFiberRuns === 1 ? '' : 's'}</span>
      </div>
    `);
  }

  const dropGridColsClass = dropTiles.length === 1 ? 'grid-cols-1' : (dropTiles.length === 2 ? 'grid-cols-2' : 'grid-cols-3');

  container.innerHTML = `
    <!-- Cabling Rollup Header Strip -->
    <div class="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
      <div class="flex items-center justify-between">
        <span class="text-xs font-bold text-white flex items-center gap-1.5">
          <i data-lucide="network" class="w-3.5 h-3.5 text-indigo-400"></i> Served Field Hardware & Cabling
        </span>
        <span class="text-[10px] font-mono text-emerald-400">${totalDrops} Active Drop${totalDrops === 1 ? '' : 's'}</span>
      </div>
      ${dropTiles.length > 0 ? `
        <div class="grid ${dropGridColsClass} gap-2 text-[11px] font-mono">
          ${dropTiles.join("")}
        </div>
      ` : ''}
    </div>

    <!-- Quick Add Endpoint Button -->
    <div class="flex items-center justify-between pt-1">
      <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Homed Field Devices (${totalDrops})</span>
      <button onclick="promptAddEndpointToActiveHost()" class="px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-sm transition-colors">
        <i data-lucide="plus" class="w-3 h-3"></i> Add Drop
      </button>
    </div>

    <!-- Endpoints List (Supports drop targeting) -->
    <div 
      ondragover="handleServedEndpointsDragOver(event)"
      ondragleave="handleServedEndpointsDragLeave(event)"
      ondrop="handleServedEndpointsDrop(event)"
      class="space-y-2 max-h-64 overflow-y-auto pr-1 rounded-xl p-1 border border-transparent transition-all"
    >
      ${totalDrops === 0 ? `
        <div class="border border-dashed border-slate-800 rounded-xl p-4 text-center text-xs text-slate-500 hover:border-indigo-500/50 transition-colors">
          <i data-lucide="network" class="w-5 h-5 mx-auto mb-1 text-slate-600 opacity-60"></i>
          <span>No field drops are currently homed to ${escapeHTML(activeRackId)}.</span>
          <p class="text-[10px] text-slate-500 mt-0.5">Drag cameras, radios, or sensors here to home them to this enclosure.</p>
          <button onclick="promptAddEndpointToActiveHost()" class="mt-2 block mx-auto text-indigo-400 hover:underline text-[11px]">
            + Add Door, Camera, or Outlet
          </button>
        </div>
      ` : `
        <!-- Unenclosed BOM Field Hardware -->
        ${bomFieldDevices.map(dev => {
          const mountMethod = dev.mountMethod ? dev.mountMethod.toUpperCase() : "WALL";
          return `
            <div class="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs hover:border-slate-700 transition-colors group">
              <div class="flex items-center gap-2.5 min-w-0">
                <div class="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-cyan-400 shrink-0">
                  <i data-lucide="camera" class="w-3.5 h-3.5"></i>
                </div>
                <div class="min-w-0">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    ${dev.deviceNumber ? `<span class="px-1.5 py-0.2 rounded bg-brand-900/60 border border-brand-500/40 text-[9px] font-mono font-bold text-brand-300">${escapeHTML(dev.deviceNumber)}</span>` : ''}
                    <span class="font-bold text-white truncate" title="${escapeHTML(dev.friendlyName || dev.model)}">${escapeHTML(dev.friendlyName || dev.model)}</span>
                    <button type="button" onclick="event.stopPropagation(); promptEditDeviceFriendlyName('${dev.instanceId}')" class="text-slate-400 hover:text-white p-0.5 rounded hover:bg-slate-800 transition-colors" title="Edit Friendly Name">
                      <i data-lucide="pencil" class="w-2.5 h-2.5"></i>
                    </button>
                  </div>
                  ${dev.friendlyName && dev.friendlyName !== dev.model ? `<span class="text-[10px] text-slate-300 font-medium block truncate">${escapeHTML(dev.model)}</span>` : ''}
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="text-[9px] font-mono px-1 py-0.2 rounded bg-cyan-950/80 border border-cyan-800 text-cyan-300 font-bold">${mountMethod} MOUNT</span>
                    <span class="text-[10px] text-slate-400 font-mono">${escapeHTML(dev.role || 'Field Device')} &bull; ${dev.consumedPoEWatts || 15}W PoE</span>
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-1 shrink-0">
                <button onclick="jumpToTopologyTarget('node:${dev.instanceId}')" class="p-1 text-slate-400 hover:text-indigo-300 transition-colors" title="Jump to Topology">
                  <i data-lucide="network" class="w-3.5 h-3.5"></i>
                </button>
                <button onclick="jumpToPhysicalLayoutTarget('${dev.instanceId}')" class="p-1 text-slate-400 hover:text-amber-300 transition-colors" title="Jump to Physical Layout">
                  <i data-lucide="map" class="w-3.5 h-3.5"></i>
                </button>
                <button onclick="jumpToBomTarget('${dev.instanceId}')" class="p-1 text-slate-400 hover:text-emerald-300 transition-colors" title="Jump to BOM">
                  <i data-lucide="file-spreadsheet" class="w-3.5 h-3.5"></i>
                </button>
              </div>
            </div>
          `;
        }).join('')}

        <!-- Telecom / Facility Outlets -->
        ${servedEndpoints.map(ep => {
          const typeDef = FacilityStore.ENDPOINT_TYPES[ep.endpointType] || FacilityStore.ENDPOINT_TYPES.door_portal;
          return `
            <div class="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs hover:border-slate-700 transition-colors">
              <div class="flex items-center gap-2.5 min-w-0">
                <div class="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-indigo-400 shrink-0">
                  <i data-lucide="${typeDef.icon || 'circle'}" class="w-3.5 h-3.5"></i>
                </div>
                <div class="min-w-0">
                  <span class="font-bold text-white block truncate">${escapeHTML(ep.name)}</span>
                  <span class="text-[10px] text-slate-400 font-mono block">${typeDef.label} &bull; ${escapeHTML(ep.mediaType || 'Cat6A')}</span>
                </div>
              </div>
              <div class="flex items-center gap-1 shrink-0">
                <button onclick="unlinkEndpointFromHost('${ep.id}')" class="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors" title="Unlink from this host">
                  <i data-lucide="x" class="w-3.5 h-3.5"></i>
                </button>
              </div>
            </div>
          `;
        }).join('')}
      `}
    </div>
  `;
}

function promptAddEndpointToActiveHost() {
  const name = prompt("Enter Endpoint Name (e.g. Door 101 - Main Entrance, Cam-04 Exterior East, AP-12):", "Door 101");
  if (!name || !name.trim()) return;

  const lower = name.toLowerCase();
  let epType = "door_portal";
  if (lower.includes("cam") || lower.includes("cctv")) epType = "surveillance_point";
  else if (lower.includes("ap") || lower.includes("wifi") || lower.includes("wireless")) epType = "wireless_node";
  else if (lower.includes("drop") || lower.includes("outlet") || lower.includes("desk")) epType = "telecom_outlet";

  const parsed = FacilityStore.parse(activeRackId);
  FacilityStore.addEndpoint(name.trim(), epType, parsed.floorId || "floor-1", {
    homeRunHostId: parsed.hostId,
    homeRunHostName: activeRackId
  });

  renderServedEndpoints(parsed, null);
  if (typeof showToast === "function") {
    showToast(`Created & homed ${name.trim()} to ${activeRackId}`);
  }
}

function unlinkEndpointFromHost(endpointId) {
  FacilityStore.updateEndpoint(endpointId, { homeRunHostId: null, homeRunHostName: FacilityStore.UNASSIGNED });
  const parsed = FacilityStore.parse(activeRackId);
  renderServedEndpoints(parsed, null);
  if (typeof showToast === "function") {
    showToast("Unlinked endpoint from this host.");
  }
}

// -----------------------------------------------------------
// Helpers & Utilities
// -----------------------------------------------------------
function getItemPortCount(item) {
  if (item.ports && parseInt(item.ports, 10)) return parseInt(item.ports, 10);
  if (item.portCount && parseInt(item.portCount, 10)) return parseInt(item.portCount, 10);
  const text = `${item.model || ''} ${item.description || ''} ${item.name || ''}`;
  const match = text.match(/(?:^|\b|-)(\d{1,3})\s*(?:port|p\b)/i);
  if (match) return parseInt(match[1], 10);
  return 0;
}

function getDeviceMountPriority(item) {
  const role = (item.role || "").toLowerCase();
  const cat = (item.category || "").toLowerCase();
  const model = (item.model || "").toLowerCase();
  const desc = (item.description || "").toLowerCase();
  const allText = `${role} ${cat} ${model} ${desc}`;

  // 1. ISP Equipment (Carrier Demarc, NID, ISP Modems, ONT)
  if (role.includes("isp") || role.includes("demarc") || role.includes("nid") ||
      cat.includes("isp") || cat.includes("demarc") ||
      allText.includes("isp") || allText.includes("demarc") || allText.includes("nid") ||
      allText.includes("carrier") || allText.includes("modem") || allText.includes("ont") ||
      allText.includes("fiber liu") || item.sku === "LIU-1U-24LC") {
    return { priority: 1, group: "isp", portCount: 0 };
  }

  // 2. Firewalls (Security WAN, NextGen Firewalls, Gateways, Threat Appliances)
  if (role.includes("security wan") || role.includes("firewall") || role.includes("utm") ||
      cat.includes("firewall") || cat.includes("security_appliance") ||
      allText.includes("firewall") || allText.includes("fortigate") || allText.includes("palo alto") ||
      allText.includes("meraki mx") || allText.includes("firepower") || allText.includes("sonicwall") ||
      allText.includes("udm-pro") || allText.includes("udm-se") || allText.includes("gateway")) {
    return { priority: 2, group: "firewall", portCount: 0 };
  }

  // 3. Core Switches
  if (role === "core" || role.includes("core & agg") || role.includes("core switch")) {
    return { priority: 3, group: "core", portCount: getItemPortCount(item) };
  }

  // 4. Aggregation Switches
  if (role.includes("aggregation") || role.includes("distribution") || role === "dist" || role.includes("agg switch")) {
    return { priority: 4, group: "aggregation", portCount: getItemPortCount(item) };
  }

  // 5. Access Switches (ordered descending by port count)
  if (role.includes("access") || cat.includes("switch") || allText.includes("switch")) {
    return { priority: 5, group: "access", portCount: getItemPortCount(item) };
  }

  // 6. Servers & Storage (Compute, NVRs, NAS, SAN, Appliances)
  if (role.includes("server") || role.includes("storage") || role.includes("nvr") || role.includes("compute") ||
      cat.includes("server") || cat.includes("storage") || cat.includes("nvr") ||
      allText.includes("server") || allText.includes("poweredge") || allText.includes("proliant") ||
      allText.includes("nvr") || allText.includes("storage") || allText.includes("nas")) {
    return { priority: 6, group: "server", portCount: 0 };
  }

  // 7. UPSes & Battery Units (Uninterruptible Power Supplies, battery backups placed at rack bottom U1+)
  if (role.includes("ups") || role.includes("power") || role.includes("battery") ||
      cat.includes("ups") || cat.includes("power") ||
      allText.includes("ups") || allText.includes("smart-ups") || allText.includes("battery") ||
      allText.includes("apc") || allText.includes("vertiv") || allText.includes("cyberpower") ||
      allText.includes("tripp lite") || allText.includes("eaton")) {
    return { priority: 7, group: "ups", portCount: 0 };
  }

  // 8. Other / Structured Cabling / Patch Panels / Accessories
  return { priority: 8, group: "other", portCount: getItemPortCount(item) };
}

function findNextAvailableSlot(slots, heightU, maxU) {
  for (let u = 1; u <= maxU - heightU + 1; u++) {
    let available = true;
    for (let offset = 0; offset < heightU; offset++) {
      if (slots[u + offset] !== null) {
        available = false;
        break;
      }
    }
    if (available) return u;
  }
  return null;
}

function findNextAvailableSlotFromTop(slots, heightU, maxU) {
  for (let u = maxU - heightU + 1; u >= 1; u--) {
    let available = true;
    for (let offset = 0; offset < heightU; offset++) {
      if (slots[u + offset] !== null) {
        available = false;
        break;
      }
    }
    if (available) return u;
  }
  return null;
}

function isCollision(slots, startU, heightU, ignoreInstanceId) {
  for (let offset = 0; offset < heightU; offset++) {
    const slot = slots[startU + offset];
    if (slot && slot.item.instanceId !== ignoreInstanceId) {
      return true;
    }
  }
  return false;
}

function getRoleColor(role) {
  switch (role) {
    case "Core":
    case "Core & Agg":
    case "Aggregation":
      return "text-purple-400";
    case "Access":
      return "text-emerald-400";
    case "Structured Cabling":
      return "text-amber-300";
    case "Gateways & WAN":
    case "Security WAN":
      return "text-rose-400";
    case "Access Control":
      return "text-emerald-300";
    case "Surveillance":
    case "Video":
      return "text-sky-400";
    case "Wireless Bridge":
      return "text-cyan-400";
    default:
      return "text-slate-300";
  }
}

if (typeof window !== "undefined" && typeof window.escapeHTML !== "function") {
  window.escapeHTML = function(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };
}
var escapeHTML = (typeof window !== "undefined" && typeof window.escapeHTML === "function") ? window.escapeHTML : function(str) { return String(str ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); };

// -----------------------------------------------------------
// Persistence
// -----------------------------------------------------------
function saveRackSettings() {
  try {
    const projKey = FacilityStore.getProjectId();
    localStorage.setItem(`netselect_rack_height_${projKey}_${activeRackId}`, activeRackHeight.toString());
  } catch (e) {}
}

function loadRackSettings() {
  try {
    const projKey = FacilityStore.getProjectId();
    const parsed = FacilityStore.parse(activeRackId);
    const enclosures = FacilityStore.getEnclosures();
    const enc = enclosures.find(e => e.id === parsed.hostId) || enclosures.find(e => e.name.toLowerCase() === (parsed.hostName || '').toLowerCase());
    if (enc && enc.heightU && enc.hostType === "equipment_rack") {
      activeRackHeight = enc.heightU;
      return;
    }
    const val = localStorage.getItem(`netselect_rack_height_${projKey}_${activeRackId}`);
    activeRackHeight = val ? parseInt(val, 10) : 24;
  } catch (e) {
    activeRackHeight = 24;
  }
}

function addPassiveToActiveRack(type) {
  if (typeof projectBOM === "undefined" || !Array.isArray(projectBOM)) return;
  const parsed = FacilityStore.parse(activeRackId);
  const targetLoc = activeRackId;

  let itemData = null;
  if (type === "pp24") {
    itemData = {
      sku: "PP-1U-24P-MOD",
      model: "1U 24-Port High-Density Modular Keystone Patch Panel",
      vendor: "Panduit",
      msrp: 68,
      rackUnits: 1,
      ports: 24,
      role: "Structured Cabling",
      weightLbs: 2.5
    };
  } else if (type === "pp48_1u") {
    itemData = {
      sku: "PP-1U-48P-MOD",
      model: "1U 48-Port High-Density Modular Keystone Patch Panel",
      vendor: "Panduit",
      msrp: 108,
      rackUnits: 1,
      ports: 48,
      role: "Structured Cabling",
      weightLbs: 2.2
    };
  } else if (type === "pp48") {
    itemData = {
      sku: "PP-2U-48P-MOD",
      model: "2U 48-Port High-Density Modular Keystone Patch Panel",
      vendor: "Panduit",
      msrp: 115,
      rackUnits: 2,
      ports: 48,
      role: "Structured Cabling",
      weightLbs: 4.5
    };
  } else if (type === "hcm1u") {
    itemData = {
      sku: "HCM-1U",
      model: "1U Horizontal Cable Manager with Dual-Hinged Cover",
      vendor: "Panduit",
      msrp: 45,
      rackUnits: 1,
      ports: 0,
      role: "Structured Cabling",
      weightLbs: 2.0
    };
  } else if (type === "liu24") {
    itemData = {
      sku: "LIU-1U-24LC",
      model: "1U 24-Fiber (12-Port Duplex LC) Rack-Mount Fiber LIU Patch Enclosure",
      vendor: "Corning",
      msrp: 245,
      rackUnits: 1,
      ports: 12,
      role: "Structured Cabling",
      weightLbs: 6.5
    };
  } else if (type === "blank1u") {
    itemData = {
      sku: "PP-BLANK-1U",
      model: "1U Metal Snap-in Blank Filler Panel",
      vendor: "Panduit",
      msrp: 18,
      rackUnits: 1,
      ports: 0,
      role: "Structured Cabling",
      weightLbs: 1.0
    };
  }

  if (!itemData) return;

  const instanceId = `passive-${itemData.sku}-${Date.now()}`;
  const passiveSource = "rack_passive";
  const newItem = {
    instanceId: instanceId,
    source: passiveSource,
    id: itemData.sku,
    model: itemData.model,
    sku: itemData.sku,
    role: itemData.role,
    vendor: itemData.vendor,
    msrp: itemData.msrp,
    ports: itemData.ports,
    poeBudget: 0,
    baseWatts: 0,
    rackUnits: itemData.rackUnits,
    weightLbs: itemData.weightLbs,
    qty: 1,
    closetName: targetLoc,
    rackId: targetLoc,
    rackSlot: null,
    isPassive: true,
    deviceNumber: null,
    friendlyName: null,
    customFriendlyName: null
  };

  projectBOM.push(newItem);

  // Auto-mount into first free slot
  if (typeof mountItemToFirstAvailableSlot === "function") {
    mountItemToFirstAvailableSlot(instanceId);
  }

  if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
    FacilityStore.notifyWorkspaceChange();
  }
  renderRackVisualizer();
  if (typeof updateBOMView === "function") updateBOMView();
  if (typeof StorageService !== "undefined" && typeof StorageService.queueAutoSave === "function") {
    StorageService.queueAutoSave();
  }
  if (typeof showToast === "function") {
    showToast(`Added ${itemData.model} to ${parsed.space} • ${parsed.enclosure}`);
  }
}

// Window Compatibility Exports
if (typeof window !== "undefined") {
  window.isRackModalVisible = isRackModalVisible;
  window.toggleRackModal = toggleRackModal;
  window.switchActiveRackElevation = switchActiveRackElevation;
  window.renderRackVisualizer = renderRackVisualizer;
  window.renderRackLocationTransferBar = renderRackLocationTransferBar;
  window.handleLocationTransferDragOver = handleLocationTransferDragOver;
  window.handleLocationTransferDragLeave = handleLocationTransferDragLeave;
  window.handleLocationTransferDrop = handleLocationTransferDrop;
  window.handleRackItemDragStart = handleRackItemDragStart;
  window.handleRackSlotDragOver = handleRackSlotDragOver;
  window.handleRackSlotDrop = handleRackSlotDrop;
  window.handleBaySlotDrop = handleBaySlotDrop;
  window.handleDinRailDrop = handleDinRailDrop;
  window.handlePoleZoneDrop = handlePoleZoneDrop;
  window.handleBackboardQuadDrop = handleBackboardQuadDrop;
  window.unmountRackItem = unmountRackItem;
  window.autoMountAllToActiveRack = autoMountAllToActiveRack;
  window.unmountAllFromActiveRack = unmountAllFromActiveRack;
  window.promptCreateNewRack = promptCreateNewRack;
  window.deleteActiveRackElevation = deleteActiveRackElevation;
  window.setHostSidebarTab = setHostSidebarTab;
  window.updatePoleZoneHeight = updatePoleZoneHeight;
  window.renderRackUnassignedStagingDock = renderRackUnassignedStagingDock;
  window.renderHostStagingDrawer = renderHostStagingDrawer;
  window.mountItemToFirstAvailableSlot = mountItemToFirstAvailableSlot;
  window.addPassiveToActiveRack = addPassiveToActiveRack;
  window.toggleStackPatchPanel = toggleStackPatchPanel;
  window.toggleStackCableManager = toggleStackCableManager;
  window.toggleSwitchStandardPod = toggleSwitchStandardPod;
  window.toggleFiberFirewallCableManager = toggleFiberFirewallCableManager;
  window.applyStandardPodsToActiveRack = applyStandardPodsToActiveRack;
  window.isCopperSwitch = isCopperSwitch;
  window.isFiberSwitch = isFiberSwitch;
  window.isFirewallDevice = isFirewallDevice;
  window.isFiberOrFirewall = isFiberOrFirewall;
  window.getRackItemHeight = getRackItemHeight;
  window.updateSwitchStackFromRack = updateSwitchStackFromRack;
  window.isStackableSwitch = isStackableSwitch;
  window.calculateRackBumpDisplacements = calculateRackBumpDisplacements;
  window.isPassiveInfrastructure = isPassiveInfrastructure;
  window.toggleRackVerticalChannelsModal = toggleRackVerticalChannelsModal;
  window.closeRackVerticalChannelsModal = closeRackVerticalChannelsModal;
  window.openRackVerticalSlotPicker = openRackVerticalSlotPicker;
  window.applyRackVerticalPreset = applyRackVerticalPreset;
  window.getRackVerticalChannels = getRackVerticalChannels;
  window.setRackVerticalChannel = setRackVerticalChannel;
  window.setRackVerticalChannels = setRackVerticalChannels;
}
