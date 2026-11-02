// SUBSYSTEM: Core UI Utilities — Debounce & Interactive Table/Split-Pane Resizer Engine (js/core/ui_resizers.js)

// -----------------------------------------------------------
// Performance Utilities (Debounce & Throttling)
// -----------------------------------------------------------
function debounce(func, wait = 150) {
  let timeout;
  const debounced = function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
  debounced.cancel = () => clearTimeout(timeout);
  debounced.flush = (...args) => {
    clearTimeout(timeout);
    return func.apply(this, args);
  };
  return debounced;
}
window.debounce = debounce;

// -----------------------------------------------------------
// Universal Interactive Table Column & Split-Pane Resizer Engine
// -----------------------------------------------------------
window.ossTableColumnWidths = window.ossTableColumnWidths || {};
window.ossPaneWidths = window.ossPaneWidths || {};

function getTableSignature(table, ths) {
  if (table.id) return "id:" + table.id;
  if (table.dataset && table.dataset.tableId) return "ds:" + table.dataset.tableId;
  const headerKey = Array.from(ths)
    .map(th => (th.textContent || "").replace(/\s+/g, " ").trim().slice(0, 28))
    .join("|");
  return "hdr:" + headerKey;
}

function initResizableTables(root = document) {
  if (!root || typeof root.querySelectorAll !== "function") return;
  const tables = root.tagName === "TABLE" ? [root] : Array.from(root.querySelectorAll("table"));
  tables.forEach(table => {
    const headerRow = table.querySelector("thead tr") || table.querySelector("tr");
    if (!headerRow) return;
    const ths = Array.from(headerRow.querySelectorAll("th"));
    if (ths.length < 2) return;

    const sig = getTableSignature(table, ths);
    const savedMap = window.ossTableColumnWidths[sig] || {};
    if (Object.keys(savedMap).length > 0) {
      table.classList.add("oss-table-resized");
    }

    ths.forEach((th, colIdx) => {
      th.classList.add("oss-resizable-th");
      if (savedMap[colIdx]) {
        th.style.width = savedMap[colIdx] + "px";
        th.style.minWidth = savedMap[colIdx] + "px";
        th.style.maxWidth = savedMap[colIdx] + "px";
      }

      if (th.querySelector(".oss-col-resizer")) return;

      const handle = document.createElement("div");
      handle.className = "oss-col-resizer";
      handle.title = "Drag to resize column • Double-click to reset width";

      handle.addEventListener("click", (e) => {
        e.stopPropagation();
      });

      handle.addEventListener("dblclick", (e) => {
        e.preventDefault();
        e.stopPropagation();
        th.style.width = "";
        th.style.minWidth = "";
        th.style.maxWidth = "";
        if (window.ossTableColumnWidths[sig]) {
          delete window.ossTableColumnWidths[sig][colIdx];
          if (Object.keys(window.ossTableColumnWidths[sig]).length === 0) {
            table.classList.remove("oss-table-resized");
          }
        }
      });

      handle.addEventListener("mousedown", (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        const startX = e.clientX;
        const startWidth = th.getBoundingClientRect().width;

        // Lock current pixel widths onto all sibling columns so percentage-width columns don't jump
        if (!window.ossTableColumnWidths[sig]) {
          window.ossTableColumnWidths[sig] = {};
        }
        ths.forEach((sibTh, sibIdx) => {
          const sibW = Math.max(48, Math.round(sibTh.getBoundingClientRect().width));
          if (sibW > 0) {
            sibTh.style.width = sibW + "px";
            sibTh.style.minWidth = sibW + "px";
            sibTh.style.maxWidth = sibW + "px";
            window.ossTableColumnWidths[sig][sibIdx] = sibW;
          }
        });
        table.classList.add("oss-table-resized");

        handle.classList.add("is-resizing");
        document.body.classList.add("oss-is-resizing-col");

        const onMouseMove = (moveEvent) => {
          const delta = moveEvent.clientX - startX;
          const newWidth = Math.max(48, Math.round(startWidth + delta));
          th.style.width = newWidth + "px";
          th.style.minWidth = newWidth + "px";
          th.style.maxWidth = newWidth + "px";
          window.ossTableColumnWidths[sig][colIdx] = newWidth;
        };

        const onMouseUp = () => {
          handle.classList.remove("is-resizing");
          document.body.classList.remove("oss-is-resizing-col");
          window.removeEventListener("mousemove", onMouseMove);
          window.removeEventListener("mouseup", onMouseUp);
        };

        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
      });

      th.appendChild(handle);
    });
  });
}
window.initResizableTables = initResizableTables;

function initResizablePanes(root = document) {
  if (!root || typeof root.querySelectorAll !== "function") return;
  const resizers = Array.from(root.querySelectorAll(".oss-pane-resizer"));
  resizers.forEach(resizer => {
    const targetId = resizer.dataset.resizeTarget;
    if (!targetId) return;
    const targetEl = document.getElementById(targetId);
    if (targetEl && window.ossPaneWidths[targetId]) {
      targetEl.style.width = window.ossPaneWidths[targetId] + "px";
    }
    if (resizer.dataset.ossBound === "1") return;
    resizer.dataset.ossBound = "1";

    resizer.addEventListener("click", (e) => {
      e.stopPropagation();
    });

    resizer.addEventListener("dblclick", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const pane = document.getElementById(targetId);
      if (pane) {
        pane.style.width = "";
      }
      delete window.ossPaneWidths[targetId];
    });

    resizer.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      const pane = document.getElementById(targetId);
      if (!pane) return;
      e.preventDefault();
      e.stopPropagation();

      const edge = resizer.dataset.resizeEdge || "right";
      const minW = parseInt(resizer.dataset.minWidth || "200", 10);
      const maxW = parseInt(resizer.dataset.maxWidth || "680", 10);
      const startX = e.clientX;
      const startWidth = pane.getBoundingClientRect().width;
      const prevTransition = pane.style.transition;
      pane.style.transition = "none";

      resizer.classList.add("is-resizing");
      document.body.classList.add("oss-is-resizing-col");

      const onMouseMove = (moveEvent) => {
        const delta = edge === "left" ? (startX - moveEvent.clientX) : (moveEvent.clientX - startX);
        const newWidth = Math.min(maxW, Math.max(minW, Math.round(startWidth + delta)));
        pane.style.width = newWidth + "px";
        window.ossPaneWidths[targetId] = newWidth;
      };

      const onMouseUp = () => {
        pane.style.transition = prevTransition;
        resizer.classList.remove("is-resizing");
        document.body.classList.remove("oss-is-resizing-col");
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    });
  });
}
window.initResizablePanes = initResizablePanes;

const debouncedInitResizableTables = debounce(() => {
  initResizableTables(document);
  initResizablePanes(document);
}, 60);

document.addEventListener("DOMContentLoaded", () => {
  initResizableTables(document);
  initResizablePanes(document);
  if (typeof MutationObserver !== "undefined" && document.body) {
    const tableObserver = new MutationObserver((mutations) => {
      for (let i = 0; i < mutations.length; i++) {
        const m = mutations[i];
        const t = m.target;
        if (!t || t.namespaceURI === "http://www.w3.org/2000/svg") continue;
        if (t.closest && t.closest("svg, #topologySvgOverlay, #topologyNodesContainer, #cableSvgCanvas")) continue;
        if (m.addedNodes && m.addedNodes.length > 0) {
          for (let j = 0; j < m.addedNodes.length; j++) {
            const node = m.addedNodes[j];
            if (node.nodeType === 1 && (
              node.tagName === "TABLE" ||
              (node.classList && node.classList.contains("oss-pane-resizer")) ||
              (node.querySelector && node.querySelector("table, .oss-pane-resizer"))
            )) {
              debouncedInitResizableTables();
              return;
            }
          }
        }
      }
    });
    tableObserver.observe(document.body, { childList: true, subtree: true });
  }
});

window.debouncedInitResizableTables = debouncedInitResizableTables;
if (window.OSS && typeof window.OSS.register === "function") {
  window.OSS.register("Core.Resizers", { debounce, initResizableTables, initResizablePanes, debouncedInitResizableTables });
}
