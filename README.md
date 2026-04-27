# Gapminder bubble chart

A React + D3 take on the classic Gapminder scatter: GDP per capita vs. life expectancy, with bubbles sized by population and coloured by continent. Built as part of the [D3-loves-react course](http://d3-loves-react.com).

## The data

Gapminder 2007, 142 countries. Five fields per country: name, continent, life expectancy (years), population, GDP per capita (inflation-adjusted USD).

## What's in the chart

- Linear / log toggle for the x-axis (log uses doubling ticks: $250, $500, $1K, $2K …)
- Click a continent in the legend to fade it out
- Toggle min/max country labels per continent between life-expectancy and population
- Combined legend box — continent swatches above a population size guide
- Responsive width via a `useDimensions` hook + SVG `viewBox`

## What I picked up building it

- **React-driven D3.** D3 is used for scales (`scaleLinear`, `scaleLog`, `scaleSqrt`, `scaleOrdinal`) and tick generation. The DOM is React's; no `d3.select` calls.
- **Square data area, not square SVG.** With an asymmetric left margin (for the y-axis label), the visible plot reads as square only when the margin difference is added back into the width cap.
- **Label collisions.** A greedy y-nudge with bounding-box overlap detection keeps country labels horizontal and readable. Labels that get bumped from their natural spot grow a leader line back to the bubble.
- **The "always start at zero" rule applies to bar charts, not scatter plots.** y-axis here starts at 35 (just below the data minimum) so the curve has room to breathe.
- **Log scale reveals what linear hides.** On linear, Africa's bubbles cluster at the lower-left corner; on log, the same countries spread across nearly two orders of magnitude. Two views, two valid stories — hence the toggle.
- **Be specific about claims.** "Two orders of magnitude" sounded right but wasn't (Africa's range is ~50×, not 100×). Quoting concrete numbers ($278 → $13K) is both more honest and more anchorable to bubbles the reader can find.

## Scripts

- `npm run dev` — local dev server
- `npm run build` — production build to `dist/`
- `npm run preview` — preview the production build locally
- `npm run deploy` — build and publish `dist/` to the `gh-pages` branch
