// =========================================================================
// OSS ENTERPRISE SUBSYSTEM NAMESPACE REGISTRY (js/core/namespace.js)
// Zero-build modular subsystem registry providing structured namespaces
// alongside backwards-compatible global window.* function exports.
// =========================================================================

(function initOssNamespace(global) {
  const root = global.OSS || {
    Core: {},
    Catalog: {},
    Sizers: {
      UI: {}
    },
    BOM: {},
    Studios: {
      Topology: {},
      Ports: {},
      Rack: {},
      Power: {},
      Physical: {}
    },
    DRC: {},
    Deliverables: {}
  };

  /**
   * Register or merge public API methods onto a dotted OSS subsystem path
   * (e.g., OSS.register("Sizers.Genetec", { GenetecLicensingSizer })).
   */
  root.register = function registerSubsystem(dottedPath, apiObject) {
    if (!dottedPath || !apiObject || typeof apiObject !== "object") return apiObject;
    const parts = String(dottedPath).split(".").filter(Boolean);
    let cursor = root;
    for (const part of parts) {
      if (!cursor[part] || typeof cursor[part] !== "object") {
        cursor[part] = {};
      }
      cursor = cursor[part];
    }
    Object.assign(cursor, apiObject);
    return cursor;
  };

  global.OSS = root;
})(typeof window !== "undefined" ? window : globalThis);
