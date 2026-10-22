"""
flood_risk_model.py
-------------------
The "smart" half: a small logistic-regression flood-risk classifier trained on
synthetic-but-physically-motivated samples. Features are the same knobs the UI
exposes (rain intensity, drain blockage, elevation, impervious cover, lake
load, recharge) so the trained weights can be shipped to the browser and used
to score any neighbourhood in real time.

Pure NumPy (no scikit-learn needed). Falls back to a fixed heuristic if NumPy
is missing, so build_data.py always produces a usable model.
"""
from __future__ import annotations
import math

FEATURES = ["intensity", "blockage", "elevation", "impervious", "lake_load", "recharge"]


def _synthetic_dataset(n=6000, seed=11):
    import numpy as np
    rng = np.random.default_rng(seed)
    intensity  = rng.uniform(0, 45, n)     # mm/hr
    blockage   = rng.uniform(0, 95, n)     # %
    elevation  = rng.uniform(0, 1, n)      # 0 low .. 1 high ground
    impervious = rng.uniform(0.3, 0.95, n) # fraction sealed
    lake_load  = rng.uniform(0, 100, n)    # % full upstream lakes
    recharge   = rng.uniform(0, 100, n)    # % infiltration capacity
    X = np.column_stack([intensity, blockage, elevation, impervious, lake_load, recharge])
    # latent physical flood pressure -> probability -> noisy label
    pressure = (0.085 * intensity
                + 0.020 * blockage
                - 1.70 * elevation
                + 1.40 * impervious
                + 0.012 * lake_load
                - 0.013 * recharge
                - 2.1)
    p = 1 / (1 + np.exp(-pressure))
    y = (rng.uniform(0, 1, n) < p).astype(float)
    return X, y


def train_model(seed=11):
    """Fit logistic regression on standardised features; return a JS-ready dict."""
    try:
        import numpy as np
    except Exception:
        return _fallback_model()

    X, y = _synthetic_dataset(seed=seed)
    mean = X.mean(axis=0)
    std = X.std(axis=0) + 1e-9
    Xs = (X - mean) / std

    n, d = Xs.shape
    w = np.zeros(d)
    b = 0.0
    lr = 0.5
    for _ in range(4000):
        z = Xs @ w + b
        p = 1 / (1 + np.exp(-z))
        g = p - y
        w -= lr * (Xs.T @ g / n + 1e-3 * w)
        b -= lr * g.mean()

    # training accuracy for a quick sanity check
    pred = (1 / (1 + np.exp(-(Xs @ w + b)))) > 0.5
    acc = float((pred == (y > 0.5)).mean())

    return {
        "features": FEATURES,
        "weights": [round(float(v), 5) for v in w],
        "bias": round(float(b), 5),
        "mean": [round(float(v), 5) for v in mean],
        "std": [round(float(v), 5) for v in std],
        "accuracy": round(acc, 4),
        "kind": "logistic_regression",
    }


def _fallback_model():
    return {
        "features": FEATURES,
        "weights": [0.95, 0.42, -1.05, 0.78, 0.30, -0.34],
        "bias": -0.2,
        "mean": [22.5, 47.5, 0.5, 0.62, 50.0, 50.0],
        "std": [13.0, 27.4, 0.29, 0.19, 28.9, 28.9],
        "accuracy": None,
        "kind": "heuristic_fallback",
    }


def predict(model, intensity, blockage, elevation, impervious, lake_load, recharge):
    vals = [intensity, blockage, elevation, impervious, lake_load, recharge]
    z = model["bias"]
    for v, m, s, w in zip(vals, model["mean"], model["std"], model["weights"]):
        z += w * (v - m) / s
    return 1 / (1 + math.exp(-z))


if __name__ == "__main__":
    m = train_model()
    print("model:", m["kind"], "| training accuracy:", m["accuracy"])
    for f, w in zip(m["features"], m["weights"]):
        print(f"  {f:11s} weight {w:+.3f}")
    demo = predict(m, intensity=33, blockage=80, elevation=0.2,
                   impervious=0.85, lake_load=88, recharge=25)
    print(f"demo severe-scenario flood probability: {demo:.2%}")
