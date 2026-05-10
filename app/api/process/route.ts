import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';
import { documentDB, processingDB, type ProcessingResult } from '@/lib/store';
import { extractDocumentData } from '@/lib/gemini';

const CLAIM_ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;
const DOC_ID_PATTERN = /^[a-zA-Z0-9_-]{1,80}$/;

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded ? forwarded.split(',')[0].trim() : 'unknown';
}

export async function POST(request: NextRequest) {
  const { allowed } = rateLimit(`process:${getClientIp(request)}`, 10, 60_000);
  if (!allowed) {
    return NextResponse.json(
      { success: false, data: null, error: 'Too many requests' },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json(
      { success: false, data: null, error: 'Invalid request body' },
      { status: 400 }
    );
  }

  const { claimId, documentId } = body as Record<string, unknown>;

  if (typeof claimId !== 'string' || !CLAIM_ID_PATTERN.test(claimId)) {
    return NextResponse.json(
      { success: false, data: null, error: 'Invalid claim ID' },
      { status: 400 }
    );
  }

  if (typeof documentId !== 'string' || !DOC_ID_PATTERN.test(documentId)) {
    return NextResponse.json(
      { success: false, data: null, error: 'Invalid document ID' },
      { status: 400 }
    );
  }

  const doc = documentDB.findById(claimId, documentId);
  if (!doc) {
    return NextResponse.json(
      { success: false, data: null, error: 'Document not found' },
      { status: 404 }
    );
  }

  // Mark as processing immediately so the UI can show status
  processingDB.set({ documentId, claimId, status: 'processing' });

  // For non-text files, use metadata as context until OCR/vision is added in Phase 3
  const content =
    doc.content ??
    `[Document: "${doc.name}" — file type: ${doc.type}, source: ${doc.source}. ` +
      `Full content extraction for this file type is not yet implemented. ` +
      `Provide analysis based on the filename and document type only.]`;

  try {
    const extraction = await extractDocumentData({
      name: doc.name,
      type: doc.type,
      source: doc.source,
      content,
    });

    const result: ProcessingResult = {
      documentId,
      claimId,
      status: 'complete',
      extraction,
      processedAt: new Date().toISOString(),
    };

    processingDB.set(result);
    return NextResponse.json({ success: true, data: result, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Processing failed';

    const result: ProcessingResult = {
      documentId,
      claimId,
      status: 'error',
      error: message,
    };

    processingDB.set(result);
    return NextResponse.json(
      { success: false, data: null, error: 'Document processing failed' },
      { status: 502 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { allowed } = rateLimit(
    `process-get:${getClientIp(request)}`,
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

  const results = processingDB.getByClaim(claimId);
  return NextResponse.json({ success: true, data: results, error: null });
}
