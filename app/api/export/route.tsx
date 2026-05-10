import { NextRequest, NextResponse } from 'next/server';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from '@react-pdf/renderer';
import { rateLimit } from '@/lib/rate-limit';
import { documentDB, processingDB } from '@/lib/store';
import type { DocumentMetadata, ProcessingResult } from '@/lib/store';

// ------------------------------------------------------------------
// Constants
// ------------------------------------------------------------------

const CLAIM_ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

// Same purpose map used on the frontend claim workspace
const PURPOSE_MAP: Record<string, string> = {
  'CLM-2024-001': 'Settlement',
  'CLM-2024-002': 'Litigation',
  'CLM-2024-003': 'SIU',
};

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded ? forwarded.split(',')[0].trim() : 'unknown';
}

function getClaimPurpose(claimId: string): string {
  return PURPOSE_MAP[claimId] ?? 'Settlement';
}

function formatIsoDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

// ------------------------------------------------------------------
// PDF styles
// ------------------------------------------------------------------

const FONT_SIZES = { h1: 22, h2: 14, h3: 11, body: 10, small: 8 };
const COLORS = {
  black: '#111111',
  gray: '#555555',
  lightGray: '#888888',
  border: '#DDDDDD',
  accent: '#1D4ED8',
  red: '#DC2626',
  white: '#FFFFFF',
  headerBg: '#F1F5F9',
};

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: FONT_SIZES.body,
    color: COLORS.black,
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 48,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 48,
    right: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 6,
  },
  footerText: {
    fontSize: FONT_SIZES.small,
    color: COLORS.lightGray,
  },
  // Cover page
  coverPage: {
    fontFamily: 'Helvetica',
    fontSize: FONT_SIZES.body,
    color: COLORS.black,
    paddingTop: 96,
    paddingBottom: 48,
    paddingHorizontal: 48,
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  confidentialBadge: {
    backgroundColor: COLORS.red,
    color: COLORS.white,
    fontSize: FONT_SIZES.small,
    fontFamily: 'Helvetica-Bold',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginBottom: 32,
    alignSelf: 'flex-start',
  },
  coverTitle: {
    fontSize: FONT_SIZES.h1,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 8,
  },
  coverSubtitle: {
    fontSize: FONT_SIZES.h2,
    color: COLORS.gray,
    marginBottom: 32,
  },
  coverMeta: {
    fontSize: FONT_SIZES.body,
    color: COLORS.gray,
    marginBottom: 4,
  },
  coverMetaValue: {
    fontSize: FONT_SIZES.body,
    color: COLORS.black,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 12,
  },
  coverGeneratedLine: {
    marginTop: 32,
    fontSize: FONT_SIZES.small,
    color: COLORS.lightGray,
  },
  // Section pages
  sectionTitle: {
    fontSize: FONT_SIZES.h2,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 16,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  subTitle: {
    fontSize: FONT_SIZES.h3,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 6,
    marginTop: 12,
  },
  bodyText: {
    fontSize: FONT_SIZES.body,
    color: COLORS.black,
    marginBottom: 4,
    lineHeight: 1.4,
  },
  mutedText: {
    fontSize: FONT_SIZES.small,
    color: COLORS.lightGray,
    marginBottom: 3,
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  bullet: {
    width: 12,
    fontSize: FONT_SIZES.body,
    color: COLORS.gray,
  },
  bulletText: {
    flex: 1,
    fontSize: FONT_SIZES.body,
    color: COLORS.black,
    lineHeight: 1.4,
  },
  // TOC
  tocRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tocLabel: {
    fontSize: FONT_SIZES.body,
    color: COLORS.black,
  },
  tocPage: {
    fontSize: FONT_SIZES.body,
    color: COLORS.gray,
  },
  // Timeline
  timelineRow: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  timelineDate: {
    width: 88,
    fontSize: FONT_SIZES.small,
    color: COLORS.accent,
    fontFamily: 'Helvetica-Bold',
    paddingTop: 1,
  },
  timelineContent: {
    flex: 1,
  },
  timelineDesc: {
    fontSize: FONT_SIZES.body,
    color: COLORS.black,
    lineHeight: 1.4,
  },
  timelineSource: {
    fontSize: FONT_SIZES.small,
    color: COLORS.lightGray,
    marginTop: 2,
  },
  // Documents table
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.headerBg,
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 0,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: COLORS.border,
  },
  tableHeaderCell: {
    fontSize: FONT_SIZES.small,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.gray,
  },
  tableCell: {
    fontSize: FONT_SIZES.small,
    color: COLORS.black,
    lineHeight: 1.3,
  },
  colName: { flex: 3 },
  colType: { flex: 2 },
  colSource: { flex: 1 },
  colDate: { flex: 2 },
});

// ------------------------------------------------------------------
// PDF footer component (rendered on every page via fixed positioning)
// ------------------------------------------------------------------

function PageFooter({ claimId }: { claimId: string }) {
  return (
    <View style={styles.footer} fixed={true}>
      <Text style={styles.footerText}>{claimId}</Text>
      <Text
        style={styles.footerText}
        render={({ pageNumber, totalPages }) =>
          `Page ${pageNumber} of ${totalPages}`
        }
      />
    </View>
  );
}

// ------------------------------------------------------------------
// Cover page
// ------------------------------------------------------------------

function CoverPage({
  claimId,
  claimDate,
  purpose,
  generatedAt,
}: {
  claimId: string;
  claimDate: string;
  purpose: string;
  generatedAt: string;
}) {
  return (
    <Page size="A4" style={styles.coverPage}>
      <Text style={styles.confidentialBadge}>CONFIDENTIAL</Text>
      <Text style={styles.coverTitle}>Evidence Pack</Text>
      <Text style={styles.coverSubtitle}>Claims Evidence Documentation</Text>

      <Text style={styles.coverMeta}>Claim Number</Text>
      <Text style={styles.coverMetaValue}>{claimId}</Text>

      <Text style={styles.coverMeta}>Claim Date</Text>
      <Text style={styles.coverMetaValue}>{formatIsoDate(claimDate)}</Text>

      <Text style={styles.coverMeta}>Purpose</Text>
      <Text style={styles.coverMetaValue}>{purpose}</Text>

      <Text style={styles.coverGeneratedLine}>Generated: {generatedAt}</Text>

      <PageFooter claimId={claimId} />
    </Page>
  );
}

// ------------------------------------------------------------------
// Table of contents page
// ------------------------------------------------------------------

// WARNING: page numbers are static. @react-pdf/renderer has no dynamic TOC API.
// If you add or remove pages before these sections, update these numbers manually.
function TocPage({ claimId }: { claimId: string }) {
  const entries = [
    { label: 'Claim Summary', page: 3 },
    { label: 'Evidence Timeline', page: 4 },
    { label: 'Documents List', page: 5 },
  ];

  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.sectionTitle}>Table of Contents</Text>
      {entries.map((entry) => (
        <View key={entry.label} style={styles.tocRow}>
          <Text style={styles.tocLabel}>{entry.label}</Text>
          <Text style={styles.tocPage}>{entry.page}</Text>
        </View>
      ))}
      <PageFooter claimId={claimId} />
    </Page>
  );
}

// ------------------------------------------------------------------
// Section 1 — Claim Summary
// ------------------------------------------------------------------

function ClaimSummaryPage({
  claimId,
  processingResults,
  documents,
}: {
  claimId: string;
  processingResults: ProcessingResult[];
  documents: DocumentMetadata[];
}) {
  // Only include documents with complete processing results
  const completeResults = processingResults.filter(
    (r) => r.status === 'complete' && r.extraction != null
  );

  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.sectionTitle}>Section 1 — Claim Summary</Text>

      {completeResults.length === 0 ? (
        <Text style={styles.mutedText}>No completed processing results.</Text>
      ) : (
        completeResults.map((result) => {
          const doc = documents.find((d) => d.id === result.documentId);
          const docName = doc?.name ?? result.documentId;
          const extraction = result.extraction!;

          return (
            <View key={result.documentId} wrap={false}>
              <Text style={styles.subTitle}>{docName}</Text>

              {extraction.summary ? (
                <Text style={styles.bodyText}>{extraction.summary}</Text>
              ) : null}

              {extraction.facts.length > 0 ? (
                <>
                  <Text style={styles.mutedText}>Key Facts</Text>
                  {extraction.facts.map((fact, i) => (
                    <View key={i} style={styles.bulletRow}>
                      <Text style={styles.bullet}>•</Text>
                      <Text style={styles.bulletText}>{fact}</Text>
                    </View>
                  ))}
                </>
              ) : null}
            </View>
          );
        })
      )}

      <PageFooter claimId={claimId} />
    </Page>
  );
}

// ------------------------------------------------------------------
// Section 2 — Evidence Timeline
// ------------------------------------------------------------------

interface TimelineEntry {
  date: string; // ISO or free-text date from extraction
  description: string;
  sourceDocName: string;
}

function buildTimeline(
  processingResults: ProcessingResult[],
  documents: DocumentMetadata[]
): TimelineEntry[] {
  const entries: TimelineEntry[] = [];

  for (const result of processingResults) {
    if (result.status !== 'complete' || !result.extraction) continue;
    const doc = documents.find((d) => d.id === result.documentId);
    const sourceDocName = doc?.name ?? result.documentId;

    for (const dateEntry of result.extraction.dates) {
      entries.push({
        date: dateEntry.date,
        description: dateEntry.description,
        sourceDocName,
      });
    }
  }

  // Sort chronologically — entries with a parseable ISO-like date sort first
  entries.sort((a, b) => {
    const ta = new Date(a.date).getTime();
    const tb = new Date(b.date).getTime();
    // If both are invalid (NaN), preserve order; otherwise sort ascending
    if (isNaN(ta) && isNaN(tb)) return 0;
    if (isNaN(ta)) return 1;
    if (isNaN(tb)) return -1;
    return ta - tb;
  });

  return entries;
}

function EvidenceTimelinePage({
  claimId,
  processingResults,
  documents,
}: {
  claimId: string;
  processingResults: ProcessingResult[];
  documents: DocumentMetadata[];
}) {
  const timeline = buildTimeline(processingResults, documents);

  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.sectionTitle}>Section 2 — Evidence Timeline</Text>

      {timeline.length === 0 ? (
        <Text style={styles.mutedText}>
          No date entries found in processed documents.
        </Text>
      ) : (
        timeline.map((entry, i) => (
          <View key={i} style={styles.timelineRow} wrap={false}>
            <Text style={styles.timelineDate}>{entry.date}</Text>
            <View style={styles.timelineContent}>
              <Text style={styles.timelineDesc}>{entry.description}</Text>
              <Text style={styles.timelineSource}>{entry.sourceDocName}</Text>
            </View>
          </View>
        ))
      )}

      <PageFooter claimId={claimId} />
    </Page>
  );
}

// ------------------------------------------------------------------
// Section 3 — Documents List
// ------------------------------------------------------------------

function DocumentsListPage({
  claimId,
  documents,
}: {
  claimId: string;
  documents: DocumentMetadata[];
}) {
  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.sectionTitle}>Section 3 — Documents List</Text>

      {/* Table header */}
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderCell, styles.colName]}>Name</Text>
        <Text style={[styles.tableHeaderCell, styles.colType]}>Type</Text>
        <Text style={[styles.tableHeaderCell, styles.colSource]}>Source</Text>
        <Text style={[styles.tableHeaderCell, styles.colDate]}>Uploaded</Text>
      </View>

      {/* Table rows */}
      {documents.map((doc) => (
        <View key={doc.id} style={styles.tableRow} wrap={false}>
          <Text style={[styles.tableCell, styles.colName]}>{doc.name}</Text>
          <Text style={[styles.tableCell, styles.colType]}>{doc.type}</Text>
          <Text style={[styles.tableCell, styles.colSource]}>{doc.source}</Text>
          <Text style={[styles.tableCell, styles.colDate]}>
            {formatIsoDate(doc.uploadedAt)}
          </Text>
        </View>
      ))}

      {documents.length === 0 ? (
        <Text style={styles.mutedText}>No documents found for this claim.</Text>
      ) : null}

      <PageFooter claimId={claimId} />
    </Page>
  );
}

// ------------------------------------------------------------------
// GET /api/export?claimId=<id>
// ------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Rate limit: 5 requests per minute per IP
  const clientIp = getClientIp(request);
  const { allowed } = rateLimit(`export:${clientIp}`, 5, 60_000);
  if (!allowed) {
    return NextResponse.json(
      { success: false, data: null, error: 'Too many requests' },
      { status: 429 }
    );
  }

  // Validate claimId query parameter
  const { searchParams } = new URL(request.url);
  const claimId = searchParams.get('claimId');

  if (typeof claimId !== 'string' || !CLAIM_ID_PATTERN.test(claimId)) {
    return NextResponse.json(
      { success: false, data: null, error: 'Invalid claim ID' },
      { status: 400 }
    );
  }

  // Look up documents for this claim
  const documents = documentDB.getByClaim(claimId);
  if (documents.length === 0) {
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: 'No documents found for this claim',
      },
      { status: 404 }
    );
  }

  // Full scan — acceptable for in-memory store; add a claimId index when migrating to a real DB.
  const processingResults = processingDB.getByClaim(claimId);

  // Gather metadata for the cover page
  const purpose = getClaimPurpose(claimId);
  // Use a deterministic claim date: take the earliest document upload date, fall back to today
  const claimDate =
    documents.map((d) => d.uploadedAt).sort()[0] ?? new Date().toISOString();
  const generatedAt = new Date().toISOString();

  // Build and render the PDF.
  // renderToBuffer requires a ReactElement<DocumentProps> — the root element
  // must be <Document> directly, not a user-defined wrapper component.
  try {
    const pdfBuffer = await renderToBuffer(
      <Document
        title={`Evidence Pack — ${claimId}`}
        author="Claims Evidence Pack Generator"
        subject={`${purpose} — ${claimId}`}
      >
        <CoverPage
          claimId={claimId}
          claimDate={claimDate}
          purpose={purpose}
          generatedAt={generatedAt}
        />
        <TocPage claimId={claimId} />
        <ClaimSummaryPage
          claimId={claimId}
          processingResults={processingResults}
          documents={documents}
        />
        <EvidenceTimelinePage
          claimId={claimId}
          processingResults={processingResults}
          documents={documents}
        />
        <DocumentsListPage claimId={claimId} documents={documents} />
      </Document>
    );

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="evidence-pack-${claimId}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    // Do not expose internal error details to the caller
    return NextResponse.json(
      { success: false, data: null, error: 'PDF generation failed' },
      { status: 502 }
    );
  }
}
