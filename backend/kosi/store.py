"""Loads the precomputed model artifacts once per process (one Lambda container = one load)."""
import json
from functools import lru_cache
from pathlib import Path

import numpy as np
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components
from scipy.spatial import cKDTree

from .config import DATA_DIR

MAIN_NETWORK_MIN_NODES = 1000


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
    # Main network = large connected pieces. OSM village lanes are patchy in Bihar, so small road
    # fragments are often not linked to anything; routes start and end on the main network instead.
    n = len(lonlat)
    graph = coo_matrix((np.ones(len(edges)), (edges[:, 0], edges[:, 1])), shape=(n, n))
    _, comp = connected_components(graph, directed=False)
    main_nodes = np.flatnonzero(np.bincount(comp)[comp] >= MAIN_NETWORK_MIN_NODES)
    main_tree = cKDTree(np.c_[lonlat[main_nodes, 0] * 0.9, lonlat[main_nodes, 1]])
    return {"lonlat": lonlat, "length_km": z["length_km"], "cut_stage_m": z["cut_stage_m"],
            "chainage_km": z["chainage_km"], "dist_river_km": z["dist_river_km"], "tree": tree,
            "edge_a": edges[:, 0], "edge_b": edges[:, 1], "main_nodes": main_nodes, "main_tree": main_tree,
            "indptr": indptr.tolist(), "nbr": nbr.tolist(), "eid": eid.tolist()}
