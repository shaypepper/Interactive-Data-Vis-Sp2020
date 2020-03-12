/**
 * CONSTANTS AND GLOBALS
 * */
const squareSize = Math.min(window.innerWidth, window.innerHeight) * 0.5;
const width = squareSize,
  height = squareSize;

let svg;
let tooltip;
let movieList;
let currentSubtitle;

/**
 * APPLICATION STATE
 * */
let state = {
  root: null,
  hover: null,
  movies: []
};
/**
 * LOAD DATA
 * */
d3.csv("../data/netflix_titles_with_genre.csv", d3.autotype).then(data => {
  state.data = data;
  init();
});

/**
 * INITIALIZING FUNCTION
 * this will be run *one time* when the data finishes loading in
 * */
function init() {
  const container = d3.select("#d3-container").style("position", "relative");

  svg = container
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  tooltip = container
    .append("div")
    .attr("class", "tooltip")
    .attr("width", 100)
    .attr("height", 100)
    .style("position", "absolute");

  const uniqueGenres = [...new Set(state.data.map(d => d.genre))];
  const colorScale = d3
    .scaleOrdinal(d3.schemeSet3)
    .domain(uniqueGenres)
    .range(d3.schemeSet3);

  movieList = container.append("ul");

  currentSubtitle = d3.select("#current");

  const rolledUpTypes = d3.rollups(
    state.data,
    v => ({ count: v.length, movies: v }), // reduce function,
    d => d.genre,
    d => d.rating
  );

  const root = createHeirarchy(rolledUpTypes);

  const rootPack = d3.pack(root).padding(d => {
    return d.depth === 0 ? 0.03 : 0;
  });

  // + CREATE YOUR LAYOUT GENERATOR
  const node = svg.selectAll("g").data(
    d3
      .nest()
      .key(d => d.height)
      .entries(rootPack(root).descendants())
  );

  // + CALL YOUR LAYOUT FUNCTION ON YOUR ROOT DATA
  const leaf = svg
    .selectAll(`g`)
    .data(rootPack(root).descendants())
    .join("g")
    .attr("transform", d => `translate(${d.x * height},${d.y * height})`);

  // + CREATE YOUR GRAPHICAL ELEMENTS
  leaf
    .append("circle")
    .attr("r", d => d.r * height)
    .attr("fill", d => {
      return d.depth === 2
        ? colorScale(d.data[1].movies[0].genre)
        : "rgba(0, 0, 0)";
    })
    .attr("fill-opacity", d => {
      return d.depth === 2 ? 0.7 : 0.4;
    });
  leaf.on("mouseenter", function(d) {
    if (d.depth !== 2) {
      state.hover = null;
      draw();
      return;
    }
    state.hover = {
      translate: [
        // center top left corner of the tooltip in center of tile
        d.x * height,
        d.y * height
      ],
      genre: d.data[1].movies[0].genre,
      rating: d.data[1].movies[0].rating,
      value: d.value,
      movieList: d.data[1].movies.map(m => m.title),
      color: colorScale(d.data[1].movies[0].genre)
    };
    draw();
  });

  leaf
    .append("text")
    .html(d => {
      if (d.depth === 2 && d.value > 100) return d.data[0].toUpperCase();
    })
    .attr("fill", "white")
    .attr("font-size", d => (d.r * height) / 2.5)
    .attr("width", d => d.r * 2 * height)
    .attr("textLength", d => d.r * height * 1.333)
    .attr("x", d => -d.r * height * 0.666)
    .attr("y", d => (d.r * height) / 6);

  draw(); // calls the draw function
}

/**
 * DRAW FUNCTION
 * we call this everytime there is an update to the data/state
 * */
function draw() {
  // + UPDATE SUBTITLE AND CREATE LIST OF MOVIES
  if (state.hover) {
    movieList
      .selectAll("li")
      .data(["", ...state.hover.movieList])
      .join("li")
      .attr("key", d => d)
      .style("background-color", (d, idx) => idx && state.hover.color)
      .html(d => d);

    currentSubtitle.html(`${state.hover.genre} rated ${state.hover.rating}`);
    tooltip
      .html(`${state.hover.value} movies and television shows`)
      .style("display", "block")
      .style(
        "transform",
        `translate(${state.hover.translate[0]}px, ${state.hover.translate[1]}px)`
      );
  } else {
    tooltip.style("display", "none");
    movieList.html("");
    currentSubtitle.html(
      "<i>Hover over bubbles to see movies by genre and rating</i>"
    );
  }
}

function createHeirarchy(rolledUpData) {
  return d3
    .hierarchy([null, rolledUpData], ([key, values]) => values)
    .sum(([key, values]) => values.count)
    .sort((a, b) => b.value - a.value);
}

function drawLeaves(root, type) {}
