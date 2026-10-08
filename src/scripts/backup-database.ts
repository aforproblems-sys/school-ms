import { createDatabaseBackup } from '../lib/backup-service';
import { prisma } from '../lib/prisma';

async function main() {
  console.log('📦 Starting Automated Database Backup Process...');
  try {
    const backup = await createDatabaseBackup('MANUAL_CLI');
    console.log('✅ Database Backup Created Successfully:');
    console.log(`   - ID: ${backup.id}`);
    console.log(`   - Filename: ${backup.filename}`);
    console.log(`   - Path: ${backup.filePath}`);
    console.log(`   - Size: ${backup.fileSizeBytes} bytes`);
    console.log(`   - SHA-256 Checksum: ${backup.checksumSha256}`);
    console.log(`   - Status: ${backup.status}`);
    console.log(`   - Record Summary:`, JSON.stringify(backup.recordCounts, null, 2));
  } catch (error) {
    console.error('❌ Database Backup Failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
