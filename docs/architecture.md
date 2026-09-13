# System Architecture Document

## High-Level Overview

The KG Poultry Farms Management System is architected as a single-page web application (SPA) built with React 19, Vite, and Tailwind CSS. The application connects to Firebase Authentication and Firebase Realtime Database for realtime state synchronisation, backed by automated client-side fallback storage when offline.

```text
+-----------------------------------------------------------------+
|                       Client Browser (SPA)                       |
|  React 19 + Tailwind CSS + Recharts + React Router v7 + Context   |
+-----------------------------------------------------------------+
                                |
               +----------------+----------------+
               |                                 |
       [Firebase Auth]              [Firebase Realtime Database]
(Email/Password & Role Guard)      (Security Rules + RTDB Sync)
```

## Core Modules & Design Choices

1. **State Management**:
   - `AuthContext`: Centralized context tracking session token, user role (`Admin` vs `Farmer`), active state, and assigned batch credentials.
   - `dbService`: Unified database abstraction providing CRUD methods for all entities, with seamless fallback logic.

2. **Deduction & Calculation Logic**:
   - Kept strictly in `src/utils/calculations.js` as pure functions to allow 100% automated testability.
   - Stock deduction order: `Pre-Starter` $\rightarrow$ `Starter` $\rightarrow$ `Finisher`.
   - Remaining chicken count: `PrevRemaining - Mortality`.

3. **Dispatch & Box-Set Architecture**:
   - Prevents database duplication by separating the Dispatch Header from individual Box Set weight records.
