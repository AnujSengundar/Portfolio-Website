import { isIP } from 'node:net';
import { env } from './config.js';
import { safeUrl } from '../shared/blog.js';
import { isPublicAddress } from './images.js';

const SEARCH_COUNT = 2;

async function tavily(path, body) {
  let response;
  try {
    response = await fetch(`https://api.tavily.com/${path}`, {
      method: body ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${env('TAVILY_API_KEY')}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
      redirect: 'error', signal: AbortSignal.timeout(body ? 20000 : 8000),
    });
  } catch (error) {
    if (error.status === 503) throw error;
    throw new Error('Tavily research could not be completed. Retry later; no paid fallback was used.');
  }
  if ([429, 432, 433].includes(response.status)) throw new Error('Tavily free quota or rate limit reached. Retry after it resets; no paid fallback was used.');
  if ([401, 403].includes(response.status)) throw new Error('Tavily rejected the API key. Check the private TAVILY_API_KEY setting.');
  if (!response.ok) throw new Error('Tavily research is unavailable. Nothing was drafted or emailed.');
  return response.json();
}

export function verifyFreeResearchUsage(data, required = SEARCH_COUNT) {
  const account = data?.account;
  if (!['free', 'researcher'].includes(String(account?.current_plan).toLowerCase()) ||
      ![0, null].includes(account?.paygo_limit) || account?.paygo_usage !== 0) {
    throw new Error('Tavily must be on the free Researcher plan with pay-as-you-go disabled. Research is paused.');
  }
  const { plan_limit: limit, plan_usage: used } = account;
  if (!Number.isFinite(limit) || !Number.isFinite(used) || used < 0 || limit <= 0 || limit > 1000) {
    throw new Error('Could not verify the Tavily free allowance. Research is paused.');
  }
  if (limit - used < required) throw new Error('Tavily free credits are exhausted. Wait for the monthly reset.');
  if (data.key?.limit != null && (!Number.isFinite(data.key.limit) || !Number.isFinite(data.key.usage) ||
      data.key.usage < 0 || data.key.limit - data.key.usage < required)) {
    throw new Error('This Tavily key has insufficient free credits. Check its usage limit.');
  }
  return { remaining: limit - used };
}

export async function checkResearchAllowance(required = SEARCH_COUNT) {
  // A null PAYGO cap does not prove billing is disabled. Require the owner's
  // explicit confirmation as well as checking the current plan and free balance.
  if (process.env.TAVILY_FREE_TIER_CONFIRMED !== 'true') {
    throw new Error('Confirm Tavily pay-as-you-go is disabled before enabling research.');
  }
  return verifyFreeResearchUsage(await tavily('usage'), required);
}

function researchUrl(value) {
  const clean = safeUrl(value);
  if (!clean) return null;
  const url = new URL(clean);
  const host = url.hostname;
  // Sources become clickable citations, never arbitrary server-side fetch targets.
  if (url.port || !host.includes('.') || /\.(?:local|localhost|internal|test)$/i.test(host) ||
      (isIP(host) && !isPublicAddress(host)) || host.startsWith('[')) return null;
  url.hash = '';
  return url.href;
}

export function researchSource(item) {
  const url = researchUrl(item?.url);
  if (!url || typeof item.content !== 'string' || item.content.trim().length < 80) return null;
  return { url, title: String(item.title || new URL(url).hostname).slice(0, 240),
    excerpt: item.content.trim().slice(0, 3500) };
}

export async function researchDraft(sources, extracts) {
  const evidenceByUrl = new Map();
  for (const [index, source] of sources.entries()) {
    const url = researchUrl(source.url);
    if (!url) throw new Error('Use public HTTPS links for regeneration sources.');
    if (evidenceByUrl.has(url)) throw new Error('Remove duplicate source links before regenerating.');
    evidenceByUrl.set(url, { ...source, excerpt: String(extracts[index] || '').trim().slice(0, 3500) });
  }
  if (evidenceByUrl.size < 2) throw new Error('Add at least two distinct sources before regenerating.');
  const pending = [...evidenceByUrl].filter(([, source]) => !source.excerpt).map(([url]) => url);
  for (let index = 0; index < pending.length; index += 20) {
    const urls = pending.slice(index, index + 20);
    await checkResearchAllowance(Math.ceil(urls.length / 5));
    const data = await tavily('extract', { urls, extract_depth: 'basic', format: 'text', timeout: 15 });
    for (const item of (Array.isArray(data.results) ? data.results : [])) {
      const source = researchSource({ url: item.url, content: item.raw_content });
      const requested = source && urls.includes(source.url) && evidenceByUrl.get(source.url);
      if (requested) requested.excerpt = source.excerpt;
    }
  }
  const missing = [...evidenceByUrl.values()].filter(source => !source.excerpt);
  if (missing.length) {
    throw new Error(`Could not read these sources. Paste an extract or replace the link: ${missing.map(source => source.title).join(', ')}`);
  }
  const evidence = [...evidenceByUrl.values()].map((source, index) => ({ id: index + 1, ...source }));
  return { searchedAt: new Date().toISOString(), sources, evidence };
}

export async function researchTopic(topic) {
  // Only the topic title goes to search. Private notes remain in the drafting request.
  const queries = [topic.title, `${topic.title} official sources research evidence`];
  const found = new Map();
  for (let index = 0; index < queries.length; index++) {
    await checkResearchAllowance(queries.length - index);
    const data = await tavily('search', {
      query: queries[index].slice(0, 400), topic: 'general', search_depth: 'basic',
      auto_parameters: false, max_results: 6, include_answer: false,
      include_raw_content: false, include_images: false, include_usage: true,
    });
    for (const item of (Array.isArray(data.results) ? data.results : [])) {
      const source = researchSource(item);
      if (source && !found.has(source.url)) found.set(source.url, source);
    }
  }
  const evidence = [...found.values()].slice(0, 8).map((source, index) => ({ id: index + 1, ...source }));
  if (evidence.length < 2) throw new Error('Research returned fewer than two usable source links. Nothing was drafted or emailed.');
  return { provider: 'tavily', searchedAt: new Date().toISOString(), queries, evidence,
    sources: evidence.map(({ title, url }) => ({ title, url })) };
}

export function resolveCitations(markdown, sources) {
  // The model chooses source numbers; the server supplies the actual URLs.
  if (typeof markdown !== 'string' || /(?:https?:\/\/|www\.|\]\s*\(|^\s*\[[^\]]+\]:|<\/?[a-z])/im.test(markdown)) {
    throw new Error('The draft included unverified links or markup. Retry the topic.');
  }
  const cited = new Set();
  const linked = markdown.replace(/\[(\d+)\]/g, (_, value) => {
    const index = Number(value) - 1;
    if (!sources[index]) throw new Error('The draft cited a source that was not researched. Retry the topic.');
    cited.add(index);
    return `[${index + 1}](<${sources[index].url}>)`;
  });
  if (cited.size < 2) throw new Error('The draft must cite at least two researched sources. Retry the topic.');
  return linked;
}
