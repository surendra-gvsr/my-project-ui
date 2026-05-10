'use client';

import { useCallback, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, FileType, Image, Upload, X } from 'lucide-react';

const ACCEPTED_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'text/plain',
]);

const ACCEPT_ATTR = '.pdf,.jpg,.jpeg,.png,.gif,.webp,.txt';
const MAX_BYTES = 10 * 1024 * 1024;

export interface DocumentMetadata {
  id: string;
  claimId: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
  source: string;
}

interface QueuedFile {
  file: File;
  uid: string;
}

interface DocumentUploaderProps {
  claimId: string;
  onUploadComplete?: (docs: DocumentMetadata[]) => void;
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

export function DocumentUploader({
  claimId,
  onUploadComplete,
}: DocumentUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [queued, setQueued] = useState<QueuedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enqueue = useCallback((incoming: FileList | File[]) => {
    const valid: QueuedFile[] = [];
    for (const file of Array.from(incoming)) {
      if (!ACCEPTED_TYPES.has(file.type)) {
        setError(`Unsupported file type: ${file.name}`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        setError(`${file.name} exceeds the 10 MB limit`);
        continue;
      }
      valid.push({
        file,
        uid: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      });
    }
    setQueued((prev) => [...prev, ...valid]);
  }, []);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };
  const onDragLeave = () => setDragging(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    setError(null);
    enqueue(e.dataTransfer.files);
  };
  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (e.target.files) enqueue(e.target.files);
  };

  const remove = (uid: string) =>
    setQueued((prev) => prev.filter((q) => q.uid !== uid));

  const upload = async () => {
    if (!queued.length) return;
    setUploading(true);
    setError(null);

    const body = new FormData();
    body.append('claimId', claimId);
    for (const { file } of queued) body.append('files', file);

    try {
      const res = await fetch('/api/ingest', { method: 'POST', body });
      const json: {
        success: boolean;
        data: DocumentMetadata[];
        error: string | null;
      } = await res.json();

      if (!json.success) {
        setError(json.error ?? 'Upload failed');
      } else {
        setQueued([]);
        onUploadComplete?.(json.data);
      }
    } catch {
      setError('Network error — please try again');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <Card
        className={`cursor-pointer border-2 border-dashed transition-colors ${
          dragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50'
        }`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        aria-label="Upload documents"
      >
        <CardContent className="flex flex-col items-center justify-center gap-2 py-10">
          <Upload className="size-8 text-muted-foreground" />
          <p className="text-sm font-medium">
            Drop files here or click to browse
          </p>
          <p className="text-xs text-muted-foreground">
            PDF · Images · .txt — max 10 MB each
          </p>
        </CardContent>
      </Card>

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={ACCEPT_ATTR}
        multiple
        onChange={onInputChange}
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Queued file list + upload button */}
      {queued.length > 0 && (
        <div className="space-y-2">
          {queued.map(({ file, uid }) => (
            <div
              key={uid}
              className="flex items-center gap-3 rounded-lg border border-border px-3 py-2"
            >
              <FileIcon type={file.type} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatBytes(file.size)}
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  remove(uid);
                }}
                className="shrink-0 rounded text-muted-foreground hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Remove ${file.name}`}
              >
                <X className="size-4" />
              </button>
            </div>
          ))}

          <Button className="w-full" onClick={upload} disabled={uploading}>
            {uploading
              ? 'Uploading…'
              : `Upload ${queued.length} file${queued.length !== 1 ? 's' : ''}`}
          </Button>
        </div>
      )}
    </div>
  );
}
