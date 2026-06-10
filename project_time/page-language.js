(() => {
  const page = document.body.dataset.i18nPage;
  if (!page) return;

  const common = {
    "中文": "Chinese",
    "英文": "English",
    "北京": "Beijing",
    "新德里": "New Delhi",
    "拉合尔": "Lahore",
    "达卡": "Dhaka",
    "河内": "Hanoi",
    "石家庄": "Shijiazhuang",
    "邢台": "Xingtai",
    "太原": "Taiyuan",
    "全国均值": "National average",
    "北方燃煤城市": "Northern coal cities",
    "绝对浓度 · µg/m³": "Absolute concentration · µg/m³",
    "指数化 · 2013 = 100": "Indexed · 2013 = 100",
    "指数化": "Indexed",
    "方法说明": "Methodology",
    "数据来源": "Data sources",
    "数据与局限": "Data and limitations",
    "年份": "Year",
    "时间": "Time",
    "浓度": "Concentration",
    "排名": "Rank",
    "播放": "Play",
    "暂停": "Pause",
    "开始播放": "Start",
    "重新播放": "Replay",
    "插值": "Interpolated",
    "年均": "Annual",
    "基线 100": "Baseline 100",
    "政策信息": "Policy information",
    "清华大学 · 数据可视化课程": "Tsinghua University · Data Visualization",
    "北京市环境保护监测中心": "Beijing Municipal Environmental Monitoring Center",
  };

  const policy = {
    "政策效果评估": "Policy Effectiveness Evaluation",
    "北京市政策效果评估": "Beijing Policy Effectiveness Evaluation",
    "北京市空气质量政策影响分析": "Beijing Policy Effectiveness Evaluation",
    "计算口径": "Method",
    "影响值 = 实际值 − 周期值": "Impact = observed value − seasonal component",
    "连续两个月同比下降至少 5%，第二个月认定为政策生效":
      "A policy is considered effective in the second of two consecutive months with a decline of at least 5%.",
    "政策作用结果": "Policy Impact Results",
    "下降": "Decrease",
    "上升": "Increase",
    "政策名称较多，可横向滚动查看全部政策。": "Scroll horizontally to view all policies.",
    "政策生效情况": "Policy Effectiveness Status",
    "政策执行期月度变化": "Monthly Changes During the Policy Period",
    "请在上方热力图中选择一个色块。": "Select a cell in the heatmap above.",
    "月度变化": "Monthly change",
    "月度下降 5% 阈值": "5% monthly decline threshold",
    "连续两月达标后生效": "Effective after two qualifying months",
    "最大降幅": "Largest decline",
    "结束年": "End year",
    "点击查看执行期月度变化": "Click to view monthly changes during implementation",
    "未达到": "Not reached",
    "无数据": "No data",
    "结束年变化": "End-year change",
    "连续两月达标生效月份": "Effective month after two qualifying months",
    "当前政策与污染物没有逐月数据。": "No monthly data are available for this policy and pollutant.",
    "月度阈值 −5%（连续两月生效）": "Monthly threshold −5% (effective after two months)",
    "影响值同比变化百分比（对称对数轴）": "Year-on-year impact change (%) · symmetric log scale",
    "连续两月达标，政策生效": "Policy effective after two qualifying months",
    "本月情况：": "Current month: ",
    "上年同月情况：": "Same month one year earlier: ",
    "页面数据加载失败：": "Page data failed to load: ",
    "年政策执行期": " policy period",
    "可视化 CSV 中没有可用数据。": "No usable data were found in the visualization CSV files.",
    "请确认 data 目录中的可视化数据文件存在，并使用 VSCode Live Server 打开 index.html。":
      "Make sure the visualization data files exist in the data directory and open index.html with VS Code Live Server.",
    "《北京市清洁空气行动计划（2011-2015 年大气污染控制措施）》": "Beijing Clean Air Action Plan (2011-2015)",
    "《加快压减燃煤促进空气质量改善工作方案》": "Coal Reduction and Air Quality Improvement Plan",
    "《北京市2012—2020年大气污染治理措施》": "Beijing Air Pollution Control Measures (2012-2020)",
    "《北京市工业大气污染治理行动计划（2012-2020 年）》": "Beijing Industrial Air Pollution Control Action Plan (2012-2020)",
    "《北京市 2013-2017 年清洁空气行动计划》": "Beijing Clean Air Action Plan (2013-2017)",
    "《京津冀及周边地区落实大气污染防治行动计划实施细则》": "Beijing-Tianjin-Hebei Regional Air Pollution Action Rules",
    "《北京市大气污染防治条例》": "Beijing Air Pollution Prevention and Control Regulation",
    "《北京市打赢蓝天保卫战三年行动计划》": "Beijing Three-Year Blue Sky Action Plan",
    "《北京市 “十四五” 时期生态环境保护规划》": "Beijing 14th Five-Year Ecological and Environmental Plan",
    "《北京市深入打好污染防治攻坚战 2022 年行动计划》": "Beijing Pollution Prevention Action Plan 2022",
    "《北京市深入打好污染防治攻坚战 2023 年行动计划》": "Beijing Pollution Prevention Action Plan 2023",
    "《推进美丽北京建设 持续深入打好污染防治攻坚战 2024 年行动计划》": "Beautiful Beijing and Pollution Prevention Action Plan 2024",
    "《推进美丽北京建设 持续深入打好污染防治攻坚战 2025 年行动计划》": "Beautiful Beijing and Pollution Prevention Action Plan 2025",
    "《美丽北京建设2026年行动计划》": "Beautiful Beijing Action Plan 2026",
  };

  const comparison = {
    "北京空气污染物排名变化 · 2013–2026 · Bar Chart Race": "Beijing Pollutant Ranking Changes · 2013–2026 · Bar Chart Race",
    "北京雾霾": "Beijing Air Pollution",
    "国内与全球空气质量结果对照": "Domestic and Global Air Quality Comparison",
    "四种污染物 12 年的位次与浓度变化。": "Twelve years of ranking and concentration changes across four pollutants.",
    "AQI 按 EPA 断点反算为浓度后聚合年均；2013 起点采用同期文献年均值，动画为相邻年份线性插值。":
      "AQI values are converted to concentrations using EPA breakpoints and aggregated annually. The 2013 baseline uses published annual means, with linear interpolation between years.",
    "剂量-反应模型推算，相比维持 2013 年浓度水平，": "dose-response model, compared with maintaining the 2013 concentration, ",
    "北京居民人均预期寿命延长约 5.9 年": "average life expectancy in Beijing increased by about 5.9 years",
    "空气质量优良天数": "days with good air quality",
    "176 天升至 290 天（+114 天）": "rose from 176 to 290 days (+114)",
    "下文从国内对照与全球对照两个尺度，检验这一降幅在多大程度上是北京独有的治理成效。":
      "The comparisons below assess how much of this decline is attributable specifically to Beijing's policies.",
    "按 ": "According to the ",
    "； 同期年均": "; over the same period, annual ",
    "从": " increased from ",
    "点此回放 2013 → 2025 的 12 年": "Replay 12 years from 2013 to 2025",
    "PM₂.₅ · PM₁₀ · NO₂ · SO₂ 排名变化": "PM₂.₅ · PM₁₀ · NO₂ · SO₂ ranking changes",
    "国内参照：北方燃煤城市 与 全国均值": "Domestic comparison: northern coal cities and the national average",
    "国内参照：北方燃煤城市 与": "Domestic comparison: northern coal cities and",
    "悬浮折线可查看逐月真值": "Hover over a line to view monthly observations",
    "反事实方法": "Counterfactual method",
    "反事实北京（无政策情景）": "Counterfactual Beijing (no-policy scenario)",
    "政策避免的污染量": "Pollution avoided by policy",
    "差分识别": "Difference-in-differences",
    "政策的因果效应估计": "Estimated causal effect of policy",
    "北京 · 处理组": "Beijing · treatment group",
    "新德里 · 对照组": "New Delhi · control group",
    "实测下降": "Observed decline",
    "对照": "Control",
    "本来就会发生": "Expected without policy",
    "净效应": "Net effect",
    "政策的功劳": "Policy contribution",
    "识别策略": "Identification strategy",
    "反事实北京": "Counterfactual Beijing",
    "处理组": "Treatment group",
    "对照组": "Control group",
    "清华大学 · 数据可视化课程": "Tsinghua University · Data Visualization",
    "北京市环境保护监测中心": "Beijing Municipal Environmental Monitoring Center",
    "基线 · Index Baseline": "Baseline · Index Baseline",
    "读图：": "Reading:",
    "用途：": "Purpose:",
    "注意：": "Note:",
    "前提：": "Assumption:",
    "注：": "Note:",
    "数据：": "Data:",
    "年均浓度（µg/m³）": "Annual concentration (µg/m³)",
    "PM₂.₅ 年均浓度": "Annual PM₂.₅ concentration",
    "PM₂.₅ 月均浓度（µg/m³）": "Monthly PM₂.₅ concentration (µg/m³)",
    "PM₂.₅ 年均浓度（µg/m³）": "Annual PM₂.₅ concentration (µg/m³)",
    "指数（2014年均 = 100）": "Index (2014 annual mean = 100)",
    "PM₂.₅ 指数": "PM₂.₅ index",
    "浓度  →  µg/m³": "Concentration → µg/m³",
    "年份  →": "Year →",
    "处理组均值": "Treatment-group mean",
    "反事实": "Counterfactual",
    "政策时间": "Policy period",
    "城市视图": "City view",
    "全国视图": "National view",
    "月度": "Monthly",
    "年度": "Annual",
    "北方三个燃煤邻市": "three neighboring northern coal cities",
    "石家庄、邢台、太原": "Shijiazhuang, Xingtai and Taiyuan",
    "新德里、拉合尔、达卡、河内": "New Delhi, Lahore, Dhaka and Hanoi",
    "各序列以基准年值为 100，仅供降幅轨迹横向比较": "Each series is indexed to 100 in its baseline year for comparing decline trajectories only.",
    "各城市以自身 2013 年值为 100，仅供降幅轨迹横向比较": "Each city is indexed to its own 2013 value for comparing decline trajectories only.",
    "在「指数化」视图下，每条折线均以该城市自身 ": "In indexed view, every line uses that city's own ",
    "年均浓度为基准 （记为 100），其后各年取值即为相对 2013 年的百分比。":
      " annual concentration as its baseline (100); later values are percentages of the 2013 level.",
    "高于 100 表示该年份高于其 2013 年水平；低于 100 则相反。":
      "Values above 100 exceed the city's 2013 level; values below 100 are lower.",
    "消除各城基线绝对量纲差异（北京 89.5 vs 新德里 153 µg/m³ 等）， 使各城":
      "Removes differences in baseline concentration across cities (for example, Beijing 89.5 versus New Delhi 153 µg/m³), allowing ",
    "变化率": "rates of change",
    "可在同一坐标下对比，专用于轨迹趋势对照。":
      " to be compared on one scale for trajectory analysis.",
    "指数化视图仅反映相对变化，不能用于比较绝对污染水平； 绝对浓度请切换至「绝对浓度 · µg/m³」视图。":
      "Indexed view shows relative change only and cannot compare absolute pollution levels. Use absolute concentration view for that purpose.",
    "反事实北京假设：北京自 2013 年起未启动系统性大气治理（如「大气十条」「蓝天保卫战」）， 其 ":
      "Counterfactual Beijing assumes that systematic air-pollution controls, such as the Air Pollution Action Plan and Blue Sky campaign, had not begun in 2013. Its ",
    "沿对照群（": " follows the contemporaneous rate of change of the comparison group (",
    "）的同期变化率演化。": ").",
    "实测北京曲线与反事实曲线之间的纵向差，作为差分识别（DiD）下处理效应的点估计。":
      "The vertical gap between observed and counterfactual Beijing is the point estimate of the treatment effect under difference-in-differences.",
    "对照城市需与北京经历近似的外部冲击（气象、季风、全球能源价格等），即平行趋势假设。":
      "Comparison cities must experience external shocks similar to Beijing, including weather, monsoons and global energy prices: the parallel-trends assumption.",
    "详见图下方「数据与局限」（AQICN ／ CPCB 实测 ／ V5GL05.02 卫星-地面融合格网）。":
      "See Data and limitations below the chart (AQICN, CPCB observations and the V5GL05.02 satellite-ground fused grid).",
    "北京 PM": "Beijing PM",
    "年均浓度与上方 DID 图同源、同口径（含 2013 年），故两图北京曲线一致； 石家庄、邢台、太原年均值由":
      " annual concentration uses the same source and definition as the DiD chart above, including 2013. Shijiazhuang, Xingtai and Taiyuan annual values are aggregated from ",
    "月度实测聚合而得，仅取拥有完整 12 个月的年份（2013 为冬季单月数据，已从对照基准中剔除）； 全国均值取自生态环境部《中国生态环境状况公报》年度数据（2013–2017 为 74 重点城市口径，2018 年起为 338/339 城）。":
      " monthly observations, retaining only years with all 12 months. The national average comes from MEE annual ecology and environment bulletins: 74 key cities in 2013–2017 and 338/339 cities from 2018.",
    "参照群取几乎未实施有效管控的境外发展中亚洲大城市（新德里、拉合尔、达卡、河内，与上方 DID 图同源），其浓度长期高位徘徊； 故反事实北京停在 ~85 µg/m³，远高于实测北京（~29）与全国均值（~28）——两线间红色楔形即避免的污染量。 两个视图共用同一反事实，仅切换并列显示的区域对照（北方燃煤城市／全国均值）。 指数化视图：各序列以基准年（城市视图 2014、全国视图 2013）值为 100，仅供降幅轨迹横向比较。":
      "The reference group comprises developing Asian megacities with little effective control: New Delhi, Lahore, Dhaka and Hanoi. Their concentrations remained high, leaving counterfactual Beijing near 85 µg/m³, far above observed Beijing (~29) and the national average (~28). The red wedge is avoided pollution. Both views share this counterfactual and only change the regional comparison. Indexed view sets each series to 100 in its baseline year for trajectory comparison.",
    "五城 2013 年 PM": "The five cities had substantially different 2013 PM",
    "基线差异显著（北京 89.5、新德里 153、拉合尔 63、达卡 80、河内 45 µg/m³）， 不宜作起点对齐。其间仅北京启动了「大气十条」「蓝天保卫战」等系统性治理。":
      " baselines (Beijing 89.5, New Delhi 153, Lahore 63, Dhaka 80 and Hanoi 45 µg/m³), so aligning starting levels would be inappropriate. Only Beijing introduced systematic controls during this period.",
    "以北京 2013 年浓度为基准、按对照群均值的逐年变化率外推得到； 实测曲线与反事实之间的楔形面积，即差分识别（DiD）下的处理效应点估计。该识别成立的前提是 对照城市与北京经历近似的外部冲击（气象、季风、全球能源价格等），即平行趋势假设。 切换污染物字段可比较 PM":
      " is extrapolated from Beijing's 2013 concentration using annual changes in the comparison-group mean. The wedge between observed and counterfactual paths is the DiD treatment-effect estimate. Identification requires parallel trends. Switching pollutants compares PM",
    "四组结果； 其中 PM": " across four results. For PM",
    "因数据可得性所限，对照组仅保留新德里。":
      ", data availability limits the comparison group to New Delhi.",
    "北京数据来自 AQICN（": "Beijing data come from AQICN (",
    "），由 US-AQI 反算为浓度。 新德里 2015–2019 年取自 CPCB 全市日均（":
      "), converted from US-AQI to concentration. New Delhi data for 2015–2019 use CPCB citywide daily averages (",
    "）， 2020–2025 年取自 CPCB 站点小时均（":
      "); 2020–2025 use CPCB station-level hourly observations (",
    "），2013–2014 年采用文献年均值。 拉合尔、达卡、河内 2013–2023 年取自 V5GL05.02 卫星-地面融合 PM":
      "); 2013–2014 use published annual means. Lahore, Dhaka and Hanoi for 2013–2023 use the V5GL05.02 satellite-ground fused PM",
    "格网 （van Donkelaar 等，圣路易斯华盛顿大学），按城市中心 5×5 网格（约 25 km）取均值； 2024–2025 年沿 2023 平移补足。OpenAQ 拉合尔数据仅覆盖 2024 年 1 月单站观测（13 日）， 存在显著冬季偏倚，未纳入年均估计。三类数据源在绝对量纲上不严格可比，故指数化视图仅供轨迹趋势对比。":
      " grid from van Donkelaar et al., averaged over a 5×5 grid around each city center. Values for 2024–2025 extend the 2023 level. Sparse OpenAQ Lahore observations were excluded because of winter bias. The three source types are not strictly comparable in absolute units, so indexed view is for trajectory comparison only.",
    "对照组取石家庄、邢台（冀南燃煤重工业带）、太原（晋中煤炭重心），月度分辨率。":
      "The comparison group is Shijiazhuang, Xingtai and Taiyuan, shown at monthly resolution.",
    "四市同处华北平原燃煤供暖区，季节性波动高度同步——核心信息是振幅差异，不是相位差。":
      "All four cities are in the coal-heated North China Plain and share highly synchronized seasonality; the key comparison is amplitude, not timing.",
    "北京 PM₂.₅ 年均浓度（生态环境部公报）与全国地级及以上城市年均值对照。":
      "Beijing's annual PM₂.₅ concentration is compared with the national average for prefecture-level and larger cities.",
    "2013–2017 全国均值统计口径为 74 重点城市，2018 年起扩至 338/339 城；网络扩张通常压低统计值。":
      "The national series covers 74 key cities in 2013–2017 and 338/339 cities from 2018; network expansion generally lowers the reported average.",
    "播放 / 暂停": "Play / pause",
    "年份拖动条": "Year scrubber",
    "头条数字": "Headline statistics",
    "点此回放 2013 至 2025 的 12 年": "Replay the 12 years from 2013 to 2025",
  };

  const dictionaries = {
    policy: { ...common, ...policy },
    comparison: { ...common, ...comparison },
  };
  const dictionary = dictionaries[page] || common;
  const entries = Object.entries(dictionary).sort((a, b) => b[0].length - a[0].length);
  const originalDocumentTitle = document.title;
  const originals = new WeakMap();
  const attributeOriginals = new WeakMap();
  let language = new URLSearchParams(location.search).get("lang") === "en" ? "en" : "cn";
  let applying = false;

  function translate(value) {
    let result = value;
    for (const [source, target] of entries) {
      result = result.split(source).join(target);
    }
    return result
      .replace(/(\d{4})\s*年\s*(\d{1,2})\s*月/g, "$1-$2")
      .replace(/(\d{4})\s*年均/g, "$1 annual average")
      .replace(/(\d+)\s*天/g, "$1 days");
  }

  function updateTextNode(node) {
    if (!originals.has(node)) originals.set(node, node.nodeValue);
    const original = originals.get(node);
    const nextValue = language === "en" ? translate(original) : original;
    if (node.nodeValue !== nextValue) node.nodeValue = nextValue;
  }

  function updateAttributes(element) {
    const attributes = ["title", "aria-label", "placeholder"];
    let saved = attributeOriginals.get(element);
    if (!saved) {
      saved = {};
      attributeOriginals.set(element, saved);
    }
    attributes.forEach((name) => {
      if (!element.hasAttribute(name)) return;
      if (!(name in saved)) saved[name] = element.getAttribute(name);
      element.setAttribute(name, language === "en" ? translate(saved[name]) : saved[name]);
    });
  }

  function walk(root) {
    if (root.nodeType === Node.TEXT_NODE) {
      if (!root.parentElement?.closest("script, style")) updateTextNode(root);
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE) return;
    if (root.matches("script, style")) return;
    updateAttributes(root);
    root.childNodes.forEach(walk);
  }

  function applyLanguage() {
    applying = true;
    document.documentElement.lang = language === "en" ? "en" : "zh-CN";
    document.title = language === "en" ? translate(originalDocumentTitle) : originalDocumentTitle;
    walk(document.body);
    applying = false;
  }

  const observer = new MutationObserver((mutations) => {
    if (applying) return;
    applying = true;
    mutations.forEach((mutation) => {
      if (mutation.type === "characterData") {
        const currentValue = mutation.target.nodeValue;
        const knownOriginal = originals.get(mutation.target);
        const knownTranslation = knownOriginal == null ? null : translate(knownOriginal);
        if (currentValue !== knownTranslation) originals.set(mutation.target, currentValue);
        const nextValue = language === "en"
          ? translate(originals.get(mutation.target) ?? currentValue)
          : (originals.get(mutation.target) ?? currentValue);
        if (currentValue !== nextValue) mutation.target.nodeValue = nextValue;
      } else {
        mutation.addedNodes.forEach(walk);
      }
    });
    applying = false;
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  window.pageLanguage = {
    get: () => language,
    translate,
  };
  applyLanguage();
})();
