import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {parseHistoryJson,normalizeHistory,youtubeUrl,validateContent,plusDays,indiaDate,safeUrl} from '../shared/blog.js';
import {authorize} from '../server/db.js';
import {isPublicAddress,imageMime} from '../server/images.js';
import {methodAllowed} from '../api/blog.js';
import {reviewMessage} from '../server/email.js';
import {gemini,generate,regenerateDraft,writeDraft} from '../server/generate.js';
import {researchTopic,verifyFreeResearchUsage,resolveCitations} from '../server/research.js';
import nodemailer from 'nodemailer';

test('history parsing keeps unique YouTube videos and rejects malformed files',()=>{
  const url='https://www.youtube.com/watch?v=abcdefghijk';
  assert.equal(youtubeUrl('https://youtu.be/abcdefghijk?t=4'),url);
  assert.equal(youtubeUrl('https://youtube.com.evil.test/watch?v=abcdefghijk'),null);
  assert.equal(normalizeHistory([{title:'Watched Example',titleUrl:url},{url:'https://youtu.be/abcdefghijk'},{url:'https://example.com'}]).length,1);
  assert.equal(parseHistoryJson(JSON.stringify([{title:'Watched Example',titleUrl:url}]))[0].title,'Example');
  assert.throws(()=>parseHistoryJson('{}'));
  assert.throws(()=>parseHistoryJson('not JSON'));
  assert.equal(parseHistoryJson('[null,42,"invalid",{}]').length,0);
});

test('Gemini uses text generation only and stops on quota, missing billing confirmation, and incomplete output',async t=>{
  const saved={...process.env};
  t.after(()=>{for(const name of ['GEMINI_API_KEY','GEMINI_MODEL','GEMINI_FREE_TIER_CONFIRMED']){if(saved[name]===undefined)delete process.env[name];else process.env[name]=saved[name];}});
  process.env.GEMINI_API_KEY='test-only';delete process.env.GEMINI_MODEL;
  const requests=[];
  const fetchMock=t.mock.method(globalThis,'fetch',async(url,options)=>{requests.push({url,options});return {ok:false,status:429};});
  process.env.GEMINI_FREE_TIER_CONFIRMED='false';
  await assert.rejects(()=>gemini('test'),/without billing/);
  assert.equal(requests.length,0);
  process.env.GEMINI_FREE_TIER_CONFIRMED='true';
  await assert.rejects(()=>gemini('test'),/quota exhausted/);
  assert.equal(requests.length,1);
  assert.ok(requests[0].url.includes('/gemini-3.5-flash-lite:'));
  assert.equal(JSON.parse(requests[0].options.body).tools,undefined);
  fetchMock.mock.mockImplementation(async()=>({ok:true,json:async()=>({candidates:[{finishReason:'MAX_TOKENS'}]})}));
  await assert.rejects(()=>gemini('test'),/complete draft/);
  fetchMock.mock.mockImplementation(async()=>({ok:false,status:404}));
  await assert.rejects(()=>gemini('test'),/unavailable for this account/);
  assert.deepEqual(await generate({rpc:async()=>({data:null,error:null})},null,true),{skipped:true});
});

const freeUsage = {account:{current_plan:'Researcher',plan_usage:10,plan_limit:1000,paygo_usage:0,paygo_limit:0},key:{usage:10,limit:1000}};
const evidence = [
  {title:'First source',url:'https://example.com/one',content:'First source evidence. '.repeat(12)},
  {title:'Second source',url:'https://example.org/two',content:'Second source evidence. '.repeat(12)},
];
const fullDraftBody = 'A useful review verifies claims against evidence and considers audience context. '.repeat(65) + '[1] [2]';

function generationEnv(t) {
  const names = ['GEMINI_API_KEY','GEMINI_MODEL','GEMINI_FREE_TIER_CONFIRMED','TAVILY_API_KEY','TAVILY_FREE_TIER_CONFIRMED','GMAIL_USER','GMAIL_APP_PASSWORD','SITE_URL'];
  const saved = Object.fromEntries(names.map(name=>[name,process.env[name]]));
  t.after(()=>{for(const name of names){if(saved[name]===undefined)delete process.env[name];else process.env[name]=saved[name];}});
  Object.assign(process.env,{GEMINI_API_KEY:'test-only',GEMINI_MODEL:'gemini-3.5-flash-lite',GEMINI_FREE_TIER_CONFIRMED:'true',TAVILY_API_KEY:'test-only',TAVILY_FREE_TIER_CONFIRMED:'true',GMAIL_USER:'ajsengundar@gmail.com',GMAIL_APP_PASSWORD:'test-only',SITE_URL:'https://portfolio.example'});
}

test('research refuses paid plans, enabled pay-as-you-go, unverifiable usage, and exhausted credits',()=>{
  assert.equal(verifyFreeResearchUsage(freeUsage).remaining,990);
  assert.equal(verifyFreeResearchUsage({...freeUsage,account:{...freeUsage.account,paygo_limit:null},key:{usage:0,limit:null}}).remaining,990);
  for(const change of [{current_plan:'Bootstrap'},{paygo_limit:100},{paygo_usage:1},{paygo_limit:undefined},{plan_usage:999},{plan_limit:2000}]){
    assert.throws(()=>verifyFreeResearchUsage({...freeUsage,account:{...freeUsage.account,...change}}));
  }
  assert.throws(()=>verifyFreeResearchUsage({...freeUsage,key:{usage:19,limit:20}}),/insufficient/);
});

test('Tavily performs bounded basic searches, removes duplicates and unsafe sources, and omits private notes from queries',async t=>{
  generationEnv(t);
  const requests=[];
  t.mock.method(globalThis,'fetch',async(url,options)=>{
    requests.push({url,options});
    return {ok:true,json:async()=>url.endsWith('/usage')?freeUsage:{results:[...evidence,evidence[0],{...evidence[0],url:'https://127.0.0.1/private'},{...evidence[0],url:'http://example.com'},{url:'https://empty.example.com',content:''}]}};
  });
  const research=await researchTopic({title:'Human review',notes:'PRIVATE NOTES'});
  assert.equal(research.sources.length,2);
  assert.equal(research.evidence[1].id,2);
  assert.deepEqual(requests.map(r=>new URL(r.url).pathname),['/usage','/search','/usage','/search']);
  for(const request of requests.filter(r=>r.options.body)){
    const body=JSON.parse(request.options.body);
    assert.equal(body.search_depth,'basic');assert.equal(body.auto_parameters,false);
    assert.equal(body.include_raw_content,false);assert.ok(!request.options.body.includes('PRIVATE NOTES'));
  }
});

test('Tavily failures and missing evidence never reach drafting or email',async t=>{
  generationEnv(t);
  const requests=[];
  const fetchMock=t.mock.method(globalThis,'fetch',async(url)=>{requests.push(url);return {ok:false,status:432};});
  process.env.TAVILY_FREE_TIER_CONFIRMED='false';
  await assert.rejects(()=>researchTopic({title:'Topic'}),/Confirm Tavily/);
  assert.equal(requests.length,0);
  process.env.TAVILY_FREE_TIER_CONFIRMED='true';
  await assert.rejects(()=>researchTopic({title:'Topic'}),/free quota/);
  assert.equal(requests.length,1);
  fetchMock.mock.mockImplementation(async(url)=>({ok:true,json:async()=>url.endsWith('/usage')?freeUsage:{results:[]}}));
  const calls=[];
  const db={rpc:async(name,args)=>{calls.push({name,args});return {data:name==='blog_start_generation'?{job:{id:'job'},topic:{title:'Topic',category:'Technology',format:'article'}}:null,error:null};}};
  await assert.rejects(()=>generate(db,'topic'),/source links/);
  assert.deepEqual(calls.map(c=>c.name),['blog_start_generation','blog_fail_generation']);
  fetchMock.mock.mockImplementation(async()=>{throw new Error('network failure');});
  await assert.rejects(()=>researchTopic({title:'Topic'}),/could not be completed/);
});

test('only researched source numbers become citation URLs',()=>{
  assert.equal(resolveCitations('A fact [1]. Another [2].',evidence),'A fact [1](<https://example.com/one>). Another [2](<https://example.org/two>).');
  for(const markdown of ['No citations','Only one [1]','Wrong [1] [99]','[Fake](https://invented.example) [1] [2]','<a href="//invented.example">Click</a> [1] [2]']){
    assert.throws(()=>resolveCitations(markdown,evidence));
  }
});

test('short drafts get one bounded repair and persistent length failure stops the workflow',async t=>{
  generationEnv(t);
  const prompts=[];
  const mock=t.mock.method(globalThis,'fetch',async(_url,options)=>{
    prompts.push(JSON.parse(options.body));
    return {ok:true,json:async()=>({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({title:'Review',markdown:prompts.length===1?'Too short [1] [2]':fullDraftBody})}]}}]})};
  });
  const topic={title:'Human review',format:'article',category:'Technology'};
  const research={sources:evidence,evidence,searchedAt:'2026-11-15'};
  assert.ok((await writeDraft(topic,research)).markdown.includes('https://example.com/one'));
  assert.equal(prompts.length,2);
  mock.mock.mockImplementation(async()=>({ok:true,json:async()=>({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({title:'Review',markdown:'Too short [1] [2]'})}]}}]})}));
  await assert.rejects(()=>writeDraft(topic,research),/requested 800 words/);
  assert.equal(mock.mock.callCount(),4);
});

test('researched generation persists evidence, emails the private draft, and never publishes or enables scheduling',async t=>{
  generationEnv(t);
  const calls=[];let draft;let savedResearch;let delivered;
  t.mock.method(globalThis,'fetch',async(url)=>({ok:true,json:async()=>url.endsWith('/usage')?freeUsage:url.endsWith('/search')?{results:evidence}:{candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({title:'Human review',excerpt:'Why review matters.',markdown:fullDraftBody})}]}}]}}));
  t.mock.method(nodemailer,'createTransport',()=>({sendMail:async(message)=>{delivered=message;return {accepted:['ajsengundar@gmail.com']};}}));
  const db={
    from:name=>{assert.equal(name,'blog_jobs');return {update:value=>({eq:async()=>{savedResearch=value;return {data:null,error:null};}})};},
    rpc:async(name,args)=>{
      calls.push(name);let data=null;
      if(name==='blog_start_generation')data={job:{id:'job'},topic:{title:'Human review',format:'article',category:'Technology',notes:'',sources:[]}};
      if(name==='blog_finish_generation'){draft={id:'draft',revision:1,content:args.p_content,email_token:'token'};data=draft;}
      if(name==='blog_begin_email')data=draft;
      if(name==='blog_complete_email')data=true;
      return {data,error:null};
    },
  };
  assert.deepEqual(await generate(db,'topic'),{draftId:'draft',emailed:true});
  assert.equal(savedResearch.research.provider,'tavily');
  assert.equal(savedResearch.research.evidence.length,2);
  assert.ok(delivered.text.includes('revision=1'));
  assert.ok(delivered.text.includes('https://example.org/two'));
  assert.equal(delivered.to,'ajsengundar@gmail.com');
  assert.deepEqual(calls,['blog_start_generation','blog_finish_generation','blog_begin_email','blog_complete_email']);
});
test('schedule dates handle India midnight, leap years and month boundaries',()=>{
  assert.equal(indiaDate(new Date('2026-11-13T19:00:00Z')),'2026-11-14');
  assert.equal(plusDays('2026-01-31'),'2026-02-02');
  assert.equal(plusDays('2028-02-28'),'2028-03-01');
  assert.equal(plusDays('2026-12-31'),'2027-01-02');
});
test('only the confirmed owner Google identity can use private APIs',async()=>{
  const req={headers:{authorization:'Bearer test'}};
  const mock=user=>({auth:{getUser:async()=>({data:{user}})}});
  await assert.rejects(()=>authorize({headers:{}},mock(null)),/Sign in/);
  await assert.rejects(()=>authorize(req,mock({email:'someone@gmail.com'})),/approved Google/);
  await assert.rejects(()=>authorize(req,mock({email:'ajsengundar@gmail.com',email_confirmed_at:'now',identities:[{provider:'email'}]})),/approved Google/);
  assert.ok(await authorize(req,mock({email:'ajsengundar@gmail.com',email_confirmed_at:'now',identities:[{provider:'google'}]})));
});
test('publishing and generation cannot be triggered by email-link GETs',()=>{
  for(const action of ['publish','email','save','generate','regenerate','unpublish','schedule'])assert.equal(methodAllowed(action,'GET'),false);
  assert.equal(methodAllowed('publish','POST'),true);
});
test('unsafe links, non-image bytes and private image hosts are rejected',()=>{
  assert.equal(safeUrl('javascript:alert(1)'),null);
  assert.equal(safeUrl('https://user:pass@example.com'),null);
  for(const ip of ['127.0.0.1','10.0.0.1','172.16.0.1','169.254.169.254','192.168.0.1','::1','::ffff:127.0.0.1','100.64.0.1'])assert.equal(isPublicAddress(ip),false);
  assert.equal(isPublicAddress('93.184.216.34'),true);
  assert.throws(()=>imageMime(Buffer.from('<svg onload="alert(1)">')));
  assert.throws(()=>validateContent({title:'Article',markdown:'Text',category:'Movies',sources:[{url:'javascript:alert(1)'}]}));
});
test('review email escapes HTML and links to the exact private revision',()=>{
  process.env.SITE_URL='https://portfolio.example';
  const message=reviewMessage({id:'draft-id',revision:3,content:{title:'<script>bad</script>',excerpt:'Edited excerpt',category:'Anime',markdown:'## A section\n\n**Styled** [1](https://example.com)\n\n<img onerror=alert(1)>\n\n![Remote](https://example.com/image.png)',sources:[],images:[]}});
  assert.ok(!message.html.includes('<script>'));
  assert.ok(message.html.includes('Edited excerpt'));
  assert.ok(message.html.includes('<h2>A section</h2>'));
  assert.ok(message.html.includes('<strong>Styled</strong>'));
  assert.ok(!message.html.includes('onerror'));
  assert.ok(!message.html.includes('image.png'));
  assert.ok(message.text.includes('revision=3'));
  assert.ok(message.text.includes('revision=3&approve=1'));
  assert.ok(message.html.includes('revision=3&amp;approve=1'));
  assert.ok(message.html.includes('Approve &amp; publish v3'));
  assert.ok(!message.html.includes('action=publish'));
  assert.ok(message.text.includes('Opening this link does not publish'));
});

test('regeneration uses current edits and source extracts, then emails the new revision',async t=>{
  generationEnv(t);
  const sources=[{title:'New source',url:'https://example.com/new'},{title:'Pasted source',url:'https://example.org/pasted'}];
  const edited={title:'Original title',excerpt:'Edited excerpt',category:'Technology',markdown:'Edited body',sources,images:[]};
  const draft={id:'draft',revision:4,topic_id:null,content:{...edited,excerpt:'Old excerpt'}};
  const requests=[];
  const calls=[];
  let saved;
  const fetchMock=t.mock.method(globalThis,'fetch',async(url,options)=>{
    const body=options.body&&JSON.parse(options.body);
    requests.push({url,body});
    return {ok:true,json:async()=>url.endsWith('/usage')?freeUsage:url.endsWith('/extract')
      ?{results:[{url:sources[0].url,raw_content:evidence[0].content}]}
      :{candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({title:'Rewritten',excerpt:'Model excerpt',markdown:fullDraftBody})}]}}]}};
  });
  t.mock.method(nodemailer,'createTransport',()=>({sendMail:async(message)=>{
    assert.ok(message.html.includes('revision=5&amp;approve=1'));
    return {accepted:['ajsengundar@gmail.com']};
  }}));
  const db={rpc:async(name,args)=>{
    calls.push(name);
    if(name==='blog_save_draft'){
      assert.equal(args.p_revision,4);
      assert.equal(args.p_content.excerpt,'Edited excerpt');
      assert.deepEqual(args.p_content.sources,sources);
      assert.ok(!JSON.stringify(args.p_content).includes('Private extract'));
      saved={...draft,revision:5,content:args.p_content,email_token:'token'};
    }
    return {data:saved,error:null};
  }};
  assert.deepEqual(await regenerateDraft(db,draft,edited,['','Private extract']),{draftId:'draft',emailed:true});
  assert.deepEqual(requests[1].body.urls,[sources[0].url]);
  const prompt=requests[2].body.contents[0].parts[0].text;
  assert.ok(prompt.includes('Edited body'));
  assert.ok(prompt.includes('Private extract'));
  assert.deepEqual(calls,['blog_save_draft','blog_begin_email','blog_complete_email']);
  fetchMock.mock.mockImplementation(async url=>({ok:true,json:async()=>url.endsWith('/usage')?freeUsage:{results:[]}}));
  await assert.rejects(()=>regenerateDraft(db,draft,edited,['','Private extract']),/Paste an extract/);
  assert.equal(calls.length,3);
});

test('database workflow enforces revisions, email gates, private data, and job locks',async t=>{
  const db=new PGlite();
  await db.exec("create role anon; create role authenticated; create role service_role; create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);");
  await db.exec(await readFile(new URL('../supabase/migrations/001_blog.sql',import.meta.url),'utf8'));
  const rpc=async(name,args=[])=>{const r=await db.query(`select ${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) as value`,args);return r.rows[0].value;};
  const content={title:'Test article',markdown:'A researched article.',category:'Technology',sources:[{title:'Source',url:'https://example.com'}],images:[]};
  let topicId,draft;
  await t.test('scheduling remains disabled until a real generation-and-email trial',async()=>{
    await assert.rejects(()=>rpc('blog_schedule',[true]),/trial/);
    assert.equal(await rpc('blog_start_generation',[null,true]),null);
  });
  await t.test('concurrent/repeated generation cannot create duplicate drafts',async()=>{
    topicId=(await db.query("insert into blog_topics(title,category,format) values('Topic','Technology','article') returning id")).rows[0].id;
    const claimed=await rpc('blog_start_generation',[topicId,false]);
    await assert.rejects(()=>rpc('blog_start_generation',[topicId,false]),/in progress/);
    draft=await rpc('blog_finish_generation',[claimed.job.id,content]);
    assert.equal((await db.query('select count(*)::int as n from blog_drafts')).rows[0].n,1);
    assert.equal(await rpc('blog_start_generation',[topicId,false]),null);
  });
  await t.test('email failure and old revisions cannot publish',async()=>{
    await assert.rejects(()=>rpc('blog_publish',[draft.id,1,'test']),/emailed/);
    let send=await rpc('blog_begin_email',[draft.id,1]);
    await rpc('blog_complete_email',[draft.id,1,send.email_token,'SMTP failure']);
    await assert.rejects(()=>rpc('blog_publish',[draft.id,1,'test']),/emailed/);
    send=await rpc('blog_begin_email',[draft.id,1]);
    const changed=await rpc('blog_save_draft',[draft.id,1,{...content,title:'Edited'}]);
    assert.equal(changed.revision,2);
    assert.equal(await rpc('blog_complete_email',[draft.id,1,send.email_token,null]),false);
    await assert.rejects(()=>rpc('blog_publish',[draft.id,1,'test']),/emailed/);
    await assert.rejects(()=>rpc('blog_publish',[draft.id,2,'test']),/emailed/);
    await assert.rejects(()=>rpc('blog_save_draft',[draft.id,1,content]),/outdated/);
    await assert.rejects(()=>rpc('blog_save_draft',[draft.id,null,content]),/outdated/);
  });
  await t.test('only the emailed snapshot becomes public; later edits stay private',async()=>{
    const send=await rpc('blog_begin_email',[draft.id,2]);
    await rpc('blog_complete_email',[draft.id,2,send.email_token,null]);
    await rpc('blog_publish',[draft.id,2,'test']);
    await rpc('blog_save_draft',[draft.id,2,{...content,title:'Private changes'}]);
    assert.equal((await db.query('select content from blog_publications')).rows[0].content.title,'Edited');
    await rpc('blog_unpublish',[draft.id]);
    assert.equal((await db.query('select count(*)::int as n from blog_publications')).rows[0].n,0);
  });
  await t.test('schedule checks date and skips empty queues',async()=>{
    const settings=await rpc('blog_schedule',[true]);assert.equal(settings.schedule_enabled,true);
    assert.equal(await rpc('blog_start_generation',[null,true]),null);
    await db.exec("update blog_settings set next_run_on=(now() at time zone 'Asia/Kolkata')::date;");
    assert.equal(await rpc('blog_start_generation',[null,true]),null);
    assert.equal((await db.query("select next_run_on=((now() at time zone 'Asia/Kolkata')::date+2) as ok from blog_settings")).rows[0].ok,true);
  });
  await t.test('timed out jobs can be retried without stale writes',async()=>{
    const id=(await db.query("insert into blog_topics(title,category,format) values('Retry','Technology','article') returning id")).rows[0].id;
    const old=await rpc('blog_start_generation',[id,false]);
    await db.exec("update blog_settings set lock_until=now()-interval '1 minute'");
    const current=await rpc('blog_start_generation',[id,false]);
    await assert.rejects(()=>rpc('blog_finish_generation',[old.job.id,content]),/no longer active/);
    await rpc('blog_fail_generation',[current.job.id,'Quota exhausted']);
    assert.equal((await db.query('select status from blog_topics where id=$1',[id])).rows[0].status,'error');
  });
  await t.test('anonymous and ordinary authenticated roles cannot read or mutate private tables',async()=>{
    for(const role of ['anon','authenticated']){
      await db.exec(`set role ${role}`);
      await assert.rejects(()=>db.query('select * from blog_drafts'),/permission denied/);
      await assert.rejects(()=>rpc('blog_publish',[draft.id,3,'test']),/permission denied/);
      await db.exec('reset role');
    }
  });
  await db.close();
});
