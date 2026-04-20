import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import StaffReportsShell from '@/components/StaffReportsShell';

const ReportsPage = async () => {
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  if (role !== 'director') redirect('/');

  const [teachers, admins] = await Promise.all([
    prisma.teacher.findMany({
      orderBy: [{ name: 'asc' }, { surname: 'asc' }],
      select: { id: true, name: true, surname: true, img: true },
    }),
    prisma.admin.findMany({
      orderBy: [{ name: 'asc' }, { surname: 'asc' }],
      select: { id: true, name: true, surname: true, img: true, role: true },
    }),
  ]);

  const staff = [
    ...teachers.map(t => ({ ...t, staffType: 'teacher' as const })),
    ...admins.map(a => ({ ...a, staffType: a.role === 'teacher-admin' ? 'teacher-admin' as const : 'admin' as const })),
  ].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="bg-white p-4 rounded-xl flex-1 m-4 mt-0 h-full">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold">Staff Reports</h1>
      </div>
      <StaffReportsShell staff={staff} />
    </div>
  );
};

export default ReportsPage;
