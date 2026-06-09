# Data Selection & Processing Strategy

**Date**: 2026-05-04

## Observations
1. **Data Completeness**:
   - 2013 has only 1 record (Dec 31).
   - 2014-2025 are mostly complete (~365 records/year).
   - Missing PM2.5 for 2013.
2. **Data Units**:
   - CSV contains US-AQI values.
   - Requirement specifies μg/m³.
3. **Current Implementation**:
   - Beijing annual values are calculated in `scripts/data-processor.js`.
   - Comparison series are curated in the visualization code and documented in the page notes.

## Recommended Strategy
1. **Dynamic Loading**: Use `d3.csv` to load `data/processed/beijing-air-quality.csv` at runtime.
2. **Aggregation**: Calculate annual means programmatically in JavaScript.
3. **Data Imputation (2013)**:
   - Since 2013 is the starting point and nearly empty, a hardcoded "seed" for 2013 is acceptable but should be clearly separated from the dynamic aggregation of later years.
   - Alternatively, search for historical 2013 annual means to use as the seed.
4. **Unit Conversion**: 
   - To strictly follow the "μg/m³" requirement, apply the US-AQI to Concentration formula. 
   - *However*, if the assignment implicitly allows using the provided AQI values as "concentrations" (due to complexity of piecewise linear conversion), we should document this choice. Given the strictness of the grading, conversion is safer.

## Verification Strategy
1. **Verification**: Compare the dynamically calculated means against the provided `RAW` data to ensure correctness.
2. **Edge Cases**: 
   - Verify behavior for leap years (2016, 2020, 2024).
   - Verify behavior for years with slight data gaps (e.g., 2017 has 362 records).
    - Ensure the animation does not break if a year is missing in the CSV.
