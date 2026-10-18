/** API operation types accepted by metrics and category endpoints. */
export type OperationType = "income" | "outcome";

/** Category values returned by the current seeded metrics dataset. */
export type Category =
  | "suppliers"
  | "sales"
  | "operational"
  | "administrative"
  | "others";

/** Business-line values accepted by the metrics API. */
export type BusinessType = "B2B" | "B2C";

/** Aggregation periods accepted by summary and alert endpoints. */
export type GroupBy = "day" | "week" | "month";

/** One financial transaction returned by GET /api/metrics. */
export interface FinancialMovement {
  /** Calendar date in ISO YYYY-MM-DD format. */
  create_date: string;
  /** Numeric amount; the API does not include currency metadata. */
  amount: number;
  /** Whether this movement contributes income or outcome. */
  operation_type: OperationType;
  /** The movement's category from the API category enum. */
  category: Category;
  /** The business line associated with the movement. */
  business_type: BusinessType;
}

/** Array response from GET /api/metrics, optionally filtered by dates. */
export type MetricsResponse = FinancialMovement[];

/** Response from GET /api/metrics/facets. */
export interface FacetsResponse {
  /** Operation types present in the full dataset. */
  operation_types: OperationType[];
  /** Business lines present in the full dataset. */
  business_types: BusinessType[];
  /** Global category union; the facets endpoint has no business-line filter. */
  categories: Category[];
  /** Earliest dataset date in ISO YYYY-MM-DD format. */
  min_date: string;
  /** Latest dataset date in ISO YYYY-MM-DD format. */
  max_date: string;
}

/** One row returned by GET /api/metrics/alerts. */
export interface AlertEntry {
  /** Period key; YYYY-MM for month grouping, ISO week key for week grouping, or YYYY-MM-DD for day grouping. */
  period: string;
  /** Total outcome amount recorded in this period. */
  outcome_total: number;
  /** API baseline: mean outcome over all earlier returned periods, not a rolling three-period average. */
  baseline_average: number;
  /** Relative increase over baseline as a ratio; multiply by 100 to display a percentage. */
  increase_ratio: number;
}

/** Array response from GET /api/metrics/alerts. */
export type AlertsResponse = AlertEntry[];

/** One row returned by GET /api/metrics/categories/top. */
export interface CategoryEntry {
  /** Category identifier from the API category enum. */
  category: Category;
  /** Operation type used to aggregate this row. */
  operation_type: OperationType;
  /** Sum of amounts for this category and operation type. */
  total_amount: number;
}

/** Array response from GET /api/metrics/categories/top. */
export type TopCategoriesResponse = CategoryEntry[];

/** One time bucket returned by GET /api/metrics/summary. */
export interface MetricsSummaryEntry {
  /** Period key for the requested grouping. */
  period: string;
  /** Sum of income movements in this period. */
  income: number;
  /** Sum of outcome movements in this period. */
  outcome: number;
  /** Income minus outcome in this period. */
  net: number;
}

/** Array response from GET /api/metrics/summary. */
export type MetricsSummaryResponse = MetricsSummaryEntry[];