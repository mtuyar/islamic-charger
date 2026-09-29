// Vercel serverless function: Ruhnevâz "AI ile Derinlemesine Öğren" proxy.
// Keeps the Anthropic API key on the server; the mobile app only sends word data.
//
// Deploy:  cd proxy && vercel deploy --prod
// Env:     ANTHROPIC_API_KEY (Vercel project settings)
// Then set AI_PROXY_URL=https://<your-deployment>/api/word-depth in the app's
// EAS environment (eas env:create) so app.config.js picks it up at build time.

export const config = { runtime: 'edge' };

const MAX_LEN = 120;

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return new Response('Server misconfigured', { status: 500 });

  let body: { arabic?: string; root?: string; turkish?: string; frequency?: number };
  try {
    body = await req.json();
  } catch {
    return new Response('Bad Request', { status: 400 });
  }

  const arabic = String(body.arabic ?? '').slice(0, MAX_LEN);
  const root = String(body.root ?? '').slice(0, MAX_LEN);
  const turkish = String(body.turkish ?? '').slice(0, MAX_LEN);
  const frequency = Number(body.frequency ?? 0);
  if (!arabic || !turkish) return new Response('Bad Request', { status: 400 });

  const prompt = `Arapça kelime: ${arabic}
Kök: ${root}
Temel Türkçe anlamı: ${turkish}
Kur'an'da geçme sıklığı: yaklaşık ${frequency} kez

Kısa ve öğretici bir açıklama yaz (en fazla 5 cümle):
1. Kelimenin Arapça kök anlamı nedir?
2. Kur'an'da nasıl kullanılır? Kısa bir örnek cümle veya sure/ayet referansı ver.
3. Bu kelimenin Kur'an'da geçtiği önemli bir bağlamı anlat.
4. Türkçede bu kökten türeyen bir kelime varsa belirt.
Sade, anlaşılır Türkçe kullan. Akademik değil, samimi ve öğretici bir dil.`;

  const upstream = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!upstream.ok) {
    return new Response('Upstream error', { status: 502 });
  }

  const data = await upstream.json();
  const text: string = data.content?.[0]?.text ?? '';

  return new Response(JSON.stringify({ text }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, s-maxage=2592000',
    },
  });
}
