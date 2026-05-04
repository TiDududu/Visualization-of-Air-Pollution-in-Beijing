const metrics = {
  AQI: { unit: "", title: "AQI 区域日均值" },
  "PM2.5": { unit: "ug/m3", title: "PM2.5 区域日均值" },
  PM10: { unit: "ug/m3", title: "PM10 区域日均值" }
};

const stations = [
  ["东四", "东城", 116.417, 39.929],
  ["天坛", "东城", 116.407, 39.886],
  ["官园", "西城", 116.339, 39.929],
  ["万寿西宫", "西城", 116.352, 39.878],
  ["奥体中心", "朝阳", 116.397, 39.982],
  ["农展馆", "朝阳", 116.461, 39.937],
  ["万柳", "海淀", 116.287, 39.987],
  ["北部新区", "海淀", 116.174, 40.09],
  ["植物园", "海淀", 116.207, 40.002],
  ["丰台花园", "丰台", 116.279, 39.863],
  ["云岗", "丰台", 116.146, 39.824],
  ["古城", "石景山", 116.184, 39.914],
  ["房山", "房山", 116.136, 39.742],
  ["大兴", "大兴", 116.404, 39.718],
  ["亦庄", "亦庄", 116.506, 39.795],
  ["通州", "通州", 116.663, 39.886],
  ["顺义", "顺义", 116.655, 40.127],
  ["昌平", "昌平", 116.23, 40.217],
  ["门头沟", "门头沟", 116.106, 39.937],
  ["平谷", "平谷", 117.1, 40.143],
  ["怀柔", "怀柔", 116.628, 40.328],
  ["密云", "密云", 116.832, 40.37],
  ["延庆", "延庆", 115.972, 40.453],
  ["定陵", "昌平", 116.22, 40.292],
  ["八达岭", "延庆", 115.988, 40.365],
  ["密云水库", "密云", 116.911, 40.499],
  ["东高村", "平谷", 117.12, 40.1],
  ["永乐店", "通州", 116.783, 39.712],
  ["榆垡", "大兴", 116.3, 39.52],
  ["琉璃河", "房山", 116.0, 39.58],
  ["前门", "东城", 116.395, 39.899],
  ["永定门内", "东城", 116.394, 39.876],
  ["西直门北", "西城", 116.349, 39.954],
  ["南三环", "丰台", 116.368, 39.856],
  ["东四环", "朝阳", 116.483, 39.939]
].map(([name, district, lon, lat]) => ({ name, district, lon, lat}));



const urbanDistricts = new Set(["东城", "西城", "朝阳", "海淀", "丰台", "石景山"]);
const geojsonPath = "data/北京区域地图/beijing.geojson";
const dailyDataPath = "src/daily-data-201401.json";
const districtLabelPositions = {
  "怀柔": { lon: 116.63, lat: 40.63 },
  "密云": { lon: 117.08, lat: 40.54 },
  "延庆": { lon: 116.16, lat: 40.50 },
  "昌平": { lon: 116.24, lat: 40.27 },
  "平谷": { lon: 117.17, lat: 40.21 },
  "顺义": { lon: 116.80, lat: 40.14 },
  "门头沟": { lon: 115.80, lat: 39.99 },
  "市区": { lon: 116.26, lat: 39.92 },
  "通州": { lon: 116.72, lat: 39.80 },
  "房山": { lon: 115.82, lat: 39.70 },
  "大兴": { lon: 116.40, lat: 39.62 }
};
const aqiLevels = [
  { name: "优", range: "0-50", max: 50, color: "#b3caa9" },
  { name: "良", range: "51-100", max: 100, color: "#d4e1ce" },
  { name: "轻度污染", range: "101-150", max: 150, color: "#f2d3c2" },
  { name: "中度污染", range: "151-200", max: 200, color: "#efb6b1" },
  { name: "重度污染", range: "201-300", max: 300, color: "#9c5f5f" },
  { name: "严重污染", range: ">300", max: Infinity, color: "#382222" }
];
const pollutantBreakpoints = {
  "PM2.5": [
    [0, 35, 0, 50],
    [35, 75, 50, 100],
    [75, 115, 100, 150],
    [115, 150, 150, 200],
    [150, 250, 200, 300],
    [250, 350, 300, 400],
    [350, 500, 400, 500]
  ],
  PM10: [
    [0, 50, 0, 50],
    [50, 150, 50, 100],
    [150, 250, 100, 150],
    [250, 350, 150, 200],
    [350, 420, 200, 300],
    [420, 500, 300, 400],
    [500, 600, 400, 500]
  ]
};

const tooltip = d3.select("#tooltip");
const map = d3.select("#map");
const detailTitle = d3.select("#detail-title");
const detailSummary = d3.select("#detail-summary");
const maxRegion = d3.select("#max-region");
const minRegion = d3.select("#min-region");
const currentDateLabel = d3.select("#current-date");
const dateSlider = d3.select("#date-slider");
const playButton = d3.select("#play-button");
let activeMetric = "AQI";
let currentDateIndex = 0;
let dailyData;
let dates = [];
let playbackTimer;

const width = 850;
const height = 710;
let features;
let projection;
let path;
let districts;

const svg = map.append("svg")
  .attr("viewBox", `0 0 ${width} ${height}`)
  .attr("role", "img")
  .attr("aria-label", "北京空气污染分区地图");

svg.append("rect")
  .attr("width", width)
  .attr("height", height)
  .attr("fill", "#edf6f7");

svg.append("text")
  .attr("class", "map-title")
  .attr("x", 28)
  .attr("y", 38)
  .text("Beijing Air Pollution Map");

svg.append("text")
  .attr("class", "map-subtitle")
  .attr("x", 28)
  .attr("y", 60)
  .text("daily average by monitoring stations");
const mapSubtitle = svg.select(".map-subtitle");

const districtsLayer = svg.append("g");
const stationsLayer = svg.append("g");
const labelsLayer = svg.append("g");

d3.selectAll(".metric-button").on("click", function () {
  activeMetric = this.dataset.metric;
  d3.selectAll(".metric-button").classed("active", false);
  d3.select(this).classed("active", true);
  renderMetric(activeMetric);
});

dateSlider.on("input", function () {
  stopPlayback();
  currentDateIndex = Number(this.value);
  renderMetric(activeMetric);
});

playButton.on("click", () => {
  if (playbackTimer) {
    stopPlayback();
    return;
  }
  playButton.text("暂停");
  playbackTimer = d3.interval(() => {
    currentDateIndex = (currentDateIndex + 1) % dates.length;
    dateSlider.property("value", currentDateIndex);
    renderMetric(activeMetric);
  }, 900);
});

Promise.all([loadGeoJson(), d3.json(dailyDataPath)]).then(([geojson, data]) => {
  dailyData = data;
  dates = Object.keys(dailyData).sort();
  dateSlider.attr("max", dates.length - 1);
  initMap(geojson);
}).catch(error => {
  map.append("div")
    .style("padding", "24px")
    .style("color", "#b12f1f")
    .text(`地图数据加载失败：${error.message}`);
});

async function loadGeoJson() {
  const text = await d3.text(geojsonPath);
  return JSON.parse(text.replace(/^\uFEFF/, ""));
}

function initMap(geojson) {
  features = normalizeFeatures(geojson);
  projection = d3.geoMercator().fitExtent([[42, 84], [width - 42, height - 40]], features);
  path = d3.geoPath(projection);

  districts = districtsLayer.selectAll("path")
    .data(features.features)
    .join("path")
    .attr("class", "district")
    .attr("d", path)
    .on("mousemove", (event, d) => showDistrictTooltip(event, d))
    .on("mouseleave", hideTooltip);

  labelsLayer.selectAll("text")
    .data(features.features)
    .join("text")
    .attr("class", "district-label")
    .attr("transform", d => `translate(${getDistrictLabelPoint(d)})`)
    .text(d => d.properties.name);

  const stationGroups = stationsLayer.selectAll("g")
    .data(stations)
    .join("g")
    .attr("transform", d => `translate(${projection([d.lon, d.lat])})`)
    .on("mousemove", (event, d) => showStationTooltip(event, d))
    .on("mouseleave", hideTooltip);

  stationGroups.append("circle")
    .attr("class", "station")
    .attr("r", 3.3);

  stationGroups.append("text")
    .attr("class", "station-label")
    .attr("dy", -8)
    .text(d => d.name);

  renderMetric(activeMetric);
}

function normalizeFeatures(geojson) {
  return {
    ...geojson,
    features: geojson.features.map(feature => {
      const name = normalizeRegionName(feature.properties.NAME || feature.properties.name);
      return {
        ...feature,
        properties: {
          ...feature.properties,
          name,
          stationCount: getRegionStations(name).length
        }
      };
    })
  };
}

function getDistrictLabelPoint(feature) {
  const name = feature.properties.name;
  const manualPosition = districtLabelPositions[name];
  if (manualPosition) {
    return projection([manualPosition.lon, manualPosition.lat]);
  }
  const centroidX = feature.properties.CENTROID_X;
  const centroidY = feature.properties.CENTROID_Y;
  if (Number.isFinite(centroidX) && Number.isFinite(centroidY)) {
    return projection([centroidX, centroidY]);
  }
  return path.centroid(feature);
}

function renderMetric(metric) {
  if (!features || !districts || !dates.length) {
    return;
  }
  const currentDate = dates[currentDateIndex];
  const regions = dailyData[currentDate].regions;
  currentDateLabel.text(currentDate);
  mapSubtitle.text(`${currentDate} daily average by monitoring stations`);

  districts.transition()
    .duration(450)
    .attr("fill", d => {
      const value = getRegionMetricValue(d.properties.name, metric);
      return getAqiLevelColor(toAqiScale(value, metric));
    });

  const ranked = features.features
    .map(d => ({
      name: d.properties.name,
      value: regions[d.properties.name]?.[metric] ?? null
    }))
    .filter(d => d.value !== null)
    .sort((a, b) => d3.descending(toAqiScale(a.value, metric), toAqiScale(b.value, metric)));
  const top = ranked[0];
  const bottom = ranked[ranked.length - 1];
  maxRegion.text(`${top.name} ${formatValue(top.value, metric)}`);
  minRegion.text(`${bottom.name} ${formatValue(bottom.value, metric)}`);

  detailTitle.text(metrics[metric].title);
  detailSummary.text(`当前日期: ${currentDate}
监测指标: ${metric}`);
  renderLegend(metric);
}
// 各区域数值由该区域内所有监测站点日均值求平均确定；PM2.5 和 PM10 先按 HJ 633-2012 浓度断点换算为 IAQI 后着色。

function renderLegend(metric) {
  d3.select("#legend").html("");
  const legend = d3.select("#legend");
  legend.append("div")
    .attr("class", "legend-title")
    .text(`${metric} 分级颜色`);
  const rows = legend.selectAll(".legend-row")
    .data(aqiLevels)
    .join("div")
    .attr("class", "legend-row");
  rows.append("span")
    .attr("class", "legend-swatch")
    .style("background", d => d.color);
  rows.append("span").text(d => d.name);
  rows.append("span").text(d => d.range);
}

function showDistrictTooltip(event, d) {
  const value = getRegionMetricValue(d.properties.name, activeMetric);
  const level = getAqiLevel(toAqiScale(value, activeMetric));
  tooltip
    .style("opacity", 1)
    .style("left", `${event.clientX}px`)
    .style("top", `${event.clientY}px`)
    .html(`<strong>${d.properties.name}</strong>${activeMetric}: ${formatValue(value, activeMetric)}<br>颜色等级: ${level ? level.name : "无数据"}<br>监测站点: ${d.properties.stationCount}`);
}

function showStationTooltip(event, d) {
  const values = getStationValues(d.name);
  tooltip
    .style("opacity", 1)
    .style("left", `${event.clientX}px`)
    .style("top", `${event.clientY}px`)
    .html(`<strong>${d.name}｜${d.district}</strong>AQI: ${formatValue(values.AQI, "AQI")}<br>PM2.5: ${formatValue(values["PM2.5"], "PM2.5")}<br>PM10: ${formatValue(values.PM10, "PM10")}`);
}

function hideTooltip() {
  tooltip.style("opacity", 0);
}

function getRegionStations(regionName) {
  if (regionName === "市区") {
    return stations.filter(station => urbanDistricts.has(station.district));
  }
  if (regionName === "大兴") {
    return stations.filter(station => station.district === "大兴" || station.district === "亦庄");
  }
  return stations.filter(station => station.district === regionName);
}

function getRegionValues(regionName) {
  return dailyData[dates[currentDateIndex]].regions[regionName] ?? null;
}

function getRegionMetricValue(regionName, metric) {
  return getRegionValues(regionName)?.[metric] ?? null;
}

function getStationValues(stationName) {
  return dailyData[dates[currentDateIndex]].stations[stationName] ?? {};
}

function getAqiLevel(aqiValue) {
  if (aqiValue === null || Number.isNaN(aqiValue)) {
    return null;
  }
  return aqiLevels.find(level => aqiValue <= level.max) ?? aqiLevels[aqiLevels.length - 1];
}

function getAqiLevelColor(aqiValue) {
  return getAqiLevel(aqiValue)?.color ?? "#dfe4df";
}

function toAqiScale(value, metric) {
  if (value === null || Number.isNaN(value)) {
    return null;
  }
  if (metric === "AQI") {
    return value;
  }
  const breakpoints = pollutantBreakpoints[metric];
  const segment = breakpoints.find(([cLow, cHigh]) => value <= cHigh && value >= cLow) ?? breakpoints[breakpoints.length - 1];
  const [cLow, cHigh, iLow, iHigh] = segment;
  if (value > cHigh) {
    return iHigh;
  }
  return ((iHigh - iLow) / (cHigh - cLow)) * (value - cLow) + iLow;
}

function normalizeRegionName(name) {
  const regionName = String(name || "").replace(/^北京市?/, "");
  if (regionName === "市区") {
    return regionName;
  }
  return regionName
    .replace(/区$/, "")
    .replace(/县$/, "");
}

function formatValue(value, metric) {
  if (value === null || Number.isNaN(value)) {
    return "无数据";
  }
  const unit = metrics[metric].unit;
  return `${d3.format(".1f")(value)}${unit ? ` ${unit}` : ""}`;
}

function stopPlayback() {
  if (playbackTimer) {
    playbackTimer.stop();
    playbackTimer = null;
    playButton.text("播放");
  }
}
