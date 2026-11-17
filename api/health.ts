import type { IncomingMessage, ServerResponse } from 'http';

interface ApiRequest extends IncomingMessage {
  method?: string;
}

interface ApiResponse extends ServerResponse {
  status?: (code: number) => ApiResponse;
  json?: (body: unknown) => void;
}

export default function handler(req: ApiRequest, res: ApiResponse) {
  const payload = {
    ok: true,
    runtime: 'vercel',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    method: req.method || 'GET'
  };

  if (typeof res.status === 'function' && typeof res.json === 'function') {
    res.status(200).json(payload);
    return;
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}
