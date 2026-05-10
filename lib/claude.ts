import Anthropic from '@anthropic-ai/sdk';
import type { ExtractionResult } from '@/lib/store';

export interface DocumentInput {
  name: string;
  type: string;
  source: string;
  content: string;
}

// Singleton client — reads ANTHROPIC_API_KEY from env automatically
const client = new Anthropic();

// Stable tool definition — no volatile fields, so the system prompt can be cached
const EXTRACTION_TOOL: Anthropic.Tool = {
  name: 'extract_document_data',
  description: 'Extract structured claim evidence from a document.',
  input_schema: {
    type: 'object',
    properties: {
      facts: {
        type: 'array',
        items: { type: 'string' },
        description: 'Key facts relevant to the insurance claim',
      },
      dates: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            date: {
              type: 'string',
              description: 'ISO 8601 date or partial date string',
            },
            description: {
              type: 'string',
              description: 'What occurred on this date',
            },
          },
          required: ['date', 'description'],
        },
        description: 'All dates mentioned in the document with context',
      },
      people: {
        type: 'array',
        items: { type: 'string' },
        description: 'Full names of people mentioned',
      },
      amounts: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            value: {
              type: 'string',
              description: 'The monetary or numeric value',
            },
            description: {
              type: 'string',
              description: 'What this amount represents',
            },
          },
          required: ['value', 'description'],
        },
        description: 'Monetary amounts and significant numeric values',
      },
      relevance: {
        type: 'number',
        description: 'Relevance score for this claim: 1 (low) to 10 (high)',
        minimum: 1,
        maximum: 10,
      },
      docType: {
        type: 'string',
        enum: [
          'email',
          'invoice',
          'medical_report',
          'police_report',
          'photo',
          'legal_document',
          'correspondence',
          'note',
          'other',
        ],
        description: 'The classified document type',
      },
      summary: {
        type: 'string',
        description:
          '2-3 sentence summary of the document and its relevance to the claim',
      },
    },
    required: [
      'facts',
      'dates',
      'people',
      'amounts',
      'relevance',
      'docType',
      'summary',
    ],
  },
};

// Stable system prompt — cached with ephemeral cache_control
const SYSTEM_PROMPT =
  'You are an insurance claims analyst specialising in evidence extraction. ' +
  'Analyse documents thoroughly and extract all information relevant to insurance claims. ' +
  'Always call the extract_document_data tool with your complete findings.';

export async function extractDocumentData(
  doc: DocumentInput
): Promise<ExtractionResult> {
  const response = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 4096,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'high' },
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    tools: [EXTRACTION_TOOL],
    tool_choice: { type: 'any' },
    messages: [
      {
        role: 'user',
        content:
          `Analyse this document and extract all relevant claim evidence.\n\n` +
          `Filename: ${doc.name}\nType: ${doc.type}\nSource: ${doc.source}\n\n` +
          `Document Content:\n${doc.content}`,
      },
    ],
  });

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
  );

  if (!toolUse) {
    throw new Error('Claude did not return extraction results');
  }

  return toolUse.input as ExtractionResult;
}
