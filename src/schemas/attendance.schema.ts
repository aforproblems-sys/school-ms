import { z } from 'zod';
import { AttendanceStatus } from '@prisma/client';

export const attendanceRecordSchema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
  status: z.nativeEnum(AttendanceStatus),
  remarks: z.string().optional(),
});

export const attendanceSheetSchema = z.object({
  sectionId: z.string().min(1, 'Section selection is required'),
  date: z.string().min(1, 'Date is required'),
  subjectId: z.string().optional(),
  records: z.array(attendanceRecordSchema).min(1, 'At least one student record is required'),
});

export type AttendanceSheetValues = z.infer<typeof attendanceSheetSchema>;
