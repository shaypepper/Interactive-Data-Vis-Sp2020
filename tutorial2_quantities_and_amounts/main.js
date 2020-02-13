// load in csv
d3.csv(
  "https://docs.google.com/spreadsheets/d/1aB0wJ4Pvt0Ww1fM7NWITFhhkVCQr8QWFHYCMqGGkvqc/pub?output=csv#gid=0",
  d3.autoType
).then(data => {
  // once the data loads, console log it
  console.log("data", data);

  const width = window.innerWidth * 0.9,
    height = window.innerHeight / 2,
    paddingInner = 0.2,
    margin = { top: 20, bottom: 40, left: 40, right: 40 },
    field = "Annual 2008";

  /** SCALES */
  // reference for d3.scales: https://github.com/d3/d3-scale
  const xScale = d3
    .scaleLinear()
    .domain([d3.max(data, d => d[field]), 0])
    .range([margin.left, width - margin.right]);

  const yScale = d3
    .scaleBand()
    .domain(data.map(d => d.Activity))
    .range([margin.top, height - margin.bottom])
    .paddingInner(paddingInner);

  // reference for d3.axis: https://github.com/d3/d3-axis
  const xAxis = d3.axisBottom(xScale).ticks(data.length);

  /** MAIN CODE */
  const svg = d3
    .select("#d3-container")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  // append rects
  const rect = svg
    .selectAll("rect")
    .data(data)
    .join("rect")
    .attr("y", d => yScale(d.Activity))
    .attr("x", d => margin.left)
    .attr("height", yScale.bandwidth())
    .attr("width", d => width - margin.left - xScale(d[field]))
    .attr("fill", "steelblue");

  // append text
  const text = svg
    .selectAll("text")
    .data(data)
    .join("text")
    .attr("class", "label")
    // this allows us to position the text in the center of the bar
    .attr("y", d => yScale(d.Activity) - 4)
    .attr("x", d => margin.left)
    .text(d => d.Activity)
    .attr("dy", "1.25em");

  svg
    .append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0, ${height - margin.bottom})`)
    .call(xAxis);
});
