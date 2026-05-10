import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FileText, Plus } from 'lucide-react';

type ClaimStatus = 'Draft' | 'In Review' | 'Complete';

interface Claim {
  id: string;
  number: string;
  date: string;
  status: ClaimStatus;
  documentCount: number;
}

// Mock data — replace with DB queries in Phase 2
const CLAIMS: Claim[] = [
  {
    id: 'CLM-2024-001',
    number: 'CLM-2024-001',
    date: '2024-11-01',
    status: 'In Review',
    documentCount: 7,
  },
  {
    id: 'CLM-2024-002',
    number: 'CLM-2024-002',
    date: '2024-11-12',
    status: 'Draft',
    documentCount: 2,
  },
  {
    id: 'CLM-2024-003',
    number: 'CLM-2024-003',
    date: '2024-10-25',
    status: 'Complete',
    documentCount: 14,
  },
];

const STATUS_STYLES: Record<ClaimStatus, string> = {
  Draft: 'bg-muted text-muted-foreground',
  'In Review':
    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Complete:
    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Claims</h1>
          <Link href="/claims/new" className={cn(buttonVariants())}>
            <Plus className="size-4" />
            New Claim
          </Link>
        </div>

        {/* Claims list */}
        {CLAIMS.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            No claims yet. Create your first one.
          </p>
        ) : (
          <div className="space-y-3">
            {CLAIMS.map((claim) => (
              <Link
                key={claim.id}
                href={`/claims/${claim.id}`}
                className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Card className="transition-colors hover:bg-muted/30">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <CardTitle>{claim.number}</CardTitle>
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-0.5 text-xs font-medium',
                          STATUS_STYLES[claim.status]
                        )}
                      >
                        {claim.status}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{formatDate(claim.date)}</span>
                      <span className="flex items-center gap-1">
                        <FileText className="size-3.5" />
                        {claim.documentCount}{' '}
                        {claim.documentCount === 1 ? 'doc' : 'docs'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
