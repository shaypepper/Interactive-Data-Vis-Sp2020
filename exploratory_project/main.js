/**
 * CONSTANTS AND GLOBALS
 * */
const width = window.innerWidth * 0.7,
  mapWidth = width / 2,
  height = window.innerHeight * 0.8,
  margin = { top: 20, bottom: 50, left: 60, right: 40 },
  sevenDays = 604800000;

/** these variables allow us to access anything we manipulate in
 * init() but need access to in draw().
 * All these variables are empty before we assign something to them.*/
let svg,
  projection,
  counties,
  path,
  genderDropdown,
  raceDropdown,
  infoBox,
  week,
  totalEvents,
  playButton;

/**
 * APPLICATION STATE
 * */
let state = {
  // + SET UP STATE
  geojson: null,
  articles: null,
  locations: [],
  hover: {
    latitude: null,
    longitude: null,
    state: null
  },
  startDate: new Date("2000-01-04"),
  endDate: new Date("2016-06-12"),
  currentDate: new Date("2016-06-12"),
  playSpeed: 200
};

/**
 * LOAD DATA
 * Using a Promise.all([]), we can load more than one dataset at a time
 * */
Promise.all([
  d3.json("../data/manhattan.geojson"),
  d3.csv("../data/evening_hours.csv", d3.autoType),
  d3.csv(
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vTP7a4JsTDRMneysdxbhILySZbJ0NtxKrJPuYkPhBvNMT74d4B_7Oazju2U3b9wAs-abuMVqHscNmFD/pub?gid=1601565251&single=true&output=csv",
    d3.autoType
  )
]).then(([geojson, articles, locations]) => {
  // + SET STATE WITH DATA
  const excludedNeighborhoods = new Set([
    "Washington Heights",
    "Inwood",
    "Marble Hill",
    "Governors Island",
    "Ellis Island",
    "Liberty Island"
  ]);
  console.log(geojson, new Array(geojson));
  geojson.features = geojson.features.filter(f => {
    return !excludedNeighborhoods.has(f.properties.name);
  });
  state.geojson = geojson;
  state.data = {};
  state.locations = new Map(
    locations.map(location => [
      location.place,
      { longitude: location.longitude, latitude: location.latitude }
    ])
  );
  state.publishDates = new Set(articles.map(a => a.publishDate.toString()));

  state.articles = articles.map((a, i) => {
    a.index = i;
    return a;
  });

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
  projection = d3
    .geoAlbersUsa()
    .scale(1)
    .fitSize([mapWidth, height], state.geojson);

  path = d3.geoPath().projection(projection);

  playButton = d3.select("#play_button").on("click", () => {
    console.log("click!");
    state.currentDate = new Date("2000-01-01");
    drawPointsInSequence();
  });

  pauseButton = d3.select("#pause_button").on("click", () => {
    clearInterval(state.playInterval);
  });

  week = d3.select("#week");

  svg.on("mousemove", () => {
    // we can use d3.mouse() to tell us the exact x and y positions of our cursor
    const [mx, my] = d3.mouse(svg.node());
    // projection can be inverted to return [lat, long] from [x, y] in pixels
    const proj = projection.invert([mx, my]);
    state.hover["longitude"] = proj[0];
    state.hover["latitude"] = proj[1];
    // drawMap();
  });

  // CREATE SLIDER
  // CREATE LISTENER FOR SLIDER.

  // DRAW PLAY BUTTON

  // CREATE HEIRARCHY BY PUBLISH DATE

  // MAP LOCATIONS TO LONG-LAT COORDINATES

  drawMap(); // Only needs to be done once probably
  // drawPoints();
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
          .on("mouseenter", d => {
            state.hover.neighborhood = d.properties.name;
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

function drawPointsInSequence() {
  state.playInterval = setInterval(() => {
    if (state.currentDate >= state.endDate)
      return clearInterval(state.playInterval);
    state.currentDate = new Date(+state.currentDate + sevenDays);

    drawPoints(true);
  }, 400);
}

function inSequenceEntrance(enter) {
  enter
    .transition()
    .delay(d => {
      let delay = (d.publishDate / 100000000 - 9400) * 20;
      return delay;
    })
    .duration(100)
    .attr("opacity", 1)
    .attr("r", 10)
    .transition()
    .duration(100)
    .attr("r", 3)
    .transition()
    .attr("opacity", 0.2)
    .attr("", d => {
      week.text(d.publishDate);
    })
    .transition()
    .attr("fill", "steelblue");
}

function basicEntrance() {}

function drawPoints(inSequence = false) {
  const filteredData = state.articles.filter(
    d => d.publishDate <= state.currentDate
  );

  svg
    .selectAll("circle")
    .data(filteredData, d => {
      return d.index;
    })
    .join(
      enter => {
        enter
          .append("circle")
          .attr("r", 3)
          .attr("opacity", inSequence ? 0 : 0.1)
          .attr("transform", d => {
            let coordinates;
            let loc = state.locations.get(d.location);
            const offset1 = Math.random();
            const offset2 = Math.random();

            if (!loc) {
              x = ((d.index % 100) / 100) * mapWidth;
              y = ((d.index - (d.index % 100)) / 5000) * height;
              coordinates = [mapWidth + x, y];
            } else {
              coordinates = projection([
                -loc.longitude + offset1 * 0.002,
                loc.latitude + offset2 * 0.002
              ]);
            }
            if (!coordinates) return;
            return `translate(${coordinates[0]}, ${coordinates[1]})`;
          })
          .on("mouseenter", d => {
            console.log(d.column);
          })
          .call(inSequence ? inSequenceEntrance : () => {});
      },
      update => {},
      exit => {}
    );
}
