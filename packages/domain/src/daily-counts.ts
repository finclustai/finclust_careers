const DAY_MS = 86_400_000;

// en-CA formats as YYYY-MM-DD, which sorts and compares as plain strings.
const IST_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" });

/**
 * Applications per calendar day in India for the last `days` days, oldest
 * first, today last. Days with nothing still appear, so a chart has no gaps.
 */
export function dailyCounts(dates: Date[], days: number, now = new Date()) {
  const buckets = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    buckets.set(IST_DAY.format(new Date(now.getTime() - i * DAY_MS)), 0);
  }
  for (const date of dates) {
    const key = IST_DAY.format(date);
    const count = buckets.get(key);
    if (count !== undefined) buckets.set(key, count + 1);
  }
  return [...buckets].map(([date, count]) => ({ date, count }));
}
