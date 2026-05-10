'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DocumentUploader,
  type DocumentMetadata,
} from '@/components/DocumentUploader';
import { EvidenceTimeline } from '@/components/EvidenceTimeline';
import { toast } from 'sonner';
import type { ProcessingResult, ProcessingStatus } from '@/lib/store';
import {
  ArrowLeft,
  Download,
  FileText,
  FileType,
  Image,
  Loader2,
  Mail,
  Sparkles,
} from 'lucide-react';

type Purpose = 'Settlement' | 'Litigation' | 'SIU' | 'Audit';

function getMockClaim(id: string): {
  number: string;
  date: string;
  purpose: Purpose;
} {
  const purposeMap: Record<string, Purpose> = {
    'CLM-2024-001': 'Settlement',
    'CLM-2024-002': 'Litigation',
    'CLM-2024-003': 'SIU',
  };
  return {
    number: id,
    date: '2024-11-01',
    purpose: purposeMap[id] ?? 'Settlement',
  };
}

function FileIcon({ type }: { type: string }) {
  if (type.startsWith('image/'))
    return <Image className="size-4 shrink-0 text-blue-500" />;
  if (type === 'application/pdf')
    return <FileText className="size-4 shrink-0 text-red-500" />;
  return <FileType className="size-4 shrink-0 text-muted-foreground" />;
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const STATUS_STYLES: Record<
  ProcessingStatus | 'pending',
  { label: string; className: string }
> = {
  pending: {
    label: 'Pending',
    className: 'bg-muted text-muted-foreground',
  },
  processing: {
    label: 'Processing…',
    className:
      'animate-pulse bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  },
  complete: {
    label: 'Complete',
    className:
      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
  error: {
    label: 'Error',
    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
};

function docStatus(
  docId: string,
  activeSet: Set<string>,
  results: ProcessingResult[]
): ProcessingStatus | 'pending' {
  if (activeSet.has(docId)) return 'processing';
  return results.find((r) => r.documentId === docId)?.status ?? 'pending';
}

export default function ClaimWorkspacePage() {
  const params = useParams<{ id: string }>();
  const claimId = params.id;
  const claim = getMockClaim(claimId);

  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [processingResults, setProcessingResults] = useState<
    ProcessingResult[]
  >([]);
  const [activeSet, setActiveSet] = useState<Set<string>>(new Set());
  const [emailKeyword, setEmailKeyword] = useState('');

  // Prevent double-firing in dev StrictMode
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;

    Promise.all([
      fetch(`/api/ingest?claimId=${encodeURIComponent(claimId)}`).then((r) =>
        r.json()
      ),
      fetch(`/api/process?claimId=${encodeURIComponent(claimId)}`).then((r) =>
        r.json()
      ),
    ])
      .then(([docsJson, procJson]) => {
        if (docsJson.success) setDocuments(docsJson.data);
        if (procJson.success) setProcessingResults(procJson.data);
      })
      .catch(() => {})
      .finally(() => setLoadingDocs(false));
  }, [claimId]);

  const onUploadComplete = (newDocs: DocumentMetadata[]) =>
    setDocuments((prev) => [...prev, ...newDocs]);

  const handleProcessDocuments = async () => {
    const unprocessed = documents.filter((doc) => {
      const r = processingResults.find((p) => p.documentId === doc.id);
      return !r || r.status === 'error';
    });
    if (!unprocessed.length) return;

    for (const doc of unprocessed) {
      setActiveSet((prev) => new Set([...prev, doc.id]));

      try {
        const res = await fetch('/api/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ claimId, documentId: doc.id }),
        });
        const json: {
          success: boolean;
          data: ProcessingResult;
          error: string | null;
        } = await res.json();

        const result: ProcessingResult = json.success
          ? json.data
          : {
              documentId: doc.id,
              claimId,
              status: 'error',
              error: json.error ?? 'Failed',
            };

        setProcessingResults((prev) => [
          ...prev.filter((r) => r.documentId !== doc.id),
          result,
        ]);
      } catch {
        setProcessingResults((prev) => [
          ...prev.filter((r) => r.documentId !== doc.id),
          {
            documentId: doc.id,
            claimId,
            status: 'error',
            error: 'Network error',
          },
        ]);
      } finally {
        setActiveSet((prev) => {
          const next = new Set(prev);
          next.delete(doc.id);
          return next;
        });
      }
    }
  };

  const unprocessedCount = documents.filter((doc) => {
    const r = processingResults.find((p) => p.documentId === doc.id);
    return !r || r.status === 'error';
  }).length;

  const isProcessing = activeSet.size > 0;

  const [isExporting, setIsExporting] = useState(false);

  const hasCompletedDoc = processingResults.some(
    (r) => r.status === 'complete'
  );
  const isExportDisabled =
    documents.length === 0 || !hasCompletedDoc || isExporting;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await fetch(
        `/api/export?claimId=${encodeURIComponent(claimId)}`
      );
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `evidence-pack-${claimId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Export failed — please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Derive a purpose-based status label for the sticky bar pill
  const purposeLabel = claim.purpose;

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Sticky action bar — replaces the old claim header Card */}
      <div className="sticky top-0 z-10 border-b bg-background px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          {/* Left: back nav + claim identity */}
          <div className="flex min-w-0 flex-col gap-0.5">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ArrowLeft className="size-4" />
              All Claims
            </Link>
            <div className="flex items-center gap-2">
              <span className="font-semibold">{claim.number}</span>
              {/* Purpose badge pill */}
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                {purposeLabel}
              </span>
            </div>
          </div>

          {/* Right: Export button */}
          <Button
            variant="default"
            size="sm"
            onClick={handleExport}
            disabled={isExportDisabled}
            aria-label="Export evidence pack as PDF"
          >
            {isExporting ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Generating PDF…
              </>
            ) : (
              <>
                <Download className="size-3.5" />
                Export Evidence Pack
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
        {/* Upload */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold">Upload Documents</h2>
          <DocumentUploader
            claimId={claimId}
            onUploadComplete={onUploadComplete}
          />
        </section>

        {/* Documents + process button */}
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold">
              Documents
              {documents.length > 0 && (
                <span className="ml-1.5 font-normal text-muted-foreground">
                  ({documents.length})
                </span>
              )}
            </h2>
            {documents.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleProcessDocuments}
                disabled={isProcessing || unprocessedCount === 0}
              >
                <Sparkles className="size-3.5" />
                {isProcessing
                  ? 'Processing…'
                  : unprocessedCount === 0
                    ? 'All processed'
                    : `Process ${unprocessedCount} doc${unprocessedCount !== 1 ? 's' : ''}`}
              </Button>
            )}
          </div>

          {loadingDocs ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : documents.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <p className="text-sm text-muted-foreground">
                  No documents yet — upload files above to get started.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => {
                const status = docStatus(doc.id, activeSet, processingResults);
                const style = STATUS_STYLES[status];
                return (
                  <Card key={doc.id}>
                    <CardContent className="flex items-center gap-3 py-3">
                      <FileIcon type={doc.type} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {doc.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatBytes(doc.size)} · {formatDate(doc.uploadedAt)}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">
                          {doc.source}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${style.className}`}
                        >
                          {style.label}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {/* Evidence timeline */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold">Evidence Timeline</h2>
          <EvidenceTimeline
            results={processingResults}
            documents={documents.map((d) => ({ id: d.id, name: d.name }))}
          />
        </section>

        {/* Visual separator before Gmail import */}
        <hr className="border-border" />

        {/* Gmail import — reduced visual weight, moved to bottom */}
        <section className="space-y-3">
          <h2 className="text-sm text-muted-foreground">Import from Email</h2>
          <Card>
            <CardContent className="space-y-4 pt-4">
              <div className="flex items-center gap-3 rounded-lg border border-dashed p-4">
                <Mail className="size-6 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">Gmail not connected</p>
                  <p className="text-xs text-muted-foreground">
                    Connect Gmail to pull emails by claim number or keyword.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  disabled
                >
                  Connect
                </Button>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email-keyword">Search keyword</Label>
                <div className="flex gap-2">
                  <Input
                    id="email-keyword"
                    placeholder={`e.g. ${claimId}`}
                    value={emailKeyword}
                    onChange={(e) => setEmailKeyword(e.target.value)}
                    disabled
                    className="flex-1"
                  />
                  <Button variant="outline" disabled>
                    Search
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
