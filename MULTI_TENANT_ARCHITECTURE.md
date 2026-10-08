# 🏢 School Management System - Multi-Tenant SaaS Architecture

## Overview
This document describes the Multi-School Multi-Tenant SaaS Architecture of EduManage Pro. The system allows multiple independent schools to operate on a shared infrastructure while guaranteeing **complete data isolation**, **strict server-side authorization enforcement**, and **configurable subscription plan limits**.

---

## 1. Multi-Tenant Architecture & Data Model

Every school operating on the platform is represented as a unique **Tenant** in PostgreSQL:

### School Tenant Attributes (`School` Model)
| Field | Type | Description |
|---|---|---|
| `id` | `String (cuid)` | Unique primary key ID of the school tenant |
| `name` | `String` | Official school name |
| `code` | `String` | Unique alphanumeric school identifier (e.g. `OAKRIDGE-01`) |
| `status` | `SchoolStatus` | Operational status: `TRIAL`, `ACTIVE`, `SUSPENDED`, `CANCELLED` |
| `subscriptionPlan` | `SubscriptionPlan` | Tier: `FREE`, `BASIC`, `PROFESSIONAL`, `ENTERPRISE` |
| `maxStudents` | `Int` | Configurable capacity limit for enrolled students |
| `maxTeachers` | `Int` | Configurable capacity limit for teachers |
| `maxAdmins` | `Int` | Configurable capacity limit for school administrators |
| `maxStorageMb` | `Int` | Storage quota limit in Megabytes |

### Tenant Foreign Key Relations
All school-owned records contain a direct or inherited `schoolId` relation with database indexes:
- `User.schoolId` -> `School.id`
- `AcademicSession.schoolId` -> `School.id`
- `NotificationSetting.schoolId` -> `School.id`
- `CommunicationLog.schoolId` -> `School.id`
- `StudentProfile.userId` -> `User.schoolId`
- `TeacherProfile.userId` -> `User.schoolId`
- `ParentProfile.userId` -> `User.schoolId`

---

## 2. Server-Side Data Isolation & Authorization

> [!CAUTION]
> **MULTI-TENANT SAFEGUARD**: Frontend-only filtering is NEVER trusted. Every server-side action, API route, and database query MUST enforce the user's `session.schoolId` context.

### Server Validation Helper (`src/lib/school-context.ts`)
```ts
const { schoolId } = await validateSchoolAccess(session, targetSchoolId);
```
- **Platform Super Admin**: Granted cross-tenant access to inspect platform statistics or switch tenant views.
- **School Admin / Teacher / Student / Parent**: Restricted strictly to `session.schoolId`. If a user attempts to tamper with request parameters or URL IDs belonging to another school, the request is rejected with `Cross-Tenant Access Denied`.

---

## 3. School Operational Status Rules

| Status | Application Behavior |
|---|---|
| `ACTIVE` | Normal full access to all authorized school modules. |
| `TRIAL` | Normal full access until `trialEndsAt` timestamp. |
| `SUSPENDED` | Operations disabled; server actions return `Access Restricted: School account is SUSPENDED`. Database records remain 100% preserved. |
| `CANCELLED` | Access blocked. Data preserved according to retention policy. |

---

## 4. Subscription Plan Tiers & Resource Limits

Subscription tiers are configured centrally in [subscription-plans.ts](file:///Users/macbookpro/School%20MS/src/lib/subscription-plans.ts):

| Plan | Max Students | Max Teachers | Max Admins | Storage Quota | WhatsApp / SMS |
|---|---|---|---|---|---|
| **FREE** | 50 | 5 | 2 | 500 MB | Disabled |
| **BASIC** | 300 | 30 | 5 | 5,000 MB | WhatsApp Enabled |
| **PROFESSIONAL** | 1,500 | 100 | 15 | 25,000 MB | WhatsApp + SMS |
| **ENTERPRISE** | 10,000 | 500 | 50 | 100,000 MB | Full All Channels |

### Limit Check Helper
Before enrolling new students or creating teacher accounts:
```ts
const check = await checkSubscriptionLimit(schoolId, 'STUDENTS');
if (!check.allowed) {
  throw new Error(check.error);
}
```

---

## 5. File Storage Tenant Isolation

- File storage paths are namespaced per tenant: `./public/uploads/schools/<schoolId>/...`.
- [file-isolation.ts](file:///Users/macbookpro/School%20MS/src/lib/file-isolation.ts) validates that users can only download/view files matching their assigned `schoolId`.

---

## 6. Realtime Broadcast Tenant Isolation

- Realtime SSE events published via [realtime.ts](file:///Users/macbookpro/School%20MS/src/lib/realtime.ts) contain the publishing `schoolId`.
- Subscribers filter events using `isEventAuthorizedForSchool(event, subscriberSchoolId)`.
- School A users will **never** receive SSE messages published for School B.

---

## 7. Migration Strategy for Existing Data

To migrate legacy single-school environments without data loss:
```bash
npx tsx src/scripts/migrate-to-multitenant.ts
```
1. Creates `Default Primary School` (`default-primary-school`) if not present.
2. Backfills any unassigned legacy records to `default-primary-school`.
3. Verifies 0 orphaned records remain.

---

## 8. Automated Multi-Tenant Isolation Testing

Run the integration suite to verify isolation between two independent test schools (School Alpha vs School Beta):
```bash
npx tsx src/scripts/test-phase23-multitenant-isolation.ts
```
