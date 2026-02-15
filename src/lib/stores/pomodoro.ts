// ── Pomodoro Store ──────────────────────────────────────────────────

import { writable, derived } from "svelte/store";
import { v4 as uuid } from "uuid";
import { execute } from "../services/db";

export type PomodoroPhase = "work" | "short_break" | "long_break" | "idle";

interface PomodoroState {
  phase: PomodoroPhase;
  timeRemaining: number; // seconds
  totalTime: number;
  cycle: number; // current cycle (1-4)
  isRunning: boolean;
  linkedTodoId: string | null;
  sessionId: string | null;
}

export let POMODORO_DEFAULTS = {
  work: 25 * 60,
  short_break: 5 * 60,
  long_break: 15 * 60,
  cycles_before_long: 4,
};

const initial: PomodoroState = {
  phase: "idle",
  timeRemaining: POMODORO_DEFAULTS.work,
  totalTime: POMODORO_DEFAULTS.work,
  cycle: 1,
  isRunning: false,
  linkedTodoId: null,
  sessionId: null,
};

export const pomodoro = writable<PomodoroState>(initial);

let interval: ReturnType<typeof setInterval> | null = null;

export const pomodoroDisplay = derived(pomodoro, ($p) => {
  const mins = Math.floor($p.timeRemaining / 60);
  const secs = $p.timeRemaining % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
});

export const pomodoroProgress = derived(pomodoro, ($p) =>
  $p.totalTime > 0
    ? (($p.totalTime - $p.timeRemaining) / $p.totalTime) * 100
    : 0,
);

export function startPomodoro(todoId: string | null = null) {
  const sessionId = uuid();
  pomodoro.update((p) => ({
    ...p,
    phase: "work",
    timeRemaining: POMODORO_DEFAULTS.work,
    totalTime: POMODORO_DEFAULTS.work,
    isRunning: true,
    linkedTodoId: todoId,
    sessionId,
  }));

  execute("INSERT INTO pomodoro_sessions (id, todo_id) VALUES ($1, $2)", [
    sessionId,
    todoId,
  ]);

  if (interval) clearInterval(interval);
  interval = setInterval(() => tick(), 1000);
}

function tick() {
  pomodoro.update((p) => {
    if (!p.isRunning || p.timeRemaining <= 0) return p;
    const remaining = p.timeRemaining - 1;
    if (remaining <= 0) {
      handlePhaseEnd(p);
      return p; // State updated in handlePhaseEnd
    }
    return { ...p, timeRemaining: remaining };
  });
}

async function handlePhaseEnd(state: PomodoroState) {
  // Log completion
  if (state.phase === "work" && state.sessionId) {
    await execute(
      `UPDATE pomodoro_sessions SET ended_at = datetime('now'), completed = 1 WHERE id = $1`,
      [state.sessionId],
    );
  }

  // Notify
  try {
    const { sendNotification } =
      await import("@tauri-apps/plugin-notification");
    const msg =
      state.phase === "work"
        ? "⏰ Work session complete! Take a break."
        : "🟢 Break over! Ready to focus?";
    sendNotification({ title: "AIPad Pomodoro", body: msg });
  } catch {
    /* notifications may not be available */
  }

  // Transition
  if (state.phase === "work") {
    const isLongBreak = state.cycle >= POMODORO_DEFAULTS.cycles_before_long;
    const nextPhase = isLongBreak ? "long_break" : "short_break";
    const nextTime = isLongBreak
      ? POMODORO_DEFAULTS.long_break
      : POMODORO_DEFAULTS.short_break;
    pomodoro.set({
      ...state,
      phase: nextPhase,
      timeRemaining: nextTime,
      totalTime: nextTime,
      cycle: isLongBreak ? 1 : state.cycle + 1,
    });
  } else {
    // After break, start next work session
    startPomodoro(state.linkedTodoId);
  }
}

export function pausePomodoro() {
  if (interval) clearInterval(interval);
  pomodoro.update((p) => ({ ...p, isRunning: false }));
}

export function resumePomodoro() {
  pomodoro.update((p) => ({ ...p, isRunning: true }));
  if (interval) clearInterval(interval);
  interval = setInterval(() => tick(), 1000);
}

export function resetPomodoro() {
  if (interval) clearInterval(interval);
  pomodoro.set(initial);
}

export function updatePomodoroSettings(settings: {
  workDuration?: number;
  shortBreakDuration?: number;
  longBreakDuration?: number;
}) {
  if (settings.workDuration) POMODORO_DEFAULTS.work = settings.workDuration;
  if (settings.shortBreakDuration)
    POMODORO_DEFAULTS.short_break = settings.shortBreakDuration;
  if (settings.longBreakDuration)
    POMODORO_DEFAULTS.long_break = settings.longBreakDuration;
  // Reset timer with new defaults if idle
  pomodoro.update((p) =>
    p.phase === "idle"
      ? {
          ...p,
          timeRemaining: POMODORO_DEFAULTS.work,
          totalTime: POMODORO_DEFAULTS.work,
        }
      : p,
  );
}

// Combined store alias
export const pomodoroStore = derived(pomodoro, ($p) => ({
  ...$p,
  workDuration: POMODORO_DEFAULTS.work,
  shortBreakDuration: POMODORO_DEFAULTS.short_break,
  longBreakDuration: POMODORO_DEFAULTS.long_break,
}));
