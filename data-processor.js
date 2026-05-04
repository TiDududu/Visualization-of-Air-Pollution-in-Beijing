// Breakpoints for US-AQI to Concentration (μg/m³ or ppb)
// Based on EPA standards (simplified for annual/daily conversion)
const AQI_BREAKPOINTS = {
  pm25: [ // µg/m³
    { aqi: [0, 50], conc: [0.0, 12.0] },
    { aqi: [51, 100], conc: [12.1, 35.4] },
    { aqi: [101, 150], conc: [35.5, 55.4] },
    { aqi: [151, 200], conc: [55.5, 150.4] },
    { aqi: [201, 300], conc: [150.5, 250.4] },
    { aqi: [301, 400], conc: [250.5, 350.4] },
    { aqi: [401, 500], conc: [350.5, 500.4] }
  ],
  pm10: [ // µg/m³
    { aqi: [0, 50], conc: [0, 54] },
    { aqi: [51, 100], conc: [55, 154] },
    { aqi: [101, 150], conc: [155, 254] },
    { aqi: [151, 200], conc: [255, 354] },
    { aqi: [201, 300], conc: [355, 424] },
    { aqi: [301, 400], conc: [425, 504] },
    { aqi: [401, 500], conc: [505, 604] }
  ],
  no2: [ // ppb, will be converted to µg/m³ (1 ppb ≈ 1.88 µg/m³)
    { aqi: [0, 50], conc: [0, 53] },
    { aqi: [51, 100], conc: [54, 100] },
    { aqi: [101, 150], conc: [101, 360] },
    { aqi: [151, 200], conc: [361, 649] },
    { aqi: [201, 300], conc: [650, 1249] },
    { aqi: [301, 400], conc: [1250, 1649] },
    { aqi: [401, 500], conc: [1650, 2049] }
  ],
  so2: [ // ppb, will be converted to µg/m³ (1 ppb ≈ 2.62 µg/m³)
    { aqi: [0, 50], conc: [0, 35] },
    { aqi: [51, 100], conc: [36, 75] },
    { aqi: [101, 150], conc: [76, 185] },
    { aqi: [151, 200], conc: [186, 304] },
    { aqi: [201, 300], conc: [305, 604] },
    { aqi: [301, 400], conc: [605, 804] },
    { aqi: [401, 500], conc: [805, 1004] }
  ]
};

function aqiToConcentration(aqi, pollutant) {
  if (isNaN(aqi) || aqi < 0) return 0;
  const bp = AQI_BREAKPOINTS[pollutant];
  if (!bp) return aqi; // fallback if no breakpoint defined

  for (let i = 0; i < bp.length; i++) {
    const { aqi: aqiRange, conc: concRange } = bp[i];
    if (aqi <= aqiRange[1] || i === bp.length - 1) {
      // Linear interpolation
      const fraction = (aqi - aqiRange[0]) / (aqiRange[1] - aqiRange[0]);
      let conc = concRange[0] + fraction * (concRange[1] - concRange[0]);
      
      // Convert ppb to µg/m³ for NO2 and SO2
      // Using standard conversion factors at 25°C, 1 atm
      if (pollutant === 'no2') conc *= 1.88;
      if (pollutant === 'so2') conc *= 2.62;
      
      return Math.max(0, conc);
    }
  }
  return aqi;
}

async function loadAndProcessData(csvPath) {
  const rawData = await d3.csv(csvPath, d => {
    let cleanRow = {};
    for (let key in d) {
      cleanRow[key.trim()] = d[key] ? d[key].trim() : '';
    }
    return cleanRow;
  });
  
  // Filter for valid years (2013-2026)
  const validData = rawData.filter(d => {
    if (!d.date) return false;
    const year = parseInt(d.date.split('/')[0], 10);
    return year >= 2013 && year <= 2026;
  });

  // Rollup by year and calculate means for AQI, then convert to Concentration
  const rollups = d3.rollups(validData,
    v => {
      const avgConc = (pollutant) => {
        // Filter out empty or non-numeric values
        const validValues = v.map(d => parseFloat(d[pollutant])).filter(n => !isNaN(n));
        if (validValues.length === 0) return 0;
        
        // Convert daily AQI to Concentration, then average
        const dailyConcs = validValues.map(aqi => aqiToConcentration(aqi, pollutant));
        return d3.mean(dailyConcs);
      };
      
      return {
        pm25: avgConc('pm25'),
        pm10: avgConc('pm10'),
        so2: avgConc('so2'),
        no2: avgConc('no2')
      };
    },
    d => parseInt(d.date.split('/')[0], 10)
  );

  let processed = rollups.map(([year, means]) => ({
    year,
    pm25: means.pm25,
    pm10: means.pm10,
    so2: means.so2,
    no2: means.no2
  })).sort((a, b) => a.year - b.year);

  // Impute 2013 if missing or incomplete (since 2013 only has 1 record)
  // Seed data based on historical Beijing 2013 annual mean values in µg/m³
  const seed2013 = { year: 2013, pm25: 89.5, pm10: 108.0, so2: 26.5, no2: 56.0 };
  
  const has2013 = processed.find(d => d.year === 2013);
  if (!has2013) {
    processed.unshift(seed2013);
  } else {
    // Override 2013 with seed because 1 day of data is not representative
    has2013.pm25 = seed2013.pm25;
    has2013.pm10 = seed2013.pm10;
    has2013.so2 = seed2013.so2;
    has2013.no2 = seed2013.no2;
  }

  return processed;
}

window.loadAndProcessData = loadAndProcessData;
