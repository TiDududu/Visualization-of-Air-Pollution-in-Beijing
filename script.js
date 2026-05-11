// ===============================
// 1. Setup
// ===============================
const parseDate = d3.timeParse("%Y/%m/%d");
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


const policies = [
    {
        name: "Air Pollution Action Plan",
        label: "Action Plan",
        start: new Date(2013, 8, 1),
        end: new Date(2017, 11, 31),
        color: "#a8d0ff"
    },
    {
        name: "Blue Sky Defence War",
        label: "Blue Sky War",
        start: new Date(2018, 0, 1),
        end: new Date(2020, 11, 31),
        color: "#b7e3b7"
    },
    {
        name: "Post-2020 Air Quality Consolidation",
        label: "Post-2020",
        start: new Date(2021, 0, 1),
        end: new Date(2026, 11, 31),
        color: "#d9c2f0"
    }
];

const yearOptions = ["All", 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];




const svg = d3.select("svg");

const width = +svg.attr("width");
const height = +svg.attr("height");

const margin = {
    top: 60,
    right: 60,
    bottom: 70,
    left: 80
};

const innerWidth = width - margin.left - margin.right;
const innerHeight = height - margin.top - margin.bottom;

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

d3.csv("beijing-air-quality.csv").then(function(data) {

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

    // smoothed dates for global display
    const smoothedData = movingAverage(data, 30);


    let currentMode = "All";
    renderChart(smoothedData);





// draw ALL function for slider switching
function renderChart(chartData) {

    chart.selectAll("*").remove();

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
        .range([innerHeight, 0]);

    // ===============================
    // 4. Axes
    // ===============================

    chart.append("g")
        .attr("transform", `translate(0, ${innerHeight})`)
        .call(d3.axisBottom(xScale));

    chart.append("g")
        .call(d3.axisLeft(yScale));

    // ===============================
    // 5. Policy zones
    // ===============================

    const dateExtent = d3.extent(chartData, d => d.date);

    chart.selectAll(".policy-zone")
        .data(policies)
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
        .attr("height", innerHeight)
        .attr("fill", d => d.color)
        .attr("opacity", 0.55);

    // Policy boundary lines
    chart.selectAll(".policy-boundary")
        .data(policies)
        .enter()
        .append("line")
        .attr("class", "policy-boundary")
        .attr("x1", d => xScale(d3.max([d.start, dateExtent[0]])))
        .attr("x2", d => xScale(d3.max([d.start, dateExtent[0]])))
        .attr("y1", 0)
        .attr("y2", innerHeight)
        .attr("stroke", "#555")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "5,5")
        .attr("opacity", d => {
            const x = xScale(d3.max([d.start, dateExtent[0]]));
            return x === 0 ? 0 : 0.7;
        });

    // Policy labels
    chart.selectAll(".policy-label")
        .data(policies)
        .enter()
        .append("text")
        .attr("class", "policy-label")
        .attr("x", d => {
            const start = d3.max([d.start, dateExtent[0]]);
            const end = d3.min([d.end, dateExtent[1]]);
            return (xScale(start) + xScale(end)) / 2;
        })
        .attr("y", 18)
        .attr("text-anchor", "middle")
        .attr("font-size", 12)
        .attr("font-weight", 700)
        .attr("fill", "#333")
        .attr("opacity", 0.8)
        .text(d => d.label);

    // ===============================
    // 6. Lines
    // ===============================

    if (currentMode === "All") {

        // Full-period mode: 30-day moving average only
        drawLines(chartData, xScale, yScale, 2, 1);

    } else {

        // Year mode: raw daily data + 7-day moving average
        const yearMovingAverage = movingAverage(chartData, 7);

        // raw daily lines: thinner and transparent
        drawLines(chartData, xScale, yScale, 1, 0.25);

        // 7-day moving average lines: clearer main lines
        drawLines(yearMovingAverage, xScale, yScale, 2.5, 1);
    }

    // ===============================
    // 6+. Simple tooltip + crosshair
    // ===============================

    const tooltip = d3.select(".tooltip");

    const crosshair = chart.append("line")
        .attr("class", "crosshair")
        .attr("y1", 0)
        .attr("y2", innerHeight)
        .attr("stroke", "#333")
        .attr("stroke-width", 1)
        .style("opacity", 0);

    const bisectDate = d3.bisector(d => d.date).left;

    const overlay = chart.append("rect")
        .attr("class", "overlay")
        .attr("width", innerWidth)
        .attr("height", innerHeight)
        .attr("fill", "none")
        .attr("pointer-events", "all");

    overlay
        .on("mousemove", function(event) {

            const [mouseX, mouseY] = d3.pointer(event, this);
            const hoveredDate = xScale.invert(mouseX);

            const index = bisectDate(chartData, hoveredDate);
            const d0 = chartData[index - 1];
            const d1 = chartData[index];

            let d;

            if (!d0) {
                d = d1;
            } else if (!d1) {
                d = d0;
            } else {
                d = hoveredDate - d0.date > d1.date - hoveredDate ? d1 : d0;
            }

            const selectedPollutants = getSelectedPollutants();

            crosshair
                .attr("x1", xScale(d.date))
                .attr("x2", xScale(d.date))
                .style("opacity", 1);

            let html = `<strong>${d3.timeFormat("%Y-%m-%d")(d.date)}</strong><br>`;

            selectedPollutants.forEach(p => {
                html += `${pollutantLabels[p]}: ${d[p].toFixed(1)}<br>`;
            });

            const tooltipNode = tooltip.node();

            tooltip
                .html(html)
                .style("opacity", 1);

            const tooltipWidth = tooltipNode.offsetWidth;
            const tooltipHeight = tooltipNode.offsetHeight;

            let left = mouseX + margin.left + 12;
            let top = mouseY + margin.top + 12;

            if (left + tooltipWidth > width) {
                left = mouseX + margin.left - tooltipWidth - 12;
            }

            if (top + tooltipHeight > height) {
                top = mouseY + margin.top - tooltipHeight - 12;
            }

            tooltip
                .style("left", left + "px")
                .style("top", top + "px");
        })
        .on("mouseleave", function() {
            crosshair.style("opacity", 0);
            tooltip.style("opacity", 0);
        });


    // ===============================
    // 7. Legend
    // ===============================

    const legend = chart.append("g")
        .attr("transform", `translate(${innerWidth - 570}, -35)`);

    const legendItems = legend.selectAll(".legend-item")
        .data(pollutants)
        .enter()
        .append("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => `translate(${i * 105}, 0)`);

    legendItems.append("rect")
        .attr("width", 14)
        .attr("height", 14)
        .attr("fill", d => pollutantColors[d]);

    legendItems.append("text")
        .attr("x", 20)
        .attr("y", 11)
        .text(d => pollutantLabels[d])
        .attr("font-size", 13)
        .attr("fill", "#333");

    applyCheckboxVisibility();
}

// function for drawing lines
function drawLines(chartData, xScale, yScale, strokeWidth, opacity) {

    const selectedPollutants = getSelectedPollutants();

    const line = d3.line()
        .x(d => xScale(d.date))
        .y(d => yScale(d.currentValue));

    selectedPollutants.forEach(pollutant => {

        const lineData = chartData.map(d => ({
            date: d.date,
            currentValue: d[pollutant]
        }));

        chart.append("path")
            .datum(lineData)
            .attr("class", `pollutant-line line-${pollutant}`)
            .attr("fill", "none")
            .attr("stroke", pollutantColors[pollutant])
            .attr("stroke-width", strokeWidth)
            .attr("opacity", opacity)
            .attr("d", line);
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

    if (currentMode === "All") {
        renderChart(smoothedData);
    } else {
        const yearData = data.filter(d =>
            d.date.getFullYear() === currentMode
        );

        renderChart(yearData);
    }
});


// ===============================
// 9. Year slider interaction
// ===============================

d3.select("#yearSlider").on("input", function() {

    const sliderValue = +this.value;
    const selectedYear = yearOptions[sliderValue];

    d3.select("#yearLabel")
        .text(selectedYear === "All" ? "All period" : selectedYear);

    if (selectedYear === "All") {
        currentMode = "All";
        renderChart(smoothedData);
    } else {
        currentMode = selectedYear;

        const yearData = data.filter(d =>
            d.date.getFullYear() === selectedYear
        );

        renderChart(yearData);
    }
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
    console.error("Error loading CSV file:", error);
});