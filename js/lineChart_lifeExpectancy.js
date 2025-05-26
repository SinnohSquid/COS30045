function init() {
    d3.csv("/COS30045/csv/RAW OECD Dataset - Life Expectency per year - 2000 to 2022.csv").then(function (data) {
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

    // Dots and tooltips
    series.forEach((country, i) => {
        svg.selectAll(`.dot-${i}`)
            .data(country.values)
            .enter()
            .append("circle")
            .attr("cx", d => xScale(d.year))
            .attr("cy", d => yScale(d.value))
            .attr("r", 3)
            .attr("fill", color(country.name))
            .on("mouseover", (event, d) => {
                tooltip.transition().duration(150).style("opacity", 1);
                tooltip
                    .html(`<strong>${country.name}</strong><br>${d3.timeFormat("%Y")(d.year)}: ${d.value}`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", () => {
                tooltip.transition().duration(300).style("opacity", 0);
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

window.onload = init;
