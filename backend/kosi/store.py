"""Loads the precomputed model artifacts once per process (one Lambda container = one load)."""
import json
from functools import lru_cache
from pathlib import Path

import numpy as np
from scipy.spatial import cKDTree

from .config import DATA_DIR


def _json(name):
    return json.loads((DATA_DIR / name).read_text(encoding="utf-8"))


@lru_cache
def stage_stats():
    return _json("stage_stats.json")


@lru_cache
def grid():
    return _json("grid.json")


@lru_cache
def villages():
    return {v["id"]: v for v in _json("villages.json")}


@lru_cache
def shelters():
    return _json("shelters.json")


@lru_cache
def replay(name):
    path = Path(__file__).parent / "replays" / f"{name}.json"
    return json.loads(path.read_text(encoding="utf-8"))


@lru_cache
def roads():
    z = np.load(DATA_DIR / "roads.npz")
    lonlat = z["lonlat"]
    # Scale longitude so Euclidean distance on (x, y) is roughly isotropic at 26°N.
    tree = cKDTree(np.c_[lonlat[:, 0] * 0.9, lonlat[:, 1]])
    # Undirected adjacency in CSR form: neighbours of node u are nbr[indptr[u]:indptr[u+1]], via edge eid[...].
    edges = z["edges"]
    ends = np.r_[edges[:, 0], edges[:, 1]]
    order = np.argsort(ends, kind="stable")
    nbr = np.r_[edges[:, 1], edges[:, 0]][order]
    eid = np.r_[np.arange(len(edges)), np.arange(len(edges))][order]
    indptr = np.r_[0, np.cumsum(np.bincount(ends, minlength=len(lonlat)))]
    return {"lonlat": lonlat, "length_km": z["length_km"], "cut_stage_m": z["cut_stage_m"],
            "chainage_km": z["chainage_km"], "dist_river_km": z["dist_river_km"], "tree": tree,
            "indptr": indptr.tolist(), "nbr": nbr.tolist(), "eid": eid.tolist()}
