# Security Documentation & Hardening Guidelines

## Security Rules & Access Control

1. **Role-Based Access Control (RBAC)**:
   - Enforced both at the React Router component boundary (`ProtectedRoute.jsx`) and at the database security rule layer (`database.rules.json`).
   - Admin access required for User Creation, Batch Lifecycle Management, Target Benchmark Edits, and Audit Log viewing.
   - Farmers restricted strictly to operational data entry for assigned active batches.

2. **Secrets Protection**:
   - Environment files (`.env`, `.env.local`, `.env.*.local`) are ignored by `.gitignore`.
   - Client secrets are never embedded in the bundle.
   - Snyk and SonarQube credentials managed safely through GitHub Action Repository Secrets (`SNYK_TOKEN`, `SONAR_TOKEN`, `VERCEL_TOKEN`).

3. **Firebase App Check**:
   - Integrated with reCAPTCHA v3 provider to prevent unauthorized automated abuse or database spamming.

4. **Input Sanitization & Constraints**:
   - Prevent future dates on daily farm logs.
   - Prevent negative mortality counts or mortality exceeding available chicken count.
   - Require positive numerical weights and counts across dispatches.
