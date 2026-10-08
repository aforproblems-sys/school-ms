import { verifyBackup } from '../lib/backup-service';
import { prisma } from '../lib/prisma';

async function main() {
  const backupIdOrFilename = process.argv[2];

  if (!backupIdOrFilename) {
    console.log('🔍 No backup identifier provided. Locating latest backup log record...');
    const latest = await prisma.backupLog.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    if (!latest) {
      console.error('❌ No backup records found in database to verify.');
      process.exit(1);
    }
    console.log(`ℹ️ Verifying latest backup: ${latest.filename}`);
    await runVerification(latest.filename);
  } else {
    await runVerification(backupIdOrFilename);
  }

  await prisma.$disconnect();
}

async function runVerification(target: string) {
  console.log(`🔍 Verifying integrity for backup: ${target}...`);
  const result = await verifyBackup(target);

  if (result.isValid) {
    console.log('✅ Backup Verification PASSED!');
    console.log(`   - File Exists: ${result.fileExists}`);
    console.log(`   - Checksum Match: ${result.checksumMatch}`);
    console.log(`   - SHA-256 Checksum: ${result.calculatedChecksum}`);
    if (result.recordCounts) {
      console.log(`   - Verified Record Counts:`, JSON.stringify(result.recordCounts, null, 2));
    }
  } else {
    console.error('❌ Backup Verification FAILED!');
    console.error(`   - Error: ${result.error}`);
    console.error(`   - Expected Checksum: ${result.expectedChecksum}`);
    console.error(`   - Calculated Checksum: ${result.calculatedChecksum}`);
    process.exit(1);
  }
}

main();
