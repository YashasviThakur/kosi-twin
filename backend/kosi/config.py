"""Runtime settings. Hydrology constants are first-pass estimates — calibrate against CWC gauge data."""
import os
from pathlib import Path

DATA_DIR = Path(os.environ.get("KOSI_DATA_DIR", Path(__file__).resolve().parent.parent / "data" / "out"))
LAYER_BASE_URL = os.environ.get("KOSI_LAYER_BASE_URL", "/layers")   # S3/CloudFront URL in production

# Rating curve: river depth ~ discharge^0.6 (wide-channel Manning). Rise above normal monsoon level:
#   rise = D0 * ((Q / Q0) ** 0.6 - 1)
# Q0 = 1 lakh cusecs treated as "normal"; D0 chosen so the Sept 2024 peak (~6.6 lakh) gives ~5 m.
# TODO: fit Q0/D0 to CWC Basua/Baltara stage-discharge readings.
Q0_LAKH = 1.0
D0_M = 2.4
EXPONENT = 0.6

FLOOD_WAVE_KMH = 5.0       # speed of the flood peak down the Kosi (~1.4 m/s), from Birpur
OVERLAND_KMH = 1.0         # how fast water spreads from the channel across fields
WALK_KMH = 4.0             # evacuation walking speed
SAFETY_MARGIN_H = 1.0      # leave this long before water is expected
SHELTER_DRY_MARGIN_M = 0.5 # a shelter must stay this far above the peak water level
ROUTE_MAX_KM = 25.0
