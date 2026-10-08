'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { getStudentsAction, getClassOptionsAction } from '@/actions/student.actions';
import { StudentFormDialog } from '@/components/students/student-form-dialog';
import { DeleteStudentDialog } from '@/components/students/delete-student-dialog';
import { StatusBadge } from '@/components/shared/status-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { getInitials } from '@/lib/utils';
import {
  Users,
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit2,
  Trash2,
  Filter,
  Loader2,
  GraduationCap,
} from 'lucide-react';

export default function StudentsPage() {
  const [isPending, startTransition] = useTransition();
  const [studentsData, setStudentsData] = useState<any>({
    students: [],
    total: 0,
    page: 1,
    totalPages: 1,
  });

  const [classList, setClassList] = useState<Array<{ id: string; name: string }>>([]);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [page, setPage] = useState(1);

  // Modal States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editStudent, setEditStudent] = useState<any>(null);
  const [deleteStudent, setDeleteStudent] = useState<{ id: string; name: string } | null>(null);

  const fetchStudents = () => {
    startTransition(async () => {
      const res = await getStudentsAction({
        page,
        limit: 10,
        search,
        classId: classFilter || undefined,
        gender: (genderFilter as any) || undefined,
      });
      if (res.success) {
        setStudentsData(res);
      }
    });
  };

  useEffect(() => {
    getClassOptionsAction().then((res) => {
      if (res.success && res.classes) {
        setClassList(res.classes);
      }
    });
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [page, classFilter, genderFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchStudents();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Student Directory
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage student enrollments, guardian records, academic status, and profiles.
          </p>
        </div>

        <button
          onClick={() => {
            setEditStudent(null);
            setIsAddOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Student</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, admission no, email..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </form>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Class Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5 text-indigo-500" />
            <span>Class:</span>
            <select
              value={classFilter}
              onChange={(e) => {
                setClassFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="">All Classes</option>
              {classList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Gender Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span>Gender:</span>
            <select
              value={genderFilter}
              onChange={(e) => {
                setGenderFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="">All Genders</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Student Table / List Container */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        {isPending ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            <p className="text-xs">Querying PostgreSQL database...</p>
          </div>
        ) : studentsData.students.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="No Students Found"
            description="No student records matched your query filters."
            actionLabel="Add First Student"
            onAction={() => setIsAddOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-100 dark:border-slate-800 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="pb-3">Student Name</th>
                  <th className="pb-3">Admission No</th>
                  <th className="pb-3">Class & Stream</th>
                  <th className="pb-3">Guardian</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                {studentsData.students.map((s: any) => {
                  const enrollment = s.enrollments?.[0];
                  const guardian = s.parents?.[0]?.parent?.user;

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 font-semibold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                            {getInitials(s.user.fullName)}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white">{s.user.fullName}</p>
                            <p className="text-[11px] text-slate-400">{s.user.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 font-mono text-[11px] font-medium">{s.admissionNo}</td>

                      <td className="py-3">
                        {enrollment ? `${enrollment.class.name} - ${enrollment.section.name}` : 'Unassigned'}
                      </td>

                      <td className="py-3">
                        {guardian ? (
                          <div>
                            <p className="font-medium text-slate-800 dark:text-slate-200">{guardian.fullName}</p>
                            <p className="text-[10px] text-slate-400">{guardian.phoneNumber || 'N/A'}</p>
                          </div>
                        ) : (
                          <span className="text-slate-400">N/A</span>
                        )}
                      </td>

                      <td className="py-3">
                        <StatusBadge status={s.user.isActive ? 'ACTIVE' : 'INACTIVE'} />
                      </td>

                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Profile */}
                          <Link
                            href={`/dashboard/users/students/${s.id}`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors"
                            title="View Full Profile"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>

                          {/* Edit Student */}
                          <button
                            onClick={() => {
                              setEditStudent(s);
                              setIsAddOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors"
                            title="Edit Student"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Delete Student */}
                          <button
                            onClick={() =>
                              setDeleteStudent({ id: s.id, name: s.user.fullName })
                            }
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                            title="Archive Student"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {studentsData.totalPages > 1 && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>
              Page {studentsData.page} of {studentsData.totalPages} ({studentsData.total} total students)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= studentsData.totalPages}
                onClick={() => setPage(page + 1)}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Form Modal */}
      <StudentFormDialog
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSuccess={fetchStudents}
        initialData={editStudent}
      />

      {/* Delete Confirmation Modal */}
      <DeleteStudentDialog
        isOpen={Boolean(deleteStudent)}
        studentId={deleteStudent?.id || null}
        studentName={deleteStudent?.name || null}
        onClose={() => setDeleteStudent(null)}
        onSuccess={fetchStudents}
      />
    </div>
  );
}
