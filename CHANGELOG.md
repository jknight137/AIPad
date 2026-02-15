# Changelog

All notable changes to AIPad will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-02-15

### Added

- **Dashboard** — greeting, quick stats, inbox preview, pomodoro quick-start, navigation shortcuts.
- **Notes editor** — TipTap-powered rich text with code blocks (lowlight), task lists, links, auto-save.
- **Encrypted vault** — AES-256-GCM secrets manager with PBKDF2 key derivation and auto-lock.
- **Built-in terminal** — PTY-backed shell (PowerShell on Windows) with xterm.js and AI chat panel.
- **Todos / GTD** — quick capture, inbox/active/completed tabs, priority and status management.
- **Eisenhower matrix** — drag-and-drop 2×2 quadrant grid for urgent/important prioritization.
- **Calendar & time-blocking** — month grid, day detail, event and time block CRUD with modals.
- **Analytics** — Pareto analysis, priority breakdown, time distribution, recent pomodoro sessions.
- **Cognitive Dump** — free-text brain dump → LLM processing → structured todos, events, and notes.
- **Settings** — theme picker (7 themes), Ollama endpoint config, model selection, pomodoro tuning.
- **Theme system** — 7 full themes: Dark, Neon, Retro, Arcade, Cyberpunk, Matrix, Synthwave.
- **Ollama integration** — runtime model picker, streaming chat, tool calling, health check.
- **SQLite persistence** — auto-migrating schema for notes, todos, projects, events, time blocks, sessions.
- **Keyboard shortcuts** — Ctrl+1–9 view switching, Ctrl+, for settings.
- **Desktop packaging** — Tauri 2 bundles for Windows (EXE, MSI, NSIS installer).
