// ── Calendar Store ──────────────────────────────────────────────────

import { writable, derived } from "svelte/store";
import { v4 as uuid } from "uuid";
import { query, execute } from "../services/db";
import type { CalendarEvent, TimeBlock } from "../types";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameDay,
  parseISO,
} from "date-fns";

export const events = writable<CalendarEvent[]>([]);
export const timeBlocks = writable<TimeBlock[]>([]);
export const selectedDate = writable<Date>(new Date());
export const calendarView = writable<"month" | "week" | "day">("month");

export const currentMonthDays = derived(selectedDate, ($date) => {
  const start = startOfWeek(startOfMonth($date));
  const end = endOfWeek(endOfMonth($date));
  return eachDayOfInterval({ start, end });
});

export const eventsForSelectedDate = derived(
  [events, selectedDate],
  ([$events, $date]) =>
    $events.filter((e) => isSameDay(parseISO(e.start_dt), $date)),
);

export async function loadEvents() {
  const rows = await query<CalendarEvent>(
    "SELECT * FROM events ORDER BY start_dt",
  );
  events.set(rows.map((r) => ({ ...r, all_day: !!r.all_day })));
}

export async function loadTimeBlocks() {
  const rows = await query<TimeBlock>(
    "SELECT * FROM time_blocks ORDER BY start_dt",
  );
  timeBlocks.set(rows);
}

export async function createEvent(
  event: Omit<CalendarEvent, "id">,
): Promise<string> {
  const id = uuid();
  await execute(
    `INSERT INTO events (id, title, description, start_dt, end_dt, recurrence, all_day, color)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      id,
      event.title,
      event.description || "",
      event.start_dt,
      event.end_dt,
      event.recurrence,
      event.all_day ? 1 : 0,
      event.color || "#58a6ff",
    ],
  );
  await loadEvents();
  return id;
}

export async function updateEvent(id: string, updates: Partial<CalendarEvent>) {
  const sets: string[] = [];
  const params: unknown[] = [];
  let idx = 1;
  for (const [key, value] of Object.entries(updates)) {
    if (key === "id") continue;
    sets.push(`${key} = $${idx++}`);
    params.push(key === "all_day" ? (value ? 1 : 0) : value);
  }
  if (!sets.length) return;
  params.push(id);
  await execute(
    `UPDATE events SET ${sets.join(", ")} WHERE id = $${idx}`,
    params,
  );
  await loadEvents();
}

export async function deleteEvent(id: string) {
  await execute("DELETE FROM events WHERE id = $1", [id]);
  events.update((es) => es.filter((e) => e.id !== id));
}

export async function createTimeBlock(
  block: Omit<TimeBlock, "id">,
): Promise<string> {
  const id = uuid();
  await execute(
    `INSERT INTO time_blocks (id, title, start_dt, end_dt, todo_id, category, color)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      id,
      block.title,
      block.start_dt,
      block.end_dt,
      block.todo_id,
      block.category || "deep_work",
      block.color || "#58a6ff",
    ],
  );
  await loadTimeBlocks();
  return id;
}

export async function deleteTimeBlock(id: string) {
  await execute("DELETE FROM time_blocks WHERE id = $1", [id]);
  timeBlocks.update((bs) => bs.filter((b) => b.id !== id));
}

// Convenience helpers
export const currentMonth = writable<Date>(new Date());
export const setSelectedDate = (d: Date) => selectedDate.set(d);
export const setCalendarView = (v: "month" | "week" | "day") =>
  calendarView.set(v);

// Combined store for reactive access
export const calendarStore = derived(
  [events, timeBlocks, selectedDate, calendarView, currentMonth],
  ([$events, $timeBlocks, $selectedDate, $view, $currentMonth]) => ({
    events: $events,
    timeBlocks: $timeBlocks,
    selectedDate: $selectedDate,
    view: $view,
    currentMonth: $currentMonth,
  }),
);

// Aliases for component compatibility
export const addEvent = createEvent;
export const addTimeBlock = createTimeBlock;
