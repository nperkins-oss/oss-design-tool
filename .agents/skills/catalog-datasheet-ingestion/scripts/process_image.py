"""
Product Image Normalizer and WebP Optimizer
Standardizes product photos to square transparent WebP format for NetSelect Enterprise.
Usage:
    python process_image.py <input_image> <device_id> [--size 600] [--transparent-bg] [--quality 85]
"""

import sys
import os
import argparse
from PIL import Image

def process_product_image(input_path, device_id, out_size=600, make_transparent=False, quality=85, out_dir=None):
    if not os.path.exists(input_path):
        print(f"Error: Input image not found: {input_path}", file=sys.stderr)
        sys.exit(1)

    img = Image.open(input_path).convert("RGBA")

    # If requested and image has white/near-white background, convert white pixels to transparent
    if make_transparent:
        datas = img.getdata()
        new_data = []
        for item in datas:
            # Check for near white (R>245, G>245, B>245)
            if item[0] > 245 and item[1] > 245 and item[2] > 245:
                new_data.append((255, 255, 255, 0))
            else:
                new_data.append(item)
        img.putdata(new_data)

    # Autocrop transparent borders
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)

    # Scale while maintaining aspect ratio to fit inside (out_size - padding, out_size - padding)
    padding = int(out_size * 0.08) # 8% margin
    target_inner = out_size - (padding * 2)

    w, h = img.size
    ratio = min(target_inner / w, target_inner / h)
    new_w = max(1, int(w * ratio))
    new_h = max(1, int(h * ratio))

    resized_img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)

    # Place centered on square transparent canvas
    canvas = Image.new("RGBA", (out_size, out_size), (0, 0, 0, 0))
    offset_x = (out_size - new_w) // 2
    offset_y = (out_size - new_h) // 2
    canvas.paste(resized_img, (offset_x, offset_y), resized_img)

    # Determine output path
    if out_dir is None:
        # Default workspace path
        workspace_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
        out_dir = os.path.join(workspace_root, "assets", "images", "products")
    
    os.makedirs(out_dir, exist_ok=True)
    clean_id = device_id.lower().replace(" ", "-").replace("_", "-")
    if not clean_id.endswith(".webp"):
        clean_id += ".webp"
    
    out_path = os.path.join(out_dir, clean_id)
    canvas.save(out_path, "WEBP", quality=quality, method=6)
    
    file_size_kb = os.path.getsize(out_path) / 1024
    print(f"Success: Processed {input_path} -> {out_path} ({out_size}x{out_size} WebP, {file_size_kb:.1f} KB)")
    
    # Return relative path from workspace root
    rel_path = f"assets/images/products/{clean_id}"
    return rel_path

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Normalize product images to transparent WebP")
    parser.add_argument("input", help="Path to input image (PNG/JPG)")
    parser.add_argument("id", help="Device ID (e.g. axis-p3265-lve or amg-150-1gat)")
    parser.add_argument("--size", type=int, default=600, help="Output canvas square size (default: 600)")
    parser.add_argument("--transparent-bg", action="store_true", help="Remove near-white background pixels")
    parser.add_argument("--quality", type=int, default=85, help="WebP compression quality (default: 85)")
    parser.add_argument("--out-dir", default=None, help="Custom output directory")
    args = parser.parse_args()

    process_product_image(args.input, args.id, out_size=args.size, make_transparent=args.transparent_bg, quality=args.quality, out_dir=args.out_dir)
