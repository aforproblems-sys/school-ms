import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { SystemRole } from '@prisma/client';

export const runtime = 'nodejs';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  if (session.role !== SystemRole.SUPER_ADMIN) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });

  const schools = await prisma.school.findMany({
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true, code: true },
    take: 200,
  });

  return NextResponse.json({ success: true, schools });
}
