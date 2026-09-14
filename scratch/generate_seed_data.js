const fs = require('fs');

// Target curves
const FEED_TARGETS = {
  1: 20, 2: 21, 3: 22, 4: 23, 5: 24, 6: 25, 7: 28,
  8: 33, 9: 37, 10: 42, 11: 46, 12: 51, 13: 55, 14: 65,
  15: 72, 16: 79, 17: 86, 18: 93, 19: 100, 20: 107, 21: 109,
  22: 113, 23: 117, 24: 121, 25: 125, 26: 129, 27: 133, 28: 157,
  29: 159, 30: 161, 31: 162, 32: 164, 33: 166, 34: 167, 35: 167,
  36: 167, 37: 167, 38: 167, 39: 167, 40: 167
};

const WEIGHT_TARGETS = {
  1: 58, 2: 76, 3: 96, 4: 118, 5: 141, 6: 167, 7: 195,
  8: 221, 9: 250, 10: 282, 11: 317, 12: 355, 13: 396, 14: 440,
  15: 490, 16: 544, 17: 603, 18: 655, 19: 731, 20: 801, 21: 825,
  22: 952, 23: 1030, 24: 1109, 25: 1189, 26: 1270, 27: 1352, 28: 1435,
  29: 1526, 30: 1617, 31: 1710, 32: 1803, 33: 1890, 34: 1993, 35: 2090,
  36: 2183, 37: 2272, 38: 2357, 39: 2438, 40: 2515
};

function formatDate(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(startDateStr, days) {
  const d = new Date(startDateStr);
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

// Build Batch 1 (Day 1 to 40 - Completed Batch)
// Chick arrival: 2026-07-25. Day 40 is 2026-09-02.
const b1Arrival = '2026-07-25';
const b1DailyRecords = {};
let b1RunningChicks = 5000;
let b1TotalMortality = 0;

for (let day = 1; day <= 40; day++) {
  const dateStr = addDays(b1Arrival, day - 1);
  const mort = day === 1 ? 3 : (day % 4 === 0 ? 2 : (day % 7 === 0 ? 0 : 1));
  b1TotalMortality += mort;
  b1RunningChicks -= mort;

  const feedType = day <= 7 ? 'Pre-Starter' : (day <= 21 ? 'Starter' : 'Finisher');
  const perBirdGram = FEED_TARGETS[day] || 167;
  const totalKg = Math.round((b1RunningChicks * perBirdGram) / 1000);
  const bags = parseFloat((totalKg / 70).toFixed(1));
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

// Batch 1 Dispatches on Day 38..40 (Fully harvested 4,954 remaining chicks)
const b1Dispatches = {
  'disp-kg001-1': {
    id: 'disp-kg001-1',
    batchId: 'KG001',
    dispatchDate: '2026-09-01',
    invoiceNumber: 'INV-2026-8801',
    vehicleName: 'KG Wholesale Traders - Truck 1',
    vehicleNumber: 'TN-38-AX-1234',
    driverName: 'Suresh Kumar',
    driverMobileNumber: '+91 9876543210',
    totalBoxCount: 20,
    chickenCountPerBox: 100,
    birdsCount: 2000,
    totalBirds: 2000,
    totalChickens: 2000,
    cratesCount: 20,
    totalCrates: 20,
    totalWeight: 4850.5,
    averageWeight: 2.425,
    status: 'Completed',
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-09-01T12:30:00.000Z'
  },
  'disp-kg001-2': {
    id: 'disp-kg001-2',
    batchId: 'KG001',
    dispatchDate: '2026-09-02',
    invoiceNumber: 'INV-2026-8802',
    vehicleName: 'KG Wholesale Traders - Truck 2',
    vehicleNumber: 'TN-38-B-5544',
    driverName: 'Murugan',
    driverMobileNumber: '+91 9876543212',
    totalBoxCount: 30,
    chickenCountPerBox: 98,
    birdsCount: 2948,
    totalBirds: 2948,
    totalChickens: 2948,
    cratesCount: 30,
    totalCrates: 30,
    totalWeight: 7414.2,
    averageWeight: 2.515,
    status: 'Completed',
    createdAt: '2026-09-02T08:00:00.000Z',
    updatedAt: '2026-09-02T11:45:00.000Z'
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
// Chick arrival: 2026-08-09. Day 37 is today 2026-09-14.
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

// Batch 2 Dispatches on Day 37 (2026-09-14) - 360 birds dispatched
const b2Dispatches = {
  'disp-kg002-1': {
    id: 'disp-kg002-1',
    batchId: 'KG002',
    dispatchDate: '2026-09-14',
    invoiceNumber: 'INV-2026-9901',
    vehicleName: 'KG Central Dispatch Vehicle 1',
    vehicleNumber: 'TN-38-AX-1234',
    driverName: 'Suresh',
    driverMobileNumber: '+91 9876543211',
    totalBoxCount: 20,
    chickenCountPerBox: 18,
    birdsCount: 360,
    totalBirds: 360,
    totalChickens: 360,
    cratesCount: 20,
    totalCrates: 20,
    totalWeight: 817.92,
    averageWeight: 2.272,
    status: 'In Progress',
    createdAt: '2026-09-14T09:00:00.000Z',
    updatedAt: '2026-09-14T11:00:00.000Z'
  }
};

// Box sets for disp-kg002-1
const b2BoxSets = {
  'disp-kg002-1': [
    {
      id: 'set-kg002-1-1',
      dispatchId: 'disp-kg002-1',
      boxSetNumber: 1,
      boxesInSet: 5,
      emptyBoxWeight: 25,
      loadedWeight: 229.5,
      chickenCount: 90,
      totalChickenWeight: 204.5,
      averageChickenWeight: 2.272,
      isPendingLoad: false,
      savedAt: '2026-09-14T09:30:00.000Z'
    },
    {
      id: 'set-kg002-1-2',
      dispatchId: 'disp-kg002-1',
      boxSetNumber: 2,
      boxesInSet: 5,
      emptyBoxWeight: 25,
      loadedWeight: 229.5,
      chickenCount: 90,
      totalChickenWeight: 204.5,
      averageChickenWeight: 2.272,
      isPendingLoad: false,
      savedAt: '2026-09-14T10:00:00.000Z'
    },
    {
      id: 'set-kg002-1-3',
      dispatchId: 'disp-kg002-1',
      boxSetNumber: 3,
      boxesInSet: 5,
      emptyBoxWeight: 25,
      loadedWeight: 229.5,
      chickenCount: 90,
      totalChickenWeight: 204.5,
      averageChickenWeight: 2.272,
      isPendingLoad: false,
      savedAt: '2026-09-14T10:30:00.000Z'
    },
    {
      id: 'set-kg002-1-4',
      dispatchId: 'disp-kg002-1',
      boxSetNumber: 4,
      boxesInSet: 5,
      emptyBoxWeight: 25,
      loadedWeight: 229.5,
      chickenCount: 90,
      totalChickenWeight: 204.5,
      averageChickenWeight: 2.272,
      isPendingLoad: false,
      savedAt: '2026-09-14T11:00:00.000Z'
    }
  ]
};

// Invoices
const invoicesList = [
  {
    id: 'disp-kg001-1',
    dispatchId: 'disp-kg001-1',
    batchId: 'KG001',
    invoiceNumber: 'INV-2026-8801',
    invoiceDate: '2026-09-01',
    customerName: 'KG Wholesale Traders',
    customerPhone: '+91 9876543210',
    vehicleNumber: 'TN-38-AX-1234',
    driverName: 'Suresh Kumar',
    totalChickens: 2000,
    totalWeightKg: 4850.5,
    ratePerKg: 135,
    totalAmount: 654817.5
  },
  {
    id: 'disp-kg001-2',
    dispatchId: 'disp-kg001-2',
    batchId: 'KG001',
    invoiceNumber: 'INV-2026-8802',
    invoiceDate: '2026-09-02',
    customerName: 'KG Wholesale Traders',
    customerPhone: '+91 9876543212',
    vehicleNumber: 'TN-38-B-5544',
    driverName: 'Murugan',
    totalChickens: 2948,
    totalWeightKg: 7414.2,
    ratePerKg: 135,
    totalAmount: 1000917
  }
];

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
      remainingChickCount: Math.max(0, 5000 - b2TotalMortality - 360),
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
  boxSets: {
    ...b2BoxSets
  },
  targets: {
    feedConsumption: FEED_TARGETS,
    averageWeight: WEIGHT_TARGETS
  },
  invoices: invoicesList,
  auditLogs: []
};

fs.writeFileSync('scratch/seedData.json', JSON.stringify(fullSeedData, null, 2));
console.log('Generated complete seed data successfully!');
console.log('Batch 1 Days:', Object.keys(b1DailyRecords).length);
console.log('Batch 2 Days:', Object.keys(b2DailyRecords).length);
console.log('Batch 2 Remaining Chicks:', Math.max(0, 5000 - b2TotalMortality - 360));
