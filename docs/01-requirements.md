# Requirements

## Objective

Show how Beijing air pollution changed from 2013 to 2025 and explain how much of the PM2.5 decline can plausibly be attributed to policy intervention.

## Main visualization

- [x] Read and process `data/processed/beijing-air-quality.csv` in the browser.
- [x] Convert US-AQI values to pollutant concentrations before annual aggregation.
- [x] Render a bar-chart race for PM2.5, PM10, SO2, and NO2.
- [x] Keep pollutant colors stable across ranking changes.
- [x] Provide play/pause, replay, scrubber, year readout, and hover tooltip.
- [x] Start the race paused so readers choose when to play the animation.

## Comparison views

- [x] Add domestic PM2.5 reference lines for northern coal cities and national averages.
- [x] Add a DiD-style counterfactual view with Beijing, peer cities, and estimated policy effect.
- [x] Document source limitations directly in the page notes, especially estimated peer-city tails.

## Data notes

- The Beijing CSV contains AQI values rather than concentrations.
- 2013 Beijing data is not representative, so the page seeds that year with documented annual means.
- Delhi raw files are kept under `data/raw/` for auditability, while the page uses curated annual values.
