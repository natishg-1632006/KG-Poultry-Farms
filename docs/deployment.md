# Vercel Deployment Guide

## Deployment Configuration

The application is configured for deployment to **Vercel** with SPA fallback routing using `vercel.json`:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

## Manual Deployment Instructions

1. Install Vercel CLI locally:
   ```bash
   npm install -g vercel
   ```

2. Authenticate and link project:
   ```bash
   vercel login
   vercel link
   ```

3. Deploy preview build:
   ```bash
   vercel
   ```

4. Deploy production build:
   ```bash
   vercel --prod
   ```

## Production Environment Setup

In the Vercel Dashboard, under Project Settings $\rightarrow$ Environment Variables, configure the `VITE_FIREBASE_*` environment variables matching `.env.example`.
