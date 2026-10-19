import type { RawMaterial, Recipe, Customer, Invoice, AppSettings } from '../types';

export const INITIAL_SETTINGS: AppSettings = {
  id: 1,
  businessName: 'Heladería & Pastelería Dulce Arte',
  logoPath: null,
  rif: 'J-50291847-1',
  phone: '+58 424-612-8899',
  address: 'Av. Intercomunal con Calle Rosario, Local 4, Sector Miraflores',
  country: 'Venezuela',
  state: 'Zulia',
  city: 'Cabimas',
  zoneType: 'Comercial Urbana',
  waTemplate: '¡Hola {nombreCliente}! Le saludamos cordialmente de *{nombreNegocio}* 🍨. Le recordamos que mantiene un saldo pendiente de *${saldoPendiente}* que venció el *{fechaLimite}*. Agradecemos su puntual pago. ¡Feliz día!',
  taxPct: 16,
  cogsPct: 30,
  opexPct: 18,
  ownerSalaryPct: 20,
  reinvestPct: 8,
  netProfitPct: 8,
  wholesalePct: 18, // 18% descuento al mayor por defecto
  bcvRate: 46.85,  // Tasa de cambio oficial BCV de referencia (Bs/USD)
  updatedAt: new Date().toISOString()
};

export const INITIAL_MATERIALS: RawMaterial[] = [
  {
    id: 1,
    name: 'Leche Entera Pasteurizada',
    type: 'INSUMO',
    unit: 'l',
    stockMg: 25000000, // 25 Litros en mg
    minStock: 8000000,
    costPerUnit: 1.35,
    buyUnit: 'Litro',
    buyQtyMg: 1000000,
    costPerMg: 0.00000135,
    stockStatus: 'ok',
    createdAt: '2026-01-10T10:00:00Z',
    updatedAt: '2026-01-10T10:00:00Z'
  },
  {
    id: 2,
    name: 'Crema de Leche 35% Grasa',
    type: 'INSUMO',
    unit: 'kg',
    stockMg: 14000000, // 14 kg
    minStock: 5000000,
    costPerUnit: 4.80,
    buyUnit: 'Kilogramo',
    buyQtyMg: 1000000,
    costPerMg: 0.0000048,
    stockStatus: 'ok',
    createdAt: '2026-01-10T10:00:00Z',
    updatedAt: '2026-01-10T10:00:00Z'
  },
  {
    id: 3,
    name: 'Leche en Polvo Completa',
    type: 'INSUMO',
    unit: 'kg',
    stockMg: 8500000,
    minStock: 3000000,
    costPerUnit: 6.20,
    buyUnit: 'Kilogramo',
    buyQtyMg: 1000000,
    costPerMg: 0.0000062,
    stockStatus: 'ok',
    createdAt: '2026-01-10T10:00:00Z',
    updatedAt: '2026-01-10T10:00:00Z'
  },
  {
    id: 4,
    name: 'Azúcar Refinada Extra',
    type: 'INSUMO',
    unit: 'kg',
    stockMg: 35000000,
    minStock: 10000000,
    costPerUnit: 1.45,
    buyUnit: 'Kilogramo',
    buyQtyMg: 1000000,
    costPerMg: 0.00000145,
    stockStatus: 'ok',
    createdAt: '2026-01-10T10:00:00Z',
    updatedAt: '2026-01-10T10:00:00Z'
  },
  {
    id: 5,
    name: 'Dextrosa Anhidra',
    type: 'INSUMO',
    unit: 'kg',
    stockMg: 4200000,
    minStock: 2000000,
    costPerUnit: 3.50,
    buyUnit: 'Kilogramo',
    buyQtyMg: 1000000,
    costPerMg: 0.0000035,
    stockStatus: 'ok',
    createdAt: '2026-01-10T10:00:00Z',
    updatedAt: '2026-01-10T10:00:00Z'
  },
  {
    id: 6,
    name: 'Estabilizante / Neutro para Helados',
    type: 'INSUMO',
    unit: 'kg',
    stockMg: 1100000,
    minStock: 800000,
    costPerUnit: 18.00,
    buyUnit: 'Kilogramo',
    buyQtyMg: 1000000,
    costPerMg: 0.000018,
    stockStatus: 'low',
    createdAt: '2026-01-10T10:00:00Z',
    updatedAt: '2026-01-10T10:00:00Z'
  },
  {
    id: 7,
    name: 'Extracto Puro de Vainilla Bourbon',
    type: 'INSUMO',
    unit: 'l',
    stockMg: 650000,
    minStock: 500000,
    costPerUnit: 26.00,
    buyUnit: 'Litro',
    buyQtyMg: 1000000,
    costPerMg: 0.000026,
    stockStatus: 'low',
    createdAt: '2026-01-10T10:00:00Z',
    updatedAt: '2026-01-10T10:00:00Z'
  },
  {
    id: 8,
    name: 'Pasta de Pistacho Italiano 100%',
    type: 'INSUMO',
    unit: 'kg',
    stockMg: 1800000,
    minStock: 1000000,
    costPerUnit: 42.00,
    buyUnit: 'Kilogramo',
    buyQtyMg: 1000000,
    costPerMg: 0.000042,
    stockStatus: 'ok',
    createdAt: '2026-01-10T10:00:00Z',
    updatedAt: '2026-01-10T10:00:00Z'
  },
  {
    id: 9,
    name: 'Chocolate Oscuro 70% Cacao',
    type: 'INSUMO',
    unit: 'kg',
    stockMg: 6000000,
    minStock: 2500000,
    costPerUnit: 11.50,
    buyUnit: 'Kilogramo',
    buyQtyMg: 1000000,
    costPerMg: 0.0000115,
    stockStatus: 'ok',
    createdAt: '2026-01-10T10:00:00Z',
    updatedAt: '2026-01-10T10:00:00Z'
  },
  {
    id: 10,
    name: 'Pulpas de Maracuyá / Parchita Natural',
    type: 'INSUMO',
    unit: 'kg',
    stockMg: 7000000,
    minStock: 3000000,
    costPerUnit: 2.80,
    buyUnit: 'Kilogramo',
    buyQtyMg: 1000000,
    costPerMg: 0.0000028,
    stockStatus: 'ok',
    createdAt: '2026-01-10T10:00:00Z',
    updatedAt: '2026-01-10T10:00:00Z'
  },
  {
    id: 11,
    name: 'Envase Térmico Litro (Isopor c/ Tapa)',
    type: 'EMPAQUE',
    unit: 'und',
    stockMg: 120, // 120 unidades
    minStock: 40,
    costPerUnit: 0.45,
    buyUnit: 'Unidad',
    buyQtyMg: 1,
    costPerMg: 0.45,
    stockStatus: 'ok',
    createdAt: '2026-01-10T10:00:00Z',
    updatedAt: '2026-01-10T10:00:00Z'
  },
  {
    id: 12,
    name: 'Tarrina 4oz + Cucharilla Plástica',
    type: 'EMPAQUE',
    unit: 'und',
    stockMg: 450,
    minStock: 100,
    costPerUnit: 0.15,
    buyUnit: 'Unidad',
    buyQtyMg: 1,
    costPerMg: 0.15,
    stockStatus: 'ok',
    createdAt: '2026-01-10T10:00:00Z',
    updatedAt: '2026-01-10T10:00:00Z'
  },
  {
    id: 13,
    name: 'Conos de Barquilla Waffle Artesanal',
    type: 'EMPAQUE',
    unit: 'und',
    stockMg: 85,
    minStock: 150,
    costPerUnit: 0.22,
    buyUnit: 'Unidad',
    buyQtyMg: 1,
    costPerMg: 0.22,
    stockStatus: 'critical',
    createdAt: '2026-01-10T10:00:00Z',
    updatedAt: '2026-01-10T10:00:00Z'
  }
];

export const INITIAL_RECIPES: Recipe[] = [
  {
    id: 1,
    name: 'Helado Cremoso Mantecado Artesanal (1L)',
    description: 'Receta insignia elaborada con leche entera de granja, crema fresca y extracto puro de vainilla bourbon.',
    batchWeightG: 1000,
    coldWastePct: 2.0,
    thermalWastePct: 0.5,
    laborCostMin: 12,
    ovenCostMin: 5,
    priceMode: 'DYNAMIC',
    fixedPrice: null,
    competitorPrice: 7.50,
    roundingMode: 'PSYCHOLOGICAL',
    isArchived: 0,
    createdAt: '2026-01-15T08:00:00Z',
    updatedAt: '2026-01-15T08:00:00Z',
    items: [
      { id: 101, recipeId: 1, materialId: 1, pctValue: 56.0, netWeightMg: 560000, isLocked: 0, errorTolPct: 2.0, sortOrder: 0, materialName: 'Leche Entera Pasteurizada' },
      { id: 102, recipeId: 1, materialId: 2, pctValue: 22.0, netWeightMg: 220000, isLocked: 0, errorTolPct: 1.5, sortOrder: 1, materialName: 'Crema de Leche 35% Grasa' },
      { id: 103, recipeId: 1, materialId: 3, pctValue: 4.5, netWeightMg: 45000, isLocked: 0, errorTolPct: 1.0, sortOrder: 2, materialName: 'Leche en Polvo Completa' },
      { id: 104, recipeId: 1, materialId: 4, pctValue: 13.0, netWeightMg: 130000, isLocked: 0, errorTolPct: 2.0, sortOrder: 3, materialName: 'Azúcar Refinada Extra' },
      { id: 105, recipeId: 1, materialId: 5, pctValue: 3.5, netWeightMg: 35000, isLocked: 0, errorTolPct: 1.0, sortOrder: 4, materialName: 'Dextrosa Anhidra' },
      { id: 106, recipeId: 1, materialId: 6, pctValue: 0.5, netWeightMg: 5000, isLocked: 1, errorTolPct: 0.5, sortOrder: 5, materialName: 'Estabilizante / Neutro para Helados' },
      { id: 107, recipeId: 1, materialId: 7, pctValue: 0.5, netWeightMg: 5000, isLocked: 0, errorTolPct: 1.0, sortOrder: 6, materialName: 'Extracto Puro de Vainilla Bourbon' }
    ],
    costs: {
      ingredients: 2.34,
      packaging: 0.45,
      laborAndOven: 0.55,
      baseTotal: 3.34,
      finalWeightG: 995,
      costPerG: 0.003357
    },
    prices: {
      piso: 4.56,
      optimo: 5.54,
      premium: 7.20,
      mayor: 4.56, // con 18% descuento, regulado al piso
      wholesalePct: 18
    }
  },
  {
    id: 2,
    name: 'Gelato Puro de Pistacho Siciliano (1L)',
    description: 'Gelato de alta gama elaborado con 100% pasta de pistacho importada tostada artesanalmente.',
    batchWeightG: 1000,
    coldWastePct: 2.5,
    thermalWastePct: 0.5,
    laborCostMin: 15,
    ovenCostMin: 5,
    priceMode: 'DYNAMIC',
    fixedPrice: null,
    competitorPrice: 12.00,
    roundingMode: 'PSYCHOLOGICAL',
    isArchived: 0,
    createdAt: '2026-01-16T09:00:00Z',
    updatedAt: '2026-01-16T09:00:00Z',
    items: [
      { id: 201, recipeId: 2, materialId: 1, pctValue: 52.0, netWeightMg: 520000, isLocked: 0, errorTolPct: 2.0, sortOrder: 0, materialName: 'Leche Entera Pasteurizada' },
      { id: 202, recipeId: 2, materialId: 2, pctValue: 18.0, netWeightMg: 180000, isLocked: 0, errorTolPct: 1.5, sortOrder: 1, materialName: 'Crema de Leche 35% Grasa' },
      { id: 203, recipeId: 2, materialId: 8, pctValue: 10.0, netWeightMg: 100000, isLocked: 0, errorTolPct: 1.0, sortOrder: 2, materialName: 'Pasta de Pistacho Italiano 100%' },
      { id: 204, recipeId: 2, materialId: 4, pctValue: 14.5, netWeightMg: 145000, isLocked: 0, errorTolPct: 2.0, sortOrder: 3, materialName: 'Azúcar Refinada Extra' },
      { id: 205, recipeId: 2, materialId: 5, pctValue: 5.0, netWeightMg: 50000, isLocked: 0, errorTolPct: 1.0, sortOrder: 4, materialName: 'Dextrosa Anhidra' },
      { id: 206, recipeId: 2, materialId: 6, pctValue: 0.5, netWeightMg: 5000, isLocked: 1, errorTolPct: 0.5, sortOrder: 5, materialName: 'Estabilizante / Neutro para Helados' }
    ],
    costs: {
      ingredients: 6.22,
      packaging: 0.45,
      laborAndOven: 0.65,
      baseTotal: 7.32,
      finalWeightG: 995,
      costPerG: 0.007357
    },
    prices: {
      piso: 9.99,
      optimo: 12.14,
      premium: 15.78,
      mayor: 9.99,
      wholesalePct: 18
    }
  },
  {
    id: 3,
    name: 'Sorbetto de Parchita Silvestre (Refrescante)',
    description: 'Sorbetto a base de fruta pura natural sin lácteos. Textura suave y acidez equilibrada.',
    batchWeightG: 1000,
    coldWastePct: 3.0,
    thermalWastePct: 0.0,
    laborCostMin: 10,
    ovenCostMin: 0,
    priceMode: 'DYNAMIC',
    fixedPrice: null,
    competitorPrice: 6.00,
    roundingMode: 'PSYCHOLOGICAL',
    isArchived: 0,
    createdAt: '2026-01-18T11:00:00Z',
    updatedAt: '2026-01-18T11:00:00Z',
    items: [
      { id: 301, recipeId: 3, materialId: 10, pctValue: 40.0, netWeightMg: 400000, isLocked: 0, errorTolPct: 2.0, sortOrder: 0, materialName: 'Pulpas de Maracuyá / Parchita Natural' },
      { id: 302, recipeId: 3, materialId: 4, pctValue: 22.0, netWeightMg: 220000, isLocked: 0, errorTolPct: 2.0, sortOrder: 1, materialName: 'Azúcar Refinada Extra' },
      { id: 303, recipeId: 3, materialId: 5, pctValue: 6.0, netWeightMg: 60000, isLocked: 0, errorTolPct: 1.0, sortOrder: 2, materialName: 'Dextrosa Anhidra' },
      { id: 304, recipeId: 3, materialId: 6, pctValue: 0.6, netWeightMg: 6000, isLocked: 1, errorTolPct: 0.5, sortOrder: 3, materialName: 'Estabilizante / Neutro para Helados' }
    ],
    costs: {
      ingredients: 1.85,
      packaging: 0.45,
      laborAndOven: 0.35,
      baseTotal: 2.65,
      finalWeightG: 1000,
      costPerG: 0.00265
    },
    prices: {
      piso: 3.62,
      optimo: 4.40,
      premium: 5.72,
      mayor: 3.62,
      wholesalePct: 18
    }
  }
];

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 1,
    cedulaRif: 'V-18452109',
    fullName: 'Carlos Alberto Mendoza',
    phoneWa: '+584146781234',
    address: 'Urb. Buena Vista, Calle 3, Casa #12, Cabimas',
    notes: 'Cliente fiel semanal. Prefiere helado de mantecado con pistacho.',
    defaultPriceMode: 'DYNAMIC',
    totalDebt: 0.00,
    solvencyStatus: 'ok',
    createdAt: '2026-01-05T09:00:00Z',
    updatedAt: '2026-01-05T09:00:00Z'
  },
  {
    id: 2,
    cedulaRif: 'J-401928374',
    fullName: 'Inversiones & Cafetería El Muelle C.A.',
    phoneWa: '+584248921122',
    address: 'Boulevard Costanero, Local 8, Cabimas',
    notes: 'Cliente Mayorista. Compra tinas de 5L y 10L cada martes.',
    defaultPriceMode: 'DYNAMIC',
    totalDebt: 145.00,
    solvencyStatus: 'overdue',
    createdAt: '2026-01-08T14:30:00Z',
    updatedAt: '2026-01-18T10:00:00Z'
  },
  {
    id: 3,
    cedulaRif: 'V-24890123',
    fullName: 'Mariana Sofia Gómez',
    phoneWa: '+584125554321',
    address: 'Sector Tierra Negra, Maracaibo',
    notes: 'Pedidos especiales de tortas y marquesas para cumpleaños.',
    defaultPriceMode: 'DYNAMIC',
    totalDebt: 25.00,
    solvencyStatus: 'debt',
    createdAt: '2026-01-12T16:20:00Z',
    updatedAt: '2026-01-19T11:00:00Z'
  },
  {
    id: 4,
    cedulaRif: 'V-12984562',
    fullName: 'Roberto De Jesús Pirela',
    phoneWa: '+584168902341',
    address: 'Las 40, Av. 33, Cabimas',
    notes: 'Compra cono doble y tarrina de parchita.',
    defaultPriceMode: 'DYNAMIC',
    totalDebt: 0.00,
    solvencyStatus: 'ok',
    createdAt: '2026-01-14T18:00:00Z',
    updatedAt: '2026-01-14T18:00:00Z'
  }
];

export const INITIAL_INVOICES: Invoice[] = [
  {
    id: 1,
    serialCode: 'DA-2026-00001',
    customerId: 1,
    customerSnap: 'Carlos Alberto Mendoza (V-18452109)',
    exitType: 'VENTA',
    total: 12.14,
    paid: 12.14,
    dueDate: null,
    notes: 'Pago en divisa efectivo.',
    sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    createdAt: '2026-01-18T14:22:00Z',
    items: [
      {
        id: 1,
        invoiceId: 1,
        recipeId: 2,
        recipeNameSnap: 'Gelato Puro de Pistacho Siciliano (1L)',
        qty: 1,
        unitPriceCharged: 12.14,
        unitBaseCostSnapshot: 7.32
      }
    ]
  },
  {
    id: 2,
    serialCode: 'DA-2026-00002',
    customerId: 2,
    customerSnap: 'Inversiones & Cafetería El Muelle C.A. (J-401928374)',
    exitType: 'VENTA', // Venta mayorista
    total: 145.00,
    paid: 0.00,
    dueDate: '2026-01-25T00:00:00Z',
    notes: 'Venta al mayor 30 Litros Mantecado y Sorbetto. Factura a crédito 7 días.',
    sha256: 'a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0',
    createdAt: '2026-01-17T11:05:00Z',
    items: [
      {
        id: 2,
        invoiceId: 2,
        recipeId: 1,
        recipeNameSnap: 'Helado Cremoso Mantecado Artesanal (1L) [Mayorista]',
        qty: 20,
        unitPriceCharged: 4.56,
        unitBaseCostSnapshot: 3.34
      },
      {
        id: 3,
        invoiceId: 2,
        recipeId: 3,
        recipeNameSnap: 'Sorbetto de Parchita Silvestre [Mayorista]',
        qty: 15,
        unitPriceCharged: 3.62,
        unitBaseCostSnapshot: 2.65
      }
    ]
  },
  {
    id: 3,
    serialCode: 'DA-2026-00003',
    customerId: null,
    customerSnap: 'Degustación Prensa e Influencers Locales',
    exitType: 'REGALO',
    total: 17.68,
    paid: 0.00,
    dueDate: null,
    notes: 'Degustación lanzamiento nueva temporada de helados.',
    sha256: 'f4567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12',
    createdAt: '2026-01-16T16:40:00Z',
    items: [
      {
        id: 4,
        invoiceId: 3,
        recipeId: 2,
        recipeNameSnap: 'Gelato Puro de Pistacho Siciliano',
        qty: 1,
        unitPriceCharged: 12.14,
        unitBaseCostSnapshot: 7.32
      },
      {
        id: 5,
        invoiceId: 3,
        recipeId: 1,
        recipeNameSnap: 'Helado Cremoso Mantecado Artesanal',
        qty: 1,
        unitPriceCharged: 5.54,
        unitBaseCostSnapshot: 3.34
      }
    ]
  },
  {
    id: 4,
    serialCode: 'DA-2026-00004',
    customerId: null,
    customerSnap: 'Merma de cocina / Desecho de prueba de textura',
    exitType: 'PERDIDO',
    total: 3.34,
    paid: 0.00,
    dueDate: null,
    notes: 'Falla eléctrica temporal durante mantecado inicial.',
    sha256: '9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba',
    createdAt: '2026-01-15T18:00:00Z',
    items: [
      {
        id: 6,
        invoiceId: 4,
        recipeId: 1,
        recipeNameSnap: 'Helado Cremoso Mantecado Artesanal (Lote defectuoso)',
        qty: 1,
        unitPriceCharged: 3.34,
        unitBaseCostSnapshot: 3.34
      }
    ]
  }
];
