// js/avoidableDeathsChart.js

// Function to initialize and draw the stacked bar chart for avoidable deaths
function initAvoidableDeathsChart() {
    // Define the path to your CSV file
    // Assuming 'js' and 'csv' folders are siblings to the 'index.html' file
    // and this JS file is inside the 'js' folder.
    d3.csv("csv/OECD Dataset - Avoidable Deaths in Australia - 2000 to 2022 - FIltered - Raw.csv").then(function (data) {
        // Filter out 'Avoidable mortality' and non-'Total' sex data
        // Also ensure 'Deaths' and 'Year' are numbers
        var filteredData = data
            .filter(d => d.Sex === "Total" && (d["Mortality Type"] === "Preventable mortality" || d["Mortality Type"] === "Treatable mortality"))
            .map(d => ({
                'Mortality Type': d["Mortality Type"],
                Year: +d.Year, // Convert year to number
                Deaths: +d.Deaths // Convert deaths to number
            }));

        // Reshape data for D3's stack layout
        // The stack layout expects an array of objects, where each object represents a 'stack' (e.g., a year)
        // and has properties for each 'series' (e.g., "Preventable mortality", "Treatable mortality").
        var groupedByYear = d3.group(filteredData, d => d.Year);
        var reshapedData = Array.from(groupedByYear, ([year, values]) => {
            var obj = { Year: year };
            values.forEach(v => {
                obj[v["Mortality Type"]] = v.Deaths;
            });
            return obj;
        }).sort((a, b) => a.Year - b.Year); // Sort by year ascending to ensure correct x-axis order

        // Define the keys for the stack (the categories that will be stacked)
        var keys = ["Preventable mortality", "Treatable mortality"];

        console.log("Reshaped data for stacked chart:", reshapedData); // Debugging
        console.log("Stacking keys:", keys); // Debugging

        drawAvoidableDeathsChart(reshapedData, keys);
    }).catch(function (error) {
        console.error("Error loading or parsing CSV for avoidable deaths chart:", error);
    });
}

function drawAvoidableDeathsChart(data, keys) {
    var containerId = "#chart_avoidableDeaths";
    d3.select(containerId).html(""); // Clear any existing content in the container

    var w = 750, h = 450; // Total width and height for the SVG
    var margin = { top: 30, right: 30, bottom: 60, left: 70 }; // Margins for the chart area
    var width = w - margin.left - margin.right; // Width of the drawable area
    var height = h - margin.top - margin.bottom; // Height of the drawable area

    // Append the SVG element to the container
    var svg = d3.select(containerId)
        .append("svg")
        .attr("width", w)
        .attr("height", h)
        .append("g") // Group for the main chart content, translated by margins
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // --- Scales ---
    // X-scale for years (band scale for discrete bars)
    var xScale = d3.scaleBand()
        .domain(data.map(d => d.Year)) // Domain is all unique years
        .range([0, width]) // Map years to the width of the chart
        .padding(0.1); // Padding between bars

    // Y-scale for deaths (linear scale)
    var yScale = d3.scaleLinear()
        // Domain from 0 to the maximum total deaths for any given year
        .domain([0, d3.max(data, d => d["Preventable mortality"] + d["Treatable mortality"])])
        .nice() // Extend domain to nice round numbers
        .range([height, 0]); // Map deaths to the height (inverted for SVG coords)

    // Color scale for the mortality types
    // Using a custom color scheme for consistency
    var customColors = {
        "Preventable mortality": "#FF7F0E", // A distinct orange
        "Treatable mortality": "#1F77B4"    // A distinct blue
    };
    var colorScale = d3.scaleOrdinal()
        .domain(keys) // Domain are the mortality types
        .range(keys.map(key => customColors[key])); // Map types to custom colors

    // --- Stacking data ---
    // D3's stack generator
    var stack = d3.stack()
        .keys(keys) // Tell the stack generator which keys to stack
        .order(d3.stackOrderNone) // Keep the order as defined in keys
        .offset(d3.stackOffsetNone); // Stack from zero (standard stacking)

    // Apply the stack generator to your reshaped data
    var stackedData = stack(data);

    console.log("Stacked data structure:", stackedData); // Debugging the stacked output


    // --- Axes ---
    // X-axis (bottom)
    svg.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${height})`) // Position at the bottom of the chart
        .call(d3.axisBottom(xScale).tickFormat(d3.format("d"))); // Format year as integer

    // Y-axis (left)
    svg.append("g")
        .attr("class", "y-axis")
        .call(d3.axisLeft(yScale));

    // Y-axis label
    svg.append("text")
        .attr("transform", "rotate(-90)") // Rotate for vertical label
        .attr("y", 0 - margin.left + 5)
        .attr("x", 0 - (height / 2)) // Center vertically
        .attr("dy", "1em") // Adjust vertical position
        .style("text-anchor", "middle")
        .style("fill", "#f3f4f6") // Text color from the CSS
        .text("Number of Deaths");

    // X-axis label
    svg.append("text")
        .attr("transform", `translate(${width / 2},${height + margin.bottom - 10})`) // Position below X-axis
        .style("text-anchor", "middle")
        .style("fill", "#f3f4f6") // Text color
        .text("Year");


    // --- Draw Bars ---
    // Create a group for each stacked series (e.g., "Preventable mortality" layer, "Treatable mortality" layer)
    svg.append("g")
        .selectAll("g")
        .data(stackedData) // Bind the stacked data to these groups
        .enter().append("g")
        .attr("fill", d => colorScale(d.key)) // Set fill color based on the series key
        .selectAll("rect")
        .data(d => d) // Bind the individual segments within each series group
        .enter().append("rect")
        .attr("x", d => xScale(d.data.Year)) // X position of the bar (year)
        .attr("y", d => yScale(d[1])) // Y position of the bar (top of the segment)
        .attr("height", d => yScale(d[0]) - yScale(d[1])) // Height of the segment
        .attr("width", xScale.bandwidth()) // Width of the bar (from x-scale padding)
        .on("mouseover", function (event, d) {
            d3.select(this)
                .transition()
                .duration(100)
                .attr("opacity", 0.7); // Dim on hover

            showTooltip(event, d, this); // Show tooltip
        })
        .on("mouseout", function () {
            d3.select(this)
                .transition()
                .duration(200)
                .attr("opacity", 1); // Restore opacity
            hideTooltip(); // Hide tooltip
        });


    // --- Legend ---
    var legend = svg.append("g")
        .attr("font-family", "Inter, sans-serif")
        .attr("font-size", 10)
        .attr("text-anchor", "end") // Align text to the end
        .selectAll("g")
        // Iterate over keys, reversed for more logical top-to-bottom legend matching bar stack
        .data(keys.slice().reverse())
        .enter().append("g")
        .attr("transform", (d, i) => `translate(0,${i * 20})`); // Position each legend item

    legend.append("rect")
        .attr("x", width - 19) // X position for the color swatch
        .attr("width", 19)
        .attr("height", 19)
        .attr("fill", colorScale); // Fill with corresponding color

    legend.append("text")
        .attr("x", width - 24) // X position for the text
        .attr("y", 9.5) // Y position for the text
        .attr("dy", "0.32em") // Vertical alignment
        .style("fill", "#f3f4f6") // Text color
        .text(d => d); // The mortality type name

    // --- Tooltip ---
    // Create a div for the tooltip outside the SVG
    var tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("background-color", "#1f2937")
        .style("color", "#f3f4f6")
        .style("padding", "8px 12px")
        .style("border-radius", "4px")
        .style("pointer-events", "none") // Ensures tooltip doesn't block mouse events on elements below it
        .style("opacity", 0) // Initially hidden
        .style("font-family", "Inter, sans-serif")
        .style("font-size", "12px");

    // Function to display the tooltip
    function showTooltip(event, d, element) {
        // d is the individual segment data: [startValue, endValue, dataObjectForYear]
        var deaths = Math.round(d[1] - d[0]); // Calculate the actual value for this segment
        // Find the category (key) for the current segment from the stackedData
        var category = stackedData.find(s => s.some(segment => segment === d)).key;
        var year = d.data.Year; // Get the year from the original data object

        // --- Trend Comparison Logic ---
        let prevYearData = data.find(item => item.Year === year - 1);
        let prevValue = prevYearData ? prevYearData[category] || 0 : null;

        let changeInfo = "";
        if (prevValue !== null) {
            let diff = deaths - prevValue;
            let percentage = ((diff / prevValue) * 100).toFixed(1);
            let direction = diff > 0 ? "↑ increase" : (diff < 0 ? "↓ decrease" : "→ no change");
            let color = diff > 0 ? "#ef4444" : (diff < 0 ? "#22c55e" : "#facc15");

            changeInfo = `<br><strong>Change:</strong> <span style="color:${color};">${direction} (${percentage}%)</span>`;
        } else {
            changeInfo = "<br><em>No previous year data</em>";
        }

        tooltip.html(
            `<strong>Year:</strong> ${year}<br><strong>${category}:</strong> ${deaths} deaths${changeInfo}`
        )
            .style("left", (event.pageX + 15) + "px")
            .style("top", (event.pageY - 28) + "px")
            .transition()
            .duration(200)
            .style("opacity", 1);

    }

    // Function to hide the tooltip
    function hideTooltip() {
        tooltip.transition()
            .duration(300)
            .style("opacity", 0); // Fade out
    }
}