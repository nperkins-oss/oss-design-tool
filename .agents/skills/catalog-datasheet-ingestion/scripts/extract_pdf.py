"""
PDF Datasheet Text and Smart Hero-Image Extractor
Extracts raw text, metadata, and ranked product hero photos from single PDFs or batch directories.
Supports automatic transparent WebP generation via --auto-webp <device_id>.
Usage:
    python extract_pdf.py <path_to_pdf_or_dir> [--extract-images] [--out-dir <dir>] [--auto-webp <device_id>] [--json]
"""

import sys
import os
import json
import argparse

# Force UTF-8 stdout encoding on Windows
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        pass

try:
    import pymupdf as fitz
except ImportError:
    try:
        import fitz
    except ImportError:
        import pypdf
        fitz = None


def score_candidate_image(page_idx, width, height, byte_len):
    """
    Scores an extracted PDF image to distinguish the main product hero photo
    from small vendor logos, certification badges, QR codes, or header banners.
    Returns (is_viable, score).
    """
    if width < 120 or height < 120 or byte_len < 2048:
        return False, 0.0
    aspect = width / float(max(1, height))
    if aspect > 4.5 or aspect < 0.22:
        return False, 0.0

    area = width * height
    # Page 1 images get a strong boost; balanced square-ish aspect ratios get a boost
    page_bonus = 2.0 if page_idx == 0 else (1.2 if page_idx == 1 else 0.75)
    aspect_bonus = 1.5 if 0.55 <= aspect <= 1.85 else 1.0
    score = (area / 1000.0) * page_bonus * aspect_bonus
    return True, round(score, 2)


def extract_datasheet_info(pdf_path, extract_images=False, out_dir=None, auto_webp_id=None):
    if not os.path.exists(pdf_path):
        print(f"Error: File not found: {pdf_path}", file=sys.stderr)
        sys.exit(1)

    result = {
        "filePath": pdf_path.replace("\\", "/"),
        "fileName": os.path.basename(pdf_path),
        "pageCount": 0,
        "metadata": {},
        "pages": [],
        "extractedImages": [],
        "heroCandidateImages": [],
        "generatedWebp": None
    }

    should_extract_imgs = extract_images or bool(auto_webp_id)
    if should_extract_imgs and not out_dir:
        workspace_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))
        out_dir = os.path.join(workspace_root, "scratch", "extracted_images", os.path.splitext(os.path.basename(pdf_path))[0])

    candidates = []

    if fitz:
        doc = fitz.open(pdf_path)
        result["pageCount"] = len(doc)
        result["metadata"] = doc.metadata or {}

        for page_idx in range(len(doc)):
            page = doc[page_idx]
            text = page.get_text("text")
            result["pages"].append({
                "pageNumber": page_idx + 1,
                "text": text.strip()
            })

            if should_extract_imgs and out_dir:
                os.makedirs(out_dir, exist_ok=True)
                image_list = page.get_images(full=True)
                for img_idx, img in enumerate(image_list):
                    xref = img[0]
                    base_image = doc.extract_image(xref)
                    image_bytes = base_image["image"]
                    image_ext = base_image["ext"]
                    w = base_image.get("width", 0)
                    h = base_image.get("height", 0)
                    viable, score = score_candidate_image(page_idx, w, h, len(image_bytes))
                    image_filename = f"page_{page_idx + 1}_img_{img_idx + 1}_{w}x{h}.{image_ext}"
                    image_out_path = os.path.join(out_dir, image_filename)
                    with open(image_out_path, "wb") as f:
                        f.write(image_bytes)
                    result["extractedImages"].append(image_out_path)
                    if viable:
                        candidates.append({
                            "path": image_out_path,
                            "page": page_idx + 1,
                            "width": w,
                            "height": h,
                            "bytes": len(image_bytes),
                            "score": score
                        })
        doc.close()
    else:
        reader = pypdf.PdfReader(pdf_path)
        result["pageCount"] = len(reader.pages)
        result["metadata"] = {k: str(v) for k, v in (reader.metadata or {}).items()}
        for page_idx, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            result["pages"].append({
                "pageNumber": page_idx + 1,
                "text": text.strip()
            })

    candidates.sort(key=lambda c: c["score"], reverse=True)
    result["heroCandidateImages"] = candidates

    if auto_webp_id and candidates:
        try:
            from process_image import process_product_image
            best_img = candidates[0]["path"]
            webp_rel = process_product_image(best_img, auto_webp_id, out_size=600, make_transparent=True)
            result["generatedWebp"] = webp_rel
        except Exception as e:
            print(f"Warning: Auto-WebP generation failed for {auto_webp_id}: {e}", file=sys.stderr)

    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Extract text and ranked product hero images from PDF datasheets")
    parser.add_argument("pdf", help="Path to PDF file or directory of PDFs")
    parser.add_argument("--extract-images", action="store_true", help="Extract embedded raster images")
    parser.add_argument("--out-dir", default=None, help="Directory to save extracted images")
    parser.add_argument("--auto-webp", default=None, help="Automatically convert top-ranked hero image to assets/images/products/<id>.webp")
    parser.add_argument("--json", action="store_true", help="Output JSON instead of plain text")
    args = parser.parse_args()

    if os.path.isdir(args.pdf):
        batch_results = []
        for root_dir, _, files in os.walk(args.pdf):
            for fn in sorted(files):
                if fn.lower().endswith(".pdf"):
                    full_p = os.path.join(root_dir, fn)
                    batch_results.append(extract_datasheet_info(full_p, extract_images=args.extract_images, out_dir=args.out_dir))
        if args.json:
            print(json.dumps(batch_results, indent=2))
        else:
            print(f"=== Extracted {len(batch_results)} PDFs from {args.pdf} ===")
            for info in batch_results:
                hero = info["heroCandidateImages"][0]["path"] if info["heroCandidateImages"] else "None"
                print(f"- {info['filePath']} ({info['pageCount']} pages, top hero image: {hero})")
    else:
        info = extract_datasheet_info(args.pdf, extract_images=args.extract_images, out_dir=args.out_dir, auto_webp_id=args.auto_webp)
        if args.json:
            print(json.dumps(info, indent=2))
        else:
            print(f"=== {info['fileName']} ({info['pageCount']} pages) ===")
            for p in info["pages"]:
                print(f"\n--- PAGE {p['pageNumber']} ---")
                print(p["text"])
            if info["heroCandidateImages"]:
                best = info["heroCandidateImages"][0]
                print(f"\nTop Hero Image Candidate: {best['path']} ({best['width']}x{best['height']}, score={best['score']})")
            if info["generatedWebp"]:
                print(f"Generated Product WebP: {info['generatedWebp']}")
