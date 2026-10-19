// ================================================================
// DULCE ARTE ERP — Database Layer (SQLite via better-sqlite3)
// WAL mode + Synchronous FULL + Anti-power-outage measures
// ================================================================

// NOTE: In Tauri context this will use tauri-plugin-sql.
// For Electron or dev mode we use better-sqlite3 via window.__db.
// The interface is the same: { execute, select, selectOne }

import type { AppSettings, RawMaterial, Recipe, RecipeItem,
  Customer, Invoice, InvoiceItem, CustomerIntention } from '../types';

// ── DB Singleton ───────────────────────────────────────────────
let _db: ReturnType<typeof createDbAdapter> | null = null;

export function getDb() {
  if (!_db) throw new Error('DB not initialized. Call initDb() first.');
  return _db;
}

export async function initDb(): Promise<void> {
  _db = createDbAdapter();
  await _db.migrate();
  _db.configurePragmas();
}

// ── Adapter (abstracts better-sqlite3 / Tauri SQL) ─────────────
function createDbAdapter() {
  // We expose a unified async interface so swapping backends is trivial
  const Database = (window as any).__betterSqlite3;

  const db = Database
    ? new Database(':memory:')  // placeholder; real path set by Tauri/Electron shell
    : null;

  function configurePragmas() {
    if (!db) return;
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = FULL');
    db.pragma('foreign_keys = ON');
    db.pragma('cache_size = -8000'); // 8MB cache
  }

  async function migrate() {
    if (!db) return; // browser/dev mode: handled by mock store
    const schema = await fetch('/migrations/001_init.sql').then(r => r.text());
    db.exec(schema);
  }

  function execute(sql: string, params: unknown[] = []): void {
    if (!db) { console.warn('[DB] execute (no-op dev mode)', sql); return; }
    db.prepare(sql).run(...params);
  }

  function select<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T[] {
    if (!db) return [];
    return db.prepare(sql).all(...params) as T[];
  }

  function selectOne<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T | undefined {
    if (!db) return undefined;
    return db.prepare(sql).get(...params) as T | undefined;
  }

  function transaction<T>(fn: () => T): T {
    if (!db) return fn();
    return db.transaction(fn)();
  }

  return { configurePragmas, migrate, execute, select, selectOne, transaction };
}

// ── Auto-save Draft (anti-power-outage) ───────────────────────
let _draftTimer: ReturnType<typeof setTimeout> | null = null;

export function saveDraft(moduleKey: string, data: unknown) {
  if (_draftTimer) clearTimeout(_draftTimer);
  _draftTimer = setTimeout(() => {
    try {
      const db = getDb();
      db.execute(
        `INSERT INTO systemDrafts (moduleKey, draftJson, updatedAt)
         VALUES (?, ?, datetime('now'))
         ON CONFLICT(moduleKey) DO UPDATE SET draftJson=excluded.draftJson, updatedAt=excluded.updatedAt`,
        [moduleKey, JSON.stringify(data)]
      );
    } catch { /* silent in dev */ }
  }, 300); // 300ms debounce per SRS spec
}

export function loadDraft<T>(moduleKey: string): T | null {
  try {
    const db = getDb();
    const row = db.selectOne<{ draftJson: string }>(
      'SELECT draftJson FROM systemDrafts WHERE moduleKey = ?', [moduleKey]
    );
    return row ? JSON.parse(row.draftJson) as T : null;
  } catch { return null; }
}

// ── Settings ───────────────────────────────────────────────────
export const settingsRepo = {
  get(): AppSettings | null {
    return getDb().selectOne<AppSettings>('SELECT * FROM appSettings WHERE id = 1') ?? null;
  },
  save(data: Partial<AppSettings>) {
    const keys = Object.keys(data).filter(k => k !== 'id');
    const sets = keys.map(k => `${k} = ?`).join(', ');
    const vals = keys.map(k => (data as Record<string, unknown>)[k]);
    getDb().execute(
      `UPDATE appSettings SET ${sets}, updatedAt = datetime('now') WHERE id = 1`,
      vals
    );
  }
};

// ── Raw Materials ──────────────────────────────────────────────
export const materialsRepo = {
  getAll(): RawMaterial[] {
    return getDb().select<RawMaterial>('SELECT * FROM rawMaterials ORDER BY type, name');
  },
  getById(id: number): RawMaterial | undefined {
    return getDb().selectOne<RawMaterial>('SELECT * FROM rawMaterials WHERE id = ?', [id]);
  },
  create(m: Omit<RawMaterial, 'id' | 'createdAt' | 'updatedAt'>): number {
    getDb().execute(
      `INSERT INTO rawMaterials (name,type,unit,stockMg,minStock,costPerUnit,buyUnit,buyQtyMg)
       VALUES (?,?,?,?,?,?,?,?)`,
      [m.name, m.type, m.unit, m.stockMg, m.minStock, m.costPerUnit, m.buyUnit, m.buyQtyMg]
    );
    const row = getDb().selectOne<{ id: number }>('SELECT last_insert_rowid() as id');
    return row?.id ?? 0;
  },
  update(id: number, m: Partial<RawMaterial>): void {
    const keys = Object.keys(m).filter(k => !['id','createdAt','updatedAt'].includes(k));
    const sets = keys.map(k => `${k} = ?`).join(', ');
    const vals = [...keys.map(k => (m as Record<string, unknown>)[k]), id];
    getDb().execute(`UPDATE rawMaterials SET ${sets}, updatedAt=datetime('now') WHERE id=?`, vals);
  },
  decrementStock(id: number, mg: number): void {
    getDb().execute('UPDATE rawMaterials SET stockMg = stockMg - ? WHERE id = ?', [mg, id]);
  }
};

// ── Recipes ────────────────────────────────────────────────────
export const recipesRepo = {
  getAll(): Recipe[] {
    return getDb().select<Recipe>('SELECT * FROM recipes WHERE isArchived=0 ORDER BY name');
  },
  getById(id: number): Recipe | undefined {
    return getDb().selectOne<Recipe>('SELECT * FROM recipes WHERE id = ?', [id]);
  },
  getItemsByRecipeId(recipeId: number): RecipeItem[] {
    return getDb().select<RecipeItem>(
      `SELECT ri.*, rm.name as materialName
       FROM recipeItems ri
       JOIN rawMaterials rm ON rm.id = ri.materialId
       WHERE ri.recipeId = ?
       ORDER BY ri.sortOrder`, [recipeId]
    );
  },
  create(r: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt' | 'items' | 'costs' | 'prices'>): number {
    getDb().execute(
      `INSERT INTO recipes (name,description,batchWeightG,coldWastePct,thermalWastePct,
        laborCostMin,ovenCostMin,priceMode,fixedPrice,competitorPrice,roundingMode)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [r.name,r.description,r.batchWeightG,r.coldWastePct,r.thermalWastePct,
       r.laborCostMin,r.ovenCostMin,r.priceMode,r.fixedPrice,r.competitorPrice,r.roundingMode]
    );
    return getDb().selectOne<{ id: number }>('SELECT last_insert_rowid() as id')?.id ?? 0;
  },
  saveItems(recipeId: number, items: Omit<RecipeItem,'id'|'recipeId'>[]): void {
    getDb().transaction(() => {
      getDb().execute('DELETE FROM recipeItems WHERE recipeId = ?', [recipeId]);
      items.forEach((item, i) => {
        getDb().execute(
          `INSERT INTO recipeItems (recipeId,materialId,pctValue,netWeightMg,isLocked,errorTolPct,sortOrder)
           VALUES (?,?,?,?,?,?,?)`,
          [recipeId, item.materialId, item.pctValue, item.netWeightMg, item.isLocked, item.errorTolPct, i]
        );
      });
    });
  }
};

// ── Customers ──────────────────────────────────────────────────
export const customersRepo = {
  getAll(): Customer[] {
    return getDb().select<Customer>('SELECT * FROM customers ORDER BY fullName');
  },
  getById(id: number): Customer | undefined {
    return getDb().selectOne<Customer>('SELECT * FROM customers WHERE id = ?', [id]);
  },
  create(c: Omit<Customer,'id'|'createdAt'|'updatedAt'|'totalDebt'|'solvencyStatus'>): number {
    getDb().execute(
      `INSERT INTO customers (cedulaRif,fullName,phoneWa,address,notes,defaultPriceMode)
       VALUES (?,?,?,?,?,?)`,
      [c.cedulaRif, c.fullName, c.phoneWa, c.address, c.notes, c.defaultPriceMode]
    );
    return getDb().selectOne<{ id: number }>('SELECT last_insert_rowid() as id')?.id ?? 0;
  },
  updateDebt(id: number, delta: number): void {
    getDb().execute('UPDATE customers SET totalDebt = totalDebt + ?, updatedAt=datetime(\'now\') WHERE id=?', [delta, id]);
  },
  addIntention(i: Omit<CustomerIntention,'id'|'createdAt'>): void {
    getDb().execute(
      `INSERT INTO customerIntentions (customerId,recipeId,recipeNameSnap,quotedPrice,priceMode,reasonNotBought)
       VALUES (?,?,?,?,?,?)`,
      [i.customerId, i.recipeId, i.recipeNameSnap, i.quotedPrice, i.priceMode, i.reasonNotBought]
    );
  }
};

// ── Invoices (Append-Only) ─────────────────────────────────────
export const invoicesRepo = {
  getAll(limit = 200): Invoice[] {
    return getDb().select<Invoice>(
      'SELECT * FROM invoicesAudit ORDER BY createdAt DESC LIMIT ?', [limit]
    );
  },
  getByCustomer(customerId: number): Invoice[] {
    return getDb().select<Invoice>(
      'SELECT * FROM invoicesAudit WHERE customerId=? ORDER BY createdAt DESC', [customerId]
    );
  },
  nextSerial(): string {
    const year = new Date().getFullYear();
    const row = getDb().selectOne<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM invoicesAudit WHERE serialCode LIKE 'DA-${year}-%'`
    );
    const n = (row?.cnt ?? 0) + 1;
    return `DA-${year}-${String(n).padStart(5, '0')}`;
  },
  create(inv: Omit<Invoice,'id'|'items'>, items: Omit<InvoiceItem,'id'|'invoiceId'>[]): number {
    return getDb().transaction(() => {
      getDb().execute(
        `INSERT INTO invoicesAudit (serialCode,customerId,customerSnap,exitType,total,paid,dueDate,notes,sha256)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [inv.serialCode, inv.customerId, inv.customerSnap, inv.exitType,
         inv.total, inv.paid, inv.dueDate, inv.notes, inv.sha256]
      );
      const invId = getDb().selectOne<{ id: number }>('SELECT last_insert_rowid() as id')?.id ?? 0;
      items.forEach(item => {
        getDb().execute(
          `INSERT INTO invoiceItems (invoiceId,recipeId,recipeNameSnap,qty,unitPriceCharged,unitBaseCostSnapshot)
           VALUES (?,?,?,?,?,?)`,
          [invId, item.recipeId, item.recipeNameSnap, item.qty, item.unitPriceCharged, item.unitBaseCostSnapshot]
        );
      });
      return invId;
    });
  }
};
