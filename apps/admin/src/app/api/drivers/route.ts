import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { db } from '@ecokuku/db';
import { adminAuthOptions } from '@/lib/auth';

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const drivers = await db.driver.findMany({ orderBy: { name: 'asc' } });
    return NextResponse.json({ data: drivers });
  } catch (error) {
    console.error('Drivers fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch drivers' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { name, phone, vehicle, plate } = body;
    if (!name || !phone || !vehicle || !plate) {
      return NextResponse.json({ error: 'name, phone, vehicle, and plate are required' }, { status: 400 });
    }

    const driver = await db.driver.create({ data: { name, phone, vehicle, plate, active: true } });
    return NextResponse.json({ driver }, { status: 201 });
  } catch (error: any) {
    console.error('Driver create error:', error);
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'A driver with this phone number already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create driver' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { driverId, active, name, phone, vehicle, plate } = body;
    if (!driverId) return NextResponse.json({ error: 'driverId required' }, { status: 400 });

    const driver = await db.driver.update({
      where: { id: driverId },
      data: {
        ...(name !== undefined && { name }),
        ...(phone !== undefined && { phone }),
        ...(vehicle !== undefined && { vehicle }),
        ...(plate !== undefined && { plate }),
        ...(active !== undefined && { active }),
      },
    });
    return NextResponse.json({ driver });
  } catch (error) {
    console.error('Driver update error:', error);
    return NextResponse.json({ error: 'Failed to update driver' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    if (!body.driverId) return NextResponse.json({ error: 'driverId required' }, { status: 400 });

    await db.driver.delete({ where: { id: body.driverId } });
    return NextResponse.json({ message: 'Driver deleted' });
  } catch (error) {
    console.error('Driver delete error:', error);
    return NextResponse.json({ error: 'Failed to delete driver' }, { status: 500 });
  }
}
