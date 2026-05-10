'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FileText, Plus, Shield } from 'lucide-react';
import { isAuthenticated, logout } from '@/lib/auth';

type ClaimStatus = 'Draft' | 'In Review' | 'Complete';

interface Claim {
  id: string;
  number: string;
  date: string;
  status: ClaimStatus;
  documentCount: number;
}

// Mock data — replace with DB queries in Phase 2
// Statuses: CLM-2024-001 = In Review, CLM-2024-002 = In Review, CLM-2024-003 = Complete
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
    status: 'In Review',
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

// Badge color per status
const STATUS_BADGE: Record<ClaimStatus, string> = {
  Draft: 'bg-muted text-muted-foreground',
  'In Review':
    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Complete:
    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

// Left border accent per status
const STATUS_BORDER: Record<ClaimStatus, string> = {
  Draft: 'border-l-4 border-l-gray-300',
  'In Review': 'border-l-4 border-l-blue-500',
  Complete: 'border-l-4 border-l-green-500',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Compute stat counts from the claims array
const totalClaims = CLAIMS.length;
const inReviewCount = CLAIMS.filter((c) => c.status === 'In Review').length;
const completeCount = CLAIMS.filter((c) => c.status === 'Complete').length;

export default function DashboardPage() {
  const router = useRouter();
  // null = still checking auth, false = not authed, true = authed
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    // Redirect to login if no valid session
    if (!isAuthenticated()) {
      router.replace('/login');
    } else {
      setAuthChecked(true);
    }
  }, [router]);

  const handleSignOut = () => {
    logout();
    router.push('/login');
  };

  // Show nothing while checking auth to avoid flash of protected content
  if (!authChecked) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky top header */}
      <header className="sticky top-0 z-10 border-b bg-background">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <Shield className="size-5 text-primary" aria-hidden="true" />
            <span className="font-bold">ClaimsPack</span>
          </div>

          {/* Sign out */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            aria-label="Sign out"
          >
            Sign Out
          </Button>
        </div>
      </header>

      <main>
        <div className="mx-auto max-w-2xl px-4 py-8">
          {/* Stat cards row */}
          <div className="mb-8 grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-4 text-center">
                <span className="text-2xl font-bold">{totalClaims}</span>
                <span className="mt-1 text-xs text-muted-foreground">
                  Total Claims
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-4 text-center">
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {inReviewCount}
                </span>
                <span className="mt-1 text-xs text-muted-foreground">
                  In Review
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-4 text-center">
                <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {completeCount}
                </span>
                <span className="mt-1 text-xs text-muted-foreground">
                  Complete
                </span>
              </CardContent>
            </Card>
          </div>

          {/* Section header */}
          <div className="mb-4 flex items-center justify-between gap-4">
            <h1 className="text-xl font-semibold">Claims</h1>
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
                  {/* Left color border + hover shadow */}
                  <Card
                    className={cn(
                      'cursor-pointer transition-shadow hover:shadow-md',
                      STATUS_BORDER[claim.status]
                    )}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between gap-3">
                        <CardTitle>{claim.number}</CardTitle>
                        <span
                          className={cn(
                            'rounded-full px-2.5 py-0.5 text-xs font-medium',
                            STATUS_BADGE[claim.status]
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
    </div>
  );
}
