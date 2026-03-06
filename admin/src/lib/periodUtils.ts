/**
 * Period utilities for recurring missions.
 * Computes current period boundaries based on routineType (daily/weekly/monthly).
 */

export interface PeriodBounds {
  start: number; // epoch ms
  end: number;   // epoch ms
}

/**
 * Returns the start and end timestamps for the current period.
 * - daily: midnight today → midnight tomorrow
 * - weekly: Monday 00:00 → next Monday 00:00
 * - monthly: 1st of month 00:00 → 1st of next month 00:00
 * - once: returns { start: 0, end: Infinity } (no filtering)
 */
export function getCurrentPeriodBounds(routineType: string): PeriodBounds {
  const now = new Date();

  if (routineType === 'daily') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const end = start + 24 * 60 * 60 * 1000;
    return { start, end };
  }

  if (routineType === 'weekly') {
    const day = now.getDay();
    const diff = day === 0 ? 6 : day - 1; // Monday = 0
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff).getTime();
    const end = start + 7 * 24 * 60 * 60 * 1000;
    return { start, end };
  }

  if (routineType === 'monthly') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
    return { start, end };
  }

  // 'once' — no period filtering
  return { start: 0, end: Infinity };
}

/**
 * Returns a human-readable label for the current period.
 */
export function getPeriodLabel(routineType: string): string {
  if (routineType === 'daily') return "Today's Progress";
  if (routineType === 'weekly') return "This Week's Progress";
  if (routineType === 'monthly') return "This Month's Progress";
  return 'Total Progress';
}

/**
 * Returns how much time is left until the current period resets.
 */
export function getTimeUntilReset(routineType: string): string {
  if (routineType === 'once') return '';

  const { end } = getCurrentPeriodBounds(routineType);
  const now = Date.now();
  const diff = end - now;

  if (diff <= 0) return 'Resetting...';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `Resets in ${days}d ${remainingHours}h`;
  }

  return `Resets in ${hours}h ${minutes}m`;
}

/**
 * Returns historical period bounds going back from the current period.
 * Only returns periods that started after `createdAt`.
 */
export function getHistoricalPeriods(
  routineType: string,
  createdAt: number,
  maxPeriods: number = 7
): { label: string; bounds: PeriodBounds }[] {
  if (routineType === 'once') return [];

  const periods: { label: string; bounds: PeriodBounds }[] = [];
  const now = new Date();

  for (let i = 1; i <= maxPeriods; i++) {
    let start: number, end: number, label: string;

    if (routineType === 'daily') {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      start = d.getTime();
      end = start + 24 * 60 * 60 * 1000;
      // Label
      if (i === 1) label = 'Yesterday';
      else if (i === 2) label = '2 days ago';
      else label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else if (routineType === 'weekly') {
      const day = now.getDay();
      const diff = day === 0 ? 6 : day - 1;
      const thisMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
      const d = new Date(thisMonday.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      start = d.getTime();
      end = start + 7 * 24 * 60 * 60 * 1000;
      if (i === 1) label = 'Last week';
      else label = `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} week`;
    } else {
      // monthly
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      start = d.getTime();
      end = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
      label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }

    if (start < createdAt) break; // Don't go before mission was created
    periods.push({ label, bounds: { start, end } });
  }

  return periods;
}

/**
 * Filters runs to only include those within a given period.
 */
export function filterRunsByPeriod(
  runs: any[],
  missionId: string,
  bounds: PeriodBounds
): any[] {
  return runs.filter(
    (r) => r.missionId === missionId && r.timestamp >= bounds.start && r.timestamp < bounds.end
  );
}
