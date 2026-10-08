import fs from 'fs';
import path from 'path';

/**
 * Returns the isolated file storage upload path namespaced by school tenant ID.
 */
export function getSchoolUploadsDir(schoolId: string): string {
  const baseUploads = process.env.STORAGE_UPLOADS_DIR || path.join(process.cwd(), 'public', 'uploads');
  const tenantDir = path.join(baseUploads, 'schools', schoolId);
  if (!fs.existsSync(tenantDir)) {
    fs.mkdirSync(tenantDir, { recursive: true });
  }
  return tenantDir;
}

/**
 * Enforces tenant validation on uploaded file paths.
 * Prevents School A users from accessing file assets stored under School B paths.
 */
export function validateFileTenantAccess(
  filePathOrUrl: string,
  userSchoolId: string,
  isSuperAdmin: boolean = false
): boolean {
  if (isSuperAdmin) return true;
  if (!userSchoolId) return false;

  const expectedPrefix = `/uploads/schools/${userSchoolId}/`;
  const expectedPathSegment = path.join('schools', userSchoolId);

  return (
    filePathOrUrl.includes(expectedPrefix) ||
    filePathOrUrl.includes(expectedPathSegment) ||
    !filePathOrUrl.includes('/schools/') // Legacy un-namespaced files fallback
  );
}
