// ── Database Service ─────────────────────────────────────────────────
// SQLite via Tauri SQL plugin — schema init, migrations, queries

import Database from "@tauri-apps/plugin-sql";

let db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (!db) {
    db = await Database.load("sqlite:aipad.db");
    await runMigrations(db);
  }
  return db;
}

async function runMigrations(database: Database) {
  await database.execute(`
    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      parent_id TEXT,
      icon TEXT DEFAULT '📁',
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY (parent_id) REFERENCES folders(id)
    )
  `);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT 'Untitled',
      content_json TEXT DEFAULT '{}',
      content_text TEXT DEFAULT '',
      folder_id TEXT,
      tags TEXT DEFAULT '[]',
      pinned INTEGER DEFAULT 0,
      encrypted INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (folder_id) REFERENCES folders(id)
    )
  `);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      status TEXT DEFAULT 'active' CHECK(status IN ('active','completed','archived')),
      color TEXT DEFAULT '#58a6ff',
      sort_order INTEGER DEFAULT 0
    )
  `);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS todos (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      description TEXT DEFAULT '',
      priority TEXT DEFAULT 'p3' CHECK(priority IN ('p1','p2','p3','p4')),
      eisenhower TEXT DEFAULT 'schedule' CHECK(eisenhower IN ('do','schedule','delegate','eliminate')),
      status TEXT DEFAULT 'inbox' CHECK(status IN ('inbox','next','waiting','someday','done')),
      due_date TEXT,
      project_id TEXT,
      context_tags TEXT DEFAULT '[]',
      estimated_minutes INTEGER,
      actual_minutes INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS time_blocks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      start_dt TEXT NOT NULL,
      end_dt TEXT NOT NULL,
      todo_id TEXT,
      category TEXT DEFAULT 'deep_work',
      color TEXT DEFAULT '#58a6ff',
      FOREIGN KEY (todo_id) REFERENCES todos(id)
    )
  `);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS pomodoro_sessions (
      id TEXT PRIMARY KEY,
      todo_id TEXT,
      started_at TEXT DEFAULT (datetime('now')),
      ended_at TEXT,
      completed INTEGER DEFAULT 0,
      interruptions INTEGER DEFAULT 0,
      FOREIGN KEY (todo_id) REFERENCES todos(id)
    )
  `);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      start_dt TEXT NOT NULL,
      end_dt TEXT,
      recurrence TEXT,
      all_day INTEGER DEFAULT 0,
      color TEXT DEFAULT '#58a6ff',
      external_id TEXT
    )
  `);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS time_logs (
      id TEXT PRIMARY KEY,
      todo_id TEXT,
      project_id TEXT,
      started_at TEXT DEFAULT (datetime('now')),
      ended_at TEXT,
      notes TEXT DEFAULT '',
      FOREIGN KEY (todo_id) REFERENCES todos(id),
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS vault_meta (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT DEFAULT 'custom',
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
}

// ── Generic CRUD helpers ────────────────────────────────────────────

export async function query<T>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const database = await getDb();
  return database.select<T[]>(sql, params);
}

export async function execute(sql: string, params: unknown[] = []) {
  const database = await getDb();
  return database.execute(sql, params);
}
