import { z } from 'zod';
import { PaymentMethod } from '@prisma/client';

export const feeStructureSchema = z.object({
  name: z.string().min(2, 'Fee structure name must be at least 2 characters'),
  classId: z.string().min(1, 'Class grade selection is required'),
  academicSessionId: z.string().optional(),
  amount: z.coerce.number().gt(0, 'Fee amount must be greater than 0'),
  dueDate: z.string().min(1, 'Due date is required'),
});

export type FeeStructureFormValues = z.infer<typeof feeStructureSchema>;

export const assignFeeSchema = z.object({
  feeStructureId: z.string().min(1, 'Fee structure is required'),
  assignmentType: z.enum(['CLASS', 'STUDENT']),
  classId: z.string().optional(),
  studentId: z.string().optional(),
  discountAmount: z.coerce.number().min(0, 'Discount cannot be negative').default(0),
  lateFeeAmount: z.coerce.number().min(0, 'Late fee cannot be negative').default(0),
  dueDate: z.string().min(1, 'Due date is required'),
});

export type AssignFeeFormValues = z.infer<typeof assignFeeSchema>;

export const collectPaymentSchema = z.object({
  studentFeeId: z.string().min(1, 'Invoice is required'),
  amount: z.coerce.number().gt(0, 'Payment amount must be greater than 0'),
  paymentMethod: z.nativeEnum(PaymentMethod),
  referenceNo: z.string().optional(),
  remarks: z.string().optional(),
});

export type CollectPaymentFormValues = z.infer<typeof collectPaymentSchema>;
