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

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true, hasApiKey: Boolean(process.env.GEMINI_API_KEY) });
  });

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

    const extractFriendlyError = (err: unknown): { status: number; message: string } => {
      const raw = err instanceof Error ? err.message : String(err || 'Failed to generate story.');
      if (raw.includes('TIMEOUT_EXCEEDED') || raw.toLowerCase().includes('deadline expired')) {
        return {
          status: 504,
          message: 'The AI service took too long to respond. Please try again.'
        };
      }
      try {
        const outer = JSON.parse(raw);
        const inner = outer?.error || outer;
        const code = Number(inner?.code) || 500;
        const msg = typeof inner?.message === 'string' ? inner.message : raw;
        if (code === 504 || inner?.status === 'DEADLINE_EXCEEDED' || msg.toLowerCase().includes('deadline expired')) {
          return {
            status: 504,
            message: 'The AI service took too long to respond. Please try again.'
          };
        }
        if (code === 503 || inner?.status === 'UNAVAILABLE') {
          return {
            status: 503,
            message: 'The AI writer is temporarily busy. Please click Write / Polish again in a few seconds.'
          };
        }
        if (code === 429 || inner?.status === 'RESOURCE_EXHAUSTED') {
          return {
            status: 429,
            message: 'AI usage limit reached temporarily. Please wait a moment and try again.'
          };
        }
        return { status: code >= 400 && code < 600 ? code : 500, message: msg };
      } catch {
        return { status: 500, message: raw };
      }
    };

    const callModelWithTimeout = async (ai: GoogleGenAI, modelName: string, timeoutMs: number) => {
      const timeoutPromise = new Promise<never>((_resolve, reject) => {
        setTimeout(() => reject(new Error('TIMEOUT_EXCEEDED')), timeoutMs);
      });

      const apiPromise = ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          ...(modelName === 'gemini-4-hydrogen'
            ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
            : {}),
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

      return Promise.race([apiPromise, timeoutPromise]);
    };

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          timeout: 25000,
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });

      const attempts: { model: string; delayMs: number; timeoutMs: number }[] = [
        { model: 'gemini-3.1-flash-lite', delayMs: 0, timeoutMs: 12000 },
        { model: 'gemini-4-hydrogen', delayMs: 200, timeoutMs: 15000 }
      ];

      let lastErr: unknown = null;
      let responseText = '';

      for (const attempt of attempts) {
        if (attempt.delayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, attempt.delayMs));
        }
        try {
          const response = await callModelWithTimeout(ai, attempt.model, attempt.timeoutMs);
          responseText = (response.text ?? '{}').trim();
          lastErr = null;
          break;
        } catch (err) {
          lastErr = err;
          const info = extractFriendlyError(err);
          if (info.status !== 503 && info.status !== 429 && info.status !== 504) {
            throw err;
          }
        }
      }

      if (lastErr) {
        throw lastErr;
      }

      const parsed = JSON.parse(responseText || '{}') as { cause?: string; correction?: string };

      res.json({
        cause: (parsed.cause || '').trim(),
        correction: (parsed.correction || '').trim()
      });
    } catch (err: unknown) {
      const friendly = extractFriendlyError(err);
      console.error('Error generating Cause & Correction:', err);
      res.status(friendly.status).json({ error: friendly.message });
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

  const portFlagIdx = process.argv.indexOf('--port');
  const cliPort = portFlagIdx !== -1 ? Number(process.argv[portFlagIdx + 1]) : NaN;
  const PORT = (!isNaN(cliPort) && cliPort > 0) ? cliPort : (Number(process.env.PORT) || 3000);
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
