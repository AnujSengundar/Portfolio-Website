import nodemailer from 'nodemailer';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ReactMarkdown from 'react-markdown';
import { safeUrl, UUID } from '../shared/blog.js';
import { env, OWNER_EMAIL, siteUrl } from './config.js';
import { result } from './db.js';

export const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
const accent = '#efa17c';
const muted = '#c5b3a9';

function reviewHtml(draft, assetCredits, link, approvalLink) {
  const { content, revision } = draft;
  const esc = escapeHtml;
  const figure = (image, index) => h('div', { style:{ margin:'24px 0' } },
    h('img', { src:`cid:asset-${image.assetId}`, alt:image.alt, fetchPriority:'low',
      style:{ display:'block', maxWidth:'100%', height:'auto', borderRadius:'10px' } }),
    h('div', { style:{ color:muted, marginTop:'8px', fontSize:'13px' } },
      [image.caption, assetCredits[index]].filter(Boolean).join(' · ')));
  const shown = new Set();
  const body = renderToStaticMarkup(h(ReactMarkdown, {
    skipHtml:true,
    urlTransform:url=>url.startsWith('asset:')&&UUID.test(url.slice(6))?url:safeUrl(url)||'',
    components:{
      p:({children})=>h('div',{style:{margin:'0 0 18px'}},children),
      a:({href,children})=>h('a',{href:safeUrl(href)||undefined,style:{color:accent}},children),
      img:({src})=>{
        const index=content.images.findIndex(image=>image.placement==='inline'&&src===`asset:${image.assetId}`);
        if(index<0)return null;
        shown.add(index);
        return figure(content.images[index],index);
      },
      blockquote:({children})=>h('blockquote',{style:{margin:'20px 0',paddingLeft:'16px',borderLeft:`3px solid ${accent}`,color:muted}},children),
      pre:({children})=>h('pre',{style:{background:'#251913',padding:'16px',whiteSpace:'pre-wrap'}},children),
    },
  },content.markdown));
  const images = placement=>content.images.map((image,index)=>
    image.placement===placement&&!shown.has(index)?renderToStaticMarkup(figure(image,index)):'').join('');
  const sources = content.sources.flatMap(source=>{
    const url=safeUrl(source.url);
    return url?[`<li style="margin-bottom:8px"><a style="color:${accent}" href="${esc(url)}">${esc(source.title)}</a></li>`]:[];
  }).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;background:#120d0d;color:#eee7e3;font:16px/1.7 Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#120d0d"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#1b1412" style="max-width:680px;border:1px solid #4a3029;border-radius:12px">
<tr><td style="padding:20px 24px;border-bottom:1px solid #4a3029;color:${accent};font-weight:bold">Anuj Sengundar <span style="color:${muted};font-weight:normal">· Blog</span></td></tr>
<tr><td style="padding:28px 24px;color:#dfd3cb">
<p style="margin:0;color:${accent};font-size:12px;letter-spacing:2px;text-transform:uppercase;font-weight:bold">${esc(content.category)} · Review v${revision}</p>
<h1 style="margin:12px 0 18px;color:#eee7e3;font-size:36px;line-height:1.12;letter-spacing:-1px">${esc(content.title)}</h1>
${content.excerpt?`<p style="color:${muted};font-size:19px;line-height:1.55;margin:0 0 24px">${esc(content.excerpt)}</p>`:''}
${images('cover')}${body}${images('inline')}
${sources?`<div style="margin-top:28px;border-top:1px solid #654032;padding-top:12px"><h2 style="color:#eee7e3;font-size:20px">Sources &amp; further reading</h2><ul style="padding-left:22px">${sources}</ul></div>`:''}
<div style="margin-top:28px;padding:20px;background:#251913;border:1px solid #56372b;border-radius:10px">
<h2 style="margin:0 0 12px;color:#eee7e3;font-size:20px">Review this revision</h2>
<table role="presentation" cellspacing="0" cellpadding="0"><tr><td bgcolor="#e89b74" style="border-radius:8px"><a href="${esc(approvalLink)}" style="display:inline-block;padding:12px 16px;color:#21130c;font-weight:bold;text-decoration:none">Approve &amp; publish v${revision}</a></td></tr></table>
<p style="margin:12px 0"><a href="${esc(link)}" style="color:${accent}">Edit this draft</a></p>
<p style="margin:0;color:${muted};font-size:14px">The approval link opens the confirmation page for this exact revision.</p>
</div></td></tr></table></td></tr></table></body></html>`;
}

export function reviewMessage(draft, assetCredits = []) {
  const c = draft.content;
  const link = `${siteUrl()}/admin/blog?draft=${draft.id}&revision=${draft.revision}`;
  const approvalLink = `${link}&approve=1`;
  const sources = c.sources.map(s => `${s.title}: ${s.url}`).join('\n');
  const images = c.images.map((i,index) => `${i.placement}: ${i.alt}${i.caption ? ` — ${i.caption}` : ''}${assetCredits[index] ? ` (${assetCredits[index]})` : ''}`).join('\n');
  return {
    subject: `[Blog review · v${draft.revision}] ${c.title}`,
    text: `${c.title}\nRevision ${draft.revision} · ${c.category}\n\n${c.excerpt ? `${c.excerpt}\n\n` : ''}${c.markdown}\n\nSources\n${sources}\n\nImages\n${images || 'No images selected.'}\n\nApprove & publish v${draft.revision}: ${approvalLink}\nEdit this draft: ${link}\n\nOpening this link does not publish. Sign in if needed, then confirm publication of this exact version.`,
    html: reviewHtml(draft, assetCredits, link, approvalLink)
  };
}

export async function sendReview(db, id, revision) {
  const draft = await result(db.rpc('blog_begin_email', { p_id: id, p_revision: revision }));
  try {
    const attachments = []; const credits = [];
    for (const image of draft.content.images) {
      const asset = await result(db.from('blog_assets').select('*').eq('id',image.assetId).single());
      const { data, error } = await db.storage.from('blog-images').download(asset.path);
      if (error) throw new Error('A selected image could not be attached.');
      attachments.push({ filename: `${asset.id}.${asset.mime.split('/')[1]}`, content: Buffer.from(await data.arrayBuffer()), contentType: asset.mime, cid: `asset-${asset.id}` });
      credits.push(asset.credit.creator ? `${asset.credit.creator} · ${asset.credit.license || 'Uploaded image'} · ${asset.credit.sourceUrl || ''}` : 'Your upload');
    }
    const user = env('GMAIL_USER');
    if (user.toLowerCase() !== OWNER_EMAIL) throw new Error('GMAIL_USER must be the approved owner address.');
    const transport = nodemailer.createTransport({ host:'smtp.gmail.com',port:465,secure:true,
      auth:{ user,pass:env('GMAIL_APP_PASSWORD').replace(/\s/g,'') },connectionTimeout:15000,socketTimeout:30000 });
    const info = await transport.sendMail({ from:`Anuj’s Blog <${user}>`,to:OWNER_EMAIL,...reviewMessage(draft,credits),attachments });
    if (!info.accepted?.length) throw new Error('The email service did not accept the review.');
    const current = await result(db.rpc('blog_complete_email',{p_id:id,p_revision:revision,p_token:draft.email_token}));
    return { sent:true,current };
  } catch {
    // SMTP acceptance can be uncertain on timeout. Never retry mail automatically.
    const message = 'Review delivery could not be confirmed. Check your inbox before using Send review again.';
    await result(db.rpc('blog_complete_email',{p_id:id,p_revision:revision,p_token:draft.email_token,p_error:message}));
    throw Object.assign(new Error(message),{status:502});
  }
}
