"""Plain-language flood advisory for a village card.

1. A fixed template fills in the facts (always available).
2. Amazon Translate turns English place names into Hindi for the Hindi text.
3. Bedrock rewrites both texts to sound natural. The rewrite is accepted only if it keeps every
   number from the template; a model that changes a time or distance is worse than a stiff sentence.
"""
import json
import re
from datetime import datetime
from functools import lru_cache

from . import cloud


def _clock_en(iso):
    h = datetime.fromisoformat(iso).hour
    return f"{h % 12 or 12} {'AM' if h < 12 else 'PM'}"


def _clock_hi(iso):
    t = datetime.fromisoformat(iso)
    h = t.hour
    part = "सुबह" if 4 <= h < 12 else "दोपहर" if 12 <= h < 16 else "शाम" if 16 <= h < 19 else "रात"
    return f"{part} {h % 12 or 12} बजे"


@lru_cache(maxsize=4096)
def hindi_name(name):
    """Place/shelter name in Devanagari via Amazon Translate; the original name if unavailable."""
    if not cloud.ENABLED or not name or any("ऀ" <= ch <= "ॿ" for ch in name):
        return name
    try:
        return cloud.client("translate").translate_text(
            Text=name, SourceLanguageCode="en", TargetLanguageCode="hi")["TranslatedText"]
    except Exception:
        return name


def template(card):
    name = card["name"]
    name_hi = card.get("name_hi") or hindi_name(name)
    if card["risk"] == "SAFE":
        return {"source": "template",
                "en": f"{name} is not expected to flood in this scenario. Keep listening for updates.",
                "hi": f"इस स्थिति में {name_hi} में बाढ़ की आशंका नहीं है। सूचना सुनते रहें।"}

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
        shelter, shelter_hi = r["shelter"]["name"], hindi_name(r["shelter"]["name"])
        when_en = "now" if card["leave_now"] else f"before {_clock_en(card['leave_by_time'])}"
        when_hi = "अभी" if card["leave_now"] else f"{_clock_hi(card['leave_by_time'])} से पहले"
        en.append(f"Leave {when_en} for {shelter}, {r['distance_km']} km away (about {r['walk_min']} minutes on foot).")
        hi.append(f"{when_hi} {shelter_hi} ({r['distance_km']} किमी, लगभग {r['walk_min']} मिनट पैदल) के लिए निकल जाएँ।")

    en.append("Take the elderly and children first.")
    hi.append("बुज़ुर्गों और बच्चों को पहले ले जाएँ।")
    return {"source": "template", "en": " ".join(en), "hi": " ".join(hi)}


PROMPT = """You write flood evacuation advisories for villagers in Bihar, India, read aloud on phones.
Rewrite the two drafts below so they sound natural and calm, in simple everyday words
(Hindi: simple spoken Hindi, not formal Sanskritised Hindi; English: plain words).
Rules:
- Keep EVERY number exactly as written (times, km, minutes), using the same digits 0-9.
- Keep place names. Do not add facts, advice, or numbers that are not in the drafts.
- Maximum 3 short sentences each.
Return only JSON: {{"en": "...", "hi": "..."}}

English draft: {en}
Hindi draft: {hi}"""


def _numbers(text):
    return sorted(re.findall(r"\d+(?:\.\d+)?", text))


def _rewrite(draft):
    if not cloud.available("bedrock-text"):
        return None
    for model in cloud.TEXT_MODELS:
        try:
            resp = cloud.client("bedrock-runtime").converse(
                modelId=model.strip(),
                messages=[{"role": "user", "content": [{"text": PROMPT.format(**draft)}]}],
                inferenceConfig={"maxTokens": 600, "temperature": 0.2})
            text = resp["output"]["message"]["content"][0]["text"]
            out = json.loads(text[text.index("{"):text.rindex("}") + 1])
        except Exception:
            continue
        if all(isinstance(out.get(k), str) and _numbers(out[k]) == _numbers(draft[k]) for k in ("en", "hi")):
            return {"source": f"bedrock:{model.strip()}", "en": out["en"], "hi": out["hi"]}
    cloud.failed("bedrock-text")
    return None


_rewrites = {}   # successes only, so a Bedrock quota that appears later is picked up without a restart


def generate(card):
    draft = template(card)
    if not cloud.ENABLED:
        return draft
    key = (draft["en"], draft["hi"])
    if key not in _rewrites:
        better = _rewrite(draft)
        if better is None:
            return draft
        _rewrites[key] = better
    return _rewrites[key]
