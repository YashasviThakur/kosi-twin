"""Plain-language flood advisory for a village card. Template version; Bedrock rewrites it in step 2,
and this template stays as the fallback so a warning is always available."""
from datetime import datetime


def _clock_en(iso):
    h = datetime.fromisoformat(iso).hour
    return f"{h % 12 or 12} {'AM' if h < 12 else 'PM'}"


def _clock_hi(iso):
    t = datetime.fromisoformat(iso)
    h = t.hour
    part = "सुबह" if 4 <= h < 12 else "दोपहर" if 12 <= h < 16 else "शाम" if 16 <= h < 19 else "रात"
    return f"{part} {h % 12 or 12} बजे"


def template(card):
    name, name_hi = card["name"], card.get("name_hi") or card["name"]
    if card["risk"] == "SAFE":
        return {"source": "template",
                "en": f"{name} is not expected to flood in the next 48 hours. Keep listening for updates.",
                "hi": f"अगले 48 घंटों में {name_hi} में बाढ़ की आशंका नहीं है। सूचना सुनते रहें।"}

    depth = card["max_depth_band"]
    eta_en, eta_hi = _clock_en(card["eta_time"]), _clock_hi(card["eta_time"])
    if depth is None:
        en = [f"Flood water may reach the outskirts of {name} by {eta_en}."]
        hi = [f"{eta_hi} तक {name_hi} के बाहरी हिस्से में पानी पहुँच सकता है।"]
    else:
        en = [f"Flood water may reach {name} by {eta_en}, about {depth['en']}."]
        hi = [f"{name_hi} में {eta_hi} तक पानी पहुँच सकता है, लगभग {depth['hi']}।"]

    if card["needs_boat"]:
        en.append("No dry road to a shelter was found. Move to the highest roof or embankment nearby and wait for a boat.")
        hi.append("सुरक्षित जगह तक सूखा रास्ता नहीं मिला। सबसे ऊँची छत या बाँध पर जाएँ और नाव का इंतज़ार करें।")
    else:
        r = card["route"]
        when_en = "now" if card["leave_now"] else f"before {_clock_en(card['leave_by_time'])}"
        when_hi = "अभी" if card["leave_now"] else f"{_clock_hi(card['leave_by_time'])} से पहले"
        en.append(f"Leave {when_en} for {r['shelter']['name']}, {r['distance_km']} km away (about {r['walk_min']} minutes on foot).")
        hi.append(f"{when_hi} {r['shelter']['name']} ({r['distance_km']} किमी, लगभग {r['walk_min']} मिनट पैदल) के लिए निकल जाएँ।")

    en.append("Take the elderly and children first.")
    hi.append("बुज़ुर्गों और बच्चों को पहले ले जाएँ।")
    return {"source": "template", "en": " ".join(en), "hi": " ".join(hi)}
