# GitHub Actions CI/CD Pipeline Documentation

## CI/CD Pipeline Overview

The CI/CD pipeline is defined in `.github/workflows/ci-cd.yml`. It triggers automatically on every push or pull request to the `main` and `develop` branches.

```text
[Push / Pull Request]
          │
          ▼
1. Checkout Source Code
          │
          ▼
2. Setup Node.js (v20)
          │
          ▼
3. Install Dependencies (npm ci)
          │
          ▼
4. Run ESLint (npm run lint)
          │
          ▼
5. Run Vitest Unit Tests (npm run test)
          │
          ▼
6. Run Snyk Security Vulnerability Scan
          │
          ▼
7. Run SonarQube Quality Analysis
          │
          ▼
8. Build Application (npm run build)
          │
          ▼
9. Deploy to Vercel Production (Main branch only)
```

## Required GitHub Secrets

Configure the following secrets in GitHub Repository Settings $\rightarrow$ Secrets and Variables $\rightarrow$ Actions:

| Secret Name | Description |
| :--- | :--- |
| `SNYK_TOKEN` | Snyk API access token for vulnerability scanning |
| `SONAR_TOKEN` | SonarQube project analysis token |
| `SONAR_HOST_URL` | URL of SonarQube instance |
| `VERCEL_TOKEN` | Vercel deployment access token |
| `VERCEL_ORG_ID` | Vercel organization ID |
| `VERCEL_PROJECT_ID` | Vercel project ID |
