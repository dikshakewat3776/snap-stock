import * as SQLite from "expo-sqlite";

let db: SQLite.SQLiteDatabase | null = null;

export async function getDb() {
  // Reuse one DB instance app-wide to avoid duplicate open handles.
  if (!db) {
    db = await SQLite.openDatabaseAsync("smart_inventory.db");
  }
  return db;
}

export async function initDb() {
  const database = await getDb();
  // This SQL block is the single source of truth for local offline storage.
  // If app data looks wrong, verify table columns here first.
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS inventory_items (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      brand TEXT NOT NULL,
      sku TEXT,
      barcode TEXT,
      current_stock INTEGER NOT NULL DEFAULT 0,
      threshold INTEGER NOT NULL DEFAULT 5,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS stock_corrections (
      id TEXT PRIMARY KEY NOT NULL,
      product_id TEXT NOT NULL,
      old_stock INTEGER NOT NULL,
      new_stock INTEGER NOT NULL,
      reason TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY NOT NULL,
      entity TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      action TEXT NOT NULL,
      payload TEXT NOT NULL,
      status TEXT NOT NULL,
      retry_count INTEGER NOT NULL DEFAULT 0,
      next_retry_at TEXT,
      conflict_reason TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}
