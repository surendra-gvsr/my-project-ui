import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';
import { documentDB, type DocumentMetadata } from '@/lib/store';

const ALLOWED_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'text/plain',
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const CLAIM_ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded ? forwarded.split(',')[0].trim() : 'unknown';
}

export async function POST(request: NextRequest) {
  const { allowed } = rateLimit(`ingest:${getClientIp(request)}`, 20, 60_000);
  if (!allowed) {
    return NextResponse.json(
      { success: false, data: null, error: 'Too many requests' },
      { status: 429 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: 'Invalid request body' },
      { status: 400 }
    );
  }

  const claimId = formData.get('claimId');
  if (typeof claimId !== 'string' || !CLAIM_ID_PATTERN.test(claimId)) {
    return NextResponse.json(
      { success: false, data: null, error: 'Invalid claim ID' },
      { status: 400 }
    );
  }

  const files = formData
    .getAll('files')
    .filter((v): v is File => v instanceof File);
  if (files.length === 0) {
    return NextResponse.json(
      { success: false, data: null, error: 'No files provided' },
      { status: 400 }
    );
  }

  const results: DocumentMetadata[] = [];

  for (const file of files) {
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: `File type not allowed: ${file.name}`,
        },
        { status: 422 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, data: null, error: `File too large: ${file.name}` },
        { status: 422 }
      );
    }

    // Sanitize filename
    const safeName = file.name.replace(/[^\w.\- ]/g, '_');

    // Read text content at ingest time so the process route can pass it to Claude
    const content = file.type === 'text/plain' ? await file.text() : undefined;

    const doc: DocumentMetadata = {
      id: `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      claimId,
      name: safeName,
      type: file.type,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      source: 'upload',
      ...(content !== undefined && { content }),
    };

    documentDB.add(doc);
    results.push(doc);
  }

  return NextResponse.json({ success: true, data: results, error: null });
}

export async function GET(request: NextRequest) {
  const { allowed } = rateLimit(
    `ingest-get:${getClientIp(request)}`,
    60,
    60_000
  );
  if (!allowed) {
    return NextResponse.json(
      { success: false, data: null, error: 'Too many requests' },
      { status: 429 }
    );
  }

  const { searchParams } = new URL(request.url);
  const claimId = searchParams.get('claimId');

  if (typeof claimId !== 'string' || !CLAIM_ID_PATTERN.test(claimId)) {
    return NextResponse.json(
      { success: false, data: null, error: 'Invalid claim ID' },
      { status: 400 }
    );
  }

  const docs = documentDB.getByClaim(claimId);
  return NextResponse.json({ success: true, data: docs, error: null });
}
