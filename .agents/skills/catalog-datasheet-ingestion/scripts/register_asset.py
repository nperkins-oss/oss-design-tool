"""
Catalog Asset Registration Helper
Registers one or more products' image and datasheet PDF paths into data/data_assets.js.
Validates file existence on disk before updating.
Usage:
    python register_asset.py <key> <datasheet_rel_path> <image_rel_path> [--alt-key <key2>]
    python register_asset.py --batch <batch_json_file>
"""

import sys
import os
import re
import json
import argparse

# Force UTF-8 stdout encoding on Windows
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        pass


def get_workspace_root():
    return os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))


def parse_catalog_assets(content):
    match = re.search(r"const\s+CATALOG_ASSETS\s*=\s*(\{[\s\S]*?\n\});?", content)
    if not match:
        return None, None
    obj_text = match.group(1)
    try:
        return json.loads(obj_text), match.span(1)
    except Exception:
        return None, match.span(1)


def save_catalog_assets(data_assets_path, content, assets_dict, span):
    sorted_keys = sorted(assets_dict.keys(), key=lambda k: (k.lower(), k))
    lines = ["{"]
    for idx, k in enumerate(sorted_keys):
        entry = assets_dict[k]
        comma = "," if idx < len(sorted_keys) - 1 else ""
        lines.append(f'    {json.dumps(k)}: {{')
        inner_keys = []
        if entry.get("datasheetPath"):
            inner_keys.append(f'        "datasheetPath": {json.dumps(entry["datasheetPath"])}')
        if entry.get("image"):
            inner_keys.append(f'        "image": {json.dumps(entry["image"])}')
        lines.append(",\n".join(inner_keys))
        lines.append(f'    }}{comma}')
    lines.append("}")
    new_obj_text = "\n".join(lines)
    new_content = content[:span[0]] + new_obj_text + content[span[1]:]
    with open(data_assets_path, "w", encoding="utf-8", newline="\n") as f:
        f.write(new_content)


def register_assets_batch(entries):
    workspace_root = get_workspace_root()
    data_assets_path = os.path.join(workspace_root, "data", "data_assets.js")

    if not os.path.exists(data_assets_path):
        print(f"Error: data_assets.js not found at {data_assets_path}", file=sys.stderr)
        sys.exit(1)

    with open(data_assets_path, "r", encoding="utf-8") as f:
        content = f.read()

    assets_dict, span = parse_catalog_assets(content)
    if assets_dict is None:
        print("Error: Could not parse CATALOG_ASSETS in data/data_assets.js", file=sys.stderr)
        sys.exit(1)

    registered_count = 0
    for item in entries:
        keys = []
        if item.get("key"):
            keys.append(item["key"])
        if item.get("id"):
            keys.append(item["id"])
        if item.get("sku"):
            keys.append(item["sku"])
        for ak in (item.get("altKeys") or item.get("alt_keys") or []):
            if ak:
                keys.append(ak)
        # Deduplicate while preserving order
        seen = set()
        unique_keys = [k for k in keys if k and not (k in seen or seen.add(k))]

        ds_path = item.get("datasheetPath") or item.get("datasheet") or ""
        img_path = item.get("image") or ""
        if not ds_path and not img_path:
            continue

        if ds_path:
            full_ds = os.path.join(workspace_root, ds_path.replace("/", os.sep))
            if not os.path.exists(full_ds):
                print(f"Warning: Datasheet PDF not found on disk at: {full_ds}", file=sys.stderr)
        if img_path:
            full_img = os.path.join(workspace_root, img_path.replace("/", os.sep))
            if not os.path.exists(full_img):
                print(f"Warning: Product image not found on disk at: {full_img}", file=sys.stderr)

        for k in unique_keys:
            existing = assets_dict.get(k, {})
            updated = {}
            if ds_path or existing.get("datasheetPath"):
                updated["datasheetPath"] = ds_path or existing.get("datasheetPath")
            if img_path or existing.get("image"):
                updated["image"] = img_path or existing.get("image")
            assets_dict[k] = updated
            registered_count += 1

    save_catalog_assets(data_assets_path, content, assets_dict, span)
    print(f"Success: Registered/updated {registered_count} key(s) in data/data_assets.js (Total keys: {len(assets_dict)})")


def register_asset(key, datasheet_path, image_path, alt_keys=None):
    register_assets_batch([{
        "key": key,
        "datasheetPath": datasheet_path,
        "image": image_path,
        "altKeys": alt_keys or []
    }])


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Register asset(s) in data/data_assets.js")
    parser.add_argument("key", nargs="?", help="Primary SKU or Model ID (e.g. 'axis-p3265-lve' or '02327-001')")
    parser.add_argument("datasheet", nargs="?", help="Relative path to datasheet PDF")
    parser.add_argument("image", nargs="?", help="Relative path to product image")
    parser.add_argument("--alt-key", action="append", help="Alternative SKU/lookup key to also register")
    parser.add_argument("--batch", help="Path to JSON file containing an array of items to register")
    args = parser.parse_args()

    if args.batch:
        with open(args.batch, "r", encoding="utf-8") as f:
            payload = json.load(f)
        items = payload.get("items", payload) if isinstance(payload, dict) else payload
        if not isinstance(items, list):
            items = [items]
        register_assets_batch(items)
    elif args.key and (args.datasheet or args.image):
        register_asset(args.key, args.datasheet or "", args.image or "", alt_keys=args.alt_key)
    else:
        parser.print_help()
        sys.exit(1)
