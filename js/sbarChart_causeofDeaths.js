// js/causeOfDeathChart.js

// Function to initialize and draw the stacked bar chart for cause of death
function initCauseOfDeathChart() {
    // Load both the cause of death data and the event data
    Promise.all([
        d3.csv("csv/OECD Dataset - Categorised Cause of Death by year in Australia - 2000 to 2022 - Filtered - Raw.csv"),
        d3.csv("csv/CauseOfDeathEvents.csv") // Load event data
    ]).then(([data, eventData]) => { // Destructure both loaded datasets
        // Filter for 'Total' sex and parse data
        var filteredData = data
            .filter(d => d.Sex === "Total" && +d.Deaths > 0)
            .map(d => ({
                'Cause of Death': d["Cause of Death"].trim(),
                Year: +d.Year,
                Deaths: +d.Deaths
            }));

        // Dynamically get unique cause of death types for stacking keys
        const uniqueCauses = Array.from(new Set(filteredData.map(d => d["Cause of Death"])));

        // Reshape data for D3's stack layout
        var groupedByYear = d3.group(filteredData, d => d.Year);
        var reshapedData = Array.from(groupedByYear, ([year, values]) => {
            var obj = { Year: year };
            uniqueCauses.forEach(cause => {
                obj[cause] = values.find(v => v["Cause of Death"] === cause)?.Deaths || 0;
            });
            return obj;
        }).sort((a, b) => a.Year - b.Year);

        // Map for cause of death events
        var causeOfDeathEventMap = new Map();
        eventData.forEach(d => {
            var year = parseInt(d.Year);
            var cause = d["Cause of Death"].trim();
            if (cause && !isNaN(year)) {
                // Key: `${Year}_${Cause of Death}` to match specific data points
                causeOfDeathEventMap.set(`${year}_${cause}`, d.Description.trim());
            }
        });

        drawCauseOfDeathChart(reshapedData, uniqueCauses, causeOfDeathEventMap); // Pass the event map
    }).catch(function (error) {
        console.error("Error loading or parsing CSV for cause of death chart:", error);
    });
}

function drawCauseOfDeathChart(data, keys, causeOfDeathEventMap) { // Accept event map as argument
    var containerId = "#chart_causeOfDeath";
    d3.select(containerId).html("");

    var w = 750, h = 450;
    var margin = { top: 30, right: 120, bottom: 60, left: 70 };
    var width = w - margin.left - margin.right;
    var height = h - margin.top - margin.bottom;

    var svg = d3.select(containerId)
        .append("svg")
        .attr("width", w)
        .attr("height", h)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // --- Scales ---
    var xScale = d3.scaleBand()
        .domain(data.map(d => d.Year))
        .range([0, width])
        .padding(0.1);

    var yScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => {
            let total = 0;
            keys.forEach(key => {
                total += d[key] || 0;
            });
            return total;
        })])
        .nice()
        .range([height, 0]);

    var colorScale = d3.scaleOrdinal()
        .domain(keys)
        .range(d3.schemeTableau10);

    // --- Stacking data ---
    var stack = d3.stack()
        .keys(keys)
        .order(d3.stackOrderNone)
        .offset(d3.stackOffsetNone);

    var stackedData = stack(data);

    // --- Axes ---
    svg.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale).tickFormat(d3.format("d")));

    svg.append("g")
        .attr("class", "y-axis")
        .call(d3.axisLeft(yScale));

    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left + 5)
        .attr("x", 0 - (height / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .style("fill", "#f3f4f6")
        .text("Number of Deaths");

    svg.append("text")
        .attr("transform", `translate(${width / 2},${height + margin.bottom - 10})`)
        .style("text-anchor", "middle")
        .style("fill", "#f3f4f6")
        .text("Year");

    // --- Tooltip (for hover) ---
    var tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("background-color", "#1f2937")
        .style("color", "#f3f4f6")
        .style("padding", "8px 12px")
        .style("border-radius", "4px")
        .style("pointer-events", "none")
        .style("opacity", 0)
        .style("font-family", "Inter, sans-serif")
        .style("font-size", "12px");

    function showTooltip(event, d) {
        var deaths = Math.round(d[1] - d[0]);
        const category = d3.select(event.currentTarget.parentNode).datum().key;
        var year = d.data.Year;

        tooltip.html(`<strong>Year:</strong> ${year}<br><strong>${category}:</strong> ${deaths} deaths <br> Click for more info`)
            .style("left", (event.pageX + 15) + "px")
            .style("top", (event.pageY - 28) + "px")
            .transition()
            .duration(200)
            .style("opacity", 1);
    }

    function hideTooltip() {
        tooltip.transition()
            .duration(300)
            .style("opacity", 0);
    }

    // --- Popup (for click) ---
    var popup = d3.select("body")
        .append("div")
        .attr("id", "infoPopup_causeOfDeath")
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
        .html(`<div id="popup-content_causeOfDeath"></div><br><button id="closePopup_causeOfDeath" style="margin-top:10px;">Close</button>`);

    var overlay = d3.select("body")
        .append("div")
        .attr("id", "popupOverlay_causeOfDeath")
        .style("position", "fixed")
        .style("top", "0")
        .style("left", "0")
        .style("width", "100%")
        .style("height", "100%")
        .style("background", "rgba(0, 0, 0, 0.3)")
        .style("display", "none")
        .style("z-index", 999);

    function closePopupCauseOfDeath() {
        popup.style("display", "none");
        overlay.style("display", "none");
    }

    d3.select("#closePopup_causeOfDeath").on("click", closePopupCauseOfDeath);
    overlay.on("click", closePopupCauseOfDeath);


    // --- Draw Bars ---
    svg.append("g")
        .selectAll("g")
        .data(stackedData)
        .enter().append("g")
        .attr("fill", d => colorScale(d.key))
        .selectAll("rect")
        .data(d => d)
        .enter().append("rect")
        .attr("x", d => xScale(d.data.Year))
        .attr("y", d => yScale(d[1]))
        .attr("height", d => yScale(d[0]) - yScale(d[1]))
        .attr("width", xScale.bandwidth())
        .on("mouseover", function (event, d) {
            d3.select(this)
                .transition()
                .duration(100)
                .attr("opacity", 0.7);

            showTooltip(event, d);
        })
        .on("mouseout", function () {
            d3.select(this)
                .transition()
                .duration(200)
                .attr("opacity", 1);
            hideTooltip();
        })
        .on("click", function (event, d) {
            overlay.style("display", "block");
            popup.style("display", "block");

            var deaths = Math.round(d[1] - d[0]);
            const category = d3.select(event.currentTarget.parentNode).datum().key;
            var year = d.data.Year;

            // Get event description
            var eventKey = `${year}_${category}`;
            var eventDescription = causeOfDeathEventMap.get(eventKey) || "";

            // Calculate previous year's value
            let prevYearData = data.find(item => item.Year === year - 1);
            let prevValue = prevYearData ? prevYearData[category] || 0 : null;
            let changeInfo = '';

            if (prevValue !== null) {
                let diff = deaths - prevValue;
                let percentageChange = ((diff / prevValue) * 100).toFixed(1);
                let color = diff > 0 ? "#ef4444" : (diff < 0 ? "#22c55e" : "#facc15");
                let direction = diff > 0 ? "↑ increase" : (diff < 0 ? "↓ decrease" : "→ no change");

                changeInfo = `<p><strong>Change from previous year:</strong> <span style="color: ${color};">${direction} (${percentageChange}%)</span></p>`;
            } else {
                changeInfo = `<p><em>No previous year data available.</em></p>`;
            }

            d3.select("#popup-content_causeOfDeath").html(`
    <h3 style="margin-top:0;">Cause of Death Details</h3>
    <p><strong>Year:</strong> ${year}</p>
    <p><strong>Cause:</strong> ${category}</p>
    <p><strong>Deaths:</strong> ${deaths} deaths</p>
    ${changeInfo}
    <p style="font-size: 13px; opacity: 0.85;">
        ${eventDescription}
    </p>
`);

        });

    // --- Legend ---
    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width + 15}, 0)`);

    const legendItem = legend.selectAll(".legend-item")
        .data(keys.slice().reverse())
        .enter()
        .append("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => `translate(0, ${i * 20})`);

    legendItem.append("rect")
        .attr("width", 10)
        .attr("height", 10)
        .attr("fill", d => colorScale(d));

    legendItem.append("text")
        .attr("x", 15)
        .attr("y", 9)
        .text(d => d)
        .style("font-size", "11px")
        .style("fill", "#f3f4f6");
}