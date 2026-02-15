// ── Navigation Store ────────────────────────────────────────────────

import { writable } from "svelte/store";
import type { ViewName } from "../types";

export const activeView = writable<ViewName>("dashboard");
export const sidebarExpanded = writable(false);
