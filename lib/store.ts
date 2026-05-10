// Shared in-memory store — replace with a real database in Phase 3.
// Module-level singletons are shared across all route handlers in the same process.

export interface DocumentMetadata {
  id: string;
  claimId: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
  source: 'upload' | 'email';
  content?: string; // populated for text/plain files at ingest time
}

export interface DateEntry {
  date: string;
  description: string;
}

export interface AmountEntry {
  value: string;
  description: string;
}

export interface ExtractionResult {
  facts: string[];
  dates: DateEntry[];
  people: string[];
  amounts: AmountEntry[];
  relevance: number;
  docType: string;
  summary: string;
}

export type ProcessingStatus = 'pending' | 'processing' | 'complete' | 'error';

export interface ProcessingResult {
  documentId: string;
  claimId: string;
  status: ProcessingStatus;
  extraction?: ExtractionResult;
  error?: string;
  processedAt?: string;
}

// In Next.js dev mode, HMR re-evaluates this module on every hot reload,
// resetting plain Map literals and losing all data between uploads and
// process calls.  Anchoring to globalThis persists across reloads.
declare global {
  // eslint-disable-next-line no-var
  var __docs: Map<string, DocumentMetadata[]> | undefined;
  // eslint-disable-next-line no-var
  var __processing: Map<string, ProcessingResult> | undefined;
}

const _docs: Map<string, DocumentMetadata[]> =
  globalThis.__docs ?? (globalThis.__docs = new Map());
const _processing: Map<string, ProcessingResult> =
  globalThis.__processing ?? (globalThis.__processing = new Map());

export const documentDB = {
  add(doc: DocumentMetadata): void {
    const list = _docs.get(doc.claimId) ?? [];
    _docs.set(doc.claimId, [...list, doc]);
  },
  getByClaim(claimId: string): DocumentMetadata[] {
    return _docs.get(claimId) ?? [];
  },
  findById(claimId: string, documentId: string): DocumentMetadata | undefined {
    return (_docs.get(claimId) ?? []).find((d) => d.id === documentId);
  },
};

export const processingDB = {
  set(result: ProcessingResult): void {
    _processing.set(result.documentId, result);
  },
  getByDocument(documentId: string): ProcessingResult | undefined {
    return _processing.get(documentId);
  },
  getByClaim(claimId: string): ProcessingResult[] {
    return Array.from(_processing.values()).filter(
      (r) => r.claimId === claimId
    );
  },
};
