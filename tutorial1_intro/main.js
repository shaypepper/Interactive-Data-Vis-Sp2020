// load in csv
d3.csv(
  "https://docs.google.com/spreadsheets/d/1aB0wJ4Pvt0Ww1fM7NWITFhhkVCQr8QWFHYCMqGGkvqc/pub?output=csv#gid=0"
).then(data => {
  // once the data loads, console log it
  console.log("data", data);

  // select the `table` container in the HTML
  const table = d3.select("#d3-table");

  /** HEADER */
  const thead = table.append("thead");
  thead
    .append("tr")
    .append("th")
    .attr("colspan", "7");

  thead
    .append("tr")
    .selectAll("th")
    .data([...data.columns.slice(1), "Average"])
    .join("td")
    .text(d => {
      const allWords = d.split(" ");
      return allWords[0] === "Annual" ? allWords[1] : d;
    })
    .attr("class", "headings");

  /** BODY */
  // rows
  const rows = table
    .append("tbody")
    .selectAll("tr")
    .data(data)
    .join("tr")
    .attr("class", ({ Gender: g }) => (g === "men" ? "man-row" : "woman-row"));

  // cells
  rows
    .selectAll("td")
    .data(d => {
      delete d["Series ID"];
      const [avg, ct] = Object.keys(d).reduce(
        (memo, key) => {
          if (+d[key]) {
            return [memo[0] + Math.round(+d[key] * 100), memo[1] + 1];
          } else {
            return memo;
          }
        },
        [0, 0]
      );
      return [...Object.values(d), Math.round(avg / ct) / 100];
    })
    .join("td")
    // update the below logic to apply to your dataset
    .style("background-color", d => !NaN && `rgba(0,0,0,${+d / 10})`)
    .style("color", d => !NaN && +d > 5 && "white")
    .text((d, i) => {
      if (!i) {
        return d.toUpperCase();
      }
      if (i == 1) {
        return d.split(" (")[0];
      }
      return d;
    })
    .attr("class", (d, i, data) => {
      if (i < 2 || i === data.length - 1) {
        return;
      }
      let prevValue = +data[i - 1].innerHTML;
      if (+d > prevValue) {
        return "up value";
      }
      if (+d < prevValue) {
        return "down value";
      }

      return +d && "value";
    });
});
