/* CONSTANTS AND GLOBALS */
const width = window.innerWidth * 0.7,
  height = window.innerHeight * 0.7,
  margin = { top: 20, bottom: 50, left: 80, right: 40 },
  radius = 5;

// these variables allow us to access anything we manipulate in init() but need access to in draw().
// All these variables are empty before we assign something to them.
let svg;
let xScale;
let yScale;
let colorScale;
let minYear = 2010,
  maxYear = 2010;
let minTransferAvg = 999999999,
  maxTransferAvg = 0;
let programTitles = {};

const programObjective = {
  1: "Provide financial assistance",
  2: "Improve health outcomes",
  3: "Improve nutritional outcomes",
  4: "Improve education outcomes",
  5: "Promote family and community participation",
  6: "Promote technical training and skill building",
  7: "Improve the network of social services",
  8: "Improve the wellbeing of the elderly",
  9: "Tackle the intergenerational transmission of poverty"
};

const programTarget = {
  1: "All households"
};

/* APPLICATION STATE */
let state = {
  data: [],
  programTitles: {},
  selection: "All", // + YOUR FILTER SELECTION
  selectedCountry: "BANGLADESH",
  measure: "rel_covind"
};

/* LOAD DATA */
// + SET YOUR DATA PATH
d3.csv(
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRK5sAFoCHxtBbvbHjY6m8tOrQZtNwIW5GQT5AO71QzYp6kfK11OFeigb5cZlLRYnK0IM_T1ZeevGS1/pub?gid=1337183029&single=true&output=csv",
  d3.autoType
).then(raw_data => {
  const mappedData = raw_data.map(d => {
    maxYear = Math.max(maxYear, d.year);
    minYear = Math.min(minYear, d.year || minYear);

    programTitles[d.title] = true;

    const mappedObj = {};
    [
      "year",
      "region",
      "country",
      "title",
      "id_prog",
      "direct", // annual direct taxes (to know capacity)
      "indirect", // annueal indirect taxes (to know capacity)
      "proobj", // program objective
      "proobj_1", // program objective coded
      "agename", // agency name
      "agetype", // agency type
      "target", //
      "transave", // average amount transferred
      "url", // program url
      "assets", // whether or not allocation is based on assets
      "inctest", // whether or not allocation is based on income
      "recip", // who receives the transfer
      "payreg", // payment regularity
      "rel_covind", // percentage of population receiving benefit
      "rel_covind_povc55" // percentage of those under poverty line receiving benefit
    ].forEach(k => {
      mappedObj[k] = d[k];
    });

    return mappedObj;
  });

  const nestedData = d3
    .nest()
    .key(d => d.country)
    // .key(d => d.title)
    // .key(d => d.year)
    .object(mappedData);

  state.data = nestedData;
  state.rawData = raw_data;
  programTitles = Object.keys(programTitles);
  console.log("initial state", state, raw_data);
  init();
});

/* INITIALIZING FUNCTION */
// this will be run *one time* when the data finishes loading in
function init() {
  // + SCALES
  xScale = d3
    .scaleTime()
    .domain([minYear, 2020])
    .range([margin.left, width - margin.right]);

  yScale = d3
    .scaleLinear()
    .domain([0, 1])
    .range([height - margin.bottom, margin.top]);

  colorScale = d3
    .scaleOrdinal(d3.schemeSet3)
    .domain([0, 1, 2, 3, 4])
    .range(d3.schemeSet3);

  // + AXES
  // AXES
  const xAxis = d3.axisBottom(xScale).tickFormat(d3.format("4"));
  yAxis = d3.axisLeft(yScale);

  // + UI ELEMENT SETUP

  const selectElement = d3.select("#dropdown").on("change", function() {
    // `this` === the selectElement
    // 'this.value' holds the dropdown value a user just selected
    state.selection = this.value; // + UPDATE STATE WITH YOUR SELECTED VALUE
    console.log("new value is", this.value);
    draw(); // re-draw the graph based on this new selection
  });

  // add in dropdown options from the unique values in the data
  selectElement
    .selectAll("option")
    .data(["All", "1", "2", "3"]) // + ADD DATA VALUES FOR DROPDOWN
    .join("option")
    .attr("value", d => d)
    .text(d => d);

  // + SET SELECT ELEMENT'S DEFAULT VALUE (optional)

  // + CREATE SVG ELEMENT
  svg = d3
    .select("#d3-container")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  // + CALL AXES
  svg
    .append("g")
    .attr("class", "axis x-axis")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(xAxis)
    .append("text")
    .attr("class", "axis-label")
    .attr("x", "50%")
    .attr("dy", "3em")
    .text("Year");

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
    .text("Proportion of population");
  draw(); // calls the draw function
}

/* DRAW FUNCTION */
// we call this everytime there is an update to the data/state
function draw() {
  let filteredData, titles;
  const { measure, selectedCountry, data } = state;
  // + FILTER DATA BASED ON STATE
  if (selectedCountry !== null) {
    filteredData = data[selectedCountry];
    titles = Object.keys(
      filteredData.reduce((reducer, d) => {
        reducer[d.title] = true;
        return reducer;
      }, {})
    );
  }

  // Update that y axis!
  yScale.domain([0, d3.max(filteredData, d => d[measure])]);
  d3.select("g.y-axis")
    .transition()
    .duration(1000)
    .call(yAxis.scale(yScale)); // this updates the yAxis' scale to be our newly updated one

  console.log("filteredData", filteredData);

  // + DRAW CIRCLES, if you decide to
  const dot = svg
    .selectAll("circle.dot")
    .data(filteredData, (d, idx) => `${d.year}_${idx})`)
    .join(
      enter => {
        enter
          .append("circle")
          .attr("class", "dot")
          .attr("r", 4)
          .attr("cy", height - margin.bottom)
          .attr("cx", d => xScale(d.year))
          .attr("fill", d => colorScale(d.title))
          .call(selection =>
            selection
              .transition() // initialize transition
              .duration(500) // duration 1000ms / 1s
              .attr("cy", d => {
                return yScale(d[measure]);
              })
          ); // started from the bottom, now we're here
      }, // + HANDLE ENTER SELECTION
      update => update, // + HANDLE UPDATE SELECTION
      exit => exit // + HANDLE EXIT SELECTION
    );

  const dataByProgram = d3
    .nest(filteredData)
    .key(d => d.year)
    .entries(filteredData);

  dataByProgram.forEach(program => {
    drawLine(program);
  });
}
//
// + DRAW LINE AND AREA

function drawLine(data) {
  const lineFunc = d3
    .line()
    .x(d => xScale(d.year))
    .y(d => yScale(d[state.measure]));

  const line = svg
    .selectAll(`path.trend`)
    .data(data)
    .join(
      enter =>
        enter
          .append("path")
          .attr("class", "trend")
          .attr("class", d => `trend ${d.id_prog}`)
          .attr("opacity", 0), // start them off as opacity 0 and fade them in
      update => update, // pass through the update selection
      exit => exit.remove()
    )
    .call(selection =>
      selection
        .transition() // sets the transition on the 'Enter' + 'Update' selections together.
        .duration(1000)
        .attr("opacity", 1)
        .attr("d", d => {
          console.log(lineFunc(d));
          return lineFunc(d) || "M10 10";
        })
        .attr("fill", "none")
        .attr("stroke-width", "4")
        .attr("stroke", "blue")
    );
}
