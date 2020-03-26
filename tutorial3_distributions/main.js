/**
 * CONSTANTS AND GLOBALS
 * */
const width = window.innerWidth * 0.7,
  height = width * 0.6,
  margin = { top: 20, bottom: 50, left: 20, right: 20 },
  radius = 5;

/** these variables allow us to access anything we manipulate in
 * init() but need access to in draw().
 * All these variables are empty before we assign something to them.*/
let svg;
let xScale;
let yScale;

/**
 * APPLICATION STATE
 * */
let state = {
  data: [],
  selectedBook: "All books",
  books: []
};

/**
 * LOAD DATA
 * */
d3.csv("../../data/wheres-waldo-locations.csv", d3.autoType).then(raw_data => {
  console.log("raw_data", raw_data);
  state.data = raw_data;
  state.books = [...new Set(raw_data.map(d => d.Book))].sort((a, b) => a - b);
  console.log(state);
  init();
});

/**
 * INITIALIZING FUNCTION
 * this will be run *one time* when the data finishes loading in
 * */
function init() {
  // SCALES
  xScale = d3
    .scaleLinear()
    .domain(d3.extent(state.data, d => d.X))
    .range([margin.left, width - margin.right]);

  yScale = d3
    .scaleLinear()
    .domain(d3.extent(state.data, d => d.Y))
    .range([height - margin.bottom, margin.top]);

  // AXES
  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3.axisLeft(yScale);

  // UI ELEMENT SETUP
  // add dropdown (HTML selection) for interaction
  // HTML select reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/select
  const selectElement = d3.select("#dropdown").on("change", function() {
    console.log("new selected party is", this.value);
    // `this` === the selectElement
    // this.value holds the dropdown value a user just selected
    state.selectedBook = this.value === "All books" ? "All books" : +this.value;

    draw(); // re-draw the graph based on this new selection
  });

  // add in dropdown options from the unique values in the data
  selectElement
    .selectAll("option")
    .data(["All books", ...state.books]) // unique data values-- (hint: to do this programmatically take a look `Sets`)
    .join("option")
    .attr("value", d => d)
    .text(d => (typeof d === "number" ? `Book ${d}` : d));

  // create an svg element in our main `d3-container` element
  svg = d3
    .select("#d3-container")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  // add the xAxis
  svg
    .append("g")
    .attr("class", "axis x-axis")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(xAxis)
    .append("text")
    .attr("class", "axis-label")
    .attr("x", "50%")
    .attr("dy", "3em")
    .text("Ideology Rating");

  // add the yAxis
  svg
    .append("g")
    .attr("class", "axis y-axis")
    .attr("transform", `translate(${margin.left},0)`)
    .call(yAxis)
    .append("text")
    .attr("class", "axis-label")
    .attr("y", "50%")
    .attr("dx", "-3em")
    .attr("writing-mode", "vertical-rl")
    .text("Environmental Rating");

  draw(); // calls the draw function
}

/**
 * DRAW FUNCTION
 * we call this everytime there is an update to the data/state
 * */
function draw() {
  console.log("drawing");
  // filter the data for the selectedParty
  let filteredData = state.data;
  if (state.selectedBook !== "All books") {
    console.log(`filtering!${state.selectedBook}**`);
    filteredData = state.data.filter(d => {
      return d.Book === state.selectedBook;
    });
  }
  console.log(filteredData);
  const dot = svg
    .selectAll(".dot")
    .data(filteredData, d => `${d.Book}-${d.Page}`) // use `d.name` as the `key` to match between HTML and data elements
    .join(
      enter =>
        // enter selections -- all data elements that don't have a `.dot` element attached to them yet
        enter
          .append("image")
          .attr("class", "dot") // Note: this is important so we can identify it in future updates
          .attr("href", "../assets/img/waldo.png")
          .attr("height", "25px")
          .attr("width", "25px")
          .attr("transform", "scale(0.1)")
          .attr("stroke", "lightgrey")
          .attr("opacity", 0)
          .attr("r", radius)
          .attr("y", d => yScale(d.Y) - 12.5)
          .attr("x", d => xScale(d.X) - 12.5)
          .call(enter =>
            enter
              .transition() // initialize transition
              .delay(d => 50 * d.X) // delay on each element
              .duration(500) // duration 500ms
              .attr("opacity", 1)
              .attr("transform", "scale(1)")
          ),
      update =>
        update.call(update =>
          // update selections -- all data elements that match with a `.dot` element
          update
            .transition()
            .duration(250)
            .attr("height", "50px")
            .attr("width", "50px")
            .transition()
            .duration(600)
            .attr("opacity", 1)
            .attr("height", "25px")
            .attr("width", "25px")
        ),
      exit =>
        exit.call(exit =>
          // exit selections -- all the `.dot` element that no longer match to HTML elements
          exit
            .transition()
            .delay(d => 50 * d.X)
            .duration(500)
            .attr("transform", "scale(0.1)")
            .attr("opacity", 0)
            .remove()
        )
    );
}
