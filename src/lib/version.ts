export interface AppVersionInfo {
  name: string;
  version: string;
  releaseDate: string;
  environment: string;
  buildId: string;
  features: string[];
}

export const APP_VERSION_INFO: AppVersionInfo = {
  name: 'EduManage Pro — Full-Stack School Management System',
  version: '1.0.0-prod',
  releaseDate: '2026-10-08',
  environment: process.env.NODE_ENV || 'development',
  buildId: process.env.BUILD_ID || 'build_20261008_v1',
  features: [
    'Multi-Tenant School Isolation',
    'Role-Based Access Control (RBAC)',
    'Realtime SSE Updates',
    'SaaS Subscription & Plan Governance',
    'Provider-Independent Communications (Email/SMS/WhatsApp)',
    'Automated Disaster Recovery & Database Backups',
    'Production Structured Logging & Health Check Verification',
  ],
};

export function getVersionInfo(): AppVersionInfo {
  return {
    ...APP_VERSION_INFO,
    environment: process.env.NODE_ENV || 'development',
  };
}
