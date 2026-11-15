export const OWNER_EMAIL = 'ajsengundar@gmail.com';
export function env(name) {
  const value = process.env[name];
  if (!value) throw Object.assign(new Error(`Setup incomplete: ${name} is missing.`), { status: 503 });
  return value;
}
export function siteUrl() {
  const url = new URL(env('SITE_URL'));
  if (url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname)) throw new Error('SITE_URL must use HTTPS.');
  return url.origin;
}
export function publicConfig() {
  return { url: process.env.SUPABASE_URL || '', anonKey: process.env.SUPABASE_ANON_KEY || '', owner: OWNER_EMAIL };
}
