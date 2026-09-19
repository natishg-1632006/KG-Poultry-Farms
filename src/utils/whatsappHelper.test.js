import { describe, it, expect, vi } from 'vitest';
import {
  SUPERVISOR_WHATSAPP_NUMBER,
  FARM_WHATSAPP_HEADING,
  calculateFlockAgeDay,
  formatWhatsAppMessage,
  sendToSupervisorWhatsApp
} from './whatsappHelper';

describe('WhatsApp Supervisor Integration Helper', () => {
  it('correctly calculates flock age day', () => {
    const arrival = '2026-09-01';
    const recordDate = '2026-09-14';
    expect(calculateFlockAgeDay(arrival, recordDate)).toBe(14);
  });

  it('formats WhatsApp message with exact heading and structure required by farmer', () => {
    const record = {
      recordDate: '2026-09-19',
      mortalityCount: 5,
      feedConsumptionBags: 10,
      additionalLooseKg: 20,
      feedConsumption: 520,
      averageWeight: 650
    };
    const arrivalDate = '2026-09-06';

    const msg = formatWhatsAppMessage(record, arrivalDate);

    expect(msg).toContain(`🐔 ${FARM_WHATSAPP_HEADING}`);
    expect(msg).toContain('📆 Current day: Day 14');
    expect(msg).toContain('📅 date: 2026-09-19');
    expect(msg).toContain('⚠️ mortality: 5');
    expect(msg).toContain('🌾 Feed consumed: 10 Bags & 20 kg (520 kg)');
    expect(msg).toContain('⚖️ Avg. Weight: 650 g');
  });

  it('handles feed without loose kg cleanly', () => {
    const record = {
      recordDate: '2026-09-19',
      mortalityCount: 2,
      feedConsumptionBags: 5,
      additionalLooseKg: 0,
      feedConsumption: 250,
      averageWeight: 300
    };

    const msg = formatWhatsAppMessage(record, '2026-09-19');
    expect(msg).toContain('Feed consumed: 5 Bags (250 kg)');
  });

  it('generates supervisor WhatsApp deep link with number 9500979771', () => {
    const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    const record = {
      recordDate: '2026-09-19',
      mortalityCount: 3,
      feedConsumptionBags: 8,
      averageWeight: 450
    };

    const waUrl = sendToSupervisorWhatsApp(record, '2026-09-10');

    expect(waUrl).toContain(`https://wa.me/${SUPERVISOR_WHATSAPP_NUMBER}`);
    expect(waUrl).toContain(encodeURIComponent('Gopalakrishanan poultry farm, Thathaiyangarpatti'));
    expect(windowOpenSpy).toHaveBeenCalledWith(waUrl, '_blank');

    windowOpenSpy.mockRestore();
  });
});
