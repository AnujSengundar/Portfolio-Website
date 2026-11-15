export const CATEGORIES = ['Technology', 'Movies', 'Music', 'Novels', 'Anime', 'Other'];
export const FORMATS = ['article', 'review'];
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function safeUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    return url.href;
  } catch { return null; }
}

export function youtubeUrl(value) {
  const safe = safeUrl(value);
  if (!safe) return null;
  const url = new URL(safe);
  const host = url.hostname.replace(/^www\./, '');
  let id;
  if (host === 'youtu.be') id = url.pathname.slice(1).split('/')[0];
  else if (['youtube.com', 'm.youtube.com'].includes(host)) {
    id = url.pathname === '/watch' ? url.searchParams.get('v') : url.pathname.match(/^\/(shorts|embed|live)\/([^/]+)/)?.[2];
  }
  return /^[\w-]{11}$/.test(id || '') ? `https://www.youtube.com/watch?v=${id}` : null;
}

export function normalizeHistory(items) {
  const seen = new Set();
  return items.flatMap(item => {
    if (!item || typeof item !== 'object') return [];
    const url = youtubeUrl(item.titleUrl || item.url || '');
    if (!url || seen.has(url)) return [];
    seen.add(url);
    return [{ url, title: String(item.title || 'YouTube video').replace(/^Watched\s+/i, '').slice(0, 200), watchedAt: item.time || null }];
  });
}

export function parseHistoryJson(text) {
  const data = JSON.parse(text);
  if (!Array.isArray(data)) throw new Error('Choose the watch-history JSON file from your Takeout export.');
  return normalizeHistory(data);
}

export function parseHistoryHtml(text, browserDocument = globalThis.document) {
  if (!browserDocument) throw new Error('HTML imports require a browser.');
  // Template contents stay inert: no scripts, images, or frames execute/load.
  const template = browserDocument.createElement('template');
  template.innerHTML = text;
  return normalizeHistory([...template.content.querySelectorAll('a[href]')].map(a => ({ url: a.getAttribute('href'), title: a.textContent })));
}

export function indiaDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function plusDays(date, days = 2) {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

export function slugify(title) {
  return title.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 85) || 'article';
}

export function validateTopic(input) {
  const title = String(input.title || '').trim();
  if (title.length < 3 || title.length > 200) throw new Error('Use a topic title between 3 and 200 characters.');
  if (!CATEGORIES.includes(input.category) || !FORMATS.includes(input.format)) throw new Error('Choose a category and format.');
  const sources = (Array.isArray(input.sources) ? input.sources : []).slice(0, 12).map(s => {
    const url = safeUrl(typeof s === 'string' ? s : s.url);
    if (!url) throw new Error('Source links must use HTTPS.');
    return { url, title: String(s.title || url).slice(0, 200) };
  });
  return { title, category: input.category, format: input.format, notes: String(input.notes || '').slice(0, 10000), sources };
}

export function validateContent(input) {
  const title = String(input.title || '').trim();
  const markdown = String(input.markdown || '').trim();
  if (!title || title.length > 200 || !markdown || markdown.length > 60000) throw new Error('A title and article body are required (maximum 60,000 characters).');
  if (!CATEGORIES.includes(input.category)) throw new Error('Choose a category.');
  const sources = (Array.isArray(input.sources) ? input.sources : []).slice(0, 30).map(s => {
    const url = safeUrl(s.url);
    if (!url) throw new Error('Sources must use HTTPS.');
    return { title: String(s.title || url).slice(0, 250), url };
  });
  const images = (Array.isArray(input.images) ? input.images : []).slice(0, 10).map(i => {
    if (!UUID.test(i.assetId) || !['cover', 'inline'].includes(i.placement) || !String(i.alt || '').trim()) throw new Error('Each selected image needs alt text and a placement.');
    return { assetId: i.assetId, placement: i.placement, alt: String(i.alt).slice(0, 400), caption: String(i.caption || '').slice(0, 1000) };
  });
  if (images.filter(i => i.placement === 'cover').length > 1) throw new Error('Choose only one cover image.');
  if (new Set(images.map(i => i.assetId)).size !== images.length) throw new Error('An image can only be selected once.');
  return { title, markdown, category: input.category, excerpt: String(input.excerpt || '').slice(0, 350), sources, images };
}

export function canPublish(draft, revision) {
  return draft.revision === revision && draft.emailed_revision === revision && draft.email_status === 'sent';
}
