import { useRef, useState } from "react";
import { scaleLinear, scaleSqrt, scaleOrdinal, max } from "d3";
import { data } from "../data";
import { useDimensions } from "../hooks/useDimensions";
import "./BubbleChart.css";

const MARGIN = { top: 20, right: 20, bottom: 55, left: 70 };

const CONTINENTS = ["Africa", "Americas", "Asia", "Europe", "Oceania"];
const CONTINENT_COLORS = [
  "#f08c8c",
  "#c19bf0",
  "#8cb8f0",
  "#f0c46e",
  "#7fcfa8",
];

const POP_LEGEND_VALUES = [10_000_000, 100_000_000, 500_000_000, 1_000_000_000];

const formatGdp = (n) => (n === 0 ? "$0" : `$${n / 1000}K`);
const formatPop = (n, isMax) => {
  const prefix = isMax ? ">" : "";
  if (n >= 1e9) return `${prefix}${n / 1e9}B`;
  if (n >= 1e6) return `${prefix}${n / 1e6}M`;
  return `${prefix}${n}`;
};

const LABEL_METRICS = {
  lifeExp: { key: "lifeExp", label: "Life expectancy" },
  pop: { key: "pop", label: "Population" },
};

export default function BubbleChart() {
  const containerRef = useRef(null);
  const { width: measured } = useDimensions(containerRef);

  // Fixed height; width grows up to the cap that makes the *visible* plot square.
  // y-axis labels eat ~40px of the left margin, so widen the chart by that much.
  const height = 580;
  const innerSquareSide = height - MARGIN.top - MARGIN.bottom;
  const LEFT_AXIS_GUTTER = 40;
  const maxWidth =
    innerSquareSide + MARGIN.left + MARGIN.right + LEFT_AXIS_GUTTER;
  const width = Math.min(measured || maxWidth, maxWidth);

  const [active, setActive] = useState(() => new Set(CONTINENTS));
  const [labelMetric, setLabelMetric] = useState("lifeExp");

  const innerWidth = width - MARGIN.left - MARGIN.right;
  const innerHeight = height - MARGIN.top - MARGIN.bottom;

  const xScale = scaleLinear()
    .domain([0, max(data, (d) => d.gdpPercap)])
    .nice()
    .range([0, innerWidth]);

  const yScale = scaleLinear()
    .domain([35, max(data, (d) => d.lifeExp)])
    .nice()
    .range([innerHeight, 0]);

  const rScale = scaleSqrt()
    .domain([0, max(data, (d) => d.pop)])
    .range([2, 50]);

  const colorScale = scaleOrdinal().domain(CONTINENTS).range(CONTINENT_COLORS);

  const xTicks = xScale.ticks(width < 500 ? 5 : width < 800 ? 8 : 10);
  const yTicks = yScale.ticks(width < 500 ? 6 : 8);

  const sortedData = [...data].sort((a, b) => b.pop - a.pop);

  // Min and max country per continent on the chosen metric → labels
  const metricKey = labelMetric;
  const labelPoints = [];
  CONTINENTS.forEach((c) => {
    if (!active.has(c)) return;
    const inContinent = data.filter((d) => d.continent === c);
    if (inContinent.length === 0) return;
    const minD = inContinent.reduce((a, b) =>
      a[metricKey] < b[metricKey] ? a : b,
    );
    const maxD = inContinent.reduce((a, b) =>
      a[metricKey] > b[metricKey] ? a : b,
    );
    labelPoints.push({ ...minD, anchor: "below" });
    if (minD !== maxD) labelPoints.push({ ...maxD, anchor: "above" });
  });

  // Place labels greedily with a y-nudge + x-clamp to avoid overlaps and edges.
  const CHAR_W = 5.5;
  const TEXT_H = 11;
  const STEP = 13;
  const MAX_ATTEMPTS = 6;
  const placed = [];
  // Bigger bubbles place first — they win prime spots, smaller ones dodge.
  const labelOrder = [...labelPoints].sort((a, b) => b.pop - a.pop);
  const positionedLabels = labelOrder.map((d) => {
    const cx0 = xScale(d.gdpPercap);
    const cy = yScale(d.lifeExp);
    const r = rScale(d.pop);
    const halfW = (d.country.length * CHAR_W) / 2;
    const cx = Math.max(halfW + 2, Math.min(innerWidth - halfW - 2, cx0));
    const dir = d.anchor === "above" ? -1 : 1;
    let gap = dir === -1 ? r + 5 : r + 12;
    let placedAttempt = 0;
    let py = cy + dir * gap;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const y = cy + dir * gap;
      const top = y - TEXT_H + 2;
      const bottom = y + 2;
      const left = cx - halfW;
      const right = cx + halfW;
      const collides = placed.some(
        (p) =>
          right > p.left && left < p.right && bottom > p.top && top < p.bottom,
      );
      if (!collides) {
        placed.push({ left, right, top, bottom });
        py = y;
        placedAttempt = attempt;
        break;
      }
      gap += STEP;
      py = cy + dir * gap;
      placedAttempt = attempt + 1;
    }
    return { ...d, cx0, cy, r, dir, px: cx, py, attempt: placedAttempt };
  });

  const toggle = (c) => {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next.size === 0 ? new Set(CONTINENTS) : next;
    });
  };

  // Combined legend box: pinned to chart gridlines ($35K, 60 years).
  const LEG_PAD = 10;
  const LEG_ROW = 20;
  const continentRowW = 80; // for clickable hit area
  // Pin to ($35K, 60yr) when there's room, otherwise force a min legend width.
  // Small right inset so the box doesn't touch the chart edge.
  const LEG_RIGHT_INSET = 1;
  const MIN_LEG_W = 150;
  const idealLegBoxX = xScale(35000);
  const legBoxX = Math.min(
    idealLegBoxX,
    innerWidth - MIN_LEG_W - LEG_RIGHT_INSET,
  );
  const legBoxY = yScale(60);
  const LEG_W = innerWidth - legBoxX - LEG_RIGHT_INSET;
  const legBoxH = innerHeight - legBoxY - 1;

  // Population block (centered horizontally in box).
  const popMaxR = rScale(POP_LEGEND_VALUES[POP_LEGEND_VALUES.length - 1]);
  const popBlockW = popMaxR * 2 + 14 + 36; // circles + leader gap + label
  const popLeftX = Math.round((LEG_W - popBlockW) / 2);
  const popCx = popLeftX + popMaxR;
  const popLabelX = popLeftX + popMaxR * 2 + 14;

  // Continent title aligns with Population title; items indented partway toward centre.
  const continentTitleX = popLeftX;
  const continentItemsX = popLeftX + 28;
  const continentTitleY = LEG_PAD;
  const continentItemsTopY = continentTitleY + 22;
  const continentSectionEndY =
    continentItemsTopY + (CONTINENTS.length - 1) * LEG_ROW + 10;
  const popTitleY = continentSectionEndY + 14;
  const popBaseY = popTitleY + 22 + popMaxR * 2;

  return (
    <div ref={containerRef} className="bubble-chart">
      <div className="chart-controls">
        <span className="chart-controls__label">Min/Max per Continent by:</span>
        <div className="segmented" role="group">
          {Object.values(LABEL_METRICS).map((m) => (
            <button
              key={m.key}
              type="button"
              className={labelMetric === m.key ? "is-active" : ""}
              onClick={() => setLabelMetric(m.key)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        preserveAspectRatio="xMidYMid meet"
      >
        <g transform={`translate(${MARGIN.left}, ${MARGIN.top})`}>
          {/* gridlines */}
          <g className="gridlines">
            {yTicks.map((t) => (
              <line
                key={`gy-${t}`}
                x1={0}
                x2={innerWidth}
                y1={yScale(t)}
                y2={yScale(t)}
              />
            ))}
            {xTicks.map((t) => (
              <line
                key={`gx-${t}`}
                x1={xScale(t)}
                x2={xScale(t)}
                y1={0}
                y2={innerHeight}
              />
            ))}
          </g>

          {/* circles */}
          <g className="bubbles">
            {sortedData.map((d) => {
              const isActive = active.has(d.continent);
              return (
                <circle
                  key={d.country}
                  cx={xScale(d.gdpPercap)}
                  cy={yScale(d.lifeExp)}
                  r={rScale(d.pop)}
                  fill={colorScale(d.continent)}
                  fillOpacity={isActive ? 0.65 : 0.05}
                  stroke={colorScale(d.continent)}
                  strokeOpacity={isActive ? 0.9 : 0.1}
                />
              );
            })}
          </g>

          {/* country labels (min/max per continent on chosen metric) */}
          <g className="country-labels">
            {positionedLabels.map((d) => {
              const shifted = d.attempt > 0 || Math.abs(d.cx0 - d.px) > 1;
              const lineEndY = d.dir === -1 ? d.py + 4 : d.py - 10;
              return (
                <g key={`${d.country}-${d.anchor}`}>
                  {shifted && (
                    <line
                      className="label-leader"
                      x1={d.cx0}
                      y1={d.cy + d.dir * d.r}
                      x2={d.px}
                      y2={lineEndY}
                    />
                  )}
                  <text x={d.px} y={d.py} textAnchor="middle">
                    {d.country}
                  </text>
                </g>
              );
            })}
          </g>

          {/* x-axis */}
          <g transform={`translate(0, ${innerHeight})`} className="axis">
            <line x1={0} x2={innerWidth} stroke="currentColor" />
            {xTicks.map((t) => (
              <g key={t} transform={`translate(${xScale(t)}, 0)`}>
                <line y2={6} stroke="currentColor" />
                <text y={20} textAnchor="middle">
                  {formatGdp(t)}
                </text>
              </g>
            ))}
            <text x={innerWidth} y={45} textAnchor="end" className="axis-title">
              GDP per capita (USD)
            </text>
          </g>

          {/* y-axis */}
          <g className="axis">
            <line y1={0} y2={innerHeight} stroke="currentColor" />
            {yTicks.map((t) => (
              <g key={t} transform={`translate(0, ${yScale(t)})`}>
                <line x2={-6} stroke="currentColor" />
                <text x={-10} dy="0.32em" textAnchor="end">
                  {t}
                </text>
              </g>
            ))}
            <text
              transform="rotate(-90)"
              x={0}
              y={-55}
              textAnchor="end"
              className="axis-title"
            >
              Life expectancy (years)
            </text>
          </g>

          {/* combined legend box (Continent + Population) */}
          <g
            className="legend legend-box"
            transform={`translate(${legBoxX}, ${legBoxY})`}
          >
            <rect className="legend-bg" width={LEG_W} height={legBoxH} rx={8} />

            <text
              x={continentTitleX}
              y={continentTitleY}
              dominantBaseline="hanging"
              className="legend-title"
            >
              Continent
            </text>
            {CONTINENTS.map((continent, i) => {
              const isActive = active.has(continent);
              return (
                <g
                  key={continent}
                  transform={`translate(${continentItemsX}, ${
                    continentItemsTopY + i * LEG_ROW
                  })`}
                  className={`legend-item ${isActive ? "" : "is-inactive"}`}
                  onClick={() => toggle(continent)}
                >
                  <rect
                    x={-6}
                    y={-10}
                    width={continentRowW + 6}
                    height={LEG_ROW}
                    fill="transparent"
                  />
                  <circle
                    cx={6}
                    r={6}
                    fill={colorScale(continent)}
                    fillOpacity={isActive ? 0.7 : 0.15}
                    stroke={colorScale(continent)}
                    strokeOpacity={isActive ? 0.9 : 0.3}
                  />
                  <text x={20} dy="0.32em">
                    {continent}
                  </text>
                </g>
              );
            })}

            <text
              x={popLeftX}
              y={popTitleY}
              dominantBaseline="hanging"
              className="legend-title"
            >
              Population
            </text>
            <g className="legend-pop-group">
              {POP_LEGEND_VALUES.map((v, i) => {
                const r = rScale(v);
                const isMax = i === POP_LEGEND_VALUES.length - 1;
                return (
                  <g key={v}>
                    <circle cx={popCx} cy={popBaseY - r} r={r} fill="none" />
                    <line
                      x1={popCx}
                      x2={popLabelX - 2}
                      y1={popBaseY - r * 2}
                      y2={popBaseY - r * 2}
                      strokeDasharray="2,2"
                    />
                    <text x={popLabelX} y={popBaseY - r * 2} dy="0.32em">
                      {formatPop(v, isMax)}
                    </text>
                  </g>
                );
              })}
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
}
