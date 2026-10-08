# Production Post-Deployment Smoke Test Checklist — EduManage Pro

Perform these manual and automated checks immediately after every production release.

---

## 1. Automated Health & Monitoring Checks
- [ ] **GET /api/health**: Verify HTTP 200 OK status and DB latency < 100ms.
- [ ] **Middleware Security Headers**: Verify `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff` in HTTP headers.

---

## 2. Core Functional Modules

### A. Authentication & Session Security
- [ ] **Login**: Sign in as Super Admin (`SUPER_ADMIN`), School Admin (`SCHOOL_ADMIN`), Teacher, Accountant, Parent, Student.
- [ ] **Session Expiration**: Confirm HTTP-only cookie setting and redirect behavior on invalid token.
- [ ] **Logout**: Verify session token invalidation upon logout.

### B. Multi-Tenant Data Isolation
- [ ] **School Scope Isolation**: Access School A dashboard. Verify zero visibility into School B students, teachers, fees, or reports.
- [ ] **Realtime Channel Isolation**: Confirm SSE events emitted for School A are not received by School B connections.

### C. Student & Teacher Management
- [ ] **Create Student**: Enroll new student and verify profile document upload (`school/{schoolId}/students/...`).
- [ ] **Search Students**: Perform search and filter by class/section.

### D. Attendance Tracking
- [ ] **Mark Attendance**: Mark section attendance and verify realtime dashboard updates.

### E. Fee Management & Payment Processing
- [ ] **Fee Invoicing**: Create fee invoice for a student.
- [ ] **Record Payment**: Record partial/full payment and generate PDF fee receipt.

### F. Examinations & Results
- [ ] **Mark Entry**: Record exam marks for a subject and publish results.
- [ ] **Report Cards**: Generate downloadable student report card PDF.

### G. External Communications
- [ ] **Send Notification**: Trigger announcement and verify log entry in `CommunicationLog`.

### H. Backup & System Status
- [ ] **System Status Dashboard**: View `/dashboard/super-admin/system` to verify database health and backup history.
