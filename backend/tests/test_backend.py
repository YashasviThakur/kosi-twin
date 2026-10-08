"""Behavioural tests against the real precomputed model (run `python prep/build_model.py` first)."""
import io
import math

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from kosi import mirror, store
from kosi.api import app
from kosi.hydro import Hydrograph, rise_for
from kosi.village import card

client = TestClient(app)


def flooding_villages(q):
    return client.get(f"/api/scenario?discharge={q}").json()["top_villages"]


def test_rating_curve_rises_with_discharge():
    assert rise_for(1.0) == 0.0
    rises = [rise_for(q) for q in (2, 3, 4, 5, 6.61, 8)]
    assert rises == sorted(rises) and rises[0] > 0
    assert 4.0 < rise_for(6.61) < 6.0          # Sept 2024 peak calibrated to ~5 m


def test_more_water_never_floods_less():
    prev = None
    for q in (1.5, 2.5, 4, 6.61, 9):
        stats = client.get(f"/api/scenario?discharge={q}").json()["stats"]
        if prev:
            for key in ("area_km2", "people", "villages", "road_km_cut"):
                assert stats[key] >= prev[key], key
        prev = stats


def test_village_cards_are_internally_consistent():
    for v in flooding_villages(6.61)[:8]:
        c = card(v["id"], Hydrograph.constant(6.61))
        assert c["risk"] in ("WATCH", "EVACUATE")
        assert c["eta_h"] >= 0 and not math.isinf(c["eta_h"])
        if c["needs_boat"]:
            assert c["route"] is None and c["leave_by_h"] is None
        else:
            assert c["leave_by_h"] < c["eta_h"]            # must leave before the water arrives
            assert c["route"]["path"][0] == [c["lon"], c["lat"]]


def test_route_crosses_every_road_before_it_floods():
    from kosi.routing import safe_route
    hg = Hydrograph.constant(6.61)
    for v in flooding_villages(6.61)[:8]:
        route = safe_route(v["lon"], v["lat"], hg)
        if route:
            assert route["slack_h"] > 0


def test_villages_off_the_kosi_are_safe():
    off = next(v for v in store.villages().values() if v["chainage_km"] is None)
    assert client.get(f"/api/villages/{off['id']}?discharge=8").json()["risk"] == "SAFE"


def test_replay_runs_and_peaks_near_2024_level():
    frames = client.get("/api/replay/2024").json()["frames"]
    assert max(f["discharge_lakh"] for f in frames) == pytest.approx(6.61)


def test_advisory_in_all_four_languages_with_identical_numbers():
    import re
    for v in flooding_villages(6.61)[:6]:
        a = client.get(f"/api/villages/{v['id']}/advisory?discharge=6.61").json()
        nums = {l: sorted(re.findall(r"\d+(?:\.\d+)?", a[l])) for l in ("en", "hi", "bho", "mai")}
        assert nums["hi"] == nums["bho"] == nums["mai"] == nums["en"], nums
        for l in ("hi", "bho", "mai"):
            assert any("ऀ" <= ch <= "ॿ" for ch in a[l])
        assert len({a["hi"], a["bho"], a["mai"]}) == 3          # genuinely different wording


def test_unknown_ids_404():
    assert client.get("/api/villages/1").status_code == 404
    assert client.get("/api/replay/1999").status_code == 404


def test_waterline_geometry():
    # 2.1 m door spanning rows 260..470 -> 100 px per metre; 1.2 m of water sits at row 350.
    assert mirror.waterline_y(470, 260, 2.1, 1.2) == 350
    with pytest.raises(ValueError):
        mirror.waterline_y(260, 470, 2.1, 1.2)


def test_mirror_endpoint_returns_watermarked_jpeg():
    buf = io.BytesIO()
    Image.new("RGB", (400, 300), (180, 160, 120)).save(buf, "JPEG")
    # Door from row 40 to row 250 of 300 (2.1 m) -> 1.0 m of water at row 150.
    r = client.post("/api/mirror", files={"photo": ("s.jpg", buf.getvalue(), "image/jpeg")},
                    data={"depth_m": 1.0, "ground_frac": 250 / 300, "top_frac": 40 / 300, "ref_height_m": 2.1})
    assert r.status_code == 200 and r.headers["content-type"] == "image/jpeg"
    assert r.headers["x-waterline-y"] == "150" and r.headers["x-render"] == "fallback"
    assert Image.open(io.BytesIO(r.content)).size == (400, 300)


def test_mirror_without_reference_asks_for_taps():
    buf = io.BytesIO()
    Image.new("RGB", (400, 300)).save(buf, "JPEG")
    r = client.post("/api/mirror", files={"photo": ("s.jpg", buf.getvalue(), "image/jpeg")}, data={"depth_m": 1.0})
    assert r.status_code == 422


def test_advisory_guardrail_rejects_changed_numbers(monkeypatch):
    from kosi import advisory, cloud

    class FakeBedrock:
        def __init__(self, reply):
            self.reply = reply

        def converse(self, **_):
            return {"output": {"message": {"content": [{"text": self.reply}]}}}

    draft = {"en": "Leave before 3 PM, 2.5 km away.", "hi": "दोपहर 3 बजे से पहले निकलें, 2.5 किमी।"}
    monkeypatch.setattr(cloud, "ENABLED", True)
    monkeypatch.setattr(cloud, "TEXT_MODELS", ["fake"])
    monkeypatch.setattr(cloud, "client", lambda _: FakeBedrock('{"en": "Leave by 4 PM, 2.5 km.", "hi": "4 बजे, 2.5 किमी"}'))
    assert advisory._rewrite(draft) is None                       # time changed -> rejected
    assert not cloud.available("bedrock-text")                    # ...and the breaker opened
    cloud._down_until.clear()
    monkeypatch.setattr(cloud, "client", lambda _: FakeBedrock('{"en": "Please leave before 3 PM; it is 2.5 km.", "hi": "3 बजे से पहले निकल जाएँ, 2.5 किमी।"}'))
    assert advisory._rewrite(draft)["source"] == "bedrock:fake"


def test_village_on_isolated_road_fragment_still_gets_a_route():
    # Regression: Sahugarh's nearest OSM road is an unconnected fragment; it used to come out as
    # "boat rescue needed" although dry ground is under a kilometre away and water is ~2 days off.
    v = next(x for x in store.villages().values() if x["name"] == "Sahugarh")
    c = card(v["id"], Hydrograph.constant(4.0))
    assert not c["needs_boat"] and c["route"]["distance_km"] < 5


def test_boat_rescue_is_rare_when_water_is_days_away():
    hg = Hydrograph.constant(4.0)
    cards = [card(a["id"], hg) for a in client.get("/api/scenario?discharge=4").json()["affected"]]
    late = [c for c in cards if c["eta_h"] > 24]
    assert late and sum(c["needs_boat"] for c in late) <= len(late) // 10
