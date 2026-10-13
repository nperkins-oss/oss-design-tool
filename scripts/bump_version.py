#!/usr/bin/env python3
"""
bump_version.py - Single-Source-of-Truth Version & Build Stamp Synchronizer
OSS Network & Security Design Tool (NetSelect Enterprise)

Usage:
  python scripts/bump_version.py --set 0.11.0-beta.2
  python scripts/bump_version.py --patch
  python scripts/bump_version.py --minor --prerelease rc.1
  python scripts/bump_version.py --release
"""
import argparse
import datetime
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
VERSION_FILE = ROOT / "VERSION.json"
APP_JS_FILE = ROOT / "js" / "core" / "app.js"
INDEX_HTML_FILE = ROOT / "index.html"
LOGIN_HTML_FILE = ROOT / "login.html"


def parse_semver(ver_str: str):
    m = re.match(r"^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$", ver_str.strip().lstrip("v"))
    if not m:
        raise ValueError(f"Invalid SemVer string: {ver_str}")
    return int(m.group(1)), int(m.group(2)), int(m.group(3)), m.group(4)


def main():
    parser = argparse.ArgumentParser(description="Bump and synchronize OSS Design Tool version")
    parser.add_argument("--set", dest="set_version", help="Explicit version (e.g., 0.11.0-beta.2)")
    parser.add_argument("--major", action="store_true", help="Increment major version")
    parser.add_argument("--minor", action="store_true", help="Increment minor version")
    parser.add_argument("--patch", action="store_true", help="Increment patch version or prerelease counter")
    parser.add_argument("--prerelease", help="Set prerelease tag (e.g., alpha.1, beta.1, rc.1)")
    parser.add_argument("--release", action="store_true", help="Strip prerelease tag for production release")
    parser.add_argument("--schema", help="Update schemaVersion (e.g., 2.1.0)")
    args = parser.parse_args()

    data = json.loads(VERSION_FILE.read_text(encoding="utf-8"))
    cur_ver = data.get("version", "0.11.0-beta.1")
    major, minor, patch, pre = parse_semver(cur_ver)

    if args.set_version:
        major, minor, patch, pre = parse_semver(args.set_version)
    elif args.major:
        major += 1
        minor = 0
        patch = 0
        pre = args.prerelease
    elif args.minor:
        minor += 1
        patch = 0
        pre = args.prerelease
    elif args.patch:
        if pre and not args.prerelease:
            # Increment trailing number in prerelease if present (e.g., beta.1 -> beta.2)
            pm = re.match(r"^([a-zA-Z]+)(?:\.(\d+))?$", pre)
            if pm:
                tag = pm.group(1)
                num = int(pm.group(2) or 0) + 1
                pre = f"{tag}.{num}"
            else:
                patch += 1
        else:
            patch += 1
            if args.prerelease:
                pre = args.prerelease
    elif args.prerelease:
        pre = args.prerelease

    if args.release:
        pre = None

    new_ver = f"{major}.{minor}.{patch}" + (f"-{pre}" if pre else "")
    build_stamp = datetime.datetime.now().strftime("%Y.%m.%d.%H%M")
    schema_ver = args.schema or data.get("schemaVersion", "2.1.0")

    data["version"] = new_ver
    data["build"] = build_stamp
    data["schemaVersion"] = schema_ver
    VERSION_FILE.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")

    # Sync js/core/app.js
    if APP_JS_FILE.exists():
        app_text = APP_JS_FILE.read_text(encoding="utf-8")
        app_text = re.sub(
            r'const APP_VERSION\s*=\s*"[^"]+";',
            f'const APP_VERSION = "{new_ver}";',
            app_text,
            count=1,
        )
        app_text = re.sub(
            r'const BUILD_NUMBER\s*=\s*"[^"]+";',
            f'const BUILD_NUMBER = "{build_stamp}";',
            app_text,
            count=1,
        )
        app_text = re.sub(
            r'const SCHEMA_VERSION\s*=\s*"[^"]+";',
            f'const SCHEMA_VERSION = "{schema_ver}";',
            app_text,
            count=1,
        )
        APP_JS_FILE.write_text(app_text, encoding="utf-8")

    # Sync index.html fallback badge text
    if INDEX_HTML_FILE.exists():
        idx_text = INDEX_HTML_FILE.read_text(encoding="utf-8")
        idx_text = re.sub(
            r'(<span[^>]*id="appVersionBadge"[^>]*>)[^<]*(</span>)',
            rf"\g<1>v{new_ver}\g<2>",
            idx_text,
            count=1,
        )
        INDEX_HTML_FILE.write_text(idx_text, encoding="utf-8")

    # Sync login.html badge
    if LOGIN_HTML_FILE.exists():
        login_text = LOGIN_HTML_FILE.read_text(encoding="utf-8")
        login_text = re.sub(
            r"(Orion Security Solutions &bull; )v[0-9A-Za-z.\-]+",
            rf"\g<1>v{new_ver}",
            login_text,
            count=1,
        )
        LOGIN_HTML_FILE.write_text(login_text, encoding="utf-8")

    print(f"[Version Sync] Updated APP_VERSION = v{new_ver}, BUILD_NUMBER = {build_stamp}, SCHEMA_VERSION = {schema_ver}")


if __name__ == "__main__":
    main()
