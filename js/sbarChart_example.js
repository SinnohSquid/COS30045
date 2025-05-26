function initSbarChart() {
    // 0) Define the raw dataset here (objects, not arrays)
    var dataset = [
        { apples: 5, oranges: 10, grapes: 22 },
        { apples: 4, oranges: 12, grapes: 28 },
        { apples: 2, oranges: 19, grapes: 32 },
        { apples: 7, oranges: 23, grapes: 35 },
        { apples: 23, oranges: 17, grapes: 43 }
    ];

    // Kick off the chart
    sbarChart(dataset, "#sbarchart_example");
}

function sbarChart(dataset, containerId) {
    // 1) Dimensions
    var w = 500,
        h = 300,
        padding = 40;

    // 2) The keys to stack
    var keys = ["grapes", "oranges", "apples"];

    // 3) Compute the stack series from your real dataset
    var stack = d3.stack().keys(keys);
    var series = stack(dataset);
    // series is now an array of three arrays:
    //   series[0] = apples layer:    [[0,5],[0,4],…]
    //   series[1] = oranges layer:   [[5,15],[4,16],…]
    //   series[2] = grapes layer:    [[15,37],[16,44],…]

    // 4) Color scale
    var color = d3.scaleOrdinal(d3.schemeCategory10);

    // 5) X and Y scales
    var xScale = d3.scaleBand()
        .domain(d3.range(dataset.length))  // one tick per object
        .range([padding, w - padding])
        .padding(0.1);

    // find the total max height
    var yMax = d3.max(dataset, function (d) {
        return d.apples + d.oranges + d.grapes;
    });

    var yScale = d3.scaleLinear()
        .domain([0, yMax])
        .range([h - padding, padding]);

    // 6) Create the SVG
    var svg = d3.select(containerId)
        .append("svg")
        .attr("width", w)
        .attr("height", h);

    // 7) One <g> for each “layer” in the stack
    var groups = svg.selectAll("g.layer")
        .data(series)
        .enter().append("g")
        .attr("class", "layer")
        .attr("fill", function (d, i) { return color(i); });

    // 8) Within each layer, one <rect> per data point
    groups.selectAll("rect")
        .data(function (layer) { return layer; })   // layer is an array of [y0,y1] pairs
        .enter().append("rect")
        .attr("x", function (d, i) { return xScale(i); })
        .attr("y", function (d) { return yScale(d[1]); })             // top edge
        .attr("height", function (d) { return yScale(d[0]) - yScale(d[1]); }) // height = y0–y1
        .attr("width", xScale.bandwidth());
}
