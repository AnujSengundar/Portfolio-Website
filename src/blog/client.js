let auth, authPromise;
export async function authClient() {
  if (auth) return auth;
  if (authPromise) return authPromise;
  authPromise = createAuthClient().finally(() => { authPromise = undefined; });
  return authPromise;
}
async function createAuthClient() {
  const response=await fetch('/api/blog?action=config');
  if (!response.ok || !response.headers.get('content-type')?.includes('json')) throw new Error('The editor needs the Vercel backend. Use the deployed site or the full local preview.');
  const config=await response.json();
  if (!config.url || !config.anonKey) throw new Error('The private editor is not connected yet. Complete the Supabase setup first.');
  const { createClient } = await import('@supabase/supabase-js');
  auth=createClient(config.url,config.anonKey);
  return auth;
}
export async function api(action, body, params = {}, privateRequest = true) {
  const headers={};
  if (privateRequest) {
    const client=await authClient();
    const {data}=await client.auth.getSession();
    if (!data.session) throw new Error('Sign in to continue.');
    headers.Authorization=`Bearer ${data.session.access_token}`;
  }
  if (body!==undefined) headers['Content-Type']='application/json';
  const response=await fetch(`/api/blog?${new URLSearchParams({action,...params})}`,{method:body===undefined?'GET':'POST',headers,...(body!==undefined?{body:JSON.stringify(body)}:{})});
  if (!response.headers.get('content-type')?.includes('json')) throw new Error('Blog service unavailable. Use the deployed site or full local preview.');
  const data=await response.json();
  if (!response.ok) throw new Error(data.error||'The request failed.');
  return data;
}
export function assetUrl(id, slug) {
  return `/api/blog?${new URLSearchParams({action:'asset',id,...(slug?{post:slug}:{})})}`;
}
export async function privateAsset(id) {
  const client=await authClient();
  const {data}=await client.auth.getSession();
  const response=await fetch(assetUrl(id),{headers:{Authorization:`Bearer ${data.session?.access_token}`}});
  if (!response.ok) throw new Error('Image unavailable.');
  return URL.createObjectURL(await response.blob());
}
