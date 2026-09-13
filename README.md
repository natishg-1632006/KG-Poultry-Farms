# KG Poultry Farms Management System

A responsive, production-ready web application designed for broiler/meat poultry farm operations, replacing manual paper records with centralized digital tracking.

## Technical Architecture & Stack

- **Frontend Framework**: React 19 + Vite
- **Styling**: Tailwind CSS v4
- **Authentication**: Firebase Authentication (Email/Password & Role-Based Custom Claims)
- **Database**: Firebase Realtime Database with granular security rules & offline local fallback
- **App Check**: Firebase App Check (reCAPTCHA v3)
- **Analytics & Graphs**: Recharts
- **Testing**: Vitest + React Testing Library
- **Linting & Quality**: ESLint Flat Config + SonarQube
- **Security Scanning**: Snyk Vulnerability Assessment
- **Deployment**: Vercel SPA Deployment
- **CI/CD**: GitHub Actions Pipeline

## Quick Start & Local Setup

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0

### Installation

```bash
# Clone repository
git clone https://github.com/natishg-1632006/KG-Poultry-Farms.git
cd KG-Poultry-Farms

# Install dependencies
npm install

# Start local dev server
npm run dev
```

### Environment Variables (.env)

Copy `.env.example` to `.env.local` and populate your Firebase credentials:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_DATABASE_URL=https://your-app.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_APP_CHECK_KEY=your_recaptcha_key
```

## Running Verification Commands

```bash
# Run unit tests
npm run test

# Run ESLint quality checks
npm run lint

# Build production bundle
npm run build
```

## User Roles & Key Modules

1. **Admin Console**:
   - User Management (Create, Edit, Deactivate, Batch Assignment)
   - Batch Management (Draft → Active → Completed lifecycle)
   - Company Target Benchmarks (Day 1–45 Feed, Day 1–42 Weight)
   - Security Audit Logging

2. **Farmer Operations**:
   - Daily Farm Entry (Mortality, Feed consumption, Weight)
   - Feed Stock Receive (Pre-Starter, Starter, Finisher FIFO deduction)
   - Medicine & Vaccination (Multiple vaccines & vaccinators)
   - Dispatch Weighing (Header & box set empty/loaded calculations)
   - Printable Invoices & PDF Export

## Documentation Sitemap

Detailed documentation is available in the `docs/` directory:
- [Architecture & Tech Stack](docs/architecture.md)
- [Database Structure & Rules](docs/database-structure.md)
- [Security Requirements](docs/security.md)
- [Testing & Quality Assurance](docs/testing.md)
- [GitHub Actions CI/CD Pipeline](docs/ci-cd.md)
- [Vercel Deployment Guide](docs/deployment.md)
