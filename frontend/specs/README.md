# Financial Dashboard Feature Data Contract

This folder specifies three frontend features; it does not implement React components, fetch calls, routing, or backend changes. Shared response types are in `api-types.ts`, query types in `param-types.ts`, and component behavior in `components.md`.

## API Verification

The backend was started with Docker Compose. `GET http://localhost:8000/docs` returned HTTP 200 and served Swagger UI backed by `/openapi.json`; the endpoint and schema claims below were checked against that live OpenAPI document. The route implementations in `backend/app/routes.py` were also inspected for filtering and aggregation behavior.

| Endpoint | Verified request and response contract | Status |
| --- | --- | --- |
| `GET /api/metrics` | Returns `MetricsResponse` (`FinancialMovement[]`). Each movement has required `create_date` (`string`, OpenAPI `date`), `amount` (`number`), `operation_type` (`income \| outcome`), `category` (`suppliers \| sales \| operational \| administrative \| others`), and `business_type` (`B2B \| B2C`). `start_date` and `end_date` are independently optional date query parameters; `category` and `operation_type` are also optional. | ✅ Verified in `/docs` and route implementation. |
| `GET /api/metrics/facets` | Takes no query parameters. Returns required `operation_types`, `business_types`, `categories`, `min_date`, and `max_date`; date properties use ISO `YYYY-MM-DD`. | ✅ Verified. Category values are a dataset-wide union, not scoped by business type. |
| `GET /api/metrics/alerts` | Returns `AlertsResponse` (`AlertEntry[]`). Optional `threshold` is a number with minimum `0` and default `0.3`, with no maximum; `group_by` is `day \| week \| month`, default `month`; optional dates are ISO date queries; optional `business_type` is `B2B \| B2C`. | ✅ Query and response shape verified. ❌ PM's `0.01–1.0` limit is a frontend-only constraint, not the API constraint. ❌ The returned baseline is not a rolling three-period average. |
| `GET /api/metrics/categories/top` | Returns `TopCategoriesResponse` (`CategoryEntry[]`). Optional `operation_type` is `income \| outcome`, default `outcome`; optional `limit` is an integer from `1` to `20`, default `5`; optional dates and `business_type` (`B2B \| B2C`) are supported. | ✅ Verified. For this feature, explicitly send `operation_type=income` and `limit=5`. |
| `GET /api/metrics/summary` | Returns `MetricsSummaryResponse` (`MetricsSummaryEntry[]`). `group_by` is `day \| week \| month`, default `month`; optional date, `category`, `operation_type`, and `business_type` filters are supported. Each row has `period`, `income`, `outcome`, and `net`. | ✅ Verified. Required as an additional source for each comparison-panel income denominator. |

OpenAPI uses date-formatted strings for date query parameters. Live requests confirmed that either date bound can be used alone, both bounds are inclusive, a reversed range currently returns HTTP 200 with an empty array, and `threshold=1.01` is accepted. The frontend must validate reversed dates and the PM threshold range rather than rely on server rejection.

The response interfaces in `api-types.ts` mirror the OpenAPI property names and primitive types. The backend does not provide currency metadata; the feature specs use the existing frontend currency formatter for display without treating that presentation as API metadata.

## Feature 1: Home Dashboard Date Filter

**Endpoints and types:** fetch `GET /api/metrics/facets` for `FacetsResponse.min_date` and `max_date`; fetch `GET /api/metrics` for `MetricsResponse`. The existing `FinancialMovement` shape already matches the API response.

**Parameters:** `DateRangeFilter.start_date` and `end_date` are optional strings formatted `YYYY-MM-DD`. Omit an empty parameter. Each is an inclusive bound. The API also accepts optional category and operation filters; this feature does not set them.

**Behavior and edge cases:**

- Neither date selected: omit both parameters and show all available metrics.
- Start only: send only `start_date`; include movements on or after it. End only: send only `end_date`; include movements on or before it.
- Both dates selected: send both and update every KPI and chart from the filtered response.
- Start later than end: show an inline validation error and do not send the request. The API otherwise returns a successful empty result.
- A selected value outside the facets bounds: show a validation error; do not silently clamp it. Show the full available range beside the inputs.

## Feature 2: Anomaly Alerts Table

**Endpoint and types:** `GET /api/metrics/alerts` returns `AlertsResponse`. Each `AlertEntry` has required `period: string`, `outcome_total: number`, `baseline_average: number`, and `increase_ratio: number`. Send `AlertsParams.threshold`, `group_by=month`, and the optional current `DateRangeFilter`.

**Threshold contract:** the PM control accepts ratios from `0.01` through `1.0`, defaults to `0.3`, and changes in `0.01` steps. These are frontend rules. OpenAPI allows values greater than or equal to zero and has no maximum. Reject blank, non-finite, below-minimum, and above-maximum user values in the frontend; issue no request until the value is valid. A ratio of `0.3` means 30%, and the response's `increase_ratio` is also a ratio, so multiply it by 100 for percentage display.

**Verified baseline mismatch:** `detect_outcome_alerts` in `backend/app/routes.py` compares each period to the arithmetic mean of all earlier periods in the filtered summary. It does not calculate the mean of only the previous three periods. It emits an alert only when the baseline is positive and the increase ratio is strictly greater than the threshold. The first period cannot alert. A date filter also removes earlier periods outside that range from the API baseline.

Therefore, the UI must label `baseline_average` as an all-prior-period average and must not claim the endpoint satisfies the PM's rolling-three requirement. Before implementation can meet that exact requirement, the backend contract must expose the rolling baseline/needed period data, or the PM must approve the current expanding average instead. Backend work is out of scope here.

**Edge cases:**

- Empty `AlertsResponse` (including insufficient history or a non-positive baseline): keep the table visible and show “No spending anomalies found for this threshold and date range.”
- Threshold below `0.01`, above `1.0`, blank, or non-finite: show validation and make no alerts request. Values exactly `0.01` and `1.0` are valid in the UI.
- An increase ratio above `1` is valid response data and represents an increase above 100%; do not clamp the display.
- When the date filter is active, pass the same bounds to the alerts endpoint; its baseline uses only periods that remain after filtering.

## Feature 3: B2B vs B2C Comparison

**Endpoints and types:** fetch `GET /api/metrics/facets` for `FacetsResponse.categories` and date bounds. For each business type, fetch `GET /api/metrics/categories/top` as `TopCategoriesResponse` with `operation_type=income`, `limit=5`, the matching `business_type`, and the selected date range. Also fetch `GET /api/metrics/summary` as `MetricsSummaryResponse` with `group_by=month`, matching `business_type`, and the same date range. Sum each summary response's `income` values to obtain the group total used as the percentage denominator. The category endpoint does not return this group total.

`TopCategoriesParams` represents the feature's fixed income/top-five query plus the selected business type and optional dates. `SummaryParams` represents the monthly, per-business-type denominator query. Send the same date bounds to both endpoint calls so row numerators and denominators cover identical movements.

**Rendering and calculations:** show B2B and B2C panels side by side on wide screens and stacked on narrow screens. Each panel displays category, `total_amount` (income), and `total_amount / groupTotalIncome * 100`. Preserve the server's descending total order. The comparison chart has exactly two points, one for each business type, using summed monthly `income`. Use the existing currency formatter; do not infer currency from the API schema.

`FacetsResponse.categories` is global because `/api/metrics/facets` has no business-type filter. Use it as the verified category vocabulary for both panels; the top-category response determines which rows a panel actually shows. The API can return fewer than five categories.

**Edge cases:**

- A business type has fewer than five income categories: show only returned rows, without placeholders.
- A business type has no matching categories: show “No income categories available for this business line and date range.” Keep the other panel visible.
- A group total is not positive: display `—` for a row percentage rather than dividing by zero. An empty group has a zero chart point.
- Both group totals are zero: show an explicit no-income state in the chart. If only one is zero, show both chart points, including the zero-valued group.
- A date range is reversed: reuse Feature 1 validation and do not issue category or summary requests.

The requested comparison is a new page at `/comparison`; the current app has no router. This path is the proposed page contract, not an existing route. Router/navigation implementation is outside this spec-only task.

## TypeScript Validation

From `frontend/`, run `npx tsc --noEmit` for the existing project check. The specification type files were additionally checked directly with strict TypeScript options because the application tsconfig currently includes `src/`, not `specs/`.