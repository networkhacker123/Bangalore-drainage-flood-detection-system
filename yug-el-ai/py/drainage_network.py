"""
drainage_network.py
-------------------
Builds a dendritic (tree-like) storm-water drainage network for Bengaluru's
three valleys, then trims it down to the ~300-400 MAJOR channels so the live
map stays readable. This is the "declutter" half of the smart layer.

The generator mirrors real hydrology: thick rajakaluves (high Strahler order)
near the valley outlets, fed upstream by progressively finer drains. Each
segment gets an importance score (order, length, how far downstream it sits)
and only the top-ranked segments survive.
"""
from __future__ import annotations
import math

# Bengaluru catchment centre (lat, lng)
NET_CENTER = (12.9716, 77.5946)

# Valley outlets -> [outletLat, outletLng, angleTowardCity(rad), startLen, order, valley]
TRUNKS = [
    (13.105, 77.605, -1.45, 0.050, 7, "HV"),
    (13.085, 77.585, -1.60, 0.044, 6, "HV"),
    (12.880, 77.790,  2.55, 0.052, 7, "KC"),
    (12.905, 77.760,  2.70, 0.046, 7, "KC"),
    (12.930, 77.730,  2.90, 0.040, 6, "KC"),
    (12.840, 77.470,  0.75, 0.050, 7, "VV"),
    (12.870, 77.500,  0.95, 0.044, 6, "VV"),
    (12.820, 77.560,  1.30, 0.040, 6, "VV"),
]


def mulberry32(seed: int):
    """Deterministic PRNG (matches the JS mulberry32) for reproducible networks."""
    state = seed & 0xFFFFFFFF

    def rnd():
        nonlocal state
        state = (state + 0x6D2B79F5) & 0xFFFFFFFF
        t = state
        t = (t ^ (t >> 15)) * (t | 1) & 0xFFFFFFFF
        t ^= (t + ((t ^ (t >> 7)) * (t | 61) & 0xFFFFFFFF)) & 0xFFFFFFFF
        t &= 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296.0

    return rnd


def _in_city(p) -> bool:
    dx = (p[1] - NET_CENTER[1]) / 0.27
    dy = (p[0] - NET_CENTER[0]) / 0.23
    return dx * dx + dy * dy < 1.0


def _seg_len_km(a, b) -> float:
    # rough planar distance in km at Bengaluru's latitude
    dlat = (b[0] - a[0]) * 111.0
    dlng = (b[1] - a[1]) * 111.0 * math.cos(math.radians(NET_CENTER[0]))
    return math.hypot(dlat, dlng)


def build_full_network(seed: int = 7):
    rng = mulberry32(seed)
    segs = []
    counter = {"n": 0}

    def grow(p, ang, length, order, vk, depth):
        if order <= 0 or counter["n"] > 4200:
            return
        np_ = (p[0] + math.sin(ang) * length, p[1] + math.cos(ang) * length)
        kind = "primary" if order >= 5 else ("secondary" if order >= 2 else "tertiary")
        segs.append({
            "pts": [[round(p[0], 5), round(p[1], 5)], [round(np_[0], 5), round(np_[1], 5)]],
            "order": order, "valley": vk, "kind": kind,
            "len_km": round(_seg_len_km(p, np_), 4), "depth": depth,
        })
        counter["n"] += 1
        if not _in_city(np_) and order < 5:
            return
        grow(np_, ang + (rng() - 0.5) * 0.45, length * 0.84, order - 1, vk, depth + 1)
        nb = 2 if order >= 5 else (2 if (order >= 3 and rng() < 0.85) else (1 if rng() < 0.45 else 0))
        for i in range(nb):
            side = 1 if i % 2 == 0 else -1
            grow(np_, ang + (0.45 + rng() * 0.55) * side, length * (0.58 + rng() * 0.22),
                 order - 1, vk, depth + 1)

    for t in TRUNKS:
        grow((t[0], t[1]), t[2], t[3], t[4], t[5], 0)
    return segs


def _importance(seg) -> float:
    # higher Strahler order dominates; longer & more-downstream segments rank up
    return seg["order"] * 100.0 + seg["len_km"] * 12.0 - seg["depth"] * 1.5


def build_major_drains(target: int = 360, seed: int = 7):
    """Return ~`target` highest-importance drain segments (the declutter step)."""
    full = build_full_network(seed)
    # always keep the primary rajakaluves (order >= 5)
    primary = [s for s in full if s["order"] >= 5]
    rest = [s for s in full if s["order"] < 5]
    rest.sort(key=_importance, reverse=True)
    keep = primary + rest[: max(0, target - len(primary))]
    keep.sort(key=_importance, reverse=True)
    # strip helper fields the front-end doesn't need
    out = [{"pts": s["pts"], "order": s["order"], "valley": s["valley"], "kind": s["kind"]}
           for s in keep[:target]]
    return out, len(full)


if __name__ == "__main__":
    majors, total = build_major_drains()
    print(f"full network: {total} segments -> kept {len(majors)} major drains")
    by_order = {}
    for s in majors:
        by_order[s["order"]] = by_order.get(s["order"], 0) + 1
    print("by Strahler order:", dict(sorted(by_order.items(), reverse=True)))
