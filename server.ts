import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface PartInput {
  partNumber?: string;
  partDescription?: string;
  quantity?: number;
}

interface GenerateStoryBody {
  roNumber?: string;
  vin?: string;
  customerName?: string;
  techNotes?: string;
  existingCause?: string;
  existingCorrection?: string;
  style?: 'CONCISE' | 'DETAILED';
  parts?: PartInput[];
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.post('/api/generate-story', async (req: Request, res: Response) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(500).json({
        error: 'Gemini API key is not configured on the server. Please add GEMINI_API_KEY in Settings > Secrets.'
      });
      return;
    }

    const body = (req.body || {}) as GenerateStoryBody;
    const parts = Array.isArray(body.parts)
      ? body.parts.filter(
          (p) => (p.partNumber && p.partNumber.trim()) || (p.partDescription && p.partDescription.trim())
        )
      : [];
    const techNotes = (body.techNotes || '').trim();
    const existingCause = (body.existingCause || '').trim();
    const existingCorrection = (body.existingCorrection || '').trim();
    const style = body.style === 'DETAILED' ? 'DETAILED' : 'CONCISE';
    const roNumber = (body.roNumber || '').trim();
    const vin = (body.vin || '').trim();

    if (parts.length === 0 && !techNotes && !existingCause && !existingCorrection) {
      res.status(400).json({
        error: 'Please enter a quick tech note, existing Cause/Correction text, or at least one part number first.'
      });
      return;
    }

    const partsText =
      parts.length > 0
        ? parts
            .map((p, idx) => {
              const pn = (p.partNumber || '').trim() || 'N/A';
              const desc = (p.partDescription || '').trim();
              const qty = p.quantity ? ` (Qty: ${p.quantity})` : '';
              return `${idx + 1}. Part #${pn}${desc ? ` - ${desc}` : ''}${qty}`;
            })
            .join('\n')
        : 'None logged';

    const styleGuidance =
      style === 'DETAILED'
        ? 'Style: DETAILED (Warranty / Thorough 3C). Cause should clearly state verification of the customer symptom and the root failure found. Correction should clearly document removal/replacement of failed components with part numbers, required fluid/system bleeding or resets if mentioned, and final verification/road test.'
        : 'Style: CONCISE (Customer Pay). Keep Cause to 1–2 crisp professional sentences and Correction to 1–3 crisp professional sentences referencing the replaced parts.';

    const prompt = [
      roNumber ? `RO #: ${roNumber}` : '',
      vin ? `VIN: ${vin}` : '',
      `Technician Quick Notes: ${techNotes || 'None'}`,
      `Existing Cause Draft (polish/preserve facts if present): ${existingCause || 'None'}`,
      `Existing Correction Draft (polish/preserve facts if present): ${existingCorrection || 'None'}`,
      `Parts Logged on RO:\n${partsText}`,
      styleGuidance
    ]
      .filter(Boolean)
      .join('\n\n');

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction:
            'You are an experienced automotive dealership technician and warranty story writer. ' +
            'Write clean, professional Cause and Correction statements ready to paste straight into a dealership DMS. ' +
            'Rules:\n' +
            '1. Do NOT include "Cause:" or "Correction:" prefixes inside the field values.\n' +
            '2. Use plain text only (no markdown asterisks, bullets, or headers).\n' +
            '3. Incorporate the provided part numbers (e.g., P/N ...) and descriptions accurately in the Correction.\n' +
            '4. STRICT FACTUAL ACCURACY: NEVER invent DTC fault codes, exact numerical measurements (mm, psi, volts, ohms, CCA), or diagnostic steps that contradict the input. Only state what is supported by the technician notes, existing draft, and parts list.\n' +
            '5. If the technician provided an Existing Cause Draft or Existing Correction Draft, refine and polish their facts into clear shop language without dropping any details they wrote.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              cause: {
                type: Type.STRING,
                description: 'Professional dealership Cause statement describing root cause of failure.'
              },
              correction: {
                type: Type.STRING,
                description: 'Professional dealership Correction statement describing repairs performed, part numbers installed, and verification.'
              }
            },
            required: ['cause', 'correction']
          }
        }
      });

      const rawText = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawText) as { cause?: string; correction?: string };

      res.json({
        cause: (parsed.cause || '').trim(),
        correction: (parsed.correction || '').trim()
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate Cause & Correction story.';
      console.error('Error generating Cause & Correction:', err);
      res.status(500).json({ error: msg });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
