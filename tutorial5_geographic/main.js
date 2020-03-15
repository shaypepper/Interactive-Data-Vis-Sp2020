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
  data: null,
  genders: null,
  raceEthnicities: null,

  hover: {
    county: null,
    total: null,
    rawNumber: null,
    percentage: null,
    selected: false
  },

  selection: {
    gender: "total",
    raceEthnicity: "hispanic",
    county: null
  },

  // I wrote my transform function so that if I had the time, I could change denominators.
  // I also wanted to do a slider for ages. Let's see how the rest of these tutorials go.
  denominator: "total"
};

/**
 * LOAD DATA
 * Using a Promise.all([]), we can load more than one dataset at a time
 * */
Promise.all([
  d3.json("../data/tx_counties.geojson"),
  d3.csv("../data/texas_data.csv", d3.autoType)
]).then(([geojson, data]) => {
  // + SET STATE WITH DATA
  state.geojson = geojson;
  state.data = {};

  const keys = data.columns.slice(3);

  state.genders = new Set(keys.map(k => k.toLowerCase().split(" ")[1]));
  state.raceEthnicities = new Set(keys.map(k => k.toLowerCase().split(" ")[0]));

  data.forEach(d => {
    var countyData = (state.data[d.County] = state.data[d.County] || {});

    keys.forEach(key => {
      let [raceEthnicity, gender] = key.toLowerCase().split(" ");
      gender = gender || "total";

      let age =
        { "< 1 Year": 0, "All Ages": "total" }[d.Age] || +d.Age.split(" ")[0];

      countyData[gender] = countyData[gender] || {};
      countyData[gender][raceEthnicity] =
        countyData[gender][raceEthnicity] || {};

      countyData[raceEthnicity] = countyData[raceEthnicity] || {};
      countyData[raceEthnicity][gender] =
        countyData[raceEthnicity][gender] || {};

      countyData[gender][raceEthnicity][age] = d[key];
      countyData[raceEthnicity][gender][age] = d[key];
    });
  });
  console.log("state: ", state);
  init();
});

/* 
{
  name: "Dallas County",
  male: {
    anglo: {
      total: 0,
      0: 0,
      1: 0,
      // ...
      85: 0
    },
    black: {},
    hispanic: {},
    other: {}
  },
  female: {
    // ...
  },
  total: {
    // ...
  }
};

/**
 * INITIALIZING FUNCTION
 * this will be run *one time* when the data finishes loading in
 * */
function init() {
  // define and populate dropdowns
  populateDropdown(
    d3.select("#gender-dropdown-container"),
    state.genders,
    "gender"
  );
  populateDropdown(
    d3.select("#race-dropdown-container"),
    state.raceEthnicities,
    "raceEthnicity"
  );

  // create an svg element in our main `d3-container` element
  svg = d3
    .select("#d3-container")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  // + SET UP PROJECTION
  projection = d3.geoAlbersUsa().fitSize([width, height], state.geojson);
  path = d3.geoPath().projection(projection);

  draw(); // calls the draw function
}

/**
 * DRAW FUNCTION
 * we call this everytime there is an update to the data/state
 * */
function draw() {
  svg
    .selectAll(".county")
    // all of the features of the geojson, meaning all the states as individuals
    .data(state.geojson.features, d => d.properties.COUNTY.toUpperCase())
    .join(
      enter => {
        enter
          .append("path")
          .attr("d", path)
          .attr("class", "county")
          .attr("fill", "white")
          .on("mouseenter", d => {
            // Disable tooltip update until a deseltion or a new selection
            const { COUNTY: county } = d.properties;
            const { county: hoverCounty, selected } = state.hover;
            if (selected && hoverCounty !== county) return;

            recalculateHoverState(county);
            updateTooltip();
            // draw(); // re-call the draw function when we set a new hoveredState
          })
          .on("mouseleave", d => {
            if (state.hover.selected) return;
            const { COUNTY: county } = d.properties;
            state.hover = {};
            updateTooltip();
          })
          .on("click", d => {
            const { COUNTY: county } = d.properties;
            const { county: hoverCounty, selected } = state.hover;
            // make current county the selection, unless it's already selected. In that case deselect.
            if (hoverCounty === county) {
              state.hover.selected = !selected;
            } else {
              recalculateHoverState(county, true);
              updateTooltip();
            }
            draw();
          })
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

function calculateFill(d) {
  const {
    properties: { COUNTY: county }
  } = d;
  const {
    selection: { raceEthnicity, gender },
    data,
    hover: { selected, county: hoverCounty }
  } = state;
  const demoData = data[county.toUpperCase()];

  if (county === hoverCounty && selected) return "firebrick";
  if (!demoData) return "white";

  let v = demoData[gender][raceEthnicity].total / demoData.total.total.total;
  // if there is a selected county, shading should be altered for unselected counties
  return d3.interpolateBlues(selected ? v / 3 : v);
}

function calculateStroke() {
  return state.hover.selected ? "rgb(250,250,250)" : "rgb(220,220,220)";
}

function calculateDelay(d) {
  let [x, y] = d.geometry.coordinates[0][0];
  // Sometimes the numbers you wants are nested one further than expected...
  if (typeof x !== "number") {
    [x, y] = x;
  }

  // I know this math looks crazy but that's just because it is.
  // I wanted a sort of popcorn effect that sweeps from the top left corner to the bottom right.
  return (x - y + 150 + Math.random() * 5) * 12 || 800;
}

function recalculateHoverState(county = state.hover.county) {
  const { raceEthnicity, gender } = state.selection;

  const demoData = state.data[(county || "").toUpperCase()];
  let total = demoData && demoData.total.total.total;
  let rawNumber = demoData && demoData[gender][raceEthnicity].total;

  state.hover = {
    county,
    total,
    rawNumber,
    percentage: rawNumber / total,
    selected: state.hover.selected
  };
}

function populateDropdown(container, optionValues, stateKey) {
  const selectEl = container.append("select");
  optionValues.forEach(item => {
    if (!item) return;
    selectEl
      .append("option")
      .attr("value", item)
      .attr("selected", item === state[stateKey] || undefined)
      .html(`${stateKey}: ${item}`);
  });
  selectEl.on("change", function() {
    state.selection[stateKey] = selectEl.node().value;
    recalculateHoverState();
    updateTooltip();
    draw();
  });
}

function updateTooltip() {
  const {
    selection: { gender, raceEthnicity },
    hover: { county, percentage, rawNumber, total }
  } = state;

  if (!county) {
    return d3.select(".tooltip > h3").html("");
  }

  const nSelections = (raceEthnicity !== "total") + (gender !== "total");
  let selectionText = "human";
  if (nSelections == 2) {
    selectionText = `${raceEthnicity} and ${gender}`;
  } else if (nSelections == 1) {
    selectionText = raceEthnicity === "total" ? gender : raceEthnicity;
  }

  d3.select(".tooltip > h3").html(
    `${county}  <br />
    ${d3.format(",")(total)} residents <br />
    ${d3.format(".2%")(percentage)} (${d3.format(",")(rawNumber)})
     are ${selectionText}`
  );
}
