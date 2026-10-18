# Component Specifications

These are frontend behavior and prop contracts only. They do not implement components or API calls. Shared API types are in `api-types.ts`; query types are in `param-types.ts`.

## Feature 1: Home Dashboard Date Filter

### `DashboardDateRangeFilter`

Place the two date inputs near the top of the home dashboard, before the KPI row. Keep the earliest/latest range hint next to the controls.

| Prop | Type | Required | Contract |
| --- | --- | --- | --- |
| `value` | `DateRangeFilter` | Yes | Controlled start and end values; an absent field means the input is empty. |
| `availableRange` | `Pick<FacetsResponse, "min_date" \| "max_date">` | Yes | Reference bounds and native input `min`/`max` values from the facets endpoint. |
| `facetsLoading` | `boolean` | Yes | While true, show a loading hint in place of the date bounds. |
| `facetsError` | `string \| null` | Yes | If facets failed, show an inline error and leave the date inputs usable without bounds. |
| `onChange` | `(value: DateRangeFilter) => void` | Yes | Report valid date changes to the home dashboard. |

Display `availableRange.min_date` and `availableRange.max_date` as the available dataset range. Inputs use `type="date"` and the API's `YYYY-MM-DD` calendar-date format. The bounds come from `GET /api/metrics/facets`; they describe the full current dataset, not the selected range.

On every valid change, refresh the existing dashboard data with `GET /api/metrics` and derive the KPI and chart values from that filtered response. Omit empty query parameters. With neither date set, request all data. With only `start_date`, request records on or after that date; with only `end_date`, request records on or before that date. Both bounds are inclusive.

If both dates are set and `start_date` is later than `end_date`, show an inline validation message and do not issue the metrics request. The API returns HTTP 200 with an empty array for a reversed range, so the UI must prevent that misleading empty result. Native `min`/`max` bounds should discourage dates outside the facets range; if a value is outside the range, show validation rather than silently clamping it.

## Feature 2: Anomaly Alerts

### `AlertThresholdControl`

| Prop | Type | Required | Contract |
| --- | --- | --- | --- |
| `value` | `number` | Yes | Last valid threshold ratio. |
| `onChange` | `(value: number) => void` | Yes | Called only for a valid value. |
| `error` | `string \| null` | Yes | Inline validation message for an invalid draft. |

Render a numeric input with minimum `0.01`, maximum `1.0`, step `0.01`, and initial value `0.3`. The input represents a ratio, not a percentage: `0.3` means a 30% increase. Reject blank, non-finite, or out-of-range values with an inline message; do not fetch alerts until a valid value is restored. The UI constraint is stricter than the API, which accepts every threshold greater than or equal to zero and has no maximum.

### `AnomalyAlertsTable`

| Prop | Type | Required | Contract |
| --- | --- | --- | --- |
| `alerts` | `AlertsResponse` | Yes | Rows returned by the alerts endpoint. |
| `loading` | `boolean` | Yes | Show a table-shaped loading state while refreshing. |
| `error` | `string \| null` | Yes | Show a visible request error instead of stale rows. |

Request `GET /api/metrics/alerts` with the valid `threshold`, `group_by=month`, and current optional date range. The table has exactly four columns:

| Column | Source | Display |
| --- | --- | --- |
| Period | `AlertEntry.period` | API period key (`YYYY-MM` for monthly grouping). |
| Recorded outcome | `AlertEntry.outcome_total` | Currency using the existing `formatCurrency` formatter. |
| Prior-period average | `AlertEntry.baseline_average` | Currency using `formatCurrency`. |
| Increase | `AlertEntry.increase_ratio` | Multiply by 100, then use the existing `formatPercent` formatter. |

When `alerts` is empty, keep the table region visible and show: “No spending anomalies found for this threshold and date range.” Do not hide the table. If loading or error is active, that state takes precedence over the empty state.

**Verified API mismatch:** the PM asks for the average of the previous three periods, but `baseline_average` is the mean of all earlier periods in the filtered summary. The response does not contain the earlier period values needed to reconstruct a rolling-three average. This component must not label the API value as a rolling-three average. The current contract labels it “Prior-period average”; the exact PM outcome requires a backend contract change or explicit product approval before implementation.

## Feature 3: B2B vs B2C Comparison Page

### `B2BvsB2CComparisonPage`

Use the page path `/comparison`; keep the existing home dashboard at `/`. The current frontend has no router, so route integration is a later implementation task and must not be represented as existing behavior.

| Prop | Type | Required | Contract |
| --- | --- | --- | --- |
| `dateRange` | `DateRangeFilter` | Yes | Current optional inclusive date range. |
| `availableRange` | `Pick<FacetsResponse, "min_date" \| "max_date">` | Yes | Full dataset date bounds shown by the shared date filter. |
| `availableCategories` | `FacetsResponse["categories"]` | Yes | Global category values returned by facets. |
| `b2bCategories` | `TopCategoriesResponse` | Yes | B2B income categories, sorted by API total descending. |
| `b2cCategories` | `TopCategoriesResponse` | Yes | B2C income categories, sorted by API total descending. |
| `b2bTotalIncome` | `number` | Yes | B2B selected-range income denominator. |
| `b2cTotalIncome` | `number` | Yes | B2C selected-range income denominator. |
| `loading` | `boolean` | Yes | Shared loading state for the page data. |
| `error` | `string \| null` | Yes | Visible page-level data error. |
| `onDateRangeChange` | `(value: DateRangeFilter) => void` | Yes | Called by the shared date filter for a valid range change. |

Fetch facets once for date bounds and the global category list. For each selected date range, request two `GET /api/metrics/categories/top` responses with `operation_type=income`, `limit=5`, and `business_type=B2B` or `B2C`. Also request two `GET /api/metrics/summary` responses with `group_by=month` and the matching `business_type`; sum each response's `income` fields to obtain the group denominator. Pass identical date filters to category and summary requests. Refresh all four responses when the date range changes.

The facets endpoint has no `business_type` filter: `facets.categories` is a global union, not a B2B-specific or B2C-specific list. Use it as the source of valid category labels; use each top-category response as the source of the rows actually displayed for that business line. The top-category endpoint may return fewer than five rows.

### `BusinessIncomePanel`

Render one panel for each business type, side by side on wide screens and stacked on narrow screens.

| Prop | Type | Required | Contract |
| --- | --- | --- | --- |
| `businessType` | `BusinessType` | Yes | Panel heading: `B2B` or `B2C`. |
| `categories` | `TopCategoriesResponse` | Yes | Top income category rows for this panel. |
| `availableCategories` | `FacetsResponse["categories"]` | Yes | Global category enum from facets; do not imply group-specific availability. |
| `totalIncome` | `number` | Yes | Selected-range denominator from the matching summary response. |
| `loading` | `boolean` | Yes | Show a panel loading state. |

Each table has category, total income, and percentage-of-group-total columns. Preserve API sort order. Calculate a row percentage as `total_amount / totalIncome * 100`; if the denominator is not positive, display `—` rather than dividing by zero. If the API returns no categories, show “No income categories available for this business line and date range.” Do not render five fabricated or blank rows.

### `BusinessIncomeComparisonChart`

| Prop | Type | Required | Contract |
| --- | --- | --- | --- |
| `data` | `BusinessIncomePoint[]` | Yes | Exactly one selected-range income total for each business type. |
| `loading` | `boolean` | Yes | Show a chart loading state. |

`BusinessIncomePoint` is a frontend-derived view model, not an API response:

| Property | Type | Meaning |
| --- | --- | --- |
| `business_type` | `BusinessType` | `B2B` or `B2C`. |
| `total_income` | `number` | Sum of monthly summary `income` for that group and date range. |

Render one chart with exactly two data points, B2B and B2C, using the same currency formatter as the tables. If one group has no income, keep its zero-valued point so the comparison remains clear. If both totals are zero, show an explicit no-income state instead of a blank chart.

## Data Contract Gaps To Resolve Before Implementation

- The alert API's expanding baseline does not satisfy the PM's rolling-three-period requirement; do not treat the two metrics as equivalent.
- Facets exposes global categories only, not category lists filtered per business line.
- Top-category responses do not include the group-total denominator; the comparison page also needs the summary endpoint.
- The repository has no client-side router, while the request describes a new page. The `/comparison` path is the proposed page contract; route wiring remains unimplemented.