const SUMMARY_URL = "../data/policy_evaluation/policy_summary.csv";
const MONTHLY_URL = "../data/policy_evaluation/policy_monthly.csv";
const POLLUTANTS = ["PM2.5", "PM10", "O3", "NO2", "SO2", "CO"];
const THRESHOLD = -5;

const parseMonth = d3.timeParse("%Y-%m");
const formatMonth = d3.timeFormat("%Y-%m");
const formatPercent = d3.format("+.1f");
const formatValue = d3.format(".2f");
const tooltip = d3.select("#tooltip");
const POLICY_LABEL_MAX_WIDTH = 12;
const POLICY_LABEL_FONT_SIZE = 12.5;
const POLICY_LABEL_LINE_HEIGHT = 15;
const POLICY_LABEL_ANGLE = -45;
const SYMLOG_CONSTANT = 10;

let summaryData = [];
let monthlyData = [];
let selectedKey = null;

Promise.all([
  d3.csv(SUMMARY_URL, parseSummary),
  d3.csv(MONTHLY_URL, parseMonthly),
])
  .then(([summary, monthly]) => {
    summaryData = summary.filter((d) => Number.isFinite(d.endChange));
    monthlyData = monthly.filter(
      (d) => d.month && Number.isFinite(d.change)
    );

    if (!summaryData.length || !monthlyData.length) {
      throw new Error("可视化 CSV 中没有可用数据。");
    }

    renderHeatmap();
    const initial = summaryData[0];
    selectCell(initial.policy, initial.pollutant);
    window.addEventListener(
      "resize",
      debounce(() => renderSelectedLine(false), 150)
    );
  })
  .catch(showError);

function parseSummary(d) {
  return {
    policy: d.policy,
    startYear: +d.start_year,
    endYear: +d.end_year,
    pollutant: d.pollutant,
    baselineYear: +d.baseline_year,
    calculationStartYear: +d.calculation_start_year,
    baselineYearMean: +d.baseline_year_mean,
    endChange: +d.end_change_pct,
    effectiveMonth: parseMonth(d.effective_month),
    effectiveChange: d.effective_change_pct === "" ? null : +d.effective_change_pct,
    maxMonth: parseMonth(d.max_reduction_month),
    maxChange: d.max_reduction_pct === "" ? null : +d.max_reduction_pct,
    status: d.status,
  };
}

function parseMonthly(d) {
  return {
    month: parseMonth(d.month),
    policy: d.policy,
    pollutant: d.pollutant,
    influence: +d.influence,
    previousYearInfluence: +d.previous_year_influence,
    change: +d.change_pct,
    reachedThreshold: d.reached_threshold === "是",
    policyEffective: d.policy_effective === "是",
  };
}

function renderHeatmap() {
  const policies = Array.from(new Set(summaryData.map((d) => d.policy)));
  const policyLines = new Map(
    policies.map((policy) => [
      policy,
      wrapPolicyName(localizePolicyName(policy), POLICY_LABEL_MAX_WIDTH),
    ])
  );
  const maxPolicyLines = d3.max(
    Array.from(policyLines.values()),
    (lines) => lines.length
  );
  const maxPolicyLineWidth = d3.max(
    Array.from(policyLines.values()).flat(),
    estimateLabelWidth
  );
  const cellWidth = 108;
  const cellHeight = 52;
  const labelBlockWidth =
    maxPolicyLineWidth * POLICY_LABEL_FONT_SIZE;
  const labelBlockHeight = maxPolicyLines * POLICY_LABEL_LINE_HEIGHT;
  const angleRadians = Math.abs(POLICY_LABEL_ANGLE) * Math.PI / 180;
  const labelHeight =
    labelBlockWidth * Math.sin(angleRadians)
    + labelBlockHeight * Math.cos(angleRadians);
  const margin = {
    top: Math.ceil(labelHeight) + 18,
    right: 22,
    bottom: 28,
    left: 76,
  };
  const width = margin.left + margin.right + policies.length * cellWidth;
  const height = margin.top + margin.bottom + POLLUTANTS.length * cellHeight;

  const host = d3.select("#heatmap");
  host.selectAll("*").remove();
  host.style("width", `${width}px`);

  const svg = host
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height]);

  const x = d3
    .scaleBand()
    .domain(policies)
    .range([margin.left, width - margin.right])
    .padding(0.06);

  const y = d3
    .scaleBand()
    .domain(POLLUTANTS)
    .range([margin.top, height - margin.bottom])
    .padding(0.08);

  const maxAbs = d3.max(summaryData, (d) => Math.abs(d.endChange)) || 1;
  const color = d3
    .scaleLinear()
    .domain([-maxAbs, 0, maxAbs])
    .range(["#15589a", "#f5f1e9", "#b52f31"])
    .clamp(true);

  renderColorLegend(color, maxAbs);

  const xAxis = svg
    .append("g")
    .attr("class", "axis heat-x-axis")
    .attr("transform", `translate(0,${margin.top})`)
    .call(d3.axisTop(x).tickSize(0));

  xAxis.select(".domain").remove();
  xAxis
    .selectAll("text")
    .each(function (policy) {
      const lines = policyLines.get(policy);
      const text = d3
        .select(this)
        .text(null)
        .attr("class", "policy-label")
        .attr("text-anchor", "start")
        .attr("transform", `rotate(${POLICY_LABEL_ANGLE})`)
        .attr("x", 8)
        .attr("y", -8);

      lines.forEach((line, index) => {
        text
          .append("tspan")
          .attr("x", 8)
          .attr(
            "dy",
            index === 0
              ? `${-(lines.length - 1) * POLICY_LABEL_LINE_HEIGHT}px`
              : `${POLICY_LABEL_LINE_HEIGHT}px`
          )
          .text(line);
      });
      text.append("title").text(localizePolicyName(policy));
    });

  const yAxis = svg
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).tickSize(0).tickPadding(13));
  yAxis.select(".domain").remove();
  yAxis.selectAll("text").style("font-weight", 700);

  const cells = svg
    .append("g")
    .selectAll("g")
    .data(summaryData, (d) => cellKey(d.policy, d.pollutant))
    .join("g");

  cells
    .append("rect")
    .attr("class", "heat-cell")
    .attr("x", (d) => x(d.policy))
    .attr("y", (d) => y(d.pollutant))
    .attr("width", x.bandwidth())
    .attr("height", y.bandwidth())
    .attr("rx", 2)
    .attr("fill", (d) => color(d.endChange))
    .on("mouseenter", (event, d) => {
      showTooltip(event, `
        <strong>${escapeHtml(d.policy)}</strong>
        <div>${d.pollutant} · 结束年 ${d.endYear}</div>
        <div class="value">${formatPercent(d.endChange)}%</div>
        <div>点击查看执行期月度变化</div>
      `);
    })
    .on("mousemove", moveTooltip)
    .on("mouseleave", hideTooltip)
    .on("click", (_, d) => selectCell(d.policy, d.pollutant));

  cells
    .append("text")
    .attr("class", "cell-label")
    .attr("x", (d) => x(d.policy) + x.bandwidth() / 2)
    .attr("y", (d) => y(d.pollutant) + y.bandwidth() / 2)
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "central")
    .attr("fill", (d) => Math.abs(d.endChange) > maxAbs * 0.45 ? "#fff" : "#26333e")
    .text((d) => `${formatPercent(d.endChange)}%`);
}

function renderColorLegend(color, maxAbs) {
  const width = 190;
  const canvas = d3
    .select("#color-legend")
    .html("")
    .append("canvas")
    .attr("width", width)
    .attr("height", 11)
    .style("width", `${width}px`)
    .style("height", "11px");
  const context = canvas.node().getContext("2d");

  d3.range(width).forEach((pixel) => {
    const value = -maxAbs + (pixel / (width - 1)) * maxAbs * 2;
    context.fillStyle = color(value);
    context.fillRect(pixel, 0, 1, 11);
  });
}

function selectCell(policy, pollutant) {
  selectedKey = cellKey(policy, pollutant);
  d3.selectAll(".heat-cell").classed(
    "selected",
    (d) => cellKey(d.policy, d.pollutant) === selectedKey
  );
  renderSelectedLine(true);
}

function localizePolicyName(policy) {
  return window.pageLanguage?.get() === "en"
    ? window.pageLanguage.translate(policy)
    : policy;
}

window.addEventListener("page-language-change", () => {
  if (!summaryData.length) return;
  const selected = summaryData.find(
    (d) => cellKey(d.policy, d.pollutant) === selectedKey
  ) || summaryData[0];
  renderHeatmap();
  selectCell(selected.policy, selected.pollutant);
});

function renderSelectedLine(animate = false) {
  if (!selectedKey) return;

  const summary = summaryData.find(
    (d) => cellKey(d.policy, d.pollutant) === selectedKey
  );
  if (!summary) return;

  const series = monthlyData
    .filter(
      (d) => d.policy === summary.policy && d.pollutant === summary.pollutant
    )
    .sort((a, b) => d3.ascending(a.month, b.month));

  renderDetailHeader(summary);
  renderLineChart(series, summary, animate);
}

function renderDetailHeader(summary) {
  d3.select("#detail-title").text(`${summary.pollutant} · ${summary.policy}`);
  d3.select("#detail-subtitle").text(
    `${summary.startYear}—${summary.endYear} 年政策执行期`
  );

  const effective = summary.effectiveMonth
    ? formatMonth(summary.effectiveMonth)
    : "未达到";
  const maximum = summary.maxMonth
    ? `${formatMonth(summary.maxMonth)} / ${formatPercent(summary.maxChange)}%`
    : "无数据";

  d3.select("#selection-stats").html(`
    <div class="stat"><span>结束年变化</span><strong>${formatPercent(summary.endChange)}%</strong></div>
    <div class="stat"><span>连续两月达标生效月份</span><strong>${effective}</strong></div>
    <div class="stat"><span>最大降幅</span><strong>${maximum}</strong></div>
  `);
}

function renderLineChart(data, summary, animate = false) {
  const host = d3.select("#line-chart");
  host.selectAll("*").remove();

  if (!data.length) {
    host.append("p").text("当前政策与污染物没有逐月数据。");
    return;
  }

  const width = Math.max(host.node().clientWidth, 720);
  const height = 450;
  const margin = { top: 38, right: 48, bottom: 82, left: 76 };

  const svg = host
    .append("svg")
    .attr("width", "100%")
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height])
    .attr("preserveAspectRatio", "xMidYMid meet");

  const defs = svg.append("defs");
  const gradient = defs
    .append("linearGradient")
    .attr("id", "area-gradient")
    .attr("x1", "0")
    .attr("x2", "0")
    .attr("y1", "0")
    .attr("y2", "1");
  gradient.append("stop").attr("offset", "0%").attr("stop-color", "#1d5f9e").attr("stop-opacity", 0.24);
  gradient.append("stop").attr("offset", "100%").attr("stop-color", "#1d5f9e").attr("stop-opacity", 0.02);

  const x = d3
    .scaleTime()
    .domain(d3.extent(data, (d) => d.month))
    .range([margin.left, width - margin.right]);

  const values = data.map((d) => d.change).concat([0, THRESHOLD]);
  const yExtent = d3.extent(values);
  const symlogTransform = (value) =>
    Math.sign(value) * Math.log1p(Math.abs(value) / SYMLOG_CONSTANT);
  const symlogInverse = (value) =>
    Math.sign(value) * SYMLOG_CONSTANT * Math.expm1(Math.abs(value));
  const transformedExtent = yExtent.map(symlogTransform);
  const transformedSpan = transformedExtent[1] - transformedExtent[0];
  const transformedPadding = Math.max(transformedSpan * 0.08, 0.2);
  const yDomain = [
    symlogInverse(transformedExtent[0] - transformedPadding),
    symlogInverse(transformedExtent[1] + transformedPadding),
  ];
  const y = d3
    .scaleSymlog()
    .constant(SYMLOG_CONSTANT)
    .domain(yDomain)
    .nice()
    .range([height - margin.bottom, margin.top]);

  const plotWidth = width - margin.left - margin.right;
  const maxTickCount = Math.max(5, Math.min(16, Math.floor(plotWidth / 82)));
  const tickStep = Math.max(1, Math.ceil(data.length / maxTickCount));
  const tickValues = data
    .filter((_, index) => index % tickStep === 0)
    .map((d) => d.month);
  const lastMonth = data[data.length - 1].month;
  if (+tickValues[tickValues.length - 1] !== +lastMonth) {
    tickValues.push(lastMonth);
  }
  const xAxis = d3
    .axisBottom(x)
    .tickValues(tickValues)
    .tickFormat(d3.timeFormat("%Y-%m"))
    .tickSizeOuter(0);
  const yTickValues = buildSymlogTicks(y.domain());
  const formatAxisPercent = (value) => {
    const absolute = Math.abs(value);
    if (absolute >= 1000) return `${d3.format(".2~s")(value)}%`;
    if (absolute >= 100) return `${d3.format(".0f")(value)}%`;
    return `${d3.format(".1f")(value)}%`;
  };
  const yAxis = d3
    .axisLeft(y)
    .tickValues(yTickValues)
    .tickFormat(formatAxisPercent);

  svg
    .append("g")
    .attr("class", "grid")
    .attr("transform", `translate(${margin.left},0)`)
    .call(
      d3.axisLeft(y)
        .tickValues(yTickValues)
        .tickSize(-(width - margin.left - margin.right))
        .tickFormat("")
    );

  svg
    .append("line")
    .attr("class", "zero-line")
    .attr("x1", margin.left)
    .attr("x2", width - margin.right)
    .attr("y1", y(0))
    .attr("y2", y(0));

  svg
    .append("line")
    .attr("class", "threshold-line")
    .attr("x1", margin.left)
    .attr("x2", width - margin.right)
    .attr("y1", y(THRESHOLD))
    .attr("y2", y(THRESHOLD));

  const thresholdLabel = svg
    .append("text")
    .attr("class", "threshold-label")
    .attr("x", width - margin.right)
    .attr("y", y(THRESHOLD) - 7)
    .attr("text-anchor", "end")
    .attr("fill", "#b83a37")
    .attr("font-size", 14)
    .attr("font-weight", 700)
    .text("月度阈值 −5%（连续两月生效）");

  const area = d3
    .area()
    .x((d) => x(d.month))
    .y0(y(0))
    .y1((d) => y(d.change))
    .curve(d3.curveMonotoneX);

  const line = d3
    .line()
    .x((d) => x(d.month))
    .y((d) => y(d.change))
    .curve(d3.curveMonotoneX);

  const areaPath = svg
    .append("path")
    .datum(data)
    .attr("class", "area-path")
    .attr("d", area);
  const linePath = svg
    .append("path")
    .datum(data)
    .attr("class", "line-path")
    .attr("d", line);

  const xAxisGroup = svg
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(xAxis);
  xAxisGroup
    .selectAll("text")
    .attr("text-anchor", "end")
    .attr("transform", "rotate(-35)")
    .attr("dx", "-0.45em")
    .attr("dy", "0.25em");
  svg
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(${margin.left},0)`)
    .call(yAxis);

  svg
    .append("text")
    .attr("x", -(margin.top + (height - margin.bottom - margin.top) / 2))
    .attr("y", 18)
    .attr("transform", "rotate(-90)")
    .attr("text-anchor", "middle")
    .attr("fill", "#64717d")
    .attr("font-size", 12)
    .text("影响值同比变化百分比（对称对数轴）");

  const curveObstacleBoxes = data.map((point) => ({
    x: x(point.month) - 5,
    y: y(point.change) - 5,
    width: 10,
    height: 10,
  }));
  const occupiedLabelBoxes = [
    ...curveObstacleBoxes,
    paddedBox(thresholdLabel.node().getBBox(), 5),
  ];
  const annotations = [
    {
      month: summary.effectiveMonth,
      className: "effective",
      label: "连续两月达标，政策生效",
    },
    {
      month: summary.maxMonth,
      className: "maximum",
      label: "最大降幅",
    },
  ];
  annotations.forEach((annotation, index) => {
    addAnnotation(
      svg,
      data,
      annotation.month,
      x,
      y,
      annotation.className,
      annotation.label,
      {
        left: margin.left,
        right: width - margin.right,
        top: margin.top,
        bottom: height - margin.bottom,
      },
      occupiedLabelBoxes,
      index
    );
  });

  if (animate) {
    const totalLength = linePath.node().getTotalLength();
    linePath
      .attr("stroke-dasharray", `${totalLength} ${totalLength}`)
      .attr("stroke-dashoffset", totalLength)
      .transition()
      .duration(1050)
      .ease(d3.easeCubicInOut)
      .attr("stroke-dashoffset", 0);

    areaPath
      .attr("opacity", 0)
      .transition()
      .delay(280)
      .duration(820)
      .ease(d3.easeCubicOut)
      .attr("opacity", 1);

    svg
      .selectAll(".annotation-line, .annotation-label, .annotation-point")
      .attr("opacity", 0)
      .transition()
      .delay(900)
      .duration(320)
      .attr("opacity", 1);
  }

  const focus = svg.append("g").style("display", "none");
  const focusLine = focus
    .append("line")
    .attr("stroke", "#65727d")
    .attr("stroke-dasharray", "3 3")
    .attr("y1", margin.top)
    .attr("y2", height - margin.bottom);
  const focusPoint = focus.append("circle").attr("class", "hover-point").attr("r", 5);
  const bisect = d3.bisector((d) => d.month).center;

  svg
    .append("rect")
    .attr("x", margin.left)
    .attr("y", margin.top)
    .attr("width", width - margin.left - margin.right)
    .attr("height", height - margin.top - margin.bottom)
    .attr("fill", "transparent")
    .style("cursor", "crosshair")
    .on("mouseenter", () => focus.style("display", null))
    .on("mouseleave", () => {
      focus.style("display", "none");
      hideTooltip();
    })
    .on("mousemove", (event) => {
      const [pointerX] = d3.pointer(event);
      const index = bisect(data, x.invert(pointerX));
      const point = data[Math.max(0, Math.min(index, data.length - 1))];
      focusLine.attr("x1", x(point.month)).attr("x2", x(point.month));
      focusPoint.attr("cx", x(point.month)).attr("cy", y(point.change));
      showTooltip(event, `
        <strong>${formatMonth(point.month)} · ${summary.pollutant}</strong>
        <div class="value">${formatPercent(point.change)}%</div>
        <div>本月情况：${formatValue(point.influence)}</div>
        <div>上年同月情况：${formatValue(point.previousYearInfluence)}</div>
      `);
    });
}

function addAnnotation(
  svg,
  data,
  month,
  x,
  y,
  className,
  label,
  plotBounds,
  occupiedBoxes,
  annotationIndex
) {
  if (!month) return;
  const point = data.find((d) => +d.month === +month);
  if (!point) return;

  const pointX = x(point.month);
  const pointY = y(point.change);
  const labelText = `${label} ${formatMonth(point.month)} (${formatPercent(point.change)}%)`;
  const estimatedWidth = labelText.length * 13.5;
  const estimatedHeight = 18;
  const verticalDistance = 42 + annotationIndex * 20;
  const horizontalDistance = Math.min(estimatedWidth / 2 + 24, 175);
  const candidates = [
    { x: pointX, y: pointY - verticalDistance, anchor: "middle" },
    { x: pointX, y: pointY + verticalDistance, anchor: "middle" },
    { x: pointX + horizontalDistance, y: pointY - 18, anchor: "middle" },
    { x: pointX - horizontalDistance, y: pointY - 18, anchor: "middle" },
    { x: pointX + horizontalDistance, y: pointY + 28, anchor: "middle" },
    { x: pointX - horizontalDistance, y: pointY + 28, anchor: "middle" },
  ];
  const placement = chooseAnnotationPlacement(
    candidates,
    estimatedWidth,
    estimatedHeight,
    plotBounds,
    occupiedBoxes
  );

  const connector = svg
    .append("line")
    .attr("class", "annotation-line")
    .attr("x1", pointX)
    .attr("x2", placement.x)
    .attr("y1", pointY)
    .attr("y2", placement.y);

  svg
    .append("circle")
    .attr("class", `annotation-point ${className}`)
    .attr("cx", pointX)
    .attr("cy", pointY)
    .attr("r", 6);

  const labelNode = svg
    .append("text")
    .attr("class", "annotation-label")
    .attr("x", placement.x)
    .attr("y", placement.y)
    .attr("text-anchor", placement.anchor)
    .attr("dominant-baseline", "central")
    .text(labelText);

  const actualBox = paddedBox(labelNode.node().getBBox(), 6);
  occupiedBoxes.push(actualBox);

  const connectorEnd = nearestPointOnBox(pointX, pointY, actualBox);
  connector.attr("x2", connectorEnd.x).attr("y2", connectorEnd.y);
}

function chooseAnnotationPlacement(
  candidates,
  width,
  height,
  bounds,
  occupiedBoxes
) {
  const normalized = candidates.map((candidate) => {
    const halfWidth = width / 2;
    const x = Math.max(
      bounds.left + halfWidth,
      Math.min(candidate.x, bounds.right - halfWidth)
    );
    const y = Math.max(
      bounds.top + height / 2,
      Math.min(candidate.y, bounds.bottom - height / 2)
    );
    const box = {
      x: x - halfWidth,
      y: y - height / 2,
      width,
      height,
    };
    const overlap = occupiedBoxes.reduce(
      (total, occupied) => total + overlapArea(box, occupied),
      0
    );
    return { ...candidate, x, y, box, overlap };
  });

  return normalized.find((candidate) => candidate.overlap === 0)
    || normalized.reduce((best, candidate) => (
      candidate.overlap < best.overlap ? candidate : best
    ));
}

function buildSymlogTicks(domain) {
  const maxAbsolute = Math.max(Math.abs(domain[0]), Math.abs(domain[1]));
  const positiveLevels = new Set([5, 10]);
  const maximumExponent = Math.ceil(Math.log10(Math.max(maxAbsolute, 10)));

  for (let exponent = 1; exponent <= maximumExponent; exponent += 1) {
    const power = 10 ** exponent;
    positiveLevels.add(power);
    positiveLevels.add(power / 2);
  }

  if (maxAbsolute < 20) {
    positiveLevels.add(1);
    positiveLevels.add(2);
  }

  const candidates = [0, THRESHOLD];
  positiveLevels.forEach((value) => {
    candidates.push(-value, value);
  });

  return Array.from(new Set(candidates))
    .filter((value) => value >= domain[0] && value <= domain[1])
    .sort(d3.ascending);
}

function overlapArea(a, b) {
  const width = Math.max(
    0,
    Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)
  );
  const height = Math.max(
    0,
    Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y)
  );
  return width * height;
}

function paddedBox(box, padding) {
  return {
    x: box.x - padding,
    y: box.y - padding,
    width: box.width + padding * 2,
    height: box.height + padding * 2,
  };
}

function nearestPointOnBox(x, y, box) {
  return {
    x: Math.max(box.x, Math.min(x, box.x + box.width)),
    y: Math.max(box.y, Math.min(y, box.y + box.height)),
  };
}

function wrapPolicyName(policy, maxWidth) {
  const cleaned = policy
    .replace(/[《》]/g, "")
    .trim()
    .replace(/\s+/g, " ");
  const isChinese = /[\u3400-\u9fff]/u.test(cleaned);
  const separator = isChinese ? "" : " ";
  const tokens = tokenizePolicyName(cleaned, isChinese);
  const totalWidth = estimateTokensWidth(tokens, separator);
  const lineCount = Math.max(
    1,
    Math.min(tokens.length, Math.ceil(totalWidth / maxWidth))
  );
  const lines = [];
  let tokenIndex = 0;

  for (let lineIndex = 0; lineIndex < lineCount; lineIndex += 1) {
    const remainingLines = lineCount - lineIndex;
    const remainingTokens = tokens.slice(tokenIndex);
    const targetWidth =
      estimateTokensWidth(remainingTokens, separator) / remainingLines;
    const lineTokens = [];

    while (tokenIndex < tokens.length) {
      const tokensAfterCurrent = tokens.length - tokenIndex - 1;
      if (tokensAfterCurrent < remainingLines - 1) break;

      const token = tokens[tokenIndex];
      const currentWidth = estimateTokensWidth(lineTokens, separator);
      const nextWidth = estimateTokensWidth(
        [...lineTokens, token],
        separator
      );
      const nextIsCloser =
        lineTokens.length === 0
        || Math.abs(targetWidth - nextWidth)
          <= Math.abs(targetWidth - currentWidth);

      if (!nextIsCloser && lineTokens.length) break;
      lineTokens.push(token);
      tokenIndex += 1;
    }

    lines.push(lineTokens.join(separator));
  }

  return lines.filter(Boolean);
}

function tokenizePolicyName(policy, isChinese) {
  if (!isChinese) return policy.split(/\s+/).filter(Boolean);

  const specialPattern =
    /\d{4}\s*[-—–]\s*\d{4}\s*年?|\d{4}\s*年|[A-Za-z]+(?:\d+(?:\.\d+)?)?/gu;
  const tokens = [];
  let lastIndex = 0;

  for (const match of policy.matchAll(specialPattern)) {
    tokens.push(...segmentChineseText(policy.slice(lastIndex, match.index)));
    tokens.push(match[0].replace(/\s+/g, ""));
    lastIndex = match.index + match[0].length;
  }
  tokens.push(...segmentChineseText(policy.slice(lastIndex)));

  return attachPolicyPunctuation(tokens.filter(Boolean));
}

function segmentChineseText(text) {
  if (!text.trim()) return [];
  if (typeof Intl.Segmenter === "function") {
    const segmenter = new Intl.Segmenter("zh-CN", { granularity: "word" });
    return Array.from(segmenter.segment(text), ({ segment }) => segment)
      .filter((segment) => segment.trim());
  }
  return Array.from(text.replace(/\s+/g, ""));
}

function attachPolicyPunctuation(tokens) {
  const result = [];
  let prefix = "";

  tokens.forEach((token) => {
    if (/^[（(【\[]$/u.test(token)) {
      prefix += token;
    } else if (/^[）)】\]，、：；！？]$/u.test(token) && result.length) {
      result[result.length - 1] += token;
    } else {
      result.push(prefix + token);
      prefix = "";
    }
  });

  if (prefix) {
    if (result.length) result[result.length - 1] += prefix;
    else result.push(prefix);
  }
  return result;
}

function estimateTokensWidth(tokens, separator) {
  return estimateLabelWidth(tokens.join(separator));
}

function estimateLabelWidth(value) {
  return Array.from(value).reduce((width, character) => {
    if (/\s/u.test(character)) return width + 0.35;
    if (/[\x00-\xff]/u.test(character)) return width + 0.58;
    return width + 1;
  }, 0);
}

function cellKey(policy, pollutant) {
  return `${policy}|||${pollutant}`;
}

function showTooltip(event, html) {
  tooltip.html(html).style("opacity", 1);
  moveTooltip(event);
}

function moveTooltip(event) {
  const node = tooltip.node();
  const gap = 15;
  let left = event.clientX + gap;
  let top = event.clientY + gap;
  if (left + node.offsetWidth > window.innerWidth - 10) {
    left = event.clientX - node.offsetWidth - gap;
  }
  if (top + node.offsetHeight > window.innerHeight - 10) {
    top = event.clientY - node.offsetHeight - gap;
  }
  tooltip.style("left", `${left}px`).style("top", `${top}px`);
}

function hideTooltip() {
  tooltip.style("opacity", 0);
}

function showError(error) {
  console.error(error);
  const message = d3.select("#error-message");
  message
    .attr("hidden", null)
    .html(
      `页面数据加载失败：${escapeHtml(error.message)}<br>` +
      "请确认 data 目录中的可视化数据文件存在，并使用 VSCode Live Server 打开 index.html。"
    );
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function debounce(callback, wait) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => callback(...args), wait);
  };
}
