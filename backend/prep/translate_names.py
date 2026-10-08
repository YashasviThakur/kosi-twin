"""Fill in Devanagari names, once, with Amazon Translate (run after build_model.py), so the app never
waits on Translate at runtime:
  - villages OSM only has in English (marked name_hi_source so reviewers know which are machine-made)
  - shelters (schools / hospitals), used in village cards and spoken advisories
"""
import json

import boto3

from config import OUT

translate = boto3.client("translate", region_name="us-east-1")
cache = {}


def to_hindi(text):
    if text not in cache:
        cache[text] = translate.translate_text(Text=text, SourceLanguageCode="en", TargetLanguageCode="hi")["TranslatedText"]
    return cache[text]


path = OUT / "villages.json"
villages = json.loads(path.read_text(encoding="utf-8"))
done = 0
for v in villages:
    if v.get("name_hi"):
        v.setdefault("name_hi_source", "osm")
        continue
    v["name_hi"] = to_hindi(v["name"])
    v["name_hi_source"] = "amazon-translate"
    done += 1
path.write_text(json.dumps(villages, ensure_ascii=False), encoding="utf-8")
sources = {src: sum(v["name_hi_source"] == src for v in villages) for src in ("osm", "amazon-translate")}
print(f"villages: {done} newly translated; Hindi names from OSM: {sources['osm']}, "
      f"from Amazon Translate: {sources['amazon-translate']}")

path = OUT / "shelters.json"
shelters = json.loads(path.read_text(encoding="utf-8"))
for s in shelters:
    s["name_hi"] = to_hindi(s["name"])
path.write_text(json.dumps(shelters, ensure_ascii=False), encoding="utf-8")
print(f"shelters: {len(shelters)} names, {len(cache)} distinct strings translated")
