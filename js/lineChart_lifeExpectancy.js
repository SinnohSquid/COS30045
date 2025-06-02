function initLineChart() {
    // Load both the life expectancy data and the event data
    Promise.all([
        d3.csv("csv/RAW OECD Dataset - Life Expectency per year - 2000 to 2022.csv"),
        d3.csv("csv/Events by Year.csv")
    ]).then(([lifeData, eventData]) => {
        var selectedCountries = ["Australia", "Japan", "United States", "United Kingdom", "Germany", "France"];

        // Parse and filter life expectancy data
        var parsed = lifeData
            .filter(d => selectedCountries.includes(d["Reference area"]))
            .map(d => ({
                country: d["Reference area"],
                rawYear: +d["TIME_PERIOD"],
                year: new Date(+d["TIME_PERIOD"], 0, 1),
                value: +d["OBS_VALUE"]
            }))
            .filter(d => !isNaN(d.value) && !isNaN(d.rawYear));

        // Group by country
        var grouped = d3.groups(parsed, d => d.country).map(([key, values]) => ({
            name: key,
            values: Array.from(
                d3.rollup(values, v => v[0], d => d.rawYear),
                ([_, d]) => d
            ).sort((a, b) => a.rawYear - b.rawYear)
        }));

        // Map for events
        var eventMap = new Map();
        eventData.forEach(d => {
            var year = parseInt(d.Year);
            var country = d.Country.trim();
            if (country && !isNaN(year)) {
                eventMap.set(`${country}_${year}`, d.Description.trim());
            }
        });

        drawChart(grouped, eventMap);
    });
}

function drawChart(series, eventMap) {
    var w = 750, h = 300;
    var margin = { top: 10, right: 115, bottom: 40, left: 60 };
    var width = w - margin.left - margin.right;
    var height = h - margin.top - margin.bottom;

    d3.select("#chart_lifeExpec").html("");

    var svg = d3.select("#chart_lifeExpec")
        .append("svg")
        .attr("width", w)
        .attr("height", h)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    var xScale = d3.scaleTime()
        .domain([
            d3.min(series, s => d3.min(s.values, d => d.year)),
            d3.max(series, s => d3.max(s.values, d => d.year))
        ])
        .range([0, width]);

    var yScale = d3.scaleLinear()
        .domain([
            d3.min(series, s => d3.min(s.values, d => d.value)),
            d3.max(series, s => d3.max(s.values, d => d.value))
        ])
        .nice()
        .range([height, 0]);

    var every2Years = d3.timeYear.every(2);
    var tickYears = every2Years.range(
        xScale.domain()[0],
        d3.timeYear.offset(xScale.domain()[1], 1)
    );

    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale)
            .tickValues(tickYears)
            .tickFormat(d3.timeFormat("%Y"))
        );

    svg.append("g")
        .call(d3.axisLeft(yScale));

    var line = d3.line()
        .x(d => xScale(d.year))
        .y(d => yScale(d.value))
        .curve(d3.curveLinear);

    var color = d3.scaleOrdinal()
        .domain(series.map(s => s.name))
        .range(d3.schemeTableau10);

    svg.selectAll(".line")
        .data(series)
        .enter()
        .append("path")
        .attr("fill", "none")
        .attr("stroke", d => color(d.name))
        .attr("stroke-width", 2)
        .attr("d", d => line(d.values));

    var tooltip = d3.select("#chart_lifeExpec")
        .append("div")
        .style("position", "absolute")
        .style("background", "#1f2937")
        .style("color", "#f3f4f6")
        .style("padding", "6px 10px")
        .style("font-size", "12px")
        .style("font-family", "Inter, sans-serif")
        .style("border", "1px solid #333")
        .style("border-radius", "4px")
        .style("pointer-events", "none")
        .style("opacity", 0);

    var popup = d3.select("body")
        .append("div")
        .attr("id", "infoPopup")
        .style("position", "fixed")
        .style("top", "50%")
        .style("left", "50%")
        .style("transform", "translate(-50%, -50%)")
        .style("padding", "20px")
        .style("background", "#1f2937")
        .style("color", "#f3f4f6")
        .style("border", "1px solid #333")
        .style("border-radius", "8px")
        .style("box-shadow", "0 4px 12px rgba(0,0,0,0.25)")
        .style("display", "none")
        .style("z-index", 1000)
        .style("max-width", "300px")
        .html(`<div id="popup-content"></div><br><button id="closePopup" style="margin-top:10px;">Close</button>`);

    var overlay = d3.select("body")
        .append("div")
        .attr("id", "popupOverlay")
        .style("position", "fixed")
        .style("top", "0")
        .style("left", "0")
        .style("width", "100%")
        .style("height", "100%")
        .style("background", "rgba(0, 0, 0, 0.3)")
        .style("display", "none")
        .style("z-index", 999);

    function closePopup() {
        popup.style("display", "none");
        overlay.style("display", "none");
    }

    d3.select("#closePopup").on("click", closePopup);
    overlay.on("click", closePopup);

    // Points and popups
    series.forEach((country, i) => {
        svg.selectAll(`.dot-${i}`)
            .data(country.values)
            .enter()
            .append("circle")
            .attr("cx", d => xScale(d.year))
            .attr("cy", d => yScale(d.value))
            .attr("r", 3)
            .attr("fill", color(country.name))
            .attr("cursor", "pointer")
            .on("mouseover", function (event, d) {
                d3.select(this).transition().duration(150).attr("r", 6);
                tooltip.transition().duration(150).style("opacity", 1);
                tooltip
                    .html(`<strong>${country.name}</strong><br>${d3.timeFormat("%Y")(d.year)}: ${d.value}`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function () {
                d3.select(this).transition().duration(150).attr("r", 3);
                tooltip.transition().duration(300).style("opacity", 0);
            })
            .on("click", function (event, d) {
                overlay.style("display", "block");
                popup.style("display", "block");

                const values = country.values;
                const index = values.findIndex(v => v.year.getTime() === d.year.getTime());
                const prev = index > 0 ? values[index - 1].value : null;

                let trendText = "";
                if (prev !== null && !isNaN(prev)) {
                    const diff = d.value - prev;
                    const formatted = Math.abs(diff).toFixed(2);

                    if (diff > 0) {
                        trendText = `<span style="color: #10b981;">▲ Increased by ${formatted}</span>`;
                    } else if (diff < 0) {
                        trendText = `<span style="color: #ef4444;">▼ Decreased by ${formatted}</span>`;
                    } else {
                        trendText = `<span style="color: #d1d5db;">No change from previous year.</span>`;
                    }
                } else {
                    trendText = `<span style="color: #9ca3af;">No previous year data available.</span>`;
                }

                var eventKey = `${country.name}_${d.rawYear}`;
                var eventDescription = eventMap.get(eventKey) || "No specific event data available for this point.";

                // Calculate previous value if available
                let countryData = country.values;
                let index2 = countryData.findIndex(entry => entry.rawYear === d.rawYear);
                let prevValue = index > 0 ? countryData[index2 - 1].value : null;

                let changeInfo = "";
                if (prevValue !== null) {
                    let diff = d.value - prevValue;
                    let percentage = ((diff / prevValue) * 100).toFixed(2);
                    let direction = diff > 0 ? "↑ increase" : (diff < 0 ? "↓ decrease" : "→ no change");
                    let color = diff > 0 ? "#22c55e" : (diff < 0 ? "#ef4444" : "#facc15");

                    changeInfo = `<p><strong>Change:</strong> <span style="color:${color};">${direction} (${percentage}%)</span></p>`;
                } else {
                    changeInfo = "<p><em>No previous year data</em></p>";
                }

                d3.select("#popup-content").html(`
    <h3 style="margin-top:0;">${country.name}</h3>
    <p><strong>Year:</strong> ${d3.timeFormat("%Y")(d.year)}</p>
    <p><strong>Life Expectancy:</strong> ${d.value.toFixed(2)} years</p>
    ${changeInfo}
    <p style="font-size: 13px; opacity: 0.85;">
        ${eventDescription}
    </p>
`);

            });


    });

    // Legend
    var legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width + 15}, 0)`);

    var legendItem = legend.selectAll(".legend-item")
        .data(series)
        .enter()
        .append("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => `translate(0, ${i * 20})`);

    legendItem.append("rect")
        .attr("width", 10)
        .attr("height", 10)
        .attr("fill", d => color(d.name));

    legendItem.append("text")
        .attr("x", 15)
        .attr("y", 9)
        .text(d => d.name)
        .style("font-size", "11px")
        .style("fill", "#f3f4f6");
}

window.onload = initLineChart;