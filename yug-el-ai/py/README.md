# DrainSight — smart data layer (Python)

These scripts generate `../js/data_generated.js`, which the web app loads before
`js/data.js`. They do two things:

1. **Declutter the drainage map** — `drainage_network.py` grows a full dendritic
   storm-water network for Bengaluru's three valleys (~3,400 segments) and keeps
   only the ~360 most important channels (`DRAINS_MAJOR`).
2. **Smart flood risk** — `flood_risk_model.py` trains a logistic-regression
   classifier on physically-motivated synthetic data and exports the weights
   (`FLOOD_MODEL`). The browser uses them to score any neighbourhood live.

## Run

```bash
cd py
pip install -r requirements.txt      # numpy only (optional; a fallback model is used without it)
python build_data.py                 # writes ../js/data_generated.js
```

Then just open `../index.html`. Re-run `build_data.py` any time to regenerate.

## Files
- `drainage_network.py` — network generator + importance-based trimming
- `flood_risk_model.py` — logistic-regression flood-risk model (NumPy)
- `build_data.py` — orchestrates both and writes the JS data file
- `drainage_connections.py` — builds the downstream connection graph → `../data/drainage_connections.{csv,json}`
