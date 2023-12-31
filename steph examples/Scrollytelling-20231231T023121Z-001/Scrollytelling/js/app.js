import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
gsap.registerPlugin(ScrollTrigger);

// --- Selectors ---
const app = d3.select("#app");

const fixedWrapper = app
  .append("div")
  .style("position", "fixed")
  .style("inset", "10px")
  .style("z-index", -1)
  .style("border-radius", "10px")
  .style("display", "grid")
  .style("place-items", "center");

const setBackgroundColor = (color) => {
  fixedWrapper
  .transition()
  .duration(300)
  .style('background-color', color)
};

const colors = ['red', 'blue', 'green', 'yellow', 'purple'];

const createTrigger = (index) => {
  const container = app
    .append("div")
    .style("height", "100vh")
    .style("display", "flex")
    .style("align-items", "center")
    .style("justify-content", "center")
    .style("pointer-events", "none")
    .html(`<h1>${index}</h1>`);

  ScrollTrigger.create({
    trigger: container.node(),
    start: "top top",
    end: "bottom top",
    markers: true,
    onEnter: () => {
      setBackgroundColor(colors[index]);
    },
    onLeaveBack: () => {
      if(colors[index - 1]){
        setBackgroundColor(colors[index - 1]);
      }
    },
  });
};

colors.forEach((_, i) => {
  createTrigger(i);
});

setBackgroundColor(colors[0]);
