import { randomUUID, timingSafeEqual, createHash } from 'node:crypto';
import { database, authorize, result } from '../server/db.js';
import { publicConfig, env } from '../server/config.js';
import { generate, regenerateDraft } from '../server/generate.js';
import { sendReview } from '../server/email.js';
import { downloadImage, imageCandidate, imageMime, MAX_IMAGE_BYTES, openverse } from '../server/images.js';
import { validateTopic, validateContent, slugify, UUID, youtubeUrl } from '../shared/blog.js';

const GET_ACTIONS = new Set(['config','posts','post','asset','dashboard','images','cron']);
const POST_ACTIONS = new Set(['topics','generate','regenerate','save','email','publish','unpublish','schedule','upload','import-image','remove-topic']);
export function methodAllowed(action, method) {
  return method === 'GET' ? GET_ACTIONS.has(action) : method === 'POST' && POST_ACTIONS.has(action);
}
function requireId(value) {
  if (!UUID.test(value || '')) throw Object.assign(new Error('Invalid identifier.'),{status:400});
  return value;
}
async function contentAssets(db, content) {
  if (!content.images.length) return;
  const assets = await result(db.from('blog_assets').select('id').in('id',content.images.map(i=>i.assetId)));
  if (assets.length !== content.images.length) throw new Error('A selected image no longer exists.');
}
async function assetResponse(req,res,db,id,post) {
  requireId(id);
  let published = false;
  if (post) {
    const publication = await result(db.from('blog_publications').select('content').eq('slug',post).maybeSingle());
    published = Boolean(publication?.content.images.some(i=>i.assetId===id));
  }
  if (!published) await authorize(req,db);
  const asset = await result(db.from('blog_assets').select('*').eq('id',id).maybeSingle());
  if (!asset) return res.status(404).json({error:'Image not found.'});
  const {data,error} = await db.storage.from('blog-images').download(asset.path);
  if (error) return res.status(404).json({error:'Image not available.'});
  res.setHeader('Content-Type',asset.mime);
  res.setHeader('Cache-Control', 'private, no-store');
  return res.status(200).send(Buffer.from(await data.arrayBuffer()));
}
async function saveImage(db,bytes,mime,credit) {
  if (bytes.length>MAX_IMAGE_BYTES || !bytes.length) throw new Error('Images must be smaller than 3 MB.');
  if (imageMime(bytes)!==mime) throw new Error('The image contents do not match its type.');
  const id=randomUUID(),path=`${id}.${mime.split('/')[1]}`;
  const {error}=await db.storage.from('blog-images').upload(path,bytes,{contentType:mime,upsert:false});
  if(error) throw new Error('Image upload failed. Check the private storage bucket.');
  try { return await result(db.from('blog_assets').insert({id,path,mime,credit}).select().single()); }
  catch(error) { await db.storage.from('blog-images').remove([path]); throw error; }
}

export default async function handler(req,res) {
  res.setHeader('Cache-Control','private, no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  const query=new URL(req.url,'https://local.invalid').searchParams;
  const action=query.get('action') || 'posts';
  if(!methodAllowed(action,req.method)) return res.status(405).json({error:'This action does not support that request method.'});
  try {
    if(action==='config') return res.status(200).json(publicConfig());
    if(!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      if(action==='posts') return res.status(200).json([]);
      if(action==='post') return res.status(404).json({error:'Article not found.'});
    }
    const db=database();
    if(action==='posts') {
      const posts=await result(db.from('blog_publications').select('slug,content,published_at').order('published_at',{ascending:false}).limit(100));
      return res.status(200).json(posts.map(p=>({...p,content:{title:p.content.title,excerpt:p.content.excerpt,category:p.content.category,images:p.content.images.filter(i=>i.placement==='cover')}})));
    }
    if(action==='post') {
      const post=await result(db.from('blog_publications').select('*').eq('slug',query.get('slug')||'').maybeSingle());
      if(!post) return res.status(404).json({error:'Article not found.'});
      const ids=post.content.images.map(i=>i.assetId);
      post.assets=ids.length ? await result(db.from('blog_assets').select('id,credit').in('id',ids)) : [];
      return res.status(200).json(post);
    }
    if(action==='asset') return await assetResponse(req,res,db,query.get('id'),query.get('post'));
    if(action==='cron') {
      const expected=Buffer.from(`Bearer ${env('CRON_SECRET')}`),actual=Buffer.from(req.headers.authorization||'');
      if(actual.length!==expected.length || !timingSafeEqual(actual,expected)) return res.status(401).json({error:'Unauthorized schedule request.'});
      return res.status(200).json(await generate(db,null,true));
    }
    await authorize(req,db);
    if(action==='dashboard') {
      const [topics,drafts,assets,jobs,settings]=await Promise.all([
        result(db.from('blog_topics').select('*').order('created_at',{ascending:false}).limit(200)),
        result(db.from('blog_drafts').select('*').order('updated_at',{ascending:false}).limit(100)),
        result(db.from('blog_assets').select('*').order('created_at',{ascending:false}).limit(200)),
        result(db.from('blog_jobs').select('id,topic_id,stage,error,started_at,finished_at').order('started_at',{ascending:false}).limit(20)),
        result(db.from('blog_settings').select('*').single())]);
      return res.status(200).json({topics,drafts,assets,jobs,settings});
    }
    if(action==='images') {
      const term=(query.get('q')||'').trim().slice(0,150);
      if(!term) return res.status(200).json([]);
      const data=await openverse(`?q=${encodeURIComponent(term)}&license=cc0,pdm,by,by-sa&page_size=12`);
      return res.status(200).json((data.results||[]).map(imageCandidate).filter(Boolean));
    }
    const b=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
    if(action==='topics') {
      const topics=Array.isArray(b.topics)?b.topics:[b];
      if(topics.length<1 || topics.length>50) throw new Error('Add between 1 and 50 topics at a time.');
      const rows=topics.map(validateTopic).map(t=>({...t,dedupe_key:createHash('sha256').update(t.sources.length===1&&youtubeUrl(t.sources[0].url)||JSON.stringify([t.title.toLowerCase(),t.format,t.notes])).digest('hex')}));
      const unique=[...new Map(rows.map(t=>[t.dedupe_key,t])).values()];
      return res.status(201).json(await result(db.from('blog_topics').upsert(unique,{onConflict:'dedupe_key',ignoreDuplicates:true}).select()));
    }
    if(action==='generate') return res.status(200).json(await generate(db,requireId(b.id)));
    if(action==='regenerate') {
      const draft=await result(db.from('blog_drafts').select('id,topic_id,revision,content').eq('id',requireId(b.id)).single());
      if(draft.revision!==b.revision) throw Object.assign(new Error('This revision is outdated. Reload before regenerating.'),{status:409});
      const content=validateContent(b.content);
      await contentAssets(db,content);
      const extracts=Array.isArray(b.content.sources)?b.content.sources.slice(0,30).map(source=>source.extract):[];
      return res.status(200).json(await regenerateDraft(db,draft,content,extracts));
    }
    if(action==='save') {
      const content=validateContent(b.content); await contentAssets(db,content);
      return res.status(200).json(await result(db.rpc('blog_save_draft',{p_id:requireId(b.id),p_revision:b.revision,p_content:content})));
    }
    if(action==='email') return res.status(200).json(await sendReview(db,requireId(b.id),b.revision));
    if(action==='publish') {
      const draft=await result(db.from('blog_drafts').select('content').eq('id',requireId(b.id)).single());
      await contentAssets(db,draft.content);
      return res.status(200).json(await result(db.rpc('blog_publish',{p_id:b.id,p_revision:b.revision,p_slug:`${slugify(draft.content.title)}-${b.id.slice(0,8)}`})));
    }
    if(action==='unpublish') { await result(db.rpc('blog_unpublish',{p_id:requireId(b.id)})); return res.status(200).json({unpublished:true}); }
    if(action==='schedule') return res.status(200).json(await result(db.rpc('blog_schedule',{p_enabled:b.enabled===true})));
    if(action==='remove-topic') {
      await result(db.from('blog_topics').delete().eq('id',requireId(b.id)).eq('status','queued'));
      return res.status(200).json({removed:true});
    }
    if(action==='upload') {
      if(b.rightsConfirmed!==true || typeof b.base64!=='string' || b.base64.length>4*1024*1024) throw new Error('Confirm usage rights and choose an image under 3 MB.');
      return res.status(201).json(await saveImage(db,Buffer.from(b.base64,'base64'),b.mime,{creator:'Anuj Sengundar',license:'Owner-provided',sourceUrl:''}));
    }
    if(action==='import-image') {
      if(b.rightsConfirmed!==true) throw new Error('Review the source and license before selecting the image.');
      const candidate=imageCandidate(await openverse(`${requireId(b.id)}/`));
      if(!candidate) throw new Error('This image has no supported reuse license. Choose another image.');
      const {bytes,mime}=await downloadImage(candidate.url);
      return res.status(201).json(await saveImage(db,bytes,mime,candidate));
    }
  } catch(error) {
    return res.status(error.status||400).json({error:error.message || 'The operation could not be completed.'});
  }
}
