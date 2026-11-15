import { lookup } from 'node:dns/promises';
import https from 'node:https';
import { isIP } from 'node:net';
import { safeUrl } from '../shared/blog.js';

export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
export function imageMime(bytes) {
  if (bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return 'image/png';
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg';
  if (bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP') return 'image/webp';
  throw new Error('Only JPEG, PNG, and WebP images are supported.');
}
export function isPublicAddress(ip) {
  // Use only public IPv4 for outbound image downloads; reject all other address forms.
  if (isIP(ip) !== 4) return false;
  const [a,b] = ip.split('.').map(Number);
  return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && [0,168].includes(b)) ||
    (a === 198 && [18,19,51].includes(b)) || (a === 203 && b === 0));
}

export async function downloadImage(input, redirects = 0) {
  if (!safeUrl(input)) throw new Error('Images must use public HTTPS URLs.');
  const url = new URL(input);
  if (url.port && url.port !== '443') throw new Error('Unsupported image URL port.');
  const addresses = await lookup(url.hostname, { all: true, family: 4 });
  if (!addresses.length || addresses.some(a => !isPublicAddress(a.address))) throw new Error('Private network URLs are not allowed.');
  // Pin the validated address for this connection, including TLS hostname validation.
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      lookup: (_host, options, callback) => options.all
        ? callback(null, [{address: addresses[0].address, family: 4}])
        : callback(null, addresses[0].address, 4),
      headers: { 'User-Agent': 'AnujPortfolio/1.0' }
    }, response => {
      if ([301,302,303,307,308].includes(response.statusCode)) {
        response.resume();
        if (redirects >= 3 || !response.headers.location) return reject(new Error('Too many image redirects.'));
        downloadImage(new URL(response.headers.location, url).href, redirects + 1).then(resolve, reject);
        return;
      }
      if (response.statusCode !== 200) { response.resume(); return reject(new Error('The image host did not return an image.')); }
      let size = 0; const chunks = [];
      response.on('data', chunk => {
        size += chunk.length;
        if (size > MAX_IMAGE_BYTES) { req.destroy(new Error('Images must be smaller than 3 MB.')); return; }
        chunks.push(chunk);
      });
      response.on('error', reject);
      response.on('end', () => {
        try { const bytes = Buffer.concat(chunks); resolve({ bytes, mime: imageMime(bytes) }); } catch (e) { reject(e); }
      });
    });
    req.setTimeout(15000, () => req.destroy(new Error('Image download timed out.')));
    req.on('error', reject);
  });
}

const LICENSES = ['cc0', 'pdm', 'by', 'by-sa'];
export async function openverse(path) {
  const response = await fetch(`https://api.openverse.org/v1/images/${path}`, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error('Image search is temporarily unavailable. Try an upload instead.');
  return response.json();
}
export function imageCandidate(item) {
  if (!LICENSES.includes(item.license) || !safeUrl(item.url) || !safeUrl(item.foreign_landing_url) || !safeUrl(item.license_url)) return null;
  return { id: item.id, title: item.title, url: item.url, thumbnail: safeUrl(item.thumbnail) || item.url,
    creator: item.creator || 'Unknown creator', sourceUrl: item.foreign_landing_url,
    license: item.license, licenseUrl: item.license_url };
}
