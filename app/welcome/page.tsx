'use client';

import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Brain, FileText } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

// Industry types
type Industry = 'law' | 'finance' | 'insurance';

// Content data per industry
const INDUSTRY_CONTENT: Record<
  Industry,
  {
    headline: string;
    problem: string;
    bullets: string[];
    stats: { label: string; value: string }[];
  }
> = {
  law: {
    headline: 'Built for Legal Teams',
    problem:
      'Assembling a litigation packet today means hours of manual document review, re-reading depositions, and hunting across email threads. A single missed exhibit can cost a case. EvidenceIQ ingests every file and surfaces the exact facts you need instantly.',
    bullets: [
      'Automatically extract and organise exhibits from any document type',
      'Cross-reference witness statements and flag contradictions',
      'Generate court-ready evidence summaries in seconds',
    ],
    stats: [
      { value: '80% faster', label: 'Packet assembly' },
      { value: 'Zero missed facts', label: 'Evidence coverage' },
      { value: 'Court ready', label: 'Output format' },
    ],
  },
  finance: {
    headline: 'Built for Financial Investigators',
    problem:
      'Audit trails that span hundreds of transactions, dozens of accounts, and multiple jurisdictions are impossible to trace manually. Analysts spend weeks building timelines that should take hours. EvidenceIQ connects every data point and produces a fully traceable audit narrative automatically.',
    bullets: [
      'Ingest bank records, ledgers, and correspondence in one place',
      'Auto-build transaction timelines with source citations',
      'Export regulator-ready audit packs with full provenance',
    ],
    stats: [
      { value: '10x faster', label: 'Timeline assembly' },
      { value: '100% traceable', label: 'Every data point sourced' },
      { value: 'Audit ready', label: 'Output format' },
    ],
  },
  insurance: {
    headline: 'Built for Claims Professionals',
    problem:
      'SIU investigators and adjusters juggle police reports, medical records, photos, and recorded statements across every claim. Building a defensible evidence file by hand takes days and still risks gaps. EvidenceIQ does the heavy lifting so your team can focus on decisions, not document wrangling.',
    bullets: [
      'Centralise all claim documents: photos, reports, statements',
      'Auto-detect inconsistencies across claimant narratives',
      'Produce defensible evidence packs ready for litigation or settlement',
    ],
    stats: [
      { value: '90% faster', label: 'Evidence file assembly' },
      { value: 'Defensible', label: 'Audit-trail quality' },
      { value: 'SIU ready', label: 'Output format' },
    ],
  },
};

const INDUSTRY_OPTIONS: { value: Industry; label: string }[] = [
  { value: 'law', label: '⚖️ Legal / Litigation' },
  { value: 'finance', label: '💼 Finance / Audit' },
  { value: 'insurance', label: '🛡️ Insurance / Claims' },
];

const INDUSTRY_DEMO: Record<Industry, { href: string; label: string }> = {
  law: {
    href: '/demo/sample-witness-statement.txt',
    label: 'Try with a sample witness statement',
  },
  finance: {
    href: '/demo/sample-claim-notes.txt',
    label: 'Try with sample claim notes',
  },
  insurance: {
    href: '/demo/sample-medical-report.txt',
    label: 'Try with a sample medical report',
  },
};

const VALID_INDUSTRIES = new Set<string>(['law', 'finance', 'insurance']);

export default function WelcomePage() {
  const [industry, setIndustry] = useState<Industry | null>(null);

  // Content for the currently selected industry (null while nothing is selected)
  const content = industry ? INDUSTRY_CONTENT[industry] : null;

  return (
    <main className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto max-w-2xl space-y-10">
        {/* Brand mark — centred, matching the login page */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10">
            <Brain className="size-8 text-primary" aria-hidden="true" />
          </div>
          <span className="text-2xl font-bold tracking-tight">EvidenceIQ</span>
        </div>

        {/* Hero copy */}
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome to EvidenceIQ
          </h1>
          <p className="text-muted-foreground">
            Select your industry to see how EvidenceIQ works for you
          </p>
        </div>

        {/* Industry selector */}
        <div className="flex justify-center">
          <Select
            onValueChange={(value) => {
              if (typeof value === 'string' && VALID_INDUSTRIES.has(value))
                setIndustry(value as Industry);
            }}
          >
            <SelectTrigger className="w-64" aria-label="Select your industry">
              <SelectValue placeholder="Choose your industry…" />
            </SelectTrigger>
            <SelectContent>
              {INDUSTRY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Industry content — always in DOM so opacity transition can animate.
            pointer-events-none + opacity-0 hides it visually when no industry selected. */}
        <div
          className={cn(
            'space-y-8 transition-opacity duration-300',
            content ? 'opacity-100' : 'pointer-events-none opacity-0'
          )}
          aria-live="polite"
          aria-hidden={!content}
        >
          {/* Feature card: headline + problem + bullets */}
          <Card>
            <CardContent className="space-y-5 pt-6">
              <h2 className="text-xl font-semibold">
                {content?.headline ?? ''}
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {content?.problem ?? ''}
              </p>
              <ul className="space-y-2" aria-label="Key features">
                {(content?.bullets ?? []).map((bullet) => (
                  <li key={bullet} className="flex items-start gap-2 text-sm">
                    <span
                      className="mt-0.5 shrink-0 font-semibold text-primary"
                      aria-hidden="true"
                    >
                      ✓
                    </span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Stat cards — 1 col on mobile, 3 cols on sm+ */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {(content?.stats ?? []).map((stat) => (
              <Card key={stat.label}>
                <CardContent className="flex flex-col items-center justify-center py-6 text-center">
                  <span className="text-xl font-bold text-primary">
                    {stat.value}
                  </span>
                  <span className="mt-1 text-xs text-muted-foreground">
                    {stat.label}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA — only visible when an industry is selected */}
        <div
          className={cn(
            'flex flex-col items-center gap-3 transition-opacity duration-300',
            content ? 'opacity-100' : 'pointer-events-none opacity-0'
          )}
        >
          {industry && (
            <a
              href={INDUSTRY_DEMO[industry].href}
              download
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
            >
              <FileText className="size-3.5 shrink-0" />
              {INDUSTRY_DEMO[industry].label}
            </a>
          )}
          <Link
            href="/"
            className={cn(
              buttonVariants({ size: 'lg' }),
              'w-full justify-center'
            )}
            aria-label="Go to dashboard"
          >
            Go to Dashboard →
          </Link>
          <p className="text-center text-xs text-muted-foreground">
            Your claims dashboard is ready. You can return to this page any time
            from the header.
          </p>
        </div>
      </div>
    </main>
  );
}
