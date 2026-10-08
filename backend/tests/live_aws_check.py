"""Manual check against the real AWS services (needs credentials). Run: python tests/live_aws_check.py [out_dir]"""
import io
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from kosi import advisory, cloud, mirror, speech  # noqa: E402
from kosi.hydro import Hydrograph, scenario  # noqa: E402
from kosi.village import card  # noqa: E402

out = Path(sys.argv[1] if len(sys.argv) > 1 else ".")
print("region", cloud.REGION, "bucket", cloud.BUCKET)

v = next(x for x in scenario(6.61)["top_villages"] if (c := card(x["id"], Hydrograph.constant(6.61)))["route"])
c = card(v["id"], Hydrograph.constant(6.61))
print("\nTranslate:", c["route"]["shelter"]["name"], "->", advisory.hindi_name(c["route"]["shelter"]["name"]))

a = advisory.generate(c)
print("Advisory source:", a["source"])
print("  hi:", a["hi"])
print("  en:", a["en"])

for lang in ("hi", "en"):
    audio = speech.synthesize(a[lang], lang)
    print(f"Polly {lang}:", "FAILED" if audio is None else f"{len(audio)} bytes")
    if audio:
        (out / f"advisory_{lang}.mp3").write_bytes(audio)

buf = io.BytesIO()
Image.new("RGB", (640, 480), (190, 170, 130)).save(buf, "JPEG")
img = mirror.load_photo(buf.getvalue())
print("Rekognition reference on blank image:", mirror.detect_reference(img), "(None expected)")
jpeg, info = mirror.render(buf.getvalue(), 1.0, "live check", 0.9, 0.4)
print("Mirror render engine:", info["render"])
