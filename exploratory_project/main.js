/**
 * CONSTANTS AND GLOBALS
 * */
const width = window.innerWidth * 0.9,
  mapWidth = width / 2,
  height = window.innerHeight * 0.7,
  margin = {
    top: 20,
    bottom: 50,
    left: window.innerWidth * 0.05,
    right: window.innerWidth * 0.05
  },
  sevenDays = 604800000,
  theme = {
    mainColor: "#ff6361"
  };

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
  playButton,
  drawXAxis,
  drawBars,
  tooltip;

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
    state: null,
    date: "2013-11-17",
    role: "end"
  },
  startDate: "2004-06-20",
  endDate: "2009-07-18",
  currentDate: "2016-06-12",
  playSpeed: 200,
  playMode: false,
  editingSelection: false
};

/**
 * LOAD DATA
 * Using a Promise.all([]), we can load more than one dataset at a time
 * */
Promise.all([
  d3.json("../data/manhattan.geojson"),
  d3.csv("../data/evening_hours.csv"),
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

  tooltip = d3.select("#tooltip");

  // DRAW PLAY BUTTON

  // MAP LOCATIONS TO LONG-LAT COORDINATES

  drawMap(); // Only needs to be done once probably
  drawPoints();
  drawBarChart();
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
    .join(enter => {
      enter
        .append("path")
        .attr("d", path)
        .attr("class", "county")
        // .attr("fill", "white")
        .attr("stroke-width", 1)
        .attr("stroke", "rgba(30,30,30)")
        .attr("opacity", 0.6)
        .call(enter => {
          enter.transition().duration(400);
          // .attr("fill", "gainsboro");
        });
    });
}

function drawBarChart() {
  const barChart = svg.append("g");
  let xAxis;
  const barChartXOffset = 150;
  const articlesByPublishDate = d3
    .nest()
    .key(d => d.publishDate)
    .entries(state.articles);
  const getPublishDate = d => d.key;
  const publishDates = articlesByPublishDate.map(getPublishDate);
  const getTickValues = () => {
    return [state.startDate, state.endDate, state.hover.date];
  };

  const yScale = d3
    .scaleLinear()
    .domain([0, d3.max(articlesByPublishDate.map(d => d.values.length))])
    .range([margin.top, height - margin.bottom]);
  const xScale = d3
    .scaleBand()
    .domain(articlesByPublishDate.map(getPublishDate))
    .range([mapWidth, width]);

  initBarChart = () => {};

  drawXAxis = () => {
    xAxis = d3.axisBottom(xScale).tickValues(getTickValues());
    d3.select("#barAxis")
      .html("")
      .attr("transform", `translate(0, ${barChartXOffset})`)
      .call(xAxis);
  };

  drawBars = () => {
    barChart
      .selectAll("rect")
      .data(articlesByPublishDate, d => d.key)
      .join("rect")
      .attr("x", d => xScale(getPublishDate(d)))
      .attr("y", d =>
        d.key === state.hover.date ? 0 : barChartXOffset - d.values.length * 10
      )
      .attr("height", d =>
        d.key === state.hover.date ? barChartXOffset : d.values.length * 10
      )
      .attr("width", 1)
      .attr("fill", d => {
        return d.key === state.hover.date ? "red" : theme.mainColor;
      })
      .attr("opacity", d => {
        return (!(d.key < state.startDate) && !(d.key > state.endDate)) ||
          d.key === state.hover.date
          ? 1
          : 0.2;
      })
      .on("mouseenter", d => {
        state.hover.date = d.key;
        if (state.editingSelection) {
          if (
            state.hover.date > state.startDate &&
            state.hover.role === "end"
          ) {
            state.endDate = state.hover.date;
          }
        }
        drawXAxis();
        drawBars();
      });
  };

  barChart
    .on("mousedown", () => {
      state.startDate = state.hover.date;
      state.endDate = state.hover.date;
      state.editingSelection = true;
      drawXAxis();
      drawBars();
    })
    .on("mouseup", d => {
      if (state.hover.date > state.startDate) {
        state.endDate = state.hover.date;
      } else {
        state.endDate = state.startDate;
        state.startDate = state.hover.date;
      }
      state.editingSelection = false;
      drawXAxis();
      drawBars();
      drawPoints();
    })
    .on("mouseleave", () => {
      state.hover.date = null;
    });
  barChart.append("g").attr("id", "barAxis");
  drawXAxis();
  drawBars();
}
function drawPointsInSequence() {
  state.playInterval = setInterval(() => {
    if (state.currentDate >= state.endDate)
      return clearInterval(state.playInterval);
    state.currentDate = new Date(+state.currentDate + sevenDays);

    drawPoints(true);
  }, 100);
}

function drawPoints(inSequence = false) {
  const filteredData = state.articles.filter(d => {
    return d.publishDate >= state.startDate && d.publishDate <= state.endDate;
  });

  svg
    .selectAll("circle")
    .data(filteredData, d => {
      return d.index;
    })
    .join(enter => {
      enter
        .append("circle")
        .attr("r", 3)
        .attr("opacity", 0)
        // .attr("opacity", 0.3)
        .attr("transform", d => {
          let coordinates;
          let loc = state.locations.get(d.location);

          if (!loc) {
            const { PI, cos, random, sin } = Math;
            const t = 2 * PI * random();
            const u = random() + random();
            const r = (u > 1 ? 2 - u : u) * 100;
            const [x, y] = [r * cos(t), r * sin(t)];
            coordinates = [mapWidth + x - 120, height * 0.7 + y];
          } else {
            coordinates = projection([
              -loc.longitude + Math.random() * 0.002,
              loc.latitude + Math.random() * 0.002
            ]);
          }
          if (!coordinates) return;
          return `translate(${coordinates[0]}, ${coordinates[1]})`;
        })
        .on("mouseenter", d => {
          const monthParser = d3.timeFormat("%m");
          const publishDate = d3.timeParse("%Y-%m-%d")(d.publishDate);
          const publishYear = +d3.timeFormat("%Y")(publishDate);
          const eventDate = d3.timeParse("%b %d %Y")(
            `${d.eventDate} ${publishYear}`
          );
          const eventYear =
            monthParser(publishDate) === "01" && monthParser(eventDate) === "12"
              ? publishYear - 1
              : publishYear;
          tooltip.html(
            `<h3>${d3.timeFormat("%A %B %d, %Y")(eventDate)}</h3>
            <p>${d.column}<p>
            <span>Published ${d3.timeFormat("%B %d")(publishDate)}</span>`
          );
        })
        .call(
          inSequence
            ? enter =>
                enter
                  .transition()
                  .duration(state.playMode ? 100 : 0)
                  .attr("opacity", 1)
                  .attr("r", 10)
                  .transition()
                  .duration(state.playMode ? 100 : 0)
                  .attr("r", 3)
                  .transition()
                  .attr("opacity", 0.2)
                  .attr("", d => {
                    week.text(d.publishDate);
                  })
                  .transition()
                  .attr("fill", theme.mainColor)
            : enter =>
                enter
                  .attr("fill", theme.mainColor)
                  .transition()
                  .duration(400)
                  .attr("opacity", d =>
                    Math.max(0.3, Math.pow(5 / filteredData.length, 0.3))
                  )
        );
    });
}
