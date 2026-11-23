"""Combine Persian Markdown files into one RTL PDF (headless Edge print, Vazirmatn font).

Usage: python md_to_pdf.py OUT.pdf "Cover title" FILE1.md [FILE2.md ...]
"""
import re
import subprocess
import sys
from pathlib import Path

import markdown

W = Path(__file__).resolve().parent
FONT = (W / "app_ref" / "Vazirmatn-Variable.woff2").as_uri()
EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

CSS = f"""
@font-face {{ font-family: V; src: url('{FONT}') format('woff2'); font-weight: 100 900; }}
@page {{ size: A4; margin: 16mm 14mm; }}
html {{ direction: rtl; }}
body {{ font-family: V; font-size: 11.5pt; line-height: 1.85; color: #1B2A4A; margin: 0; }}
.cover {{ height: 255mm; display: flex; flex-direction: column; justify-content: center; align-items: center;
  background: #1B2A4A; color: #F2EAD3; border-radius: 6mm; text-align: center; page-break-after: always; }}
.cover h1 {{ font-size: 30pt; color: #F2EAD3; border: 0; margin: 0 0 6mm; }}
.cover p {{ color: #C99A3C; font-size: 14pt; margin: 0; }}
h1 {{ font-size: 19pt; color: #1B2A4A; border-bottom: 3px solid #C99A3C; padding-bottom: 2mm; }}
h2 {{ font-size: 15pt; color: #1B2A4A; margin-top: 8mm; border-right: 5px solid #C99A3C; padding-right: 3mm; }}
h3 {{ font-size: 13pt; color: #8a6a22; }}
.doc + .doc {{ page-break-before: always; }}
table {{ width: 100%; border-collapse: collapse; margin: 3mm 0 5mm; font-size: 10pt; page-break-inside: auto; }}
tr {{ page-break-inside: avoid; }}
th {{ background: #1B2A4A; color: #F2EAD3; font-weight: 700; }}
th, td {{ border: 1px solid #d9d2bf; padding: 2mm 2.5mm; vertical-align: top; text-align: right; }}
tr:nth-child(even) td {{ background: #F7F4EC; }}
pre {{ background: #F3F0E8; border: 1px solid #e3dcc8; border-radius: 3mm; padding: 3mm 4mm;
  white-space: pre-wrap; word-wrap: break-word; font-family: V; font-size: 10.5pt; direction: rtl; }}
code {{ font-family: V; background: #F3F0E8; padding: 0 1.5mm; border-radius: 1mm; direction: ltr; unicode-bidi: embed; }}
pre code {{ background: none; padding: 0; direction: rtl; }}
blockquote {{ margin: 3mm 0; padding: 2mm 4mm; background: #FBF6E8; border-right: 4px solid #C99A3C; }}
a {{ color: #8a6a22; text-decoration: none; }}
hr {{ border: 0; border-top: 1px solid #e3dcc8; margin: 6mm 0; }}
li {{ margin: 1mm 0; }}
"""


def md_html(path: Path) -> str:
    text = path.read_text(encoding="utf-8")
    text = re.sub(r"- \[ \] ", "- ☐ ", text)  # checklists read as boxes on paper
    # links to local files mean nothing on a phone PDF: keep only the visible text
    text = re.sub(r"\[([^\]]+)\]\((?!https?:)[^)]+\)", r"\1", text)
    text = re.sub(r"peleh_[\w\-]+\.md", "بخش دیگر همین PDF", text)
    # Python-Markdown needs a blank line before a list that follows a paragraph line
    text = re.sub(r"(?m)^(?!\s*(?:[-*]|\d+\.)\s)(\S.*)\n(\s*(?:[-*]|\d+\.)\s)", r"\1\n\n\2", text)
    return markdown.markdown(text, extensions=["tables", "fenced_code", "sane_lists"])


def build(out: Path, title: str, files: list[Path]) -> None:
    body = f"<div class='cover'><h1>{title}</h1><p>پله · آبان ۱۴۰۵</p></div>"
    body += "".join(f"<div class='doc'>{md_html(f)}</div>" for f in files)
    src = out.with_suffix(".html")
    src.write_text(f"<!doctype html><html lang='fa'><meta charset='utf-8'><style>{CSS}</style><body>{body}</body></html>",
                   encoding="utf-8")
    subprocess.run([EDGE, "--headless=new", "--disable-gpu", "--no-pdf-header-footer",
                    f"--print-to-pdf={out}", src.as_uri()], check=True, capture_output=True)
    src.unlink()


if __name__ == "__main__":
    build(Path(sys.argv[1]).resolve(), sys.argv[2], [Path(p).resolve() for p in sys.argv[3:]])
