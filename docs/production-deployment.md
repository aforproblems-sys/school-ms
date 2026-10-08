# Production Deployment & Architecture Guide — EduManage Pro

## 1. System Overview & Architecture

EduManage Pro is built on a multi-tenant SaaS architecture supporting isolated schools, robust RBAC authorization, realtime Server-Sent Events (SSE), document generation, provider-independent communications, and automated backups.

```mermaid
graph TD
    Client[Browser / Mobile Web] -->|HTTPS / SSL| CDN[Cloudflare / Vercel CDN]
    CDN -->|Load Balancer| App[Next.js App Server Cluster]
    App -->|Prisma ORM (SSL)| DB[(Managed PostgreSQL Primary)]
    App -->|Multi-Tenant Storage| Storage[AWS S3 / Storage Provider]
    App -->|Webhooks / Dispatcher| Comm[SendGrid / Twilio Integration]
    App -->|Realtime Events| SSE[Realtime Notification Engine]
```

---

## 2. Infrastructure Requirements & Topology

### Required Managed Infrastructure
1. **Application Hosting**: Vercel, AWS ECS/Fargate, or Node.js Docker containers (Min 2 vCPU, 4GB RAM per node).
2. **PostgreSQL Database**: Managed PostgreSQL 14+ (AWS RDS, Supabase, Render, or Railway) with SSL enabled, automated daily backups, and point-in-time recovery (PITR).
3. **Object Storage**: AWS S3 bucket or S3-compatible storage for tenant file isolation (`school/{schoolId}/...`).
4. **Domain & SSL**: Registered custom domain with wildcard SSL certificate (e.g., `*.edumanage.com` or `app.edumanage.com`).

### Optional Integrations
- **Email Service**: SendGrid, AWS SES, or SMTP provider.
- **WhatsApp/SMS**: Twilio API accounts.
- **APM Error Monitoring**: Sentry DSN for error telemetry.

---

## 3. Step-by-Step Production Deployment Runbook

### Step 1: Environment Provisioning
1. Provision target Managed PostgreSQL database and obtain connection string (`DATABASE_URL`).
2. Generate strong secrets (64+ characters) for `JWT_SECRET` and `NEXTAUTH_SECRET`.
3. Configure environment variables in deployment platform using `.env.example` as a template.

### Step 2: Database Migration
```bash
# Execute safe production migrations without wiping database
npx prisma migrate deploy
```

### Step 3: Application Build & Asset Compilation
```bash
# Generate Prisma Client & compile Next.js production bundle
npx prisma generate
npm run build
```

### Step 4: Health Check & Verification
- Test GET `/api/health` to confirm database latency and service readiness.
- Verify status returns HTTP 200 OK.

### Step 5: Post-Deployment Smoke Test
- Run the smoke-test checklist in [smoke-test-checklist.md](file:///Users/macbookpro/School%20MS/docs/smoke-test-checklist.md).
