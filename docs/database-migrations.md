# Database Production Readiness & Safe Migration Guide — EduManage Pro

## 1. Principles of Production Database Management

1. **ZERO DESTRUCTIVE RESETS**: Never run `npx prisma db push --force-reset` or `npx prisma migrate reset` in production environments.
2. **STAGING VERIFICATION**: All migrations must be applied and tested in a Staging database before running in Production.
3. **MIGRATION IMMUTABILITY**: Migration files in `prisma/migrations` are version controlled and must never be deleted or manually altered after deployment.

---

## 2. Standard Production Migration Runbook

### Step 1: Create Migration in Local / Development
```bash
# Create a new migration SQL file from schema changes
npx prisma migrate dev --name describe_your_change
```

### Step 2: Test Migration on Staging Database
```bash
# Apply pending migrations to Staging without prompts
DATABASE_URL="postgresql://user:pass@staging-db:5432/school_ms_staging" npx prisma migrate deploy
```

### Step 3: Backup Production Database
Before deploying migrations to Production, initiate a full database snapshot or dump:
```bash
npx tsx src/scripts/test-phase22-backup-recovery.ts
```

### Step 4: Apply Migration to Production Database
```bash
# Run non-destructive production migration
npx prisma migrate deploy
```

---

## 3. Migration Troubleshooting & Failure Recovery

### Handling `Migration failed to apply`
If a migration fails in production:
1. Check migration status:
   ```bash
   npx prisma migrate status
   ```
2. Inspect the failed SQL statement in `prisma/migrations/<migration_folder>/migration.sql`.
3. If the database was left in an unapplied state, mark the migration resolved using:
   ```bash
   npx prisma migrate resolve --rolled-back "<migration_name>"
   ```
4. Restore from pre-migration backup if data corruption occurred:
   ```bash
   npx tsx src/scripts/restore-database.ts
   ```
