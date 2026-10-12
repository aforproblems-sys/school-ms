import { z } from 'zod';
import { Gender } from '@prisma/client';

export const studentFormSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),

  // ✅ credentials (create time pe UI required karegi, edit time pe optional)
  studentPassword: z.string().min(6, 'Student password must be at least 6 characters').optional().or(z.literal('')),

  phoneNumber: z.string().optional(),
  admissionNo: z.string().min(3, 'Admission number is required'),
  rollNumber: z.string().optional(),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  gender: z.nativeEnum(Gender, { message: 'Gender selection is required' }),
  bloodGroup: z.string().optional(),
  address: z.string().min(5, 'Address must be at least 5 characters'),

  classId: z.string().min(1, 'Please select a class'),
  sectionId: z.string().min(1, 'Please select a section'),

  guardianName: z.string().min(2, 'Guardian name is required'),
  guardianEmail: z.string().email('Invalid guardian email').optional().or(z.literal('')),
  guardianPassword: z.string().min(6, 'Guardian password must be at least 6 characters').optional().or(z.literal('')),
  guardianPhone: z.string().min(5, 'Emergency contact phone is required'),
  relationship: z.string().min(2, 'Relationship (e.g. Father, Mother) is required'),
  guardianOccupation: z.string().optional(),

  avatarUrl: z.string().optional(),
});

export type StudentFormValues = z.infer<typeof studentFormSchema>;
