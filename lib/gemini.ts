import { GoogleGenAI, Type } from '@google/genai';
import type { ExtractionResult } from '@/lib/store';

export interface DocumentInput {
  name: string;
  type: string;
  source: string;
  content: string;
}

// Lazily create the client so the env var is read at call time, not at module
// load time.  A module-level singleton evaluated before Next.js has populated
// process.env would receive `undefined` for the key; GoogleGenAI constructs
// without throwing but later fails with a misleading GCP credentials error.
let _ai: GoogleGenAI | null = null;

function getAI(): GoogleGenAI {
  if (_ai) return _ai;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY environment variable is not set. ' +
        'Add it to your .env file and restart the dev server.'
    );
  }
  _ai = new GoogleGenAI({ apiKey });
  return _ai;
}

const EXTRACTION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    facts: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Key facts relevant to the insurance claim',
    },
    dates: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          date: {
            type: Type.STRING,
            description: 'ISO 8601 date or partial date string',
          },
          description: {
            type: Type.STRING,
            description: 'What occurred on this date',
          },
        },
        required: ['date', 'description'],
      },
      description: 'All dates mentioned in the document with context',
    },
    people: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Full names of people mentioned',
    },
    amounts: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          value: {
            type: Type.STRING,
            description: 'The monetary or numeric value',
          },
          description: {
            type: Type.STRING,
            description: 'What this amount represents',
          },
        },
        required: ['value', 'description'],
      },
      description: 'Monetary amounts and significant numeric values',
    },
    relevance: {
      type: Type.NUMBER,
      description: 'Relevance score for this claim: 1 (low) to 10 (high)',
    },
    docType: {
      type: Type.STRING,
      description:
        'Document type: email, invoice, medical_report, police_report, photo, legal_document, correspondence, note, or other',
    },
    summary: {
      type: Type.STRING,
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
  propertyOrdering: [
    'facts',
    'dates',
    'people',
    'amounts',
    'relevance',
    'docType',
    'summary',
  ],
};

export async function extractDocumentData(
  doc: DocumentInput
): Promise<ExtractionResult> {
  const prompt =
    `You are an insurance claims analyst. Extract all relevant evidence from the document below.\n\n` +
    `Filename: ${doc.name}\nType: ${doc.type}\nSource: ${doc.source}\n\n` +
    `Document Content:\n${doc.content}`;

  const response = await getAI().models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseJsonSchema: EXTRACTION_SCHEMA,
    },
  });

  const text = response.text;
  if (!text)
    throw new Error(
      'Gemini returned an empty response — model may have been blocked by a safety filter'
    );
  return JSON.parse(text) as ExtractionResult;
}
