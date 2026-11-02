// =========================================================================
// PHYSICAL LAYOUT ROUTING, CAMERA FOV, UNPLACED DEVICES & INSPECTOR ENGINE
// Separated from js/tools/physical_layout.js for modular maintainability
// =========================================================================

/**
 * Renders the SVG child elements of a Camera FOV & DORI cone group in-place.
 * Supports standard directional wedges (<360°), full 360° fisheye/multi-sensor domes,
 * and IEC 62676-4 concentric DORI Pixel Density Color Bands (Identification, Recognition, Observation, Detection).
 */
function renderCameraFovGroupContent(fovG, dev, bomItem, floor, isSelected) {
  if (!fovG || !dev) return;
  fovG.innerHTML = "";

  const telem = computeCameraDoriTelemetry(dev, bomItem, floor);
  const radiusPx = Math.max(28, telem.radiusPx);
  const angleDeg = dev.fovAngleDeg || 0;
  const apertureDeg = dev.fovApertureDeg || dev.fovSpanDeg || 90;
  const doriColor = telem.doriHex || telem.strokeColor || "#10b981";
  const bands = telem.doriBands || { identPx: Math.round(radiusPx * 0.35), recogPx: Math.round(radiusPx * 0.6), obsvPx: Math.round(radiusPx * 0.85), detPx: radiusPx };

  const rad = (deg) => (deg * Math.PI) / 180;

  // Helper to build a sector path for a given radius r
  const buildWedgePath = (r, startDeg, endDeg, span) => {
    const x1 = r * Math.cos(rad(startDeg));
    const y1 = r * Math.sin(rad(startDeg));
    const x2 = r * Math.cos(rad(endDeg));
    const y2 = r * Math.sin(rad(endDeg));
    const largeArc = span > 180 ? 1 : 0;
    return `M 0 0 L ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r.toFixed(1)} ${r.toFixed(1)} 0 ${largeArc} 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z`;
  };

  const doriZones = [
    { key: "det", maxR: radiusPx, color: "#f43f5e", opacity: isSelected ? "0.18" : "0.11" },
    { key: "obsv", maxR: Math.min(radiusPx, bands.obsvPx), color: "#f59e0b", opacity: isSelected ? "0.20" : "0.13" },
    { key: "recog", maxR: Math.min(radiusPx, bands.recogPx), color: "#0ea5e9", opacity: isSelected ? "0.22" : "0.15" },
    { key: "ident", maxR: Math.min(radiusPx, bands.identPx), color: "#10b981", opacity: isSelected ? "0.26" : "0.18" }
  ];

  if (apertureDeg >= 359) {
    // 360° Fisheye / Multi-Sensor Dome Coverage Circle
    if (showDoriColorBands) {
      doriZones.forEach((zone, idx) => {
        if (zone.maxR < 8) return;
        if (idx > 0 && zone.maxR >= doriZones[idx - 1].maxR) return;
        const bandCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        bandCircle.setAttribute("cx", "0");
        bandCircle.setAttribute("cy", "0");
        bandCircle.setAttribute("r", zone.maxR.toFixed(1));
        bandCircle.setAttribute("fill", zone.color);
        bandCircle.setAttribute("fill-opacity", zone.opacity);
        bandCircle.setAttribute("stroke", zone.color);
        bandCircle.setAttribute("stroke-width", idx === 0 ? (isSelected ? "2" : "1.25") : "1");
        bandCircle.setAttribute("stroke-dasharray", idx === 0 ? "6 4" : "3 3");
        bandCircle.style.pointerEvents = "none";
        fovG.appendChild(bandCircle);
      });
    } else {
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", "0");
      circle.setAttribute("cy", "0");
      circle.setAttribute("r", radiusPx);
      circle.setAttribute("fill", doriColor);
      circle.setAttribute("fill-opacity", isSelected ? "0.22" : "0.13");
      circle.setAttribute("stroke", doriColor);
      circle.setAttribute("stroke-width", isSelected ? "2" : "1.25");
      circle.setAttribute("stroke-dasharray", "6 4");
      circle.style.pointerEvents = "none";
      fovG.appendChild(circle);
    }

    // If Multi-Sensor / Quad camera, render 4 quadrant lens divider rays
    if (telem.isMultiSensor) {
      [0, 90, 180, 270].forEach(qOffset => {
        const rayDeg = angleDeg + qOffset + 45;
        const rx = radiusPx * Math.cos(rad(rayDeg));
        const ry = radiusPx * Math.sin(rad(rayDeg));
        const qLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
        qLine.setAttribute("x1", "0");
        qLine.setAttribute("y1", "0");
        qLine.setAttribute("x2", rx.toFixed(1));
        qLine.setAttribute("y2", ry.toFixed(1));
        qLine.setAttribute("stroke", doriColor);
        qLine.setAttribute("stroke-width", "1");
        qLine.setAttribute("stroke-dasharray", "3 3");
        qLine.setAttribute("opacity", "0.55");
        qLine.style.pointerEvents = "none";
        fovG.appendChild(qLine);
      });
    }
  } else {
    // Directional Wedge Sector (<360°)
    const startAngle = angleDeg - apertureDeg / 2;
    const endAngle = angleDeg + apertureDeg / 2;

    if (showDoriColorBands) {
      doriZones.forEach((zone, idx) => {
        if (zone.maxR < 8) return;
        if (idx > 0 && zone.maxR >= doriZones[idx - 1].maxR) return;
        const bandWedge = document.createElementNS("http://www.w3.org/2000/svg", "path");
        bandWedge.setAttribute("d", buildWedgePath(zone.maxR, startAngle, endAngle, apertureDeg));
        bandWedge.setAttribute("fill", zone.color);
        bandWedge.setAttribute("fill-opacity", zone.opacity);
        bandWedge.setAttribute("stroke", zone.color);
        bandWedge.setAttribute("stroke-width", idx === 0 ? (isSelected ? "2" : "1.35") : "1");
        if (idx > 0) bandWedge.setAttribute("stroke-dasharray", "3 3");
        bandWedge.style.pointerEvents = "none";
        fovG.appendChild(bandWedge);
      });
    } else {
      const wedge = document.createElementNS("http://www.w3.org/2000/svg", "path");
      wedge.setAttribute("d", buildWedgePath(radiusPx, startAngle, endAngle, apertureDeg));
      wedge.setAttribute("fill", doriColor);
      wedge.setAttribute("fill-opacity", isSelected ? "0.24" : "0.14");
      wedge.setAttribute("stroke", doriColor);
      wedge.setAttribute("stroke-width", isSelected ? "2" : "1.25");
      wedge.style.pointerEvents = "none";
      fovG.appendChild(wedge);
    }
  }

  // Center Aim Axis Ray & Interactive Aim/Range Handle
  const handleX = radiusPx * Math.cos(rad(angleDeg));
  const handleY = radiusPx * Math.sin(rad(angleDeg));

  const axisLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
  axisLine.setAttribute("x1", "0");
  axisLine.setAttribute("y1", "0");
  axisLine.setAttribute("x2", handleX.toFixed(1));
  axisLine.setAttribute("y2", handleY.toFixed(1));
  axisLine.setAttribute("stroke", doriColor);
  axisLine.setAttribute("stroke-width", "1.25");
  axisLine.setAttribute("stroke-dasharray", "4 3");
  axisLine.setAttribute("opacity", isSelected ? "0.9" : "0.55");
  axisLine.style.pointerEvents = "none";
  fovG.appendChild(axisLine);

  // Telemetry Pill along the outer arc
  const labelDist = Math.max(38, radiusPx * 0.68);
  const lx = labelDist * Math.cos(rad(angleDeg));
  const ly = labelDist * Math.sin(rad(angleDeg));
  const pillTextStr = `${telem.doriShort} ${telem.ppf} PPF • ${dev.fovDistanceFt}'`;
  const pillW = Math.max(98, pillTextStr.length * 5.8 + 14);
  const pillH = 16;

  const pillBg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  pillBg.setAttribute("x", (lx - pillW / 2).toFixed(1));
  pillBg.setAttribute("y", (ly - pillH / 2).toFixed(1));
  pillBg.setAttribute("width", pillW);
  pillBg.setAttribute("height", pillH);
  pillBg.setAttribute("rx", "6");
  pillBg.setAttribute("fill", "#0f172a");
  pillBg.setAttribute("fill-opacity", "0.9");
  pillBg.setAttribute("stroke", doriColor);
  pillBg.setAttribute("stroke-width", "1");
  pillBg.style.pointerEvents = "none";
  fovG.appendChild(pillBg);

  const pillTxt = document.createElementNS("http://www.w3.org/2000/svg", "text");
  pillTxt.setAttribute("x", lx.toFixed(1));
  pillTxt.setAttribute("y", (ly + 3.5).toFixed(1));
  pillTxt.setAttribute("text-anchor", "middle");
  pillTxt.setAttribute("fill", doriColor);
  pillTxt.setAttribute("font-size", "8.5");
  pillTxt.setAttribute("font-family", "monospace");
  pillTxt.setAttribute("font-weight", "bold");
  pillTxt.style.pointerEvents = "none";
  pillTxt.textContent = pillTextStr;
  fovG.appendChild(pillTxt);

  // Interactive Drag Handle at tip of FOV cone to aim & resize range
  const grip = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  grip.setAttribute("class", "draggable-fov-handle cursor-grab");
  grip.setAttribute("data-node-id", dev.id);
  grip.setAttribute("cx", handleX.toFixed(1));
  grip.setAttribute("cy", handleY.toFixed(1));
  grip.setAttribute("r", isSelected ? "7.5" : "6");
  grip.setAttribute("fill", doriColor);
  grip.setAttribute("stroke", "#ffffff");
  grip.setAttribute("stroke-width", "2");
  fovG.appendChild(grip);
}
window.renderCameraFovGroupContent = renderCameraFovGroupContent;

/**
 * Projects a point P onto segment A->B and returns the closest point and distance.
 */
function _projectPointToSegment(p, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return { x: a.x, y: a.y, t: 0, dist: Math.hypot(p.x - a.x, p.y - a.y) };
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = a.x + t * dx;
  const projY = a.y + t * dy;
  return { x: projX, y: projY, t, dist: Math.hypot(p.x - projX, p.y - projY) };
}

/**
 * Helper: Appends vertices along a single trunk between projA and projB.
 */
function _traceSingleTrunkVertices(trunk, projA, projB, pts, useOrtho) {
  const entryPt = { x: Math.round(projA.x), y: Math.round(projA.y) };
  const exitPt = { x: Math.round(projB.x), y: Math.round(projB.y) };
  const lastPt = pts[pts.length - 1];

  if (lastPt && Math.hypot(entryPt.x - lastPt.x, entryPt.y - lastPt.y) > 8) {
    if (useOrtho && entryPt.x !== lastPt.x && entryPt.y !== lastPt.y) {
      pts.push({ x: entryPt.x, y: lastPt.y });
    }
    pts.push(entryPt);
  }

  if (projA.posAlong <= projB.posAlong) {
    for (let k = projA.segIdx + 1; k <= projB.segIdx; k++) {
      pts.push({ x: trunk.points[k].x, y: trunk.points[k].y });
    }
  } else {
    for (let k = projA.segIdx; k > projB.segIdx; k--) {
      pts.push({ x: trunk.points[k].x, y: trunk.points[k].y });
    }
  }

  if (Math.hypot(exitPt.x - entryPt.x, exitPt.y - entryPt.y) > 6) {
    pts.push(exitPt);
  }
}

/**
 * Projects a point onto a trunk polyline and returns best segment projection.
 */
function _projectPointOntoTrunk(pt, trunk) {
  if (!trunk || !trunk.points || trunk.points.length < 2) return null;
  let best = null;
  for (let i = 0; i < trunk.points.length - 1; i++) {
    const a = trunk.points[i];
    const b = trunk.points[i + 1];
    const pr = _projectPointToSegment(pt, a, b);
    if (!best || pr.dist < best.dist) {
      best = { ...pr, segIdx: i, posAlong: i + pr.t };
    }
  }
  return best;
}

/**
 * Computes deterministic horizontal cable routing along drawn Pathway Trunks (including multi-trunk intersections).
 * Returns { points: Array<{x,y}>, traversedTrunks: Array<string> }
 */
function computePathwayTrunkRoute(closetPt, devPt, floorTrunks, useOrtho, forceSnap = false) {
  const traversedTrunks = [];
  const validTrunks = Array.isArray(floorTrunks) ? floorTrunks.filter(t => t.points && t.points.length >= 2) : [];

  if (validTrunks.length > 0) {
    const maxDevSnapDist = forceSnap ? 1400 : 380;
    const maxClosetSnapDist = forceSnap ? 1400 : 520;

    // 1. Check single-trunk routing first
    let bestTrunk = null;
    let bestDevProj = null;
    let bestClosetProj = null;
    let bestScore = Infinity;

    // Also track closest trunk to closet and closest trunk to device for 2-trunk bridge routing
    let closestTrunkToCloset = null;
    let closestClosetProj = null;
    let closestTrunkToDev = null;
    let closestDevProj = null;

    validTrunks.forEach(trunk => {
      const minDev = _projectPointOntoTrunk(devPt, trunk);
      const minCloset = _projectPointOntoTrunk(closetPt, trunk);

      if (minCloset && (!closestClosetProj || minCloset.dist < closestClosetProj.dist)) {
        closestClosetProj = minCloset;
        closestTrunkToCloset = trunk;
      }
      if (minDev && (!closestDevProj || minDev.dist < closestDevProj.dist)) {
        closestDevProj = minDev;
        closestTrunkToDev = trunk;
      }

      if (minDev && minCloset && minDev.dist <= maxDevSnapDist && minCloset.dist <= maxClosetSnapDist) {
        const score = minDev.dist + minCloset.dist * 0.65;
        if (score < bestScore) {
          bestScore = score;
          bestTrunk = trunk;
          bestDevProj = minDev;
          bestClosetProj = minCloset;
        }
      }
    });

    // 2. Check if a 2-trunk connected corridor route (Closet -> Trunk A -> Trunk B -> Device) is closer
    if (
      closestTrunkToCloset &&
      closestTrunkToDev &&
      closestTrunkToCloset.id !== closestTrunkToDev.id &&
      closestClosetProj.dist <= maxClosetSnapDist &&
      closestDevProj.dist <= maxDevSnapDist
    ) {
      // Find closest junction between Trunk A and Trunk B
      let bestJunctionA = null;
      let bestJunctionB = null;
      let minJunctionDist = Infinity;

      closestTrunkToCloset.points.forEach((ptA, idxA) => {
        const projB = _projectPointOntoTrunk(ptA, closestTrunkToDev);
        if (projB && projB.dist < minJunctionDist) {
          minJunctionDist = projB.dist;
          bestJunctionA = { x: ptA.x, y: ptA.y, segIdx: Math.min(idxA, closestTrunkToCloset.points.length - 2), posAlong: idxA, dist: 0 };
          bestJunctionB = projB;
        }
      });
      closestTrunkToDev.points.forEach((ptB, idxB) => {
        const projA = _projectPointOntoTrunk(ptB, closestTrunkToCloset);
        if (projA && projA.dist < minJunctionDist) {
          minJunctionDist = projA.dist;
          bestJunctionA = projA;
          bestJunctionB = { x: ptB.x, y: ptB.y, segIdx: Math.min(idxB, closestTrunkToDev.points.length - 2), posAlong: idxB, dist: 0 };
        }
      });

      const twoTrunkScore = closestDevProj.dist + closestClosetProj.dist * 0.65 + minJunctionDist;
      if (minJunctionDist <= 180 && twoTrunkScore < bestScore) {
        traversedTrunks.push(closestTrunkToCloset.id, closestTrunkToDev.id);
        const pts = [{ x: closetPt.x, y: closetPt.y }];
        _traceSingleTrunkVertices(closestTrunkToCloset, closestClosetProj, bestJunctionA, pts, useOrtho);
        _traceSingleTrunkVertices(closestTrunkToDev, bestJunctionB, closestDevProj, pts, useOrtho);
        const lastPt = pts[pts.length - 1];
        if (useOrtho && lastPt.x !== devPt.x && lastPt.y !== devPt.y) {
          pts.push({ x: devPt.x, y: lastPt.y });
        }
        pts.push({ x: devPt.x, y: devPt.y });
        return { points: pts, traversedTrunks };
      }
    }

    if (bestTrunk && bestDevProj && bestClosetProj) {
      traversedTrunks.push(bestTrunk.id);
      const pts = [{ x: closetPt.x, y: closetPt.y }];
      _traceSingleTrunkVertices(bestTrunk, bestClosetProj, bestDevProj, pts, useOrtho);
      const lastPt = pts[pts.length - 1];
      if (useOrtho && lastPt.x !== devPt.x && lastPt.y !== devPt.y) {
        pts.push({ x: devPt.x, y: lastPt.y });
      }
      pts.push({ x: devPt.x, y: devPt.y });
      return { points: pts, traversedTrunks };
    }
  }

  // Fallback: direct or 90° orthogonal path
  const pts = [{ x: closetPt.x, y: closetPt.y }];
  if (useOrtho) {
    pts.push({ x: devPt.x, y: closetPt.y });
  }
  pts.push({ x: devPt.x, y: devPt.y });
  return { points: pts, traversedTrunks };
}

/**
 * 1-Click Deterministic Pathway Snap: Snaps all drops on the active floor (or drops near a specific trunk)
 * onto the drawn Pathway Trunk corridors, clearing stray manual waypoints.
 */
function snapAllFloorCablesToTrunks() {
  const floor = getActiveFloor();
  if (!floor) return;
  if (!Array.isArray(floor.pathwayTrunks) || floor.pathwayTrunks.length === 0) {
    if (typeof showToast === "function") {
      showToast("Draw a Pathway Corridor [Press T] first to snap horizontal cables.", "warning");
    }
    return;
  }

  CanvasHistory.pushState("Snap Cables to Pathway Trunks");
  let snappedCount = 0;
  (floor.nodes || []).filter(n => n.type === "device").forEach(dev => {
    dev.waypoints = [];
    dev.snapToPathway = true;
    snappedCount++;
  });

  recalculateCurrentFloorCables();
  renderCableCanvas();
  renderInspector();
  renderSidebarTabContent();
  saveFacilityState(true);

  if (typeof showToast === "function") {
    showToast(`Snapped ${snappedCount} floor cable run${snappedCount === 1 ? "" : "s"} to Pathway Corridors & recalculated NEC fill.`, "success");
  }
}
window.snapAllFloorCablesToTrunks = snapAllFloorCablesToTrunks;

function recalculateCurrentFloorCables(skipSidebarRebuild = false) {
  const floor = getActiveFloor();
  const scaleInput = document.getElementById("cableScaleFt");
  const slackInput = document.getElementById("cableSlackFt");
  const slabInput = document.getElementById("cableSlabFt");

  if (floor) {
    if (scaleInput) floor.scaleFt = parseFloat(scaleInput.value) || 25;
    if (slackInput) floor.slackFt = parseFloat(slackInput.value) || 15;
    if (slabInput) floor.slabFt = parseFloat(slabInput.value) || 14;
    const scaleBadgeLabel = document.getElementById("physHeaderScaleLabel");
    if (scaleBadgeLabel) {
      scaleBadgeLabel.textContent = `Scale: 100px = ${floor.scaleFt || 25} ft`;
    }
  }

  const allClosets = getAllClosetsAcrossFacility();

  let globalFootage = 0;
  let globalDropsCount = 0;

  facilityFloors.forEach(fl => {
    const fPxToFt = (fl.scaleFt || 25) / 100;
    const fSlack = fl.slackFt || 15;
    const fSlab = fl.slabFt || 14;

    fl.nodes.filter(n => n.type === "device").forEach(dev => {
      globalDropsCount++;

      let closet = allClosets.find(c => c.id === dev.assignedClosetId);
      if (!closet && allClosets.length > 0) {
        closet = allClosets[0];
        dev.assignedClosetId = closet.id;
      }

      if (closet) {
        let horizontalPixelDist = 0;
        let pts = [];
        let traversedTrunks = [];

        if (dev.waypoints && dev.waypoints.length > 0) {
          pts = [{ x: closet.x, y: closet.y }];
          dev.waypoints.forEach(wp => pts.push(wp));
          pts.push({ x: dev.x, y: dev.y });
        } else {
          const routed = computePathwayTrunkRoute(
            { x: closet.x, y: closet.y },
            { x: dev.x, y: dev.y },
            fl.pathwayTrunks || [],
            useOrthogonalRouting,
            dev.snapToPathway === true
          );
          pts = routed.points;
          traversedTrunks = routed.traversedTrunks;
        }

        for (let i = 0; i < pts.length - 1; i++) {
          horizontalPixelDist += Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
        }

        const horizontalFt = Math.round(horizontalPixelDist * fPxToFt);
        const floorsTraversed = Math.abs((fl.levelIndex || 1) - (closet.floorLevel || 1));
        const interFloorRiserFt = floorsTraversed * fSlab;

        const totalRunFt = horizontalFt + fSlack + interFloorRiserFt;
        const totalRunMeters = Math.round(totalRunFt * 0.3048);

        dev.calculatedRun = {
          totalFt: totalRunFt,
          totalMeters: totalRunMeters,
          horizontalFt,
          slackFt: fSlack,
          riserFt: interFloorRiserFt,
          closetName: closet.name,
          closetFloorName: closet.floorName,
          isExceeded: totalRunMeters > 90,
          points: pts,
          traversedTrunks
        };

        globalFootage += totalRunFt;
      }
    });

    (fl.fiberBackbones || []).forEach(fb => {
      const c1 = fl.nodes.find(n => n.id === fb.fromId);
      const c2 = fl.nodes.find(n => n.id === fb.toId);
      if (c1 && c2) {
        fb.fromClosetName = c1.name;
        fb.toClosetName = c2.name;
        const pxDist = Math.hypot(c2.x - c1.x, c2.y - c1.y);
        const slack = (typeof fb.slackFt === "number") ? fb.slackFt : (fSlack * 2);
        fb.measuredFt = Math.round(pxDist * fPxToFt);
        fb.totalFt = fb.measuredFt + slack;
      }
    });
  });

  const spoolBoxes = Math.ceil(globalFootage / 1000);
  const footageEl = document.getElementById("cableTotalFootage");
  const spoolEl = document.getElementById("cableSpoolCount");
  const countActiveEl = document.getElementById("countActiveDrops");
  const totalDropsEl = document.getElementById("cableTotalDrops");
  const patchPanelsEl = document.getElementById("cablePatchPanels");

  if (footageEl) footageEl.innerText = `${globalFootage.toLocaleString()} ft`;
  if (spoolEl) spoolEl.innerText = `${spoolBoxes} Box${spoolBoxes === 1 ? '' : 'es'}`;
  if (countActiveEl && floor) countActiveEl.innerText = floor.nodes.filter(n => n.type === 'device').length;
  if (totalDropsEl) totalDropsEl.innerText = `${globalDropsCount} Drop${globalDropsCount === 1 ? '' : 's'}`;
  if (patchPanelsEl) {
    const panelsNeeded = Math.ceil(globalDropsCount / 24);
    patchPanelsEl.innerText = `${panelsNeeded} Panel${panelsNeeded === 1 ? '' : 's'} (${panelsNeeded * 24}P)`;
  }

  if (!skipSidebarRebuild) {
    renderSidebarTabContent();
  }
}

// -----------------------------------------------------------
// Sidebar Tabs & Unplaced Devices Tray
// -----------------------------------------------------------
function switchSidebarTab(tab) {
  activeSidebarTab = tab;
  const btnRuns = document.getElementById("tab-btn-runs");
  const btnUnplaced = document.getElementById("tab-btn-unplaced");

  if (tab === "runs") {
    btnRuns.className = "flex-1 py-1.5 text-center font-bold text-white border-b-2 border-brand-500";
    btnUnplaced.className = "flex-1 py-1.5 text-center font-bold text-slate-400 hover:text-white border-b-2 border-transparent";
  } else {
    btnUnplaced.className = "flex-1 py-1.5 text-center font-bold text-white border-b-2 border-brand-500";
    btnRuns.className = "flex-1 py-1.5 text-center font-bold text-slate-400 hover:text-white border-b-2 border-transparent";
  }
  renderSidebarTabContent();
}

// -----------------------------------------------------------
// Field Device Classifier for Physical Floor Drops
// -----------------------------------------------------------
function isFieldDeviceForPhysicalLayout(item) {
  if (!item || item.parentInstanceId) return false;
  if (item.isEnclosureFrame || item.isPassive) return false;
  if (typeof DeviceTaxonomy !== "undefined") {
    if (typeof DeviceTaxonomy.isPassiveOrHostInfrastructure === "function" && DeviceTaxonomy.isPassiveOrHostInfrastructure(item)) return false;
    if (typeof DeviceTaxonomy.isPowerDistributionOrBackup === "function" && DeviceTaxonomy.isPowerDistributionOrBackup(item)) return false;
  }

  // Structured Cabling spools, licenses, accessories, optics, cords, pathways, mounts do not get placed as camera/door drops
  if (item.role === "Structured Cabling" || item.role === "Optics & DAC") return false;
  if (item.role === "Mgmt License" || item.role === "Security License" || item.role === "Feature License") return false;
  if (item.role === "Accessory" || item.role === "Power Jumper Cable" || item.role === "Pathways & J-Hooks" || item.role === "Mounting Hardware") return false;

  // Infrastructure that lives inside racks / enclosures or IS a rack / enclosure
  const infraRoles = [
    "Access", "Core", "Core & Agg", "Aggregation", "Gateways & WAN", "Security WAN", "Firewall",
    "Server", "VMS Server", "Compute & Storage", "Storage Drives & SAN",
    "Rack UPS Power", "UPS", "Rackmount PDU", "PDU",
    "Equipment Rack", "19\" Equipment Racks", "Cabinets & Enclosures",
    "Security Cabinet", "Industrial NEMA Enclosure", "Architectural Backboard",
    "Enclosure", "Patch Panel"
  ];
  if (infraRoles.includes(item.role)) return false;

  const cat = (item.category || "").toLowerCase();
  const role = (item.role || "").toLowerCase();

  if (cat.includes("switch") || cat.includes("server") || cat.includes("storage") || 
      cat.includes("ups") || cat.includes("pdu") || cat.includes("rack") || 
      cat.includes("enclosure") || cat.includes("cabinet") || cat.includes("power_cord") ||
      cat.includes("pathway") || cat.includes("mounting") || cat.includes("passive")) {
    return false;
  }
  if (role.includes("switch") || role.includes("server") || role.includes("storage") || 
      role.includes("ups") || role.includes("pdu") || role.includes("gateway") ||
      role.includes("rack") || role.includes("enclosure") || role.includes("cabinet") ||
      role.includes("backboard")) {
    return false;
  }

  // Edge / Field devices that get placed on physical blueprints
  const isEdge = role.includes("camera") || role.includes("access") || role.includes("door") || 
                 role.includes("wireless") || role.includes("radio") || role.includes("intercom") ||
                 role.includes("sensor") || role.includes("drop") ||
                 cat.includes("camera") || cat.includes("access") || cat.includes("wireless") ||
                 cat.includes("door") || cat.includes("sensor") || cat.includes("intercom") ||
                 cat.includes("ptp") || cat.includes("endpoint");

  return isEdge || item.isFieldDevice === true;
}

function getUnplacedDevicesCount() {
  const placedInstanceIds = new Set();
  facilityFloors.forEach(fl => {
    (fl.nodes || []).forEach(n => {
      if (n.instanceId) placedInstanceIds.add(n.instanceId);
      if (n.id && n.id.startsWith("dev-")) placedInstanceIds.add(n.id.replace("dev-", ""));
      if (n.id) placedInstanceIds.add(n.id);
    });
  });

  const unplacedBOM = (typeof projectBOM !== "undefined" ? projectBOM : []).filter(item => {
    if (typeof isFieldDeviceForPhysicalLayout === "function") {
      if (!isFieldDeviceForPhysicalLayout(item)) return false;
    }
    return !placedInstanceIds.has(item.instanceId);
  });

  return unplacedBOM.length;
}

function updateUnplacedCountBadge() {
  const countBadge = document.getElementById("btnPlaceUnplacedCount");
  if (!countBadge) return;
  const count = getUnplacedDevicesCount();
  countBadge.textContent = count;
}

function renderSidebarTabContent() {
  updateUnplacedCountBadge();
  const container = document.getElementById("sidebarTabContent");
  if (!container) return;

  const floor = getActiveFloor();
  if (!floor) {
    container.innerHTML = `
      <div class="py-12 px-4 text-center text-slate-500 text-xs">
        <i data-lucide="layers" class="w-8 h-8 mx-auto mb-2 text-slate-600 opacity-50"></i>
        <p class="font-medium text-slate-400">No Floor/Building Active</p>
        <p class="mt-1 text-[11px] text-slate-500">Create or select a floor/building to view runs, paths, and closets.</p>
        <button onclick="promptAddNewFloor()" class="mt-3 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-medium text-[11px] inline-flex items-center gap-1.5 transition-colors cursor-pointer">
          <i data-lucide="plus" class="w-3.5 h-3.5"></i> Add First Floor/Building
        </button>
      </div>`;
    if (window.lucide) lucide.createIcons();
    return;
  }

  if (activeSidebarTab === "runs") {
    const allDrops = floor.nodes.filter(n => n.type === "device");
    const drops = allDrops.filter(dev => {
      const bomItem = (typeof projectBOM !== "undefined" && dev.instanceId) ? projectBOM.find(i => i.instanceId === dev.instanceId) : null;
      const layerType = getDeviceLayerType(bomItem || dev);
      return physicalLayerFilters[layerType] !== false;
    });

    const countDropsEl = document.getElementById("countActiveDrops");
    if (countDropsEl) {
      countDropsEl.innerText = drops.length === allDrops.length ? drops.length : `${drops.length}/${allDrops.length}`;
    }

    const fiberLinks = floor.fiberBackbones || [];
    let fiberSectionHtml = "";
    if (fiberLinks.length > 0) {
      fiberSectionHtml = `
        <div class="mb-3 space-y-1.5">
          <div class="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 px-0.5">
            <span>Inter-Closet Fiber Links (${fiberLinks.length})</span>
            <span class="text-cyan-400 font-mono text-[9px]">Optical Trunks</span>
          </div>
          <div class="space-y-1.5">
            ${fiberLinks.map(fb => {
              const c1 = floor.nodes.find(n => n.id === fb.fromId);
              const c2 = floor.nodes.find(n => n.id === fb.toId);
              const fromName = c1 ? c1.name : (fb.fromClosetName || "MDF");
              const toName = c2 ? c2.name : (fb.toClosetName || "IDF");
              const isSMF = (fb.fiberType === "smf");
              const isSel = (fb.id === selectedFiberBackboneId);
              return `
                <div onclick="selectFiberBackbone('${fb.id}')" class="bg-slate-950 p-2.5 rounded-xl border ${isSel ? (isSMF ? 'border-amber-500 bg-amber-500/10' : 'border-cyan-500 bg-cyan-500/10') : 'border-slate-800'} text-xs space-y-1 cursor-pointer hover:border-slate-700 transition-all">
                  <div class="flex items-center justify-between">
                    <span class="font-bold text-white flex items-center gap-1.5 truncate">
                      <span class="px-1.5 py-0.5 rounded text-[9px] font-bold ${isSMF ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'}">${isSMF ? 'OS2 SMF' : 'OM4 MMF'}</span>
                      <span class="truncate">${escapeHTML(fromName)} &harr; ${escapeHTML(toName)}</span>
                    </span>
                    <div class="flex items-center gap-2 shrink-0">
                      <span class="font-mono font-bold ${isSMF ? 'text-amber-300' : 'text-cyan-300'}">${fb.totalFt || 100} ft</span>
                      <button type="button" onclick="deleteFiberBackbone('${fb.id}', event)" title="Delete Fiber Backbone" class="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-950/60 border border-transparent hover:border-rose-800/60 transition-colors cursor-pointer">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                      </button>
                    </div>
                  </div>
                  <div class="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>${fb.strandCount || 12}-Strand &bull; ${(fb.rating || 'plenum').toUpperCase()}</span>
                    <span>${(fb.connectorType || 'lc').toUpperCase()} Duplex</span>
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        </div>
      `;
    }

    if (drops.length === 0 && fiberLinks.length === 0) {
      container.innerHTML = `<div class="py-12 text-center text-slate-500 text-xs"><p>${allDrops.length === 0 ? 'No drops or fiber links on this level.' : 'No drops match the active layer filters.'}</p></div>`;
      return;
    }

    const dropsHtml = (drops.length === 0) ? '' : `
      <div class="space-y-1.5">
        ${fiberLinks.length > 0 ? `
          <div class="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 px-0.5 pt-1">
            <span>Horizontal Station Drops (${drops.length})</span>
            <span class="text-amber-400 font-mono text-[9px]">Copper</span>
          </div>
        ` : ''}
        ${drops.map(dev => {
          const run = dev.calculatedRun || { totalFt: 0, closetName: 'Unassigned', isExceeded: false };
          return `
            <div onclick="selectNode('${dev.id}')" class="bg-slate-950 p-2.5 rounded-xl border ${dev.id === selectedNodeId ? 'border-brand-500 bg-brand-500/10' : run.isExceeded ? 'border-rose-500/60 bg-rose-950/20' : 'border-slate-800'} text-xs space-y-1 cursor-pointer hover:border-slate-700 transition-all">
              <div class="flex items-center justify-between">
                <span class="font-bold text-white flex items-center gap-1.5 truncate">
                  ${(() => {
                    const bomItem = (typeof projectBOM !== "undefined" && dev.instanceId) ? projectBOM.find(i => i.instanceId === dev.instanceId) : null;
                    const devNum = (bomItem && bomItem.deviceNumber) ? `<span class="px-1 py-0.2 rounded bg-brand-900/60 border border-brand-500/40 text-[8.5px] font-mono font-bold text-brand-300">${escapeHTML(bomItem.deviceNumber)}</span>` : '';
                    return `${devNum}<span>${escapeHTML(dev.name)}</span>`;
                  })()}
                </span>
                <span class="font-mono font-bold shrink-0 ${run.isExceeded ? 'text-rose-400' : 'text-amber-300'}">
                  ${run.totalFt} ft (${run.totalMeters}m)
                </span>
              </div>
              <div class="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>To: ${escapeHTML(run.closetName)}</span>
                <span>${(dev.waypoints || []).length} Bends</span>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `;

    container.innerHTML = fiberSectionHtml + dropsHtml;
  } else {
    // Unplaced devices: edge/field hardware in quote not currently placed on canvas
    // Devices in racks/enclosures (switches, servers, storage, UPS, PDU) already live inside their enclosures
    const placedInstanceIds = new Set();
    facilityFloors.forEach(fl => {
      (fl.nodes || []).forEach(n => {
        if (n.instanceId) placedInstanceIds.add(n.instanceId);
        if (n.id && n.id.startsWith("dev-")) placedInstanceIds.add(n.id.replace("dev-", ""));
        if (n.id) placedInstanceIds.add(n.id);
      });
    });

    const unplacedBOM = (typeof projectBOM !== "undefined" ? projectBOM : []).filter(item => {
      if (!isFieldDeviceForPhysicalLayout(item)) return false;
      const isPlaced = placedInstanceIds.has(item.instanceId);
      if (isPlaced) return false;
      const layerType = getDeviceLayerType(item);
      return physicalLayerFilters[layerType] !== false;
    });

    const countUnplacedEl = document.getElementById("countUnplacedDevices");
    if (countUnplacedEl) countUnplacedEl.innerText = unplacedBOM.length;

    if (unplacedBOM.length === 0) {
      container.innerHTML = `<div class="py-8 text-center text-slate-500 text-xs"><p>No unplaced field hardware matching active filters.</p></div>`;
      return;
    }

    const unplacedThisLocation = getUnplacedDevicesForFloor(floor);
    const countThisLocation = unplacedThisLocation.length;

    container.innerHTML = `
      <div class="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 shrink-0">
        <div>
          <span class="text-[11px] font-bold text-slate-300">Level: ${escapeHTML(floor.name)}</span>
          <span class="text-[10px] text-slate-500 block">${countThisLocation} for this location (${unplacedBOM.length} total)</span>
        </div>
        ${countThisLocation > 0 ? `
          <button onclick="placeAllUnplacedOnActiveFloor()" class="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[10px] font-bold shadow flex items-center gap-1 transition-colors cursor-pointer" title="Place all ${countThisLocation} unplaced devices for this location">
            <i data-lucide="layout-grid" class="w-3 h-3"></i> Place All (${countThisLocation})
          </button>
        ` : ''}
      </div>
    ` + unplacedBOM.map(item => {
      const rawLoc = item.closetName || item.rackId;
      const isUnassigned = FacilityStore.normalize(rawLoc) === FacilityStore.UNASSIGNED;
      const mount = (item.mountMethod || "wall").toUpperCase();

      return `
        <div class="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs space-y-1 hover:border-slate-700 transition-colors">
          <div class="min-w-0 pr-2">
            <div class="flex items-center gap-1.5 flex-wrap">
              ${item.deviceNumber ? `<span class="px-1.5 py-0.2 rounded bg-brand-900/60 border border-brand-500/40 text-[9px] font-mono font-bold text-brand-300">${escapeHTML(item.deviceNumber)}</span>` : ''}
              <span class="font-bold text-white truncate max-w-[160px]" title="${escapeHTML(item.friendlyName || item.model)}">${escapeHTML(item.friendlyName || item.model)}</span>
              <button type="button" onclick="event.stopPropagation(); promptEditDeviceFriendlyName('${item.instanceId}')" class="text-slate-400 hover:text-white p-0.5 rounded hover:bg-slate-800 transition-colors" title="Edit Friendly Name">
                <i data-lucide="pencil" class="w-2.5 h-2.5"></i>
              </button>
            </div>
            ${item.friendlyName && item.friendlyName !== item.model ? `<span class="text-[10px] text-slate-300 font-medium block truncate max-w-[160px]">${escapeHTML(item.model)}</span>` : ''}
            <div class="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span class="text-[9px] font-mono px-1 py-0.2 rounded font-bold ${isUnassigned ? 'bg-amber-950/80 border border-amber-800/80 text-amber-300' : 'bg-indigo-950/80 border border-indigo-800/80 text-indigo-300'}">
                ${isUnassigned ? 'Unassigned' : escapeHTML(item.closetName)}
              </span>
              <span class="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-900 border border-slate-800 text-slate-300">
                ${mount}
              </span>
              <span class="text-[10px] text-slate-400 font-mono">${escapeHTML(item.role || 'Hardware')} &bull; ${item.consumedPoEWatts || item.baseWatts || 0}W</span>
            </div>
          </div>
          <button onclick="placeBomItemOnFloor('${item.instanceId}')" class="px-2.5 py-1 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-[10px] font-bold shadow shrink-0 flex items-center gap-1 transition-colors cursor-pointer">
            <i data-lucide="plus" class="w-3 h-3"></i> Place
          </button>
        </div>
      `;
    }).join("");
  }

  if (window.lucide) lucide.createIcons();
}

function findNextAvailableGridSpot(floor, startIndex = 0) {
  const cols = 12;
  const startX = 350;
  const startY = 420;
  const stepX = 180;
  const stepY = 140;

  let index = startIndex;
  while (index < 600) {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = startX + (col * stepX);
    const y = startY + (row * stepY);

    const collides = (floor.nodes || []).some(n => {
      const dx = n.x - x;
      const dy = n.y - y;
      return (dx * dx + dy * dy) < (65 * 65);
    });

    if (!collides) {
      return { x, y, nextIndex: index + 1 };
    }
    index++;
  }
  return { x: startX + (index % cols) * stepX, y: startY + Math.floor(index / cols) * stepY, nextIndex: index + 1 };
}

function getUnplacedDevicesForFloor(floor) {
  if (!floor) floor = getActiveFloor();
  if (!floor) return [];

  const placedInstanceIds = new Set();
  facilityFloors.forEach(fl => {
    (fl.nodes || []).forEach(n => {
      if (n.instanceId) placedInstanceIds.add(n.instanceId);
      if (n.id && n.id.startsWith("dev-")) placedInstanceIds.add(n.id.replace("dev-", ""));
      if (n.id) placedInstanceIds.add(n.id);
    });
  });

  const allUnplaced = (typeof projectBOM !== "undefined" ? projectBOM : []).filter(item => {
    if (!isFieldDeviceForPhysicalLayout(item)) return false;
    return !placedInstanceIds.has(item.instanceId);
  });

  if (allUnplaced.length === 0) return [];

  // Gather identifiers for this floor
  const spacesThisFloor = (typeof FacilityStore !== "undefined" && typeof FacilityStore.getSpaces === "function")
    ? FacilityStore.getSpaces().filter(s => s.floorId === floor.id)
    : [];
  const spaceIdsThisFloor = new Set(spacesThisFloor.map(s => s.id));
  const spaceNamesThisFloor = new Set(spacesThisFloor.map(s => s.name.toLowerCase()));

  const encsThisFloor = (typeof FacilityStore !== "undefined" && typeof FacilityStore.getEnclosures === "function")
    ? FacilityStore.getEnclosures().filter(e => spaceIdsThisFloor.has(e.spaceId))
    : [];
  const encNamesThisFloor = new Set(encsThisFloor.map(e => e.name.toLowerCase()));

  const allClosets = getAllClosetsAcrossFacility();
  const closetsThisFloor = allClosets.filter(c => c.floorId === floor.id);
  const closetNamesThisFloor = new Set(closetsThisFloor.map(c => c.name.toLowerCase()));

  // Other floors
  const otherFloors = facilityFloors.filter(f => f.id !== floor.id);
  const otherFloorNames = otherFloors.map(f => f.name.toLowerCase());
  const floorNameLower = (floor.name || "").toLowerCase();

  function belongsToThisFloor(item) {
    if (item.floorId && item.floorId === floor.id) return true;
    if (item.floor && item.floor.toLowerCase() === floorNameLower) return true;

    const loc = (item.closetName || item.rackId || "").trim();
    if (!loc || loc === FacilityStore.UNASSIGNED) return false;
    const locLower = loc.toLowerCase();

    // Check if explicitly on another floor
    for (const ofn of otherFloorNames) {
      if (locLower === ofn || locLower.startsWith(ofn + " •") || locLower.startsWith(ofn + " -") || locLower.startsWith(ofn + " ")) {
        return false;
      }
    }

    // Check if on this floor
    if (locLower === floorNameLower || locLower.startsWith(floorNameLower + " •") || locLower.startsWith(floorNameLower + " -") || locLower.startsWith(floorNameLower + " ")) {
      return true;
    }

    // Check space, enclosure, or closet name
    const parts = locLower.split("•").map(p => p.trim());
    for (const p of parts) {
      if (spaceNamesThisFloor.has(p) || encNamesThisFloor.has(p) || closetNamesThisFloor.has(p)) {
        return true;
      }
    }

    return false;
  }

  function belongsToOtherFloor(item) {
    if (item.floorId && item.floorId !== floor.id) return true;
    const loc = (item.closetName || item.rackId || "").trim();
    if (!loc || loc === FacilityStore.UNASSIGNED) return false;
    const locLower = loc.toLowerCase();

    for (const ofn of otherFloorNames) {
      if (locLower === ofn || locLower.startsWith(ofn + " •") || locLower.startsWith(ofn + " -") || locLower.startsWith(ofn + " ")) {
        return true;
      }
    }
    return false;
  }

  // 1. If items explicitly match this floor, return those
  const thisFloorMatches = allUnplaced.filter(item => belongsToThisFloor(item));
  if (thisFloorMatches.length > 0) {
    return thisFloorMatches;
  }

  // 2. If no items explicitly belong to this floor, include items not explicitly assigned to another floor (unassigned)
  return allUnplaced.filter(item => !belongsToOtherFloor(item));
}

function placeAllUnplacedOnActiveFloor() {
  const floor = getActiveFloor();
  if (!floor) {
    if (typeof showToast === "function") showToast("No active floor found to place devices.", "warning");
    return;
  }

  const unplacedForFloor = getUnplacedDevicesForFloor(floor);
  if (!unplacedForFloor || unplacedForFloor.length === 0) {
    if (typeof showToast === "function") {
      showToast(`No unplaced field devices found for ${floor.name}.`, "info");
    }
    return;
  }

  const allClosets = getAllClosetsAcrossFacility();
  let nextGridIndex = (floor.nodes || []).filter(n => n.type === "device").length;
  let placedCount = 0;
  let didUpdateWorkspace = false;

  unplacedForFloor.forEach(item => {
    // Find matching closet on this floor if item already has a location assigned
    let matchingCloset = null;
    if (item.closetName && item.closetName !== FacilityStore.UNASSIGNED) {
      matchingCloset = allClosets.find(c => c.name === item.closetName && c.floorId === floor.id);
      if (!matchingCloset) {
        const prefix = item.closetName.split("•")[0].trim();
        matchingCloset = allClosets.find(c => (c.name === prefix || item.closetName.startsWith(c.name)) && c.floorId === floor.id);
      }
      if (!matchingCloset) {
        matchingCloset = allClosets.find(c => c.name === item.closetName);
      }
    }
    if (!matchingCloset) {
      matchingCloset = allClosets.find(c => c.floorId === floor.id) || allClosets[0] || null;
    }

    const spot = findNextAvailableGridSpot(floor, nextGridIndex);
    nextGridIndex = spot.nextIndex;

    const newDrop = {
      id: `dev-${item.instanceId}`,
      instanceId: item.instanceId,
      name: item.friendlyName || item.model,
      deviceNumber: item.deviceNumber,
      type: "device",
      floorId: floor.id,
      x: spot.x,
      y: spot.y,
      assignedClosetId: matchingCloset ? matchingCloset.id : null,
      mountMethod: item.mountMethod || "wall",
      waypoints: []
    };

    floor.nodes.push(newDrop);
    placedCount++;

    // If item was unassigned or in virtual field, assign it to the matching closet's location
    const curLoc = (item.closetName || "").toLowerCase().trim();
    const isFieldOrUnassigned = !item.closetName || curLoc === "unassigned" || curLoc === "field" || curLoc.endsWith("• field") || curLoc.endsWith("-field");
    if (isFieldOrUnassigned && matchingCloset) {
      item.closetName = matchingCloset.name;
      item.rackId = matchingCloset.name;
      didUpdateWorkspace = true;
      if (typeof autoSelectMountingForHost === "function") {
        autoSelectMountingForHost(item, matchingCloset.name);
      }
    }
    if (newDrop.mountMethod === "pole" && typeof autoSelectMountingForHost === "function") {
      autoSelectMountingForHost(item, "Pole Assembly", "structural_mount");
    }
    // Auto-home field device to the access switch in the matching closet
    if (typeof PortEngine !== "undefined" && matchingCloset) {
      PortEngine.autoAssignDeviceToClosetSwitch(item, matchingCloset.name);
      didUpdateWorkspace = true;
    }
  });

  if (didUpdateWorkspace) {
    FacilityStore.notifyWorkspaceChange();
  }

  selectedNodeId = null;
  recalculateCurrentFloorCables();
  renderCableCanvas();
  renderInspector();
  renderSidebarTabContent();
  switchSidebarTab("runs");
  saveFacilityState();

  if (typeof showToast === "function") {
    showToast(`Successfully placed ${placedCount} devices onto ${floor.name}!`);
  }
}

function placeBomItemOnFloor(instanceId) {
  const item = projectBOM.find(i => i.instanceId === instanceId);
  if (!item) return;

  const floor = getActiveFloor();
  if (!floor) {
    if (typeof showToast === "function") showToast("Please add or select a floor/building before placing devices.", "warning");
    return;
  }
  const allClosets = getAllClosetsAcrossFacility();

  // Find matching closet on this floor if item already has a location assigned
  let matchingCloset = null;
  if (item.closetName && item.closetName !== FacilityStore.UNASSIGNED) {
    matchingCloset = allClosets.find(c => c.name === item.closetName && c.floorId === floor.id);
    if (!matchingCloset) {
      const prefix = item.closetName.split("•")[0].trim();
      matchingCloset = allClosets.find(c => (c.name === prefix || item.closetName.startsWith(c.name)) && c.floorId === floor.id);
    }
    if (!matchingCloset) {
      matchingCloset = allClosets.find(c => c.name === item.closetName);
    }
  }
  if (!matchingCloset) {
    matchingCloset = allClosets.find(c => c.floorId === floor.id) || allClosets[0] || null;
  }

  const spot = findNextAvailableGridSpot(floor);

  const newDrop = {
    id: `dev-${item.instanceId}`,
    instanceId: item.instanceId,
    name: item.friendlyName || item.model,
    deviceNumber: item.deviceNumber,
    type: "device",
    floorId: floor.id,
    x: spot.x,
    y: spot.y,
    assignedClosetId: matchingCloset ? matchingCloset.id : null,
    mountMethod: item.mountMethod || "wall",
    waypoints: []
  };

  floor.nodes.push(newDrop);
  selectedNodeId = newDrop.id;

  // If item was unassigned or in virtual field, assign it to the matching closet's location
  const curLocSingle = (item.closetName || "").toLowerCase().trim();
  const isFieldOrUnassignedSingle = !item.closetName || curLocSingle === "unassigned" || curLocSingle === "field" || curLocSingle.endsWith("• field") || curLocSingle.endsWith("-field");
  if (isFieldOrUnassignedSingle && matchingCloset) {
    item.closetName = matchingCloset.name;
    item.rackId = matchingCloset.name;
    if (typeof autoSelectMountingForHost === "function") {
      autoSelectMountingForHost(item, matchingCloset.name);
    }
    FacilityStore.notifyWorkspaceChange();
  }
  if (newDrop.mountMethod === "pole" && typeof autoSelectMountingForHost === "function") {
    autoSelectMountingForHost(item, "Pole Assembly", "structural_mount");
  }
  // Auto-home field device to the access switch in the matching closet
  if (typeof PortEngine !== "undefined" && matchingCloset) {
    PortEngine.autoAssignDeviceToClosetSwitch(item, matchingCloset.name);
    FacilityStore.notifyWorkspaceChange();
  }

  recalculateCurrentFloorCables();
  renderCableCanvas();
  renderInspector();
  renderSidebarTabContent();
  switchSidebarTab("runs");
  saveFacilityState();
  if (typeof showToast === "function") {
    showToast(`Placed ${item.model} on ${floor.name}`);
  }
}

// -----------------------------------------------------------
// Inspector & Physical-Only Cabinet Peek
// -----------------------------------------------------------
function selectNode(id) {
  selectedNodeId = id;
  selectedFiberBackboneId = null;
  renderInspector();
  renderCableCanvas();
  renderSidebarTabContent();
}

function deselectNode() {
  selectedNodeId = null;
  renderInspector();
  renderCableCanvas();
  renderSidebarTabContent();
}

function isClosetMatch(nameA, nameB) {
  if (!nameA || !nameB) return false;
  const normA = (typeof FacilityStore !== "undefined" ? FacilityStore.normalize(nameA) : String(nameA)).trim().toLowerCase();
  const normB = (typeof FacilityStore !== "undefined" ? FacilityStore.normalize(nameB) : String(nameB)).trim().toLowerCase();
  if (normA === normB) return true;

  // Compare clean full strings
  const cleanFullA = normA.replace(/[^a-z0-9]/g, "");
  const cleanFullB = normB.replace(/[^a-z0-9]/g, "");
  if (cleanFullA && cleanFullB && cleanFullA === cleanFullB) return true;

  // Compare space names (before the " • ")
  const spaceA = normA.split(" • ")[0].trim();
  const spaceB = normB.split(" • ")[0].trim();
  const cleanSpaceA = spaceA.replace(/[^a-z0-9]/g, "");
  const cleanSpaceB = spaceB.replace(/[^a-z0-9]/g, "");
  if (cleanSpaceA && cleanSpaceB && cleanSpaceA === cleanSpaceB) return true;

  return false;
}

function getInterClosetConnections() {
  const pairMap = new Map();

  // 1. Try topologyLinks if available
  let tLinks = (typeof topologyLinks !== "undefined" && Array.isArray(topologyLinks)) ? topologyLinks : [];
  if (tLinks.length === 0 && typeof generateTopologyLinks === "function" && typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) {
    generateTopologyLinks(projectBOM.filter(i => !i.parentInstanceId));
    tLinks = (typeof topologyLinks !== "undefined" && Array.isArray(topologyLinks)) ? topologyLinks : [];
  }

  const overrides = (typeof getLinkInterconnectOverrides === "function") 
    ? getLinkInterconnectOverrides() 
    : ((typeof linkInterconnectOverrides !== "undefined") ? linkInterconnectOverrides : {});

  const projFiber = (typeof getProjectFiberType === "function") ? getProjectFiberType() : "mmf";

  if (tLinks.length > 0 && typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) {
    tLinks.forEach(link => {
      if (link.isWireless) return;
      if (link.isPoEDelivery) return;

      const nodeA = projectBOM.find(i => i.instanceId === link.fromId);
      const nodeB = projectBOM.find(i => i.instanceId === link.toId);
      if (!nodeA || !nodeB) return;

      const locA = (typeof FacilityStore !== "undefined") ? FacilityStore.normalize(nodeA.closetName || nodeA.rackId || "MDF") : (nodeA.closetName || "MDF");
      const locB = (typeof FacilityStore !== "undefined") ? FacilityStore.normalize(nodeB.closetName || nodeB.rackId || "MDF") : (nodeB.closetName || "MDF");

      if (locA === locB) return;
      if (locA.endsWith("• Field") || locB.endsWith("• Field")) return;
      if (typeof FacilityStore !== "undefined" && (locA === FacilityStore.UNASSIGNED || locB === FacilityStore.UNASSIGNED)) return;

      const normA = locA.trim().toLowerCase();
      const normB = locB.trim().toLowerCase();
      const pairKey = [normA.replace(/[^a-z0-9]/g, ""), normB.replace(/[^a-z0-9]/g, "")].sort().join("___");

      const override = overrides[link.id] || {};
      let fiberType = projFiber;
      if (override.fiberType && override.fiberType !== "auto") {
        fiberType = override.fiberType;
      } else if (override.medium && (override.medium === "smf" || override.medium === "mmf")) {
        fiberType = override.medium;
      }

      if (!pairMap.has(pairKey)) {
        pairMap.set(pairKey, {
          locA,
          locB,
          fiberType,
          speed: link.rawSpeed || "10G",
          linkId: link.id
        });
      }
    });
  }

  // 2. Direct BOM inspection fallback if topologyLinks yielded nothing
  if (pairMap.size === 0 && typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) {
    const switches = projectBOM.filter(i => !i.parentInstanceId && (i.role === "Access" || i.role === "Core" || i.role === "Aggregation" || i.role === "Core & Agg" || i.role === "Switch"));
    const coreSwitch = switches.find(s => s.role === "Core" || s.role === "Core & Agg" || s.role === "Aggregation") || switches[0];

    switches.forEach(sw => {
      let targetSw = null;
      if (sw.customUplinkTargetId) {
        targetSw = switches.find(s => s.instanceId === sw.customUplinkTargetId);
      } else if (sw.uplinkTargetId) {
        targetSw = switches.find(s => s.instanceId === sw.uplinkTargetId);
      } else if (coreSwitch && sw.instanceId !== coreSwitch.instanceId) {
        targetSw = coreSwitch;
      }

      if (targetSw && targetSw.instanceId !== sw.instanceId) {
        const locA = (typeof FacilityStore !== "undefined") ? FacilityStore.normalize(sw.closetName || sw.rackId || "MDF") : (sw.closetName || "MDF");
        const locB = (typeof FacilityStore !== "undefined") ? FacilityStore.normalize(targetSw.closetName || targetSw.rackId || "MDF") : (targetSw.closetName || "MDF");

        if (locA !== locB && !locA.endsWith("• Field") && !locB.endsWith("• Field")) {
          const normA = locA.trim().toLowerCase();
          const normB = locB.trim().toLowerCase();
          const pairKey = [normA.replace(/[^a-z0-9]/g, ""), normB.replace(/[^a-z0-9]/g, "")].sort().join("___");
          if (!pairMap.has(pairKey)) {
            pairMap.set(pairKey, {
              locA,
              locB,
              fiberType: projFiber,
              speed: "10G",
              linkId: `link-${sw.instanceId}-${targetSw.instanceId}`
            });
          }
        }
      }
    });
  }

  return Array.from(pairMap.values());
}

function autoSyncFiberBackbonesFromTopology(floor, force = false) {
  if (!floor || !Array.isArray(floor.nodes)) return 0;
  if (!floor.fiberBackbones) floor.fiberBackbones = [];
  if (!floor.deletedFiberLinks) floor.deletedFiberLinks = [];

  const connections = getInterClosetConnections();
  if (!connections || connections.length === 0) return 0;

  const closetsOnFloor = floor.nodes.filter(n => n.type === "closet");
  if (closetsOnFloor.length < 2) return 0;

  let createdCount = 0;

  connections.forEach(conn => {
    const c1 = closetsOnFloor.find(c => isClosetMatch(c.name, conn.locA));
    const c2 = closetsOnFloor.find(c => isClosetMatch(c.name, conn.locB));

    if (c1 && c2 && c1.id !== c2.id) {
      const normA = (typeof FacilityStore !== "undefined" ? FacilityStore.normalize(c1.name || "") : String(c1.name || "")).trim().toLowerCase();
      const normB = (typeof FacilityStore !== "undefined" ? FacilityStore.normalize(c2.name || "") : String(c2.name || "")).trim().toLowerCase();
      const fullKey = [normA.replace(/[^a-z0-9]/g, ""), normB.replace(/[^a-z0-9]/g, "")].sort().join("___");
      const spaceA = normA.split(" • ")[0].trim().replace(/[^a-z0-9]/g, "");
      const spaceB = normB.split(" • ")[0].trim().replace(/[^a-z0-9]/g, "");
      const spaceKey = [spaceA, spaceB].sort().join("___");
      const idKey = [c1.id, c2.id].sort().join("___");

      const existing = floor.fiberBackbones.find(fb => 
        (fb.fromId === c1.id && fb.toId === c2.id) || (fb.fromId === c2.id && fb.toId === c1.id)
      );

      if (existing) {
        if (!existing.customOverride && conn.fiberType && existing.fiberType !== conn.fiberType) {
          existing.fiberType = conn.fiberType;
        }
      } else {
        if (!force && (
          floor.deletedFiberLinks.includes(fullKey) || 
          floor.deletedFiberLinks.includes(spaceKey) || 
          floor.deletedFiberLinks.includes(idKey)
        )) {
          return;
        }

        const newFb = {
          id: `fiber-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          fromId: c1.id,
          toId: c2.id,
          fromClosetName: c1.name,
          toClosetName: c2.name,
          fiberType: conn.fiberType || ((typeof getProjectFiberType === "function") ? getProjectFiberType() : "mmf"),
          strandCount: 12,
          rating: "plenum",
          connectorType: "lc",
          slackFt: 40,
          waypoints: [],
          autoCreatedFromTopology: true
        };
        floor.fiberBackbones.push(newFb);
        createdCount++;
      }
    }
  });

  return createdCount;
}

function manualAutoLinkTopology() {
  const floor = getActiveFloor();
  if (!floor) return;
  floor.deletedFiberLinks = [];
  const count = autoSyncFiberBackbonesFromTopology(floor, true);
  recalculateCurrentFloorCables();
  renderCableCanvas();
  renderInspector();
  renderSidebarTabContent();
  saveFacilityState();
  if (typeof commitCablingToBOM === "function") commitCablingToBOM();
  if (typeof renderBOMTable === "function") renderBOMTable();

  if (count > 0) {
    if (typeof showToast === "function") {
      showToast(`Auto-linked ${count} fiber backbone${count > 1 ? 's' : ''} based on Topology.`);
    }
  } else {
    if (typeof showToast === "function") {
      showToast("All closet uplinks from Topology are already linked.");
    }
  }
}

function syncFiberBackboneToTopology(fb, newFiberType) {
  if (!fb || !newFiberType) return;
  const floor = getActiveFloor();
  if (!floor) return;
  const c1 = (floor.nodes || []).find(n => n.id === fb.fromId);
  const c2 = (floor.nodes || []).find(n => n.id === fb.toId);
  const name1 = c1 ? c1.name : (fb.fromClosetName || "");
  const name2 = c2 ? c2.name : (fb.toClosetName || "");
  if (!name1 || !name2) return;

  const overrides = (typeof getLinkInterconnectOverrides === "function") 
    ? getLinkInterconnectOverrides() 
    : ((typeof linkInterconnectOverrides !== "undefined") ? linkInterconnectOverrides : {});

  if ((typeof topologyLinks === "undefined" || topologyLinks.length === 0) && typeof generateTopologyLinks === "function" && typeof projectBOM !== "undefined") {
    generateTopologyLinks(projectBOM.filter(i => !i.parentInstanceId));
  }

  const links = (typeof topologyLinks !== "undefined" && Array.isArray(topologyLinks)) ? topologyLinks : [];
  let updatedCount = 0;

  links.forEach(lnk => {
    const s1 = (typeof projectBOM !== "undefined") ? projectBOM.find(i => i.instanceId === lnk.fromId) : null;
    const s2 = (typeof projectBOM !== "undefined") ? projectBOM.find(i => i.instanceId === lnk.toId) : null;
    if (s1 && s2) {
      const loc1 = (typeof FacilityStore !== "undefined") ? FacilityStore.normalize(s1.closetName || s1.rackId || "") : (s1.closetName || "");
      const loc2 = (typeof FacilityStore !== "undefined") ? FacilityStore.normalize(s2.closetName || s2.rackId || "") : (s2.closetName || "");
      const match1 = isClosetMatch(loc1, name1) && isClosetMatch(loc2, name2);
      const match2 = isClosetMatch(loc1, name2) && isClosetMatch(loc2, name1);
      if (match1 || match2) {
        if (!overrides[lnk.id]) overrides[lnk.id] = {};
        overrides[lnk.id].fiberType = newFiberType;
        overrides[lnk.id].medium = newFiberType;
        updatedCount++;
      }
    }
  });

  if (typeof setLinkInterconnectOverrides === "function") {
    setLinkInterconnectOverrides(overrides);
  } else if (typeof linkInterconnectOverrides !== "undefined") {
    linkInterconnectOverrides = overrides;
  }

  if (updatedCount > 0) {
    if (typeof autoSynthesizeInterconnects === "function") autoSynthesizeInterconnects();
    if (typeof renderTopologyInspector === "function") renderTopologyInspector();
    if (typeof renderTopologyLinks === "function") renderTopologyLinks();
  }
}

function selectFiberBackbone(fiberId, e) {
  if (e && typeof e.stopPropagation === "function") {
    e.stopPropagation();
  }
  if (selectedFiberBackboneId === fiberId) return;
  selectedFiberBackboneId = fiberId;
  selectedNodeId = null;
  const inspectorPanel = document.getElementById("inspectorPanel");
  if (inspectorPanel && inspectorPanel.classList.contains("hidden")) {
    inspectorPanel.classList.remove("hidden");
  }
  renderInspector();
  renderSidebarTabContent();
  renderCableCanvas();
}

function deselectFiberBackbone() {
  selectedFiberBackboneId = null;
  renderInspector();
  renderSidebarTabContent();
  renderCableCanvas();
}

function updateFiberBackbone(fiberId, field, value) {
  const floor = getActiveFloor();
  if (!floor || !floor.fiberBackbones) return;
  const fb = floor.fiberBackbones.find(f => f.id === fiberId);
  if (!fb) return;
  fb[field] = value;

  // Real-time synchronization to Topology if changing fiber type
  if (field === "fiberType") {
    fb.customOverride = true;
    syncFiberBackboneToTopology(fb, value);
  }

  recalculateCurrentFloorCables();
  renderCableCanvas();
  renderInspector();
  renderSidebarTabContent();
  saveFacilityState(true);
  if (typeof commitCablingToBOM === "function") {
    commitCablingToBOM({ silent: true });
  }
  if (typeof renderBOMTable === "function") {
    renderBOMTable();
  }
}

function deleteFiberBackbone(fiberId, e) {
  if (e && typeof e.stopPropagation === "function") {
    e.stopPropagation();
  }
  const floor = getActiveFloor();
  if (!floor || !floor.fiberBackbones) return;
  const targetFb = floor.fiberBackbones.find(f => f.id === fiberId);
  if (targetFb) {
    const c1 = (floor.nodes || []).find(n => n.id === targetFb.fromId);
    const c2 = (floor.nodes || []).find(n => n.id === targetFb.toId);
    const name1 = c1 ? c1.name : (targetFb.fromClosetName || "");
    const name2 = c2 ? c2.name : (targetFb.toClosetName || "");
    const norm1 = (typeof FacilityStore !== "undefined" ? FacilityStore.normalize(name1) : String(name1)).trim().toLowerCase();
    const norm2 = (typeof FacilityStore !== "undefined" ? FacilityStore.normalize(name2) : String(name2)).trim().toLowerCase();
    const fullKey = [norm1.replace(/[^a-z0-9]/g, ""), norm2.replace(/[^a-z0-9]/g, "")].sort().join("___");
    const space1 = norm1.split(" • ")[0].trim().replace(/[^a-z0-9]/g, "");
    const space2 = norm2.split(" • ")[0].trim().replace(/[^a-z0-9]/g, "");
    const spaceKey = [space1, space2].sort().join("___");

    if (!floor.deletedFiberLinks) floor.deletedFiberLinks = [];
    if (!floor.deletedFiberLinks.includes(fullKey)) {
      floor.deletedFiberLinks.push(fullKey);
    }
    if (!floor.deletedFiberLinks.includes(spaceKey)) {
      floor.deletedFiberLinks.push(spaceKey);
    }
    if (targetFb.fromId && targetFb.toId) {
      const idKey = [targetFb.fromId, targetFb.toId].sort().join("___");
      if (!floor.deletedFiberLinks.includes(idKey)) {
        floor.deletedFiberLinks.push(idKey);
      }
    }
    if (!floor.deletedFiberLinks.includes(fiberId)) {
      floor.deletedFiberLinks.push(fiberId);
    }
  }

  floor.fiberBackbones = floor.fiberBackbones.filter(f => f.id !== fiberId);
  if (selectedFiberBackboneId === fiberId) {
    selectedFiberBackboneId = null;
  }
  recalculateCurrentFloorCables();
  renderCableCanvas();
  renderInspector();
  renderSidebarTabContent();
  saveFacilityState(true);
  if (typeof commitCablingToBOM === "function") {
    commitCablingToBOM({ silent: true });
  }
  if (typeof renderBOMTable === "function") {
    renderBOMTable();
  }
  if (typeof showToast === "function") {
    showToast("Fiber backbone link deleted.");
  }
}

function renderInspector() {
  const container = document.getElementById("inspectorContent");
  if (!container) return;

  if (!selectedNodeId && !selectedFiberBackboneId && !selectedPathwayTrunkId && (!selectedNodeIds || selectedNodeIds.size === 0)) {
    container.innerHTML = `<span class="text-slate-500 text-[11px] block text-center py-2">Select a drop, closet, pathway corridor, or drag a selection box to view properties.</span>`;
    return;
  }

  const floor = getActiveFloor();
  if (!floor) {
    container.innerHTML = `<span class="text-slate-500 text-[11px] block text-center py-2">No active floor/building. Click "+ Floor/Building" to create one.</span>`;
    return;
  }

  // A. Bulk Operations Inspector (When 2+ Nodes Selected)
  if (selectedNodeIds && selectedNodeIds.size > 1) {
    const selectedNodes = floor.nodes.filter(n => selectedNodeIds.has(n.id));
    const dropNodes = selectedNodes.filter(n => n.type === "device");
    const closetNodes = selectedNodes.filter(n => n.type === "closet");

    let camCount = 0, acsCount = 0, apCount = 0, otherCount = 0;
    dropNodes.forEach(dev => {
      const bomItem = (typeof projectBOM !== "undefined" && dev.instanceId) ? projectBOM.find(i => i.instanceId === dev.instanceId) : null;
      const layerType = getDeviceLayerType(bomItem || dev);
      if (layerType === "cameras") camCount++;
      else if (layerType === "access") acsCount++;
      else if (layerType === "wireless") apCount++;
      else otherCount++;
    });

    const allClosets = getAllClosetsAcrossFacility();
    const closetOptions = allClosets.map(c => `<option value="${c.id}">${escapeHTML(c.name)}</option>`).join('');

    container.innerHTML = `
      <div class="space-y-4">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div class="flex items-center gap-2">
            <div class="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
              <i data-lucide="box-select" class="w-4 h-4"></i>
            </div>
            <div>
              <h4 class="text-xs font-bold text-white tracking-wide">Bulk Operations</h4>
              <p class="text-[10px] text-indigo-300 font-mono">${selectedNodeIds.size} Elements Multi-Selected</p>
            </div>
          </div>
          <button onclick="clearMultiSelection()" class="text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800 text-[10px] font-bold transition-colors">
            Clear
          </button>
        </div>

        <!-- Composition Card -->
        <div class="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
          <div class="text-[10px] uppercase font-bold text-slate-400 mb-1">Selected Composition</div>
          <div class="flex flex-wrap gap-1.5 text-[10px] font-mono">
            ${camCount > 0 ? `<span class="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">${camCount} Cameras</span>` : ''}
            ${acsCount > 0 ? `<span class="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-bold">${acsCount} Readers/Doors</span>` : ''}
            ${apCount > 0 ? `<span class="px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 font-bold">${apCount} Wireless APs</span>` : ''}
            ${closetNodes.length > 0 ? `<span class="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 font-bold">${closetNodes.length} Closets</span>` : ''}
            ${otherCount > 0 ? `<span class="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700">${otherCount} Other</span>` : ''}
          </div>
        </div>

        <!-- Bulk Reassign Closet -->
        ${dropNodes.length > 0 ? `
          <div class="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <label class="text-[10px] uppercase font-bold text-slate-400 block">Reassign Closet / Enclosure</label>
            <select id="bulkTargetClosetSelect" class="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs font-medium focus:border-indigo-500">
              ${closetOptions}
            </select>
            <button onclick="executeBulkReassignCloset(document.getElementById('bulkTargetClosetSelect').value)" class="w-full py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow">
              <i data-lucide="server" class="w-3.5 h-3.5"></i>
              <span>Reassign ${dropNodes.length} Drops to Selected Closet</span>
            </button>
          </div>

          <!-- Bulk Cable Spec -->
          <div class="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <label class="text-[10px] uppercase font-bold text-slate-400 block">Apply Cable Standard / Spec</label>
            <select id="bulkCableSkuSelect" class="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs font-medium focus:border-indigo-500">
              <option value="C6A-CMP-1K-BL">Cat6A CMP Plenum (Blue) - 10G Certified</option>
              <option value="C6A-CMR-1K-BL">Cat6A CMR Riser (Blue) - 10G Non-Plenum</option>
              <option value="C6-CMP-1K-BL">Cat6 CMP Plenum (Blue) - 1G/5G Baseline</option>
              <option value="C6A-OSP-SHLD">Cat6A OSP Outdoor Shielded Gel-Filled (Black)</option>
            </select>
            <button onclick="executeBulkChangeCableSpec(document.getElementById('bulkCableSkuSelect').value)" class="w-full py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors border border-slate-700">
              <i data-lucide="zap" class="w-3.5 h-3.5 text-amber-400"></i>
              <span>Update Cable Spec on ${dropNodes.length} Drops</span>
            </button>
          </div>
        ` : ''}

        <!-- Spatial Alignment Tools -->
        <div class="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
          <label class="text-[10px] uppercase font-bold text-slate-400 block">Spatial Alignment &amp; Clean Up</label>
          <div class="grid grid-cols-2 gap-1.5">
            <button onclick="executeBulkAlign('horizontal')" class="py-1.5 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1 border border-slate-800 transition-colors" title="Align nodes horizontally to average Y">
              <i data-lucide="align-horizontal-distribute-center" class="w-3.5 h-3.5 text-indigo-400"></i> Align Horiz
            </button>
            <button onclick="executeBulkAlign('vertical')" class="py-1.5 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1 border border-slate-800 transition-colors" title="Align nodes vertically to average X">
              <i data-lucide="align-vertical-distribute-center" class="w-3.5 h-3.5 text-indigo-400"></i> Align Vert
            </button>
          </div>
          <div class="grid grid-cols-2 gap-1.5">
            <button onclick="executeBulkDistribute()" class="py-1.5 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1 border border-slate-800 transition-colors" title="Space nodes out evenly along the line">
              <i data-lucide="distribute-horizontal" class="w-3.5 h-3.5 text-sky-400"></i> Distribute
            </button>
            <button onclick="executeBulkClearWaypoints()" class="py-1.5 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1 border border-slate-800 transition-colors" title="Remove all custom bends on selected cables">
              <i data-lucide="route-off" class="w-3.5 h-3.5 text-amber-400"></i> Clear Bends
            </button>
          </div>
        </div>

        <!-- Bulk Delete -->
        <div class="pt-1">
          <button onclick="executeBulkDeleteNodes()" class="w-full py-2 px-3 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-300 hover:text-white border border-rose-700/60 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
            <span>Delete All ${selectedNodeIds.size} Selected Items</span>
          </button>
        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
    return;
  }

  // B. Pathway Corridor Inspector
  if (selectedPathwayTrunkId) {
    const trunk = (floor.pathwayTrunks || []).find(t => t.id === selectedPathwayTrunkId);
    if (trunk) {
      let routedCount = 0;
      floor.nodes.filter(n => n.type === "device").forEach(d => {
        if (d.calculatedRun) {
          const snapped = Array.isArray(d.calculatedRun.traversedTrunks) && d.calculatedRun.traversedTrunks.includes(trunk.id);
          const isNear = !snapped && d.calculatedRun.points && d.calculatedRun.points.some(p => trunk.points.some(tp => Math.hypot(p.x - tp.x, p.y - tp.y) < 45));
          if (snapped || isNear) routedCount++;
        }
      });
      const capacity = trunk.capacity || 80;
      const fillPct = Math.round((routedCount / capacity) * 100);
      const maxFillPct = trunk.type === "conduit" ? 40 : 50;
      const isOverfilled = fillPct > maxFillPct;

      container.innerHTML = `
        <div class="space-y-4">
          <div class="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div class="flex items-center gap-2">
              <div class="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30">
                <i data-lucide="route" class="w-4 h-4"></i>
              </div>
              <div>
                <h4 class="text-xs font-bold text-white tracking-wide">Pathway Corridor</h4>
                <p class="text-[10px] text-amber-300 font-mono">Main Cable Pathway Trunk</p>
              </div>
            </div>
            <div class="flex items-center gap-1.5">
              <button onclick="deletePathwayTrunk('${escapeJSAttr(trunk.id)}')" class="px-2 py-1 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-700/60 rounded text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm">
                <i data-lucide="trash-2" class="w-3 h-3"></i> Delete
              </button>
              <button onclick="deselectPathwayTrunk()" class="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors">
                <i data-lucide="x" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </div>

          <!-- Name -->
          <div>
            <label class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Corridor Name / Label</label>
            <input type="text" value="${escapeHTML(trunk.name)}" onchange="updatePathwayTrunkName('${escapeJSAttr(trunk.id)}', this.value)" class="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs font-medium focus:border-amber-500" />
          </div>

          <!-- Type -->
          <div>
            <label class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Pathway Infrastructure Type</label>
            <select onchange="updatePathwayTrunkType('${escapeJSAttr(trunk.id)}', this.value)" class="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs font-medium focus:border-amber-500">
              <option value="tray" ${trunk.type === 'tray' ? 'selected' : ''}>Cable Tray (12" Wire Mesh Basket - 100 Cables)</option>
              <option value="ladder" ${trunk.type === 'ladder' ? 'selected' : ''}>Cable Runway / Ladder Rack (160 Cables)</option>
              <option value="jhook" ${trunk.type === 'jhook' ? 'selected' : ''}>J-Hook Tree Pathway (40 Cables)</option>
              <option value="conduit" ${trunk.type === 'conduit' ? 'selected' : ''}>2" EMT Steel Conduit (25 Cables)</option>
            </select>
          </div>

          <!-- Rated Capacity -->
          <div class="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Rated Capacity</label>
              <input type="number" min="10" max="500" step="10" value="${capacity}" onchange="updatePathwayTrunkCapacity('${escapeJSAttr(trunk.id)}', parseInt(this.value))" class="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold focus:border-amber-500" />
            </div>
            <div>
              <label class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Routed Cables</label>
              <div class="py-1.5 font-mono text-xs font-bold ${isOverfilled ? 'text-rose-400' : 'text-emerald-400'}">
                ${routedCount} / ${capacity} (${fillPct}%)
              </div>
            </div>
          </div>

          <!-- NEC 392 / Chapter 9 Fill Status -->
          <div class="p-2.5 rounded-xl border ${isOverfilled ? 'bg-rose-950/40 border-rose-600/50 text-rose-300' : 'bg-slate-950 border-slate-800 text-slate-300'} text-xs">
            <div class="flex items-center justify-between font-bold mb-1">
              <span>${trunk.type === 'conduit' ? 'NEC Ch. 9 Conduit Fill:' : 'NEC 392 / TIA-569 Fill:'}</span>
              <span class="font-mono text-[11px] ${isOverfilled ? 'text-rose-400' : 'text-emerald-400'}">${isOverfilled ? `WARNING: OVERFILLED (>${maxFillPct}%)` : `COMPLIANT (≤${maxFillPct}%)`}</span>
            </div>
            <div class="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div class="h-full rounded-full transition-all duration-300 ${isOverfilled ? 'bg-rose-500' : (fillPct > (maxFillPct - 10) ? 'bg-amber-500' : 'bg-emerald-500')}" style="width: ${Math.min(100, fillPct)}%"></div>
            </div>
            <p class="text-[10px] opacity-80 mt-1.5">
              ${isOverfilled 
                ? `Pathway exceeds the ${maxFillPct}% ${trunk.type === 'conduit' ? 'NEC Chapter 9 Table 1 conduit' : 'NEC Article 392 cable tray'} fill limit for data cables. Upgrade size or divide runs.`
                : `Drops within 280px automatically snap to this trunk spine (and connected corridor trunks). Maintains compliant ≤${maxFillPct}% cross-sectional fill.`}
            </p>
          </div>

          <!-- 1-Click Snap All Floor Cables to Pathways -->
          <div class="pt-1">
            <button onclick="snapAllFloorCablesToTrunks()" class="w-full py-2 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 hover:text-white border border-amber-500/40 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow">
              <i data-lucide="magnet" class="w-3.5 h-3.5 text-amber-400"></i>
              <span>Snap Floor Cables to Pathway Corridors</span>
            </button>
          </div>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }
  }

  // Fiber Backbone Inspector
  if (selectedFiberBackboneId) {
    const fb = (floor && floor.fiberBackbones) ? floor.fiberBackbones.find(f => f.id === selectedFiberBackboneId) : null;
    if (fb) {
      const c1 = floor.nodes.find(n => n.id === fb.fromId);
      const c2 = floor.nodes.find(n => n.id === fb.toId);
      const fromName = c1 ? c1.name : (fb.fromClosetName || "MDF");
      const toName = c2 ? c2.name : (fb.toClosetName || "IDF");
      const fType = (fb.fiberType || (typeof getProjectFiberType === "function" ? getProjectFiberType() : "mmf")).toLowerCase();
      const strands = parseInt(fb.strandCount) || 12;
      const rating = fb.rating || "plenum";
      const conn = fb.connectorType || "lc";
      const slack = (typeof fb.slackFt === "number") ? fb.slackFt : 40;
      const measured = fb.measuredFt || Math.max(10, (fb.totalFt || 100) - slack);
      const totalFt = measured + slack;

      // Price estimation preview
      const catalogList = (typeof CABLING_CATALOG !== "undefined" && CABLING_CATALOG.fiberBackbone) ? CABLING_CATALOG.fiberBackbone : [];
      const trunkItem = catalogList.find(i => i.medium === fType && i.strands === strands) ||
        catalogList.find(i => i.medium === fType) ||
        catalogList[0] ||
        { sku: "FIBER-TRUNK", name: "Fiber Trunk", msrpPerFt: 2.50, baseTerminationMsrp: 250 };
      const estPrice = Math.round((totalFt * (trunkItem.msrpPerFt || 2.5)) + (trunkItem.baseTerminationMsrp || 250));

      container.innerHTML = `
        <div class="space-y-4">
          <div class="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div class="flex items-center gap-2">
              <div class="p-1.5 rounded-lg ${fType === 'smf' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'}">
                <i data-lucide="network" class="w-4 h-4"></i>
              </div>
              <div>
                <h4 class="text-xs font-bold text-white tracking-wide">Fiber Backbone Link</h4>
                <p class="text-[10px] text-slate-400 font-mono">Inter-Enclosure Optical Trunk</p>
              </div>
            </div>
            <div class="flex items-center gap-1.5">
              <button type="button" onclick="deleteFiberBackbone('${escapeJSAttr(fb.id)}', event)" class="px-2 py-1 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-700/60 rounded text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm" title="Delete this fiber backbone">
                <i data-lucide="trash-2" class="w-3 h-3"></i> Delete
              </button>
              <button onclick="deselectFiberBackbone()" class="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer" title="Deselect">
                <i data-lucide="x" class="w-3.5 h-3.5"></i>
              </button>
            </div>
          </div>

          <!-- Locations Span -->
          <div class="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
            <label class="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">Connected Enclosures / Closets</label>
            <div class="flex items-center justify-between text-xs font-semibold gap-2">
              <span class="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-indigo-300 truncate max-w-[110px]" title="${escapeHTML(fromName)}">${escapeHTML(fromName)}</span>
              <span class="text-slate-500 font-mono text-[11px]">&harr;</span>
              <span class="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-indigo-300 truncate max-w-[110px]" title="${escapeHTML(toName)}">${escapeHTML(toName)}</span>
            </div>
          </div>

          <!-- Optical Medium / Fiber Type -->
          <div>
            <label class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Optical Fiber Medium</label>
            <select onchange="updateFiberBackbone('${escapeJSAttr(fb.id)}', 'fiberType', this.value)" class="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-500 font-medium cursor-pointer">
              <option value="smf" ${fType === 'smf' ? 'selected' : ''}>OS2 Single-Mode (9/125&mu;m &bull; Yellow Jacket &bull; 1310/1550nm LR)</option>
              <option value="mmf" ${fType === 'mmf' ? 'selected' : ''}>OM4 Multi-Mode (50/125&mu;m &bull; Aqua Jacket &bull; 850nm SR)</option>
              <option value="om3" ${fType === 'om3' ? 'selected' : ''}>OM3 Multi-Mode (50/125&mu;m &bull; Aqua Jacket &bull; 850nm SR)</option>
            </select>
          </div>

          <!-- Strand Count -->
          <div>
            <label class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Strand Count / Core Capacity</label>
            <select onchange="updateFiberBackbone('${escapeJSAttr(fb.id)}', 'strandCount', parseInt(this.value))" class="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-medium cursor-pointer">
              <option value="6" ${strands === 6 ? 'selected' : ''}>6-Strand (3 Duplex Pairs)</option>
              <option value="12" ${strands === 12 ? 'selected' : ''}>12-Strand (6 Duplex Pairs &bull; Standard)</option>
              <option value="24" ${strands === 24 ? 'selected' : ''}>24-Strand (12 Duplex Pairs &bull; High-Density)</option>
              <option value="48" ${strands === 48 ? 'selected' : ''}>48-Strand (24 Duplex Pairs &bull; Core Spine)</option>
            </select>
          </div>

          <!-- Jacket Fire Rating -->
          <div>
            <label class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Jacket Fire Rating / Environment</label>
            <select onchange="updateFiberBackbone('${escapeJSAttr(fb.id)}', 'rating', this.value)" class="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-medium cursor-pointer">
              <option value="plenum" ${rating === 'plenum' ? 'selected' : ''}>OFNP - Plenum Rated (Air Return / Ceiling Plenums)</option>
              <option value="riser" ${rating === 'riser' ? 'selected' : ''}>OFNR - Riser Rated (Vertical Shafts / Conduits)</option>
              <option value="armored" ${rating === 'armored' ? 'selected' : ''}>Armored / OSP (Indoor/Outdoor Inter-Locking Armor)</option>
            </select>
          </div>

          <!-- Connector Termination -->
          <div>
            <label class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Pre-Terminated Connector End</label>
            <select onchange="updateFiberBackbone('${escapeJSAttr(fb.id)}', 'connectorType', this.value)" class="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-indigo-500 font-medium cursor-pointer">
              <option value="lc" ${conn === 'lc' ? 'selected' : ''}>LC Duplex (Staggered Breakout Kits)</option>
              <option value="sc" ${conn === 'sc' ? 'selected' : ''}>SC Duplex</option>
              <option value="mpo" ${conn === 'mpo' ? 'selected' : ''}>MTP / MPO High-Density Cassette</option>
            </select>
          </div>

          <!-- Length & Slack -->
          <div class="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-2">
            <label class="text-[10px] uppercase font-bold text-slate-400 block">Footage &amp; Service Loops</label>
            <div class="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span class="text-slate-500 block text-[10px]">Measured Span:</span>
                <span class="font-mono font-bold text-slate-200">${measured} ft</span>
              </div>
              <div>
                <span class="text-slate-500 block text-[10px]">Service Loops:</span>
                <div class="flex items-center gap-1">
                  <input type="number" min="0" max="200" step="5" value="${slack}" onchange="updateFiberBackbone('${escapeJSAttr(fb.id)}', 'slackFt', parseFloat(this.value) || 0)" class="w-16 bg-slate-900 border border-slate-700 text-white text-xs px-1.5 py-0.5 rounded font-mono focus:border-indigo-500" />
                  <span class="text-[10px] text-slate-400">ft</span>
                </div>
              </div>
            </div>
            <div class="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span class="text-slate-400 font-medium">Total Assembly Run:</span>
              <span class="font-mono font-bold text-amber-300">${totalFt} ft (${Math.round(totalFt * 0.3048)}m)</span>
            </div>
          </div>

          <!-- Live BOM Line Item Preview -->
          <div class="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 text-[11px] space-y-1">
            <div class="flex items-center justify-between">
              <span class="text-[10px] uppercase font-bold text-indigo-400">Quote BOM Item</span>
              <span class="font-mono font-bold text-emerald-400">$${estPrice.toLocaleString()} MSRP</span>
            </div>
            <p class="font-semibold text-white leading-tight text-xs">${strands}-Strand ${fType === 'smf' ? 'OS2 Single-Mode' : 'OM4 Multi-Mode'} Pre-Term Trunk</p>
            <p class="text-[10px] font-mono text-slate-400">${trunkItem.sku} &bull; ${escapeHTML(fromName)} &rarr; ${escapeHTML(toName)}</p>
          </div>

          <!-- Actions -->
          <div class="pt-2 flex items-center gap-2">
            <button onclick="deleteFiberBackbone('${escapeJSAttr(fb.id)}', event)" class="flex-1 py-1.5 px-3 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/60 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Delete Fiber Link
            </button>
          </div>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }
  }

  const node = (floor.nodes || []).find(n => n.id === selectedNodeId);
  if (!node) {
    container.innerHTML = `<span class="text-slate-500 text-[11px] block text-center py-2">No element selected.</span>`;
    return;
  }

  const isCloset = node.type === "closet";
  const allClosets = getAllClosetsAcrossFacility();
  const run = node.calculatedRun;

  if (isCloset) {
    const cabinetItems = (typeof projectBOM !== "undefined" ? projectBOM : []).filter(item => {
      if (item.role === "Mgmt License" || item.role === "Security License" || item.role === "Feature License") return false;
      if (item.baseWatts === 0 && (!item.ports || item.ports === 0) && item.role !== "Structured Cabling" && (!item.rackUnits || item.rackUnits === 0) && item.role !== "UPS" && item.category !== "ups") return false;

      const normItemLoc = FacilityStore.normalize(item.closetName || item.rackId).toLowerCase();
      const normNodeLoc = FacilityStore.normalize(node.name).toLowerCase();
      return normItemLoc === normNodeLoc;
    });

    const isZeroU = (it) => it.isDinMounted || (it.rackUnits !== undefined && parseInt(it.rackUnits, 10) === 0) || (it.mounting && it.mounting.toLowerCase().includes("din"));
    const rackMounted = cabinetItems.filter(i => !isZeroU(i) && i.role !== "Structured Cabling");
    const patchPanels = cabinetItems.filter(i => i.role === "Structured Cabling" && (i.model || '').includes("Patch Panel"));
    const fieldDevices = cabinetItems.filter(i => isZeroU(i) && i.role !== "Structured Cabling");

    container.innerHTML = `
      <div class="space-y-3">
        <div>
          <label class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Cabinet Name:</label>
          <input type="text" value="${escapeHTML(node.name)}" onchange="updateNodeName('${escapeJSAttr(node.id)}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-brand-500 font-semibold" />
        </div>

        <div>
          <label class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Assigned Floor/Building:</label>
          <select onchange="moveClosetToFloor('${escapeJSAttr(node.id)}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-amber-300 font-semibold rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-amber-500">
            ${facilityFloors.map(f => `
              <option value="${f.id}" ${f.id === node.floorId ? 'selected' : ''}>${escapeHTML(f.name)}</option>
            `).join('')}
          </select>
        </div>

        ${(() => {
          if (typeof FacilityStore === "undefined") return "";
          const parsed = FacilityStore.parse(node.name);
          const encs = FacilityStore.getEnclosures();
          const enc = encs.find(e => e.id === parsed.hostId) || encs.find(e => e.name.toLowerCase() === (parsed.hostName || node.name).toLowerCase()) || null;
          if (!enc) return "";
          const inBOM = FacilityStore.isEnclosureInBOM(enc.id);
          const formFactor = enc.heightU ? `${enc.heightU}U Rack` : (enc.subplateBays ? `${enc.subplateBays}-Bay Cabinet` : (enc.dinRails ? `${enc.dinRails}x DIN Enclosure` : `${enc.widthFt || 4}x${enc.heightFt || 8}' Backboard`));
          return `
            <!-- Real Hardware Part Spec Card -->
            <div class="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-2.5 rounded-xl border border-indigo-500/40 space-y-1.5 shadow-sm">
              <div class="flex items-center justify-between text-[10px]">
                <span class="font-mono font-bold text-indigo-300 px-1.5 py-0.5 rounded bg-indigo-950 border border-indigo-700/60">
                  ${escapeHTML(enc.catalogVendor || '')} ${escapeHTML(enc.catalogSku || 'Custom')}
                </span>
                <span class="font-mono font-bold text-emerald-400">$${(enc.msrp || 0).toLocaleString()} MSRP</span>
              </div>
              <div class="text-xs font-semibold text-white truncate" title="${escapeHTML(enc.catalogModel || '')}">
                ${escapeHTML(enc.catalogModel || enc.name)}
              </div>
              <div class="flex items-center justify-between text-[9.5px] font-mono text-slate-400 pt-1 border-t border-slate-800">
                <span>${formFactor} &bull; ${enc.depthInches ? enc.depthInches + '" Depth' : ''}</span>
                <span class="${inBOM ? 'text-emerald-400 font-bold' : 'text-slate-500'}">${inBOM ? '● In Project Quote' : '○ Not Quoted'}</span>
              </div>
            </div>
          `;
        })()}

        <div class="bg-slate-900 p-2.5 rounded-xl border border-slate-800 space-y-2">
          ${(() => {
            const telem = (typeof FacilityStore !== "undefined") ? FacilityStore.getLocationTelemetry(node.name) : { totalWatts: 0, totalRuOccupied: 0, totalPoEWatts: 0 };
            return `
              <div class="flex items-center justify-between text-[11px]">
                <span class="font-bold text-indigo-300">Physical Hardware Load</span>
                <span class="font-mono text-slate-400">${telem.totalRuOccupied} RU &bull; ${telem.totalWatts}W (${telem.totalPoEWatts}W PoE)</span>
              </div>
            `;
          })()}
          
          <div class="space-y-1 max-h-36 overflow-y-auto pr-1">
            ${patchPanels.map(it => `
              <div class="bg-slate-950 px-2 py-1 rounded text-[10px] border border-amber-500/30 flex justify-between text-amber-200">
                <span class="truncate"><strong class="text-amber-400">[1U Panel]</strong> ${escapeHTML(it.model)}</span>
                <span class="font-mono font-bold">${it.qty}x</span>
              </div>
            `).join('')}
            ${rackMounted.map(it => {
              const isStack = it.stackedUnits && it.stackedUnits >= 2;
              const ppSpan = (isStack && it.patchPanelBetween) ? (it.stackedUnits - 1) : 0;
              const itemRU = (it.rackUnits !== undefined && it.rackUnits !== null) ? (parseInt(it.rackUnits, 10) || 0) : 1;
              const stackSpan = itemRU * (isStack ? it.stackedUnits : (parseInt(it.qty, 10) || 1)) + ppSpan;
              return `
                <div class="bg-slate-950 px-2 py-1 rounded text-[10px] border border-slate-800 flex justify-between text-slate-200">
                  <span class="truncate"><strong class="text-indigo-400">[${isStack ? `Stack: ${it.stackedUnits}x` : 'Hardware'}]</strong> ${escapeHTML(it.model)}</span>
                  <span class="font-mono text-emerald-400 font-bold">${stackSpan}U (${it.qty || 1}x)</span>
                </div>
              `;
            }).join('')}
            ${fieldDevices.map(it => `
              <div class="bg-slate-950 px-2 py-1 rounded text-[10px] border border-sky-800/40 text-sky-300 flex justify-between">
                <span class="truncate"><strong class="text-sky-400">[0U / DIN / Field]</strong> ${escapeHTML(it.model)}</span>
                <span class="font-mono font-bold">${it.qty || 1}x</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="flex items-center justify-between gap-1.5 pt-1 border-t border-slate-800 flex-wrap">
          <button onclick="deepLinkToRackElevation('${escapeJSAttr(node.name)}')" class="flex-1 min-w-[90px] py-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer" title="Open Elevation Visualizer">
            <i data-lucide="server" class="w-3.5 h-3.5 text-indigo-400"></i> Elevation
          </button>
          <button onclick="jumpToFacilitySpace('${escapeJSAttr(node.name)}')" class="flex-1 min-w-[80px] py-1.5 bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-200 border border-cyan-500/40 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer" title="Open Space in Facility Manager">
            <i data-lucide="building-2" class="w-3.5 h-3.5 text-cyan-400"></i> Space
          </button>
          <button onclick="jumpToTopologyTarget('loc:${escapeJSAttr(node.name)}')" class="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer" title="View in Topology">
            <i data-lucide="network" class="w-3.5 h-3.5 text-indigo-400"></i>
          </button>
          <button onclick="deleteClosetWithReassignment('${escapeJSAttr(node.id)}')" class="p-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-800/60 rounded-lg cursor-pointer" title="Delete Closet">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      </div>
    `;
  } else {
    // Look up BOM item
    const item = (typeof projectBOM !== "undefined" && Array.isArray(projectBOM))
      ? projectBOM.find(i => (i.instanceId && (i.instanceId === node.instanceId || i.instanceId === node.id || ('dev-' + i.instanceId) === node.id)) || i.model === node.name)
      : null;

    // Get all switches across BOM
    const allSwitches = (typeof projectBOM !== "undefined" && Array.isArray(projectBOM))
      ? projectBOM.filter(i => !i.parentInstanceId && (
          (i.role || "").toLowerCase().includes("switch") || (i.category || "").toLowerCase().includes("switch") ||
          i.role === "Access" || i.role === "Core" || i.role === "Aggregation" || i.role === "Core & Agg" || i.role === "Security WAN"
        ))
      : [];

    const hostSwitch = (item && item.uplinkTargetId) ? allSwitches.find(s => s.instanceId === item.uplinkTargetId) : null;
    const hostSwitchPorts = (hostSwitch && typeof PortEngine !== "undefined") ? PortEngine.initSwitchPorts(hostSwitch) : [];
    const pwrBadge = (item && typeof PortEngine !== "undefined") ? PortEngine.getPowerBadge(item) : { label: "PoE", badgeLabel: "PoE", isExternal: false };
    const pwrWatts = item ? (parseFloat(item.powerConsumptionWatts || item.maxPowerWatts || 15.0) * (parseInt(item.qty, 10) || 1)) : 15.0;
    const isCameraNode = getDeviceLayerType(item || node) === "cameras";
    const showSpecificCameraOptics = typeof window.FEATURE_FLAGS === "undefined" || window.FEATURE_FLAGS.enableSpecificCameraDetails === true;
    const doriTelem = (isCameraNode && showSpecificCameraOptics) ? computeCameraDoriTelemetry(node, item) : null;

    let inspectorCameraSkuCardHtml = "";
    if (isCameraNode && item) {
      const allRealCams = typeof CAMERAS_DATABASE !== "undefined" ? CAMERAS_DATABASE : [];
      const allGenCams = typeof GENERIC_CAMERA_TYPES !== "undefined" ? GENERIC_CAMERA_TYPES : [];
      const genTypeId = item.genericCameraTypeId || item.originGenericTypeId || (item.isGenericCamera ? item.id : null);
      const genDef = genTypeId ? allGenCams.find(g => g.id === genTypeId || g.sku === genTypeId) : null;
      const recSkus = (item.recommendedUpgradeSkus && item.recommendedUpgradeSkus.length > 0)
        ? item.recommendedUpgradeSkus
        : (genDef && Array.isArray(genDef.recommendedUpgradeSkus) ? genDef.recommendedUpgradeSkus : []);
      const recCamObjs = recSkus.map(sku => allRealCams.find(c => c.sku === sku || c.id === sku)).filter(Boolean);
      const otherRealCams = allRealCams.filter(c => !recSkus.includes(c.sku) && !recSkus.includes(c.id));

      inspectorCameraSkuCardHtml = `
        <div class="bg-slate-950 p-2.5 rounded-xl border ${item.isGenericCamera ? 'border-emerald-500/40' : 'border-sky-500/40'} space-y-1.5 shadow-sm">
          <div class="flex items-center justify-between text-[10px]">
            <span class="font-mono font-bold ${item.isGenericCamera ? 'text-emerald-400' : 'text-sky-400'} uppercase flex items-center gap-1">
              <i data-lucide="camera" class="w-3 h-3"></i> ${item.isGenericCamera ? 'Generic Sizing Camera' : 'Assigned Camera Part'}
            </span>
            <span class="font-mono text-[9.5px] text-amber-300 font-bold">${item.powerConsumptionWatts || 8}W / ${item.maxPowerWatts || 15.4}W (${escapeHTML(item.poeStandard || '802.3af')})</span>
          </div>
          <select
            onchange="upgradeSingleCameraInstance('${escapeJSAttr(item.instanceId)}', this.value); renderInspector(); renderCableCanvas();"
            class="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-2 py-1 text-[11px] font-mono focus:outline-none focus:border-brand-500 cursor-pointer"
            title="Assign or override specific camera SKU for this individual drop"
          >
            ${recCamObjs.length > 0 ? `
              <optgroup label="Recommended Compatible Parts">
                ${recCamObjs.map(c => `<option value="${escapeHTML(c.sku)}" ${(item.sku === c.sku || item.id === c.id) ? 'selected' : ''}>★ ${escapeHTML(c.vendor)} ${escapeHTML(c.model)} (${escapeHTML(c.sku)})</option>`).join('')}
              </optgroup>
            ` : ''}
            <optgroup label="All Catalog Camera SKUs">
              ${otherRealCams.map(c => `<option value="${escapeHTML(c.sku)}" ${(item.sku === c.sku || item.id === c.id) ? 'selected' : ''}>${escapeHTML(c.vendor)} ${escapeHTML(c.model)} (${escapeHTML(c.sku)})</option>`).join('')}
            </optgroup>
            <optgroup label="Generic Sizing Types">
              ${allGenCams.map(g => `<option value="${escapeHTML(g.id)}" ${(item.id === g.id || item.sku === g.sku) ? 'selected' : ''}>[Generic] ${escapeHTML(g.model)} (${escapeHTML(g.poeStandard)})</option>`).join('')}
            </optgroup>
          </select>
          <div class="flex items-center justify-between text-[9.5px] font-mono text-slate-400">
            <span>Stream: <strong class="text-teal-300">${item.heads || 1}x ${item.mpPerHead || item.sensorMegapixels || 2}MP @ ${item.defaultFps || 15}fps</strong></span>
            <span>Bitrate: <strong class="text-sky-300">${item.streamBitrateMbps || 4} Mbps</strong></span>
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="space-y-2.5">
        <div>
          <label class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Device Label:</label>
          <input type="text" value="${escapeHTML(node.name)}" onchange="updateNodeName('${escapeJSAttr(node.id)}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-brand-500 font-semibold" />
        </div>

        ${inspectorCameraSkuCardHtml}

        <div>
          <label class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Terminating Enclosure / Space:</label>
          <select onchange="updateNodeCloset('${escapeJSAttr(node.id)}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-brand-500 font-mono">
            <optgroup label="Spaces & Zones (Field / Unenclosed)">
              ${allClosets.filter(c => c.name.endsWith(' • Field')).map(c => `
                <option value="${c.id}" ${node.assignedClosetId === c.id ? 'selected' : ''}>${escapeHTML(c.name.replace(' • Field', ''))} [Field Drop] (${escapeHTML(c.floorName)})</option>
              `).join('')}
            </optgroup>
            <optgroup label="Racks & Enclosures">
              ${allClosets.filter(c => !c.name.endsWith(' • Field')).map(c => `
                <option value="${c.id}" ${node.assignedClosetId === c.id ? 'selected' : ''}>${escapeHTML(c.name)} (${escapeHTML(c.floorName)})</option>
              `).join('')}
            </optgroup>
          </select>
        </div>

        ${isCameraNode && doriTelem ? `
          <!-- Camera Optical FOV & DORI / PPF Coverage Card -->
          <div class="bg-slate-950 p-2.5 rounded-xl border border-emerald-500/40 space-y-2 shadow-sm">
            <div class="flex items-center justify-between">
              <span class="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1 font-mono">
                <i data-lucide="eye" class="w-3 h-3 text-emerald-400"></i> Optical FOV &amp; DORI
              </span>
              <span class="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border" style="color:${doriTelem.doriHex}; border-color:${doriTelem.doriHex}66; background:${doriTelem.doriHex}1a;">
                ${doriTelem.doriClass} &bull; ${doriTelem.ppf} PPF
              </span>
            </div>

            <div class="grid grid-cols-2 gap-1.5 text-[10px]">
              <div>
                <label class="text-[9px] uppercase font-mono text-slate-400 block mb-0.5">Aim Angle (&deg;)</label>
                <input type="number" min="0" max="359" step="5" value="${node.fovAngleDeg}" onchange="updateNodeFovSetting('${escapeJSAttr(node.id)}', 'fovAngleDeg', this.value)" class="w-full bg-slate-900 border border-slate-700 text-white rounded px-2 py-1 text-xs font-mono focus:border-emerald-500" />
              </div>
              <div>
                <label class="text-[9px] uppercase font-mono text-slate-400 block mb-0.5">Target Range (ft)</label>
                <input type="number" min="10" max="300" step="5" value="${node.fovDistanceFt}" onchange="updateNodeFovSetting('${escapeJSAttr(node.id)}', 'fovDistanceFt', this.value)" class="w-full bg-slate-900 border border-slate-700 text-white rounded px-2 py-1 text-xs font-mono focus:border-emerald-500" />
              </div>
              <div>
                <label class="text-[9px] uppercase font-mono text-slate-400 block mb-0.5">HFOV Aperture</label>
                <select onchange="updateNodeFovSetting('${escapeJSAttr(node.id)}', 'fovApertureDeg', this.value)" class="w-full bg-slate-900 border border-slate-700 text-white rounded px-1.5 py-1 text-[11px] font-mono focus:border-emerald-500">
                  ${[30, 45, 60, 75, 90, 102, 110, 120, 180, 270, 360].map(ap => `
                    <option value="${ap}" ${node.fovApertureDeg === ap ? 'selected' : ''}>${ap}&deg; ${ap === 360 ? '(Fisheye)' : (ap === 180 ? '(Pano)' : (ap <= 45 ? '(Tele)' : '(Wide)'))}</option>
                  `).join('')}
                </select>
              </div>
              <div>
                <label class="text-[9px] uppercase font-mono text-slate-400 block mb-0.5">Sensor MP</label>
                <select onchange="updateNodeFovSetting('${escapeJSAttr(node.id)}', 'resolutionMP', this.value)" class="w-full bg-slate-900 border border-slate-700 text-white rounded px-1.5 py-1 text-[11px] font-mono focus:border-emerald-500">
                  ${[2, 4, 5, 6, 8, 12, 16, 20, 32].map(mp => `
                    <option value="${mp}" ${node.resolutionMP === mp ? 'selected' : ''}>${mp}MP ${mp === 8 ? '(4K)' : (mp === 2 ? '(1080p)' : '')}</option>
                  `).join('')}
                </select>
              </div>
            </div>

            <div class="pt-1 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span>Scene Width @ ${node.fovDistanceFt}': <strong class="text-slate-200">${doriTelem.sceneWidthFt} ft</strong></span>
              ${!showCameraFovCones ? `
                <button type="button" onclick="toggleCameraFovCones()" class="text-emerald-400 hover:text-emerald-300 underline cursor-pointer font-bold">Show Cone</button>
              ` : `<span class="text-emerald-400/90">Drag grip to aim</span>`}
            </div>
          </div>
        ` : ''}

        <!-- Host Switch & Port Assignment Card -->
        <div class="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-[10px] uppercase font-bold text-sky-400 flex items-center gap-1 font-mono">
              <i data-lucide="network" class="w-3 h-3 text-sky-400"></i> Host Switch & Port
            </span>
            ${hostSwitch ? `
              <button type="button" onclick="openPortMatrixStudio('${escapeJSAttr(hostSwitch.instanceId)}')" class="text-[9px] font-mono text-amber-400 hover:text-amber-300 underline cursor-pointer flex items-center gap-1" title="Open Port Matrix Studio">
                <i data-lucide="grid" class="w-2.5 h-2.5"></i> Matrix
              </button>
            ` : ''}
          </div>

          <!-- Switch Select -->
          <div>
            <label class="text-[9px] uppercase font-mono text-slate-400 block mb-0.5">Switch</label>
            <select onchange="updateNodeHostSwitch('${escapeJSAttr(node.id)}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-brand-500 font-mono">
              <option value="">-- No Switch Assigned --</option>
              ${allSwitches.map(sw => {
                const swLoc = sw.closetName || sw.rackId || "Rack";
                const isSelected = hostSwitch && hostSwitch.instanceId === sw.instanceId;
                return `<option value="${sw.instanceId}" ${isSelected ? 'selected' : ''}>${escapeHTML(sw.friendlyName || sw.model)} (${escapeHTML(swLoc)})</option>`;
              }).join('')}
            </select>
          </div>

          <!-- Port Select -->
          ${hostSwitch ? `
            <div>
              <div class="flex items-center justify-between mb-0.5">
                <label class="text-[9px] uppercase font-mono text-slate-400">Switch Port</label>
                <span class="text-[9px] font-mono ${pwrBadge.isExternal ? 'text-amber-400' : 'text-emerald-400'}">${pwrBadge.badgeLabel || 'PoE'} (${pwrWatts}W)</span>
              </div>
              <select onchange="updateNodeSwitchPort('${escapeJSAttr(node.id)}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-brand-500 font-mono">
                ${hostSwitchPorts.filter(p => p.role === "access" && !p.isUplink).map(p => {
                  const isCurPort = (item && item.assignedSwitchPort === p.portNumber);
                  const isOcc = p.connectedDeviceId && !isCurPort;
                  const poeDesc = p.poeStandard ? `[${p.poeStandard.toUpperCase()} PoE]` : '[Data Only]';
                  return `
                    <option value="${p.portNumber}" ${isCurPort ? 'selected' : ''} ${isOcc ? 'class="text-slate-500"' : ''}>
                      ${p.shortLabel || `Port ${p.portNumber}`} (${p.speed || '1G'}) ${poeDesc} - ${isCurPort ? 'Current' : (isOcc ? `Occupied: ${escapeHTML(p.connectedDeviceModel || 'Other')}` : 'Free')}
                    </option>
                  `;
                }).join('')}
              </select>
            </div>
          ` : `
            <div class="text-[10px] text-amber-400/90 font-mono bg-amber-950/20 p-1.5 rounded border border-amber-800/40">
              Not connected to any switch. Select a switch above or auto-link from rack.
            </div>
          `}
        </div>

        <div>
          <label class="text-[10px] uppercase font-bold text-slate-400 block mb-1">Mounting Architecture:</label>
          <select onchange="updateNodeMountMethod('${escapeJSAttr(node.id)}', this.value)" class="w-full bg-slate-900 border border-slate-700 text-cyan-300 font-mono text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-brand-500">
            <option value="wall" ${(!node.mountMethod || node.mountMethod === 'wall') ? 'selected' : ''}>Wall Mount (Façade / Surface)</option>
            <option value="ceiling" ${node.mountMethod === 'ceiling' ? 'selected' : ''}>Ceiling / Soffit Mount</option>
            <option value="pole" ${node.mountMethod === 'pole' ? 'selected' : ''}>Pole / Mast Mount</option>
            <option value="parapet" ${node.mountMethod === 'parapet' ? 'selected' : ''}>Parapet Roof Mount</option>
            <option value="corner" ${node.mountMethod === 'corner' ? 'selected' : ''}>Corner Mount Bracket</option>
          </select>
        </div>

        <!-- TIA-606-C Cable ID & Pull Schedule Link -->
        <div class="bg-slate-950 p-2.5 rounded-xl border border-blue-500/40 space-y-1.5 shadow-sm">
          <div class="flex items-center justify-between text-[10px]">
            <span class="font-mono font-bold text-blue-400 uppercase flex items-center gap-1">
              <i data-lucide="tag" class="w-3 h-3 text-blue-400"></i> TIA-606-C Cable ID
            </span>
            <button type="button" onclick="openCablePullScheduleModal('${escapeJSAttr(node.instanceId || node.id)}')" class="text-[9px] font-mono text-blue-300 hover:text-white underline flex items-center gap-1 cursor-pointer">
              <i data-lucide="file-spreadsheet" class="w-2.5 h-2.5"></i> Pull Schedule
            </button>
          </div>
          <div class="flex items-center justify-between text-xs font-mono font-bold">
            <span class="text-blue-300 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/60">${getDeviceCableId(node)}</span>
            <span class="text-[10px] text-slate-400 font-normal">Cut: ${(run?.totalFt || 0) + 25} ft</span>
          </div>
        </div>

        ${run ? `
          <div class="bg-slate-900/90 p-2.5 rounded-lg border ${run.totalFt > 328 ? 'border-rose-500 bg-rose-950/20' : (run.totalFt > 295 ? 'border-amber-500 bg-amber-950/20' : 'border-slate-800')} text-[11px] font-mono space-y-1.5">
            <div class="flex justify-between items-center">
              <span class="text-slate-400 font-medium">Measured Run:</span>
              <span class="font-bold ${run.totalFt > 328 ? 'text-rose-400 animate-pulse' : (run.totalFt > 295 ? 'text-amber-400' : 'text-emerald-300')}">${run.totalFt} ft (${run.totalMeters}m)</span>
            </div>
            ${run.riserFt > 0 ? `<div class="flex justify-between text-[10px] text-sky-400"><span>Vertical Riser:</span><span>+${run.riserFt} ft</span></div>` : ''}
            ${run.traversedTrunks && run.traversedTrunks.length > 0 ? `<div class="flex justify-between text-[10px] text-amber-300"><span>Pathway Trunk:</span><span>Snapped (${run.traversedTrunks.length})</span></div>` : ''}
            <div class="flex justify-between text-[10px] text-slate-400 border-t border-slate-800/60 pt-1">
              <span>Service Loops (+25'):</span>
              <span class="text-slate-300">${run.totalFt + 25} ft Cut Length</span>
            </div>
            ${run.totalFt > 328 ? `
              <div class="text-[9.5px] text-rose-300 bg-rose-950/60 p-1.5 rounded border border-rose-800/80 leading-tight space-y-1">
                <div class="font-bold flex items-center gap-1 text-rose-400">
                  <i data-lucide="alert-triangle" class="w-3 h-3 text-rose-400"></i> TIA-568 Channel Limit Exceeded
                </div>
                <div>Exceeds 328 ft (100m) maximum channel distance. Rehome to a nearer IDF or insert a hardened PoE repeater/extender.</div>
              </div>
            ` : (run.totalFt > 295 ? `
              <div class="text-[9.5px] text-amber-300 bg-amber-950/60 p-1.5 rounded border border-amber-800/80 leading-tight space-y-1">
                <div class="font-bold flex items-center gap-1 text-amber-400">
                  <i data-lucide="alert-circle" class="w-3 h-3 text-amber-400"></i> Permanent Link Caution
                </div>
                <div>Exceeds 295 ft (90m) permanent link guideline. Reserve remaining channel budget for short equipment patch cords.</div>
              </div>
            ` : `
              <div class="text-[9px] text-emerald-400 font-mono flex items-center gap-1">
                <span>✓</span> TIA-568 Channel Compliant (&le;328 ft)
              </div>
            `)}
          </div>
        ` : ''}

        <!-- 4-Way Omnipresent Cross-Navigation Action Buttons -->
        <div class="pt-1 flex items-center gap-1.5 flex-wrap">
          <button 
            type="button" 
            onclick="jumpToTopologyTarget('node:${escapeJSAttr(node.instanceId || node.id)}')"
            class="flex-1 min-w-[65px] py-1 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/40 rounded text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
            title="Inspect logical port and link status in Topology"
          >
            <i data-lucide="network" class="w-3 h-3 text-indigo-400"></i> Topology
          </button>
          <button 
            type="button" 
            onclick="if ('${escapeJSAttr(hostSwitch ? hostSwitch.instanceId : '')}') openPortMatrixStudio('${escapeJSAttr(hostSwitch ? hostSwitch.instanceId : '')}'); else showToast('Assign a host switch first', 'warning');"
            class="flex-1 min-w-[65px] py-1 bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 border border-amber-500/40 rounded text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
            title="Open Port Matrix Studio for this switch"
          >
            <i data-lucide="grid" class="w-3 h-3 text-amber-400"></i> Matrix
          </button>
          <button 
            type="button" 
            onclick="jumpToBomTarget('${escapeJSAttr(node.instanceId || node.id)}')"
            class="flex-1 min-w-[65px] py-1 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 rounded text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
            title="Inspect line item in BOM Drawer"
          >
            <i data-lucide="file-spreadsheet" class="w-3 h-3 text-emerald-400"></i> BOM
          </button>
          <button 
            type="button" 
            onclick="const cl = getAllClosetsAcrossFacility().find(c => c.id === '${escapeJSAttr(node.assignedClosetId || '')}'); if (cl) deepLinkToRackElevation(cl.name);"
            class="flex-1 min-w-[65px] py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
            title="Open Terminating Enclosure"
          >
            <i data-lucide="server" class="w-3 h-3 text-indigo-400"></i> Enclosure
          </button>
        </div>

        <div class="flex items-center justify-between gap-2 pt-1 border-t border-slate-800">
          <button onclick="clearNodeWaypoints('${escapeJSAttr(node.id)}')" class="px-2 py-1 bg-slate-800 text-slate-300 hover:text-white rounded border border-slate-700 text-[10px]">
            Reset Bends
          </button>
          <div class="flex items-center gap-1.5">
            <button onclick="deleteNode('${escapeJSAttr(node.id)}')" class="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer" title="Remove drop from canvas only">
              <span>Delete Drop</span>
            </button>
            <button onclick="deleteDropFromBOM('${escapeJSAttr(node.id)}')" class="px-2.5 py-1 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-700/80 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer" title="Delete device from Quote BOM and canvas">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Delete from BOM
            </button>
          </div>
        </div>
      </div>
    `;
  }

  if (window.lucide) lucide.createIcons();
}

function clearNodeWaypoints(id) {
  const floor = getActiveFloor();
  if (!floor) return;
  const node = (floor.nodes || []).find(n => n.id === id);
  if (node) {
    node.waypoints = [];
    recalculateCurrentFloorCables();
    renderCableCanvas();
    renderInspector();
    saveFacilityState();
  }
}

function deepLinkToRackElevation(closetName) {
  if (typeof NavigationHistory !== "undefined") {
    const st = NavigationHistory.captureCurrentState();
    if (st && st.tool !== "facility") NavigationHistory.push(st);
  }
  if (typeof openRackViewerFor === "function") {
    openRackViewerFor(closetName);
  } else if (window.TabManager && typeof window.TabManager.openTab === "function") {
    window.TabManager.openTab("enclosures", closetName ? { locationName: closetName } : null);
  }
}

function updateNodeName(id, val) {
  const floor = getActiveFloor();
  if (!floor) return;
  const node = (floor.nodes || []).find(n => n.id === id);
  if (node && val && val.trim()) {
    const oldName = node.name;
    const newName = val.trim();
    node.name = newName;
    if (node.type === "closet" && typeof FacilityStore !== "undefined") {
      FacilityStore.renameLocation(oldName, newName);
    } else if (node.type === "device" && node.instanceId && typeof projectBOM !== "undefined") {
      const item = projectBOM.find(i => i.instanceId === node.instanceId);
      if (item && typeof DeviceTaxonomy !== "undefined") {
        DeviceTaxonomy.setFriendlyName(item, newName);
        if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
          FacilityStore.notifyWorkspaceChange();
        }
      }
    }
    recalculateCurrentFloorCables();
    renderCableCanvas();
    renderFloorSelector();
    saveFacilityState();
  }
}

function updateNodeCloset(id, closetId) {
  const floor = getActiveFloor();
  if (!floor) return;
  const node = (floor.nodes || []).find(n => n.id === id);
  if (node) {
    node.assignedClosetId = closetId;

    // Find the name of the assigned closet across all facility floors
    let targetClosetName = "";
    if (closetId) {
      for (const fl of facilityFloors) {
        const found = (fl.nodes || []).find(n => n.id === closetId);
        if (found) {
          targetClosetName = found.name;
          break;
        }
      }
    }

    // Synchronize underlying BOM item
    if (typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) {
      const match = projectBOM.find(i => (i.instanceId && (i.instanceId === node.instanceId || i.instanceId === node.id || ('dev-' + i.instanceId) === node.id)) || i.model === node.name);
      if (match && targetClosetName) {
        match.closetName = targetClosetName;
        match.rackId = targetClosetName;
        if (typeof PortEngine !== "undefined") {
          PortEngine.autoAssignDeviceToClosetSwitch(match, targetClosetName);
        }
      }
    }
    if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
      FacilityStore.notifyWorkspaceChange();
    }

    recalculateCurrentFloorCables();
    renderCableCanvas();
    renderInspector();
    saveFacilityState();
  }
}

function updateNodeMountMethod(id, method) {
  const floor = getActiveFloor();
  if (!floor) return;
  const node = (floor.nodes || []).find(n => n.id === id);
  if (node) {
    node.mountMethod = method;
    if (typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) {
      const match = projectBOM.find(i => (i.instanceId && (i.instanceId === node.instanceId || i.instanceId === node.id || ('dev-' + i.instanceId) === node.id)) || i.model === node.name);
      if (match) match.mountMethod = method;
    }
    if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
      FacilityStore.notifyWorkspaceChange();
    }
    saveFacilityState();
    renderCableCanvas();
    renderInspector();
    if (typeof showToast === "function") {
      showToast(`Updated mounting for ${node.name} to ${method}`);
    }
  }
}

function updateNodeHostSwitch(nodeId, newSwitchId) {
  const floor = getActiveFloor();
  if (!floor) return;
  const node = (floor.nodes || []).find(n => n.id === nodeId);
  if (!node) return;

  const item = projectBOM.find(i => (i.instanceId && (i.instanceId === node.instanceId || i.instanceId === node.id || ('dev-' + i.instanceId) === node.id)) || i.model === node.name);
  if (!item) return;

  const oldSwitchId = item.uplinkTargetId;

  if (typeof PortEngine !== "undefined") {
    if (oldSwitchId) {
      const oldSw = projectBOM.find(i => i.instanceId === oldSwitchId);
      if (oldSw && item.assignedSwitchPort) {
        PortEngine.disconnectPort(oldSw, item.assignedSwitchPort);
      }
    }
    if (newSwitchId) {
      const newSw = projectBOM.find(i => i.instanceId === newSwitchId);
      if (newSw) {
        PortEngine.allocatePort(newSw, item);
        // Also sync node's closet to match the switch's closet if possible
        const swClosetName = newSw.closetName || newSw.rackId;
        if (swClosetName) {
          const allClosets = getAllClosetsAcrossFacility();
          const targetCloset = allClosets.find(c => c.name === swClosetName || swClosetName.startsWith(c.name));
          if (targetCloset) {
            node.assignedClosetId = targetCloset.id;
          }
          item.closetName = swClosetName;
          item.rackId = swClosetName;
        }
      }
    } else {
      item.uplinkTargetId = null;
      item.assignedSwitchPort = null;
    }
  }

  FacilityStore.notifyWorkspaceChange();
  recalculateCurrentFloorCables();
  renderCableCanvas();
  renderInspector();
  saveFacilityState();
  if (typeof showToast === "function") {
    const sw = newSwitchId ? projectBOM.find(i => i.instanceId === newSwitchId) : null;
    showToast(sw ? `Connected ${item.model} to ${sw.friendlyName || sw.model} Port ${item.assignedSwitchPort || ''}` : `Disconnected ${item.model}`);
  }
}

function updateNodeSwitchPort(nodeId, newPortNumber) {
  const floor = getActiveFloor();
  if (!floor) return;
  const node = (floor.nodes || []).find(n => n.id === nodeId);
  if (!node) return;

  const item = projectBOM.find(i => (i.instanceId && (i.instanceId === node.instanceId || i.instanceId === node.id || ('dev-' + i.instanceId) === node.id)) || i.model === node.name);
  if (!item || !item.uplinkTargetId) return;

  const sw = projectBOM.find(i => i.instanceId === item.uplinkTargetId);
  if (!sw) return;

  const portNum = parseInt(newPortNumber, 10);
  if (typeof PortEngine !== "undefined") {
    PortEngine.connect(sw, portNum, item, 1);
  } else {
    item.assignedSwitchPort = portNum;
  }

  FacilityStore.notifyWorkspaceChange();
  renderInspector();
  saveFacilityState();
  if (typeof showToast === "function") {
    showToast(`Assigned ${item.model} to ${sw.friendlyName || sw.model} Port ${portNum}`);
  }
}

function moveClosetToFloor(closetId, newFloorId) {
  let foundCloset = null;
  facilityFloors.forEach(fl => {
    if (!fl.nodes) fl.nodes = [];
    const bomByInstanceId = new Map((typeof projectBOM !== "undefined" && Array.isArray(projectBOM) ? projectBOM : []).map(i => [i.instanceId, i]));
    const allClosets = getAllClosetsAcrossFacility();
    const closetById = new Map(allClosets.map(c => [c.id, c]));
    const idx = fl.nodes.findIndex(n => n.id === closetId);
    if (idx !== -1) {
      foundCloset = fl.nodes.splice(idx, 1)[0];
    }
  });

  if (foundCloset) {
    foundCloset.floorId = newFloorId;
    const destFloor = facilityFloors.find(f => f.id === newFloorId);
    if (destFloor) {
      destFloor.nodes.push(foundCloset);
      if (typeof FacilityStore !== "undefined") {
        const parsed = FacilityStore.parse(foundCloset.name);
        if (parsed.spaceId) {
          FacilityStore.updateSpace(parsed.spaceId, { floorId: newFloorId });
        }
      }
      recalculateCurrentFloorCables();
      renderCableCanvas();
      renderInspector();
      saveFacilityState();
      if (typeof showToast === "function") {
        showToast(`Moved ${foundCloset.name} to ${destFloor.name}`);
      }
    }
  }
}

function deleteNode(id) {
  const floor = getActiveFloor();
  if (floor) {
    floor.nodes = (floor.nodes || []).filter(n => n.id !== id);
  }
  selectedNodeId = null;
  recalculateCurrentFloorCables();
  renderCableCanvas();
  renderInspector();
  renderFloorSelector();
  renderSidebarTabContent();
  saveFacilityState();
}

function deleteDropFromBOM(id) {
  const floor = getActiveFloor();
  const node = floor ? (floor.nodes || []).find(n => n.id === id) : null;
  let instanceId = id;
  if (node) {
    instanceId = node.instanceId || (node.id && node.id.startsWith("dev-") ? node.id.replace("dev-", "") : node.id);
  }

  // Delete from Quote BOM and all dependent subsystems
  if (typeof deleteDeviceFromBOM === "function") {
    deleteDeviceFromBOM(instanceId);
  } else if (typeof removeBomItem === "function") {
    removeBomItem(instanceId);
  }
  // Ensure canvas node is removed
  deleteNode(id);
}

