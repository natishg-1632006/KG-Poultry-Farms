// Exact company target data from project specification

export const FEED_CONSUMPTION_TARGETS = {
  1: 20, 2: 21, 3: 22, 4: 23, 5: 24, 6: 25, 7: 28,
  8: 33, 9: 37, 10: 42, 11: 46, 12: 51, 13: 55, 14: 65,
  15: 72, 16: 79, 17: 86, 18: 93, 19: 100, 20: 107, 21: 109,
  22: 113, 23: 117, 24: 121, 25: 125, 26: 129, 27: 133, 28: 157,
  29: 159, 30: 161, 31: 162, 32: 164, 33: 166, 34: 167, 35: 167,
  36: 167, 37: 167, 38: 167, 39: 167, 40: 167, 41: 160, 42: 169,
  43: 183, 44: 186, 45: 189
};

export const AVERAGE_WEIGHT_TARGETS = {
  1: 58, 2: 76, 3: 96, 4: 118, 5: 141, 6: 167, 7: 195,
  8: 221, 9: 250, 10: 282, 11: 317, 12: 355, 13: 396, 14: 440,
  15: 490, 16: 544, 17: 603, 18: 655, 19: 731, 20: 801, 21: 825,
  22: 952, 23: 1030, 24: 1109, 25: 1189, 26: 1270, 27: 1352, 28: 1435,
  29: 1526, 30: 1617, 31: 1710, 32: 1803, 33: 1890, 34: 1993, 35: 2090,
  36: 2183, 37: 2272, 38: 2357, 39: 2438, 40: 2515, 41: 2590, 42: 2660
};

export const FEED_TYPES = {
  PRE_STARTER: 'Pre-Starter',
  STARTER: 'Starter',
  FINISHER: 'Finisher'
};

export const FEED_DEDUCTION_ORDER = [
  FEED_TYPES.PRE_STARTER,
  FEED_TYPES.STARTER,
  FEED_TYPES.FINISHER
];

export const BATCH_STATUS = {
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  COMPLETED: 'Completed'
};

export const USER_ROLES = {
  ADMIN: 'Admin',
  FARMER: 'Farmer'
};

export const MEDICINE_UNITS = ['g', 'kg', 'ml', 'Liter'];

export const KG_PER_BAG = 70;

