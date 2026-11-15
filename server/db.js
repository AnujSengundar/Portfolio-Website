import { createClient } from '@supabase/supabase-js';
import { env, OWNER_EMAIL } from './config.js';

export function database() {
  return createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false, autoRefreshToken: false } });
}
export async function result(query) {
  const { data, error } = await query;
  if (error) {
    const known = /revision|emailed|in progress|already|not found|trial|queue|active|asset/i.test(error.message);
    throw Object.assign(new Error(known ? error.message : 'The database operation failed. Check the service configuration.'), { status: known ? 409 : 503 });
  }
  return data;
}
export async function authorize(req, db) {
  const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  if (!token) throw Object.assign(new Error('Sign in to continue.'), { status: 401 });
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user || data.user.email?.toLowerCase() !== OWNER_EMAIL || !data.user.email_confirmed_at || !data.user.identities?.some(i => i.provider === 'google')) {
    throw Object.assign(new Error('This editor is only available to the approved Google account.'), { status: 403 });
  }
  return data.user;
}
