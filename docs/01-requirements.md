# Requirements - Bar Chart Race (Beijing Air Quality)

## 1. Project Objective
Create a "Bar Chart Race" visualization showing the annual average concentration of four pollutants (PM2.5, PM10, SO2, NO2) in Beijing from 2013 to 2026.

## 2. Key Features
### 2.1 Static Bar Chart (40 pts)
- [ ] Read and process data from `beijing-air-quality.csv`.
- [ ] Render a horizontal bar chart for a given year (e.g., 2013).
- [ ] Sort pollutants by concentration (high to low, top to bottom).
- [ ] Distinct, colorblind-friendly colors (bound to pollutant, not rank).
- [ ] Labels (name and value) on/next to bars.
- [ ] Axes: X-axis (concentration with μg/m³ unit), Y-axis (rank or name).
- [ ] Title (centered) and prominent Year Indicator (e.g., bottom-right).

### 2.2 Annual Transition Animation (40 pts)
- [ ] Smooth interpolation between years (1-2s per year).
- [ ] Bars move smoothly when ranks change (no jumping).
- [ ] Real dynamic animation (D3 transition or `requestAnimationFrame`).
- [ ] X-axis max value handles transitions (fixed or adaptive).
- [ ] Year indicator updates continuously.

### 2.3 Interaction and Control (20 pts)
- [ ] Play/Pause button.
- [ ] Timeline scrubber (optional but recommended).
- [ ] Handle end of animation (stop/loop/replay).
- [ ] Tooltip on hover: show pollutant name, year, and specific value.

## 3. Technical Constraints
- [ ] Technologies: HTML, Vanilla CSS, JavaScript (D3.js recommended).
- [ ] Prohibited: `matplotlib`, `seaborn`, static image splicing (GIFs/Videos).
- [ ] Data source: `beijing-air-quality.csv`.

## 4. Current Issues & Observations
- **Data Gap**: 2013 data in CSV is incomplete (only 1 day, missing PM2.5).
- **Unit Mismatch**: CSV data is US-AQI, but UI requires μg/m³.
- **Hardcoding**: Current implementation uses a hardcoded `RAW` array.
