import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)));
const PORT = Number(process.env.PORT || 4321);
const SESSION_TTL_MS = 1000 * 60 * 60 * 8;
const SESSION_COOKIE = 'meridiano_session';
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';
const IS_PROD = process.env.NODE_ENV === 'production';
const DEFAULT_CLIENT_ID = 'client-it-group';

const users = [
  {
    username: ADMIN_USER,
    password: ADMIN_PASSWORD,
    role: 'admin',
    company: 'Meridiano Operations',
    clientId: null,
  },
  {
    username: process.env.CLIENT_USER || 'cliente',
    password: process.env.CLIENT_PASSWORD || 'cliente',
    role: 'client',
    company: 'Italia Group LLC',
    clientId: DEFAULT_CLIENT_ID,
  },
];

const clients = [
  { id: DEFAULT_CLIENT_ID, company: 'Italia Group LLC', contact: 'cliente@italia-group.example' },
  { id: 'client-sunshine', company: 'Sunshine Import LLC', contact: 'ops@sunshine.example' },
];

const sessions = new Map();
const loginAttempts = new Map();

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const mailItems = [
  {
    id: 'DOC-2026-0604-014',
    clientId: DEFAULT_CLIENT_ID,
    publicationStatus: 'published',
    initials: 'FL',
    sender: 'Florida Department of State',
    subject: 'Annual Report reminder',
    summary: 'Annual Report reminder per Italia Group LLC. Scadenza operativa: 1 maggio.',
    receivedAt: '2026-06-04T09:42:00+02:00',
    status: 'urgent',
    documentType: 'Avviso statale',
    confidenceScore: 98,
    detailTitle: 'Annual Report reminder',
    previewTitle: 'Annual Report Notice',
    previewBody: 'Italia Group LLC\nSarasota, FL',
    assignmentReason: 'Documento assegnato a Italia Group LLC tramite corrispondenza esatta su ragione sociale, indirizzo registered agent e storico annual report.',
    control: 'Automatico, alta confidenza',
  },
  {
    id: 'DOC-2026-0603-009',
    clientId: DEFAULT_CLIENT_ID,
    publicationStatus: 'published',
    initials: 'IRS',
    sender: 'Internal Revenue Service',
    subject: 'Conferma ricezione comunicazione fiscale federale',
    summary: "Conferma ricezione comunicazione fiscale federale collegata all'EIN aziendale.",
    receivedAt: '2026-06-03T16:15:00+02:00',
    status: 'new',
    documentType: 'IRS / fiscale',
    confidenceScore: 96,
    detailTitle: 'Conferma IRS',
    previewTitle: 'IRS Notice',
    previewBody: 'Italia Group LLC\nFederal tax correspondence',
    assignmentReason: 'Documento assegnato tramite corrispondenza tra EIN aziendale, ragione sociale e storico fiscale del cliente.',
    control: 'Automatico, alta confidenza',
  },
  {
    id: 'DOC-2026-0531-021',
    clientId: DEFAULT_CLIENT_ID,
    publicationStatus: 'published',
    initials: 'BK',
    sender: 'Relay Financial',
    subject: 'Comunicazione bancaria ordinaria',
    summary: 'Comunicazione bancaria ordinaria per il conto business.',
    receivedAt: '2026-05-31T11:08:00+02:00',
    status: 'new',
    documentType: 'Banca',
    confidenceScore: null,
    reviewedByAdmin: true,
    detailTitle: 'Comunicazione bancaria',
    previewTitle: 'Relay Financial',
    previewBody: 'Italia Group LLC\nBusiness account notice',
    assignmentReason: 'Documento pubblicato dopo revisione manuale amministratore per confermare intestazione e riferimenti conto.',
    control: 'Approvata da admin',
  },
  {
    id: 'DOC-2026-0518-006',
    clientId: DEFAULT_CLIENT_ID,
    publicationStatus: 'published',
    initials: 'RA',
    sender: 'Registered Agent Office',
    subject: 'Nota interna di scansione',
    summary: 'Nota interna di conferma scansione e archiviazione documento societario.',
    receivedAt: '2026-05-18T10:30:00+02:00',
    status: 'read',
    documentType: 'Amministrativo',
    confidenceScore: 100,
    detailTitle: 'Nota di archiviazione',
    previewTitle: 'Scan Confirmation',
    previewBody: 'Italia Group LLC\nDocument archived',
    assignmentReason: 'Documento interno associato direttamente al fascicolo cliente.',
    control: 'Automatico, alta confidenza',
  },
  {
    id: 'DOC-2026-0604-022',
    clientId: null,
    publicationStatus: 'needs_review',
    initials: 'CT',
    sender: 'County Clerk',
    subject: 'Notifica legale con OCR incerto',
    summary: 'Documento sensibile con ragione sociale parzialmente leggibile. Richiede revisione manuale prima della pubblicazione.',
    receivedAt: '2026-06-04T12:10:00+02:00',
    status: 'review',
    documentType: 'Legale',
    confidenceScore: 61,
    detailTitle: 'Notifica legale da verificare',
    previewTitle: 'County Clerk Notice',
    previewBody: '... Group LLC\nRegistered Agent address',
    assignmentReason: 'OCR incompleto: nome società simile a due clienti. In standby fino ad approvazione admin.',
    control: 'Standby, revisione manuale richiesta',
  },
  {
    id: 'DOC-2026-0602-018',
    clientId: 'client-sunshine',
    publicationStatus: 'published',
    initials: 'TX',
    sender: 'Florida Department of Revenue',
    subject: 'Sales tax correspondence',
    summary: 'Comunicazione fiscale associata a Sunshine Import LLC.',
    receivedAt: '2026-06-02T14:20:00+02:00',
    status: 'new',
    documentType: 'IRS / fiscale',
    confidenceScore: 94,
    detailTitle: 'Sales tax correspondence',
    previewTitle: 'Department of Revenue',
    previewBody: 'Sunshine Import LLC\nTax correspondence',
    assignmentReason: 'Documento visibile solo al cliente Sunshine Import LLC.',
    control: 'Automatico, alta confidenza',
  },
];

function securityHeaders(extra = {}) {
  const headers = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    'Cross-Origin-Resource-Policy': 'same-origin',
    // Inline styles/scripts are still present in the static prototype; remove unsafe-inline during the app refactor.
    'Content-Security-Policy': "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; img-src 'self' data: https://example.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self' 'unsafe-inline'; connect-src 'self'",
    ...extra,
  };
  if (IS_PROD) headers['Strict-Transport-Security'] = 'max-age=63072000; includeSubDomains; preload';
  return headers;
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  return Object.fromEntries(
    header
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const idx = part.indexOf('=');
        if (idx === -1) return [part, ''];
        return [part.slice(0, idx), decodeURIComponent(part.slice(idx + 1))];
      })
  );
}

function getSession(req) {
  const token = parseCookies(req)[SESSION_COOKIE];
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    sessions.delete(token);
    return null;
  }
  return { token, ...session };
}

function findUser(username, password) {
  return users.find((user) => safeEqual(username, user.username) && safeEqual(password, user.password));
}

function publicUser(user) {
  return {
    username: user.username,
    role: user.role,
    company: user.company,
    clientId: user.clientId,
  };
}

function createSession(user) {
  const token = randomBytes(32).toString('base64url');
  sessions.set(token, {
    user: publicUser(user),
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_TTL_MS,
  });
  return token;
}

function sessionCookie(token) {
  const secure = IS_PROD ? '; Secure' : '';
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL_MS / 1000}${secure}`;
}

function clearSessionCookie() {
  const secure = IS_PROD ? '; Secure' : '';
  return `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`;
}

function json(res, status, body, headers = {}) {
  res.writeHead(status, {
    ...securityHeaders({
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...headers,
    }),
  });
  res.end(JSON.stringify(body));
}

function redirect(res, location) {
  res.writeHead(302, securityHeaders({ Location: location, 'Cache-Control': 'no-store' }));
  res.end();
}

function notFound(res) {
  res.writeHead(404, securityHeaders({ 'Content-Type': 'text/plain; charset=utf-8' }));
  res.end('Not found');
}

function isRateLimited(req) {
  const ip = req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 1000 * 60 * 10;
  const current = loginAttempts.get(ip) || { count: 0, resetAt: now + windowMs };
  if (current.resetAt <= now) {
    loginAttempts.set(ip, { count: 1, resetAt: now + windowMs });
    return false;
  }
  current.count += 1;
  loginAttempts.set(ip, current);
  return current.count > 20;
}

function resetRateLimit(req) {
  loginAttempts.delete(req.socket.remoteAddress || 'unknown');
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 1024 * 32) throw new Error('Payload too large');
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('application/json')) return JSON.parse(raw);
  return Object.fromEntries(new URLSearchParams(raw));
}

function resolveStaticPath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const normalized = normalize(decoded).replace(/^(\.\.[/\\])+/, '');
  const relativePath = normalized === '/' ? '/index.html' : normalized;
  if (relativePath.includes('\0') || relativePath.split('/').some((part) => part.startsWith('.'))) {
    return null;
  }
  const absolutePath = join(ROOT, relativePath);
  if (!absolutePath.startsWith(ROOT)) return null;
  return absolutePath;
}

function serveStatic(req, res) {
  const session = getSession(req);
  const pathName = new URL(req.url, `http://${req.headers.host}`).pathname;
  if (pathName === '/admin.html' && (!session || session.user.role !== 'admin')) {
    redirect(res, '/login.html?next=admin.html');
    return;
  }
  if (pathName === '/corrispondenza-cliente.html' && (!session || session.user.role !== 'client')) {
    redirect(res, '/login.html?next=corrispondenza-cliente.html');
    return;
  }

  const filePath = resolveStaticPath(pathName);
  if (!filePath || !existsSync(filePath) || !statSync(filePath).isFile()) {
    notFound(res);
    return;
  }

  const ext = extname(filePath);
  const isPrivate = filePath.endsWith('login.html') || filePath.endsWith('corrispondenza-cliente.html') || filePath.endsWith('admin.html');
  res.writeHead(200, {
    ...securityHeaders({
      'Content-Type': contentTypes[ext] || 'application/octet-stream',
      'Cache-Control': isPrivate ? 'no-store' : 'public, max-age=300',
    }),
  });
  createReadStream(filePath).pipe(res);
}

function requireSession(req, res) {
  const session = getSession(req);
  if (!session) {
    json(res, 401, { ok: false });
    return null;
  }
  return session;
}

function findMailItem(id) {
  return mailItems.find((item) => item.id === id);
}

function canAccessMail(session, item) {
  if (!session || !item) return false;
  if (session.user.role === 'admin') return true;
  return item.publicationStatus === 'published' && item.clientId === session.user.clientId;
}

function clientMailItems(session) {
  if (session.user.role === 'admin') return mailItems;
  return mailItems.filter((item) => canAccessMail(session, item));
}

function reviewQueueCount(session = null) {
  if (session?.user.role === 'client') {
    return mailItems.filter((item) => item.publicationStatus === 'needs_review' && item.clientId === session.user.clientId).length;
  }
  return mailItems.filter((item) => item.publicationStatus === 'needs_review').length;
}

function csvEscape(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function sendArchiveCsv(req, res) {
  const session = requireSession(req, res);
  if (!session) return;
  const header = ['id', 'sender', 'subject', 'receivedAt', 'status', 'documentType', 'confidenceScore'];
  const rows = clientMailItems(session).map((item) => header.map((key) => csvEscape(item[key])).join(','));
  res.writeHead(200, securityHeaders({
    'Content-Type': 'text/csv; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Disposition': 'attachment; filename="meridiano-corrispondenza.csv"',
  }));
  res.end([header.join(','), ...rows].join('\n'));
}

function sendPdf(req, res, id) {
  const session = requireSession(req, res);
  if (!session) return;
  const item = findMailItem(id);
  if (!item || !canAccessMail(session, item)) {
    notFound(res);
    return;
  }
  const pdfText = [item.sender, item.detailTitle, item.id, item.summary]
    .join(' | ')
    .replace(/[()\\]/g, '');
  const stream = `BT /F1 16 Tf 72 720 Td (${pdfText}) Tj ET`;
  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n',
    `4 0 obj << /Length ${Buffer.byteLength(stream)} >> stream\n${stream}\nendstream endobj\n`,
    '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n',
  ];
  let body = '%PDF-1.4\n';
  const offsets = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(body));
    body += object;
  }
  const xrefOffset = Buffer.byteLength(body);
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  body += offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
  body += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  res.writeHead(200, securityHeaders({
    'Content-Type': 'application/pdf',
    'Cache-Control': 'no-store',
    'Content-Disposition': `inline; filename="${item.id}.pdf"`,
  }));
  res.end(body);
}

async function handleApi(req, res, pathName) {
  if (pathName === '/api/login' && req.method === 'POST') {
    if (isRateLimited(req)) {
      json(res, 429, { ok: false, error: 'Troppi tentativi. Riprova più tardi.' });
      return;
    }
    try {
      const body = await readBody(req);
      const user = findUser(body.username || '', body.password || '');
      if (user) {
        resetRateLimit(req);
        const token = createSession(user);
        const next = user.role === 'admin' ? 'admin.html' : 'corrispondenza-cliente.html';
        json(res, 200, { ok: true, user: publicUser(user), next }, {
          'Set-Cookie': sessionCookie(token),
        });
        return;
      }
      json(res, 401, { ok: false, error: 'Credenziali non valide.' });
    } catch (error) {
      json(res, 400, { ok: false, error: 'Richiesta non valida.' });
    }
    return;
  }

  if (pathName === '/api/logout' && req.method === 'POST') {
    const session = getSession(req);
    if (session) sessions.delete(session.token);
    json(res, 200, { ok: true }, { 'Set-Cookie': clearSessionCookie() });
    return;
  }

  if (pathName === '/api/session' && req.method === 'GET') {
    const session = getSession(req);
    if (!session) {
      json(res, 401, { ok: false });
      return;
    }
    json(res, 200, { ok: true, user: session.user });
    return;
  }

  if (pathName === '/api/mail' && req.method === 'GET') {
    const session = requireSession(req, res);
    if (!session) return;
    json(res, 200, {
      ok: true,
      company: session.user.company,
      items: clientMailItems(session),
      reviewQueueCount: reviewQueueCount(session),
    });
    return;
  }

  if (pathName === '/api/admin/mail' && req.method === 'GET') {
    const session = requireSession(req, res);
    if (!session) return;
    if (session.user.role !== 'admin') {
      json(res, 403, { ok: false, error: 'Accesso negato.' });
      return;
    }
    json(res, 200, {
      ok: true,
      clients,
      items: mailItems,
      reviewQueueCount: reviewQueueCount(session),
    });
    return;
  }

  if (pathName === '/api/admin/mail/assign' && req.method === 'POST') {
    const session = requireSession(req, res);
    if (!session) return;
    if (session.user.role !== 'admin') {
      json(res, 403, { ok: false, error: 'Accesso negato.' });
      return;
    }
    try {
      const body = await readBody(req);
      const item = findMailItem(body.mailId);
      const client = clients.find((entry) => entry.id === body.clientId);
      if (!item || !client) {
        json(res, 400, { ok: false, error: 'Documento o cliente non valido.' });
        return;
      }
      item.clientId = client.id;
      item.publicationStatus = body.publish ? 'published' : 'needs_review';
      item.reviewedByAdmin = true;
      item.control = body.publish ? `Assegnata e pubblicata da ${session.user.username}` : `Assegnata a ${client.company}, in attesa di pubblicazione`;
      item.assignmentReason = `Revisione manuale admin: documento assegnato a ${client.company}.`;
      json(res, 200, { ok: true, item });
    } catch (error) {
      json(res, 400, { ok: false, error: 'Richiesta non valida.' });
    }
    return;
  }

  if (pathName === '/api/admin/mail/publish' && req.method === 'POST') {
    const session = requireSession(req, res);
    if (!session) return;
    if (session.user.role !== 'admin') {
      json(res, 403, { ok: false, error: 'Accesso negato.' });
      return;
    }
    try {
      const body = await readBody(req);
      const item = findMailItem(body.mailId);
      if (!item || !item.clientId) {
        json(res, 400, { ok: false, error: 'Documento non assegnato.' });
        return;
      }
      item.publicationStatus = 'published';
      item.reviewedByAdmin = true;
      item.control = `Pubblicata da ${session.user.username}`;
      json(res, 200, { ok: true, item });
    } catch (error) {
      json(res, 400, { ok: false, error: 'Richiesta non valida.' });
    }
    return;
  }

  if (pathName === '/api/mail/archive.csv' && req.method === 'GET') {
    sendArchiveCsv(req, res);
    return;
  }

  const pdfMatch = pathName.match(/^\/api\/mail\/([^/]+)\.pdf$/);
  if (pdfMatch && req.method === 'GET') {
    sendPdf(req, res, decodeURIComponent(pdfMatch[1]));
    return;
  }

  if ((pathName === '/api/support' || pathName === '/api/report-issue') && req.method === 'POST') {
    const session = requireSession(req, res);
    if (!session) return;
    try {
      const body = await readBody(req);
      const item = findMailItem(body.mailId);
      if (!body.mailId || !item || !canAccessMail(session, item)) {
        json(res, 400, { ok: false, error: 'Documento non valido.' });
        return;
      }
      const message = String(body.message || '').trim();
      if (message.length < 4) {
        json(res, 400, { ok: false, error: 'Inserisci un messaggio più dettagliato.' });
        return;
      }
      json(res, 200, {
        ok: true,
        ticketId: `TKT-${Date.now().toString(36).toUpperCase()}`,
      });
    } catch (error) {
      json(res, 400, { ok: false, error: 'Richiesta non valida.' });
    }
    return;
  }

  notFound(res);
}

const server = createServer(async (req, res) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (pathname.startsWith('/api/')) {
      await handleApi(req, res, pathname);
      return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      json(res, 405, { ok: false, error: 'Metodo non consentito.' });
      return;
    }
    serveStatic(req, res);
  } catch (error) {
    console.error(error);
    json(res, 500, { ok: false, error: 'Errore interno.' });
  }
});

server.listen(PORT, () => {
  console.log(`Meridiano backend running on http://localhost:${PORT}`);
  console.log(`Admin login: ${ADMIN_USER} / ${ADMIN_PASSWORD}`);
  console.log('Client login: cliente / cliente');
});
