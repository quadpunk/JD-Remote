#!/usr/bin/env python3
"""Check that all Web Appearance theme values (JD-Xi page and JD-XA page) have native Compose palettes."""
from pathlib import Path
import re
root = Path(__file__).resolve().parents[1]
kt = (root / "app/src/main/java/com/quadpunk/jdxi/Theme.kt").read_text()
native = set(re.findall(r'"([a-z0-9-]+)"\s+to\s+Palette\(', kt))
allweb = set()
for page in ("jdxi.html", "jdxa.html"):
    html = (root / "app/src/main/assets/web" / page).read_text()
    menu = re.search(r'<select id="theme"[^>]*>(.*?)</select>', html, re.S)
    if not menu:
        raise SystemExit(f"Appearance select not found in {page}")
    web = set(re.findall(r'<option value="([a-z0-9-]+)"', menu.group(1)))
    missing = web - native
    if missing:
        raise SystemExit(f"{page}: missing native palettes: {sorted(missing)}")
    allweb |= web
print("PASS: all", len(allweb), "Appearance options (jdxi.html + jdxa.html) have native Compose palettes:", ", ".join(sorted(allweb)))
