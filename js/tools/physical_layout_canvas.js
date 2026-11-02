// =========================================================================
// PHYSICAL LAYOUT SVG CANVAS RENDERER, BOM CABLING COMMIT & BULK OPS ENGINE
// Separated from js/tools/physical_layout.js for modular maintainability
// =========================================================================

// -----------------------------------------------------------
// SVG Vector Rendering
// -----------------------------------------------------------
function renderCableCanvas() {
  const svg = document.getElementById("cableSvgCanvas");
  if (!svg) return;

  const floor = getActiveFloor();
  if (!floor) {
    svg.innerHTML = `
      <defs>
        <pattern id="cableGrid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(51, 65, 85, 0.15)" stroke-width="1"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#cableGrid)" />
      <g transform="translate(450, 300)" text-anchor="middle" class="cursor-pointer" onclick="promptAddNewFloor()">
        <rect x="-180" y="-80" width="360" height="160" rx="16" fill="#0f172a" stroke="#334155" stroke-dasharray="6,6" stroke-width="2"/>
        <circle cx="0" cy="-20" r="28" fill="#1e293b"/>
        <path d="M -12 -20 L 12 -20 M 0 -32 L 0 -8" stroke="#f59e0b" stroke-width="3" stroke-linecap="round"/>
        <text x="0" y="25" fill="#f8fafc" font-size="16" font-weight="bold" font-family="system-ui, sans-serif">No Floors/Buildings Defined</text>
        <text x="0" y="48" fill="#94a3b8" font-size="12" font-family="system-ui, sans-serif">Click here or "+ Floor/Building" to create your first plan</text>
      </g>
    `;
    return;
  }
  const allClosets = getAllClosetsAcrossFacility();

  svg.innerHTML = `
    <defs>
      <pattern id="cableGrid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(51, 65, 85, 0.15)" stroke-width="1"/>
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#cableGrid)" />

    ${floor.image ? `
      <image id="svgFloorPlanImage" href="${floor.image}" x="0" y="0" width="4500" height="2800" preserveAspectRatio="xMidYMid meet" opacity="${floor.opacity || 0.7}" />
    ` : (!floor.nodes || floor.nodes.length === 0) ? `
      <g transform="translate(620, 380)" text-anchor="middle" class="opacity-80 select-none pointer-events-none">
        <rect x="-260" y="-100" width="520" height="200" rx="16" fill="#0f172a" fill-opacity="0.85" stroke="#334155" stroke-dasharray="6 6" stroke-width="1.5" />
        <circle cx="0" cy="-35" r="28" fill="#1e293b"/>
        <path d="M -10 -35 L 10 -35 M 0 -45 L 0 -25" stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round"/>
        <text x="0" y="10" fill="#f1f5f9" font-size="16" font-weight="bold" font-family="system-ui, sans-serif">Upload Plan or Place Equipment</text>
        <text x="0" y="32" fill="#94a3b8" font-size="12" font-family="system-ui, sans-serif">Use "Upload Plan" for PDF/CAD or press [D] for Drop, [C] for Closet</text>
        <text x="0" y="52" fill="#64748b" font-size="11" font-family="system-ui, sans-serif">Press [V] Select • [M] Marquee • [T] Trunk • [F] Fiber • [R] Calibrate Scale</text>
      </g>
    ` : ''}
  `;

  // 1. Fiber Backbones
  if (physicalLayerFilters.pathways) {
    const sortedFbs = [...(floor.fiberBackbones || [])].sort((a, b) => {
      if (a.id === selectedFiberBackboneId) return 1;
      if (b.id === selectedFiberBackboneId) return -1;
      return 0;
    });
    sortedFbs.forEach(fb => {
      const c1 = floor.nodes.find(n => n.id === fb.fromId);
      const c2 = floor.nodes.find(n => n.id === fb.toId);
      if (!c1 || !c2) return;

      const isSelected = (fb.id === selectedFiberBackboneId);
      const fType = (fb.fiberType || (typeof getProjectFiberType === "function" ? getProjectFiberType() : "mmf")).toLowerCase();
      const isSMF = (fType === "smf");
      const strands = fb.strandCount || 12;
      const strokeColor = isSMF ? "#eab308" : "#06b6d4"; // Gold for SMF, Cyan for MMF
      const textColor = isSMF ? "#fde047" : "#67e8f9";
      const badgeBorder = isSMF ? "#ca8a04" : "#0891b2";
      const typeLabel = isSMF ? "OS2 SMF" : "OM4 MMF";

      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("class", "fiber-backbone-link cursor-pointer group");
      g.setAttribute("data-fiber-id", fb.id);
      g.onclick = (e) => {
        selectFiberBackbone(fb.id, e);
      };

      // Selection Halo / Glow
      if (isSelected) {
        const halo = document.createElementNS("http://www.w3.org/2000/svg", "line");
        halo.setAttribute("x1", c1.x);
        halo.setAttribute("y1", c1.y);
        halo.setAttribute("x2", c2.x);
        halo.setAttribute("y2", c2.y);
        halo.setAttribute("stroke", isSMF ? "#fef08a" : "#a5f3fc");
        halo.setAttribute("stroke-width", "14");
        halo.setAttribute("stroke-linecap", "round");
        halo.setAttribute("opacity", "0.4");
        g.appendChild(halo);
      }

      // Invisible wider hit area for easy clicking
      const hitArea = document.createElementNS("http://www.w3.org/2000/svg", "line");
      hitArea.setAttribute("x1", c1.x);
      hitArea.setAttribute("y1", c1.y);
      hitArea.setAttribute("x2", c2.x);
      hitArea.setAttribute("y2", c2.y);
      hitArea.setAttribute("stroke", "transparent");
      hitArea.setAttribute("stroke-width", "24");
      hitArea.setAttribute("cursor", "pointer");
      g.appendChild(hitArea);

      // Main dashed fiber line
      const path = document.createElementNS("http://www.w3.org/2000/svg", "line");
      path.setAttribute("x1", c1.x);
      path.setAttribute("y1", c1.y);
      path.setAttribute("x2", c2.x);
      path.setAttribute("y2", c2.y);
      path.setAttribute("stroke", strokeColor);
      path.setAttribute("stroke-width", isSelected ? "5" : "4");
      path.setAttribute("stroke-dasharray", "8,4");
      path.setAttribute("stroke-linecap", "round");
      path.setAttribute("opacity", isSelected ? "1.0" : "0.9");
      g.appendChild(path);

      // Midpoint badge
      const midX = (c1.x + c2.x) / 2;
      const midY = (c1.y + c2.y) / 2;

      // Badge background rect
      const labelText = `${strands}F ${typeLabel} • ${fb.totalFt || 100} ft`;
      const badgeWidth = Math.max(140, labelText.length * 7.5 + 44);
      const badgeHeight = 24;

      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("x", midX - (badgeWidth / 2));
      rect.setAttribute("y", midY - 12);
      rect.setAttribute("width", badgeWidth);
      rect.setAttribute("height", badgeHeight);
      rect.setAttribute("rx", "12");
      rect.setAttribute("fill", isSelected ? (isSMF ? "#854d0e" : "#0e7490") : "#090d16");
      rect.setAttribute("stroke", isSelected ? (isSMF ? "#fef08a" : "#67e8f9") : badgeBorder);
      rect.setAttribute("stroke-width", isSelected ? "2" : "1.5");
      rect.setAttribute("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.5))");
      g.appendChild(rect);

      const tag = document.createElementNS("http://www.w3.org/2000/svg", "text");
      tag.setAttribute("x", midX - 9);
      tag.setAttribute("y", midY + 4);
      tag.setAttribute("text-anchor", "middle");
      tag.setAttribute("fill", textColor);
      tag.setAttribute("font-size", "10");
      tag.setAttribute("font-family", "ui-monospace, SFMono-Regular, monospace");
      tag.setAttribute("font-weight", "bold");
      tag.textContent = labelText;
      g.appendChild(tag);

      // On-canvas delete button (circle + ✕) on the right edge of badge
      const delCircleX = midX + (badgeWidth / 2) - 13;
      const delCircleY = midY;
      
      const delG = document.createElementNS("http://www.w3.org/2000/svg", "g");
      delG.setAttribute("class", "cursor-pointer fiber-link-delete-btn fiber-link-badge-delete-circle");
      delG.setAttribute("role", "button");
      delG.setAttribute("data-action", "delete-fiber");
      delG.setAttribute("data-fiber-id", fb.id);
      delG.setAttribute("aria-label", "Delete fiber backbone");
      delG.style.pointerEvents = "all";

      const onDelTrigger = (e) => {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
          if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
        }
        deleteFiberBackbone(fb.id, e);
      };
      delG.onpointerdown = (e) => e.stopPropagation();
      delG.onmousedown = onDelTrigger;
      delG.onclick = onDelTrigger;

      const delCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      delCircle.setAttribute("cx", delCircleX);
      delCircle.setAttribute("cy", delCircleY);
      delCircle.setAttribute("r", "8");
      delCircle.setAttribute("fill", "#be123c");
      delCircle.setAttribute("stroke", "#fda4af");
      delCircle.setAttribute("stroke-width", "1");
      delCircle.style.pointerEvents = "all";
      delG.appendChild(delCircle);

      const delCross = document.createElementNS("http://www.w3.org/2000/svg", "text");
      delCross.setAttribute("x", delCircleX);
      delCross.setAttribute("y", delCircleY + 3.5);
      delCross.setAttribute("text-anchor", "middle");
      delCross.setAttribute("fill", "#ffffff");
      delCross.setAttribute("font-size", "10");
      delCross.setAttribute("font-family", "sans-serif");
      delCross.setAttribute("font-weight", "bold");
      delCross.style.pointerEvents = "none";
      delCross.textContent = "✕";
      delG.appendChild(delCross);

      g.appendChild(delG);

      // When selected, also draw a floating action button above the badge: [ Delete Link ✕ ]
      if (isSelected) {
        const actionG = document.createElementNS("http://www.w3.org/2000/svg", "g");
        actionG.setAttribute("class", "cursor-pointer fiber-link-delete-btn fiber-link-floating-delete-pill");
        actionG.setAttribute("role", "button");
        actionG.setAttribute("data-action", "delete-fiber");
        actionG.setAttribute("data-fiber-id", fb.id);
        actionG.style.pointerEvents = "all";

        const onActionTrigger = (e) => {
          if (e) {
            e.preventDefault();
            e.stopPropagation();
            if (typeof e.stopImmediatePropagation === "function") e.stopImmediatePropagation();
          }
          deleteFiberBackbone(fb.id, e);
        };
        actionG.onpointerdown = (e) => e.stopPropagation();
        actionG.onmousedown = onActionTrigger;
        actionG.onclick = onActionTrigger;

        const pillW = 114;
        const pillH = 22;
        const pillX = midX - (pillW / 2);
        const pillY = midY - 38;

        const pillRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        pillRect.setAttribute("x", pillX);
        pillRect.setAttribute("y", pillY);
        pillRect.setAttribute("width", pillW);
        pillRect.setAttribute("height", pillH);
        pillRect.setAttribute("rx", "11");
        pillRect.setAttribute("fill", "#be123c");
        pillRect.setAttribute("stroke", "#ffffff");
        pillRect.setAttribute("stroke-width", "1.5");
        pillRect.setAttribute("filter", "drop-shadow(0 4px 6px rgba(0,0,0,0.6))");
        pillRect.style.pointerEvents = "all";
        actionG.appendChild(pillRect);

        const pillText = document.createElementNS("http://www.w3.org/2000/svg", "text");
        pillText.setAttribute("x", midX);
        pillText.setAttribute("y", pillY + 14);
        pillText.setAttribute("text-anchor", "middle");
        pillText.setAttribute("fill", "#ffffff");
        pillText.setAttribute("font-size", "10");
        pillText.setAttribute("font-family", "ui-sans-serif, system-ui, sans-serif");
        pillText.setAttribute("font-weight", "bold");
        pillText.style.pointerEvents = "none";
        pillText.textContent = "🗑 Delete Link ✕";
        actionG.appendChild(pillText);

        g.appendChild(actionG);
      }

      svg.appendChild(g);
    });
  }

  // 1b. Main Pathway Corridors / Cable Trays / J-Hook Trunks
  if (physicalLayerFilters.pathways && floor.pathwayTrunks) {
    floor.pathwayTrunks.forEach(trunk => {
      if (!trunk.points || trunk.points.length < 2) return;
      const isSelected = trunk.id === selectedPathwayTrunkId;
      const pts = trunk.points;

      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("class", "pathway-corridor-interactive cursor-pointer group");
      g.setAttribute("data-pathway-id", trunk.id);

      // Count cables running near or snapped through this pathway trunk
      let routedCablesCount = 0;
      floor.nodes.filter(n => n.type === "device").forEach(d => {
        if (d.calculatedRun) {
          const snapped = Array.isArray(d.calculatedRun.traversedTrunks) && d.calculatedRun.traversedTrunks.includes(trunk.id);
          const isNear = !snapped && d.calculatedRun.points && d.calculatedRun.points.some(p => pts.some(tp => Math.hypot(p.x - tp.x, p.y - tp.y) < 45));
          if (snapped || isNear) routedCablesCount++;
        }
      });
      const capacity = trunk.capacity || 80;
      const fillPct = Math.round((routedCablesCount / capacity) * 100);
      const maxFillPct = trunk.type === "conduit" ? 40 : 50;
      const isOverfilled = fillPct > maxFillPct;

      let trunkColor = "#f59e0b"; // Amber for tray
      let strokeDash = "none";
      let strokeW = 10;
      if (trunk.type === "jhook") {
        trunkColor = "#06b6d4";
        strokeDash = "8 6";
        strokeW = 6;
      } else if (trunk.type === "conduit") {
        trunkColor = "#38bdf8";
        strokeW = 8;
      } else if (trunk.type === "ladder") {
        trunkColor = "#a855f7";
        strokeW = 12;
      }

      // Selection Halo
      if (isSelected) {
        for (let i = 0; i < pts.length - 1; i++) {
          const halo = document.createElementNS("http://www.w3.org/2000/svg", "line");
          halo.setAttribute("x1", pts[i].x);
          halo.setAttribute("y1", pts[i].y);
          halo.setAttribute("x2", pts[i + 1].x);
          halo.setAttribute("y2", pts[i + 1].y);
          halo.setAttribute("stroke", "#fde047");
          halo.setAttribute("stroke-width", strokeW + 10);
          halo.setAttribute("stroke-linecap", "round");
          halo.setAttribute("opacity", "0.35");
          g.appendChild(halo);
        }
      }

      // Draw Main Corridor Line
      for (let i = 0; i < pts.length - 1; i++) {
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", pts[i].x);
        line.setAttribute("y1", pts[i].y);
        line.setAttribute("x2", pts[i + 1].x);
        line.setAttribute("y2", pts[i + 1].y);
        line.setAttribute("stroke", trunkColor);
        line.setAttribute("stroke-width", strokeW);
        line.setAttribute("stroke-linecap", "round");
        line.setAttribute("stroke-dasharray", strokeDash);
        line.setAttribute("opacity", isSelected ? "1.0" : "0.85");
        g.appendChild(line);

        // Center stripe for cable tray appearance
        if (trunk.type === "tray" || trunk.type === "ladder" || !trunk.type) {
          const innerLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
          innerLine.setAttribute("x1", pts[i].x);
          innerLine.setAttribute("y1", pts[i].y);
          innerLine.setAttribute("x2", pts[i + 1].x);
          innerLine.setAttribute("y2", pts[i + 1].y);
          innerLine.setAttribute("stroke", "#0f172a");
          innerLine.setAttribute("stroke-width", Math.max(2, strokeW - 4));
          innerLine.setAttribute("stroke-linecap", "round");
          g.appendChild(innerLine);
        }
      }

      // Render Joints/Waypoint handles for moving corridor points
      pts.forEach((pt, pIdx) => {
        const joint = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        joint.setAttribute("class", "draggable-pathway-joint cursor-move");
        joint.setAttribute("data-pathway-id", trunk.id);
        joint.setAttribute("data-joint-idx", pIdx);
        joint.setAttribute("cx", pt.x);
        joint.setAttribute("cy", pt.y);
        joint.setAttribute("r", isSelected ? "7" : "5");
        joint.setAttribute("fill", trunkColor);
        joint.setAttribute("stroke", "#ffffff");
        joint.setAttribute("stroke-width", "2");
        g.appendChild(joint);
      });

      // Corridor Center Badge with fill count
      const midIdx = Math.floor(pts.length / 2);
      const midX = (pts[midIdx - 1].x + pts[midIdx].x) / 2;
      const midY = (pts[midIdx - 1].y + pts[midIdx].y) / 2;

      const badgeW = 158;
      const badgeH = 22;
      const bgRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      bgRect.setAttribute("x", midX - (badgeW / 2));
      bgRect.setAttribute("y", midY - (badgeH / 2));
      bgRect.setAttribute("width", badgeW);
      bgRect.setAttribute("height", badgeH);
      bgRect.setAttribute("rx", "11");
      bgRect.setAttribute("fill", "#0f172a");
      bgRect.setAttribute("stroke", isOverfilled ? "#f43f5e" : trunkColor);
      bgRect.setAttribute("stroke-width", "1.5");
      bgRect.setAttribute("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.5))");
      g.appendChild(bgRect);

      const bText = document.createElementNS("http://www.w3.org/2000/svg", "text");
      bText.setAttribute("x", midX);
      bText.setAttribute("y", midY + 4);
      bText.setAttribute("text-anchor", "middle");
      bText.setAttribute("fill", isOverfilled ? "#fb7185" : "#f8fafc");
      bText.setAttribute("font-size", "9.5");
      bText.setAttribute("font-family", "monospace");
      bText.setAttribute("font-weight", "bold");
      bText.textContent = `${trunk.name.slice(0, 11)}: ${routedCablesCount}/${capacity} (${fillPct}%)`;
      g.appendChild(bText);

      svg.appendChild(g);
    });
  }

  // 2. Horizontal Cable Pathways
  if (physicalLayerFilters.pathways) {
    floor.nodes.filter(n => n.type === "device").forEach(dev => {
      const bomItem = (typeof projectBOM !== "undefined" && dev.instanceId) ? projectBOM.find(i => i.instanceId === dev.instanceId) : null;
      const layerType = getDeviceLayerType(bomItem || dev);
      if (!physicalLayerFilters[layerType]) return;

      let closet = allClosets.find(c => c.id === dev.assignedClosetId);
      if (!closet && allClosets.length > 0) closet = allClosets[0];
      if (!closet) return;

      const run = dev.calculatedRun || { totalFt: 0, points: [{ x: closet.x, y: closet.y }, { x: dev.x, y: dev.y }] };
      const isSelected = dev.id === selectedNodeId || closet.id === selectedNodeId || (selectedNodeIds && (selectedNodeIds.has(dev.id) || selectedNodeIds.has(closet.id)));
      const isCrossFloor = closet.floorId !== floor.id;
      const pts = run.points || [{ x: closet.x, y: closet.y }, { x: dev.x, y: dev.y }];

      const runStd = (typeof getProjectCablingStandard === "function")
        ? getProjectCablingStandard(bomItem || dev, "run")
        : { color: "Yellow", hex: "#eab308" };
      const cableColorHex = runStd.hex || "#eab308";

      const runG = document.createElementNS("http://www.w3.org/2000/svg", "g");
      runG.setAttribute("class", "device-cable-run-group");
      runG.setAttribute("data-cable-group-id", dev.id);

      for (let i = 0; i < pts.length - 1; i++) {
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("class", "cable-path-line cursor-pointer");
        line.setAttribute("data-drop-id", dev.id);
        line.setAttribute("x1", pts[i].x);
        line.setAttribute("y1", pts[i].y);
        line.setAttribute("x2", pts[i + 1].x);
        line.setAttribute("y2", pts[i + 1].y);
        line.setAttribute("stroke", run.isExceeded ? "#f43f5e" : isCrossFloor ? "#38bdf8" : isSelected ? "#a855f7" : cableColorHex);
        line.setAttribute("stroke-width", isSelected ? "4" : "2.5");
        line.setAttribute("stroke-dasharray", isCrossFloor ? "4,4" : run.isExceeded ? "6,4" : "none");
        line.setAttribute("opacity", isSelected ? "1.0" : "0.75");
        runG.appendChild(line);
      }

      if (dev.waypoints && dev.waypoints.length > 0) {
        dev.waypoints.forEach((wp, idx) => {
          const wpCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
          wpCircle.setAttribute("class", "draggable-waypoint-handle cursor-move");
          wpCircle.setAttribute("data-drop-id", dev.id);
          wpCircle.setAttribute("data-waypoint-idx", idx);
          wpCircle.setAttribute("cx", wp.x);
          wpCircle.setAttribute("cy", wp.y);
          wpCircle.setAttribute("r", 7);
          wpCircle.setAttribute("fill", cableColorHex);
          wpCircle.setAttribute("stroke", "#ffffff");
          wpCircle.setAttribute("stroke-width", "2");
          runG.appendChild(wpCircle);
        });
      }

      const midIdx = Math.floor(pts.length / 2);
      const midX = (pts[midIdx - 1].x + pts[midIdx].x) / 2;
      const midY = (pts[midIdx - 1].y + pts[midIdx].y) / 2;

      const tag = document.createElementNS("http://www.w3.org/2000/svg", "text");
      tag.setAttribute("class", "cable-footage-tag");
      tag.setAttribute("x", midX);
      tag.setAttribute("y", midY - 6);
      tag.setAttribute("text-anchor", "middle");
      tag.setAttribute("fill", run.isExceeded ? "#fb7185" : isCrossFloor ? "#7dd3fc" : "#cbd5e1");
      tag.setAttribute("font-size", "10");
      tag.setAttribute("font-family", "monospace");
      tag.setAttribute("font-weight", "bold");
      const snappedCount = (run.traversedTrunks && run.traversedTrunks.length) ? ` [Tray]` : "";
      tag.textContent = `${run.totalFt} ft ${isCrossFloor ? `(Riser)` : ''}${snappedCount}`;
      runG.appendChild(tag);

      svg.appendChild(runG);
    });
  }

  // 2b. Interactive Camera FOV & DORI / PPF Spatial Cones
  if (showCameraFovCones && physicalLayerFilters.cameras && (typeof window.FEATURE_FLAGS === "undefined" || window.FEATURE_FLAGS.enableSpecificCameraDetails === true)) {
    floor.nodes.filter(n => n.type === "device").forEach(dev => {
      const bomItem = (typeof projectBOM !== "undefined" && dev.instanceId) ? projectBOM.find(i => i.instanceId === dev.instanceId) : null;
      const layerType = getDeviceLayerType(bomItem || dev);
      if (layerType !== "cameras") return;

      const isSelected = (dev.id === selectedNodeId) || (selectedNodeIds && selectedNodeIds.has(dev.id));
      const fovG = document.createElementNS("http://www.w3.org/2000/svg", "g");
      fovG.setAttribute("class", "camera-fov-cone-group");
      fovG.setAttribute("data-fov-node-id", dev.id);
      fovG.setAttribute("transform", `translate(${dev.x}, ${dev.y})`);
      renderCameraFovGroupContent(fovG, dev, bomItem, floor, isSelected);
      svg.appendChild(fovG);
    });
  }

  // 3. Closets & Mounting Hosts (Poles, NEMA Boxes, Cabinets, Racks, Backboards)
  if (physicalLayerFilters.closets) {
    floor.nodes.filter(n => n.type === "closet").forEach(closet => {
      const isSelected = (closet.id === selectedNodeId) || (selectedNodeIds && selectedNodeIds.has(closet.id));
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("class", "draggable-canvas-node cursor-pointer");
      g.setAttribute("data-node-id", closet.id);
      g.setAttribute("transform", `translate(${closet.x}, ${closet.y})`);

      let hostType = closet.hostType;
      if (!hostType && typeof FacilityStore !== "undefined") {
        const parsed = FacilityStore.parse(closet.name);
        hostType = parsed.hostType;
      }
      hostType = hostType || "equipment_rack";
      const isFieldSpace = (hostType === "field") || (closet.name && closet.name.endsWith(" • Field"));

      if (isFieldSpace) {
        // 0. Field Space / Unenclosed Area Boundary
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("x", "-24"); rect.setAttribute("y", "-24");
        rect.setAttribute("width", "48"); rect.setAttribute("height", "48");
        rect.setAttribute("rx", "12");
        rect.setAttribute("fill", isSelected ? "#451a03" : "#1c1917");
        rect.setAttribute("stroke", isSelected ? "#fbbf24" : "#f59e0b");
        rect.setAttribute("stroke-width", isSelected ? "3.5" : "2.5");
        rect.setAttribute("stroke-dasharray", "4 3");
        g.appendChild(rect);

        const centerCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        centerCircle.setAttribute("r", "8");
        centerCircle.setAttribute("fill", "#d97706");
        centerCircle.setAttribute("opacity", "0.4");
        g.appendChild(centerCircle);

        const centerDot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        centerDot.setAttribute("r", "3.5");
        centerDot.setAttribute("fill", "#fbbf24");
        g.appendChild(centerDot);

      } else if (hostType === "structural_mount") {
        // 1. Structural Pole Mast (Circular Base with Mast Crosshairs & Radar Boundary)
        const outerCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        outerCircle.setAttribute("r", isSelected ? "32" : "28");
        outerCircle.setAttribute("fill", "none");
        outerCircle.setAttribute("stroke", isSelected ? "#38bdf8" : "#0284c7");
        outerCircle.setAttribute("stroke-width", "1.5");
        outerCircle.setAttribute("stroke-dasharray", "4 2");
        g.appendChild(outerCircle);

        const mastCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        mastCircle.setAttribute("r", "20");
        mastCircle.setAttribute("fill", isSelected ? "#0c4a6e" : "#082f49");
        mastCircle.setAttribute("stroke", isSelected ? "#38bdf8" : "#0284c7");
        mastCircle.setAttribute("stroke-width", isSelected ? "3.5" : "2.5");
        g.appendChild(mastCircle);

        const lineH = document.createElementNS("http://www.w3.org/2000/svg", "line");
        lineH.setAttribute("x1", "-12"); lineH.setAttribute("y1", "0");
        lineH.setAttribute("x2", "12"); lineH.setAttribute("y2", "0");
        lineH.setAttribute("stroke", "#38bdf8"); lineH.setAttribute("stroke-width", "1.5");
        g.appendChild(lineH);

        const lineV = document.createElementNS("http://www.w3.org/2000/svg", "line");
        lineV.setAttribute("x1", "0"); lineV.setAttribute("y1", "-12");
        lineV.setAttribute("x2", "0"); lineV.setAttribute("y2", "12");
        lineV.setAttribute("stroke", "#38bdf8"); lineV.setAttribute("stroke-width", "1.5");
        g.appendChild(lineV);

        const centerDot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        centerDot.setAttribute("r", "3.5");
        centerDot.setAttribute("fill", "#38bdf8");
        g.appendChild(centerDot);

      } else if (hostType === "industrial_din") {
        // 2. Weatherproof DIN / NEMA Box (Industrial Enclosure with Dual Rails)
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("x", "-24"); rect.setAttribute("y", "-24");
        rect.setAttribute("width", "48"); rect.setAttribute("height", "48");
        rect.setAttribute("rx", "8");
        rect.setAttribute("fill", isSelected ? "#78350f" : "#451a03");
        rect.setAttribute("stroke", isSelected ? "#fbbf24" : "#d97706");
        rect.setAttribute("stroke-width", isSelected ? "3.5" : "2.5");
        g.appendChild(rect);

        const r1 = document.createElementNS("http://www.w3.org/2000/svg", "line");
        r1.setAttribute("x1", "-16"); r1.setAttribute("y1", "-8");
        r1.setAttribute("x2", "16"); r1.setAttribute("y2", "-8");
        r1.setAttribute("stroke", "#fbbf24"); r1.setAttribute("stroke-width", "2.5");
        g.appendChild(r1);

        const r2 = document.createElementNS("http://www.w3.org/2000/svg", "line");
        r2.setAttribute("x1", "-16"); r2.setAttribute("y1", "8");
        r2.setAttribute("x2", "16"); r2.setAttribute("y2", "8");
        r2.setAttribute("stroke", "#fbbf24"); r2.setAttribute("stroke-width", "2.5");
        g.appendChild(r2);

      } else if (hostType === "security_cabinet") {
        // 3. Security Cabinet (Trove Subplate Bay Grid)
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("x", "-24"); rect.setAttribute("y", "-24");
        rect.setAttribute("width", "48"); rect.setAttribute("height", "48");
        rect.setAttribute("rx", "8");
        rect.setAttribute("fill", isSelected ? "#064e3b" : "#022c22");
        rect.setAttribute("stroke", isSelected ? "#34d399" : "#059669");
        rect.setAttribute("stroke-width", isSelected ? "3.5" : "2.5");
        g.appendChild(rect);

        [[-16, -16], [2, -16], [-16, 2], [2, 2]].forEach(([bx, by]) => {
          const bay = document.createElementNS("http://www.w3.org/2000/svg", "rect");
          bay.setAttribute("x", bx); bay.setAttribute("y", by);
          bay.setAttribute("width", "14"); bay.setAttribute("height", "14");
          bay.setAttribute("rx", "2");
          bay.setAttribute("fill", "#047857");
          bay.setAttribute("opacity", "0.7");
          g.appendChild(bay);
        });

      } else if (hostType === "architectural_backboard") {
        // 4. Architectural Backboard (Plywood Wallfield)
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("x", "-26"); rect.setAttribute("y", "-20");
        rect.setAttribute("width", "52"); rect.setAttribute("height", "40");
        rect.setAttribute("rx", "4");
        rect.setAttribute("fill", isSelected ? "#581c87" : "#3b0764");
        rect.setAttribute("stroke", isSelected ? "#d8b4fe" : "#a855f7");
        rect.setAttribute("stroke-width", isSelected ? "3.5" : "2.5");
        g.appendChild(rect);

        [-6, 6].forEach(py => {
          const pb = document.createElementNS("http://www.w3.org/2000/svg", "line");
          pb.setAttribute("x1", "-18"); pb.setAttribute("y1", py);
          pb.setAttribute("x2", "18"); pb.setAttribute("y2", py);
          pb.setAttribute("stroke", "#e9d5ff");
          pb.setAttribute("stroke-width", "1.5");
          pb.setAttribute("stroke-dasharray", "4 2");
          g.appendChild(pb);
        });

      } else {
        // 5. Standard 19" EIA Rack Chassis
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("x", "-22"); rect.setAttribute("y", "-26");
        rect.setAttribute("width", "44"); rect.setAttribute("height", "52");
        rect.setAttribute("rx", "6");
        rect.setAttribute("fill", isSelected ? "#312e81" : "#1e1b4b");
        rect.setAttribute("stroke", isSelected ? "#a5b4fc" : "#6366f1");
        rect.setAttribute("stroke-width", isSelected ? "3.5" : "2.5");
        g.appendChild(rect);

        [-16, -7, 2, 11].forEach(ry => {
          const ru = document.createElementNS("http://www.w3.org/2000/svg", "rect");
          ru.setAttribute("x", "-15"); ru.setAttribute("y", ry);
          ru.setAttribute("width", "30"); ru.setAttribute("height", "5");
          ru.setAttribute("rx", "1");
          ru.setAttribute("fill", "#4338ca");
          ru.setAttribute("opacity", "0.8");
          g.appendChild(ru);
        });
      }

      // Host Type Badge
      const typeLabel = isFieldSpace ? "FIELD" : (hostType === "structural_mount" ? "POLE" : (hostType === "industrial_din" ? "NEMA" : (hostType === "security_cabinet" ? "SEC-CAB" : (hostType === "architectural_backboard" ? "BOARD" : "RACK"))));
      const badgeColor = isFieldSpace ? "#fbbf24" : (hostType === "structural_mount" ? "#38bdf8" : (hostType === "industrial_din" ? "#fbbf24" : (hostType === "security_cabinet" ? "#34d399" : (hostType === "architectural_backboard" ? "#d8b4fe" : "#a5b4fc"))));

      const badgeTxt = document.createElementNS("http://www.w3.org/2000/svg", "text");
      badgeTxt.setAttribute("x", 0);
      badgeTxt.setAttribute("y", -30);
      badgeTxt.setAttribute("text-anchor", "middle");
      badgeTxt.setAttribute("fill", badgeColor);
      badgeTxt.setAttribute("font-size", "9");
      badgeTxt.setAttribute("font-weight", "bold");
      badgeTxt.setAttribute("font-family", "monospace");
      badgeTxt.textContent = `[${typeLabel}]`;
      g.appendChild(badgeTxt);

      // Label with clean styling
      const txt = document.createElementNS("http://www.w3.org/2000/svg", "text");
      txt.setAttribute("x", 0);
      txt.setAttribute("y", 38);
      txt.setAttribute("text-anchor", "middle");
      txt.setAttribute("fill", "#ffffff");
      txt.setAttribute("font-size", "11");
      txt.setAttribute("font-weight", "bold");
      txt.textContent = closet.name;
      g.appendChild(txt);

      svg.appendChild(g);
    });
  }

  // 4. Drops
  floor.nodes.filter(n => n.type === "device").forEach(dev => {
    const bomItem = (typeof projectBOM !== "undefined" && dev.instanceId) ? projectBOM.find(i => i.instanceId === dev.instanceId) : null;
    const layerType = getDeviceLayerType(bomItem || dev);
    if (!physicalLayerFilters[layerType]) return;

    const isSelected = (dev.id === selectedNodeId) || (selectedNodeIds && selectedNodeIds.has(dev.id));
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", "draggable-canvas-node cursor-pointer");
    g.setAttribute("data-node-id", dev.id);
    g.setAttribute("transform", `translate(${dev.x}, ${dev.y})`);

    // Multi-select / selection glowing halo
    if (isSelected) {
      const halo = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      halo.setAttribute("r", 20);
      halo.setAttribute("fill", "none");
      halo.setAttribute("stroke", "#38bdf8");
      halo.setAttribute("stroke-width", "2");
      halo.setAttribute("stroke-dasharray", "4 2");
      halo.setAttribute("opacity", "0.9");
      g.appendChild(halo);
    }

    // TIA-568 Horizontal Run Distance Violations (>328' Critical / >295' Caution)
    const runFt = (dev.calculatedRun && dev.calculatedRun.totalFt) ? dev.calculatedRun.totalFt : 0;
    const isChannelViolation = runFt > 328;
    const isDistanceCaution = runFt > 295 && !isChannelViolation;

    if (isChannelViolation) {
      const alertHalo = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      alertHalo.setAttribute("r", isSelected ? 24 : 20);
      alertHalo.setAttribute("fill", "none");
      alertHalo.setAttribute("stroke", "#ef4444");
      alertHalo.setAttribute("stroke-width", "3");
      alertHalo.setAttribute("stroke-dasharray", "4 2");
      alertHalo.setAttribute("opacity", "0.95");
      g.appendChild(alertHalo);

      const alertPill = document.createElementNS("http://www.w3.org/2000/svg", "g");
      alertPill.setAttribute("transform", "translate(0, -32)");
      const pillBg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      pillBg.setAttribute("x", "-48"); pillBg.setAttribute("y", "-8");
      pillBg.setAttribute("width", "96"); pillBg.setAttribute("height", "16");
      pillBg.setAttribute("rx", "8");
      pillBg.setAttribute("fill", "#7f1d1d");
      pillBg.setAttribute("stroke", "#f87171");
      pillBg.setAttribute("stroke-width", "1");
      alertPill.appendChild(pillBg);
      const pillTxt = document.createElementNS("http://www.w3.org/2000/svg", "text");
      pillTxt.setAttribute("x", "0"); pillTxt.setAttribute("y", "3.5");
      pillTxt.setAttribute("text-anchor", "middle");
      pillTxt.setAttribute("fill", "#fecaca");
      pillTxt.setAttribute("font-size", "8.5");
      pillTxt.setAttribute("font-weight", "bold");
      pillTxt.setAttribute("font-family", "monospace");
      pillTxt.textContent = `! >328' (${runFt}')`;
      alertPill.appendChild(pillTxt);
      g.appendChild(alertPill);
    } else if (isDistanceCaution) {
      const cautionHalo = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      cautionHalo.setAttribute("r", isSelected ? 22 : 18);
      cautionHalo.setAttribute("fill", "none");
      cautionHalo.setAttribute("stroke", "#f59e0b");
      cautionHalo.setAttribute("stroke-width", "2.5");
      cautionHalo.setAttribute("stroke-dasharray", "3 2");
      cautionHalo.setAttribute("opacity", "0.9");
      g.appendChild(cautionHalo);

      const cautionPill = document.createElementNS("http://www.w3.org/2000/svg", "g");
      cautionPill.setAttribute("transform", "translate(0, -32)");
      const pillBg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      pillBg.setAttribute("x", "-44"); pillBg.setAttribute("y", "-8");
      pillBg.setAttribute("width", "88"); pillBg.setAttribute("height", "16");
      pillBg.setAttribute("rx", "8");
      pillBg.setAttribute("fill", "#78350f");
      pillBg.setAttribute("stroke", "#fbbf24");
      pillBg.setAttribute("stroke-width", "1");
      cautionPill.appendChild(pillBg);
      const pillTxt = document.createElementNS("http://www.w3.org/2000/svg", "text");
      pillTxt.setAttribute("x", "0"); pillTxt.setAttribute("y", "3.5");
      pillTxt.setAttribute("text-anchor", "middle");
      pillTxt.setAttribute("fill", "#fef3c7");
      pillTxt.setAttribute("font-size", "8.5");
      pillTxt.setAttribute("font-weight", "bold");
      pillTxt.setAttribute("font-family", "monospace");
      pillTxt.textContent = `⚠ >295' (${runFt}')`;
      cautionPill.appendChild(pillTxt);
      g.appendChild(cautionPill);
    }

    // Visual Revision Compare Overlays
    let revStatus = null; // "added" | "modified"
    if (activeRevisionCompareId && typeof RevisionEngine !== "undefined") {
      const revisions = RevisionEngine.getRevisions();
      const rev = revisions.find(r => r.id === activeRevisionCompareId);
      const revFloors = (rev && rev.data && rev.data.facilityFloors) || (rev && rev.floors);
      if (revFloors) {
        const snapFloor = revFloors.find(f => f.id === floor.id);
        if (snapFloor && snapFloor.nodes) {
          const match = snapFloor.nodes.find(b => b.id === dev.id || (b.instanceId && b.instanceId === dev.instanceId));
          if (!match) {
            revStatus = "added";
          } else if (match.x !== dev.x || match.y !== dev.y || match.model !== dev.model) {
            revStatus = "modified";
          }
        }
      }
    }

    if (revStatus === "added") {
      const addHalo = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      addHalo.setAttribute("r", 22);
      addHalo.setAttribute("fill", "none");
      addHalo.setAttribute("stroke", "#10b981");
      addHalo.setAttribute("stroke-width", "2.5");
      addHalo.setAttribute("stroke-dasharray", "2 2");
      g.appendChild(addHalo);

      const addPill = document.createElementNS("http://www.w3.org/2000/svg", "text");
      addPill.setAttribute("x", 0);
      addPill.setAttribute("y", isChannelViolation || isDistanceCaution ? -46 : -30);
      addPill.setAttribute("text-anchor", "middle");
      addPill.setAttribute("fill", "#34d399");
      addPill.setAttribute("font-size", "8.5");
      addPill.setAttribute("font-weight", "bold");
      addPill.setAttribute("font-family", "monospace");
      addPill.textContent = "+ NEW ADD";
      g.appendChild(addPill);
    } else if (revStatus === "modified") {
      const modHalo = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      modHalo.setAttribute("r", 22);
      modHalo.setAttribute("fill", "none");
      modHalo.setAttribute("stroke", "#38bdf8");
      modHalo.setAttribute("stroke-width", "2");
      modHalo.setAttribute("stroke-dasharray", "3 2");
      g.appendChild(modHalo);

      const modPill = document.createElementNS("http://www.w3.org/2000/svg", "text");
      modPill.setAttribute("x", 0);
      modPill.setAttribute("y", isChannelViolation || isDistanceCaution ? -46 : -30);
      modPill.setAttribute("text-anchor", "middle");
      modPill.setAttribute("fill", "#7dd3fc");
      modPill.setAttribute("font-size", "8.5");
      modPill.setAttribute("font-weight", "bold");
      modPill.setAttribute("font-family", "monospace");
      modPill.textContent = "~ MODIFIED";
      g.appendChild(modPill);
    }

    const baseRadius = (isFieldWalkMode ? 17 : 12) + (isSelected ? 3 : 0);
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("r", baseRadius);
    circle.setAttribute("fill", isSelected ? "#047857" : "#064e3b");
    circle.setAttribute("stroke", isSelected ? "#34d399" : "#10b981");
    circle.setAttribute("stroke-width", isSelected ? "3.5" : "2");
    g.appendChild(circle);

    if (isFieldWalkMode) {
      const touchHit = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      touchHit.setAttribute("r", "28");
      touchHit.setAttribute("fill", "transparent");
      g.appendChild(touchHit);
    }

    const devNum = (bomItem && bomItem.deviceNumber) || dev.deviceNumber;
    if (devNum && !isChannelViolation && !isDistanceCaution && !revStatus) {
      const numTag = document.createElementNS("http://www.w3.org/2000/svg", "text");
      numTag.setAttribute("x", 0);
      numTag.setAttribute("y", -18);
      numTag.setAttribute("text-anchor", "middle");
      numTag.setAttribute("fill", "#34d399");
      numTag.setAttribute("font-size", "9");
      numTag.setAttribute("font-weight", "bold");
      numTag.setAttribute("font-family", "monospace");
      numTag.textContent = `[${devNum}]`;
      g.appendChild(numTag);
    }

    const txt = document.createElementNS("http://www.w3.org/2000/svg", "text");
    txt.setAttribute("x", 0);
    txt.setAttribute("y", 22);
    txt.setAttribute("text-anchor", "middle");
    txt.setAttribute("fill", "#cbd5e1");
    txt.setAttribute("font-size", "10");
    txt.setAttribute("font-family", "monospace");
    txt.textContent = dev.name;
    g.appendChild(txt);

    // TIA-606-C Cable ID Tag
    if (showPhysicalCableIds) {
      const cableId = getDeviceCableId(dev);
      if (cableId) {
        const idG = document.createElementNS("http://www.w3.org/2000/svg", "g");
        idG.setAttribute("transform", "translate(0, 36)");
        const idBg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        const idLen = Math.max(76, cableId.length * 6.5 + 16);
        idBg.setAttribute("x", -idLen / 2);
        idBg.setAttribute("y", -7);
        idBg.setAttribute("width", idLen);
        idBg.setAttribute("height", 15);
        idBg.setAttribute("rx", "4");
        idBg.setAttribute("fill", "#0f172a");
        idBg.setAttribute("stroke", "#3b82f6");
        idBg.setAttribute("stroke-width", "1");
        idG.appendChild(idBg);

        const idTxt = document.createElementNS("http://www.w3.org/2000/svg", "text");
        idTxt.setAttribute("x", 0);
        idTxt.setAttribute("y", 4);
        idTxt.setAttribute("text-anchor", "middle");
        idTxt.setAttribute("fill", "#60a5fa");
        idTxt.setAttribute("font-size", "8.5");
        idTxt.setAttribute("font-weight", "bold");
        idTxt.setAttribute("font-family", "monospace");
        idTxt.textContent = cableId;
        idG.appendChild(idTxt);
        g.appendChild(idG);
      }
    }

    // Walk Audit Verified Badge
    if (dev.walkVerified) {
      const auditG = document.createElementNS("http://www.w3.org/2000/svg", "g");
      const yOffset = showPhysicalCableIds ? 50 : 34;
      auditG.setAttribute("transform", `translate(0, ${yOffset})`);
      const badgeBg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      badgeBg.setAttribute("x", "-32"); badgeBg.setAttribute("y", "-7");
      badgeBg.setAttribute("width", "64"); badgeBg.setAttribute("height", "14");
      badgeBg.setAttribute("rx", "4");
      badgeBg.setAttribute("fill", "#064e3b");
      badgeBg.setAttribute("stroke", "#10b981");
      badgeBg.setAttribute("stroke-width", "1");
      auditG.appendChild(badgeBg);

      const badgeTxt = document.createElementNS("http://www.w3.org/2000/svg", "text");
      badgeTxt.setAttribute("x", "0"); badgeTxt.setAttribute("y", "3.5");
      badgeTxt.setAttribute("text-anchor", "middle");
      badgeTxt.setAttribute("fill", "#a7f3d0");
      badgeTxt.setAttribute("font-size", "7.5");
      badgeTxt.setAttribute("font-weight", "bold");
      badgeTxt.setAttribute("font-family", "monospace");
      badgeTxt.textContent = "✓ VERIFIED";
      auditG.appendChild(badgeTxt);
      g.appendChild(auditG);
    }

    svg.appendChild(g);
  });

  // Scale Calibration In-Progress Marker
  if (scaleCalibrationStartPoint) {
    const calG = document.createElementNS("http://www.w3.org/2000/svg", "g");
    calG.setAttribute("transform", `translate(${scaleCalibrationStartPoint.x}, ${scaleCalibrationStartPoint.y})`);
    const cDot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    cDot.setAttribute("r", "8");
    cDot.setAttribute("fill", "#eab308");
    cDot.setAttribute("stroke", "#ffffff");
    cDot.setAttribute("stroke-width", "2");
    calG.appendChild(cDot);
    const cPulse = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    cPulse.setAttribute("r", "18");
    cPulse.setAttribute("fill", "none");
    cPulse.setAttribute("stroke", "#eab308");
    cPulse.setAttribute("stroke-width", "1.5");
    cPulse.setAttribute("stroke-dasharray", "3 3");
    calG.appendChild(cPulse);
    const cText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    cText.setAttribute("x", "0"); cText.setAttribute("y", "-14");
    cText.setAttribute("text-anchor", "middle");
    cText.setAttribute("fill", "#fef08a");
    cText.setAttribute("font-size", "9");
    cText.setAttribute("font-weight", "bold");
    cText.textContent = "Point 1 (Now Click Pt 2)";
    calG.appendChild(cText);
    svg.appendChild(calG);
  }

  // 5. Visual Revision Compare - Demolished / Removed Ghost Nodes
  if (activeRevisionCompareId && typeof RevisionEngine !== "undefined") {
    const revisions = RevisionEngine.getRevisions();
    const rev = revisions.find(r => r.id === activeRevisionCompareId);
    const revFloors = (rev && rev.data && rev.data.facilityFloors) || (rev && rev.floors);
    if (revFloors) {
      const snapFloor = revFloors.find(f => f.id === floor.id);
      if (snapFloor && snapFloor.nodes) {
        snapFloor.nodes.filter(n => n.type === "device").forEach(baseDev => {
          const stillExists = floor.nodes.some(cur => cur.id === baseDev.id || (cur.instanceId && cur.instanceId === baseDev.instanceId));
          if (!stillExists) {
            const ghostG = document.createElementNS("http://www.w3.org/2000/svg", "g");
            ghostG.setAttribute("class", "opacity-75");
            ghostG.setAttribute("transform", `translate(${baseDev.x}, ${baseDev.y})`);

            const ghostCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            ghostCircle.setAttribute("r", "13");
            ghostCircle.setAttribute("fill", "#450a0a");
            ghostCircle.setAttribute("stroke", "#f87171");
            ghostCircle.setAttribute("stroke-width", "2");
            ghostCircle.setAttribute("stroke-dasharray", "4 3");
            ghostG.appendChild(ghostCircle);

            const ghostBadge = document.createElementNS("http://www.w3.org/2000/svg", "text");
            ghostBadge.setAttribute("x", "0");
            ghostBadge.setAttribute("y", "-18");
            ghostBadge.setAttribute("text-anchor", "middle");
            ghostBadge.setAttribute("fill", "#f87171");
            ghostBadge.setAttribute("font-size", "8.5");
            ghostBadge.setAttribute("font-weight", "bold");
            ghostBadge.setAttribute("font-family", "monospace");
            ghostBadge.textContent = "✕ REMOVED";
            ghostG.appendChild(ghostBadge);

            const ghostName = document.createElementNS("http://www.w3.org/2000/svg", "text");
            ghostName.setAttribute("x", "0");
            ghostName.setAttribute("y", "22");
            ghostName.setAttribute("text-anchor", "middle");
            ghostName.setAttribute("fill", "#fca5a5");
            ghostName.setAttribute("font-size", "9.5");
            ghostName.setAttribute("font-family", "monospace");
            ghostName.setAttribute("text-decoration", "line-through");
            ghostName.textContent = baseDev.name;
            ghostG.appendChild(ghostName);

            svg.appendChild(ghostG);
          }
        });
      }
    }
  }

  // Update live Physical DRC Distance status pill and unplaced count badge
  updatePhysicalDrcPill();
  updateUnplacedCountBadge();
}

// -----------------------------------------------------------
// BOM Commit with Per-Closet Allocation & Fiber Backbone Sizing
// -----------------------------------------------------------
function commitCablingToBOM(options = {}) {
  let grossFootage = 0;
  let totalDrops = 0;
  const dropsByCloset = {}; // key: closetName -> { name, drops, footage, closetId, devices: [] }

  facilityFloors.forEach(fl => {
    (fl.nodes || []).filter(n => n.type === "device").forEach(dev => {
      totalDrops++;
      const runFt = (dev.calculatedRun && dev.calculatedRun.totalFt) ? dev.calculatedRun.totalFt : 0;
      grossFootage += runFt;

      const closetName = dev.assignedCloset || (dev.calculatedRun && dev.calculatedRun.closetName) || "MDF • Rack-1";
      const normalizedCloset = (typeof FacilityStore !== "undefined") ? FacilityStore.normalize(closetName) : closetName;
      if (!dropsByCloset[normalizedCloset]) {
        dropsByCloset[normalizedCloset] = { name: normalizedCloset, drops: 0, footage: 0, closetId: dev.assignedClosetId || dev.closetId, devices: [] };
      }
      dropsByCloset[normalizedCloset].drops++;
      dropsByCloset[normalizedCloset].footage += runFt;
      dropsByCloset[normalizedCloset].devices.push(dev);
    });
  });

  const orderedFootage = Math.ceil(grossFootage * 1.15); // 15% slack & waste buffer
  const spoolCount = totalDrops > 0 ? Math.max(1, Math.ceil(orderedFootage / 1000)) : 0;

  const selectedCable = (typeof CABLING_CATALOG !== "undefined" && CABLING_CATALOG.bulkCable?.find(c => c.sku === activeCableSku)) || {
    sku: activeCableSku,
    name: "Cat6A Plenum F/UTP Solid Bulk Cable (1,000 ft Spool Box)",
    vendor: "Superior Essex",
    msrp: 410
  };

  const defaultJack = (typeof CABLING_CATALOG !== "undefined" && CABLING_CATALOG.connectors?.[0]) || {
    sku: "C6A-KEY-SLD-24",
    name: "Cat6A Shielded Keystone Jacks (Pack of 24)",
    vendor: "Panduit",
    msrp: 145
  };

  const defaultPanel24 = (typeof CABLING_CATALOG !== "undefined" && CABLING_CATALOG.patchPanels?.[0]) || {
    sku: "PP-1U-24P-MOD",
    name: "1U 24-Port Modular Keystone Patch Panel",
    vendor: "Panduit",
    msrp: 68
  };

  const defaultPanel48 = (typeof CABLING_CATALOG !== "undefined" && CABLING_CATALOG.patchPanels?.find(p => p.ports === 48)) || {
    sku: "PP-1U-48P-MOD",
    name: "1U 48-Port High-Density Modular Keystone Patch Panel",
    vendor: "Panduit",
    msrp: 108,
    rackUnits: 1
  };

  const defaultCord1ft = (typeof CABLING_CATALOG !== "undefined" && CABLING_CATALOG.patchCords?.find(c => c.lengthFt === 1)) || {
    sku: "C6A-SLIM-1FT-BL",
    name: "Cat6A Slim 28AWG 1-Foot Patch Cords",
    vendor: "Panduit",
    msrp: 7.50,
    lengthFt: 1,
    lengthMeters: 0.3
  };

  const defaultCord3ft = (typeof CABLING_CATALOG !== "undefined" && CABLING_CATALOG.patchCords?.find(c => c.lengthFt === 3)) || {
    sku: "C6A-SLIM-3FT-BL",
    name: "Cat6A Slim 28AWG 3-Foot Patch Cords (Field Equipment Whip)",
    vendor: "Panduit",
    msrp: 8.50,
    lengthFt: 3,
    lengthMeters: 1.0
  };

  const defaultCord7ft = (typeof CABLING_CATALOG !== "undefined" && CABLING_CATALOG.patchCords?.find(c => c.lengthFt === 7)) || {
    sku: "C6A-SLIM-7FT-BL",
    name: "Cat6A Slim 28AWG 7-Foot Patch Cords (Workstation / Field Device)",
    vendor: "Panduit",
    msrp: 11.00,
    lengthFt: 7,
    lengthMeters: 2.1
  };

  if (typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) {
    // Preserve existing mounted cabling_sync patch panel slots per closet so re-generated panels keep their rack positions
    const existingMountedPanelsByCloset = {};
    projectBOM.forEach(i => {
      if (i.source === "cabling_sync" && (i.model || '').includes("Patch Panel") && i.rackSlot) {
        const c = (typeof FacilityStore !== "undefined") ? FacilityStore.normalize(i.closetName || i.rackId) : (i.closetName || i.rackId);
        if (!existingMountedPanelsByCloset[c]) existingMountedPanelsByCloset[c] = [];
        existingMountedPanelsByCloset[c].push(i.rackSlot);
      }
    });

    // 1. Remove ONLY previously committed cabling_sync items (preserve switch_standard_pod, stack_patch_panel, topology_auto_sync, and manual rack passives)
    for (let i = projectBOM.length - 1; i >= 0; i--) {
      if (projectBOM[i].source === "cabling_sync") {
        projectBOM.splice(i, 1);
      }
    }

    const infraScope = (typeof getProjectInfrastructureScope === "function")
      ? getProjectInfrastructureScope()
      : { horizontalCabling: true, rackPatchPanels: true, patchCords: true, fiberBackbone: true, sfpAndDac: true };
    const isDirectRj45 = (typeof StorageService !== "undefined" && typeof StorageService.getProjectDefaults === "function")
      ? (StorageService.getProjectDefaults()?.cabling?.rackTermination === "direct_rj45")
      : false;

    // Determine primary closet for bulk spools
    const closetKeys = Object.keys(dropsByCloset);
    const primaryCloset = closetKeys.find(k => k.toLowerCase().includes("mdf")) || closetKeys[0] || "MDF • Rack-1";

    // 2. Add Bulk Cable Spools (Allocated to primary MDF or bulk pool) — gated by infraScope.horizontalCabling
    if (spoolCount > 0 && infraScope.horizontalCabling !== false) {
      projectBOM.push({
        instanceId: `spool-${Date.now()}`,
        id: selectedCable.sku,
        model: `${selectedCable.name} (${spoolCount}x 1,000' Spools for ${grossFootage.toLocaleString()} ft run)`,
        sku: selectedCable.sku,
        role: "Structured Cabling",
        vendor: selectedCable.vendor,
        msrp: selectedCable.msrp,
        poeBudget: 0,
        baseWatts: 0,
        qty: spoolCount,
        closetName: primaryCloset,
        rackId: primaryCloset,
        rackSlot: null,
        source: "cabling_sync"
      });
    }

    // 3. For each telecom closet with drops, allocate net patch panels, keystone packs (rack + field), and color-matched patch cords
    Object.values(dropsByCloset).forEach((cd, idx) => {
      const closetDropsCount = cd.drops;
      if (closetDropsCount === 0) return;

      const normLoc = (typeof FacilityStore !== "undefined") ? FacilityStore.normalize(cd.name) : cd.name;

      // Deduct copper patch panel capacity already provided in this closet by Standard Switch Pods, Stack Panels, or Manual Rack Passives
      let existingPanelCapacity = 0;
      let existingPodKeystoneCount = 0;
      let existingPodPatchCordsCount = 0;

      projectBOM.forEach(item => {
        if (item.source === "cabling_sync") return;
        const itemLoc = (typeof FacilityStore !== "undefined") ? FacilityStore.normalize(item.closetName || item.rackId) : (item.closetName || item.rackId);
        if (itemLoc !== normLoc) return;

        const qty = item.qty || 1;
        const sku = (item.sku || item.id || "").toUpperCase();
        const model = (item.model || "").toLowerCase();

        // Copper patch panels (exclude Fiber LIU)
        if ((sku.includes("PP-") || model.includes("patch panel")) && !sku.includes("BLANK") && !sku.includes("LIU") && !model.includes("fiber")) {
          const portsPerUnit = Number(item.ports) || (sku.includes("48") || model.includes("48-port") ? 48 : 24);
          existingPanelCapacity += portsPerUnit * qty;
        }
        // Keystone jack 24-packs already provided by Standard Switch Pods
        if (sku === "C6A-KEY-SLD-24" || model.includes("keystone jacks")) {
          existingPodKeystoneCount += 24 * qty;
        }
        // Headend patch cords already provided by Standard Switch Pods
        if (item.source === "switch_standard_pod" && (sku.includes("SLIM") || model.includes("patch cord"))) {
          existingPodPatchCordsCount += qty;
        }
      });

      const netPanelDropsNeeded = Math.max(0, closetDropsCount - existingPanelCapacity);
      const total24Blocks = netPanelDropsNeeded > 0 ? Math.ceil(netPanelDropsNeeded / 24) : 0;
      let p24 = 0;
      let p48 = 0;
      if (total24Blocks === 1) {
        p24 = 1; // Single <=24-port switch: 1x 24P panel
      } else if (total24Blocks === 2) {
        p24 = 2; // Standalone 48-port switch (25..48 drops): 2x 24P panels (above & below)
      } else if (total24Blocks >= 3) {
        // Multiple 48P switches (>48 drops): 2x 24P outer top/bottom caps + 48P panels in between
        p48 = Math.floor((total24Blocks - 2) / 2);
        p24 = 2 + ((total24Blocks - 2) % 2);
      }

      if (infraScope.rackPatchPanels !== false && !isDirectRj45) {
        if (p48 > 0) {
          projectBOM.push({
            instanceId: `pp48-${cd.name.replace(/\W+/g, '_')}-${Date.now()}-${idx}`,
            id: defaultPanel48.sku,
            model: defaultPanel48.name,
            sku: defaultPanel48.sku,
            role: "Structured Cabling",
            vendor: defaultPanel48.vendor,
            msrp: defaultPanel48.msrp,
            ports: 48,
            poeBudget: 0,
            baseWatts: 0,
            rackUnits: defaultPanel48.rackUnits || 1,
            qty: p48,
            closetName: cd.name,
            rackId: cd.name,
            rackSlot: (existingMountedPanelsByCloset[cd.name]?.length > 0) ? existingMountedPanelsByCloset[cd.name].shift() : null,
            source: "cabling_sync"
          });
        }

        if (p24 > 0) {
          projectBOM.push({
            instanceId: `pp24-${cd.name.replace(/\W+/g, '_')}-${Date.now()}-${idx}`,
            id: defaultPanel24.sku,
            model: defaultPanel24.name,
            sku: defaultPanel24.sku,
            role: "Structured Cabling",
            vendor: defaultPanel24.vendor,
            msrp: defaultPanel24.msrp,
            ports: 24,
            poeBudget: 0,
            baseWatts: 0,
            rackUnits: 1,
            qty: p24,
            closetName: cd.name,
            rackId: cd.name,
            rackSlot: (existingMountedPanelsByCloset[cd.name]?.length > 0) ? existingMountedPanelsByCloset[cd.name].shift() : null,
            source: "cabling_sync"
          });
        }

        // Keystone jacks: 2 per horizontal drop (1 at rack patch panel + 1 at field biscuit/surface-mount box), minus any pod headend keystones
        const totalKeystonesRequired = closetDropsCount * (infraScope.horizontalCabling !== false ? 2 : 1);
        const netKeystonesNeeded = Math.max(0, totalKeystonesRequired - existingPodKeystoneCount);
        const keystonePacks = Math.ceil(netKeystonesNeeded / 24);

        if (keystonePacks > 0) {
          projectBOM.push({
            instanceId: `jacks-${cd.name.replace(/\W+/g, '_')}-${Date.now()}-${idx}`,
            id: defaultJack.sku,
            model: `${defaultJack.name} (Headend Patch Panel + Field Biscuit Terminations)`,
            sku: defaultJack.sku,
            role: "Structured Cabling",
            vendor: defaultJack.vendor,
            msrp: defaultJack.msrp,
            poeBudget: 0,
            baseWatts: 0,
            qty: keystonePacks,
            closetName: cd.name,
            rackId: cd.name,
            rackSlot: null,
            source: "cabling_sync"
          });
        }
      }

      // Dynamic switch-to-panel patch cord length calculation based on U-separation in this closet
      let closetUDiff = 1;
      let targetHeadendLengthFt = 1;
      let targetHeadendLengthMeters = 0.3;

      const closetSwitches = projectBOM.filter(i => 
        (typeof isNetworkSwitchItem === "function" ? isNetworkSwitchItem(i) : (i.role === "Access" || (i.model || '').includes("Switch"))) &&
        ((typeof FacilityStore !== "undefined" ? FacilityStore.normalize(i.closetName || i.rackId) : (i.closetName || i.rackId)) === normLoc) &&
        (typeof parseRackU === "function" ? parseRackU(i.rackSlot) !== null : i.rackSlot)
      );
      const closetPanels = projectBOM.filter(i => 
        (i.role === "Structured Cabling" || i.category === "cabling") && 
        (i.model || '').includes("Patch Panel") && 
        ((typeof FacilityStore !== "undefined" ? FacilityStore.normalize(i.closetName || i.rackId) : (i.closetName || i.rackId)) === normLoc) &&
        (typeof parseRackU === "function" ? parseRackU(i.rackSlot) !== null : i.rackSlot)
      );

      if (closetSwitches.length > 0 && closetPanels.length > 0 && typeof getPatchCordLengthForUDiff === "function") {
        const uDiffs = [];
        closetSwitches.forEach(sw => {
          const swU = parseRackU(sw.rackSlot);
          if (swU !== null) {
            let minD = 999;
            closetPanels.forEach(pp => {
              const ppU = parseRackU(pp.rackSlot);
              if (ppU !== null) {
                const dist = Math.abs(swU - ppU);
                if (dist < minD) minD = dist;
              }
            });
            if (minD < 999) uDiffs.push(minD);
          }
        });
        if (uDiffs.length > 0) {
          closetUDiff = Math.round(uDiffs.reduce((a, b) => a + b, 0) / uDiffs.length);
          const cordSpec = getPatchCordLengthForUDiff(closetUDiff);
          targetHeadendLengthFt = cordSpec.lengthFt;
          targetHeadendLengthMeters = cordSpec.lengthMeters;
        }
      }

      // Group closet devices by Orion color standard and field cord length (3ft whip for security/wireless, 7ft for workstations)
      const headendColorCounts = {};
      const fieldCordBuckets = {}; // key: `${lengthFt}_${colorName}` -> { lengthFt, colorName, count }

      (cd.devices || []).forEach(dev => {
        let colorName = "Yellow";
        if (typeof getProjectCablingStandard === "function") {
          const std = getProjectCablingStandard(dev, "patch");
          if (std && (std.color || std.name)) colorName = std.color || std.name;
        }
        headendColorCounts[colorName] = (headendColorCounts[colorName] || 0) + 1;

        const cat = (dev.category || dev.role || dev.type || "").toLowerCase();
        const isWorkstationOrData = cat.includes("workstation") || cat.includes("data") || cat.includes("voip") || cat.includes("phone") || cat.includes("printer");
        const fieldLengthFt = isWorkstationOrData ? 7 : 3;
        const bucketKey = `${fieldLengthFt}_${colorName}`;
        if (!fieldCordBuckets[bucketKey]) {
          fieldCordBuckets[bucketKey] = { lengthFt: fieldLengthFt, colorName, count: 0 };
        }
        fieldCordBuckets[bucketKey].count++;
      });

      if (infraScope.patchCords !== false) {
        // Deduct headend patch cords already provided by Standard Switch Pods in this closet (skip headend cords when Direct RJ45 Field Plugs terminate directly into switches)
        let remainingPodDeduct = existingPodPatchCordsCount;
        if (!isDirectRj45) {
          Object.entries(headendColorCounts).forEach(([colorName, count]) => {
            const deduct = Math.min(count, remainingPodDeduct);
            remainingPodDeduct -= deduct;
            const netCount = count - deduct;
            if (netCount <= 0) return;

            const matchedHeadend = (typeof findPatchCordItem === "function")
              ? findPatchCordItem(targetHeadendLengthFt, "Panduit", false, colorName)
              : defaultCord1ft;
            const cordObj = matchedHeadend || defaultCord1ft;

            projectBOM.push({
              instanceId: `patch-headend-${cd.name.replace(/\W+/g, '_')}-${colorName.replace(/\W+/g, '')}-${Date.now()}-${idx}`,
              id: cordObj.sku,
              model: `${cordObj.name} (${colorName} — Headend Switch-to-Panel, ${closetUDiff}U Separation)`,
              sku: cordObj.sku,
              role: "Structured Cabling",
              vendor: cordObj.vendor || "Panduit",
              msrp: cordObj.msrp,
              poeBudget: 0,
              baseWatts: 0,
              qty: netCount,
              closetName: cd.name,
              rackId: cd.name,
              rackSlot: null,
              source: "cabling_sync",
              lengthFt: targetHeadendLengthFt,
              lengthMeters: targetHeadendLengthMeters,
              uDiff: closetUDiff
            });
          });
        }

        // Add Field-End Equipment Patch Cords (3ft for cameras/readers/APs/intercoms, 7ft for workstations), color-coded
        Object.values(fieldCordBuckets).forEach(bucket => {
          if (bucket.count <= 0) return;
          const fallbackCord = bucket.lengthFt === 3 ? defaultCord3ft : defaultCord7ft;
          const matchedField = (typeof findPatchCordItem === "function")
            ? findPatchCordItem(bucket.lengthFt, "Panduit", false, bucket.colorName)
            : fallbackCord;
          const cordObj = matchedField || fallbackCord;
          const whipRoleDesc = bucket.lengthFt === 3 ? "Field Device Equipment Whip" : "Field Workstation Cord";

          projectBOM.push({
            instanceId: `patch-field-${cd.name.replace(/\W+/g, '_')}-${bucket.lengthFt}ft-${bucket.colorName.replace(/\W+/g, '')}-${Date.now()}-${idx}`,
            id: cordObj.sku,
            model: `${cordObj.name} (${bucket.colorName} — ${whipRoleDesc})`,
            sku: cordObj.sku,
            role: "Structured Cabling",
            vendor: cordObj.vendor || "Panduit",
            msrp: cordObj.msrp,
            poeBudget: 0,
            baseWatts: 0,
            qty: bucket.count,
            closetName: cd.name,
            rackId: cd.name,
            rackSlot: null,
            source: "cabling_sync",
            lengthFt: bucket.lengthFt
          });
        });
      }
    });

    // 4. Fiber Trunks between closets — gated by infraScope.fiberBackbone
    if (infraScope.fiberBackbone !== false) {
      facilityFloors.forEach(fl => {
        (fl.fiberBackbones || []).forEach(fb => {
          const fType = (fb.fiberType || (typeof getProjectFiberType === "function" ? getProjectFiberType() : "mmf")).toLowerCase();
          const strands = parseInt(fb.strandCount) || 12;
          const catalogList = (typeof CABLING_CATALOG !== "undefined" && CABLING_CATALOG.fiberBackbone) ? CABLING_CATALOG.fiberBackbone : [];
          const trunkItem = catalogList.find(i => i.medium === fType && i.strands === strands) ||
            catalogList.find(i => i.medium === fType) ||
            catalogList[0] || {
              sku: fType === "smf" ? "FIBER-OS2-12STRAND" : "FIBER-OM4-12STRAND",
              name: `${strands}-Strand ${fType === "smf" ? "OS2 Single-Mode" : "OM4 Multi-Mode"} Armored Pre-Term LC Fiber Trunk Assembly`,
              msrpPerFt: fType === "smf" ? 2.60 : 2.45,
              baseTerminationMsrp: 280
            };

          const trunkPrice = Math.round((fb.totalFt * trunkItem.msrpPerFt) + trunkItem.baseTerminationMsrp);
          const fromName = fb.fromClosetName || "MDF";
          const toName = fb.toClosetName || "IDF-1";
          const ratingLabel = (fb.rating || "plenum").toUpperCase();

          projectBOM.push({
            instanceId: `trunk-${fb.id || Date.now()}`,
            id: trunkItem.sku,
            model: `${trunkItem.name} (${fromName} to ${toName}, ${fb.totalFt} ft, ${ratingLabel})`,
            sku: trunkItem.sku,
            role: "Structured Cabling",
            vendor: "Corning / Panduit",
            msrp: trunkPrice,
            poeBudget: 0,
            baseWatts: 0,
            qty: 1,
            closetName: fromName,
            rackId: fromName,
            rackSlot: null,
            source: "cabling_sync"
          });
        });
      });
    }
  }

  // Keep Fiber LIUs & Interconnects synchronized with floorplan fiber backbones
  if (typeof autoSynthesizeInterconnects === "function") {
    autoSynthesizeInterconnects(true);
  }

  if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
    FacilityStore.notifyWorkspaceChange();
  }
  if (typeof renderBOM === "function") renderBOM();
  if (typeof updateBOMBadge === "function") updateBOMBadge();
  if (typeof StorageService !== "undefined" && typeof StorageService.queueAutoSave === "function") {
    StorageService.queueAutoSave();
  }
  if (options && options.userInitiated) {
    if (typeof showToast === "function") {
      showToast(`Committed structured cabling (${totalDrops} drops, ${spoolCount} spools, per-closet panels & patch cords) to Quote BOM!`);
    }
  }
}

// -----------------------------------------------------------
// Canvas Intelligence, Auto-Fit & Viewport Centering
// -----------------------------------------------------------
function fitPhysicalLayoutToScreen() {
  const viewport = document.getElementById("cableCanvasViewport");
  const floor = getActiveFloor();
  if (!viewport || !floor) return;

  const nodes = floor.nodes || [];
  if (nodes.length === 0) {
    currentCanvasZoom = 1.0;
    applyCanvasZoom();
    viewport.scrollTo({ left: 0, top: 0, behavior: "smooth" });
    return;
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  nodes.forEach(n => {
    const w = n.type === "closet" ? 180 : 50;
    const h = n.type === "closet" ? 100 : 50;
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + w);
    maxY = Math.max(maxY, n.y + h);

    if (n.waypoints && Array.isArray(n.waypoints)) {
      n.waypoints.forEach(wp => {
        minX = Math.min(minX, wp.x);
        minY = Math.min(minY, wp.y);
        maxX = Math.max(maxX, wp.x);
        maxY = Math.max(maxY, wp.y);
      });
    }
  });

  // Check if background floor plan image exists
  const imgEl = document.getElementById("canvasFloorPlanImage");
  if (imgEl) {
    const iw = parseFloat(imgEl.getAttribute("width")) || 0;
    const ih = parseFloat(imgEl.getAttribute("height")) || 0;
    if (iw > 0 && ih > 0) {
      minX = Math.min(minX, 0);
      minY = Math.min(minY, 0);
      maxX = Math.max(maxX, iw);
      maxY = Math.max(maxY, ih);
    }
  }

  if (minX === Infinity) {
    minX = 0; minY = 0; maxX = 1200; maxY = 800;
  }

  const availW = Math.max(300, viewport.clientWidth - 80);
  const availH = Math.max(300, viewport.clientHeight - 80);
  const contentW = Math.max(100, maxX - minX + 120);
  const contentH = Math.max(100, maxY - minY + 120);

  const scaleW = availW / contentW;
  const scaleH = availH / contentH;
  const optimalZoom = Math.max(0.35, Math.min(1.25, Math.min(scaleW, scaleH)));

  currentCanvasZoom = Math.round(optimalZoom * 100) / 100;
  applyCanvasZoom();

  const centerX = (minX + (contentW / 2)) * currentCanvasZoom;
  const centerY = (minY + (contentH / 2)) * currentCanvasZoom;

  viewport.scrollTo({
    left: Math.max(0, centerX - (viewport.clientWidth / 2)),
    top: Math.max(0, centerY - (viewport.clientHeight / 2)),
    behavior: "smooth"
  });
}

function centerPhysNodeInViewport(nodeId) {
  const viewport = document.getElementById("cableCanvasViewport");
  const floor = getActiveFloor();
  if (!viewport || !floor) return;

  const node = (floor.nodes || []).find(n => n.id === nodeId);
  if (!node) return;

  const nodeCenterX = (node.x + (node.type === "closet" ? 90 : 25)) * currentCanvasZoom;
  const nodeCenterY = (node.y + (node.type === "closet" ? 50 : 25)) * currentCanvasZoom;

  viewport.scrollTo({
    left: Math.max(0, nodeCenterX - (viewport.clientWidth / 2)),
    top: Math.max(0, nodeCenterY - (viewport.clientHeight / 2)),
    behavior: "smooth"
  });
}

// -----------------------------------------------------------
// Searchable Quick Navigator (Matches Topology Canvas UX)
// -----------------------------------------------------------
function getPhysSearchItems() {
  const items = [];
  
  // 1. Closets / Racks
  facilityFloors.forEach(f => {
    (f.nodes || []).filter(n => n.type === "closet" && n.hostType !== "field" && !(n.name && n.name.endsWith(" • Field"))).forEach(c => {
      items.push({
        id: c.id,
        floorId: f.id,
        name: c.name,
        badge: `${f.name} • Enclosure`,
        category: "Racks & Closets",
        icon: "🏢",
        searchText: `${c.name} ${f.name} rack enclosure closet cabinet`.toLowerCase()
      });
    });
  });

  // 2. Placed Drops
  facilityFloors.forEach(f => {
    (f.nodes || []).filter(n => n.type === "device").forEach(d => {
      const isCam = (d.name || '').toLowerCase().includes('cam') || (d.mountMethod || '').toLowerCase().includes('camera');
      const isDoor = (d.name || '').toLowerCase().includes('door') || (d.name || '').toLowerCase().includes('portal') || (d.name || '').toLowerCase().includes('card');
      const icon = isCam ? "📹" : (isDoor ? "🔐" : "🔌");
      items.push({
        id: d.id,
        floorId: f.id,
        name: d.name,
        badge: `${f.name} • Drop`,
        category: "Placed Drops",
        icon,
        searchText: `${d.name} ${f.name} drop camera door sensor`.toLowerCase()
      });
    });
  });

  // 3. Unplaced Field BOM Hardware
  const placedIds = new Set();
  facilityFloors.forEach(f => (f.nodes || []).forEach(n => {
    if (n.instanceId) placedIds.add(n.instanceId);
    if (n.id) placedIds.add(n.id);
  }));

  if (typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) {
    projectBOM.filter(i => isFieldDeviceForPhysicalLayout(i) && !placedIds.has(i.instanceId)).forEach(item => {
      items.push({
        id: item.instanceId,
        isUnplaced: true,
        name: item.model,
        badge: "Quote BOM • Unplaced",
        category: "Unplaced Devices",
        icon: "📦",
        searchText: `${item.model} ${item.role || ''} ${item.category || ''} unplaced quote`.toLowerCase()
      });
    });
  }

  return items;
}

function filterPhysCanvasSearch(query) {
  const container = document.getElementById("physQuickSearchResults");
  if (!container) return;

  const q = (query || "").trim().toLowerCase();
  if (!q) {
    container.classList.add("hidden");
    return;
  }

  const allItems = getPhysSearchItems();
  const filtered = allItems.filter(i => i.searchText.includes(q));

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="px-3 py-3 text-center text-xs text-slate-500 font-mono">
        No devices or racks matching "${escapeHTML(q)}"
      </div>
    `;
    container.classList.remove("hidden");
    return;
  }

  // Group by category
  const categories = {};
  filtered.forEach(item => {
    if (!categories[item.category]) categories[item.category] = [];
    categories[item.category].push(item);
  });

  let html = "";
  Object.keys(categories).forEach(cat => {
    html += `
      <div class="px-2 pt-1.5 pb-0.5 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center justify-between border-t border-slate-800/60 first:border-t-0">
        <span>${escapeHTML(cat)}</span>
        <span class="text-slate-500">${categories[cat].length}</span>
      </div>
    `;

    categories[cat].forEach(item => {
      html += `
        <button
          type="button"
          onclick="selectAndCenterPhysNode('${item.id}', '${item.floorId || ''}', ${item.isUnplaced ? 'true' : 'false'})"
          class="w-full text-left px-2 py-1.5 rounded-lg flex items-center justify-between gap-2 text-xs transition-colors hover:bg-slate-850 hover:text-white text-slate-200 group cursor-pointer"
        >
          <div class="flex items-center gap-2 min-w-0">
            <span class="text-sm shrink-0">${item.icon}</span>
            <div class="truncate">
              <div class="font-medium truncate group-hover:text-amber-300 transition-colors">${escapeHTML(item.name)}</div>
              <div class="text-[10px] text-slate-400 font-mono truncate">${escapeHTML(item.badge)}</div>
            </div>
          </div>
          <i data-lucide="arrow-right" class="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"></i>
        </button>
      `;
    });
  });

  container.innerHTML = html;
  container.classList.remove("hidden");
  if (typeof safeCreateIcons === "function") {
    safeCreateIcons(container);
  } else if (window.lucide) {
    lucide.createIcons();
  }
}

function selectAndCenterPhysNode(nodeId, floorId = null, isUnplaced = false) {
  const container = document.getElementById("physQuickSearchResults");
  const input = document.getElementById("physCanvasSearchInput");
  if (container) container.classList.add("hidden");
  if (input) input.value = "";

  if (isUnplaced) {
    switchSidebarTab("unplaced");
    return;
  }

  if (floorId && floorId !== activeFloorId && typeof switchActiveFloor === "function") {
    switchActiveFloor(floorId);
  }

  setTimeout(() => {
    selectNode(nodeId);
    centerPhysNodeInViewport(nodeId);
  }, 40);
}

// -----------------------------------------------------------
// Deep Linking & Navigation Launcher
// -----------------------------------------------------------
function jumpToPhysicalLayoutTarget(targetVal) {
  // 1. Capture navigation history before switching views
  if (typeof NavigationHistory !== "undefined") {
    const st = NavigationHistory.captureCurrentState();
    if (st && st.tool !== "physical") NavigationHistory.push(st);
  }

  // 2. Open physical layout tab via TabManager (or modal fallback)
  if (window.TabManager && typeof window.TabManager.openTab === "function") {
    window.TabManager.openTab("physical_layout");
  } else {
    const modal = document.getElementById("cableLayoutModal");
    if (modal && modal.classList.contains("hidden")) {
      toggleCableLayoutModal();
    }
  }

  // 4. Resolve target floor and enclosure node
  if (targetVal) {
    setTimeout(() => {
      let targetLoc = null;
      let targetDevice = null;
      if (typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) {
        const item = projectBOM.find(i => i.instanceId === targetVal);
        if (item) {
          targetDevice = item;
          targetLoc = item.closetName || item.rackId;
        }
      }
      if (!targetLoc && typeof targetVal === "string") {
        targetLoc = targetVal;
      }
      if (targetLoc && typeof FacilityStore !== "undefined") {
        const parsed = FacilityStore.parse(targetLoc);
        if (parsed.floorId && typeof switchActiveFloor === "function") {
          switchActiveFloor(parsed.floorId);
        }
        // Highlight closet or drop node on active floor
        const currentFloor = typeof getActiveFloor === "function" ? getActiveFloor() : null;
        if (currentFloor && Array.isArray(currentFloor.nodes)) {
          const match = currentFloor.nodes.find(n => 
            n.name.toLowerCase().includes((parsed.space || '').toLowerCase()) || 
            (targetDevice && (n.instanceId === targetDevice.instanceId || n.name.toLowerCase().includes(targetDevice.model.toLowerCase())))
          );
          if (match) {
            selectedNodeId = match.id;
            recalculateCurrentFloorCables();
            renderCableCanvas();
            renderInspector();
            centerPhysNodeInViewport(match.id);
          }
        }
      }
    }, 100);
  }
}

// Bulk Operations & Pathway Corridor Handlers
// -----------------------------------------------------------
function clearMultiSelection() {
  selectedNodeIds.clear();
  selectedNodeId = null;
  renderInspector();
  renderCableCanvas();
}

function executeBulkReassignCloset(newClosetId) {
  const floor = getActiveFloor();
  if (!floor || !selectedNodeIds || selectedNodeIds.size === 0) return;
  const allClosets = getAllClosetsAcrossFacility();
  const targetCloset = allClosets.find(c => c.id === newClosetId);
  if (!targetCloset) return;

  let count = 0;
  floor.nodes.filter(n => selectedNodeIds.has(n.id) && n.type === "device").forEach(dev => {
    dev.assignedClosetId = targetCloset.id;
    dev.waypoints = [];
    if (typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) {
      const match = projectBOM.find(i => (i.instanceId && (i.instanceId === dev.instanceId || i.instanceId === dev.id)) || i.model === dev.name);
      if (match) {
        match.closetName = targetCloset.name;
        match.rackId = targetCloset.name;
        if (typeof PortEngine !== "undefined") {
          PortEngine.autoAssignDeviceToClosetSwitch(match, targetCloset.name);
        }
      }
    }
    count++;
  });

  if (typeof FacilityStore !== "undefined" && typeof FacilityStore.notifyWorkspaceChange === "function") {
    FacilityStore.notifyWorkspaceChange();
  }
  recalculateCurrentFloorCables();
  renderCableCanvas();
  renderInspector();
  saveFacilityState(true);
  if (typeof updateBOMView === "function") updateBOMView();
  if (typeof showToast === "function") {
    showToast(`Reassigned ${count} drop${count === 1 ? '' : 's'} to ${targetCloset.name}.`);
  }
}

function executeBulkChangeCableSpec(newSku) {
  const floor = getActiveFloor();
  if (!floor || !selectedNodeIds || selectedNodeIds.size === 0) return;

  let count = 0;
  floor.nodes.filter(n => selectedNodeIds.has(n.id) && n.type === "device").forEach(dev => {
    dev.cableSku = newSku;
    count++;
  });

  recalculateCurrentFloorCables();
  renderCableCanvas();
  renderInspector();
  saveFacilityState(true);
  if (typeof showToast === "function") {
    showToast(`Updated cable specification to ${newSku} on ${count} drops.`);
  }
}

function executeBulkAlign(axis) {
  const floor = getActiveFloor();
  if (!floor || !selectedNodeIds || selectedNodeIds.size < 2) return;
  const nodes = floor.nodes.filter(n => selectedNodeIds.has(n.id));

  if (axis === "horizontal") {
    const avgY = Math.round(nodes.reduce((acc, n) => acc + n.y, 0) / nodes.length);
    nodes.forEach(n => { n.y = avgY; });
  } else {
    const avgX = Math.round(nodes.reduce((acc, n) => acc + n.x, 0) / nodes.length);
    nodes.forEach(n => { n.x = avgX; });
  }

  recalculateCurrentFloorCables();
  renderCableCanvas();
  saveFacilityState(true);
  if (typeof showToast === "function") {
    showToast(`Aligned ${nodes.length} nodes ${axis}ly.`);
  }
}

function executeBulkDistribute() {
  const floor = getActiveFloor();
  if (!floor || !selectedNodeIds || selectedNodeIds.size < 3) {
    if (typeof showToast === "function") showToast("Select at least 3 nodes to distribute.");
    return;
  }
  const nodes = floor.nodes.filter(n => selectedNodeIds.has(n.id));
  const spanX = Math.max(...nodes.map(n => n.x)) - Math.min(...nodes.map(n => n.x));
  const spanY = Math.max(...nodes.map(n => n.y)) - Math.min(...nodes.map(n => n.y));

  if (spanX >= spanY) {
    nodes.sort((a, b) => a.x - b.x);
    const startX = nodes[0].x;
    const endX = nodes[nodes.length - 1].x;
    const step = (endX - startX) / (nodes.length - 1);
    nodes.forEach((n, idx) => {
      n.x = Math.round(startX + (idx * step));
    });
  } else {
    nodes.sort((a, b) => a.y - b.y);
    const startY = nodes[0].y;
    const endY = nodes[nodes.length - 1].y;
    const step = (endY - startY) / (nodes.length - 1);
    nodes.forEach((n, idx) => {
      n.y = Math.round(startY + (idx * step));
    });
  }

  recalculateCurrentFloorCables();
  renderCableCanvas();
  saveFacilityState(true);
  if (typeof showToast === "function") {
    showToast(`Distributed ${nodes.length} nodes evenly along dominant span.`);
  }
}

function executeBulkClearWaypoints() {
  const floor = getActiveFloor();
  if (!floor || !selectedNodeIds || selectedNodeIds.size === 0) return;
  let count = 0;
  floor.nodes.filter(n => selectedNodeIds.has(n.id) && n.type === "device").forEach(d => {
    d.waypoints = [];
    count++;
  });
  recalculateCurrentFloorCables();
  renderCableCanvas();
  saveFacilityState(true);
  if (typeof showToast === "function") {
    showToast(`Reset cable routing & bend points on ${count} drops.`);
  }
}

function executeBulkDeleteNodes() {
  const floor = getActiveFloor();
  if (!floor || !selectedNodeIds || selectedNodeIds.size === 0) return;
  const count = selectedNodeIds.size;
  if (!confirm(`Are you sure you want to delete all ${count} selected elements?`)) return;

  const toDelete = new Set(selectedNodeIds);
  selectedNodeIds.clear();
  selectedNodeId = null;

  const closetCount = floor.nodes.filter(n => n.type === "closet" && toDelete.has(n.id)).length;
  const totalClosets = getAllClosetsAcrossFacility().length;
  if (closetCount > 0 && closetCount >= totalClosets) {
    alert("Cannot delete all closets. At least one closet must remain.");
    return;
  }

  floor.nodes = floor.nodes.filter(n => !toDelete.has(n.id));

  if (typeof projectBOM !== "undefined" && Array.isArray(projectBOM)) {
    projectBOM = projectBOM.filter(i => !toDelete.has(i.instanceId));
  }

  recalculateCurrentFloorCables();
  renderCableCanvas();
  renderInspector();
  renderSidebarTabContent();
  saveFacilityState(true);
  if (typeof updateBOMView === "function") updateBOMView();
  if (typeof showToast === "function") {
    showToast(`Deleted ${count} elements from floor layout.`);
  }
}

function updatePathwayTrunkName(id, name) {
  const floor = getActiveFloor();
  if (!floor || !floor.pathwayTrunks) return;
  const trunk = floor.pathwayTrunks.find(t => t.id === id);
  if (trunk) {
    trunk.name = name;
    renderCableCanvas();
    saveFacilityState(true);
  }
}

function updatePathwayTrunkType(id, type) {
  const floor = getActiveFloor();
  if (!floor || !floor.pathwayTrunks) return;
  const trunk = floor.pathwayTrunks.find(t => t.id === id);
  if (trunk) {
    trunk.type = type;
    if (type === "tray") trunk.capacity = 100;
    else if (type === "ladder") trunk.capacity = 160;
    else if (type === "jhook") trunk.capacity = 40;
    else if (type === "conduit") trunk.capacity = 25;
    renderCableCanvas();
    renderInspector();
    saveFacilityState(true);
  }
}

function updatePathwayTrunkCapacity(id, cap) {
  const floor = getActiveFloor();
  if (!floor || !floor.pathwayTrunks) return;
  const trunk = floor.pathwayTrunks.find(t => t.id === id);
  if (trunk) {
    trunk.capacity = Number(cap) || 80;
    renderCableCanvas();
    renderInspector();
    saveFacilityState(true);
  }
}

function deletePathwayTrunk(id) {
  const floor = getActiveFloor();
  if (!floor || !floor.pathwayTrunks) return;
  floor.pathwayTrunks = floor.pathwayTrunks.filter(t => t.id !== id);
  selectedPathwayTrunkId = null;
  activeDrawingPathwayId = null;
  recalculateCurrentFloorCables();
  renderCableCanvas();
  renderInspector();
  saveFacilityState(true);
  if (typeof showToast === "function") {
    showToast("Deleted pathway corridor.");
  }
}

function deselectPathwayTrunk() {
  selectedPathwayTrunkId = null;
  activeDrawingPathwayId = null;
  renderInspector();
  renderCableCanvas();
}

// Window Compatibility Exports
if (typeof window !== "undefined") {
  window.toggleCableLayoutModal = toggleCableLayoutModal;
  window.jumpToPhysicalLayoutTarget = jumpToPhysicalLayoutTarget;
  window.deepLinkToRackElevation = deepLinkToRackElevation;
  window.switchActiveFloor = switchActiveFloor;
  window.promptAddNewFloor = promptAddNewFloor;
  window.promptRenameActiveFloor = promptRenameActiveFloor;
  window.promptDeleteActiveFloor = promptDeleteActiveFloor;
  window.deleteFloorLevel = promptDeleteActiveFloor;
  window.initCableCanvas = initCableCanvas;
  window.renderCableCanvas = renderCableCanvas;
  window.updateNodeMountMethod = updateNodeMountMethod;
  window.updateNodeHostSwitch = updateNodeHostSwitch;
  window.updateNodeSwitchPort = updateNodeSwitchPort;
  window.deselectNode = deselectNode;
  window.fitPhysicalLayoutToScreen = fitPhysicalLayoutToScreen;
  window.centerPhysNodeInViewport = centerPhysNodeInViewport;
  window.filterPhysCanvasSearch = filterPhysCanvasSearch;
  window.selectAndCenterPhysNode = selectAndCenterPhysNode;
  window.isFieldDeviceForPhysicalLayout = isFieldDeviceForPhysicalLayout;
  window.findNextAvailableGridSpot = findNextAvailableGridSpot;
  window.getUnplacedDevicesForFloor = getUnplacedDevicesForFloor;
  window.placeAllUnplacedOnActiveFloor = placeAllUnplacedOnActiveFloor;
  window.placeBomItemOnFloor = placeBomItemOnFloor;
  window.syncBOMDevicesToFloors = syncBOMDevicesToFloors;
  window.clearPhysicalLayoutDrops = clearPhysicalLayoutDrops;
  window.removePhysicalLayoutDropByInstanceId = removePhysicalLayoutDropByInstanceId;
  window.commitCablingToBOM = commitCablingToBOM;
  window.syncCablingToBOM = commitCablingToBOM;
  window.togglePhysicalInspector = togglePhysicalInspector;
  window.togglePhysicalLayerMenu = togglePhysicalLayerMenu;
  window.setPhysicalLayerFilter = setPhysicalLayerFilter;
  window.toggleAllPhysicalLayers = toggleAllPhysicalLayers;
  window.updatePhysicalLayerCountBadge = updatePhysicalLayerCountBadge;
  window.getDeviceLayerType = getDeviceLayerType;
  window.getAllClosetsAcrossFacility = getAllClosetsAcrossFacility;
  window.selectFiberBackbone = selectFiberBackbone;
  window.deselectFiberBackbone = deselectFiberBackbone;
  window.updateFiberBackbone = updateFiberBackbone;
  window.deleteFiberBackbone = deleteFiberBackbone;
  window.manualAutoLinkTopology = manualAutoLinkTopology;
  window.deleteNode = deleteNode;
  window.deleteDropFromBOM = deleteDropFromBOM;
  window.isClosetMatch = isClosetMatch;
  window.getInterClosetConnections = getInterClosetConnections;

  // Multi-Select & Pathway exports
  window.clearMultiSelection = clearMultiSelection;
  window.executeBulkReassignCloset = executeBulkReassignCloset;
  window.executeBulkChangeCableSpec = executeBulkChangeCableSpec;
  window.executeBulkAlign = executeBulkAlign;
  window.executeBulkDistribute = executeBulkDistribute;
  window.executeBulkClearWaypoints = executeBulkClearWaypoints;
  window.executeBulkDeleteNodes = executeBulkDeleteNodes;
  window.updatePathwayTrunkName = updatePathwayTrunkName;
  window.updatePathwayTrunkType = updatePathwayTrunkType;
  window.updatePathwayTrunkCapacity = updatePathwayTrunkCapacity;
  window.deletePathwayTrunk = deletePathwayTrunk;
  window.deselectPathwayTrunk = deselectPathwayTrunk;

  // Engineering View State exports
  window.togglePhysicalCableIds = togglePhysicalCableIds;
  window.toggleFieldWalkMode = toggleFieldWalkMode;
  window.updateUnplacedCountBadge = updateUnplacedCountBadge;
  window.deleteSelectedPhysicalItems = deleteSelectedPhysicalItems;
  window.stepToNextDistanceViolation = handlePhysicalDrcPillClick;
  window.handlePhysicalDrcPillClick = handlePhysicalDrcPillClick;
  window.getSelectedNodeId = () => selectedNodeId;
  window.setPhysicalRevisionCompare = setPhysicalRevisionCompare;
  window.populateRevisionCompareDropdown = populateRevisionCompareDropdown;
  window.exportFloorplanToSubmittal = exportFloorplanToSubmittal;
  window.getDeviceCableId = getDeviceCableId;
  window.getFloorDistanceViolations = getFloorDistanceViolations;
  window.toggleFloorActionMenu = toggleFloorActionMenu;
  window.toggleDoriColorBands = toggleDoriColorBands;
  window.snapAllFloorCablesToTrunks = snapAllFloorCablesToTrunks;
}
