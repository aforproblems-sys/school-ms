import { z } from 'zod';

export const createExamSchema = z.object({
  name: z.string().min(2, 'Exam name must be at least 2 characters'),
  academicSessionId: z.string().optional(),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
});

export type CreateExamFormValues = z.infer<typeof createExamSchema>;

export const assignExamSubjectSchema = z.object({
  examId: z.string().min(1, 'Exam selection is required'),
  subjectId: z.string().min(1, 'Subject selection is required'),
  examDate: z.string().min(1, 'Exam date is required'),
  maxMarks: z.coerce.number().gt(0, 'Max marks must be greater than 0').default(100),
  passingMarks: z.coerce.number().gte(0, 'Passing marks cannot be negative').default(40),
});

export type AssignExamSubjectFormValues = z.infer<typeof assignExamSubjectSchema>;

export const singleStudentMarkSchema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
  marksObtained: z.coerce.number().gte(0, 'Marks cannot be negative'),
  remarks: z.string().optional(),
});

export const saveMarksSheetSchema = z.object({
  examSubjectId: z.string().min(1, 'Exam subject selection is required'),
  records: z.array(singleStudentMarkSchema).min(1, 'At least one student record required'),
});

export type SaveMarksSheetFormValues = z.infer<typeof saveMarksSheetSchema>;
