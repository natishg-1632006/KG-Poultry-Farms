# Database Structure & Security Rules

## Firebase Realtime Database Schema

```json
{
  "users": {
    "$uid": {
      "uid": "string",
      "name": "string",
      "email": "string",
      "phone": "string",
      "farmName": "string",
      "role": "Admin | Farmer",
      "active": "boolean",
      "assignedBatches": ["KG001"],
      "createdAt": "ISO string"
    }
  },
  "batches": {
    "$batchId": {
      "id": "KG001",
      "batchNumber": "KG001",
      "batchName": "KgPoultryBatch-1",
      "chickArrivalDate": "YYYY-MM-DD",
      "initialChickCount": "number",
      "remainingChickCount": "number",
      "assignedFarmerId": "uid",
      "assignedFarmerName": "string",
      "status": "Draft | Active | Completed",
      "feedStock": {
        "Pre-Starter": "number",
        "Starter": "number",
        "Finisher": "number"
      }
    }
  },
  "dailyRecords": {
    "$batchId": {
      "$date": {
        "batchId": "KG001",
        "recordDate": "YYYY-MM-DD",
        "mortalityCount": "number",
        "feedType": "Pre-Starter | Starter | Finisher",
        "feedConsumption": "number",
        "averageWeight": "number",
        "remainingChickCount": "number"
      }
    }
  },
  "feedStocks": {
    "$batchId": [
      {
        "id": "feed-1",
        "feedType": "Pre-Starter",
        "quantityReceived": "number",
        "driverName": "string",
        "vehicleNumber": "string",
        "date": "YYYY-MM-DD"
      }
    ]
  },
  "dispatches": {
    "$dispatchId": {
      "id": "disp-1",
      "batchId": "KG001",
      "vehicleNumber": "string",
      "driverName": "string",
      "dispatchDate": "YYYY-MM-DD",
      "totalBoxCount": "number",
      "totalChickenCount": "number",
      "totalWeight": "number",
      "status": "In Progress | Completed"
    }
  },
  "boxSets": {
    "$dispatchId": [
      {
        "boxSetNumber": "number",
        "emptyBoxWeight": 5,
        "loadedWeight": "number",
        "chickenCount": "number",
        "totalChickenWeight": "number",
        "averageChickenWeight": "number"
      }
    ]
  },
  "targets": {
    "feedConsumption": { "1": 20, "2": 21, "...": "..." },
    "averageWeight": { "1": 58, "2": 76, "...": "..." }
  },
  "invoices": [
    {
      "id": "INV-2026-001",
      "dispatchId": "disp-1",
      "totalWeightKg": "number",
      "totalAmount": "number"
    }
  ],
  "auditLogs": [
    {
      "id": "log-1",
      "action": "string",
      "details": "string",
      "actorName": "string",
      "timestamp": "ISO string"
    }
  ]
}
```
