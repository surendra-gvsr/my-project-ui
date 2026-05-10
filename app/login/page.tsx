'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { login } from '@/lib/auth';

// Extracted into its own component so useSearchParams() can be wrapped in Suspense,
// which Next.js requires for static pre-rendering of pages that read search params.
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(false);
    setLoading(true);

    // Small tick to let the loading state paint before synchronous work
    setTimeout(() => {
      const ok = login(email, password);
      if (ok) {
        // Follow `next` only for real deep links (e.g. /claims/CLM-001).
        // Root `/` is not a deep link — always send new logins through /welcome.
        const next = searchParams.get('next');
        const isDeepLink =
          next != null &&
          next.startsWith('/') &&
          !next.startsWith('//') &&
          next !== '/';
        router.push(isDeepLink ? next : '/welcome');
      } else {
        setError(true);
        setLoading(false);
      }
    }, 50);
  };

  return (
    <Card>
      <CardContent className="space-y-5 pt-6">
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="adjuster@evidenceiq.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={error}
              required
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={error}
              required
            />
          </div>

          {/* Error message */}
          {error && (
            <p role="alert" className="text-sm font-medium text-destructive">
              Invalid email or password.
            </p>
          )}

          {/* Submit */}
          <Button
            type="submit"
            className="w-full"
            disabled={loading}
            aria-label="Sign in to EvidenceIQ"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </Button>
        </form>

        {/* Demo hint */}
        <div className="rounded-lg bg-muted/50 px-4 py-3 text-xs text-muted-foreground">
          <p className="mb-0.5 font-semibold text-foreground">
            Demo credentials
          </p>
          <p>adjuster@evidenceiq.com / demo1234</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        {/* Brand mark */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10">
            <Brain className="size-8 text-primary" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">EvidenceIQ</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              AI-Powered Claims Evidence Management
            </p>
          </div>
        </div>

        <Suspense
          fallback={
            <div className="h-64 rounded-lg bg-muted/20 animate-pulse" />
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
