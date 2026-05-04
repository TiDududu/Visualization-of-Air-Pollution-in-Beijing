# Data Models

## 1. Raw Data (beijing-air-quality.csv)
- Format: CSV
- Columns: `date`, `pm25`, `pm10`, `o3`, `no2`, `so2`, `co` (note: column headers have leading spaces).
- Values: US-AQI index values.

## 2. Processed Annual Data
The `data-processor.js` module reads the CSV and produces an array of objects representing the annual arithmetic mean of the concentrations:

```javascript
[
  {
    year: 2013,
    pm25: 89.5,   // Concentration in µg/m³
    pm10: 108.0,
    so2: 26.5,
    no2: 56.0
  },
  // ... up to 2025
]
```

## 3. Data Flow
1. `d3.csv()` fetches `beijing-air-quality.csv`.
2. Row parser cleans leading spaces from headers and values.
3. Filter removes rows outside the 2013-2025 range.
4. `d3.rollups` groups by year.
5. Within each year, daily AQI values are converted to µg/m³ (using `aqiToConcentration`), then averaged.
6. The 2013 object is seeded with historically accurate concentration values, as the CSV only contains a single day of data for 2013.
