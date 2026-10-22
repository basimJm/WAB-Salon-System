export const REPORT_KINDS = ['daily', 'weekly', 'monthly'] as const;
export type ReportKind = (typeof REPORT_KINDS)[number];

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
/** `YYYY-MM` with a real month, the form the monthly report asks for. */
export const isMonth = (value: string): boolean => MONTH_PATTERN.test(value);

export interface ReportNumbers {
  readonly bookings: {
    readonly total: number;
    readonly byStatus: Readonly<Record<string, number | undefined>>;
    readonly bride: number;
  };
  readonly payments: {
    readonly attempts: number;
    readonly succeeded: number;
    readonly failed: number;
    readonly cancelled: number;
    /** JOD, 3 decimals. */
    readonly collected: string;
    readonly gatewayFees: string;
  };
  readonly refunds: {
    readonly created: number;
    readonly completed: number;
    readonly failed: number;
    readonly amount: string;
  };
  readonly registrations: { readonly customers: number; readonly applications: number };
  readonly reviews: { readonly submitted: number };
}

export interface ReportSnapshot {
  readonly reviewsPending: number;
  readonly refundsPending: number;
  readonly applicationsPending: number;
  readonly subscriptions: {
    readonly trial: number;
    readonly active: number;
    readonly expired: number;
  };
}

export interface TopSalon {
  readonly salonId: string;
  readonly bookings: number;
  readonly completed: number;
  readonly lost: number;
}

export interface DailyReport extends ReportNumbers {
  readonly date: string;
  readonly snapshot: ReportSnapshot;
}

export interface WeeklyReport extends ReportNumbers {
  readonly from: string;
  readonly to: string;
  readonly topSalons: readonly TopSalon[];
}

export interface MonthlyReport extends ReportNumbers {
  readonly month: string;
  readonly from: string;
  readonly to: string;
  readonly topSalons: readonly TopSalon[];
  readonly payouts: { readonly count: number; readonly amount: string };
  readonly snapshot: ReportSnapshot;
  readonly growth: {
    readonly bookingsPct: number | null;
    readonly collectedPct: number | null;
  };
}

export interface ReportsRepository {
  /** `date` is a business day (`YYYY-MM-DD`, Asia/Amman). */
  daily(date: string): Promise<DailyReport>;
  /** Seven days starting at `from`. */
  weekly(from: string): Promise<WeeklyReport>;
  monthly(month: string): Promise<MonthlyReport>;
}
