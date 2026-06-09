# Visualization of Air Pollution in Beijing

Interactive D3 visualization for Beijing air-pollution trends and policy-effect comparisons. The main page combines a pollutant bar-chart race, domestic reference lines, and a DiD-style counterfactual view.

## Run locally

Serve the repository root through a local HTTP server so the browser can load CSV files:

```powershell
python -m http.server 8000
```

Then open `http://127.0.0.1:8000/`.

## Repository layout

| Path | Purpose |
| --- | --- |
| `index.html` | Local/GitHub Pages entry point; redirects to the main visualization. |
| `bar-chart-race.html` | Main single-page visualization. |
| `scripts/data-processor.js` | Browser-side CSV cleaning, AQI conversion, and annual aggregation. |
| `data/processed/beijing-air-quality.csv` | Consolidated Beijing AQI source used by the main visualization. |
| `data/raw/` | Source datasets kept for auditability of the New Delhi comparison series. |
| `policies/` | Separate policy timeline/word-cloud page and its assets. |
| `docs/` | Requirements and data-model notes. |
| `air_pollution.zip`, `project_time.zip` | Submitted archive artifacts retained for provenance. |

The submitted ZIP archives and the Delhi raw datasets are intentional project artifacts. Do not remove them as generic archive or off-topic data cleanup.
