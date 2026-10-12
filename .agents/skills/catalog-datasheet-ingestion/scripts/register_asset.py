"""
Catalog Asset Registration Helper
Registers a product's image and datasheet PDF path into data/data_assets.js.
Validates file existence on disk before updating.
Usage:
    python register_asset.py <key> <datasheet_rel_path> <image_rel_path> [--alt-key <key2>]
"""

import sys
import os
import re
import argparse

def register_asset(key, datasheet_path, image_path, alt_keys=None):
    workspace_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
    data_assets_path = os.path.join(workspace_root, "data", "data_assets.js")

    if not os.path.exists(data_assets_path):
        print(f"Error: data_assets.js not found at {data_assets_path}", file=sys.stderr)
        sys.exit(1)

    # Validate physical existence of referenced assets (warn if missing)
    full_ds_path = os.path.join(workspace_root, datasheet_path.replace("/", os.sep))
    full_img_path = os.path.join(workspace_root, image_path.replace("/", os.sep))

    if not os.path.exists(full_ds_path):
        print(f"Warning: Datasheet PDF not found on disk at: {full_ds_path}", file=sys.stderr)
    else:
        print(f"Verified: Datasheet PDF exists ({os.path.getsize(full_ds_path) / 1024:.1f} KB)")

    if not os.path.exists(full_img_path):
        print(f"Warning: Product image not found on disk at: {full_img_path}", file=sys.stderr)
    else:
        print(f"Verified: Product image exists ({os.path.getsize(full_img_path) / 1024:.1f} KB)")

    with open(data_assets_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Find CATALOG_ASSETS declaration
    match = re.search(r"const\s+CATALOG_ASSETS\s*=\s*\{", content)
    if not match:
        print("Error: Could not find 'const CATALOG_ASSETS = {' in data_assets.js", file=sys.stderr)
        sys.exit(1)

    insert_pos = match.end()

    all_keys = [key]
    if alt_keys:
        all_keys.extend(alt_keys)

    # Format entries
    formatted_entries = ""
    for k in all_keys:
        # Check if key already exists
        escaped_k = re.escape(k)
        if re.search(rf'"{escaped_k}"\s*:\s*\{{', content):
            print(f"Notice: Asset key '{k}' already exists in CATALOG_ASSETS. Updating existing entry...")
            pattern = rf'"{escaped_k}"\s*:\s*\{{[^}}]*\}}'
            replacement = f'"{k}": {{\n    "datasheetPath": "{datasheet_path}",\n    "image": "{image_path}"\n  }}'
            content = re.sub(pattern, replacement, content, count=1)
        else:
            entry_text = f'\n  "{k}": {{\n    "datasheetPath": "{datasheet_path}",\n    "image": "{image_path}"\n  }},'
            formatted_entries += entry_text

    if formatted_entries:
        content = content[:insert_pos] + formatted_entries + content[insert_pos:]

    with open(data_assets_path, "w", encoding="utf-8") as f:
        f.write(content)

    print(f"Success: Registered {len(all_keys)} key(s) in data/data_assets.js")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Register asset in data/data_assets.js")
    parser.add_argument("key", help="Primary SKU or Model ID (e.g. 'axis-p3265-lve' or '02327-001')")
    parser.add_argument("datasheet", help="Relative path to datasheet PDF (e.g. 'Datasheets/Cameras/Axis/...')")
    parser.add_argument("image", help="Relative path to product image (e.g. 'assets/images/products/...')")
    parser.add_argument("--alt-key", action="append", help="Alternative SKU/lookup key to also register")
    args = parser.parse_args()

    register_asset(args.key, args.datasheet, args.image, alt_keys=args.alt_key)
