# Database Backup, Retention & Disaster Recovery Runbook — EduManage Pro

## 1. Production Backup Policy

| Backup Type | Frequency | Retention Window | Storage Location | Automated Runner |
| --- | --- | --- | --- | --- |
| **Daily Differential** | Daily @ 02:00 UTC | 7 Days | S3 / Encrypted Offsite | Scheduled Cron Worker |
| **Weekly Full** | Every Sunday @ 03:00 UTC | 4 Weeks | S3 / Encrypted Offsite | Scheduled Cron Worker |
| **Monthly Archive** | 1st of Month @ 04:00 UTC | 12 Months | Cold Glacier Storage | Scheduled Cron Worker |

---

## 2. Automated & Manual Backup Execution

### Running On-Demand Database Backup via Automated Service
```bash
# Execute automated database & file backup service
npx tsx -e "import { createDatabaseBackup } from './src/lib/backup-service'; createDatabaseBackup({ backupType: 'MANUAL', triggeredBy: 'admin' }).then(console.log);"
```

### Native PostgreSQL Dump Command (pg_dump)
```bash
pg_dump -h your-db-host.internal -U postgres -d school_ms -F c -b -v -f "/var/backups/edumanage/school_ms_$(date +%Y%m%d_%H%M%S).dump"
```

---

## 3. Disaster Recovery & Restoration Runbook

### Step 1: Verify Backup Checksum & Integrity
Ensure the backup file SHA256 checksum matches the audit entry stored in the database.

### Step 2: Create Recovery Database Instance
To prevent accidental overwrite, restore to a target recovery database first:
```bash
createdb -h your-db-host.internal -U postgres school_ms_recovery
```

### Step 3: Execute Database Restore
```bash
# Run automated restore script
RECOVERY_TARGET_DB="school_ms_recovery" npx tsx src/scripts/restore-database.ts
```

### Step 4: Verify Data & Promote Target DB
1. Verify school records, student counts, and transaction totals.
2. Point application `DATABASE_URL` to the restored database instance.
