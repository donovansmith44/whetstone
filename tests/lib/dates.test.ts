import { describe, it, expect } from "vitest";
import { todayInTimezone, isPastMidnight } from "@/lib/dates";

describe("dates", () => {
  it("todayInTimezone returns YYYY-MM-DD for the given timezone", () => {
    const at = new Date("2026-05-22T03:30:00Z");
    expect(todayInTimezone("America/New_York", at)).toBe("2026-05-21");
    expect(todayInTimezone("UTC", at)).toBe("2026-05-22");
  });

  it("isPastMidnight returns true when 'at' is the next day in the tz", () => {
    const entryDate = "2026-05-21";
    const earlyNextDay = new Date("2026-05-22T03:30:00Z");
    expect(isPastMidnight(entryDate, "America/New_York", earlyNextDay)).toBe(false);
    const later = new Date("2026-05-22T05:00:00Z");
    expect(isPastMidnight(entryDate, "America/New_York", later)).toBe(true);
  });
});
