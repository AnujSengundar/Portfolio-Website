import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CATEGORIES, FORMATS, parseHistoryJson, parseHistoryHtml, canPublish } from '../../shared/blog';
import { api, authClient } from './client';
import Article, { BlogImage } from './Article';
import { BlogHeader } from './PublicBlog';
import EmailApproval from './EmailApproval';

const blankTopic={title:'',category:'Technology',format:'article',notes:'',links:''};
export default function AdminBlog() {
  const [client,setClient]=useState(null),[session,setSession]=useState(null),[checking,setChecking]=useState(true);
  const [error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
  const [data,setData]=useState(null),[topic,setTopic]=useState(blankTopic);
  const [history,setHistory]=useState([]),[selected,setSelected]=useState(new Set());
  const [draft,setDraft]=useState(null),[content,setContent]=useState(null),[preview,setPreview]=useState(false);
  const [imageQuery,setImageQuery]=useState(''),[candidates,setCandidates]=useState([]),[rights,setRights]=useState(false);
  const dirty=Boolean(draft&&content&&JSON.stringify(draft.content)!==JSON.stringify(content));
  const [query]=useSearchParams();
  const emailApproval=query.get('approve')==='1';
  const reviewRevision=Number(query.get('revision'));
  const approvalRevision=query.get('draft')===draft?.id&&query.has('revision')?reviewRevision:draft?.revision;

  useEffect(()=>{
    let active=true,subscription;
    document.title='Blog editor — Anuj Sengundar';
    authClient().then(async c=>{
      if(!active)return;setClient(c);
      const {data}=await c.auth.getSession();if(active)setSession(data.session);
      subscription=c.auth.onAuthStateChange((_event,next)=>{if(active)setSession(next);}).data.subscription;
    }).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setChecking(false);});
    return()=>{active=false;subscription?.unsubscribe();};
  },[]);
  const refresh=useCallback(async()=>{const next=await api('dashboard');setData(next);return next;},[]);
  useEffect(()=>{if(!session)return;refresh().catch(e=>setError(e.message));},[session,refresh]);
  useEffect(()=>{
    if(!data||draft)return;
    const id=new URLSearchParams(window.location.search).get('draft');
    const match=data.drafts.find(d=>d.id===id);
    if(match){setDraft(match);setContent(structuredClone(match.content));}
  },[data,draft]);
  useEffect(()=>{
    if(!dirty)return;
    const warn=e=>{e.preventDefault();e.returnValue='';};
    window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);
  },[dirty]);

  async function run(task) {
    setBusy(true);setError('');setNotice('');
    try {await task();}catch(e){setError(e.message);}finally{setBusy(false);}
  }
  function openDraft(next) {
    if(dirty&&!window.confirm('Discard your unsaved changes?'))return;
    setDraft(next);setContent(structuredClone(next.content));setPreview(false);
  }
  function update(field,value){setContent(c=>({...c,[field]:value}));}
  async function draftAction(action) {
    if(dirty)throw new Error('Save your changes first.');
    if(action==='publish'&&!canPublish(draft,approvalRevision))throw new Error('Open the latest review email before approving this draft.');
    await api(action,{id:draft.id,revision:action==='publish'?approvalRevision:draft.revision});
    const next=await refresh();const updated=next.drafts.find(d=>d.id===draft.id);
    setDraft(updated);setContent(structuredClone(updated.content));
    setNotice(action==='publish'?'This version is now published.':action==='unpublish'?'The article is no longer public.':'The full draft was sent for review.');
  }
  async function approveFromEmail() {
    const reviewed=data.drafts.find(item=>item.id===query.get('draft'));
    if(!reviewed||!canPublish(reviewed,reviewRevision))throw new Error('Open the latest review email before approving this draft.');
    await api('publish',{id:reviewed.id,revision:reviewRevision});
    await refresh();
    setNotice(`Version ${reviewRevision} is now published.`);
  }
  async function generateTopic(id) {
    const result=await api('generate',{id});
    const next=await refresh();
    const created=next.drafts.find(d=>d.id===result.draftId);
    if(created&&!dirty)openDraft(created);
    setNotice(result.emailed?'Draft created and emailed for review.':result.message||'No queued topics are ready.');
  }
  async function saveAndEmail() {
    const saved=await api('save',{id:draft.id,revision:draft.revision,content});
    setDraft(saved);setContent(structuredClone(saved.content));
    try {
      await api('email',{id:saved.id,revision:saved.revision});
      setNotice('Changes saved and the full revised draft emailed. Open that email to approve this version.');
    } finally {
      const next=await refresh();
      setDraft(next.drafts.find(d=>d.id===saved.id));
    }
  }
  async function regenerate() {
    const result=await api('regenerate',{id:draft.id,revision:draft.revision,content});
    const next=await refresh();
    const updated=next.drafts.find(item=>item.id===result.draftId);
    setDraft(updated);setContent(structuredClone(updated.content));
    setNotice(result.emailed?'Draft regenerated and emailed for review.':`Draft regenerated. ${result.message}`);
  }
  async function importHistory(event) {
    const file=event.target.files?.[0];if(!file)return;
    await run(async()=>{
      if(file.size>25*1024*1024)throw new Error('Choose a history file under 25 MB, not the entire Takeout archive.');
      const text=await file.text();const items=file.name.toLowerCase().endsWith('.json')?parseHistoryJson(text):parseHistoryHtml(text);
      if(!items.length)throw new Error('No YouTube watch links were found in this file.');
      setHistory(items);setSelected(new Set());setNotice(`${items.length} unique videos loaded locally. Select up to 50 to add to your queue.`);
    });event.target.value='';
  }
  async function upload(event) {
    const file=event.target.files?.[0];if(!file)return;
    await run(async()=>{
      if(!rights)throw new Error('Confirm that you can use this image first.');
      if(file.size>3*1024*1024)throw new Error('Choose a JPEG, PNG, or WebP under 3 MB.');
      const base64=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=reject;reader.readAsDataURL(file);});
      await api('upload',{base64,mime:file.type,rightsConfirmed:rights});await refresh();setNotice('Image added to your private library.');
    });event.target.value='';
  }
  function chooseAsset(asset) {
    if(content.images.some(i=>i.assetId===asset.id))return;
    update('images',[...content.images,{assetId:asset.id,placement:content.images.some(i=>i.placement==='cover')?'inline':'cover',alt:asset.credit.title||'Describe this image',caption:''}]);
  }
  function imageChange(id,field,value){update('images',content.images.map(i=>i.assetId===id?{...i,[field]:value}:i));}

  return <><BlogHeader /><main className="blog-shell blog-admin"><div className="admin-heading"><div><p className="blog-label">PRIVATE WORKSPACE</p><h1>{emailApproval?'Approve article':'Blog editor'}</h1></div>{session&&<button className="blog-button secondary" onClick={()=>run(async()=>{await client.auth.signOut();setSession(null);setData(null);setDraft(null);setContent(null);})}>Sign out</button>}</div>
    {error&&<div className="blog-alert" role="alert">{error}</div>}{notice&&<div className="blog-notice" role="status">{notice}</div>}
    {checking?<p role="status">Checking your session…</p>:!session?<section className="admin-panel"><h2>Your drafts stay private.</h2><p>Sign in with ajsengundar@gmail.com to {emailApproval?'approve this emailed version.':'manage topics and review posts.'}</p><button className="blog-button" disabled={!client||busy} onClick={()=>run(async()=>{const {error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:window.location.origin+'/admin/blog'+window.location.search,queryParams:{login_hint:'ajsengundar@gmail.com'}}});if(error)throw error;})}>Continue with Google</button>{!client&&<p className="blog-muted">The editor becomes available after the site’s service setup is complete.</p>}</section>:data?emailApproval?<EmailApproval draft={data.drafts.find(item=>item.id===query.get('draft'))} revision={reviewRevision} assets={data.assets} busy={busy} onApprove={()=>run(approveFromEmail)} />:<>
      <section className="admin-panel schedule-panel"><div><h2>Every two days</h2><p>{data.settings.schedule_enabled?`Enabled · next due ${data.settings.next_run_on}, around 9–10 a.m. India time.`:'Scheduling is off. You can still create drafts on demand.'}</p><small>A scheduled run creates a draft and sends a review email. It never publishes.</small></div><button className="blog-button secondary" disabled={busy||(!data.settings.trial_completed&&!data.settings.schedule_enabled)} onClick={()=>run(async()=>{await api('schedule',{enabled:!data.settings.schedule_enabled});await refresh();})}>{data.settings.schedule_enabled?'Pause schedule':'Enable schedule'}</button>{!data.settings.trial_completed&&<p className="blog-muted">First, complete one successful draft-and-email trial.</p>}</section>
      <div className="admin-columns"><section className="admin-panel"><h2>Add a topic</h2><form onSubmit={e=>{e.preventDefault();run(async()=>{await api('topics',{...topic,sources:topic.links.split('\n').map(s=>s.trim()).filter(Boolean)});setTopic(blankTopic);await refresh();setNotice('Topic added to the queue.');});}}>
        <label>Topic or title<input required minLength={3} maxLength={200} value={topic.title} onChange={e=>setTopic({...topic,title:e.target.value})} placeholder="A film, a book, or an idea to explore" /></label>
        <div className="form-row"><label>Category<select value={topic.category} onChange={e=>setTopic({...topic,category:e.target.value})}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></label><label>Format<select value={topic.format} onChange={e=>setTopic({...topic,format:e.target.value})}>{FORMATS.map(f=><option key={f}>{f}</option>)}</select></label></div>
        <label>Your notes and opinions<textarea value={topic.notes} onChange={e=>setTopic({...topic,notes:e.target.value})} placeholder="Your perspective, key points, or questions. Gemini won’t invent personal experiences." /></label>
        <label>Source links · one HTTPS link per line<textarea value={topic.links} onChange={e=>setTopic({...topic,links:e.target.value})} placeholder="https://www.youtube.com/watch?v=…" /></label><button className="blog-button" disabled={busy}>Add to queue</button></form>
      </section><section className="admin-panel"><h2>YouTube inspiration</h2><p>Choose your Takeout watch-history JSON or HTML file. The file stays in this browser; only selected entries are saved.</p><input aria-label="Import watch history" type="file" accept=".json,.html,.htm" onChange={importHistory} disabled={busy} />
        {history.length>0&&<><div className="history-list">{history.map(item=><label className="check-row" key={item.url}><input type="checkbox" checked={selected.has(item.url)} onChange={e=>setSelected(previous=>{const next=new Set(previous);if(e.target.checked&&next.size<50)next.add(item.url);else next.delete(item.url);return next;})} /><span>{item.title}</span></label>)}</div><p className="blog-muted">Selected: {selected.size}. Uses the category and format selected in “Add a topic”.</p><button className="blog-button" disabled={!selected.size||busy} onClick={()=>run(async()=>{await api('topics',{topics:history.filter(h=>selected.has(h.url)).map(h=>({title:h.title,category:topic.category,format:topic.format,sources:[h],notes:''}))});setHistory([]);setSelected(new Set());await refresh();setNotice('Selected videos added to your queue.');})}>Queue selected videos</button></>}
      </section></div>
      <div className="admin-columns"><section className="admin-panel"><h2>Topic queue</h2><div className="admin-list">{data.topics.filter(t=>t.status!=='drafted').map(t=><div className="admin-list-item" key={t.id}><div><strong>{t.title}</strong><small>{t.category} · {t.format} · {t.status}</small></div><div className="admin-actions"><button disabled={busy} onClick={()=>run(()=>generateTopic(t.id))}>{t.status==='error'?'Retry':'Create draft'}</button>{t.status==='queued'&&<button disabled={busy} onClick={()=>run(async()=>{await api('remove-topic',{id:t.id});await refresh();})}>Remove</button>}</div></div>)}{!data.topics.some(t=>t.status!=='drafted')&&<p className="blog-muted">Add a topic or import selected videos to begin.</p>}</div></section>
      <section className="admin-panel"><h2>Drafts & published posts</h2><div className="admin-list">{data.drafts.map(d=><button className={`draft-item ${draft?.id===d.id?'selected':''}`} key={d.id} disabled={busy} onClick={()=>openDraft(d)}><strong>{d.content.title}</strong><small>v{d.revision} · {d.email_status.replace('_',' ')}{d.published_revision?` · published v${d.published_revision}`:''}</small></button>)}{!data.drafts.length&&<p className="blog-muted">Your drafts will appear here.</p>}</div></section></div>
      {busy&&<p className="blog-notice" role="status">Working… Research and drafting can take a few minutes. You can return to the editor if the connection drops.</p>}
      {draft&&content&&<section className="admin-panel draft-editor"><div className="admin-heading"><h2>Review draft · v{draft.revision}</h2><button className="blog-button secondary" onClick={()=>setPreview(!preview)}>{preview?'Back to editing':'Preview article'}</button></div>
        {reviewRevision>0&&query.get('draft')===draft.id&&reviewRevision!==draft.revision&&<p className="blog-alert">This email links to an older version. Open the latest review email to approve the current version.</p>}
        {draft.email_error&&<p className="blog-alert">{draft.email_error}</p>}
        {preview?<Article content={content} assets={data.assets} />:<fieldset className="draft-fields" disabled={busy}><label>Title<input value={content.title} maxLength={200} onChange={e=>update('title',e.target.value)} /></label><label>Excerpt<textarea value={content.excerpt} maxLength={350} onChange={e=>update('excerpt',e.target.value)} /></label><label>Category<select value={content.category} onChange={e=>update('category',e.target.value)}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></label><label>Article · Markdown<textarea className="markdown-editor" value={content.markdown} onChange={e=>update('markdown',e.target.value)} /></label>
          <h3>Sources</h3>
          {content.sources.map((source,index)=>{
            const changeSource=changes=>update('sources',content.sources.map((item,i)=>i===index?{...item,...changes}:item));
            return <div className="draft-source" key={index}>
              <div className="form-row source-row">
                <label>Source title<input value={source.title} onChange={e=>changeSource({title:e.target.value})} /></label>
                <label>HTTPS link<input value={source.url} onChange={e=>changeSource({url:e.target.value,extract:''})} /></label>
                <button onClick={()=>update('sources',content.sources.filter((_,i)=>i!==index))}>Remove</button>
              </div>
              <details><summary>Paste a source extract (optional)</summary>
                <label>Extract for this regeneration<textarea maxLength={3500} value={source.extract||''} onChange={e=>changeSource({extract:e.target.value})} /></label>
              </details>
            </div>;
          })}
          <button className="blog-button secondary" disabled={content.sources.length>=30} onClick={()=>update('sources',[...content.sources,{title:'',url:''}])}>Add source</button>
          <h3>Selected images</h3>{content.images.map(i=><div className="selected-image" key={i.assetId}><BlogImage image={i} credit={data.assets.find(a=>a.id===i.assetId)?.credit} /><div><label>Placement<select value={i.placement} onChange={e=>imageChange(i.assetId,'placement',e.target.value)}><option value="cover">Cover</option><option value="inline">Inline</option></select></label><label>Alt text<input value={i.alt} onChange={e=>imageChange(i.assetId,'alt',e.target.value)} /></label><label>Caption<input value={i.caption} onChange={e=>imageChange(i.assetId,'caption',e.target.value)} /></label>{i.placement==='inline'&&<p className="blog-muted">Place this in the article where you want the image:<br /><code>{`![${i.alt}](asset:${i.assetId})`}</code><br />Otherwise it appears after the article.</p>}<button onClick={()=>update('images',content.images.filter(item=>item.assetId!==i.assetId))}>Remove image</button></div></div>)}
          <details className="image-picker"><summary>Choose images from your library, upload, or search</summary><label className="check-row"><input type="checkbox" checked={rights} onChange={e=>setRights(e.target.checked)} />I have permission to use the image, or have checked its source and license.</label><label>Upload JPEG, PNG, or WebP · up to 3 MB<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy||!rights} onChange={upload} /></label><form className="form-row" onSubmit={e=>{e.preventDefault();run(async()=>setCandidates(await api('images',undefined,{q:imageQuery})));}}><label>Search reusable images<input value={imageQuery} onChange={e=>setImageQuery(e.target.value)} placeholder="Search Openverse" /></label><button className="blog-button secondary" disabled={busy}>Search</button></form><div className="image-grid">{candidates.map(c=><div key={c.id}><img src={c.thumbnail} alt={c.title||'Search result'} loading="lazy" /><p>{c.title}</p><small><a href={c.sourceUrl} target="_blank" rel="noreferrer">{c.creator}</a> · <a href={c.licenseUrl} target="_blank" rel="noreferrer">{c.license}</a></small><button disabled={busy||!rights} onClick={()=>run(async()=>{const asset=await api('import-image',{id:c.id,rightsConfirmed:rights});await refresh();chooseAsset(asset);setNotice('Image selected. Save and email the new revision.');})}>Use image</button></div>)}</div><h4>Your private library</h4><div className="image-grid">{data.assets.map(asset=><button className="library-image" key={asset.id} disabled={content.images.some(i=>i.assetId===asset.id)} onClick={()=>chooseAsset(asset)}><BlogImage image={{assetId:asset.id,alt:asset.credit.title||'Your upload'}} /><span>{content.images.some(i=>i.assetId===asset.id)?'Selected':'Select image'}</span></button>)}</div></details>
        </fieldset>}
        <div className="draft-controls"><button className="blog-button" disabled={busy} onClick={()=>{if(window.confirm('Regenerate the article body using your current edits and sources, then email it for review?'))run(regenerate);}}>Regenerate &amp; email draft</button><button className="blog-button" disabled={busy||!dirty} onClick={()=>run(saveAndEmail)}>Save &amp; email changes</button><button className="blog-button secondary" disabled={busy||dirty||draft.email_status==='sent'} onClick={()=>run(()=>draftAction('email'))}>Send full draft by email</button><button className="blog-button" disabled={busy||dirty||!canPublish(draft,approvalRevision)} onClick={()=>run(()=>draftAction('publish'))}>Approve v{draft.revision} & publish</button>{draft.published_revision&&<button className="blog-button secondary" disabled={busy} onClick={()=>run(()=>draftAction('unpublish'))}>Unpublish</button>}</div><p className="blog-muted">{dirty?'Unsaved changes. ':''}Publishing requires your explicit approval of the current emailed version.</p>
      </section>}
      <details className="admin-panel"><summary>Recent activity</summary>{data.jobs.map(j=><p key={j.id}><strong>{j.stage}</strong> · {new Date(j.started_at).toLocaleString('en-IN')}{j.error&&` — ${j.error}`}</p>)}<button className="blog-button secondary" disabled={busy} onClick={()=>run(async()=>{await refresh();setNotice('Activity refreshed.');})}>Refresh status</button></details>
    </>:<p role="status">{error?'Resolve the connection issue above, then reload.':'Loading your workspace…'}</p>}
    <Link className="blog-back" to="/blog">View public blog →</Link>
  </main></>;
}
