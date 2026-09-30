import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { db } from '@ecokuku/db';
import { adminAuthOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const session = await getServerSession(adminAuthOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get('status') || undefined;

  const inquiries = await db.chickInquiry.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  return NextResponse.json({ data: inquiries });
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(adminAuthOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, status } = await request.json() as { id?: string; status?: string };
  if (!id || !status) return NextResponse.json({ error: 'id and status required' }, { status: 400 });

  const valid = ['PENDING', 'CONTACTED', 'COMPLETED', 'CANCELLED'];
  if (!valid.includes(status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });

  const inquiry = await db.chickInquiry.update({ where: { id }, data: { status } });
  return NextResponse.json({ data: inquiry });
}
