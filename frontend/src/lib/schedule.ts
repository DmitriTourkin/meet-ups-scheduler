import type { ProjectAvailabilityEntry, ProjectAvailabilityStatus } from "@/lib/types";

export const DISPLAY_HOUR_START = 7;
export const DISPLAY_HOUR_END = 21; 
export const DISPLAY_HOURS = Array.from(
  { length: DISPLAY_HOUR_END - DISPLAY_HOUR_START },
  (_, i) => DISPLAY_HOUR_START + i,
);

const DAY_LABELS = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];

export const WEEKDAY_HEADERS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export function startOfWeek(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diffToMonday);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function formatDayLabel(date: Date): string {
  const weekday = DAY_LABELS[date.getDay()];
  const day = date.getDate();
  const month = date.toLocaleDateString("ru-RU", { month: "short" }).replace(".", "");
  return `${weekday}, ${day} ${month}`;
}

export function hourCellRange(day: Date, hour: number): { start: Date; end: Date } {
  const start = new Date(day);
  start.setHours(hour, 0, 0, 0);
  const end = new Date(start);
  end.setHours(start.getHours() + 1);
  return { start, end };
}

export function parseHour(timeString: string): number {
  return Number(timeString.split(":")[0]);
}

export function isWithinWorkingHours(hour: number, workingHoursStart: string, workingHoursEnd: string): boolean {
  const start = parseHour(workingHoursStart);
  const end = parseHour(workingHoursEnd);
  return hour >= start && hour < end;
}

export function statusForHour(
  entries: ProjectAvailabilityEntry[],
  userId: string,
  day: Date,
  hour: number,
): ProjectAvailabilityStatus | "free" {
  const { start, end } = hourCellRange(day, hour);
  const match = entries.find(
    (entry) =>
      entry.user_id === userId &&
      new Date(entry.start_at) <= start &&
      new Date(entry.end_at) >= end,
  );
  return match?.status ?? "free";
}

export function entriesForHour(
  entries: ProjectAvailabilityEntry[],
  userId: string,
  day: Date,
  hour: number,
): ProjectAvailabilityEntry[] {
  const { start, end } = hourCellRange(day, hour);
  return entries.filter(
    (entry) =>
      entry.user_id === userId &&
      new Date(entry.start_at) < end &&
      new Date(entry.end_at) > start,
  );
}

export function nextStatus(current: ProjectAvailabilityStatus | "free"): ProjectAvailabilityStatus | "free" {
  if (current === "free") return "busy";
  if (current === "busy") return "tentative";
  return "free";
}

export function daysInRange(startDateOnly: string, endDateOnly: string): Date[] {
  const days: Date[] = [];
  let cursor = new Date(`${startDateOnly}T00:00:00`);
  const end = new Date(`${endDateOnly}T00:00:00`);
  while (cursor <= end) {
    days.push(new Date(cursor));
    cursor = addDays(cursor, 1);
  }
  return days;
}

export function dayStatus(
  entries: ProjectAvailabilityEntry[],
  userId: string,
  day: Date,
  workingHoursStart: string,
  workingHoursEnd: string,
): ProjectAvailabilityStatus | "free" {
  const hours = DISPLAY_HOURS.filter((hour) => isWithinWorkingHours(hour, workingHoursStart, workingHoursEnd));
  let sawTentative = false;
  let sawAvailable = false;
  for (const hour of hours) {
    const status = statusForHour(entries, userId, day, hour);
    if (status === "busy") return "busy";
    if (status === "tentative") sawTentative = true;
    if (status === "available") sawAvailable = true;
  }
  if (sawTentative) return "tentative";
  if (sawAvailable) return "available";
  return "free";
}

export function formatDayHeader(date: Date, showMonth: boolean): string {
  const day = date.getDate();
  if (!showMonth) return String(day);
  const month = date.toLocaleDateString("ru-RU", { month: "short" }).replace(".", "");
  return `${day} ${month}`;
}

export function weekdayShort(date: Date): string {
  return DAY_LABELS[date.getDay()];
}

export function weeksInRange(startDateOnly: string, endDateOnly: string): (Date | null)[][] {
  const days = daysInRange(startDateOnly, endDateOnly);
  if (days.length === 0) return [];

  const rangeStart = days[0];
  const rangeEnd = days[days.length - 1];
  const weeks: (Date | null)[][] = [];
  let cursor = startOfWeek(rangeStart);

  while (cursor <= rangeEnd) {
    const week: (Date | null)[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(cursor >= rangeStart && cursor <= rangeEnd ? new Date(cursor) : null);
      cursor = addDays(cursor, 1);
    }
    weeks.push(week);
  }
  return weeks;
}
