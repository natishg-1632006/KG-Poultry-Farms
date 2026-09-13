import { ref, get, set, update, remove, push, child } from 'firebase/database';
import { db } from './firebase';
import { FEED_CONSUMPTION_TARGETS, AVERAGE_WEIGHT_TARGETS } from '../constants/companyTargets';

const MOCK_STORAGE_KEY = 'kg_poultry_local_db_v1';

// Initial seed state for local fallback mode
const INITIAL_LOCAL_STATE = {
  users: {
    'admin-uid-1': {
      uid: 'admin-uid-1',
      name: 'System Admin',
      email: 'admin@kgpoultry.com',
      phone: '+91 9876543210',
      farmName: 'KG Central Farm',
      role: 'Admin',
      active: true,
      assignedBatches: [],
      createdAt: new Date().toISOString()
    },
    'farmer-uid-1': {
      uid: 'farmer-uid-1',
      name: 'Ramesh Kumar',
      email: 'farmer@kgpoultry.com',
      phone: '+91 9876543211',
      farmName: 'KG North Shed',
      role: 'Farmer',
      active: true,
      assignedBatches: ['KG001'],
      createdAt: new Date().toISOString()
    }
  },
  batches: {
    'KG001': {
      id: 'KG001',
      batchNumber: 'KG001',
      batchName: 'KgPoultryBatch-1',
      chickArrivalDate: '2026-09-01',
      initialChickCount: 5000,
      remainingChickCount: 4980,
      assignedFarmerId: 'farmer-uid-1',
      assignedFarmerName: 'Ramesh Kumar',
      vehicleNumber: 'TN-38-AX-1234',
      driverName: 'Suresh',
      status: 'Active',
      feedStock: {
        'Pre-Starter': 500,
        'Starter': 1000,
        'Finisher': 0
      },
      createdAt: new Date().toISOString()
    }
  },
  dailyRecords: {
    'KG001': {
      '2026-09-01': {
        batchId: 'KG001',
        recordDate: '2026-09-01',
        mortalityCount: 5,
        feedType: 'Pre-Starter',
        feedConsumption: 100,
        averageWeight: 58,
        remainingChickCount: 4995,
        updatedAt: new Date().toISOString()
      },
      '2026-09-02': {
        batchId: 'KG001',
        recordDate: '2026-09-02',
        mortalityCount: 15,
        feedType: 'Pre-Starter',
        feedConsumption: 105,
        averageWeight: 76,
        remainingChickCount: 4980,
        updatedAt: new Date().toISOString()
      }
    }
  },
  feedStocks: {
    'KG001': [
      {
        id: 'feed-1',
        batchId: 'KG001',
        feedType: 'Pre-Starter',
        driverName: 'Murugan',
        vehicleNumber: 'TN-38-B-9988',
        quantityReceived: 500,
        date: '2026-09-01',
        notes: 'Initial pre-starter batch arrival',
        createdAt: new Date().toISOString()
      },
      {
        id: 'feed-2',
        batchId: 'KG001',
        feedType: 'Starter',
        driverName: 'Murugan',
        vehicleNumber: 'TN-38-B-9988',
        quantityReceived: 1000,
        date: '2026-09-05',
        notes: 'Starter feed arrival',
        createdAt: new Date().toISOString()
      }
    ]
  },
  medicineRecords: {
    'KG001': [
      {
        id: 'med-1',
        batchId: 'KG001',
        recordType: 'Vaccine',
        vaccines: [
          { name: 'Ranikhet (LaSota)', quantity: 5000, unit: 'ml' },
          { name: 'IBD (Gumboro)', quantity: 5000, unit: 'ml' }
        ],
        vaccinatorNames: ['Dr. Ramesh', 'Assistant Selvam'],
        date: '2026-09-07',
        reason: 'Day 7 Booster Vaccination',
        createdAt: new Date().toISOString()
      }
    ]
  },
  dispatches: {
    'disp-1': {
      id: 'disp-1',
      batchId: 'KG001',
      vehicleName: 'Eicher Pro 2049',
      vehicleNumber: 'TN-38-C-5544',
      driverName: 'Karthik',
      driverMobileNumber: '9842101234',
      dispatchDate: '2026-09-12',
      totalBoxCount: 10,
      chickenCountPerBox: 12,
      totalChickenCount: 120,
      totalWeight: 240,
      averageWeight: 2.0,
      status: 'In Progress',
      createdAt: new Date().toISOString()
    }
  },
  boxSets: {
    'disp-1': [
      {
        id: 'set-1',
        dispatchId: 'disp-1',
        boxSetNumber: 1,
        emptyBoxWeight: 5,
        loadedWeight: 29,
        chickenCount: 12,
        totalChickenWeight: 24,
        averageChickenWeight: 2.0,
        savedAt: new Date().toISOString()
      }
    ]
  },
  targets: {
    feedConsumption: FEED_CONSUMPTION_TARGETS,
    averageWeight: AVERAGE_WEIGHT_TARGETS
  },
  invoices: [
    {
      id: 'INV-2026-001',
      dispatchId: 'disp-1',
      batchId: 'KG001',
      invoiceDate: '2026-09-12',
      customerName: 'Kg Poultry Meat Traders',
      customerPhone: '9443312345',
      vehicleNumber: 'TN-38-C-5544',
      driverName: 'Karthik',
      totalChickens: 120,
      totalWeightKg: 240,
      ratePerKg: 135,
      totalAmount: 32400,
      createdAt: new Date().toISOString()
    }
  ],
  auditLogs: [
    {
      id: 'log-1',
      action: 'BATCH_CREATED',
      actorName: 'System Admin',
      details: 'Created batch KG001 with 5000 initial chicks',
      timestamp: new Date().toISOString()
    }
  ]
};

// Helper: Wrap promises with a timeout to prevent hanging UI
function withTimeout(promise, ms = 1500) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Network timeout')), ms);
    promise
      .then((res) => { clearTimeout(timer); resolve(res); })
      .catch((err) => { clearTimeout(timer); reject(err); });
  });
}

function getLocalDB() {
  try {
    const raw = localStorage.getItem(MOCK_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(INITIAL_LOCAL_STATE));
      return INITIAL_LOCAL_STATE;
    }
    return JSON.parse(raw);
  } catch (_err) {
    return INITIAL_LOCAL_STATE;
  }
}

function saveLocalDB(data) {
  try {
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save to localStorage:', err);
  }
}

// USER MANAGEMENT
export async function dbGetUsers() {
  try {
    const snap = await withTimeout(get(ref(db, 'users')));
    if (snap.exists()) return Object.values(snap.val());
  } catch (_err) {
    // fallback
  }
  const local = getLocalDB();
  return Object.values(local.users || {});
}

export async function dbSaveUser(userData) {
  const uid = userData.uid || `user-${Date.now()}`;
  const record = { ...userData, uid, updatedAt: new Date().toISOString() };

  try {
    await withTimeout(set(ref(db, `users/${uid}`), record));
  } catch (_err) {
    // fallback
  }

  const local = getLocalDB();
  local.users[uid] = record;
  saveLocalDB(local);
  return record;
}

// BATCH MANAGEMENT
export async function dbGetBatches() {
  try {
    const snap = await withTimeout(get(ref(db, 'batches')));
    if (snap.exists()) return Object.values(snap.val());
  } catch (_err) {
    // fallback
  }
  const local = getLocalDB();
  return Object.values(local.batches || {});
}

export async function dbSaveBatch(batchData) {
  const batchId = batchData.id || batchData.batchNumber;
  const record = {
    ...batchData,
    id: batchId,
    feedStock: batchData.feedStock || { 'Pre-Starter': 0, 'Starter': 0, 'Finisher': 0 },
    updatedAt: new Date().toISOString()
  };

  try {
    await withTimeout(set(ref(db, `batches/${batchId}`), record));
  } catch (_err) {
    // fallback
  }

  const local = getLocalDB();
  local.batches[batchId] = record;
  saveLocalDB(local);
  return record;
}

export async function dbDeleteBatch(batchId) {
  try {
    await withTimeout(remove(ref(db, `batches/${batchId}`)));
  } catch (_err) {
    // fallback
  }

  const local = getLocalDB();
  delete local.batches[batchId];
  delete local.dailyRecords[batchId];
  delete local.feedStocks[batchId];
  delete local.medicineRecords[batchId];
  saveLocalDB(local);
}

// DAILY FARM RECORDS
export async function dbGetDailyRecords(batchId) {
  try {
    const snap = await withTimeout(get(ref(db, `dailyRecords/${batchId}`)));
    if (snap.exists()) return snap.val();
  } catch (_err) {
    // fallback
  }
  const local = getLocalDB();
  return local.dailyRecords[batchId] || {};
}

export async function dbSaveDailyRecord(batchId, recordDate, recordData) {
  const record = {
    ...recordData,
    batchId,
    recordDate,
    updatedAt: new Date().toISOString()
  };

  try {
    await withTimeout(set(ref(db, `dailyRecords/${batchId}/${recordDate}`), record));
  } catch (_err) {
    // fallback
  }

  const local = getLocalDB();
  if (!local.dailyRecords[batchId]) {
    local.dailyRecords[batchId] = {};
  }
  local.dailyRecords[batchId][recordDate] = record;

  if (local.batches[batchId]) {
    local.batches[batchId].remainingChickCount = record.remainingChickCount;
  }
  saveLocalDB(local);
  return record;
}

// FEED MANAGEMENT
export async function dbGetFeedArrivals(batchId) {
  try {
    const snap = await withTimeout(get(ref(db, `feedStocks/${batchId}`)));
    if (snap.exists()) return Array.isArray(snap.val()) ? snap.val() : Object.values(snap.val());
  } catch (_err) {
    // fallback
  }
  const local = getLocalDB();
  return local.feedStocks[batchId] || [];
}

export async function dbAddFeedArrival(batchId, feedData) {
  const feedId = `feed-${Date.now()}`;
  const record = {
    ...feedData,
    id: feedId,
    batchId,
    createdAt: new Date().toISOString()
  };

  try {
    await withTimeout(push(ref(db, `feedStocks/${batchId}`), record));
  } catch (_err) {
    // fallback
  }

  const local = getLocalDB();
  if (!local.feedStocks[batchId]) {
    local.feedStocks[batchId] = [];
  }
  local.feedStocks[batchId].push(record);

  if (local.batches[batchId]) {
    const type = feedData.feedType;
    const current = local.batches[batchId].feedStock[type] || 0;
    local.batches[batchId].feedStock[type] = current + Number(feedData.quantityReceived || 0);
  }

  saveLocalDB(local);
  return record;
}

export async function dbUpdateBatchFeedStockPool(batchId, updatedStock) {
  try {
    await withTimeout(update(ref(db, `batches/${batchId}/feedStock`), updatedStock));
  } catch (_err) {
    // fallback
  }

  const local = getLocalDB();
  if (local.batches[batchId]) {
    local.batches[batchId].feedStock = updatedStock;
    saveLocalDB(local);
  }
}

// MEDICINE & VACCINATION
export async function dbGetMedicineRecords(batchId) {
  try {
    const snap = await withTimeout(get(ref(db, `medicineRecords/${batchId}`)));
    if (snap.exists()) return Array.isArray(snap.val()) ? snap.val() : Object.values(snap.val());
  } catch (_err) {
    // fallback
  }
  const local = getLocalDB();
  return local.medicineRecords[batchId] || [];
}

export async function dbAddMedicineRecord(batchId, recordData) {
  const recordId = `med-${Date.now()}`;
  const record = {
    ...recordData,
    id: recordId,
    batchId,
    createdAt: new Date().toISOString()
  };

  try {
    await withTimeout(push(ref(db, `medicineRecords/${batchId}`), record));
  } catch (_err) {
    // fallback
  }

  const local = getLocalDB();
  if (!local.medicineRecords[batchId]) {
    local.medicineRecords[batchId] = [];
  }
  local.medicineRecords[batchId].push(record);
  saveLocalDB(local);
  return record;
}

// DISPATCH & BOX SETS
export async function dbGetDispatches() {
  try {
    const snap = await withTimeout(get(ref(db, 'dispatches')));
    if (snap.exists()) return Object.values(snap.val());
  } catch (_err) {
    // fallback
  }
  const local = getLocalDB();
  return Object.values(local.dispatches || {});
}

export async function dbSaveDispatch(dispatchData) {
  const id = dispatchData.id || `disp-${Date.now()}`;
  const record = {
    ...dispatchData,
    id,
    createdAt: dispatchData.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  try {
    await withTimeout(set(ref(db, `dispatches/${id}`), record));
  } catch (_err) {
    // fallback
  }

  const local = getLocalDB();
  local.dispatches[id] = record;
  saveLocalDB(local);
  return record;
}

export async function dbGetBoxSets(dispatchId) {
  try {
    const snap = await withTimeout(get(ref(db, `boxSets/${dispatchId}`)));
    if (snap.exists()) return Array.isArray(snap.val()) ? snap.val() : Object.values(snap.val());
  } catch (_err) {
    // fallback
  }
  const local = getLocalDB();
  return local.boxSets[dispatchId] || [];
}

export async function dbSaveBoxSet(dispatchId, boxSetData) {
  const setId = boxSetData.id || `set-${Date.now()}`;
  const record = {
    ...boxSetData,
    id: setId,
    dispatchId,
    savedAt: new Date().toISOString()
  };

  try {
    await withTimeout(set(ref(db, `boxSets/${dispatchId}/${boxSetData.boxSetNumber - 1}`), record));
  } catch (_err) {
    // fallback
  }

  const local = getLocalDB();
  if (!local.boxSets[dispatchId]) {
    local.boxSets[dispatchId] = [];
  }
  const idx = local.boxSets[dispatchId].findIndex(s => s.boxSetNumber === boxSetData.boxSetNumber);
  if (idx >= 0) {
    local.boxSets[dispatchId][idx] = record;
  } else {
    local.boxSets[dispatchId].push(record);
  }
  saveLocalDB(local);
  return record;
}

// COMPANY TARGETS
export async function dbGetCompanyTargets() {
  try {
    const snap = await withTimeout(get(ref(db, 'targets')));
    if (snap.exists()) return snap.val();
  } catch (_err) {
    // fallback
  }
  const local = getLocalDB();
  return local.targets || { feedConsumption: FEED_CONSUMPTION_TARGETS, averageWeight: AVERAGE_WEIGHT_TARGETS };
}

export async function dbSaveCompanyTargets(targets) {
  try {
    await withTimeout(set(ref(db, 'targets'), targets));
  } catch (_err) {
    // fallback
  }

  const local = getLocalDB();
  local.targets = targets;
  saveLocalDB(local);
}

// INVOICE HISTORY
export async function dbGetInvoices() {
  try {
    const snap = await withTimeout(get(ref(db, 'invoices')));
    if (snap.exists()) return Array.isArray(snap.val()) ? snap.val() : Object.values(snap.val());
  } catch (_err) {
    // fallback
  }
  const local = getLocalDB();
  return local.invoices || [];
}

export async function dbSaveInvoice(invoiceData) {
  const invId = invoiceData.id || `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
  const record = {
    ...invoiceData,
    id: invId,
    createdAt: new Date().toISOString()
  };

  try {
    await withTimeout(push(ref(db, 'invoices'), record));
  } catch (_err) {
    // fallback
  }

  const local = getLocalDB();
  if (!local.invoices) local.invoices = [];
  local.invoices.push(record);
  saveLocalDB(local);
  return record;
}

// AUDIT LOGS
export async function dbGetAuditLogs() {
  try {
    const snap = await withTimeout(get(ref(db, 'auditLogs')));
    if (snap.exists()) return Array.isArray(snap.val()) ? snap.val() : Object.values(snap.val());
  } catch (_err) {
    // fallback
  }
  const local = getLocalDB();
  return local.auditLogs || [];
}

export async function dbLogAuditEvent(action, details, actorName = 'System User') {
  const logId = `log-${Date.now()}`;
  const record = {
    id: logId,
    action,
    details,
    actorName,
    timestamp: new Date().toISOString()
  };

  try {
    await withTimeout(push(ref(db, 'auditLogs'), record));
  } catch (_err) {
    // fallback
  }

  const local = getLocalDB();
  if (!local.auditLogs) local.auditLogs = [];
  local.auditLogs.unshift(record);
  if (local.auditLogs.length > 100) local.auditLogs = local.auditLogs.slice(0, 100);
  saveLocalDB(local);
}
