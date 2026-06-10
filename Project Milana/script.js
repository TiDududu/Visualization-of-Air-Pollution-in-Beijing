// ===============================
// 1. Setup
// ===============================
const parseDate = d3.timeParse("%Y/%m/%d");
const parsePolicyDate = d3.timeParse("%Y-%m");
const policyWorkbookFile = "../data/overview/空气污染治理政策汇总.xlsx";
const pollutants = ["pm25", "pm10", "o3", "no2", "so2", "co"];
const pollutantLabels = {
    pm25: "PM2.5",
    pm10: "PM10",
    o3: "O3",
    no2: "NO2",
    so2: "SO2",
    co: "CO"
};

const pollutantColors = {
    pm25: "#1f77b4",
    pm10: "#ff7f0e",
    o3: "#2ca02c",
    no2: "#d62728",
    so2: "#9467bd",
    co: "#8c564b"
};

const policyColors = {
    regime: "#8ecae6",
    secondary: "#90be6d",
    baseline: "#f2b705",
    legal: "#6c757d",
    future: "#cdb4db"
};

const translations = {
    en: {
        pageTitle: "Beijing Air Quality Overview, 2014-2026",
        title: "Beijing Air Quality Overview, 2014-2026",
        pollutants: "Pollutants:",
        year: "Year:",
        language: "Language:",
        englishButton: "English",
        chineseButton: "中文",
        footerCourse: "Tsinghua University · Data Visualization",
        allPeriod: "All period",
        yAxis: "Daily average AQI (Air Quality Index)",
        mainPolicy: "Main policy",
        secondary: "Secondary",
        legal: "Legal",
        baseline: "Baseline",
        pollutantsTooltip: "Pollutants",
        activePolicies: "Active policies",
        none: "None",
        daily: "daily",
        ma7: "7-day MA",
        ma30: "30-day MA",
        plan: "Plan",
        timelineAria: "Policy timeline",
        chartAria: "Daily air quality index chart",
        legendAria: "Pollutant legend",
        policyInfo: "Policy information",
        policyPrompt: "Click a policy cover or name above the chart to view its details.",
        publishDate: "Published",
        policyPeriod: "Policy period",
        agency: "Agency",
        content: "Main content",
        relatedPollutants: "Pollutants",
        measures: "Measures",
        effect: "Effect / evaluation",
        policyLink: "Policy link",
        openPolicy: "Open policy link",
        viewMode: "View mode",
        fullView: "Global",
        localView: "Local",
        unavailable: "Not available",
        heroImpact: 'Based on the <abbr title="AQLI (Air Quality Life Index, University of Chicago): each 1 µg/m³ of long-term PM2.5 exposure corresponds to roughly 0.098 years of life-expectancy difference">AQLI</abbr> dose-response model, compared with maintaining the 2013 concentration level, <b>Beijing residents gain about 5.9 years of life expectancy on average</b>.<br>Annual good-air days increased from <b>176 to 290 days (+114 days)</b>.'
    },
    cn: {
        pageTitle: "2014-2026年北京市空气质量概览",
        title: "2014-2026年北京市空气质量概览",
        pollutants: "污染物：",
        year: "年份：",
        language: "语言：",
        englishButton: "English",
        chineseButton: "中文",
        footerCourse: "清华大学 · 数据可视化课程",
        allPeriod: "全时段",
        yAxis: "日均空气质量指数（AQI）",
        mainPolicy: "主要政策",
        secondary: "次级政策",
        legal: "法规",
        baseline: "年度措施",
        pollutantsTooltip: "污染物",
        activePolicies: "实施中的政策",
        none: "无",
        daily: "日值",
        ma7: "7日均值",
        ma30: "30日均值",
        plan: "规划",
        timelineAria: "政策时间轴",
        chartAria: "日均空气质量指数图表",
        legendAria: "污染物图例",
        policyInfo: "政策信息",
        policyPrompt: "点击图表上方的政策封面或名称，可查看具体政策信息。",
        publishDate: "发布时间",
        policyPeriod: "政策时间段",
        agency: "发布机构",
        content: "主要内容",
        relatedPollutants: "涉及污染物",
        measures: "主要措施",
        effect: "实施效果或评估",
        policyLink: "政策链接",
        openPolicy: "打开政策链接",
        viewMode: "视图模式切换",
        fullView: "全局",
        localView: "局部",
        unavailable: "暂无",
        heroImpact: '按 <abbr title="AQLI（Air Quality Life Index, Univ. of Chicago）：每 1 µg/m³ PM₂.₅ 长期暴露对应约 0.098 年寿命差">AQLI</abbr> 剂量-反应模型推算，相比维持 2013 年浓度水平，<b>北京居民人均预期寿命延长约 5.9 年</b>。<br>同期年均空气质量优良天数从 <b>176 天升至 290 天（+114 天）</b>。'
    }
};

const requestedLanguage = new URLSearchParams(window.location.search).get("lang");
let currentLanguage = requestedLanguage === "en" ? "en" : "cn";
let selectedPolicy = null;
let allPolicies = [];
let overviewMode = "full";
let currentMode = "All";
let airQualityData = [];
let smoothedData = [];
let renderChartFn = null;

const policyCoverFiles = {
    1: "《北京市第十六阶段控制大气污染措施》_00.png",
    2: "《北京市清洁空气行动计划（2011-2015 年大气污染控制措施）》_00.png",
    3: "《加快压减燃煤促进空气质量改善工作方案》_00.png",
    4: "《北京市2012—2020年大气污染治理措施》_00.png",
    5: "《北京市工业大气污染治理行动计划（2012-2020 年）》_00.png",
    6: "《北京市 2013-2017 年清洁空气行动计划》_00.png",
    7: "《京津冀及周边地区落实大气污染防治行动计划实施细则》_00.png",
    8: "《北京市大气污染防治条例》_00.png",
    9: "《北京市打赢蓝天保卫战三年行动计划》_00.png",
    10: "《北京市 “十四五” 时期生态环境保护规划》_00.png",
    11: "《北京市深入打好污染防治攻坚战 2022 年行动计划》_00.png",
    12: "《北京市深入打好污染防治攻坚战 2023 年行动计划》_00.png",
    13: "《推进美丽北京建设 持续深入打好污染防治攻坚战 2024 年行动计划》_00.png",
    14: "《推进美丽北京建设 持续深入打好污染防治攻坚战 2025 年行动计划》_00.png",
    15: "《美丽北京建设2026年行动计划》_00.png",
    16: "《2026 年北京市扬尘专项治理春季攻坚行动方案》_00.png"
};

const policyEnglishDetails = {
    1: {
        agency: "Beijing Municipal Government",
        content: "Stage-based measures for controlling air pollution in Beijing.",
        measures: "Strengthen pollution-source controls and implement phased air-quality improvement measures.",
        pollutants: "PM2.5, PM10, SO2, nitrogen oxides, and other major air pollutants",
        effect: "Implementation information is available in the official policy document."
    },
    2: {
        agency: "Beijing Municipal Government",
        content: "Listed PM2.5 as a priority pollutant, targeted an approximately 15% reduction from the 2010 level by 2015, and established regional coordination across Beijing, Tianjin and Hebei.",
        measures: "1. Build four gas-fired heat and power centers and phase out coal in the six central districts.\n2. Apply China V vehicle-emission standards from 2012.\n3. Close 1,200 highly polluting enterprises.\n4. Establish dust-control zones.\n5. Raise urban green coverage to 48% by 2015.",
        pollutants: "PM2.5, PM10, SO2, nitrogen oxides, VOCs, and dust",
        effect: "By 2015, PM2.5 had fallen 15.8% from the 2010 level, and the 12th Five-Year Plan emission-reduction target was completed two years early."
    },
    3: {
        agency: "Beijing Municipal Government",
        content: "Converted 1,600 steam tons of urban coal-fired boilers, promoted coal-free centralized heating inside the Fourth Ring Road, converted 44,000 homes from coal to electricity, and cut annual coal use by 1.4 million tons.",
        measures: "1. Build four gas-fired heat and power centers and close four coal-fired power plants.\n2. Convert 181 boiler rooms in the six central districts to clean energy.\n3. Replace household coal with electricity and clean heating.\n4. Strictly control coal growth in outer districts.\n5. Expand renewable and new energy.",
        pollutants: "PM2.5, PM10, and SO2",
        effect: "Citywide coal consumption fell to 21.796 million tons in 2012, while SO2 concentration declined 26.9% from 2010."
    },
    4: {
        agency: "Beijing Municipal Government",
        content: "Set air-pollution control targets for 2020, centered on PM2.5 and eight major emission-reduction programs.",
        measures: "1. Reduce coal use to about 10 million tons by 2020.\n2. Retire 900,000 older vehicles below China II standards.\n3. Control industrial VOC emissions.\n4. Strengthen construction and road-dust controls.\n5. Establish coordinated regional prevention and control.",
        pollutants: "PM2.5, PM10, SO2, nitrogen oxides, VOCs, and ozone",
        effect: "See the official policy document for implementation and evaluation information."
    },
    5: {
        agency: "Beijing Municipal Commission of Economy and Information Technology; Beijing Environmental Protection Bureau",
        content: "Targeted approximately 20% reductions in industrial SO2, NOx and particulate emissions and a 25% reduction in VOC emissions by 2015.",
        measures: "1. Set phased industrial emission-reduction targets.\n2. Close highly polluting and energy-intensive enterprises in batches.\n3. Apply plant-specific VOC control plans.\n4. Conduct cleaner-production audits.",
        pollutants: "SO2, nitrogen oxides, PM2.5, PM10, and VOCs",
        effect: "By 2015, industrial VOC emissions had fallen 25% from 2010 and more than 2,000 highly polluting enterprises had been closed."
    },
    6: {
        agency: "Beijing Municipal Government",
        content: "Targeted a reduction of more than 25% in PM2.5 from the 2012 level by 2017, to around 60 micrograms per cubic meter.",
        measures: "1. Reduce coal use.\n2. Control vehicle and fuel emissions.\n3. Cut industrial pollution.\n4. Control dust through 84 measurable tasks, regular assessments and accountability.",
        pollutants: "PM2.5, PM10, SO2, nitrogen oxides, VOCs, and dust",
        effect: "PM2.5 reached 58 micrograms per cubic meter in 2017, down 35.6% from 2012, while good-air-quality days increased to 226."
    },
    7: {
        agency: "Former Ministry of Environmental Protection, National Development and Reform Commission, and four other ministries",
        content: "Established coordinated implementation rules for the national Air Pollution Prevention and Control Action Plan in Beijing, Tianjin, Hebei and surrounding areas.",
        measures: "1. Cut raw-coal consumption by 13 million tons and phase out small coal-fired boilers by 2017.\n2. Close or restructure 1,200 highly polluting enterprises.\n3. Establish joint regional heavy-pollution warnings and synchronized emergency responses.",
        pollutants: "PM2.5, SO2, nitrogen oxides, and VOCs",
        effect: "See the official policy document for implementation and evaluation information."
    },
    8: {
        agency: "Standing Committee of the Beijing Municipal People's Congress",
        content: "Established PM2.5 control targets in law, created a regional coordination mechanism, and strengthened corporate responsibility for pollution prevention.",
        measures: "1. Establish the legal status of PM2.5 controls.\n2. Introduce pollutant-discharge permitting.\n3. Define corporate responsibilities.\n4. Require regional coordination.\n5. Increase penalties for environmental violations.",
        pollutants: "PM2.5, SO2, nitrogen oxides, VOCs, and dust",
        effect: "Provided the legal basis for subsequent policies and strengthened environmental accountability across government departments."
    },
    9: {
        agency: "Beijing Municipal Government",
        content: "Targeted PM2.5 of around 35 micrograms per cubic meter by 2020 and a reduction of more than 25% in heavy-pollution days from 2015.",
        measures: "1. Retire diesel trucks meeting China III or lower standards.\n2. Expand video monitoring at major construction sites.\n3. Implement plant-specific VOC controls.\n4. Create restricted zones for high-emission non-road machinery.",
        pollutants: "PM2.5, PM10, nitrogen oxides, VOCs, and dust",
        effect: "PM2.5 reached 38 micrograms per cubic meter in 2020, entering the 30-39 range for the first time, while good-air-quality days rose to 276."
    },
    10: {
        agency: "Beijing Municipal Government",
        content: "Targeted PM2.5 of around 30 micrograms per cubic meter by 2025, the near elimination of heavy-pollution weather, and a 3+3+3 clean-air governance framework.",
        measures: "1. Establish the 3+3+3 governance framework.\n2. Restructure energy, industry and transport.\n3. Coordinate PM2.5 and ozone controls.\n4. Strengthen regional coordination and technical support.",
        pollutants: "PM2.5, PM10, nitrogen oxides, VOCs, and ozone",
        effect: "PM2.5 fell to 27.0 micrograms per cubic meter in 2025, below 30 for the first time, and good-air-quality days increased to 292."
    },
    11: {
        agency: "General Office of the Beijing Municipal Government",
        content: "Focused on coordinated PM2.5 and ozone controls, dedicated NOx and VOC reductions, removal of oil-fired boilers in the core area, and expanded construction monitoring.",
        measures: "1. Remove oil-fired boilers in the core area.\n2. Complete clean-energy conversion for remaining household coal.\n3. Expand video monitoring at major projects.\n4. Set annual dust-deposition targets.",
        pollutants: "PM2.5, nitrogen oxides, VOCs, and ozone",
        effect: "Dust deposition fell to 3.6 tons per square kilometer per month in 2022, down 12.2% year on year, while good-air-quality days rose to 280."
    },
    12: {
        agency: "General Office of the Beijing Municipal Government",
        content: "Consolidated air-quality improvements, promoted new-energy non-road machinery, and deepened plant-specific VOC controls.",
        measures: "1. Accelerate new-energy replacement for non-road machinery.\n2. Deepen VOC controls in key industries.\n3. Strengthen real-time mobile-source monitoring.\n4. Improve refined dust-control systems.",
        pollutants: "PM2.5, nitrogen oxides, VOCs, and ozone",
        effect: "Good-air-quality days increased to 285 in 2023, while heavy-pollution days fell to three."
    },
    13: {
        agency: "General Office of the Beijing Municipal Government",
        content: "Promoted electric and hydrogen vehicles, launched a dedicated VOC-control campaign, and strengthened regional air-pollution coordination.",
        measures: "1. Expand new-energy vehicles and pilot hydrogen commercial vehicles.\n2. Conduct dedicated VOC enforcement inspections.\n3. Deepen Beijing-Tianjin-Hebei coordination.\n4. Control cooking fumes and other neighborhood pollution.",
        pollutants: "PM2.5, nitrogen oxides, VOCs, and ozone",
        effect: "Good-air-quality days increased to 290 in 2024, while heavy-pollution days fell to two."
    },
    14: {
        agency: "General Office of the Beijing Municipal Government",
        content: "Launched the 0.1 Microgram Campaign, sought to bring citywide PM2.5 below 30, and assigned annual targets and priority tasks to each district.",
        measures: "1. Implement the 0.1 Microgram Campaign.\n2. Allocate district emission-reduction targets.\n3. Precisely control key pollution sources.\n4. Increase ecological carbon sinks.",
        pollutants: "PM2.5, nitrogen oxides, VOCs, and ozone",
        effect: "PM2.5 fell to 27.0 micrograms per cubic meter in 2025, below 30 for the first time, and good-air-quality days increased to 292."
    },
    15: {
        agency: "Beijing Municipal Ecology and Environment Bureau",
        content: "Targets citywide PM2.5 of around 29 micrograms per cubic meter, promotes new-energy vehicles and machinery, and includes a spring dust-control campaign.",
        measures: "1. Set targets for new-energy vehicle registrations.\n2. Promote new-energy non-road machinery.\n3. Develop green enterprises.\n4. Apply enclosed air-supported structures at excavation sites.\n5. Establish a rapid public-complaint response mechanism.",
        pollutants: "PM2.5, PM10, nitrogen oxides, VOCs, ozone, and dust",
        effect: "From January through April 2026, average PM2.5 was 29.5 micrograms per cubic meter, down 23.2% year on year, with 107 good-air-quality days."
    },
    16: {
        agency: "Beijing municipal authorities",
        content: "A dedicated spring campaign for construction and road-dust control in 2026.",
        measures: "Strengthen inspections, construction-site controls, road cleaning, transport management and enforcement during the spring dust season.",
        pollutants: "PM10, PM2.5, and dust",
        effect: "Implementation results will be evaluated after completion of the campaign."
    }
};

const policyShortLabels = {
    cn: {
        1: "十六阶段",
        2: "清洁空气",
        3: "压减燃煤",
        4: "大气治理",
        5: "工业治理",
        6: "清洁空气",
        7: "京津冀细则",
        8: "防治条例",
        9: "蓝天保卫战",
        10: "十四五规划",
        11: "2022行动",
        12: "2023行动",
        13: "2024行动",
        14: "2025行动",
        15: "2026行动",
        16: "扬尘攻坚"
    },
    en: {
        1: "Stage 16",
        2: "Clean Air",
        3: "Coal Cut",
        4: "Air Control",
        5: "Industry",
        6: "Clean Air",
        7: "BTH Rules",
        8: "Air Law",
        9: "Blue Sky",
        10: "14th FYP",
        11: "2022 Plan",
        12: "2023 Plan",
        13: "2024 Plan",
        14: "2025 Plan",
        15: "2026 Plan",
        16: "Dust Plan"
    }
};

function t(key) {
    return translations[currentLanguage][key];
}

function getPolicyLabel(policy) {
    return currentLanguage === "cn"
        ? policy.name_cn
        : policy.label_en;
}

function middleEllipsis(text, maxLength) {
    const characters = Array.from(cleanText(text));

    if (characters.length <= maxLength) {
        return characters.join("");
    }

    const keep = Math.max(2, maxLength - 3);
    const head = Math.ceil(keep / 2);
    const tail = Math.floor(keep / 2);

    return `${characters.slice(0, head).join("")}...${characters.slice(-tail).join("")}`;
}

function getPolicyTimelineLabel(policy, labelWidth = 112) {
    const shortLabel = policyShortLabels[currentLanguage]?.[policy.id];
    if (shortLabel) {
        return shortLabel;
    }

    const maxLength = currentLanguage === "cn"
        ? Math.max(5, Math.min(9, Math.floor(labelWidth / 9.5)))
        : Math.max(8, Math.min(14, Math.floor(labelWidth / 6.2)));
    return middleEllipsis(getPolicyLabel(policy).replace(/[《》]/g, ""), maxLength);
}

function updateStaticTexts() {
    document.documentElement.lang = currentLanguage === "cn" ? "zh-CN" : "en";
    document.title = t("pageTitle");
    d3.select("#chartTitle").text(t("title"));
    d3.select("#pollutantsControlTitle").text(t("pollutants"));
    d3.select("#yearControlTitle").text(t("year"));
    d3.select("#footerCourse").text(t("footerCourse"));
    d3.select("#policyInfoTitle").text(t("policyInfo"));
    d3.select("#policyTimeline").attr("aria-label", t("timelineAria"));
    d3.select("#airQualityChart").attr("aria-label", t("chartAria"));
    d3.select(".chart-legend").attr("aria-label", t("legendAria"));
    d3.select(".view-mode-toggle").attr("aria-label", t("viewMode"));
    d3.select("#fullViewButton").text(t("fullView"));
    d3.select("#localViewButton").text(t("localView"));
    d3.select("#overviewHeroImpact").html(t("heroImpact"));

    const sliderValue = +d3.select("#yearSlider").property("value");
    const selectedYear = yearOptions[sliderValue];

    d3.select("#yearLabel")
        .text(selectedYear === "All" ? t("allPeriod") : selectedYear);

    if (selectedPolicy) {
        renderPolicyDetail(selectedPolicy);
    } else {
        d3.select("#policyDetail")
            .html(`<p class="policy-placeholder">${escapeHtml(t("policyPrompt"))}</p>`);
    }

    updatePolicySelection();
    updateOverviewModeControls();
}

function updateOverviewModeControls() {
    const isFull = overviewMode === "full";
    d3.select("#dashboard").classed("full-view", isFull);
    d3.select("#policyInfo").attr("aria-hidden", isFull ? "true" : null);
    d3.select("#fullViewButton")
        .classed("active", isFull)
        .attr("aria-pressed", isFull ? "true" : "false");
    d3.select("#localViewButton")
        .classed("active", !isFull)
        .attr("aria-pressed", !isFull ? "true" : "false");
}

function renderCurrentChart() {
    if (!smoothedData.length || !renderChartFn) return;
    if (currentMode === "All") {
        renderChartFn(smoothedData);
        return;
    }
    renderChartFn(airQualityData.filter(d => d.date.getFullYear() === currentMode));
}

function syncPolicyPanelHeight() {
    const visualizationPanel = document.querySelector(".visualization-panel");
    const policyInfo = document.querySelector("#policyInfo");

    if (!visualizationPanel || !policyInfo) {
        return;
    }

    if (overviewMode === "full" || window.matchMedia("(max-width: 1100px)").matches) {
        policyInfo.style.height = "";
        return;
    }

    policyInfo.style.height = `${visualizationPanel.offsetHeight}px`;
}

function setOverviewMode(mode, options = {}) {
    const nextMode = mode === "local" ? "local" : "full";
    overviewMode = nextMode;

    if (nextMode === "full") {
        selectedPolicy = null;
        currentMode = "All";
        d3.select("#yearSlider").property("value", 0);
        d3.select("#yearLabel").text(t("allPeriod"));
        d3.select("#policyDetail")
            .html(`<p class="policy-placeholder">${escapeHtml(t("policyPrompt"))}</p>`);
        updatePolicySelection();
    }

    updateOverviewModeControls();

    if (options.render !== false) {
        window.requestAnimationFrame(() => {
            renderCurrentChart();
            syncPolicyPanelHeight();
        });
    }
}


const yearOptions = ["All", 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];




const svg = d3.select("#airQualityChart");

let width = +svg.attr("width");
const height = +svg.attr("height");

const margin = {
    top: 34,
    right: 60,
    bottom: 64,
    left: 80
};

let innerWidth = width - margin.left - margin.right;
const innerHeight = height - margin.top - margin.bottom;
const chartHeight = innerHeight;

const chart = svg.append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);



// function for MA
function movingAverage(data, windowSize) {

    return data.map((d, i) => {

        let start = Math.max(0, i - windowSize + 1);
        let slice = data.slice(start, i + 1);

        let result = { date: d.date };

        pollutants.forEach(p => {
            result[p] = d3.mean(slice, s => s[p]);
        });

        return result;
    });
}

// ===============================
// 2. Data extraction
// ===============================


// loading both files of data
Promise.all([
    d3.csv("../data/overview/beijing-air-quality.csv"),
    d3.csv("../data/overview/policies.csv"),
    loadPolicyWorkbook()
]).then(function([data, policyData, policyDetails]) {

    // data extraction
    data = data.map(d => {
        return {
            date: parseDate(d.date.trim()), // parsing dates
            pm25: +d[" pm25"].trim(),
            pm10: +d[" pm10"].trim(),
            o3: +d[" o3"].trim(),
            no2: +d[" no2"].trim(),
            so2: +d[" so2"].trim(),
            co: +d[" co"].trim()
        };
    });

    // sort dates from oldest to newest
    data.sort((a, b) => d3.ascending(a.date, b.date));
    airQualityData = data;

    // smoothed dates for global display
    smoothedData = movingAverage(airQualityData, 30);


    // Policy data parsing
    const datasetEndDate = d3.max(data, d => d.date);

    const policyDetailsByName = new Map(
        policyDetails.map(detail => [normalizePolicyName(detail.name), detail])
    );

    policyData = policyData.map(d => {

    const startDate = parsePolicyDate(d.start);

    let endDate;

    if (d.end === "present") {
        endDate = datasetEndDate;
    } else {
        const parsedEnd = parsePolicyDate(d.end);

        endDate = new Date(
            parsedEnd.getFullYear(),
            parsedEnd.getMonth() + 1,
            0
        );
    }

        const detail = policyDetailsByName.get(normalizePolicyName(d.name_cn)) || {};

        return {
            id: +d.id,
            name_cn: d.name_cn,
            label_en: d.label_en,
            start: startDate,
            end: endDate,
            group: d.group,
            cover: getPolicyCoverPath(+d.id),
            detail
        };
    });
    allPolicies = policyData;
    updatePolicySelection();

    const regimePolicies = policyData.filter(d => d.group === "regime");
    const secondaryPolicies = policyData.filter(d =>
        d.group === "secondary" || d.group === "future"
    );
    const baselinePolicies = policyData.filter(d => d.group === "baseline");
    const legalPolicies = policyData.filter(d => d.group === "legal");
    currentMode = "All";
    renderChartFn = renderChart;
    updateStaticTexts();
    renderChart(smoothedData);
    

// draw ALL function for slider switching
function renderChart(chartData) {

    chart.selectAll("*").remove();

    const chartViewport = document.querySelector("#chartScroll");
    const rawViewportWidth = chartViewport?.clientWidth || 1100;
    const viewportWidth = overviewMode === "full"
        ? Math.max(320, rawViewportWidth)
        : Math.max(960, rawViewportWidth);
    const dateSpanYears = Math.max(
        1,
        d3.timeYear.count(d3.min(chartData, d => d.date), d3.max(chartData, d => d.date)) + 1
    );

    width = currentMode === "All" && overviewMode === "full"
        ? viewportWidth
        : currentMode === "All"
        ? Math.max(viewportWidth, dateSpanYears * 310)
        : viewportWidth;
    innerWidth = width - margin.left - margin.right;

    svg.attr("width", width);
    d3.select("#chartCanvas").style("width", `${width}px`);
    d3.select("#policyTimeline").style("width", `${width}px`);
    if (overviewMode === "full") {
        chartViewport.scrollLeft = 0;
    }

    // animation
    function fadeIn(selection, targetOpacity, duration = 500) {
        selection
            .attr("opacity", 0)
            .transition()
            .duration(duration)
            .attr("opacity", targetOpacity);
    }

    // ===============================
    // 3. Scales
    // ===============================

    const xScale = d3.scaleTime()
        .domain(d3.extent(chartData, d => d.date))
        .range([0, innerWidth]);

    const selectedPollutants = getSelectedPollutants();

    let yMax;

    if (currentMode === "All") {

        // scale only on smoothed data
        yMax = d3.max(chartData, d =>
            d3.max(selectedPollutants, p => d[p])
        );

    } else {

        // fixed scale across the entire dataset
        yMax = d3.max(data, d =>
            d3.max(selectedPollutants, p => d[p])
        );
    }

    const yScale = d3.scaleLinear()
        .domain([0, yMax])
        .nice()
        .range([chartHeight, 0]);

    // ===============================
    // 4. Axes + grid
    // ===============================

    // horizontal grid lines
    chart.append("g")
        .attr("class", "grid")
        .call(
            d3.axisLeft(yScale)
                .tickSize(-innerWidth)
                .tickFormat("")
        )
        .selectAll("line")
        .attr("stroke", "#d9d9d9")
        .attr("stroke-opacity", 0.5);

    chart.select(".grid")
        .select(".domain")
        .remove();

    // X-axis
    chart.append("g")
        .attr("transform", `translate(0, ${chartHeight})`)
        .call(d3.axisBottom(xScale));

    // Y-axis
    chart.append("g")
        .call(
            d3.axisLeft(yScale)
                .ticks(6)
        );

    // Y-axis label
    chart.append("text")
        .attr("class", "y-axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -chartHeight / 2)
        .attr("y", -55)
        .attr("text-anchor", "middle")
        .attr("font-size", 13)
        .attr("font-weight", 600)
        .attr("fill", "#444")
        .text(t("yAxis"));

    // Axis styling
    chart.selectAll(".domain")
        .attr("stroke", "#999");

    chart.selectAll(".tick line")
        .attr("stroke", "#bbb");

    chart.selectAll(".tick text")
        .attr("fill", "#666")
        .attr("font-size", 11);


    // ===============================
    // 5. Policy zones
    // ===============================

    const dateExtent = d3.extent(chartData, d => d.date);
    const visibleTimelinePolicies = renderPolicyTimeline(dateExtent, xScale, width);

    const visibleRegimePolicies = regimePolicies.filter(d =>
        d.end >= dateExtent[0] && d.start <= dateExtent[1]
    );

    chart.selectAll(".policy-chart-line")
        .data(visibleTimelinePolicies, d => d.id)
        .enter()
        .append("line")
        .attr("class", "policy-chart-line")
        .attr("x1", d => xScale(policyAnchorDate(d, dateExtent)))
        .attr("x2", d => xScale(policyAnchorDate(d, dateExtent)))
        .attr("y1", 0)
        .attr("y2", chartHeight);

    chart.selectAll(".policy-zone")
        .data(visibleRegimePolicies)
        .enter()
        .append("rect")
        .attr("class", "policy-zone")
        .attr("x", d => xScale(d3.max([d.start, dateExtent[0]])))
        .attr("y", 0)
        .attr("width", d => {
            const start = d3.max([d.start, dateExtent[0]]);
            const end = d3.min([d.end, dateExtent[1]]);
            return xScale(end) - xScale(start);
        })
        .attr("height", chartHeight)
        .attr("fill", d => policyColors[d.group])
        .call(makePolicyInteractive)
        .call(selection => fadeIn(selection, 0.22))


    // Policy labels
    chart.selectAll(".policy-label")
        .data(visibleRegimePolicies)
        .enter()
        .append("text")
        .attr("class", "policy-label")
        .attr("x", d => {

            const start = d3.max([d.start, dateExtent[0]]);
            const end = d3.min([d.end, dateExtent[1]]);

            if (d.id === 2) {
                return xScale(start) + 8;
            }

            return xScale(end) - 8;
        })
        .attr("text-anchor", d => d.id === 2 ? "start" : "end")
        .attr("y", -8)
        .attr("font-size", 12)
        .attr("font-weight", 700)
        .attr("fill", "#333")
        .attr("opacity", 0.8)
        .call(makePolicyInteractive)
        .text(d => {
            const startYear = d.start.getFullYear();
            const endYear = d.end.getFullYear();
            // short names for 2 policies in cn
            let policyLabel = getPolicyLabel(d);

            if (currentLanguage === "cn" && currentMode === "All") {

                if (d.id === 2) {
                    policyLabel = "清洁空气计划";
                }

                if (d.id === 6) {
                    policyLabel = "清洁空气计划";
                }
            }

            return `${policyLabel} (${startYear}-${endYear})`;
        });

    // ===============================
    // 5+. Secondary policy lanes
    // ===============================

    const visibleSecondaryPolicies = secondaryPolicies.filter(d =>
        d.end >= dateExtent[0] && d.start <= dateExtent[1]
    );

    const policyLaneY = -110;
    const policyLaneHeight = 7;
    const policyLaneGap = 22;

    chart.selectAll(".secondary-policy-bar")
        .data(visibleSecondaryPolicies)
        .enter()
        .append("rect")
        .attr("class", "secondary-policy-bar")
        .attr("x", d => {
            const start = d3.max([d.start, dateExtent[0]]);
            return xScale(start);
        })
        .attr("y", (d, i) => policyLaneY + i * policyLaneGap)
        .attr("width", d => {
            const start = d3.max([d.start, dateExtent[0]]);
            const end = d3.min([d.end, dateExtent[1]]);
            return xScale(end) - xScale(start);
        })
        .attr("height", policyLaneHeight)
        .attr("fill", d => policyColors[d.group])
        .call(makePolicyInteractive)
        .call(selection => fadeIn(selection, 0.85))


    // Secondary policy labels
    chart.selectAll(".secondary-policy-label")
        .data(visibleSecondaryPolicies)
        .enter()
        .append("text")
        .attr("class", "secondary-policy-label")
        .attr("x", d => {
            const start = d3.max([d.start, dateExtent[0]]);
            return xScale(start) + 4;
        })
        .attr("y", (d, i) => policyLaneY + i * policyLaneGap - 3)
        .attr("text-anchor", "start")
        .attr("font-size", 10)
        .attr("font-weight", 600)
        .attr("fill", policyColors.secondary)
        .attr("opacity", 0.9)
        .call(makePolicyInteractive)
        .text(d => {
            const startYear = d.start.getFullYear();
            const endYear = d.end.getFullYear();
            return `${getPolicyLabel(d)} (${startYear}-${endYear})`;
        });


    // ===============================
    // 5++. Baseline policy strip
    // ===============================

    const visibleBaselinePolicies = baselinePolicies.filter(d =>
        d.end >= dateExtent[0] && d.start <= dateExtent[1]
    );

    const baselineY = -34;
    const baselineHeight = 4;

    chart.selectAll(".baseline-policy-bar")
        .data(visibleBaselinePolicies)
        .enter()
        .append("rect")
        .attr("class", "baseline-policy-bar")
        .attr("x", d => {
            const start = d3.max([d.start, dateExtent[0]]);
            return xScale(start);
        })
        .attr("y", baselineY)
        .attr("width", d => {
            const start = d3.max([d.start, dateExtent[0]]);
            const end = d3.min([d.end, dateExtent[1]]);
            return xScale(end) - xScale(start);
        })
        .attr("height", baselineHeight)
        .attr("fill", d => policyColors[d.group])
        .call(makePolicyInteractive)
        .call(selection => fadeIn(selection, 0.75))

    // Baseline policy start markers
    chart.selectAll(".baseline-policy-start")
        .data(visibleBaselinePolicies)
        .enter()
        .append("circle")
        .attr("class", "baseline-policy-start")
        .attr("cx", d => {
            const start = d3.max([d.start, dateExtent[0]]);
            return xScale(start);
        })
        .attr("cy", baselineY + baselineHeight / 2)
        .attr("r", 3.5)
        .attr("fill", d => policyColors[d.group])
        .attr("opacity", 0.95)
        .call(makePolicyInteractive);

    // Baseline policy end markers
    chart.selectAll(".baseline-policy-end")
        .data(visibleBaselinePolicies)
        .enter()
        .append("circle")
        .attr("class", "baseline-policy-end")
        .attr("cx", d => {
            const end = d3.min([d.end, dateExtent[1]]);
            return xScale(end);
        })
        .attr("cy", baselineY + baselineHeight / 2)
        .attr("r", 3.5)
        .attr("fill", d => policyColors[d.group])
        .attr("opacity", 0.95)
        .call(makePolicyInteractive);

    // Baseline policy labels
    chart.selectAll(".baseline-policy-label")
        .data(visibleBaselinePolicies)
        .enter()
        .append("text")
        .attr("class", "baseline-policy-label")
        .attr("x", d => {
            const start = d3.max([d.start, dateExtent[0]]);
            return xScale(start) + 4;
        })
        .attr("y", baselineY - 5)
        .attr("text-anchor", "start")
        .attr("font-size", 9)
        .attr("font-weight", 600)
        .attr("fill", policyColors.baseline)
        .attr("opacity", 0.9)
        .call(makePolicyInteractive)
        .text(d => {

            const year = d.start.getFullYear();

            return `${year} ${t("plan")}`;
        });

    // ===============================
    // 5+++. Legal policy line
    // ===============================

    const visibleLegalPolicies = legalPolicies.filter(d =>
        d.end >= dateExtent[0] && d.start <= dateExtent[1]
    );

    const legalY = -125;
    const legalHeight = 2;

    chart.selectAll(".legal-policy-line")
        .data(visibleLegalPolicies)
        .enter()
        .append("rect")
        .attr("class", "legal-policy-line")
        .attr("x", d => {
            const start = d3.max([d.start, dateExtent[0]]);
            return xScale(start);
        })
        .attr("y", legalY)
        .attr("width", d => {
            const start = d3.max([d.start, dateExtent[0]]);
            const end = d3.min([d.end, dateExtent[1]]);
            return xScale(end) - xScale(start);
        })
        .attr("height", legalHeight)
        .attr("fill", d => policyColors[d.group])
        .call(makePolicyInteractive)
        .call(selection => fadeIn(selection, 0.75))

    chart.selectAll(".legal-policy-marker")
        .data(visibleLegalPolicies)
        .enter()
        .append("circle")
        .attr("class", "legal-policy-marker")
        .attr("cx", d => {
            const start = d3.max([d.start, dateExtent[0]]);
            return xScale(start);
        })
        .attr("cy", legalY + legalHeight / 2)
        .attr("r", 3)
        .attr("fill", d => policyColors[d.group])
        .attr("opacity", 0.9)
        .call(makePolicyInteractive);

    // Legal policy labels
    chart.selectAll(".legal-policy-label")
        .data(visibleLegalPolicies)
        .enter()
        .append("text")
        .attr("class", "legal-policy-label")
        .attr("x", d => {
            const start = d3.max([d.start, dateExtent[0]]);
            return xScale(start) + 5;
        })
        .attr("y", legalY - 4)
        .attr("text-anchor", "start")
        .attr("font-size", 9)
        .attr("font-weight", 500)
        .attr("fill", policyColors.legal)
        .attr("opacity", 0.75)
        .call(makePolicyInteractive)
        .text(d => {
            const startYear = d.start.getFullYear();
            const endYear = d.end.getFullYear();
            return `${getPolicyLabel(d)} (${startYear}-${endYear})`;
        });

    // ===============================
    // 5++++. Policy layer labels
    // ===============================

    chart.append("text")
        .attr("class", "policy-layer-label")
        .attr("x", -65)
        .attr("y", -8)
        .attr("text-anchor", "start")
        .attr("font-size", 10)
        .attr("font-weight", 700)
        .attr("fill", "#666")
        .text(t("mainPolicy"));

    chart.append("text")
        .attr("class", "policy-layer-label")
        .attr("x", -65)
        .attr("y", policyLaneY + 8)
        .attr("text-anchor", "start")
        .attr("font-size", 10)
        .attr("font-weight", 700)
        .attr("fill", "#666")
        .text(t("secondary"));

    chart.append("text")
        .attr("class", "policy-layer-label")
        .attr("x", -65)
        .attr("y", legalY + 4)
        .attr("text-anchor", "start")
        .attr("font-size", 10)
        .attr("font-weight", 700)
        .attr("fill", "#666")
        .text(t("legal"));

    chart.append("text")
        .attr("class", "policy-layer-label")
        .attr("x", -65)
        .attr("y", baselineY + 5)
        .attr("text-anchor", "start")
        .attr("font-size", 10)
        .attr("font-weight", 700)
        .attr("fill", "#666")
        .text(t("baseline"));

    // ===============================
    // 6. Lines
    // ===============================

    let tooltipData;
    let dailyTooltipData = null;

    if (currentMode === "All") {

        tooltipData = chartData;

        // Full-period mode: 30-day moving average only
        drawLines(chartData, xScale, yScale, 2, 1, true);

    } else {

        // Year mode: raw daily data + 7-day moving average
        const yearMovingAverage = movingAverage(chartData, 7);

        tooltipData = yearMovingAverage;
        dailyTooltipData = chartData;

        // raw daily lines: thinner and transparent
        drawLines(chartData, xScale, yScale, 1, 0.25, false);

        // 7-day moving average lines: clearer main lines
        drawLines(yearMovingAverage, xScale, yScale, 2.5, 1, true);
    }

    // ===============================
    // 6+. Simple tooltip + crosshair
    // ===============================

    const tooltip = d3.select(".tooltip");

    const crosshair = chart.append("line")
        .attr("class", "crosshair")
        .attr("y1", 0)
        .attr("y2", chartHeight)
        .attr("stroke", "#333")
        .attr("stroke-width", 1)
        .style("opacity", 0);

    const hoverDotsGroup = chart.append("g")
        .attr("class", "hover-dots")
        .style("opacity", 0);

    const policyHoverDotsGroup = chart.append("g")
        .attr("class", "policy-hover-dots")
        .style("opacity", 0);


    const bisectDate = d3.bisector(d => d.date).left;

    const overlay = chart.append("rect")
        .attr("class", "overlay")
        .attr("width", innerWidth)
        .attr("height", chartHeight)
        .attr("fill", "none")
        .attr("pointer-events", "all");

    overlay
        .on("mousemove", function(event) {

            const [mouseX, mouseY] = d3.pointer(event, this);
            const hoveredDate = xScale.invert(mouseX);

            const index = bisectDate(tooltipData, hoveredDate);
            const d0 = tooltipData[index - 1];
            const d1 = tooltipData[index];

            let d;

            if (!d0) {
                d = d1;
            } else if (!d1) {
                d = d0;
            } else {
                d = hoveredDate - d0.date > d1.date - hoveredDate ? d1 : d0;
            }
            let dailyD = null;

            if (currentMode !== "All" && dailyTooltipData) {
                dailyD = dailyTooltipData.find(row =>
                    row.date.getTime() === d.date.getTime()
                );
            }

            const selectedPollutants = getSelectedPollutants();

            crosshair
                .attr("x1", xScale(d.date))
                .attr("x2", xScale(d.date))
                .style("opacity", 1);

            hoverDotsGroup
                .style("opacity", 1);

            const hoverDots = hoverDotsGroup
                .selectAll(".hover-dot")
                .data(selectedPollutants, p => p);

            hoverDots.enter()
                .append("circle")
                .attr("class", "hover-dot")
                .attr("r", 4.5)
                .attr("fill", p => pollutantColors[p])
                .attr("stroke", "#ffffff")
                .attr("stroke-width", 2)
                .merge(hoverDots)
                .attr("cx", p => xScale(d.date))
                .attr("cy", p => yScale(d[p]));

            hoverDots.exit().remove();

            policyHoverDotsGroup
                .style("opacity", 1);

            const activePolicyDots = [];

            const activePolicies = [];

            // secondary policies
            visibleSecondaryPolicies.forEach((policy, i) => {
                if (d.date >= policy.start && d.date <= policy.end) {
                    activePolicyDots.push({
                        id: `secondary-${policy.id}`,
                        y: policyLaneY + i * policyLaneGap + policyLaneHeight / 2,
                        color: policyColors.secondary,
                        label: policy.label_en,
                        group: policy.group
                    });

                    activePolicies.push(policy);
                }
            });

            // baseline policies
            visibleBaselinePolicies.forEach(policy => {
                if (d.date >= policy.start && d.date <= policy.end) {
                    activePolicyDots.push({
                        id: `baseline-${policy.id}`,
                        y: baselineY + baselineHeight / 2,
                        color: policyColors.baseline,
                        label: policy.label_en,
                        group: policy.group
                    });

                    activePolicies.push(policy);
                }
            });

            // legal policies
            visibleLegalPolicies.forEach(policy => {
                if (d.date >= policy.start && d.date <= policy.end) {
                    activePolicyDots.push({
                        id: `legal-${policy.id}`,
                        y: legalY + legalHeight / 2,
                        color: policyColors.legal,
                        label: policy.label_en,
                        group: policy.group
                    });

                    activePolicies.push(policy);
                }
            });

            // regime policies
            visibleRegimePolicies.forEach(policy => {
                if (d.date >= policy.start && d.date <= policy.end) {
                    activePolicies.push(policy);
                }
            });


            const policyDots = policyHoverDotsGroup
                .selectAll(".policy-hover-dot")
                .data(activePolicyDots, d => d.id);

            policyDots.enter()
                .append("circle")
                .attr("class", "policy-hover-dot")
                .attr("r", 5)
                .attr("stroke", "#ffffff")
                .attr("stroke-width", 2)
                .merge(policyDots)
                .attr("cx", xScale(d.date))
                .attr("cy", d => d.y)
                .attr("fill", d => d.color);

            policyDots.exit().remove();


            // toolptip
            let html = `
                <strong>${d3.timeFormat("%Y-%m-%d")(d.date)}</strong>
                <div style="margin-top:6px; font-weight:700;">${t("pollutantsTooltip")}</div>
            `;

            selectedPollutants.forEach(p => {

                if (currentMode === "All") {
                    html += `
                        <div>
                            <span style="
                                display:inline-block;
                                width:9px;
                                height:9px;
                                border-radius:50%;
                                background:${pollutantColors[p]};
                                margin-right:6px;
                            "></span>
                            ${pollutantLabels[p]}: ${d[p].toFixed(1)} <span style="color:#777;">(${t("ma30")})</span>
                        </div>
                    `;
                } else {
                    html += `
                        <div>
                            <span style="
                                display:inline-block;
                                width:9px;
                                height:9px;
                                border-radius:50%;
                                background:${pollutantColors[p]};
                                margin-right:6px;
                            "></span>
                            ${pollutantLabels[p]}: ${dailyD[p].toFixed(0)} <span style="color:#777;">${t("daily")}</span> / ${d[p].toFixed(1)} <span style="color:#777;">${t("ma7")}</span>
                        </div>
                    `;
                }
            });

            html += `<div style="margin-top:8px; font-weight:700;">${t("activePolicies")}</div>`;

            if (activePolicies.length === 0) {
                html += `<div style="color:#777;">${t("none")}</div>`;
            } else {
                activePolicies.forEach(policy => {
                    html += `
                        <div>
                            <span style="
                                display:inline-block;
                                width:9px;
                                height:9px;
                                border-radius:50%;
                                background:${policyColors[policy.group]};
                                margin-right:6px;
                            "></span>
                            ${overviewMode === "full"
                                ? escapeHtml(getPolicyLabel(policy))
                                : `${escapeHtml(getPolicyLabel(policy))} · ${escapeHtml(formatPolicyPeriod(policy))}`}
                        </div>
                    `;
                });
            }

            const tooltipNode = tooltip.node();

            tooltip
                .html(html)
                .style("opacity", 1);

            const tooltipWidth = tooltipNode.offsetWidth;
            const tooltipHeight = tooltipNode.offsetHeight;

            let left = mouseX + margin.left + 28;
            const timelineOffset = document.querySelector("#policyTimeline")?.offsetHeight || 0;
            let top = mouseY + margin.top + timelineOffset + 28;

            if (left + tooltipWidth > width) {
                left = mouseX + margin.left - tooltipWidth - 28;
            }

            if (top + tooltipHeight > height + timelineOffset) {
                top = mouseY + margin.top + timelineOffset - tooltipHeight - 28;
            }

            tooltip
                .style("left", left + "px")
                .style("top", top + "px");
        })
        .on("mouseleave", function() {
            crosshair.style("opacity", 0);
            hoverDotsGroup.style("opacity", 0);
            policyHoverDotsGroup.style("opacity", 0);
            tooltip.style("opacity", 0);
        });


    applyCheckboxVisibility();
    syncPolicyPanelHeight();
}

function syncPolicyPanelHeight() {
    const visualizationPanel = document.querySelector(".visualization-panel");
    const policyInfo = document.querySelector("#policyInfo");

    if (!visualizationPanel || !policyInfo) {
        return;
    }

    if (overviewMode === "full" || window.matchMedia("(max-width: 1100px)").matches) {
        policyInfo.style.height = "";
        return;
    }

    policyInfo.style.height = `${visualizationPanel.offsetHeight}px`;
}

function policyAnchorDate(policy, dateExtent) {
    const start = d3.max([policy.start, dateExtent[0]]);
    const end = d3.min([policy.end, dateExtent[1]]);
    return new Date((start.getTime() + end.getTime()) / 2);
}

function renderPolicyTimeline(dateExtent, xScale, canvasWidth) {
    const timeline = d3.select("#policyTimeline");
    timeline.selectAll("*").remove();

    const axisLeft = margin.left;
    const axisWidth = innerWidth;
    const visiblePolicies = allPolicies
        .filter(policy => policy.end >= dateExtent[0] && policy.start <= dateExtent[1])
        .sort((a, b) => d3.ascending(a.start, b.start) || d3.ascending(a.end, b.end));

    timeline.append("div")
        .attr("class", "policy-axis-line")
        .style("left", `${axisLeft}px`)
        .style("width", `${axisWidth}px`);

    timeline.append("div")
        .attr("class", "policy-axis-title")
        .style("left", "10px")
        .text(currentLanguage === "cn" ? "政策时间轴" : "POLICY TIMELINE");

    const firstYear = dateExtent[0].getFullYear();
    const lastYear = dateExtent[1].getFullYear();
    const tickYears = d3.range(firstYear, lastYear + 1);

    timeline.selectAll(".policy-axis-tick")
        .data(tickYears)
        .join("span")
        .attr("class", "policy-axis-tick")
        .style("left", year => `${axisLeft + xScale(new Date(year, 0, 1))}px`);

    timeline.selectAll(".policy-axis-tick-label")
        .data(tickYears)
        .join("span")
        .attr("class", "policy-axis-tick-label")
        .style("left", year => `${axisLeft + xScale(new Date(year, 0, 1))}px`)
        .text(year => year);

    timeline.selectAll(".policy-duration")
        .data(visiblePolicies, policy => policy.id)
        .join("span")
        .attr("class", "policy-duration")
        .style("left", policy => {
            const start = d3.max([policy.start, dateExtent[0]]);
            return `${axisLeft + xScale(start)}px`;
        })
        .style("width", policy => {
            const start = d3.max([policy.start, dateExtent[0]]);
            const end = d3.min([policy.end, dateExtent[1]]);
            return `${Math.max(3, xScale(end) - xScale(start))}px`;
        })
        .style("background", policy => policyColors[policy.group]);

    const markerWidth = 14;
    const minCenter = axisLeft + markerWidth / 2 + 4;
    const maxCenter = canvasWidth - margin.right - markerWidth / 2 - 4;

    const labelWidth = currentLanguage === "cn" ? 260 : 300;
    const markerPositions = visiblePolicies.map((policy) => {
        const anchorDate = policyAnchorDate(policy, dateExtent);
        const anchor = axisLeft + xScale(anchorDate);
        const center = Math.max(minCenter, Math.min(maxCenter, anchor));
        const minAllowed = axisLeft + labelWidth / 2;
        const maxAllowed = canvasWidth - margin.right - labelWidth / 2;
        const labelCenter = Math.max(minAllowed, Math.min(maxAllowed, center));
        return { policy, center, labelOffset: labelCenter - center };
    });

    const markers = timeline.selectAll(".policy-marker")
        .data(markerPositions, item => item.policy.id)
        .join("button")
        .attr("type", "button")
        .attr("class", "policy-marker")
        .classed("active", item => selectedPolicy?.id === item.policy.id)
        .attr("title", item => getPolicyLabel(item.policy))
        .attr("aria-label", item => `${t("policyInfo")}: ${getPolicyLabel(item.policy)}`)
        .style("left", item => `${item.center}px`)
        .style("--label-width", `${labelWidth}px`)
        .style("--label-offset", item => `${item.labelOffset}px`)
        .on("mouseenter", function() {
            d3.select(this).classed("is-hover", true);
        })
        .on("mouseleave", function() {
            d3.select(this).classed("is-hover", false);
        })
        .on("click", (event, item) => selectPolicy(item.policy));

    markers.html(item => {
        const policy = item.policy;
        return `
            <img class="policy-cover" src="${escapeAttribute(policy.cover)}" alt="">
            <span class="policy-marker-name">${escapeHtml(getPolicyLabel(policy))}</span>
            <span class="policy-marker-date">${formatPolicyPeriod(policy)}</span>
        `;
    });

    return visiblePolicies;
}

// function for drawing lines
function drawLines(chartData, xScale, yScale, strokeWidth, opacity, animateDraw = false) {

    const selectedPollutants = getSelectedPollutants();

    const line = d3.line()
        .x(d => xScale(d.date))
        .y(d => yScale(d.currentValue));

    selectedPollutants.forEach((pollutant, i) => {

        const lineData = chartData.map(d => ({
            date: d.date,
            currentValue: d[pollutant]
        }));

        const path = chart.append("path")
            .datum(lineData)
            .attr("class", `pollutant-line line-${pollutant}`)
            .attr("fill", "none")
            .attr("stroke", pollutantColors[pollutant])
            .attr("stroke-width", strokeWidth)
            .attr("opacity", opacity)
            .attr("d", line);

        if (animateDraw) {
            const totalLength = path.node().getTotalLength();

            path
                .attr("stroke-dasharray", `${totalLength} ${totalLength}`)
                .attr("stroke-dashoffset", totalLength)
                .transition()
                .delay(i * 120)
                .duration(1200)
                .ease(d3.easeLinear)
                .attr("stroke-dashoffset", 0);
        } else {
            path
                .attr("opacity", 0)
                .transition()
                .duration(700)
                .attr("opacity", opacity);
        }
    });
}




// ===============================
// 8. Checkbox interaction
// ===============================

function applyCheckboxVisibility() {

    const selectedPollutants = d3.selectAll(".pollutant-checkbox:checked")
        .nodes()
        .map(node => node.value);

    pollutants.forEach(pollutant => {

        const isVisible = selectedPollutants.includes(pollutant);

        chart.selectAll(`.line-${pollutant}`)
            .style("display", isVisible ? null : "none");
    });
}

function getSelectedPollutants() {

    return d3.selectAll(".pollutant-checkbox:checked")
        .nodes()
        .map(node => node.value);
}

d3.selectAll(".pollutant-checkbox").on("change", function() {
    renderCurrentChart();
});


// ===============================
// 9. Year slider interaction
// ===============================

d3.select("#yearSlider").on("input", function() {

    const sliderValue = +this.value;
    const selectedYear = yearOptions[sliderValue];

    d3.select("#yearLabel")
        .text(selectedYear === "All" ? t("allPeriod") : selectedYear);

    if (selectedYear === "All") {
        currentMode = "All";
    } else {
        currentMode = selectedYear;
    }

    renderCurrentChart();
});


d3.select("#fullViewButton").on("click", function() {
    setOverviewMode("full");
});

d3.select("#localViewButton").on("click", function() {
    setOverviewMode("local");
});

let resizeTimer;
window.addEventListener("resize", function() {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(function() {
        renderCurrentChart();
        syncPolicyPanelHeight();
    }, 180);
});

      
    // testing data extraction & smoothing dates via console
    /*
    console.log("Clean data:", data);
    console.log("Number of rows:", data.length);
    console.log("First row:", data[0]);
    console.log("Last row:", data[data.length - 1]);
    console.log("Date extent:", d3.extent(data, d => d.date));
    console.log("PM2.5 extent:", d3.extent(data, d => d.pm25));
    console.log("PM10 extent:", d3.extent(data, d => d.pm10));
    console.log("O3 extent:", d3.extent(data, d => d.o3));
    console.log("NO2 extent:", d3.extent(data, d => d.no2));
    console.log("SO2 extent:", d3.extent(data, d => d.so2));
    console.log("CO extent:", d3.extent(data, d => d.co));
    console.log("Moving average data:", smoothedData.slice(0, 5));
    */

// handling data loading error    
}).catch(function(error) {
    console.error("Error loading CSV files:", error);
});

async function loadPolicyWorkbook() {
    const response = await fetch(encodeURI(policyWorkbookFile));

    if (!response.ok) {
        throw new Error(`Unable to load ${policyWorkbookFile}.`);
    }

    const buffer = await response.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
    const rows = workbook.SheetNames.flatMap(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        return XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });
    });

    return rows
        .map(row => ({
            name: cleanText(row["政策名称"]),
            date: cleanText(row["发布时间"]),
            period: cleanText(row["政策时间段"]),
            agency: cleanText(row["发布机构"]),
            content: cleanText(row["主要内容"]),
            pollutants: cleanText(row["涉及污染物"]),
            measures: cleanText(row["主要措施"]),
            effect: cleanText(row["实施效果或后续评估信息"]),
            link: cleanText(row["政策链接"])
        }))
        .filter(row => row.name);
}

function makePolicyInteractive(selection) {
    selection
        .classed("policy-clickable", true)
        .attr("tabindex", 0)
        .attr("role", "button")
        .attr("aria-label", d => `${t("policyInfo")}: ${getPolicyLabel(d)}`)
        .on("click.policy-detail", function(event, policy) {
            event.stopPropagation();
            selectPolicy(policy);
        })
        .on("keydown.policy-detail", function(event, policy) {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                selectPolicy(policy);
            }
        });
}

function selectPolicy(policy) {
    selectedPolicy = policy;
    setOverviewMode("local", { render: false });
    window.requestAnimationFrame(() => {
        renderCurrentChart();
        renderPolicyDetail(policy);
        updatePolicySelection();
        syncPolicyPanelHeight();
    });
}

function updatePolicySelection() {
    d3.selectAll(".policy-marker")
        .classed("active", item => selectedPolicy?.id === item?.policy?.id)
        .attr("aria-current", item => selectedPolicy?.id === item?.policy?.id ? "true" : null);
}

function renderPolicyDetail(policy) {
    const detail = policy.detail || {};
    const localizedDetail = currentLanguage === "en"
        ? (policyEnglishDetails[policy.id] || {})
        : detail;
    const fallback = t("unavailable");
    const target = detail.link || getPolicyDocumentPath(policy.id);
    const link = `<a class="policy-link" href="${escapeAttribute(target)}" target="_blank" rel="noopener noreferrer">${escapeHtml(t("openPolicy"))}</a>`;

    d3.select("#policyDetail").html(`
        <article class="policy-detail">
            <img class="policy-detail-cover" src="${escapeAttribute(policy.cover)}" alt="${escapeAttribute(getPolicyLabel(policy))}">
            <h3>${escapeHtml(getPolicyLabel(policy))}</h3>
            <dl class="policy-meta">
                ${policyDetailRow(t("publishDate"), detail.date || d3.timeFormat("%Y-%m")(policy.start))}
                ${policyDetailRow(t("policyPeriod"), detail.period || formatPolicyPeriod(policy))}
                ${policyDetailRow(t("agency"), localizedDetail.agency || fallback)}
                ${policyDetailRow(t("content"), localizedDetail.content || fallback)}
                ${policyDetailRow(t("relatedPollutants"), localizedDetail.pollutants || fallback)}
                ${policyDetailRow(t("measures"), localizedDetail.measures || fallback, false, "policy-measures")}
                ${policyDetailRow(t("effect"), localizedDetail.effect || fallback)}
                ${policyDetailRow(t("policyLink"), link, true)}
            </dl>
        </article>
    `);
}

function getPolicyCoverPath(policyId) {
    const fileName = policyCoverFiles[policyId];
    return fileName ? `../assets/overview/policy-covers/${fileName}` : "";
}

function getPolicyDocumentPath(policyId) {
    const coverName = policyCoverFiles[policyId] || "";
    return `../assets/overview/policy-docs/${coverName.replace(/_00\.png$/i, ".pdf")}`;
}

function formatPolicyPeriod(policy) {
    const format = d3.timeFormat("%Y-%m");
    return `${format(policy.start)} — ${format(policy.end)}`;
}

function policyDetailRow(label, value, rawHtml = false, className = "") {
    return `
        <div class="policy-meta-row ${className}">
            <dt>${escapeHtml(label)}</dt>
            <dd>${rawHtml ? value : escapeHtml(value)}</dd>
        </div>
    `;
}

function normalizePolicyName(value) {
    return cleanText(value)
        .replace(/[《》“”"'（）()]/g, "")
        .replace(/[—–]/g, "-")
        .replace(/\s+/g, "")
        .toLowerCase();
}

function cleanText(value) {
    return String(value ?? "").replace(/\s+/g, " ").trim();
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
