// ================================================================
// DULCE ARTE ERP — Global State Store (Zustand + Immer + LocalPersistence)
// ================================================================
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { AppSettings, RawMaterial, Recipe, Customer, Invoice } from '../types';
import {
  INITIAL_SETTINGS,
  INITIAL_MATERIALS,
  INITIAL_RECIPES,
  INITIAL_CUSTOMERS,
  INITIAL_INVOICES
} from '../lib/seedData';

// Local storage key helper
const STORAGE_PREFIX = 'dulce_arte_v2_';
function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(data));
  } catch {
    // ignore quota errors
  }
}

export interface Alert {
  id: string;
  type: 'success' | 'warn' | 'error' | 'info';
  message: string;
}

interface AppState {
  ready: boolean;
  settings: AppSettings;
  materials: RawMaterial[];
  recipes: Recipe[];
  customers: Customer[];
  invoices: Invoice[];
  activeModule: string;
  sidebarOpen: boolean;
  alerts: Alert[];
}

interface AppActions {
  setReady: (v: boolean) => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
  // Materials
  setMaterials: (m: RawMaterial[]) => void;
  addMaterial: (m: Omit<RawMaterial, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateMaterial: (id: number, m: Partial<RawMaterial>) => void;
  deleteMaterial: (id: number) => void;
  // Recipes
  setRecipes: (r: Recipe[]) => void;
  addRecipe: (r: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>) => number;
  updateRecipe: (id: number, r: Partial<Recipe>) => void;
  deleteRecipe: (id: number) => void;
  // Customers
  setCustomers: (c: Customer[]) => void;
  addCustomer: (c: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'totalDebt' | 'solvencyStatus'>) => void;
  updateCustomer: (id: number, c: Partial<Customer>) => void;
  // Invoices & Sales
  setInvoices: (i: Invoice[]) => void;
  addInvoice: (inv: Omit<Invoice, 'id' | 'serialCode' | 'createdAt'>) => string;
  // UI
  setActiveModule: (m: string) => void;
  toggleSidebar: () => void;
  pushAlert: (a: Omit<Alert, 'id'>) => void;
  dismissAlert: (id: string) => void;
  resetToDefaults: () => void;
}

export const useAppStore = create<AppState & AppActions>()(
  immer((set, get) => ({
    ready: true,
    settings: loadFromStorage<AppSettings>('settings', INITIAL_SETTINGS),
    materials: loadFromStorage<RawMaterial[]>('materials', INITIAL_MATERIALS),
    recipes: loadFromStorage<Recipe[]>('recipes', INITIAL_RECIPES),
    customers: loadFromStorage<Customer[]>('customers', INITIAL_CUSTOMERS),
    invoices: loadFromStorage<Invoice[]>('invoices', INITIAL_INVOICES),
    activeModule: 'billing',
    sidebarOpen: true,
    alerts: [],

    setReady: (v) => set(s => { s.ready = v; }),

    updateSettings: (patch) => {
      set(s => {
        Object.assign(s.settings, patch, { updatedAt: new Date().toISOString() });
      });
      saveToStorage('settings', get().settings);
      get().pushAlert({ type: 'success', message: 'Configuración actualizada exitosamente' });
    },

    setMaterials: (m) => {
      set(s => { s.materials = m; });
      saveToStorage('materials', m);
    },

    addMaterial: (m) => {
      set(s => {
        const id = Math.max(0, ...s.materials.map(x => x.id)) + 1;
        const now = new Date().toISOString();
        const costPerMg = m.buyQtyMg > 0 ? m.costPerUnit / m.buyQtyMg : 0;
        const status = m.stockMg <= m.minStock * 0.5 ? 'critical' : m.stockMg <= m.minStock ? 'low' : 'ok';
        s.materials.push({
          ...m,
          id,
          costPerMg,
          stockStatus: status,
          createdAt: now,
          updatedAt: now
        });
      });
      saveToStorage('materials', get().materials);
      get().pushAlert({ type: 'success', message: `Materia prima "${m.name}" guardada` });
    },

    updateMaterial: (id, patch) => {
      set(s => {
        const idx = s.materials.findIndex(x => x.id === id);
        if (idx !== -1) {
          Object.assign(s.materials[idx], patch, { updatedAt: new Date().toISOString() });
          const m = s.materials[idx];
          if (patch.costPerUnit !== undefined || patch.buyQtyMg !== undefined) {
            m.costPerMg = m.buyQtyMg > 0 ? m.costPerUnit / m.buyQtyMg : m.costPerMg;
          }
          if (m.stockMg <= m.minStock * 0.5) m.stockStatus = 'critical';
          else if (m.stockMg <= m.minStock) m.stockStatus = 'low';
          else m.stockStatus = 'ok';
        }
      });
      saveToStorage('materials', get().materials);
      get().pushAlert({ type: 'info', message: 'Inventario actualizado' });
    },

    deleteMaterial: (id) => {
      set(s => {
        s.materials = s.materials.filter(x => x.id !== id);
      });
      saveToStorage('materials', get().materials);
      get().pushAlert({ type: 'info', message: 'Materia prima eliminada' });
    },

    setRecipes: (r) => {
      set(s => { s.recipes = r; });
      saveToStorage('recipes', r);
    },

    addRecipe: (r) => {
      let newId = 1;
      set(s => {
        newId = Math.max(0, ...s.recipes.map(x => x.id)) + 1;
        const now = new Date().toISOString();
        s.recipes.push({
          ...r,
          id: newId,
          createdAt: now,
          updatedAt: now
        });
      });
      saveToStorage('recipes', get().recipes);
      get().pushAlert({ type: 'success', message: `Fórmula "${r.name}" guardada con éxito` });
      return newId;
    },

    updateRecipe: (id, patch) => {
      set(s => {
        const idx = s.recipes.findIndex(x => x.id === id);
        if (idx !== -1) {
          Object.assign(s.recipes[idx], patch, { updatedAt: new Date().toISOString() });
        }
      });
      saveToStorage('recipes', get().recipes);
      get().pushAlert({ type: 'success', message: 'Receta actualizada' });
    },

    deleteRecipe: (id) => {
      set(s => {
        s.recipes = s.recipes.filter(x => x.id !== id);
      });
      saveToStorage('recipes', get().recipes);
      get().pushAlert({ type: 'info', message: 'Receta eliminada' });
    },

    setCustomers: (c) => {
      set(s => { s.customers = c; });
      saveToStorage('customers', c);
    },

    addCustomer: (c) => {
      set(s => {
        const id = Math.max(0, ...s.customers.map(x => x.id)) + 1;
        const now = new Date().toISOString();
        s.customers.push({
          ...c,
          id,
          totalDebt: 0,
          solvencyStatus: 'ok',
          createdAt: now,
          updatedAt: now
        });
      });
      saveToStorage('customers', get().customers);
      get().pushAlert({ type: 'success', message: `Cliente "${c.fullName}" registrado` });
    },

    updateCustomer: (id, patch) => {
      set(s => {
        const idx = s.customers.findIndex(x => x.id === id);
        if (idx !== -1) {
          Object.assign(s.customers[idx], patch, { updatedAt: new Date().toISOString() });
          if (s.customers[idx].totalDebt <= 0) s.customers[idx].solvencyStatus = 'ok';
          else s.customers[idx].solvencyStatus = s.customers[idx].solvencyStatus === 'overdue' ? 'overdue' : 'debt';
        }
      });
      saveToStorage('customers', get().customers);
      get().pushAlert({ type: 'info', message: 'Cliente actualizado' });
    },

    setInvoices: (i) => {
      set(s => { s.invoices = i; });
      saveToStorage('invoices', i);
    },

    addInvoice: (inv) => {
      const year = new Date().getFullYear();
      const count = get().invoices.length + 1;
      const serialCode = `DA-${year}-${String(count).padStart(5, '0')}`;
      const now = new Date().toISOString();

      set(s => {
        const id = Math.max(0, ...s.invoices.map(x => x.id)) + 1;
        const newInv: Invoice = {
          ...inv,
          id,
          serialCode,
          createdAt: now
        };
        s.invoices.unshift(newInv);

        // Adjust customer debt if not fully paid
        if (inv.customerId && inv.total > inv.paid) {
          const cust = s.customers.find(c => c.id === inv.customerId);
          if (cust) {
            cust.totalDebt += (inv.total - inv.paid);
            cust.solvencyStatus = 'debt';
          }
        }

        // Deduct inventory materials based on recipe items
        if (inv.items) {
          inv.items.forEach(item => {
            if (item.recipeId) {
              const recipe = s.recipes.find(r => r.id === item.recipeId);
              if (recipe && recipe.items) {
                recipe.items.forEach(ri => {
                  const mat = s.materials.find(m => m.id === ri.materialId);
                  if (mat) {
                    const consumedMg = (ri.netWeightMg * item.qty);
                    mat.stockMg = Math.max(0, mat.stockMg - consumedMg);
                    if (mat.stockMg <= mat.minStock * 0.5) mat.stockStatus = 'critical';
                    else if (mat.stockMg <= mat.minStock) mat.stockStatus = 'low';
                    else mat.stockStatus = 'ok';
                  }
                });
              }
            }
          });
        }
      });

      saveToStorage('invoices', get().invoices);
      saveToStorage('customers', get().customers);
      saveToStorage('materials', get().materials);
      get().pushAlert({ type: 'success', message: `Factura ${serialCode} generada e inventario descontado` });
      return serialCode;
    },

    setActiveModule: (m) => set(s => { s.activeModule = m; }),
    toggleSidebar: () => set(s => { s.sidebarOpen = !s.sidebarOpen; }),
    pushAlert: (a) => {
      const id = Date.now().toString() + Math.random().toString(36).slice(2, 6);
      set(s => {
        s.alerts.push({ ...a, id });
      });
      setTimeout(() => {
        get().dismissAlert(id);
      }, 4000);
    },
    dismissAlert: (id) => set(s => {
      s.alerts = s.alerts.filter(a => a.id !== id);
    }),

    resetToDefaults: () => {
      set(s => {
        s.settings = INITIAL_SETTINGS;
        s.materials = INITIAL_MATERIALS;
        s.recipes = INITIAL_RECIPES;
        s.customers = INITIAL_CUSTOMERS;
        s.invoices = INITIAL_INVOICES;
      });
      saveToStorage('settings', INITIAL_SETTINGS);
      saveToStorage('materials', INITIAL_MATERIALS);
      saveToStorage('recipes', INITIAL_RECIPES);
      saveToStorage('customers', INITIAL_CUSTOMERS);
      saveToStorage('invoices', INITIAL_INVOICES);
      get().pushAlert({ type: 'info', message: 'Datos de fábrica restaurados' });
    }
  }))
);
