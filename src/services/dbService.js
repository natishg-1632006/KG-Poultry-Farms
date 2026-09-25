import { ref, get, set, update, remove, push, child } from 'firebase/database';
import { db } from './firebase';
import { FEED_CONSUMPTION_TARGETS, AVERAGE_WEIGHT_TARGETS } from '../constants/companyTargets';
import { deductFeedStock, sortBatchesDescending } from '../utils/calculations';
import { hashPassword } from '../utils/cryptoUtils';

const MOCK_STORAGE_KEY = 'kg_poultry_local_db_v5';

// Initial seed state for local fallback mode
const INITIAL_LOCAL_STATE = {
  "users": {
    "kg-poultry-farms-user": {
      "uid": "kg-poultry-farms-user",
      "name": "KG Poultry Farms Manager",
      "email": "kgpoultryfarms@gmail.com",
      "phone": "9080691947",
      "farmName": "KG Poultry Shed 1",
      "role": "Farmer",
      "active": true,
      "assignedBatches": [
        "KG001",
        "KG002"
      ],
      "passwordHash": "79e5b42b1a94f1a1f89af873157dfc87724d8b649debc83b7dc49c85a451fc4e",
      "createdAt": "2026-07-25T00:00:00.000Z",
      "updatedAt": "2026-09-19T17:00:00.000Z"
    }
  },
  "batches": {
    "KG001": {
      "id": "KG001",
      "batchNumber": "KG001",
      "batchName": "KgPoultryBatch-1",
      "chickArrivalDate": "2026-07-25",
      "initialChickCount": 5000,
      "remainingChickCount": 0,
      "assignedFarmerId": "kg-poultry-farms",
      "assignedFarmerName": "KG Poultry Farms",
      "vehicleNumber": "TN-38-AX-1234",
      "driverName": "Suresh Kumar",
      "status": "Completed",
      "feedStock": {
        "Pre-Starter": 0,
        "Starter": 0,
        "Finisher": 0
      },
      "createdAt": "2026-07-25T00:00:00.000Z"
    },
    "KG002": {
      "id": "KG002",
      "batchNumber": "KG002",
      "batchName": "KgPoultryBatch-2",
      "chickArrivalDate": "2026-08-09",
      "initialChickCount": 4196,
      "remainingChickCount": 19,
      "assignedFarmerId": "kg-poultry-farms",
      "assignedFarmerName": "KG Poultry Farms",
      "vehicleNumber": "TN-38-AX-1234",
      "driverName": "Suresh",
      "status": "Active",
      "feedStock": {
        "Pre-Starter": 0,
        "Starter": 0,
        "Finisher": 2500
      },
      "createdAt": "2026-08-09T00:00:00.000Z"
    }
  },
  "dailyRecords": {
    "KG001": {
      "2026-07-25": {
        "batchId": "KG001",
        "recordDate": "2026-07-25",
        "mortalityCount": 4,
        "feedType": "Pre-Starter",
        "feedConsumption": 60,
        "feedConsumptionBags": 0,
        "additionalLooseKg": 60,
        "averageWeight": 42,
        "remainingChickCount": 4996,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-07-25T18:00:00.000Z"
      },
      "2026-07-26": {
        "batchId": "KG001",
        "recordDate": "2026-07-26",
        "mortalityCount": 1,
        "feedType": "Pre-Starter",
        "feedConsumption": 70,
        "feedConsumptionBags": 1,
        "additionalLooseKg": 0,
        "averageWeight": 56,
        "remainingChickCount": 4995,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-07-26T18:00:00.000Z"
      },
      "2026-07-27": {
        "batchId": "KG001",
        "recordDate": "2026-07-27",
        "mortalityCount": 1,
        "feedType": "Pre-Starter",
        "feedConsumption": 85,
        "feedConsumptionBags": 1,
        "additionalLooseKg": 15,
        "averageWeight": 74,
        "remainingChickCount": 4994,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-07-27T18:00:00.000Z"
      },
      "2026-07-28": {
        "batchId": "KG001",
        "recordDate": "2026-07-28",
        "mortalityCount": 2,
        "feedType": "Pre-Starter",
        "feedConsumption": 100,
        "feedConsumptionBags": 1,
        "additionalLooseKg": 30,
        "averageWeight": 96,
        "remainingChickCount": 4992,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-07-28T18:00:00.000Z"
      },
      "2026-07-29": {
        "batchId": "KG001",
        "recordDate": "2026-07-29",
        "mortalityCount": 1,
        "feedType": "Pre-Starter",
        "feedConsumption": 120,
        "feedConsumptionBags": 1,
        "additionalLooseKg": 50,
        "averageWeight": 122,
        "remainingChickCount": 4991,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-07-29T18:00:00.000Z"
      },
      "2026-07-30": {
        "batchId": "KG001",
        "recordDate": "2026-07-30",
        "mortalityCount": 1,
        "feedType": "Pre-Starter",
        "feedConsumption": 140,
        "feedConsumptionBags": 2,
        "additionalLooseKg": 0,
        "averageWeight": 152,
        "remainingChickCount": 4990,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-07-30T18:00:00.000Z"
      },
      "2026-07-31": {
        "batchId": "KG001",
        "recordDate": "2026-07-31",
        "mortalityCount": 0,
        "feedType": "Pre-Starter",
        "feedConsumption": 165,
        "feedConsumptionBags": 2,
        "additionalLooseKg": 25,
        "averageWeight": 186,
        "remainingChickCount": 4990,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-07-31T18:00:00.000Z"
      },
      "2026-08-01": {
        "batchId": "KG001",
        "recordDate": "2026-08-01",
        "mortalityCount": 2,
        "feedType": "Starter",
        "feedConsumption": 190,
        "feedConsumptionBags": 2,
        "additionalLooseKg": 50,
        "averageWeight": 224,
        "remainingChickCount": 4988,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-08-01T18:00:00.000Z"
      },
      "2026-08-02": {
        "batchId": "KG001",
        "recordDate": "2026-08-02",
        "mortalityCount": 1,
        "feedType": "Starter",
        "feedConsumption": 219,
        "feedConsumptionBags": 3,
        "additionalLooseKg": 9,
        "averageWeight": 266,
        "remainingChickCount": 4987,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-08-02T18:00:00.000Z"
      },
      "2026-08-03": {
        "batchId": "KG001",
        "recordDate": "2026-08-03",
        "mortalityCount": 1,
        "feedType": "Starter",
        "feedConsumption": 249,
        "feedConsumptionBags": 3,
        "additionalLooseKg": 39,
        "averageWeight": 312,
        "remainingChickCount": 4986,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-08-03T18:00:00.000Z"
      },
      "2026-08-04": {
        "batchId": "KG001",
        "recordDate": "2026-08-04",
        "mortalityCount": 1,
        "feedType": "Starter",
        "feedConsumption": 284,
        "feedConsumptionBags": 4,
        "additionalLooseKg": 4,
        "averageWeight": 362,
        "remainingChickCount": 4985,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-08-04T18:00:00.000Z"
      },
      "2026-08-05": {
        "batchId": "KG001",
        "recordDate": "2026-08-05",
        "mortalityCount": 2,
        "feedType": "Starter",
        "feedConsumption": 319,
        "feedConsumptionBags": 4,
        "additionalLooseKg": 39,
        "averageWeight": 416,
        "remainingChickCount": 4983,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-08-05T18:00:00.000Z"
      },
      "2026-08-06": {
        "batchId": "KG001",
        "recordDate": "2026-08-06",
        "mortalityCount": 1,
        "feedType": "Starter",
        "feedConsumption": 359,
        "feedConsumptionBags": 5,
        "additionalLooseKg": 9,
        "averageWeight": 474,
        "remainingChickCount": 4982,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-08-06T18:00:00.000Z"
      },
      "2026-08-07": {
        "batchId": "KG001",
        "recordDate": "2026-08-07",
        "mortalityCount": 0,
        "feedType": "Starter",
        "feedConsumption": 399,
        "feedConsumptionBags": 5,
        "additionalLooseKg": 49,
        "averageWeight": 536,
        "remainingChickCount": 4982,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-08-07T18:00:00.000Z"
      },
      "2026-08-08": {
        "batchId": "KG001",
        "recordDate": "2026-08-08",
        "mortalityCount": 1,
        "feedType": "Starter",
        "feedConsumption": 438,
        "feedConsumptionBags": 6,
        "additionalLooseKg": 18,
        "averageWeight": 602,
        "remainingChickCount": 4981,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-08-08T18:00:00.000Z"
      },
      "2026-08-09": {
        "batchId": "KG001",
        "recordDate": "2026-08-09",
        "mortalityCount": 2,
        "feedType": "Starter",
        "feedConsumption": 478,
        "feedConsumptionBags": 6,
        "additionalLooseKg": 58,
        "averageWeight": 672,
        "remainingChickCount": 4979,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-08-09T18:00:00.000Z"
      },
      "2026-08-10": {
        "batchId": "KG001",
        "recordDate": "2026-08-10",
        "mortalityCount": 1,
        "feedType": "Starter",
        "feedConsumption": 523,
        "feedConsumptionBags": 7,
        "additionalLooseKg": 33,
        "averageWeight": 746,
        "remainingChickCount": 4978,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-08-10T18:00:00.000Z"
      },
      "2026-08-11": {
        "batchId": "KG001",
        "recordDate": "2026-08-11",
        "mortalityCount": 1,
        "feedType": "Starter",
        "feedConsumption": 567,
        "feedConsumptionBags": 8,
        "additionalLooseKg": 7,
        "averageWeight": 824,
        "remainingChickCount": 4977,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-08-11T18:00:00.000Z"
      },
      "2026-08-12": {
        "batchId": "KG001",
        "recordDate": "2026-08-12",
        "mortalityCount": 1,
        "feedType": "Starter",
        "feedConsumption": 612,
        "feedConsumptionBags": 8,
        "additionalLooseKg": 52,
        "averageWeight": 906,
        "remainingChickCount": 4976,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-08-12T18:00:00.000Z"
      },
      "2026-08-13": {
        "batchId": "KG001",
        "recordDate": "2026-08-13",
        "mortalityCount": 2,
        "feedType": "Starter",
        "feedConsumption": 657,
        "feedConsumptionBags": 9,
        "additionalLooseKg": 27,
        "averageWeight": 992,
        "remainingChickCount": 4974,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-08-13T18:00:00.000Z"
      },
      "2026-08-14": {
        "batchId": "KG001",
        "recordDate": "2026-08-14",
        "mortalityCount": 0,
        "feedType": "Starter",
        "feedConsumption": 701,
        "feedConsumptionBags": 10,
        "additionalLooseKg": 1,
        "averageWeight": 1082,
        "remainingChickCount": 4974,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-08-14T18:00:00.000Z"
      },
      "2026-08-15": {
        "batchId": "KG001",
        "recordDate": "2026-08-15",
        "mortalityCount": 1,
        "feedType": "Finisher",
        "feedConsumption": 746,
        "feedConsumptionBags": 10,
        "additionalLooseKg": 46,
        "averageWeight": 1176,
        "remainingChickCount": 4973,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-08-15T18:00:00.000Z"
      },
      "2026-08-16": {
        "batchId": "KG001",
        "recordDate": "2026-08-16",
        "mortalityCount": 1,
        "feedType": "Finisher",
        "feedConsumption": 786,
        "feedConsumptionBags": 11,
        "additionalLooseKg": 16,
        "averageWeight": 1274,
        "remainingChickCount": 4972,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-08-16T18:00:00.000Z"
      },
      "2026-08-17": {
        "batchId": "KG001",
        "recordDate": "2026-08-17",
        "mortalityCount": 2,
        "feedType": "Finisher",
        "feedConsumption": 825,
        "feedConsumptionBags": 11,
        "additionalLooseKg": 55,
        "averageWeight": 1376,
        "remainingChickCount": 4970,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-08-17T18:00:00.000Z"
      },
      "2026-08-18": {
        "batchId": "KG001",
        "recordDate": "2026-08-18",
        "mortalityCount": 1,
        "feedType": "Finisher",
        "feedConsumption": 860,
        "feedConsumptionBags": 12,
        "additionalLooseKg": 20,
        "averageWeight": 1482,
        "remainingChickCount": 4969,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-08-18T18:00:00.000Z"
      },
      "2026-08-19": {
        "batchId": "KG001",
        "recordDate": "2026-08-19",
        "mortalityCount": 1,
        "feedType": "Finisher",
        "feedConsumption": 894,
        "feedConsumptionBags": 12,
        "additionalLooseKg": 54,
        "averageWeight": 1592,
        "remainingChickCount": 4968,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-08-19T18:00:00.000Z"
      },
      "2026-08-20": {
        "batchId": "KG001",
        "recordDate": "2026-08-20",
        "mortalityCount": 1,
        "feedType": "Finisher",
        "feedConsumption": 924,
        "feedConsumptionBags": 13,
        "additionalLooseKg": 14,
        "averageWeight": 1706,
        "remainingChickCount": 4967,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-08-20T18:00:00.000Z"
      },
      "2026-08-21": {
        "batchId": "KG001",
        "recordDate": "2026-08-21",
        "mortalityCount": 2,
        "feedType": "Finisher",
        "feedConsumption": 948,
        "feedConsumptionBags": 13,
        "additionalLooseKg": 38,
        "averageWeight": 1824,
        "remainingChickCount": 4965,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-08-21T18:00:00.000Z"
      },
      "2026-08-22": {
        "batchId": "KG001",
        "recordDate": "2026-08-22",
        "mortalityCount": 1,
        "feedType": "Finisher",
        "feedConsumption": 968,
        "feedConsumptionBags": 13,
        "additionalLooseKg": 58,
        "averageWeight": 1946,
        "remainingChickCount": 4964,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-08-22T18:00:00.000Z"
      },
      "2026-08-23": {
        "batchId": "KG001",
        "recordDate": "2026-08-23",
        "mortalityCount": 1,
        "feedType": "Finisher",
        "feedConsumption": 983,
        "feedConsumptionBags": 14,
        "additionalLooseKg": 3,
        "averageWeight": 2072,
        "remainingChickCount": 4963,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-08-23T18:00:00.000Z"
      },
      "2026-08-24": {
        "batchId": "KG001",
        "recordDate": "2026-08-24",
        "mortalityCount": 1,
        "feedType": "Finisher",
        "feedConsumption": 992,
        "feedConsumptionBags": 14,
        "additionalLooseKg": 12,
        "averageWeight": 2202,
        "remainingChickCount": 4962,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-08-24T18:00:00.000Z"
      },
      "2026-08-25": {
        "batchId": "KG001",
        "recordDate": "2026-08-25",
        "mortalityCount": 2,
        "feedType": "Finisher",
        "feedConsumption": 997,
        "feedConsumptionBags": 14,
        "additionalLooseKg": 17,
        "averageWeight": 2336,
        "remainingChickCount": 4960,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-08-25T18:00:00.000Z"
      },
      "2026-08-26": {
        "batchId": "KG001",
        "recordDate": "2026-08-26",
        "mortalityCount": 1,
        "feedType": "Finisher",
        "feedConsumption": 997,
        "feedConsumptionBags": 14,
        "additionalLooseKg": 17,
        "averageWeight": 2474,
        "remainingChickCount": 4959,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-08-26T18:00:00.000Z"
      },
      "2026-08-27": {
        "batchId": "KG001",
        "recordDate": "2026-08-27",
        "mortalityCount": 1,
        "feedType": "Finisher",
        "feedConsumption": 992,
        "feedConsumptionBags": 14,
        "additionalLooseKg": 12,
        "averageWeight": 2616,
        "remainingChickCount": 4958,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-08-27T18:00:00.000Z"
      },
      "2026-08-28": {
        "batchId": "KG001",
        "recordDate": "2026-08-28",
        "mortalityCount": 0,
        "feedType": "Finisher",
        "feedConsumption": 982,
        "feedConsumptionBags": 14,
        "additionalLooseKg": 2,
        "averageWeight": 2762,
        "remainingChickCount": 4958,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-08-28T18:00:00.000Z"
      },
      "2026-08-29": {
        "batchId": "KG001",
        "recordDate": "2026-08-29",
        "mortalityCount": 2,
        "feedType": "Finisher",
        "feedConsumption": 961,
        "feedConsumptionBags": 13,
        "additionalLooseKg": 51,
        "averageWeight": 2912,
        "remainingChickCount": 4956,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-08-29T18:00:00.000Z"
      },
      "2026-08-30": {
        "batchId": "KG001",
        "recordDate": "2026-08-30",
        "mortalityCount": 1,
        "feedType": "Finisher",
        "feedConsumption": 936,
        "feedConsumptionBags": 13,
        "additionalLooseKg": 26,
        "averageWeight": 2272,
        "remainingChickCount": 4955,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-08-30T18:00:00.000Z"
      },
      "2026-08-31": {
        "batchId": "KG001",
        "recordDate": "2026-08-31",
        "mortalityCount": 1,
        "feedType": "Finisher",
        "feedConsumption": 902,
        "feedConsumptionBags": 12,
        "additionalLooseKg": 62,
        "averageWeight": 2425,
        "remainingChickCount": 4954,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-08-31T18:00:00.000Z"
      },
      "2026-09-01": {
        "batchId": "KG001",
        "recordDate": "2026-09-01",
        "mortalityCount": 1,
        "feedType": "Finisher",
        "feedConsumption": 867,
        "feedConsumptionBags": 12,
        "additionalLooseKg": 27,
        "averageWeight": 2480,
        "remainingChickCount": 4953,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-09-01T18:00:00.000Z"
      },
      "2026-09-02": {
        "batchId": "KG001",
        "recordDate": "2026-09-02",
        "mortalityCount": 2,
        "feedType": "Finisher",
        "feedConsumption": 827,
        "feedConsumptionBags": 11,
        "additionalLooseKg": 57,
        "averageWeight": 2515,
        "remainingChickCount": 4951,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-09-02T18:00:00.000Z"
      }
    },
    "KG002": {
      "2026-08-09": {
        "batchId": "KG002",
        "recordDate": "2026-08-09",
        "mortalityCount": 12,
        "feedType": "Pre-Starter",
        "feedConsumption": 60,
        "feedConsumptionBags": 0,
        "additionalLooseKg": 60,
        "averageWeight": 42,
        "remainingChickCount": 4184,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-08-09T18:00:00.000Z"
      },
      "2026-08-10": {
        "batchId": "KG002",
        "recordDate": "2026-08-10",
        "mortalityCount": 12,
        "feedType": "Pre-Starter",
        "feedConsumption": 70,
        "feedConsumptionBags": 1,
        "additionalLooseKg": 0,
        "averageWeight": 56,
        "remainingChickCount": 4172,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-08-10T18:00:00.000Z"
      },
      "2026-08-11": {
        "batchId": "KG002",
        "recordDate": "2026-08-11",
        "mortalityCount": 12,
        "feedType": "Pre-Starter",
        "feedConsumption": 85,
        "feedConsumptionBags": 1,
        "additionalLooseKg": 15,
        "averageWeight": 74,
        "remainingChickCount": 4160,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-08-11T18:00:00.000Z"
      },
      "2026-08-12": {
        "batchId": "KG002",
        "recordDate": "2026-08-12",
        "mortalityCount": 12,
        "feedType": "Pre-Starter",
        "feedConsumption": 100,
        "feedConsumptionBags": 1,
        "additionalLooseKg": 30,
        "averageWeight": 96,
        "remainingChickCount": 4148,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-08-12T18:00:00.000Z"
      },
      "2026-08-13": {
        "batchId": "KG002",
        "recordDate": "2026-08-13",
        "mortalityCount": 12,
        "feedType": "Pre-Starter",
        "feedConsumption": 120,
        "feedConsumptionBags": 1,
        "additionalLooseKg": 50,
        "averageWeight": 122,
        "remainingChickCount": 4136,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-08-13T18:00:00.000Z"
      },
      "2026-08-14": {
        "batchId": "KG002",
        "recordDate": "2026-08-14",
        "mortalityCount": 12,
        "feedType": "Pre-Starter",
        "feedConsumption": 140,
        "feedConsumptionBags": 2,
        "additionalLooseKg": 0,
        "averageWeight": 152,
        "remainingChickCount": 4124,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-08-14T18:00:00.000Z"
      },
      "2026-08-15": {
        "batchId": "KG002",
        "recordDate": "2026-08-15",
        "mortalityCount": 12,
        "feedType": "Pre-Starter",
        "feedConsumption": 165,
        "feedConsumptionBags": 2,
        "additionalLooseKg": 25,
        "averageWeight": 186,
        "remainingChickCount": 4112,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-08-15T18:00:00.000Z"
      },
      "2026-08-16": {
        "batchId": "KG002",
        "recordDate": "2026-08-16",
        "mortalityCount": 12,
        "feedType": "Starter",
        "feedConsumption": 190,
        "feedConsumptionBags": 2,
        "additionalLooseKg": 50,
        "averageWeight": 224,
        "remainingChickCount": 4100,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-08-16T18:00:00.000Z"
      },
      "2026-08-17": {
        "batchId": "KG002",
        "recordDate": "2026-08-17",
        "mortalityCount": 11,
        "feedType": "Starter",
        "feedConsumption": 220,
        "feedConsumptionBags": 3,
        "additionalLooseKg": 10,
        "averageWeight": 266,
        "remainingChickCount": 4089,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-08-17T18:00:00.000Z"
      },
      "2026-08-18": {
        "batchId": "KG002",
        "recordDate": "2026-08-18",
        "mortalityCount": 11,
        "feedType": "Starter",
        "feedConsumption": 249,
        "feedConsumptionBags": 3,
        "additionalLooseKg": 39,
        "averageWeight": 312,
        "remainingChickCount": 4078,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-08-18T18:00:00.000Z"
      },
      "2026-08-19": {
        "batchId": "KG002",
        "recordDate": "2026-08-19",
        "mortalityCount": 11,
        "feedType": "Starter",
        "feedConsumption": 284,
        "feedConsumptionBags": 4,
        "additionalLooseKg": 4,
        "averageWeight": 362,
        "remainingChickCount": 4067,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-08-19T18:00:00.000Z"
      },
      "2026-08-20": {
        "batchId": "KG002",
        "recordDate": "2026-08-20",
        "mortalityCount": 11,
        "feedType": "Starter",
        "feedConsumption": 319,
        "feedConsumptionBags": 4,
        "additionalLooseKg": 39,
        "averageWeight": 416,
        "remainingChickCount": 4056,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-08-20T18:00:00.000Z"
      },
      "2026-08-21": {
        "batchId": "KG002",
        "recordDate": "2026-08-21",
        "mortalityCount": 11,
        "feedType": "Starter",
        "feedConsumption": 359,
        "feedConsumptionBags": 5,
        "additionalLooseKg": 9,
        "averageWeight": 474,
        "remainingChickCount": 4045,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-08-21T18:00:00.000Z"
      },
      "2026-08-22": {
        "batchId": "KG002",
        "recordDate": "2026-08-22",
        "mortalityCount": 11,
        "feedType": "Starter",
        "feedConsumption": 399,
        "feedConsumptionBags": 5,
        "additionalLooseKg": 49,
        "averageWeight": 536,
        "remainingChickCount": 4034,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-08-22T18:00:00.000Z"
      },
      "2026-08-23": {
        "batchId": "KG002",
        "recordDate": "2026-08-23",
        "mortalityCount": 11,
        "feedType": "Starter",
        "feedConsumption": 438,
        "feedConsumptionBags": 6,
        "additionalLooseKg": 18,
        "averageWeight": 602,
        "remainingChickCount": 4023,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-08-23T18:00:00.000Z"
      },
      "2026-08-24": {
        "batchId": "KG002",
        "recordDate": "2026-08-24",
        "mortalityCount": 11,
        "feedType": "Starter",
        "feedConsumption": 478,
        "feedConsumptionBags": 6,
        "additionalLooseKg": 58,
        "averageWeight": 672,
        "remainingChickCount": 4012,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-08-24T18:00:00.000Z"
      },
      "2026-08-25": {
        "batchId": "KG002",
        "recordDate": "2026-08-25",
        "mortalityCount": 11,
        "feedType": "Starter",
        "feedConsumption": 523,
        "feedConsumptionBags": 7,
        "additionalLooseKg": 33,
        "averageWeight": 746,
        "remainingChickCount": 4001,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-08-25T18:00:00.000Z"
      },
      "2026-08-26": {
        "batchId": "KG002",
        "recordDate": "2026-08-26",
        "mortalityCount": 11,
        "feedType": "Starter",
        "feedConsumption": 568,
        "feedConsumptionBags": 8,
        "additionalLooseKg": 8,
        "averageWeight": 824,
        "remainingChickCount": 3990,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-08-26T18:00:00.000Z"
      },
      "2026-08-27": {
        "batchId": "KG002",
        "recordDate": "2026-08-27",
        "mortalityCount": 11,
        "feedType": "Starter",
        "feedConsumption": 612,
        "feedConsumptionBags": 8,
        "additionalLooseKg": 52,
        "averageWeight": 906,
        "remainingChickCount": 3979,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-08-27T18:00:00.000Z"
      },
      "2026-08-28": {
        "batchId": "KG002",
        "recordDate": "2026-08-28",
        "mortalityCount": 11,
        "feedType": "Starter",
        "feedConsumption": 657,
        "feedConsumptionBags": 9,
        "additionalLooseKg": 27,
        "averageWeight": 992,
        "remainingChickCount": 3968,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-08-28T18:00:00.000Z"
      },
      "2026-08-29": {
        "batchId": "KG002",
        "recordDate": "2026-08-29",
        "mortalityCount": 11,
        "feedType": "Starter",
        "feedConsumption": 702,
        "feedConsumptionBags": 10,
        "additionalLooseKg": 2,
        "averageWeight": 1082,
        "remainingChickCount": 3957,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-08-29T18:00:00.000Z"
      },
      "2026-08-30": {
        "batchId": "KG002",
        "recordDate": "2026-08-30",
        "mortalityCount": 11,
        "feedType": "Finisher",
        "feedConsumption": 746,
        "feedConsumptionBags": 10,
        "additionalLooseKg": 46,
        "averageWeight": 1176,
        "remainingChickCount": 3946,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-08-30T18:00:00.000Z"
      },
      "2026-08-31": {
        "batchId": "KG002",
        "recordDate": "2026-08-31",
        "mortalityCount": 11,
        "feedType": "Finisher",
        "feedConsumption": 786,
        "feedConsumptionBags": 11,
        "additionalLooseKg": 16,
        "averageWeight": 1274,
        "remainingChickCount": 3935,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-08-31T18:00:00.000Z"
      },
      "2026-09-01": {
        "batchId": "KG002",
        "recordDate": "2026-09-01",
        "mortalityCount": 11,
        "feedType": "Finisher",
        "feedConsumption": 826,
        "feedConsumptionBags": 11,
        "additionalLooseKg": 56,
        "averageWeight": 1376,
        "remainingChickCount": 3924,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-09-01T18:00:00.000Z"
      },
      "2026-09-02": {
        "batchId": "KG002",
        "recordDate": "2026-09-02",
        "mortalityCount": 11,
        "feedType": "Finisher",
        "feedConsumption": 860,
        "feedConsumptionBags": 12,
        "additionalLooseKg": 20,
        "averageWeight": 1482,
        "remainingChickCount": 3913,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-09-02T18:00:00.000Z"
      },
      "2026-09-03": {
        "batchId": "KG002",
        "recordDate": "2026-09-03",
        "mortalityCount": 11,
        "feedType": "Finisher",
        "feedConsumption": 895,
        "feedConsumptionBags": 12,
        "additionalLooseKg": 55,
        "averageWeight": 1592,
        "remainingChickCount": 3902,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-09-03T18:00:00.000Z"
      },
      "2026-09-04": {
        "batchId": "KG002",
        "recordDate": "2026-09-04",
        "mortalityCount": 11,
        "feedType": "Finisher",
        "feedConsumption": 924,
        "feedConsumptionBags": 13,
        "additionalLooseKg": 14,
        "averageWeight": 1706,
        "remainingChickCount": 3891,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-09-04T18:00:00.000Z"
      },
      "2026-09-05": {
        "batchId": "KG002",
        "recordDate": "2026-09-05",
        "mortalityCount": 11,
        "feedType": "Finisher",
        "feedConsumption": 949,
        "feedConsumptionBags": 13,
        "additionalLooseKg": 39,
        "averageWeight": 1824,
        "remainingChickCount": 3880,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-09-05T18:00:00.000Z"
      },
      "2026-09-06": {
        "batchId": "KG002",
        "recordDate": "2026-09-06",
        "mortalityCount": 11,
        "feedType": "Finisher",
        "feedConsumption": 969,
        "feedConsumptionBags": 13,
        "additionalLooseKg": 59,
        "averageWeight": 1946,
        "remainingChickCount": 3869,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-09-06T18:00:00.000Z"
      },
      "2026-09-07": {
        "batchId": "KG002",
        "recordDate": "2026-09-07",
        "mortalityCount": 11,
        "feedType": "Finisher",
        "feedConsumption": 983,
        "feedConsumptionBags": 14,
        "additionalLooseKg": 3,
        "averageWeight": 2072,
        "remainingChickCount": 3858,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-09-07T18:00:00.000Z"
      },
      "2026-09-08": {
        "batchId": "KG002",
        "recordDate": "2026-09-08",
        "mortalityCount": 11,
        "feedType": "Finisher",
        "feedConsumption": 993,
        "feedConsumptionBags": 14,
        "additionalLooseKg": 13,
        "averageWeight": 2202,
        "remainingChickCount": 3847,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-09-08T18:00:00.000Z"
      },
      "2026-09-09": {
        "batchId": "KG002",
        "recordDate": "2026-09-09",
        "mortalityCount": 11,
        "feedType": "Finisher",
        "feedConsumption": 998,
        "feedConsumptionBags": 14,
        "additionalLooseKg": 18,
        "averageWeight": 2336,
        "remainingChickCount": 3836,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-09-09T18:00:00.000Z"
      },
      "2026-09-10": {
        "batchId": "KG002",
        "recordDate": "2026-09-10",
        "mortalityCount": 11,
        "feedType": "Finisher",
        "feedConsumption": 998,
        "feedConsumptionBags": 14,
        "additionalLooseKg": 18,
        "averageWeight": 2474,
        "remainingChickCount": 3825,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-09-10T18:00:00.000Z"
      },
      "2026-09-11": {
        "batchId": "KG002",
        "recordDate": "2026-09-11",
        "mortalityCount": 11,
        "feedType": "Finisher",
        "feedConsumption": 992,
        "feedConsumptionBags": 14,
        "additionalLooseKg": 12,
        "averageWeight": 2616,
        "remainingChickCount": 3814,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-09-11T18:00:00.000Z"
      },
      "2026-09-12": {
        "batchId": "KG002",
        "recordDate": "2026-09-12",
        "mortalityCount": 11,
        "feedType": "Finisher",
        "feedConsumption": 982,
        "feedConsumptionBags": 14,
        "additionalLooseKg": 2,
        "averageWeight": 2762,
        "remainingChickCount": 3803,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-09-12T18:00:00.000Z"
      },
      "2026-09-13": {
        "batchId": "KG002",
        "recordDate": "2026-09-13",
        "mortalityCount": 11,
        "feedType": "Finisher",
        "feedConsumption": 962,
        "feedConsumptionBags": 13,
        "additionalLooseKg": 52,
        "averageWeight": 2912,
        "remainingChickCount": 3792,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-09-13T18:00:00.000Z"
      },
      "2026-09-14": {
        "batchId": "KG002",
        "recordDate": "2026-09-14",
        "mortalityCount": 11,
        "feedType": "Finisher",
        "feedConsumption": 937,
        "feedConsumptionBags": 13,
        "additionalLooseKg": 27,
        "averageWeight": 2272,
        "remainingChickCount": 3781,
        "recordedBy": "KG Poultry Farms",
        "updatedAt": "2026-09-14T18:00:00.000Z"
      }
    }
  },
  "feedStocks": {
    "KG001": [
      {
        "id": "feed-b1-1",
        "batchId": "KG001",
        "feedType": "Pre-Starter",
        "driverName": "Murugan",
        "vehicleNumber": "TN-38-B-9988",
        "quantityReceived": 1000,
        "quantityReceivedKg": 1000,
        "bagsReceived": 14.3,
        "date": "2026-07-25",
        "notes": "Initial pre-starter arrival",
        "createdAt": "2026-07-25T08:00:00.000Z"
      },
      {
        "id": "feed-b1-2",
        "batchId": "KG001",
        "feedType": "Starter",
        "driverName": "Murugan",
        "vehicleNumber": "TN-38-B-9988",
        "quantityReceived": 3500,
        "quantityReceivedKg": 3500,
        "bagsReceived": 50,
        "date": "2026-08-01",
        "notes": "Starter feed arrival",
        "createdAt": "2026-08-01T09:00:00.000Z"
      },
      {
        "id": "feed-b1-3",
        "batchId": "KG001",
        "feedType": "Finisher",
        "driverName": "Murugan",
        "vehicleNumber": "TN-38-B-9988",
        "quantityReceived": 12000,
        "quantityReceivedKg": 12000,
        "bagsReceived": 171.4,
        "date": "2026-08-15",
        "notes": "Finisher feed arrival",
        "createdAt": "2026-08-15T10:00:00.000Z"
      }
    ],
    "KG002": [
      {
        "id": "feed-b2-1",
        "batchId": "KG002",
        "feedType": "Pre-Starter",
        "driverName": "Suresh",
        "vehicleNumber": "TN-38-AX-9911",
        "quantityReceived": 1000,
        "quantityReceivedKg": 1000,
        "bagsReceived": 14.3,
        "date": "2026-08-09",
        "notes": "Initial pre-starter arrival for KG002",
        "createdAt": "2026-08-09T08:00:00.000Z"
      },
      {
        "id": "feed-b2-2",
        "batchId": "KG002",
        "feedType": "Starter",
        "driverName": "Suresh",
        "vehicleNumber": "TN-38-AX-9911",
        "quantityReceived": 3500,
        "quantityReceivedKg": 3500,
        "bagsReceived": 50,
        "date": "2026-08-16",
        "notes": "Starter feed arrival for KG002",
        "createdAt": "2026-08-16T09:00:00.000Z"
      },
      {
        "id": "feed-b2-3",
        "batchId": "KG002",
        "feedType": "Finisher",
        "driverName": "Suresh",
        "vehicleNumber": "TN-38-AX-9911",
        "quantityReceived": 12000,
        "quantityReceivedKg": 12000,
        "bagsReceived": 171.4,
        "date": "2026-08-30",
        "notes": "Finisher feed arrival for KG002",
        "createdAt": "2026-08-30T10:00:00.000Z"
      }
    ]
  },
  "medicineRecords": {
    "KG001": [
      {
        "id": "med-b1-1",
        "batchId": "KG001",
        "medicineName": "Newcastle Vaccine (B1 Strain)",
        "date": "2026-07-31",
        "dosage": "100 ml",
        "notes": "Administered in drinking water Day 7",
        "createdAt": "2026-07-31T09:00:00.000Z"
      },
      {
        "id": "med-b1-2",
        "batchId": "KG001",
        "medicineName": "Gumboro Vaccine (IBD)",
        "date": "2026-08-07",
        "dosage": "150 ml",
        "notes": "Administered Day 14 booster",
        "createdAt": "2026-08-07T09:00:00.000Z"
      }
    ],
    "KG002": [
      {
        "id": "med-b2-1",
        "batchId": "KG002",
        "medicineName": "Newcastle Vaccine (B1 Strain)",
        "date": "2026-08-15",
        "dosage": "100 ml",
        "notes": "Administered in drinking water Day 7",
        "createdAt": "2026-08-15T09:00:00.000Z"
      },
      {
        "id": "med-b2-2",
        "batchId": "KG002",
        "medicineName": "Gumboro Vaccine (IBD)",
        "date": "2026-08-22",
        "dosage": "150 ml",
        "notes": "Administered Day 14 booster",
        "createdAt": "2026-08-22T09:00:00.000Z"
      }
    ]
  },
  "dispatches": {
    "disp-kg001-1": {
      "id": "disp-kg001-1",
      "batchId": "KG001",
      "dispatchDate": "2026-08-30",
      "invoiceNumber": "INV-2026-8801",
      "vehicleName": "Sri Annapoorna Chicken Shop - Coimbatore",
      "vehicleNumber": "TN-38-AX-1234",
      "driverName": "Suresh Kumar",
      "driverMobileNumber": "+91 9876543210",
      "totalBoxCount": 25,
      "chickenCountPerBox": 12,
      "birdsCount": 300,
      "totalBirds": 300,
      "totalChickens": 300,
      "cratesCount": 25,
      "totalCrates": 25,
      "totalWeight": 720,
      "averageWeight": 2.4,
      "status": "Completed",
      "createdAt": "2026-08-30T10:00:00.000Z",
      "updatedAt": "2026-08-30T12:30:00.000Z"
    },
    "disp-kg001-2": {
      "id": "disp-kg001-2",
      "batchId": "KG001",
      "dispatchDate": "2026-08-31",
      "invoiceNumber": "INV-2026-8802",
      "vehicleName": "Sri Lakshmi Broiler Center - Tiruppur",
      "vehicleNumber": "TN-38-B-5544",
      "driverName": "Murugan",
      "driverMobileNumber": "+91 9876543212",
      "totalBoxCount": 30,
      "chickenCountPerBox": 12,
      "birdsCount": 360,
      "totalBirds": 360,
      "totalChickens": 360,
      "cratesCount": 30,
      "totalCrates": 30,
      "totalWeight": 873,
      "averageWeight": 2.425,
      "status": "Completed",
      "createdAt": "2026-08-31T08:00:00.000Z",
      "updatedAt": "2026-08-31T11:45:00.000Z"
    },
    "disp-kg001-3": {
      "id": "disp-kg001-3",
      "batchId": "KG001",
      "dispatchDate": "2026-09-01",
      "invoiceNumber": "INV-2026-8803",
      "vehicleName": "SKM Wholesale Chicken Traders - Erode",
      "vehicleNumber": "TN-38-C-9911",
      "driverName": "Karthik",
      "driverMobileNumber": "+91 9876543215",
      "totalBoxCount": 20,
      "chickenCountPerBox": 12,
      "birdsCount": 240,
      "totalBirds": 240,
      "totalChickens": 240,
      "cratesCount": 20,
      "totalCrates": 20,
      "totalWeight": 588,
      "averageWeight": 2.45,
      "status": "Completed",
      "createdAt": "2026-09-01T07:30:00.000Z",
      "updatedAt": "2026-09-01T10:15:00.000Z"
    },
    "disp-kg001-4": {
      "id": "disp-kg001-4",
      "batchId": "KG001",
      "dispatchDate": "2026-09-01",
      "invoiceNumber": "INV-2026-8804",
      "vehicleName": "Royal Fresh Chicken Stall - Salem",
      "vehicleNumber": "TN-38-D-7722",
      "driverName": "Velu",
      "driverMobileNumber": "+91 9876543216",
      "totalBoxCount": 25,
      "chickenCountPerBox": 12,
      "birdsCount": 300,
      "totalBirds": 300,
      "totalChickens": 300,
      "cratesCount": 25,
      "totalCrates": 25,
      "totalWeight": 742.5,
      "averageWeight": 2.475,
      "status": "Completed",
      "createdAt": "2026-09-01T11:00:00.000Z",
      "updatedAt": "2026-09-01T13:45:00.000Z"
    },
    "disp-kg001-5": {
      "id": "disp-kg001-5",
      "batchId": "KG001",
      "dispatchDate": "2026-09-02",
      "invoiceNumber": "INV-2026-8805",
      "vehicleName": "Venkateshwara Poultry Shop - Namakkal",
      "vehicleNumber": "TN-38-E-3344",
      "driverName": "Raja",
      "driverMobileNumber": "+91 9876543217",
      "totalBoxCount": 30,
      "chickenCountPerBox": 12,
      "birdsCount": 360,
      "totalBirds": 360,
      "totalChickens": 360,
      "cratesCount": 30,
      "totalCrates": 30,
      "totalWeight": 900,
      "averageWeight": 2.5,
      "status": "Completed",
      "createdAt": "2026-09-02T08:00:00.000Z",
      "updatedAt": "2026-09-02T11:00:00.000Z"
    },
    "disp-kg001-6": {
      "id": "disp-kg001-6",
      "batchId": "KG001",
      "dispatchDate": "2026-09-02",
      "invoiceNumber": "INV-2026-8806",
      "vehicleName": "Kovai Fresh Meat & Poultry - Pollachi",
      "vehicleNumber": "TN-38-F-1122",
      "driverName": "Senthil",
      "driverMobileNumber": "+91 9876543218",
      "totalBoxCount": 283,
      "chickenCountPerBox": 12,
      "birdsCount": 3388,
      "totalBirds": 3388,
      "totalChickens": 3388,
      "cratesCount": 283,
      "totalCrates": 283,
      "totalWeight": 8520.82,
      "averageWeight": 2.515,
      "status": "Completed",
      "createdAt": "2026-09-02T12:00:00.000Z",
      "updatedAt": "2026-09-02T17:00:00.000Z"
    },
    "disp-kg002-1": {
      "id": "disp-kg002-1",
      "batchId": "KG002",
      "dispatchDate": "2026-09-13",
      "invoiceNumber": "INV-2026-9901",
      "vehicleName": "Greenland Chicken Shop - Karur",
      "vehicleNumber": "TN-38-AX-9911",
      "driverName": "Suresh",
      "driverMobileNumber": "+91 9876543211",
      "totalBoxCount": 150,
      "chickenCountPerBox": 12,
      "birdsCount": 1800,
      "totalBirds": 1800,
      "totalChickens": 1800,
      "cratesCount": 150,
      "totalCrates": 150,
      "totalWeight": 3853.8,
      "averageWeight": 2.141,
      "status": "Completed",
      "createdAt": "2026-09-13T09:00:00.000Z",
      "updatedAt": "2026-09-13T11:30:00.000Z"
    },
    "disp-kg002-2": {
      "id": "disp-kg002-2",
      "batchId": "KG002",
      "dispatchDate": "2026-09-14",
      "invoiceNumber": "INV-2026-9902",
      "vehicleName": "Pioneer Poultry & Traders - Dindigul",
      "vehicleNumber": "TN-38-AX-1234",
      "driverName": "Suresh",
      "driverMobileNumber": "+91 9876543211",
      "totalBoxCount": 163,
      "chickenCountPerBox": 12,
      "birdsCount": 1962,
      "totalBirds": 1962,
      "totalChickens": 1962,
      "cratesCount": 163,
      "totalCrates": 163,
      "totalWeight": 4200.642,
      "averageWeight": 2.141,
      "status": "Completed",
      "createdAt": "2026-09-14T09:00:00.000Z",
      "updatedAt": "2026-09-14T11:00:00.000Z"
    }
  },
  "boxSets": {
    "disp-kg001-1": [
      {
        "id": "set-disp-kg001-1-1",
        "dispatchId": "disp-kg001-1",
        "boxSetNumber": 1,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 169,
        "chickenCount": 60,
        "totalChickenWeight": 144,
        "averageChickenWeight": 2.4,
        "isPendingLoad": false,
        "savedAt": "2026-08-30T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-1-2",
        "dispatchId": "disp-kg001-1",
        "boxSetNumber": 2,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 169,
        "chickenCount": 60,
        "totalChickenWeight": 144,
        "averageChickenWeight": 2.4,
        "isPendingLoad": false,
        "savedAt": "2026-08-30T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-1-3",
        "dispatchId": "disp-kg001-1",
        "boxSetNumber": 3,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 169,
        "chickenCount": 60,
        "totalChickenWeight": 144,
        "averageChickenWeight": 2.4,
        "isPendingLoad": false,
        "savedAt": "2026-08-30T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-1-4",
        "dispatchId": "disp-kg001-1",
        "boxSetNumber": 4,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 169,
        "chickenCount": 60,
        "totalChickenWeight": 144,
        "averageChickenWeight": 2.4,
        "isPendingLoad": false,
        "savedAt": "2026-08-30T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-1-5",
        "dispatchId": "disp-kg001-1",
        "boxSetNumber": 5,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 169,
        "chickenCount": 60,
        "totalChickenWeight": 144,
        "averageChickenWeight": 2.4,
        "isPendingLoad": false,
        "savedAt": "2026-08-30T09:30:00.000Z"
      }
    ],
    "disp-kg001-2": [
      {
        "id": "set-disp-kg001-2-1",
        "dispatchId": "disp-kg001-2",
        "boxSetNumber": 1,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 170.5,
        "chickenCount": 60,
        "totalChickenWeight": 145.5,
        "averageChickenWeight": 2.425,
        "isPendingLoad": false,
        "savedAt": "2026-08-31T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-2-2",
        "dispatchId": "disp-kg001-2",
        "boxSetNumber": 2,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 170.5,
        "chickenCount": 60,
        "totalChickenWeight": 145.5,
        "averageChickenWeight": 2.425,
        "isPendingLoad": false,
        "savedAt": "2026-08-31T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-2-3",
        "dispatchId": "disp-kg001-2",
        "boxSetNumber": 3,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 170.5,
        "chickenCount": 60,
        "totalChickenWeight": 145.5,
        "averageChickenWeight": 2.425,
        "isPendingLoad": false,
        "savedAt": "2026-08-31T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-2-4",
        "dispatchId": "disp-kg001-2",
        "boxSetNumber": 4,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 170.5,
        "chickenCount": 60,
        "totalChickenWeight": 145.5,
        "averageChickenWeight": 2.425,
        "isPendingLoad": false,
        "savedAt": "2026-08-31T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-2-5",
        "dispatchId": "disp-kg001-2",
        "boxSetNumber": 5,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 170.5,
        "chickenCount": 60,
        "totalChickenWeight": 145.5,
        "averageChickenWeight": 2.425,
        "isPendingLoad": false,
        "savedAt": "2026-08-31T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-2-6",
        "dispatchId": "disp-kg001-2",
        "boxSetNumber": 6,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 170.5,
        "chickenCount": 60,
        "totalChickenWeight": 145.5,
        "averageChickenWeight": 2.425,
        "isPendingLoad": false,
        "savedAt": "2026-08-31T09:30:00.000Z"
      }
    ],
    "disp-kg001-3": [
      {
        "id": "set-disp-kg001-3-1",
        "dispatchId": "disp-kg001-3",
        "boxSetNumber": 1,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 172,
        "chickenCount": 60,
        "totalChickenWeight": 147,
        "averageChickenWeight": 2.45,
        "isPendingLoad": false,
        "savedAt": "2026-09-01T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-3-2",
        "dispatchId": "disp-kg001-3",
        "boxSetNumber": 2,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 172,
        "chickenCount": 60,
        "totalChickenWeight": 147,
        "averageChickenWeight": 2.45,
        "isPendingLoad": false,
        "savedAt": "2026-09-01T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-3-3",
        "dispatchId": "disp-kg001-3",
        "boxSetNumber": 3,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 172,
        "chickenCount": 60,
        "totalChickenWeight": 147,
        "averageChickenWeight": 2.45,
        "isPendingLoad": false,
        "savedAt": "2026-09-01T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-3-4",
        "dispatchId": "disp-kg001-3",
        "boxSetNumber": 4,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 172,
        "chickenCount": 60,
        "totalChickenWeight": 147,
        "averageChickenWeight": 2.45,
        "isPendingLoad": false,
        "savedAt": "2026-09-01T09:30:00.000Z"
      }
    ],
    "disp-kg001-4": [
      {
        "id": "set-disp-kg001-4-1",
        "dispatchId": "disp-kg001-4",
        "boxSetNumber": 1,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 173.5,
        "chickenCount": 60,
        "totalChickenWeight": 148.5,
        "averageChickenWeight": 2.475,
        "isPendingLoad": false,
        "savedAt": "2026-09-01T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-4-2",
        "dispatchId": "disp-kg001-4",
        "boxSetNumber": 2,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 173.5,
        "chickenCount": 60,
        "totalChickenWeight": 148.5,
        "averageChickenWeight": 2.475,
        "isPendingLoad": false,
        "savedAt": "2026-09-01T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-4-3",
        "dispatchId": "disp-kg001-4",
        "boxSetNumber": 3,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 173.5,
        "chickenCount": 60,
        "totalChickenWeight": 148.5,
        "averageChickenWeight": 2.475,
        "isPendingLoad": false,
        "savedAt": "2026-09-01T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-4-4",
        "dispatchId": "disp-kg001-4",
        "boxSetNumber": 4,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 173.5,
        "chickenCount": 60,
        "totalChickenWeight": 148.5,
        "averageChickenWeight": 2.475,
        "isPendingLoad": false,
        "savedAt": "2026-09-01T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-4-5",
        "dispatchId": "disp-kg001-4",
        "boxSetNumber": 5,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 173.5,
        "chickenCount": 60,
        "totalChickenWeight": 148.5,
        "averageChickenWeight": 2.475,
        "isPendingLoad": false,
        "savedAt": "2026-09-01T09:30:00.000Z"
      }
    ],
    "disp-kg001-5": [
      {
        "id": "set-disp-kg001-5-1",
        "dispatchId": "disp-kg001-5",
        "boxSetNumber": 1,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 175,
        "chickenCount": 60,
        "totalChickenWeight": 150,
        "averageChickenWeight": 2.5,
        "isPendingLoad": false,
        "savedAt": "2026-09-02T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-5-2",
        "dispatchId": "disp-kg001-5",
        "boxSetNumber": 2,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 175,
        "chickenCount": 60,
        "totalChickenWeight": 150,
        "averageChickenWeight": 2.5,
        "isPendingLoad": false,
        "savedAt": "2026-09-02T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-5-3",
        "dispatchId": "disp-kg001-5",
        "boxSetNumber": 3,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 175,
        "chickenCount": 60,
        "totalChickenWeight": 150,
        "averageChickenWeight": 2.5,
        "isPendingLoad": false,
        "savedAt": "2026-09-02T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-5-4",
        "dispatchId": "disp-kg001-5",
        "boxSetNumber": 4,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 175,
        "chickenCount": 60,
        "totalChickenWeight": 150,
        "averageChickenWeight": 2.5,
        "isPendingLoad": false,
        "savedAt": "2026-09-02T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-5-5",
        "dispatchId": "disp-kg001-5",
        "boxSetNumber": 5,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 175,
        "chickenCount": 60,
        "totalChickenWeight": 150,
        "averageChickenWeight": 2.5,
        "isPendingLoad": false,
        "savedAt": "2026-09-02T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-5-6",
        "dispatchId": "disp-kg001-5",
        "boxSetNumber": 6,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 175,
        "chickenCount": 60,
        "totalChickenWeight": 150,
        "averageChickenWeight": 2.5,
        "isPendingLoad": false,
        "savedAt": "2026-09-02T09:30:00.000Z"
      }
    ],
    "disp-kg001-6": [
      {
        "id": "set-disp-kg001-6-1",
        "dispatchId": "disp-kg001-6",
        "boxSetNumber": 1,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 175.9,
        "chickenCount": 60,
        "totalChickenWeight": 150.9,
        "averageChickenWeight": 2.515,
        "isPendingLoad": false,
        "savedAt": "2026-09-02T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-6-2",
        "dispatchId": "disp-kg001-6",
        "boxSetNumber": 2,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 175.9,
        "chickenCount": 60,
        "totalChickenWeight": 150.9,
        "averageChickenWeight": 2.515,
        "isPendingLoad": false,
        "savedAt": "2026-09-02T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-6-3",
        "dispatchId": "disp-kg001-6",
        "boxSetNumber": 3,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 175.9,
        "chickenCount": 60,
        "totalChickenWeight": 150.9,
        "averageChickenWeight": 2.515,
        "isPendingLoad": false,
        "savedAt": "2026-09-02T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-6-4",
        "dispatchId": "disp-kg001-6",
        "boxSetNumber": 4,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 175.9,
        "chickenCount": 60,
        "totalChickenWeight": 150.9,
        "averageChickenWeight": 2.515,
        "isPendingLoad": false,
        "savedAt": "2026-09-02T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-6-5",
        "dispatchId": "disp-kg001-6",
        "boxSetNumber": 5,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 175.9,
        "chickenCount": 60,
        "totalChickenWeight": 150.9,
        "averageChickenWeight": 2.515,
        "isPendingLoad": false,
        "savedAt": "2026-09-02T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-6-6",
        "dispatchId": "disp-kg001-6",
        "boxSetNumber": 6,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 175.9,
        "chickenCount": 60,
        "totalChickenWeight": 150.9,
        "averageChickenWeight": 2.515,
        "isPendingLoad": false,
        "savedAt": "2026-09-02T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-6-7",
        "dispatchId": "disp-kg001-6",
        "boxSetNumber": 7,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 175.9,
        "chickenCount": 60,
        "totalChickenWeight": 150.9,
        "averageChickenWeight": 2.515,
        "isPendingLoad": false,
        "savedAt": "2026-09-02T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-6-8",
        "dispatchId": "disp-kg001-6",
        "boxSetNumber": 8,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 175.9,
        "chickenCount": 60,
        "totalChickenWeight": 150.9,
        "averageChickenWeight": 2.515,
        "isPendingLoad": false,
        "savedAt": "2026-09-02T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-6-9",
        "dispatchId": "disp-kg001-6",
        "boxSetNumber": 9,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 175.9,
        "chickenCount": 60,
        "totalChickenWeight": 150.9,
        "averageChickenWeight": 2.515,
        "isPendingLoad": false,
        "savedAt": "2026-09-02T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-6-10",
        "dispatchId": "disp-kg001-6",
        "boxSetNumber": 10,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 175.9,
        "chickenCount": 60,
        "totalChickenWeight": 150.9,
        "averageChickenWeight": 2.515,
        "isPendingLoad": false,
        "savedAt": "2026-09-02T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-6-11",
        "dispatchId": "disp-kg001-6",
        "boxSetNumber": 11,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 175.9,
        "chickenCount": 60,
        "totalChickenWeight": 150.9,
        "averageChickenWeight": 2.515,
        "isPendingLoad": false,
        "savedAt": "2026-09-02T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-6-12",
        "dispatchId": "disp-kg001-6",
        "boxSetNumber": 12,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 175.9,
        "chickenCount": 60,
        "totalChickenWeight": 150.9,
        "averageChickenWeight": 2.515,
        "isPendingLoad": false,
        "savedAt": "2026-09-02T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-6-13",
        "dispatchId": "disp-kg001-6",
        "boxSetNumber": 13,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 175.9,
        "chickenCount": 60,
        "totalChickenWeight": 150.9,
        "averageChickenWeight": 2.515,
        "isPendingLoad": false,
        "savedAt": "2026-09-02T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-6-14",
        "dispatchId": "disp-kg001-6",
        "boxSetNumber": 14,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 175.9,
        "chickenCount": 60,
        "totalChickenWeight": 150.9,
        "averageChickenWeight": 2.515,
        "isPendingLoad": false,
        "savedAt": "2026-09-02T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-6-15",
        "dispatchId": "disp-kg001-6",
        "boxSetNumber": 15,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 175.9,
        "chickenCount": 60,
        "totalChickenWeight": 150.9,
        "averageChickenWeight": 2.515,
        "isPendingLoad": false,
        "savedAt": "2026-09-02T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-6-16",
        "dispatchId": "disp-kg001-6",
        "boxSetNumber": 16,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 175.9,
        "chickenCount": 60,
        "totalChickenWeight": 150.9,
        "averageChickenWeight": 2.515,
        "isPendingLoad": false,
        "savedAt": "2026-09-02T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-6-17",
        "dispatchId": "disp-kg001-6",
        "boxSetNumber": 17,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 175.9,
        "chickenCount": 60,
        "totalChickenWeight": 150.9,
        "averageChickenWeight": 2.515,
        "isPendingLoad": false,
        "savedAt": "2026-09-02T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-6-18",
        "dispatchId": "disp-kg001-6",
        "boxSetNumber": 18,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 175.9,
        "chickenCount": 60,
        "totalChickenWeight": 150.9,
        "averageChickenWeight": 2.515,
        "isPendingLoad": false,
        "savedAt": "2026-09-02T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-6-19",
        "dispatchId": "disp-kg001-6",
        "boxSetNumber": 19,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 175.9,
        "chickenCount": 60,
        "totalChickenWeight": 150.9,
        "averageChickenWeight": 2.515,
        "isPendingLoad": false,
        "savedAt": "2026-09-02T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-6-20",
        "dispatchId": "disp-kg001-6",
        "boxSetNumber": 20,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 175.9,
        "chickenCount": 60,
        "totalChickenWeight": 150.9,
        "averageChickenWeight": 2.515,
        "isPendingLoad": false,
        "savedAt": "2026-09-02T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-6-21",
        "dispatchId": "disp-kg001-6",
        "boxSetNumber": 21,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 175.9,
        "chickenCount": 60,
        "totalChickenWeight": 150.9,
        "averageChickenWeight": 2.515,
        "isPendingLoad": false,
        "savedAt": "2026-09-02T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-6-22",
        "dispatchId": "disp-kg001-6",
        "boxSetNumber": 22,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 175.9,
        "chickenCount": 60,
        "totalChickenWeight": 150.9,
        "averageChickenWeight": 2.515,
        "isPendingLoad": false,
        "savedAt": "2026-09-02T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-6-23",
        "dispatchId": "disp-kg001-6",
        "boxSetNumber": 23,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 175.9,
        "chickenCount": 60,
        "totalChickenWeight": 150.9,
        "averageChickenWeight": 2.515,
        "isPendingLoad": false,
        "savedAt": "2026-09-02T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-6-24",
        "dispatchId": "disp-kg001-6",
        "boxSetNumber": 24,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 175.9,
        "chickenCount": 60,
        "totalChickenWeight": 150.9,
        "averageChickenWeight": 2.515,
        "isPendingLoad": false,
        "savedAt": "2026-09-02T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-6-25",
        "dispatchId": "disp-kg001-6",
        "boxSetNumber": 25,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 175.9,
        "chickenCount": 60,
        "totalChickenWeight": 150.9,
        "averageChickenWeight": 2.515,
        "isPendingLoad": false,
        "savedAt": "2026-09-02T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-6-26",
        "dispatchId": "disp-kg001-6",
        "boxSetNumber": 26,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 175.9,
        "chickenCount": 60,
        "totalChickenWeight": 150.9,
        "averageChickenWeight": 2.515,
        "isPendingLoad": false,
        "savedAt": "2026-09-02T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-6-27",
        "dispatchId": "disp-kg001-6",
        "boxSetNumber": 27,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 175.9,
        "chickenCount": 60,
        "totalChickenWeight": 150.9,
        "averageChickenWeight": 2.515,
        "isPendingLoad": false,
        "savedAt": "2026-09-02T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-6-28",
        "dispatchId": "disp-kg001-6",
        "boxSetNumber": 28,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 175.9,
        "chickenCount": 60,
        "totalChickenWeight": 150.9,
        "averageChickenWeight": 2.515,
        "isPendingLoad": false,
        "savedAt": "2026-09-02T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-6-29",
        "dispatchId": "disp-kg001-6",
        "boxSetNumber": 29,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 175.9,
        "chickenCount": 60,
        "totalChickenWeight": 150.9,
        "averageChickenWeight": 2.515,
        "isPendingLoad": false,
        "savedAt": "2026-09-02T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-6-30",
        "dispatchId": "disp-kg001-6",
        "boxSetNumber": 30,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 175.9,
        "chickenCount": 60,
        "totalChickenWeight": 150.9,
        "averageChickenWeight": 2.515,
        "isPendingLoad": false,
        "savedAt": "2026-09-02T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-6-31",
        "dispatchId": "disp-kg001-6",
        "boxSetNumber": 31,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 175.9,
        "chickenCount": 60,
        "totalChickenWeight": 150.9,
        "averageChickenWeight": 2.515,
        "isPendingLoad": false,
        "savedAt": "2026-09-02T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-6-32",
        "dispatchId": "disp-kg001-6",
        "boxSetNumber": 32,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 175.9,
        "chickenCount": 60,
        "totalChickenWeight": 150.9,
        "averageChickenWeight": 2.515,
        "isPendingLoad": false,
        "savedAt": "2026-09-02T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-6-33",
        "dispatchId": "disp-kg001-6",
        "boxSetNumber": 33,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 175.9,
        "chickenCount": 60,
        "totalChickenWeight": 150.9,
        "averageChickenWeight": 2.515,
        "isPendingLoad": false,
        "savedAt": "2026-09-02T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-6-34",
        "dispatchId": "disp-kg001-6",
        "boxSetNumber": 34,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 175.9,
        "chickenCount": 60,
        "totalChickenWeight": 150.9,
        "averageChickenWeight": 2.515,
        "isPendingLoad": false,
        "savedAt": "2026-09-02T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-6-35",
        "dispatchId": "disp-kg001-6",
        "boxSetNumber": 35,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 175.9,
        "chickenCount": 60,
        "totalChickenWeight": 150.9,
        "averageChickenWeight": 2.515,
        "isPendingLoad": false,
        "savedAt": "2026-09-02T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-6-36",
        "dispatchId": "disp-kg001-6",
        "boxSetNumber": 36,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 175.9,
        "chickenCount": 60,
        "totalChickenWeight": 150.9,
        "averageChickenWeight": 2.515,
        "isPendingLoad": false,
        "savedAt": "2026-09-02T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-6-37",
        "dispatchId": "disp-kg001-6",
        "boxSetNumber": 37,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 175.9,
        "chickenCount": 60,
        "totalChickenWeight": 150.9,
        "averageChickenWeight": 2.515,
        "isPendingLoad": false,
        "savedAt": "2026-09-02T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-6-38",
        "dispatchId": "disp-kg001-6",
        "boxSetNumber": 38,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 175.9,
        "chickenCount": 60,
        "totalChickenWeight": 150.9,
        "averageChickenWeight": 2.515,
        "isPendingLoad": false,
        "savedAt": "2026-09-02T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-6-39",
        "dispatchId": "disp-kg001-6",
        "boxSetNumber": 39,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 175.9,
        "chickenCount": 60,
        "totalChickenWeight": 150.9,
        "averageChickenWeight": 2.515,
        "isPendingLoad": false,
        "savedAt": "2026-09-02T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-6-40",
        "dispatchId": "disp-kg001-6",
        "boxSetNumber": 40,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 175.9,
        "chickenCount": 60,
        "totalChickenWeight": 150.9,
        "averageChickenWeight": 2.515,
        "isPendingLoad": false,
        "savedAt": "2026-09-02T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-6-41",
        "dispatchId": "disp-kg001-6",
        "boxSetNumber": 41,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 175.9,
        "chickenCount": 60,
        "totalChickenWeight": 150.9,
        "averageChickenWeight": 2.515,
        "isPendingLoad": false,
        "savedAt": "2026-09-02T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-6-42",
        "dispatchId": "disp-kg001-6",
        "boxSetNumber": 42,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 175.9,
        "chickenCount": 60,
        "totalChickenWeight": 150.9,
        "averageChickenWeight": 2.515,
        "isPendingLoad": false,
        "savedAt": "2026-09-02T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-6-43",
        "dispatchId": "disp-kg001-6",
        "boxSetNumber": 43,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 175.9,
        "chickenCount": 60,
        "totalChickenWeight": 150.9,
        "averageChickenWeight": 2.515,
        "isPendingLoad": false,
        "savedAt": "2026-09-02T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-6-44",
        "dispatchId": "disp-kg001-6",
        "boxSetNumber": 44,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 175.9,
        "chickenCount": 60,
        "totalChickenWeight": 150.9,
        "averageChickenWeight": 2.515,
        "isPendingLoad": false,
        "savedAt": "2026-09-02T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-6-45",
        "dispatchId": "disp-kg001-6",
        "boxSetNumber": 45,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 175.9,
        "chickenCount": 60,
        "totalChickenWeight": 150.9,
        "averageChickenWeight": 2.515,
        "isPendingLoad": false,
        "savedAt": "2026-09-02T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-6-46",
        "dispatchId": "disp-kg001-6",
        "boxSetNumber": 46,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 175.9,
        "chickenCount": 60,
        "totalChickenWeight": 150.9,
        "averageChickenWeight": 2.515,
        "isPendingLoad": false,
        "savedAt": "2026-09-02T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-6-47",
        "dispatchId": "disp-kg001-6",
        "boxSetNumber": 47,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 175.9,
        "chickenCount": 60,
        "totalChickenWeight": 150.9,
        "averageChickenWeight": 2.515,
        "isPendingLoad": false,
        "savedAt": "2026-09-02T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-6-48",
        "dispatchId": "disp-kg001-6",
        "boxSetNumber": 48,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 175.9,
        "chickenCount": 60,
        "totalChickenWeight": 150.9,
        "averageChickenWeight": 2.515,
        "isPendingLoad": false,
        "savedAt": "2026-09-02T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-6-49",
        "dispatchId": "disp-kg001-6",
        "boxSetNumber": 49,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 175.9,
        "chickenCount": 60,
        "totalChickenWeight": 150.9,
        "averageChickenWeight": 2.515,
        "isPendingLoad": false,
        "savedAt": "2026-09-02T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-6-50",
        "dispatchId": "disp-kg001-6",
        "boxSetNumber": 50,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 175.9,
        "chickenCount": 60,
        "totalChickenWeight": 150.9,
        "averageChickenWeight": 2.515,
        "isPendingLoad": false,
        "savedAt": "2026-09-02T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-6-51",
        "dispatchId": "disp-kg001-6",
        "boxSetNumber": 51,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 175.9,
        "chickenCount": 60,
        "totalChickenWeight": 150.9,
        "averageChickenWeight": 2.515,
        "isPendingLoad": false,
        "savedAt": "2026-09-02T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-6-52",
        "dispatchId": "disp-kg001-6",
        "boxSetNumber": 52,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 175.9,
        "chickenCount": 60,
        "totalChickenWeight": 150.9,
        "averageChickenWeight": 2.515,
        "isPendingLoad": false,
        "savedAt": "2026-09-02T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-6-53",
        "dispatchId": "disp-kg001-6",
        "boxSetNumber": 53,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 175.9,
        "chickenCount": 60,
        "totalChickenWeight": 150.9,
        "averageChickenWeight": 2.515,
        "isPendingLoad": false,
        "savedAt": "2026-09-02T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-6-54",
        "dispatchId": "disp-kg001-6",
        "boxSetNumber": 54,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 175.9,
        "chickenCount": 60,
        "totalChickenWeight": 150.9,
        "averageChickenWeight": 2.515,
        "isPendingLoad": false,
        "savedAt": "2026-09-02T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-6-55",
        "dispatchId": "disp-kg001-6",
        "boxSetNumber": 55,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 175.9,
        "chickenCount": 60,
        "totalChickenWeight": 150.9,
        "averageChickenWeight": 2.515,
        "isPendingLoad": false,
        "savedAt": "2026-09-02T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-6-56",
        "dispatchId": "disp-kg001-6",
        "boxSetNumber": 56,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 175.9,
        "chickenCount": 60,
        "totalChickenWeight": 150.9,
        "averageChickenWeight": 2.515,
        "isPendingLoad": false,
        "savedAt": "2026-09-02T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg001-6-57",
        "dispatchId": "disp-kg001-6",
        "boxSetNumber": 57,
        "boxesInSet": 3,
        "emptyBoxWeight": 15,
        "loadedWeight": 105.54,
        "chickenCount": 36,
        "totalChickenWeight": 90.54,
        "averageChickenWeight": 2.515,
        "isPendingLoad": false,
        "savedAt": "2026-09-02T09:30:00.000Z"
      }
    ],
    "disp-kg002-1": [
      {
        "id": "set-disp-kg002-1-1",
        "dispatchId": "disp-kg002-1",
        "boxSetNumber": 1,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 153.46,
        "chickenCount": 60,
        "totalChickenWeight": 128.46,
        "averageChickenWeight": 2.141,
        "isPendingLoad": false,
        "savedAt": "2026-09-13T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg002-1-2",
        "dispatchId": "disp-kg002-1",
        "boxSetNumber": 2,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 153.46,
        "chickenCount": 60,
        "totalChickenWeight": 128.46,
        "averageChickenWeight": 2.141,
        "isPendingLoad": false,
        "savedAt": "2026-09-13T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg002-1-3",
        "dispatchId": "disp-kg002-1",
        "boxSetNumber": 3,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 153.46,
        "chickenCount": 60,
        "totalChickenWeight": 128.46,
        "averageChickenWeight": 2.141,
        "isPendingLoad": false,
        "savedAt": "2026-09-13T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg002-1-4",
        "dispatchId": "disp-kg002-1",
        "boxSetNumber": 4,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 153.46,
        "chickenCount": 60,
        "totalChickenWeight": 128.46,
        "averageChickenWeight": 2.141,
        "isPendingLoad": false,
        "savedAt": "2026-09-13T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg002-1-5",
        "dispatchId": "disp-kg002-1",
        "boxSetNumber": 5,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 153.46,
        "chickenCount": 60,
        "totalChickenWeight": 128.46,
        "averageChickenWeight": 2.141,
        "isPendingLoad": false,
        "savedAt": "2026-09-13T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg002-1-6",
        "dispatchId": "disp-kg002-1",
        "boxSetNumber": 6,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 153.46,
        "chickenCount": 60,
        "totalChickenWeight": 128.46,
        "averageChickenWeight": 2.141,
        "isPendingLoad": false,
        "savedAt": "2026-09-13T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg002-1-7",
        "dispatchId": "disp-kg002-1",
        "boxSetNumber": 7,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 153.46,
        "chickenCount": 60,
        "totalChickenWeight": 128.46,
        "averageChickenWeight": 2.141,
        "isPendingLoad": false,
        "savedAt": "2026-09-13T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg002-1-8",
        "dispatchId": "disp-kg002-1",
        "boxSetNumber": 8,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 153.46,
        "chickenCount": 60,
        "totalChickenWeight": 128.46,
        "averageChickenWeight": 2.141,
        "isPendingLoad": false,
        "savedAt": "2026-09-13T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg002-1-9",
        "dispatchId": "disp-kg002-1",
        "boxSetNumber": 9,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 153.46,
        "chickenCount": 60,
        "totalChickenWeight": 128.46,
        "averageChickenWeight": 2.141,
        "isPendingLoad": false,
        "savedAt": "2026-09-13T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg002-1-10",
        "dispatchId": "disp-kg002-1",
        "boxSetNumber": 10,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 153.46,
        "chickenCount": 60,
        "totalChickenWeight": 128.46,
        "averageChickenWeight": 2.141,
        "isPendingLoad": false,
        "savedAt": "2026-09-13T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg002-1-11",
        "dispatchId": "disp-kg002-1",
        "boxSetNumber": 11,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 153.46,
        "chickenCount": 60,
        "totalChickenWeight": 128.46,
        "averageChickenWeight": 2.141,
        "isPendingLoad": false,
        "savedAt": "2026-09-13T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg002-1-12",
        "dispatchId": "disp-kg002-1",
        "boxSetNumber": 12,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 153.46,
        "chickenCount": 60,
        "totalChickenWeight": 128.46,
        "averageChickenWeight": 2.141,
        "isPendingLoad": false,
        "savedAt": "2026-09-13T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg002-1-13",
        "dispatchId": "disp-kg002-1",
        "boxSetNumber": 13,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 153.46,
        "chickenCount": 60,
        "totalChickenWeight": 128.46,
        "averageChickenWeight": 2.141,
        "isPendingLoad": false,
        "savedAt": "2026-09-13T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg002-1-14",
        "dispatchId": "disp-kg002-1",
        "boxSetNumber": 14,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 153.46,
        "chickenCount": 60,
        "totalChickenWeight": 128.46,
        "averageChickenWeight": 2.141,
        "isPendingLoad": false,
        "savedAt": "2026-09-13T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg002-1-15",
        "dispatchId": "disp-kg002-1",
        "boxSetNumber": 15,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 153.46,
        "chickenCount": 60,
        "totalChickenWeight": 128.46,
        "averageChickenWeight": 2.141,
        "isPendingLoad": false,
        "savedAt": "2026-09-13T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg002-1-16",
        "dispatchId": "disp-kg002-1",
        "boxSetNumber": 16,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 153.46,
        "chickenCount": 60,
        "totalChickenWeight": 128.46,
        "averageChickenWeight": 2.141,
        "isPendingLoad": false,
        "savedAt": "2026-09-13T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg002-1-17",
        "dispatchId": "disp-kg002-1",
        "boxSetNumber": 17,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 153.46,
        "chickenCount": 60,
        "totalChickenWeight": 128.46,
        "averageChickenWeight": 2.141,
        "isPendingLoad": false,
        "savedAt": "2026-09-13T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg002-1-18",
        "dispatchId": "disp-kg002-1",
        "boxSetNumber": 18,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 153.46,
        "chickenCount": 60,
        "totalChickenWeight": 128.46,
        "averageChickenWeight": 2.141,
        "isPendingLoad": false,
        "savedAt": "2026-09-13T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg002-1-19",
        "dispatchId": "disp-kg002-1",
        "boxSetNumber": 19,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 153.46,
        "chickenCount": 60,
        "totalChickenWeight": 128.46,
        "averageChickenWeight": 2.141,
        "isPendingLoad": false,
        "savedAt": "2026-09-13T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg002-1-20",
        "dispatchId": "disp-kg002-1",
        "boxSetNumber": 20,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 153.46,
        "chickenCount": 60,
        "totalChickenWeight": 128.46,
        "averageChickenWeight": 2.141,
        "isPendingLoad": false,
        "savedAt": "2026-09-13T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg002-1-21",
        "dispatchId": "disp-kg002-1",
        "boxSetNumber": 21,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 153.46,
        "chickenCount": 60,
        "totalChickenWeight": 128.46,
        "averageChickenWeight": 2.141,
        "isPendingLoad": false,
        "savedAt": "2026-09-13T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg002-1-22",
        "dispatchId": "disp-kg002-1",
        "boxSetNumber": 22,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 153.46,
        "chickenCount": 60,
        "totalChickenWeight": 128.46,
        "averageChickenWeight": 2.141,
        "isPendingLoad": false,
        "savedAt": "2026-09-13T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg002-1-23",
        "dispatchId": "disp-kg002-1",
        "boxSetNumber": 23,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 153.46,
        "chickenCount": 60,
        "totalChickenWeight": 128.46,
        "averageChickenWeight": 2.141,
        "isPendingLoad": false,
        "savedAt": "2026-09-13T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg002-1-24",
        "dispatchId": "disp-kg002-1",
        "boxSetNumber": 24,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 153.46,
        "chickenCount": 60,
        "totalChickenWeight": 128.46,
        "averageChickenWeight": 2.141,
        "isPendingLoad": false,
        "savedAt": "2026-09-13T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg002-1-25",
        "dispatchId": "disp-kg002-1",
        "boxSetNumber": 25,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 153.46,
        "chickenCount": 60,
        "totalChickenWeight": 128.46,
        "averageChickenWeight": 2.141,
        "isPendingLoad": false,
        "savedAt": "2026-09-13T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg002-1-26",
        "dispatchId": "disp-kg002-1",
        "boxSetNumber": 26,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 153.46,
        "chickenCount": 60,
        "totalChickenWeight": 128.46,
        "averageChickenWeight": 2.141,
        "isPendingLoad": false,
        "savedAt": "2026-09-13T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg002-1-27",
        "dispatchId": "disp-kg002-1",
        "boxSetNumber": 27,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 153.46,
        "chickenCount": 60,
        "totalChickenWeight": 128.46,
        "averageChickenWeight": 2.141,
        "isPendingLoad": false,
        "savedAt": "2026-09-13T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg002-1-28",
        "dispatchId": "disp-kg002-1",
        "boxSetNumber": 28,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 153.46,
        "chickenCount": 60,
        "totalChickenWeight": 128.46,
        "averageChickenWeight": 2.141,
        "isPendingLoad": false,
        "savedAt": "2026-09-13T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg002-1-29",
        "dispatchId": "disp-kg002-1",
        "boxSetNumber": 29,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 153.46,
        "chickenCount": 60,
        "totalChickenWeight": 128.46,
        "averageChickenWeight": 2.141,
        "isPendingLoad": false,
        "savedAt": "2026-09-13T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg002-1-30",
        "dispatchId": "disp-kg002-1",
        "boxSetNumber": 30,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 153.46,
        "chickenCount": 60,
        "totalChickenWeight": 128.46,
        "averageChickenWeight": 2.141,
        "isPendingLoad": false,
        "savedAt": "2026-09-13T09:30:00.000Z"
      }
    ],
    "disp-kg002-2": [
      {
        "id": "set-disp-kg002-2-1",
        "dispatchId": "disp-kg002-2",
        "boxSetNumber": 1,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 153.46,
        "chickenCount": 60,
        "totalChickenWeight": 128.46,
        "averageChickenWeight": 2.141,
        "isPendingLoad": false,
        "savedAt": "2026-09-14T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg002-2-2",
        "dispatchId": "disp-kg002-2",
        "boxSetNumber": 2,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 153.46,
        "chickenCount": 60,
        "totalChickenWeight": 128.46,
        "averageChickenWeight": 2.141,
        "isPendingLoad": false,
        "savedAt": "2026-09-14T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg002-2-3",
        "dispatchId": "disp-kg002-2",
        "boxSetNumber": 3,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 153.46,
        "chickenCount": 60,
        "totalChickenWeight": 128.46,
        "averageChickenWeight": 2.141,
        "isPendingLoad": false,
        "savedAt": "2026-09-14T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg002-2-4",
        "dispatchId": "disp-kg002-2",
        "boxSetNumber": 4,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 153.46,
        "chickenCount": 60,
        "totalChickenWeight": 128.46,
        "averageChickenWeight": 2.141,
        "isPendingLoad": false,
        "savedAt": "2026-09-14T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg002-2-5",
        "dispatchId": "disp-kg002-2",
        "boxSetNumber": 5,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 153.46,
        "chickenCount": 60,
        "totalChickenWeight": 128.46,
        "averageChickenWeight": 2.141,
        "isPendingLoad": false,
        "savedAt": "2026-09-14T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg002-2-6",
        "dispatchId": "disp-kg002-2",
        "boxSetNumber": 6,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 153.46,
        "chickenCount": 60,
        "totalChickenWeight": 128.46,
        "averageChickenWeight": 2.141,
        "isPendingLoad": false,
        "savedAt": "2026-09-14T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg002-2-7",
        "dispatchId": "disp-kg002-2",
        "boxSetNumber": 7,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 153.46,
        "chickenCount": 60,
        "totalChickenWeight": 128.46,
        "averageChickenWeight": 2.141,
        "isPendingLoad": false,
        "savedAt": "2026-09-14T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg002-2-8",
        "dispatchId": "disp-kg002-2",
        "boxSetNumber": 8,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 153.46,
        "chickenCount": 60,
        "totalChickenWeight": 128.46,
        "averageChickenWeight": 2.141,
        "isPendingLoad": false,
        "savedAt": "2026-09-14T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg002-2-9",
        "dispatchId": "disp-kg002-2",
        "boxSetNumber": 9,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 153.46,
        "chickenCount": 60,
        "totalChickenWeight": 128.46,
        "averageChickenWeight": 2.141,
        "isPendingLoad": false,
        "savedAt": "2026-09-14T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg002-2-10",
        "dispatchId": "disp-kg002-2",
        "boxSetNumber": 10,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 153.46,
        "chickenCount": 60,
        "totalChickenWeight": 128.46,
        "averageChickenWeight": 2.141,
        "isPendingLoad": false,
        "savedAt": "2026-09-14T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg002-2-11",
        "dispatchId": "disp-kg002-2",
        "boxSetNumber": 11,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 153.46,
        "chickenCount": 60,
        "totalChickenWeight": 128.46,
        "averageChickenWeight": 2.141,
        "isPendingLoad": false,
        "savedAt": "2026-09-14T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg002-2-12",
        "dispatchId": "disp-kg002-2",
        "boxSetNumber": 12,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 153.46,
        "chickenCount": 60,
        "totalChickenWeight": 128.46,
        "averageChickenWeight": 2.141,
        "isPendingLoad": false,
        "savedAt": "2026-09-14T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg002-2-13",
        "dispatchId": "disp-kg002-2",
        "boxSetNumber": 13,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 153.46,
        "chickenCount": 60,
        "totalChickenWeight": 128.46,
        "averageChickenWeight": 2.141,
        "isPendingLoad": false,
        "savedAt": "2026-09-14T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg002-2-14",
        "dispatchId": "disp-kg002-2",
        "boxSetNumber": 14,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 153.46,
        "chickenCount": 60,
        "totalChickenWeight": 128.46,
        "averageChickenWeight": 2.141,
        "isPendingLoad": false,
        "savedAt": "2026-09-14T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg002-2-15",
        "dispatchId": "disp-kg002-2",
        "boxSetNumber": 15,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 153.46,
        "chickenCount": 60,
        "totalChickenWeight": 128.46,
        "averageChickenWeight": 2.141,
        "isPendingLoad": false,
        "savedAt": "2026-09-14T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg002-2-16",
        "dispatchId": "disp-kg002-2",
        "boxSetNumber": 16,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 153.46,
        "chickenCount": 60,
        "totalChickenWeight": 128.46,
        "averageChickenWeight": 2.141,
        "isPendingLoad": false,
        "savedAt": "2026-09-14T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg002-2-17",
        "dispatchId": "disp-kg002-2",
        "boxSetNumber": 17,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 153.46,
        "chickenCount": 60,
        "totalChickenWeight": 128.46,
        "averageChickenWeight": 2.141,
        "isPendingLoad": false,
        "savedAt": "2026-09-14T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg002-2-18",
        "dispatchId": "disp-kg002-2",
        "boxSetNumber": 18,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 153.46,
        "chickenCount": 60,
        "totalChickenWeight": 128.46,
        "averageChickenWeight": 2.141,
        "isPendingLoad": false,
        "savedAt": "2026-09-14T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg002-2-19",
        "dispatchId": "disp-kg002-2",
        "boxSetNumber": 19,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 153.46,
        "chickenCount": 60,
        "totalChickenWeight": 128.46,
        "averageChickenWeight": 2.141,
        "isPendingLoad": false,
        "savedAt": "2026-09-14T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg002-2-20",
        "dispatchId": "disp-kg002-2",
        "boxSetNumber": 20,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 153.46,
        "chickenCount": 60,
        "totalChickenWeight": 128.46,
        "averageChickenWeight": 2.141,
        "isPendingLoad": false,
        "savedAt": "2026-09-14T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg002-2-21",
        "dispatchId": "disp-kg002-2",
        "boxSetNumber": 21,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 153.46,
        "chickenCount": 60,
        "totalChickenWeight": 128.46,
        "averageChickenWeight": 2.141,
        "isPendingLoad": false,
        "savedAt": "2026-09-14T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg002-2-22",
        "dispatchId": "disp-kg002-2",
        "boxSetNumber": 22,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 153.46,
        "chickenCount": 60,
        "totalChickenWeight": 128.46,
        "averageChickenWeight": 2.141,
        "isPendingLoad": false,
        "savedAt": "2026-09-14T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg002-2-23",
        "dispatchId": "disp-kg002-2",
        "boxSetNumber": 23,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 153.46,
        "chickenCount": 60,
        "totalChickenWeight": 128.46,
        "averageChickenWeight": 2.141,
        "isPendingLoad": false,
        "savedAt": "2026-09-14T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg002-2-24",
        "dispatchId": "disp-kg002-2",
        "boxSetNumber": 24,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 153.46,
        "chickenCount": 60,
        "totalChickenWeight": 128.46,
        "averageChickenWeight": 2.141,
        "isPendingLoad": false,
        "savedAt": "2026-09-14T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg002-2-25",
        "dispatchId": "disp-kg002-2",
        "boxSetNumber": 25,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 153.46,
        "chickenCount": 60,
        "totalChickenWeight": 128.46,
        "averageChickenWeight": 2.141,
        "isPendingLoad": false,
        "savedAt": "2026-09-14T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg002-2-26",
        "dispatchId": "disp-kg002-2",
        "boxSetNumber": 26,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 153.46,
        "chickenCount": 60,
        "totalChickenWeight": 128.46,
        "averageChickenWeight": 2.141,
        "isPendingLoad": false,
        "savedAt": "2026-09-14T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg002-2-27",
        "dispatchId": "disp-kg002-2",
        "boxSetNumber": 27,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 153.46,
        "chickenCount": 60,
        "totalChickenWeight": 128.46,
        "averageChickenWeight": 2.141,
        "isPendingLoad": false,
        "savedAt": "2026-09-14T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg002-2-28",
        "dispatchId": "disp-kg002-2",
        "boxSetNumber": 28,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 153.46,
        "chickenCount": 60,
        "totalChickenWeight": 128.46,
        "averageChickenWeight": 2.141,
        "isPendingLoad": false,
        "savedAt": "2026-09-14T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg002-2-29",
        "dispatchId": "disp-kg002-2",
        "boxSetNumber": 29,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 153.46,
        "chickenCount": 60,
        "totalChickenWeight": 128.46,
        "averageChickenWeight": 2.141,
        "isPendingLoad": false,
        "savedAt": "2026-09-14T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg002-2-30",
        "dispatchId": "disp-kg002-2",
        "boxSetNumber": 30,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 153.46,
        "chickenCount": 60,
        "totalChickenWeight": 128.46,
        "averageChickenWeight": 2.141,
        "isPendingLoad": false,
        "savedAt": "2026-09-14T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg002-2-31",
        "dispatchId": "disp-kg002-2",
        "boxSetNumber": 31,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 153.46,
        "chickenCount": 60,
        "totalChickenWeight": 128.46,
        "averageChickenWeight": 2.141,
        "isPendingLoad": false,
        "savedAt": "2026-09-14T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg002-2-32",
        "dispatchId": "disp-kg002-2",
        "boxSetNumber": 32,
        "boxesInSet": 5,
        "emptyBoxWeight": 25,
        "loadedWeight": 153.46,
        "chickenCount": 60,
        "totalChickenWeight": 128.46,
        "averageChickenWeight": 2.141,
        "isPendingLoad": false,
        "savedAt": "2026-09-14T09:30:00.000Z"
      },
      {
        "id": "set-disp-kg002-2-33",
        "dispatchId": "disp-kg002-2",
        "boxSetNumber": 33,
        "boxesInSet": 4,
        "emptyBoxWeight": 20,
        "loadedWeight": 109.922,
        "chickenCount": 42,
        "totalChickenWeight": 89.922,
        "averageChickenWeight": 2.141,
        "isPendingLoad": false,
        "savedAt": "2026-09-14T09:30:00.000Z"
      }
    ]
  },
  "targets": {
    "feedConsumption": {
      "1": 12,
      "2": 14,
      "3": 17,
      "4": 20,
      "5": 24,
      "6": 28,
      "7": 33,
      "8": 38,
      "9": 44,
      "10": 50,
      "11": 57,
      "12": 64,
      "13": 72,
      "14": 80,
      "15": 88,
      "16": 96,
      "17": 105,
      "18": 114,
      "19": 123,
      "20": 132,
      "21": 141,
      "22": 150,
      "23": 158,
      "24": 166,
      "25": 173,
      "26": 180,
      "27": 186,
      "28": 191,
      "29": 195,
      "30": 198,
      "31": 200,
      "32": 201,
      "33": 201,
      "34": 200,
      "35": 198,
      "36": 194,
      "37": 189,
      "38": 182,
      "39": 175,
      "40": 167
    },
    "averageWeight": {
      "1": 42,
      "2": 56,
      "3": 74,
      "4": 96,
      "5": 122,
      "6": 152,
      "7": 186,
      "8": 224,
      "9": 266,
      "10": 312,
      "11": 362,
      "12": 416,
      "13": 474,
      "14": 536,
      "15": 602,
      "16": 672,
      "17": 746,
      "18": 824,
      "19": 906,
      "20": 992,
      "21": 1082,
      "22": 1176,
      "23": 1274,
      "24": 1376,
      "25": 1482,
      "26": 1592,
      "27": 1706,
      "28": 1824,
      "29": 1946,
      "30": 2072,
      "31": 2202,
      "32": 2336,
      "33": 2474,
      "34": 2616,
      "35": 2762,
      "36": 2912,
      "37": 2272,
      "38": 2425,
      "39": 2480,
      "40": 2515
    }
  },
  "invoices": [
    {
      "id": "disp-kg001-1",
      "dispatchId": "disp-kg001-1",
      "batchId": "KG001",
      "invoiceNumber": "INV-2026-8801",
      "invoiceDate": "2026-08-30",
      "customerName": "Sri Annapoorna Chicken Shop - Coimbatore",
      "customerPhone": "+91 9876543210",
      "vehicleNumber": "TN-38-AX-1234",
      "driverName": "Suresh Kumar",
      "totalChickens": 300,
      "totalWeightKg": 720,
      "ratePerKg": 135,
      "totalAmount": 97200
    },
    {
      "id": "disp-kg001-2",
      "dispatchId": "disp-kg001-2",
      "batchId": "KG001",
      "invoiceNumber": "INV-2026-8802",
      "invoiceDate": "2026-08-31",
      "customerName": "Sri Lakshmi Broiler Center - Tiruppur",
      "customerPhone": "+91 9876543212",
      "vehicleNumber": "TN-38-B-5544",
      "driverName": "Murugan",
      "totalChickens": 360,
      "totalWeightKg": 873,
      "ratePerKg": 135,
      "totalAmount": 117855
    },
    {
      "id": "disp-kg001-3",
      "dispatchId": "disp-kg001-3",
      "batchId": "KG001",
      "invoiceNumber": "INV-2026-8803",
      "invoiceDate": "2026-09-01",
      "customerName": "SKM Wholesale Chicken Traders - Erode",
      "customerPhone": "+91 9876543215",
      "vehicleNumber": "TN-38-C-9911",
      "driverName": "Karthik",
      "totalChickens": 240,
      "totalWeightKg": 588,
      "ratePerKg": 135,
      "totalAmount": 79380
    },
    {
      "id": "disp-kg001-4",
      "dispatchId": "disp-kg001-4",
      "batchId": "KG001",
      "invoiceNumber": "INV-2026-8804",
      "invoiceDate": "2026-09-01",
      "customerName": "Royal Fresh Chicken Stall - Salem",
      "customerPhone": "+91 9876543216",
      "vehicleNumber": "TN-38-D-7722",
      "driverName": "Velu",
      "totalChickens": 300,
      "totalWeightKg": 742.5,
      "ratePerKg": 135,
      "totalAmount": 100237.5
    },
    {
      "id": "disp-kg001-5",
      "dispatchId": "disp-kg001-5",
      "batchId": "KG001",
      "invoiceNumber": "INV-2026-8805",
      "invoiceDate": "2026-09-02",
      "customerName": "Venkateshwara Poultry Shop - Namakkal",
      "customerPhone": "+91 9876543217",
      "vehicleNumber": "TN-38-E-3344",
      "driverName": "Raja",
      "totalChickens": 360,
      "totalWeightKg": 900,
      "ratePerKg": 135,
      "totalAmount": 121500
    },
    {
      "id": "disp-kg001-6",
      "dispatchId": "disp-kg001-6",
      "batchId": "KG001",
      "invoiceNumber": "INV-2026-8806",
      "invoiceDate": "2026-09-02",
      "customerName": "Kovai Fresh Meat & Poultry - Pollachi",
      "customerPhone": "+91 9876543218",
      "vehicleNumber": "TN-38-F-1122",
      "driverName": "Senthil",
      "totalChickens": 3388,
      "totalWeightKg": 8520.82,
      "ratePerKg": 135,
      "totalAmount": 1150310.7
    },
    {
      "id": "disp-kg002-1",
      "dispatchId": "disp-kg002-1",
      "batchId": "KG002",
      "invoiceNumber": "INV-2026-9901",
      "invoiceDate": "2026-09-13",
      "customerName": "Greenland Chicken Shop - Karur",
      "customerPhone": "+91 9876543211",
      "vehicleNumber": "TN-38-AX-9911",
      "driverName": "Suresh",
      "totalChickens": 1800,
      "totalWeightKg": 3853.8,
      "ratePerKg": 135,
      "totalAmount": 520263
    },
    {
      "id": "disp-kg002-2",
      "dispatchId": "disp-kg002-2",
      "batchId": "KG002",
      "invoiceNumber": "INV-2026-9902",
      "invoiceDate": "2026-09-14",
      "customerName": "Pioneer Poultry & Traders - Dindigul",
      "customerPhone": "+91 9876543211",
      "vehicleNumber": "TN-38-AX-1234",
      "driverName": "Suresh",
      "totalChickens": 1962,
      "totalWeightKg": 4200.642,
      "ratePerKg": 135,
      "totalAmount": 567086.67
    }
  ],
  "auditLogs": []
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
    if (typeof localStorage !== 'undefined' && localStorage.getItem('kg_poultry_local_db_v4')) {
      localStorage.removeItem('kg_poultry_local_db_v4');
    }
    const raw = localStorage.getItem(MOCK_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(INITIAL_LOCAL_STATE));
      return INITIAL_LOCAL_STATE;
    }
    const parsed = JSON.parse(raw);
    if (!parsed.batches || !parsed.batches.KG002 || parsed.batches.KG002.initialChickCount !== 4196) {
      localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(INITIAL_LOCAL_STATE));
      return INITIAL_LOCAL_STATE;
    }
    return parsed;
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

/**
 * Dynamically computes remaining live chick count for a batch = initial count minus mortality minus dispatched birds
 */
export function recalculateBatchRemainingChickens(batchId, local = getLocalDB()) {
  const batch = (local.batches || {})[batchId];
  if (!batch) return 0;

  const initialChicks = Number(batch.initialChickCount || 5000);

  // 1. Mortality count from daily records
  const dailyRecordsMap = (local.dailyRecords || {})[batchId] || {};
  const totalMortality = Object.values(dailyRecordsMap).reduce((sum, r) => sum + Number(r.mortalityCount || 0), 0);

  // 2. Dispatched birds from vehicle dispatches & box sets
  const dispatchesList = Object.values(local.dispatches || {}).filter(d => d.batchId === batchId);
  let totalDispatchedBirds = 0;

  for (const d of dispatchesList) {
    const hasBoxSetsKey = Object.prototype.hasOwnProperty.call(local.boxSets || {}, d.id) || Array.isArray(d.boxSets);
    const setsRaw = (local.boxSets || {})[d.id] || d.boxSets || [];
    const sets = Array.isArray(setsRaw) ? setsRaw : Object.values(setsRaw);
    const loadedSets = sets.filter(s => Number(s.loadedWeight) > 0 || Number(s.totalChickenWeight) > 0);
    const setBirds = loadedSets.reduce((sum, s) => sum + Number(s.chickenCount || 0), 0);

    const birds = hasBoxSetsKey 
      ? setBirds 
      : (setBirds > 0 ? setBirds : Number(d.birdsCount || d.totalBirds || (d.status === 'Completed' ? d.totalChickens : 0) || 0));
    totalDispatchedBirds += birds;
  }

  const remaining = Math.max(0, initialChicks - totalMortality - totalDispatchedBirds);
  batch.remainingChickCount = remaining;
  return remaining;
}

// USER MANAGEMENT
export async function dbGetUsers() {
  try {
    const snap = await withTimeout(get(ref(db, 'users')));
    if (snap.exists()) {
      const val = snap.val();
      return Array.isArray(val) ? val : Object.values(val);
    }
  } catch (_err) {
    // fallback
  }

  const local = getLocalDB();
  return Object.values(local.users || {});
}

export async function dbSaveUser(userData) {
  const uid = userData.uid || `user-${Date.now()}`;
  const record = { ...userData, uid, updatedAt: new Date().toISOString() };

  if (record.password) {
    record.passwordHash = await hashPassword(record.password);
    delete record.password;
  }

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

export async function dbDeleteUser(uid) {
  if (!uid) return false;
  try {
    await withTimeout(remove(ref(db, `users/${uid}`)));
  } catch (_err) {
    // fallback
  }

  const local = getLocalDB();
  if (local.users && local.users[uid]) {
    delete local.users[uid];
    saveLocalDB(local);
  }
  return true;
}


// BATCH MANAGEMENT
export async function dbGetBatches() {
  const local = getLocalDB();
  try {
    const [batchesSnap, dailySnap, dispatchesSnap, boxSetsSnap] = await Promise.all([
      withTimeout(get(ref(db, 'batches'))),
      withTimeout(get(ref(db, 'dailyRecords'))),
      withTimeout(get(ref(db, 'dispatches'))),
      withTimeout(get(ref(db, 'boxSets')))
    ]);

    if (dailySnap.exists()) {
      local.dailyRecords = dailySnap.val();
    }
    if (dispatchesSnap.exists()) {
      local.dispatches = dispatchesSnap.val();
    }
    if (boxSetsSnap.exists()) {
      local.boxSets = boxSetsSnap.val();
    }
    saveLocalDB(local);

    if (batchesSnap.exists()) {
      local.batches = batchesSnap.val();
      saveLocalDB(local);

      const fbBatches = Object.values(batchesSnap.val());
      const mapped = fbBatches.map(b => ({
        ...b,
        remainingChickCount: recalculateBatchRemainingChickens(b.id, local),
        feedStock: computeBatchFeedStock(b.id, local)
      }));
      return sortBatchesDescending(mapped);
    }
    saveLocalDB(local);
  } catch (_err) {
    // fallback
  }

  const localMapped = Object.values(local.batches || {}).map(b => ({
    ...b,
    remainingChickCount: recalculateBatchRemainingChickens(b.id, local),
    feedStock: computeBatchFeedStock(b.id, local)
  }));
  return sortBatchesDescending(localMapped);
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
    if (snap.exists()) {
      const data = snap.val();
      const local = getLocalDB();
      if (!local.dailyRecords) local.dailyRecords = {};
      local.dailyRecords[batchId] = data;
      saveLocalDB(local);
      return data;
    }
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
    const remaining = recalculateBatchRemainingChickens(batchId, local);
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
    const remaining = recalculateBatchRemainingChickens(batchId, local);
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
// DISPATCH & BOX SETS
export async function dbGetDispatches() {
  let list = [];
  const local = getLocalDB();
  try {
    const [dispatchesSnap, boxSetsSnap] = await Promise.all([
      withTimeout(get(ref(db, 'dispatches'))),
      withTimeout(get(ref(db, 'boxSets')))
    ]);

    if (dispatchesSnap.exists()) {
      const val = dispatchesSnap.val();
      list = Array.isArray(val) ? val : Object.values(val);
      local.dispatches = local.dispatches || {};
      list.forEach(d => { if (d && d.id) local.dispatches[d.id] = d; });
    }
    if (boxSetsSnap.exists()) {
      local.boxSets = boxSetsSnap.val() || {};
    }
    saveLocalDB(local);
  } catch (_err) {
    // fallback to local
  }

  if (list.length === 0) {
    list = Object.values(local.dispatches || {});
  }

  const boxSetsMap = local.boxSets || {};
  return list.map(d => {
    const setsRaw = boxSetsMap[d.id] || d.boxSets || [];
    const sets = Array.isArray(setsRaw) ? setsRaw : Object.values(setsRaw);
    const loadedSets = sets.filter(s => Number(s.loadedWeight) > 0 || Number(s.totalChickenWeight) > 0);
    const setBirds = loadedSets.reduce((sum, s) => sum + Number(s.chickenCount || 0), 0);
    const setWeight = loadedSets.reduce((sum, s) => sum + Number(s.totalChickenWeight || 0), 0);

    const birds = setBirds > 0 ? setBirds : Number(d.birdsCount || d.totalBirds || d.totalChickens || 0);
    const weight = setWeight > 0 ? setWeight : Number(d.totalWeight || d.netWeight || 0);

    return {
      ...d,
      boxSets: sets,
      birdsCount: birds,
      totalBirds: birds,
      totalWeight: weight,
      netWeight: weight
    };
  });
}

export async function dbSaveDispatch(dispatchData) {
  const id = dispatchData.id || `disp-${Date.now()}`;
  let invoiceNumber = dispatchData.invoiceNumber;
  if (!invoiceNumber) {
    let hash = 0;
    const seed = id;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    const code = String(Math.abs(hash) % 9000 + 1000);
    const year = (dispatchData.dispatchDate || new Date().toISOString()).split('-')[0];
    invoiceNumber = `INV-${year}-${code}`;
  }

  const record = {
    ...dispatchData,
    id,
    invoiceNumber,
    createdAt: dispatchData.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const local = getLocalDB();
  local.dispatches[id] = record;

  let remaining = null;
  if (record.batchId && local.batches[record.batchId]) {
    remaining = recalculateBatchRemainingChickens(record.batchId, local);
  }
  saveLocalDB(local);

  // Background Parallel Writes
  try {
    const writes = [set(ref(db, `dispatches/${id}`), record)];
    if (remaining !== null) {
      writes.push(set(ref(db, `batches/${record.batchId}/remainingChickCount`), remaining));
    }
    await withTimeout(Promise.all(writes));
  } catch (_err) {
    // fallback
  }

  return record;
}

export async function dbDeleteInvoiceByDispatchId(dispatchId) {
  try {
    const snap = await withTimeout(get(ref(db, 'invoices')));
    if (snap.exists()) {
      const data = snap.val();
      const removePromises = [];
      for (const [key, inv] of Object.entries(data)) {
        if (inv && (inv.dispatchId === dispatchId || inv.id === dispatchId)) {
          removePromises.push(remove(ref(db, `invoices/${key}`)));
        }
      }
      if (removePromises.length > 0) {
        await withTimeout(Promise.all(removePromises));
      }
    }
  } catch (_err) {
    // fallback
  }

  const local = getLocalDB();
  if (local.invoices && Array.isArray(local.invoices)) {
    local.invoices = local.invoices.filter(inv => inv.dispatchId !== dispatchId && inv.id !== dispatchId);
  }
  saveLocalDB(local);
}

export async function dbDeleteDispatch(dispatchId) {
  const localBefore = getLocalDB();
  const batchId = localBefore.dispatches[dispatchId]?.batchId;

  const local = getLocalDB();
  delete local.dispatches[dispatchId];
  delete local.boxSets[dispatchId];
  if (local.invoices && Array.isArray(local.invoices)) {
    local.invoices = local.invoices.filter(inv => inv.dispatchId !== dispatchId && inv.id !== dispatchId);
  }

  let remaining = null;
  if (batchId && local.batches[batchId]) {
    remaining = recalculateBatchRemainingChickens(batchId, local);
  }
  saveLocalDB(local);

  try {
    const updates = {};
    updates[`dispatches/${dispatchId}`] = null;
    updates[`boxSets/${dispatchId}`] = null;
    if (batchId && remaining !== null) {
      updates[`batches/${batchId}/remainingChickCount`] = remaining;
    }
    await withTimeout(update(ref(db), updates));
    await dbDeleteInvoiceByDispatchId(dispatchId);
  } catch (_err) {
    // fallback
  }
}

export async function dbGetBoxSets(dispatchId) {
  const local = getLocalDB();
  if (local.boxSets && local.boxSets[dispatchId]) {
    return local.boxSets[dispatchId];
  }

  try {
    const snap = await withTimeout(get(ref(db, `boxSets/${dispatchId}`)));
    if (snap.exists()) {
      const val = Array.isArray(snap.val()) ? snap.val() : Object.values(snap.val());
      local.boxSets[dispatchId] = val;
      saveLocalDB(local);
      return val;
    }
  } catch (_err) {
    // fallback
  }

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

  const dispatch = (local.dispatches || {})[dispatchId];
  let setBirds = 0;
  let setWeight = 0;
  let remaining = null;

  if (dispatch) {
    const allSets = local.boxSets[dispatchId] || [];
    const loadedSets = allSets.filter(s => Number(s.loadedWeight) > 0 || Number(s.totalChickenWeight) > 0);
    setBirds = loadedSets.reduce((sum, s) => sum + Number(s.chickenCount || 0), 0);
    setWeight = loadedSets.reduce((sum, s) => sum + Number(s.totalChickenWeight || 0), 0);

    if (setBirds > 0) {
      dispatch.birdsCount = setBirds;
      dispatch.totalBirds = setBirds;
    }
    if (setWeight > 0) {
      dispatch.totalWeight = setWeight;
      dispatch.netWeight = setWeight;
    }

    if (dispatch.batchId && local.batches[dispatch.batchId]) {
      remaining = recalculateBatchRemainingChickens(dispatch.batchId, local);
    }
  }
  saveLocalDB(local);

  try {
    const writes = [set(ref(db, `boxSets/${dispatchId}/${boxSetData.boxSetNumber - 1}`), record)];
    if (setBirds > 0) {
      writes.push(set(ref(db, `dispatches/${dispatchId}/birdsCount`), setBirds));
      writes.push(set(ref(db, `dispatches/${dispatchId}/totalBirds`), setBirds));
    }
    if (setWeight > 0) {
      writes.push(set(ref(db, `dispatches/${dispatchId}/totalWeight`), setWeight));
      writes.push(set(ref(db, `dispatches/${dispatchId}/netWeight`), setWeight));
    }
    if (remaining !== null && dispatch?.batchId) {
      writes.push(set(ref(db, `batches/${dispatch.batchId}/remainingChickCount`), remaining));
    }
    await withTimeout(Promise.all(writes));
  } catch (_e) {
    // fallback
  }

  return record;
}

export async function dbDeleteBoxSet(dispatchId, setId) {
  const local = getLocalDB();
  if (local.boxSets && local.boxSets[dispatchId]) {
    local.boxSets[dispatchId] = local.boxSets[dispatchId].filter(s => s.id !== setId && s.boxSetNumber !== setId && String(s.boxSetNumber) !== String(setId));
  }

  const dispatch = (local.dispatches || {})[dispatchId];
  let remaining = null;

  if (dispatch) {
    const allSets = local.boxSets[dispatchId] || [];
    const loadedSets = allSets.filter(s => Number(s.loadedWeight) > 0 || Number(s.totalChickenWeight) > 0);
    const setBirds = loadedSets.reduce((sum, s) => sum + Number(s.chickenCount || 0), 0);
    const setWeight = loadedSets.reduce((sum, s) => sum + Number(s.totalChickenWeight || 0), 0);
    const setCrates = loadedSets.reduce((sum, s) => sum + Number(s.boxesInSet || 1), 0);

    dispatch.birdsCount = setBirds;
    dispatch.totalBirds = setBirds;
    dispatch.totalChickens = setBirds;
    dispatch.totalWeight = setWeight;
    dispatch.netWeight = setWeight;
    dispatch.cratesCount = setCrates;
    dispatch.totalCrates = setCrates;
    dispatch.status = (dispatch.totalBoxCount > 0 && setCrates >= dispatch.totalBoxCount) ? 'Completed' : 'In Progress';
    dispatch.boxSets = allSets;

    if (dispatch.batchId && local.batches[dispatch.batchId]) {
      remaining = recalculateBatchRemainingChickens(dispatch.batchId, local);
    }
  }

  saveLocalDB(local);

  try {
    const writes = [
      set(ref(db, `boxSets/${dispatchId}`), local.boxSets[dispatchId] || []),
      dispatch ? set(ref(db, `dispatches/${dispatchId}`), dispatch) : Promise.resolve()
    ];
    if (remaining !== null && dispatch?.batchId) {
      writes.push(set(ref(db, `batches/${dispatch.batchId}/remainingChickCount`), remaining));
    }
    await withTimeout(Promise.all(writes));
  } catch (_e) {
    // fallback
  }
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
  const local = getLocalDB();
  if (!local.invoices) local.invoices = [];
  
  const existingIndex = local.invoices.findIndex(
    inv => inv.id === invoiceData.id || (invoiceData.dispatchId && inv.dispatchId === invoiceData.dispatchId)
  );

  let invId = invoiceData.id || invoiceData.invoiceNumber;
  if (!invId) {
    if (existingIndex >= 0) {
      invId = local.invoices[existingIndex].id;
    } else {
      let hash = 0;
      const seed = invoiceData.dispatchId || `inv-${Date.now()}`;
      for (let i = 0; i < seed.length; i++) {
        hash = (hash << 5) - hash + seed.charCodeAt(i);
        hash |= 0;
      }
      const code = String(Math.abs(hash) % 9000 + 1000);
      const year = (invoiceData.invoiceDate || new Date().toISOString()).split('-')[0];
      invId = `INV-${year}-${code}`;
    }
  }

  const record = {
    ...invoiceData,
    id: invId,
    invoiceNumber: invId,
    createdAt: invoiceData.createdAt || new Date().toISOString()
  };

  try {
    if (existingIndex >= 0) {
      await withTimeout(set(ref(db, `invoices/${invId}`), record));
    } else {
      await withTimeout(push(ref(db, 'invoices'), record));
    }
  } catch (_err) {
    // fallback
  }

  if (existingIndex >= 0) {
    local.invoices[existingIndex] = record;
  } else {
    local.invoices.push(record);
  }
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

// BATCH HISTORY AGGREGATION
export async function dbGetBatchHistoryData(batchId) {
  const local = getLocalDB();
  const batches = await dbGetBatches();
  const dispatches = await dbGetDispatches();
  const invoices = await dbGetInvoices();

  const selectedBatch = batches.find(b => b.id === batchId || b.batchNumber === batchId) || batches[0];
  if (!selectedBatch) return null;

  const currentBatchId = selectedBatch.id;
  const rawDailyMap = await dbGetDailyRecords(currentBatchId);
  const dailyRecords = Object.values(rawDailyMap || {}).sort((a, b) => (a.recordDate || '').localeCompare(b.recordDate || ''));
  const feedArrivals = (await dbGetFeedArrivals(currentBatchId)).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const medicineRecords = (await dbGetMedicineRecords(currentBatchId)).sort((a, b) => (a.date || a.createdAt || '').localeCompare(b.date || b.createdAt || ''));
  const batchDispatches = dispatches.filter(d => d.batchId === currentBatchId);

  // Aggregations
  const initialChickCount = Number(selectedBatch.initialChickCount || 0);
  const totalMortality = dailyRecords.reduce((sum, r) => sum + Number(r.mortalityCount || 0), 0);
  const mortalityPercentage = initialChickCount > 0 ? ((totalMortality / initialChickCount) * 100).toFixed(2) : '0.00';
  const remainingChickCount = Number(selectedBatch.remainingChickCount ?? Math.max(0, initialChickCount - totalMortality));

  const totalFeedArrivedBags = feedArrivals.reduce((acc, f) => {
    const isReturn = f.transactionType === 'Return';
    const totalKg = Number(f.quantityReceivedKg ?? f.quantityReceived ?? ((Number(f.bagsReceived || 0) * 70) + Number(f.additionalKg || 0)));
    const bags = totalKg / 70;
    return isReturn ? acc - bags : acc + bags;
  }, 0);
  const netArrivedBags = Math.max(0, totalFeedArrivedBags);
  const rawConsumedBags = dailyRecords.reduce((sum, r) => sum + Number(r.feedConsumption || 0), 0) / 70;
  const hasReturns = feedArrivals.some(f => f.transactionType === 'Return');
  const isBatchDone = (selectedBatch.status || '').toLowerCase() === 'completed';
  const totalFeedBags = (hasReturns || isBatchDone) && netArrivedBags > 0
    ? parseFloat(Math.min(rawConsumedBags, netArrivedBags).toFixed(2))
    : parseFloat(rawConsumedBags.toFixed(2));
  const totalFeedConsumedKg = parseFloat((totalFeedBags * 70).toFixed(2));

  // Dispatches & Trader breakdown
  let totalDispatchedWeight = 0;
  let totalDispatchedBirds = 0;
  let totalCratesCount = 0;

  const traderMap = {};
  const enrichedDispatches = [];

  for (const d of batchDispatches) {
    const traderName = d.vehicleName || d.customerName || d.traderName || 'General Trader';
    const inv = invoices.find(i => i.dispatchId === d.id || i.id === d.id);
    const sets = await dbGetBoxSets(d.id);

    // Calculate loaded boxSets totals
    const loadedSets = (sets || []).filter(s => Number(s.loadedWeight) > 0 || Number(s.totalChickenWeight) > 0);
    const setBirds = loadedSets.reduce((sum, s) => sum + Number(s.chickenCount || 0), 0);
    const setBoxes = loadedSets.reduce((sum, s) => sum + Number(s.boxesInSet || 0), 0);
    const setWeight = loadedSets.reduce((sum, s) => sum + Number(s.totalChickenWeight || 0), 0);

    const birds = setBirds > 0 ? setBirds : Number(d.birdsCount || d.totalBirds || d.totalChickens || (inv ? inv.totalChickens : 0) || 0);
    const weight = setWeight > 0 ? setWeight : Number(d.totalWeight || d.netWeight || (inv ? inv.totalWeightKg : 0) || 0);
    const crates = Number(d.cratesCount || d.totalCrates || setBoxes || (d.totalBoxCount || 0));

    const enrichedDisp = {
      ...d,
      boxSets: sets || [],
      birdsCount: birds,
      totalBirds: birds,
      cratesCount: crates,
      totalCrates: crates,
      totalWeight: weight
    };
    enrichedDispatches.push(enrichedDisp);

    totalDispatchedWeight += weight;
    totalDispatchedBirds += birds;
    totalCratesCount += crates;

    if (!traderMap[traderName]) {
      traderMap[traderName] = {
        traderName,
        totalBirds: 0,
        totalWeight: 0,
        totalCrates: 0,
        dispatchCount: 0
      };
    }
    traderMap[traderName].totalBirds += birds;
    traderMap[traderName].totalWeight += weight;
    traderMap[traderName].totalCrates += crates;
    traderMap[traderName].dispatchCount += 1;
  }

  const traderBreakdown = Object.values(traderMap).map(t => ({
    ...t,
    avgWeight: t.totalBirds > 0 ? parseFloat((t.totalWeight / t.totalBirds).toFixed(3)) : 0,
    totalWeight: parseFloat(t.totalWeight.toFixed(2))
  }));

  // Overall Average Bird Weight calculation
  const latestDailyRecord = dailyRecords.length > 0 ? dailyRecords[dailyRecords.length - 1] : null;
  const grandAvgFromDispatches = totalDispatchedBirds > 0 ? parseFloat((totalDispatchedWeight / totalDispatchedBirds).toFixed(3)) : 0;
  
  let avgBirdWeight = grandAvgFromDispatches;
  if (avgBirdWeight === 0 && latestDailyRecord && latestDailyRecord.averageWeight) {
    const rawVal = Number(latestDailyRecord.averageWeight);
    avgBirdWeight = rawVal > 20 ? parseFloat((rawVal / 1000).toFixed(3)) : rawVal;
  }

  // FCR (Feed Conversion Ratio) Calculation
  // Formula: total feed weight (kg) / total produced weight (kg)
  let fcr = null;
  const isCompleted = (selectedBatch.status || '').toLowerCase() === 'completed';
  const rawAvg = avgBirdWeight;
  const avgKg = rawAvg > 20 ? (rawAvg / 1000) : rawAvg;
  const survivingBirds = initialChickCount > 0 ? Math.max(0, initialChickCount - totalMortality) : remainingChickCount;

  let totalLiveWeightKg = 0;
  if (isCompleted && totalDispatchedWeight > 0) {
    totalLiveWeightKg = totalDispatchedWeight;
  } else if (totalDispatchedWeight > 0) {
    totalLiveWeightKg = totalDispatchedWeight + (avgKg * remainingChickCount);
  } else {
    totalLiveWeightKg = avgKg * survivingBirds;
  }

  if (totalFeedConsumedKg > 0 && totalLiveWeightKg > 0) {
    fcr = parseFloat((totalFeedConsumedKg / totalLiveWeightKg).toFixed(2));
  }

  const dispatchedAvgWeight = totalDispatchedBirds > 0 ? parseFloat((totalDispatchedWeight / totalDispatchedBirds).toFixed(3)) : 0;

  return {
    batch: selectedBatch,
    initialChickCount,
    remainingChickCount,
    totalMortality,
    mortalityPercentage,
    totalFeedConsumedKg,
    totalFeedBags,
    totalDispatchedWeight: parseFloat(totalDispatchedWeight.toFixed(2)),
    totalDispatchedBirds: totalDispatchedBirds,
    totalCratesCount,
    avgBirdWeight,
    dispatchedAvgWeight,
    fcr,
    traderBreakdown,
    dailyRecords,
    feedArrivals,
    medicineRecords,
    dispatches: enrichedDispatches
  };
}
