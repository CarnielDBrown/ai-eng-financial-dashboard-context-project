import type {
  BusinessType,
  GroupBy,
} from "./api-types";

/** Optional inclusive date filters shared by the feature requests. */
export interface DateRangeFilter {
  /** Inclusive start date as YYYY-MM-DD; omit to leave the start unbounded. */
  start_date?: string;
  /** Inclusive end date as YYYY-MM-DD; omit to leave the end unbounded. */
  end_date?: string;
}

/** Query used for the monthly anomaly table. */
export interface AlertsParams extends DateRangeFilter {
  /** Increase ratio; the UI accepts 0.01 through 1.0 and defaults to 0.3. The API accepts values greater than or equal to 0. */
  threshold: number;
  /** Monthly grouping for the dashboard table; the API also accepts day and week. */
  group_by: "month";
}

/** Query used for one business-line income-category panel. */
export interface TopCategoriesParams extends DateRangeFilter {
  /** This view requests income; the API also accepts outcome. */
  operation_type: "income";
  /** This view requests five rows; the API accepts integers from 1 through 20. */
  limit: 5;
  /** Business line selected for this panel. */
  business_type: BusinessType;
}

/** Query used to calculate a business line's total income denominator. */
export interface SummaryParams extends DateRangeFilter {
  /** Monthly buckets are summed to get the selected-range group total. */
  group_by: "month";
  /** Business line whose summary is being requested. */
  business_type: BusinessType;
}

/** Type of the income and outcome grouping option used by summary and alerts. */
export type MetricsGroupBy = GroupBy;