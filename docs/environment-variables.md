# Environment Variables & Security Classification — EduManage Pro

This document defines all environment variables required by EduManage Pro, their scope, defaults, and security rules.

## 1. Security Classification Rules

- **Server-Only Secrets**: NEVER expose to browser bundles or prefix with `NEXT_PUBLIC_`. Keep strictly inside server process environment.
- **Public Variables**: Prefixed with `NEXT_PUBLIC_`. Exposed to browser JavaScript. DO NOT place keys or passwords in public variables.

---

## 2. Complete Environment Variable Reference Table

| Variable Name | Scope | Description | Default / Example | Required |
| --- | --- | --- | --- | --- |
| `DATABASE_URL` | Server Secret | PostgreSQL connection string with SSL enabled | `postgresql://user:pass@host:5432/db?sslmode=require` | **YES** |
| `DIRECT_URL` | Server Secret | Direct DB connection string for migrations | `postgresql://user:pass@host:5432/db?sslmode=require` | Optional |
| `JWT_SECRET` | Server Secret | Secret key for signing session JWT tokens | `64+ char random string` | **YES** |
| `NEXTAUTH_SECRET` | Server Secret | NextAuth secret for cookie encryption | `64+ char random string` | **YES** |
| `NEXTAUTH_URL` | Server Secret | Canonical production app URL | `https://app.edumanage.com` | **YES** |
| `NEXT_PUBLIC_APP_NAME` | Public | Brand display name in UI | `EduManage Pro` | Optional |
| `NEXT_PUBLIC_APP_URL` | Public | Client-side base URL | `https://app.edumanage.com` | **YES** |
| `NEXT_PUBLIC_BILLING_CURRENCY` | Public | Base billing currency ISO code | `USD` | Optional |
| `STORAGE_PROVIDER` | Server Config | Storage backend (`local`, `s3`, `supabase`) | `local` | **YES** |
| `STORAGE_UPLOADS_DIR` | Server Config | Local upload directory path | `/var/data/edumanage/uploads` | Optional |
| `AWS_S3_BUCKET` | Server Secret | AWS S3 Bucket Name for tenant files | `edumanage-prod-storage` | S3 Only |
| `AWS_REGION` | Server Config | AWS region | `us-east-1` | S3 Only |
| `AWS_ACCESS_KEY_ID` | Server Secret | AWS IAM Access Key ID | `AKIA...` | S3 Only |
| `AWS_SECRET_ACCESS_KEY` | Server Secret | AWS IAM Secret Access Key | `Secret...` | S3 Only |
| `BACKUP_DIR` | Server Config | Target directory for database backups | `/var/backups/edumanage` | Optional |
| `SMTP_HOST` | Server Secret | Outbound email SMTP host | `smtp.sendgrid.net` | Comm Only |
| `SMTP_PORT` | Server Config | Outbound email SMTP port | `587` | Comm Only |
| `SMTP_USER` | Server Secret | SMTP Auth username | `apikey` | Comm Only |
| `SMTP_PASS` | Server Secret | SMTP Auth password / API key | `SG.Key...` | Comm Only |
| `TWILIO_ACCOUNT_SID` | Server Secret | Twilio Account SID for SMS/WhatsApp | `AC...` | Comm Only |
| `TWILIO_AUTH_TOKEN` | Server Secret | Twilio Auth Token | `Secret...` | Comm Only |
| `MAINTENANCE_MODE` | Server Config | Force application into maintenance mode | `false` | Optional |

---

## 3. Environment Audit Guidelines

1. Never commit `.env` or `.env.local` to Git repository. `.gitignore` MUST contain `.env*` rules.
2. In production, pass environment variables via platform dashboard (e.g. Vercel Project Settings, AWS Secrets Manager, Kubernetes Secrets).
