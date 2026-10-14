"""
Access to drinking water - reproducible analysis pipeline.

Reads the two analysis workbooks in data/workbooks/, re-derives every metric
that was built in the spreadsheets, checks the results against the values
stored in the workbooks, then writes:

  data/part1_2020_snapshot/*.csv        cleaned 2020 data + summary tables
  data/part2_arc_2015_2020/*.csv        cleaned panel + ARC tables
  data/summary_metrics.json             headline numbers used by the slide deck
  data/validation_checks.csv            recomputed value vs workbook value
  plots/reproduced/*.png                clean re-drawn versions of the charts

Run from the repository root:   python scripts/run_analysis.py
"""
import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from matplotlib.lines import Line2D

ROOT = Path(__file__).resolve().parent.parent
WB1 = ROOT / "data/workbooks/part1_estimates_on_the_use_of_water_2020.xlsx"
WB2 = ROOT / "data/workbooks/part2_integrated_project_arc_analysis.xlsx"
D1 = ROOT / "data/part1_2020_snapshot"
D2 = ROOT / "data/part2_arc_2015_2020"
PLOTS = ROOT / "plots/reproduced"
for p in (D1, D2, PLOTS):
    p.mkdir(parents=True, exist_ok=True)

# ---------- palette (service levels run good -> bad) ----------
NAVY, TEAL, GREY = "#0B2545", "#1B7F9E", "#6B7C8F"
LEVEL_COL = {"Basic": "#1B7F9E", "Limited": "#F2B134", "Unimproved": "#E07A3F", "Surface": "#B83227"}
AREA_COL = {"National": "#0B2545", "Rural": "#E07A3F", "Urban": "#1B7F9E"}
INCOME_COL = {"Low income": "#B83227", "Lower middle income": "#E07A3F",
              "Upper middle income": "#5FB0C9", "High income": "#0B2545", "Unclassified": "#9AA7B4"}
REGION_COL = {"Sub-Saharan Africa": "#B83227", "South Asia": "#E07A3F", "Middle East & North Africa": "#F2B134",
              "East Asia & Pacific": "#5FB0C9", "Latin America & Caribbean": "#1B7F9E",
              "Europe & Central Asia": "#0B2545", "North America": "#9AA7B4"}

plt.rcParams.update({
    "font.family": "DejaVu Sans", "font.size": 10, "axes.edgecolor": "#C8D1DA",
    "axes.spines.top": False, "axes.spines.right": False, "axes.grid": True,
    "grid.color": "#E6EBF0", "grid.linewidth": 0.8, "axes.axisbelow": True,
    "axes.titleweight": "bold", "axes.titlesize": 13, "axes.titlelocation": "left",
    "figure.dpi": 100, "savefig.dpi": 200, "savefig.bbox": "tight",
})

checks = []  # (check, recomputed, workbook, ok)


def check(name, mine, theirs, tol=1e-6):
    ok = bool(abs(float(mine) - float(theirs)) <= tol * max(1.0, abs(float(theirs))))
    checks.append({"check": name, "recomputed": float(mine), "workbook_value": float(theirs), "match": ok})
    return ok


def save(fig, name):
    fig.savefig(PLOTS / name)
    plt.close(fig)


# =====================================================================
# PART 1 - 2020 SNAPSHOT
# =====================================================================
raw1 = pd.read_excel(WB1, sheet_name="Estimates on the use of water (", na_values=["NAN", "null"])
d1 = raw1.iloc[:, :23].dropna(subset=["Name"])
d1 = d1[d1["Name"] != "Grand Total"].copy()  # the sheet carries a pivot "Grand Total" row
d1.columns = ["name", "income_group", "pop_n", "pop_u", "wat_bas_n", "wat_lim_n", "wat_unimp_n", "wat_sur_n",
              "wat_bas_r", "wat_lim_r", "wat_unimp_r", "wat_sur_r", "wat_bas_u", "wat_lim_u", "wat_unimp_u",
              "wat_sur_u", "value_cnt", "pop_u_val", "pop_r", "pop_n_m", "wat_bas_n_rounded",
              "pop_u_rounded", "pop_r_rounded"]
d1["income_group"] = d1["income_group"].fillna("Unclassified")
INC_CODE = {"Unclassified": 0, "Low income": 1, "Lower middle income": 2, "Upper middle income": 3, "High income": 4}
d1["income_code"] = d1["income_group"].map(INC_CODE)
d1 = d1.sort_values("pop_n").reset_index(drop=True)

# integrity checks on the engineered features
assert len(d1) == 213 and (d1["value_cnt"] == 16).all()
assert np.allclose(d1["pop_u_val"], d1["pop_n"] * d1["pop_u"] / 100, rtol=1e-6)
assert np.allclose(d1["pop_r"], 100 - d1["pop_u"], atol=1e-6)
n_over_100 = int((d1["wat_bas_n"] > 100).sum())
assert d1["wat_bas_n_rounded"].max() <= 100

d1.to_csv(D1 / "clean_dataset_2020.csv", index=False)

# ---- population representativeness (Global 2020 report) ----
WORLD_POP, WORLD_URBAN_SHARE = 7.821e9, 0.55
ds_pop = d1["pop_n"].sum() * 1000
ds_urban_tot = d1["pop_u_val"].sum() * 1000
ds_urban_pct = ds_urban_tot / ds_pop * 100
ds_urban_from_world_pct = ds_pop * WORLD_URBAN_SHARE
world_urban = WORLD_POP * WORLD_URBAN_SHARE


def pdiff(a, b):
    return abs(a - b) / ((a + b) / 2) * 100


pop_summary = pd.DataFrame([
    ["Total population (dataset)", ds_pop, "people"],
    ["Total population (estimated world)", WORLD_POP, "people"],
    ["Urban population (dataset, sum of pop_u_val)", ds_urban_tot, "people"],
    ["Urban population (dataset total x 55% world urban share)", ds_urban_from_world_pct, "people"],
    ["Urban population (estimated world, 55%)", world_urban, "people"],
    ["Urban share (dataset)", ds_urban_pct, "%"],
    ["Urban share (estimated world)", WORLD_URBAN_SHARE * 100, "%"],
    ["% difference: dataset vs world population", pdiff(ds_pop, WORLD_POP), "%"],
    ["% difference: dataset urban total vs dataset urban from 55%", pdiff(ds_urban_tot, ds_urban_from_world_pct), "%"],
    ["% difference: dataset urban total vs world urban", pdiff(ds_urban_tot, world_urban), "%"],
], columns=["metric", "value", "unit"])
pop_summary.to_csv(D1 / "population_vs_world_summary.csv", index=False)
check("pop % difference dataset vs world", pdiff(ds_pop, WORLD_POP), 0.4395894687)
check("urban totals vs urban from percentage", pdiff(ds_urban_tot, ds_urban_from_world_pct), 2.139668568)
check("urban totals vs world urban", pdiff(ds_urban_tot, world_urban), 1.700119077)
check("dataset urban share %", ds_urban_pct, 56.18954386)

# ---- measures of central tendency & spread: 12 service-level features ----
LEVELS = [("bas", "Basic"), ("lim", "Limited"), ("unimp", "Unimproved"), ("sur", "Surface")]
AREAS = [("n", "National"), ("r", "Rural"), ("u", "Urban")]
feat = [f"wat_{lv}_{a}" for a, _ in AREAS for lv, _ in LEVELS]
wb_ws = pd.read_excel(WB1, sheet_name="Global 2020 report", header=None)
sheet_mean = wb_ws.iloc[15, 1:13].astype(float).values  # row 16: means stored in the workbook
rows = []
for f, sm in zip(feat, sheet_mean):
    s = d1[f].dropna()
    rows.append({
        "feature": f, "area": dict(AREAS)[f.split("_")[-1]], "service_level": dict(LEVELS)[f.split("_")[1]],
        "countries_reporting": len(s), "max": s.max(), "min": s.min(), "mean": s.mean(), "median": s.median(),
        "mode": s.mode().iloc[0], "q1": s.quantile(.25), "q3": s.quantile(.75),
        "iqr": s.quantile(.75) - s.quantile(.25), "std_dev": s.std(),
        "mean_as_stored_in_workbook": sm,
    })
    check(f"median {f}", s.median(), wb_ws.iloc[16, 1 + feat.index(f)])
    check(f"Q1 {f}", s.quantile(.25), wb_ws.iloc[18, 1 + feat.index(f)])
    check(f"Q3 {f}", s.quantile(.75), wb_ws.iloc[19, 1 + feat.index(f)])
    # the workbook mean divides by all 213 countries, i.e. counts missing values as 0
    check(f"workbook mean {f} == sum/213 (missing counted as 0)", s.sum() / 213, sm)
area_stats = pd.DataFrame(rows)
area_stats.to_csv(D1 / "access_by_area_summary_stats.csv", index=False)

# ---- income group pivot ----
g = d1.groupby(["income_code", "income_group"])
income = g.agg(countries=("name", "count"), total_population_thousands=("pop_n", "sum"),
               avg_urban_share_pct=("pop_u", "mean"), avg_basic_pct=("wat_bas_n", "mean"),
               avg_limited_pct=("wat_lim_n", "mean"), avg_unimproved_pct=("wat_unimp_n", "mean"),
               avg_surface_pct=("wat_sur_n", "mean")).reset_index()
income.to_csv(D1 / "income_group_summary.csv", index=False)
wb_inc = pd.read_excel(WB1, sheet_name="Sheet3", header=None).iloc[1:6, :]
for _, r in wb_inc.iterrows():
    code = int(r[3])
    check(f"income pivot population, group {code}", income.loc[income.income_code == code, "total_population_thousands"].iloc[0], r[0])

# ---- supplementary: correlations ----
corr = d1[["pop_n", "pop_u", "income_code", "wat_bas_n", "wat_bas_r", "wat_bas_u"]].corr().round(3)
corr.to_csv(D1 / "correlation_matrix.csv")

# ---- national basic access binned by shares (for the stacked-column charts) ----
def binned(df, share_col, level_prefix, area):
    b = (df[share_col] // 10 * 10).clip(upper=90)
    t = df.assign(bin=b).groupby("bin")[[f"wat_{lv}_{area}" for lv, _ in LEVELS]].mean()
    t["countries"] = df.assign(bin=b).dropna(subset=[f"wat_bas_{area}"]).groupby("bin").size()
    t["countries"] = t["countries"].fillna(0)
    return t[t["countries"] > 0]


# =====================================================================
# PART 2 - 2015-2020 ARC
# =====================================================================
raw2 = pd.read_excel(WB2, sheet_name="Estimates of the use of water (", na_values=["null"])
raw2 = raw2.rename(columns={"wat_bas_n(rounded)": "wat_bas_n_rounded", "wat_bas_r(rounded)": "wat_bas_r_rounded",
                            "wat_bas_u(rounded)": "wat_bas_u_rounded", "Region": "region"})
for c in ("ARC_n_full", "ARC_r_full", "ARC_u_full"):
    raw2[c] = raw2[c].replace({"fullaccesss": "full access"})  # typo in the sheet
raw2 = raw2.sort_values(["name", "year"]).reset_index(drop=True)
raw2.to_csv(D2 / "clean_dataset_2015_2020.csv", index=False)

# one row per country: start / end values and the ARC columns
first = raw2.groupby("name").head(1).set_index("name")
last = raw2.groupby("name").tail(1).set_index("name")
assert len(first) == 231 and (raw2.groupby("name").size() == 2).all()
c2 = pd.DataFrame({
    "region": first["region"], "start_year": first["year"], "end_year": last["year"],
    "y_diff": last["year"] - first["year"], "pop_n_end_year": last["pop_n"],
})
for a in "nru":
    c2[f"basic_{a}_start"] = first[f"wat_bas_{a}"]
    c2[f"basic_{a}_end"] = last[f"wat_bas_{a}"]
    c2[f"ARC_{a}"] = (c2[f"basic_{a}_end"] - c2[f"basic_{a}_start"]) / c2["y_diff"]
    both_full = (first[f"wat_bas_{a}"].round() == 100) & (last[f"wat_bas_{a}"].round() == 100)
    c2[f"full_access_{a}"] = both_full
    # compare with the ARC stored in the workbook (first row of each pair)
    wb_arc = first[f"ARC_{a}"]
    both = c2[f"ARC_{a}"].notna() & wb_arc.notna()
    assert np.allclose(c2.loc[both, f"ARC_{a}"], wb_arc[both], atol=1e-9)
    assert (c2[f"ARC_{a}"].isna() == wb_arc.isna()).all()
    assert (both_full == first[f"ARC_{a}_full"].notna()).all()
c2["ARC_diff_rural_minus_urban"] = c2["ARC_r"] - c2["ARC_u"]
assert np.allclose(c2["ARC_diff_rural_minus_urban"].dropna(), first["ARC_diff"].dropna(), atol=1e-9)
c2 = c2.reset_index()
c2.to_csv(D2 / "country_arc_table.csv", index=False)

# ---- summary: y_diff & ARC ----
rows = []
for name, col in [("y_diff (years between observations)", "y_diff"), ("ARC_n national", "ARC_n"),
                  ("ARC_r rural", "ARC_r"), ("ARC_u urban", "ARC_u")]:
    s = c2[col].dropna()
    rows.append({"measure": name, "countries_with_value": len(s), "average": s.mean(), "median": s.median(),
                 "minimum": s.min(), "maximum": s.max()})
arc_summary = pd.DataFrame(rows)
arc_summary.to_csv(D2 / "arc_summary.csv", index=False)
wb_sum = pd.read_excel(WB2, sheet_name="Summary sheet", header=None)
for i, col in enumerate(["y_diff", "ARC_n", "ARC_r", "ARC_u"], start=1):
    s = c2[col].dropna()
    # the workbook stores y_diff's average rounded to 2 decimals (4.8), as the project brief asked
    check(f"{col} average", s.mean(), wb_sum.iloc[i, 1], tol=0.01 if col == "y_diff" else 1e-6)
    check(f"{col} minimum", s.min(), wb_sum.iloc[i, 2])
    check(f"{col} maximum", s.max(), wb_sum.iloc[i, 3])

# ---- counts: missing / full access / ARC = 0 / < 0 / > 0 ----
rows = []
for a, label in AREAS:
    arc, full = c2[f"ARC_{a}"], c2[f"full_access_{a}"]
    r = {"area": label, "missing_ARC": int(arc.isna().sum()), "full_access": int(full.sum()),
         "ARC_equal_0_not_full": int(((arc == 0) & ~full).sum()),
         "ARC_below_0_not_full": int(((arc < 0) & ~full).sum()),
         "ARC_above_0_not_full": int(((arc > 0) & ~full).sum())}
    r["total_countries"] = r["missing_ARC"] + r["full_access"] + r["ARC_equal_0_not_full"] + r["ARC_below_0_not_full"] + r["ARC_above_0_not_full"]
    assert r["total_countries"] == 231, r
    rows.append(r)
arc_counts = pd.DataFrame(rows)
arc_counts.to_csv(D2 / "arc_status_counts.csv", index=False)
wb_counts = {"National": [2, 62, 16, 16, 135], "Rural": [64, 29, 5, 17, 116], "Urban": [50, 55, 7, 26, 93]}
for _, r in arc_counts.iterrows():
    for k, v in zip(["missing_ARC", "full_access", "ARC_equal_0_not_full", "ARC_below_0_not_full", "ARC_above_0_not_full"], wb_counts[r["area"]]):
        check(f"count {r['area']} {k}", r[k], v)

# ---- year representation ----
year_dist = raw2["year"].value_counts().sort_index().rename_axis("year").reset_index(name="rows")
year_dist.to_csv(D2 / "year_distribution.csv", index=False)

# ---- ARC_diff histogram + extremes ----
diff = c2["ARC_diff_rural_minus_urban"].dropna()
counts, edges = np.histogram(diff, bins=12, range=(-2.5, 2.5))
pd.DataFrame({"bin_start": edges[:-1], "bin_end": edges[1:], "countries": counts}).to_csv(D2 / "arc_diff_histogram.csv", index=False)
ext = pd.concat([c2.nlargest(5, "ARC_diff_rural_minus_urban"), c2.nsmallest(5, "ARC_diff_rural_minus_urban")])
ext = ext[["name", "region", "ARC_r", "ARC_u", "ARC_diff_rural_minus_urban"]]
ext.to_csv(D2 / "arc_diff_extremes.csv", index=False)
top2_abs = c2.loc[c2["ARC_diff_rural_minus_urban"].abs().nlargest(2).index, "name"].tolist()

# ---- region summary ----
reg = c2.groupby("region").agg(countries=("name", "count"), avg_ARC_national=("ARC_n", "mean"),
                               avg_ARC_rural=("ARC_r", "mean"), avg_ARC_urban=("ARC_u", "mean"),
                               avg_basic_national_end_year=("basic_n_end", "mean"),
                               avg_population_thousands=("pop_n_end_year", "mean")).reset_index()
reg["illustrative_years_to_full_access"] = (100 - reg["avg_basic_national_end_year"]) / reg["avg_ARC_national"]
reg = reg.sort_values("avg_ARC_national", ascending=False).reset_index(drop=True)
reg.to_csv(D2 / "region_summary.csv", index=False)
assert reg["countries"].sum() == 231
# sensitivity: Tunisia is labelled Sub-Saharan Africa in the supplied region mapping
ssa = c2[c2.region == "Sub-Saharan Africa"]
ssa_ex_tn = ssa[ssa["name"] != "Tunisia"]

# ---- save validation ----
vc = pd.DataFrame(checks)
vc.to_csv(ROOT / "data/validation_checks.csv", index=False)
n_bad = int((~vc["match"]).sum())
print(f"validation: {len(vc)} checks, {n_bad} mismatches")
if n_bad:
    print(vc[~vc.match])

# =====================================================================
# JSON for the slide deck
# =====================================================================
def stat(f, k):
    return float(area_stats.loc[area_stats.feature == f, k].iloc[0])


metrics = {
    "p1": {
        "countries": int(len(d1)), "features_total": 23, "features_original": 16,
        "dataset_pop": ds_pop, "world_pop": WORLD_POP, "pop_pct_diff": pdiff(ds_pop, WORLD_POP),
        "ds_urban_share": ds_urban_pct, "world_urban_share": 55.0,
        "urban_total_pct_diff_world": pdiff(ds_urban_tot, world_urban),
        "urban_total_pct_diff_pct": pdiff(ds_urban_tot, ds_urban_from_world_pct),
        "n_over_100": n_over_100, "max_basic_raw": float(d1["wat_bas_n"].max()),
        "rows_fixed_semicolon": 5,
        "mean_basic": {a: stat(f"wat_bas_{a}", "mean") for a, _ in AREAS},
        "median_basic": {a: stat(f"wat_bas_{a}", "median") for a, _ in AREAS},
        "iqr_basic": {a: stat(f"wat_bas_{a}", "iqr") for a, _ in AREAS},
        "min_basic": {a: stat(f"wat_bas_{a}", "min") for a, _ in AREAS},
        "mean_levels": {a: {lv: stat(f"wat_{lv}_{a}", "mean") for lv, _ in LEVELS} for a, _ in AREAS},
        "income": income.set_index("income_group")[["countries", "avg_urban_share_pct", "avg_basic_pct", "avg_limited_pct",
                                                    "avg_unimproved_pct", "avg_surface_pct", "total_population_thousands"]].round(2).to_dict("index"),
        "corr_urban_basic": float(corr.loc["pop_u", "wat_bas_n"]),
        "corr_pop_basic": float(corr.loc["pop_n", "wat_bas_n"]),
        "corr_pop_urban": float(corr.loc["pop_n", "pop_u"]),
        "countries_basic_below_50": int((d1.wat_bas_n < 50).sum()),
        "countries_basic_below_90": int((d1.wat_bas_n < 90).sum()),
        "sheet_mean_basic": {"n": float(sheet_mean[0]), "r": float(sheet_mean[4]), "u": float(sheet_mean[8])},
    },
    "p2": {
        "countries": 231, "rows": int(len(raw2)), "features_total": 28,
        "year_counts": {int(k): int(v) for k, v in raw2["year"].value_counts().sort_index().items()},
        "y_diff_avg": float(c2["y_diff"].mean()),
        "arc": {a: {"avg": float(c2[f"ARC_{a}"].mean()), "median": float(c2[f"ARC_{a}"].median()),
                    "min": float(c2[f"ARC_{a}"].min()), "max": float(c2[f"ARC_{a}"].max())} for a in "nru"},
        "counts": arc_counts.set_index("area").to_dict("index"),
        "diff": {"n": int(len(diff)), "mean": float(diff.mean()), "median": float(diff.median()),
                 "share_positive": float((diff > 0).mean()), "share_negative": float((diff < 0).mean()),
                 "hist_counts": [int(x) for x in counts], "hist_edges": [round(float(x), 3) for x in edges]},
        "top2_abs_diff": top2_abs,
        "extremes": ext.round(4).to_dict("records"),
        "regions": reg.round(4).to_dict("records"),
        "ssa_arc_n_ex_tunisia": float(ssa_ex_tn["ARC_n"].mean()), "ssa_arc_n": float(ssa["ARC_n"].mean()),
    },
}
(ROOT / "data/summary_metrics.json").write_text(json.dumps(metrics, indent=2, default=float))

# =====================================================================
# PLOTS
# =====================================================================
# 01 urban share vs population
fig, ax = plt.subplots(figsize=(8.5, 5))
ax.scatter(d1["pop_n"] * 1000, d1["pop_u"], s=28, color=TEAL, alpha=.75, edgecolor="white", linewidth=.5)
ax.set_xscale("log"); ax.set_xlabel("National population (log scale)"); ax.set_ylabel("Urban share of population (%)")
ax.axhline(55, color=GREY, ls="--", lw=1); ax.text(1.2e3, 56.5, "World urban share 2020: 55%", color=GREY, fontsize=9)
ax.set_title("Population size does not predict urbanisation")
ax.text(.99, .03, f"r = {corr.loc['pop_n','pop_u']:.2f} (n = {len(d1)} countries)", transform=ax.transAxes, ha="right", color=GREY)
save(fig, "01_urban_share_vs_population.png")

# 02 box-and-whisker for 12 features
fig, ax = plt.subplots(figsize=(11, 5.2))
stats_list, pos, cols, labels = [], [], [], []
x = 0
for a, an in AREAS:
    for lv, ln in LEVELS:
        s = d1[f"wat_{lv}_{a}"].dropna()
        stats_list.append({"med": s.median(), "q1": s.quantile(.25), "q3": s.quantile(.75), "whislo": s.min(), "whishi": s.max(), "fliers": []})
        pos.append(x); cols.append(LEVEL_COL[ln]); labels.append(ln); x += 1
    x += .8
bp = ax.bxp(stats_list, positions=pos, widths=.65, patch_artist=True, showfliers=False,
            medianprops=dict(color="white", lw=2), whiskerprops=dict(color=GREY), capprops=dict(color=GREY))
for patch, c in zip(bp["boxes"], cols):
    patch.set_facecolor(c); patch.set_edgecolor(c)
for p_, a_ in zip(pos, [f"wat_{lv}_{a}" for a, _ in AREAS for lv, _ in LEVELS]):
    ax.plot(p_, d1[a_].mean(), marker="D", color="white", mec=NAVY, ms=5, zorder=5)
ax.set_xticks(pos); ax.set_xticklabels(labels, rotation=35, ha="right")
for i, (a, an) in enumerate(AREAS):
    mid = np.mean(pos[i * 4:(i + 1) * 4])
    ax.text(mid, -33, an, ha="center", fontweight="bold", color=NAVY, fontsize=11)
ax.set_ylabel("Share of population (%)"); ax.set_ylim(0, 102)
ax.set_title("Access to water by service level and area, 2020 (min-max whiskers, IQR box, median bar)")
ax.legend(handles=[Line2D([0], [0], marker="D", color="w", mec=NAVY, mfc="white", label="Mean")], loc="upper right", frameon=False)
save(fig, "02_access_boxplots_by_area.png")

# 03 mean service levels by area
fig, ax = plt.subplots(figsize=(9, 5))
w = .2
for i, (lv, ln) in enumerate(LEVELS):
    vals = [stat(f"wat_{lv}_{a}", "mean") for a, _ in AREAS]
    bars = ax.bar(np.arange(3) + (i - 1.5) * w, vals, w, color=LEVEL_COL[ln], label=ln)
    for b, v in zip(bars, vals):
        ax.text(b.get_x() + b.get_width() / 2, v + 1, f"{v:.1f}", ha="center", fontsize=8, color=NAVY)
ax.set_xticks(range(3)); ax.set_xticklabels([n for _, n in AREAS]); ax.set_ylabel("Mean share of population (%)")
ax.set_ylim(0, 105); ax.legend(frameon=False, ncol=4, loc="upper center", bbox_to_anchor=(.5, 1.0))
ax.set_title("Rural populations rely far more on lower service levels", pad=22)
ax.text(.0, -.12, "Means over countries that report each feature (missing values excluded).", transform=ax.transAxes, color=GREY, fontsize=8)
save(fig, "03_mean_service_levels_by_area.png")

# 04 national access by population size (100% stacked, 213 bars)
fig, ax = plt.subplots(figsize=(11, 4.8))
t = d1.dropna(subset=["wat_bas_n", "wat_lim_n", "wat_unimp_n"]).sort_values("pop_n")
bottom = np.zeros(len(t))
for lv, ln in LEVELS:
    v = t[f"wat_{lv}_n"].fillna(0).clip(upper=100).values
    ax.bar(np.arange(len(t)), v, 1.0, bottom=bottom, color=LEVEL_COL[ln], label=ln, linewidth=0); bottom += v
ax.set_xlim(-.5, len(t) - .5); ax.set_ylim(0, 100); ax.set_ylabel("Share of population (%)")
ax.set_xlabel("Countries ordered by national population (smallest to largest)"); ax.set_xticks([])
ax.grid(False); ax.legend(frameon=False, ncol=4, loc="lower center", bbox_to_anchor=(.5, 1.0))
ax.set_title("National access by service level, countries ordered by population size", pad=26)
save(fig, "04_national_access_by_population_size.png")

# 05/06 urban + rural access by share bins
for area, share, nm, fname in [("u", "pop_u", "urban", "05_urban_access_by_urban_share.png"), ("r", "pop_r", "rural", "06_rural_access_by_rural_share.png")]:
    t = binned(d1, share, None, area)
    fig, ax = plt.subplots(figsize=(8.5, 4.8))
    bottom = np.zeros(len(t))
    tot = t[[f"wat_{lv}_{area}" for lv, _ in LEVELS]].sum(axis=1)
    for lv, ln in LEVELS:
        v = (t[f"wat_{lv}_{area}"] / tot * 100).values
        ax.bar(np.arange(len(t)), v, .8, bottom=bottom, color=LEVEL_COL[ln], label=ln); bottom += v
    ax.set_xticks(range(len(t))); ax.set_xticklabels([f"{int(i)}-{int(i)+9}%" if i < 90 else "90-100%" for i in t.index])
    for i, c in enumerate(t["countries"]):
        ax.text(i, 101, f"n={int(c)}", ha="center", fontsize=8, color=GREY)
    ax.set_ylim(0, 108); ax.set_xlabel(f"{nm.capitalize()} share of national population (10-point bins)"); ax.set_ylabel("Mean share (%)")
    ax.grid(False); ax.legend(frameon=False, ncol=4, loc="lower center", bbox_to_anchor=(.5, -.32))
    ax.set_title(f"{nm.capitalize()} access by service level vs {nm} population share")
    save(fig, fname)

# 07 income group service levels (100% stacked)
order = ["Low income", "Lower middle income", "Upper middle income", "High income"]
fig, ax = plt.subplots(figsize=(8.5, 4.8))
inc = income.set_index("income_group").loc[order]
bottom = np.zeros(4)
for key, (lv, ln) in zip(["avg_basic_pct", "avg_limited_pct", "avg_unimproved_pct", "avg_surface_pct"], LEVELS):
    v = inc[key].values; ax.barh(order, v, left=bottom, color=LEVEL_COL[ln], label=ln)
    for i, (b, vv) in enumerate(zip(bottom, v)):
        if vv > 4: ax.text(b + vv / 2, i, f"{vv:.0f}%", ha="center", va="center", color="white", fontsize=9, fontweight="bold")
    bottom += v
ax.invert_yaxis(); ax.set_xlim(0, 100); ax.set_xlabel("Mean share of population (%)"); ax.grid(False)
ax.legend(frameon=False, ncol=4, loc="lower center", bbox_to_anchor=(.5, 1.0))
ax.set_title("Water service levels by income group (2020)", pad=26)
save(fig, "07_income_group_service_levels.png")

# 08 urban share vs basic access, coloured by income group
fig, ax = plt.subplots(figsize=(8.5, 5))
for grp in ["High income", "Upper middle income", "Lower middle income", "Low income", "Unclassified"]:
    s = d1[d1.income_group == grp].dropna(subset=["wat_bas_n"])
    ax.scatter(s["pop_u"], s["wat_bas_n"], s=30, color=INCOME_COL[grp], label=grp, alpha=.85, edgecolor="white", linewidth=.5)
ax.set_xlabel("Urban share of population (%)"); ax.set_ylabel("Population with at least basic water (%)")
ax.set_title("More urbanised and richer countries have higher basic access")
ax.text(.02, .04, f"r = {corr.loc['pop_u','wat_bas_n']:.2f}", transform=ax.transAxes, color=GREY)
ax.legend(frameon=False, fontsize=8, loc="lower right")
save(fig, "08_urban_share_vs_basic_access_by_income.png")

# 09 year distribution
fig, ax = plt.subplots(figsize=(8.5, 4.5))
yd = raw2["year"].value_counts().sort_index()
ax.bar(yd.index.astype(str), yd.values, color=[TEAL if v > 100 else "#9AA7B4" for v in yd.values])
for i, v in enumerate(yd.values): ax.text(i, v + 4, str(v), ha="center", color=NAVY, fontsize=9)
ax.set_ylabel("Country-year observations"); ax.set_xlabel("Year")
ax.set_title("The 'time series' is really two snapshots: 2015 and 2020")
save(fig, "09_year_distribution.png")

# 10 ARC summary (avg with min-max range)
fig, ax = plt.subplots(figsize=(8.5, 4.6))
for i, (a, an) in enumerate(AREAS):
    s = c2[f"ARC_{a}"].dropna()
    ax.plot([i, i], [s.min(), s.max()], color="#C8D1DA", lw=6, solid_capstyle="round", zorder=1)
    ax.scatter(i, s.mean(), s=140, color=AREA_COL[an], zorder=3)
    ax.text(i + .12, s.mean(), f"avg {s.mean():.2f}", va="center", color=NAVY, fontsize=10, fontweight="bold")
    ax.text(i, s.max() + .1, f"max {s.max():.2f}", ha="center", fontsize=8, color=GREY)
    ax.text(i, s.min() - .22, f"min {s.min():.2f}", ha="center", fontsize=8, color=GREY)
ax.axhline(0, color=GREY, lw=1); ax.set_xticks(range(3)); ax.set_xticklabels([n for _, n in AREAS])
ax.set_ylabel("Annual rate of change, percentage points per year"); ax.set_xlim(-.5, 2.7); ax.set_ylim(-2.1, 3.3)
ax.set_title("Average annual change in basic-water access (ARC)")
save(fig, "10_arc_summary_by_area.png")

# 11 ARC status counts
fig, ax = plt.subplots(figsize=(9, 4))
cats = [("full_access", "Full access (both years)", "#0B2545"), ("ARC_above_0_not_full", "Improving (ARC > 0)", "#1B7F9E"),
        ("ARC_equal_0_not_full", "No change (ARC = 0)", "#F2B134"), ("ARC_below_0_not_full", "Declining (ARC < 0)", "#B83227"),
        ("missing_ARC", "No ARC (missing data)", "#C8D1DA")]
left = np.zeros(3)
for key, lab, col in cats:
    v = arc_counts[key].values; ax.barh(arc_counts["area"], v, left=left, color=col, label=lab)
    for i, (l, vv) in enumerate(zip(left, v)):
        if vv >= 12: ax.text(l + vv / 2, i, str(vv), ha="center", va="center", color="white" if col != "#C8D1DA" and col != "#F2B134" else NAVY, fontsize=9, fontweight="bold")
    left += v
ax.invert_yaxis(); ax.set_xlabel("Number of countries (231 total)"); ax.grid(False)
ax.legend(frameon=False, ncol=3, loc="lower center", bbox_to_anchor=(.5, 1.0), fontsize=8)
ax.set_title("What happened to basic-water access, 2015 to 2020", pad=36)
save(fig, "11_arc_status_counts.png")

# 12 ARC_diff histogram
fig, ax = plt.subplots(figsize=(8.5, 4.6))
mid = (edges[:-1] + edges[1:]) / 2
ax.bar(mid, counts, width=(edges[1] - edges[0]) * .92, color=[TEAL if m > 0 else "#E07A3F" for m in mid])
ax.axvline(0, color=NAVY, lw=1)
for m, c in zip(mid, counts):
    if c: ax.text(m, c + 1.2, str(c), ha="center", fontsize=8, color=NAVY)
ax.set_xlabel("ARC rural minus ARC urban (percentage points per year)"); ax.set_ylabel("Number of countries")
ax.set_title(f"Rural access grew faster than urban in {diff.gt(0).mean()*100:.0f}% of countries")
ax.text(.99, .92, f"n = {len(diff)} countries with both ARCs", transform=ax.transAxes, ha="right", color=GREY, fontsize=9)
save(fig, "12_arc_rural_vs_urban_difference.png")

# 13 region ARC grouped bars
fig, ax = plt.subplots(figsize=(10, 5))
r_ = reg.sort_values("avg_ARC_national", ascending=True)
y = np.arange(len(r_)); h = .26
for j, (col, an) in enumerate([("avg_ARC_national", "National"), ("avg_ARC_rural", "Rural"), ("avg_ARC_urban", "Urban")]):
    ax.barh(y + (j - 1) * h, r_[col], h, color=AREA_COL[an], label=an)
ax.set_yticks(y); ax.set_yticklabels([f"{n} (n={c})" for n, c in zip(r_.region, r_.countries)])
ax.set_xlabel("Average ARC (percentage points per year)"); ax.legend(frameon=False, loc="lower right")
ax.set_title("Average annual change in basic-water access by region")
save(fig, "13_region_average_arc.png")

# 14 bubble: national vs rural ARC, region, population
fig, ax = plt.subplots(figsize=(10, 5.6))
t = c2.dropna(subset=["ARC_n", "ARC_r"])
for rg, col in REGION_COL.items():
    s = t[t.region == rg]
    ax.scatter(s["ARC_n"], s["ARC_r"], s=np.sqrt(s["pop_n_end_year"]) * 1.1 + 12, color=col, alpha=.6, edgecolor="white", linewidth=.6, label=rg)
lim = [min(t.ARC_n.min(), t.ARC_r.min()) - .2, max(t.ARC_n.max(), t.ARC_r.max()) + .2]
ax.plot(lim, lim, color=GREY, ls="--", lw=1); ax.axhline(0, color="#C8D1DA", lw=1); ax.axvline(0, color="#C8D1DA", lw=1)
ax.set_xlabel("National ARC (pp / year)"); ax.set_ylabel("Rural ARC (pp / year)")
ax.set_title("National vs rural ARC by region (bubble size = population)")
leg = ax.legend(frameon=False, fontsize=8, loc="upper left", markerscale=.5)
ax.text(.99, .03, "dashed line: rural ARC = national ARC", transform=ax.transAxes, ha="right", color=GREY, fontsize=8)
save(fig, "14_region_national_vs_rural_arc_bubble.png")

# 15 illustrative years to full access
fig, ax = plt.subplots(figsize=(8.5, 4.6))
t = reg[reg.region != "North America"].sort_values("illustrative_years_to_full_access", ascending=True)
bars = ax.barh(t.region, t.illustrative_years_to_full_access, color=[REGION_COL[r] for r in t.region])
for b, v in zip(bars, t.illustrative_years_to_full_access): ax.text(v + .8, b.get_y() + b.get_height() / 2, f"~{2020 + v:.0f}", va="center", color=NAVY, fontsize=9)
ax.invert_yaxis(); ax.set_xlabel("Years after 2020 to reach 100% basic access at the 2015-2020 average pace")
ax.set_title("Illustrative time to full basic-water access"); ax.set_xlim(0, t.illustrative_years_to_full_access.max() * 1.18)
ax.text(0, -.2, "Linear extrapolation of regional averages (unweighted). North America omitted: near-universal access, ARC close to 0.", transform=ax.transAxes, fontsize=8, color=GREY)
save(fig, "15_illustrative_time_to_full_access.png")

print("done:", len(list(PLOTS.glob('*.png'))), "plots")
