import { ref, get, set, update, remove, push, child } from 'firebase/database';
import { db } from './firebase';
import { FEED_CONSUMPTION_TARGETS, AVERAGE_WEIGHT_TARGETS } from '../constants/companyTargets';
import { deductFeedStock } from '../utils/calculations';

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
      assignedBatches: ['KG001', 'KG002'],
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
        quantityReceivedKg: 500,
        bagsReceived: 7.1,
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
        quantityReceivedKg: 1000,
        bagsReceived: 14.3,
        date: '2026-09-05',
        notes: 'Starter feed arrival',
        createdAt: new Date().toISOString()
      }
    ]
  },
  medicineRecords: {},
  dispatches: {},
  boxSets: {},
  targets: {
    feedConsumption: FEED_CONSUMPTION_TARGETS,
    averageWeight: AVERAGE_WEIGHT_TARGETS
  },
  invoices: [],
  auditLogs: []
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

/**
 * Dynamically computes live feed stock pool for a batch from all feed arrivals minus daily consumption
 */
export function computeBatchFeedStock(batchId, local = getLocalDB()) {
  const stock = { 'Pre-Starter': 0, 'Starter': 0, 'Finisher': 0 };

  const arrivals = (local.feedStocks[batchId] || []).map(a => ({
    eventType: 'ARRIVAL',
    transactionType: a.transactionType || 'Receive',
    timeKey: a.createdAt || a.date || '2000-01-01',
    date: a.date || (a.createdAt ? a.createdAt.split('T')[0] : '2000-01-01'),
    feedType: a.feedType || 'Pre-Starter',
    kg: Number(a.quantityReceivedKg ?? a.quantityReceived ?? ((Number(a.bagsReceived || 0) * 70) + Number(a.additionalKg || 0)))
  }));

  const dailyMap = local.dailyRecords[batchId] || {};
  const dailyRecords = Object.values(dailyMap).map(r => ({
    eventType: 'DAILY_LOG',
    timeKey: r.createdAt || r.updatedAt || r.recordDate || '2000-01-01',
    date: r.recordDate || (r.createdAt ? r.createdAt.split('T')[0] : '2000-01-01'),
    kg: Number(r.feedConsumption || 0)
  }));

  const events = [...arrivals, ...dailyRecords].sort((a, b) => {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    return (a.timeKey || '').localeCompare(b.timeKey || '');
  });

  events.forEach(evt => {
    if (evt.eventType === 'ARRIVAL') {
      const fType = evt.feedType || 'Pre-Starter';
      if (evt.transactionType === 'Return') {
        stock[fType] = Math.max(0, (stock[fType] || 0) - evt.kg);
      } else {
        stock[fType] = (stock[fType] || 0) + evt.kg;
      }
    } else if (evt.eventType === 'DAILY_LOG' && evt.kg > 0) {
      const deductionResult = deductFeedStock(stock, null, evt.kg);
      stock['Pre-Starter'] = deductionResult.updatedStock['Pre-Starter'];
      stock['Starter'] = deductionResult.updatedStock['Starter'];
      stock['Finisher'] = deductionResult.updatedStock['Finisher'];
    }
  });

  return {
    'Pre-Starter': parseFloat(stock['Pre-Starter'].toFixed(2)),
    'Starter': parseFloat(stock['Starter'].toFixed(2)),
    'Finisher': parseFloat(stock['Finisher'].toFixed(2))
  };
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
  const local = getLocalDB();
  try {
    const snap = await withTimeout(get(ref(db, 'batches')));
    if (snap.exists()) {
      const fbBatches = Object.values(snap.val());
      return fbBatches.map(b => ({
        ...b,
        feedStock: computeBatchFeedStock(b.id, local)
      }));
    }
  } catch (_err) {
    // fallback
  }

  return Object.values(local.batches || {}).map(b => ({
    ...b,
    feedStock: computeBatchFeedStock(b.id, local)
  }));
}

export async function dbSaveBatch(batchData) {
  const batchId = batchData.id || batchData.batchNumber;
  const local = getLocalDB();
  const calculatedStock = computeBatchFeedStock(batchId, local);

  const record = {
    ...batchData,
    id: batchId,
    feedStock: calculatedStock,
    updatedAt: new Date().toISOString()
  };

  try {
    await withTimeout(set(ref(db, `batches/${batchId}`), record));
  } catch (_err) {
    // fallback
  }

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
    const totalMortality = Object.values(local.dailyRecords[batchId]).reduce((sum, r) => sum + Number(r.mortalityCount || 0), 0);
    const initialChicks = Number(local.batches[batchId].initialChickCount || 5000);
    const remaining = Math.max(0, initialChicks - totalMortality);

    local.batches[batchId].remainingChickCount = remaining;
    local.batches[batchId].feedStock = computeBatchFeedStock(batchId, local);

    try {
      await withTimeout(set(ref(db, `batches/${batchId}/remainingChickCount`), remaining));
      await withTimeout(set(ref(db, `batches/${batchId}/feedStock`), local.batches[batchId].feedStock));
    } catch (_e) {
      // fallback
    }
  }

  saveLocalDB(local);
  return record;
}

export async function dbDeleteDailyRecord(batchId, recordDate) {
  try {
    await withTimeout(remove(ref(db, `dailyRecords/${batchId}/${recordDate}`)));
  } catch (_err) {
    // fallback
  }

  const local = getLocalDB();
  if (local.dailyRecords[batchId]) {
    delete local.dailyRecords[batchId][recordDate];
  }

  if (local.batches[batchId]) {
    const totalMortality = Object.values(local.dailyRecords[batchId] || {}).reduce((sum, r) => sum + Number(r.mortalityCount || 0), 0);
    const initialChicks = Number(local.batches[batchId].initialChickCount || 5000);
    const remaining = Math.max(0, initialChicks - totalMortality);

    local.batches[batchId].remainingChickCount = remaining;
    local.batches[batchId].feedStock = computeBatchFeedStock(batchId, local);

    try {
      await withTimeout(set(ref(db, `batches/${batchId}/remainingChickCount`), remaining));
      await withTimeout(set(ref(db, `batches/${batchId}/feedStock`), local.batches[batchId].feedStock));
    } catch (_e) {
      // fallback
    }
  }

  saveLocalDB(local);
}

// FEED MANAGEMENT
export async function dbGetFeedArrivals(batchId) {
  const local = getLocalDB();
  try {
    const snap = await withTimeout(get(ref(db, `feedStocks/${batchId}`)));
    if (snap.exists()) {
      const val = snap.val();
      const list = (Array.isArray(val) ? val : Object.values(val)).filter(Boolean);
      local.feedStocks[batchId] = list;
      if (local.batches[batchId]) {
        local.batches[batchId].feedStock = computeBatchFeedStock(batchId, local);
      }
      saveLocalDB(local);
      return list;
    }
  } catch (_err) {
    // fallback
  }
  return local.feedStocks[batchId] || [];
}

export async function dbAddFeedArrival(batchId, feedData) {
  const feedId = feedData.id || `feed-${Date.now()}`;
  const record = {
    ...feedData,
    id: feedId,
    batchId,
    createdAt: feedData.createdAt || new Date().toISOString()
  };

  const local = getLocalDB();
  if (!local.feedStocks[batchId]) {
    local.feedStocks[batchId] = [];
  }
  const idx = local.feedStocks[batchId].findIndex(f => f.id === feedId);
  if (idx >= 0) {
    local.feedStocks[batchId][idx] = record;
  } else {
    local.feedStocks[batchId].push(record);
  }

  if (!local.batches[batchId]) {
    local.batches[batchId] = {
      id: batchId,
      batchNumber: batchId,
      batchName: `KgPoultryBatch-${batchId.replace('KG', '')}`,
      chickArrivalDate: new Date().toISOString().split('T')[0],
      initialChickCount: 5000,
      remainingChickCount: 5000,
      status: 'Active'
    };
  }

  const calculatedStock = computeBatchFeedStock(batchId, local);
  local.batches[batchId].feedStock = calculatedStock;
  saveLocalDB(local);

  try {
    await withTimeout(set(ref(db, `feedStocks/${batchId}/${feedId}`), record));
    await withTimeout(set(ref(db, `batches/${batchId}/feedStock`), calculatedStock));
  } catch (_err) {
    // fallback
  }

  return record;
}

export async function dbDeleteFeedArrival(batchId, feedId) {
  const local = getLocalDB();
  if (local.feedStocks[batchId]) {
    local.feedStocks[batchId] = local.feedStocks[batchId].filter(f => f.id !== feedId);
  }

  const calculatedStock = computeBatchFeedStock(batchId, local);
  if (local.batches[batchId]) {
    local.batches[batchId].feedStock = calculatedStock;
  }
  saveLocalDB(local);

  try {
    await withTimeout(remove(ref(db, `feedStocks/${batchId}/${feedId}`)));
    await withTimeout(set(ref(db, `feedStocks/${batchId}`), local.feedStocks[batchId]));
    await withTimeout(set(ref(db, `batches/${batchId}/feedStock`), calculatedStock));
  } catch (_err) {
    // fallback
  }
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
  const recordId = recordData.id || `med-${Date.now()}`;
  const record = {
    ...recordData,
    id: recordId,
    batchId,
    createdAt: recordData.createdAt || new Date().toISOString()
  };

  try {
    await withTimeout(set(ref(db, `medicineRecords/${batchId}/${recordId}`), record));
  } catch (_err) {
    // fallback
  }

  const local = getLocalDB();
  if (!local.medicineRecords[batchId]) {
    local.medicineRecords[batchId] = [];
  }
  const idx = local.medicineRecords[batchId].findIndex(m => m.id === recordId);
  if (idx >= 0) {
    local.medicineRecords[batchId][idx] = record;
  } else {
    local.medicineRecords[batchId].push(record);
  }
  saveLocalDB(local);
  return record;
}

export async function dbDeleteMedicineRecord(batchId, recordId) {
  try {
    await withTimeout(remove(ref(db, `medicineRecords/${batchId}/${recordId}`)));
  } catch (_err) {
    // fallback
  }

  const local = getLocalDB();
  if (local.medicineRecords[batchId]) {
    local.medicineRecords[batchId] = local.medicineRecords[batchId].filter(m => m.id !== recordId);
  }
  saveLocalDB(local);
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

export async function dbDeleteDispatch(dispatchId) {
  try {
    await withTimeout(remove(ref(db, `dispatches/${dispatchId}`)));
    await withTimeout(remove(ref(db, `boxSets/${dispatchId}`)));
  } catch (_err) {
    // fallback
  }

  const local = getLocalDB();
  delete local.dispatches[dispatchId];
  delete local.boxSets[dispatchId];
  saveLocalDB(local);
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

export async function dbDeleteBoxSet(dispatchId, setId) {
  try {
    await withTimeout(remove(ref(db, `boxSets/${dispatchId}/${setId}`)));
  } catch (_err) {
    // fallback
  }

  const local = getLocalDB();
  if (local.boxSets[dispatchId]) {
    local.boxSets[dispatchId] = local.boxSets[dispatchId].filter(s => s.id !== setId && s.boxSetNumber !== setId);
  }
  saveLocalDB(local);
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
