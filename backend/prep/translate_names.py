"""Fill in Devanagari names for villages OSM only has in English, using Amazon Translate (run once
after build_model.py). Marked with name_hi_source so reviewers know which names are machine-made."""
import json

import boto3

from config import OUT

path = OUT / "villages.json"
villages = json.loads(path.read_text(encoding="utf-8"))
translate = boto3.client("translate", region_name="us-east-1")
done = 0
for v in villages:
    if v.get("name_hi"):
        v.setdefault("name_hi_source", "osm")
        continue
    v["name_hi"] = translate.translate_text(Text=v["name"], SourceLanguageCode="en", TargetLanguageCode="hi")["TranslatedText"]
    v["name_hi_source"] = "amazon-translate"
    done += 1
path.write_text(json.dumps(villages, ensure_ascii=False), encoding="utf-8")
print(f"translated {done} names, {len(villages) - done} already had Hindi names from OSM")
