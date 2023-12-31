import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import * as L from "https://cdn.jsdelivr.net/npm/leaflet@1.9.3/+esm";


const app = d3
  .select("#app")
  .html("")
  .style("position", "fixed")
  .style("inset", "0")
  .style("padding", "0");

const mapElement = app
  .append("div")
  .attr("id", "map")
  .style("height", "100vh");

const map = L.map(mapElement.node(), {
  center: [0, 0],
  zoom: 2,
  worldCopyJump: true,
  minZoom: 2,
  maxBounds: [
    [-90, -180],
    [90, 180],
  ],
});

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

const colorScale = d3.scaleSequential(d3.interpolateYlOrRd).domain([0, 10]);

d3.csv("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.csv").then((earthquakeData) => {
  function createMarker(feature) {
    const magnitude = feature.mag;
    const lon = feature.longitude;
    const lat = feature.latitude;

    const markerStyle = {
      radius: 5,
      fillColor: colorScale(magnitude),
      color: "#3F3F3F",
      weight: .2,
      opacity: 1,
      fillOpacity: 0.7,
    };

    const marker = L.circleMarker([lat, lon], markerStyle);

    marker.on("mouseover", function (e) {
      this.bindPopup(`Magnitude: ${magnitude}`).openPopup();
    });

    marker.on("mouseout", function (e) {
      this.closePopup();
    });

    return marker;
  }


  
  const earthquakeLayer = L.layerGroup(earthquakeData.map(createMarker));
  earthquakeLayer.addTo(map);

  // Create a legend for the magnitude color scale
// Create a legend for the magnitude color scale
const legend = L.control({ position: "bottomright" });

legend.onAdd = function (map) {
  // Create the legend HTML content
  const div = L.DomUtil.create("div", "info legend");
  const grades = [0, 2, 4, 6, 8, 10]; // You can adjust the legend values

  // Define colors for the legend circles
  const legendColors = grades.map((grade) => colorScale(grade));

  // Initialize an empty array to hold legend labels and circles
  const labelsWithCircles = [];

  // Create legend labels and circles
  for (let i = 0; i < grades.length; i++) {
    const from = grades[i];
    const to = grades[i + 1];
    const label =
      from + (to ? "&ndash;" + to : "+"); // Legend label
    const circleColor = legendColors[i]; // Color for the legend circle
    const labelWithCircle =
      `<i class="circle" style="background:${circleColor}"></i> ` +
      label; // Label with a colored circle

    labelsWithCircles.push(labelWithCircle);
  }

  // Combine legend labels and circles
  div.innerHTML = labelsWithCircles.join("<br>");
  return div;
};

legend.addTo(map);

  // Update the legend in the separate legend div
  const legendDiv = document.getElementById("legend");
  legendDiv.innerHTML = legend.getContainer().innerHTML;
});

// import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
// import * as L from "https://cdn.jsdelivr.net/npm/leaflet@1.9.3/+esm";

// const app = d3
//   .select("#app")
//   .html("")
//   .style("position", "fixed")
//   .style("inset", "0")
//   .style("padding", "0");

// const mapElement = app
//   .append("div")
//   .attr("id", "map")
//   .style("height", "100vh");

// const map = L.map(mapElement.node(), {
//   center: [0, 0],
//   zoom: 2,
//   worldCopyJump: true,
//   minZoom: 2,
//   maxBounds: [
//     [-90, -180],
//     [90, 180],
//   ],
// });

// L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
//   maxZoom: 19,
//   attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
// }).addTo(map);

// // Define a color scale or marker styles for the species conservation status.
// const conservationStatusColors = {
//   "Endangered": "red",
//   "Vulnerable": "yellow",
//   "Least Concern": "green",
//   // Add more status-color mappings as needed.
// };

// d3.csv("your_species_data.csv").then((speciesData) => {
//   function createMarker(species) {
//     const commonName = species["Common Name"];
//     const lon = parseFloat(species.longitude);
//     const lat = parseFloat(species.latitude);
//     const conservationStatus = species["Conservation Status"];

//     // Customize marker styles based on conservation status
//     const markerStyle = {
//       radius: 5,
//       fillColor: conservationStatusColors[conservationStatus] || "gray",
//       color: "#3F3F3F",
//       weight: .2,
//       opacity: 1,
//       fillOpacity: 0.7,
//     };

//     const marker = L.circleMarker([lat, lon], markerStyle);

//     // Add pop-up information if needed
//     marker.bindPopup(`Common Name: ${commonName}<br>Conservation Status: ${conservationStatus}`);

//     return marker;
//   }

//   const speciesLayer = L.layerGroup(speciesData.map(createMarker));
//   speciesLayer.addTo(map);
// });
