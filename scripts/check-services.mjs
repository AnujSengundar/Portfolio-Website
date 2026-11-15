import { loadEnv } from 'vite';
import nodemailer from 'nodemailer';

const config = loadEnv('development', process.cwd(), '');
Object.assign(process.env, config);
const { checkResearchAllowance } = await import('../server/research.js');
const timeout = () => AbortSignal.timeout(20000);
const checks = await Promise.allSettled([
  (async () => {
    const response = await fetch(`${config.SUPABASE_URL}/rest/v1/blog_settings?select=schedule_enabled,trial_completed`, {
      headers: { apikey: config.SUPABASE_SERVICE_ROLE_KEY }, signal: timeout()
    });
    return { service: 'Database', connected: response.ok, status: response.status };
  })(),
  (async () => {
    const response = await fetch(`${config.SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: config.SUPABASE_ANON_KEY }, signal: timeout()
    });
    const data = response.ok ? await response.json() : {};
    return { service: 'Google sign-in', enabled: data.external?.google === true, status: response.status };
  })(),
  (async () => {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${config.GEMINI_MODEL || 'gemini-3.5-flash-lite'}`, {
      headers: { 'x-goog-api-key': config.GEMINI_API_KEY }, signal: timeout()
    });
    return { service: 'Gemini model metadata (generation requires a trial)', connected: response.ok, status: response.status };
  })(),
  (async () => {
    const transport = nodemailer.createTransport({ host: 'smtp.gmail.com', port: 465, secure: true,
      auth: { user: config.GMAIL_USER, pass: config.GMAIL_APP_PASSWORD?.replace(/\s/g, '') }, connectionTimeout: 15000, socketTimeout: 20000 });
    try { return { service: 'Gmail SMTP', connected: await transport.verify(), emailSent: false }; }
    finally { transport.close(); }
  })(),
  (async () => ({ service: 'Tavily free research', connected: true, ...await checkResearchAllowance() }))()
]);
checks.forEach((result, index) => console.log(JSON.stringify(result.status === 'fulfilled' ? result.value : {
  service: ['Database', 'Google sign-in', 'Gemini model metadata', 'Gmail SMTP', 'Tavily free research'][index], connected: false,
  error: result.reason?.code || 'Connection failed'
})));
