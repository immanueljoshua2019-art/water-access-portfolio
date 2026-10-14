# Data dictionary

All percentages are percentage points of the relevant population. "pp" means percentage points.

## Original columns (both datasets)

| Column | Meaning |
|---|---|
| `name` | Country or area name |
| `income_group` | Income classification (Part 1 only): Low, Lower middle, Upper middle, High; blank = unclassified |
| `year` | Observation year (Part 2 only) |
| `pop_n` | National population, in **thousands** |
| `pop_u` | Urban share of the national population (%) |
| `wat_bas_{n,r,u}` | Share with **at least basic** water service: national, rural, urban (%) (basic + safely managed) |
| `wat_lim_{n,r,u}` | Share with **limited** service (%) |
| `wat_unimp_{n,r,u}` | Share with **unimproved** sources (%) |
| `wat_sur_{n,r,u}` | Share using **surface water** (%) |

## Part 1 engineered features (`part1_2020_snapshot/clean_dataset_2020.csv`)

| Column | Definition |
|---|---|
| `value_cnt` | `COUNTA` of the original row; 16 for every correctly imported row |
| `pop_u_val` | Urban head count in thousands: `pop_n x pop_u / 100` |
| `pop_r` | Rural share (%): `100 - pop_u` |
| `pop_n_m` | National population rounded **up** to whole millions (`ROUNDUP`) |
| `wat_bas_n_rounded` | National basic access with values marginally above 100% brought to 100 |
| `pop_u_rounded`, `pop_r_rounded` | Urban / rural share rounded to whole numbers |
| `income_code` | 0 unclassified, 1 low, 2 lower middle, 3 upper middle, 4 high (for ordered axes) |

Missing estimates are empty cells. 16 countries have no income classification (`Unclassified`).

## Part 2 panel (`part2_arc_2015_2020/clean_dataset_2015_2020.csv`)

Two rows per country (462 rows, 231 countries), sorted by `name`, `year`. Columns: the originals plus

| Column | Definition |
|---|---|
| `y_diff` | Years to the next row of the same country (first row of each pair only) |
| `ARC_n`, `ARC_r`, `ARC_u` | Annual rate of change in basic access (pp/yr): `(later - earlier) / y_diff`; empty if either year is missing |
| `wat_bas_{n,r,u}_rounded` | Basic access rounded to a whole number |
| `ARC_{n,r,u}_full` | `full access` if rounded basic access is 100 in both years |
| `ARC_diff` | `ARC_r - ARC_u` (pp/yr); positive = rural improved faster |
| `region` | Region from the supplied country-to-region mapping |

## Derived tables

| File | Contents |
|---|---|
| `part1_2020_snapshot/population_vs_world_summary.csv` | Dataset vs world population and urban totals; percentage differences |
| `part1_2020_snapshot/access_by_area_summary_stats.csv` | max, min, mean, median, mode, Q1, Q3, IQR, SD for the 12 access features; `mean_as_stored_in_workbook` keeps the original sheet value |
| `part1_2020_snapshot/income_group_summary.csv` | Countries, population, average urban share and average service levels by income group |
| `part1_2020_snapshot/correlation_matrix.csv` | Correlations among population, urban share, income code and basic access |
| `part2_arc_2015_2020/country_arc_table.csv` | One row per country: region, start/end year, basic access at both ends, ARCs, full-access flags, ARC difference |
| `part2_arc_2015_2020/arc_summary.csv` | Average, median, min, max of `y_diff` and the three ARCs |
| `part2_arc_2015_2020/arc_status_counts.csv` | Countries by missing / full access / ARC = 0 / ARC < 0 / ARC > 0, by area |
| `part2_arc_2015_2020/year_distribution.csv` | Rows per year |
| `part2_arc_2015_2020/arc_diff_histogram.csv`, `arc_diff_extremes.csv` | Histogram bins and the largest rural-minus-urban gaps |
| `part2_arc_2015_2020/region_summary.csv` | Countries, average ARCs, end-year basic access and an illustrative years-to-full-access by region |
| `validation_checks.csv` | Recomputed value vs value stored in the workbooks |
| `summary_metrics.json` | Headline numbers used by the slide deck |
