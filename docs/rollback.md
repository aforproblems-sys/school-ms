# Rollback Strategy & Emergency Recovery — EduManage Pro

## 1. When to Initiate a Rollback

Initiate an immediate rollback if any of the following occur post-deployment:
1. Critical authentication or authorization failure blocking user access.
2. Cross-tenant data leak or security compromise.
3. Database connection pool exhaustion or high HTTP 500 error rates (>2%).
4. Unrecoverable background task crash.

---

## 2. Emergency Rollback Procedures

### Procedure A: Application Code Rollback (Vercel / Container / Cloud)
1. **Instant CDN Rollback**: In Vercel or AWS Load Balancer, promote the previous successful deployment build.
2. **Git Revert**:
   ```bash
   git revert HEAD -m 1
   git push origin main
   ```

### Procedure B: Database Schema Rollback
> [!CAUTION]
> Never blindly roll back database migrations if data has been written to newly added columns or tables.

1. **Revert Non-Destructive Migrations**:
   If the migration added new nullable columns or tables, application rollback is sufficient (old code ignores new schema elements).
2. **Revert Destructive Schema Changes**:
   Restore the pre-deployment PostgreSQL snapshot to a secondary DB instance, merge lost delta records, and point `DATABASE_URL` back.

### Procedure C: Environment Secret Rollback
If a faulty environment secret caused deployment failure:
1. Re-apply verified previous environment configuration values in platform settings.
2. Trigger application pod restart.

---

## 3. Post-Rollback Action Items

1. Enable Maintenance Mode (`MAINTENANCE_MODE="true"`) if system is unstable.
2. Extract production error logs via `src/lib/logger.ts` and `errorReporter`.
3. Conduct post-mortem review and add failing edge-case to test suite before re-attempting deployment.
