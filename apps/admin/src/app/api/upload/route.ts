import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { adminAuthOptions } from '@/lib/auth';
import { db } from '@ecokuku/db';

async function getCloudinaryConfig() {
  // 1. Check environment variables first (fastest, no DB round-trip)
  const envCloudName = process.env.CLOUDINARY_CLOUDNAME || process.env.CLOUDINARY_CLOUD_NAME;
  const envApiKey    = process.env.CLOUDINARY_APIKEY    || process.env.CLOUDINARY_API_KEY;
  const envApiSecret = process.env.CLOUDINARY_APISECRET || process.env.CLOUDINARY_API_SECRET;
  if (envCloudName && envApiKey && envApiSecret) {
    return { cloudName: envCloudName, apiKey: envApiKey, apiSecret: envApiSecret };
  }

  // 2. Fall back to DB settings (legacy / admin-UI configured)
  try {
    const rows = await db.setting.findMany({
      where: { key: { in: ['cloudinary_cloud_name', 'cloudinary_api_key', 'cloudinary_api_secret'] } },
    });
    const m = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    if (m.cloudinary_cloud_name && m.cloudinary_api_key && m.cloudinary_api_secret) {
      return { cloudName: m.cloudinary_cloud_name, apiKey: m.cloudinary_api_key, apiSecret: m.cloudinary_api_secret };
    }
  } catch { /* non-fatal */ }
  return null;
}

async function uploadToCloudinary(
  buffer: Buffer,
  filename: string,
  cfg: { cloudName: string; apiKey: string; apiSecret: string },
): Promise<string> {
  const { v2: cloudinary } = await import('cloudinary');
  cloudinary.config({ cloud_name: cfg.cloudName, api_key: cfg.apiKey, api_secret: cfg.apiSecret });
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'ecokuku', public_id: filename.replace(/\.[^.]+$/, ''), resource_type: 'image' },
      (err, result) => {
        if (err || !result) return reject(err ?? new Error('No result'));
        resolve(result.secure_url);
      },
    );
    stream.end(buffer);
  });
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(adminAuthOptions);
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Only JPEG, PNG, WebP, and GIF images are allowed' }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be under 10MB' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const filename = `upload-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const cloudinaryCfg = await getCloudinaryConfig();

    let url: string;
    let storage: string;

    if (cloudinaryCfg) {
      url = await uploadToCloudinary(buffer, filename, cloudinaryCfg);
      storage = 'cloudinary';
    } else {
      const uploadsDir = join(process.cwd(), 'public', 'uploads');
      await mkdir(uploadsDir, { recursive: true });
      await writeFile(join(uploadsDir, filename), buffer);
      url = `/uploads/${filename}`;
      storage = 'local';
    }

    return NextResponse.json({ url, storage }, { status: 201 });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: error?.message || 'Upload failed' }, { status: 500 });
  }
}
