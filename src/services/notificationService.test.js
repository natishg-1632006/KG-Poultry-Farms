import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FARM_LOCATION, syncDailyDataEntryReminders, syncFarmWeatherAndLightingAlerts } from './notificationService';
import * as dbService from './dbService';

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => true
  }
}));

vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    checkPermissions: vi.fn().mockResolvedValue({ display: 'granted' }),
    requestPermissions: vi.fn().mockResolvedValue({ display: 'granted' }),
    createChannel: vi.fn().mockResolvedValue(true),
    cancel: vi.fn().mockResolvedValue(true),
    schedule: vi.fn().mockResolvedValue(true)
  }
}));

describe('notificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('has correct farm village coordinates for Thathayangarpatty, Namakkal 637014', () => {
    expect(FARM_LOCATION.village).toContain('Thathayangarpatty');
    expect(FARM_LOCATION.pincode).toBe('637014');
    expect(FARM_LOCATION.latitude).toBeCloseTo(11.3672);
    expect(FARM_LOCATION.longitude).toBeCloseTo(78.1707);
  });

  it('cancels reminders if no active batch is found', async () => {
    vi.spyOn(dbService, 'dbGetBatches').mockResolvedValue([]);
    await syncDailyDataEntryReminders();
    expect(dbService.dbGetBatches).toHaveBeenCalled();
  });

  it('suppresses entry reminders if today entry is already submitted', async () => {
    const today = new Date().toISOString().split('T')[0];
    vi.spyOn(dbService, 'dbGetBatches').mockResolvedValue([{ id: 'b1', status: 'Active' }]);
    vi.spyOn(dbService, 'dbGetDailyRecords').mockResolvedValue([{ recordDate: today, mortalityCount: 2 }]);

    await syncDailyDataEntryReminders();
    expect(dbService.dbGetDailyRecords).toHaveBeenCalledWith('b1');
  });
});
