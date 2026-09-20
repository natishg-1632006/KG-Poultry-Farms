/**
 * Calculation engine for KG Poultry Farms Management System
 */

import { FEED_DEDUCTION_ORDER, KG_PER_BAG } from '../constants/companyTargets';

/**
 * Convert feed bags to kilograms
 * @param {number} bags 
 * @param {number} [kgPerBag=70] 
 * @returns {number}
 */
export function bagsToKg(bags, kgPerBag = KG_PER_BAG) {
  const b = Number(bags) || 0;
  return parseFloat((b * kgPerBag).toFixed(2));
}

/**
 * Convert kilograms to feed bags
 * @param {number} kg 
 * @param {number} [kgPerBag=70] 
 * @returns {number}
 */
export function kgToBags(kg, kgPerBag = KG_PER_BAG) {
  const k = Number(kg) || 0;
  return parseFloat((k / kgPerBag).toFixed(1));
}

/**
 * Format feed stock string cleanly in Bags only
 * @param {number} kgAmount 
 * @returns {string} e.g. "7.1 Bags"
 */
export function formatFeedStock(kgAmount) {
  const k = Number(kgAmount) || 0;
  const bags = parseFloat((k / KG_PER_BAG).toFixed(1));
  return `${bags} Bags`;
}

/**
 * Calculates remaining chicken count after mortality
 * @param {number} previousRemaining 
 * @param {number} mortalityCount 
 * @returns {number}
 */
export function calculateRemainingChickens(previousRemaining, mortalityCount) {
  const prev = Number(previousRemaining) || 0;
  const mort = Number(mortalityCount) || 0;

  if (mort < 0) {
    throw new Error('Mortality count cannot be negative.');
  }

  if (mort > prev) {
    throw new Error(`Mortality count (${mort}) cannot exceed remaining chicken count (${prev}).`);
  }

  return prev - mort;
}

/**
 * Total chicken count from box count and count per box
 * @param {number} totalBoxCount 
 * @param {number} chickenCountPerBox 
 * @returns {number}
 */
export function calculateTotalChickenCount(totalBoxCount, chickenCountPerBox) {
  const boxes = Number(totalBoxCount) || 0;
  const perBox = Number(chickenCountPerBox) || 0;
  return Math.max(0, boxes * perBox);
}

/**
 * Box set weight calculations
 * @param {number} loadedWeight 
 * @param {number} emptyBoxWeight 
 * @param {number} chickenCount 
 * @returns {{ totalChickenWeight: number, averageChickenWeight: number }}
 */
export function calculateBoxSetWeights(loadedWeight, emptyBoxWeight = 5, chickenCount = 0) {
  const loaded = Number(loadedWeight) || 0;
  const empty = Number(emptyBoxWeight) || 0;
  const count = Number(chickenCount) || 0;

  const totalChickenWeight = loaded > 0 ? Math.max(0, parseFloat((loaded - empty).toFixed(2))) : 0;
  const averageChickenWeight = count > 0 && loaded > 0 
    ? parseFloat((totalChickenWeight / count).toFixed(3)) 
    : 0;

  return {
    totalChickenWeight,
    averageChickenWeight,
    isPendingLoad: !loaded || loaded <= 0
  };
}

/**
 * Validates record date against batch arrival date and current date
 * @param {string} dateStr YYYY-MM-DD
 * @param {string} arrivalDateStr YYYY-MM-DD
 * @param {string} [todayStr] YYYY-MM-DD
 * @returns {{ valid: boolean, message?: string }}
 */
export function validateRecordDate(dateStr, arrivalDateStr, todayStr = new Date().toISOString().split('T')[0]) {
  if (!dateStr) {
    return { valid: false, message: 'Record date is required.' };
  }

  if (arrivalDateStr) {
    const arrDate = new Date(arrivalDateStr);
    arrDate.setDate(arrDate.getDate() + 1);
    const minRecordDate = arrDate.toISOString().split('T')[0];
    if (dateStr < minRecordDate) {
      return { valid: false, message: `Daily record entries start from Day 1 (${minRecordDate}).` };
    }
  }

  if (dateStr > todayStr) {
    return { valid: false, message: 'Future dates are not allowed.' };
  }

  return { valid: true };
}

/**
 * Calculates day index of batch (Day 1 for next day after arrival)
 * @param {string} arrivalDateStr YYYY-MM-DD
 * @param {string} recordDateStr YYYY-MM-DD
 * @returns {number}
 */
export function calculateDayOfBatch(arrivalDateStr, recordDateStr) {
  if (!arrivalDateStr || !recordDateStr) return 1;
  const arrival = new Date(arrivalDateStr);
  const record = new Date(recordDateStr);
  const diffTime = record.getTime() - arrival.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 3600 * 24));
  return Math.max(1, diffDays);
}

/**
 * Deducts feed consumption following strict deduction order: Pre-Starter -> Starter -> Finisher
 * @param {Object} currentStock { 'Pre-Starter': number, 'Starter': number, 'Finisher': number }
 * @param {string} specifiedFeedType Optional feed type if user specifies exact feed used
 * @param {number} consumptionAmount Amount in kg
 * @returns {{ updatedStock: Object, deductedByType: Object }}
 */
export function deductFeedStock(currentStock = {}, specifiedFeedType = null, consumptionAmount = 0) {
  const stock = {
    'Pre-Starter': Number(currentStock['Pre-Starter']) || 0,
    'Starter': Number(currentStock['Starter']) || 0,
    'Finisher': Number(currentStock['Finisher']) || 0
  };

  let remainingToDeduct = Number(consumptionAmount) || 0;
  const deductedByType = {
    'Pre-Starter': 0,
    'Starter': 0,
    'Finisher': 0
  };

  if (specifiedFeedType && stock[specifiedFeedType] !== undefined) {
    const available = stock[specifiedFeedType];
    const deduct = Math.min(available, remainingToDeduct);
    stock[specifiedFeedType] -= deduct;
    deductedByType[specifiedFeedType] += deduct;
    remainingToDeduct -= deduct;
  }

  if (remainingToDeduct > 0) {
    for (const type of FEED_DEDUCTION_ORDER) {
      if (remainingToDeduct <= 0) break;
      const available = stock[type];
      if (available > 0) {
        const deduct = Math.min(available, remainingToDeduct);
        stock[type] -= deduct;
        deductedByType[type] += deduct;
        remainingToDeduct -= deduct;
      }
    }
  }

  return {
    updatedStock: {
      'Pre-Starter': parseFloat(stock['Pre-Starter'].toFixed(2)),
      'Starter': parseFloat(stock['Starter'].toFixed(2)),
      'Finisher': parseFloat(stock['Finisher'].toFixed(2))
    },
    deductedByType: {
      'Pre-Starter': parseFloat(deductedByType['Pre-Starter'].toFixed(2)),
      'Starter': parseFloat(deductedByType['Starter'].toFixed(2)),
      'Finisher': parseFloat(deductedByType['Finisher'].toFixed(2))
    },
    unfulfilledAmount: parseFloat(remainingToDeduct.toFixed(2))
  };
}

/**
 * Generate automatic Batch Number (KG001, KG002...)
 * @param {number} count Current total batch count
 * @returns {string}
 */
export function generateBatchNumber(count = 0) {
  const nextNum = Number(count) + 1;
  return `KG${String(nextNum).padStart(3, '0')}`;
}

/**
 * Generate automatic Batch Name (KgPoultryBatch-1...)
 * @param {number} count Current total batch count
 * @returns {string}
 */
export function generateBatchName(count = 0) {
  const nextNum = Number(count) + 1;
  return `KgPoultryBatch-${nextNum}`;
}

/**
 * Calculates Feed Conversion Ratio (FCR)
 * Formula: Total Feed Consumed (kg) / Total Live Body Weight (kg)
 * @param {number} totalFeedKg Total feed consumed in kg
 * @param {number} totalLiveWeightKg Total live body weight in kg
 * @returns {number|null} FCR rounded to 2 decimal places, or null if weight/feed invalid
 */
export function calculateFCR(totalFeedKg, totalLiveWeightKg) {
  const feed = Number(totalFeedKg) || 0;
  const weight = Number(totalLiveWeightKg) || 0;

  if (feed <= 0 || weight <= 0) return null;
  return parseFloat((feed / weight).toFixed(2));
}

/**
 * Calculates active batch FCR using current feed consumed (kg),
 * latest average bird weight (in grams or kg), and current live chick count.
 * Formula: total feed consumed (kg) / (latest avg weight in kg * current bird count)
 * @param {number} totalFeedKg
 * @param {number} latestAvgWeightGrams
 * @param {number} remainingBirdCount
 * @returns {number|null}
 */
export function calculateActiveBatchFCR(totalFeedKg, latestAvgWeightGrams, remainingBirdCount) {
  const feed = Number(totalFeedKg) || 0;
  const rawAvg = Number(latestAvgWeightGrams) || 0;
  const birds = Number(remainingBirdCount) || 0;

  if (feed <= 0 || rawAvg <= 0 || birds <= 0) return null;
  const avgKg = rawAvg > 20 ? (rawAvg / 1000) : rawAvg;
  const totalLiveWeightKg = avgKg * birds;
  return calculateFCR(feed, totalLiveWeightKg);
}

