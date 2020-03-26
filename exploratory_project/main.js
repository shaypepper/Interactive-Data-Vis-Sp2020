/**
 * CONSTANTS AND GLOBALS
 * */
const width = window.innerWidth * 0.9,
  height = window.innerHeight * 0.7,
  margin = { top: 20, bottom: 50, left: 60, right: 40 };

/** these variables allow us to access anything we manipulate in
 * init() but need access to in draw().
 * All these variables are empty before we assign something to them.*/
let svg, projection, counties, path, genderDropdown, raceDropdown, infoBox;

/**
 * APPLICATION STATE
 * */
let state = {
  // + SET UP STATE
  geojson: null,
  events: null
};

/**
 * LOAD DATA
 * Using a Promise.all([]), we can load more than one dataset at a time
 * */
Promise.all([d3.json("../data/manhattan.geojson")]).then(([geojson, data]) => {
  // + SET STATE WITH DATA
  state.geojson = geojson;
  state.data = {};

  // SORT DATA BY PUBLISH DATE + EVENT DATE

  init();
});

/**
 * INITIALIZING FUNCTION
 * this will be run *one time* when the data finishes loading in
 * */
function init() {
  // create an svg element in our main `d3-container` element
  svg = d3
    .select("#d3-container")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  // + SET UP PROJECTION
  projection = d3.geoAlbersUsa().fitSize([width, height], state.geojson);
  path = d3.geoPath().projection(projection);

  // CREATE SLIDER
  // CREATE LISTENER FOR SLIDER.

  // DRAW PLAY BUTTON

  // CREATE HEIRARCHY BY PUBLISH DATE

  // MAP LOCATIONS TO LONG-LAT COORDINATES

  drawMap(); // Only needs to be done once probably
  drawPoints();
}

/**
 * DRAW FUNCTION
 * we call this everytime there is an update to the data/state
 * */
function drawMap() {
  svg
    .selectAll(".county")
    // all of the features of the geojson, meaning all the states as individuals
    .data(state.geojson.features, d => d)
    .join(
      enter => {
        enter
          .append("path")
          .attr("d", path)
          .attr("class", "county")
          .attr("fill", "gainsboro")
          .call(enter => {
            enter
              .transition()
              .delay(calculateDelay)
              .duration(300)
              .attr("fill", calculateFill)
              .attr("stroke", calculateStroke);
          });
      },
      update => {
        update
          .transition()
          .delay(calculateDelay)
          .duration(300)
          .attr("fill", calculateFill)
          .attr("stroke", calculateStroke);
      },
      exit => {}
    );
}

function drawPoints() {}

function calculateFill(d) {
  return "gainsboro";
}

function calculateStroke() {
  return "white";
}

function calculateDelay(d) {
  return 50;
}

function recalculateHoverState() {}

function populateDropdown() {}

function updateTooltip() {}

function drawPoints() {}
