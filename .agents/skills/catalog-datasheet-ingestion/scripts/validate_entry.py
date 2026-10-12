"""
Catalog Entry & DRC Pre-Flight Validator
Validates schema compliance, asset linkage, and Design Rule Checker (DRC) compatibility
for devices across all categories (Physical Security, Networking, Infrastructure, Accessories).
Usage:
    python validate_entry.py <device_json_file_or_string>
"""

import sys
import os
import json
import re
import argparse

# Force UTF-8 stdout encoding on Windows
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        pass

def validate_catalog_entry(item):
    errors = []
    warnings = []
    info = []

    # 1. Universal Base Fields
    required_base = ["id", "vendor", "model", "sku", "role", "category", "msrp"]
    for field in required_base:
        if field not in item or item[field] is None or str(item[field]).strip() == "":
            errors.append(f"Missing required base field: '{field}'")

    category = (item.get("category") or "").lower()
    role = (item.get("role") or "").lower()
    model = item.get("model") or ""

    # 2. Domain-Specific & DRC Checks

    # --- CAMERAS ---
    if category == "cameras" or role == "camera" or "camera" in model.lower():
        if "poeStandard" not in item:
            errors.append("Camera missing 'poeStandard' (e.g. '802.3af', '802.3at', '802.3bt')")
        elif item["poeStandard"] not in ["802.3af", "802.3at", "802.3bt"]:
            warnings.append(f"Unrecognized poeStandard: '{item['poeStandard']}'. Expected '802.3af', '802.3at', or '802.3bt'")

        watts = item.get("powerConsumptionWatts") or item.get("baseWatts") or 0
        if watts <= 0:
            warnings.append("Camera power consumption (powerConsumptionWatts) not specified or zero")
        
        max_watts = item.get("maxPowerWatts") or watts
        is_outdoor = item.get("outdoor") is True or item.get("isOutdoor") is True or "ip66" in str(item.get("ipRating", "")).lower() or "outdoor" in model.lower()

        if is_outdoor and max_watts > 30:
            info.append(f"DRC Rule 12 Check: Outdoor device drawing {max_watts}W (>30W 802.3bt) - will mandate 802.3bt-certified surge suppressor (DITEK SURGE-POE-BT90)")

        if is_outdoor:
            info.append("DRC Rule 9 Check: Outdoor camera - will require Cat6A OSP gel-filled cable in underground/exterior pathway")

        if not item.get("resolution"):
            warnings.append("Camera missing 'resolution' (e.g. '2MP (1080p)', '4K (8MP)')")
        if not item.get("formFactor"):
            warnings.append("Camera missing 'formFactor' (e.g. 'Dome', 'Bullet', 'PTZ', 'Multi-Sensor', 'Turret')")

    # --- ACCESS CONTROL ---
    elif category == "access_control" or "access" in category or "access" in role or "lock" in role:
        sec_level = item.get("securityLevel")
        if sec_level not in [1, 2, 3]:
            warnings.append(f"Access hardware recommended to specify 'securityLevel' (1=Public, 2=Restricted, 3=SCIF/Vault). Got: {sec_level}")
        
        is_maglock = "maglock" in model.lower() or item.get("lockType") == "maglock"
        if sec_level == 3 and is_maglock:
            errors.append("DRC Rule 11 & NFPA 101 Violation: Maglocks are STRICTLY PROHIBITED on Security Level 3 openings (maglocks cannot fail secure on power loss/FAI drop)")

        if "powerSource" not in item:
            warnings.append("Access hardware recommended to declare 'powerSource' ('poe_switch' or 'external_dc')")

    # --- NETWORKING (SWITCHES & ROUTERS) ---
    elif category == "networking" or "switch" in role or "switch" in model.lower():
        if "ports" not in item:
            warnings.append("Switch missing 'ports' count (e.g. 24, 48)")
        if "poeBudget" not in item and "poe" in model.lower():
            warnings.append("PoE switch missing 'poeBudget' in Watts (critical for DRC Rule 2 power budget validation)")
        if item.get("dualPowerSupply") is True or item.get("dualPsu") is True:
            info.append("DRC Rule 14 Check: Switch has redundant dual power supplies - requires Circuit A / UPS A and Circuit B / UPS B dual PDU feeds")
        if item.get("uplinkSpeed") == "10G" or "10g" in str(item.get("ports", "")).lower():
            info.append("DRC Rule 13 Check: 10GBASE-T links mandate Cat6A cabling per Orion Standards (Cat6 prohibited)")

    # --- INFRASTRUCTURE & POWER (UPS, PDU, CABLING) ---
    elif category in ["infrastructure", "power", "cabling", "ups", "pdu"]:
        if role == "UPS" or "ups" in model.lower():
            va = item.get("va") or 0
            if va >= 3000:
                info.append(f"DRC Rule 8A Check: High-capacity UPS ({va}VA) requires dedicated 30A locking branch circuit (NEMA L5-30P / L6-30P)")
        elif "cabling" in category or "cable" in role:
            rating = (item.get("rating") or item.get("jacketType") or "").upper()
            if rating in ["CMP", "PLENUM", "CMR", "RISER"]:
                info.append("DRC Rule 9 Check: Indoor-rated cable must not be deployed in wet locations or exterior conduit")

    # 3. Asset & Datasheet Verification
    workspace_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
    data_assets_path = os.path.join(workspace_root, "data", "data_assets.js")

    item_id = item.get("id") or ""
    item_sku = item.get("sku") or ""

    if os.path.exists(data_assets_path):
        with open(data_assets_path, "r", encoding="utf-8") as f:
            assets_content = f.read()

        has_asset_id = f'"{item_id}"' in assets_content
        has_asset_sku = f'"{item_sku}"' in assets_content

        if not has_asset_id and not has_asset_sku:
            warnings.append(f"Asset is not registered in data/data_assets.js under ID '{item_id}' or SKU '{item_sku}'")
        else:
            info.append(f"Confirmed registration in data/data_assets.js")

    # Image file check
    expected_image = f"assets/images/products/{item_id}.webp"
    full_image_path = os.path.join(workspace_root, expected_image.replace("/", os.sep))
    if not os.path.exists(full_image_path):
        warnings.append(f"Product image does not exist on disk at: {expected_image}")
    else:
        info.append(f"Product image verified on disk ({os.path.getsize(full_image_path) / 1024:.1f} KB)")

    print(f"\n=======================================================")
    print(f"Validation Report: {item.get('vendor', 'Unknown')} {item.get('model', 'Unknown')}")
    print(f"ID: {item_id} | SKU: {item_sku} | Category: {category} | Role: {role}")
    print(f"=======================================================")

    if errors:
        print(f"\n[FAIL] {len(errors)} Critical Error(s):")
        for e in errors:
            print(f"  ❌ {e}")
    else:
        print("\n[PASS] No critical schema errors.")

    if warnings:
        print(f"\n[WARN] {len(warnings)} Warning(s):")
        for w in warnings:
            print(f"  ⚠️  {w}")

    if info:
        print(f"\n[INFO] {len(info)} Telemetry & DRC Compatibility Note(s):")
        for i in info:
            print(f"  ℹ️  {i}")

    return len(errors) == 0

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Validate catalog entry against schemas and DRC rules")
    parser.add_argument("input", help="Path to JSON file or raw JSON string of the device entry")
    args = parser.parse_args()

    data = None
    if os.path.exists(args.input):
        with open(args.input, "r", encoding="utf-8") as f:
            data = json.load(f)
    else:
        try:
            data = json.loads(args.input)
        except Exception as e:
            print(f"Error parsing input as JSON or file: {e}", file=sys.stderr)
            sys.exit(1)

    success = validate_catalog_entry(data)
    sys.exit(0 if success else 1)
