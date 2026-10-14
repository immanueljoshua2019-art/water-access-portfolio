/**
 * Builds presentation/water-access-portfolio-deck.pptx from data/summary_metrics.json
 * and the charts in plots/reproduced.
 *
 *   npm install pptxgenjs sharp        (once)
 *   python scripts/run_analysis.py     (creates the metrics + plots)
 *   node scripts/build_deck.js
 */
const path = require("path");
const fs = require("fs");
const pptxgen = require("pptxgenjs");
const sharp = require("sharp");

const ROOT = path.resolve(__dirname, "..");
const M = JSON.parse(fs.readFileSync(path.join(ROOT, "data/summary_metrics.json"), "utf8"));
const PLOT = (f) => path.join(ROOT, "plots/reproduced", f);
const OUT = path.join(ROOT, "presentation/water-access-portfolio-deck.pptx");

// ---------------- design tokens ----------------
const NAVY = "0B2545", DEEP = "13315C", TEAL = "1B7F9E", SKY = "5FB0C9", AMBER = "F2B134",
  ORANGE = "E07A3F", RED = "B83227", MUTED = "5B6B7B", LIGHT = "F1F6F9", RULE = "D5DFE6", WHITE = "FFFFFF", GREYBLUE = "9AA7B4";
const HEAD = "Cambria", BODY = "Calibri";
const LEVEL = { Basic: TEAL, Limited: AMBER, Unimproved: ORANGE, Surface: RED };
const AREA = { National: NAVY, Rural: ORANGE, Urban: TEAL };

const THEME = {
  name: "Water Access Portfolio", headFontFace: HEAD, bodyFontFace: BODY,
  colors: { dk1: NAVY, lt1: WHITE, dk2: DEEP, lt2: LIGHT, accent1: TEAL, accent2: AMBER, accent3: ORANGE,
    accent4: RED, accent5: SKY, accent6: GREYBLUE, hlink: TEAL, folHlink: MUTED },
};

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9"; // 10 x 5.625 in
pres.theme = { headFontFace: HEAD, bodyFontFace: BODY };
pres.author = "Joshua";
pres.title = "Access to Safe Drinking Water - Data Analysis Portfolio";
pres.subject = "WHO/UNICEF JMP estimates on the use of water (SDG 6)";

pres.defineSlideMaster({
  title: "CONTENT", background: { color: WHITE },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.5, y: 0.55, w: 9.0, h: 0.85, fontFace: HEAD, fontSize: 26, bold: true, color: NAVY, valign: "top", align: "left", margin: 0 }, text: "" } },
    { text: { text: "Access to safe drinking water  |  Data analysis portfolio", options: { x: 0.5, y: 5.3, w: 6, h: 0.25, fontFace: BODY, fontSize: 10, color: MUTED, margin: 0 } } },
  ],
  slideNumber: { x: 9.0, y: 5.3, w: 0.5, h: 0.25, fontFace: BODY, fontSize: 10, color: MUTED, align: "right" },
});
pres.defineSlideMaster({
  title: "DARK", background: { color: NAVY },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.5, y: 0.55, w: 9.0, h: 0.85, fontFace: HEAD, fontSize: 28, bold: true, color: WHITE, valign: "top", align: "left", margin: 0 }, text: "" } },
  ],
  slideNumber: { x: 9.0, y: 5.3, w: 0.5, h: 0.25, fontFace: BODY, fontSize: 10, color: GREYBLUE, align: "right" },
});
pres.defineSlideMaster({
  title: "COVER", background: { color: NAVY },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 1.45, w: 6.3, h: 1.75, fontFace: HEAD, fontSize: 36, bold: true, color: WHITE, valign: "top", align: "left", margin: 0 }, text: "" } },
  ],
});

// ---------------- helpers ----------------
const f1 = (v) => Number(v).toFixed(1), f2 = (v) => Number(v).toFixed(2), f0 = (v) => Math.round(v).toString();
let sectionOpen = {};
function section(title) { pres.addSection({ title }); }

function contentSlide(eyebrow, title, notes, sectionTitle) {
  const s = pres.addSlide({ masterName: "CONTENT", sectionTitle });
  s.addText(eyebrow.toUpperCase(), { x: 0.5, y: 0.25, w: 9, h: 0.25, fontFace: BODY, fontSize: 11, bold: true, color: TEAL, charSpacing: 2, margin: 0, isTextBox: true, objectName: "Eyebrow" });
  s.addText(title, { placeholder: "title" });
  if (notes) s.addNotes(notes);
  return s;
}

function statCard(s, x, y, w, h, big, label, opts = {}) {
  const fill = opts.fill || LIGHT, bigColor = opts.bigColor || TEAL, labColor = opts.labColor || NAVY;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, fill: { color: fill }, line: { color: fill, width: 0 }, rectRadius: 0.08, objectName: "Stat card" });
  s.addText(big, { x: x + 0.15, y: y + 0.08, w: w - 0.3, h: h * 0.5, fontFace: HEAD, fontSize: opts.bigSize || 30, bold: true, color: bigColor, valign: "middle", margin: 0, isTextBox: true });
  s.addText(label, { x: x + 0.15, y: y + h * 0.55, w: w - 0.3, h: h * 0.4, fontFace: BODY, fontSize: opts.labSize || 12, color: labColor, valign: "top", margin: 0, isTextBox: true });
}

async function img(s, file, x, y, w, h, alt) {
  const meta = await sharp(PLOT(file)).metadata();
  const ar = meta.width / meta.height;
  let iw = w, ih = w / ar;
  if (ih > h) { ih = h; iw = h * ar; }
  s.addImage({ path: PLOT(file), x: x + (w - iw) / 2, y: y + (h - ih) / 2, w: iw, h: ih, altText: alt });
}

const chartBase = {
  catAxisLabelColor: MUTED, valAxisLabelColor: MUTED, catAxisLabelFontFace: BODY, valAxisLabelFontFace: BODY,
  catAxisLabelFontSize: 11, valAxisLabelFontSize: 10, valGridLine: { color: RULE, size: 0.5 }, catGridLine: { style: "none" },
  dataLabelFontFace: BODY, dataLabelFontSize: 10, legendFontFace: BODY, legendFontSize: 11, legendColor: MUTED,
  titleFontFace: HEAD, titleColor: NAVY, titleFontSize: 13,
};

function bullets(items, o = {}) {
  return items.map((t, i) => ({ text: t, options: { bullet: { indent: 14 }, breakLine: i < items.length - 1, paraSpaceAfter: o.gap ?? 6 } }));
}

(async () => {
  const p1 = M.p1, p2 = M.p2;

  // ============ 1. TITLE ============
  section("Introduction");
  let s = pres.addSlide({ masterName: "COVER", sectionTitle: "Introduction" });
  for (const [d, t] of [[7.4, 88], [5.6, 84], [3.8, 78], [2.0, 70]]) {
    s.addShape(pres.shapes.OVAL, { x: 7.6 - d / 2 + 0.6, y: 2.75 - d / 2, w: d, h: d, fill: { color: TEAL, transparency: t }, line: { color: SKY, width: 1, transparency: 55 }, objectName: "Ripple" });
  }
  s.addText("DATA ANALYSIS PORTFOLIO  |  UN SDG 6: CLEAN WATER AND SANITATION", { x: 0.6, y: 0.8, w: 6.4, h: 0.5, fontFace: BODY, fontSize: 11, bold: true, color: SKY, charSpacing: 2, margin: 0, isTextBox: true });
  s.addText("Who still lacks safe drinking water, and is it improving?", { placeholder: "title" });
  s.addText("An end-to-end analysis of WHO/UNICEF JMP estimates: 213 countries in 2020, and 231 countries tracked from 2015 to 2020.", { x: 0.6, y: 3.35, w: 5.9, h: 0.8, fontFace: BODY, fontSize: 16, color: "D9E6EE", margin: 0, isTextBox: true });
  s.addText("Joshua  |  Google Sheets + Python", { x: 0.6, y: 4.7, w: 6, h: 0.3, fontFace: BODY, fontSize: 13, color: GREYBLUE, margin: 0, isTextBox: true });
  s.addNotes("Portfolio walk-through of a two-part water-access analysis. Part 1 profiles the 2020 snapshot; Part 2 measures change between 2015 and 2020 using the Annual Rate of Change (ARC).");

  // ============ 2. PROJECT AT A GLANCE ============
  s = contentSlide("Project overview", "A two-part study of access to drinking water", "SDG 6 asks for safe and affordable drinking water for all. The JMP ladder used here has four levels: at least basic, limited, unimproved and surface water.");
  s.addText([
    { text: "Why it matters", options: { bold: true, fontSize: 16, color: NAVY, breakLine: true, paraSpaceAfter: 4 } },
    { text: "UN SDG 6 calls for safe, affordable drinking water for everyone. The WHO/UNICEF Joint Monitoring Programme ranks service on a ladder: at least basic, limited, unimproved, surface water.", options: { fontSize: 14, color: NAVY, breakLine: true, paraSpaceAfter: 12 } },
    { text: "Questions I set out to answer", options: { bold: true, fontSize: 16, color: NAVY, breakLine: true, paraSpaceAfter: 4 } },
    ...bullets(["Who lacks access: by area, population size, income?", "Is access improving, and how fast?", "Which regions are furthest behind?"], { gap: 4 }),
  ], { x: 0.5, y: 1.5, w: 4.3, h: 3.5, fontFace: BODY, valign: "top", margin: 0, isTextBox: true });
  const cards = [["213", "countries in the 2020 snapshot (Part 1)"], ["231", "countries tracked 2015 to 2020 (Part 2)"], ["12", "access measures: 4 service levels x national, rural, urban"], ["+19", "engineered features on top of the 16 original columns"]];
  cards.forEach((c, i) => statCard(s, 5.2 + (i % 2) * 2.2, 1.5 + Math.floor(i / 2) * 1.8, 2.05, 1.65, c[0], c[1], { bigSize: 34 }));

  // ============ 3. EXECUTIVE SUMMARY ============
  s = contentSlide("Executive summary", "Four findings: a rural gap, an income gap, uneven progress, one region behind", "The ~770 million figure is derived from the 2020 dataset as the sum over countries of (100 - basic access %) x population, so it is approximate and slightly understated because two countries have no national value. The time-to-full-access figure is an illustrative linear extrapolation of unweighted regional averages.");
  const ppl = 768;
  const ex = [
    ["~" + ppl + "M", "people in the 2020 data lack at least basic drinking water (about 1 in 10)", NAVY],
    [f1(p1.mean_basic.u - p1.mean_basic.r) + " pts", `rural-urban gap in basic access: ${f1(p1.mean_basic.r)}% rural vs ${f1(p1.mean_basic.u)}% urban (country means)`, ORANGE],
    [f0(p1.income["Low income"].avg_basic_pct) + "% vs " + f1(p1.income["High income"].avg_basic_pct) + "%", "basic access in low-income vs high-income countries: income is the sharpest divider", RED],
    [p2.counts.National.ARC_above_0_not_full + " of 231", `countries improved national access 2015-2020; ${p2.counts.National.full_access} were already at full access, 16 stalled, 16 declined`, TEAL],
  ];
  ex.forEach((e, i) => {
    const x = 0.5 + (i % 2) * 4.6, y = 1.5 + Math.floor(i / 2) * 1.6;
    statCard(s, x, y, 4.4, 1.45, e[0], e[1], { bigColor: e[2], bigSize: 30, labSize: 13 });
  });
  s.addText("Sub-Saharan Africa has the fastest national gains (0.56 pp a year) yet the furthest to go: 37 of the 44 countries below 80% basic access are there.", { x: 0.5, y: 4.75, w: 9, h: 0.5, fontFace: BODY, fontSize: 12, italic: true, color: MUTED, margin: 0, isTextBox: true });

  // ============ 4. WORKFLOW ============
  s = contentSlide("Approach", "From messy imports to measured insight in four stages", "Both parts follow the same loop. Spreadsheet formulas were used to build every feature, and a Python script reproduces them and checks the results against the workbooks.");
  const steps = [
    ["1", "Import and clean", ["Fix semicolon-split rows", "Handle NAN and null markers", "Cap impossible values >100%"]],
    ["2", "Engineer features", ["Urban and rural counts", "Year gap, ARC columns", "Full-access flags, region"]],
    ["3", "Summarise", ["Mean, median, mode, IQR, SD", "Pivot by income group", "ARC averages and counts"]],
    ["4", "Visualise", ["Box plots, stacked columns", "Histograms, bubble chart", "Plain-language takeaways"]],
  ];
  steps.forEach((st, i) => {
    const x = 0.5 + i * 2.28;
    s.addShape(pres.shapes.OVAL, { x: x + 0.05, y: 1.55, w: 0.55, h: 0.55, fill: { color: i % 2 ? TEAL : NAVY }, line: { color: WHITE, width: 0 }, objectName: "Step marker" });
    s.addText(st[0], { x: x + 0.05, y: 1.55, w: 0.55, h: 0.55, align: "center", valign: "middle", fontFace: HEAD, fontSize: 18, bold: true, color: WHITE, margin: 0, isTextBox: true });
    s.addText(st[1], { x: x, y: 2.2, w: 2.1, h: 0.35, fontFace: HEAD, fontSize: 15, bold: true, color: NAVY, margin: 0, isTextBox: true });
    s.addText(bullets(st[2], { gap: 3 }), { x: x, y: 2.6, w: 2.1, h: 1.3, fontFace: BODY, fontSize: 12, color: NAVY, valign: "top", margin: 0, isTextBox: true });
  });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.5, y: 4.05, w: 9, h: 0.95, fill: { color: LIGHT }, line: { color: LIGHT, width: 0 }, rectRadius: 0.08, objectName: "Toolkit band" });
  s.addText([
    { text: "Spreadsheet toolkit  ", options: { bold: true, color: TEAL } },
    { text: "COUNTA, IF / IFERROR, LOOKUP, QUARTILE, ROUNDUP, COUNTIFS, pivot tables, native charts", options: { color: NAVY, breakLine: true } },
    { text: "Python reproduction  ", options: { bold: true, color: TEAL } },
    { text: "pandas and matplotlib re-derive every metric; 84 of 84 checks match the workbooks", options: { color: NAVY } },
  ], { x: 0.7, y: 4.1, w: 8.6, h: 0.85, fontFace: BODY, fontSize: 13, valign: "middle", margin: 0, isTextBox: true });

  // ============ PART 1 ============
  section("Part 1: 2020 snapshot");
  // 5. cleaning
  s = contentSlide("Part 1  |  Data preparation", "Cleaning came first: three import problems fixed", "Five rows were delimited by semicolons, so their values sat in one cell. COUNTA over each row should return 16 (one per feature); filtering out 16 isolates the broken rows. Nine national basic-access values were slightly above 100% (maximum 100.0000037), which is impossible for a share.", "Part 1: 2020 snapshot");
  const fixes = [
    ["Semicolon-split rows", "5 rows imported into a single cell. Added value_cnt = COUNTA(row), filtered out the expected 16, then used Split text to columns on only the affected cells."],
    ["Shares above 100%", `${p1.n_over_100} basic-access values exceeded 100% (max ${p1.max_basic_raw.toFixed(7)}). Created wat_bas_n (rounded), so no share exceeds 100%.`],
    ["Missing values", "Missing estimates arrive as text (NAN). Replaced #VALUE! rounding errors with NAN so MAX, AVERAGE and QUARTILE ignore them."],
  ];
  fixes.forEach((f, i) => {
    const y = 1.55 + i * 1.18;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.5, y, w: 5.6, h: 1.05, fill: { color: LIGHT }, line: { color: LIGHT, width: 0 }, rectRadius: 0.08, objectName: "Fix card" });
    s.addText([{ text: f[0], options: { bold: true, fontSize: 14, color: NAVY, breakLine: true } }, { text: f[1], options: { fontSize: 12, color: MUTED } }], { x: 0.65, y: y + 0.05, w: 5.3, h: 0.95, fontFace: BODY, valign: "middle", margin: 0, isTextBox: true });
  });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 6.4, y: 1.55, w: 3.1, h: 3.45, fill: { color: NAVY }, line: { color: NAVY, width: 0 }, rectRadius: 0.08, objectName: "Formula card" });
  s.addText([
    { text: "The check that caught them", options: { fontSize: 14, bold: true, color: SKY, breakLine: true, paraSpaceAfter: 8 } },
    { text: "value_cnt", options: { fontFace: "Courier New", fontSize: 13, color: WHITE, breakLine: true } },
    { text: "= COUNTA(A2:P2)", options: { fontFace: "Courier New", fontSize: 13, color: AMBER, breakLine: true, paraSpaceAfter: 10 } },
    { text: "Every clean row returns 16. In the final data all 213 country rows do.", options: { fontSize: 13, color: "D9E6EE" } },
  ], { x: 6.55, y: 1.65, w: 2.8, h: 3.25, fontFace: BODY, valign: "top", margin: 0, isTextBox: true });

  // 6. representativeness
  s = contentSlide("Part 1  |  Population size", `The dataset covers ${f1(p1.dataset_pop / p1.world_pop * 100)}% of the world's people`, "Percentage difference = |V2 - V1| / ((V1 + V2) / 2) x 100. The urban percentage and the urban head count differ because the head count is built country by country from pop_n x pop_u / 100, while the world figure applies one 55% share.", "Part 1: 2020 snapshot");
  s.addChart(pres.charts.BAR, [
    { name: "Dataset", labels: ["Total population (bn)", "Urban population (bn)"], values: [p1.dataset_pop / 1e9, 4.3753084625] },
    { name: "World estimate", labels: ["Total population (bn)", "Urban population (bn)"], values: [p1.world_pop / 1e9, p1.world_pop * 0.55 / 1e9] },
  ], { ...chartBase, x: 0.5, y: 1.5, w: 5.2, h: 3.6, barDir: "col", barGrouping: "clustered", chartColors: [TEAL, GREYBLUE], showLegend: true, legendPos: "b", showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "0.00", valAxisMinVal: 0, valAxisMaxVal: 9, valAxisLabelFormatCode: "0", showTitle: true, title: "Dataset vs world estimate, 2020" });
  statCard(s, 6.0, 1.5, 3.5, 1.05, f2(p1.pop_pct_diff) + "%", "difference in total population (dataset vs 7.821 bn world)", { bigSize: 28, bigColor: NAVY });
  statCard(s, 6.0, 2.7, 3.5, 1.05, f1(p1.ds_urban_share) + "%", "urban share in the dataset vs 55% for the world", { bigSize: 28, bigColor: TEAL });
  statCard(s, 6.0, 3.9, 3.5, 1.05, f2(p1.urban_total_pct_diff_world) + "%", "difference in urban head count vs the world estimate", { bigSize: 28, bigColor: ORANGE });

  // 7. urban vs population
  s = contentSlide("Part 1  |  Population size", "Population size says nothing about how urban a country is", "The first line chart was unreadable: China and India (over 1.3 billion each) stretch the x-axis so 200+ countries are squashed together. I weighed three fixes: delete outliers (loses countries), cap the axis (hides the largest) or change the unit. The log-scale scatter keeps every country visible.", "Part 1: 2020 snapshot");
  await img(s, "01_urban_share_vs_population.png", 0.5, 1.5, 5.9, 3.6, "Scatter of urban share against national population on a log scale");
  s.addText([
    { text: `r = ${f2(p1.corr_pop_urban)}`, options: { fontFace: HEAD, fontSize: 30, bold: true, color: TEAL, breakLine: true, paraSpaceAfter: 6 } },
    { text: "Large and small countries are equally likely to be mostly urban or mostly rural.", options: { fontSize: 14, color: NAVY, breakLine: true, paraSpaceAfter: 12 } },
    { text: "Chart decision log", options: { bold: true, fontSize: 14, color: NAVY, breakLine: true, paraSpaceAfter: 4 } },
    ...bullets(["Outliers (China, India) crushed the first line chart", "Chose a unit change over deleting data", "A log axis keeps all 213 countries visible"], { gap: 3 }).map((b) => ({ ...b, options: { ...b.options, fontSize: 12, color: NAVY } })),
  ], { x: 6.7, y: 1.5, w: 2.8, h: 3.6, fontFace: BODY, valign: "top", margin: 0, isTextBox: true });

  // 8. access by area boxplot
  s = contentSlide("Part 1  |  Access by area", "Rural access is both lower and far less even than urban", "Mean, median, mode, quartiles, IQR and standard deviation were computed for all 12 service-level features. Means exclude countries with no value for that feature. Mean below median means a left-skewed distribution: most countries sit near 100% with a long tail of low-access countries.", "Part 1: 2020 snapshot");
  await img(s, "02_access_boxplots_by_area.png", 0.5, 1.45, 6.0, 3.7, "Box and whisker plots of the 12 water access features");
  const tr = [["Basic %", "Natl", "Rural", "Urban"], ["Mean", f1(p1.mean_basic.n), f1(p1.mean_basic.r), f1(p1.mean_basic.u)], ["Median", f1(p1.median_basic.n), f1(p1.median_basic.r), f1(p1.median_basic.u)], ["IQR", f1(p1.iqr_basic.n), f1(p1.iqr_basic.r), f1(p1.iqr_basic.u)], ["Lowest", f1(p1.min_basic.n), f1(p1.min_basic.r), f1(p1.min_basic.u)]];
  s.addTable(tr.map((row, ri) => row.map((c, ci) => ({ text: c, options: { bold: ri === 0 || ci === 0, color: ri === 0 ? WHITE : NAVY, fill: { color: ri === 0 ? NAVY : (ri % 2 ? LIGHT : WHITE) }, align: ci === 0 ? "left" : "center", fontSize: 12, fontFace: BODY } }))),
    { x: 6.7, y: 1.5, w: 2.8, colW: [1.0, 0.6, 0.6, 0.6], rowH: 0.34, border: { type: "solid", color: RULE, pt: 0.5 }, margin: [0.04, 0.06, 0.04, 0.06] });
  s.addText([
    { text: `Rural spread (IQR) is ${f1(p1.iqr_basic.r / p1.iqr_basic.u)}x the urban spread.`, options: { breakLine: true, paraSpaceAfter: 6 } },
    { text: "Most countries sit at or near 100% (mode = 100), pulling the median above the mean.", options: {} },
  ], { x: 6.7, y: 3.4, w: 2.8, h: 1.7, fontFace: BODY, fontSize: 13, color: NAVY, valign: "top", margin: 0, isTextBox: true });

  // 9. service levels
  s = contentSlide("Part 1  |  Access by area", "Where basic water is missing, rural people fall to the lowest rungs", "Basic access dominates every column, so this chart shows the three lower rungs of the ladder where the differences are visible. Rural surface-water use is about 13 times the urban rate.", "Part 1: 2020 snapshot");
  const lowLv = ["Limited", "Unimproved", "Surface"];
  const lvKey = { Limited: "lim", Unimproved: "unimp", Surface: "sur" };
  s.addChart(pres.charts.BAR, ["National", "Rural", "Urban"].map((a) => ({ name: a, labels: lowLv, values: lowLv.map((l) => p1.mean_levels[a[0].toLowerCase()][lvKey[l]]) })),
    { ...chartBase, x: 0.5, y: 1.5, w: 5.8, h: 3.6, barDir: "col", barGrouping: "clustered", chartColors: [NAVY, ORANGE, TEAL], showLegend: true, legendPos: "b", showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "0.0", valAxisMinVal: 0, valAxisMaxVal: 10, valAxisLabelFormatCode: "0", showTitle: true, title: "Mean share of population, % (2020)", valAxisTitle: "% of population", showValAxisTitle: true, valAxisTitleColor: MUTED, valAxisTitleFontSize: 10 });
  statCard(s, 6.6, 1.5, 2.9, 1.05, f1(p1.mean_levels.r.sur / p1.mean_levels.u.sur) + "x", "rural vs urban reliance on surface water", { bigSize: 28, bigColor: RED });
  statCard(s, 6.6, 2.7, 2.9, 1.05, f1(p1.mean_levels.r.unimp / p1.mean_levels.u.unimp) + "x", "rural vs urban reliance on unimproved sources", { bigSize: 28, bigColor: ORANGE });
  statCard(s, 6.6, 3.9, 2.9, 1.05, f1(p1.mean_levels.u.bas) + "%", `urban basic access vs ${f1(p1.mean_levels.r.bas)}% rural`, { bigSize: 28, bigColor: TEAL });

  // 10. population size / area share
  s = contentSlide("Part 1  |  Access by population size", "Access tracks how rural a country is, not how many people live there", "Bars show average service-level shares for countries grouped into 10-point bins of urban (left) or rural (right) population share. Correlation between population size and basic access is essentially zero; between urban share and basic access it is 0.55.", "Part 1: 2020 snapshot");
  await img(s, "05_urban_access_by_urban_share.png", 0.45, 1.5, 4.5, 2.95, "Urban access by urban population share");
  await img(s, "06_rural_access_by_rural_share.png", 5.05, 1.5, 4.5, 2.95, "Rural access by rural population share");
  s.addText([
    { text: `Population size vs basic access: r = ${f2(p1.corr_pop_basic)}.  Urban share vs basic access: r = ${f2(p1.corr_urban_basic)}.`, options: { bold: true, breakLine: true } },
    { text: "Rural basic access is weakest (about 65-70%) in countries where 50-89% of people live in rural areas.", options: {} },
  ], { x: 0.5, y: 4.5, w: 9, h: 0.7, fontFace: BODY, fontSize: 13, color: NAVY, valign: "top", margin: 0, isTextBox: true });

  // 11. income group
  s = contentSlide("Part 1  |  Access by income group", "Income is the sharpest divider: low-income countries lag by 37 points", "Pivot table grouped by income_group with the average of each national service level. Sixteen countries have no income classification and are left out of this chart.", "Part 1: 2020 snapshot");
  const incOrder = ["Low income", "Lower middle income", "Upper middle income", "High income"];
  const incLab = ["Low", "Lower middle", "Upper middle", "High"];
  const lvs = [["Basic", "avg_basic_pct"], ["Limited", "avg_limited_pct"], ["Unimproved", "avg_unimproved_pct"], ["Surface", "avg_surface_pct"]];
  s.addChart(pres.charts.BAR, lvs.map(([n, k]) => ({ name: n, labels: incLab, values: incOrder.map((g) => p1.income[g][k]) })),
    { ...chartBase, x: 0.5, y: 1.5, w: 5.9, h: 3.6, barDir: "bar", barGrouping: "stacked", chartColors: [TEAL, AMBER, ORANGE, RED], catAxisOrientation: "maxMin", showLegend: true, legendPos: "b", showValue: true, dataLabelPosition: "ctr", dataLabelColor: WHITE, dataLabelFontBold: true, dataLabelFormatCode: "[>=4]0;;", valAxisMinVal: 0, valAxisMaxVal: 100, valAxisLabelFormatCode: "0", showTitle: true, title: "Mean share of population by service level, % (2020)" });
  statCard(s, 6.7, 1.5, 2.8, 1.05, f1(p1.income["Low income"].avg_basic_pct) + "%", `basic access, low income (high income: ${f1(p1.income["High income"].avg_basic_pct)}%)`, { bigSize: 26, bigColor: RED });
  statCard(s, 6.7, 2.7, 2.8, 1.05, f1(p1.income["Low income"].avg_surface_pct) + "%", `rely on surface water (high income: ${f1(p1.income["High income"].avg_surface_pct)}%)`, { bigSize: 26, bigColor: ORANGE });
  statCard(s, 6.7, 3.9, 2.8, 1.05, f0(p1.income["Low income"].avg_urban_share_pct) + "% vs " + f0(p1.income["High income"].avg_urban_share_pct) + "%", "average urban share, low vs high income", { bigSize: 22, bigColor: TEAL });

  // 12. scatter
  s = contentSlide("Part 1  |  Access by income group", "Urbanisation and income together separate the countries", "Each point is a country. Almost every high-income country sits at the top right; the low-income countries cluster lower left with basic access between roughly 40% and 90%.", "Part 1: 2020 snapshot");
  await img(s, "08_urban_share_vs_basic_access_by_income.png", 0.5, 1.5, 6.0, 3.6, "Scatter of basic access against urban share, coloured by income group");
  s.addText([
    { text: `r = ${f2(p1.corr_urban_basic)}`, options: { fontFace: HEAD, fontSize: 30, bold: true, color: TEAL, breakLine: true, paraSpaceAfter: 6 } },
    { text: "Moderate positive link between urban share and basic access.", options: { fontSize: 14, color: NAVY, breakLine: true, paraSpaceAfter: 10 } },
    { text: `${p1.countries_basic_below_90} countries are below 90% basic access and ${p1.countries_basic_below_50} below 50%.`, options: { fontSize: 14, color: NAVY } },
  ], { x: 6.8, y: 1.5, w: 2.7, h: 3.6, fontFace: BODY, valign: "top", margin: 0, isTextBox: true });

  // ============ PART 2 ============
  section("Part 2: change over time");
  // 13. year representation
  s = contentSlide("Part 2  |  Year representation", "The '2000-2020' file is really two snapshots: 2015 and 2020", "Sorting by name then year showed that each country has exactly two rows. y_diff = year(n+1) - year(n) only when the country names match. y_diff = 0 would flag duplicates (none remain after cleaning). The year histogram has two peaks, so the distribution is neither normal nor skewed.", "Part 2: change over time");
  const yrs = Object.keys(p2.year_counts);
  s.addChart(pres.charts.BAR, [{ name: "Observations", labels: yrs, values: yrs.map((y) => p2.year_counts[y]) }],
    { ...chartBase, x: 0.5, y: 1.5, w: 5.6, h: 3.6, barDir: "col", chartColors: [TEAL], showLegend: false, showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "0", valAxisMinVal: 0, valAxisMaxVal: 260, valAxisLabelFormatCode: "0", showTitle: true, title: "Country-year observations by year" });
  statCard(s, 6.4, 1.5, 3.1, 1.05, f1(p2.y_diff_avg), "average years between a country's two observations (range 1 to 5)", { bigSize: 28, bigColor: NAVY });
  statCard(s, 6.4, 2.7, 3.1, 1.05, "213 of 231", "countries have the full 2015 to 2020 span", { bigSize: 24, bigColor: TEAL });
  s.addText("So change is measured per year, which keeps the 18 shorter spans comparable.", { x: 6.4, y: 3.95, w: 3.1, h: 1.0, fontFace: BODY, fontSize: 13, color: NAVY, valign: "top", margin: 0, isTextBox: true });

  // 14. ARC method
  s = contentSlide("Part 2  |  Annual Rate of Change", "ARC turns two snapshots into a yearly rate of progress", "ARC_x = (access in later year - access in earlier year) / (later year - earlier year), computed only when the next row is the same country. IFERROR returns null where either year has no estimate. Rural ARC is missing for 64 countries and urban ARC for 50.", "Part 2: change over time");
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.5, y: 1.5, w: 4.7, h: 1.45, fill: { color: NAVY }, line: { color: NAVY, width: 0 }, rectRadius: 0.08, objectName: "Formula card" });
  s.addText([
    { text: "ARC_n =", options: { fontFace: "Courier New", fontSize: 13, color: AMBER, breakLine: true } },
    { text: "IFERROR( IF( $A3=$A2,", options: { fontFace: "Courier New", fontSize: 12, color: WHITE, breakLine: true } },
    { text: "(E3-E2) / ($B3-$B2), ), \"null\" )", options: { fontFace: "Courier New", fontSize: 12, color: WHITE } },
  ], { x: 0.7, y: 1.55, w: 4.4, h: 1.35, valign: "middle", margin: 0, isTextBox: true });
  s.addText(bullets(["Same-country test stops ARC crossing from one country to the next", "Mixed references ($A, relative row) copy one formula across n, r, u", "IFERROR labels missing estimates as null instead of #VALUE!", "Full access = rounded basic access of 100 in both years"], { gap: 5 }), { x: 0.5, y: 3.1, w: 4.7, h: 2.0, fontFace: BODY, fontSize: 13, color: NAVY, valign: "top", margin: 0, isTextBox: true });
  const arcRows = [["ARC (pp/yr)", "Avg", "Min", "Max"], ["National", f2(p2.arc.n.avg), f2(p2.arc.n.min), f2(p2.arc.n.max)], ["Rural", f2(p2.arc.r.avg), f2(p2.arc.r.min), f2(p2.arc.r.max)], ["Urban", f2(p2.arc.u.avg), f2(p2.arc.u.min), f2(p2.arc.u.max)]];
  s.addTable(arcRows.map((row, ri) => row.map((c, ci) => ({ text: c, options: { bold: ri === 0 || ci === 0, color: ri === 0 ? WHITE : NAVY, fill: { color: ri === 0 ? NAVY : (ri % 2 ? LIGHT : WHITE) }, align: ci === 0 ? "left" : "center", fontSize: 13, fontFace: BODY } }))),
    { x: 5.5, y: 1.5, w: 4.0, colW: [1.3, 0.9, 0.9, 0.9], rowH: 0.42, border: { type: "solid", color: RULE, pt: 0.5 }, margin: [0.04, 0.08, 0.04, 0.08] });
  statCard(s, 5.5, 3.4, 4.0, 1.6, f2(p2.arc.r.avg) + " vs " + f2(p2.arc.u.avg), "rural vs urban average ARC: rural access gained faster, from a lower start", { bigSize: 28, bigColor: ORANGE, labSize: 13 });

  // 15. status counts (native stacked bar)
  s = contentSlide("Part 2  |  Direction of change", `Access improved in ${p2.counts.National.ARC_above_0_not_full} of 231 countries, but rural gaps in the data limit the story`, "Each country falls into exactly one bucket: missing ARC, full access in both years, ARC = 0, ARC < 0 or ARC > 0 (the last three excluding full-access countries). The counts add to 231 for national, rural and urban. Rural ARC is missing for 64 countries.", "Part 2: change over time");
  const buckets = [["Full access", "full_access", NAVY], ["Improving", "ARC_above_0_not_full", TEAL], ["No change", "ARC_equal_0_not_full", AMBER], ["Declining", "ARC_below_0_not_full", RED], ["No ARC (missing)", "missing_ARC", GREYBLUE]];
  s.addChart(pres.charts.BAR, buckets.map(([n, k]) => ({ name: n, labels: ["National", "Rural", "Urban"], values: ["National", "Rural", "Urban"].map((a) => p2.counts[a][k]) })),
    { ...chartBase, x: 0.5, y: 1.5, w: 6.0, h: 3.6, barDir: "bar", barGrouping: "stacked", chartColors: buckets.map((b) => b[2]), catAxisOrientation: "maxMin", showLegend: true, legendPos: "b", showValue: true, dataLabelPosition: "ctr", dataLabelColor: WHITE, dataLabelFontBold: true, dataLabelFormatCode: "[>=12]0;;", valAxisMinVal: 0, valAxisMaxVal: 231, valAxisLabelFormatCode: "0", showTitle: true, title: "Countries by direction of change in basic access" });
  statCard(s, 6.8, 1.5, 2.7, 1.05, "135 / 16 / 16", "countries improving, stalled, declining nationally (not full access)", { bigSize: 22, bigColor: TEAL, labSize: 11 });
  statCard(s, 6.8, 2.7, 2.7, 1.05, "64 and 50", "countries with no rural or urban ARC because an estimate is missing", { bigSize: 24, bigColor: ORANGE, labSize: 11 });
  s.addText(`Rural average ARC (${f2(p2.arc.r.avg)}) beats urban (${f2(p2.arc.u.avg)}) partly because urban areas start closer to 100%.`, { x: 6.8, y: 3.9, w: 2.7, h: 1.2, fontFace: BODY, fontSize: 12, italic: true, color: MUTED, valign: "top", margin: 0, isTextBox: true });

  // 16. ARC diff
  s = contentSlide("Part 2  |  Rural vs urban", "Rural access grew faster than urban in two out of three countries", "ARC_diff = ARC_r - ARC_u in percentage points per year, available for 165 countries with both values. A positive value means rural access improved faster.", "Part 2: change over time");
  await img(s, "12_arc_rural_vs_urban_difference.png", 0.5, 1.5, 5.8, 3.6, "Histogram of the rural minus urban ARC difference");
  const ex1 = p2.extremes;
  const sSud = ex1.find((e) => e.name === "South Sudan"), mor = ex1.find((e) => e.name === "Morocco");
  statCard(s, 6.6, 1.5, 2.9, 1.2, f0(p2.diff.share_positive * 100) + "%", `of ${p2.diff.n} countries: rural ARC above urban (median gap ${f2(p2.diff.median)} pp/yr)`, { bigSize: 28, bigColor: TEAL, labSize: 12 });
  s.addText([
    { text: "Largest gaps", options: { bold: true, fontSize: 14, color: NAVY, breakLine: true, paraSpaceAfter: 4 } },
    { text: `Morocco: rural ${sign(mor.ARC_r)} vs urban ${sign(mor.ARC_u)}`, options: { fontSize: 13, color: NAVY, breakLine: true, paraSpaceAfter: 4 } },
    { text: `South Sudan: rural ${sign(sSud.ARC_r)} vs urban ${sign(sSud.ARC_u)}`, options: { fontSize: 13, color: NAVY, breakLine: true, paraSpaceAfter: 4 } },
    { text: "(pp per year)", options: { fontSize: 11, color: MUTED } },
  ], { x: 6.6, y: 2.9, w: 2.9, h: 2.2, fontFace: BODY, valign: "top", margin: 0, isTextBox: true });

  // 17. region ARC (native)
  s = contentSlide("Part 2  |  Access by region", "Sub-Saharan Africa is improving fastest, from the lowest base", "Region comes from the supplied country-to-region mapping (LOOKUP on country name). Averages are unweighted across countries. Some labels look unconventional (Tunisia is Sub-Saharan Africa; Philippines, Malaysia and Iran are South Asia), so the small regions (South Asia n=11, MENA n=10) are sensitive to the mapping.", "Part 2: change over time");
  const regs = p2.regions.slice().sort((a, b) => a.avg_ARC_national - b.avg_ARC_national);
  const shortReg = (r) => ({ "Middle East & North Africa": "MENA", "Latin America & Caribbean": "Latin America", "Europe & Central Asia": "Europe, C. Asia", "East Asia & Pacific": "East Asia, Pacific", "Sub-Saharan Africa": "Sub-Saharan Africa" }[r] || r);
  const rl = regs.map((r) => shortReg(r.region));
  s.addChart(pres.charts.BAR, [["National", "avg_ARC_national"], ["Rural", "avg_ARC_rural"], ["Urban", "avg_ARC_urban"]].map(([n, k]) => ({ name: n, labels: rl, values: regs.map((r) => r[k]) })),
    { ...chartBase, x: 0.5, y: 1.45, w: 6.0, h: 3.75, barDir: "bar", barGrouping: "clustered", chartColors: [NAVY, ORANGE, TEAL], showLegend: true, legendPos: "b", showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "0.00", dataLabelFontSize: 9, valAxisMinVal: 0, valAxisMaxVal: 0.9, valAxisLabelFormatCode: "0.0", showTitle: true, title: "Average ARC by region, pp per year" });
  const ssa = regs.find((r) => r.region === "Sub-Saharan Africa");
  statCard(s, 6.8, 1.5, 2.7, 1.05, f2(ssa.avg_ARC_national), "pp a year: highest national ARC, in Sub-Saharan Africa", { bigSize: 28, bigColor: RED, labSize: 11 });
  statCard(s, 6.8, 2.7, 2.7, 1.05, "37 of 44", "countries below 80% basic access are in Sub-Saharan Africa", { bigSize: 24, bigColor: NAVY, labSize: 11 });
  s.addText("Europe and North America move slowly because most countries are already near 100%.", { x: 6.8, y: 3.95, w: 2.7, h: 1.1, fontFace: BODY, fontSize: 12, italic: true, color: MUTED, valign: "top", margin: 0, isTextBox: true });

  // 18. bubble
  s = contentSlide("Part 2  |  Access by region", "Sub-Saharan Africa has the widest range of national ARC", "Each bubble is a country; size is population; colour is region. Points above the dashed line saw faster rural than national progress. Sub-Saharan Africa's national ARC runs from -1.02 (Central African Republic) to 2.44.", "Part 2: change over time");
  await img(s, "14_region_national_vs_rural_arc_bubble.png", 0.5, 1.5, 6.3, 3.65, "Bubble chart of national ARC against rural ARC by region");
  s.addText([
    { text: "Reading the chart", options: { bold: true, fontSize: 14, color: NAVY, breakLine: true, paraSpaceAfter: 6 } },
    ...bullets(["109 of 167 countries sit above the line: rural ARC beat the national ARC", "Sub-Saharan Africa spans -1.0 to +2.4 pp a year nationally", "11 of the 13 countries with over 100 million people sit between 0 and 1 pp a year"], { gap: 5 }).map((b) => ({ ...b, options: { ...b.options, fontSize: 13, color: NAVY } })),
  ], { x: 7.0, y: 1.5, w: 2.5, h: 3.6, fontFace: BODY, valign: "top", margin: 0, isTextBox: true });

  // 19. extension
  s = contentSlide("Extension  |  Illustrative projection", "At the 2015-2020 pace, Sub-Saharan Africa needs roughly 50 more years", "This is an extension, not a forecast. It extrapolates each region's average national ARC linearly from its average end-year basic-access level. Averages are unweighted across countries; population-weighted ARC for Sub-Saharan Africa is higher (about 1.0 pp a year), so the gap in years would be smaller.", "Part 2: change over time");
  await img(s, "15_illustrative_time_to_full_access.png", 0.5, 1.5, 5.9, 3.6, "Illustrative years to reach full basic water access by region");
  s.addText([
    { text: "How to read it", options: { bold: true, fontSize: 14, color: NAVY, breakLine: true, paraSpaceAfter: 6 } },
    { text: "Years to 100% = (100 minus average basic access) divided by average national ARC.", options: { fontSize: 13, color: NAVY, breakLine: true, paraSpaceAfter: 10 } },
    { text: "Caveat", options: { bold: true, fontSize: 14, color: RED, breakLine: true, paraSpaceAfter: 4 } },
    { text: "Linear and unweighted. A signal about relative urgency, not a prediction.", options: { fontSize: 13, color: NAVY } },
  ], { x: 6.7, y: 1.5, w: 2.8, h: 3.6, fontFace: BODY, valign: "top", margin: 0, isTextBox: true });

  // ============ WRAP-UP ============
  section("Wrap-up");
  // 20. takeaways (dark)
  s = pres.addSlide({ masterName: "DARK", sectionTitle: "Wrap-up" });
  s.addText("What the data says, and what I would do next", { placeholder: "title" });
  const tk = [["1", "Rural and low-income populations carry the gap", "A 13-point rural deficit and a 37-point income deficit in basic access."], ["2", "Progress is real but uneven", "135 countries improved; 32 stalled or declined; Sub-Saharan Africa gains fastest but starts lowest."], ["3", "Targeting beats averaging", "Aim investment at rural areas of low-income, low-urbanisation, mostly Sub-Saharan countries."], ["4", "Next: weight, extend, deepen", "Population-weight the averages, add the safely managed level, and use more than two years."]];
  tk.forEach((t, i) => {
    const x = 0.5 + (i % 2) * 4.6, y = 1.6 + Math.floor(i / 2) * 1.8;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: 4.4, h: 1.65, fill: { color: DEEP }, line: { color: DEEP, width: 0 }, rectRadius: 0.08, objectName: "Takeaway card" });
    s.addShape(pres.shapes.OVAL, { x: x + 0.2, y: y + 0.2, w: 0.45, h: 0.45, fill: { color: TEAL }, line: { color: TEAL, width: 0 }, objectName: "Number marker" });
    s.addText(t[0], { x: x + 0.2, y: y + 0.2, w: 0.45, h: 0.45, align: "center", valign: "middle", fontFace: HEAD, fontSize: 15, bold: true, color: WHITE, margin: 0, isTextBox: true });
    s.addText([{ text: t[1], options: { bold: true, fontSize: 16, color: WHITE, breakLine: true, paraSpaceAfter: 4 } }, { text: t[2], options: { fontSize: 13, color: "D9E6EE" } }], { x: x + 0.8, y: y + 0.12, w: 3.45, h: 1.45, fontFace: BODY, valign: "top", margin: 0, isTextBox: true });
  });
  s.addNotes("The 32 'stalled or declined' figure is 16 countries with no change plus 16 with declining national access, excluding countries already at full access.");

  // 21. data quality
  s = contentSlide("Rigour", "Data-quality notes and limitations", "Everything here was found while reproducing the spreadsheet analysis in Python. The mean-row difference is the most material: the workbook mean divides by 213 countries, treating missing rural or urban values as zero.", "Wrap-up");
  const dq = [
    ["Labelled 2000-2020, actually 2015 and 2020", "Treat results as a five-year change, not a 20-year trend."],
    ["Missing rural and urban values", "64 rural and 50 urban ARCs are missing (231 countries); averages use countries with data."],
    ["Report-sheet means were understated", `The sheet divides sums by 213, so rural mean basic showed ${f1(p1.sheet_mean_basic.r)}% vs ${f1(p1.mean_basic.r)}% excluding missing. This deck uses the corrected means.`],
    ["Unweighted country averages", "A small island counts as much as India; population-weighted ARC for Sub-Saharan Africa is about 1.0, not 0.56."],
    ["Source quirks kept as supplied", "Region labels are used as given and some look unconventional (Tunisia in Sub-Saharan Africa; Philippines, Malaysia, Iran in South Asia), so small-region comparisons are sensitive. A pivot 'Grand Total' row inside the 2020 sheet was excluded."],
  ];
  dq.forEach((d, i) => {
    const y = 1.5 + i * 0.7;
    s.addShape(pres.shapes.OVAL, { x: 0.5, y: y + 0.1, w: 0.32, h: 0.32, fill: { color: i === 2 ? ORANGE : TEAL }, line: { color: WHITE, width: 0 }, objectName: "Marker" });
    s.addText([{ text: d[0] + ".  ", options: { bold: true, color: NAVY } }, { text: d[1], options: { color: MUTED } }], { x: 1.0, y, w: 8.5, h: 0.62, fontFace: BODY, fontSize: 13, valign: "middle", margin: 0, isTextBox: true });
  });

  // 22. appendix features
  s = contentSlide("Appendix", "The 19 features I engineered", "Part 1 adds 7 features (16 to 23 columns). Part 2 adds 12 (16 to 28 columns).", "Wrap-up");
  const feats = [
    ["Part 1", "value_cnt", "COUNTA of each row; should equal 16"],
    ["Part 1", "pop_u_val, pop_r", "Urban head count (pop_n x pop_u / 100); rural share (100 - pop_u)"],
    ["Part 1", "pop_n (m), wat_bas_n (rounded)", "Population rounded up to millions; basic access capped at 100%"],
    ["Part 1", "pop_u (rounded), pop_r (rounded)", "Shares rounded to whole numbers for charting"],
    ["Part 2", "y_diff", "Years between a country's two observations"],
    ["Part 2", "ARC_n, ARC_r, ARC_u", "Annual rate of change in basic access (pp per year)"],
    ["Part 2", "wat_bas_x (rounded) x3, ARC_x_full x3", "Rounded basic access and full-access flags"],
    ["Part 2", "ARC_diff, region", "Rural minus urban ARC; region by lookup on country name"],
  ];
  const hdr = ["Part", "Feature", "What it does"].map((t) => ({ text: t, options: { bold: true, color: WHITE, fill: { color: NAVY }, fontSize: 12, fontFace: BODY } }));
  s.addTable([hdr, ...feats.map((r, i) => r.map((c, ci) => ({ text: c, options: { fontSize: 11, fontFace: ci === 1 ? "Courier New" : BODY, color: NAVY, fill: { color: i % 2 ? WHITE : LIGHT }, bold: ci === 0 } })))],
    { x: 0.5, y: 1.5, w: 9, colW: [0.8, 3.6, 4.6], rowH: 0.4, border: { type: "solid", color: RULE, pt: 0.5 }, margin: [0.03, 0.08, 0.03, 0.08] });

  await pres.writeFile({ fileName: OUT });
  try {
    const { applyTheme } = require("/mnt/skills/public/pptx/scripts/apply_theme.js");
    await applyTheme(OUT, THEME);
  } catch (e) { /* optional: theme colours/fonts are applied only when the helper is available */ }
  console.log("wrote", OUT);

  function sign(v) { return (v >= 0 ? "+" : "") + Number(v).toFixed(2); }
})();
