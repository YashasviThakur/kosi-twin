"""Official Koshi Barrage Gate Status Reports from the Bihar Water Resources Department (FMISC): the real discharge at Birpur.
The department publishes one small PDF at 10 AM and one at 3 PM; each shows the discharge in cusecs (from 2018 on) and the
upstream and downstream levels in feet. Listing page: https://www.fmiscwrdbihar.gov.in/gate/Gatestatus.aspx?y=<year>&g=Kosi
The layout changes from year to year, so the time comes from the file name and the discharge is the Indian-style number
(e.g. 1,24,565) found next to the word DISCHARGE. Used by the live counter (newest report) and by prep/fetch_barrage.py."""
import io
import re
import urllib.parse
import urllib.request
from datetime import datetime

BASE = "https://www.fmiscwrdbihar.gov.in/gate"
UA = {"User-Agent": "Mozilla/5.0 (Kosi Twin; flood planning tool)"}

_LINK = re.compile(r'href=["\']([^"\']+\.pdf)["\']', re.I)
_STAMP = re.compile(r"(\d{1,2}) ([A-Z]{3,9})\.? (\d{4}) AT (\d{1,2})[.:](\d{2}) ?([AP]M)")
_NUM = re.compile(r"\d{1,3}(?:,+\d{2,3})+")
_FEET = re.compile(r"(\d{3}(?:\.\d+)?)\s*\|?\s*FEET", re.I)


def get(url, timeout=25):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def listing(year, timeout=60):
    """PDF links on the year's listing page: [url]."""
    return listing_urls(get(f"{BASE}/Gatestatus.aspx?y={year}&g=Kosi", timeout=timeout).decode("utf-8", "replace"))


def listing_urls(html):
    """The report links in a listing page's HTML."""
    urls = []
    for href in _LINK.findall(html):
        path = href.replace("\\", "/")
        if not path.lower().startswith("http"):
            path = f"{BASE}/{path.lstrip('/')}"
        scheme, rest = path.split("://", 1)
        host, _, tail = rest.partition("/")
        urls.append(f"{scheme}://{host}/{urllib.parse.quote(tail, safe='/')}")
    return urls


def stamp(url):
    """When a report was issued, from its file name: datetime or None."""
    m = _STAMP.search(urllib.parse.unquote(url).upper())
    if not m:
        return None
    month = m[2][:3]
    try:
        return datetime.strptime(f"{m[1]} {month} {m[3]} {m[4]}:{m[5]} {m[6]}", "%d %b %Y %I:%M %p")
    except ValueError:
        return None


def parse(pdf_bytes):
    """{'cusec': int, 'up_ft': float|None, 'down_ft': float|None} from one report, or None if it has no discharge."""
    from pypdf import PdfReader
    text = " ".join(" ".join((p.extract_text() or "").split()) for p in PdfReader(io.BytesIO(pdf_bytes)).pages)
    at = text.upper().find("DISCHARGE")
    nums = [(m.start(), int(re.sub(r"\D", "", m[0]))) for m in _NUM.finditer(text)]
    nums = [(i, v) for i, v in nums if 1_000 <= v <= 1_500_000]
    if not nums:
        return None
    if at >= 0:                                    # the number nearest the label, in either order
        i, v = min(nums, key=lambda n: abs(n[0] - at))
    elif len(nums) == 1:
        i, v = nums[0]
    else:
        return None
    feet = sorted(float(f) for f in _FEET.findall(text))      # the upstream pond is the higher of the two levels
    return {"cusec": v, "up_ft": feet[-1] if feet else None, "down_ft": feet[0] if len(feet) > 1 else None}


def latest(year, timeout=8):
    """The newest report of the year with a discharge: {'time', 'cusec', 'up_ft', 'down_ft', 'url'} or None.
    Short timeouts: this runs inside a request, and API Gateway gives up after 29 seconds."""
    dated = sorted(((stamp(u), u) for u in listing(year, timeout) if stamp(u)), reverse=True)
    for when, url in dated[:3]:                     # the newest few, in case the very latest is blank or still being filled
        r = parse(get(url, timeout))
        if r:
            return {"time": when.isoformat(timespec="minutes"), **r, "url": url}
    return None
