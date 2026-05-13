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
const dailyDataPath = "src/daily-data-2014.json";
const policyDataPath = "src/policy-impact-summary.json";
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
const motionPlayButton = d3.select("#motion-play-button");
const motionSlider = d3.select("#motion-slider");
let activeMetric = "AQI";
let currentDateIndex = 0;
let dailyData;
let dates = [];
let playbackTimer;
let motionMetric = "pm25";
let motionScaleMode = "fixed";
let motionIndex = 0;
let motionTimer;
let motionIsPlaying = false;
let monthlyMotionData = [];
let motionPoliciesByMonth = new Map();
let motionPolicyEvents = [];
let motionPolicyWindows = [];

const motionMetricConfig = {
  pm25: { label: "PM2.5", unit: "ug/m3", color: "#b12f1f" },
  aqi: { label: "AQI", unit: "", color: "#1f6f8b" },
  pm10: { label: "PM10", unit: "ug/m3", color: "#7c6a2f" }
};

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
  }, 360);
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

d3.json(policyDataPath).then(renderPolicyDashboard).catch(error => {
  d3.select("#data-note").text(`政策影响数据加载失败：${error.message}`);
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

function renderPolicyDashboard(data) {
  d3.select("#data-note").text(`${data.meta.method} ${data.meta.note}`);
  renderFindings(data.findings);
  renderMonthlyMotionChart(data);
  renderTrendChart(data);
  renderWindowChart(data.policyWindows);
  renderHeatmapChart(data.monthly);
  renderLevelChart(data.yearly);
  renderPolicyTimeline(data.policies);
}

function renderFindings(findings) {
  const cards = d3.select("#finding-grid")
    .selectAll(".finding-card")
    .data(findings)
    .join("article")
    .attr("class", "finding-card");

  cards.html("");
  cards.append("span")
    .attr("class", "finding-label")
    .text(d => d.label);
  cards.append("strong")
    .attr("class", "finding-value")
    .text(d => d.value);
  cards.append("p")
    .text(d => d.text);
}

function renderMonthlyMotionChart(data) {
  monthlyMotionData = data.monthly
    .filter(d => d.year >= 2014)
    .map(d => ({
      ...d,
      key: `${d.year}-${String(d.month).padStart(2, "0")}`,
      date: new Date(d.year, d.month - 1, 1)
    }));
  const monthExtent = d3.extent(monthlyMotionData, d => d.date);
  motionPolicyEvents = data.policies
    .map(policy => ({ ...policy, dateObject: parsePolicyDate(policy.date) }))
    .filter(policy => policy.dateObject && policy.dateObject >= monthExtent[0] && policy.dateObject <= monthExtent[1]);
  motionPoliciesByMonth = d3.group(motionPolicyEvents, policy => monthKey(policy.dateObject));
  motionPolicyWindows = data.policyWindows.map(windowItem => ({
    ...windowItem,
    startKey: `${windowItem.startYear}-01`,
    endKey: `${windowItem.endYear}-12`
  }));

  motionSlider
    .attr("max", monthlyMotionData.length - 1)
    .property("value", motionIndex)
    .on("input", function () {
      stopMotionPlayback();
      motionIndex = Number(this.value);
      renderMotionFrame(true);
    });

  motionPlayButton
    .on("click", null)
    .on("click.motion", event => {
    event.stopImmediatePropagation();
    if (motionIsPlaying || motionTimer) {
      stopMotionPlayback();
      return;
    }
    stopMotionPlayback();
    motionIsPlaying = true;
    motionPlayButton.text("暂停");
    motionTimer = d3.interval(() => {
      motionIndex = (motionIndex + 1) % monthlyMotionData.length;
      motionSlider.property("value", motionIndex);
      renderMotionFrame(true);
    }, 520);
  });

  d3.selectAll(".motion-metric-button").on("click.motion", function () {
    stopMotionPlayback();
    motionMetric = this.dataset.motionMetric;
    d3.selectAll(".motion-metric-button").classed("active", false);
    d3.select(this).classed("active", true);
    renderMotionFrame(true);
  });

  d3.selectAll(".motion-scale-button").on("click.motion", function () {
    stopMotionPlayback();
    motionScaleMode = this.dataset.motionScale;
    d3.selectAll(".motion-scale-button").classed("active", false);
    d3.select(this).classed("active", true);
    renderMotionFrame(true);
  });

  renderMotionFrame(false);
}

function renderMotionFrame(animate) {
  if (!monthlyMotionData.length) {
    return;
  }
  const config = motionMetricConfig[motionMetric];
  const current = monthlyMotionData[motionIndex];
  const visibleData = monthlyMotionData.slice(0, motionIndex + 1);
  const currentPolicies = motionPoliciesByMonth.get(current.key) ?? [];
  d3.select("#motion-current-month").text(current.key);

  const widthValue = 980;
  const heightValue = 430;
  const margin = { top: 92, right: 24, bottom: 52, left: 58 };
  const innerWidth = widthValue - margin.left - margin.right;
  const innerHeight = heightValue - margin.top - margin.bottom;
  let svgMotion = d3.select("#monthly-motion-chart").select("svg");
  if (svgMotion.empty()) {
    svgMotion = createChart("#monthly-motion-chart", widthValue, heightValue)
      .attr("aria-label", "逐月播放空气污染指标柱状图与政策发布卡片");
    const plot = svgMotion.append("g")
      .attr("class", "motion-plot")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    plot.append("g").attr("class", "motion-policy-timeline");
    plot.append("g").attr("class", "motion-stage-bands");
    plot.append("g").attr("class", "motion-grid");
    plot.append("g").attr("class", "motion-bars");
    plot.append("g").attr("class", "motion-policy-months");
    plot.append("g").attr("class", "motion-policy-lines");
    plot.append("g").attr("class", "motion-now");
    plot.append("g").attr("class", "motion-cards");
    plot.append("g").attr("class", "axis motion-x-axis").attr("transform", `translate(0,${innerHeight})`);
    plot.append("g").attr("class", "axis motion-y-axis");
    plot.append("text")
      .attr("class", "chart-label motion-y-label")
      .attr("x", 0)
      .attr("y", -8);
  }

  const plot = svgMotion.select(".motion-plot");
  const x = d3.scaleBand()
    .domain(monthlyMotionData.map(d => d.key))
    .range([0, innerWidth])
    .padding(0.18);
  const scaleSource = motionScaleMode === "tracking" ? visibleData : monthlyMotionData;
  const yMax = d3.max(scaleSource, d => d[motionMetric] || 0) || 1;
  const y = d3.scaleLinear()
    .domain([0, Math.max(yMax * 1.16, motionMetric === "aqi" ? 60 : 35)])
    .nice()
    .range([innerHeight, 0]);
  const transition = animate ? d3.transition().duration(360).ease(d3.easeCubicOut) : null;

  plot.select(".motion-x-axis")
    .call(d3.axisBottom(x).tickValues(monthlyMotionData.filter(d => d.month === 1).map(d => d.key)).tickFormat(d => d.slice(0, 4)));
  plot.select(".motion-y-axis")
    .transition(transition || d3.transition().duration(0))
    .call(d3.axisLeft(y).ticks(6));
  plot.select(".motion-y-label")
    .text(`${config.label}${config.unit ? ` (${config.unit})` : ""}`);
  svgMotion.selectAll(".motion-scale-note")
    .data([motionScaleMode])
    .join("text")
    .attr("class", "motion-scale-note")
    .attr("x", widthValue - margin.right)
    .attr("y", heightValue - 14)
    .attr("text-anchor", "end")
    .text(d => d === "tracking" ? "纵轴随已播放月份追踪，适合看阶段内部波动" : "纵轴固定为全时期范围，适合比较治理前后绝对下降");
  svgMotion.selectAll(".motion-policy-note")
    .data([null])
    .join("text")
    .attr("class", "motion-scale-note motion-policy-note")
    .attr("x", margin.left)
    .attr("y", heightValue - 14)
    .text("上方时间线=政策发布；下方红线=对应月份；浅色背景=政策阶段");

  renderMotionPolicyTimeline(plot.select(".motion-policy-timeline"), x, current.date, innerWidth);
  renderMotionStageBands(plot, x, innerHeight);
  renderMotionPolicyMonthMarks(plot, x, innerHeight, current.date);

  const gridLines = plot.select(".motion-grid")
    .selectAll("line")
    .data(y.ticks(6));
  gridLines.join("line")
    .attr("class", "grid-line")
    .attr("x1", 0)
    .attr("x2", innerWidth)
    .attr("y1", d => y(d))
    .attr("y2", d => y(d));

  const bars = plot.select(".motion-bars")
    .selectAll("rect")
    .data(visibleData, d => d.key);
  bars.join(
    enter => enter.append("rect")
      .attr("x", d => x(d.key))
      .attr("width", x.bandwidth())
      .attr("y", y(0))
      .attr("height", 0)
      .attr("rx", 3)
      .attr("fill", config.color)
      .call(selection => selection.transition(transition || d3.transition().duration(0))
        .attr("y", d => y(d[motionMetric] || 0))
        .attr("height", d => innerHeight - y(d[motionMetric] || 0))),
    update => update.call(selection => selection.transition(transition || d3.transition().duration(0))
      .attr("x", d => x(d.key))
      .attr("width", x.bandwidth())
      .attr("fill", config.color)
      .attr("y", d => y(d[motionMetric] || 0))
      .attr("height", d => innerHeight - y(d[motionMetric] || 0))),
    exit => exit.call(selection => selection.transition(transition || d3.transition().duration(0))
      .attr("y", y(0))
      .attr("height", 0)
      .remove())
  )
    .on("mousemove", (event, d) => showPolicyTooltip(event, d.key, `${config.label}: ${formatMotionValue(d[motionMetric], motionMetric)}<br>PM2.5: ${formatMotionValue(d.pm25, "pm25")}<br>AQI: ${formatMotionValue(d.aqi, "aqi")}`))
    .on("mouseleave", hideTooltip);

  const currentX = x(current.key) + x.bandwidth() / 2;
  plot.select(".motion-now")
    .selectAll("line")
    .data([current])
    .join("line")
    .attr("class", "motion-now-line")
    .attr("x1", currentX)
    .attr("x2", currentX)
    .attr("y1", 0)
    .attr("y2", innerHeight);

  plot.select(".motion-policy-lines")
    .selectAll("line")
    .data(currentPolicies, d => d.id)
    .join(
      enter => enter.append("line")
        .attr("class", "motion-policy-line")
        .attr("x1", currentX)
        .attr("x2", currentX)
        .attr("y1", 0)
        .attr("y2", innerHeight)
        .style("opacity", 0)
        .call(selection => selection.transition(transition || d3.transition().duration(0)).style("opacity", 1)),
      update => update.attr("x1", currentX).attr("x2", currentX),
      exit => exit.call(selection => selection.transition(transition || d3.transition().duration(0)).style("opacity", 0).remove())
    );

  renderMotionPolicyCards(plot.select(".motion-cards"), currentPolicies, currentX, innerWidth);
}

function renderMotionPolicyTimeline(layer, x, currentDate, innerWidth) {
  const activeEvents = motionPolicyEvents.filter(policy => policy.dateObject <= currentDate);
  const axisY = -48;
  layer.selectAll(".motion-policy-timeline-base")
    .data([null])
    .join("line")
    .attr("class", "motion-policy-timeline-base")
    .attr("x1", 0)
    .attr("x2", innerWidth)
    .attr("y1", axisY)
    .attr("y2", axisY);

  layer.selectAll(".motion-policy-timeline-title")
    .data([null])
    .join("text")
    .attr("class", "motion-policy-timeline-title")
    .attr("x", 0)
    .attr("y", axisY - 30)
    .text("政策出台时间线");

  const items = layer.selectAll(".motion-policy-timeline-item")
    .data(activeEvents, d => d.id);
  const entered = items.enter()
    .append("g")
    .attr("class", "motion-policy-timeline-item")
    .style("opacity", 0);
  entered.append("line")
    .attr("class", "motion-policy-timeline-stem")
    .attr("y1", axisY)
    .attr("y2", (_, index) => timelineLabelY(index) + 8);
  entered.append("circle")
    .attr("class", "motion-policy-timeline-dot")
    .attr("cy", axisY)
    .attr("r", 5.6);
  entered.append("rect")
    .attr("class", "motion-policy-timeline-label-bg")
    .attr("rx", 6)
    .attr("width", 138)
    .attr("height", 24);
  entered.append("text")
    .attr("class", "motion-policy-timeline-label")
    .attr("x", 8)
    .attr("dy", "0.35em");

  const merged = entered.merge(items);
  merged
    .attr("transform", d => {
      const xValue = (x(monthKey(d.dateObject)) ?? 0) + x.bandwidth() / 2;
      return `translate(${xValue},0)`;
    })
    .on("mousemove", (event, d) => showPolicyTooltip(event, `${monthKey(d.dateObject)} 政策`, `${d.name}<br>${truncateText(d.summary, 58)}`))
    .on("mouseleave", hideTooltip);
  merged.select(".motion-policy-timeline-stem")
    .attr("x1", 0)
    .attr("x2", 0)
    .attr("y2", (_, index) => timelineLabelY(index) + 10);
  merged.select(".motion-policy-timeline-dot")
    .attr("cx", 0);
  merged.select(".motion-policy-timeline-label-bg")
    .attr("x", d => timelineLabelX(d, x, innerWidth))
    .attr("y", (_, index) => timelineLabelY(index) - 10);
  merged.select(".motion-policy-timeline-label")
    .attr("x", d => timelineLabelX(d, x, innerWidth) + 8)
    .attr("y", (_, index) => timelineLabelY(index) + 1)
    .text(d => policyShortName(d.name));
  entered.transition()
    .duration(240)
    .style("opacity", 1);
  items.exit()
    .transition()
    .duration(160)
    .style("opacity", 0)
    .remove();
}

function timelineLabelY(index) {
  return [-72, -22, -92][index % 3];
}

function timelineLabelX(policy, x, innerWidth) {
  const labelWidth = 138;
  const xValue = (x(monthKey(policy.dateObject)) ?? 0) + x.bandwidth() / 2;
  return Math.max(-xValue, Math.min(-8, innerWidth - xValue - labelWidth));
}

function renderMotionStageBands(plot, x, innerHeight) {
  const bands = plot.select(".motion-stage-bands")
    .selectAll("g")
    .data(motionPolicyWindows, d => d.name);
  const entered = bands.enter()
    .append("g")
    .attr("class", "motion-stage-group");
  entered.append("rect")
    .attr("class", "motion-stage-band")
    .attr("y", 0)
    .attr("height", innerHeight);
  entered.append("text")
    .attr("class", "motion-stage-label")
    .attr("y", 14);

  const merged = entered.merge(bands);
  merged.select("rect")
    .attr("x", d => x(d.startKey) ?? 0)
    .attr("width", d => {
      const start = x(d.startKey) ?? 0;
      const end = (x(d.endKey) ?? start) + x.bandwidth();
      return Math.max(0, end - start);
    });
  merged.select("text")
    .attr("x", d => (x(d.startKey) ?? 0) + 6)
    .text(d => d.name.replace(/\s.*/, ""));
  bands.exit().remove();
}

function renderMotionPolicyMonthMarks(plot, x, innerHeight, currentDate) {
  const activeEvents = motionPolicyEvents.filter(policy => policy.dateObject <= currentDate);
  const marks = plot.select(".motion-policy-months")
    .selectAll("g")
    .data(activeEvents, d => d.id);
  const entered = marks.enter()
    .append("g")
    .attr("class", "motion-policy-month-mark")
    .style("opacity", 0);
  entered.append("line")
    .attr("class", "motion-policy-month-line")
    .attr("y1", 0)
    .attr("y2", innerHeight);
  entered.append("circle")
    .attr("class", "motion-policy-month-dot")
    .attr("cy", -3)
    .attr("r", 4);

  const merged = entered.merge(marks);
  merged
    .attr("transform", d => {
      const xValue = (x(monthKey(d.dateObject)) ?? 0) + x.bandwidth() / 2;
      return `translate(${xValue},0)`;
    })
    .on("mousemove", (event, d) => showPolicyTooltip(event, `${monthKey(d.dateObject)} 政策`, `${d.name}<br>${truncateText(d.summary, 58)}`))
    .on("mouseleave", hideTooltip)
    .transition()
    .duration(220)
    .style("opacity", 1);
  marks.exit()
    .transition()
    .duration(160)
    .style("opacity", 0)
    .remove();
}

function renderMotionPolicyCards(layer, policies, currentX, innerWidth) {
  const cardWidth = 300;
  const cardHeight = 86;
  const cardX = Math.max(8, Math.min(currentX + 12, innerWidth - cardWidth - 8));
  const cards = layer.selectAll(".motion-policy-card")
    .data(policies.slice(0, 3), d => d.id);
  cards.join(
    enter => {
      const card = enter.append("g")
        .attr("class", "motion-policy-card")
        .attr("transform", (_, index) => `translate(${cardX},${16 + index * (cardHeight + 8)})`)
        .style("opacity", 0);
      card.append("rect")
        .attr("width", cardWidth)
        .attr("height", cardHeight)
        .attr("rx", 8);
      card.append("text")
        .attr("class", "policy-card-year")
        .attr("x", 12)
        .attr("y", 22)
        .text(d => `${d.year} 政策发布`);
      card.append("text")
        .attr("class", "policy-card-title")
        .attr("x", 12)
        .attr("y", 43)
        .text(d => truncateText(d.name, 28));
      card.append("text")
        .attr("x", 12)
        .attr("y", 64)
        .text(d => truncateText(d.pollutants || d.summary, 34));
      return card.transition().duration(240).style("opacity", 1);
    },
    update => update
      .transition()
      .duration(240)
      .attr("transform", (_, index) => `translate(${cardX},${16 + index * (cardHeight + 8)})`)
      .style("opacity", 1),
    exit => exit.transition().duration(180).style("opacity", 0).remove()
  );
}

function parsePolicyDate(value) {
  const dateValue = new Date(value);
  return Number.isNaN(dateValue.getTime()) ? null : dateValue;
}

function monthKey(dateValue) {
  return `${dateValue.getFullYear()}-${String(dateValue.getMonth() + 1).padStart(2, "0")}`;
}

function formatMotionValue(value, metric) {
  if (value === null || Number.isNaN(value)) {
    return "无数据";
  }
  const config = motionMetricConfig[metric];
  return `${d3.format(".1f")(value)}${config.unit ? ` ${config.unit}` : ""}`;
}

function truncateText(value, maxLength) {
  const text = String(value || "");
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function policyShortName(name) {
  const text = String(name || "")
    .replace(/^北京市?/, "")
    .replace(/《|》/g, "")
    .replace(/推进美丽北京建设\s*/, "")
    .replace(/持续深入打好污染防治攻坚战\s*/, "")
    .replace(/深入打好污染防治攻坚战\s*/, "")
    .replace(/时期生态环境保护规划$/, "生态环境规划")
    .replace(/行动计划$/, "行动计划")
    .replace(/年/g, "");
  const aliases = [
    ["大气污染防治条例", "防治条例"],
    ["蓝天保卫战三行动计划", "蓝天保卫战"],
    ["清洁空气行动计划", "清洁空气"],
    ["生态环境保护规划", "十四五规划"],
    ["污染防治攻坚战 2022", "2022攻坚"],
    ["污染防治攻坚战 2023", "2023攻坚"],
    ["2024 行动计划", "2024行动"],
    ["2025 行动计划", "2025攻坚"],
    ["2026 行动计划", "2026行动"],
    ["扬尘专项治理春季攻坚", "扬尘攻坚"]
  ];
  const alias = aliases.find(([pattern]) => text.includes(pattern));
  return alias ? alias[1] : truncateText(text, 10);
}

function createChart(selector, widthValue, heightValue) {
  const container = d3.select(selector);
  container.html("");
  return container.append("svg")
    .attr("viewBox", `0 0 ${widthValue} ${heightValue}`)
    .attr("role", "img");
}

function renderTrendChart(data) {
  const yearly = data.yearly;
  const policies = data.policies.filter(policy => [2014, 2018, 2021, 2025].includes(policy.year));
  const widthValue = 880;
  const heightValue = 330;
  const margin = { top: 22, right: 28, bottom: 46, left: 54 };
  const innerWidth = widthValue - margin.left - margin.right;
  const innerHeight = heightValue - margin.top - margin.bottom;
  const svgTrend = createChart("#trend-chart", widthValue, heightValue);
  const plot = svgTrend.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  const years = yearly.map(d => d.year);
  const x = d3.scaleLinear().domain(d3.extent(years)).range([0, innerWidth]);
  const y = d3.scaleLinear()
    .domain([0, d3.max(yearly, d => Math.max(d.pm25, d.aqi)) * 1.08])
    .nice()
    .range([innerHeight, 0]);

  plot.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("d")).ticks(years.length));
  plot.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).ticks(6));
  plot.append("g")
    .selectAll("line")
    .data(y.ticks(6))
    .join("line")
    .attr("class", "grid-line")
    .attr("x1", 0)
    .attr("x2", innerWidth)
    .attr("y1", d => y(d))
    .attr("y2", d => y(d));

  policies.forEach(policy => {
    const markerX = x(policy.year);
    plot.append("line")
      .attr("class", "policy-marker")
      .attr("x1", markerX)
      .attr("x2", markerX)
      .attr("y1", 0)
      .attr("y2", innerHeight);
    plot.append("text")
      .attr("class", "policy-marker-label")
      .attr("x", markerX + 4)
      .attr("y", 12)
      .text(policy.year);
  });

  const line = metric => d3.line()
    .defined(d => d[metric] !== null)
    .x(d => x(d.year))
    .y(d => y(d[metric]));
  const series = [
    { metric: "pm25", label: "PM2.5", color: "#b12f1f" },
    { metric: "aqi", label: "AQI", color: "#1f6f8b" }
  ];

  series.forEach(item => {
    plot.append("path")
      .datum(yearly)
      .attr("fill", "none")
      .attr("stroke", item.color)
      .attr("stroke-width", 3)
      .attr("d", line(item.metric));
    plot.selectAll(`.dot-${item.metric}`)
      .data(yearly)
      .join("circle")
      .attr("class", `dot-${item.metric}`)
      .attr("cx", d => x(d.year))
      .attr("cy", d => y(d[item.metric]))
      .attr("r", d => d.isFullYear ? 4 : 3)
      .attr("fill", d => d.isFullYear ? item.color : "#fff")
      .attr("stroke", item.color)
      .attr("stroke-width", 2)
      .on("mousemove", (event, d) => showPolicyTooltip(event, `${d.year} 年`, `${item.label}: ${d3.format(".1f")(d[item.metric])}<br>PM2.5: ${d3.format(".1f")(d.pm25)} ug/m3<br>AQI <=100: ${d.excellentGoodDays} 天${d.isFullYear ? "" : "<br>未满年或存在缺测"}`))
      .on("mouseleave", hideTooltip);
  });

  svgTrend.append("g")
    .attr("class", "legend-inline")
    .attr("transform", `translate(${margin.left},${heightValue - 18})`);

  const legend = d3.select("#trend-chart").append("div").attr("class", "legend-inline");
  series.forEach(item => {
    const row = legend.append("span");
    row.append("i").attr("class", "legend-dot").style("background", item.color);
    row.append("span").text(item.label);
  });
  legend.append("span").text("空心点表示未满年或缺测较多年份");
}

function renderWindowChart(windows) {
  const widthValue = 430;
  const heightValue = 330;
  const margin = { top: 18, right: 18, bottom: 30, left: 150 };
  const innerWidth = widthValue - margin.left - margin.right;
  const innerHeight = heightValue - margin.top - margin.bottom;
  const svgWindow = createChart("#window-chart", widthValue, heightValue);
  const plot = svgWindow.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  const y = d3.scaleBand()
    .domain(windows.map(d => d.name))
    .range([0, innerHeight])
    .padding(0.28);
  const x = d3.scaleLinear()
    .domain([d3.min(windows, d => d.changePct) * 1.1, 0])
    .range([0, innerWidth]);

  plot.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x).ticks(4).tickFormat(d => `${d}%`));
  plot.append("line")
    .attr("x1", x(0))
    .attr("x2", x(0))
    .attr("y1", 0)
    .attr("y2", innerHeight)
    .attr("stroke", "#9aa5a0");
  plot.selectAll("rect")
    .data(windows)
    .join("rect")
    .attr("x", d => x(d.changePct))
    .attr("y", d => y(d.name))
    .attr("width", d => x(0) - x(d.changePct))
    .attr("height", y.bandwidth())
    .attr("rx", 5)
    .attr("fill", "#1f6f8b")
    .on("mousemove", (event, d) => showPolicyTooltip(event, d.name, `PM2.5: ${d.startPm25} -> ${d.endPm25} ug/m3<br>变化: ${d.changePct}%<br>AQI <=100 天数: +${d.deltaGoodDays} 天<br>${d.note}`))
    .on("mouseleave", hideTooltip);
  plot.selectAll(".window-label")
    .data(windows)
    .join("text")
    .attr("class", "chart-label")
    .attr("x", -10)
    .attr("y", d => y(d.name) + y.bandwidth() / 2)
    .attr("dy", "0.35em")
    .attr("text-anchor", "end")
    .text(d => d.name.replace(" ", "\n"));
  plot.selectAll(".window-value")
    .data(windows)
    .join("text")
    .attr("class", "chart-label window-value")
    .attr("x", d => x(d.changePct) + 8)
    .attr("y", d => y(d.name) + y.bandwidth() / 2)
    .attr("dy", "0.35em")
    .attr("fill", "#fff")
    .text(d => `${d.changePct}%`);
}

function renderHeatmapChart(monthly) {
  const years = Array.from(new Set(monthly.map(d => d.year))).sort(d3.ascending);
  const months = d3.range(1, 13);
  const widthValue = 880;
  const heightValue = 360;
  const margin = { top: 18, right: 20, bottom: 38, left: 50 };
  const innerWidth = widthValue - margin.left - margin.right;
  const innerHeight = heightValue - margin.top - margin.bottom;
  const svgHeatmap = createChart("#heatmap-chart", widthValue, heightValue);
  const plot = svgHeatmap.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  const x = d3.scaleBand().domain(months).range([0, innerWidth]).padding(0.08);
  const y = d3.scaleBand().domain(years).range([0, innerHeight]).padding(0.08);
  const color = d3.scaleSequential(d3.interpolateYlOrRd)
    .domain([20, d3.max(monthly, d => d.pm25 || 0)]);

  plot.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x).tickFormat(d => `${d}月`));
  plot.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).tickFormat(d3.format("d")));
  plot.selectAll("rect")
    .data(monthly.filter(d => d.pm25 !== null))
    .join("rect")
    .attr("x", d => x(d.month))
    .attr("y", d => y(d.year))
    .attr("width", x.bandwidth())
    .attr("height", y.bandwidth())
    .attr("rx", 3)
    .attr("fill", d => color(d.pm25))
    .on("mousemove", (event, d) => showPolicyTooltip(event, `${d.year} 年 ${d.month} 月`, `PM2.5: ${d.pm25} ug/m3<br>PM10: ${d.pm10} ug/m3<br>AQI: ${d.aqi}`))
    .on("mouseleave", hideTooltip);
}

function renderLevelChart(yearly) {
  const data = yearly.filter(d => d.year <= 2025);
  const keys = ["excellent", "good", "light", "moderate", "heavy", "severe"];
  const labels = {
    excellent: "优",
    good: "良",
    light: "轻度",
    moderate: "中度",
    heavy: "重度",
    severe: "严重"
  };
  const colors = {
    excellent: "#6fbf73",
    good: "#c9d86c",
    light: "#f0c55a",
    moderate: "#e58b4b",
    heavy: "#b12f1f",
    severe: "#5a1e29"
  };
  const widthValue = 430;
  const heightValue = 330;
  const margin = { top: 18, right: 16, bottom: 44, left: 44 };
  const innerWidth = widthValue - margin.left - margin.right;
  const innerHeight = heightValue - margin.top - margin.bottom;
  const svgLevel = createChart("#level-chart", widthValue, heightValue);
  const plot = svgLevel.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  const stack = d3.stack().keys(keys).value((d, key) => d.levelCounts[key])(data);
  const x = d3.scaleBand().domain(data.map(d => d.year)).range([0, innerWidth]).padding(0.18);
  const y = d3.scaleLinear().domain([0, d3.max(data, d => d.days)]).nice().range([innerHeight, 0]);

  plot.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("d")).tickValues(data.map(d => d.year).filter((_, i) => i % 2 === 0)));
  plot.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).ticks(5));
  plot.selectAll("g.level")
    .data(stack)
    .join("g")
    .attr("fill", d => colors[d.key])
    .selectAll("rect")
    .data(d => d.map(item => ({ ...item, key: d.key })))
    .join("rect")
    .attr("x", d => x(d.data.year))
    .attr("y", d => y(d[1]))
    .attr("height", d => y(d[0]) - y(d[1]))
    .attr("width", x.bandwidth())
    .on("mousemove", (event, d) => showPolicyTooltip(event, `${d.data.year} 年`, `${labels[d.key]}: ${d.data.levelCounts[d.key]} 天<br>AQI <=100: ${d.data.excellentGoodDays} 天<br>重污染: ${d.data.heavyPollutionDays} 天`))
    .on("mouseleave", hideTooltip);

  const legend = d3.select("#level-chart").append("div").attr("class", "legend-inline");
  keys.forEach(key => {
    const row = legend.append("span");
    row.append("i").attr("class", "legend-dot").style("background", colors[key]);
    row.append("span").text(labels[key]);
  });
}

function renderPolicyTimeline(policies) {
  const selectedYears = new Set([2013, 2014, 2018, 2021, 2024, 2025, 2026]);
  const selected = policies
    .filter(policy => selectedYears.has(policy.year))
    .filter((policy, index, array) => array.findIndex(item => item.year === policy.year) === index)
    .slice(0, 8);

  const items = d3.select("#policy-timeline")
    .selectAll(".policy-item")
    .data(selected)
    .join("article")
    .attr("class", "policy-item");
  items.html("");
  items.append("span")
    .attr("class", "policy-year")
    .text(d => d.year);
  items.append("strong")
    .text(d => d.name);
  items.append("p")
    .text(d => d.summary);
}

function showPolicyTooltip(event, title, body) {
  tooltip
    .style("opacity", 1)
    .style("left", `${event.clientX}px`)
    .style("top", `${event.clientY}px`)
    .html(`<strong>${title}</strong>${body}`);
}

function stopPlayback() {
  if (playbackTimer) {
    playbackTimer.stop();
    playbackTimer = null;
    playButton.text("播放");
  }
}

function stopMotionPlayback() {
  if (motionTimer) {
    motionTimer.stop();
    motionTimer = null;
  }
  motionIsPlaying = false;
  motionPlayButton.text("播放");
}
