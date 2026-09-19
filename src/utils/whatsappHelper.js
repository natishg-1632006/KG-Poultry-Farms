import { KG_PER_BAG } from '../constants/companyTargets';

export const SUPERVISOR_WHATSAPP_NUMBER = '919500979771';
export const FARM_WHATSAPP_HEADING = 'Gopalakrishanan poultry farm, Thathaiyangarpatti';

export const calculateFlockAgeDay = (arrivalDateStr, recordDateStr) => {
  if (arrivalDateStr && recordDateStr) {
    const arrivalDate = new Date(arrivalDateStr);
    const recDate = new Date(recordDateStr);
    const diffMs = Math.max(0, recDate.getTime() - arrivalDate.getTime());
    return Math.min(45, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1);
  }
  return 1;
};

export const formatWhatsAppMessage = (record, arrivalDateStr) => {
  if (!record) return '';

  const ageDay = calculateFlockAgeDay(arrivalDateStr, record.recordDate);
  const bags = record.feedConsumptionBags !== undefined ? record.feedConsumptionBags : (record.feedConsumption ? Math.floor(record.feedConsumption / KG_PER_BAG) : 0);
  const looseKg = record.additionalLooseKg !== undefined && record.additionalLooseKg !== null ? record.additionalLooseKg : (record.feedConsumption ? parseFloat((record.feedConsumption % KG_PER_BAG).toFixed(1)) : 0);
  const totalKg = Number(record.feedConsumption || ((bags * KG_PER_BAG) + looseKg));

  let feedText = `${bags} Bags`;
  if (looseKg > 0) {
    feedText += ` & ${looseKg} kg`;
  }
  if (totalKg > 0) {
    feedText += ` (${totalKg} kg)`;
  }

  // Unicode escape codes guarantee 100% UTF-8 bundling across Windows codepages and WebViews
  return `\u{1F414} ${FARM_WHATSAPP_HEADING}
\u{1F4C6} Current day: Day ${ageDay}
\u{1F4C5} date: ${record.recordDate || ''}
\u{26A0}\u{FE0F} mortality: ${record.mortalityCount !== undefined ? record.mortalityCount : 0}
\u{1F33E} Feed consumed: ${feedText}
\u{2696}\u{FE0F} Avg. Weight: ${record.averageWeight !== undefined ? record.averageWeight : 0} g`;
};

export const sendToSupervisorWhatsApp = (record, arrivalDateStr) => {
  if (!record) return;
  const message = formatWhatsAppMessage(record, arrivalDateStr);
  const waUrl = `https://wa.me/${SUPERVISOR_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  if (typeof window !== 'undefined') {
    window.open(waUrl, '_blank');
  }
  return waUrl;
};
