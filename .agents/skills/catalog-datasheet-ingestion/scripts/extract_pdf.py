"""
PDF Datasheet Text and Image Extractor
Extracts raw text, table text, metadata, and embedded images from manufacturer cutsheets.
Usage:
    python extract_pdf.py <path_to_pdf> [--extract-images] [--out-dir <dir>]
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

def extract_datasheet_info(pdf_path, extract_images=False, out_dir=None):
    if not os.path.exists(pdf_path):
        print(f"Error: File not found: {pdf_path}", file=sys.stderr)
        sys.exit(1)

    result = {
        "filePath": pdf_path,
        "fileName": os.path.basename(pdf_path),
        "pageCount": 0,
        "metadata": {},
        "pages": [],
        "extractedImages": []
    }

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

            if extract_images and out_dir:
                os.makedirs(out_dir, exist_ok=True)
                image_list = page.get_images(full=True)
                for img_idx, img in enumerate(image_list):
                    xref = img[0]
                    base_image = doc.extract_image(xref)
                    image_bytes = base_image["image"]
                    image_ext = base_image["ext"]
                    image_filename = f"page_{page_idx + 1}_img_{img_idx + 1}.{image_ext}"
                    image_out_path = os.path.join(out_dir, image_filename)
                    with open(image_out_path, "wb") as f:
                        f.write(image_bytes)
                    result["extractedImages"].append(image_out_path)
        doc.close()
    else:
        reader = pypdf.PdfReader(pdf_path)
        result["pageCount"] = len(reader.pages)
        result["metadata"] = reader.metadata or {}
        for page_idx, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            result["pages"].append({
                "pageNumber": page_idx + 1,
                "text": text.strip()
            })

    return result

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Extract text and images from PDF datasheets")
    parser.add_argument("pdf", help="Path to PDF file")
    parser.add_argument("--extract-images", action="store_true", help="Extract embedded raster images")
    parser.add_argument("--out-dir", default=None, help="Directory to save extracted images")
    parser.add_argument("--json", action="store_true", help="Output full JSON instead of plain text")
    args = parser.parse_args()

    info = extract_datasheet_info(args.pdf, extract_images=args.extract_images, out_dir=args.out_dir)

    if args.json:
        print(json.dumps(info, indent=2))
    else:
        print(f"=== {info['fileName']} ({info['pageCount']} pages) ===")
        for p in info["pages"]:
            print(f"\n--- PAGE {p['pageNumber']} ---")
            print(p["text"])
        if info["extractedImages"]:
            print(f"\nExtracted {len(info['extractedImages'])} images to {args.out_dir}")
