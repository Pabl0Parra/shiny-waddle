// utils.ts
import { parseISO } from 'date-fns';

/**
 * Ensures the given dateString is in ISO 8601 format.
 * Example: '2024-11-22 12:34:56 UTC' -> '2024-11-22T12:34:56Z'
 */
export function ensureISO8601(dateString: string): string {
  let isoString = dateString.replace(' ', 'T');
  isoString = isoString.replace(' UTC', 'Z');
  return isoString;
}

/**
 * Formats a Date object to an ISO 8601 string.
 */
export function formatDateToISO(date: Date): string {
  return date.toISOString();
}

/**
 * Computes indices in the timeSeries array that are at specified hourly intervals.
 */
export function getArrowIndices(
  timeSeries: string[],
  intervalInHours: number,
): number[] {
  if (timeSeries.length === 0) return [];

  const arrowIndices: number[] = [];
  const baseDate = parseISO(ensureISO8601(timeSeries[0]));

  timeSeries.forEach((timestamp, index) => {
    const currentDate = parseISO(ensureISO8601(timestamp));
    if (isNaN(currentDate.getTime())) return;

    const diffInMs = currentDate.getTime() - baseDate.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));

    if (diffInHours % intervalInHours === 0) {
      arrowIndices.push(index);
    }
  });

  // Ensure first and last data points are included
  if (!arrowIndices.includes(0)) arrowIndices.unshift(0);
  if (!arrowIndices.includes(timeSeries.length - 1)) {
    arrowIndices.push(timeSeries.length - 1);
  }

  return arrowIndices;
}

/**
 * Adjusts wind direction for meteorological conventions.
 */
export function adjustWindDirection(deg: number): number {
  return (deg + 180) % 360;
}

/**
 * Formats Y-axis values for charts.
 */
export function yaxisLabelFormatter(val: number | undefined): string {
  if (val === undefined || val === null || isNaN(val)) return '';
  return val.toFixed(2);
}
