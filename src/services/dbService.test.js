import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dbGetBatches, dbSaveBatch, dbDeleteBatch, dbSubscribeToBatches, dbForceSyncAll } from './dbService';

describe('dbService Real-Time Synchronization', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('retrieves seeded batches on initial call', async () => {
    const batches = await dbGetBatches();
    expect(Array.isArray(batches)).toBe(true);
    expect(batches.length).toBeGreaterThan(0);
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
});
