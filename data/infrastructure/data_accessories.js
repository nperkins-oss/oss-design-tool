// =========================================================================
// DATA: INFRASTRUCTURE ACCESSORIES AGGREGATOR
// Combines UPS_PDU_DATABASE, RACKS_MOUNTS_DATABASE, and MEDIA_POE_DATABASE
// into the unified ACCESSORY_DATABASE for CatalogRegistry & BOM Engines.
// =========================================================================

const ACCESSORY_DATABASE = [
  ...(typeof UPS_PDU_DATABASE !== "undefined" ? UPS_PDU_DATABASE : []),
  ...(typeof RACKS_MOUNTS_DATABASE !== "undefined" ? RACKS_MOUNTS_DATABASE : []),
  ...(typeof MEDIA_POE_DATABASE !== "undefined" ? MEDIA_POE_DATABASE : [])
];

if (typeof window !== "undefined") {
  window.ACCESSORY_DATABASE = ACCESSORY_DATABASE;
}
if (typeof module !== "undefined") {
  module.exports = { ACCESSORY_DATABASE };
}
