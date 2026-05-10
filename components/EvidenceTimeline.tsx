'use client';

import { Card, CardContent } from '@/components/ui/card';
import type { ProcessingResult } from '@/lib/store';

interface TimelineItem {
  date: string;
  description: string;
  documentId: string;
  documentName: string;
  docType: string;
}

interface EvidenceTimelineProps {
  results: ProcessingResult[];
  documents: Array<{ id: string; name: string }>;
}

// Color scheme: email=blue, PDF-family=orange, photo=green, note/correspondence=purple
const DOC_TYPE_COLORS: Record<
  string,
  { border: string; dot: string; badge: string; badgeText: string }
> = {
  email: {
    border: 'border-l-blue-400',
    dot: 'bg-blue-500',
    badge: 'bg-blue-100 dark:bg-blue-900/30',
    badgeText: 'text-blue-700 dark:text-blue-400',
  },
  correspondence: {
    border: 'border-l-blue-400',
    dot: 'bg-blue-500',
    badge: 'bg-blue-100 dark:bg-blue-900/30',
    badgeText: 'text-blue-700 dark:text-blue-400',
  },
  invoice: {
    border: 'border-l-orange-400',
    dot: 'bg-orange-500',
    badge: 'bg-orange-100 dark:bg-orange-900/30',
    badgeText: 'text-orange-700 dark:text-orange-400',
  },
  medical_report: {
    border: 'border-l-orange-400',
    dot: 'bg-orange-500',
    badge: 'bg-orange-100 dark:bg-orange-900/30',
    badgeText: 'text-orange-700 dark:text-orange-400',
  },
  police_report: {
    border: 'border-l-orange-400',
    dot: 'bg-orange-500',
    badge: 'bg-orange-100 dark:bg-orange-900/30',
    badgeText: 'text-orange-700 dark:text-orange-400',
  },
  legal_document: {
    border: 'border-l-orange-400',
    dot: 'bg-orange-500',
    badge: 'bg-orange-100 dark:bg-orange-900/30',
    badgeText: 'text-orange-700 dark:text-orange-400',
  },
  photo: {
    border: 'border-l-green-400',
    dot: 'bg-green-500',
    badge: 'bg-green-100 dark:bg-green-900/30',
    badgeText: 'text-green-700 dark:text-green-400',
  },
  note: {
    border: 'border-l-purple-400',
    dot: 'bg-purple-500',
    badge: 'bg-purple-100 dark:bg-purple-900/30',
    badgeText: 'text-purple-700 dark:text-purple-400',
  },
  other: {
    border: 'border-l-muted-foreground/40',
    dot: 'bg-muted-foreground/60',
    badge: 'bg-muted',
    badgeText: 'text-muted-foreground',
  },
};

function colors(docType: string) {
  return DOC_TYPE_COLORS[docType] ?? DOC_TYPE_COLORS.other;
}

function toChronological(items: TimelineItem[]): TimelineItem[] {
  return [...items].sort((a, b) => {
    const ta = Date.parse(a.date);
    const tb = Date.parse(b.date);
    if (isNaN(ta) && isNaN(tb)) return 0;
    if (isNaN(ta)) return 1;
    if (isNaN(tb)) return -1;
    return ta - tb;
  });
}

function buildItems(
  results: ProcessingResult[],
  documents: Array<{ id: string; name: string }>
): TimelineItem[] {
  const docMap = new Map(documents.map((d) => [d.id, d.name]));
  const items: TimelineItem[] = [];

  for (const result of results) {
    if (result.status !== 'complete' || !result.extraction) continue;
    const docName = docMap.get(result.documentId) ?? result.documentId;

    for (const entry of result.extraction.dates) {
      items.push({
        date: entry.date,
        description: entry.description,
        documentId: result.documentId,
        documentName: docName,
        docType: result.extraction.docType,
      });
    }
  }

  return toChronological(items);
}

export function EvidenceTimeline({
  results,
  documents,
}: EvidenceTimelineProps) {
  const items = buildItems(results, documents);

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="text-sm text-muted-foreground">
            No timeline events yet — process documents above to extract dates
            and facts.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="relative space-y-3 pl-6">
      {/* Vertical connector line */}
      <div className="absolute bottom-3 left-[0.5625rem] top-3 w-px bg-border" />

      {items.map((item, i) => {
        const c = colors(item.docType);
        return (
          <div key={`${item.documentId}-${i}`} className="relative">
            {/* Timeline dot */}
            <div
              className={`absolute -left-[1.0625rem] top-4 size-2.5 rounded-full ring-2 ring-background ${c.dot}`}
            />

            <Card className={`border-l-4 ${c.border}`}>
              <CardContent className="space-y-1 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className={`text-xs font-semibold ${c.badgeText}`}>
                    {item.date}
                  </span>
                  <span
                    className={`max-w-[200px] truncate rounded-full px-2 py-0.5 text-xs ${c.badge} ${c.badgeText}`}
                  >
                    {item.documentName}
                  </span>
                </div>
                <p className="text-sm leading-snug">{item.description}</p>
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
}
