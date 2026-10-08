# Live Deployment & Production Hosting Guide — EduManage Pro

## 1. Overview & Architecture Requirements

EduManage Pro requires the following production infrastructure components:

```mermaid
graph TD
    User[End User Browser / Mobile] -->|HTTPS 443| Domain[Production Domain app.yourdomain.com]
    Domain -->|Load Balancer| AppCluster[Next.js App Server Cluster (Vercel / AWS / Docker)]
    AppCluster -->|Prisma ORM SSL| Database[(Managed PostgreSQL 14+ RDS / Supabase)]
    AppCluster -->|S3 Uploads| Storage[AWS S3 / S3 Storage Bucket]
    AppCluster -->|HTTPS Webhooks| Integrations[SendGrid / Twilio Integration]
```

---

## 2. Platform Provider Options & Instructions

### Option A: Vercel Deployment (Recommended for Next.js)
1. Link GitHub repository to Vercel Project.
2. In **Project Settings -> Environment Variables**, add:
   - `DATABASE_URL` (Server Secret)
   - `JWT_SECRET` (Server Secret)
   - `NEXTAUTH_SECRET` (Server Secret)
   - `NEXTAUTH_URL` (`https://app.yourdomain.com`)
   - `NEXT_PUBLIC_APP_NAME` (`EduManage Pro`)
   - `NEXT_PUBLIC_APP_URL` (`https://app.yourdomain.com`)
3. Set Build Command: `npx prisma generate && next build`.
4. Deploy to production branch (`main`).

### Option B: Docker Container / AWS ECS / Railway Deployment
1. Build production Docker image:
   ```dockerfile
   FROM node:20-alpine AS builder
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci
   COPY . .
   RUN npx prisma generate
   RUN npm run build
   CMD ["npm", "run", "start"]
   ```
2. Set Environment Variables in container environment.

---

## 3. Database Migration Runbook for Production

Before launching live users:
```bash
# 1. Apply non-destructive production migrations
npx prisma migrate deploy

# 2. Bootstrap initial Platform Super Admin
INITIAL_SUPER_ADMIN_EMAIL="admin@yourdomain.com" INITIAL_SUPER_ADMIN_PASSWORD="YourSecurePassword123!" npx tsx src/scripts/bootstrap-production-admin.ts

# 3. Initialize First School Structure
FIRST_SCHOOL_NAME="Your School Name" FIRST_SCHOOL_ADMIN_EMAIL="principal@yourschool.edu" npx tsx src/scripts/setup-first-school.ts
```

---

## 4. Manual Provider Configuration Checklist (User Action Required)

| Service | Provider Options | Required Manual Credentials | Status |
| --- | --- | --- | --- |
| **PostgreSQL Database** | AWS RDS, Supabase, Railway | `DATABASE_URL` with SSL | User-Managed |
| **Object Storage** | AWS S3, Supabase Storage | `AWS_S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | User-Managed |
| **DNS Domain & SSL** | Cloudflare, Route 53, Vercel | `A`/`CNAME` records -> `app.yourdomain.com` | User-Managed |
| **Email SMTP** | SendGrid, AWS SES | `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` | User-Managed |
| **WhatsApp/SMS** | Twilio | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` | User-Managed |
