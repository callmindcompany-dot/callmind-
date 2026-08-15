import type { ReportFilters } from './reportFilters';

/**
 * What a click on a chart means.
 *
 * Charts are summaries, and until now that was all they were -- not one Bar,
 * Pie, Cell or Area on the page had an onClick, so a manager who saw a spike
 * could read the number and nothing else. The one drill-down that existed was
 * on a table row.
 *
 * A descriptor is the segment's own identity plus the filter bar it was drawn
 * under. Carrying the filters is what makes the panel trustworthy: a bar drawn
 * from "this month, Sneha, IndiaMart" opens the rows behind exactly that, not
 * every lead that ever matched the label. A drill-down that quietly widens the
 * query shows rows that were never in the bar the reader clicked, and there is
 * nothing on screen to reveal it.
 *
 * `where` is a closed set of dimensions rather than free SQL. Every field maps
 * to one indexed column, so a descriptor cannot express a filter the database
 * would answer slowly, and nothing from the chart reaches a query as text.
 */

export type DrillSubject = 'leads' | 'calls';

export interface LeadDrillWhere {
  status?: string;
  source?: string;
  city?: string;
  lostReason?: string;
  assignedTo?: string;
  /** Leads carrying a deal value -- what every "converted" count means here. */
  hasDealValue?: boolean;
  /** Matches the lost-reason charts, which key off the reason being present. */
  isLost?: boolean;
}

export interface CallDrillWhere {
  outcome?: string;
  interest?: string;
  agentId?: string;
  /** Hour of day, 0-23, for the hour-of-day chart. */
  hour?: number;
  /** 0 = Monday … 6 = Sunday, for the weekday heat map. */
  weekday?: number;
}

export interface DrillDown {
  subject: DrillSubject;
  /** What the reader clicked, shown as the panel's heading. */
  title: string;
  /** The dimension and value, so the panel can say why these rows. */
  subtitle: string;
  filters: ReportFilters;
  leadWhere?: LeadDrillWhere;
  callWhere?: CallDrillWhere;
}

export function leadDrill(
  title: string,
  subtitle: string,
  filters: ReportFilters,
  where: LeadDrillWhere,
): DrillDown {
  return { subject: 'leads', title, subtitle, filters, leadWhere: where };
}

export function callDrill(
  title: string,
  subtitle: string,
  filters: ReportFilters,
  where: CallDrillWhere,
): DrillDown {
  return { subject: 'calls', title, subtitle, filters, callWhere: where };
}

/**
 * The cap on how many rows a drill-down loads.
 *
 * Stated on screen whenever it is reached. A panel that silently shows the
 * first 500 of 3,000 is a worse answer than one that says so, because the
 * reader counts what is in front of them.
 */
export const DRILL_ROW_LIMIT = 500;
