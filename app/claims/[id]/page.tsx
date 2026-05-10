'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DocumentUploader,
  type DocumentMetadata,
} from '@/components/DocumentUploader';
import { ArrowLeft, FileText, FileType, Image, Mail } from 'lucide-react';

type Purpose = 'Settlement' | 'Litigation' | 'SIU' | 'Audit';
const PURPOSES: Purpose[] = ['Settlement', 'Litigation', 'SIU', 'Audit'];

// Mock claim header — replace with API call in Phase 2
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

export default function ClaimWorkspacePage() {
  const params = useParams<{ id: string }>();
  const claimId = params.id;
  const claim = getMockClaim(claimId);

  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [emailKeyword, setEmailKeyword] = useState('');

  useEffect(() => {
    fetch(`/api/ingest?claimId=${encodeURIComponent(claimId)}`)
      .then((r) => r.json())
      .then((json: { success: boolean; data: DocumentMetadata[] }) => {
        if (json.success) setDocuments(json.data);
      })
      .catch(() => {})
      .finally(() => setLoadingDocs(false));
  }, [claimId]);

  const onUploadComplete = (newDocs: DocumentMetadata[]) =>
    setDocuments((prev) => [...prev, ...newDocs]);

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
        {/* Back nav */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-4" />
          All Claims
        </Link>

        {/* Claim header */}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-xl">{claim.number}</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {new Date(claim.date).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Purpose selector — controlled by API in Phase 2 */}
            <div className="flex flex-wrap gap-2">
              {PURPOSES.map((p) => (
                <span
                  key={p}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    p === claim.purpose
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border text-muted-foreground'
                  }`}
                >
                  {p}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Document upload */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold">Upload Documents</h2>
          <DocumentUploader
            claimId={claimId}
            onUploadComplete={onUploadComplete}
          />
        </section>

        {/* Email import */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold">Import from Email</h2>
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

        {/* Document list */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold">
            Documents
            {documents.length > 0 && (
              <span className="ml-1.5 font-normal text-muted-foreground">
                ({documents.length})
              </span>
            )}
          </h2>

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
              {documents.map((doc) => (
                <Card key={doc.id}>
                  <CardContent className="flex items-center gap-3 py-3">
                    <FileIcon type={doc.type} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatBytes(doc.size)} · {formatDate(doc.uploadedAt)}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">
                      {doc.source}
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
