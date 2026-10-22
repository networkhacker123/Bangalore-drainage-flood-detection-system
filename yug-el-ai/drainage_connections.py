"""
drainage_connections.py
-----------------------
Builds the DRAINAGE CONNECTION GRAPH for the optimized-setup step: which major
drain flows into which (downstream topology), so the optimizer / planners can
trace how an intervention on one channel relieves everything downstream.

Each segment's downstream end is linked to the nearest equal-or-higher Strahler
order channel within reach; segments with no downstream link are valley outlets.

Writes:  ../data/drainage_connections.csv  and  ../data/drainage_connections.json
"""
from __future__ import annotations
import os, json, math, csv
from drainage_network import build_major_drains

HERE = os.path.dirname(os.path.abspath(__file__))
OUTDIR = os.path.normpath(os.path.join(HERE, "..", "data"))
LAT_KM = 111.0
LNG_KM = 111.0 * math.cos(math.radians(12.97))


def km(a, b):
    return math.hypot((a[0]-b[0])*LAT_KM, (a[1]-b[1])*LNG_KM)


def build_connections(reach_km=1.6):
    drains, total = build_major_drains()
    nodes = []
    for i, s in enumerate(drains):
        ds, us = s["pts"][0], s["pts"][1]      # pts[0] = downstream end
        nodes.append({"id": i, "order": s["order"], "valley": s["valley"],
                      "kind": s["kind"], "ds": ds, "us": us})
    edges = []
    for n in nodes:
        best, bestd = None, 1e9
        for m in nodes:
            if m["id"] == n["id"] or m["order"] < n["order"]:
                continue
            d = min(km(n["ds"], m["ds"]), km(n["ds"], m["us"]))
            if d < bestd:
                bestd, best = d, m
        downstream = best["id"] if (best and bestd <= reach_km) else None
        edges.append({
            "id": n["id"], "order": n["order"], "valley": n["valley"], "kind": n["kind"],
            "from_lat": n["us"][0], "from_lng": n["us"][1],
            "to_lat": n["ds"][0], "to_lng": n["ds"][1],
            "downstream_id": downstream,
            "link_km": round(bestd, 3) if downstream is not None else None,
            "is_outlet": downstream is None,
        })
    return edges, total


def main():
    edges, total = build_connections()
    os.makedirs(OUTDIR, exist_ok=True)
    cols = ["id","order","valley","kind","from_lat","from_lng","to_lat","to_lng",
            "downstream_id","link_km","is_outlet"]
    with open(os.path.join(OUTDIR, "drainage_connections.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=cols); w.writeheader()
        for e in edges: w.writerow(e)
    meta = {"segments": len(edges), "outlets": sum(e["is_outlet"] for e in edges),
            "from_full_network": total}
    with open(os.path.join(OUTDIR, "drainage_connections.json"), "w", encoding="utf-8") as f:
        json.dump({"meta": meta, "connections": edges}, f, indent=1)
    print(f"wrote {len(edges)} connections ({meta['outlets']} outlets) to ../data/")


if __name__ == "__main__":
    main()
