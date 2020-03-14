/**
 * CONSTANTS AND GLOBALS
 * */
const width = window.innerWidth * 0.9,
  height = window.innerHeight * 0.7,
  margin = { top: 20, bottom: 50, left: 60, right: 40 };

/** these variables allow us to access anything we manipulate in
 * init() but need access to in draw().
 * All these variables are empty before we assign something to them.*/
let svg, projection, counties, path, genderDropdown, raceDropdown;

/**
 * APPLICATION STATE
 * */
let state = {
  // + SET UP STATE
  gender: "total",
  raceEthnicity: "total",
  denominator: "total",
  hover: {}
};

/**
 * LOAD DATA
 * Using a Promise.all([]), we can load more than one dataset at a time
 * */
Promise.all([
  d3.json("../../data/tx_counties.geojson"),
  d3.csv("../../data/texas_data.csv", d3.autoType)
]).then(([geojson, data]) => {
  // + SET STATE WITH DATA
  state.geojson = geojson;
  state.data = {};

  const keys = data.columns.slice(3);

  state.genders = new Set(keys.map(k => k.toLowerCase().split(" ")[1]));
  state.raceEthnicities = new Set(keys.map(k => k.toLowerCase().split(" ")[0]));

  data.forEach(d => {
    var countyData =
      state.data[d.County] ||
      (state.data[d.County] = {
        name: d.County
      });

    keys.forEach(key => {
      let [raceEthnicity, gender] = key.toLowerCase().split(" ");
      gender = gender || "total";

      let age;
      switch (d.Age) {
        case "< 1 Year":
          age = 0;
          break;
        case "All Ages":
          age = "total";
          break;
        default:
          age = +d.Age.split(" ")[0];
      }

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
  genderDropdown = d3.select("#gender-dropdown");
  state.genders.forEach(gender => {
    genderDropdown
      .append("option")
      .attr("value", gender)
      .attr("selected", gender === state.gender || undefined)
      .html(gender);
  });

  genderDropdown.on("change", function() {
    state.gender = genderDropdown.node().value;
    draw();
  });
  raceDropdown = d3.select("#race-dropdown");
  state.raceEthnicities.forEach(raceEthnicity => {
    raceDropdown
      .append("option")
      .attr("value", raceEthnicity)
      .attr("selected", raceEthnicity === state.raceEthnicity)
      .html(raceEthnicity);
  });

  // create an svg element in our main `d3-container` element
  svg = d3
    .select("#d3-container")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  // + SET UP PROJECTION
  projection = d3.geoAlbersUsa().fitSize([width, height], state.geojson);
  path = d3.geoPath().projection(projection);
  // + SET UP GEOPATH

  counties = svg
    .selectAll(".county")
    // all of the features of the geojson, meaning all the states as individuals
    .data(state.geojson.features, d => {
      Object.assign(d.properties, {
        demoData: state.data[d.properties.COUNTY.toUpperCase()]
      });
      return d;
    });

  // + DRAW BASE MAP PATH
  // + ADD EVENT LISTENERS (if you want)

  draw(); // calls the draw function
}

/**
 * DRAW FUNCTION
 * we call this everytime there is an update to the data/state
 * */
function draw() {
  counties
    .join("path")
    .attr("d", path)
    .attr("class", "county")
    .attr("fill", d => {
      let {
        properties: { demoData }
      } = d;

      if (!demoData) return;
      let v =
        demoData[state.gender][state.raceEthnicity].total /
        // state.data["STATE OF TEXAS"].total.total.total;
        demoData.total.total.total;

      return d3.interpolateBlues(v);
    })
    .attr("stroke", "gainsboro")
    .on("mouseenter", d => {
      // when the mouse rolls over this feature, do this
      state.hover.county = d.properties.COUNTY;
      console.log(state.hover.county);
      draw(); // re-call the draw function when we set a new hoveredState
    });
}
