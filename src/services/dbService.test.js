import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  dbGetBatches,
  dbSaveBatch,
  dbDeleteBatch,
  dbSubscribeToBatches,
  dbForceSyncAll,
  dbSaveDailyRecord,
  dbDeleteDailyRecord,
  dbAddFeedArrival,
  dbDeleteFeedArrival,
  dbSaveDispatch,
  dbDeleteDispatch,
  dbAddMedicineRecord,
  dbDeleteMedicineRecord,
  dbGetMedicineRecords
} from './dbService';

describe('dbService Real-Time Synchronization', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('retrieves seeded batches on initial call and includes active batch KG006 with 4528 chicks', async () => {
    const batches = await dbGetBatches();
    expect(Array.isArray(batches)).toBe(true);
    expect(batches.length).toBeGreaterThan(0);
    const kg006 = batches.find(b => b.id === 'KG006');
    expect(kg006).toBeDefined();
    expect(kg006.batchNumber).toBe('KG006');
    expect(kg006.status).toBe('Active');
    expect(kg006.initialChickCount).toBe(4528);
    expect(kg006.remainingChickCount).toBe(4528);
  });

  it('migrates legacy v7 localStorage data and preserves both custom records and KG006', async () => {
    localStorage.clear();
    // Simulate older device with v7 storage
    localStorage.setItem('kg_poultry_local_db_v7', JSON.stringify({
      batches: {
        'CUSTOM-B1': { id: 'CUSTOM-B1', batchNumber: 'CUSTOM-B1', batchName: 'Custom Farm Batch', status: 'Active', initialChickCount: 1000 }
      }
    }));

    const batches = await dbGetBatches();
    const custom = batches.find(b => b.id === 'CUSTOM-B1');
    const kg006 = batches.find(b => b.id === 'KG006');
    expect(custom).toBeDefined();
    expect(kg006).toBeDefined();
    expect(localStorage.getItem('kg_poultry_local_db_v7')).toBeNull(); // v7 cleaned up
    expect(localStorage.getItem('kg_poultry_local_db_v8')).not.toBeNull(); // v8 created
  });

  it('immediately notifies dbSubscribeToBatches subscribers with current state', async () => {
    const received = [];
    const unsubscribe = dbSubscribeToBatches((batches) => {
      received.push(batches);
    });

    expect(received.length).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(received[0])).toBe(true);
    unsubscribe();
  });

  it('pushes real-time updates to all subscribers when a batch is created or updated', async () => {
    const updates = [];
    const unsubscribe = dbSubscribeToBatches((batches) => {
      updates.push(batches);
    });

    const testBatch = {
      id: 'KG-TEST-SYNC',
      batchNumber: 'KG-TEST-SYNC',
      batchName: 'KgPoultryBatch-TestSync',
      chickArrivalDate: '2026-10-27',
      initialChickCount: 5000,
      remainingChickCount: 5000,
      status: 'Active'
    };

    await dbSaveBatch(testBatch);

    // Verify subscriber was notified with the updated batch
    const latestBatches = updates[updates.length - 1];
    const found = latestBatches.find(b => b.id === 'KG-TEST-SYNC');
    expect(found).toBeDefined();
    expect(found.batchName).toBe('KgPoultryBatch-TestSync');
    expect(found.status).toBe('Active');

    // Now update the batch (e.g. change status to Completed)
    await dbSaveBatch({ ...testBatch, status: 'Completed', batchName: 'KgPoultryBatch-Updated' });

    const finalBatches = updates[updates.length - 1];
    const updatedFound = finalBatches.find(b => b.id === 'KG-TEST-SYNC');
    expect(updatedFound).toBeDefined();
    expect(updatedFound.batchName).toBe('KgPoultryBatch-Updated');
    expect(updatedFound.status).toBe('Completed');

    unsubscribe();
  });

  it('notifies subscribers in real-time when a batch is deleted', async () => {
    const updates = [];

    const testBatch = {
      id: 'KG-TO-DELETE',
      batchNumber: 'KG-TO-DELETE',
      batchName: 'Batch To Delete',
      status: 'Active'
    };
    await dbSaveBatch(testBatch);

    const unsubscribe = dbSubscribeToBatches((batches) => {
      updates.push(batches);
    });

    await dbDeleteBatch('KG-TO-DELETE');

    const latest = updates[updates.length - 1];
    const deletedFound = latest.find(b => b.id === 'KG-TO-DELETE');
    expect(deletedFound).toBeUndefined();

    unsubscribe();
  });

  it('dbDeleteBatch cascades and completely removes dailyRecords, feedStocks, medicineRecords, dispatches, invoices and user assignments', async () => {
    // Seed related data for batch KG-CASCADE-TEST in localStorage
    const raw = localStorage.getItem('kg_poultry_local_db_v8') || '{}';
    const db = JSON.parse(raw);
    db.batches = db.batches || {};
    db.batches['KG-CASCADE-TEST'] = { id: 'KG-CASCADE-TEST', batchNumber: 'KG-CASCADE-TEST', status: 'Completed' };
    db.dailyRecords = db.dailyRecords || {};
    db.dailyRecords['KG-CASCADE-TEST'] = { '2026-10-20': { mortalityCount: 2, feedConsumption: 50 } };
    db.feedStocks = db.feedStocks || {};
    db.feedStocks['KG-CASCADE-TEST'] = [{ id: 'f-1', feedType: 'Pre-Starter', quantityReceivedKg: 700 }];
    db.medicineRecords = db.medicineRecords || {};
    db.medicineRecords['KG-CASCADE-TEST'] = [{ id: 'm-1', medicineName: 'Vaccine 1' }];
    db.dispatches = db.dispatches || {};
    db.dispatches['disp-cascade-1'] = { id: 'disp-cascade-1', batchId: 'KG-CASCADE-TEST', totalWeight: 1200 };
    db.boxSets = db.boxSets || {};
    db.boxSets['disp-cascade-1'] = [{ boxNumber: 1, weight: 25 }];
    db.invoices = db.invoices || [];
    if (Array.isArray(db.invoices)) {
      db.invoices.push({ id: 'inv-cascade-1', batchId: 'KG-CASCADE-TEST', dispatchId: 'disp-cascade-1' });
    }
    db.users = db.users || {};
    db.users['u-1'] = { uid: 'u-1', assignedBatches: ['KG-CASCADE-TEST', 'KG006'] };

    localStorage.setItem('kg_poultry_local_db_v8', JSON.stringify(db));

    // Execute deletion
    await dbDeleteBatch('KG-CASCADE-TEST');

    // Verify complete cascade deletion from local storage
    const updated = JSON.parse(localStorage.getItem('kg_poultry_local_db_v8'));
    expect(updated.batches['KG-CASCADE-TEST']).toBeUndefined();
    expect(updated.dailyRecords['KG-CASCADE-TEST']).toBeUndefined();
    expect(updated.feedStocks['KG-CASCADE-TEST']).toBeUndefined();
    expect(updated.medicineRecords['KG-CASCADE-TEST']).toBeUndefined();
    expect(updated.dispatches['disp-cascade-1']).toBeUndefined();
    expect(updated.boxSets['disp-cascade-1']).toBeUndefined();
    if (Array.isArray(updated.invoices)) {
      expect(updated.invoices.find(inv => inv.batchId === 'KG-CASCADE-TEST')).toBeUndefined();
    }
    expect(updated.users['u-1'].assignedBatches).not.toContain('KG-CASCADE-TEST');
    expect(updated.users['u-1'].assignedBatches).toContain('KG006');
  });

  it('dbForceSyncAll triggers notification to subscribers', async () => {
    let notifiedCount = 0;
    const unsubscribe = dbSubscribeToBatches(() => {
      notifiedCount++;
    });

    const initialCount = notifiedCount;
    await dbForceSyncAll();
    expect(notifiedCount).toBeGreaterThan(initialCount);

    unsubscribe();
  });

  it('updates and rolls back remaining live birds and feed stock when daily records are added, edited, and deleted', async () => {
    const testBatchId = 'KG-ROLLBACK-TEST';
    await dbSaveBatch({
      id: testBatchId,
      batchNumber: testBatchId,
      batchName: 'Rollback Batch',
      status: 'Active',
      initialChickCount: 5000,
      chickArrivalDate: '2026-10-01'
    });

    // 1. Add 10 bags of Pre-Starter feed (700 kg)
    await dbAddFeedArrival(testBatchId, {
      id: 'feed-init-1',
      feedType: 'Pre-Starter',
      bagsReceived: 10,
      quantityReceivedKg: 700,
      date: '2026-10-01'
    });

    let batches = await dbGetBatches();
    let batch = batches.find(b => b.id === testBatchId);
    expect(batch.remainingChickCount).toBe(5000);
    expect(batch.feedStock['Pre-Starter']).toBe(700);

    // 2. Log Day 1 record: 20 mortality, 2 bags feed (140 kg)
    await dbSaveDailyRecord(testBatchId, '2026-10-02', {
      mortalityCount: 20,
      feedConsumption: 140,
      feedConsumptionBags: 2,
      averageWeight: 75
    });

    batches = await dbGetBatches();
    batch = batches.find(b => b.id === testBatchId);
    expect(batch.remainingChickCount).toBe(4980); // 5000 - 20
    expect(batch.feedStock['Pre-Starter']).toBe(560); // 700 - 140

    // 3. EDIT Day 1 record: update mortality from 20 to 5, and feed from 140kg to 70kg (1 bag)
    await dbSaveDailyRecord(testBatchId, '2026-10-02', {
      mortalityCount: 5,
      feedConsumption: 70,
      feedConsumptionBags: 1,
      averageWeight: 78
    });

    batches = await dbGetBatches();
    batch = batches.find(b => b.id === testBatchId);
    // Verified: Remaining live chicks roll back from 4980 to 4995!
    expect(batch.remainingChickCount).toBe(4995); // 5000 - 5
    // Verified: Feed stock rolls back from 560kg to 630kg!
    expect(batch.feedStock['Pre-Starter']).toBe(630); // 700 - 70

    // 4. DELETE Day 1 record: mortality and feed should roll back 100% to initial state!
    await dbDeleteDailyRecord(testBatchId, '2026-10-02');

    batches = await dbGetBatches();
    batch = batches.find(b => b.id === testBatchId);
    // Verified: Remaining live chicks roll back completely to 5000!
    expect(batch.remainingChickCount).toBe(5000);
    // Verified: Feed stock rolls back completely to 700kg!
    expect(batch.feedStock['Pre-Starter']).toBe(700);

    // Cleanup
    await dbDeleteBatch(testBatchId);
  });

  it('updates and rolls back remaining live birds when dispatches are added and deleted', async () => {
    const testBatchId = 'KG-DISPATCH-ROLLBACK';
    await dbSaveBatch({
      id: testBatchId,
      batchNumber: testBatchId,
      status: 'Active',
      initialChickCount: 4000,
      chickArrivalDate: '2026-10-01'
    });

    // Initial state: 4000 chicks
    let batches = await dbGetBatches();
    let batch = batches.find(b => b.id === testBatchId);
    expect(batch.remainingChickCount).toBe(4000);

    // 1. Create a dispatch of 500 birds
    const dispatchId = 'disp-test-rb-1';
    await dbSaveDispatch({
      id: dispatchId,
      batchId: testBatchId,
      vehicleNumber: 'TN-01-AB-1234',
      totalBirds: 500,
      birdsCount: 500,
      status: 'Completed'
    });

    batches = await dbGetBatches();
    batch = batches.find(b => b.id === testBatchId);
    expect(batch.remainingChickCount).toBe(3500); // 4000 - 500

    // 2. Delete the dispatch -> remaining live birds roll back to 4000!
    await dbDeleteDispatch(dispatchId);

    batches = await dbGetBatches();
    batch = batches.find(b => b.id === testBatchId);
    expect(batch.remainingChickCount).toBe(4000);

    // Cleanup
    await dbDeleteBatch(testBatchId);
  });

  it('updates and rolls back feed stock when feed arrivals are edited and deleted', async () => {
    const testBatchId = 'KG-FEED-ROLLBACK';
    await dbSaveBatch({
      id: testBatchId,
      batchNumber: testBatchId,
      status: 'Active',
      initialChickCount: 3000
    });

    // 1. Add 5 bags (350 kg)
    const feedId = 'feed-rb-1';
    await dbAddFeedArrival(testBatchId, {
      id: feedId,
      feedType: 'Starter',
      bagsReceived: 5,
      quantityReceivedKg: 350
    });

    let batches = await dbGetBatches();
    let batch = batches.find(b => b.id === testBatchId);
    expect(batch.feedStock['Starter']).toBe(350);

    // 2. Edit feed arrival: change from 5 bags (350kg) to 8 bags (560kg)
    await dbAddFeedArrival(testBatchId, {
      id: feedId,
      feedType: 'Starter',
      bagsReceived: 8,
      quantityReceivedKg: 560
    });

    batches = await dbGetBatches();
    batch = batches.find(b => b.id === testBatchId);
    expect(batch.feedStock['Starter']).toBe(560);

    // 3. Delete feed arrival -> feed stock rolls back to 0
    await dbDeleteFeedArrival(testBatchId, feedId);

    batches = await dbGetBatches();
    batch = batches.find(b => b.id === testBatchId);
    expect(batch.feedStock['Starter']).toBe(0);

    // Cleanup
    await dbDeleteBatch(testBatchId);
  });

  it('handles dbAddMedicineRecord and dbDeleteMedicineRecord safely even when stored data is an object map', async () => {
    const testBatchId = 'KG-MED-TEST';
    await dbSaveBatch({
      id: testBatchId,
      batchNumber: testBatchId,
      status: 'Active',
      initialChickCount: 3000
    });

    // Simulate Firebase Realtime DB returning an object map rather than an array for medicineRecords
    const raw = localStorage.getItem('kg_poultry_local_db_v8') || '{}';
    const db = JSON.parse(raw);
    db.medicineRecords = db.medicineRecords || {};
    db.medicineRecords[testBatchId] = {
      'med-existing-1': {
        id: 'med-existing-1',
        medicineName: 'Existing Vitamin A',
        medicineQuantity: '500',
        medicineUnit: 'ml',
        date: '2026-10-20'
      }
    };
    localStorage.setItem('kg_poultry_local_db_v8', JSON.stringify(db));

    // Adding another medicine record should NOT throw "findIndex is not a function"
    const newRecord = await dbAddMedicineRecord(testBatchId, {
      medicineName: 'Antibiotic B',
      medicineQuantity: '200',
      medicineUnit: 'ml',
      date: '2026-10-21'
    });

    expect(newRecord).toBeDefined();
    expect(newRecord.medicineName).toBe('Antibiotic B');

    // Retrieve medicine records
    const list = await dbGetMedicineRecords(testBatchId);
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBe(2);

    // Delete one medicine record
    await dbDeleteMedicineRecord(testBatchId, 'med-existing-1');
    const updatedList = await dbGetMedicineRecords(testBatchId);
    expect(updatedList.length).toBe(1);
    expect(updatedList[0].medicineName).toBe('Antibiotic B');

    // Cleanup
    await dbDeleteBatch(testBatchId);
  });
});
