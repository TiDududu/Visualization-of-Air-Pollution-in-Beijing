# Data Models

## Beijing source data

- File: `data/processed/beijing-air-quality.csv`
- Format: CSV
- Columns: `date`, `pm25`, `pm10`, `o3`, `no2`, `so2`, `co`
- Values: US-AQI index values

## Delhi comparison data

- Files: `data/raw/delhi-city_day.csv`, `data/raw/delhi_ncr_aqi_dataset.csv`
- Purpose: audit trail for the New Delhi control series used in the DiD comparison.
- Scope: the visualization uses curated annual values, while the raw files remain in the repository for reproducibility and review.

## Archive artifacts

- Files: `air_pollution.zip`, `project_time.zip`
- Purpose: submitted project archives kept as provenance artifacts.
- Rule: these ZIP files are not generated clutter and should stay versioned unless the submission policy changes.

## Processed annual data

`scripts/data-processor.js` reads the CSV and produces annual concentration means:

```javascript
[
  {
    year: 2013,
    pm25: 89.5,   // Concentration in µg/m³
    pm10: 108.0,
    so2: 26.5,
    no2: 56.0
  },
  // ... through 2025, with 2026 used only as a partial interpolation endpoint
]
```

## Data flow

1. `d3.csv()` fetches `data/processed/beijing-air-quality.csv`.
2. The row parser trims headers and values.
3. Rows outside 2013-2026 are ignored.
4. `d3.rollups` groups records by year.
5. Daily AQI values are converted to concentrations, then averaged.
6. 2013 is overwritten with documented annual means because the CSV has only one record for that year.
