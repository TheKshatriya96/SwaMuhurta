import initSqlJs from "sql.js";
import wasmUrl from "sql.js/dist/sql-wasm.wasm?url";


const STORE_NAME = "files";
const DATABASE_KEY = "rules.db";
const INDEXED_DB_NAME = "swa-muhurta-rules";

let sqlPromise;

function getSql() {
  if (!sqlPromise) {
    sqlPromise = initSqlJs({ locateFile: () => wasmUrl });
  }
  return sqlPromise;
}

function openStore() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(INDEXED_DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

async function readStoredDatabase() {
  const store = await openStore();
  return new Promise((resolve, reject) => {
    const transaction = store.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(DATABASE_KEY);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result ? new Uint8Array(request.result) : null);
    transaction.oncomplete = () => store.close();
  });
}

async function writeStoredDatabase(bytes) {
  const store = await openStore();
  return new Promise((resolve, reject) => {
    const transaction = store.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(bytes.buffer.slice(0), DATABASE_KEY);
    transaction.onerror = () => reject(transaction.error);
    transaction.oncomplete = () => {
      store.close();
      resolve();
    };
  });
}

async function deleteStoredDatabase() {
  const store = await openStore();
  return new Promise((resolve, reject) => {
    const transaction = store.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(DATABASE_KEY);
    transaction.onerror = () => reject(transaction.error);
    transaction.oncomplete = () => {
      store.close();
      resolve();
    };
  });
}

function queryRows(db, sql, params = []) {
  const statement = db.prepare(sql);
  const rows = [];
  try {
    statement.bind(params);
    while (statement.step()) rows.push(statement.getAsObject());
  } finally {
    statement.free();
  }
  return rows;
}

function parseJson(value, fallback = null) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function databaseToBundle(bytes) {
  return getSql().then((SQL) => {
    const db = new SQL.Database(bytes);
    try {
      const tables = queryRows(db, "SELECT name FROM sqlite_master WHERE type='table'").map((row) => row.name);
      for (const required of ["metadata", "settings", "categories", "rules"]) {
        if (!tables.includes(required)) throw new Error(`rules.db is missing table: ${required}`);
      }
      const metadata = Object.fromEntries(queryRows(db, "SELECT key, value FROM metadata").map((row) => [row.key, row.value]));
      const settings = queryRows(db, "SELECT key, value_json, description FROM settings ORDER BY key").map((row) => ({
        key: row.key,
        value: parseJson(row.value_json, row.value_json),
        description: row.description,
      }));
      const categories = queryRows(db, "SELECT * FROM categories ORDER BY priority, id").map((row) => ({
        ...row,
        priority: Number(row.priority),
        primary_threshold: Number(row.primary_threshold),
        is_positive: Boolean(row.is_positive),
        enabled: Boolean(row.enabled),
      }));
      const rules = queryRows(db, "SELECT * FROM rules ORDER BY category_id, sort_order, id").map((row) => ({
        ...row,
        points: Number(row.points),
        enabled: Boolean(row.enabled),
        sort_order: Number(row.sort_order),
        conditions: parseJson(row.conditions_json, {}),
      }));
      return { metadata, settings, categories, rules };
    } finally {
      db.close();
    }
  });
}

async function bundleToDatabase(bundle) {
  const SQL = await getSql();
  const db = new SQL.Database();
  try {
    db.run(`
      PRAGMA journal_mode=DELETE;
      CREATE TABLE metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE settings (key TEXT PRIMARY KEY, value_json TEXT NOT NULL, description TEXT NOT NULL DEFAULT '');
      CREATE TABLE categories (
        id TEXT PRIMARY KEY, label TEXT NOT NULL, short_code TEXT NOT NULL,
        color TEXT NOT NULL, line_style TEXT NOT NULL, priority INTEGER NOT NULL,
        primary_threshold INTEGER NOT NULL, is_positive INTEGER NOT NULL,
        primary_state TEXT NOT NULL, reason_text TEXT NOT NULL,
        best_actions TEXT NOT NULL, avoid_actions TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1
      );
      CREATE TABLE rules (
        id TEXT PRIMARY KEY, category_id TEXT NOT NULL REFERENCES categories(id),
        label TEXT NOT NULL, points INTEGER NOT NULL, enabled INTEGER NOT NULL DEFAULT 1,
        conditions_json TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
        sort_order INTEGER NOT NULL
      );
      CREATE INDEX idx_rules_category ON rules(category_id, sort_order);
    `);
    const metadata = { ...bundle.metadata, updated_at: new Date().toISOString() };
    Object.entries(metadata).forEach(([key, value]) => db.run("INSERT INTO metadata (key, value) VALUES (?, ?)", [key, String(value)]));
    bundle.settings.forEach((setting) => db.run(
      "INSERT INTO settings (key, value_json, description) VALUES (?, ?, ?)",
      [setting.key, JSON.stringify(setting.value), setting.description || ""],
    ));
    bundle.categories.forEach((category) => db.run(
      `INSERT INTO categories (
        id, label, short_code, color, line_style, priority, primary_threshold,
        is_positive, primary_state, reason_text, best_actions, avoid_actions, enabled
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        category.id, category.label, category.short_code, category.color, category.line_style,
        Number(category.priority), Number(category.primary_threshold), category.is_positive ? 1 : 0,
        category.primary_state, category.reason_text, category.best_actions, category.avoid_actions,
        category.enabled ? 1 : 0,
      ],
    ));
    bundle.rules.forEach((rule) => db.run(
      `INSERT INTO rules (
        id, category_id, label, points, enabled, conditions_json, description, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        rule.id, rule.category_id, rule.label, Number(rule.points), rule.enabled ? 1 : 0,
        JSON.stringify(rule.conditions || {}), rule.description || "", Number(rule.sort_order),
      ],
    ));
    return db.export();
  } finally {
    db.close();
  }
}

async function fetchHostedDatabase() {
  const url = `${import.meta.env.BASE_URL}data/rules.db?v=${Date.now()}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`rules.db returned ${response.status} ${response.statusText}`);
  return new Uint8Array(await response.arrayBuffer());
}

export async function loadRulesDatabase() {
  const stored = await readStoredDatabase();
  const bytes = stored || await fetchHostedDatabase();
  return {
    bundle: await databaseToBundle(bytes),
    source: stored ? "browser rules.db" : "hosted baseline rules.db",
  };
}

export async function saveRulesDatabase(bundle) {
  const bytes = await bundleToDatabase(bundle);
  await writeStoredDatabase(bytes);
  return bytes;
}

export async function resetRulesDatabase() {
  await deleteStoredDatabase();
  const bytes = await fetchHostedDatabase();
  return { bundle: await databaseToBundle(bytes), source: "hosted baseline rules.db" };
}

export async function importRulesDatabase(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const bundle = await databaseToBundle(bytes);
  await writeStoredDatabase(bytes);
  return { bundle, source: `imported ${file.name}` };
}

export async function downloadRulesDatabase(bundle) {
  const bytes = await bundleToDatabase(bundle);
  const blob = new Blob([bytes], { type: "application/vnd.sqlite3" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "rules.db";
  anchor.click();
  URL.revokeObjectURL(url);
}
