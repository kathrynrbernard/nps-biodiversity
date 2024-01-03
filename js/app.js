// import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
// import * as L from "https://cdn.jsdelivr.net/npm/leaflet@1.9.3/+esm";

// Set up div for map
const app = d3
  .select("#app")
  .html("")
  .style("position", "fixed")
  .style("inset", "0")
  .style("padding", "0");

const mapElement = app.append("div").attr("id", "map").style("height", "100vh");

const map = L.map(mapElement.node(), {
  center: [50.0902, -95.7129],
  zoom: 3.4,
});

console.log(L);

// Use OpenStreetMap basemap
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution:
    'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

// Define global variables
let parkPoints;
let parkPolygons;
let pointsShown = true;

// Set dimensions for graphs in Leaflet popup
const width = 928;
const height = 570;
const marginTop = 30;
const marginRight = 15;
const marginBottom = 40;
const marginLeft = 105;

// Read in data about species for all the parks
const data = await d3.csv("data/merged_data.csv");

// Define function to create left bar graph in Leaflet popup
let createLeftGraph = function (feature, div) {
  // Read data about feature
  let parkName;
  if (feature.geometry) {
    // if polygon
    parkName = feature.properties["UNIT_NAME"];
  } else {
    // if point
    parkName = feature["Park Name"];
  }

  let filter = data.filter(function (d) {
    return d["Park Name"] == parkName;
  });
  // calculate counts for each category of species
  let category_counts = d3.rollup(
    filter,
    (v) => v.length,
    (d) => d.Category
  );

  let aggregate = Array.from(category_counts, ([category, count]) => ({
    category,
    count,
  }));

  // Declare the y scale
  const y = d3
    .scaleBand()
    .domain(
      d3.groupSort(
        aggregate,
        ([d]) => d.count,
        (d) => d.category
      )
    ) // descending frequency
    .range([height - marginBottom, marginTop + 20])
    .padding(0.1);

  // Declare the x scale.
  const x = d3
    .scaleLinear()
    .domain([0, d3.max(aggregate, (d) => d.count)])
    .range([marginLeft, width - marginRight]);

  // Create SVG to display graph
  let svg = d3
    .select("#left")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height])
    .attr("style", "max-width: 100%; height: auto;");

  // Add a rect for each bar.
  svg
    .append("g")
    .attr("fill", "#1B4D2B")
    .selectAll()
    .data(aggregate)
    .join("rect")
    .attr("x", (d) => x(0))
    .attr("y", (d) => y(d.category))
    .attr("width", (d) => x(d.count) - marginLeft)
    .attr("height", y.bandwidth())
    .attr("opacity", 1)
    .attr("class", (d) => d.category.replace(/\s/g, "").replace(/\//g, "")); // replace spaces and slashes in class name

  // Add the x-axis and label.
  svg
    .append("g")
    .attr("transform", `translate(0,${height - marginBottom})`)
    .call(d3.axisBottom(x).tickSizeOuter(0));

  // Add the y-axis and label.
  svg
    .append("g")
    .attr("transform", `translate(${marginLeft},0)`)
    .call(d3.axisLeft(y));

  svg
    .append("g")
    .selectAll()
    .data(aggregate)
    .join("text")
    .text((d) => d.count)
    .attr("x", (d) => x(d.count))
    .attr("y", (d) => y(d.category) + y.bandwidth() / 1.5)
    .style("text-anchor", "start");

  // Add graph title
  svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", marginTop)
    .attr("text-anchor", "middle")
    .style("font-size", "32px")
    .text(parkName);

  svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", marginTop + 20)
    .attr("text-anchor", "middle")
    .style("font-size", "24px")
    .text("Species by category");
};

// Define function to create right bar graph in Leaflet popup
let createRightGraph = function (feature, div) {
  let parkName;
  if (feature.geometry) {
    // if polygon
    parkName = feature.properties["UNIT_NAME"];
  } else {
    // if point
    parkName = feature["Park Name"];
  }
  let filter = data.filter(function (d) {
    return d["Park Name"] == parkName;
  });

  // calculate counts for each status for the park that has been clicked on
  let category_status_counts_int = d3.rollup(
    filter,
    (v) => v.length,
    (d) => d.Category,
    (d) => d["Conservation Status"]
  );
  let category_status_counts = calcCategoryStatusCounts(
    category_status_counts_int
  );
  // find domain for y axis
  let category_counts = d3.rollup(
    filter,
    (v) => v.length,
    (d) => d.Category
  );
  let aggregate = Array.from(category_counts, ([category, count]) => ({
    category,
    count,
  }));

  // Remove "no concern" from list of keys
  let keys = Object.keys(category_status_counts[0]).slice(1);
  keys.splice(keys.indexOf("No Concern"), 1);

  // Create stacked data
  let stack = d3.stack().keys(keys)(category_status_counts);
  stack.map((d, i) => {
    d.map((d) => {
      d.key = keys[i];
      return d;
    });
    return d;
  });

  // Calculate max for x axis
  let xMax = d3.max(category_status_counts, (d) => {
    let val = 0;
    for (let k of keys) {
      if (!isNaN(d[k])) {
        val += d[k];
      }
    }
    return val;
  });

  // Declare y scale
  let y_arr = d3.groupSort(
    aggregate,
    ([d]) => d.count,
    (d) => d.category
  );
  let y = d3
    .scaleBand()
    .domain(y_arr.reverse())
    .range([marginTop + 20, height - marginBottom])
    .padding(0.1);

  // Declare x scale
  let x = d3
    .scaleLinear()
    .domain([0, xMax])
    .range([marginLeft, width - marginRight]);

  // Define colors for bars
  let color = d3.scaleOrdinal(d3.schemeDark2).domain(keys);

  // Create SVG
  let svg = d3
    .select("#right")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height])
    .attr("style", "max-width: 100%; height: auto;");

  // Append rectangles
  svg
    .selectAll("g")
    .data(stack)
    .enter()
    .append("g")
    .selectAll("rect")
    .data((d) => d)
    .enter()
    .append("rect")
    .attr("y", (d) => y(d.data.category))
    .attr("height", y.bandwidth())
    .attr("width", (d) => {
      return x(d[1]) - x(d[0]);
    })
    .attr("x", (d) => x(d[0]))
    .attr("fill", (d) => color(d.key))
    .on("mouseover", function (event, d) {
      // pale on hover
      let info = d;
      d3.select(this).attr("opacity", 0.5);
      d3.selectAll(
        "." + d.data.category.replace(/\s/g, "").replace(/\//g, "")
      ).attr("opacity", 0.5);
      let svg2 = d3.select("#left").select("svg");
      const x2 = d3
        .scaleLinear() // access x scale from left graph
        .domain([0, d3.max(aggregate, (d) => d.count)])
        .range([marginLeft, width - marginRight]);
      svg2
        .append("rect")
        .attr("x", marginLeft)
        .attr("y", this.getAttribute("y"))
        .attr("width", (d) => x2(info[1]) - x2(info[0]))
        .attr("height", y.bandwidth())
        .attr("stroke", "black")
        .attr("fill", this.getAttribute("fill"))
        .attr("class", "hover");
    })
    .on("mouseout", function (event, d) {
      // reset to normal
      d3.select(this).attr("opacity", 1);
      d3.selectAll(
        "." + d.data.category.replace(/\s/g, "").replace(/\//g, "")
      ).attr("opacity", 1);
      let svg2 = d3.select("#left").select("svg");
      svg2.selectAll("rect.hover").remove(); // remove generated rectangle
    });

  // Add the x-axis and label.
  svg
    .append("g")
    .attr("transform", `translate(0,${height - marginBottom})`)
    .call(d3.axisBottom(x).tickSizeOuter(0));

  // Add the y-axis and label.
  svg
    .append("g")
    .attr("transform", `translate(${marginLeft},0)`)
    .call(d3.axisLeft(y));

  // Add legend
  svg
    .selectAll("mydots")
    .data(keys)
    .enter()
    .append("circle")
    .attr("cx", function (d, i) {
      return marginLeft + i * 150;
    })
    .attr("cy", height - marginBottom + 30)
    .attr("r", 7)
    .style("fill", function (d) {
      return color(d);
    });

  // Add one dot in the legend for each name.
  svg
    .selectAll("mylabels")
    .data(keys)
    .enter()
    .append("text")
    .attr("x", function (d, i) {
      return marginLeft + 10 + i * 150;
    })
    .attr("y", height - marginBottom + 30)
    .style("fill", function (d) {
      return color(d);
    })
    .text(function (d) {
      return d;
    })
    .attr("text-anchor", "left")
    .style("alignment-baseline", "middle");

  // Add graph title
  svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", marginTop + 20)
    .attr("text-anchor", "middle")
    .style("font-size", "24px")
    .text("Species by conservation status");
};

let calcCategoryStatusCounts = function (category_status_counts_int) {
  let array = [];
  for (let [key, value] of category_status_counts_int.entries()) {
    // for each category
    let obj = { category: key };
    for (let [key2, value2] of value) {
      // key is status, value is count
      obj[key2] = value2;
    }
    array.push(obj);
  }
  return array;
};

// Read in points data and create point markers for parks
d3.csv("data/parks.csv").then((parks) => {
  function createPointMarker(feature) {
    const lon = feature.Longitude;
    const lat = feature.Latitude;
    const acres = feature.Acres;
    const parkName = feature["Park Name"];

    let markerStyle = {
      radius: acres * 0.000005 < 3 ? 3 : acres * 0.000005, // radius for starting zoom level (3.4)
      color: "#000080", // navy blue
      fillColor: "#4E806A", // dark green
      weight: 0.2,
      opacity: 1,
      fillOpacity: 0.9,
    };

    // Create marker and bind popup
    const marker = L.circleMarker([lat, lon], markerStyle);

    // Create divs to hold graphs
    let div = document.createElement("div");
    div.class = "container";
    div.style =
      "position: relative; display: flex; width: 950px; height: 300px;";
    let left_div = document.createElement("div");
    left_div.id = "left";
    let right_div = document.createElement("div");
    right_div.id = "right";
    div.appendChild(left_div);
    div.appendChild(right_div);

    marker.bindPopup(div, { maxWidth: 1000 });

    let lastOpenedMarker = null; // Variable to keep track of the last opened marker

    marker.on("popupopen", function (e) {
      lastOpenedMarker = e.popup._source; // Store the last opened marker
    });

    // On click, show the graph and pause pings
    marker.on("click", function (e) {
      if (lastOpenedMarker) {
        // Close the currently opened popup
        lastOpenedMarker.closePopup();
        setTimeout(function () {
          lastOpenedMarker.openPopup();
          // Create graphs
          createLeftGraph(feature, div);
          createRightGraph(feature, div);
          // // pause pings
          // paused = true;
        }, 200);
      }
    });

    // When popup is closed, clean up graphs and re-start pings
    marker.on("popupclose", function (e) {
      d3.select("#left").select("svg").remove();
      d3.select("#right").select("svg").remove();
      // restart pings
      //paused = false;
      //window.setTimeout(update);
    });

    return marker;
  }

  parkPoints = L.layerGroup(parks.map(createPointMarker), {});
  parkPoints.addTo(map);
});

// Styling and markers for polygons
let polyStyle = {
  color: "#000080", // navy blue
  fillColor: "#4E806A", // dark green
  weight: 0.2,
  opacity: 1,
  fillOpacity: 0.9,
};

let onEachPolyFeature = function (feature, layer) {
  // Create divs to hold graphs
  let div = document.createElement("div");
  div.class = "container";
  div.style = "position: relative; display: flex; width: 950px; height: 300px;";
  let left_div = document.createElement("div");
  left_div.id = "left";
  let right_div = document.createElement("div");
  right_div.id = "right";
  div.appendChild(left_div);
  div.appendChild(right_div);

  layer.bindPopup(div, { maxWidth: 1000 });

  let lastOpenedMarker = null; // Variable to keep track of the last opened marker

  layer.on("popupopen", function (e) {
    lastOpenedMarker = e.popup._source; // Store the last opened marker
  });

  // on click, show the graph and pause pings
  layer.on("click", function (e) {
    if (lastOpenedMarker) {
      // Close the currently opened popup
      lastOpenedMarker.closePopup();
      setTimeout(function () {
        lastOpenedMarker.openPopup();
        // Create graphs
        createLeftGraph(feature, div);
        createRightGraph(feature, div);
        // // pause pings
        // paused = true;
      }, 200);
    }
  });

  // when popup is closed, clean up graphs and re-start pings
  layer.on("popupclose", function (e) {
    d3.select("#left").select("svg").remove();
    d3.select("#right").select("svg").remove();
    // restart pings
    //paused = false;
    //window.setTimeout(update);
  });
};

// Read in polygon data for parks
$.ajax({
  dataType: "json",
  url: "data/nps_polygons_filter.geojson",
  success: function (data) {
    parkPolygons = L.geoJson(data, {
      style: polyStyle,
      onEachFeature: onEachPolyFeature,
    });
    return parkPolygons;
  },
});

// Define functions for showing points and polygons
let showPoints = function () {
  map.removeLayer(parkPolygons);
  parkPoints.addTo(map);
  pointsShown = true;
};

let showPolygons = function () {
  map.removeLayer(parkPoints);
  parkPolygons.addTo(map);
  pointsShown = false;
};

// Update to points or polygons based on current zoom level
map.on("zoom", function () {
  console.log("on zoom");
  if (map.getZoom() >= 5 && pointsShown) {
    showPolygons();
  }
  if (map.getZoom() < 5 && !pointsShown) {
    showPoints();
  }
});

// ping options
let options = {
  duration: 800,
  fps: 32,
  opacityRange: [1, 0],
  radiusRange: [5, 12],
};

// add pings layer to map
let paused = false;
let pingLayer = L.pingLayer(options).addTo(pingMap);

// get coordinates of pings based on slider
let getCoords = function () {
  //Math.floor(Math.random() * (max - min + 1)) + min;
  let index = Math.floor(Math.random() * (v.data.length - 1 - 0 + 1)) + 0;
  return [v.data[index].Longitude, v.data[index].Latitude, index];
};

// show pings
let update = function () {
  if (!paused) {
    let result = getCoords();
    pingLayer.ping([result[0], result[1]]);
    window.setTimeout(update, 100 + Math.random() * 400);
  }
};
window.setTimeout(update); // this ensures that the pings keep appearing - otherwise it will flash once and not reset
