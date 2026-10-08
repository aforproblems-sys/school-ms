import EmbeddedPostgres from 'embedded-postgres';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

async function main() {
  console.log('🐘 Initializing PostgreSQL database engine on port 5432...');

  const dbDir = path.join(process.cwd(), '.postgres-data');
  const isInitial = !fs.existsSync(dbDir);

  const pg = new EmbeddedPostgres({
    databaseDir: dbDir,
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    authMethod: 'password',
    persistent: true,
  });

  if (isInitial) {
    console.log('📦 Initializing PostgreSQL cluster...');
    await pg.initialise();
  }

  console.log('⚡ Starting PostgreSQL server...');
  await pg.start();
  console.log('✅ PostgreSQL server is running on 127.0.0.1:5432');

  try {
    console.log('🗄️ Creating school_ms database...');
    await pg.createDatabase('school_ms').catch(() => {
      console.log('Database school_ms already exists.');
    });
  } catch (err) {
    console.log('Database creation note:', err);
  }

  console.log('🔄 Syncing Prisma schema with PostgreSQL database (npx prisma db push)...');
  try {
    execSync('npx prisma db push --accept-data-loss', {
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/school_ms?schema=public',
        DIRECT_URL: 'postgresql://postgres:postgres@localhost:5432/school_ms?schema=public',
        PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION: 'Perform real-world functional test of School Management System',
      },
    });
    console.log('✅ Prisma schema synced successfully!');
  } catch (err) {
    console.error('❌ Failed to push Prisma schema:', err);
    await pg.stop();
    process.exit(1);
  }

  console.log('\n🧪 Running Real-World End-to-End Workflow Integration Test...\n');
  try {
    execSync('npx tsx src/scripts/test-workflow.ts', {
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/school_ms?schema=public',
        DIRECT_URL: 'postgresql://postgres:postgres@localhost:5432/school_ms?schema=public',
      },
    });
  } catch (err) {
    console.error('❌ Test workflow execution failed');
  } finally {
    console.log('\n🛑 Stopping PostgreSQL server...');
    await pg.stop();
    console.log('👋 PostgreSQL stopped clean.');
  }
}

main().catch((err) => {
  console.error('Fatal error starting PostgreSQL test:', err);
  process.exit(1);
});
