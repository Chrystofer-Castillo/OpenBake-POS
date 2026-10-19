-- ============================================================
-- Dulce Arte ERP — Migration 001: Schema inicial (9 tablas)
-- SQLite WAL mode + Synchronous FULL configured at runtime
-- ============================================================

PRAGMA foreign_keys = ON;

-- 1. Configuración global (Marca Blanca)
CREATE TABLE IF NOT EXISTS appSettings (
  id              INTEGER PRIMARY KEY CHECK (id = 1),
  businessName    TEXT    NOT NULL DEFAULT 'Dulce Arte',
  logoPath        TEXT,
  rif             TEXT,
  phone           TEXT,
  address         TEXT,
  country         TEXT    NOT NULL DEFAULT 'Venezuela',
  state           TEXT    NOT NULL DEFAULT 'Zulia',
  city            TEXT    NOT NULL DEFAULT 'Cabimas',
  zoneType        TEXT    NOT NULL DEFAULT 'Comercial',
  waTemplate      TEXT    NOT NULL DEFAULT '¡Hola {nombreCliente}! Le habla {nombreNegocio}. Tiene un saldo pendiente de {saldoPendiente} que vence el {fechaLimite}.',
  taxPct          REAL    NOT NULL DEFAULT 16.0,
  cogsPct         REAL    NOT NULL DEFAULT 30.0,
  opexPct         REAL    NOT NULL DEFAULT 18.0,
  ownerSalaryPct  REAL    NOT NULL DEFAULT 20.0,
  reinvestPct     REAL    NOT NULL DEFAULT 8.0,
  netProfitPct    REAL    NOT NULL DEFAULT 8.0,
  wholesalePct    REAL    NOT NULL DEFAULT 15.0,
  updatedAt       TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Insertar fila única de configuración
INSERT OR IGNORE INTO appSettings (id) VALUES (1);

-- 2. Borradores fantasma (anti-apagón, auto-save 300ms)
CREATE TABLE IF NOT EXISTS systemDrafts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  moduleKey   TEXT    NOT NULL UNIQUE,
  draftJson   TEXT    NOT NULL,
  updatedAt   TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- 3. Materias primas e insumos (stock en miligramos)
CREATE TABLE IF NOT EXISTS rawMaterials (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL,
  type        TEXT    NOT NULL CHECK (type IN ('INSUMO', 'EMPAQUE')),
  unit        TEXT    NOT NULL CHECK (unit IN ('mg', 'g', 'kg', 'ml', 'l', 'und')),
  stockMg     INTEGER NOT NULL DEFAULT 0,   -- siempre en miligramos internamente
  minStock    INTEGER NOT NULL DEFAULT 0,   -- umbral de alerta (mg)
  costPerUnit REAL    NOT NULL DEFAULT 0,   -- costo por unidad de compra
  buyUnit     TEXT    NOT NULL DEFAULT 'kg',-- unidad en que se compra
  buyQtyMg    INTEGER NOT NULL DEFAULT 1000000, -- cuántos mg trae esa unidad
  createdAt   TEXT    NOT NULL DEFAULT (datetime('now')),
  updatedAt   TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- 4. Recetas (cabecera)
CREATE TABLE IF NOT EXISTS recipes (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT    NOT NULL,
  description     TEXT,
  batchWeightG    REAL    NOT NULL DEFAULT 1000,  -- peso meta del lote en gramos
  coldWastePct    REAL    NOT NULL DEFAULT 3.0,   -- Mfrío %
  thermalWastePct REAL    NOT NULL DEFAULT 12.0,  -- Mterm %
  laborCostMin    REAL    NOT NULL DEFAULT 0,     -- minutos de trabajo
  ovenCostMin     REAL    NOT NULL DEFAULT 0,     -- minutos de horno
  priceMode       TEXT    NOT NULL DEFAULT 'DYNAMIC' CHECK (priceMode IN ('DYNAMIC','FIXED')),
  fixedPrice      REAL,                            -- precio fijo si priceMode=FIXED
  competitorPrice REAL,                            -- precio de competencia (opcional)
  roundingMode    TEXT    NOT NULL DEFAULT 'NONE' CHECK (roundingMode IN ('NONE','PSYCHOLOGICAL','ROUND')),
  isArchived      INTEGER NOT NULL DEFAULT 0,
  createdAt       TEXT    NOT NULL DEFAULT (datetime('now')),
  updatedAt       TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- 5. Ítems de receta (ingredientes con sliders)
CREATE TABLE IF NOT EXISTS recipeItems (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  recipeId    INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  materialId  INTEGER NOT NULL REFERENCES rawMaterials(id),
  pctValue    REAL    NOT NULL DEFAULT 0,      -- % en la fórmula Zero-Sum
  netWeightMg INTEGER NOT NULL DEFAULT 0,      -- peso neto calculado (mg)
  isLocked    INTEGER NOT NULL DEFAULT 0,      -- 0=desbloqueado, 1=candado activo
  errorTolPct REAL    NOT NULL DEFAULT 2.0,    -- Eitem %
  sortOrder   INTEGER NOT NULL DEFAULT 0
);

-- 6. Clientes (Cuaderno Virtual)
CREATE TABLE IF NOT EXISTS customers (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  cedulaRif        TEXT    NOT NULL UNIQUE,
  fullName         TEXT    NOT NULL,
  phoneWa          TEXT,
  address          TEXT,
  notes            TEXT,
  defaultPriceMode TEXT    NOT NULL DEFAULT 'DYNAMIC' CHECK (defaultPriceMode IN ('DYNAMIC','FIXED')),
  totalDebt        REAL    NOT NULL DEFAULT 0,
  createdAt        TEXT    NOT NULL DEFAULT (datetime('now')),
  updatedAt        TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- 7. Intenciones / cotizaciones caídas ("Qué NO compró")
CREATE TABLE IF NOT EXISTS customerIntentions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  customerId      INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  recipeId        INTEGER REFERENCES recipes(id),
  recipeNameSnap  TEXT    NOT NULL,
  quotedPrice     REAL    NOT NULL DEFAULT 0,
  priceMode       TEXT    NOT NULL DEFAULT 'DYNAMIC' CHECK (priceMode IN ('DYNAMIC','FIXED')),
  reasonNotBought TEXT,
  createdAt       TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- 8. Facturas / Auditoría (Append-Only — NUNCA UPDATE/DELETE)
CREATE TABLE IF NOT EXISTS invoicesAudit (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  serialCode  TEXT    NOT NULL UNIQUE,  -- correlativo: DA-2026-00001
  customerId  INTEGER REFERENCES customers(id),
  customerSnap TEXT   NOT NULL,         -- snapshot del nombre en el momento
  exitType    TEXT    NOT NULL CHECK (exitType IN ('VENTA','CREDITO','REGALO','COMIDO','PERDIDO')),
  total       REAL    NOT NULL DEFAULT 0,
  paid        REAL    NOT NULL DEFAULT 0,
  dueDate     TEXT,
  notes       TEXT,
  sha256      TEXT    NOT NULL DEFAULT '',  -- firma del registro
  createdAt   TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- 9. Ítems de factura (snapshot de costos al momento de la venta)
CREATE TABLE IF NOT EXISTS invoiceItems (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  invoiceId           INTEGER NOT NULL REFERENCES invoicesAudit(id) ON DELETE RESTRICT,
  recipeId            INTEGER REFERENCES recipes(id),
  recipeNameSnap      TEXT    NOT NULL,
  qty                 REAL    NOT NULL DEFAULT 1,
  unitPriceCharged    REAL    NOT NULL DEFAULT 0,
  unitBaseCostSnapshot REAL   NOT NULL DEFAULT 0   -- costo base congelado en el instante
);

-- ============================================================
-- Índices para performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_recipeItems_recipeId   ON recipeItems(recipeId);
CREATE INDEX IF NOT EXISTS idx_invoiceItems_invoiceId ON invoiceItems(invoiceId);
CREATE INDEX IF NOT EXISTS idx_intentions_customerId  ON customerIntentions(customerId);
CREATE INDEX IF NOT EXISTS idx_invoices_exitType      ON invoicesAudit(exitType);
CREATE INDEX IF NOT EXISTS idx_invoices_customerId    ON invoicesAudit(customerId);
CREATE INDEX IF NOT EXISTS idx_materials_type         ON rawMaterials(type);
