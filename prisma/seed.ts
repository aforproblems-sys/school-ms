import {
  PrismaClient,
  SystemRole,
  Gender,
  AttendanceStatus,
  FeeStatus,
  PaymentMethod,
  AuditAction,
} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';

const connectionString =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/school_ms?schema=public';
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting database seeding...');

  // Password hash for test accounts (Password123!)
  const defaultPasswordHash = await bcrypt.hash('Password123!', 12);

  // 1. Seed School Profile
  const school = await prisma.school.upsert({
    where: { code: 'GVA-001' },
    update: {},
    create: {
      name: 'Grandview International Academy',
      code: 'GVA-001',
      address: '100 University Avenue, Boston, MA 02115',
      phone: '+1 (555) 019-2834',
      email: 'contact@grandview.edu',
      currency: 'USD',
    },
  });

  // 2. Seed Academic Session
  const session = await prisma.academicSession.create({
    data: {
      schoolId: school.id,
      name: '2025-2026 Academic Year',
      startDate: new Date('2025-09-01'),
      endDate: new Date('2026-06-30'),
      isCurrent: true,
    },
  });

  // 3. Seed Users across all 6 System Roles
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@school.com' },
    update: {},
    create: {
      email: 'superadmin@school.com',
      passwordHash: defaultPasswordHash,
      fullName: 'Eleanor Vance',
      systemRole: SystemRole.SUPER_ADMIN,
      schoolId: school.id,
    },
  });

  const schoolAdmin = await prisma.user.upsert({
    where: { email: 'admin@school.com' },
    update: {},
    create: {
      email: 'admin@school.com',
      passwordHash: defaultPasswordHash,
      fullName: 'Marcus Sterling',
      systemRole: SystemRole.SCHOOL_ADMIN,
      schoolId: school.id,
    },
  });

  const teacherUser = await prisma.user.upsert({
    where: { email: 'teacher@school.com' },
    update: {},
    create: {
      email: 'teacher@school.com',
      passwordHash: defaultPasswordHash,
      fullName: 'Dr. Sarah Jenkins',
      systemRole: SystemRole.TEACHER,
      schoolId: school.id,
      teacherProfile: {
        create: {
          employeeId: 'TCH-2025-001',
          qualification: 'Ph.D. in Applied Mathematics',
          joiningDate: new Date('2020-08-15'),
        },
      },
    },
    include: { teacherProfile: true },
  });

  const accountantUser = await prisma.user.upsert({
    where: { email: 'accountant@school.com' },
    update: {},
    create: {
      email: 'accountant@school.com',
      passwordHash: defaultPasswordHash,
      fullName: 'Mark Vance',
      systemRole: SystemRole.ACCOUNTANT,
      schoolId: school.id,
    },
  });

  // 4. Academic Structure: Class, Section, Subject
  const grade10 = await prisma.class.create({
    data: {
      academicSessionId: session.id,
      name: 'Grade 10',
      numericOrder: 10,
    },
  });

  const sectionA = await prisma.section.create({
    data: {
      classId: grade10.id,
      name: 'Section A',
      capacity: 35,
    },
  });

  const mathSubject = await prisma.subject.create({
    data: {
      classId: grade10.id,
      name: 'Advanced Mathematics',
      code: 'MATH-101',
      type: 'THEORY',
    },
  });

  if (teacherUser.teacherProfile) {
    await prisma.teacherSubject.create({
      data: {
        teacherId: teacherUser.teacherProfile.id,
        subjectId: mathSubject.id,
        sectionId: sectionA.id,
      },
    });
  }

  // Student Account
  const studentUser = await prisma.user.upsert({
    where: { email: 'student@school.com' },
    update: {},
    create: {
      email: 'student@school.com',
      passwordHash: defaultPasswordHash,
      fullName: 'Alexander Davis',
      systemRole: SystemRole.STUDENT,
      schoolId: school.id,
      studentProfile: {
        create: {
          admissionNo: 'ADM-2025-089',
          rollNumber: '10-A-01',
          dateOfBirth: new Date('2009-04-12'),
          gender: Gender.MALE,
          address: '42 Oakridge Lane, Boston, MA',
        },
      },
    },
    include: { studentProfile: true },
  });

  // Parent Account
  const parentUser = await prisma.user.upsert({
    where: { email: 'parent@school.com' },
    update: {},
    create: {
      email: 'parent@school.com',
      passwordHash: defaultPasswordHash,
      fullName: 'Robert Davis',
      systemRole: SystemRole.PARENT,
      schoolId: school.id,
      parentProfile: {
        create: {
          occupation: 'Architect',
        },
      },
    },
    include: { parentProfile: true },
  });

  // Link Student & Parent
  if (studentUser.studentProfile && parentUser.parentProfile) {
    await prisma.studentParent.create({
      data: {
        studentId: studentUser.studentProfile.id,
        parentId: parentUser.parentProfile.id,
        relationship: 'Father',
      },
    });

    // Student Enrollment Record
    await prisma.enrollment.create({
      data: {
        studentId: studentUser.studentProfile.id,
        academicSessionId: session.id,
        classId: grade10.id,
        sectionId: sectionA.id,
        rollNumber: '10-A-01',
      },
    });
  }

  // Attendance Entry
  if (studentUser.studentProfile) {
    const attendanceHeader = await prisma.attendance.create({
      data: {
        sectionId: sectionA.id,
        date: new Date(),
        recordedBy: teacherUser.id,
      },
    });

    await prisma.attendanceRecord.create({
      data: {
        attendanceId: attendanceHeader.id,
        studentId: studentUser.studentProfile.id,
        status: AttendanceStatus.PRESENT,
      },
    });
  }

  // Finance: Fee Structure, Student Fee & Fee Payment
  const feeStructure = await prisma.feeStructure.create({
    data: {
      academicSessionId: session.id,
      classId: grade10.id,
      name: 'Tuition Fee - Term 1',
      amount: 1500.00,
      dueDate: new Date('2025-10-31'),
    },
  });

  if (studentUser.studentProfile) {
    const studentFee = await prisma.studentFee.create({
      data: {
        studentId: studentUser.studentProfile.id,
        feeStructureId: feeStructure.id,
        invoiceNo: 'INV-2025-0001',
        amount: 1500.00,
        paidAmount: 500.00,
        status: FeeStatus.PARTIALLY_PAID,
        dueDate: new Date('2025-10-31'),
      },
    });

    await prisma.feePayment.create({
      data: {
        studentFeeId: studentFee.id,
        transactionRef: 'TXN-9842-2025',
        amount: 500.00,
        paymentMethod: PaymentMethod.ONLINE_GATEWAY,
        receivedBy: accountantUser.id,
      },
    });
  }

  // Notice Announcement
  await prisma.notice.create({
    data: {
      title: 'Welcome to Academic Year 2025-2026',
      content: 'We are thrilled to welcome all students, teachers, and parents to the new academic year.',
      authorId: schoolAdmin.id,
    },
  });

  // Audit Log
  await prisma.auditLog.create({
    data: {
      userId: superAdmin.id,
      action: AuditAction.CREATE,
      entity: 'School',
      entityId: school.id,
    },
  });

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
