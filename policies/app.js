const EXCEL_FILE = "空气污染治理政策汇总.xlsx";
const COVER_DIR = "政策封面";
const PROMPT_TEXT = "点击政策名称或图片可查看具体信息";

const statusEl = document.querySelector("#status");
const panelEl = document.querySelector("#policyPanel");
const timelineSvg = d3.select("#timelineSvg");
const cloudSvg = d3.select("#cloudSvg");

const palette = [
  "#2f7d5c",
  "#227c8a",
  "#bf8438",
  "#9c5f8c",
  "#586f9f",
  "#a65b44",
  "#4c8b48",
  "#7666a6"
];

let policies = [];
let pollutantStats = [];
let selectedPolicyId = null;
let hasShownPrompt = false;

init();
window.addEventListener("resize", debounce(() => {
  if (!policies.length) return;
  renderCloud(pollutantStats, false);
  if (selectedPolicyId !== null) {
    const selected = policies.find((item) => item.id === selectedPolicyId);
    updateCloudHighlight(selected);
  }
}, 180));

async function init() {
  try {
    const rows = await loadWorkbook();
    policies = normalizePolicies(rows);

    if (!policies.length) {
      throw new Error("Excel 中没有可渲染的政策记录。");
    }

    pollutantStats = buildPollutantStats(policies);
    renderTimeline(policies);
    renderCloud(pollutantStats, true);
    runOpeningAnimation();
    setStatus(`已读取 ${policies.length} 条政策，${pollutantStats.length} 类污染物。`);
  } catch (error) {
    console.error(error);
    setStatus(`读取失败：${error.message}`, true);
    panelEl.innerHTML = `<div class="panel-placeholder error"><p>${escapeHtml(error.message)}</p></div>`;
  }
}

async function loadWorkbook() {
  const response = await fetch(encodeURI(EXCEL_FILE));
  if (!response.ok) {
    throw new Error(`无法读取 ${EXCEL_FILE}，请用 Live Server 打开页面。`);
  }

  const buffer = await response.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, {
    defval: "",
    raw: false
  });
}

function normalizePolicies(rows) {
  return rows
    .map((row, index) => {
      const name = cleanText(row["政策名称"]);
      if (!name) return null;

      const pollutants = splitPollutants(row["涉及污染物"]);
      const normalizedPollutants = Array.from(new Set(pollutants.map(normalizePollutant)));

      return {
        id: index,
        name,
        date: cleanText(row["发布时间"]),
        year: Number.parseInt(row["发布年份"], 10),
        agency: cleanText(row["发布机构"]),
        measures: cleanText(row["主要措施"]),
        link: cleanText(row["政策链接"]),
        pollutants,
        normalizedPollutants,
        cover: coverPath(name)
      };
    })
    .filter((item) => item && Number.isFinite(item.year))
    .sort((a, b) => d3.ascending(a.year, b.year) || d3.ascending(a.date, b.date) || d3.ascending(a.name, b.name));
}

function splitPollutants(value) {
  return cleanText(value)
    .split("、")
    .map((item) => cleanText(item))
    .filter(Boolean);
}

function normalizePollutant(value) {
  const text = cleanText(value)
    .replace(/\s+/g, "")
    .replace(/₂/g, "2")
    .replace(/₅/g, "5")
    .replace(/ₓ/gi, "x")
    .replace(/．/g, ".");

  const upper = text.toUpperCase();
  if (upper === "SO2") return "SO2";
  if (upper === "NOX" || text.includes("氮氧化物")) return "氮氧化物";
  if (upper === "PM2.5" || upper === "PM25") return "PM2.5";
  if (upper === "PM10") return "PM10";
  if (/^VOCS?$/.test(upper) || text.includes("挥发性有机")) return "挥发性有机化合物";
  return text;
}

function buildPollutantStats(items) {
  const counts = d3.rollup(
    items.flatMap((item) => item.normalizedPollutants),
    (group) => group.length,
    (name) => name
  );

  return Array.from(counts, ([name, count], index) => ({
    name,
    count,
    color: palette[index % palette.length]
  })).sort((a, b) => d3.descending(a.count, b.count) || d3.ascending(a.name, b.name));
}

function renderTimeline(items) {
  const years = d3.range(d3.min(items, (d) => d.year), d3.max(items, (d) => d.year) + 1);
  const groupByYear = d3.group(items, (d) => d.year);

  const margin = { top: 28, right: 90, bottom: 38, left: 90 };
  const nodeWidth = 116;
  const nodeGap = 18;
  const minYearSlot = 176;
  const slotPadding = 72;
  const yearSlots = new Map(years.map((year) => {
    const count = groupByYear.get(year)?.length || 1;
    const policiesWidth = count * nodeWidth + Math.max(0, count - 1) * nodeGap;
    return [year, Math.max(minYearSlot, policiesWidth + slotPadding)];
  }));
  const yearCenters = new Map();
  let cursor = margin.left;
  years.forEach((year) => {
    const slot = yearSlots.get(year);
    yearCenters.set(year, cursor + slot / 2);
    cursor += slot;
  });
  const width = Math.ceil(Math.max(1180, cursor + margin.right));
  const height = 330;
  const axisY = 245;

  timelineSvg.attr("viewBox", `0 0 ${width} ${height}`).style("width", `${width}px`);
  timelineSvg.selectAll("*").remove();
  const x = (year) => yearCenters.get(year);

  timelineSvg.append("line")
    .attr("class", "axis-line")
    .attr("x1", x(years[0]))
    .attr("x2", x(years[years.length - 1]))
    .attr("y1", axisY)
    .attr("y2", axisY);

  const yearGroup = timelineSvg.append("g").selectAll("g")
    .data(years)
    .join("g")
    .attr("transform", (d) => `translate(${x(d)},0)`);

  yearGroup.append("line")
    .attr("class", "year-tick")
    .attr("y1", axisY - 8)
    .attr("y2", axisY + 8);

  yearGroup.append("text")
    .attr("class", "year-label")
    .attr("y", axisY + 31)
    .attr("text-anchor", "middle")
    .text((d) => d);

  const positioned = [];
  groupByYear.forEach((group, year) => {
    const sorted = [...group].sort((a, b) => d3.ascending(a.date, b.date) || d3.ascending(a.name, b.name));
    const totalWidth = sorted.length * nodeWidth + (sorted.length - 1) * nodeGap;
    sorted.forEach((policy, index) => {
      positioned.push({
        ...policy,
        x: x(year) - totalWidth / 2 + index * (nodeWidth + nodeGap),
        y: 22
      });
    });
  });

  const nodes = timelineSvg.append("g")
    .selectAll("g")
    .data(positioned, (d) => d.id)
    .join("g")
    .attr("class", "policy-node")
    .attr("tabindex", 0)
    .attr("role", "button")
    .attr("aria-label", (d) => d.name)
    .attr("transform", (d) => `translate(${d.x},${d.y})`)
    .on("click", (_, d) => selectPolicy(d))
    .on("keydown", (event, d) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectPolicy(d);
      }
    });

  nodes.append("rect")
    .attr("class", "cover-frame")
    .attr("width", nodeWidth)
    .attr("height", 154);

  nodes.append("image")
    .attr("x", 5)
    .attr("y", 5)
    .attr("width", nodeWidth - 10)
    .attr("height", 144)
    .attr("preserveAspectRatio", "xMidYMid slice")
    .attr("href", (d) => d.cover)
    .on("error", function handleImageError(_, d) {
      d3.select(this).remove();
      const parent = d3.select(this.parentNode);
      parent.append("rect")
        .attr("class", "cover-fallback")
        .attr("x", 5)
        .attr("y", 5)
        .attr("width", nodeWidth - 10)
        .attr("height", 144);
      parent.append("text")
        .attr("class", "policy-name")
        .attr("x", nodeWidth / 2)
        .attr("y", 78)
        .attr("text-anchor", "middle")
        .text("暂无封面");
    });

  nodes.append("text")
    .attr("class", "policy-name")
    .attr("x", nodeWidth / 2)
    .attr("y", 178)
    .attr("text-anchor", "middle")
    .selectAll("tspan")
    .data((d) => wrapText(d.name, 11, 3))
    .join("tspan")
    .attr("x", nodeWidth / 2)
    .attr("dy", (_, i) => i === 0 ? 0 : 17)
    .text((d) => d);

  nodes.append("line")
    .attr("class", "year-tick")
    .attr("x1", nodeWidth / 2)
    .attr("x2", nodeWidth / 2)
    .attr("y1", 219)
    .attr("y2", axisY - 24);
}

function renderCloud(stats, initialHidden) {
  const container = document.querySelector(".pollutant-section");
  const width = Math.max(320, container.clientWidth - 36);
  const height = 360;
  const maxCount = d3.max(stats, (d) => d.count) || 1;
  const radius = d3.scaleSqrt()
    .domain([1, maxCount])
    .range([27, Math.min(58, width / 6, height / 4.8)]);

  const nodes = stats.map((item) => ({
    ...item,
    r: radius(item.count),
    x: width / 2 + (Math.random() - 0.5) * 80,
    y: height / 2 + (Math.random() - 0.5) * 80
  }));

  d3.forceSimulation(nodes)
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("x", d3.forceX(width / 2).strength(0.08))
    .force("y", d3.forceY(height / 2).strength(0.08))
    .force("charge", d3.forceManyBody().strength(4))
    .force("collide", d3.forceCollide((d) => d.r + 2).iterations(5))
    .stop()
    .tick(320);

  fitCloudNodes(nodes, width, height);

  cloudSvg.attr("viewBox", `0 0 ${width} ${height}`);
  cloudSvg.selectAll("*").remove();

  const groups = cloudSvg.selectAll("g")
    .data(nodes, (d) => d.name)
    .join("g")
    .attr("class", "cloud-node")
    .attr("data-name", (d) => d.name)
    .attr("transform", (d) => `translate(${d.x},${d.y})`)
    .style("opacity", initialHidden ? 0 : 1);

  groups.append("circle")
    .attr("r", (d) => d.r)
    .attr("fill", (d) => d.color);

  groups.append("text")
    .attr("class", "cloud-label")
    .attr("y", -2)
    .style("font-size", (d) => `${cloudLabelSize(d)}px`)
    .text((d) => d.name);

  groups.append("text")
    .attr("class", "cloud-count")
    .attr("y", 17)
    .text((d) => `${d.count}次`);
}

function fitCloudNodes(nodes, width, height) {
  if (!nodes.length) return;

  const padding = 14;
  const bounds = nodes.reduce((acc, node) => ({
    minX: Math.min(acc.minX, node.x - node.r),
    maxX: Math.max(acc.maxX, node.x + node.r),
    minY: Math.min(acc.minY, node.y - node.r),
    maxY: Math.max(acc.maxY, node.y + node.r)
  }), {
    minX: Infinity,
    maxX: -Infinity,
    minY: Infinity,
    maxY: -Infinity
  });

  const cloudWidth = Math.max(1, bounds.maxX - bounds.minX);
  const cloudHeight = Math.max(1, bounds.maxY - bounds.minY);
  const scale = Math.min(
    1,
    (width - padding * 2) / cloudWidth,
    (height - padding * 2) / cloudHeight
  );
  const fittedWidth = cloudWidth * scale;
  const fittedHeight = cloudHeight * scale;
  const offsetX = (width - fittedWidth) / 2;
  const offsetY = (height - fittedHeight) / 2;

  nodes.forEach((node) => {
    node.x = offsetX + (node.x - bounds.minX) * scale;
    node.y = offsetY + (node.y - bounds.minY) * scale;
    node.r *= scale;
  });
}

function cloudLabelSize(d) {
  const byRadius = d.r / Math.max(3, d.name.length * 0.55);
  return Math.max(10, Math.min(15, byRadius));
}

function runOpeningAnimation() {
  timelineSvg.selectAll(".policy-node")
    .transition()
    .delay((d, i) => i * 190)
    .duration(420)
    .style("opacity", 1);

  const timelineDuration = policies.length * 190 + 520;

  cloudSvg.selectAll(".cloud-node")
    .transition()
    .delay((d, i) => timelineDuration + i * 240)
    .duration(460)
    .style("opacity", 1);

  window.setTimeout(() => {
    if (!hasShownPrompt) {
      hasShownPrompt = true;
      showPrompt();
    }
  }, timelineDuration + pollutantStats.length * 240 + 520);
}

function selectPolicy(policy) {
  selectedPolicyId = policy.id;
  hasShownPrompt = true;

  timelineSvg.selectAll(".policy-node")
    .classed("is-selected", (d) => d.id === policy.id)
    .transition()
    .duration(180)
    .style("opacity", (d) => d.id === policy.id ? 1 : 0.72);

  updateCloudHighlight(policy);
  renderPolicyDetail(policy);
}

function updateCloudHighlight(policy) {
  const active = new Set(policy.normalizedPollutants);
  cloudSvg.selectAll(".cloud-node")
    .classed("is-dim", (d) => !active.has(d.name))
    .style("opacity", (d) => active.has(d.name) ? 1 : null);
}

function renderPolicyDetail(policy) {
  const link = policy.link
    ? `<a class="policy-link" href="${escapeAttribute(policy.link)}" target="_blank" rel="noopener noreferrer">打开政策链接</a>`
    : `<span class="error">暂无政策链接</span>`;
  const pollutantText = policy.normalizedPollutants.join("、") || "未填写";

  panelEl.innerHTML = `
    <div class="policy-detail">
      <h3>${escapeHtml(policy.name)}</h3>
      <dl class="meta-list">
        ${detailRow("发布时间", policy.date || "未填写")}
        ${detailRow("发布机构", policy.agency || "未填写")}
        ${detailRow("涉及污染物", pollutantText)}
        ${detailRow("主要措施", policy.measures || "未填写")}
        ${detailRow("政策链接", link, true)}
      </dl>
    </div>
  `;
}

function detailRow(label, value, rawHtml = false) {
  return `
    <div class="meta-row">
      <dt>${label}</dt>
      <dd>${rawHtml ? value : escapeHtml(value)}</dd>
    </div>
  `;
}

function showPrompt() {
  if (selectedPolicyId !== null) return;
  panelEl.innerHTML = `<div class="panel-placeholder"><p>${PROMPT_TEXT}</p></div>`;
}

function coverPath(name) {
  return encodeURI(`${COVER_DIR}/${name}_00.png`);
}

function cleanText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function wrapText(text, size, maxLines) {
  const compact = text.replace(/^《|》$/g, "");
  const lines = [];

  for (let i = 0; i < compact.length && lines.length < maxLines; i += size) {
    const isLast = i + size >= compact.length || lines.length === maxLines - 1;
    const chunk = compact.slice(i, i + size);
    lines.push(isLast && i + size < compact.length ? `${chunk}...` : chunk);
  }

  return lines;
}

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", isError);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

function debounce(callback, wait) {
  let timer = null;
  return (...args) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => callback(...args), wait);
  };
}
