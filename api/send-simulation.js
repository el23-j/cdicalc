const ALLOWED_MODULES = new Set(['net2brut', 'cdi', 'cdd', 'depart', 'cnss', 'igr']);
const REQUIRED_ENV = [
  'BREVO_API_KEY',
  'BREVO_SENDER_EMAIL',
  'BREVO_SENDER_NAME',
  'AIRTABLE_TOKEN',
  'AIRTABLE_BASE_ID',
  'AIRTABLE_TABLE'
];

const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  }
});

function getCorsHeaders(origin) {
  const headers = {
    'cache-control': 'no-store',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'Content-Type',
    vary: 'Origin'
  };

  if (origin && (!process.env.APP_ORIGIN || origin === process.env.APP_ORIGIN)) {
    headers['access-control-allow-origin'] = origin;
  }

  return headers;
}

const jsonWithCors = (status, body, origin) => new Response(JSON.stringify(body), {
  status,
  headers: {
    ...getCorsHeaders(origin),
    'content-type': 'application/json; charset=utf-8'
  }
});

const sanitizeText = (value = '', max = 120) =>
  String(value).replace(/[<>"'`]/g, '').trim().slice(0, max);

function sanitizeEmail(value = '') {
  const email = String(value).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Email invalide');
  }
  return email;
}

function getRequiredEnv() {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Variables manquantes: ${missing.join(', ')}`);
  }
}

async function enforceRateLimit(key) {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return;
  }

  const response = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify([
      ['INCR', `lead:${key}`],
      ['EXPIRE', `lead:${key}`, 600]
    ])
  });

  if (!response.ok) {
    throw new Error('Rate limit indisponible');
  }

  const data = await response.json();
  const count = Number(Array.isArray(data) && data[0] ? data[0].result : 0);
  if (count > 3) {
    throw new Error('Trop de demandes, réessayez plus tard');
  }
}

async function sendBrevoEmail({ email, name, payload }) {
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': process.env.BREVO_API_KEY
    },
    body: JSON.stringify({
      sender: {
        email: process.env.BREVO_SENDER_EMAIL,
        name: process.env.BREVO_SENDER_NAME
      },
      to: [{ email, name: name || 'Utilisateur' }],
      subject: `Votre simulation HuquqPro - ${payload.moduleId.toUpperCase()}`,
      htmlContent: String(payload.document.htmlEmail || '').slice(0, 120000),
      attachment: [{
        name: sanitizeText(payload.document.pdfFilename || 'simulation.pdf', 80).replace(/[^\w.-]/g, '_'),
        content: String(payload.document.base64Pdf || '').trim()
      }]
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || 'Erreur Brevo');
  }
}

async function saveLead({ email, name, payload }) {
  const total = Number(payload?.simulation?.result?.total || 0);

  await fetch(
    `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${encodeURIComponent(process.env.AIRTABLE_TABLE)}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        records: [{
          fields: {
            Nom: name || '—',
            Email: email,
            Module: payload.moduleId,
            'Total (MAD)': total,
            Date: new Date().toISOString().split('T')[0],
            Statut: 'Nouveau'
          }
        }]
      })
    }
  ).catch(() => null);
}

export default async function handler(request) {
  const origin = request.headers.get('origin');

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(origin)
    });
  }

  if (request.method !== 'POST') {
    return jsonWithCors(405, { error: 'Method not allowed' }, origin);
  }

  if ((Number(request.headers.get('content-length')) || 0) > 2_000_000) {
    return jsonWithCors(413, { error: 'Payload too large' }, origin);
  }

  try {
    getRequiredEnv();

    if (process.env.APP_ORIGIN && origin && origin !== process.env.APP_ORIGIN) {
      return jsonWithCors(403, { error: 'Origin denied' }, origin);
    }

    const payload = await request.json();
    if (payload?.lead?.website) {
      return jsonWithCors(202, { ok: true }, origin);
    }

    if (!ALLOWED_MODULES.has(payload?.moduleId)) {
      return jsonWithCors(400, { error: 'Module invalide' }, origin);
    }

    const email = sanitizeEmail(payload?.lead?.email);
    const name = sanitizeText(payload?.lead?.name, 80);
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

    const base64Pdf = String(payload?.document?.base64Pdf || '').trim();
    const htmlEmail = String(payload?.document?.htmlEmail || '').trim();
    if (!base64Pdf || !htmlEmail) {
      return jsonWithCors(400, { error: 'Document invalide' }, origin);
    }

    await enforceRateLimit(`${ip}:${email}`);
    await sendBrevoEmail({ email, name, payload });
    await saveLead({ email, name, payload });

    return jsonWithCors(200, { ok: true }, origin);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur serveur';
    const status = /Trop de demandes/.test(message) ? 429 : /Email invalide/.test(message) ? 400 : (/Document invalide/.test(message) || /Module invalide/.test(message) ? 400 : 500);
    const safeMessage = status >= 500 ? "Une erreur est survenue lors de l'envoi. Veuillez réessayer." : message;
    return jsonWithCors(status, { error: safeMessage }, origin);
  }
};

export const config = {
  runtime: 'edge'
};
