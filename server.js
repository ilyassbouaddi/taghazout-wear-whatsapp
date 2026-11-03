import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '30kb' }));
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(x => x.trim()).filter(Boolean);
app.use(cors({ origin(origin, cb) {
  if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
  return cb(new Error('Origin not allowed'));
}}));
app.use('/api/', rateLimit({ windowMs: 60_000, limit: 8, standardHeaders: 'draft-7', legacyHeaders: false }));

const required = ['WHATSAPP_TOKEN', 'PHONE_NUMBER_ID', 'STORE_WHATSAPP_NUMBER', 'WHATSAPP_TEMPLATE_NAME', 'WHATSAPP_LANGUAGE', 'GRAPH_API_VERSION'];
function configMissing() { return required.filter(k => !process.env[k]); }
function clean(v, max=160) { return String(v ?? '').trim().slice(0, max); }

app.get('/health', (_req, res) => res.json({ ok: true, service: 'taghazout-wear-orders' }));
app.post('/api/orders', async (req, res) => {
  const missing = configMissing();
  if (missing.length) return res.status(503).json({ error: 'Order notifications are not configured yet.' });
  const body = req.body || {};
  const name = clean(body.name, 80);
  const phone = clean(body.phone, 10);
  const address = clean(body.address, 240);
  const items = Array.isArray(body.items) ? body.items.slice(0, 8) : [];
  const total = Number(body.total);
  if (!name || !/^[0-9]{10}$/.test(phone) || !address || !items.length || !Number.isFinite(total) || total <= 0) {
    return res.status(400).json({ error: 'Please check the order details.' });
  }
  const itemLines = items.map((it, i) => `${i+1}. ${clean(it.name,60)} / ${clean(it.color,30)} / ${clean(it.size,8)} / ${Number(it.price)||0} DH`).join('\n');
  const fields = [name, phone, address, itemLines, `${total} DH`];
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: process.env.STORE_WHATSAPP_NUMBER,
    type: 'template',
    template: {
      name: process.env.WHATSAPP_TEMPLATE_NAME,
      language: { code: process.env.WHATSAPP_LANGUAGE },
      components: [{ type: 'body', parameters: fields.map(text => ({ type: 'text', text })) }]
    }
  };
  try {
    const url = `https://graph.facebook.com/${process.env.GRAPH_API_VERSION}/${process.env.PHONE_NUMBER_ID}/messages`;
    const apiResponse = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await apiResponse.json().catch(() => ({}));
    if (!apiResponse.ok) {
      console.error('WhatsApp API error:', JSON.stringify(result));
      return res.status(502).json({ error: 'WhatsApp could not accept the notification. Check the template and API setup.' });
    }
    return res.status(200).json({ ok: true, message: 'Order notification accepted by WhatsApp.' });
  } catch (err) {
    console.error('Order send failed:', err?.message || err);
    return res.status(500).json({ error: 'Could not send the order notification.' });
  }
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`TAGHAZOUT.WEAR order API listening on ${port}`));
