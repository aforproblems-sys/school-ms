# 🛡️ School Management System - Disaster Recovery & Backup Runbook

## Overview
This document outlines the official Backup, Verification, Restoration, and Disaster Recovery (DR) architecture for the School Management System (EduManage Pro).

---

## 1. Database Backup Strategy

### Scope of Backups
The database backup process captures all system entities across the PostgreSQL database instance:

| Entity Category | Database Models |
|---|---|
| **Core & Security** | `School`, `User`, `Role`, `Permission`, `RolePermission`, `AuditLog` |
| **Academic Structure** | `AcademicSession`, `Class`, `Section`, `Subject`, `TeacherSubject` |
| **Users & Profiles** | `Student`, `Parent`, `Teacher`, `Enrollment` |
| **Academic Execution** | `Attendance`, `Timetable`, `Exam`, `Mark`, `Result` |
| **Financial Operations** | `FeeStructure`, `StudentFee`, `FeePayment`, `Expense`, `Payroll` |
| **Communication & Logs** | `Notice`, `Message`, `Notification`, `NotificationSetting`, `CommunicationLog`, `File`, `BackupLog` |

### Database Backup Execution
- **Automated CLI Command**:
  ```bash
  npx tsx src/scripts/backup-database.ts
  ```
- **Standard Native Command**:
  ```bash
  pg_dump -h localhost -U postgres -d school_ms_db -F c -b -v -f ./backups/school_ms_db_backup_$(date +%Y-%m-%d_%H%M%S).dump
  ```
- **Storage Path**: `./backups/` (configurable via `BACKUP_DIR` environment variable).

---

## 2. File Storage Backup Strategy

Database backups alone do NOT back up uploaded files. File storage is backed up separately:
- **Scope**: Student photos, teacher photos, school logos, exam documents, assignment attachments in `public/uploads`.
- **Automated Snapshot Command**:
  ```bash
  npx tsx src/scripts/backup-files.ts
  ```
- **Sync Command**:
  ```bash
  rsync -avz --delete ./public/uploads/ /var/backups/school_ms/uploads/
  ```

---

## 3. Automated Schedules & Retention Policy

### Backup Schedule Matrix
- **Daily Full Backup**: Executed at 01:00 UTC every night.
- **Weekly Retention Snapshot**: Promoted automatically on Sunday 02:00 UTC.
- **Monthly Archival Snapshot**: Promoted automatically on 1st of every month.

### Configurable Retention Rules
Environment Variables:
- `BACKUP_RETENTION_DAILY=7` (Keep last 7 daily backups)
- `BACKUP_RETENTION_WEEKLY=4` (Keep last 4 weekly backups)
- `BACKUP_RETENTION_MONTHLY=12` (Keep last 12 monthly backups)

*Backups are NEVER automatically pruned unless explicitly matching retention expiry.*

---

## 4. Backup Verification & Integrity Checks

A backup is only valid if its checksum and file integrity are verified.

### Automatic Verification
Run the verification CLI tool:
```bash
npx tsx src/scripts/verify-backup.ts <backup-filename-or-id>
```

### Verification Checks:
1. File Existence on disk.
2. SHA-256 Checksum Calculation matching database audit registry.
3. Schema & Table Structure Check.
4. Entity Row Count Verification.

---

## 5. Non-Destructive Restore Procedure

> [!CAUTION]
> **RESTORE SAFEGUARD**: NEVER execute a database restore directly against live production! Always restore to an isolated sandbox first.

### Step-by-Step Restoration Runbook
1. **Identify Backup**: Select the required verified backup snapshot from `/settings/system-status` or `./backups/`.
2. **Provision Isolated Environment**: Prepare an isolated database target (e.g. `school_ms_recovery_test`).
3. **Execute Isolated Restoration**:
   ```bash
   RECOVERY_TARGET_DB=school_ms_recovery_test npx tsx src/scripts/restore-database.ts <backup-file.sql>
   ```
4. **Verify Restored Schema**: Confirm all 25+ tables exist and primary keys are intact.
5. **Verify Critical Record Counts**: Validate count of `User`, `Student`, `FeePayment`, and `Result` records.
6. **Verify Application Compatibility**: Start application instance connected to test DB to ensure zero schema drift.
7. **Production Cutover (If disaster recovery required)**: Update production `DATABASE_URL` to point to recovered instance.

---

## 6. Disaster Recovery Scenarios & Runbooks

| Metric | Target / Configurable Value |
|---|---|
| **RPO (Recovery Point Objective)** | Maximum 24 Hours (Daily Snapshot) / 1 Hour (WAL logs) |
| **RTO (Recovery Time Objective)** | Target < 30 Minutes |

### Scenario 1: Database Corruption
1. Freeze incoming write requests by enabling Maintenance Mode.
2. Identify latest verified SHA-256 backup.
3. Restore into sandbox DB using `npx tsx src/scripts/restore-database.ts`.
4. Validate table sanity and switch production `DATABASE_URL`.

### Scenario 2: Accidental Deletion of Records (e.g. Fees/Results)
1. Do NOT restore over production.
2. Restore latest pre-deletion backup into `school_ms_recovery_test`.
3. Extract deleted rows from test DB into a targeted migration SQL script.
4. Apply target INSERT script to live production DB.

### Scenario 3: Failed Software Deployment
1. Revert application code to previous git commit release tag.
2. Run Prisma schema compatibility check.
3. Restart application server.

### Scenario 4: Application Server Host Failure
1. Spin up new container / EC2 host.
2. Clone repository & install dependencies (`npm ci`).
3. Inject environment secrets from secure vault.
4. Point `DATABASE_URL` to database host and start server (`npm run dev` or `npm start`).

### Scenario 5: Storage Volume Failure
1. Mount fresh storage directory at `public/uploads`.
2. Extract latest file manifest snapshot using `npx tsx src/scripts/backup-files.ts`.
3. Restore asset files from secondary off-site bucket.

### Scenario 6: External Provider Outage (Email / SMS / WhatsApp)
1. Navigate to `/settings/communication`.
2. Enable **Test Mode** switch to buffer messages locally without dropping application DB actions.
3. Inspect `CommunicationLog` table for failed dispatches.
4. Retry failed dispatches once external provider returns online.

### Scenario 7: Configuration / Secret Loss
1. Retrieve backup env variables from secure password manager / secret store.
2. Re-populate `.env` file.
3. Restart application container.

---

## 7. Production Configuration & Secrets Management

The following production variables MUST be stored in a secure secret manager (AWS Secrets Manager, Vault, GitHub Secrets):

| Variable Name | Description | Sensitivity |
|---|---|---|
| `DATABASE_URL` | PostgreSQL Connection String | HIGH (Contains DB password) |
| `JWT_SECRET` | Authentication Secret | HIGH |
| `SMTP_HOST`, `SMTP_PASS` | Email Gateway Credentials | MEDIUM |
| `WHATSAPP_API_KEY` | Meta Cloud API Key | HIGH |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` | SMS Provider Key | HIGH |
| `BACKUP_DIR` | Backup Storage Location | LOW |
| `BACKUP_RETENTION_DAILY` | Retention Policy Config | LOW |

---

## 8. Audit Log Protection & Immutability

- Administrative actions (`Student archive`, `Fee payment`, `Result edit`, `Settings modification`) generate immutable `AuditLog` records.
- Non-super-admin users CANNOT update or delete `AuditLog` rows.
- Audit history is backed up alongside core tables in every SQL dump.

---

## 9. Non-Production Recovery Test Execution

To verify backup and recovery end-to-end against a live PostgreSQL instance without modifying production data, run:
```bash
npx tsx src/scripts/test-phase22-backup-recovery.ts
```
