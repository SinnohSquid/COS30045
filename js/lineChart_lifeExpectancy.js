// lineChart_lifeExpectancy.js

function initLineChart() {
    d3.csv("../csv/RAW OECD Dataset - Life Expectency per year - 2000 to 2022.csv").then(function (data) {
        var selectedCountries = ["Australia", "Japan", "United States", "United Kingdom", "Germany", "France"];

        // 1) Parse and clean
        var parsed = data
            .filter(d => selectedCountries.includes(d["Reference area"]))
            .map(d => ({
                country: d["Reference area"],
                rawYear: +d["TIME_PERIOD"],
                year: new Date(+d["TIME_PERIOD"], 0, 1),
                value: +d["OBS_VALUE"]
            }))
            .filter(d => !isNaN(d.value) && !isNaN(d.rawYear));

        // 2) Group by country, then sort each group by year
        var grouped = d3.groups(parsed, d => d.country).map(([key, values]) => ({
            name: key,
            values: Array.from(
                d3.rollup(values, v => v[0], d => d.rawYear), // de-dupe by year
                ([year, d]) => d
            ).sort((a, b) => a.rawYear - b.rawYear)
        }));

        // Sanity check in console
        console.log("Series preview:", grouped);

        drawChart(grouped);
    });
}

function drawChart(series) {
    var w = 750, h = 300;
    var margin = { top: 10, right: 100, bottom: 40, left: 60 };
    var width = w - margin.left - margin.right;
    var height = h - margin.top - margin.bottom;

    d3.select("#chart_lifeExpec").html("");

    var svg = d3.select("#chart_lifeExpec")
        .append("svg")
        .attr("width", w)
        .attr("height", h)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Scales
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

    // Axes
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale).ticks(6).tickFormat(d3.timeFormat("%Y")));

    svg.append("g")
        .call(d3.axisLeft(yScale));

    // Line generator
    var line = d3.line()
        .x(d => xScale(d.year))
        .y(d => yScale(d.value))
        .curve(d3.curveLinear); // You can try curveMonotoneX later if needed

    var color = d3.scaleOrdinal()
        .domain(series.map(s => s.name))
        .range(d3.schemeTableau10);

    // Draw lines
    svg.selectAll(".line")
        .data(series)
        .enter()
        .append("path")
        .attr("fill", "none")
        .attr("stroke", d => color(d.name))
        .attr("stroke-width", 2)
        .attr("d", d => line(d.values));

    // Tooltips
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

    // Create external popup div
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
    // Fullscreen overlay behind popup
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


    // Close handler
    function closePopup() {
        popup.style("display", "none");
        overlay.style("display", "none");
    }

    d3.select("#closePopup").on("click", closePopup);
    overlay.on("click", closePopup);


    // Dots and tooltips with interactivity
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
                d3.select(this)
                    .transition().duration(150)
                    .attr("r", 6);

                tooltip.transition().duration(150).style("opacity", 1);
                tooltip
                    .html(`<strong>${country.name}</strong><br>${d3.timeFormat("%Y")(d.year)}: ${d.value}`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function () {
                d3.select(this)
                    .transition().duration(150)
                    .attr("r", 3);

                tooltip.transition().duration(300).style("opacity", 0);
            })
            .on("click", function (event, d) {
                overlay.style("display", "block");
                popup.style("display", "block");

                let extraInsight = "";

                // === Start of Conditional Logic for Popup Text ===
                // add in more as we find more information on this.
                if (d.country === "Japan" && d.rawYear === 2022) {
                    extraInsight = "Japan consistently has one of the highest life expectancies globally, reflecting strong healthcare and healthy lifestyles.";
                } else if (d.country === "Australia" && d.rawYear >= 2015) {
                    extraInsight = "Australia's life expectancy has shown steady gains in recent years, though challenges like obesity remain.";
                } else if (d.country === "United States") {
                    extraInsight = "Life expectancy in the US has fluctuated, with specific challenges related to certain health crises and healthcare access.";
                } else if (d.country === "United Kingdom" && d.rawYear === 2000) {
                    extraInsight = "At the turn of the millennium, the UK's life expectancy was on an upward trend, setting the stage for future improvements.";
                }
                else {
                    extraInsight = "";
                }
                // === End of Conditional Logic for Popup Text ===


                d3.select("#popup-content").html(`
                    <h3 style="margin-top:0;">${country.name}</h3>
                    <p><strong>Year:</strong> ${d3.timeFormat("%Y")(d.year)}</p>
                    <p><strong>Life Expectancy:</strong> ${d.value}</p>
                    <p style="font-size: 13px; opacity: 0.8;">
                        ${extraInsight}
                    </p>
                `);
            });

    });

    // Country labels at end of each line
    svg.selectAll(".label")
        .data(series)
        .enter()
        .append("text")
        .datum(d => ({ name: d.name, value: d.values[d.values.length - 1] }))
        .attr("transform", d => `translate(${xScale(d.value.year) + 5},${yScale(d.value.value)})`)
        .style("font-size", "11px")
        .style("fill", d => color(d.name))
        .text(d => d.name);
}