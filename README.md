# EduManage Pro — Production Full-Stack School Management System

EduManage Pro is an enterprise-grade, multi-tenant SaaS School Management System built with Next.js (App Router), PostgreSQL, Prisma ORM, and TypeScript.

---

## Key Features

- **Multi-Tenant SaaS Architecture**: Complete data isolation across schools (`schoolId` scoping).
- **Role-Based Access Control (RBAC)**: Fine-grained permissions for Super Admins, School Admins, Teachers, Accountants, Parents, and Students.
- **Realtime Updates**: Server-Sent Events (SSE) for live notifications, attendance updates, and fee changes.
- **Provider-Independent Communications**: Integrated Email (SMTP/SendGrid), WhatsApp, and SMS (Twilio) abstraction layer.
- **Automated Disaster Recovery**: Scheduled PostgreSQL database dumps, checksum verification, retention policy governance, and point-in-time recovery.
- **SaaS Subscription & Billing Architecture**: Governance for Free Trial, Basic, Professional, and Enterprise plans with student/teacher quota limits.
- **Production Operations**: Structured JSON logging with secret redaction, health monitoring (`/api/health`), maintenance mode toggle, and GitHub Actions CI/CD workflows.

---

## Getting Started & Development

### 1. Environment Setup
Copy the production template file to `.env`:
```bash
cp .env.example .env
```
Fill in your local PostgreSQL credentials and secrets.

### 2. Database Initialization
```bash
# Run database migrations
npx prisma migrate dev

# Seed initial system roles & demonstration data
npm run seed
```

### 3. Running Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Production Deployment & Commands

```bash
# Type Check
npx tsc --noEmit

# Linting
npm run lint

# Safe Non-Destructive Production Migration
npx prisma migrate deploy

# Production Build
npm run build

# Start Production Server
npm run start
```

---

## Documentation Suite

Detailed production operational documentation is available in the `docs/` directory:

- [Production Deployment Guide](file:///Users/macbookpro/School%20MS/docs/production-deployment.md)
- [Environment Variables Specification](file:///Users/macbookpro/School%20MS/docs/environment-variables.md)
- [Database Migrations & Readiness Runbook](file:///Users/macbookpro/School%20MS/docs/database-migrations.md)
- [Backup, Restore & Disaster Recovery](file:///Users/macbookpro/School%20MS/docs/backup-restore.md)
- [Staging Environment & Release Protocol](file:///Users/macbookpro/School%20MS/docs/staging.md)
- [Rollback Strategy & Emergency Recovery](file:///Users/macbookpro/School%20MS/docs/rollback.md)
- [Post-Deployment Smoke Test Checklist](file:///Users/macbookpro/School%20MS/docs/smoke-test-checklist.md)
- [Multi-Tenant Architecture Specification](file:///Users/macbookpro/School%20MS/MULTI_TENANT_ARCHITECTURE.md)
- [SaaS Billing Architecture Specification](file:///Users/macbookpro/School%20MS/SAAS_BILLING_ARCHITECTURE.md)
- [Disaster Recovery Architecture](file:///Users/macbookpro/School%20MS/DISASTER_RECOVERY.md)
