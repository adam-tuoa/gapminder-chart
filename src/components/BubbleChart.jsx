import { useEffect, useRef, useState } from "react";
import { scaleLinear, scaleLog, scaleSqrt, scaleOrdinal, max } from "d3";
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

const formatGdp = (n) => {
  if (n === 0) return "$0";
  if (n < 1000) return `$${n}`;
  return `$${n / 1000}K`;
};
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
  const [xScaleType, setXScaleType] = useState("linear");
  const [legendOpen, setLegendOpen] = useState(true);

  // Smoothly transition bubble x-positions when toggling scale type.
  // Scoped to the toggle so resize still snaps instantly (a 1s lag during
  // continuous resize would feel broken).
  const [isScaleAnimating, setIsScaleAnimating] = useState(false);
  const changeScale = (next) => {
    if (next === xScaleType) return;
    // Set animating flag and new scale in the same event so React batches them
    // into one render — the is-animating class lands on the same paint as the
    // new cx values, which is what the browser needs to start a CSS transition.
    setIsScaleAnimating(true);
    setXScaleType(next);
  };
  useEffect(() => {
    if (!isScaleAnimating) return;
    const t = setTimeout(() => setIsScaleAnimating(false), 1600);
    return () => clearTimeout(t);
  }, [isScaleAnimating]);

  const innerWidth = width - MARGIN.left - MARGIN.right;
  const innerHeight = height - MARGIN.top - MARGIN.bottom;

  const xScale =
    xScaleType === "log"
      ? scaleLog().domain([250, 64000]).range([0, innerWidth])
      : scaleLinear()
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

  // Log scale: doubling ticks for evenly-spaced gridlines.
  const doublingTicks = (start, end) => {
    const ticks = [];
    for (let v = start; v <= end; v *= 2) ticks.push(v);
    return ticks;
  };
  const xTicks =
    xScaleType === "log"
      ? doublingTicks(250, 64000)
      : xScale.ticks(width < 500 ? 5 : width < 800 ? 8 : 10);
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
    const preferredDir = d.anchor === "above" ? -1 : 1;
    let dir = preferredDir;
    let placedAttempt = 0;
    let py = cy + dir * (dir === -1 ? r + 5 : r + 12);
    let placedOk = false;
    // Try preferred direction first, then flip to the opposite side if
    // every candidate above (or below) collides or leaves the chart.
    for (const tryDir of [preferredDir, -preferredDir]) {
      let gap = tryDir === -1 ? r + 5 : r + 12;
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const y = cy + tryDir * gap;
        const top = y - TEXT_H + 2;
        const bottom = y + 2;
        const left = cx - halfW;
        const right = cx + halfW;
        const outOfBounds = top < 0 || bottom > innerHeight;
        const collides = placed.some(
          (p) =>
            right > p.left &&
            left < p.right &&
            bottom > p.top &&
            top < p.bottom,
        );
        if (!outOfBounds && !collides) {
          placed.push({ left, right, top, bottom });
          py = y;
          dir = tryDir;
          placedAttempt = attempt + (tryDir === preferredDir ? 0 : 1);
          placedOk = true;
          break;
        }
        gap += STEP;
      }
      if (placedOk) break;
    }
    if (!placedOk) {
      // Both sides full — clamp into the chart so the label is at least visible.
      py = Math.max(TEXT_H, Math.min(innerHeight - 2, py));
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
        <div className="chart-controls__group">
          <span className="chart-controls__label">
            Min/Max per Continent by:
          </span>
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
        <div className="chart-controls__group">
          <span className="chart-controls__label">GDP scale:</span>
          <div className="segmented" role="group">
            <button
              type="button"
              className={xScaleType === "linear" ? "is-active" : ""}
              onClick={() => changeScale("linear")}
            >
              Linear
            </button>
            <button
              type="button"
              className={xScaleType === "log" ? "is-active" : ""}
              onClick={() => changeScale("log")}
            >
              Log
            </button>
          </div>
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
          <g className={`bubbles${isScaleAnimating ? " is-animating" : ""}`}>
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
          <g
            className={`country-labels${isScaleAnimating ? " is-animating" : ""}`}
          >
            {positionedLabels.map((d) => {
              const shifted = d.attempt > 0 || Math.abs(d.cx0 - d.px) > 1;
              // Leader line is in label-local coords so it moves with the
              // wrapping <g transform>. End sits just above/below text.
              const lineLocalEndY = d.dir === -1 ? 4 : -10;
              return (
                <g
                  key={`${d.country}-${d.anchor}`}
                  className="country-label"
                  style={{ transform: `translate(${d.px}px, ${d.py}px)` }}
                >
                  {shifted && (
                    <line
                      className="label-leader"
                      x1={d.cx0 - d.px}
                      y1={d.cy + d.dir * d.r - d.py}
                      x2={0}
                      y2={lineLocalEndY}
                    />
                  )}
                  <text textAnchor="middle">{d.country}</text>
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

          {/* combined legend box (Continent + Population) — toggleable */}
          {legendOpen ? (
          <g
            className="legend legend-box"
            transform={`translate(${legBoxX}, ${legBoxY})`}
          >
            <rect className="legend-bg" width={LEG_W} height={legBoxH} rx={8} />

            {/* close button (X) — top-right */}
            <g
              className="legend-close"
              transform={`translate(${LEG_W - 16}, 16)`}
              onClick={() => setLegendOpen(false)}
              role="button"
              aria-label="Close legend"
            >
              <rect x={-10} y={-10} width={20} height={20} rx={4} />
              <line x1={-4} y1={-4} x2={4} y2={4} />
              <line x1={-4} y1={4} x2={4} y2={-4} />
            </g>

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
          ) : (
            <g
              className="legend-tab"
              transform={`translate(${legBoxX}, ${innerHeight - 28})`}
              onClick={() => setLegendOpen(true)}
              role="button"
              aria-label="Show legend"
            >
              <rect width={LEG_W - LEG_RIGHT_INSET} height={26} rx={6} />
              <text
                x={(LEG_W - LEG_RIGHT_INSET) / 2}
                y={13}
                textAnchor="middle"
                dominantBaseline="middle"
              >
                Show legend
              </text>
            </g>
          )}
        </g>
      </svg>
    </div>
  );
}
