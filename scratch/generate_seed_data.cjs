const fs = require('fs');

// Target curves for 1-40 days
const FEED_TARGETS = {
  1: 12, 2: 14, 3: 17, 4: 20, 5: 24, 6: 28, 7: 33,
  8: 38, 9: 44, 10: 50, 11: 57, 12: 64, 13: 72, 14: 80,
  15: 88, 16: 96, 17: 105, 18: 114, 19: 123, 20: 132, 21: 141,
  22: 150, 23: 158, 24: 166, 25: 173, 26: 180, 27: 186, 28: 191,
  29: 195, 30: 198, 31: 200, 32: 201, 33: 201, 34: 200, 35: 198,
  36: 194, 37: 189, 38: 182, 39: 175, 40: 167
};

const WEIGHT_TARGETS = {
  1: 42, 2: 56, 3: 74, 4: 96, 5: 122, 6: 152, 7: 186,
  8: 224, 9: 266, 10: 312, 11: 362, 12: 416, 13: 474, 14: 536,
  15: 602, 16: 672, 17: 746, 18: 824, 19: 906, 20: 992, 21: 1082,
  22: 1176, 23: 1274, 24: 1376, 25: 1482, 26: 1592, 27: 1706, 28: 1824,
  29: 1946, 30: 2072, 31: 2202, 32: 2336, 33: 2474, 34: 2616, 35: 2762,
  36: 2912, 37: 2272, 38: 2425, 39: 2480, 40: 2515
};

function addDays(dateStr, n) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

// Build Batch 1 (Day 1 to 40 - Completed Batch)
const b1Arrival = '2026-07-25';
const b1DailyRecords = {};
let b1RunningChicks = 5000;
let b1TotalMortality = 0;

for (let day = 1; day <= 40; day++) {
  const dateStr = addDays(b1Arrival, day - 1);
  const mort = day === 1 ? 4 : (day % 4 === 0 ? 2 : (day % 7 === 0 ? 0 : 1));
  b1TotalMortality += mort;
  b1RunningChicks -= mort;

  const feedType = day <= 7 ? 'Pre-Starter' : (day <= 21 ? 'Starter' : 'Finisher');
  const perBirdGram = FEED_TARGETS[day] || 167;
  const totalKg = Math.round((b1RunningChicks * perBirdGram) / 1000);
  const looseKg = parseFloat((totalKg % 70).toFixed(1));
  const avgWeight = WEIGHT_TARGETS[day] || 2515;

  b1DailyRecords[dateStr] = {
    batchId: 'KG001',
    recordDate: dateStr,
    mortalityCount: mort,
    feedType,
    feedConsumption: totalKg,
    feedConsumptionBags: Math.floor(totalKg / 70),
    additionalLooseKg: looseKg,
    averageWeight: avgWeight,
    remainingChickCount: b1RunningChicks,
    recordedBy: 'KG Poultry Farms',
    updatedAt: new Date(dateStr + 'T18:00:00.000Z').toISOString()
  };
}

// Batch 1 Dispatches (Harvested across 6 distinct shops)
// Initial 5000 - 52 mortality = 4,948 total birds harvested
const b1Dispatches = {
  'disp-kg001-1': {
    id: 'disp-kg001-1',
    batchId: 'KG001',
    dispatchDate: '2026-08-30',
    invoiceNumber: 'INV-2026-8801',
    vehicleName: 'Sri Annapoorna Chicken Shop - Coimbatore',
    vehicleNumber: 'TN-38-AX-1234',
    driverName: 'Suresh Kumar',
    driverMobileNumber: '+91 9876543210',
    totalBoxCount: 25,
    chickenCountPerBox: 12,
    birdsCount: 300,
    totalBirds: 300,
    totalChickens: 300,
    cratesCount: 25,
    totalCrates: 25,
    totalWeight: 720.0,
    averageWeight: 2.400,
    status: 'Completed',
    createdAt: '2026-08-30T10:00:00.000Z',
    updatedAt: '2026-08-30T12:30:00.000Z'
  },
  'disp-kg001-2': {
    id: 'disp-kg001-2',
    batchId: 'KG001',
    dispatchDate: '2026-08-31',
    invoiceNumber: 'INV-2026-8802',
    vehicleName: 'Sri Lakshmi Broiler Center - Tiruppur',
    vehicleNumber: 'TN-38-B-5544',
    driverName: 'Murugan',
    driverMobileNumber: '+91 9876543212',
    totalBoxCount: 30,
    chickenCountPerBox: 12,
    birdsCount: 360,
    totalBirds: 360,
    totalChickens: 360,
    cratesCount: 30,
    totalCrates: 30,
    totalWeight: 873.0,
    averageWeight: 2.425,
    status: 'Completed',
    createdAt: '2026-08-31T08:00:00.000Z',
    updatedAt: '2026-08-31T11:45:00.000Z'
  },
  'disp-kg001-3': {
    id: 'disp-kg001-3',
    batchId: 'KG001',
    dispatchDate: '2026-09-01',
    invoiceNumber: 'INV-2026-8803',
    vehicleName: 'SKM Wholesale Chicken Traders - Erode',
    vehicleNumber: 'TN-38-C-9911',
    driverName: 'Karthik',
    driverMobileNumber: '+91 9876543215',
    totalBoxCount: 20,
    chickenCountPerBox: 12,
    birdsCount: 240,
    totalBirds: 240,
    totalChickens: 240,
    cratesCount: 20,
    totalCrates: 20,
    totalWeight: 588.0,
    averageWeight: 2.450,
    status: 'Completed',
    createdAt: '2026-09-01T07:30:00.000Z',
    updatedAt: '2026-09-01T10:15:00.000Z'
  },
  'disp-kg001-4': {
    id: 'disp-kg001-4',
    batchId: 'KG001',
    dispatchDate: '2026-09-01',
    invoiceNumber: 'INV-2026-8804',
    vehicleName: 'Royal Fresh Chicken Stall - Salem',
    vehicleNumber: 'TN-38-D-7722',
    driverName: 'Velu',
    driverMobileNumber: '+91 9876543216',
    totalBoxCount: 25,
    chickenCountPerBox: 12,
    birdsCount: 300,
    totalBirds: 300,
    totalChickens: 300,
    cratesCount: 25,
    totalCrates: 25,
    totalWeight: 742.5,
    averageWeight: 2.475,
    status: 'Completed',
    createdAt: '2026-09-01T11:00:00.000Z',
    updatedAt: '2026-09-01T13:45:00.000Z'
  },
  'disp-kg001-5': {
    id: 'disp-kg001-5',
    batchId: 'KG001',
    dispatchDate: '2026-09-02',
    invoiceNumber: 'INV-2026-8805',
    vehicleName: 'Venkateshwara Poultry Shop - Namakkal',
    vehicleNumber: 'TN-38-E-3344',
    driverName: 'Raja',
    driverMobileNumber: '+91 9876543217',
    totalBoxCount: 30,
    chickenCountPerBox: 12,
    birdsCount: 360,
    totalBirds: 360,
    totalChickens: 360,
    cratesCount: 30,
    totalCrates: 30,
    totalWeight: 900.0,
    averageWeight: 2.500,
    status: 'Completed',
    createdAt: '2026-09-02T08:00:00.000Z',
    updatedAt: '2026-09-02T11:00:00.000Z'
  },
  'disp-kg001-6': {
    id: 'disp-kg001-6',
    batchId: 'KG001',
    dispatchDate: '2026-09-02',
    invoiceNumber: 'INV-2026-8806',
    vehicleName: 'Kovai Fresh Meat & Poultry - Pollachi',
    vehicleNumber: 'TN-38-F-1122',
    driverName: 'Senthil',
    driverMobileNumber: '+91 9876543218',
    totalBoxCount: 283,
    chickenCountPerBox: 12,
    birdsCount: 3388,
    totalBirds: 3388,
    totalChickens: 3388,
    cratesCount: 283,
    totalCrates: 283,
    totalWeight: 8520.82,
    averageWeight: 2.515,
    status: 'Completed',
    createdAt: '2026-09-02T12:00:00.000Z',
    updatedAt: '2026-09-02T17:00:00.000Z'
  }
};

// Batch 1 Feed Arrivals
const b1FeedArrivals = [
  {
    id: 'feed-b1-1',
    batchId: 'KG001',
    feedType: 'Pre-Starter',
    driverName: 'Murugan',
    vehicleNumber: 'TN-38-B-9988',
    quantityReceived: 1000,
    quantityReceivedKg: 1000,
    bagsReceived: 14.3,
    date: '2026-07-25',
    notes: 'Initial pre-starter arrival',
    createdAt: '2026-07-25T08:00:00.000Z'
  },
  {
    id: 'feed-b1-2',
    batchId: 'KG001',
    feedType: 'Starter',
    driverName: 'Murugan',
    vehicleNumber: 'TN-38-B-9988',
    quantityReceived: 3500,
    quantityReceivedKg: 3500,
    bagsReceived: 50,
    date: '2026-08-01',
    notes: 'Starter feed arrival',
    createdAt: '2026-08-01T09:00:00.000Z'
  },
  {
    id: 'feed-b1-3',
    batchId: 'KG001',
    feedType: 'Finisher',
    driverName: 'Murugan',
    vehicleNumber: 'TN-38-B-9988',
    quantityReceived: 12000,
    quantityReceivedKg: 12000,
    bagsReceived: 171.4,
    date: '2026-08-15',
    notes: 'Finisher feed arrival',
    createdAt: '2026-08-15T10:00:00.000Z'
  }
];

// Build Batch 2 (Day 1 to 37 - Active Batch)
const b2Arrival = '2026-08-09';
const b2DailyRecords = {};
let b2RunningChicks = 5000;
let b2TotalMortality = 0;

for (let day = 1; day <= 37; day++) {
  const dateStr = addDays(b2Arrival, day - 1);
  const mort = day === 1 ? 3 : (day % 5 === 0 ? 2 : (day % 6 === 0 ? 0 : 1));
  b2TotalMortality += mort;
  b2RunningChicks -= mort;

  const feedType = day <= 7 ? 'Pre-Starter' : (day <= 21 ? 'Starter' : 'Finisher');
  const perBirdGram = FEED_TARGETS[day] || 167;
  const totalKg = Math.round((b2RunningChicks * perBirdGram) / 1000);
  const looseKg = parseFloat((totalKg % 70).toFixed(1));
  const avgWeight = WEIGHT_TARGETS[day] || 2272;

  b2DailyRecords[dateStr] = {
    batchId: 'KG002',
    recordDate: dateStr,
    mortalityCount: mort,
    feedType,
    feedConsumption: totalKg,
    feedConsumptionBags: Math.floor(totalKg / 70),
    additionalLooseKg: looseKg,
    averageWeight: avgWeight,
    remainingChickCount: b2RunningChicks,
    recordedBy: 'KG Poultry Farms',
    updatedAt: new Date(dateStr + 'T18:00:00.000Z').toISOString()
  };
}

// Batch 2 Feed Arrivals
const b2FeedArrivals = [
  {
    id: 'feed-b2-1',
    batchId: 'KG002',
    feedType: 'Pre-Starter',
    driverName: 'Suresh',
    vehicleNumber: 'TN-38-AX-9911',
    quantityReceived: 1000,
    quantityReceivedKg: 1000,
    bagsReceived: 14.3,
    date: '2026-08-09',
    notes: 'Initial pre-starter arrival for KG002',
    createdAt: '2026-08-09T08:00:00.000Z'
  },
  {
    id: 'feed-b2-2',
    batchId: 'KG002',
    feedType: 'Starter',
    driverName: 'Suresh',
    vehicleNumber: 'TN-38-AX-9911',
    quantityReceived: 3500,
    quantityReceivedKg: 3500,
    bagsReceived: 50,
    date: '2026-08-16',
    notes: 'Starter feed arrival for KG002',
    createdAt: '2026-08-16T09:00:00.000Z'
  },
  {
    id: 'feed-b2-3',
    batchId: 'KG002',
    feedType: 'Finisher',
    driverName: 'Suresh',
    vehicleNumber: 'TN-38-AX-9911',
    quantityReceived: 12000,
    quantityReceivedKg: 12000,
    bagsReceived: 171.4,
    date: '2026-08-30',
    notes: 'Finisher feed arrival for KG002',
    createdAt: '2026-08-30T10:00:00.000Z'
  }
];

// Batch 2 Dispatches (2 Shops: Greenland Chicken Shop & Pioneer Poultry & Traders)
const b2Dispatches = {
  'disp-kg002-1': {
    id: 'disp-kg002-1',
    batchId: 'KG002',
    dispatchDate: '2026-09-13',
    invoiceNumber: 'INV-2026-9901',
    vehicleName: 'Greenland Chicken Shop - Karur',
    vehicleNumber: 'TN-38-AX-9911',
    driverName: 'Suresh',
    driverMobileNumber: '+91 9876543211',
    totalBoxCount: 20,
    chickenCountPerBox: 12,
    birdsCount: 240,
    totalBirds: 240,
    totalChickens: 240,
    cratesCount: 20,
    totalCrates: 20,
    totalWeight: 540.0,
    averageWeight: 2.250,
    status: 'Completed',
    createdAt: '2026-09-13T09:00:00.000Z',
    updatedAt: '2026-09-13T11:30:00.000Z'
  },
  'disp-kg002-2': {
    id: 'disp-kg002-2',
    batchId: 'KG002',
    dispatchDate: '2026-09-14',
    invoiceNumber: 'INV-2026-9902',
    vehicleName: 'Pioneer Poultry & Traders - Dindigul',
    vehicleNumber: 'TN-38-AX-1234',
    driverName: 'Suresh',
    driverMobileNumber: '+91 9876543211',
    totalBoxCount: 30,
    chickenCountPerBox: 12,
    birdsCount: 360,
    totalBirds: 360,
    totalChickens: 360,
    cratesCount: 30,
    totalCrates: 30,
    totalWeight: 817.92,
    averageWeight: 2.272,
    status: 'In Progress',
    createdAt: '2026-09-14T09:00:00.000Z',
    updatedAt: '2026-09-14T11:00:00.000Z'
  }
};

// Generate Weighed Box Sets for all 8 Shops
// Rule: Each box contains 12 birds (10-15 range). Each set contains 5 boxes (60 birds per set).
function createBoxSetsForDispatch(dispatchId, totalBoxes, birdsPerBox, totalNetWeight, avgWeight, savedPrefixDate, countLoadedSets = null) {
  const sets = [];
  const totalSets = Math.ceil(totalBoxes / 5);
  let remainingBoxes = totalBoxes;
  const numToLoad = countLoadedSets !== null ? countLoadedSets : totalSets;

  for (let i = 1; i <= totalSets; i++) {
    const boxesInThisSet = Math.min(5, remainingBoxes);
    remainingBoxes -= boxesInThisSet;
    const isLoaded = i <= numToLoad;
    const chickenCount = boxesInThisSet * birdsPerBox;
    const emptyBoxWeight = boxesInThisSet * 5; // 5 kg tare per box
    const totalChickenWeight = isLoaded ? parseFloat((chickenCount * avgWeight).toFixed(2)) : 0;
    const loadedWeight = isLoaded ? parseFloat((emptyBoxWeight + totalChickenWeight).toFixed(2)) : 0;

    sets.push({
      id: `set-${dispatchId}-${i}`,
      dispatchId,
      boxSetNumber: i,
      boxesInSet: boxesInThisSet,
      emptyBoxWeight,
      loadedWeight,
      chickenCount,
      totalChickenWeight,
      averageChickenWeight: avgWeight,
      isPendingLoad: !isLoaded,
      savedAt: `${savedPrefixDate}T0${Math.min(9, 8 + i)}:30:00.000Z`
    });
  }

  return sets;
}

const allBoxSets = {
  // Shop 1: Sri Annapoorna Chicken Shop (25 boxes / 12 birds/box = 300 birds / 720kg)
  'disp-kg001-1': createBoxSetsForDispatch('disp-kg001-1', 25, 12, 720.0, 2.400, '2026-08-30'),

  // Shop 2: Sri Lakshmi Broiler Center (30 boxes / 12 birds/box = 360 birds / 873kg)
  'disp-kg001-2': createBoxSetsForDispatch('disp-kg001-2', 30, 12, 873.0, 2.425, '2026-08-31'),

  // Shop 3: SKM Wholesale Chicken Traders (20 boxes / 12 birds/box = 240 birds / 588kg)
  'disp-kg001-3': createBoxSetsForDispatch('disp-kg001-3', 20, 12, 588.0, 2.450, '2026-09-01'),

  // Shop 4: Royal Fresh Chicken Stall (25 boxes / 12 birds/box = 300 birds / 742.5kg)
  'disp-kg001-4': createBoxSetsForDispatch('disp-kg001-4', 25, 12, 742.5, 2.475, '2026-09-01'),

  // Shop 5: Venkateshwara Poultry Shop (30 boxes / 12 birds/box = 360 birds / 900kg)
  'disp-kg001-5': createBoxSetsForDispatch('disp-kg001-5', 30, 12, 900.0, 2.500, '2026-09-02'),

  // Shop 6: Kovai Fresh Meat & Poultry (283 boxes / 3,388 birds / 8,520.82kg)
  'disp-kg001-6': createBoxSetsForDispatch('disp-kg001-6', 283, 12, 8520.82, 2.515, '2026-09-02'),

  // Shop 7: Greenland Chicken Shop (20 boxes / 12 birds/box = 240 birds / 540kg)
  'disp-kg002-1': createBoxSetsForDispatch('disp-kg002-1', 20, 12, 540.0, 2.250, '2026-09-13'),

  // Shop 8: Pioneer Poultry & Traders (30 boxes / 12 birds/box = 360 birds / 817.92kg, 4 weighed, 2 pending)
  'disp-kg002-2': createBoxSetsForDispatch('disp-kg002-2', 30, 12, 817.92, 2.272, '2026-09-14', 4)
};

// Invoices for all 8 shops
const invoicesList = [
  {
    id: 'disp-kg001-1',
    dispatchId: 'disp-kg001-1',
    batchId: 'KG001',
    invoiceNumber: 'INV-2026-8801',
    invoiceDate: '2026-08-30',
    customerName: 'Sri Annapoorna Chicken Shop - Coimbatore',
    customerPhone: '+91 9876543210',
    vehicleNumber: 'TN-38-AX-1234',
    driverName: 'Suresh Kumar',
    totalChickens: 300,
    totalWeightKg: 720.0,
    ratePerKg: 135,
    totalAmount: 97200
  },
  {
    id: 'disp-kg001-2',
    dispatchId: 'disp-kg001-2',
    batchId: 'KG001',
    invoiceNumber: 'INV-2026-8802',
    invoiceDate: '2026-08-31',
    customerName: 'Sri Lakshmi Broiler Center - Tiruppur',
    customerPhone: '+91 9876543212',
    vehicleNumber: 'TN-38-B-5544',
    driverName: 'Murugan',
    totalChickens: 360,
    totalWeightKg: 873.0,
    ratePerKg: 135,
    totalAmount: 117855
  },
  {
    id: 'disp-kg001-3',
    dispatchId: 'disp-kg001-3',
    batchId: 'KG001',
    invoiceNumber: 'INV-2026-8803',
    invoiceDate: '2026-09-01',
    customerName: 'SKM Wholesale Chicken Traders - Erode',
    customerPhone: '+91 9876543215',
    vehicleNumber: 'TN-38-C-9911',
    driverName: 'Karthik',
    totalChickens: 240,
    totalWeightKg: 588.0,
    ratePerKg: 135,
    totalAmount: 79380
  },
  {
    id: 'disp-kg001-4',
    dispatchId: 'disp-kg001-4',
    batchId: 'KG001',
    invoiceNumber: 'INV-2026-8804',
    invoiceDate: '2026-09-01',
    customerName: 'Royal Fresh Chicken Stall - Salem',
    customerPhone: '+91 9876543216',
    vehicleNumber: 'TN-38-D-7722',
    driverName: 'Velu',
    totalChickens: 300,
    totalWeightKg: 742.5,
    ratePerKg: 135,
    totalAmount: 100237.5
  },
  {
    id: 'disp-kg001-5',
    dispatchId: 'disp-kg001-5',
    batchId: 'KG001',
    invoiceNumber: 'INV-2026-8805',
    invoiceDate: '2026-09-02',
    customerName: 'Venkateshwara Poultry Shop - Namakkal',
    customerPhone: '+91 9876543217',
    vehicleNumber: 'TN-38-E-3344',
    driverName: 'Raja',
    totalChickens: 360,
    totalWeightKg: 900.0,
    ratePerKg: 135,
    totalAmount: 121500
  },
  {
    id: 'disp-kg001-6',
    dispatchId: 'disp-kg001-6',
    batchId: 'KG001',
    invoiceNumber: 'INV-2026-8806',
    invoiceDate: '2026-09-02',
    customerName: 'Kovai Fresh Meat & Poultry - Pollachi',
    customerPhone: '+91 9876543218',
    vehicleNumber: 'TN-38-F-1122',
    driverName: 'Senthil',
    totalChickens: 3388,
    totalWeightKg: 8520.82,
    ratePerKg: 135,
    totalAmount: 1150310.7
  },
  {
    id: 'disp-kg002-1',
    dispatchId: 'disp-kg002-1',
    batchId: 'KG002',
    invoiceNumber: 'INV-2026-9901',
    invoiceDate: '2026-09-13',
    customerName: 'Greenland Chicken Shop - Karur',
    customerPhone: '+91 9876543211',
    vehicleNumber: 'TN-38-AX-9911',
    driverName: 'Suresh',
    totalChickens: 240,
    totalWeightKg: 540.0,
    ratePerKg: 135,
    totalAmount: 72900
  },
  {
    id: 'disp-kg002-2',
    dispatchId: 'disp-kg002-2',
    batchId: 'KG002',
    invoiceNumber: 'INV-2026-9902',
    invoiceDate: '2026-09-14',
    customerName: 'Pioneer Poultry & Traders - Dindigul',
    customerPhone: '+91 9876543211',
    vehicleNumber: 'TN-38-AX-1234',
    driverName: 'Suresh',
    totalChickens: 360,
    totalWeightKg: 817.92,
    ratePerKg: 135,
    totalAmount: 110419.2
  }
];

// Full DB State
const fullSeedData = {
  users: {
    'farmer-uid-1': {
      uid: 'farmer-uid-1',
      name: 'KG Poultry Farms',
      email: 'kgpoultryfarms@gmail.com',
      password: 'kgpoultry123',
      phone: '+91 9876543211',
      farmName: 'KG Poultry Farms',
      role: 'Farmer',
      active: true,
      assignedBatches: ['KG001', 'KG002'],
      createdAt: '2026-07-25T00:00:00.000Z'
    },
    'farmer-uid-2': {
      uid: 'farmer-uid-2',
      name: 'KG Poultry Farms',
      email: 'farmer@kgpoultry.com',
      password: 'farmer123',
      phone: '+91 9876543211',
      farmName: 'KG Poultry Farms',
      role: 'Farmer',
      active: true,
      assignedBatches: ['KG001', 'KG002'],
      createdAt: '2026-07-25T00:00:00.000Z'
    }
  },
  batches: {
    'KG001': {
      id: 'KG001',
      batchNumber: 'KG001',
      batchName: 'KgPoultryBatch-1',
      chickArrivalDate: b1Arrival,
      initialChickCount: 5000,
      remainingChickCount: 0,
      assignedFarmerId: 'kg-poultry-farms',
      assignedFarmerName: 'KG Poultry Farms',
      vehicleNumber: 'TN-38-AX-1234',
      driverName: 'Suresh Kumar',
      status: 'Completed',
      feedStock: {
        'Pre-Starter': 0,
        'Starter': 0,
        'Finisher': 0
      },
      createdAt: '2026-07-25T00:00:00.000Z'
    },
    'KG002': {
      id: 'KG002',
      batchNumber: 'KG002',
      batchName: 'KgPoultryBatch-2',
      chickArrivalDate: b2Arrival,
      initialChickCount: 5000,
      remainingChickCount: Math.max(0, 5000 - b2TotalMortality - 600),
      assignedFarmerId: 'kg-poultry-farms',
      assignedFarmerName: 'KG Poultry Farms',
      vehicleNumber: 'TN-38-AX-1234',
      driverName: 'Suresh',
      status: 'Active',
      feedStock: {
        'Pre-Starter': 0,
        'Starter': 0,
        'Finisher': 2500
      },
      createdAt: '2026-08-09T00:00:00.000Z'
    }
  },
  dailyRecords: {
    'KG001': b1DailyRecords,
    'KG002': b2DailyRecords
  },
  feedStocks: {
    'KG001': b1FeedArrivals,
    'KG002': b2FeedArrivals
  },
  medicineRecords: {
    'KG001': [
      {
        id: 'med-b1-1',
        batchId: 'KG001',
        medicineName: 'Newcastle Vaccine (B1 Strain)',
        date: '2026-07-31',
        dosage: '100 ml',
        notes: 'Administered in drinking water Day 7',
        createdAt: '2026-07-31T09:00:00.000Z'
      },
      {
        id: 'med-b1-2',
        batchId: 'KG001',
        medicineName: 'Gumboro Vaccine (IBD)',
        date: '2026-08-07',
        dosage: '150 ml',
        notes: 'Administered Day 14 booster',
        createdAt: '2026-08-07T09:00:00.000Z'
      }
    ],
    'KG002': [
      {
        id: 'med-b2-1',
        batchId: 'KG002',
        medicineName: 'Newcastle Vaccine (B1 Strain)',
        date: '2026-08-15',
        dosage: '100 ml',
        notes: 'Administered in drinking water Day 7',
        createdAt: '2026-08-15T09:00:00.000Z'
      },
      {
        id: 'med-b2-2',
        batchId: 'KG002',
        medicineName: 'Gumboro Vaccine (IBD)',
        date: '2026-08-22',
        dosage: '150 ml',
        notes: 'Administered Day 14 booster',
        createdAt: '2026-08-22T09:00:00.000Z'
      }
    ]
  },
  dispatches: {
    ...b1Dispatches,
    ...b2Dispatches
  },
  boxSets: allBoxSets,
  targets: {
    feedConsumption: FEED_TARGETS,
    averageWeight: WEIGHT_TARGETS
  },
  invoices: invoicesList,
  auditLogs: []
};

fs.writeFileSync('scratch/seedData.json', JSON.stringify(fullSeedData, null, 2));
console.log('Generated seed data for 8 shops (20-30 boxes per shop, 12 birds per box) successfully!');
