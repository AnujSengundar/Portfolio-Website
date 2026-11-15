import { loadEnv } from 'vite';
import { createHash } from 'node:crypto';
Object.assign(process.env, loadEnv('development', process.cwd(), ''));
const { database, result } = await import('../server/db.js');
const { generate, writeDraft, draftWordCount } = await import('../server/generate.js');
const { sendReview } = await import('../server/email.js');
const db = database();
const title = 'Why human review matters in AI-assisted blogging';
const dedupe_key = createHash('sha256').update(JSON.stringify([title.toLowerCase(), 'article', ''])).digest('hex');
await result(db.from('blog_topics').upsert({ title, category: 'Technology', format: 'article', notes: '', sources: [], dedupe_key }, { onConflict: 'dedupe_key', ignoreDuplicates: true }));
const topic = await result(db.from('blog_topics').select('*').eq('dedupe_key', dedupe_key).single());
const existing = await result(db.from('blog_drafts').select('id,email_status,revision,published_revision').eq('topic_id', topic.id).maybeSingle());
if (existing && process.argv.includes('--revise')) {
  if (existing.published_revision) throw new Error('The trial is already published. Edit it in the private editor.');
  const job = await result(db.from('blog_jobs').select('research').eq('topic_id', topic.id).eq('stage','complete').order('started_at',{ascending:false}).limit(1).single());
  const content = await writeDraft(topic, job.research);
  const draft = await result(db.rpc('blog_save_draft',{p_id:existing.id,p_revision:existing.revision,p_content:content}));
  console.log(JSON.stringify({draftId:draft.id,revision:draft.revision,words:draftWordCount(content.markdown)}));
  console.log(JSON.stringify(await sendReview(db,draft.id,draft.revision)));
} else if (existing) console.log(JSON.stringify({ existingDraft: existing }));
else {
  console.log('Researching the approved trial topic.');
  try { console.log(JSON.stringify(await generate(db, topic.id))); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
