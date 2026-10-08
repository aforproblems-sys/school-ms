'use server';

import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';
import {
  feeStructureSchema,
  FeeStructureFormValues,
  assignFeeSchema,
  AssignFeeFormValues,
  collectPaymentSchema,
  CollectPaymentFormValues,
} from '@/schemas/fee.schema';
import { FeeStatus, PaymentMethod, AuditAction } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { broadcastAttendanceUpdate } from '@/lib/realtime';

export interface FeeInvoiceFilterParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  classId?: string;
  startDate?: string;
  endDate?: string;
}

// ==========================================
// 1. FEE STRUCTURE MANAGEMENT
// ==========================================

export async function getFeeStructuresAction() {
  await requirePermission('fees.read');
  const structures = await prisma.feeStructure.findMany({
    where: { deletedAt: null },
    include: {
      class: { select: { id: true, name: true } },
      session: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return { success: true, structures };
}

export async function createFeeStructureAction(values: FeeStructureFormValues) {
  const session = await requirePermission('fees.create');
  const validation = feeStructureSchema.safeParse(values);

  if (!validation.success) {
    return {
      success: false,
      error: 'Validation failed',
      fieldErrors: validation.error.flatten().fieldErrors,
    };
  }

  const { name, classId, amount, dueDate, academicSessionId } = validation.data;

  try {
    let activeSessionId = academicSessionId;
    if (!activeSessionId) {
      const currentSession = await prisma.academicSession.findFirst({
        where: { isCurrent: true, deletedAt: null },
      });
      if (!currentSession) {
        return { success: false, error: 'No active academic session found' };
      }
      activeSessionId = currentSession.id;
    }

    const structure = await prisma.feeStructure.create({
      data: {
        name,
        classId,
        academicSessionId: activeSessionId,
        amount,
        dueDate: new Date(dueDate),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: AuditAction.CREATE,
        entity: 'FeeStructure',
        entityId: structure.id,
        newValue: { name, classId, amount },
      },
    });

    revalidatePath('/dashboard/finance/fees');
    return { success: true, structure };
  } catch (error) {
    console.error('Create fee structure error:', error);
    return { success: false, error: 'Failed to create fee structure' };
  }
}

// ==========================================
// 2. FEE ASSIGNMENT & INVOICING
// ==========================================

export async function assignFeeStructureAction(values: AssignFeeFormValues) {
  const session = await requirePermission('fees.create');
  const validation = assignFeeSchema.safeParse(values);

  if (!validation.success) {
    return {
      success: false,
      error: 'Validation failed',
      fieldErrors: validation.error.flatten().fieldErrors,
    };
  }

  const {
    feeStructureId,
    assignmentType,
    classId,
    studentId,
    discountAmount,
    lateFeeAmount,
    dueDate,
  } = validation.data;

  try {
    const feeStructure = await prisma.feeStructure.findUnique({
      where: { id: feeStructureId },
    });

    if (!feeStructure) {
      return { success: false, error: 'Fee structure not found' };
    }

    let targetStudentIds: string[] = [];

    if (assignmentType === 'STUDENT') {
      if (!studentId) {
        return { success: false, error: 'Student selection is required' };
      }
      targetStudentIds = [studentId];
    } else {
      if (!classId) {
        return { success: false, error: 'Class grade selection is required' };
      }
      const enrollments = await prisma.enrollment.findMany({
        where: { classId, deletedAt: null },
        select: { studentId: true },
      });
      targetStudentIds = enrollments.map((e) => e.studentId);
    }

    if (targetStudentIds.length === 0) {
      return { success: false, error: 'No enrolled students found for fee assignment' };
    }

    const baseAmount = Number(feeStructure.amount);
    const netInvoiceAmount = Math.max(0, baseAmount - discountAmount + lateFeeAmount);

    const createdInvoices = await prisma.$transaction(async (tx) => {
      const invoices = [];
      const timestampStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');

      for (let i = 0; i < targetStudentIds.length; i++) {
        const sId = targetStudentIds[i];
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const invoiceNo = `INV-${timestampStr}-${randomSuffix}`;

        const inv = await tx.studentFee.create({
          data: {
            studentId: sId,
            feeStructureId,
            invoiceNo,
            amount: netInvoiceAmount,
            discountAmount,
            lateFeeAmount,
            paidAmount: 0,
            status: FeeStatus.UNPAID,
            dueDate: new Date(dueDate),
          },
        });
        invoices.push(inv);
      }

      await tx.auditLog.create({
        data: {
          userId: session.userId,
          action: AuditAction.CREATE,
          entity: 'StudentFeeAssignment',
          newValue: { count: invoices.length, feeStructureId, discountAmount, lateFeeAmount },
        },
      });

      return invoices;
    });

    revalidatePath('/dashboard/finance/fees');
    return { success: true, count: createdInvoices.length };
  } catch (error) {
    console.error('Assign fee error:', error);
    return { success: false, error: 'Failed to assign fee invoices' };
  }
}

// ==========================================
// 3. STUDENT FEE INVOICES LIST & FINANCIAL SUMMARY
// ==========================================

export async function getStudentFeeInvoicesAction(params: FeeInvoiceFilterParams = {}) {
  await requirePermission('fees.read');
  const page = Math.max(1, params.page || 1);
  const limit = Math.max(1, Math.min(100, params.limit || 10));
  const skip = (page - 1) * limit;

  const whereClause: any = {
    deletedAt: null,
  };

  if (params.search && params.search.trim() !== '') {
    const term = params.search.trim();
    whereClause.OR = [
      { invoiceNo: { contains: term, mode: 'insensitive' } },
      { student: { admissionNo: { contains: term, mode: 'insensitive' } } },
      { student: { user: { fullName: { contains: term, mode: 'insensitive' } } } },
    ];
  }

  if (params.status && params.status !== 'ALL') {
    whereClause.status = params.status as FeeStatus;
  }

  if (params.classId) {
    whereClause.feeStructure = { classId: params.classId };
  }

  if (params.startDate || params.endDate) {
    whereClause.createdAt = {};
    if (params.startDate) whereClause.createdAt.gte = new Date(params.startDate);
    if (params.endDate) whereClause.createdAt.lte = new Date(params.endDate);
  }

  const [total, invoices, aggregateStats] = await Promise.all([
    prisma.studentFee.count({ where: whereClause }),
    prisma.studentFee.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        student: {
          include: {
            user: { select: { fullName: true, email: true, phoneNumber: true } },
            enrollments: {
              take: 1,
              orderBy: { createdAt: 'desc' },
              include: {
                class: { select: { name: true } },
                section: { select: { name: true } },
              },
            },
          },
        },
        feeStructure: { select: { name: true, amount: true } },
        payments: {
          orderBy: { paymentDate: 'desc' },
        },
      },
    }),

    // Financial Metrics computed strictly on server
    prisma.studentFee.aggregate({
      where: { deletedAt: null },
      _sum: {
        amount: true,
        paidAmount: true,
      },
      _count: {
        id: true,
      },
    }),
  ]);

  const totalInvoiced = Number(aggregateStats._sum.amount || 0);
  const totalCollected = Number(aggregateStats._sum.paidAmount || 0);
  const totalPending = Math.max(0, totalInvoiced - totalCollected);
  const collectionRate = totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 100;

  return {
    success: true,
    invoices: invoices.map((inv) => ({
      id: inv.id,
      invoiceNo: inv.invoiceNo,
      feeName: inv.feeStructure.name,
      studentName: inv.student.user.fullName,
      admissionNo: inv.student.admissionNo,
      className: inv.student.enrollments[0]?.class.name || 'N/A',
      sectionName: inv.student.enrollments[0]?.section.name || 'N/A',
      amount: Number(inv.amount),
      discountAmount: Number(inv.discountAmount),
      lateFeeAmount: Number(inv.lateFeeAmount),
      paidAmount: Number(inv.paidAmount),
      remainingBalance: Math.max(0, Number(inv.amount) - Number(inv.paidAmount)),
      status: inv.status,
      dueDate: inv.dueDate,
      createdAt: inv.createdAt,
      paymentsCount: inv.payments.length,
      latestPaymentRef: inv.payments[0]?.transactionRef || null,
      latestPaymentId: inv.payments[0]?.id || null,
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    summary: {
      totalInvoiced,
      totalCollected,
      totalPending,
      collectionRate,
    },
  };
}

// ==========================================
// 4. ATOMIC PAYMENT COLLECTION & RECEIPT GENERATION
// ==========================================

export async function collectFeePaymentAction(values: CollectPaymentFormValues) {
  const session = await requirePermission('fees.create');
  const validation = collectPaymentSchema.safeParse(values);

  if (!validation.success) {
    return {
      success: false,
      error: 'Validation failed',
      fieldErrors: validation.error.flatten().fieldErrors,
    };
  }

  const { studentFeeId, amount, paymentMethod, referenceNo } = validation.data;

  try {
    const paymentResult = await prisma.$transaction(async (tx) => {
      // 1. Fetch Student Fee invoice with lock check
      const studentFee = await tx.studentFee.findUnique({
        where: { id: studentFeeId },
        include: {
          student: {
            include: {
              user: { select: { id: true, fullName: true, email: true } },
              parents: { include: { parent: { select: { userId: true } } } },
            },
          },
          feeStructure: { select: { name: true } },
        },
      });

      if (!studentFee || studentFee.deletedAt) {
        throw new Error('Student fee invoice not found');
      }

      // 2. Server-Side Calculations (NEVER trust frontend totals!)
      const currentPaid = Number(studentFee.paidAmount);
      const totalAmount = Number(studentFee.amount);
      const remainingBalance = Math.max(0, totalAmount - currentPaid);

      if (remainingBalance <= 0 || studentFee.status === FeeStatus.PAID) {
        throw new Error('Invoice is already fully paid');
      }

      if (amount > remainingBalance) {
        throw new Error(
          `Payment amount ($${amount.toFixed(2)}) exceeds remaining invoice balance ($${remainingBalance.toFixed(2)})`
        );
      }

      // 3. Prevent duplicate payment submission
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randomRef = Math.floor(100000 + Math.random() * 900000);
      const receiptNo = `REC-${dateStr}-${randomRef}`;

      // Check if duplicate transaction reference provided
      if (referenceNo && referenceNo.trim() !== '') {
        const existingRef = await tx.feePayment.findFirst({
          where: { transactionRef: referenceNo.trim() },
        });
        if (existingRef) {
          throw new Error('Transaction reference number already exists');
        }
      }

      const transactionRef = referenceNo && referenceNo.trim() !== '' ? referenceNo.trim() : receiptNo;

      // 4. Create Fee Payment Record
      const payment = await tx.feePayment.create({
        data: {
          studentFeeId,
          transactionRef,
          amount,
          paymentMethod,
          receivedBy: session.userId,
          paymentDate: new Date(),
        },
      });

      // 5. Update Invoice status & paid amount
      const newPaidAmount = currentPaid + amount;
      const newStatus =
        newPaidAmount >= totalAmount - 0.01 ? FeeStatus.PAID : FeeStatus.PARTIALLY_PAID;

      await tx.studentFee.update({
        where: { id: studentFeeId },
        data: {
          paidAmount: newPaidAmount,
          status: newStatus,
        },
      });

      // 6. Create Notifications for Student & Parents
      const notifs = [
        {
          userId: studentFee.student.user.id,
          title: 'Fee Payment Received',
          message: `Payment of $${amount.toFixed(2)} received for ${studentFee.feeStructure.name}. Receipt: ${transactionRef}`,
          linkUrl: '/dashboard/finance/fees',
        },
      ];

      studentFee.student.parents.forEach((p: any) => {
        notifs.push({
          userId: p.parent.userId,
          title: 'Child Fee Payment Confirmed',
          message: `Fee payment of $${amount.toFixed(2)} recorded for ${studentFee.student.user.fullName}. Receipt: ${transactionRef}`,
          linkUrl: '/dashboard/finance/fees',
        });
      });

      await tx.notification.createMany({ data: notifs });

      // 7. Audit Log Entry
      await tx.auditLog.create({
        data: {
          userId: session.userId,
          action: AuditAction.PAYMENT_PROCESSED,
          entity: 'FeePayment',
          entityId: payment.id,
          newValue: { receiptNo: transactionRef, amount, paymentMethod, studentFeeId },
        },
      });

      return {
        paymentId: payment.id,
        transactionRef,
        amount,
        paidDate: payment.paymentDate,
        studentName: studentFee.student.user.fullName,
        invoiceNo: studentFee.invoiceNo,
        remainingBalance: Math.max(0, totalAmount - newPaidAmount),
      };
    });

    // 8. Real-time update broadcast & revalidation
    broadcastAttendanceUpdate('FINANCE', 'REVENUE_UPDATE', {
      type: 'PAYMENT_RECEIVED',
      receiptNo: paymentResult.transactionRef,
      amount: paymentResult.amount,
      updatedBy: session.fullName,
    });

    revalidatePath('/dashboard/finance/fees');
    revalidatePath('/dashboard/school-admin');
    revalidatePath('/dashboard/accountant');
    revalidatePath('/dashboard');

    return { success: true, receipt: paymentResult };
  } catch (error: any) {
    console.error('Collect fee payment transaction error:', error);
    return {
      success: false,
      error: error.message || 'Database transaction failed during fee payment',
    };
  }
}

// ==========================================
// 5. PAYMENT HISTORY & PRINTABLE RECEIPT
// ==========================================

export async function getPaymentHistoryAction(params: { search?: string; limit?: number } = {}) {
  await requirePermission('fees.read');
  const limit = Math.max(1, Math.min(100, params.limit || 20));

  const whereClause: any = {};

  if (params.search && params.search.trim() !== '') {
    const term = params.search.trim();
    whereClause.OR = [
      { transactionRef: { contains: term, mode: 'insensitive' } },
      { studentFee: { invoiceNo: { contains: term, mode: 'insensitive' } } },
      { studentFee: { student: { admissionNo: { contains: term, mode: 'insensitive' } } } },
      { studentFee: { student: { user: { fullName: { contains: term, mode: 'insensitive' } } } } },
    ];
  }

  const payments = await prisma.feePayment.findMany({
    where: whereClause,
    take: limit,
    orderBy: { paymentDate: 'desc' },
    include: {
      studentFee: {
        include: {
          feeStructure: { select: { name: true } },
          student: {
            include: {
              user: { select: { fullName: true, email: true } },
              enrollments: {
                take: 1,
                orderBy: { createdAt: 'desc' },
                include: { class: { select: { name: true } } },
              },
            },
          },
        },
      },
    },
  });

  return {
    success: true,
    payments: payments.map((p) => ({
      id: p.id,
      receiptNo: p.transactionRef,
      amount: Number(p.amount),
      paymentMethod: p.paymentMethod,
      paymentDate: p.paymentDate,
      feeName: p.studentFee.feeStructure.name,
      invoiceNo: p.studentFee.invoiceNo,
      studentName: p.studentFee.student.user.fullName,
      admissionNo: p.studentFee.student.admissionNo,
      className: p.studentFee.student.enrollments[0]?.class.name || 'N/A',
      receivedBy: p.receivedBy,
    })),
  };
}

export async function getFeeReceiptByIdAction(paymentId: string) {
  await requirePermission('fees.read');

  const payment = await prisma.feePayment.findUnique({
    where: { id: paymentId },
    include: {
      studentFee: {
        include: {
          feeStructure: { select: { name: true } },
          student: {
            include: {
              user: { select: { fullName: true, email: true, phoneNumber: true } },
              enrollments: {
                take: 1,
                orderBy: { createdAt: 'desc' },
                include: {
                  class: { select: { name: true } },
                  section: { select: { name: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!payment) {
    return { success: false, error: 'Payment receipt not found' };
  }

  const staffUser = await prisma.user.findUnique({
    where: { id: payment.receivedBy },
    select: { fullName: true },
  });

  const totalInvoiced = Number(payment.studentFee.amount);
  const paidSoFar = Number(payment.studentFee.paidAmount);
  const remaining = Math.max(0, totalInvoiced - paidSoFar);

  return {
    success: true,
    receipt: {
      id: payment.id,
      receiptNo: payment.transactionRef,
      paymentDate: payment.paymentDate,
      paymentMethod: payment.paymentMethod,
      amountPaid: Number(payment.amount),
      invoiceNo: payment.studentFee.invoiceNo,
      feeName: payment.studentFee.feeStructure.name,
      baseAmount: Number(payment.studentFee.amount),
      discountAmount: Number(payment.studentFee.discountAmount),
      lateFeeAmount: Number(payment.studentFee.lateFeeAmount),
      totalInvoiced,
      paidSoFar,
      remainingBalance: remaining,
      status: payment.studentFee.status,
      student: {
        fullName: payment.studentFee.student.user.fullName,
        admissionNo: payment.studentFee.student.admissionNo,
        rollNumber: payment.studentFee.student.rollNumber || 'N/A',
        className: payment.studentFee.student.enrollments[0]?.class.name || 'N/A',
        sectionName: payment.studentFee.student.enrollments[0]?.section.name || 'N/A',
      },
      receivedBy: staffUser?.fullName || 'School Staff',
    },
  };
}
