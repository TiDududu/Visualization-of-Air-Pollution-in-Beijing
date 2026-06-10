(() => {
  const sankeyNodeWidth = 12;
  const sankeyLayerColors = {
    policy: "#48675a",
    measure: "#b65e34",
    pollutant: "#1f6f8b"
  };
  const pollutantColors = {
    "PM2.5": "#b12f1f",
    PM10: "#d38c32",
    SO2: "#7f6a55",
    NOx: "#4c89c7",
    VOCs: "#8b64b0",
    O3: "#2f9d86"
  };
  const sankeyCategoryLabels = {
    all: "全部类别",
    energy: "能源结构",
    industry: "工业/产业",
    mobile: "移动源",
    dust: "扬尘/面源",
    system: "制度/协同",
    living: "生活源",
    ecology: "生态/碳汇",
    other: "其他"
  };
  const sankeyStageLabels = {
    all: "全部阶段",
    "2011-2015": "2011-2015",
    "2016-2020": "2016-2020",
    "2021-2026": "2021-2026"
  };
  const measureInsightGroups = [
    {
      id: "system",
      summary: "执行监管与制度约束",
      measures: ["开展环境执法检查", "管理排污许可", "控制污染物总量", "实施减量替代审批", "开展网格化监测解析", "重点污染源精准管控", "建立接诉即办响应", "实施重污染预警应急"]
    },
    {
      id: "energy",
      summary: "能源替代与结构优化",
      measures: ["推广可再生能源", "压减燃煤", "散煤清洁替代", "建设燃气热电", "燃煤锅炉清洁能源改造", "淘汰燃煤小锅炉"]
    },
    {
      id: "industrial",
      summary: "工业绿色升级与VOCs控制",
      measures: ["开展清洁生产审核", "低VOCs原辅材料替代", "工业VOCs深度治理", "治理有机废气收集处理", "严格工业环境准入", "退出高污染高耗能企业", "治理水泥窑脱硝", "工业颗粒物密闭除尘治理", "建设生态工业园区", "治理储罐废气", "治理油气回收"]
    },
    {
      id: "mobile",
      summary: "移动源替代与标准升级",
      measures: ["升级机动车排放标准", "推广新能源汽车", "燃油车新能源替代", "完善充电设施建设", "研究超低排放区", "管控非道路移动机械", "实时监控移动源排放", "实施差异化停车收费"]
    },
    {
      id: "dust",
      summary: "扬尘与城市面源治理",
      measures: ["扬尘综合管控", "视频监管施工工地", "推广密闭基坑气膜", "治理餐饮油烟"]
    }
  ];
  const measureRandomPalette = [
    "#c76b47", "#d38c32", "#7b6fd4", "#4c89c7", "#2f9d86", "#5d7f65",
    "#bd5d7a", "#8b64b0", "#a77a33", "#3b8f9c", "#b96a2d", "#6e7fc8",
    "#d06a5f", "#4f8b68", "#9d6cae", "#6c7a86", "#cf8d5a", "#6387a3"
  ];
  const measureEnergyPalette = ["#c85f2d", "#d7792f", "#b84a30", "#cf6a44", "#de8b2f", "#b9621f"];
  const measureCoalPalette = ["#4d3325", "#5a3b28", "#6a452d", "#584031", "#73462a", "#654435"];
  const measureDustPalette = ["#2f8f63", "#419b71", "#2a7d59", "#53a67e", "#4d9364", "#379b74"];

  function boot() {
    if (!window.d3) {
      console.error("policy-measure-charts requires D3.");
      return;
    }
    const data = window.policyMeasureWordcloudData;
    document.querySelectorAll("[data-policy-measure-charts]").forEach((container) => {
      if (!data?.frames?.length) {
        container.textContent = "政策措施数据未加载。";
        return;
      }
      initPolicyMeasureCharts(container, data);
    });
  }

  function initPolicyMeasureCharts(container, rawData) {
    const data = {
      ...rawData,
      frames: [...rawData.frames].sort((a, b) => d3.ascending(a.date, b.date) || d3.ascending(a.policyId, b.policyId))
    };
    const state = {
      data,
      frameIndex: 0,
      mode: "cumulative",
      timer: null,
      detailOpen: false,
      profiles: buildMeasureProfiles(data),
      previousPositions: new Map(),
      sankeyFilters: {
        pollutant: "all",
        category: "all",
        stage: "all",
        topN: 17
      },
      sankeyPinnedNodeId: null
    };

    container.classList.add("policy-measure-charts");
    container.innerHTML = buildMarkup(data, container.dataset.policyMeasurePageTitle || "");

    const refs = getRefs(container);
    refs.note.innerHTML = `
      <div class="policy-measure-stat">
        <strong>${data.frames.length}</strong>
        <span>项政策</span>
      </div>
      <div class="policy-measure-stat">
        <strong>${data.measures.length}</strong>
        <span>项治理措施</span>
      </div>
    `;
    refs.slider.max = Math.max(0, data.frames.length - 1);

    refs.detailToggle.addEventListener("click", () => {
      state.detailOpen = !state.detailOpen;
      updateMeasureDetailVisibility(state, refs);
    });

    refs.modeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        state.mode = button.dataset.measureMode;
        refs.modeButtons.forEach((item) => item.classList.toggle("active", item === button));
        renderMeasureWordcloud(state, refs);
      });
    });

    refs.slider.addEventListener("input", () => {
      stopMeasurePlayback(state, refs);
      state.frameIndex = Number(refs.slider.value);
      renderMeasureWordcloud(state, refs);
    });

    refs.playButton.addEventListener("click", () => {
      if (state.timer) {
        stopMeasurePlayback(state, refs);
        return;
      }
      refs.playButton.textContent = "暂停";
      state.timer = d3.interval(() => {
        state.frameIndex = (state.frameIndex + 1) % data.frames.length;
        refs.slider.value = state.frameIndex;
        renderMeasureWordcloud(state, refs);
      }, 900);
    });

    refs.sankeyButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const filter = button.dataset.sankeyFilter;
        const value = button.dataset.sankeyValue;
        state.sankeyFilters = {
          ...state.sankeyFilters,
          [filter]: filter === "topN" ? Number(value) : value
        };
        refs.root
          .querySelectorAll(`.policy-sankey-filter[data-sankey-filter="${filter}"]`)
          .forEach((item) => item.classList.toggle("active", item === button));
        renderPolicyMeasureSankey(state, refs);
      });
    });

    renderMeasureWordcloud(state, refs);
    renderPolicyMeasureSankey(state, refs);
  }

  function updateMeasureDetailVisibility(state, refs) {
    refs.detailCard.classList.toggle("is-open", state.detailOpen);
    refs.detailToggle.setAttribute("aria-expanded", String(state.detailOpen));
    refs.detailToggle.textContent = state.detailOpen ? "收起内容" : "具体内容";
    refs.detailContent.hidden = !state.detailOpen;
  }

  function buildMarkup(data, pageTitle) {
    return `
      <div class="policy-measure-header">
        <h1 class="policy-measure-page-title">${escapeHtml(pageTitle || "政策措施分析")}</h1>
        <div class="policy-measure-note" aria-label="政策与治理措施数量"></div>
      </div>
      <div class="policy-measure-workspace">
        <article class="policy-measure-card measure-wordcloud-panel">
          <div class="policy-measure-card-heading">
            <div>
              <h3>治理措施动态词云</h3>
            </div>
          </div>
          <div class="measure-wordcloud-body">
            <div class="measure-wordcloud"></div>
            <aside class="measure-detail-card">
              <button class="measure-detail-toggle" type="button" aria-expanded="false">具体内容</button>
              <div class="measure-detail-content" hidden>
                <span class="measure-detail-kicker"></span>
                <h4></h4>
                <p class="measure-insight-summary"></p>
                <div class="measure-top-header">
                  <span aria-hidden="true"></span>
                  <span>频度</span>
                </div>
                <div class="measure-top-list"></div>
              </div>
            </aside>
          </div>
          <div class="measure-controls">
            <button class="measure-play-button" type="button">播放</button>
            <div class="measure-mode-toggle" aria-label="选择词云叠加方式">
              <button class="measure-mode-button active" type="button" data-measure-mode="cumulative">累积</button>
              <button class="measure-mode-button" type="button" data-measure-mode="current">单项</button>
            </div>
            <strong class="measure-current-policy"></strong>
            <input class="measure-slider" type="range" min="0" value="0" step="1" aria-label="选择政策">
          </div>
        </article>
        <article class="policy-measure-card policy-sankey-panel">
          <div class="policy-measure-card-heading">
            <div>
              <h3>政策-措施-污染物流向桑基图</h3>
            </div>
          </div>
          <div class="policy-sankey"></div>
          <div class="policy-sankey-controls" aria-label="桑基图筛选条件">
            ${buildSankeyButtonGroup("污染物", "pollutant", ["all", "PM2.5", "PM10", "SO2", "NOx", "VOCs", "O3"], "all")}
            ${buildSankeyButtonGroup("类别", "category", ["all", "energy", "industry", "mobile", "dust", "system"], "all")}
            ${buildSankeyButtonGroup("阶段", "stage", ["all", "2011-2015", "2016-2020", "2021-2026"], "all")}
            ${buildSankeyButtonGroup("措施数", "topN", ["10", "17", "24"], "17")}
          </div>
        </article>
      </div>
    `;
  }

  function buildSankeyButtonGroup(label, filter, values, activeValue) {
    const labels = {
      all: "全部",
      energy: "能源",
      industry: "工业",
      mobile: "移动源",
      dust: "扬尘",
      system: "制度"
    };
    return `
      <div class="policy-sankey-control-group">
        <span>${label}</span>
        ${values.map((value) => `
          <button
            class="policy-sankey-filter ${value === activeValue ? "active" : ""}"
            type="button"
            data-sankey-filter="${filter}"
            data-sankey-value="${value}"
          >${labels[value] || (filter === "topN" ? `Top ${value}` : value)}</button>
        `).join("")}
      </div>
    `;
  }

  function getRefs(root) {
    return {
      root,
      note: root.querySelector(".policy-measure-note"),
      playButton: root.querySelector(".measure-play-button"),
      slider: root.querySelector(".measure-slider"),
      modeButtons: Array.from(root.querySelectorAll(".measure-mode-button")),
      currentPolicy: root.querySelector(".measure-current-policy"),
      wordcloud: root.querySelector(".measure-wordcloud"),
      detailCard: root.querySelector(".measure-detail-card"),
      detailToggle: root.querySelector(".measure-detail-toggle"),
      detailContent: root.querySelector(".measure-detail-content"),
      detailKicker: root.querySelector(".measure-detail-kicker"),
      detailTitle: root.querySelector(".measure-detail-card h4"),
      insightSummary: root.querySelector(".measure-insight-summary"),
      topList: root.querySelector(".measure-top-list"),
      sankey: root.querySelector(".policy-sankey"),
      sankeyButtons: Array.from(root.querySelectorAll(".policy-sankey-filter"))
    };
  }

  function renderMeasureWordcloud(state, refs) {
    const { data } = state;
    const frame = data.frames[state.frameIndex];
    const words = state.mode === "current" ? frame.currentWords : frame.cumulativeWords;
    const currentMeasureRows = [...frame.currentWords]
      .sort((a, b) => d3.descending(a.currentFrequency, b.currentFrequency) || d3.ascending(a.text, b.text))
      .slice(0, 8);
    const currentPriorityMeasures = new Set(frame.topMeasures.slice(0, 3).map((d) => d.measure));
    const styledWords = words.map((word) => decorateMeasureWord(word, currentPriorityMeasures, state.profiles));
    const insightSummary = buildMeasureInsightSummary(frame, getFrameInsights(frame));
    const maxFrequency = state.mode === "current"
      ? data.meta.maxCurrentFrequency
      : data.meta.maxCumulativeFrequency;
    const widthValue = 640;
    const heightValue = 680;
    const centerX = widthValue / 2;
    const centerY = heightValue / 2 + 8;
    const xRadius = widthValue * 0.27;
    const yRadius = heightValue * 0.44;
    const size = d3.scaleSqrt()
      .domain([0, Math.max(1, maxFrequency)])
      .range([4, 34]);
    const positionedWords = computeMeasureWordLayout(styledWords, widthValue, heightValue, centerX, centerY, xRadius, yRadius, size);

    refs.currentPolicy.textContent = frame.title;
    refs.detailKicker.textContent = frame.date;
    refs.detailTitle.textContent = frame.title;
    refs.insightSummary.textContent = insightSummary;
    updateMeasureDetailVisibility(state, refs);
    refs.topList.innerHTML = currentMeasureRows.length
      ? currentMeasureRows.map((row) => {
        const status = measureStatusClass(row.text, currentPriorityMeasures, state.profiles);
        return `
          <div class="measure-top-row ${status}">
            <div class="measure-top-label">
              <strong style="color:${getFixedMeasureColor(row.text)}">${escapeHtml(row.text)}</strong>
              <span class="measure-top-badge ${status}">${measureStatusLabel(status)}</span>
            </div>
            <div class="measure-top-value">${formatMeasureFrequency(row.currentFrequency)}</div>
          </div>
        `;
      }).join("")
      : '<div class="measure-top-empty">该政策当前未提取到措施。</div>';

    const svg = d3.select(refs.wordcloud)
      .selectAll("svg")
      .data([null])
      .join("svg")
      .attr("viewBox", `0 0 ${widthValue} ${heightValue}`)
      .attr("role", "img")
      .attr("aria-label", "政策治理措施动态词云");

    svg.selectAll(".measure-cloud-guide")
      .data([0.34, 0.68, 1])
      .join("ellipse")
      .attr("class", "measure-cloud-guide")
      .attr("cx", centerX)
      .attr("cy", centerY)
      .attr("rx", (d) => xRadius * d)
      .attr("ry", (d) => yRadius * d);

    svg.selectAll(".measure-cloud-empty")
      .data(positionedWords.length ? [] : [frame])
      .join("text")
      .attr("class", "measure-cloud-empty")
      .attr("x", centerX)
      .attr("y", centerY)
      .attr("text-anchor", "middle")
      .text("当前政策未提取到措施");

    const wordSelection = svg.selectAll(".measure-cloud-word")
      .data(positionedWords, (d) => d.text);

    wordSelection.exit()
      .transition()
      .duration(260)
      .style("opacity", 0)
      .remove();

    wordSelection.enter()
      .append("text")
      .attr("class", "measure-cloud-word")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("x", (d) => state.previousPositions.get(d.text)?.x ?? d.anchorX)
      .attr("y", (d) => state.previousPositions.get(d.text)?.y ?? d.anchorY)
      .style("fill", (d) => d.displayColor)
      .style("font-size", "1px")
      .style("opacity", 0)
      .text((d) => d.text)
      .on("mousemove", (event, d) => showTooltip(
        event,
        d.text,
        `${state.mode === "current" ? "当前政策频度" : "衰减累积频度"}: ${formatMeasureFrequency(d.value)}<br>当前政策频度: ${formatMeasureFrequency(d.currentFrequency || 0)}<br>类别: ${escapeHtml(d.category)}<br>污染物: ${escapeHtml(d.pollutants)}<br>${escapeHtml(d.rationale)}`
      ))
      .on("mouseleave", hideTooltip)
      .merge(wordSelection)
      .attr("class", (d) => `measure-cloud-word ${d.status}`)
      .transition()
      .duration(520)
      .attr("x", (d) => d.renderX)
      .attr("y", (d) => d.renderY)
      .style("fill", (d) => d.displayColor)
      .style("font-size", (d) => `${measureWordFontSize(d, size)}px`)
      .style("opacity", (d) => Math.min(1, (d.status === "priority" ? 0.72 : 0.34) + d.value / Math.max(1, maxFrequency)));

    state.previousPositions = new Map(positionedWords.map((word) => [word.text, { x: word.renderX, y: word.renderY }]));
  }

  function renderPolicyMeasureSankey(state, refs) {
    const layoutFilters = { ...state.sankeyFilters, stage: "all" };
    const layoutRows = buildPolicyMeasureRows(state.data, layoutFilters);
    const layoutMeasures = new Set(layoutRows.map((row) => row.measure));
    const rows = buildPolicyMeasureRows(state.data, state.sankeyFilters, { selectedMeasures: layoutMeasures });
    if (!rows.length) {
      refs.sankey.innerHTML = '<div class="measure-top-empty">暂无可用于绘制桑基图的政策措施数据。</div>';
      return;
    }
    const layoutGraph = buildPolicyMeasureSankeyGraph(layoutRows);
    const graph = buildPolicyMeasureSankeyGraph(rows);
    drawPolicyMeasureSankey(graph, layoutGraph, state, refs);
  }

  function buildPolicyMeasureRows(data, filters, options = {}) {
    const rawRows = data.frames.flatMap((frame) => frame.currentWords.map((word) => {
      const pollutants = parsePollutants(word.pollutants);
      const category = word.category || "其他";
      return {
        policyId: frame.policyId,
        policyTitle: frame.title,
        policyDate: frame.date,
        policyYear: frame.year,
        measure: word.text,
        category,
        categoryKey: measureCategoryKey(category),
        pollutants,
        frequency: Number(word.currentFrequency ?? word.frequency ?? word.value ?? 0),
        rationale: word.rationale || ""
      };
    })).filter((row) => row.frequency > 0 && row.pollutants.length);

    const filteredRows = rawRows
      .filter((row) => filters.category === "all" || row.categoryKey === filters.category)
      .filter((row) => filters.stage === "all" || isPolicyInSankeyStage(row.policyYear, filters.stage))
      .filter((row) => filters.pollutant === "all" || row.pollutants.includes(filters.pollutant))
      .map((row) => ({
        ...row,
        pollutants: filters.pollutant === "all" ? row.pollutants : [filters.pollutant]
      }));

    const selectedMeasures = options.selectedMeasures || selectPolicyMeasureSet(filteredRows, filters.topN);
    return filteredRows.filter((row) => selectedMeasures.has(row.measure));
  }

  function selectPolicyMeasureSet(rows, topN) {
    const totalsByMeasure = d3.rollup(rows, (values) => d3.sum(values, (d) => d.frequency), (d) => d.measure);
    const rankedMeasures = Array.from(totalsByMeasure, ([measure, total]) => ({ measure, total }))
      .sort((a, b) => d3.descending(a.total, b.total) || d3.ascending(a.measure, b.measure));
    const selectedMeasures = new Set();
    const byPolicy = d3.group(rows, (d) => d.policyId);
    byPolicy.forEach((policyRows) => {
      const rankedRows = [...policyRows]
        .sort((a, b) => d3.descending(a.frequency, b.frequency) || d3.ascending(a.measure, b.measure));
      if (rankedRows[0]) {
        selectedMeasures.add(rankedRows[0].measure);
      }
    });

    const topLimit = Math.max(Number(topN) || 17, selectedMeasures.size);
    rankedMeasures.forEach(({ measure }) => {
      if (selectedMeasures.size < topLimit) {
        selectedMeasures.add(measure);
      }
    });
    return selectedMeasures;
  }

  function buildPolicyMeasureSankeyGraph(rows) {
    const nodes = [];
    const nodeById = new Map();
    const policyRows = Array.from(d3.group(rows, (d) => d.policyId), ([policyId, values]) => {
      const first = values[0];
      return {
        id: `policy:${policyId}`,
        name: first.policyTitle,
        label: shortPolicyLabel(first),
        layer: "policy",
        order: first.policyDate,
        color: sankeyLayerColors.policy,
        meta: first.policyDate,
        filterKey: String(policyId)
      };
    }).sort((a, b) => d3.ascending(a.order, b.order));
    const measureRows = Array.from(d3.group(rows, (d) => d.measure), ([measure, values]) => {
      const total = d3.sum(values, (d) => d.frequency);
      const category = mostFrequent(values.map((d) => d.category));
      const categoryKey = measureCategoryKey(category);
      return {
        id: `measure:${measure}`,
        name: measure,
        label: measure,
        layer: "measure",
        order: -total,
        color: measureCategoryColor(category),
        meta: category,
        categoryKey,
        filterKey: categoryKey
      };
    }).sort((a, b) => d3.ascending(a.order, b.order) || d3.ascending(a.name, b.name));
    const pollutantOrder = ["PM2.5", "PM10", "SO2", "NOx", "VOCs", "O3"];
    const pollutantRows = Array.from(new Set(rows.flatMap((row) => row.pollutants)))
      .map((pollutant) => ({
        id: `pollutant:${pollutant}`,
        name: pollutant,
        label: pollutant,
        layer: "pollutant",
        order: pollutantOrder.indexOf(pollutant) === -1 ? pollutantOrder.length : pollutantOrder.indexOf(pollutant),
        color: pollutantColors[pollutant] || sankeyLayerColors.pollutant,
        meta: "",
        filterKey: pollutant
      }))
      .sort((a, b) => d3.ascending(a.order, b.order) || d3.ascending(a.name, b.name));

    [...policyRows, ...measureRows, ...pollutantRows].forEach((node) => {
      nodes.push({ ...node, sourceLinks: [], targetLinks: [] });
      nodeById.set(node.id, nodes[nodes.length - 1]);
    });

    const linkById = new Map();
    function addLink(sourceId, targetId, value, color, meta, categoryKey) {
      const key = `${sourceId}->${targetId}`;
      if (!linkById.has(key)) {
        linkById.set(key, { sourceId, targetId, value: 0, color, meta, categoryKey });
      }
      linkById.get(key).value += value;
    }

    rows.forEach((row) => {
      const policyId = `policy:${row.policyId}`;
      const measureId = `measure:${row.measure}`;
      const color = measureCategoryColor(row.category);
      addLink(policyId, measureId, row.frequency, color, `${row.category}|${row.rationale}`, row.categoryKey);
      const pollutantValue = row.frequency / row.pollutants.length;
      row.pollutants.forEach((pollutant) => {
        addLink(measureId, `pollutant:${pollutant}`, pollutantValue, color, row.category, row.categoryKey);
      });
    });

    const links = Array.from(linkById.values())
      .map((link) => ({
        ...link,
        source: nodeById.get(link.sourceId),
        target: nodeById.get(link.targetId)
      }))
      .filter((link) => link.source && link.target && link.value > 0);

    links.forEach((link) => {
      link.source.sourceLinks.push(link);
      link.target.targetLinks.push(link);
    });
    nodes.forEach((node) => {
      node.value = Math.max(
        d3.sum(node.sourceLinks, (d) => d.value),
        d3.sum(node.targetLinks, (d) => d.value)
      );
    });
    return { nodes, links };
  }

  function computeSankeyLayout(graph, layers, layerX, layerGap, innerHeight, options = {}) {
    const nodesByLayer = new Map(layers.map((layer) => [
      layer,
      graph.nodes
        .filter((node) => node.layer === layer)
        .sort((a, b) => d3.ascending(a.order, b.order) || d3.ascending(a.name, b.name))
    ]));
    const scaleCandidates = layers.map((layer) => {
      const nodes = nodesByLayer.get(layer);
      const gapTotal = Math.max(0, nodes.length - 1) * layerGap[layer];
      const total = d3.sum(nodes, (d) => d.value) || 1;
      return (innerHeight - gapTotal) / total;
    });
    const nodeScale = options.nodeScale ?? Math.max(0.32, Math.min(3.8, Math.min(...scaleCandidates)));
    graph.links.forEach((link) => {
      link.width = link.value * nodeScale;
    });
    graph.nodes.forEach((node) => {
      node.visualHeight = Math.max(
        6,
        d3.sum(node.sourceLinks, (d) => d.width),
        d3.sum(node.targetLinks, (d) => d.width)
      );
    });

    layers.forEach((layer) => {
      const nodes = nodesByLayer.get(layer);
      const gap = layerGap[layer];
      if (options.nodeSlots) {
        nodes.forEach((node) => {
          const slot = options.nodeSlots.get(node.id);
          node.x = layerX.get(layer);
          node.height = node.visualHeight;
          if (slot) {
            node.y = Math.max(0, Math.min(innerHeight - node.height, slot.y));
          } else {
            node.y = 0;
          }
          node.sourceLinks.sort((a, b) => d3.ascending(a.target.y, b.target.y) || d3.descending(a.value, b.value));
          node.targetLinks.sort((a, b) => d3.ascending(a.source.y, b.source.y) || d3.descending(a.value, b.value));
        });
        return;
      }

      const usedHeight = d3.sum(nodes, (d) => d.visualHeight) + Math.max(0, nodes.length - 1) * gap;
      let y = Math.max(0, (innerHeight - usedHeight) / 2);
      nodes.forEach((node) => {
        node.x = layerX.get(layer);
        node.y = y;
        node.height = node.visualHeight;
        y += node.height + gap;
        node.sourceLinks.sort((a, b) => d3.ascending(a.target.y, b.target.y) || d3.descending(a.value, b.value));
        node.targetLinks.sort((a, b) => d3.ascending(a.source.y, b.source.y) || d3.descending(a.value, b.value));
      });
    });

    graph.nodes.forEach((node) => {
      const sourceWidth = d3.sum(node.sourceLinks, (d) => d.width);
      const targetWidth = d3.sum(node.targetLinks, (d) => d.width);
      node.sourceOffset = Math.max(0, (node.height - sourceWidth) / 2);
      node.targetOffset = Math.max(0, (node.height - targetWidth) / 2);
    });

    graph.links.forEach((link) => {
      link.y0 = link.source.y + link.source.sourceOffset + link.width / 2;
      link.source.sourceOffset += link.width;
      link.y1 = link.target.y + link.target.targetOffset + link.width / 2;
      link.target.targetOffset += link.width;
    });

    return { nodeScale, nodesByLayer };
  }

  function drawPolicyMeasureSankey(graph, layoutGraph, state, refs) {
    const widthValue = 920;
    const maxLayerCount = d3.max(["policy", "measure", "pollutant"], (layer) => layoutGraph.nodes.filter((node) => node.layer === layer).length) || 1;
    const heightValue = Math.max(620, 320 + maxLayerCount * 28);
    const margin = { top: 32, right: 76, bottom: 34, left: 138 };
    const innerWidth = widthValue - margin.left - margin.right;
    const innerHeight = heightValue - margin.top - margin.bottom;
    const layers = ["policy", "measure", "pollutant"];
    const layerX = new Map(layers.map((layer, index) => [
      layer,
      index * (innerWidth - sankeyNodeWidth) / (layers.length - 1)
    ]));
    const layerGap = { policy: 8, measure: 7, pollutant: 14 };
    const layoutMeta = computeSankeyLayout(layoutGraph, layers, layerX, layerGap, innerHeight);
    const nodeSlots = new Map(
      layoutGraph.nodes
        .map((node) => [node.id, { y: node.y }])
    );
    computeSankeyLayout(graph, layers, layerX, layerGap, innerHeight, {
      nodeScale: layoutMeta.nodeScale,
      nodeSlots
    });

    refs.sankey.innerHTML = "";
    const svg = d3.select(refs.sankey)
      .append("svg")
      .attr("viewBox", `0 0 ${widthValue} ${heightValue}`)
      .attr("role", "img")
      .attr("aria-label", "政策-措施-污染物桑基图");
    const clipId = `policy-sankey-link-clip-${Math.random().toString(36).slice(2)}`;
    state.sankeyPinnedNodeId = null;
    svg.on("click", () => clearSankeyFocus(state, refs, true));
    svg.append("defs")
      .append("clipPath")
      .attr("id", clipId)
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", innerWidth + sankeyNodeWidth)
      .attr("height", innerHeight);
    const plot = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    plot.append("g")
      .attr("class", "sankey-layer-labels")
      .selectAll("text")
      .data([
        { label: "政策", x: 0, anchor: "start" },
        { label: "治理措施", x: layerX.get("measure") + sankeyNodeWidth / 2, anchor: "middle" },
        { label: "污染物", x: layerX.get("pollutant") + sankeyNodeWidth, anchor: "end" }
      ])
      .join("text")
      .attr("x", (d) => d.x)
      .attr("y", -8)
      .attr("text-anchor", (d) => d.anchor)
      .text((d) => d.label);

    const linkSelection = plot.append("g")
      .attr("class", "sankey-links")
      .attr("clip-path", `url(#${clipId})`)
      .selectAll("path")
      .data([...graph.links].sort((a, b) => d3.descending(a.width, b.width)))
      .join("path")
      .attr("class", "sankey-link")
      .attr("d", sankeyLinkPath)
      .attr("stroke", (d) => d.color)
      .attr("stroke-width", (d) => d.width)
      .on("mousemove", (event, d) => showTooltip(event, `${d.source.label} -> ${d.target.label}`, `频度: ${formatSankeyFrequency(d.value)}<br>${escapeHtml(truncateText(d.meta || "", 90))}`))
      .on("mouseenter", (event, d) => setSankeyLinkFocus(refs, d))
      .on("click", (event, d) => {
        event.stopPropagation();
        setSankeyLinkFocus(refs, d, true);
      })
      .on("mouseleave", () => {
        hideTooltip();
        clearSankeyFocus(state, refs, false);
      });

    const nodeGroups = plot.append("g")
      .attr("class", "sankey-nodes")
      .selectAll("g")
      .data(graph.nodes)
      .join("g")
      .attr("class", (d) => `sankey-node sankey-node-${d.layer}`)
      .attr("transform", (d) => `translate(${d.x},${d.y})`)
      .on("mousemove", (event, d) => {
        setSankeyNodeFocus(refs, d.id);
        showTooltip(event, d.name, sankeyNodeTooltipBody(d));
      })
      .on("click", (event, d) => {
        event.stopPropagation();
        const shouldClear = state.sankeyPinnedNodeId === d.id;
        clearSankeyFocus(state, refs, true);
        if (!shouldClear) {
          state.sankeyPinnedNodeId = d.id;
          setSankeyNodeFocus(refs, d.id, true);
        }
      })
      .on("mouseleave", () => {
        hideTooltip();
        clearSankeyFocus(state, refs, false);
      });

    nodeGroups.append("rect")
      .attr("class", "sankey-node-hit")
      .attr("x", (d) => {
        if (d.layer === "policy") return -126;
        return 0;
      })
      .attr("y", (d) => -Math.max(0, (28 - d.height) / 2))
      .attr("width", (d) => d.layer === "policy" || d.layer === "pollutant" ? 120 : 190)
      .attr("height", (d) => Math.max(28, d.height))
      .attr("fill", "transparent");

    nodeGroups.append("rect")
      .attr("class", "sankey-node-bar")
      .attr("width", sankeyNodeWidth)
      .attr("height", (d) => d.height)
      .attr("rx", 3)
      .attr("fill", (d) => d.color);

    nodeGroups.append("text")
      .attr("class", "sankey-node-label")
      .attr("x", (d) => d.layer === "policy" ? -8 : sankeyNodeWidth + 8)
      .attr("y", (d) => Math.max(8, d.height / 2))
      .attr("dy", "0.32em")
      .attr("text-anchor", (d) => d.layer === "policy" ? "end" : "start")
      .text((d) => sankeyVisibleLabel(d));

    linkSelection.append("title")
      .text((d) => `${d.source.label} -> ${d.target.label}: ${formatSankeyFrequency(d.value)}`);
  }

  function buildMeasureProfiles(data) {
    const profiles = new Map();
    data.frames.forEach((frame) => {
      frame.currentWords.forEach((word) => {
        const current = profiles.get(word.text) || {
          appearances: 0,
          olderScore: 0,
          recentScore: 0,
          firstYear: frame.year,
          lastYear: frame.year
        };
        const value = Number(word.currentFrequency || word.value || 0);
        current.appearances += 1;
        if (frame.year >= 2021) {
          current.recentScore += value;
        } else {
          current.olderScore += value;
        }
        current.firstYear = Math.min(current.firstYear, frame.year);
        current.lastYear = Math.max(current.lastYear, frame.year);
        profiles.set(word.text, current);
      });
    });
    const persistentThreshold = Math.max(4, Math.ceil(data.frames.length * 0.45));
    profiles.forEach((profile) => {
      profile.persistent = profile.appearances >= persistentThreshold && profile.olderScore > 0 && profile.recentScore > 0;
      profile.emerging = false;
    });
    [...profiles.entries()]
      .filter(([, profile]) => !profile.persistent && profile.recentScore >= 4)
      .sort((a, b) => d3.descending(a[1].recentScore, b[1].recentScore))
      .slice(0, 10)
      .forEach(([measure]) => {
        profiles.get(measure).emerging = true;
      });
    return profiles;
  }

  function computeMeasureWordLayout(words, widthValue, heightValue, centerX, centerY, xRadius, yRadius, sizeScale) {
    if (!words.length) return [];
    const padding = 4;
    const bounds = { left: 18, right: widthValue - 18, top: 18, bottom: heightValue - 18 };
    const state = words.map((word, index) => {
      const fontSize = measureWordFontSize(word, sizeScale);
      const width = charUnits(word.text) * fontSize * 0.96 + 34;
      const height = fontSize * 1.55 + 16;
      const anchorX = centerX + word.x * xRadius;
      const anchorY = centerY + word.y * yRadius;
      return { ...word, index, width, height, fontSize, x: anchorX, y: anchorY, anchorX, anchorY };
    });

    for (let iteration = 0; iteration < 180; iteration += 1) {
      let moved = false;
      const boxes = state.map((item) => ({
        ...item,
        left: item.x - item.width / 2 - padding,
        right: item.x + item.width / 2 + padding,
        top: item.y - item.height / 2 - padding,
        bottom: item.y + item.height / 2 + padding
      }));

      for (let i = 0; i < boxes.length; i += 1) {
        for (let j = i + 1; j < boxes.length; j += 1) {
          const a = boxes[i];
          const b = boxes[j];
          const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
          const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
          if (overlapX <= 0 || overlapY <= 0) continue;
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          if (Math.abs(dx) + Math.abs(dy) < 0.01) {
            const angle = (a.index + b.index + 1) * Math.PI * (3 - Math.sqrt(5));
            dx = Math.cos(angle);
            dy = Math.sin(angle);
          }
          const length = Math.hypot(dx, dy) || 1;
          dx /= length;
          dy /= length;
          const push = Math.min(18, Math.max(overlapX, overlapY) / 2 + 1.5);
          const aWeight = Math.max(1, a.value);
          const bWeight = Math.max(1, b.value);
          state[a.index].x -= dx * push * (bWeight / (aWeight + bWeight));
          state[a.index].y -= dy * push * (bWeight / (aWeight + bWeight));
          state[b.index].x += dx * push * (aWeight / (aWeight + bWeight));
          state[b.index].y += dy * push * (aWeight / (aWeight + bWeight));
          moved = true;
        }
      }

      state.forEach((item) => {
        const pull = Math.min(0.02, 0.006 / Math.max(1, item.value));
        item.x += (item.anchorX - item.x) * pull;
        item.y += (item.anchorY - item.y) * pull;
        item.x = Math.max(bounds.left + item.width / 2, Math.min(bounds.right - item.width / 2, item.x));
        item.y = Math.max(bounds.top + item.height / 2, Math.min(bounds.bottom - item.height / 2, item.y));
      });
      if (!moved) break;
    }
    return state.map((item) => ({ ...item, renderX: item.x, renderY: item.y }));
  }

  function charUnits(label) {
    let units = 0;
    for (const char of label) {
      units += char.charCodeAt(0) > 127 ? 1 : 0.58;
    }
    return units;
  }

  function getFrameInsights(frame) {
    const scores = new Map();
    frame.currentWords.forEach((word) => {
      const group = measureInsightGroups.find((item) => item.measures.includes(word.text));
      if (group) {
        scores.set(group.id, (scores.get(group.id) || 0) + Number(word.currentFrequency || word.value || 0));
      }
    });
    return measureInsightGroups
      .map((group) => ({ ...group, score: Number((scores.get(group.id) || 0).toFixed(2)) }))
      .filter((group) => group.score > 0)
      .sort((a, b) => d3.descending(a.score, b.score))
      .slice(0, 3);
  }

  function buildMeasureInsightSummary(frame, insightGroups) {
    if (!frame.currentWords.length || !insightGroups.length) {
      return "当前政策没有形成足够稳定的措施信号。";
    }
    if (insightGroups.length === 1) {
      return `主要强调${insightGroups[0].summary}。`;
    }
    if (insightGroups.length === 2) {
      return `同时把${insightGroups[0].summary}和${insightGroups[1].summary}推到前台。`;
    }
    return `以${insightGroups[0].summary}为主轴，并同时强化${insightGroups[1].summary}和${insightGroups[2].summary}。`;
  }

  function getFixedMeasureColor(measure) {
    const group = measureInsightGroups.find((item) => item.measures.includes(measure));
    if (["压减燃煤", "散煤清洁替代", "建设燃气热电", "燃煤锅炉清洁能源改造", "淘汰燃煤小锅炉"].includes(measure)) {
      return pickMeasureShade(measureCoalPalette, measure);
    }
    if (["扬尘综合管控", "视频监管施工工地", "推广密闭基坑气膜"].includes(measure)) {
      return pickMeasureShade(measureDustPalette, measure);
    }
    if (group?.id === "energy") {
      return pickMeasureShade(measureEnergyPalette, measure);
    }
    return pickMeasureShade(measureRandomPalette, measure);
  }

  function decorateMeasureWord(word, currentPriorityMeasures, profiles) {
    const status = measureStatusClass(word.text, currentPriorityMeasures, profiles);
    return { ...word, displayColor: getFixedMeasureColor(word.text), status };
  }

  function measureStatusClass(measure, currentPriorityMeasures, profiles) {
    if (currentPriorityMeasures.has(measure)) return "priority";
    const profile = profiles.get(measure);
    if (profile?.persistent) return "persistent";
    if (profile?.emerging) return "emerging";
    return "support";
  }

  function measureStatusLabel(status) {
    if (status === "priority") return "当前高频";
    if (status === "persistent") return "长期稳定";
    if (status === "emerging") return "近年强化";
    return "协同配套";
  }

  function measureWordFontSize(word, scale) {
    const emphasis = word.status === "priority" ? 1.14 : word.status === "persistent" ? 1.06 : 1;
    const rawSize = scale(word.value) * emphasis;
    const lengthCap = Math.max(5, 190 / Math.max(4, word.text.length));
    return Math.min(rawSize, lengthCap);
  }

  function hashMeasureText(text) {
    let hash = 0;
    for (let index = 0; index < text.length; index += 1) {
      hash = ((hash << 5) - hash + text.charCodeAt(index)) >>> 0;
    }
    return hash;
  }

  function pickMeasureShade(palette, key) {
    return palette[hashMeasureText(key) % palette.length];
  }

  function sankeyLinkPath(d) {
    const x0 = d.source.x + sankeyNodeWidth;
    const x1 = d.target.x;
    const xi = d3.interpolateNumber(x0, x1);
    return `M${x0},${d.y0}C${xi(0.48)},${d.y0} ${xi(0.52)},${d.y1} ${x1},${d.y1}`;
  }

  function setSankeyNodeFocus(refs, nodeId, pinned = false) {
    const relatedNodes = new Set([nodeId]);
    d3.select(refs.sankey).selectAll(".sankey-link")
      .classed("is-highlighted", (d) => {
        const related = d.source.id === nodeId || d.target.id === nodeId;
        if (related) {
          relatedNodes.add(d.source.id);
          relatedNodes.add(d.target.id);
        }
        return related;
      })
      .classed("is-faded", (d) => d.source.id !== nodeId && d.target.id !== nodeId);
    d3.select(refs.sankey).selectAll(".sankey-node")
      .classed("is-highlighted", (d) => relatedNodes.has(d.id))
      .classed("is-faded", (d) => !relatedNodes.has(d.id))
      .classed("is-pinned", (d) => pinned && d.id === nodeId);
  }

  function setSankeyLinkFocus(refs, link, pinned = false) {
    const relatedNodes = new Set([link.source.id, link.target.id]);
    d3.select(refs.sankey).selectAll(".sankey-link")
      .classed("is-highlighted", (d) => d.source.id === link.source.id && d.target.id === link.target.id)
      .classed("is-faded", (d) => d.source.id !== link.source.id || d.target.id !== link.target.id);
    d3.select(refs.sankey).selectAll(".sankey-node")
      .classed("is-highlighted", (d) => relatedNodes.has(d.id))
      .classed("is-faded", (d) => !relatedNodes.has(d.id))
      .classed("is-pinned", (d) => pinned && relatedNodes.has(d.id));
  }

  function clearSankeyFocus(state, refs, force) {
    if (!force && state.sankeyPinnedNodeId) {
      setSankeyNodeFocus(refs, state.sankeyPinnedNodeId, true);
      return;
    }
    if (force) {
      state.sankeyPinnedNodeId = null;
    }
    d3.select(refs.sankey).selectAll(".sankey-link")
      .classed("is-highlighted", false)
      .classed("is-faded", false);
    d3.select(refs.sankey).selectAll(".sankey-node")
      .classed("is-highlighted", false)
      .classed("is-faded", false)
      .classed("is-pinned", false);
  }

  function parsePollutants(value) {
    return String(value || "")
      .split(/[、,，/;；\s]+/)
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => item.toUpperCase() === "O3" ? "O3" : item)
      .filter((item, index, array) => array.indexOf(item) === index);
  }

  function measureCategoryColor(category) {
    const key = measureCategoryKey(category);
    if (key === "energy") return "#9a5b2f";
    if (key === "mobile") return "#4c89c7";
    if (key === "industry") return "#8b64b0";
    if (key === "dust") return "#2f9d86";
    if (key === "system") return "#6f7f47";
    if (key === "living") return "#bd5d7a";
    if (key === "ecology") return "#5d8b62";
    return sankeyLayerColors.measure;
  }

  function measureCategoryKey(category) {
    const key = String(category || "");
    if (key.includes("能源")) return "energy";
    if (key.includes("移动")) return "mobile";
    if (key.includes("工业") || key.includes("产业") || key.includes("VOCs") || key.includes("燃烧")) return "industry";
    if (key.includes("扬尘") || key.includes("面源")) return "dust";
    if (key.includes("制度") || key.includes("协同")) return "system";
    if (key.includes("生活")) return "living";
    if (key.includes("生态")) return "ecology";
    return "other";
  }

  function isPolicyInSankeyStage(year, stage) {
    if (stage === "2011-2015") return year >= 2011 && year <= 2015;
    if (stage === "2016-2020") return year >= 2016 && year <= 2020;
    if (stage === "2021-2026") return year >= 2021 && year <= 2026;
    return true;
  }

  function sankeyFilterSummaryText(filters) {
    const pollutant = filters.pollutant === "all" ? "全部污染物" : filters.pollutant;
    const category = sankeyCategoryLabels[filters.category] || sankeyCategoryLabels.all;
    const stage = sankeyStageLabels[filters.stage] || sankeyStageLabels.all;
    return `${pollutant}|${category}|${stage}|Top ${filters.topN}`;
  }

  function sankeyVisibleLabel(node) {
    if (node.layer === "policy") return truncateText(node.label, 16);
    if (node.layer === "measure") return truncateText(node.label, 12);
    return node.label;
  }

  function shortPolicyLabel(row) {
    const title = String(row.policyTitle || "");
    const policyShortNames = [
      ["清洁空气行动计划（2011-2015", "清洁空气行动"],
      ["清洁空气行动计划(2011-2015", "清洁空气行动"],
      ["压减燃煤", "压减燃煤方案"],
      ["2012—2020年大气污染治理措施", "2012-2020治理措施"],
      ["工业大气污染治理行动计划", "工业治理行动"],
      ["2013-2017", "2013-2017清洁空气"],
      ["京津冀", "京津冀联防联控"],
      ["打赢蓝天保卫战", "蓝天保卫战"],
      ["十四五", "十四五生态规划"],
      ["2022 年行动计划", "2022攻坚行动"],
      ["2023 年行动计划", "2023攻坚行动"],
      ["2024 年行动计划", "2024美丽北京"],
      ["2025 年行动计划", "2025美丽北京"],
      ["2026年行动计划", "2026美丽北京"]
    ];
    const shortName = policyShortNames.find(([needle]) => title.includes(needle))?.[1] || title
      .replace(/^北京市?/, "")
      .replace(/[《》]/g, "")
      .replace(/（/g, "(")
      .replace(/）/g, ")");
    return `${row.policyYear} ${shortName}`;
  }

  function mostFrequent(values) {
    return Array.from(d3.rollup(values, (group) => group.length, (d) => d), ([value, count]) => ({ value, count }))
      .sort((a, b) => d3.descending(a.count, b.count) || d3.ascending(a.value, b.value))[0]?.value ?? "其他";
  }

  function stopMeasurePlayback(state, refs) {
    if (state.timer) {
      state.timer.stop();
      state.timer = null;
    }
    refs.playButton.textContent = "播放";
  }

  function showTooltip(event, title, body) {
    const tooltip = getTooltip();
    tooltip
      .style("opacity", 1)
      .style("left", `${event.clientX}px`)
      .style("top", `${event.clientY}px`)
      .html(`<strong>${escapeHtml(title)}</strong>${body}`);
  }

  function sankeyNodeTooltipBody(node) {
    const rows = [];
    if (node.meta) {
      rows.push(escapeHtml(node.meta));
    }
    rows.push(`总频度: ${formatSankeyFrequency(node.value)}`);
    return rows.join("<br>");
  }

  function hideTooltip() {
    getTooltip().style("opacity", 0);
  }

  function getTooltip() {
    return d3.select("body")
      .selectAll(".policy-measure-tooltip")
      .data([null])
      .join("div")
      .attr("class", "policy-measure-tooltip");
  }

  function formatMeasureFrequency(value) {
    return Number.isInteger(value) ? String(value) : d3.format(".2f")(value);
  }

  function formatSankeyFrequency(value) {
    const numericValue = Number(value) || 0;
    return Math.abs(numericValue - Math.round(numericValue)) < 1e-9
      ? String(Math.round(numericValue))
      : d3.format(".2f")(numericValue).replace(/0+$/, "").replace(/\.$/, "");
  }

  function truncateText(value, maxLength) {
    const text = String(value || "");
    return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
