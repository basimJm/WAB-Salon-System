import type { COHORT_UNITS, EVENT_SOURCES, GROUPINGS, JOURNEY_SOURCES } from './constants/defaults';

export type Grouping = (typeof GROUPINGS)[number];
export type EventSource = (typeof EVENT_SOURCES)[number];
export type CohortUnit = (typeof COHORT_UNITS)[number];
export type JourneySource = (typeof JOURNEY_SOURCES)[number];

/** Who an event or a journey belongs to. */
export interface ActorRef {
  readonly actorType: string;
  readonly actorId: string;
}

/** Installation (Firebase app-instance id) ↔ account link (ANA-04). */
export interface IdentityLink extends ActorRef {
  readonly installationId: string;
}

/** What callers pass to `track`. Ids are strings; params hold IDs and codes only (ANF-03). */
export interface ServerEventInput {
  readonly name: string;
  readonly actorType: string;
  readonly actorId?: string;
  readonly salonId?: string;
  readonly bookingId?: string;
  readonly params?: Readonly<Record<string, unknown>>;
  readonly platform?: string;
  readonly appVersion?: string;
}

/** A validated, redacted event with its time. */
export interface StoredEvent {
  readonly ts: Date;
  readonly name: string;
  readonly actorType: string;
  readonly actorId?: string;
  readonly salonId?: string;
  readonly bookingId?: string;
  readonly params: Readonly<Record<string, unknown>>;
  readonly platform?: string;
  readonly appVersion?: string;
}

export interface CountQuery {
  /** Event names to count; empty or missing = all. */
  readonly names?: readonly string[];
  /** Half-open range `[from, to)`. */
  readonly from: Date;
  readonly to: Date;
  readonly groupBy: Grouping;
  /** Time zone of `DAY` groups; the option default when missing. */
  readonly timeZone?: string;
  /** `SERVER` (default) = server events, `APP` = Firebase export in the warehouse. */
  readonly source?: EventSource;
}

export interface CountRow {
  /** Event name for `NAME`, local date `YYYY-MM-DD` for `DAY`. */
  readonly key: string;
  readonly count: number;
}

export interface FunnelDefinition {
  /** Ordered event names, 2..maxFunnelSteps. */
  readonly steps: readonly string[];
  readonly from: Date;
  readonly to: Date;
  /** Longest time from the first step to the last. */
  readonly windowMs?: number;
  readonly source?: EventSource;
  /** How many drop-off users to list per step (0 = none). */
  readonly dropOffUsers?: number;
}

export interface FunnelStepResult {
  readonly name: string;
  readonly users: number;
  readonly conversionFromPrevious: number;
  readonly conversionFromFirst: number;
  readonly dropOff: number;
  readonly medianMsFromPrevious: number | null;
  readonly dropOffUsers: readonly string[];
}

export interface FunnelResult {
  readonly steps: readonly FunnelStepResult[];
  /** True when more events matched than `limits.maxScannedEvents`; numbers are lower bounds. */
  readonly truncated: boolean;
}

export interface CohortDefinition {
  /** The event that puts an actor in a cohort (first occurrence in the range). */
  readonly startEvent: string;
  /** The event that counts as coming back. */
  readonly returnEvent: string;
  readonly from: Date;
  readonly to: Date;
  readonly unit: CohortUnit;
  /** Periods after the cohort period to report (1..maxCohortPeriods). */
  readonly periods: number;
  readonly timeZone?: string;
  readonly source?: EventSource;
}

export interface CohortRow {
  /** Local start date of the cohort period. */
  readonly cohort: string;
  readonly size: number;
  /** `retained[k]` = actors active in period `k` after the cohort period (k = 0 is the first). */
  readonly retained: readonly number[];
}

export interface CohortResult {
  readonly unit: CohortUnit;
  readonly cohorts: readonly CohortRow[];
  readonly truncated: boolean;
}

export interface JourneyItem {
  readonly ts: string;
  readonly source: JourneySource;
  readonly name: string;
  readonly sessionId: string;
  readonly screen?: string;
  readonly params: Readonly<Record<string, unknown>>;
}

export interface JourneyPage {
  readonly limit?: number;
  readonly offset?: number;
}

export interface Overview {
  readonly from: string;
  readonly to: string;
  readonly totalEvents: number;
  readonly uniqueActors: number;
  /** Distinct app installations in the warehouse; null when no warehouse is configured. */
  readonly activeInstallations: number | null;
  readonly topEvents: readonly CountRow[];
  readonly daily: readonly CountRow[];
}

/** The stable interface every consumer uses (BRD ANA-01). */
export interface AnalyticsProvider {
  /** Resolves to whether the event was stored. NEVER throws. */
  track(event: ServerEventInput): Promise<boolean>;
  /** Links a guest installation to the account so guest history joins the journey. */
  linkIdentity(link: IdentityLink): Promise<void>;
  countEvents(query: CountQuery): Promise<CountRow[]>;
  funnel(definition: FunnelDefinition): Promise<FunnelResult>;
  cohorts(definition: CohortDefinition): Promise<CohortResult>;
  journey(
    actor: ActorRef,
    range: { from: Date; to: Date },
    page?: JourneyPage,
  ): Promise<JourneyItem[]>;
  overview(range: { from: Date; to: Date }): Promise<Overview>;
}

/** The provider plus lifecycle: `init` creates indexes, `close` releases connections. */
export interface Analytics extends AnalyticsProvider {
  init(): Promise<void>;
  close(): Promise<void>;
}
