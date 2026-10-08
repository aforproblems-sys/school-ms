# Daily Operational Checklist & System Health — EduManage Pro

Perform these daily operational checks to maintain system health, security, and performance.

---

## 1. Daily System Operations Checklist

- [ ] **Health Endpoint Monitoring**: GET `/api/health` — Verify HTTP 200 status and database latency < 100ms.
- [ ] **Database Backup Verification**: Verify daily PostgreSQL dump file creation in `/var/backups/edumanage/`.
- [ ] **Error Log Telemetry**: Review server log output via `src/lib/logger.ts` for uncaught HTTP 500 exceptions.
- [ ] **Realtime Engine Status**: Confirm SSE connection endpoint `/api/realtime` is active and responding.
- [ ] **Disk & Storage Usage**: Verify object storage bucket usage and local upload directory space.

---

## 2. Emergency Operational Runbook

### Handling Database Latency / High Memory
1. Check process memory RSS via GET `/api/health`.
2. Inspect active PostgreSQL queries:
   ```sql
   SELECT pid, now() - pg_stat_activity.query_start AS duration, query, state FROM pg_stat_activity WHERE state != 'idle' ORDER BY duration DESC;
   ```
3. Restart application process node cluster if memory leaks occur.

### Enabling Emergency Maintenance Mode
To prevent non-admin user access during database maintenance:
1. Log in as Super Admin.
2. Toggle Maintenance Mode ON in `/dashboard/super-admin/system` or set `MAINTENANCE_MODE="true"` in environment.
3. Users receive the `/maintenance` screen while Super Admins maintain full system access.
