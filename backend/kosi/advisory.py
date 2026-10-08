"""Plain-language flood advisory for a village card.

1. Fixed templates fill in the facts in English, Hindi, Bhojpuri and Maithili (always available).
2. Amazon Translate turns English place names into Devanagari for the Indian-language texts.
3. Bedrock rewrites the English and Hindi texts to sound natural (Bhojpuri/Maithili stay as
   reviewed templates — no AWS service supports them, and dialect output can't be checked). The rewrite is accepted only if it keeps every
   number from the template; a model that changes a time or distance is worse than a stiff sentence.
"""
import json
import re
from functools import lru_cache

from . import cloud
from .lang import LANGS, T, clock


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
    """The advisory in every language from fixed wording (see lang.py)."""
    names = {"en": card["name"]}
    names.update(dict.fromkeys(("hi", "bho", "mai"), card.get("name_hi") or hindi_name(card["name"])))
    if card["risk"] == "SAFE":
        return {"source": "template", **{l: T["safe"][l].format(name=names[l]) for l in LANGS}}

    depth = card["max_depth_band"]
    route = card["route"]
    if route:
        shelters = {"en": route["shelter"]["name"]}
        shelters.update(dict.fromkeys(("hi", "bho", "mai"), hindi_name(route["shelter"]["name"])))
    out = {"source": "template"}
    for l in LANGS:
        eta = clock(card["eta_time"], l)
        parts = [T["outskirts"][l].format(name=names[l], eta=eta) if depth is None
                 else T["arrives"][l].format(name=names[l], eta=eta, depth=depth[l])]
        if card["needs_boat"]:
            parts.append(T["boat"][l])
        else:
            when = T["now"][l] if card["leave_now"] else T["before"][l].format(clock=clock(card["leave_by_time"], l))
            parts.append(T["leave"][l].format(when=when, shelter=shelters[l], km=route["distance_km"],
                                              minutes=route["walk_min"]))
        parts.append(T["elderly"][l])
        out[l] = " ".join(parts)
    return out


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
            return {**draft, "source": f"bedrock:{model.strip()}", "en": out["en"], "hi": out["hi"]}
    cloud.failed("bedrock-text")
    return None


_rewrites = {}   # successes only, so a Bedrock quota that appears later is picked up without a restart


def generate(card):
    draft = template(card)
    if not cloud.ENABLED:
        return draft
    key = tuple(draft[l] for l in LANGS)
    if key not in _rewrites:
        better = _rewrite(draft)
        if better is None:
            return draft
        _rewrites[key] = better
    return _rewrites[key]
