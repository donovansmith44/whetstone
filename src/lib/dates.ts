export function todayInTimezone(tz: string, at: Date = new Date()): string {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" });
  return fmt.format(at);
}

export function isPastMidnight(entryDate: string, tz: string, at: Date = new Date()): boolean {
  return todayInTimezone(tz, at) > entryDate;
}
