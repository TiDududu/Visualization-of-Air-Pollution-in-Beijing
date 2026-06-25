import * as THREE from "../vendor/three.module.js";

const canvas = document.querySelector("#pollution-scene");
const warningNode = document.querySelector("#webgl-warning");
const yearSlider = document.querySelector("#year-slider");
const yearValue = document.querySelector("#year-value");
const yearPlayButton = document.querySelector("#year-play-button");
const rotationToggleButton = document.querySelector("#rotation-toggle-button");
const annualConcentrations = document.querySelector("#annual-concentrations");
const particleDetail = document.querySelector("#particle-detail");

const pollutantConfig = {
  pm25: { label: "PM2.5", metric: "pm25", name: "细颗粒物", source: "燃煤、机动车尾气、二次气溶胶", behavior: "较小 / 高密 / 漂浮", color: 0xff604a, radius: [0.011, 0.024], countFactor: 1.78, height: [1.0, 4.2], orbit: [1.6, 4.6], speed: 0.42 },
  pm10: { label: "PM10", metric: "pm10", name: "可吸入颗粒物", source: "道路扬尘、施工扬尘、粗颗粒沉降", behavior: "略大 / 低空 / 沉降", color: 0xd9a548, radius: [0.016, 0.034], countFactor: 0.98, height: [0.25, 2.2], orbit: [1.8, 5.1], speed: 0.24 },
  no2: { label: "NO2", metric: "no2", name: "二氧化氮", source: "机动车与燃烧过程排放", behavior: "小 / 近地 / 交通带", color: 0x7aa4ff, radius: [0.012, 0.028], countFactor: 0.58, height: [0.35, 1.9], orbit: [2.4, 5.4], speed: 0.32 },
  o3: { label: "O3", metric: "o3", name: "臭氧", source: "氮氧化物和 VOCs 光化学反应", behavior: "小 / 高空 / 光晕", color: 0x61d7bb, radius: [0.014, 0.032], countFactor: 0.48, height: [2.0, 4.9], orbit: [2.0, 5.8], speed: 0.2 },
  so2: { label: "SO2", metric: "so2", name: "二氧化硫", source: "燃煤、工业燃烧与含硫燃料排放", behavior: "小 / 近地 / 扩散", color: 0xb184ff, radius: [0.012, 0.026], countFactor: 0.52, height: [0.45, 2.6], orbit: [2.0, 5.2], speed: 0.28 }
};

const state = {
  enabled: new Set(["pm25", "pm10", "no2", "so2"]),
  pointerDown: false,
  pointerX: 0,
  pointerY: 0,
  pointerStartX: 0,
  pointerStartY: 0,
  yaw: 0,
  pitch: 0,
  distance: 12,
  selectedParticle: null,
  hoveredParticle: null,
  yearIndex: 0,
  frameIndex: 0,
  isPlaying: false,
  autoRotate: true,
  visualTime: 0,
  lastFrameTime: 0
};

const fallbackYearlyData = [
  { year: 2014, pm25: 101.6, pm10: 124.05, so2: 21.5, aqi: 122.76, days: 359, isFullYear: false },
  { year: 2015, pm25: 82.27, pm10: 111.47, so2: 13.5, aqi: 113.64, days: 364, isFullYear: true },
  { year: 2016, pm25: 73.62, pm10: 100.46, so2: 10.0, aqi: 104.04, days: 364, isFullYear: true },
  { year: 2017, pm25: 60.61, pm10: 93.06, so2: 8.0, aqi: 90.07, days: 348, isFullYear: false },
  { year: 2018, pm25: 52.24, pm10: 90.08, so2: 6.0, aqi: 84.67, days: 365, isFullYear: true },
  { year: 2019, pm25: 43.14, pm10: 73.43, so2: 4.0, aqi: 72.69, days: 364, isFullYear: true },
  { year: 2020, pm25: 38.26, pm10: 64.62, so2: 3.0, aqi: 65.33, days: 365, isFullYear: true },
  { year: 2021, pm25: 34.54, pm10: 72.56, so2: 3.0, aqi: 64.49, days: 361, isFullYear: true },
  { year: 2022, pm25: 30.38, pm10: 57.16, so2: 3.0, aqi: 56.48, days: 365, isFullYear: true },
  { year: 2023, pm25: 35.07, pm10: 74.11, so2: 3.0, aqi: 66.79, days: 365, isFullYear: true },
  { year: 2024, pm25: 31.41, pm10: 59.69, so2: 3.0, aqi: 57.2, days: 366, isFullYear: true },
  { year: 2025, pm25: 27.56, pm10: 52.04, so2: 3.0, aqi: 51.63, days: 365, isFullYear: true },
  { year: 2026, pm25: 38.52, pm10: 70.35, so2: 4.0, aqi: 66.51, days: 115, isFullYear: false }
];

let renderer;
let scene;
let camera;
let landmarkGroup;
let particleGroup;
let particleData = [];
let raycaster;
let pointer;
let selectionRing;
let hoverRing;
let yearlyData = fallbackYearlyData;
let playbackLastTime = 0;
let stageResizeObserver;

init();
animate();
loadYearlyData();

function init() {
  warningNode.hidden = false;
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf3f5f8);
  scene.fog = new THREE.Fog(0xf3f5f8, 9, 22);

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2();

  const hemi = new THREE.HemisphereLight(0xffffff, 0xdfe3df, 2.35);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xffe8b8, 2.85);
  key.position.set(-3.5, 5.5, 4.5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  scene.add(key);

  const rim = new THREE.PointLight(0xf2f2f2, 3.2, 16);
  rim.position.set(4, 2.5, -3);
  scene.add(rim);

  const ground = new THREE.Mesh(
    new THREE.CylinderGeometry(5.4, 5.8, 0.12, 96),
    new THREE.MeshStandardMaterial({ color: 0xeeeeec, roughness: 0.82, metalness: 0.01 })
  );
  ground.position.y = -0.08;
  ground.receiveShadow = true;
  scene.add(ground);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(4.35, 0.012, 8, 160),
    new THREE.MeshBasicMaterial({ color: 0x719783, transparent: true, opacity: 0.55 })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.03;
  scene.add(ring);

  landmarkGroup = new THREE.Group();
  scene.add(landmarkGroup);
  particleGroup = new THREE.Group();
  scene.add(particleGroup);
  selectionRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.16, 0.012, 8, 36),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.92 })
  );
  selectionRing.visible = false;
  scene.add(selectionRing);
  hoverRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.13, 0.01, 8, 36),
    new THREE.MeshBasicMaterial({ color: 0x17211b, transparent: true, opacity: 0.72 })
  );
  hoverRing.visible = false;
  scene.add(hoverRing);

  syncYearControls();
  rebuildScene();
  renderParticleDetail(null);
  bindEvents();
  observeStageSize();
  resize();
  rotationToggleButton.textContent = "暂停旋转";
  warningNode.hidden = true;
}

function bindEvents() {
  window.addEventListener("resize", resize);

  canvas.addEventListener("pointerdown", (event) => {
    state.pointerDown = true;
    state.pointerX = event.clientX;
    state.pointerY = event.clientY;
    state.pointerStartX = event.clientX;
    state.pointerStartY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  });

  canvas.addEventListener("pointermove", (event) => {
    updateHoveredParticle(event);
    if (!state.pointerDown) return;
    const dx = event.clientX - state.pointerX;
    const dy = event.clientY - state.pointerY;
    state.pointerX = event.clientX;
    state.pointerY = event.clientY;
    state.yaw += dx * 0.006;
    state.pitch = THREE.MathUtils.clamp(state.pitch + dy * 0.004, -0.18, 0.68);
  });

  canvas.addEventListener("mousemove", (event) => {
    updateHoveredParticle(event);
  });

  canvas.addEventListener("pointerup", (event) => {
    state.pointerDown = false;
    const moved = Math.hypot(event.clientX - state.pointerStartX, event.clientY - state.pointerStartY);
    if (moved < 5) selectParticleAt(event);
  });

  canvas.addEventListener("click", (event) => {
    selectParticleAt(event);
  });

  canvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    state.distance = THREE.MathUtils.clamp(state.distance + event.deltaY * 0.006, 4.2, 12);
  }, { passive: false });

  yearSlider.addEventListener("input", () => {
    state.yearIndex = Number(yearSlider.value);
    state.frameIndex = state.yearIndex;
    applyYearFrame({ broadcast: true });
  });

  yearPlayButton.addEventListener("click", () => {
    state.isPlaying = !state.isPlaying;
    yearPlayButton.textContent = state.isPlaying ? "暂停" : "播放";
    playbackLastTime = performance.now();
    if (state.isPlaying) broadcastOverviewGlobal();
  });

  rotationToggleButton.addEventListener("click", () => {
    state.autoRotate = !state.autoRotate;
    rotationToggleButton.textContent = state.autoRotate ? "暂停旋转" : "继续旋转";
  });

  window.addEventListener("message", (event) => {
    if (event.data?.type !== "shared-pollutant-selection-change") return;
    const nextSelection = Array.isArray(event.data.pollutants)
      ? event.data.pollutants.filter((key) => pollutantConfig[key])
      : [];
    state.enabled = new Set(nextSelection.length ? nextSelection : ["pm25"]);
    state.selectedParticle = null;
    state.hoveredParticle = null;
    selectionRing.visible = false;
    hoverRing.visible = false;
    renderParticleDetail(null);
    rebuildParticles();
  });
}

function broadcastYearSelection() {
  window.parent?.postMessage({
    type: "pollution-3d-year-change",
    year: currentYearData().year
  }, "*");
}

function broadcastOverviewGlobal() {
  window.parent?.postMessage({
    type: "pollution-3d-year-change",
    year: "All"
  }, "*");
}

async function loadYearlyData() {
  try {
    const response = await fetch("../data/beijing-air-quality.csv");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const csvText = await response.text();
    yearlyData = aggregateCsvYearlyData(csvText);
  } catch (error) {
    console.warn("Using embedded fallback yearly pollution data.", error);
  }
  syncYearControls();
  applyYearFrame({ broadcast: false });
}

function aggregateCsvYearlyData(csvText) {
  const rows = parseCsvRows(csvText)
    .map((row) => {
      const date = parseDateText(row.date);
      return {
        date,
        year: date?.getFullYear(),
        pm25: parseMetric(row.pm25),
        pm10: parseMetric(row.pm10),
        o3: parseMetric(row.o3),
        no2: parseMetric(row.no2),
        so2: parseMetric(row.so2)
      };
    })
    .filter((row) => row.date && row.year >= 2014 && row.year <= 2026);

  const byYear = new Map();
  rows.forEach((row) => {
    if (!byYear.has(row.year)) {
      byYear.set(row.year, { year: row.year, days: 0, pm25: [], pm10: [], o3: [], no2: [], so2: [], aqi: [] });
    }
    const bucket = byYear.get(row.year);
    bucket.days += 1;
    for (const key of ["pm25", "pm10", "o3", "no2", "so2"]) {
      if (Number.isFinite(row[key])) bucket[key].push(row[key]);
    }
    const dailyAqi = estimateDailyAqi(row);
    if (Number.isFinite(dailyAqi)) bucket.aqi.push(dailyAqi);
  });

  return Array.from(byYear.values())
    .sort((a, b) => a.year - b.year)
    .map((item) => ({
      year: item.year,
      pm25: mean(item.pm25),
      pm10: mean(item.pm10),
      o3: mean(item.o3),
      no2: mean(item.no2),
      so2: mean(item.so2),
      aqi: mean(item.aqi),
      days: item.days,
      isFullYear: item.days >= 360
    }));
}

function parseCsvRows(csvText) {
  const lines = csvText.trim().split(/\r?\n/);
  const headers = lines.shift().split(",").map((header) => header.trim().toLowerCase());
  return lines.map((line) => {
    const cells = line.split(",");
    return Object.fromEntries(headers.map((header, index) => [header, cells[index]?.trim() ?? ""]));
  });
}

function parseDateText(value) {
  const [year, month, day] = value.split("/").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function parseMetric(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function mean(values) {
  const clean = values.filter(Number.isFinite);
  if (!clean.length) return null;
  return clean.reduce((sum, value) => sum + value, 0) / clean.length;
}

function estimateDailyAqi(row) {
  const values = [
    estimateIaqi(row.pm25, [[0, 35, 0, 50], [35, 75, 50, 100], [75, 115, 100, 150], [115, 150, 150, 200], [150, 250, 200, 300], [250, 350, 300, 400], [350, 500, 400, 500]]),
    estimateIaqi(row.pm10, [[0, 50, 0, 50], [50, 150, 50, 100], [150, 250, 100, 150], [250, 350, 150, 200], [350, 420, 200, 300], [420, 500, 300, 400], [500, 600, 400, 500]]),
    estimateIaqi(row.so2, [[0, 50, 0, 50], [50, 150, 50, 100], [150, 475, 100, 150], [475, 800, 150, 200], [800, 1600, 200, 300], [1600, 2100, 300, 400], [2100, 2620, 400, 500]]),
    estimateIaqi(row.no2, [[0, 40, 0, 50], [40, 80, 50, 100], [80, 180, 100, 150], [180, 280, 150, 200], [280, 565, 200, 300], [565, 750, 300, 400], [750, 940, 400, 500]]),
    estimateIaqi(row.o3, [[0, 100, 0, 50], [100, 160, 50, 100], [160, 215, 100, 150], [215, 265, 150, 200], [265, 800, 200, 300]])
  ].filter(Number.isFinite);
  return values.length ? Math.max(...values) : null;
}

function estimateIaqi(value, breakpoints) {
  if (!Number.isFinite(value)) return null;
  const range = breakpoints.find(([low, high]) => value >= low && value <= high) || breakpoints[breakpoints.length - 1];
  const [bpLow, bpHigh, iaqiLow, iaqiHigh] = range;
  return iaqiLow + ((iaqiHigh - iaqiLow) * (Math.min(value, bpHigh) - bpLow)) / (bpHigh - bpLow);
}

function syncYearControls() {
  yearSlider.max = String(Math.max(0, yearlyData.length - 1));
  yearSlider.value = String(state.yearIndex);
  yearValue.textContent = String(currentYearData().year);
  renderAnnualConcentrations();
}

function applyYearFrame({ broadcast = false } = {}) {
  yearSlider.value = String(state.yearIndex);
  yearValue.textContent = String(currentYearData().year);
  renderAnnualConcentrations();
  rebuildParticles();
  if (broadcast) broadcastYearSelection();
}

function currentYearData() {
  return yearlyData[state.yearIndex] || yearlyData[0] || fallbackYearlyData[0];
}

function getFallbackMetric(year, metric) {
  return fallbackYearlyData.find((item) => item.year === year)?.[metric] ?? null;
}

function formatValue(value) {
  return Number.isFinite(value) ? value.toFixed(1) : "无数据";
}

function renderAnnualConcentrations() {
  const data = currentYearData();
  const keys = ["pm25", "pm10", "no2", "so2", "o3"];
  const items = keys.map((key) => {
    const config = pollutantConfig[key];
    const concentration = getParticleConcentration(config, data);
    const valueText = Number.isFinite(concentration) ? `${formatValue(concentration)} ug/m3` : "无数据";
    return `<div><dt>${config.label}</dt><dd>${valueText}</dd></div>`;
  }).join("");
  annualConcentrations.innerHTML = `
    <span class="control-label">当前年度污染物浓度</span>
    <dl class="annual-concentration-list">${items}</dl>
  `;
}

function resize() {
  const rect = canvas.parentElement.getBoundingClientRect();
  const width = Math.max(320, Math.floor(rect.width));
  const height = Math.max(420, Math.floor(rect.height));
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function observeStageSize() {
  if (!("ResizeObserver" in window)) return;
  stageResizeObserver = new ResizeObserver(() => resize());
  stageResizeObserver.observe(canvas.parentElement);
}

function rebuildScene() {
  clearGroup(landmarkGroup);
  createTempleOfHeaven(landmarkGroup);
  rebuildParticles();
}

function createTempleOfHeaven(group) {
  const stone = new THREE.MeshStandardMaterial({ color: 0xeeeeec, roughness: 0.82 });
  const stoneLine = new THREE.MeshStandardMaterial({ color: 0xcfcfcb, roughness: 0.88 });
  const wall = new THREE.MeshStandardMaterial({ color: 0xa93423, roughness: 0.62 });
  const door = new THREE.MeshStandardMaterial({ color: 0x6e1e14, roughness: 0.7 });
  const roof = new THREE.MeshStandardMaterial({ color: 0x0d3963, roughness: 0.42, metalness: 0.16 });
  const roofDark = new THREE.MeshStandardMaterial({ color: 0x082744, roughness: 0.55, metalness: 0.08 });
  const trim = new THREE.MeshStandardMaterial({ color: 0x1f7890, roughness: 0.48, metalness: 0.1 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xe2b54d, roughness: 0.34, metalness: 0.36 });
  const jade = new THREE.MeshStandardMaterial({ color: 0x74a4a1, roughness: 0.44, metalness: 0.08 });

  addCircularTerrace(group, 1.95, 0.18, 0.08, stone, stoneLine);
  addCircularTerrace(group, 1.62, 0.2, 0.29, stone, stoneLine);
  addCircularTerrace(group, 1.28, 0.22, 0.52, stone, stoneLine);
  addStairways(group, stone, stoneLine);
  addBalustrades(group, 2.0, 0.27, 56, stone, stoneLine);
  addBalustrades(group, 1.66, 0.5, 48, stone, stoneLine);
  addBalustrades(group, 1.32, 0.75, 40, stone, stoneLine);

  addCylinder(group, 0.86, 0.9, 0.86, 1.12, wall, 160);
  addCylinder(group, 0.92, 0.95, 0.08, 0.66, stone, 160);
  addCylinder(group, 0.88, 0.88, 0.08, 1.6, trim, 160);
  addWallPanels(group, door, gold, jade);
  addColumnRing(group, 0.8, 24, 0.05, 0.96, 1.12, gold);
  addColumnRing(group, 0.58, 12, 0.035, 0.88, 1.15, gold);

  addBracketRing(group, 0.92, 1.62, 32, gold, roofDark);
  addRoofTier(group, { radius: 1.48, height: 0.56, y: 1.88, ribs: 56 }, roof, roofDark, gold);
  addCylinder(group, 0.72, 0.76, 0.4, 1.82, jade, 160);
  addWindowBand(group, 0.78, 1.88, 24, jade, gold);
  addBracketRing(group, 0.84, 2.1, 32, gold, roofDark);
  addRoofTier(group, { radius: 1.16, height: 0.5, y: 2.35, ribs: 52 }, roof, roofDark, gold);
  addCylinder(group, 0.52, 0.56, 0.36, 2.27, jade, 144);
  addWindowBand(group, 0.58, 2.31, 20, jade, gold);
  addBracketRing(group, 0.62, 2.47, 28, gold, roofDark);
  addRoofTier(group, { radius: 0.78, height: 0.58, y: 2.74, ribs: 44 }, roof, roofDark, gold);

  addCylinder(group, 0.12, 0.15, 0.12, 3.05, stone, 80);
  addCylinder(group, 0.075, 0.09, 0.22, 3.22, gold, 64);
  addOrb(group, 0.13, 3.38, gold);
  addCylinder(group, 0.035, 0.04, 0.16, 3.55, gold, 48);
}

function addCylinder(group, top, bottom, height, y, material, segments = 96) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(top, bottom, height, segments), material);
  mesh.position.y = y;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function addCircularTerrace(group, radius, height, y, stone, lineMaterial) {
  addCylinder(group, radius, radius * 1.04, height, y, stone, 160);
  for (const offset of [-height * 0.38, height * 0.36]) {
    const rim = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.01, 0.012, 8, 180), lineMaterial);
    rim.position.y = y + offset;
    rim.rotation.x = Math.PI / 2;
    group.add(rim);
  }
}

function addStairways(group, stone, lineMaterial) {
  const directions = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];
  directions.forEach((angle) => {
    const stair = new THREE.Group();
    const width = 0.5;
    const outerZ = 2.22;
    for (let i = 0; i < 7; i += 1) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(width, 0.035, 0.18), stone);
      step.position.set(0, 0.1 + i * 0.075, outerZ - i * 0.11);
      step.castShadow = true;
      step.receiveShadow = true;
      stair.add(step);
    }
    const centerRail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.04, 0.92), lineMaterial);
    centerRail.position.set(0, 0.33, 1.89);
    centerRail.rotation.x = 0.34;
    stair.add(centerRail);
    stair.rotation.y = angle;
    group.add(stair);
  });
}

function addBalustrades(group, radius, y, count, stone, lineMaterial) {
  const rail = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.014, 8, 180), stone);
  rail.position.y = y + 0.18;
  rail.rotation.x = Math.PI / 2;
  group.add(rail);

  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2;
    if (Math.abs(Math.sin(angle)) > 0.94 || Math.abs(Math.cos(angle)) > 0.94) continue;
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.22, 0.045), stone);
    post.position.set(Math.cos(angle) * radius, y + 0.09, Math.sin(angle) * radius);
    post.rotation.y = -angle;
    post.castShadow = true;
    group.add(post);
    const bead = new THREE.Mesh(new THREE.SphereGeometry(0.034, 10, 8), lineMaterial);
    bead.position.set(Math.cos(angle) * radius, y + 0.23, Math.sin(angle) * radius);
    group.add(bead);
  }
}

function addWallPanels(group, doorMaterial, gold, jade) {
  const count = 24;
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2;
    const isDoor = i % 6 === 0;
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(isDoor ? 0.16 : 0.12, isDoor ? 0.62 : 0.46, 0.022),
      isDoor ? doorMaterial : jade
    );
    placeOnRing(panel, 0.912, angle, isDoor ? 1.03 : 1.18);
    panel.castShadow = true;
    group.add(panel);

    const trimBar = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.6, 0.026), gold);
    placeOnRing(trimBar, 0.925, angle + Math.PI / count, 1.13);
    group.add(trimBar);
  }
}

function addColumnRing(group, radius, count, columnRadius, height, y, material) {
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2;
    const column = new THREE.Mesh(new THREE.CylinderGeometry(columnRadius, columnRadius * 1.08, height, 18), material);
    column.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
    column.castShadow = true;
    group.add(column);
  }
}

function addWindowBand(group, radius, y, count, material, gold) {
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2;
    const window = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.18, 0.018), material);
    placeOnRing(window, radius, angle, y);
    group.add(window);
    const lattice = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.19, 0.02), gold);
    placeOnRing(lattice, radius + 0.006, angle, y);
    group.add(lattice);
  }
}

function addBracketRing(group, radius, y, count, gold, dark) {
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2;
    const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.045, 0.12), i % 2 ? gold : dark);
    placeOnRing(bracket, radius, angle, y);
    bracket.castShadow = true;
    group.add(bracket);
  }
}

function addRoofTier(group, tier, roofMaterial, ribMaterial, gold) {
  const roof = new THREE.Mesh(new THREE.ConeGeometry(tier.radius, tier.height, 160), roofMaterial);
  roof.position.y = tier.y;
  roof.castShadow = true;
  group.add(roof);

  const eaveY = tier.y - tier.height * 0.5 + 0.015;
  const eave = new THREE.Mesh(new THREE.TorusGeometry(tier.radius * 1.01, 0.035, 10, 180), roofMaterial);
  eave.position.y = eaveY;
  eave.rotation.x = Math.PI / 2;
  eave.castShadow = true;
  group.add(eave);

  const goldEdge = new THREE.Mesh(new THREE.TorusGeometry(tier.radius * 1.02, 0.012, 8, 180), gold);
  goldEdge.position.y = eaveY - 0.02;
  goldEdge.rotation.x = Math.PI / 2;
  group.add(goldEdge);

  const top = new THREE.Vector3(0, tier.y + tier.height * 0.5 - 0.02, 0);
  for (let i = 0; i < tier.ribs; i += 1) {
    const angle = (i / tier.ribs) * Math.PI * 2;
    const end = new THREE.Vector3(
      Math.cos(angle) * tier.radius * 0.95,
      eaveY + 0.02,
      Math.sin(angle) * tier.radius * 0.95
    );
    addBeamBetween(group, top, end, 0.006, ribMaterial);
  }
}

function addBeamBetween(group, start, end, radius, material) {
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 8), material);
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  group.add(mesh);
}

function addOrb(group, radius, y, material) {
  const orb = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 20), material);
  orb.position.y = y;
  orb.castShadow = true;
  group.add(orb);
}

function placeOnRing(mesh, radius, angle, y) {
  mesh.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
  mesh.rotation.y = -angle + Math.PI / 2;
}

function rebuildParticles() {
  clearGroup(particleGroup);
  particleData = [];
  state.selectedParticle = null;
  state.hoveredParticle = null;
  selectionRing.visible = false;
  hoverRing.visible = false;
  renderParticleDetail(null);
  const yearData = currentYearData();

  for (const key of state.enabled) {
    const config = pollutantConfig[key];
    const concentration = getParticleConcentration(config, yearData);
    const visualStrength = getVisualPollutionStrength(key, config, concentration, yearData);
    const count = getParticleCount(key, config, concentration, yearData);
    const opacity = THREE.MathUtils.lerp(key === "pm10" ? 0.36 : 0.42, key === "pm10" ? 0.78 : 0.86, visualStrength);
    const material = new THREE.MeshStandardMaterial({
      color: config.color,
      emissive: config.color,
      emissiveIntensity: (key === "o3" ? 0.18 : 0.1) + visualStrength * 0.1,
      roughness: 0.48,
      transparent: true,
      opacity
    });

    for (let i = 0; i < count; i += 1) {
      const radius = THREE.MathUtils.lerp(config.radius[0], config.radius[1], seededRandom(i, key.length)) * (0.62 + visualStrength * 0.55);
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 12), material);
      mesh.castShadow = key === "pm10";
      mesh.userData.particleKey = key;
      mesh.userData.particleRadius = radius;
      const orbit = THREE.MathUtils.lerp(config.orbit[0], config.orbit[1], seededRandom(i, key.length + 13));
      const angle = seededRandom(i, key.length + 29) * Math.PI * 2;
      const height = THREE.MathUtils.lerp(config.height[0], config.height[1], seededRandom(i, key.length + 41));
      const particle = {
        mesh,
        key,
        label: config.label,
        name: config.name,
        source: config.source,
        behavior: config.behavior,
        concentration,
        year: yearData.year,
        yearDays: yearData.days,
        isFullYear: yearData.isFullYear,
        radius,
        orbit,
        angle,
        height,
        drift: seededRandom(i, key.length + 67) * Math.PI * 2,
        speed: config.speed * THREE.MathUtils.lerp(0.62, 1.36, seededRandom(i, key.length + 83))
      };
      mesh.userData.particle = particle;
      particleData.push(particle);
      particleGroup.add(mesh);
    }
  }

}

function getParticleConcentration(config, yearData) {
  if (config.metric && Number.isFinite(yearData[config.metric])) return yearData[config.metric];
  return null;
}

function getParticleCount(key, config, concentration, yearData) {
  const visualStrength = getVisualPollutionStrength(key, config, concentration, yearData);
  return Math.max(4, Math.round((4 + visualStrength * 132) * config.countFactor));
}

function getBaselineConcentration(key, config) {
  const baselineYear = yearlyData[0] || fallbackYearlyData[0];
  if (config.metric && Number.isFinite(baselineYear[config.metric])) return baselineYear[config.metric];
  if (key === "no2" || key === "o3") return baselineYear.aqi || fallbackYearlyData[0].aqi;
  return 1;
}

function normalizeConcentration(key, concentration, yearData) {
  if (Number.isFinite(concentration)) {
    const maxByKey = { pm10: 160, so2: 30 }[key] || 230;
    return THREE.MathUtils.clamp(concentration / maxByKey, 0.18, 1);
  }
  return THREE.MathUtils.clamp((yearData.aqi || 70) / 140, 0.18, 0.7);
}

function getVisualPollutionStrength(key, config, concentration, yearData) {
  const baseline = getBaselineConcentration(key, config);
  const current = Number.isFinite(concentration) ? concentration : yearData.aqi;
  if (!(baseline > 0) || !Number.isFinite(current)) return 0.28;
  const ratio = THREE.MathUtils.clamp(current / baseline, 0, 1.18);
  const compressed = THREE.MathUtils.clamp((ratio - 0.18) / 0.86, 0, 1);
  return Math.pow(compressed, 1.9);
}

function selectParticleAt(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const intersections = raycaster.intersectObjects(particleGroup.children, false);
  const hit = intersections.find((item) => item.object.userData.particle);
  const particle = hit ? hit.object.userData.particle : findNearestScreenParticle(event, rect, 84);
  if (!particle) return;
  state.selectedParticle = particle;
  renderParticleDetail(state.selectedParticle);
  requestAnimationFrame(resize);
}

function updateHoveredParticle(event) {
  const rect = canvas.getBoundingClientRect();
  const particle = findNearestScreenParticle(event, rect, 48);
  state.hoveredParticle = particle;
  canvas.style.cursor = particle ? "pointer" : (state.pointerDown ? "grabbing" : "grab");
}

function findNearestScreenParticle(event, rect, baseTolerance = 34) {
  const clickX = event.clientX - rect.left;
  const clickY = event.clientY - rect.top;
  const projected = new THREE.Vector3();
  let nearest = null;
  let nearestDistance = Infinity;

  particleData.forEach((particle) => {
    projected.copy(particle.mesh.position).project(camera);
    if (projected.z < -1 || projected.z > 1) return;
    const screenX = (projected.x * 0.5 + 0.5) * rect.width;
    const screenY = (-projected.y * 0.5 + 0.5) * rect.height;
    const distance = Math.hypot(screenX - clickX, screenY - clickY);
    const tolerance = Math.max(baseTolerance, particle.radius * 190);
    if (distance < tolerance && distance < nearestDistance) {
      nearest = particle;
      nearestDistance = distance;
    }
  });

  return nearest;
}

function renderParticleDetail(particle) {
  if (!particle) {
    particleDetail.innerHTML = `
      <span class="control-label">选中颗粒</span>
      <div class="particle-detail-empty">点击场景中的任意小球查看污染物种类和名称。</div>
    `;
    return;
  }

  const color = `#${pollutantConfig[particle.key].color.toString(16).padStart(6, "0")}`;
  particleDetail.innerHTML = `
    <span class="control-label">选中颗粒</span>
    <div class="particle-detail-main">
      <span class="swatch" style="color: ${color}; background: ${color}"></span>
      <div>
        <strong>${particle.label}</strong>
      </div>
    </div>
    <dl class="particle-detail-meta">
      <div><dt>污染物种类</dt><dd>${particle.label}</dd></div>
      <div><dt>主要来源</dt><dd>${particle.source}</dd></div>
    </dl>
  `;
}

function clearGroup(group) {
  while (group.children.length) {
    const child = group.children.pop();
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      if (Array.isArray(child.material)) {
        child.material.forEach((material) => material.dispose());
      } else {
        child.material.dispose();
      }
    }
  }
}

function animate(time = 0) {
  requestAnimationFrame(animate);
  const delta = state.lastFrameTime ? Math.min(0.08, (time - state.lastFrameTime) / 1000) : 0;
  state.lastFrameTime = time;
  if (state.autoRotate) state.visualTime += delta;
  const t = state.visualTime;

  updateYearPlayback(time);
  landmarkGroup.rotation.y = Math.sin(t * 0.22) * 0.08;
  updateParticles(t);
  updateCamera(t);
  renderer.render(scene, camera);
}

function updateYearPlayback(time) {
  if (!state.isPlaying || yearlyData.length <= 1) return;
  if (!playbackLastTime) playbackLastTime = time;
  const elapsedSeconds = Math.min(0.08, (time - playbackLastTime) / 1000);
  playbackLastTime = time;
  state.frameIndex += elapsedSeconds * 1.15;
  if (state.frameIndex >= yearlyData.length) state.frameIndex = 0;
  const nextIndex = Math.floor(state.frameIndex);
  if (nextIndex !== state.yearIndex) {
    state.yearIndex = nextIndex;
    applyYearFrame({ broadcast: false });
  }
}

function updateParticles(t) {
  particleData.forEach((item) => {
    const theta = item.angle + t * item.speed;
    const pulse = Math.sin(t * 1.7 + item.drift) * 0.18;
    item.mesh.position.set(
      Math.cos(theta) * (item.orbit + pulse),
      item.height + Math.sin(t * 1.2 + item.drift) * 0.18,
      Math.sin(theta) * (item.orbit + pulse)
    );
    item.mesh.scale.setScalar(1 + Math.sin(t * 2.4 + item.drift) * 0.12);
    if (item === state.hoveredParticle || item === state.selectedParticle) {
      item.mesh.scale.multiplyScalar(item === state.selectedParticle ? 1.9 : 1.65);
    }
  });
  if (state.selectedParticle) {
    selectionRing.visible = true;
    selectionRing.position.copy(state.selectedParticle.mesh.position);
    selectionRing.scale.setScalar(Math.max(0.7, state.selectedParticle.radius * 8.2));
    selectionRing.quaternion.copy(camera.quaternion);
  }
  if (state.hoveredParticle && state.hoveredParticle !== state.selectedParticle) {
    hoverRing.visible = true;
    hoverRing.position.copy(state.hoveredParticle.mesh.position);
    hoverRing.scale.setScalar(Math.max(0.55, state.hoveredParticle.radius * 7.4));
    hoverRing.quaternion.copy(camera.quaternion);
  } else {
    hoverRing.visible = false;
  }
}

function updateCamera(t) {
  if (!state.pointerDown && state.autoRotate) state.yaw += 0.0014;
  const x = Math.sin(state.yaw) * Math.cos(state.pitch) * state.distance;
  const y = 1.05 + Math.sin(state.pitch) * state.distance;
  const z = Math.cos(state.yaw) * Math.cos(state.pitch) * state.distance;
  camera.position.set(x, y, z);
  camera.lookAt(0, 1.12 + Math.sin(t * 0.3) * 0.04, 0);
}

function seededRandom(index, salt) {
  const value = Math.sin(index * 78.233 + salt * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}
