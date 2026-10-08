import EmbeddedPostgres from 'embedded-postgres';
import { prisma } from '../lib/prisma';
import { hashPassword } from '../lib/auth';
import { SystemRole, SchoolStatus, SubscriptionPlan, SubjectType } from '@prisma/client';
import fs from 'fs';
import path from 'path';

process.on('uncaughtException', (err: unknown) => {
  const errorObj = err as { code?: string; message?: string };
  if (errorObj?.code === '57P01' || errorObj?.message?.includes('terminating connection')) {
    return;
  }
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

export async function setupFirstSchool() {
  console.log('🚀 Initializing First Production School & Academic Structure...\n');

  const schoolName = process.env.FIRST_SCHOOL_NAME || 'EduManage International School';
  const schoolCode = process.env.FIRST_SCHOOL_CODE || 'EMIS-PROD-001';
  const schoolEmail = process.env.FIRST_SCHOOL_EMAIL || 'info@edumanage.com';
  const adminEmail = process.env.FIRST_SCHOOL_ADMIN_EMAIL || 'principal@edumanage.com';
  const adminPassword = process.env.FIRST_SCHOOL_ADMIN_PASSWORD || 'SchoolAdmin2026!';
  const adminName = process.env.FIRST_SCHOOL_ADMIN_NAME || 'Principal Dr. Arthur Pendelton';

  // 1. Create First School
  const school = await prisma.school.upsert({
    where: { code: schoolCode },
    create: {
      name: schoolName,
      code: schoolCode,
      address: '100 Education Way, Knowledge City',
      phone: '+18005550199',
      email: schoolEmail,
      currency: 'USD',
      status: SchoolStatus.ACTIVE,
      subscriptionPlan: SubscriptionPlan.PROFESSIONAL,
      maxStudents: 1500,
      maxTeachers: 100,
      maxAdmins: 10,
    },
    update: {
      name: schoolName,
      email: schoolEmail,
      status: SchoolStatus.ACTIVE,
    },
  });
  console.log(`✅ Step 1: First School Tenant Created -> ${school.name} [${school.code}]`);

  // 2. Create Current Academic Session
  const academicSession = await prisma.academicSession.upsert({
    where: { id: `session_${school.id}_2026` },
    create: {
      id: `session_${school.id}_2026`,
      schoolId: school.id,
      name: '2026-2027 Academic Session',
      startDate: new Date('2026-08-01'),
      endDate: new Date('2027-06-30'),
      isCurrent: true,
    },
    update: { isCurrent: true },
  });
  console.log(`✅ Step 2: Academic Session Initialized -> ${academicSession.name}`);

  // 3. Create Default Classes & Sections
  const defaultClasses = [
    { name: 'Grade 9', numericOrder: 9 },
    { name: 'Grade 10', numericOrder: 10 },
    { name: 'Grade 11', numericOrder: 11 },
    { name: 'Grade 12', numericOrder: 12 },
  ];

  for (const c of defaultClasses) {
    const classObj = await prisma.class.upsert({
      where: { id: `class_${school.id}_g${c.numericOrder}` },
      create: {
        id: `class_${school.id}_g${c.numericOrder}`,
        academicSessionId: academicSession.id,
        name: c.name,
        numericOrder: c.numericOrder,
      },
      update: {},
    });

    // Create Sections A & B
    await prisma.section.upsert({
      where: { id: `section_${classObj.id}_sec_a` },
      create: {
        id: `section_${classObj.id}_sec_a`,
        classId: classObj.id,
        name: 'Section A',
        capacity: 40,
      },
      update: {},
    });

    // Create Subjects for Grade 10
    if (c.numericOrder === 10) {
      const subjects = [
        { name: 'Mathematics', code: 'MATH101', type: SubjectType.THEORY },
        { name: 'English Literature', code: 'ENG101', type: SubjectType.THEORY },
        { name: 'Physics', code: 'PHY101', type: SubjectType.PRACTICAL },
        { name: 'Computer Science', code: 'CS101', type: SubjectType.PRACTICAL },
      ];

      for (const sub of subjects) {
        await prisma.subject.upsert({
          where: {
            classId_code: {
              classId: classObj.id,
              code: sub.code,
            },
          },
          create: {
            classId: classObj.id,
            name: sub.name,
            code: sub.code,
            type: sub.type,
          },
          update: {},
        });
      }
    }
  }
  console.log(`✅ Step 3: Default Classes (Grades 9-12), Sections & Subjects Created.`);

  // 4. Create First School Admin User
  const passwordHash = await hashPassword(adminPassword);
  const schoolAdminUser = await prisma.user.upsert({
    where: { email: adminEmail.toLowerCase() },
    create: {
      email: adminEmail.toLowerCase(),
      passwordHash,
      fullName: adminName,
      systemRole: SystemRole.SCHOOL_ADMIN,
      schoolId: school.id,
      isActive: true,
    },
    update: {
      passwordHash,
      fullName: adminName,
      systemRole: SystemRole.SCHOOL_ADMIN,
      schoolId: school.id,
      isActive: true,
    },
  });
  console.log(`✅ Step 4: First School Administrator Provisioned -> ${schoolAdminUser.fullName} (${schoolAdminUser.email})`);

  console.log('\n🎉 First Production School Initialized Successfully!');
  console.log(`   - School ID   : ${school.id}`);
  console.log(`   - Admin Email : ${schoolAdminUser.email}`);
  console.log(`   - Admin Role  : ${schoolAdminUser.systemRole}`);

  return { school, schoolAdminUser, academicSession };
}

async function runStandaloneSetup() {
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
    await pg.initialise();
  }

  await pg.start();
  try {
    await setupFirstSchool();
  } catch (err) {
    console.error('❌ Setup First School Failed:', err);
    process.exit(1);
  } finally {
    try { await prisma.$disconnect(); } catch {}
    try { await pg.stop(); } catch {}
  }
}

if (require.main === module) {
  runStandaloneSetup();
}
